# Exploration: contraste insuficiente en la paleta

**Change:** `a11y-contrast` · **Modo:** `openspec` · **Fecha:** 2026-10-27

## Current State

`src/theme.css` es la única fuente de la paleta (bloque PALETTE). Medí todos los pares
fondo/texto que la app usa de verdad, con la fórmula de luminancia relativa de WCAG 2.1:

| Par | Ratio | Normal (≥4,5) | Grande (≥3,0) | Dónde se usa |
|---|---|---|---|---|
| `purple` sobre `surface` | **2,57** | FALLA | **FALLA** | **Total por persona**, `Step6Result.tsx:72` (24px bold) dentro de la card `:57` |
| `purple` sobre `bg` | 3,06 | FALLA | pasa | Barra de progreso y acentos sobre el fondo |
| `muted` sobre `muted_surface` | 3,90 | FALLA | pasa | Etiquetas de pasos inactivos en el Stepper |
| `muted` sobre `surface` | 4,40 | FALLA | pasa | Etiquetas secundarias en todas las cards |
| `whatsapp` sobre `white` | 4,14 | FALLA | pasa | Texto del botón de WhatsApp |
| `white` sobre `surface` | 13,80 | pasa | pasa | — |
| `gold` sobre `surface` | 8,51 | pasa | pasa | — |
| `rose` sobre `surface` | 4,77 | pasa | pasa | — |
| `success` sobre `surface` | 6,06 | pasa | pasa | — |
| `white` sobre `purple` | 5,37 | pasa | pasa | Botón primario |

El caso grave es el primero y **no es el que parecía a simple vista**: `--color-purple`
(#5b5bd6) sobre `--color-surface` (#252d3d) da 2,57. Es el monto que cada persona debe
pagar — el dato por el que existe la app — y falla incluso el umbral relajado de 3,0 que
aplica a texto de 24px en negrita.

## Affected Areas

- `src/theme.css` — Modified: el bloque PALETTE es el único punto de cambio
- Ningún componente debería tocarse: no hay hex hardcodeados (regla de `CLAUDE.md`)

## Approaches

1. **Aclarar los tokens en `theme.css`** y dejar los componentes intactos.
   - Pros: un solo archivo; la regla de "cero hex en componentes" hace que se propague solo.
   - Cons: cambia el aspecto de toda la app; `--color-purple` es el color de marca y
     aclararlo lo desatura hacia el lavanda.
   - Effort: Low (el cambio) / Medium (validar que la app sigue viéndose bien)

2. **Añadir tokens específicos para texto** (p. ej. `--color-purple-text`) y usarlos solo
   donde hay texto sobre fondo.
   - Pros: el color de marca no cambia en rellenos, bordes ni glows, donde el contraste de
     texto no aplica.
   - Cons: dos tokens para el mismo color obligan a decidir cuál usar en cada sitio; es
     justo el tipo de ambigüedad que la regla de paleta única quería evitar.
   - Effort: Medium

## Recommendation

Opción 2 para `purple`, opción 1 para el resto. El morado se usa como relleno de botón y
como glow, donde WCAG de texto no aplica y aclararlo solo degrada la marca; separar un
`--color-purple-text` resuelve el caso del monto sin tocar el resto. Los grises
(`muted` sobre `surface` y sobre `muted_surface`) sí se arreglan aclarando el token, porque
`muted` se usa casi solo para texto.

## Risks

- **Es un cambio de aspecto global.** El usuario aprobó visualmente el diseño actual; esto
  lo modifica en toda la app. Requiere su revisión explícita, no solo que pasen los números.
- No hay forma automática de verificarlo: no hay tests de componentes (falta jsdom), ni
  linter, ni CI. La verificación será visual y manual.
- `rose` sobre `surface` pasa con 4,77, pero por poco. Si se oscurece `surface` en algún
  ajuste futuro, cae. Conviene dejar los ratios documentados en `theme.css`.
- El botón de WhatsApp (4,14) usa el verde oficial de la marca WhatsApp. Cambiarlo rompe el
  reconocimiento; probablemente la salida sea oscurecer el texto o agrandarlo, no el fondo.

## Ready for Proposal

Sí.
