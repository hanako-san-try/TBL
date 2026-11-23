import { createTimer, finishOnce, formatSeconds, lockChoices, rand, pick } from './_kit.js';

function makePair() {
  const kind = pick(['add', 'mul', 'sub', 'mixed']);
  let left, right, lv, rv;
  if (kind === 'add') {
    const a = rand(8, 40), b = rand(5, 35), c = rand(8, 40), d = rand(5, 35);
    left = `${a} + ${b}`; right = `${c} + ${d}`; lv = a + b; rv = c + d;
  } else if (kind === 'mul') {
    const a = rand(3, 12), b = rand(3, 12), c = rand(3, 12), d = rand(3, 12);
    left = `${a} × ${b}`; right = `${c} × ${d}`; lv = a * b; rv = c * d;
  } else if (kind === 'sub') {
    const a = rand(30, 80), b = rand(5, 28), c = rand(30, 80), d = rand(5, 28);
    left = `${a} − ${b}`; right = `${c} − ${d}`; lv = a - b; rv = c - d;
  } else {
    const a = rand(3, 9), b = rand(3, 9), c = rand(6, 18), d = rand(3, 12), e = rand(2, 20);
    left = `${a} × ${b} + ${c}`; right = `${d} × ${e}`; lv = a * b + c; rv = d * e;
  }
  return { left, right, lv, rv, answer: lv > rv ? '>' : lv < rv ? '<' : '=' };
}

export default {
  id: 'number-sense',
  mount(root, ctx) {
    const finish = finishOnce(ctx);
    let running = true;
    let correct = 0;
    let total = 0;
    let current = null;
    let buttons = [];

    root.innerHTML = `
      <div class="g-wrap">
        <div class="g-head">
          <span class="g-kicker">Number Sense · 12 comparisons</span>
          <span class="g-timer" id="nse-timer">0:45</span>
        </div>
        <div class="g-panel">
          <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;margin:8px 0 22px">
            <div class="g-cross-cell" id="nse-left" style="min-height:92px;font-size:clamp(1.3rem,4vw,2rem)"></div>
            <div style="font-family:var(--font-display);font-size:2rem;color:var(--v-signal)">?</div>
            <div class="g-cross-cell" id="nse-right" style="min-height:92px;font-size:clamp(1.3rem,4vw,2rem)"></div>
          </div>
          <div class="g-choices" id="nse-choices" style="grid-template-columns:repeat(3,1fr);max-width:420px"></div>
          <div class="g-feedback" id="nse-feedback">Compare magnitude, not exact arithmetic.</div>
        </div>
      </div>`;

    const leftNode = root.querySelector('#nse-left');
    const rightNode = root.querySelector('#nse-right');
    const choicesRoot = root.querySelector('#nse-choices');
    const feedback = root.querySelector('#nse-feedback');
    const timerNode = root.querySelector('#nse-timer');

    function next() {
      if (total >= 12) { end('complete'); return; }
      current = makePair();
      ctx.setStatus(`Comparison ${Math.min(total + 1, 12)} / 12`);
      leftNode.textContent = current.left;
      rightNode.textContent = current.right;
      choicesRoot.innerHTML = '';
      buttons = ['<', '=', '>'].map((symbol, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'g-choice';
        button.innerHTML = `<span class="g-key">${index + 1}</span><span>${symbol}</span>`;
        button.addEventListener('click', () => answer(symbol, button));
        choicesRoot.appendChild(button);
        return button;
      });
      feedback.textContent = 'Compare magnitude, not exact arithmetic.';
      feedback.className = 'g-feedback';
    }

    function answer(symbol, button) {
      if (!running) return;
      lockChoices(buttons);
      total += 1;
      const good = symbol === current.answer;
      buttons.forEach((node) => {
        const valueNode = node.querySelector('span:last-child');
        if (valueNode?.textContent === current.answer) node.classList.add('is-correct');
      });
      if (good) {
        correct += 1;
        feedback.textContent = 'Correct.';
        feedback.className = 'g-feedback is-good';
        ctx.setScore(correct);
      } else {
        button.classList.add('is-wrong');
        feedback.textContent = `${current.left} ${current.answer} ${current.right}`;
        feedback.className = 'g-feedback is-bad';
      }
      setTimeout(() => { if (running) next(); }, good ? 260 : 620);
    }

    function end(reason) {
      if (!running) return;
      running = false;
      timer.stop();
      finish({
        score: correct,
        correct,
        total: Math.max(total, 1),
        label: 'correct',
        detail: reason === 'complete' ? 'Set complete' : 'Time expired',
        headline: correct >= 10 ? 'Magnitude reader.' : correct >= 7 ? 'Good sense.' : 'Estimate first.'
      });
    }

    const timer = createTimer(45, {
      onTick: (remaining) => {
        timerNode.textContent = formatSeconds(remaining);
        timerNode.classList.toggle('is-low', remaining <= 8);
        ctx.setProgress((12 - Math.min(12, total)) / 12);
      },
      onEnd: () => end('time')
    });

    function onKey(event) {
      const index = Number(event.key) - 1;
      if (index >= 0 && index < buttons.length) {
        const button = buttons[index];
        if (button && !button.disabled) {
          event.preventDefault();
          button.click();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    ctx.onCleanup(() => { timer.stop(); document.removeEventListener('keydown', onKey); });
    ctx.setScore(0);
    next();
  }
};
