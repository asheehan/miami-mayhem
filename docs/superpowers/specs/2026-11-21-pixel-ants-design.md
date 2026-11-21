# Pixel Ants — Design

A puzzle game for a 6-year-old, played offline on an iPad. Ants carry a pixel picture away one pixel at a time. The player chooses which colours the ants collect.

## Launcher

The app is "Riley's Miami Mayhem": a launcher with a Miami sunset backdrop and one tile per game. Pixel Ants is the first game; an odd number of games leaves a "More games soon!" tile. Tapping a tile opens the game; the house button on a game's own home screen returns to the launcher.

The shell (`src/main.js`) owns the canvas, animation loop and pointer input. Each game lives in `src/games/<id>/` and exports `{ id, title, drawTile, create(host) }`; `create` returns `{ resize, update, draw, onPickUp, onDrag, onDrop, onTap }` and `host.exit()` goes back to the launcher. Games are listed in `src/games/index.js`. The rest of this document describes Pixel Ants, whose files are under `src/games/pixel-ants/`.

## Goal and constraints

- Buildable in about 10 hours.
- Static PWA: no backend. Installs to the iPad home screen and plays fully offline.
- Touch-first, iPad portrait. The layout scales from the canvas size, so it must also be playable on a phone in portrait and with a mouse for development.

## Stack

- Vite + plain JavaScript (ES modules), one Canvas 2D element for the whole game.
- `vite-plugin-pwa` for manifest and service worker (precache everything).
- Vitest for unit tests of the rules.
- Deployed to GitHub Pages.

## Screens

1. **Home:** the pictures shown as level buttons, four per page, with arrow buttons and page dots to change page. Completed levels are marked (stored in `localStorage`).
2. **Play:** top to bottom: the picture, a row of slots, the picker. A home button in a corner.
3. **Win overlay:** shown when the picture is empty and the last ant is home. A big "YOU WIN!" filling most of the screen, with confetti in the picture's colours and the ants doing a lap. Buttons: next picture, home. On the last picture there is no "next picture" button.
4. **Stuck overlay:** "The ants are stuck!" with a "Try again" button that restarts the level.

## Difficulty

A settings screen, opened from a gear button on the home screen, offers **Easy** (the default) and **Hard**. The choice is saved in `localStorage`.

- **Easy:** the pictures as drawn, 24 x 32.
- **Hard:** the same pictures at double resolution, 48 x 64 (every pixel becomes a 2 x 2 square, so 3072 pixels). Blocks are 20-80 instead of 10-40, a slot sends an ant every 0.15 s, and ants walk twice as many cells per second, so a game is roughly twice as long. Slots, picker and picture are the same size on screen; ants are drawn 1.5 cells long.

Completed pictures are remembered separately for each difficulty. While a level is being dealt the screen shows "Waking up the ants…".

## Level data

A level is `{ name, palette: { char: hex }, rows: string[] }`. Every picture is 24 wide by 32 tall (768 pixels), every cell filled, 13–16 colours. Eight pictures ship, four to a home-screen page. Page 1: Rocket, Dino, Reef, Rainbow. Page 2 (harder): Pirate Ship, Digger, Castle, Robot. Level settings with defaults: `slots: 3`, `pickerSize: 9`.

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

All blocks go into one queue, shallow first. Sort key per block: list the colour's pixels sorted by depth (depth = rows above the bottom row, so the bottom row is 0); the colour's blocks take consecutive shares of that list in order (first block gets the shallowest `count` pixels, and so on); a block's key is the mean depth of its share plus uniform random jitter in [-1.5, 1.5]. Sort ascending.

The first `pickerSize` blocks fill the picker; when a block is dragged out, the next block from the queue takes its place in the same picker space. When the queue is empty, picker spaces stay empty.

### Deal check

Average depth is only a proxy for dig order, so a deal can be unwinnable. At level start the game generates a deal (block sizes + queue) and runs the **bot** on it in a headless run of the real game loop (same `tick`, same ant timing, fixed 0.05 s steps), making a bot move whenever a slot is free. An ant-free shortcut was tried and did not predict real games well enough. If the bot gets stuck, the game reseeds and deals again, up to 50 tries, and uses the last deal if none passes.

**Bot move:** if a slot is empty, place the first block in picker order whose colour has a reachable pixel; if there is none, place the first block in picker order.

### Slots

- The player drags a block from the picker to an empty slot. Dropping anywhere else returns it to the picker. A slotted block cannot be moved back.
- A slotted block sends one ant every 0.3 s while: it has unassigned count left, and a reachable, unreserved pixel of its colour exists.
- The ant targets a reachable, unreserved pixel of its colour: the lowest row first, then the column nearest its slot, left before right. So ants clear a layer side to side before digging deeper. (The earlier rule, nearest pixel by walking distance, is kept as the `nearest` mode behind the `?nearest` URL flag for comparison.) It reserves that pixel, walks from the slot up through open cells to a cell next to the pixel, picks it up (cell becomes open), and walks back to its slot. On arrival the block's shown count drops by one.
- A slot that finds nothing to take looks again after 0.1 s.
- Ants walk at 12 cells per second (a tunable constant) and pass through each other.
- A block never has more ants out than its remaining count.
- When a block's count reaches zero it disappears and the slot is free.

### Win and stuck

- **Win:** the grid is empty and no ant is out.
- **Stuck:** every slot is full, no ant is out, and no slotted colour has a reachable pixel. The game shows the stuck overlay. "Try again" restarts the level with a fresh shuffle of block sizes and queue.

Levels are not guaranteed solvable by every sequence of choices; the deal check means the simple bot's strategy wins on nearly every deal.

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
- A headless playthrough test: for each shipped level except Robot (deliberately very hard for the bot) and seeds 1–20, the deal check must find a passing deal within 50 tries, and the bot must then finish that deal in the real game loop (`tick` with ants). A failure is a queue or level-authoring bug.
- Manual check in a browser at iPad portrait size, and installed on the iPad offline.

## Out of scope

Sound, image import, a full solvability proof (the deal check only tests one simple strategy), scores or stars, landscape layout, undo.
