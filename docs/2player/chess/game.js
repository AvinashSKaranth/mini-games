import { softRefresh } from '../../shared/refresh.js';

const $ = (id) => document.getElementById(id);
const boardEl = $('board');
const boardWrap = $('board-wrap');
const turnPill = $('turn-pill');
const checkPill = $('check-pill');
const statusEl = $('status');
const veil = $('veil');
const undoBtn = $('undo');
const modeButtons = [...document.querySelectorAll('.difficulty button')];

const START = [
  'br', 'bn', 'bb', 'bq', 'bk', 'bb', 'bn', 'br',
  'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp',
  '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '',
  'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp',
  'wr', 'wn', 'wb', 'wq', 'wk', 'wb', 'wn', 'wr'
];
const VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
const NAMES = { w: 'White', b: 'Black' };
const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

let board = [];
let turn = 'w';
let castling = {};
let ep = null;
let selected = null;
let legal = [];
let lastMove = null;
let history = [];
let over = false;
let mode = '2p';
let aiTimer = null;
let aiToken = 0;

const other = (color) => color === 'w' ? 'b' : 'w';
const rowOf = (sq) => Math.floor(sq / 8);
const colOf = (sq) => sq % 8;
const onBoard = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

function newGame() {
  clearAi();
  board = START.map((code) => code ? { color: code[0], type: code[1] } : null);
  turn = 'w';
  castling = { wK: true, wQ: true, bK: true, bQ: true };
  ep = null;
  selected = null;
  legal = [];
  lastMove = null;
  history = [];
  over = false;
  veil.hidden = true;
  render();
  statusEl.textContent = mode === 'ai' ? 'New game. You are White; the computer is Black.' : 'New game. White moves first.';
}

function clearAi() {
  aiToken += 1;
  if (aiTimer !== null) {
    window.clearTimeout(aiTimer);
    aiTimer = null;
  }
}

function isAiTurn() {
  return mode === 'ai' && turn === 'b' && !over;
}

function findKing(color) {
  return board.findIndex((piece) => piece?.color === color && piece.type === 'k');
}

function isAttacked(sq, by) {
  if (sq < 0) return false;
  const r = rowOf(sq);
  const c = colOf(sq);

  const pawnRow = by === 'w' ? r + 1 : r - 1;
  for (const dc of [-1, 1]) {
    const cc = c + dc;
    if (onBoard(pawnRow, cc)) {
      const piece = board[pawnRow * 8 + cc];
      if (piece?.color === by && piece.type === 'p') return true;
    }
  }

  for (const [dr, dc] of KNIGHT) {
    const rr = r + dr;
    const cc = c + dc;
    if (!onBoard(rr, cc)) continue;
    const piece = board[rr * 8 + cc];
    if (piece?.color === by && piece.type === 'n') return true;
  }

  for (const [dr, dc] of KING) {
    const rr = r + dr;
    const cc = c + dc;
    if (!onBoard(rr, cc)) continue;
    const piece = board[rr * 8 + cc];
    if (piece?.color === by && piece.type === 'k') return true;
  }

  const slide = (dirs, types) => {
    for (const [dr, dc] of dirs) {
      let rr = r + dr;
      let cc = c + dc;
      while (onBoard(rr, cc)) {
        const piece = board[rr * 8 + cc];
        if (piece) {
          if (piece.color === by && types.includes(piece.type)) return true;
          break;
        }
        rr += dr;
        cc += dc;
      }
    }
    return false;
  };

  return slide(ORTHO, ['r', 'q']) || slide(DIAG, ['b', 'q']);
}

function inCheck(color) {
  const king = findKing(color);
  return king >= 0 && isAttacked(king, other(color));
}

