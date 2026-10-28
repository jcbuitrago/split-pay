import { useState } from 'react';
import { motion } from 'framer-motion';
import { useBill } from '../../context/BillContext';
import { useHaptic } from '../../hooks/useHaptic';

const STEP_LABELS = ['Foto', 'Ítems', 'Personas', 'Asignar', 'Impuesto', 'Resultado'];
const N = STEP_LABELS.length;

export default function Stepper() {
  const { state, goToStep } = useBill();
  const haptic = useHaptic();
  const [focusedStep, setFocusedStep] = useState<number | null>(null);
  const current = state.step;

  // Each circle sits at the center of its flex-1 slot.
  // With N slots the first center is at (100/N)/2 = 50/N % from the left,
  // and the last is at 100 - 50/N %. We use those as the left/right offsets
  // of the track so it exactly connects circle centers.
  const edgePercent = 50 / N; // ≈ 8.33 % for 6 steps
  const progress = (current - 1) / (N - 1); // 0 → 1

  return (
    <div
      className="px-4 py-3 border-b"
      style={{ backgroundColor: 'var(--color-darkest)', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <div className="relative flex max-w-[430px] mx-auto">

        {/* ── Track (grey background) ── */}
        <div
          className="absolute h-0.5 top-3.5 pointer-events-none"
          style={{
            left: `${edgePercent}%`,
            right: `${edgePercent}%`,
            backgroundColor: 'var(--color-muted-surface)',
          }}
        >
          {/* ── Progress fill ── */}
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${progress * 100}%`,
              backgroundColor: 'var(--color-purple)',
            }}
          />
        </div>

        {/* ── Circles + labels ── */}
        {STEP_LABELS.map((label, idx) => {
          const stepNum = (idx + 1) as 1 | 2 | 3 | 4 | 5 | 6;
          const isDone = stepNum < current;
          const isActive = stepNum === current;
          // Solo los pasos ya recorridos son navegables. Hacia adelante se avanza
          // con "Continuar", que es donde viven las validaciones de cada paso.
          const canNavigate = isDone;
          const isFocused = focusedStep === stepNum;

          // El glow activo y el anillo de foco se apilan en el mismo boxShadow,
          // por eso no se usa focus-visible: de Tailwind — lo sobrescribiría.
          // El anillo es blanco con un gap del color del fondo: --glow-purple-ring
          // es morado al 25 % y resulta invisible sobre un círculo ya morado.
          const shadows = [
            isActive ? 'var(--glow-purple)' : null,
            isFocused ? '0 0 0 2px var(--color-darkest)' : null,
            isFocused ? '0 0 0 4px var(--color-white)' : null,
          ].filter(Boolean);

          return (
            <div key={stepNum} className="flex-1 flex flex-col items-center relative z-10">
              <motion.button
                type="button"
                disabled={!canNavigate}
                onClick={() => {
                  haptic();
                  goToStep(stepNum);
                }}
                onFocus={() => setFocusedStep(stepNum)}
                onBlur={() => setFocusedStep(null)}
                whileTap={canNavigate ? { scale: 0.9 } : undefined}
                aria-label={canNavigate ? `Volver al paso ${stepNum}: ${label}` : `Paso ${stepNum}: ${label}`}
                aria-current={isActive ? 'step' : undefined}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all outline-none appearance-none ${
                  canNavigate ? 'cursor-pointer' : 'cursor-default'
                }`}
                style={{
                  backgroundColor: isActive || isDone ? 'var(--color-purple)' : 'var(--color-muted-surface)',
                  color: isActive || isDone ? 'var(--color-white)' : 'var(--color-muted)',
                  boxShadow: shadows.length > 0 ? shadows.join(', ') : 'none',
                }}
              >
                {isDone ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" style={{ display: 'block' }}>
                    <path d="M2 6 L5 9 L10 3" stroke="var(--color-white)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span style={{ lineHeight: 1 }}>{stepNum}</span>
                )}
              </motion.button>
              <span
                className="mt-1 text-[10px] font-medium text-center transition-colors"
                style={{ color: isActive || isDone ? 'var(--color-purple)' : 'var(--color-muted)' }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
