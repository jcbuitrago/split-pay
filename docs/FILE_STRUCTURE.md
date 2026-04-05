# Estructura de archivos

```
splitbill/
│
├── CLAUDE.md                   # Instrucciones para el asistente de IA (Claude)
├── index.html                  # HTML raíz — siempre class="dark", punto de entrada de Vite
├── package.json                # Dependencias y scripts npm
├── tsconfig.json               # Configuración TypeScript (app)
├── tsconfig.node.json          # Configuración TypeScript (herramientas Vite/Node)
├── vite.config.ts              # Configuración de Vite + plugin React + PWA
├── tailwind.config.js          # Tokens de Tailwind — brand.*, sombras navy-*
├── postcss.config.js           # PostCSS (requerido por Tailwind)
├── vercel.json                 # Configuración de deploy en Vercel
├── .env                        # Variables de entorno locales (no en git)
│                               #   VITE_WORKER_URL=http://localhost:8787
│
├── docs/                       # Documentación técnica
│   ├── ARCHITECTURE.md         # Diagrama del sistema, flujo de datos, seguridad
│   └── FILE_STRUCTURE.md       # Este archivo
│
├── public/                     # Assets estáticos (copiados tal cual al build)
│   └── icons/
│       └── icon.svg            # Ícono de la PWA (SVG universal, sirve para todos los tamaños)
│
├── src/                        # Código fuente del frontend
│   │
│   ├── main.tsx                # Punto de entrada React — monta <BillProvider><App />
│   ├── App.tsx                 # Shell principal: Stepper + StepContent (switch por paso)
│   ├── index.css               # Estilos globales (directivas @tailwind)
│   ├── theme.css               # ★ ÚNICA fuente de paleta de colores
│   │                           #   - Variables CSS hex (--color-bg, --color-purple, etc.)
│   │                           #   - Variables CSS RGB para modificadores de opacidad Tailwind
│   │                           #   - Tokens derivados (--glow-purple, --gradient-header, etc.)
│   ├── vite-env.d.ts           # Tipos de import.meta.env para TypeScript
│   │
│   ├── types/
│   │   └── bill.ts             # Interfaces y constantes compartidas:
│   │                           #   BillItem, Person, BillState, PersonSplit, PERSON_COLORS
│   │
│   ├── context/
│   │   └── BillContext.tsx     # Estado global con useReducer
│   │                           #   - BillState completo de la app
│   │                           #   - Todas las acciones del reducer (ADD_ITEM, SET_STEP, etc.)
│   │                           #   - Helpers: nextStep(), prevStep(), nextPersonColor()
│   │                           #   - Hook useBill() para consumir el contexto
│   │
│   ├── hooks/
│   │   ├── useBillScanner.ts   # Comunicación con el Cloudflare Worker
│   │   │                       #   - scanBill(): POST /scan con imagen base64
│   │   │                       #   - fileToBase64(): redimensiona y comprime imagen (máx 1200px, JPEG 0.82)
│   │   │
│   │   ├── useBillSplit.ts     # Hook de cálculo del resumen de la cuenta
│   │   │                       #   Retorna: { subtotal, tax, tip, total, splits }
│   │   │                       #   Usado por Step5TaxTip (preview) y Step6Result (resultado final)
│   │   │
│   │   └── useHaptic.ts        # Hook compartido para haptic feedback
│   │                           #   Llama navigator.vibrate(); usado en agregar ítem/persona, etc.
│   │
│   ├── utils/
│   │   ├── calculations.ts     # Funciones puras de cálculo
│   │   │                       #   - calculateSubtotal(items)
│   │   │                       #   - calculateTax(subtotal, taxPercent, taxIncluded)
│   │   │                       #   - calculateTip(subtotal, state)
│   │   │                       #   - calculateSplit(state) → PersonSplit[]
│   │   │                       #   - roundToNearest100(amount)  ← redondea al $100 más cercano
│   │   │                       #   - roundUpTo100(amount)       ← redondea al $100 superior (propina %)
│   │   │
│   │   └── formatCurrency.ts   # formatCOP(amount): $1.500 (puntos como miles, sin decimales)
│   │
│   └── components/
│       │
│       ├── steps/              # Un componente por paso del flujo
│       │   │
│       │   ├── Step1Entry.tsx  # Paso 1: elegir entrada
│       │   │                   #   - Zona dropzone (react-dropzone) que abre cámara/archivo al tocar
│       │   │                   #   - Drag & drop con animación de borde al arrastrar
│       │   │                   #   - Preview de foto + "Usar esta foto" / "Retomar"
│       │   │                   #   - Spinner con skeleton durante OCR
│       │   │                   #   - Botón "✏️ Ingresar manualmente"
│       │   │
│       │   ├── Step2Review.tsx # Paso 2: revisar y editar ítems
│       │   │                   #   - Lista de ItemCard con expansión inline (AnimatePresence height)
│       │   │                   #   - Cada card expande in-place para editar nombre/cantidad/precio
│       │   │                   #   - Botón "+ Agregar ítem" → ItemForm separado al final
│       │   │                   #   - Subtotal en tiempo real
│       │   │                   #   - Validación: ≥1 ítem con precio > 0
│       │   │
│       │   ├── Step3People.tsx # Paso 3: agregar personas
│       │   │                   #   - Input nombre + botón "Agregar" (o Enter)
│       │   │                   #   - Grid 2 columnas con cards animadas (framer-motion)
│       │   │                   #   - Cada card: avatar DiceBear funEmoji + nombre + botón ✕
│       │   │                   #   - Animación de entrada/salida (scale + opacity)
│       │   │                   #   - Validación: mínimo 2 personas
│       │   │
│       │   ├── Step4Assign.tsx # Paso 4: asignar ítems a personas
│       │   │                   #   - Por ítem: avatares circulares con scroll horizontal
│       │   │                   #   - Avatar activo: borde dorado + glow + badge ✓
│       │   │                   #   - División equitativa si múltiples personas
│       │   │                   #   - Ítems sin asignar: borde rojo + advertencia
│       │   │                   #   - Contador "X de Y ítems asignados"
│       │   │                   #   - Barra sticky inferior: avatar + subtotal por persona
│       │   │                   #   - Validación: todos los ítems deben estar asignados
│       │   │
│       │   ├── Step5TaxTip.tsx # Paso 5: configurar IVA y propina
│       │   │                   #   - Toggle IVA incluido/no incluido (default: incluido)
│       │   │                   #   - Slider + input numérico para % IVA (default 8%)
│       │   │                   #   - Toggle propina % vs monto fijo
│       │   │                   #   - Checkbox "Propina voluntaria" (Ley colombiana)
│       │   │                   #   - Preview del total en tiempo real con desglose
│       │   │
│       │   └── Step6Result.tsx # Paso 6: resultado final
│       │                       #   - Header: total de la cuenta en grande (dorado)
│       │                       #   - PersonCard por persona:
│       │                       #       · Nombre + monto total
│       │                       #       · Acordeón expandible con desglose de ítems
│       │                       #       · Botón WhatsApp → mensaje pre-formateado
│       │                       #       · Toggle pagado (📋 sin pagar → ✓ verde pagado)
│       │                       #   - Botón "📤 Compartir resultado" (Web Share API o clipboard)
│       │                       #   - Botón "← Atrás" + Botón "🔄 Nueva cuenta" → RESET
│       │
│       └── ui/                 # Componentes reutilizables
│           │
│           ├── Stepper.tsx     # Barra de progreso de los 6 pasos
│           │                   #   - Track absoluto con fill de progreso (% calculado)
│           │                   #   - Círculos como slots flex-1 (espaciado uniforme)
│           │                   #   - Paso completado: checkmark SVG; activo: glow púrpura
│           │
│           ├── StepFooter.tsx  # Footer compartido de navegación
│           │                   #   Props: onBack, onContinue, continueDisabled?, continueLabel?
│           │                   #   - Botón "← Atrás" (borde blanco) + "Continuar →" (púrpura)
│           │
│           ├── ItemForm.tsx    # Formulario para agregar un nuevo ítem
│           │                   #   - Inputs: nombre, cantidad (botones +/− + edición libre), precio
│           │                   #   - Usado al final de Step2Review para agregar ítems nuevos
│           │
│           ├── PersonAvatar.tsx # Avatar DiceBear funEmoji generado localmente
│           │                   #   Props: name, size ('sm'|'md'), assigned?, onToggle?
│           │                   #   - sm = 32px (Step4 chips, barra sticky)
│           │                   #   - md = 48px (Step6 cards de resultado)
│           │                   #   - assigned=true: borde púrpura + glow + badge ✓
│           │                   #   - onToggle: whileTap scale 0.9 (framer-motion)
│           │
│           ├── PersonChips.tsx # Fila de avatares seleccionables (wraps PersonAvatar)
│           │                   #   Props: people, selected[], onToggle, scrollable
│           │                   #   - scrollable=true: overflow-x-auto (Step4)
│           │                   #   - scrollable=false: flex-wrap
│           │
│           └── ErrorMessage.tsx # Banner de error con acción de fallback opcional
│                               #   Props: message, action?: { label, onClick }
│
└── worker/                     # Cloudflare Worker (backend independiente)
    │
    ├── index.js                # Worker principal
    │                           #   POST /scan: proxy seguro hacia Anthropic Vision
    │                           #   - Validación de origen (CORS whitelist)
    │                           #   - Rate limiting por IP (Map en memoria, 20 req/hora)
    │                           #   - Límite de imagen: 8MB base64
    │                           #   - Timeout: 25s con AbortController
    │                           #   - Sanitización de ítems del OCR
    │                           #   - No expone errores internos de Anthropic
    │
    └── wrangler.toml           # Configuración de Cloudflare Wrangler
                                #   name: splitbill-worker
                                #   Secretos configurados por CLI (no en este archivo):
                                #     ANTHROPIC_API_KEY, ALLOWED_ORIGIN
```

