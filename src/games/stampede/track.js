// Track generation for Boardwalk Stampede. Pure: no DOM, no three.js.
//
// Distances are in metres along the boardwalk: z runs forward from 0, x runs across
// from -TRACK_HALF (left) to +TRACK_HALF (right).

export const TRACK_HALF = 5;
export const SPEED = 9; // metres per second
export const ROW_GAP = 20; // distance between a gate row and the next obstacle
export const PIT_GAP = 1.6; // width of the safe strip through a pit
export const STAGE = 12; // distance from the finish line to the finale button

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rng, list) => list[Math.floor(rng() * list.length)];

// A gate is { op: '+' | '-' | 'x', n }.
export function applyOp(count, gate) {
  if (gate.op === '+') return count + gate.n;
  if (gate.op === '-') return Math.max(0, count - gate.n);
  return count * gate.n;
}

export const gateLabel = (gate) => (gate.op === 'x' ? `×${gate.n}` : gate.op === '+' ? `+${gate.n}` : `−${gate.n}`);
export const isGood = (gate) => gate.op !== '-';

// Returns { level, gates: [{ z, left, right }], obstacles: [...], finishZ, length }.
// Every track has one ×2 gate and plus gates worth at least 50 on the best route.
export function generateTrack(level, seed = level * 7919 + 17) {
  const rng = mulberry32(seed);
  const rows = 8;
  const x2Row = 3 + Math.floor(rng() * 3);
  const gates = [];
  const obstacles = [];
  let z = 26;
  for (let r = 0; r < rows; r++) {
    let a;
    let b;
    if (r === 0) {
      a = { op: '+', n: 10 };
      b = { op: '+', n: 5 };
    } else if (r === x2Row) {
      a = { op: 'x', n: 2 };
      b = { op: '+', n: pick(rng, [10, 15, 20]) };
    } else if (rng() < 0.4) {
      a = { op: '+', n: pick(rng, [15, 20]) };
      b = { op: '+', n: pick(rng, [5, 10]) };
    } else {
      a = { op: '+', n: pick(rng, [10, 15, 20]) };
      b = { op: '-', n: pick(rng, level < 2 ? [5, 10] : [5, 10, 15, 20]) };
    }
    const flip = rng() < 0.5;
    gates.push({ z, left: flip ? b : a, right: flip ? a : b });
    z += ROW_GAP;
    obstacles.push(...makeObstacle(rng, level, z, r));
    z += ROW_GAP;
  }

  // top up the plus gates so the best route gains at least 50 before any doubling
  const plusRows = gates.filter((g) => g.left.op !== 'x' && g.right.op !== 'x');
  const bestPlus = () => plusRows.reduce((s, g) => s + Math.max(g.left.op === '+' ? g.left.n : 0, g.right.op === '+' ? g.right.n : 0), 0);
  for (let i = 0; bestPlus() < 50; i++) {
    const g = plusRows[i % plusRows.length];
    const side = g.left.op === '+' && (g.right.op !== '+' || g.left.n >= g.right.n) ? g.left : g.right;
    side.n += 5;
  }

  const finishZ = z + 4;
  return { level, gates, obstacles, finishZ, length: finishZ + STAGE + 10 };
}

function makeObstacle(rng, level, z, row) {
  const type = pick(rng, row === 0 ? ['pit', 'hammer'] : ['pit', 'saw', 'hammer']);
  if (type === 'pit') {
    const c = pick(rng, [-2, -1, 0, 1, 2]);
    const holes = [
      [-TRACK_HALF, c - PIT_GAP / 2],
      [c + PIT_GAP / 2, TRACK_HALF],
    ].filter(([a, b]) => b - a > 0.05);
    return [{ type, z, z0: z - 1.1, z1: z + 1.1, holes }];
  }
  if (type === 'saw') {
    const speed = Math.min(2.6, 1.6 + 0.15 * level);
    const phase = rng() * Math.PI * 2;
    const saw = (zz, ph) => ({ type, z: zz, z0: zz - 0.4, z1: zz + 0.4, r: 1.15, cx: 0, amp: 3.6, speed, phase: ph });
    return level >= 2 ? [saw(z, phase), saw(z + 3.5, phase + Math.PI)] : [saw(z, phase)];
  }
  const x = pick(rng, [-2.5, 2.5]);
  return [{ type: 'hammer', z, z0: z - 1.2, z1: z + 1.2, x, w: 5, d: 2.4, period: 1.5, phase: rng() * 1.5 }];
}

// Where a saw blade's centre is at time t.
export const sawX = (ob, t) => ob.cx + ob.amp * Math.sin(t * ob.speed + ob.phase);

// A hammer's cycle position, 0..1: it hangs up, drops from 0.5, and is down from 0.72.
export const hammerCycle = (ob, t) => ((((t + ob.phase) % ob.period) + ob.period) % ob.period) / ob.period;
export const hammerDown = (ob, t) => hammerCycle(ob, t) >= 0.72;

// True if a person at (x, z) is caught by obstacle `ob` at time t.
export function hits(ob, x, z, t) {
  if (z < ob.z0 || z > ob.z1) return false;
  if (ob.type === 'pit') return ob.holes.some(([a, b]) => x > a && x < b);
  if (ob.type === 'saw') return Math.abs(x - sawX(ob, t)) < ob.r;
  return hammerDown(ob, t) && Math.abs(x - ob.x) < ob.w / 2;
}

// The crowd size after taking the better gate in every row and dodging everything.
export function bestCount(track, start = 1) {
  return track.gates.reduce((n, g) => Math.max(applyOp(n, g.left), applyOp(n, g.right)), start);
}
