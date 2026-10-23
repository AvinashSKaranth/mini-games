import { softRefresh } from '../../shared/refresh.js';

const $ = (id) => document.getElementById(id);

const canvas = $('arena');
const ctx = canvas.getContext('2d');
const arenaBlock = $('arena-block');
const controls = document.querySelector('.controls');
const countdownEl = $('countdown');
const countdownNum = $('countdown-num');
const roundOverlay = $('round-overlay');
const roundEyebrow = $('round-eyebrow');
const roundTitle = $('round-title');
const roundCopy = $('round-copy');
const nextRoundBtn = $('next-round');
const veil = $('match-veil');
const veilTitle = $('veil-title');
const veilCopy = $('veil-copy');
const statusEl = $('status');
const roundLabel = $('round-label');
const winsEls = [$('wins-1'), $('wins-2')];
const scoreEls = [$('score-1'), $('score-2')];
const playerEls = [$('player-1'), $('player-2')];

const COLS = 19;
const ROWS = 19;
const TICK_MS = 115;
const TARGET_WINS = 2;
const FOOD_TARGET = 2;
const FOOD_POINTS = 10;
const COUNTDOWN_MS = 2400;
const MID = Math.floor(ROWS / 2);

const COLORS = [
  { name: 'Player 1', body: '#ff6b5a', glow: 'rgba(255, 107, 90, .85)' },
  { name: 'Player 2', body: '#21b6a8', glow: 'rgba(33, 182, 168, .85)' }
];

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

const KEYMAP = {
  w: [0, 'up'],
  a: [0, 'left'],
  s: [0, 'down'],
  d: [0, 'right'],
  arrowup: [1, 'up'],
  arrowleft: [1, 'left'],
  arrowdown: [1, 'down'],
  arrowright: [1, 'right']
};

const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

let snakes = [];
let foods = [];
let wins = [0, 0];
let points = [0, 0];
let roundNo = 1;
let lastRoundDecided = false;
let phase = 'countdown';
let countdownMs = COUNTDOWN_MS;
let countdownShown = null;
let accumulator = 0;
let lastFrame = performance.now();
let paused = false;
let cssSize = 0;

function key(cell) {
  return `${cell.x},${cell.y}`;
}

function same(a, b) {
  return a.x === b.x && a.y === b.y;
}

function createSnake(index) {
  return index === 0
    ? {
        dir: { ...DIRS.right },
        queue: [],
        body: [{ x: 3, y: MID }, { x: 2, y: MID }, { x: 1, y: MID }],
        alive: true
      }
    : {
        dir: { ...DIRS.left },
        queue: [],
        body: [{ x: 15, y: MID }, { x: 16, y: MID }, { x: 17, y: MID }],
        alive: true
      };
}

function spawnFood() {
  const taken = new Set(foods.map(key));
  for (const snake of snakes) {
    for (const segment of snake.body) taken.add(key(segment));
  }

  const free = [];
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (!taken.has(`${x},${y}`)) free.push({ x, y });
    }
  }

  if (!free.length) return false;
  foods.push(free[Math.floor(Math.random() * free.length)]);
  return true;
}

function renderHud() {
  roundLabel.textContent = `Round ${roundNo}`;
  winsEls.forEach((el, i) => { el.textContent = String(wins[i]); });
  scoreEls.forEach((el, i) => { el.textContent = String(points[i]); });
  playerEls.forEach((el, i) => {
    el.classList.toggle('is-out', phase !== 'playing' && phase !== 'countdown' && snakes[i] && !snakes[i].alive);
  });
}

function updateCountdown() {
  const n = Math.max(1, Math.ceil(countdownMs / (COUNTDOWN_MS / 3)));
  if (n === countdownShown) return;
  countdownShown = n;
  countdownNum.textContent = String(n);
  countdownNum.classList.remove('pop');
  void countdownNum.offsetWidth;
  countdownNum.classList.add('pop');
}

