# CLAUDE.md — Mini Games design & implementation guide

This file is the working brief for anyone (human or AI) changing this repository. Read it before adding a game, changing the shell, or touching the service worker.

## 1. Product shape

- **12 → 23 game collection** of short, pass-and-play browser games.
- **Player-count buckets:** `1player`, `2player`, `4player`. There is no `3player` bucket anymore.
- **No accounts, ads, analytics, backend, build step, or external runtime calls.**
- Everything is static files under `docs/`, deployed by GitHub Pages from `master` `/docs`.
- Live site: <https://avinashskaranth.github.io/mini-games/>.
- Sessions should feel complete in 30 seconds to 10 minutes.
- Portrait-first, but landscape must be deliberate, not merely unbroken.

## 2. Stack and hard constraints

- Vanilla HTML, CSS, ES modules.
- Zero dependencies and zero build step. Do not add a bundler, framework, CDN font, remote image, or package manager.
- Relative paths only. The site must work at a user root **and** at `/<repo>/`.
- Every page must load and play offline after one online visit.
- No `fetch()` of remote data from a game.
- Use `localStorage` only for small local preferences/best scores. Namespace keys with `mini-games:`.
- Do not modify `.document/brd.md` history; update the implementation status instead.

## 3. Folder contract

```text
docs/
  index.html                 landing page
  style.css                  landing styles
  app.js                     landing filters + service-worker registration
  manifest.webmanifest
  sw.js                      offline shell (bump CACHE when files change)
  shared/
    game.css                 shared shell, buttons, overlays, type, reduced motion
    refresh.js               softRefresh() fade-out → update → fade-in helper
  1player/<game>/
    index.html
    style.css
    game.js
    assets/icon.svg
  2player/<game>/...
  4player/<game>/...
```

Every game folder is self-contained apart from `../../shared/`. A game must not import another game's JS or CSS.

Every game page includes:

```html
<link rel="icon" href="assets/icon.svg" type="image/svg+xml">
<link rel="manifest" href="../../manifest.webmanifest">
<link rel="stylesheet" href="../../shared/game.css">
<link rel="stylesheet" href="style.css">
<script type="module" src="game.js"></script>
<script>
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('../../sw.js').catch(() => {});
    });
  }
</script>
```

Use `../../index.html` for the back/all-games link.

## 4. Visual language

### Palette

Use the shared tokens first:

| Token | Value | Use |
|---|---|---|
| `--paper` | `#fff9f0` | page background / light surfaces |
| `--ink` | `#1e2433` | primary text, dark buttons |
| `--ink-soft` | `#5b6377` | secondary text |
| `--coral` | `#ff6b5a` | player 1 / danger |
| `--amber` | `#ffb703` | food, highlights, scores |
| `--teal` | `#21b6a8` | player 2 / success |
| `--violet` | `#7c5cff` | player 3 / focus |
| `--line` | `rgba(30,36,51,.14)` | borders |
| `--shadow` | `0 18px 40px -22px rgba(30,36,51,.55)` | cards |

Player 4 uses **ink blue `#3d6fb4`** with soft `#DCE8FA` and deep `#24518C`.

Backgrounds are warm cream with two soft radial washes (peach top-left, mint top-right). Do not use pure white pages, neon, dark full-page themes, or gradient text. Dark surfaces are reserved for playfields (Snakes, Ping Pong, Pool felt).

### Type

- `ui-rounded, "SF Pro Rounded", "Segoe UI", system-ui, sans-serif`.
- Headings: 800–900 weight, tight tracking (`-.02em` to `-.04em`).
- Body/hints: 0.72–0.9rem, `--ink-soft`.
- Numbers: `font-variant-numeric: tabular-nums`.
- Never load a webfont.

### Surfaces

- Cards: `#fffdf8`, 14–22px radius, 1px `--line`, inset white highlight, soft shadow.
- Dark playfields: deep teal/ink gradients, subtle grid/vignette, amber accents.
- Buttons: 46–48px min height on touch, 13–16px radius, `font: inherit`, strong weight.
- Focus rings: `3px solid rgba(124,92,255,.4)` with 2px offset; never remove focus outlines.
- Touch targets: at least 44×44px where practical; four-player controls may use 38–42px with generous gaps.

