import { softRefresh } from '../../shared/refresh.js';

const $ = (id) => document.getElementById(id);

const COLS = 24;
const ROWS = 16;
const TOTAL = COLS * ROWS;
const ROUND_SECONDS = 45;
const STEP_MS = 105;
const COUNT_MS = 700;
const PULSE_MS = 420;

const PLAYERS = [
  {
    name: 'Player 1',
    short: 'P1',
    main: '#ff6b5a',
    light: '#ff9d90',
    shades: ['#ff7364', '#ff6b5a', '#f8604f'],
    start: { x: 3, y: 12 }
  },
  {
    name: 'Player 2',
    short: 'P2',
    main: '#21b6a8',
    light: '#7fe0d5',
    shades: ['#2ac3b4', '#21b6a8', '#15a397'],
    start: { x: 20, y: 3 }
  },
  {
    name: 'Player 3',
    short: 'P3',
    main: '#7c5cff',
    light: '#b8a9ff',
    shades: ['#8b6fff', '#7c5cff', '#6b4bea'],
    start: { x: 3, y: 3 }
  },
  {
    name: 'Player 4',
    short: 'P4',
    main: '#3d6fb4',
    light: '#8db6e8',
    shades: ['#4a7dc4', '#3d6fb4', '#2f5f9f'],
    start: { x: 20, y: 12 }
  }
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
const pctEls = [0, 1, 2, 3].map((i) => $(`pct-${i}`));
const barEls = [0, 1, 2, 3].map((i) => $(`bar-${i}`));
const cardEls = [0, 1, 2, 3].map((i) => $(`card-${i}`));
const statusEl = $('status');
const veil = $('veil');
const veilEyebrow = $('veil-eyebrow');
const veilTitle = $('veil-title');
const veilCopy = $('veil-copy');
const podiumEl = $('podium');
const rematchBtn = $('rematch');

const players = PLAYERS.map((info, id) => ({
  id,
  info,
  x: info.start.x,
  y: info.start.y,
  rx: info.start.x,
  ry: info.start.y,
  dir: null,
  stepAt: 0,
  bumpAt: -999
}));

const padButtons = [0, 1, 2, 3].map((i) => Array.from(document.querySelectorAll(`.pad-btn[data-p="${i}"]`)));
const keyStack = [[], [], [], []];
const padDir = [null, null, null, null];

const owners = new Int8Array(TOTAL);
const pulses = new Float64Array(TOTAL);
const counts = [0, 0, 0, 0];
const particles = [];
const rings = [];
const announced = new Set();

let phase = 'countdown';
let timeLeft = ROUND_SECONDS;
let countLeft = COUNT_MS * 3;
let goUntil = 0;
let lastSec = -1;
let lastLabel = '';
let lastPct = [-1, -1, -1, -1];
let lastCounts = [-1, -1, -1, -1];
let lastFrame = 0;

let dpr = 1;
let w = 0;
let h = 0;
let bgCanvas = null;

const TAU = Math.PI * 2;

function rr(context, x, y, width, height, radius) {
  context.beginPath();
  if (typeof context.roundRect === 'function') {
    context.roundRect(x, y, width, height, Math.max(0, radius));
    return;
  }
  const r = Math.min(radius, width / 2, height / 2);
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function percent(who) {
  return Math.round((counts[who] / TOTAL) * 100);
}

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
  buildBackground();
}

function buildBackground() {
  if (!w || !h) return;
  bgCanvas = document.createElement('canvas');
  bgCanvas.width = canvas.width;
  bgCanvas.height = canvas.height;
  const b = bgCanvas.getContext('2d');
  b.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cw = w / COLS;
  const ch = h / ROWS;
  const base = Math.min(cw, ch);
  const gap = Math.max(1.1, base * 0.09);
  const rad = base * 0.24;

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      rr(b, x * cw + gap / 2, y * ch + gap / 2, cw - gap, ch - gap, rad);
      b.fillStyle = (x + y) % 2 ? 'rgba(255, 253, 248, .44)' : 'rgba(255, 253, 248, .56)';
      b.fill();
    }
  }
}

