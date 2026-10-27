import { softRefresh } from '../../shared/refresh.js';
import {
  KICKS_EACH,
  aiDive,
  decided,
  flightMs,
  isSave,
  nextKicker,
  resolveKick
} from './engine.js';

const $ = (id) => document.getElementById(id);

const PLAYERS = [{ name: 'Player 1' }, { name: 'Player 2' }];

const pitchEl = $('pitch');
const zones = [...document.querySelectorAll('.zone')];
const ball = $('ball');
const powerFill = $('power-fill');
const banner = $('banner');
const keeperPad = $('keeper-pad');
const diveButtons = [...document.querySelectorAll('.dive')];
const turnEl = $('turn');
const roundEl = $('round-label');
const scoreEls = [$('score-0'), $('score-1')];
const nameEls = [$('name-0'), $('name-1')];
const cardEls = [$('card-0'), $('card-1')];
const dotsEls = [$('dots-0'), $('dots-1')];
const modeButtons = [...document.querySelectorAll('.mode-switch button')];
const statusEl = $('status');
const veil = $('veil');
const veilTitle = $('veil-title');
const veilCopy = $('veil-copy');
const veilStats = $('veil-stats');
const rematchBtn = $('rematch');

let mode = '2p';
let scores = [0, 0];
let kicks = [0, 0];
let saves = [0, 0];
let results = [];
let phase = 'aim'; // 'aim' | 'flight' | 'result' | 'over'
let kicker = 0;
let keeper = 1;
let aim = 0;
let power = 0;
let finalZone = 0;
let shotWide = false;
let keeperZone = null;
let charging = false;
let chargeId = null;
let aiId = null;
let nextId = null;
let token = 0;

const ZONE_NAMES = ['high left', 'high centre', 'high right', 'low left', 'low centre', 'low right'];
const isHuman = (playerIndex) => mode === '2p' || playerIndex === 0;
const nameOf = (playerIndex) => (playerIndex === 1 && mode === 'ai' ? 'Computer' : PLAYERS[playerIndex].name);

function clearTimers() {
  if (chargeId !== null) {
    window.clearInterval(chargeId);
    chargeId = null;
  }
  if (aiId !== null) {
    window.clearTimeout(aiId);
    aiId = null;
  }
  if (nextId !== null) {
    window.clearTimeout(nextId);
    nextId = null;
  }
}

function announce(message) {
  statusEl.textContent = message;
}

/* ---------- HUD ---------- */

function renderDots(playerIndex) {
  const total = Math.max(KICKS_EACH, kicks[playerIndex]);
  const mine = results.filter((entry) => entry.kicker === playerIndex);
  const holder = dotsEls[playerIndex];
  holder.replaceChildren();

  for (let index = 0; index < total; index += 1) {
    const dot = document.createElement('i');
    if (mine[index]) dot.classList.add(mine[index].scored ? 'is-scored' : 'is-missed');
    holder.appendChild(dot);
  }
}

function updateHud() {
  for (let i = 0; i < 2; i += 1) {
    scoreEls[i].textContent = String(scores[i]);
    nameEls[i].textContent = nameOf(i);
    cardEls[i].classList.toggle('is-active', phase !== 'over' && i === kicker);
    renderDots(i);
  }

  const total = kicks[0] + kicks[1];
  roundEl.textContent =
    kicks[0] >= KICKS_EACH && kicks[1] >= KICKS_EACH ? 'Sudden death' : `Kick ${total + 1}`;
}

function updateTurnText() {
  if (phase === 'aim') {
    turnEl.textContent = isHuman(kicker)
      ? `${nameOf(kicker)} to kick — hold a corner of the goal`
      : `${nameOf(kicker)} steps up…`;
  } else if (phase === 'flight') {
    turnEl.textContent = isHuman(keeper)
      ? `${nameOf(keeper)} to keep — tap the corner as it flies!`
      : `${nameOf(kicker)} strikes…`;
  }
}

