const CACHE = 'mini-games-v5';

const CORE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
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
  './2player/tic-tac-toe/',
  './2player/tic-tac-toe/style.css',
  './2player/tic-tac-toe/game.js',
  './2player/tic-tac-toe/assets/icon.svg',
  './2player/tic-tac-toe/assets/x.svg',
  './2player/tic-tac-toe/assets/o.svg',
  './2player/tic-tac-toe/assets/trophy.svg',
  './3player/whack-a-mole/',
  './3player/whack-a-mole/style.css',
  './3player/whack-a-mole/game.js',
  './3player/whack-a-mole/assets/icon.svg',
  './3player/whack-a-mole/assets/mole.svg',
  './3player/whack-a-mole/assets/trophy.svg',
  './shared/game.css',
  './shared/refresh.js',
  './1player/word-guess/',
  './1player/word-guess/style.css',
  './1player/word-guess/game.js',
  './1player/word-guess/assets/icon.svg',
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
  './2player/memory-match/assets/trophy.svg'
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
