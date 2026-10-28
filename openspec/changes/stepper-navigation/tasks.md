# Tasks: navegación hacia atrás desde el stepper

**Change:** `stepper-navigation` · `strict_tdd_applies: false` (sin funciones puras nuevas
bajo `src/utils/`; la verificación es manual según los escenarios del spec)

## 1. Contexto

- [x] 1.1 Añadir `goToStep` a la interfaz `BillContextValue` (`BillContext.tsx:141-147`)
- [x] 1.2 Implementar `goToStep` con la guarda `target >= 1 && target <= 6 && target < state.step`
- [x] 1.3 Exponerlo en el `value` del provider (`BillContext.tsx:171`)

## 2. Stepper

- [x] 2.1 Consumir `goToStep` y `useHaptic` en `Stepper.tsx`
- [x] 2.2 Convertir el círculo de `<div>` a `<button type="button">` con `disabled={!isDone}`
- [x] 2.3 Añadir `aria-label` por paso y `aria-current="step"` en el activo
- [x] 2.4 Anillo de foco visible con `--glow-purple-ring`
- [x] 2.5 `cursor-pointer` solo en los navegables; conservar el layout `flex-1`

## 3. Paso 1 sin foto

- [x] 3.1 Aviso en `Step1Entry.tsx` cuando `state.items.length > 0`
- [x] 3.2 Acción "Continuar" del aviso que llama `nextStep()` sin tocar `entryMode`

## 4. Verificación

- [x] 4.1 `npm run typecheck` → exit 0
- [x] 4.2 Escenarios R1 y R4 probados a mano en `npm run dev`
- [x] 4.3 Recorrido con Tab + Enter (escenario R2)
