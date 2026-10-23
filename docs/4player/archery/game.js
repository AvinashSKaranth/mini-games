import { softRefresh } from '../../shared/refresh.js';
import { accuracyFrom, nextWind, rankPlayers, resolveShot, windDrift } from './engine.js';

const $ = (id) => document.getElementById(id);
const SVG_NS = 'http://www.w3.org/2000/svg';

const PLAYERS = [
  { name: 'Player 1', short: 'P1', color: '#ff6b5a' },
  { name: 'Player 2', short: 'P2', color: '#21b6a8' },
  { name: 'Player 3', short: 'P3', color: '#7c5cff' },
  { name: 'Player 4', short: 'P4', color: '#3d6fb4' }
];
const ROUNDS = 5;
const RESULT_MS = 1300;
const METER_SPEED = 148;
const VIEW_MIN = -4;
const VIEW_SIZE = 112;

const rangeEl = $('range');
const target = $('target');
const arrowsEl = $('arrows');
const ghostEl = $('ghost');
const crosshairEl = $('crosshair');
const badge = $('range-badge');
const turnEl = $('turn');
const windChip = $('wind-chip');
const windDir = $('wind-dir');
const windValue = $('wind-value');
const meterMarker = $('meter-marker');
const shootBtn = $('shoot');
const shootLabel = $('shoot-label');
const statusEl = $('status');
const veil = $('veil');
const veilTitle = $('veil-title');
const veilCopy = $('veil-copy');
const veilEyebrow = $('veil-eyebrow');
const podiumEl = $('podium');
const resetBtn = $('reset');
const rematchBtn = $('rematch');

const cards = PLAYERS.map((_, index) => $(`card-${index}`));
const totalsEl = PLAYERS.map((_, index) => $(`total-${index}`));
const bullsEl = PLAYERS.map((_, index) => $(`bulls-${index}`));

let round = 1;
let turn = 0;
let phase = 'aim';
let wind = 0;
let aim = { x: 50, y: 50 };
let marker = 50;
let direction = 1;
let totals = [0, 0, 0, 0];
let bulls = [0, 0, 0, 0];
let rafId = 0;
let lastFrame = 0;
let turnTimer = 0;
let token = 0;
let dragging = false;

const reducedMotion = () =>
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

function clampAim(x, y) {
  const dx = x - 50;
  const dy = y - 50;
  const distance = Math.hypot(dx, dy);
  const max = 48;
  if (distance <= max || distance === 0) return { x, y };
  return { x: 50 + (dx / distance) * max, y: 50 + (dy / distance) * max };
}

function renderAim() {
  crosshairEl.setAttribute('transform', `translate(${(aim.x - 50).toFixed(2)} ${(aim.y - 50).toFixed(2)})`);
  const drift = windDrift(wind);
  ghostEl.setAttribute(
    'transform',
    `translate(${(aim.x + drift - 50).toFixed(2)} ${(aim.y - 50).toFixed(2)})`
  );
  ghostEl.dataset.active = wind === 0 ? 'false' : 'true';
}

function renderWind() {
  const strength = Math.abs(wind);
  windDir.textContent = wind === 0 ? '·' : wind < 0 ? '←' : '→';
  windValue.textContent = String(strength);
  windChip.dataset.direction = wind === 0 ? 'calm' : wind < 0 ? 'left' : 'right';
  windChip.setAttribute(
    'aria-label',
    wind === 0 ? 'No wind' : `Wind ${strength} step${strength === 1 ? '' : 's'} to the ${wind < 0 ? 'left' : 'right'}`
  );
}

function renderMeter() {
  meterMarker.style.left = `${marker}%`;
  meterMarker.dataset.hot = Math.abs(marker - 50) <= 8 ? 'true' : 'false';
}

function renderScores() {
  totals.forEach((total, index) => {
    totalsEl[index].textContent = String(total);
    bullsEl[index].textContent = String(bulls[index]);
    cards[index].classList.toggle('is-turn', index === turn && veil.hidden);
  });
}

