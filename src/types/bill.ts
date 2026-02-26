export interface BillItem {
  id: string;
  name: string;
  price: number;        // En pesos colombianos, sin decimales
  quantity: number;
  assignedTo: string[]; // IDs de personas
}

export interface Person {
  id: string;
  name: string;
  color: string;        // Color único de paleta de 20 colores
}

export interface BillState {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  items: BillItem[];
  people: Person[];
  darkMode: boolean;        // Default: true (tema nocturno)
  taxPercent: number;       // Default: 8 (IVA Colombia restaurantes)
  taxIncluded: boolean;     // Default: true (IVA ya incluido en precios del menú)
  tipPercent: number;       // Default: 10
  tipAmount: number;        // Para propina fija, default: 0
  tipType: 'percent' | 'fixed';
  tipIsVoluntary: boolean;  // Default: true (mostrar aviso legal Colombia)
  entryMode: 'scan' | 'manual';
  originalImage?: string;
  isLoading: boolean;
  error?: string;
}

export interface PersonSplit {
  person: Person;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  items: { item: BillItem; share: number }[];
}

export const PERSON_COLORS = [
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#10B981',
  '#14B8A6',
  '#06B6D4',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#A855F7',
  '#D946EF',
  '#EC4899',
  '#F43F5E',
  '#84CC16',
  '#0EA5E9',
  '#0D9488',
  '#7C3AED',
  '#DC2626',
  '#059669',
];
