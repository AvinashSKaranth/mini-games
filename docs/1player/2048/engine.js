export const SIZE = 4;

const LINES = (() => {
  const lines = {};
  const dirs = {
    left: (r) => Array.from({ length: SIZE }, (_, c) => ({ r, c })),
    right: (r) => Array.from({ length: SIZE }, (_, i) => ({ r, c: SIZE - 1 - i })),
    up: (c) => Array.from({ length: SIZE }, (_, r) => ({ r, c })),
    down: (c) => Array.from({ length: SIZE }, (_, i) => ({ r: SIZE - 1 - i, c }))
  };
  for (const [dir, build] of Object.entries(dirs)) {
    lines[dir] = dir === 'left' || dir === 'right'
      ? Array.from({ length: SIZE }, (_, r) => build(r))
      : Array.from({ length: SIZE }, (_, c) => build(c));
  }
  return lines;
})();

export function emptyCells(tiles) {
  const taken = new Set(tiles.map((t) => t.r * SIZE + t.c));
  const out = [];
  for (let i = 0; i < SIZE * SIZE; i += 1) {
    if (!taken.has(i)) out.push({ r: Math.floor(i / SIZE), c: i % SIZE });
  }
  return out;
}

export function spawnTile(tiles, rand = Math.random, nextId = 1) {
  const empty = emptyCells(tiles);
  if (!empty.length) return { tile: null, nextId };
  const cell = empty[Math.min(empty.length - 1, Math.floor(rand() * empty.length))];
  const value = rand() < 0.9 ? 2 : 4;
  return {
    tile: { id: nextId, value, r: cell.r, c: cell.c },
    nextId: nextId + 1
  };
}

export function newGame(rand = Math.random) {
  const state = {
    tiles: [],
    score: 0,
    status: 'playing',
    won: false,
    nextId: 1
  };
  for (let i = 0; i < 2; i += 1) {
    const { tile, nextId } = spawnTile(state.tiles, rand, state.nextId);
    state.tiles.push(tile);
    state.nextId = nextId;
  }
  return state;
}

/**
 * Slides every tile in one direction, merging equal neighbours once.
 * Tiles are folded starting from the destination edge, which is what makes
 * [2, 2, 2, 2] become [4, 4] rather than [8].
 */
export function moveTiles(tiles, dir) {
  const byCell = new Map(tiles.map((t) => [t.r * SIZE + t.c, t]));
  const mergedIds = [];
  const nextTiles = [];
  let gained = 0;
  let moved = false;

  for (const line of LINES[dir]) {
    const seq = [];
    for (const cell of line) {
      const tile = byCell.get(cell.r * SIZE + cell.c);
      if (tile) seq.push(tile);
    }

    const slots = [];
    for (const tile of seq) {
      const last = slots[slots.length - 1];
      if (last && last.value === tile.value && !last.merged) {
        last.value *= 2;
        last.merged = true;
        last.absorbed.push(tile.id);
        gained += last.value;
      } else {
        slots.push({ value: tile.value, primaryId: tile.id, absorbed: [], merged: false });
      }
    }

    slots.forEach((slot, index) => {
      const pos = line[index];
      const original = tiles.find((t) => t.id === slot.primaryId);
      if (slot.absorbed.length > 0) {
        moved = true;
        mergedIds.push(slot.primaryId);
      }
      if (original.r !== pos.r || original.c !== pos.c) moved = true;
      nextTiles.push({
        id: slot.primaryId,
        value: slot.value,
        r: pos.r,
        c: pos.c
      });
    });
  }

  return { tiles: nextTiles, gained, moved, mergedIds };
}

export function canMove(tiles) {
  if (tiles.length < SIZE * SIZE) return true;
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  for (const tile of tiles) grid[tile.r][tile.c] = tile.value;
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (c + 1 < SIZE && grid[r][c] === grid[r][c + 1]) return true;
      if (r + 1 < SIZE && grid[r][c] === grid[r + 1][c]) return true;
    }
  }
  return false;
}

export function applyMove(state, dir, rand = Math.random) {
  if (state.status !== 'playing') {
    return { state, changed: false, gained: 0, mergedIds: [], spawnedId: null, justWon: false };
  }

  const result = moveTiles(state.tiles, dir);
  if (!result.moved) {
    return { state, changed: false, gained: 0, mergedIds: [], spawnedId: null, justWon: false };
  }

  const spawn = spawnTile(result.tiles, rand, state.nextId);
  if (spawn.tile) result.tiles.push(spawn.tile);

  const hasWonTile = result.tiles.some((t) => t.value >= 2048);
  const justWon = hasWonTile && !state.won;

  const next = {
    ...state,
    tiles: result.tiles,
    score: state.score + result.gained,
    nextId: spawn.nextId,
    won: state.won || hasWonTile,
    status: canMove(result.tiles) ? 'playing' : 'over'
  };

  return {
    state: next,
    changed: true,
    gained: result.gained,
    mergedIds: result.mergedIds,
    spawnedId: spawn.tile ? spawn.tile.id : null,
    justWon
  };
}
