// Domino Dash rules. Pure: no DOM, no randomness, no clock except the dt step() is given.
//
// The table is a flat rectangle in world units, x to the right and y down the screen (towards
// the player). Angles are radians in that plane; -PI/2 points up the table. Levels give them
// in degrees.
//
// Laying: a stroke starts at an open end (the start domino, a gadget's output domino or the
// last domino of a trail) and dominoes are laid behind the finger at a fixed spacing, each
// facing along the way it was laid. Where the next spot is blocked (a cup, a gap between
// tables, another domino) the trail snugs up to the edge and, once the finger is past it,
// carries on from the first free spot beyond. Whether the chain gets over that gap is then
// up to the toppling.
//
// Toppling: a falling domino tips over its front edge along its facing. As it falls its top
// sweeps forward; anything standing in a narrow cone ahead of it within REACH gets struck at
// the moment the top gets there. A struck domino falls the way it faces (or backwards, if hit
// from behind) unless the push comes from too far round the side: then it only wobbles and
// the chain stops there. Each domino falls a little faster than the one before.

export const DOM_L = 24; // standing height
export const DOM_W = 12; // width across the face
export const DOM_T = 5; // thickness, along the way it falls
export const SPACING = 14; // laid dominoes, centre to centre
export const MIN_STEP = 9; // the closest a domino is laid to the one before, snugging up to an edge
export const MIN_SEP = 9; // no two dominoes closer than this
export const REACH = 20; // how far past its front edge a falling domino's top can strike
export const PERP_MAX = 7; // how far off its line a domino can stand and still be struck
export const TURN_MAX = (50 * Math.PI) / 180; // a push further round the side than this only wobbles it
export const FOOT_R = 7; // clearance from obstacles and gadgets
export const HOLE_R = 5; // clearance from the edge of a gap between tables
export const EDGE_R = 8; // clearance from the table's edge
export const PATH_R = 11; // a gadget's track keeps this clear
export const SNAP = 36; // a stroke starts this close to an open end
export const ERASE_R = 16;
export const FALL_TIME = 0.42; // seconds for the first domino to fall flat
export const FALL_MIN = 0.2; // the quickest any domino falls
export const SPEED_UP = 0.965; // each domino along the chain falls this much quicker
export const STOP_RESET = 2.4; // seconds after a chain stops before it stands back up (levels)
export const SPLIT_TIME = 0.12;
export const SPLIT_R = 22; // a splitter's outputs sit this far from its middle
export const GOAL_R = 16; // a goal's trigger radius
export const GOAL_BODY = 14; // and the part laying keeps clear of
export const GADGET_R = 14;

// How each carrier gadget moves: a wind-up, then travel at a speed (units/s) or a fixed time.
export const CARRIERS = {
  ball: { windup: 0.15, speed: 170 }, // a marble rolls down a ramp and along a chute
  car: { windup: 0.35, speed: 140 }, // a wind-up toy car drives across a plank
  fan: { windup: 0.5, speed: 110 }, // a fan switches on and blows a beach ball across
  seesaw: { windup: 0.2, time: 0.9 }, // a seesaw flings a ball in an arc
  rooster: { windup: 0.4, hop: 0.34, hopLen: 46 }, // a rooster hops across and pecks
};

export const GOAL_KINDS = ['popper', 'bell', 'rocket', 'pinata', 'drum'];

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const wrap = (a) => {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
};

// ---------------------------------------------------------------------------------------------
// geometry
// ---------------------------------------------------------------------------------------------

function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}

function distToRect(px, py, r) {
  const dx = Math.max(r.x0 - px, 0, px - r.x1);
  const dy = Math.max(r.y0 - py, 0, py - r.y1);
  return Math.hypot(dx, dy);
}

// Does the segment a-b pass within `pad` of the rect?
function segHitsRect(ax, ay, bx, by, r, pad) {
  const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / 3));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (distToRect(ax + (bx - ax) * t, ay + (by - ay) * t, r) < pad) return true;
  }
  return false;
}

