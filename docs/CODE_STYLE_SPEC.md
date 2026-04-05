# CODE_STYLE_SPEC — Estilo de código SplitBill

Guía de estilo para el proyecto React + Vite + TypeScript + Tailwind CSS.

**Bases de referencia:**
- [Airbnb JavaScript/TypeScript Style Guide](https://github.com/airbnb/javascript)
- [React Docs — Best Practices](https://react.dev/learn)
- [Tailwind CSS — Core Concepts](https://tailwindcss.com/docs)

Donde hay conflicto entre guías, la adaptación al proyecto tiene prioridad.
Las decisiones tomadas con margen de elección están marcadas con **`⚠️ OPCIÓN`** para revisión.

**Estado actual:** el proyecto no tiene ESLint configurado. Las reglas de la
sección TypeScript marcadas con 🔒 están forzadas por el compilador vía `tsconfig.json`.

---

## Índice

1. [TypeScript](#1-typescript)
2. [Archivos y estructura](#2-archivos-y-estructura)
3. [Componentes React](#3-componentes-react)
4. [Hooks](#4-hooks)
5. [Imports y exports](#5-imports-y-exports)
6. [Naming conventions](#6-naming-conventions)
7. [Estilos: Tailwind + CSS vars](#7-estilos-tailwind--css-vars)
8. [Funciones y variables](#8-funciones-y-variables)
9. [Manejo de errores](#9-manejo-de-errores)
10. [Anti-patrones prohibidos](#10-anti-patrones-prohibidos)
11. [Resumen de decisiones `⚠️ OPCIÓN`](#11-resumen-de-decisiones-opción)

---

## 1. TypeScript

### 1.1 Configuración del compilador (tsconfig.json)
Las siguientes flags están activas y se respetan como contratos irrevocables:

| Flag | Efecto |
|---|---|
| 🔒 `strict: true` | Activa `strictNullChecks`, `strictFunctionTypes`, `noImplicitAny`, etc. |
| 🔒 `noUnusedLocals` | Error si se declara una variable local que no se usa |
| 🔒 `noUnusedParameters` | Error si un parámetro de función no se usa |
| 🔒 `noFallthroughCasesInSwitch` | Error si un `case` cae al siguiente sin `break`/`return` |
| 🔒 `isolatedModules` | Cada archivo se transpila de forma independiente (sin inferencia cross-file) |

### 1.2 Tipos: `interface` vs `type`

**Usa `interface` para formas de objeto:**
```ts
// ✅ Bien
interface PersonAvatarProps {
  name: string;
  size?: 'sm' | 'md';
  assigned?: boolean;
}

// ✅ Bien — tipos de datos del dominio
interface BillItem {
  id: string;
  price: number;
}
```

**Usa `type` para uniones, intersecciones y aliases primitivos:**
```ts
// ✅ Bien
type TipType = 'percent' | 'fixed';
type EntryMode = 'scan' | 'manual';

// ✅ Bien — union de acciones del reducer
type BillAction =
  | { type: 'ADD_ITEM'; item: BillItem }
  | { type: 'REMOVE_ITEM'; id: string };
```

> ⚠️ **OPCIÓN:** Airbnb no diferencia claramente entre `interface` y `type`.
> Esta regla (interface para objetos, type para uniones) sigue la convención
> del equipo TypeScript y la práctica real del codebase actual.

### 1.3 Prohibido: `any`

Nunca usar el tipo `any`. Alternativas:
```ts
// ❌ Prohibido
const data: any = response.json();

// ✅ Usar unknown para valores desconocidos y narrowing
const data: unknown = response.json();
if (typeof data === 'string') { /* ... */ }

// ✅ Tipar explícitamente las respuestas de API
const data = await response.json() as { error?: string };

// ✅ Usar genéricos cuando aplique
function identity<T>(val: T): T { return val; }
```

### 1.4 Tipos de retorno en funciones

**Funciones de utilidad pura:** siempre declarar el tipo de retorno explícitamente.
```ts
// ✅ Bien
export function calculateTax(subtotal: number, taxPercent: number, taxIncluded: boolean): number {
  ...
}

export function formatCOP(amount: number): string {
  ...
}
```

**Componentes React y event handlers:** se puede omitir (inferencia suficiente).
```ts
// ✅ Bien — React infiere JSX.Element
export default function PersonAvatar({ name }: PersonAvatarProps) {
  return <div>...</div>;
}

// ✅ Bien — void inferido en handlers
function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  ...
}
```

> ⚠️ **OPCIÓN:** Airbnb recomienda tipos de retorno explícitos en todo. Aquí
> se relaja para componentes y handlers porque la inferencia es exacta y el
> tipo explícito (`JSX.Element | null`) agrega ruido sin beneficio real.

### 1.5 Aserciones de tipo

Usar `as` solo cuando el tipo es imposible de inferir y está garantizado en runtime:
```ts
// ✅ Bien — respuesta de API tipada manualmente
const data = await response.json() as { items: RawItem[] };

// ✅ Bien — cast de step dentro de rango conocido
dispatch({ type: 'SET_STEP', step: (state.step + 1) as BillState['step'] });

// ❌ Evitar — silencia errores reales
const el = document.getElementById('root') as HTMLElement; // ok si ya lo validaste
const el = document.getElementById('root')!;              // ok solo si SEGURO no es null
```

### 1.6 Enums

No usar `enum`. Preferir `const` objects o union types:
```ts
// ❌ Evitar
enum TipType { Percent, Fixed }

// ✅ Bien
type TipType = 'percent' | 'fixed';

// ✅ Bien si necesitas iterar los valores
const TIP_TYPES = ['percent', 'fixed'] as const;
type TipType = typeof TIP_TYPES[number];
```

> ⚠️ **OPCIÓN:** Airbnb permite enums. Esta restricción sigue la recomendación
> de Matt Pocock y el equipo de TS para evitar la emisión de JS extra y los
> problemas de reverse-mapping.

### 1.7 Narrowing y guardas de tipo

Preferir narrowing con `typeof`, `instanceof` o discriminated unions antes de `as`:
```ts
// ✅ Bien
if (err instanceof Error) {
  setError(err.message);
} else {
  setError('Error desconocido');
}

// ✅ Bien — discriminated union (BillAction)
switch (action.type) {
  case 'ADD_ITEM':
    return { ...state, items: [...state.items, action.item] }; // TS sabe que action.item existe
}
```

---

## 2. Archivos y estructura

### 2.1 Naming de archivos

| Contenido | Convención | Ejemplo |
|---|---|---|
| Componente React | PascalCase + `.tsx` | `PersonAvatar.tsx` |
| Hook personalizado | camelCase + `.ts` | `useBillSplit.ts` |
| Función/utilidad | camelCase + `.ts` | `calculations.ts`, `formatCurrency.ts` |
| Tipos/interfaces | camelCase + `.ts` | `bill.ts` |
| Contexto | PascalCase + `.tsx` | `BillContext.tsx` |
| Configuración | camelCase + extensión propia | `tailwind.config.js` |

### 2.2 Estructura de carpetas

```
src/
  components/
    steps/      ← componentes de pantalla completa (un archivo por paso)
    ui/         ← componentes reutilizables puros
  context/      ← contextos de React (estado global)
  hooks/        ← hooks personalizados
  types/        ← interfaces y tipos del dominio
  utils/        ← funciones puras, sin efectos secundarios
  theme.css     ← ÚNICA fuente de paleta de colores
  main.tsx      ← punto de entrada
```

### 2.3 Qué va en cada carpeta

**`components/steps/`** — componentes que representan una pantalla completa.
No se reutilizan en otros pasos. Pueden contener sub-componentes locales.

**`components/ui/`** — componentes reutilizables sin estado de dominio.
Reciben todo lo que necesitan vía props. No llaman a `useBill()` directamente.

> ⚠️ **OPCIÓN:** `PersonChips` y `PersonAvatar` son excepciones — son ui/ pero
> sí dependen de los tipos del dominio (`Person`). La regla "ui/ no importa de
> context/" aplica a la instancia de contexto, no a los tipos.

**`hooks/`** — hooks que encapsulan lógica con efectos o estado.
Un hook por archivo. El nombre siempre empieza con `use`.

**`utils/`** — funciones puras sin hooks, sin imports de React.
Testeables unitariamente sin render. Exportadas con nombre (no default).

### 2.4 Sub-componentes locales

**Permitido:** definir sub-componentes dentro del mismo archivo si:
- Solo se usan en ese archivo
- Son demasiado pequeños para merecer un archivo propio
- No necesitan ser testeados de forma independiente

```ts
// ✅ Bien — sub-componente local en Step5TaxTip.tsx
function ToggleButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button ...>{label}</button>;
}

// ✅ Bien — sub-componente con lógica propia en Step6Result.tsx
function PersonCard({ split, taxIncluded, tipIsVoluntary, index }: PersonCardProps) {
  const [open, setOpen] = useState(false);
  ...
}
```

> ⚠️ **OPCIÓN:** Airbnb y algunas guías de React recomiendan un componente por
> archivo estrictamente. Aquí se permiten sub-componentes locales para evitar
> fragmentación excesiva en pantallas de baja complejidad.

### 2.5 Sin archivos barrel (`index.ts`)

No crear `index.ts` que re-exporte desde una carpeta. Importar siempre desde la ruta exacta:
```ts
// ✅ Bien
import PersonAvatar from '../ui/PersonAvatar';
import { formatCOP } from '../../utils/formatCurrency';

// ❌ Evitar
import { PersonAvatar, PersonChips } from '../ui'; // requiere index.ts
```

> ⚠️ **OPCIÓN:** Barrels son convenientes en librerías grandes, pero en este
> proyecto causan más complejidad de la que resuelven y complican el tree-shaking
> de Vite en algunos casos.

---

## 3. Componentes React

### 3.1 Declaración: `function` declaration, no arrow

**Componentes exportados:** siempre `export default function`, nunca `const` + arrow:
```ts
// ✅ Bien
export default function PersonAvatar({ name, size = 'sm' }: PersonAvatarProps) {
  return <img ... />;
}

// ❌ Evitar
const PersonAvatar = ({ name }: PersonAvatarProps): JSX.Element => {
  return <img ... />;
};
export default PersonAvatar;
```

> ⚠️ **OPCIÓN:** Ambos son válidos según Airbnb y React docs. Se prefieren
> declarations porque: (1) son hoisted (útil para sub-componentes locales),
> (2) el nombre siempre aparece en stack traces, (3) coincide con el patrón
> actual de todo el codebase.

### 3.2 Props interface

Siempre definir una interface para las props, encima del componente:
```ts
// ✅ Bien
interface StepFooterProps {
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  backLabel?: string;
}

export default function StepFooter({ onBack, onContinue, continueLabel = 'Continuar →' }: StepFooterProps) {
  ...
}
```

Nunca inline en los parámetros para componentes con más de 2 props:
```ts
// ❌ Evitar para componentes reales
function Card({ title, value, onClick }: { title: string; value: number; onClick: () => void }) {
```

Excepción permitida: sub-componentes locales simples con ≤ 3 props (ver §2.4).

### 3.3 Valores por defecto

Usar destructuring defaults, no `props.x ?? default` dentro del cuerpo:
```ts
// ✅ Bien
function PersonAvatar({ name, size = 'sm', assigned = false }: PersonAvatarProps) {

// ❌ Evitar
function PersonAvatar(props: PersonAvatarProps) {
  const size = props.size ?? 'sm';
```

### 3.4 No usar `React.FC`

```ts
// ❌ Evitar
const MyComponent: React.FC<MyProps> = ({ name }) => { ... };

// ✅ Bien
function MyComponent({ name }: MyProps) { ... }
```

> ⚠️ **OPCIÓN:** `React.FC` fue removido de la plantilla CRA en 2022 y Airbnb
> también lo evita. Razones: infiere `children` implícitamente (ya no en React 18
> pero confunde), y el tipo de retorno es más restrictivo de lo necesario.

### 3.5 Condicionales en JSX

Preferir `&&` para renders simples, ternario para alternativas, nunca `if` inline complejo:
```ts
// ✅ Bien — renderizado condicional simple
{error && <ErrorMessage message={error} />}

// ✅ Bien — alternativa binaria
{isDragActive ? '📂' : '📷'}

// ✅ Bien — múltiples condiciones → extraer variable
const content = isLoading ? <Spinner /> : isDone ? <Result /> : <Form />;
return <div>{content}</div>;

// ❌ Evitar — anidamiento de ternarios en JSX
{isLoading ? <Spinner /> : isDone ? <Result /> : error ? <Error /> : <Form />}
```

### 3.6 Listas: siempre `key` estable

```ts
// ✅ Bien — key estable del dominio
{state.items.map(item => <ItemCard key={item.id} item={item} />)}

// ✅ Bien — key compuesta cuando no hay ID único
{splits.map((split, i) => <PersonCard key={split.person.id} index={i} />)}

// ❌ Nunca usar index como key en listas reordenables
{items.map((item, i) => <Card key={i} />)}
```

### 3.7 Event handlers: `function` declaration dentro del componente

```ts
// ✅ Bien — function declaration (hoisted, nombre en stack trace)
function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  onSave({ name: name.trim(), quantity: qtyNum, price });
}

// ✅ Bien — arrow para handler muy corto o que necesita clausura inmediata
<button onClick={() => setOpen(o => !o)}>

// ❌ Evitar para handlers con lógica real
const handleSubmit = (e: React.FormEvent) => { ... };
```

> ⚠️ **OPCIÓN:** El codebase actual usa `function` declarations para todos los
> handlers con lógica. Se mantiene este patrón para consistencia.

---

## 4. Hooks

### 4.1 Naming

Siempre `use` + PascalCase. El nombre describe qué hace, no cómo:
```ts
// ✅ Bien
useBillSplit     // produce el split calculado
useBillScanner   // encapsula el flujo de escaneo
useHaptic        // da acceso a vibración
useBill          // accede al contexto de la factura

// ❌ Evitar
useData, useHelper, useUtils
```

### 4.2 `useMemo` y `useCallback`

Solo cuando hay un problema de performance demostrable o la referencia estable es necesaria:

```ts
// ✅ Bien — DiceBear genera SVG con cómputo no trivial; el memo evita re-generarlo en cada render
const svgDataUri = useMemo(() => {
  const avatar = createAvatar(funEmoji, { seed: name, size: px });
  return avatar.toDataUri();
}, [name, px]);

// ✅ Bien — useCallback requerido porque la función es dependencia de useDropzone
const onDrop = useCallback((accepted: File[]) => {
  if (accepted[0]) setFile(accepted[0]);
}, []);

// ❌ Evitar — premature optimization
const handleClick = useCallback(() => setOpen(true), []); // sin necesidad real
```

> ⚠️ **OPCIÓN:** El criterio "solo cuando hay razón demostrable" es más
> restrictivo que "siempre memoizar handlers". Sigue la recomendación actual
> de los React docs (2024).

### 4.3 `useEffect`

Preferir cero efectos. Cuando sean necesarios:
- La dependencia array debe ser exhaustiva (no silenciar advertencias del linter)
- No usar efectos para sincronizar estado derivado — calcular en el render
- No usar efectos para responder a eventos del usuario — usar event handlers

```ts
// ✅ Bien — sincronizar estado local cuando la prop initial cambia
useEffect(() => {
  if (initial) {
    setName(initial.name);
    setQtyStr(String(initial.quantity));
    setPriceStr(String(initial.price));
  }
}, [initial]);

// ❌ Evitar — derivar estado con useEffect
useEffect(() => {
  setSubtotal(calculateSubtotal(items)); // calcular en render directamente
}, [items]);
```

### 4.4 `useState` — tipado

El tipo se infiere si el valor inicial lo define. Declarar explícitamente cuando el valor inicial es `null` o `undefined`:
```ts
// ✅ Bien — inferido
const [open, setOpen] = useState(false);
const [name, setName] = useState('');

// ✅ Bien — explícito cuando el tipo no se puede inferir del valor inicial
const [preview, setPreview] = useState<string | null>(null);
const [error, setError] = useState<string | null>(null);
const [selectedFile, setSelectedFile] = useState<File | null>(null);
```

### 4.5 `useReducer` — el reducer es función pura exportable

El reducer no debe estar anidado en el componente ni en el Provider.
Debe ser una función pura testeable sin React:
```ts
// ✅ Bien — función pura separada
function billReducer(state: BillState, action: BillAction): BillState {
  switch (action.type) { ... }
}

export function BillProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(billReducer, initialState);
  ...
}
```

---

## 5. Imports y exports

### 5.1 Orden de imports

**⚠️ OPCIÓN:** El orden siguiente es la convención del proyecto (no forzada por linter actualmente):

```ts
// 1. React (siempre primero si se necesita)
import { useState, useCallback, useMemo } from 'react';

// 2. Librerías externas (orden alfabético dentro del grupo)
import { AnimatePresence, motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';

// 3. Contextos y hooks internos
import { useBill } from '../../context/BillContext';
import { useHaptic } from '../../hooks/useHaptic';

// 4. Componentes internos
import PersonAvatar from '../ui/PersonAvatar';
import StepFooter from '../ui/StepFooter';

// 5. Utilidades y tipos internos
import { calculateSubtotal } from '../../utils/calculations';
import { formatCOP } from '../../utils/formatCurrency';
import type { BillItem, Person } from '../../types/bill';
```

Línea en blanco entre cada grupo. Sin línea en blanco dentro de un grupo.

### 5.2 Exports

| Tipo de archivo | Export |
|---|---|
| Componente React (cualquiera) | `export default function` |
| Hook personalizado | named export: `export function useBillSplit()` |
| Función de utilidad | named export: `export function calculateTax(...)` |
| Tipos / interfaces | named export: `export interface BillItem` |
| Constantes del dominio | named export: `export const PERSON_COLORS = [...]` |

**Nunca re-exportar desde archivos barrel.**

### 5.3 Import de tipos

Usar `import type` cuando solo se importa un tipo (ayuda a `isolatedModules`):
```ts
// ✅ Bien
import type { BillItem, PersonSplit } from '../../types/bill';

// ✅ También válido cuando se mezcla tipo y valor en el mismo import
import { BillState, PERSON_COLORS } from '../../types/bill'; // PERSON_COLORS es valor
```

### 5.4 Rutas relativas

Siempre rutas relativas (`../../`). No hay path aliases configurados en tsconfig.
```ts
// ✅ Bien
import { useBill } from '../../context/BillContext';

// ❌ No disponible (no hay @/ alias configurado)
import { useBill } from '@/context/BillContext';
```

> ⚠️ **OPCIÓN:** Airbnb no opina sobre path aliases. Configurar `@/` en tsconfig
> + vite.config sería un cambio sencillo si los imports relativos se vuelven
> demasiado profundos. Por ahora la estructura es lo suficientemente plana.

---

## 6. Naming conventions

### 6.1 Variables y funciones

| Tipo | Convención | Ejemplo |
|---|---|---|
| Variables locales | camelCase | `personSubtotal`, `assignedCount` |
| Funciones | camelCase | `calculateTax`, `formatCOP` |
| Event handlers | `handle` + PascalCase del evento | `handleSubmit`, `handleTaxChange`, `handleRetake` |
| Callbacks prop | `on` + PascalCase | `onSave`, `onToggle`, `onBack` |
| Booleanos | `is/has/can/should` + PascalCase | `isLoading`, `isDone`, `canContinue`, `isDragActive` |
| Constantes de módulo | SCREAMING_SNAKE_CASE | `MAX_DIMENSION`, `JPEG_QUALITY`, `PERSON_COLORS` |
| Refs | camelCase + `Ref` | `fileInputRef`, `inputRef` |

### 6.2 Componentes y tipos

| Tipo | Convención | Ejemplo |
|---|---|---|
| Componente React | PascalCase | `PersonAvatar`, `StepFooter` |
| Interface de props | PascalCase + `Props` | `PersonAvatarProps`, `StepFooterProps` |
| Interface de dominio | PascalCase (sin sufijo) | `BillItem`, `Person`, `BillState` |
| Interface de resultado | PascalCase | `PersonSplit`, `BillSummary`, `ScanResult` |
| Type union | PascalCase | `TipType`, `EntryMode`, `BillAction` |
| Enum-like const | SCREAMING_SNAKE_CASE | `PERSON_COLORS` |

### 6.3 CSS / Tailwind

Las clases de Tailwind no tienen convención de naming propia (son utilidades atómicas).
Los nombres de variables CSS siguen `--color-nombre` (sin abreviaturas):
```css
/* ✅ Bien */
--color-gold
--color-muted-surface
--glow-purple

/* ❌ Evitar */
--clr-gld
--muted-srf
```

---

## 7. Estilos: Tailwind + CSS vars

### 7.1 Regla fundamental

**Nunca** escribir colores hex directamente en componentes.
Siempre usar `var(--color-*)` en `style={{}}` o tokens `brand.*` en clases Tailwind.

```tsx
// ✅ Bien — CSS var en style prop
<div style={{ color: 'var(--color-gold)' }}>

// ✅ Bien — token Tailwind
<div className="text-brand-gold">

// ✅ Bien — token con opacidad
<div className="bg-brand-rose/50">

// ❌ Prohibido — hex hardcodeado en componente
<div style={{ color: '#f5c542' }}>
<div className="text-[#f5c542]">
```

Excepción única aceptada: `backgroundColor: '#128C7E'` en el botón WhatsApp
(color oficial de marca externa, no de la paleta de la app).

### 7.2 Cuándo usar `className` vs `style`

| Usar `className` (Tailwind) | Usar `style={{}}` (CSS var) |
|---|---|
| Espaciado (`p-`, `m-`, `gap-`) | Colores de la paleta (`color`, `backgroundColor`, `borderColor`) |
| Tamaños (`w-`, `h-`, `text-`) | Efectos derivados (`boxShadow`, `background` gradient) |
| Layout (`flex`, `grid`, `overflow-`) | Animaciones JavaScript-driven |
| Interactividad (`active:`, `disabled:`, `transition-`) | Valores computados dinámicamente |
| Tipografía (`font-`, `tracking-`, `uppercase`) | `accentColor` en sliders |

> ⚠️ **OPCIÓN:** La mezcla `className` + `style` es inusual en proyectos que
> usan Tailwind de forma estándar. Aquí es necesaria porque las CSS vars con
> opacidad requieren el patrón `rgb(var()/alpha)` de Tailwind, que solo funciona
> si la variable está registrada en `tailwind.config.js`. Para valores de color
> simples sin modificador de opacidad, `style={{}}` con `var()` es aceptable.

### 7.3 Orden dentro de un elemento JSX

**⚠️ OPCIÓN:** Convención del proyecto para la legibilidad:
```tsx
<div
  className="flex flex-col gap-3 rounded-2xl p-4 border"   // ← primero Tailwind (layout + forma)
  style={{ backgroundColor: 'var(--color-surface)', borderColor: 'rgba(255,255,255,0.06)' }}  // ← luego colors
>
```

Dentro de `className`: layout → espaciado → tipografía → interactividad.
No hay un orden forzado, pero agrupar semánticamente es preferible.

### 7.4 Valores `rgba()` inline

Cuando se necesita transparencia puntual sin token Tailwind, usar `rgba` con los valores RGB de la paleta:

```tsx
// ✅ Bien — transparencia puntual documentada
style={{ backgroundColor: 'rgba(91,91,214,0.08)' }}  // --color-purple al 8%

// ✅ Bien — cuando el valor viene de una CSS var con alpha token
className="bg-brand-purple/10"  // equivalente al anterior si está en tailwind.config

// ❌ Evitar — hex con transparencia (menos legible)
style={{ backgroundColor: '#5b5bd614' }}
```

> ⚠️ **OPCIÓN:** Los valores RGB hardcodeados en `rgba()` duplican la información
> de `theme.css`. Preferir tokens Tailwind (`/10`, `/20`, etc.) cuando estén
> disponibles. Los `rgba()` inline son aceptados solo para valores de opacidad
> que no tienen un equivalente de token Tailwind razonable.

### 7.5 Clases Tailwind arbitrarias

Limitar el uso de valores arbitrarios `[...]` de Tailwind a casos sin alternativa:
```tsx
// ✅ Aceptado — tamaño específico sin token estándar
className="max-w-[430px]"
className="text-[10px]"

// ❌ Evitar — hex en clase arbitraria
className="text-[#f5c542]"     // usar var() en style={{}} o token brand.*
className="bg-[#252d3d]"       // ídem
```

---

## 8. Funciones y variables

### 8.1 `const` por defecto, `let` solo cuando se reasigna

```ts
// ✅ Bien
const subtotal = calculateSubtotal(state.items);
const isValid = name.trim().length > 0 && price > 0;

// ✅ Bien — let cuando hay reasignación real
let { width, height } = img;
if (width > MAX_DIMENSION) {
  height = Math.round((height * MAX_DIMENSION) / width);
  width = MAX_DIMENSION;
}

// ❌ Evitar
let subtotal = calculateSubtotal(state.items); // nunca se reasigna
```

### 8.2 Funciones puras: sin efectos secundarios

Las funciones en `utils/` no deben tener efectos secundarios, no pueden importar hooks
y deben devolver el mismo resultado para los mismos argumentos:
```ts
// ✅ Bien — función pura
export function calculateTip(subtotal: number, state: BillState): number {
  if (state.tipType === 'fixed') return state.tipAmount;
  const preTaxBase = state.taxIncluded ? subtotal / (1 + state.taxPercent / 100) : subtotal;
  return roundUpTo100(preTaxBase * state.tipPercent / 100);
}

// ❌ Incorrecto en utils/ — tiene efecto secundario
export function calculateAndLogTip(subtotal: number, state: BillState): number {
  const result = ...;
  console.log(result); // efecto secundario
  return result;
}
```

### 8.3 Funciones helper privadas

Las funciones helper que no necesitan ser exportadas se declaran sin `export` en el mismo archivo:
```ts
// ✅ Bien — privada al módulo
function roundUpTo100(amount: number): number {
  return Math.ceil(amount / 100) * 100;
}

// ✅ Bien — exportada porque otros módulos la necesitan
export function roundToNearest100(amount: number): number {
  return Math.round(amount / 100) * 100;
}
```

### 8.4 Early returns

Preferir early returns para reducir el anidamiento:
```ts
// ✅ Bien
async function handleUsePhoto() {
  if (!selectedFile) return;
  setIsLoading(true);
  try { ... } finally { setIsLoading(false); }
}

// ❌ Evitar — anidamiento innecesario
async function handleUsePhoto() {
  if (selectedFile) {
    setIsLoading(true);
    try { ... } finally { setIsLoading(false); }
  }
}
```

### 8.5 Template literals vs concatenación

```ts
// ✅ Bien
const id = `item-${Date.now()}`;

// ❌ Evitar
const id = 'item-' + Date.now();
```

---

## 9. Manejo de errores

### 9.1 `try/catch` con tipado

En TypeScript estricto, el `catch` recibe `unknown`. Siempre hacer narrowing:
```ts
// ✅ Bien
try {
  const { items } = await scanBill(base64, mediaType);
  ...
} catch (err) {
  setError(err instanceof Error ? err.message : 'Error al procesar la factura.');
}

// ❌ Peligroso — asume que err tiene .message
} catch (err: any) {
  setError(err.message);
}
```

### 9.2 Errores silenciosos — solo cuando son realmente opcionales

```ts
// ✅ Bien — clipboard como fallback ya lo maneja el try superior
try {
  await navigator.clipboard.writeText(text);
  setCopied(true);
} catch {
  // clipboard no disponible — degradación silenciosa aceptada
}

// ❌ Evitar — silenciar errores inesperados sin razón
try {
  importantOperation();
} catch { /* nada */ }
```

### 9.3 Siempre proveer acción alternativa al usuario

Siguiendo la guía del CLAUDE.md: todo error en la UI debe tener un camino de salida.
Usar el componente `<ErrorMessage>` con el prop `action`:
```tsx
// ✅ Bien
{error && (
  <ErrorMessage
    message={error}
    action={{ label: 'Ingresar manualmente', onClick: handleManual }}
  />
)}
```

---

## 10. Anti-patrones prohibidos

### 10.1 No mutar el estado directamente
```ts
// ❌ Prohibido
state.items.push(newItem);
state.taxPercent = 8;

// ✅ Bien — siempre via dispatch en el reducer
dispatch({ type: 'ADD_ITEM', item: newItem });
```

### 10.2 No derivar estado con `useEffect`
```ts
// ❌ Evitar
const [subtotal, setSubtotal] = useState(0);
useEffect(() => {
  setSubtotal(calculateSubtotal(state.items));
}, [state.items]);

// ✅ Bien — calcular durante el render
const subtotal = calculateSubtotal(state.items);
```

### 10.3 No usar `index` como `key` en listas mutables
```tsx
// ❌ Prohibido para listas que pueden reordenarse o filtrarse
{items.map((item, i) => <ItemCard key={i} />)}

// ✅ Bien
{items.map(item => <ItemCard key={item.id} />)}
```

### 10.4 No llamar a hooks condicionalmente
```ts
// ❌ Prohibido — viola las reglas de hooks
if (isAdmin) {
  const data = useSomeHook();
}

// ✅ Bien — el hook siempre se llama, la condición va dentro
const data = useSomeHook();
if (!isAdmin) return null;
```

### 10.5 No usar colores hex en componentes
```tsx
// ❌ Prohibido (ver §7.1)
<div style={{ color: '#f5c542' }}>

// ✅ Bien
<div style={{ color: 'var(--color-gold)' }}>
```

### 10.6 No usar `any`
```ts
// ❌ Prohibido (ver §1.3)
const response: any = await fetch(...);
```

### 10.7 No crear abstracciones prematuras
Solo crear helpers, componentes reutilizables o hooks cuando el patrón se repite
**al menos 3 veces** en contextos distintos. Un uso único → inline.

---

## 11. Resumen de decisiones `⚠️ OPCIÓN`

Lista consolidada de todas las decisiones opinionadas para revisión rápida:

| # | Regla | Decisión tomada | Alternativa común |
|---|---|---|---|
| 1 | `interface` vs `type` | `interface` para objetos, `type` para uniones | `type` para todo (Matt Pocock), o `interface` para todo (Airbnb) |
| 2 | Tipos de retorno | Explícitos solo en funciones de utilidad, inferidos en componentes/handlers | Explícitos en todo (Airbnb estricto) |
| 3 | `enum` | Prohibidos — usar union types | Permitidos (Airbnb / TypeScript oficial) |
| 4 | Sub-componentes locales | Permitidos en mismo archivo cuando son locales | Un componente por archivo (estricto) |
| 5 | Archivos barrel | Prohibidos | Usados ampliamente en proyectos grandes |
| 6 | Declaración de componentes | `function` declaration, no arrow | Arrow function + `const` (igualmente común) |
| 7 | Props interface | Siempre interface nombrada, no inline | Inline para componentes pequeños (común) |
| 8 | `React.FC` | Prohibido | Usado en muchos proyectos legacy |
| 9 | Event handlers | `function` declaration dentro del componente | `const` + arrow function |
| 10 | `useMemo`/`useCallback` | Solo con razón demostrable | Siempre para cualquier handler/objeto (premature opt.) |
| 11 | Orden de imports | React → externos → internos (context/hooks → components → utils/types) | Varía; algunos prefieren alfabético sin grupos |
| 12 | Path aliases | Sin alias — rutas relativas | `@/` alias configurado en tsconfig+vite |
| 13 | `className` vs `style` | Tailwind para layout/forma, CSS vars en style para colores | Tailwind para todo (con plugin de CSS vars) |
| 14 | `rgba()` inline | Aceptado para opacidades sin token equivalente | Siempre token Tailwind (requeriría más config) |
| 15 | Abstracción mínima | Repetición ≥ 3 veces antes de extraer | DRY agresivo desde la primera duplicación |
