/* ============================================================
   VANTAGE AUTH — Firebase Auth with a local demo fallback
   ------------------------------------------------------------
   Public API (window.VantageAuth):
     ready()                      → Promise
     onChange(fn)                 → unsubscribe
     currentUser                  → user | null
     mode                         → "firebase" | "demo"
     isConfigured                 → boolean
     signUp({name,email,password})
     signIn({email,password})
     signInWithGoogle()
     signOut()
     sendPasswordReset(email)
     updateDisplayName(name)
     requireAuth({next})
     friendlyError(error)
   ============================================================ */
(() => {
  const FIREBASE_VERSION = '10.12.5';
  const CONFIG = window.VANTAGE_FIREBASE || {};
  const REQUIRED = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const DEMO_USERS = 'tbl_vantage_demo_users_v1';
  const DEMO_SESSION = 'tbl_vantage_demo_session_v1';

  const isPlaceholder = (value) =>
    typeof value !== 'string' ||
    !value.trim() ||
    /YOUR_|PASTE_|REPLACE_|^0{6,}$/.test(value);

  const isConfigured = REQUIRED.every((key) => !isPlaceholder(CONFIG[key]));

  let mode = isConfigured ? 'firebase' : 'demo';
  let currentUser = null;
  let firebaseAuth = null;
  let firebaseApi = null;
  let initPromise = null;
  let initError = null;
  const listeners = new Set();

  /* ---------- helpers ---------- */
  const normaliseEmail = (email) => String(email || '').trim().toLowerCase();
  const nameFromEmail = (email) => {
    const local = normaliseEmail(email).split('@')[0] || 'Player';
    return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 24);
  };

  async function hashPassword(password) {
    const text = `vantage::${password}`;
    try {
      if (window.crypto?.subtle) {
        const bytes = new TextEncoder().encode(text);
        const digest = await window.crypto.subtle.digest('SHA-256', bytes);
        return 'sha256:' + [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) { /* fall through */ }
    // Non-cryptographic fallback for older/insecure contexts. Demo only.
    let h = 2166136261 >>> 0;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return 'fnv:' + (h >>> 0).toString(16);
  }

  function readDemoUsers() {
    try { return JSON.parse(localStorage.getItem(DEMO_USERS) || '{}') || {}; }
    catch { return {}; }
  }

  function writeDemoUsers(users) {
    localStorage.setItem(DEMO_USERS, JSON.stringify(users));
  }

  function readDemoSession() {
    try { return localStorage.getItem(DEMO_SESSION) || null; }
    catch { return null; }
  }

  function writeDemoSession(email) {
    try {
      if (email) localStorage.setItem(DEMO_SESSION, email);
      else localStorage.removeItem(DEMO_SESSION);
    } catch (e) { /* ignore */ }
  }

  function demoUserFromRecord(record) {
    return {
      uid: record.uid,
      email: record.email,
      displayName: record.name || nameFromEmail(record.email),
      photoURL: null,
      provider: 'demo',
      isDemo: true
    };
  }

  function syncVantageIdentity(user) {
    if (typeof window.Vantage === 'undefined') return;
    if (user) {
      window.Vantage.setIdentity({
        uid: user.uid,
        email: user.email,
        name: user.displayName || nameFromEmail(user.email),
        avatar: user.photoURL || null,
        provider: user.provider
      });
    } else {
      window.Vantage.clearIdentity();
    }
  }

  function emit() {
    listeners.forEach((fn) => {
      try { fn(currentUser); } catch (e) { console.warn('Auth listener failed', e); }
    });
  }

  function setUser(user) {
    currentUser = user;
    syncVantageIdentity(user);
    emit();
    return user;
  }

  function restoreDemoSession() {
    const email = readDemoSession();
    if (!email) return null;
    const users = readDemoUsers();
    const record = users[normaliseEmail(email)];
    if (!record) { writeDemoSession(null); return null; }
    return demoUserFromRecord(record);
  }

  /* ---------- Firebase bootstrap ---------- */
  function init() {
    if (initPromise) return initPromise;

    initPromise = (async () => {
      if (!isConfigured) {
        mode = 'demo';
        setUser(restoreDemoSession());
        return currentUser;
      }

      try {
        const [appMod, authMod] = await Promise.all([
          import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
          import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`)
        ]);

        firebaseApi = authMod;
        const app = appMod.getApps().length ? appMod.getApps()[0] : appMod.initializeApp(CONFIG);
        firebaseAuth = authMod.getAuth(app);

        try {
          await authMod.setPersistence(firebaseAuth, authMod.browserLocalPersistence);
        } catch (e) { /* Safari private mode etc. */ }

        let resolveFirstState;
        const firstState = new Promise((resolve) => { resolveFirstState = resolve; });

        authMod.onAuthStateChanged(firebaseAuth, (user) => {
          if (!user) {
            setUser(null);
          } else {
            const provider = user.providerData?.[0]?.providerId || 'password';
            setUser({
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || nameFromEmail(user.email || ''),
              photoURL: user.photoURL || null,
              provider,
              isDemo: false
            });
          }
          resolveFirstState();
        });

        // Do not resolve ready() until Firebase has told us who is signed in.
        await firstState;
        mode = 'firebase';
        return currentUser;
      } catch (error) {
        console.error('[VantageAuth] Firebase failed to load, using local demo mode.', error);
        initError = error;
        mode = 'demo';
        setUser(restoreDemoSession());
        return currentUser;
      }
    })();

    return initPromise;
  }

  /* ---------- public auth actions ---------- */
  async function signUp({ name, email, password }) {
    await init();
    const cleanEmail = normaliseEmail(email);
    const cleanName = String(name || '').trim().slice(0, 24);

    if (!cleanName) throw new Error('Add a display name — it is what opponents see.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) throw new Error('Enter a valid email address.');
    if (String(password || '').length < 8) throw new Error('Use at least 8 characters for your password.');

    if (mode === 'firebase' && firebaseAuth) {
      const credential = await firebaseApi.createUserWithEmailAndPassword(firebaseAuth, cleanEmail, password);
      if (cleanName && credential.user) {
        await firebaseApi.updateProfile(credential.user, { displayName: cleanName });
      }
      const user = credential.user;
      return setUser({
        uid: user.uid,
        email: user.email || cleanEmail,
        displayName: cleanName || user.displayName || nameFromEmail(cleanEmail),
        photoURL: user.photoURL || null,
        provider: 'password',
        isDemo: false
      });
    }

    // Demo mode
    const users = readDemoUsers();
    if (users[cleanEmail]) throw new Error('An account with this email already exists on this device. Try logging in.');

    const record = {
      uid: 'demo_' + Math.random().toString(36).slice(2, 10),
      email: cleanEmail,
      name: cleanName,
      hash: await hashPassword(password),
      createdAt: Date.now()
    };
    users[cleanEmail] = record;
    writeDemoUsers(users);
    writeDemoSession(cleanEmail);
    return setUser(demoUserFromRecord(record));
  }

  async function signIn({ email, password }) {
    await init();
    const cleanEmail = normaliseEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) throw new Error('Enter a valid email address.');
    if (!password) throw new Error('Enter your password.');

    if (mode === 'firebase' && firebaseAuth) {
      const credential = await firebaseApi.signInWithEmailAndPassword(firebaseAuth, cleanEmail, password);
      const user = credential.user;
      return setUser({
        uid: user.uid,
        email: user.email || cleanEmail,
        displayName: user.displayName || nameFromEmail(cleanEmail),
        photoURL: user.photoURL || null,
        provider: 'password',
        isDemo: false
      });
    }

    // Demo mode
    const users = readDemoUsers();
    const record = users[cleanEmail];
    if (!record) throw new Error('No account found for that email on this device. Create one first.');
    const hash = await hashPassword(password);
    if (hash !== record.hash) throw new Error('That password does not match. Try again.');

    writeDemoSession(cleanEmail);
    return setUser(demoUserFromRecord(record));
  }

  async function signInWithGoogle() {
    await init();
    if (mode !== 'firebase' || !firebaseAuth) {
      throw new Error('Google sign-in needs Firebase configuration. Add your web config in js/firebase-config.js, or use email below.');
    }
    const provider = new firebaseApi.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const credential = await firebaseApi.signInWithPopup(firebaseAuth, provider);
    const user = credential.user;
    return setUser({
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || nameFromEmail(user.email || ''),
      photoURL: user.photoURL || null,
      provider: 'google.com',
      isDemo: false
    });
  }

  async function signOut() {
    await init();
    if (mode === 'firebase' && firebaseAuth) {
      await firebaseApi.signOut(firebaseAuth);
    }
    writeDemoSession(null);
    setUser(null);
    return true;
  }

  async function sendPasswordReset(email) {
    await init();
    const cleanEmail = normaliseEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) throw new Error('Enter a valid email address first.');

    if (mode === 'firebase' && firebaseAuth) {
      await firebaseApi.sendPasswordResetEmail(firebaseAuth, cleanEmail);
      return 'Reset link sent. Check your inbox (and spam).';
    }

    const users = readDemoUsers();
    if (!users[cleanEmail]) throw new Error('No account found for that email on this device.');
    return 'Demo mode: reset links need Firebase. This account lives only in this browser.';
  }

  async function updateDisplayName(name) {
    await init();
    const cleanName = String(name || '').trim().slice(0, 24);
    if (!cleanName) throw new Error('Display name cannot be empty.');

    if (mode === 'firebase' && firebaseAuth?.currentUser) {
      await firebaseApi.updateProfile(firebaseAuth.currentUser, { displayName: cleanName });
    }

    if (mode === 'demo' && currentUser) {
      const users = readDemoUsers();
      const record = users[normaliseEmail(currentUser.email)];
      if (record) {
        record.name = cleanName;
        writeDemoUsers(users);
      }
    }

    if (currentUser) {
      currentUser = { ...currentUser, displayName: cleanName };
      syncVantageIdentity(currentUser);
      emit();
    }
    if (typeof window.Vantage !== 'undefined') window.Vantage.setName(cleanName);
    return currentUser;
  }

  function requireAuth({ next = './profile.html' } = {}) {
    if (mode === 'demo') return true;
    if (currentUser) return true;
    const target = `./login.html?next=${encodeURIComponent(next)}`;
    window.location.replace(target);
    return false;
  }

  function friendlyError(error) {
    const code = String(error?.code || '').replace('auth/', '');
    const map = {
      'email-already-in-use': 'That email already has an account. Log in instead.',
      'invalid-email': 'That email address does not look right.',
      'weak-password': 'Choose a stronger password — at least 8 characters.',
      'user-not-found': 'No account found for that email. Create one first.',
      'wrong-password': 'That password does not match. Try again.',
      'invalid-credential': 'Email or password is incorrect. Try again.',
      'too-many-requests': 'Too many attempts. Wait a minute, then try again.',
      'popup-closed-by-user': 'Google sign-in was closed before it finished.',
      'popup-blocked': 'Your browser blocked the Google popup. Allow popups and retry.',
      'operation-not-allowed': 'This sign-in method is disabled in your Firebase project.',
      'network-request-failed': 'Network problem. Check your connection and retry.',
      'unauthorized-domain': 'This domain is not authorized in Firebase Authentication settings.'
    };
    return map[code] || error?.message || 'Something went wrong. Try again.';
  }

  function onChange(fn) {
    listeners.add(fn);
    init().then(() => {
      if (listeners.has(fn)) {
        try { fn(currentUser); } catch (e) { console.warn(e); }
      }
    });
    return () => listeners.delete(fn);
  }

  function ready() {
    return init();
  }

  window.VantageAuth = {
    ready,
    onChange,
    get currentUser() { return currentUser; },
    get mode() { return mode; },
    get isConfigured() { return isConfigured; },
    get initError() { return initError; },
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    sendPasswordReset,
    updateDisplayName,
    requireAuth,
    friendlyError,
    nameFromEmail
  };

  // Start restoring the session immediately.
  init();
})();
