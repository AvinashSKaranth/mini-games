const CACHE = 'mini-games-v4';

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
  './3player/whack-a-mole/assets/trophy.svg'
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
