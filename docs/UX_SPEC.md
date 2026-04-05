# UX_SPEC — Flujo de usuario, navegación y casos borde

Documenta el comportamiento completo de la app desde el punto de vista del usuario.
No describe implementación ni estilos — para eso ver [`DESIGN_SPEC.md`](./DESIGN_SPEC.md)
y [`LOGIC_SPEC.md`](./LOGIC_SPEC.md).

---

## 1. Visión general del flujo

```
┌─────────┐    ┌─────────┐    ┌──────────┐    ┌─────────┐    ┌──────────┐    ┌─────────┐
│  Step 1 │ → │  Step 2 │ → │  Step 3  │ → │  Step 4 │ → │  Step 5  │ → │  Step 6 │
│  Entry  │    │  Review │    │  People  │    │  Assign │    │ Tax/Tip  │    │ Result  │
└─────────┘    └─────────┘    └──────────┘    └─────────┘    └──────────┘    └─────────┘
     ↑               ↑              ↑               ↑               ↑              │
     └───────────────┴──────────────┴───────────────┴───────────────┘              │
                              (botón "← Atrás" en cada paso)                       │
                                                                                    │
                                          "🔄 Nueva cuenta" → RESET → Step 1 ←────┘
```

**Características del flujo:**
- Lineal, sin bifurcaciones permanentes — siempre avanza o retrocede un paso
- Sin enrutamiento de URL: el botón "atrás" del navegador no navega entre pasos
- Sin persistencia: recargar la página reinicia la app desde Step 1
- El Stepper es solo indicador visual — no es interactivo (no permite saltar pasos)
- Step 6 oculta el Stepper para transmitir sensación de "pantalla de resultado final"

---

## 2. Navegación general

### Reglas de avance (`nextStep`)
- Solo avanza si `step < 6`; en Step 6 el botón no llama a `nextStep`
- Cada paso tiene su propia condición de habilitación para "Continuar":

| Paso | Condición para continuar |
|---|---|
| 1 | Sin gate — el avance ocurre al seleccionar flujo (scan o manual) |
| 2 | `items.length ≥ 1` Y todos los ítems tienen `price > 0` |
| 3 | `people.length ≥ 2` |
| 4 | Todos los ítems tienen `assignedTo.length ≥ 1` |
| 5 | Siempre habilitado |
| 6 | N/A (no hay botón "Continuar") |

### Reglas de retroceso (`prevStep`)
- Solo retrocede si `step > 1`
- **No hay re-validación al retroceder**: el usuario puede retroceder, cambiar datos
  y dejar el estado en condición inválida para el paso anterior sin advertencia
- Caso notable: volver de Step 4 a Step 3, eliminar una persona y avanzar a Step 4 →
  los ítems que tenían asignada solo esa persona quedan sin asignar y bloquean el avance

### Haptic feedback en navegación
- Avanzar desde Step 5 a Step 6: patrón doble `[50, 30, 50]` ms
- Acciones exitosas de creación (ítem, persona, OCR): `50` ms (patrón default)
- Botones de compartir / WhatsApp / pagado: `50` ms

---

## 3. Step 1 — Entry

### Función
Punto de entrada único de la app. Permite elegir cómo capturar la factura.

### Estados posibles
```
Idle (vacío)
  ↓ usuario selecciona archivo o arrastra imagen
Preview (imagen seleccionada)
  ↓ toca "Usar esta foto"
Loading (OCR en progreso)
  ↓ OCR exitoso → SET_ITEMS + SET_ENTRY_MODE('scan') → Step 2
  ↓ OCR fallido → Error (con preview aún visible)
```

### Flujo: escanear factura
1. Usuario toca la zona dashed (o arrastra una imagen sobre ella)
2. Se abre el selector de archivo con `capture="environment"` → prefiere cámara trasera en móvil, muestra explorador de archivos en desktop
3. Al seleccionar: se muestra preview de la imagen + botones "Retomar" / "Usar esta foto"
4. "Retomar" → limpia preview, archivo y error; vuelve a la zona de entrada
5. "Usar esta foto":
   - Convierte imagen a base64 JPEG (resize a máx 1200px, calidad 0.82)
   - Muestra skeleton loader + spinner con "Leyendo tu factura..."
   - Llama al Cloudflare Worker `/scan`
   - Si exitoso → ítems cargados, avanza a Step 2 con banner de revisión
   - Si falla → permanece en Step 1, muestra `ErrorMessage` con la vista previa aún activa

