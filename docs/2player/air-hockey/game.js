import { softRefresh } from '../../shared/refresh.js';

const $ = (id) => document.getElementById(id);
const canvas = $('rink');
const ctx = canvas.getContext('2d');
const wrap = $('rink-wrap');
const serveEl = $('serve');
const serveText = $('serve-text');
const statusEl = $('status');
const veil = $('veil');
const scoreEls = [$('score-1'), $('score-2')];
const cardEls = [$('card-1'), $('card-2')];

const W = 600;
const H = 360;
const GOAL = 148;
const MALLET_R = 25;
const PUCK_R = 13;
const TARGET = 7;
const STEP = 1 / 120;

let view = { scale: 1, ox: 0, oy: 0, dpr: 1 };
let scores = [0, 0];
let mallets = [];
let puck = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
let phase = 'serve';
let serveTimer = 1.2;
let serveDir = 1;
let pointers = new Map();
let keys = new Set();
let accumulator = 0;
let lastTime = 0;
let raf = 0;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function resetMallets() {
  mallets = [
    { x: W * 0.18, y: H / 2, px: W * 0.18, py: H / 2, vx: 0, vy: 0, side: 0 },
    { x: W * 0.82, y: H / 2, px: W * 0.82, py: H / 2, vx: 0, vy: 0, side: 1 }
  ];
}

function clampMallet(m) {
  m.y = clamp(m.y, MALLET_R + 4, H - MALLET_R - 4);
  if (m.side === 0) m.x = clamp(m.x, MALLET_R + 4, W / 2 - MALLET_R - 8);
  else m.x = clamp(m.x, W / 2 + MALLET_R + 8, W - MALLET_R - 4);
}

function startMatch() {
  scores = [0, 0];
  resetMallets();
  phase = 'serve';
  serveTimer = 1.2;
  serveDir = 1;
  accumulator = 0;
  lastTime = performance.now();
  pointers.clear();
  keys.clear();
  puck = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
  serveEl.hidden = false;
  serveText.textContent = 'READY';
  veil.hidden = true;
  updateHud();
  statusEl.textContent = 'New match. First to 7. Drag your mallet to defend your goal.';
  draw();
}

function updateHud() {
  scoreEls.forEach((el, i) => { el.textContent = String(scores[i]); });
  cardEls.forEach((el, i) => el.classList.toggle('is-active', phase !== 'over' && phase !== 'serve' && i === (serveDir > 0 ? 0 : 1)));
}

function beginServe(dir) {
  phase = 'serve';
  serveTimer = 1.05;
  serveDir = dir;
  puck = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
  serveEl.hidden = false;
  serveText.textContent = 'GO';
  updateHud();
}

function launchPuck() {
  phase = 'play';
  serveEl.hidden = true;
  const angle = (Math.random() * 2 - 1) * 0.28;
  const speed = 420;
  puck.vx = Math.cos(angle) * speed * serveDir;
  puck.vy = Math.sin(angle) * speed;
  statusEl.textContent = 'Live puck.';
  updateHud();
}

function scorePoint(player) {
  scores[player] += 1;
  updateHud();
  if (scores[player] >= TARGET) {
    phase = 'over';
    veil.hidden = false;
    $('veil-title').textContent = `Player ${player + 1} wins!`;
    $('veil-copy').textContent = `${scores[0]} - ${scores[1]}. The rink is yours.`;
    statusEl.textContent = `Player ${player + 1} wins ${scores[0]} to ${scores[1]}.`;
    requestAnimationFrame(() => $('rematch').focus({ preventScroll: true }));
    return;
  }
  statusEl.textContent = `Player ${player + 1} scores. ${scores[0]} to ${scores[1]}.`;
  beginServe(player === 0 ? 1 : -1);
}

function collidePuck(m) {
  const dx = puck.x - m.x;
  const dy = puck.y - m.y;
  const min = MALLET_R + PUCK_R;
  const dist = Math.hypot(dx, dy);
  if (dist >= min || dist < 0.001) return;

  const nx = dx / dist;
  const ny = dy / dist;
  puck.x = m.x + nx * min;
  puck.y = m.y + ny * min;
  const malletSpeed = Math.hypot(m.vx, m.vy);
  const incoming = puck.vx * nx + puck.vy * ny;
  const push = Math.max(260, Math.min(900, malletSpeed * 1.4 + 220));
  puck.vx = nx * push + m.vx * 0.28;
  puck.vy = ny * push + m.vy * 0.28;
  if (incoming < -push) {
    puck.vx = nx * push;
    puck.vy = ny * push;
  }
}

function physics(dt) {
  keyboardMallets();
  for (const m of mallets) {
    m.vx = (m.x - m.px) / dt;
    m.vy = (m.y - m.py) / dt;
    m.px = m.x;
    m.py = m.y;
    clampMallet(m);
  }

  if (phase === 'serve') {
    serveTimer -= dt;
    if (serveTimer <= 0) launchPuck();
    return;
  }
  if (phase !== 'play') return;

  puck.x += puck.vx * dt;
  puck.y += puck.vy * dt;
  puck.vx *= Math.exp(-0.35 * dt);
  puck.vy *= Math.exp(-0.35 * dt);

  if (puck.y < PUCK_R) {
    puck.y = PUCK_R;
    puck.vy = Math.abs(puck.vy) * 0.94;
  } else if (puck.y > H - PUCK_R) {
    puck.y = H - PUCK_R;
    puck.vy = -Math.abs(puck.vy) * 0.94;
  }

  const inMouth = Math.abs(puck.y - H / 2) < GOAL / 2;
  if (puck.x < PUCK_R && inMouth) {
    scorePoint(1);
    return;
  }
  if (puck.x > W - PUCK_R && inMouth) {
    scorePoint(0);
    return;
  }

  if (puck.x < PUCK_R) {
    puck.x = PUCK_R;
    puck.vx = Math.abs(puck.vx) * 0.94;
  } else if (puck.x > W - PUCK_R) {
    puck.x = W - PUCK_R;
    puck.vx = -Math.abs(puck.vx) * 0.94;
  }

  for (const m of mallets) collidePuck(m);
}

