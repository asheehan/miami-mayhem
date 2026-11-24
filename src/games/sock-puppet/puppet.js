// The puppet: a sock (shape, colour, pattern) and the parts stuck on it. Pure: no DOM, no
// drawing. Adding, moving, resizing, turning and removing parts, layers, mirror snapping,
// undo, hit testing (top-most wins, the resize handle), random puppets, names, and the
// compact saved form.
//
// Units are puppet units (see parts.js): (0, 0) is the middle of the face, +y is down.
import { PARTS, DRAWERS, partDef } from './parts.js';
import { FELT } from './art.js';
import { makeRng, pick, shuffled } from './rng.js';

// ---------------------------------------------------------------------------------------------
// The sock
// ---------------------------------------------------------------------------------------------

// Right half of each sock's outline from the top of the head (x = 0) down to the top of the
// cuff, as [x, y] points; the left half is the mirror. The cuff runs from cuffTop to cuffBottom
// and the arm carries on below it, off the bottom of the picture.
export const SHAPES = {
  long: {
    half: [[0, -214], [66, -206], [108, -176], [126, -118], [129, -40], [125, 40], [114, 110], [100, 190], [96, 260], [100, 318]],
    mouthY: 64, cuffTop: 318, cuffBottom: 392, cuffW: 112, armW: 84, toeY: -150,
  },
  stubby: {
    half: [[0, -178], [80, -170], [128, -132], [147, -66], [149, 6], [143, 70], [129, 130], [118, 180], [120, 212]],
    mouthY: 52, cuffTop: 212, cuffBottom: 282, cuffW: 130, armW: 88, toeY: -118,
  },
  chunky: {
    half: [[0, -198], [96, -190], [150, -150], [169, -80], [171, 0], [165, 80], [151, 150], [144, 210], [148, 262]],
    mouthY: 62, cuffTop: 262, cuffBottom: 336, cuffW: 160, armW: 96, toeY: -136,
  },
};
export const SHAPE_IDS = ['long', 'stubby', 'chunky'];
export const PATTERNS = ['plain', 'stripes', 'dots', 'argyle', 'zigzag', 'rainbow', 'patches'];
export const COLOUR_COUNT = FELT.length;

// The whole outline (head and tube, not the cuff) as a flat [x0, y0, x1, y1, ...] polygon.
export function bodyOutline(shapeId) {
  const sh = SHAPES[shapeId] || SHAPES.long;
  const right = sh.half;
  const pts = [];
  for (const [x, y] of right) pts.push(x, y);
  for (let i = right.length - 1; i >= 1; i--) pts.push(-right[i][0], right[i][1]);
  if (right[0][0] !== 0) pts.push(-right[0][0], right[0][1]);
  return pts;
}

// Half the sock's width at height y (0 above the head or below the cuff).
export function halfWidthAt(shapeId, y) {
  const sh = SHAPES[shapeId] || SHAPES.long;
  if (y >= sh.cuffTop && y <= sh.cuffBottom) return sh.cuffW;
  const h = sh.half;
  if (y < h[0][1] || y > h[h.length - 1][1]) return 0;
  for (let i = 1; i < h.length; i++) {
    if (y <= h[i][1]) {
      const [x0, y0] = h[i - 1];
      const [x1, y1] = h[i];
      const u = y1 === y0 ? 0 : (y - y0) / (y1 - y0);
      // the top is round, not pointy
      if (i === 1) return x1 * Math.sqrt(Math.max(0, u * (2 - u)));
      return x0 + (x1 - x0) * u;
    }
  }
  return 0;
}

const maxHalf = (sh) => sh.half.reduce((m, [x]) => Math.max(m, x), 0);

// How much wider than the long sock this sock's head is.
export const widthOf = (shapeId) => maxHalf(SHAPES[shapeId] || SHAPES.long) / maxHalf(SHAPES.long);

