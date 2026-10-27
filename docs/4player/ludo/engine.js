// Pure rules for Ludo: the 56-cell circuit, token progress, captures, legality.

/** The circuit, clockwise. Consecutive cells (and 55 → 0) are orthogonal neighbours. */
export const TRACK = [
  [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [6, 6], [5, 6],
  [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 7], [0, 8], [1, 8],
  [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [6, 9], [6, 10], [6, 11],
  [6, 12], [6, 13], [6, 14], [7, 14], [8, 14], [8, 13], [8, 12], [8, 11],
  [8, 10], [8, 9], [8, 8], [9, 8], [10, 8], [11, 8], [12, 8], [13, 8],
  [14, 8], [14, 7], [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0]
];

export const TRACK_LEN = TRACK.length; // 56

/** Entry square per player (0…3), a quarter turn apart. */
export const STARTS = [42, 0, 14, 28];

/** Extra starred squares no opponent may be knocked off. */
export const STARS = [50, 8, 22, 36];

export const SAFE = new Set([...STARTS, ...STARS]);

/** Four resting cells per player's yard. */
export const YARDS = [
  [[11, 2], [11, 3], [12, 2], [12, 3]],
  [[2, 2], [2, 3], [3, 2], [3, 3]],
  [[2, 11], [2, 12], [3, 11], [3, 12]],
  [[11, 11], [11, 12], [12, 11], [12, 12]]
];

/** Six home-column cells per player, outermost first; then the shared goal. */
export const HOME_COLUMNS = [
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]]
];

export const GOAL = [7, 7];

/**
 * Progress: 0 = yard, 1…TRACK_LEN = circuit cells,
 * TRACK_LEN+1 … GOAL_PROGRESS-1 = home column, GOAL_PROGRESS = goal.
 */
export const GOAL_PROGRESS = TRACK_LEN + HOME_COLUMNS[0].length + 1; // 63

/** Board cell for a token: {r, c}. Yard tokens get their own parking spot. */
export function cellOf(player, progress, tokenIndex = 0) {
  if (progress <= 0) return YARDS[player][tokenIndex % YARDS[player].length];
  if (progress === GOAL_PROGRESS) return GOAL;

  if (progress <= TRACK_LEN) {
    const index = (STARTS[player] + progress - 1) % TRACK_LEN;
    return TRACK[index];
  }

  return HOME_COLUMNS[player][progress - TRACK_LEN - 1];
}

/** Circuit index for a token standing on the track, or -1 when it is not. */
export function trackIndex(player, progress) {
  if (progress <= 0 || progress > TRACK_LEN) return -1;
  return (STARTS[player] + progress - 1) % TRACK_LEN;
}

export function rollDie(rng = Math.random) {
  return 1 + Math.floor(rng() * 6);
}

/** Three sixes in a row voids the roll; returns the new streak length. */
export function nextSixes(count, roll) {
  return roll === 6 ? count + 1 : 0;
}

export function forfeitsSixes(count) {
  return count >= 3;
}

function occupiedByOwn(game, player, cellIndex) {
  return game.tokens[player].some((progress) => trackIndex(player, progress) === cellIndex);
}

/** Which of this player's tokens may move by `roll`. */
export function legalMoves(game, player, roll) {
  const moves = [];

  game.tokens[player].forEach((progress, tokenIndex) => {
    if (progress === GOAL_PROGRESS) return;

    if (progress === 0) {
      if (roll === 6) moves.push(tokenIndex);
      return;
    }

    const target = progress + roll;
    if (target > GOAL_PROGRESS) return;
    if (target <= TRACK_LEN) {
      const cellIndex = trackIndex(player, target);
      // Own pieces may share a square only on safe cells.
      if (!SAFE.has(cellIndex) && occupiedByOwn(game, player, cellIndex)) return;
    }

    moves.push(tokenIndex);
  });

  return moves;
}

/**
 * Move a token. Returns {game, captured, finished, entered} — captures only
 * happen off safe squares, and every opponent sharing the square goes home.
 */
export function applyMove(game, player, tokenIndex, roll) {
  const tokens = game.tokens.map((row) => row.slice());
  const from = tokens[player][tokenIndex];
  const target = from === 0 ? 1 : from + roll;
  tokens[player][tokenIndex] = target;

  const captured = [];

  if (target <= TRACK_LEN) {
    const cellIndex = trackIndex(player, target);
    if (!SAFE.has(cellIndex)) {
      for (let rival = 0; rival < 4; rival += 1) {
        if (rival === player) continue;
        tokens[rival] = tokens[rival].map((progress, otherIndex) => {
          if (trackIndex(rival, progress) !== cellIndex) return progress;
          captured.push({ player: rival, token: otherIndex });
          return 0;
        });
      }
    }
  }

  return {
    game: { tokens },
    captured,
    finished: target === GOAL_PROGRESS,
    entered: from === 0,
    target
  };
}

/** All four tokens home. */
export function hasWon(game, player) {
  return game.tokens[player].every((progress) => progress === GOAL_PROGRESS);
}

/** Progress total used for tie-break style rankings in the result sheet. */
export function totalProgress(game, player) {
  return game.tokens[player].reduce((sum, progress) => sum + progress, 0);
}
