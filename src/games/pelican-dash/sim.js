// Pelican Dash rules: world generation, flight physics, collisions, fish, hearts and nests.
// Pure: no DOM. World units: y = 0 is the top of the sky and y = WATER is the sea surface,
// x grows to the right and the pelican starts at x = 0.

export const WATER = 100;
export const GRAVITY = 75; // units/s², gentle
export const FLAP = 34; // upward speed right after a flap: rises about 7.7 units
export const MAX_FALL = 42;
export const RADIUS = 4.2; // the pelican's hit circle, smaller than it looks
export const CATCH_RADIUS = 9; // fish are caught generously
export const START_Y = 50;
export const HEARTS = 3;
export const INVULNERABLE = 2; // seconds of blinking after a hit
export const BUMP_TIME = 0.45; // seconds to glide back to a safe height after a hit
export const NEST_EVERY = 10;
export const FIRST_X = 80; // where the first obstacle stands
export const AHEAD = 260; // the world is generated this far ahead of the pelican
export const NEST_AHEAD = 150; // a nest replaces the first obstacle at least this far ahead
export const RAMP = 2400; // distance over which speed, gaps and spacing reach their limits

// [start, limit] for each difficulty setting.
export const SPEED = [12, 20];
export const GAP = [56, 34];
export const SPACING = [52, 40];
export const SHIFT = [16, 26]; // largest change in gap height from one obstacle to the next
export const GAP_TOP_MIN = 14; // the hanging thing always shows at least this much
export const GAP_BOTTOM_MAX = 86; // and the piling at least this much

const FISH_GRAVITY = 55;
const FISH_VX = -4; // fish leap back toward the pelican
const MAX_STEP = 1 / 60;

const CLIMB_RATE = 20; // units/s a child can climb comfortably by tapping
// Widest half-width each kind can have (a lifeguard tower may become a pier).
const HALF = { signs: 6, kites: 4.8, blimp: 10, pilings: 5, pier: 8, lifeguard: 8 };

export const TOP_KINDS = ['signs', 'kites', 'blimp'];
export const BOTTOM_KINDS = ['pilings', 'pier', 'lifeguard'];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (pair, k) => pair[0] + (pair[1] - pair[0]) * k;
export const ramp = (d) => clamp(d / RAMP, 0, 1);
export const speedAt = (d) => lerp(SPEED, ramp(d));
export const gapAt = (d) => lerp(GAP, ramp(d));
export const spacingAt = (d) => lerp(SPACING, ramp(d));
export const shiftAt = (d) => lerp(SHIFT, ramp(d));

