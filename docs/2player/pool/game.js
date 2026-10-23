import { softRefresh } from '../../shared/refresh.js';

const $ = (id) => document.getElementById(id);

const canvas = $('table');
const ctx = canvas.getContext('2d');
const stage = $('table-stage');
const statusEl = $('status');
const powerFill = $('power-fill');
const veil = $('veil');
const veilTitle = $('veil-title');
const veilCopy = $('veil-copy');
const rematchBtn = $('rematch');
const newRackBtn = $('new-rack');

const W = 560;
const H = 320;
const RAIL = 24;
const R = 12;
const STEP = 1 / 240;
const MAX_SPEED = 1500;
const MIN_SPEED = 270;
const POCKET_DRAW = 23;
const CAPTURE = 21;
const FRICTION = 1.6;
const STOP_SPEED = 3.5;
const CUSHION = 0.78;
const BALL_BOUNCE = 0.94;

const POCKETS = [
  { x: 0, y: 0 }, { x: W / 2, y: 0 }, { x: W, y: 0 },
  { x: 0, y: H }, { x: W / 2, y: H }, { x: W, y: H }
];

const NAMES = ['Player 1', 'Player 2'];
const GROUP_NAME = { solid: 'solids', stripe: 'stripes', eight: 'the 8-ball' };

const BALL_COLORS = {
  1: '#f2c14e', 2: '#3d6fb4', 3: '#d9534f', 4: '#7c5cff',
  5: '#e08a3c', 6: '#2e8b62', 7: '#9c3f3f', 8: '#1e2433',
  9: '#f2c14e', 10: '#3d6fb4', 11: '#d9534f', 12: '#7c5cff',
  13: '#e08a3c', 14: '#2e8b62', 15: '#9c3f3f'
};

const view = { w: 0, h: 0, dpr: 1, scale: 1, rotated: false };

const state = {
  phase: 'aim',
  turn: 0,
  groups: [null, null],
  balls: [],
  cue: null,
  drag: null,
  hover: null,
  shot: null,
  effects: []
};

let accumulator = 0;
let lastTime = 0;

function groupOf(num) {
  if (num === 8) return 'eight';
  if (num >= 1 && num <= 7) return 'solid';
  if (num >= 9 && num <= 15) return 'stripe';
  return null;
}

function otherGroup(group) {
  return group === 'solid' ? 'stripe' : 'solid';
}

function groupCount(group) {
  return state.balls.filter((b) => b.alive && groupOf(b.num) === group).length;
}

function makeBall(num, x, y) {
  const kind = num === 0 ? 'cue' : groupOf(num);
  return {
    num,
    x,
    y,
    vx: 0,
    vy: 0,
    r: R,
    kind,
    color: BALL_COLORS[num] || '#fff9f0',
    alive: true
  };
}

function rackBalls() {
  state.balls = [];
  const cue = makeBall(0, W * 0.22, H / 2);
  state.cue = cue;
  state.balls.push(cue);

  const rows = [[1], [9, 2], [10, 8, 3], [11, 4, 12, 5], [6, 13, 7, 14, 15]];
  const dx = R * 2 * 0.866 * 1.02;
  const dy = R * 2 * 1.015;
  const apexX = W * 0.68;
  const centerY = H / 2;

  rows.forEach((row, rowIndex) => {
    row.forEach((num, ballIndex) => {
      const x = apexX + rowIndex * dx;
      const y = centerY + (ballIndex - rowIndex / 2) * dy;
      state.balls.push(makeBall(num, x, y));
    });
  });
}

function setMessage(text) {
  statusEl.textContent = text;
  statusEl.classList.toggle('is-p2', state.turn === 1);
  statusEl.classList.toggle('is-hand', state.phase === 'inhand');
  statusEl.classList.toggle('is-over', state.phase === 'over');
}