export function pathLength(path) {
  let len = 0;
  for (let i = 1; i < path.length; i++) len += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  return len;
}

// The point `d` units along a path of [x, y] points, and the way it is heading there.
export function pointAlong(path, d) {
  for (let i = 1; i < path.length; i++) {
    const [ax, ay] = path[i - 1];
    const [bx, by] = path[i];
    const l = Math.hypot(bx - ax, by - ay);
    if (d <= l || i === path.length - 1) {
      const t = l ? clamp(d / l, 0, 1) : 0;
      return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t, a: Math.atan2(by - ay, bx - ax) };
    }
    d -= l;
  }
  const [x, y] = path[0];
  return { x, y, a: 0 };
}

// Obstacles are circles { x, y, r } or boxes { x, y, w, h } (centred).
const asRect = (o) => ({ x0: o.x - o.w / 2, y0: o.y - o.h / 2, x1: o.x + o.w / 2, y1: o.y + o.h / 2 });
function distToObstacle(px, py, o) {
  if (o.r) return Math.hypot(px - o.x, py - o.y) - o.r;
  return distToRect(px, py, asRect(o));
}

// ---------------------------------------------------------------------------------------------
// setting up a level
// ---------------------------------------------------------------------------------------------

// Two pip counts (0-6) for a domino, from its id, so every domino looks the same each time.
export function pipsFor(id) {
  let h = (id * 2654435761) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 1274126177) >>> 0;
  return [h % 7, (h >>> 8) % 7];
}

function newDomino(s, x, y, a, extra = {}) {
  const d = {
    id: s.nextId++, x, y, a, chord: a, fixed: false, pips: null,
    state: 'stand', dir: a, t0: 0, dur: FALL_TIME, gen: 0, rest: 90, restOn: null,
    settleT: 0, pushed: 0, wobbled: 0, blocked: 0, struck: 0, wobbleT: -99, riseFrom: 0, born: s.time,
    ...extra,
  };
  d.pips = pipsFor(d.id);
  return d;
}

export function createLevel(def) {
  const s = {
    def,
    free: !!def.free,
    w: def.w,
    h: def.h,
    holes: (def.holes || []).map((r) => ({ ...r })),
    bridges: (def.bridges || []).map((r) => ({ ...r })),
    obstacles: (def.obstacles || []).map((o) => ({ ...o })),
    supply: def.supply,
    nextId: 1,
    dominoes: [],
    goals: [],
    gadgets: [],
    history: [],
    stroke: null,
    erasing: null,
    pending: [],
    status: 'build', // 'build' | 'run' | 'stopped' | 'won'
    statusT: 0,
    time: 0,
    riseT: -99,
    breaks: [],
    runs: 0,
    usedAtGo: 0,
    stars: 0,
    events: [], // { n, type, t, x, y, gen } most recent last
    eventN: 0,
    drags: 0, // strokes begun, for the first-level hint
  };
  const st = def.start;
  s.start = newDomino(s, st.x, st.y, st.a * DEG, { fixed: true, role: 'start' });
  s.dominoes.push(s.start);
  for (const g of def.goals || []) addGoal(s, g.kind, g.x, g.y, false);
  for (const g of def.gadgets || []) addGadget(s, g);
  return s;
}

function addGoal(s, kind, x, y, removable) {
  const g = { id: s.nextId++, kind, x, y, r: GOAL_R, body: GOAL_BODY, fired: false, t: 0, removable };
  s.goals.push(g);
  return g;
}

