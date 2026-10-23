const PLAYERS = [
  { name: 'Player 1', accent: '#ff6b5a' },
  { name: 'Player 2', accent: '#21b6a8' },
  { name: 'Player 3', accent: '#7c5cff' }
];
const HOLE_COUNT = 3;
const DURATION = 40;

const $ = (id) => document.getElementById(id);

const arenaEl = $('arena');
const timeEl = $('time');
const progressEl = $('progress');
const countdownEl = $('countdown');
const countdownNumber = $('countdown-number');
const countdownCopy = $('countdown-copy');
const startBtn = $('start');
const veil = $('veil');
const veilTitle = $('veil-title');
const veilCopy = $('veil-copy');
const podiumEl = $('podium');
const statusEl = $('status');

const lanes = [];
const holes = [];
let scores = [0, 0, 0];
let lastHole = [-1, -1, -1];
let running = false;
let token = 0;
let endAt = 0;
let tickId = null;
let spawnId = null;

function buildArena() {
  PLAYERS.forEach((player, playerIndex) => {
    const lane = document.createElement('section');
    lane.className = 'lane';
    lane.style.setProperty('--accent', player.accent);
    lane.setAttribute('aria-label', `${player.name}'s lane`);

    const head = document.createElement('div');
    head.className = 'lane-head';
    head.innerHTML = `
      <span class="avatar" aria-hidden="true">${playerIndex + 1}</span>
      <span class="lane-name">${player.name}</span>
      <b class="lane-score" id="score-${playerIndex}">0</b>`;
    lane.appendChild(head);

    const holesWrap = document.createElement('div');
    holesWrap.className = 'holes';

    const playerHoles = [];
    for (let holeIndex = 0; holeIndex < HOLE_COUNT; holeIndex += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'hole';
      button.dataset.player = String(playerIndex);
      button.dataset.hole = String(holeIndex);
      button.setAttribute('aria-label', `${player.name}, hole ${holeIndex + 1}`);

      const burrow = document.createElement('span');
      burrow.className = 'burrow';

      const mole = document.createElement('img');
      mole.className = 'mole';
      mole.src = 'assets/mole.svg';
      mole.alt = '';
      mole.draggable = false;

      const rim = document.createElement('span');
      rim.className = 'rim';

      button.append(burrow, mole, rim);

      const state = { el: button, up: false, timer: null };
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        whack(playerIndex, holeIndex);
      });
      button.addEventListener('click', () => whack(playerIndex, holeIndex));

      holesWrap.appendChild(button);
      playerHoles.push(state);
    }

    lane.appendChild(holesWrap);
    arenaEl.appendChild(lane);
    lanes.push(lane);
    holes.push(playerHoles);
  });
}

