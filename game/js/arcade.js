/* ============================================================
   VANTAGE ARCADE — catalog, stage lifecycle, scoring bridge
   ============================================================ */
import { CATEGORIES, GAMES, GAME_BY_ID, DAILY_WORKOUT } from './game-catalog.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const categoryLabel = (id) => CATEGORIES.find((category) => category.id === id)?.label || id;

const WORKOUT_KEY = 'tbl_vantage_workout_v1';
const scoreLabel = (value) => Number(value || 0).toLocaleString('en-US');

const cardsRoot = $('#arcade-grid');
const filtersRoot = $('#arcade-filters');
const searchInput = $('#arcade-search');
const sideRoot = $('#arcade-side');
const workoutRoot = $('#arcade-workout');
const stage = $('#arcade-stage');
const stageTitle = $('#arcade-stage-title');
const stageKicker = $('#arcade-stage-kicker');
const stageScore = $('#arcade-stage-score');
const stageStatus = $('#arcade-stage-status');
const stageMount = $('#arcade-mount');
const stageProgress = $('#arcade-progress');
const stageBest = $('#arcade-stage-best');
const resultOverlay = $('#arcade-result');
const resultKicker = $('#result-kicker');
const resultHeadline = $('#result-headline');
const resultDetail = $('#result-detail');
const resultScore = $('#result-score');
const resultBest = $('#result-best');
const resultXp = $('#result-xp');
const resultNew = $('#result-new');

let filter = 'all';
let session = null;
let openToken = 0;
let lastFocus = null;
let kaplayPromise = null;

/* ---------- Kaplay loader (shared, cached) ---------- */
async function loadKaplay() {
  if (window.kaplay) return window.kaplay;
  if (!kaplayPromise) {
    kaplayPromise = import('https://unpkg.com/kaplay@3001/dist/kaplay.mjs')
      .then((mod) => mod.default || mod.kaplay || mod)
      .catch((error) => {
        kaplayPromise = null;
        throw error;
      });
  }
  return kaplayPromise;
}

/* ---------- Workout tracking ---------- */
function loadWorkout() {
  try {
    const raw = JSON.parse(localStorage.getItem(WORKOUT_KEY) || '{}');
    if (raw && raw.date === Vantage.dailyKey() && Array.isArray(raw.done)) return raw.done;
  } catch (error) { /* ignore corrupt state */ }
  return [];
}

function markWorkout(id) {
  if (!DAILY_WORKOUT.includes(id)) return;
  const done = new Set(loadWorkout());
  done.add(id);
  try {
    localStorage.setItem(WORKOUT_KEY, JSON.stringify({ date: Vantage.dailyKey(), done: [...done] }));
  } catch (error) { /* storage blocked */ }
}

function workoutDone() {
  const done = new Set(loadWorkout());
  return DAILY_WORKOUT.filter((id) => done.has(id));
}

/* ---------- Catalog ---------- */
function cardMarkup(game) {
  const best = Vantage.arcadeBest(game.id);
  const plays = Vantage.arcadePlays(game.id);
  return `
    <a class="game-card" href="?game=${game.id}" data-game="${game.id}" style="--card-accent:${game.accent}">
      <span class="game-card-top">
        <span class="game-card-icon"><i class="fa-solid ${game.icon}" aria-hidden="true"></i></span>
        <span class="game-card-meta">${categoryLabel(game.category)}</span>
      </span>
      <h3>${game.title}</h3>
      <p>${game.description}</p>
      <span class="game-card-foot">
        <span class="game-card-meta">${game.duration} · ${game.difficulty}</span>
        <span class="game-card-best">${plays ? `Best ${scoreLabel(best)}` : 'Unplayed'}</span>
      </span>
    </a>`;
}

function renderFilters() {
  filtersRoot.innerHTML = CATEGORIES.map((category) => {
    const count = category.id === 'all' ? GAMES.length : GAMES.filter((game) => game.category === category.id).length;
    return `<button class="arcade-filter${filter === category.id ? ' is-active' : ''}" type="button" data-filter="${category.id}">
      ${category.label}<span style="opacity:.55;margin-left:6px">${count}</span>
    </button>`;
  }).join('');
}

