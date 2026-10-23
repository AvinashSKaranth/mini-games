import { softRefresh } from '../../shared/refresh.js';

const $ = (id) => document.getElementById(id);
const canvas = $('course');
const ctx = canvas.getContext('2d');
const wrap = $('course-wrap');
const statusEl = $('status');
const veil = $('veil');
const turnPill = $('turn-pill');
const holeNum = $('hole-num');
const parEl = $('par');
const strokesEl = $('strokes');
const totalEl = $('total');
const modeButtons = [...document.querySelectorAll('.difficulty button')];

const W = 600;
const H = 400;
const BALL_R = 9;
const CUP_R = 14;
const STEP = 1 / 120;
const HOLES = [
  {
    tee: { x: 72, y: 200 }, cup: { x: 520, y: 200 }, par: 2,
    walls: [{ x: 250, y: 88, w: 58, h: 94 }, { x: 250, y: 258, w: 58, h: 94 }]
  },
  {
    tee: { x: 72, y: 200 }, cup: { x: 522, y: 96 }, par: 3,
    walls: [{ x: 218, y: 72, w: 52, h: 258 }, { x: 398, y: 238, w: 52, h: 98 }]
  },
  {
    tee: { x: 72, y: 320 }, cup: { x: 520, y: 78 }, par: 4,
    walls: [{ x: 178, y: 218, w: 202, h: 46 }, { x: 378, y: 58, w: 46, h: 178 }]
  }
];

let view = { dpr: 1, scale: 1 };
let mode = 'solo';
let holeIndex = 0;
let turn = 0;
let strokes = [0, 0];
let total = [0, 0];
let completed = [false, false];
let ball = { x: 0, y: 0, vx: 0, vy: 0 };
let phase = 'aim';
let drag = null;
let token = 0;
let accumulator = 0;
let lastTime = 0;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const hole = () => HOLES[holeIndex];

function newRound() {
  token += 1;
  holeIndex = 0;
  turn = 0;
  strokes = [0, 0];
  total = [0, 0];
  completed = [false, false];
  drag = null;
  accumulator = 0;
  lastTime = performance.now();
  veil.hidden = true;
  document.body.classList.toggle('is-solo', mode === 'solo');
  loadHole();
}

function loadHole() {
  const h = hole();
  ball = { x: h.tee.x, y: h.tee.y, vx: 0, vy: 0 };
  phase = 'aim';
  drag = null;
  completed = [false, false];
  strokes = [0, 0];
  turn = 0;
  updateHud();
  statusEl.textContent = `Hole ${holeIndex + 1}, par ${h.par}. ${mode === 'solo' ? 'Your turn.' : 'Player 1 starts.'}`;
  draw();
}

function updateHud() {
  const h = hole();
  holeNum.textContent = `${holeIndex + 1} / 3`;
  parEl.textContent = String(h.par);
  strokesEl.textContent = String(strokes[turn]);
  totalEl.textContent = String(total[turn]);
  $('label-strokes').textContent = mode === 'solo' ? 'Strokes' : `P${turn + 1} strokes`;
  turnPill.textContent = mode === 'solo'
    ? `Hole ${holeIndex + 1} · par ${h.par}`
    : `Hole ${holeIndex + 1} · P${turn + 1} · par ${h.par}`;
}

function shoot(dir, power) {
  if (phase !== 'aim') return;
  strokes[turn] += 1;
  const speed = 130 + power * 520;
  ball.vx = dir.x * speed;
  ball.vy = dir.y * speed;
  phase = 'rolling';
  drag = null;
  updateHud();
  statusEl.textContent = `Putt ${strokes[turn]} away.`;
}

function finishHole() {
  phase = 'holed';
  completed[turn] = true;
  total[turn] += strokes[turn];
  const name = mode === 'solo' ? 'You' : `Player ${turn + 1}`;
  statusEl.textContent = `${name} holed out in ${strokes[turn]} stroke${strokes[turn] === 1 ? '' : 's'}.`;
  const myToken = token;

  window.setTimeout(() => {
    if (myToken !== token) return;
    if (mode === 'duo' && !completed[1 - turn]) {
      turn = 1 - turn;
      ball = { x: hole().tee.x, y: hole().tee.y, vx: 0, vy: 0 };
      strokes[turn] = 0;
      phase = 'aim';
      updateHud();
      statusEl.textContent = `Player ${turn + 1} plays hole ${holeIndex + 1}.`;
      draw();
      return;
    }
    nextHole();
  }, 850);
}

