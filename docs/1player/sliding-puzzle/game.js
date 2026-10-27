import { softRefresh } from '../../shared/refresh.js';
import { SIZES, blankIndex, formatClock, isSolved, shuffle, slide, slideDirection } from './engine.js';

const $ = (id) => document.getElementById(id);
const SIZE_KEY = 'mini-games:sliding-puzzle:size';
const BEST_KEY = 'mini-games:sliding-puzzle:best';

const boardWrap = document.querySelector('.board-wrap');
const boardEl = $('board');
const movesEl = $('moves');
const timeEl = $('time');
const bestEl = $('best');
const undoBtn = $('undo');
const newPuzzleBtn = $('new-puzzle');
const newGameBtn = $('new-game');
const statusEl = $('status');
const veil = $('veil');
const veilEyebrow = $('veil-eyebrow');
const veilCopy = $('veil-copy');
const veilStats = $('veil-stats');
const veilPrimary = $('veil-primary');
const sizeButtons = [...document.querySelectorAll('.difficulty button')];

boardEl.setAttribute('tabindex', '-1');

let level = loadLevel();
let size = SIZES[level].size;
let tiles = [];
let history = [];
let moves = 0;
let startedAt = null;
let elapsed = 0;
let tickId = null;
let solved = false;
let token = 0;
let cells = [];
let best = loadBest();

function loadLevel() {
  try {
    const saved = localStorage.getItem(SIZE_KEY);
    return saved && SIZES[saved] ? saved : 'easy';
  } catch {
    return 'easy';
  }
}

function saveLevel() {
  try {
    localStorage.setItem(SIZE_KEY, level);
  } catch {
    /* storage is optional */
  }
}

function loadBest() {
  const base = { easy: 0, medium: 0, hard: 0 };
  try {
    const saved = JSON.parse(localStorage.getItem(BEST_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return base;
    for (const key of Object.keys(base)) {
      const value = Number(saved[key]);
      if (Number.isFinite(value) && value > 0) base[key] = value;
    }
  } catch {
    /* ignore bad data */
  }
  return base;
}

function saveBest() {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {
    /* storage is optional */
  }
}

function clearTimer() {
  if (tickId !== null) {
    window.clearInterval(tickId);
    tickId = null;
  }
}

function currentSeconds() {
  if (startedAt === null) return elapsed;
  return elapsed + (Date.now() - startedAt) / 1000;
}

function startTimer() {
  if (startedAt !== null) return;
  startedAt = Date.now();
  tickId = window.setInterval(() => {
    timeEl.textContent = formatClock(currentSeconds());
  }, 250);
}

function stopTimer() {
  if (startedAt !== null) {
    elapsed += (Date.now() - startedAt) / 1000;
    startedAt = null;
  }
  clearTimer();
  timeEl.textContent = formatClock(elapsed);
}

function buildBoard() {
  boardEl.replaceChildren();
  boardEl.dataset.size = String(size);
  cells = [];
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < size * size; index += 1) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'tile';
    cell.dataset.index = String(index);
    cell.addEventListener('click', () => tapTile(index));
    fragment.appendChild(cell);
    cells.push(cell);
  }

  boardEl.appendChild(fragment);
}

function render(movedTo = -1) {
  const blank = blankIndex(tiles);
  const movable = new Set();

  if (!solved) {
    const row = Math.floor(blank / size);
    const col = blank % size;
    if (row > 0) movable.add(blank - size);
    if (row < size - 1) movable.add(blank + size);
    if (col > 0) movable.add(blank - 1);
    if (col < size - 1) movable.add(blank + 1);
  }

  for (let index = 0; index < tiles.length; index += 1) {
    const cell = cells[index];
    const value = tiles[index];

    if (value === 0) {
      cell.textContent = '';
      cell.disabled = true;
      cell.classList.add('is-blank');
      cell.classList.remove('is-movable', 'is-goal');
      cell.setAttribute('aria-label', 'Empty slot');
    } else {
      cell.textContent = String(value);
      cell.disabled = solved;
      cell.classList.remove('is-blank');
      cell.classList.toggle('is-movable', movable.has(index));
      cell.classList.toggle('is-goal', value === index + 1);
      cell.setAttribute(
        'aria-label',
        `Tile ${value}, row ${Math.floor(index / size) + 1} column ${(index % size) + 1}`
      );
    }

    cell.classList.remove('is-moved');
    if (index === movedTo) {
      void cell.offsetWidth;
      cell.classList.add('is-moved');
    }
  }
}

