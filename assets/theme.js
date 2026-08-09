// Alternância de tema (Light / Dark) — MCJ Capital Invest
// Salva a preferência em localStorage e aplica via classe "light-mode" no <body>.

const THEME_KEY = 'mcj_theme';

function getSavedTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}

function applyTheme(theme) {
  document.body.classList.toggle('light-mode', theme === 'light');
  document.querySelectorAll('.theme-toggle .theme-icon').forEach(el => {
    el.textContent = theme === 'light' ? '🌙' : '☀️';
  });
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    const label = theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro';
    btn.setAttribute('aria-label', label);
    btn.title = label;
  });
}

function toggleTheme() {
  const current = document.body.classList.contains('light-mode') ? 'light' : 'dark';
  const next = current === 'light' ? 'dark' : 'light';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(getSavedTheme());
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', toggleTheme);
  });
});
