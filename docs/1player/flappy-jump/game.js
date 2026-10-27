import { softRefresh } from '../../shared/refresh.js';
import {
  applyFlap,
  hitsGround,
  hitsPipe,
  nextGapY,
  scoreFrom,
  speedAt,
  stepVertical
} from './engine.js';

const $ = (id) => document.getElementById(id);
const BEST_KEY = 'mini-games:flappy-jump:best';

const stageWrap = $('stage-wrap');
const canvas = $('stage');
const ctx = canvas.getContext('2d');
const scoreEl = $('score');
const bestEl = $('best');
const speedEl = $('speed');
const readyEl = $('ready');
const statusEl = $('status');
const veil = $('veil');
const veilCopy = $('veil-copy');
const veilStats = $('veil-stats');
const veilPrimary = $('veil-primary');

let phase = 'ready'; // 'ready' | 'playing' | 'over'
let bird = { x: 0, y: 0, vy: 0, r: 14 };
let pipes = [];
let particles = [];
let distance = 0;
let score = 0;
let flaps = 0;
let best = loadBest();
let token = 0;
let rafId = null;
let lastFrame = 0;
let running = false;
let readyClock = 0;

let w = 0;
let h = 0;
let dpr = 1;
let groundY = 0;
let pipeW = 54;
let gapH = 150;
let spacing = 260;

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function loadBest() {
  try {
    const value = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function saveBest() {
  try {
    localStorage.setItem(BEST_KEY, String(best));
  } catch {
    /* storage is optional */
  }
}

const rr = (x, y, width, height, radius) => {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, Math.max(0, radius));
    return;
  }
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
};

/* ---------- sizing ---------- */

function resize() {
  const rect = canvas.getBoundingClientRect();
  const cssW = Math.max(1, Math.round(rect.width));
  const cssH = Math.max(1, Math.round(rect.height));
  const nextDpr = Math.min(window.devicePixelRatio || 1, 2.5);
  if (cssW === w && cssH === h && nextDpr === dpr) return;

  w = cssW;
  h = cssH;
  dpr = nextDpr;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  groundY = h - Math.max(22, h * 0.06);
  pipeW = Math.max(44, Math.min(64, w * 0.14));
  gapH = Math.max(112, Math.min(190, h * 0.3));
  spacing = Math.max(200, w * 0.66);
  bird.x = w * 0.3;
  bird.r = Math.max(9, Math.min(16, h * 0.024));

  const minCenter = gapH / 2 + 26;
  const maxCenter = Math.max(minCenter, groundY - gapH / 2 - 26);
  for (const pipe of pipes) {
    pipe.gapY = Math.max(minCenter, Math.min(maxCenter, pipe.gapY));
  }
}

/* ---------- flow ---------- */

function updateMeta() {
  scoreEl.textContent = String(score);
  bestEl.textContent = best ? String(best) : '—';
  speedEl.textContent = String(Math.round(speedAt(distance)));
}

function spawnPipe() {
  const minCenter = gapH / 2 + 26;
  const maxCenter = Math.max(minCenter, groundY - gapH / 2 - 26);
  const previous = pipes.length ? pipes[pipes.length - 1].gapY : h * 0.45;
  const gapY = nextGapY(previous, Math.random, minCenter, maxCenter, Math.max(70, h * 0.22));
  pipes.push({ x: w + 12, gapY });
}

function resetFlight() {
  token += 1;
  phase = 'ready';
  bird = { x: w * 0.3, y: h * 0.42, vy: 0, r: bird.r || 14 };
  pipes = [];
  particles = [];
  distance = 0;
  score = 0;
  flaps = 0;
  readyClock = 0;
  veil.hidden = true;
  readyEl.hidden = false;
  updateMeta();
  statusEl.textContent = 'Ready. Tap to fly.';
}

function beginFlight() {
  phase = 'playing';
  readyEl.hidden = true;
  spawnPipe();
  flap();
}

function flap() {
  bird.vy = applyFlap();
  flaps += 1;
  if (!reduced()) {
    for (let i = 0; i < 4; i += 1) {
      particles.push({
        x: bird.x - bird.r,
        y: bird.y + (Math.random() - 0.5) * bird.r,
        vx: -40 - Math.random() * 50,
        vy: (Math.random() - 0.5) * 60,
        life: 0.4,
        max: 0.4
      });
    }
  }
}

function die() {
  if (phase === 'over') return;
  phase = 'over';
  bird.vy = -170;
  const myToken = token;
  window.setTimeout(() => finish(myToken), reduced() ? 200 : 700);
  statusEl.textContent = `Flight over at ${score}.`;
}

