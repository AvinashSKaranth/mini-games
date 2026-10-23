const filterButtons = Array.from(document.querySelectorAll('.filters button'));
const cards = Array.from(document.querySelectorAll('.game-card'));
const emptyState = document.getElementById('empty-state');

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;

    filterButtons.forEach((other) => {
      const active = other === button;
      other.classList.toggle('is-active', active);
      other.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    let visible = 0;
    cards.forEach((card) => {
      const show = filter === 'all' || card.dataset.players === filter;
      card.hidden = !show;
      if (show) visible += 1;
    });

    emptyState.hidden = visible !== 0;
  });
});

const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* offline support is a bonus, never a blocker */
    });
  });
}
