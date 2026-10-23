# Mini Games

Twelve free mini games for one, two, or three players. No accounts, no ads, no install, and no network connection needed after the first load.

**Live site:** `docs/index.html` (deploy the `docs` folder with GitHub Pages)

## Games

| Game | Players | Path |
|---|---|---|
| 2048 | 1 | `docs/1player/2048/` |
| Sudoku | 1 | `docs/1player/sudoku/` |
| Minesweeper | 1 | `docs/1player/minesweeper/` |
| Word Guess | 1 | `docs/1player/word-guess/` |
| Tic Tac Toe | 2 | `docs/2player/tic-tac-toe/` |
| Four in a Row | 2 | `docs/2player/four-in-a-row/` |
| Ping Pong | 2 | `docs/2player/ping-pong/` |
| Pool | 2 | `docs/2player/pool/` |
| Snakes | 2 | `docs/2player/snakes/` |
| Paint Fight | 2 | `docs/2player/paint-fight/` |
| Memory Match | 2 | `docs/2player/memory-match/` |
| Whack-a-Mole | 3 | `docs/3player/whack-a-mole/` |

## Run locally

From the repository root:

```powershell
python -m http.server 8765 --directory docs
```

Then open <http://localhost:8765/>. Use a local server rather than opening the files directly so the service worker and manifest can load.

## Deploy to GitHub Pages

1. Push the repository to GitHub.
2. Open **Settings → Pages**.
3. Set **Source** to **Deploy from a branch**.
4. Choose the `master` branch (or `main` if renamed) and the `/docs` folder.
5. Save. The site will publish at `https://<user>.github.io/<repo>/`.

All paths are relative, so the same build works at a user root or a repository subpath.

## Technical notes

- Vanilla HTML, CSS, and ES modules; no framework and no build step.
- Original inline/local SVG art. Every game's assets live in its own `assets/` folder.
- Responsive portrait and landscape layouts, including a board-plus-side-panel mode for landscape phones.
- `docs/sw.js` pre-caches the hub and all twelve games. Navigation requests are network-first; assets are cache-first. The cache name is versioned and installs refresh each core asset with `cache: 'reload'`.
- New games share `docs/shared/game.css` and `docs/shared/refresh.js`; every reset/rematch fades the play surface, rebuilds it, then fades back in, respecting `prefers-reduced-motion`.
- `docs/manifest.webmanifest` provides the installable PWA metadata.

Research, the full 56-game catalog, and implementation status live in [`.document/brd.md`](.document/brd.md).

## Checks

- Engine tests: `node tests/engine-tests.mjs` (2048, Minesweeper, Sudoku).
- Syntax: `node --check` on every JS file.
- Verified interactions, offline loading, and layouts at 320×568, 390×844, 568×320, and 844×390. Reset/rematch fades were checked in all seven new games.
