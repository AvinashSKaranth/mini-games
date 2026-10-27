// Pure rules for Wood Blocks: piece catalog, placement, line clearing, scoring.

export const BOARD_SIZE = 9;
export const BOX = 3;
export const TRAY_SIZE = 3;

/**
 * Shape catalog. Cells are [row, col] offsets from the piece's top-left anchor.
 * Both orientations of elongated pieces are listed so no rotation is needed.
 */
export const SHAPES = [
  { id: 'dot', weight: 1, cells: [[0, 0]] },

  { id: 'd2h', weight: 4, cells: [[0, 0], [0, 1]] },
  { id: 'd2v', weight: 4, cells: [[0, 0], [1, 0]] },

  { id: 'l3h', weight: 4, cells: [[0, 0], [0, 1], [0, 2]] },
  { id: 'l3v', weight: 4, cells: [[0, 0], [1, 0], [2, 0]] },

  { id: 'c3a', weight: 5, cells: [[0, 0], [1, 0], [1, 1]] },
  { id: 'c3b', weight: 5, cells: [[0, 0], [0, 1], [1, 0]] },
  { id: 'c3c', weight: 5, cells: [[0, 0], [0, 1], [1, 1]] },
  { id: 'c3d', weight: 5, cells: [[0, 1], [1, 0], [1, 1]] },

  { id: 'sq2', weight: 4, cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },

  { id: 'l4h', weight: 3, cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
  { id: 'l4v', weight: 3, cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },

  { id: 'j4a', weight: 4, cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
  { id: 'j4b', weight: 4, cells: [[0, 0], [0, 1], [0, 2], [1, 0]] },
  { id: 'j4c', weight: 4, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  { id: 'j4d', weight: 4, cells: [[0, 0], [0, 1], [0, 2], [1, 2]] },
  { id: 'j4e', weight: 4, cells: [[0, 0], [0, 1], [1, 0], [2, 0]] },
  { id: 'j4f', weight: 4, cells: [[0, 0], [1, 0], [1, 1], [1, 2]] },
  { id: 'j4g', weight: 4, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  { id: 'j4h', weight: 4, cells: [[0, 2], [1, 0], [1, 1], [1, 2]] },

  { id: 't4a', weight: 3, cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
  { id: 't4b', weight: 3, cells: [[0, 0], [1, 0], [2, 0], [1, 1]] },
  { id: 't4c', weight: 3, cells: [[0, 1], [1, 0], [1, 1], [2, 1]] },
  { id: 't4d', weight: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1] ] },

  { id: 's4a', weight: 3, cells: [[0, 1], [0, 2], [1, 0], [1, 1]] },
  { id: 's4b', weight: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  { id: 'z4a', weight: 3, cells: [[0, 0], [0, 1], [1, 1], [1, 2]] },
  { id: 'z4b', weight: 3, cells: [[0, 1], [1, 0], [1, 1], [2, 0]] },

  { id: 'l5h', weight: 2, cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
  { id: 'l5v', weight: 2, cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
  { id: 'p5a', weight: 3, cells: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0]] },
  { id: 'p5b', weight: 3, cells: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 1]] },
  { id: 'p5c', weight: 3, cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]] },
  { id: 'p5d', weight: 3, cells: [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]] }
];

const WEIGHTED = SHAPES;

export function emptyBoard(size = BOARD_SIZE) {
  return new Array(size * size).fill(0);
}

export function shapeById(id) {
  return SHAPES.find((shape) => shape.id === id) || SHAPES[0];
}

/** Bounding box of a shape's cells: {rows, cols}. */
export function bounds(cells) {
  let rows = 0;
  let cols = 0;
  for (const [r, c] of cells) {
    rows = Math.max(rows, r + 1);
    cols = Math.max(cols, c + 1);
  }
  return { rows, cols };
}

export function randomShape(rng = Math.random) {
  const total = WEIGHTED.reduce((sum, shape) => sum + shape.weight, 0);
  let roll = rng() * total;
  for (const shape of WEIGHTED) {
    roll -= shape.weight;
    if (roll <= 0) return shape;
  }
  return WEIGHTED[0];
}

export function randomTray(rng = Math.random) {
  const tray = [];
  for (let index = 0; index < TRAY_SIZE; index += 1) tray.push(randomShape(rng));
  return tray;
}

