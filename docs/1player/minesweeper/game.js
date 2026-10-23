import {
  LEVELS,
  createBoard,
  placeMines,
  revealCell,
  toggleFlag,
  chord,
  remainingMines,
  isWin,
  revealAllMines,
  formatTime
} from './engine.js';
import { softRefresh } from '../../shared/refresh.js';

const $ = (id) => document.getElementById(id);

const boardEl = $('board');
const playField = document.querySelector('.board-wrap');
const minesEl = $('mines-left');
const timerEl = $('timer');
const bestEl = $('best');
const flagBtn = $('flag-mode');
const statusEl = $('status');
const veil = $('veil');
const veilFace = $('veil-face');
const veilEyebrow = $('veil-eyebrow');
const veilTitle = $('veil-title');
const veilCopy = $('veil-copy');
const veilStats = $('veil-stats');
const veilPrimary = $('veil-primary');
const veilSecondary = $('veil-secondary');

let level = 'easy';
let config = LEVELS.easy;
let board = null;
let cellEls = [];
let firstClick = true;
let over = false;
let flagMode = false;
let elapsed = 0;
let startedAt = null;
let timerId = null;
let longPress = null;
let suppressClick = false;

function bestKey() {
  return `minigames.minesweeper.best.${level}`;
}

function readBest() {
  try {
    return Number(localStorage.getItem(bestKey())) || 0;
  } catch {
    return 0;
  }
}

function writeBest() {
  try {
    localStorage.setItem(bestKey(), String(Math.max(1, Math.floor(elapsed))));
  } catch {
    /* storage unavailable */
  }
}

function beginTimer() {
  if (timerId !== null || over) return;
  startedAt = Date.now() - elapsed * 1000;
  timerId = window.setInterval(() => {
    elapsed = (Date.now() - startedAt) / 1000;
    timerEl.textContent = formatTime(elapsed);
  }, 250);
}

function stopTimer() {
  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
  if (startedAt !== null) {
    elapsed = (Date.now() - startedAt) / 1000;
    timerEl.textContent = formatTime(elapsed);
  }
}

function updateBest() {
  const best = readBest();
  bestEl.textContent = best ? formatTime(best) : '—';
}

function buildBoard() {
  boardEl.style.setProperty('--cols', config.cols);
  boardEl.innerHTML = '';
  cellEls = [];

  const fragment = document.createDocumentFragment();
  for (let i = 0; i < config.rows * config.cols; i += 1) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cell';
    cell.dataset.index = String(i);
    cell.setAttribute('role', 'gridcell');
    fragment.appendChild(cell);
    cellEls.push(cell);
  }
  boardEl.appendChild(fragment);
}

function setContent(cell, kind, value = '') {
  if (cell.dataset.kind === kind && cell.dataset.value === String(value)) return;
  cell.dataset.kind = kind;
  cell.dataset.value = String(value);
  if (kind === 'flag' || kind === 'mine') {
    const img = document.createElement('img');
    img.src = kind === 'flag' ? 'assets/flag.svg' : 'assets/mine.svg';
    img.alt = '';
    cell.replaceChildren(img);
  } else if (kind === 'number') {
    cell.textContent = String(value);
    cell.className = `cell is-revealed n${value}`;
  } else {
    cell.textContent = '';
  }
}

function render() {
  for (let i = 0; i < cellEls.length; i += 1) {
    const cell = board.cells[i];
    const el = cellEls[i];
    const isWrong = over && cell.flagged && !cell.mine;

    el.className = 'cell';
    el.classList.toggle('is-revealed', cell.revealed);
    el.classList.toggle('is-flag', cell.flagged && !cell.revealed);
    el.classList.toggle('is-mine', cell.mine && cell.revealed);
    el.classList.toggle('is-wrong', isWrong);

    if (cell.mine && cell.revealed) setContent(el, 'mine');
    else if (cell.flagged && !cell.revealed) setContent(el, 'flag');
    else if (cell.revealed && cell.count > 0) {
      setContent(el, 'number', cell.count);
      el.classList.add(`n${cell.count}`);
    } else setContent(el, 'blank');

    const r = Math.floor(i / config.cols) + 1;
    const c = (i % config.cols) + 1;
    let label = `Row ${r}, column ${c}`;
    if (cell.flagged) label += ', flagged';
    if (cell.revealed) label += cell.mine ? ', mine' : cell.count ? `, ${cell.count} adjacent mines` : ', empty';
    el.setAttribute('aria-label', label);
  }

  minesEl.textContent = String(Math.max(0, remainingMines(board, config.mines)));
}

function newGame(nextLevel = level) {
  level = nextLevel;
  config = LEVELS[level];
  board = createBoard(config.rows, config.cols);
  firstClick = true;
  over = false;
  flagMode = false;
  elapsed = 0;
  startedAt = null;
  stopTimer();
  timerEl.textContent = '00:00';
  veil.hidden = true;
  flagBtn.setAttribute('aria-pressed', 'false');
  updateBest();
  buildBoard();
  render();

  document.querySelectorAll('.difficulty button').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.level === level);
  });
  statusEl.textContent = `New ${config.label} board with ${config.mines} mines.`;
}