function startRound() {
  snakes = [createSnake(0), createSnake(1)];
  foods = [];
  for (let i = 0; i < FOOD_TARGET; i += 1) spawnFood();

  phase = 'countdown';
  countdownMs = COUNTDOWN_MS;
  countdownShown = null;
  accumulator = 0;
  lastFrame = performance.now();
  countdownEl.hidden = false;
  roundOverlay.hidden = true;
  veil.hidden = true;
  updateCountdown();
  renderHud();
  statusEl.textContent = `Round ${roundNo}. Get ready.`;
  draw(performance.now());
}

function beginPlaying() {
  phase = 'playing';
  countdownEl.hidden = true;
  accumulator = 0;
  lastFrame = performance.now();
  renderHud();
  statusEl.textContent = `Go! Round ${roundNo}. Player 1 has ${points[0]} points, Player 2 has ${points[1]}.`;
}

function turn(player, dirName) {
  if (phase !== 'playing' && phase !== 'countdown') return;
  const snake = snakes[player];
  const dir = DIRS[dirName];
  if (!snake || !snake.alive || !dir) return;

  const last = snake.queue.length ? snake.queue[snake.queue.length - 1] : snake.dir;
  if (dir.x === last.x && dir.y === last.y) return;
  if (dir.x === -last.x && dir.y === -last.y) return;
  if (snake.queue.length < 2) snake.queue.push(dir);
}

function step() {
  for (const snake of snakes) {
    if (!snake.alive || !snake.queue.length) continue;
    const dir = snake.queue.shift();
    if (dir.x === -snake.dir.x && dir.y === -snake.dir.y) continue;
    snake.dir = dir;
  }

  const heads = snakes.map((snake) => ({
    x: snake.body[0].x + snake.dir.x,
    y: snake.body[0].y + snake.dir.y
  }));

  const willEat = heads.map((head) => foods.some((food) => same(food, head)));

  const solids = snakes.map((snake, i) => {
    const set = new Set();
    const tail = snake.body.length - 1;
    snake.body.forEach((segment, index) => {
      if (index === tail && !willEat[i]) return;
      set.add(key(segment));
    });
    return set;
  });

  const dead = [false, false];

  for (let i = 0; i < 2; i += 1) {
    const head = heads[i];
    if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) {
      dead[i] = true;
      continue;
    }
    if (solids[i].has(key(head)) || solids[1 - i].has(key(head))) {
      dead[i] = true;
      continue;
    }
    if (same(head, heads[1 - i])) dead[i] = true;
  }

  if (dead[0] || dead[1]) {
    snakes.forEach((snake, i) => { if (dead[i]) snake.alive = false; });
    endRound(dead[0] && dead[1] ? null : (dead[0] ? 1 : 0));
    return;
  }

  for (let i = 0; i < 2; i += 1) {
    const head = heads[i];
    snakes[i].body.unshift(head);
    const foodIndex = foods.findIndex((food) => same(food, head));
    if (foodIndex >= 0) {
      foods.splice(foodIndex, 1);
      points[i] += FOOD_POINTS;
    } else {
      snakes[i].body.pop();
    }
  }

  while (foods.length < FOOD_TARGET) {
    if (!spawnFood()) break;
  }
  renderHud();
}

function endRound(winner) {
  phase = 'roundover';
  lastRoundDecided = winner !== null;

  if (winner === null) {
    roundEyebrow.textContent = `Round ${roundNo}`;
    roundTitle.textContent = 'Round drawn';
    roundCopy.textContent = `Both snakes fell. Match score ${wins[0]} – ${wins[1]}.`;
    nextRoundBtn.textContent = 'Replay round';
    statusEl.textContent = `Round ${roundNo} is a draw. Match score ${wins[0]} to ${wins[1]}. Player 1 ${points[0]} points, Player 2 ${points[1]} points.`;
    roundOverlay.hidden = false;
    renderHud();
    return;
  }

  wins[winner] += 1;
  const name = COLORS[winner].name;

  if (wins[winner] >= TARGET_WINS) {
    phase = 'matchover';
    renderHud();
    showMatch(winner);
    return;
  }

  roundEyebrow.textContent = `Round ${roundNo}`;
  roundTitle.textContent = `${name} wins the round!`;
  roundCopy.textContent = `Match score ${wins[0]} – ${wins[1]} · ${points[0]}–${points[1]} pts`;
  nextRoundBtn.textContent = 'Next round';
  roundOverlay.hidden = false;
  renderHud();
  statusEl.textContent = `${name} wins round ${roundNo}. Match score ${wins[0]} to ${wins[1]}. Player 1 ${points[0]} points, Player 2 ${points[1]} points.`;
}

