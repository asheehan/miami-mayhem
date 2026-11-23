# Postcard Puzzles — Design

A game in Riley's Miami Mayhem: jigsaw puzzles that turn into scenic postcards of Miami. Calm: no timer, no fail, no locks. Portrait, touch only, almost no reading.

## Rules

- **Album:** the first screen is a postcard album of 12 pictures, all open from the start. Every postcard shows in full colour so none looks locked. Under each card, three small badges (6, 12, 24) turn gold for each size finished.
- **Size chooser:** tapping a postcard shows it big with three picture buttons: a grid icon and the piece count, 2 × 3 = 6, 3 × 4 = 12, 4 × 6 = 24. The suggested size (6 until it is done, then the smallest not yet done) bobs gently. A gold tick marks sizes already finished.
- **Board:** the picture is a fixed 600 × 800 (3:4 portrait), scaled to fill the width under a slim top bar. It shows a white postcard frame, a sandy backing with the outline of every piece's home, and a faint ghost of the picture. The eye button toggles the ghost; it starts on for 6 and 12 pieces and off for 24.
- **Pieces:** real jigsaw shapes with interlocking tabs and blanks (bezier knobs, mirror-symmetric so both neighbours trace the same curve). Each picture at each size always gets the same cut (seeded by picture and size). Pieces are never rotated.
- **Tray:** pieces start dealt into a shuffled, slightly jittered grid in the tray below the board (beside it in landscape), drawn smaller there so all of them fit without hiding each other. The board shrinks a little (down to 72%) when that is what it takes for tray pieces to stay at least 54 px tall.
- **Dragging:** press a piece (the top-most under the finger, with 10 px of slack) and it lifts: full size × 1.1, a drop shadow, floating above the finger (a third of its height, 26–80 px) so the finger never hides it. It eases from where it was to the finger.
- **Snapping:** let go with the piece's centre within 0.4 × the cell's smaller side of its home and it clicks in: a pop, a yellow outline flash and a burst of sparkles. Placed pieces are locked. Let go anywhere else and it stays there, kept fully on screen, small again if dropped over the tray. Neighbouring pieces never join off the board; snapping is only to home.
- **Hint:** after 20 s without a placement, the top-most loose piece glows and pulses and its home outline on the board marches in yellow dashes.
- **Finish:** the picture flashes white and is shown whole with no seams, then turns into a postcard: a cream border, "Greetings from" in script and the place name in big sunset letters, a perforated MIAMI stamp and a postmark, tilted slightly. Confetti falls. After 1.8 s: Next (the next postcard, same size), Again and Album.
- **Saved:** finished sizes per postcard in `localStorage` under `postcard-puzzles-progress` as `{ done: { [id]: [6, 12, 24 subset] } }`. Puzzles in progress are not saved.

## Pictures

Each is a pure `draw(ctx, w, h)` in its own module under `scenes/`, drawn with paths and gradients in a flat, chunky, ink-outlined style using the launcher's sunset palette. Shared helpers (palms, clouds, sea, windows, neon text, fish) live in `scenes/kit.js`.

| # | Place | Scene |
|---|---|---|
| 1 | South Beach | rainbow lifeguard tower, umbrella, sandcastle, beach ball, sailboat |
| 2 | Ocean Drive | pastel Art Deco hotels at dusk, neon HOTEL / OCEAN / DECO, palms, classic car |
| 3 | Flamingo Lagoon | flamingos standing, feeding and flapping, reflections, lilies, reeds |
| 4 | Cape Florida | the lighthouse with its beams, keeper's cottage, pelican on a post |
| 5 | Biscayne Bay | underwater: manatee, turtle, ray, jellyfish, coral reef, fish |
| 6 | PortMiami | cruise ship with a waterslide, palm island, tugboat, dolphin, buoy |
| 7 | Downtown Miami | skyline at sunset with lit windows and coloured crowns, reflections |
| 8 | The Everglades | airboat with its caged fan, smiling gator, egret, heron, turtle on a log |
| 9 | Little Havana | tiled-roof shop fronts, cafe window, string lights, painted rooster, domino table |
| 10 | Wynwood Walls | a mural of a sunglasses sun, MIAMI bubble letters, flamingo, ladder, paint cans |
| 11 | Rickenbacker Causeway | fireworks over the humped bridge at night, city lights, lit sailboat |
| 12 | Homestead | fruit stand: awning, bananas, crates of mangoes, OPEN sign, watermelons, chicken |

## Code

Under `src/games/postcard-puzzles/`:

| File | Purpose |
|---|---|
| `puzzle.js` | Pure, seeded. All tuning constants (named and documented at the top), the cut and piece outlines, screen layout (board + tray), scatter, pick-up / drag / drop / snap, hints, completion, autosolve, relayout on resize, and saved progress (storage passed in). |
| `scenes/*.js` | The 12 pictures and `kit.js`; `scenes/index.js` lists them in album order. DOM-free. |
| `draw.js` | Drawing only. Pictures are rendered once per size into offscreen canvases; pieces are clipped once into per-piece canvases with a soft bevel; the board's static layer (frame, backing, ghost, home outlines, placed pieces) is cached and redrawn only when a piece lands or the ghost toggles. Also the postcard, album cards, buttons and the launcher tile (a piece flying out of a postcard and clicking back in). |
| `index.js` | Album, size chooser, play, finish screens, touch input, effects and saved progress. |

`?scene=N` opens postcard N's size chooser; add `&pieces=6|12|24` to start the puzzle. `?debug` exposes `window.__postcard` (`scenes()`, `state()`, `screen()`, `buttons()`, `progress()`, `layout()`, `open(i, n)`, `goto(screen, i)`, `piece(i)` for finger targets, `solveStep()`, `autosolve()`, `idle(seconds)`, `sceneImage(i, width)`).

`test/postcard-puzzles.test.js` covers the cut (piece counts, one tab and one matching blank per internal edge, flat borders, identical curves on both sides, determinism), scatter on 820 × 1180 and 390 × 844 (all on screen, none on its home), layout, snapping and locking, top-most pick-up, keeping drops on screen, hints, completion, progress round-trip and bad data, autosolve on every picture at every size on both screens, and every scene drawing plenty into a stub ctx with no DOM.

## Not built yet

Sound. Saving puzzles in progress. Tuning by feel on a real iPad (snap distance, lift, tray sizes, ghost strength: the constants at the top of `puzzle.js`).