function updateHUD() {
  for (let i = 0; i < 2; i += 1) {
    const card = $(`player-${i + 1}`);
    const badge = $(`ball-${i + 1}`);
    const badgeNum = $(`ball-num-${i + 1}`);
    const groupEl = $(`group-${i + 1}`);
    const leftEl = $(`left-${i + 1}`);
    const countLabel = $(`count-label-${i + 1}`);
    const group = state.groups[i];
    const left = group ? groupCount(group) : 0;
    const onEight = Boolean(group) && left === 0;
    const active = state.phase !== 'over' && state.turn === i;

    card.classList.toggle('is-active', active);

    badge.className = 'pball';
    if (!group) {
      badge.classList.add('is-open');
      badgeNum.textContent = '?';
    } else if (onEight) {
      badge.classList.add('is-eight');
      badgeNum.textContent = '8';
    } else {
      badge.classList.add(group === 'solid' ? 'is-solid' : 'is-stripe');
      badgeNum.textContent = group === 'solid' ? '1' : '9';
    }

    groupEl.textContent = !group
      ? 'Open table'
      : onEight
        ? 'On the 8-ball'
        : group === 'solid' ? 'Solids' : 'Stripes';

    leftEl.textContent = group ? String(onEight ? 8 : left) : '—';
    countLabel.textContent = group ? (onEight ? 'ball' : 'left') : '';
    card.classList.toggle('is-open', !group);

    const cardLabel = !group
      ? `${NAMES[i]}, open table`
      : onEight
        ? `${NAMES[i]}, on the 8-ball`
        : `${NAMES[i]}, ${GROUP_NAME[group]}, ${left} balls left`;
    card.setAttribute('aria-label', active ? `${cardLabel}, current turn` : cardLabel);
  }

  statusEl.classList.toggle('is-p2', state.turn === 1);
  statusEl.classList.toggle('is-hand', state.phase === 'inhand');
  statusEl.classList.toggle('is-over', state.phase === 'over');
}

function resize() {
  const rect = stage.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const pixelW = Math.max(1, Math.round(w * dpr));
  const pixelH = Math.max(1, Math.round(h * dpr));

  if (canvas.width !== pixelW || canvas.height !== pixelH) {
    canvas.width = pixelW;
    canvas.height = pixelH;
  }

  view.w = w;
  view.h = h;
  view.dpr = dpr;
  view.rotated = h > w * 1.02;

  const totalW = W + RAIL * 2;
  const totalH = H + RAIL * 2;
  const availableW = view.rotated ? totalH : totalW;
  const availableH = view.rotated ? totalW : totalH;
  view.scale = Math.min(w / availableW, h / availableH) * 0.985;

  draw();
}

function toWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const sx = clientX - rect.left - view.w / 2;
  const sy = clientY - rect.top - view.h / 2;
  let x = sx / view.scale;
  let y = sy / view.scale;
  if (view.rotated) {
    const rx = -y;
    const ry = x;
    x = rx;
    y = ry;
  }
  return { x: x + W / 2, y: y + H / 2 };
}

function screenVectorToWorld(sx, sy) {
  if (view.rotated) return { x: -sy, y: sx };
  return { x: sx, y: sy };
}

function checkPocket(ball) {
  for (const pocket of POCKETS) {
    const dx = ball.x - pocket.x;
    const dy = ball.y - pocket.y;
    if (dx * dx + dy * dy < CAPTURE * CAPTURE) {
      sinkBall(ball);
      return true;
    }
  }
  return false;
}

function sinkBall(ball) {
  ball.alive = false;
  ball.vx = 0;
  ball.vy = 0;
  if (state.phase === 'rolling' && state.shot) {
    state.shot.potted.push(ball);
  }
  state.effects.push({
    x: Math.min(W, Math.max(0, ball.x)),
    y: Math.min(H, Math.max(0, ball.y)),
    life: 0,
    color: ball.num === 0 ? '#fff9f0' : ball.num === 8 ? '#1e2433' : ball.color
  });
}

