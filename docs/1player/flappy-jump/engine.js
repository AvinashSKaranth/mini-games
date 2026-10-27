// Pure helpers for Flappy Jump: flap physics, gap placement, collisions, scoring.

export const GRAVITY = 1500; // px/s²
export const FLAP_VELOCITY = -430; // px/s, upward

/** One flap: velocity snaps upward, gravity takes over from there. */
export function applyFlap() {
  return FLAP_VELOCITY;
}

/** Integrate vertical motion with a clamped step so a long frame cannot tunnel. */
export function stepVertical(y, vy, dt) {
  const step = Math.min(dt, 0.05);
  const nextVy = vy + GRAVITY * step;
  return { y: y + nextVy * step, vy: nextVy };
}

/**
 * Choose the next gap's centre. Keeps jumps fair by limiting how far the gap
 * moves from the previous one, and clamps it inside [min, max].
 */
export function nextGapY(previousY, rng, min, max, step = 110) {
  const delta = (rng() * 2 - 1) * step;
  const target = previousY + delta;
  return Math.round(Math.max(min, Math.min(max, target)));
}

export function hitsPipe(bird, pipe, gap) {
  const birdLeft = bird.x - bird.r;
  const birdRight = bird.x + bird.r;
  const overlapsX = birdRight > pipe.x && birdLeft < pipe.x + pipe.w;
  if (!overlapsX) return false;
  return bird.y - bird.r < gap.y || bird.y + bird.r > gap.y + gap.h;
}

export function hitsGround(bird, groundY) {
  return bird.y + bird.r >= groundY;
}

/** Distance travelled in pixels becomes whole points. */
export function scoreFrom(distancePx, pxPerPoint = 12) {
  return Math.max(0, Math.floor(distancePx / pxPerPoint));
}

/** Scroll speed ramps gently with distance but stays capped. */
export function speedAt(distancePx, base = 132, cap = 205) {
  return Math.min(cap, base + distancePx / 900);
}
