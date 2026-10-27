# Exploration: cantidad engañosa en el desglose por persona

**Change:** `per-person-quantity-display` · **Modo:** `openspec` · **Fecha:** 2026-10-27

## Current State

El dinero está bien; la presentación no. `calculateSplit` guarda en `personItems` la
**referencia al `BillItem` original** junto al monto ya dividido
(`calculations.ts:60`: `arr.push({ item, share: sharePerPerson })`), donde
`sharePerPerson = (item.price * item.quantity) / item.assignedTo.length`
(`calculations.ts:56`). El tipo `PersonSplit.items` es
`{ item: BillItem; share: number }[]` (`types/bill.ts:38`): **no lleva ninguna cantidad
propia de la persona**.

La vista renderiza entonces `item.quantity` crudo —la cantidad de la línea completa—
pegado a un monto que es solo una fracción. Tres lugares, el mismo patrón:

| Ubicación | Código |
|---|---|
| `Step6Result.tsx:131` | `{item.name} ×{item.quantity}` (acordeón) |
| `Step6Result.tsx:29` | `` `  • ${item.name} ×${item.quantity}: ${formatCOP(share)}` `` (WhatsApp individual) |
| `Step6Result.tsx:167` | mismo patrón en `buildShareText()` (compartir global) |

Un cuarto síntoma: `Step6Result.tsx:68` muestra `{split.items.length} ítems`, que cuenta
**líneas**, no unidades.

Contraste útil: `Step4Assign.tsx:68-72` ya presenta el dato de forma honesta —
`{item.quantity} × {price}` por un lado y el valor `c/u` por otro.

## Affected Areas

- `src/components/steps/Step6Result.tsx` — Modified: las 3 construcciones de etiqueta
- `src/utils/calculations.ts` — Sin cambios de cálculo; posible campo derivado adicional
- `src/types/bill.ts` — Posible ampliación de `PersonSplit['items']` (aditiva)

## Approaches

1. **Solo presentación** — derivar la etiqueta en la vista a partir de
   `item.quantity` y `item.assignedTo.length`, sin tocar modelo ni cálculo.
   - Pros: riesgo cero sobre el dinero; un solo archivo; reversible con un `git revert`.
   - Cons: la lógica de etiqueta queda repetida en 3 sitios si no se extrae un helper.
   - Effort: Low

2. **Asignación por unidad** — `assignedTo: string[]` → `{ personId, units }[]`.
   - Pros: resuelve el problema de raíz; permite "Juan se comió 3 de las 8".
   - Cons: **cambia el dinero**, no solo la vista. Arrastra `ASSIGN_PERSON`/
     `UNASSIGN_PERSON` (`BillContext.tsx:80-98`), `Step4Assign` completo y
     `calculations.ts:56`. Es una feature nueva disfrazada de bugfix.
   - Effort: High

## Recommendation

Opción 1. El usuario fue explícito: *"el cálculo de dinero está bien, la forma en la que se
muestran los consumos de cada persona no"*. La opción 2 es un cambio de producto y merece su
propio change si alguna vez se pide.

## Risks

- **`quantity / assignedTo.length` casi nunca es entero.** Con 8 unidades entre 3 personas
  da 2,67. Mostrar `×2,67 de 8` es peor que el bug actual: inventa una precisión falsa.
  La etiqueta **no debe** mostrar una cantidad per cápita fraccionaria. Propuesta a cerrar
  en specs: mostrar las unidades de la línea y entre cuántos se reparte
  (`8 uds · compartido entre 3`), y cuando `assignedTo.length === 1` mostrar `×8` tal cual,
  porque ahí sí es exacto.
- Los textos de WhatsApp son contrato visible con el usuario final: cambiar el formato
  cambia lo que la gente pega en sus chats. Las 3 salidas deben quedar consistentes.
- Duplicación: si la etiqueta se construye inline 3 veces, el próximo cambio se desincroniza.
  Extraer un helper (p. ej. en `src/utils/`) lo evita y es testeable bajo strict TDD.

## Ready for Proposal

Sí, con la decisión del formato de etiqueta pendiente para `sdd-spec`.
