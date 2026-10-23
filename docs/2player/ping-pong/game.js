import { softRefresh } from '../../shared/refresh.js';

const $ = (id) => document.getElementById(id);

const app = document.querySelector('.app');
const court = $('court');
const canvas = $('court-canvas');
const ctx = canvas.getContext('2d');
const callout = $('serve');
const calloutText = $('serve-text');
const veil = $('veil');
const veilTitle = $('veil-title');
const veilCopy = $('veil-copy');
const statusEl = $('status');
const hud = $('hud');
const rallyEl = $('rally');
const scoreP1 = $('score-p1');
const scoreP2 = $('score-p2');
const cardP1 = $('card-p1');
const cardP2 = $('card-p2');

const TARGET = 7;
const STEP = 1 / 120;
const SERVE_TIME = 1.65;
const SERVE_TICK = 0.55;
const MAX_ANGLE = 0.92;
const TAU = Math.PI * 2;

let W = 0;
let H = 0;
let base = 330;
let state = 'serve';
let scores = { p1: 0, p2: 0 };
let server = 1;
let rally = 0;
let bestRally = 0;
let serveTimer = SERVE_TIME;
let serveCount = 3;
let calloutTimer = 0;
let ball = { x: 0, y: 0, vx: 0, vy: 0, r: 7, speed: 0, spin: 0 };
let left = { x: 0, cy: 0, w: 10, h: 90, flash: 0 };
let right = { x: 0, cy: 0, w: 10, h: 90, flash: 0 };
let trail = [];
let trailClock = 0;
let particles = [];
let keys = new Set();
let pointers = new Map();
let raf = 0;
let lastTime = 0;
let accumulator = 0;
let hidden = document.hidden;
let reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

let courtGrad = null;
let glowLeft = null;
let glowRight = null;
let vignette = null;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function paddleHeight() {
  return Math.min(clamp(H * 0.19, 40, 122), Math.max(28, H - 24));
}

function paddleWidth() {
  return clamp(Math.min(W, H) * 0.03, 9, 15);
}

function ballRadius() {
  return clamp(Math.min(W, H) * 0.024, 5.5, 9.5);
}

function sideInset() {
  return clamp(W * 0.05, 10, 22);
}

function baseSpeed() {
  return clamp(Math.hypot(W, H) * 0.5, 260, 620);
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

function buildGradients() {
  courtGrad = ctx.createLinearGradient(0, 0, W, H);
  courtGrad.addColorStop(0, '#1a4d56');
  courtGrad.addColorStop(0.55, '#123a42');
  courtGrad.addColorStop(1, '#0a252b');

  glowLeft = ctx.createRadialGradient(W * 0.12, H * 0.34, 0, W * 0.12, H * 0.34, Math.max(W, H) * 0.58);
  glowLeft.addColorStop(0, 'rgba(255, 107, 90, .17)');
  glowLeft.addColorStop(1, 'rgba(255, 107, 90, 0)');

  glowRight = ctx.createRadialGradient(W * 0.88, H * 0.66, 0, W * 0.88, H * 0.66, Math.max(W, H) * 0.58);
  glowRight.addColorStop(0, 'rgba(33, 182, 168, .18)');
  glowRight.addColorStop(1, 'rgba(33, 182, 168, 0)');

  vignette = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.78);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, .3)');
}

function clampPaddle(p) {
  const half = Math.min(p.h / 2, H / 2);
  const min = half + 3;
  const max = Math.max(min, H - half - 3);
  p.cy = clamp(p.cy, min, max);
}

