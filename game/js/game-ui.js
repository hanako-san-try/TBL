/* ============================================================
   VANTAGE UI — auth-aware header, guards, toasts
   ============================================================ */
(() => {
  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  function initials(name) {
    const clean = String(name || 'P').trim();
    if (!clean) return 'P';
    return clean.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'P';
  }

  function authAreaHTML(user) {
    if (!user) {
      return `
        <a class="v-auth-link" href="./login.html">Log in</a>
        <a class="v-btn v-btn-signal v-btn-sm" href="./signup.html">Sign up</a>`;
    }
    const label = user.displayName || user.email || 'Player';
    const demo = user.isDemo ? ' title="Local demo account — add Firebase config to go live"' : '';
    return `
      <div class="v-auth-user">
        <a class="v-auth-avatar" href="./profile.html" aria-label="Open your profile"${demo}>${esc(initials(label))}</a>
        <a class="v-auth-name" href="./profile.html"${demo}>${esc(label)}</a>
        <button class="v-auth-out" type="button" data-auth-out aria-label="Sign out">
          <i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i>
        </button>
      </div>`;
  }

  function renderAuth(user) {
    document.querySelectorAll('[data-auth-area]').forEach((area) => {
      area.innerHTML = authAreaHTML(user);
    });

    document.querySelectorAll('[data-auth-name]').forEach((el) => {
      el.textContent = user ? (user.displayName || user.email || 'Player') : 'Guest';
    });
    document.querySelectorAll('[data-auth-email]').forEach((el) => {
      el.textContent = user ? (user.email || '') : 'Not signed in';
    });
    document.querySelectorAll('[data-auth-avatar]').forEach((el) => {
      el.textContent = user ? initials(user.displayName || user.email) : '?';
    });
    document.querySelectorAll('[data-auth-only]').forEach((el) => {
      el.hidden = !user;
    });
    document.querySelectorAll('[data-guest-only]').forEach((el) => {
      el.hidden = !!user;
    });
    document.querySelectorAll('[data-auth-mode]').forEach((el) => {
      const auth = window.VantageAuth;
      const live = auth && auth.mode === 'firebase';
      el.textContent = live ? 'Firebase connected' : 'Local demo mode';
      el.classList.toggle('is-live', !!live);
    });

    const gate = document.querySelector('[data-auth-gate]');
    if (gate) {
      const auth = window.VantageAuth;
      const demo = auth && auth.mode === 'demo';
      gate.hidden = !!(user || demo);
    }
  }

  function bindSignOut() {
    document.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-auth-out]');
      if (!button) return;
      event.preventDefault();
      if (!window.VantageAuth) return;
      button.disabled = true;
      try {
        await window.VantageAuth.signOut();
        toast('Signed out');
        if (document.body.hasAttribute('data-auth-page') || document.body.hasAttribute('data-protected')) {
          window.location.href = './login.html';
        }
      } catch (error) {
        toast(window.VantageAuth.friendlyError(error));
        button.disabled = false;
      }
    });
  }

  let toastTimer = null;
  function toast(message) {
    let node = document.querySelector('.v-toast');
    if (!node) {
      node = document.createElement('div');
      node.className = 'v-toast';
      node.setAttribute('role', 'status');
      node.setAttribute('aria-live', 'polite');
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('is-on'), 2600);
  }

  async function guard({ next = './profile.html' } = {}) {
    if (!window.VantageAuth) return true;
    await window.VantageAuth.ready();
    if (window.VantageAuth.mode === 'demo') return true;
    if (window.VantageAuth.currentUser) return true;
    window.location.replace('./login.html?next=' + encodeURIComponent(next));
    return false;
  }

  function init() {
    if (window.VantageAuth) {
      window.VantageAuth.onChange(renderAuth);
    } else {
      renderAuth(null);
    }
    bindSignOut();

    const header = document.querySelector('.v-header');
    if (header) {
      const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    document.querySelectorAll('[data-year]').forEach((el) => {
      el.textContent = new Date().getFullYear();
    });
  }

  window.VantageUI = { init, toast, guard, renderAuth, initials };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