function paint(index, who, now) {
  const prev = owners[index];
  if (prev === who + 1) return;
  if (prev) counts[prev - 1] -= 1;
  owners[index] = who + 1;
  counts[who] += 1;
  pulses[index] = now;

  if (prev && w) {
    const cw = w / COLS;
    const ch = h / ROWS;
    const base = Math.min(cw, ch);
    spawnDrops((index % COLS + 0.5) * cw, (((index / COLS) | 0) + 0.5) * ch, who, 3, base * 0.9);
  }
}

function spawnDrops(px, py, who, amount, spread) {
  const info = PLAYERS[who];
  for (let i = 0; i < amount; i += 1) {
    const angle = Math.random() * TAU;
    const speed = spread * (0.35 + Math.random());
    const life = 0.45 + Math.random() * 0.35;
    particles.push({
      x: px,
      y: py,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - spread * 0.35,
      life,
      max: life,
      size: Math.max(1, spread * (0.07 + Math.random() * 0.1)),
      color: Math.random() > 0.5 ? info.main : info.light
    });
  }
  if (particles.length > 320) particles.splice(0, particles.length - 320);
}

function splash(player, who) {
  if (!w || !h) return;
  const cw = w / COLS;
  const ch = h / ROWS;
  const base = Math.min(cw, ch);
  const px = (player.x + 0.5) * cw;
  const py = (player.y + 0.5) * ch;
  rings.push({
    x: px,
    y: py,
    r: base * 0.3,
    max: base * 2.4,
    age: 0,
    dur: 0.5,
    color: PLAYERS[who].main
  });
  spawnDrops(px, py, who, 22, base * 1.6);
}

function step(player, dir, now) {
  if (phase !== 'playing' || now < player.stepAt) return;
  const move = DIRS[dir];
  const nx = player.x + move.dx;
  const ny = player.y + move.dy;
  player.bumpAt = now;

  if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
    player.stepAt = now + 110;
    return;
  }

  player.x = nx;
  player.y = ny;
  player.stepAt = now + STEP_MS;
  paint(ny * COLS + nx, player.id, now);
}

function effectiveDir(i) {
  if (padDir[i]) return padDir[i];
  const stack = keyStack[i];
  return stack.length ? stack[stack.length - 1].dir : null;
}

function syncPad(i) {
  const dir = effectiveDir(i);
  padButtons[i].forEach((button) => {
    button.classList.toggle('is-pressed', button.dataset.dir === dir);
  });
}

function movePlayers(now) {
  players.forEach((player, i) => {
    const dir = effectiveDir(i);
    if (dir !== player.dir) {
      player.dir = dir;
      syncPad(i);
    }
    if (dir) step(player, dir, now);
  });
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
  timeLeft = ROUND_SECONDS;
  lastSec = -1;
  players.forEach((player) => {
    player.stepAt = now + 120;
  });
  players.forEach((player) => {
    paint(player.y * COLS + player.x, player.id, now);
    splash(player, player.id);
  });
  goUntil = now + 480;
  showCount('GO!');
  announce('Go! Four players, 45 seconds. Paint the most tiles.');
}

function resetRound() {
  phase = 'countdown';
  owners.fill(0);
  pulses.fill(0);
  counts.fill(0);

  players.forEach((player) => {
    player.x = player.info.start.x;
    player.y = player.info.start.y;
    player.rx = player.x;
    player.ry = player.y;
    player.dir = null;
    player.stepAt = 0;
    player.bumpAt = -999;
  });

  particles.length = 0;
  rings.length = 0;
  timeLeft = ROUND_SECONDS;
  countLeft = COUNT_MS * 3;
  goUntil = 0;
  lastSec = -1;
  lastPct = [-1, -1, -1, -1];
  lastCounts = [-1, -1, -1, -1];
  lastLabel = '';
  announced.clear();
  for (let i = 0; i < 4; i += 1) {
    keyStack[i].length = 0;
    padDir[i] = null;
  }
  veil.hidden = true;
  podiumEl.replaceChildren();
  countWrap.hidden = false;
  countWrap.classList.remove('is-go');
  showCount('3');
  for (let i = 0; i < 4; i += 1) syncPad(i);
  updateHud();
  announce('Paint Fight for four. 3, 2, 1. Most tiles after 45 seconds wins.');
}

