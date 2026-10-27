import { softRefresh } from '../../shared/refresh.js';
import {
  GOAL_PROGRESS,
  HOME_COLUMNS,
  STARTS,
  STARS,
  TRACK,
  TRACK_LEN,
  YARDS,
  applyMove,
  cellOf,
  forfeitsSixes,
  hasWon,
  legalMoves,
  nextSixes,
  rollDie
} from './engine.js';

const $ = (id) => document.getElementById(id);

const PLAYERS = [
  { name: 'Player 1' },
  { name: 'Player 2' },
  { name: 'Player 3' },
  { name: 'Player 4' }
];

const STEP_MS = 105;
const PASS_MS = 1150;
const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
};

const playEl = $('play');
const boardWrap = $('board-wrap');
const boardEl = $('board');
const tokensEl = $('tokens');
const dieEl = $('die');
const pipEls = [...dieEl.querySelectorAll('i')];
const rollBtn = $('roll');
const turnText = $('turn-text');
const turnSub = $('turn-sub');
const homeEls = [0, 1, 2, 3].map((i) => $(`home-${i}`));
const plCards = [0, 1, 2, 3].map((i) => $(`pl-${i}`));
const statusEl = $('status');
const veil = $('veil');
const veilTitle = $('veil-title');
const veilCopy = $('veil-copy');
const veilStats = $('veil-stats');
const rematchBtn = $('rematch');

let game = { tokens: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]] };
let player = 0;
let phase = 'roll'; // 'roll' | 'move' | 'anim' | 'pass' | 'over'
let die = null;
let moves = [];
let sixes = 0;
let rolls = 0;
let sixCount = 0;
let token = 0;
let stepId = null;
let passId = null;
const tokenEls = [];

const nameOf = (playerIndex) => PLAYERS[playerIndex].name;

function announce(message) {
  statusEl.textContent = message;
}

function clearTimers() {
  if (stepId !== null) {
    window.clearTimeout(stepId);
    stepId = null;
  }
  if (passId !== null) {
    window.clearTimeout(passId);
    passId = null;
  }
}

/* ---------- board ---------- */

function quadrantOf(row, col) {
  if (row <= 5 && col <= 5) return 1;
  if (row <= 5 && col >= 9) return 2;
  if (row >= 9 && col <= 5) return 0;
  return 3;
}

function buildBoard() {
  boardEl.replaceChildren();
  const trackMap = new Map();
  TRACK.forEach(([r, c], index) => trackMap.set(`${r},${c}`, index));
  const homeMap = new Map();
  HOME_COLUMNS.forEach((column, playerIndex) => {
    column.forEach(([r, c]) => homeMap.set(`${r},${c}`, playerIndex));
  });

  const yardSets = YARDS.map((cells) => new Set(cells.map(([r, c]) => `${r},${c}`)));
  const fragment = document.createDocumentFragment();

  for (let row = 0; row < 15; row += 1) {
    for (let col = 0; col < 15; col += 1) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      const key = `${row},${col}`;

      if (trackMap.has(key)) {
        const index = trackMap.get(key);
        cell.classList.add('c-track');
        const startIndex = STARTS.indexOf(index);
        if (startIndex !== -1) {
          cell.classList.add(`c-start-${startIndex}`);
          cell.setAttribute('aria-label', `${nameOf(startIndex)} start square`);
        } else if (STARS.includes(index)) {
          cell.classList.add('c-star');
          cell.setAttribute('aria-label', 'Safe star square');
        } else {
          cell.setAttribute('aria-label', `Track square ${index + 1}`);
        }
      } else if (homeMap.has(key)) {
        const owner = homeMap.get(key);
        cell.classList.add(`c-home-${owner}`);
        cell.setAttribute('aria-label', `${nameOf(owner)} home column`);
      } else if (row === 7 && col === 7) {
        cell.classList.add('c-goal');
        cell.setAttribute('aria-label', 'Centre goal');
      } else {
        const owner = quadrantOf(row, col);
        cell.classList.add(`c-yard-${owner}`);
        if (yardSets[owner].has(key)) {
          cell.classList.add('c-yardcell');
          cell.setAttribute('aria-label', `${nameOf(owner)} yard`);
        } else {
          cell.setAttribute('aria-hidden', 'true');
        }
      }

      fragment.appendChild(cell);
    }
  }

  boardEl.appendChild(fragment);
}

