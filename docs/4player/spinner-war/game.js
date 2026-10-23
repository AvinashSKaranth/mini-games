import { softRefresh } from '../../shared/refresh.js';

const $ = (id) => document.getElementById(id);

const ROUND_SECONDS = 45;
const COUNT_MS = 700;
const TOP_R = 0.062;
const START_R = 0.56;
const STAGE_R = 0.94;
const ACCEL = 2.6;
const MAX_SPEED = 1.35;
const RESTITUTION = 0.92;
const START_POINTS = [
  { x: 0, y: START_R },
  { x: START_R, y: 0 },
  { x: 0, y: -START_R },
  { x: -START_R, y: 0 }
];

const PLAYERS = [
  { name: 'Player 1', short: 'P1', main: '#ff6b5a', light: '#ff9d90' },
  { name: 'Player 2', short: 'P2', main: '#21b6a8', light: '#7fe0d5' },
  { name: 'Player 3', short: 'P3', main: '#7c5cff', light: '#b8a9ff' },
  { name: 'Player 4', short: 'P4', main: '#3d6fb4', light: '#8db6e8' }
];

const DIRS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 }
};

const KEY_MAP = {
  ArrowUp: [2, 'up'],
  ArrowDown: [2, 'down'],
  ArrowLeft: [2, 'left'],
  ArrowRight: [2, 'right'],
  KeyW: [0, 'up'],
  KeyS: [0, 'down'],
  KeyA: [0, 'left'],
  KeyD: [0, 'right'],
  KeyI: [1, 'up'],
  KeyK: [1, 'down'],
  KeyJ: [1, 'left'],
  KeyL: [1, 'right'],
  KeyT: [3, 'up'],
  KeyG: [3, 'down'],
  KeyF: [3, 'left'],
  KeyH: [3, 'right'],
  Numpad8: [3, 'up'],
  Numpad5: [3, 'down'],
  Numpad4: [3, 'left'],
  Numpad6: [3, 'right']
};

const arenaWrap = $('arena-wrap');
const canvas = $('arena');
const ctx = canvas.getContext('2d');
const countWrap = $('countdown');
const countNum = $('count-num');
const clockEl = $('clock');
const timerEl = $('timer');
const stateEls = [0, 1, 2, 3].map((i) => $(`state-${i}`));
const cardEls = [0, 1, 2, 3].map((i) => $(`card-${i}`));
const statusEl = $('status');
const veil = $('veil');
const veilEyebrow = $('veil-eyebrow');
const veilTitle = $('veil-title');
const veilCopy = $('veil-copy');
const podiumEl = $('podium');
const rematchBtn = $('rematch');

const tops = PLAYERS.map((info, id) => ({
  id,
  info,
  x: START_POINTS[id].x,
  y: START_POINTS[id].y,
  vx: 0,
  vy: 0,
  spin: id * 0.8,
  alive: true,
  outAt: 0,
  outOrder: 0,
  trail: []
}));

const padButtons = [0, 1, 2, 3].map((i) => Array.from(document.querySelectorAll(`.pad-btn[data-p="${i}"]`)));
const keyStack = [[], [], [], []];
const padDir = [null, null, null, null];

const particles = [];
let phase = 'countdown';
let timeLeft = ROUND_SECONDS;
let elapsed = 0;
let stageR = STAGE_R;
let countLeft = COUNT_MS * 3;
let goUntil = 0;
let lastSec = -1;
let lastLabel = '';
let lastFrame = 0;
let outCount = 0;
let lastStates = ['', '', '', ''];

let dpr = 1;
let w = 0;
let h = 0;

const TAU = Math.PI * 2;

function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `0:${String(s).padStart(2, '0')}`;
}