function bounceWalls(ball) {
  const min = R;
  const maxX = W - R;
  const maxY = H - R;

  if (ball.x < min) {
    ball.x = min;
    if (ball.vx < 0) ball.vx = -ball.vx * CUSHION;
    ball.vy *= 0.985;
  } else if (ball.x > maxX) {
    ball.x = maxX;
    if (ball.vx > 0) ball.vx = -ball.vx * CUSHION;
    ball.vy *= 0.985;
  }

  if (ball.y < min) {
    ball.y = min;
    if (ball.vy < 0) ball.vy = -ball.vy * CUSHION;
    ball.vx *= 0.985;
  } else if (ball.y > maxY) {
    ball.y = maxY;
    if (ball.vy > 0) ball.vy = -ball.vy * CUSHION;
    ball.vx *= 0.985;
  }
}

function collideBalls() {
  const active = state.balls.filter((ball) => ball.alive);

  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const a = active[i];
      const b = active[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const minDist = a.r + b.r;
      const distSq = dx * dx + dy * dy;

      if (distSq >= minDist * minDist) continue;

      let dist = Math.sqrt(distSq);
      if (dist < 0.0001) {
        dx = 1;
        dy = 0;
        dist = 0.0001;
      }

      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = (minDist - dist) / 2;
      a.x -= nx * overlap;
      a.y -= ny * overlap;
      b.x += nx * overlap;
      b.y += ny * overlap;

      const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rel < 0) {
        const impulse = (-(1 + BALL_BOUNCE) * rel) / 2;
        a.vx -= impulse * nx;
        a.vy -= impulse * ny;
        b.vx += impulse * nx;
        b.vy += impulse * ny;
      }

      if (state.phase === 'rolling' && state.shot && !state.shot.firstHit) {
        if (a.num === 0 && b.num !== 0) state.shot.firstHit = b;
        else if (b.num === 0 && a.num !== 0) state.shot.firstHit = a;
      }
    }
  }
}

function stepPhysics(dt) {
  const damp = Math.exp(-FRICTION * dt);

  for (const ball of state.balls) {
    if (!ball.alive) continue;

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.vx *= damp;
    ball.vy *= damp;

    if (ball.vx * ball.vx + ball.vy * ball.vy < STOP_SPEED * STOP_SPEED) {
      ball.vx = 0;
      ball.vy = 0;
    }

    if (checkPocket(ball)) continue;
    bounceWalls(ball);
  }

  collideBalls();
}

function allStopped() {
  return state.balls.every((ball) => !ball.alive || (ball.vx === 0 && ball.vy === 0));
}

function endGame(winner, reason) {
  state.phase = 'over';
  state.shot = null;
  state.drag = null;
  state.hover = null;
  updatePower(0);
  veilTitle.textContent = `${NAMES[winner]} wins!`;
  veilCopy.textContent = `${reason} Rematch?`;
  veil.hidden = false;
  setMessage(`${NAMES[winner]} wins the rack. ${reason}`);
  updateHUD();
  statusEl.classList.toggle('is-p2', winner === 1);
  draw();
  window.requestAnimationFrame(() => rematchBtn.focus({ preventScroll: true }));
}

