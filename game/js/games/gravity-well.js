import { createTimer, finishOnce, formatSeconds } from './_kit.js';

const LEVELS = [
  { star: { x: 0.5, y: 0.5 }, target: { x: 0.84, y: 0.5 } },
  { star: { x: 0.5, y: 0.56 }, target: { x: 0.82, y: 0.2 } },
  { star: { x: 0.55, y: 0.48 }, target: { x: 0.85, y: 0.78 } },
  { star: { x: 0.46, y: 0.42 }, target: { x: 0.87, y: 0.62 } },
  { star: { x: 0.52, y: 0.52 }, target: { x: 0.88, y: 0.16 } }
];

export default {
  id: 'gravity-well',
  mount(root, ctx) {
    const finish = finishOnce(ctx);
    let running = true;
    let raf = null;
    let timer = null;
    let observer = null;
    let last = 0;
    let w = 800;
    let h = 450;
    let levelIndex = 0;
    let level = LEVELS[0];
    let attempts = 3;
    let points = 0;
    let state = 'aim';
    let dragging = false;
    let pointer = { x: 0, y: 0 };
    let transition = null;
    let trail = [];
    let flash = 0;

    root.innerHTML = `
      <div class="g-wrap">
        <div class="g-head">
          <span class="g-kicker" id="gw-kicker">Gravity Well · level 1 / 5</span>
          <span class="g-timer" id="gw-timer">3:00</span>
        </div>
        <div class="g-panel" style="padding:0;overflow:hidden">
          <div class="g-gravity-wrap" id="gw-wrap" style="aspect-ratio:16/9">
            <canvas id="gw-canvas" aria-label="Gravity Well launch field"></canvas>
            <div class="g-gravity-overlay">
              <span id="gw-level">Level 1</span> · <span id="gw-attempts">3 attempts</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-top:1px solid var(--v-line);flex-wrap:wrap">
            <span class="g-status" id="gw-feedback">Drag from the probe and release to launch.</span>
            <button class="v-btn v-btn-sm" id="gw-reset" type="button">Reset probe</button>
          </div>
        </div>
      </div>`;

    const wrap = root.querySelector('#gw-wrap');
    const canvas = root.querySelector('#gw-canvas');
    const g = canvas.getContext('2d');
    const timerNode = root.querySelector('#gw-timer');
    const kicker = root.querySelector('#gw-kicker');
    const levelNode = root.querySelector('#gw-level');
    const attemptsNode = root.querySelector('#gw-attempts');
    const feedback = root.querySelector('#gw-feedback');

    const star = { x: 0, y: 0, r: 26 };
    const target = { x: 0, y: 0, r: 20 };
    const probe = { x: 0, y: 0, vx: 0, vy: 0, r: 8 };
    let probeStart = { x: 0, y: 0 };

    const gravity = () => 5.2e6 * (w / 900);

    function layout() {
      star.x = level.star.x * w;
      star.y = level.star.y * h;
      target.x = level.target.x * w;
      target.y = level.target.y * h;
      probeStart = { x: w * 0.13, y: h * 0.5 };
      if (state === 'aim') {
        probe.x = probeStart.x;
        probe.y = probeStart.y;
        probe.vx = 0;
        probe.vy = 0;
      }
    }

    function resize() {
      const rect = wrap.getBoundingClientRect();
      const oldW = w;
      const oldH = h;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(300, rect.width);
      h = Math.max(180, rect.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (oldW > 0 && oldH > 0 && state === 'flight') {
        const sx = w / oldW;
        const sy = h / oldH;
        probe.x *= sx;
        probe.y *= sy;
        probe.vx *= sx;
        probe.vy *= sy;
        trail = trail.map((point) => ({ x: point.x * sx, y: point.y * sy }));
      }
      layout();
    }

    function updateHud() {
      levelNode.textContent = `Level ${levelIndex + 1}`;
      attemptsNode.textContent = `${attempts} ${attempts === 1 ? 'attempt' : 'attempts'}`;
      kicker.textContent = `Gravity Well · level ${levelIndex + 1} / ${LEVELS.length}`;
      ctx.setStatus(`Level ${levelIndex + 1} / ${LEVELS.length}`);
    }

    function resetProbe(message) {
      if (!running) return;
      state = 'aim';
      dragging = false;
      trail = [];
      probe.x = probeStart.x;
      probe.y = probeStart.y;
      probe.vx = 0;
      probe.vy = 0;
      if (message) feedback.textContent = message;
      updateHud();
    }

    function levelComplete() {
      if (transition) return;
      state = 'won';
      points += 100;
      ctx.setScore(points);
      ctx.setProgress((levelIndex + 1) / LEVELS.length);
      feedback.textContent = 'Target reached. Gravity obeyed.';
      flash = 1;
      transition = setTimeout(() => {
        transition = null;
        if (!running) return;
        if (levelIndex >= LEVELS.length - 1) end('complete');
        else {
          levelIndex += 1;
          level = LEVELS[levelIndex];
          attempts = 3;
          resetProbe('New field. Drag from the probe.');
          ctx.setProgress(levelIndex / LEVELS.length);
        }
      }, 1000);
    }

    function miss(reason) {
      if (state !== 'flight') return;
      attempts -= 1;
      updateHud();
      if (attempts <= 0) {
        state = 'wait';
        feedback.textContent = reason === 'star' ? 'The star swallowed it. Level skipped.' : 'Lost in space. Level skipped.';
        transition = setTimeout(() => {
          transition = null;
          if (!running) return;
          if (levelIndex >= LEVELS.length - 1) end('attempts');
          else {
            levelIndex += 1;
            level = LEVELS[levelIndex];
            attempts = 3;
            resetProbe('Next field. Three attempts.');
          }
        }, 1200);
      } else {
        resetProbe(reason === 'star' ? `Star impact. ${attempts} ${attempts === 1 ? 'attempt' : 'attempts'} left.` : `Out of bounds. ${attempts} ${attempts === 1 ? 'attempt' : 'attempts'} left.`);
      }
    }

    function launch() {
      if (state !== 'aim' || !dragging) return;
      const dx = probe.x - pointer.x;
      const dy = probe.y - pointer.y;
      const distance = Math.hypot(dx, dy);
      dragging = false;
      if (distance < 10) return;
      const scale = 3.1;
      const cap = 430 * (w / 900);
      probe.vx = Math.max(-cap, Math.min(cap, dx * scale));
      probe.vy = Math.max(-cap, Math.min(cap, dy * scale));
      state = 'flight';
      trail = [];
      feedback.textContent = 'In flight…';
    }

    function step(dt) {
      const dx = star.x - probe.x;
      const dy = star.y - probe.y;
      const distSq = Math.max(dx * dx + dy * dy, 900);
      const dist = Math.sqrt(distSq);
      const accel = gravity() / distSq;
      probe.vx += (dx / dist) * accel * dt;
      probe.vy += (dy / dist) * accel * dt;
      probe.x += probe.vx * dt;
      probe.y += probe.vy * dt;

      if (Math.hypot(probe.x - target.x, probe.y - target.y) < target.r + probe.r) {
        levelComplete();
        return;
      }
      if (Math.hypot(probe.x - star.x, probe.y - star.y) < star.r + probe.r) {
        miss('star');
        return;
      }
      if (probe.x < -140 || probe.x > w + 140 || probe.y < -140 || probe.y > h + 140) {
        miss('bounds');
      }
    }

    function predict() {
      const copy = { x: probe.x, y: probe.y, vx: (probe.x - pointer.x) * 3.1, vy: (probe.y - pointer.y) * 3.1 };
      const cap = 430 * (w / 900);
      copy.vx = Math.max(-cap, Math.min(cap, copy.vx));
      copy.vy = Math.max(-cap, Math.min(cap, copy.vy));
      const points = [];
      const dt = 1 / 60;
      for (let i = 0; i < 110; i++) {
        const dx = star.x - copy.x;
        const dy = star.y - copy.y;
        const distSq = Math.max(dx * dx + dy * dy, 900);
        const dist = Math.sqrt(distSq);
        const accel = gravity() / distSq;
        copy.vx += (dx / dist) * accel * dt;
        copy.vy += (dy / dist) * accel * dt;
        copy.x += copy.vx * dt;
        copy.y += copy.vy * dt;
        points.push({ x: copy.x, y: copy.y });
        if (copy.x < 0 || copy.x > w || copy.y < 0 || copy.y > h) break;
      }
      return points;
    }

    function draw() {
      g.fillStyle = '#06060a';
      g.fillRect(0, 0, w, h);

      g.strokeStyle = 'rgba(236,232,224,0.045)';
      g.lineWidth = 1;
      for (let x = 0; x < w; x += 42) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (let y = 0; y < h; y += 42) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }

      const glow = g.createRadialGradient(star.x, star.y, 4, star.x, star.y, star.r * 4.2);
      glow.addColorStop(0, 'rgba(183,157,242,0.5)');
      glow.addColorStop(0.4, 'rgba(183,157,242,0.14)');
      glow.addColorStop(1, 'rgba(183,157,242,0)');
      g.fillStyle = glow;
      g.beginPath();
      g.arc(star.x, star.y, star.r * 4.2, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      g.fillStyle = '#b79df2';
      g.fill();

      const pulse = 1 + Math.sin(performance.now() / 420) * 0.12;
      g.beginPath();
      g.arc(target.x, target.y, target.r * pulse, 0, Math.PI * 2);
      g.fillStyle = flash > 0 ? 'rgba(215,244,90,0.35)' : 'rgba(215,244,90,0.1)';
      g.fill();
      g.strokeStyle = '#d7f45a';
      g.lineWidth = 2;
      g.stroke();
      g.beginPath();
      g.arc(target.x, target.y, target.r + 7, 0, Math.PI * 2);
      g.strokeStyle = 'rgba(215,244,90,0.3)';
      g.lineWidth = 1;
      g.stroke();

      if (state === 'aim' && dragging) {
        const preview = predict();
        g.setLineDash([3, 5]);
        g.strokeStyle = 'rgba(215,244,90,0.45)';
        g.lineWidth = 1;
        g.beginPath();
        preview.forEach((point, index) => {
          if (index === 0) g.moveTo(point.x, point.y);
          else g.lineTo(point.x, point.y);
        });
        g.stroke();
        g.setLineDash([]);
        g.strokeStyle = 'rgba(215,244,90,0.7)';
        g.beginPath();
        g.moveTo(probe.x, probe.y);
        g.lineTo(pointer.x, pointer.y);
        g.stroke();
      }

      if (trail.length > 1) {
        g.strokeStyle = 'rgba(215,244,90,0.5)';
        g.lineWidth = 1.5;
        g.beginPath();
        trail.forEach((point, index) => {
          if (index === 0) g.moveTo(point.x, point.y);
          else g.lineTo(point.x, point.y);
        });
        g.stroke();
      }

      g.beginPath();
      g.arc(probe.x, probe.y, probe.r, 0, Math.PI * 2);
      g.fillStyle = '#d7f45a';
      g.fill();
      g.beginPath();
      g.arc(probe.x, probe.y, probe.r + 5, 0, Math.PI * 2);
      g.strokeStyle = 'rgba(215,244,90,0.4)';
      g.lineWidth = 1;
      g.stroke();
    }

    function frame(now) {
      if (!running) return;
      const dt = Math.min(0.034, Math.max(0, (now - last) / 1000));
      last = now;
      flash = Math.max(0, flash - dt * 2);

      if (state === 'flight') {
        const sub = dt / 3;
        for (let i = 0; i < 3; i++) {
          step(sub);
          if (state !== 'flight') break;
        }
        if (state === 'flight') {
          trail.push({ x: probe.x, y: probe.y });
          if (trail.length > 90) trail.shift();
        }
      }

      draw();
      raf = requestAnimationFrame(frame);
    }

    function end(reason) {
      if (!running) return;
      running = false;
      if (raf) cancelAnimationFrame(raf);
      if (timer) timer.stop();
      if (transition) clearTimeout(transition);
      finish({
        score: points,
        correct: points / 100,
        total: LEVELS.length,
        label: 'points',
        detail: `${points / 100}/${LEVELS.length} fields · ${reason === 'complete' ? 'all reached' : reason === 'attempts' ? 'out of attempts' : 'time expired'}`,
        headline: points >= 500 ? 'Gravity is a tool.' : points >= 300 ? 'Trajectory sense.' : 'Physics logged.'
      });
    }

    function toLocal(event) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * w,
        y: ((event.clientY - rect.top) / rect.height) * h
      };
    }

    function onPointerDown(event) {
      if (state !== 'aim') return;
      const point = toLocal(event);
      if (Math.hypot(point.x - probe.x, point.y - probe.y) > 90) return;
      dragging = true;
      pointer = point;
      try { canvas.setPointerCapture(event.pointerId); } catch (error) { /* unsupported */ }
      event.preventDefault();
    }
    function onPointerMove(event) {
      if (!dragging) return;
      pointer = toLocal(event);
      event.preventDefault();
    }
    function onPointerUp(event) {
      if (!dragging) return;
      pointer = toLocal(event);
      launch();
      try { canvas.releasePointerCapture(event.pointerId); } catch (error) { /* unsupported */ }
      event.preventDefault();
    }
    function onPointerCancel() {
      dragging = false;
    }

    resize();
    updateHud();
    ctx.setScore(0);
    ctx.setProgress(0);

    if ('ResizeObserver' in window) {
      observer = new ResizeObserver(() => resize());
      observer.observe(wrap);
    } else {
      window.addEventListener('resize', resize, { passive: true });
    }
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerCancel);
    root.querySelector('#gw-reset').addEventListener('click', () => {
      if (state === 'aim' || state === 'flight') {
        state = 'aim';
        resetProbe('Probe reset. Drag and release.');
      }
    });

    timer = createTimer(180, {
      onTick: (remaining) => {
        timerNode.textContent = formatSeconds(remaining);
        timerNode.classList.toggle('is-low', remaining <= 20);
      },
      onEnd: () => end('time')
    });

    ctx.onCleanup(() => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      if (timer) timer.stop();
      if (transition) clearTimeout(transition);
      if (observer) observer.disconnect();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
    });

    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
};