function renderCards() {
  const query = (searchInput.value || '').trim().toLowerCase();
  const matches = GAMES.filter((game) => {
    if (filter !== 'all' && game.category !== filter) return false;
    if (!query) return true;
    return [game.title, game.tagline, game.description, game.category, ...(game.skills || [])]
      .join(' ').toLowerCase().includes(query);
  });
  cardsRoot.innerHTML = matches.length
    ? matches.map(cardMarkup).join('')
    : `<div class="arcade-empty">No game matches that filter. Try “math”, “memory” or clear the search.</div>`;
}

function renderSide() {
  const state = Vantage.load();
  const tried = Object.keys(state.arcade || {}).length;
  const plays = Vantage.arcadeTotalPlays();
  sideRoot.innerHTML = `
    <div class="v-card-head"><span>Session log</span><span class="v-chip">Local</span></div>
    <div class="v-card-body">
      <div class="arcade-side-stats">
        <div class="v-row"><span class="v-row-label">Arcade runs</span><span class="v-row-value">${plays}</span></div>
        <div class="v-row"><span class="v-row-label">Games tried</span><span class="v-row-value">${tried} / ${GAMES.length}</span></div>
        <div class="v-row"><span class="v-row-label">Level</span><span class="v-row-value is-signal">${state.level}</span></div>
        <div class="v-row"><span class="v-row-label">Rating</span><span class="v-row-value">${state.rating}</span></div>
      </div>
      <div class="arcade-side-note">
        <p><strong>Arcade runs are unrated.</strong> They add XP, reps and personal bests without touching your duel ELO.</p>
        <p>Every result is stored on this device. Sign in to keep a name attached to it.</p>
      </div>
      <div class="arcade-workout-actions">
        <a class="v-btn v-btn-sm" href="./leaderboard.html">Standings</a>
        <a class="v-btn v-btn-sm" href="./profile.html">Profile</a>
      </div>
    </div>`;
}

function renderWorkout() {
  const done = new Set(workoutDone());
  const count = done.size;
  const items = DAILY_WORKOUT.map((id) => {
    const game = GAME_BY_ID[id];
    const complete = done.has(id);
    return `
      <button class="arcade-workout-item${complete ? ' is-done' : ''}" type="button" data-game="${id}">
        <i class="fa-solid ${complete ? 'fa-circle-check' : 'fa-circle'}" aria-hidden="true"></i>
        <span>${game.title}</span>
        <small>${complete ? 'Done' : game.duration}</small>
      </button>`;
  }).join('');

  workoutRoot.innerHTML = `
    <div class="arcade-workout-main">
      <div class="arcade-workout-head">
        <p class="v-kicker">Daily workout</p>
        <span class="arcade-workout-progress">${count} / ${DAILY_WORKOUT.length}</span>
      </div>
      <h2>Three disciplines. One session.</h2>
      <p>Speed, memory and spatial reasoning. Clear all three before the day resets.</p>
      <div class="arcade-workout-list">${items}</div>
    </div>
    <div class="arcade-workout-actions">
      <button class="v-btn v-btn-signal" type="button" data-workout-start>
        ${count >= DAILY_WORKOUT.length ? 'Repeat workout' : count ? 'Continue workout' : 'Start workout'}
      </button>
    </div>`;
}

function refreshAll() {
  renderCards();
  renderSide();
  renderWorkout();
  $$('[data-arcade-stat="plays"]').forEach((el) => { el.textContent = Vantage.arcadeTotalPlays(); });
  $$('[data-arcade-stat="tried"]').forEach((el) => { el.textContent = Object.keys(Vantage.load().arcade || {}).length; });
  $$('[data-arcade-stat="level"]').forEach((el) => { el.textContent = Vantage.load().level; });
}

/* ---------- Stage ---------- */
function updateUrl(id) {
  try {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('game', id);
    else url.searchParams.delete('game');
    window.history.replaceState({}, '', url);
  } catch (error) { /* file:// */ }
}

