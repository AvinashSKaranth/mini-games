import { softRefresh } from '../../shared/refresh.js';

const $ = (id) => document.getElementById(id);

const ROUND_SECONDS = 30;
const COUNT_MS = 700;
const PULL_IMPULSE = 0.0082;
const TAP_COOLDOWN = 55;
const RHYTHM_WINDOW = 500;
const TEAM_NAMES = ['Team Coral', 'Team Teal'];
const TEAMS = [0, 0, 1, 1];
const TEAM_COLORS = ['#ff6b5a', '#21b6a8'];
const PLAYER_COLORS = ['#ff6b5a', '#e09a00', '#21b6a8', '#7c5cff'];
const KEY_MAP = {
  KeyA: 0,
  Digit1: 0,
  KeyL: 1,
  Digit2: 1,
  KeyG: 2,
  Digit3: 2,
  Semicolon: 3,
  Digit4: 3
};

const ropeWrap = $('rope-wrap');
const canvas = $('rope');
const ctx = canvas.getContext('2d');
const countWrap = $('countdown');
const countNum = $('count-num');
const clockEl = $('clock');
const timerEl = $('timer');
const tapEls = [0, 1, 2, 3].map((i) => $(`taps-${i}`));
const teamEls = [$('team-a'), $('team-b')];
const rhythmEls = [$('rhythm-a'), $('rhythm-b')];
const statusEl = $('status');
const veil = $('veil');
const veilEyebrow = $('veil-eyebrow');
const veilTitle = $('veil-title');
const veilCopy = $('veil-copy');
const podiumEl = $('podium');
const rematchBtn = $('rematch');
const tapButtons = [0, 1, 2, 3].map((i) => document.querySelector(`.tap-btn[data-p="${i}"]`));

const taps = [0, 0, 0, 0];
const combo = [0, 0];
const lastTapAt = [-999, -999, -999, -999];
const lastTeamTouch = [null, null];
const hitTimers = [0, 0, 0, 0];

let phase = 'countdown';
let timeLeft = ROUND_SECONDS;
let countLeft = COUNT_MS * 3;
let goUntil = 0;
let pull = 0;
let lastSec = -1;
let lastLabel = '';
let lastFrame = 0;
let lastTapPulse = -999;
let lastPulseTeam = 0;
let lastHud = '';
let endedBy = '';

let dpr = 1;
let w = 0;
let h = 0;
let lastTeamHud = ['', ''];

const TAU = Math.PI * 2;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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
}

function teamTotal(team) {
  return team === 0 ? taps[0] + taps[1] : taps[2] + taps[3];
}

function updateHud() {
  for (let i = 0; i < 4; i += 1) tapEls[i].textContent = String(taps[i]);
  teamEls[0].textContent = String(teamTotal(0));
  teamEls[1].textContent = String(teamTotal(1));

  for (let team = 0; team < 2; team += 1) {
    const label = combo[team] > 0 ? `+${Math.round(combo[team] * 12)}% rhythm` : '';
    if (label !== lastTeamHud[team]) {
      lastTeamHud[team] = label;
      rhythmEls[team].textContent = label;
    }
  }

  const sec = Math.ceil(timeLeft);
  if (sec !== lastSec) {
    lastSec = sec;
    timerEl.textContent = formatTime(sec);
    timerEl.setAttribute('aria-label', `${sec} seconds remaining`);
    clockEl.classList.toggle('is-low', sec <= 8);
  }
}

function flashButton(player) {
  const button = tapButtons[player];
  if (!button) return;
  button.classList.add('is-hit');
  window.clearTimeout(hitTimers[player]);
  hitTimers[player] = window.setTimeout(() => button.classList.remove('is-hit'), 105);
}

function tap(player) {
  if (phase !== 'playing') return;
  const now = performance.now();
  if (now - lastTapAt[player] < TAP_COOLDOWN) return;
  lastTapAt[player] = now;
  taps[player] += 1;

  const team = TEAMS[player];
  const previous = lastTeamTouch[team];
  if (previous && previous.player !== player && now - previous.time <= RHYTHM_WINDOW) {
    combo[team] = Math.min(5, combo[team] + 1);
  } else {
    combo[team] = 0;
  }
  lastTeamTouch[team] = { player, time: now };

  const direction = team === 0 ? 1 : -1;
  pull = clamp(pull + direction * PULL_IMPULSE * (1 + combo[team] * 0.12), -1, 1);
  lastTapPulse = now;
  lastPulseTeam = team;
  flashButton(player);
  updateHud();

  if (pull >= 1 || pull <= -1) endRound('pull');
}

function buildPodium(order) {
  podiumEl.replaceChildren();
  order.forEach((row, index) => {
    const li = document.createElement('li');
    li.style.setProperty('--accent', TEAM_COLORS[row.team]);

    const placeEl = document.createElement('span');
    placeEl.className = 'podium-place';
    placeEl.textContent = `#${index + 1}`;

    const nameEl = document.createElement('span');
    nameEl.className = 'podium-name';
    const dot = document.createElement('i');
    dot.className = 'dot';
    nameEl.append(dot, document.createTextNode(TEAM_NAMES[row.team]));

    const noteEl = document.createElement('span');
    noteEl.className = 'podium-note';
    noteEl.textContent = `${row.total} taps`;

    li.append(placeEl, nameEl, noteEl);
    podiumEl.append(li);
  });
}

