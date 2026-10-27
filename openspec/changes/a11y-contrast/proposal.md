# Proposal: contraste accesible en la paleta

## Intent

Cinco pares de `src/theme.css` fallan el contraste mínimo de WCAG 2.1 AA. El peor es
`--color-purple` sobre `--color-surface`: **2,57:1** contra un mínimo de 4,5 (3,0 para texto
grande). Ese par es el **monto total de cada persona** (`Step6Result.tsx:72`, 24px bold,
en la card `:57`) — el dato central de la app.

## Scope

### In Scope
- `--color-purple-text`: token nuevo, claro para texto sobre `surface` y `bg`.
- Aclarar `--color-muted` hasta pasar 4,5 sobre `surface` y `muted-surface`.
- Texto del botón de WhatsApp (4,14) sin tocar el verde de marca.
- Documentar el ratio medido de cada par en `theme.css`.

### Out of Scope
- Cambiar `--color-purple` donde es relleno, borde o glow.
- Auditoría completa de accesibilidad (foco, lectores de pantalla, tamaños de toque).

## Capabilities

### New Capabilities
- `color-contrast`: ratios mínimos por par fondo/texto de la paleta.

### Modified Capabilities
None.

## Approach

Dos tácticas según el rol del color. `purple` también es relleno y glow, donde el contraste
de texto no aplica: se introduce `--color-purple-text` solo para texto y el token de marca
no cambia. `muted` es casi solo texto: se aclara directamente. Todo en el bloque PALETTE.

## Affected Areas

| Área | Impacto | Descripción |
|---|---|---|
| `src/theme.css` | Modified | Bloque PALETTE: 1 token nuevo, 2 aclarados, ratios documentados |
| `Step6Result.tsx` | Modified | Solo el monto pasa a `--color-purple-text` |

## Risks

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Cambia el aspecto de toda la app, ya aprobado visualmente | **Alta** | Mockup antes/después y aprobación explícita antes de aplicar |
| No hay verificación automática (sin jsdom, linter ni CI) | Alta | Test de ratios en `src/utils/` |
| Dos tokens de morado invitan a usar el equivocado | Media | Comentario en `theme.css` |
| `rose` pasa por poco (4,77); caería si se ajusta `surface` | Baja | Ratios documentados por token |

## Rollback Plan

`git revert`. Valores en un archivo CSS más una línea en un componente.

## Dependencies

Ninguna. El cálculo de ratios es aritmética pura en `src/utils/`.

## Success Criteria

- [ ] Los cinco pares que fallan alcanzan su mínimo: 4,5 texto normal, 3,0 texto grande.
- [ ] Ningún par que ya pasaba empeora.
- [ ] Test en `src/utils/` que calcula los ratios y falla si alguno baja del mínimo.
- [ ] El usuario aprueba el aspecto nuevo antes de mezclar.
- [ ] Cero colores hex nuevos en componentes.