function addGadget(s, def) {
  if (def.kind === 'split') {
    const a = def.a * DEG;
    const spread = (def.spread ?? 40) * DEG;
    const g = { id: s.nextId++, kind: 'split', x: def.x, y: def.y, a, r: 12, body: 12, path: null, dur: SPLIT_TIME, state: 'idle', t0: 0, gen: 0, outs: [] };
    for (const k of [-1, 1]) {
      const oa = a + k * spread;
      const d = newDomino(s, def.x + Math.cos(oa) * SPLIT_R, def.y + Math.sin(oa) * SPLIT_R, oa, { fixed: true, role: 'out', gadget: g.id });
      s.dominoes.push(d);
      g.outs.push(d.id);
    }
    s.gadgets.push(g);
    return g;
  }
  const spec = CARRIERS[def.kind];
  const path = def.path.map((p) => [p[0], p[1]]);
  const len = pathLength(path);
  const [ex, ey] = path[path.length - 1];
  const [px, py] = path[path.length - 2];
  const oa = def.out != null ? def.out * DEG : Math.atan2(ey - py, ex - px);
  let travel;
  if (spec.time) travel = spec.time;
  else if (spec.hop) travel = Math.max(1, Math.round(len / spec.hopLen)) * spec.hop;
  else travel = len / spec.speed;
  const g = {
    id: s.nextId++, kind: def.kind, x: path[0][0], y: path[0][1], a: Math.atan2(path[1][1] - path[0][1], path[1][0] - path[0][0]),
    r: GADGET_R, body: GADGET_R, path, len, windup: spec.windup, travel, dur: spec.windup + travel, state: 'idle', t0: 0, gen: 0, outs: [],
  };
  const d = newDomino(s, ex, ey, oa, { fixed: true, role: 'out', gadget: g.id });
  s.dominoes.push(d);
  g.outs.push(d.id);
  s.gadgets.push(g);
  return g;
}

function event(s, type, x, y, extra = {}) {
  s.events.push({ n: ++s.eventN, type, t: s.time, x, y, ...extra });
  if (s.events.length > 60) s.events.shift();
}

export const laid = (s) => s.dominoes.filter((d) => !d.fixed);
export const used = (s) => s.dominoes.reduce((n, d) => n + (d.fixed ? 0 : 1), 0);
export const left = (s) => Math.max(0, s.supply - used(s));
const byId = (s, id) => s.dominoes.find((d) => d.id === id);

// ---------------------------------------------------------------------------------------------
// laying
// ---------------------------------------------------------------------------------------------

const inBridge = (s, x, y) => s.bridges.some((b) => x >= b.x0 + 2 && x <= b.x1 - 2 && y >= b.y0 - 6 && y <= b.y1 + 6);

// Why a domino can't stand at (x, y), or null if it can. `except` is a domino id to ignore
// (the one being laid from).
export function blockedAt(s, x, y, except = -1) {
  if (x < EDGE_R || y < EDGE_R || x > s.w - EDGE_R || y > s.h - EDGE_R) return 'edge';
  if (!inBridge(s, x, y) && s.holes.some((r) => distToRect(x, y, r) < HOLE_R)) return 'hole';
  for (const o of s.obstacles) if (distToObstacle(x, y, o) < FOOT_R) return 'obstacle';
  for (const g of s.goals) if (Math.hypot(x - g.x, y - g.y) < g.body + FOOT_R) return 'goal';
  for (const g of s.gadgets) {
    if (Math.hypot(x - g.x, y - g.y) < g.body + FOOT_R) return 'gadget';
    if (g.path) {
      // the track, but not its last stretch where the output domino stands
      for (let i = 1; i < g.path.length; i++) {
        const [ax, ay] = g.path[i - 1];
        let [bx, by] = g.path[i];
        if (i === g.path.length - 1) {
          const l = Math.hypot(bx - ax, by - ay);
          const k = Math.max(0, (l - SPACING) / l);
          bx = ax + (bx - ax) * k;
          by = ay + (by - ay) * k;
        }
        if (distToSeg(x, y, ax, ay, bx, by) < PATH_R) return 'gadget';
      }
    }
  }
  for (const d of s.dominoes) if (d.id !== except && Math.hypot(x - d.x, y - d.y) < MIN_SEP) return 'domino';
  return null;
}

