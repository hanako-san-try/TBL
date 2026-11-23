import { createTimer, finishOnce, formatSeconds, lockChoices, makeChoices, pick, rand, shuffle } from './_kit.js';

function buildPuzzle() {
  const kind = pick(['rowSum', 'rowProduct', 'columnSum', 'rowStep', 'rowScale']);
  const grid = Array.from({ length: 3 }, () => [0, 0, 0]);
  let rule = '';

  if (kind === 'rowSum') {
    for (let r = 0; r < 3; r++) {
      const a = rand(2, 12);
      const b = rand(2, 12);
      grid[r] = [a, b, a + b];
    }
    rule = 'Each row: the third cell is the sum of the first two.';
  } else if (kind === 'rowProduct') {
    for (let r = 0; r < 3; r++) {
      const a = rand(2, 7);
      const b = rand(2, 7);
      grid[r] = [a, b, a * b];
    }
    rule = 'Each row: the third cell is the product of the first two.';
  } else if (kind === 'columnSum') {
    for (let c = 0; c < 3; c++) {
      const a = rand(2, 14);
      const b = rand(2, 14);
      grid[0][c] = a;
      grid[1][c] = b;
      grid[2][c] = a + b;
    }
    rule = 'Each column: the bottom cell is the sum of the two above.';
  } else if (kind === 'rowStep') {
    const step = rand(2, 6);
    for (let r = 0; r < 3; r++) {
      const start = rand(1, 15);
      grid[r] = [start, start + step, start + step * 2];
    }
    rule = `Each row grows by ${step}.`;
  } else {
    const ratio = pick([2, 3]);
    for (let r = 0; r < 3; r++) {
      const start = rand(1, 6);
      grid[r] = [start, start * ratio, start * ratio * ratio];
    }
    rule = `Each row is multiplied by ${ratio}.`;
  }

  const hiddenRow = rand(0, 2);
  const hiddenCol = rand(0, 2);
  const answer = grid[hiddenRow][hiddenCol];
  const choices = new Set([answer]);
  while (choices.size < 4) {
    const delta = rand(1, Math.max(4, Math.round(Math.abs(answer) * 0.18))) * (Math.random() > 0.5 ? 1 : -1);
    const candidate = answer + delta;
    if (candidate >= 0 && candidate !== answer) choices.add(candidate);
  }

  return {
    grid,
    hiddenRow,
    hiddenCol,
    answer,
    rule,
    choices: shuffle([...choices])
  };
}

export default {
  id: 'pattern-matrix',
  mount(root, ctx) {
    const finish = finishOnce(ctx);
    let running = true;
    let correct = 0;
    let total = 0;
    let puzzle = null;
    let choices = [];

    root.innerHTML = `
      <div class="g-wrap">
        <div class="g-head">
          <span class="g-kicker">Matrix Logic · 10 matrices</span>
          <span class="g-timer" id="pm-timer">1:30</span>
        </div>
        <div class="g-panel">
          <p class="g-sub" id="pm-rule">Infer the hidden rule. One cell is missing.</p>
          <div class="g-matrix" id="pm-grid" style="margin-top:18px"></div>
          <div class="g-choices" id="pm-choices"></div>
          <div class="g-feedback" id="pm-feedback">Which value belongs in the blank?</div>
        </div>
      </div>`;

    const gridRoot = root.querySelector('#pm-grid');
    const choicesRoot = root.querySelector('#pm-choices');
    const feedback = root.querySelector('#pm-feedback');
    const timerNode = root.querySelector('#pm-timer');

    function next() {
      if (total >= 10) { end('complete'); return; }
      puzzle = buildPuzzle();
      ctx.setStatus(`Matrix ${Math.min(total + 1, 10)} / 10`);
      gridRoot.innerHTML = '';
      puzzle.grid.forEach((row, r) => {
        row.forEach((value, c) => {
          const cell = document.createElement('div');
          cell.className = 'g-matrix-cell';
          if (r === puzzle.hiddenRow && c === puzzle.hiddenCol) {
            cell.classList.add('is-blank');
            cell.textContent = '?';
          } else {
            cell.textContent = value;
          }
          gridRoot.appendChild(cell);
        });
      });
      choices = makeChoices(choicesRoot, puzzle.choices, (value, button) => answer(value, button));
      feedback.textContent = 'Which value belongs in the blank?';
      feedback.className = 'g-feedback';
    }

    function answer(value, button) {
      if (!running) return;
      lockChoices(choices);
      total += 1;
      const good = value === puzzle.answer;
      choices.forEach((node) => {
        const valueNode = node.querySelector('span:last-child');
        if (Number(valueNode?.textContent) === puzzle.answer) node.classList.add('is-correct');
      });
      if (good) {
        correct += 1;
        feedback.textContent = puzzle.rule;
        feedback.className = 'g-feedback is-good';
        ctx.setScore(correct);
      } else {
        button.classList.add('is-wrong');
        feedback.textContent = `${puzzle.rule} Answer: ${puzzle.answer}`;
        feedback.className = 'g-feedback is-bad';
      }
      setTimeout(() => { if (running) next(); }, good ? 520 : 980);
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
        headline: correct >= 8 ? 'Rule reader.' : correct >= 5 ? 'The pattern is visible.' : 'Matrix logic logged.'
      });
    }

    const timer = createTimer(90, {
      onTick: (remaining) => {
        timerNode.textContent = formatSeconds(remaining);
        timerNode.classList.toggle('is-low', remaining <= 12);
        ctx.setProgress((10 - Math.min(10, total)) / 10);
      },
      onEnd: () => end('time')
    });

    ctx.onCleanup(() => timer.stop());
    ctx.setScore(0);
    next();
  }
};
