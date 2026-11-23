import { createTimer, finishOnce, formatSeconds } from './_kit.js';

const SIZE = 8;
const LEVELS = [
  {
    emitter: { x: 0, y: 3, dir: 'R' },
    target: { x: 7, y: 1 },
    mirrors: [
      { x: 3, y: 3, orient: '/' },
      { x: 3, y: 1, orient: '/' }
    ],
    walls: []
  },
  {
    emitter: { x: 0, y: 6, dir: 'R' },
    target: { x: 5, y: 2 },
    mirrors: [
      { x: 3, y: 6, orient: '/' },
      { x: 3, y: 3, orient: '/' },
      { x: 5, y: 3, orient: '/' }
    ],
    walls: []
  },
  {
    emitter: { x: 0, y: 1, dir: 'R' },
    target: { x: 7, y: 6 },
    mirrors: [
      { x: 2, y: 1, orient: '\\' },
      { x: 2, y: 4, orient: '\\' },
      { x: 5, y: 4, orient: '\\' },
      { x: 5, y: 6, orient: '\\' }
    ],
    walls: []
  }
];

const DIRECTIONS = {
  R: { x: 1, y: 0 },
  L: { x: -1, y: 0 },
  U: { x: 0, y: -1 },
  D: { x: 0, y: 1 }
};

const REFLECT = {
  '/': { R: 'U', U: 'R', L: 'D', D: 'L' },
  '\\': { R: 'D', D: 'R', L: 'U', U: 'L' }
};

const key = (x, y) => `${x},${y}`;

