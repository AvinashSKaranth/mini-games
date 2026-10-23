import { softRefresh } from '../../shared/refresh.js';

const $ = (id) => document.getElementById(id);
const boardEl = $('board');
const boardWrap = $('board-wrap');
const statusEl = $('status');
const veil = $('veil');
const turnPill = $('turn-pill');
const sideEls = [$('side-1'), $('side-2')];
const countEls = [$('count-1'), $('count-2')];
const name2 = $('name-2');
const hint = $('hint');
const modeButtons = [...document.querySelectorAll('.difficulty button')];

const NAMES = ['Player 1', 'Player 2'];
const DIRS = {
  1: [[-1, -1], [-1, 1]],
  2: [[1, -1], [1, 1]]
};
const ALL_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

let board = Array(64).fill(null);
let turn = 1;
let selected = null;
let legal = [];
let mode = '2p';
let over = false;
let aiTimer = null;
let aiToken = 0;
let lastMove = null;

function newGame() {
  clearAi();
  board = Array(64).fill(null);
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      if ((r + c) % 2 === 1) board[r * 8 + c] = { player: 2, king: false };
    }
  }
  for (let r = 5; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      if ((r + c) % 2 === 1) board[r * 8 + c] = { player: 1, king: false };
    }
  }
  turn = 1;
  selected = null;
  legal = [];
  over = false;
  lastMove = null;
  veil.hidden = true;
  document.body.classList.toggle('is-ai', mode === 'ai');
  render();
  statusEl.textContent = mode === 'ai' ? 'New game. You are Player 1; the computer is Player 2.' : 'New game. Player 1 moves first.';
}

function clearAi() {
  aiToken += 1;
  if (aiTimer !== null) {
    window.clearTimeout(aiTimer);
    aiTimer = null;
  }
}

function isAiTurn() {
  return mode === 'ai' && turn === 2 && !over;
}

function nameOf(player) {
  return player === 2 && mode === 'ai' ? 'Computer' : NAMES[player - 1];
}

function pieceMoves(index, capturesOnly = false) {
  const piece = board[index];
  if (!piece) return [];
  const row = Math.floor(index / 8);
  const col = index % 8;
  const dirs = piece.king ? ALL_DIRS : DIRS[piece.player];
  const moves = [];

  for (const [dr, dc] of dirs) {
    const r1 = row + dr;
    const c1 = col + dc;
    if (r1 < 0 || r1 > 7 || c1 < 0 || c1 > 7) continue;
    const step = board[r1 * 8 + c1];
    if (!step && !capturesOnly) {
      moves.push({ from: index, to: r1 * 8 + c1, capture: null });
    } else if (step && step.player !== piece.player) {
      const r2 = row + dr * 2;
      const c2 = col + dc * 2;
      if (r2 < 0 || r2 > 7 || c2 < 0 || c2 > 7) continue;
      const landing = r2 * 8 + c2;
      if (!board[landing]) {
        moves.push({ from: index, to: landing, capture: r1 * 8 + c1 });
      }
    }
  }
  return moves;
}

function allMoves(player) {
  const moves = [];
  for (let i = 0; i < 64; i += 1) {
    if (board[i]?.player === player) moves.push(...pieceMoves(i));
  }
  return moves;
}

function legalMovesFor(index) {
  const all = allMoves(turn);
  const captures = all.filter((move) => move.capture !== null);
  if (captures.length) {
    return captures.filter((move) => move.from === index);
  }
  return pieceMoves(index).filter((move) => move.capture === null);
}

function countPieces(player) {
  return board.reduce((sum, piece) => sum + (piece?.player === player ? 1 : 0), 0);
}

function selectPiece(index) {
  if (isAiTurn() || over) return;
  const piece = board[index];
  if (!piece || piece.player !== turn) {
    selected = null;
    legal = [];
    render();
    return;
  }
  const moves = legalMovesFor(index);
  if (!moves.length) {
    const forced = allMoves(turn).some((move) => move.capture !== null);
    statusEl.textContent = forced ? 'A capture is available. You must jump.' : 'That piece has no legal move.';
    return;
  }
  selected = index;
  legal = moves;
  render();
}

function applyMove(move, fromAi = false) {
  if (over) return;
  if (mode === 'ai' && turn === 2 && !fromAi) return;

  const piece = board[move.from];
  if (!piece) return;

  board[move.from] = null;
  board[move.to] = piece;
  if (move.capture !== null) board[move.capture] = null;

  const row = Math.floor(move.to / 8);
  let promoted = false;
  if (!piece.king && ((piece.player === 1 && row === 0) || (piece.player === 2 && row === 7))) {
    piece.king = true;
    promoted = true;
  }

  lastMove = { from: move.from, to: move.to, capture: move.capture };
  const further = move.capture !== null ? pieceMoves(move.to, true) : [];

  if (further.length) {
    selected = move.to;
    legal = further;
    statusEl.textContent = `${nameOf(turn)} must continue the jump.`;
    render();
    scheduleAi();
    return;
  }

  selected = null;
  legal = [];
  const mover = turn;
  turn = 3 - turn;

  if (!allMoves(turn).length || countPieces(turn) === 0) {
    over = true;
    render();
    showResult(mover, promoted);
    return;
  }

  render();
  statusEl.textContent = promoted
    ? `${nameOf(mover)} crowns a king! ${nameOf(turn)}'s turn.`
    : `${nameOf(mover)} moved. ${nameOf(turn)}'s turn.`;
  scheduleAi();
}

