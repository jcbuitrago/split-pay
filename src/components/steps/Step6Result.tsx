import { useState } from 'react';
import { useBill } from '../../context/BillContext';
import { useBillSplit } from '../../hooks/useBillSplit';
import { formatCOP } from '../../utils/formatCurrency';
import { PersonSplit } from '../../types/bill';

function PersonCard({ split }: { split: PersonSplit }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 active:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ backgroundColor: split.person.color }}
          >
            {split.person.name.charAt(0).toUpperCase()}
          </div>
          <span className="font-semibold text-gray-900">{split.person.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-gray-900">{formatCOP(split.total)}</span>
          <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-1 border-t border-gray-100 pt-3">
          {split.items.map(({ item, share }) => (
            <div key={item.id} className="flex justify-between text-sm text-gray-600">
              <span className="truncate flex-1 pr-2">{item.name} ×{item.quantity}</span>
              <span className="font-medium shrink-0">{formatCOP(share)}</span>
            </div>
          ))}
          <div className="h-px bg-gray-100 my-1" />
          <div className="flex justify-between text-xs text-gray-400">
            <span>Subtotal</span>
            <span>{formatCOP(split.subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>IVA</span>
            <span>{formatCOP(split.tax)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>Propina</span>
            <span>{formatCOP(split.tip)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Step6Result() {
  const { state, dispatch, prevStep } = useBill();
  const { total, subtotal, tax, tip, splits } = useBillSplit();
  const [copied, setCopied] = useState(false);

  function buildShareText(): string {
    const lines = ['🧾 *SplitBill — División de cuenta*', ''];
    splits.forEach(s => {
      lines.push(`👤 *${s.person.name}:* ${formatCOP(s.total)}`);
      s.items.forEach(({ item, share }) => {
        lines.push(`  • ${item.name} ×${item.quantity}: ${formatCOP(share)}`);
      });
    });
    lines.push('');
    lines.push(`Subtotal: ${formatCOP(subtotal)}`);
    lines.push(`IVA: ${formatCOP(tax)}`);
    lines.push(`Propina: ${formatCOP(tip)}`);
    lines.push(`*Total: ${formatCOP(total)}*`);
    if (state.tipIsVoluntary) lines.push('_(La propina es voluntaria — Ley colombiana)_');
    return lines.join('\n');
  }

  async function handleShare() {
    const text = buildShareText();
    if ('share' in navigator) {
      try {
        await navigator.share({ title: 'SplitBill', text });
        return;
      } catch {
        // fallthrough to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard not available
    }
  }

  function handleReset() {
    if ('vibrate' in navigator) navigator.vibrate(50);
    dispatch({ type: 'RESET' });
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <div className="px-4 py-5 bg-indigo-600 text-white">
        <p className="text-sm text-indigo-200">Total de la cuenta</p>
        <p className="text-4xl font-extrabold mt-1">{formatCOP(total)}</p>
        <div className="flex gap-4 mt-2 text-xs text-indigo-200">
          <span>Sub: {formatCOP(subtotal)}</span>
          <span>IVA: {formatCOP(tax)}</span>
          <span>Propina: {formatCOP(tip)}</span>
        </div>
      </div>

      {/* Person cards */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Por persona</h2>
        {splits.map(split => (
          <PersonCard key={split.person.id} split={split} />
        ))}
      </div>

      {/* Actions */}
      <div className="px-4 py-4 border-t border-gray-100 bg-white flex flex-col gap-3">
        {state.tipIsVoluntary && (
          <p className="text-xs text-gray-400 text-center">(La propina es voluntaria — Ley colombiana)</p>
        )}
        <button
          onClick={handleShare}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold active:bg-indigo-700"
        >
          {copied ? '✅ ¡Copiado!' : '📤 Compartir resultado'}
        </button>
        <div className="flex gap-3">
          <button
            onClick={prevStep}
            className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 active:bg-gray-100"
          >
            ← Atrás
          </button>
          <button
            onClick={handleReset}
            className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 active:bg-gray-100"
          >
            🔄 Nueva cuenta
          </button>
        </div>
      </div>
    </div>
  );
}
