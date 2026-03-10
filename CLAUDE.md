# SplitBill - App para dividir cuentas de restaurante

Voy a desarrollar una Progressive Web App (PWA) llamada "SplitBill" 
para lanzar como producto público. La app escanea facturas de restaurantes 
con la cámara y divide la cuenta entre varias personas.

Soy nuevo en desarrollo, así que explica brevemente cada decisión 
importante que tomes.

## Stack completo
- Frontend: React + Vite + TypeScript
- Estilos: Tailwind CSS
- Animaciones: framer-motion (transiciones entre pasos, AnimatePresence, whileTap)
- Drag & drop: react-dropzone (Step1Entry)
- Avatares: @dicebear/core + @dicebear/collection (generación local, sin API externa)
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
      Step1Entry.tsx      # Drag & drop zona (react-dropzone) + cámara + skeleton loader
      Step2Review.tsx     # Lista de ítems editable
      Step3People.tsx     # Agregar personas — avatares funEmoji en grid 2 columnas
      Step4Assign.tsx     # Asignar ítems — avatares circulares con toggle
      Step5TaxTip.tsx     # Impuestos y propina
      Step6Result.tsx     # Resultado final con avatares 48px por persona
    ui/
      ItemForm.tsx        # Formulario agregar/editar ítem
      PersonChips.tsx     # Avatares circulares scrolleables (wraps PersonAvatar)
      PersonAvatar.tsx    # Avatar DiceBear funEmoji, sm=32px / md=48px, borde dorado si asignado
      Stepper.tsx         # Barra de progreso de pasos (oculta en Step6)
      StepFooter.tsx      # Footer compartido: botones Atrás / Continuar
      ErrorMessage.tsx    # Componente de error con acción de fallback
  hooks/
    useBillScanner.ts     # Llama al Cloudflare Worker
    useBillSplit.ts       # Cálculos de división
    useHaptic.ts          # Hook compartido para navigator.vibrate
  context/
    BillContext.tsx       # Estado global con useReducer
  types/
    bill.ts
  utils/
    calculations.ts
    formatCurrency.ts     # Formato COP: $1.500
  theme.css               # ÚNICA fuente de paleta — editar aquí para cambiar colores

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
- Cada persona se muestra como card en grid de 2 columnas:
  - Avatar DiceBear funEmoji (36px, borde var(--color-rose))
  - Nombre en blanco
  - Botón ✕ para eliminar
  - Fondo brand-rose al 50% de opacidad con borde brand-rose/60
- Mínimo 2 personas para continuar
- Sin límite máximo

### Step4Assign
- Para cada ítem: nombre + precio + fila de avatares circulares (PersonChips)
- Avatares scrolleables horizontalmente, 32px cada uno
- Avatar activo = borde var(--color-gold) + glow var(--glow-gold) + badge ✓ + nombre en dorado
- Avatar inactivo = borde var(--color-bg) sutil + nombre en var(--color-muted)
- Tapping en avatar hace scale 0.9 → 1 (framer-motion whileTap)
- Si múltiples personas: precio se divide equitativamente
- Ítems sin asignar: borde rojo izquierdo (border-l-brand-rose) e ícono de advertencia
- Contador arriba: "X de Y ítems asignados"
- Barra sticky inferior: avatar 32px + subtotal por persona
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

## Diseño Visual

### Reglas generales de diseño
- NUNCA tocar la lógica de OCR o división de cuenta — solo UI
- NUNCA usar tipos `any` en TypeScript
- Siempre preguntar antes de eliminar o renombrar archivos
- App siempre en modo oscuro (class="dark" en <html>), sin toggle de tema

### Sistema de temas (theme.css)
**REGLA: Nunca escribir colores hex directamente en componentes.**
Para cambiar la paleta completa, editar SOLO `src/theme.css` — bloque PALETTE.

`src/theme.css` define tres capas:
1. **Variables CSS hex** (`--color-bg`, `--color-gold`, etc.) → para inline styles en JS: `style={{ color: 'var(--color-gold)' }}`
2. **Variables CSS RGB** (`--color-bg-rgb: 72 66 109`, etc.) → habilitan modificadores de opacidad de Tailwind como `bg-brand-rose/50`
3. **Tokens derivados** (`--glow-gold`, `--glow-gold-ring`, `--gradient-header`, `--shadow-rgb`) → efectos reutilizables

