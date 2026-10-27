import { softRefresh } from '../../shared/refresh.js';
import { aiInput, collideBodies, dashImpulse, ringOut, stepBody } from './engine.js';

const $ = (id) => document.getElementById(id);

const PLAYERS = [
  { name: 'Player 1', color: '#ff6b5a', belt: '#c93a2b' },
  { name: 'Player 2', color: '#21b6a8', belt: '#0e7c72' }
];
const TARGET = 2;
const COUNT_MS = 1300;
const POINT_MS = 1600;

const stageWrap = $('stage-wrap');
const canvas = $('stage');
const ctx = canvas.getContext('2d');
const countdownEl = $('countdown');
const countNum = $('count-num');
const scoreEls = [$('score-0'), $('score-1')];
const nameEls = [$('name-0'), $('name-1')];
const cardEls = [$('card-0'), $('card-1')];
const pipsEls = [$('pips-0'), $('pips-1')];
const boutEl = $('bout');
const statusEl = $('status');
const veil = $('veil');
const veilTitle = $('veil-title');
const veilCopy = $('veil-copy');
const veilStats = $('veil-stats');
const rematchBtn = $('rematch');
const modeButtons = [...document.querySelectorAll('.mode-switch button')];
const pads = [$('pad-0'), $('pad-1')];
const dashButtons = [...document.querySelectorAll('.pad-dash')];

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

const KEY_MAP = {
  KeyW: [0, 'up'],
  KeyS: [0, 'down'],
  KeyA: [0, 'left'],
  KeyD: [0, 'right'],
  ArrowUp: [1, 'up'],
  ArrowDown: [1, 'down'],
  ArrowLeft: [1, 'left'],
  ArrowRight: [1, 'right']
};

let mode = '2p';
let scores = [0, 0];
let bout = 1;
let phase = 'countdown'; // 'countdown' | 'active' | 'point' | 'over'
let countLeft = COUNT_MS;
let pointLeft = 0;
let pointWinner = -1;
let bodies = [];
let particles = [];
let padDir = [null, null];
let keyDir = [null, null];
let keyCode = [null, null];
let dashReq = [false, false];
let dashCd = [0, 0];
let ring = { cx: 0, cy: 0, r: 0 };
let sandGradient = null;
let lastCountLabel = '';
let lastDashOn = [true, true];
let rafId = null;
let lastFrame = 0;
let running = false;

let w = 0;
let h = 0;
let dpr = 1;

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const wrestlerR = () => Math.max(16, Math.min(34, ring.r * 0.15));

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

  const previous = ring.r ? { ...ring } : null;
  w = cssW;
  h = cssH;
  dpr = nextDpr;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ring = { cx: w / 2, cy: h / 2, r: Math.min(w, h) * 0.43 };

  if (previous && previous.r > 0) {
    const k = ring.r / previous.r;
    for (const body of bodies) {
      body.x = ring.cx + (body.x - previous.cx) * k;
      body.y = ring.cy + (body.y - previous.cy) * k;
    }
  }

  sandGradient = ctx.createRadialGradient(ring.cx, ring.cy - ring.r * 0.3, ring.r * 0.1, ring.cx, ring.cy, ring.r);
  sandGradient.addColorStop(0, '#f8ead0');
  sandGradient.addColorStop(0.7, '#f0dfba');
  sandGradient.addColorStop(1, '#e6cfa2');
}

/* ---------- HUD ---------- */

function updateHud() {
  for (let i = 0; i < 2; i += 1) {
    scoreEls[i].textContent = String(scores[i]);
    nameEls[i].textContent = i === 1 && mode === 'ai' ? 'Computer' : PLAYERS[i].name;
    pipsEls[i].querySelectorAll('i').forEach((pip, index) => {
      pip.classList.toggle('is-on', index < scores[i]);
    });
    cardEls[i].classList.toggle('is-active', phase === 'point' && pointWinner === i);
  }
  boutEl.textContent = `Bout ${bout}`;
}

function announce(message) {
  statusEl.textContent = message;
}

function showCount(text, isPoint = false) {
  if (lastCountLabel === text && !isPoint) return;
  lastCountLabel = text;
  countNum.textContent = text;
  countdownEl.classList.toggle('is-point', isPoint);
  countdownEl.hidden = false;
  countNum.style.animation = 'none';
  void countNum.offsetWidth;
  countNum.style.animation = '';
}

function hideCount() {
  countdownEl.hidden = true;
}

/* ---------- bout flow ---------- */

function makeBody(x, y, facingX) {
  return { x, y, vx: 0, vy: 0, fx: facingX, fy: 0 };
}