### Flujo: ingresar manualmente
1. Usuario toca "✏️ Ingresar manualmente"
2. `SET_ENTRY_MODE('manual')` + `nextStep()` → Step 2 con lista vacía y formulario abierto

### Flujo: drag & drop
1. Usuario arrastra imagen sobre la pantalla
2. La zona dashed cambia visualmente (ícono 📂, borde más visible)
3. Al soltar → mismo flujo que selección de archivo (preview)

### Edge cases — Step 1
| Situación | Comportamiento |
|---|---|
| OCR falla (error de red, timeout, imagen ilegible) | `ErrorMessage` con acción "Ingresar manualmente". El preview de la imagen sigue visible. El usuario puede intentar de nuevo tocando "Usar esta foto" o reencuadrar con "Retomar" |
| Imagen supera 8MB base64 | Worker responde 413; aparece el mensaje de error del Worker |
| Worker tarda más de 25s | Worker responde 504 "El servicio tardó demasiado. Intenta de nuevo." |
| OCR extrae ítems con price=0 | El Worker los filtra antes de retornar; nunca llegan al cliente |
| OCR retorna JSON inválido | Worker responde 422; mensaje amigable al usuario |
| OCR retorna lista vacía | Worker responde 422 "No se encontraron ítems en la factura." |
| 20+ requests desde la misma IP en 1h | Worker responde 429 "Demasiadas solicitudes..." |
| Drag & drop activo durante loading | Desactivado — `getRootProps()` no se aplica cuando `isLoading=true` o `preview!=null` |
| Drag & drop activo durante preview | Desactivado — misma condición |
| El usuario no tiene cámara (desktop) | `capture="environment"` es ignorado; el browser muestra el selector de archivos normal |
| `VITE_WORKER_URL` no configurado | Error inmediato "VITE_WORKER_URL no está configurado. Revisa tu archivo .env" |

---

## 4. Step 2 — Review

### Función
Lista editable de ítems de la factura. Permite agregar, editar y eliminar ítems.

### Estado inicial según `entryMode`
| `entryMode` | Estado inicial de Step 2 |
|---|---|
| `'scan'` | Lista pre-poblada con ítems del OCR; formulario cerrado; banner de revisión visible |
| `'manual'` | Lista vacía; formulario de agregar ítem abierto automáticamente |

### Interacciones con ítems

**Agregar ítem:**
1. Usuario toca "+ Agregar ítem" → el formulario `ItemForm` aparece con animación (height 0→auto)
2. Completa nombre, cantidad, precio unitario → toca "Agregar"
3. Ítem añadido con `id: item-${Date.now()}` y `assignedTo: []`
4. Formulario se cierra; nuevo ítem aparece en la lista

**Editar ítem (inline en ItemCard):**
1. Usuario toca ✏️ → sección de edición se expande con animación (height 0→auto)
2. Los campos se pre-rellenan con los valores actuales
3. "Guardar" → valida (nombre no vacío, precio > 0, cantidad ≥ 1) → actualiza ítem → colapsa
4. "Cancelar" → revierte los campos a los valores originales → colapsa

**Eliminar ítem:**
1. Usuario toca 🗑️ → ítem se elimina inmediatamente sin confirmación

### Barra de subtotal
Aparece en la parte inferior de la lista (encima del footer) solo cuando `items.length > 0`.
Se actualiza en tiempo real con cada cambio de precio o cantidad.

