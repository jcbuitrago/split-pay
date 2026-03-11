# DESIGN_SPEC — Sistema de diseño de SplitBill

Referencia completa de tokens, patrones de componentes y reglas visuales.
**Regla fundamental:** nunca escribir colores hex directamente en componentes —
todo pasa por variables CSS o tokens Tailwind definidos en `theme.css`.

Archivos fuente:
- [`src/theme.css`](../src/theme.css) — ÚNICA fuente de paleta (editar aquí para cambiar colores)
- [`tailwind.config.js`](../tailwind.config.js) — tokens Tailwind conectados a las CSS vars
- [`index.html`](../index.html) — dark mode permanente, fuentes Google
- [`src/App.tsx`](../src/App.tsx) — shell de la app

---

## 1. Tokens de diseño

### 1.1 Variables CSS (`src/theme.css`)

#### Paleta base

| Variable CSS | Hex | RGB var | Uso |
|---|---|---|---|
| `--color-bg` | `#1a1f2e` | `26 31 46` | Fondo principal de la app |
| `--color-bg-highlight` | `#1e2436` | — | Centro del gradiente radial (Step1) |
| `--color-surface` | `#252d3d` | `37 45 61` | Cards, formularios, superficies |
| `--color-darkest` | `#141822` | `20 24 34` | Stepper, StepFooter, header Step6 |
| `--color-purple` | `#5b5bd6` | `91 91 214` | Acento primario — botones, activos, progreso |
| `--color-muted-surface` | `#2d3548` | `45 53 72` | Track del stepper, toggles inactivos |
| `--color-gold` | `#f5c542` | `245 197 66` | Acento secundario — totales, badge asignado |
| `--color-white` | `#ffffff` | — | Texto principal |
| `--color-muted` | `#8892a4` | `136 146 164` | Texto secundario, placeholders, iconos inactivos |
| `--color-rose` | `#f07070` | `240 112 112` | Errores, advertencias, ítems sin asignar |
| `--shadow-rgb` | `#0d1117` | `13 17 23` | Sombras (sin exposición directa en CSS) |

#### Tokens derivados

| Variable CSS | Valor | Uso |
|---|---|---|
| `--glow-purple` | `0 0 12px rgb(purple/0.5)` | `boxShadow` en avatar asignado, stepper activo |
| `--glow-purple-ring` | `0 0 0 3px rgb(purple/0.25)` | Focus ring (no usado activamente aún) |
| `--glow-gold` | `0 0 10px rgb(gold/0.55)` | Definido en CLAUDE.md, no usado actualmente |
| `--gradient-header` | `linear-gradient(to bottom right, surface → darkest)` | Header de Step6 |
| `--gradient-radial` | `radial-gradient(ellipse at 50% 30%, bg-highlight → bg)` | Fondo de Step1 |

#### Aliases legacy (no usar en código nuevo)

| Alias | Apunta a |
|---|---|
| `--bg-primary` | `--color-bg` |
| `--bg-surface` | `--color-surface` |
| `--accent-primary` | `--color-purple` |
| `--accent-muted` | `--color-muted-surface` |
| `--accent-gold` | `--color-gold` |
| `--accent-rose` | `--color-rose` |
| `--text-primary` | `--color-white` |
| `--text-muted` | `--color-muted` |

---

### 1.2 Tokens Tailwind (`tailwind.config.js`)

Los tokens usan el patrón `rgb(var(--color-*-rgb) / <alpha-value>)` para que
los modificadores de opacidad de Tailwind (`/50`, `/70`, etc.) funcionen.

#### Colores `brand.*`

| Clase Tailwind | Variable RGB subyacente |
|---|---|
| `bg-brand-bg` / `text-brand-bg` | `--color-bg-rgb` |
| `bg-brand-surface` | `--color-surface-rgb` |
| `bg-brand-darkest` | `--color-darkest-rgb` |
| `bg-brand-purple` | `--color-purple-rgb` |
| `bg-brand-muted` | `--color-muted-rgb` |
| `bg-brand-muted-surface` | `--color-muted-surface-rgb` |
| `bg-brand-gold` | `--color-gold-rgb` |
| `bg-brand-rose` | `--color-rose-rgb` |

