import { softRefresh } from '../../shared/refresh.js';
import {
  collectsGem,
  hitsGap,
  nextRow,
  rowSpacing,
  scoreFrom,
  speedAt
} from './engine.js';

const $ = (id) => document.getElementById(id);
const BEST_KEY = 'mini-games:ball-run:best';

const stageWrap = $('stage-wrap');
const canvas = $('stage');
const ctx = canvas.getContext('2d');
const scoreEl = $('score');
const bestEl = $('best');
const gemsEl = $('gems');
const readyEl = $('ready');
const statusEl = $('status');
const veil = $('veil');
const veilCopy = $('veil-copy');
const veilStats = $('veil-stats');
const veilPrimary = $('veil-primary');

let phase = 'ready'; // 'ready' | 'playing' | 'over'
let lane = 1;
let laneX = 0;
let rows = [];
let particles = [];
let distance = 0;
let gems = 0;
let score = 0;
let best = loadBest();
let token = 0;
let rafId = null;
let lastFrame = 0;
let running = false;

let w = 0;
let h = 0;
let dpr = 1;
let trackX = 0;
let trackW = 0;
let laneW = 0;
let ballY = 0;
let ballR = 16;

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

  trackX = w * 0.09;
  trackW = w * 0.82;
  laneW = trackW / 3;
  ballY = h * 0.76;
  ballR = Math.max(11, Math.min(21, laneW * 0.27));
  laneX = laneCenter(lane);
}

function laneCenter(index) {
  return trackX + laneW * (index + 0.5);
}

/* ---------- flow ---------- */

function updateMeta() {
  scoreEl.textContent = String(score);
  bestEl.textContent = best ? String(best) : '—';
  gemsEl.textContent = String(gems);
}

function spawnRow(y) {
  rows.push({ y, cells: nextRow(Math.random) });
}

function resetRun() {
  token += 1;
  phase = 'ready';
  lane = 1;
  laneX = laneCenter(lane);
  rows = [];
  particles = [];
  distance = 0;
  gems = 0;
  score = 0;
  veil.hidden = true;
  readyEl.hidden = false;
  updateMeta();
  statusEl.textContent = 'Ready. Tap to roll.';
}

function beginRun() {
  phase = 'playing';
  readyEl.hidden = true;
  spawnRow(-90);
  statusEl.textContent = 'Rolling. Switch lanes to dodge gaps.';
}

function moveLane(delta) {
  if (phase !== 'playing') return;
  const next = Math.max(0, Math.min(2, lane + delta));
  if (next === lane) {
    statusEl.textContent = delta < 0 ? 'Already in the left lane.' : 'Already in the right lane.';
    return;
  }
  lane = next;
  statusEl.textContent = `Lane ${lane + 1}.`;
}

function burst(x, y, color) {
  if (reduced()) return;
  for (let index = 0; index < 10; index += 1) {
    const angle = (Math.PI * 2 * index) / 10;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * 90,
      vy: Math.sin(angle) * 90,
      life: 0.45,
      max: 0.45,
      color
    });
  }
}

