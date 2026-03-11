# LOGIC_SPEC — Lógica de cálculo y división de cuentas

Documento de referencia que describe **exactamente** cómo SplitBill calcula
impuestos, propinas y la división por persona. No describe UI ni animaciones.

Archivos fuente relevantes:
- [`src/types/bill.ts`](../src/types/bill.ts) — interfaces y constantes
- [`src/utils/calculations.ts`](../src/utils/calculations.ts) — funciones puras de cálculo
- [`src/utils/formatCurrency.ts`](../src/utils/formatCurrency.ts) — formato de moneda
- [`src/hooks/useBillSplit.ts`](../src/hooks/useBillSplit.ts) — hook que expone el resumen al UI
- [`src/hooks/useBillScanner.ts`](../src/hooks/useBillScanner.ts) — preprocesado de imagen y llamada al Worker
- [`src/context/BillContext.tsx`](../src/context/BillContext.tsx) — estado global (useReducer)
- [`worker/index.js`](../worker/index.js) — OCR proxy en Cloudflare Worker

---

## 1. Tipos de datos

### `BillItem`
```ts
interface BillItem {
  id: string;
  name: string;
  price: number;        // Precio UNITARIO en COP, sin decimales
  quantity: number;     // Unidades (entero ≥ 1)
  assignedTo: string[]; // IDs de personas que comparten este ítem
}
```
El **costo total** de un ítem es `price × quantity`.

### `Person`
```ts
interface Person {
  id: string;
  name: string;
  color: string; // Color hex tomado de PERSON_COLORS (paleta de 20)
}
```
La asignación de colores usa `PERSON_COLORS[personas.length % 20]`, por lo
que los colores se reciclan cuando hay más de 20 personas.

### `BillState` — valores por defecto
| Campo | Default | Descripción |
|---|---|---|
| `step` | `1` | Paso activo (1–6) |
| `taxPercent` | `8` | IVA en % (típico restaurantes Colombia) |
| `taxIncluded` | `true` | IVA ya incluido en los precios del menú |
| `tipPercent` | `10` | Propina porcentual |
| `tipAmount` | `0` | Propina en monto fijo (COP) |
| `tipType` | `'percent'` | Modo de propina activo |
| `tipIsVoluntary` | `true` | Muestra aviso legal colombiano |
| `entryMode` | `'manual'` | `'scan'` cuando se usa cámara |

### `PersonSplit` — resultado por persona
```ts
interface PersonSplit {
  person: Person;
  subtotal: number; // Suma de ítems asignados a esta persona (sin IVA adicional ni propina)
  tax: number;      // IVA de esta persona (solo informativo si taxIncluded=true)
  tip: number;      // Propina proporcional de esta persona
  total: number;    // Monto final a pagar (redondeado al $100 más cercano)
  items: { item: BillItem; share: number }[]; // Detalle de ítems y el monto que le toca
}
```

---

## 2. Funciones de cálculo (`calculations.ts`)

### 2.1 `calculateSubtotal(items)`
```
subtotal = Σ (item.price × item.quantity)   para todos los ítems
```
Suma el costo total de **todos** los ítems, independientemente de si están
asignados o no. Los ítems sin asignar entran en el subtotal global pero no
se reparten a ninguna persona.

### 2.2 `calculateTax(subtotal, taxPercent, taxIncluded)`

**Caso `taxIncluded = true`** — El IVA ya está dentro de los precios del menú.
Se extrae para informar, pero **no se suma al total**.
```
tax = subtotal × taxPercent / (100 + taxPercent)
```
Ejemplo: subtotal $100.000, IVA 8%
```
tax = 100.000 × 8 / 108 = $7.407  (solo informativo)
```

**Caso `taxIncluded = false`** — Los precios son base sin IVA.
El IVA calculado **se suma al total final**.
```
tax = subtotal × taxPercent / 100
```
Ejemplo: subtotal $100.000, IVA 8%
```
tax = 100.000 × 0.08 = $8.000  (se agrega al total)
```

### 2.3 `calculateTip(subtotal, state)`

La propina **siempre** se calcula sobre el precio **sin IVA** (base pre-IVA).

**Propina fija (`tipType = 'fixed'`)**
```
tip = state.tipAmount   (sin redondeo)
```

**Propina porcentual (`tipType = 'percent'`)**
```
// Extraer base pre-IVA según el modo
preTaxBase = taxIncluded
  ? subtotal / (1 + taxPercent / 100)   // quitar el IVA incluido
  : subtotal                             // ya es base sin IVA

tip = ceil(preTaxBase × tipPercent / 100, 100)   // redondear al $100 superior
```
Ejemplo: subtotal $108.000 con IVA incluido al 8%, propina 10%
```
preTaxBase = 108.000 / 1.08 = $100.000
tip = ceil(100.000 × 0.10 / 100 × 100) = ceil($10.000) = $10.000
```

