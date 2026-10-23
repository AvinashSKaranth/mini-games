// Pure rules for Math Race 4P: question generation, difficulty ramp, ranking.

export const GOAL = 8;

const clampInt = (value, min, max) => Math.min(max, Math.max(min, Math.round(value)));

function buildOptions(answer, rng) {
  const pool = new Set();
  for (const offset of [1, -1, 2, -2, 10, -10, 3, -3, 5, -5]) {
    const value = answer + offset;
    if (value >= 0 && value !== answer) pool.add(value);
  }

  const remaining = [...pool];
  const picked = [];
  while (picked.length < 2 && remaining.length) {
    const index = Math.min(remaining.length - 1, Math.floor(rng() * remaining.length));
    picked.push(remaining.splice(index, 1)[0]);
  }
  while (picked.length < 2) picked.push(answer + 7 + picked.length * 3);

  const options = [answer, ...picked];
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

/** Question difficulty follows the player's own progress, 1 (easy) to 8 (hard). */
export function levelFor(progress) {
  return clampInt(1 + Math.floor((clampInt(progress, 0, GOAL) / GOAL) * 7), 1, 8);
}

/** Build one question with three answer options for a difficulty tier. */
export function makeQuestion(level = 1, rng = Math.random) {
  const tier = clampInt(level, 1, 8);
  const random = (min, max) => min + Math.floor(rng() * (max - min + 1));

  let a;
  let b;
  let op;
  let answer;

  if (tier <= 2) {
    op = '+';
    a = random(2, 9);
    b = random(2, 9);
    answer = a + b;
  } else if (tier <= 4) {
    if (rng() < 0.5) {
      op = '−';
      a = random(10, 30);
      b = random(2, 9);
      answer = a - b;
    } else {
      op = '+';
      a = random(10, 29);
      b = random(2, 9);
      answer = a + b;
    }
  } else if (tier <= 6) {
    op = '×';
    a = random(2, 6);
    b = random(2, 9);
    answer = a * b;
  } else {
    const pick = rng();
    if (pick < 0.55) {
      op = '×';
      a = random(3, 9);
      b = random(3, 9);
      answer = a * b;
    } else if (pick < 0.8) {
      op = '+';
      a = random(20, 89);
      b = random(11, 49);
      answer = a + b;
    } else {
      op = '−';
      a = random(40, 99);
      b = random(11, 39);
      answer = a - b;
    }
  }

  return { a, b, op, answer, options: buildOptions(answer, rng) };
}

/** Rank finishers by progress; ties fall back to turn order. */
export function rankPlayers(progress) {
  return progress
    .map((value, index) => ({ index, progress: value }))
    .sort((a, b) => b.progress - a.progress || a.index - b.index);
}

export function formatSeconds(ms) {
  return `${(Math.max(0, ms) / 1000).toFixed(1)}s`;
}
