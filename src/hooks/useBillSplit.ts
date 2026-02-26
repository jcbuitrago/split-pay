import { useBill } from '../context/BillContext';
import { calculateSplit, calculateSubtotal, calculateTax, calculateTip, roundToNearest100 } from '../utils/calculations';
import { PersonSplit } from '../types/bill';

interface BillSummary {
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  splits: PersonSplit[];
}

export function useBillSplit(): BillSummary {
  const { state } = useBill();

  const subtotal = calculateSubtotal(state.items);
  const tax = calculateTax(subtotal, state.taxPercent, state.taxIncluded);
  const tip = calculateTip(subtotal, state);
  const total = roundToNearest100(state.taxIncluded
    ? subtotal + tip          // IVA ya incluido en precios
    : subtotal + tax + tip);  // IVA se agrega al subtotal
  const splits = calculateSplit(state);

  return { subtotal, tax, tip, total, splits };
}
