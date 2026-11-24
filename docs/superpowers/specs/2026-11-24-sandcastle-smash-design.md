# Sandcastle Smash — Design

A game in Riley's Miami Mayhem: a palm-tree slingshot on a Miami beach flings coconuts at sandcastles. Grumpy crabs in little bucket hats sit on and inside the castles; knock them all off to win. Side-on view, portrait, one finger, no reading needed to play.

## Rules

- **World:** side-on, in metres, y up, sand at y = 0. The slingshot's pouch is at (2.6, 2.7). Each level is as wide as its castle plus a little sand (13–27 m). The screen shows at most 20 m across and at least 11 m of sky. A wider level opens on the castle, pans back to the slingshot, follows the coconut in flight and comes back for the next shot. A coconut above the top of the screen shows as a marker on the edge.
- **Aiming:** press on the coconut (or anywhere off the buttons) and pull back. The pull's direction and length (up to about a third of the screen, 110–240 px) set the angle and strength, up to 19 m/s. A long dotted arc shows the exact flight, worked out with the same integration the world uses, up to 5 s or the first thing it would touch, where a ring marks the spot. Let go to fire. A pull shorter than 15% doesn't fire. Angles are held between −0.5 and 1.45 rad.
- **Physics:** a small rigid-body engine (`physics.js`) with boxes and circles, gravity of 12 m/s², friction and some bounce. It uses sequential impulses with warm starting and 16 iterations at a fixed 1/60 s step, with no randomness. Each level settles quietly for 1.5 s when it is built. Towers stand still at rest: an 8-high stack drifts by less than 1 cm in a minute.
- **Damage:** when two things knock together faster than 1.5 m/s, both take damage equal to the knock's impulse above that speed. Landing on the sand or a rock counts half. A block breaks once its damage passes its strength, and whatever smashed it carries on through, slowed.

| Material | Strength | Notes |
|---|---|---|
| Sand | 4 | crumbles easily, even from a fall |
| Cooler ice | 5 | slippery (friction 0.12), shatters |
| Driftwood | 10 | light but tough; a plain coconut only dents it, the bowling coconut breaks it |
| Bucket | never breaks | light and a little bouncy |
| Beach ball | never breaks | very light, bouncy, rolls |
| Rock, pier deck and posts | fixed | |

- **Crabs** (strength 1) pop with a puff, a flying hat and "+500" when hit hard enough, when they fall 0.8 m below where they sat, when they tip past about 70°, or when they leave the beach. Their faces are grumpy at rest, scared when a coconut is coming, dizzy when shaken, and laughing for a moment after each miss.
- **Coconuts:** plain; **split** (tap while it flies: it becomes three smaller coconuts fanned out); **bowling** (automatic: much heavier, smashes driftwood); **pineapple** (bursts on its first touch, or earlier with a tap, shoving and damaging everything within 3.2 m). A pulsing "TAP!" ring follows a special coconut until it has been used. A press anywhere sets it off, on finger-down.
- **Turns:** the next coconut loads once everything is still, or after 3.5 s at most. Spent coconuts puff away when it does.
- **Win:** the last crab pops, then after 1.2 s comes confetti, "Hooray!" (or "WOW!" for 3 stars), stars popping in, the score and the saved coconuts bouncing. Next and Again appear after 1.2 s.
- **Stars:** 1 for clearing, plus 1 for each coconut left over, up to 3.
- **No hard fail:** after the last coconut, once things are still (or 8 s pass) with crabs left, a kind "So close! Let's try again!" screen shows a dancing crab, a big Try again button and Levels.
- **Hints:** on levels 1–2 a ghost finger pulls back from the coconut along a good shot (picked by the bot), with the arc showing, until the first shot. On any level it comes back after 8 s idle. The first level of each new thing shows a one-line caption for a grown-up to read out.
- **Saved:** best stars per level in `localStorage` under `sandcastle-smash-progress` as `{ stars: [15 numbers] }`. A level unlocks once the one before it (or the level itself) has a star.

## Levels

