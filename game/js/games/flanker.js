import { createTimer, finishOnce, formatSeconds, lockChoices } from './_kit.js';

const ARROW = { left: '←', right: '→' };

export default {
  id: 'flanker',
  mount(root, ctx) {
    const finish = finishOnce(ctx);
    let running = true;
    let correct = 0;
    let total = 0;
    let center = 'left';
    let buttons = [];

    root.innerHTML = `
      <div class="g-wrap">
        <div class="g-head">
          <span class="g-kicker">Flanker · ignore the noise</span>
          <span class="g-timer" id="fl-timer">0:45</span>
        </div>
        <div class="g-panel">
          <p class="g-sub">Report the direction of the <strong>centre</strong> arrow. The flankers are the distraction.</p>
          <div class="g-flanker-row" id="fl-row"></div>
          <div class="g-choices" id="fl-choices" style="grid-template-columns:1fr 1fr;max-width:440px">
            <button class="g-choice" type="button" data-dir="left"><span class="g-key">1</span><span>← Left</span></button>
            <button class="g-choice" type="button" data-dir="right"><span class="g-key">2</span><span>Right →</span></button>
          </div>
          <div class="g-feedback" id="fl-feedback">Centre arrow only.</div>
        </div>
      </div>`;

    const row = root.querySelector('#fl-row');
    const feedback = root.querySelector('#fl-feedback');
    const timerNode = root.querySelector('#fl-timer');
    buttons = [...root.querySelectorAll('[data-dir]')];

    function next() {
      center = Math.random() > 0.5 ? 'left' : 'right';
      const congruent = Math.random() > 0.45;
      const flanker = congruent ? center : (center === 'left' ? 'right' : 'left');
      const order = [flanker, flanker, center, flanker, flanker];
      row.innerHTML = order.map((direction, index) => {
        const span = document.createElement('span');
        span.textContent = ARROW[direction];
        if (index === 2) span.className = 'g-flanker-center';
        return span.outerHTML;
      }).join('');
      buttons.forEach((button) => {
        button.disabled = false;
        button.classList.remove('is-correct', 'is-wrong');
      });
      feedback.textContent = 'Centre arrow only.';
      feedback.className = 'g-feedback';
    }

    function answer(direction, button) {
      if (!running || button.disabled) return;
      lockChoices(buttons);
      total += 1;
      const good = direction === center;
      if (good) {
        correct += 1;
        feedback.textContent = 'Correct.';
        feedback.className = 'g-feedback is-good';
        ctx.setScore(correct);
      } else {
        button.classList.add('is-wrong');
        feedback.textContent = `Centre pointed ${center}.`;
        feedback.className = 'g-feedback is-bad';
      }
      buttons.forEach((node) => {
        if (node.dataset.dir === center) node.classList.add('is-correct');
      });
      setTimeout(() => { if (running) next(); }, good ? 170 : 520);
    }

    function end() {
      if (!running) return;
      running = false;
      timer.stop();
      finish({
        score: correct,
        correct,
        total: Math.max(total, 1),
        label: 'correct',
        detail: `${correct}/${Math.max(total, 1)} · ${Vantage.accuracy({ correct, total: Math.max(total, 1) })}% accuracy`,
        headline: correct >= 22 ? 'Attention is selective.' : correct >= 13 ? 'Flankers handled.' : 'The noise got through.'
      });
    }

    const timer = createTimer(45, {
      onTick: (remaining) => {
        timerNode.textContent = formatSeconds(remaining);
        timerNode.classList.toggle('is-low', remaining <= 8);
        ctx.setProgress(1 - remaining / 45);
      },
      onEnd: end
    });

    buttons.forEach((button) => {
      button.addEventListener('click', () => answer(button.dataset.dir, button));
    });

    function onKey(event) {
      if (event.key === 'ArrowLeft' || event.key === '1') {
        event.preventDefault();
        if (!buttons[0].disabled) answer('left', buttons[0]);
      } else if (event.key === 'ArrowRight' || event.key === '2') {
        event.preventDefault();
        if (!buttons[1].disabled) answer('right', buttons[1]);
      }
    }
    document.addEventListener('keydown', onKey);

    ctx.onCleanup(() => { timer.stop(); document.removeEventListener('keydown', onKey); });
    ctx.setScore(0);
    next();
  }
};
