import { applyMove, newGame } from './engine.js';
import { softRefresh } from '../../shared/refresh.js';

const $ = (id) => document.getElementById(id);

const boardEl = $('board');
const playField = document.querySelector('.board-shell');
const tilesEl = $('tiles');
const scoreEl = $('score');
const bestEl = $('best');
const scoreAddEl = $('score-add');
const undoBtn = $('undo');
const veil = $('veil');
const veilEyebrow = $('veil-eyebrow');
const veilTitle = $('veil-title');
const veilCopy = $('veil-copy');
const veilPrimary = $('veil-primary');
const veilSecondary = $('veil-secondary');
const statusEl = $('status');

const BEST_KEY = 'minigames.2048.best';
const MAX_HISTORY = 10;

let state = newGame();
let best = readBest();
let history = [];
let tileEls = new Map();
let veilMode = null;
let pointer = null;

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest() {
  try {
    localStorage.setItem(BEST_KEY, String(best));
  } catch {
    /* storage can be unavailable in private mode */
  }
}

function updateHud(gained = 0) {
  scoreEl.textContent = state.score.toLocaleString();
  if (state.score > best) {
    best = state.score;
    saveBest();
  }
  bestEl.textContent = best.toLocaleString();

  if (gained > 0) {
    scoreAddEl.textContent = `+${gained}`;
    scoreAddEl.classList.remove('show');
    void scoreAddEl.offsetWidth;
    scoreAddEl.classList.add('show');
  }
}

function updateUndo() {
  undoBtn.disabled = history.length === 0;
}

function announce(message) {
  statusEl.textContent = message;
}

function render(options = {}) {
  const newIds = options.newIds ?? new Set(options.newId ? [options.newId] : []);
  const mergedIds = new Set(options.mergedIds ?? []);
  const alive = new Set(state.tiles.map((tile) => tile.id));

  for (const [id, el] of tileEls) {
    if (!alive.has(id)) {
      el.remove();
      tileEls.delete(id);
    }
  }

  for (const tile of state.tiles) {
    let el = tileEls.get(tile.id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'tile';
      el.innerHTML = '<span class="face"></span>';
      tilesEl.appendChild(el);
      tileEls.set(tile.id, el);
      newIds.add(tile.id);
    }

    el.style.setProperty('--r', tile.r);
    el.style.setProperty('--c', tile.c);
    el.style.zIndex = String(Math.min(99, Math.log2(tile.value) * 6));
    el.dataset.v = String(tile.value);
    el.dataset.digits = String(tile.value).length;
    el.classList.toggle('is-big', tile.value > 2048);
    el.querySelector('.face').textContent = tile.value;

    if (newIds.has(tile.id)) {
      el.classList.add('tile--new');
      window.setTimeout(() => el.classList.remove('tile--new'), 220);
    }

    if (mergedIds.has(tile.id)) {
      el.classList.remove('tile--merged');
      void el.offsetWidth;
      el.classList.add('tile--merged');
      window.setTimeout(() => el.classList.remove('tile--merged'), 240);
    }
  }
}

function play(dir) {
  if (veilMode) return;

  const snapshot = {
    tiles: state.tiles.map((tile) => ({ ...tile })),
    score: state.score,
    status: state.status,
    won: state.won,
    nextId: state.nextId
  };

  const result = applyMove(state, dir);
  if (!result.changed) {
    boardEl.classList.remove('board--nudge');
    void boardEl.offsetWidth;
    boardEl.classList.add('board--nudge');
    return;
  }

  history.push(snapshot);
  if (history.length > MAX_HISTORY) history.shift();

  state = result.state;
  updateHud(result.gained);
  updateUndo();
  render({ newId: result.spawnedId, mergedIds: result.mergedIds });

  const max = Math.max(...state.tiles.map((t) => t.value));
  announce(`Score ${state.score}. Highest tile ${max}.`);

  if (result.justWon) {
    showVeil('win');
  } else if (state.status === 'over') {
    showVeil('over');
  }
}

function undo() {
  if (!history.length) return;
  const snapshot = history.pop();
  state = {
    ...snapshot,
    tiles: snapshot.tiles.map((tile) => ({ ...tile }))
  };
  hideVeil();
  updateHud();
  updateUndo();
  render();
  announce(`Move undone. Score ${state.score}.`);
}

function start() {
  state = newGame();
  history = [];
  tileEls.forEach((el) => el.remove());
  tileEls = new Map();
  tilesEl.innerHTML = '';
  hideVeil();
  updateHud();
  updateUndo();
  render({ newIds: new Set(state.tiles.map((tile) => tile.id)) });
  announce('New game started. Swipe or use arrow keys to move.');
}

function showVeil(mode) {
  veilMode = mode;
  veil.hidden = false;
  if (mode === 'win') {
    veilEyebrow.textContent = 'You did it';
    veilTitle.textContent = '2048!';
    veilCopy.textContent = 'You reached the magic tile. Keep going for a higher score.';
    veilPrimary.textContent = 'Keep going';
    veilSecondary.textContent = 'New game';
    veilSecondary.hidden = false;
  } else {
    veilEyebrow.textContent = 'Nice run';
    veilTitle.textContent = 'Game over';
    veilCopy.textContent = `No moves left. Final score: ${state.score.toLocaleString()}.`;
    veilPrimary.textContent = 'Play again';
    veilSecondary.hidden = true;
  }
  veilPrimary.focus({ preventScroll: true });
}

function hideVeil() {
  veilMode = null;
  veil.hidden = true;
}

/* Pointer / swipe input */
boardEl.addEventListener('pointerdown', (event) => {
  if (veilMode || (event.pointerType === 'mouse' && event.button !== 0)) return;
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, fired: false };
  try {
    boardEl.setPointerCapture(event.pointerId);
  } catch {
    /* ignore */
  }
});

boardEl.addEventListener('pointermove', (event) => {
  if (!pointer || pointer.id !== event.pointerId || pointer.fired) return;
  const dx = event.clientX - pointer.x;
  const dy = event.clientY - pointer.y;

  if (Math.hypot(dx, dy) < 24) return;

  pointer.fired = true;
  const dir = Math.abs(dx) > Math.abs(dy)
    ? (dx > 0 ? 'right' : 'left')
    : (dy > 0 ? 'down' : 'up');
  play(dir);
});

function endPointer(event) {
  if (pointer && pointer.id === event.pointerId) pointer = null;
}

boardEl.addEventListener('pointerup', endPointer);
boardEl.addEventListener('pointercancel', endPointer);
boardEl.addEventListener('lostpointercapture', endPointer);
boardEl.addEventListener('contextmenu', (event) => event.preventDefault());

/* Keyboard input */
window.addEventListener('keydown', (event) => {
  const map = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
    a: 'left',
    d: 'right',
    w: 'up',
    s: 'down'
  };
  const dir = map[event.key];
  if (!dir) return;
  event.preventDefault();
  play(dir);
});

/* Buttons */
const restart = () => softRefresh(playField, start);

$('restart').addEventListener('click', restart);
$('new-game').addEventListener('click', restart);
undoBtn.addEventListener('click', undo);

veilPrimary.addEventListener('click', () => {
  if (veilMode === 'win') {
    hideVeil();
    if (state.status === 'over') showVeil('over');
  } else {
    restart();
  }
});

veilSecondary.addEventListener('click', restart);

/* Boot */
bestEl.textContent = best.toLocaleString();
updateHud();
render({ newIds: new Set(state.tiles.map((tile) => tile.id)) });
updateUndo();
