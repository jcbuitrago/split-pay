# SplitBill - App para dividir cuentas de restaurante

Voy a desarrollar una Progressive Web App (PWA) llamada "SplitBill" 
para lanzar como producto público. La app escanea facturas de restaurantes 
con la cámara y divide la cuenta entre varias personas.

Soy nuevo en desarrollo, así que explica brevemente cada decisión 
importante que tomes.

## Stack completo
- Frontend: React + Vite + TypeScript
- Estilos: Tailwind CSS
- PWA: vite-plugin-pwa
- Backend/Proxy: Cloudflare Worker (para proteger la API key)
- OCR: Claude Vision API (claude-haiku-4-5) via el Worker

## Arquitectura de seguridad
El frontend NUNCA llama directamente a Anthropic.
Siempre llama a nuestro Cloudflare Worker en: https://splitbill-worker.TU_USUARIO.workers.dev/scan
El Worker valida el origen, añade la API key y llama a Anthropic.

## Estructura de carpetas del frontend:
src/
  components/
    steps/
      Step1Entry.tsx      # Elegir: escanear o ingresar manual
      Step2Review.tsx     # Lista de ítems editable
      Step3People.tsx     # Agregar personas (sin límite)
      Step4Assign.tsx     # Asignar ítems a personas
      Step5TaxTip.tsx     # Impuestos y propina
      Step6Result.tsx     # Resultado final
    ui/
      ItemForm.tsx        # Formulario agregar/editar ítem
      PersonChips.tsx     # Chips de personas con scroll horizontal
      Stepper.tsx         # Barra de progreso de pasos
      ErrorMessage.tsx    # Componente de error con acción de fallback
  hooks/
    useBillScanner.ts     # Llama al Cloudflare Worker
    useBillSplit.ts       # Cálculos de división
  context/
    BillContext.tsx       # Estado global con useReducer
  types/
    bill.ts
  utils/
    calculations.ts
    formatCurrency.ts     # Formato COP: $1.500

## Tipos principales (bill.ts):
interface BillItem {
  id: string;
  name: string;
  price: number;        // En pesos colombianos, sin decimales
  quantity: number;
  assignedTo: string[]; // IDs de personas
}
interface Person {
  id: string;
  name: string;
  color: string;        // Color único de paleta de 20 colores
}
interface BillState {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  items: BillItem[];
  people: Person[];
  taxPercent: number;       // Default: 8 (IVA Colombia restaurantes)
  taxIncluded: boolean;     // Default: true (IVA ya incluido en precios del menú)
  tipPercent: number;       // Default: 10
  tipAmount: number;        // Para propina fija, default: 0
  tipType: 'percent' | 'fixed';
  tipIsVoluntary: boolean;  // Default: true (mostrar aviso legal Colombia)
  entryMode: 'scan' | 'manual';
  originalImage?: string;
  isLoading: boolean;
  error?: string;
}

## Flujo de cada paso:

### Step1Entry
- Botón primario grande: "📷 Escanear factura"
  → Abre cámara (preferir cámara trasera) o file picker en desktop
  → Mostrar preview de la imagen tomada con botón "Usar esta foto" / "Retomar"
  → Spinner con mensaje "Leyendo tu factura..." mientras procesa
  → Si falla: mensaje amigable + botón "Ingresar manualmente"
- Botón secundario: "✏️ Ingresar manualmente"
  → Ir a Step2 con lista vacía

### Step2Review
- Lista de ítems con: nombre, cantidad, precio unitario, precio total, botón eliminar
- Botón "+ Agregar ítem" siempre visible al fondo
- ItemForm: inputs para nombre (texto), cantidad (número, default 1), precio unitario
- Subtotal en tiempo real abajo de la lista
- Validar antes de continuar: mínimo 1 ítem, todos con precio > 0

### Step3People
- Input nombre + botón "Agregar" (también funciona con Enter)
- Mostrar personas como chips con su color asignado y botón X
- Paleta de 20 colores distinctivos (no pasteles, que se vean bien en chips)
- Mínimo 2 personas para continuar
- Sin límite máximo

