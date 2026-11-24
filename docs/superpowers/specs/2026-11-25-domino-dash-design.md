# Domino Dash — Design

A game in Riley's Miami Mayhem. It's a chain-reaction toy on a felt table in a Miami domino park, with a cafecito, a sleeping cat, palm planters and a rooster. The table is seen from above at a tilt. Riley draws a line with a finger, and dominoes are laid along it at an even spacing. Tapping GO (or the start domino) knocks the first one over. If the chain reaches every goal gadget (a party popper, bell, rocket, piñata or conga drum), they go off and the level is won. Portrait, touch only, no reading, no timers.

## Rules

- **The table:** a rectangle in world units (x right, y down the screen). It's drawn squashed to 0.8 of its height, and heights show at 0.6. Levels are written on a 520-wide grid and shrunk by `LEVEL_SCALE` (0.58), so the dominoes show up large. A domino is 24 tall, 12 wide and 5 thick.
- **Laying:** a stroke must start within 36 units (or about 46 px) of an *open end*. That is the start domino, a gadget's output domino, or the last domino of a trail (any domino with nothing in front of it). Dominoes are laid behind the finger, 14 units apart. Each one faces the way it was laid, and the one before turns to face halfway between its way in and its way out. Out of a fixed domino the first step always goes straight ahead. Spots on an obstacle, gadget, goal, the table edge, a gap between tables or another domino are skipped. The trail snugs up to the edge (steps down to 9) and then carries on from the first free spot past it once the finger is beyond. So crossing a cup leaves an honest gap.
- **Supply and stars:** each level has a supply (shown in the top bar with the stars a win would earn right now). Setting off every goal earns 1 star. Using no more than `par + max(3, 30% of par)` dominoes earns 2 stars, and par or fewer earns 3. Par is about 1.2× what the bot uses, plus 2, and the supply is about 1.7× par.
- **Toppling:** a deterministic model, not a physics engine. A falling domino tips over its front edge with angle 90°·u² (u = time / fall time). Fall time starts at 0.42 s and drops 3.5% per domino along the chain, to no less than 0.2 s. When it starts to fall it finds everything standing in front of it: up to 20 units past its front face, and within 7 units of its line (goals and gadgets within their radius + 3). Each of those gets struck at the moment the top reaches it (`asin(gap / height)`). The struck domino falls the way it faces, or backwards if hit from behind. If the push comes more than 50° round its side, it only wobbles and the chain stops. A cup or other obstacle on the line between them blocks the hit. A domino rests leaning on the first thing it hit (drawn settling deeper as that one goes down), or flat if it hit nothing.
- **Narrow gaps:** dominoes can't stand in a gap between tables, but one can topple across it. An 8-unit crack is crossable because the trail snugs up to both edges. A wide gap is not.
- **Breaks:** when nothing is left moving and a goal hasn't gone off, the chain has stopped. Every fallen domino that knocked nothing over is a dead end, and the newest one is shown. Its reason is one of: `turn` (the nearest standing domino is too far round), `gap` (it is straight ahead but too far), `blocked` (an obstacle was in the way) or `end` (the trail ran out, so the arrow points at the nearest goal or gadget still waiting). It gets a pulsing red ring, an "oops!" bubble and a dashed arrow. After 2.4 s everything stands back up (animated), the hint stays until the next edit, and Riley fixes just that bit.
- **Undo, eraser, clear:** undo takes back the last stroke, erase or clear (so clear is safe). The eraser is a toggle: drags then rub out laid dominoes under the finger (never the fixed ones).
- **Gadgets:** a *splitter* is a wooden wedge: one domino in, two fixed output dominoes out at ±spread. *Carriers* are set off at the first point of their path and knock over a fixed domino at the last point. They carry the chain across a gap that nothing can stand in:
  - *ball*: a marble down a chute, 170 u/s
  - *car*: a wind-up toy car over a plank, easing in and out
  - *fan*: switches on and blows a beach ball across
  - *seesaw*: flings a ball in an arc, 0.9 s
  - *rooster*: hops across in 46-unit hops and pecks

  Their tracks block laying.
