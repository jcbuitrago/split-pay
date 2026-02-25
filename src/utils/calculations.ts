import { BillState, BillItem, PersonSplit } from '../types/bill';

export function calculateSubtotal(items: BillItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function calculateTax(subtotal: number, taxPercent: number): number {
  return subtotal * taxPercent / 100;
}

export function calculateTip(subtotal: number, state: BillState): number {
  if (state.tipType === 'fixed') {
    return state.tipAmount;
  }
  return subtotal * state.tipPercent / 100;
}

export function calculateSplit(state: BillState): PersonSplit[] {
  const subtotal = calculateSubtotal(state.items);
  const tax = calculateTax(subtotal, state.taxPercent);
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
    const personTax = tax * proportion;
    const personTip = tip * proportion;
    return {
      person,
      subtotal: personSubtotal,
      tax: personTax,
      tip: personTip,
      total: personSubtotal + personTax + personTip,
      items: personItems.get(person.id) ?? [],
    };
  });
}