function clampPaddles() {
  clampPaddle(left);
  clampPaddle(right);
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return;

  const oldW = W;
  const oldH = H;
  const oldBase = base || baseSpeed();
  const dpr = clamp(window.devicePixelRatio || 1, 1, 3);

  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  W = rect.width;
  H = rect.height;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  left.w = right.w = paddleWidth();
  left.h = right.h = paddleHeight();
  left.x = sideInset();
  right.x = W - sideInset() - right.w;
  ball.r = ballRadius();

  if (oldW > 0 && oldH > 0) {
    const sx = W / oldW;
    const sy = H / oldH;
    left.cy *= sy;
    right.cy *= sy;
    ball.x *= sx;
    ball.y *= sy;

    base = baseSpeed();
    const ratio = base / oldBase;
    ball.speed = Math.min(ball.speed * ratio, base * 2);
    ball.vx *= ratio;
    ball.vy *= ratio;
    ball.y = clamp(ball.y, ball.r, H - ball.r);
  } else {
    left.cy = H / 2;
    right.cy = H / 2;
    base = baseSpeed();
  }

  clampPaddles();
  if (state === 'serve') positionServeBall();
  buildGradients();
  render();
}

function positionServeBall() {
  ball.x = server === 1 ? W * 0.34 : W * 0.66;
  ball.y = H * 0.5;
}

function beginServe() {
  state = 'serve';
  serveTimer = SERVE_TIME;
  serveCount = 3;
  calloutTimer = 0;
  ball.vx = 0;
  ball.vy = 0;
  ball.speed = 0;
  ball.spin = 0;
  ball.r = ballRadius();
  trail = [];
  trailClock = 0;
  positionServeBall();
  showCallout('3', false);
  updateHud();
}

function startMatch() {
  if (!W || !H) resize();
  scores = { p1: 0, p2: 0 };
  server = 1;
  rally = 0;
  bestRally = 0;
  callout.hidden = true;
  veil.hidden = true;
  left.flash = 0;
  right.flash = 0;
  left.cy = H / 2;
  right.cy = H / 2;
  clampPaddles();
  beginServe();
  statusEl.textContent = 'New match. Player 1 serves. First to 7 wins.';
}

function updateHud() {
  scoreP1.textContent = String(scores.p1);
  scoreP2.textContent = String(scores.p2);
  rallyEl.textContent = String(rally);
  cardP1.classList.toggle('is-serving', state !== 'over' && server === 1);
  cardP2.classList.toggle('is-serving', state !== 'over' && server === 2);
  hud.setAttribute('aria-label', `Player 1: ${scores.p1}. Player 2: ${scores.p2}. Rally ${rally}.`);
}

function showCallout(text, go) {
  calloutText.textContent = text;
  callout.hidden = false;
  callout.classList.toggle('is-go', Boolean(go));
  callout.classList.remove('pop');
  void callout.offsetWidth;
  callout.classList.add('pop');
}

function hideCallout() {
  callout.hidden = true;
  calloutTimer = 0;
}

function launchServe() {
  state = 'play';
  base = baseSpeed();
  ball.speed = base;
  const angle = (Math.random() * 2 - 1) * 0.18;
  const dir = server === 1 ? 1 : -1;
  ball.vx = Math.cos(angle) * ball.speed * dir;
  ball.vy = Math.sin(angle) * ball.speed;
  ball.spin = 0;
  calloutTimer = 0.3;
  showCallout('Serve!', true);
}

function movePaddles(dt) {
  const speed = H * 1.12;
  let dy = 0;
  if (keys.has('w')) dy -= 1;
  if (keys.has('s')) dy += 1;
  left.cy += dy * speed * dt;

  dy = 0;
  if (keys.has('arrowup')) dy -= 1;
  if (keys.has('arrowdown')) dy += 1;
  right.cy += dy * speed * dt;

  clampPaddles();
  left.flash = Math.max(0, left.flash - dt * 3.4);
  right.flash = Math.max(0, right.flash - dt * 3.4);
}

function burst(x, y, count, color, force) {
  if (reduceMotion) return;
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * TAU;
    const speed = force * (0.3 + Math.random() * 0.9);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.34 + Math.random() * 0.26,
      max: 0.6,
      size: 1.4 + Math.random() * 2.2,
      color
    });
  }
  if (particles.length > 110) particles.splice(0, particles.length - 110);
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - dt * 3.2;
    p.vy = p.vy * (1 - dt * 3.2) + 190 * dt;
  }
}