### Motion

- 120–260ms for UI transitions; 250–500ms for resets/reveals.
- Fades/scales should settle, not bounce indefinitely.
- Respect `prefers-reduced-motion: reduce`.
- Canvas effects (particles, trails) must be skippable when reduced motion is on.
- Do not animate layout properties in loops; animate transform/opacity.

## 5. SVG art rules

All art is original and local.

- One `<svg>` per asset, `viewBox` set, no external references, no embedded raster images.
- Use the palette above. Gradients, rounded caps, and 1.5–2.6px strokes match the house style.
- Icons are friendly and geometric, not emoji or copied mascots.
- Game icons: 64×64 or 112×112 viewBox, readable at 40px. Put them in `assets/icon.svg`.
- Extra pieces (X/O, trophies, cards, ball faces) go in the same `assets/` folder.
- Prefer inline SVG for controls and silhouettes; use `<img>` for standalone icons.
- Add `aria-hidden="true"` to decorative SVGs and `alt=""` to decorative images.
- Chess/checker pieces use a shared `<defs><symbol>` set in the page and `<use>`; they must remain original silhouettes, not Unicode glyphs.

## 6. Layout rules

### Portrait

- `.app` max-width 540–620px, centered, safe-area padding.
- Use `100dvh` (with `100vh` fallback), not a fixed pixel height.
- Keep the primary action above the fold on 320×568.
- Prefer full-width boards and compact score rows.
- Test at **320×568** and **390×844**.

### Landscape

- Use the extra width intentionally: board + side panel, or 4 columns for party games.
- Add a dedicated `@media (orientation: landscape) and (max-height: 620px)` block.
- Never let the page scroll horizontally.
- Test at **568×320** and **844×390**.

### Touch

- `touch-action: none` on draggable canvases; `manipulation` on tap targets.
- Disable text selection on game surfaces.
- Use `pointerdown`/`pointermove`/`pointerup` with `setPointerCapture` for drags.
- Support multi-touch where two players share a screen (`pointers` Map keyed by `pointerId`).
- Keyboard support is expected for desktop: WASD/arrows or number keys, with `preventDefault` only when handled.

## 7. Reset and refresh behavior

Use `softRefresh(target, update)` from `docs/shared/refresh.js` for:

- New game / new deal / new rack
- Reset / restart
- Next round / next hole
- Rematch / play again

Pattern:

```js
import { softRefresh } from '../../shared/refresh.js';

const requestNewGame = () => softRefresh(boardShell, () => {
  resetState();
  render();
  boardShell.focus?.({ preventScroll: true });
});
```

- Fade the **play surface**, not the document, unless the whole page is being reset.
- Rebuild state inside the update callback.
- Hide overlays inside the callback so they fade with the surface.
- Do not show a browser confirm/alert.
- Reduced motion skips the fade and updates immediately.
- The helper guards against double-clicks with `data-refreshing`.

Every reset path must be wired: top-bar reset, footer reset, overlay rematch/play-again, and next-round buttons.

## 8. Game-state rules

- State is plain objects/arrays in module scope. No classes required.
- Pure rule helpers (move generation, scoring, win checks) should be separate functions so they can be tested.
- Randomness is seeded only where a reproducible test is useful.
- Use a `token`/generation counter for countdowns and async AI timers; stale timers must not mutate a new round.
- Clear every `setTimeout`/`setInterval` and `requestAnimationFrame` on reset/visibility change.
- `document.hidden` pauses loops; resume with a fresh timestamp/accumulator.
- Never let an AI timer fire after the match ended or the human reset.
- Announce important state changes through an `aria-live="polite"` `.status` element.

## 9. AI opponents

Existing 2-player games with an `AI` catalog tag: **Tic Tac Toe, Pool, Ping Pong, Snakes, Four in a Row**.

Rules:

- AI is optional; keep the default local 2-player mode.
- Provide a visible `2P / AI` switch near the scoreboard or footer.
- AI never sees hidden information and never cheats.
- Turn-based AI uses a short delay (~300–600ms) so the human sees the move.
- One difficulty level is enough unless the catalog asks for more; Tic Tac Toe may expose Easy/Sharp.
- Guard with `aiThinking`/`aiTimer`; clear on reset and when switching modes.
- Disable the human controls during the AI's turn.
- Update player labels to `Computer` in AI mode.
- Cancel AI on match over, reset, visibility loss, and mode change.

