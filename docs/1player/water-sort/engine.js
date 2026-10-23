// Pure rules for Water Sort: tube pouring, win detection, and solvable deals.

export const CAPACITY = 4;

export const LEVELS = {
  easy: { colors: 4, empty: 2, label: 'Easy' },
  medium: { colors: 6, empty: 2, label: 'Medium' },
  hard: { colors: 8, empty: 2, label: 'Hard' }
};

export function isUniform(tube) {
  return tube.length === 0 || tube.every((unit) => unit === tube[0]);
}

/** Every tube is empty or a single colour, which means the puzzle is solved. */
export function isComplete(tubes) {
  return tubes.every(isUniform);
}

/** Length of the same-colour run sitting on top of a tube. */
export function topRun(tube) {
  if (!tube.length) return 0;
  const color = tube[tube.length - 1];
  let count = 0;
  for (let index = tube.length - 1; index >= 0 && tube[index] === color; index -= 1) count += 1;
  return count;
}

export function canPour(tubes, from, to) {
  if (from === to) return false;
  const source = tubes[from];
  const target = tubes[to];
  if (!source || !target || !source.length) return false;
  if (target.length >= CAPACITY) return false;
  if (target.length === 0) return true;
  return target[target.length - 1] === source[source.length - 1];
}

/** Returns the next board plus how many units moved, or null for an illegal pour. */
export function pour(tubes, from, to) {
  if (!canPour(tubes, from, to)) return null;
  const source = tubes[from];
  const target = tubes[to];
  const color = source[source.length - 1];
  const moved = Math.min(topRun(source), CAPACITY - target.length);

  const next = tubes.map((tube) => tube.slice());
  next[from] = source.slice(0, source.length - moved);
  next[to] = [...target, ...Array(moved).fill(color)];

  return { tubes: next, moved, color };
}

function canonical(tubes) {
  return tubes
    .map((tube) => tube.join(','))
    .sort()
    .join('|');
}

/**
 * Depth-first search with a visited set. Real puzzles are solved in a few
 * thousand nodes; the cap keeps a bad deal from freezing the page.
 */
export function isSolvable(tubes, nodeLimit = 120000) {
  if (isComplete(tubes)) return true;

  const seen = new Set();
  const stack = [tubes.map((tube) => tube.slice())];
  let nodes = 0;

  while (stack.length) {
    const state = stack.pop();
    const key = canonical(state);
    if (seen.has(key)) continue;
    seen.add(key);
    if (isComplete(state)) return true;
    if (nodes >= nodeLimit) return false;
    nodes += 1;

    const options = [];
    for (let from = 0; from < state.length; from += 1) {
      if (!state[from].length) continue;
      const sourceReady = isUniform(state[from]);
      for (let to = 0; to < state.length; to += 1) {
        if (from === to) continue;
        if (sourceReady && state[to].length === 0) continue;
        const result = pour(state, from, to);
        if (result) options.push(result);
      }
    }
    options.sort((a, b) => b.moved - a.moved);
    for (const option of options) stack.push(option.tubes);
  }

  return false;
}

function shuffled(pool, rng) {
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swap = Math.min(index, Math.floor(rng() * (index + 1)));
    [pool[index], pool[swap]] = [pool[swap], pool[index]];
  }
  return pool;
}

function fallback(colors, empty) {
  const tubes = [];
  for (let pair = 0; pair < colors / 2; pair += 1) {
    const a = pair * 2;
    const b = a + 1;
    tubes.push([a, b, a, b], [b, a, b, a]);
  }
  for (let index = 0; index < empty; index += 1) tubes.push([]);
  return tubes;
}

/** Deal a board and prove it can be solved before handing it over. */
export function generateTubes(level = 'easy', rng = Math.random, attempts = 30) {
  const { colors, empty } = LEVELS[level] ?? LEVELS.easy;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const pool = [];
    for (let color = 0; color < colors; color += 1) {
      for (let unit = 0; unit < CAPACITY; unit += 1) pool.push(color);
    }
    shuffled(pool, rng);

    const tubes = [];
    for (let index = 0; index < colors; index += 1) {
      tubes.push(pool.slice(index * CAPACITY, (index + 1) * CAPACITY));
    }
    for (let index = 0; index < empty; index += 1) tubes.push([]);

    if (isComplete(tubes)) continue;
    if (!isSolvable(tubes)) continue;
    return tubes;
  }

  return fallback(colors, empty);
}
