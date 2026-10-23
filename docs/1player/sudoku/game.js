import {
  generatePuzzle,
  formatTime,
  SIZE,
  CELLS,
  CLUES
} from './engine.js';

const $ = (id) => document.getElementById(id);

const boardEl = $('board');
const keypadEl = $('keypad');
const timerEl = $('timer');
const mistakesEl = $('mistakes');
const cluesEl = $('clues');
const notesBtn = $('notes');
const statusEl = $('status');
const veil = $('veil');
const veilTitle = $('veil-title');
const veilCopy = $('veil-copy');
const veilStats = $('veil-stats');
const veilPrimary = $('veil-primary');
const veilSecondary = $('veil-secondary');

let level = 'easy';
let puzzle = [];
let solution = [];
let values = [];
let given = [];
let notes = [];
let hinted = new Set();
let selected = -1;
let notesMode = false;
let mistakes = 0;
let hintsUsed = 0;
let elapsed = 0;
let startedAt = null;
let timerId = null;
let solved = false;
let generation = 0;
let cells = [];

function buildBoard() {
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < CELLS; i += 1) {
    const r = Math.floor(i / SIZE);
    const c = i % SIZE;
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cell';
    cell.dataset.index = String(i);
    cell.setAttribute('role', 'gridcell');

    if ((c + 1) % 3 === 0 && c < SIZE - 1) cell.classList.add('edge-r');
    if ((r + 1) % 3 === 0 && r < SIZE - 1) cell.classList.add('edge-b');

    const value = document.createElement('span');
    value.className = 'val';
    cell.appendChild(value);

    const noteWrap = document.createElement('span');
    noteWrap.className = 'notes';
    for (let n = 1; n <= 9; n += 1) {
      const note = document.createElement('i');
      note.textContent = String(n);
      noteWrap.appendChild(note);
    }
    cell.appendChild(noteWrap);

    fragment.appendChild(cell);
    cells.push(cell);
  }
  boardEl.appendChild(fragment);
}