function pseudoMoves(sq) {
  const piece = board[sq];
  if (!piece) return [];
  const r = rowOf(sq);
  const c = colOf(sq);
  const moves = [];
  const add = (to, extra = {}) => {
    if (to < 0 || to > 63) return;
    if (board[to]?.type === 'k') return;
    moves.push({ from: sq, to, ...extra });
  };

  if (piece.type === 'p') {
    const dir = piece.color === 'w' ? -1 : 1;
    const startRow = piece.color === 'w' ? 6 : 1;
    const one = (r + dir) * 8 + c;
    if (onBoard(r + dir, c) && !board[one]) {
      add(one, r + dir === (piece.color === 'w' ? 0 : 7) ? { promotion: 'q' } : {});
      const two = (r + dir * 2) * 8 + c;
      if (r === startRow && !board[two]) add(two);
    }
    for (const dc of [-1, 1]) {
      const rr = r + dir;
      const cc = c + dc;
      if (!onBoard(rr, cc)) continue;
      const to = rr * 8 + cc;
      const target = board[to];
      if (target && target.color !== piece.color) {
        add(to, rr === (piece.color === 'w' ? 0 : 7) ? { promotion: 'q' } : {});
      } else if (to === ep && !target) {
        add(to, { ep: true });
      }
    }
  } else if (piece.type === 'n') {
    for (const [dr, dc] of KNIGHT) {
      const rr = r + dr;
      const cc = c + dc;
      if (!onBoard(rr, cc)) continue;
      const to = rr * 8 + cc;
      if (board[to]?.color !== piece.color) add(to);
    }
  } else if (piece.type === 'k') {
    for (const [dr, dc] of KING) {
      const rr = r + dr;
      const cc = c + dc;
      if (!onBoard(rr, cc)) continue;
      const to = rr * 8 + cc;
      if (board[to]?.color !== piece.color) add(to);
    }
    const home = piece.color === 'w' ? 60 : 4;
    if (sq === home && !inCheck(piece.color)) {
      const enemy = other(piece.color);
      const kSide = piece.color === 'w' ? 'wK' : 'bK';
      const qSide = piece.color === 'w' ? 'wQ' : 'bQ';
      if (castling[kSide] && !board[home + 1] && !board[home + 2]
        && board[home + 3]?.type === 'r' && board[home + 3]?.color === piece.color
        && !isAttacked(home + 1, enemy) && !isAttacked(home + 2, enemy)) {
        add(home + 2, { castle: 'K' });
      }
      if (castling[qSide] && !board[home - 1] && !board[home - 2] && !board[home - 3]
        && board[home - 4]?.type === 'r' && board[home - 4]?.color === piece.color
        && !isAttacked(home - 1, enemy) && !isAttacked(home - 2, enemy)) {
        add(home - 2, { castle: 'Q' });
      }
    }
  } else {
    const dirs = piece.type === 'r' ? ORTHO : piece.type === 'b' ? DIAG : [...ORTHO, ...DIAG];
    for (const [dr, dc] of dirs) {
      let rr = r + dr;
      let cc = c + dc;
      while (onBoard(rr, cc)) {
        const to = rr * 8 + cc;
        const target = board[to];
        if (!target) add(to);
        else {
          if (target.color !== piece.color) add(to);
          break;
        }
        rr += dr;
        cc += dc;
      }
    }
  }

  return moves;
}

function makeMove(move) {
  const piece = board[move.from];
  const color = piece.color;
  const capturedSq = move.ep ? move.to + (color === 'w' ? 8 : -8) : move.to;
  const captured = board[capturedSq];
  const undo = {
    move,
    captured,
    capturedSq,
    castling: { ...castling },
    ep,
    movedType: piece.type
  };

  board[move.from] = null;
  board[move.to] = piece;

  if (capturedSq !== move.to) board[capturedSq] = null;

  if (move.castle) {
    const rookFrom = move.castle === 'K' ? move.to + 1 : move.to - 2;
    const rookTo = move.castle === 'K' ? move.to - 1 : move.to + 1;
    board[rookTo] = board[rookFrom];
    board[rookFrom] = null;
  }

  if (move.promotion) piece.type = move.promotion;

  if (piece.type === 'k' || move.movedType === 'k') {
    if (color === 'w') { castling.wK = false; castling.wQ = false; }
    else { castling.bK = false; castling.bQ = false; }
  }
  if (move.movedType === 'r') {
    if (move.from === 63) castling.wK = false;
    if (move.from === 56) castling.wQ = false;
    if (move.from === 7) castling.bK = false;
    if (move.from === 0) castling.bQ = false;
  }
  if (captured?.type === 'r') {
    if (capturedSq === 63) castling.wK = false;
    if (capturedSq === 56) castling.wQ = false;
    if (capturedSq === 7) castling.bK = false;
    if (capturedSq === 0) castling.bQ = false;
  }

  ep = null;
  if (move.movedType === 'p' && Math.abs(move.to - move.from) === 16) {
    ep = (move.from + move.to) / 2;
  }

  turn = other(turn);
  return undo;
}

