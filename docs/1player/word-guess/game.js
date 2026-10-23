import { softRefresh } from '../../shared/refresh.js';

const $ = (id) => document.getElementById(id);

/* Common, family-friendly five-letter words used for both answers and guesses. */
const WORDS = [
  'about', 'above', 'actor', 'acute', 'admit', 'adopt', 'adult', 'after', 'again', 'agent',
  'agree', 'ahead', 'alarm', 'album', 'alert', 'alike', 'alive', 'allow', 'alone', 'along',
  'alter', 'amber', 'among', 'ample', 'angel', 'anger', 'angle', 'angry', 'ankle', 'apart',
  'apple', 'apply', 'apron', 'arena', 'argue', 'arise', 'armor', 'aroma', 'array', 'arrow',
  'aside', 'asset', 'atlas', 'avoid', 'awake', 'award', 'aware',
  'bacon', 'badge', 'baker', 'basic', 'basil', 'basin', 'batch', 'beach', 'beard', 'beast',
  'began', 'begin', 'being', 'belly', 'below', 'bench', 'berry', 'birth', 'black', 'blade',
  'blame', 'blank', 'blast', 'blend', 'bless', 'blind', 'block', 'bloom', 'board', 'bonus',
  'boost', 'booth', 'brain', 'brand', 'brave', 'bread', 'break', 'breed', 'brick', 'bride',
  'brief', 'bring', 'brisk', 'broad', 'brown', 'brush', 'build', 'bunny', 'burst',
  'cabin', 'cable', 'camel', 'candy', 'canoe', 'carry', 'carve', 'catch', 'cause', 'chain',
  'chair', 'chalk', 'charm', 'chart', 'chase', 'cheap', 'check', 'cheer', 'chess', 'chest',
  'chief', 'child', 'chill', 'choir', 'chose', 'chunk', 'cider', 'civic', 'civil', 'claim',
  'clash', 'class', 'clean', 'clear', 'clerk', 'click', 'cliff', 'climb', 'clock', 'close',
  'cloth', 'cloud', 'clown', 'coach', 'coast', 'cocoa', 'color', 'comet', 'coral', 'couch',
  'cough', 'could', 'count', 'court', 'cover', 'crack', 'craft', 'crane', 'crash', 'crate',
  'crazy', 'cream', 'creek', 'crisp', 'cross', 'crowd', 'crown', 'crust', 'curly', 'curve',
  'cycle',
  'daily', 'dairy', 'dance', 'dated', 'dealt', 'debut', 'delay', 'delta', 'dense', 'depth',
  'derby', 'diary', 'digit', 'diner', 'dirty', 'disco', 'ditch', 'diver', 'dizzy', 'dodge',
  'doing', 'donor', 'doubt', 'dough', 'dozen', 'draft', 'drain', 'drama', 'drank', 'dream',
  'dress', 'dried', 'drift', 'drill', 'drink', 'drive', 'drove', 'dwarf', 'dwell',
  'eager', 'eagle', 'early', 'earth', 'easel', 'eight', 'elbow', 'elder', 'elect', 'elite',
  'email', 'empty', 'enemy', 'enjoy', 'enter', 'entry', 'equal', 'error', 'essay', 'event',
  'every', 'exact', 'exist', 'extra',
  'fable', 'fairy', 'faith', 'false', 'fancy', 'feast', 'fence', 'ferry', 'fetch', 'fever',
  'field', 'fiery', 'fifth', 'fifty', 'fight', 'final', 'first', 'flame', 'flash', 'fleet',
  'float', 'flock', 'flood', 'floor', 'flour', 'fluid', 'flush', 'flute', 'focus', 'foggy',
  'force', 'forge', 'forty', 'forum', 'found', 'frame', 'fresh', 'fried', 'frost', 'fruit',
  'fudge', 'funny',
  'gauge', 'ghost', 'giant', 'given', 'glass', 'gleam', 'globe', 'glory', 'glove', 'going',
  'grace', 'grade', 'grain', 'grand', 'grant', 'grape', 'graph', 'grasp', 'grass', 'grave',
  'gravy', 'great', 'green', 'greet', 'grill', 'grind', 'groan', 'groom', 'group', 'grove',
  'grown', 'guard', 'guess', 'guest', 'guide',
  'happy', 'harsh', 'haste', 'hatch', 'haunt', 'haven', 'heart', 'heavy', 'hedge', 'hello',
  'hence', 'hobby', 'honey', 'honor', 'horse', 'hotel', 'hound', 'house', 'hover', 'human',
  'humor', 'hurry',
  'ideal', 'image', 'imply', 'index', 'inner', 'input', 'irony', 'issue', 'ivory',
  'jelly', 'jewel', 'joint', 'joker', 'judge', 'juice', 'jumbo',
  'kayak', 'kneel', 'knife', 'knock', 'known', 'koala',
  'label', 'labor', 'large', 'laser', 'later', 'laugh', 'layer', 'learn', 'lease', 'least',
  'leave', 'lemon', 'level', 'light', 'lilac', 'limit', 'linen', 'liver', 'lobby', 'local',
  'lodge', 'logic', 'loose', 'loved', 'lower', 'loyal', 'lucky', 'lunar', 'lunch', 'lyric',
  'magic', 'major', 'maker', 'mango', 'maple', 'march', 'marsh', 'match', 'maybe', 'mayor',
  'medal', 'media', 'melon', 'mercy', 'merge', 'merit', 'metal', 'meter', 'midst', 'might',
  'minor', 'minus', 'mixer', 'model', 'moist', 'money', 'month', 'moral', 'motor', 'mount',
  'mouse', 'mouth', 'movie', 'mural', 'music',
  'naval', 'nerve', 'never', 'newly', 'night', 'noble', 'noise', 'north', 'novel', 'nurse',
  'nylon',
  'oasis', 'occur', 'ocean', 'offer', 'often', 'olive', 'onion', 'opera', 'orbit', 'order',
  'organ', 'other', 'otter', 'ought', 'ounce', 'outer', 'owner', 'oxide',
  'paint', 'panda', 'panel', 'paper', 'party', 'pasta', 'paste', 'patch', 'patio', 'pause',
  'peace', 'peach', 'pearl', 'pedal', 'penny', 'perch', 'piano', 'piece', 'pilot', 'pinch',
  'pitch', 'pixel', 'pizza', 'place', 'plain', 'plane', 'plant', 'plate', 'plaza', 'point',
  'polar', 'porch', 'pound', 'power', 'press', 'price', 'pride', 'prime', 'print', 'prior',
  'prize', 'probe', 'proof', 'proud', 'prove', 'prune', 'pulse', 'punch', 'pupil', 'puppy',
  'purse',
  'quack', 'queen', 'query', 'quest', 'queue', 'quick', 'quiet', 'quilt', 'quota', 'quote',
  'radar', 'radio', 'raise', 'rally', 'ranch', 'range', 'rapid', 'reach', 'ready', 'realm',
  'rebel', 'refer', 'reign', 'relax', 'relay', 'renew', 'reply', 'rerun', 'reset', 'rhyme',
  'rider', 'ridge', 'rifle', 'right', 'rigid', 'rinse', 'risen', 'risky', 'rival', 'river',
  'roast', 'robin', 'robot', 'rocky', 'rough', 'round', 'route', 'royal', 'rugby', 'ruler',
  'rumor', 'rural',
  'salad', 'salon', 'salsa', 'salty', 'sandy', 'sauce', 'scale', 'scarf', 'scene', 'scent',
  'scoop', 'scope', 'score', 'scout', 'screw', 'scrub', 'seize', 'sense', 'serve', 'seven',
  'shade', 'shady', 'shaft', 'shake', 'shall', 'shape', 'share', 'shark', 'sharp', 'shave',
  'sheep', 'sheet', 'shelf', 'shell', 'shift', 'shine', 'shiny', 'shirt', 'shock', 'shore',
  'short', 'shout', 'shown', 'shrub', 'sight', 'silly', 'since', 'siren', 'sixth', 'sixty',
  'skate', 'skill', 'skirt', 'slate', 'sleep', 'slice', 'slide', 'slope', 'small', 'smart',
  'smile', 'smoke', 'snack', 'snake', 'solar', 'solid', 'solve', 'sorry', 'sound', 'south',
  'space', 'spare', 'spark', 'speak', 'spear', 'speed', 'spell', 'spend', 'spent', 'spice',
  'spicy', 'spike', 'spill', 'spine', 'spite', 'split', 'spoke', 'spoon', 'sport', 'spray',
  'squad', 'stack', 'staff', 'stage', 'stain', 'stair', 'stake', 'stall', 'stamp', 'stand',
  'stare', 'start', 'state', 'steak', 'steal', 'steam', 'steel', 'steep', 'steer', 'stern',
  'stick', 'stiff', 'still', 'sting', 'stock', 'stone', 'stood', 'stool', 'store', 'storm',
  'story', 'stove', 'strap', 'straw', 'strip', 'stuck', 'study', 'stuff', 'stump', 'style',
  'sugar', 'suite', 'sunny', 'super', 'surge', 'sushi', 'swamp', 'swarm', 'swear', 'sweat',
  'sweep', 'sweet', 'swift', 'swing', 'sword',
  'table', 'taken', 'tally', 'tango', 'taste', 'teach', 'teeth', 'tempo', 'tenor', 'tense',
  'tenth', 'thank', 'theme', 'there', 'these', 'thick', 'thief', 'thigh', 'thing', 'think',
  'third', 'thorn', 'those', 'three', 'threw', 'throw', 'thumb', 'tiger', 'tight', 'timer',
  'timid', 'title', 'toast', 'today', 'token', 'tonic', 'tooth', 'topic', 'torch', 'total',
  'touch', 'tough', 'towel', 'tower', 'trace', 'track', 'trade', 'trail', 'train', 'trait',
  'treat', 'trend', 'trial', 'tribe', 'trick', 'tried', 'trout', 'truck', 'truly', 'trunk',
  'trust', 'truth', 'tulip', 'tutor', 'twice', 'twist', 'tying',
  'ultra', 'uncle', 'under', 'union', 'unite', 'unity', 'until', 'upper', 'upset', 'urban',
  'usage', 'usual',
  'valid', 'value', 'valve', 'vapor', 'vault', 'vegan', 'venue', 'verse', 'video', 'villa',
  'vinyl', 'viral', 'visit', 'vital', 'vivid', 'vocal', 'voice', 'voter',
  'wagon', 'waist', 'waste', 'watch', 'water', 'weary', 'weigh', 'weird', 'whale', 'wheat',
  'wheel', 'where', 'which', 'while', 'white', 'whole', 'whose', 'widow', 'width', 'woman',
  'women', 'world', 'worry', 'worse', 'worst', 'worth', 'would', 'wound', 'wrist', 'write',
  'wrong', 'wrote',
  'yacht', 'yeast', 'yield', 'young', 'youth',
  'zebra', 'zesty'
];

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
const STATS_KEY = 'mini-games:word-guess:stats';
const WORD_SET = new Set(WORDS);
const KEY_ORDER = { absent: 1, present: 2, correct: 3 };