| # | Chapter | Name | New thing | Coconuts |
|---|---|---|---|---|
| 1 | Morning Beach | Hello, Crab! | one crab on a wide sand castle | 4 |
| 2 | Morning Beach | Two Towers | two towers | 5 |
| 3 | Morning Beach | Sand Pyramid | a pyramid, a crab on the sand in front | 5 |
| 4 | Morning Beach | Driftwood Hut | driftwood roof, a crab inside | 5 |
| 5 | Morning Beach | Bouncy Balls | beach balls on a shelf | 6 |
| 6 | The Pier | Cooler Ice | ice blocks and an ice table | 6 |
| 7 | The Pier | Split Coconut | split coconut, three small towers | 5 |
| 8 | The Pier | Pier Party | castles on a pier deck, buckets | 6 |
| 9 | The Pier | Bucket Brigade | a bucket fort | 6 |
| 10 | The Pier | Icy Pier | ice and wood on the pier, four crabs | 6 |
| 11 | Sunset Shore | Bowling Coconut | bowling coconut, a driftwood fort | 6 |
| 12 | Sunset Shore | Pineapple Pop | pineapple | 6 |
| 13 | Sunset Shore | Far Fort | a far castle on a rock, the camera pans | 7 |
| 14 | Sunset Shore | Crab Tower | a tall mixed tower and a ball | 7 |
| 15 | Sunset Shore | King Crab Castle | everything, six crabs | 8 |

Levels 1–3 are plain sand with one or two crabs and plain coconuts. Each new block or coconut arrives on its own level.

## Code

Under `src/games/sandcastle-smash/`:

| File | Purpose |
|---|---|
| `physics.js` | Pure. The rigid-body engine: box–box (clipped faces, two contacts), box–circle, circle–circle, warm-started impulses, rolling drag. |
| `sim.js` | Pure and deterministic. Tuning constants at the top, materials and coconuts, building and settling a level, firing, taps, damage and breaking, crabs popping, turns, win, try-again, stars and the preview path. |
| `levels.js` | Pure. The fifteen levels as data, built with small helpers so pieces sit exactly on each other. |
| `bot.js` | Pure. For each shot it aims low and high arcs at every crab and the blocks holding it up, plays each one forward on a copy of the game, and keeps the one that pops the most crabs. It taps split coconuts just before the target. |
| `draw.js` | Drawing only: three skies, sea, sand and shoreline, the palm slingshot and its band, coconuts, crabs with moods and hats, sand, wood, ice, buckets, balls, pier, cracks as blocks weaken, wobble, sand and ice and wood bits, puffs, score pops, burst rings, screen shake. Also the launcher tile, where a coconut knocks a crab off a castle. |
| `index.js` | Menu, level picker, play, win and try-again screens, aiming and the arc, the camera, HUD (coconuts left in order, crabs left), hints, saved stars. |

`?level=N` starts on level N. `?debug` exposes `window.__smash`: `state()`, `screen()`, `buttons()`, `view()`, `progress()`, `toScreen(x, y)`, `toWorld(x, y)`, `pouch()`, `maxPull()`, `aim()`, `fire(angle, power)`, `tap()`, `plan()`, `botShot()`, `fastForward(seconds)`, `level(n)`, `goto(screen)`.

`test/sandcastle-smash.test.js` covers:

- An 8-high tower that stays still for 10 s, a castle that neither jitters nor pops anything, balls that bounce and then stop.
- Firing rules, and the preview matching the real flight exactly.
- Reloading and spent coconuts puffing away.
- Knocking a tower about, materials breaking in order of strength (and the bowling coconut breaking driftwood), unbreakable buckets, coconuts punching through sand.
- Crabs popping from a hit and from a fall, but not from a nudge.
- Split, bowling and pineapple (on touch and on tap).
- Stars, win, try-again, determinism and copies of the state.
- Level data: three chapters of five, new things in order, small first levels.
- Every level starting at rest and staying put for 10 s, and the bot clearing every level within its coconuts.

## Not built yet

Sound. Tuning by feel on a real iPad: the pull length, the damage strengths and the level layouts. The bot finds shots a child won't (it clears most levels in one or two), so how hard each level feels still needs checking with Riley.
