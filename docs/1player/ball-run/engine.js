// Pure rules for Ball Run: row generation, collisions, scoring, speed ramp.

export const LANES = 3;
export const GEM_VALUE = 5;

/**
 * Build the next track row: 1–2 lanes blocked with gaps, never all lanes,
 * with a gem dropped into a free lane roughly a quarter of the time.
 * Returns an array of LANES slots: 'gap' | 'gem' | null.
 */
export function nextRow(rng = Math.random, { gemChance = 0.26, maxGaps = 2 } = {}) {
  const order = [0, 1, 2];
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = Math.min(index, Math.floor(rng() * (index + 1)));
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  const gapCount = rng() < 0.42 ? Math.min(maxGaps, 2) : 1;
  const row = [null, null, null];

  for (let index = 0; index < gapCount; index += 1) row[order[index]] = 'gap';

  const free = [];
  for (let lane = 0; lane < LANES; lane += 1) if (!row[lane]) free.push(lane);

  if (free.length && rng() < gemChance) {
    const pick = free[Math.floor(rng() * free.length)];
    row[pick] = 'gem';
  }

  return row;
}

/** A row is legal when at least one lane stays open for the ball. */
export function isOpenRow(row) {
  return row.some((cell) => cell !== 'gap');
}

export function freeLanes(row) {
  const lanes = [];
  for (let lane = 0; lane < row.length; lane += 1) {
    if (row[lane] !== 'gap') lanes.push(lane);
  }
  return lanes;
}

/** True when the ball's lane crosses a gap inside the collision band. */
export function hitsGap(row, lane, dy, radius) {
  if (Math.abs(dy) > radius) return false;
  return row[lane] === 'gap';
}

export function collectsGem(row, lane, dy, radius) {
  if (Math.abs(dy) > radius) return false;
  return row[lane] === 'gem';
}

export function scoreFrom(distancePx, gems, pxPerPoint = 12) {
  return Math.max(0, Math.floor(distancePx / pxPerPoint) + gems * GEM_VALUE);
}

/** Speed ramps with distance but stays capped for fairness. */
export function speedAt(distancePx, base = 175, cap = 330) {
  return Math.min(cap, base + distancePx / 650);
}

/** Vertical spacing between rows tightens slightly as speed grows. */
export function rowSpacing(distancePx, base = 150, min = 108) {
  return Math.max(min, base - distancePx / 700);
}
