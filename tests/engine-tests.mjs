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
import {
  accuracyFrom,
  nextWind,
  rankPlayers,
  resolveShot,
  scoreFor,
  windDrift
} from '../docs/4player/archery/engine.js';
import {
  GOAL,
  formatSeconds,
  levelFor,
  makeQuestion,
  rankPlayers as rankRacers
} from '../docs/4player/math-race/engine.js';
import {
  MAX_MISSES,
  WORDS as HANGMAN_WORDS,
  isSolved as isHangmanSolved,
  livesLeft,
  maskWord,
  missingLetters,
  pickWord,
  wrongLetters
} from '../docs/1player/hangman/engine.js';
import {
  CAPACITY,
  LEVELS,
  canPour,
  generateTubes,
  isComplete,
  isSolvable,
  isUniform,
  pour,
  topRun
} from '../docs/1player/water-sort/engine.js';

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

// ---------- Archery ----------
assert.equal(scoreFor(0, 0).score, 10);
assert.equal(scoreFor(4.9, 0).score, 10);
assert.equal(scoreFor(5.1, 0).score, 9);
assert.equal(scoreFor(12, 0).score, 8);
assert.equal(scoreFor(0, 49.9).score, 1);
assert.equal(scoreFor(0, 50.5).score, 0);
assert.equal(scoreFor(0, 50.5).onTarget, false);

assert.equal(windDrift(2), 13);
assert.equal(windDrift(-2), -13);
assert.equal(windDrift(-9), -13);
assert.equal(windDrift(0.5), 3.25);

assert.equal(accuracyFrom(50), 1);
assert.equal(accuracyFrom(0), 0);
assert.equal(accuracyFrom(100), 0);
assert.equal(accuracyFrom(75), 0.5);

const perfect = resolveShot({ aimX: 50, aimY: 50, wind: 0, accuracy: 1, rng: () => 0 });
assert.equal(perfect.score, 10);
assert.equal(perfect.onTarget, true);

const drifted = resolveShot({ aimX: 50, aimY: 50, wind: 1, accuracy: 1, rng: () => 0 });
assert.equal(drifted.score, 9);

const wild = resolveShot({ aimX: 50, aimY: 50, wind: 0, accuracy: 0, rng: () => 0.5 });
assert.equal(wild.onTarget, true);
assert.equal(wild.score, 6);

const miss = resolveShot({ aimX: 96, aimY: 50, wind: 2, accuracy: 0.2, rng: () => 0 });
assert.equal(miss.onTarget, false);
assert.equal(miss.score, 0);

assert.equal(nextWind(() => 0), -2);
assert.equal(nextWind(() => 0.999), 2);
assert.equal(nextWind(() => 0.5), 0);

const ranking = rankPlayers([14, 14, 9, 3], [0, 2, 1, 0]);
assert.deepEqual(ranking.map((entry) => entry.index), [1, 0, 2, 3]);
assert.deepEqual(rankPlayers([5, 6, 7, 8]).map((entry) => entry.index), [3, 2, 1, 0]);

// ---------- Math Race ----------
const questionRng = mulberry32(11);
for (let level = 1; level <= 8; level += 1) {
  for (let i = 0; i < 40; i += 1) {
    const question = makeQuestion(level, questionRng);
    const expected =
      question.op === '+' ? question.a + question.b : question.op === '−' ? question.a - question.b : question.a * question.b;
    assert.equal(question.answer, expected, `level ${level} ${question.a} ${question.op} ${question.b}`);
    assert.equal(question.options.length, 3);
    assert.ok(question.options.includes(question.answer));
    assert.equal(new Set(question.options).size, 3, 'options are unique');
    for (const option of question.options) assert.ok(option >= 0, 'no negative options');
    if (level <= 2) assert.ok(question.a + question.b <= 18);
  }
}

assert.equal(levelFor(0), 1);
assert.equal(levelFor(4), 4);
assert.equal(levelFor(GOAL), 8);
assert.equal(levelFor(99), 8);

