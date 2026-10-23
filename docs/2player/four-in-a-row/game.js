import { softRefresh } from '../../shared/refresh.js';

const $ = (id) => document.getElementById(id);

const COLS = 7;
const ROWS = 6;
const TARGET = 3;
const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
const NAME = { 1: 'Player 1', 2: 'Player 2' };
const SHADE = { 1: 'coral', 2: 'teal' };

const page = document.querySelector('.app');
const playField = document.querySelector('.board-wrap');
const boardEl = $('board');
const gridEl = $('grid');
const discsEl = $('discs');
const colsEl = $('cols');
const roundLabel = $('round-label');
const player1 = $('player-1');
const player2 = $('player-2');
const player2Name = $('name-2');
const score1 = $('score-1');
const score2 = $('score-2');
const turnbar = $('turnbar');
const turnText = $('turn-text');
const resultbar = $('resultbar');
const resultText = $('result-text');
const nextRoundBtn = $('next-round');
const statusEl = $('status');
const veil = $('veil');
const veilTitle = $('veil-title');
const veilCopy = $('veil-copy');
const veilRematch = $('veil-rematch');
const modeButtons = [...document.querySelectorAll('.mode-switch button')];

const holes = [];
const colButtons = [];

let board = [];
let discs = [];
let turn = 1;
let starter = 1;
let round = 1;
let scores = { 1: 0, 2: 0 };
let result = null;
let matchOver = false;
let matchTimer = 0;
let mode = '2p';
let aiTimer = null;
let aiToken = 0;

const other = (player) => (player === 1 ? 2 : 1);
const reducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
const nameOf = (player) => player === 2 && mode !== '2p' ? 'Computer' : NAME[player];

function isAiTurn() {
  return mode !== '2p' && turn === 2 && !result && !matchOver;
}

function clearAi() {
  aiToken += 1;
  if (aiTimer !== null) {
    window.clearTimeout(aiTimer);
    aiTimer = null;
  }
}

function buildBoard() {
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const hole = document.createElement('div');
      hole.className = 'hole';
      gridEl.appendChild(hole);
      holes.push(hole);
    }
  }

  for (let c = 0; c < COLS; c += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'col';
    button.dataset.col = String(c);
    button.setAttribute('aria-keyshortcuts', String(c + 1));

    const ghost = document.createElement('span');
    ghost.className = 'ghost';
    ghost.setAttribute('aria-hidden', 'true');
    button.appendChild(ghost);

    colsEl.appendChild(button);
    colButtons.push(button);
  }
}

function clearBoard() {
  board = Array.from({ length: COLS }, () => Array(ROWS).fill(null));
  discs = Array.from({ length: COLS }, () => Array(ROWS).fill(null));
  discsEl.replaceChildren();
  holes.forEach((hole) => hole.classList.remove('is-win'));
}

function landingRowOn(b, c) {
  for (let r = ROWS - 1; r >= 0; r -= 1) {
    if (!b[c][r]) return r;
  }
  return -1;
}

function landingRow(c) {
  return landingRowOn(board, c);
}

function findWin(c, r, player, b = board) {
  for (const [dc, dr] of DIRS) {
    const run = [{ c, r }];

    for (const direction of [-1, 1]) {
      let cc = c + dc * direction;
      let rr = r + dr * direction;

      while (cc >= 0 && cc < COLS && rr >= 0 && rr < ROWS && b[cc][rr] === player) {
        if (direction === -1) run.unshift({ c: cc, r: rr });
        else run.push({ c: cc, r: rr });
        cc += dc * direction;
        rr += dr * direction;
      }
    }

    if (run.length >= 4) {
      const at = run.findIndex((cell) => cell.c === c && cell.r === r);
      const start = Math.min(Math.max(at - 3, 0), run.length - 4);
      return run.slice(start, start + 4);
    }
  }

  return null;
}

function makeDisc(c, r, player) {
  const disc = document.createElement('div');
  disc.className = `disc disc--p${player}`;
  disc.style.setProperty('--col', String(c));
  disc.style.setProperty('--row', String(r));
  discsEl.appendChild(disc);
  return disc;
}

function dropDisc(disc, r) {
  if (reducedMotion() || typeof disc.animate !== 'function') return;

  const boardRect = boardEl.getBoundingClientRect();
  const discRect = disc.getBoundingClientRect();
  const from = boardRect.top - discRect.top - discRect.height * 0.4;
  const duration = 250 + r * 30;

  disc.animate(
    [
      { transform: `translateY(${from}px)` },
      { transform: 'translateY(0)', offset: 0.84 },
      { transform: 'translateY(-4%)', offset: 0.93 },
      { transform: 'translateY(0)' }
    ],
    { duration, easing: 'cubic-bezier(.33, .02, .55, 1)' }
  );
}

function announce(message) {
  statusEl.textContent = message;
}

