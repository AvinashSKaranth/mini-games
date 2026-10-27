// Pure rules for Dots and Boxes: claiming edges, box scoring, and the AI's choice.

/** A game of `size × size` boxes: horizontal and vertical edge arrays plus box owners. */
export function createGame(size = 4) {
  return {
    size,
    h: new Array((size + 1) * size).fill(-1),
    v: new Array(size * (size + 1)).fill(-1),
    owner: new Array(size * size).fill(-1),
    scores: [0, 0]
  };
}

export function hIndex(size, row, col) {
  return row * size + col;
}

export function vIndex(size, row, col) {
  return row * (size + 1) + col;
}

export function legalEdges(game) {
  const moves = [];
  const { size, h, v } = game;
  for (let index = 0; index < h.length; index += 1) if (h[index] === -1) moves.push({ kind: 'h', index });
  for (let index = 0; index < v.length; index += 1) if (v[index] === -1) moves.push({ kind: 'v', index });
  return moves;
}

/** The four edges around box (row, col). */
export function boxEdges(game, row, col) {
  const { size } = game;
  return [
    { kind: 'h', index: hIndex(size, row, col) },
    { kind: 'h', index: hIndex(size, row + 1, col) },
    { kind: 'v', index: vIndex(size, row, col) },
    { kind: 'v', index: vIndex(size, row, col + 1) }
  ];
}

/** Boxes touching an edge: one or two [row, col] pairs. */
export function edgeBoxes(game, edge) {
  const { size } = game;
  const boxes = [];
  if (edge.kind === 'h') {
    const row = Math.floor(edge.index / size);
    const col = edge.index % size;
    if (row > 0) boxes.push([row - 1, col]);
    if (row < size) boxes.push([row, col]);
  } else {
    const stride = size + 1;
    const row = Math.floor(edge.index / stride);
    const col = edge.index % stride;
    if (col > 0) boxes.push([row, col - 1]);
    if (col < size) boxes.push([row, col]);
  }
  return boxes;
}

export function boxFilledCount(game, row, col) {
  let count = 0;
  for (const edge of boxEdges(game, row, col)) {
    const owner = edge.kind === 'h' ? game.h[edge.index] : game.v[edge.index];
    if (owner !== -1) count += 1;
  }
  return count;
}

/** Claim one edge for `player`; returns a new game plus any boxes completed. */
export function claim(game, edge, player) {
  const next = {
    size: game.size,
    h: game.h.slice(),
    v: game.v.slice(),
    owner: game.owner.slice(),
    scores: game.scores.slice()
  };

  if (edge.kind === 'h') {
    if (next.h[edge.index] !== -1) return null;
    next.h[edge.index] = player;
  } else {
    if (next.v[edge.index] !== -1) return null;
    next.v[edge.index] = player;
  }

  const claimed = [];
  for (const [row, col] of edgeBoxes(next, edge)) {
    const box = row * next.size + col;
    if (next.owner[box] !== -1) continue;
    if (boxFilledCount(next, row, col) === 4) {
      next.owner[box] = player;
      next.scores[player] += 1;
      claimed.push([row, col]);
    }
  }

  return { game: next, claimed };
}

export function isComplete(game) {
  return game.owner.every((entry) => entry !== -1);
}

/**
 * Score one hypothetical edge for the AI: `gain` is the boxes the mover would
 * complete now, `leak` is the boxes the rival could complete right after.
 */
export function evaluateEdge(game, edge, player) {
  const result = claim(game, edge, player);
  if (!result) return { gain: -1, leak: 99 };

  const after = result.game;
  let leak = 0;
  for (let box = 0; box < after.owner.length; box += 1) {
    if (after.owner[box] !== -1) continue;
    const row = Math.floor(box / after.size);
    const col = box % after.size;
    if (boxFilledCount(after, row, col) === 3) leak += 1;
  }

  return { gain: result.claimed.length, leak };
}

function pick(list, rng) {
  return list[Math.floor(rng() * list.length)];
}

/**
 * Greedy play: take any box available; otherwise play a truly safe edge; when
 * every edge leaks, give up the fewest boxes. Ties break randomly so games
 * between two AIs do not repeat move for move.
 */
export function aiChoose(game, rng = Math.random) {
  const moves = legalEdges(game).map((edge) => ({ edge, ...evaluateEdge(game, edge, 0) }));
  if (!moves.length) return null;

  const scoring = moves.filter((move) => move.gain > 0);
  if (scoring.length) {
    const best = Math.max(...scoring.map((move) => move.gain));
    return pick(scoring.filter((move) => move.gain === best), rng).edge;
  }

  const safe = moves.filter((move) => move.leak === 0);
  if (safe.length) return pick(safe, rng).edge;

  const least = Math.min(...moves.map((move) => move.leak));
  return pick(moves.filter((move) => move.leak === least), rng).edge;
}