const boardEl = $('board');
const boardShell = $('board-shell');
const keyboardEl = $('keyboard');
const statusEl = $('status');
const veil = $('veil');
const veilEyebrow = $('veil-eyebrow');
const veilTitle = $('veil-title');
const veilCopy = $('veil-copy');
const veilWord = $('veil-word');
const veilStats = $('veil-stats');
const veilPrimary = $('veil-primary');
const restartBtn = $('restart');
const newGameBtn = $('new-game');

const keyButtons = new Map(
  [...keyboardEl.querySelectorAll('.key[data-key]')].map((button) => [button.dataset.key, button])
);

const emptyStats = () => ({ played: 0, wins: 0, streak: 0, best: 0 });
const rows = [];
let stats = loadStats();
let answer = '';
let previousAnswer = '';
let guesses = [];
let current = '';
let gameOver = false;
let locked = false;
let recorded = false;
let revealTimer = 0;
let shakeTimer = 0;

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
    /* private mode or bad data: keep a clean local tally */
  }
  return base;
}

function saveStats() {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    /* storage may be unavailable; stats still work for this session */
  }
}

function renderStats() {
  $('stat-played').textContent = String(stats.played);
  $('stat-wins').textContent = String(stats.wins);
  $('stat-streak').textContent = String(stats.streak);
  $('stat-best').textContent = String(stats.best);
}

