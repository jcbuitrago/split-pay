# Arquitectura de SplitBill

## Visión general del sistema

```
┌─────────────────────────────────┐        ┌──────────────────────────────┐
│         USUARIO                 │        │    SERVICIOS EXTERNOS        │
│  Navegador / PWA instalada      │        │                              │
│  (móvil o desktop)              │        │  ┌────────────────────────┐  │
└──────────────┬──────────────────┘        │  │  Anthropic API         │  │
               │                           │  │  claude-haiku-4-5      │  │
               │  HTTP (fetch)             │  │  Vision (OCR)          │  │
               ▼                           │  └────────────┬───────────┘  │
┌──────────────────────────────────┐        │               ▲              │
│      FRONTEND                    │        │               │ x-api-key    │
│      React + Vite + TypeScript   │        │               │ (secreto)    │
│      Vercel                      │        │  ┌────────────┴───────────┐  │
│                                  │──POST──▶  │  Cloudflare Worker     │  │
│  • Nunca tiene la API key        │  /scan  │  │  worker/index.js       │  │
│  • 100% offline (sin escaneo)    │◀────────│  │  Rate limit, CORS,     │  │
│                                  │         │  │  validación, timeout   │  │
└──────────────────────────────────┘        │  └────────────────────────┘  │
                                            └──────────────────────────────┘
```

### Por qué este diseño

El frontend nunca puede tener la API key de Anthropic porque cualquiera podría
inspeccionarla en el código fuente del navegador. El Worker actúa como proxy
seguro: recibe la imagen del usuario, la reenvía a Anthropic con la key guardada
como secreto de Cloudflare, y devuelve solo los ítems ya validados.

---

## Flujo de datos: escaneo de factura

```
Usuario toca la zona de carga (dropzone) o arrastra una imagen
      │
      ▼
fileToBase64()          ← Redimensiona a máx. 1200px, comprime a JPEG 0.82
      │ base64 + mediaType
      ▼
scanBill()              ← useBillScanner.ts
      │ POST { image, mediaType }
      ▼
Cloudflare Worker
  ├── Valida origen (whitelist CORS)
  ├── Rate limit por IP (Map en memoria, 20 req/hora)
  ├── Valida tamaño (máx. 8MB base64)
  ├── Llama a Anthropic Vision con timeout 25s
  ├── Parsea JSON de la respuesta del modelo
  ├── Sanitiza ítems (name ≤200 chars, price ≥0, quantity 1-99)
  └── Retorna { items, currency }
      │
      ▼
SET_ITEMS en BillContext → avanza a Step 2
```

---

## Flujo de la aplicación (6 pasos)

```
Step 1: Entrada
  ├── [Zona dropzone/cámara]  → toca o arrastra → OCR → Step 2
  └── [Ingresar manualmente]  → Step 2 con lista vacía

Step 2: Revisar ítems
  └── Lista editable con ItemCard (inline expand para editar)
      Validación: ≥1 ítem, todos con precio > 0

Step 3: Personas
  └── Agregar personas con nombre; cards en grid 2 col con avatar DiceBear
      Validación: mínimo 2 personas

Step 4: Asignar ítems
  └── Para cada ítem: seleccionar quién lo consumió
      Avatares circulares con scroll horizontal, multi-selección
      Validación: todos los ítems asignados

Step 5: Impuesto y propina
  └── IVA: % configurable (default 8%), toggle incluido/aparte
      Propina: % sobre base pre-IVA o monto fijo
      Preview del total en tiempo real

Step 6: Resultado
  └── Total por persona con desglose en acordeón
      Botón WhatsApp individual por persona
      Toggle pagado/no pagado por persona (📋 → ✓ verde)
      Botón "← Atrás" + Botón "🔄 Nueva cuenta" → RESET
```

---

## Estado global (BillContext)

El estado de toda la app vive en un único `useReducer` en `BillContext.tsx`.
La mayoría de componentes de pasos tienen estado local mínimo (UI efímera como
`editing`, `paid`); toda la lógica de negocio pasa por el contexto.

```
BillState
├── step: 1 | 2 | 3 | 4 | 5 | 6
│
├── items: BillItem[]
│   ├── id: string (uuid generado en el cliente)
│   ├── name: string
│   ├── price: number  (COP, sin decimales)
│   ├── quantity: number
│   └── assignedTo: string[]  (IDs de personas)
│
├── people: Person[]
│   ├── id: string
│   ├── name: string
│   └── color: string  (hex de PERSON_COLORS)
│
├── taxPercent: number      (default 8)
├── taxIncluded: boolean    (default true)
├── tipPercent: number      (default 10)
├── tipAmount: number       (default 0)
├── tipType: 'percent' | 'fixed'
├── tipIsVoluntary: boolean (default true)
├── entryMode: 'scan' | 'manual'
├── originalImage?: string  (liberado al salir de Step 1)
├── isLoading: boolean
└── error?: string
```

### Acciones del reducer

| Acción | Efecto |
|--------|--------|
| `SET_STEP` | Cambia de paso; libera `originalImage` si paso > 1 |
| `ADD_ITEM` / `UPDATE_ITEM` / `REMOVE_ITEM` / `SET_ITEMS` | CRUD de ítems |
| `ADD_PERSON` / `REMOVE_PERSON` | CRUD de personas; `REMOVE_PERSON` limpia asignaciones |
| `ASSIGN_PERSON` / `UNASSIGN_PERSON` | Asignación ítem ↔ persona |
| `SET_TAX_*` / `SET_TIP_*` | Configuración de IVA y propina |
| `SET_LOADING` / `SET_ERROR` | Estado de carga y errores |
| `RESET` | Vuelve al estado inicial (nueva cuenta) |

