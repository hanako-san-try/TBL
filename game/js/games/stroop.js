import { createTimer, finishOnce, formatSeconds, lockChoices, pick, rand, shuffle } from './_kit.js';

const COLORS = [
  { name: 'Red', hex: '#ff6b5b' },
  { name: 'Blue', hex: '#7cc7f2' },
  { name: 'Green', hex: '#7cf2a4' },
  { name: 'Yellow', hex: '#f0c05a' },
  { name: 'Purple', hex: '#b79df2' },
  { name: 'Pink', hex: '#f29ad7' }
];

export default {
  id: 'stroop',
  mount(root, ctx) {
    const finish = finishOnce(ctx);
    let running = true;
    let correct = 0;
    let total = 0;
    let ink = null;
    let buttons = [];

    root.innerHTML = `
      <div class="g-wrap">
        <div class="g-head">
          <span class="g-kicker">Stroop · name the ink</span>
          <span class="g-timer" id="st-timer">0:45</span>
        </div>
        <div class="g-panel">
          <p class="g-sub">Ignore what the word says. Choose the colour it is printed in.</p>
          <div class="g-stroop-word" id="st-word">READY</div>
          <div class="g-stroop-choices" id="st-choices"></div>
          <div class="g-feedback" id="st-feedback">Ink colour only.</div>
        </div>
      </div>`;

    const wordNode = root.querySelector('#st-word');
    const choicesRoot = root.querySelector('#st-choices');
    const feedback = root.querySelector('#st-feedback');
    const timerNode = root.querySelector('#st-timer');

    function next() {
      const wordColor = pick(COLORS);
      ink = pick(COLORS);
      wordNode.textContent = wordColor.name.toUpperCase();
      wordNode.style.color = ink.hex;
      feedback.textContent = 'Ink colour only.';
      feedback.className = 'g-feedback';
      ctx.setStatus(`${total} answered`);

      const options = shuffle([
        ink,
        ...shuffle(COLORS.filter((color) => color.name !== ink.name)).slice(0, 3)
      ]);
      choicesRoot.innerHTML = '';
      buttons = options.map((color, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'g-stroop-choice';
        button.innerHTML = `<span class="g-key">${index + 1}</span><span class="g-dot" style="background:${color.hex}"></span>${color.name}`;
        button.addEventListener('click', () => answer(color, button));
        choicesRoot.appendChild(button);
        return button;
      });
    }

    function answer(color, button) {
      if (!running || button.disabled) return;
      lockChoices(buttons);
      total += 1;
      const good = color.name === ink.name;
      if (good) {
        correct += 1;
        feedback.textContent = 'Correct.';
        feedback.className = 'g-feedback is-good';
        ctx.setScore(correct);
      } else {
        button.classList.add('is-wrong');
        feedback.textContent = `The ink was ${ink.name.toLowerCase()}.`;
        feedback.className = 'g-feedback is-bad';
      }
      buttons.forEach((node) => {
        if (node.textContent.toLowerCase().includes(ink.name.toLowerCase())) node.classList.add('is-correct');
      });
      setTimeout(() => { if (running) next(); }, good ? 180 : 620);
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
        headline: correct >= 18 ? 'Your reading habit lost.' : correct >= 11 ? 'Inhibition holding.' : 'The word won a few rounds.'
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

    function onKey(event) {
      const index = Number(event.key) - 1;
      if (index >= 0 && index < buttons.length) {
        const button = buttons[index];
        if (button && !button.disabled) { event.preventDefault(); button.click(); }
      }
    }
    document.addEventListener('keydown', onKey);

    ctx.onCleanup(() => { timer.stop(); document.removeEventListener('keydown', onKey); });
    ctx.setScore(0);
    next();
  }
};