### Step4Assign
- Para cada ítem: nombre + precio + fila de chips de personas
- Chips scrolleables horizontalmente
- Chip activo = persona seleccionada para ese ítem
- Si múltiples personas: precio se divide equitativamente
- Ítems sin asignar: borde rojo y ícono de advertencia
- Contador arriba: "X de Y ítems asignados"
- No se puede continuar con ítems sin asignar

### Step5TaxTip
- Sección Impuesto:
  - Toggle "¿Precios con IVA incluido?" Sí/No (default: Sí)
    - Sí: IVA ya está en los precios del menú (caso más común en Colombia)
    - No: IVA se suma encima de los precios (e.g. factura muestra precios base)
  - Slider + input numérico para % IVA (default 8%)
  - Texto informativo: "IVA típico en restaurantes Colombia: 8%"
- Sección Propina:
  - Toggle: "%" vs "Monto fijo"
  - Si %: slider + input (default 10%)
  - Si fijo: input en pesos
  - Checkbox: "Propina voluntaria" (default: marcado)
  - Si marcado: mostrar "(La propina es voluntaria - Ley colombiana)"
- Preview del total en tiempo real con desglose correcto según taxIncluded

### Step6Result
- Header: total de la cuenta
- Card por persona (con su color):
  - Nombre + monto total a pagar (grande y claro)
  - Acordeón expandible: desglose de sus ítems
- Botón "Compartir resultado":
  - Web Share API si disponible
  - Fallback: copiar texto formateado al portapapeles
  - Texto compartido en formato WhatsApp-friendly
- Botón "Nueva cuenta" → reset completo del estado

## Cloudflare Worker (worker/index.js):
- Endpoint POST /scan
- ALLOWED_ORIGIN acepta lista separada por comas (e.g. "https://mi-app.vercel.app,http://localhost:5173")
- Rate limit: máximo 20 requests por IP por hora usando Map en memoria (no KV)
- Recibir: { image: base64string, mediaType: string }
- Límite de imagen: 8MB base64 (~6MB comprimida). Responde 413 si supera.
- Modelo: claude-haiku-4-5
- Timeout hacia Anthropic: 25 segundos (AbortController). Responde 504 si se agota.
- Retornar: { items: [{name, price, quantity}], currency } o { error: mensaje }
- Los ítems del OCR se sanitizan antes de retornar: name truncado a 200 chars, price redondeado y ≥ 0, quantity entre 1–99
- CORS: el header Access-Control-Allow-Origin se establece desde la whitelist, NUNCA se refleja el Origin del request
- El prompt de OCR debe ser:
  "Extrae todos los ítems de esta factura de restaurante.
   Responde ÚNICAMENTE con JSON válido, sin texto adicional:
   {items: [{name: string, price: number, quantity: number}], currency: string}
   Los precios deben ser números sin símbolos de moneda ni puntos de miles."
- Variables de entorno requeridas (en Cloudflare dashboard):
  ANTHROPIC_API_KEY, ALLOWED_ORIGIN
- Deploy: npx wrangler deploy (desde worker/)
- Secretos: npx wrangler secret put ANTHROPIC_API_KEY

## Seguridad

### Vulnerabilidades corregidas (2026-02-25)
| Archivo | Fix |
|---------|-----|
| `worker/index.js` | CORS: usa origen de la whitelist, nunca refleja el Origin del request |
| `worker/index.js` | Límite de tamaño de imagen: rechaza base64 > 8MB con 413 |
| `worker/index.js` | Timeout de 25s con AbortController hacia Anthropic; responde 504 |
| `worker/index.js` | Sanitización de items del OCR (name/price/quantity con límites) |
| `worker/index.js` | No expone detalles internos de errores de Anthropic al cliente |
| `src/context/BillContext.tsx` | `originalImage` se borra del estado al avanzar del Step 1 (caso `SET_STEP`) |

