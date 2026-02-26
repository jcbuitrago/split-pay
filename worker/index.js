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
    const requestOrigin = request.headers.get('Origin') ?? '';

    // Validar origen (ALLOWED_ORIGIN puede ser lista separada por comas)
    const allowedOrigins = (env.ALLOWED_ORIGIN ?? '')
      .split(',')
      .map(o => o.trim())
      .filter(Boolean);
    // Usar el origen de la lista (nunca reflejar el origen del request)
    const allowedOrigin = allowedOrigins.find(o => o === requestOrigin) ?? allowedOrigins[0] ?? '';

    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204, allowedOrigin);
    }
    if (request.method !== 'POST' || url.pathname !== '/scan') {
      return corsResponse({ error: 'Not found' }, 404, allowedOrigin);
    }

    if (!allowedOrigin || (allowedOrigins.length > 0 && !allowedOrigins.includes(requestOrigin))) {
      return corsResponse({ error: 'Origen no permitido' }, 403, allowedOrigin);
    }

    // Rate limiting por IP (en memoria)
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    if (isRateLimited(ip)) {
      return corsResponse({ error: 'Demasiadas solicitudes. Intenta en unos minutos.' }, 429, allowedOrigin);
    }

    // Parsear body
    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse({ error: 'JSON inválido' }, 400, allowedOrigin);
    }

    const { image, mediaType } = body;
    if (!image || typeof image !== 'string') {
      return corsResponse({ error: 'Se requiere el campo "image" en base64' }, 400, allowedOrigin);
    }

    // Límite de tamaño: ~8MB base64 ≈ 6MB imagen comprimida
    const MAX_IMAGE_B64 = 8 * 1024 * 1024;
    if (image.length > MAX_IMAGE_B64) {
      return corsResponse({ error: 'La imagen es demasiado grande. Máximo 6MB.' }, 413, allowedOrigin);
    }

    const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const resolvedMediaType = ALLOWED_MEDIA_TYPES.includes(mediaType) ? mediaType : 'image/jpeg';

    // Llamar a Anthropic Vision
    const prompt = `Extrae todos los ítems de esta factura de restaurante.
Responde ÚNICAMENTE con JSON válido, sin texto adicional:
{"items": [{"name": string, "price": number, "quantity": number}], "currency": string}
Los precios deben ser números sin símbolos de moneda ni puntos de miles.`;

    let anthropicResponse;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    try {
      anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
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
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        return corsResponse({ error: 'El servicio tardó demasiado. Intenta de nuevo.' }, 504, allowedOrigin);
      }
      return corsResponse({ error: 'Error al conectar con el servicio de OCR' }, 502, allowedOrigin);
    }
    clearTimeout(timeout);

    if (!anthropicResponse.ok) {
      const errData = await anthropicResponse.json().catch(() => ({}));
      const detail = errData?.error?.message ?? anthropicResponse.statusText;
      console.error('Anthropic error:', anthropicResponse.status, detail);
      return corsResponse({ error: 'No se pudo procesar la factura. Intenta de nuevo.' }, 502, allowedOrigin);
    }

    const aiData = await anthropicResponse.json();
    const rawText = aiData?.content?.[0]?.text ?? '';

    // Parsear JSON de la respuesta (non-greedy para evitar extraer bloques incorrectos)
    let parsed;
    try {
      const match = rawText.match(/\{[\s\S]*?\}(?=\s*$)/) ?? rawText.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No se encontró JSON en la respuesta');
      parsed = JSON.parse(match[0]);
    } catch {
      return corsResponse({ error: 'No se pudo interpretar la factura. Intenta con una foto más clara.' }, 422, allowedOrigin);
    }

    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
      return corsResponse({ error: 'No se encontraron ítems en la factura.' }, 422, allowedOrigin);
    }

    // Sanitizar y validar cada ítem
    const validItems = parsed.items
      .filter(item => item && typeof item === 'object')
      .map(item => ({
        name: (typeof item.name === 'string' ? item.name.trim().slice(0, 200) : 'Ítem') || 'Ítem',
        price: (typeof item.price === 'number' && isFinite(item.price) && item.price >= 0)
          ? Math.round(item.price) : 0,
        quantity: (typeof item.quantity === 'number' && item.quantity >= 1)
          ? Math.min(Math.round(item.quantity), 99) : 1,
      }))
      .filter(item => item.price > 0);

    if (validItems.length === 0) {
      return corsResponse({ error: 'No se encontraron ítems válidos en la factura.' }, 422, allowedOrigin);
    }

    return corsResponse({ items: validItems, currency: parsed.currency ?? 'COP' }, 200, allowedOrigin);
  },
};

function corsResponse(body, status, origin) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
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
