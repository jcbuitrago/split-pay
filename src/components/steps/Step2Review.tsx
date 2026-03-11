import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useBill } from '../../context/BillContext';
import { BillItem } from '../../types/bill';
import { formatCOP } from '../../utils/formatCurrency';
import { calculateSubtotal } from '../../utils/calculations';
import ItemForm from '../ui/ItemForm';
import StepFooter from '../ui/StepFooter';
import { useHaptic } from '../../hooks/useHaptic';

function ItemCard({
  item,
  onUpdate,
  onRemove,
}: {
  item: BillItem;
  onUpdate: (data: Omit<BillItem, 'id' | 'assignedTo'>) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [qtyStr, setQtyStr] = useState(String(item.quantity));
  const [priceStr, setPriceStr] = useState(String(item.price));

  const qtyNum = parseInt(qtyStr) || 1;
  const price = parseInt(priceStr.replace(/\D/g, ''), 10) || 0;
  const isValid = name.trim().length > 0 && price > 0 && qtyNum >= 1;

  function handleSave() {
    if (!isValid) return;
    onUpdate({ name: name.trim(), quantity: qtyNum, price });
    setEditing(false);
  }

  function handleCancel() {
    setName(item.name);
    setQtyStr(String(item.quantity));
    setPriceStr(String(item.price));
    setEditing(false);
  }

  const inputStyle = {
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: 'var(--color-white)',
    borderColor: 'rgba(255,255,255,0.12)',
  };

  return (
    <motion.div
      layout
      className="rounded-2xl border overflow-hidden"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: editing ? 'rgba(91,91,214,0.5)' : 'rgba(255,255,255,0.06)',
      }}
      transition={{ layout: { duration: 0.22, ease: 'easeInOut' } }}
    >
      {/* ── Summary row (always visible) ── */}
      <div className="p-4 flex items-center gap-3">
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
          onClick={() => setEditing(e => !e)}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-base shrink-0 active:opacity-70 transition-colors"
          style={{ backgroundColor: editing ? 'rgba(91,91,214,0.35)' : 'rgba(91,91,214,0.15)' }}
          aria-label="Editar"
        >
          ✏️
        </button>
        <button
          onClick={onRemove}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-base shrink-0 active:opacity-70"
          style={{ backgroundColor: 'rgba(240,112,112,0.12)' }}
          aria-label="Eliminar"
        >
          🗑️
        </button>
      </div>

      {/* ── Inline edit fields ── */}
      <AnimatePresence initial={false}>
        {editing && (
          <motion.div
            key="edit"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="px-4 pb-4 flex flex-col gap-3 border-t pt-3"
              style={{ borderColor: 'rgba(91,91,214,0.25)' }}
            >
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
                  Nombre
                </label>
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                />
              </div>

              {/* Quantity + Price */}
              <div className="flex gap-3">
                <div className="w-32 shrink-0">
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
                    Cantidad
                  </label>
                  <div className="flex items-center border rounded-xl overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    <button
                      type="button"
                      onClick={() => setQtyStr(String(Math.max(1, qtyNum - 1)))}
                      className="w-9 h-9 flex items-center justify-center text-lg font-bold shrink-0 active:opacity-60"
                      style={{ color: 'var(--color-muted)' }}
                    >
                      −
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={qtyStr}
                      onChange={e => setQtyStr(e.target.value.replace(/\D/g, ''))}
                      onBlur={() => { if (!qtyStr || qtyNum < 1) setQtyStr('1'); }}
                      className="flex-1 text-center py-2 text-sm font-semibold focus:outline-none min-w-0 bg-transparent"
                      style={{ color: 'var(--color-white)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setQtyStr(String(qtyNum + 1))}
                      className="w-9 h-9 flex items-center justify-center text-lg font-bold shrink-0 active:opacity-60"
                      style={{ color: 'var(--color-muted)' }}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
                    Precio ($)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={priceStr}
                    onChange={e => setPriceStr(e.target.value.replace(/\D/g, ''))}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-2 rounded-xl border text-sm font-semibold active:opacity-70"
                  style={{ borderColor: 'var(--color-muted-surface)', color: 'var(--color-muted)', backgroundColor: 'transparent' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isValid}
                  className="flex-1 py-2 rounded-xl text-sm font-bold disabled:opacity-40 active:opacity-80"
                  style={{ backgroundColor: 'var(--color-purple)', color: '#ffffff' }}
                >
                  Guardar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const addFormVariants = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit:    { opacity: 0, height: 0 },
};

export default function Step2Review() {
  const { state, dispatch, nextStep, prevStep } = useBill();
  const haptic = useHaptic();
  const [showForm, setShowForm] = useState(state.items.length === 0);

  function handleAdd(data: Omit<BillItem, 'id' | 'assignedTo'>) {
    haptic();
    dispatch({
      type: 'ADD_ITEM',
      item: { ...data, id: `item-${Date.now()}`, assignedTo: [] },
    });
    setShowForm(false);
  }

  function handleUpdate(item: BillItem, data: Omit<BillItem, 'id' | 'assignedTo'>) {
    dispatch({ type: 'UPDATE_ITEM', item: { ...item, ...data } });
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

        {state.entryMode === 'scan' && state.items.length > 0 && (
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
          <ItemCard
            key={item.id}
            item={item}
            onUpdate={data => handleUpdate(item, data)}
            onRemove={() => handleRemove(item.id)}
          />
        ))}

        <AnimatePresence initial={false}>
          {showForm && (
            <motion.div key="add-form" {...addFormVariants} style={{ overflow: 'hidden' }}>
              <ItemForm
                onSave={handleAdd}
                onCancel={() => state.items.length > 0 && setShowForm(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
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
