// Toggles the mobile navigation menu open and closed, keeping aria-expanded in
// sync for assistive technology. Progressive enhancement: the links work
// without JavaScript; this only controls the collapsed mobile menu.
(function () {
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('mobile-nav');
  if (!toggle || !menu) {
    return;
  }

  toggle.addEventListener('click', () => {
    // The stylesheet keeps the menu closed by default; this class is what opens
    // it, so the toggle's return value is the open state directly.
    const isOpen = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
})();