function endRound(reason) {
  if (phase === 'over') return;
  phase = 'over';
  endedBy = reason;
  goUntil = 0;
  countWrap.hidden = true;
  for (let i = 0; i < 4; i += 1) {
    window.clearTimeout(hitTimers[i]);
    tapButtons[i].classList.remove('is-hit');
  }

  const totals = [teamTotal(0), teamTotal(1)];
  let winner = null;
  if (pull > 0.001) winner = 0;
  else if (pull < -0.001) winner = 1;

  const order = winner === null
    ? [{ team: 0, total: totals[0] }, { team: 1, total: totals[1] }]
    : [
        { team: winner, total: totals[winner] },
        { team: 1 - winner, total: totals[1 - winner] }
      ];

  buildPodium(order);

  const split = `P1 ${taps[0]}, P2 ${taps[1]} against P3 ${taps[2]}, P4 ${taps[3]}`;
  if (winner === null) {
    veilEyebrow.textContent = 'Dead heat';
    veilTitle.textContent = 'It\u2019s a tie!';
    veilCopy.textContent = 'Nothing separated the two teams.';
    announce(`Round over. It's a tie at ${totals[0]} taps each. ${split}.`);
  } else {
    veilEyebrow.textContent = reason === 'time' ? 'Time up' : 'Round complete';
    veilTitle.textContent = `${TEAM_NAMES[winner]} wins!`;
    veilCopy.textContent = reason === 'time'
      ? `${totals[winner]} to ${totals[1 - winner]} taps at the buzzer.`
      : `${totals[winner]} to ${totals[1 - winner]} taps \u2014 the knot crossed the line.`;
    announce(`Round over. ${TEAM_NAMES[winner]} wins with ${totals[winner]} taps to ${totals[1 - winner]}. ${split}.`);
  }

  veil.hidden = false;
  rematchBtn.focus({ preventScroll: true });
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
  goUntil = now + 480;
  showCount('GO!');
  announce('Go! Tap your button. Alternate with your teammate for a rhythm bonus.');
}

function resetRound() {
  phase = 'countdown';
  timeLeft = ROUND_SECONDS;
  countLeft = COUNT_MS * 3;
  goUntil = 0;
  pull = 0;
  lastSec = -1;
  lastLabel = '';
  lastHud = '';
  lastTeamHud = ['', ''];
  lastTapPulse = -999;
  endedBy = '';
  taps.fill(0);
  combo.fill(0);
  lastTapAt.fill(-999);
  lastTeamTouch[0] = null;
  lastTeamTouch[1] = null;
  for (let i = 0; i < 4; i += 1) {
    window.clearTimeout(hitTimers[i]);
    tapButtons[i].classList.remove('is-hit');
    tapButtons[i].disabled = false;
  }

  veil.hidden = true;
  podiumEl.replaceChildren();
  countWrap.hidden = false;
  countWrap.classList.remove('is-go');
  showCount('3');
  updateHud();
  announce('Tug of War, two against two. 3, 2, 1. First team to pull the knot over the line wins.');
}

function ropeYAt(x) {
  const t = w ? x / w : 0.5;
  return h * 0.53 + Math.sin(t * Math.PI) * h * 0.035;
}