function showMatch(winner) {
  const name = COLORS[winner].name;
  veilTitle.textContent = `${name} wins the match!`;
  veilCopy.textContent = `${wins[0]} – ${wins[1]} in ${roundNo} ${roundNo === 1 ? 'round' : 'rounds'} · ${points[0]}–${points[1]} points.`;
  veil.hidden = false;
  requestAnimationFrame(() => $('rematch').focus({ preventScroll: true }));
  statusEl.textContent = `${name} wins the match ${wins[0]} to ${wins[1]}.`;
}

function startNextRound() {
  if (phase !== 'roundover') return;
  softRefresh(arenaBlock, () => {
    if (lastRoundDecided) roundNo += 1;
    startRound();
  });
}

function newMatch() {
  softRefresh(arenaBlock, () => {
    wins = [0, 0];
    points = [0, 0];
    roundNo = 1;
    lastRoundDecided = false;
    startRound();
  });
}

function roundRectPath(context, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

function syncCanvas() {
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 1) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2.5);
  const px = Math.round(rect.width * ratio);
  if (canvas.width !== px || canvas.height !== px) {
    canvas.width = px;
    canvas.height = px;
  }
  cssSize = rect.width;
  const scale = canvas.width / cssSize;
  ctx.setTransform(scale, 0, 0, canvas.height / cssSize, 0, 0);
}

