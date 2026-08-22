# SplitBill — Diagnóstico de madurez para publicación en tiendas

> Análisis realizado el 2026-08-21 sobre la rama `dev` (commit `511b6de`).
> Alcance: 2.418 LOC entre `src/` y `worker/`. Objetivo: App Store + Google Play.

---

## Veredicto

**SplitBill es un MVP web desplegado y funcional. Todavía no es una aplicación.**
En la ruta hacia una publicación en tiendas está aproximadamente al **25-30%**.

Piénsalo como una casa: tienes una vivienda habitable y bonita, con luz y agua funcionando.
Lo que no tienes son las escrituras, el permiso de habitabilidad, los planos aprobados ni los
cimientos certificados. Nada de eso se ve al entrar — pero sin eso no puedes venderla.

Esto **no** es una crítica al trabajo hecho. Lo que está construido está bien construido.
El punto es que publicar en una tienda no es "subir lo que ya tienes": es cruzar de *software
que funciona* a *producto que se sostiene solo*, y esa frontera tiene requisitos técnicos,
legales y económicos que hoy no existen en el repositorio.

---

## Lo que ya está sólido

| Área | Estado |
|------|--------|
| Flujo funcional | Los 6 pasos completos, desplegados y operativos |
| TypeScript | `npx tsc --noEmit` pasa limpio, cero `any` |
| Seguridad del Worker | CORS por whitelist, rate limit con KV + fallback, timeout 25s, sanitización de OCR, límites de tamaño en request y response |
| Cabeceras HTTP | CSP, HSTS, X-Frame-Options, Referrer-Policy en `vercel.json` |
| PWA | Instalable, service worker con Workbox |
| Sistema de diseño | `src/theme.css` como fuente única, cero hex hardcodeados en componentes |
| Infraestructura | Vercel + Cloudflare Worker funcionando en producción |

---

## Los nueve huecos

### 1. No existe app nativa — esta es la fase cero

No hay Capacitor, ni proyecto Xcode, ni Android Studio, ni bundle ID, ni keystore, ni
provisioning profile. El repositorio es 100% web. Una PWA **no se puede subir a la App Store**:
Apple no acepta enlaces web empaquetados, y Google solo acepta un `.aab` firmado.

### 2. Apple Guideline 4.2 (Minimum Functionality) te rechazaría hoy

Apple rechaza sistemáticamente apps que son un webview envolviendo un sitio. Y hay un problema
más profundo: las tres capacidades "nativas" que el proyecto declara **no funcionan dentro de
un WKWebView de iOS**.

| Uso actual | Archivo | Qué pasa en iOS empaquetado |
|---|---|---|
| `<input capture="environment">` | `src/components/steps/Step1Entry.tsx:206` | Picker web, no cámara nativa |
| `navigator.vibrate` | `src/hooks/useHaptic.ts:3` | **No existe en Safari/iOS.** El haptic feedback está muerto |
| `navigator.share` | `src/components/steps/Step6Result.tsx:181` | Requiere el plugin `@capacitor/share` |

Es decir: al empaquetar, tres features documentadas dejan de funcionar en iOS.
La buena noticia es que resolver esto (Fase 3) es exactamente lo mismo que satisface el 4.2.

### 3. Sin Mac — bloqueador operativo para iOS

Estás en Fedora Linux. Compilar y firmar para iOS requiere Xcode, que solo corre en macOS.

Opciones reales:

| Opción | Costo | Nota |
|---|---|---|
| **Codemagic** | ~500 min/mes gratis, luego ~$0.095/min | Recomendado: integra bien con Capacitor |
| EAS Build (Expo) | Plan gratuito limitado, ~$29/mes | Más orientado a React Native |
| Ionic Appflow | Desde ~$49/mes | Del mismo equipo que Capacitor |
| MacinCloud | ~$25-50/mes | Mac remoto, control total |

Este costo es recurrente: cada actualización de la app necesita un build.

### 4. Estado en memoria — decisión que hay que revertir

`src/context/BillContext.tsx` usa `useReducer` sin persistencia, y la regla 8 del `CLAUDE.md`
lo pide explícitamente: *"Sin localStorage ni cookies (estado solo en memoria, se pierde al cerrar)"*.

En web eso es tolerable — una pestaña que se cierra es una acción deliberada del usuario.
**En móvil es inaceptable.** El sistema operativo mata procesos en segundo plano sin avisar:
entra una llamada, el usuario responde un WhatsApp, vuelve a la app… y perdió una cuenta de
15 ítems que acababa de asignar entre 6 personas en un restaurante, con la gente esperando.

Eso son reseñas de una estrella, garantizadas. Es el tipo de detalle que decide si una app
sobrevive sus primeras cien instalaciones.

### 5. Cero requisitos legales cubiertos

- **Política de privacidad publicada** — obligatoria en ambas tiendas. Es especialmente crítica
  aquí porque la app envía **fotos de facturas a un tercero** (Anthropic). Hay que declararlo
  explícitamente: qué se envía, a quién, cuánto se retiene, y que no se almacena.
