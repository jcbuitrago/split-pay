import { useBill } from '../../context/BillContext';
import { formatCOP } from '../../utils/formatCurrency';
import { calculateSubtotal } from '../../utils/calculations';
import PersonChips from '../ui/PersonChips';
import PersonAvatar from '../ui/PersonAvatar';
import StepFooter from '../ui/StepFooter';

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

  function personSubtotal(personId: string): number {
    return calculateSubtotal(
      state.items
        .filter(i => i.assignedTo.includes(personId))
        .map(i => ({ ...i, price: i.price / i.assignedTo.length }))
    );
  }

  return (
    <div className="flex flex-col flex-1" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold" style={{ color: 'var(--color-white)' }}>Asignar ítems</h2>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{
              backgroundColor: allAssigned ? 'rgba(91,91,214,0.2)' : 'rgba(245,197,66,0.15)',
              color: allAssigned ? 'var(--color-purple)' : 'var(--color-gold)',
            }}
          >
            {assignedCount}/{state.items.length} asignados
          </span>
        </div>

        <p className="text-sm -mt-1" style={{ color: 'var(--color-muted)' }}>
          Toca las personas que consumieron cada ítem.
        </p>

        {state.items.map(item => {
          const unassigned = item.assignedTo.length === 0;
          return (
            <div
              key={item.id}
              className="rounded-2xl p-4 flex flex-col gap-3 border transition-colors"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: unassigned ? 'var(--color-gold)' : 'rgba(255,255,255,0.06)',
                borderLeftWidth: unassigned ? 3 : 1,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold" style={{ color: 'var(--color-white)' }}>{item.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                    {item.quantity} × {formatCOP(item.price)}
                    {item.assignedTo.length > 1 && (
                      <span className="ml-1" style={{ color: 'var(--color-gold)' }}>
                        · {formatCOP(item.price * item.quantity / item.assignedTo.length)} c/u
                      </span>
                    )}
                  </p>
                </div>
                {unassigned && <span className="text-base shrink-0">⚠️</span>}
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

      {/* Sticky subtotals bar */}
      {state.people.length > 0 && (
        <div
          className="px-4 py-2.5 border-t flex gap-4 overflow-x-auto scrollbar-hide"
          style={{ backgroundColor: 'var(--color-bg)', borderColor: 'rgba(255,255,255,0.06)' }}
        >
          {state.people.map(person => (
            <div key={person.id} className="flex flex-col items-center gap-1 shrink-0">
              <PersonAvatar name={person.name} size="sm" assigned={personSubtotal(person.id) > 0} />
              <span
                className="text-[10px] font-semibold"
                style={{ color: personSubtotal(person.id) > 0 ? 'var(--color-purple)' : 'var(--color-muted)' }}
              >
                {formatCOP(personSubtotal(person.id))}
              </span>
            </div>
          ))}
        </div>
      )}

      <StepFooter onBack={prevStep} onContinue={nextStep} continueDisabled={!allAssigned} />
    </div>
  );
}