function announce(message) {
  statusEl.textContent = message;
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  const cssW = Math.max(1, Math.round(rect.width));
  const cssH = Math.max(1, Math.round(rect.height));
  const nextDpr = Math.min(window.devicePixelRatio || 1, 2.5);
  if (cssW === w && cssH === h && nextDpr === dpr) return;

  w = cssW;
  h = cssH;
  dpr = nextDpr;
  canvas.width = Math.max(1, Math.round(cssW * dpr));
  canvas.height = Math.max(1, Math.round(cssH * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function stageRadiusAt(seconds) {
  const p = Math.min(1, Math.max(0, seconds / ROUND_SECONDS));
  return STAGE_R - (STAGE_R - 0.13) * Math.pow(p, 1.05);
}

function inputFor(i) {
  let dx = 0;
  let dy = 0;
  if (padDir[i]) {
    const d = DIRS[padDir[i]];
    dx += d.dx;
    dy += d.dy;
  }
  for (const entry of keyStack[i]) {
    const d = DIRS[entry.dir];
    dx += d.dx;
    dy += d.dy;
  }
  const len = Math.hypot(dx, dy);
  if (len > 1) {
    dx /= len;
    dy /= len;
  }
  return { dx, dy };
}

function syncPad(i) {
  const pressed = new Set();
  if (padDir[i]) pressed.add(padDir[i]);
  for (const entry of keyStack[i]) pressed.add(entry.dir);
  padButtons[i].forEach((button) => {
    button.classList.toggle('is-pressed', pressed.has(button.dataset.dir));
  });
}

function spawnSparks(x, y, color, amount, strength = 0.02) {
  for (let i = 0; i < amount; i += 1) {
    const angle = Math.random() * TAU;
    const speed = strength * (0.4 + Math.random());
    const life = 0.24 + Math.random() * 0.34;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      max: life,
      size: 0.006 + Math.random() * 0.008,
      color
    });
  }
  if (particles.length > 240) particles.splice(0, particles.length - 240);
}

function eliminate(top) {
  if (!top.alive) return;
  top.alive = false;
  top.outAt = elapsed;
  top.outOrder = outCount;
  outCount += 1;
  top.vx = 0;
  top.vy = 0;
  spawnSparks(top.x, top.y, top.info.main, 18, 0.11);
  announce(`${top.info.name} is out.`);
}

function resolveCollisions() {
  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = 0; i < tops.length; i += 1) {
      const a = tops[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < tops.length; j += 1) {
        const b = tops[j];
        if (!b.alive) continue;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);
        const min = TOP_R * 2;
        if (dist >= min) continue;

        if (dist < 0.0001) {
          const angle = Math.random() * TAU;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          dist = 0.0001;
        } else {
          dx /= dist;
          dy /= dist;
        }

        const overlap = min - dist;
        a.x -= dx * overlap * 0.5;
        a.y -= dy * overlap * 0.5;
        b.x += dx * overlap * 0.5;
        b.y += dy * overlap * 0.5;

        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const vn = rvx * dx + rvy * dy;
        if (vn < 0) {
          const impulse = (-(1 + RESTITUTION) * vn) / 2;
          a.vx -= impulse * dx;
          a.vy -= impulse * dy;
          b.vx += impulse * dx;
          b.vy += impulse * dy;
          a.spin -= 1.4;
          b.spin += 1.4;
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          spawnSparks(mx, my, Math.random() > 0.5 ? a.info.main : b.info.main, 5, 0.05);
        }
      }
    }
  }
}

function moveTops(dt) {
  for (const top of tops) {
    if (!top.alive) continue;
    const input = inputFor(top.id);
    top.vx += input.dx * ACCEL * dt;
    top.vy += input.dy * ACCEL * dt;

    const drag = Math.exp(-1.25 * dt);
    top.vx *= drag;
    top.vy *= drag;

    let speed = Math.hypot(top.vx, top.vy);
    if (speed > MAX_SPEED) {
      top.vx = (top.vx / speed) * MAX_SPEED;
      top.vy = (top.vy / speed) * MAX_SPEED;
      speed = MAX_SPEED;
    }

    top.x += top.vx * dt;
    top.y += top.vy * dt;
    top.spin += (1.2 + speed * 3.4) * dt;

    top.trail.unshift({ x: top.x, y: top.y });
    if (top.trail.length > 7) top.trail.pop();
  }

  resolveCollisions();

  for (const top of tops) {
    if (!top.alive) continue;
    if (Math.hypot(top.x, top.y) + TOP_R * 0.18 > stageR) eliminate(top);
  }
}

