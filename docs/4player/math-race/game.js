import { softRefresh } from '../../shared/refresh.js';
import { GOAL, formatSeconds, levelFor, makeQuestion, rankPlayers } from './engine.js';

const $ = (id) => document.getElementById(id);

const PLAYERS = [
  { name: 'Player 1', short: 'P1' },
  { name: 'Player 2', short: 'P2' },
  { name: 'Player 3', short: 'P3' },
  { name: 'Player 4', short: 'P4' }
];
const PENALTY_MS = 900;
const BEST_KEY = 'mini-games:math-race:best';

const lanesEl = $('lanes');
const boardEl = $('board');
const gate = $('start-gate');
const startBtn = $('start');
const statusEl = $('status');
const veil = $('veil');
const veilEyebrow = $('veil-eyebrow');
const veilTitle = $('veil-title');
const veilCopy = $('veil-copy');
const podiumEl = $('podium');
const resetBtn = $('reset');
const rematchBtn = $('rematch');

const players = PLAYERS.map(() => ({ progress: 0, question: null, lockedUntil: 0, timer: 0 }));
let running = false;
let finished = false;
let startedAt = 0;
let hiddenAt = 0;
let token = 0;

const lanes = PLAYERS.map((player, index) => {
  const lane = document.createElement('section');
  lane.className = `lane lane--p${index + 1}`;
  lane.id = `lane-${index}`;
  lane.setAttribute('aria-label', `${player.name} lane`);

  const head = document.createElement('header');
  head.className = 'lane-head';

  const name = document.createElement('span');
  name.className = 'lane-name';
  name.innerHTML = '<i class="dot" aria-hidden="true"></i>';
  name.append(player.short);
  head.appendChild(name);

  const pips = document.createElement('span');
  pips.className = 'pips';
  pips.setAttribute('role', 'img');
  pips.setAttribute('aria-label', `0 of ${GOAL} correct`);
  for (let step = 0; step < GOAL; step += 1) pips.appendChild(document.createElement('i'));
  head.appendChild(pips);

  const question = document.createElement('p');
  question.className = 'question';
  question.id = `question-${index}`;
  question.textContent = '· · ·';

  const answers = document.createElement('div');
  answers.className = 'answers';
  answers.setAttribute('role', 'group');
  answers.setAttribute('aria-label', `${player.name} answers`);

  lane.append(head, question, answers);
  lanesEl.appendChild(lane);

  return { lane, pips, question, answers };
});

