import { createTimer, finishOnce, formatSeconds, rand } from './_kit.js';

export default {
  id: 'memory-grid',
  mount(root, ctx) {
    const finish = finishOnce(ctx);
    let running = true;
    let accepting = false;
    let sequence = [];
    let inputIndex = 0;
    let round = 0;
    let lives = 3;
    let timers = [];

    root.innerHTML = `
      <div class="g-wrap">
        <div class="g-head">
          <span class="g-kicker">Memory Grid · watch and repeat</span>
          <span class="g-timer" id="mg-timer">2:00</span>
        </div>
        <div class="g-panel">
          <div class="g-grid g-grid-3" id="mg-grid" style="max-width:360px"></div>
          <div class="g-feedback" id="mg-feedback">Watch the sequence.</div>
          <div class="g-actions"><span class="g-status" id="mg-lives">3 lives</span></div>
        </div>
      </div>`;

    const grid = root.querySelector('#mg-grid');
    const feedback = root.querySelector('#mg-feedback');
    const timerNode = root.querySelector('#mg-timer');
    const livesNode = root.querySelector('#mg-lives');
    const tiles = [];

    for (let i = 0; i < 9; i++) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'g-tile';
      tile.dataset.index = String(i);
      tile.setAttribute('aria-label', `Cell ${i + 1}`);
      tile.addEventListener('click', () => tap(i, tile));
      grid.appendChild(tile);
      tiles.push(tile);
    }

    const later = (fn, delay) => {
      const id = setTimeout(fn, delay);
      timers.push(id);
      return id;
    };

    function updateLives() {
      livesNode.textContent = `${lives} ${lives === 1 ? 'life' : 'lives'} · round ${round}`;
    }

    function flash(index, duration = 420) {
      const tile = tiles[index];
      tile.classList.add('is-lit');
      later(() => tile.classList.remove('is-lit'), duration);
    }

    function playback() {
      accepting = false;
      feedback.textContent = 'Watch…';
      feedback.className = 'g-feedback';
      let index = 0;
      const step = () => {
        if (!running) return;
        if (index >= sequence.length) {
          later(() => {
            accepting = true;
            inputIndex = 0;
            feedback.textContent = 'Your turn.';
            feedback.className = 'g-feedback is-good';
          }, 260);
          return;
        }
        flash(sequence[index], 420);
        index += 1;
        later(step, 620);
      };
      step();
    }

    function startRound() {
      round += 1;
      inputIndex = 0;
      if (sequence.length < 3) {
        sequence = Array.from({ length: 3 }, () => rand(0, 8));
      } else {
        sequence.push(rand(0, 8));
      }
      updateLives();
      ctx.setScore(round - 1);
      ctx.setStatus(`Round ${round}`);
      later(playback, 500);
    }

    function tap(index, tile) {
      if (!running || !accepting) return;
      if (sequence[inputIndex] !== index) {
        accepting = false;
        tile.classList.add('is-bad');
        later(() => tile.classList.remove('is-bad'), 500);
        lives -= 1;
        updateLives();
        feedback.textContent = lives > 0 ? `Miss. ${lives} ${lives === 1 ? 'life' : 'lives'} left.` : 'Out of lives.';
        feedback.className = 'g-feedback is-bad';
        if (lives <= 0) {
          later(() => end('lives'), 700);
        } else {
          later(playback, 900);
        }
        return;
      }

      tile.classList.add('is-lit');
      later(() => tile.classList.remove('is-lit'), 220);
      inputIndex += 1;
      if (inputIndex === sequence.length) {
        accepting = false;
        feedback.textContent = 'Round cleared.';
        feedback.className = 'g-feedback is-good';
        ctx.setScore(round);
        later(startRound, 900);
      }
    }

    function end(reason) {
      if (!running) return;
      running = false;
      timer.stop();
      timers.forEach(clearTimeout);
      finish({
        score: Math.max(0, round - (reason === 'lives' ? 1 : 0)),
        correct: Math.max(0, round - 1),
        total: Math.max(1, round),
        label: 'rounds',
        detail: `${lives} ${lives === 1 ? 'life' : 'lives'} left`,
        headline: round >= 8 ? 'Strong sequence memory.' : round >= 5 ? 'The pattern is holding.' : 'Short-term memory logged.'
      });
    }

    const timer = createTimer(120, {
      onTick: (remaining) => {
        timerNode.textContent = formatSeconds(remaining);
        timerNode.classList.toggle('is-low', remaining <= 15);
        ctx.setProgress(1 - remaining / 120);
      },
      onEnd: () => end('time')
    });

    ctx.onCleanup(() => {
      timer.stop();
      timers.forEach(clearTimeout);
    });
    ctx.setScore(0);
    updateLives();
    startRound();
  }
};
