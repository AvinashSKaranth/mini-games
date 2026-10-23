import { softRefresh } from '../../shared/refresh.js';

const $ = (id) => document.getElementById(id);
const app = document.querySelector('.app');
const table = $('table');
const tableauEl = $('tableau');
const stockEl = $('stock');
const wasteEl = $('waste');
const foundationEls = [0, 1, 2, 3].map((i) => $(`foundation-${i}`));
const movesEl = $('moves');
const timeEl = $('time');
const remainingEl = $('remaining');
const statusEl = $('status');
const veil = $('veil');

const SUITS = [
  { symbol: '♠', name: 'Spades', red: false },
  { symbol: '♥', name: 'Hearts', red: true },
  { symbol: '♦', name: 'Diamonds', red: true },
  { symbol: '♣', name: 'Clubs', red: false }
];
const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const CARD_OFFSET = 26;

let stock = [];
let waste = [];
let foundations = [[], [], [], []];
let tableau = [[], [], [], [], [], [], []];
let selected = null;
let moves = 0;
let startedAt = 0;
let timerId = null;
let over = false;

function newGame() {
  if (timerId) window.clearInterval(timerId);
  const deck = [];
  for (let suit = 0; suit < 4; suit += 1) {
    for (let rank = 1; rank <= 13; rank += 1) deck.push({ suit, rank, up: false });
  }
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  tableau = Array.from({ length: 7 }, () => []);
  for (let col = 0; col < 7; col += 1) {
    for (let row = 0; row <= col; row += 1) {
      const card = deck.pop();
      card.up = row === col;
      tableau[col].push(card);
    }
  }

  stock = deck;
  waste = [];
  foundations = [[], [], [], []];
  selected = null;
  moves = 0;
  over = false;
  startedAt = Date.now();
  veil.hidden = true;
  movesEl.textContent = '0';
  timeEl.textContent = '0:00';
  updateRemaining();
  render();
  statusEl.textContent = 'New deal. Tap the stock to draw.';
  timerId = window.setInterval(updateTime, 1000);
}

function updateTime() {
  if (over) return;
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  timeEl.textContent = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
}

function updateRemaining() {
  const home = foundations.reduce((sum, pile) => sum + pile.length, 0);
  remainingEl.textContent = String(52 - home);
}

function isRed(card) {
  return SUITS[card.suit].red;
}

function canStack(card, target) {
  if (!target) return card.rank === 13;
  return target.up && card.rank === target.rank - 1 && isRed(card) !== isRed(target);
}

function canHome(card, suit) {
  if (card.suit !== suit) return false;
  const pile = foundations[suit];
  return pile.length === 0 ? card.rank === 1 : pile[pile.length - 1].rank + 1 === card.rank;
}

function cardElement(card, zone, extra = {}) {
  const el = document.createElement('div');
  el.className = 'card';
  if (card.up) {
    if (isRed(card)) el.classList.add('is-red');
    el.innerHTML = `<span class="rank">${RANKS[card.rank]}</span><span class="suit">${SUITS[card.suit].symbol}</span><span class="pip">${SUITS[card.suit].symbol}</span>`;
  } else {
    el.classList.add('is-back');
  }
  el.dataset.zone = zone;
  if (extra.col !== undefined) el.dataset.col = String(extra.col);
  if (extra.index !== undefined) el.dataset.index = String(extra.index);
  if (extra.suit !== undefined) el.dataset.suit = String(extra.suit);
  if (extra.top !== undefined) el.style.top = `${extra.top}px`;
  if (selected && selected.zone === zone && selected.col === extra.col && selected.index === extra.index && selected.suit === extra.suit) {
    el.classList.add('is-selected');
  }
  el.setAttribute('role', 'button');
  el.tabIndex = 0;
  const where = zone === 'tableau' ? `tableau column ${extra.col + 1}, row ${extra.index + 1}` : zone === 'waste' ? 'waste pile' : `foundation ${SUITS[extra.suit]?.name ?? ''}`;
  el.setAttribute('aria-label', `${card.up ? `${RANKS[card.rank]} of ${SUITS[card.suit].name}` : 'Face-down card'}, ${where}${card.up ? ', face up' : ', face down'}`);
  return el;
}

function render() {
  movesEl.textContent = String(moves);
  updateRemaining();
  stockEl.classList.toggle('has-cards', stock.length > 0);
  stockEl.setAttribute('aria-label', stock.length ? `Draw from stock, ${stock.length} cards left` : 'Recycle the waste pile');

  wasteEl.replaceChildren();
  if (waste.length) wasteEl.appendChild(cardElement(waste[waste.length - 1], 'waste'));

  foundationEls.forEach((el, suit) => {
    el.replaceChildren();
    const pile = foundations[suit];
    el.classList.toggle('has-cards', pile.length > 0);
    if (pile.length) {
      el.appendChild(cardElement(pile[pile.length - 1], 'foundation', { suit }));
    } else {
      el.textContent = SUITS[suit].symbol;
      el.classList.remove('has-cards');
    }
  });

  tableauEl.replaceChildren();
  tableau.forEach((pile, col) => {
    const column = document.createElement('div');
    column.className = 'tableau-col';
    column.dataset.col = String(col);
    const compact = window.matchMedia('(orientation: landscape) and (max-height: 620px)').matches;
    const offset = compact ? 16 : CARD_OFFSET;
    column.style.height = `${Math.max(compact ? 140 : 280, (compact ? 70 : 100) + pile.length * offset)}px`;
    if (!pile.length) {
      const empty = document.createElement('span');
      empty.className = 'slot-empty';
      column.appendChild(empty);
    }
    pile.forEach((card, index) => {
      column.appendChild(cardElement(card, 'tableau', { col, index, top: index * offset }));
    });
    tableauEl.appendChild(column);
  });
}

