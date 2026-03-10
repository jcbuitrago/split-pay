import { Person } from '../../types/bill';
import PersonAvatar from './PersonAvatar';

interface PersonChipsProps {
  people: Person[];
  selected: string[];
  onToggle: (id: string) => void;
  scrollable?: boolean;
}

export default function PersonChips({ people, selected, onToggle, scrollable = false }: PersonChipsProps) {
  return (
    <div className={`flex gap-4 py-1 ${scrollable ? 'overflow-x-auto scrollbar-hide' : 'flex-wrap'}`}>
      {people.map(person => {
        const isSelected = selected.includes(person.id);
        return (
          <PersonAvatar
            key={person.id}
            name={person.name}
            size="sm"
            assigned={isSelected}
            onToggle={() => onToggle(person.id)}
            showName
          />
        );
      })}
    </div>
  );
}
