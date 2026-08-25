# Concerns — Verificación adversarial

**Fecha:** 2026-08-25
**Verificador:** Opus | **Origen:** CONCERNS.md (Haiku, effort low)

Cada hallazgo se verificó abriendo el archivo citado, leyendo las líneas exactas, revisando
`git log` / `git log -S` sobre el código en cuestión y contrastando contra `CLAUDE.md` y `docs/`.

## Resumen

| Veredicto | Cantidad | % |
|---|---|---|
| CONFIRMADO | 16 | 39% |
| DECISIÓN (intencional) | 9 | 22% |
| FALSO | 14 | 34% |
| NO VERIFICABLE | 2 | 5% |
| **Total** | **41** | **100%** |

**Conclusión general:** el 56% de los hallazgos (23 de 41) no son defectos. La mitad de los
"falsos" son casos en los que el modelo de etapa 1 afirmó que faltaba código que está presente
en la línea exacta que él mismo citó.

---

## FALSOS POSITIVOS

### 1. "Vibration API — no hay feature detection"

**Afirmación:** `navigator.vibrate` en `src/hooks/useHaptic.ts` sin detección de soporte.

**Realidad** — `src/hooks/useHaptic.ts:3`:
```ts
if ('vibrate' in navigator) navigator.vibrate(pattern);
```
El hook completo son 6 líneas y la detección es la línea central. El modelo nunca abrió el archivo.

---

### 2. "Faltan ARIA labels en botones de íconos"

**Afirmación:** los botones "✏️" (`Step2Review:73`), "🗑️" (`Step2Review:81`) y "🔄" (`Step1Entry:182`) no tienen `aria-label`.

**Realidad** — las dos primeras líneas citadas *son* el `aria-label`:
- `src/components/steps/Step2Review.tsx:73` → `aria-label="Editar"`
- `src/components/steps/Step2Review.tsx:81` → `aria-label="Eliminar"`
- `src/components/steps/Step1Entry.tsx:182` → el botón dice `🔄 Retomar`: tiene texto visible, no necesita `aria-label`.

El modelo citó como evidencia de ausencia las líneas donde está el atributo. Único hueco real de
a11y en botones (no citado por el hallazgo): los `+`/`−` de `src/components/ui/ItemForm.tsx:73,91`.

---

### 3. "No hay validación de variables de entorno"

**Afirmación:** si `VITE_WORKER_URL` no está definida, "la app carga pero el OCR falla en silencio".

**Realidad** — `src/hooks/useBillScanner.ts:10-12`:
```ts
if (!WORKER_URL) {
  throw new Error('VITE_WORKER_URL no está configurado. Revisa tu archivo .env');
}
```
No falla en silencio: lanza un error explícito en español que `Step1Entry.handleUsePhoto` captura
y muestra vía `<ErrorMessage>` con acción alternativa. El hallazgo cita esas mismas líneas 10-12.

---

### 4. "Blob URLs sin revocar / fuga de memoria en la vista previa" (dos hallazgos: #12 y #32)

**Afirmación:** múltiples previews simultáneas pueden filtrar `URL.createObjectURL`.

**Realidad** — las tres rutas revocan:
- `src/components/steps/Step1Entry.tsx:18-24` — cleanup de `useEffect` con dependencia `[preview]`: React ejecuta el cleanup del closure anterior, revocando la URL vieja al cambiar.
- `src/components/steps/Step1Entry.tsx:63-65` — `handleRetake` revoca antes de limpiar.
- `src/hooks/useBillScanner.ts:49` — `fileToBase64` revoca su propia URL en `onload`.

Además, "previews simultáneas" es imposible: `Step1Entry.tsx:97` desactiva el dropzone
(`{...(preview || isLoading ? {} : getRootProps())}`) y el botón de cámara se desmonta cuando hay preview.

---

### 5. "Canvas image resize — `onload` podría nunca dispararse"

**Realidad** — `src/hooks/useBillScanner.ts:74`:
```ts
img.onerror = reject;
```
Un archivo corrupto dispara `onerror` y rechaza la promesa; `handleUsePhoto` lo captura. El escenario
descrito (archivo roto → promesa colgada) está cubierto.

