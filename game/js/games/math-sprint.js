import { el, createTimer, finishOnce, makeChoices, lockChoices, formatSeconds } from './_kit.js';

export default {
  id: 'math-sprint',
  mount(root, ctx) {
    const finish = finishOnce(ctx);
    let correct = 0;
    let total = 0;
    let combo = 0;
    let bestCombo = 0;
    let running = true;
    let lock = false;
    let current = null;
    let choices = [];

    root.innerHTML = `
      <div class="g-wrap">
        <div class="g-head">
          <span class="g-kicker">Math sprint · 60 seconds</span>
          <span class="g-timer" id="ms-timer">1:00</span>
        </div>
        <div class="g-panel">
          <div class="g-prompt" id="ms-prompt">Ready?</div>
          <div class="g-choices" id="ms-choices"></div>
          <div class="g-feedback" id="ms-feedback">Answer with 1–4 or tap a choice.</div>
          <div class="g-progress"><span id="ms-bar" style="--p:100%"></span></div>
        </div>
      </div>`;

    const prompt = root.querySelector('#ms-prompt');
    const choicesRoot = root.querySelector('#ms-choices');
    const feedback = root.querySelector('#ms-feedback');
    const timerNode = root.querySelector('#ms-timer');
    const bar = root.querySelector('#ms-bar');

    function nextQuestion() {
      const level = correct < 5 ? 1 : correct < 12 ? 2 : 3;
      current = Vantage.genQuestion(level);
      lock = false;
      prompt.textContent = current.text;
      choices = makeChoices(choicesRoot, current.choices, (value, button) => answer(value, button));
    }

    function answer(value, button) {
      if (!running || lock) return;
      lock = true;
      total += 1;
      const good = value === current.ans;
      lockChoices(choices);
      choices.forEach((node) => {
        const valueNode = node.querySelector('span:last-child');
        if (Number(valueNode?.textContent) === current.ans) node.classList.add('is-correct');
      });
      if (good) {
        correct += 1;
        combo += 1;
        bestCombo = Math.max(bestCombo, combo);
        feedback.textContent = combo >= 2 ? `Correct · ${combo}× combo` : 'Correct';
        feedback.className = 'g-feedback is-good';
        ctx.setScore(correct);
      } else {
        combo = 0;
        button.classList.add('is-wrong');
        feedback.textContent = `Answer: ${current.ans}`;
        feedback.className = 'g-feedback is-bad';
      }
      setTimeout(() => {
        if (running) nextQuestion();
      }, 340);
    }

    function end(reason) {
      if (!running) return;
      running = false;
      timer.stop();
      finish({
        score: correct,
        correct,
        total,
        label: 'correct',
        detail: `${bestCombo}× best combo · ${reason}`,
        headline: correct >= 15 ? 'Fast and clean.' : correct >= 8 ? 'Solid run.' : 'Warm-up logged.'
      });
    }

    const timer = createTimer(60, {
      onTick: (remaining) => {
        timerNode.textContent = formatSeconds(remaining);
        timerNode.classList.toggle('is-low', remaining <= 10);
        bar.style.setProperty('--p', `${(remaining / 60) * 100}%`);
        ctx.setProgress(1 - remaining / 60);
      },
      onEnd: () => end('time')
    });

    function onKey(event) {
      const index = Number(event.key) - 1;
      if (index >= 0 && index < choices.length) {
        const button = choices[index];
        if (button && !button.disabled) {
          event.preventDefault();
          button.click();
        }
      }
    }

    document.addEventListener('keydown', onKey);
    ctx.onCleanup(() => { timer.stop(); document.removeEventListener('keydown', onKey); });
    ctx.setScore(0);
    ctx.setStatus('Live');
    nextQuestion();
  }
};
