# Boardwalk Stampede — Design

The second game in Riley's Miami Mayhem: a 3D crowd runner. A crowd runs down a boardwalk on its own; the player drags left and right to steer it through maths gates and around obstacles.

## Rules

- **Start:** one runner. Speed is fixed at 9 m/s; a level is about 40 seconds.
- **Steering:** dragging a finger moves the crowd sideways. The crowd's middle goes as close to where the player is aiming as the crowd's width allows.
- **Gates:** rows of two gates, left and right. The side the crowd's middle is on decides which one applies. Gates are `+n`, `−n` or `×2`. Blue is good, red is bad. Every level has exactly one `×2` gate, never two bad gates side by side, and plus gates worth at least 50 on the best route.
- **Obstacles** sit between gate rows and act on each person separately:
  - **Pit:** a hole across the boardwalk with one safe strip 1.6 m wide. Anyone over the hole falls in. A crowd of 40 loses more than half however well it is steered; a group of 5 fits through.
  - **Saw:** a blade sliding side to side. Anyone within the blade as they cross it is gone.
  - **Hammer:** slams down on one half of the boardwalk on a 1.5 s cycle, with a red patch on the ground that brightens before it drops.
- **Losing:** the run ends when nobody is left (obstacles or a minus gate). "Try again" restarts the same level; a level's track is always the same.
- **Finishing:** crossing the finish line with anyone left completes the level and unlocks the next.
  - 12 or fewer: a small cheer, and a hint to bring more next time.
  - More than 12: the **high striker** finale. The crowd piles onto a big button and jumps; a puck shoots up a tower to a height set by the crowd size (60 or more rings the bell) while the score counts up to 10 points per runner.
- **Drawing limit:** at most 150 runners are drawn. Any beyond that are still counted and step in as drawn runners are lost.

## Code

Under `src/games/stampede/`:

| File | Purpose |
|---|---|
| `track.js` | Pure. Level generation, gate maths, obstacle hit tests. |
| `sim.js` | Pure. The run: crowd formation, steering, gates, obstacles, finish, finale timing. |
| `view3d.js` | three.js scene and camera. Reads the run; no rules. Loaded only when the game is opened. |
| `index.js` | Menu, HUD and overlays on the shared 2D canvas, input, saved progress (`stampede-progress`). |

`track.js` and `sim.js` are unit tested in `test/stampede.test.js`.

## Not built yet

More finales (human tower, cannon) chosen at random; sound.
