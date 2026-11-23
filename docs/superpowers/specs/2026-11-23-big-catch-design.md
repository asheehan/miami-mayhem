# Big Catch — Design

A game in Riley's Miami Mayhem: a fishing trip off Miami at sunset. A kid in a little boat drops a hook into the sea, dodges everything on the way down, then catches everything on the way up. Sand dollars from each trip buy a longer line, a bigger bucket and a lucky lure. A fish album fills in as new species come up. Portrait, side-on, one control, almost no reading.

## Rules

- **World:** the screen is always 56 units wide; depth runs from 0 (the surface) to 400 (the sea bed). The camera follows the hook: during the drop the hook sits about a third of the way down the screen (you see what's coming), and during the reel about 60% of the way down.
- **Control:** put a finger down anywhere (off the buttons) and slide left and right. The hook follows the finger's x smoothly (gain 9/s, top speed 45 units/s) and stays 3 units inside the edges.
- **A trip:**
  1. **Cast** (0.9 s): the hook flies from the rod into the water.
  2. **Drop:** the hook sinks at 14 units/s. Touching any creature (with the creature counted at 80% size) ends the drop right there. The creature dashes off and stars circle the hook ("Bonk!"). The drop also ends when the line runs out. If the line reaches the sea bed, the hook lands in the **treasure chest**.
  3. **Turn** (0.7 s pause).
  4. **Reel:** the hook rises at 16 units/s. A short reel slows down so it always lasts at least 4.5 s, and a full bucket speeds it up to 34 units/s. Every fish touched (generously: +1.6 units, plus the lure's reach) goes on the line, up to the bucket size, and hangs wiggling under the hook. **Junk** (old boot, tin can) takes a slot and is worth nothing ("Yuck!"). **Stingers** zap: a jellyfish knocks one fish off, a pufferfish two. The fish swim away dizzy, and you get 1.3 s of safety. **Blockers** (sea turtle, manatee) are never caught; touching one bonks the hook 9 units aside.
  5. **Haul:** at the surface the hook swings in by the boat and the catch flies into the boat one at a time (0.28–0.6 s apart). Each one spins and squashes as it lands, its value pops up, the big sand-dollar counter at the top counts up, and first-time species get a red "NEW!" stamp. The depth bonus flies in last. A tap hurries the haul along.
- **Never fails:** every trip pays at least the depth bonus: 0.12 sand dollars per metre of the deepest point, minimum 2. Afterwards, "Fish again" and "Shop" buttons appear (whichever is more useful is the big yellow one), along with the new species of the trip.
- **The sea:** each trip is generated from a seed. Rows of creatures run from 12 m down to just past the line's reach. Each depth zone sets the row spacing, the chance a row has a creature on the way down, the chance of a fresh arrival between rows on the way up, the chance of a pair, and a speed multiplier. A pair is always split across the screen so there is a way through. Creatures swim sideways and turn back 7 units past each edge. The same sim drives both directions, so what you dodged on the way down is still there on the way up, plus fresh arrivals (junk, stingers and blockers among them at half the usual chance). Nothing is placed right where the line ends.
- **The very first trip** (line 35 m): barely anything on the way down (12% of rows). On the way up there is a pair of fish every 5 m and no nasties. A ghost finger with a ↔ arrow shows "slide" on the first three trips, and again after 5 s without touching.

## Zones and creatures

| Zone | Depth | Look | Creatures |
|---|---|---|---|
| Sunny Shallows | 0–50 | turquoise, light shafts, seagrass, rocks, the boat and the sunset skyline above | Sergeant Major 1, Snapper 2, Parrotfish 4 · boot, can, jellyfish, sea turtle, manatee |
| Coral Reef | 50–130 | branching corals, sea fans, brain coral | Snapper, Parrotfish, Angelfish 6, Hogfish 8, Grouper 12, Barracuda 15 · pufferfish, jellyfish, turtle, manatee, junk |
| Kelp & Wreck | 130–250 | swaying kelp, a sunken ship | Grouper, Barracuda, Octopus 18, Tarpon 20, Moray Eel 24, Swordfish 32 (from 190 m) · pufferfish, jellyfish, boot |
| Deep Dark | 250–400 | near-black, marine snow, dark rocks with glowing dots, tube worms, the sea bed | Lanternfish 26, Viperfish 32, Blobfish 38, Anglerfish 48 (from 300 m), **Giant Squid 150** (legendary, from 345 m) · glowing jellyfish |

The album holds the 16 catchable fish. Glowing species glow in the deep. Every creature has a chunky outline and a silly face (buck teeth, pouts, tongues, fangs, a droopy blobfish). Hooked fish look happy, and go dizzy-eyed when zapped. Stingers grin when they zap, and a pufferfish puffs up.

## Upgrades and money

Three big picture cards on the shop screen. Each shows a price in sand dollars and level pips. A card is bright with a pulsing yellow rim when you can afford it, and dim otherwise. Buying one bounces the card and bursts stars from it; tapping one you can't afford makes it shake.

| Upgrade | Levels | Price of each next level |
|---|---|---|
| Longer line (depth) | 35, 55, 80, 110, 145, 185, 230, 280, 335, 400 m | 10, 20, 35, 55, 85, 125, 170, 230, 300 |
| Bigger bucket | 3, 4, 5, 6, 7, 8, 10, 12 | 12, 25, 45, 70, 100, 140, 190 |
| Lucky lure (a glow around the hook on the way up that reaches fish further away; junk and stingers are not attracted) | +0, 1.5, 3, 4.5, 6, 8 units | 18, 35, 60, 100, 150 |

The treasure chest pays 400 sand dollars. The first time you hook it, a "TREASURE!" celebration plays: confetti, the chest opening with gold and sparkles, the kid hopping in the boat, and the payout. After that the game carries on: completing the album, chasing the squid, and bigger hauls.

**Economy (simulated in tests):** a careful bot (dodge on the way down, chase the best reachable fish on the way up, buy the cheapest affordable upgrade) reaches the chest in about 23–26 trips. A sloppier bot (slow reactions, a quarter of its moves random) takes about 33–37 trips. Early on there is a new upgrade every 1–3 trips. A completely random steerer still earns at least 2 every trip and keeps buying upgrades.

## Screens

- **Shop (menu):** the sunset with the boat bobbing and fish swimming past, the "BIG CATCH" title, a sand-dollar counter (top right) that rolls up after buying, the three upgrade cards, an album button (book icon + "9 / 16") (with a chest icon once the treasure is found), and a big "Go fishing!" button. A home button goes back to the launcher.
- **Trip HUD:** home button; the bucket's slots across the top, filling with little pictures of the catch (two rows on a phone when it holds many). On the right, a depth meter shows the zone colours, a yellow tick at the line's reach, a pink flag at the best depth so far, the hook's position, and a chest at the bottom. Call-outs ("Dodge!", "Bonk!", "All the way!", "TREASURE!", "Catch!") appear near the bottom of the screen.
- **Album:** a 4 × 4 grid of cards coloured by zone. A caught fish shows in colour with a count ("x3"); an uncaught one is a dark silhouette with "?". The legendary card has a gold rim and star, and the chest trophy sits below the grid.
- **Launcher tile:** the sunset, the boat with its line down, fish swimming at three depths, and a grouper lunging at the hook.

## Saved

`localStorage` key `big-catch-progress`: `{ coins, line, bucket, lure, album: { speciesId: count }, best, trips, chest, earned }`, sanitised on load (unknown species dropped, levels clamped, bad values zeroed). Coins are credited as soon as the haul starts, so leaving during the count-up loses nothing. Leaving mid-trip earns nothing.

## Code

Under `src/games/big-catch/`:

| File | Purpose |
|---|---|
| `tuning.js` | Every number to tune by feel, named and documented: speeds, steering, hit scales, zap and bonk, line/bucket/lure levels, prices, depth bonus, chest value, haul timing, zone table, first-trip settings, species table. |
| `sim.js` | Pure, seeded (mulberry32 in the state). Trip generation, the phase machine, collisions, zaps, payout, haul plan, progress (`newProgress`, `sanitize`, `priceOf`, `buy`, `settle`, `tripOptions`). |
| `bot.js` | Pure. `predictX` (where a creature will be), `dodgeTarget` (on the way down, picks the x that stays clear longest), `catchTarget` (on the way up, chases the best reachable fish and avoids nasties), `clumsyBot`, `playTrip`, `shopCheapest`. Used by the tests and the debug autopilot. |
| `creatures.js` | Drawing only: the 22 creatures and the chest, each with moods and a silhouette mode for the album. |
| `draw.js` | Drawing only: water by depth, the sunset sky and skyline, waves, light shafts, parallax scenery (scrolls at 0.82 speed, clipped under the surface), the sea bed, boat and kid, line and hook, the hanging catch, bubbles, pops, the haul arcs, the depth meter, UI pieces, and the launcher tile (background cached per size). |
| `index.js` | Screens (shop, album, trip, win), drag-to-steer input, saved progress, debug handle. |

`?seed=N` makes trip k use seed N + k. `?debug` exposes `window.__catch` (`state()`, `screen()`, `buttons()`, `view()`, `progress()`, `setProgress(p)`, `toScreen(x, y)`, `steer(x)`, `start()`, `goto(screen)`, `depth(d)` to jump the hook during the drop, `skipHaul()`, `autopilot(on)`, `shop()`).

`test/big-catch.test.js` (37 tests, about 1 s) covers:

- each phase: cast, sink speed, the drop ending on a touch or at the line's end, turn, reel, haul, done
- steering
- the bucket cap and fast reel when full, the minimum reel time
- junk, jelly versus puffer losses, zap safety, blockers, the lure's reach, the chest
- payout maths and "new" marking, the haul count-up, settling
- purchase rules, maxing out, price monotonicity, the saved shape and sanitising
- seeded determinism, and dodged creatures still being there on the way up
- edge turning, prediction against the sim, first-trip density
- zone and species table sanity (every species in a real zone, reachable with some line, deeper zones worth more, the legend at the bottom, every album fish actually spawning)
- the economy: the careful bot reaching the chest in 12–60 trips with upgrades every 1–3 trips early on, the clumsy bot earning every trip and progressing, and a random steerer catching something on 28+ of 30 first trips

## Not built yet

Sound. Tuning by feel on a real iPad and phone (everything in `tuning.js`).
