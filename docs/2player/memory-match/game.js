import { softRefresh } from '../../shared/refresh.js';

const $ = (id) => document.getElementById(id);

const NAMES = ['Player 1', 'Player 2'];
const PAIRS = 8;
const FLIP_BACK_MS = 800;
const RESULT_DELAY_MS = 560;

const FACES = [
  { id: 'star', label: 'star' },
  { id: 'heart', label: 'heart' },
  { id: 'leaf', label: 'leaf' },
  { id: 'moon', label: 'moon' },
  { id: 'fish', label: 'fish' },
  { id: 'flower', label: 'flower' },
  { id: 'bolt', label: 'bolt' },
  { id: 'gem', label: 'gem' }
];

const playArea = $('play');
const boardEl = $('board');
const scoreEls = [$('score-1'), $('score-2')];
const playerEls = [$('player-1'), $('player-2')];
const turnbar = $('turnbar');
const turnText = $('turn-text');
const statusEl = $('status');
const veil = $('veil');
const veilEyebrow = $('veil-eyebrow');
const veilTitle = $('veil-title');
const veilScore = $('veil-score');
const veilCopy = $('veil-copy');
const rematchBtn = $('veil-rematch');
const newMatchBtn = $('new-match');

let cards = [];
let elements = [];
let scores = [0, 0];
let turn = 0;
let starter = 0;
let first = null;
let locked = false;
let matchedCount = 0;
let matchOver = false;
let timer = 0;

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function faceLabel(card, matched = card.matched) {
  return `Card ${card.index + 1}, ${card.label}${matched ? ', matched' : ''}`;
}

function updateScores(bumpIndex = -1) {
  scoreEls.forEach((el, index) => {
    el.textContent = String(scores[index]);
    if (index === bumpIndex) {
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    }
  });
}

function setTurnUi() {
  playerEls.forEach((el, index) => {
    el.classList.toggle('is-active', !matchOver && index === turn);
  });
  turnbar.classList.toggle('is-p2', turn === 1);
  turnText.textContent = matchOver ? 'Match complete' : `${NAMES[turn]}'s turn`;
}

function buildBoard() {
  const fragment = document.createDocumentFragment();
  elements = [];

  cards.forEach((card, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'card';
    button.dataset.index = String(index);
    button.dataset.face = card.id;
    button.setAttribute('aria-label', `Card ${index + 1}, face down`);

    const inner = document.createElement('span');
    inner.className = 'card__inner';

    const back = document.createElement('span');
    back.className = 'face back';
    back.setAttribute('aria-hidden', 'true');
    const mark = document.createElement('span');
    mark.className = 'back-mark';
    back.appendChild(mark);

    const front = document.createElement('span');
    front.className = 'face front';
    front.setAttribute('aria-hidden', 'true');
    const img = document.createElement('img');
    img.src = `assets/${card.id}.svg`;
    img.alt = '';
    img.width = 96;
    img.height = 96;
    img.decoding = 'async';
    front.appendChild(img);

    inner.append(back, front);
    button.appendChild(inner);
    fragment.appendChild(button);
    elements.push(button);
  });

  boardEl.replaceChildren(fragment);
}

function startMatch(focusBoard = false) {
  window.clearTimeout(timer);
  timer = 0;

  scores = [0, 0];
  matchedCount = 0;
  first = null;
  locked = false;
  matchOver = false;

  turn = starter;
  starter = 1 - starter;

  veil.hidden = true;
  boardEl.classList.remove('is-locked');
  boardEl.removeAttribute('aria-busy');

  const deck = FACES.flatMap((face, pair) => [
    { ...face, pair },
    { ...face, pair }
  ]);
  shuffle(deck);
  cards = deck.map((face, index) => ({ ...face, index, matched: false }));

  buildBoard();
  updateScores();
  setTurnUi();
  statusEl.textContent = `New match. ${NAMES[turn]} starts. Flip two cards to find a pair.`;

  if (focusBoard) {
    window.requestAnimationFrame(() => {
      elements[0]?.focus({ preventScroll: true });
    });
  }
}

