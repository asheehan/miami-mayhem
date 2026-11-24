# Sock Puppet Show — Design

A game in Riley's Miami Mayhem: build a sock puppet, Mr-Potato-Head style, then make up a story with it or put on a show. Our own sock character, no existing toy or brand. No score, no losing, nothing to read: every button is a picture. Portrait, touch only, single finger.

## The puppet

A big sock on an arm fills the middle of the screen: a knitted tube with a stitched toe seam across the top of the head, a ribbed cuff and a bare arm going down out of the picture (a striped sleeve further down). The mouth is the crease where the fingers meet the thumb: when it talks, the top of the head lifts and the middle of the mouth opens (the corners stay together), showing a dark mouth and a tongue. It is alive even while being edited: it blinks, breathes, wobbles when poked or when a part lands, its eyes follow the finger, googly pupils swing on a little pendulum when the puppet or the part moves, and a tap on the sock makes it babble.

- **Sock:** three shapes (long, stubby, chunky), fourteen felt colours, seven patterns (plain, stripes, dots, argyle, zigzag, rainbow, heel-and-toe patches), and a pattern colour (also used on the cuff).
- **Parts:** 100 parts in eight drawers: eyes 12 (googly, big googly, button, sleepy, lashes, cyclops, star, glasses-on, heart, dizzy spiral, angry, eye on a stalk), noses 12, mouths 13 (tongue, buck teeth, fangs, moustaches, lipstick, grin, beard, goatee, bubblegum, one tooth, whiskers, zipper), hair 12, ears and horns 11, hats 13 (sunhat, cap, crown, pirate, chef, party, flamingo floatie, top hat, wizard, cowboy, beanie, propeller, viking), arms 11 (noodle arms, mittens, claws, wings, bat and fairy wings, robot arms, gloves, tentacles, boxing gloves, leaf hands) and extras 16 (bow tie, necklace, cape, scarf, sunglasses, eye patch, patch, button, stickers, medal, freckles, cheeks, plaster, necktie). Some are tinted felt and can be recoloured.
- **Layers:** parts are drawn behind the sock (wings, capes, long hair, floppy ears start there), then the sock, then parts in front. Parts above the mouth (and teeth and moustaches hanging from it) move with the top of the head.

## The workshop

