// Pure helpers for Sumo: motion, collisions, ring-outs, and the AI's decisions.

export const DEFAULTS = {
  acc: 820, // px/s² of steering acceleration
  max: 195, // px/s top speed
  friction: 4.4, // velocity damping per second
  restitution: 0.55,
  dashBoost: 330,
  dashCooldown: 1100
};

export function normalize(x, y) {
  const length = Math.hypot(x, y);
  if (length < 1e-6) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
}

/** Integrate one wrestler: input acceleration, damping, speed cap, position step. */
export function stepBody(body, input, dt, options = {}) {
  const { acc, max, friction } = { ...DEFAULTS, ...options };
  const step = Math.min(dt, 0.05);
  const direction = normalize(input.x || 0, input.y || 0);

  let vx = body.vx + direction.x * acc * step;
  let vy = body.vy + direction.y * acc * step;

  const damp = Math.exp(-friction * step);
  vx *= damp;
  vy *= damp;

  const speed = Math.hypot(vx, vy);
  if (speed > max) {
    vx = (vx / speed) * max;
    vy = (vy / speed) * max;
  }

  return {
    ...body,
    x: body.x + vx * step,
    y: body.y + vy * step,
    vx,
    vy
  };
}

/** Equal-mass circle collision: separate, then resolve velocity along the normal. */
export function collideBodies(a, b, radius, options = {}) {
  const { restitution } = { ...DEFAULTS, ...options };
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let distance = Math.hypot(dx, dy);

  if (distance >= radius * 2) return { a: { ...a }, b: { ...b }, hit: false };

  if (distance < 1e-6) {
    dx = 1e-3;
    dy = 0;
    distance = 1e-3;
  }

  const nx = dx / distance;
  const ny = dy / distance;
  const overlap = radius * 2 - distance;

  const nextA = { ...a, x: a.x - nx * overlap * 0.5, y: a.y - ny * overlap * 0.5 };
  const nextB = { ...b, x: b.x + nx * overlap * 0.5, y: b.y + ny * overlap * 0.5 };

  const relVx = nextB.vx - nextA.vx;
  const relVy = nextB.vy - nextA.vy;
  const normalSpeed = relVx * nx + relVy * ny;

  if (normalSpeed < 0) {
    const impulse = (-(1 + restitution) * normalSpeed) / 2;
    nextA.vx -= impulse * nx;
    nextA.vy -= impulse * ny;
    nextB.vx += impulse * nx;
    nextB.vy += impulse * ny;
    return { a: nextA, b: nextB, hit: true, impulse: Math.abs(normalSpeed) };
  }

  return { a: nextA, b: nextB, hit: false };
}

/** A wrestler is out once their centre crosses the ring's edge. */
export function ringOut(body, ring) {
  return Math.hypot(body.x - ring.cx, body.y - ring.cy) > ring.r;
}

/** Unit vector from the ring centre through a body: the way to push someone out. */
export function pushDirection(body, ring) {
  return normalize(body.x - ring.cx, body.y - ring.cy);
}

/**
 * The AI's move. It pushes by steering to a point just inside the opponent
 * along the centre→opponent line, retreats inward when it drifts near the
 * edge itself, and dashes only when aligned and close. It reads only public
 * positions — no hidden state exists in this game.
 */
export function aiInput(self, opponent, ring, options = {}) {
  const { radius = 26, rng = Math.random, aggression = 0.55 } = { ...DEFAULTS, ...options };

  const toCenterX = ring.cx - self.x;
  const toCenterY = ring.cy - self.y;
  const distSelf = Math.hypot(toCenterX, toCenterY);
  const edgeMargin = ring.r - radius * 1.5;

  let dir;
  if (distSelf > edgeMargin * 0.78) {
    dir = normalize(toCenterX, toCenterY);
  } else {
    const outward = pushDirection(opponent, ring);
    const targetX = opponent.x - outward.x * radius * 1.7;
    const targetY = opponent.y - outward.y * radius * 1.7;
    dir = normalize(targetX - self.x, targetY - self.y);
  }

  const toOpp = normalize(opponent.x - self.x, opponent.y - self.y);
  const distOpp = Math.hypot(opponent.x - self.x, opponent.y - self.y);
  const aligned = dir.x * toOpp.x + dir.y * toOpp.y > 0.7;
  const dash = Boolean(aligned && distOpp < ring.r * 0.55 && rng() < aggression);

  return { x: dir.x, y: dir.y, dash };
}

/** Perfectly aligned dash impulse along a facing vector. */
export function dashImpulse(facing, options = {}) {
  const { dashBoost } = { ...DEFAULTS, ...options };
  const dir = normalize(facing.x, facing.y);
  if (!dir.x && !dir.y) return { x: 0, y: 0 };
  return { x: dir.x * dashBoost, y: dir.y * dashBoost };
}