// Where a part goes when it's tapped in rather than dragged, fitted to the sock's shape:
// things on top of the head follow the top, things at the neck follow the cuff, and hats
// and hair grow to fit a wider head. { x, y, s }
export function spotFor(p, def) {
  const sh = SHAPES[p.sock.shape] || SHAPES.long;
  const L = SHAPES.long;
  const wide = widthOf(p.sock.shape);
  let [x, y] = def.at;
  let s = 1;
  if (y < -130) y += sh.half[0][1] - L.half[0][1];
  else if (y > 120) y += (sh.cuffTop - L.cuffTop) * 0.8;
  if (def.pair || Math.abs(x) > 60) x *= wide;
  if (def.drawer === 'hats' || (def.drawer === 'hair' && !def.pair)) s = wide;
  return { x, y, s };
}

export function insideSock(shapeId, x, y) {
  const w = halfWidthAt(shapeId, y);
  return w > 0 && Math.abs(x) <= w;
}

// ---------------------------------------------------------------------------------------------
// A puppet
// ---------------------------------------------------------------------------------------------

export const MAX_PARTS = 40;
export const HISTORY_MAX = 60;
export const SCALE_MIN = 0.4;
export const SCALE_MAX = 3;
export const BOUNDS = { x0: -290, x1: 290, y0: -380, y1: 440 };
export const SNAP = 34; // a pair part this close to the mirror of its partner lands exactly there
export const CENTRE_SNAP = 14; // a single part this close to the middle lands on it
export const ANGLE_SNAP = 0.09; // radians: nearly level becomes level
export const MIN_HIT = 70; // the smallest box a finger has to find, in units
export const NAME_MAX = 16;

const round1 = (v) => Math.round(v * 10) / 10;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function createPuppet({ uid = 'p0', name = 'Noodle', shape = 'long', colour = 6, pattern = 'plain', pcolour = 10 } = {}) {
  return { uid, name, sock: { shape, colour, pattern, pcolour }, parts: [], extra: [], history: [] };
}

const snapshot = (p) => ({ sock: { ...p.sock }, parts: p.parts.map((q) => ({ ...q })), name: p.name });

// Remember how things are now, so undo can come back to it. Call once before a change (a
// whole drag is one change).
export function beginEdit(p) {
  p.history.push(snapshot(p));
  if (p.history.length > HISTORY_MAX) p.history.shift();
}

export function undo(p) {
  const h = p.history.pop();
  if (!h) return false;
  p.sock = h.sock;
  p.parts = h.parts;
  p.name = h.name;
  return true;
}

export const canUndo = (p) => p.history.length > 0;

const clampPos = (q) => {
  q.x = round1(clamp(q.x, BOUNDS.x0, BOUNDS.x1));
  q.y = round1(clamp(q.y, BOUNDS.y0, BOUNDS.y1));
};

// Sticks a part on at (x, y) (its default spot if x is undefined). Returns its index, or -1
// when the puppet is full or the id is unknown. Snaps (see snapPart) unless opts.snap = false.
export function addPart(p, id, x, y, opts = {}) {
  const def = partDef(id);
  if (!def || p.parts.length >= MAX_PARTS) return -1;
  if (opts.history !== false) beginEdit(p);
  let px = x;
  let py = y;
  let ps = opts.s ?? 1;
  if (px === undefined || py === undefined) {
    const spot = spotFor(p, def);
    px = spot.x;
    py = spot.y;
    ps = opts.s ?? spot.s;
    // a second one of a pair goes on the other side
    if (def.pair && p.parts.some((q) => q.id === id && q.x > 0)) px = -px;
  }
  const q = {
    id, x: px, y: py, s: clamp(ps, SCALE_MIN, SCALE_MAX), r: opts.r ?? 0,
    back: opts.back ?? def.back, c: def.tint === null ? -1 : (opts.c ?? def.tint),
  };
  clampPos(q);
  p.parts.push(q);
  const i = p.parts.length - 1;
  if (opts.snap !== false) snapPart(p, i);
  return i;
}

export function movePart(p, i, x, y) {
  const q = p.parts[i];
  if (!q) return;
  q.x = x;
  q.y = y;
  clampPos(q);
}

