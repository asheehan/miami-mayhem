# Mural Maker — Design

A game in Riley's Miami Mayhem: paint murals on the warehouse walls of a Miami art-district street. The one game with no score and no losing: no timer, no wrong answers, no locks. Portrait, touch only, no reading.

## Rules

- **The street:** the first screen is four rows of brightly painted warehouses, one wall each: twelve murals to colour, then four blank free walls. Every wall shows Riley's actual painting as a thumbnail (blank murals show their line art; blank free walls a faint spray can). A finished mural wears a gold star sticker. Tap a wall to paint it; the home button goes back to the launcher.
- **Painting screen:** the wall as big as fits (3:4), tools down the left on a tablet or along the top on a phone (whichever gives the bigger wall), the palette along the bottom in two or three rows of big paint blobs. Nothing needs reading.
- **Tools:** street (back), bucket (fill), spray can, brush size (tap to cycle small / medium / big; also picks the spray can), undo, clear. The free wall adds a drip toggle and a row of stamps above the palette.
- **Palette:** twelve colours (red, orange, yellow, green, teal, sky, blue, purple, pink, brown, white, black) plus rainbow, glitter, stripes and dots. Stripes and dots use the last plain colour picked (white dots on white become black).
- **Fill:** tap a region and it sprays in from the finger over 0.4 s, with speckles at the edge. Regions are vector paths, so fills stay crisp at any size; overlapping regions resolve to the top-most. Rainbow is a diagonal gradient, glitter twinkles, stripes are diagonal, dots are offset rows.
- **Spray:** drag anywhere on the wall: a solid core with seeded speckles at the edge, in three sizes. Rainbow changes hue along the stroke, stripes alternate, dots and glitter put dots and sparkles down the middle. Spray goes over the fills; the line art is always drawn on top, so pictures stay tidy.
- **Free wall:** a cream brick wall (the bucket paints the whole wall). Drips: with the toggle on, paint runs down from a finished stroke in a few seeded drips that grow and end in a drop. Stamps (star, heart, smiley, lightning bolt, palm, flamingo, crab, flower) pop on where tapped, in the chosen paint, slightly tilted; press and drag to size one (40–560 wall units). Brick joints show faintly through the paint.
- **Undo** steps back one fill, one stroke (a whole drag), one stamp or one clear; 80 steps kept. **Clear** asks first: the wall's picture with a bin, a red cross and a green tick. Undo brings a cleared wall back.
- **Finishing a mural:** when every region has colour, confetti falls, a big gold star flies onto the wall's corner, and the mural comes alive for about four seconds (below). Spray paint on a moving part moves with it. A finished mural says hello the same way (without confetti) whenever it is opened again. The sticker stays even if the wall is cleared. Free walls are never "finished".

## Murals

Each is a list of regions and line-art details in `murals/`, drawn on a 600 × 800 wall in a chunky ink-outlined style. Every mural has a background region, so every tap colours something.

| # | Mural | Regions | Comes alive |
|---|---|---|---|
| 1 | Flamingo on one leg in a lagoon | 12 | sways and winks |
| 2 | Gator in sunglasses under a palm | 12 | shades lift to show his eyes, tail wags |
| 3 | Parrot on a branch, jungle leaves, hibiscus | 12 | flaps its wing, bobs its head |
| 4 | Palm sunset with a sailboat | 12 | sun dips into the sea and rises, palm sways, boat rocks |
| 5 | Rocket, ringed planet, moon | 13 | rumbles, blasts off out of the top, lands back on its flame, smoke |
| 6 | Octopus with seaweed, fish, starfish | 13 | bobs and squashes, blows bubbles, fish swims past |
| 7 | Ice-cream truck with a giant cone | 16 | bounces along, wheels spin, music notes |
| 8 | Dolphin leaping out of the waves | 11 | jumps and flicks, splashes |
| 9 | Robot waving, cogs | 16 | waves, tilts its head, cogs turn, antenna glows |
| 10 | Dinosaur on a surfboard on a wave | 14 | rides up and down, spray |
| 11 | Striped lighthouse on the rocks at night | 13 | beams sweep, lamp glows |
| 12 | RILEY in bubble letters under a rainbow | 15 | letters bounce in a wave, heart beats, stars spin |