### Vulnerabilidades pendientes (no corregidas aún)
| Severidad | Archivo | Descripción |
|-----------|---------|-------------|
| ALTA | `worker/index.js` | Rate limiting en Map de memoria — no persiste entre instancias de Cloudflare Worker (múltiples instancias = bypass fácil). Migrar a Cloudflare KV o Durable Objects. |
| MEDIA | `vercel.json` | Faltan cabeceras de seguridad HTTP: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`. Agregar campo `"headers"` en vercel.json. |
| MEDIA | `worker/index.js` | Sin límite de tamaño en la respuesta JSON de Anthropic (`anthropicResponse.json()`). Podría causar consumo excesivo de memoria si la API retorna una respuesta anormalmente grande. |

## Lógica de cálculo (calculations.ts):
- calculateTax(subtotal, taxPercent, taxIncluded):
  - taxIncluded=true:  subtotal * taxPercent / (100 + taxPercent)  → extrae IVA, solo informativo
  - taxIncluded=false: subtotal * taxPercent / 100                 → IVA a sumar al total
- calculateTip(subtotal, state):
  - Base pre-IVA = taxIncluded ? subtotal/(1+taxPercent/100) : subtotal
  - Propina % = roundUpTo100(base * tipPercent/100)  → redondea al $100 superior
  - Propina fija = state.tipAmount (sin redondear)
- Total final:
  - taxIncluded=true:  subtotal + tip
  - taxIncluded=false: subtotal + tax + tip
- PersonSplit.total sigue la misma lógica por persona

## Formato de moneda Colombia:
- Usar puntos como separador de miles: $1.500, $23.000
- Sin decimales para COP
- Función formatCOP(amount: number): string

## Reglas generales:
1. Mobile-first, ancho objetivo 375px-430px
2. Sin límite de personas en ninguna parte del código
3. App funciona 100% offline excepto Step1 escaneo
4. Todos los textos en español colombiano
5. Manejo de errores con mensajes claros y siempre con una acción alternativa
6. Haptic feedback (navigator.vibrate) al: agregar ítem, agregar persona, completar
7. Animaciones suaves entre pasos (CSS transitions, no librerías pesadas)
8. Sin localStorage ni cookies (estado solo en memoria, se pierde al cerrar)

## Deploy
- Frontend: Vercel (vite build → dist/). Script en package.json: "build": "vite build"
  - vercel.json en raíz configura framework vite y excluye worker/
  - NO incluir tsc en el script de build (usa "typecheck": "tsc --noEmit" por separado)
  - Asegurarse de que node_modules/ esté en .gitignore ANTES del primer commit
- Worker: Cloudflare (npx wrangler deploy desde worker/)
  - wrangler.toml en worker/ — sin KV, solo configuración básica
  - Secretos vía CLI: npx wrangler secret put ANTHROPIC_API_KEY
  - ALLOWED_ORIGIN configurar en dashboard o con: npx wrangler secret put ALLOWED_ORIGIN

## Pruebas locales
- Frontend: npm run dev → http://localhost:5173
- Para probar el Worker localmente: agregar "http://localhost:5173" a ALLOWED_ORIGIN (separado por coma)
- El Worker en producción está en: https://splitbill-worker.jcbuitrago99.workers.dev
- El frontend en producción está en: https://split-pay-ochre.vercel.app

## Estado del proyecto (al 2026-02-25)
- [x] Todo el flujo de 6 pasos implementado y funcional
- [x] Cloudflare Worker desplegado y conectado
- [x] Deploy en Vercel funcionando
- [x] PWA instalable (icono SVG en public/icons/icon.svg)
- [x] Cámara + OCR funcionando con claude-haiku-4-5
- [x] ItemForm con botones +/− y edición libre de cantidad
- [x] Toggle IVA incluido/no incluido en Step5
- [x] Propina calculada sobre base pre-IVA, redondeada al $100 superior
- [x] Total y totales por persona redondeados al $100 más cercano
- [x] Tema nocturno por defecto con toggle ☀️/🌙 en Step1
- [x] Botón WhatsApp por persona en Step6 para compartir monto individual
- [x] Seguridad básica del Worker: CORS seguro, límite de imagen, timeout, sanitización OCR