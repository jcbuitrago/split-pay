/**
 * Formatea un número como pesos colombianos.
 * Ejemplo: 1500 → "$1.500", 23000 → "$23.000"
 */
export function formatCOP(amount: number): string {
  const rounded = Math.round(amount);
  return '$' + rounded.toLocaleString('es-CO').replace(/,/g, '.');
}