Ejemplo de uso con opacidad: `bg-brand-rose/50` → `rgba(240,112,112,0.5)`

#### Fuentes

| Clase Tailwind | Fuente | Pesos cargados |
|---|---|---|
| `font-display` | Playfair Display | 700 |
| `font-body` | DM Sans | 400, 500, 600, 700 |

`font-body` es el `font-family` base del body — no se declara en componentes.
`font-display` se usa explícitamente en títulos, totales y nombres de personas.

#### Sombras

| Clase Tailwind | Valor real |
|---|---|
| `shadow-navy-sm` | `0 2px 8px rgb(13 17 23 / 0.45)` |
| `shadow-navy-md` | `0 4px 20px rgb(13 17 23 / 0.60)` |
| `shadow-navy-lg` | `0 8px 40px rgb(13 17 23 / 0.75)` |
| `shadow-purple-sm/md/lg` | Aliases de `navy-*` (compatibilidad) |

#### Background image

| Clase Tailwind | Variable |
|---|---|
| `bg-brand-radial` | `--gradient-radial` |

---

## 2. Shell de la aplicación

### Modo oscuro
`class="dark"` fijo en `<html>`. **Sin toggle de tema.** La app vive siempre en modo oscuro.
`theme-color` meta tag: `#1a1f2e` (iguala `--color-bg` para la barra del navegador en móvil).

### Contenedor principal
```
min-h-screen   → ocupa toda la pantalla
max-w-[430px]  → ancho máximo (objetivo: 375–430px, mobile-first)
mx-auto        → centrado horizontal en pantallas grandes
bg: var(--color-bg)
```
El scroll vertical no está en el contenedor raíz — cada step gestiona su propio
`overflow-y-auto` en la zona de contenido.

### Estructura de columna por paso
```
<div class="flex flex-col" style="bg: --color-darkest">
  <Stepper />                    ← visible en steps 1–5, oculto en step 6
</div>
<main class="flex-1 flex flex-col overflow-hidden">
  <StepContent />                ← cada step ocupa todo el espacio disponible
</main>
```

---

## 3. Componentes compartidos

### 3.1 `Stepper`

**Archivo:** [`src/components/ui/Stepper.tsx`](../src/components/ui/Stepper.tsx)

```
Contenedor: px-4 py-3 border-b
  bg: --color-darkest
  border: rgba(255,255,255,0.06)

Track (línea de fondo):
  height: 2px (h-0.5)
  bg: --color-muted-surface
  left/right: 50/N % ≈ 8.33% (se alinea exactamente con centros de círculos)

Barra de progreso:
  bg: --color-purple
  width: (step-1)/(N-1) × 100%
  transition: duration-300

Círculos (w-7 h-7 = 28px):
  Estado pendiente: bg --color-muted-surface, text --color-muted
  Estado activo:    bg --color-purple, text #fff, boxShadow --glow-purple
  Estado completo:  bg --color-purple, text #fff, ícono SVG checkmark blanco

Etiquetas debajo de cada círculo:
  font-size: 10px (text-[10px])
  Estado activo/completo: color --color-purple
  Estado pendiente:       color --color-muted
```

**Pasos y etiquetas:** Foto · Ítems · Personas · Asignar · Impuesto · Resultado

---

### 3.2 `StepFooter`

**Archivo:** [`src/components/ui/StepFooter.tsx`](../src/components/ui/StepFooter.tsx)

Footer fijo al fondo de cada paso (excepto Step6 que tiene su propio footer).

```
Contenedor: flex gap-3 px-4 py-4 border-t
  bg: --color-darkest
  border: rgba(255,255,255,0.06)

Botón "Atrás" (secundario):
  flex-1 py-3 rounded-2xl border text-sm font-semibold
  bg: transparent
  border: --color-muted-surface
  color: --color-muted
  hover/active: opacity-70

Botón "Continuar" (primario):
  flex-1 py-3 rounded-2xl text-sm font-bold shadow-navy-sm
  bg: --color-purple
  color: #ffffff
  disabled: opacity-40
  active: opacity-80
```

Props: `onBack?`, `onContinue?`, `continueLabel` (default `'Continuar →'`),
`continueDisabled` (default `false`), `backLabel` (default `'← Atrás'`).

