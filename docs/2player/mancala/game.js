import { softRefresh } from '../../shared/refresh.js';

const $ = (id) => document.getElementById(id);
const boardWrap = $('board-wrap');
const rowTop = $('row-top');
const rowBottom = $('row-bottom');
const turnbar = $('turnbar');
const turnText = $('turn-text');
const hintTurn = $('hint-turn');
const storeEls = [$('store-1'), $('store-2')];
const storeCounts = [$('store-count-1'), $('store-count-2')];
const statusEl = $('status');
const veil = $('veil');

const P1_STORE = 6;
const P2_STORE = 13;
const NAMES = ['Player 1', 'Player 2'];
const topButtons = [];
const bottomButtons = [];

let pits = Array(14).fill(0);
let stores = [0, 0];
let turn = 0;
let busy = false;
let over = false;

function newGame() {
  pits = Array(14).fill(0);
  for (let i = 0; i < 6; i += 1) pits[i] = 4;
  for (let i = 7; i < 13; i += 1) pits[i] = 4;
  stores = [0, 0];
  turn = 0;
  busy = false;
  over = false;
  veil.hidden = true;
  buildRows();
  render();
  statusEl.textContent = 'Player 1 starts. Pick a pit on the bottom row.';
}

function buildRows() {
  rowTop.replaceChildren();
  rowBottom.replaceChildren();
  topButtons.length = 0;
  bottomButtons.length = 0;

  for (let i = 12; i >= 7; i -= 1) {
    const button = makePit(i, 1);
    rowTop.appendChild(button);
    topButtons.push(button);
  }
  for (let i = 0; i < 6; i += 1) {
    const button = makePit(i, 0);
    rowBottom.appendChild(button);
    bottomButtons.push(button);
  }
}

function makePit(index, owner) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pit';
  button.dataset.index = String(index);
  button.dataset.owner = String(owner);
  button.innerHTML = '<span class="stones" aria-hidden="true"></span><b>4</b>';
  button.addEventListener('click', () => play(index));
  return button;
}

function isOwnPit(index, player) {
  return player === 0 ? index >= 0 && index <= 5 : index >= 7 && index <= 12;
}

function nextIndex(index, player) {
  let next = index;
  const skip = player === 0 ? P2_STORE : P1_STORE;
  do {
    next = (next + 1) % 14;
  } while (next === skip);
  return next;
}

function play(index) {
  if (busy || over || !isOwnPit(index, turn) || pits[index] === 0) return;
  busy = true;
  const player = turn;
  const name = NAMES[player];
  const stones = pits[index];
  pits[index] = 0;
  let cursor = index;
  let left = stones;

  while (left > 0) {
    cursor = nextIndex(cursor, player);
    pits[cursor] += 1;
    left -= 1;
  }

  const ownStore = player === 0 ? P1_STORE : P2_STORE;
  let extra = cursor === ownStore;
  let captured = 0;

  if (!extra && isOwnPit(cursor, player) && pits[cursor] === 1) {
    const opposite = 12 - cursor;
    if (pits[opposite] > 0) {
      captured = pits[opposite] + 1;
      stores[player] += captured;
      pits[opposite] = 0;
      pits[cursor] = 0;
    }
  }

  render();
  bump(cursor);

  if (checkEnd()) return;

  if (extra) {
    statusEl.textContent = `${name} lands in their store and goes again.`;
    hintTurn.textContent = 'Extra turn';
    busy = false;
    render();
    return;
  }

  turn = 1 - turn;
  busy = false;
  render();
  if (captured) {
    statusEl.textContent = `${name} captures ${captured} stones! ${NAMES[turn]}'s turn.`;
  } else {
    statusEl.textContent = `${name} sowed ${stones} stones. ${NAMES[turn]}'s turn.`;
  }
}

function bump(index) {
  const button = [...topButtons, ...bottomButtons].find((el) => Number(el.dataset.index) === index);
  if (!button) return;
  button.classList.remove('bump');
  void button.offsetWidth;
  button.classList.add('bump');
}

function render() {
  const all = [...topButtons, ...bottomButtons];
  for (const button of all) {
    const index = Number(button.dataset.index);
    const owner = Number(button.dataset.owner);
    const count = pits[index];
    const selectable = !busy && !over && owner === turn && count > 0;
    button.disabled = !selectable;
    button.classList.toggle('is-own', owner === turn && !over);
    button.classList.toggle('is-empty', count === 0);
    button.querySelector('b').textContent = String(count);
    const stones = button.querySelector('.stones');
    stones.replaceChildren();
    const visible = Math.min(count, 9);
    for (let i = 0; i < visible; i += 1) stones.appendChild(document.createElement('i'));
    button.setAttribute('aria-label', `${NAMES[owner]} pit ${owner === 0 ? index + 1 : 13 - index}, ${count} stone${count === 1 ? '' : 's'}${selectable ? ', playable' : ''}`);
  }

  storeCounts[0].textContent = String(stores[0]);
  storeCounts[1].textContent = String(stores[1]);
  storeEls[0].classList.toggle('is-own', turn === 0 && !over);
  storeEls[1].classList.toggle('is-own', turn === 1 && !over);

  turnbar.classList.toggle('is-p2', turn === 1);
  turnText.textContent = over ? 'Game over' : `${NAMES[turn]}'s turn`;
  if (!over) hintTurn.textContent = turn === 0 ? 'Bottom row' : 'Top row';
}

function checkEnd() {
  const p1Empty = pits.slice(0, 6).every((value) => value === 0);
  const p2Empty = pits.slice(7, 13).every((value) => value === 0);
  if (!p1Empty && !p2Empty) return false;

  if (p2Empty) {
    for (let i = 0; i < 6; i += 1) {
      stores[0] += pits[i];
      pits[i] = 0;
    }
  }
  if (p1Empty) {
    for (let i = 7; i < 13; i += 1) {
      stores[1] += pits[i];
      pits[i] = 0;
    }
  }

  over = true;
  busy = false;
  render();
  showResult();
  return true;
}

function showResult() {
  const [a, b] = stores;
  const title = a === b ? "It's a tie!" : a > b ? 'Player 1 wins!' : 'Player 2 wins!';
  $('veil-title').textContent = title;
  $('veil-copy').textContent = `${a} to ${b} stones. ${a === b ? 'A perfectly even harvest.' : 'The store tells the story.'}`;
  veil.hidden = false;
  statusEl.textContent = `${title} ${a} to ${b}.`;
  requestAnimationFrame(() => $('rematch').focus({ preventScroll: true }));
}

const requestNewGame = () => softRefresh(boardWrap, newGame);
$('reset').addEventListener('click', requestNewGame);
$('rematch').addEventListener('click', requestNewGame);

newGame();
