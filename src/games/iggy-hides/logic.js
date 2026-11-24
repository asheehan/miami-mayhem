// Where's Iggy? rules, with no DOM: screen layout and scale, the camera (pan, soft edges,
// inertia), telling a tap from a pan, picking a round, resolving taps, hints, stars and saved
// progress. Scenes come in already resolved (see scenes/index.js): every hiding spot carries
// its hit box in world units as { x, y, hw, hh } (centre and half sizes).

export const SAVE_KEY = 'iggy-hides-progress';
export const MIN_HALF = 34; // smallest hit box half-size, world units
export const MIN_TAP_PX = 44; // smallest hit box on screen, px
export const MIN_SCALE = 0.72; // world -> px never below this, so MIN_HALF stays >= 44 px wide
export const MAX_SCALE = 1.5;
export const TALL = 1.3; // a scene is about this many view-heights tall
export const TAP_SLOP = 14; // px a finger may wander and still count as a tap
export const OVERSCROLL = 70; // px of soft give past an edge
export const FRICTION = 4.2; // per second: how quickly a flick slows down
export const SPRING = 14; // per second: how quickly an overscroll springs back
export const HINT_RECHARGE = 15; // s
export const IDLE_NUDGE = 30; // s without finding anything before the tray item wiggles
export const OTHER_MIN = 6;
export const OTHER_MAX = 8;

export function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---------------------------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------------------------

// The scene fills the screen above a tray. Slots for the things to find sit in the tray
// (one row, or two on a narrow screen) with the big hint button at the right end.
export function computeLayout(w, h, scene, nSlots = 9) {
  const trayH = Math.round(clamp(h * 0.14, 118, 168));
  const viewH = h - trayH;
  const s = clamp(Math.max((viewH * TALL) / scene.H, MIN_SCALE, w / scene.W, viewH / scene.H), MIN_SCALE, MAX_SCALE);
  const pad = Math.max(8, Math.min(14, w * 0.02));
  const foot = Math.max(pad, h * 0.012); // keep clear of the home-gesture strip
  const innerH = trayH - pad - foot;
  const hr = Math.min(innerH * 0.48, 58);
  const hint = { x: w - pad - hr, y: viewH + pad + innerH / 2, r: hr };
  const avail = w - pad * 3 - hr * 2;
  const one = avail / Math.max(1, nSlots);
  const rows = one >= Math.min(innerH * 0.62, 64) ? 1 : 2;
  const cols = Math.ceil(nSlots / rows);
  const size = Math.min(avail / cols, innerH / rows);
  const slots = [];
  for (let i = 0; i < nSlots; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const inRow = row === rows - 1 ? nSlots - cols * (rows - 1) : cols;
    const x0 = pad + (avail - inRow * size) / 2;
    slots.push({ x: x0 + col * size + size / 2, y: viewH + pad + (innerH - rows * size) / 2 + row * size + size / 2, size: size * 0.92 });
  }
  const icon = Math.max(48, Math.min(64, w * 0.12));
  const miniW = Math.max(84, Math.min(150, w * 0.2));
  return {
    w, h, trayH, viewH, s, pad, slots, rows, hint,
    home: { x: pad, y: pad, w: icon, h: icon },
    mini: { x: w - pad - miniW, y: pad, w: miniW, h: (miniW * scene.H) / scene.W },
  };
}

// ---------------------------------------------------------------------------------------------
// Camera: cam = { x, y } is the world point at the view's top-left corner.
// ---------------------------------------------------------------------------------------------

export function camBounds(L, scene) {
  const vw = L.w / L.s;
  const vh = L.viewH / L.s;
  const bx = scene.W - vw;
  const by = scene.H - vh;
  return {
    minX: bx >= 0 ? 0 : bx / 2,
    maxX: bx >= 0 ? bx : bx / 2,
    minY: by >= 0 ? 0 : by / 2,
    maxY: by >= 0 ? by : by / 2,
  };
}

export const clampCam = (cam, b) => ({ x: clamp(cam.x, b.minX, b.maxX), y: clamp(cam.y, b.minY, b.maxY) });

// Past an edge, the camera gives a little and resists more the further it goes.
export function rubber(v, min, max, limit) {
  if (v < min) {
    const o = min - v;
    return min - (o * limit) / (o + limit);
  }
  if (v > max) {
    const o = v - max;
    return max + (o * limit) / (o + limit);
  }
  return v;
}

// The camera while a finger drags: the scene follows the finger, softly past the edges.
export function dragCam(start, dxPx, dyPx, s, b) {
  const lim = OVERSCROLL / s;
  return {
    x: rubber(start.x - dxPx / s, b.minX, b.maxX, lim),
    y: rubber(start.y - dyPx / s, b.minY, b.maxY, lim),
  };
}

