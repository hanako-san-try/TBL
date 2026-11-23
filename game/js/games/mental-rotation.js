import { createTimer, finishOnce, formatSeconds, pick, shuffle } from './_kit.js';

const SHAPES = [
  [[0, 0], [1, 0], [2, 0], [0, 1]],
  [[0, 0], [1, 0], [2, 0], [1, 1]],
  [[0, 0], [1, 0], [1, 1], [2, 1]],
  [[0, 0], [0, 1], [1, 1], [1, 2]],
  [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],
  [[0, 0], [1, 0], [1, 1], [1, 2]],
  [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1]]
];

function normalize(cells) {
  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  return cells.map(([x, y]) => [x - minX, y - minY]);
}

function transform(cells, turns = 0, mirror = false) {
  let out = cells.map(([x, y]) => (mirror ? [-x, y] : [x, y]));
  for (let i = 0; i < turns; i++) {
    out = out.map(([x, y]) => [-y, x]);
  }
  return normalize(out);
}

function keyOf(cells) {
  return normalize(cells).map(([x, y]) => `${x},${y}`).sort().join('|');
}

function rotationClass(cells) {
  const keys = new Set();
  for (let turn = 0; turn < 4; turn += 1) keys.add(keyOf(transform(cells, turn, false)));
  return keys;
}

function buildCandidates() {
  const pool = [];
  for (const shape of SHAPES) {
    for (const mirror of [false, true]) {
      for (let turn = 0; turn < 4; turn += 1) {
        pool.push(transform(shape, turn, mirror));
      }
    }
  }
  return shuffle(pool);
}

function buildPuzzle() {
  const base = pick(SHAPES);
  const correct = transform(base, pick([1, 2, 3]), false);
  const correctClass = rotationClass(correct);
  const used = new Set([keyOf(correct)]);

  // Decoys must never be a rotation of the correct answer or of each other,
  // otherwise more than one option would be a valid "same shape rotated".
  const decoyPool = buildCandidates().filter((candidate) => {
    const key = keyOf(candidate);
    return !used.has(key) && ![...rotationClass(candidate)].some((rotated) => correctClass.has(rotated));
  });

  const options = [{ cells: correct, correct: true }];
  for (const candidate of decoyPool) {
    if (options.length >= 4) break;
    const key = keyOf(candidate);
    if (used.has(key)) continue;
    used.add(key);
    options.push({ cells: candidate, correct: false });
  }

  return { source: normalize(base), options: shuffle(options) };
}

function drawShape(container, cells, size = 4) {
  container.innerHTML = '';
  const norm = normalize(cells);
  const maxX = Math.max(...norm.map(([x]) => x));
  const maxY = Math.max(...norm.map(([, y]) => y));
  const offsetX = Math.max(0, Math.floor((size - (maxX + 1)) / 2));
  const offsetY = Math.max(0, Math.floor((size - (maxY + 1)) / 2));
  const filled = new Set(norm.map(([x, y]) => `${x + offsetX},${y + offsetY}`));
  container.style.setProperty('--size', size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cell = document.createElement('span');
      cell.className = 'g-rotate-cell';
      if (filled.has(`${x},${y}`)) cell.classList.add('is-filled');
      container.appendChild(cell);
    }
  }
}

export default {
  id: 'mental-rotation',
  mount(root, ctx) {
    const finish = finishOnce(ctx);
    let running = true;
    let correct = 0;
    let total = 0;
    let puzzle = null;
    let optionButtons = [];

    root.innerHTML = `
      <div class="g-wrap">
        <div class="g-head">
          <span class="g-kicker">Mental Rotation · 10 shapes</span>
          <span class="g-timer" id="mr-timer">1:30</span>
        </div>
        <div class="g-panel">
          <p class="g-sub">Which option is the same shape rotated — not mirrored or altered?</p>
          <div class="g-rotate-source">
            <span class="g-kicker">This shape</span>
            <div class="g-rotate-board" id="mr-source"></div>
          </div>
          <div class="g-rotate-options" id="mr-options"></div>
          <div class="g-feedback" id="mr-feedback">Rotate it in your head. Then choose.</div>
        </div>
      </div>`;

    const sourceNode = root.querySelector('#mr-source');
    const optionsRoot = root.querySelector('#mr-options');
    const feedback = root.querySelector('#mr-feedback');
    const timerNode = root.querySelector('#mr-timer');

    function next() {
      if (total >= 10) { end('complete'); return; }
      puzzle = buildPuzzle();
      ctx.setStatus(`Shape ${Math.min(total + 1, 10)} / 10`);
      drawShape(sourceNode, puzzle.source);
      optionsRoot.innerHTML = '';
      optionButtons = puzzle.options.map((option, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'g-rotate-option';
        const board = document.createElement('span');
        board.className = 'g-rotate-board';
        drawShape(board, option.cells);
        const label = document.createElement('span');
        label.className = 'g-rotate-label';
        label.textContent = String.fromCharCode(65 + index);
        button.appendChild(board);
        button.appendChild(label);
        button.addEventListener('click', () => answer(option, button));
        optionsRoot.appendChild(button);
        return button;
      });
      feedback.textContent = 'Rotate it in your head. Then choose.';
      feedback.className = 'g-feedback';
    }

    function answer(option, button) {
      if (!running) return;
      optionButtons.forEach((node) => { node.disabled = true; });
      total += 1;
      if (option.correct) {
        correct += 1;
        button.classList.add('is-ok');
        feedback.textContent = 'Correct. Same shape, different angle.';
        feedback.className = 'g-feedback is-good';
        ctx.setScore(correct);
      } else {
        button.classList.add('is-bad');
        const right = optionButtons[puzzle.options.findIndex((item) => item.correct)];
        if (right) right.classList.add('is-ok');
        feedback.textContent = 'That one is mirrored or altered.';
        feedback.className = 'g-feedback is-bad';
      }
      setTimeout(() => { if (running) next(); }, option.correct ? 480 : 1000);
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
        headline: correct >= 8 ? 'Spatial rotation locked.' : correct >= 5 ? 'The angle is readable.' : 'Rotation takes reps.'
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
