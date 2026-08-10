// Alternador de Tema Claro / Escuro — QRV Artigos Táticos
// Obs: para evitar "flash" do tema errado, cada página já aplica o tema salvo
// via um pequeno script inline no <head> (antes do CSS carregar). Este arquivo
// cuida apenas da interação do botão e de manter tudo sincronizado.

const THEME_KEY = 'qrv_theme';

function getSavedTheme() {
  return localStorage.getItem(THEME_KEY) || 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelectorAll('.theme-toggle .theme-icon').forEach(el => {
    el.textContent = theme === 'light' ? '☀️' : '🌙';
  });
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.setAttribute('aria-label', theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro');
    btn.title = theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro';
  });
}

function toggleTheme() {
  const atual = getSavedTheme();
  const novo = atual === 'light' ? 'dark' : 'light';
  localStorage.setItem(THEME_KEY, novo);
  applyTheme(novo);
}

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(getSavedTheme());
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', toggleTheme);
  });
});
