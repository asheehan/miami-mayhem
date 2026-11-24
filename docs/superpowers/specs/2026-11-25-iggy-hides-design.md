# Where's Iggy? — Design

A game in Riley's Miami Mayhem: a seek-and-find. Each scene is one big, busy cartoon Miami picture, larger than the screen, that Riley pans by dragging. Hidden in it are things to find, shown as pictures in a tray along the bottom, always including Iggy the iguana. Tap a thing to find it. Calm: no timer, no penalties, no locks. Portrait, touch only, no reading needed.

## Iggy

Our own character: a small bright-green iguana with a big round eye, a raised brow and a cheeky one-tooth grin, a yellow-green spiky crest, a yellow dewlap and a striped tail. He always wears a pink-and-white striped swim ring round his middle and orange sunglasses pushed up on his head, so he reads at a glance even when only his head shows. Poses: `stand` (waving), `peek` (head and hands over an edge), `lie` (sunbathing), `float` (in the water with his ring) and `cling` (hugging a trunk or pole). Every scene has green lookalikes to fool the eye: a croc pool float, a lizard kite, a green parrot, cacti, gators, plush toys and so on.

## Rules

- **Scenes:** about 1800 × 1300 world units. The scale is set so a scene is about 1.3 view-heights tall (never below 0.72 px per unit), which on the iPad (820 × 1180) makes it about 2.4 screens wide by 1.3 tall, and on a phone (390 × 844) about 3.3 screens wide.
- **Panning:** a press on the scene that wanders more than 14 px is a pan: the scene follows the finger, gives up to 70 px past an edge with growing resistance, coasts on after a flick (friction 4.2/s) and springs back from past an edge. A press that stays within 14 px is a tap, aimed where the finger first went down. Soft arrows pulse on any edge with more scene beyond it. A minimap in the top-right shows the whole scene and the view; tapping it glides there.
- **Rounds:** every play picks, from a seed, one of Iggy's hiding places (5–8 per scene) and 6–8 other things from the scene's pool (16–19 per scene). Some things come in twos or threes ("find 3 crabs"), shown with a count badge. A picked thing uses only its picked spots; a thing not picked this round sits in its usual spot as plain scenery. Picks never sit where one would make another hard to tap. Play again reshuffles.
- **Fair hiding:** hidden things peek out from behind covers (castle walls, a cooler, water, a hut window) but always show enough to recognise. Every hit box is at least 68 world units, which is at least 49 px on the phone and 69 px on the iPad, and usually larger than the thing. No two hiding places in a scene clash (one covering more than 35% of the other or covering its centre), and none sits under an animated actor.
- **Tapping:** the top-most unfound thing whose hit box holds the tap is found: it pops, sparkles and flies to its tray slot, which bounces, and a finished slot turns green with a tick. A miss makes a tiny white puff, nothing more.
- **Hints:** the big magnifying-glass button at the right of the tray glides the view to the unfound thing nearest the middle of the screen and shows a dashed yellow ring shrinking onto its area (offset a little, so it shows where to look rather than the exact spot), twice. It then recharges over 15 s, shown as a green ring filling round the button. After 30 s with nothing found, the tray picture of the nearest unfound thing wiggles and a charged hint button glows and pulses.
- **Stars:** 3 with no hints, 2 with one or two, 1 with more. Finishing always earns at least one.
- **Finish:** 0.9 s after the last find the scene dims, confetti falls, "Hooray!" (or "WOW!" for 3 stars) and the stars pop in, everything found dances in a ring round a big dancing Iggy, and the scene's sticker spins in (with a NEW! tag the first time). After 2.4 s: Next, Again and Scenes.
- **Saved:** best stars per scene in `localStorage` under `iggy-hides-progress` as `{ stars: { [sceneId]: 0–3 } }`. A scene with any stars has its sticker.

## Screens

- **Menu:** "Where's Iggy?" over a beach, Iggy popping up from behind a dune while a magnifying glass searches. Play (the first scene without stars), Scenes, Stickers, and the home button back to the launcher.
- **Scenes:** a card per scene with a thumbnail of the whole picture (rendered one per frame, then cached), its best stars and its sticker once earned. All open from the start.
- **Stickers:** the album: ten round scalloped stickers, earned ones in colour (tap to wiggle), the rest as "?" blanks.
- **Play:** the scene above, the tray below, a back button (to Scenes) top-left and the minimap top-right.

