import { softRefresh } from '../../shared/refresh.js';
import { aiChoose, claim, createGame, hIndex, isComplete, vIndex } from './engine.js';

const $ = (id) => document.getElementById(id);
const SIZE_KEY = 'mini-games:dots-and-boxes:size';

const boardWrap = $('board-wrap');
const gridEl = $('grid');
const turnPill = $('turn-pill');
const scoreEls = [$('score-0'), $('score-1')];
const nameEls = [$('name-0'), $('name-1')];
const cardEls = [$('card-0'), $('card-1')];
const statusEl = $('status');
const veil = $('veil');
const veilTitle = $('veil-title');
const veilCopy = $('veil-copy');
const veilStats = $('veil-stats');
const rematchBtn = $('rematch');
const sizeButtons = [...document.querySelectorAll('.difficulty button')];
const modeButtons = [...document.querySelectorAll('.mode-switch button')];

let size = loadSize();
let mode = '2p';
let game = createGame(size);
let turn = 0;
let over = false;
let drawn = 0;
let token = 0;
let aiId = null;
let hBtns = [];
let vBtns = [];
let faceEls = [];
let freshEdge = null;

const isHuman = (playerIndex) => mode === '2p' || playerIndex === 0;
const nameOf = (playerIndex) => (playerIndex === 1 && mode === 'ai' ? 'Computer' : `Player ${playerIndex + 1}`);

function loadSize() {
  try {
    const saved = Number(localStorage.getItem(SIZE_KEY));
    return saved === 3 || saved === 4 || saved === 5 ? saved : 3;
  } catch {
    return 3;
  }
}

function saveSize() {
  try {
    localStorage.setItem(SIZE_KEY, String(size));
  } catch {
    /* storage is optional */
  }
}

function clearAi() {
  if (aiId !== null) {
    window.clearTimeout(aiId);
    aiId = null;
  }
}

function announce(message) {
  statusEl.textContent = message;
}

/* ---------- board ---------- */

function buildGrid() {
  gridEl.replaceChildren();
  hBtns = [];
  vBtns = [];
  faceEls = [];
  freshEdge = null;

  const dim = size * 2 + 1;
  gridEl.style.setProperty('--dim', String(dim));
  const fragment = document.createDocumentFragment();

  for (let row = 0; row < dim; row += 1) {
    for (let col = 0; col < dim; col += 1) {
      if (row % 2 === 0 && col % 2 === 0) {
        const dot = document.createElement('div');
        dot.className = 'cell cell--dot';
        dot.setAttribute('aria-hidden', 'true');
        fragment.appendChild(dot);
        continue;
      }

      if (row % 2 === 0) {
        const edgeRow = row / 2;
        const edgeCol = (col - 1) / 2;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'edge edge--h';
        button.dataset.kind = 'h';
        button.dataset.index = String(hIndex(size, edgeRow, edgeCol));
        button.setAttribute('aria-label', `Line across row ${edgeRow + 1}, between columns ${edgeCol + 1} and ${edgeCol + 2}`);
        button.addEventListener('click', () => play({ kind: 'h', index: hIndex(size, edgeRow, edgeCol) }));
        button.addEventListener('contextmenu', (event) => event.preventDefault());
        fragment.appendChild(button);
        hBtns.push(button);
        continue;
      }

      if (col % 2 === 0) {
        const edgeRow = (row - 1) / 2;
        const edgeCol = col / 2;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'edge edge--v';
        button.dataset.kind = 'v';
        button.dataset.index = String(vIndex(size, edgeRow, edgeCol));
        button.setAttribute('aria-label', `Line down column ${edgeCol + 1}, between rows ${edgeRow + 1} and ${edgeRow + 2}`);
        button.addEventListener('click', () => play({ kind: 'v', index: vIndex(size, edgeRow, edgeCol) }));
        button.addEventListener('contextmenu', (event) => event.preventDefault());
        fragment.appendChild(button);
        vBtns.push(button);
        continue;
      }

      const boxRow = (row - 1) / 2;
      const boxCol = (col - 1) / 2;
      const face = document.createElement('div');
      face.className = 'cell cell--face';
      const label = document.createElement('span');
      label.setAttribute('aria-hidden', 'true');
      face.appendChild(label);
      face.dataset.row = String(boxRow);
      face.dataset.col = String(boxCol);
      fragment.appendChild(face);
      faceEls.push(face);
    }
  }

  gridEl.appendChild(fragment);
}

function edgeButton(edge) {
  return edge.kind === 'h' ? hBtns[edge.index] : vBtns[edge.index];
}

