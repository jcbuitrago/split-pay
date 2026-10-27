# Exploration: navegación hacia atrás desde el stepper

**Change:** `stepper-navigation` · **Modo:** `openspec` · **Fecha:** 2026-10-27

## Current State

`src/components/ui/Stepper.tsx` es **puramente presentacional**: consume solo `state`
(línea 7), nunca `dispatch`. Los círculos son `<div>` (líneas 50-66), sin `onClick`,
`role`, `tabIndex` ni `aria-*`. Calcula tres estados visuales en las líneas 45-47
(`isDone`, `isActive`) y una barra de progreso `(current - 1) / (N - 1)` (línea 15).

Toda la navegación pasa por la acción `SET_STEP` (`BillContext.tsx:44-50`). No existen
acciones `NEXT_STEP`/`PREV_STEP`: `nextStep()`/`prevStep()` (`BillContext.tsx:154-164`)
son helpers del provider que despachan `SET_STEP` y solo validan el rango 1-6.
`App.tsx:28` monta el Stepper únicamente en los pasos 1-5.

Las validaciones de avance están **descentralizadas**, una por componente, y no son
consultables desde fuera:

| Paso | Condición | Ubicación |
|---|---|---|
| 2 Ítems | `items.length > 0 && items.every(i => i.price > 0)` | `Step2Review.tsx:224` |
| 3 Personas | `people.length >= 2` | `Step3People.tsx:41` |
| 4 Asignar | `assignedCount === items.length` | `Step4Assign.tsx:21-22` |
| 1 y 5 | ninguna | — |

## Affected Areas

- `src/components/ui/Stepper.tsx` — Modified: los círculos pasan a ser botones condicionales
- `src/context/BillContext.tsx` — Modified: añadir `goToStep(step)` al value del provider

## Approaches

1. **Solo hacia atrás** — habilitar el click únicamente cuando `stepNum < current`.
   - Pros: no requiere centralizar ninguna validación — un paso anterior **siempre** fue
     válido alguna vez para haber llegado al actual. Cero cambios en la lógica de negocio.
     Cubre el caso reportado ("voy en la 5 y la cuenta está mal").
   - Cons: no permite saltar hacia adelante tras corregir; hay que volver con "Continuar".
   - Effort: Low

2. **Libre en ambos sentidos** — cualquier paso ya alcanzado.
   - Pros: más rápido para el usuario.
   - Cons: obliga a extraer las 4 condiciones a un `canLeaveStep(state, step)` compartido y
     a añadir al estado un "paso máximo alcanzado" que hoy no existe. Toca 4 componentes.
   - Effort: Medium

## Recommendation

Opción 1. El valor para el usuario está en poder **volver**; avanzar ya funciona con
"Continuar". La opción 2 introduce estado nuevo y refactor de 4 componentes para un
beneficio marginal, y el refactor de validaciones merece ser su propio change.

## Risks

- **`SET_STEP` borra `originalImage`** cuando `action.step > 1` (`BillContext.tsx:48`,
  es una mitigación de seguridad deliberada). Al volver al paso 1 **no habrá preview de
  la foto**: el usuario verá la zona de drag & drop vacía. Hay que decidir si eso es
  aceptable o si el paso 1 debe mostrar un aviso. No se debe revertir ese borrado.
- Accesibilidad: hoy los círculos no son focusables. Convertirlos en `<button>` exige
  `aria-label`, `aria-current="step"` y un `disabled` real en los no navegables.
- `Stepper.tsx` usa `--color-purple` y `--color-muted-surface`, variables que **no están
  en la tabla de paleta de `CLAUDE.md`**. Hay que leer `src/theme.css`, no la tabla.

## Ready for Proposal

Sí.
