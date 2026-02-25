import { useBill } from '../../context/BillContext';

const STEP_LABELS = ['Foto', 'Ítems', 'Personas', 'Asignar', 'Impuesto', 'Resultado'];

export default function Stepper() {
  const { state } = useBill();
  const current = state.step;

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-[430px] mx-auto">
        {STEP_LABELS.map((label, idx) => {
          const stepNum = (idx + 1) as 1 | 2 | 3 | 4 | 5 | 6;
          const isDone = stepNum < current;
          const isActive = stepNum === current;

          return (
            <div key={stepNum} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                {idx > 0 && (
                  <div className={`flex-1 h-0.5 ${isDone ? 'bg-indigo-500' : 'bg-gray-200'}`} />
                )}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors
                    ${isActive ? 'bg-indigo-600 text-white' : isDone ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-500'}`}
                >
                  {isDone ? '✓' : stepNum}
                </div>
                {idx < STEP_LABELS.length - 1 && (
                  <div className={`flex-1 h-0.5 ${isDone ? 'bg-indigo-500' : 'bg-gray-200'}`} />
                )}
              </div>
              <span className={`mt-1 text-[10px] font-medium ${isActive ? 'text-indigo-600' : isDone ? 'text-indigo-400' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
