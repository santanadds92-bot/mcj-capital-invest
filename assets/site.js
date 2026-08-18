// Shared behavior across all MCJ Capital Invest pages

document.addEventListener('DOMContentLoaded', () => {
  // Drawer de menu mobile (abre da esquerda para a direita)
  const menuToggle = document.getElementById('menuToggle');
  const drawer = document.getElementById('mobileDrawer');
  const overlay = document.getElementById('drawerOverlay');
  const drawerClose = document.getElementById('drawerClose');

  function openDrawer() {
    drawer.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (menuToggle && drawer && overlay) {
    menuToggle.addEventListener('click', openDrawer);
    drawerClose?.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);
    drawer.querySelectorAll('a').forEach(link => link.addEventListener('click', closeDrawer));
  }

  initCookieBanner();
});

// ---------- Aviso de cookies (LGPD) ----------
// Banner discreto, mostrado uma vez por navegador até o visitante confirmar
// ciência. Não usamos nenhum cookie/rastreamento de terceiros — o site só
// grava preferência de tema e essa própria confirmação no localStorage —
// mas o aviso é exigido de qualquer forma como boa prática de transparência.
const COOKIE_CONSENT_KEY = 'mcj_cookie_consent';

function initCookieBanner() {
  try {
    if (localStorage.getItem(COOKIE_CONSENT_KEY) === '1') return;
  } catch {
    return; // localStorage indisponível — não força o banner nesse caso
  }

  const banner = document.createElement('div');
  banner.className = 'cookie-banner';
  banner.id = 'cookieBanner';
  banner.innerHTML = `
    <p>Usamos apenas armazenamento local do seu navegador para lembrar preferências (como o tema claro/escuro) — nenhum cookie de rastreamento de terceiros. Saiba mais na <a href="politica-de-privacidade.html">Política de Privacidade</a>.</p>
    <button type="button" id="cookieBannerAccept">Entendi</button>
  `;
  document.body.appendChild(banner);

  document.getElementById('cookieBannerAccept').addEventListener('click', () => {
    try { localStorage.setItem(COOKIE_CONSENT_KEY, '1'); } catch {}
    banner.classList.add('hide');
    setTimeout(() => banner.remove(), 300);
  });
}