function startBout() {
  const r = wrestlerR();
  bodies = [
    makeBody(ring.cx - ring.r * 0.45, ring.cy, 1),
    makeBody(ring.cx + ring.r * 0.45, ring.cy, -1)
  ];
  padDir = [null, null];
  keyDir = [null, null];
  dashReq = [false, false];
  dashCd = [0, 0];
  particles = [];
  phase = 'countdown';
  countLeft = COUNT_MS;
  pointWinner = -1;
  lastCountLabel = '';
  showCount('READY');
  updateHud();
  announce(mode === 'ai' ? 'Bout ready. Push the computer out.' : `Bout ${bout} ready.`);
}

function resetMatch() {
  scores = [0, 0];
  bout = 1;
  pointWinner = -1;
  veil.hidden = true;
  startBout();
}

function awardPoint(who) {
  scores[who] += 1;
  pointWinner = who;
  phase = 'point';
  pointLeft = POINT_MS;
  const label = mode === 'ai' && who === 1 ? 'Computer' : PLAYERS[who].name;
  showCount(`${label} scores!`, true);
  updateHud();
  announce(`${label} wins the bout. ${scores[0]} to ${scores[1]}.`);
  if (navigator.vibrate) navigator.vibrate([14, 40, 14]);
}

function endMatch() {
  phase = 'over';
  hideCount();
  const winner = scores[0] > scores[1] ? 0 : 1;
  const label = mode === 'ai' && winner === 1 ? 'Computer' : PLAYERS[winner].name;
  const loser = 1 - winner;

  veilTitle.textContent = `${label} wins!`;
  veilCopy.textContent = `${scores[winner]} to ${scores[loser]} bouts. ${
    winner === 0 ? 'Player 1 controlled the ring.' : mode === 'ai' ? 'The computer held its ground.' : 'Player 2 held the ground.'
  }`;

  veilStats.replaceChildren();
  for (const [term, value] of [
    ['Bouts', scores[winner]],
    ['Player 1', scores[0]],
    ['Player 2', scores[1]]
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
  rematchBtn.focus({ preventScroll: true });
  updateHud();
  announce(`Match over. ${label} wins ${scores[winner]} to ${scores[loser]}.`);
}

/* ---------- input ---------- */

function effectiveDir(index) {
  if (mode === 'ai' && index === 1) return null;
  return padDir[index] || keyDir[index];
}

function requestDash(index) {
  if (phase !== 'active') return;
  if (mode === 'ai' && index === 1) return;
  if (dashCd[index] > 0) return;
  dashReq[index] = true;
}

function syncDash() {
  for (let i = 0; i < 2; i += 1) {
    const on = dashCd[i] <= 0;
    if (on !== lastDashOn[i]) {
      dashButtons[i].style.opacity = on ? '1' : '.45';
      lastDashOn[i] = on;
    }
    const locked = mode === 'ai' && i === 1;
    pads[i].classList.toggle('is-locked', locked);
  }
}

pads.forEach((pad, index) => {
  pad.querySelectorAll('.pad-btn').forEach((button) => {
    const dir = button.dataset.dir;
    let pointerAt = 0;

    button.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      pointerAt = performance.now();
      if (mode === 'ai' && index === 1) return;
      padDir[index] = DIRS[dir];
      button.classList.add('is-pressed');
      try {
        button.setPointerCapture(event.pointerId);
      } catch {
        /* capture optional */
      }
    });

    const release = () => {
      if (padDir[index] && button.classList.contains('is-pressed')) padDir[index] = null;
      button.classList.remove('is-pressed');
    };

    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    button.addEventListener('contextmenu', (event) => event.preventDefault());

    button.addEventListener('click', (event) => {
      if (event.detail !== 0) return;
      if (performance.now() - pointerAt < 500) return;
      if (mode === 'ai' && index === 1) return;
      padDir[index] = DIRS[dir];
      window.setTimeout(() => {
        if (padDir[index] === DIRS[dir]) padDir[index] = null;
      }, 160);
    });
  });
});

dashButtons.forEach((button, index) => {
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    requestDash(index);
  });
  button.addEventListener('click', (event) => {
    if (event.detail !== 0) return;
    requestDash(index);
  });
  button.addEventListener('contextmenu', (event) => event.preventDefault());
});

window.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.code === 'KeyE') {
    event.preventDefault();
    if (!event.repeat) requestDash(0);
    return;
  }
  if (event.code === 'Slash' && mode === '2p') {
    event.preventDefault();
    if (!event.repeat) requestDash(1);
    return;
  }
  const map = KEY_MAP[event.code];
  if (!map) return;
  event.preventDefault();
  const [index, dir] = map;
  if (mode === 'ai' && index === 1) return;
  if (event.repeat) return;
  keyDir[index] = DIRS[dir];
  keyCode[index] = event.code;
});

window.addEventListener('keyup', (event) => {
  const map = KEY_MAP[event.code];
  if (!map) return;
  const [index] = map;
  if (keyCode[index] === event.code) {
    keyDir[index] = null;
    keyCode[index] = null;
  }
});

