# Swamp Buggy — Design

A game in Riley's Miami Mayhem: a side-view hill-driving game. A chunky, big-wheeled swamp buggy with bouncy suspension drives left to right over bumpy Everglades ground, catching air off ramps, splashing through water and bouncing over gators, to a chequered flag. Portrait, one finger, no reading needed to play.

## Controls

- **One touch.** Hold anywhere on the right half for gas, and on the left half for brake. Keep holding the brake once stopped to reverse. Sliding the finger across the middle switches pedals. Letting go coasts. Two big see-through pedals with arrows sit in the bottom corners and light up while pressed.
- **In the air**, gas tips the nose up and brake tips it down. The pedal steers the spin rate toward a target that grows with time in the air (0.3 + 4.5·t² rad/s, up to 11). Short hops barely tip. A one-second jump tips about 80°. Holding a pedal through big air (about 1.6 s) turns a full flip. This is so a child holding gas does a backflip on the biggest jump by accident.
- Levels 1–2 pulse the gas pedal, with a pressing finger and "Hold to go!", until the first press.

## Physics

The physics are home-made, with no dependencies. The step is a fixed 1/240 s, everything is deterministic, and the code is in `sim.js`. Units are metres with y up. Gravity is 14 m/s².

- **Buggy:** a rigid chassis (mass 6, inertia 6) and two wheels, each a 1.2 kg point mass. Each wheel hangs on a strut along the chassis' down axis: a soft spring (300 N/m), a damper, and stiff bump stops at both ends of the travel. A very stiff spring holds the wheel sideways. This makes the body bob and bounce on landings.
- **Terrain:** a height-field polyline. Wheels are circles that collide with the nearest point on the polyline, so step corners round off and a driven wheel climbs small steps. A wheel's contact is resolved by moving it out along the normal and removing its inward velocity. There is a small bounce on hard hits. Gas, brake, rolling resistance and "parked" grip act along the contact tangent. The buggy rests on flat ground without drifting, and holds still on gentle slopes.
- **Body touch points** (bumpers, roof corners, roll cage, belly) collide as small circles, with impulses and friction. That is how it lands on its roof.
- **Mud** cuts top speed to 55% and adds drag. **Water** cuts top speed to 70%, drags anything below the surface, and splashes. **Gators** are humps in the ground that kick a wheel upward ("boing"). **Turtles** are small humps that duck into their shells. **Crates and beach balls** get knocked flying and bounce about. Only the buggy feels them a little. **Rope bridges** bob up and down: the ground height there changes with time (`bridgeOffset`).

## Kindness

There is no fuel, no damage and no failing.

- **Roof or side:** a buggy lying on its roof or side wobbles, and a "Flip me!" bubble fills a ring. After 1.5 s it boings up and turns back over onto its wheels, which takes 0.6 s. A fresh press after 0.4 s flips it straight away.
- **Stuck:** gas held for 2.2 s without moving forward (nose in a ditch, high-centred, against a wall) boings the buggy 2.5 m forward onto the ground ahead. Repeats in the same spot go further, so nothing can hold it for long.

## Scoring

- Every level has coins along the ground and oranges in arcs over the ramps. The arcs follow the flight of a buggy leaving the lip at its measured launch speed, so holding the gas catches them. Each one counts 1.
- **Stars:** 1 for reaching the flag, 2 for 40% of the pick-ups, and 3 for 70%. The HUD bar shows both targets.
- **FLIP!** counts once the buggy has turned at least 245° and settles upright on its wheels (0.3 s after landing). Ramps and landing slopes differ by a lot, so a real backflip off a kicker is well under 360°. It pays 3 coins per flip. **BIG AIR!** is 1.1 s or more in the air and pays 2 coins. Bonuses go into the coin jar, not toward stars.
- The coin jar holds all pick-ups plus bonuses from every run, and is spent in the garage.

## Garage

The differences between buggies are kept mild. Every buggy finishes every level.

| Buggy | How to get it | Feel |
|---|---|---|
| Swamp Hopper (green) | start | the baseline |
| Taxi Zoomer (yellow, chequered stripe, roof light) | 60 coins | a touch faster, firmer springs |
| Fan Boat (blue, big caged fan) | 150 coins | mud and water slow it half as much, livelier in the air |
| Big Bouncer (purple, flames) | 250 coins | huge wheels, soft long springs, a bit slower |
| Golden Gator (gold, green spots) | 30 stars | a bit quicker all round |

Tap a buggy to drive it, or to buy it if there are enough coins. If there aren't, the card wiggles.

## Levels

There are four looks with three levels each. A bot finishes each in about 31–64 s. Ground is defined in `tracks.js` by a small builder: `flat`, `bumps`, `hill`, `rise`, `step`, `jump` (kicker, pit, crest, downhill landing), `skiJump` (kicker over a long downhill), `puddle`, `mud`, `logs`, `bridge`, `gator`, `turtle`, `prop`, `coins`.

