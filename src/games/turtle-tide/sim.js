// Turtle Tide rules. Pure: no DOM, no Math.random (a seeded generator lives in the state).
// The player is the tide: setTide(state, height) asks the water to rise or fall to a height,
// and a baby sea turtle walks (or swims) to the right by itself.
// Side-on world: x runs right, heights run UP from the sea bed (y = 0) to WORLD_H.

// ---------------------------------------------------------------------------------------------
// Tuning. These are the numbers to change by feel on the iPad.
// ---------------------------------------------------------------------------------------------

export const WORLD_H = 240; // world height in units; the screen always shows all of it
export const VIEW_W = 230; // the narrowest slice of world (units) a portrait screen shows across

// The turtle
export const TURTLE_W = 30; // shell length; the collision box is TURTLE_W x TURTLE_H
export const TURTLE_H = 16; // shell height
export const WALK_SPEED = 26; // units/s on sand (a 230-unit screen takes about 9 s to cross)
export const SWIM_SPEED = 38; // units/s at the surface; swimming is a bit quicker than walking
export const FALL_WALK = 0.5; // horizontal speed while dropping off a ledge, as a share of walking
export const STEP_H = 8; // the tallest step a walking turtle climbs; anything taller blocks it
export const FLOAT_SINK = 9; // a floating turtle's belly rides this far under the surface,
//                             so it floats once the water is this deep over the ground
export const SWIM_CLIMB = 14; // a swimming turtle can haul itself onto a ledge up to this far
//                               above its belly (5 units above the surface)
export const BUOY_SPEED = 150; // units/s a floating turtle rises or sinks to follow the surface
export const GRAVITY = 700; // units/s^2 when dropping off a ledge in the air
export const SINK_SPEED = 70; // a turtle left above the ground in shallow water sinks no faster

// The tide
export const TIDE_SPEED = 60; // the most the water level moves per second (units/s)
export const TIDE_EASE = 5; // how quickly the water closes the gap to the finger (per second)
export const SWELL_DEFAULT_PERIOD = 6; // seconds per wave on levels with an automatic swell

// Mishaps and checkpoints
export const EEP_TIME = 0.7; // the turtle freezes and squeaks for this long after a crab or jelly
export const RETURN_TIME = 1.1; // then hops back to the last sandcastle over this long
export const SAFE_TIME = 1.5; // and can't be bothered again for this long afterwards
export const HIT_INSET = 4; // the turtle's box is shrunk by this on each side for crab/jelly touches

// Crabs: patrol dry sand between two x's; hide in their shell once the water covers them
export const CRAB_W = 22;
export const CRAB_H = 12;
export const CRAB_SPEED = 20; // units/s
export const CRAB_HIDE = 6; // water this deep over a crab's sand makes it hide (harmless)
export const CRAB_PAUSE = [0.3, 1.2]; // seconds a crab waits at each end of its patrol (seeded)

// Jellyfish: drift at the surface; flop harmlessly onto the sand when the water is too shallow
export const JELLY_R = 9; // radius of the bell
export const JELLY_SPEED = 9; // units/s drifting left and right
export const JELLY_FLOAT = 15; // water must be at least this deep under a jelly for it to float
export const JELLY_BOB = 2.5; // how far a floating jelly bobs up and down

// Driftwood logs: held in place sideways (between rocks), float up and down with the water
export const LOG_H = 20; // log thickness; it's a platform and a wall
export const LOG_SINK = 8; // a floating log's bottom is this far under the surface (12 stick out)
export const LOG_RISE = 110; // units/s a log can rise
export const LOG_FALL = 160; // units/s a log can drop when the water leaves it

// Starfish
export const STARFISH_R = 15; // how close the turtle's middle must come to pick one up
export const STARFISH = 3; // per level

export const STEP = 1 / 120; // fixed physics step

// ---------------------------------------------------------------------------------------------

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const approach = (v, target, max) => (v < target ? Math.min(target, v + max) : Math.max(target, v - max));