function showVeil(mode) {
  veil.hidden = false;
  veilSecondary.hidden = false;

  if (mode === 'win') {
    veilFace.innerHTML = '<img src="assets/trophy.svg" alt="" width="60" height="60">';
    veilEyebrow.textContent = 'Board cleared';
    veilTitle.textContent = 'You win!';
    veilCopy.textContent = 'Every mine accounted for.';
    veilStats.innerHTML = `
      <div><dt>Time</dt><dd>${formatTime(elapsed)}</dd></div>
      <div><dt>Level</dt><dd>${config.label}</dd></div>
      <div><dt>Mines</dt><dd>${config.mines}</dd></div>`;
  } else {
    veilFace.innerHTML = '<img src="assets/mine.svg" alt="" width="60" height="60">';
    veilEyebrow.textContent = 'Boom';
    veilTitle.textContent = 'Mine hit';
    veilCopy.textContent = 'That square was not safe. Try a different first tap.';
    veilStats.innerHTML = `
      <div><dt>Time</dt><dd>${formatTime(elapsed)}</dd></div>
      <div><dt>Level</dt><dd>${config.label}</dd></div>
      <div><dt>Cleared</dt><dd>${board.cells.filter((c) => c.revealed && !c.mine).length}</dd></div>`;
    boardEl.classList.remove('is-lost');
    void boardEl.offsetWidth;
    boardEl.classList.add('is-lost');
  }

  veilPrimary.textContent = 'Play again';
  veilPrimary.focus({ preventScroll: true });
}

function finishWin() {
  over = true;
  stopTimer();
  const previous = readBest();
  if (!previous || elapsed < previous) writeBest();
  updateBest();

  for (const cell of board.cells) {
    if (cell.mine) cell.flagged = true;
  }
  render();
  showVeil('win');
  statusEl.textContent = `Board cleared in ${formatTime(elapsed)}.`;
}

function finishLoss() {
  over = true;
  stopTimer();
  revealAllMines(board);
  render();
  showVeil('loss');
  statusEl.textContent = 'You hit a mine.';
}

function afterReveal(result) {
  if (!result) return;
  if (result.hitMine) {
    finishLoss();
    return;
  }
  if (isWin(board)) finishWin();
  else render();
}

function tap(index) {
  if (over) return;
  const cell = board.cells[index];
  if (!cell) return;

  if (cell.revealed) {
    afterReveal(chord(board, index));
    return;
  }

  if (flagMode) {
    toggleFlag(board, index);
    render();
    statusEl.textContent = cell.flagged ? 'Flag placed.' : 'Flag removed.';
    return;
  }

  if (cell.flagged) return;

  if (firstClick) {
    firstClick = false;
    placeMines(board, config.mines, index);
    beginTimer();
  }

  afterReveal(revealCell(board, index));
}

/* pointer + long-press flagging */
boardEl.addEventListener('pointerdown', (event) => {
  if (over) return;
  const el = event.target.closest('.cell');
  if (!el) return;
  const index = Number(el.dataset.index);

  longPress = {
    timer: window.setTimeout(() => {
      if (!longPress || over) return;
      longPress.fired = true;
      suppressClick = true;
      const cell = board.cells[index];
      if (!cell.revealed) {
        toggleFlag(board, index);
        render();
        statusEl.textContent = cell.flagged ? 'Flag placed.' : 'Flag removed.';
        if (navigator.vibrate) navigator.vibrate(12);
      }
      window.setTimeout(() => {
        suppressClick = false;
      }, 700);
    }, 380),
    fired: false
  };
});

function cancelLongPress() {
  if (longPress) {
    window.clearTimeout(longPress.timer);
    longPress = null;
  }
}

boardEl.addEventListener('pointerup', cancelLongPress);
boardEl.addEventListener('pointercancel', cancelLongPress);
boardEl.addEventListener('pointerleave', cancelLongPress);

boardEl.addEventListener('click', (event) => {
  const el = event.target.closest('.cell');
  if (!el) return;
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  tap(Number(el.dataset.index));
});

boardEl.addEventListener('contextmenu', (event) => event.preventDefault());

/* buttons */
const requestGame = (nextLevel = level) => softRefresh(playField, () => newGame(nextLevel));

flagBtn.addEventListener('click', () => {
  flagMode = !flagMode;
  flagBtn.setAttribute('aria-pressed', flagMode ? 'true' : 'false');
  statusEl.textContent = flagMode ? 'Flag mode on. Tap a covered cell to flag it.' : 'Flag mode off.';
});

$('restart').addEventListener('click', () => requestGame());
$('new-game').addEventListener('click', () => requestGame());

document.querySelectorAll('.difficulty button').forEach((button) => {
  button.addEventListener('click', () => requestGame(button.dataset.level));
});

veilPrimary.addEventListener('click', () => requestGame());
veilSecondary.addEventListener('click', () => {
  veil.hidden = true;
});

/* boot */
newGame('easy');
