import { softRefresh } from '../../shared/refresh.js';
import {
  BOARD_SIZE,
  anchorFor,
  bounds,
  canPlace,
  clearLines,
  emptyBoard,
  fullLines,
  hasMove,
  place,
  randomTray,
  scoreGain
} from './engine.js';

const $ = (id) => document.getElementById(id);
const BEST_KEY = 'mini-games:wood-blocks:best';
const COLORS = ['#e2892b', '#21b6a8', '#7c5cff', '#ff6b5a', '#3d6fb4', '#ffb703'];

const playEl = $('play');
const boardEl = $('board');
const trayEl = $('tray');
const scoreEl = $('score');
const bestEl = $('best');
const linesEl = $('lines');
const deselectBtn = $('deselect');
const statusEl = $('status');
const veil = $('veil');
const veilCopy = $('veil-copy');
const veilStats = $('veil-stats');
const veilPrimary = $('veil-primary');

let board = emptyBoard();
let tray = [];
let selected = -1;
let cursor = { r: 4, c: 4 };
let previewCells = [];
let score = 0;
let best = loadBest();
let linesCleared = 0;
let combo = 0;
let busy = false;
let gameOver = false;
let token = 0;
let cells = [];
let drag = null;
let lastDragEnd = 0;

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function loadBest() {
  try {
    const value = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function saveBest() {
  try {
    localStorage.setItem(BEST_KEY, String(best));
  } catch {
    /* storage is optional */
  }
}

/* ---------- rendering ---------- */

function buildBoard() {
  boardEl.replaceChildren();
  cells = [];
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < BOARD_SIZE * BOARD_SIZE; index += 1) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cell';
    cell.dataset.index = String(index);
    const row = Math.floor(index / BOARD_SIZE);
    const col = index % BOARD_SIZE;
    cell.addEventListener('click', () => {
      if (performance.now() - lastDragEnd < 250) return;
      tapCell(row, col);
    });
    cell.addEventListener('pointerenter', () => {
      if (drag || selected < 0 || busy || gameOver) return;
      showPreview(row, col);
    });
    fragment.appendChild(cell);
    cells.push(cell);
  }

  boardEl.appendChild(fragment);
}

function renderBoard() {
  const previewSet = new Map(previewCells.map((entry) => [entry.index, entry.ok]));

  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index];
    const value = board[index];
    const row = Math.floor(index / BOARD_SIZE);
    const col = index % BOARD_SIZE;

    if (value) {
      cell.classList.add('is-filled');
      cell.dataset.color = String(value);
    } else {
      cell.classList.remove('is-filled');
      cell.removeAttribute('data-color');
    }

    const preview = previewSet.get(index);
    cell.classList.toggle('is-preview-empty', preview === true && !value);
    cell.classList.toggle('is-blocked', preview === false);

    cell.setAttribute(
      'aria-label',
      `Row ${row + 1}, column ${col + 1}${value ? ', filled' : ', empty'}`
    );
  }
}

function pieceMarkup(shape, color, cellSize) {
  const { rows, cols } = bounds(shape.cells);
  const grid = document.createElement('div');
  grid.className = 'piece';
  grid.style.gridTemplateColumns = `repeat(${cols}, var(--pc))`;
  grid.style.setProperty('--pc', cellSize);

  const filled = new Set(shape.cells.map(([r, c]) => `${r},${c}`));
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const unit = document.createElement('i');
      if (filled.has(`${r},${c}`)) unit.style.background = color;
      else unit.classList.add('void');
      grid.appendChild(unit);
    }
  }
  return grid;
}

function buildTray() {
  trayEl.replaceChildren();
  tray.forEach((slot, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'slot';
    button.dataset.slot = String(index);
    button.setAttribute('aria-label', `Piece ${index + 1}`);

    if (slot) {
      button.appendChild(pieceMarkup(slot.shape, slot.color, 'clamp(12px, 3.6vw, 18px)'));
      button.addEventListener('pointerdown', (event) => startDrag(event, index));
      button.addEventListener('click', (event) => {
        if (event.detail !== 0) return;
        if (drag?.moved) return;
        selectPiece(index);
      });
    } else {
      button.disabled = true;
      button.classList.add('is-used');
      button.textContent = '✓';
    }

    trayEl.appendChild(button);
  });
  syncSelection();
}

function syncSelection() {
  [...trayEl.children].forEach((slotEl, index) => {
    const on = index === selected;
    slotEl.classList.toggle('is-selected', on);
    slotEl.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (slotEl.classList.contains('is-used')) return;
    slotEl.setAttribute(
      'aria-label',
      `Piece ${index + 1}${on ? ', selected' : ''}`
    );
  });
  deselectBtn.disabled = selected < 0;
}

