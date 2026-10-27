import { softRefresh } from '../../shared/refresh.js';
import {
  CUP_TARGET,
  chooseEliminated,
  cupWinner,
  formatTap,
  placementLabel,
  reactionDelay
} from './engine.js';

const $ = (id) => document.getElementById(id);
const BEST_KEY = 'mini-games:reflex-race:best';

const PLAYERS = [
  { name: 'Player 1', key: '1' },
  { name: 'Player 2', key: '2' },
  { name: 'Player 3', key: '3' },
  { name: 'Player 4', key: '4' }
];

const stageEl = $('stage');
const signalEl = $('signal');
const signalText = $('signal-text');
const timeEls = [0, 1, 2, 3].map((i) => $(`time-${i}`));
const pointsEls = [0, 1, 2, 3].map((i) => $(`points-${i}`));
const heatLabel = $('heat-label');
const bestEl = $('best');
const statusEl = $('status');
const veil = $('veil');
const veilEyebrow = $('veil-eyebrow');
const veilTitle = $('veil-title');
const veilCopy = $('veil-copy');
const veilStats = $('veil-stats');
const veilPrimary = $('veil-primary');
const pads = [...document.querySelectorAll('.pad')];

let phase = 'idle'; // 'idle' | 'hold' | 'go' | 'result' | 'over'
let active = [0, 1, 2, 3];
let results = [];
let points = [0, 0, 0, 0];
let heat = 1;
let goTime = 0;
let matchBest = 0;
let lastOut = -1;
let token = 0;
let holdId = null;
let resultId = null;
let resumeAction = null;
let best = loadBest();

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

const nameOf = (playerIndex) => PLAYERS[playerIndex].name;

function announce(message) {
  statusEl.textContent = message;
}

function clearTimers() {
  if (holdId !== null) {
    window.clearTimeout(holdId);
    holdId = null;
  }
  if (resultId !== null) {
    window.clearTimeout(resultId);
    resultId = null;
  }
}

function setSignal(text, kind = '') {
  signalText.textContent = text;
  signalEl.className = `signal${kind ? ` ${kind}` : ''}`;
  signalText.style.animation = 'none';
  void signalText.offsetWidth;
  signalText.style.animation = '';
}

function updateBest() {
  bestEl.textContent = best ? `${Math.round(best)}ms` : '—';
}

function updatePips() {
  for (let i = 0; i < 4; i += 1) {
    pointsEls[i].querySelectorAll('i').forEach((pip, index) => {
      pip.classList.toggle('is-on', index < points[i]);
    });
  }
}

function updatePads() {
  pads.forEach((pad, index) => {
    const isActive = active.includes(index);
    const entry = results.find((result) => result.player === index);
    const live = phase === 'go' && isActive && !entry;
    const armed = phase === 'hold' && isActive && !entry;

    pad.classList.toggle('is-out', !isActive);
    pad.classList.toggle('is-tapped', Boolean(entry && !entry.falseStart));
    pad.classList.toggle('is-false', Boolean(entry && entry.falseStart));
    pad.classList.toggle('is-live', live);
    pad.classList.toggle('is-armed', armed);
    pad.disabled = !isActive || Boolean(entry) || phase === 'idle' || phase === 'result' || phase === 'over';

    if (entry) timeEls[index].textContent = formatTap(entry);
    else timeEls[index].textContent = isActive ? '—' : 'out';

    pad.setAttribute(
      'aria-label',
      `${nameOf(index)} tap zone${entry ? `, ${formatTap(entry)}` : isActive ? ', waiting' : ', eliminated'}`
    );
  });
}

/* ---------- heat flow ---------- */

function startHeat() {
  token += 1;
  clearTimers();
  const myToken = token;

  results = [];
  phase = 'hold';
  heatLabel.textContent = `Heat ${heat}`;
  setSignal('WAIT');
  updatePads();
  announce(`Heat ${heat}. Hold your finger back…`);

  holdId = window.setTimeout(() => {
    holdId = null;
    if (myToken !== token || phase !== 'hold') return;
    go();
  }, reactionDelay(Math.random));
}

function go() {
  phase = 'go';
  goTime = performance.now();
  setSignal('GO!', 'is-go');
  updatePads();
  announce('Go! Tap now.');
}

function record(player, time, falseStart) {
  results.push({ player, seq: results.length, time, falseStart });

  if (!falseStart) {
    if (!matchBest || time < matchBest) matchBest = time;
    if (!best || time < best) {
      best = time;
      saveBest();
      updateBest();
    }
  }

  if (results.length === active.length) resolveHeat();
}

