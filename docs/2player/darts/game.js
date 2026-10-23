import { softRefresh } from '../../shared/refresh.js';

const $ = (id) => document.getElementById(id);
const canvas = $('board');
const ctx = canvas.getContext('2d');
const boardWrap = $('board-wrap');
const statusEl = $('status');
const veil = $('veil');
const turnPill = $('turn-pill');
const scoreEls = [$('score-1'), $('score-2')];
const leftEls = [$('left-1'), $('left-2')];
const cardEls = [$('card-1'), $('card-2')];
const modeButtons = [...document.querySelectorAll('.difficulty button')];

const SIZE = 420;
const C = SIZE / 2;
const R = 194;
const SECTORS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const NAMES = ['Player 1', 'Player 2'];
const TAU = Math.PI * 2;

let mode = 'solo';
let scores = [501, 501];
let turn = 0;
let dartsLeft = 3;
let turnStart = 501;
let dartsThrown = 0;
let markers = [];
let over = false;
let view = { dpr: 1, size: SIZE, scale: 1 };
let crosshair = null;
let token = 0;

function newGame() {
  token += 1;
  scores = [501, 501];
  turn = 0;
  dartsLeft = 3;
  turnStart = 501;
  dartsThrown = 0;
  markers = [];
  over = false;
  crosshair = null;
  veil.hidden = true;
  document.body.classList.toggle('is-solo', mode === 'solo');
  updateHud();
  draw();
  statusEl.textContent = mode === 'solo'
    ? 'Solo 501. Three darts per visit. Finish on a double.'
    : 'Player 1 starts. Three darts each. Finish on a double.';
}

function updateHud() {
  scoreEls.forEach((el, i) => { el.textContent = String(scores[i]); });
  leftEls[0].textContent = scores[0] === 0 ? 'Checked out' : `${scores[0]} to go`;
  leftEls[1].textContent = scores[1] === 0 ? 'Checked out' : `${scores[1]} to go`;
  cardEls.forEach((el, i) => el.classList.toggle('is-active', !over && i === turn && (mode === 'duo' || i === 0)));
  turnPill.textContent = over ? 'Game over' : `${dartsLeft} dart${dartsLeft === 1 ? '' : 's'} left`;
}

function resize() {
  const rect = boardWrap.getBoundingClientRect();
  if (rect.width < 2) return;
  const dpr = Math.min(2.5, window.devicePixelRatio || 1);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.width * dpr);
  view = { dpr, size: rect.width, scale: rect.width / SIZE };
  draw();
}

function scoreAt(x, y) {
  const dx = x - C;
  const dy = y - C;
  const radius = Math.hypot(dx, dy);
  if (radius > R) return { value: 0, double: false, label: 'Miss' };

  if (radius < R * 0.06) return { value: 50, double: true, label: 'Bull' };
  if (radius < R * 0.16) return { value: 25, double: false, label: 'Outer bull' };

  let angle = Math.atan2(dx, -dy);
  if (angle < 0) angle += TAU;
  const index = Math.floor((angle + Math.PI / 20) / (Math.PI / 10)) % 20;
  const number = SECTORS[index];
  const triple = radius > R * 0.56 && radius < R * 0.62;
  const double = radius > R * 0.95 && radius < R;
  const mult = triple ? 3 : double ? 2 : 1;
  return {
    value: number * mult,
    double,
    label: `${triple ? 'T' : double ? 'D' : ''}${number}`
  };
}

function throwDart(x, y) {
  if (over || dartsLeft <= 0) return;
  const hit = scoreAt(x, y);
  markers.push({ x, y, player: turn, hit });
  dartsThrown += 1;

  const before = scores[turn];
  const after = before - hit.value;
  const bust = after < 0 || after === 1 || (after === 0 && !hit.double);

  if (after === 0 && hit.double) {
    scores[turn] = 0;
    over = true;
    updateHud();
    draw();
    veil.hidden = false;
    $('veil-title').textContent = `${NAMES[turn]} checks out!`;
    $('veil-copy').textContent = mode === 'solo'
      ? `501 finished in ${dartsThrown} darts.`
      : `${NAMES[turn]} finishes on ${hit.label}.`;
    statusEl.textContent = `${NAMES[turn]} wins. ${hit.label} checks out.`;
    requestAnimationFrame(() => $('rematch').focus({ preventScroll: true }));
    return;
  }

  if (bust) {
    scores[turn] = turnStart;
    dartsLeft = 0;
    statusEl.textContent = `${hit.label} — bust. ${NAMES[turn]} returns to ${turnStart}.`;
    updateHud();
    draw();
    scheduleEndTurn();
    return;
  }

  scores[turn] = after;
  dartsLeft -= 1;
  updateHud();
  draw();
  if (dartsLeft === 0) {
    statusEl.textContent = `${NAMES[turn]} ends the visit on ${after}.`;
    scheduleEndTurn();
  } else {
    statusEl.textContent = `${hit.label}: ${after} left.`;
  }
}