// Is there a domino standing just in front of this one (so it isn't a trail end)?
function hasNext(s, d) {
  const ux = Math.cos(d.a);
  const uy = Math.sin(d.a);
  return s.dominoes.some((o) => {
    if (o === d) return false;
    const vx = o.x - d.x;
    const vy = o.y - d.y;
    const along = vx * ux + vy * uy;
    return along > 0 && along <= SPACING * 1.8 && Math.abs(vx * uy - vy * ux) <= 9;
  });
}

// Every place a stroke can start from: dominoes with nothing laid in front of them.
export function openEnds(s) {
  return s.dominoes.filter((d) => !hasNext(s, d));
}

// Back to standing after a run, keeping where it broke so the hint can show it.
export function standUp(s) {
  for (const d of s.dominoes) {
    d.riseFrom = d.state === 'stand' ? 0 : tiltOf(s, d);
    d.state = 'stand';
    d.dir = d.a;
    d.pushed = d.wobbled = d.blocked = d.struck = 0;
    d.rest = 90;
    d.restOn = null;
    d.wobbleT = -99;
  }
  for (const g of s.goals) g.fired = false;
  for (const g of s.gadgets) g.state = 'idle';
  s.pending = [];
  s.status = 'build';
  s.statusT = 0;
  s.riseT = s.time;
}

const editable = (s) => {
  if (s.status === 'stopped') standUp(s);
  return s.status === 'build';
};

export function beginStroke(s, x, y, snap = SNAP) {
  if (!editable(s)) return false;
  let best = null;
  let bd = snap;
  for (const d of openEnds(s)) {
    const dd = Math.hypot(d.x - x, d.y - y);
    if (dd <= bd) {
      bd = dd;
      best = d;
    }
  }
  if (!best) return false;
  s.stroke = { from: best.id, last: best, ids: [], first: best.fixed };
  s.breaks = [];
  s.drags++;
  return true;
}

function place(s, x, y, prev) {
  const chord = Math.atan2(y - prev.y, x - prev.x);
  const d = newDomino(s, x, y, chord, { chord, stroke: s.history.length });
  // the domino laid before turns to face between where it came from and where this one is
  if (!prev.fixed) prev.a = prev.chord + wrap(chord - prev.chord) / 2;
  s.dominoes.push(d);
  s.stroke.ids.push(d.id);
  s.stroke.last = d;
  s.stroke.first = false;
  event(s, 'lay', x, y);
  return d;
}

// The finger moved to (fx, fy): lay dominoes behind it.
export function strokeTo(s, fx, fy) {
  const st = s.stroke;
  if (!st) return 0;
  let n = 0;
  for (let guard = 0; guard < 400; guard++) {
    if (left(s) <= 0) {
      st.empty = true;
      break;
    }
    const P = st.last;
    const dist = Math.hypot(fx - P.x, fy - P.y);
    if (dist < SPACING) break;
    // straight out of a fixed domino first, so the chain always starts off on the right foot
    const a = st.first ? P.a : Math.atan2(fy - P.y, fx - P.x);
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const at = (t) => [P.x + ux * t, P.y + uy * t];
    let [cx, cy] = at(SPACING);
    if (!blockedAt(s, cx, cy, P.id)) {
      place(s, cx, cy, P);
      n++;
      continue;
    }
    // snug up to the edge of whatever is in the way
    let done = false;
    for (let t = SPACING - 1; t >= MIN_STEP; t--) {
      [cx, cy] = at(t);
      if (!blockedAt(s, cx, cy, P.id)) {
        place(s, cx, cy, P);
        n++;
        done = true;
        break;
      }
    }
    if (done) continue;
    // then hop to the first free spot beyond it, once the finger is past
    const reach = st.first ? SPACING * 6 : dist;
    for (let t = SPACING + 1; t <= reach; t++) {
      [cx, cy] = at(t);
      if (!blockedAt(s, cx, cy, P.id)) {
        if (Math.hypot(fx - P.x, fy - P.y) < t) break;
        place(s, cx, cy, P);
        n++;
        done = true;
        break;
      }
    }
    if (!done) break;
  }
  return n;
}