window.addEventListener('blur', () => {
  padDir = [null, null];
  keyDir = [null, null];
  keyCode = [null, null];
  pads.forEach((pad) => pad.querySelectorAll('.pad-btn').forEach((button) => button.classList.remove('is-pressed')));
});

/* ---------- particles ---------- */

function burst(x, y, amount, color) {
  if (reduced()) return;
  for (let i = 0; i < amount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 110;
    const life = 0.35 + Math.random() * 0.3;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      max: life,
      size: 2 + Math.random() * 3,
      color
    });
  }
  if (particles.length > 200) particles.splice(0, particles.length - 200);
}

/* ---------- loop ---------- */

function update(dt) {
  if (phase === 'countdown') {
    countLeft -= dt * 1000;
    const label = countLeft > 450 ? 'READY' : 'GO!';
    if (label !== lastCountLabel) showCount(label);
    if (countLeft <= 0) {
      phase = 'active';
      hideCount();
      announce('Go! Push your rival out of the ring.');
    }
  } else if (phase === 'active') {
    for (let i = 0; i < 2; i += 1) dashCd[i] = Math.max(0, dashCd[i] - dt);

    const radius = wrestlerR();
    const inputs = [];

    for (let i = 0; i < 2; i += 1) {
      if (mode === 'ai' && i === 1) {
        const move = aiInput(bodies[1], bodies[0], ring, { radius });
        inputs.push(move);
        if (move.dash && dashCd[1] <= 0) dashReq[1] = true;
      } else {
        inputs.push(effectiveDir(i) || { x: 0, y: 0 });
      }
    }

    for (let i = 0; i < 2; i += 1) {
      const input = inputs[i];
      if (input.x || input.y) {
        bodies[i].fx = input.x;
        bodies[i].fy = input.y;
      }
      bodies[i] = stepBody(bodies[i], input, dt);

      if (dashReq[i]) {
        dashReq[i] = false;
        if (dashCd[i] <= 0) {
          const facing = bodies[i].fx || bodies[i].fy
            ? { x: bodies[i].fx, y: bodies[i].fy }
            : { x: bodies[1 - i].x - bodies[i].x, y: bodies[1 - i].y - bodies[i].y };
          const kick = dashImpulse(facing);
          bodies[i].vx += kick.x;
          bodies[i].vy += kick.y;
          dashCd[i] = 1.1;
          burst(bodies[i].x - facing.x * radius, bodies[i].y - facing.y * radius, 8, '#fffdf8');
        }
      }
    }

    const clash = collideBodies(bodies[0], bodies[1], radius);
    bodies[0] = clash.a;
    bodies[1] = clash.b;
    if (clash.hit && clash.impulse > 60) {
      const mx = (bodies[0].x + bodies[1].x) / 2;
      const my = (bodies[0].y + bodies[1].y) / 2;
      burst(mx, my, 6, '#ffb703');
      if (navigator.vibrate) navigator.vibrate(6);
    }

    if (ringOut(bodies[0], ring)) awardPoint(1);
    else if (ringOut(bodies[1], ring)) awardPoint(0);
  } else if (phase === 'point') {
    pointLeft -= dt * 1000;
    if (pointLeft <= 0) {
      if (scores[0] >= TARGET || scores[1] >= TARGET) {
        endMatch();
      } else {
        bout += 1;
        startBout();
      }
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
    p.vx *= 1 - 2.4 * dt;
    p.vy *= 1 - 2.4 * dt;
  }

  syncDash();
}

function drawWrestler(body, info, radius, now) {
  const angle = Math.atan2(body.fy, body.fx);

  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(body.x + 3, body.y + radius * 0.5, radius * 1.02, radius * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // body
  ctx.beginPath();
  ctx.arc(body.x, body.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = info.color;
  ctx.fill();
  ctx.lineWidth = Math.max(2, radius * 0.14);
  ctx.strokeStyle = 'rgba(30, 36, 51, .35)';
  ctx.stroke();

  // shoulder highlight
  ctx.beginPath();
  ctx.arc(body.x, body.y, radius * 0.78, Math.PI * 1.05, Math.PI * 1.7);
  ctx.strokeStyle = 'rgba(255, 255, 255, .45)';
  ctx.lineWidth = Math.max(2, radius * 0.16);
  ctx.lineCap = 'round';
  ctx.stroke();

  // mawashi belt
  ctx.beginPath();
  ctx.arc(body.x, body.y, radius * 0.56, 0, Math.PI * 2);
  ctx.strokeStyle = info.belt;
  ctx.lineWidth = Math.max(3, radius * 0.3);
  ctx.stroke();

  // head toward facing
  const hx = body.x + Math.cos(angle) * radius * 0.5;
  const hy = body.y + Math.sin(angle) * radius * 0.5;
  ctx.beginPath();
  ctx.arc(hx, hy, radius * 0.34, 0, Math.PI * 2);
  ctx.fillStyle = '#f2c9a0';
  ctx.fill();
  ctx.lineWidth = Math.max(1.4, radius * 0.08);
  ctx.strokeStyle = 'rgba(30, 36, 51, .35)';
  ctx.stroke();

  // topknot
  ctx.beginPath();
  ctx.arc(hx - Math.cos(angle) * radius * 0.16, hy - Math.sin(angle) * radius * 0.16, radius * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = '#1e2433';
  ctx.fill();

  // dash-ready sparkle
  if (dashCd[PLAYERS.indexOf(info)] <= 0 && phase === 'active') {
    const sx = body.x + Math.cos(angle + 2.2) * radius * 1.15;
    const sy = body.y + Math.sin(angle + 2.2) * radius * 1.15;
    const tw = 0.65 + Math.sin(now / 180) * 0.35;
    ctx.globalAlpha = tw;
    ctx.fillStyle = '#ffb703';
    ctx.beginPath();
    ctx.arc(sx, sy, radius * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function draw(now) {
  if (!w || !h || !ring.r) return;
  ctx.clearRect(0, 0, w, h);

  const bg = ctx.createRadialGradient(ring.cx, ring.cy, ring.r * 0.4, ring.cx, ring.cy, Math.max(w, h) * 0.75);
  bg.addColorStop(0, '#2b344a');
  bg.addColorStop(1, '#1c2333');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // dohyo
  ctx.beginPath();
  ctx.arc(ring.cx, ring.cy, ring.r, 0, Math.PI * 2);
  ctx.fillStyle = sandGradient || '#f0dfba';
  ctx.fill();

  const near0 = Math.hypot(bodies[0].x - ring.cx, bodies[0].y - ring.cy) > ring.r * 0.8;
  const near1 = bodies[1] && Math.hypot(bodies[1].x - ring.cx, bodies[1].y - ring.cy) > ring.r * 0.8;
  const danger = phase === 'active' && (near0 || near1);

  ctx.lineWidth = Math.max(5, ring.r * 0.055);
  ctx.strokeStyle = danger ? 'rgba(255, 107, 90, .95)' : 'rgba(30, 36, 51, .7)';
  ctx.beginPath();
  ctx.arc(ring.cx, ring.cy, ring.r - ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(30, 36, 51, .16)';
  ctx.beginPath();
  ctx.arc(ring.cx, ring.cy, ring.r * 0.74, 0, Math.PI * 2);
  ctx.stroke();

  // starting lines
  ctx.strokeStyle = 'rgba(255, 253, 248, .75)';
  ctx.lineWidth = Math.max(3, ring.r * 0.03);
  ctx.lineCap = 'round';
  const lineLen = ring.r * 0.34;
  ctx.beginPath();
  ctx.moveTo(ring.cx - lineLen / 2, ring.cy - ring.r * 0.42);
  ctx.lineTo(ring.cx + lineLen / 2, ring.cy - ring.r * 0.42);
  ctx.moveTo(ring.cx - lineLen / 2, ring.cy + ring.r * 0.42);
  ctx.lineTo(ring.cx + lineLen / 2, ring.cy + ring.r * 0.42);
  ctx.stroke();

  const radius = wrestlerR();
  drawWrestler(bodies[0], PLAYERS[0], radius, now);
  drawWrestler(bodies[1], PLAYERS[1], radius, now);

  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max) * 0.9;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function frame(now) {
  if (!running) return;
  if (!lastFrame) lastFrame = now;
  const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  update(dt);
  draw(now);
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

/* ---------- chrome ---------- */

function setMode(next) {
  if (next !== '2p' && next !== 'ai') return;
  if (next === mode) return;
  mode = next;
  modeButtons.forEach((button) => {
    const on = button.dataset.mode === mode;
    button.classList.toggle('is-on', on);
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  softRefresh(stageWrap, () => {
    resetMatch();
    stageWrap.focus({ preventScroll: true });
  });
}

function requestRestart() {
  if (stageWrap.dataset.refreshing === 'true') return;
  softRefresh(stageWrap, () => {
    resetMatch();
    stageWrap.focus({ preventScroll: true });
  });
}

stageWrap.setAttribute('tabindex', '-1');

modeButtons.forEach((button) => {
  button.addEventListener('click', () => setMode(button.dataset.mode));
});

$('reset').addEventListener('click', requestRestart);
rematchBtn.addEventListener('click', requestRestart);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopLoop();
  else startLoop();
});

if ('ResizeObserver' in window) {
  new ResizeObserver(resize).observe(stageWrap);
}
window.addEventListener('resize', resize);

resize();
resetMatch();
startLoop();