function scheduleEndTurn() {
  const myToken = token;
  window.setTimeout(() => {
    if (myToken === token) endTurn();
  }, 650);
}

function endTurn() {
  if (over) return;
  if (mode === 'solo') {
    turnStart = scores[0];
    dartsLeft = 3;
    markers = [];
    statusEl.textContent = `Next visit. ${scores[0]} left.`;
  } else {
    turn = 1 - turn;
    turnStart = scores[turn];
    dartsLeft = 3;
    markers = [];
    statusEl.textContent = `${NAMES[turn]} to throw. ${scores[turn]} left.`;
  }
  updateHud();
  draw();
}

function wedge(start, end, inner, outer, fill) {
  ctx.beginPath();
  ctx.arc(C, C, outer, start, end);
  ctx.arc(C, C, inner, end, start, true);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawBoard() {
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#1b2231';
  ctx.beginPath();
  ctx.arc(C, C, R + 20, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,249,240,.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(C, C, R + 15, 0, TAU);
  ctx.stroke();

  const sector = Math.PI / 10;
  for (let i = 0; i < 20; i += 1) {
    const center = -Math.PI / 2 + i * sector;
    const start = center - sector / 2;
    const end = center + sector / 2;
    const dark = i % 2 === 1;
    wedge(start, end, R * 0.16, R, dark ? '#2a3040' : '#f4e3c2');
    wedge(start, end, R * 0.56, R * 0.62, dark ? '#ff6b5a' : '#21b6a8');
    wedge(start, end, R * 0.95, R, dark ? '#21b6a8' : '#ff6b5a');

    ctx.strokeStyle = 'rgba(30,36,51,.32)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(C + Math.cos(start) * R * 0.16, C + Math.sin(start) * R * 0.16);
    ctx.lineTo(C + Math.cos(start) * R, C + Math.sin(start) * R);
    ctx.stroke();

    const nx = C + Math.cos(center) * (R + 11);
    const ny = C + Math.sin(center) * (R + 11);
    ctx.fillStyle = '#fff9f0';
    ctx.font = `800 ${SIZE * 0.032}px ui-rounded, "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(SECTORS[i]), nx, ny);
  }

  ctx.beginPath();
  ctx.arc(C, C, R * 0.16, 0, TAU);
  ctx.fillStyle = '#21b6a8';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(C, C, R * 0.06, 0, TAU);
  ctx.fillStyle = '#ff6b5a';
  ctx.fill();
  ctx.strokeStyle = '#1e2433';
  ctx.lineWidth = 2;
  ctx.stroke();

  for (const marker of markers) {
    ctx.save();
    ctx.strokeStyle = marker.player === 0 ? '#ff6b5a' : '#21b6a8';
    ctx.fillStyle = '#fff9f0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, 6, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  if (crosshair) {
    ctx.strokeStyle = 'rgba(255,249,240,.7)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(crosshair.x - 14, crosshair.y);
    ctx.lineTo(crosshair.x + 14, crosshair.y);
    ctx.moveTo(crosshair.x, crosshair.y - 14);
    ctx.lineTo(crosshair.x, crosshair.y + 14);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function draw() {
  ctx.setTransform(view.dpr * view.scale, 0, 0, view.dpr * view.scale, 0, 0);
  drawBoard();
}

function pointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / rect.width * SIZE,
    y: (event.clientY - rect.top) / rect.height * SIZE
  };
}

canvas.addEventListener('pointerdown', (event) => {
  if (event.button !== undefined && event.button !== 0) return;
  event.preventDefault();
  const p = pointFromEvent(event);
  throwDart(p.x, p.y);
  if (navigator.vibrate) navigator.vibrate(8);
});

canvas.addEventListener('pointermove', (event) => {
  if (event.pointerType === 'touch') return;
  crosshair = pointFromEvent(event);
  draw();
});
canvas.addEventListener('pointerleave', () => {
  crosshair = null;
  draw();
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

new ResizeObserver(resize).observe(boardWrap);
window.addEventListener('resize', resize);

newGame();
resize();