function drawStock() {
  if (over) return;
  selected = null;
  if (stock.length) {
    const card = stock.pop();
    card.up = true;
    waste.push(card);
    moves += 1;
    statusEl.textContent = `Drew ${RANKS[card.rank]} of ${SUITS[card.suit].name}.`;
  } else if (waste.length) {
    while (waste.length) {
      const card = waste.pop();
      card.up = false;
      stock.push(card);
    }
    moves += 1;
    statusEl.textContent = 'Waste recycled. Draw again.';
  } else {
    statusEl.textContent = 'No cards left to draw.';
  }
  render();
}

function selectCard(zone, data) {
  if (over) return;
  if (zone === 'waste') {
    if (!waste.length) return;
    selected = { zone: 'waste', cards: [waste[waste.length - 1]] };
    statusEl.textContent = 'Card selected. Tap a tableau column or foundation.';
  } else if (zone === 'foundation') {
    const suit = Number(data.suit);
    const pile = foundations[suit];
    if (!pile.length) return;
    selected = { zone: 'foundation', suit, cards: [pile[pile.length - 1]] };
    statusEl.textContent = 'Card selected. Tap a tableau column.';
  } else if (zone === 'tableau') {
    const col = Number(data.col);
    const index = Number(data.index);
    const pile = tableau[col];
    const card = pile[index];
    if (!card) return;
    if (!card.up) {
      if (index === pile.length - 1) {
        card.up = true;
        moves += 1;
        statusEl.textContent = 'Card flipped.';
        selected = null;
        render();
      }
      return;
    }
    const cards = pile.slice(index);
    if (!cards.every((item) => item.up)) return;
    selected = { zone: 'tableau', col, index, cards };
    statusEl.textContent = `${cards.length} card${cards.length === 1 ? '' : 's'} selected.`;
  }
  render();
}

function removeSelected() {
  if (!selected) return;
  if (selected.zone === 'waste') {
    waste.pop();
  } else if (selected.zone === 'foundation') {
    foundations[selected.suit].pop();
  } else if (selected.zone === 'tableau') {
    tableau[selected.col].splice(selected.index);
    flipTop(selected.col);
  }
}

function flipTop(col) {
  const pile = tableau[col];
  if (pile.length && !pile[pile.length - 1].up) pile[pile.length - 1].up = true;
}

function tryTableau(col) {
  if (!selected) return false;
  const card = selected.cards[0];
  const target = tableau[col][tableau[col].length - 1] ?? null;
  if (!canStack(card, target)) return false;
  removeSelected();
  tableau[col].push(...selected.cards);
  moves += 1;
  selected = null;
  statusEl.textContent = `Moved to column ${col + 1}.`;
  render();
  checkWin();
  return true;
}

function tryFoundation(suit) {
  if (!selected || selected.cards.length !== 1) return false;
  const card = selected.cards[0];
  if (!canHome(card, suit)) return false;
  removeSelected();
  foundations[suit].push(card);
  moves += 1;
  selected = null;
  statusEl.textContent = `Sent ${RANKS[card.rank]} of ${SUITS[card.suit].name} home.`;
  render();
  checkWin();
  return true;
}

function checkWin() {
  if (!foundations.every((pile) => pile.length === 13)) return;
  over = true;
  if (timerId) window.clearInterval(timerId);
  updateTime();
  $('veil-title').textContent = 'You won!';
  $('veil-copy').textContent = `All four suits home in ${moves} moves and ${timeEl.textContent}.`;
  veil.hidden = false;
  statusEl.textContent = `You won in ${moves} moves.`;
  requestAnimationFrame(() => $('rematch').focus({ preventScroll: true }));
}

table.addEventListener('click', (event) => {
  if (over) return;
  if (event.target.closest('#stock')) {
    drawStock();
    return;
  }

  const card = event.target.closest('.card');
  if (card) {
    const zone = card.dataset.zone;
    const data = {
      col: card.dataset.col,
      index: card.dataset.index,
      suit: card.dataset.suit
    };

    if (selected) {
      if (zone === 'tableau' && tryTableau(Number(data.col))) return;
      if (zone === 'foundation' && tryFoundation(Number(data.suit))) return;
      if (selected.zone === zone && selected.col === Number(data.col) && selected.index === Number(data.index)) {
        selected = null;
        render();
        return;
      }
    }

    selectCard(zone, data);
    return;
  }

  const column = event.target.closest('.tableau-col');
  if (column) {
    if (!tryTableau(Number(column.dataset.col))) {
      selected = null;
      render();
    }
    return;
  }

  const foundation = event.target.closest('.foundation');
  if (foundation) {
    if (!tryFoundation(Number(foundation.dataset.foundation))) {
      selected = null;
      render();
    }
  }
});

table.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const card = event.target.closest('.card');
  if (!card) return;
  event.preventDefault();
  card.click();
});

let compactLayout = window.matchMedia('(orientation: landscape) and (max-height: 620px)').matches;
window.addEventListener('resize', () => {
  const next = window.matchMedia('(orientation: landscape) and (max-height: 620px)').matches;
  if (next !== compactLayout) {
    compactLayout = next;
    render();
  }
});

const requestNewGame = () => softRefresh(app, newGame);
$('reset').addEventListener('click', requestNewGame);
$('new-game').addEventListener('click', requestNewGame);
$('rematch').addEventListener('click', requestNewGame);

newGame();