// After the finger lets go: coast with friction, spring back from past an edge.
// vel is in world units per second; both cam and vel are updated in place.
export function stepCamera(cam, vel, dt, b) {
  const f = Math.exp(-FRICTION * dt);
  for (const [k, lo, hi] of [['x', b.minX, b.maxX], ['y', b.minY, b.maxY]]) {
    cam[k] += vel[k] * dt;
    vel[k] *= f;
    if (cam[k] < lo || cam[k] > hi) {
      const edge = cam[k] < lo ? lo : hi;
      vel[k] *= Math.exp(-SPRING * 1.5 * dt);
      cam[k] = edge + (cam[k] - edge) * Math.exp(-SPRING * dt);
      if (Math.abs(cam[k] - edge) < 0.05) cam[k] = edge;
    }
    if (Math.abs(vel[k]) < 2) vel[k] = 0;
  }
  return cam;
}

// The camera that puts world point (wx, wy) in the middle of the view, kept in bounds.
export function centerOn(L, b, wx, wy) {
  return clampCam({ x: wx - L.w / L.s / 2, y: wy - L.viewH / L.s / 2 }, b);
}

export const toWorld = (L, cam, x, y) => ({ x: cam.x + x / L.s, y: cam.y + y / L.s });
export const toScreen = (L, cam, wx, wy) => ({ x: (wx - cam.x) * L.s, y: (wy - cam.y) * L.s });

// ---------------------------------------------------------------------------------------------
// Tap or pan: the shell only reports press, move and release, so a press that never wanders
// more than TAP_SLOP px is a tap; anything else is a pan.
// ---------------------------------------------------------------------------------------------

export function startGesture(x, y, now) {
  return { x0: x, y0: y, x, y, max: 0, samples: [{ x, y, t: now }] };
}

export function moveGesture(g, x, y, now) {
  g.x = x;
  g.y = y;
  g.max = Math.max(g.max, Math.hypot(x - g.x0, y - g.y0));
  g.samples.push({ x, y, t: now });
  while (g.samples.length > 2 && now - g.samples[0].t > 0.12) g.samples.shift();
  return g;
}

export const isTap = (g) => g.max <= TAP_SLOP;

// Release: was it a tap, and how fast was the finger moving (px / s) for a flick?
export function endGesture(g, x, y, now) {
  moveGesture(g, x, y, now);
  const tap = isTap(g);
  const recent = g.samples.filter((p) => now - p.t <= 0.1);
  const first = recent[0] || g.samples[0];
  const dt = now - first.t;
  let vx = 0;
  let vy = 0;
  if (!tap && dt > 0.008) {
    vx = (x - first.x) / dt;
    vy = (y - first.y) / dt;
    const sp = Math.hypot(vx, vy);
    const cap = 4000;
    if (sp > cap) {
      vx *= cap / sp;
      vy *= cap / sp;
    }
  }
  return { tap, vx, vy };
}

// ---------------------------------------------------------------------------------------------
// Rounds
// ---------------------------------------------------------------------------------------------

export const overlaps = (a, b) => Math.abs(a.x - b.x) < a.hw + b.hw && Math.abs(a.y - b.y) < a.hh + b.hh;
export const contains = (a, x, y) => Math.abs(x - a.x) <= a.hw && Math.abs(y - a.y) <= a.hh;
// How much of the smaller box another box covers, 0..1.
export function overlapFrac(a, b) {
  const ox = Math.max(0, Math.min(a.x + a.hw, b.x + b.hw) - Math.max(a.x - a.hw, b.x - b.hw));
  const oy = Math.max(0, Math.min(a.y + a.hh, b.y + b.hh) - Math.max(a.y - a.hh, b.y - b.hh));
  const small = Math.min(a.hw * a.hh, b.hw * b.hh) * 4;
  return (ox * oy) / small;
}
// Two spots clash when one would make the other hard to tap.
export const clash = (a, b) => overlapFrac(a, b) > 0.35 || contains(a, b.x, b.y) || contains(b, a.x, a.y);

function shuffle(list, r) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Chooses Iggy's spot and 6-8 other things (with their spots) for one play of a scene.
// Same scene and seed, same round.
export function pickRound(scene, seed) {
  const r = rng(seed * 2654435761 + 97);
  const iggy = Math.floor(r() * scene.iggy.length);
  const taken = [scene.iggy[iggy]];
  const want = OTHER_MIN + Math.floor(r() * (OTHER_MAX - OTHER_MIN + 1));
  const picks = [];
  for (const item of shuffle(scene.items, r)) {
    if (picks.length >= want) break;
    const spots = [];
    for (const k of shuffle(item.spots.map((_, i) => i), r)) {
      if (spots.length >= (item.count || 1)) break;
      const sp = item.spots[k];
      if (taken.some((t) => clash(t, sp))) continue;
      spots.push(k);
    }
    if (spots.length < (item.count || 1)) continue;
    spots.sort((a, b) => a - b);
    spots.forEach((k) => taken.push(item.spots[k]));
    picks.push({ id: item.id, spots });
  }
  return { iggy, picks };
}