function resolveShot() {
  const shot = state.shot;
  if (!shot) return;

  const shooter = state.turn;
  const opponent = 1 - shooter;
  const shooterName = NAMES[shooter];
  const opponentName = NAMES[opponent];
  const potted = shot.potted;
  const cueScratched = potted.some((ball) => ball.num === 0);
  const eightPotted = potted.some((ball) => ball.num === 8);
  const expected = !shot.groupAtStart
    ? 'open'
    : shot.ownBefore === 0 ? 'eight' : shot.groupAtStart;
  const actualFirst = shot.firstHit ? groupOf(shot.firstHit.num) : null;

  let firstHitFoul = '';
  if (actualFirst) {
    if (expected === 'open' && actualFirst === 'eight') {
      firstHitFoul = 'the 8-ball was hit first';
    } else if (expected === 'eight' && actualFirst !== 'eight') {
      firstHitFoul = 'the 8-ball was not hit first';
    } else if (expected !== 'open' && expected !== 'eight' && actualFirst !== expected) {
      firstHitFoul = `a ${actualFirst} ball was hit first`;
    }
  }

  state.shot = null;

  if (eightPotted) {
    const clearedBefore = Boolean(shot.groupAtStart) && shot.ownBefore === 0;
    if (clearedBefore && !cueScratched && !firstHitFoul) {
      endGame(shooter, `${shooterName} cleared ${GROUP_NAME[shot.groupAtStart]} and sank the 8-ball.`);
      return;
    }

    let reason;
    if (cueScratched) {
      reason = `${shooterName} scratched while potting the 8-ball.`;
    } else if (firstHitFoul) {
      reason = `${shooterName} fouled and potted the 8-ball.`;
    } else if (!shot.groupAtStart) {
      reason = `${shooterName} potted the 8-ball before claiming a group.`;
    } else if (groupCount(shot.groupAtStart) === 0) {
      reason = `${shooterName} potted the 8-ball on the same shot as their last ${shot.groupAtStart}. The 8 needs its own shot.`;
    } else {
      reason = `${shooterName} potted the 8-ball before clearing ${GROUP_NAME[shot.groupAtStart]}.`;
    }
    endGame(opponent, reason);
    return;
  }

  let foul = '';
  if (cueScratched) {
    foul = 'the cue ball was pocketed';
  } else if (firstHitFoul) {
    foul = firstHitFoul;
  }

  if (foul) {
    if (state.cue) {
      state.cue.alive = false;
      state.cue.vx = 0;
      state.cue.vy = 0;
    }
    state.turn = opponent;
    state.phase = 'inhand';
    state.hover = null;
    setMessage(`Foul: ${shooterName} — ${foul}. ${opponentName} has ball in hand — tap a clear spot.`);
    updateHUD();
    return;
  }

  let assignedNow = false;
  if (!shot.groupAtStart) {
    const firstObject = potted.find((ball) => ball.num !== 0 && ball.num !== 8);
    if (firstObject) {
      const group = groupOf(firstObject.num);
      state.groups[shooter] = group;
      state.groups[opponent] = otherGroup(group);
      assignedNow = true;
    }
  }

  const myGroup = state.groups[shooter];
  const myPots = myGroup
    ? potted.filter((ball) => ball.num !== 0 && ball.num !== 8 && groupOf(ball.num) === myGroup).length
    : 0;
  const opponentPots = potted.filter(
    (ball) => ball.num !== 0 && ball.num !== 8 && groupOf(ball.num) !== state.groups[shooter]
  ).length;
  const remaining = myGroup ? groupCount(myGroup) : 0;

  if (myPots > 0) {
    state.phase = 'aim';
    if (remaining === 0) {
      setMessage(`${shooterName} cleared ${GROUP_NAME[myGroup]}. On the 8-ball — shoot again.`);
    } else if (assignedNow) {
      setMessage(`${shooterName} takes ${GROUP_NAME[myGroup]} and pots ${myPots}. Shoot again.`);
    } else {
      setMessage(`${shooterName} pots ${myPots === 1 ? 'one' : myPots}. Shoot again.`);
    }
  } else {
    state.turn = opponent;
    state.phase = 'aim';
    if (opponentPots > 0) {
      setMessage(`${shooterName} potted an opponent ball. ${opponentName} to shoot.`);
    } else if (!shot.firstHit) {
      setMessage(`${shooterName} makes no contact. ${opponentName} to shoot.`);
    } else {
      setMessage(`${shooterName} misses. ${opponentName} to shoot.`);
    }
  }

  updateHUD();
}

function updatePower(power) {
  powerFill.style.width = `${Math.round(Math.max(0, Math.min(1, power)) * 100)}%`;
}