Los Tailwind tokens usan formato `rgb(var(--color-*-rgb) / <alpha-value>)` — así `/50`, `/70` etc. funcionan correctamente.

### Paleta de colores
| CSS var             | Tailwind token  | Hex (default) | Uso                                      |
|---------------------|-----------------|---------------|------------------------------------------|
| --color-bg          | brand.bg        | #48426D       | Fondo principal de la app                |
| --color-surface     | brand.surface   | #312c51       | Cards y superficies grandes              |
| --color-darkest     | brand.darkest   | #312051       | Elementos más oscuros (stepper, footer)  |
| --color-gold        | brand.gold      | #F0C38E       | Acento dorado — botón primario, activo   |
| --color-rose        | brand.rose      | #F1AA9B       | Acento rosa — secundario, Step1, rosa    |
| --color-muted       | brand.muted     | #C4BDD8       | Texto secundario / placeholder           |

Aliases legacy (mantienen compatibilidad con código existente):
`--bg-primary`, `--bg-surface`, `--accent-gold`, `--accent-rose`, `--text-primary`, `--text-muted`

### Tipografía
- Títulos: Playfair Display (font-display) — cargada de Google Fonts
- Cuerpo: DM Sans (font-body) — cargada de Google Fonts

### Sistema de avatares (PersonAvatar.tsx)
- Librería: @dicebear/core + @dicebear/collection — 100% local, sin llamadas externas
- Estilo: `funEmoji`, seed = nombre de la persona (consistente y único)
- Tamaños: sm=32px (chips de asignación y barra sticky), md=48px (cards de resultado)
- Estado no asignado: borde `var(--color-bg)` sutil
- Estado asignado: borde `var(--color-gold)` + boxShadow `var(--glow-gold)` + badge ✓ superpuesto
- Interactivo (con onToggle): whileTap={{ scale: 0.9 }} + nombre debajo

### Componentes de navegación compartidos
- StepFooter.tsx: footer fijo con "← Atrás" (borde blanco) y "Continuar →" (dorado)
- useHaptic.ts: hook que llama navigator.vibrate — importar en lugar de definir local

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

## Estado del proyecto (al 2026-03-09)
- [x] Todo el flujo de 6 pasos implementado y funcional
- [x] Cloudflare Worker desplegado y conectado
- [x] Deploy en Vercel funcionando
- [x] PWA instalable (icono SVG en public/icons/icon.svg)
- [x] Cámara + OCR funcionando con claude-haiku-4-5
- [x] ItemForm con botones +/− y edición libre de cantidad
- [x] Toggle IVA incluido/no incluido en Step5
- [x] Propina calculada sobre base pre-IVA, redondeada al $100 superior
- [x] Total y totales por persona redondeados al $100 más cercano
- [x] Modo oscuro permanente (sin toggle, class="dark" fijo en <html>)
- [x] Botón WhatsApp por persona en Step6 para compartir monto individual
- [x] Seguridad básica del Worker: CORS seguro, límite de imagen, timeout, sanitización OCR
- [x] Rediseño UI completo: paleta morada/dorada/rosa, Playfair Display + DM Sans
- [x] framer-motion: transiciones AnimatePresence entre estados, stagger en Step6
- [x] react-dropzone en Step1 con zona drag & drop animada y skeleton loader
- [x] Avatares DiceBear funEmoji generados localmente por nombre de persona
- [x] Step3: cards de persona en grid 2 col con avatar + nombre + botón eliminar
- [x] Step4: PersonChips con avatares circulares — borde dorado al asignar + badge ✓
- [x] Step4: barra sticky inferior con avatar + subtotal por persona
- [x] Step6: avatar 48px con borde dorado en cada card de resultado
- [x] StepFooter y useHaptic extraídos como componentes/hooks compartidos
- [x] Sistema de temas centralizado: src/theme.css como única fuente de paleta
- [x] Tailwind tokens con rgb(var()/alpha) — modificadores de opacidad /50, /70 funcionan con CSS vars
- [x] Cero colores hex hardcodeados en componentes — todo vía CSS vars o tokens Tailwind