### Edge cases — Step 2
| Situación | Comportamiento |
|---|---|
| Lista vacía + formulario cancelado | El botón "Cancelar" del formulario es no-funcional cuando `items.length === 0`; el formulario no se puede cerrar hasta que exista al menos un ítem |
| Ítem con price=0 | La fila continúa visible en la lista; el botón "Continuar" queda deshabilitado hasta que todos los precios sean > 0 |
| Agregar segundo ítem mientras el formulario de edición inline está abierto | Ambos conviven simultáneamente (el formulario de edición no bloquea el de agregado) |
| Borrar el único ítem | La lista queda vacía, el botón "Continuar" se deshabilita, el mensaje "Sin ítems aún" reaparece |
| Precio ingresado con caracteres no numéricos | Los campos de precio filtran caracteres no-dígitos (`/\D/g` strip) — no es posible ingresar letras o símbolos |
| Cantidad vacía al perder foco | Se reinicia a `'1'` automáticamente |
| Nombre vacío al guardar | El formulario ignora el submit (el botón permanece activo pero la validación lo bloquea internamente) |
| Editar ítem que tiene personas asignadas | La edición actualiza el precio/nombre/cantidad pero respeta las asignaciones existentes. Si se modifica el precio, el reparto en Step 4 se recalcula automáticamente |

---

## 5. Step 3 — People

### Función
Agregar las personas que van a dividir la cuenta.

### Agregar persona
1. Usuario escribe el nombre en el input
2. Toca "Agregar" o presiona Enter
3. La persona aparece como card en el grid (2 columnas), animada con scale 0.85→1
4. El input se limpia y el foco vuelve al input automáticamente
5. Se asigna el siguiente color de la paleta de 20 colores (cíclico)

### Eliminar persona
1. Usuario toca ✕ en la esquina superior derecha de la card
2. La persona se elimina del grid (animación scale 1→0.85)
3. **Cascada:** todas sus asignaciones en todos los ítems se eliminan automáticamente
4. Si en Step 4 esta persona era la única asignada a algún ítem, ese ítem queda sin asignar
5. No hay diálogo de confirmación

### Edge cases — Step 3
| Situación | Comportamiento |
|---|---|
| Nombre vacío | El botón "Agregar" está deshabilitado (`disabled={!inputName.trim()}`); Enter no hace nada |
| Nombre con solo espacios | `trim()` lo trata como vacío → no se agrega |
| Dos personas con el mismo nombre | Se permiten — cada una recibe su propio `id` único pero el mismo avatar (el seed de DiceBear es el nombre) |
| Solo 1 persona | "Continuar" deshabilitado; el texto "Agrega al menos 2 personas" es visible |
| Más de 20 personas | Se permiten; los colores se repiten cíclicamente (persona 21 = mismo color que persona 1) |
| Eliminar persona estando en Step 3 después de haber asignado en Step 4 | La cascada elimina sus asignaciones; al volver a Step 4 los ítems afectados aparecerán sin asignar |
| Persona eliminada en Step 3 reduce el conteo a < 2 | "Continuar" se bloquea automáticamente |

---

## 6. Step 4 — Assign

### Función
Asignar cada ítem a las personas que lo consumieron. División equitativa entre todos los asignados.

### Interacción
- Para cada ítem: una fila de avatares (PersonChips, scrollable horizontal)
- Tocar un avatar lo asigna; tocar de nuevo lo desasigna
- El precio por persona (`c/u`) aparece junto al ítem si hay más de 1 persona asignada
- El badge de progreso (Ej. "3/5 asignados") cambia de color: dorado cuando hay pendientes, púrpura cuando están todos asignados

### Barra sticky de subtotales
- Muestra el subtotal acumulado de cada persona en tiempo real
- El avatar de una persona aparece con borde púrpura (estado "asignado") cuando su subtotal > 0
- Se actualiza instantáneamente con cada tap

### Ítems sin asignar
- Borde izquierdo dorado (3px) + ícono ⚠️
- El botón "Continuar" permanece deshabilitado mientras exista al menos un ítem sin asignar

### Edge cases — Step 4
| Situación | Comportamiento |
|---|---|
| Ítem asignado a todas las personas | Precio `/ n` correctamente; no hay límite máximo de asignaciones por ítem |
| Desasignar la única persona de un ítem | El ítem vuelve a estado "sin asignar" (borde dorado + ⚠️); "Continuar" se bloquea |
| Un ítem asignado a 1 persona luego a 2 | El precio por persona se recalcula instantáneamente |
| Persona con $0 asignado | Su avatar en la barra sticky aparece sin borde (estado inactivo); el usuario puede continuar — una persona con $0 es válida (no consumió nada) |
| Cantidad de personas que no divide exactamente el precio | La división es por punto flotante (`price * qty / assignedTo.length`); el redondeo al $100 ocurre en Step 6, no aquí |
| PersonChips overflow (muchas personas) | `overflow-x-auto scrollbar-hide` — desplazamiento horizontal suave sin scrollbar visible |

