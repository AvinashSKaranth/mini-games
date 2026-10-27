import { softRefresh } from '../../shared/refresh.js';
import { nextBlock, resolveDrop, speedFor } from './engine.js';

const $ = (id) => document.getElementById(id);
const BEST_KEY = 'mini-games:stack:best';

const stageWrap = $('stage-wrap');
const canvas = $('stage');
const ctx = canvas.getContext('2d');
const heightEl = $('height');
const bestEl = $('best');
const perfectEl = $('perfect');
const toastEl = $('toast');
const statusEl = $('status');
const veil = $('veil');
const veilCopy = $('veil-copy');
const veilStats = $('veil-stats');
const veilPrimary = $('veil-primary');

const PALETTE = ['#ff6b5a', '#ffb703', '#21b6a8', '#7c5cff', '#3d6fb4', '#e86ba8', '#78b841'];

let blocks = [];
let current = null;
let falling = [];
let height = 0;
let perfects = 0;
let combo = 0;
let best = loadBest();
let phase = 'playing';
let token = 0;
let camera = 0;
let rafId = null;
let lastFrame = 0;
let running = false;

let w = 0;
let h = 0;
let dpr = 1;
let blockH = 16;
let baseY = 0;
let bgGradient = null;

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

  const ratio = w ? cssW / w : 0;
  w = cssW;
  h = cssH;
  dpr = nextDpr;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (ratio && ratio !== 1) {
    blocks.forEach((block) => {
      block.x *= ratio;
      block.width *= ratio;
    });
    if (current) {
      current.x *= ratio;
      current.width *= ratio;
    }
  }

  blockH = Math.max(11, Math.min(26, h * 0.034));
  baseY = h - Math.max(16, h * 0.045);
  bgGradient = ctx.createLinearGradient(0, 0, 0, h);
  bgGradient.addColorStop(0, '#17202f');
  bgGradient.addColorStop(0.6, '#1e2433');
  bgGradient.addColorStop(1, '#242d40');
}

function currentY() {
  return baseY - (blocks.length + 1) * blockH;
}

function cameraTarget() {
  const desired = h * 0.34;
  return Math.max(0, desired - currentY());
}

/* ---------- game flow ---------- */

function updateMeta() {
  heightEl.textContent = String(height);
  bestEl.textContent = best ? String(best) : '—';
  perfectEl.textContent = String(perfects);
}

function showToast(text) {
  toastEl.textContent = text;
  toastEl.classList.remove('is-show');
  void toastEl.offsetWidth;
  toastEl.classList.add('is-show');
}

function spawnCurrent() {
  const top = blocks[blocks.length - 1];
  const direction = height % 2 === 0 ? 1 : -1;
  const start = nextBlock(top.width, w, direction);
  const speed = speedFor(height, 95, 330) * Math.max(0.7, w / 380);
  current = {
    x: start.x,
    width: top.width,
    dir: direction,
    speed,
    color: PALETTE[height % PALETTE.length]
  };
}

function resetTower() {
  token += 1;
  camera = 0;
  falling = [];
  height = 0;
  perfects = 0;
  combo = 0;
  phase = 'playing';
  current = null;
  const width = Math.max(60, w * 0.42);
  blocks = [{ x: (w - width) / 2, width, color: '#5b6377' }];
  veil.hidden = true;
  spawnCurrent();
  updateMeta();
  statusEl.textContent = 'New tower. Tap to drop the block.';
}

