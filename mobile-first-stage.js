// Only the first four mobile blocks. Restore the original DOM on desktop.
(() => {
  const media = matchMedia('(max-width: 760px)');
  const nav = document.querySelector('.de-nav');

  let button;
  function closeMenu() {
    nav.classList.remove('mobile-open');
    button?.setAttribute('aria-expanded', 'false');
    button?.setAttribute('aria-label', 'Abrir navegación');
  }
  function update() {
    if (media.matches) {
      if (button) return;
      button = document.createElement('button');
      button.className = 'mobile-menu';
      button.type = 'button';
      button.setAttribute('aria-label', 'Abrir navegación');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', 'mobile-navigation');
      button.innerHTML = '<span aria-hidden="true">☰</span>';
      nav.id = 'mobile-navigation';
      nav.before(button);
      button.addEventListener('click', () => {
        const open = nav.classList.toggle('mobile-open');
        button.setAttribute('aria-expanded', String(open));
        button.setAttribute('aria-label', open ? 'Cerrar navegación' : 'Abrir navegación');
      });

    } else {
      closeMenu();
      button?.remove();
      button = null;
      nav.removeAttribute('id');

    }
  }
  nav.addEventListener('click', event => { if (media.matches && event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && button?.getAttribute('aria-expanded') === 'true') {
      closeMenu(); button.focus();
    }
  });
  media.addEventListener('change', update);
  update();
})();