function rand(s) {
  s.rng = (s.rng + 0x6d2b79f5) | 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const randIn = (s, [a, b]) => a + (b - a) * rand(s);

// ---------- terrain ----------

// Ground height at x. The ground is a list of [x, height] points joined by straight lines;
// two points at the same x make a sheer wall (the higher one counts at the wall itself).
export function groundAt(pts, x) {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x1, h1] = pts[i];
    if (x < x1) {
      const [x0, h0] = pts[i - 1];
      return x1 === x0 ? Math.max(h0, h1) : h0 + ((h1 - h0) * (x - x0)) / (x1 - x0);
    }
    if (x === x1) {
      let h = h1;
      for (let j = i + 1; j < pts.length && pts[j][0] === x; j++) h = Math.max(h, pts[j][1]);
      return Math.max(h, pts[i - 1][0] === x ? pts[i - 1][1] : -Infinity);
    }
  }
  return pts[pts.length - 1][1];
}

// The highest ground anywhere over [a, b].
export function groundMax(pts, a, b) {
  let m = Math.max(groundAt(pts, a), groundAt(pts, b));
  for (const [x, h] of pts) if (x > a && x < b && h > m) m = h;
  return m;
}

// Every solid block overlapping [a, b] sideways: rocks (fixed) and logs (moving).
function solidsIn(s, a, b, skip = null) {
  const out = [];
  for (const r of s.level.rocks || []) if (r.x0 < b && r.x1 > a) out.push({ top: r.y1, bottom: r.y0 });
  for (const lg of s.logs) {
    if (lg === skip) continue;
    if (lg.x < b && lg.x + lg.w > a) out.push({ top: lg.y + LOG_H, bottom: lg.y, log: lg });
  }
  return out;
}

// What a box [a, b] with its bottom at y meets: the floor it can stand on (stepping up to
// `climb`), the lowest ceiling above its head (height h), and anything in the way.
function probe(s, a, b, y, h, climb, skip) {
  const gm = groundMax(s.level.ground, a, b);
  let floor = gm;
  let ceil = Infinity;
  let hit = gm > y + climb ? 'wall' : null;
  for (const o of solidsIn(s, a, b, skip)) {
    if (o.top <= y + climb) floor = Math.max(floor, o.top);
    else if (o.bottom >= y + h - 0.01) ceil = Math.min(ceil, o.bottom);
    else if (!hit || hit === 'wall') hit = o.log ? 'wall' : 'bonk'; // rocks hang down: duck under them
  }
  if (!hit && Math.max(y, floor) + h > ceil + 0.01) hit = 'bonk';
  return { floor, ceil, hit };
}

// The ground (or rock top / log top) under the turtle and the lowest ceiling over it.
function turtleFloor(s, x, y) {
  const t = TURTLE_W / 2;
  return probe(s, x - t, x + t, y, TURTLE_H, STEP_H, null);
}

// ---------- building a level ----------

export function createLevel(level, seed = 1) {
  const s = {
    level,
    rng: seed | 0 || 1,
    time: 0, // playing time (stops at the win)
    now: 0, // always ticking, for drawing
    acc: 0,
    status: 'play', // 'play' | 'won'
    statusT: 0,
    base: level.tide.start, // the water level the player has set (before any swell)
    target: level.tide.start, // where the finger wants the water
    water: level.tide.start, // the actual surface height
    waterV: 0, // units/s, for drawing ripples
    touched: false, // has the player moved the tide yet
    turtle: null,
    logs: (level.logs || []).map((l, i) => ({ id: i, x: l.x, w: l.w, y: 0 })),
    crabs: (level.crabs || []).map((c, i) => ({ id: i, x0: c.x0, x1: c.x1, x: c.x ?? c.x0, y: 0, dir: 1, pause: 0, hidden: false, hiddenT: 0 })),
    jellies: (level.jellies || []).map((j, i) => ({ id: i, x0: j.x0, x1: j.x1, x: j.x ?? (j.x0 + j.x1) / 2, y: 0, dir: i % 2 ? -1 : 1, rest: false, restT: 0, phase: 0 })),
    starfish: level.starfish.map((p, i) => ({ id: i, x: p[0], y: p[1], got: false, gotT: 0 })),
    checkpoints: (level.checkpoints || []).map((x) => ({ x, reached: false, reachedT: 0 })),
    checkpoint: level.start, // x the turtle returns to after a mishap
    mishaps: 0,
    bonks: 0,
    events: [], // { type, t, x, y } for drawing: 'star', 'eep', 'bonk', 'bump', 'splash', 'flag', 'hide', 'win'
    stars: 0,
  };
  for (const c of s.crabs) {
    c.pause = rand(s) * 0.8;
    c.dir = rand(s) < 0.5 ? -1 : 1;
  }
  for (const j of s.jellies) j.phase = rand(s) * Math.PI * 2;
  // logs settle where the starting water puts them
  for (const lg of s.logs) lg.y = logRest(s, lg);
  const x = level.start;
  const t = {
    x,
    y: 0,
    vy: 0,
    mode: 'walk', // 'walk' | 'swim' | 'fall' | 'eep' | 'return'
    blocked: null, // null | 'wall' | 'bonk' while pressed against something
    blockedT: 0, // seconds blocked in a row
    modeT: 0,
    safe: 0,
    walked: 0, // distance moved, for flipper animation
    from: null,
    to: null,
  };
  s.turtle = t;
  t.y = turtleFloor(s, x, WORLD_H).floor;
  if (s.water - FLOAT_SINK > t.y) t.y = s.water - FLOAT_SINK;
  return s;
}