## Scenes

| # | Scene | Highlights |
|---|---|---|
| 1 | South Beach | lifeguard hut, sandcastle crew, volleyball, jet ski, banana boat, a gull stealing fries, a dog chasing a ball, a man buried in sand, a lizard kite and a croc float |
| 2 | Pool Party | hotel pool with floats, diving board, waterslide, DJ, cabanas |
| 3 | Ocean Drive Parade | art-deco hotels, balconies, marching band, flamingo float, conga line |
| 4 | The Marina | docks, boats, pelicans on pilings, a manatee, a bait shop |
| 5 | Farmers Market | stalls of fruit, flowers and bread, a juggler, a sausage-stealing dog |
| 6 | Jungle Zoo | monkeys, parrots, a giraffe, a tiger, a sloth, a little train |
| 7 | The Aquarium | big tanks, sharks, rays, turtles, a diver cleaning the glass, the gift shop |
| 8 | Mini Golf | windmill, flamingo, pirate ship, volcano, a toy dinosaur, the pond |
| 9 | Night Carnival | turning ferris wheel, carousel, game booths, lights, a plush dragon |
| 10 | Airboat Tour | Everglades airboats, gators, herons, turtles on a log, mosquitoes |

## Drawing and performance

Everything is drawn in code with chunky ink-outlined shapes in the launcher's palette; no images. A scene's still picture, the things not hidden this round and the covers of spots not in play are rendered once per round (and on resize) into offscreen canvases at the screen's scale × device pixel ratio (capped at 2), split into tiles that stay under 4000 px a side and 15M pixels, with a fallback to a smaller scale if a canvas can't be made. Each frame blits the tiles and draws only the hidden things still to find, their covers, the animated actors whose boxes are on screen (waving people, bobbing boats, a dog chasing a ball, blinking eyes), then effects, the tray and buttons.

## Code

Under `src/games/iggy-hides/`:

| File | Purpose |
|---|---|
| `logic.js` | Pure, no DOM. Tuning constants, layout and scale, camera bounds, drag with soft edges, inertia, tap-or-pan gestures, seeded round picking, tap resolution, finding and completion, hints and idle nudges, stars, saved progress (storage passed in). |
| `scenes/*.js` | The ten scenes: a static `back(ctx, r)`, `actors`, Iggy's spots, the item pool with spots and covers, and a `sticker`. `scenes/index.js` resolves every spot's hit box. |
| `art/` | The prop and character library: `kit.js` (shapes, palms, water, awnings), `iggy.js`, `people.js` (people with skins, hair, outfits, hats, poses and held things from `held.js`), `animals.js`, `props.js` (the findable things with their boxes), `scenery.js` (umbrellas, boats, stalls, floats) and `crowd.js` (scatter crowds clear of hiding spots, draw back to front). |
| `draw.js` | Rendering: the tiled still layer, the live layer, thumbnails, the debug overview, buttons, tray icons, stickers and the launcher tile (Iggy popping up behind a sandcastle as a magnifying glass finds him). |
| `index.js` | Menu, scenes, stickers, play, finish, input and effects. |

`?level=N` opens scene N; `&seed=S` fixes the round. `?debug` exposes `window.__iggy` (`scenes()`, `screen()`, `buttons()`, `progress()`, `layout()`, `cam()`, `round()`, `finish()`, `open(i, seed)`, `goto(screen)`, `targets()` with screen positions, `lookAt(x, y)`, `setCam(x, y)`, `find(i)`, `findAll()`, `idle(sec)`, `charge()`, `hint()`, `fastForward(sec)`, `overview(i, width, boxes, seed)` for a whole-scene picture with optional hit boxes, `layerInfo()`).

`test/iggy-hides.test.js` covers every scene's spots (inside the scene and clear of the top buttons, at least 44 px on both screens, no clashes, clear of actors, enough Iggy spots and items), every scene drawing plenty with no DOM, layout and tray fit, camera clamping, soft edges, spring-back and inertia, tap-or-pan, seeded rounds (deterministic, Iggy first, 6–8 others, different seeds differ), top-most tap resolution and misses, counts and completion, hints (nearest unfound, recharge, never a found thing), idle nudges, stars, and saved progress including bad data.

## Not built yet

Sound. Tuning by feel on a real iPad (tap slop, friction, hint timing, how hard each hiding place is). Pinch zoom (the shell only reports one finger).
