// Pure rules for Reflex Race: signal delays, heat elimination, time formatting.

export const CUP_TARGET = 2;

/** How long the "wait" phase lasts before the signal: never too short, never flat. */
export function reactionDelay(rng = Math.random, min = 950, max = 2600) {
  return Math.round(min + rng() * (max - min));
}

/**
 * A tap record: {player, seq, time, falseStart}.
 * `time` is ms after the signal (negative when fired early), `seq` is the
 * order taps arrived in. The heat drops the earliest false start if there is
 * one, otherwise the slowest legal tapper.
 */
export function chooseEliminated(results) {
  if (!results.length) return null;

  const falseStarts = results.filter((entry) => entry.falseStart);
  if (falseStarts.length) {
    return falseStarts.reduce((best, entry) => (entry.seq < best.seq ? entry : best));
  }

  return results.reduce((worst, entry) => (entry.time > worst.time ? entry : worst));
}

/** Result label for a tap: reaction time, or a false-start marker. */
export function formatTap(entry) {
  if (entry.falseStart) return 'FST';
  return `${Math.round(entry.time)}ms`;
}

/** Sort legal times fastest first; false starts sink to the bottom. */
export function rankTaps(results) {
  return results.slice().sort((a, b) => {
    if (a.falseStart !== b.falseStart) return a.falseStart ? 1 : -1;
    return a.time - b.time;
  });
}

export function isFalseStart(tapOffset) {
  return tapOffset < 0;
}

/** Cup state: the winner index once a player reaches the target, else null. */
export function cupWinner(points, target = CUP_TARGET) {
  for (let index = 0; index < points.length; index += 1) {
    if (points[index] >= target) return index;
  }
  return null;
}

/** Placement labels for a heat that started with `count` players still in. */
export function placementLabel(count) {
  const labels = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' };
  return labels[count] || `${count}th`;
}