- **Términos de servicio** — recomendados; obligatorios si hay monetización.
- **URL de soporte + email de contacto** — App Store Connect los exige como campo obligatorio.
- **Apple**: Privacy Nutrition Labels en App Store Connect y `NSCameraUsageDescription` en
  `Info.plist` (el texto que ve el usuario al pedir permiso de cámara). Sin ese string, la app
  **crashea** al abrir la cámara en iOS.
- **Google**: formulario Data Safety completo + declaración del permiso de cámara.
- **Google Play exige a cuentas personales nuevas 20 testers durante 14 días continuos** en
  closed testing antes de habilitar producción. Es un plazo de calendario que no se puede
  acelerar con dinero ni con código. **Arráncalo lo más temprano posible.**

### 6. Assets de tienda inexistentes — y los existentes están desactualizados

- Solo existe `public/icons/icon.svg`. Apple exige **PNG 1024×1024**, sin transparencia y sin
  esquinas redondeadas (las aplica el sistema). Android exige adaptive icon (foreground +
  background) más un 512×512 para la ficha.
- El icono actual es indigo `#4F46E5` — **no coincide con la paleta morada/dorada** que la app
  usa hoy. Quedó del diseño anterior.
- `vite.config.ts` declara `theme_color: '#4F46E5'` y `background_color: '#F9FAFB'` (blanco)
  en una app que es dark-only. **El splash screen saldría en blanco puro** antes de cargar una
  interfaz morada. Es un bug visual real, en producción, ahora mismo.
- **Cero screenshots.** Apple pide capturas de 6.7" y 6.5"; Google pide mínimo 2 más un
  feature graphic de 1024×500.
- Sin splash screens nativos configurados.

### 7. Calidad de ingeniería insuficiente para producción

- **Cero tests.** Ninguno. Y `src/utils/calculations.ts` maneja **dinero**: IVA incluido vs.
  agregado, propina sobre base pre-IVA, redondeos al $100. Publicar lógica financiera en dos
  tiendas sin una sola prueba no es un atajo, es negligencia. Un error de redondeo con mil
  usuarios no se arregla con un parche: se arregla con reputación que ya perdiste.
- **Sin CI.** No existe `.github/workflows`. Nada verifica que un cambio no rompa el build.
- **Sin Error Boundary de React.** Un crash deja la pantalla en blanco. En web el usuario
  recarga; en una app instalada cree que la app se murió y la desinstala.
- **Sin crash reporting** (Sentry / Firebase Crashlytics). Publicarías completamente a ciegas:
  no te enterarías de un crash hasta leerlo en una reseña.
- **Sin analytics.** No sabrías en qué paso abandona la gente.
- Deuda menor: `darkMode` sigue vivo en el estado (`src/context/BillContext.tsx:8` y `:100`)
  sin ningún toggle que lo use, y `README.md:16` todavía anuncia un "toggle ☀️/🌙" inexistente.

### 8. El modelo económico sin resolver — el riesgo que puede matar el proyecto

Cada escaneo llama a Claude Haiku y **lo pagas tú**. Hoy no hay autenticación, ni cuota por
usuario, ni monetización de ningún tipo.

El único freno es el rate limit de 20 requests/hora por IP en `worker/index.js:12`. Pero con
CGNAT en redes móviles, **miles de usuarios comparten la misma IP saliente** — ese límite
bloquearía a usuarios legítimos mientras no protege realmente contra abuso.

Publicar en dos tiendas sin resolver esto es exponer tu tarjeta de crédito a un número
desconocido de usuarios. Y hay un agravante: **Apple Guideline 3.1.1** obliga a que toda compra
de contenido digital dentro de la app pase por In-App Purchase (comisión 30%, o 15% en el Small
Business Program). No puedes cobrar por Stripe dentro de la app de iOS.

Caminos posibles:

| Modelo | Cómo funciona | Complejidad |
|---|---|---|
| **Gratis con cuota dura** | X escaneos/mes por dispositivo; entrada manual siempre ilimitada | Baja — es lo que recomendaría para el v1.0 |
| **Freemium con IAP** | Escaneos gratis limitados, suscripción para ilimitado | Alta — requiere IAP en ambas tiendas + backend de validación de recibos |
| **BYO key** | El usuario pone su propia API key de Anthropic | Muy baja en costo, pero mata la adopción masiva |

**Esta decisión va antes de escribir una línea más de código**, porque determina si necesitas
autenticación, backend con base de datos y validación de recibos.

### 9. El nombre

"SplitBill" es genérico y existen varias apps con nombres muy parecidos. Verificar
disponibilidad en ambas tiendas y reservar el nombre en App Store Connect es **gratis y toma
cinco minutos** — pero descubrir que está tomado después de diseñar todos los assets duele.

---

## Roadmap

### Fase 0 — Decisiones de producto *(antes de tocar código)*

