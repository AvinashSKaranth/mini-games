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
import {
  blankIndex,
  createSolved,
  formatClock as formatSlideClock,
  isSolved as isPuzzleSolved,
  manhattan,
  neighbors as puzzleNeighbors,
  shuffle as shufflePuzzle,
  slide,
  slideDirection
} from '../docs/1player/sliding-puzzle/engine.js';
import {
  SHAPES,
  anchorFor,
  bounds,
  canPlace,
  clearLines,
  emptyBoard,
  fullLines,
  hasMove,
  place,
  randomTray,
  scoreGain,
  shapeFits
} from '../docs/1player/wood-blocks/engine.js';
import { nextBlock, resolveDrop, speedFor } from '../docs/1player/stack/engine.js';
import {
  applyFlap,
  hitsGround,
  hitsPipe,
  nextGapY,
  scoreFrom as flappyScore,
  speedAt as flappySpeed,
  stepVertical
} from '../docs/1player/flappy-jump/engine.js';
import {
  collectsGem,
  freeLanes,
  hitsGap,
  nextRow,
  isOpenRow,
  rowSpacing,
  scoreFrom as runScore,
  speedAt as runSpeed
} from '../docs/1player/ball-run/engine.js';
import {
  aiInput,
  collideBodies,
  dashImpulse,
  normalize,
  ringOut,
  stepBody
} from '../docs/2player/sumo/engine.js';
import {
  KICKS_EACH,
  aiDive,
  decided,
  driftChance,
  flightMs,
  isSave,
  neighborsOf,
  nextKicker,
  resolveKick
} from '../docs/2player/penalty-kicks/engine.js';
import {
  aiChoose,
  boxEdges,
  boxFilledCount,
  claim,
  createGame,
  edgeBoxes,
  evaluateEdge,
  hIndex,
  isComplete as dotsComplete,
  legalEdges,
  vIndex
} from '../docs/2player/dots-and-boxes/engine.js';
import {
  CUP_TARGET,
  chooseEliminated,
  cupWinner,
  formatTap,
  isFalseStart,
  placementLabel,
  rankTaps,
  reactionDelay
} from '../docs/4player/reflex-race/engine.js';
import {
  GOAL_PROGRESS,
  HOME_COLUMNS,
  SAFE,
  STARTS,
  STARS,
  TRACK,
  TRACK_LEN,
  YARDS,
  applyMove as ludoMove,
  cellOf,
  forfeitsSixes,
  hasWon,
  legalMoves as ludoMoves,
  nextSixes,
  rollDie,
  totalProgress,
  trackIndex
} from '../docs/4player/ludo/engine.js';

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

// ---------- Sliding Puzzle ----------
assert.deepEqual(createSolved(3), [1, 2, 3, 4, 5, 6, 7, 8, 0]);
assert.equal(isPuzzleSolved(createSolved(4)), true);
assert.equal(blankIndex([1, 2, 3, 0]), 3);
assert.deepEqual(puzzleNeighbors(5, 4), [1, 9, 4, 6]);

const shuffled4 = shufflePuzzle(4, () => 0.5, 40);
assert.equal(shuffled4.length, 16);
assert.equal(isPuzzleSolved(shuffled4), false);
assert.ok(manhattan(shuffled4, 4) > 0);

assert.equal(slide([1, 2, 3, 4, 5, 6, 7, 8, 0], 8), null, 'blank cannot slide onto itself');
assert.deepEqual(slide([1, 2, 3, 4, 5, 6, 7, 8, 0], 5), [1, 2, 3, 4, 5, 0, 7, 8, 6]);
assert.deepEqual(slideDirection(createSolved(3), 3, 'left'), null, 'no tile right of a bottom-right blank');
assert.deepEqual(slideDirection(createSolved(3), 3, 'up'), null, 'no tile below a bottom-row blank');
const dirMove = slideDirection(createSolved(3), 3, 'down');
assert.deepEqual(dirMove.tiles, [1, 2, 3, 4, 5, 0, 7, 8, 6]);
assert.equal(dirMove.moved, 5);
assert.equal(formatSlideClock(0), '00:00');
assert.equal(formatSlideClock(65), '01:05');