function updateMeta() {
  movesEl.textContent = String(moves);
  timeEl.textContent = formatClock(currentSeconds());
  bestEl.textContent = best[level] ? formatClock(best[level]) : '—';
  undoBtn.disabled = solved || history.length === 0;
}

function finish() {
  solved = true;
  stopTimer();

  const previous = best[level];
  const seconds = Math.max(1, Math.round(elapsed));
  const isBest = !previous || seconds < previous;
  if (isBest) {
    best[level] = seconds;
    saveBest();
  }
  updateMeta();
  render();

  veilEyebrow.textContent = 'Puzzle solved';
  veilCopy.textContent = previous
    ? `Solved in ${moves} moves and ${formatClock(elapsed)}. Best time ${formatClock(best[level])}.`
    : `Solved in ${moves} moves and ${formatClock(elapsed)}. That is your new best.`;

  veilStats.replaceChildren();
  for (const [term, value] of [
    ['Moves', moves],
    ['Time', formatClock(elapsed)],
    ['Best', formatClock(best[level])]
  ]) {
    const cell = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = term;
    dd.textContent = value;
    cell.append(dt, dd);
    veilStats.appendChild(cell);
  }

  veil.hidden = false;
  veilPrimary.focus({ preventScroll: true });
  statusEl.textContent = `Puzzle solved in ${moves} moves and ${formatClock(elapsed)}.`;
}

function commit(next, movedTo) {
  history.push(tiles);
  tiles = next;
  moves += 1;
  startTimer();
  render(movedTo);
  updateMeta();

  if (isSolved(tiles)) {
    finish();
    return;
  }
  statusEl.textContent = `${moves} ${moves === 1 ? 'move' : 'moves'} played.`;
}

function tapTile(index) {
  if (solved) return;
  const next = slide(tiles, index);
  if (!next) {
    statusEl.textContent = 'Only tiles next to the gap can slide.';
    return;
  }
  commit(next, blankIndex(tiles));
}

function moveBy(dir) {
  if (solved) return;
  const before = blankIndex(tiles);
  const result = slideDirection(tiles, size, dir);
  if (!result) {
    statusEl.textContent = `No tile moves ${dir} into the gap.`;
    return;
  }
  commit(result.tiles, before);
}

function undo() {
  if (solved || !history.length) return;
  tiles = history.pop();
  moves = Math.max(0, moves - 1);
  render();
  updateMeta();
  statusEl.textContent = `Move undone. Back to ${moves} ${moves === 1 ? 'move' : 'moves'}.`;
}

function newPuzzle() {
  token += 1;
  clearTimer();
  size = SIZES[level].size;
  tiles = shuffle(size);
  history = [];
  moves = 0;
  startedAt = null;
  elapsed = 0;
  solved = false;
  veil.hidden = true;
  buildBoard();
  render();
  updateMeta();
  statusEl.textContent = `New ${SIZES[level].label} puzzle. ${moves} moves.`;
}

function requestNewPuzzle() {
  if (boardWrap.dataset.refreshing === 'true') return;
  softRefresh(boardWrap, () => {
    newPuzzle();
    boardEl.focus({ preventScroll: true });
  });
}

function setLevel(next) {
  if (!SIZES[next] || next === level) return;
  level = next;
  saveLevel();
  sizeButtons.forEach((button) => {
    const active = button.dataset.size === next;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  requestNewPuzzle();
}

sizeButtons.forEach((button) => {
  button.addEventListener('click', () => setLevel(button.dataset.size));
});

undoBtn.addEventListener('click', undo);
newPuzzleBtn.addEventListener('click', requestNewPuzzle);
newGameBtn.addEventListener('click', requestNewPuzzle);
veilPrimary.addEventListener('click', requestNewPuzzle);

window.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const dirs = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right'
  };
  const dir = dirs[event.key];
  if (dir) {
    event.preventDefault();
    moveBy(dir);
    return;
  }
  if ((event.key === 'u' || event.key === 'U') && !solved) {
    event.preventDefault();
    undo();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && startedAt !== null) {
    elapsed += (Date.now() - startedAt) / 1000;
    startedAt = Date.now();
    timeEl.textContent = formatClock(currentSeconds());
  }
});

sizeButtons.forEach((button) => {
  const active = button.dataset.size === level;
  button.classList.toggle('is-active', active);
  button.setAttribute('aria-pressed', active ? 'true' : 'false');
});

newPuzzle();
