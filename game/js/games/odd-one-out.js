import { createTimer, finishOnce, formatSeconds, pick, rand } from './_kit.js';

const PAIRS = [
  ['▲', '△'], ['●', '◯'], ['■', '□'], ['◆', '◇'],
  ['★', '☆'], ['▶', '▷'], ['▼', '▽'], ['◼', '◻'],
  ['✦', '✧'], ['⬤', '○'], ['◈', '◇'], ['▰', '▱']
];

export default {
  id: 'odd-one-out',
  mount(root, ctx) {
    const finish = finishOnce(ctx);
    let running = true;
    let found = 0;
    let misses = 0;
    let round = 0;
    let size = 4;
    let variantIndex = 0;

    root.innerHTML = `
      <div class="g-wrap">
        <div class="g-head">
          <span class="g-kicker">Odd One · find the variant</span>
          <span class="g-timer" id="oo-timer">1:00</span>
        </div>
        <div class="g-panel">
          <p class="g-sub" id="oo-sub">One symbol is different. Tap it.</p>
          <div class="g-odd-grid" id="oo-grid"></div>
          <div class="g-feedback" id="oo-feedback">Visual search. Do not rush the scan.</div>
        </div>
      </div>`;

    const grid = root.querySelector('#oo-grid');
    const feedback = root.querySelector('#oo-feedback');
    const timerNode = root.querySelector('#oo-timer');

    function points() {
      return Math.max(0, found * 2 - misses);
    }

    function build() {
      round += 1;
      size = round < 4 ? 4 : round < 9 ? 5 : 6;
      const [common, odd] = pick(PAIRS);
      const count = size * size;
      variantIndex = rand(0, count - 1);
      grid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
      grid.innerHTML = '';
      ctx.setStatus(`Round ${round} · ${size}×${size}`);
      for (let i = 0; i < count; i++) {
        const tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'g-odd-tile';
        tile.textContent = i === variantIndex ? odd : common;
        tile.setAttribute('aria-label', `Symbol ${i + 1}`);
        if (i === variantIndex) tile.dataset.variant = 'true';
        tile.addEventListener('click', () => tap(i, tile));
        grid.appendChild(tile);
      }
      feedback.textContent = 'Visual search. Do not rush the scan.';
      feedback.className = 'g-feedback';
    }

    function tap(index, tile) {
      if (!running || tile.disabled) return;
      if (index === variantIndex) {
        found += 1;
        tile.classList.add('is-ok');
        [...grid.children].forEach((node) => { node.disabled = true; });
        feedback.textContent = 'Found it.';
        feedback.className = 'g-feedback is-good';
        ctx.setScore(points());
        setTimeout(() => { if (running) build(); }, 340);
      } else {
        misses += 1;
        tile.classList.add('is-bad');
        tile.disabled = true;
        feedback.textContent = `Not that one. ${misses} miss${misses === 1 ? '' : 'es'}.`;
        feedback.className = 'g-feedback is-bad';
        ctx.setScore(points());
      }
    }

    function end() {
      if (!running) return;
      running = false;
      timer.stop();
      finish({
        score: points(),
        correct: found,
        total: Math.max(found + misses, 1),
        label: 'points',
        detail: `${found} found · ${misses} miss${misses === 1 ? '' : 'es'}`,
        headline: found >= 12 ? 'Search pattern locked.' : found >= 7 ? 'Quick eye.' : 'Scan edges first.'
      });
    }

    const timer = createTimer(60, {
      onTick: (remaining) => {
        timerNode.textContent = formatSeconds(remaining);
        timerNode.classList.toggle('is-low', remaining <= 10);
        ctx.setProgress(1 - remaining / 60);
      },
      onEnd: end
    });

    ctx.onCleanup(() => timer.stop());
    ctx.setScore(0);
    build();
  }
};