// A playable round: the targets in tray order (Iggy first) and every hidden instance.
export function createRound(scene, seed, now = 0) {
  const pick = pickRound(scene, seed);
  const targets = [{ id: 'iggy', prop: `iggy-${scene.iggy[pick.iggy].pose || 'stand'}`, o: {}, count: 1, found: 0, iggy: true }];
  const instances = [{ target: 0, spot: scene.iggy[pick.iggy], found: false }];
  for (const p of pick.picks) {
    const item = scene.items.find((it) => it.id === p.id);
    const ti = targets.length;
    targets.push({ id: item.id, prop: item.prop, o: item.o || {}, count: p.spots.length, found: 0 });
    for (const k of p.spots) instances.push({ target: ti, spot: item.spots[k], found: false });
  }
  // drawn back to front; the one drawn last is on top
  instances.sort((a, b) => (a.spot.z ?? a.spot.y) - (b.spot.z ?? b.spot.y));
  return {
    sceneId: scene.id, seed, pick, targets, instances,
    hintsUsed: 0, nextHintAt: now, lastFoundAt: now, startedAt: now, done: false, doneAt: null,
  };
}

// Which instance (index into round.instances) a tap at world (wx, wy) finds: the top-most
// unfound one whose hit box holds the point, or -1 for a miss.
export function tapTarget(round, wx, wy) {
  for (let i = round.instances.length - 1; i >= 0; i--) {
    const it = round.instances[i];
    if (!it.found && contains(it.spot, wx, wy)) return i;
  }
  return -1;
}

export function markFound(round, i, now = 0) {
  const it = round.instances[i];
  if (!it || it.found) return null;
  it.found = true;
  const tg = round.targets[it.target];
  tg.found += 1;
  round.lastFoundAt = now;
  const targetDone = tg.found >= tg.count;
  if (isComplete(round) && !round.done) {
    round.done = true;
    round.doneAt = now;
  }
  return { target: it.target, targetDone, roundDone: round.done };
}

export const isComplete = (round) => round.instances.every((it) => it.found);
export const remaining = (round) => round.instances.filter((it) => !it.found).length;

// The unfound instance nearest a world point (the middle of the view), or -1.
export function nearestUnfound(round, wx, wy) {
  let best = -1;
  let bd = Infinity;
  round.instances.forEach((it, i) => {
    if (it.found) return;
    const d = Math.hypot(it.spot.x - wx, it.spot.y - wy);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}

export const hintReady = (round, now) => !round.done && now >= round.nextHintAt;
export const hintCharge = (round, now) => clamp(1 - (round.nextHintAt - now) / HINT_RECHARGE, 0, 1);

// Spends a hint: returns the instance to point at, or -1 if not charged yet.
export function useHint(round, now, wx, wy) {
  if (!hintReady(round, now)) return -1;
  const i = nearestUnfound(round, wx, wy);
  if (i < 0) return -1;
  round.hintsUsed += 1;
  round.nextHintAt = now + HINT_RECHARGE;
  return i;
}

// Nothing found for a while: time to wiggle a tray picture and pulse the hint button.
export const idleNudge = (round, now) => !round.done && now - Math.max(round.lastFoundAt, round.startedAt) >= IDLE_NUDGE;

// 3 stars with no hints, 2 for one or two, 1 otherwise. Finishing always earns one.
export const starsFor = (hintsUsed) => (hintsUsed <= 0 ? 3 : hintsUsed <= 2 ? 2 : 1);

// ---------------------------------------------------------------------------------------------
// Saved progress: best stars per scene. A scene with any stars has its sticker.
// ---------------------------------------------------------------------------------------------

export function normalizeProgress(v, ids) {
  const stars = {};
  for (const id of ids) {
    const n = Number(v && v.stars && v.stars[id]);
    stars[id] = Number.isInteger(n) && n >= 0 && n <= 3 ? n : 0;
  }
  return { stars };
}

export function loadProgress(store, ids) {
  try {
    return normalizeProgress(JSON.parse(store.getItem(SAVE_KEY) || '{}'), ids);
  } catch {
    return normalizeProgress({}, ids);
  }
}

export function saveProgress(store, p) {
  try {
    store.setItem(SAVE_KEY, JSON.stringify(p));
  } catch {
    // not kept if storage is unavailable
  }
}

// Keeps the best; says whether this was the first finish (a new sticker) or a better score.
export function recordStars(p, id, n) {
  const before = p.stars[id] || 0;
  p.stars[id] = Math.max(before, n);
  return { best: p.stars[id], newSticker: before === 0 && n > 0, improved: n > before };
}