function buildPodium(order) {
  let place = 1;
  podiumEl.replaceChildren();
  order.forEach((row, index) => {
    if (index > 0 && row.count < order[index - 1].count) place = index + 1;
    const li = document.createElement('li');
    li.style.setProperty('--accent', PLAYERS[row.who].main);

    const placeEl = document.createElement('span');
    placeEl.className = 'podium-place';
    placeEl.textContent = `#${place}`;

    const nameEl = document.createElement('span');
    nameEl.className = 'podium-name';
    const dot = document.createElement('i');
    dot.className = 'dot';
    nameEl.append(dot, document.createTextNode(PLAYERS[row.who].short));

    const pctEl = document.createElement('span');
    pctEl.className = 'podium-pct';
    pctEl.textContent = `${row.pct}%`;

    const tilesEl = document.createElement('span');
    tilesEl.className = 'podium-tiles';
    tilesEl.textContent = `${row.count} tiles`;

    li.append(placeEl, nameEl, pctEl, tilesEl);
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

  const order = [0, 1, 2, 3]
    .map((who) => ({ who, count: counts[who], pct: percent(who) }))
    .sort((a, b) => b.count - a.count || a.who - b.who);

  buildPodium(order);

  const top = order[0].count;
  const winners = order.filter((row) => row.count === top);
  const summary = order.map((row) => `${PLAYERS[row.who].short} ${row.pct} percent`).join(', ');

  if (winners.length > 1) {
    veilEyebrow.textContent = 'Dead heat';
    veilTitle.textContent = 'It\u2019s a tie!';
    veilCopy.textContent = `${top} tiles each. Nobody gave an inch.`;
    announce(`Round over. It's a tie at ${top} tiles. ${summary}.`);
  } else {
    const winner = winners[0];
    const runnerUp = order[1] ? order[1].count : 0;
    veilEyebrow.textContent = 'Round complete';
    veilTitle.textContent = `${PLAYERS[winner.who].name} wins!`;
    veilCopy.textContent = `${winner.count} tiles \u2014 ${winner.count - runnerUp} clear of the pack.`;
    announce(`Round over. ${PLAYERS[winner.who].name} wins with ${winner.pct} percent. ${summary}.`);
  }

  veil.hidden = false;
  rematchBtn.focus({ preventScroll: true });
}

function updateHud() {
  for (let i = 0; i < 4; i += 1) {
    if (counts[i] !== lastCounts[i]) {
      barEls[i].style.width = `${(counts[i] / TOTAL) * 100}%`;
      lastCounts[i] = counts[i];
    }
    const p = percent(i);
    if (p !== lastPct[i]) {
      pctEls[i].textContent = `${p}%`;
      lastPct[i] = p;
    }
    cardEls[i].classList.toggle('is-leading', counts[i] > 0 && counts[i] === Math.max(...counts));
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
      const summary = [0, 1, 2, 3].map((who) => `${PLAYERS[who].short} ${percent(who)} percent`).join(', ');
      announce(`${mark} seconds left. ${summary}.`);
      return;
    }
  }
}

function updateEffects(dt) {
  const k = 1 - Math.exp(-dt * 18);
  players.forEach((player) => {
    player.rx += (player.x - player.rx) * k;
    player.ry += (player.y - player.ry) * k;
  });

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const part = particles[i];
    part.life -= dt;
    if (part.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    part.vy += 150 * dt;
    part.x += part.vx * dt;
    part.y += part.vy * dt;
    part.vx *= 1 - 1.6 * dt;
  }

  for (let i = rings.length - 1; i >= 0; i -= 1) {
    const ring = rings[i];
    ring.age += dt;
    if (ring.age >= ring.dur) rings.splice(i, 1);
  }
}

function drawEffects() {
  for (let i = 0; i < rings.length; i += 1) {
    const ring = rings[i];
    const t = ring.age / ring.dur;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r + (ring.max - ring.r) * t, 0, TAU);
    ctx.globalAlpha = (1 - t) * 0.5;
    ctx.lineWidth = Math.max(1.5, w / 220);
    ctx.strokeStyle = ring.color;
    ctx.stroke();
  }

  for (let i = 0; i < particles.length; i += 1) {
    const part = particles[i];
    const fade = Math.min(1, (part.life / part.max) * 2);
    ctx.globalAlpha = fade;
    ctx.fillStyle = part.color;
    ctx.beginPath();
    ctx.arc(part.x, part.y, Math.max(0.6, part.size * (0.6 + fade * 0.4)), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPlayer(player, now, cw, ch) {
  const base = Math.min(cw, ch);
  const info = player.info;
  const shared = players.some((other) => other.id !== player.id && other.x === player.x && other.y === player.y);
  const offsets = [
    [-0.18, -0.18],
    [0.18, -0.18],
    [-0.18, 0.18],
    [0.18, 0.18]
  ];
  const offsetX = shared ? offsets[player.id][0] * cw : 0;
  const offsetY = shared ? offsets[player.id][1] * ch : 0;

  const px = (player.rx + 0.5) * cw + offsetX;
  const py = (player.ry + 0.5) * ch + offsetY;
  const r = base * 0.4;
  const since = now - player.bumpAt;
  const bump = since >= 0 && since < 190 ? 1 - since / 190 : 0;
  const wob = 1 + Math.sin(now / 260 + player.id * 2.3) * 0.025;
  const sx = (1 + bump * 0.13) * wob;
  const sy = (1 - bump * 0.1) * wob;

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#1e2433';
  ctx.beginPath();
  ctx.ellipse(px, py + r * 0.72, r * 0.85, r * 0.3, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.ellipse(px, py, r * 1.16 * sx, r * 1.16 * sy, 0, 0, TAU);
  ctx.fillStyle = 'rgba(255, 249, 240, .82)';
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(px, py, r * sx, r * sy, 0, 0, TAU);
  ctx.fillStyle = info.main;
  ctx.fill();
  ctx.lineWidth = Math.max(1.4, base * 0.06);
  ctx.strokeStyle = '#1e2433';
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(px - r * 0.26, py - r * 0.3, r * 0.32, r * 0.22, -0.6, 0, TAU);
  ctx.fillStyle = 'rgba(255, 253, 248, .36)';
  ctx.fill();

  const dir = player.dir ? DIRS[player.dir] : { dx: 0, dy: 0 };
  const lookX = dir.dx * r * 0.1;
  const lookY = dir.dy * r * 0.1;
  const eyeR = Math.max(1.1, r * 0.19);
  const gap = r * 0.31;
  const eyeY = py - r * 0.1;

  ctx.fillStyle = '#fffdf8';
  for (let s = -1; s <= 1; s += 2) {
    ctx.beginPath();
    ctx.arc(px + s * gap + lookX * 0.5, eyeY + lookY * 0.5, eyeR, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#1e2433';
  for (let s = -1; s <= 1; s += 2) {
    ctx.beginPath();
    ctx.arc(px + s * gap + lookX, eyeY + lookY, eyeR * 0.52, 0, TAU);
    ctx.fill();
  }
}

function draw(now) {
  if (!w || !h) return;
  ctx.clearRect(0, 0, w, h);
  if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0, w, h);

  const cw = w / COLS;
  const ch = h / ROWS;
  const base = Math.min(cw, ch);
  const gap = Math.max(1.1, base * 0.09);
  const rad = base * 0.24;

  for (let i = 0; i < TOTAL; i += 1) {
    const owner = owners[i];
    if (!owner) continue;
    const gx = i % COLS;
    const gy = (i / COLS) | 0;
    const age = now - pulses[i];
    let scale = 1;
    if (age >= 0 && age < PULSE_MS) {
      scale = 1 + Math.sin((age / PULSE_MS) * Math.PI) * 0.15;
    }
    const tw = (cw - gap) * scale;
    const th = (ch - gap) * scale;
    ctx.fillStyle = PLAYERS[owner - 1].shades[(gx * 5 + gy * 3) % 3];
    rr(ctx, gx * cw + (cw - tw) / 2, gy * ch + (ch - th) / 2, tw, th, rad * scale);
    ctx.fill();
  }

  drawEffects();
  players.forEach((player) => drawPlayer(player, now, cw, ch));
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
    timeLeft = Math.max(0, timeLeft - dt);
    if (goUntil && now > goUntil) {
      goUntil = 0;
      countWrap.hidden = true;
    }
    movePlayers(now);
    announceClock();
    if (timeLeft <= 0) endRound();
  }

  updateEffects(dt);
  updateHud();
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
      step(players[i], dir, performance.now());
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

    button.addEventListener('click', (event) => {
      if (event.detail !== 0) return;
      if (performance.now() - pointerAt < 500) return;
      step(players[i], dir, performance.now());
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
