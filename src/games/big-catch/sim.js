// Big Catch rules: one fishing trip (cast, drop, turn, reel, haul) plus the saved progress
// (sand dollars, upgrades, the fish album). Pure: no DOM. All tuning lives in tuning.js.
import {
  FIELD_W, MAX_DEPTH, TURN_MARGIN, ROW_START, HOOK_R, HOOK_MIN_X, STEER_GAIN, STEER_MAX,
  CAST_TIME, SINK_SPEED, TURN_TIME, REEL_SPEED, REEL_MIN_TIME, FULL_REEL_SPEED, DODGE_SCALE, CATCH_PAD,
  HAZARD_SCALE, ZAP_SAFE, BONK_PUSH, FLEE_TIME, FLEE_MULT, LINE, BUCKET, LURE, PRICES,
  DEPTH_BONUS, MIN_BONUS, CHEST_VALUE, HAUL_LEAD, HAUL_GAP_MAX, HAUL_GAP_MIN, HAUL_SPREAD,
  HAUL_FLY, HAUL_TAIL, ZONES, FIRST_TRIP, REEL_HAZARDS, SPECIES, SPECIES_BY_ID, ALBUM,
} from './tuning.js';

export * from './tuning.js';

const MAX_STEP = 1 / 40;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// mulberry32, kept in the state so a trip can be replayed from its seed.
export function rand(s) {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const zoneAt = (y) => ZONES.find((z) => y < z.bottom) || ZONES[ZONES.length - 1];
export const zoneIndexAt = (y) => ZONES.indexOf(zoneAt(y));

// Species that can turn up at depth y.
export function speciesAt(y) {
  const z = zoneAt(y).id;
  return SPECIES.filter((sp) => sp.zones.includes(z) && (sp.minDepth || 0) <= y);
}

// The shallowest depth a species lives at.
export function shallowestOf(sp) {
  let lo = Infinity;
  for (const z of ZONES) if (sp.zones.includes(z.id)) lo = Math.min(lo, Math.max(z.top, sp.minDepth || 0));
  return lo;
}

// ---------------------------------------------------------------------------------------------
// The trip
// ---------------------------------------------------------------------------------------------

function pickSpecies(s, y, hazardMult) {
  const list = speciesAt(y);
  let total = 0;
  const w = list.map((sp) => {
    const v = sp.weight * (sp.kind === 'fish' ? 1 : hazardMult);
    total += v;
    return v;
  });
  if (total <= 0) return null;
  let r = rand(s) * total;
  for (let i = 0; i < list.length; i++) {
    r -= w[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}

function spawn(s, sp, y, x) {
  const z = zoneAt(y);
  const c = {
    id: s.nextId++,
    sp: sp.id,
    kind: sp.kind,
    x: x ?? 4 + rand(s) * (FIELD_W - 8),
    y,
    dir: rand(s) < 0.5 ? -1 : 1,
    speed: (sp.speed[0] + rand(s) * (sp.speed[1] - sp.speed[0])) * z.speed,
    rx: sp.rx,
    ry: sp.ry,
    state: 'swim', // 'swim' | 'hooked'
    fleeUntil: -1,
    look: rand(s), // cosmetic variety
  };
  s.creatures.push(c);
  return c;
}

// One row of creatures at depth y.
function fillRow(s, y, chance, hazardMult, pair = zoneAt(y).pair) {
  if (rand(s) >= chance) return;
  const n = rand(s) < pair ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const sp = pickSpecies(s, y, hazardMult);
    if (!sp) continue;
    // a pair is spread out across the screen so there is always a way through
    const x = n === 2 ? (i === 0 ? 4 + rand(s) * (FIELD_W * 0.35) : FIELD_W * 0.6 + rand(s) * (FIELD_W * 0.35)) : undefined;
    spawn(s, sp, y + (rand(s) * 2 - 1) * 1.5, x);
  }
}

// opts: { seed, line, bucket, lure (levels), first (the very first trip), album ({ id: count }) }
export function createTrip(opts = {}) {
  const seed = opts.seed ?? 1;
  const first = !!opts.first;
  const s = {
    seed, rng: seed | 0,
    phase: 'cast', // 'cast' | 'drop' | 'turn' | 'reel' | 'haul' | 'done'
    t: 0, phaseT: 0, first,
    levels: { line: opts.line || 0, bucket: opts.bucket || 0, lure: opts.lure || 0 },
    lineLen: LINE[clamp(opts.line || 0, 0, LINE.length - 1)],
    bucketSize: BUCKET[clamp(opts.bucket || 0, 0, BUCKET.length - 1)],
    lureReach: LURE[clamp(opts.lure || 0, 0, LURE.length - 1)],
    album: { ...(opts.album || {}) },
    hook: { x: FIELD_W / 2, y: 0, vx: 0 },
    targetX: FIELD_W / 2,
    creatures: [], nextId: 1,
    line: [], // creatures on the hook, in the order caught
    chest: false, // hooked the treasure on the sea bed
    depth: 0, // deepest point reached
    dropEnd: null, // { depth, reason: 'line' | 'bump' | 'bottom', by }
    reelFrom: 0, // depth the reel started at
    zapTime: -9, bonkTime: -9, catchTime: -9, bumpTime: -9,
    events: [], // { type, t, ... } for effects: 'bump', 'catch', 'junk', 'zap', 'lost', 'bonk', 'full'
    haul: null,
  };
  const dropFill = (z) => (first ? FIRST_TRIP.dropFill : z.dropFill);
  const hazards = first ? FIRST_TRIP.hazards : 1;
  // creatures from the first row down to a little past where the line runs out
  const bottom = Math.min(s.lineLen + 40, MAX_DEPTH - 5);
  let y = ROW_START;
  while (y < bottom) {
    const z = zoneAt(y);
    // never park something right on the spot the line ends, so the turn is always clear
    if (Math.abs(y - s.lineLen) > 4) fillRow(s, y, dropFill(z), hazards);
    y += z.rowGap;
  }
  return s;
}

export const hookReach = (s) => s.lineLen;
export const isFull = (s) => s.line.length >= s.bucketSize;
export const zapSafe = (s) => s.t - s.zapTime < ZAP_SAFE;
export const fishOnLine = (s) => s.line.filter((c) => c.kind === 'fish').length;

// Point the hook at x (world units). The hook follows smoothly.
export function steer(s, x) {
  s.targetX = clamp(x, HOOK_MIN_X, FIELD_W - HOOK_MIN_X);
}

// Does a creature's (scaled) ellipse touch the hook circle, padded by `pad`?
export function touches(c, hx, hy, scale = 1, pad = 0) {
  const dx = (hx - c.x) / (c.rx * scale + HOOK_R + pad);
  const dy = (hy - c.y) / (c.ry * scale + HOOK_R + pad);
  return dx * dx + dy * dy < 1;
}

function event(s, type, extra = {}) {
  s.events.push({ type, t: s.t, ...extra });
  if (s.events.length > 40) s.events.shift();
}

function moveCreatures(s, dt) {
  for (const c of s.creatures) {
    if (c.state !== 'swim') continue;
    const v = c.speed * (s.t < c.fleeUntil ? FLEE_MULT : 1);
    c.x += c.dir * v * dt;
    if (c.x < -TURN_MARGIN) {
      c.x = -TURN_MARGIN;
      c.dir = 1;
    } else if (c.x > FIELD_W + TURN_MARGIN) {
      c.x = FIELD_W + TURN_MARGIN;
      c.dir = -1;
    }
  }
}

function moveHook(s, dt) {
  const h = s.hook;
  h.vx = clamp((s.targetX - h.x) * STEER_GAIN, -STEER_MAX, STEER_MAX);
  h.x = clamp(h.x + h.vx * dt, HOOK_MIN_X, FIELD_W - HOOK_MIN_X);
}

function startle(s, c) {
  c.dir = c.x < s.hook.x ? -1 : 1;
  c.fleeUntil = s.t + FLEE_TIME;
}

function endDrop(s, reason, by = null) {
  s.dropEnd = { depth: s.hook.y, reason, by: by ? by.sp : null };
  s.depth = Math.max(s.depth, s.hook.y);
  if (by) {
    startle(s, by);
    s.bumpTime = s.t;
    event(s, 'bump', { sp: by.sp, x: by.x, y: by.y });
  }
  if (reason === 'bottom') s.chest = true;
  setPhase(s, 'turn');
}

function setPhase(s, p) {
  s.phase = p;
  s.phaseT = 0;
}

// Fresh arrivals for the way up, in the gaps between the rows the hook dodged.
function startReel(s) {
  const top = ROW_START + 2;
  const from = s.hook.y - 8;
  const hazards = s.first ? FIRST_TRIP.hazards : REEL_HAZARDS;
  let y = top;
  while (y < from) {
    const z = zoneAt(y);
    const gap = s.first ? FIRST_TRIP.reelGap : z.rowGap;
    const fill = s.first ? FIRST_TRIP.reelFill : z.reelFill;
    const at = y + gap * 0.5;
    if (at < from) fillRow(s, at, fill, hazards, s.first ? FIRST_TRIP.pair : z.pair);
    y += gap;
  }
  s.reelFrom = s.hook.y;
  setPhase(s, 'reel');
}

// How fast the hook rises now: steady, slower on a short reel, quick once the bucket is full.
export const reelSpeed = (s) => (isFull(s) ? FULL_REEL_SPEED : Math.min(REEL_SPEED, Math.max(1, s.reelFrom || 0) / REEL_MIN_TIME));

function drop(s, dt) {
  const h = s.hook;
  h.y += SINK_SPEED * dt;
  s.depth = Math.max(s.depth, Math.min(h.y, s.lineLen));
  for (const c of s.creatures) {
    if (c.state === 'swim' && Math.abs(c.y - h.y) < 10 && touches(c, h.x, h.y, DODGE_SCALE)) {
      endDrop(s, 'bump', c);
      return;
    }
  }
  if (h.y >= s.lineLen) {
    h.y = s.lineLen;
    endDrop(s, s.lineLen >= MAX_DEPTH ? 'bottom' : 'line');
  }
}

function zap(s, c) {
  const sp = SPECIES_BY_ID[c.sp];
  s.zapTime = s.t;
  let lost = 0;
  for (let i = s.line.length - 1; i >= 0 && lost < sp.loses; i--) {
    const f = s.line[i];
    if (f.kind !== 'fish') continue;
    s.line.splice(i, 1);
    f.state = 'swim';
    f.x = s.hook.x;
    f.y = s.hook.y + 2 + lost * 3;
    f.dir = lost % 2 ? -1 : 1;
    f.fleeUntil = s.t + FLEE_TIME * 1.5;
    lost++;
    event(s, 'lost', { sp: f.sp });
  }
  event(s, 'zap', { sp: c.sp, lost, x: c.x, y: c.y });
}

function reel(s, dt) {
  const h = s.hook;
  h.y -= reelSpeed(s) * dt;
  for (const c of s.creatures) {
    if (c.state !== 'swim' || Math.abs(c.y - h.y) > 14) continue;
    if (c.kind === 'fish') {
      if (s.t < c.fleeUntil || isFull(s)) continue;
      if (!touches(c, h.x, h.y, 1, CATCH_PAD + s.lureReach)) continue;
      c.state = 'hooked';
      s.line.push(c);
      s.catchTime = s.t;
      event(s, 'catch', { sp: c.sp });
      if (isFull(s)) event(s, 'full');
    } else if (!touches(c, h.x, h.y, HAZARD_SCALE)) {
      continue;
    } else if (c.kind === 'junk') {
      if (isFull(s)) continue;
      c.state = 'hooked';
      s.line.push(c);
      s.catchTime = s.t;
      event(s, 'junk', { sp: c.sp });
      if (isFull(s)) event(s, 'full');
    } else if (c.kind === 'zap') {
      if (!zapSafe(s)) zap(s, c);
    } else if (c.kind === 'blocker') {
      if (s.t - s.bonkTime < 0.4) continue;
      s.bonkTime = s.t;
      const away = h.x < c.x ? -1 : 1;
      let tx = h.x + away * BONK_PUSH;
      if (tx < HOOK_MIN_X || tx > FIELD_W - HOOK_MIN_X) tx = h.x - away * BONK_PUSH;
      h.x = clamp(tx, HOOK_MIN_X, FIELD_W - HOOK_MIN_X);
      event(s, 'bonk', { sp: c.sp });
    }
  }
  if (h.y <= 0) {
    h.y = 0;
    startHaul(s);
  }
}

// ---------- the haul ----------

export const depthBonus = (depth) => Math.max(MIN_BONUS, Math.round(depth * DEPTH_BONUS));

// What a trip pays: every fish's value, the chest if hooked, and a depth bonus.
export function payout(items, depth, chest = false) {
  let total = 0;
  for (const id of items) total += SPECIES_BY_ID[id]?.value || 0;
  if (chest) total += CHEST_VALUE;
  return total + depthBonus(depth);
}

// The haul's items in flying order, each with its value, landing time and whether it is new.
export function haulPlan(lineIds, chest, depth, album = {}) {
  const items = [];
  const seen = new Set();
  for (const id of lineIds) {
    const sp = SPECIES_BY_ID[id];
    const isNew = sp.kind === 'fish' && !album[id] && !seen.has(id);
    if (sp.kind === 'fish') seen.add(id);
    items.push({ kind: sp.kind, sp: id, value: sp.value, isNew });
  }
  if (chest) items.push({ kind: 'chest', sp: 'chest', value: CHEST_VALUE, isNew: false });
  items.push({ kind: 'bonus', sp: 'bonus', value: depthBonus(depth), isNew: false });
  const n = items.length;
  const gap = clamp(HAUL_SPREAD / n, HAUL_GAP_MIN, HAUL_GAP_MAX);
  items.forEach((it, i) => {
    it.start = HAUL_LEAD + i * gap;
    it.land = it.start + HAUL_FLY;
  });
  const total = items.reduce((a, it) => a + it.value, 0);
  return { items, total, end: items[n - 1].land + HAUL_TAIL };
}

function startHaul(s) {
  s.haul = haulPlan(s.line.map((c) => c.sp), s.chest, s.depth, s.album);
  setPhase(s, 'haul');
}

// Items landed so far and the sand dollars counted so far.
export function haulProgress(s) {
  if (!s.haul) return { landed: 0, counted: 0 };
  let landed = 0;
  let counted = 0;
  for (const it of s.haul.items) {
    if (s.phaseT >= it.land || s.phase === 'done') {
      landed++;
      counted += it.value;
    }
  }
  return { landed, counted };
}

// ---------- stepping ----------

function stepOnce(s, dt) {
  s.t += dt;
  s.phaseT += dt;
  moveCreatures(s, dt);
  if (s.phase !== 'haul' && s.phase !== 'done') moveHook(s, dt);
  if (s.phase === 'cast') {
    if (s.phaseT >= CAST_TIME) setPhase(s, 'drop');
  } else if (s.phase === 'drop') drop(s, dt);
  else if (s.phase === 'turn') {
    if (s.phaseT >= TURN_TIME) startReel(s);
  } else if (s.phase === 'reel') reel(s, dt);
  else if (s.phase === 'haul') {
    if (s.phaseT >= s.haul.end) setPhase(s, 'done');
  }
}

export function step(s, dt) {
  while (dt > 1e-9) {
    const d = Math.min(dt, MAX_STEP);
    stepOnce(s, d);
    dt -= d;
  }
}

// Skip the rest of the haul animation.
export function finishHaul(s) {
  if (s.phase === 'haul') setPhase(s, 'done');
}

// ---------------------------------------------------------------------------------------------
// Progress: sand dollars, upgrades, album
// ---------------------------------------------------------------------------------------------

export const UPGRADES = ['line', 'bucket', 'lure'];
const MAX_LEVEL = { line: LINE.length - 1, bucket: BUCKET.length - 1, lure: LURE.length - 1 };

export function newProgress() {
  return { coins: 0, line: 0, bucket: 0, lure: 0, album: {}, best: 0, trips: 0, chest: false, earned: 0 };
}

const nat = (v, max = Infinity) => (Number.isFinite(v) && v >= 0 ? Math.min(Math.floor(v), max) : 0);

// Accepts anything (e.g. parsed from storage) and returns a valid progress object.
export function sanitize(v) {
  const p = newProgress();
  if (!v || typeof v !== 'object') return p;
  p.coins = nat(v.coins);
  for (const k of UPGRADES) p[k] = nat(v[k], MAX_LEVEL[k]);
  if (v.album && typeof v.album === 'object') {
    for (const id of ALBUM) if (nat(v.album[id]) > 0) p.album[id] = nat(v.album[id]);
  }
  p.best = nat(v.best, MAX_DEPTH);
  p.trips = nat(v.trips);
  p.chest = v.chest === true;
  p.earned = nat(v.earned);
  return p;
}

// Price of the next level, or null when maxed.
export function priceOf(p, kind) {
  const lv = p[kind];
  return lv >= MAX_LEVEL[kind] ? null : PRICES[kind][lv];
}
export const maxed = (p, kind) => p[kind] >= MAX_LEVEL[kind];
export const canBuy = (p, kind) => {
  const c = priceOf(p, kind);
  return c !== null && p.coins >= c;
};

// Returns a new progress with the upgrade bought, or null if it can't be.
export function buy(p, kind) {
  if (!UPGRADES.includes(kind) || !canBuy(p, kind)) return null;
  return { ...p, album: { ...p.album }, coins: p.coins - priceOf(p, kind), [kind]: p[kind] + 1 };
}

export const albumCount = (p) => ALBUM.filter((id) => p.album[id] > 0).length;

// The trip options for the next trip from this progress.
export function tripOptions(p, seed) {
  return { seed, line: p.line, bucket: p.bucket, lure: p.lure, first: p.trips === 0, album: p.album };
}

// Folds a hauled trip into progress. Returns { progress, gained, newSpecies, firstChest }.
export function settle(p, s) {
  const plan = s.haul || haulPlan(s.line.map((c) => c.sp), s.chest, s.depth, s.album);
  const next = { ...p, album: { ...p.album } };
  const newSpecies = [];
  for (const it of plan.items) {
    if (it.kind !== 'fish') continue;
    if (!next.album[it.sp]) newSpecies.push(it.sp);
    next.album[it.sp] = (next.album[it.sp] || 0) + 1;
  }
  next.coins += plan.total;
  next.earned += plan.total;
  next.trips += 1;
  next.best = Math.max(next.best, Math.round(s.depth));
  const firstChest = s.chest && !p.chest;
  if (s.chest) next.chest = true;
  return { progress: next, gained: plan.total, newSpecies, firstChest };
}