export function scalePart(p, i, s) {
  const q = p.parts[i];
  if (q) q.s = round1(clamp(s, SCALE_MIN, SCALE_MAX) * 100) / 100;
}

export function rotatePart(p, i, r) {
  const q = p.parts[i];
  if (!q) return;
  // keep it in -pi..pi
  let a = r % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  q.r = Math.round(a * 1000) / 1000;
}

export function removePart(p, i) {
  if (!p.parts[i]) return false;
  beginEdit(p);
  p.parts.splice(i, 1);
  return true;
}

// Behind the sock <-> in front of it. Either way it goes on top of its new layer.
export function toggleLayer(p, i) {
  const q = p.parts[i];
  if (!q) return -1;
  beginEdit(p);
  q.back = !q.back;
  p.parts.splice(i, 1);
  p.parts.push(q);
  return p.parts.length - 1;
}

// Brings a part to the top of its layer. Returns its new index.
export function raisePart(p, i) {
  const q = p.parts[i];
  if (!q) return -1;
  p.parts.splice(i, 1);
  p.parts.push(q);
  return p.parts.length - 1;
}

export const canRecolour = (q) => !!q && q.c >= 0;

// The next felt colour for a tinted part.
export function recolour(p, i) {
  const q = p.parts[i];
  if (!canRecolour(q)) return false;
  beginEdit(p);
  q.c = (q.c + 1) % FELT.length;
  return true;
}

export function setSock(p, key, value) {
  const ok = (key === 'shape' && SHAPES[value]) || (key === 'pattern' && PATTERNS.includes(value))
    || ((key === 'colour' || key === 'pcolour') && Number.isInteger(value) && value >= 0 && value < FELT.length);
  if (!ok || p.sock[key] === value) return false;
  beginEdit(p);
  p.sock[key] = value;
  return true;
}

export function setName(p, name) {
  const n = cleanName(name);
  if (!n || n === p.name) return false;
  beginEdit(p);
  p.name = n;
  return true;
}

// Mirror snapping. A pair part near the mirror image of another part from its drawer lands
// exactly on it (and takes the same size and a mirrored tilt when it is the same part and
// already close). A single part near the middle goes to the middle. Nearly-level parts level
// off. Silly places are fine: nothing is snapped from far away. Returns true if it moved.
export function snapPart(p, i) {
  const q = p.parts[i];
  const def = q && partDef(q.id);
  if (!def) return false;
  const was = `${q.x},${q.y},${q.s},${q.r}`;
  if (Math.abs(q.r) < ANGLE_SNAP) q.r = 0;
  if (def.pair) {
    let best = null;
    let bestD = SNAP;
    p.parts.forEach((o, k) => {
      if (k === i) return;
      const od = partDef(o.id);
      if (!od || !od.pair || od.drawer !== def.drawer) return;
      if (Math.abs(o.x) < 8) return; // a part in the middle has no mirror
      const d = Math.hypot(q.x + o.x, q.y - o.y);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    });
    if (best) {
      q.x = -best.x;
      q.y = best.y;
      if (best.id === q.id) {
        if (Math.abs(q.s - best.s) <= best.s * 0.25) q.s = best.s;
        if (Math.abs(q.r + best.r) < 0.35) q.r = -best.r;
      }
    }
  } else if (Math.abs(q.x) < CENTRE_SNAP) q.x = 0;
  return was !== `${q.x},${q.y},${q.s},${q.r}`;
}

// ---------------------------------------------------------------------------------------------
// Hit testing
// ---------------------------------------------------------------------------------------------

// Draw order: parts behind the sock (in list order), the sock, parts in front (in list order).
export function drawOrder(p) {
  const back = [];
  const front = [];
  p.parts.forEach((q, i) => (q.back ? back : front).push(i));
  return { back, front };
}

// A puppet point in a part's own frame (before its scale), mirrored on the left for pairs.
export function toLocal(q, x, y) {
  const dx = x - q.x;
  const dy = y - q.y;
  const c = Math.cos(-q.r);
  const s = Math.sin(-q.r);
  return { x: (dx * c - dy * s) / q.s, y: (dx * s + dy * c) / q.s };
}

