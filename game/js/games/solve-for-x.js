import { createTimer, finishOnce, formatSeconds, lockChoices, makeChoices, rand, shuffle } from './_kit.js';

function buildEquation() {
  const a = rand(2, 9);
  const x = rand(1, 12);
  const b = rand(1, 20);
  const plus = Math.random() > 0.45;
  const c = plus ? a * x + b : a * x - b;
  const sign = plus ? '+' : '−';
  const text = `${a}x ${sign} ${b} = ${c}`;
  const choices = new Set([x]);
  while (choices.size < 4) {
    const candidate = x + rand(-6, 6);
    if (candidate > 0 && candidate !== x) choices.add(candidate);
  }
  return { text, answer: x, choices: shuffle([...choices]) };
}

export default {
  id: 'solve-for-x',
  mount(root, ctx) {
    const finish = finishOnce(ctx);
    let running = true;
    let correct = 0;
    let total = 0;
    let current = null;
    let choices = [];

    root.innerHTML = `
      <div class="g-wrap">
        <div class="g-head">
          <span class="g-kicker">Solve For X · 8 equations</span>
          <span class="g-timer" id="sx-timer">1:00</span>
        </div>
        <div class="g-panel">
          <div class="g-prompt" id="sx-prompt">—</div>
          <p class="g-sub">What value of x makes the equation true?</p>
          <div class="g-choices" id="sx-choices" style="margin-top:18px"></div>
          <div class="g-feedback" id="sx-feedback">Isolate x. Then check the answer.</div>
        </div>
      </div>`;

    const prompt = root.querySelector('#sx-prompt');
    const choicesRoot = root.querySelector('#sx-choices');
    const feedback = root.querySelector('#sx-feedback');
    const timerNode = root.querySelector('#sx-timer');

    function next() {
      if (total >= 8) { end('complete'); return; }
      current = buildEquation();
      ctx.setStatus(`Equation ${Math.min(total + 1, 8)} / 8`);
      prompt.textContent = current.text;
      choices = makeChoices(choicesRoot, current.choices, (value, button) => answer(value, button));
      feedback.textContent = 'Isolate x. Then check the answer.';
      feedback.className = 'g-feedback';
    }

    function answer(value, button) {
      if (!running) return;
      lockChoices(choices);
      total += 1;
      const good = value === current.answer;
      choices.forEach((node) => {
        const valueNode = node.querySelector('span:last-child');
        if (Number(valueNode?.textContent) === current.answer) node.classList.add('is-correct');
      });
      if (good) {
        correct += 1;
        feedback.textContent = 'Correct.';
        feedback.className = 'g-feedback is-good';
        ctx.setScore(correct);
      } else {
        button.classList.add('is-wrong');
        feedback.textContent = `x = ${current.answer}. Substitute it back to check.`;
        feedback.className = 'g-feedback is-bad';
      }
      setTimeout(() => { if (running) next(); }, good ? 320 : 900);
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
        headline: correct >= 7 ? 'Algebra under pressure.' : correct >= 4 ? 'Isolation is working.' : 'Write the step down.'
      });
    }

    const timer = createTimer(60, {
      onTick: (remaining) => {
        timerNode.textContent = formatSeconds(remaining);
        timerNode.classList.toggle('is-low', remaining <= 10);
        ctx.setProgress((8 - Math.min(8, total)) / 8);
      },
      onEnd: () => end('time')
    });

    function onKey(event) {
      const index = Number(event.key) - 1;
      if (index >= 0 && index < choices.length) {
        const button = choices[index];
        if (button && !button.disabled) { event.preventDefault(); button.click(); }
      }
    }
    document.addEventListener('keydown', onKey);

    ctx.onCleanup(() => { timer.stop(); document.removeEventListener('keydown', onKey); });
    ctx.setScore(0);
    next();
  }
};
