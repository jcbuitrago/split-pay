import { useState } from 'react';
import { useBill } from '../../context/BillContext';
import { BillItem } from '../../types/bill';
import { formatCOP } from '../../utils/formatCurrency';
import { calculateSubtotal } from '../../utils/calculations';
import ItemForm from '../ui/ItemForm';

export default function Step2Review() {
  const { state, dispatch, nextStep, prevStep } = useBill();
  const [showForm, setShowForm] = useState(state.items.length === 0);
  const [editingItem, setEditingItem] = useState<BillItem | null>(null);

  function haptic() {
    if ('vibrate' in navigator) navigator.vibrate(50);
  }

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
    <div className="flex flex-col flex-1">
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        <h2 className="text-lg font-bold text-gray-900">Ítems de la factura</h2>

        {state.items.length === 0 && !showForm && (
          <p className="text-gray-400 text-sm text-center py-6">Sin ítems aún. Agrega el primero.</p>
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
              <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.quantity} × {formatCOP(item.price)} = <span className="font-medium text-gray-700">{formatCOP(item.price * item.quantity)}</span>
                  </p>
                </div>
                <button
                  onClick={() => setEditingItem(item)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 active:text-indigo-700"
                  aria-label="Editar"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 active:text-red-600"
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
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-indigo-600 font-medium text-sm active:bg-gray-50"
          >
            + Agregar ítem
          </button>
        )}
      </div>

      {state.items.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-2 bg-gray-50">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-bold text-gray-900">{formatCOP(subtotal)}</span>
          </div>
        </div>
      )}

      <div className="flex gap-3 px-4 py-4 border-t border-gray-100 bg-white">
        <button
          onClick={prevStep}
          className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 active:bg-gray-100"
        >
          ← Atrás
        </button>
        <button
          onClick={nextStep}
          disabled={!canContinue}
          className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-40 active:bg-indigo-700"
        >
          Continuar →
        </button>
      </div>
    </div>
  );
}