function updateTrail(dt) {
  if (reduceMotion) return;
  trailClock += dt;
  if (trailClock < 0.018) return;
  trailClock = 0;
  trail.unshift({ x: ball.x, y: ball.y });
  if (trail.length > 9) trail.pop();
}

function paddleHit(paddle, side, prevX, prevY) {
  const r = ball.r;
  const dx = ball.x - prevX;
  if (side === 'left' ? dx >= 0 : dx <= 0) return false;

  const face = side === 'left' ? paddle.x + paddle.w : paddle.x;
  const target = side === 'left' ? face + r : face - r;
  const t = (target - prevX) / dx;
  if (t < 0 || t > 1) return false;

  const yAt = prevY + (ball.y - prevY) * t;
  const reach = paddle.h / 2 + r * 0.3;
  if (yAt < paddle.cy - reach || yAt > paddle.cy + reach) return false;

  const offset = clamp((yAt - paddle.cy) / (paddle.h / 2), -1, 1);
  const angle = offset * MAX_ANGLE;
  const dir = side === 'left' ? 1 : -1;

  ball.speed = Math.min(ball.speed * 1.055, base * 2);
  ball.x = target + dir * 0.6;
  ball.y = yAt;
  ball.vx = Math.cos(angle) * ball.speed * dir;
  ball.vy = Math.sin(angle) * ball.speed;

  paddle.flash = 1;
  rally += 1;
  if (rally > bestRally) bestRally = rally;
  burst(face, yAt, 8, side === 'left' ? '#ff8a78' : '#4fe0d0', 150);
  updateHud();
  return true;
}

function moveBall(dt) {
  const prevX = ball.x;
  const prevY = ball.y;

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.spin += (Math.abs(ball.vx) + Math.abs(ball.vy)) * dt * 0.018;

  const r = ball.r;
  if (ball.y - r < 0) {
    ball.y = r;
    ball.vy = Math.abs(ball.vy);
  } else if (ball.y + r > H) {
    ball.y = H - r;
    ball.vy = -Math.abs(ball.vy);
  }

  if (!paddleHit(left, 'left', prevX, prevY)) {
    paddleHit(right, 'right', prevX, prevY);
  }

  if (ball.x + r < 0) {
    scorePoint(2);
  } else if (ball.x - r > W) {
    scorePoint(1);
  }
}

function scorePoint(who) {
  if (state !== 'play') return;

  const key = who === 1 ? 'p1' : 'p2';
  state = 'serve';
  scores[key] += 1;
  if (rally > bestRally) bestRally = rally;
  rally = 0;
  ball.vx = 0;
  ball.vy = 0;
  ball.speed = 0;
  trail = [];
  trailClock = 0;

  burst(who === 1 ? W - 10 : 10, clamp(ball.y, 10, H - 10), 12, who === 1 ? '#ff8a78' : '#4fe0d0', 210);

  if (scores[key] >= TARGET) {
    winMatch(who);
    return;
  }

  const total = scores.p1 + scores.p2;
  if (total % 2 === 0) server = server === 1 ? 2 : 1;

  beginServe();
  statusEl.textContent = `Player ${who} scores. ${scores.p1} to ${scores.p2}. Player ${server} serves.`;
}

function winMatch(who) {
  state = 'over';
  hideCallout();
  ball.vx = 0;
  ball.vy = 0;
  ball.speed = 0;
  updateHud();

  veilTitle.textContent = `Player ${who} wins!`;
  veilCopy.textContent = `${scores.p1} – ${scores.p2} · longest rally ${bestRally}`;
  veil.hidden = false;
  statusEl.textContent = `Player ${who} wins the match, ${scores.p1} to ${scores.p2}. Longest rally ${bestRally}.`;
  requestAnimationFrame(() => {
    if (!veil.hidden) $('veil-primary').focus({ preventScroll: true });
  });
}