// ---------- Wood Blocks ----------
assert.ok(SHAPES.length > 20);
for (const shape of SHAPES) {
  for (const [r, c] of shape.cells) assert.ok(r >= 0 && c >= 0, `${shape.id} cells are non-negative`);
  assert.equal(new Set(shape.cells.map(([r, c]) => `${r},${c}`)).size, shape.cells.length, `${shape.id} has no duplicates`);
}

const woodBoard = emptyBoard();
assert.equal(canPlace(woodBoard, [[0, 0], [0, 1]], 0, 0), true);
const woodNext = place(woodBoard, [[0, 0], [0, 1]], 0, 0, 3);
assert.deepEqual(woodNext.slice(0, 2), [3, 3]);
assert.equal(woodBoard[0], 0, 'place does not mutate the input');
assert.equal(canPlace(woodBoard, [[0, 0], [0, 1]], -1, 0), false);

const woodFull = emptyBoard();
for (let c = 0; c < 9; c += 1) woodFull[c] = 1;
const woodLines = fullLines(woodFull);
assert.deepEqual(woodLines.rows, [0]);
assert.equal(woodLines.count, 1);
assert.deepEqual(clearLines(woodFull, woodLines).slice(0, 9), Array(9).fill(0));

const woodBox = emptyBoard();
for (let index = 0; index < 9; index += 1) {
  const r = Math.floor(index / 3);
  const c = index % 3;
  woodBox[r * 9 + c] = 2;
}
assert.equal(fullLines(woodBox).count, 1, 'a filled 3x3 box counts as one clear');
assert.equal(scoreGain({ placed: 4, lines: 2, combo: 3 }), 4 + 20 + 10 + 20);
assert.equal(hasMove(emptyBoard(), randomTray(() => 0.3)), true);
assert.equal(hasMove(Array(81).fill(1), randomTray(() => 0.3)), false);
assert.deepEqual(bounds([[0, 0], [1, 0], [1, 1]]), { rows: 2, cols: 2 });
assert.deepEqual(anchorFor([[0, 0], [0, 1]], 0, 0), { row: 0, col: 0 });
assert.equal(shapeFits(emptyBoard(), [[0, 0]]), true);

// ---------- Stack ----------
const tower = { x: 100, width: 80 };
const perfectDrop = resolveDrop(tower, { x: 101, width: 80 });
assert.equal(perfectDrop.perfect, true);
assert.equal(perfectDrop.width, 80);
const sliced = resolveDrop(tower, { x: 140, width: 80 });
assert.equal(sliced.width, 40);
assert.equal(sliced.x, 140);
assert.equal(sliced.offcut.x, 180);
assert.equal(resolveDrop(tower, { x: 190, width: 80 }).missed, true);
assert.equal(speedFor(0) < speedFor(100), true);
assert.equal(speedFor(10_000), 340);
assert.deepEqual(nextBlock(80, 300, -1), { x: 220, width: 80, direction: -1 });

// ---------- Flappy Jump ----------
assert.equal(applyFlap(), -430);
const fall = stepVertical(100, 0, 1 / 60);
assert.ok(fall.y > 100 && fall.vy > 0);
assert.equal(nextGapY(200, () => 0, 80, 400, 110), 90);
assert.equal(nextGapY(90, () => 0, 80, 400, 110), 80, 'gap clamps to the floor');
assert.equal(hitsPipe({ x: 50, y: 100, r: 10 }, { x: 200, w: 50 }, { y: 150, h: 100 }), false);
assert.equal(hitsPipe({ x: 210, y: 60, r: 10 }, { x: 200, w: 50 }, { y: 150, h: 100 }), true);
assert.equal(hitsPipe({ x: 210, y: 150, r: 10 }, { x: 200, w: 50 }, { y: 100, h: 100 }), false);
assert.equal(hitsGround({ y: 95, r: 10 }, 100), true);
assert.equal(hitsGround({ y: 80, r: 10 }, 100), false);
assert.equal(flappyScore(119), 9);
assert.equal(flappyScore(120), 10);
assert.equal(flappySpeed(99_999), 205);