---

### 6. "Precisión de punto flotante en la división de ítems"

**Afirmación:** "3 personas comparten un ítem de $11.111, cada una recibe $3.703,67, sumando $11.110,01, off by $0,01".

**Realidad** — la aritmética del hallazgo está inventada. `src/utils/calculations.ts:56` no almacena
$3.703,67: guarda el `double` completo (3703.6666...), y `src/utils/formatCurrency.ts:6`
(`Math.round(amount)`) redondea solo en pantalla. El COP no tiene centavos, así que "off by $0,01"
no es una unidad que exista en esta app. Su corrección propuesta (`roundToNearest100` por share)
revertiría el commit `60f566a` (ver sección de decisiones).

---

### 7. "Cálculo de propina sobre base pre-IVA"

**Realidad** — el propio hallazgo desarrolla el ejemplo y concluye **"Correct."** No describe ningún
defecto; solo pide tests, que ya es el hallazgo #1. `src/utils/calculations.ts:36-39` coincide
exactamente con `CLAUDE.md:193-196` y `docs/LOGIC_SPEC.md:116`.

---

### 8. "Fallback débil de Web Share API — sin feedback al usuario"

**Realidad** — `src/components/steps/Step6Result.tsx:191` y `:246`:
```ts
setCopied(true);
...
{copied ? '✅ ¡Copiado!' : '📤 Compartir resultado'}
```
El fallback de portapapeles sí confirma visualmente durante 2.5s. Lo único sin feedback es el fallo
*total* de ambas APIs, que es el hallazgo #7 (CONFIRMADO abajo) — este es una duplicación mal descrita.

---

### 9. "Componentes grandes sin code splitting"

**Afirmación:** "Larger bundle size. Si el componente re-renderiza, todos los anidados re-renderizan."

**Realidad** — mover `ItemCard`/`PersonCard` a otro archivo **no cambia el tamaño del bundle**: Vite
empaqueta el mismo código. Y `src/App.tsx:12-19` monta un único step a la vez con un `switch`, así
que el radio de re-render ya está acotado a la pantalla visible. Los conteos de líneas sí son
correctos (292 / 267 / 224), pero la justificación técnica es falsa.

---

### 10. "Interdependencias en la lógica de cálculo"

**Realidad** — `calculateSubtotal`, `calculateTax`, `calculateTip` y `calculateSplit` son funciones
puras exportadas (`src/utils/calculations.ts:3,12,32,42`) sin estado compartido; `calculateSplit`
las *compone*, que es lo esperado. Eso no es acoplamiento fuerte. Además su única corrección
propuesta ("añadir tests") duplica el hallazgo #1.

---

### 11. "VITE_WORKER_URL expuesta en el código del frontend"

**Realidad** — el hallazgo se cierra a sí mismo con *"No immediate fix needed"*. La URL pública del
Worker es la arquitectura documentada (`CLAUDE.md:20-23`): el secreto es `ANTHROPIC_API_KEY`, que
vive en Cloudflare (`worker/index.js:85`), no la URL. No es un defecto.

---

### 12 y 13. "framer-motion v13 podría romper" / "@dicebear podría cambiar los avatares"

**Realidad** — `package.json:17,15` usan `^12.35.2` y `^9.4.0`: el caret ya bloquea saltos de major.
Y `package-lock.json` (287 KB, versionado en git) fija versiones exactas, así que `npm ci` es
determinista. La corrección propuesta ("pin version", "lock version") ya está aplicada.

---

## DECISIONES MALINTERPRETADAS COMO BUGS

### 1. "PersonSplit Rounding Discrepancy" — el hallazgo pide revertir un fix deliberado

**Afirmación:** redondear `personSubtotal`, `personTax` y `personTip` con `roundToNearest100()`.

**Prueba de intención** — commit `60f566a`:
> **fix: remove per-person rounding and discard rounding disclosure**
> Per-person totals now show exact amounts. Grand total rounding (nearest $100) is preserved.
> Rounding disclosure note in Step6 removed as it is no longer needed.