function cleanupSession(s) {
  s.closed = true;
  [...s.cleanups].reverse().forEach((fn) => {
    try { fn(); } catch (error) { console.warn('Arcade cleanup failed.', error); }
  });
  s.cleanups.length = 0;
}

function closeGame({ silent = false } = {}) {
  if (!session) return;
  const s = session;
  const closedId = s.game.id;
  session = null;
  openToken += 1;
  cleanupSession(s);
  stageMount.innerHTML = '';
  resultOverlay.hidden = true;
  stage.hidden = true;
  document.body.style.overflow = '';
  updateUrl(null);
  refreshAll();
  if (!silent) {
    const fallback = cardsRoot.querySelector(`[data-game="${closedId}"]`);
    const target = lastFocus && lastFocus.isConnected ? lastFocus : fallback;
    if (target && typeof target.focus === 'function') {
      try { target.focus({ preventScroll: true }); } catch (error) { /* element gone */ }
    }
  }
}

function buildContext(s) {
  return {
    setScore(value) {
      if (s.closed) return;
      s.score = Math.max(0, Number(value) || 0);
      stageScore.textContent = scoreLabel(s.score);
    },
    setStatus(text, tone = '') {
      if (s.closed) return;
      stageStatus.textContent = text || '';
      stageStatus.className = 'arcade-stage-status' + (tone ? ' is-' + tone : '');
    },
    setProgress(value) {
      if (s.closed) return;
      const pct = Math.max(0, Math.min(1, Number(value) || 0)) * 100;
      stageProgress.style.width = pct + '%';
    },
    finish(result = {}) {
      if (s.closed || s.finished) return;
      s.finished = true;
      handleFinish(s, result);
    },
    onCleanup(fn) {
      if (typeof fn !== 'function') return;
      if (s.closed) { try { fn(); } catch (error) { /* ignore */ } return; }
      s.cleanups.push(fn);
    },
    loadKaplay
  };
}

function handleFinish(s, result) {
  const duration = Math.round((Date.now() - s.startedAt) / 1000);
  const score = Math.max(0, Math.round(Number(result.score) || 0));
  const correct = Math.max(0, Number(result.correct) || 0);
  const total = Math.max(0, Number(result.total) || 0);
  const record = Vantage.recordArcade(s.game.id, {
    score,
    correct,
    total,
    duration,
    label: result.label || 'points',
    title: s.game.title
  });

  markWorkout(s.game.id);

  resultKicker.textContent = `${s.game.title} · Level ${record.state.level}`;
  resultHeadline.textContent = result.headline || 'Run logged.';
  resultDetail.textContent = result.detail || 'Personal bests update automatically.';
  resultScore.textContent = scoreLabel(score);
  resultBest.textContent = scoreLabel(record.best);
  resultXp.textContent = `+${record.xp} XP`;
  const resultCorrect = $('#result-correct');
  if (resultCorrect) resultCorrect.textContent = total ? `${correct}/${total}` : '—';
  resultNew.hidden = !record.isBest;
  resultNew.textContent = record.isBest ? 'New personal best' : '';
  resultOverlay.hidden = false;
  resultHeadline.tabIndex = -1;
  try { resultHeadline.focus({ preventScroll: true }); } catch (error) { /* older browsers */ }

  stageStatus.textContent = record.isBest ? 'New best' : 'Complete';
  stageStatus.className = 'arcade-stage-status is-good';
  stageBest.textContent = `Best ${scoreLabel(record.best)}`;
  stageProgress.style.width = '100%';
  refreshAll();
}

