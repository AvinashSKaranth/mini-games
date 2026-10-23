import { softRefresh } from '../../shared/refresh.js';
import {
  MAX_MISSES,
  isSolved,
  livesLeft,
  maskWord,
  missingLetters,
  pickWord,
  wrongLetters
} from './engine.js';

const $ = (id) => document.getElementById(id);
const STATS_KEY = 'mini-games:hangman:stats';
const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

const playEl = $('play');
const wordEl = $('word');
const keyboardEl = $('keyboard');
const categoryEl = $('category');
const gallowsEl = $('gallows');
const parts = [...document.querySelectorAll('#figure .part')];
const statusEl = $('status');
const veil = $('veil');
const veilEyebrow = $('veil-eyebrow');
const veilTitle = $('veil-title');
const veilCopy = $('veil-copy');
const veilStats = $('veil-stats');
const veilPrimary = $('veil-primary');
const newGameBtn = $('new-game');

const statEls = {
  played: $('stat-played'),
  wins: $('stat-wins'),
  streak: $('stat-streak'),
  best: $('stat-best')
};

const keyButtons = new Map();
for (const row of ROWS) {
  const rowEl = document.createElement('div');
  rowEl.className = 'key-row';
  for (const letter of row) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'key';
    button.dataset.key = letter;
    button.textContent = letter;
    button.setAttribute('aria-label', `Guess ${letter}`);
    button.setAttribute('aria-pressed', 'false');
    keyButtons.set(letter, button);
    rowEl.appendChild(button);
  }
  keyboardEl.appendChild(rowEl);
}

const emptyStats = () => ({ played: 0, wins: 0, streak: 0, best: 0 });

let stats = loadStats();
let puzzle = null;
let guessed = new Set();
let over = false;
let recorded = false;
let previousWord = '';

