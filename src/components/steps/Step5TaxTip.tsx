import { useBill } from '../../context/BillContext';
import { formatCOP } from '../../utils/formatCurrency';
import { calculateSubtotal, calculateTax, calculateTip, roundToNearest100 } from '../../utils/calculations';
import StepFooter from '../ui/StepFooter';
import { useHaptic } from '../../hooks/useHaptic';

export default function Step5TaxTip() {
  const { state, dispatch, nextStep, prevStep } = useBill();
  const haptic = useHaptic();

  const subtotal = calculateSubtotal(state.items);
  const tax = calculateTax(subtotal, state.taxPercent, state.taxIncluded);
  const tip = calculateTip(subtotal, state);
  const total = roundToNearest100(state.taxIncluded ? subtotal + tip : subtotal + tax + tip);

  function handleTaxChange(val: number) {
    dispatch({ type: 'SET_TAX_PERCENT', value: Math.min(100, Math.max(0, val)) });
  }

  function handleTipPercentChange(val: number) {
    dispatch({ type: 'SET_TIP_PERCENT', value: Math.min(100, Math.max(0, val)) });
  }

  function handleTipAmountChange(val: string) {
    const num = parseInt(val.replace(/\D/g, ''), 10);
    dispatch({ type: 'SET_TIP_AMOUNT', value: isNaN(num) ? 0 : num });
  }

  const cardStyle = {
    backgroundColor: 'var(--color-surface)',
    borderColor: 'rgba(255,255,255,0.06)',
  };

  const inputStyle = {
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-white)',
    borderColor: 'rgba(255,255,255,0.1)',
  };

  function ToggleButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
    return (
      <button
        onClick={onClick}
        className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
        style={{
          backgroundColor: active ? 'var(--color-purple)' : 'transparent',
          color: active ? '#ffffff' : 'var(--color-muted)',
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-col flex-1" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
        <h2 className="text-xl font-display font-bold" style={{ color: 'var(--color-white)' }}>Impuesto y propina</h2>

        {/* Impuesto */}
        <div className="rounded-2xl p-4 flex flex-col gap-3 border" style={cardStyle}>
          <div className="flex items-center justify-between">
            <span className="font-semibold" style={{ color: 'var(--color-white)' }}>IVA</span>
            <span className="font-bold text-lg" style={{ color: 'var(--color-gold)' }}>{state.taxPercent}%</span>
          </div>

          {/* Toggle IVA incluido */}
          <div className="rounded-xl p-3 flex items-center justify-between" style={{ backgroundColor: 'var(--color-bg)' }}>
            <div className="flex flex-col">
              <span className="text-sm font-medium" style={{ color: 'var(--color-white)' }}>¿Precios con IVA incluido?</span>
              <span className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                {state.taxIncluded ? 'El IVA ya está en los precios del menú' : 'El IVA se sumará a los precios'}
              </span>
            </div>
            <div className="flex rounded-xl p-0.5 shrink-0 ml-3" style={{ backgroundColor: 'var(--color-muted-surface)' }}>
              <ToggleButton active={state.taxIncluded} onClick={() => dispatch({ type: 'SET_TAX_INCLUDED', value: true })} label="Sí" />
              <ToggleButton active={!state.taxIncluded} onClick={() => dispatch({ type: 'SET_TAX_INCLUDED', value: false })} label="No" />
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={30}
            step={1}
            value={state.taxPercent}
            onChange={e => handleTaxChange(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: 'var(--color-purple)' }}
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={state.taxPercent}
              onChange={e => handleTaxChange(Number(e.target.value))}
              className="w-20 border rounded-xl px-2 py-1.5 text-sm text-center focus:outline-none"
              style={inputStyle}
            />
            <span className="text-xs" style={{ color: 'var(--color-muted)' }}>IVA típico en restaurantes Colombia: 8%</span>
          </div>
        </div>

        {/* Propina */}
        <div className="rounded-2xl p-4 flex flex-col gap-3 border" style={cardStyle}>
          <div className="flex items-center justify-between">
            <span className="font-semibold" style={{ color: 'var(--color-white)' }}>Propina</span>
            <div className="flex rounded-xl p-0.5" style={{ backgroundColor: 'var(--color-muted-surface)' }}>
              {(['percent', 'fixed'] as const).map(type => (
                <ToggleButton
                  key={type}
                  active={state.tipType === type}
                  onClick={() => dispatch({ type: 'SET_TIP_TYPE', value: type })}
                  label={type === 'percent' ? '%' : 'Monto fijo'}
                />
              ))}
            </div>
          </div>

          {state.tipType === 'percent' ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--color-muted)' }}>Porcentaje</span>
                <span className="font-bold text-lg" style={{ color: 'var(--color-gold)' }}>{state.tipPercent}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={state.tipPercent}
                onChange={e => handleTipPercentChange(Number(e.target.value))}
                className="w-full"
                style={{ accentColor: 'var(--color-purple)' }}
              />
              <input
                type="number"
                min={0}
                max={100}
                value={state.tipPercent}
                onChange={e => handleTipPercentChange(Number(e.target.value))}
                className="w-20 border rounded-xl px-2 py-1.5 text-sm text-center focus:outline-none"
                style={inputStyle}
              />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: 'var(--color-muted)' }}>Monto ($)</span>
              <input
                type="text"
                inputMode="numeric"
                value={state.tipAmount || ''}
                onChange={e => handleTipAmountChange(e.target.value)}
                placeholder="0"
                className="flex-1 border rounded-xl px-3 py-1.5 text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>
          )}

          <div className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              id="tipVoluntary"
              checked={state.tipIsVoluntary}
              onChange={e => dispatch({ type: 'SET_TIP_VOLUNTARY', value: e.target.checked })}
              className="w-4 h-4"
              style={{ accentColor: 'var(--color-purple)' }}
            />
            <label htmlFor="tipVoluntary" className="text-sm cursor-pointer" style={{ color: 'var(--color-muted)' }}>
              Propina voluntaria
            </label>
          </div>
          {state.tipIsVoluntary && (
            <p className="text-xs" style={{ color: 'var(--color-rose)' }}>(La propina es voluntaria — Ley colombiana)</p>
          )}
        </div>

        {/* Preview del total */}
        <div
          className="rounded-2xl p-4 flex flex-col gap-2 border"
          style={{ backgroundColor: 'rgba(91,91,214,0.08)', borderColor: 'rgba(91,91,214,0.25)' }}
        >
          <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--color-purple)' }}>Resumen</h3>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-muted)' }}>{state.taxIncluded ? 'Subtotal (IVA incl.)' : 'Subtotal'}</span>
            <span style={{ color: 'var(--color-white)' }}>{formatCOP(subtotal)}</span>
          </div>
          {state.taxIncluded ? (
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--color-muted)' }}>↳ IVA incluido ({state.taxPercent}%)</span>
              <span style={{ color: 'var(--color-muted)' }}>{formatCOP(tax)}</span>
            </div>
          ) : (
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--color-muted)' }}>IVA ({state.taxPercent}%)</span>
              <span style={{ color: 'var(--color-white)' }}>{formatCOP(tax)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-muted)' }}>
              Propina {state.tipType === 'percent' ? `(${state.tipPercent}% s/IVA, redondeada)` : '(fijo)'}
            </span>
            <span style={{ color: 'var(--color-white)' }}>{formatCOP(tip)}</span>
          </div>
          <div className="h-px my-1" style={{ backgroundColor: 'rgba(91,91,214,0.25)' }} />
          <div className="flex justify-between font-bold">
            <span style={{ color: 'var(--color-white)' }}>Total</span>
            <span className="text-xl font-display" style={{ color: 'var(--color-gold)' }}>{formatCOP(total)}</span>
          </div>
        </div>
      </div>

      <StepFooter
        onBack={prevStep}
        onContinue={() => { haptic([50, 30, 50]); nextStep(); }}
        continueLabel="Ver resultado →"
      />
    </div>
  );
}
