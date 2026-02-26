# Estructura de archivos

```
splitbill/
│
├── README.md                   # Introducción, quickstart, deploy
├── CLAUDE.md                   # Instrucciones para el asistente de IA (Claude)
├── index.html                  # HTML raíz — punto de entrada de Vite
├── package.json                # Dependencias y scripts npm
├── tsconfig.json               # Configuración TypeScript (app)
├── tsconfig.node.json          # Configuración TypeScript (herramientas Vite/Node)
├── vite.config.ts              # Configuración de Vite + plugin React + PWA
├── tailwind.config.js          # Configuración de Tailwind CSS
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
│   │   └── useBillSplit.ts     # Hook de cálculo del resumen de la cuenta
│   │                           #   Retorna: { subtotal, tax, tip, total, splits }
│   │                           #   Usado por Step5TaxTip (preview) y Step6Result (resultado final)
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
│       │   │                   #   - Botón "Escanear factura" (cámara trasera preferida)
│       │   │                   #   - Preview de foto + "Usar esta foto" / "Retomar"
│       │   │                   #   - Spinner durante OCR
│       │   │                   #   - Botón "Ingresar manualmente"
│       │   │                   #   - Toggle de tema oscuro ☀️/🌙
│       │   │
│       │   ├── Step2Review.tsx # Paso 2: revisar y editar ítems
│       │   │                   #   - Lista con nombre, cantidad, precio unitario y total
│       │   │                   #   - Edición en línea con ItemForm
│       │   │                   #   - Botón "+ Agregar ítem"
│       │   │                   #   - Subtotal en tiempo real
│       │   │                   #   - Validación: ≥1 ítem con precio > 0
│       │   │
│       │   ├── Step3People.tsx # Paso 3: agregar personas
│       │   │                   #   - Input nombre + botón "Agregar" (o Enter)
│       │   │                   #   - Chips con color único y botón X
│       │   │                   #   - Validación: mínimo 2 personas
│       │   │
│       │   ├── Step4Assign.tsx # Paso 4: asignar ítems a personas
│       │   │                   #   - Por ítem: chips con scroll horizontal para seleccionar
│       │   │                   #   - División equitativa si múltiples personas
│       │   │                   #   - Ítems sin asignar: borde rojo + advertencia
│       │   │                   #   - Contador "X de Y ítems asignados"
│       │   │                   #   - Validación: todos los ítems deben estar asignados
│       │   │
│       │   ├── Step5TaxTip.tsx # Paso 5: configurar IVA y propina
│       │   │                   #   - Toggle IVA incluido/no incluido
│       │   │                   #   - Slider + input numérico para % IVA (default 8%)
│       │   │                   #   - Toggle propina % vs monto fijo
│       │   │                   #   - Checkbox "Propina voluntaria" (Ley colombiana)
│       │   │                   #   - Preview del total en tiempo real con desglose
│       │   │
│       │   └── Step6Result.tsx # Paso 6: resultado final
│       │                       #   - Total de la cuenta (grande)
│       │                       #   - Card por persona: monto total + acordeón de ítems
│       │                       #   - Botón WhatsApp por persona
│       │                       #   - Botón "Compartir resultado" (Web Share API o clipboard)
│       │                       #   - Botón "Nueva cuenta" → RESET
│       │
│       └── ui/                 # Componentes reutilizables
│           │
│           ├── Stepper.tsx     # Barra de progreso de los 6 pasos
│           │                   #   Muestra paso actual y permite ver el progreso visual
│           │
│           ├── ItemForm.tsx    # Formulario para agregar/editar un ítem
│           │                   #   - Inputs: nombre (texto), cantidad (botones +/− + libre), precio
│           │                   #   - Usado dentro de Step2Review
│           │
│           ├── PersonChips.tsx # Chips de personas seleccionables
│           │                   #   Props: people, selected[], onToggle, scrollable
│           │                   #   - scrollable=true: overflow-x-auto (Step4)
│           │                   #   - scrollable=false: flex-wrap (Step3, Step6)
│           │                   #   - Color de fondo = person.color cuando está seleccionado
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
Los componentes de `ui/` son stateless y solo reciben props.

---

## Convenciones de código

| Convención | Detalle |
|-----------|---------|
| Moneda | Enteros en COP, sin decimales. `formatCOP()` para mostrar. |
| IDs | `crypto.randomUUID()` o `Date.now() + índice` para ítems escaneados |
| Colores | Paleta fija de 20 colores en `PERSON_COLORS` (bill.ts), asignados en orden circular |
| Tema | Clase `dark` en el div raíz controlada por `state.darkMode`; Tailwind modo `class` |
| Sin persistencia | Estado solo en memoria — se pierde al cerrar la app (diseño intencional) |
| Textos | Español colombiano en toda la UI |