function buildBoard() {
  const fragment = document.createDocumentFragment();

  for (let rowIndex = 0; rowIndex < MAX_GUESSES; rowIndex += 1) {
    const row = document.createElement('div');
    row.className = 'row';
    row.setAttribute('role', 'row');

    for (let column = 0; column < WORD_LENGTH; column += 1) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.setAttribute('role', 'gridcell');
      tile.dataset.row = String(rowIndex);
      tile.dataset.col = String(column);

      const letter = document.createElement('span');
      letter.className = 'tile-letter';
      tile.appendChild(letter);

      setTileLabel(tile, rowIndex, column, '', '');
      row.appendChild(tile);
    }

    fragment.appendChild(row);
    rows.push(row);
  }

  boardEl.appendChild(fragment);
}

function setTileLabel(tile, rowIndex, column, letter, state) {
  const value = letter ? ` ${letter}` : ' empty';
  const rating = state ? `, ${state}` : '';
  tile.setAttribute('aria-label', `Row ${rowIndex + 1}, letter ${column + 1}:${value}${rating}`);
}

function markActiveRow() {
  rows.forEach((row, index) => {
    row.classList.toggle('is-active', index === guesses.length && !gameOver && !locked);
  });
}

function renderCurrentRow() {
  const row = rows[guesses.length];
  if (!row) return;

  [...row.children].forEach((tile, column) => {
    const letter = current[column] || '';
    const slot = tile.firstElementChild;

    if (slot.textContent !== letter) slot.textContent = letter;
    tile.classList.toggle('is-filled', Boolean(letter));
    setTileLabel(tile, guesses.length, column, letter, '');
  });

  markActiveRow();
}

