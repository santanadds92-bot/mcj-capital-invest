// Shared behavior across all MCJ Capital Invest pages

document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu toggle
  const menuToggle = document.getElementById('menuToggle');
  const nav = document.querySelector('nav.primary');
  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      const isOpen = nav.style.display === 'flex';
      nav.style.display = isOpen ? 'none' : 'flex';
      nav.style.flexDirection = 'column';
      nav.style.position = 'absolute';
      nav.style.top = '88px';
      nav.style.left = '0';
      nav.style.right = '0';
      nav.style.background = '#0b0b0c';
      nav.style.padding = '20px 24px';
      nav.style.borderBottom = '1px solid var(--border)';
    });
  }
});
