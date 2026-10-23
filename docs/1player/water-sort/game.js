import { softRefresh } from '../../shared/refresh.js';
import { CAPACITY, LEVELS, generateTubes, isComplete, pour } from './engine.js';

const $ = (id) => document.getElementById(id);
const BEST_KEY = 'mini-games:water-sort:best';
const LEVEL_KEY = 'mini-games:water-sort:level';
const COLOR_NAMES = ['coral', 'amber', 'teal', 'violet', 'blue', 'pink', 'green', 'orange'];

const boardEl = $('board');
const tubesEl = $('tubes');
const movesEl = $('moves');
const bestEl = $('best');
const tubeCountEl = $('tube-count');
const undoBtn = $('undo');
const newDealBtn = $('new-deal');
const newGameBtn = $('new-game');
const statusEl = $('status');
const veil = $('veil');
const veilCopy = $('veil-copy');
const veilEyebrow = $('veil-eyebrow');
const veilStats = $('veil-stats');
const veilPrimary = $('veil-primary');
const difficultyButtons = [...document.querySelectorAll('.difficulty button')];

let level = loadLevel();
let tubes = [];
let history = [];
let moves = 0;
let selected = -1;
let solved = false;
let token = 0;
let best = loadBest();

function loadLevel() {
  try {
    const saved = localStorage.getItem(LEVEL_KEY);
    return saved && LEVELS[saved] ? saved : 'easy';
  } catch {
    return 'easy';
  }
}

function saveLevel() {
  try {
    localStorage.setItem(LEVEL_KEY, level);
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
      const value = Math.floor(Number(saved[key]));
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

const moveLabel = (count) => `${count} ${count === 1 ? 'move' : 'moves'}`;

function describeTube(tube, index) {
  if (!tube.length) return `Tube ${index + 1}, empty`;
  const colors = tube.map((unit) => COLOR_NAMES[unit] || 'colour');
  return `Tube ${index + 1}, ${tube.length} of ${CAPACITY}: ${colors.join(', ')} from the bottom`;
}

function renderTubes() {
  tubesEl.replaceChildren();

  tubes.forEach((tube, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tube';
    button.dataset.index = String(index);
    button.classList.toggle('is-empty', tube.length === 0);
    button.classList.toggle('is-selected', index === selected);
    button.setAttribute('aria-pressed', index === selected ? 'true' : 'false');
    button.setAttribute('aria-label', describeTube(tube, index));

    const glass = document.createElement('span');
    glass.className = 'glass';
    for (let slot = 0; slot < CAPACITY; slot += 1) {
      const unit = document.createElement('span');
      unit.className = 'unit';
      if (slot < tube.length) {
        unit.dataset.color = String(tube[slot]);
        if (slot === tube.length - 1) unit.classList.add('is-top');
      }
      glass.appendChild(unit);
    }

    button.appendChild(glass);
    tubesEl.appendChild(button);
  });
}

function updateMeta() {
  movesEl.textContent = String(moves);
  bestEl.textContent = best[level] ? String(best[level]) : '—';
  tubeCountEl.textContent = String(tubes.length);
  undoBtn.disabled = solved || history.length === 0;
}

function flashInvalid(index) {
  const button = tubesEl.querySelector(`.tube[data-index="${index}"]`);
  if (!button) return;
  button.classList.remove('is-invalid');
  void button.offsetWidth;
  button.classList.add('is-invalid');
  const myToken = token;
  window.setTimeout(() => {
    if (myToken !== token) return;
    button.classList.remove('is-invalid');
  }, 340);
}

function handleTube(index) {
  if (solved) return;

  if (selected === -1) {
    if (!tubes[index].length) {
      statusEl.textContent = `Tube ${index + 1} is empty. Pick a filled tube first.`;
      return;
    }
    selected = index;
    renderTubes();
    statusEl.textContent = `Tube ${index + 1} selected. Tap another tube to pour.`;
    return;
  }

  if (selected === index) {
    selected = -1;
    renderTubes();
    statusEl.textContent = 'Selection cleared.';
    return;
  }

  const result = pour(tubes, selected, index);
  if (!result) {
    if (tubes[index].length) {
      selected = index;
      renderTubes();
      statusEl.textContent = `Tube ${index + 1} selected instead. Colours have to match.`;
    } else {
      flashInvalid(index);
      statusEl.textContent = 'That pour does not fit.';
    }
    return;
  }

  history.push(tubes.map((tube) => tube.slice()));
  tubes = result.tubes;
  moves += 1;
  selected = -1;
  renderTubes();
  updateMeta();

  if (isComplete(tubes)) {
    finish();
    return;
  }

  const pouredName = COLOR_NAMES[result.color] || 'liquid';
  statusEl.textContent = `Poured ${result.moved} ${pouredName} into tube ${index + 1}. ${moveLabel(moves)}.`;
}

function finish() {
  solved = true;
  const previous = best[level] || 0;
  const isBest = !previous || moves < previous;
  if (isBest) {
    best[level] = moves;
    saveBest();
  }
  updateMeta();

  const label = LEVELS[level].label;
  veilEyebrow.textContent = `${label} sorted`;
  veilCopy.textContent = previous
    ? `Solved in ${moveLabel(moves)}. Best is ${best[level]}.`
    : `Solved in ${moveLabel(moves)}. That is your new best.`;

  veilStats.replaceChildren();
  for (const [term, value] of [
    ['Moves', moves],
    ['Best', best[level]]
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
  statusEl.textContent = `Solved in ${moveLabel(moves)} on ${label}.`;
}

function newDeal() {
  token += 1;
  tubes = generateTubes(level);
  history = [];
  moves = 0;
  selected = -1;
  solved = false;
  veil.hidden = true;
  renderTubes();
  updateMeta();
  statusEl.textContent = `${LEVELS[level].label} deal. ${tubes.length} tubes, ${LEVELS[level].colors} colours.`;
}

function undo() {
  if (solved || !history.length) return;
  tubes = history.pop();
  moves = Math.max(0, moves - 1);
  selected = -1;
  renderTubes();
  updateMeta();
  statusEl.textContent = `Move undone. Back to ${moveLabel(moves)}.`;
}

function setLevel(next) {
  if (!LEVELS[next] || next === level) return;
  level = next;
  saveLevel();
  difficultyButtons.forEach((button) => {
    const active = button.dataset.level === next;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  softRefresh(boardEl, newDeal);
}

function requestDeal() {
  if (boardEl.dataset.refreshing === 'true') return;
  softRefresh(boardEl, newDeal);
}

tubesEl.addEventListener('click', (event) => {
  const button = event.target.closest('.tube');
  if (!button) return;
  handleTube(Number(button.dataset.index));
});

difficultyButtons.forEach((button) => {
  button.addEventListener('click', () => setLevel(button.dataset.level));
});

undoBtn.addEventListener('click', undo);
newDealBtn.addEventListener('click', requestDeal);
newGameBtn.addEventListener('click', requestDeal);
veilPrimary.addEventListener('click', requestDeal);

window.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if ((event.key === 'u' || event.key === 'U') && !solved) {
    event.preventDefault();
    undo();
  }
});

difficultyButtons.forEach((button) => {
  const active = button.dataset.level === level;
  button.classList.toggle('is-active', active);
  button.setAttribute('aria-pressed', active ? 'true' : 'false');
});

newDeal();