function draw(now) {
  if (!w || !h) return;
  const cx = w / 2;
  const cy = h / 2;
  const ropeY = h * 0.53;
  const knotX = cx - pull * (w * 0.37);

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#fffdf8');
  bg.addColorStop(1, '#efe5d6');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(255, 107, 90, .07)';
  ctx.fillRect(0, 0, cx, h);
  ctx.fillStyle = 'rgba(33, 182, 168, .07)';
  ctx.fillRect(cx, 0, cx, h);

  const winA = cx - w * 0.37;
  const winB = cx + w * 0.37;
  for (const [x, color] of [[winA, '#ff6b5a'], [winB, '#21b6a8']]) {
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, h * 0.24);
    ctx.lineTo(x, h * 0.82);
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = 'rgba(30, 36, 51, .18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, h * 0.18);
  ctx.lineTo(cx, h * 0.86);
  ctx.stroke();

  // Rope: a thick braided line with a little sag.
  const leftY = ropeYAt(0);
  const rightY = ropeYAt(w);
  const midY = ropeYAt(cx);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, leftY);
  ctx.quadraticCurveTo(cx, midY + h * 0.05, w, rightY);
  ctx.strokeStyle = '#8b5a3c';
  ctx.lineWidth = Math.max(8, h * 0.1);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, leftY);
  ctx.quadraticCurveTo(cx, midY + h * 0.05, w, rightY);
  ctx.strokeStyle = '#d9a86c';
  ctx.lineWidth = Math.max(4, h * 0.055);
  ctx.stroke();

  ctx.save();
  ctx.setLineDash([3, Math.max(5, h * 0.055)]);
  ctx.beginPath();
  ctx.moveTo(0, leftY);
  ctx.quadraticCurveTo(cx, midY + h * 0.05, w, rightY);
  ctx.strokeStyle = 'rgba(91, 57, 34, .55)';
  ctx.lineWidth = Math.max(1, h * 0.012);
  ctx.stroke();
  ctx.restore();

  const knotY = ropeYAt(knotX) + h * 0.025;
  const pulseAge = now - lastTapPulse;
  if (pulseAge >= 0 && pulseAge < 300) {
    const t = pulseAge / 300;
    ctx.save();
    ctx.globalAlpha = (1 - t) * 0.55;
    ctx.strokeStyle = TEAM_COLORS[lastPulseTeam];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(knotX, knotY, h * (0.12 + t * 0.1), 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  const knotR = Math.max(11, h * 0.13);
  ctx.save();
  ctx.fillStyle = 'rgba(30, 36, 51, .2)';
  ctx.beginPath();
  ctx.ellipse(knotX + 2, knotY + 4, knotR, knotR * 0.72, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(knotX, knotY, knotR, 0, TAU);
  ctx.fillStyle = '#fffdf8';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#1e2433';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(knotX, knotY, knotR * 0.5, 0, TAU);
  ctx.fillStyle = pull >= 0 ? TEAM_COLORS[0] : TEAM_COLORS[1];
  ctx.fill();

  ctx.beginPath();
  ctx.arc(knotX, knotY, knotR * 0.16, 0, TAU);
  ctx.fillStyle = '#fffdf8';
  ctx.fill();

  // Pull chevrons beside the knot.
  const dir = pull >= 0 ? -1 : 1;
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = pull >= 0 ? TEAM_COLORS[0] : TEAM_COLORS[1];
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let i = 1; i <= 2; i += 1) {
    const x = knotX + dir * (knotR + 10 + i * 9);
    const size = h * 0.05;
    ctx.beginPath();
    ctx.moveTo(x + dir * size, knotY - size);
    ctx.lineTo(x, knotY);
    ctx.lineTo(x + dir * size, knotY + size);
    ctx.stroke();
  }
  ctx.restore();

  // Small finish pennants.
  for (const [x, color] of [[winA, '#ff6b5a'], [winB, '#21b6a8']]) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, h * 0.16);
    ctx.lineTo(x + (x < cx ? 20 : -20), h * 0.21);
    ctx.lineTo(x, h * 0.26);
    ctx.closePath();
    ctx.fill();
  }

  const sec = Math.ceil(timeLeft);
  if (sec <= 8 && phase === 'playing') {
    ctx.save();
    ctx.globalAlpha = 0.1 + Math.sin(now / 180) * 0.04;
    ctx.fillStyle = '#ff6b5a';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
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
    pull -= pull * 0.06 * dt;
    if (pull > -1 && pull < 1) {
      // Keep a tiny dead-zone removal so long rounds still settle.
      if (Math.abs(pull) < 0.0004) pull = 0;
    }
    if (goUntil && now > goUntil) {
      goUntil = 0;
      countWrap.hidden = true;
    }

    for (let team = 0; team < 2; team += 1) {
      const touch = lastTeamTouch[team];
      if (touch && combo[team] > 0 && now - touch.time > RHYTHM_WINDOW) {
        combo[team] = 0;
      }
    }

    updateHud();
    if (timeLeft <= 0) endRound('time');
  }

  const hudKey = `${taps[0]}|${taps[1]}|${taps[2]}|${taps[3]}|${combo[0]}|${combo[1]}`;
  if (hudKey !== lastHud) {
    lastHud = hudKey;
    updateHud();
  }
}

function frame(now) {
  if (!lastFrame) lastFrame = now;
  const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  update(dt, now);
  draw(now);
  requestAnimationFrame(frame);
}

// Input: tap buttons
tapButtons.forEach((button, i) => {
  let pointerAt = 0;
  button.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    pointerAt = performance.now();
    tap(i);
  });
  button.addEventListener('click', (event) => {
    if (event.detail !== 0) return;
    if (performance.now() - pointerAt < 500) return;
    tap(i);
  });
  button.addEventListener('contextmenu', (event) => event.preventDefault());
});

window.addEventListener('keydown', (event) => {
  const player = KEY_MAP[event.code];
  if (player === undefined) return;
  if (event.ctrlKey || event.altKey || event.metaKey) return;
  event.preventDefault();
  if (event.repeat) return;
  tap(player);
});

// Round flow
function restartRound() {
  return softRefresh(ropeWrap, resetRound);
}

$('reset').addEventListener('click', () => {
  restartRound();
});

rematchBtn.addEventListener('click', async () => {
  await restartRound();
  canvas.focus({ preventScroll: true });
});

if ('ResizeObserver' in window) {
  new ResizeObserver(resize).observe(ropeWrap);
} else {
  window.addEventListener('resize', resize);
}
window.addEventListener('resize', resize);

resize();
resetRound();
requestAnimationFrame(frame);