// Where a log would sit right now with nothing moving: floating, or resting on whatever is under it.
function logRest(s, lg) {
  const p = probe(s, lg.x, lg.x + lg.w, lg.y, LOG_H, Infinity, lg);
  return Math.max(p.floor, s.water - LOG_SINK);
}

// ---------- input ----------

// Ask the water to go to `height` (clamped to the level's tide range). The water follows at
// most TIDE_SPEED units per second.
export function setTide(s, height) {
  const { min, max } = s.level.tide;
  s.target = clamp(height, min, max);
  if (Math.abs(s.target - s.level.tide.start) > 2) s.touched = true;
}

// ---------- stepping ----------

export function step(s, dt) {
  s.acc += Math.min(dt, 0.25);
  while (s.acc >= STEP) {
    s.acc -= STEP;
    tick(s, STEP);
  }
}

function event(s, type, x, y) {
  s.events.push({ type, t: s.now, x, y });
  if (s.events.length > 40) s.events.shift();
}

function tick(s, dt) {
  s.now += dt;
  if (s.status === 'play') s.time += dt;
  else s.statusT += dt;
  moveWater(s, dt);
  for (const lg of s.logs) moveLog(s, lg, dt);
  for (const c of s.crabs) moveCrab(s, c, dt);
  for (const j of s.jellies) moveJelly(s, j, dt);
  moveTurtle(s, dt);
  if (s.status !== 'play') return;
  const t = s.turtle;
  if (t.mode !== 'eep' && t.mode !== 'return') {
    collectStarfish(s);
    reachCheckpoints(s);
    if (t.safe <= 0 && touchingDanger(s)) mishap(s);
  }
  if (t.x >= s.level.goal) {
    s.status = 'won';
    s.statusT = 0;
    s.stars = starsFor(s);
    event(s, 'win', t.x, s.water);
  }
}

function moveWater(s, dt) {
  const before = s.water;
  const gap = s.target - s.base;
  s.base += clamp(gap * TIDE_EASE * dt, -TIDE_SPEED * dt, TIDE_SPEED * dt);
  if (Math.abs(s.target - s.base) < 0.05) s.base = s.target;
  s.water = s.base + swellAt(s.level, s.now);
  s.waterV = (s.water - before) / dt;
}

// The automatic swell on top of the player's water level (0 on most levels).
export function swellAt(level, t) {
  const sw = level.swell;
  if (!sw) return 0;
  return sw.amp * Math.sin((t * Math.PI * 2) / (sw.period || SWELL_DEFAULT_PERIOD));
}

function moveLog(s, lg, dt) {
  const p = probe(s, lg.x, lg.x + lg.w, lg.y, LOG_H, LOG_H * 0.5, lg);
  let ceil = p.ceil;
  // a turtle riding the log can't be squashed into a rock: the log stops rising
  const t = s.turtle;
  if (t && Math.abs(t.y - (lg.y + LOG_H)) < 1 && t.x + TURTLE_W / 2 > lg.x && t.x - TURTLE_W / 2 < lg.x + lg.w) {
    ceil = Math.min(ceil, turtleFloor(s, t.x, t.y).ceil - TURTLE_H);
  }
  const want = Math.min(Math.max(p.floor, s.water - LOG_SINK), ceil - LOG_H);
  lg.y = approach(lg.y, Math.max(want, p.floor), (want > lg.y ? LOG_RISE : LOG_FALL) * dt);
}

