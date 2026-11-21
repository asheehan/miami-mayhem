// Level generation for Later, Gator. Pure: no DOM, no three.js.
//
// The map is a grid COLS squares wide. Row 0 is the start strip, the last row is the swamp.
// Columns run 0..COLS-1 from left to right; rows run forward from the start.
// Movers (cars, skaters, boats) slide along their row and wrap around a loop SPAN squares
// long, so where each one is is a pure function of time.

export const COLS = 9;
export const PAD = 3; // squares of hidden road on each side, where movers wrap round
export const SPAN = COLS + PAD * 2;
export const START_COL = 4;
export const GATOR_HALF = 0.3; // half the gator's width, in squares

export const SAFE = new Set(['start', 'grass', 'sand']);
export const isSafe = (type) => SAFE.has(type);

// Mover kinds: length in squares and which lane type they travel.
export const KINDS = {
  convertible: { len: 1.8, lane: 'road' },
  truck: { len: 2.5, lane: 'road' },
  scooter: { len: 0.9, lane: 'road' },
  skater: { len: 0.6, lane: 'boardwalk' },
  ball: { len: 0.7, lane: 'boardwalk' },
  jetski: { len: 1.1, lane: 'canal' },
  boat: { len: 2.2, lane: 'canal' },
};

export const SNACKS = ['hotdog', 'icecream', 'pizza'];

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
const range = (rng, lo, hi) => lo + rng() * (hi - lo);

// How hard level n (1-based) is. Ramps from level 1 to level 8, then keeps creeping up.
export function levelParams(n) {
  const t = Math.min(1, (Math.max(1, n) - 1) / 7);
  const extra = Math.max(0, n - 8);
  return {
    lanes: Math.min(40, Math.round(15 + 10 * t + extra * 0.6)),
    speed: (1 + 0.55 * t) * Math.min(1.4, 1 + 0.03 * extra), // multiplies every mover's speed
    gap: Math.max(0.5, 1 - 0.32 * t - 0.02 * extra), // multiplies the space between movers
    maxRun: t < 0.4 ? 3 : 4, // most hazard lanes in a row before a safe strip
    blockers: t < 0.4 ? [1, 2] : [2, 3],
  };
}

// Movers for one lane, spaced round the loop so there is always a gap to cross through.
function makeMovers(rng, kinds, gapMin, gapVar) {
  const movers = [];
  let pos = rng() * SPAN;
  let used = 0;
  for (let i = 0; i < 12; i++) {
    const kind = pick(rng, kinds);
    const len = KINDS[kind].len;
    const gap = gapMin + rng() * gapVar;
    if (movers.length && used + len + gapMin > SPAN) break;
    movers.push({ kind, x0: pos + len / 2, len, tint: Math.floor(rng() * 4) });
    pos += len + gap;
    used += len + gap;
    if (used >= SPAN) break;
  }
  return movers;
}

function hazardLane(rng, type, p) {
  const dir = rng() < 0.5 ? -1 : 1;
  if (type === 'road') {
    const kinds = pick(rng, [['convertible'], ['convertible', 'scooter'], ['truck', 'convertible'], ['scooter'], ['truck']]);
    return { type, dir, speed: range(rng, 1.2, 2.1) * p.speed, movers: makeMovers(rng, kinds, 3.4 * p.gap, 3 * p.gap) };
  }
  if (type === 'boardwalk') {
    const kinds = pick(rng, [['skater'], ['ball'], ['skater', 'ball']]);
    return { type, dir, speed: range(rng, 0.6, 1.1) * p.speed, movers: makeMovers(rng, kinds, 2.6 * p.gap, 2.5 * p.gap) };
  }
  // canal: the current drifts a swimmer one way; boats may go either way
  const drift = (rng() < 0.5 ? -1 : 1) * range(rng, 0.35, 0.6) * Math.min(1.3, p.speed);
  const kinds = pick(rng, [['jetski'], ['boat'], ['jetski', 'boat']]);
  return { type, dir, drift, speed: range(rng, 1.2, 1.9) * p.speed, movers: makeMovers(rng, kinds, 6 * p.gap, 4 * p.gap) };
}

// Blocked squares on a safe strip: never two side by side, so the strip is never walled
// off, and a gator climbing out of a canal always has an open square next to where he is.
function placeBlockers(rng, count, keepClear = []) {
  const blockers = [];
  for (let tries = 0; tries < 40 && blockers.length < count; tries++) {
    const c = Math.floor(rng() * COLS);
    if (keepClear.includes(c)) continue;
    if (blockers.some((b) => Math.abs(b - c) <= 1)) continue;
    blockers.push(c);
  }
  return blockers.sort((a, b) => a - b);
}