Función auxiliar de redondeo:
- `roundUpTo100(x)` → `Math.ceil(x / 100) × 100` (siempre hacia arriba, privada)
- `roundToNearest100(x)` → `Math.round(x / 100) × 100` (exportada, para totales)

### 2.4 `calculateSplit(state)` → `PersonSplit[]`

Esta es la función central que produce el desglose por persona.

**Paso 1 — Subtotales globales**
```
subtotal = calculateSubtotal(state.items)
tip      = calculateTip(subtotal, state)
```

**Paso 2 — Repartir ítems entre personas**

Por cada ítem con al menos una persona asignada:
```
sharePerPerson = (item.price × item.quantity) / item.assignedTo.length
```
Cada persona en `assignedTo` acumula `sharePerPerson` en su subtotal.
Si un ítem está asignado a múltiples personas, la división es **equitativa**
(partes iguales, sin ajuste de centavos).

**Paso 3 — Calcular totales por persona**
```
proportion    = personSubtotal / subtotal   // si subtotal = 0, proportion = 0
personTax     = calculateTax(personSubtotal, taxPercent, taxIncluded)
personTip     = tip × proportion            // propina proporcional al consumo

// IVA ya incluido en precios
personTotal (taxIncluded=true)  = roundToNearest100(personSubtotal + personTip)

// IVA se suma aparte
personTotal (taxIncluded=false) = roundToNearest100(personSubtotal + personTax + personTip)
```

**Nota sobre redondeo:** `roundToNearest100` puede hacer que la suma de todos
los totales individuales difiera hasta ±$100 del total global por persona de
redondeo. Esto es aceptado como comportamiento correcto.

---

## 3. Total global (`useBillSplit`)

El hook `useBillSplit` centraliza los cálculos y los expone al UI:

```ts
subtotal = calculateSubtotal(items)
tax      = calculateTax(subtotal, taxPercent, taxIncluded)
tip      = calculateTip(subtotal, state)

total = roundToNearest100(
  taxIncluded
    ? subtotal + tip           // IVA ya dentro del subtotal
    : subtotal + tax + tip     // IVA se agrega encima
)

splits = calculateSplit(state)  // array de PersonSplit
```

La fórmula del total global usa **exactamente la misma lógica** que los
totales por persona, garantizando coherencia entre el header de Step6 y
las cards individuales.

---

## 4. Formato de moneda (`formatCurrency.ts`)

```ts
function formatCOP(amount: number): string {
  const rounded = Math.round(amount);
  return '$' + rounded.toLocaleString('es-CO').replace(/,/g, '.');
}
```

- Redondea al entero más cercano antes de formatear.
- Usa el locale `es-CO` que produce `1.500` con puntos de miles.
- El `.replace(/,/g, '.')` es una salvaguarda por si algún entorno usa
  comas como separador de miles en `es-CO`.
- Resultado: `1500` → `$1.500`, `23000` → `$23.000`.

---

## 5. Estado global (`BillContext.tsx`)

### Patrón
`useReducer` con un `BillState` inmutable. Todos los componentes leen el
estado a través de `useBill()` y lo modifican despachando acciones.

### Acciones disponibles
| Acción | Efecto |
|---|---|
| `SET_STEP` | Cambia de paso; borra `originalImage` si se avanza más allá del Step 1 |
| `ADD_ITEM` | Agrega un ítem al array |
| `UPDATE_ITEM` | Reemplaza un ítem por `id` |
| `REMOVE_ITEM` | Elimina un ítem por `id` |
| `SET_ITEMS` | Reemplaza todo el array de ítems (usado por OCR) |
| `ADD_PERSON` | Agrega una persona |
| `REMOVE_PERSON` | Elimina persona **y** la desasigna de todos los ítems |
| `ASSIGN_PERSON` | Agrega `personId` a `item.assignedTo` (sin duplicados) |
| `UNASSIGN_PERSON` | Quita `personId` de `item.assignedTo` |
| `SET_TAX_PERCENT` | Actualiza `taxPercent` |
| `SET_TAX_INCLUDED` | Cambia modo IVA incluido/excluido |
| `SET_TIP_PERCENT` | Actualiza `tipPercent` |
| `SET_TIP_AMOUNT` | Actualiza `tipAmount` (propina fija) |
| `SET_TIP_TYPE` | Cambia entre `'percent'` y `'fixed'` |
| `SET_TIP_VOLUNTARY` | Activa/desactiva aviso legal |
| `SET_ENTRY_MODE` | `'scan'` o `'manual'` |
| `SET_ORIGINAL_IMAGE` | Guarda base64 de la imagen capturada |
| `SET_LOADING` | Activa/desactiva estado de carga (OCR) |
| `SET_ERROR` | Establece o borra mensaje de error |
| `RESET` | Restaura `initialState` completo |

