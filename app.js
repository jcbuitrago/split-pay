document.addEventListener('DOMContentLoaded', () => {
  // State
  const state = {
    people: [],           // [{ id, name }]
    products: []          // [{ id, name, price, consumers: Set<personId> }]
  };
  let nextPersonId = 1;
  let nextProductId = 1;

  // Elements
  const els = {
    personName: document.getElementById('personName'),
    addPersonBtn: document.getElementById('addPersonBtn'),
    peopleList: document.getElementById('peopleList'),
    productName: document.getElementById('productName'),
    productPrice: document.getElementById('productPrice'),
    addProductBtn: document.getElementById('addProductBtn'),
    productsTableWrap: document.getElementById('productsTableWrap'),
    taxPercent: document.getElementById('taxPercent'),
    splitBtn: document.getElementById('splitBtn'),
    results: document.getElementById('results'),
    grandTotal: document.getElementById('grandTotal'),
    themeToggle: document.getElementById('themeToggle'),
  };

  // Theme
  function setTheme(theme) {
    const t = theme === 'day' ? 'day' : 'night';
    if (t === 'day') {
      document.documentElement.setAttribute('data-theme', 'day');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    try { localStorage.setItem('splitpay-theme', t); } catch {}
    if (els.themeToggle) {
      els.themeToggle.textContent = t === 'day' ? '🌙 Night' : '☀️ Day';
      els.themeToggle.setAttribute('aria-label', t === 'day' ? 'Switch to night theme' : 'Switch to day theme');
    }
  }

  // Actions
  function removePerson(personId) {
    state.people = state.people.filter(p => p.id !== personId);
    for (const prod of state.products) {
      if (prod.consumers) prod.consumers.delete(personId);
    }
    render();
  }

  function removeProduct(productId) {
    state.products = state.products.filter(p => p.id !== productId);
    render();
  }

  function addPerson(name) {
    const n = name.trim();
    if (!n) return;
    state.people.push({ id: nextPersonId++, name: n });
    render();
    els.personName.value = '';
    els.personName.focus();
  }

  function addProduct(name, priceInput) {
    const n = name.trim();
    const price = Number(priceInput);
    if (!n || !isFinite(price) || price <= 0) return;
    state.products.push({ id: nextProductId++, name: n, price, quantity: 1, consumers: new Set() });
    render();
    els.productName.value = '';
    els.productPrice.value = '';
    els.productName.focus();
  }

  function toggleConsumption(productId, personId, checked) {
    const p = state.products.find(x => x.id === productId);
    if (!p) return;
    if (checked) p.consumers.add(personId);
    else p.consumers.delete(personId);
  }

  function splitBill() {
    if (state.people.length === 0 || state.products.length === 0) {
      els.results.innerHTML = '<li class="muted">Add people and products first.</li>';
      if (els.grandTotal) els.grandTotal.textContent = '';
      return;
    }
    const rateInput = els.taxPercent ? Number(els.taxPercent.value) : 0;
    const taxRate = (isFinite(rateInput) && rateInput >= 0) ? rateInput : 0;
    const totals = new Map(state.people.map(p => [p.id, 0]));
    let grand = 0;
    for (const prod of state.products) {
      const consumers = [...prod.consumers];
      if (consumers.length === 0) continue; // unassigned product ignored
      const qty = prod.quantity || 1;
      const adjustedPrice = (prod.price * qty) * (1 + taxRate / 100);
      const share = adjustedPrice / consumers.length;
      for (const pid of consumers) totals.set(pid, totals.get(pid) + share);
      grand += adjustedPrice;
    }
    els.results.innerHTML = state.people
      .map(p => {
        const amt = (totals.get(p.id) || 0);
        return `
          <div class="result-card">
            <div class="result-info">
              <span class="result-name">${escapeHtml(p.name)}</span>
              <span class="result-amount">$${formatCurrency(amt)}</span>
            </div>
            <button class="share-btn" data-share-name="${escapeHtml(p.name)}" data-share-amount="${formatCurrency(amt)}" aria-label="Share ${escapeHtml(p.name)}'s bill">
              📤
            </button>
          </div>
        `;
      }).join('');
    if (els.grandTotal) {
      els.grandTotal.innerHTML = `<strong>Total (incl. tax):</strong> $${formatCurrency(grand)}`;
    }
  }

  // Rendering
  function render() {
    renderPeople();
    renderProductsTable();
    els.results.innerHTML = ''; // clear results when state changes
    if (els.grandTotal) els.grandTotal.textContent = '';
  }

  function renderPeople() {
    if (state.people.length === 0) {
      els.peopleList.innerHTML = '<p class="muted">No people yet.</p>';
      return;
    }
    els.peopleList.innerHTML = state.people
      .map(p => `
        <div class="person-chip">
          <span class="chip-name">${escapeHtml(p.name)}</span>
          <button class="chip-remove" data-remove-person="${p.id}" aria-label="Remove ${escapeHtml(p.name)}">&times;</button>
        </div>
      `)
      .join('');
  }

  function renderProductsTable() {
    const people = state.people;
    const prods = state.products;

    if (prods.length === 0) {
      els.productsTableWrap.innerHTML = '<p class="muted">No products yet.</p>';
      return;
    }

    // Table header with dynamic person columns
    const header = `
      <thead>
        <tr>
          <th>Product</th>
          <th>Qty</th>
          <th class="right">Price ($)</th>
          ${people.map(p => `<th>${escapeHtml(p.name)}</th>`).join('')}
          <th class="remove-col">Remove</th>
        </tr>
      </thead>
    `;

    // Rows with checkboxes for each person
    const rows = prods.map(prod => `
      <tr data-product-id="${prod.id}">
        <td>${escapeHtml(prod.name)}</td>
        <td><input type="number" class="qty-input" min="1" value="${prod.quantity || 1}" data-qty-pid="${prod.id}"></td>
        <td class="right">${formatCurrency(prod.price)}</td>
        ${people.map(person => {
          const checked = prod.consumers.has(person.id) ? 'checked' : '';
          return `<td><input type="checkbox" data-pid="${prod.id}" data-uid="${person.id}" ${checked}></td>`;
        }).join('')}
        <td class="remove-col"><button data-remove-product="${prod.id}" aria-label="Remove product ${escapeHtml(prod.name)}">Remove</button></td>
      </tr>
    `).join('');

    els.productsTableWrap.innerHTML = `
      <table>
        ${header}
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  // Events
  els.addPersonBtn.addEventListener('click', () => addPerson(els.personName.value));
  els.personName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addPerson(els.personName.value);
  });

  els.addProductBtn.addEventListener('click', () =>
    addProduct(els.productName.value, els.productPrice.value)
  );
  els.productName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addProduct(els.productName.value, els.productPrice.value);
  });
  els.productPrice.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addProduct(els.productName.value, els.productPrice.value);
  });

  els.productsTableWrap.addEventListener('change', (e) => {
    const t = e.target;
    if (t && t.matches('input[type="checkbox"][data-pid][data-uid]')) {
      const productId = Number(t.getAttribute('data-pid'));
      const userId = Number(t.getAttribute('data-uid'));
      toggleConsumption(productId, userId, t.checked);
    } else if (t && t.matches('input[type="number"][data-qty-pid]')) {
      const productId = Number(t.getAttribute('data-qty-pid'));
      const p = state.products.find(x => x.id === productId);
      if (!p) return;
      const q = Math.max(1, Math.floor(Number(t.value)) || 1);
      p.quantity = q;
      els.results.innerHTML = '';
      if (els.grandTotal) els.grandTotal.textContent = '';
    }
  });

  // Delegated clicks for removals
  els.productsTableWrap.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.matches('button[data-remove-product]')) {
      const id = Number(t.getAttribute('data-remove-product'));
      removeProduct(id);
    }
  });

  els.peopleList.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.matches('button.chip-remove[data-remove-person]')) {
      const id = Number(t.getAttribute('data-remove-person'));
      removePerson(id);
    }
  });

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

  // Utils
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function formatCurrency(amount) {
    return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  console.log('Split-Pay initialized');
  // Initial render
  render();

  // Initialize theme from storage
  try {
    const saved = localStorage.getItem('splitpay-theme');
    setTheme(saved === 'day' ? 'day' : 'night');
  } catch {
    setTheme('night');
  }
});