function syncControls() {
  const canAim = phase === 'aim' && isHuman(kicker);
  zones.forEach((zone, index) => {
    zone.disabled = !canAim;
    zone.classList.toggle('is-aim', index === aim && phase !== 'aim' && phase !== 'over');
  });
  keeperPad.classList.toggle('is-locked', !(phase === 'flight' && isHuman(keeper)));
  diveButtons.forEach((button, index) => {
    button.classList.toggle('is-dive', keeperZone === index && phase === 'flight');
  });
}

/* ---------- ball animation ---------- */

function resetBall() {
  ball.style.transition = 'none';
  ball.style.transform = '';
  ball.classList.remove('is-spin');
  void ball.offsetWidth;
}

function flyToZone(zone, duration) {
  const zoneEl = zones[zone];
  const from = ball.getBoundingClientRect();
  const to = zoneEl.getBoundingClientRect();
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  ball.style.transition = `transform ${duration}ms cubic-bezier(.4,.05,.6,1)`;
  ball.style.transform = `translate(${dx}px, ${dy}px) rotate(540deg)`;
}

function flyWide(zone, duration) {
  const zoneEl = zones[zone];
  const from = ball.getBoundingClientRect();
  const to = zoneEl.getBoundingClientRect();
  const col = zone % 3;
  let dx = to.left + to.width / 2 - (from.left + from.width / 2);
  let dy = to.top + to.height / 2 - (from.top + from.height / 2);
  if (col === 0) dx -= to.width * 0.8;
  else if (col === 2) dx += to.width * 0.8;
  else dy -= to.height * 1.7;
  ball.style.transition = `transform ${duration}ms cubic-bezier(.4,.05,.6,1)`;
  ball.style.transform = `translate(${dx}px, ${dy}px) rotate(540deg)`;
}

function deflectBall(zone) {
  const zoneEl = zones[zone];
  const from = ball.getBoundingClientRect();
  const to = zoneEl.getBoundingClientRect();
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2) - Math.max(70, to.height * 0.9);
  ball.style.transition = 'transform 320ms cubic-bezier(.2,.9,.3,1)';
  ball.style.transform = `translate(${dx}px, ${dy}px) rotate(760deg)`;
}

function showBanner(text, kind) {
  banner.textContent = text;
  banner.hidden = false;
  banner.classList.remove('is-save', 'is-goal');
  banner.classList.add(kind);
  banner.style.animation = 'none';
  void banner.offsetWidth;
  banner.style.animation = '';
}

/* ---------- shootout flow ---------- */

function startKick() {
  kicker = nextKicker(kicks);
  keeper = 1 - kicker;
  phase = 'aim';
  keeperZone = null;
  power = 0;
  powerFill.style.width = '20%';
  banner.hidden = true;
  zones.forEach((zone) => zone.classList.remove('is-aim'));
  resetBall();
  updateHud();
  updateTurnText();
  syncControls();

  if (!isHuman(kicker)) {
    const myToken = token;
    aiId = window.setTimeout(() => {
      if (myToken !== token || phase !== 'aim') return;
      aim = Math.floor(Math.random() * 6);
      const roll = Math.random();
      power = roll < 0.55 ? 0.42 + Math.random() * 0.26 : roll < 0.8 ? 0.2 + Math.random() * 0.1 : 0.86 + Math.random() * 0.14;
      zones[aim].classList.add('is-aim');
      powerFill.style.width = `${Math.round(power * 100)}%`;
      syncControls();
      aiId = window.setTimeout(() => {
        if (myToken !== token || phase !== 'aim') return;
        shoot();
      }, 420);
    }, 620);
  }
}

