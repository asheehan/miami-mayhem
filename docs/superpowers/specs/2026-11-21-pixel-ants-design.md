# Pixel Ants — Design

A puzzle game for a 6-year-old, played offline on an iPad. Ants carry a pixel picture away one pixel at a time. The player chooses which colours the ants collect.

## Goal and constraints

- Buildable in about 10 hours.
- Static PWA: no backend. Installs to the iPad home screen and plays fully offline.
- Touch-first, iPad portrait. Must also work with a mouse for development.

## Stack

- Vite + plain JavaScript (ES modules), one Canvas 2D element for the whole game.
- `vite-plugin-pwa` for manifest and service worker (precache everything).
- Vitest for unit tests of the rules.
- Deployed to GitHub Pages.

## Screens

1. **Home:** the pictures shown as level buttons. Completed levels are marked (stored in `localStorage`).
2. **Play:** top to bottom: the picture, a row of slots, the picker. A home button in a corner.
3. **Win overlay:** shown when the picture is empty. Buttons: next picture, home.
4. **Stuck overlay:** "The ants are stuck!" with a "Try again" button that restarts the level.

## Level data

A level is `{ name, palette: { char: hex }, rows: string[] }`. Every picture is 24 wide by 32 tall (768 pixels), every cell filled, 13–16 colours. Four pictures ship: Rocket, Dino, Reef, Rainbow. Level settings with defaults: `slots: 3`, `pickerSize: 9`.

## Rules

### Reachability

A cell is *open* if its pixel has been taken. The area below the bottom row is open. A pixel is **reachable** if it is 4-adjacent (up, down, left, right) to an open cell that connects through open cells to the area below the bottom row. At the start, exactly the bottom row is reachable.

A pixel is removed from the grid (its cell becomes open) the moment an ant picks it up, not when the ant gets home.

### Blocks

A block is `{ colour, count }`. At level start each colour's pixel total is split into blocks:

- total ≤ 40: one block of that total (so small colours get blocks below 10).
- otherwise: blocks of 10–40, random sizes, summing exactly to the total.

So the block counts of a colour always add up to exactly its pixel count.

### Picker queue

All blocks go into one queue. Order: each block gets a sort key of the *depth* of its colour (average row of that colour's pixels, bottom = shallow; for a colour's k-th block, shifted deeper so its blocks are spread out) plus random jitter. Shallow first. The first `pickerSize` blocks fill the picker; when a block is dragged out, the next block from the queue takes its place. When the queue is empty, picker spaces stay empty.

### Slots

- The player drags a block from the picker to an empty slot. Dropping anywhere else returns it to the picker. A slotted block cannot be moved back.
- A slotted block sends one ant every 0.3 s while: it has unassigned count left, and a reachable, unreserved pixel of its colour exists.
- The ant reserves its target pixel, walks from the slot up through open cells (shortest path, BFS) to a cell next to the pixel, picks it up (cell becomes open), and walks back to its slot. On arrival the block's shown count drops by one.
- A block never has more ants out than its remaining count.
- When a block's count reaches zero it disappears and the slot is free.

### Win and stuck

- **Win:** the grid is empty.
- **Stuck:** every slot is full, no ant is out, and no slotted colour has a reachable pixel. The game shows the stuck overlay. "Try again" restarts the level with a fresh shuffle of block sizes and queue.

Levels are not guaranteed solvable by every sequence of choices; the bottom-up queue order makes sensible play succeed.

## Code layout

| File | Purpose |
|---|---|
| `src/levels/*.js` | Pictures as data. `src/levels/index.js` exports the list. |
| `src/rules.js` | Pure functions: `reachable(grid)`, `splitBlocks(counts, rng)`, `buildQueue(level, rng)`, `isStuck(state)`, `findPath(grid, from, to)`. No DOM. Unit tested. |
| `src/game.js` | Game state (grid, slots, picker, queue, ants) and `tick(state, dt)`, `placeBlock(state, pickerIndex, slotIndex)`. No DOM. Unit tested. |
| `src/render.js` | Draws state to the canvas: picture, slots, picker, ants, dragged block, overlays. Computes layout from canvas size. |
| `src/input.js` | Pointer events: drag from picker to slot, button taps. Uses layout from `render.js` for hit testing. |
| `src/main.js` | Screen switching, animation loop, saved progress. |

Randomness comes from a seeded RNG passed in, so tests are deterministic.

## Testing

- Unit tests for `rules.js` and `game.js`: reachability (including pockets only reachable around a corner), block sums, queue order, ant reservation, count decrement, win, stuck detection.
- A headless playthrough test: a simple bot that always places a block whose colour is reachable must finish each shipped level.
- Manual check in a browser at iPad portrait size, and installed on the iPad offline.

## Out of scope

Sound, image import, a solvability checker, scores or stars, landscape layout, undo.