function moveCrab(s, c, dt) {
  const g = groundMax(s.level.ground, c.x - CRAB_W / 2, c.x + CRAB_W / 2);
  c.y = g;
  const hidden = s.water >= g + CRAB_HIDE;
  if (hidden && !c.hidden) event(s, 'hide', c.x, g);
  c.hidden = hidden;
  c.hiddenT = hidden ? c.hiddenT + dt : 0;
  if (hidden) return;
  if (c.pause > 0) {
    c.pause -= dt;
    return;
  }
  c.x += c.dir * CRAB_SPEED * dt;
  if (c.x >= c.x1 || c.x <= c.x0) {
    c.x = clamp(c.x, c.x0, c.x1);
    c.dir = c.x >= c.x1 ? -1 : 1;
    c.pause = randIn(s, CRAB_PAUSE);
  }
}

function moveJelly(s, j, dt) {
  const g = groundMax(s.level.ground, j.x - JELLY_R, j.x + JELLY_R);
  const rest = s.water - g < JELLY_FLOAT;
  j.rest = rest;
  j.restT = rest ? j.restT + dt : 0;
  if (rest) {
    j.y = approach(j.y, g + JELLY_R * 0.45, 120 * dt);
    return;
  }
  j.x += j.dir * JELLY_SPEED * dt;
  if (j.x >= j.x1 || j.x <= j.x0) {
    j.x = clamp(j.x, j.x0, j.x1);
    j.dir = j.x >= j.x1 ? -1 : 1;
  }
  const want = s.water - JELLY_R * 0.4 + Math.sin(s.now * 2.2 + j.phase) * JELLY_BOB;
  j.y = approach(j.y, want, 160 * dt);
}

function moveTurtle(s, dt) {
  const t = s.turtle;
  t.modeT += dt;
  if (t.safe > 0) t.safe -= dt;
  if (t.mode === 'eep') {
    if (t.modeT >= EEP_TIME) {
      t.mode = 'return';
      t.modeT = 0;
      t.from = { x: t.x, y: t.y };
    }
    return;
  }
  if (t.mode === 'return') {
    const k = Math.min(1, t.modeT / RETURN_TIME);
    const tx = s.checkpoint;
    const ty = Math.max(turtleFloor(s, tx, WORLD_H).floor, s.water - FLOAT_SINK);
    const e = k * k * (3 - 2 * k);
    t.x = t.from.x + (tx - t.from.x) * e;
    t.y = t.from.y + (ty - t.from.y) * e + Math.sin(k * Math.PI) * 40;
    if (k >= 1) {
      t.x = tx;
      t.y = ty;
      t.vy = 0;
      t.mode = 'walk';
      t.modeT = 0;
      t.safe = SAFE_TIME;
      t.blocked = null;
      t.blockedT = 0;
    }
    return;
  }

  // forwards: always to the right
  const swimming = t.mode === 'swim';
  const falling = t.mode === 'fall';
  const speed = swimming ? SWIM_SPEED : falling ? WALK_SPEED * FALL_WALK : WALK_SPEED;
  const climb = swimming ? SWIM_CLIMB : falling ? 0 : STEP_H;
  const dx = speed * dt;
  const half = TURTLE_W / 2;
  const p = probe(s, t.x - half + dx, t.x + half + dx, t.y, TURTLE_H, climb, null);
  if (p.hit) {
    if (t.blocked !== p.hit && s.status === 'play') {
      if (p.hit === 'bonk') s.bonks++;
      event(s, p.hit === 'bonk' ? 'bonk' : 'bump', t.x + half, t.y + TURTLE_H);
    }
    t.blocked = p.hit;
    t.blockedT += dt;
  } else {
    t.x += dx;
    t.walked += dx;
    if (p.floor > t.y) t.y = p.floor;
    t.blocked = null;
    t.blockedT = 0;
  }

  // up and down: float with the water, stand on the ground, or drop
  const f = turtleFloor(s, t.x, t.y);
  const floatY = s.water - FLOAT_SINK;
  const was = t.mode;
  if (t.y < f.floor) t.y = f.floor;
  if (floatY > f.floor + 0.01) {
    // deep enough to float: ride the surface (or as high as a rock overhead allows)
    const want = Math.max(f.floor, Math.min(floatY, f.ceil - TURTLE_H));
    if (t.y > want + 1 && t.y > s.water) {
      // dropping into the water from a ledge
      t.vy -= GRAVITY * dt;
      t.y = Math.max(want, t.y + t.vy * dt);
      t.mode = t.y > want ? 'fall' : 'swim';
    } else {
      t.y = approach(t.y, want, BUOY_SPEED * dt);
      t.vy = 0;
      t.mode = 'swim';
    }
  } else if (t.y > f.floor + 0.01) {
    t.vy -= GRAVITY * dt;
    if (t.y < s.water) t.vy = Math.max(t.vy, -SINK_SPEED);
    t.y = Math.max(f.floor, t.y + t.vy * dt);
    t.mode = t.y > f.floor + 0.01 ? 'fall' : 'walk';
    if (t.mode === 'walk') t.vy = 0;
  } else {
    t.y = f.floor;
    t.vy = 0;
    t.mode = 'walk';
  }
  if (t.mode === 'swim' && was !== 'swim' && was !== 'return') event(s, 'splash', t.x, s.water);
  if (t.mode !== was) t.modeT = 0;
}

