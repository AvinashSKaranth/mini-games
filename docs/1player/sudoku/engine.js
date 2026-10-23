export const SIZE = 9;
export const CELLS = SIZE * SIZE;
const ALL = 0x1ff;

export const CLUES = {
  easy: 44,
  medium: 36,
  hard: 30
};

function popcount(mask) {
  let count = 0;
  let value = mask;
  while (value) {
    value &= value - 1;
    count += 1;
  }
  return count;
}

export function shuffle(list, rand = Math.random) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function boxIndex(index) {
  const r = Math.floor(index / SIZE);
  const c = index % SIZE;
  return Math.floor(r / 3) * 3 + Math.floor(c / 3);
}

function masksFor(board) {
  const rows = new Array(SIZE).fill(0);
  const cols = new Array(SIZE).fill(0);
  const boxes = new Array(SIZE).fill(0);

  for (let i = 0; i < CELLS; i += 1) {
    const value = board[i];
    if (!value) continue;
    const bit = 1 << (value - 1);
    rows[Math.floor(i / SIZE)] |= bit;
    cols[i % SIZE] |= bit;
    boxes[boxIndex(i)] |= bit;
  }
  return { rows, cols, boxes };
}

function candidates(board, index, masks) {
  const r = Math.floor(index / SIZE);
  const c = index % SIZE;
  const b = boxIndex(index);
  return ALL & ~(masks.rows[r] | masks.cols[c] | masks.boxes[b]);
}

export function generateSolved(rand = Math.random) {
  const board = new Array(CELLS).fill(0);
  const masks = {
    rows: new Array(SIZE).fill(0),
    cols: new Array(SIZE).fill(0),
    boxes: new Array(SIZE).fill(0)
  };

  function search() {
    let bestIndex = -1;
    let bestMask = 0;
    let bestCount = 10;

    for (let i = 0; i < CELLS; i += 1) {
      if (board[i]) continue;
      const mask = candidates(board, i, masks);
      const count = popcount(mask);
      if (count === 0) return false;
      if (count < bestCount) {
        bestCount = count;
        bestIndex = i;
        bestMask = mask;
        if (count === 1) break;
      }
    }

    if (bestIndex === -1) return true;

    const values = [];
    let mask = bestMask;
    while (mask) {
      const bit = mask & -mask;
      values.push(Math.log2(bit) + 1);
      mask ^= bit;
    }
    shuffle(values, rand);

    const r = Math.floor(bestIndex / SIZE);
    const c = bestIndex % SIZE;
    const b = boxIndex(bestIndex);

    for (const value of values) {
      const bit = 1 << (value - 1);
      board[bestIndex] = value;
      masks.rows[r] |= bit;
      masks.cols[c] |= bit;
      masks.boxes[b] |= bit;
      if (search()) return true;
      board[bestIndex] = 0;
      masks.rows[r] &= ~bit;
      masks.cols[c] &= ~bit;
      masks.boxes[b] &= ~bit;
    }
    return false;
  }

  search();
  return board;
}

/** Counts solutions, stopping at `limit`. Used to guarantee a unique answer. */
export function countSolutions(puzzle, limit = 2) {
  const board = puzzle.slice();
  const masks = masksFor(board);
  let count = 0;

  function search() {
    if (count >= limit) return;

    let bestIndex = -1;
    let bestMask = 0;
    let bestCount = 10;

    for (let i = 0; i < CELLS; i += 1) {
      if (board[i]) continue;
      const mask = candidates(board, i, masks);
      const n = popcount(mask);
      if (n === 0) return;
      if (n < bestCount) {
        bestCount = n;
        bestIndex = i;
        bestMask = mask;
        if (n === 1) break;
      }
    }

    if (bestIndex === -1) {
      count += 1;
      return;
    }

    const r = Math.floor(bestIndex / SIZE);
    const c = bestIndex % SIZE;
    const b = boxIndex(bestIndex);
    let mask = bestMask;

    while (mask) {
      const bit = mask & -mask;
      mask ^= bit;
      const value = Math.log2(bit) + 1;
      board[bestIndex] = value;
      masks.rows[r] |= bit;
      masks.cols[c] |= bit;
      masks.boxes[b] |= bit;
      search();
      board[bestIndex] = 0;
      masks.rows[r] &= ~bit;
      masks.cols[c] &= ~bit;
      masks.boxes[b] &= ~bit;
      if (count >= limit) return;
    }
  }

  search();
  return count;
}

export function conflicts(puzzle) {
  const bad = new Set();
  const groups = [];

  for (let r = 0; r < SIZE; r += 1) {
    groups.push(Array.from({ length: SIZE }, (_, c) => r * SIZE + c));
  }
  for (let c = 0; c < SIZE; c += 1) {
    groups.push(Array.from({ length: SIZE }, (_, r) => r * SIZE + c));
  }
  for (let br = 0; br < 3; br += 1) {
    for (let bc = 0; bc < 3; bc += 1) {
      const group = [];
      for (let r = 0; r < 3; r += 1) {
        for (let c = 0; c < 3; c += 1) {
          group.push((br * 3 + r) * SIZE + bc * 3 + c);
        }
      }
      groups.push(group);
    }
  }

  for (const group of groups) {
    const seen = new Map();
    for (const index of group) {
      const value = puzzle[index];
      if (!value) continue;
      if (seen.has(value)) {
        bad.add(index);
        bad.add(seen.get(value));
      } else {
        seen.set(value, index);
      }
    }
  }
  return bad;
}

export function isSolved(puzzle) {
  return puzzle.every((value) => value >= 1 && value <= 9);
}

export function generatePuzzle(difficulty = 'medium', rand = Math.random) {
  const target = CLUES[difficulty] ?? CLUES.medium;
  const solution = generateSolved(rand);
  const puzzle = solution.slice();
  let remaining = CELLS;
  const order = shuffle(Array.from({ length: CELLS }, (_, i) => i), rand);

  // Remove matching pairs first so the finished grid looks symmetrical.
  for (const index of order) {
    if (remaining <= target + 1) break;
    const mirror = CELLS - 1 - index;
    if (mirror === index || !puzzle[index] || !puzzle[mirror]) continue;
    const savedA = puzzle[index];
    const savedB = puzzle[mirror];
    puzzle[index] = 0;
    puzzle[mirror] = 0;
    if (countSolutions(puzzle, 2) === 1) {
      remaining -= 2;
    } else {
      puzzle[index] = savedA;
      puzzle[mirror] = savedB;
    }
  }

  // Fill the gap with single removals when the clue target is very low.
  for (const index of order) {
    if (remaining <= target) break;
    if (!puzzle[index]) continue;
    const saved = puzzle[index];
    puzzle[index] = 0;
    if (countSolutions(puzzle, 2) === 1) {
      remaining -= 1;
    } else {
      puzzle[index] = saved;
    }
  }

  return { puzzle, solution, clues: remaining };
}

export function formatTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