---

## Reglas de dependencia entre capas

```
components/steps  →  hooks, context, utils, components/ui
components/ui     →  types
hooks             →  types, utils (calculations)
context           →  types
utils             →  types
types             →  (sin dependencias)
worker/index.js   →  (sin imports — vanilla JS para Cloudflare Workers)
```

Los componentes de `steps/` son los únicos que despachan acciones al contexto.
Los componentes de `ui/` reciben props y tienen estado local mínimo (solo UI efímera).

---

## Convenciones de código

| Convención | Detalle |
|-----------|---------|
| Moneda | Enteros en COP, sin decimales. `formatCOP()` para mostrar. |
| IDs | `crypto.randomUUID()` o `Date.now() + índice` para ítems escaneados |
| Colores | Nunca hex hardcodeados en componentes — siempre `var(--color-*)` o tokens Tailwind `brand.*` |
| Tema | Siempre modo oscuro (`class="dark"` fijo en `<html>`); sin toggle de tema |
| Avatares | DiceBear funEmoji, seed = nombre → mismo nombre = mismo emoji siempre |
| Sin persistencia | Estado solo en memoria — se pierde al cerrar la app (diseño intencional) |
| Textos | Español colombiano en toda la UI |
| Haptic | Siempre via `useHaptic()` — nunca llamar `navigator.vibrate` directamente |
