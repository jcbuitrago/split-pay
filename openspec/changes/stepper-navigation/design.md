# Design: navegación hacia atrás desde el stepper

**Change:** `stepper-navigation` · 2026-10-27

## Decisión de arquitectura

`goToStep(step)` vive en el **provider**, junto a `nextStep`/`prevStep`
(`BillContext.tsx:154-164`), no en el componente. Razón: el Stepper queda sin lógica de
negocio y cualquier otro componente futuro puede navegar sin duplicar la guarda.

Rechazado: que el Stepper despache `SET_STEP` directamente. Funcionaría, pero deja la
regla de "solo hacia atrás" en la capa de presentación, donde nadie la encuentra.

## Guarda: dónde vive la regla "solo hacia atrás"

En **dos niveles, con responsabilidades distintas**:

| Nivel | Qué valida | Por qué ahí |
|---|---|---|
| `goToStep` en el provider | rango 1-6 y `target < state.step` | invariante del dominio: nadie puede saltar adelante por esta vía |
| `disabled` en el botón | `stepNum >= current` | affordance: el usuario y la tecnología asistiva ven qué es alcanzable |

No es redundancia defensiva inútil: el `disabled` es UI, la guarda es contrato. Si un día
el stepper se renderiza en otro contexto, la regla sigue aplicando.

## Flujo

```
Usuario toca círculo 2 (estando en paso 5)
        │
        ├─ <button disabled={2 >= 5}> → false, el botón está habilitado
        │
        ▼
   onClick → haptic() → goToStep(2)
        │
        ├─ guarda: 2 >= 1 && 2 <= 6 && 2 < 5  → pasa
        │
        ▼
   dispatch({ type: 'SET_STEP', step: 2 })
        │
        ▼
   billReducer: step = 2, originalImage = undefined (2 > 1)
        │
        ▼
   App.tsx re-renderiza <Step2Review /> — items y people intactos
```

## Cambios por archivo

### `src/context/BillContext.tsx`
- Añadir `goToStep: (step: BillState['step']) => void` a `BillContextValue`.
- Implementar con la guarda de la tabla anterior y pasarlo al `value` del provider.
- `SET_STEP`, `nextStep` y `prevStep` **no se tocan**.

### `src/components/ui/Stepper.tsx`
- Consumir `goToStep` del contexto y el hook `useHaptic`.
- El `<div>` del círculo (líneas 51-66) pasa a `<button type="button">` con:
  `disabled={!isDone}`, `aria-label={'Paso N: Etiqueta'}`,
  `aria-current={isActive ? 'step' : undefined}`, y `onClick` que hace haptic + `goToStep`.
- El contenedor `flex-1` (línea 50) sigue siendo un `<div>`: el botón es solo el círculo,
  para que el área táctil no incluya la etiqueta y no cambie el layout.
- Foco visible en `onFocus`/`onBlur` sobre `boxShadow`, con estado local `focusedStep`.
  No se usa `focus-visible:` de Tailwind porque el `boxShadow` ya se calcula en el inline
  style del glow activo y mezclar las dos fuentes lo sobrescribiría.
- **Anillo de foco:** `--color-white` con un gap de 2px de `--color-darkest`.
  `--glow-purple-ring` se probó primero y se descartó: es morado al 25 % y resulta
  invisible sobre un círculo morado (verificado en el navegador, no deducido).

### `src/components/steps/Step1Entry.tsx`
- Aviso cuando `state.items.length > 0` (R4.2): el usuario llegó aquí volviendo.
- Botón del aviso llama a `nextStep()` **sin** despachar `SET_ENTRY_MODE`, para no
  convertir en `manual` una cuenta que vino de un escaneo.

## Alternativa descartada: `maxStepReached` en el estado

Guardar el paso máximo alcanzado permitiría también saltar hacia adelante. Se descartó:
añade un campo al estado que hay que mantener sincronizado en cada `SET_STEP` y obliga a
centralizar las 4 validaciones dispersas. `stepNum < current` no necesita estado nuevo
porque un paso anterior **ya fue válido** para haber llegado al actual.

## Estilos

Cero colores nuevos. Se reutilizan `--color-purple`, `--color-muted-surface`,
`--color-muted`, `--color-white`, `--color-darkest` y `--glow-purple`, todos ya en
`src/theme.css`. `--glow-purple-ring` queda sin usar aquí (ver Anillo de foco).

Nota de contraste: el par `purple`/`muted-surface` del círculo no se ajusta aquí.
El texto del círculo es blanco sobre morado, que pasa AA. La corrección de los pares que
fallan es el change `a11y-contrast`.