Ese commit eliminó exactamente el `roundToNearest100(...)` que envolvía `personTotal` en
`src/utils/calculations.ts:69-71`, y borró el aviso "💡 Nota sobre redondeo" de `Step6Result.tsx`.

**⚠️ Si alguien "arregla" esto:** revierte trabajo intencional, reintroduce la divergencia
suma-de-individuales ≠ total que motivó el aviso legal borrado, y obliga a restaurar ese aviso en
Step6. La descripción del hallazgo (`personTip` sin redondear en la línea 74) describe el estado
*deseado* después del commit, no un descuido.

---

### 2. "Estado solo en memoria — implementar localStorage" y "No Receipt History"

**Prueba de intención** — `CLAUDE.md:215`, regla general #8:
> "Sin localStorage ni cookies (estado solo en memoria, se pierde al cerrar)"

Reforzado en `docs/UX_SPEC.md`: *"Sin persistencia: recargar la página reinicia la app desde Step 1"*.

**⚠️ Si alguien "arregla" esto:** viola una regla explícita del proyecto y persiste en el navegador
datos de facturas (montos, nombres de comensales) que hoy se descartan a propósito — justo la
propiedad de privacidad que sostiene el borrado de `originalImage` en `BillContext.tsx:49`.
El hallazgo "No Receipt History" cae por lo mismo: sin persistencia no puede haber historial.

---

### 3. "Falta typecheck en el pipeline de build"

**Afirmación:** cambiar a `"build": "tsc --noEmit && vite build"`.

**Prueba de intención** — commit `3a105a5`: **"Removing tsc from build due to permission problems with Vercel"**,
y `CLAUDE.md:268`:
> "NO incluir tsc en el script de build (usa `typecheck: tsc --noEmit` por separado)"

**⚠️ Si alguien "arregla" esto:** rompe el deploy de Vercel por el mismo problema de permisos que
motivó la separación. La ruta correcta —y ya listada como pendiente en
`docs/APP_STORE_READINESS.md:184`— es un job de CI que corra `typecheck` aparte, no tocar `build`.

---

### 4. "Stepper oculto en el Step 6"

**Prueba de intención** — `CLAUDE.md:39`: *"Stepper.tsx # Barra de progreso de pasos (oculta en Step6)"*,
y `docs/UX_SPEC.md`: *"Step 6 oculta el Stepper para transmitir sensación de 'pantalla de resultado final'"*.
Implementado en `src/App.tsx:28` (`{state.step < 6 && <Stepper />}`).

**⚠️ Si alguien "arregla" esto:** contradice la especificación de UX escrita.

---

### 5. "Sin toggle de modo claro/oscuro"

**Prueba de intención** — `CLAUDE.md:223`: *"App siempre en modo oscuro (class='dark' en `<html>`), sin toggle de tema"*.
El propio hallazgo concluye *"Already by design; no change needed"*: no debió listarse como concern.

---

### 6. "Sin conversión de moneda"

**Prueba de intención** — `CLAUDE.md:202-205` fija formato COP sin decimales y `CLAUDE.md:211` exige
todos los textos en español colombiano. El alcance del producto es Colombia por diseño.

**⚠️ Además:** su corrección propuesta ("cachear tasas de cambio en localStorage") viola también la regla #8.

---

### 7. "Rate limiting con Map en memoria"

**Prueba de intención** — `worker/index.js:8-9`, comentario de cabecera del archivo:
> "Rate limiting: en memoria (Map). No persiste entre instancias del Worker, pero es suficiente para
> la fase inicial. Migrar a KV cuando haya usuarios reales."

El commit `511b6de` ("fix: resolve pending security vulnerabilities") ya añadió la ruta de KV
(`worker/index.js:233-264`) y dejó el binding comentado como **"KV NAMESPACE PARA RATE LIMITING
(OPCIONAL EN PROD)"** en `worker/wrangler.toml:9-16`. Es decir: el soporte que el hallazgo pide
"migrar" ya existe; lo único abierto es activar el binding, con el tradeoff ya escrito en el código.