function undoMove(undo) {
  const { move } = undo;
  const piece = board[move.to];
  if (!piece) return;
  board[move.from] = piece;
  board[move.to] = null;

  if (undo.movedType !== piece.type) piece.type = undo.movedType;
  if (undo.captured) board[undo.capturedSq] = undo.captured;

  if (move.castle) {
    const rookFrom = move.castle === 'K' ? move.to + 1 : move.to - 2;
    const rookTo = move.castle === 'K' ? move.to - 1 : move.to + 1;
    board[rookFrom] = board[rookTo];
    board[rookTo] = null;
  }

  castling = undo.castling;
  ep = undo.ep;
  turn = other(turn);
}

function legalMoves(color) {
  const moves = [];
  for (let sq = 0; sq < 64; sq += 1) {
    if (board[sq]?.color !== color) continue;
    for (const move of pseudoMoves(sq)) {
      const undo = makeMove(move);
      if (!inCheck(color)) moves.push(move);
      undoMove(undo);
    }
  }
  return moves;
}

function snapshot() {
  return {
    board: board.map((piece) => piece ? { ...piece } : null),
    turn,
    castling: { ...castling },
    ep,
    lastMove,
    over
  };
}

function restore(state) {
  board = state.board.map((piece) => piece ? { ...piece } : null);
  turn = state.turn;
  castling = { ...state.castling };
  ep = state.ep;
  lastMove = state.lastMove;
  over = state.over;
  selected = null;
  legal = [];
}

function applyMove(move, fromAi = false) {
  if (over) return;
  if (mode === 'ai' && turn === 'b' && !fromAi) return;

  history.push(snapshot());
  const mover = turn;
  const undo = makeMove(move);
  lastMove = { from: move.from, to: move.to };
  selected = null;
  legal = [];

  const promotion = undo.movedType === 'p' && move.promotion ? ` Promotion to queen.` : '';
  const check = inCheck(turn) ? ' Check.' : '';
  render();
  statusEl.textContent = `${NAMES[mover]} moved.${promotion}${check}`;

  if (checkGameEnd()) return;
  scheduleAi();
}

function checkGameEnd() {
  const moves = legalMoves(turn);
  if (moves.length) {
    if (inCheck(turn)) statusEl.textContent = `${NAMES[turn]} is in check.`;
    return false;
  }

  over = true;
  clearAi();
  render();
  const winner = other(turn);
  if (inCheck(turn)) {
    $('veil-title').textContent = `${NAMES[winner]} wins!`;
    $('veil-copy').textContent = `Checkmate in ${Math.ceil(history.length / 2)} moves.`;
    statusEl.textContent = `Checkmate. ${NAMES[winner]} wins.`;
  } else {
    $('veil-title').textContent = 'Stalemate';
    $('veil-copy').textContent = 'No legal moves left. The game is a draw.';
    statusEl.textContent = 'Stalemate. The game is a draw.';
  }
  veil.hidden = false;
  requestAnimationFrame(() => $('rematch').focus({ preventScroll: true }));
  return true;
}

function render() {
  turnPill.textContent = over ? 'Game over' : `${NAMES[turn]} to move`;
  turnPill.classList.toggle('is-black', turn === 'b');
  checkPill.hidden = over || !inCheck(turn);
  undoBtn.disabled = history.length === 0 || over;

  const legalTargets = new Map(legal.map((move) => [move.to, Boolean(board[move.to]) || move.ep]));
  const kingSq = inCheck(turn) ? findKing(turn) : -1;
  const fragment = document.createDocumentFragment();

  for (let sq = 0; sq < 64; sq += 1) {
    const r = rowOf(sq);
    const c = colOf(sq);
    const dark = (r + c) % 2 === 1;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `square ${dark ? 'dark' : 'light'}`;
    button.dataset.square = String(sq);
    button.disabled = over || isAiTurn();

    if (selected === sq) button.classList.add('is-selected');
    if (lastMove && (lastMove.from === sq || lastMove.to === sq)) button.classList.add('is-last');
    if (kingSq === sq) button.classList.add('is-check');
    if (legalTargets.has(sq)) {
      button.classList.add('is-legal');
      if (legalTargets.get(sq)) button.classList.add('is-capture');
    }

    const piece = board[sq];
    if (piece) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'piece');
      svg.setAttribute('viewBox', '0 0 45 45');
      svg.setAttribute('aria-hidden', 'true');
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', `#${piece.color}${piece.type.toUpperCase()}`);
      svg.appendChild(use);
      button.appendChild(svg);
    }

    if (c === 0) {
      const coord = document.createElement('span');
      coord.className = 'coord rank';
      coord.textContent = String(8 - r);
      button.appendChild(coord);
    }
    if (r === 7) {
      const coord = document.createElement('span');
      coord.className = 'coord file';
      coord.textContent = String.fromCharCode(97 + c);
      button.appendChild(coord);
    }

    const name = piece ? `${NAMES[piece.color]} ${piece.type}` : 'empty';
    button.setAttribute('aria-label', `${String.fromCharCode(97 + c)}${8 - r}, ${name}`);
    fragment.appendChild(button);
  }
  boardEl.replaceChildren(fragment);
}