function renderTurn() {
  const player = PLAYERS[turn];
  turnEl.textContent = `${player.name} · Round ${Math.min(round, ROUNDS)} of ${ROUNDS}`;
  turnEl.style.setProperty('--accent', player.color);
  target.style.setProperty('--accent', player.color);
  cards.forEach((card, index) => card.classList.toggle('is-turn', index === turn));
}

function setPhase(next) {
  phase = next;
  shootBtn.dataset.phase = next;
  shootBtn.disabled = next === 'result' || next === 'done';
  shootLabel.textContent = next === 'power' ? 'Release' : next === 'result' ? 'Nice shot' : 'Set aim';
}

function setAim(x, y) {
  if (phase !== 'aim') return;
  aim = clampAim(x, y);
  renderAim();
}

function startMeter() {
  marker = 0;
  direction = 1;
  setPhase('power');
  renderMeter();
  lastFrame = performance.now();
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(tick);
}

function stopMeter() {
  cancelAnimationFrame(rafId);
  rafId = 0;
}

function tick(now) {
  if (phase !== 'power' || document.hidden) return;
  const delta = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  marker += direction * METER_SPEED * delta;
  if (marker >= 100) {
    marker = 100;
    direction = -1;
  } else if (marker <= 0) {
    marker = 0;
    direction = 1;
  }
  renderMeter();
  rafId = requestAnimationFrame(tick);
}

function addArrow(shot, color) {
  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('class', 'arrow');

  const dx = shot.x - 50;
  const dy = shot.y - 50;
  const distance = Math.hypot(dx, dy) || 1;
  const tail = document.createElementNS(SVG_NS, 'line');
  tail.setAttribute('x1', (shot.x + (dx / distance) * 11).toFixed(2));
  tail.setAttribute('y1', (shot.y + (dy / distance) * 11).toFixed(2));
  tail.setAttribute('x2', shot.x.toFixed(2));
  tail.setAttribute('y2', shot.y.toFixed(2));
  tail.setAttribute('stroke', color);

  const dot = document.createElementNS(SVG_NS, 'circle');
  dot.setAttribute('cx', shot.x.toFixed(2));
  dot.setAttribute('cy', shot.y.toFixed(2));
  dot.setAttribute('r', '3.4');
  dot.setAttribute('fill', color);

  group.append(tail, dot);
  arrowsEl.appendChild(group);

  if (!reducedMotion() && typeof group.animate === 'function') {
    group.animate(
      [
        { opacity: 0, transform: 'scale(.5)' },
        { opacity: 1, transform: 'scale(1)' }
      ],
      { duration: 220, easing: 'cubic-bezier(.2, 1.4, .4, 1)' }
    );
  }
}

function showBadge(shot, player) {
  badge.hidden = false;
  badge.style.setProperty('--accent', player.color);
  badge.textContent = shot.onTarget ? `${player.short} · ${shot.score}` : `${player.short} · miss`;
  badge.dataset.miss = shot.onTarget ? 'false' : 'true';
}

function beginTurn() {
  renderTurn();
  renderScores();
  wind = nextWind();
  marker = 50;
  direction = 1;
  aim = { x: 50, y: 50 };
  badge.hidden = true;
  setPhase('aim');
  renderWind();
  renderAim();
  renderMeter();
  statusEl.textContent = `${PLAYERS[turn].name}'s shot, round ${round} of ${ROUNDS}. Aim, then shoot.`;
}

function fire() {
  if (phase !== 'power') return;
  stopMeter();

  const player = PLAYERS[turn];
  const shot = resolveShot({ aimX: aim.x, aimY: aim.y, wind, accuracy: accuracyFrom(marker) });

  totals[turn] += shot.score;
  if (shot.score === 10) bulls[turn] += 1;

  addArrow(shot, player.color);
  showBadge(shot, player);
  setPhase('result');
  renderScores();
  statusEl.textContent = shot.onTarget
    ? `${player.name} scores ${shot.score}.`
    : `${player.name} misses the target.`;

  const myToken = token;
  window.clearTimeout(turnTimer);
  turnTimer = window.setTimeout(() => {
    if (myToken !== token) return;
    advanceTurn();
  }, RESULT_MS);
}

