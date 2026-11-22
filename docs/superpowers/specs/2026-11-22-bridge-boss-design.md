# Bridge Boss — Design

A game in Riley's Miami Mayhem: the player runs a Miami drawbridge. Seen from above: a canal runs up the screen, a road crosses it, and a bascule bridge carries the road over the water. Tap to raise or lower the bridge so cars and boats take turns.

## Rules

- **World units:** the world is 100 wide and 160 tall; a plain car is 9 long. The canal runs between x = 36 and x = 64. One road crosses at y = 84, or two at y = 46 and y = 118. The world fits the screen between the top bar and the goal bar, and at least 84 units of its width are always shown. The edges are scenery and queue space.
- **Lanes:** cars drive on the right (eastbound below the road's middle, westbound above it). Boats go up the canal on the right and down it on the left. Which lanes a level uses is part of the level.
- **The bridge:** starts down. A tap toggles it, acting as the finger goes down; a small slide still counts. It takes 0.6 s to open or close: the two leaves tip up from the banks with a shadow on the water. Gates and red/green lights show who may go. Down means cars cross. Up means boats pass. While it moves, nobody may start across.
- **Refusal:** the bridge will not move while a car is on the span or a boat is under it. A car or boat that has passed its stop line counts as on it. A refused tap shakes the leaves, pops a padlock over the bridge and rings the vehicle in the way. A tap less than 0.25 s after a toggle is ignored. A later tap while the bridge is moving turns it round, which is always safe.
- **Taps:** on one-bridge levels a tap anywhere on the world toggles it. On two-bridge levels a tap toggles the bridge whose road is nearer the finger. Taps on the top bar and the goal bar do nothing.
- **Queues:** vehicles brake on a smooth curve to stop at the stop line or 2.5 units behind the vehicle ahead, so they never overlap. A vehicle will not start across behind a slower one (a bus, a truck, a cruise ship) until the slower one is well clear. It also waits unless there is room to get all the way off the bridge. So the span always empties, and between two bridges a queue cannot jam the first one.
- **Patience:** a waiting vehicle fills a patience pie that turns from green to red. The front of a queue at a shut bridge fills it at full speed; anyone stuck behind fills it at 0.3×. Waiting vehicles honk ("beep!", "toot!", "wee-oo!" for the ambulance) more often as patience runs out, and their eyebrows go cross. Full patience: the vehicle spins into a poof cloud with a grumpy face, a heart floats away and one heart is lost.
- **Specials:** school bus and truck (slow cars), ambulance (fast, 6 s patience, flashing lights), cruise ship (30 long, slow, 1.6× patience, ~8 s to clear the bridge), speedboat (2.4× speed, 6 s patience, big wake).
- **Goal:** a number of cars and a number of boats must get all the way across. The goal bar shows a row of pips for each, ticking as they fill. Both rows full is a win. Leaving the bridge alone can never win, because no boat gets through.
- **Hearts:** three. None left: "Oops!" with Try again (the same level, new traffic) and Levels.
- **Win:** confetti, "BRIDGE BOSS!", one star per heart left (1–3) popping in, and Next level / Play again after 1.1 s. Winning a level unlocks the next.
- **Levels:**

| Level | Bridges | Car lanes | Boat lanes | Goal (cars + boats) | Patience (car / boat) | New |
|---|---|---|---|---|---|---|
| 1 | 1 | E | N | 4 + 3 | 24 / 24 s | tapping hint |
| 2 | 1 | E, W | N | 6 + 4 | 20 / 20 s | |
| 3 | 1 | E, W | N, S | 8 + 5 | 17 / 17 s | school bus |
| 4 | 1 | E, W | N, S | 10 + 6 | 15 / 15 s | ambulance |
| 5 | 1 | E, W | N, S | 10 + 6 | 16 / 15 s | cruise ship, trucks |
| 6 | 1 | E, W | N, S | 12 + 8 | 14 / 14 s | speedboat |
| 7 | 2 | E | N | 10 + 5 | 16 / 16 s | second bridge |
| 8 | 2 | E, W | N | 14 + 6 | 13 / 13 s | |
| 9 | 2 | E, W | N, S | 16 + 8 | 11 / 12 s | everything |

  Levels 1–3 show a tapping finger on the bridge whenever someone is waiting for it and it can move. Each new special is forced to arrive early, and alone, on the level that brings it in.
- **Traffic:** each lane's arrivals are drawn from the seed when the level starts, at random gaps between a level's min and max. The gap is stretched after a slow vehicle. If a lane is backed up to where vehicles appear, the next one waits off screen.
- **Saved:** best stars per level, in `bridge-boss-progress`.
- `?level=N` starts level N (locked or not). `?seed=N` fixes the traffic. `?debug` exposes `window.__bridge` (state, screen, buttons, view, progress, toScreen, toggle, level, goto, autopilot, win, skip).

## Code

Under `src/games/bridge-boss/`:

| File | Purpose |
|---|---|
| `levels.js` | Every tuning number, documented: world shape, bridge time, braking, queue patience rate, vehicle types, and the level table. |
| `sim.js` | Pure. Lanes and crossings, seeded arrival schedules, driving and queueing, the bridge state machine, patience, hearts, win and loss. |
| `bot.js` | A simple keeper: for each bridge, serve whichever side's nearest vehicle is closest to running out of patience, switching when the span is clear. Used by the tests and the debug autopilot. |
| `draw.js` | Drawing. Reads the state; no rules. Ground, canal, roads, buildings and palms are cached offscreen per screen size. Also the launcher tile (a little bridge taking turns). |
| `index.js` | Menu (the bot plays level 1 behind the title), level picker with stars and locks, HUD, goal bar, win and try-again screens, input, saved stars, debug handle. |

`sim.js` is unit tested in `test/bridge-boss.test.js`. The tests cover lane geometry, queueing with no overlaps on every level, the bridge timing, debounce and turning round, refusals with a car on or a boat under, patience costing hearts (and filling slower behind the front), win, loss and star rules, and seeded determinism. For every level the bot wins on five fixed seeds (with all three hearts on levels 1–3) and on at least 14 of 16 more, and leaving the bridge alone loses.

## Not built yet

Sound. Tuning by feel on a real iPad. The numbers come from bot runs, not from a child playing.