function buildPodium(order, tieIds) {
  let place = 1;
  podiumEl.replaceChildren();
  order.forEach((top, index) => {
    if (index > 0 && !tieIds.has(top.id)) place = index + 1;
    const li = document.createElement('li');
    li.style.setProperty('--accent', top.info.main);

    const placeEl = document.createElement('span');
    placeEl.className = 'podium-place';
    placeEl.textContent = `#${place}`;

    const nameEl = document.createElement('span');
    nameEl.className = 'podium-name';
    const dot = document.createElement('i');
    dot.className = 'dot';
    nameEl.append(dot, document.createTextNode(top.info.short));

    const noteEl = document.createElement('span');
    noteEl.className = 'podium-note';
    if (top.alive) noteEl.textContent = 'spinning';
    else noteEl.textContent = `out ${formatTime(top.outAt)}`;

    li.append(placeEl, nameEl, noteEl);
    podiumEl.append(li);
  });
}

function endRound() {
  if (phase === 'over') return;
  phase = 'over';
  goUntil = 0;
  countWrap.hidden = true;
  for (let i = 0; i < 4; i += 1) {
    padDir[i] = null;
    keyStack[i].length = 0;
    syncPad(i);
  }

  const alive = tops.filter((top) => top.alive);
  const out = tops.filter((top) => !top.alive).sort((a, b) => b.outAt - a.outAt || b.outOrder - a.outOrder);

  if (alive.length) {
    alive.sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
  }

  let winner = null;
  let tied = false;
  const tieIds = new Set();

  if (alive.length === 1) {
    winner = alive[0];
  } else if (alive.length > 1) {
    const nearest = Math.hypot(alive[0].x, alive[0].y);
    const group = alive.filter((top) => Math.abs(Math.hypot(top.x, top.y) - nearest) < 0.02);
    if (group.length > 1) {
      tied = true;
      group.forEach((top) => tieIds.add(top.id));
    } else {
      winner = alive[0];
    }
  } else if (out.length) {
    const latest = out[0].outAt;
    const group = out.filter((top) => Math.abs(top.outAt - latest) < 0.02);
    if (group.length > 1) {
      tied = true;
      group.forEach((top) => tieIds.add(top.id));
    } else {
      winner = out[0];
    }
  }

  const order = alive.concat(out);
  buildPodium(order, tieIds);

  const summary = order
    .map((top) => `${top.info.short} ${top.alive ? 'in' : 'out'}`)
    .join(', ');

  if (tied) {
    veilEyebrow.textContent = 'Dead heat';
    veilTitle.textContent = 'It\u2019s a tie!';
    veilCopy.textContent = alive.length
      ? `${alive.length} tops survived the final shrink.`
      : 'All four tops went over the edge together.';
    announce(`Round over. It's a tie. ${summary}.`);
  } else if (winner) {
    veilEyebrow.textContent = 'Round complete';
    veilTitle.textContent = `${winner.info.name} wins!`;
    veilCopy.textContent = `${formatTime(elapsed)} on the clock \u2014 last top spinning.`;
    announce(`Round over. ${winner.info.name} wins. ${summary}.`);
  }

  veil.hidden = false;
  rematchBtn.focus({ preventScroll: true });
}

function updateHud() {
  for (let i = 0; i < 4; i += 1) {
    const state = tops[i].alive ? 'IN' : 'OUT';
    if (state !== lastStates[i]) {
      lastStates[i] = state;
      stateEls[i].textContent = state;
      cardEls[i].classList.toggle('is-out', state === 'OUT');
    }
  }

  const sec = Math.ceil(timeLeft);
  if (sec !== lastSec) {
    lastSec = sec;
    timerEl.textContent = formatTime(sec);
    timerEl.setAttribute('aria-label', `${sec} seconds remaining`);
    clockEl.classList.toggle('is-low', sec <= 10);
  }
}

