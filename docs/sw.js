const CACHE = 'mini-games-v12';

const CORE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './shared/game.css',
  './shared/refresh.js',

  './1player/2048/',
  './1player/2048/style.css',
  './1player/2048/engine.js',
  './1player/2048/game.js',
  './1player/2048/assets/icon.svg',
  './1player/sudoku/',
  './1player/sudoku/style.css',
  './1player/sudoku/engine.js',
  './1player/sudoku/game.js',
  './1player/sudoku/assets/icon.svg',
  './1player/sudoku/assets/sparkle.svg',
  './1player/minesweeper/',
  './1player/minesweeper/style.css',
  './1player/minesweeper/engine.js',
  './1player/minesweeper/game.js',
  './1player/minesweeper/assets/icon.svg',
  './1player/minesweeper/assets/mine.svg',
  './1player/minesweeper/assets/flag.svg',
  './1player/minesweeper/assets/trophy.svg',
  './1player/word-guess/',
  './1player/word-guess/style.css',
  './1player/word-guess/game.js',
  './1player/word-guess/assets/icon.svg',
  './1player/solitaire/',
  './1player/solitaire/style.css',
  './1player/solitaire/game.js',
  './1player/solitaire/assets/icon.svg',

  './2player/tic-tac-toe/',
  './2player/tic-tac-toe/style.css',
  './2player/tic-tac-toe/game.js',
  './2player/tic-tac-toe/assets/icon.svg',
  './2player/tic-tac-toe/assets/x.svg',
  './2player/tic-tac-toe/assets/o.svg',
  './2player/tic-tac-toe/assets/trophy.svg',
  './2player/four-in-a-row/',
  './2player/four-in-a-row/style.css',
  './2player/four-in-a-row/game.js',
  './2player/four-in-a-row/assets/icon.svg',
  './2player/ping-pong/',
  './2player/ping-pong/style.css',
  './2player/ping-pong/game.js',
  './2player/ping-pong/assets/icon.svg',
  './2player/pool/',
  './2player/pool/style.css',
  './2player/pool/game.js',
  './2player/pool/assets/icon.svg',
  './2player/snakes/',
  './2player/snakes/style.css',
  './2player/snakes/game.js',
  './2player/snakes/assets/icon.svg',
  './2player/paint-fight/',
  './2player/paint-fight/style.css',
  './2player/paint-fight/game.js',
  './2player/paint-fight/assets/icon.svg',
  './2player/memory-match/',
  './2player/memory-match/style.css',
  './2player/memory-match/game.js',
  './2player/memory-match/assets/icon.svg',
  './2player/memory-match/assets/bolt.svg',
  './2player/memory-match/assets/fish.svg',
  './2player/memory-match/assets/flower.svg',
  './2player/memory-match/assets/gem.svg',
  './2player/memory-match/assets/heart.svg',
  './2player/memory-match/assets/leaf.svg',
  './2player/memory-match/assets/moon.svg',
  './2player/memory-match/assets/star.svg',
  './2player/memory-match/assets/trophy.svg',
  './2player/air-hockey/',
  './2player/air-hockey/style.css',
  './2player/air-hockey/game.js',
  './2player/air-hockey/assets/icon.svg',
  './2player/chess/',
  './2player/chess/style.css',
  './2player/chess/game.js',
  './2player/chess/assets/icon.svg',
  './2player/mancala/',
  './2player/mancala/style.css',
  './2player/mancala/game.js',
  './2player/mancala/assets/icon.svg',
  './2player/mini-golf/',
  './2player/mini-golf/style.css',
  './2player/mini-golf/game.js',
  './2player/mini-golf/assets/icon.svg',
  './2player/checkers/',
  './2player/checkers/style.css',
  './2player/checkers/game.js',
  './2player/checkers/assets/icon.svg',
  './2player/checkers/assets/crown.svg',
  './2player/darts/',
  './2player/darts/style.css',
  './2player/darts/game.js',
  './2player/darts/assets/icon.svg',

  './4player/whack-a-mole/',
  './4player/whack-a-mole/style.css',
  './4player/whack-a-mole/game.js',
  './4player/whack-a-mole/assets/icon.svg',
  './4player/whack-a-mole/assets/mole.svg',
  './4player/whack-a-mole/assets/trophy.svg',
  './4player/snakes/',
  './4player/snakes/style.css',
  './4player/snakes/game.js',
  './4player/snakes/assets/icon.svg',
  './4player/paint-fight/',
  './4player/paint-fight/style.css',
  './4player/paint-fight/game.js',
  './4player/paint-fight/assets/icon.svg',
  './4player/spinner-war/',
  './4player/spinner-war/style.css',
  './4player/spinner-war/game.js',
  './4player/spinner-war/assets/icon.svg',
  './4player/tug-of-war/',
  './4player/tug-of-war/style.css',
  './4player/tug-of-war/game.js',
  './4player/tug-of-war/assets/icon.svg',
  './4player/archery/',
  './4player/archery/style.css',
  './4player/archery/game.js',
  './4player/archery/engine.js',
  './4player/archery/assets/icon.svg',
  './4player/math-race/',
  './4player/math-race/style.css',
  './4player/math-race/game.js',
  './4player/math-race/engine.js',
  './4player/math-race/assets/icon.svg',
  './1player/hangman/',
  './1player/hangman/style.css',
  './1player/hangman/game.js',
  './1player/hangman/engine.js',
  './1player/hangman/assets/icon.svg',
  './1player/water-sort/',
  './1player/water-sort/style.css',
  './1player/water-sort/game.js',
  './1player/water-sort/engine.js',
  './1player/water-sort/assets/icon.svg',
  './1player/sliding-puzzle/',
  './1player/sliding-puzzle/style.css',
  './1player/sliding-puzzle/game.js',
  './1player/sliding-puzzle/engine.js',
  './1player/sliding-puzzle/assets/icon.svg',
  './1player/wood-blocks/',
  './1player/wood-blocks/style.css',
  './1player/wood-blocks/game.js',
  './1player/wood-blocks/engine.js',
  './1player/wood-blocks/assets/icon.svg',
  './1player/stack/',
  './1player/stack/style.css',
  './1player/stack/game.js',
  './1player/stack/engine.js',
  './1player/stack/assets/icon.svg',
  './1player/flappy-jump/',
  './1player/flappy-jump/style.css',
  './1player/flappy-jump/game.js',
  './1player/flappy-jump/engine.js',
  './1player/flappy-jump/assets/icon.svg',
  './1player/ball-run/',
  './1player/ball-run/style.css',
  './1player/ball-run/game.js',
  './1player/ball-run/engine.js',
  './1player/ball-run/assets/icon.svg',
  './2player/sumo/',
  './2player/sumo/style.css',
  './2player/sumo/game.js',
  './2player/sumo/engine.js',
  './2player/sumo/assets/icon.svg',
  './2player/penalty-kicks/',
  './2player/penalty-kicks/style.css',
  './2player/penalty-kicks/game.js',
  './2player/penalty-kicks/engine.js',
  './2player/penalty-kicks/assets/icon.svg',
  './2player/dots-and-boxes/',
  './2player/dots-and-boxes/style.css',
  './2player/dots-and-boxes/game.js',
  './2player/dots-and-boxes/engine.js',
  './2player/dots-and-boxes/assets/icon.svg',
  './4player/reflex-race/',
  './4player/reflex-race/style.css',
  './4player/reflex-race/game.js',
  './4player/reflex-race/engine.js',
  './4player/reflex-race/assets/icon.svg',
  './4player/ludo/',
  './4player/ludo/style.css',
  './4player/ludo/game.js',
  './4player/ludo/engine.js',
  './4player/ludo/assets/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(
        CORE.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'reload' });
            if (response.ok) await cache.put(url, response);
          } catch {
            /* one missing asset should not block the install */
          }
        })
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
