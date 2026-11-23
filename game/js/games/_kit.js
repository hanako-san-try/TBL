/* Shared primitives for Vantage arcade games. */

export const el = (tag, className = '', html = '') => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html) node.innerHTML = html;
  return node;
};

export const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

export const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
export const pick = (list) => list[Math.floor(Math.random() * list.length)];
export const shuffle = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function setFeedback(node, text, tone = '') {
  if (!node) return;
  node.textContent = text;
  node.className = 'g-feedback' + (tone ? ' is-' + tone : '');
}

export function finishOnce(ctx) {
  let done = false;
  return (result) => {
    if (done) return;
    done = true;
    ctx.finish(result);
  };
}

export function createTimer(seconds, { onTick, onEnd } = {}) {
  const end = Date.now() + seconds * 1000;
  let stopped = false;
  const tick = () => {
    if (stopped) return;
    const remaining = Math.max(0, (end - Date.now()) / 1000);
    onTick?.(remaining);
    if (remaining <= 0) {
      stopped = true;
      clearInterval(id);
      onEnd?.();
    }
  };
  const id = setInterval(tick, 200);
  tick();
  return {
    stop() { stopped = true; clearInterval(id); },
    get remaining() { return Math.max(0, (end - Date.now()) / 1000); }
  };
}

export function formatSeconds(value) {
  const seconds = Math.max(0, Math.ceil(value));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function makeChoices(root, choices, onPick, { keyed = true } = {}) {
  root.innerHTML = '';
  choices.forEach((choice, index) => {
    const button = el('button', 'g-choice');
    button.type = 'button';
    button.innerHTML = `${keyed ? `<span class="g-key">${index + 1}</span>` : ''}<span>${esc(choice)}</span>`;
    button.addEventListener('click', () => onPick(choice, button, index));
    root.appendChild(button);
  });
  return [...root.children];
}

export function lockChoices(nodes) {
  nodes.forEach((node) => { node.disabled = true; });
}

export function isPrime(value) {
  if (!Number.isInteger(value) || value < 2) return false;
  if (value % 2 === 0) return value === 2;
  for (let i = 3; i * i <= value; i += 2) {
    if (value % i === 0) return false;
  }
  return true;
}

export const gcd = (a, b) => {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a || 1;
};

/* Exact fractions for the 24 game. */
export const frac = (n, d = 1) => {
  if (d === 0) return null;
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
};

export const fracAdd = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
export const fracSub = (a, b) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
export const fracMul = (a, b) => frac(a.n * b.n, a.d * b.d);
export const fracDiv = (a, b) => (b.n === 0 ? null : frac(a.n * b.d, a.d * b.n));
export const fracEq = (a, b) => a && b && a.n === b.n && a.d === b.d;
export const fracValue = (a) => a.n / a.d;
export const fracLabel = (a) => (a.d === 1 ? String(a.n) : `${a.n}/${a.d}`);

export function solve24(numbers) {
  const values = numbers.map((n) => frac(n, 1));
  const search = (list) => {
    if (list.length === 1) return fracEq(list[0], frac(24, 1));
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const rest = list.filter((_, index) => index !== i && index !== j);
        const a = list[i], b = list[j];
        const candidates = [fracAdd(a, b), fracSub(a, b), fracSub(b, a), fracMul(a, b), fracDiv(a, b), fracDiv(b, a)].filter(Boolean);
        for (const candidate of candidates) {
          if (search([...rest, candidate])) return true;
        }
      }
    }
    return false;
  };
  return search(values);
}

export function make24Set() {
  for (let attempt = 0; attempt < 200; attempt++) {
    const numbers = [rand(1, 9), rand(1, 9), rand(1, 9), rand(1, 9)];
    if (solve24(numbers)) return numbers;
  }
  return [4, 6, 2, 3];
}

export function requireKaplay(ctx) {
  return ctx.loadKaplay ? ctx.loadKaplay() : Promise.reject(new Error('Kaplay unavailable'));
}

export function makeStatus(ctx) {
  return (text, tone = '') => {
    ctx.setStatus(text, tone);
  };
}