function updateScore(playerIndex) {
  const el = $(`score-${playerIndex}`);
  el.textContent = String(scores[playerIndex]);
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

function clearTimers() {
  if (tickId !== null) {
    window.clearInterval(tickId);
    tickId = null;
  }
  if (spawnId !== null) {
    window.clearTimeout(spawnId);
    spawnId = null;
  }
  for (const playerHoles of holes) {
    for (const hole of playerHoles) {
      if (hole.timer !== null) window.clearTimeout(hole.timer);
      hole.timer = null;
      hole.up = false;
      hole.el.classList.remove('is-up', 'is-hit');
    }
  }
}

function updateTimer(msLeft) {
  const left = Math.max(0, msLeft);
  timeEl.textContent = `${Math.ceil(left / 1000)}s`;
  progressEl.style.width = `${(left / (DURATION * 1000)) * 100}%`;
  progressEl.classList.toggle('is-low', left <= 10_000);
}

function hideMole(playerIndex, holeIndex) {
  const hole = holes[playerIndex][holeIndex];
  if (!hole.up) return;
  hole.up = false;
  hole.el.classList.remove('is-up');
  if (hole.timer !== null) {
    window.clearTimeout(hole.timer);
    hole.timer = null;
  }
}

function popMole(playerIndex, holeIndex) {
  const hole = holes[playerIndex][holeIndex];
  if (!running || hole.up) return;
  hole.up = true;
  hole.el.classList.add('is-up');
  hole.timer = window.setTimeout(() => hideMole(playerIndex, holeIndex), 900);
}

function whack(playerIndex, holeIndex) {
  const hole = holes[playerIndex][holeIndex];
  if (!running || !hole.up) return;

  hideMole(playerIndex, holeIndex);
  hole.el.classList.add('is-hit');
  window.setTimeout(() => hole.el.classList.remove('is-hit'), 230);

  scores[playerIndex] += 1;
  updateScore(playerIndex);

  if (navigator.vibrate) navigator.vibrate(8);
}

function spawnWave(myToken) {
  if (!running || myToken !== token) return;

  for (let p = 0; p < PLAYERS.length; p += 1) {
    const free = [];
    for (let h = 0; h < HOLE_COUNT; h += 1) {
      if (!holes[p][h].up && h !== lastHole[p]) free.push(h);
    }
    const choice = free[Math.floor(Math.random() * free.length)];
    if (choice !== undefined) {
      lastHole[p] = choice;
      popMole(p, choice);
    }
  }

  const elapsed = DURATION * 1000 - Math.max(0, endAt - Date.now());
  const delay = Math.max(430, 820 - (elapsed / (DURATION * 1000)) * 360);
  spawnId = window.setTimeout(() => spawnWave(myToken), delay);
}

function beginRound(myToken) {
  if (myToken !== token) return;
  running = true;
  countdownEl.hidden = true;
  endAt = Date.now() + DURATION * 1000;
  updateTimer(DURATION * 1000);
  spawnWave(myToken);

  tickId = window.setInterval(() => {
    if (myToken !== token) return;
    const left = endAt - Date.now();
    updateTimer(left);
    if (left <= 0) endRound(myToken);
  }, 100);

  statusEl.textContent = 'Round started. Whack your moles!';
}

function endRound(myToken) {
  if (myToken !== token || !running) return;
  running = false;
  clearTimers();
  updateTimer(0);
  showResults();
}

function showResults() {
  const ranked = PLAYERS.map((player, index) => ({
    ...player,
    index,
    score: scores[index]
  })).sort((a, b) => b.score - a.score);

  const top = ranked[0].score;
  const winners = ranked.filter((player) => player.score === top);
  const tie = winners.length > 1;

  veilTitle.textContent = tie ? "It's a tie!" : `${winners[0].name} wins!`;
  if (tie && top === 0) {
    veilCopy.textContent = 'Nobody scored. The moles win this round.';
  } else if (tie) {
    veilCopy.textContent = `A ${top}-point tie after 40 seconds. Rematch?`;
  } else {
    veilCopy.textContent = `${top} points in 40 seconds. Nicely whacked.`;
  }

  podiumEl.innerHTML = ranked.map((player, place) => `
    <li style="--accent:${player.accent}">
      <span class="place">${place + 1}</span>
      <span class="pill">${player.index + 1}</span>
      <span class="name">${player.name}</span>
      <span class="pts">${player.score}<small>pts</small></span>
    </li>`).join('');

  veil.hidden = false;
  $('play-again').focus({ preventScroll: true });
  statusEl.textContent = tie
    ? `Round over. Tie at ${top} points.`
    : `Round over. ${winners[0].name} wins with ${top} points.`;
}

function resetRoundState() {
  token += 1;
  running = false;
  clearTimers();
  scores = [0, 0, 0];
  lastHole = [-1, -1, -1];
  for (let p = 0; p < PLAYERS.length; p += 1) {
    $(`score-${p}`).textContent = '0';
  }
  updateTimer(DURATION * 1000);
  veil.hidden = true;
}

function showIdle() {
  resetRoundState();
  countdownEl.hidden = false;
  startBtn.hidden = false;
  countdownNumber.textContent = '3';
  countdownCopy.textContent = 'players · 40 seconds';
  statusEl.textContent = 'Press start to begin the round.';
}

function countdown() {
  const myToken = token;
  startBtn.hidden = true;
  countdownEl.hidden = false;

  let count = 3;
  function step() {
    if (myToken !== token) return;
    if (count > 0) {
      countdownNumber.textContent = String(count);
      countdownCopy.textContent = 'Get ready';
      countdownNumber.classList.remove('pop');
      void countdownNumber.offsetWidth;
      countdownNumber.classList.add('pop');
      count -= 1;
      window.setTimeout(step, 650);
    } else {
      countdownNumber.textContent = 'GO!';
      countdownCopy.textContent = 'Whack!';
      countdownNumber.classList.remove('pop');
      void countdownNumber.offsetWidth;
      countdownNumber.classList.add('pop');
      window.setTimeout(() => beginRound(myToken), 500);
    }
  }
  step();
}

function startFresh() {
  resetRoundState();
  countdown();
}

startBtn.addEventListener('click', startFresh);
$('restart').addEventListener('click', showIdle);
$('play-again').addEventListener('click', startFresh);

buildArena();
showIdle();
