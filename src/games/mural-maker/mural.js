// Mural Maker rules. Pure: no DOM, no drawing. Paints, compiling a mural's line art into
// hit-testable regions, filling, spray strokes, stamps, undo, clear, finishing, and saved
// progress (storage passed in).
//
// Units: everything on a wall is in wall units. The wall is WALL_W x WALL_H (3:4 portrait);
// the screen layout scales it to fit.
import { flatten, bbox, winding, polyArea, reverse, R, rect } from './murals/kit.js';
import { STAMP_IDS } from './stamps.js';

export const WALL_W = 600;
export const WALL_H = 800;

// ---------------------------------------------------------------------------------------------
// Paints
// ---------------------------------------------------------------------------------------------

// Twelve bright colours. A paint is a short string so saved walls stay small:
//   '0'..'11'  a plain colour          'r'  rainbow          'g'  glitter
//   's<n>'     stripes of colour n     'd<n>' dots on colour n
export const COLOURS = [
  '#ff3347', // red
  '#ff8a1f', // orange
  '#ffd919', // yellow
  '#3ccf4e', // green
  '#12c9c1', // teal
  '#4fb3ff', // sky
  '#3550e8', // blue
  '#9046e8', // purple
  '#ff5fae', // pink
  '#94572e', // brown
  '#ffffff', // white
  '#2b2340', // black
];
export const WHITE = 10;
export const BLACK = 11;

// The palette, in order: every colour, then rainbow, glitter, stripes and dots. Stripes and
// dots use whichever plain colour was picked last.
export const SWATCHES = [...COLOURS.map((_, i) => String(i)), 'r', 'g', 's', 'd'];

export const isPaint = (p) => typeof p === 'string' && /^(?:[sd]?(?:\d|1[01])|r|g)$/.test(p);

// The paint a swatch gives, with `base` the last plain colour picked.
export function paintFor(swatch, base = 0) {
  if (swatch === 's' || swatch === 'd') return swatch + base;
  return swatch;
}

// What a paint is made of: { kind: 'solid'|'rainbow'|'glitter'|'stripes'|'dots', c, c2 }.
export function paintInfo(p) {
  if (p === 'r') return { kind: 'rainbow' };
  if (p === 'g') return { kind: 'glitter', c: '#ffcf33', c2: '#fff6c9' };
  const pat = p[0] === 's' ? 'stripes' : p[0] === 'd' ? 'dots' : null;
  const n = Number(pat ? p.slice(1) : p);
  const c = COLOURS[n] ?? COLOURS[0];
  if (!pat) return { kind: 'solid', c };
  return { kind: pat, c, c2: n === WHITE ? COLOURS[BLACK] : '#ffffff' };
}

export const RAINBOW = ['#ff3347', '#ff8a1f', '#ffd919', '#3ccf4e', '#12c9c1', '#3550e8', '#9046e8'];

// ---------------------------------------------------------------------------------------------
// Seeded randomness (spray speckles, drips, stamps' tilt)
// ---------------------------------------------------------------------------------------------

export function makeRng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------------------------
// Murals: line art compiled into regions
// ---------------------------------------------------------------------------------------------

const FLAT_N = 14; // lines per cubic when flattening for hit tests

// Turns a mural definition ({ id, items, alive, free }) into something the game can use:
// regions get an index (their order: later regions sit on top), flattened polygons for
// hit testing and a bounding box. Shapes in a plain (non-zero) region all wind the same
// way, so overlapping shapes in one region always add up to a union.
export function compileMural(def) {
  let ri = 0;
  const items = def.items.map((it) => {
    if (it.type !== 'region') return it;
    const shapes = it.evenodd ? it.shapes : it.shapes.map((s) => (polyArea(flatten(s, 4)) < 0 ? reverse(s) : s));
    const polys = shapes.map((s) => flatten(s, FLAT_N));
    return { ...it, shapes, polys, box: bbox(polys), index: ri++ };
  });
  return {
    id: def.id,
    def,
    items,
    regions: items.filter((it) => it.type === 'region'),
    free: !!def.free,
    alive: def.alive || null,
  };
}