function render() {
  name2.textContent = mode === 'ai' ? 'Computer' : 'Player 2';
  countEls[0].textContent = String(countPieces(1));
  countEls[1].textContent = String(countPieces(2));
  sideEls.forEach((el, i) => el.classList.toggle('is-active', !over && turn === i + 1));
  turnPill.textContent = over ? 'Game over' : `${nameOf(turn)}'s turn`;

  const legalTargets = new Map(legal.map((move) => [move.to, Boolean(move.capture)]));
  const forced = allMoves(turn).some((move) => move.capture !== null);
  hint.textContent = forced ? 'A capture is available — you must jump.' : 'Tap a piece, then a highlighted square. Captures are forced.';

  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 64; i += 1) {
    const row = Math.floor(i / 8);
    const col = i % 8;
    const dark = (row + col) % 2 === 1;
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = `cell ${dark ? 'dark' : 'light'}`;
    cell.dataset.index = String(i);
    cell.disabled = !dark;

    if (selected === i) cell.classList.add('is-selected');
    if (legalTargets.has(i)) {
      cell.classList.add('is-legal');
      if (legalTargets.get(i)) cell.classList.add('is-capture');
    }
    if (lastMove && (lastMove.to === i || lastMove.from === i)) cell.classList.add('is-last');

    const piece = board[i];
    if (piece) {
      const span = document.createElement('span');
      span.className = `piece piece--p${piece.player}${piece.king ? ' is-king' : ''}`;
      if (piece.king) {
        const img = document.createElement('img');
        img.src = 'assets/crown.svg';
        img.alt = '';
        span.appendChild(img);
      }
      cell.appendChild(span);
    }

    const coord = `${String.fromCharCode(65 + col)}${8 - row}`;
    let label = `${coord}, ${dark ? 'dark square' : 'light square'}`;
    if (piece) label += `, ${piece.player === 1 ? 'coral' : 'teal'} ${piece.king ? 'king' : 'piece'}`;
    if (legalTargets.has(i)) label += ', legal move';
    cell.setAttribute('aria-label', label);
    fragment.appendChild(cell);
  }
  boardEl.replaceChildren(fragment);
}

function showResult(winner, crowned) {
  const title = mode === 'ai' && winner === 2 ? 'Computer wins!' : `${nameOf(winner)} wins!`;
  $('veil-title').textContent = title;
  $('veil-copy').textContent = crowned
    ? `A fresh king seals it. ${countPieces(winner)} pieces left.`
    : `The board is clear. ${countPieces(winner)} pieces left.`;
  veil.hidden = false;
  statusEl.textContent = `${title} ${countPieces(winner)} pieces remain.`;
  requestAnimationFrame(() => $('rematch').focus({ preventScroll: true }));
}

function chooseAiMove() {
  const moves = selected !== null ? legal : allMoves(2);
  if (!moves.length) return null;
  const captures = moves.filter((move) => move.capture !== null);
  const pool = captures.length ? captures : moves;
  const scored = pool.map((move) => {
    const piece = board[move.from];
    const row = Math.floor(move.to / 8);
    const promote = piece && !piece.king && row === 7;
    const center = 3.5 - Math.abs((move.to % 8) - 3.5);
    return { move, score: (move.capture !== null ? 20 : 0) + (promote ? 12 : 0) + center + Math.random() * 4 };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].move;
}

function scheduleAi() {
  clearAi();
  if (!isAiTurn()) return;
  const token = aiToken;
  aiTimer = window.setTimeout(() => {
    aiTimer = null;
    if (token !== aiToken || !isAiTurn()) return;
    const move = chooseAiMove();
    if (move) applyMove(move, true);
  }, 460);
}

boardEl.addEventListener('click', (event) => {
  const cell = event.target.closest('.cell');
  if (!cell || isAiTurn() || over) return;
  const index = Number(cell.dataset.index);

  if (selected !== null) {
    const move = legal.find((item) => item.to === index);
    if (move) {
      applyMove(move);
      return;
    }
  }

  selectPiece(index);
});

modeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.mode === mode) return;
    mode = button.dataset.mode;
    modeButtons.forEach((item) => item.classList.toggle('is-active', item === button));
    softRefresh(boardWrap, newGame);
  });
});

const requestNewGame = () => softRefresh(boardWrap, newGame);
$('reset').addEventListener('click', requestNewGame);
$('new-game').addEventListener('click', requestNewGame);
$('rematch').addEventListener('click', requestNewGame);

newGame();