export default {
  id: 'lightpath',
  mount(root, ctx) {
    const finish = finishOnce(ctx);
    let running = true;
    let levelIndex = 0;
    let level = null;
    let solved = 0;
    let points = 0;
    let locked = false;
    let timers = [];

    root.innerHTML = `
      <div class="g-wrap">
        <div class="g-head">
          <span class="g-kicker" id="lp-kicker">Photon Lock · level 1 / 3</span>
          <span class="g-timer" id="lp-timer">2:00</span>
        </div>
        <div class="g-panel">
          <p class="g-sub" id="lp-hint">Rotate the mirrors so the beam reaches the target.</p>
          <div class="g-light-wrap">
            <div class="g-light-grid" id="lp-grid"></div>
            <div class="g-light-legend">
              <span>◉ emitter</span>
              <span>◎ target</span>
              <span>╱ ╲ rotatable mirror</span>
              <span>· beam</span>
            </div>
          </div>
          <div class="g-feedback" id="lp-feedback">Click a mirror to rotate it 90°.</div>
          <div class="g-actions">
            <button class="v-btn v-btn-sm" id="lp-reset" type="button">Reset level</button>
          </div>
        </div>
      </div>`;

    const grid = root.querySelector('#lp-grid');
    const feedback = root.querySelector('#lp-feedback');
    const timerNode = root.querySelector('#lp-timer');
    const kicker = root.querySelector('#lp-kicker');

    const later = (fn, delay) => {
      const id = setTimeout(fn, delay);
      timers.push(id);
      return id;
    };

    function mirrorAt(x, y) {
      return level.mirrors.find((mirror) => mirror.x === x && mirror.y === y) || null;
    }

    function wallAt(x, y) {
      return level.walls.some((wall) => wall.x === x && wall.y === y);
    }

    function computeBeam() {
      const beam = new Set([key(level.emitter.x, level.emitter.y)]);
      let x = level.emitter.x;
      let y = level.emitter.y;
      let dir = level.emitter.dir;
      let hit = false;

      for (let step = 0; step < 240; step++) {
        const move = DIRECTIONS[dir];
        x += move.x;
        y += move.y;
        if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) break;
        beam.add(key(x, y));
        if (wallAt(x, y)) break;
        if (x === level.target.x && y === level.target.y) { hit = true; break; }
        const mirror = mirrorAt(x, y);
        if (mirror) dir = REFLECT[mirror.orient][dir];
      }
      return { beam, hit };
    }

    function render() {
      const { beam, hit } = computeBeam();
      grid.innerHTML = '';
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const cell = document.createElement('button');
          cell.type = 'button';
          cell.className = 'g-light-cell';
          cell.dataset.x = String(x);
          cell.dataset.y = String(y);
          const isEmitter = x === level.emitter.x && y === level.emitter.y;
          const isTarget = x === level.target.x && y === level.target.y;
          const mirror = mirrorAt(x, y);
          const isWall = wallAt(x, y);

          if (beam.has(key(x, y))) cell.classList.add('is-beam');
          if (isWall) cell.classList.add('is-wall');
          if (mirror) cell.classList.add('is-mirror');
          if (isEmitter) cell.classList.add('is-emitter');
          if (isTarget) cell.classList.add('is-target');
          if (isTarget && hit) cell.classList.add('is-hit');

          if (isEmitter) cell.textContent = level.emitter.dir === 'R' ? '◉' : '◉';
          else if (isTarget) cell.textContent = '◎';
          else if (isWall) cell.textContent = '';
          else if (mirror) cell.textContent = mirror.orient === '/' ? '╱' : '╲';
          else if (beam.has(key(x, y))) cell.textContent = '·';

          if (mirror) {
            cell.setAttribute('aria-label', `Mirror ${mirror.orient === '/' ? 'slash' : 'backslash'} at column ${x + 1}, row ${y + 1}. Activate to rotate.`);
            cell.addEventListener('click', () => toggle(mirror));
          } else {
            cell.disabled = true;
            cell.setAttribute('aria-label', `Cell column ${x + 1}, row ${y + 1}`);
          }
          grid.appendChild(cell);
        }
      }
    }

    function toggle(mirror) {
      if (!running || locked) return;
      mirror.orient = mirror.orient === '/' ? '\\' : '/';
      const { hit } = computeBeam();
      render();
      if (hit) {
        locked = true;
        solved += 1;
        points += 120;
        ctx.setScore(points);
        ctx.setProgress(solved / LEVELS.length);
        feedback.textContent = 'Target locked. Beam routed.';
        feedback.className = 'g-feedback is-good';
        later(() => {
          if (!running) return;
          if (levelIndex >= LEVELS.length - 1) end('complete');
          else loadLevel(levelIndex + 1);
        }, 1000);
      } else {
        feedback.textContent = 'Mirror rotated. Follow the beam.';
        feedback.className = 'g-feedback';
      }
    }

    function loadLevel(index) {
      levelIndex = index;
      level = {
        emitter: { ...LEVELS[index].emitter },
        target: { ...LEVELS[index].target },
        mirrors: LEVELS[index].mirrors.map((mirror) => ({ ...mirror })),
        walls: LEVELS[index].walls.map((wall) => ({ ...wall }))
      };
      locked = false;
      kicker.textContent = `Photon Lock · level ${index + 1} / ${LEVELS.length}`;
      ctx.setStatus(`Level ${index + 1} / ${LEVELS.length}`);

      // Randomise until the puzzle is not already solved.
      level.mirrors.forEach((mirror) => {
        mirror.orient = Math.random() > 0.5 ? '/' : '\\';
      });
      let guard = 0;
      while (computeBeam().hit && guard < 12) {
        const mirror = level.mirrors[guard % level.mirrors.length];
        mirror.orient = mirror.orient === '/' ? '\\' : '/';
        guard += 1;
      }

      feedback.textContent = 'Click a mirror to rotate it 90°.';
      feedback.className = 'g-feedback';
      render();
    }

    function resetLevel() {
      if (!running || locked) return;
      loadLevel(levelIndex);
    }

    function end(reason) {
      if (!running) return;
      running = false;
      timer.stop();
      timers.forEach(clearTimeout);
      finish({
        score: points,
        correct: solved,
        total: LEVELS.length,
        label: 'points',
        detail: `${solved}/${LEVELS.length} levels · ${reason === 'complete' ? 'all beams routed' : 'time expired'}`,
        headline: solved === LEVELS.length ? 'Optics solved.' : solved >= 2 ? 'Two beams down.' : 'Light follows rules.'
      });
    }

    const timer = createTimer(120, {
      onTick: (remaining) => {
        timerNode.textContent = formatSeconds(remaining);
        timerNode.classList.toggle('is-low', remaining <= 15);
      },
      onEnd: () => end('time')
    });

    root.querySelector('#lp-reset').addEventListener('click', resetLevel);
    ctx.onCleanup(() => {
      running = false;
      timer.stop();
      timers.forEach(clearTimeout);
    });

    ctx.setScore(0);
    ctx.setProgress(0);
    loadLevel(0);
  }
};
