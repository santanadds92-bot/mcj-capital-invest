// Comportamento compartilhado em todas as páginas da QRV Artigos Táticos

document.addEventListener('DOMContentLoaded', () => {
  // Busca do header (ícone de lupa abre um campo expansível)
  const searchToggle = document.getElementById('headerSearchToggle');
  const searchBox = document.getElementById('headerSearchBox');
  if (searchToggle && searchBox) {
    searchToggle.addEventListener('click', () => {
      searchBox.classList.toggle('open');
      if (searchBox.classList.contains('open')) searchBox.querySelector('input')?.focus();
    });
    document.addEventListener('click', (e) => {
      if (!searchBox.contains(e.target) && !searchToggle.contains(e.target)) {
        searchBox.classList.remove('open');
      }
    });
  }

  // Formulário de newsletter (sem backend de e-mail ainda — só confirma o cadastro)
  document.querySelectorAll('#newsletterForm').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      const btn = form.querySelector('button');
      if (!input.value.trim()) return;
      const original = btn.textContent;
      btn.textContent = 'Inscrito ✓';
      input.value = '';
      setTimeout(() => { btn.textContent = original; }, 2500);
    });
  });

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
});