export function endStroke(s) {
  const st = s.stroke;
  s.stroke = null;
  if (st && st.ids.length) s.history.push({ type: 'lay', ids: st.ids });
  return st ? st.ids.length : 0;
}

// The eraser: a drag that removes laid dominoes (and, in free play, dropped-in goals).
export function beginErase(s) {
  if (!editable(s)) return false;
  s.erasing = { doms: [], goals: [] };
  s.breaks = [];
  return true;
}

export function eraseAt(s, x, y, r = ERASE_R) {
  const e = s.erasing;
  if (!e) return 0;
  let n = 0;
  s.dominoes = s.dominoes.filter((d) => {
    if (d.fixed || Math.hypot(d.x - x, d.y - y) > r) return true;
    e.doms.push(d);
    n++;
    return false;
  });
  s.goals = s.goals.filter((g) => {
    if (!g.removable || Math.hypot(g.x - x, g.y - y) > g.r + r * 0.5) return true;
    e.goals.push(g);
    n++;
    return false;
  });
  if (n) event(s, 'erase', x, y);
  return n;
}

export function endErase(s) {
  const e = s.erasing;
  s.erasing = null;
  if (e && (e.doms.length || e.goals.length)) s.history.push({ type: 'erase', doms: e.doms, goals: e.goals });
}

export function clearAll(s) {
  if (!editable(s)) return false;
  const doms = s.dominoes.filter((d) => !d.fixed);
  const goals = s.goals.filter((g) => g.removable);
  if (!doms.length && !goals.length) return false;
  s.dominoes = s.dominoes.filter((d) => d.fixed);
  s.goals = s.goals.filter((g) => !g.removable);
  s.history.push({ type: 'erase', doms, goals });
  s.breaks = [];
  return true;
}

// Take back the last thing done: a stroke, an erase or a clear (or a dropped-in goal).
export function undo(s) {
  if (!editable(s) || !s.history.length) return false;
  const h = s.history.pop();
  if (h.type === 'lay') {
    const ids = new Set(h.ids);
    s.dominoes = s.dominoes.filter((d) => !ids.has(d.id));
  } else if (h.type === 'erase') {
    s.dominoes.push(...h.doms);
    s.goals.push(...h.goals);
    s.dominoes.sort((a, b) => a.id - b.id);
  } else if (h.type === 'goal') {
    s.goals = s.goals.filter((g) => g.id !== h.id);
  }
  s.breaks = [];
  return true;
}

// Free play: drop a goal gadget onto the table.
export function dropGoal(s, kind, x, y) {
  if (!s.free || !editable(s)) return null;
  const clear = x > GOAL_BODY + 4 && y > GOAL_BODY + 4 && x < s.w - GOAL_BODY - 4 && y < s.h - GOAL_BODY - 4
    && !s.obstacles.some((o) => distToObstacle(x, y, o) < GOAL_BODY)
    && !s.goals.some((g) => Math.hypot(g.x - x, g.y - y) < GOAL_BODY * 2.2)
    && !s.gadgets.some((g) => Math.hypot(g.x - x, g.y - y) < GOAL_BODY + g.body)
    && !s.dominoes.some((d) => Math.hypot(d.x - x, d.y - y) < GOAL_BODY + 4);
  if (!clear) return null;
  const g = addGoal(s, kind, x, y, true);
  s.history.push({ type: 'goal', id: g.id });
  s.breaks = [];
  return g;
}

// ---------------------------------------------------------------------------------------------
// toppling
// ---------------------------------------------------------------------------------------------

export function fallTime(gen) {
  return Math.max(FALL_MIN, FALL_TIME * SPEED_UP ** gen);
}

// How far a domino has tipped (degrees, 0 standing, 90 flat), from the rules alone.
export function tiltOf(s, d) {
  if (d.state === 'stand' || d.state === 'wobble') return 0;
  const u = clamp((s.time - d.t0) / d.dur, 0, 1);
  return Math.min(d.rest, 90 * u * u);
}

