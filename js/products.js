// Products section management
import { state, incrementProductId } from './state.js';
import { escapeHtml, formatCurrency } from './utils.js';

export function renderProductsTable() {
  const productsTableWrap = document.getElementById('productsTableWrap');
  const people = state.people;
  const prods = state.products;

  if (prods.length === 0) {
    productsTableWrap.innerHTML = '<p class="muted">No products yet.</p>';
    return;
  }

  productsTableWrap.innerHTML = prods.map(prod => {
    const assignedPeople = [...prod.consumers]
      .map(personId => state.people.find(p => p.id === personId))
      .filter(p => p);
    
    return `
      <div class="product-card" data-product-id="${prod.id}">
        <div class="product-row-top">
          <span class="product-name">${escapeHtml(prod.name)}</span>
          <div class="product-qty">
            <label>Qty:</label>
            <input type="number" class="qty-input" min="1" value="${prod.quantity || 1}" data-qty-pid="${prod.id}">
          </div>
          <span class="product-price">$${formatCurrency(prod.price)}</span>
          <button class="product-remove" data-remove-product="${prod.id}" aria-label="Remove product">&times;</button>
        </div>
        <button class="assign-button" data-toggle-menu="${prod.id}">Assign People</button>
        <div class="people-menu" id="people-menu-${prod.id}" style="display: none;">
          ${people.length > 0 ? `
            <div class="menu-option" data-assign-all="${prod.id}">
              <strong>All People</strong>
            </div>
            ${people.map(person => `
              <div class="menu-option" data-assign-person="${prod.id}" data-person-id="${person.id}">
                ${escapeHtml(person.name)}
              </div>
            `).join('')}
          ` : '<div class="menu-option muted">No people added yet</div>'}
        </div>
        <div class="assigned-people">
          ${assignedPeople.map(person => `
            <span class="person-tag">
              ${escapeHtml(person.name)}
              <span class="remove-person" data-remove-assignment="${prod.id}" data-person-id="${person.id}">&times;</span>
            </span>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

export function addProduct(name, priceInput, productNameInput, productPriceInput) {
  const n = name.trim();
  const price = Number(priceInput);
  if (!n || !isFinite(price) || price <= 0) return;
  state.products.push({ id: incrementProductId(), name: n, price, quantity: 1, consumers: new Set() });
  if (productNameInput && productPriceInput) {
    productNameInput.value = '';
    productPriceInput.value = '';
    productNameInput.focus();
  }
}

export function removeProduct(productId) {
  state.products = state.products.filter(p => p.id !== productId);
}

export function togglePeopleMenu(productId) {
  const menu = document.getElementById(`people-menu-${productId}`);
  if (!menu) return;
  
  // Close all other menus
  document.querySelectorAll('.people-menu').forEach(m => {
    if (m.id !== `people-menu-${productId}`) {
      m.style.display = 'none';
    }
  });
  
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

export function assignAllPeople(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;
  
  state.people.forEach(person => {
    product.consumers.add(person.id);
  });
}

export function assignPersonToProduct(productId, personId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;
  
  product.consumers.add(personId);
}

export function removePersonFromProduct(productId, personId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;
  
  product.consumers.delete(personId);
}

export function updateProductQuantity(productId, quantity) {
  const p = state.products.find(x => x.id === productId);
  if (!p) return;
  p.quantity = Math.max(1, Math.floor(Number(quantity)) || 1);
}
