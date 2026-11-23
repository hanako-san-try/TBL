import { createTimer, finishOnce, formatSeconds, shuffle } from './_kit.js';

const BASES = [
  [1, 2], [1, 3], [2, 3], [1, 4],
  [3, 4], [2, 5], [3, 5], [4, 5]
];

function buildDeck() {
  const cards = [];
  BASES.forEach(([n, d], pair) => {
    const factor = Math.random() > 0.5 ? 2 : 3;
    cards.push({ pair, label: `${n}/${d}` });
    cards.push({ pair, label: `${n * factor}/${d * factor}` });
  });
  return shuffle(cards);
}

export default {
  id: 'fraction-match',
  mount(root, ctx) {
    const finish = finishOnce(ctx);
    let running = true;
    let elapsed = 0;
    let deck = buildDeck();
    let open = [];
    let matched = 0;
    let moves = 0;
    let lock = false;
    let nodes = [];

    root.innerHTML = `
      <div class="g-wrap">
        <div class="g-head">
          <span class="g-kicker">Fraction Match · 8 pairs</span>
          <span class="g-timer" id="fm-timer">1:30</span>
        </div>
        <div class="g-panel">
          <p class="g-sub">Flip two cards. Match fractions with the same value.</p>
          <div class="g-card-grid" id="fm-grid" style="margin-top:18px"></div>
          <div class="g-feedback" id="fm-feedback">Equivalent fractions only.</div>
        </div>
      </div>`;

    const grid = root.querySelector('#fm-grid');
    const feedback = root.querySelector('#fm-feedback');
    const timerNode = root.querySelector('#fm-timer');

    function render() {
      grid.innerHTML = '';
      nodes = deck.map((card, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'g-mem-card';
        button.innerHTML = `<span class="g-mem-face">${card.label}</span>`;
        button.setAttribute('aria-label', 'Hidden fraction card');
        button.addEventListener('click', () => flip(index, button));
        grid.appendChild(button);
        return button;
      });
    }

    function flip(index, button) {
      if (!running || lock || button.classList.contains('is-open') || button.classList.contains('is-matched')) return;
      button.classList.add('is-open');
      button.setAttribute('aria-label', `Fraction ${deck[index].label}`);
      open.push({ index, button });
      if (open.length < 2) return;

      moves += 1;
      const [first, second] = open;
      if (deck[first.index].pair === deck[second.index].pair) {
        first.button.classList.add('is-matched');
        second.button.classList.add('is-matched');
        first.button.classList.remove('is-open');
        second.button.classList.remove('is-open');
        matched += 1;
        open = [];
        feedback.textContent = `Match. ${matched}/8 pairs.`;
        feedback.className = 'g-feedback is-good';
        ctx.setScore(matched * 100);
        if (matched === 8) {
          running = false;
          timer.stop();
          const score = Math.max(50, 900 - moves * 12 - Math.round(elapsed * 2));
          ctx.setScore(score);
          setTimeout(() => finish({
            score,
            correct: 8,
            total: 8,
            label: 'points',
            detail: `${moves} moves · ${formatSeconds(elapsed)}`,
            headline: 'All pairs found.'
          }), 600);
        }
      } else {
        lock = true;
        feedback.textContent = 'Not equivalent. Try again.';
        feedback.className = 'g-feedback is-bad';
        setTimeout(() => {
          first.button.classList.remove('is-open');
          second.button.classList.remove('is-open');
          first.button.setAttribute('aria-label', 'Hidden fraction card');
          second.button.setAttribute('aria-label', 'Hidden fraction card');
          open = [];
          lock = false;
        }, 720);
      }
    }

    function end() {
      if (!running) return;
      running = false;
      timer.stop();
      finish({
        score: matched * 100,
        correct: matched,
        total: 8,
        label: 'points',
        detail: `${matched}/8 pairs · ${moves} moves`,
        headline: matched >= 6 ? 'Strong equivalence memory.' : 'Keep pairing.'
      });
    }

    const timer = createTimer(90, {
      onTick: (remaining) => {
        elapsed = 90 - remaining;
        timerNode.textContent = formatSeconds(remaining);
        timerNode.classList.toggle('is-low', remaining <= 12);
        ctx.setProgress(elapsed / 90);
      },
      onEnd: end
    });

    ctx.onCleanup(() => timer.stop());
    ctx.setScore(0);
    ctx.setStatus('8 pairs');
    render();
  }
};
