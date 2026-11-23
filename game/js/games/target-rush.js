import { createTimer, finishOnce, formatSeconds, rand } from './_kit.js';

export default {
  id: 'target-rush',
  async mount(root, ctx) {
    const finish = finishOnce(ctx);
    let running = true;
    let score = 0;
    let hits = 0;
    let misses = 0;
    let combo = 0;
    let bestCombo = 0;
    let timer = null;
    let k = null;
    let fallbackTimeout = null;
    let fallbackTarget = null;

    root.innerHTML = `
      <div class="g-wrap">
        <div class="g-head">
          <span class="g-kicker">Target Rush · 30 seconds</span>
          <span class="g-timer" id="tr-timer">0:30</span>
        </div>
        <div class="g-panel" style="padding:0;overflow:hidden">
          <div class="g-canvas-wrap" id="tr-wrap">
            <span class="g-canvas-hint" id="tr-hint">Booting arena…</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-top:1px solid var(--v-line)">
            <span class="g-status" id="tr-combo">Combo ×0</span>
            <span class="g-status" id="tr-accuracy">0 hits</span>
          </div>
        </div>
      </div>`;

    const wrap = root.querySelector('#tr-wrap');
    const timerNode = root.querySelector('#tr-timer');
    const hint = root.querySelector('#tr-hint');
    const comboNode = root.querySelector('#tr-combo');
    const accuracyNode = root.querySelector('#tr-accuracy');

    function updateHud() {
      comboNode.textContent = `Combo ×${combo}`;
      accuracyNode.textContent = `${hits} hits · ${misses} missed`;
    }

    function end() {
      if (!running) return;
      running = false;
      if (timer) timer.stop();
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      if (k) {
        try { k.quit(); } catch (error) { /* engine already gone */ }
        k = null;
      }
      finish({
        score,
        correct: hits,
        total: Math.max(hits + misses, 1),
        label: 'points',
        detail: `${hits} hits · ${bestCombo}× best combo`,
        headline: hits >= 20 ? 'Hands ahead of eyes.' : hits >= 11 ? 'Good tracking.' : 'Warm-up logged.'
      });
    }

    function startTimer() {
      timer = createTimer(30, {
        onTick: (remaining) => {
          timerNode.textContent = formatSeconds(remaining);
          timerNode.classList.toggle('is-low', remaining <= 8);
          ctx.setProgress(1 - remaining / 30);
        },
        onEnd: end
      });
    }

    function startFallback() {
      hint.textContent = 'Click the signal before it fades';
      const board = document.createElement('div');
      board.className = 'g-fallback-board';
      wrap.appendChild(board);

      const spawn = () => {
        if (!running) return;
        if (fallbackTarget) fallbackTarget.remove();
        const life = Math.max(700, 1550 - hits * 18);
        const target = document.createElement('button');
        target.type = 'button';
        target.className = 'g-fallback-target';
        target.textContent = '+';
        target.style.left = `${rand(9, 91)}%`;
        target.style.top = `${rand(14, 86)}%`;
        target.setAttribute('aria-label', 'Hit target');
        board.appendChild(target);
        fallbackTarget = target;
        const deadline = setTimeout(() => {
          if (!running) return;
          target.remove();
          fallbackTarget = null;
          misses += 1;
          combo = 0;
          updateHud();
          spawn();
        }, life);
        target.addEventListener('click', () => {
          if (!running) return;
          clearTimeout(deadline);
          target.remove();
          fallbackTarget = null;
          hits += 1;
          combo += 1;
          bestCombo = Math.max(bestCombo, combo);
          score += 10 + combo * 2;
          ctx.setScore(score);
          updateHud();
          spawn();
        });
      };
      spawn();
    }

    function startKaplay(kaplay) {
      const width = 960;
      const height = 540;
      try {
        const canvas = document.createElement('canvas');
        k = kaplay({
          root: wrap,
          canvas,
          width,
          height,
          background: [7, 7, 6],
          global: false,
          debug: false,
          letterbox: true,
          touchToMouse: true
        });
        wrap.appendChild(k.canvas);
        hint.textContent = 'Click the signal before it fades';

        const spawn = () => {
          if (!running || !k) return;
          const radius = Math.max(16, 38 - Math.floor(hits / 5) * 2);
          const x = rand(80, width - 80);
          const y = rand(70, height - 70);
          const target = k.add([
            k.circle(radius),
            k.pos(x, y),
            k.area(),
            k.color(215, 244, 90),
            k.opacity(0.92),
            'target'
          ]);
          target.life = 1.55;
          target.onUpdate(() => {
            if (!k) return;
            target.life -= k.dt();
            const scale = Math.max(0.22, target.life / 1.55);
            target.scale = k.vec2(scale);
            if (target.life <= 0) {
              target.destroy();
              if (!running) return;
              misses += 1;
              combo = 0;
              updateHud();
              spawn();
            }
          });
        };

        k.onClick('target', (target) => {
          if (!running) return;
          hits += 1;
          combo += 1;
          bestCombo = Math.max(bestCombo, combo);
          score += 10 + combo * 2;
          ctx.setScore(score);
          updateHud();
          target.destroy();
          spawn();
        });

        spawn();
      } catch (error) {
        console.warn('Kaplay target rush failed — using DOM fallback.', error);
        if (k) { try { k.quit(); } catch (e) {} }
        k = null;
        startFallback();
      }
    }

    updateHud();
    ctx.setScore(0);
    ctx.setStatus('Live');

    ctx.onCleanup(() => {
      running = false;
      if (timer) timer.stop();
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      if (k) { try { k.quit(); } catch (error) {} k = null; }
    });

    let kaplay = null;
    if (typeof ctx.loadKaplay === 'function') {
      try {
        kaplay = await Promise.race([
          ctx.loadKaplay(),
          new Promise((resolve) => setTimeout(() => resolve(null), 3200))
        ]);
      } catch (error) {
        kaplay = null;
      }
    }

    if (!running) return;
    if (kaplay) startKaplay(kaplay);
    else startFallback();

    startTimer();
  }
};