---

### 3.3 `PersonAvatar`

**Archivo:** [`src/components/ui/PersonAvatar.tsx`](../src/components/ui/PersonAvatar.tsx)

Avatar circular generado localmente con DiceBear `funEmoji`. El seed es el
**nombre de la persona** — el mismo nombre siempre produce el mismo avatar.

#### Tamaños

| Prop `size` | px | Border width |
|---|---|---|
| `'sm'` (default) | 32px | 2px |
| `'md'` | 48px | 3px |

#### Estados visuales

| Estado | Border color | Box shadow | Badge |
|---|---|---|---|
| `assigned=false` | `--color-muted-surface` | ninguna | — |
| `assigned=true` | `--color-purple` | `--glow-purple` | ✓ en círculo 14px púrpura (bottom-right: -2px,-2px) |

Transition en border y shadow: `0.15s`.

#### Modo interactivo (`onToggle` definido)
Renderiza un `<button>` con `active:scale-90 transition-transform`.
Sin `onToggle`: renderiza un `<div>` estático.

#### `showName`
Muestra el nombre debajo del avatar:
```
font-size: 10px
font-weight: 600
color: --color-purple (assigned) | --color-muted (not assigned)
maxWidth: px + 8px
overflow: hidden, text-overflow: ellipsis, white-space: nowrap
```

---

### 3.4 `PersonChips`

**Archivo:** [`src/components/ui/PersonChips.tsx`](../src/components/ui/PersonChips.tsx)

Fila de `PersonAvatar` sm con `showName` y `onToggle`. Siempre usa el tamaño `'sm'`.

```
Modo scrollable (prop scrollable=true):
  flex gap-4 py-1 overflow-x-auto scrollbar-hide

Modo wrap (scrollable=false, default):
  flex flex-wrap gap-4 py-1
```

---

### 3.5 `ItemForm`

**Archivo:** [`src/components/ui/ItemForm.tsx`](../src/components/ui/ItemForm.tsx)

Formulario de creación/edición de ítem. Se muestra como card embebida.

```
Contenedor: rounded-2xl p-4 border
  bg: --color-surface
  border: rgba(91,91,214,0.25)  ← borde púrpura suave

Labels: text-xs font-semibold uppercase tracking-wide
  color: --color-muted

Inputs de texto/número:
  bg: --color-bg
  color: --color-white
  border: rgba(255,255,255,0.1)
  rounded-xl px-3 py-2.5 text-sm
  caretColor: --color-purple (solo en campo nombre)
  focus:outline-none (sin ring por defecto)

Control de cantidad (stepper numérico):
  Contenedor: flex border rounded-xl overflow-hidden
    bg: --color-bg, border: rgba(255,255,255,0.1)
  Botones − y +: w-10 h-10 text-lg font-bold
    color: --color-muted
    disabled (solo −, cuando qty=1): opacity-30
  Input central: text-center font-semibold bg-transparent

Botón Cancelar: mismo estilo que botón secundario (ver §4.1)
Botón Agregar/Guardar: mismo estilo que botón primario (ver §4.1)
  disabled: opacity-40
```

---

### 3.6 `ErrorMessage`

**Archivo:** [`src/components/ui/ErrorMessage.tsx`](../src/components/ui/ErrorMessage.tsx)

```
Contenedor: rounded-2xl p-4 border
  bg: rgba(240,112,112,0.1)   ← --color-rose al 10%
  border: rgba(240,112,112,0.3)

Ícono: ⚠️ text-lg, shrink-0
Texto: text-sm, color: --color-rose

Botón de acción (opcional):
  self-start text-sm font-semibold underline underline-offset-2
  color: --color-purple
```

---

## 4. Patrones de elementos reutilizables

### 4.1 Jerarquía de botones

#### Botón primario
```
bg: --color-purple  |  color: #ffffff
font-bold  |  rounded-2xl  |  py-3
shadow-navy-sm
active:opacity-80  |  disabled:opacity-40
transition-opacity
```

#### Botón secundario (borde)
```
bg: transparent  |  border: --color-muted-surface  |  color: --color-muted
font-semibold  |  rounded-2xl  |  py-3
active:opacity-70
transition-opacity
```