function resize() {
  const rect = wrap.getBoundingClientRect();
  if (rect.width < 2) return;
  const dpr = Math.min(2.5, window.devicePixelRatio || 1);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  view.dpr = dpr;
  view.scale = Math.min(rect.width / W, rect.height / H);
  view.ox = (rect.width - W * view.scale) / 2;
  view.oy = (rect.height - H * view.scale) / 2;
  draw();
}

function toWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left - view.ox) / view.scale,
    y: (clientY - rect.top - view.oy) / view.scale
  };
}

function moveMallet(player, x, y) {
  const m = mallets[player];
  if (!m) return;
  m.x = x;
  m.y = y;
  clampMallet(m);
}

function drawRink() {
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#2b718c');
  bg.addColorStop(0.55, '#1c5b74');
  bg.addColorStop(1, '#123f55');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(255,255,255,.2)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 62, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 7, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,.09)';
  ctx.lineWidth = 1;
  for (let x = 40; x < W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  for (const side of [0, 1]) {
    const x = side === 0 ? 0 : W;
    const y = H / 2 - GOAL / 2;
    ctx.fillStyle = 'rgba(8, 24, 34, .72)';
    ctx.fillRect(side === 0 ? 0 : W - 8, y, 8, GOAL);
    ctx.strokeStyle = side === 0 ? '#ff6b5a' : '#21b6a8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(side === 0 ? 2 : W - 2, y);
    ctx.lineTo(side === 0 ? 2 : W - 2, y + GOAL);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255,249,240,.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(W * 0.18, H / 2, 43, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(W * 0.82, H / 2, 43, 0, Math.PI * 2);
  ctx.stroke();
}

function drawMallet(m, index) {
  const color = index === 0 ? '#ff6b5a' : '#21b6a8';
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.3)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.arc(m.x, m.y, MALLET_R, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(m.x, m.y, MALLET_R * 0.62, 0, Math.PI * 2);
  ctx.fillStyle = '#fff9f0';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(m.x - 5, m.y - 7, 7, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.fill();
}

function draw() {
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.clearRect(0, 0, canvas.width / view.dpr, canvas.height / view.dpr);
  ctx.save();
  ctx.translate(view.ox, view.oy);
  ctx.scale(view.scale, view.scale);

  drawRink();
  drawMallet(mallets[0], 0);
  drawMallet(mallets[1], 1);

  ctx.save();
  ctx.shadowColor = 'rgba(255, 183, 3, .75)';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(puck.x, puck.y, PUCK_R, 0, Math.PI * 2);
  ctx.fillStyle = '#fff9f0';
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(puck.x, puck.y, PUCK_R * 0.48, 0, Math.PI * 2);
  ctx.fillStyle = '#ffb703';
  ctx.fill();

  ctx.restore();
}

function frame(now) {
  raf = requestAnimationFrame(frame);
  if (document.hidden) {
    lastTime = now;
    return;
  }
  if (!lastTime) lastTime = now;
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  if (dt > 0.15) dt = 0.15;

  accumulator += dt;
  let steps = 0;
  while (accumulator >= STEP && steps < 16) {
    physics(STEP);
    accumulator -= STEP;
    steps += 1;
  }
  if (steps === 16) accumulator = 0;
  draw();
}

canvas.addEventListener('pointerdown', (event) => {
  if (phase === 'over') return;
  event.preventDefault();
  const p = toWorld(event.clientX, event.clientY);
  const side = p.x < W / 2 ? 0 : 1;
  pointers.set(event.pointerId, side);
  try { canvas.setPointerCapture(event.pointerId); } catch { /* optional */ }
  moveMallet(side, p.x, p.y);
  canvas.focus({ preventScroll: true });
});

canvas.addEventListener('pointermove', (event) => {
  const side = pointers.get(event.pointerId);
  if (side === undefined) return;
  event.preventDefault();
  const p = toWorld(event.clientX, event.clientY);
  moveMallet(side, p.x, p.y);
});

function endPointer(event) {
  pointers.delete(event.pointerId);
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('lostpointercapture', endPointer);

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (['w', 's', 'arrowup', 'arrowdown'].includes(key)) {
    event.preventDefault();
    keys.add(key);
  }
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); pointers.clear(); });

function keyboardMallets() {
  const speed = 460 / 120;
  if (keys.has('w')) mallets[0].y -= speed;
  if (keys.has('s')) mallets[0].y += speed;
  if (keys.has('arrowup')) mallets[1].y -= speed;
  if (keys.has('arrowdown')) mallets[1].y += speed;
}

const requestMatch = (target) => softRefresh(target, startMatch);
$('reset').addEventListener('click', () => requestMatch(wrap));
$('new-match').addEventListener('click', () => requestMatch(wrap));
$('rematch').addEventListener('click', () => requestMatch(wrap));

new ResizeObserver(resize).observe(wrap);
window.addEventListener('resize', resize);

startMatch();
resize();
raf = requestAnimationFrame(frame);
