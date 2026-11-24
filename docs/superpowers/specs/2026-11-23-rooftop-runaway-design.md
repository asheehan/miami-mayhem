# Rooftop Runaway — Design

The thirteenth game in Riley's Miami Mayhem: a 3D chase through pastel Miami. Riley leads a crowd of little people away from cartoon robbers (striped shirts, eye masks, beanies, swag sacks), picks up friends on the way, climbs buildings to shake the robbers off and runs for the getaway.

## Rules

- **The map** is a flat street block W wide and L long (16–28 by 58–104 units, about a person's height each). The crowd starts at the south end; the getaway is at the north end. Buildings are boxes 2.8–6 tall standing on it, and each roof is its own walkable area.
- **Steering** is a floating joystick: put a finger down anywhere and drag; the leader runs that way (screen up is always north, because the camera never turns). Full speed is reached a short way from where the finger went down (about 45% of the ring), so small fingers don't need to drag far, and the ring follows a finger that runs past its edge so turning round is quick. Lifting the finger stops the leader. There are no other buttons while playing, only the home button. I picked the joystick over "run toward the finger" because a finger on the crowd hides the crowd, and "toward the finger" is ambiguous once the crowd is up on a roof (which point under the finger is meant?).
- **The crowd** follows the leader's trail, so everyone takes the same ladders and slides the leader did, one after another, and catches up (4.6 units/s against the leader's 3.6) to huddle round the leader. The leader wears a red cap and has a yellow ring.
- **Friends** stand waving inside a white ring, on the street or on roofs. Any crowd member coming within 1.7 on the same level picks them up (+1).
- **Climbing is automatic.** Running into a ladder, fire escape, stack of crates or a climbable palm takes the crowd up (about 1 s); running off a roof edge at one of them climbs back down. Trampolines under awnings (BOING!) go up only; slides (WHEE!) and zip lines (ZOOM!) go down only. Running off a roof edge where another roof touches or nearly touches (a gap of up to 2.2, marked with yellow arrows) hops across (HOP!). Walking along a wall past a ladder doesn't climb it: you have to push into it. A ladder takes one person every 0.2 s, so the crowd visibly streams up it; whoever is still waiting at the bottom is a straggler.
- **Robbers** can't climb. They chase the nearest crowd member on the street (round buildings, by path finding on a 0.5-unit grid), at 1.8 units/s on level 1 rising to 3.1 on level 9. Some chase from the start; others wait at a post until someone comes within sight (8–9 units). When everyone is up on the roofs they stop, look round with a "?", and wander back to their posts.
- **Bonk:** a robber touching someone on the street (or low on a ladder) pops them into the sack with a puff, then carries them off, slowly, to the nearest open manhole, where that friend is lost. A robber carries one at a time. **Rescue:** the leader running into a robber with a full sack sets the friend free (YAY!) and leaves the robber dizzy for 2.6 s. The leader has to be moving, so a crowd standing still doesn't rescue anyone.
- **Losing the leader** isn't the end: whoever is furthest along the trail takes the cap. The level is lost only when nobody is left in the crowd: "Oh no!" with **Try again** and **Menu**.
- **The getaway** is an ice cream truck, a police station or a ferry at the end of a dock, with a bobbing green arrow over a checked pad (and a green arrow at the screen edge when it is off screen). The leader stepping onto the pad wins, and everyone still in the crowd counts as saved, even stragglers still on a ladder. They run aboard; after 1.6 s the win screen shows the stars and a row of the people saved, with **Next** and **Again**.
- **Stars:** one for getting anyone out; two for saving 60% of the level's people (starting crowd plus friends); three for 85%. The HUD shows the crowd count ("9/26") with three small stars that light up as the count passes each target. No level starts on two stars, so stars come from collecting friends and not losing them.
- **Hints:** "RUN!" and a ghost finger until the player first steers. Teaching links (the first ladder, trampoline, palm, fire escape, crates and zip line) have a yellow bobbing arrow until used, and a big word (CLIMB!, BOING!, ZOOM!) while the leader is near.
- **Saved progress:** `rooftop-runaway-progress` in localStorage, `{ stars: [9 numbers] }`. A level is open if it is level 1, has been finished, or follows one that has.
- **Testing:** `?level=N` starts level N. `?debug` adds `window.__rooftop` with `run()`, `screen()`, `buttons()`, `progress()`, `start(n)`, `goto(screen)`, `input(x, y)`, `autopilot('all' | 'goal' | false)`, `fastForward(s)`, `project(x, y, h)`, `leaderScreen()`, `overview(on)` and `warp(x, y, layer)`.

## Levels

| # | Name | New thing | People | Robbers | Getaway |
|---|---|---|---|---|---|
| 1 | Run! | running and friends | 12 | 1 slow chaser | ice cream truck |
| 2 | Up the ladder | ladder (with hint) and a slide; four friends on the roof | 16 | 3 | police |
| 3 | Roof hop | three roofs in a row with gaps | 17 | 4 | ferry |
| 4 | Boing! | trampoline; a wall of buildings across the street | 19 | 4 | ice cream truck |
| 5 | Palm beach | climbable palms, beach on the east | 19 | 5 | ferry |
| 6 | Zip line! | fire escape up a tall tower, zip line over a plaza | 21 | 6 | police |
| 7 | Fire escape | a chain of four roofs, robbers waiting ahead | 25 | 7 | ice cream truck |
| 8 | Neon nights | crate stairs, roofs stepping up, a long zip line | 28 | 9 | ferry |
| 9 | Big getaway | everything | 30 | 10 | police |

The bot (collecting every friend, then the getaway) takes about 17 s on level 1 and 100 s on level 9; a young player steering less directly takes roughly twice that.

## Code

Under `src/games/rooftop-runaway/`:

| File | Purpose |
|---|---|
| `levels.js` | The nine levels as plain data. |
| `world.js` | Pure. Builds a level: links (ladders, slides, hops found automatically), the street grid, collision, line of sight, path-finding fields, and `linkPos`, the path of each climb, hop, slide and zip that the view draws along. |
| `sim.js` | Pure. A run: the leader and the trail, followers, separation, joining, robbers (chase, wait, confused, carry, dizzy), bonks, rescues, leader hand-over, win, lose and stars. |
| `bot.js` | Pure. A nav graph over the street and every roof joined by links, reachability checks, and a bot that steers the leader. Used by the tests and the `?debug` autopilot. |
| `view3d.js` | three.js scene and camera; reads the run, no rules. Loaded only when a level starts. The city, props and neon are merged into a few static meshes; people, robbers, shadows and particles are instanced. Buildings between the camera and the leader are drawn with a screen-door dither so the crowd always shows. Pixel ratio is capped at 2, there are no real shadows (blob shadows only). |
| `draw2d.js` | 2D drawing: the launcher tile, the menu picture, buttons, stars, the level picker's pictures. |
| `index.js` | Menu, level picker, HUD, the joystick, win and lose screens, saved progress, debug hook. |

`world.js`, `sim.js` and `bot.js` are unit tested in `test/rooftop-runaway.test.js`: joining, following, climbing one at a time, hops and slides, robbers catching, carrying off and being bumped, robbers unable to follow up a ladder, the leader handing over, winning, losing, stars, determinism, every level's layout and reachability, the bot finishing every level with at least one star in both modes, and a player who does nothing always losing.

## Not built yet

Sound.