function tap(player) {
  if (!active.includes(player)) return;

  if (phase === 'hold') {
    record(player, -1, true);
    updatePads();
    announce(`${nameOf(player)} moved early — false start.`);
    return;
  }

  if (phase === 'go') {
    const time = performance.now() - goTime;
    record(player, time, false);
    updatePads();
    announce(`${nameOf(player)} taps in ${Math.round(time)} milliseconds.`);
    return;
  }

  updatePads();
}

function resolveHeat() {
  phase = 'result';
  clearTimers();

  const out = chooseEliminated(results);
  lastOut = out.player;
  const label = placementLabel(active.length);

  if (out.falseStart) {
    setSignal('FALSE START', 'is-warn');
    announce(`${nameOf(out.player)} false-starts and finishes ${label}.`);
  } else {
    setSignal(`${Math.round(out.time)}ms`, 'is-warn');
    announce(`${nameOf(out.player)} is the slowest at ${Math.round(out.time)} milliseconds — ${label}.`);
  }
  updatePads();

  const myToken = token;
  resultId = window.setTimeout(() => {
    resultId = null;
    if (myToken !== token || phase !== 'result') return;
    afterHeat();
  }, 1700);
}

function afterHeat() {
  active = active.filter((player) => player !== lastOut);
  if (active.length === 1) {
    awardPoint(active[0]);
    return;
  }
  heat += 1;
  startHeat();
}

function awardPoint(winner) {
  points[winner] += 1;
  updatePips();
  phase = 'over';
  clearTimers();

  const cup = cupWinner(points) !== null;
  veilEyebrow.textContent = cup ? 'Cup won' : 'Match won';
  veilTitle.textContent = `${nameOf(winner)} ${cup ? 'takes the cup!' : 'wins the match!'}`;
  veilCopy.textContent = cup
    ? `${points[winner]} of ${CUP_TARGET} points — the quickest thumbs at the table.`
    : matchBest
      ? `Last one standing, with a best tap of ${Math.round(matchBest)}ms this match.`
      : `Last one standing after ${heat} heats.`;

  veilStats.replaceChildren();
  for (const [term, value] of [
    ['Point', `${points[winner]}/${CUP_TARGET}`],
    ['Best tap', matchBest ? `${Math.round(matchBest)}ms` : '—'],
    ['Heats', heat]
  ]) {
    const cell = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = term;
    dd.textContent = String(value);
    cell.append(dt, dd);
    veilStats.appendChild(cell);
  }

  veilPrimary.textContent = cup ? 'New cup' : 'Next match';
  veil.hidden = false;
  veilPrimary.focus({ preventScroll: true });
  announce(`${nameOf(winner)} wins ${cup ? 'the cup' : 'the match'}.`);
  updatePads();
}

/* ---------- match flow ---------- */

function startMatch() {
  token += 1;
  clearTimers();
  active = [0, 1, 2, 3];
  results = [];
  heat = 1;
  matchBest = 0;
  lastOut = -1;
  phase = 'hold';
  veil.hidden = true;
  updatePips();
  startHeat();
}

function resetCup() {
  points = [0, 0, 0, 0];
  updatePips();
  startMatch();
}

function restart() {
  if (stageEl.dataset.refreshing === 'true') return;
  softRefresh(stageEl, () => {
    resetCup();
    stageEl.focus({ preventScroll: true });
  });
}

function nextAfterVeil() {
  if (stageEl.dataset.refreshing === 'true') return;
  softRefresh(stageEl, () => {
    if (cupWinner(points) !== null) resetCup();
    else startMatch();
    stageEl.focus({ preventScroll: true });
  });
}

/* ---------- input ---------- */

pads.forEach((pad, index) => {
  pad.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    tap(index);
  });
  pad.addEventListener('click', (event) => {
    if (event.detail !== 0) return;
    tap(index);
  });
  pad.addEventListener('contextmenu', (event) => event.preventDefault());
});

window.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const index = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(event.code);
  if (index === -1) return;
  event.preventDefault();
  if (event.repeat) return;
  tap(index);
});

$('reset').addEventListener('click', restart);
veilPrimary.addEventListener('click', nextAfterVeil);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (phase === 'hold' || phase === 'go') {
      token += 1;
      clearTimers();
      phase = 'idle';
      results = [];
      resumeAction = 'heat';
      setSignal('PAUSED', 'is-quiet');
      updatePads();
      announce('Paused. The heat restarts when you come back.');
    } else if (phase === 'result') {
      token += 1;
      clearTimers();
      phase = 'idle';
      resumeAction = 'after';
      setSignal('PAUSED', 'is-quiet');
      updatePads();
      announce('Paused. The elimination continues when you come back.');
    }
    return;
  }
  if (phase === 'idle' && veil.hidden) {
    if (resumeAction === 'after') {
      resumeAction = null;
      afterHeat();
    } else {
      resumeAction = null;
      startHeat();
    }
  }
});

stageEl.setAttribute('tabindex', '-1');

updateBest();
updatePips();
startMatch();
