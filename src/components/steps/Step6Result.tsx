import { useState } from 'react';
import { useBill } from '../../context/BillContext';
import { useBillSplit } from '../../hooks/useBillSplit';
import { formatCOP } from '../../utils/formatCurrency';
import { PersonSplit } from '../../types/bill';

function PersonCard({ split, taxIncluded, tipIsVoluntary }: { split: PersonSplit; taxIncluded: boolean; tipIsVoluntary: boolean }) {
  const [open, setOpen] = useState(false);

  function buildPersonMessage(): string {
    const lines = [
      `Hola ${split.person.name}! 👋`,
      '',
      `Tu parte de la cuenta es *${formatCOP(split.total)}*`,
      '',
      '🛒 Tus ítems:',
    ];
    split.items.forEach(({ item, share }) => {
      lines.push(`  • ${item.name} ×${item.quantity}: ${formatCOP(share)}`);
    });
    lines.push('');
    lines.push(`${taxIncluded ? 'Subtotal (IVA incl.)' : 'Subtotal'}: ${formatCOP(split.subtotal)}`);
    if (!taxIncluded) lines.push(`IVA: ${formatCOP(split.tax)}`);
    if (split.tip > 0) lines.push(`Propina: ${formatCOP(split.tip)}`);
    lines.push(`*Total: ${formatCOP(split.total)}*`);
    if (tipIsVoluntary && split.tip > 0) lines.push('_(La propina es voluntaria)_');
    return lines.join('\n');
  }

  function handleWhatsApp() {
    if ('vibrate' in navigator) navigator.vibrate(50);
    const text = buildPersonMessage();
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 active:bg-gray-50 dark:active:bg-gray-700"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ backgroundColor: split.person.color }}
          >
            {split.person.name.charAt(0).toUpperCase()}
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">{split.person.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-gray-900 dark:text-white">{formatCOP(split.total)}</span>
          <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Botón WhatsApp siempre visible */}
      <div className="px-4 pb-3">
        <button
          onClick={handleWhatsApp}
          className="w-full py-2 bg-[#25D366] text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 active:opacity-80"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white shrink-0" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Enviar a {split.person.name}
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-1 border-t border-gray-100 dark:border-gray-700 pt-3">
          {split.items.map(({ item, share }) => (
            <div key={item.id} className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
              <span className="truncate flex-1 pr-2">{item.name} ×{item.quantity}</span>
              <span className="font-medium shrink-0 dark:text-gray-200">{formatCOP(share)}</span>
            </div>
          ))}
          <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
          <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
            <span>{taxIncluded ? 'Subtotal (IVA incl.)' : 'Subtotal'}</span>
            <span>{formatCOP(split.subtotal)}</span>
          </div>
          {!taxIncluded && (
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
              <span>IVA</span>
              <span>{formatCOP(split.tax)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
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
    lines.push(`Subtotal${state.taxIncluded ? ' (IVA incl.)' : ''}: ${formatCOP(subtotal)}`);
    if (!state.taxIncluded) lines.push(`IVA: ${formatCOP(tax)}`);
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
          <span>{state.taxIncluded ? 'Sub (IVA incl.)' : 'Sub'}: {formatCOP(subtotal)}</span>
          {!state.taxIncluded && <span>IVA: {formatCOP(tax)}</span>}
          <span>Propina: {formatCOP(tip)}</span>
        </div>
      </div>

      {/* Person cards */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Por persona</h2>
        {splits.map(split => (
          <PersonCard
            key={split.person.id}
            split={split}
            taxIncluded={state.taxIncluded}
            tipIsVoluntary={state.tipIsVoluntary}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col gap-3">
        {state.tipIsVoluntary && (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">(La propina es voluntaria — Ley colombiana)</p>
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