// ---------- Ball Run ----------
let runSeed = 7;
const runRng = () => {
  runSeed = (runSeed * 16807) % 2147483647;
  return (runSeed - 1) / 2147483646;
};
for (let i = 0; i < 300; i += 1) {
  const row = nextRow(runRng);
  assert.equal(isOpenRow(row), true, 'every generated row leaves a free lane');
  assert.ok(freeLanes(row).length >= 1);
}
assert.equal(hitsGap(['gap', null, null], 0, 5, 10), true);
assert.equal(hitsGap(['gap', null, null], 1, 5, 10), false);
assert.equal(hitsGap(['gap', null, null], 0, 99, 10), false, 'far above the gap');
assert.equal(collectsGem(['gap', 'gem', null], 1, 3, 10), true);
assert.equal(runScore(120, 2), 20);
assert.equal(runSpeed(0), 175);
assert.equal(runSpeed(999_999), 330, 'speed clamps at the cap');
assert.equal(rowSpacing(99_999), 108);

// ---------- Sumo ----------
assert.deepEqual(normalize(3, 4), { x: 0.6, y: 0.8 });
assert.deepEqual(normalize(0, 0), { x: 0, y: 0 });
const ring = { cx: 0, cy: 0, r: 200 };
const retreat = aiInput({ x: 190, y: 0 }, { x: -100, y: 0 }, ring, { radius: 30, rng: () => 0.9 });
assert.ok(retreat.x < -0.9, 'the AI retreats toward the centre near the edge');
const push = aiInput({ x: 0, y: 0 }, { x: 160, y: 0 }, ring, { radius: 30, rng: () => 0 });
assert.ok(push.x > 0.9, 'the AI drives outward through the opponent');
let sumoBody = { x: 0, y: 0, vx: 0, vy: 0 };
for (let i = 0; i < 60; i += 1) sumoBody = stepBody(sumoBody, { x: 1, y: 0 }, 1 / 60);
assert.ok(sumoBody.x > 0 && sumoBody.vx <= 195 + 1e-6, 'speed is capped');
const clash = collideBodies({ x: 0, y: 0, vx: 100, vy: 0 }, { x: 55, y: 0, vx: -100, vy: 0 }, 30);
assert.equal(clash.hit, true);
assert.ok(clash.impulse > 0 && clash.a.vx < 0 && clash.b.vx > 0);
assert.equal(collideBodies({ x: 0, y: 0, vx: 0, vy: 0 }, { x: 100, y: 0, vx: 0, vy: 0 }, 30).hit, false);
assert.equal(ringOut({ x: 199, y: 0 }, ring), false);
assert.equal(ringOut({ x: 201, y: 0 }, ring), true);
assert.deepEqual(dashImpulse({ x: 3, y: 4 }), { x: 198, y: 264 });

// ---------- Penalty Kicks ----------
assert.deepEqual(neighborsOf(0), [3, 1]);
assert.equal(driftChance(0.55), 0, 'sweet power never drifts');
assert.ok(driftChance(1) > 0.6);
for (let i = 0; i < 40; i += 1) {
  const kick = resolveKick({ aim: 2, power: 0.55, rng: () => 0 });
  assert.equal(kick.zone, 2);
  assert.equal(kick.wide, false);
}
let wideCount = 0;
for (let i = 0; i < 400; i += 1) {
  const kick = resolveKick({ aim: 4, power: 1, rng: Math.random });
  if (kick.wide) wideCount += 1;
  else if (kick.drifted) assert.notEqual(kick.zone, 4);
  else assert.equal(kick.zone, 4);
}
assert.ok(wideCount > 0, 'overcooked shots sometimes go wide');
assert.ok(flightMs(0) > flightMs(1));
assert.equal(isSave({ zone: 3, keeperZone: 3, arrived: true }), true);
assert.equal(isSave({ zone: 3, keeperZone: 3, arrived: false }), false, 'a dive after landing saves nothing');
assert.equal(isSave({ zone: 3, keeperZone: 1, arrived: true }), false);
for (let i = 0; i < 100; i += 1) assert.ok(aiDive({ aim: 2, rng: Math.random }) >= 0);
assert.equal(KICKS_EACH, 5);
assert.equal(nextKicker([0, 0]), 0);
assert.equal(nextKicker([1, 0]), 1);
assert.equal(nextKicker([5, 5]), 0);
assert.equal(decided([3, 0], [3, 3]), 0);
assert.equal(decided([1, 0], [1, 0]), null);
assert.equal(decided([2, 1], [5, 5]), 0);
assert.equal(decided([0, 0], [5, 5]), null, 'a tied round goes to sudden death');
assert.equal(decided([6, 5], [6, 5]), null, 'the second kicker answers in sudden death');
assert.equal(decided([6, 5], [6, 6]), 0);
assert.equal(decided([5, 3], [5, 3]), null, 'two kicks can still tie it');

