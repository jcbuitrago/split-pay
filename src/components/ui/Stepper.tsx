import { useBill } from '../../context/BillContext';

const STEP_LABELS = ['Foto', 'Ítems', 'Personas', 'Asignar', 'Impuesto', 'Resultado'];

export default function Stepper() {
  const { state } = useBill();
  const current = state.step;

  return (
    <div className="px-4 py-3 border-b" style={{ backgroundColor: 'var(--color-darkest)', borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between max-w-[430px] mx-auto">
        {STEP_LABELS.map((label, idx) => {
          const stepNum = (idx + 1) as 1 | 2 | 3 | 4 | 5 | 6;
          const isDone = stepNum < current;
          const isActive = stepNum === current;

          return (
            <div key={stepNum} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                {idx > 0 && (
                  <div
                    className="flex-1 h-0.5 transition-colors"
                    style={{ backgroundColor: isDone ? 'var(--color-purple)' : 'var(--color-muted-surface)' }}
                  />
                )}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all"
                  style={{
                    backgroundColor: isActive || isDone ? 'var(--color-purple)' : 'var(--color-muted-surface)',
                    color: isActive || isDone ? '#ffffff' : 'var(--color-muted)',
                    boxShadow: isActive ? 'var(--glow-purple)' : 'none',
                  }}
                >
                  {isDone ? (
                    <svg width="12" height="12" viewBox="0 0 12 12">
                      <path d="M2 6 L5 9 L10 3" stroke="#ffffff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : stepNum}
                </div>
                {idx < STEP_LABELS.length - 1 && (
                  <div
                    className="flex-1 h-0.5 transition-colors"
                    style={{ backgroundColor: isDone ? 'var(--color-purple)' : 'var(--color-muted-surface)' }}
                  />
                )}
              </div>
              <span
                className="mt-1 text-[10px] font-medium transition-colors"
                style={{ color: isActive ? 'var(--color-purple)' : isDone ? 'var(--color-purple)' : 'var(--color-muted)' }}
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
