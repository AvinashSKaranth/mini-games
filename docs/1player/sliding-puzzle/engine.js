// Pure rules for Sliding Puzzle: tile moves, solvable shuffles, clock format.

export const SIZES = {
  easy: { size: 3, label: '3×3' },
  medium: { size: 4, label: '4×4' },
  hard: { size: 5, label: '5×5' }
};

/** Solved board: 1 … n²-1 in order with 0 marking the blank. */
export function createSolved(size) {
  const total = size * size;
  const tiles = [];
  for (let value = 1; value < total; value += 1) tiles.push(value);
  tiles.push(0);
  return tiles;
}

export function isSolved(tiles) {
  for (let index = 0; index < tiles.length - 1; index += 1) {
    if (tiles[index] !== index + 1) return false;
  }
  return tiles[tiles.length - 1] === 0;
}

export function blankIndex(tiles) {
  return tiles.indexOf(0);
}

/** Orthogonal neighbours of a cell on a size×size board. */
export function neighbors(index, size) {
  const row = Math.floor(index / size);
  const col = index % size;
  const list = [];
  if (row > 0) list.push(index - size);
  if (row < size - 1) list.push(index + size);
  if (col > 0) list.push(index - 1);
  if (col < size - 1) list.push(index + 1);
  return list;
}

/** Slide the tile at `index` into the blank. Returns a copy, or null when illegal. */
export function slide(tiles, index) {
  const blank = blankIndex(tiles);
  if (index === blank || !neighbors(blank, Math.sqrt(tiles.length)).includes(index)) return null;
  const next = tiles.slice();
  next[blank] = next[index];
  next[index] = 0;
  return next;
}

/**
 * Directional move: `dir` is the way the tile travels.
 * ArrowLeft slides the tile sitting right of the blank one step left.
 */
export function slideDirection(tiles, size, dir) {
  const blank = blankIndex(tiles);
  const row = Math.floor(blank / size);
  const col = blank % size;
  let target = -1;

  if (dir === 'left' && col < size - 1) target = blank + 1;
  else if (dir === 'right' && col > 0) target = blank - 1;
  else if (dir === 'up' && row < size - 1) target = blank + size;
  else if (dir === 'down' && row > 0) target = blank - size;

  if (target < 0) return null;
  const next = slide(tiles, target);
  return next ? { tiles: next, moved: target } : null;
}

/**
 * Shuffle by walking the blank around from the solved state, which keeps every
 * deal solvable. Immediate backtracking is avoided so the puzzle is not trivial.
 */
export function shuffle(size, rng = Math.random, steps = 200) {
  let tiles = createSolved(size);
  let previousBlank = -1;

  for (let step = 0; step < steps; step += 1) {
    const blank = blankIndex(tiles);
    let options = neighbors(blank, size).filter((index) => index !== previousBlank);
    if (!options.length) options = neighbors(blank, size);
    const pick = options[Math.floor(rng() * options.length)];
    previousBlank = blank;
    tiles = slide(tiles, pick);
  }

  if (isSolved(tiles)) {
    const blank = blankIndex(tiles);
    tiles = slide(tiles, neighbors(blank, size)[0]);
  }
  return tiles;
}

/** Heuristic cost used by tests: sum of each tile's Manhattan distance to home. */
export function manhattan(tiles, size) {
  let total = 0;
  for (let index = 0; index < tiles.length; index += 1) {
    const value = tiles[index];
    if (!value) continue;
    const target = value - 1;
    total += Math.abs(Math.floor(index / size) - Math.floor(target / size));
    total += Math.abs((index % size) - (target % size));
  }
  return total;
}

export function formatClock(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
