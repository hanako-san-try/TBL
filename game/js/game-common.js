/* ============================================================
   VANTAGE — shared state, rating math, question engine
   Static, dependency-free, localStorage-backed.
   ============================================================ */
const Vantage = (() => {
  const KEY = 'tbl_vantage_v1';

  const defaults = () => ({
    uid: null,
    email: null,
    provider: null,
    avatar: null,
    name: 'Player',
    rating: 1000,
    wins: 0,
    losses: 0,
    draws: 0,
    streak: 0,
    bestStreak: 0,
    gamesPlayed: 0,
    correct: 0,
    total: 0,
    xp: 0,
    level: 1,
    history: [], // last 30
    lastDaily: null,
    arcade: {}, // gameId -> { best, plays, last, at, label }
    createdAt: Date.now()
  });

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      return { ...defaults(), ...raw, history: Array.isArray(raw.history) ? raw.history : [] };
    } catch {
      return defaults();
    }
  }

  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage full / blocked */ }
    return state;
  }

  function reset() {
    const prev = load();
    const state = defaults();
    // Reset is about performance data — identity and display name survive.
    state.uid = prev.uid;
    state.email = prev.email;
    state.provider = prev.provider;
    state.avatar = prev.avatar;
    state.name = prev.name || 'Player';
    return save(state);
  }

  function accuracy(state = load()) {
    return state.total ? Math.round((state.correct / state.total) * 100) : 0;
  }

  function winRate(state = load()) {
    const played = state.wins + state.losses + state.draws;
    return played ? Math.round((state.wins / played) * 100) : 0;
  }

  function addResult({ win, loss, draw, correct = 0, total = 0, oppRating = 1000, mode = 'duel', rated = true }) {
    const state = load();
    state.gamesPlayed += 1;
    state.correct += correct;
    state.total += total;

    if (rated) {
      const K = 24;
      const expected = 1 / (1 + Math.pow(10, (oppRating - state.rating) / 400));
      let score = 0.5;

      if (win) {
        state.wins += 1;
        state.streak += 1;
        state.bestStreak = Math.max(state.bestStreak, state.streak);
        score = 1;
        state.xp += 25;
      } else if (loss) {
        state.losses += 1;
        state.streak = 0;
        score = 0;
        state.xp += 8;
      } else {
        state.draws += 1;
        state.xp += 12;
      }

      state.rating = Math.max(100, Math.round(state.rating + K * (score - expected)));
    } else {
      // Practice protects the rating, but still records reps and XP.
      state.xp += 4 + correct * 2;
    }

    state.level = Math.floor(state.xp / 100) + 1;
    state.history.unshift({
      t: Date.now(),
      win: rated && !!win,
      loss: rated && !!loss,
      draw: rated && !!draw,
      correct,
      total,
      rating: state.rating,
      mode,
      rated: !!rated
    });
    state.history = state.history.slice(0, 30);
    save(state);
    return state;
  }

  function setName(name) {
    const state = load();
    state.name = (name || 'Player').trim().slice(0, 24) || 'Player';
    return save(state);
  }

  function setIdentity({ uid, email, name, avatar, provider }) {
    const state = load();
    state.uid = uid || null;
    state.email = email || null;
    state.provider = provider || null;
    state.avatar = avatar || null;
    if (name) state.name = name.slice(0, 24);
    return save(state);
  }

  function clearIdentity() {
    const state = load();
    state.uid = null;
    state.email = null;
    state.provider = null;
    state.avatar = null;
    return save(state);
  }

  function initials(name = load().name) {
    const clean = (name || 'P').trim();
    if (!clean) return 'P';
    return clean.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  function recordArcade(id, { score = 0, correct = 0, total = 0, duration = 0, label = '', title = '' } = {}) {
    const state = load();
    // Arcade runs are unrated: they never touch duel match counts or accuracy.
    const xp = 6 + Math.min(40, Math.round(score / 10)) + correct * 2;
    state.xp += xp;
    state.level = Math.floor(state.xp / 100) + 1;

    const previous = state.arcade[id] || { best: 0, plays: 0 };
    const best = Math.max(previous.best || 0, score);
    state.arcade[id] = {
      best,
      plays: (previous.plays || 0) + 1,
      last: score,
      at: Date.now(),
      label
    };

    state.history.unshift({
      t: Date.now(),
      win: false,
      loss: false,
      draw: false,
      rated: false,
      correct,
      total,
      rating: state.rating,
      mode: 'arcade',
      game: id,
      gameTitle: title,
      score,
      duration
    });
    state.history = state.history.slice(0, 30);
    save(state);
    return { state, xp, best, isBest: score > (previous.best || 0), previousBest: previous.best || 0 };
  }

  function arcadeBest(id) {
    return load().arcade?.[id]?.best || 0;
  }

  function arcadePlays(id) {
    return load().arcade?.[id]?.plays || 0;
  }

  function arcadeTotalPlays() {
    return Object.values(load().arcade || {}).reduce((sum, entry) => sum + (entry.plays || 0), 0);
  }

  function dailyKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function markDaily() {
    const state = load();
    state.lastDaily = dailyKey();
    return save(state);
  }

  function dailyDone() {
    return load().lastDaily === dailyKey();
  }

  /* ---------- deterministic randomness (multiplayer) ---------- */
  function hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < String(str).length; i++) {
      h ^= String(str).charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Generate a question.
   * @param {number} level 1 easy → 3 hard
   * @param {number|string} [seed] deterministic seed for shared multiplayer sets
   */
  function genQuestion(level = 1, seed) {
    const rng = seed === undefined ? Math.random : mulberry32(hashString(String(seed)));
    const r = (a, b) => Math.floor(rng() * (b - a + 1)) + a;
    let a, b, ans, text;

    const type = r(0, level >= 3 ? 4 : level >= 2 ? 3 : 2);
    if (type === 0) {
      a = r(2, 20 + level * 10);
      b = r(2, 20 + level * 10);
      ans = a + b;
      text = `${a} + ${b}`;
    } else if (type === 1) {
      a = r(10, 30 + level * 10);
      b = r(2, a);
      ans = a - b;
      text = `${a} − ${b}`;
    } else if (type === 2) {
      a = r(2, 6 + level * 3);
      b = r(2, 8 + level * 2);
      ans = a * b;
      text = `${a} × ${b}`;
    } else if (type === 3) {
      b = r(2, 9 + level);
      ans = r(2, 9 + level);
      a = b * ans;
      text = `${a} ÷ ${b}`;
    } else {
      a = r(2, 12);
      b = r(2, 12);
      const c = r(2, 15);
      ans = a * b + c;
      text = `${a} × ${b} + ${c}`;
    }

    const set = new Set([ans]);
    while (set.size < 4) {
      const delta = r(1, Math.max(3, Math.floor(Math.abs(ans) * 0.2) + 2)) * (rng() > 0.5 ? 1 : -1);
      const value = ans + delta;
      if (value >= 0) set.add(value);
    }

    const choices = [...set];
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }

    return { text, ans, choices };
  }

  return {
    load,
    save,
    reset,
    accuracy,
    winRate,
    addResult,
    setName,
    setIdentity,
    clearIdentity,
    initials,
    genQuestion,
    recordArcade,
    arcadeBest,
    arcadePlays,
    arcadeTotalPlays,
    dailyDone,
    markDaily,
    dailyKey,
    hashString
  };
})();

if (typeof window !== 'undefined') window.Vantage = Vantage;