function update(dt) {
  if (calloutTimer > 0) {
    calloutTimer -= dt;
    if (calloutTimer <= 0) callout.hidden = true;
  }

  if (state === 'over') {
    updateParticles(dt);
    return;
  }

  movePaddles(dt);

  if (state === 'serve') {
    serveTimer -= dt;
    if (serveTimer <= 0) {
      launchServe();
    } else {
      const nextCount = Math.max(1, Math.ceil(serveTimer / SERVE_TICK));
      if (nextCount !== serveCount) {
        serveCount = nextCount;
        showCallout(String(serveCount), false);
      }
    }
    updateParticles(dt);
    return;
  }

  const travel = Math.hypot(ball.vx, ball.vy) * dt;
  const limit = Math.max(ball.r * 0.55, 1.5);
  const steps = clamp(Math.ceil(travel / limit), 1, 12);
  for (let i = 0; i < steps && state === 'play'; i += 1) {
    moveBall(dt / steps);
  }

  if (state === 'play') updateTrail(dt);
  updateParticles(dt);
}

/* ---------- rendering ---------- */

function drawNet() {
  const x = W / 2;
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 249, 240, .42)';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.setLineDash([6, 9]);
  ctx.beginPath();
  ctx.moveTo(x, 12);
  ctx.lineTo(x, H - 12);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(255, 249, 240, .62)';
  ctx.beginPath();
  ctx.arc(x, 11, 2.6, 0, TAU);
  ctx.arc(x, H - 11, 2.6, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawPaddle(paddle, side) {
  const x = paddle.x;
  const y = paddle.cy - paddle.h / 2;
  const w = paddle.w;
  const h = paddle.h;
  const coral = side === 'left';
  const glow = 0.22 + paddle.flash * 0.62;

  ctx.save();
  ctx.shadowColor = coral ? `rgba(255, 107, 90, ${glow})` : `rgba(33, 182, 168, ${glow})`;
  ctx.shadowBlur = 12 + paddle.flash * 24;
  ctx.shadowOffsetY = 3;

  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  if (coral) {
    grad.addColorStop(0, '#ff9d8b');
    grad.addColorStop(0.55, '#ff6b5a');
    grad.addColorStop(1, '#dd4a3b');
  } else {
    grad.addColorStop(0, '#61e8da');
    grad.addColorStop(0.55, '#21b6a8');
    grad.addColorStop(1, '#0e8178');
  }
  ctx.fillStyle = grad;
  roundRectPath(x, y, w, h, w / 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = 'rgba(255, 249, 240, .5)';
  ctx.lineWidth = 1.1;
  roundRectPath(x + 0.9, y + 0.9, w - 1.8, h - 1.8, (w - 1.8) / 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, .32)';
  roundRectPath(x + w * 0.28, y + 4, w * 0.18, Math.max(4, h - 8), w * 0.09);
  ctx.fill();
}

function drawTrail() {
  if (reduceMotion || !trail.length) return;
  ctx.save();
  for (let i = 0; i < trail.length; i += 1) {
    const t = trail[i];
    const ratio = i / trail.length;
    ctx.globalAlpha = (1 - ratio) * 0.22;
    ctx.fillStyle = '#ffe0a3';
    ctx.beginPath();
    ctx.arc(t.x, t.y, ball.r * (0.35 + (1 - ratio) * 0.55), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawBall() {
  const g = ctx.createRadialGradient(
    ball.x - ball.r * 0.35,
    ball.y - ball.r * 0.4,
    ball.r * 0.12,
    ball.x,
    ball.y,
    ball.r
  );
  g.addColorStop(0, '#fffdf6');
  g.addColorStop(0.55, '#ffe6a8');
  g.addColorStop(1, '#ffb703');

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, .4)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.rotate(ball.spin);
  ctx.strokeStyle = 'rgba(255, 107, 90, .5)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, ball.r * 0.52, -0.9, 0.9);
  ctx.stroke();
  ctx.restore();
}

function drawParticles() {
  ctx.save();
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max) * 0.85;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function render() {
  if (!W || !H || !courtGrad) return;

  ctx.fillStyle = courtGrad;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = glowLeft;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = glowRight;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.045;
  ctx.fillStyle = '#fff9f0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.min(H * 0.42, W * 0.34)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
  ctx.fillText(String(scores.p1), W * 0.27, H * 0.52);
  ctx.fillText(String(scores.p2), W * 0.73, H * 0.52);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 249, 240, .15)';
  ctx.lineWidth = 1.4;
  roundRectPath(8, 8, W - 16, H - 16, 14);
  ctx.stroke();
  ctx.restore();

  drawNet();
  drawTrail();
  drawPaddle(left, 'left');
  drawPaddle(right, 'right');
  drawBall();
  drawParticles();

  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}

/* ---------- loop ---------- */

function frame(now) {
  raf = 0;
  if (hidden) return;

  if (!lastTime) lastTime = now;
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  if (dt > 0.25) dt = 0.25;

  accumulator += dt;
  let guard = 0;
  while (accumulator >= STEP && guard < 420) {
    update(STEP);
    accumulator -= STEP;
    guard += 1;
  }
  if (guard >= 420) accumulator = 0;

  render();
  raf = requestAnimationFrame(frame);
}

function stopLoop() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  lastTime = 0;
  accumulator = 0;
  keys.clear();
  pointers.clear();
}

function startLoop() {
  if (hidden || raf) return;
  lastTime = 0;
  accumulator = 0;
  raf = requestAnimationFrame(frame);
}

/* ---------- input ---------- */

function moveSideTo(side, clientY) {
  const rect = canvas.getBoundingClientRect();
  const paddle = side === 'left' ? left : right;
  paddle.cy = clamp(clientY - rect.top, paddle.h / 2 + 3, H - paddle.h / 2 - 3);
}

canvas.addEventListener('pointerdown', (event) => {
  if (state === 'over') return;
  const rect = canvas.getBoundingClientRect();
  const side = event.clientX - rect.left < rect.width / 2 ? 'left' : 'right';
  pointers.set(event.pointerId, side);
  try {
    canvas.setPointerCapture(event.pointerId);
  } catch {
    /* capture is optional */
  }
  moveSideTo(side, event.clientY);
  canvas.focus({ preventScroll: true });
  event.preventDefault();
});

canvas.addEventListener('pointermove', (event) => {
  const side = pointers.get(event.pointerId);
  if (!side) return;
  moveSideTo(side, event.clientY);
  event.preventDefault();
});

function endPointer(event) {
  pointers.delete(event.pointerId);
}

canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('lostpointercapture', endPointer);

window.addEventListener('keydown', (event) => {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
  const key = event.key.toLowerCase();
  if (key === 'w' || key === 's' || key === 'arrowup' || key === 'arrowdown') {
    event.preventDefault();
    keys.add(key);
  }
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.key.toLowerCase());
});

window.addEventListener('blur', () => {
  keys.clear();
  pointers.clear();
});

/* ---------- lifecycle ---------- */

function onVisibilityChange() {
  hidden = document.hidden;
  if (hidden) {
    stopLoop();
    if (state !== 'over') statusEl.textContent = 'Game paused.';
  } else {
    startLoop();
    if (state !== 'over') {
      statusEl.textContent = `Game resumed. Player 1 ${scores.p1}, Player 2 ${scores.p2}.`;
    }
  }
}

function requestMatch(target, focusCourt) {
  softRefresh(target, () => {
    startMatch();
    if (focusCourt) canvas.focus({ preventScroll: true });
  });
}

$('reset').addEventListener('click', () => requestMatch(court, false));
$('new-match').addEventListener('click', () => requestMatch(court, false));
$('veil-primary').addEventListener('click', () => requestMatch(court, true));
$('veil-reset').addEventListener('click', () => requestMatch(app, true));

document.addEventListener('visibilitychange', onVisibilityChange);

const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
if (motionQuery) {
  const onMotion = (event) => {
    reduceMotion = event.matches;
    if (reduceMotion) {
      trail = [];
      particles = [];
    }
  };
  if (motionQuery.addEventListener) motionQuery.addEventListener('change', onMotion);
  else if (motionQuery.addListener) motionQuery.addListener(onMotion);
}

window.addEventListener('resize', resize);

if (typeof ResizeObserver === 'function') {
  new ResizeObserver(resize).observe(canvas);
}

resize();
startMatch();
startLoop();
