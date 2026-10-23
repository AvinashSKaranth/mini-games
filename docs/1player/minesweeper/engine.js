export const LEVELS = {
  easy: { rows: 9, cols: 9, mines: 10, label: 'Easy' },
  medium: { rows: 12, cols: 12, mines: 24, label: 'Medium' },
  hard: { rows: 16, cols: 16, mines: 45, label: 'Hard' }
};

export function createBoard(rows, cols) {
  return {
    rows,
    cols,
    cells: Array.from({ length: rows * cols }, () => ({
      mine: false,
      count: 0,
      revealed: false,
      flagged: false
    }))
  };
}

export function neighbors(index, rows, cols) {
  const r = Math.floor(index / cols);
  const c = index % cols;
  const out = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (!dr && !dc) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(nr * cols + nc);
    }
  }
  return out;
}

function shuffle(list, rand) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/** Places mines after the first tap, keeping the tapped cell and its ring clear. */
export function placeMines(board, mineCount, safeIndex, rand = Math.random) {
  const total = board.rows * board.cols;
  const safe = new Set([safeIndex, ...neighbors(safeIndex, board.rows, board.cols)]);
  let pool = [];
  for (let i = 0; i < total; i += 1) {
    if (!safe.has(i)) pool.push(i);
  }
  if (pool.length < mineCount) {
    pool = [];
    for (let i = 0; i < total; i += 1) {
      if (i !== safeIndex) pool.push(i);
    }
  }

  shuffle(pool, rand);
  for (const index of pool.slice(0, mineCount)) {
    board.cells[index].mine = true;
  }

  for (let i = 0; i < total; i += 1) {
    if (board.cells[i].mine) continue;
    board.cells[i].count = neighbors(i, board.rows, board.cols)
      .filter((n) => board.cells[n].mine).length;
  }
  return board;
}

export function revealCell(board, index) {
  const cell = board.cells[index];
  if (!cell || cell.revealed || cell.flagged) return { hitMine: false, revealed: [] };
  if (cell.mine) {
    cell.revealed = true;
    return { hitMine: true, revealed: [index] };
  }

  const revealed = [];
  const stack = [index];
  while (stack.length) {
    const current = stack.pop();
    const currentCell = board.cells[current];
    if (currentCell.revealed || currentCell.flagged) continue;
    currentCell.revealed = true;
    revealed.push(current);
    if (currentCell.count === 0) {
      for (const n of neighbors(current, board.rows, board.cols)) {
        if (!board.cells[n].revealed && !board.cells[n].flagged) stack.push(n);
      }
    }
  }
  return { hitMine: false, revealed };
}

export function toggleFlag(board, index) {
  const cell = board.cells[index];
  if (!cell || cell.revealed) return false;
  cell.flagged = !cell.flagged;
  return true;
}

/** Reveals the neighbours of a number when the matching flags are placed. */
export function chord(board, index) {
  const cell = board.cells[index];
  if (!cell || !cell.revealed || cell.count === 0) return null;

  const around = neighbors(index, board.rows, board.cols);
  const flags = around.filter((n) => board.cells[n].flagged).length;
  if (flags !== cell.count) return null;

  let hitMine = false;
  const revealed = [];
  for (const n of around) {
    if (board.cells[n].flagged || board.cells[n].revealed) continue;
    const result = revealCell(board, n);
    hitMine = hitMine || result.hitMine;
    revealed.push(...result.revealed);
  }
  return { hitMine, revealed };
}

export function countFlags(board) {
  return board.cells.filter((cell) => cell.flagged).length;
}

export function remainingMines(board, mineCount) {
  return mineCount - countFlags(board);
}

export function isWin(board) {
  return board.cells.every((cell) => cell.mine || cell.revealed);
}

export function revealAllMines(board) {
  for (const cell of board.cells) {
    if (cell.mine) cell.revealed = true;
  }
}

export function formatTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
