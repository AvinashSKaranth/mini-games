/**
 * Fade the game surface out, run a reset/refresh action, then fade it back in.
 * Falls back to an instant update when the user prefers reduced motion.
 *
 * @param {Element|string|null} target Element (or selector) that survives the update.
 * @param {() => void} update Work that rebuilds the board, score, or round.
 * @param {{out?: number, in?: number}} [options] Durations in milliseconds.
 * @returns {Promise<void>}
 */
export function softRefresh(target, update, options = {}) {
  const element = typeof target === 'string' ? document.querySelector(target) : target;
  if (!element || typeof update !== 'function') {
    if (typeof update === 'function') update();
    return Promise.resolve();
  }

  if (element.dataset.refreshing === 'true') return Promise.resolve();
  element.dataset.refreshing = 'true';
  element.style.pointerEvents = 'none';

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduced || typeof element.animate !== 'function') {
    return Promise.resolve()
      .then(update)
      .finally(() => {
        delete element.dataset.refreshing;
        element.style.pointerEvents = '';
      });
  }

  const outMs = options.out ?? 170;
  const inMs = options.in ?? 260;

  const outgoing = element.animate(
    [
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(.982)' }
    ],
    { duration: outMs, easing: 'cubic-bezier(.4, 0, 1, 1)', fill: 'forwards' }
  );

  return outgoing.finished
    .catch(() => {})
    .then(async () => {
      outgoing.cancel();
      try {
        await update();
      } finally {
        delete element.dataset.refreshing;
        element.style.pointerEvents = '';
      }

      const incoming = element.animate(
        [
          { opacity: 0, transform: 'scale(.985)' },
          { opacity: 1, transform: 'scale(1)' }
        ],
        { duration: inMs, easing: 'cubic-bezier(.2, .8, .2, 1)' }
      );
      return incoming.finished.catch(() => {});
    });
}
