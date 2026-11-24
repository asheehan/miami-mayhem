// Sandcastle Smash rules. Pure: no DOM, no randomness, fixed timestep, so a level played
// with the same shots always ends the same way. The world is side-on in metres, y up, the
// sand at y = 0. Physics lives in physics.js; this file owns coconuts, blocks, crabs, the
// slingshot, shots, scoring and the win and try-again rules.
import {
  DT, GRAVITY, createWorld, addBody, removeBody, findContacts, applyGravity, solve, closingSpeed,
} from './physics.js';

export { DT, GRAVITY };

export const SLING = { x: 2.6, y: 2.7 }; // where the coconut sits in the palm slingshot
export const MAX_SPEED = 19; // launch speed at full pull (m/s)
export const MIN_POWER = 0.15; // a shorter pull than this doesn't fire
export const ANGLE_MIN = -0.5; // radians; shots can't go further down than this
export const ANGLE_MAX = 1.45; // or further up
export const IMPACT_MIN = 1.5; // closing speed (m/s) a knock must beat before it does any damage
export const GROUND_HARM = 0.5; // landing on the sand or a rock hurts this much less
export const PUNCH_LOSS = 2; // m/s a coconut loses smashing through a block, on top of the block's strength
export const SETTLE_STEPS = 90; // steps run quietly when a level is built so it starts at rest
export const RELOAD_MAX = 3.5; // the next coconut is ready this long after a shot at the latest
export const SHOT_MAX = 8; // the last shot is over after this long, even if things still roll
export const CALM_SPEED = 0.2; // everything slower than this (m/s) counts as still
export const CALM_TIME = 0.35; // for this long
export const CLEAR_DELAY = 1.2; // seconds from the last crab popping to the win screen
export const CRAB_FALL = 0.8; // a crab this far below where it started has fallen off
export const CRAB_TIP = 1.25; // or tipped this far over (radians)
export const BURST_R = 3.2; // pineapple burst reach
export const BURST_PUSH = 9; // impulse at the middle of a burst
export const BURST_HARM = 1; // damage per unit of burst impulse
export const SPLIT_SPREAD = 0.2; // radians between the three halves of a split coconut
export const CRAB_POINTS = 500;

export const MATERIALS = {
  sand: { density: 1.4, friction: 0.8, bounce: 0, hp: 4, points: 50 },
  wood: { density: 0.9, friction: 0.7, bounce: 0, hp: 10, points: 100 },
  ice: { density: 1.0, friction: 0.12, bounce: 0, hp: 5, points: 80 },
  bucket: { density: 0.6, friction: 0.6, bounce: 0.15, hp: Infinity, points: 0 },
  ball: { density: 0.25, friction: 0.5, bounce: 0.7, hp: Infinity, points: 0 },
  rock: { density: 0, friction: 0.8, bounce: 0, hp: Infinity, points: 0 },
  crab: { density: 0.9, friction: 0.9, bounce: 0, hp: 1, points: CRAB_POINTS },
};
export const CRAB_W = 0.9;
export const CRAB_H = 0.6;
export const BUCKET_W = 0.8;
export const BUCKET_H = 0.9;

