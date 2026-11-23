import { finishOnce, setFeedback } from './_kit.js';

export default {
  id: 'reaction-time',
  mount(root, ctx) {
    const finish = finishOnce(ctx);
    const trials = 5;
    let running = true;
    let trial = 0;
    let times = [];
    let state = 'idle'; // idle | waiting | go | result
    let goAt = 0;
    let timeout = null;

    root.innerHTML = `
      <div class="g-wrap">
        <div class="g-head">
          <span class="g-kicker">Reaction · 5 trials</span>
          <span class="g-status" id="rt-count">Trial 1 / 5</span>
        </div>
        <div class="g-panel" style="padding:0;border:0;background:transparent">
          <button type="button" class="g-big-stage" id="rt-stage">
            <span>
              <span class="g-big-label" id="rt-label">Tap to begin</span>
              <span class="g-big-sub" id="rt-sub">Wait for the signal. Then strike.</span>
            </span>
          </button>
          <div class="g-feedback" id="rt-feedback">Early clicks add a penalty.</div>
          <div class="g-actions">
            <button class="v-btn v-btn-sm" id="rt-reset" type="button">Restart trials</button>
          </div>
        </div>
      </div>`;

    const stage = root.querySelector('#rt-stage');
    const label = root.querySelector('#rt-label');
    const sub = root.querySelector('#rt-sub');
    const feedback = root.querySelector('#rt-feedback');
    const count = root.querySelector('#rt-count');

    function clearTimers() {
      if (timeout) { clearTimeout(timeout); timeout = null; }
    }

    function setStage(mode, big, small) {
      state = mode;
      stage.classList.toggle('is-ready', mode === 'waiting');
      stage.classList.toggle('is-go', mode === 'go');
      label.textContent = big;
      sub.textContent = small;
    }

    function nextTrial() {
      if (!running) return;
      if (trial >= trials) { end(); return; }
      count.textContent = `Trial ${trial + 1} / ${trials}`;
      ctx.setStatus(`Trial ${trial + 1} / ${trials}`);
      setStage('waiting', 'Wait…', 'Do not click until the panel turns green.');
      setFeedback(feedback, 'Steady. The signal comes without warning.');
      clearTimers();
      const delay = 900 + Math.random() * 2200;
      timeout = setTimeout(() => {
        if (!running) return;
        setStage('go', 'Strike', 'Click now.');
        goAt = performance.now();
      }, delay);
    }

    function record(ms, note) {
      times.push(ms);
      trial += 1;
      setStage('result', `${Math.round(ms)} ms`, note);
      if (trial >= trials) {
        timeout = setTimeout(end, 900);
      } else {
        timeout = setTimeout(nextTrial, 950);
      }
    }

    function hit() {
      if (!running) return;
      if (state === 'idle') { nextTrial(); return; }
      if (state === 'result') return;
      if (state === 'waiting') {
        clearTimers();
        setFeedback(feedback, 'Too early — 500 ms penalty.', 'bad');
        record(500, 'False start');
        return;
      }
      if (state === 'go') {
        const ms = performance.now() - goAt;
        setFeedback(feedback, ms < 250 ? 'Excellent.' : ms < 350 ? 'Solid.' : 'Logged.', ms < 350 ? 'good' : '');
        record(ms, 'Trial logged');
      }
    }

    function reset() {
      clearTimers();
      running = true;
      trial = 0;
      times = [];
      ctx.setScore(0);
      count.textContent = `Trial 1 / ${trials}`;
      setStage('idle', 'Tap to begin', 'Wait for the signal. Then strike.');
      setFeedback(feedback, 'Early clicks add a penalty.');
    }

    function end() {
      if (!running) return;
      running = false;
      clearTimers();
      const average = times.length ? times.reduce((sum, value) => sum + value, 0) / times.length : 500;
      const best = times.length ? Math.min(...times) : 500;
      const score = Math.max(0, Math.round((520 - average) * 2.4 + 60));
      ctx.setScore(score);
      setStage('idle', `${Math.round(average)} ms`, 'Average reaction across five trials.');
      finish({
        score,
        correct: times.filter((value) => value < 350).length,
        total: trials,
        label: 'points',
        detail: `avg ${Math.round(average)} ms · best ${Math.round(best)} ms`,
        headline: average < 260 ? 'Sharp reflexes.' : average < 340 ? 'Solid wiring.' : 'Slow down the tension, not the click.'
      });
    }

    stage.addEventListener('click', hit);
    stage.addEventListener('keydown', (event) => {
      if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); hit(); }
    });
    root.querySelector('#rt-reset').addEventListener('click', reset);
    ctx.onCleanup(() => { running = false; clearTimers(); });

    ctx.setScore(0);
    count.textContent = `Trial 1 / ${trials}`;
    setStage('idle', 'Tap to begin', 'Five trials. Wait for the signal, then strike.');
  }
};
