// People section management
import { state, incrementPersonId } from './state.js';
import { escapeHtml } from './utils.js';

export function renderPeople() {
  const peopleList = document.getElementById('peopleList');
  if (state.people.length === 0) {
    peopleList.innerHTML = '<p class="muted">No people yet.</p>';
    return;
  }
  peopleList.innerHTML = state.people
    .map(p => `
      <div class="person-chip">
        <span class="chip-name">${escapeHtml(p.name)}</span>
        <button class="chip-remove" data-remove-person="${p.id}" aria-label="Remove ${escapeHtml(p.name)}">&times;</button>
      </div>
    `)
    .join('');
}

export function addPerson(name, personNameInput) {
  const n = name.trim();
  if (!n) return;
  state.people.push({ id: incrementPersonId(), name: n });
  if (personNameInput) {
    personNameInput.value = '';
    personNameInput.focus();
  }
}

export function removePerson(personId) {
  state.people = state.people.filter(p => p.id !== personId);
  for (const prod of state.products) {
    if (prod.consumers) prod.consumers.delete(personId);
  }
}