function render() {
  for (const button of hBtns) {
    const owner = game.h[Number(button.dataset.index)];
    if (owner === -1) button.removeAttribute('data-owner');
    else button.dataset.owner = String(owner);
    button.disabled = owner !== -1 || over || !isHuman(turn);
  }

  for (const button of vBtns) {
    const owner = game.v[Number(button.dataset.index)];
    if (owner === -1) button.removeAttribute('data-owner');
    else button.dataset.owner = String(owner);
    button.disabled = owner !== -1 || over || !isHuman(turn);
  }

  for (const face of faceEls) {
    const box = Number(face.dataset.row) * size + Number(face.dataset.col);
    const owner = game.owner[box];
    if (owner === -1) {
      face.removeAttribute('data-owner');
      face.querySelector('span').textContent = '';
      face.setAttribute('aria-label', `Box ${Number(face.dataset.row) + 1}, ${Number(face.dataset.col) + 1}, open`);
    } else {
      face.dataset.owner = String(owner);
      face.querySelector('span').textContent = String(owner + 1);
      face.setAttribute('aria-label', `Box ${Number(face.dataset.row) + 1}, ${Number(face.dataset.col) + 1}, ${nameOf(owner)}`);
    }
  }

  for (let i = 0; i < 2; i += 1) {
    scoreEls[i].textContent = String(game.scores[i]);
    nameEls[i].textContent = nameOf(i);
    cardEls[i].classList.toggle('is-active', !over && i === turn);
  }

  if (!over) {
    turnPill.textContent = isHuman(turn)
      ? `${nameOf(turn)} draws`
      : mode === 'ai' && aiId !== null
        ? 'Computer thinking'
        : `${nameOf(turn)} draws`;
  }
}

/* ---------- flow ---------- */

function play(edge) {
  if (over) return;
  if (!isHuman(turn)) return;

  const result = claim(game, edge, turn);
  if (!result) return;
  currentEdge = edge;
  applyResult(result);
}

function applyResult(result) {
  game = result.game;
  drawn += 1;

  if (freshEdge) freshEdge.classList.remove('is-fresh');
  freshEdge = null;

  const button = edgeButton(currentEdge);
  if (button) {
    button.classList.add('is-fresh');
    freshEdge = button;
  }

  const got = result.claimed.length;
  if (got) {
    announce(
      got === 1
        ? `${nameOf(turn)} closes a box and goes again. ${game.scores[0]} to ${game.scores[1]}.`
        : `${nameOf(turn)} closes two boxes! ${game.scores[0]} to ${game.scores[1]}.`
    );
  } else {
    announce(`${nameOf(turn)} draws a line.`);
  }

  if (isComplete(game)) {
    endMatch();
    return;
  }

  if (!got) turn = 1 - turn;
  render();
  scheduleAi();
}

let currentEdge = null;

function scheduleAi() {
  if (over || mode !== 'ai' || turn !== 1 || aiId !== null) return;
  const myToken = token;
  aiId = window.setTimeout(() => {
    aiId = null;
    if (myToken !== token || over || turn !== 1 || mode !== 'ai') return;
    const choice = aiChoose(game, Math.random);
    if (!choice) return;
    currentEdge = choice;
    const result = claim(game, choice, 1);
    if (result) applyResult(result);
  }, 480);
  render();
}

function endMatch() {
  over = true;
  clearAi();
  render();

  const [a, b] = game.scores;
  const winner = a === b ? -1 : a > b ? 0 : 1;

  if (winner === -1) {
    veilTitle.textContent = "It's a draw!";
    veilCopy.textContent = `${a} boxes each. Nobody gives an inch.`;
  } else {
    veilTitle.textContent = `${nameOf(winner)} wins!`;
    veilCopy.textContent = `${Math.max(a, b)} boxes to ${Math.min(a, b)}.`;
  }

  veilStats.replaceChildren();
  for (const [term, value] of [
    [nameOf(0), a],
    [nameOf(1), b],
    ['Lines', drawn]
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
  rematchBtn.focus({ preventScroll: true });
  announce(winner === -1 ? `Board complete. It's a draw, ${a} each.` : `Board complete. ${nameOf(winner)} wins ${Math.max(a, b)} to ${Math.min(a, b)}.`);
}

function resetMatch() {
  token += 1;
  clearAi();
  game = createGame(size);
  turn = 0;
  over = false;
  drawn = 0;
  currentEdge = null;
  veil.hidden = true;
  buildGrid();
  render();
  announce(`${size}×${size} board. Player 1 draws first.`);
}

function restart() {
  if (boardWrap.dataset.refreshing === 'true') return;
  softRefresh(boardWrap, () => {
    resetMatch();
    boardWrap.focus({ preventScroll: true });
  });
}

/* ---------- chrome ---------- */

function setSize(next) {
  if (![3, 4, 5].includes(next) || next === size) return;
  size = next;
  saveSize();
  sizeButtons.forEach((button) => {
    const active = Number(button.dataset.size) === next;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  restart();
}

function setMode(next) {
  if (next !== '2p' && next !== 'ai') return;
  if (next === mode) return;
  mode = next;
  modeButtons.forEach((button) => {
    const on = button.dataset.mode === mode;
    button.classList.toggle('is-on', on);
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  restart();
}

boardWrap.setAttribute('tabindex', '-1');

sizeButtons.forEach((button) => {
  button.addEventListener('click', () => setSize(Number(button.dataset.size)));
});

modeButtons.forEach((button) => {
  button.addEventListener('click', () => setMode(button.dataset.mode));
});

$('reset').addEventListener('click', restart);
rematchBtn.addEventListener('click', restart);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearAi();
  else scheduleAi();
});

sizeButtons.forEach((button) => {
  const active = Number(button.dataset.size) === size;
  button.classList.toggle('is-active', active);
  button.setAttribute('aria-pressed', active ? 'true' : 'false');
});

resetMatch();
