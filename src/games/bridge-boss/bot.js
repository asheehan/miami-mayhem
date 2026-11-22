// A simple bridge keeper, for tests and the ?debug autopilot. Pure: reads the state and
// calls toggle(). For each bridge it looks at the vehicles waiting for it or coming up to it
// and serves whichever side has the vehicle closest to running out of patience, switching
// only when the span (or the water under it) is clear.
import { canToggle, toggle, crossingAhead } from './sim.js';

const LOOK = 40; // vehicles this close to the stop line count as wanting the bridge
const HOLD = 1.2; // seconds to leave the bridge alone after moving it

// Seconds until the most impatient vehicle of a kind at bridge b gives up, counting the time
// it would take to drive up to the stop line (Infinity when none are near).
function urgency(s, b, kind) {
  let best = Infinity;
  for (const lane of s.lanes) {
    if (lane.kind !== kind) continue;
    for (const v of lane.vehicles) {
      const c = crossingAhead(lane, v, b);
      if (!c) continue;
      const dist = c.stopAt - v.s;
      if (dist > LOOK) continue;
      const eta = dist / Math.max(1, v.speed);
      best = Math.min(best, eta + (1 - v.patience) * v.patienceTime);
    }
  }
  return best;
}

export function botStep(s, opts = {}) {
  const margin = opts.margin ?? 0; // switch when the other side is this many seconds more urgent
  for (const br of s.bridges) {
    if (s.status !== 'play') return;
    if (br.state === 'raising' || br.state === 'lowering') continue;
    if (s.time - br.toggleTime < HOLD) continue;
    const served = br.state === 'down' ? 'road' : 'water';
    const other = served === 'road' ? 'water' : 'road';
    const theirs = urgency(s, br.id, other);
    if (theirs === Infinity) continue;
    const mine = urgency(s, br.id, served);
    if (theirs + margin < mine && canToggle(s, br.id)) toggle(s, br.id);
  }
}
