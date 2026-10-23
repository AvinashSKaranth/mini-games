import { softRefresh } from '../../shared/refresh.js';

const $ = (id) => document.getElementById(id);

const page = document.querySelector('.app');
const boardEl = $('board');
const playField = document.querySelector('.board-wrap');
const turnbar = $('turnbar');
const turnText = $('turn-text');
const turnMark = $('turn-mark');
const turnDot = $('turn-dot');
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

const MARK_NAME = { X: 'Player 1', O: 'Player 2' };
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

function other(mark) {
  return mark === 'X' ? 'O' : 'X';
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

  playerX.classList.toggle('is-active', !result && turn === 'X');
  playerO.classList.toggle('is-active', !result && turn === 'O');

  turnbar.hidden = Boolean(result);
  resultbar.hidden = !result || matchOver;
  turnbar.classList.toggle('is-o', turn === 'O');
  turnMark.src = turn === 'X' ? 'assets/x.svg' : 'assets/o.svg';
  turnText.textContent = `${MARK_NAME[turn]}'s turn`;

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
    else resultText.textContent = `${MARK_NAME[result.mark]} wins round ${round}`;
  }
}

function showMatchOver() {
  const winner = scores.X >= TARGET ? 'X' : 'O';
  veilTitle.textContent = `${MARK_NAME[winner]} wins the match!`;
  veilCopy.textContent = `${scores.X} – ${scores.O} after ${round} rounds. ${MARK_NAME[winner]} takes the cup.`;
  veil.hidden = false;
  $('veil-primary').focus({ preventScroll: true });
  statusEl.textContent = `${MARK_NAME[winner]} wins the match ${scores.X} to ${scores.O}.`;
}

function place(index) {
  if (result || matchOver || board[index]) return;

  board[index] = turn;
  const line = LINES.find((combo) => combo.every((i) => board[i] === turn));

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
      statusEl.textContent = `${MARK_NAME[result.mark]} wins round ${round}.`;
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
  statusEl.textContent = `${MARK_NAME[turn]}'s turn.`;
}

function nextRound() {
  if (!result) return;
  if (result.type === 'win') starter = result.mark;
  else starter = other(starter);

  round += 1;
  turn = starter;
  board = Array(9).fill(null);
  result = null;
  render();
  statusEl.textContent = `Round ${round}. ${MARK_NAME[turn]} starts.`;
}

function resetMatch() {
  scores = { X: 0, O: 0 };
  round = 1;
  starter = 'X';
  turn = 'X';
  board = Array(9).fill(null);
  result = null;
  matchOver = false;
  veil.hidden = true;
  render();
  statusEl.textContent = 'New match. Player 1 starts with X.';
}

boardEl.addEventListener('click', (event) => {
  const cell = event.target.closest('.cell');
  if (!cell) return;
  place(Number(cell.dataset.index));
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
