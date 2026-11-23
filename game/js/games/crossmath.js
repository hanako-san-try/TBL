import { createTimer, finishOnce, formatSeconds, pick, rand, shuffle } from './_kit.js';

const apply = (a, op, b) => (op === '×' ? a * b : a + b);

export default {
  id: 'crossmath',
  mount(root, ctx) {
    const finish = finishOnce(ctx);
    let running = true;
    let attempts = 0;
    let elapsed = 0;
    let grid = [];
    let rowOps = [];
    let colOps = [];
    let rowResults = [];
    let colResults = [];
    let hidden = new Set();
    let inputs = [];

    root.innerHTML = `
      <div class="g-wrap">
        <div class="g-head">
          <span class="g-kicker">CrossMath · fill the blanks</span>
          <span class="g-timer" id="cm-timer">2:00</span>
        </div>
        <div class="g-panel">
          <p class="g-sub">Every row and column must satisfy its equation. Use + and × only.</p>
          <div class="g-cross" id="cm-grid" style="margin-top:18px"></div>
          <div class="g-feedback" id="cm-feedback">Three blanks. Six equations. Take your time.</div>
          <div class="g-actions">
            <button class="v-btn v-btn-signal v-btn-sm" id="cm-check" type="button">Check grid</button>
            <button class="v-btn v-btn-sm" id="cm-new" type="button">New puzzle</button>
          </div>
        </div>
      </div>`;

    const gridRoot = root.querySelector('#cm-grid');
    const feedback = root.querySelector('#cm-feedback');
    const timerNode = root.querySelector('#cm-timer');

    function build() {
      grid = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => rand(2, 9)));
      rowOps = Array.from({ length: 3 }, () => pick(['+', '×']));
      colOps = Array.from({ length: 3 }, () => pick(['+', '×']));
      rowResults = grid.map((row, r) => apply(apply(row[0], rowOps[r], row[1]), rowOps[r], row[2]));
      colResults = [0, 1, 2].map((c) => apply(apply(grid[0][c], colOps[c], grid[1][c]), colOps[c], grid[2][c]));
      hidden = new Set(shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 3));
      attempts = 0;
      inputs = [];
      feedback.textContent = 'Three blanks. Six equations. Take your time.';
      feedback.className = 'g-feedback';
      render();
    }

    function render() {
      gridRoot.innerHTML = '';
      for (let r = 0; r < 3; r++) {
        const row = document.createElement('div');
        row.className = 'g-cross-row';
        for (let c = 0; c < 3; c++) {
          const index = r * 3 + c;
          if (hidden.has(index)) {
            const input = document.createElement('input');
            input.type = 'number';
            input.inputMode = 'numeric';
            input.min = '0';
            input.setAttribute('aria-label', `Row ${r + 1} column ${c + 1}`);
            input.dataset.index = String(index);
            inputs.push(input);
            row.appendChild(input);
          } else {
            const cell = document.createElement('div');
            cell.className = 'g-cross-cell';
            cell.textContent = grid[r][c];
            row.appendChild(cell);
          }
          if (c < 2) {
            const op = document.createElement('div');
            op.className = 'g-cross-cell is-op';
            op.textContent = rowOps[r];
            row.appendChild(op);
          }
        }
        const eq = document.createElement('div');
        eq.className = 'g-cross-cell is-eq';
        eq.textContent = '=';
        row.appendChild(eq);
        const result = document.createElement('div');
        result.className = 'g-cross-cell is-result';
        result.textContent = rowResults[r];
        row.appendChild(result);
        gridRoot.appendChild(row);
      }

      const bottom = document.createElement('div');
      bottom.className = 'g-cross-row is-result';
      [0, 1, 2].forEach((c, index) => {
        const result = document.createElement('div');
        result.className = 'g-cross-cell is-result';
        result.textContent = colResults[c];
        bottom.appendChild(result);
        if (index < 2) {
          bottom.appendChild(document.createElement('div'));
        }
      });
      bottom.appendChild(document.createElement('div'));
      bottom.appendChild(document.createElement('div'));
      gridRoot.appendChild(bottom);
    }

    function currentGrid() {
      const values = grid.map((row) => [...row]);
      inputs.forEach((input) => {
        const index = Number(input.dataset.index);
        const value = Number(input.value);
        if (input.value !== '' && Number.isFinite(value)) {
          values[Math.floor(index / 3)][index % 3] = value;
        }
      });
      return values;
    }

    function check() {
      if (!running) return;
      const values = currentGrid();
      if (inputs.some((input) => input.value === '')) {
        feedback.textContent = 'Fill all three blanks first.';
        feedback.className = 'g-feedback is-bad';
        return;
      }
      const rowOk = values.every((row, r) => apply(apply(row[0], rowOps[r], row[1]), rowOps[r], row[2]) === rowResults[r]);
      const colOk = [0, 1, 2].every((c) => apply(apply(values[0][c], colOps[c], values[1][c]), colOps[c], values[2][c]) === colResults[c]);
      inputs.forEach((input) => {
        input.classList.toggle('is-ok', rowOk && colOk);
        input.classList.toggle('is-bad', !(rowOk && colOk));
      });

      if (rowOk && colOk) {
        running = false;
        timer.stop();
        inputs.forEach((input) => { input.disabled = true; });
        const score = Math.max(20, 160 - attempts * 18 - Math.round(elapsed));
        feedback.textContent = 'All six equations hold.';
        feedback.className = 'g-feedback is-good';
        ctx.setScore(score);
        setTimeout(() => finish({
          score,
          correct: 1,
          total: 1,
          label: 'points',
          detail: attempts === 0 ? 'First-try solve' : `${attempts} correction${attempts === 1 ? '' : 's'}`,
          headline: attempts === 0 ? 'Clean constraint work.' : 'Solved.'
        }), 650);
        return;
      }

      attempts += 1;
      feedback.textContent = attempts >= 3
        ? 'Three misses. Here is the grid — take the lesson into the next one.'
        : `Not yet. ${3 - attempts} attempt${3 - attempts === 1 ? '' : 's'} left.`;
      feedback.className = 'g-feedback is-bad';

      if (attempts >= 3) {
        running = false;
        timer.stop();
        inputs.forEach((input) => {
          const index = Number(input.dataset.index);
          input.value = String(grid[Math.floor(index / 3)][index % 3]);
          input.disabled = true;
          input.classList.remove('is-bad');
          input.classList.add('is-ok');
        });
        ctx.setScore(10);
        setTimeout(() => finish({
          score: 10,
          correct: 0,
          total: 1,
          label: 'points',
          detail: 'Solution revealed',
          headline: 'The grid wins this one.'
        }), 1100);
      }
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
        headline: 'The clock got there first.'
      });
    }

    const timer = createTimer(120, {
      onTick: (remaining) => {
        elapsed = 120 - remaining;
        timerNode.textContent = formatSeconds(remaining);
        timerNode.classList.toggle('is-low', remaining <= 15);
        ctx.setProgress(elapsed / 120);
      },
      onEnd: end
    });

    root.querySelector('#cm-check').addEventListener('click', check);
    root.querySelector('#cm-new').addEventListener('click', () => {
      if (!running) return;
      build();
    });

    ctx.onCleanup(() => timer.stop());
    ctx.setScore(0);
    ctx.setStatus('Puzzle 1');
    build();
  }
};
