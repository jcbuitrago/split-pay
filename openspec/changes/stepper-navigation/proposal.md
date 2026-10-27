# Proposal: navegación hacia atrás desde el stepper

## Intent

Quien detecta un error en la cuenta estando en el paso 5 solo puede volver pulsando
"← Atrás" repetidas veces. El stepper superior muestra el progreso pero no es interactivo
(`Stepper.tsx:50-66`: `<div>` sin `onClick`).

## Scope

### In Scope
- Círculos del stepper clicables **solo hacia atrás** (`stepNum < current`).
- `goToStep(step)` expuesto en `BillContext`, despachando el `SET_STEP` ya existente.
- Semántica accesible: `<button>` real, `aria-current="step"`, `aria-label`, `disabled`
  en los pasos no navegables, y `whileTap={{ scale: 0.9 }}` por consistencia con `PersonAvatar`.
- Haptic feedback vía el hook existente `useHaptic`.

### Out of Scope
- Saltar hacia adelante (se sigue haciendo con "Continuar").
- Centralizar las validaciones por paso hoy dispersas — es su propio change.
- Mostrar el stepper en el paso 6 (`App.tsx:28` lo oculta a propósito).

## Capabilities

### New Capabilities
- `step-navigation`: reglas de qué pasos son alcanzables y cómo se navega entre ellos.

### Modified Capabilities
None.

## Approach

`Stepper` consume `goToStep` del contexto. Cada círculo se envuelve en un `<button>` con
`disabled = stepNum >= current`. `goToStep` solo valida el rango 1-6 y delega en
`SET_STEP`: **ninguna lógica de negocio cambia**, porque un paso anterior ya fue válido
para haber llegado al actual.

## Affected Areas

| Área | Impacto | Descripción |
|---|---|---|
| `src/components/ui/Stepper.tsx` | Modified | `<div>` → `<button>` condicional + a11y |
| `src/context/BillContext.tsx` | Modified | `goToStep` en el value del provider |

## Risks

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Volver al paso 1 no muestra la foto: `SET_STEP` borra `originalImage` (`BillContext.tsx:48`, mitigación de seguridad) | Alta | No revertir el borrado. Definir en specs el texto que ve el usuario al volver al paso 1 |
| Regresión de accesibilidad al cambiar `div` por `button` | Media | `aria-current`, `aria-label` y `disabled` son requisito, no opcional |
| El botón rompe el layout `flex-1` | Baja | `appearance: none`, conservar las clases |

## Rollback Plan

`git revert` del commit. No hay migración de estado ni datos: `goToStep` es aditivo y
`SET_STEP` no se modifica.

## Dependencies

Ninguna. No requiere paquetes nuevos.

## Success Criteria

- [ ] Desde el paso 5, un toque en el círculo 2 lleva al paso 2 conservando ítems y personas.
- [ ] Los círculos de pasos futuros están `disabled` y no responden al toque.
- [ ] `npm run typecheck` sale 0.
- [ ] Navegación por teclado: Tab alcanza los círculos navegables; Enter/Espacio activan.
- [ ] Volver al paso 1 no rompe la app ni muestra una imagen fantasma.