// Returns { level, cols, rows: [...], snacks: [{ row, col, kind }], start: { row, col } }.
// A row is { type, blockers? (safe strips), dir, speed, movers, drift? (canals) }.
export function generateLevel(n, seed = n * 9973 + 31) {
  const rng = mulberry32(seed);
  const p = levelParams(n);
  const rows = [{ type: 'start', blockers: placeBlockers(rng, 1, [START_COL - 1, START_COL, START_COL + 1]) }];
  let lastGroup = null;
  const safeType = (prev) => (prev === 'canal' ? 'sand' : rng() < 0.6 ? 'grass' : 'sand');
  // the first level opens with an easy one-lane road so a new player meets it gently
  let first = n === 1;
  // p.lanes rows between the start strip and the swamp
  while (rows.length < p.lanes + 1) {
    const left = p.lanes - rows.length; // leave room for the strip before the swamp
    if (left <= 0) break;
    let group = pick(rng, ['road', 'road', 'boardwalk', 'canal', 'canal']);
    if (group === lastGroup) group = group === 'road' ? pick(rng, ['canal', 'boardwalk']) : 'road';
    if (first) group = 'road';
    const maxRun = group === 'canal' ? Math.min(3, p.maxRun) : p.maxRun;
    const run = Math.min(left, first ? 1 : 1 + Math.floor(rng() * maxRun));
    first = false;
    for (let i = 0; i < run; i++) rows.push(hazardLane(rng, group, p));
    lastGroup = group;
    const [lo, hi] = p.blockers;
    rows.push({ type: safeType(group), blockers: placeBlockers(rng, lo + Math.floor(rng() * (hi - lo + 1))) });
  }
  // the last strip before the swamp is reeds and grass
  if (!isSafe(rows[rows.length - 1].type)) rows.push({ type: 'grass', blockers: placeBlockers(rng, 1) });
  rows.push({ type: 'swamp' });

  const level = { level: n, cols: COLS, rows, snacks: [], start: { row: 0, col: START_COL } };
  level.snacks = placeSnacks(rng, level);
  return level;
}

export const isBlocked = (level, row, col) => {
  const r = level.rows[row];
  return !!(r && r.blockers && r.blockers.includes(col));
};

// Squares reachable from the start by hopping, ignoring movers (they always leave gaps).
// Returns a grid of booleans, reach[row][col].
export function reachable(level, from = level.start) {
  const reach = level.rows.map(() => new Array(COLS).fill(false));
  const queue = [[from.row, from.col]];
  reach[from.row][from.col] = true;
  while (queue.length) {
    const [r, c] = queue.shift();
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= level.rows.length || nc < 0 || nc >= COLS) continue;
      if (reach[nr][nc] || isBlocked(level, nr, nc)) continue;
      reach[nr][nc] = true;
      queue.push([nr, nc]);
    }
  }
  return reach;
}

// Hops from each square to the nearest of the target squares, ignoring movers
// (Infinity where cut off).
export function distanceMap(level, targets) {
  const dist = level.rows.map(() => new Array(COLS).fill(Infinity));
  const queue = [];
  for (const t of targets) {
    dist[t.row][t.col] = 0;
    queue.push([t.row, t.col]);
  }
  while (queue.length) {
    const [r, c] = queue.shift();
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= level.rows.length || nc < 0 || nc >= COLS) continue;
      if (dist[nr][nc] !== Infinity || isBlocked(level, nr, nc)) continue;
      dist[nr][nc] = dist[r][c] + 1;
      queue.push([nr, nc]);
    }
  }
  return dist;
}

// Three snacks, one in each third of the level, on land squares the gator can reach.
function placeSnacks(rng, level) {
  const reach = reachable(level);
  const last = level.rows.length - 1;
  const snacks = [];
  for (let k = 0; k < 3; k++) {
    const lo = 1 + Math.floor(((last - 1) * k) / 3);
    const hi = Math.max(lo, Math.floor(((last - 1) * (k + 1)) / 3));
    const spots = [];
    for (let r = lo; r <= hi; r++) {
      const type = level.rows[r].type;
      if (type === 'canal' || type === 'swamp' || type === 'start') continue;
      for (let c = 0; c < COLS; c++) if (reach[r][c]) spots.push({ row: r, col: c });
    }
    // prefer squares off the straight line up the middle, so a snack is a small detour
    const off = spots.filter((s) => s.col !== START_COL);
    const spot = pick(rng, off.length ? off : spots);
    snacks.push({ ...spot, kind: SNACKS[k % SNACKS.length] });
  }
  return snacks;
}

// Where a mover's middle is at time t, in columns (it may be off the map, out to PAD).
export function moverX(lane, mover, t) {
  const raw = mover.x0 + lane.dir * lane.speed * t;
  return (((raw % SPAN) + SPAN) % SPAN) - PAD;
}

// True if something in this lane covers column position x at time t.
export function laneHits(lane, x, t) {
  const movers = lane.movers;
  if (!movers) return false;
  for (let i = 0; i < movers.length; i++) {
    const m = movers[i];
    const mx = moverX(lane, m, t);
    const reach = m.len / 2 + GATOR_HALF;
    if (Math.abs(x - mx) < reach) return true;
    // the copy of it wrapping round the far end of the loop
    if (Math.abs(x - (mx + SPAN)) < reach || Math.abs(x - (mx - SPAN)) < reach) return true;
  }
  return false;
}
