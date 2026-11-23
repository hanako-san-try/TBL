import { createTimer, finishOnce, formatSeconds, makeChoices, lockChoices, pick, rand, shuffle } from './_kit.js';

function buildSequence() {
  const type = pick(['arithmetic', 'geometric', 'squares', 'fibonacci', 'alternating']);
  let terms = [];
  let answer = 0;
  let rule = '';

  if (type === 'arithmetic') {
    const start = rand(2, 18);
    const step = rand(2, 9) * (Math.random() > 0.75 ? -1 : 1);
    terms = Array.from({ length: 4 }, (_, i) => start + i * step);
    answer = start + 4 * step;
    rule = `Each term changes by ${step}.`;
  } else if (type === 'geometric') {
    const start = rand(1, 4);
    const ratio = rand(2, 3);
    terms = Array.from({ length: 4 }, (_, i) => start * ratio ** i);
    answer = start * ratio ** 4;
    rule = `Each term is multiplied by ${ratio}.`;
  } else if (type === 'squares') {
    const start = rand(1, 5);
    const offset = rand(0, 4);
    terms = Array.from({ length: 4 }, (_, i) => (start + i) ** 2 + offset);
    answer = (start + 4) ** 2 + offset;
    rule = `Squares, plus ${offset}.`;
  } else if (type === 'fibonacci') {
    let a = rand(1, 5);
    let b = rand(2, 7);
    terms = [a, b];
    for (let i = 0; i < 2; i++) {
      const next = a + b;
      terms.push(next);
      a = b;
      b = next;
    }
    answer = a + b;
    rule = 'Each term is the sum of the previous two.';
  } else {
    const start = rand(4, 15);
    const add = rand(3, 8);
    const subtract = rand(1, 4);
    terms = [start];
    for (let i = 1; i < 4; i++) {
      terms.push(i % 2 === 1 ? terms[i - 1] + add : terms[i - 1] - subtract);
    }
    answer = terms[3] + add;
    rule = `Alternating +${add} / −${subtract}.`;
  }

  const choices = new Set([answer]);
  while (choices.size < 4) {
    const delta = rand(1, Math.max(3, Math.round(Math.abs(answer) * 0.2))) * (Math.random() > 0.5 ? 1 : -1);
    const candidate = answer + delta;
    if (candidate >= 0) choices.add(candidate);
  }
  return { terms, answer, rule, choices: shuffle([...choices]) };
}

export default {
  id: 'number-sequence',
  mount(root, ctx) {
    const finish = finishOnce(ctx);
    let running = true;
    let correct = 0;
    let total = 0;
    let question = null;
    let choices = [];

    root.innerHTML = `
      <div class="g-wrap">
        <div class="g-head">
          <span class="g-kicker">Next In Line · 8 patterns</span>
          <span class="g-timer" id="ns-timer">1:00</span>
        </div>
        <div class="g-panel">
          <div class="g-seq-display" id="ns-seq"></div>
          <p class="g-sub" id="ns-question">What comes next?</p>
          <div class="g-choices" id="ns-choices" style="margin-top:18px"></div>
          <div class="g-feedback" id="ns-feedback">Find the rule, then the next term.</div>
        </div>
      </div>`;

    const seqNode = root.querySelector('#ns-seq');
    const choicesRoot = root.querySelector('#ns-choices');
    const feedback = root.querySelector('#ns-feedback');
    const timerNode = root.querySelector('#ns-timer');

    function next() {
      if (total >= 8) {
        end('complete');
        return;
      }
      question = buildSequence();
      ctx.setStatus(`Pattern ${Math.min(total + 1, 8)} / 8`);
      seqNode.innerHTML = question.terms.map((term) => `<span>${term}</span>`).join('<span style="color:var(--v-dim)">,</span>') + '<span style="color:var(--v-signal)">, ?</span>';
      choices = makeChoices(choicesRoot, question.choices, (value, button) => answer(value, button));
      feedback.textContent = 'Find the rule, then the next term.';
      feedback.className = 'g-feedback';
    }

    function answer(value, button) {
      if (!running) return;
      lockChoices(choices);
      total += 1;
      const good = value === question.answer;
      choices.forEach((node) => {
        const valueNode = node.querySelector('span:last-child');
        if (Number(valueNode?.textContent) === question.answer) node.classList.add('is-correct');
      });
      if (good) {
        correct += 1;
        feedback.textContent = question.rule;
        feedback.className = 'g-feedback is-good';
        ctx.setScore(correct);
      } else {
        button.classList.add('is-wrong');
        feedback.textContent = `${question.rule} Answer: ${question.answer}`;
        feedback.className = 'g-feedback is-bad';
      }
      setTimeout(() => { if (running) next(); }, good ? 520 : 900);
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
        headline: correct >= 7 ? 'Pattern reader.' : correct >= 4 ? 'Rules are forming.' : 'Keep reading the gaps.'
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

    ctx.onCleanup(() => timer.stop());
    ctx.setScore(0);
    ctx.setStatus('Pattern 1 / 8');
    next();
  }
};
