import { useState, useEffect } from 'react';
import { BillItem } from '../../types/bill';

interface ItemFormProps {
  initial?: BillItem;
  onSave: (item: Omit<BillItem, 'id' | 'assignedTo'>) => void;
  onCancel: () => void;
}

export default function ItemForm({ initial, onSave, onCancel }: ItemFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [qtyStr, setQtyStr] = useState(String(initial?.quantity ?? 1));
  const [priceStr, setPriceStr] = useState(initial?.price ? String(initial.price) : '');

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setQtyStr(String(initial.quantity));
      setPriceStr(String(initial.price));
    }
  }, [initial]);

  const qtyNum = parseInt(qtyStr) || 0;
  const price  = parseInt(priceStr.replace(/\D/g, ''), 10) || 0;

  function increment() { setQtyStr(String(qtyNum + 1)); }
  function decrement() { if (qtyNum > 1) setQtyStr(String(qtyNum - 1)); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || price <= 0 || qtyNum < 1) return;
    onSave({ name: name.trim(), quantity: qtyNum, price });
  }

  const isValid = name.trim().length > 0 && price > 0 && qtyNum >= 1;

  const inputStyle = {
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-white)',
    borderColor: 'rgba(255,255,255,0.1)',
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl p-4 flex flex-col gap-3 border"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'rgba(91,91,214,0.25)' }}
    >
      <div>
        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
          Nombre del ítem
        </label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ej: Bandeja paisa"
          className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none"
          style={{ ...inputStyle, caretColor: 'var(--color-purple)' }}
        />
      </div>

      <div className="flex gap-3">
        <div className="w-32 shrink-0">
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
            Cantidad
          </label>
          <div
            className="flex items-center border rounded-xl overflow-hidden"
            style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'var(--color-bg)' }}
          >
            <button
              type="button"
              onClick={decrement}
              disabled={qtyNum <= 1}
              className="w-10 h-10 flex items-center justify-center text-lg font-bold shrink-0 disabled:opacity-30 active:opacity-60"
              style={{ color: 'var(--color-muted)' }}
            >
              −
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={qtyStr}
              onChange={e => setQtyStr(e.target.value.replace(/\D/g, ''))}
              onBlur={() => { if (qtyStr === '' || qtyNum < 1) setQtyStr('1'); }}
              className="flex-1 text-center py-2 text-sm font-semibold focus:outline-none min-w-0 bg-transparent"
              style={{ color: 'var(--color-white)' }}
            />
            <button
              type="button"
              onClick={increment}
              className="w-10 h-10 flex items-center justify-center text-lg font-bold shrink-0 active:opacity-60"
              style={{ color: 'var(--color-muted)' }}
            >
              +
            </button>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
            Precio unitario ($)
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={priceStr}
            onChange={e => setPriceStr(e.target.value.replace(/\D/g, ''))}
            placeholder="15000"
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none"
            style={inputStyle}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border text-sm font-semibold active:opacity-70"
          style={{ borderColor: 'var(--color-muted-surface)', color: 'var(--color-muted)', backgroundColor: 'transparent' }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!isValid}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 active:opacity-80"
          style={{ backgroundColor: 'var(--color-purple)', color: '#ffffff' }}
        >
          {initial ? 'Guardar' : 'Agregar'}
        </button>
      </div>
    </form>
  );
}
