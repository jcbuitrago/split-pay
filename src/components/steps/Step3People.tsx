import { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useBill } from '../../context/BillContext';
import PersonAvatar from '../ui/PersonAvatar';
import StepFooter from '../ui/StepFooter';
import { useHaptic } from '../../hooks/useHaptic';

export default function Step3People() {
  const { state, dispatch, nextStep, prevStep, nextPersonColor } = useBill();
  const haptic = useHaptic();
  const [inputName, setInputName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    const name = inputName.trim();
    if (!name) return;
    haptic();
    dispatch({
      type: 'ADD_PERSON',
      person: {
        id: `person-${Date.now()}`,
        name,
        color: nextPersonColor(),
      },
    });
    setInputName('');
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  }

  function handleRemove(id: string) {
    dispatch({ type: 'REMOVE_PERSON', id });
  }

  const canContinue = state.people.length >= 2;

  return (
    <div className="flex flex-col flex-1" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-display font-bold" style={{ color: 'var(--color-white)' }}>¿Quiénes pagan?</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Agrega al menos 2 personas para continuar.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputName}
            onChange={e => setInputName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nombre de la persona"
            className="flex-1 border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'rgba(255,255,255,0.1)',
              color: 'var(--color-white)',
            }}
          />
          <button
            onClick={handleAdd}
            disabled={!inputName.trim()}
            className="px-5 py-3 rounded-2xl font-bold text-sm disabled:opacity-40 active:opacity-80 transition-opacity"
            style={{ backgroundColor: 'var(--color-purple)', color: '#ffffff' }}
          >
            Agregar
          </button>
        </div>

        {state.people.length === 0 && (
          <p className="text-sm text-center py-6" style={{ color: 'var(--color-muted)' }}>
            Sin personas aún.
          </p>
        )}

        {/* Grid 2 columnas */}
        <motion.div layout className="grid grid-cols-2 gap-3">
          <AnimatePresence>
            {state.people.map(person => (
              <motion.div
                key={person.id}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border relative"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'rgba(91,91,214,0.3)',
                }}
              >
                <button
                  onClick={() => handleRemove(person.id)}
                  className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold active:opacity-70"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--color-muted)' }}
                  aria-label={`Eliminar ${person.name}`}
                >
                  ✕
                </button>
                <PersonAvatar name={person.name} size="sm" />
                <span className="text-sm font-semibold text-center truncate w-full" style={{ color: 'var(--color-white)' }}>
                  {person.name}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      <StepFooter onBack={prevStep} onContinue={nextStep} continueDisabled={!canContinue} />
    </div>
  );
}
