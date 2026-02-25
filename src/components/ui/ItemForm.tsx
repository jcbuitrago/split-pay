import { useState, useEffect } from 'react';
import { BillItem } from '../../types/bill';

interface ItemFormProps {
  initial?: BillItem;
  onSave: (item: Omit<BillItem, 'id' | 'assignedTo'>) => void;
  onCancel: () => void;
}

export default function ItemForm({ initial, onSave, onCancel }: ItemFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [quantity, setQuantity] = useState(initial?.quantity ?? 1);
  const [price, setPrice] = useState(initial?.price ?? 0);
  const [priceStr, setPriceStr] = useState(initial?.price ? String(initial.price) : '');

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setQuantity(initial.quantity);
      setPrice(initial.price);
      setPriceStr(String(initial.price));
    }
  }, [initial]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || price <= 0) return;
    onSave({ name: name.trim(), quantity, price });
  }

  function handlePriceChange(val: string) {
    setPriceStr(val);
    const num = parseInt(val.replace(/\D/g, ''), 10);
    setPrice(isNaN(num) ? 0 : num);
  }

  const isValid = name.trim().length > 0 && price > 0;

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del ítem</label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ej: Bandeja paisa"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Precio unitario ($)</label>
          <input
            type="text"
            inputMode="numeric"
            value={priceStr}
            onChange={e => handlePriceChange(e.target.value)}
            placeholder="15000"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 active:bg-gray-100"
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
