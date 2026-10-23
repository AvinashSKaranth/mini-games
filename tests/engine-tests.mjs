import assert from 'node:assert/strict';
import { moveTiles, applyMove, newGame, canMove } from '../docs/1player/2048/engine.js';
import {
  createBoard,
  placeMines,
  revealCell,
  toggleFlag,
  chord,
  isWin,
  neighbors,
  remainingMines
} from '../docs/1player/minesweeper/engine.js';
import {
  generateSolved,
  generatePuzzle,
  countSolutions,
  conflicts,
  isSolved,
  formatTime
} from '../docs/1player/sudoku/engine.js';

// ---------- 2048 ----------
const tile = (value, r, c, id) => ({ id, value, r, c });
let result = moveTiles(
  [tile(2, 0, 0, 1), tile(2, 0, 1, 2), tile(4, 0, 2, 3), tile(4, 0, 3, 4)],
  'left'
);
assert.deepEqual(result.tiles.map((t) => t.value), [4, 8]);
assert.equal(result.gained, 12);

result = moveTiles(
  [tile(2, 0, 0, 1), tile(2, 0, 1, 2), tile(2, 0, 2, 3), tile(2, 0, 3, 4)],
  'left'
);
assert.deepEqual(result.tiles.map((t) => t.value), [4, 4]);
assert.equal(result.gained, 8);

result = moveTiles([tile(4, 0, 0, 1), tile(2, 0, 1, 2), tile(2, 0, 2, 3)], 'left');
assert.deepEqual(result.tiles.map((t) => t.value), [4, 4]);
assert.equal(result.gained, 4);

result = moveTiles([tile(2, 2, 0, 1), tile(2, 0, 0, 2)], 'up');
assert.deepEqual(result.tiles.map((t) => t.value), [4]);
assert.equal(result.gained, 4);

result = moveTiles([tile(2, 0, 0, 1)], 'right');
assert.deepEqual(result.tiles[0], { id: 1, value: 2, r: 0, c: 3 });
assert.equal(result.moved, true);

const state = newGame(() => 0.5);
const moved = applyMove(state, 'left', () => 0.5);
assert.equal(moved.changed, true);
assert.equal(moved.state.tiles.length, 3);

const full = [];
for (let r = 0; r < 4; r += 1) {
  for (let c = 0; c < 4; c += 1) {
    const value = r === 3 && c === 3 ? 8 : (r + c) % 2 === 0 ? 2 : 4;
    full.push(tile(value, r, c, r * 4 + c + 1));
  }
}
assert.equal(canMove(full), false);
full[15] = tile(4, 3, 3, 16);
assert.equal(canMove(full), true);

// ---------- Minesweeper ----------
const board = createBoard(9, 9);
placeMines(board, 10, 40, () => 0.42);
assert.equal(board.cells.filter((cell) => cell.mine).length, 10);
for (const index of [40, ...neighbors(40, 9, 9)]) {
  assert.equal(board.cells[index].mine, false, 'first click safe zone');
}
const first = revealCell(board, 40);
assert.equal(first.hitMine, false);
assert.ok(first.revealed.length >= 1);
assert.equal(remainingMines(board, 10), 10);
toggleFlag(board, 0);
assert.equal(remainingMines(board, 10), 9);
toggleFlag(board, 0);
assert.equal(remainingMines(board, 10), 10);

const mineIndex = board.cells.findIndex((cell) => cell.mine);
const boom = revealCell(board, mineIndex);
assert.equal(boom.hitMine, true);

const small = createBoard(3, 3);
small.cells[4].mine = true;
for (let i = 0; i < 9; i += 1) {
  if (i !== 4) {
    small.cells[i].count = neighbors(i, 3, 3).filter((n) => small.cells[n].mine).length;
  }
}
small.cells[0].revealed = true;
small.cells[4].flagged = true;
const chained = chord(small, 0);
assert.ok(chained);
assert.equal(chained.hitMine, false);
assert.equal(small.cells[1].revealed, true);
assert.equal(small.cells[3].revealed, true);

const winBoard = createBoard(2, 2);
winBoard.cells[3].mine = true;
for (const index of [0, 1, 2]) winBoard.cells[index].revealed = true;
assert.equal(isWin(winBoard), true);

// ---------- Sudoku ----------
// Small deterministic PRNG so puzzle generation is reproducible in CI.
function mulberry32(seed) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const solved = generateSolved(mulberry32(7));
assert.equal(solved.length, 81);
assert.equal(isSolved(solved), true);
assert.equal(conflicts(solved).size, 0);

const generated = generatePuzzle('medium', mulberry32(42));
assert.equal(generated.puzzle.length, 81);
assert.equal(generated.puzzle.filter(Boolean).length, generated.clues);
assert.equal(conflicts(generated.puzzle).size, 0);
assert.equal(countSolutions(generated.puzzle, 2), 1);
for (let i = 0; i < 81; i += 1) {
  if (generated.puzzle[i]) assert.equal(generated.puzzle[i], generated.solution[i]);
}

assert.equal(formatTime(0), '00:00');
assert.equal(formatTime(65), '01:05');
assert.equal(formatTime(3599), '59:59');

console.log('engine tests passed');