- **Goals:** all must go off. Each has a payoff: the popper fires streamers, the bell swings with ring waves, the rocket lifts off with smoke, the piñata bursts into candy, and the drum bounces with notes. Every goal also throws confetti.
- **Camera:** the whole table fits on screen while building. On big tables (`zoom` in the level) the camera closes in on the falling front of the chain and eases back after.
- **Win:** after the last goal goes off: confetti, "Hooray!" or "WOW!", stars popping in and a hopping domino. Next and Again appear after 1.8 s.
- **Free play** (open from the start): a 480 × 680 table with 150 dominoes and a tray button. Tap the tray to choose a goal kind, then drag from it to drop one on the table. No win: the chain stays down until GO ("Again") or a new stroke stands it back up. The camera follows at 1.6×.
- **Hints:** on level 1 a ghost finger traces the route from the start domino to the popper until the first drag. The start domino has a gold top and a bobbing arrow showing which way it falls, and open ends pulse yellow while building.
- **Colours:** domino colour sets unlock with total stars (Classic 0, Midnight 6, Flamingo 14, Ocean 22, Sunshine 30, Rainbow 40). The swatch button on the menu cycles through the unlocked ones.
- **Sound** (Web Audio, started on the first touch): a filtered-noise clack per domino that climbs in pitch along the chain, a tick when laying, a pop and arpeggio per goal, a whirr for gadgets, a two-note "oops" and a win jingle.
- **Saved:** `localStorage` `domino-dash-progress` as `{ stars: [15 numbers], theme }`. A level opens once the one before it has a star.

## Levels

| # | Name | New thing |
|---|---|---|
| 1 | First Clack | a short straight line to a popper (ghost finger) |
| 2 | Gentle Curve | a curve to a bell |
| 3 | Cafecito | one cup in the way |
| 4 | Sleepy Cat | a cat and a planter: an S-bend |
| 5 | Mind the Gap | a gap between tables, with a narrow plank bridge |
| 6 | Tiny Crack | a crack you can topple across, next to a gap you can't |
| 7 | Rolling Ball | a ball chute over a wide gap |
| 8 | Split! | a splitter and two goals |
| 9 | Toy Car | a toy car over a gap, plus a planter |
| 10 | Seesaw | a seesaw flings the ball over a gap |
| 11 | Beach Breeze | a fan blows a beach ball between side-by-side tables |
| 12 | Rooster Hop | the rooster hops a gap; a cat and a planter |
| 13 | Three Cheers | two splitters, three goals |
| 14 | Long Table | a long table: cup, cat, ball chute, planter, car; camera follows |
| 15 | Grand Finale | splitter, fan, rooster, second splitter, three goals |

## Code

Under `src/games/domino-dash/`:

| File | Purpose |
|---|---|
| `sim.js` | Pure and deterministic. Constants at the top. Laying (strokes, snugging, open ends), eraser, undo, clear, free-play goal drops, toppling (strikes, wobbles, leaning), splitters and carriers (`carrierPos`), breaks, stars, progress parsing. |
| `levels.js` | Pure. The fifteen levels (plus `FREE`), each with a `route`: lines a finger could draw to win. `scaleLevel` shrinks them to play size. |
| `bot.js` | Pure. Drags a route the way a finger would (4-unit steps), plays the chain out, and makes a broken route (last line cut short). |
| `draw.js` | Drawing only. Dominoes are 3D boxes, tipped over their front edge, with pips on the big faces mapped by an affine transform, light shading and cast shadows. Also the felt table, gaps, bridges, cups, cat, planter, box, goals, gadgets, hint arrows, particles, picker icons and the launcher tile. |
| `sound.js` | Synthesised sounds. |
| `index.js` | Menu (with a demo table that topples on a loop), level picker, play screen with the tool bar, HUD, camera, ghost finger, win screen, free play, saved stars and colours. |

`?level=N` starts on level N (`?level=free` opens free play). `?debug` exposes `window.__domino`: `state()`, `screen()`, `buttons()`, `view()`, `progress()`, `toScreen(x, y)`, `toWorld(x, y)`, `level(n)`, `free()`, `goto(screen)`, `solve()` (lays the route), `line(points)`, `go()` and `advance(seconds)`.

`test/domino-dash.test.js` covers:

- laying: even spacing and facing, curves, open ends, going straight out of the start, obstacles, gaps and bridges, supply, separation
- undo, eraser and clear
- toppling: end to end, order and speed-up, leaning, gaps, reach, sharp turns, blocking, the hint direction, standing back up and fixing
- narrow versus wide gaps, every goal needed, the empty flick and determinism
- the splitter and each carrier, both hit and missed
- free play with a 150-domino spiral
- stars and progress
- level data: on every level the bot wins within par with three stars, and the cut-short route and the empty flick don't win

## Not built yet

Tuning by feel on a real iPad: reach, turn tolerance, spacing, par and the camera zoom. The theme swatch is the only way to see the colour unlocks. Free play has drop-in goals but no drop-in carriers.