function pickAnswer() {
  let next = WORDS[Math.floor(Math.random() * WORDS.length)];
  if (WORDS.length > 1) {
    while (next === previousAnswer) {
      next = WORDS[Math.floor(Math.random() * WORDS.length)];
    }
  }
  previousAnswer = next;
  return next;
}

function resetGame() {
  window.clearTimeout(revealTimer);
  window.clearTimeout(shakeTimer);

  answer = pickAnswer();
  guesses = [];
  current = '';
  gameOver = false;
  locked = false;
  recorded = false;

  rows.forEach((row, rowIndex) => {
    row.classList.remove('is-invalid', 'is-active');
    [...row.children].forEach((tile, column) => {
      tile.classList.remove('is-filled', 'is-revealed');
      delete tile.dataset.state;
      tile.style.removeProperty('--delay');
      tile.firstElementChild.textContent = '';
      setTileLabel(tile, rowIndex, column, '', '');
    });
  });

  keyButtons.forEach((button) => {
    delete button.dataset.state;
  });

  veil.hidden = true;
  renderStats();
  markActiveRow();
  statusEl.textContent = 'New game. Guess a five-letter word.';
}

function addLetter(letter) {
  if (current.length >= WORD_LENGTH) return;
  current += letter;
  renderCurrentRow();
}

function eraseLetter() {
  if (!current) return;
  current = current.slice(0, -1);
  renderCurrentRow();
}

function scoreGuess(guess, target) {
  const result = Array(WORD_LENGTH).fill('absent');
  const remaining = Object.create(null);

  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (guess[i] === target[i]) {
      result[i] = 'correct';
    } else {
      remaining[target[i]] = (remaining[target[i]] || 0) + 1;
    }
  }

  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (result[i] === 'correct') continue;
    const letter = guess[i];
    if (remaining[letter] > 0) {
      result[i] = 'present';
      remaining[letter] -= 1;
    }
  }

  return result;
}

function paintKeyboard(word, states) {
  [...word].forEach((letter, index) => {
    const button = keyButtons.get(letter);
    if (!button) return;
    const next = states[index];
    const before = button.dataset.state;
    if (!before || KEY_ORDER[next] > KEY_ORDER[before]) {
      button.dataset.state = next;
    }
  });
}

function revealRow(rowIndex, entry) {
  [...rows[rowIndex].children].forEach((tile, column) => {
    tile.dataset.state = entry.states[column];
    tile.style.setProperty('--delay', `${column * 110}ms`);
    tile.classList.add('is-revealed');
    setTileLabel(tile, rowIndex, column, entry.word[column], entry.states[column]);
  });
}