### Lógica de seguridad de imagen
En `SET_STEP`: si el nuevo step es > 1, `originalImage` se fija a `undefined`.
Esto libera la memoria del base64 de la imagen en cuanto el usuario avanza.

### Helpers del contexto
- `nextStep()` — incrementa step (máx 6)
- `prevStep()` — decrementa step (mín 1)
- `nextPersonColor()` — devuelve `PERSON_COLORS[people.length % 20]`

---

## 6. Pipeline de OCR (`useBillScanner.ts` + `worker/index.js`)

### 6.1 Preprocesado de imagen (frontend)

`fileToBase64(file)` en `useBillScanner.ts`:

1. Crea un `<img>` temporal para leer las dimensiones reales.
2. Si `width > 1200` o `height > 1200`, redimensiona manteniendo proporción:
   ```
   si width > height:
     height = round(height × 1200 / width)
     width  = 1200
   si no:
     width  = round(width × 1200 / height)
     height = 1200
   ```
3. Dibuja en un `<canvas>` con las nuevas dimensiones.
4. Exporta como JPEG con calidad `0.82`.
5. Devuelve `{ base64, mediaType: 'image/jpeg' }`.

### 6.2 Llamada al Worker

`scanBill(imageBase64, mediaType)` hace `POST /scan` al Worker con:
```json
{ "image": "<base64>", "mediaType": "image/jpeg" }
```

Si la respuesta es ok, mapea los ítems crudos a `BillItem[]`:
```ts
items = data.items.map((raw, idx) => ({
  id: `scanned-${Date.now()}-${idx}`,
  name: raw.name,
  price: Math.round(raw.price),   // redondea al entero
  quantity: raw.quantity || 1,
  assignedTo: [],
}))
```

### 6.3 Cloudflare Worker — flujo completo

```
Request POST /scan
  │
  ├─ CORS: valida Origin contra ALLOWED_ORIGIN (lista separada por comas)
  │        responde con el origen de la whitelist, NUNCA refleja el Origin recibido
  │
  ├─ Rate limit: 20 req/hora por IP (Map en memoria, se resetea con AbortController)
  │
  ├─ Validación de body:
  │    • image requerida (string)
  │    • image.length ≤ 8 MB base64 (~6 MB comprimida) → 413 si excede
  │    • mediaType normalizado a lista permitida [jpeg, png, gif, webp]
  │
  ├─ Llamada a Anthropic claude-haiku-4-5 con:
  │    • max_tokens: 1024
  │    • Timeout: 25 segundos (AbortController) → 504 si se agota
  │    • Prompt: extrae ítems, responde JSON puro
  │
  ├─ Parseo de la respuesta:
  │    • Extrae bloque JSON con regex (non-greedy primero, greedy como fallback)
  │    • Si no se puede parsear → 422
  │    • Si items vacío → 422
  │
  └─ Sanitización de ítems:
       • name: string, trim, máx 200 chars, default 'Ítem'
       • price: número finito ≥ 0, Math.round, default 0; ítems con price=0 se descartan
       • quantity: número ≥ 1, Math.round, máximo 99, default 1
       → 200 { items, currency }
```

---

## 7. Restricciones de validación en el UI

| Paso | Validación para continuar |
|---|---|
| Step 2 | Al menos 1 ítem; todos los ítems con `price > 0` |
| Step 3 | Al menos 2 personas |
| Step 4 | Todos los ítems tienen `assignedTo.length ≥ 1` |
| Step 5 | Ninguna (siempre puede continuar) |

La validación de `taxPercent` y `tipPercent` se aplica en los inputs:
`Math.min(100, Math.max(0, value))` — rango 0–100%.
El slider de `taxPercent` tiene máximo 30 (visual), pero el input permite hasta 100.

---

## 8. Resumen de fórmulas

```
subtotal       = Σ (price_i × qty_i)

tax (incluido) = subtotal × T / (100 + T)           // solo informativo
tax (excluido) = subtotal × T / 100                 // se suma al total

preTaxBase     = taxIncluded ? subtotal/(1+T/100) : subtotal
tip (%)        = ⌈ preTaxBase × tipPercent/100 ⌉₁₀₀  // redondeo al $100 superior
tip (fijo)     = tipAmount

total (incl.)  = round₁₀₀(subtotal + tip)
total (excl.)  = round₁₀₀(subtotal + tax + tip)

── Por persona ──
sharePerPerson = (price_i × qty_i) / |assignedTo_i|
personSubtotal = Σ sharePerPerson   (ítems asignados a esta persona)
proportion     = personSubtotal / subtotal
personTip      = tip × proportion
personTotal    = round₁₀₀(personSubtotal + personTip)          // si taxIncluded
personTotal    = round₁₀₀(personSubtotal + personTax + personTip) // si !taxIncluded

donde T = taxPercent, round₁₀₀ = Math.round(x/100)×100
```
