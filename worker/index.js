/**
 * Cloudflare Worker — SplitBill OCR Proxy
 *
 * Variables de entorno requeridas (en el dashboard de Cloudflare):
 *   ANTHROPIC_API_KEY  — tu clave de la API de Anthropic
 *   ALLOWED_ORIGIN     — el dominio de tu frontend, ej: https://splitbill.vercel.app
 *
 * Rate limiting: en memoria (Map). No persiste entre instancias del Worker,
 * pero es suficiente para la fase inicial. Migrar a KV cuando haya usuarios reales.
 */

const MAX_REQUESTS_PER_HOUR = 20;

// Map en memoria: clave → { count, resetAt }
const rateLimitStore = new Map();

export default {
  async fetch(request, env) {
    // Solo aceptar POST /scan
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') ?? '*';
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204, origin);
    }
    if (request.method !== 'POST' || url.pathname !== '/scan') {
      return corsResponse({ error: 'Not found' }, 404, origin);
    }

    // Validar origen (ALLOWED_ORIGIN puede ser lista separada por comas)
    const allowedOrigins = (env.ALLOWED_ORIGIN ?? '')
      .split(',')
      .map(o => o.trim())
      .filter(Boolean);
    const originAllowed = allowedOrigins.length === 0 || allowedOrigins.includes(origin);
    if (!originAllowed) {
      return corsResponse({ error: 'Origen no permitido' }, 403, origin);
    }

    // Rate limiting por IP (en memoria)
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    if (isRateLimited(ip)) {
      return corsResponse({ error: 'Demasiadas solicitudes. Intenta en unos minutos.' }, 429, env);
    }

    // Parsear body
    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse({ error: 'JSON inválido' }, 400, env);
    }

    const { image, mediaType } = body;
    if (!image || typeof image !== 'string') {
      return corsResponse({ error: 'Se requiere el campo "image" en base64' }, 400, env);
    }

    const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const resolvedMediaType = ALLOWED_MEDIA_TYPES.includes(mediaType) ? mediaType : 'image/jpeg';

    // Llamar a Anthropic Vision
    const prompt = `Extrae todos los ítems de esta factura de restaurante.
Responde ÚNICAMENTE con JSON válido, sin texto adicional:
{"items": [{"name": string, "price": number, "quantity": number}], "currency": string}
Los precios deben ser números sin símbolos de moneda ni puntos de miles.`;

    let anthropicResponse;
    try {
      anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: resolvedMediaType,
                    data: image,
                  },
                },
                { type: 'text', text: prompt },
              ],
            },
          ],
        }),
      });
    } catch (err) {
      return corsResponse({ error: 'Error al conectar con el servicio de OCR' }, 502, origin);
    }

    if (!anthropicResponse.ok) {
      const errData = await anthropicResponse.json().catch(() => ({}));
      const detail = errData?.error?.message ?? anthropicResponse.statusText;
      console.error('Anthropic error:', anthropicResponse.status, detail);
      return corsResponse({ error: `Error del servicio de OCR: ${detail}` }, 502, origin);
    }

    const aiData = await anthropicResponse.json();
    const rawText = aiData?.content?.[0]?.text ?? '';

    // Parsear JSON de la respuesta
    let parsed;
    try {
      // Extraer JSON en caso de que haya texto extra
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No se encontró JSON en la respuesta');
      parsed = JSON.parse(match[0]);
    } catch {
      return corsResponse({ error: 'No se pudo interpretar la factura. Intenta con una foto más clara.' }, 422, origin);
    }

    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
      return corsResponse({ error: 'No se encontraron ítems en la factura.' }, 422, origin);
    }

    return corsResponse({ items: parsed.items, currency: parsed.currency ?? 'COP' }, 200, origin);
  },
};

function corsResponse(body, status, env) {
  const allowedOrigin = env?.ALLOWED_ORIGIN ?? '*';
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (body === null) {
    return new Response(null, { status, headers });
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + 3_600_000 });
    return false;
  }
  if (entry.count >= MAX_REQUESTS_PER_HOUR) {
    return true;
  }
  entry.count++;
  return false;
}
