// Pure drop resolution for Stack: overlap trimming, perfect snaps, offcuts.

/** How close (in pixels) a drop must align with the block below to count as perfect. */
export const PERFECT_TOLERANCE = 3;

/**
 * Resolve a moving block landing on the previous one.
 * `prev` and `current` are {x, width} on the same axis.
 * Returns the surviving block, any offcut that falls away, and the outcome.
 */
export function resolveDrop(prev, current, tolerance = PERFECT_TOLERANCE) {
  const left = Math.max(prev.x, current.x);
  const right = Math.min(prev.x + prev.width, current.x + current.width);
  const overlap = right - left;

  if (overlap <= 0) {
    return { missed: true, perfect: false, width: 0, x: current.x, offcut: { ...current } };
  }

  const aligned =
    Math.abs(current.x - prev.x) <= tolerance &&
    Math.abs(current.width - prev.width) <= tolerance;

  if (aligned) {
    return { missed: false, perfect: true, width: prev.width, x: prev.x, offcut: null };
  }

  let offcut = null;
  if (current.x < left) {
    offcut = { x: current.x, width: left - current.x };
  } else if (current.x + current.width > right) {
    offcut = { x: right, width: current.x + current.width - right };
  }

  return { missed: false, perfect: false, width: overlap, x: left, offcut };
}

/** Next moving block: same width as the tower, entering from one side. */
export function nextBlock(towerWidth, canvasWidth, direction = 1) {
  const width = towerWidth;
  const x = direction > 0 ? 0 : Math.max(0, canvasWidth - width);
  return { x, width, direction };
}

/** Speed grows with height but stays capped so the game remains fair. */
export function speedFor(height, base = 90, cap = 340) {
  return Math.min(cap, base + height * 12);
}