function collectStarfish(s) {
  const t = s.turtle;
  const cy = t.y + TURTLE_H / 2;
  for (const sf of s.starfish) {
    if (sf.got) continue;
    if (Math.hypot(sf.x - t.x, sf.y - cy) < STARFISH_R) {
      sf.got = true;
      sf.gotT = s.now;
      event(s, 'star', sf.x, sf.y);
    }
  }
}

function reachCheckpoints(s) {
  const t = s.turtle;
  for (const cp of s.checkpoints) {
    if (!cp.reached && t.x >= cp.x) {
      cp.reached = true;
      cp.reachedT = s.now;
      s.checkpoint = cp.x;
      event(s, 'flag', cp.x, 0);
    }
  }
}

// The turtle's box, shrunk a little so touches have to be real.
function turtleBox(t) {
  return { a: t.x - TURTLE_W / 2 + HIT_INSET, b: t.x + TURTLE_W / 2 - HIT_INSET, lo: t.y + 2, hi: t.y + TURTLE_H - 2 };
}

// What would hurt the turtle right now: an awake crab or a floating jelly it overlaps.
export function touchingDanger(s) {
  const bx = turtleBox(s.turtle);
  for (const c of s.crabs) {
    if (c.hidden) continue;
    if (c.x + CRAB_W / 2 > bx.a && c.x - CRAB_W / 2 < bx.b && c.y + CRAB_H > bx.lo && c.y < bx.hi) return { kind: 'crab', who: c };
  }
  for (const j of s.jellies) {
    if (j.rest) continue;
    if (j.x + JELLY_R > bx.a && j.x - JELLY_R < bx.b && j.y + JELLY_R > bx.lo && j.y - JELLY_R < bx.hi) return { kind: 'jelly', who: j };
  }
  return null;
}

function mishap(s) {
  const t = s.turtle;
  t.mode = 'eep';
  t.modeT = 0;
  t.blocked = null;
  t.blockedT = 0;
  s.mishaps++;
  event(s, 'eep', t.x, t.y + TURTLE_H);
}

// Stars: one for reaching the sea, two with two starfish, three with all three.
export function starsFor(s) {
  const got = s.starfish.filter((f) => f.got).length;
  return 1 + (got >= 2 ? 1 : 0) + (got >= 3 ? 1 : 0);
}

// The nav lists in levels.js: [[x, tide], ...] means "once the turtle is past x, set the tide
// to this height". The tide wanted for a turtle at x (or null before the first waypoint).
export function navTarget(nav, x) {
  let want = null;
  for (const [nx, h] of nav) if (x >= nx) want = h;
  return want;
}