export function insideRegion(r, x, y) {
  const b = r.box;
  if (x < b.x || x > b.x + b.w || y < b.y || y > b.y + b.h) return false;
  let w = 0;
  for (const p of r.polys) w += winding(p, x, y);
  return r.evenodd ? (w & 1) === 1 : w !== 0;
}

// The top-most region under a wall point, or -1.
export function regionAt(m, x, y) {
  for (let i = m.regions.length - 1; i >= 0; i--) if (insideRegion(m.regions[i], x, y)) return i;
  return -1;
}

// A point well inside region i's visible part (not covered by a region on top), and the
// visible area. Sampled on a grid; cached on the compiled mural.
export function regionPoint(m, i, step = 8) {
  m.points = m.points || [];
  if (m.points[i]) return m.points[i];
  const r = m.regions[i];
  const b = r.box;
  const pts = [];
  for (let y = Math.max(0, b.y) + step / 2; y <= Math.min(WALL_H, b.y + b.h); y += step) {
    for (let x = Math.max(0, b.x) + step / 2; x <= Math.min(WALL_W, b.x + b.w); x += step) {
      if (regionAt(m, x, y) === i) pts.push([x, y]);
    }
  }
  let best = null;
  if (pts.length) {
    // the visible sample with the most visible neighbours, nearest the middle
    const set = new Set(pts.map(([x, y]) => `${x},${y}`));
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
    const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    let bestScore = -Infinity;
    for (const [x, y] of pts) {
      let depth = 0;
      for (let k = 1; k <= 6; k++) {
        const d = k * step;
        if (set.has(`${x + d},${y}`) && set.has(`${x - d},${y}`) && set.has(`${x},${y + d}`) && set.has(`${x},${y - d}`)) depth = k;
        else break;
      }
      const score = depth * 1000 - Math.hypot(x - cx, y - cy);
      if (score > bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }
  }
  m.points[i] = { ...(best || { x: NaN, y: NaN }), area: pts.length * step * step };
  return m.points[i];
}

// ---------------------------------------------------------------------------------------------
// A wall being painted
// ---------------------------------------------------------------------------------------------

// Spray sizes (line width, wall units), small to big.
export const BRUSHES = [16, 32, 60];
export const MIN_STEP = 3; // a new stroke point only once the finger has moved this far
export const MAX_POINTS = 240; // a longer stroke carries on as a new stroke
export const HISTORY_MAX = 80;
export const STAMP_SIZE = 110; // a tapped stamp is this wide
export const STAMP_MIN = 40;
export const STAMP_MAX = 560;
const EDGE = 60; // stroke points may sit this far outside the wall

export function createWall(m) {
  return { id: m.id, free: !!m.free, fills: m.regions.map(() => null), marks: [], done: false, history: [], live: null };
}

const pushHistory = (wall, h) => {
  wall.history.push(h);
  if (wall.history.length > HISTORY_MAX) wall.history.shift();
};

// A mural is finished when Riley says so: the Done button calls finishWall. Free walls
// (and his own walls) are never finished, and a blank wall has nothing to finish. Returns
// true the first time a wall is finished, false after that (the celebration can replay).
export function finishWall(wall) {
  if (wall.free || isBlank(wall) || wall.done) return false;
  wall.done = true;
  return true;
}

export const filledCount = (wall) => wall.fills.filter(Boolean).length;
export const isBlank = (wall) => !wall.marks.length && !wall.fills.some(Boolean);

// Fills region i. Returns { changed }. Filling never finishes a mural by itself.
export function fillRegion(wall, i, paint) {
  if (i < 0 || i >= wall.fills.length || !isPaint(paint) || wall.fills[i] === paint) return { changed: false };
  pushHistory(wall, { t: 'fill', i, prev: wall.fills[i] });
  wall.fills[i] = paint;
  return { changed: true };
}

const clampPt = (x, y) => [
  Math.round(Math.max(-EDGE, Math.min(WALL_W + EDGE, x))),
  Math.round(Math.max(-EDGE, Math.min(WALL_H + EDGE, y))),
];

// Starts a spray stroke at a wall point. Returns the new stroke.
export function startStroke(wall, { paint, size = 1, x, y, seed = 1, drip = false }) {
  const mark = { t: 's', p: paint, w: Math.max(0, Math.min(BRUSHES.length - 1, size | 0)), s: seed | 0, r: drip ? 1 : 0, q: clampPt(x, y) };
  wall.marks.push(mark);
  pushHistory(wall, { t: 'marks', n: 1 });
  wall.live = mark;
  return mark;
}

// Carries the live stroke on to (x, y). Returns { mark, from } (the stroke to draw and the
// index of the point the new piece starts at), or null when the finger hasn't moved enough.
// A stroke that reaches MAX_POINTS ends and a new one carries on from its last point, so no
// single stroke grows without limit.
export function extendStroke(wall, x, y) {
  const m = wall.live;
  if (!m) return null;
  const [px, py] = clampPt(x, y);
  const n = m.q.length;
  if (Math.hypot(px - m.q[n - 2], py - m.q[n - 1]) < MIN_STEP) return null;
  if (n / 2 >= MAX_POINTS) {
    const next = { ...m, s: (m.s + 1) | 0, q: [m.q[n - 2], m.q[n - 1], px, py] };
    wall.marks.push(next);
    const top = wall.history[wall.history.length - 1];
    if (top && top.t === 'marks') top.n++;
    else pushHistory(wall, { t: 'marks', n: 1 });
    wall.live = next;
    return { mark: next, from: 0 };
  }
  m.q.push(px, py);
  return { mark: m, from: n / 2 - 1 };
}

// Ends the live stroke, dropping points that add nothing (a straight run of points
// becomes its two ends).
export function endStroke(wall, tolerance = 0.75) {
  const m = wall.live;
  wall.live = null;
  if (m && m.q.length > 4) m.q = simplify(m.q, tolerance);
  return m;
}

// Puts a stamp down. Its tilt comes from the seed so it looks the same after a reload.
export function addStamp(wall, { kind, x, y, size = STAMP_SIZE, paint, seed = 1 }) {
  const rng = makeRng(seed * 13 + 5);
  const mark = {
    t: 'm', k: kind, p: paint, x: Math.round(x), y: Math.round(y),
    z: Math.round(Math.max(STAMP_MIN, Math.min(STAMP_MAX, size))), a: Math.round((rng() * 2 - 1) * 14),
  };
  wall.marks.push(mark);
  pushHistory(wall, { t: 'marks', n: 1 });
  return mark;
}

export function resizeStamp(mark, size) {
  mark.z = Math.round(Math.max(STAMP_MIN, Math.min(STAMP_MAX, size)));
  return mark;
}

// Undoes the last fill, stroke, stamp or clear. Returns what needs redrawing: 'fills',
// 'marks', 'all', or null when there is nothing to undo.
export function undo(wall) {
  wall.live = null;
  const h = wall.history.pop();
  if (!h) return null;
  if (h.t === 'fill') {
    wall.fills[h.i] = h.prev;
    return 'fills';
  }
  if (h.t === 'marks') {
    wall.marks.splice(wall.marks.length - h.n, h.n);
    return 'marks';
  }
  wall.fills = h.fills;
  wall.marks = h.marks;
  return 'all';
}

// Wipes the wall (undo brings it back). Finished walls keep their sticker.
export function clearWall(wall) {
  wall.live = null;
  if (isBlank(wall)) return false;
  pushHistory(wall, { t: 'clear', fills: wall.fills, marks: wall.marks });
  wall.fills = wall.fills.map(() => null);
  wall.marks = [];
  return true;
}

// Where paint runs down from a stroke made with drips on: { x, y, len, w, at } where `at`
// is how far along the stroke the drip starts (so it can take that point's colour).
export function dripsFor(mark) {
  if (!mark.r) return [];
  const W = BRUSHES[mark.w] ?? BRUSHES[1];
  const rng = makeRng(mark.s * 31 + 7);
  const gap = 34 + W * 0.9;
  const out = [];
  const add = (x, y, at) => {
    if (rng() > 0.68) return;
    out.push({ x: x + (rng() * 2 - 1) * W * 0.25, y: y + W * 0.2, len: (36 + rng() * 120) * (0.55 + W / 70), w: W * (0.2 + rng() * 0.13), at });
  };
  const q = mark.q;
  if (q.length === 2) {
    add(q[0], q[1], 0);
    return out;
  }
  let along = 0;
  let next = gap * (0.3 + rng() * 0.6);
  for (let k = 2; k < q.length; k += 2) {
    const x0 = q[k - 2];
    const y0 = q[k - 1];
    const seg = Math.hypot(q[k] - x0, q[k + 1] - y0);
    while (next <= along + seg) {
      const t = seg ? (next - along) / seg : 0;
      add(x0 + (q[k] - x0) * t, y0 + (q[k + 1] - y0) * t, next);
      next += gap * (0.7 + rng() * 0.6);
    }
    along += seg;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Stroke simplification (Ramer-Douglas-Peucker on a flat [x, y, ...] list)
// ---------------------------------------------------------------------------------------------

export function simplify(q, tol) {
  const n = q.length / 2;
  if (n <= 2 || tol <= 0) return q.slice();
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const stack = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const ax = q[a * 2];
    const ay = q[a * 2 + 1];
    const dx = q[b * 2] - ax;
    const dy = q[b * 2 + 1] - ay;
    const len = Math.hypot(dx, dy);
    let far = -1;
    let farD = tol;
    for (let k = a + 1; k < b; k++) {
      const px = q[k * 2] - ax;
      const py = q[k * 2 + 1] - ay;
      const d = len ? Math.abs(px * dy - py * dx) / len : Math.hypot(px, py);
      if (d > farD) {
        farD = d;
        far = k;
      }
    }
    if (far >= 0) {
      keep[far] = 1;
      stack.push([a, far], [far, b]);
    }
  }
  const out = [];
  for (let k = 0; k < n; k++) if (keep[k]) out.push(q[k * 2], q[k * 2 + 1]);
  return out;
}

// ---------------------------------------------------------------------------------------------
// Saved progress
// ---------------------------------------------------------------------------------------------
//
// localStorage 'mural-maker-progress':
//   { v: 1, walls: { [id]: { f: [paint | 0, ...], m: [mark, ...], d: 1 } }, own: { n, ids } }
// `own` (his own walls, see below) is only there once he has made one.
// Strokes are { t: 's', p, w, s, r, q } with q the points as [x0, y0, dx1, dy1, ...] whole
// wall units; stamps are { t: 'm', k, p, x, y, z, a }. Blank, unfinished walls are left out.
// Each wall is kept under a budget (characters of JSON): over it, strokes are simplified
// harder, then the oldest marks (underneath everything newer) are dropped from the save.

export const SAVE_KEY = 'mural-maker-progress';
export const WALL_BUDGET = 48000;
const TOLERANCES = [0, 1.5, 3, 6, 10];

function encodeMark(m, tol) {
  if (m.t === 'm') return { t: 'm', k: m.k, p: m.p, x: m.x, y: m.y, z: m.z, a: m.a };
  const q = tol > 0 ? simplify(m.q, tol) : m.q;
  const dq = [q[0], q[1]];
  for (let k = 2; k < q.length; k++) dq.push(q[k] - q[k - 2]);
  const out = { t: 's', p: m.p, w: m.w, s: m.s, q: dq };
  if (m.r) out.r = 1;
  return out;
}

const int = (v) => Number.isFinite(v) && Math.round(v) === v;

function decodeMark(raw) {
  if (!raw || typeof raw !== 'object' || !isPaint(raw.p)) return null;
  if (raw.t === 'm') {
    if (!STAMP_IDS.includes(raw.k) || ![raw.x, raw.y, raw.z].every(int)) return null;
    return { t: 'm', k: raw.k, p: raw.p, x: raw.x, y: raw.y, z: Math.max(STAMP_MIN, Math.min(STAMP_MAX, raw.z)), a: int(raw.a) ? raw.a : 0 };
  }
  if (raw.t !== 's' || !Array.isArray(raw.q) || raw.q.length < 2 || raw.q.length % 2 || !raw.q.every(int)) return null;
  const q = [raw.q[0], raw.q[1]];
  for (let k = 2; k < raw.q.length; k++) q.push(q[k - 2] + raw.q[k]);
  return { t: 's', p: raw.p, w: int(raw.w) && raw.w >= 0 && raw.w < BRUSHES.length ? raw.w : 1, s: int(raw.s) ? raw.s : 1, r: raw.r ? 1 : 0, q };
}

// One wall as saved data, kept under `budget` characters of JSON.
export function encodeWall(wall, budget = WALL_BUDGET) {
  const base = { f: wall.fills.map((p) => p || 0) };
  if (wall.done) base.d = 1;
  let out = null;
  for (const tol of TOLERANCES) {
    out = { ...base, m: wall.marks.map((m) => encodeMark(m, tol)) };
    if (JSON.stringify(out).length <= budget) return out;
  }
  // still too big: drop the oldest marks (they are under everything newer)
  const m = out.m;
  let size = JSON.stringify(out).length;
  let drop = 0;
  while (size > budget && drop < m.length) size -= JSON.stringify(m[drop++]).length + 1;
  return { ...base, m: m.slice(drop) };
}

export function decodeWall(raw, mural) {
  const wall = createWall(mural);
  if (!raw || typeof raw !== 'object') return wall;
  if (Array.isArray(raw.f)) wall.fills = wall.fills.map((_, i) => (isPaint(raw.f[i]) ? raw.f[i] : null));
  if (Array.isArray(raw.m)) wall.marks = raw.m.map(decodeMark).filter(Boolean);
  wall.done = !!raw.d && !wall.free;
  return wall;
}

// progress = { walls: { [id]: wall }, own: { ids, next } } with a wall for every mural and
// every wall of his own.
export function serializeProgress(progress, budget = WALL_BUDGET) {
  const walls = {};
  for (const [id, wall] of Object.entries(progress.walls)) {
    if (!isBlank(wall) || wall.done) walls[id] = encodeWall(wall, budget);
  }
  const out = { v: 1, walls };
  // saves from before own walls existed stay exactly as they were
  if (progress.own && progress.own.next > 0) out.own = { n: progress.own.next, ids: progress.own.ids.slice() };
  return JSON.stringify(out);
}

export function parseProgress(text, murals) {
  let raw = null;
  try {
    raw = JSON.parse(text || '{}');
  } catch {
    raw = null;
  }
  const src = raw && typeof raw === 'object' && raw.walls && typeof raw.walls === 'object' && !Array.isArray(raw.walls) ? raw.walls : {};
  const walls = {};
  for (const m of murals) walls[m.id] = decodeWall(src[m.id], m);
  const own = parseOwn(raw && typeof raw === 'object' ? raw.own : null);
  for (const id of own.ids) walls[id] = decodeWall(Object.hasOwn(src, id) ? src[id] : null, ownMural(id));
  return { walls, own };
}

export function loadProgress(storage, murals) {
  try {
    return parseProgress(storage.getItem(SAVE_KEY), murals);
  } catch {
    return parseProgress(null, murals);
  }
}

// Budgets tried in turn when storage says it's full.
export const SAVE_BUDGETS = [WALL_BUDGET, WALL_BUDGET / 2, WALL_BUDGET / 4, WALL_BUDGET / 8, WALL_BUDGET / 16];

// Saves, shrinking the budget if storage says it's full. Returns { chars, budget }: the
// characters written and the per-wall budget that fitted, or { chars: 0, budget: 0 } when
// nothing could be saved (play carries on; the walls stay in memory and whatever was saved
// before is still there, since a failed write leaves the old value alone).
export function trySave(storage, progress) {
  for (const budget of SAVE_BUDGETS) {
    let text;
    try {
      text = serializeProgress(progress, budget);
      storage.setItem(SAVE_KEY, text);
      return { chars: text.length, budget };
    } catch {
      // full (or unavailable): try smaller
    }
  }
  return { chars: 0, budget: 0 };
}

// The same, returning just the number of characters written (0 when nothing was saved).
export function saveProgress(storage, progress) {
  return trySave(storage, progress).chars;
}

// ---------------------------------------------------------------------------------------------
// Walls of his own
// ---------------------------------------------------------------------------------------------
//
// Riley can add as many blank walls as he likes (each a free wall: one big region, never
// finished) and remove ones he no longer wants. progress.own = { ids, next }: the walls in
// the order made, and the number the next one gets. Ids are 'own-<n>' and are never reused,
// so a removed wall's paint can never turn up on a newer one.
//
// How many: localStorage gives a site about 5 MB, which some browsers count as UTF-16, so
// plan on roughly 2.5 million characters, shared with the other games' (small) saves. A
// painted wall saves at up to WALL_BUDGET (48k) characters, though a typical one is a few
// thousand. Two limits apply:
//   OWN_MAX       a hard ceiling. 200 own walls plus the 52 on the mural pages, squeezed to
//                 the smallest budget (3k each), is about 760k characters, so even then a
//                 save always fits; at a quarter budget (12k) they would be ~3M, which is why
//                 the soft limit below stops adding well before that.
//   SAVE_SOFT_MAX once a save is this big, or had to be squeezed to fit, no more walls are
//                 added (the '+' shows 'full') so what is already painted keeps its detail.
//                 Removing walls brings the '+' back.

export const OWN_MAX = 200;
export const SAVE_SOFT_MAX = 1_800_000;
const OWN_ID = /^own-(\d{1,9})$/;
export const isOwnId = (id) => typeof id === 'string' && OWN_ID.test(id);

let ownTemplate = null;
// The compiled wall for one of his own walls: a free wall, one big region.
export function ownMural(id) {
  ownTemplate = ownTemplate || compileMural({ id: 'own', free: true, items: [R(rect(0, 0, WALL_W, WALL_H))] });
  return { ...ownTemplate, id, def: { ...ownTemplate.def, id }, points: undefined, grid: undefined };
}

export const emptyOwn = () => ({ ids: [], next: 0 });

// Reads the own-walls list from a save, ignoring anything that doesn't look right.
export function parseOwn(raw) {
  const own = emptyOwn();
  if (!raw || typeof raw !== 'object') return own;
  let top = -1;
  if (Array.isArray(raw.ids)) {
    const seen = new Set();
    for (const id of raw.ids) {
      if (!isOwnId(id) || seen.has(id)) continue;
      if (own.ids.length >= OWN_MAX) break;
      seen.add(id);
      own.ids.push(id);
      top = Math.max(top, Number(OWN_ID.exec(id)[1]));
    }
  }
  const n = Number.isInteger(raw.n) && raw.n >= 0 && raw.n < 1e9 ? raw.n : 0;
  own.next = Math.max(n, top + 1);
  return own;
}

// Whether another wall can be added. `lastSave` is what trySave returned last time (or
// null before the first save): a save that failed, had to be squeezed, or is already big
// means storage is filling up.
export function canAddWall(progress, lastSave = null) {
  const own = progress.own || emptyOwn();
  if (own.ids.length >= OWN_MAX || own.next >= 1e9) return false;
  if (lastSave && (lastSave.budget !== WALL_BUDGET || lastSave.chars > SAVE_SOFT_MAX)) return false;
  return true;
}

// Adds a new blank wall at the end. Returns its id, or null when there's no room.
export function addOwnWall(progress, lastSave = null) {
  if (!progress.own) progress.own = emptyOwn();
  if (!canAddWall(progress, lastSave)) return null;
  const id = `own-${progress.own.next++}`;
  progress.own.ids.push(id);
  progress.walls[id] = createWall(ownMural(id));
  return id;
}

// Removes one of his walls for good. Returns where it was in the list, or -1 (murals and
// the four free walls can't be removed).
export function removeOwnWall(progress, id) {
  const own = progress.own;
  if (!own || !isOwnId(id)) return -1;
  const i = own.ids.indexOf(id);
  if (i < 0) return -1;
  own.ids.splice(i, 1);
  delete progress.walls[id];
  return i;
}