function rejectGuess(message) {
  statusEl.textContent = message;

  const row = rows[guesses.length];
  if (!row) return;

  row.classList.remove('is-invalid');
  void row.offsetWidth;
  row.classList.add('is-invalid');

  window.clearTimeout(shakeTimer);
  shakeTimer = window.setTimeout(() => row.classList.remove('is-invalid'), 460);
}

function submitGuess() {
  if (gameOver || locked) return;

  if (current.length < WORD_LENGTH) {
    rejectGuess('Not enough letters');
    return;
  }

  if (!WORD_SET.has(current.toLowerCase())) {
    rejectGuess('Not in the word list');
    return;
  }

  const entry = {
    word: current,
    states: scoreGuess(current.toLowerCase(), answer)
  };

  guesses.push(entry);
  revealRow(guesses.length - 1, entry);
  paintKeyboard(entry.word, entry.states);
  current = '';

  const win = entry.states.every((state) => state === 'correct');
  const lastGuess = guesses.length === MAX_GUESSES;
  if (win || lastGuess) gameOver = true;

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const settle = () => {
    locked = false;
    if (win || lastGuess) {
      finishGame(win);
    } else {
      markActiveRow();
      const exact = entry.states.filter((state) => state === 'correct').length;
      const close = entry.states.filter((state) => state === 'present').length;
      statusEl.textContent = `Guess ${guesses.length} of ${MAX_GUESSES}. ${exact} correct, ${close} in the word.`;
    }
  };

  if (reduced) {
    settle();
    return;
  }

  locked = true;
  markActiveRow();
  revealTimer = window.setTimeout(settle, WORD_LENGTH * 110 + 380);
}

function recordResult(win) {
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
}

function finishGame(win) {
  if (recorded) return;
  recorded = true;
  recordResult(win);
  showResult(win);
}

function showResult(win) {
  const attempts = guesses.length;

  veilEyebrow.textContent = win ? 'Nicely solved' : 'Out of guesses';
  veilTitle.textContent = win ? `Got it in ${attempts}!` : 'So close';
  veilCopy.textContent = win ? 'Nice work. The word was' : 'Better luck next time. The word was';
  veilWord.textContent = answer.toUpperCase();

  veilStats.replaceChildren();
  const items = [
    ['Played', stats.played],
    ['Wins', stats.wins],
    ['Streak', stats.streak],
    ['Best', stats.best]
  ];

  for (const [label, value] of items) {
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
    ? `You guessed ${answer.toUpperCase()} in ${attempts} ${attempts === 1 ? 'try' : 'tries'}.`
    : `Out of guesses. The word was ${answer.toUpperCase()}.`;
}

function startNewGame() {
  if (boardShell.dataset.refreshing === 'true') return;
  locked = true;
  softRefresh(boardShell, resetGame).then(() => {
    boardEl.focus({ preventScroll: true });
  });
}

function pressKey(key) {
  if (!veil.hidden || gameOver || locked) return;

  if (key === 'ENTER') {
    submitGuess();
    return;
  }

  if (key === 'BACK') {
    eraseLetter();
    return;
  }

  if (/^[A-Z]$/.test(key)) addLetter(key);
}

keyboardEl.addEventListener('click', (event) => {
  const button = event.target.closest('.key');
  if (!button) return;
  if (event.detail > 0) button.blur();
  pressKey(button.dataset.key);
});

window.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (!veil.hidden) return;

  if (event.key === 'Enter') {
    const onControl = event.target instanceof Element && event.target.closest('button, a');
    if (onControl) return;
    event.preventDefault();
    pressKey('ENTER');
    return;
  }

  if (event.key === 'Backspace') {
    event.preventDefault();
    pressKey('BACK');
    return;
  }

  if (/^[a-zA-Z]$/.test(event.key) && !event.repeat) {
    event.preventDefault();
    pressKey(event.key.toUpperCase());
  }
});

veil.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  event.preventDefault();
  veilPrimary.focus({ preventScroll: true });
});

restartBtn.addEventListener('click', startNewGame);
newGameBtn.addEventListener('click', startNewGame);
veilPrimary.addEventListener('click', startNewGame);

buildBoard();
resetGame();
renderStats();