// mulberry32, kept in the state so a run can be replayed from its seed.
function rand(s) {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const rect = (x0, y0, x1, y1) => ({ e: false, x0, y0, x1, y1 });
const ellipse = (cx, cy, rx, ry) => ({ e: true, cx, cy, rx, ry });

// The solid parts of an obstacle pair. Drawing follows these shapes exactly.
export function obstacleShapes(kindTop, kindBottom, x, gapTop, gapBottom) {
  const shapes = [];
  if (kindTop === 'signs') shapes.push(rect(x - 6, -60, x + 6, gapTop));
  else if (kindTop === 'kites') shapes.push(rect(x - 4.8, -60, x + 4.8, gapTop));
  else {
    // blimp: gondola at the gap, body above it, tether up out of the sky
    const cy = gapTop - 8.5;
    shapes.push(rect(x - 3.5, gapTop - 3.5, x + 3.5, gapTop));
    shapes.push(ellipse(x, cy, 10, 6.5));
    shapes.push(rect(x - 1.5, -60, x + 1.5, cy - 5));
  }
  if (kindBottom === 'pilings') shapes.push(rect(x - 5, gapBottom, x + 5, WATER + 30));
  else if (kindBottom === 'pier') {
    shapes.push(rect(x - 8, gapBottom, x + 8, gapBottom + 4));
    shapes.push(rect(x - 5, gapBottom + 4, x + 5, WATER + 30));
  } else {
    shapes.push(rect(x - 7, gapBottom, x + 7, gapBottom + 13));
    shapes.push(rect(x - 5, gapBottom + 13, x + 5, WATER + 30));
  }
  return shapes;
}

function halfWidth(shapes) {
  let h = 0;
  for (const sh of shapes) h = Math.max(h, sh.e ? sh.rx : sh.x1 - (sh.x0 + sh.x1) / 2);
  return h;
}

export function circleHits(shape, x, y, r) {
  if (shape.e) {
    const dx = (x - shape.cx) / (shape.rx + r);
    const dy = (y - shape.cy) / (shape.ry + r);
    return dx * dx + dy * dy < 1;
  }
  const nx = clamp(x, shape.x0, shape.x1);
  const ny = clamp(y, shape.y0, shape.y1);
  return (x - nx) ** 2 + (y - ny) ** 2 < r * r;
}

function addFish(s, apexX, apexY, slot) {
  const h = WATER - apexY;
  const tA = Math.sqrt((2 * h) / FISH_GRAVITY);
  s.fishes.push({
    apexX, apexY, tA, v0: FISH_GRAVITY * tA, launchX: apexX - FISH_VX * tA, slot,
    state: 0, // 0 under water, 1 leaping, 2 caught, 3 back in the sea
    t: 0, x: apexX, y: WATER + 5, endTime: 0, look: Math.floor(rand(s) * 3),
  });
}

// One obstacle pair, plus the fish that go with it.
function addSlot(s) {
  const x = s.nextX;
  const gap = gapAt(x);
  const lo = GAP_TOP_MIN + gap / 2;
  const hi = GAP_BOTTOM_MAX - gap / 2;
  const prev = s.lastCentre;
  let kindTop = TOP_KINDS[Math.floor(rand(s) * 3)];
  let kindBottom = BOTTOM_KINDS[Math.floor(rand(s) * 3)];
  // Keep the height change to what is easy in the clear air between this obstacle and the
  // last: falling from a hover, or climbing at a relaxed tapping pace.
  const half = Math.max(HALF[kindTop], HALF[kindBottom]);
  const clear = Math.max(0, x - s.lastX - s.lastHalf - half - 2 * RADIUS);
  const t = clear / speedAt(x);
  const up = Math.min(shiftAt(x), CLIMB_RATE * t);
  const down = Math.min(shiftAt(x), 0.35 * GRAVITY * t * t);
  const delta = rand(s) < 0.5 ? -rand(s) * up : rand(s) * down;
  const centre = clamp(prev + delta, lo, hi);
  const gapTop = centre - gap / 2;
  const gapBottom = centre + gap / 2;
  if (kindTop === 'blimp' && gapTop < 24) kindTop = 'kites';
  if (kindBottom === 'lifeguard' && gapBottom > 80) kindBottom = 'pier';
  const shapes = obstacleShapes(kindTop, kindBottom, x, gapTop, gapBottom);
  const id = s.slots++;
  // a fish leaping between this obstacle and the last one
  if (id > 0 && rand(s) < 0.55) {
    const y = clamp((prev + centre) / 2 + (rand(s) * 2 - 1) * 8, 24, 80);
    addFish(s, x - spacingAt(x) / 2, y, -1);
  }
  s.obstacles.push({
    id, kind: 'pair', x, gapTop, gapBottom, centre, kindTop, kindBottom, shapes,
    half: halfWidth(shapes), look: Math.floor(rand(s) * 1000), nestY: 0, done: false,
  });
  // a fish leaping up through the gap
  if (rand(s) < 0.75) {
    const wiggle = Math.min(6, gap / 2 - 12);
    addFish(s, x, centre + (rand(s) * 2 - 1) * wiggle, id);
  }
  s.lastCentre = centre;
  s.lastX = x;
  s.lastHalf = half;
  s.nextX = x + spacingAt(x);
}

function ensureWorld(s) {
  while (s.nextX < s.x + AHEAD) addSlot(s);
}

export function createGame(seed = 1) {
  const s = {
    seed, rng: seed | 0,
    status: 'ready', // 'ready' | 'play' | 'over'
    time: 0, x: 0, y: START_Y, vy: 0, speed: SPEED[0],
    hearts: HEARTS, fish: 0, pouch: 0, fed: 0, delivered: 0,
    invulnUntil: -1, bump: 0, bumpFrom: 0, bumpTo: 0,
    flapTime: -9, hitTime: -9, catchTime: -9, nestTime: -9, overTime: -9, healed: false,
    hitBy: '', // 'obstacle' | 'water' | 'top'
    obstacles: [], fishes: [], slots: 0, nextX: FIRST_X, lastCentre: START_Y, lastX: 0, lastHalf: 0, nestPending: false,
  };
  addFish(s, 42, START_Y, -1); // an easy first catch, straight ahead
  ensureWorld(s);
  return s;
}

// A tap. The first one starts the run.
export function flap(s) {
  if (s.status === 'over') return false;
  if (s.status === 'ready') s.status = 'play';
  if (s.bump > 0) return false;
  s.vy = -FLAP;
  s.flapTime = s.time;
  return true;
}

export const invulnerable = (s) => s.time < s.invulnUntil;

// The next obstacle (or nest) the pelican has not yet flown past.
export function nextObstacle(s) {
  for (const o of s.obstacles) if (o.x + o.half + RADIUS > s.x) return o;
  return null;
}

function hit(s, by) {
  s.hearts -= 1;
  s.hitTime = s.time;
  s.hitBy = by;
  if (s.hearts <= 0) {
    s.hearts = 0;
    s.status = 'over';
    s.overTime = s.time;
    s.vy = by === 'water' ? 0 : -12;
    return;
  }
  s.invulnUntil = s.time + INVULNERABLE;
  const o = nextObstacle(s);
  s.bump = BUMP_TIME;
  s.bumpFrom = s.y;
  s.bumpTo = o ? o.centre : START_Y;
  s.vy = 0;
}

function scheduleNest(s) {
  for (const o of s.obstacles) {
    if (o.kind !== 'pair' || o.x < s.x + NEST_AHEAD) continue;
    o.kind = 'nest';
    o.shapes = [];
    o.half = 8;
    o.nestY = clamp(o.centre + 8, 50, 74);
    o.centre = o.nestY - 14;
    for (const f of s.fishes) if (f.slot === o.id && f.state === 0) f.state = 3;
    s.nestPending = true;
    return true;
  }
  return false;
}

// Adds caught fish to the score and the pouch, and calls a nest when the pouch is full.
export function catchFish(s, n = 1) {
  s.fish += n;
  s.pouch += n;
  s.catchTime = s.time;
  if (s.pouch >= NEST_EVERY && !s.nestPending) scheduleNest(s);
}

function updateFish(s, dt) {
  for (const f of s.fishes) {
    if (f.state === 0) {
      if (s.status === 'play' && s.x >= f.apexX - s.speed * f.tA) {
        f.state = 1;
        f.t = 0;
      } else continue;
    }
    if (f.state !== 1) continue;
    f.t += dt;
    f.x = f.launchX + FISH_VX * f.t;
    f.y = WATER - (f.v0 * f.t - 0.5 * FISH_GRAVITY * f.t * f.t);
    if (f.t > f.tA && f.y > WATER + 2) {
      f.state = 3;
      f.endTime = s.time;
    } else if (s.status === 'play' && (f.x - s.x) ** 2 + (f.y - s.y) ** 2 < CATCH_RADIUS * CATCH_RADIUS) {
      f.state = 2;
      f.endTime = s.time;
      catchFish(s, 1);
    }
  }
}

function feedNests(s) {
  for (const o of s.obstacles) {
    if (o.kind !== 'nest' || o.done || s.x < o.x) continue;
    o.done = true;
    s.delivered = s.pouch;
    s.pouch = 0;
    s.fed += 1;
    s.healed = s.hearts < HEARTS;
    if (s.healed) s.hearts += 1;
    s.nestTime = s.time;
    s.nestPending = false;
  }
}

function collide(s) {
  if (s.bump > 0) return;
  const safe = invulnerable(s);
  if (s.y + RADIUS > WATER) {
    if (!safe) return hit(s, 'water');
    s.y = WATER - RADIUS;
    s.vy = -FLAP * 0.7; // a bounce off the water while blinking
    return;
  }
  if (s.y - RADIUS < 0) {
    if (!safe) return hit(s, 'top');
    s.y = RADIUS;
    s.vy = Math.max(0, s.vy);
    return;
  }
  if (safe) return;
  for (const o of s.obstacles) {
    if (o.x - o.half - RADIUS > s.x) break;
    if (o.x + o.half + RADIUS < s.x) continue;
    for (const sh of o.shapes) if (circleHits(sh, s.x, s.y, RADIUS)) return hit(s, 'obstacle');
  }
}

function prune(s) {
  while (s.obstacles.length && s.obstacles[0].x < s.x - 100) s.obstacles.shift();
  while (s.fishes.length && s.fishes[0].apexX < s.x - 100 && s.fishes[0].state !== 1) s.fishes.shift();
}

function stepOnce(s, dt) {
  s.time += dt;
  if (s.status === 'ready') return;
  if (s.status === 'over') {
    // tumble down to float on the water; the world stops
    s.vy = Math.min(MAX_FALL, s.vy + GRAVITY * dt);
    s.y = Math.min(WATER - 1, s.y + s.vy * dt);
    updateFish(s, dt);
    return;
  }
  s.speed = speedAt(s.x);
  s.x += s.speed * dt;
  if (s.bump > 0) {
    s.bump = Math.max(0, s.bump - dt);
    const k = 1 - s.bump / BUMP_TIME;
    s.y = s.bumpFrom + (s.bumpTo - s.bumpFrom) * (1 - (1 - k) * (1 - k));
    s.vy = 0;
  } else {
    s.vy = Math.min(MAX_FALL, s.vy + GRAVITY * dt);
    s.y += s.vy * dt;
  }
  ensureWorld(s);
  updateFish(s, dt);
  feedNests(s);
  collide(s);
  prune(s);
}

export function step(s, dt) {
  while (dt > 1e-9) {
    const d = Math.min(dt, MAX_STEP);
    stepOnce(s, d);
    dt -= d;
  }
}