## 10. Offline / PWA

- `docs/sw.js` is the only service worker.
- `CORE` must list every page, CSS, JS, and asset needed for the first offline load, including `./shared/*`.
- **Bump `CACHE`** (`mini-games-vN`) whenever any cached file changes.
- Install fetches with `{ cache: 'reload' }`; one missing file must not abort install.
- Navigation is network-first with cached fallback to the hub.
- Assets are cache-first with runtime fill.
- `manifest.webmanifest` describes the collection, uses relative `start_url`/`scope`, and local SVG icons.
- Test offline with DevTools or CDP network emulation for the landing page and at least two games.
- Never cache a request from another origin.

## 11. Performance

- Canvas: size the backing store to CSS pixels × DPR (cap at 2–3), then `ctx.setTransform(dpr, ...)`.
- Use a fixed timestep or clamped delta for physics; cap catch-up steps.
- Avoid creating gradients/fonts inside hot loops; cache where practical.
- Keep DOM nodes bounded; reuse cells/cards instead of rebuilding every frame.
- No per-frame `localStorage` writes.
- Load lazy images on the landing page except the first row.

## 12. Accessibility

- One `<h1>` per page.
- Buttons are `<button type="button">`, links are `<a href>`.
- Every icon-only button has an `aria-label`.
- Boards use `role="grid"`/`group` plus cell labels.
- Overlays use `role="dialog"`, `aria-modal="true"`, and a labelled heading; focus the primary action.
- `aria-live` status text for turns, scores, and results.
- Do not rely on color alone: pair coral/teal/amber/blue with labels, numbers, or shapes.
- Support keyboard for every turn-based game.

## 13. Adding a game

1. Pick the player bucket and create `docs/<bucket>/<slug>/`.
2. Copy the standard head/script tags and top bar.
3. Build the icon first (`assets/icon.svg`), then the shell, then logic.
4. Use `softRefresh` for every reset path.
5. Add portrait + landscape CSS and test 320/390/568/844 widths.
6. Add the page, CSS, JS, and all assets to `docs/sw.js`; bump `CACHE`.
7. Add the landing card with `data-players` and correct `1 player`/`2 players`/`4 players` copy.
8. Update `README.md` and `.document/brd.md` status.
9. Run:
   - `node --check` on every JS file
   - `node tests/engine-tests.mjs`
   - static link/asset check
   - browser smoke test at portrait and landscape
   - offline reload test
10. Commit and push to `master`; verify the GitHub Pages build.

## 14. Current catalog (after P1 wave 2)

**1 player (8):** 2048, Sudoku, Minesweeper, Word Guess, Hangman, Water Sort, Solitaire, Darts.

**2 player (12):** Tic Tac Toe, Four in a Row, Ping Pong, Snakes, Pool, Air Hockey, Chess, Mancala, Mini Golf, Checkers, Paint Fight, Memory Match.

**4 player (7):** Whack-a-Mole, Snakes 4P, Paint Fight 4P, Spinner War 4P, Tug of War 2v2, Archery, Math Race.

**AI modes:** Tic Tac Toe, Four in a Row, Ping Pong, Snakes, Pool, Chess, Checkers. Air Hockey and Mancala are local 2P only. Darts is counted as the sixth 1P card because solo 501 is its primary mode, while the same build supports local 2P.

**Still queued from P1:** the P1 solo/duel titles not in wave 1, plus Reflex Race and Ludo for the party bucket.

## 15. Definition of done

A game is done only when:

- It is playable start to finish with touch and keyboard/pointer where applicable.
- Every reset/rematch/next-round path uses the fade helper.
- It has original local SVG art, no external assets, and no console errors.
- It fits 320×568, 390×844, 568×320, and 844×390 without horizontal overflow.
- It works offline from a cold cache.
- Its service-worker entries are present and `CACHE` is bumped.
- Landing filters and counts are correct.
- README/BRD status and the catalog counts match reality.
- `node --check` and engine tests pass.