function roundRectPath(x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function diamondPath(x, y, radius) {
  ctx.beginPath();
  ctx.moveTo(x, y - radius);
  ctx.lineTo(x + radius, y);
  ctx.lineTo(x, y + radius);
  ctx.lineTo(x - radius, y);
  ctx.closePath();
}

function drawTable() {
  const totalW = W + RAIL * 2;
  const totalH = H + RAIL * 2;

  ctx.save();
  ctx.shadowColor = 'rgba(30, 36, 51, .32)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  roundRectPath(-RAIL, -RAIL, totalW, totalH, 28);
  const wood = ctx.createLinearGradient(0, -RAIL, 0, H + RAIL);
  wood.addColorStop(0, '#8a6547');
  wood.addColorStop(0.5, '#75533c');
  wood.addColorStop(1, '#5c402e');
  ctx.fillStyle = wood;
  ctx.fill();
  ctx.restore();

  roundRectPath(-RAIL, -RAIL, totalW, totalH, 28);
  ctx.strokeStyle = 'rgba(30, 36, 51, .28)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  roundRectPath(-RAIL + 3, -RAIL + 3, totalW - 6, totalH - 6, 25);
  ctx.strokeStyle = 'rgba(255, 249, 240, .16)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  roundRectPath(0, 0, W, H, 7);
  const felt = ctx.createLinearGradient(0, 0, W, H);
  felt.addColorStop(0, '#1d8a70');
  felt.addColorStop(0.55, '#167762');
  felt.addColorStop(1, '#0f6553');
  ctx.fillStyle = felt;
  ctx.fill();

  ctx.save();
  roundRectPath(0, 0, W, H, 7);
  ctx.clip();
  ctx.strokeStyle = 'rgba(6, 40, 33, .42)';
  ctx.lineWidth = 16;
  roundRectPath(0, 0, W, H, 7);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, .05)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 1);
  ctx.lineTo(W, 1);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.strokeStyle = '#fff9f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W * 0.25, 0);
  ctx.lineTo(W * 0.25, H);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(W * 0.75, H / 2, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = '#fff9f0';
  ctx.fill();
  ctx.restore();

  const fractions = [0.125, 0.25, 0.375, 0.625, 0.75, 0.875];
  ctx.fillStyle = 'rgba(255, 183, 3, .82)';
  for (const fraction of fractions) {
    diamondPath(W * fraction, -RAIL / 2, 4);
    ctx.fill();
    diamondPath(W * fraction, H + RAIL / 2, 4);
    ctx.fill();
  }
  diamondPath(-RAIL / 2, H / 2, 4);
  ctx.fill();
  diamondPath(W + RAIL / 2, H / 2, 4);
  ctx.fill();

  for (const pocket of POCKETS) {
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, POCKET_DRAW + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#4c382a';
    ctx.fill();

    const hole = ctx.createRadialGradient(
      pocket.x, pocket.y, POCKET_DRAW * 0.15,
      pocket.x, pocket.y, POCKET_DRAW
    );
    hole.addColorStop(0, '#050b0a');
    hole.addColorStop(0.72, '#0b1815');
    hole.addColorStop(1, '#17201d');
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, POCKET_DRAW, 0, Math.PI * 2);
    ctx.fillStyle = hole;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, POCKET_DRAW, Math.PI * 0.15, Math.PI * 0.85);
    ctx.strokeStyle = 'rgba(255, 249, 240, .1)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
}

