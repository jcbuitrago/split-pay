# Proposal: cantidad real en el desglose por persona

## Intent

La fila de cada persona muestra la cantidad de la **línea completa** junto a un monto que
es solo su **fracción**: con 8 hamburguesas entre 4 personas dice `hamburguesa ×8 —
$40.000`, cuando ese monto son 2 unidades. El cálculo es correcto
(`calculations.ts:56`); engaña la etiqueta, porque `PersonSplit.items` guarda la
referencia al `BillItem` original sin cantidad propia.

## Scope

### In Scope
- Etiqueta honesta en las 3 salidas: acordeón (`Step6Result.tsx:131`), WhatsApp
  individual (`:29`) y compartir global (`:167`).
- Helper único y testeable en `src/utils/`.
- Corregir `{split.items.length} ítems` (`:68`), que cuenta líneas, no unidades.

### Out of Scope
- Asignación por unidad (`assignedTo: {personId, units}[]`).
- Cualquier cambio de montos. **El dinero no se toca.**
- El paso 4, que ya presenta el dato correctamente.

## Capabilities

### New Capabilities
- `result-breakdown`: presentación del consumo por persona en el resultado y en los
  textos compartibles.

### Modified Capabilities
None.

## Approach

Un helper puro recibe `item` y el número de asignados y devuelve la etiqueta. Regla a
fijar en specs: con un solo asignado, `×{quantity}` es exacto y se mantiene; con varios,
**no** se muestra cantidad per cápita fraccionaria, sino las unidades de la línea y entre
cuántos se reparten. `Step6Result` lo consume en los tres sitios. `calculations.ts` no cambia.

## Affected Areas

| Área | Impacto | Descripción |
|---|---|---|
| `src/utils/` | New | Helper de etiqueta + su test |
| `src/components/steps/Step6Result.tsx` | Modified | 3 etiquetas + contador de ítems |

## Risks

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Una cantidad fraccionaria (`×2,67 de 8`) empeora el bug | Alta sin decisión en specs | Prohibirla en el spec |
| Los textos de WhatsApp son contrato visible con el usuario final | Media | Un solo helper mantiene las 3 salidas consistentes |
| Romper un monto por accidente | Baja | El helper no recibe ni devuelve montos |

## Rollback Plan

`git revert`. El helper es aditivo y `Step6Result` solo cambia cadenas de texto.

## Dependencies

Ninguna. `src/utils/` ya está cubierto por el `include` de `vitest.config.ts`.

## Success Criteria

- [ ] 8 unidades entre 4: la fila ya no dice `×8` y el monto sigue siendo $40.000.
- [ ] 8 unidades a 1 persona: la fila dice `×8`, porque es exacto.
- [ ] Las 3 salidas usan la misma etiqueta.
- [ ] Test del helper pasa (`npm run test` sale 0 por primera vez).
- [ ] `npm run typecheck` sale 0 y ningún monto cambia.