const blockedLine = (s, ax, ay, bx, by) => s.obstacles.some((o) => {
  if (o.r) return distToSeg(o.x, o.y, ax, ay, bx, by) < o.r;
  return segHitsRect(ax, ay, bx, by, asRect(o), 0);
});

// The angle (degrees) a domino falling at `dir` from d has tipped when its top reaches a
// thing at (x, y) whose near side is `r` in front of its middle, or null if out of reach.
function contactAngle(d, dir, x, y, r, perpMax) {
  const ux = Math.cos(dir);
  const uy = Math.sin(dir);
  const vx = x - d.x;
  const vy = y - d.y;
  const along = vx * ux + vy * uy;
  const perp = Math.abs(vx * uy - vy * ux);
  if (along <= 0 || perp > perpMax) return null;
  const gap = along - r - DOM_T / 2;
  if (gap > REACH) return null;
  return (Math.asin(clamp(gap / DOM_L, 0, 1)) * 180) / Math.PI;
}

// Start a domino falling and work out everything it will strike on the way down.
function push(s, d, dir, gen, t) {
  d.state = 'fall';
  d.dir = dir;
  d.t0 = t;
  d.gen = gen;
  d.dur = fallTime(gen);
  d.rest = 90;
  d.restOn = null;
  const hits = [];
  const consider = (type, o, x, y, r, perpMax) => {
    const ang = contactAngle(d, dir, x, y, r, perpMax);
    if (ang == null) return;
    if (blockedLine(s, d.x, d.y, x, y)) {
      d.blocked++;
      return;
    }
    hits.push({ type, id: o.id, ang });
  };
  for (const o of s.dominoes) if (o !== d && (o.state === 'stand' || o.state === 'wobble')) consider('dom', o, o.x, o.y, DOM_T / 2, PERP_MAX);
  for (const g of s.goals) if (!g.fired) consider('goal', g, g.x, g.y, g.r, g.r + 3);
  for (const g of s.gadgets) if (g.state === 'idle' && !g.outs.includes(d.id)) consider('gadget', g, g.x, g.y, g.r, g.r + 3);
  for (const h of hits) {
    if (h.ang < d.rest) {
      d.rest = Math.max(h.ang, 8);
      d.restOn = h.type === 'dom' ? h.id : null;
    }
    s.pending.push({ t: t + d.dur * Math.sqrt(h.ang / 90), kind: 'hit', from: d.id, type: h.type, id: h.id, dir, gen });
  }
  d.settleT = t + d.dur * Math.sqrt(d.rest / 90);
}

function strike(s, p) {
  const from = byId(s, p.from);
  if (p.type === 'dom') {
    const o = byId(s, p.id);
    if (!o) return;
    if (o.state !== 'stand' && o.state !== 'wobble') {
      if (from) from.pushed++; // already on its way down: still part of the chain
      return;
    }
    const c = Math.cos(wrap(p.dir - o.a));
    if (c >= Math.cos(TURN_MAX)) push(s, o, o.a, p.gen + 1, p.t);
    else if (c <= -Math.cos(TURN_MAX)) push(s, o, o.a + Math.PI, p.gen + 1, p.t);
    else {
      o.state = 'wobble';
      o.wobbleT = p.t;
      if (from) from.wobbled++;
      event(s, 'wobble', o.x, o.y);
      return;
    }
    o.struck = p.from;
    if (from) from.pushed++;
    event(s, 'clack', o.x, o.y, { gen: p.gen + 1 });
  } else if (p.type === 'goal') {
    const g = s.goals.find((k) => k.id === p.id);
    if (from) from.pushed++;
    if (!g || g.fired) return;
    g.fired = true;
    g.t = p.t;
    event(s, 'goal', g.x, g.y, { kind: g.kind });
    if (!s.free && s.goals.every((k) => k.fired) && s.status === 'run') {
      s.status = 'won';
      s.statusT = 0;
      s.stars = starsFor(s.def, s.usedAtGo);
      event(s, 'win', g.x, g.y);
    }
  } else if (p.type === 'gadget') {
    const g = s.gadgets.find((k) => k.id === p.id);
    if (from) from.pushed++;
    if (!g || g.state !== 'idle') return;
    g.state = 'go';
    g.t0 = p.t;
    g.gen = p.gen;
    s.pending.push({ t: p.t + g.dur, kind: 'release', id: g.id });
    event(s, 'gadget', g.x, g.y, { kind: g.kind });
  }
}

