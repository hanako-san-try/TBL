import { createTimer, finishOnce, formatSeconds, lockChoices, rand, shuffle } from './_kit.js';

const OPS = ['+', '−', '×', '÷'];

function makeEquation() {
  for (let attempt = 0; attempt < 80; attempt++) {
    const op = OPS[rand(0, 3)];
    let a, b, result;
    if (op === '+') {
      a = rand(3, 22); b = rand(2, 18); result = a + b;
    } else if (op === '−') {
      a = rand(12, 32); b = rand(2, a - 1); result = a - b;
    } else if (op === '×') {
      a = rand(2, 9); b = rand(2, 9); result = a * b;
    } else {
      b = rand(2, 9); result = rand(2, 9); a = b * result;
    }

    const valid = OPS.filter((candidate) => {
      if (candidate === '+') return a + b === result;
      if (candidate === '−') return a - b === result;
      if (candidate === '×') return a * b === result;
      return b !== 0 && a / b === result;
    });
    if (valid.length === 1) return { a, b, result, op };
  }
  return { a: 6, b: 7, result: 42, op: '×' };
}

export default {
  id: 'missing-operator',
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
          <span class="g-kicker">Operator · 10 equations</span>
          <span class="g-timer" id="mo-timer">0:45</span>
        </div>
        <div class="g-panel">
          <div class="g-prompt" id="mo-eq">—</div>
          <p class="g-sub">Which operation makes the equation true?</p>
          <div class="g-choices" id="mo-choices" style="grid-template-columns:repeat(4,1fr);margin-top:18px"></div>
          <div class="g-feedback" id="mo-feedback">Pick the missing symbol.</div>
        </div>
      </div>`;

    const equation = root.querySelector('#mo-eq');
    const choicesRoot = root.querySelector('#mo-choices');
    const feedback = root.querySelector('#mo-feedback');
    const timerNode = root.querySelector('#mo-timer');

    function next() {
      if (total >= 10) { end('complete'); return; }
      current = makeEquation();
      ctx.setStatus(`Equation ${Math.min(total + 1, 10)} / 10`);
      equation.innerHTML = `${current.a} <span style="color:var(--v-signal)">?</span> ${current.b} <span style="color:var(--v-dim)">=</span> ${current.result}`;
      choicesRoot.innerHTML = '';
      buttons = OPS.map((op, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'g-choice';
        button.innerHTML = `<span class="g-key">${index + 1}</span><span>${op}</span>`;
        button.addEventListener('click', () => answer(op, button));
        choicesRoot.appendChild(button);
        return button;
      });
      feedback.textContent = 'Pick the missing symbol.';
      feedback.className = 'g-feedback';
    }

    function answer(op, button) {
      if (!running) return;
      lockChoices(buttons);
      total += 1;
      const good = op === current.op;
      buttons.forEach((node) => {
        const valueNode = node.querySelector('span:last-child');
        if (valueNode?.textContent === current.op) node.classList.add('is-correct');
      });
      if (good) {
        correct += 1;
        feedback.textContent = 'Correct.';
        feedback.className = 'g-feedback is-good';
        ctx.setScore(correct);
      } else {
        button.classList.add('is-wrong');
        feedback.textContent = `It was ${current.op}.`;
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
        headline: correct >= 9 ? 'Operator locked.' : correct >= 6 ? 'Solid fluency.' : 'Slow the scan down.'
      });
    }

    const timer = createTimer(45, {
      onTick: (remaining) => {
        timerNode.textContent = formatSeconds(remaining);
        timerNode.classList.toggle('is-low', remaining <= 8);
        ctx.setProgress((10 - Math.min(10, total)) / 10);
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
