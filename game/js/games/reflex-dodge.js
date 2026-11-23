import { createTimer, finishOnce, formatSeconds, rand } from './_kit.js';

export default {
  id: 'reflex-dodge',
  mount(root, ctx) {
    const finish = finishOnce(ctx);
    let running = true;
    let raf = null;
    let timer = null;
    let observer = null;
    let last = 0;
    let elapsed = 0;
    let score = 0;
    let lives = 3;
    let orbsCollected = 0;
    let invulnerable = 0;
    let shake = 0;
    let hazardClock = 0;
    let orbClock = 0;
    let w = 640;
    let h = 360;

    root.innerHTML = `
      <div class="g-wrap">
        <div class="g-head">
          <span class="g-kicker">Vector Dodge · survive and accelerate</span>
          <span class="g-timer" id="rd-timer">0:45</span>
        </div>
        <div class="g-panel" style="padding:0;overflow:hidden">
          <div class="g-gravity-wrap" id="rd-wrap" style="aspect-ratio:16/9">
            <canvas id="rd-canvas" aria-label="Vector Dodge game field"></canvas>
            <div class="g-gravity-overlay">
              <span id="rd-lives">♥ ♥ ♥</span> · <span id="rd-orbs">0 energy</span> · <span id="rd-speed">speed 1.0×</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-top:1px solid var(--v-line)">
            <span class="g-status">WASD / arrows · or drag</span>
            <span class="g-status" id="rd-feedback">Collect energy. Speed is power and risk.</span>
          </div>
        </div>
      </div>`;

    const wrap = root.querySelector('#rd-wrap');
    const canvas = root.querySelector('#rd-canvas');
    const g = canvas.getContext('2d');
    const timerNode = root.querySelector('#rd-timer');
    const livesNode = root.querySelector('#rd-lives');
    const orbsNode = root.querySelector('#rd-orbs');
    const speedNode = root.querySelector('#rd-speed');
    const feedback = root.querySelector('#rd-feedback');

    const player = { x: 320, y: 180, r: 12, speed: 260 };
    const keys = Object.create(null);
    const pointer = { x: 0, y: 0, active: false };
    const hazards = [];
    const orbs = [];
    const trail = [];

    function resize() {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(280, rect.width);
      h = Math.max(180, rect.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      player.x = Math.min(w - 20, Math.max(20, player.x));
      player.y = Math.min(h - 20, Math.max(20, player.y));
    }

    function updateHud() {
      livesNode.textContent = Array.from({ length: 3 }, (_, i) => (i < lives ? '♥' : '♡')).join(' ');
      orbsNode.textContent = `${orbsCollected} energy`;
      speedNode.textContent = `speed ${(player.speed / 260).toFixed(1)}×`;
    }

    function spawnHazard() {
      const side = rand(0, 3);
      const radius = rand(7, 15);
      let x, y, tx, ty;
      if (side === 0) { x = rand(0, w); y = -radius - 6; }
      else if (side === 1) { x = w + radius + 6; y = rand(0, h); }
      else if (side === 2) { x = rand(0, w); y = h + radius + 6; }
      else { x = -radius - 6; y = rand(0, h); }
      tx = rand(w * 0.25, w * 0.75);
      ty = rand(h * 0.25, h * 0.75);
      const angle = Math.atan2(ty - y, tx - x);
      const speed = 95 + elapsed * 2.1 + rand(0, 55);
      hazards.push({ x, y, r: radius, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, spin: rand(0, 6) });
    }

    function spawnOrb() {
      if (orbs.length >= 4) return;
      orbs.push({
        x: rand(36, Math.max(40, w - 36)),
        y: rand(36, Math.max(40, h - 36)),
        r: 8,
        phase: rand(0, 6)
      });
    }

    function end() {
      if (!running) return;
      running = false;
      if (raf) cancelAnimationFrame(raf);
      if (timer) timer.stop();
      finish({
        score,
        correct: orbsCollected,
        total: Math.max(orbsCollected + (3 - lives), 1),
        label: 'points',
        detail: `${Math.floor(elapsed)}s survived · ${orbsCollected} energy · speed ${(player.speed / 260).toFixed(1)}×`,
        headline: elapsed >= 40 ? 'Full run.' : lives > 0 ? 'Time called.' : 'The field caught you.'
      });
    }

    function draw() {
      g.save();
      if (shake > 0) {
        g.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      }
      g.fillStyle = '#06060a';
      g.fillRect(-10, -10, w + 20, h + 20);

      g.strokeStyle = 'rgba(236,232,224,0.05)';
      g.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
      }

      g.strokeStyle = 'rgba(215,244,90,0.14)';
      g.beginPath();
      trail.forEach((point, index) => {
        if (index === 0) g.moveTo(point.x, point.y);
        else g.lineTo(point.x, point.y);
      });
      g.stroke();

      for (const orb of orbs) {
        orb.phase += 0.06;
        const pulse = 1 + Math.sin(orb.phase) * 0.18;
        g.beginPath();
        g.arc(orb.x, orb.y, orb.r * pulse, 0, Math.PI * 2);
        g.fillStyle = 'rgba(124,242,164,0.2)';
        g.fill();
        g.strokeStyle = '#7cf2a4';
        g.lineWidth = 1.5;
        g.stroke();
      }

      for (const hazard of hazards) {
        g.save();
        g.translate(hazard.x, hazard.y);
        g.rotate(hazard.spin);
        g.beginPath();
        g.moveTo(0, -hazard.r);
        g.lineTo(hazard.r * 0.86, hazard.r * 0.7);
        g.lineTo(-hazard.r * 0.86, hazard.r * 0.7);
        g.closePath();
        g.fillStyle = 'rgba(255,107,91,0.16)';
        g.fill();
        g.strokeStyle = '#ff6b5b';
        g.lineWidth = 1.4;
        g.stroke();
        g.restore();
      }

      const alpha = invulnerable > 0 && Math.floor(invulnerable * 12) % 2 === 0 ? 0.35 : 1;
      g.globalAlpha = alpha;
      g.beginPath();
      g.arc(player.x, player.y, player.r, 0, Math.PI * 2);
      g.fillStyle = 'rgba(215,244,90,0.18)';
      g.fill();
      g.strokeStyle = '#d7f45a';
      g.lineWidth = 2;
      g.stroke();
      g.beginPath();
      g.arc(player.x, player.y, player.r + 5, 0, Math.PI * 2);
      g.strokeStyle = 'rgba(215,244,90,0.25)';
      g.lineWidth = 1;
      g.stroke();
      g.globalAlpha = 1;
      g.restore();
    }

    function frame(now) {
      if (!running) return;
      const dt = Math.min(0.034, Math.max(0, (now - last) / 1000));
      last = now;
      elapsed += dt;
      invulnerable = Math.max(0, invulnerable - dt);
      shake = Math.max(0, shake - dt * 26);

      let dx = 0, dy = 0;
      if (keys.arrowleft || keys.a) dx -= 1;
      if (keys.arrowright || keys.d) dx += 1;
      if (keys.arrowup || keys.w) dy -= 1;
      if (keys.arrowdown || keys.s) dy += 1;
      if (!dx && !dy && pointer.active) {
        const px = pointer.x - player.x;
        const py = pointer.y - player.y;
        const dist = Math.hypot(px, py);
        if (dist > 10) { dx = px / dist; dy = py / dist; }
      }
      const magnitude = Math.hypot(dx, dy);
      if (magnitude > 0) {
        dx /= magnitude; dy /= magnitude;
        player.x += dx * player.speed * dt;
        player.y += dy * player.speed * dt;
      }
      player.x = Math.min(w - player.r, Math.max(player.r, player.x));
      player.y = Math.min(h - player.r, Math.max(player.r, player.y));

      trail.push({ x: player.x, y: player.y });
      if (trail.length > 22) trail.shift();

      hazardClock -= dt;
      if (hazardClock <= 0) {
        spawnHazard();
        hazardClock = Math.max(0.22, 0.85 - elapsed * 0.014);
      }
      orbClock -= dt;
      if (orbClock <= 0) {
        spawnOrb();
        orbClock = 1.9 + Math.random();
      }

      for (let i = hazards.length - 1; i >= 0; i--) {
        const hazard = hazards[i];
        hazard.x += hazard.vx * dt;
        hazard.y += hazard.vy * dt;
        hazard.spin += dt * 1.4;
        if (hazard.x < -80 || hazard.x > w + 80 || hazard.y < -80 || hazard.y > h + 80) {
          hazards.splice(i, 1);
          continue;
        }
        if (invulnerable <= 0 && Math.hypot(hazard.x - player.x, hazard.y - player.y) < hazard.r + player.r) {
          hazards.splice(i, 1);
          lives -= 1;
          invulnerable = 1.4;
          shake = 10;
          player.x = w / 2;
          player.y = h / 2;
          trail.length = 0;
          feedback.textContent = lives > 0 ? `Hit. ${lives} ${lives === 1 ? 'life' : 'lives'} left.` : 'Field won.';
          updateHud();
          if (lives <= 0) { end(); return; }
        }
      }

      for (let i = orbs.length - 1; i >= 0; i--) {
        const orb = orbs[i];
        if (Math.hypot(orb.x - player.x, orb.y - player.y) < orb.r + player.r + 4) {
          orbs.splice(i, 1);
          orbsCollected += 1;
          player.speed = Math.min(560, player.speed + 17);
          feedback.textContent = `Energy. Speed ${(player.speed / 260).toFixed(1)}×.`;
          updateHud();
        }
      }

      score = Math.floor(elapsed * 8) + orbsCollected * 25;
      ctx.setScore(score);
      draw();
      raf = requestAnimationFrame(frame);
    }

    function onKeyDown(event) {
      const key = event.key.toLowerCase();
      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(key)) event.preventDefault();
      keys[key] = true;
    }
    function onKeyUp(event) { keys[event.key.toLowerCase()] = false; }
    function onPointerMove(event) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * w;
      pointer.y = ((event.clientY - rect.top) / rect.height) * h;
      pointer.active = true;
    }
    function onPointerLeave() { pointer.active = false; }

    resize();
    player.x = w / 2;
    player.y = h / 2;
    updateHud();
    ctx.setScore(0);
    ctx.setStatus('Live');

    if ('ResizeObserver' in window) {
      observer = new ResizeObserver(() => resize());
      observer.observe(wrap);
    } else {
      window.addEventListener('resize', resize, { passive: true });
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);

    timer = createTimer(45, {
      onTick: (remaining) => {
        timerNode.textContent = formatSeconds(remaining);
        timerNode.classList.toggle('is-low', remaining <= 8);
        ctx.setProgress(1 - remaining / 45);
      },
      onEnd: end
    });

    ctx.onCleanup(() => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      if (timer) timer.stop();
      if (observer) observer.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
    });

    spawnOrb();
    spawnOrb();
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
};
