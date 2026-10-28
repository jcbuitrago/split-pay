# Verify report: `stepper-navigation`

**Fecha:** 2026-10-27 · **Método:** ejecución real en `npm run dev` (localhost:5173)
conducida con Claude in Chrome. No es una revisión de código: cada escenario se ejecutó.

## Escenario de prueba

1 ítem (Hamburguesa, $20.000), 2 personas (Ana, Beto), ambas asignadas al ítem,
avance hasta el paso 5 (total $21.900).

## Resultados por requisito

| Req | Resultado | Evidencia |
|---|---|---|
| R1.1 volver del 5 al 2 | PASA | Click en el círculo 2 desde el paso 5 → render del paso 2 |
| R1.2 pasos futuros bloqueados | PASA | Click en el círculo 5 estando en el paso 2 → `aria-current` sigue en "Paso 2: Ítems" |
| R1.3 estado intacto | PASA | Tras volver, el ítem y su precio siguen; el total vuelve a $21.900 al avanzar |
| R1.4 sin acciones nuevas | PASA | `goToStep` despacha `SET_STEP`; el reducer no cambió |
| R2.1 `<button>` real | PASA | Volcado del DOM: los 6 son `tag: "BUTTON"` |
| R2.2 `aria-current="step"` | PASA | Solo el paso activo lo expone |
| R2.3 `aria-label` | PASA | "Volver al paso 2: Ítems" / "Paso 5: Impuesto" |
| R2.4 teclado | PASA | `focus()` sobre un paso deshabilitado no lo toma; el foco se queda donde estaba |
| R2.5 foco visible | PASA **tras corrección** | Ver "Desviaciones" |
| R2.6 `disabled` nativo | PASA | `disabled: true` en los pasos ≥ actual |
| R3.1 haptic | NO VERIFICABLE | `navigator.vibrate` no tiene efecto observable en Chrome de escritorio. El código lo invoca solo dentro del `onClick`, que un botón `disabled` nunca dispara |
| R4.1 sin imagen fantasma | PASA | Paso 1 renderiza la zona normal |
| R4.2 aviso con ítems | PASA | Captura del aviso |
| R4.3 continuar conserva | PASA | "Continuar con mis ítems" → paso 2 con el ítem intacto |
| R4.5 sin aviso en la 1ª visita | PASA | Primer render de la app: no aparece |

`npm run typecheck` → exit 0.
Consola del navegador: sin errores ni warnings.

## Desviaciones respecto al spec

### 1. Anillo de foco: `--glow-purple-ring` → `--color-white` con gap

El borrador de R2.5 nombraba `--glow-purple-ring`. Implementado y mirado en el navegador,
**no se veía**: ese token es `0 0 0 3px rgb(91 91 214 / 0.25)`, morado translúcido sobre
un círculo que ya es morado sólido.

Sustituido por `0 0 0 2px var(--color-darkest), 0 0 0 4px var(--color-white)`.
Medido: **17,74:1** contra el fondo del stepper y **5,37:1** contra el círculo morado.
WCAG 2.4.11 pide 3:1. Ambas variables ya existían; no se añadió ningún color.

R2.5 fue reescrito en el spec para pedir el contraste medible en vez de nombrar un token.

### 2. Bug de concordancia encontrado y corregido

El primer texto del aviso producía *"Tus 1 ítem sigue registrados"*. Se reemplazó el
ternario parcial por dos frases completas: *"Tu ítem sigue registrado"* /
*"Tus N ítems siguen registrados"*.

## Fuera de alcance confirmado

Avanzar sigue siendo exclusivamente responsabilidad de "Continuar": el stepper no permite
saltar hacia adelante, así que ninguna validación de paso fue eludida.

## Veredicto

**APROBADO.** Los 5 success criteria del proposal se cumplen.
