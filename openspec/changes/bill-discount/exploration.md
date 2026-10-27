# Exploration: descuento / bono sobre la cuenta

**Change:** `bill-discount` · **Modo:** `openspec` · **Fecha:** 2026-10-27

## Current State

`BillState` (`types/bill.ts:15-30`) no tiene ningún campo de descuento. El patrón análogo
ya probado es el trío de la propina —`tipType` / `tipPercent` / `tipAmount`— ramificado en
`calculateTip` (`calculations.ts:32-40`). Los setters escalares del reducer son `case` de
una línea (`BillContext.tsx:100-131`), así que `SET_DISCOUNT_*` es copia literal.
`RESET` hace `{ ...initialState }` (`:133-134`): un campo nuevo con default se limpia solo.
No hay persistencia (`localStorage`: 0 resultados) ni tests que romper.

**La fórmula del total está triplicada** y las tres copias deben quedar sincronizadas:

| Ubicación | Qué calcula |
|---|---|
| `useBillSplit.ts:19-21` | total global, **redondeado** con `roundToNearest100` |
| `calculations.ts:70-72` | total por persona, **sin redondear** |
| `Step5TaxTip.tsx:31` | preview en vivo del paso 5 |

El prorrateo por persona usa `proportion = personSubtotal / subtotal`
(`calculations.ts:66`); la propina se reparte con ese factor (`:68`).

## Arqueología de git — decisión que NO se debe revertir

`git log -S'roundToNearest100'` devuelve el commit **`60f566a`** (2026-04-06),
*"fix: remove per-person rounding and discard rounding disclosure"*:
> *Per-person totals now show exact amounts. Grand total rounding (nearest $100) is preserved.*

Es decir: **los totales por persona se dejaron a propósito sin redondear**, y el aviso de
discrepancia en Step6 se eliminó con ellos. El descuento por persona **tampoco debe
redondearse**.

⚠️ **`CLAUDE.md:341` está desactualizado**: afirma *"Total y totales por persona redondeados
al $100 más cercano"*. El commit `91ae17a` alineó `docs/ARCHITECTURE.md`, `docs/LOGIC_SPEC.md`
y `docs/UX_SPEC.md` con la realidad, pero **no tocó `CLAUDE.md`**. La fuente de verdad es
el código, no esa línea.

## Affected Areas

- `src/types/bill.ts` — Modified: 3 campos nuevos en `BillState`, 1 en `PersonSplit`
- `src/context/BillContext.tsx` — Modified: `initialState` + 3 acciones
- `src/utils/calculations.ts` — Modified: `calculateDiscount` + total por persona
- `src/hooks/useBillSplit.ts` — Modified: `discount` en `BillSummary` y en el total
- `src/components/steps/Step5TaxTip.tsx` — Modified: sección UI + fila en "Resumen"
- `src/components/steps/Step6Result.tsx` — Modified: 4 salidas (acordeón, header, 2 textos)

## Approaches

1. **Monto fijo con dos modos de reparto** (`equal` | `assigned`), espejando la propina.
   - Pros: reutiliza un patrón que el proyecto ya usa y el usuario ya entiende.
   - Cons: `assigned` exige UI nueva para elegir personas en el paso 5.
   - Effort: Medium

2. **Monto fijo sin configurar, siempre partes iguales.**
   - Pros: el cambio más pequeño posible.
   - Cons: no cumple el requisito explícito de que el reparto sea configurable.
   - Effort: Low

## Recommendation

Opción 1 con los dos modos elegidos: **partes iguales** y **asignado a personas
específicas**. Queda fuera el reparto proporcional al consumo.

## Risks / decisiones abiertas para `sdd-spec`

- **¿El descuento reduce la base de la propina?** Hoy la propina se calcula sobre el
  subtotal pre-IVA (`calculations.ts:36-39`). Recomendación: **no** — un bono no debería
  reducir lo que gana el mesero. Debe quedar escrito como requisito, no asumido.
- **Totales negativos.** Si el descuento supera el total, o en modo `assigned` supera la
  parte de esa persona, el total individual se iría a negativo. Hay que fijar un *clamp* a
  0 y decidir qué pasa con el remanente (¿se pierde o se redistribuye?).
- **La suma por persona no cuadrará con el total global**, porque el global se redondea
  (`useBillSplit.ts:19`) y los individuales no. Ya ocurre hoy con la propina y fue una
  decisión consciente (`60f566a`); el descuento la hace más visible. No reintroducir el
  redondeo por persona ni el aviso que se eliminó.
- **Modo `assigned` con la lista vacía**: el descuento quedaría sin aplicar. Debe
  bloquear "Continuar" o caer a `equal` de forma explícita.
- Triplicación del total: olvidar una de las tres copias produce un preview que no coincide
  con el resultado. `rules.design` de `openspec/config.yaml` ya lo marca.

## Ready for Proposal

Sí, con las cinco decisiones de arriba pendientes para `sdd-spec`.