function updateMeta() {
  scoreEl.textContent = String(score);
  bestEl.textContent = best ? String(best) : '—';
  linesEl.textContent = String(linesCleared);
}

function announce(message) {
  statusEl.textContent = message;
}

function nudgeBoard() {
  boardEl.classList.remove('is-invalid');
  void boardEl.offsetWidth;
  boardEl.classList.add('is-invalid');
  window.setTimeout(() => boardEl.classList.remove('is-invalid'), 320);
}

/* ---------- preview & placement ---------- */

function showPreview(row, col) {
  if (selected < 0 || busy || gameOver || !tray[selected]) {
    previewCells = [];
    renderBoard();
    return;
  }

  const shape = tray[selected].shape;
  const { row: anchorRow, col: anchorCol } = anchorFor(shape.cells, row, col);
  const fits = canPlace(board, shape.cells, anchorRow, anchorCol);
  cursor = { r: row, c: col };

  previewCells = shape.cells.map(([dr, dc]) => {
    const r = anchorRow + dr;
    const c = anchorCol + dc;
    return { index: r * BOARD_SIZE + c, ok: fits };
  });
  renderBoard();
  return { anchorRow, anchorCol, fits };
}

function tapCell(row, col) {
  if (busy || gameOver) return;
  if (selected < 0 || !tray[selected]) {
    announce('Pick a piece from the tray first.');
    return;
  }
  const result = showPreview(row, col);
  if (!result.fits) {
    nudgeBoard();
    announce('That piece does not fit there.');
    return;
  }
  commitPlacement(result.anchorRow, result.anchorCol);
}

function commitPlacement(anchorRow, anchorCol) {
  const slot = tray[selected];
  if (!slot) return;

  const next = place(board, slot.shape.cells, anchorRow, anchorCol);
  if (!next) {
    nudgeBoard();
    announce('That piece does not fit there.');
    return;
  }

  board = next;
  const placed = slot.shape.cells.length;
  tray[selected] = null;
  selected = -1;
  previewCells = [];

  const lines = fullLines(board);
  combo = lines.count ? combo + 1 : 0;
  score += scoreGain({ placed, lines: lines.count, combo });
  linesCleared += lines.count;

  if (tray.every((entry) => entry === null)) dealTray();

  if (lines.count) {
    busy = true;
    for (const index of cellsClearedBy(lines)) cells[index].classList.add('is-clearing');
    const myToken = token;
    window.setTimeout(() => {
      if (myToken !== token) return;
      board = clearLines(board, lines);
      busy = false;
      renderBoard();
      updateMeta();
      syncSelection();
      announce(lines.count === 1 ? 'Line cleared.' : `${lines.count} lines cleared.`);
      checkStuck();
    }, reducedMotion() ? 0 : 240);
  } else {
    combo = 0;
    renderBoard();
    updateMeta();
    syncSelection();
    announce(`Piece placed. Score ${score}.`);
    checkStuck();
  }
}

function cellsClearedBy(lines) {
  const indexes = [];
  for (let index = 0; index < board.length; index += 1) {
    const row = Math.floor(index / BOARD_SIZE);
    const col = index % BOARD_SIZE;
    const inRow = lines.rows.includes(row);
    const inCol = lines.cols.includes(col);
    const inBox = lines.boxes.some(([br, bc]) => row >= br && row < br + 3 && col >= bc && col < bc + 3);
    if (inRow || inCol || inBox) indexes.push(index);
  }
  return indexes;
}

function dealTray() {
  const dealt = randomTray();
  tray = dealt.map((shape) => ({
    shape,
    color: COLORS[Math.floor(Math.random() * COLORS.length)]
  }));
  buildTray();
}

function checkStuck() {
  if (gameOver) return;
  const shapes = tray.filter(Boolean).map((entry) => entry.shape);
  if (shapes.length && !hasMove(board, shapes)) endGame();
}

function endGame() {
  gameOver = true;
  selected = -1;
  previewCells = [];
  const isBest = score > best;
  if (isBest) {
    best = score;
    saveBest();
  }
  renderBoard();
  syncSelection();
  updateMeta();

  veilCopy.textContent = isBest
    ? `You cleared ${linesCleared} lines for ${score} points — a new best.`
    : `You cleared ${linesCleared} lines for ${score} points. Best is ${best}.`;

  veilStats.replaceChildren();
  for (const [term, value] of [
    ['Score', score],
    ['Lines', linesCleared],
    ['Best', best]
  ]) {
    const cell = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = term;
    dd.textContent = String(value);
    cell.append(dt, dd);
    veilStats.appendChild(cell);
  }

  veil.hidden = false;
  veilPrimary.focus({ preventScroll: true });
  announce(`Game over. Score ${score} with ${linesCleared} lines.`);
}

/* ---------- selection ---------- */

