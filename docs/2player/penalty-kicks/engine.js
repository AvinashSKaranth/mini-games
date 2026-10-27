// Pure rules for Penalty Kicks: zones, drift, flight timing, saves, match flow.

/** Six goal zones, row-major: rows = high/low, columns = left/centre/right. */
export const ZONE_ROWS = 2;
export const ZONE_COLS = 3;
export const ZONES = ZONE_ROWS * ZONE_COLS;
export const KICKS_EACH = 5;

/** Power inside this band keeps the shot on a true line (no drift). */
export const SWEET = [0.35, 0.75];

export function zoneRow(zone) {
  return Math.floor(zone / ZONE_COLS);
}

export function zoneCol(zone) {
  return zone % ZONE_COLS;
}

/** Orthogonal neighbours of a zone — where an off-target shot can drift. */
export function neighborsOf(zone) {
  const row = zoneRow(zone);
  const col = zoneCol(zone);
  const list = [];
  if (row > 0) list.push((row - 1) * ZONE_COLS + col);
  if (row < ZONE_ROWS - 1) list.push((row + 1) * ZONE_COLS + col);
  if (col > 0) list.push(row * ZONE_COLS + col - 1);
  if (col < ZONE_COLS - 1) list.push(row * ZONE_COLS + col + 1);
  return list;
}

/** 0 inside the sweet band, rising to 1 at either extreme of the power meter. */
export function driftChance(power) {
  const p = Math.max(0, Math.min(1, power));
  if (p < SWEET[0]) return Math.max(0, (SWEET[0] - p) / SWEET[0] - 0.35);
  if (p > SWEET[1]) return Math.max(0, (p - SWEET[1]) / (1 - SWEET[1]) - 0.35);
  return 0;
}

/**
 * Resolve where a shot actually ends up. Power outside the sweet band risks a
 * drift to a neighbouring zone — and a third of those overcooked shots sail
 * wide of the frame entirely, so brute force is never free.
 */
export function resolveKick({ aim, power = 0.5, rng = Math.random }) {
  const chance = driftChance(power);

  if (chance > 0 && rng() < chance) {
    if (rng() < 0.35) return { zone: aim, drifted: true, wide: true, chance };
    const options = neighborsOf(aim);
    if (options.length) {
      return { zone: options[Math.floor(rng() * options.length)], drifted: true, wide: false, chance };
    }
  }

  return { zone: aim, drifted: false, wide: false, chance };
}

/** Flight time in ms: harder hits arrive faster, shrinking the keeper's window. */
export function flightMs(power) {
  const p = Math.max(0, Math.min(1, power));
  return Math.round(620 - p * 260);
}

/** A save needs the dive on the right zone, locked before the ball lands. */
export function isSave({ zone, keeperZone, arrived }) {
  return arrived && keeperZone !== null && keeperZone !== undefined && keeperZone === zone;
}

/**
 * The computer keeper's dive. It reads the aim and commits mid-flight: it
 * covers the aimed zone with `skill` probability, otherwise flails elsewhere —
 * so a drifted shot beats it, at the cost of sometimes going wide.
 */
export function aiDive({ aim, rng = Math.random, skill = 0.62 }) {
  if (rng() < skill) return aim;
  const others = [];
  for (let zone = 0; zone < ZONES; zone += 1) if (zone !== aim) others.push(zone);
  return others[Math.floor(rng() * others.length)];
}

/** Who kicks next: the player with fewer kicks taken (Player 1 leads ties). */
export function nextKicker(kicks) {
  return kicks[0] <= kicks[1] ? 0 : 1;
}

/**
 * Match state: returns 0/1 when that player has won, or null while it continues.
 * Regulation allows a mathematical clincher; sudden death only ends on even
 * kicks with a lead, so the second kicker always gets to answer.
 */
export function decided(scores, kicks) {
  const inRegulation = kicks[0] <= KICKS_EACH && kicks[1] <= KICKS_EACH;

  if (inRegulation) {
    const left0 = Math.max(0, KICKS_EACH - kicks[0]);
    const left1 = Math.max(0, KICKS_EACH - kicks[1]);

    if (scores[0] > scores[1] + left1) return 0;
    if (scores[1] > scores[0] + left0) return 1;

    if (kicks[0] === KICKS_EACH && kicks[1] === KICKS_EACH) {
      if (scores[0] === scores[1]) return null; // sudden death
      return scores[0] > scores[1] ? 0 : 1;
    }
    return null;
  }

  // Sudden death: decided only once both players have kicked the same number of times.
  if (kicks[0] === kicks[1]) {
    if (scores[0] === scores[1]) return null;
    return scores[0] > scores[1] ? 0 : 1;
  }
  return null;
}
