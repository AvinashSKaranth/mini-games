// Pure rules for Hangman: a categorized word bank and the letter-mask helpers.

export const MAX_MISSES = 6;

export const WORDS = [
  { word: 'TIGER', category: 'Animals' },
  { word: 'GIRAFFE', category: 'Animals' },
  { word: 'OTTER', category: 'Animals' },
  { word: 'RABBIT', category: 'Animals' },
  { word: 'DOLPHIN', category: 'Animals' },
  { word: 'PENGUIN', category: 'Animals' },
  { word: 'KOALA', category: 'Animals' },
  { word: 'LIZARD', category: 'Animals' },
  { word: 'MONKEY', category: 'Animals' },
  { word: 'ZEBRA', category: 'Animals' },
  { word: 'CAMEL', category: 'Animals' },
  { word: 'FALCON', category: 'Animals' },
  { word: 'BEAVER', category: 'Animals' },
  { word: 'TURTLE', category: 'Animals' },
  { word: 'PANDA', category: 'Animals' },

  { word: 'PIZZA', category: 'Food' },
  { word: 'MANGO', category: 'Food' },
  { word: 'WAFFLE', category: 'Food' },
  { word: 'NOODLE', category: 'Food' },
  { word: 'BUTTER', category: 'Food' },
  { word: 'CINNAMON', category: 'Food' },
  { word: 'BANANA', category: 'Food' },
  { word: 'CHEESE', category: 'Food' },
  { word: 'COOKIE', category: 'Food' },
  { word: 'PEPPER', category: 'Food' },
  { word: 'LEMON', category: 'Food' },
  { word: 'TOAST', category: 'Food' },
  { word: 'YOGURT', category: 'Food' },
  { word: 'PUMPKIN', category: 'Food' },
  { word: 'GARLIC', category: 'Food' },

  { word: 'CASTLE', category: 'Places' },
  { word: 'HARBOR', category: 'Places' },
  { word: 'DESERT', category: 'Places' },
  { word: 'LIBRARY', category: 'Places' },
  { word: 'KITCHEN', category: 'Places' },
  { word: 'STADIUM', category: 'Places' },
  { word: 'GARDEN', category: 'Places' },
  { word: 'BRIDGE', category: 'Places' },
  { word: 'ISLAND', category: 'Places' },
  { word: 'MUSEUM', category: 'Places' },
  { word: 'MARKET', category: 'Places' },
  { word: 'TUNNEL', category: 'Places' },
  { word: 'VILLAGE', category: 'Places' },
  { word: 'FACTORY', category: 'Places' },
  { word: 'BALCONY', category: 'Places' },

  { word: 'FOREST', category: 'Nature' },
  { word: 'THUNDER', category: 'Nature' },
  { word: 'GLACIER', category: 'Nature' },
  { word: 'MEADOW', category: 'Nature' },
  { word: 'VOLCANO', category: 'Nature' },
  { word: 'RAINBOW', category: 'Nature' },
  { word: 'RIVER', category: 'Nature' },
  { word: 'CANYON', category: 'Nature' },
  { word: 'BLOSSOM', category: 'Nature' },
  { word: 'SUNSET', category: 'Nature' },
  { word: 'PUDDLE', category: 'Nature' },
  { word: 'ORCHID', category: 'Nature' },
  { word: 'HORIZON', category: 'Nature' },
  { word: 'PRAIRIE', category: 'Nature' },
  { word: 'CRYSTAL', category: 'Nature' },

  { word: 'LANTERN', category: 'Objects' },
  { word: 'MIRROR', category: 'Objects' },
  { word: 'UMBRELLA', category: 'Objects' },
  { word: 'PENCIL', category: 'Objects' },
  { word: 'BASKET', category: 'Objects' },
  { word: 'CANDLE', category: 'Objects' },
  { word: 'HAMMER', category: 'Objects' },
  { word: 'JACKET', category: 'Objects' },
  { word: 'LADDER', category: 'Objects' },
  { word: 'POCKET', category: 'Objects' },
  { word: 'SCISSORS', category: 'Objects' },
  { word: 'TEAPOT', category: 'Objects' },
  { word: 'WALLET', category: 'Objects' },
  { word: 'COMPASS', category: 'Objects' },
  { word: 'BLANKET', category: 'Objects' },

  { word: 'TENNIS', category: 'Sports' },
  { word: 'HOCKEY', category: 'Sports' },
  { word: 'SOCCER', category: 'Sports' },
  { word: 'CRICKET', category: 'Sports' },
  { word: 'RUGBY', category: 'Sports' },
  { word: 'BOXING', category: 'Sports' },
  { word: 'SKATING', category: 'Sports' },
  { word: 'SURFING', category: 'Sports' },
  { word: 'ARCHERY', category: 'Sports' },
  { word: 'CYCLING', category: 'Sports' },
  { word: 'ROWING', category: 'Sports' },
  { word: 'BOWLING', category: 'Sports' },
  { word: 'FENCING', category: 'Sports' },
  { word: 'MARATHON', category: 'Sports' },
  { word: 'GYMNAST', category: 'Sports' },

  { word: 'ELBOW', category: 'Body' },
  { word: 'SHOULDER', category: 'Body' },
  { word: 'KNUCKLE', category: 'Body' },
  { word: 'ANKLE', category: 'Body' },
  { word: 'MUSCLE', category: 'Body' },
  { word: 'STOMACH', category: 'Body' },
  { word: 'SKELETON', category: 'Body' },
  { word: 'EYELASH', category: 'Body' },
  { word: 'THUMB', category: 'Body' },
  { word: 'TONGUE', category: 'Body' },
  { word: 'SPINE', category: 'Body' },
  { word: 'WRIST', category: 'Body' },
  { word: 'HEART', category: 'Body' },
  { word: 'LIVER', category: 'Body' },
  { word: 'NOSTRIL', category: 'Body' },

  { word: 'VIOLIN', category: 'Music' },
  { word: 'TRUMPET', category: 'Music' },
  { word: 'DRUM', category: 'Music' },
  { word: 'PIANO', category: 'Music' },
  { word: 'GUITAR', category: 'Music' },
  { word: 'HARMONY', category: 'Music' },
  { word: 'MELODY', category: 'Music' },
  { word: 'RHYTHM', category: 'Music' },
  { word: 'CHORUS', category: 'Music' },
  { word: 'UKULELE', category: 'Music' },
  { word: 'BANJO', category: 'Music' },
  { word: 'ORCHESTRA', category: 'Music' },
  { word: 'LYRICS', category: 'Music' },
  { word: 'TEMPO', category: 'Music' },
  { word: 'CLARINET', category: 'Music' }
];

/** Pick a puzzle, avoiding an immediate repeat when possible. */
export function pickWord(rng = Math.random, previous = '') {
  const index = Math.min(WORDS.length - 1, Math.floor(rng() * WORDS.length));
  let entry = WORDS[index];
  if (WORDS.length > 1 && entry.word === previous) {
    entry = WORDS[(index + 1) % WORDS.length];
  }
  return { ...entry };
}

/** Letters the player has not found yet come back as null. */
export function maskWord(word, guessed) {
  return [...word].map((letter) => (guessed.has(letter) ? letter : null));
}

export function isSolved(word, guessed) {
  return [...word].every((letter) => guessed.has(letter));
}

/** Guessed letters that are not in the word, in guess order. */
export function wrongLetters(word, guessed) {
  return [...guessed].filter((letter) => !word.includes(letter));
}

export function livesLeft(word, guessed) {
  return MAX_MISSES - wrongLetters(word, guessed).length;
}

export function missingLetters(word, guessed) {
  return [...new Set([...word])].filter((letter) => !guessed.has(letter));
}