function shoot() {
  if (phase !== 'aim') return;
  clearTimers();
  charging = false;
  token += 1;
  const myToken = token;

  kicks[kicker] += 1;
  const resolved = resolveKick({ aim, power, rng: Math.random });
  finalZone = resolved.zone;
  shotWide = resolved.wide;
  keeperZone = null;

  const flight = flightMs(power);
  phase = 'flight';
  zones.forEach((zone) => {
    zone.disabled = true;
  });
  updateHud();
  updateTurnText();
  syncControls();

  ball.classList.add('is-spin');
  if (shotWide) flyWide(finalZone, flight);
  else flyToZone(finalZone, flight);
  announce(`${nameOf(kicker)} shoots!`);

  if (!isHuman(keeper) && !shotWide) {
    const delay = flight * (0.45 + Math.random() * 0.4);
    aiId = window.setTimeout(() => {
      if (myToken !== token || phase !== 'flight') return;
      keeperZone = aiDive({ aim, rng: Math.random });
      syncControls();
    }, delay);
  }

  nextId = window.setTimeout(() => {
    if (myToken !== token || phase !== 'flight') return;
    resolveShot();
  }, flight + 40);
}

function resolveShot() {
  if (shotWide) {
    results.push({ kicker, scored: false });
    showBanner('Wide!', 'is-goal');
    announce(`${nameOf(kicker)} drags it wide. ${scores[0]} to ${scores[1]}.`);
    phase = 'result';
    updateHud();
    syncControls();
    scheduleNext();
    return;
  }

  const arrived = keeperZone !== null;
  const save = isSave({ zone: finalZone, keeperZone, arrived });

  results.push({ kicker, scored: !save });

  if (save) {
    saves[keeper] += 1;
    showBanner('Saved!', 'is-save');
    deflectBall(finalZone);
    announce(`${nameOf(keeper)} saves! ${scores[0]} to ${scores[1]}.`);
    if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
  } else {
    scores[kicker] += 1;
    showBanner('Goal!', 'is-goal');
    zones[finalZone].classList.remove('is-scored');
    void zones[finalZone].offsetWidth;
    zones[finalZone].classList.add('is-scored');
    announce(`Goal for ${nameOf(kicker)}! ${scores[0]} to ${scores[1]}.`);
    if (navigator.vibrate) navigator.vibrate(16);
  }

  phase = 'result';
  updateHud();
  syncControls();
  scheduleNext();
}

function scheduleNext() {
  const myToken = token;
  nextId = window.setTimeout(() => {
    if (myToken !== token || phase !== 'result') return;
    const winner = decided(scores, kicks);
    if (winner !== null) endMatch(winner);
    else startKick();
  }, 1500);
}