// The coconuts. `tap` says what a tap does while it flies.
export const NUTS = {
  coco: { r: 0.4, density: 2.0, friction: 0.6, bounce: 0.15 },
  split: { r: 0.4, density: 2.0, friction: 0.6, bounce: 0.15, tap: 'split' },
  heavy: { r: 0.55, density: 5, friction: 0.7, bounce: 0.05 },
  pineapple: { r: 0.42, density: 1.6, friction: 0.6, bounce: 0.1, tap: 'burst' },
  bit: { r: 0.3, density: 2.0, friction: 0.6, bounce: 0.15 }, // a third of a split coconut
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// Build a level: ground, rocks and pier decks (fixed), blocks, balls and crabs, then let it
// settle quietly so it starts at rest.
export function createLevel(L) {
  const world = createWorld();
  addBody(world, { shape: 'box', width: L.width + 200, height: 10, x: L.width / 2, y: -5, kind: 'ground', mat: 'rock', friction: 0.8 });
  for (const p of L.pieces) addPiece(world, p);
  const s = {
    level: L,
    world,
    ammo: L.ammo.slice(1),
    loaded: L.ammo[0],
    status: 'ready', // 'ready' | 'flying' | 'clear' | 'won' | 'lost'
    statusT: 0,
    shotT: 0,
    calmT: 0,
    shots: 0,
    score: 0,
    stars: 0,
    time: 0,
    tapped: false, // the special of the coconut in flight has been used
    lastShot: null,
    events: [],
    grace: true,
  };
  for (let i = 0; i < SETTLE_STEPS; i++) stepPhysics(s);
  s.grace = false;
  for (const b of world.bodies) {
    if (b.kind === 'crab') b.homeY = b.y;
    b.start = { x: b.x, y: b.y, a: b.a };
  }
  s.events.length = 0;
  return s;
}

function addPiece(world, p) {
  const m = MATERIALS[p.t];
  if (p.t === 'ball') {
    return addBody(world, { shape: 'circle', r: p.r || 0.5, x: p.x, y: p.y, kind: 'ball', mat: 'ball', ...m, hp: Infinity, dmg: 0 });
  }
  const kind = p.t === 'crab' ? 'crab' : p.t === 'rock' ? 'rock' : 'block';
  const width = p.t === 'crab' ? CRAB_W : p.t === 'bucket' ? BUCKET_W : p.w;
  const height = p.t === 'crab' ? CRAB_H : p.t === 'bucket' ? BUCKET_H : p.h;
  return addBody(world, {
    shape: 'box', width, height, x: p.x, y: p.y, a: p.a || 0,
    kind, mat: p.t, density: m.density, friction: m.friction, bounce: m.bounce, hp: m.hp, dmg: 0,
    look: p.look,
  });
}

// ---------- queries ----------

export const crabs = (s) => s.world.bodies.filter((b) => b.kind === 'crab');
export const nuts = (s) => s.world.bodies.filter((b) => b.kind === 'nut');
export const blocks = (s) => s.world.bodies.filter((b) => b.kind === 'block' || b.kind === 'ball');
export const coconutsLeft = (s) => s.ammo.length + (s.loaded ? 1 : 0);
export const canFire = (s) => s.status === 'ready' && !!s.loaded;
// One star for clearing, one more for each coconut left over, up to three.
export const starsFor = (left) => Math.min(3, 1 + Math.max(0, left));

export function launchVelocity(angle, power) {
  const a = clamp(angle, ANGLE_MIN, ANGLE_MAX);
  const v = clamp(power, 0, 1) * MAX_SPEED;
  return { vx: Math.cos(a) * v, vy: Math.sin(a) * v };
}

// The path a coconut would fly with nothing in the way: the same integration the world
// uses, so the dotted preview and the real flight match. Stops at the sand, or at `stop`.
export function flightPath(angle, power, { steps = 240, every = 1, stop } = {}) {
  let { vx, vy } = launchVelocity(angle, power);
  let x = SLING.x;
  let y = SLING.y;
  const pts = [];
  for (let i = 1; i <= steps; i++) {
    vy += GRAVITY * DT;
    x += vx * DT;
    y += vy * DT;
    if (i % every === 0) pts.push({ x, y, t: i * DT });
    if (y < 0 || (stop && stop(x, y))) break;
  }
  return pts;
}

// ---------- actions ----------

export function fire(s, angle, power) {
  if (!canFire(s) || power < MIN_POWER) return false;
  const type = s.loaded;
  const n = NUTS[type];
  const { vx, vy } = launchVelocity(angle, power);
  const b = addBody(s.world, {
    shape: 'circle', r: n.r, x: SLING.x, y: SLING.y, density: n.density, friction: n.friction, bounce: n.bounce,
    kind: 'nut', nut: type, hp: Infinity, dmg: 0, shot: s.shots + 1,
  });
  b.vx = vx;
  b.vy = vy;
  b.w = -vx * 0.6;
  s.loaded = null;
  s.shots++;
  s.status = 'flying';
  s.statusT = 0;
  s.shotT = 0;
  s.calmT = 0;
  s.tapped = false;
  s.lastShot = { angle, power, type };
  s.events.push({ type: 'fire', nut: type, x: SLING.x, y: SLING.y });
  return true;
}

// A tap while a special coconut flies: split into three, or burst. Returns true if it did.
export function activate(s) {
  if (s.tapped) return false;
  const b = nuts(s).find((q) => q.shot === s.shots && !q.landed);
  if (!b) return false;
  const what = NUTS[b.nut].tap;
  if (!what) return false;
  s.tapped = true;
  if (what === 'split') split(s, b);
  else burst(s, b);
  return true;
}

function split(s, b) {
  removeBody(s.world, b);
  const sp = Math.hypot(b.vx, b.vy);
  const dir = Math.atan2(b.vy, b.vx);
  const n = NUTS.bit;
  for (let k = -1; k <= 1; k++) {
    const a = dir + k * SPLIT_SPREAD;
    // spread the three across the line of flight so they don't start overlapping
    const ox = -Math.sin(dir) * k * n.r * 2.1;
    const oy = Math.cos(dir) * k * n.r * 2.1;
    const q = addBody(s.world, {
      shape: 'circle', r: n.r, x: b.x + ox, y: b.y + oy, density: n.density, friction: n.friction, bounce: n.bounce,
      kind: 'nut', nut: 'bit', hp: Infinity, dmg: 0, shot: b.shot, landed: false,
    });
    q.vx = Math.cos(a) * sp;
    q.vy = Math.sin(a) * sp;
    q.w = b.w;
  }
  s.events.push({ type: 'split', x: b.x, y: b.y });
}

function burst(s, b) {
  removeBody(s.world, b);
  s.tapped = true;
  for (const q of s.world.bodies.slice()) {
    if (!q.im || q.dead) continue;
    const dx = q.x - b.x;
    const dy = q.y - b.y;
    const d = Math.hypot(dx, dy);
    if (d > BURST_R) continue;
    const push = BURST_PUSH * (1 - d / BURST_R);
    const nx = d > 1e-6 ? dx / d : 0;
    const ny = d > 1e-6 ? dy / d : 1;
    q.vx += nx * push * q.im;
    q.vy += (ny * push + push * 0.3) * q.im;
    q.w += (nx >= 0 ? -1 : 1) * push * 0.5 * q.iI * 0.1;
    if (q.kind === 'block' || q.kind === 'crab') q.dmg += push * BURST_HARM;
  }
  s.events.push({ type: 'burst', x: b.x, y: b.y, r: BURST_R });
  breakDamaged(s);
}

// ---------- stepping ----------

// One fixed step of the world, with damage from hard knocks.
function stepPhysics(s) {
  const w = s.world;
  const arbs = findContacts(w);
  applyGravity(w);
  if (!s.grace) {
    for (const arb of arbs.values()) {
      const { a, b } = arb;
      let hit = 0;
      let at = null;
      for (const k of arb.contacts) {
        const vn = -closingSpeed(arb, k);
        if (vn > hit) {
          hit = vn;
          at = k;
        }
      }
      // a flying coconut lands the first time it touches anything
      for (const q of [a, b]) if (q.kind === 'nut' && !q.landed) {
        q.landed = true;
        q.landedAt = s.time;
      }
      if (hit < IMPACT_MIN) continue;
      const mu = 1 / (a.im + b.im); // how much the two shove each other
      const harm = mu * (hit - IMPACT_MIN) * (a.im && b.im ? 1 : GROUND_HARM);
      a.dmg += harm;
      b.dmg += harm;
      if (hit > 3) {
        s.events.push({
          type: 'thud', x: at.x, y: at.y, speed: hit, ids: [a.id, b.id],
          heavy: (a.nut === 'heavy' || b.nut === 'heavy') && hit > 6,
        });
      }
    }
    breakDamaged(s);
    // a pineapple bursts on its first touch
    for (const q of w.bodies.slice()) {
      if (q.kind === 'nut' && q.nut === 'pineapple' && q.landed && !q.dead && q.shot === s.shots && !s.tapped) burst(s, q);
    }
  }
  solve(w);
}

// Blocks and crabs knocked harder than they can take break or pop. A coconut that breaks a
// block keeps going, slowed by however much the block could take.
function breakDamaged(s) {
  const w = s.world;
  for (const b of w.bodies.slice()) {
    if (b.dead || b.dmg < b.hp) continue;
    if (b.kind === 'block') {
      // whatever smashed into it carries on through, slowed by what the block could take
      for (const arb of w.arbiters.values()) {
        if (arb.a !== b && arb.b !== b) continue;
        const o = arb.a === b ? arb.b : arb.a;
        if (!o.im || o.dead) continue;
        const k = arb.contacts[0];
        const sign = arb.a === o ? 1 : -1; // the normal points from a to b
        const dx = sign * k.nx;
        const dy = sign * k.ny;
        const into = o.vx * dx + o.vy * dy;
        if (into <= 0) continue;
        const dv = Math.min(into, b.hp * o.im * 1.5 + PUNCH_LOSS);
        o.vx -= dx * dv;
        o.vy -= dy * dv;
      }
      breakBlock(s, b);
    } else if (b.kind === 'crab') {
      popCrab(s, b, 'hit');
    }
  }
  // drop contacts with anything removed
  for (const [key, arb] of w.arbiters) if (arb.a.dead || arb.b.dead) w.arbiters.delete(key);
}

function breakBlock(s, b) {
  removeBody(s.world, b);
  s.score += MATERIALS[b.mat].points;
  s.events.push({ type: 'break', mat: b.mat, x: b.x, y: b.y, w: b.hw * 2, h: b.hh * 2, a: b.a, look: b.look });
}

function popCrab(s, b, why) {
  removeBody(s.world, b);
  s.score += CRAB_POINTS;
  s.events.push({ type: 'pop', why, x: b.x, y: b.y, points: CRAB_POINTS });
}

const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function step(s) {
  s.time += DT;
  s.statusT += DT;
  stepPhysics(s);
  const L = s.level;
  // fallen, tipped or lost crabs pop; anything far off the beach goes
  for (const b of s.world.bodies.slice()) {
    if (!b.im) continue;
    const gone = b.y < -3 || b.x < -6 || b.x > L.width + 8;
    if (b.kind === 'crab' && (gone || b.y < b.homeY - CRAB_FALL || Math.abs(wrapAngle(b.a)) > CRAB_TIP)) popCrab(s, b, gone ? 'gone' : 'fell');
    else if (gone) removeBody(s.world, b);
  }
  const left = crabs(s).length;
  if (left === 0 && (s.status === 'ready' || s.status === 'flying')) {
    s.status = 'clear';
    s.statusT = 0;
    s.stars = starsFor(coconutsLeft(s));
    s.loaded = null;
    s.events.push({ type: 'clear' });
  } else if (s.status === 'clear' && s.statusT >= CLEAR_DELAY) {
    s.status = 'won';
    s.statusT = 0;
    s.events.push({ type: 'won', stars: s.stars });
  } else if (s.status === 'flying') {
    s.shotT += DT;
    s.calmT = isCalm(s) ? s.calmT + DT : 0;
    const calm = s.calmT >= CALM_TIME && s.shotT > 0.6;
    if (s.ammo.length && (calm || s.shotT >= RELOAD_MAX)) reload(s);
    else if (!s.ammo.length && (calm || s.shotT >= SHOT_MAX)) {
      s.status = 'lost';
      s.statusT = 0;
      s.events.push({ type: 'lost' });
    }
  }
  if (s.events.length > 400) s.events.splice(0, s.events.length - 400);
}

export function isCalm(s) {
  for (const b of s.world.bodies) {
    if (!b.im) continue;
    if (Math.hypot(b.vx, b.vy) > CALM_SPEED || Math.abs(b.w) > CALM_SPEED * 2) return false;
  }
  return true;
}

// The next coconut goes in the slingshot; spent coconuts lying about puff away.
function reload(s) {
  for (const b of nuts(s)) {
    removeBody(s.world, b);
    s.events.push({ type: 'poof', x: b.x, y: b.y });
  }
  s.loaded = s.ammo.shift();
  s.status = 'ready';
  s.statusT = 0;
  s.events.push({ type: 'reload', nut: s.loaded });
}

// Step for `secs` seconds (a whole number of fixed steps).
export function run(s, secs) {
  const n = Math.round(secs / DT);
  for (let i = 0; i < n; i++) step(s);
}

// Step until cond(s) holds or `secs` pass. Returns whether it held.
export function until(s, cond, secs = 20) {
  const n = Math.round(secs / DT);
  for (let i = 0; i < n && !cond(s); i++) step(s);
  return cond(s);
}

export const cloneState = (s) => {
  const { level } = s;
  const c = structuredClone({ ...s, level: null });
  c.level = level;
  return c;
};
