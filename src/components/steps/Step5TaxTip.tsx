import { useBill } from '../../context/BillContext';
import { formatCOP } from '../../utils/formatCurrency';
import { calculateSubtotal, calculateTax, calculateTip, roundToNearest100 } from '../../utils/calculations';

export default function Step5TaxTip() {
  const { state, dispatch, nextStep, prevStep } = useBill();

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

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Impuesto y propina</h2>

        {/* Impuesto */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900 dark:text-white">IVA</span>
            <span className="text-indigo-600 font-bold">{state.taxPercent}%</span>
          </div>

          {/* Toggle: ¿IVA incluido en precios? */}
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">¿Precios con IVA incluido?</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {state.taxIncluded ? 'El IVA ya está en los precios del menú' : 'El IVA se sumará a los precios'}
              </span>
            </div>
            <div className="flex bg-gray-200 dark:bg-gray-600 rounded-lg p-0.5 shrink-0 ml-3">
              <button
                onClick={() => dispatch({ type: 'SET_TAX_INCLUDED', value: true })}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${state.taxIncluded ? 'bg-white dark:bg-gray-800 text-indigo-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
              >
                Sí
              </button>
              <button
                onClick={() => dispatch({ type: 'SET_TAX_INCLUDED', value: false })}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${!state.taxIncluded ? 'bg-white dark:bg-gray-600 text-indigo-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
              >
                No
              </button>
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={30}
            step={1}
            value={state.taxPercent}
            onChange={e => handleTaxChange(Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={state.taxPercent}
              onChange={e => handleTaxChange(Number(e.target.value))}
              className="w-20 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">IVA típico en restaurantes Colombia: 8%</span>
          </div>
        </div>

        {/* Propina */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900 dark:text-white">Propina</span>
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
              <button
                onClick={() => dispatch({ type: 'SET_TIP_TYPE', value: 'percent' })}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${state.tipType === 'percent' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
              >
                %
              </button>
              <button
                onClick={() => dispatch({ type: 'SET_TIP_TYPE', value: 'fixed' })}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${state.tipType === 'fixed' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
              >
                Monto fijo
              </button>
            </div>
          </div>

          {state.tipType === 'percent' ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Porcentaje</span>
                <span className="text-indigo-600 font-bold">{state.tipPercent}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={state.tipPercent}
                onChange={e => handleTipPercentChange(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <input
                type="number"
                min={0}
                max={100}
                value={state.tipPercent}
                onChange={e => handleTipPercentChange(Number(e.target.value))}
                className="w-20 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">Monto ($)</span>
              <input
                type="text"
                inputMode="numeric"
                value={state.tipAmount || ''}
                onChange={e => handleTipAmountChange(e.target.value)}
                placeholder="0"
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <div className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              id="tipVoluntary"
              checked={state.tipIsVoluntary}
              onChange={e => dispatch({ type: 'SET_TIP_VOLUNTARY', value: e.target.checked })}
              className="w-4 h-4 accent-indigo-600"
            />
            <label htmlFor="tipVoluntary" className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
              Propina voluntaria
            </label>
          </div>
          {state.tipIsVoluntary && (
            <p className="text-xs text-gray-400 dark:text-gray-500">(La propina es voluntaria — Ley colombiana)</p>
          )}
        </div>

        {/* Preview del total */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-4 flex flex-col gap-2">
          <h3 className="font-semibold text-indigo-900 dark:text-indigo-200 text-sm mb-1">Resumen</h3>
          <div className="flex justify-between text-sm text-gray-700 dark:text-gray-200"><span>{state.taxIncluded ? 'Subtotal (IVA incl.)' : 'Subtotal'}</span>
            <span>{formatCOP(subtotal)}</span>
          </div>
          {state.taxIncluded ? (
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500"><span>↳ IVA incluido ({state.taxPercent}%)</span>
              <span>{formatCOP(tax)}</span>
            </div>
          ) : (
            <div className="flex justify-between text-sm text-gray-700 dark:text-gray-200"><span>IVA ({state.taxPercent}%)</span>
              <span>{formatCOP(tax)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-gray-700 dark:text-gray-200"><span>Propina {state.tipType === 'percent' ? `(${state.tipPercent}% s/IVA, redondeada)` : '(fijo)'}</span>
            <span>{formatCOP(tip)}</span>
          </div>
          <div className="h-px bg-indigo-200 dark:bg-indigo-700 my-1" />
          <div className="flex justify-between font-bold text-indigo-900 dark:text-indigo-100">
            <span>Total</span>
            <span className="text-lg">{formatCOP(total)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 px-4 py-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
        <button
          onClick={prevStep}
          className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-200 active:bg-gray-100 dark:active:bg-gray-700"
        >
          ← Atrás
        </button>
        <button
          onClick={() => {
            if ('vibrate' in navigator) navigator.vibrate([50, 30, 50]);
            nextStep();
          }}
          className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold active:bg-indigo-700"
        >
          Ver resultado →
        </button>
      </div>
    </div>
  );
}