function finish(myToken) {
  if (myToken !== token) return;
  const isBest = height > best;
  if (isBest) {
    best = height;
    saveBest();
  }
  updateMeta();

  veilCopy.textContent = isBest
    ? `You stacked ${height} blocks — a new best.`
    : `You stacked ${height} blocks. Best is ${best}.`;

  veilStats.replaceChildren();
  for (const [term, value] of [
    ['Height', height],
    ['Perfect', perfects],
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
  statusEl.textContent = `Game over. Height ${height} with ${perfects} perfect drops.`;
}

function drop() {
  if (phase !== 'playing' || !current) return;
  const top = blocks[blocks.length - 1];
  const result = resolveDrop(top, { x: current.x, width: current.width });
  const dropY = currentY();

  if (result.missed) {
    falling.push({ x: current.x, y: dropY, width: current.width, color: current.color, vy: 40 });
    current = null;
    phase = 'over';
    const myToken = token;
    window.setTimeout(() => finish(myToken), reduced() ? 120 : 700);
    statusEl.textContent = 'The block missed the tower.';
    return;
  }

  blocks.push({ x: result.x, width: result.width, color: current.color });

  if (result.offcut && result.offcut.width > 1) {
    falling.push({ x: result.offcut.x, y: dropY, width: result.offcut.width, color: current.color, vy: 30 });
  }

  height = blocks.length - 1;

  if (result.perfect) {
    combo += 1;
    perfects += 1;
    showToast(combo > 1 ? `Perfect ×${combo}` : 'Perfect');
    statusEl.textContent = `Perfect stack. Height ${height}.`;
  } else {
    combo = 0;
    statusEl.textContent = `Block placed. Height ${height}.`;
  }

  spawnCurrent();
  updateMeta();
}

/* ---------- loop ---------- */

function update(dt) {
  if (phase === 'playing' && current) {
    current.x += current.dir * current.speed * dt;
    if (current.x + current.width >= w) {
      current.x = w - current.width;
      current.dir = -1;
    } else if (current.x <= 0) {
      current.x = 0;
      current.dir = 1;
    }
  }

  const target = cameraTarget();
  if (reduced()) {
    camera = target;
  } else {
    camera += (target - camera) * (1 - Math.exp(-dt * 7));
  }

  for (let index = falling.length - 1; index >= 0; index -= 1) {
    const piece = falling[index];
    piece.vy += 1400 * dt;
    piece.y += piece.vy * dt;
    if (piece.y > h + 80) falling.splice(index, 1);
  }
}

function drawBlock(block, y, highlight) {
  const x = block.x;
  const width = block.width;
  const pad = Math.max(1, blockH * 0.12);

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, .35)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  rr(x, y + pad, width, blockH - pad * 2, Math.max(3, blockH * 0.26));
  ctx.fillStyle = block.color;
  ctx.fill();
  ctx.restore();

  ctx.save();
  rr(x, y + pad, width, blockH - pad * 2, Math.max(3, blockH * 0.26));
  ctx.clip();
  const shine = ctx.createLinearGradient(0, y, 0, y + blockH);
  shine.addColorStop(0, 'rgba(255, 255, 255, .34)');
  shine.addColorStop(0.4, 'rgba(255, 255, 255, 0)');
  shine.addColorStop(1, 'rgba(30, 36, 51, .28)');
  ctx.fillStyle = shine;
  ctx.fillRect(x, y, width, blockH);
  ctx.restore();

  if (highlight) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, .65)';
    ctx.lineWidth = 2;
    rr(x + 1, y + pad + 1, Math.max(2, width - 2), blockH - pad * 2 - 2, Math.max(3, blockH * 0.26));
    ctx.stroke();
    ctx.restore();
  }
}

function draw() {
  if (!w || !h) return;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = bgGradient || '#1e2433';
  ctx.fillRect(0, 0, w, h);

  // faint floor grid
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, .05)';
  ctx.lineWidth = 1;
  const gap = Math.max(24, w / 10);
  for (let x = gap; x < w; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(0, camera);

  // ground line
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, .35)';
  ctx.fillRect(0, baseY + 2, w, h - baseY + 40);
  ctx.strokeStyle = 'rgba(255, 183, 3, .5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, baseY + 1);
  ctx.lineTo(w, baseY + 1);
  ctx.stroke();
  ctx.restore();

  for (let index = 0; index < blocks.length; index += 1) {
    drawBlock(blocks[index], baseY - (index + 1) * blockH, false);
  }

  if (current) drawBlock({ x: current.x, width: current.width, color: current.color }, currentY(), true);

  for (const piece of falling) {
    drawBlock({ x: piece.x, width: piece.width, color: piece.color }, piece.y, false);
  }

  ctx.restore();
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

function requestNewTower() {
  if (stageWrap.dataset.refreshing === 'true') return;
  softRefresh(stageWrap, () => {
    resize();
    resetTower();
    stageWrap.focus({ preventScroll: true });
  });
}

stageWrap.setAttribute('tabindex', '-1');

stageWrap.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  event.preventDefault();
  drop();
});

window.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof Element && event.target.closest('button, a')) return;
  if (event.code === 'Space' || event.code === 'Enter') {
    event.preventDefault();
    drop();
  }
});

$('reset').addEventListener('click', requestNewTower);
veilPrimary.addEventListener('click', requestNewTower);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopLoop();
  else startLoop();
});

if ('ResizeObserver' in window) {
  new ResizeObserver(() => {
    resize();
    if (!blocks.length) resetTower();
  }).observe(stageWrap);
}
window.addEventListener('resize', resize);

resize();
resetTower();
startLoop();