// ---------- Dots and Boxes ----------
const dots = createGame(3);
assert.equal(dots.h.length, 12);
assert.equal(dots.v.length, 12);
assert.equal(legalEdges(dots).length, 24);
assert.deepEqual(boxEdges(dots, 0, 0), [
  { kind: 'h', index: hIndex(3, 0, 0) },
  { kind: 'h', index: hIndex(3, 1, 0) },
  { kind: 'v', index: vIndex(3, 0, 0) },
  { kind: 'v', index: vIndex(3, 0, 1) }
]);
assert.equal(edgeBoxes(dots, { kind: 'h', index: hIndex(3, 1, 0) }).length, 2);
assert.equal(edgeBoxes(dots, { kind: 'h', index: hIndex(3, 0, 0) }).length, 1);

let dotsState = claim(dots, { kind: 'h', index: 0 }, 0).game;
dotsState = claim(dotsState, { kind: 'v', index: 0 }, 1).game;
dotsState = claim(dotsState, { kind: 'h', index: 3 }, 1).game;
assert.equal(boxFilledCount(dotsState, 0, 0), 3);
const closed = claim(dotsState, { kind: 'v', index: 1 }, 1);
assert.deepEqual(closed.claimed, [[0, 0]]);
assert.deepEqual(closed.game.scores, [0, 1]);
assert.equal(closed.game.owner[0], 1);
assert.equal(claim(closed.game, { kind: 'v', index: 1 }, 0), null, 'a drawn line cannot be taken twice');
assert.deepEqual(evaluateEdge(dotsState, { kind: 'v', index: 1 }, 1), { gain: 1, leak: 0 });
assert.equal(dotsComplete(dots), false);
assert.equal(dotsComplete(closed.game), false);

let dotsAi = createGame(3);
let dotsPlies = 0;
while (!dotsComplete(dotsAi) && dotsPlies < 400) {
  const choice = aiChoose(dotsAi, Math.random);
  assert.ok(choice, 'the AI always finds a move before the board is full');
  const result = claim(dotsAi, choice, dotsPlies % 2);
  assert.ok(result, 'the AI never picks an illegal edge');
  dotsAi = result.game;
  dotsPlies += 1;
}
assert.equal(dotsComplete(dotsAi), true);
assert.equal(dotsAi.scores[0] + dotsAi.scores[1], 9);

// ---------- Reflex Race ----------
assert.equal(CUP_TARGET, 2);
assert.equal(reactionDelay(() => 0), 950);
assert.equal(reactionDelay(() => 0.9999), 2600);
const heatTaps = [
  { player: 0, seq: 0, time: 402, falseStart: false },
  { player: 1, seq: 1, time: -1, falseStart: true },
  { player: 2, seq: 2, time: 388, falseStart: false },
  { player: 3, seq: 3, time: 355, falseStart: false }
];
assert.equal(chooseEliminated(heatTaps).player, 1, 'the false starter is out first');
assert.equal(chooseEliminated(heatTaps.filter((entry) => !entry.falseStart)).player, 0);
assert.equal(formatTap(heatTaps[1]), 'FST');
assert.equal(formatTap(heatTaps[0]), '402ms');
assert.deepEqual(rankTaps(heatTaps).map((entry) => entry.player), [3, 2, 0, 1]);
assert.equal(isFalseStart(-3), true);
assert.equal(isFalseStart(0), false);
assert.equal(cupWinner([0, 2, 0, 1]), 1);
assert.equal(cupWinner([1, 1, 0, 0]), null);
assert.equal(placementLabel(2), '2nd');

