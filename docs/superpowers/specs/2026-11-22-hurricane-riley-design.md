# Hurricane Riley — Design

A game in Riley's Miami Mayhem: the player is the wind. There is no character. Swiping anywhere sends a gust that pushes every loose thing in its path. Each level is a small top-down Miami beach or bay scene with one job: sail a boat home, herd balls into a pool, or shoo gulls off a picnic. Portrait, touch only, almost no reading.

## Rules

- **Field:** a fixed 400 × 640 portrait space, scaled to fit between a top bar and a bottom strip. Swipes can start anywhere on the screen, even outside the field.
- **Gusts:** a swipe makes a cone that starts 30 units behind where the finger went down and points along the swipe. Its power is the swipe length over 220 units (capped at 1, at least 0.08), scaled by 0.85 for a slow drag up to 1.3 for a quick flick. A stronger gust reaches further (130 → 380 units). The push is strongest along the middle of the cone and near its start, and zero outside it. A swipe shorter than 10 units is a tap. The gust fires when the finger lifts; a long drag also fires one full gust each time it covers 220 units, so sweeping around keeps the wind blowing. A faint trail follows the finger.
- **Gliding:** things slow down smoothly (drag 2.3/s on sand, 1.7/s for the boat on water, 5.5/s in the pool) and stop when slow, so they glide and settle in about 1–2 s. A medium swipe moves a ball about a quarter of the field.
- **The scene reacts to every gust:** palm crowns lean and spring back, umbrellas wobble, towels flap, mangroves rustle, wind streaks, sand and leaves fly along the cone and a curved swoosh sweeps out. A strong gust knocks an umbrella over for 3 s.
- **Sail home:** blow the boat into the glowing dock slip. Mangrove islands, sand banks and pier posts are solid. Later: rocks bounce the boat back with a kick, a narrow channel, a current that carries the boat sideways, and a slip that only catches a boat coming in gently.
- **Herd:** blow every beach ball (or rubber duck) into the pool or pond. The rim holds slow things in; on later levels a hard enough push carries a ball back out. Balls bump each other. Wins once all are in and nearly still.
- **Shoo:** gulls walk (later also fly) in from the edges toward the picnic blanket. A gust strong enough scares a gull off for good; a tiny puff only nudges it. A gull that reaches the blanket steals a snack and flies off. Keep at least one snack until the clock (a bar along the bottom) fills. On the last picnic, a huge gust over the blanket blows a snack away, so small puffs win.
- **No fail on levels 1–3.** On the first picnic, losing every snack refills the basket and starts the clock over. Later picnics end in a friendly "Oh no!" with Try again when the last snack goes. Sail and herd levels never fail.
- **Stars:** sail and herd: 1 for finishing, +1 for picking up every shell on the way (anything blown over a shell picks it up), +1 for beating the level's par time (a ring around a star in the bottom strip runs down). Shoo: 3 for keeping every snack, 2 for keeping half, otherwise 1 (and 1 after a refill).
- **Hints:** at the start, and again after 7 s without a gust, a dashed arrow shows where the loose thing should go next (around obstacles). On levels 1–3 a ghost finger shows the swipe. On picnics the finger shows a swipe from the blanket out toward the nearest gull.
- **Win:** confetti, "Hooray!" (or "WOW!" for 3 stars), stars popping in, pictures of the shells and the speed star earned, then Next and Again buttons after 1.2 s.
- **Saved:** best stars per level in `localStorage` under `hurricane-riley-progress` as `{ stars: [9 numbers] }`. A level unlocks once the one before it (or the level itself) has a star.

## Levels

| # | Name | Job | New thing |
|---|---|---|---|
| 1 | First Sail | sail | open water, wide slip |
| 2 | Beach Balls | herd | 2 balls, big pool that never lets go |
| 3 | Picnic Time | shoo | slow walking gulls from two sides, 25 s |
| 4 | Mangrove Maze | sail | islands to steer around, gentle docking |
| 5 | Pool Party | herd | 3 balls, chairs, palms and an umbrella in the way, rim lets go of hard hits |
| 6 | Gull Gang | shoo | gulls from all sides, some flying, 30 s, can fail |
| 7 | Rocky Channel | sail | narrow channel, bouncing rocks, a current, careful docking |
| 8 | Duck Pond | herd | 4 ducks, a fence to go around, small pond that lets go easily |
| 9 | Big Picnic | shoo | 16 gulls, many flying, 40 s, big gusts blow snacks away |

## Code

Under `src/games/hurricane-riley/`:

| File | Purpose |
|---|---|
| `sim.js` | Pure, seeded. All the tuning constants (named and documented at the top), gusts, gliding and collisions, pool rim, gulls, shells, scenery springs, win/fail and stars. |
| `levels.js` | Pure. The nine levels as data. |
| `bot.js` | Pure. A patient wind for tests and debug: for sail and herd it tries a fan of gusts behind each loose thing on a copy of the state and keeps the one that leaves everything closest to home (walking distance around obstacles via waypoints); for picnics it puffs each nearby gull away from the blanket. |
| `draw.js` | Drawing only (static layer cached per level and size; wind particles and wakes are cosmetic). Also the launcher tile. |
| `index.js` | Menu, level picker, play, win and try-again screens, swipe input, saved stars. |

`?level=N` starts on level N. `?debug` exposes `window.__hurricane` (`state()`, `screen()`, `buttons()`, `view()`, `progress()`, `toScreen(x, y)`, `toField(x, y)`, `gust(x0, y0, x1, y1, seconds)` in field units, `level(n)`, `goto(screen)`, `autopilot(on)`).

`sim.js` and `bot.js` are unit tested in `test/hurricane-riley.test.js`: gust direction, strength growing with swipe length, falloff outside the cone, glide distance and settle time, each job's win and fail rules, star rules, and on every level the bot winning (two seeds) while doing nothing does not.

## Not built yet

Sound. Tuning by feel on a real iPad (the constants at the top of `sim.js`).
