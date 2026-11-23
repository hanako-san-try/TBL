/* TBL shared behavior */
(() => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Drawer
  const toggle = document.querySelector('[data-menu-toggle]');
  const drawer = document.getElementById('site-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const closes = document.querySelectorAll('[data-menu-close]');
  let lastFocus = null;

  function setDrawerA11y(open) {
    if (!drawer) return;
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    toggle?.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  setDrawerA11y(false);

  function getFocusable() {
    return drawer ? [...drawer.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')] : [];
  }

  function openMenu() {
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.classList.add('is-open');
    backdrop?.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    setDrawerA11y(true);
    (getFocusable()[0] || drawer).focus();
  }
  function closeMenu() {
    if (!drawer || !drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    backdrop?.classList.remove('is-open');
    document.body.style.overflow = '';
    setDrawerA11y(false);
    lastFocus?.focus?.();
  }
  toggle?.addEventListener('click', () => drawer.classList.contains('is-open') ? closeMenu() : openMenu());
  closes.forEach(b => b.addEventListener('click', closeMenu));
  backdrop?.addEventListener('click', closeMenu);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer?.classList.contains('is-open')) { e.preventDefault(); closeMenu(); }
    if (e.key === 'Tab' && drawer?.classList.contains('is-open')) {
      const f = getFocusable();
      if (!f.length) { e.preventDefault(); return; }
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Reveal on scroll
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length && !prefersReduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('is-visible'));
  }

  // Scroll-to-top
  const topBtn = document.querySelector('[data-scroll-top]');
  if (topBtn) {
    const onScroll = () => topBtn.classList.toggle('is-visible', window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    topBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' }));
  }

  // Current year
  document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
})();