const CHECKPOINTS = [30, 20, 10, 5];

function announceClock() {
  for (let i = 0; i < CHECKPOINTS.length; i += 1) {
    const mark = CHECKPOINTS[i];
    if (timeLeft <= mark && !announced.has(mark)) {
      announced.add(mark);
      const summary = tops.map((top) => `${top.info.short} ${top.alive ? 'in' : 'out'}`).join(', ');
      announce(`${mark} seconds left. ${summary}.`);
      return;
    }
  }
}

const announced = new Set();

function updateEffects(dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const part = particles[i];
    part.life -= dt;
    if (part.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    part.x += part.vx * dt;
    part.y += part.vy * dt;
    part.vx *= 1 - 2.2 * dt;
    part.vy *= 1 - 2.2 * dt;
  }
}

function drawTop(top, now) {
  const scale = Math.min(w, h) * 0.5;
  const cx = w / 2;
  const cy = h / 2;
  const px = cx + top.x * scale;
  const py = cy + top.y * scale;
  const r = TOP_R * scale;

  if (!top.alive) {
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = top.info.main;
    ctx.lineWidth = Math.max(2, r * 0.22);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px - r * 0.6, py - r * 0.6);
    ctx.lineTo(px + r * 0.6, py + r * 0.6);
    ctx.moveTo(px + r * 0.6, py - r * 0.6);
    ctx.lineTo(px - r * 0.6, py + r * 0.6);
    ctx.stroke();
    ctx.restore();
    return;
  }

  for (let i = top.trail.length - 1; i >= 1; i -= 1) {
    const point = top.trail[i];
    const t = 1 - i / top.trail.length;
    ctx.globalAlpha = t * 0.12;
    ctx.fillStyle = top.info.main;
    ctx.beginPath();
    ctx.arc(cx + point.x * scale, cy + point.y * scale, r * (0.55 + t * 0.35), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(top.spin);

  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#1e2433';
  ctx.beginPath();
  ctx.ellipse(r * 0.24, r * 0.3, r * 1.04, r * 0.86, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  for (let i = 0; i < 4; i += 1) {
    ctx.rotate(TAU / 4);
    ctx.beginPath();
    ctx.ellipse(r * 0.48, 0, r * 0.62, r * 0.34, 0, 0, TAU);
    ctx.fillStyle = i % 2 ? top.info.light : top.info.main;
    ctx.fill();
    ctx.lineWidth = Math.max(1.2, r * 0.1);
    ctx.strokeStyle = '#1e2433';
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(0, 0, r * 0.48, 0, TAU);
  ctx.fillStyle = '#fffdf8';
  ctx.fill();
  ctx.strokeStyle = '#1e2433';
  ctx.lineWidth = Math.max(1.2, r * 0.1);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, r * 0.15, 0, TAU);
  ctx.fillStyle = top.info.main;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(-r * 0.18, -r * 0.2, r * 0.16, r * 0.1, -0.6, 0, TAU);
  ctx.fillStyle = 'rgba(255, 253, 248, .7)';
  ctx.fill();

  ctx.restore();

  const pulse = 1 + Math.sin(now / 180 + top.id) * 0.04;
  ctx.beginPath();
  ctx.arc(px, py, r * 1.12 * pulse, 0, TAU);
  ctx.strokeStyle = 'rgba(255, 249, 240, .8)';
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.stroke();
}

function draw(now) {
  if (!w || !h) return;
  const cx = w / 2;
  const cy = h / 2;
  const scale = Math.min(w, h) * 0.5;
  const pr = stageR * scale;

  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.7);
  bg.addColorStop(0, '#fffdf8');
  bg.addColorStop(1, '#efe6d8');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy + pr * 0.04, pr, 0, TAU);
  ctx.fillStyle = 'rgba(30, 36, 51, .12)';
  ctx.fill();
  ctx.restore();

  const stage = ctx.createRadialGradient(cx, cy, 0, cx, cy, pr);
  stage.addColorStop(0, '#fffdf8');
  stage.addColorStop(0.72, '#fffaf0');
  stage.addColorStop(1, '#f7efe1');
  ctx.beginPath();
  ctx.arc(cx, cy, pr, 0, TAU);
  ctx.fillStyle = stage;
  ctx.fill();
  ctx.lineWidth = Math.max(2, pr * 0.012);
  ctx.strokeStyle = '#1e2433';
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, pr, 0, TAU);
  ctx.clip();
  ctx.strokeStyle = 'rgba(30, 36, 51, .1)';
  ctx.lineWidth = 1;
  for (const f of [0.33, 0.66]) {
    ctx.beginPath();
    ctx.arc(cx, cy, pr * f, 0, TAU);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx - pr, cy);
  ctx.lineTo(cx + pr, cy);
  ctx.moveTo(cx, cy - pr);
  ctx.lineTo(cx, cy + pr);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.setLineDash([Math.max(4, pr * 0.03), Math.max(4, pr * 0.03)]);
  ctx.lineWidth = Math.max(1.5, pr * 0.012);
  ctx.strokeStyle = stageR < 0.34 ? `rgba(255, 107, 90, ${0.55 + Math.sin(now / 170) * 0.2})` : 'rgba(30, 36, 51, .22)';
  ctx.beginPath();
  ctx.arc(cx, cy, pr * 1.04, 0, TAU);
  ctx.stroke();
  ctx.restore();

  for (const top of tops) drawTop(top, now);

  for (const part of particles) {
    const fade = Math.min(1, (part.life / part.max) * 2);
    ctx.globalAlpha = fade;
    ctx.fillStyle = part.color;
    ctx.beginPath();
    ctx.arc(cx + part.x * scale, cy + part.y * scale, Math.max(1, part.size * scale * (0.5 + fade)), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (stageR < 0.34) {
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(now / 170) * 0.2;
    ctx.strokeStyle = '#ff6b5a';
    ctx.lineWidth = Math.max(2, pr * 0.025);
    ctx.beginPath();
    ctx.arc(cx, cy, pr * 0.9, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

function showCount(text) {
  countWrap.hidden = false;
  if (lastLabel === text) return;
  lastLabel = text;
  countNum.textContent = text;
  countWrap.classList.toggle('is-go', text === 'GO!');
  countNum.classList.remove('is-pop');
  void countNum.offsetWidth;
  countNum.classList.add('is-pop');
}

function beginPlay(now) {
  phase = 'playing';
  elapsed = 0;
  stageR = STAGE_R;
  timeLeft = ROUND_SECONDS;
  lastSec = -1;
  for (const top of tops) {
    top.trail.length = 0;
  }
  goUntil = now + 480;
  showCount('GO!');
  announce('Go! Knock rivals off the shrinking stage.');
}

function resetRound() {
  phase = 'countdown';
  timeLeft = ROUND_SECONDS;
  elapsed = 0;
  stageR = STAGE_R;
  countLeft = COUNT_MS * 3;
  goUntil = 0;
  lastSec = -1;
  lastLabel = '';
  outCount = 0;
  lastStates = ['', '', '', ''];
  announced.clear();
  particles.length = 0;

  tops.forEach((top, i) => {
    top.x = START_POINTS[i].x;
    top.y = START_POINTS[i].y;
    top.vx = 0;
    top.vy = 0;
    top.spin = i * 0.8;
    top.alive = true;
    top.outAt = 0;
    top.outOrder = 0;
    top.trail.length = 0;
  });

  for (let i = 0; i < 4; i += 1) {
    keyStack[i].length = 0;
    padDir[i] = null;
    syncPad(i);
  }

  veil.hidden = true;
  podiumEl.replaceChildren();
  countWrap.hidden = false;
  countWrap.classList.remove('is-go');
  showCount('3');
  updateHud();
  announce('Spinner War for four. 3, 2, 1. Last top spinning wins.');
}

function update(dt, now) {
  if (phase === 'countdown') {
    countLeft -= dt * 1000;
    if (countLeft > 0) {
      const label = String(Math.ceil(countLeft / COUNT_MS));
      if (label !== lastLabel) {
        showCount(label);
        announce(`${label}.`);
      }
    } else {
      beginPlay(now);
    }
  } else if (phase === 'playing') {
    elapsed = Math.min(ROUND_SECONDS, elapsed + dt);
    timeLeft = Math.max(0, ROUND_SECONDS - elapsed);
    stageR = stageRadiusAt(elapsed);
    if (goUntil && now > goUntil) {
      goUntil = 0;
      countWrap.hidden = true;
    }
    moveTops(dt);
    announceClock();
    updateHud();
    if (tops.filter((top) => top.alive).length <= 1 || elapsed >= ROUND_SECONDS) {
      endRound();
    }
  }

  updateEffects(dt);
}

function frame(now) {
  if (!lastFrame) lastFrame = now;
  const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  update(dt, now);
  draw(now);
  requestAnimationFrame(frame);
}

// Input: four on-screen pads
padButtons.forEach((buttons, i) => {
  buttons.forEach((button) => {
    const dir = button.dataset.dir;
    let pointerAt = 0;

    button.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      pointerAt = performance.now();
      if (phase !== 'playing') return;
      padDir[i] = dir;
      if (button.setPointerCapture) {
        try { button.setPointerCapture(event.pointerId); } catch { /* noop */ }
      }
      syncPad(i);
    });

    const release = (event) => {
      if (padDir[i] === dir) padDir[i] = null;
      syncPad(i);
      if (button.hasPointerCapture && event.pointerId != null && button.hasPointerCapture(event.pointerId)) {
        try { button.releasePointerCapture(event.pointerId); } catch { /* noop */ }
      }
    };

    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', () => {
      if (padDir[i] === dir) padDir[i] = null;
      syncPad(i);
    });
    button.addEventListener('contextmenu', (event) => event.preventDefault());

    // Keyboard activation nudges the top for a short moment.
    button.addEventListener('click', (event) => {
      if (event.detail !== 0) return;
      if (performance.now() - pointerAt < 500) return;
      if (phase !== 'playing') return;
      padDir[i] = dir;
      syncPad(i);
      window.setTimeout(() => {
        if (padDir[i] === dir) padDir[i] = null;
        syncPad(i);
      }, 180);
    });
  });
});