function nextHole() {
  if (holeIndex >= HOLES.length - 1) {
    endRound();
    return;
  }
  holeIndex += 1;
  loadHole();
}

function endRound() {
  phase = 'over';
  const title = mode === 'solo'
    ? (total[0] <= 9 ? 'Sharp putting!' : 'Round complete')
    : total[0] === total[1] ? "It's a tie!" : total[0] < total[1] ? 'Player 1 wins!' : 'Player 2 wins!';
  $('veil-title').textContent = title;
  $('veil-copy').textContent = mode === 'solo'
    ? `${total[0]} strokes across three holes.`
    : `${total[0]} to ${total[1]} strokes.`;
  veil.hidden = false;
  statusEl.textContent = `${title} ${total[0]} to ${total[1]}.`;
  requestAnimationFrame(() => $('rematch').focus({ preventScroll: true }));
}

function collideRect(wall) {
  const nearestX = clamp(ball.x, wall.x, wall.x + wall.w);
  const nearestY = clamp(ball.y, wall.y, wall.y + wall.h);
  let dx = ball.x - nearestX;
  let dy = ball.y - nearestY;
  let dist = Math.hypot(dx, dy);
  if (dist >= BALL_R) return;
  if (dist < 0.001) {
    dx = 1;
    dy = 0;
    dist = 0.001;
  }
  const nx = dx / dist;
  const ny = dy / dist;
  ball.x = nearestX + nx * BALL_R;
  ball.y = nearestY + ny * BALL_R;
  const dot = ball.vx * nx + ball.vy * ny;
  if (dot < 0) {
    ball.vx -= 1.7 * dot * nx;
    ball.vy -= 1.7 * dot * ny;
    ball.vx *= 0.72;
    ball.vy *= 0.72;
  }
}

function physics(dt) {
  if (phase !== 'rolling') return;

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  const damp = Math.exp(-1.05 * dt);
  ball.vx *= damp;
  ball.vy *= damp;

  if (ball.x < 24 + BALL_R) { ball.x = 24 + BALL_R; ball.vx = Math.abs(ball.vx) * 0.72; }
  if (ball.x > W - 24 - BALL_R) { ball.x = W - 24 - BALL_R; ball.vx = -Math.abs(ball.vx) * 0.72; }
  if (ball.y < 24 + BALL_R) { ball.y = 24 + BALL_R; ball.vy = Math.abs(ball.vy) * 0.72; }
  if (ball.y > H - 24 - BALL_R) { ball.y = H - 24 - BALL_R; ball.vy = -Math.abs(ball.vy) * 0.72; }

  for (const wall of hole().walls) collideRect(wall);

  const cup = hole().cup;
  const cupDist = Math.hypot(ball.x - cup.x, ball.y - cup.y);
  const speed = Math.hypot(ball.vx, ball.vy);
  if (cupDist < CUP_R && speed < 300) {
    finishHole();
    return;
  }

  if (speed < 8) {
    ball.vx = 0;
    ball.vy = 0;
    if (cupDist < CUP_R) {
      finishHole();
      return;
    }
    phase = 'aim';
    statusEl.textContent = mode === 'solo'
      ? `Ball stopped. Putt ${strokes[turn] + 1}.`
      : `Player ${turn + 1}, ball stopped. Putt ${strokes[turn] + 1}.`;
    updateHud();
    draw();
  }
}

