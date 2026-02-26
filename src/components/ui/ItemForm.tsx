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

  function increment() {
    setQtyStr(String(qtyNum + 1));
  }

  function decrement() {
    if (qtyNum > 1) setQtyStr(String(qtyNum - 1));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || price <= 0 || qtyNum < 1) return;
    onSave({ name: name.trim(), quantity: qtyNum, price });
  }

  const isValid = name.trim().length > 0 && price > 0 && qtyNum >= 1;

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col gap-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del ítem</label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ej: Bandeja paisa"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad</label>
          <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 bg-white dark:bg-gray-700">
            <button
              type="button"
              onClick={decrement}
              disabled={qtyNum <= 1}
              className="w-10 h-10 flex items-center justify-center text-gray-500 dark:text-gray-300 bg-gray-50 dark:bg-gray-600 active:bg-gray-200 dark:active:bg-gray-500 disabled:opacity-30 text-lg font-bold shrink-0"
            >
              −
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={qtyStr}
              onChange={e => setQtyStr(e.target.value.replace(/\D/g, ''))}
              onBlur={() => { if (qtyStr === '' || qtyNum < 1) setQtyStr('1'); }}
              className="flex-1 text-center py-2 text-sm font-semibold focus:outline-none min-w-0 bg-transparent text-gray-900 dark:text-white"
            />
            <button
              type="button"
              onClick={increment}
              className="w-10 h-10 flex items-center justify-center text-gray-500 dark:text-gray-300 bg-gray-50 dark:bg-gray-600 active:bg-gray-200 dark:active:bg-gray-500 text-lg font-bold shrink-0"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio unitario ($)</label>
          <input
            type="text"
            inputMode="numeric"
            value={priceStr}
            onChange={e => setPriceStr(e.target.value.replace(/\D/g, ''))}
            placeholder="15000"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-700"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!isValid}
          className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-40 active:bg-indigo-700"
        >
          {initial ? 'Guardar' : 'Agregar'}
        </button>
      </div>
    </form>
  );
}