| # | Name | Look | New thing |
|---|---|---|---|
| 1 | Sawgrass Start | sawgrass swamp | nearly flat: small bumps, low hills, two tiny kickers |
| 2 | Bumpy Bayou | swamp | mud, puddles, the first gator |
| 3 | Gator Hop | swamp | rows of gators to bounce on, water pits |
| 4 | Log Bridge | mangrove tunnel | log bridges over creeks, small steps |
| 5 | Mangrove Tunnel | mangrove | crates, steps up and down, bigger jumps |
| 6 | Root Rumble | mangrove | a bobbing rope bridge, the first ski jump |
| 7 | Dune Jumps | beach dunes | big dunes, beach balls, big air |
| 8 | Beach Ball Bash | beach | balls everywhere, tide pools |
| 9 | Lighthouse Leap | beach | steep dunes, steps, a tall ski jump |
| 10 | Causeway Cruise | sunset causeway | big kickers and a mega ski jump |
| 11 | Drawbridge Dash | causeway | three bobbing bridges |
| 12 | Sunset Super Jump | causeway | everything, ending in a huge jump (holding gas flips it) |

## Screen

- **Camera:** the buggy rides about a third of the way across and 62% of the way down, so jumps have sky above them. The camera looks ahead with speed and zooms out a little at speed and in the air. About 20 m of course shows across on a tablet and 16 m on a phone.
- **Parallax:** sky gradient (cached), sun, clouds, a far and a mid layer per look (cypress trees with moss, mangrove prop roots under a hanging canopy, sea with palms and a lighthouse, a sunset skyline and causeway), herons or gulls. Only the ground on screen is drawn.
- **HUD:** home (top left), restart (top right), coin count with a star bar, and a strip with a little buggy heading for the flag.
- **Effects:** dust, mud and splash particles, exhaust puffs, "+1"s, and pop-up words (FLIP!, BIG AIR!, BOING!).
- **Finish:** "FINISH!", then confetti, "Hooray!" (or "WOW!" for 3 stars), the stars popping in, the pick-up count, the tricks with their bonus, and a hint for the next star. Next and Again respond after 1.8 s, so a held pedal can't press them.
- **Menu:** a demo run on a random level behind the title, the stars and coin jar, and buttons for Drive N, Levels and Garage.
- **Picker:** twelve cards, each with a little profile of that level's ground, stars and locks.
- **Saved:** `localStorage` under `swamp-buggy-progress` as `{ stars: [12], coins, owned: [ids], buggy }`. A level unlocks once the one before it (or the level itself) has a star.

## Sound

Sound is synthesised with Web Audio in `sound.js` and starts on the first touch: an engine buzz that follows speed and gas, coin and orange blips, boing, splash, thud, a trick jingle and a finish fanfare.

## Code

Under `src/games/swamp-buggy/`:

| File | Purpose |
|---|---|
| `sim.js` | Pure and deterministic. Tuning constants at the top, terrain queries, the buggy physics, mud, water, critters, props, air time and flips, flip-back and stuck hops, pick-ups and stars. |
| `tracks.js` | The twelve levels as data, built once by the course builder. |
| `buggies.js` | The five buggies: tuning and colours. |
| `bot.js` | `botPedal` (gas, and levels the buggy to the landing slope in the air), `gasPedal` (holds gas), `makeRandomPedal`. |
| `progress.js` | Saving, unlocking, the coin jar and garage rules. |
| `draw.js` | All drawing, the shared button and text helpers, and the launcher tile. |
| `sound.js` | Synthesised sounds. |
| `index.js` | Screens, input, HUD, finish card, debug hook. |

`?level=N` starts on level N. `?debug` exposes `window.__buggy`: `state()`, `demo()`, `screen()`, `buttons()`, `pedals()`, `view()`, `toScreen(x, y)`, `progress()`, `setProgress(p)`, `level(n)`, `goto(screen)`, `autopilot(on)`, `pedal(v)`, `seek(x, { roof })`, `flipNow()`, `fastForward(sec)`, `stats()`, `resetStats()`, `bench(n)`.

`test/swamp-buggy.test.js` covers:

- terrain queries
- resting without drift or jitter, with wheels on (not in) the ground
- gas, coasting, braking and reversing
- climbing a hill and a small step
- suspension settling
- mud and water slowing the buggy
- ramps giving air, and air tilt both ways
- landing and driving on
- flip and big-air detection, and no flip for a hop
- the roof flip-back and the early press
- the stuck hop over a 3 m wall
- gators bouncing
- pick-ups, the star rule, the finish and auto-brake
- determinism and frame-rate independence
- level data checks (continuous ground, finish inside, pick-ups above ground, no tall walls, water over ground)
- saving, the garage and unlocking

On every level the bot finishes in 28–72 s with at least 70% of the pick-ups, and holding the gas finishes without ever stalling 8 s. On levels 1–4 holding the gas finishes in under 60 s with two stars or more. A random pedal-poker finishes levels 1, 2 and 4. Holding the gas flips on the final jump. Every buggy finishes levels 5 and 10.

## Not built yet

Tuning by feel on a real iPad: the constants at the top of `sim.js` and the sizes in `tracks.js`. Moving drawbridges that open and close. Real loops: the ground is a height field, so the "loop-ish" ramps are steep kickers and ski jumps.
