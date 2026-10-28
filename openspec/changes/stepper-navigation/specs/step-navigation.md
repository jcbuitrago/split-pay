# Spec delta: `step-navigation`

**Change:** `stepper-navigation` · **Capability:** `step-navigation` (NEW) · 2026-10-27

Reglas de qué pasos del flujo son alcanzables desde el stepper superior y cómo se
navega entre ellos. Palabras clave según RFC 2119.

---

## R1 — Navegación hacia atrás desde el stepper

El stepper MUST permitir volver a cualquier paso **anterior** al actual con un solo toque.

- **R1.1** Un círculo cuyo número es menor que `state.step` MUST ser interactivo.
- **R1.2** Un círculo cuyo número es mayor o igual que `state.step` MUST estar
  deshabilitado y MUST NOT responder al toque, al click ni a Enter/Espacio.
- **R1.3** Navegar hacia atrás MUST NOT modificar `items`, `people`, `assignedTo`,
  `taxPercent`, `taxIncluded`, `tipPercent`, `tipAmount`, `tipType` ni `tipIsVoluntary`.
- **R1.4** El cambio de paso MUST despacharse con la acción `SET_STEP` ya existente.
  Ninguna acción nueva del reducer SHALL añadirse.

### Scenario: volver del paso 5 al paso 2
```
GIVEN  el usuario está en el paso 5 con 3 ítems y 2 personas
WHEN   toca el círculo número 2 del stepper
THEN   la app muestra el paso 2
AND    los 3 ítems y las 2 personas siguen intactos
AND    las asignaciones del paso 4 se conservan
```

### Scenario: los pasos futuros no son alcanzables
```
GIVEN  el usuario está en el paso 3
WHEN   toca el círculo número 5
THEN   nada ocurre: sigue en el paso 3
AND    el círculo 5 reporta `disabled` a la tecnología asistiva
```

### Scenario: el paso activo no es un destino
```
GIVEN  el usuario está en el paso 4
WHEN   toca el círculo número 4
THEN   nada ocurre: no hay re-render de paso ni haptic
```

---

## R2 — Accesibilidad de los círculos

- **R2.1** Cada círculo MUST ser un elemento `<button type="button">`. Un `<div>` con
  `role="button"` SHALL NOT aceptarse.
- **R2.2** El círculo del paso actual MUST exponer `aria-current="step"`.
- **R2.3** Cada botón MUST tener un `aria-label` que nombre el número y la etiqueta del
  paso, p. ej. `"Paso 2: Ítems"`.
- **R2.4** Un botón navegable MUST ser alcanzable con Tab y activable con Enter y Espacio.
- **R2.5** El foco MUST ser visible con un contraste de al menos 3:1 tanto contra el
  fondo del stepper como contra el propio círculo (WCAG 2.4.11). Nuevas variables de
  color SHALL NOT crearse.

  > **Ajuste durante `apply` (2026-10-27):** el borrador de este requisito nombraba
  > `--glow-purple-ring`. Medido en el navegador, ese token es morado al 25 % y queda
  > **invisible** sobre un círculo que ya es morado sólido. Se sustituye por un anillo
  > de `--color-white` con un gap de `--color-darkest`: 17,74:1 contra el fondo y
  > 5,37:1 contra el círculo morado. Ambas son variables existentes.
- **R2.6** El botón deshabilitado MUST usar el atributo `disabled` nativo, no solo un
  estilo, y su cursor MUST indicar que no es interactivo.

### Scenario: recorrido por teclado
```
GIVEN  el usuario está en el paso 4 navegando con teclado
WHEN   presiona Tab repetidamente
THEN   el foco pasa por los círculos 1, 2 y 3 únicamente
AND    cada uno muestra un anillo de foco visible
WHEN   presiona Enter sobre el círculo 1
THEN   la app muestra el paso 1
```

---

## R3 — Haptic feedback

- **R3.1** Una navegación efectiva hacia atrás MUST invocar el haptic del hook existente
  `useHaptic`. Un toque sobre un botón deshabilitado MUST NOT vibrar.

---

## R4 — Regreso al paso 1 sin foto

`SET_STEP` borra `originalImage` al salir del paso 1 (`BillContext.tsx:49`). Es una
mitigación de seguridad deliberada y MUST NOT revertirse.

- **R4.1** Al volver al paso 1 la app MUST mostrar la zona de drag & drop en su estado
  normal, sin imagen fantasma ni placeholder roto.
- **R4.2** Si al estar en el paso 1 existe al menos un ítem en `state.items`, la app MUST
  mostrar un aviso que: (a) explique que la foto no se conserva por seguridad,
  (b) confirme que los ítems siguen registrados, y (c) ofrezca continuar sin volver a
  escanear.
- **R4.3** La acción de continuar del aviso MUST avanzar al paso 2 y MUST NOT alterar
  `items` ni `entryMode`.
- **R4.4** Volver a escanear desde el paso 1 MUST reemplazar los ítems por los de la
  nueva lectura, que es el comportamiento actual de `SET_ITEMS`.
- **R4.5** El aviso MUST NOT aparecer en la primera visita al paso 1, cuando `items`
  está vacío.

### Scenario: volver al paso 1 tras escanear
```
GIVEN  el usuario escaneó una factura y está en el paso 3
WHEN   toca el círculo número 1 del stepper
THEN   ve la zona de drag & drop vacía, sin imagen
AND    ve un aviso de que la foto no se guarda y que sus ítems siguen ahí
WHEN   toca la acción de continuar del aviso
THEN   la app muestra el paso 2 con los ítems del escaneo intactos
```

### Scenario: primera visita al paso 1
```
GIVEN  el usuario abre la app por primera vez
WHEN   se renderiza el paso 1
THEN   NO se muestra ningún aviso sobre la foto
```

---

## Out of scope

- Saltar hacia adelante a pasos ya visitados.
- Centralizar las validaciones de avance hoy dispersas en los componentes de paso.
- Mostrar el stepper en el paso 6 (`App.tsx:28` lo oculta a propósito).
