# Pixel Ants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An offline PWA puzzle game where ants carry a pixel picture away, colour by colour, as the player slots colour blocks.

**Architecture:** Pure game logic (`rules.js`, `game.js`) with no DOM, driven by a `tick(state, dt)` loop and tested with Vitest. A single Canvas 2D renderer and a pointer-event input layer sit on top. Everything is static files, precached by a service worker.

**Tech Stack:** Vite, plain JavaScript (ES modules), Canvas 2D, Vitest, vite-plugin-pwa, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-21-pixel-ants-design.md`

**Commits:** use the repo's configured git identity; no AI attribution lines.

---

## Shared conventions

- **Grid:** `grid[y][x]` is a colour char or `null` (open). `y = 0` is the top row. `W = 24`, `H = 32` come from the level, never hard-coded in logic.
- **Ground row:** the virtual row `y = H` is always open for every `x`. Ant paths start there.
- **Grid coordinates are the game's world space.** Slots live in the same space: slot `i` of `n` is centred at `x = (i + 0.5) * W / n - 0.5`, `y = H + SLOT_Y` (`SLOT_Y = 3.5`). The renderer maps grid coords to screen; logic never sees pixels.
- **Constants** (`src/constants.js`): `SPAWN_INTERVAL = 0.3` s, `ANT_SPEED = 12` cells/s, `SLOT_Y = 3.5`, `MAX_DEAL_TRIES = 50`, `JITTER = 1.5`.
- **RNG:** `mulberry32(seed)` returns a function giving floats in `[0, 1)`. Every random choice takes an `rng` argument.

## File map

| File | Responsibility |
|---|---|
| `src/constants.js` | Tunable numbers above. |
| `src/levels/{rocket,dino,reef,rainbow}.js`, `src/levels/index.js` | Level data `{ name, palette, rows, slots, pickerSize }`. |
| `src/rules.js` | `mulberry32`, `parseLevel`, `openDistances`, `reachableColours`, `findTarget`, `splitBlocks`, `buildQueue`. |
| `src/game.js` | `createGame`, `placeBlock`, `tick`, `isStuck`, `slotX`. |
| `src/deal.js` | `botMove`, `simulateDeal`, `dealLevel`. |
| `src/render.js` | `computeLayout`, `draw`. |
| `src/input.js` | `attachInput`. |
| `src/main.js` | Screens, loop, progress. |
| `test/*.test.js` | One test file per logic module plus `playthrough.test.js`. |

---

### Task 1: Scaffold

**Files:** Create `package.json`, `vite.config.js`, `index.html`, `src/main.js`, `src/constants.js`, `.gitignore`

- [ ] **Step 1:** `npm init -y`, then `npm i -D vite vitest vite-plugin-pwa`. Set `"type": "module"` and scripts `dev: vite`, `build: vite build`, `preview: vite preview`, `test: vitest run`.
- [ ] **Step 2:** `vite.config.js` with `base: '/pixel-ants/'` (PWA plugin is added in Task 11).
- [ ] **Step 3:** `index.html`: viewport meta `width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no`; `<canvas id="game">` filling the window; CSS `html,body{margin:0;height:100%;overflow:hidden;background:#17152a} canvas{display:block;width:100vw;height:100dvh;touch-action:none;user-select:none;-webkit-user-select:none}`.
- [ ] **Step 4:** `src/constants.js` with the constants above. `src/main.js` draws a filled rect to prove the canvas works.
- [ ] **Step 5:** `.gitignore`: `node_modules`, `dist`, `dev-dist`.
- [ ] **Step 6:** Run `npm run build`. Expected: build succeeds. Commit "Scaffold Vite project".

### Task 2: Levels

**Files:** Create `src/levels/*.js`, `test/levels.test.js`

- [ ] **Step 1: Failing test.** For every level in `levels`: `rows.length === 32`; every row has length 24; every char in rows has a `palette` entry matching `/^#[0-9a-f]{6}$/`; at least 10 distinct colours; `slots === 3`; `pickerSize === 9`. Also `levels.map(l => l.name)` equals `['Rocket', 'Dino', 'Reef', 'Rainbow']`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL (module missing).
- [ ] **Step 3:** Generate the level files from the approved sample pictures: run a one-off node script that requires the sample generator (`pictures.js`, the file that produced the approved gallery) and writes each picture as `export default { name, slots: 3, pickerSize: 9, palette: {...}, rows: [ '...24 chars...', ... ] }`. The baked rows are the source of truth afterwards; the generator is not part of the repo.
- [ ] **Step 4:** Run `npm test`. Expected: PASS. Commit "Add four levels".

### Task 3: rules — RNG, parsing, reachability

**Files:** Create `src/rules.js`, `test/rules.test.js`

Interfaces:

```js
export function mulberry32(seed)            // -> () => float in [0,1)
export function parseLevel(level)           // -> grid: (string|null)[][]
// BFS over open cells from the ground cell (startX, H). Returns { dist, parent, w, h }
// where dist/parent are Int32Array of size w*(h+1), index = y*w + x, -1 = not reached.
export function openDistances(grid, startX)
// Set of colour chars that have at least one pixel 4-adjacent to a reached open cell
// (the ground row counts), ignoring pixels whose index is in `reserved` (a Set, optional).
export function reachableColours(grid, reserved)
```

- [ ] **Step 1: Failing tests** using small hand-written grids (helper `g(['AB','CC'])` builds a grid; `.` means open):
  - `mulberry32(1)` gives the same first 3 numbers on two instances; all in `[0,1)`.
  - Full grid `['AB','CC']`: `reachableColours` is `{C}`.
  - `['AB','.C']`: reachable is `{A, C}` (A is above the open cell; B is not adjacent to it… B is adjacent only to A and C) — assert exactly `{A, C}`.
  - Pocket: `['A.B','CCC']` — the open cell in row 0 is not connected to the ground, so reachable is `{C}` only.
  - Around a corner: `['AB.','C..']` → `{A, B, C}`; `['A.B','CC.']` → `{B, C, A}` (A touches the connected open cell at (1,0)).
  - Reserved pixels are ignored: `['A','B']` with B's index reserved → `{}`.
  - `openDistances(g(['A.','..']), 0)`: dist at ground (0,2) is 0, at (0,1) is 1, at (1,0) is 3, at (0,0) is -1.
- [ ] **Step 2:** Run tests. Expected: FAIL.
- [ ] **Step 3:** Implement. BFS neighbours are 4-directional; a cell `(x,y)` is walkable if `y === h` (ground) or `0 <= y < h && grid[y][x] === null`; `x` always within `0..w-1`.
- [ ] **Step 4:** Run tests. Expected: PASS. Commit "Add reachability rules".

### Task 4: rules — blocks and queue

**Files:** Modify `src/rules.js`, `test/rules.test.js`

```js
export function splitBlocks(total, rng)   // -> number[] summing to total
export function buildQueue(grid, rng)     // -> [{ colour, count }] shallow first
```

- [ ] **Step 1: Failing tests.**
  - `splitBlocks(7)` → `[7]`; `splitBlocks(40)` → `[40]`.
  - For totals 41, 50, 99, 188 and seeds 1–50: sum equals total, every part is in 10–40.
  - `buildQueue` on the Dino level: per colour, counts sum to that colour's pixel count; total over all blocks is 768.
  - Order: on a 4-row grid `['AAAA','AAAA','BBBB','CCCC']` (too small to split), with jitter the queue's first block is `C` or `B` and `A` is never first across seeds 1–20. Use a taller synthetic grid (24×32, top half `A`, bottom half `B`) to assert the mean queue position of `B` blocks is lower than that of `A` blocks.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
  - `splitBlocks`: if `total <= 40` return `[total]`. Otherwise `rest = total`; while `rest > 40`: `size = 10 + floor(rng() * (min(40, rest - 10) - 10 + 1))`, push, subtract; finally push `rest`.
  - `buildQueue`: for each colour collect pixel depths (`h - 1 - y`), sort ascending; split with `splitBlocks`; walk the sorted depths giving each block the next `count` depths; key = mean of its share + `(rng() * 2 - 1) * JITTER`; sort all blocks by key ascending; return without the key.
- [ ] **Step 4:** Run. Expected: PASS. Commit "Add block splitting and picker queue".

### Task 5: rules — ant targeting

**Files:** Modify `src/rules.js`, `test/rules.test.js`

```js
// Nearest reachable, unreserved pixel of `colour` from ground cell (startX, H).
// Returns { target: {x, y}, path: [{x, y}, ...] } or null.
// path runs from (startX, H) to the open cell next to the target, inclusive.
export function findTarget(grid, reserved, colour, startX)
```

- [ ] **Step 1: Failing tests.**
  - Full grid `['AB','CC']`, colour `C`, startX 0 → target `(0,1)`, path `[(0,2)]`.
  - Same, colour `A` → `null`.
  - Tie-break: `['CC']`, startX 0 → `(0,0)` (distance 0 beats distance 1). `['C.C','...']` is not a tie; use `['.C.','C.C','...']`, colour `C`, startX 1: the candidates `(0,1)` and `(2,1)` tie on distance and row, so leftmost `(0,1)` wins; and `(1,0)` loses on distance.
  - Lower row wins a distance tie: construct `['.C','C.','..']`… verify by asserting the chosen target has the minimum distance and, among those, the largest `y`.
  - Reserved target is skipped: reserve the winner and expect the runner-up.
  - Path is contiguous: each step differs by exactly 1 in x or y, and every path cell is open or ground.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement with `openDistances(grid, startX)`: for every unreserved pixel of `colour`, take its reached open neighbour with the smallest `dist` (neighbour order: below, left, right, above); keep the best by `(dist asc, y desc, x asc)`; rebuild the path from `parent`.
- [ ] **Step 4:** Run. Expected: PASS. Commit "Add ant targeting".

### Task 6: game state and tick

**Files:** Create `src/game.js`, `test/game.test.js`

```js
export function slotX(state, i)                 // grid-space x of slot i (rounded column for pathing: Math.round)
// deal = { queue: [{colour,count}] }
export function createGame(level, deal)
// -> { level, w, h, grid, reserved:Set, remaining, slots:[null|{colour,count,out,cooldown}],
//      picker:[null|{colour,count}], queue, ants:[], status:'playing', time:0 }
export function placeBlock(state, pickerIndex, slotIndex)   // -> boolean
export function tick(state, dt)                 // advances ants, spawns, updates status
export function isStuck(state)
```

Ant: `{ slot, colour, target:{x,y}, path:[{x,y}], t, phase:'out'|'back', pos:{x,y} }`. The full walk is: slot position → `path[0]` (ground cell) → … → `path[last]`. `t` is distance walked along that polyline in cells; `pos` is interpolated for the renderer. On reaching the end in `out`: `grid[ty][tx] = null`, remove from `reserved`, `remaining--`, switch to `back` with `t = 0` over the reversed polyline. On reaching the end in `back`: `slot.count--`, `slot.out--`; if `count === 0` the slot becomes `null`; remove the ant.

`tick` order: (1) advance ants; (2) for each occupied slot: `cooldown -= dt`; if `cooldown <= 0` and `count - out > 0`, call `findTarget`; on success reserve, push ant, `out++`, `cooldown = SPAWN_INTERVAL`; (3) status: `won` if `remaining === 0 && ants.length === 0`; else `stuck` if `isStuck`. `tick` does nothing unless `status === 'playing'`. Callers pass `dt <= 0.05`; `main.js` clamps.

`isStuck`: every slot occupied, `ants.length === 0`, and no slot's colour is in `reachableColours(grid, reserved)`.

- [ ] **Step 1: Failing tests** with a tiny level (`rows: ['AB','CC']`, `slots: 2`, `pickerSize: 2`) and a hand-made deal `[{C,2},{A,1},{B,1}]`:
  - `createGame`: picker holds the first 2 queue blocks, queue has 1 left, `remaining === 4`.
  - `placeBlock(state, 0, 0)` → true; slot 0 has C×2; picker space 0 is refilled with B×1; placing into an occupied slot or from an empty picker space → false and state unchanged.
  - After enough ticks (loop `tick(state, 0.05)` up to 2000 times until slot 0 is null): both C pixels are open, `remaining === 2`.
  - Count only drops when an ant returns: immediately after the first ant spawns, `count === 2` and `out === 1`.
  - Never more ants out than count: on a level with 5 reachable C pixels and a C×2 block, max `out` observed over the run is 2 and exactly 2 pixels are taken.
  - Two ants never share a target (assert distinct targets among live ants each tick).
  - Win: play all blocks → `status === 'won'`, and status is not `won` on any tick where `ants.length > 0`.
  - Stuck: level `['AB','CC']`, slots 2, place A and B first → after a tick `status === 'stuck'`.
  - Not stuck while a slot is empty.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement as described.
- [ ] **Step 4:** Run. Expected: PASS. Commit "Add game state and tick".

### Task 7: deal check and playthrough

**Files:** Create `src/deal.js`, `test/deal.test.js`, `test/playthrough.test.js`

```js
// Returns { pickerIndex, slotIndex } or null (no empty slot or picker empty).
export function botMove(state)
// Fast simulation, no ants. Returns true if the bot clears the grid.
export function simulateDeal(level, queue)
// Tries seeds seed, seed+1, ... up to MAX_DEAL_TRIES; returns { queue, seed, passed }.
export function dealLevel(level, seed)
```

`botMove`: first empty slot; first picker block (lowest index) whose colour is in `reachableColours`; else first non-null picker block.

`simulateDeal`: own light state (grid copy, slots, picker, queue). Loop: repeat { for each slot, while `count > 0` and `findTarget(grid, emptySet, colour, 0)` finds a pixel: open it, `count--`; clear slots at 0 } until a full pass changes nothing; if grid empty → true; make a bot move; if no move possible → false. (For speed, replace `findTarget` with: compute the connected-open mask once per pass and take any adjacent pixel of the colour, recomputing after each removal batch.)

- [ ] **Step 1: Failing tests.**
  - `botMove` prefers a reachable colour; falls back to picker index 0; returns null with full slots.
  - `simulateDeal` true for the tiny level with deal `[C2, A1, B1]`; false for a deal on a 1-slot level that forces an unreachable block first (`rows ['A','B']`, `slots: 1`, `pickerSize: 1`, queue `[A1, B1]`).
  - `dealLevel(level, 1)` for each shipped level returns `passed === true`.
  - `playthrough.test.js`: for each shipped level and seeds 1–20: `dealLevel`, `createGame`, then loop { `botMove` + `placeBlock` whenever possible; `tick(state, 0.05)` } up to 200000 ticks; expect `status === 'won'`. Set the Vitest timeout for this file to 120 s.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. If the playthrough fails for a level, the fix belongs in `buildQueue` ordering (Task 4) or the level art, not in the test.
- [ ] **Step 4:** Run `npm test`. Expected: all PASS. Commit "Add deal check and playthrough test".

### Task 8: renderer

**Files:** Create `src/render.js`, `test/layout.test.js`

```js
// Pure. Chooses the picker column count from [3, 5, 9] that gives the largest cell size.
// Returns { cell, originX, originY, toScreen(gx, gy), slotRects:[{x,y,w,h}], pickerRects:[...],
//           homeBtn:{x,y,w,h}, blockSize }
export function computeLayout(width, height, level)
// view = { screen:'home'|'play', state, drag:{block, x, y}|null, overlay:null|'won'|'stuck', buttons:[], time, progress }
export function draw(ctx, layout, view)
```

Vertical stack in cell units: 1.5 margin, `H` picture, `SLOT_Y - 0.5` gap to slot centres, slots `blockSize = 4` cells, 1 gap, picker rows of `blockSize` with 0.5 gaps, 1.5 margin. Width needs `max(W + 2, cols * 4.5 + 1.5)` cells. `cell = min(width / needW, height / needH)`; centre horizontally.

- [ ] **Step 1: Failing tests** for `computeLayout` at 820×1180 (iPad portrait) and 390×844 (phone): everything lies inside the canvas; slot rect centres map to `toScreen(slotX, H + SLOT_Y)`; picker rects do not overlap; `blockSize * cell >= 44` px on iPad and `>= 40` on phone; `pickerRects.length === 9`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement `computeLayout`, then `draw`:
  - Background, a soft "ground" band under the picture.
  - Picture: one `fillRect` per non-null cell (overdraw by 0.5 px to hide seams). Open cells show a dark tunnel colour.
  - Slots: rounded outlines; occupied slots draw the block.
  - Block: rounded square in its colour, count centred in a bold font, text colour black or white by luminance, thin dark outline so pale colours show.
  - Picker blocks; the dragged block is skipped in place and drawn at the pointer, slightly larger.
  - Ants: body of three dark ellipses rotated to the direction of travel, legs wiggling with `time`; in `back` phase a small square of the pixel's colour on its back. Size about 0.9 cell.
  - Home button (top-left).
- [ ] **Step 4:** Run tests. Expected: PASS. Commit "Add renderer and layout".

### Task 9: input and play loop

**Files:** Create `src/input.js`; modify `src/main.js`

```js
// handlers: { onPickUp(pickerIndex) -> bool, onDrag(x, y), onDrop(x, y), onTap(x, y) }
export function attachInput(canvas, handlers)
```

- [ ] **Step 1:** `attachInput` uses `pointerdown/move/up/cancel` with `setPointerCapture`, converting to canvas CSS pixels. `main.js` decides what was hit using the current layout rects.
- [ ] **Step 2:** `main.js`: resize handling with `devicePixelRatio` (canvas backing size = CSS size × dpr, `ctx.setTransform(dpr,0,0,dpr,0,0)`); `requestAnimationFrame` loop calling `tick(state, min(dt, 0.05))` then `draw`; start directly in level 0 with `dealLevel(level, Date.now())`.
- [ ] **Step 3:** Drag: pointer down on a non-empty picker rect starts a drag; drop inside (or within half a block of) an empty slot calls `placeBlock`; otherwise the block snaps back.
- [ ] **Step 4:** Run `npm run dev`, open in a browser at iPad portrait size. Verify by playing: blocks drag, ants walk out and back, counts drop on return, slots free up, picker refills. Commit "Add input and play loop".

### Task 10: home, overlays, win celebration, progress

**Files:** Modify `src/main.js`, `src/render.js`

- [ ] **Step 1:** Home screen: title "Pixel Ants", the four pictures as large thumbnails (drawn from level data) with names; a tick on completed ones. Tap starts that level.
- [ ] **Step 2:** Progress: `localStorage['pixel-ants-progress']` = JSON array of completed level names; all reads and writes in try/catch.
- [ ] **Step 3:** Stuck overlay: dim the screen, "The ants are stuck!", a big "Try again" button → new `dealLevel` with a new seed.
- [ ] **Step 4:** Win overlay: "YOU WIN!" in very large letters (at least 15% of screen height, bouncing in), confetti squares in the picture's palette falling continuously, a line of ants marching in a loop around the text, the finished picture shown small. Buttons "Next picture" (hidden on the last level) and "Home". Mark the level complete.
- [ ] **Step 5:** Home button in play returns to home.
- [ ] **Step 6:** Verify in the browser: finish a level (temporarily raise `ANT_SPEED` and lower `SPAWN_INTERVAL` via a `?fast` query flag kept for testing), see the win screen, next picture, and stuck → try again. Commit "Add home screen, overlays and win celebration".

### Task 11: PWA and deploy

**Files:** Modify `vite.config.js`, `index.html`; create `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`, `.github/workflows/deploy.yml`

- [ ] **Step 1:** Icons: a one-off node script draws a pixel-art ant on a coloured background and writes the three PNGs (180, 192, 512).
- [ ] **Step 2:** `VitePWA({ registerType: 'autoUpdate', includeAssets: ['apple-touch-icon.png'], manifest: { name: 'Pixel Ants', short_name: 'Pixel Ants', display: 'fullscreen', orientation: 'portrait', background_color: '#17152a', theme_color: '#17152a', start_url: '.', scope: '.', icons: [192, 512] }, workbox: { globPatterns: ['**/*.{js,css,html,png,svg}'] } })`.
- [ ] **Step 3:** `index.html`: `<link rel="apple-touch-icon">`, `<meta name="apple-mobile-web-app-capable" content="yes">`, `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`, title.
- [ ] **Step 4:** `deploy.yml`: on push to `main`: checkout, setup-node 22, `npm ci`, `npm test`, `npm run build`, `actions/upload-pages-artifact` (`dist`), `actions/deploy-pages`. Permissions `pages: write`, `id-token: write`.
- [ ] **Step 5:** Run `npm run build && npm run preview`; in the browser confirm the service worker registers and the game reloads with the network offline. Commit "Add PWA support and Pages deploy".
- [ ] **Step 6 (needs the user's go-ahead):** create the GitHub repo, push, enable Pages with source "GitHub Actions".

### Task 12: Final verification

- [ ] `npm test` passes; `npm run build` succeeds.
- [ ] Play one level start to finish in the browser at 820×1180 and at 390×844.
- [ ] After deploy: install on the iPad, turn on airplane mode, launch from the home screen, play.
