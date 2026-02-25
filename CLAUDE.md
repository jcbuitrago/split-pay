# SplitBill - App para dividir cuentas de restaurante

Voy a desarrollar una Progressive Web App (PWA) llamada "SplitBill" 
para lanzar como producto público. La app escanea facturas de restaurantes 
con la cámara y divide la cuenta entre varias personas.

Soy nuevo en desarrollo, así que explica brevemente cada decisión 
importante que tomes.

## Stack completo
- Frontend: React + Vite + TypeScript
- Estilos: Tailwind CSS
- PWA: vite-plugin-pwa
- Backend/Proxy: Cloudflare Worker (para proteger la API key)
- OCR: Claude Vision API (claude-sonnet-4-20250514) via el Worker

## Arquitectura de seguridad
El frontend NUNCA llama directamente a Anthropic.
Siempre llama a nuestro Cloudflare Worker en: https://splitbill-worker.TU_USUARIO.workers.dev/scan
El Worker valida el origen, añade la API key y llama a Anthropic.

## Estructura de carpetas del frontend:
src/
  components/
    steps/
      Step1Entry.tsx      # Elegir: escanear o ingresar manual
      Step2Review.tsx     # Lista de ítems editable
      Step3People.tsx     # Agregar personas (sin límite)
      Step4Assign.tsx     # Asignar ítems a personas
      Step5TaxTip.tsx     # Impuestos y propina
      Step6Result.tsx     # Resultado final
    ui/
      ItemForm.tsx        # Formulario agregar/editar ítem
      PersonChips.tsx     # Chips de personas con scroll horizontal
      Stepper.tsx         # Barra de progreso de pasos
      ErrorMessage.tsx    # Componente de error con acción de fallback
  hooks/
    useBillScanner.ts     # Llama al Cloudflare Worker
    useBillSplit.ts       # Cálculos de división
  context/
    BillContext.tsx       # Estado global con useReducer
  types/
    bill.ts
  utils/
    calculations.ts
    formatCurrency.ts     # Formato COP: $1.500

## Tipos principales (bill.ts):
interface BillItem {
  id: string;
  name: string;
  price: number;        // En pesos colombianos, sin decimales
  quantity: number;
  assignedTo: string[]; // IDs de personas
}
interface Person {
  id: string;
  name: string;
  color: string;        // Color único de paleta de 20 colores
}
interface BillState {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  items: BillItem[];
  people: Person[];
  taxPercent: number;       // Default: 8 (IVA Colombia restaurantes)
  tipPercent: number;       // Default: 10
  tipType: 'percent' | 'fixed';
  tipIsVoluntary: boolean;  // Default: true (mostrar aviso legal Colombia)
  entryMode: 'scan' | 'manual';
  originalImage?: string;
  isLoading: boolean;
  error?: string;
}

## Flujo de cada paso:

### Step1Entry
- Botón primario grande: "📷 Escanear factura"
  → Abre cámara (preferir cámara trasera) o file picker en desktop
  → Mostrar preview de la imagen tomada con botón "Usar esta foto" / "Retomar"
  → Spinner con mensaje "Leyendo tu factura..." mientras procesa
  → Si falla: mensaje amigable + botón "Ingresar manualmente"
- Botón secundario: "✏️ Ingresar manualmente"
  → Ir a Step2 con lista vacía

### Step2Review
- Lista de ítems con: nombre, cantidad, precio unitario, precio total, botón eliminar
- Botón "+ Agregar ítem" siempre visible al fondo
- ItemForm: inputs para nombre (texto), cantidad (número, default 1), precio unitario
- Subtotal en tiempo real abajo de la lista
- Validar antes de continuar: mínimo 1 ítem, todos con precio > 0

### Step3People
- Input nombre + botón "Agregar" (también funciona con Enter)
- Mostrar personas como chips con su color asignado y botón X
- Paleta de 20 colores distinctivos (no pasteles, que se vean bien en chips)
- Mínimo 2 personas para continuar
- Sin límite máximo

### Step4Assign
- Para cada ítem: nombre + precio + fila de chips de personas
- Chips scrolleables horizontalmente
- Chip activo = persona seleccionada para ese ítem
- Si múltiples personas: precio se divide equitativamente
- Ítems sin asignar: borde rojo y ícono de advertencia
- Contador arriba: "X de Y ítems asignados"
- No se puede continuar con ítems sin asignar

### Step5TaxTip
- Sección Impuesto:
  - Slider + input numérico para % IVA (default 8%)
  - Texto informativo: "IVA típico en restaurantes Colombia: 8%"
- Sección Propina:
  - Toggle: "%" vs "Monto fijo"
  - Si %: slider + input (default 10%)
  - Si fijo: input en pesos
  - Checkbox: "Propina voluntaria" (default: marcado)
  - Si marcado: mostrar "(La propina es voluntaria - Ley colombiana)"
- Preview del total en tiempo real: subtotal + IVA + propina = TOTAL

### Step6Result
- Header: total de la cuenta
- Card por persona (con su color):
  - Nombre + monto total a pagar (grande y claro)
  - Acordeón expandible: desglose de sus ítems
- Botón "Compartir resultado":
  - Web Share API si disponible
  - Fallback: copiar texto formateado al portapapeles
  - Texto compartido en formato WhatsApp-friendly
- Botón "Nueva cuenta" → reset completo del estado

## Cloudflare Worker (crear en archivo separado: worker/index.js):
- Endpoint POST /scan
- Validar header Origin (solo aceptar desde tu dominio de Vercel)
- Rate limit: máximo 20 requests por IP por hora (usar KV de Cloudflare o contador simple)
- Recibir: { image: base64string }
- Llamar a Anthropic con el prompt de OCR
- Retornar: { items: [{name, price, quantity}], currency } o { error: mensaje }
- El prompt de OCR debe ser: 
  "Extrae todos los ítems de esta factura de restaurante. 
   Responde ÚNICAMENTE con JSON válido, sin texto adicional:
   {items: [{name: string, price: number, quantity: number}], currency: string}
   Los precios deben ser números sin símbolos de moneda ni puntos de miles."

## Formato de moneda Colombia:
- Usar puntos como separador de miles: $1.500, $23.000
- Sin decimales para COP
- Función formatCOP(amount: number): string

## Reglas generales:
1. Mobile-first, ancho objetivo 375px-430px
2. Sin límite de personas en ninguna parte del código
3. App funciona 100% offline excepto Step1 escaneo
4. Todos los textos en español colombiano
5. Manejo de errores con mensajes claros y siempre con una acción alternativa
6. Haptic feedback (navigator.vibrate) al: agregar ítem, agregar persona, completar
7. Animaciones suaves entre pasos (CSS transitions, no librerías pesadas)
8. Sin localStorage ni cookies (estado solo en memoria, se pierde al cerrar)

## Orden de implementación:
1. Setup del proyecto frontend con Vite + React + TypeScript
2. Instalar dependencias: tailwindcss, vite-plugin-pwa
3. Crear BillContext con useReducer y todos los tipos
4. Stepper.tsx y esqueleto de navegación entre pasos
5. Step2Review + ItemForm (con datos mock para probar)
6. Step3People + PersonChips  
7. Step4Assign
8. Step5TaxTip + calculations.ts + formatCurrency.ts
9. Step6Result con función de compartir
10. Step1Entry con llamada al Worker (usar mock del Worker primero)
11. Crear el Cloudflare Worker
12. Conectar frontend con Worker real
13. Deploy: frontend en Vercel, Worker en Cloudflare
14. Pruebas en smartphone real