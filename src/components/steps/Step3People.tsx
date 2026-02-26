import { useState, useRef } from 'react';
import { useBill } from '../../context/BillContext';

export default function Step3People() {
  const { state, dispatch, nextStep, prevStep, nextPersonColor } = useBill();
  const [inputName, setInputName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function haptic() {
    if ('vibrate' in navigator) navigator.vibrate(50);
  }

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
    <div className="flex flex-col flex-1">
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">¿Quiénes pagan?</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2">Agrega al menos 2 personas para continuar.</p>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputName}
            onChange={e => setInputName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nombre de la persona"
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleAdd}
            disabled={!inputName.trim()}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 active:bg-indigo-700"
          >
            Agregar
          </button>
        </div>

        {state.people.length === 0 && (
          <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-6">Sin personas aún.</p>
        )}

        <div className="flex flex-wrap gap-2">
          {state.people.map(person => (
            <div
              key={person.id}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-white text-sm font-semibold"
              style={{ backgroundColor: person.color }}
            >
              <span>{person.name}</span>
              <button
                onClick={() => handleRemove(person.id)}
                className="text-white/70 hover:text-white text-xs font-bold ml-0.5 active:text-white"
                aria-label={`Eliminar ${person.name}`}
              >
                ✕
              </button>
            </div>
          ))}
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
          onClick={nextStep}
          disabled={!canContinue}
          className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-40 active:bg-indigo-700"
        >
          Continuar →
        </button>
      </div>
    </div>
  );
}