---

## Lógica de cálculo (`calculations.ts`)

```
subtotal = Σ (item.price × item.quantity)

IVA (taxIncluded = true):
  tax = subtotal × taxPercent / (100 + taxPercent)   ← extrae IVA del precio, solo informativo
  total = subtotal + tip

IVA (taxIncluded = false):
  tax = subtotal × taxPercent / 100                  ← IVA a sumar
  total = subtotal + tax + tip

Propina (tipType = 'percent'):
  base_preIVA = taxIncluded ? subtotal / (1 + taxPercent/100) : subtotal
  tip = ceil(base_preIVA × tipPercent / 100 / 100) × 100   ← redondea al $100 superior

Propina (tipType = 'fixed'):
  tip = tipAmount

Total final: roundToNearest100(total)   ← redondea al $100 más cercano

Por persona:
  proportion = personSubtotal / subtotal
  personTip = tip × proportion
  personTotal = roundToNearest100(personSubtotal + personTax + personTip)
```

---

## Árbol de componentes

```
main.tsx
└── BillProvider (context)
    └── App
        ├── Stepper          ← barra de progreso (oculta en Step 6)
        └── StepContent      ← switch por state.step
            ├── Step1Entry
            │   └── ErrorMessage (si OCR falla)
            ├── Step2Review
            │   ├── ItemCard (con edición inline AnimatePresence)
            │   └── ItemForm (agregar nuevo ítem)
            ├── Step3People
            │   └── PersonAvatar (grid 2 columnas)
            ├── Step4Assign
            │   └── PersonAvatar via PersonChips (scroll horizontal)
            ├── Step5TaxTip
            └── Step6Result
                └── PersonCard (acordeón + WhatsApp + toggle pagado)
            │
            └── StepFooter   ← footer compartido Atrás / Continuar
```

---

## Sistema de diseño

### Modo oscuro permanente
La app siempre está en modo oscuro: `class="dark"` está fijo en `<html>` (index.html).
No hay toggle de tema. Todos los colores provienen de variables CSS en `src/theme.css`.

### Paleta de colores (`src/theme.css`)

`theme.css` es la **única fuente de verdad** para colores. Los componentes usan
`style={{ color: 'var(--color-gold)' }}` — nunca hex hardcodeados.

| Variable CSS | Hex | Uso |
|---|---|---|
| `--color-bg` | `#1a1f2e` | Fondo principal |
| `--color-surface` | `#252d3d` | Cards y superficies grandes |
| `--color-darkest` | `#141822` | Stepper, footer, elementos más oscuros |
| `--color-purple` | `#5b5bd6` | Acento primario — botones, avatares asignados, progreso |
| `--color-gold` | `#f5c542` | Acento dorado — totales, valores destacados |
| `--color-rose` | `#f07070` | Acento rosa — advertencias, Step1 |
| `--color-muted` | `#8892a4` | Texto secundario / placeholder |
| `--color-muted-surface` | `#2d3548` | Track del stepper, bordes sutiles |

Cada variable hex tiene su par RGB (e.g. `--color-purple-rgb: 91 91 214`) para
habilitar los modificadores de opacidad de Tailwind (`bg-brand-purple/20`).

### Tipografía
- **Títulos**: Playfair Display (`font-display`) — cargada desde Google Fonts
- **Cuerpo**: DM Sans (`font-body`) — cargada desde Google Fonts

### Avatares (`PersonAvatar.tsx`)
- Librería: `@dicebear/core` + `@dicebear/collection` — generación 100% local
- Estilo: `funEmoji`, seed = nombre de la persona (mismo nombre → mismo emoji)
- Tamaños: `sm` = 32px (chips en Step4, barra sticky), `md` = 48px (cards en Step6)
- Estado **no asignado**: borde `--color-muted-surface` sutil
- Estado **asignado**: borde `--color-purple` + `boxShadow: var(--glow-purple)` + badge ✓

---

## Seguridad

### Medidas implementadas

| Capa | Medida |
|------|--------|
| Worker CORS | `Access-Control-Allow-Origin` se obtiene de la whitelist, nunca se refleja el `Origin` del request |
| Worker imagen | Rechaza base64 > 8MB con HTTP 413 |
| Worker timeout | AbortController de 25s hacia Anthropic; responde 504 si se agota |
| Worker OCR | Sanitiza cada ítem: name ≤ 200 chars, price ≥ 0 y redondeado, quantity entre 1 y 99 |
| Worker errores | No expone detalles internos de Anthropic al cliente |
| Frontend estado | `originalImage` (foto base64) se borra del estado al salir del Step 1 |
| Imagen | Se redimensiona a máx. 1200px y comprime antes de enviarse |

### Vulnerabilidades pendientes

| Severidad | Archivo | Descripción |
|-----------|---------|-------------|
| ALTA | `worker/index.js` | Rate limiting en `Map` de memoria — no persiste entre instancias del Worker. Migrar a Cloudflare KV o Durable Objects. |
| MEDIA | `vercel.json` | Faltan cabeceras HTTP de seguridad: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`. |
| MEDIA | `worker/index.js` | Sin límite de tamaño en la respuesta JSON de Anthropic (`anthropicResponse.json()`). |

---

## PWA y offline

El frontend funciona completamente offline salvo el paso de escaneo OCR.
Workbox (vía `vite-plugin-pwa`) cachea todos los assets estáticos en el
Service Worker. La configuración del manifest define orientación portrait,
display standalone y un icono SVG universal (`public/icons/icon.svg`).