function selectPiece(index) {
  if (busy || gameOver || !tray[index]) return;
  selected = selected === index ? -1 : index;
  syncSelection();
  if (selected < 0) {
    previewCells = [];
    renderBoard();
    announce('Piece deselected.');
    return;
  }
  showPreview(cursor.r, cursor.c);
  announce(`Piece ${index + 1} selected. Tap the board to place it.`);
}

function deselect() {
  selected = -1;
  previewCells = [];
  syncSelection();
  renderBoard();
}

/* ---------- drag ---------- */

function startDrag(event, index) {
  if (busy || gameOver) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  if (!tray[index]) return;

  const slotEl = event.currentTarget;
  const startX = event.clientX;
  const startY = event.clientY;

  try {
    slotEl.setPointerCapture(event.pointerId);
  } catch {
    /* capture is optional */
  }

  drag = { index, startX, startY, moved: false, ghost: null, pointerId: event.pointerId, slotEl };

  const move = (moveEvent) => {
    if (!drag) return;
    const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
    if (!drag.moved && dist > 8) {
      drag.moved = true;
      selectPiece(index);
      const ghost = document.createElement('div');
      ghost.className = 'drag-ghost';
      ghost.appendChild(pieceMarkup(tray[index].shape, tray[index].color, '20px'));
      document.body.appendChild(ghost);
      drag.ghost = ghost;
      slotEl.classList.add('is-lifting');
    }
    if (drag.moved) {
      drag.ghost.style.left = `${moveEvent.clientX}px`;
      drag.ghost.style.top = `${moveEvent.clientY}px`;
      const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
      const cellEl = target?.closest?.('.cell');
      if (cellEl) {
        showPreview(Math.floor(Number(cellEl.dataset.index) / BOARD_SIZE), Number(cellEl.dataset.index) % BOARD_SIZE);
      }
    }
  };

  const finish = () => {
    slotEl.removeEventListener('pointermove', move);
    slotEl.removeEventListener('pointerup', finish);
    slotEl.removeEventListener('pointercancel', finish);
    if (drag) {
      if (drag.ghost) drag.ghost.remove();
      slotEl.classList.remove('is-lifting');
      if (drag.moved) {
        lastDragEnd = performance.now();
        if (previewCells.length && previewCells.every((entry) => entry.ok)) {
          const shape = tray[drag.index]?.shape;
          if (shape) {
            const { row: anchorRow, col: anchorCol } = anchorFor(shape.cells, cursor.r, cursor.c);
            commitPlacement(anchorRow, anchorCol);
          }
        } else if (previewCells.length) {
          nudgeBoard();
          announce('That piece does not fit there.');
        }
      }
      drag = null;
      return;
    }
    drag = null;
  };

  slotEl.addEventListener('pointermove', move);
  slotEl.addEventListener('pointerup', finish);
  slotEl.addEventListener('pointercancel', finish);
}

/* ---------- game flow ---------- */

function resetGame() {
  token += 1;
  board = emptyBoard();
  selected = -1;
  cursor = { r: 4, c: 4 };
  previewCells = [];
  score = 0;
  linesCleared = 0;
  combo = 0;
  busy = false;
  gameOver = false;
  veil.hidden = true;
  dealTray();
  renderBoard();
  updateMeta();
  syncSelection();
  announce('New game. Drag a piece onto the board.');
}

function requestNewGame() {
  if (playEl.dataset.refreshing === 'true') return;
  softRefresh(playEl, () => {
    resetGame();
    boardEl.focus({ preventScroll: true });
  });
}

boardEl.setAttribute('tabindex', '-1');

deselectBtn.addEventListener('click', deselect);
$('new-game').addEventListener('click', requestNewGame);
$('new-game-top').addEventListener('click', requestNewGame);
veilPrimary.addEventListener('click', requestNewGame);

window.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (busy || gameOver) return;

  if (['1', '2', '3'].includes(event.key)) {
    event.preventDefault();
    selectPiece(Number(event.key) - 1);
    return;
  }

  if (selected < 0) return;

  const moves = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1]
  };
  const delta = moves[event.key];
  if (delta) {
    event.preventDefault();
    cursor = {
      r: Math.max(0, Math.min(BOARD_SIZE - 1, cursor.r + delta[0])),
      c: Math.max(0, Math.min(BOARD_SIZE - 1, cursor.c + delta[1]))
    };
    showPreview(cursor.r, cursor.c);
    return;
  }

  if ((event.key === 'Enter' || event.key === ' ') && document.activeElement === document.body) {
    event.preventDefault();
    tapCell(cursor.r, cursor.c);
  }
});

window.addEventListener('blur', () => {
  if (drag?.ghost) drag.ghost.remove();
  if (drag?.slotEl) drag.slotEl.classList.remove('is-lifting');
  drag = null;
});

buildBoard();
resetGame();
