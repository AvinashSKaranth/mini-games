import { softRefresh } from '../../shared/refresh.js';

const $ = (id) => document.getElementById(id);

const page = document.querySelector('.app');
const boardEl = $('board');
const playField = document.querySelector('.board-wrap');
const turnbar = $('turnbar');
const turnText = $('turn-text');
const turnMark = $('turn-mark');
const resultbar = $('resultbar');
const resultText = $('result-text');
const nextRoundBtn = $('next-round');
const scoreX = $('score-x');
const scoreO = $('score-o');
const playerX = $('player-x');
const playerO = $('player-o');
const roundLabel = $('round-label');
const statusEl = $('status');
const veil = $('veil');
const veilTitle = $('veil-title');
const veilCopy = $('veil-copy');
const modeButtons = [...document.querySelectorAll('.mode-switch button')];
const playerOName = playerO.querySelector('strong');

const TARGET = 5;
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

let board = Array(9).fill(null);
let turn = 'X';
let starter = 'X';
let round = 1;
let scores = { X: 0, O: 0 };
let result = null;
let matchOver = false;
let cells = [];
let mode = '2p';
let aiTimer = null;
let aiToken = 0;

function other(mark) {
  return mark === 'X' ? 'O' : 'X';
}

function nameOf(mark) {
  return mark === 'O' && mode !== '2p' ? 'Computer' : (mark === 'X' ? 'Player 1' : 'Player 2');
}

function isAiTurn() {
  return mode !== '2p' && turn === 'O' && !result && !matchOver;
}

function clearAi() {
  aiToken += 1;
  if (aiTimer !== null) {
    window.clearTimeout(aiTimer);
    aiTimer = null;
  }
}

function buildBoard() {
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 9; i += 1) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cell';
    cell.dataset.index = String(i);
    cell.setAttribute('role', 'gridcell');
    fragment.appendChild(cell);
    cells.push(cell);
  }
  boardEl.appendChild(fragment);
}

function lineCoords(line) {
  const center = (index) => ({
    x: 50 + (index % 3) * 100,
    y: 50 + Math.floor(index / 3) * 100
  });
  const a = center(line[0]);
  const b = center(line[2]);
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = (b.x - a.x) / length;
  const uy = (b.y - a.y) / length;
  return {
    x1: a.x - ux * 24,
    y1: a.y - uy * 24,
    x2: b.x + ux * 24,
    y2: b.y + uy * 24
  };
}

function render() {
  roundLabel.textContent = `Round ${round}`;
  scoreX.textContent = String(scores.X);
  scoreO.textContent = String(scores.O);
  playerOName.textContent = mode === '2p' ? 'Player 2' : 'Computer';

  playerX.classList.toggle('is-active', !result && turn === 'X');
  playerO.classList.toggle('is-active', !result && turn === 'O');

  turnbar.hidden = Boolean(result);
  resultbar.hidden = !result || matchOver;
  turnbar.classList.toggle('is-o', turn === 'O');
  turnMark.src = turn === 'X' ? 'assets/x.svg' : 'assets/o.svg';
  turnText.textContent = `${nameOf(turn)}'s turn`;

  const winning = result?.line ? new Set(result.line) : new Set();

  for (let i = 0; i < 9; i += 1) {
    const cell = cells[i];
    const mark = board[i];
    cell.classList.toggle('is-filled', Boolean(mark));
    cell.classList.toggle('is-win', winning.has(i));

    const current = cell.dataset.mark;
    if (mark && current !== mark) {
      const img = document.createElement('img');
      img.src = mark === 'X' ? 'assets/x.svg' : 'assets/o.svg';
      img.alt = '';
      cell.replaceChildren(img);
      cell.dataset.mark = mark;
    } else if (!mark && current) {
      cell.replaceChildren();
      delete cell.dataset.mark;
    }

    cell.disabled = Boolean(mark) || Boolean(result) || matchOver || isAiTurn();
    cell.setAttribute('aria-label', `Row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}${mark ? `, ${mark}` : ', empty'}`);
  }

  const winLine = $('win-line');
  const winWrap = winLine.parentElement;
  if (result?.line) {
    const coords = lineCoords(result.line);
    winLine.setAttribute('x1', coords.x1);
    winLine.setAttribute('y1', coords.y1);
    winLine.setAttribute('x2', coords.x2);
    winLine.setAttribute('y2', coords.y2);
    winWrap.classList.toggle('is-o', result.mark === 'O');
    winWrap.classList.add('show');
  } else {
    winWrap.classList.remove('show', 'is-o');
  }

  if (result) {
    if (result.type === 'draw') resultText.textContent = `Round ${round} is a draw`;
    else resultText.textContent = `${nameOf(result.mark)} wins round ${round}`;
  }
}