#### Botón outline accent (Step1 "Ingresar manualmente")
```
bg: transparent  |  border-2: --color-purple  |  color: --color-purple
font-semibold  |  rounded-full  |  py-4  |  text-lg
active:opacity-80
```

#### Botón dashed (agregar ítem, drop zone)
```
border-2 border-dashed  |  rounded-2xl
border: rgba(91,91,214,0.4) → var(--color-purple) cuando active/drag
bg: rgba(91,91,214,0.04) → rgba(91,91,214,0.08) cuando active/drag
color: --color-purple
```

#### Botón icono cuadrado (edit / delete en ItemCard)
```
w-9 h-9  |  rounded-xl  |  flex items-center justify-center  |  text-base
Edit:   bg rgba(91,91,214,0.15) → rgba(91,91,214,0.35) cuando activo
Delete: bg rgba(240,112,112,0.12)
active:opacity-70
```

#### Botón toggle (Step5 Sí/No y %/Monto fijo)
```
px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
Activo:   bg --color-purple  |  color #ffffff
Inactivo: bg transparent     |  color --color-muted
```

### 4.2 Cards

Patrón estándar de card:
```
rounded-2xl  |  border
bg: --color-surface
border: rgba(255,255,255,0.06)   ← borde sutil blanco
```

Card activa / con foco (ej. ItemCard en edición):
```
border: rgba(91,91,214,0.5)   ← borde púrpura al 50%
```

Card de ítem sin asignar (Step4):
```
border-left-width: 3px
border-left-color: --color-gold   ← acento dorado izquierdo
```

Card de acento informativo (tipo "hint"):
```
bg: rgba(91,91,214,0.08)
border: rgba(91,91,214,0.25)
```

Card de resumen / totales (Step5):
```
bg: rgba(91,91,214,0.08)
border: rgba(91,91,214,0.25)
```

Card de error: ver `ErrorMessage` (§3.6).

### 4.3 Inputs de texto y número

```
border rounded-xl px-3 py-2.5 text-sm focus:outline-none
bg: --color-bg  |  color: --color-white  |  border: rgba(255,255,255,0.1)
```

Variante interna a card (Step2 edición inline):
```
bg: rgba(255,255,255,0.06)  |  border: rgba(255,255,255,0.12)
```

Input de nombre (Step3 agregar persona):
```
rounded-2xl px-4 py-3   ← más grande, redondeo mayor
bg: --color-surface
focus:ring-1 (sin color explícito)
```

### 4.4 Labels de campo
```
block text-xs font-semibold mb-1.5 uppercase tracking-wide
color: --color-muted
```

### 4.5 Sliders (`<input type="range">`)
```
accentColor: --color-purple
min=0 max=30 step=1   (para IVA y propina %)
```

### 4.6 Badges / pills

Badge contador (Step4 "X/Y asignados"):
```
text-xs font-semibold px-2.5 py-1 rounded-full
Todo asignado:   bg rgba(91,91,214,0.2)   color --color-purple
Pendiente:       bg rgba(245,197,66,0.15) color --color-gold
```

### 4.7 Divisores
```
h-px  |  bg: rgba(255,255,255,0.06)   ← borde horizontal sutil
```

### 4.8 Textos muted / informativos
```
text-xs  |  color: --color-muted
```
Aviso legal propina voluntaria:
```
text-xs  |  color: --color-rose
```

---

## 5. Pantallas por paso

### Step 1 — Entry

```
Fondo: var(--gradient-radial)  ← el único paso con gradiente radial
Padding: px-4 py-8 gap-6

Header:
  Emoji 🧾 text-5xl mb-4
  Título "SplitBill": text-4xl font-display font-bold, color --color-white
  Subtítulo: text-sm, color --color-muted

Zona de drag & drop / cámara:
  Botón dashed (ver §4.1)
  Ícono 📷 text-4xl → 📂 cuando isDragActive
  Texto principal: text-base font-semibold, color --color-white
  Texto secundario: text-xs, color --color-muted

Botón "Ingresar manualmente": outline accent (ver §4.1)

Estado de carga (skeleton):
  3 bars: h-12 rounded-2xl bg --color-surface animate-pulse
    opacidades decrecientes: 1.0, 0.8, 0.6
  Spinner: w-12 h-12 rounded-full border-4 animate-spin
    border: --color-muted-surface | borderTop: --color-purple
  Texto "Leyendo tu factura...": font-semibold color --color-white

Preview de imagen:
  rounded-2xl overflow-hidden border rgba(255,255,255,0.1)
  max-h-64 object-contain
  Botón "Retomar": secundario
  Botón "✅ Usar esta foto": primario + shadow-navy-sm

Error: componente <ErrorMessage> con acción "Ingresar manualmente"
```

