# SplitBill

PWA para dividir cuentas de restaurante. Escanea la factura con la cámara, asigna ítems a cada persona y calcula cuánto debe pagar cada una (con IVA y propina).

**Demo:** https://split-pay-ochre.vercel.app

---

## Características

- **Escaneo OCR** — Fotografía la factura y extrae los ítems automáticamente (Claude Vision API)
- **Entrada manual** — Agrega ítems a mano si no quieres escanear
- **División por ítem** — Asigna cada ítem a una o varias personas; si comparten, se divide en partes iguales
- **IVA configurable** — Soporta IVA incluido en precios (caso típico Colombia) o IVA aparte
- **Propina flexible** — Porcentaje o monto fijo; calculada sobre la base sin IVA
- **Tema nocturno** — Activo por defecto, con toggle ☀️/🌙
- **PWA instalable** — Funciona offline (excepto el escaneo) y puede instalarse como app
- **WhatsApp-friendly** — Botón para enviar el monto de cada persona por WhatsApp

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Estilos | Tailwind CSS |
| PWA | vite-plugin-pwa (Workbox) |
| Backend | Cloudflare Worker |
| OCR | Claude Vision API (`claude-haiku-5-5`) |
| Deploy frontend | Vercel |
| Deploy worker | Cloudflare Workers |

---

## Inicio rápido (desarrollo local)

### Requisitos
- Node.js 18+
- Una cuenta en [Cloudflare](https://cloudflare.com) con `wrangler` instalado
- API key de [Anthropic](https://console.anthropic.com)

### 1. Clonar e instalar

```bash
git clone <repo-url>
cd splitbill
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```
VITE_WORKER_URL=http://localhost:8787
```

### 3. Levantar el Worker localmente

```bash
cd worker
npx wrangler dev
```

El Worker corre en `http://localhost:8787`. Asegúrate de que `ALLOWED_ORIGIN` incluya `http://localhost:5173` (ver sección de secretos más abajo).

### 4. Levantar el frontend

```bash
# desde la raíz del proyecto
npm run dev
```

Abre `http://localhost:5173`.

---

## Deploy en producción

### Frontend → Vercel

1. Conecta el repositorio en [vercel.com](https://vercel.com)
2. Agrega la variable de entorno en el dashboard de Vercel:
   - `VITE_WORKER_URL` = URL de tu Worker desplegado (ej. `https://splitbill-worker.TU_USUARIO.workers.dev`)
3. Vercel detecta automáticamente Vite gracias a `vercel.json`

```bash
# Build manual (opcional)
npm run build
```

### Worker → Cloudflare

```bash
cd worker

# Primera vez: autenticar
npx wrangler login

# Configurar secretos
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put ALLOWED_ORIGIN
# ALLOWED_ORIGIN acepta lista separada por comas:
# https://split-pay-ochre.vercel.app,http://localhost:5173

# Desplegar
npx wrangler deploy
```

---

## Variables de entorno

### Frontend (`.env`)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_WORKER_URL` | URL base del Cloudflare Worker | `https://splitbill-worker.usuario.workers.dev` |

### Worker (secretos de Cloudflare)

| Variable | Descripción |
|----------|-------------|
| `ANTHROPIC_API_KEY` | API key de Anthropic para Claude Vision |
| `ALLOWED_ORIGIN` | Orígenes permitidos (separados por coma) |

---

## Scripts disponibles

```bash
npm run dev        # Servidor de desarrollo (Vite)
npm run build      # Build de producción → dist/
npm run preview    # Preview del build localmente
npm run typecheck  # Verificación de tipos TypeScript (sin emitir)
```

---

## Arquitectura de seguridad

El frontend **nunca** llama directamente a la API de Anthropic. Toda llamada pasa por el Cloudflare Worker, que:

1. Valida el origen contra una whitelist (no refleja el `Origin` del request)
2. Aplica rate limiting (20 requests/hora por IP)
3. Agrega la API key de Anthropic en el servidor
4. Sanitiza y valida los ítems devueltos por el OCR

Ver [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para el diagrama completo.

---

## Documentación adicional

- [Arquitectura del sistema](docs/ARCHITECTURE.md) — Diagrama de flujo, estado global, seguridad
- [Estructura de archivos](docs/FILE_STRUCTURE.md) — Jerarquía del proyecto con descripción de cada archivo