function advanceTurn() {
  turn += 1;
  if (turn >= PLAYERS.length) {
    turn = 0;
    round += 1;
  }

  if (round > ROUNDS) {
    finishMatch();
    return;
  }

  if (turn === 0) arrowsEl.replaceChildren();
  beginTurn();
}

function finishMatch() {
  token += 1;
  stopMeter();
  setPhase('done');
  const ranking = rankPlayers(totals, bulls);
  const top = ranking[0].total;

  podiumEl.replaceChildren();
  ranking.forEach((entry, place) => {
    const item = document.createElement('li');
    item.className = 'podium-row';
    item.style.setProperty('--accent', PLAYERS[entry.index].color);
    item.innerHTML = `<span class="podium-place">${place + 1}</span>
      <span class="podium-name">${PLAYERS[entry.index].name}</span>
      <span class="podium-score">${entry.total}</span>`;
    podiumEl.appendChild(item);
  });

  const winners = ranking.filter((entry) => entry.total === top);
  if (winners.length > 1) {
    veilEyebrow.textContent = 'Dead heat';
    veilTitle.textContent = 'It’s a tie!';
    veilCopy.textContent = `${winners.map((entry) => PLAYERS[entry.index].name).join(' and ')} share ${top} points.`;
  } else {
    veilEyebrow.textContent = 'Five rounds gone';
    veilTitle.textContent = `${PLAYERS[winners[0].index].name} wins!`;
    veilCopy.textContent = `${top} points with ${bulls[winners[0].index]} bullseye${bulls[winners[0].index] === 1 ? '' : 's'}.`;
  }

  veil.hidden = false;
  statusEl.textContent = `${veilTitle.textContent} ${veilCopy.textContent}`;
  rematchBtn.focus({ preventScroll: true });
}

function handleShoot() {
  if (!veil.hidden) return;
  if (phase === 'aim') startMeter();
  else if (phase === 'power') fire();
}

function resetMatch() {
  token += 1;
  window.clearTimeout(turnTimer);
  stopMeter();
  round = 1;
  turn = 0;
  totals = [0, 0, 0, 0];
  bulls = [0, 0, 0, 0];
  arrowsEl.replaceChildren();
  veil.hidden = true;
  beginTurn();
}

/* ---------- input ---------- */

function toTargetCoords(event) {
  const rect = target.getBoundingClientRect();
  if (!rect.width || !rect.height) return { x: 50, y: 50 };
  return {
    x: VIEW_MIN + ((event.clientX - rect.left) / rect.width) * VIEW_SIZE,
    y: VIEW_MIN + ((event.clientY - rect.top) / rect.height) * VIEW_SIZE
  };
}

target.addEventListener('pointerdown', (event) => {
  if (phase !== 'aim') return;
  event.preventDefault();
  dragging = true;
  target.setPointerCapture?.(event.pointerId);
  const point = toTargetCoords(event);
  setAim(point.x, point.y);
});

target.addEventListener('pointermove', (event) => {
  if (!dragging || phase !== 'aim') return;
  event.preventDefault();
  const point = toTargetCoords(event);
  setAim(point.x, point.y);
});

const endDrag = (event) => {
  if (!dragging) return;
  dragging = false;
  target.releasePointerCapture?.(event.pointerId);
};

target.addEventListener('pointerup', endDrag);
target.addEventListener('pointercancel', endDrag);
target.addEventListener('pointerleave', (event) => {
  if (event.buttons === 0) endDrag(event);
});

shootBtn.addEventListener('click', handleShoot);
resetBtn.addEventListener('click', () => softRefresh(rangeEl, resetMatch));
rematchBtn.addEventListener('click', () => softRefresh(rangeEl, resetMatch));

window.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (!veil.hidden) return;

  const onControl = event.target instanceof Element && event.target.closest('button, a');

  if (phase === 'aim' && event.key.startsWith('Arrow')) {
    event.preventDefault();
    const step = event.shiftKey ? 1 : 3;
    const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
    const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
    setAim(aim.x + dx, aim.y + dy);
    return;
  }

  if ((event.key === ' ' || event.key === 'Enter') && !onControl) {
    event.preventDefault();
    handleShoot();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopMeter();
    return;
  }
  if (phase === 'power') {
    lastFrame = performance.now();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }
});

resetMatch();