function render() {
  roundLabel.textContent = `Round ${round}`;
  score1.textContent = String(scores[1]);
  score2.textContent = String(scores[2]);
  player2Name.textContent = mode === '2p' ? 'Player 2' : 'Computer';

  player1.classList.toggle('is-active', !result && !matchOver && turn === 1);
  player2.classList.toggle('is-active', !result && !matchOver && turn === 2);

  turnbar.hidden = Boolean(result);
  turnbar.classList.toggle('is-p2', turn === 2);
  turnText.textContent = `${nameOf(turn)}'s turn`;

  resultbar.hidden = !result || matchOver;

  if (result) {
    resultText.textContent = result.type === 'win'
      ? `${nameOf(result.player)} wins round ${round}`
      : `Round ${round} is a draw`;
  }

  const winKeys = new Set((result?.cells ?? []).map(({ c, r }) => r * COLS + c));

  holes.forEach((hole, index) => hole.classList.toggle('is-win', winKeys.has(index)));

  for (let c = 0; c < COLS; c += 1) {
    for (let r = 0; r < ROWS; r += 1) {
      const disc = discs[c][r];
      if (disc) disc.classList.toggle('is-win', winKeys.has(r * COLS + c));
    }
  }

  const locked = Boolean(result) || matchOver || isAiTurn();
  colsEl.classList.toggle('is-p2', turn === 2);
  colsEl.classList.toggle('is-p1', turn === 1);

  for (let c = 0; c < COLS; c += 1) {
    const r = landingRow(c);
    const button = colButtons[c];
    button.disabled = locked || r < 0;
    button.classList.toggle('is-full', r < 0);
    button.style.setProperty('--drop', String(Math.max(r, 0)));

    if (r < 0) button.setAttribute('aria-label', `Column ${c + 1}, full`);
    else if (locked) button.setAttribute('aria-label', `Column ${c + 1}, ${ROWS - r} disc${ROWS - r === 1 ? '' : 's'}, round finished`);
    else button.setAttribute('aria-label', `Column ${c + 1}, ${ROWS - r} disc${ROWS - r === 1 ? '' : 's'}, drop a ${SHADE[turn]} disc`);
  }
}

function focusColumn(index) {
  const target = colButtons[index] ?? colButtons.find((button) => !button.disabled);
  target?.focus({ preventScroll: true });
}

function windowScore(b, player) {
  const opponent = other(player);
  let score = 0;

  const evaluate = (cells) => {
    let mine = 0;
    let theirs = 0;
    let empty = 0;
    for (const value of cells) {
      if (value === player) mine += 1;
      else if (value === opponent) theirs += 1;
      else empty += 1;
    }
    if (mine && theirs) return 0;
    if (mine === 4) return 100000;
    if (mine === 3 && empty === 1) return 120;
    if (mine === 2 && empty === 2) return 12;
    if (theirs === 4) return -100000;
    if (theirs === 3 && empty === 1) return -150;
    if (theirs === 2 && empty === 2) return -14;
    return 0;
  };

  for (let c = 0; c < COLS; c += 1) {
    for (let r = 0; r < ROWS; r += 1) {
      for (const [dc, dr] of DIRS) {
        const cc = c + dc * 3;
        const rr = r + dr * 3;
        if (cc < 0 || cc >= COLS || rr < 0 || rr >= ROWS) continue;
        const cells = [];
        for (let step = 0; step < 4; step += 1) cells.push(b[c + dc * step][r + dr * step]);
        score += evaluate(cells);
      }
    }
  }
  return score;
}

