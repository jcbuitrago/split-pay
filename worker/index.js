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

    // Rate limiting por IP (KV con fallback en memoria)
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    if (await isRateLimited(ip, env)) {
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
      let errData = {};
      try {
        const errText = await readBodyWithLimit(anthropicResponse, 65536); // Máximo 64KB para error
        errData = JSON.parse(errText);
      } catch (e) {
        // Ignorar error de parsing en la respuesta de error de Anthropic
      }
      const detail = errData?.error?.message ?? anthropicResponse.statusText;
      console.error('Anthropic error:', anthropicResponse.status, detail);
      return corsResponse({ error: 'No se pudo procesar la factura. Intenta de nuevo.' }, 502, allowedOrigin);
    }

    let rawText = '';
    try {
      const responseBodyText = await readBodyWithLimit(anthropicResponse, 1024 * 1024); // Máximo 1MB
      const aiData = JSON.parse(responseBodyText);
      rawText = aiData?.content?.[0]?.text ?? '';
    } catch (err) {
      console.error('Failed to read or parse Anthropic response:', err);
      return corsResponse({ error: 'La respuesta del servicio de OCR no pudo ser procesada.' }, 502, allowedOrigin);
    }

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

async function readBodyWithLimit(response, maxBytes) {
  const contentLengthHeader = response.headers.get('content-length');
  if (contentLengthHeader) {
    const contentLength = parseInt(contentLengthHeader, 10);
    if (!isNaN(contentLength) && contentLength > maxBytes) {
      throw new Error(`Response size limit exceeded: ${contentLength} bytes`);
    }
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        totalBytes += value.length;
        if (totalBytes > maxBytes) {
          throw new Error(`Response size limit exceeded: > ${maxBytes} bytes`);
        }
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  const textDecoder = new TextDecoder('utf-8');
  return textDecoder.decode(combined);
}

async function isRateLimited(ip, env) {
  const now = Date.now();

  // 1. Intentar usar Cloudflare KV si está disponible
  if (env && env.RATE_LIMIT_KV) {
    try {
      const kvKey = `rl:${ip}`;
      const dataStr = await env.RATE_LIMIT_KV.get(kvKey);
      let data = null;
      if (dataStr) {
        try {
          data = JSON.parse(dataStr);
        } catch (e) {
          // Ignorar JSON corrupto
        }
      }

      if (!data || now > data.resetAt) {
        const expirationSeconds = 3600; // 1 hora
        const newData = { count: 1, resetAt: now + 3600 * 1000 };
        await env.RATE_LIMIT_KV.put(kvKey, JSON.stringify(newData), { expirationTtl: expirationSeconds });
        return false;
      }

      if (data.count >= MAX_REQUESTS_PER_HOUR) {
        return true;
      }

      data.count++;
      const secondsLeft = Math.max(Math.ceil((data.resetAt - now) / 1000), 60);
      await env.RATE_LIMIT_KV.put(kvKey, JSON.stringify(data), { expirationTtl: secondsLeft });
      return false;
    } catch (err) {
      console.error('KV rate limit error, falling back to memory Map:', err);
    }
  }

  // 2. Fallback a Map en memoria
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