// ---------- Ludo ----------
assert.equal(TRACK_LEN, 56);
for (let i = 0; i < TRACK_LEN; i += 1) {
  const a = TRACK[i];
  const b = TRACK[(i + 1) % TRACK_LEN];
  assert.equal(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]), 1, `track cells ${i} and ${(i + 1) % TRACK_LEN} are neighbours`);
}
assert.equal(new Set(TRACK.map(([r, c]) => `${r},${c}`)).size, TRACK_LEN, 'track cells are unique');
assert.deepEqual(STARTS, [42, 0, 14, 28]);
assert.equal(SAFE.size, 8);
assert.equal(GOAL_PROGRESS, 63);

const rot = ([r, c]) => [c, 14 - r];
const trackSet = new Set(TRACK.map(([r, c]) => `${r},${c}`));
assert.ok(TRACK.map(rot).every(([r, c]) => trackSet.has(`${r},${c}`)), 'the circuit is rotation-symmetric');
for (let p = 1; p < 4; p += 1) {
  const rotated = HOME_COLUMNS[p - 1].map(rot);
  assert.deepEqual(rotated, HOME_COLUMNS[p], `home column ${p} rotates into place`);
  assert.deepEqual(rotated, HOME_COLUMNS[p]);
}

const ludoGame = { tokens: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]] };
assert.deepEqual(ludoMoves(ludoGame, 0, 5), [], 'a five cannot leave the yard');
assert.deepEqual(ludoMoves(ludoGame, 0, 6), [0, 1, 2, 3]);
const entered = ludoMove(ludoGame, 0, 0, 6);
assert.equal(entered.game.tokens[0][0], 1);
assert.equal(entered.entered, true);
assert.deepEqual(cellOf(0, 1), TRACK[STARTS[0]]);
assert.deepEqual(cellOf(0, 0, 2), YARDS[0][2], 'yard tokens park in their own spot');
assert.deepEqual(cellOf(1, GOAL_PROGRESS), [7, 7]);
assert.equal(trackIndex(0, 1), STARTS[0]);
assert.equal(trackIndex(0, GOAL_PROGRESS), -1);

const blockedGame = { tokens: [[4, 8, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]] };
assert.deepEqual(ludoMoves(blockedGame, 0, 4), [1], 'own pieces block non-safe landings');

const captureGame = { tokens: [[1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]] };
const victimCell = trackIndex(0, 2);
let victimProgress = -1;
for (let progress = 1; progress <= TRACK_LEN; progress += 1) {
  if (trackIndex(1, progress) === victimCell) victimProgress = progress;
}
captureGame.tokens[1][0] = victimProgress;
const capture = ludoMove(captureGame, 0, 0, 1);
assert.equal(capture.captured.length, 1);
assert.equal(capture.game.tokens[1][0], 0, 'captured tokens go back to the yard');
assert.equal(SAFE.has(victimCell), false);

const safeGame = { tokens: [[0, 0, 0, 0], [1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]] };
let p0AtSafe = -1;
for (let progress = 1; progress <= TRACK_LEN; progress += 1) {
  if (trackIndex(0, progress) === STARTS[1]) p0AtSafe = progress;
}
safeGame.tokens[0][0] = p0AtSafe - 1;
safeGame.tokens[1][0] = 1;
const safeLanding = ludoMove(safeGame, 0, 0, 1);
assert.equal(safeLanding.captured.length, 0, 'start squares are safe');
assert.equal(safeLanding.game.tokens[1][0], 1);

const homeGame = { tokens: [[GOAL_PROGRESS, GOAL_PROGRESS, GOAL_PROGRESS, GOAL_PROGRESS], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]] };
assert.equal(hasWon(homeGame, 0), true);
assert.equal(hasWon(homeGame, 1), false);
assert.equal(totalProgress(homeGame, 0), GOAL_PROGRESS * 4);
assert.equal(nextSixes(0, 6), 1);
assert.equal(nextSixes(2, 6), 3);
assert.equal(nextSixes(2, 3), 0);
assert.equal(forfeitsSixes(2), false);
assert.equal(forfeitsSixes(3), true);
for (let i = 0; i < 200; i += 1) assert.ok(rollDie() >= 1 && rollDie() <= 7);

console.log('engine tests passed');