function beginTimer() {
  if (timerId !== null || solved) return;
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

function peerOf(index) {
  if (selected < 0) return false;
  const sr = Math.floor(selected / SIZE);
  const sc = selected % SIZE;
  const r = Math.floor(index / SIZE);
  const c = index % SIZE;
  const sameBox = Math.floor(sr / 3) === Math.floor(r / 3) && Math.floor(sc / 3) === Math.floor(c / 3);
  return r === sr || c === sc || sameBox;
}

function render() {
  const selectedValue = selected >= 0 ? values[selected] : 0;

  for (let i = 0; i < CELLS; i += 1) {
    const cell = cells[i];
    const value = values[i];
    const isGiven = Boolean(given[i]);

    cell.classList.toggle('is-given', isGiven);
    cell.classList.toggle('is-selected', i === selected);
    cell.classList.toggle('is-peer', selected >= 0 && i !== selected && peerOf(i));
    cell.classList.toggle('is-same', Boolean(selectedValue) && value === selectedValue && i !== selected);
    cell.classList.toggle('is-wrong', Boolean(value) && value !== solution[i]);
    cell.classList.toggle('is-hinted', hinted.has(i));

    const valueEl = cell.querySelector('.val');
    valueEl.textContent = value ? String(value) : '';

    const noteWrap = cell.querySelector('.notes');
    const showNotes = !value && notes[i] && notes[i].size > 0;
    noteWrap.style.display = showNotes ? 'grid' : 'none';
    if (showNotes) {
      for (let n = 1; n <= 9; n += 1) {
        noteWrap.children[n - 1].classList.toggle('on', notes[i].has(n));
      }
    }

    const r = Math.floor(i / SIZE) + 1;
    const c = (i % SIZE) + 1;
    const state = isGiven ? 'given' : value ? `entered ${value}` : 'empty';
    cell.setAttribute('aria-label', `Row ${r}, column ${c}, ${state}`);
    cell.setAttribute('aria-selected', i === selected ? 'true' : 'false');
  }

  mistakesEl.textContent = String(mistakes);
  cluesEl.textContent = String(given.filter(Boolean).length);
  notesBtn.setAttribute('aria-pressed', notesMode ? 'true' : 'false');
}

function checkSolved() {
  if (values.some((value, index) => value !== solution[index])) return false;
  solved = true;
  stopTimer();
  const key = `minigames.sudoku.best.${level}`;
  let best = 0;
  try {
    best = Number(localStorage.getItem(key)) || 0;
  } catch {
    best = 0;
  }
  const isBest = !best || elapsed < best;
  if (isBest) {
    try {
      localStorage.setItem(key, String(Math.max(1, Math.floor(elapsed))));
    } catch {
      /* storage unavailable */
    }
  }

  veilTitle.textContent = 'Puzzle complete';
  veilCopy.textContent = isBest
    ? 'A new personal best for this difficulty.'
    : 'Clean work. Ready for another?';
  veilStats.innerHTML = `
    <div><dt>Time</dt><dd>${formatTime(elapsed)}</dd></div>
    <div><dt>Mistakes</dt><dd>${mistakes}</dd></div>
    <div><dt>Hints</dt><dd>${hintsUsed}</dd></div>`;
  veil.hidden = false;
  veilSecondary.hidden = false;
  veilPrimary.focus({ preventScroll: true });
  statusEl.textContent = `Puzzle solved in ${formatTime(elapsed)} with ${mistakes} mistakes.`;
  return true;
}

function inputNumber(number) {
  if (solved || selected < 0 || given[selected]) return;

  if (number === 0) {
    values[selected] = 0;
    notes[selected].clear();
    hinted.delete(selected);
  } else if (notesMode && !values[selected]) {
    if (notes[selected].has(number)) notes[selected].delete(number);
    else notes[selected].add(number);
    beginTimer();
    render();
    return;
  } else {
    values[selected] = number;
    notes[selected].clear();
    hinted.delete(selected);
    if (number !== solution[selected]) {
      mistakes += 1;
      statusEl.textContent = `That digit does not belong there. Mistakes: ${mistakes}.`;
    } else {
      statusEl.textContent = 'Correct.';
    }
  }

  beginTimer();
  render();
  checkSolved();
}

function useHint() {
  if (solved) return;
  let target = selected >= 0 && !values[selected] ? selected : -1;
  if (target === -1) {
    target = values.findIndex((value) => !value);
  }
  if (target === -1) return;

  values[target] = solution[target];
  notes[target].clear();
  hinted.add(target);
  hintsUsed += 1;
  selected = target;
  beginTimer();
  render();
  checkSolved();
  statusEl.textContent = `Hint used. Cell filled with ${solution[target]}.`;
}

function toggleNotes() {
  notesMode = !notesMode;
  render();
  statusEl.textContent = notesMode ? 'Notes mode on.' : 'Notes mode off.';
}

function clearCell() {
  if (selected < 0) return;
  if (given[selected]) {
    statusEl.textContent = 'That cell is part of the starting puzzle.';
    return;
  }
  inputNumber(0);
}

function startTimerIfNeeded() {
  beginTimer();
}

function newPuzzle(nextLevel = level) {
  level = nextLevel;
  const token = ++generation;
  solved = false;
  selected = -1;
  notesMode = false;
  mistakes = 0;
  hintsUsed = 0;
  elapsed = 0;
  startedAt = null;
  stopTimer();
  timerEl.textContent = '00:00';
  veil.hidden = true;
  boardEl.style.opacity = '.45';

  document.querySelectorAll('.difficulty button').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.level === level);
  });

  window.setTimeout(() => {
    if (token !== generation) return;
    const generated = generatePuzzle(level);
    puzzle = generated.puzzle;
    solution = generated.solution;
    values = puzzle.slice();
    given = puzzle.map((value) => value !== 0);
    notes = Array.from({ length: CELLS }, () => new Set());
    hinted = new Set();
    boardEl.style.opacity = '';
    render();
    statusEl.textContent = `New ${level} puzzle with ${generated.clues} clues.`;
  }, 40);
}

/* events */
boardEl.addEventListener('click', (event) => {
  const cell = event.target.closest('.cell');
  if (!cell) return;
  selected = Number(cell.dataset.index);
  render();
  startTimerIfNeeded();
});

keypadEl.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-num]');
  if (!button) return;
  inputNumber(Number(button.dataset.num));
});

notesBtn.addEventListener('click', toggleNotes);
$('hint').addEventListener('click', useHint);
$('erase').addEventListener('click', clearCell);
$('new-game').addEventListener('click', () => newPuzzle());

document.querySelectorAll('.difficulty button').forEach((button) => {
  button.addEventListener('click', () => newPuzzle(button.dataset.level));
});

veilPrimary.addEventListener('click', () => newPuzzle());
veilSecondary.addEventListener('click', () => {
  veil.hidden = true;
});

window.addEventListener('keydown', (event) => {
  if (event.key >= '1' && event.key <= '9') {
    event.preventDefault();
    inputNumber(Number(event.key));
    return;
  }
  if (event.key === '0' || event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault();
    clearCell();
    return;
  }
  if (event.key.toLowerCase() === 'n') {
    event.preventDefault();
    toggleNotes();
    return;
  }
  const moves = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -SIZE,
    ArrowDown: SIZE
  };
  if (moves[event.key] !== undefined) {
    event.preventDefault();
    if (selected < 0) selected = 0;
    else {
      const next = selected + moves[event.key];
      if (next >= 0 && next < CELLS) {
        if (Math.abs(moves[event.key]) === 1) {
          const sameRow = Math.floor(next / SIZE) === Math.floor(selected / SIZE);
          if (!sameRow) return;
        }
        selected = next;
      }
    }
    render();
  }
});

/* boot */
buildBoard();
cluesEl.textContent = String(CLUES.easy);
newPuzzle('easy');
