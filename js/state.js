// Application state
export const state = {
  people: [],           // [{ id, name }]
  products: []          // [{ id, name, price, consumers: Set<personId> }]
};

export let nextPersonId = 1;
export let nextProductId = 1;

export function incrementPersonId() {
  return nextPersonId++;
}

export function incrementProductId() {
  return nextProductId++;
}