function die() {
  if (phase === 'over') return;
  phase = 'over';
  const myToken = token;
  window.setTimeout(() => finish(myToken), reduced() ? 200 : 750);
  statusEl.textContent = `The ball fell at ${score}.`;
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
    ? `You scored ${score} with ${gems} gems — a new best.`
    : `You scored ${score} with ${gems} gems. Best is ${best}.`;

  veilStats.replaceChildren();
  for (const [term, value] of [
    ['Score', score],
    ['Gems', gems],
    ['Best', best]
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
  statusEl.textContent = `Run over. Score ${score}, best ${best}.`;
}

/* ---------- loop ---------- */

function update(dt) {
  if (phase === 'ready') {
    laneX = laneCenter(lane);
    return;
  }

  if (phase === 'playing') {
    const speed = speedAt(distance);
    distance += speed * dt;

    const target = laneCenter(lane);
    laneX += (target - laneX) * Math.min(1, dt * 15);

    for (const row of rows) row.y += speed * dt;
    while (rows.length && rows[0].y > h + 80) rows.shift();

    const spacing = rowSpacing(distance);
    let minY = Infinity;
    for (const row of rows) minY = Math.min(minY, row.y);
    if (minY > spacing) spawnRow(minY === Infinity ? -90 : minY - spacing);

    for (const row of rows) {
      const dy = row.y - ballY;
      if (Math.abs(dy) > ballR) continue;

      if (row.cells[lane] === 'gap' && hitsGap(row.cells, lane, dy, ballR * 0.95)) {
        die();
        break;
      }
      if (row.cells[lane] === 'gem' && collectsGem(row.cells, lane, dy, ballR * 1.3)) {
        row.cells[lane] = null;
        gems += 1;
        burst(laneX, ballY, '#ffb703');
        statusEl.textContent = `Gem collected. ${gems} so far.`;
      }
    }

    const next = scoreFrom(distance, gems);
    if (next !== score) {
      score = next;
      updateMeta();
    }
  } else if (phase === 'over') {
    ballY += 220 * dt;
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
  ctx.fillStyle = '#fff6e9';
  ctx.fillRect(0, 0, w, h);

  // side verges
  ctx.fillStyle = '#f4e7d4';
  ctx.fillRect(0, 0, trackX, h);
  ctx.fillRect(trackX + trackW, 0, w - trackX - trackW, h);

  // track
  const road = ctx.createLinearGradient(trackX, 0, trackX + trackW, 0);
  road.addColorStop(0, '#333b52');
  road.addColorStop(0.5, '#2a3142');
  road.addColorStop(1, '#232a3a');
  ctx.fillStyle = road;
  rr(trackX, 0, trackW, h, Math.min(18, trackW * 0.06));
  ctx.fill();

  // rails
  ctx.fillStyle = '#ffb703';
  ctx.fillRect(trackX - 5, 0, 5, h);
  ctx.fillRect(trackX + trackW, 0, 5, h);

  // lane dividers (scroll with distance)
  const offset = distance % 46;
  ctx.strokeStyle = 'rgba(255, 253, 248, .4)';
  ctx.lineWidth = Math.max(2, trackW * 0.012);
  ctx.setLineDash([22, 24]);
  ctx.lineDashOffset = -offset;
  for (let divider = 1; divider < 3; divider += 1) {
    const x = trackX + laneW * divider;
    ctx.beginPath();
    ctx.moveTo(x, -50);
    ctx.lineTo(x, h + 50);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawRow(row) {
  for (let index = 0; index < row.cells.length; index += 1) {
    const cell = row.cells[index];
    if (!cell) continue;
    const cx = laneCenter(index);

    if (cell === 'gap') {
      const rw = laneW * 0.78;
      const rh = laneW * 0.56;
      ctx.fillStyle = 'rgba(0, 0, 0, .35)';
      rr(cx - rw / 2 - 3, row.y - rh / 2 - 3, rw + 6, rh + 6, rh / 2);
      ctx.fill();
      ctx.fillStyle = '#0d1018';
      rr(cx - rw / 2, row.y - rh / 2, rw, rh, rh / 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, .07)';
      rr(cx - rw / 2 + 5, row.y - rh / 2 + 4, rw - 10, 5, 3);
      ctx.fill();
    } else {
      const size = ballR * 0.85;
      ctx.save();
      ctx.translate(cx, row.y);
      ctx.rotate(Math.PI / 4);
      const gem = ctx.createLinearGradient(0, -size, 0, size);
      gem.addColorStop(0, '#ffd75e');
      gem.addColorStop(1, '#ffb703');
      ctx.fillStyle = gem;
      rr(-size, -size, size * 2, size * 2, 5);
      ctx.fill();
      ctx.strokeStyle = 'rgba(30, 36, 51, .35)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 255, 255, .8)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-size * 0.45, -size * 0.1);
      ctx.lineTo(0, -size * 0.55);
      ctx.lineTo(size * 0.45, -size * 0.1);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawBall() {
  const sinking = phase === 'over';
  const scale = sinking ? Math.max(0.2, 1 - (ballY - (h * 0.76)) / (h * 0.5)) : 1;
  const r = ballR * scale;

  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(laneX, ballY + r * 0.9, r * 0.95, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (r <= 0.5) return;

  const grad = ctx.createRadialGradient(laneX - r * 0.35, ballY - r * 0.4, r * 0.15, laneX, ballY, r);
  grad.addColorStop(0, '#ff9a8c');
  grad.addColorStop(0.55, '#ff6b5a');
  grad.addColorStop(1, '#d8432f');
  ctx.beginPath();
  ctx.arc(laneX, ballY, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  ctx.strokeStyle = 'rgba(30, 36, 51, .35)';
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, .7)';
  ctx.lineWidth = Math.max(2, r * 0.16);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(laneX, ballY, r * 0.58, Math.PI * 1.05, Math.PI * 1.55);
  ctx.stroke();
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function draw() {
  if (!w || !h) return;
  ctx.clearRect(0, 0, w, h);
  drawBackground();
  for (const row of rows) drawRow(row);
  drawParticles();
  drawBall();
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

function handleStageTap(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  event.preventDefault();
  if (phase === 'ready') {
    beginRun();
    return;
  }
  if (phase === 'playing') {
    const rect = canvas.getBoundingClientRect();
    moveLane(event.clientX - rect.left < rect.width / 2 ? -1 : 1);
  }
}

function requestNewRun() {
  if (stageWrap.dataset.refreshing === 'true') return;
  softRefresh(stageWrap, () => {
    resize();
    resetRun();
    stageWrap.focus({ preventScroll: true });
  });
}

stageWrap.addEventListener('pointerdown', handleStageTap);
$('go-left').addEventListener('click', () => moveLane(-1));
$('go-right').addEventListener('click', () => moveLane(1));

window.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof Element && event.target.closest('button, a')) return;

  if (event.code === 'Space' || event.code === 'Enter') {
    event.preventDefault();
    if (phase === 'ready') beginRun();
    return;
  }

  if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
    event.preventDefault();
    moveLane(-1);
  } else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
    event.preventDefault();
    moveLane(1);
  }
});

$('reset').addEventListener('click', requestNewRun);
veilPrimary.addEventListener('click', requestNewRun);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopLoop();
  else startLoop();
});

if ('ResizeObserver' in window) {
  new ResizeObserver(resize).observe(stageWrap);
}
window.addEventListener('resize', resize);

stageWrap.setAttribute('tabindex', '-1');
resize();
resetRun();
startLoop();
