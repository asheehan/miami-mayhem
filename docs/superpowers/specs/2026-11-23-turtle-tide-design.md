# Turtle Tide — Design

A game in Riley's Miami Mayhem: the player is the tide. A baby sea turtle walks by itself from its nest toward the sea. Dragging a finger up and down anywhere raises and lowers the water. Raising the water floats the turtle over walls, and lowering it sets the turtle down to walk under rocks. Side-on view of a beach at sunset. Portrait, touch only, no reading.

## Rules

- **World:** a side-on slice 240 units tall. Heights run up from the sea bed. Levels are 560–1160 units wide. The screen always shows the full height and at least 230 units across. The camera follows the turtle, which sits about a third of the way across so the player can see what's coming.
- **The tide:** the water follows the finger's height. Touching anywhere off the buttons sets the target, and the water eases toward it at up to 60 units/s, staying inside the level's tide range. A handle on the right edge rides the water level. A dashed ring marks where the finger wants the water, and the handle glows while the finger is down. Lifting the finger leaves the water where it is.
- **Walking:** the turtle always heads right. It climbs steps up to 8 units. Anything taller stops it: it presses against the wall and looks up, but never turns back. It drops off ledges.
- **Floating:** once the water is 9 units deep over the ground, the turtle floats at the surface and swims, which is faster than walking (38 vs 26 units/s). A swimming turtle can haul itself onto a ledge up to 5 units above the surface, so raising the water lifts it over walls. Lowering the water sets it down again.
- **Overhangs:** caves hanging from the sky and pier decks are solid. With the water too high, the floating turtle bonks its head (dizzy stars) and waits until the water goes down. A turtle already under a rock when the water rises stays pinned under it and pops up on the far side. A pier can also be climbed onto from very high water.
- **Driftwood logs:** each log is held in place sideways (in a pit or slot) and floats up and down with the water, with 12 units sticking out above the surface. On the sand it rests on whatever is under it. A log is a platform: a turtle standing on it rides it up, higher than swimming could reach. It is also a wall: a swimming turtle can't climb onto a floating log. So the player has to lower the water, board the log, then raise it again. A wide log rests on notches over a pit and becomes a flush bridge when the water is low.
- **Crabs** patrol the dry sand. Touching an awake crab makes the turtle "eep!" and hop back to the last sandcastle. Water 6 units deep over a crab makes it hide in its shell, where it is harmless.
- **Jellyfish** drift left and right at the surface of a pool and sting a swimming turtle. With less than 15 units of water under a jelly, it flops onto the sand, asleep and harmless, so draining the pool lets the turtle walk past.
- **Swell** (levels 10 and 12): an automatic wave of ±12 (or ±6) units on top of the player's level, so the water bobs and timing matters a little.
- **No fail, no timer, no lives.** A mishap returns the turtle to the last sandcastle it passed (whose flag runs up), followed by 1.5 s of flashing safety. Starfish already collected are kept.
- **Starfish and stars:** three starfish per level. Some sit high and need high water; some sit low and need the turtle walking. Stars: 1 for reaching the sea, 2 with two starfish, 3 with all three.
- **Hints:** a ghost finger beside the tide handle slides from the current water level to where the level's route (`nav`) wants it, with a dashed arrow. It appears when the turtle has been stuck for 5 s, and for a few seconds after a crab or jelly mishap. On levels 1–2 it appears after 0.4 s stuck, so the first wall shows "drag up" and the first cave shows "drag down". Level 1 does not finish without moving the water.
- **Win:** the turtle swims past the goal buoy into the open sea with a splash. Then confetti, "Hooray!" (or "WOW!" for 3 stars), stars popping in, the starfish row and a dancing turtle. Next and Again appear after 1.4 s.
- **Saved:** best stars per level in `localStorage` under `turtle-tide-progress` as `{ stars: [12 numbers] }`. A level unlocks once the one before it (or the level itself) has a star.

## Levels

| # | Name | New thing |
|---|---|---|
| 1 | First Splash | a wall: raise the water (ghost finger) |
| 2 | Sea Cave | starts flooded, a low cave: lower the water (ghost finger) |
| 3 | Up and Down | wall, cave, taller wall |
| 4 | Log Lift | a cliff too high to swim up: board the log low, then raise |
| 5 | Crab Beach | two crabs: flood them |
| 6 | Crab Cave | a crab under a cave: water deep enough to hide it, low enough to fit |
| 7 | Jelly Pool | jellies in a pool: drain it, walk through, then raise for a wall |
| 8 | Driftwood Bridge | a log bridge over a pit (blocks swimmers); ride it up for a starfish |
| 9 | Jelly Crabs | drain for jellies, flood for a crab, under a cave, over a wall |
| 10 | Wavy Day | the swell: wall, cave and crabs with bobbing water |
| 11 | Pier Party | a pier: duck under it (crab below) or climb on top |
| 12 | Big Voyage | everything: wall, crab, cave, jelly pool, log lift to a cliff, gentle swell |

## Code

Under `src/games/turtle-tide/`:

| File | Purpose |
|---|---|
| `sim.js` | Pure, seeded. All the tuning constants (named and documented at the top), terrain, water, logs, crabs, jellies, the turtle's walk/swim/fall/bonk physics, mishaps and checkpoints, starfish and stars. |
| `levels.js` | Pure. The twelve levels as data, each with two routes: `nav` (to the sea) and `navAll` (all three starfish), lists of "once the turtle passes x, set the tide to h". |
| `bot.js` | Pure. Plays a level by following a route, and works out which way the hint finger should point. |
| `draw.js` | Drawing only: sunset sky, far islands, sand, rocks, pier, logs, crabs, jellies, starfish, sandcastles, the turtle (paddling flippers, blinking, looking up, dizzy, eep), water with waves, foam, light rays and bubbles. Also the launcher tile. |
| `index.js` | Menu, level picker, play and win screens, the tide control and handle, hint finger, HUD (starfish slots, a nest-to-sea progress strip), saved stars. |

`?level=N` starts on level N. `?debug` exposes `window.__turtle`: `state()`, `screen()`, `buttons()`, `view()`, `progress()`, `toScreen(x, h)`, `toWorld(x, y)`, `tideHandle()`, `tide(h)`, `fastForward(seconds)`, `level(n)`, `goto(screen)`, and `autopilot(on, all = true)`, which follows `navAll` (or `nav`).

`test/turtle-tide.test.js` covers terrain, walking, steps and walls, floating and swim speed, tide speed and range, cave bonks and being pinned under rocks, logs floating, resting, lifting and blocking, crabs (eep and return to the sandcastle, hiding under water), jellies (sting vs resting), star rules, seeded determinism, and level data. On every level, for two seeds, the `nav` bot reaches the sea and the `navAll` bot gets all three starfish. Leaving the tide alone for 120 s never finishes any level, including level 1.

## Not built yet

Sound. Tuning by feel on a real iPad (the constants at the top of `sim.js`, and the routes and heights in `levels.js`).