async function openGame(id) {
  const game = GAME_BY_ID[id];
  if (!game) return;

  if (session) closeGame({ silent: true });
  lastFocus = document.activeElement;
  const s = {
    game,
    score: 0,
    cleanups: [],
    closed: false,
    finished: false,
    startedAt: Date.now(),
    token: ++openToken
  };
  session = s;
  const api = buildContext(s);

  stage.hidden = false;
  document.body.style.overflow = 'hidden';
  resultOverlay.hidden = true;
  stageKicker.textContent = `${categoryLabel(game.category)} · ${game.duration} · ${game.difficulty}`;
  stageTitle.textContent = game.title;
  stageScore.textContent = '0';
  stageStatus.textContent = 'Loading';
  stageStatus.className = 'arcade-stage-status';
  stageProgress.style.width = '0%';
  stageBest.textContent = `Best ${scoreLabel(Vantage.arcadeBest(game.id))}`;
  stageMount.innerHTML = `
    <div class="g-panel" style="text-align:center">
      <p class="g-kicker">Loading engine</p>
      <p class="g-sub" style="margin-top:10px">Preparing ${game.title}…</p>
    </div>`;
  updateUrl(game.id);

  try {
    const mod = await import(game.module);
    if (s.closed || session !== s) return;
    if (!mod || !mod.default || typeof mod.default.mount !== 'function') {
      throw new Error('Game module has no mount()');
    }
    stageMount.innerHTML = '';
    await mod.default.mount(stageMount, api);
    if (s.closed || session !== s) {
      cleanupSession(s);
      return;
    }
    const back = $('#arcade-close');
    if (back) back.focus();
  } catch (error) {
    console.error('Arcade game failed to load.', error);
    if (s.closed || session !== s) return;
    stageMount.innerHTML = `
      <div class="g-panel" style="text-align:center">
        <p class="g-kicker">Engine offline</p>
        <p class="g-sub" style="margin:12px auto 18px;max-width:34rem">${game.title} could not load its module. Check your connection, then retry. The rest of the arcade is still available.</p>
        <div class="g-actions">
          <button class="v-btn v-btn-signal" type="button" data-retry>Retry</button>
          <button class="v-btn" type="button" data-exit>Back to arcade</button>
        </div>
      </div>`;
    stageStatus.textContent = 'Unavailable';
    stageStatus.className = 'arcade-stage-status is-bad';
    const retry = $('[data-retry]', stageMount);
    const exit = $('[data-exit]', stageMount);
    if (retry) retry.addEventListener('click', () => openGame(game.id));
    if (exit) exit.addEventListener('click', () => closeGame());
  }
}

/* ---------- Events ---------- */
filtersRoot.addEventListener('click', (event) => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  filter = button.dataset.filter;
  renderFilters();
  renderCards();
});

searchInput.addEventListener('input', renderCards);

cardsRoot.addEventListener('click', (event) => {
  const card = event.target.closest('[data-game]');
  if (!card) return;
  event.preventDefault();
  openGame(card.dataset.game);
});

workoutRoot.addEventListener('click', (event) => {
  const start = event.target.closest('[data-workout-start]');
  if (start) {
    const done = new Set(workoutDone());
    const next = DAILY_WORKOUT.find((id) => !done.has(id)) || DAILY_WORKOUT[0];
    openGame(next);
    return;
  }
  const item = event.target.closest('[data-game]');
  if (item) openGame(item.dataset.game);
});

$('#arcade-close').addEventListener('click', () => closeGame());
$('#arcade-restart').addEventListener('click', () => {
  if (session) openGame(session.game.id);
});

$('#result-again').addEventListener('click', () => {
  if (session) openGame(session.game.id);
});
$('#result-close').addEventListener('click', () => closeGame());
$$('[data-arcade-exit]').forEach((button) => {
  button.addEventListener('click', () => closeGame());
});

$('#hero-workout').addEventListener('click', () => {
  const done = new Set(workoutDone());
  openGame(DAILY_WORKOUT.find((id) => !done.has(id)) || DAILY_WORKOUT[0]);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && session) closeGame();
});

stage.addEventListener('click', (event) => {
  if (event.target === stage && session?.finished) closeGame();
});

/* ---------- Boot ---------- */
renderFilters();
refreshAll();

const params = new URLSearchParams(window.location.search);
const initial = params.get('game');
if (initial && GAME_BY_ID[initial]) {
  openGame(initial);
} else if (params.get('workout') === '1') {
  const done = new Set(workoutDone());
  openGame(DAILY_WORKOUT.find((id) => !done.has(id)) || DAILY_WORKOUT[0]);
}