function endMatch(winner) {
  phase = 'over';
  clearTimers();
  banner.hidden = true;
  updateHud();
  syncControls();

  const loser = 1 - winner;
  veilTitle.textContent = `${nameOf(winner)} wins!`;
  veilCopy.textContent = `Final ${scores[winner]} to ${scores[loser]} — ${
    kicks[0] >= KICKS_EACH && kicks[1] >= KICKS_EACH ? 'decided in sudden death.' : 'five kicks each.'
  }`;

  veilStats.replaceChildren();
  for (const [term, value] of [
    ['Final', `${scores[0]}–${scores[1]}`],
    [`${nameOf(0)} saves`, saves[0]],
    [`${nameOf(1)} saves`, saves[1]]
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
  announce(`Shootout over. ${nameOf(winner)} wins ${scores[winner]} to ${scores[loser]}.`);
}

function resetMatch() {
  token += 1;
  clearTimers();
  scores = [0, 0];
  kicks = [0, 0];
  saves = [0, 0];
  results = [];
  phase = 'aim';
  kicker = 0;
  keeper = 1;
  aim = 0;
  shotWide = false;
  keeperZone = null;
  charging = false;
  veil.hidden = true;
  banner.hidden = true;
  resetBall();
  startKick();
}

/* ---------- kicker input ---------- */

function startCharge(zoneIndex, event) {
  if (phase !== 'aim' || !isHuman(kicker)) return;
  if (event && event.pointerType === 'mouse' && event.button !== 0) return;
  event?.preventDefault();

  const zoneEl = zones[zoneIndex];
  if (event?.pointerId !== undefined) {
    try {
      zoneEl.setPointerCapture(event.pointerId);
    } catch {
      /* capture optional */
    }
  }

  aim = zoneIndex;
  charging = true;
  shotWide = false;
  power = 0.2;
  powerFill.style.width = '20%';
  zones.forEach((zone) => zone.classList.toggle('is-aim', zone === zoneEl));
  announce(`${nameOf(kicker)} aims. Hold to build power.`);

  if (chargeId !== null) window.clearInterval(chargeId);
  chargeId = window.setInterval(() => {
    power = Math.min(1, power + 0.045);
    powerFill.style.width = `${Math.round(power * 100)}%`;
    if (power >= 1) {
      window.clearInterval(chargeId);
      chargeId = null;
    }
  }, 50);
}

function releaseCharge() {
  if (!charging) return;
  if (chargeId !== null) {
    window.clearInterval(chargeId);
    chargeId = null;
  }
  charging = false;
  shoot();
}

zones.forEach((zoneEl, index) => {
  zoneEl.addEventListener('pointerdown', (event) => startCharge(index, event));
  zoneEl.addEventListener('pointerup', (event) => {
    event.preventDefault();
    releaseCharge();
  });
  zoneEl.addEventListener('pointercancel', () => {
    if (!charging) return;
    charging = false;
    if (chargeId !== null) {
      window.clearInterval(chargeId);
      chargeId = null;
    }
    zones.forEach((zone) => zone.classList.remove('is-aim'));
    syncControls();
  });
  zoneEl.addEventListener('contextmenu', (event) => event.preventDefault());
  zoneEl.addEventListener('click', (event) => {
    if (event.detail !== 0) return;
    startCharge(index);
    window.setTimeout(releaseCharge, 450);
  });
});

/* ---------- keeper input ---------- */

diveButtons.forEach((button, index) => {
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    if (phase !== 'flight' || !isHuman(keeper)) return;
    keeperZone = index;
    syncControls();
    announce(`${nameOf(keeper)} dives ${ZONE_NAMES[index]}.`);
  });
  button.addEventListener('click', (event) => {
    if (event.detail !== 0) return;
    if (phase !== 'flight' || !isHuman(keeper)) return;
    keeperZone = index;
    syncControls();
  });
  button.addEventListener('contextmenu', (event) => event.preventDefault());
});

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
  restart();
}

function restart() {
  if (pitchEl.dataset.refreshing === 'true') return;
  softRefresh(pitchEl, () => {
    resetMatch();
    pitchEl.focus?.({ preventScroll: true });
  });
}

pitchEl.setAttribute('tabindex', '-1');
pitchEl.addEventListener('contextmenu', (event) => event.preventDefault());

modeButtons.forEach((button) => {
  button.addEventListener('click', () => setMode(button.dataset.mode));
});

$('reset').addEventListener('click', restart);
rematchBtn.addEventListener('click', restart);

document.addEventListener('visibilitychange', () => {
  if (document.hidden && charging) {
    charging = false;
    if (chargeId !== null) {
      window.clearInterval(chargeId);
      chargeId = null;
    }
    zones.forEach((zone) => zone.classList.remove('is-aim'));
    syncControls();
  }
});

window.addEventListener('blur', () => {
  if (charging) {
    charging = false;
    if (chargeId !== null) {
      window.clearInterval(chargeId);
      chargeId = null;
    }
    zones.forEach((zone) => zone.classList.remove('is-aim'));
    syncControls();
  }
});

// Keeper mini-maps: mark each button's own zone in its little goal grid.
diveButtons.forEach((button, index) => {
  button.querySelectorAll('.mini i').forEach((cell, cellIndex) => {
    if (cellIndex === index) cell.classList.add('is-on');
  });
});

resetMatch();
