import { createTimer, finishOnce, formatSeconds, rand } from './_kit.js';

export default {
  id: 'sequence-recall',
  mount(root, ctx) {
    const finish = finishOnce(ctx);
    let running = true;
    let length = 3;
    let lives = 3;
    let points = 0;
    let rounds = 0;
    let sequence = '';
    let timers = [];
    let phase = 'idle';

    root.innerHTML = `
      <div class="g-wrap">
        <div class="g-head">
          <span class="g-kicker">Recall · growing digit string</span>
          <span class="g-timer" id="sr-timer">2:00</span>
        </div>
        <div class="g-panel">
          <div class="g-head">
            <span class="g-status" id="sr-status">Length 3 · 3 lives</span>
            <span class="g-status" id="sr-phase">Watch</span>
          </div>
          <div class="g-seq-display" id="sr-display">—</div>
          <div class="g-input-row" id="sr-row" hidden>
            <input id="sr-input" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" maxlength="16" aria-label="Type the digits you saw" placeholder="Type the digits" />
            <button class="v-btn v-btn-signal" id="sr-submit" type="button">Enter</button>
          </div>
          <div class="g-feedback" id="sr-feedback">Watch the digits, then type them in order.</div>
        </div>
      </div>`;

    const display = root.querySelector('#sr-display');
    const row = root.querySelector('#sr-row');
    const input = root.querySelector('#sr-input');
    const submit = root.querySelector('#sr-submit');
    const feedback = root.querySelector('#sr-feedback');
    const timerNode = root.querySelector('#sr-timer');
    const statusNode = root.querySelector('#sr-status');
    const phaseNode = root.querySelector('#sr-phase');

    const later = (fn, delay) => {
      const id = setTimeout(fn, delay);
      timers.push(id);
      return id;
    };

    function updateStatus() {
      statusNode.textContent = `Length ${length} · ${lives} ${lives === 1 ? 'life' : 'lives'}`;
      ctx.setStatus(`Level ${rounds + 1}`);
    }

    function startRound() {
      if (!running) return;
      phase = 'watch';
      sequence = Array.from({ length }, () => rand(0, 9)).join('');
      input.value = '';
      row.hidden = true;
      display.textContent = '…';
      display.style.color = 'var(--v-dim)';
      phaseNode.textContent = 'Watch';
      feedback.textContent = 'Watch the digits, then type them in order.';
      feedback.className = 'g-feedback';
      updateStatus();

      let index = 0;
      const step = () => {
        if (!running) return;
        if (index >= sequence.length) {
          display.textContent = '—';
          display.style.color = 'var(--v-dim)';
          later(() => {
            if (!running) return;
            phase = 'recall';
            phaseNode.textContent = 'Recall';
            row.hidden = false;
            input.maxLength = sequence.length + 2;
            input.focus();
            feedback.textContent = 'Your turn.';
            feedback.className = 'g-feedback is-good';
          }, 260);
          return;
        }
        display.textContent = sequence[index];
        display.style.color = 'var(--v-signal)';
        index += 1;
        later(() => {
          display.textContent = '·';
          display.style.color = 'var(--v-dim)';
        }, 430);
        later(step, 620);
      };
      later(step, 480);
    }

    function check() {
      if (!running || phase !== 'recall') return;
      const guess = input.value.replace(/\s+/g, '');
      if (!guess) { input.focus(); return; }
      phase = 'between';
      row.hidden = true;
      rounds += 1;
      if (guess === sequence) {
        points += length * 10;
        ctx.setScore(points);
        feedback.textContent = `Correct. Length ${length} cleared.`;
        feedback.className = 'g-feedback is-good';
        length += 1;
        later(() => { if (running) startRound(); }, 720);
      } else {
        lives -= 1;
        feedback.textContent = `Miss. It was ${sequence}. ${lives} ${lives === 1 ? 'life' : 'lives'} left.`;
        feedback.className = 'g-feedback is-bad';
        updateStatus();
        if (lives <= 0) {
          later(() => end('lives'), 1200);
        } else {
          later(() => { if (running) startRound(); }, 1500);
        }
      }
    }

    function end(reason) {
      if (!running) return;
      running = false;
      timer.stop();
      timers.forEach(clearTimeout);
      finish({
        score: points,
        correct: Math.max(0, length - 3),
        total: Math.max(rounds, 1),
        label: 'points',
        detail: `Reached length ${length} · ${reason === 'lives' ? 'out of lives' : 'time expired'}`,
        headline: length >= 8 ? 'Deep working memory.' : length >= 5 ? 'Chunking is working.' : 'Recall logged.'
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

    submit.addEventListener('click', check);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') { event.preventDefault(); check(); }
    });

    ctx.onCleanup(() => {
      timer.stop();
      timers.forEach(clearTimeout);
    });
    ctx.setScore(0);
    startRound();
  }
};
