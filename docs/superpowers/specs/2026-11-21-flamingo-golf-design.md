# Flamingo Golf — Design

A top-down mini golf game in Riley's Miami Mayhem: nine holes on bright green felt, with bumpers, sand, water, flamingos and an alligator. Portrait, touch only.

## Rules

- **Aiming:** touch anywhere (not only on the ball), pull back like a slingshot and let go; the ball goes the opposite way. Power grows with the pull up to a cap (36% of the short screen side, between 120 and 260 px). A dotted aim line with an arrow and a ring around the ball show direction and power. A pull shorter than about 14 px cancels. No aiming while the ball moves.
- **Ball:** fixed 1/120 s steps, sub-stepped so the ball never moves more than 2 units at once (it can't pass through a wall). Rolling friction is a constant 150 units/s² plus 0.8/s of speed; a full-power shot (1000 units/s) rolls about 810 units in 2.3 s. Walls bounce at 0.8.
- **Cup:** the ball drops when its centre is over the cup (radius 16) at under 280 units/s. The cup's lip bends a passing ball toward its middle, so a fast ball lips out or skips over.
- **Bumpers:** round; bounce fully and add a 170 units/s kick, flashing when hit.
- **Sand:** much more friction (900 units/s² plus 3.5/s of speed).
- **Water:** the ball goes back to where the shot started, plus one stroke, after a "Splash!".
- **Flamingos:** a walking flamingo steps back and forth between two points; a sweeping flamingo kicks one long leg back and forth around its hip. Their legs are solid and push the ball.
- **Alligator:** lies on the cup with its mouth open for part of each cycle (about 1.8 s of 3.2 s). Open, the ball can roll between the jaws into the cup; closed, its snout covers the cup and the ball bounces off. Its head wiggles just before it snaps shut.
- **Strokes and stars:** no fail state. 3 stars at or under par, 2 for par+1 or par+2, 1 otherwise. After 10 strokes a "Skip hole" button shows (skipping gives no stars). Each hole's best stars are saved in `localStorage` under `flamingo-golf-progress` as `{ stars: [9 numbers] }`.

## Course

Holes are plain data in `holes.js`, in a 400 × 640 portrait space scaled to fit between the top bar and a bottom strip.

| # | Name | New element | Par |
|---|---|---|---|
| 1 | Straight Putt | none | 2 |
| 2 | Round the Corner | walls (L shape with an angled bank) | 3 |
| 3 | Boing Boing | bumpers | 3 |
| 4 | Sandy Beach | sand | 3 |
| 5 | Splash Bridge | water | 3 |
| 6 | Flamingo Crossing | walking flamingo | 3 |
| 7 | Gator Gulp | alligator | 3 |
| 8 | Around the Pond | walls + bumper + sand + water | 4 |
| 9 | The Big Finish | sweeping flamingo + bumpers + sand + alligator | 4 |

## Screens

- **Menu:** title, a dancing flamingo, total stars, "Play hole N" (the first hole without stars, else hole 1), "Pick a hole", and a home button back to the launcher.
- **Hole picker:** 3 × 3 tiles with each hole's stars; all holes open.
- **Play:** top bar with a home button (to the menu), hole number, par and shots, and a restart button; the hole name along the bottom. Buttons sit outside the course, and a press that starts on a button never aims.
- **Sunk:** confetti, a dancing flamingo, stars popping in, and a big "Next hole" button.
- **Course done** (after hole 9): total stars, stars per hole, "Play again" and "Home".

## Code

Under `src/games/flamingo-golf/`:

| File | Purpose |
|---|---|
| `holes.js` | Pure. The nine holes as data. |
| `physics.js` | Pure. Ball, walls, bumpers, sand, water, flamingos, gator, cup, strokes, stars. |
| `bot.js` | Pure. A steady but imperfect golfer, for tests and debug: tries a grid of shots, re-checks the best few with small aim and power errors, and takes the most reliable, judged by walking distance to the cup. |
| `render.js` | Drawing only; the static hole is cached on an offscreen canvas. Also the launcher tile. |
| `index.js` | Screens, input, saved stars. |

`?hole=N` starts on hole N. `?debug` exposes `window.__golf` (`game()`, `screen()`, `buttons()`, `view()`, `toScreen(x, y)`, `shoot(angle, power)`, `hole(n)`, `goto(screen)`).

`holes.js`, `physics.js` and `bot.js` are unit tested in `test/flamingo-golf.test.js`, including the ball staying on the felt at full power from 72 angles on every hole, and the bot finishing every hole.

## Not built yet

Sound.
