# Proposal: descuento / bono sobre la cuenta

## Intent

No hay forma de registrar un bono o descuento: hay que restarlo mentalmente o editar los
precios, lo que corrompe el subtotal y el IVA. `BillState` no tiene campo para ello.

## Scope

### In Scope
- Campo de descuento en monto fijo (COP) en el paso 5.
- Dos modos: **partes iguales** o **asignado** a personas específicas.
- Fila en "Resumen" (`Step5TaxTip.tsx:203-209`) y en las 4 salidas del paso 6.
- Tests test-first de `calculateDiscount` (strict TDD aplica aquí).

### Out of Scope
- Descuento en porcentaje y reparto proporcional al consumo.
- Reintroducir el redondeo por persona, eliminado a propósito en `60f566a`.

## Capabilities

### New Capabilities
- `bill-discount`: captura del descuento, su reparto y su efecto en los totales.

### Modified Capabilities
None (`openspec/specs/` está vacío; es la primera iteración).

## Approach

Tres campos en `BillState` espejando la propina: `discountAmount`,
`discountSplitMode: 'equal' | 'assigned'`, `discountAssignedTo: string[]`. Una función pura
`calculateDiscount(state)` devuelve el monto global y el de cada persona. Se resta
**después** de IVA y propina, con *clamp* a 0. Las **tres** copias del total cambian juntas.

## Affected Areas

| Área | Impacto | Descripción |
|---|---|---|
| `src/types/bill.ts` | Modified | 3 campos en `BillState`, 1 en `PersonSplit` |
| `src/context/BillContext.tsx` | Modified | `initialState` + 3 `SET_DISCOUNT_*` |
| `src/utils/calculations.ts` | Modified | `calculateDiscount` + total por persona |
| `src/hooks/useBillSplit.ts` | Modified | `discount` en `BillSummary` |
| `Step5TaxTip.tsx` | Modified | Sección UI + fila en "Resumen" |
| `Step6Result.tsx` | Modified | 4 salidas |

## Risks

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Olvidar una de las 3 copias del total | **Alta** | Regla en `rules.design`; test que las compare |
| Total individual negativo | Alta en `assigned` | *Clamp* a 0 + destino del remanente, en specs |
| `assigned` con lista vacía no aplica nada | Media | Bloquear "Continuar" o caer a `equal` |
| Que reduzca la base de la propina sin decidirlo | Media | Requisito en specs: **no** la reduce |

## Rollback Plan

`git revert`. Campos aditivos con default `0` / `'equal'` / `[]`; `RESET` ya devuelve
`{ ...initialState }`.

## Dependencies

Ninguna. `src/utils/` ya está cubierto por `vitest.config.ts`.

## Success Criteria

- [ ] $40.000 en `equal` con 4 personas: cada una resta $10.000.
- [ ] `assigned` a una persona: solo esa cambia.
- [ ] Ningún total queda negativo.
- [ ] El total del paso 5 coincide con el del paso 6.
- [ ] Tests de `calculateDiscount` escritos **antes** del código y pasando.
- [ ] `npm run typecheck` sale 0, sin `any`.