function buildTokens() {
  tokensEl.replaceChildren();
  tokenEls.length = 0;

  for (let owner = 0; owner < 4; owner += 1) {
    for (let index = 0; index < 4; index += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'token';
      button.dataset.p = String(owner);
      button.dataset.t = String(index);
      const pip = document.createElement('span');
      pip.className = 'pip';
      button.appendChild(pip);
      button.addEventListener('click', () => selectToken(index));
      button.addEventListener('contextmenu', (event) => event.preventDefault());
      tokensEl.appendChild(button);
      tokenEls.push(button);
    }
  }
}

const STACK_OFFSETS = {
  1: [[0, 0]],
  2: [[-24, -24], [24, 24]],
  3: [[-26, -18], [0, 26], [26, -18]],
  4: [[-24, -24], [24, -24], [-24, 24], [24, 24]]
};

const GOAL_OFFSETS = [[0, 36], [-36, 0], [0, -36], [36, 0]];

function render() {
  // group tokens by cell for stacking offsets
  const groups = new Map();
  for (let owner = 0; owner < 4; owner += 1) {
    for (let index = 0; index < 4; index += 1) {
      const progress = game.tokens[owner][index];
      const cell = cellOf(owner, progress, index);
      const key = progress === GOAL_PROGRESS ? `goal-${owner}` : `${cell[0]},${cell[1]}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push([owner, index]);
    }
  }

  for (const [key, members] of groups) {
    const isGoal = key.startsWith('goal-');
    const goalOwner = isGoal ? Number(key.slice(5)) : -1;
    const offsets = isGoal ? null : STACK_OFFSETS[Math.min(members.length, 4)];
    const scale = !isGoal && members.length > 1 ? 0.74 : 1;

    members.forEach(([owner, index], slot) => {
      const el = tokenEls[owner * 4 + index];
      const progress = game.tokens[owner][index];
      const cell = cellOf(owner, progress, index);
      let gx = 0;
      let gy = 0;

      if (isGoal) {
        const base = GOAL_OFFSETS[goalOwner];
        const spread = STACK_OFFSETS[Math.min(members.length, 4)][slot];
        gx = base[0] + spread[0] * 0.55;
        gy = base[1] + spread[1] * 0.55;
      } else {
        gx = offsets[slot][0];
        gy = offsets[slot][1];
      }

      el.style.transform = `translate(${cell[1] * 100}%, ${cell[0] * 100}%)`;
      const pip = el.firstChild;
      pip.style.setProperty('--gx', `${gx}%`);
      pip.style.setProperty('--gy', `${gy}%`);
      pip.style.setProperty('--gs', isGoal ? '0.52' : String(scale));

      const movable = phase === 'move' && player === owner && moves.includes(index);
      el.classList.toggle('is-movable', movable);
      el.disabled = !movable;
      el.setAttribute('aria-label', describeToken(owner, index, progress, movable));
    });
  }

  for (let owner = 0; owner < 4; owner += 1) {
    const home = game.tokens[owner].filter((progress) => progress === GOAL_PROGRESS).length;
    homeEls[owner].textContent = `${home}/4`;
    plCards[owner].classList.toggle('is-active', owner === player && phase !== 'over');
  }

  turnText.textContent = nameOf(player);
  turnSub.textContent = subLabel();

  rollBtn.disabled = phase !== 'roll';
  rollBtn.textContent = phase === 'roll' ? 'Roll' : phase === 'move' ? 'Move' : 'Wait';

  pipEls.forEach((pip, index) => {
    pip.classList.toggle('on', die !== null && PIPS[die].includes(index));
  });
  dieEl.setAttribute('aria-label', die === null ? 'Die, not rolled yet' : `Die showing ${die}`);
}

function describeToken(owner, index, progress, movable) {
  const base = `${nameOf(owner)} token ${index + 1}`;
  let where;
  if (progress === GOAL_PROGRESS) where = 'is home';
  else if (progress === 0) where = 'is in the yard';
  else if (progress > TRACK_LEN) where = 'is in the home column';
  else where = `is on square ${progress}`;
  return `${base} ${where}${movable ? ', movable now' : ''}`;
}

function subLabel() {
  if (phase === 'roll') return sixes > 0 ? 'Six! Roll again' : 'Roll the die';
  if (phase === 'move') return `Rolled ${die} — tap a glowing token`;
  if (phase === 'anim') return 'Moving…';
  if (phase === 'pass') return 'No move available';
  return 'Race complete';
}

/* ---------- flow ---------- */

function doRoll() {
  if (phase !== 'roll') return;

  die = rollDie(Math.random);
  rolls += 1;
  if (die === 6) sixCount += 1;
  sixes = nextSixes(sixes, die);

  dieEl.classList.remove('is-rolling');
  void dieEl.offsetWidth;
  dieEl.classList.add('is-rolling');

  announce(`${nameOf(player)} rolls ${die}.`);

  if (forfeitsSixes(sixes)) {
    phase = 'pass';
    render();
    announce(`${nameOf(player)} rolled three sixes in a row — the turn is forfeit.`);
    schedulePass();
    return;
  }

  moves = legalMoves(game, player, die);
  if (!moves.length) {
    phase = 'pass';
    render();
    announce(`${nameOf(player)} rolls ${die} but has no legal move.`);
    schedulePass();
    return;
  }

  phase = 'move';
  render();
}

function schedulePass() {
  const myToken = token;
  passId = window.setTimeout(() => {
    passId = null;
    if (myToken !== token || phase !== 'pass') return;
    nextPlayer();
  }, PASS_MS);
}

function nextPlayer() {
  player = (player + 1) % 4;
  sixes = 0;
  moves = [];
  phase = 'roll';
  render();
  announce(`${nameOf(player)}'s turn. Roll the die.`);
}

function selectToken(index) {
  if (phase !== 'move' || !moves.includes(index)) return;

  const result = applyMove(game, player, index, die);
  const from = game.tokens[player][index];
  phase = 'anim';
  render();

  const steps = [];
  if (from === 0) steps.push(1);
  else for (let progress = from + 1; progress <= result.target; progress += 1) steps.push(progress);

  const myToken = token;
  const el = tokenEls[player * 4 + index];
  let step = 0;

  const advance = () => {
    if (myToken !== token) return;
    if (step >= steps.length) {
      stepId = null;
      game = result.game;
      finishMove(result);
      return;
    }
    const cell = cellOf(player, steps[step], index);
    el.style.transform = `translate(${cell[1] * 100}%, ${cell[0] * 100}%)`;
    step += 1;
    stepId = window.setTimeout(advance, STEP_MS);
  };

  advance();
}

function finishMove(result) {
  moves = [];
  render();

  if (result.captured.length) {
    const victims = result.captured.map((entry) => nameOf(entry.player)).join(', ');
    announce(`${nameOf(player)} sends ${victims} home!`);
    if (navigator.vibrate) navigator.vibrate(12);
  } else if (result.finished) {
    announce(`${nameOf(player)} brings a token home.`);
  } else if (result.entered) {
    announce(`${nameOf(player)} enters the track.`);
  } else {
    announce(`${nameOf(player)} moves ${die}.`);
  }

  if (hasWon(game, player)) {
    endMatch();
    return;
  }

  if (die === 6) {
    phase = 'roll';
    render();
    announce(`${nameOf(player)} rolled six and goes again.`);
    return;
  }

  nextPlayer();
}

function endMatch() {
  phase = 'over';
  clearTimers();
  render();

  veilTitle.textContent = `${nameOf(player)} wins!`;
  veilCopy.textContent = `All four tokens home after ${rolls} rolls — ${nameOf(player)} takes the race.`;

  veilStats.replaceChildren();
  for (const [term, value] of [
    ['Rolls', rolls],
    ['Sixes', sixCount],
    ['Winner', `P${player + 1}`]
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
  announce(`${nameOf(player)} wins the race.`);
}

function resetMatch() {
  token += 1;
  clearTimers();
  game = { tokens: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]] };
  player = 0;
  phase = 'roll';
  die = null;
  moves = [];
  sixes = 0;
  rolls = 0;
  sixCount = 0;
  veil.hidden = true;
  render();
  announce('New race. Player 1 rolls first.');
}

function restart() {
  if (playEl.dataset.refreshing === 'true') return;
  softRefresh(boardWrap, () => {
    resetMatch();
    boardWrap.focus({ preventScroll: true });
  });
}

/* ---------- input ---------- */

rollBtn.addEventListener('click', doRoll);
$('reset').addEventListener('click', restart);
rematchBtn.addEventListener('click', restart);

window.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof Element && event.target.closest('button, a') && event.code !== 'Space') return;

  if (event.code === 'Space' || event.code === 'Enter') {
    event.preventDefault();
    doRoll();
    return;
  }

  const index = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(event.code);
  if (index !== -1) {
    event.preventDefault();
    if (!event.repeat) selectToken(index);
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (passId !== null) {
      window.clearTimeout(passId);
      passId = null;
    }
    return;
  }
  if (phase === 'pass' && passId === null) schedulePass();
});

boardWrap.setAttribute('tabindex', '-1');

buildBoard();
buildTokens();
resetMatch();
