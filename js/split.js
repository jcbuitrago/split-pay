// Split bill logic
import { state } from './state.js';
import { escapeHtml, formatCurrency } from './utils.js';

export function splitBill() {
  const results = document.getElementById('results');
  const grandTotal = document.getElementById('grandTotal');
  const taxAmount = document.getElementById('taxAmount');
  
  if (state.people.length === 0 || state.products.length === 0) {
    results.innerHTML = '<li class="muted">Add people and products first.</li>';
    if (grandTotal) grandTotal.textContent = '';
    if (taxAmount) taxAmount.textContent = '';
    return;
  }
  
  const taxPercentInput = document.getElementById('taxPercentInput');
  const taxPercent = document.getElementById('taxPercent');
  const taxIncluded = document.getElementById('taxIncluded');
  
  const taxInput = taxPercentInput ? Number(taxPercentInput.value) : 0;
  const taxPct = (isFinite(taxInput) && taxInput >= 0) ? taxInput : 8;
  const tipInput = taxPercent ? Number(taxPercent.value) : 0;
  const tipRate = (isFinite(tipInput) && tipInput >= 0) ? tipInput : 0;
  const taxIsIncluded = taxIncluded ? taxIncluded.checked : true;
  
  const totals = new Map(state.people.map(p => [p.id, 0]));
  let subtotal = 0;
  let grand = 0;
  let tipTotal = 0;
  let taxTotal = 0;
  
  // Calculate subtotal for assigned products
  for (const prod of state.products) {
    const consumers = [...prod.consumers];
    if (consumers.length === 0) continue;
    const qty = prod.quantity || 1;
    subtotal += prod.price * qty;
  }
  
  // Calculate tip and total based on whether tax is included
  let preTaxAmount;
  if (taxIsIncluded) {
    const taxMultiplier = 1 + (taxPct / 100);
    preTaxAmount = subtotal / taxMultiplier;
    taxTotal = subtotal - preTaxAmount;
    tipTotal = preTaxAmount * (tipRate / 100);
    grand = subtotal + tipTotal;
  } else {
    preTaxAmount = subtotal;
    tipTotal = preTaxAmount * (tipRate / 100);
    taxTotal = preTaxAmount * (taxPct / 100);
    grand = preTaxAmount + taxTotal + tipTotal;
  }
  
  // Distribute to consumers proportionally
  for (const prod of state.products) {
    const consumers = [...prod.consumers];
    if (consumers.length === 0) continue;
    const qty = prod.quantity || 1;
    const productAmount = prod.price * qty;
    const productPortion = productAmount / subtotal;
    
    let productTotal;
    if (taxIsIncluded) {
      const productTip = tipTotal * productPortion;
      productTotal = productAmount + productTip;
    } else {
      const productTax = taxTotal * productPortion;
      const productTip = tipTotal * productPortion;
      productTotal = productAmount + productTax + productTip;
    }
    
    const share = productTotal / consumers.length;
    for (const pid of consumers) totals.set(pid, totals.get(pid) + share);
  }
  
  results.innerHTML = state.people
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
    
  if (grandTotal) {
    grandTotal.innerHTML = `<strong>Total (incl. tip):</strong> $${formatCurrency(grand)}`;
  }
  if (taxAmount) {
    taxAmount.innerHTML = `<strong>Tip paid:</strong> $${formatCurrency(tipTotal)}`;
  }
}