---

### Step 2 — Review (lista de ítems)

```
Fondo: --color-bg
Scroll interno: flex-1 overflow-y-auto px-4 py-4 gap-3

Título: text-xl font-display font-bold, color --color-white

Banner "modo scan" (cuando entryMode='scan'):
  Card acento informativo (ver §4.2)

ItemCard (estado colapsado):
  Card estándar (ver §4.2)
  Nombre: font-semibold, color --color-white
  Detalle: text-xs, color --color-muted
    Total del ítem: font-semibold, color --color-gold

ItemCard (estado expandido / editando):
  border: rgba(91,91,214,0.5)
  Sección de edición: AnimatePresence height 0→auto, opacity 0→1, duration 0.2
  Separador top: border-t rgba(91,91,214,0.25)

Botón "+ Agregar ítem": dashed (ver §4.1)

Barra de subtotal (sticky, cuando hay ítems):
  bg --color-surface, border-t rgba(255,255,255,0.06) px-4 py-3
  Etiqueta "Subtotal": text-sm, color --color-muted
  Valor: font-bold text-lg, color --color-gold

Footer: <StepFooter> — continuar deshabilitado si no hay ítems válidos
```

---

### Step 3 — People

```
Fondo: --color-bg
Scroll interno: flex-1 overflow-y-auto px-4 py-4 gap-4

Título: text-xl font-display font-bold, color --color-white
Subtítulo: text-sm, color --color-muted

Input de nombre + botón "Agregar":
  Input: variante grande rounded-2xl (ver §4.3)
  Botón: primario (ver §4.1)

Grid de personas: grid grid-cols-2 gap-3 (motion.div con layout)
  Card por persona:
    rounded-2xl p-4 border flex-col items-center gap-2 relative
    bg --color-surface | border rgba(91,91,214,0.3)
    AnimatePresence: opacity 0→1, scale 0.85→1, duration 0.18

    Botón eliminar ✕:
      absolute top-2.5 right-2.5 w-5 h-5 rounded-full
      bg rgba(255,255,255,0.1) | color --color-muted

    PersonAvatar size="sm" (sin assigned)
    Nombre: text-sm font-semibold, color --color-white, truncate

Footer: <StepFooter> — continuar deshabilitado si < 2 personas
```

---

### Step 4 — Assign

```
Fondo: --color-bg
Scroll interno: flex-1 overflow-y-auto px-4 py-4 gap-3

Header: título + badge contador (§4.6) en flex justify-between
Subtítulo: text-sm, color --color-muted

Card por ítem:
  Card estándar con variante "sin asignar":
    Sin asignar: borderLeft 3px --color-gold + ícono ⚠️
    Asignado:    border rgba(255,255,255,0.06) normal

  Detalle del ítem:
    Nombre: font-semibold, color --color-white
    Cantidad × precio: text-xs, color --color-muted
    Precio c/u (si >1 persona): color --color-gold, ml-1

  PersonChips con scrollable=true

Barra sticky de subtotales (encima del footer):
  bg --color-bg | border-t rgba(255,255,255,0.06) | px-4 py-2.5
  overflow-x-auto scrollbar-hide | flex gap-4
  Por persona:
    PersonAvatar size="sm" assigned si personSubtotal > 0
    Monto: text-[10px] font-semibold
      color --color-purple (tiene consumo) | --color-muted (sin consumo)

Footer: <StepFooter> — continuar deshabilitado si algún ítem sin asignar
```

---

### Step 5 — Tax & Tip