function search(b, depth, alpha, beta, maximizing, last) {
  if (last) {
    const win = findWin(last.c, last.r, last.player, b);
    if (win) return last.player === 2 ? 100000 + depth : -100000 - depth;
  }

  const full = b.every((column) => column.every(Boolean));
  if (depth === 0 || full) return windowScore(b, 2);

  const order = [3, 2, 4, 1, 5, 0, 6];
  if (maximizing) {
    let best = -Infinity;
    for (const c of order) {
      const r = landingRowOn(b, c);
      if (r < 0) continue;
      b[c][r] = 2;
      best = Math.max(best, search(b, depth - 1, alpha, beta, false, { c, r, player: 2 }));
      b[c][r] = null;
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const c of order) {
    const r = landingRowOn(b, c);
    if (r < 0) continue;
    b[c][r] = 1;
    best = Math.min(best, search(b, depth - 1, alpha, beta, true, { c, r, player: 1 }));
    b[c][r] = null;
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

function bestAiColumn() {
  const playable = [];
  for (let c = 0; c < COLS; c += 1) {
    if (landingRow(c) >= 0) playable.push(c);
  }
  if (!playable.length) return -1;

  for (const c of playable) {
    const r = landingRow(c);
    board[c][r] = 2;
    const wins = findWin(c, r, 2);
    board[c][r] = null;
    if (wins) return c;
  }

  for (const c of playable) {
    const r = landingRow(c);
    board[c][r] = 1;
    const blocks = findWin(c, r, 1);
    board[c][r] = null;
    if (blocks) return c;
  }

  const work = board.map((column) => column.slice());
  let best = -Infinity;
  const choices = [];
  for (const c of playable) {
    const r = landingRowOn(work, c);
    work[c][r] = 2;
    const score = search(work, 4, -Infinity, Infinity, false, { c, r, player: 2 });
    work[c][r] = null;
    if (score > best) {
      best = score;
      choices.length = 0;
      choices.push(c);
    } else if (score === best) {
      choices.push(c);
    }
  }
  return choices[Math.floor(Math.random() * choices.length)];
}

function scheduleAi() {
  clearAi();
  if (!isAiTurn()) return;
  const token = aiToken;
  aiTimer = window.setTimeout(() => {
    aiTimer = null;
    if (token !== aiToken || !isAiTurn()) return;
    const column = bestAiColumn();
    if (column >= 0) place(column, true);
  }, 480);
}

function place(c, fromAi = false) {
  if (result || matchOver) return;
  if (mode !== '2p' && turn === 2 && !fromAi) return;

  const r = landingRow(c);
  if (r < 0) return;

  const player = turn;
  board[c][r] = player;

  const disc = makeDisc(c, r, player);
  discs[c][r] = disc;
  dropDisc(disc, r);

  const win = findWin(c, r, player);

  if (win) {
    scores[player] += 1;
    result = { type: 'win', player, cells: win };
    if (scores[player] >= TARGET) matchOver = true;
  } else if (board.every((column) => column.every(Boolean))) {
    result = { type: 'draw' };
  } else {
    turn = other(player);
  }

  render();

  if (result?.type === 'win') {
    announce(`${nameOf(result.player)} wins round ${round} with four in a row!`);
  } else if (result?.type === 'draw') {
    announce(`Round ${round} is a draw. The board is full.`);
  } else {
    announce(`${nameOf(turn)}'s turn.`);
  }

  if (result && !matchOver) {
    nextRoundBtn.focus({ preventScroll: true });
  }

  if (matchOver) {
    window.clearTimeout(matchTimer);
    matchTimer = window.setTimeout(showMatchOver, 700);
  } else {
    scheduleAi();
  }
}

function showMatchOver() {
  if (!matchOver) return;

  const winner = scores[1] >= TARGET ? 1 : 2;
  veilTitle.textContent = `${nameOf(winner)} wins the match!`;
  veilCopy.textContent = `${scores[1]}-${scores[2]} after ${round} round${round === 1 ? '' : 's'}. ${nameOf(winner)} takes the cup.`;
  veil.hidden = false;
  veilRematch.focus({ preventScroll: true });
  announce(`${nameOf(winner)} wins the match ${scores[1]} to ${scores[2]}.`);
}

function nextRound() {
  if (!result || matchOver) return;

  clearAi();
  starter = result.type === 'win' ? result.player : other(starter);
  round += 1;
  turn = starter;
  result = null;

  clearBoard();
  render();
  announce(`Round ${round}. ${nameOf(turn)} starts.`);
  scheduleAi();
  if (turn === 1) focusColumn(0);
}

function resetMatch() {
  clearAi();
  window.clearTimeout(matchTimer);

  scores = { 1: 0, 2: 0 };
  round = 1;
  starter = 1;
  turn = 1;
  result = null;
  matchOver = false;

  veil.hidden = true;
  clearBoard();
  render();
  announce(mode === '2p' ? 'New match. Player 1 starts.' : 'New match. You are coral; the computer is teal.');
  if (turn === 1) focusColumn(0);
}

colsEl.addEventListener('click', (event) => {
  const button = event.target.closest('.col');
  if (!button) return;
  place(Number(button.dataset.col));
});

modeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const nextMode = button.dataset.mode;
    if (nextMode === mode) return;
    mode = nextMode;
    modeButtons.forEach((item) => item.classList.toggle('is-on', item === button));
    softRefresh(page, resetMatch);
  });
});

const requestNextRound = () => softRefresh(playField, nextRound);
const requestReset = () => softRefresh(page, resetMatch);

nextRoundBtn.addEventListener('click', requestNextRound);
$('reset').addEventListener('click', requestReset);
$('reset-match').addEventListener('click', requestReset);
veilRematch.addEventListener('click', requestReset);

window.addEventListener('keydown', (event) => {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

  if (event.key >= '1' && event.key <= '7') {
    event.preventDefault();
    place(Number(event.key) - 1);
    return;
  }

  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    const index = colButtons.indexOf(document.activeElement);
    if (index === -1) return;

    event.preventDefault();
    const step = event.key === 'ArrowRight' ? 1 : -1;

    for (let i = 1; i <= COLS; i += 1) {
      const next = ((index + step * i) % COLS + COLS) % COLS;
      if (!colButtons[next].disabled) {
        colButtons[next].focus();
        break;
      }
    }
  }
});

veil.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;

  const focusable = Array.from(veil.querySelectorAll('button, a[href]'))
    .filter((element) => !element.hidden);
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

buildBoard();
clearBoard();
render();
announce('Round 1. Player 1 starts with the coral disc.');