function release(s, p) {
  const g = s.gadgets.find((k) => k.id === p.id);
  if (!g) return;
  g.state = 'done';
  for (const id of g.outs) {
    const d = byId(s, id);
    if (d && d.state === 'stand') {
      push(s, d, d.a, g.gen + 1, p.t);
      event(s, 'clack', d.x, d.y, { gen: g.gen + 1 });
    }
  }
  event(s, 'release', g.x, g.y, { kind: g.kind });
}

// GO: flick the start domino.
export function go(s) {
  if (s.status === 'stopped') standUp(s);
  if (s.status !== 'build') return false;
  s.stroke = null;
  s.erasing = null;
  s.status = 'run';
  s.statusT = 0;
  s.breaks = [];
  s.runs++;
  s.usedAtGo = used(s);
  push(s, s.start, s.start.a, 0, s.time);
  event(s, 'clack', s.start.x, s.start.y, { gen: 0 });
  return true;
}

// Where a carrier gadget's moving part is now: { x, y, z, k (0..1 of the trip), a }.
export function carrierPos(s, g) {
  if (!g.path) return null;
  const t = g.state === 'idle' ? 0 : g.state === 'done' ? g.dur : clamp(s.time - g.t0, 0, g.dur);
  const k = clamp((t - g.windup) / g.travel, 0, 1);
  const stop = Math.max(0, g.len - (g.kind === 'rooster' ? 16 : 12));
  let d;
  let z = 0;
  if (g.kind === 'seesaw') {
    d = stop * k;
    z = Math.sin(k * Math.PI) * Math.max(40, g.len * 0.55);
  } else if (g.kind === 'rooster') {
    const hops = Math.max(1, Math.round(g.len / CARRIERS.rooster.hopLen));
    const hk = k * hops;
    const i = Math.min(hops - 1, Math.floor(hk));
    const f = hk - i;
    d = (stop * (i + f)) / hops;
    z = k >= 1 ? 0 : Math.sin(f * Math.PI) * 18;
  } else {
    // rolling and driving pick up speed a little
    d = stop * (g.kind === 'car' ? k * k * (3 - 2 * k) : k * (0.6 + 0.4 * k));
  }
  const p = pointAlong(g.path, d);
  return { x: p.x, y: p.y, z, k, a: p.a, t };
}

function finishRun(s) {
  if (s.status === 'won') return;
  s.status = 'stopped';
  s.statusT = 0;
  s.breaks = findBreaks(s);
  const b = s.breaks[0];
  event(s, 'stop', b ? b.x : s.start.x, b ? b.y : s.start.y);
}