---

## 7. Step 5 — Tax & Tip

### Función
Configurar IVA y propina. Siempre se puede avanzar (sin validación de bloqueo).

### Sección IVA

**Toggle "¿Precios con IVA incluido?"**
- **Sí (default):** el IVA ya está dentro de los precios. Solo se muestra informativo en el resumen. No se suma al total.
- **No:** el IVA se calcula sobre el subtotal y se suma al total final.

El slider va de 0% a 30%; el input numérico acepta 0–100%.
Valores fuera de rango se clampean a [0, 100] en el handler.
Default: 8% (IVA típico restaurantes Colombia).

### Sección Propina

| Modo | Comportamiento |
|---|---|
| `%` (default) | Calcula sobre base pre-IVA; redondea al $100 superior. Slider 0–30%, input 0–100%. Default 10%. |
| `Monto fijo` | Valor exacto en pesos colombianos ingresado por el usuario. Sin redondeo. Default $0. |

**Checkbox "Propina voluntaria" (default: marcado)**
- Marcado: muestra texto "(La propina es voluntaria — Ley colombiana)" en rosa
- No afecta el cálculo; solo controla la visibilidad del aviso legal en Step 5 y Step 6

### Preview del total en tiempo real
El resumen se recalcula con cada cambio:
- Con `taxIncluded=true`: la fila de IVA aparece indentada (↳) y en texto muted — indica que ya está incluido
- Con `taxIncluded=false`: la fila de IVA aparece como línea normal que se suma al total

### Edge cases — Step 5
| Situación | Comportamiento |
|---|---|
| IVA = 0% | No se extrae ni agrega impuesto. El total = subtotal + propina |
| Propina = 0% o $0 | Propina mostrada como $0 en el resumen; no afecta el total |
| Propina fija con campo vacío | Se parsea como `0` (`NaN → 0`); propina = $0 |
| Usuario cambia de % a monto fijo y viceversa | `tipType` cambia, los valores anteriores de cada modo se conservan en el estado |
| Propina % = 10% con subtotal impar (no divisible perfectamente) | Se redondea al $100 **superior** (ceiling). Ej: $9.950 → $10.000 |
| Usuario sube IVA al 30% con IVA incluido | El total no cambia (el IVA ya está dentro); solo cambia el monto informativo extraído |

---

## 8. Step 6 — Result

### Función
Pantalla final de resultado. Muestra el total de la cuenta y el desglose por persona.

### Elementos de la pantalla
- **Header:** total global en grande (font-display, dorado) + desglose subtotal/IVA/propina
- **Cards por persona:** una card por persona, animadas con stagger (delay 80ms entre cards)
- **Accordeón por card:** toca la card para expandir/colapsar el desglose de ítems
- **Botón WhatsApp:** abre `wa.me/?text=...` con mensaje pre-formateado en una nueva pestaña
- **Botón pagado (📋/✓):** estado local de la card, visual únicamente — no persiste al reiniciar
- **Botón "Compartir resultado":** compartir todo el desglose
- **Botón "← Atrás":** vuelve a Step 5
- **Botón "🔄 Nueva cuenta":** reinicia la app completamente

### Compartir resultado
1. Intenta Web Share API (`navigator.share`) — funciona en móvil con apps instaladas
2. Si no disponible o usuario cancela → copia al portapapeles
3. Al copiar: el botón muestra "✅ ¡Copiado!" durante 2.5s y vuelve al estado original
4. Si el portapapeles también falla → error silencioso (sin feedback al usuario)

### Mensaje de WhatsApp por persona
```
Hola [Nombre]! 👋

Tu parte de la cuenta es *$XX.XXX*

🛒 Tus ítems:
  • [Nombre ítem] ×[cantidad]: $X.XXX

Subtotal (IVA incl.): $XX.XXX   ← o "Subtotal" si taxIncluded=false
IVA: $X.XXX                      ← solo si taxIncluded=false
Propina: $X.XXX                  ← solo si split.tip > 0
*Total: $XX.XXX*
_(La propina es voluntaria)_     ← solo si tipIsVoluntary=true y tip>0
```