/** Anchor position for a shape centred on (row, col), clamped inside the board. */
export function anchorFor(cells, row, col, size = BOARD_SIZE) {
  const { rows, cols } = bounds(cells);
  const targetRow = row - Math.floor((rows - 1) / 2);
  const targetCol = col - Math.floor((cols - 1) / 2);
  return {
    row: Math.max(0, Math.min(size - rows, targetRow)),
    col: Math.max(0, Math.min(size - cols, targetCol))
  };
}

export function canPlace(board, cells, row, col, size = BOARD_SIZE) {
  for (const [dr, dc] of cells) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || c < 0 || r >= size || c >= size) return false;
    if (board[r * size + c]) return false;
  }
  return true;
}

/** Returns a copy of the board with the piece stamped in `color`, or null when illegal. */
export function place(board, cells, row, col, color, size = BOARD_SIZE) {
  if (!canPlace(board, cells, row, col, size)) return null;
  const next = board.slice();
  for (const [dr, dc] of cells) next[(row + dr) * size + (col + dc)] = color;
  return next;
}

/** Every fully occupied row, column, and 3×3 box on the board. */
export function fullLines(board, size = BOARD_SIZE) {
  const rows = [];
  const cols = [];
  const boxes = [];

  for (let r = 0; r < size; r += 1) {
    let full = true;
    for (let c = 0; c < size; c += 1) if (!board[r * size + c]) { full = false; break; }
    if (full) rows.push(r);
  }

  for (let c = 0; c < size; c += 1) {
    let full = true;
    for (let r = 0; r < size; r += 1) if (!board[r * size + c]) { full = false; break; }
    if (full) cols.push(c);
  }

  const boxSize = size === BOARD_SIZE ? BOX : Math.sqrt(size);
  if (Number.isInteger(boxSize)) {
    for (let br = 0; br < size; br += boxSize) {
      for (let bc = 0; bc < size; bc += boxSize) {
        let full = true;
        for (let r = br; r < br + boxSize && full; r += 1) {
          for (let c = bc; c < bc + boxSize; c += 1) {
            if (!board[r * size + c]) { full = false; break; }
          }
        }
        if (full) boxes.push([br, bc]);
      }
    }
  }

  return { rows, cols, boxes, count: rows.length + cols.length + boxes.length };
}

/** Cell indexes cleared by a set of full lines. */
export function clearedIndexes(lines, size = BOARD_SIZE) {
  const indexes = new Set();
  for (const r of lines.rows) {
    for (let c = 0; c < size; c += 1) indexes.add(r * size + c);
  }
  for (const c of lines.cols) {
    for (let r = 0; r < size; r += 1) indexes.add(r * size + c);
  }
  const boxSize = size === BOARD_SIZE ? BOX : Math.sqrt(size);
  for (const [br, bc] of lines.boxes) {
    for (let r = br; r < br + boxSize; r += 1) {
      for (let c = bc; c < bc + boxSize; c += 1) indexes.add(r * size + c);
    }
  }
  return [...indexes];
}

export function clearLines(board, lines, size = BOARD_SIZE) {
  const next = board.slice();
  for (const index of clearedIndexes(lines, size)) next[index] = 0;
  return next;
}

/** Points for one placement: cells down, clears up, multi-line and chain bonuses. */
export function scoreGain({ placed = 0, lines = 0, combo = 0 }) {
  const base = placed;
  const clear = lines * 10;
  const chain = lines > 1 ? (lines - 1) * lines * 5 : 0;
  const bonus = combo > 1 ? (combo - 1) * 10 : 0;
  return base + clear + chain + bonus;
}

/** True when at least one tray piece still fits somewhere on the board. */
export function hasMove(board, tray, size = BOARD_SIZE) {
  for (const shape of tray) {
    if (!shape) continue;
    if (shapeFits(board, shape.cells, size)) return true;
  }
  return false;
}

export function shapeFits(board, cells, size = BOARD_SIZE) {
  const { rows, cols } = bounds(cells);
  for (let row = 0; row + rows <= size; row += 1) {
    for (let col = 0; col + cols <= size; col += 1) {
      if (canPlace(board, cells, row, col, size)) return true;
    }
  }
  return false;
}
