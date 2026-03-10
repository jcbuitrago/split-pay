import { useState } from 'react';
import { useBill } from '../../context/BillContext';
import { BillItem } from '../../types/bill';
import { formatCOP } from '../../utils/formatCurrency';
import { calculateSubtotal } from '../../utils/calculations';
import ItemForm from '../ui/ItemForm';
import StepFooter from '../ui/StepFooter';
import { useHaptic } from '../../hooks/useHaptic';

export default function Step2Review() {
  const { state, dispatch, nextStep, prevStep } = useBill();
  const haptic = useHaptic();
  const [showForm, setShowForm] = useState(state.items.length === 0);
  const [editingItem, setEditingItem] = useState<BillItem | null>(null);

  function handleAdd(data: Omit<BillItem, 'id' | 'assignedTo'>) {
    haptic();
    dispatch({
      type: 'ADD_ITEM',
      item: { ...data, id: `item-${Date.now()}`, assignedTo: [] },
    });
    setShowForm(false);
  }

  function handleUpdate(data: Omit<BillItem, 'id' | 'assignedTo'>) {
    if (!editingItem) return;
    dispatch({ type: 'UPDATE_ITEM', item: { ...editingItem, ...data } });
    setEditingItem(null);
  }

  function handleRemove(id: string) {
    dispatch({ type: 'REMOVE_ITEM', id });
  }

  const subtotal = calculateSubtotal(state.items);
  const canContinue = state.items.length > 0 && state.items.every(i => i.price > 0);

  return (
    <div className="flex flex-col flex-1" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        <h2 className="text-xl font-display font-bold" style={{ color: 'var(--color-white)' }}>Ítems de la factura</h2>

        {state.entryMode === 'scan' && state.items.length > 0 && !editingItem && (
          <div
            className="rounded-2xl px-3 py-2.5 flex items-start gap-2 border"
            style={{ backgroundColor: 'rgba(91,91,214,0.08)', borderColor: 'rgba(91,91,214,0.25)' }}
          >
            <span className="shrink-0 mt-0.5">✏️</span>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
              Revisa los ítems detectados. Toca <strong style={{ color: 'var(--color-white)' }}>✏️</strong> para corregir nombre, cantidad o precio.
            </p>
          </div>
        )}

        {state.items.length === 0 && !showForm && (
          <p className="text-sm text-center py-6" style={{ color: 'var(--color-muted)' }}>
            Sin ítems aún. Agrega el primero.
          </p>
        )}

        {state.items.map(item => (
          <div key={item.id}>
            {editingItem?.id === item.id ? (
              <ItemForm
                initial={editingItem}
                onSave={handleUpdate}
                onCancel={() => setEditingItem(null)}
              />
            ) : (
              <div
                className="rounded-2xl p-4 flex items-center gap-3 border"
                style={{ backgroundColor: 'var(--color-surface)', borderColor: 'rgba(255,255,255,0.06)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate" style={{ color: 'var(--color-white)' }}>{item.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                    {item.quantity} × {formatCOP(item.price)} ={' '}
                    <span className="font-semibold" style={{ color: 'var(--color-gold)' }}>
                      {formatCOP(item.price * item.quantity)}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => setEditingItem(item)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-base shrink-0 active:opacity-70"
                  style={{ backgroundColor: 'rgba(91,91,214,0.15)' }}
                  aria-label="Editar"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-base shrink-0 active:opacity-70"
                  style={{ backgroundColor: 'rgba(240,112,112,0.12)' }}
                  aria-label="Eliminar"
                >
                  🗑️
                </button>
              </div>
            )}
          </div>
        ))}

        {showForm && !editingItem && (
          <ItemForm
            onSave={handleAdd}
            onCancel={() => state.items.length > 0 && setShowForm(false)}
          />
        )}

        {!showForm && !editingItem && (
          <button
            onClick={() => { setShowForm(true); setEditingItem(null); }}
            className="w-full py-3 border-2 border-dashed rounded-2xl font-semibold text-sm active:opacity-70 transition-opacity"
            style={{ borderColor: 'rgba(91,91,214,0.4)', color: 'var(--color-purple)' }}
          >
            + Agregar ítem
          </button>
        )}
      </div>

      {state.items.length > 0 && (
        <div className="px-4 py-3 border-t" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex justify-between items-center">
            <span className="text-sm" style={{ color: 'var(--color-muted)' }}>Subtotal</span>
            <span className="font-bold text-lg" style={{ color: 'var(--color-gold)' }}>{formatCOP(subtotal)}</span>
          </div>
        </div>
      )}

      <StepFooter onBack={prevStep} onContinue={nextStep} continueDisabled={!canContinue} />
    </div>
  );
}