export function insidePart(q, x, y) {
  const def = partDef(q.id);
  if (!def) return false;
  const l = toLocal(q, x, y);
  const hw = Math.max(def.w / 2, MIN_HIT / 2 / q.s);
  const hh = Math.max(def.h / 2, MIN_HIT / 2 / q.s);
  // a rounded box: the corners are a little forgiving but not the whole rectangle
  const ex = Math.abs(l.x) / hw;
  const ey = Math.abs(l.y) / hh;
  return ex <= 1 && ey <= 1 && ex * ex + ey * ey <= 1.6;
}

// Where the selected part's resize-and-turn handle sits: its top-right corner, pushed out to
// at least minDist from its middle so a tiny part still has room for a finger. below = true
// puts it on the bottom-right corner instead (when the top is off the screen).
export function handlePos(q, minDist = 70, below = false) {
  const def = partDef(q.id);
  const w = def ? def.w : 60;
  const h = def ? def.h : 60;
  let hx = (w / 2) * q.s;
  let hy = ((below ? h : -h) / 2) * q.s;
  const d = Math.hypot(hx, hy) || 1;
  if (d < minDist) {
    hx *= minDist / d;
    hy *= minDist / d;
  }
  const c = Math.cos(q.r);
  const s = Math.sin(q.r);
  return { x: q.x + hx * c - hy * s, y: q.y + hx * s + hy * c };
}

// What's under a puppet point. opts: { selected, handleR, handleMin }
// Returns { kind: 'handle', index } | { kind: 'part', index } | { kind: 'sock' } | null.
// The handle of the selected part wins, then parts in front (top-most first), then the sock,
// then parts behind it.
export function hitTest(p, x, y, opts = {}) {
  const { selected = -1, handleR = 40, handleMin = 70, below = false } = opts;
  const sel = p.parts[selected];
  if (sel) {
    const hp = handlePos(sel, handleMin, below);
    if (Math.hypot(x - hp.x, y - hp.y) <= handleR) return { kind: 'handle', index: selected };
  }
  const { back, front } = drawOrder(p);
  for (let k = front.length - 1; k >= 0; k--) if (insidePart(p.parts[front[k]], x, y)) return { kind: 'part', index: front[k] };
  const sh = SHAPES[p.sock.shape] || SHAPES.long;
  if (insideSock(p.sock.shape, x, y) || (y > sh.cuffBottom && Math.abs(x) <= sh.armW)) return { kind: 'sock' };
  for (let k = back.length - 1; k >= 0; k--) if (insidePart(p.parts[back[k]], x, y)) return { kind: 'part', index: back[k] };
  return null;
}

// Scale and turn from dragging the handle: the part keeps its middle, and the handle follows
// the finger. part0 is the part as it was when the drag began, from/to the finger then and now.
export function handleTransform(part0, from, to) {
  const v0x = from.x - part0.x;
  const v0y = from.y - part0.y;
  const v1x = to.x - part0.x;
  const v1y = to.y - part0.y;
  const d0 = Math.hypot(v0x, v0y) || 1;
  const d1 = Math.hypot(v1x, v1y);
  const s = clamp(part0.s * (d1 / d0), SCALE_MIN, SCALE_MAX);
  const r = part0.r + Math.atan2(v1y, v1x) - Math.atan2(v0y, v0x);
  return { s, r };
}

// ---------------------------------------------------------------------------------------------
// Jaws: which parts move with the top of the head when the mouth opens
// ---------------------------------------------------------------------------------------------

export function onTopJaw(p, q) {
  const def = partDef(q.id);
  const sh = SHAPES[p.sock.shape] || SHAPES.long;
  const y = def && def.hang ? q.y - (def.h / 2) * q.s : q.y;
  return y < sh.mouthY;
}

// ---------------------------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------------------------

export const NAMES = [
  'Sir Socks-a-lot', 'Noodle', 'Captain Toes', 'Professor Fluff', 'Wiggles', 'Lady Lint',
  'Mr. Stinky', 'Pickle', 'Toe-bert', 'Banana Pants', 'Sockrates', 'Fuzzy McFuzz',
];

