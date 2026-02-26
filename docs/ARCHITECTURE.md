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
Usuario toma foto
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
  ├── [Escanear]  → cámara/archivo → OCR → Step 2
  └── [Manual]   → Step 2 con lista vacía

Step 2: Revisar ítems
  └── Lista editable: nombre, cantidad, precio unitario
      Validación: ≥1 ítem, todos con precio > 0

Step 3: Personas
  └── Agregar personas con nombre y color único (paleta de 20)
      Validación: mínimo 2 personas

Step 4: Asignar ítems
  └── Para cada ítem: seleccionar quién lo consumió
      Chips con scroll horizontal, multi-selección
      Validación: todos los ítems asignados

Step 5: Impuesto y propina
  └── IVA: % configurable (default 8%), toggle incluido/aparte
      Propina: % sobre base pre-IVA o monto fijo
      Preview del total en tiempo real

Step 6: Resultado
  └── Total por persona con desglose
      Botón WhatsApp individual por persona
      Botón "Nueva cuenta" → RESET
```

---

## Estado global (BillContext)

El estado de toda la app vive en un único `useReducer` en `BillContext.tsx`.
Ningún componente tiene estado local relevante para el negocio — todo pasa
por el contexto.

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
├── darkMode: boolean
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
| `SET_DARK_MODE` | Toggle de tema |
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
        ├── Stepper          ← barra de progreso
        └── StepContent      ← switch por state.step
            ├── Step1Entry
            │   └── ErrorMessage (si OCR falla)
            ├── Step2Review
            │   └── ItemForm (agregar/editar ítem)
            ├── Step3People
            │   └── PersonChips
            ├── Step4Assign
            │   └── PersonChips (por ítem)
            ├── Step5TaxTip
            └── Step6Result
                └── PersonChips (desglose)
```

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
