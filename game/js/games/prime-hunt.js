import { createTimer, finishOnce, formatSeconds, isPrime, rand, shuffle } from './_kit.js';

function buildField() {
  const primes = [];
  while (primes.length < 10) {
    const value = rand(2, 97);
    if (isPrime(value) && !primes.includes(value)) primes.push(value);
  }
  const composites = [];
  while (composites.length < 15) {
    const value = rand(4, 99);
    if (!isPrime(value) && !composites.includes(value)) composites.push(value);
  }
  return shuffle([...primes, ...composites]).map((value) => ({ value, prime: isPrime(value) }));
}

export default {
  id: 'prime-hunt',
  mount(root, ctx) {
    const finish = finishOnce(ctx);
    let running = true;
    let found = 0;
    let wrong = 0;
    let taps = 0;
    let field = buildField();
    const totalPrimes = field.filter((cell) => cell.prime).length;

    root.innerHTML = `
      <div class="g-wrap">
        <div class="g-head">
          <span class="g-kicker">Prime Hunt · tap only primes</span>
          <span class="g-timer" id="ph-timer">0:30</span>
        </div>
        <div class="g-panel">
          <div class="g-grid g-grid-5" id="ph-grid" style="max-width:560px"></div>
          <div class="g-feedback" id="ph-feedback">Prime numbers only. Composites cost points.</div>
          <div class="g-progress"><span id="ph-bar" style="--p:0%"></span></div>
        </div>
      </div>`;

    const grid = root.querySelector('#ph-grid');
    const feedback = root.querySelector('#ph-feedback');
    const bar = root.querySelector('#ph-bar');
    const timerNode = root.querySelector('#ph-timer');

    function render() {
      grid.innerHTML = '';
      field.forEach((cell) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'g-tile';
        button.textContent = cell.value;
        button.addEventListener('click', () => tap(cell, button));
        grid.appendChild(button);
      });
    }

    function tap(cell, button) {
      if (!running || button.disabled) return;
      taps += 1;
      if (cell.prime) {
        found += 1;
        button.classList.add('is-found');
        button.disabled = true;
        feedback.textContent = `${cell.value} is prime. ${found}/${totalPrimes} found.`;
        feedback.className = 'g-feedback is-good';
        ctx.setScore(Math.max(0, found * 10 - wrong * 4));
        bar.style.setProperty('--p', `${(found / totalPrimes) * 100}%`);
        if (found === totalPrimes) end('cleared');
      } else {
        wrong += 1;
        button.classList.add('is-bad');
        button.disabled = true;
        feedback.textContent = `${cell.value} is composite. ${wrong} miss${wrong === 1 ? '' : 'es'}.`;
        feedback.className = 'g-feedback is-bad';
        ctx.setScore(Math.max(0, found * 10 - wrong * 4));
      }
    }

    function end(reason) {
      if (!running) return;
      running = false;
      timer.stop();
      const score = Math.max(0, found * 10 - wrong * 4);
      finish({
        score,
        correct: found,
        total: Math.max(taps, totalPrimes),
        label: 'points',
        detail: `${found} primes · ${wrong} miss${wrong === 1 ? '' : 'es'}`,
        headline: reason === 'cleared' ? 'Field cleared.' : found >= 6 ? 'Good eye.' : 'Watch the composites.'
      });
    }

    const timer = createTimer(30, {
      onTick: (remaining) => {
        timerNode.textContent = formatSeconds(remaining);
        timerNode.classList.toggle('is-low', remaining <= 6);
        ctx.setProgress(1 - remaining / 30);
      },
      onEnd: () => end('time')
    });

    ctx.onCleanup(() => timer.stop());
    ctx.setScore(0);
    ctx.setStatus('10 primes hidden');
    render();
  }
};