function endMatch() {
  matchOver = true;
  locked = true;

  const leader = scores[0] === scores[1] ? -1 : scores[0] > scores[1] ? 0 : 1;
  playerEls.forEach((el, index) => el.classList.toggle('is-active', index === leader));
  turnbar.classList.toggle('is-p2', leader === 1);
  turnText.textContent = 'Match complete';

  timer = window.setTimeout(showResult, RESULT_DELAY_MS);
}

function showResult() {
  timer = 0;
  const [one, two] = scores;
  const tie = one === two;
  const winner = one > two ? 0 : 1;

  veilEyebrow.textContent = tie ? 'Dead heat' : 'Match complete';
  veilTitle.textContent = tie ? "It's a tie!" : `${NAMES[winner]} wins!`;
  veilScore.textContent = `${one} – ${two}`;
  veilCopy.textContent = tie
    ? 'All eight pairs found. The board could not pick a winner.'
    : `All eight pairs found. ${NAMES[winner]} took it ${Math.max(one, two)} to ${Math.min(one, two)}.`;

  veil.hidden = false;
  rematchBtn.focus({ preventScroll: true });

  statusEl.textContent = tie
    ? `Match over. It's a tie, ${one} pairs each.`
    : `Match over. ${NAMES[winner]} wins ${Math.max(one, two)} pairs to ${Math.min(one, two)}.`;
}

function pick(index) {
  if (locked || matchOver) return;

  const card = cards[index];
  const button = elements[index];
  if (!card || card.matched || button.classList.contains('is-flipped')) return;

  button.classList.add('is-flipped');
  button.setAttribute('aria-label', faceLabel(card));

  if (first === null) {
    first = index;
    statusEl.textContent = `${NAMES[turn]} flips card ${index + 1}: ${card.label}. Pick one more.`;
    return;
  }

  const previous = cards[first];
  const previousButton = elements[first];

  if (previous.pair === card.pair) {
    previous.matched = true;
    card.matched = true;
    matchedCount += 1;
    scores[turn] += 1;

    previousButton.classList.add('is-matched');
    button.classList.add('is-matched');
    previousButton.setAttribute('aria-label', faceLabel(previous));
    button.setAttribute('aria-label', faceLabel(card));

    first = null;
    updateScores(turn);

    if (matchedCount === PAIRS) {
      statusEl.textContent = `Match! ${NAMES[turn]} found the ${card.label} pair. All eight pairs found.`;
      endMatch();
      return;
    }

    setTurnUi();
    statusEl.textContent = `Match! ${NAMES[turn]} found the ${card.label} pair and goes again. Score ${scores[0]} to ${scores[1]}.`;
    return;
  }

  first = null;
  locked = true;
  boardEl.classList.add('is-locked');
  boardEl.setAttribute('aria-busy', 'true');

  const shown = [previous.index, index];

  timer = window.setTimeout(() => {
    timer = 0;
    shown.forEach((cardIndex) => {
      elements[cardIndex].classList.remove('is-flipped');
      elements[cardIndex].setAttribute('aria-label', `Card ${cardIndex + 1}, face down`);
    });

    turn = 1 - turn;
    locked = false;
    boardEl.classList.remove('is-locked');
    boardEl.removeAttribute('aria-busy');
    setTurnUi();
    statusEl.textContent = `No match. ${NAMES[turn]}'s turn.`;
  }, FLIP_BACK_MS);
}

function requestNewMatch() {
  softRefresh(playArea, () => startMatch(true));
}

boardEl.addEventListener('click', (event) => {
  const button = event.target.closest('.card');
  if (!button) return;
  pick(Number(button.dataset.index));
});

scoreEls.forEach((el) => {
  el.addEventListener('animationend', () => el.classList.remove('bump'));
});

$('reset').addEventListener('click', requestNewMatch);
newMatchBtn.addEventListener('click', requestNewMatch);
rematchBtn.addEventListener('click', requestNewMatch);

veil.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  event.preventDefault();
  rematchBtn.focus({ preventScroll: true });
});

startMatch(false);