### Texto compartido (resultado completo)
```
🧾 *SplitBill — División de cuenta*

👤 *[Nombre]:* $XX.XXX
  • [ítem] ×[qty]: $X.XXX

Subtotal[ (IVA incl.)]: $XX.XXX
IVA: $X.XXX                       ← solo si taxIncluded=false
Propina: $X.XXX
*Total: $XX.XXX*
_(La propina es voluntaria — Ley colombiana)_  ← si tipIsVoluntary=true
```

### Edge cases — Step 6
| Situación | Comportamiento |
|---|---|
| Persona con $0 total | La card se muestra normalmente con total $0 — la persona no consumió nada asignado |
| Propina $0 | La línea de propina aparece como "$0" en el desglose (no se oculta) |
| Total con decimales después del reparto proporcional | `roundToNearest100` redondea al $100 más cercano por persona. La suma de individuales puede diferir ±$100×n del total global. |
| Web Share API cancelada por el usuario | No hay feedback; el error se captura silenciosamente y no se cae al portapapeles (se retorna en el catch) |
| Portapapeles no disponible (permisos denegados) | Error silencioso — el botón no cambia a "¡Copiado!" |
| Muchas personas (scroll) | La lista de cards es scrollable verticalmente dentro del contenedor flex-1 |
| "Nueva cuenta" | Dispatch `RESET` → vuelve a `initialState` (Step 1, sin ítems, sin personas, taxPercent=8, tipPercent=10, etc.) |

---

## 9. Comportamientos globales

### Persistencia de estado
- **Sin localStorage ni cookies** — todo el estado es en memoria
- **Refresh de página** → reinicia a Step 1 con estado inicial
- **Cerrar pestaña** → pierde todo
- **Navegar a otra URL y volver** → pierde todo (si la SPA no controla la URL)

### Botón "atrás" del navegador
No hay integración con el historial del navegador (`pushState`/`popState`).
El botón atrás del navegador sale de la app (cierra la PWA o va al sitio anterior).
Solo el botón "← Atrás" de la UI navega entre pasos.

### Modo offline
| Funcionalidad | ¿Funciona offline? |
|---|---|
| Step 1 — escanear factura | ❌ Requiere red (Cloudflare Worker + Anthropic API) |
| Step 1 — ingresar manualmente | ✅ Funciona offline |
| Steps 2–6 | ✅ Todos funcionan completamente offline |
| Fuentes Google Fonts | ⚠️ Requieren red la primera vez; quedan cacheadas por el SW (PWA) |
| Avatares DiceBear | ✅ Generación local, sin red |
| Compartir por WhatsApp | ⚠️ La app genera la URL; enviar el mensaje requiere WhatsApp con conexión |

### Cascada de eliminación de persona
Al eliminar una persona (Step 3), el reducer ejecuta en una sola acción:
1. Filtra la persona del array `people`
2. Filtra su `personId` del array `assignedTo` de **todos** los ítems

Esto garantiza que no queden referencias huérfanas, pero puede crear ítems
sin asignar de forma retroactiva si el usuario vuelve a Step 3 desde Step 4 o posterior.

### Colores de personas
- Paleta de 20 colores fijos en `PERSON_COLORS` (bill.ts)
- Asignación: `PERSON_COLORS[people.length % 20]` en el momento de agregar
- El color es informativo (no afecta cálculos); con > 20 personas los colores se repiten
- El color de la persona no se usa actualmente para distinguirla visualmente en las cards de Step 6 (se usa el avatar DiceBear). El campo `color` está en el tipo pero no se renderiza en ningún componente visible actualmente.

### IDs únicos
- Ítems manuales: `item-${Date.now()}`
- Ítems escaneados: `scanned-${Date.now()}-${index}`
- Personas: `person-${Date.now()}`
- Riesgo: si dos elementos se crean en el mismo milisegundo podrían colisionar (improbable en uso normal)

