# Pelican Dash — Design

A game in Riley's Miami Mayhem: a side-scrolling tap-to-flap game. A chunky pelican flies along a Miami beach at sunset, through gaps between pier pilings and things hanging from the sky, catching leaping fish.

## Rules

- **World units:** y = 0 is the top of the sky and y = 100 is the sea surface. The sea takes the bottom fifth of the screen, so the world's height fills the rest whatever the screen size.
- **Start:** after Play, the pelican hovers with "Tap to fly!" until the first tap. Nothing moves until then.
- **Flying:** a tap (acted on as the finger goes down) sets the pelican's upward speed to 34 units/s; gravity is 75 units/s² and falling tops out at 42 units/s. One flap rises about 7.7 units, so one tap a second holds the pelican level.
- **Obstacles** come in pairs with a gap:
  - Below, rising from the water: twin pilings, a pier section, or a lifeguard hut on stilts.
  - Above, hanging into the sky: a stack of beach signs, a string of kites, or a tethered blimp.
  - The hit shapes match what is drawn. The pelican's own hit circle (radius 4.2) is smaller than its picture.
- **Difficulty** grows with distance over the first 900 units (about 50 seconds), then stays put:
  - scroll speed 12 → 23 units/s
  - gap 56 → 31 units
  - spacing between obstacles 52 → 40 units
  - the gap's height changes by at most 16 → 26 units from one obstacle to the next, and never by more than is easy in the clear air between them (a fall from a hover, or a climb at 20 units/s).
  - Gaps stay between y = 14 and y = 86.
- **Fish** leap from the sea in arcs timed to peak as the pelican arrives: one in about three out of four gaps, and one between obstacles about half the time. The first fish leaps straight ahead of the starting height. Flying within 9 units of a fish catches it. Fish are the score; caught fish also fill the beak pouch, which visibly bulges.
- **Hearts:** three. Hitting an obstacle, the water or the top of the sky costs one, glides the pelican back to the middle of the next gap, and gives 2 seconds of blinking safety (the water and the top bounce it during that time). No hearts left ends the game.
- **Nests:** when the pouch holds 10 fish, the next obstacle at least 150 units ahead becomes a nest on a post (harmless). Flying past it drops the pouch to the chicks: they hop, hearts and stars burst out, the pouch empties (the score keeps counting) and one lost heart comes back.
- **Game over:** "Splash!", the fish caught, the best score (or "New best!"), and Try again / Menu buttons, which respond after 1.1 seconds so a late flap cannot press one.
- **Saved:** the best score, in `pelican-dash-progress`.
- `?seed=N` fixes the world for testing; `?debug` exposes `window.__pelican` (state, screen, buttons, view, toScreen, autopilot, giveFish).

## Code

Under `src/games/pelican-dash/`:

| File | Purpose |
|---|---|
| `sim.js` | Pure. Seeded world generation, flight physics, collisions, fish, hearts and nests. |
| `draw.js` | Drawing. Reads the state; no rules. Sky, sun, skyline, palms and clouds are cached offscreen per screen size. Also the launcher tile. |
| `index.js` | Menu, HUD, game over, input, saved best score, debug handle. |

`sim.js` is unit tested in `test/pelican-dash.test.js`, including a simple bot (flap when below the next gap's middle) flying 8000 units on several seeds without losing a heart, and doing nothing losing all three hearts.

## Not built yet

Sound. A way to leave a run mid-flight other than losing (every tap is a flap).