```
Fondo: --color-bg
Scroll interno: flex-1 overflow-y-auto px-4 py-4 gap-5

Título: text-xl font-display font-bold, color --color-white

Card IVA:
  Card estándar
  Valor %: font-bold text-lg, color --color-gold
  Toggle Sí/No (pair de ToggleButton)
  Texto descriptivo bajo toggle: text-xs, color --color-muted
  Slider + input número para taxPercent (0–30 slider / 0–100 input)
  Nota informativa: text-xs, color --color-muted

Card Propina:
  Card estándar
  Toggle %/Monto fijo
  Modo %: slider + input número para tipPercent
  Modo fijo: input texto con inputMode="numeric"
  Checkbox "Propina voluntaria":
    accentColor --color-purple
  Texto legal si voluntaria: text-xs, color --color-rose

Card Resumen (preview del total):
  bg rgba(91,91,214,0.08) | border rgba(91,91,214,0.25) → card acento
  Título sección: text-sm font-semibold, color --color-purple
  Filas: flex justify-between text-sm
    Labels: color --color-muted | Valores: color --color-white
    IVA incluido (informativo): text-xs, ambos en --color-muted (indentado con ↳)
  Divisor: h-px bg rgba(91,91,214,0.25)
  Total final: font-bold, label --color-white, valor text-xl font-display --color-gold

Footer: <StepFooter> continueLabel="Ver resultado →" (siempre habilitado)
```

---

### Step 6 — Result

```
NO usa Stepper (se oculta desde App.tsx cuando step=6)
NO usa StepFooter (tiene su propio footer con acciones extra)

Header:
  bg: --gradient-header (linear-gradient surface→darkest)
  px-4 py-5
  Label superior: text-xs font-semibold uppercase tracking-wide, color --color-muted
  Total: text-5xl font-display font-bold, color --color-gold
  Desglose subtotal/IVA/propina: text-xs, color --color-muted, flex gap-4

Cards por persona (AnimatePresence, stagger):
  Cada card: motion.div initial opacity=0 y=20 → animate opacity=1 y=0
  Delay: index × 0.08s | duration: 0.3s
  rounded-2xl overflow-hidden border
  bg: --color-surface
  border pagado: rgba(34,197,94,0.5) | border normal: rgba(255,255,255,0.06)

  Header de card (botón toggle):
    PersonAvatar size="md" assigned
    Nombre: font-display font-bold, color --color-white
    N ítems: text-xs, color --color-muted
    Total persona: text-2xl font-display font-bold, color --color-purple

  Botón WhatsApp:
    flex-1 py-2 rounded-xl font-semibold text-sm flex items-center gap-2
    bg #128C7E | color #ffffff
    Ícono SVG WhatsApp 16px fill-white

  Botón pagado (📋 / ✓):
    w-10 h-9 rounded-xl border
    No pagado: bg rgba(255,255,255,0.06) | border rgba(255,255,255,0.1)
    Pagado:    bg rgba(34,197,94,0.15)   | border rgba(34,197,94,0.4)
    AnimatePresence mode="wait" — transición scale 0→1 entre estados

  Desglose expandible (accordion):
    border-t rgba(255,255,255,0.06) | px-4 pb-4
    Filas: text-sm, nombre --color-muted, monto --color-white
    Divisor: h-px bg rgba(255,255,255,0.06)
    Filas subtotal/IVA/propina: text-xs, color --color-muted

Footer de Step6:
  bg --color-darkest | border-t rgba(255,255,255,0.06) | px-4 py-4 gap-3
  Aviso legal: text-xs text-center, color --color-muted
  Botón "Compartir resultado": primario ancho completo, bg --color-purple
    Estado copiado: "✅ ¡Copiado!"
  Fila inferior:
    Botón "← Atrás": secundario con borde --color-muted-surface
    Botón "🔄 Nueva cuenta": mismo estilo secundario
```

---

## 6. Animaciones

Librería: **framer-motion** (`AnimatePresence`, `motion.*`, `layout`).

### Patrones de animación usados