## Saved walls

`localStorage` key `mural-maker-progress`, saved 0.6 s after any change, on leaving a wall and on exit:

```
{ v: 1, walls: { [id]: { f: [paint | 0, ...], m: [mark, ...], d: 1 } } }
```

A paint is a short string: `'0'`–`'11'` a colour, `'r'` rainbow, `'g'` glitter, `'s<n>'` / `'d<n>'` stripes / dots of colour n. A stroke is `{ t: 's', p, w, s, r, q }` (size, seed, drips, points as whole wall units with each point stored as the step from the one before); a stamp is `{ t: 'm', k, p, x, y, z, a }`. Blank, unfinished walls are left out.

Keeping it small: a stroke point is only added once the finger moves 3 wall units; a finished stroke is simplified (Ramer–Douglas–Peucker, 0.75 units); a stroke longer than 240 points carries on as a new stroke (undone together). A wiggly 120-point stroke saves as about 60 points, roughly 350 characters; a fully coloured mural with 50 long strokes is about 19 KB. Each wall is capped at 48,000 characters: over that, strokes are simplified harder (1.5, 3, 6, 10 units) and then the oldest marks (under everything newer) are left out of the save. If storage throws (full or unavailable) it retries at a quarter and a sixteenth of the budget, then gives up quietly; play carries on in memory.

## Code

Under `src/games/mural-maker/`:

| File | Purpose |
|---|---|
| `murals/kit.js` | Pure line-art kit: SVG-style path strings, ellipses, rounded polygons, smooth blobs and splines, thick bands (necks, tentacles, trunks), fronds, clouds, gears, crescents, convex clipping, transforms, flattening and winding-number hit tests. |
| `murals/*.js`, `murals/index.js` | The twelve murals (regions, details, celebration motions) and the four free walls. |
| `stamps.js` | The stamps, built with the same kit in a 100 × 100 box. |
| `mural.js` | Pure rules: paints, compiling murals into hit-testable regions, fill, strokes, drips, stamps, undo, clear, completion, simplification, save / load with the size cap. |
| `draw.js` | Drawing only. Each wall is three offscreen canvases at device resolution: fills (redrawn only when a region changes), paint (strokes and stamps drawn in incrementally as the finger moves, never re-drawn per frame) and lines (each region's outline with anything underneath rubbed out, drawn once per size). Resizing rebuilds all three from the saved data. Also patterns, the wipe-in, twinkles, the wink, celebration effects, icons, swatches and thumbnails. |
| `index.js` | The street, the painting screen, layout, input, the celebration, saving, the launcher tile (the flamingo colouring itself in region by region). |

`?mural=<id>` opens a wall directly. `?debug` exposes `window.__mural` (`walls()`, `screen()`, `open(id)`, `street()`, `wall()`, `progress()`, `savedChars()`, `save()`, `view()`, `buttons()`, `tool()`, `alive()`, `regionPoint(i)` and `toScreen(x, y)` for finger targets, `fillAll()`, `muralImage(id, width)`).

`test/mural-maker.test.js` covers every mural (closed paths inside the wall, a background under every point, every region hittable at a visible point with at least 1,700 square units of room, top-most wins, holes, unions whichever way they wind, celebration parts naming real regions), the kit, paints, fill / undo / clear / history, completion (exactly once, never on a free wall, sticker kept), strokes (minimum step, splitting at the cap, simplification, whole units), drips, stamps, and saving (round trip, compact steps, the per-wall budget, a full or broken storage, junk data).

## Not built yet

Sound. Sharing or exporting a picture. More than four free walls. Tuning by feel on a real iPad (spray sizes, wipe speed, stamp drag scale).
