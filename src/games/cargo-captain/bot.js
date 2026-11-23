// A tidy captain, for tests and the ?debug autosolve. Pure. It plays through the same actions
// the touch screen uses: put a finger on the crate where it is drawn (pickAt), carry it so the
// crate shows over the deck or the dock (moveHeld), let go (dropHeld), and tap numbers (answer).
import { pickAt, moveHeld, dropHeld, answer, layout, solve, step, PIVOT_X, DECK_INNER, COL_W, HOLD_LIFT } from './sim.js';

// Where a finger lets go so the crate (drawn HOLD_LIFT above it) lands on each place.
export function dropPoint(to) {
  if (to === 'dock') return { x: PIVOT_X, y: 700 + HOLD_LIFT };
  const dir = to === 'left' ? -1 : 1;
  return { x: PIVOT_X + dir * (DECK_INNER + COL_W), y: 260 + HOLD_LIFT };
}

// The next thing to do, or null if there is nothing to do right now:
// { id, to, from: { x, y }, at: { x, y } } for a crate, or { answer } on a mystery puzzle.
export function nextMove(s) {
  if (s.status === 'choose') return { answer: s.puzzle.answer };
  if (s.status !== 'play' || s.held) return null;
  const moves = solve(s);
  if (!moves || !moves.length) return null;
  const m = moves[0];
  const p = layout(s).get(m.id);
  return { id: m.id, to: m.to, from: { x: p.x, y: p.y }, at: dropPoint(m.to) };
}

// Carry out one move the way a finger would. Returns true if it did something.
export function doMove(s, move) {
  if (!move) return false;
  if (move.answer !== undefined) return answer(s, move.answer);
  const got = pickAt(s, move.from.x, move.from.y);
  if (got !== move.id) throw new Error(`grabbed crate ${got}, wanted ${move.id}`);
  const steps = 6;
  for (let i = 1; i <= steps; i++) {
    moveHeld(s, move.from.x + ((move.at.x - move.from.x) * i) / steps, move.from.y + ((move.at.y - move.from.y) * i) / steps);
    step(s, 1 / 60);
  }
  dropHeld(s, move.at.x, move.at.y);
  return true;
}

// Play a whole voyage to the end. pause: seconds between moves (the ship never rests in
// between, as with a quick player). Returns the state.
export function playVoyage(s, { dt = 1 / 30, pause = 0.3, maxSeconds = 300 } = {}) {
  let wait = pause;
  for (let t = 0; t < maxSeconds && s.status !== 'done'; t += dt) {
    step(s, dt);
    wait -= dt;
    if (wait <= 0) {
      const m = nextMove(s);
      if (m) {
        doMove(s, m);
        wait = pause;
      }
    }
  }
  return s;
}
