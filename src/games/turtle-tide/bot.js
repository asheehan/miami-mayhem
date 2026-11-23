// Turtle Tide bot. Pure. Plays a level by following one of its nav lists (levels.js): once the
// turtle passes each x, it moves the tide to that height. Used by the tests, the ?debug
// autopilot and the hint finger (which shows the way the nav would move the water).
import { step, setTide, navTarget } from './sim.js';

const DT = 1 / 30;

// One bot turn: steer the tide for where the turtle is now, then step the world.
export function botStep(s, nav, dt = DT) {
  const want = navTarget(nav, s.turtle.x);
  if (want != null && s.status === 'play') setTide(s, want);
  step(s, dt);
}

// Play until the turtle reaches the sea or maxSeconds of game time pass.
// yieldEvery (game seconds) lets a test runner breathe during long runs.
export async function playNav(s, nav, { maxSeconds = 150, yieldEvery = 0 } = {}) {
  let nextYield = yieldEvery;
  while (s.status === 'play' && s.time < maxSeconds) {
    botStep(s, nav);
    if (yieldEvery && s.time >= nextYield) {
      nextYield += yieldEvery;
      await new Promise((r) => setImmediate(r));
    }
  }
  return s;
}

// Which way the water should go to help the turtle right now: 'up', 'down' or null, and the
// height the nav wants. Follows the level's nav (the simple way to the sea).
export function hintMove(s, nav = s.level.nav) {
  const want = navTarget(nav, s.turtle.x);
  if (want == null) return null;
  const gap = want - s.base;
  if (Math.abs(gap) < 6) return null;
  return { dir: gap > 0 ? 'up' : 'down', to: want };
}