function selectSquare(sq) {
  if (over || isAiTurn()) return;
  const piece = board[sq];
  if (!piece || piece.color !== turn) {
    selected = null;
    legal = [];
    render();
    return;
  }
  const moves = legalMoves(turn).filter((move) => move.from === sq);
  if (!moves.length) {
    selected = null;
    legal = [];
    statusEl.textContent = `${NAMES[turn]} has no legal move from that square.`;
    render();
    return;
  }
  selected = sq;
  legal = moves;
  statusEl.textContent = `${NAMES[turn]} selected ${piece.type.toUpperCase()}.`;
  render();
}

function evaluate() {
  let score = 0;
  for (let sq = 0; sq < 64; sq += 1) {
    const piece = board[sq];
    if (!piece) continue;
    const center = 3.5 - Math.abs(rowOf(sq) - 3.5) + 3.5 - Math.abs(colOf(sq) - 3.5);
    let value = VALUES[piece.type] + center * 3;
    if (piece.type === 'p') {
      const advance = piece.color === 'w' ? 6 - rowOf(sq) : rowOf(sq) - 1;
      value += advance * 7;
    }
    score += piece.color === 'w' ? value : -value;
  }
  return score;
}

function search(depth, alpha, beta, color) {
  if (depth === 0) return evaluate();
  const moves = legalMoves(color);
  if (!moves.length) return inCheck(color) ? (color === 'w' ? -99999 : 99999) : 0;

  if (color === 'b') {
    let best = Infinity;
    for (const move of moves) {
      const undo = makeMove(move);
      best = Math.min(best, search(depth - 1, alpha, beta, 'w'));
      undoMove(undo);
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = -Infinity;
  for (const move of moves) {
    const undo = makeMove(move);
    best = Math.max(best, search(depth - 1, alpha, beta, 'b'));
    undoMove(undo);
    alpha = Math.max(alpha, best);
    if (beta <= alpha) break;
  }
  return best;
}

function chooseAiMove() {
  const moves = legalMoves('b');
  if (!moves.length) return null;
  const captures = moves.filter((move) => board[move.to]);
  const pool = captures.length && Math.random() < 0.7 ? captures : moves;
  let best = Infinity;
  const choices = [];
  for (const move of pool) {
    const undo = makeMove(move);
    const score = search(2, -Infinity, Infinity, 'w');
    undoMove(undo);
    if (score < best) {
      best = score;
      choices.length = 0;
      choices.push(move);
    } else if (score === best) {
      choices.push(move);
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
    const move = chooseAiMove();
    if (move) applyMove(move, true);
  }, 520);
}

function undo() {
  if (!history.length || over) return;
  clearAi();
  restore(history.pop());
  if (mode === 'ai' && turn === 'b' && history.length) restore(history.pop());
  over = false;
  veil.hidden = true;
  render();
  statusEl.textContent = 'Move undone.';
}

boardEl.addEventListener('click', (event) => {
  const square = event.target.closest('.square');
  if (!square || isAiTurn() || over) return;
  const sq = Number(square.dataset.square);

  if (selected !== null) {
    const move = legal.find((item) => item.to === sq);
    if (move) {
      applyMove(move);
      return;
    }
  }

  selectSquare(sq);
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
undoBtn.addEventListener('click', undo);

newGame();
