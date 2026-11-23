import { createTimer, finishOnce, formatSeconds, pick } from './_kit.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const TRIALS = 24;
const N = 2;

export default {
  id: 'n-back',
  mount(root, ctx) {
    const finish = finishOnce(ctx);
    let running = true;
    let index = 0;
    let hits = 0;
    let falseAlarms = 0;
    let missed = 0;
    let accepting = false;
    let currentIsTarget = false;
    let trialTimeout = null;
    let sequence = [];
    let timers = [];

    for (let i = 0; i < TRIALS; i++) {
      let letter = pick(LETTERS);
      if (i >= N && Math.random() < 0.32) letter = sequence[i - N];
      sequence.push(letter);
    }

    root.innerHTML = `
      <div class="g-wrap">
        <div class="g-head">
          <span class="g-kicker">N-Back · ${N}-back letters</span>
          <span class="g-timer" id="nb-timer">1:15</span>
        </div>
        <div class="g-panel">
          <div class="g-head">
            <span class="g-status" id="nb-count">Trial 1 / ${TRIALS}</span>
            <span class="g-status" id="nb-score">0 hits · 0 false</span>
          </div>
          <div class="g-big-stage" id="nb-stage">
            <span>
              <span class="g-big-label" id="nb-letter">—</span>
              <span class="g-big-sub" id="nb-sub">Match when the letter equals the one ${N} steps back.</span>
            </span>
          </div>
          <div class="g-actions">
            <button class="v-btn v-btn-signal" type="button" id="nb-match">Match <span style="opacity:.6;font-size:.8em">(space)</span></button>
          </div>
          <div class="g-feedback" id="nb-feedback">Do not match the first two letters.</div>
        </div>
      </div>`;

    const stage = root.querySelector('#nb-stage');
    const letterNode = root.querySelector('#nb-letter');
    const feedback = root.querySelector('#nb-feedback');
    const countNode = root.querySelector('#nb-count');
    const scoreNode = root.querySelector('#nb-score');
    const timerNode = root.querySelector('#nb-timer');
    const matchButton = root.querySelector('#nb-match');

    const later = (fn, delay) => {
      const id = setTimeout(fn, delay);
      timers.push(id);
      return id;
    };

    function updateScore() {
      const points = Math.max(0, hits * 10 - falseAlarms * 8);
      ctx.setScore(points);
      scoreNode.textContent = `${hits} hits · ${falseAlarms} false`;
    }

    function nextTrial() {
      if (!running) return;
      if (index >= TRIALS) { end('complete'); return; }
      const letter = sequence[index];
      currentIsTarget = index >= N && letter === sequence[index - N];
      accepting = true;
      letterNode.textContent = letter;
      stage.classList.add('is-ready');
      countNode.textContent = `Trial ${index + 1} / ${TRIALS}`;
      ctx.setStatus(`Trial ${index + 1} / ${TRIALS}`);
      ctx.setProgress(index / TRIALS);

      if (trialTimeout) clearTimeout(trialTimeout);
      trialTimeout = setTimeout(() => {
        if (!running || !accepting) return;
        accepting = false;
        stage.classList.remove('is-ready');
        letterNode.textContent = '·';
        if (currentIsTarget) {
          missed += 1;
          feedback.textContent = 'Target missed.';
          feedback.className = 'g-feedback is-bad';
        } else {
          feedback.textContent = 'Hold.';
          feedback.className = 'g-feedback';
        }
        index += 1;
        later(nextTrial, 280);
      }, 1250);
    }

    function respond() {
      if (!running || !accepting) return;
      accepting = false;
      if (trialTimeout) clearTimeout(trialTimeout);
      stage.classList.remove('is-ready');
      letterNode.textContent = '·';
      if (currentIsTarget) {
        hits += 1;
        feedback.textContent = 'Correct match.';
        feedback.className = 'g-feedback is-good';
      } else {
        falseAlarms += 1;
        feedback.textContent = 'False alarm.';
        feedback.className = 'g-feedback is-bad';
      }
      updateScore();
      index += 1;
      later(nextTrial, 420);
    }

    function end(reason) {
      if (!running) return;
      running = false;
      timer.stop();
      timers.forEach(clearTimeout);
      const targets = sequence.filter((letter, i) => i >= N && letter === sequence[i - N]).length;
      const points = Math.max(0, hits * 10 - falseAlarms * 8);
      finish({
        score: points,
        correct: hits,
        total: Math.max(targets, 1),
        label: 'points',
        detail: `${hits}/${targets} targets · ${falseAlarms} false · ${missed} missed`,
        headline: hits >= 6 && falseAlarms <= 2 ? 'Working memory online.' : hits >= 3 ? 'Holding the thread.' : 'N-back is a hard habit.'
      });
    }

    const timer = createTimer(75, {
      onTick: (remaining) => {
        timerNode.textContent = formatSeconds(remaining);
        timerNode.classList.toggle('is-low', remaining <= 12);
      },
      onEnd: () => end('time')
    });

    matchButton.addEventListener('click', respond);
    document.addEventListener('keydown', (event) => {
      if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); respond(); }
    });

    ctx.onCleanup(() => {
      running = false;
      timer.stop();
      timers.forEach(clearTimeout);
      if (trialTimeout) clearTimeout(trialTimeout);
    });

    ctx.setScore(0);
    nextTrial();
  }
};