// Letters typed on the tiles ('RILEY') become a name ('Riley').
export function nameFromLetters(letters) {
  return String(letters)
    .toLowerCase()
    .replace(/(^|[\s-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
}

export function cleanName(name) {
  if (typeof name !== 'string') return '';
  return name.replace(/[^\p{L}\p{N} .'\-!]/gu, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

// ---------------------------------------------------------------------------------------------
// Surprise me
// ---------------------------------------------------------------------------------------------

const drawer = (id) => DRAWERS.find((d) => d.id === id).parts;

// A random, silly but recognisable puppet.
export function randomPuppet(seed, { uid = 'p0', name } = {}) {
  const rng = makeRng(seed);
  const p = createPuppet({ uid, name: name || pick(rng, NAMES) });
  p.sock.shape = pick(rng, SHAPE_IDS);
  p.sock.colour = Math.floor(rng() * FELT.length);
  p.sock.pattern = rng() < 0.3 ? 'plain' : pick(rng, PATTERNS);
  const others = shuffled(rng, FELT.map((_, i) => i).filter((i) => i !== p.sock.colour));
  p.sock.pcolour = others[0];
  const jit = (v, a) => v + (rng() * 2 - 1) * a;
  const put = (def, x, y, o = {}) => addPart(p, def.id, x, y, { history: false, snap: false, ...o });
  const pairUp = (def, s = 1, r = 0, dx = 0, dy = 0) => {
    const x = def.at[0] + dx;
    const y = def.at[1] + dy;
    put(def, x, y, { s, r });
    put(def, -x, y, { s, r: -r });
  };
  const sh = SHAPES[p.sock.shape];
  const wide = sh.half.reduce((m, [x]) => Math.max(m, x), 0) / 120;
  // eyes: usually two, sometimes one big one, sometimes three
  const eyes = drawer('eyes');
  const roll = rng();
  if (roll < 0.12) put(eyes.find((e) => e.id === 'cyclops'), 0, jit(-70, 10), { s: jit(1, 0.15) });
  else if (roll < 0.2) put(eyes.find((e) => e.id === 'glasses'), 0, -62, { s: wide });
  else {
    const e = pick(rng, eyes.filter((d) => d.pair && d.id !== 'stalk-eye' || (d.id === 'stalk-eye' && rng() < 0.4)));
    const s = jit(1.05, 0.2);
    pairUp(e, s, 0, jit(0, 6) * wide, jit(0, 10));
    if (rng() < 0.12) put(e, 0, jit(150, 20), { s: s * 0.9 }); // a spare eye on the chin
  }
  // a nose
  if (rng() < 0.85) put(pick(rng, drawer('noses')), 0, jit(-2, 6), { s: jit(1.05, 0.2) });
  // a mouth thing
  if (rng() < 0.7) {
    const m = pick(rng, drawer('mouths'));
    put(m, m.at[0], m.at[1], { s: jit(1, 0.15) });
  }
  // hair and/or a hat
  const top = rng();
  if (top < 0.45) {
    const h = pick(rng, drawer('hair'));
    if (h.pair) pairUp(h, jit(1, 0.1));
    else put(h, h.at[0], h.at[1], { s: wide * jit(1, 0.08) });
  }
  if (top > 0.3) {
    const h = pick(rng, drawer('hats'));
    put(h, h.at[0], h.at[1], { s: wide * jit(1, 0.08), r: jit(0, 0.18) });
  } else if (rng() < 0.6) {
    const e = pick(rng, drawer('ears'));
    if (e.pair) pairUp(e, jit(1, 0.12), 0, (wide - 1) * 60);
    else put(e, e.at[0], e.at[1]);
  }
  // arms
  if (rng() < 0.6) {
    const a = pick(rng, drawer('arms'));
    pairUp(a, jit(1, 0.12), jit(0, 0.25), (wide - 1) * 60, sh.cuffTop - 318);
  }
  // an extra or two
  const extras = shuffled(rng, drawer('extras'));
  const n = Math.floor(rng() * 3);
  for (let k = 0; k < n; k++) {
    const x = extras[k];
    if (x.pair) pairUp(x, 1, 0, (wide - 1) * 50);
    else put(x, x.at[0], x.at[1] + (x.at[1] > 100 ? sh.cuffTop - 318 : 0) * 0.6, { s: x.at[1] > 100 ? wide : 1 });
  }
  // sometimes one silly thing somewhere it shouldn't be
  if (rng() < 0.15) {
    const any = pick(rng, PARTS);
    put(any, jit(0, 120), jit(20, 160), { s: jit(0.8, 0.2), r: jit(0, 0.6) });
  }
  p.history = [];
  return p;
}

// ---------------------------------------------------------------------------------------------
// Saved form
// ---------------------------------------------------------------------------------------------
//
// { u: uid, n: name, k: [shape, colour, pattern, patternColour], p: [part, ...] }
// A part is [id, x, y, scale x100, turn in degrees, behind (0/1), colour (-1 = fixed)].
// Parts with ids this version doesn't know are kept as they were (a newer version made them)
// but are neither drawn nor touchable.

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export function encodePuppet(p) {
  return {
    u: p.uid,
    n: p.name,
    k: [SHAPE_IDS.indexOf(p.sock.shape), p.sock.colour, PATTERNS.indexOf(p.sock.pattern), p.sock.pcolour],
    p: [
      ...p.parts.map((q) => [q.id, Math.round(q.x) || 0, Math.round(q.y) || 0, Math.round(q.s * 100), Math.round((q.r * 180) / Math.PI) || 0, q.back ? 1 : 0, q.c]),
      ...p.extra,
    ],
  };
}

const colourOk = (v) => Number.isInteger(v) && v >= 0 && v < FELT.length;

// A puppet from saved data, or null if it isn't one.
export function decodePuppet(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (typeof raw.u !== 'string' || !/^[a-z0-9]{1,16}$/i.test(raw.u)) return null;
  const p = createPuppet({ uid: raw.u, name: cleanName(raw.n) || NAMES[1] });
  const k = Array.isArray(raw.k) ? raw.k : [];
  p.sock.shape = SHAPE_IDS[k[0]] || 'long';
  p.sock.colour = colourOk(k[1]) ? k[1] : 6;
  p.sock.pattern = PATTERNS[k[2]] || 'plain';
  p.sock.pcolour = colourOk(k[3]) ? k[3] : 10;
  for (const e of Array.isArray(raw.p) ? raw.p : []) {
    if (!Array.isArray(e) || typeof e[0] !== 'string' || !isNum(e[1]) || !isNum(e[2])) continue;
    if (p.parts.length + p.extra.length >= MAX_PARTS) break;
    const def = partDef(e[0]);
    if (!def) {
      // from a newer version: keep it, as long as it is small
      if (e[0].length <= 32 && JSON.stringify(e).length <= 200) p.extra.push(e.slice(0, 12));
      continue;
    }
    const q = {
      id: def.id,
      x: clamp(e[1], BOUNDS.x0, BOUNDS.x1),
      y: clamp(e[2], BOUNDS.y0, BOUNDS.y1),
      s: isNum(e[3]) ? clamp(e[3] / 100, SCALE_MIN, SCALE_MAX) : 1,
      r: isNum(e[4]) ? ((((e[4] % 360) + 540) % 360) - 180) * (Math.PI / 180) : 0,
      back: e[5] === 1 || e[5] === true,
      c: def.tint === null ? -1 : colourOk(e[6]) ? e[6] : def.tint,
    };
    p.parts.push(q);
  }
  return p;
}

// A deep copy without history.
export function clonePuppet(p) {
  const c = decodePuppet(JSON.parse(JSON.stringify(encodePuppet(p))));
  return c;
}

export function newUid(rng = Math.random) {
  let s = '';
  for (let i = 0; i < 8; i++) s += '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(rng() * 36)];
  return s;
}