- **Top bar:** back (to the puppet's page), undo, surprise me (dice), name (a label).
- **Bottom:** ten tabs (sock, paint, then the eight drawers, each shown by one of its parts) over a drawer of big picture tiles: 8 a row on the iPad, 6 on a phone (tabs in two rows there). The sock tab has the shapes and patterns drawn as little socks in the current colours; the paint tab has the sock colours and the (striped) pattern colours.
- **Placing:** drag a tile onto the puppet. The part floats a little above the finger so it can be seen, at the size it will land. A tap on a tile puts it at its usual spot for that sock (hats and hair grow to fit a wider head; a second eye or ear goes on the other side). At most 40 parts.
- **Moving and sizing:** drag a part to move it. A tapped part is selected: a dashed outline and one round yellow handle at its top corner (or bottom corner when the top is off the screen). Dragging the handle scales and turns the part about its middle (0.4×–3×). The selected part also gets buttons down the right: behind/in front, recolour (for tinted parts) and bin. Dragging any part onto the bin (bottom left, its lid opens) removes it.
- **Snapping:** a pair part (eyes, ears, arms, cheeks…) dropped within 34 units of the mirror image of another part from its drawer lands exactly there, and takes the same size and a mirrored tilt if it is the same part and close. Single parts within 14 units of the middle centre; nearly-level parts level off. Nothing snaps from far away, so three eyes on the chin stay put.
- **Hit testing:** the selected part's handle first, then parts in front (top-most first), then the sock, then parts behind. Every part has at least a 70-unit box.
- **Undo:** 60 steps; a whole drag is one step; adding, removing, layer, colour, sock changes, surprise me and the name are all undoable.
- **Surprise me** builds a random silly puppet (shape, colours, pattern; usually two matching eyes, sometimes a cyclops or a spare eye on the chin; nose, mouth thing, hair and/or hat or ears, arms, extras; now and then one part somewhere silly). The name is kept.
- **Name:** a big name banner, twelve funny name tiles (Sir Socks-a-lot, Noodle, Captain Toes, Professor Fluff, Wiggles, Lady Lint, Mr. Stinky, Pickle, Toe-bert, Banana Pants, Sockrates, Fuzzy McFuzz), spoken aloud when tapped if speech is available (otherwise the puppet babbles), and letter tiles A–Z with a rub-out, so a name can be spelled (letters become "Riley"). Never required; 16 letters at most.

## The shelf and each puppet's page

- **Shelf** (the menu): nine wooden cubbies, each with its puppet bobbing and blinking and its name on a label; an empty one shows a sock and a plus and makes a new plain sock in the workshop. Everything saves on its own.
- **A puppet's page:** the puppet big (tap it to make it talk) with three huge buttons: make (brush), story (book), stage (theatre). A bin top right asks first with the puppet's picture, a red cross and a green tick; deleting also removes its stories and show.

## Story maker

- **Beats:** place, friend, thing found, problem, how it's fixed, ending. Each beat deals 4 big picture cards from a pool of 10 (dice re-deals). Friends include up to two other puppets from the shelf. A row of six squares at the top fills with the picked pictures; the puppet cheers in the corner.
- **Places:** beach, pirate ship, outer space, jungle, candy land, under the sea, the food truck, a castle, a snowy mountain, dinosaur valley. **Friends:** crab, robot, grumpy gator, dragon, flamingo, octopus, alien, penguin, monkey, manatee (each drawn in eight poses). **Things:** treasure chest, magic wand, giant egg, balloons, treasure map, rubber duck, guitar, enormous pizza, kite, golden key. **Problems:** raining tacos, the friend loses their hat, a giant wave, hiccups, a big wind, a stinky smell, sticky mud, lights out, bouncy ground, the thing runs away. **Fixes:** a silly song, a wiggle dance, using the thing, a hug, tickles, magic words, a whale helps, a machine, flapping like a fan, a giant bubble. **Endings:** party, nap, fly away in a balloon, ice cream, parade, fireworks, campfire, sail home, sock disco, picnic.
- **The book:** a title page and one page per beat. Each page is the place drawn in code with the puppet exactly as designed (posed: waving, laughing, surprised, worried, cheering, dancing, thinking, sleeping), the friend, the thing and an animated effect (tacos falling, wave, stink lines, music notes, hearts, whale, balloon basket, fireworks…). The fly-away and sail-home endings move to the sky and the sea. Under the picture, one or two short sentences in big text, always using the puppet's name. The last page says The End and offers read again and back to the shelf.
- **Words:** sentence templates are functions of the picks; each beat has several openings and each place, friend, thing, problem, fix and ending its own details, so the same picks read differently with a different seed (title 3 ways, place 24, friend 12, thing 18, problem 3 per problem, fix 16 per fix and problem, ending 2 per ending). Articles are chosen by sound ("an octopus", "an enormous pizza"), possessives handle names ending in s ("Captain Toes'"), sentences are capitalised, and a page that doesn't name the puppet gets a short tag ("Riley gasped."). A puppet friend is called by name; two puppets with the same name become "Noodle" and "Noodle Two". Every page is 170 characters at most.
- **Turning pages:** big arrows or a sideways swipe; tapping the picture makes the puppet chatter.
- **Read aloud:** where `speechSynthesis` exists, a speaker button reads the page (an English voice, preferring Samantha/Karen and the like; rate 0.9, pitch 1.2) and an auto-read toggle (on by default, remembered) reads each page as it turns. Speech is cancelled on every page change and on leaving. The buttons are hidden where there is no speech, and every call is wrapped so it can never break the game.
- **Bookshelf:** each puppet's finished stories as covers (its place, the puppet and the friend), newest first, with a new-story book. Only the picks and the seed are kept; at most 24 books, oldest dropped first.

## Puppet stage

A little theatre: red curtains that open on arrival, a scalloped valance, a wooden front ledge that hides the arm, and a backdrop (any of the ten places; the picture button cycles them). Two props to start, more with the plus (treasure chest, rubber duck, balloons, pizza, guitar, giant egg, palm, rock; at most four). The sock button adds another puppet from the shelf on the other side (or takes it away). Drag a puppet to move it: it leans into the movement, squashes and springs back, and googly eyes swing. Tap a puppet to make it talk: its mouth flaps and it babbles (synthesised blips through a mouth filter, pitched by sock shape; WebAudio, only after a touch). Props drag too.

**Shows:** the red button records up to 30 seconds of the fingers (puppet and prop positions while dragged, 20 per second at most, and taps) — never sound, no microphone. A ring runs down round the stop button. The play button closes the curtains, opens them on the replay (positions glide between samples; taps make the puppets talk), and closes and opens them at the end. The last show per puppet is kept if it fits 9,000 characters (a busy 30 s is about 5 KB), the newest six puppets' shows at most; otherwise it lives in memory until the game is closed.

## Saved

`localStorage` key `sock-puppet-progress`, saved 0.6 s after a change and on every screen change:

```
{ v: 1, shelf: [puppet | 0, ×9], books: [book, …], shows: { [uid]: show } }
puppet: { u: uid, n: name, k: [shape, colour, pattern, patternColour], p: [[id, x, y, scale×100, turn°, behind, colour], …] }
book:   { id, u: hero uid, k: [place, friend, thing, problem, fix, ending], s: seed, t: time, f?: friend puppet's name }
show:   { d: length (1/100 s), a: [[x, y] start of each puppet and prop], e: [[t, who, x, y] | [t, who] tap], s: { backdrop, pal, props }, t }
```

A puppet is about 30 characters a part, under 1.8 KB at 40 parts; a full shelf of nine puppets with 24 books and a few shows is typically 10–40 KB. Everything is validated on load: junk entries are dropped, numbers are clamped, duplicate puppets are ignored, books with unknown picks are dropped, and parts with ids this version doesn't know are kept untouched (saved again as they were) but neither drawn nor touchable. If storage throws, it retries without shows, then with only the 8 newest books, then without books, then gives up quietly. The auto-read choice is kept under `sock-puppet-autoread`.

## Drawing and performance

Everything is drawn in code with chunky ink outlines in a felt-craft style. The sock body (felt, pattern, knit texture, toe seam, shading, cuff) is drawn once per look and size into an offscreen canvas; each frame draws it, then the lifted top of the head through a clip along the mouth, then the parts as vector pictures (a few dozen path operations each). Story backdrops are cached per size with a light animated layer on top. Drawer tiles and shelf thumbnails reuse the cached body images.

## Code

Under `src/games/sock-puppet/`:

| File | Purpose |
|---|---|
| `parts.js` | The parts library: drawers, boxes, default spots, pairs, layers, tints (pure data). |
| `puppet.js` | Pure model: sock shapes and outline, add / move / scale / turn / remove / layer / recolour, mirror snapping, undo, hit testing and the handle, jaws, default spots, surprise me, names, the saved form and its validation. |
| `world.js`, `story.js` | The story world's ids, and the pure story maker: dealing cards, sentence templates, articles and possessives, the storybook with scenes and poses per page, the bookshelf. |
| `show.js` | Pure stage shows: recording, the cap, replay positions and taps, validation, the lean-and-squash body. |
| `save.js` | Pure shelf and saving with the size fallbacks. |
| `speech.js`, `sound.js` | Safe read-aloud wrapper; synthesised babble and sound effects. |
| `art.js`, `ui.js` | Palette, felt colours, shape helpers; picture buttons and glyphs. |
| `draw-puppet.js`, `parts-face.js`, `parts-wear.js`, `live.js` | The sock and its mouth, the part pictures, and the alive-ness (blinks, talking, wobble, googly pendulums, story poses). |
| `scenes.js`, `friends.js` | Places, effects and card pictures; stock friends in eight poses, things and props. |
| `workshop.js`, `storybook.js`, `stage.js`, `index.js` | The screens, input, the shelf and puppet page, saving, the debug handle and the launcher tile (a striped sock popping up between curtains and chattering). |

`?puppet=<slot>&to=<card|workshop|story|stage>` opens a puppet directly. `?debug` exposes `window.__puppet` (`screen()`, `progress()`, `shelf()`, `puppet()`, `parts()`, `buttons()`, `open(slot, screen)`, `newPuppet(slot)`, `shelfRandom(slot, seed)`, `go(screen)`, `save()`, `savedChars()`, and `workshop`, `story`, `stage` handles with layout, screen positions and shortcuts such as `story.open(picks, seed)` and `story.page(n)`).

`test/sock-puppet.test.js` covers the parts library, the sock outline, the puppet model (add, move, scale, turn, remove, layers, recolour, sock, undo, limits), mirror snapping, hit testing (top-most, layers, turned and scaled parts, tiny parts, the handle), jaws, default spots, random puppets, names, saving (round trip, size, unknown parts, junk), the shelf and storage fallbacks, words, dealing, every one of the million combinations of picks (no unfilled placeholders, no a/an mistakes, the name on every page, under the length limit, real scenes and poses), every sentence variant with stock and puppet friends, the bookshelf cap, show recording and replay, and the speech wrapper with and without `speechSynthesis`.

## Not built yet

Two-finger pinch (input is one finger by design). Saving a story as a picture. Recording sound. Tuning by feel on a real iPad (handle size, snap distance, speech voice and rate on iPadOS).