| Patrón | Dónde | Configuración |
|---|---|---|
| Altura 0→auto (acordeón) | ItemCard edit, Step2 add form, Step6 desglose | `initial: {height:0, opacity:0}` `animate: {height:'auto', opacity:1}` `exit: {height:0, opacity:0}` `duration: 0.2` |
| Aparición con escala (lista) | Step3 personas | `initial: {opacity:0, scale:0.85}` `animate: {opacity:1, scale:1}` `exit: {opacity:0, scale:0.85}` `duration: 0.18` |
| Aparición con desplazamiento y stagger | Step6 person cards | `initial: {opacity:0, y:20}` `animate: {opacity:1, y:0}` `delay: index×0.08` `duration: 0.3` |
| Layout reflow | ItemCard (expand/collapse), Step3 grid | `motion.div layout` + `transition: {layout: {duration:0.22, ease:'easeInOut'}}` |
| Transición entre íconos | Botón pagado Step6 | `AnimatePresence mode="wait"` — spring en checkmark, 0.12s en emoji |
| Tap feedback | `PersonAvatar` con toggle | `active:scale-90 transition-transform` (CSS, no framer) |

### Animaciones CSS puras
- Skeleton loader: `animate-pulse` (Tailwind built-in)
- Spinner OCR: `animate-spin` (Tailwind built-in)
- Transición de borde/sombra avatar: `transition: border-color 0.15s, box-shadow 0.15s`
- Barra de progreso del stepper: `transition-all duration-300`

---

## 7. Interacciones y feedback

### Haptic feedback (`useHaptic`)

`navigator.vibrate` se llama en:
- Tap en zona drag & drop o cámara → `haptic()` (default: `[10]` ms)
- Agregar ítem → `haptic()`
- Agregar persona → `haptic()`
- Completar Step5 (continuar a resultado) → `haptic([50, 30, 50])` (patrón doble)
- Usar foto → `haptic([50, 30, 50])` (éxito OCR)
- Botones WhatsApp y pagado en Step6 → `haptic()`

### Estados `active:` (feedback táctil visual)
- Botones primarios: `active:opacity-80`
- Botones secundarios: `active:opacity-70`
- Botón pagado: `active:scale-90 transition-all`
- PersonAvatar interactivo: `active:scale-90 transition-transform`

---

## 8. Tipografía en uso

| Contexto | Clases | Resultado visual |
|---|---|---|
| Títulos de paso (h2) | `text-xl font-display font-bold` | Playfair Display 700, ~20px |
| Total principal (Step6) | `text-5xl font-display font-bold` | Playfair Display 700, ~48px |
| Total por persona (Step6) | `text-2xl font-display font-bold` | Playfair Display 700, ~24px |
| Nombre app (Step1) | `text-4xl font-display font-bold` | Playfair Display 700, ~36px |
| Nombres de personas | `font-display font-bold` | Playfair Display 700 |
| Subtotales / precios destacados | `font-bold text-lg` | DM Sans 700, ~18px |
| Cuerpo general | `text-sm` | DM Sans 400/500, ~14px |
| Etiquetas | `text-xs font-semibold uppercase tracking-wide` | DM Sans 600, ~12px |
| Datos secundarios / ítems | `text-xs` | DM Sans 400, ~12px |
| Etiquetas de stepper | `text-[10px] font-medium` | DM Sans 500, 10px |
| Subtotales barra Step4 | `text-[10px] font-semibold` | DM Sans 600, 10px |

---

## 9. Reglas y restricciones de diseño

1. **Nunca** escribir colores hex directamente en componentes — usar `var(--color-*)` o tokens `brand.*`.
2. **Sin toggle de tema** — la app está siempre en modo oscuro.
3. **Mobile-first** — ancho objetivo 375–430px; nada debe romperse en desktop (centrado con max-w).
4. **Fuentes externas** — Playfair Display y DM Sans se cargan de Google Fonts en `index.html` con `preconnect`. Pesos cargados: Playfair 700, DM Sans 400/500/600/700.
5. **Cero colores de marca hardcodeados** — excepción única: `bg #128C7E` del botón WhatsApp (color oficial de la marca WhatsApp).
6. **`--color-white`** es `#ffffff` puro — para color de texto sobre fondos oscuros.
7. **`rgba()` inline** — cuando se necesita transparencia puntual sin token Tailwind se usa `rgba(hex, alpha)` en `style={{}}`. Patrón habitual: `rgba(91,91,214,0.X)` para púrpura con opacidad.
8. **Cambiar la paleta completa** → editar únicamente el bloque `── PALETTE ──` en `src/theme.css`. Todos los componentes se actualizan automáticamente.
