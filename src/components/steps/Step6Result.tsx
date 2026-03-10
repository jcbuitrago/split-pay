import { useState } from 'react';
import { motion } from 'framer-motion';
import { useBill } from '../../context/BillContext';
import { useBillSplit } from '../../hooks/useBillSplit';
import { formatCOP } from '../../utils/formatCurrency';
import { PersonSplit } from '../../types/bill';
import PersonAvatar from '../ui/PersonAvatar';
import { useHaptic } from '../../hooks/useHaptic';

function PersonCard({ split, taxIncluded, tipIsVoluntary, index }: {
  split: PersonSplit;
  taxIncluded: boolean;
  tipIsVoluntary: boolean;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const haptic = useHaptic();

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
    haptic();
    const text = buildPersonMessage();
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  async function handleCopyTotal() {
    haptic();
    try {
      await navigator.clipboard.writeText(`${split.person.name}: ${formatCOP(split.total)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className="rounded-2xl overflow-hidden border"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      {/* Card header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 active:opacity-80"
      >
        <div className="flex items-center gap-3">
          <PersonAvatar name={split.person.name} size="md" assigned />
          <div className="text-left">
            <p className="font-display font-bold" style={{ color: 'var(--color-white)' }}>{split.person.name}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{split.items.length} ítems</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-display font-bold" style={{ color: 'var(--color-purple)' }}>{formatCOP(split.total)}</span>
          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Action buttons */}
      <div className="px-4 pb-3 flex gap-2">
        <button
          onClick={handleWhatsApp}
          className="flex-1 py-2 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:opacity-80"
          style={{ backgroundColor: '#128C7E', color: '#ffffff' }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white shrink-0" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          WhatsApp
        </button>
        <button
          onClick={handleCopyTotal}
          className="px-4 py-2 rounded-xl font-semibold text-sm active:opacity-80 transition-all border"
          style={{ backgroundColor: 'rgba(245,197,66,0.12)', color: 'var(--color-gold)', borderColor: 'rgba(245,197,66,0.25)' }}
        >
          {copied ? '✅' : '📋'}
        </button>
      </div>

      {/* Expandable breakdown */}
      {open && (
        <div className="px-4 pb-4 flex flex-col gap-1.5 border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {split.items.map(({ item, share }) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="truncate flex-1 pr-2" style={{ color: 'var(--color-muted)' }}>{item.name} ×{item.quantity}</span>
              <span className="font-medium shrink-0" style={{ color: 'var(--color-white)' }}>{formatCOP(share)}</span>
            </div>
          ))}
          <div className="h-px my-1" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
          <div className="flex justify-between text-xs">
            <span style={{ color: 'var(--color-muted)' }}>{taxIncluded ? 'Subtotal (IVA incl.)' : 'Subtotal'}</span>
            <span style={{ color: 'var(--color-muted)' }}>{formatCOP(split.subtotal)}</span>
          </div>
          {!taxIncluded && (
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--color-muted)' }}>IVA</span>
              <span style={{ color: 'var(--color-muted)' }}>{formatCOP(split.tax)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs">
            <span style={{ color: 'var(--color-muted)' }}>Propina</span>
            <span style={{ color: 'var(--color-muted)' }}>{formatCOP(split.tip)}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function Step6Result() {
  const { state, dispatch } = useBill();
  const haptic = useHaptic();
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
    haptic();
    dispatch({ type: 'RESET' });
  }

  return (
    <div className="flex flex-col flex-1" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="px-4 py-5" style={{ background: 'var(--gradient-header)' }}>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Total de la cuenta</p>
        <p className="text-5xl font-display font-bold mt-1" style={{ color: 'var(--color-gold)' }}>
          {formatCOP(total)}
        </p>
        <div className="flex gap-4 mt-2 text-xs" style={{ color: 'var(--color-muted)' }}>
          <span>{state.taxIncluded ? 'Sub (IVA incl.)' : 'Sub'}: {formatCOP(subtotal)}</span>
          {!state.taxIncluded && <span>IVA: {formatCOP(tax)}</span>}
          <span>Propina: {formatCOP(tip)}</span>
        </div>
      </div>

      {/* Person cards */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
          Por persona
        </h2>
        {splits.map((split, i) => (
          <PersonCard
            key={split.person.id}
            split={split}
            taxIncluded={state.taxIncluded}
            tipIsVoluntary={state.tipIsVoluntary}
            index={i}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="px-4 py-4 border-t flex flex-col gap-3" style={{ backgroundColor: 'var(--color-darkest)', borderColor: 'rgba(255,255,255,0.06)' }}>
        {state.tipIsVoluntary && (
          <p className="text-xs text-center" style={{ color: 'var(--color-muted)' }}>
            La propina es voluntaria — Ley colombiana
          </p>
        )}
        <button
          onClick={handleShare}
          className="w-full py-3 rounded-2xl font-bold active:opacity-80 transition-opacity shadow-navy-sm"
          style={{ backgroundColor: 'var(--color-purple)', color: '#ffffff' }}
        >
          {copied ? '✅ ¡Copiado!' : '📤 Compartir resultado'}
        </button>
        <button
          onClick={handleReset}
          className="w-full py-3 border rounded-2xl font-semibold text-sm active:opacity-70 transition-opacity"
          style={{ borderColor: 'var(--color-muted-surface)', color: 'var(--color-muted)' }}
        >
          🔄 Nueva cuenta
        </button>
      </div>
    </div>
  );
}