- [ ] Decidir el modelo económico (ver tabla en el hueco #8)
- [ ] Definir un límite de gasto mensual aceptable para la API de Anthropic
- [ ] Verificar disponibilidad del nombre en ambas tiendas y reservarlo
- [ ] Definir el alcance del v1.0: qué entra y, sobre todo, qué NO entra

### Fase 1 — Endurecer el producto web *(~2 semanas)*

- [ ] **Persistencia del estado** — revierte la regla 8; `sessionStorage` o `@capacitor/preferences`
- [ ] **Error Boundary** de React envolviendo `<App />` con opción de reiniciar
- [ ] **Suite de tests sobre `src/utils/calculations.ts`** (Vitest) — IVA incluido/agregado,
      propina % y fija, redondeos, división entre 1/2/N personas, ítems sin asignar
- [ ] Corregir `theme_color` y `background_color` en `vite.config.ts` a la paleta real
- [ ] Rediseñar el icono con la paleta morada/dorada y generar la familia completa de tamaños
- [ ] Eliminar `darkMode` del estado y corregir el README
- [ ] CI en GitHub Actions: `typecheck` + `test` + `build` en cada push

### Fase 2 — Legal y administrativo *(en paralelo con Fase 1)*

- [ ] Redactar y publicar la política de privacidad (URL pública y estable)
- [ ] Redactar y publicar términos de servicio
- [ ] Crear página de soporte con email de contacto
- [ ] Abrir cuenta Apple Developer — **$99 USD/año** (la verificación puede tardar días)
- [ ] Abrir cuenta Google Play Console — **$25 USD pago único**
- [ ] **Iniciar el reclutamiento de los 20 testers de Google** — el reloj de 14 días corre aparte

### Fase 3 — Empaquetado nativo *(~1 semana)*

- [ ] Integrar Capacitor y generar los proyectos `ios/` y `android/`
- [ ] Sustituir el picker web por `@capacitor/camera`
- [ ] Sustituir `navigator.share` por `@capacitor/share`
- [ ] Sustituir `navigator.vibrate` por `@capacitor/haptics` *(esto revive el haptic en iOS)*
- [ ] Persistencia con `@capacitor/preferences`
- [ ] `NSCameraUsageDescription` en `Info.plist` y permiso de cámara en `AndroidManifest.xml`
- [ ] Splash screens nativos con la paleta correcta
- [ ] Actualizar `ALLOWED_ORIGIN` del Worker: Capacitor usa `capacitor://localhost` (iOS) y
      `https://localhost` (Android) como origen — **si no lo agregas, el escaneo falla con 403**

### Fase 4 — Build sin Mac *(~1 semana)*

- [ ] Configurar Codemagic (o la alternativa elegida)
- [ ] Certificados y provisioning profiles de Apple
- [ ] Keystore de Android (**guárdalo con tu vida**: si lo pierdes no puedes volver a
      actualizar la app en Play, nunca)
- [ ] Primer build de prueba en dispositivo real

### Fase 5 — Fichas de tienda

- [ ] Screenshots (6.7" y 6.5" para Apple; mínimo 2 para Google)
- [ ] Feature graphic 1024×500 para Google Play
- [ ] Textos: título, subtítulo, descripción corta y larga, palabras clave
- [ ] Privacy Nutrition Labels (Apple) y formulario Data Safety (Google)
- [ ] Clasificación por edad en ambas tiendas

### Fase 6 — Testing y envío

- [ ] TestFlight (Apple) — beta interna
- [ ] Closed testing en Google Play — **20 testers × 14 días continuos**
- [ ] Integrar crash reporting antes del envío, no después
- [ ] Envío a revisión (Apple: 1-3 días típicos; Google: 1-7 días la primera vez)

---

## Costos

| Concepto | Costo | Frecuencia |
|---|---|---|
| Apple Developer Program | $99 USD | Anual |
| Google Play Console | $25 USD | Pago único |
| Build en la nube (Codemagic) | $0 – 30 USD | Mensual |
| API de Anthropic (Claude Haiku) | Variable | Por escaneo — **el riesgo abierto** |
| Cloudflare Workers | $0 (plan free) | — |
| Vercel | $0 (plan hobby) | — |

**Nota sobre Vercel:** el plan hobby prohíbe uso comercial. Si la app monetiza, hay que subir
al plan Pro ($20/mes) o migrar el hosting.

---

## Estimación

**6 a 10 semanas de trabajo intermitente**, siendo nuevo en desarrollo.

El camino crítico no es el código: son los **14 días de closed testing de Google** y los tiempos
de verificación de cuentas de Apple. Por eso la Fase 2 debe arrancar en paralelo con la Fase 1,
no después.

---

## Recomendación

**Publica primero en Google Play.** Es más barato ($25 único), se compila desde Linux sin
depender de un Mac, y su revisión es más permisiva. Úsalo para validar el producto con usuarios
reales y medir el costo real de la API.

Con esos datos en la mano, ataca la App Store — que es la que exige el $99/año, el build en la
nube y la revisión estricta del Guideline 4.2.

Y antes de todo eso: **resuelve el hueco #8**. Todo lo demás es trabajo. Ese es el único que
puede convertir el éxito de la app en un problema.
