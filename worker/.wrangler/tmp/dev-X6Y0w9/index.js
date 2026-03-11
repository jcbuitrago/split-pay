var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// index.js
var MAX_REQUESTS_PER_HOUR = 20;
var rateLimitStore = /* @__PURE__ */ new Map();
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const requestOrigin = request.headers.get("Origin") ?? "";
    const allowedOrigins = (env.ALLOWED_ORIGIN ?? "").split(",").map((o) => o.trim()).filter(Boolean);
    const allowedOrigin = allowedOrigins.find((o) => o === requestOrigin) ?? allowedOrigins[0] ?? "";
    if (request.method === "OPTIONS") {
      return corsResponse(null, 204, allowedOrigin);
    }
    if (request.method !== "POST" || url.pathname !== "/scan") {
      return corsResponse({ error: "Not found" }, 404, allowedOrigin);
    }
    if (!allowedOrigin || allowedOrigins.length > 0 && !allowedOrigins.includes(requestOrigin)) {
      return corsResponse({ error: "Origen no permitido" }, 403, allowedOrigin);
    }
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    if (isRateLimited(ip)) {
      return corsResponse({ error: "Demasiadas solicitudes. Intenta en unos minutos." }, 429, allowedOrigin);
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse({ error: "JSON inv\xE1lido" }, 400, allowedOrigin);
    }
    const { image, mediaType } = body;
    if (!image || typeof image !== "string") {
      return corsResponse({ error: 'Se requiere el campo "image" en base64' }, 400, allowedOrigin);
    }
    const MAX_IMAGE_B64 = 8 * 1024 * 1024;
    if (image.length > MAX_IMAGE_B64) {
      return corsResponse({ error: "La imagen es demasiado grande. M\xE1ximo 6MB." }, 413, allowedOrigin);
    }
    const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const resolvedMediaType = ALLOWED_MEDIA_TYPES.includes(mediaType) ? mediaType : "image/jpeg";
    const prompt = `Extrae todos los \xEDtems de esta factura de restaurante.
Responde \xDANICAMENTE con JSON v\xE1lido, sin texto adicional:
{"items": [{"name": string, "price": number, "quantity": number}], "currency": string}
Los precios deben ser n\xFAmeros sin s\xEDmbolos de moneda ni puntos de miles.`;
    let anthropicResponse;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25e3);
    try {
      anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: resolvedMediaType,
                    data: image
                  }
                },
                { type: "text", text: prompt }
              ]
            }
          ]
        })
      });
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        return corsResponse({ error: "El servicio tard\xF3 demasiado. Intenta de nuevo." }, 504, allowedOrigin);
      }
      return corsResponse({ error: "Error al conectar con el servicio de OCR" }, 502, allowedOrigin);
    }
    clearTimeout(timeout);
    if (!anthropicResponse.ok) {
      const errData = await anthropicResponse.json().catch(() => ({}));
      const detail = errData?.error?.message ?? anthropicResponse.statusText;
      console.error("Anthropic error:", anthropicResponse.status, detail);
      return corsResponse({ error: "No se pudo procesar la factura. Intenta de nuevo." }, 502, allowedOrigin);
    }
    const aiData = await anthropicResponse.json();
    const rawText = aiData?.content?.[0]?.text ?? "";
    let parsed;
    try {
      const match = rawText.match(/\{[\s\S]*?\}(?=\s*$)/) ?? rawText.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No se encontr\xF3 JSON en la respuesta");
      parsed = JSON.parse(match[0]);
    } catch {
      return corsResponse({ error: "No se pudo interpretar la factura. Intenta con una foto m\xE1s clara." }, 422, allowedOrigin);
    }
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
      return corsResponse({ error: "No se encontraron \xEDtems en la factura." }, 422, allowedOrigin);
    }
    const validItems = parsed.items.filter((item) => item && typeof item === "object").map((item) => ({
      name: (typeof item.name === "string" ? item.name.trim().slice(0, 200) : "\xCDtem") || "\xCDtem",
      price: typeof item.price === "number" && isFinite(item.price) && item.price >= 0 ? Math.round(item.price) : 0,
      quantity: typeof item.quantity === "number" && item.quantity >= 1 ? Math.min(Math.round(item.quantity), 99) : 1
    })).filter((item) => item.price > 0);
    if (validItems.length === 0) {
      return corsResponse({ error: "No se encontraron \xEDtems v\xE1lidos en la factura." }, 422, allowedOrigin);
    }
    return corsResponse({ items: validItems, currency: parsed.currency ?? "COP" }, 200, allowedOrigin);
  }
};
function corsResponse(body, status, origin) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if (body === null) {
    return new Response(null, { status, headers });
  }
  return new Response(JSON.stringify(body), { status, headers });
}
__name(corsResponse, "corsResponse");
function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + 36e5 });
    return false;
  }
  if (entry.count >= MAX_REQUESTS_PER_HOUR) {
    return true;
  }
  entry.count++;
  return false;
}
__name(isRateLimited, "isRateLimited");

// ../../.npm-global/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../.npm-global/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-dYlwKY/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = index_default;

// ../../.npm-global/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-dYlwKY/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
