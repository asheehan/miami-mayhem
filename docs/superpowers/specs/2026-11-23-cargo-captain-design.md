# Cargo Captain — Design

A maths game in Riley's Miami Mayhem where the maths is the mechanic: balancing. A cargo ship at PortMiami is a balance scale with a LEFT deck and a RIGHT deck. The player drags numbered crates from the dock onto either deck (and back off) until both sides weigh the same; then the ship levels, the green "=" lights, the horn toots and the ship sails off. Side-on, portrait, touch only, numerals, dots and signs only.

## Rules

- **Field:** a fixed 400 × 760 portrait space, scaled to fit under a top bar, with the dock on the bottom edge; spare height goes to the sky. The scenery (sunset sky, striped sun, Miami skyline, gantry cranes, stacked containers, gulls) runs to the screen edges.
- **Crates:** every crate shows a big numeral on a label plate and that many pineapples or coconuts (dice faces up to 6, a ten-frame for 7–10). Its size grows with its number (62 + 1.6 per unit: a 1 is 64 units across, a 10 is 78). Loose crates are wooden; bolted crates are blue steel containers with bolts, clamps and a hazard stripe, and only jiggle when touched. The mystery crate is purple with a "?", always drawn the size of a 7.
- **Dragging:** pressing within 16 units of a loose crate picks it up (nearest wins); it is drawn 58 units above the finger, with a shadow under the finger and a glow on the deck it would land on. Where the crate is drawn decides where it goes: above the line at y 545, the left or right half of the screen puts it on that deck, neatly stacked (bolted crates at the bottom, then rows of two, a lone crate centred); anything lower goes back to its own dashed spot on the dock. A deck holds six; a seventh goes back. A held crate counts for neither side. Crates spring into place with a little bounce.
- **Tilt:** the target angle is 0.07 rad for a difference of 1 plus 0.028 rad per further unit, capped at 0.24 rad (about 14°, at a difference of 7); the heavier side goes down. The ship springs toward it (spring 30, damping 4.4: about two wobbles), the water front sloshes with its swing, deck crates slide a little toward the low side, and the low end dips toward the waterline.
- **Totals:** big numbers over each side, the heavier one yellow. Between them a hungry gator whose jaws make the "<" or ">" sign, mouth open toward the bigger number and chomping; when equal, a glowing green "=" and both numbers turn green, as does the lamp on the bridge tower. A mystery side reads "?" (or "?+3").
- **Captain:** a pelican in a captain's hat on the bridge tower, staying upright and leaning against the tilt. Nervous (wide eyes, sweat drop, flapping) when tilted, dizzy after a wrong settle, happy when level.
- **Balanced:** the moment both sides are equal on a drop, the puzzle is solved: the ship levels for 1.7 s with steam puffs and notes from the funnel, sails off right (1.8 s), and the next puzzle sails in from the left (1.1 s) while its dock crates drop in from above.
- **No fail, no timer.** A **wrong settle** is counted when the ship comes to rest unbalanced with nothing held and, compared with the last time it rested, the heavy side swapped or got heavier. Adding to the light side or taking off the heavy side without going past is never wrong, and quick changes before the ship settles don't count. On mystery puzzles trying crates is the point, so only a wrong number tap counts there.
- **Plop:** if the ship comes to rest with a difference of 7 or more, the crate the player just dropped on the low side slides off, splashes into the sea and turns up back on the dock (crates that started on the ship never plop).
- **Mystery crate:** once it balances, three big numbers appear over the dock; the right one reveals the crate and sails; a wrong one shakes and greys out.
- **Stars per voyage** from its wrong settles: 0–2 → 3 stars, 3–5 → 2, more → 1.
- **Hints:** after 12 s without touching a crate, every crate's fruit light up one by one (counting) and a dashed ghost crate with the difference as yellow dots sits on the light side. After 24 s (4 s on the first two puzzles), the crate to move next glows and a ghost finger carries it to where it goes. Touching any crate resets the wait.
- **Voyage complete:** the ship sails slowly past the skyline into the sunset with its cargo, confetti, "Hooray!" (or "WOW!" for 3 stars), stars popping in, then Next and Again after 1.6 s.
- **Saved:** best stars per voyage in `localStorage` under `cargo-captain-progress` as `{ stars: [6 numbers] }`; anything malformed reads as 0. A voyage unlocks once the one before it (or the voyage itself) has a star.

## Voyages

Six voyages of five puzzles, each puzzle made by a seeded generator from a hand-tuned stage, so a voyage is the same every time. Every puzzle starts unbalanced, has an answer using only loose crates, needs exactly the stage's number of moves at best, and has at least one distractor.

| # | New type | Puzzles |
|---|---|---|
| 1 | Match | bolted crate on the left, put the same number on the right (1–3 up to 5–10) |
| 2 | Make it | a match, then two dock crates that make the number (5, then within 10) |
| 3 | Missing part | left 7, right already has a bolted 3: find the 4 (one or two parts) |
| 4 | Too heavy | the right is loaded too heavy: take one or two crates off |
| 5 | Both sides | bolted crates on both sides, add to the lighter; sums to 12; a three-crate sum |
| 6 | Mystery | doubles, a "?" crate, sums within 20, three-crate sums within 20, a harder "?" |

## Code

Under `src/games/cargo-captain/`:

| File | Purpose |
|---|---|
| `sim.js` | Pure. All tuning constants (named and documented at the top), weights and comparison, the brute-force solver, tilt spring, layout of decks and dock, pick/move/drop/answer actions, wrong settles, plops, the puzzle timeline, hints, stars and progress parsing. |
| `levels.js` | Pure. The voyage stage table, the seeded generator and the per-puzzle check. |
| `bot.js` | Pure. A tidy captain for tests and debug: asks the solver for the cheapest moves (ordered so the ship never swings past level) and carries them out with the same pick/move/drop actions a finger uses, aiming at where crates are drawn. |
| `draw.js` | Drawing only: crates, ship, pelican, gator and "=" signs, the harbour (backdrop cached per size), dock, hints, plops, steam and notes, menu art and the launcher tile. |
| `index.js` | Menu, voyage picker, play, voyage-complete screen, drag input, mystery number taps, saved stars. |

`?level=N` starts voyage N. `?debug` exposes `window.__cargo` (`state()`, `screen()`, `buttons()`, `view()`, `progress()`, `toScreen`, `toField`, `crateAt(id)`, `voyage(n)`, `goto(screen)`, `autosolve(on)` for animated play, `finish()`, `solveStep()`, `nextMove()`, `advance(seconds)`).

`test/cargo-captain.test.js` covers weights and comparison, tilt direction and settling level, drop rules, bolted crates, deck capacity and non-overlapping stacks, wrong settles and plops, the mystery flow and choices, hints, stars, progress parsing, every generated puzzle (solvable by an independent brute force, a distractor, within its range, unbalanced at the start, also on other seeds), the order types arrive in, and the bot finishing every voyage with 3 stars.

## Not built yet

Sound (the horn and the plop are visual only). Tuning by feel on a real iPad: tilt per unit, spring, hint delays and star thresholds at the top of `sim.js`.
