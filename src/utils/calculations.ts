import { BillState, BillItem, PersonSplit } from '../types/bill';

export function calculateSubtotal(items: BillItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * Calcula el IVA según si los precios ya lo incluyen o no.
 * - taxIncluded=true:  extrae el IVA del subtotal (ya estaba incluido, solo informativo)
 * - taxIncluded=false: calcula el IVA sobre el subtotal (se sumará al total)
 */
export function calculateTax(subtotal: number, taxPercent: number, taxIncluded: boolean): number {
  if (taxIncluded) {
    return subtotal * taxPercent / (100 + taxPercent);
  }
  return subtotal * taxPercent / 100;
}

function roundUpTo100(amount: number): number {
  return Math.ceil(amount / 100) * 100;
}

/**
 * Propina calculada sobre el precio SIN IVA, redondeada al $100 superior.
 * - taxIncluded=true:  pre-IVA = subtotal / (1 + taxPercent/100)
 * - taxIncluded=false: subtotal ya es pre-IVA
 */
export function calculateTip(subtotal: number, state: BillState): number {
  if (state.tipType === 'fixed') {
    return state.tipAmount;
  }
  const preTaxBase = state.taxIncluded
    ? subtotal / (1 + state.taxPercent / 100)
    : subtotal;
  return roundUpTo100(preTaxBase * state.tipPercent / 100);
}

export function calculateSplit(state: BillState): PersonSplit[] {
  const subtotal = calculateSubtotal(state.items);
  const tip = calculateTip(subtotal, state);

  const personSubtotals = new Map<string, number>();
  const personItems = new Map<string, { item: BillItem; share: number }[]>();

  state.people.forEach(p => {
    personSubtotals.set(p.id, 0);
    personItems.set(p.id, []);
  });

  state.items.forEach(item => {
    if (item.assignedTo.length === 0) return;
    const sharePerPerson = (item.price * item.quantity) / item.assignedTo.length;
    item.assignedTo.forEach(personId => {
      personSubtotals.set(personId, (personSubtotals.get(personId) ?? 0) + sharePerPerson);
      const arr = personItems.get(personId);
      if (arr) arr.push({ item, share: sharePerPerson });
    });
  });

  return state.people.map(person => {
    const personSubtotal = personSubtotals.get(person.id) ?? 0;
    const proportion = subtotal > 0 ? personSubtotal / subtotal : 0;
    const personTax = calculateTax(personSubtotal, state.taxPercent, state.taxIncluded);
    const personTip = tip * proportion;
    const personTotal = state.taxIncluded
      ? personSubtotal + personTip          // IVA ya en subtotal
      : personSubtotal + personTax + personTip; // IVA se suma aparte
    return {
      person,
      subtotal: personSubtotal,
      tax: personTax,
      tip: personTip,
      total: personTotal,
      items: personItems.get(person.id) ?? [],
    };
  });
}
