# Sunset Drive — Design

A game in Riley's Miami Mayhem: an old-school behind-the-car arcade driving game. A coral convertible cruises six Florida roads at sunset (and after dark, and in a storm), weaving between slow pastel traffic and scooping up coins. Nothing can go wrong badly: every drive reaches the finish.

## Rules

- **The road** is built from segments 200 world units long and 2000 wide (three lanes), with curves and hills that ease in and out. It is drawn with the classic projected-segments technique: each segment's edges are projected to the screen, striped rumble strips and lane dashes alternate every 3 segments, roadside sprites are scaled by depth and clipped behind hill crests. The horizon sits 40% down the portrait screen and the car near the bottom.
- **Driving:** the car speeds up by itself to cruising speed (9000 units/s, 45 segments a second) after a 3-2-1-GO with a traffic light. No brake.
- **Steering (one finger):** hold or drag a finger anywhere off the buttons; the car steers toward the finger's x (a finger 17% of the screen width from the car is full lock, closer is gentler, right behind it is straight on). The car leans into the turn and the camera lags a little so the car slides on screen.
- **Bends** push the car toward the outside (curve × speed² × 0.17 road half-widths per second), gentle enough that steering always wins.
- **The verge** (grass, sand, city pavement, marsh or shallow water) caps speed at 45% and kicks up dust or spray. With no finger down the car eases back to the road edge by itself. The car can never wander more than 2.1 half-widths from the centre.
- **Bridges** have railings: the car scrapes along them with sparks and slows to 78%, but never falls in.
- **Traffic** (pastel cars, ice-cream trucks, scooters, buses) drives slower in its lanes. A bump goes BOING: speed drops to 40% (never below 20%), the car does a quarter-turn wobble and is shoved aside, the other car moves over to the far lane, and nothing can bump the car again for 1.4 s. Cars are placed so the player catches them spread along the stage, in the lane with the fewest coins nearby.
- **Coins** float in lines: through bends they trace the inside line in and out of the apex, on straights they sit in a lane or snake slowly across the lanes. **Boost pads** (chevrons on the road, each followed by a line of coins) give 1.7 s of extra speed with streak lines and exhaust flames.
- **Stars:** one for finishing, a second for half the coins, a third for 80% of them. The HUD shows the coin count and a bar that fills toward the 3-star mark with star markers at both thresholds, plus a road-progress strip with a little car heading for a chequered flag. No timer.
- **Finish:** a chequered banner and line. The car coasts on, confetti falls, the stars pop in, and the card says how many more coins the next star needs. Next stage / Again buttons respond after 1.8 s so a steering finger can't press one.
- **Stages** (60–90 s each at cruising speed; later ones curvier, hillier and busier):
  1. **Ocean Drive** — sunset; Art Deco hotels and neon on one side, beach, lifeguard towers, umbrellas and flamingos on the other.
  2. **Causeway** — across the bay on railed bridges with humps, lamps, sailboats and pelicans on posts; the skyline behind.
  3. **Neon Nights** — downtown after dark under a moon: lit towers, neon signs, street lamps, neon rumble strips.
  4. **Everglades** — long straights; sawgrass, mangroves, herons, gators sunning by the road, airboats on the canal.
  5. **Overseas Highway** — turquoise water both sides, long bridges with big hills, little keys with palms, a lighthouse.
  6. **Storm Run** — rain, lightning flashes and bent palms; the tightest bends and the most traffic.
- **Saved:** best stars per stage in `sunset-drive-progress` (`{ stars: [..] }`). Finishing a stage unlocks the next.
- `?level=N` starts stage N; `?debug` exposes `window.__drive` (state, screen, buttons, view, pose, progress, level, goto, autopilot, steer, skipCount, seek, spots, cruiseTime, stats, resetStats, bench).

## Look

Everything is drawn in code. Roadside things, traffic, gantries and coins are painted once into offscreen canvases (sized to the screen and pixel ratio) and drawn scaled. Road polygons are batched by colour, with eight fog levels per colour blending into the stage's haze. The sky is a cached gradient with a striped sun that sinks as the stage goes on (and a dusk tint that deepens), plus tiling cloud and skyline layers that slide sideways in bends. Scenery between the camera and the car is left out where it would hide the car. A tiny synthesised boing, coin blip, start beeps and finish jingle play once a touch has unlocked audio.

## Code

Under `src/games/sunset-drive/`:

| File | Purpose |
|---|---|
| `tracks.js` | Data. The six stages as sections (curve, hill, extras), scenery sets, traffic kinds, colours and skies. |
| `sim.js` | Pure. Tuning constants at the top, track building, the `project` function, driving physics, traffic, bumps, coins, pads, stars. Seeded. |
| `bot.js` | Pure. The autopilot (coins, pads, dodging traffic, cancelling the bend's push) and a random-steering driver. |
| `progress.js` | Saved stars: load, save, sanitize, unlock rules. |
| `sprites.js` | Sprite painters and their world sizes. |
| `draw.js` | The renderer (sky, road, sprites, car, particles, speed lines, rain), shared button and text helpers, the launcher tile. |
| `sound.js` | Synthesised sound effects. |
| `index.js` | Menu (with an attract-mode drive behind the title), stage picker, countdown, HUD, finish card, steering input, debug handle. |

`test/sunset-drive.test.js` covers track building (segment counts, easing, finish, 60–90 s length), projection, steering, bends, verge, railings, boost pads, coins, star rules, bumps that slow but never stop progress, seeded determinism, saved progress with bad data, and for every stage: the bot finishes with 3 stars, a hands-off player and a random-steering player both finish within a bounded time.

## Not built yet

An endless cruise mode. Music. Tilt steering.