function drawFood(cell, time) {
  for (const food of foods) {
    const cx = (food.x + 0.5) * cell;
    const cy = (food.y + 0.5) * cell;
    const pulse = reducedMotion ? 0 : Math.sin(time * 3 + food.x * 0.7) * 0.06;
    const r = cell * (0.3 + pulse);

    ctx.save();
    ctx.shadowColor = 'rgba(255, 183, 3, .9)';
    ctx.shadowBlur = cell * (0.8 + pulse * 2);
    ctx.fillStyle = '#ffb703';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 255, 255, .72)';
    ctx.beginPath();
    ctx.arc(cx - r * 0.32, cy - r * 0.34, r * 0.26, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#7bd88f';
    ctx.beginPath();
    ctx.ellipse(cx + r * 0.34, cy - r * 0.88, r * 0.34, r * 0.17, -0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSnake(snake, index, cell, time) {
  const color = COLORS[index];
  const dim = !snake.alive;
  const inset = cell * 0.07;
  const bodySize = cell - inset * 2;
  const radius = Math.max(2, cell * 0.3);

  if (snake.body.length > 1) {
    ctx.save();
    if (dim) ctx.globalAlpha = 0.4;
    ctx.strokeStyle = color.body;
    ctx.lineWidth = bodySize * 0.68;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    snake.body.forEach((segment, i) => {
      const x = (segment.x + 0.5) * cell;
      const y = (segment.y + 0.5) * cell;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  if (dim) ctx.globalAlpha = 0.4;
  ctx.shadowColor = color.glow;
  ctx.shadowBlur = dim ? cell * 0.25 : cell * (0.7 + (reducedMotion ? 0 : Math.sin(time * 2.4 + index) * 0.12));
  ctx.fillStyle = color.body;
  ctx.beginPath();
  for (const segment of snake.body) {
    roundRectPath(ctx, segment.x * cell + inset, segment.y * cell + inset, bodySize, bodySize, radius);
  }
  ctx.fill();
  ctx.restore();

  const head = snake.body[0];
  const cx = (head.x + 0.5) * cell;
  const cy = (head.y + 0.5) * cell;
  const headRadius = cell * 0.46;

  ctx.save();
  if (dim) ctx.globalAlpha = 0.48;
  ctx.shadowColor = color.glow;
  ctx.shadowBlur = cell * 0.55;
  ctx.fillStyle = color.body;
  ctx.beginPath();
  ctx.arc(cx, cy, headRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const dir = snake.dir;
  const sideX = -dir.y;
  const sideY = dir.x;
  const eyeR = Math.max(1, cell * 0.105);

  for (const sign of [-1, 1]) {
    const ex = cx + dir.x * cell * 0.14 + sideX * sign * cell * 0.17;
    const ey = cy + dir.y * cell * 0.14 + sideY * sign * cell * 0.17;

    if (snake.alive) {
      ctx.fillStyle = '#fffdf8';
      ctx.beginPath();
      ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e2433';
      ctx.beginPath();
      ctx.arc(ex + dir.x * eyeR * 0.4, ey + dir.y * eyeR * 0.4, eyeR * 0.52, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#fffdf8';
      ctx.lineWidth = Math.max(1, cell * 0.075);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - eyeR, ey - eyeR);
      ctx.lineTo(ex + eyeR, ey + eyeR);
      ctx.moveTo(ex + eyeR, ey - eyeR);
      ctx.lineTo(ex - eyeR, ey + eyeR);
      ctx.stroke();
    }
  }
}

function draw(now) {
  if (!cssSize) syncCanvas();
  if (!cssSize) return;

  const size = cssSize;
  const cell = size / COLS;
  const time = reducedMotion ? 0 : now / 1000;

  ctx.clearRect(0, 0, size, size);

  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, '#232b3e');
  bg.addColorStop(1, '#151a27');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(255, 255, 255, .055)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < COLS; i += 1) {
    const p = i * cell;
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
  }
  ctx.stroke();

  const vignette = ctx.createRadialGradient(size / 2, size / 2, size * 0.18, size / 2, size / 2, size * 0.76);
  vignette.addColorStop(0, 'rgba(255, 255, 255, .03)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, .3)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, size, size);

  drawFood(cell, time);
  snakes.forEach((snake, i) => drawSnake(snake, i, cell, time));
}

function frame(now) {
  requestAnimationFrame(frame);
  if (paused || document.hidden) {
    lastFrame = now;
    return;
  }

  let delta = now - lastFrame;
  lastFrame = now;
  if (!Number.isFinite(delta) || delta < 0 || delta > 250) delta = 0;

  if (phase === 'countdown') {
    countdownMs -= delta;
    if (countdownMs <= 0) beginPlaying();
    else updateCountdown();
  } else if (phase === 'playing') {
    accumulator += delta;
    let steps = 0;
    while (accumulator >= TICK_MS && steps < 4 && phase === 'playing') {
      accumulator -= TICK_MS;
      step();
      steps += 1;
    }
    if (steps === 4) accumulator = 0;
  }

  draw(now);
}

function pressFeedback(button) {
  button.classList.add('is-pressed');
  window.setTimeout(() => button.classList.remove('is-pressed'), 100);
}

window.addEventListener('keydown', (event) => {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
  const move = KEYMAP[event.key.toLowerCase()];
  if (!move) return;
  event.preventDefault();
  turn(move[0], move[1]);
});

controls.addEventListener('pointerdown', (event) => {
  const button = event.target.closest('.dpad-btn');
  if (!button) return;
  event.preventDefault();
  pressFeedback(button);
  turn(Number(button.dataset.player), button.dataset.dir);
});

controls.addEventListener('click', (event) => {
  if (event.detail !== 0) return;
  const button = event.target.closest('.dpad-btn');
  if (!button) return;
  pressFeedback(button);
  turn(Number(button.dataset.player), button.dataset.dir);
});

controls.addEventListener('contextmenu', (event) => event.preventDefault());

nextRoundBtn.addEventListener('click', startNextRound);
$('reset').addEventListener('click', newMatch);
$('rematch').addEventListener('click', newMatch);

document.addEventListener('visibilitychange', () => {
  paused = document.hidden;
  if (!paused) {
    lastFrame = performance.now();
    accumulator = 0;
  }
});

new ResizeObserver(() => {
  syncCanvas();
  draw(performance.now());
}).observe(canvas);

syncCanvas();
startRound();
requestAnimationFrame(frame);