### Validación de inputs numéricos
- Todos los campos numéricos de precio y cantidad usan `type="text" inputMode="numeric"` (no `type="number"`) para mayor control del formato
- Los no-dígitos se filtran con `.replace(/\D/g, '')` en el onChange
- Los precios en COP no tienen decimales — el filtro garantiza solo enteros
- La cantidad mínima es 1; el botón "−" se deshabilita en 1 pero el input manual puede quedar vacío (se corrige en `onBlur`)

---

## 10. Diagrama de estados por paso

```
                    ┌─────────────────────────────────────┐
                    │              STEP 1                 │
                    │                                     │
                    │  ┌──────┐   drop/pick   ┌────────┐ │
                    │  │ Idle │──────────────▶│Preview │ │
                    │  └──────┘               └────┬───┘ │
                    │     │                   "Retomar"↓  │
                    │  manual                  (vuelve)   │
                    │     │            "Usar esta foto"   │
                    │     │                   ↓           │
                    │     │           ┌─────────────┐     │
                    │     │           │   Loading   │     │
                    │     │           └──────┬──────┘     │
                    │     │           ok ↓   │ error      │
                    │     │                  ↓            │
                    │     │           ┌────────────┐      │
                    │     │           │   Error    │──────┤
                    │     │           └────────────┘      │
                    │     │              "manual"↓        │
                    └─────┼──────────────────────┼────────┘
                          ↓ (nextStep)           ↓ (nextStep)
                    ┌─────────────────────────────────────┐
                    │              STEP 2                 │
                    │  items=[] + form open  |            │
                    │  items=[..] + form closed           │
                    │  canContinue = items≥1 && all price>0│
                    └──────────────────┬──────────────────┘
                                       ↓
                    ┌─────────────────────────────────────┐
                    │              STEP 3                 │
                    │  canContinue = people.length ≥ 2   │
                    └──────────────────┬──────────────────┘
                                       ↓
                    ┌─────────────────────────────────────┐
                    │              STEP 4                 │
                    │  canContinue = allAssigned          │
                    └──────────────────┬──────────────────┘
                                       ↓
                    ┌─────────────────────────────────────┐
                    │              STEP 5                 │
                    │  canContinue = always               │
                    └──────────────────┬──────────────────┘
                                       ↓
                    ┌─────────────────────────────────────┐
                    │              STEP 6                 │
                    │  "Nueva cuenta" → RESET → Step 1   │
                    └─────────────────────────────────────┘
```

---

## 11. Resumen de mensajes al usuario

| Contexto | Mensaje |
|---|---|
| OCR en progreso | "Leyendo tu factura... / Esto puede tomar unos segundos" |
| OCR exitoso (banner Step 2) | "Revisa los ítems detectados. Toca ✏️ para corregir nombre, cantidad o precio." |
| Lista de ítems vacía | "Sin ítems aún. Agrega el primero." |
| Lista de personas vacía | "Sin personas aún." |
| Mínimo personas | "Agrega al menos 2 personas para continuar." |
| IVA incluido | "El IVA ya está en los precios del menú" |
| IVA no incluido | "El IVA se sumará a los precios" |
| IVA referencial | "IVA típico en restaurantes Colombia: 8%" |
| Propina voluntaria | "(La propina es voluntaria — Ley colombiana)" |
| Propina % (label resumen) | "Propina (X% s/IVA, redondeada)" |
| Propina fija (label resumen) | "Propina (fijo)" |
| Resultado copiado | "✅ ¡Copiado!" (durante 2.5s) |
| Worker: imagen muy grande | "La imagen es demasiado grande. Máximo 6MB." |
| Worker: timeout | "El servicio tardó demasiado. Intenta de nuevo." |
| Worker: rate limit | "Demasiadas solicitudes. Intenta en unos minutos." |
| Worker: sin ítems | "No se encontraron ítems en la factura." |
| Worker: JSON inválido | "No se pudo interpretar la factura. Intenta con una foto más clara." |
| Worker: error interno | "No se pudo procesar la factura. Intenta de nuevo." |
| Sin conexión al worker | "Error al conectar con el servicio de OCR" |
| ENV no configurada | "VITE_WORKER_URL no está configurado. Revisa tu archivo .env" |
