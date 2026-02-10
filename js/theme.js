// Theme management
export function setTheme(theme) {
  const t = theme === 'day' ? 'day' : 'night';
  if (t === 'day') {
    document.documentElement.setAttribute('data-theme', 'day');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  try { localStorage.setItem('splitpay-theme', t); } catch {}
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.textContent = t === 'day' ? '🌙 Night' : '☀️ Day';
    themeToggle.setAttribute('aria-label', t === 'day' ? 'Switch to night theme' : 'Switch to day theme');
  }
}

export function initializeTheme() {
  try {
    const saved = localStorage.getItem('splitpay-theme');
    setTheme(saved === 'day' ? 'day' : 'night');
  } catch {
    setTheme('night');
  }
}