**⚠️ Nota honesta:** el riesgo residual es real y está reconocido. Activar el binding de KV es una
mejora válida; lo falso es presentarlo como un descuido no considerado.

---

### 8. "El prompt de OCR está hardcodeado — moverlo a una variable de entorno"

**Prueba de intención** — `CLAUDE.md:161-165` transcribe el prompt palabra por palabra bajo el
encabezado *"El prompt de OCR debe ser:"*. `worker/index.js:71-74` coincide literalmente con esa
especificación.

**⚠️ Si alguien "arregla" esto:** el prompt sale del control de versiones y pasa a un secreto de
Cloudflare invisible en code review — exactamente lo contrario del riesgo ("si alguien lo cambia
sin probar, la calidad del OCR cae") que el hallazgo dice querer mitigar.

---

## CONFIRMADOS

Ordenados de mayor a menor severidad.

### 1. Cero tests sobre lógica de dinero — ALTA
`find` sobre el repo no devuelve ningún `*.test.ts` / `*.spec.ts`, pese a que `vitest` ya está
instalado y configurado (`vitest.config.ts`, commit `3940220`: *"Prerequisite for adding tests to
calculations.ts, which handles money"*).
**Impacto:** `src/utils/calculations.ts` (IVA incluido/agregado, propina pre-IVA, redondeo) no tiene
red de seguridad. *Corrección al hallazgo: no hay que "montar Vitest", ya está montado; solo faltan los tests.*

### 2. El botón "Compartir resultado" falla en silencio — ALTA
`src/components/steps/Step6Result.tsx:193-195`: `catch { // clipboard not available }` — bloque vacío.
Si `navigator.share` no existe y el portapapeles está bloqueado (HTTP, iframe sandbox, permisos),
el usuario toca el botón y no ocurre absolutamente nada, sin mensaje ni alternativa.
**Viola `CLAUDE.md:212`** (regla #5: todo error con acción alternativa). Cubre también el hallazgo duplicado "App Share Button Silent Failure".

### 3. CSP con `'unsafe-inline'` innecesario en `script-src` — MEDIA
`vercel.json:12`: `script-src 'self' 'unsafe-inline'`. Verifiqué `dist/index.html`: los dos únicos
`<script>` son externos (`/assets/index-*.js` y `/registerSW.js`), ninguno inline.
**Impacto:** la directiva es removible hoy sin romper nada y elimina la vía más fácil de explotación de un XSS DOM.

### 4. Sin validación de nombres de persona — MEDIA
`src/components/steps/Step3People.tsx:14-17`: solo `trim()` y rechazo de vacío; no hay tope de
longitud ni detección de duplicados.
**Impacto real:** dos "Juan" producen dos avatares DiceBear idénticos (seed = nombre) y son
indistinguibles en Step4/Step6. *Corrección al hallazgo: "nombres largos rompen el layout" es falso — `Step3People.tsx:110` usa `truncate w-full`.*

### 5. Sin validación de esquema en la respuesta del Worker — MEDIA-BAJA
`src/hooks/useBillScanner.ts:25-35`: se hace `data.items.map(...)` sobre un `as` de TypeScript, sin
comprobación en runtime.
**Impacto acotado:** un `TypeError` sí es capturado por `handleUsePhoto`, así que degrada a mensaje
genérico en vez de colgar la app; el Worker ya sanea (`worker/index.js:156-169`).

### 6. Sin tests de componentes — MEDIA
Ningún `*.test.tsx`; `vitest.config.ts:11-12` usa `environment: 'node'` e `include: ['src/**/*.{test,spec}.ts']` (solo `.ts`).
**Impacto:** validaciones de formulario y navegación entre pasos solo se verifican a mano. *El propio
`vitest.config.ts` documenta que jsdom + RTL se añadirán en esta etapa: es un escalonamiento deliberado, no un olvido.*

### 7. Sin tests E2E ni verificación del service worker — MEDIA
No hay Playwright/Cypress ni prueba del artefacto PWA generado por `vite.config.ts:8-31`.
**Impacto:** una falla de caché del SW (pantalla blanca tras deploy) solo se descubre en producción.
Cubre también el hallazgo duplicado "PWA Build Artifacts Not Tested".

### 8. Deploy del Worker 100% manual, sin CI — MEDIA
No existe directorio `.github/`; el despliegue es `npx wrangler deploy` a mano y los secretos se
cargan por CLI.
**Impacto:** nada verifica `typecheck` + `test` + `build` antes de publicar. Ya está listado como
pendiente en `docs/APP_STORE_READINESS.md:184`.

### 9. HTML poco semántico en los steps — BAJA
Los seis componentes de `src/components/steps/` construyen todo con `<div>` + `<button>`.
**Impacto:** lectores de pantalla no reciben landmarks dentro del flujo. *Corrección al hallazgo:
`<main>` sí existe (`src/App.tsx:29`) y `<form>` también (`src/components/ui/ItemForm.tsx:44`); la afirmación "no hay `<form>`" es incorrecta.*

### 10. Procesamiento de imagen en el hilo principal — BAJA
`src/hooks/useBillScanner.ts:43-77`: `new Image()` + `canvas.drawImage` + `toDataURL` síncronos.
**Impacto:** bloqueo perceptible en gama baja al procesar la foto. Mitigado por `MAX_DIMENSION = 1200`
y por el skeleton loader que ya cubre la espera (`Step1Entry.tsx:147-169`).

### 11. Sin presets rápidos de propina — BAJA
`src/components/steps/Step5TaxTip.tsx` solo ofrece slider + input numérico; no hay botones 10/15/20%.
**Impacto:** fricción menor en el paso más frecuente del flujo.

### 12. Sin undo tras eliminar — BAJA
`src/context/BillContext.tsx:61-62,70-78`: `REMOVE_ITEM` y `REMOVE_PERSON` son destructivos y sin confirmación.
**Impacto:** un toque accidental en 🗑️ obliga a reescribir el ítem; borrar una persona además limpia todas sus asignaciones.

### 13. IDs de persona con `Date.now()` — MUY BAJA
`src/components/steps/Step3People.tsx:21`: `id: \`person-${Date.now()}\``.
**Impacto:** prácticamente nulo — `handleAdd` exige escribir un nombre entre pulsaciones, así que dos
personas en el mismo milisegundo no es alcanzable por UI. Vale como higiene (`crypto.randomUUID()`), no como bug.

### 14. Sin virtualización de listas — MUY BAJA
`Step2Review.tsx:249-256` y `Step4Assign.tsx:52-87` renderizan todos los ítems.
**Impacto:** irrelevante para una factura de restaurante; el propio hallazgo lo admite.

---

## NO VERIFICABLES

| Hallazgo | Qué se comprobó | Qué evidencia haría falta |
|---|---|---|
| **Precios muy grandes rompen el layout de Step6** | Es cierto que `Step6Result.tsx:72` no lleva `truncate` ni `shrink-0` en el `<span>` de `text-2xl`, pero sí está dentro de un `flex` con `gap-2`. | Render real a 375px con un total de 7+ dígitos (screenshot o test visual). El desbordamiento no se puede afirmar desde el código. |
| **react-dropzone sin mantenimiento** | `package.json:20` fija `^15.0.0`; `package-lock.json` congela la versión exacta. | Datos del registro npm / actividad del repo upstream (fecha del último release, issues abiertos). No hay nada en el sistema de archivos que lo responda. |

---

## Nota fuera del alcance del audit

Detectado durante la verificación, **no** estaba en CONCERNS.md: `docs/LOGIC_SPEC.md:154-163` sigue
documentando `personTotal = roundToNearest100(...)` y la nota "la suma de individuales puede diferir
±$100 … aceptado como correcto". Ese texto quedó obsoleto con el commit `60f566a`, que eliminó el
redondeo por persona. La documentación de lógica contradice hoy al código — conviene actualizarla
antes de que alguien la use como fuente de verdad para "corregir" `calculations.ts`.