function roundRectPath(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function resize() {
  const rect = wrap.getBoundingClientRect();
  if (rect.width < 2) return;
  const dpr = Math.min(2.5, window.devicePixelRatio || 1);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  view = { dpr, scale: rect.width / W };
  draw();
}

function draw() {
  const h = hole();
  ctx.setTransform(view.dpr * view.scale, 0, 0, view.dpr * view.scale, 0, 0);
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = '#2e7651';
  ctx.fillRect(0, 0, W, H);
  roundRectPath(18, 18, W - 36, H - 36, 26);
  const grass = ctx.createLinearGradient(0, 0, W, H);
  grass.addColorStop(0, '#70cf98');
  grass.addColorStop(0.55, '#4dbb7c');
  grass.addColorStop(1, '#2f9d64');
  ctx.fillStyle = grass;
  ctx.fill();
  ctx.strokeStyle = 'rgba(18, 73, 48, .55)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,.08)';
  for (let y = 42; y < H - 30; y += 28) {
    for (let x = 42; x < W - 30; x += 28) {
      ctx.beginPath();
      ctx.arc(x, y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const wall of h.walls) {
    roundRectPath(wall.x, wall.y, wall.w, wall.h, 10);
    const wood = ctx.createLinearGradient(wall.x, wall.y, wall.x, wall.y + wall.h);
    wood.addColorStop(0, '#d7a06b');
    wood.addColorStop(1, '#9a6038');
    ctx.fillStyle = wood;
    ctx.fill();
    ctx.strokeStyle = 'rgba(58, 33, 19, .55)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(30, 36, 51, .18)';
  ctx.beginPath();
  ctx.ellipse(h.cup.x, h.cup.y + 2, CUP_R + 3, CUP_R, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#102d22';
  ctx.beginPath();
  ctx.ellipse(h.cup.x, h.cup.y, CUP_R, CUP_R * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.strokeStyle = '#1e2433';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(h.cup.x + 8, h.cup.y - 5);
  ctx.lineTo(h.cup.x + 8, h.cup.y - 54);
  ctx.stroke();
  ctx.fillStyle = '#ff6b5a';
  ctx.beginPath();
  ctx.moveTo(h.cup.x + 9, h.cup.y - 54);
  ctx.lineTo(h.cup.x + 36, h.cup.y - 45);
  ctx.lineTo(h.cup.x + 9, h.cup.y - 35);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,36,51,.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = 'rgba(30,36,51,.12)';
  ctx.beginPath();
  ctx.arc(h.tee.x, h.tee.y + 2, BALL_R + 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,249,240,.36)';
  ctx.beginPath();
  ctx.arc(h.tee.x, h.tee.y, BALL_R + 3, 0, Math.PI * 2);
  ctx.fill();

  if (drag && drag.moved) {
    const dx = drag.sx - drag.cx;
    const dy = drag.sy - drag.cy;
    const length = Math.hypot(dx, dy) || 1;
    const power = Math.min(1, length / 150);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,249,240,.85)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(ball.x + (dx / length) * (30 + power * 90), ball.y + (dy / length) * (30 + power * 90));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,183,3,.9)';
    ctx.beginPath();
    ctx.arc(ball.x + (dx / length) * (30 + power * 90), ball.y + (dy / length) * (30 + power * 90), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.28)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
  ctx.fillStyle = '#fffdf7';
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(30,36,51,.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  ctx.beginPath();
  ctx.arc(ball.x - 3, ball.y - 3, 2.4, 0, Math.PI * 2);
  ctx.fill();
}

function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden) {
    lastTime = now;
    return;
  }
  if (!lastTime) lastTime = now;
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  if (dt > 0.12) dt = 0.12;
  accumulator += dt;
  let steps = 0;
  while (accumulator >= STEP && steps < 12) {
    physics(STEP);
    accumulator -= STEP;
    steps += 1;
  }
  if (steps === 12) accumulator = 0;
  draw();
}

function toWorld(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / rect.width * W,
    y: (event.clientY - rect.top) / rect.height * H
  };
}

canvas.addEventListener('pointerdown', (event) => {
  if (phase !== 'aim' || event.button > 0) return;
  event.preventDefault();
  const p = toWorld(event);
  drag = { sx: p.x, sy: p.y, cx: p.x, cy: p.y, moved: false };
  try { canvas.setPointerCapture(event.pointerId); } catch { /* optional */ }
});

canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  event.preventDefault();
  const p = toWorld(event);
  drag.cx = p.x;
  drag.cy = p.y;
  drag.moved = Math.hypot(drag.sx - p.x, drag.sy - p.y) > 8;
  draw();
});

function endDrag(event) {
  if (!drag) return;
  const dx = drag.sx - drag.cx;
  const dy = drag.sy - drag.cy;
  const length = Math.hypot(dx, dy);
  const current = drag;
  drag = null;
  if (length > 14 && phase === 'aim') {
    shoot({ x: dx / length, y: dy / length }, Math.min(1, length / 150));
  } else {
    draw();
  }
}

canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', () => { drag = null; draw(); });

modeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.mode === mode) return;
    mode = button.dataset.mode;
    modeButtons.forEach((item) => item.classList.toggle('is-active', item === button));
    softRefresh(wrap, newRound);
  });
});

const requestNewRound = () => softRefresh(wrap, newRound);
$('reset').addEventListener('click', requestNewRound);
$('new-game').addEventListener('click', requestNewRound);
$('rematch').addEventListener('click', requestNewRound);

new ResizeObserver(resize).observe(wrap);
window.addEventListener('resize', resize);
newRound();
resize();
requestAnimationFrame(frame);