function loadStats() {
  const base = emptyStats();
  try {
    const saved = JSON.parse(localStorage.getItem(STATS_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return base;
    for (const key of Object.keys(base)) {
      const value = Math.floor(Number(saved[key]));
      if (Number.isFinite(value) && value > 0) base[key] = value;
    }
    base.best = Math.max(base.best, base.streak);
  } catch {
    /* private mode: keep the tally for this session only */
  }
  return base;
}

function saveStats() {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    /* storage is optional */
  }
}

function renderStats() {
  for (const [key, el] of Object.entries(statEls)) el.textContent = String(stats[key]);
}

function paintWord(reveal = false) {
  const mask = maskWord(puzzle.word, guessed);
  const slots = [...wordEl.children];

  slots.forEach((slot, index) => {
    const span = slot.firstElementChild;
    const letter = mask[index];
    if (letter) {
      if (span.textContent !== letter) {
        span.textContent = letter;
        slot.classList.add('is-filled');
      }
    } else if (reveal) {
      span.textContent = puzzle.word[index];
      slot.classList.add('is-filled', 'is-miss');
    } else {
      span.textContent = '';
      slot.classList.remove('is-filled', 'is-miss');
    }
  });

  const found = mask.filter(Boolean).length;
  wordEl.setAttribute(
    'aria-label',
    `Word, ${puzzle.word.length} letters, ${found} revealed: ${mask.map((letter) => letter || 'blank').join(' ')}`
  );
}

function buildWord() {
  wordEl.replaceChildren();
  for (let index = 0; index < puzzle.word.length; index += 1) {
    const slot = document.createElement('li');
    slot.className = 'slot';
    slot.appendChild(document.createElement('span'));
    wordEl.appendChild(slot);
  }
  paintWord();
}

function drawFigure(count) {
  parts.forEach((part, index) => part.classList.toggle('is-on', index < count));
  gallowsEl.setAttribute(
    'aria-label',
    count === 0 ? 'Empty gallows, no parts drawn' : `Gallows with ${count} of ${MAX_MISSES} parts drawn`
  );
}

function finish(win) {
  over = true;
  if (recorded) return;
  recorded = true;

  stats.played += 1;
  if (win) {
    stats.wins += 1;
    stats.streak += 1;
    stats.best = Math.max(stats.best, stats.streak);
  } else {
    stats.streak = 0;
  }
  saveStats();
  renderStats();

  if (!win) paintWord(true);
  drawFigure(wrongLetters(puzzle.word, guessed).length);

  veilEyebrow.textContent = win ? 'Word found' : 'Out of misses';
  veilTitle.textContent = win ? 'Nicely decoded' : 'The rope ran out';
  const spare = Math.max(0, livesLeft(puzzle.word, guessed));
  veilCopy.textContent = win
    ? `The word was ${puzzle.word} · ${puzzle.category}, with ${spare} miss${spare === 1 ? '' : 'es'} to spare.`
    : `The word was ${puzzle.word} · ${puzzle.category}.`;

  veilStats.replaceChildren();
  for (const [label, value] of [
    ['Played', stats.played],
    ['Wins', stats.wins],
    ['Streak', stats.streak],
    ['Best', stats.best]
  ]) {
    const cell = document.createElement('div');
    const term = document.createElement('dt');
    const detail = document.createElement('dd');
    term.textContent = label;
    detail.textContent = String(value);
    cell.append(term, detail);
    veilStats.appendChild(cell);
  }

  veil.hidden = false;
  veilPrimary.focus({ preventScroll: true });
  statusEl.textContent = win
    ? `You found ${puzzle.word}.`
    : `Out of misses. The word was ${puzzle.word}.`;
}

function guess(letter) {
  if (!puzzle || over || guessed.has(letter)) return;
  guessed.add(letter);

  const button = keyButtons.get(letter);
  button.disabled = true;
  button.setAttribute('aria-pressed', 'true');

  if (puzzle.word.includes(letter)) {
    button.dataset.state = 'correct';
    paintWord();
    if (isSolved(puzzle.word, guessed)) {
      finish(true);
      return;
    }
    const remaining = missingLetters(puzzle.word, guessed).length;
    statusEl.textContent = `Yes, ${letter} is in the word. ${remaining} letter${remaining === 1 ? '' : 's'} left to find.`;
    return;
  }

  button.dataset.state = 'absent';
  const misses = wrongLetters(puzzle.word, guessed).length;
  drawFigure(misses);
  const lives = MAX_MISSES - misses;
  if (lives <= 0) {
    finish(false);
    return;
  }
  statusEl.textContent = `No ${letter}. ${lives} miss${lives === 1 ? '' : 'es'} left.`;
}

function resetGame() {
  puzzle = pickWord(Math.random, previousWord);
  previousWord = puzzle.word;
  guessed = new Set();
  over = false;
  recorded = false;

  parts.forEach((part) => part.classList.remove('is-on'));
  gallowsEl.setAttribute('aria-label', 'Empty gallows, no parts drawn');

  keyButtons.forEach((button) => {
    delete button.dataset.state;
    button.disabled = false;
    button.setAttribute('aria-pressed', 'false');
  });

  categoryEl.textContent = `${puzzle.category} · ${puzzle.word.length} letters`;
  buildWord();
  veil.hidden = true;
  renderStats();
  statusEl.textContent = `New word. Category ${puzzle.category}, ${puzzle.word.length} letters.`;
}

function startNewGame() {
  if (playEl.dataset.refreshing === 'true') return;
  softRefresh(playEl, resetGame).then(() => playEl.focus({ preventScroll: true }));
}

keyboardEl.addEventListener('click', (event) => {
  const button = event.target.closest('.key');
  if (!button || button.disabled) return;
  if (event.detail > 0) button.blur();
  guess(button.dataset.key);
});

window.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  if (!veil.hidden) {
    if (event.key === 'Enter') {
      event.preventDefault();
      startNewGame();
    }
    return;
  }

  if (/^[a-zA-Z]$/.test(event.key) && !event.repeat) {
    event.preventDefault();
    guess(event.key.toUpperCase());
  }
});

veil.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  event.preventDefault();
  veilPrimary.focus({ preventScroll: true });
});

newGameBtn.addEventListener('click', startNewGame);
veilPrimary.addEventListener('click', startNewGame);

resetGame();
