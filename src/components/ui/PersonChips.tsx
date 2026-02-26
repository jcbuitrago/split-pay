import { Person } from '../../types/bill';

interface PersonChipsProps {
  people: Person[];
  selected: string[];
  onToggle: (id: string) => void;
  scrollable?: boolean;
}

export default function PersonChips({ people, selected, onToggle, scrollable = false }: PersonChipsProps) {
  return (
    <div className={`flex gap-2 ${scrollable ? 'overflow-x-auto scrollbar-hide' : 'flex-wrap'}`}>
      {people.map(person => {
        const isSelected = selected.includes(person.id);
        return (
          <button
            key={person.id}
            type="button"
            onClick={() => onToggle(person.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95
              ${isSelected ? 'text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
            style={isSelected ? { backgroundColor: person.color } : {}}
          >
            {person.name}
          </button>
        );
      })}
    </div>
  );
}