function drawBall(ball) {
  const { x, y, r } = ball;
  const isCue = ball.num === 0;

  ctx.beginPath();
  ctx.ellipse(x + 2, y + 2.6, r * 1.02, r * 0.92, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(5, 25, 20, .22)';
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  if (isCue) {
    const cueGradient = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    cueGradient.addColorStop(0, '#fffdf7');
    cueGradient.addColorStop(0.65, '#f3eadb');
    cueGradient.addColorStop(1, '#d9cdb9');
    ctx.fillStyle = cueGradient;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.beginPath();
    ctx.arc(x + r * 0.32, y - r * 0.28, r * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = '#ff6b5a';
    ctx.fill();
  } else if (ball.kind === 'stripe') {
    ctx.fillStyle = '#fff9f0';
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = ball.color;
    ctx.fillRect(x - r, y - r * 0.56, r * 2, r * 1.12);
  } else {
    ctx.fillStyle = ball.color;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  const shade = ctx.createRadialGradient(
    x - r * 0.36, y - r * 0.42, r * 0.1,
    x, y, r * 1.15
  );
  shade.addColorStop(0, 'rgba(255, 255, 255, .38)');
  shade.addColorStop(0.52, 'rgba(255, 255, 255, 0)');
  shade.addColorStop(0.82, 'rgba(0, 0, 0, .12)');
  shade.addColorStop(1, 'rgba(0, 0, 0, .34)');
  ctx.fillStyle = shade;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  ctx.beginPath();
  ctx.ellipse(x - r * 0.34, y - r * 0.42, r * 0.22, r * 0.13, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, .62)';
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(30, 36, 51, .3)';
  ctx.lineWidth = 0.9;
  ctx.stroke();

  if (!isCue) {
    ctx.beginPath();
    ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#fff9f0';
    ctx.fill();
    ctx.strokeStyle = 'rgba(30, 36, 51, .16)';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    if (R * view.scale >= 7.2) {
      const label = String(ball.num);
      const size = label.length > 1 ? r * 0.54 : r * 0.64;
      ctx.save();
      ctx.translate(x, y);
      if (view.rotated) ctx.rotate(Math.PI / 2);
      ctx.font = `900 ${size}px ui-rounded, "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#1e2433';
      ctx.fillText(label, 0, size * 0.04);
      ctx.restore();
    }
  }
}

function drawGhostCue(x, y, legal) {
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fillStyle = '#fff9f0';
  ctx.fill();
  ctx.globalAlpha = 0.9;
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1.8 / Math.max(view.scale, 0.35);
  ctx.strokeStyle = legal ? '#21b6a8' : '#ff6b5a';
  ctx.stroke();
  ctx.restore();
}

function raycast(origin, dir) {
  let best = Infinity;
  const wallXs = [];
  const wallYs = [];

  if (dir.x > 0) wallXs.push((W - R - origin.x) / dir.x);
  else if (dir.x < 0) wallXs.push((R - origin.x) / dir.x);
  if (dir.y > 0) wallYs.push((H - R - origin.y) / dir.y);
  else if (dir.y < 0) wallYs.push((R - origin.y) / dir.y);

  for (const t of wallXs) if (t > 0 && t < best) best = t;
  for (const t of wallYs) if (t > 0 && t < best) best = t;

  const contact = R * 2;

  for (const ball of state.balls) {
    if (!ball.alive || ball.num === 0) continue;
    const ox = ball.x - origin.x;
    const oy = ball.y - origin.y;
    const projection = ox * dir.x + oy * dir.y;
    if (projection <= 0) continue;

    const perpSq = ox * ox + oy * oy - projection * projection;
    if (perpSq > contact * contact) continue;

    const offset = Math.sqrt(Math.max(0, contact * contact - perpSq));
    const t = projection - offset;
    if (t > 0 && t < best) best = t;
  }

  return best;
}

function drawAimGuide() {
  const cue = state.cue;
  if (!cue || !cue.alive) return;

  if (!state.drag || !state.drag.moved) {
    ctx.save();
    ctx.setLineDash([3.5 / Math.max(view.scale, 0.35), 4.5 / Math.max(view.scale, 0.35)]);
    ctx.lineWidth = 1.3 / Math.max(view.scale, 0.35);
    ctx.strokeStyle = 'rgba(255, 249, 240, .55)';
    ctx.beginPath();
    ctx.arc(cue.x, cue.y, R + 4.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const dir = state.drag.dir;
  const power = state.drag.power;
  const distance = raycast(cue, dir);
  const start = R + 2;
  const end = Math.max(start + 2, Math.min(distance, 2200) - R * 0.75);
  const unit = 1 / Math.max(view.scale, 0.35);

  ctx.save();
  ctx.setLineDash([5 * unit, 6 * unit]);
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.5 * unit;
  ctx.strokeStyle = 'rgba(255, 249, 240, .8)';
  ctx.beginPath();
  ctx.moveTo(cue.x + dir.x * start, cue.y + dir.y * start);
  ctx.lineTo(cue.x + dir.x * end, cue.y + dir.y * end);
  ctx.stroke();

  ctx.setLineDash([]);
  const targetX = cue.x + dir.x * distance;
  const targetY = cue.y + dir.y * distance;
  ctx.strokeStyle = 'rgba(255, 183, 3, .85)';
  ctx.lineWidth = 1.6 * unit;
  ctx.beginPath();
  ctx.arc(targetX, targetY, R * 0.9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const pull = R + 9 + power * 30;
  const tipX = cue.x - dir.x * pull;
  const tipY = cue.y - dir.y * pull;
  const buttLen = 96;
  const buttX = cue.x - dir.x * (pull + buttLen);
  const buttY = cue.y - dir.y * (pull + buttLen);
  const px = -dir.y;
  const py = dir.x;

  ctx.beginPath();
  ctx.moveTo(tipX + px * 2.4, tipY + py * 2.4);
  ctx.lineTo(tipX - px * 2.4, tipY - py * 2.4);
  ctx.lineTo(buttX - px * 5.6, buttY - py * 5.6);
  ctx.lineTo(buttX + px * 5.6, buttY + py * 5.6);
  ctx.closePath();
  const stick = ctx.createLinearGradient(tipX, tipY, buttX, buttY);
  stick.addColorStop(0, '#e7c79b');
  stick.addColorStop(0.5, '#cf9d63');
  stick.addColorStop(1, '#9c683c');
  ctx.fillStyle = stick;
  ctx.fill();
  ctx.strokeStyle = 'rgba(30, 36, 51, .32)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(tipX, tipY, 2.6, 0, Math.PI * 2);
  ctx.fillStyle = '#2f6fb0';
  ctx.fill();
}

function drawEffects() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  for (const effect of state.effects) {
    const progress = Math.min(1, effect.life / 0.55);
    ctx.save();
    ctx.globalAlpha = (1 - progress) * 0.55;
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, POCKET_DRAW * (0.45 + progress * 0.9), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function draw() {
  if (!view.w || !view.h || !view.scale) return;

  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.clearRect(0, 0, view.w, view.h);

  ctx.save();
  ctx.translate(view.w / 2, view.h / 2);
  if (view.rotated) ctx.rotate(-Math.PI / 2);
  ctx.scale(view.scale, view.scale);
  ctx.translate(-W / 2, -H / 2);

  drawTable();

  for (const ball of state.balls) {
    if (ball.alive) drawBall(ball);
  }

  drawEffects();

  if (state.phase === 'inhand' && state.hover) {
    const legal = isLegalSpot(state.hover.x, state.hover.y);
    drawGhostCue(state.hover.x, state.hover.y, legal);
  }

  if (state.phase === 'aim') drawAimGuide();

  ctx.restore();
}

function isLegalSpot(x, y) {
  if (x < R + 2 || x > W - R - 2 || y < R + 2 || y > H - R - 2) return false;

  for (const ball of state.balls) {
    if (!ball.alive) continue;
    const dx = ball.x - x;
    const dy = ball.y - y;
    if (dx * dx + dy * dy < (R * 2 + 2.5) * (R * 2 + 2.5)) return false;
  }

  for (const pocket of POCKETS) {
    const dx = pocket.x - x;
    const dy = pocket.y - y;
    if (dx * dx + dy * dy < (CAPTURE + R + 5) * (CAPTURE + R + 5)) return false;
  }

  return true;
}

function placeCue(x, y) {
  if (!isLegalSpot(x, y)) {
    setMessage('That spot is blocked — tap a clear area of the table.');
    return;
  }

  const cue = state.cue;
  cue.x = x;
  cue.y = y;
  cue.vx = 0;
  cue.vy = 0;
  cue.alive = true;
  state.phase = 'aim';
  state.hover = null;
  setMessage(`${NAMES[state.turn]} has the cue ball. Drag back to shoot.`);
  updateHUD();
  draw();
}

function maxDragPixels() {
  return Math.min(150, Math.max(70, Math.min(view.w, view.h) * 0.42));
}

function shoot(dir, power) {
  const cue = state.cue;
  if (!cue || !cue.alive) return;

  const length = Math.hypot(dir.x, dir.y) || 1;
  const speed = MIN_SPEED + Math.max(0, Math.min(1, power)) * (MAX_SPEED - MIN_SPEED);
  const group = state.groups[state.turn];

  state.shot = {
    potted: [],
    firstHit: null,
    groupAtStart: group,
    ownBefore: group ? groupCount(group) : 0
  };

  cue.vx = (dir.x / length) * speed;
  cue.vy = (dir.y / length) * speed;

  state.phase = 'rolling';
  state.drag = null;
  state.hover = null;
  accumulator = 0;
  updatePower(0);
  setMessage(`${NAMES[state.turn]} shoots.`);
  updateHUD();
}

function newRack() {
  rackBalls();
  state.phase = 'aim';
  state.turn = 0;
  state.groups = [null, null];
  state.shot = null;
  state.drag = null;
  state.hover = null;
  state.effects = [];
  accumulator = 0;
  veil.hidden = true;
  updatePower(0);
  setMessage('Player 1 breaks. Drag back anywhere on the table, then release.');
  updateHUD();
  draw();
}

function requestNewRack() {
  const fromVeil = !veil.hidden && veil.contains(document.activeElement);
  softRefresh(stage, () => {
    newRack();
    if (fromVeil) newRackBtn.focus({ preventScroll: true });
  });
}

function cancelDrag() {
  state.drag = null;
  updatePower(0);
  draw();
}

function endDrag(event) {
  const drag = state.drag;
  if (!drag || drag.id !== event.pointerId) return;

  state.drag = null;
  updatePower(0);

  if (state.phase === 'aim' && drag.moved && drag.power > 0.045) {
    shoot(drag.dir, drag.power);
  } else {
    draw();
  }
}

canvas.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;

  if (state.phase === 'inhand') {
    event.preventDefault();
    const point = toWorld(event.clientX, event.clientY);
    placeCue(point.x, point.y);
    return;
  }

  if (state.phase !== 'aim' || !state.cue || !state.cue.alive) return;

  event.preventDefault();
  try {
    canvas.setPointerCapture(event.pointerId);
  } catch (error) {
    /* pointer capture is optional */
  }

  state.drag = {
    id: event.pointerId,
    sx: event.clientX,
    sy: event.clientY,
    power: 0,
    dir: { x: 1, y: 0 },
    moved: false
  };
  state.hover = null;
  updatePower(0);
  draw();
});

canvas.addEventListener('pointermove', (event) => {
  if (state.phase === 'inhand') {
    state.hover = toWorld(event.clientX, event.clientY);
    draw();
    return;
  }

  const drag = state.drag;
  if (!drag || drag.id !== event.pointerId) return;

  const dx = drag.sx - event.clientX;
  const dy = drag.sy - event.clientY;
  const distance = Math.hypot(dx, dy);
  drag.power = Math.min(1, distance / maxDragPixels());

  if (distance > 3) {
    const direction = screenVectorToWorld(dx, dy);
    const length = Math.hypot(direction.x, direction.y) || 1;
    drag.dir = { x: direction.x / length, y: direction.y / length };
    drag.moved = true;
  }

  updatePower(drag.power);
  draw();
});

canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', cancelDrag);

canvas.addEventListener('pointerleave', () => {
  if (state.phase === 'inhand' && state.hover) {
    state.hover = null;
    draw();
  }
});

canvas.addEventListener('contextmenu', (event) => event.preventDefault());

$('reset').addEventListener('click', requestNewRack);
newRackBtn.addEventListener('click', requestNewRack);
rematchBtn.addEventListener('click', requestNewRack);

function frame(now) {
  window.requestAnimationFrame(frame);

  if (!lastTime) lastTime = now;
  const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;

  if (state.effects.length) {
    for (const effect of state.effects) effect.life += dt;
    state.effects = state.effects.filter((effect) => effect.life < 0.55);
  }

  if (state.phase === 'rolling') {
    accumulator += dt;
    let steps = 0;

    while (accumulator >= STEP && steps < 14) {
      stepPhysics(STEP);
      accumulator -= STEP;
      steps += 1;
    }

    if (steps === 14) accumulator = 0;
    if (allStopped()) resolveShot();
  }

  draw();
}

let resizeObserver = null;
if ('ResizeObserver' in window) {
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => window.setTimeout(resize, 120));

newRack();
resize();
window.requestAnimationFrame(frame);