// Input: keyboard
window.addEventListener('keydown', (event) => {
  const map = KEY_MAP[event.code];
  if (!map) return;
  if (event.ctrlKey || event.altKey || event.metaKey) return;
  event.preventDefault();
  if (event.repeat) return;
  const [i, dir] = map;
  keyStack[i].push({ code: event.code, dir });
  syncPad(i);
});

window.addEventListener('keyup', (event) => {
  const map = KEY_MAP[event.code];
  if (!map) return;
  const [i] = map;
  const stack = keyStack[i];
  const index = stack.findIndex((entry) => entry.code === event.code);
  if (index >= 0) stack.splice(index, 1);
  syncPad(i);
});

window.addEventListener('blur', () => {
  for (let i = 0; i < 4; i += 1) {
    keyStack[i].length = 0;
    padDir[i] = null;
    syncPad(i);
  }
});

// Round flow
function restartRound() {
  return softRefresh(arenaWrap, resetRound);
}

$('reset').addEventListener('click', () => {
  restartRound();
});

rematchBtn.addEventListener('click', async () => {
  await restartRound();
  canvas.focus({ preventScroll: true });
});

if ('ResizeObserver' in window) {
  new ResizeObserver(resize).observe(arenaWrap);
} else {
  window.addEventListener('resize', resize);
}
window.addEventListener('resize', resize);

resize();
resetRound();
requestAnimationFrame(frame);
