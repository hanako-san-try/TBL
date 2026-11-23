import {
  createTimer, finishOnce, formatSeconds, frac, fracAdd, fracSub, fracMul, fracDiv,
  fracEq, fracLabel, make24Set, rand
} from './_kit.js';

export default {
  id: 'twenty-four',
  mount(root, ctx) {
    const finish = finishOnce(ctx);
    let running = true;
    let elapsed = 0;
    let tiles = [];
    let selected = [];
    let history = [];
    let moves = 0;
    let nextId = 1;

    root.innerHTML = `
      <div class="g-wrap">
        <div class="g-head">
          <span class="g-kicker">Twenty-Four · combine four numbers</span>
          <span class="g-timer" id="tf-timer">3:00</span>
        </div>
        <div class="g-panel">
          <p class="g-sub">Select two tiles, choose an operation, and combine. Reach exactly 24.</p>
          <div class="g-24-board" id="tf-board"></div>
          <div class="g-24-ops" id="tf-ops">
            <button class="g-24-op" data-op="+" type="button" aria-label="Add">+</button>
            <button class="g-24-op" data-op="−" type="button" aria-label="Subtract">−</button>
            <button class="g-24-op" data-op="×" type="button" aria-label="Multiply">×</button>
            <button class="g-24-op" data-op="÷" type="button" aria-label="Divide">÷</button>
          </div>
          <div class="g-actions">
            <button class="v-btn v-btn-sm" id="tf-undo" type="button">Undo</button>
            <button class="v-btn v-btn-sm" id="tf-new" type="button">New set</button>
          </div>
          <div class="g-feedback" id="tf-feedback">Pick two tiles to begin.</div>
        </div>
      </div>`;

    const board = root.querySelector('#tf-board');
    const feedback = root.querySelector('#tf-feedback');
    const timerNode = root.querySelector('#tf-timer');
    const undoButton = root.querySelector('#tf-undo');

    function resetTiles(numbers) {
      tiles = numbers.map((value) => ({ id: nextId++, value: frac(value, 1) }));
      selected = [];
      history = [];
      moves = 0;
      feedback.textContent = 'Pick two tiles to begin.';
      feedback.className = 'g-feedback';
      render();
    }

    function newSet() {
      if (!running) return;
      resetTiles(make24Set());
    }

    function render() {
      board.innerHTML = '';
      tiles.forEach((tile) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'g-24-tile' + (selected.includes(tile.id) ? ' is-selected' : '');
        button.textContent = fracLabel(tile.value);
        button.setAttribute('aria-label', `Tile ${fracLabel(tile.value)}`);
        button.addEventListener('click', () => {
          if (!running) return;
          if (selected.includes(tile.id)) {
            selected = selected.filter((id) => id !== tile.id);
          } else if (selected.length < 2) {
            selected.push(tile.id);
          } else {
            selected = [selected[1], tile.id];
          }
          render();
        });
        board.appendChild(button);
      });
      undoButton.disabled = history.length === 0 || !running;
    }

    function combine(op) {
      if (!running || selected.length !== 2) {
        feedback.textContent = 'Select exactly two tiles first.';
        feedback.className = 'g-feedback is-bad';
        return;
      }
      const first = tiles.find((tile) => tile.id === selected[0]);
      const second = tiles.find((tile) => tile.id === selected[1]);
      let result = null;
      if (op === '+') result = fracAdd(first.value, second.value);
      if (op === '−') result = fracSub(first.value, second.value);
      if (op === '×') result = fracMul(first.value, second.value);
      if (op === '÷') result = fracDiv(first.value, second.value);

      if (!result || result.n < 0) {
        feedback.textContent = op === '÷' ? 'Cannot divide by zero.' : 'That result goes negative. Try another order.';
        feedback.className = 'g-feedback is-bad';
        return;
      }

      history.push(tiles.map((tile) => ({ ...tile, value: { ...tile.value } })));
      const remaining = tiles.filter((tile) => tile.id !== selected[0] && tile.id !== selected[1]);
      tiles = [...remaining, { id: nextId++, value: result }];
      selected = [];
      moves += 1;
      feedback.textContent = `${fracLabel(first.value)} ${op} ${fracLabel(second.value)} = ${fracLabel(result)}`;
      feedback.className = 'g-feedback';
      render();

      if (tiles.length === 1 && fracEq(tiles[0].value, frac(24, 1))) {
        running = false;
        timer.stop();
        const score = Math.max(30, 220 - moves * 8 - Math.round(elapsed));
        ctx.setScore(score);
        feedback.textContent = 'Exactly 24. Clean work.';
        feedback.className = 'g-feedback is-good';
        setTimeout(() => finish({
          score,
          correct: 1,
          total: 1,
          label: 'points',
          detail: `${moves} move${moves === 1 ? '' : 's'} · ${formatSeconds(elapsed)}`,
          headline: 'Twenty-four.'
        }), 650);
      } else if (tiles.length === 1) {
        feedback.textContent = `That leaves ${fracLabel(tiles[0].value)}. Undo or start a new set.`;
        feedback.className = 'g-feedback is-bad';
      }
    }

    function undo() {
      if (!running || !history.length) return;
      tiles = history.pop();
      selected = [];
      moves = Math.max(0, moves - 1);
      feedback.textContent = 'Move undone.';
      feedback.className = 'g-feedback';
      render();
    }

    function end() {
      if (!running) return;
      running = false;
      timer.stop();
      finish({
        score: 0,
        correct: 0,
        total: 1,
        label: 'points',
        detail: 'Time expired',
        headline: 'No 24 this time.'
      });
    }

    const timer = createTimer(180, {
      onTick: (remaining) => {
        elapsed = 180 - remaining;
        timerNode.textContent = formatSeconds(remaining);
        timerNode.classList.toggle('is-low', remaining <= 20);
        ctx.setProgress(elapsed / 180);
      },
      onEnd: end
    });

    root.querySelectorAll('[data-op]').forEach((button) => {
      button.addEventListener('click', () => combine(button.dataset.op));
    });
    undoButton.addEventListener('click', undo);
    root.querySelector('#tf-new').addEventListener('click', newSet);

    ctx.onCleanup(() => timer.stop());
    ctx.setScore(0);
    ctx.setStatus('Solve');
    resetTiles(make24Set());
  }
};
