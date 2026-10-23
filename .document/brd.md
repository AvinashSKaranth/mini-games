# BRD — Offline Mini-Games Collection (Web / GitHub Pages)

**Project:** `mini-games`
**Reference:** [Offline Games – No Wifi Games](https://play.google.com/store/apps/details?id=com.JindoBlu.OfflineGames&hl=en_IN) + sibling JindoBlu titles ([2 Player games: the Challenge](https://play.google.com/store/apps/details?id=com.JindoBlu.TwoPlayerGamesChallenge), [1 2 3 4 Player Games](https://play.google.com/store/apps/details?id=com.JindoBlu.FourPlayers))
**Platform:** Mobile-first static website, hosted on GitHub Pages, free to play, no login, no backend
**Status:** 24-game slice shipped (P1 waves 1–3)
**Date:** 23 Oct 2026

---

## 1. Executive summary

Build a browser-based collection of short, replayable mini-games in the same spirit as JindoBlu's offline collections: instant play, one-thumb or shared-device controls, runs in under 2 minutes, no install, no account.

The collection is organized around **player count**, because that is the reference app's core differentiator:

| Bucket | Purpose | Target count |
|---|---|---|
| **1 Player** | Solo puzzle / arcade / brain runs, with local best scores | 24 games |
| **2 Player** | Same-device duels, split-screen or turn-based, optional AI opponent | 18 games |
| **4 Player** | Party games for 2–4 people on one phone/tablet, plus 2v2 | 14 games |

**MVP target:** 12 games (shipped), now extended to a 24-game P1 wave. Current shipped slice: 1P 6, 2P 12, 4P 6.
**Full target:** 56 games. Every game must be playable with touch only, portrait-first, and load in under 1 second after first visit.

**Non-goals for v1:** online multiplayer, accounts, leaderboards across devices, 3D, ads, in-app purchases, level editors.

---

## 2. What the reference actually is

- **Offline Games – No Wifi Games** is a single-player-leaning collection of 20–30+ classics and casual puzzles: 2048/2248, Word Guess, Word Finder, Minesweeper, Hangman, Simon-style sound memory, Snake, Chess + Chess Puzzles, Sudoku, Solitaire, Wood Blocks, Water/Color Sort, Sliding Puzzle, Mancala, Tic Tac Toe, Checkers, Pool, Mini Golf, Petdoku, and more.
- **2 Player games: the Challenge** is the duel collection: Ping Pong, Air Hockey, Snakes, Pool, Tic Tac Toe, Spinner War, Penalty Kicks, Sumo, Mini Golf, Racing Cars, Sword Duels, Chess, plus AI fallback for solo play.
- **1 2 3 4 Player Games** adds party formats: Paint Fight, 4-way Snakes, Archery, Tug of War, Whack-a-Mole, Memory, Math races, Racing Cars, Sword Duels, plus puzzle titles.
- The commercial apps rely on **short sessions, minimal art, and one-device multiplayer**. Their weakness (ads, progression resets, occasional jank) is our opportunity: clean, fast, ad-free, installable web versions.

**Scope note:** JindoBlu adds/removes titles with each release, so this document defines a *buildable catalog inspired by the reference*, not a byte-for-byte clone. Exact game rules are re-implemented with original code and original SVG art.

---

## 3. Game catalog

Legend:
`1P` solo · `2P` two players on one device · `4P` two to four players · `AI` computer opponent · `P0` MVP · `P1` phase 2 · `P2` later

### 3.1 Single player (24)

Each line names the game, its mode tags/priority, and a one-sentence description.

- **S01 · 2048** `1P` `P0` — Slide numbered tiles on a 4×4 grid; equal tiles merge and double, and the run ends when the board fills without a legal move.
- **S02 · 2248** `1P` `P1` — Merge number tiles along connected paths on a hex-style board, chaining combos to reach 2248 and beyond.
- **S03 · Sudoku** `1P` `P0` — Fill a 9×9 grid so every row, column, and 3×3 box contains 1–9 exactly once, with notes, hints, and three difficulties.
- **S04 · Minesweeper** `1P` `P0` — Reveal safe cells on a minefield using neighbour counts, with flagging, first-click safety, and beginner/expert boards.
- **S05 · Solitaire (Klondike)** `1P` `P1` — Classic draw-one/draw-three patience: build four suits up from Ace while alternating colours down the tableau.
- **S06 · FreeCell** `1P` `P2` — Open-information card solitaire where four free cells and careful sequencing solve nearly every dealt hand.
- **S07 · Word Guess** `1P` `P0` — Six attempts to guess a hidden five-letter word, with colour feedback for correct letters and positions.
- **S08 · Word Finder** `1P` `P1` — Swipe connected letters on a grid to form words, clearing them and refilling the board for combo scores.
- **S09 · Hangman** `1P` `P1` — Guess a hidden word letter by letter before the stick figure is completed, with category hints.
- **S10 · Mini Crossword** `1P` `P2` — Small daily-style crossword with tap-to-clue navigation and an on-screen keyboard.
- **S11 · Wood Blocks** `1P` `P1` — Place irregular wooden pieces on a 9×9 board; complete rows, columns, or squares to clear space.
- **S12 · Block Puzzle** `1P` `P2` — Drag triomino/tetromino shapes onto a grid and clear full lines before the board jams.
- **S13 · Water Sort** `1P` `P1` — Pour coloured liquid between tubes until every tube holds a single colour, respecting stack order and free space.
- **S14 · Color Sort / Ball Sort** `1P` `P2` — Variant of tube sorting with ball stacks and stricter move limits; good content-pack candidate.
- **S15 · Ball Run** `1P` `P1` — Guide a rolling ball down an endless three-lane track, dodging gaps and collecting gems at speed.
- **S16 · Flappy Jump** `1P` `P1` — One-tap vertical flight through moving gaps; distance is the score and one collision ends the run.
- **S17 · Stack** `1P` `P1` — Time a moving block to land on the tower below; perfect overlaps build combos and height.
- **S18 · Knife Hit** `1P` `P2` — Throw knives into a rotating target without hitting an earlier knife, with boss stages and breakable fruit.
- **S19 · Darts (solo)** `1P` `P1` — Aim and flick darts at a classic board, scoring 501 downward with doubles-out rules.
- **S20 · Mini Golf (solo)** `1P` `P1` — Drag to set power and angle, sink the ball in as few strokes as possible across themed holes.
- **S21 · Chess vs AI** `1P` `AI` `P1` — Full legal-move chess against a tunable engine with undo, hints, and three strength levels.
- **S22 · Chess Puzzles** `1P` `P2` — Solve mate-in-one/two positions against the clock, with progressive difficulty and star ratings.
- **S23 · Sliding Puzzle** `1P` `P1` — Slide numbered or picture tiles into order on a 3×3 to 5×5 board, tracking moves and time.
- **S24 · Jigsaw Puzzle** `1P` `P2` — Drag SVG-rendered pieces into place with snap-to-slot, rotation toggle, and multiple piece counts.

*Also viable as single-player content packs later:* Memory Match (solo timer), Simon/Sound Memory, Tap Match, Circle Pong, Sticky Tongue, Fruit Merge, Bubble Shooter, Petdoku (jigsaw Sudoku), Brick Breaker.

### 3.2 Two player (18)

- **D01 · Tic Tac Toe** `2P` `AI` `P0` — Place X and O on a 3×3 grid; three in a row wins, with an unbeatable-or-easy AI switch.
- **D02 · Pool** `2P` `AI` `P0` — Flick the cue ball to pot your colour group and the eight-ball first, with fouls and ball-in-hand.
- **D03 · Ping Pong** `2P` `AI` `P0` — Move your paddle with a thumb and rally a ball across a centre net; first to 7 or 11 points wins.
- **D04 · Air Hockey** `2P` `AI` `P1` — Drag your mallet freely in your half and deflect the puck into the opponent's goal.
- **D05 · Snakes** `2P` `AI` `P1` — Steer a growing trail around the arena; touching a wall, yourself, or the rival's body eliminates you.
- **D06 · Spinner War** `2P` `AI` `P1` — Control a spinning top and ram the opponent off a shrinking circular stage; last top standing wins.
- **D07 · Sumo** `2P` `AI` `P1` — Two wrestlers push and dash inside a ring; force the opponent out or off balance to take the bout.
- **D08 · Sword Duel** `2P` `AI` `P1` — Side-on duel of timed parries and lunges; read the opponent's tell and land three clean hits.
- **D09 · Paint Fight** `2P` `P1` — Race to cover more of a shared canvas with your colour, stealing territory with every stroke.
- **D10 · Archery** `2P` `AI` `P1` — Alternate shots at a wind-affected target; closest arrow to the bullseye scores the round.
- **D11 · Tug of War** `2P` `P1` — Mash or rhythm-tap to pull the rope marker past your side before the opponent does.
- **D12 · Penalty Kicks** `2P` `AI` `P1` — Striker picks a corner and power, keeper dives; five rounds decide the shootout.
- **D13 · Finger Soccer** `2P` `AI` `P2` — Flick players' discs around a small pitch to strike the ball into the opposing net.
- **D14 · Carrom** `2P` `AI` `P2` — Flick the striker to pocket carrom men and the queen, with fouls for sinking the striker.
- **D15 · Checkers** `2P` `AI` `P1` — Diagonal moves and forced captures toward kinghood on an 8×8 board, with three AI levels.
- **D16 · Chess (local)** `2P` `P2` — Pass-and-play chess on one device with legal-move highlighting, clocks, and draw offers.
- **D17 · Four in a Row** `2P` `AI` `P0` — Drop discs into a 7×6 grid; first to connect four horizontally, vertically, or diagonally wins.
- **D18 · Dots and Boxes** `2P` `AI` `P2` — Draw edges between dots, claim boxes by closing them, and chain extra turns for the highest box count.
- **D19 · Mancala** `2P` `AI` `P1` — Sow stones around two rows of pits and capture by landing in an empty pit opposite your opponent's stones.
- **D20 · Racing Cars (split)** `2P` `P1` — Top-down split-screen race on a fixed circuit; steering and drift physics decide the lap winner.

- **D21 · Mini Golf (2P)** `2P` `P1` — Alternating-stroke golf on shared holes, lowest total score wins.
- **D22 · Darts (2P)** `2P` `P1` — Turn-based 501 darts with checkout rules and per-player averages.
- **D23 · Basketball** `2P` `P2` — Flick-to-shoot hoops on a timed clock, with moving baskets and streak bonuses.
- **D24 · Frozen Beak** `2P` `P2` — Race penguins across ice to catch fish, using short dashes and slide momentum.

*(D19–D24 are extras beyond the listed 18; keep them as a phase-2 pool so the count can flex without redesigning the shell.)*

### 3.3 Four player / party (14)

- **P01 · Snakes 4P** `4P` `P0` — Four trails grow at once in a walled arena; last snake alive wins, with a compact 2×2 split or shared top-down view.
- **P02 · Paint Fight 4P** `4P` `P1` — Four colours race to cover a shared canvas; most territory at the buzzer wins.
- **P03 · Spinner War 4P** `4P` `P1` — Four tops battle on a shrinking stage until one remains.
- **P04 · Whack-a-Mole** `4P` `P1` — Moles pop from a shared board; each player owns a quadrant and taps their own targets for points.
- **P05 · Archery 4P** `4P` `P1` — Rotating shots at a shared target with wind; closest arrow each round scores.
- **P06 · Tug of War 2v2** `4P` `P1` — Two teams mash in alternating rhythm to drag the centre marker past their line.
- **P07 · Racing Cars 4P** `4P` `P2` — Four karts on one top-down circuit, with rubber-banding and a three-lap sprint.
- **P08 · Sword Duel 4P** `4P` `P2` — Free-for-all duel with i-frames and respawns; first to five hits or last standing.
- **P09 · Sumo 4P** `4P` `P2` — Four wrestlers in a shrinking ring, pushing and dashing until one remains.
- **P10 · Memory Match** `4P` `P1` — Take turns flipping pairs on a shared grid; a match scores and grants another turn.
- **P11 · Math Race** `4P` `P1` — Solve rapid arithmetic questions on your own quadrant; correct answers move your runner forward.
- **P12 · Reflex Race** `4P` `P2` — Wait for the signal, then tap fastest; false starts penalize, and the last player standing scores.
- **P13 · Tap Race** `4P` `P2` — Mash your button to fill a meter; first to the top wins, with a 10-second cap.
- **P14 · Ludo** `4P` `AI` `P2` — Roll, move four tokens around the board, capture rivals, and reach home first; the natural 4-player board game for this shell.

*Party pool for later:* Bomber Arena, Tank Arena, Penalty Shootout 4P, Mini Golf 4P, Darts 4P, Jigsaw Race, Don't Touch the Wire, Color Tile Race.

---

## 4. Feasibility and build tiers

| Tier | What it means | Examples | Effort per game |
|---|---|---|---|
| **A — Grid / turn logic** | Pure state machine, no physics; easiest to test and localize | 2048, Sudoku, Minesweeper, Tic Tac Toe, Four in a Row, Memory, Dots and Boxes, Sliding Puzzle, Word Guess | 1–3 dev-days |
| **B — Real-time canvas, simple physics** | Fixed-step loop, AABB/circle collisions, pointer input | Snakes, Ping Pong, Air Hockey, Spinner War, Sumo, Paint Fight, Tug of War, Whack-a-Mole, Stack, Flappy Jump | 3–6 dev-days |
| **C — Aim / flick / trajectory** | Vector math, ray or swept collisions, turn resolution | Pool, Mini Golf, Archery, Penalty Kicks, Darts, Carrom, Finger Soccer, Basketball, Knife Hit | 4–8 dev-days |
| **D — Deep rules engines** | Large rule sets, AI search, save/resume | Chess, Checkers, Solitaire, FreeCell, Ludo, Mancala | 5–12 dev-days |

**Recommended build order:** Tier A P0 titles → shell hardening → Tier B P0 titles → 4-player shared-arena framework → Tier C → Tier D.

**4-player input reality check:** four thumbs on one phone is cramped. Party games must use one of three layouts:
1. **Quadrant controls** (each player gets a corner) for tap/mash games.
2. **Shared arena + sequential turns** for aim games (archery, darts, golf).
3. **Hot-seat rounds** for board games (Ludo, Memory), with a clear "Player 3, your turn" handoff screen.

---

## 5. Product requirements

### 5.1 Functional

- Game hub with three tabs: **1 Player / 2 Player / 4 Player**, plus search and "recently played".
- Every game: pause, restart, back to hub, mute, and a rules sheet on first play.
- Local persistence: best score, stars, last settings, mute state (no accounts).
- Optional AI opponent for every 2-player title.
- Player setup: 2–4 names/colours, remembered locally.
- Round-based scoring for party mode: pick N mini-games, play a cup, show a podium.
- Installable PWA with offline cache after first load.
- Shareable result card (canvas → PNG) — optional, phase 2.

### 5.2 Non-functional

- 60 fps on a mid-range Android phone; graceful 30 fps fallback.
- Initial route interactive in < 2 s on 4G; per-game JS < 60 KB gzipped.
- Total first-load payload < 400 KB; SVG assets < 150 KB total.
- Portrait-first, playable in landscape for split-screen duels and racing.
- Works with touch, mouse, and keyboard (desktop bonus).
- No layout shift; no scroll-jacking during play; safe-area insets respected.
- Accessibility: colour-blind-safe palettes, reduced-motion setting, large tap targets, screen-reader labels on menus (games themselves are visual).

### 5.3 Mobile interaction rules

- Primary input is `pointerdown`/`pointermove`/`pointerup` on a single canvas; never rely on hover.
- Minimum hit area 44×44 CSS px; controls sit in the lower third for one-handed play.
- Prevent pull-to-refresh, double-tap zoom, text selection, and context menus inside the play surface.
- Pause automatically on `visibilitychange` and on lost pointer capture.
- Split-screen duels rotate the play field 180° for the top player, or mirror controls to opposite edges.
- Support `100dvh`, not `100vh`; test iPhone SE through iPad.

---

## 6. Technical architecture

```
/docs                      ← GitHub Pages root (static output)
  index.html               ← hub
  /games/<slug>/index.html ← one entry per game (deep-linkable)
  /assets/
    /svg/…                 ← shared + per-game original SVG art
    /js/…
    /css/…
  manifest.webmanifest
  sw.js
/src                       ← source (if a build step is used)
  /core                    ← shell, loop, input, audio, storage, players, scoring
  /games/<slug>            ← game module + rules + tests
  /ui                      ← hub, modals, settings, cup mode
  /art                     ← SVG sources + sprite build
```

**Stack:** vanilla TypeScript + Vite (or plain ES modules if we want zero build), Canvas 2D for real-time games, DOM/CSS for board and card games. No framework needed; a 3 KB reactive helper is enough. Vitest for rules unit tests, Playwright for mobile viewport smoke tests.

**Core module contract**

```ts
interface GameModule {
  id: string;
  title: string;
  players: 1 | 2 | 4;
  tags: string[];
  mount(root: HTMLElement, ctx: GameContext): void;
  unmount(): void;
}
```

`GameContext` provides: rAF loop with fixed timestep, resize/DPR handling, pointer normalization, player roster + colours, sound bus, save/scores, pause/resume, and a seeded RNG for reproducible tests.

**Why this shape:** each game is isolated, lazy-loaded, and independently testable; a broken title cannot take down the hub. GitHub Pages needs no server, so everything is static and client-side.

---

## 7. Art & SVG asset system

The reference uses flat, high-contrast, chunky shapes with soft shadows. We will produce **original SVG** in the same spirit — no copied icons or store art.

### 7.1 Visual language

- **Grid:** 24 px icon grid, 2 px optical stroke, rounded joins.
- **Palette:** warm off-white surface, ink navy outlines, one accent per player (coral, teal, amber, violet), plus semantic green/red for success/failure.
- **Depth:** single soft drop shadow + top-light gradient; no skeuomorphism, no photorealism.
- **Forms:** geometric primitives, 12–18% corner radii, slightly oversized heads/handles for small-screen readability.
- **Motion:** 120–200 ms ease-out for UI; squash-and-stretch only on impact frames.

### 7.2 Asset deliverables per game

1. `icon.svg` — 1:1 tile for the hub (must read at 48 px).
2. `thumb.svg` — 16:9 or 4:3 preview card.
3. Game pieces — board, tokens, paddles, balls, cards, etc., exported as SVG symbols.
4. `bg.svg` — optional arena background, low contrast so pieces stay legible.
5. UI glyphs — pause, restart, sound, back, trophy, lock.

**Rules:** all art on a single `<symbol>` sprite per bundle; `currentColor` for player tinting; no raster images except the optional share card; every asset must survive a 320 px-wide viewport.

### 7.3 Asset production order

1. Design tokens + icon grid + 12 hub category icons.
2. Shared game kit: ball, paddle, token, dice, card back, tile, arrow, trophy.
3. Per-game icons for the 12 MVP titles.
4. Remaining icons in batches of eight, reviewed on a real phone.

> **Open item:** the brief mentions "like the sample provided", but no sample file is present in the repository or the conversation. Before asset production, add the reference image to `.document/` (e.g. `.document/art-reference.png`) so the line weight, palette, and shading can be matched precisely.

---

## 8. Delivery plan

| Phase | Scope | Exit criteria |
|---|---|---|
| **0. Foundation** (week 1) | Repo setup, `/docs` shell, design tokens, hub, routing, PWA manifest, CI deploy to Pages | Hub loads on phone, installable, Lighthouse PWA pass |
| **1. MVP** (weeks 2–4) | 2048, Sudoku, Minesweeper, Word Guess, Tic Tac Toe, Four in a Row, Ping Pong, Pool, Snakes 2P, Paint Fight, Whack-a-Mole, Memory | 12 games playable end-to-end with scores and pause |
| **2. Duels** (weeks 5–7) | Air Hockey, Spinner War, Sumo, Sword Duel, Archery, Tug of War, Penalty Kicks, Checkers, Mancala, Mini Golf, Darts | AI + local 2P for all; cup mode |
| **3. Party** (weeks 8–9) | Snakes 4P, Spinner War 4P, Math Race, Reflex Race, Tap Race, Ludo | 4-player setup, handoff screens, podium |
| **4. Depth** (weeks 10–12) | Solitaire, FreeCell, Chess, Chess Puzzles, Water Sort, Wood Blocks, Jigsaw, Carrom, Finger Soccer | Save/resume, difficulty tuning, performance pass |
| **5. Polish** | Asset pass, sound, reduced motion, a11y, share cards, SEO | 60 fps mid-range Android, < 400 KB first load |

Ship after every phase; GitHub Pages deploys from `/docs` on `main`.

---

## 9. Success metrics

- **Playability:** 90% of first-time mobile visitors start a game within 15 seconds.
- **Performance:** p75 interaction < 200 ms; p75 FPS ≥ 55 on a 2021 mid-range Android.
- **Retention proxy:** 25% of visitors play a second game in the same session.
- **Quality:** zero blocking bugs on iOS Safari 16+ and Chrome Android; all P0 games pass rules unit tests.
- **Footprint:** first load < 400 KB; each additional game < 60 KB gzipped.

---

## 10. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Four-thumb ergonomics on a phone | Party games unplayable | Quadrant layout, turn-based fallbacks, test on 5.5" screens early |
| Physics drift across refresh rates | Unfair duels | Fixed 60 Hz timestep + interpolation; seeded RNG |
| iOS Safari audio/pointer quirks | Silent game, stuck drags | Unlock audio on first gesture; pointer capture + cancel handling |
| Scope explosion (56 games) | Nothing ships | Strict P0 list, one shared shell, asset batching |
| Art inconsistency | Looks amateur | Tokens + 24 px grid + review gate per batch |
| GitHub Pages caching | Users see stale builds | Hashed asset names + service-worker versioning |

---

## 11. Decisions needed

1. **Art sample** — please add the referenced image; it defines the visual direction.
2. **Build step** — Vite/TypeScript (better DX, needs Actions) vs zero-build ES modules (simplest Pages deploy). Recommendation: Vite with output committed to `/docs`.
3. **MVP cut** — confirm the 12-game MVP or swap titles.
4. **Orientation policy** — allow landscape everywhere, or only for split-screen duels/racing?
5. **Sound** — generated WebAudio SFX (zero assets) vs recorded SFX. Recommendation: synthesized first.

---

## 12. Appendix — source notes

- Google Play listing, *Offline Games – No Wifi Games* (JindoBlu): 20+ minigames, categories for numbers, words, memory, strategy, two-player, and exotic games; lists 2048, 2248, Word Guess, Word Finder, Minesweeper, Hangman, Simon-style sound memory, Snake, Chess, Chess Puzzles, Checkers, Pool, Tic Tac Toe, Tap Match, Solitaire, Sudoku, Wood Blocks, Four in a Row, Sliding Puzzle, Mancala, Petdoku.
- Google Play listing, *2 Player games: the Challenge*: Ping Pong, Spinner War, Air Hockey, Snakes, Pool, Tic Tac Toe, Penalty Kicks, Sumo, Mini Golf, Racing Cars, Sword Duels, Chess; AI fallback.
- Google Play listing, *1 2 3 4 Player Games*: 1/2/3/4-player and 2v2 modes; Snakes, Tic Tac Toe, Pool, Paint Fight, Spinner War, Archery, Tug of War, Whack-a-Mole, Memory, Math, Solitaire, Jigsaw, Racing Cars, Sword Duels, plus recent additions Oops, Crash It, Slot Cars, Triple, Golf, Matching Numbers.
- Store copy is marketing material and the roster changes between versions; game rules above are described independently for original implementation.

---

## 13. Implementation status

### Shipped slice

| Game | Players | Path | Notes |
|---|---|---|---|
| 2048 | 1 | `docs/1player/2048/` | Swipe + arrow keys, undo, best score, win/continue and game-over overlays |
| Sudoku | 1 | `docs/1player/sudoku/` | Three difficulties, notes, hints, mistakes, timer, best time |
| Minesweeper | 1 | `docs/1player/minesweeper/` | Safe first tap, flood reveal, flag mode, long-press, chord, timer, best time |
| Word Guess | 1 | `docs/1player/word-guess/` | Six guesses, duplicate-aware scoring, on-screen QWERTY, stats, replay |
| Solitaire | 1 | `docs/1player/solitaire/` | Klondike draw-one, stock recycle, tableau/foundation moves, timer, win flow |
| Darts | 1 | `docs/2player/darts/` | Solo 501 or local 2P, three-dart visits, double-out checkout, bust handling |
| Tic Tac Toe | 2 | `docs/2player/tic-tac-toe/` | Local 2P or AI, first to 5 round wins, winning line, draws |
| Four in a Row | 2 | `docs/2player/four-in-a-row/` | Local 2P or AI, column preview, drop animation, first to 3 rounds |
| Ping Pong | 2 | `docs/2player/ping-pong/` | Local 2P or AI, split-court drag, W/S + arrows, first to 7 |
| Snakes | 2 | `docs/2player/snakes/` | Local 2P or AI, 19x19 arena, food/growth, collisions, best-of-three |
| Pool | 2 | `docs/2player/pool/` | Local 2P or AI, simplified 8-ball, drag-back aiming, pockets, ball-in-hand |
| Air Hockey | 2 | `docs/2player/air-hockey/` | Local 2P, drag mallets, fixed-step puck physics, first to 7 |
| Chess | 2 | `docs/2player/chess/` | Local 2P or AI, legal moves, castling, en passant, promotion, check/mate/stalemate, undo |
| Mancala | 2 | `docs/2player/mancala/` | Local 2P, sowing, stores, extra turns, opposite-pit captures, end-game sweep |
| Mini Golf | 2 | `docs/2player/mini-golf/` | Solo or local 2P, three holes, drag-to-putt power, walls, stroke totals |
| Checkers | 2 | `docs/2player/checkers/` | Local 2P or AI, forced captures, multi-jumps, king promotion, undo-free rematch |
| Paint Fight | 2 | `docs/2player/paint-fight/` | 45-second grid paint duel, two control pads, live coverage meters |
| Memory Match | 2 | `docs/2player/memory-match/` | 4x4 pairs, turn handoff, match overlay, eight original face icons |
| Whack-a-Mole | 4 | `docs/4player/whack-a-mole/` | Four quadrants, simultaneous moles, 40-second round, podium and rematch |
| Snakes 4P | 4 | `docs/4player/snakes/` | Four corner snakes, four colours, 2x2 touch pads, last-alive rounds, first to 2 |
| Paint Fight 4P | 4 | `docs/4player/paint-fight/` | 45-second grid paint, four corner pads, live coverage meters, tile-stealing conflict |
| Spinner War 4P | 4 | `docs/4player/spinner-war/` | Four spinning tops, shrinking stage, bump-off elimination, last top wins |
| Tug of War | 4 | `docs/4player/tug-of-war/` | 2v2 rhythm tapping, combo pull multiplier, 30-second clock, instant win at the line |
| Archery | 4 | `docs/4player/archery/` | Five hot-seat rounds, drag-to-aim target, wind drift, sweeping power meter, ring scoring |

Landing page is `docs/index.html`, with player-count filters for All 24, 1P 6, 2P 12, and 4P 6. Darts is classified as the sixth 1P card because solo 501 is its primary mode; the build also supports local 2P.

### Decisions taken

- **Art sample:** none was provided, so all game and hub SVG art is original in the warm cream/ink palette defined in section 7.
- **Build step:** zero-build vanilla HTML/CSS/ES modules, no framework and no compile step. This keeps the Pages deploy to a static `/docs` folder.
- **MVP cut:** the original 12-game slice shipped first. The current P1 wave adds eight titles: Solitaire, Air Hockey, Chess, Mancala, Mini Golf, Checkers, Darts, and Snakes 4P. A second P1 wave adds Paint Fight 4P, Spinner War 4P, and Tug of War 2v2.
- **Player buckets:** Whack-a-Mole moved from `docs/3player/` to `docs/4player/` and was rebuilt for four players. The old `3player` bucket is gone.
- **AI coverage:** AI modes were added to the five existing AI-tagged duels: Tic Tac Toe, Four in a Row, Ping Pong, Snakes, and Pool. Chess and Checkers also include AI. Local 2P remains the default wherever both exist.
- **Reset polish:** new games use the shared fade-out/rebuild/fade-in helper for New game, reset, next round, and rematch actions. Reduced-motion users get an instant rebuild.
- **Orientation:** portrait and landscape are both supported. Landscape uses a board-plus-side-panel grid for board games, a four-column layout for Whack-a-Mole, and a canvas-plus-controls layout for Snakes 4P.
- **Sound:** no audio in this slice; synthesized SFX remain a later polish item.

### Offline and performance

- `docs/sw.js` pre-caches the hub, shared shell, and all twenty-four games. `CACHE` is now `mini-games-v8`.
- Install fetches each core asset with `cache: 'reload'` so a new service-worker version cannot re-cache stale files from an older worker.
- All assets are local SVGs; no external fonts, scripts, or network calls are required after first load.
- Static checks cover every game link and asset, and browser smoke tests cover 320x568, 390x844, 568x320, and 844x390 plus an offline reload.

### Deployment

Set GitHub Pages to deploy from the `master` branch, `/docs` folder (this repo currently uses `master`; use `main` instead if the branch is renamed). The hub, service worker, and manifest all use relative paths, so the site works at either a user root or a repository subpath.

### Still open

- Reference art sample for a closer style match.
- Sound effects and haptics.
- The remaining catalog: four-player party titles (Math Race, Reflex Race, Ludo), more duels, and depth titles from section 3.