function loadBest() {
  try {
    const value = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function saveBest(ms) {
  try {
    localStorage.setItem(BEST_KEY, String(Math.round(ms)));
  } catch {
    /* storage is optional */
  }
}

function renderPips(index, fresh = false) {
  const { pips } = lanes[index];
  const filled = players[index].progress;
  [...pips.children].forEach((pip, step) => {
    pip.classList.toggle('is-on', step < filled);
    pip.classList.toggle('is-new', fresh && step === filled - 1);
  });
  pips.setAttribute('aria-label', `${filled} of ${GOAL} correct`);
}

function renderQuestion(index) {
  const { question, answers } = lanes[index];
  const data = players[index].question;
  question.textContent = `${data.a} ${data.op} ${data.b}`;
  answers.replaceChildren();
  for (const value of data.options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = String(value);
    button.dataset.value = String(value);
    button.setAttribute('aria-label', `${PLAYERS[index].name}: answer ${value}`);
    answers.appendChild(button);
  }
}

function clearLaneState(index) {
  lanes[index].lane.classList.remove('is-locked', 'is-wrong', 'is-winner');
}

function newQuestion(index) {
  players[index].question = makeQuestion(levelFor(players[index].progress));
  renderQuestion(index);
}

function answer(index, value, button) {
  if (!running || finished) return;
  const player = players[index];
  if (Date.now() < player.lockedUntil) return;
  if (!player.question) return;

  if (value === player.question.answer) {
    player.progress += 1;
    button.classList.add('is-right');
    renderPips(index, true);
    clearLaneState(index);

    if (player.progress >= GOAL) {
      finishRace(index);
      return;
    }

    newQuestion(index);
    statusEl.textContent = `${PLAYERS[index].name} is on ${player.progress} of ${GOAL}.`;
    return;
  }

  button.classList.add('is-wrong');
  player.lockedUntil = Date.now() + PENALTY_MS;
  lanes[index].lane.classList.add('is-locked', 'is-wrong');
  statusEl.textContent = `${PLAYERS[index].name} answered wrong and is paused.`;

  const myToken = token;
  window.clearTimeout(player.timer);
  player.timer = window.setTimeout(() => {
    if (myToken !== token || !running) return;
    player.lockedUntil = 0;
    clearLaneState(index);
    newQuestion(index);
  }, PENALTY_MS);
}

function finishRace(index) {
  finished = true;
  running = false;
  const elapsed = Math.max(0, performance.now() - startedAt);

  players.forEach((player) => window.clearTimeout(player.timer));
  lanes[index].lane.classList.add('is-winner');

  const previousBest = loadBest();
  const isBest = !previousBest || elapsed < previousBest;
  if (isBest) saveBest(elapsed);
  const best = isBest ? elapsed : previousBest;

  veilEyebrow.textContent = 'Race complete';
  veilTitle.textContent = `${PLAYERS[index].name} wins!`;
  veilCopy.textContent = `Eight correct in ${formatSeconds(elapsed)} · best ${formatSeconds(best)}`;

  podiumEl.replaceChildren();
  rankPlayers(players.map((player) => player.progress)).forEach((entry, place) => {
    const item = document.createElement('li');
    item.className = 'podium-row';
    item.dataset.player = String(entry.index + 1);
    item.innerHTML = `<span class="podium-place">${place + 1}</span>
      <span class="podium-name">${PLAYERS[entry.index].name}</span>
      <span class="podium-score">${entry.progress}/${GOAL}</span>`;
    podiumEl.appendChild(item);
  });

  veil.hidden = false;
  statusEl.textContent = `${PLAYERS[index].name} wins with ${GOAL} correct answers in ${formatSeconds(elapsed)}.`;
  rematchBtn.focus({ preventScroll: true });
}

function startRace() {
  if (running) return;
  token += 1;
  players.forEach((player) => window.clearTimeout(player.timer));

  running = true;
  finished = false;
  startedAt = performance.now();
  gate.hidden = true;
  veil.hidden = true;

  players.forEach((player, index) => {
    player.progress = 0;
    player.lockedUntil = 0;
    player.question = makeQuestion(levelFor(0));
    renderPips(index);
    clearLaneState(index);
    renderQuestion(index);
  });

  statusEl.textContent = 'Race started. First to eight correct answers wins.';
}

function resetRace() {
  token += 1;
  running = false;
  finished = false;
  players.forEach((player) => {
    window.clearTimeout(player.timer);
    player.progress = 0;
    player.question = null;
    player.lockedUntil = 0;
  });

  players.forEach((_, index) => {
    lanes[index].question.textContent = '· · ·';
    lanes[index].answers.replaceChildren();
    renderPips(index);
    clearLaneState(index);
  });

  veil.hidden = true;
  gate.hidden = false;
  statusEl.textContent = 'Press start when all four players are ready.';
  startBtn.focus({ preventScroll: true });
}

lanesEl.addEventListener('click', (event) => {
  const button = event.target.closest('.answers button');
  if (!button) return;
  const lane = button.closest('.lane');
  if (!lane) return;
  answer(Number(lane.id.replace('lane-', '')), Number(button.dataset.value), button);
});

startBtn.addEventListener('click', startRace);
resetBtn.addEventListener('click', () => softRefresh(boardEl, resetRace));
rematchBtn.addEventListener('click', () => softRefresh(boardEl, startRace));

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    hiddenAt = performance.now();
    return;
  }
  if (hiddenAt && running) {
    startedAt += performance.now() - hiddenAt;
  }
  hiddenAt = 0;
});

resetRace();
