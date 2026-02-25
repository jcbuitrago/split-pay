import { useBill } from '../../context/BillContext';
import { formatCOP } from '../../utils/formatCurrency';
import PersonChips from '../ui/PersonChips';

export default function Step4Assign() {
  const { state, dispatch, nextStep, prevStep } = useBill();

  function togglePerson(itemId: string, personId: string) {
    const item = state.items.find(i => i.id === itemId);
    if (!item) return;
    if (item.assignedTo.includes(personId)) {
      dispatch({ type: 'UNASSIGN_PERSON', itemId, personId });
    } else {
      dispatch({ type: 'ASSIGN_PERSON', itemId, personId });
    }
  }

  const assignedCount = state.items.filter(i => i.assignedTo.length > 0).length;
  const allAssigned = assignedCount === state.items.length;

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Asignar ítems</h2>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${allAssigned ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
            {assignedCount}/{state.items.length} asignados
          </span>
        </div>

        <p className="text-sm text-gray-500 -mt-1">Toca las personas que consumieron cada ítem.</p>

        {state.items.map(item => {
          const unassigned = item.assignedTo.length === 0;
          return (
            <div
              key={item.id}
              className={`bg-white border rounded-xl p-4 flex flex-col gap-3 transition-colors ${unassigned ? 'border-red-300' : 'border-gray-200'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.quantity} × {formatCOP(item.price)}
                    {item.assignedTo.length > 1 && (
                      <span className="ml-1 text-indigo-500">
                        · {formatCOP(item.price * item.quantity / item.assignedTo.length)} c/u
                      </span>
                    )}
                  </p>
                </div>
                {unassigned && <span className="text-red-400 text-lg shrink-0">⚠️</span>}
              </div>

              <PersonChips
                people={state.people}
                selected={item.assignedTo}
                onToggle={pid => togglePerson(item.id, pid)}
                scrollable
              />
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 px-4 py-4 border-t border-gray-100 bg-white">
        <button
          onClick={prevStep}
          className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 active:bg-gray-100"
        >
          ← Atrás
        </button>
        <button
          onClick={nextStep}
          disabled={!allAssigned}
          className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-40 active:bg-indigo-700"
        >
          Continuar →
        </button>
      </div>
    </div>
  );
}