function showMatchOver() {
  const winner = scores.X >= TARGET ? 'X' : 'O';
  veilTitle.textContent = `${nameOf(winner)} wins the match!`;
  veilCopy.textContent = `${scores.X} - ${scores.O} after ${round} rounds. ${nameOf(winner)} takes the cup.`;
  veil.hidden = false;
  $('veil-primary').focus({ preventScroll: true });
  statusEl.textContent = `${nameOf(winner)} wins the match ${scores.X} to ${scores.O}.`;
}

function winnerOn(testBoard, mark) {
  return LINES.find((combo) => combo.every((i) => testBoard[i] === mark)) || null;
}

function minimax(testBoard, player) {
  if (winnerOn(testBoard, 'O')) return 10;
  if (winnerOn(testBoard, 'X')) return -10;
  if (testBoard.every(Boolean)) return 0;

  if (player === 'O') {
    let best = -Infinity;
    for (let i = 0; i < 9; i += 1) {
      if (testBoard[i]) continue;
      testBoard[i] = 'O';
      best = Math.max(best, minimax(testBoard, 'X'));
      testBoard[i] = null;
    }
    return best;
  }

  let best = Infinity;
  for (let i = 0; i < 9; i += 1) {
    if (testBoard[i]) continue;
    testBoard[i] = 'X';
    best = Math.min(best, minimax(testBoard, 'O'));
    testBoard[i] = null;
  }
  return best;
}

function bestAiMove() {
  const empty = board.map((mark, index) => mark ? -1 : index).filter((index) => index >= 0);
  if (!empty.length) return -1;

  if (mode === 'easy' && Math.random() < 0.62) {
    return empty[Math.floor(Math.random() * empty.length)];
  }

  let bestScore = -Infinity;
  const choices = [];
  for (const index of empty) {
    board[index] = 'O';
    const score = minimax(board, 'X');
    board[index] = null;
    if (score > bestScore) {
      bestScore = score;
      choices.length = 0;
      choices.push(index);
    } else if (score === bestScore) {
      choices.push(index);
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
    const move = bestAiMove();
    if (move >= 0) place(move, true);
  }, 420);
}

function place(index, fromAi = false) {
  if (result || matchOver || board[index]) return;
  if (mode !== '2p' && turn === 'O' && !fromAi) return;

  board[index] = turn;
  const line = winnerOn(board, turn);

  if (line) {
    scores[turn] += 1;
    result = { type: 'win', mark: turn, line };
    turn = other(turn);
    render();
    if (scores[result.mark] >= TARGET) {
      matchOver = true;
      render();
      showMatchOver();
    } else {
      statusEl.textContent = `${nameOf(result.mark)} wins round ${round}.`;
    }
    return;
  }

  if (board.every(Boolean)) {
    result = { type: 'draw' };
    turn = other(turn);
    render();
    statusEl.textContent = `Round ${round} is a draw.`;
    return;
  }

  turn = other(turn);
  render();
  statusEl.textContent = `${nameOf(turn)}'s turn.`;
  scheduleAi();
}

function nextRound() {
  if (!result) return;
  clearAi();
  if (result.type === 'win') starter = result.mark;
  else starter = other(starter);

  round += 1;
  turn = starter;
  board = Array(9).fill(null);
  result = null;
  render();
  statusEl.textContent = `Round ${round}. ${nameOf(turn)} starts.`;
  scheduleAi();
}

function resetMatch() {
  clearAi();
  scores = { X: 0, O: 0 };
  round = 1;
  starter = 'X';
  turn = 'X';
  board = Array(9).fill(null);
  result = null;
  matchOver = false;
  veil.hidden = true;
  render();
  statusEl.textContent = mode === '2p' ? 'New match. Player 1 starts with X.' : 'New match against the computer. You are X.';
}

boardEl.addEventListener('click', (event) => {
  const cell = event.target.closest('.cell');
  if (!cell) return;
  place(Number(cell.dataset.index));
});

modeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.mode === mode) return;
    mode = button.dataset.mode;
    modeButtons.forEach((item) => item.classList.toggle('is-on', item === button));
    softRefresh(page, resetMatch);
  });
});

const requestNextRound = () => softRefresh(playField, nextRound);
const requestReset = () => softRefresh(page, resetMatch);

nextRoundBtn.addEventListener('click', requestNextRound);
$('reset').addEventListener('click', requestReset);
$('reset-match').addEventListener('click', requestReset);
$('veil-primary').addEventListener('click', requestReset);

window.addEventListener('keydown', (event) => {
  if (event.key >= '1' && event.key <= '9') {
    event.preventDefault();
    place(Number(event.key) - 1);
  }
});

buildBoard();
render();
