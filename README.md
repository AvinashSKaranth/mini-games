# Mini Games

Twenty-seven free mini games for one, two, or four players. No accounts, no ads, no install, and no network connection needed after the first load.

**Live site:** `docs/index.html` (deploy the `docs` folder with GitHub Pages)

## Games

| Game | Players | Modes | Path |
|---|---|---|---|
| 2048 | 1 | Solo | `docs/1player/2048/` |
| Sudoku | 1 | Solo | `docs/1player/sudoku/` |
| Minesweeper | 1 | Solo | `docs/1player/minesweeper/` |
| Word Guess | 1 | Solo | `docs/1player/word-guess/` |
| Hangman | 1 | Solo | `docs/1player/hangman/` |
| Water Sort | 1 | Solo | `docs/1player/water-sort/` |
| Solitaire | 1 | Solo | `docs/1player/solitaire/` |
| Darts | 1 | Solo 501 or local 2P | `docs/2player/darts/` |
| Tic Tac Toe | 2 | Local 2P or AI | `docs/2player/tic-tac-toe/` |
| Four in a Row | 2 | Local 2P or AI | `docs/2player/four-in-a-row/` |
| Ping Pong | 2 | Local 2P or AI | `docs/2player/ping-pong/` |
| Snakes | 2 | Local 2P or AI | `docs/2player/snakes/` |
| Pool | 2 | Local 2P or AI | `docs/2player/pool/` |
| Air Hockey | 2 | Local 2P | `docs/2player/air-hockey/` |
| Chess | 2 | Local 2P or AI | `docs/2player/chess/` |
| Mancala | 2 | Local 2P | `docs/2player/mancala/` |
| Mini Golf | 2 | Solo or local 2P | `docs/2player/mini-golf/` |
| Checkers | 2 | Local 2P or AI | `docs/2player/checkers/` |
| Paint Fight | 2 | Local 2P | `docs/2player/paint-fight/` |
| Memory Match | 2 | Local 2P | `docs/2player/memory-match/` |
| Whack-a-Mole | 4 | Local 4P | `docs/4player/whack-a-mole/` |
| Snakes 4P | 4 | Local 4P | `docs/4player/snakes/` |
| Paint Fight 4P | 4 | Local 4P | `docs/4player/paint-fight/` |
| Spinner War 4P | 4 | Local 4P | `docs/4player/spinner-war/` |
| Tug of War | 4 | Local 2v2 | `docs/4player/tug-of-war/` |
| Archery | 4 | Hot-seat 4P | `docs/4player/archery/` |
| Math Race | 4 | Local 4P | `docs/4player/math-race/` |

Catalog counts shown on the hub: **27 games — 1P 8, 2P 12, 4P 7**. Darts is the sixth 1P card because solo 501 is its primary mode; the same build also supports local 2P.

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
- Original local SVG art. Every game's assets live in its own `assets/` folder.
- Responsive portrait and landscape layouts, including board-plus-side-panel layouts for landscape phones and 2×2/4-column party layouts.
- Local 2P remains the default in every duel; visible `2 Players` / `vs AI` switches are used where an AI exists.
- `docs/sw.js` pre-caches the hub and all twenty-seven games. Navigation requests are network-first; assets are cache-first. The cache name is versioned (`mini-games-v11`) and installs refresh each core asset with `cache: 'reload'`.
- New games share `docs/shared/game.css` and `docs/shared/refresh.js`; every reset/rematch fades the play surface, rebuilds it, then fades back in, respecting `prefers-reduced-motion`.
- `docs/manifest.webmanifest` provides the installable PWA metadata.

Design conventions, art rules, reset behavior, accessibility notes, and the definition of done live in [`CLAUDE.md`](CLAUDE.md). Research and the full 56-game catalog live in [`.document/brd.md`](.document/brd.md).

## Checks

- Engine tests: `node tests/engine-tests.mjs` (2048, Minesweeper, Sudoku, Archery, Math Race, Hangman, Water Sort).
- Syntax: `node --check` on every JS file.
- Static link/asset check across all twenty-seven game folders.
- Browser smoke tests at 320×568, 390×844, 568×320, and 844×390, plus an offline reload of the hub and representative games.
