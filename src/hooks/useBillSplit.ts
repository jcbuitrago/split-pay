import { useBill } from '../context/BillContext';
import { calculateSplit, calculateSubtotal, calculateTax, calculateTip } from '../utils/calculations';
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
  const tax = calculateTax(subtotal, state.taxPercent);
  const tip = calculateTip(subtotal, state);
  const total = subtotal + tax + tip;
  const splits = calculateSplit(state);

  return { subtotal, tax, tip, total, splits };
}
