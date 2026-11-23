# Later, Gator — Design

The fifth game in Riley's Miami Mayhem: a 3D lane-hopping game. A chunky little alligator hops across Miami, one square at a time, to get home to his swamp.

## Rules

- **The map** is a grid 9 squares wide. Row 0 is the start strip; the last row is the swamp. The camera sits above and behind him and follows smoothly. On a phone about 8 squares are in view across and the camera slides to show an edge as he nears it; on an iPad the whole width shows.
- **Hopping:** a tap hops forward; a swipe left, right or back hops that way (a forward swipe also hops forward). A touch that moves less than 24 px (or 5% of the short side) is a tap. A hop takes 0.16 s, with an arc, a squash and a tail wag. A hop asked for during a hop is buffered, one deep (the newest wins). He can't hop off the sides, behind the start, or into a palm tree or beach umbrella; a refused hop gives a little lean that way.
- **Lanes:**
  - **Road:** convertibles, ice cream trucks and scooters. Each lane has its own direction and speed (1.2 to 2.1 squares/s at level 1).
  - **Boardwalk:** skaters and rolling beach balls, smaller and slower (0.6 to 1.1 squares/s).
  - **Canal:** he swims. The current carries him sideways the whole time he's in the water (0.35 to 0.6 squares/s, shown by drifting foam). Drifting more than half a square past the outer columns costs a heart. Jet skis and speedboats (1.2 to 1.9 squares/s) hit like cars. Hopping out of the water snaps him to the nearest open square.
  - **Grass and sand:** safe strips. Palms (grass) and umbrellas (sand) block 1 to 3 squares, never two side by side, so a strip is never walled off and a gator climbing out of a canal always has an open square beside him.
- **Movers** go round a loop 15 squares long (3 hidden squares past each edge). Where each one is depends only on time, and there is always a gap: at least 3.4 squares between cars at level 1 (2.6 on boardwalks, 6 on canals), shrinking with the level.
- **Hearts:** three. A hit (or drifting off the map) plays a 0.9 s bonk and spin with dizzy stars, then puts him back on the furthest safe strip he has reached, blinking and untouchable for 1.5 s. With no hearts left it's "Oh no!" with **Try again** (same level, from the start) and **Menu**.
- **Difficulty:** every mover's speed is multiplied by 0.88 at level 1 rising to 1.38 at level 8, and gaps by 1.12 falling to 0.82 (the base figures in this list are before that). Past level 8 both keep creeping, to at most 1.4× faster again and a gap factor no lower than 0.55.
- **Levels** are generated from the level number, so they're the same every time. Level 1 has 18 lanes between the start and the swamp; level 8 has 30.8, speed +4% per level, capped). Hazard lanes come in groups of 1 to 3 (1 to 4 from level 4), canals at most 3, with a safe strip after each group. Level 1 opens with a single road.
- **Snacks:** a hot dog, an ice cream and a slice of pizza, one in each third of the level, on land squares he can reach. Each one eaten is a star.
- **The swamp:** landing in it wins. He belly-flops in with a big splash; after 1.7 s an overlay shows the stars, with **Next** and **Menu**.
- **Saved progress:** `later-gator-progress` in localStorage, `{ level, stars: { "<level>": best } }`. The menu's Play button plays the saved level. A Levels button opens a picker (12 tiles a page, with each level's best stars) where any level up to the saved one can be replayed.
- **HUD:** a home button, hearts, the three snacks (grey until eaten), a slim progress bar, and "Level N" on wide screens. "Tap to hop! / Swipe to turn" shows until the first hop.
- **Testing:** `?level=N` plays level N. `?debug` adds `window.__gator` with `run()`, `screen()`, `buttons()`, `progress()`, `hop(dir)`, `anchor()` (the gator's screen position) and `warp(row, col)`.

## Code

Under `src/games/later-gator/`:

| File | Purpose |
|---|---|
| `level.js` | Pure. Level generation, mover positions over time, hit tests, reachability and distance maps. |
| `sim.js` | Pure. A run: hops and the buffer, swimming and drift, hits, hearts and checkpoints, snacks, the win. |
| `view3d.js` | three.js scene and camera. Reads the run; no rules. Loaded only when a level starts. Lanes, movers, blockers and scenery are instanced meshes; nothing is allocated per frame. |
| `index.js` | Menu, HUD and overlays on the shared 2D canvas, touch input, saved progress, launcher tile. |

`level.js` and `sim.js` are unit tested in `test/later-gator.test.js`. The tests include a careful bot that plays each move forward on a copy of the run before taking it, and finishes levels 1 to 8 without being hit.

## Not built yet

Sound.
