// Drivers for tests and the ?debug autopilot. Pure: they read a race and return a steer value.
import {
  SEG_LEN, LANE_X, MAX_SPEED, STEER_RATE, STEER_LOW, CENTRIFUGAL, CAR_W, HIT_SCALE, segmentAt,
} from './sim.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const LOOK = 34; // segments ahead the bot looks for coins
const DODGE = 26; // segments ahead the bot watches for traffic

function nextCoin(s) {
  const { track } = s;
  const a = Math.floor(s.z / SEG_LEN);
  const b = Math.min(track.segs.length - 1, a + LOOK);
  for (let i = a; i <= b; i++) {
    for (const c of track.segs[i].coins) if (!s.got[c.id] && c.z > s.z + 20) return c;
  }
  return null;
}

function nextPad(s) {
  const { track } = s;
  const a = Math.floor(s.z / SEG_LEN);
  const b = Math.min(track.segs.length - 1, a + LOOK);
  for (let i = a; i <= b; i++) if (track.segs[i].pad && track.segs[i].pad.z > s.z) return track.segs[i].pad;
  return null;
}

// Is road position `x` going to be blocked by a car the player catches within `within` seconds?
function blocked(s, x, within) {
  const vp = Math.max(s.speed, MAX_SPEED * 0.5);
  for (const c of s.traffic) {
    const dz = c.z - s.z;
    if (dz < -60 || dz > DODGE * SEG_LEN) continue;
    const closing = Math.max(1, vp - c.speed);
    if (dz > 0 && dz / closing > within) continue;
    const reach = ((CAR_W + c.w) / 2) * HIT_SCALE + 0.16;
    if (Math.abs(c.x - x) < reach || Math.abs(c.targetX - x) < reach) return true;
  }
  return false;
}

// Steer toward coins (or the next boost pad), around traffic, against the bend's push.
export function botSteer(s) {
  const coin = nextCoin(s);
  const pad = nextPad(s);
  let goal = coin;
  if (pad && (!coin || pad.z < coin.z)) goal = pad;
  let want = goal ? goal.x : 0;
  const vp = Math.max(s.speed, MAX_SPEED * 0.5);
  const within = goal ? (goal.z - s.z) / vp + 0.45 : 1.5;
  if (blocked(s, want, within)) {
    let best = want;
    let bestCost = Infinity;
    for (const lx of [...LANE_X, -0.31, 0.31]) {
      const cost = Math.abs(lx - want) + Math.abs(lx - s.x) * 0.5 + (blocked(s, lx, 1.5) ? 10 : 0);
      if (cost < bestCost) [best, bestCost] = [lx, cost];
    }
    want = best;
  }
  return steerToward(s, want);
}

// A steer value that heads for road position `want`, cancelling the bend's outward push.
export function steerToward(s, want, gain = 4) {
  const seg = segmentAt(s.track, s.z + 3 * SEG_LEN);
  const pct = Math.min(1.4, s.speed / MAX_SPEED);
  const rate = STEER_RATE * (STEER_LOW + (1 - STEER_LOW) * Math.min(1, pct));
  const push = seg.curve * pct * pct * CENTRIFUGAL;
  return clamp((want - s.x) * gain + push / rate, -1, 1);
}

// A child waggling a finger about: a new random steer every so often.
export function makeRandomDriver(rng) {
  let steer = 0;
  let until = 0;
  return (s) => {
    if (s.time >= until) {
      steer = rng() * 2 - 1;
      until = s.time + 0.3 + rng() * 1.2;
    }
    return steer;
  };
}