assert.deepEqual(rankRacers([8, 3, 0, 1]).map((entry) => entry.index), [0, 1, 3, 2]);
assert.deepEqual(rankRacers([2, 2, 0, 0]).map((entry) => entry.index), [0, 1, 2, 3]);
assert.equal(formatSeconds(1500), '1.5s');
assert.equal(formatSeconds(0), '0.0s');

// ---------- Hangman ----------
assert.equal(MAX_MISSES, 6);
assert.deepEqual(pickWord(() => 0), { word: 'TIGER', category: 'Animals' });
assert.deepEqual(pickWord(() => 0, 'TIGER'), { word: 'GIRAFFE', category: 'Animals' });
assert.deepEqual(pickWord(() => 0.999), { word: 'CLARINET', category: 'Music' });
for (const entry of HANGMAN_WORDS) {
  assert.match(entry.word, /^[A-Z]+$/, `${entry.word} is upper-case letters only`);
  assert.ok(entry.category.length > 0, `${entry.word} has a category`);
}

assert.deepEqual(maskWord('TIGER', new Set(['T', 'G'])), ['T', null, 'G', null, null]);
assert.equal(isHangmanSolved('TIGER', new Set([...'TIGER'])), true);
assert.equal(isHangmanSolved('TIGER', new Set([...'TIGE'])), false);
assert.deepEqual(wrongLetters('TIGER', new Set(['T', 'A', 'B'])), ['A', 'B']);
assert.equal(livesLeft('TIGER', new Set(['T', 'A', 'B'])), MAX_MISSES - 2);
assert.deepEqual(missingLetters('BANANA', new Set(['B'])), ['A', 'N']);
assert.deepEqual(missingLetters('BANANA', new Set([...'BAN'])), []);

// ---------- Water Sort ----------
assert.equal(CAPACITY, 4);
assert.equal(topRun([]), 0);
assert.equal(topRun([0, 1, 1, 1]), 3);
assert.equal(topRun([0, 0, 1]), 1);
assert.equal(isUniform([]), true);
assert.equal(isUniform([2, 2]), true);
assert.equal(isUniform([2, 1]), false);
assert.equal(isComplete([[0, 0], [], [1, 1, 1, 1]]), true);
assert.equal(isComplete([[0, 1], [], [1, 1, 1]]), false);

const tubes = [[0, 1, 0, 1], [1, 0, 1, 0], [], []];
assert.equal(canPour(tubes, 0, 2), true);
assert.equal(canPour(tubes, 0, 1), false);
assert.equal(canPour(tubes, 0, 0), false);
assert.equal(canPour([[0, 0, 0, 0], [0, 0, 0, 0]], 0, 1), false, 'full target');
assert.equal(pour(tubes, 0, 1), null);

const poured = pour(tubes, 0, 2);
assert.deepEqual(poured.tubes[0], [0, 1, 0]);
assert.deepEqual(poured.tubes[2], [1]);
assert.equal(poured.moved, 1);
assert.deepEqual(tubes[0], [0, 1, 0, 1], 'pour does not mutate the input');

const stacked = pour([[0, 0, 1, 1], [1, 1], []], 0, 1);
assert.deepEqual(stacked.tubes[1], [1, 1, 1, 1]);
assert.deepEqual(stacked.tubes[0], [0, 0]);
assert.equal(stacked.moved, 2);

const partial = pour([[0, 1], [], [1]], 0, 1);
assert.deepEqual(partial.tubes[1], [1]);
assert.equal(partial.moved, 1);

for (const level of Object.keys(LEVELS)) {
  const dealt = generateTubes(level, mulberry32(3));
  assert.equal(dealt.length, LEVELS[level].colors + LEVELS[level].empty, `${level} tube count`);
  assert.equal(
    dealt.reduce((total, tube) => total + tube.length, 0),
    LEVELS[level].colors * CAPACITY,
    `${level} unit count`
  );
  assert.equal(isComplete(dealt), false, `${level} deal starts unsolved`);
  assert.equal(isSolvable(dealt), true, `${level} deal is solvable`);
}

assert.equal(isSolvable([[0, 1], [1, 0], [], []]), true);

console.log('engine tests passed');
