// Pure rules for Archery 4P. Coordinates are target units on a 100-unit face
// with the centre at (50, 50), so the outer edge sits 50 units from the bull.

export const FACE_RADIUS = 50;
export const RINGS = 10;
export const MAX_JITTER = 34;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Score a landing point measured relative to the target centre.
 * Ten rings of five units each: dead centre is 10, the outer band is 1.
 */
export function scoreFor(x, y) {
  const distance = Math.hypot(x, y);
  if (distance > FACE_RADIUS) return { distance, score: 0, onTarget: false };
  return {
    distance,
    score: RINGS - Math.min(RINGS - 1, Math.floor(distance / 5)),
    onTarget: true
  };
}

/** Wind of -2..2 pushes the arrow 6.5 units per step. */
export function windDrift(wind) {
  return clamp(Number(wind) || 0, -2, 2) * 6.5;
}

/** A meter marker at 0 or 100 is a wild shot; 50 is dead accurate. */
export function accuracyFrom(marker) {
  return 1 - Math.min(1, Math.abs(clamp(Number(marker) || 0, 0, 100) - 50) / 50);
}

/** Resolve a shot: wind drift first, then a jitter disc that grows as accuracy drops. */
export function resolveShot({ aimX, aimY, wind = 0, accuracy = 1, rng = Math.random }) {
  const spread = MAX_JITTER * (1 - clamp(Number(accuracy) || 0, 0, 1));
  const angle = rng() * Math.PI * 2;
  const radius = Math.sqrt(rng()) * spread;
  const x = aimX + windDrift(wind) + Math.cos(angle) * radius;
  const y = aimY + Math.sin(angle) * radius;
  const result = scoreFor(x - FACE_RADIUS, y - FACE_RADIUS);
  return { x, y, ...result };
}

const WINDS = [-2, -1, -1, 0, 0, 0, 0, 1, 1, 2];

/** Wind is usually calm, never stronger than two steps. */
export function nextWind(rng = Math.random) {
  const index = Math.floor(clamp(rng(), 0, 0.999999) * WINDS.length);
  return WINDS[index];
}

/** Highest total wins; bullseyes break ties, then turn order. */
export function rankPlayers(totals, bullseyes = []) {
  return totals
    .map((total, index) => ({ index, total, bullseyes: bullseyes[index] || 0 }))
    .sort((a, b) => b.total - a.total || b.bullseyes - a.bullseyes || a.index - b.index);
}
