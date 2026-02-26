import { createContext, useContext, useReducer, ReactNode } from 'react';
import { BillState, BillItem, Person, PERSON_COLORS } from '../types/bill';

const initialState: BillState = {
  step: 1,
  items: [],
  people: [],
  darkMode: true,
  taxPercent: 8,
  taxIncluded: true,
  tipPercent: 10,
  tipAmount: 0,
  tipType: 'percent',
  tipIsVoluntary: true,
  entryMode: 'manual',
  isLoading: false,
};

type BillAction =
  | { type: 'SET_STEP'; step: BillState['step'] }
  | { type: 'ADD_ITEM'; item: BillItem }
  | { type: 'UPDATE_ITEM'; item: BillItem }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'SET_ITEMS'; items: BillItem[] }
  | { type: 'ADD_PERSON'; person: Person }
  | { type: 'REMOVE_PERSON'; id: string }
  | { type: 'ASSIGN_PERSON'; itemId: string; personId: string }
  | { type: 'UNASSIGN_PERSON'; itemId: string; personId: string }
  | { type: 'SET_DARK_MODE'; value: boolean }
  | { type: 'SET_TAX_PERCENT'; value: number }
  | { type: 'SET_TAX_INCLUDED'; value: boolean }
  | { type: 'SET_TIP_PERCENT'; value: number }
  | { type: 'SET_TIP_AMOUNT'; value: number }
  | { type: 'SET_TIP_TYPE'; value: 'percent' | 'fixed' }
  | { type: 'SET_TIP_VOLUNTARY'; value: boolean }
  | { type: 'SET_ENTRY_MODE'; mode: 'scan' | 'manual' }
  | { type: 'SET_ORIGINAL_IMAGE'; image: string }
  | { type: 'SET_LOADING'; value: boolean }
  | { type: 'SET_ERROR'; error?: string }
  | { type: 'RESET' };

function billReducer(state: BillState, action: BillAction): BillState {
  switch (action.type) {
    case 'SET_STEP':
      return {
        ...state,
        step: action.step,
        // Liberar la imagen al salir del step 1
        originalImage: action.step > 1 ? undefined : state.originalImage,
      };

    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.item] };

    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map(i => i.id === action.item.id ? action.item : i),
      };

    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.id !== action.id) };

    case 'SET_ITEMS':
      return { ...state, items: action.items };

    case 'ADD_PERSON':
      return { ...state, people: [...state.people, action.person] };

    case 'REMOVE_PERSON':
      return {
        ...state,
        people: state.people.filter(p => p.id !== action.id),
        items: state.items.map(item => ({
          ...item,
          assignedTo: item.assignedTo.filter(pid => pid !== action.id),
        })),
      };

    case 'ASSIGN_PERSON':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.itemId && !item.assignedTo.includes(action.personId)
            ? { ...item, assignedTo: [...item.assignedTo, action.personId] }
            : item
        ),
      };

    case 'UNASSIGN_PERSON':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.itemId
            ? { ...item, assignedTo: item.assignedTo.filter(pid => pid !== action.personId) }
            : item
        ),
      };

    case 'SET_DARK_MODE':
      return { ...state, darkMode: action.value };

    case 'SET_TAX_PERCENT':
      return { ...state, taxPercent: action.value };

    case 'SET_TAX_INCLUDED':
      return { ...state, taxIncluded: action.value };

    case 'SET_TIP_PERCENT':
      return { ...state, tipPercent: action.value };

    case 'SET_TIP_AMOUNT':
      return { ...state, tipAmount: action.value };

    case 'SET_TIP_TYPE':
      return { ...state, tipType: action.value };

    case 'SET_TIP_VOLUNTARY':
      return { ...state, tipIsVoluntary: action.value };

    case 'SET_ENTRY_MODE':
      return { ...state, entryMode: action.mode };

    case 'SET_ORIGINAL_IMAGE':
      return { ...state, originalImage: action.image };

    case 'SET_LOADING':
      return { ...state, isLoading: action.value };

    case 'SET_ERROR':
      return { ...state, error: action.error };

    case 'RESET':
      return { ...initialState };

    default:
      return state;
  }
}

interface BillContextValue {
  state: BillState;
  dispatch: React.Dispatch<BillAction>;
  nextStep: () => void;
  prevStep: () => void;
  nextPersonColor: () => string;
}

const BillContext = createContext<BillContextValue | null>(null);

export function BillProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(billReducer, initialState);

  function nextStep() {
    if (state.step < 6) {
      dispatch({ type: 'SET_STEP', step: (state.step + 1) as BillState['step'] });
    }
  }

  function prevStep() {
    if (state.step > 1) {
      dispatch({ type: 'SET_STEP', step: (state.step - 1) as BillState['step'] });
    }
  }

  function nextPersonColor(): string {
    return PERSON_COLORS[state.people.length % PERSON_COLORS.length];
  }

  return (
    <BillContext.Provider value={{ state, dispatch, nextStep, prevStep, nextPersonColor }}>
      {children}
    </BillContext.Provider>
  );
}

export function useBill() {
  const ctx = useContext(BillContext);
  if (!ctx) throw new Error('useBill debe usarse dentro de BillProvider');
  return ctx;
}