function finish(myToken) {
  if (myToken !== token) return;
  const isBest = score > best;
  if (isBest) {
    best = score;
    saveBest();
  }
  updateMeta();

  veilCopy.textContent = isBest
    ? `You flew ${score} — a new best.`
    : `You flew ${score}. Best is ${best}.`;

  veilStats.replaceChildren();
  for (const [term, value] of [
    ['Score', score],
    ['Best', best],
    ['Flaps', flaps]
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
  veilPrimary.focus({ preventScroll: true });
  statusEl.textContent = `Flight over. Score ${score}, best ${best}.`;
}

/* ---------- loop ---------- */

function update(dt) {
  if (phase === 'ready') {
    readyClock += dt;
    bird.y = h * 0.42 + Math.sin(readyClock * 3) * 7;
    bird.vy = 0;
    return;
  }

  if (phase === 'playing') {
    const step = stepVertical(bird.y, bird.vy, dt);
    bird.y = step.y;
    bird.vy = step.vy;
    if (bird.y - bird.r < 0) {
      bird.y = bird.r;
      bird.vy = 0;
    }

    const speed = speedAt(distance);
    distance += speed * dt;

    for (const pipe of pipes) pipe.x -= speed * dt;
    while (pipes.length && pipes[0].x + pipeW < -20) pipes.shift();
    const last = pipes[pipes.length - 1];
    if (!last || last.x < w - spacing) spawnPipe();

    for (const pipe of pipes) {
      if (hitsPipe(bird, { x: pipe.x, w: pipeW }, { y: pipe.gapY - gapH / 2, h: gapH })) {
        die();
        break;
      }
    }
    if (phase === 'playing' && hitsGround(bird, groundY)) {
      bird.y = groundY - bird.r;
      die();
    }

    const next = scoreFrom(distance);
    if (next !== score) {
      score = next;
      updateMeta();
    }
  } else if (phase === 'over') {
    const step = stepVertical(bird.y, bird.vy, dt);
    bird.y = step.y;
    bird.vy = step.vy;
    if (bird.y + bird.r > groundY) {
      bird.y = groundY - bird.r;
      bird.vy = 0;
    }
  }

  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const p = particles[index];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(index, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#cfeaff');
  sky.addColorStop(0.65, '#eaf6ff');
  sky.addColorStop(1, '#f6fbff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, .8)';
  const drift = (distance * 0.15) % (w + 160);
  for (const [cx, cy, cr] of [[w - 70 - drift * 0.3, h * 0.16, 26], [w * 0.4 - drift * 0.2, h * 0.1, 18], [w * 0.8 - drift * 0.25, h * 0.28, 22]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.arc(cx + cr, cy + 6, cr * 0.8, 0, Math.PI * 2);
    ctx.arc(cx - cr, cy + 7, cr * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // distant hills
  ctx.save();
  ctx.fillStyle = 'rgba(120, 184, 65, .22)';
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  const shift = (distance * 0.4) % 240;
  for (let x = -240; x <= w + 240; x += 240) {
    ctx.quadraticCurveTo(x + 120 - shift, groundY - 70, x + 240 - shift, groundY);
  }
  ctx.lineTo(w, groundY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPipes() {
  for (const pipe of pipes) {
    const gapTop = pipe.gapY - gapH / 2;
    const gapBottom = pipe.gapY + gapH / 2;

    const body = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipeW, 0);
    body.addColorStop(0, '#3ad4c4');
    body.addColorStop(0.55, '#21b6a8');
    body.addColorStop(1, '#149a8f');

    ctx.fillStyle = body;
    rr(pipe.x, -6, pipeW, gapTop + 6, 8);
    ctx.fill();
    rr(pipe.x, gapBottom, pipeW, groundY - gapBottom + 6, 8);
    ctx.fill();

    ctx.fillStyle = '#17a294';
    rr(pipe.x - 6, gapTop - 16, pipeW + 12, 16, 5);
    ctx.fill();
    rr(pipe.x - 6, gapBottom, pipeW + 12, 16, 5);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, .35)';
    rr(pipe.x + 6, 0, 7, Math.max(0, gapTop - 16), 4);
    ctx.fill();
    rr(pipe.x + 6, gapBottom + 16, 7, Math.max(0, groundY - gapBottom - 16), 4);
    ctx.fill();
  }
}

function drawGround() {
  ctx.fillStyle = '#e2892b';
  ctx.fillRect(0, groundY, w, h - groundY);
  ctx.fillStyle = '#78b841';
  ctx.fillRect(0, groundY, w, Math.max(6, h * 0.014));
  ctx.fillStyle = 'rgba(30, 36, 51, .18)';
  ctx.fillRect(0, groundY + Math.max(6, h * 0.014), w, 2);

  const shift = distance % 48;
  ctx.fillStyle = 'rgba(30, 36, 51, .12)';
  for (let x = -48; x < w + 48; x += 48) {
    ctx.fillRect(x - shift, groundY + 12, 18, 3);
  }
}

function drawBird() {
  const angle = phase === 'ready' ? 0 : Math.max(-0.5, Math.min(1.1, bird.vy / 520));

  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#1e2433';
  ctx.beginPath();
  ctx.ellipse(bird.x, groundY + 4, bird.r * 1.1, bird.r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(angle);

  const grad = ctx.createLinearGradient(0, -bird.r, 0, bird.r);
  grad.addColorStop(0, '#ff8a7b');
  grad.addColorStop(1, '#ff6b5a');
  ctx.beginPath();
  ctx.arc(0, 0, bird.r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = Math.max(1.6, bird.r * 0.16);
  ctx.strokeStyle = 'rgba(30, 36, 51, .3)';
  ctx.stroke();

  // wing
  ctx.beginPath();
  const wingY = Math.sin(readyClock * 12 + distance * 0.05) * bird.r * 0.22;
  ctx.ellipse(-bird.r * 0.25, bird.r * 0.2 + wingY, bird.r * 0.5, bird.r * 0.3, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd9d2';
  ctx.fill();

  // eye
  ctx.beginPath();
  ctx.arc(bird.r * 0.4, -bird.r * 0.3, bird.r * 0.34, 0, Math.PI * 2);
  ctx.fillStyle = '#fffdf8';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bird.r * 0.5, -bird.r * 0.3, bird.r * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = '#1e2433';
  ctx.fill();

  // beak
  ctx.beginPath();
  ctx.moveTo(bird.r * 0.7, -bird.r * 0.05);
  ctx.lineTo(bird.r * 1.5, bird.r * 0.18);
  ctx.lineTo(bird.r * 0.7, bird.r * 0.45);
  ctx.closePath();
  ctx.fillStyle = '#ffb703';
  ctx.fill();
  ctx.strokeStyle = 'rgba(30, 36, 51, .3)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.restore();
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max) * 0.7;
    ctx.fillStyle = '#ff6b5a';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawScore() {
  if (phase !== 'playing') return;
  ctx.save();
  ctx.font = `900 ${Math.round(Math.max(34, h * 0.08))}px ui-rounded, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(30, 36, 51, .82)';
  ctx.fillText(String(score), w / 2, Math.max(52, h * 0.12));
  ctx.restore();
}

function draw() {
  if (!w || !h) return;
  ctx.clearRect(0, 0, w, h);
  drawBackground();
  drawPipes();
  drawGround();
  drawParticles();
  drawBird();
  drawScore();
}

function frame(now) {
  if (!running) return;
  if (!lastFrame) lastFrame = now;
  const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  update(dt);
  draw();
  rafId = window.requestAnimationFrame(frame);
}

function startLoop() {
  if (running) return;
  running = true;
  lastFrame = 0;
  rafId = window.requestAnimationFrame(frame);
}

function stopLoop() {
  running = false;
  if (rafId !== null) {
    window.cancelAnimationFrame(rafId);
    rafId = null;
  }
}

/* ---------- input ---------- */

function handleTap() {
  if (phase === 'ready') {
    beginFlight();
    return;
  }
  if (phase === 'playing') flap();
}

function requestNewFlight() {
  if (stageWrap.dataset.refreshing === 'true') return;
  softRefresh(stageWrap, () => {
    resize();
    resetFlight();
    stageWrap.focus({ preventScroll: true });
  });
}

stageWrap.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  event.preventDefault();
  handleTap();
});

window.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof Element && event.target.closest('button, a')) return;
  if (event.code === 'Space' || event.code === 'Enter') {
    event.preventDefault();
    handleTap();
  }
});

$('reset').addEventListener('click', requestNewFlight);
veilPrimary.addEventListener('click', requestNewFlight);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopLoop();
  else startLoop();
});

if ('ResizeObserver' in window) {
  new ResizeObserver(resize).observe(stageWrap);
}
window.addEventListener('resize', resize);

resize();
resetFlight();
startLoop();
