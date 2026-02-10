// Main application entry point
import { setTheme, initializeTheme } from './theme.js';
import { renderPeople, addPerson, removePerson } from './people.js';
import { renderProductsTable, addProduct, removeProduct, togglePeopleMenu, assignAllPeople, assignPersonToProduct, removePersonFromProduct, updateProductQuantity } from './products.js';
import { splitBill } from './split.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('Split-Pay initialized');

  // Elements
  const els = {
    personName: document.getElementById('personName'),
    addPersonBtn: document.getElementById('addPersonBtn'),
    peopleList: document.getElementById('peopleList'),
    productName: document.getElementById('productName'),
    productPrice: document.getElementById('productPrice'),
    addProductBtn: document.getElementById('addProductBtn'),
    productsTableWrap: document.getElementById('productsTableWrap'),
    splitBtn: document.getElementById('splitBtn'),
    results: document.getElementById('results'),
    grandTotal: document.getElementById('grandTotal'),
    taxAmount: document.getElementById('taxAmount'),
    themeToggle: document.getElementById('themeToggle'),
  };

  // Rendering
  function render() {
    renderPeople();
    renderProductsTable();
    els.results.innerHTML = '';
    if (els.grandTotal) els.grandTotal.textContent = '';
    if (els.taxAmount) els.taxAmount.textContent = '';
  }

  // People events
  els.addPersonBtn.addEventListener('click', () => {
    addPerson(els.personName.value, els.personName);
    render();
  });
  
  els.personName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addPerson(els.personName.value, els.personName);
      render();
    }
  });

  els.peopleList.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.matches('button.chip-remove[data-remove-person]')) {
      const id = Number(t.getAttribute('data-remove-person'));
      removePerson(id);
      render();
    }
  });

  // Product events
  els.addProductBtn.addEventListener('click', () => {
    addProduct(els.productName.value, els.productPrice.value, els.productName, els.productPrice);
    render();
  });
  
  els.productName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addProduct(els.productName.value, els.productPrice.value, els.productName, els.productPrice);
      render();
    }
  });
  
  els.productPrice.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addProduct(els.productName.value, els.productPrice.value, els.productName, els.productPrice);
      render();
    }
  });

  els.productsTableWrap.addEventListener('change', (e) => {
    const t = e.target;
    if (t && t.matches('input[type="number"][data-qty-pid]')) {
      const productId = Number(t.getAttribute('data-qty-pid'));
      updateProductQuantity(productId, t.value);
      els.results.innerHTML = '';
      if (els.grandTotal) els.grandTotal.textContent = '';
    }
  });

  els.productsTableWrap.addEventListener('click', (e) => {
    const t = e.target;
    
    const removeBtn = t.closest('button[data-remove-product]');
    if (removeBtn) {
      const id = Number(removeBtn.getAttribute('data-remove-product'));
      removeProduct(id);
      render();
      return;
    }
    
    const toggleBtn = t.closest('button[data-toggle-menu]');
    if (toggleBtn) {
      const id = Number(toggleBtn.getAttribute('data-toggle-menu'));
      togglePeopleMenu(id);
      return;
    }
    
    const assignAllOption = t.closest('[data-assign-all]');
    if (assignAllOption) {
      const id = Number(assignAllOption.getAttribute('data-assign-all'));
      assignAllPeople(id);
      render();
      return;
    }
    
    const assignOption = t.closest('[data-assign-person]');
    if (assignOption) {
      const productId = Number(assignOption.getAttribute('data-assign-person'));
      const personId = Number(assignOption.getAttribute('data-person-id'));
      assignPersonToProduct(productId, personId);
      render();
      return;
    }
    
    const removeAssignment = t.closest('[data-remove-assignment]');
    if (removeAssignment) {
      const productId = Number(removeAssignment.getAttribute('data-remove-assignment'));
      const personId = Number(removeAssignment.getAttribute('data-person-id'));
      removePersonFromProduct(productId, personId);
      render();
      return;
    }
  });

  // Split button
  els.splitBtn.addEventListener('click', splitBill);

  // Share button handler
  els.results.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.matches('button.share-btn[data-share-name][data-share-amount]')) {
      const name = t.getAttribute('data-share-name');
      const amount = t.getAttribute('data-share-amount');
      const message = `Hi ${name}! Your share of the bill is $${amount}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  });

  // Theme toggle
  if (els.themeToggle) {
    els.themeToggle.addEventListener('click', () => {
      const current = (document.documentElement.getAttribute('data-theme') === 'day') ? 'day' : 'night';
      setTheme(current === 'day' ? 'night' : 'day');
    });
  }

  // Initial render and theme
  render();
  initializeTheme();
});