// Where the chain gave up, most recent first: { x, y, a (where the hint arrow points), reason, id }
// reason: 'turn' (the next domino was too far round), 'blocked' (something in the way),
// 'gap' (the next domino was too far away), 'end' (the trail just ran out).
export function findBreaks(s) {
  const targets = [
    ...s.goals.filter((g) => !g.fired),
    ...s.gadgets.filter((g) => g.state === 'idle'),
  ];
  const dead = s.dominoes
    .filter((d) => d.state !== 'stand' && d.state !== 'wobble' && d.pushed === 0)
    .sort((a, b) => b.t0 - a.t0 || b.id - a.id);
  const out = [];
  for (const d of dead) {
    const fwd = d.dir;
    let reason = 'end';
    if (d.wobbled) reason = 'turn';
    else if (d.blocked) reason = 'blocked';
    else {
      // the nearest domino still standing in front: too far round means the turn was too
      // sharp, straight ahead means the gap was too wide
      const ux = Math.cos(fwd);
      const uy = Math.sin(fwd);
      let best = null;
      let bd = Infinity;
      for (const o of s.dominoes) {
        if (o === d || o.state !== 'stand') continue;
        const vx = o.x - d.x;
        const vy = o.y - d.y;
        const dist = Math.hypot(vx, vy);
        const along = vx * ux + vy * uy;
        if (along > -2 && dist < SPACING * 3 && dist < bd) {
          bd = dist;
          best = { along, dist };
        }
      }
      if (best) reason = best.along > best.dist * Math.cos(TURN_MAX) ? 'gap' : 'turn';
    }
    if (reason === 'end' && s.free) continue;
    let a = fwd;
    if (reason === 'end' && targets.length) {
      let best = null;
      let bd = Infinity;
      for (const t of targets) {
        const dd = Math.hypot(t.x - d.x, t.y - d.y);
        if (dd < bd) {
          bd = dd;
          best = t;
        }
      }
      a = Math.atan2(best.y - d.y, best.x - d.x);
    }
    out.push({ x: d.x, y: d.y, a, reason, id: d.id });
    if (out.length >= 3) break;
  }
  return out;
}

export function step(s, dt) {
  s.time += dt;
  s.statusT += dt;
  if (s.status === 'stopped') {
    if (!s.free && s.statusT >= STOP_RESET) standUp(s);
    return;
  }
  if (s.status !== 'run' && s.status !== 'won') return;
  for (let guard = 0; guard < 5000; guard++) {
    let k = -1;
    for (let i = 0; i < s.pending.length; i++) {
      if (s.pending[i].t <= s.time && (k < 0 || s.pending[i].t < s.pending[k].t)) k = i;
    }
    if (k < 0) break;
    const p = s.pending.splice(k, 1)[0];
    if (p.kind === 'hit') strike(s, p);
    else release(s, p);
  }
  let busy = s.pending.length > 0;
  for (const d of s.dominoes) {
    if (d.state === 'fall') {
      if (s.time >= d.settleT) d.state = 'down';
      else busy = true;
    }
  }
  if (s.gadgets.some((g) => g.state === 'go')) busy = true;
  if (!busy && s.status === 'run') finishRun(s);
}

// Has the whole run (chain and gadgets) come to rest?
export const settled = (s) => s.status === 'stopped' || (s.status === 'won' && !s.pending.length
  && !s.dominoes.some((d) => d.state === 'fall') && !s.gadgets.some((g) => g.state === 'go'));

// 1 star for setting off every goal, 2 within a few dominoes of par, 3 at or under par.
export function starsFor(def, n) {
  if (def.free) return 0;
  if (n <= def.par) return 3;
  if (n <= twoStar(def)) return 2;
  return 1;
}
export const twoStar = (def) => def.par + Math.max(3, Math.ceil(def.par * 0.3));

// ---------------------------------------------------------------------------------------------
// saved progress
// ---------------------------------------------------------------------------------------------

export function parseProgress(text, n) {
  let v = {};
  try {
    v = JSON.parse(text || '{}') || {};
  } catch {
    v = {};
  }
  const stars = [];
  for (let i = 0; i < n; i++) {
    const k = Array.isArray(v.stars) ? Number(v.stars[i]) : 0;
    stars.push(Number.isInteger(k) && k >= 0 && k <= 3 ? k : 0);
  }
  const theme = Number.isInteger(v.theme) && v.theme >= 0 ? v.theme : 0;
  return { stars, theme };
}

export const serializeProgress = (p) => JSON.stringify({ stars: p.stars, theme: p.theme });

export const unlocked = (p, i) => i === 0 || p.stars[i - 1] > 0 || p.stars[i] > 0;
