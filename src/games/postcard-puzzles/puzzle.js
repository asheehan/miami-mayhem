// Postcard Puzzles rules. Pure and seeded: no DOM, no drawing. The cut (which edges get a
// tab, where the knob sits), the screen layout (board + tray), scattering, picking up,
// dragging, snapping home, hints, completion and saved progress all live here.
//
// Units: piece positions are in picture units (the picture is PIC_W x PIC_H, its top-left
// corner is the board's top-left corner). Pointer positions are screen CSS pixels; the
// layout converts between the two.

// ---------------------------------------------------------------------------------------------
// Tuning
// ---------------------------------------------------------------------------------------------

// The picture's logical size: 3:4 portrait, so the board fills a phone's width and leaves
// a tray underneath, and even the 24-piece cut has pieces close to square.
export const PIC_W = 600;
export const PIC_H = 800;

// How far a dropped piece's centre may be from its home and still click in, as a fraction
// of the smaller side of one cell. 0.4 is generous: anywhere over most of the right cell.
export const SNAP_FRAC = 0.4;

// A held piece is drawn this much larger than its board size, lifted with a shadow.
export const LIFT_SCALE = 1.1;

// The held piece sits this far above the finger (screen px, as a fraction of its height
// on screen, clamped), so the finger never hides it.
export const LIFT_UP_FRAC = 0.32;
export const LIFT_UP_MIN = 26;
export const LIFT_UP_MAX = 80;

// Seconds without a placement before one loose piece and its home outline start pulsing.
export const HINT_DELAY = 20;

// Knob height as a fraction of the smaller side of a cell. Head radius and neck width are
// fractions of the knob height. Per-edge jitter keeps every knob a little different.
export const TAB_SIZE = 0.24;
export const HEAD_R = 0.55;
export const NECK_HALF = 0.32;
export const KNOB_SHIFT = 0.08; // knob centre moves up to this fraction of the edge off-centre
export const KNOB_GROW = 0.1; // knob height varies by up to +-10%

// Extra hit area around a piece's cell (screen px): small fingers, generous targets.
export const HIT_SLOP = 10;

// The tray: pieces waiting there are drawn smaller (never larger than TRAY_MAX_SCALE of
// their board size) in a jittered grid of slots. TRAY_CROWD lets a piece's tabs spill a
// little into the neighbouring slot so the bodies stay bigger. The board shrinks (down to
// BOARD_MIN_FRAC of the most it could be) until tray pieces are at least TRAY_MIN_PX tall.
export const TRAY_MAX_SCALE = 0.85;
export const TRAY_CROWD = 1.18;
export const TRAY_JITTER = 0.1;
export const TRAY_MIN_PX = 54;
export const BOARD_MIN_FRAC = 0.72;

// The three puzzle sizes the player can choose, smallest first.
export const SIZES = [
  { n: 6, cols: 2, rows: 3 },
  { n: 12, cols: 3, rows: 4 },
  { n: 24, cols: 4, rows: 6 },
];
export const sizeOf = (n) => SIZES.find((s) => s.n === n) || SIZES[0];

// ---------------------------------------------------------------------------------------------
// Seeded randomness
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

export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Each picture at each size always gets the same cut.
export const seedFor = (sceneId, n) => (hashString(sceneId) ^ Math.imul(n, 2654435761)) >>> 0;

// ---------------------------------------------------------------------------------------------
// The cut
// ---------------------------------------------------------------------------------------------

// An edge shared by two pieces. dir +1: the knob sticks out toward +x / +y (into the
// right / lower piece); -1 the other way. `at` is the knob centre measured from the
// edge's top / left end; `grow` scales the knob.
function makeEdge(rng, len) {
  return {
    dir: rng() < 0.5 ? 1 : -1,
    at: len * (0.5 + (rng() * 2 - 1) * KNOB_SHIFT),
    grow: 1 + (rng() * 2 - 1) * KNOB_GROW,
    len,
  };
}

// The cut for a cols x rows grid. Each piece lists its four sides as
// { type: 1 tab | -1 blank | 0 flat, edge } where `edge` is shared with the neighbour.
export function makeCut(cols, rows, seed) {
  const rng = makeRng(seed);
  const cw = PIC_W / cols;
  const ch = PIC_H / rows;
  const tab = TAB_SIZE * Math.min(cw, ch);
  // hEdges[r][c]: between row r and r + 1 in column c; vEdges[r][c]: between col c and c + 1
  const hEdges = [];
  for (let r = 0; r < rows - 1; r++) {
    hEdges.push([]);
    for (let c = 0; c < cols; c++) hEdges[r].push(makeEdge(rng, cw));
  }
  const vEdges = [];
  for (let r = 0; r < rows; r++) {
    vEdges.push([]);
    for (let c = 0; c < cols - 1; c++) vEdges[r].push(makeEdge(rng, ch));
  }
  const pieces = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const top = row > 0 ? hEdges[row - 1][col] : null;
      const bottom = row < rows - 1 ? hEdges[row][col] : null;
      const left = col > 0 ? vEdges[row][col - 1] : null;
      const right = col < cols - 1 ? vEdges[row][col] : null;
      pieces.push({
        i: pieces.length,
        col,
        row,
        edges: {
          top: { type: top ? -top.dir : 0, edge: top },
          right: { type: right ? right.dir : 0, edge: right },
          bottom: { type: bottom ? bottom.dir : 0, edge: bottom },
          left: { type: left ? -left.dir : 0, edge: left },
        },
      });
    }
  }
  return { cols, rows, cw, ch, tab, hEdges, vEdges, pieces, seed };
}

// One side of a piece as path segments, in picture units relative to the piece's home
// top-left. A segment is [x, y] (line) or [c1x, c1y, c2x, c2y, x, y] (cubic). The knob is
// mirror-symmetric about its centre, so both neighbours trace exactly the same curve.
function sideSegments(cut, side, ax, ay, bx, by, nx, ny) {
  const { type, edge } = side;
  if (!type) return [[bx, by]];
  const len = Math.hypot(bx - ax, by - ay);
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;
  // canonical knob position is from the top / left end; this side may run the other way
  const forward = ux > 0.5 || uy > 0.5;
  const c = forward ? edge.at : len - edge.at;
  const T = cut.tab * edge.grow;
  const r = HEAD_R * T;
  const nw = NECK_HALF * T;
  const k = 0.5523 * r;
  const P = (u, v) => [ax + ux * u + nx * v * type, ay + uy * u + ny * v * type];
  const seg = (...pts) => pts.flatMap(([u, v]) => P(u, v));
  return [
    seg([(c - nw) * 0.45, 0], [c - nw - 0.3 * T, -0.06 * T], [c - nw, 0]),
    seg([c - nw + 0.12 * T, 0.32 * T], [c - r, T - r - 0.6 * r], [c - r, T - r]),
    seg([c - r, T - r + k], [c - k, T], [c, T]),
    seg([c + k, T], [c + r, T - r + k], [c + r, T - r]),
    seg([c + r, T - r - 0.6 * r], [c + nw - 0.12 * T, 0.32 * T], [c + nw, 0]),
    seg([c + nw + 0.3 * T, -0.06 * T], [len - (len - c - nw) * 0.45, 0], [len, 0]),
  ];
}

// A piece's outline, clockwise from its top-left corner: { top, right, bottom, left },
// each a list of segments (see sideSegments). Start point is (0, 0).
export function pieceSides(cut, i) {
  const p = cut.pieces[i];
  const { cw, ch } = cut;
  return {
    top: sideSegments(cut, p.edges.top, 0, 0, cw, 0, 0, -1),
    right: sideSegments(cut, p.edges.right, cw, 0, cw, ch, 1, 0),
    bottom: sideSegments(cut, p.edges.bottom, cw, ch, 0, ch, 0, 1),
    left: sideSegments(cut, p.edges.left, 0, ch, 0, 0, -1, 0),
  };
}

// Replays a piece outline onto anything with moveTo / lineTo / bezierCurveTo, scaled by k
// and offset by (ox, oy).
export function tracePiece(target, cut, i, k = 1, ox = 0, oy = 0) {
  const s = pieceSides(cut, i);
  target.moveTo(ox, oy);
  for (const side of [s.top, s.right, s.bottom, s.left]) {
    for (const g of side) {
      if (g.length === 2) target.lineTo(ox + g[0] * k, oy + g[1] * k);
      else target.bezierCurveTo(ox + g[0] * k, oy + g[1] * k, ox + g[2] * k, oy + g[3] * k, ox + g[4] * k, oy + g[5] * k);
    }
  }
  target.closePath?.();
}

// How far any knob can reach outside a piece's cell (picture units).
export const piecePad = (cut) => cut.tab * (1 + KNOB_GROW) + 2;

// ---------------------------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------------------------

// Best grid of n slots in a box, for items of aspect bw:bh. Returns { cols, rows, sw, sh, k }
// where k is the scale an item can take to fit a slot.
function slotGrid(n, W, H, bw, bh) {
  let best = null;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const sw = W / cols;
    const sh = H / rows;
    const k = Math.min(sw / bw, sh / bh);
    if (!best || k > best.k + 1e-9) best = { cols, rows, sw, sh, k };
  }
  return best;
}

// Screen layout for a puzzle of the given size: HUD strip on top, the board, and the tray
// (under the board in portrait, beside it in landscape).
export function computeLayout(w, h, size) {
  const { n, cols, rows } = size;
  const cw = PIC_W / cols;
  const ch = PIC_H / rows;
  const pad = TAB_SIZE * (1 + KNOB_GROW) * Math.min(cw, ch);
  const m = Math.max(8, Math.min(w, h) * 0.02);
  const hudH = Math.max(56, Math.min(92, h * 0.075));
  const landscape = w > h * 1.05;
  const build = (s) => {
    const bw = PIC_W * s;
    const bh = PIC_H * s;
    let bx;
    let by;
    let tray;
    if (landscape) {
      bx = m;
      by = hudH + (h - hudH - m - bh) / 2;
      tray = { x: bx + bw + m * 1.5, y: hudH, w: w - bw - m * 3.5, h: h - hudH - m };
    } else {
      bx = (w - bw) / 2;
      by = hudH;
      tray = { x: m, y: by + bh + m * 1.5, w: w - m * 2, h: h - by - bh - m * 2.5 };
    }
    const boxW = (cw + pad * 2) * s;
    const boxH = (ch + pad * 2) * s;
    const grid = slotGrid(n, Math.max(1, tray.w), Math.max(1, tray.h), boxW, boxH);
    const trayScale = Math.max(0.05, Math.min(TRAY_MAX_SCALE, grid.k * TRAY_CROWD));
    return { w, h, s, bx, by, bw, bh, hudH, m, tray, grid, trayScale, trayPx: trayScale * ch * s, landscape };
  };
  const maxS = landscape
    ? Math.min((h - hudH - m) / PIC_H, (w * 0.62) / PIC_W)
    : Math.min((w - m * 2) / PIC_W, (h - hudH - m) * 0.72 / PIC_H);
  // Biggest board whose tray pieces are big enough; failing that, whichever board size
  // gives the biggest tray pieces.
  let best = null;
  for (let s = maxS; s >= maxS * BOARD_MIN_FRAC - 1e-9; s -= maxS * 0.02) {
    const L = build(s);
    if (L.trayPx >= TRAY_MIN_PX) return L;
    if (!best || L.trayPx > best.trayPx + 0.5) best = L;
  }
  return best;
}

export const toScreen = (L, x, y) => ({ x: L.bx + x * L.s, y: L.by + y * L.s });
export const toPic = (L, x, y) => ({ x: (x - L.bx) / L.s, y: (y - L.by) / L.s });
const inRect = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

// ---------------------------------------------------------------------------------------------
// A puzzle in play
// ---------------------------------------------------------------------------------------------

export const homeOf = (cut, i) => ({ x: (cut.pieces[i].col + 0.5) * cut.cw, y: (cut.pieces[i].row + 0.5) * cut.ch });

// state: { sceneId, size, cut, layout, pieces: [{ i, x, y, placed }], order (draw order,
// last on top), held, status 'play' | 'done', idle (s since last placement), placedCount }
export function createPuzzle({ sceneId, size, w, h, seed }) {
  const sz = typeof size === 'number' ? sizeOf(size) : size;
  const cutSeed = seed ?? seedFor(sceneId, sz.n);
  const cut = makeCut(sz.cols, sz.rows, cutSeed);
  const layout = computeLayout(w, h, sz);
  const state = {
    sceneId,
    size: sz,
    cut,
    layout,
    pieces: cut.pieces.map((p) => ({ i: p.i, x: 0, y: 0, placed: false })),
    order: cut.pieces.map((p) => p.i),
    held: null,
    status: 'play',
    idle: 0,
    time: 0,
    placedCount: 0,
    lastPlaced: -1,
  };
  scatter(state, makeRng(cutSeed ^ 0x9e3779b9));
  return state;
}

// Deals every loose piece into the tray: a shuffled, slightly jittered grid of slots.
export function scatter(state, rng) {
  const L = state.layout;
  const loose = state.pieces.filter((p) => !p.placed);
  const slots = [];
  for (let k = 0; k < loose.length; k++) slots.push(k);
  for (let k = slots.length - 1; k > 0; k--) {
    const j = Math.floor(rng() * (k + 1));
    [slots[k], slots[j]] = [slots[j], slots[k]];
  }
  const { cols, sw, sh } = L.grid;
  // centre the used rows/cols in the tray
  const usedRows = Math.ceil(loose.length / cols);
  const ox = L.tray.x;
  const oy = L.tray.y + (L.tray.h - usedRows * sh) / 2;
  loose.forEach((p, k) => {
    const slot = slots[k];
    const c = slot % cols;
    const r = Math.floor(slot / cols);
    const lastRowCount = loose.length - (usedRows - 1) * cols;
    const rowShift = r === usedRows - 1 ? ((cols - lastRowCount) * sw) / 2 : 0;
    const sx = ox + rowShift + (c + 0.5) * sw + (rng() * 2 - 1) * TRAY_JITTER * sw;
    const sy = oy + (r + 0.5) * sh + (rng() * 2 - 1) * TRAY_JITTER * sh;
    const q = toPic(L, sx, sy);
    p.x = q.x;
    p.y = q.y;
    clampPiece(state, p);
  });
}

// A loose piece is drawn small while its centre is over the tray, full size elsewhere.
export function pieceScale(state, p) {
  if (p.placed) return 1;
  if (state.held === p.i) return LIFT_SCALE;
  const L = state.layout;
  const c = toScreen(L, p.x, p.y);
  return inRect(L.tray, c.x, c.y) ? L.trayScale : 1;
}

// Keeps a loose piece's cell fully on screen (below the HUD strip).
function clampPiece(state, p) {
  const L = state.layout;
  const k = pieceScale(state, p);
  const hw = (state.cut.cw / 2) * k;
  const hh = (state.cut.ch / 2) * k;
  const a = toPic(L, 2, L.hudH + 2);
  const b = toPic(L, L.w - 2, L.h - 2);
  p.x = Math.min(Math.max(p.x, a.x + hw), Math.max(a.x + hw, b.x - hw));
  p.y = Math.min(Math.max(p.y, a.y + hh), Math.max(a.y + hh, b.y - hh));
}

// The loose piece drawn on top under a screen point, or -1. Placed pieces can't be taken.
export function pieceAt(state, sx, sy) {
  const L = state.layout;
  for (let o = state.order.length - 1; o >= 0; o--) {
    const p = state.pieces[state.order[o]];
    if (p.placed) continue;
    const k = pieceScale(state, p);
    const c = toScreen(L, p.x, p.y);
    const hw = (state.cut.cw / 2) * k * L.s + HIT_SLOP;
    const hh = (state.cut.ch / 2) * k * L.s + HIT_SLOP;
    if (Math.abs(sx - c.x) <= hw && Math.abs(sy - c.y) <= hh) return p.i;
  }
  return -1;
}

// Screen px the held piece floats above the finger.
export function liftUp(state) {
  const px = state.cut.ch * state.layout.s * LIFT_SCALE * LIFT_UP_FRAC;
  return Math.max(LIFT_UP_MIN, Math.min(LIFT_UP_MAX, px));
}

// Finger down at a screen point. Returns the piece index picked up, or -1.
export function pickUp(state, sx, sy) {
  if (state.status !== 'play' || state.held !== null) return -1;
  const i = pieceAt(state, sx, sy);
  if (i < 0) return -1;
  state.held = i;
  state.order = state.order.filter((j) => j !== i).concat(i);
  dragTo(state, sx, sy);
  return i;
}

// Finger moved: the held piece's centre follows, lifted above the finger.
export function dragTo(state, sx, sy) {
  if (state.held === null) return;
  const L = state.layout;
  const q = toPic(L, sx, sy - liftUp(state));
  const p = state.pieces[state.held];
  p.x = q.x;
  p.y = q.y;
}

export const snapDistance = (cut) => SNAP_FRAC * Math.min(cut.cw, cut.ch);

// Finger up. Close enough to home: the piece clicks in and is locked. Otherwise it stays
// where it was let go, kept on screen. Returns { i, placed } or null if nothing was held.
export function drop(state) {
  if (state.held === null) return null;
  const i = state.held;
  const p = state.pieces[i];
  state.held = null;
  const home = homeOf(state.cut, i);
  if (Math.hypot(p.x - home.x, p.y - home.y) <= snapDistance(state.cut)) {
    p.x = home.x;
    p.y = home.y;
    p.placed = true;
    state.placedCount++;
    state.lastPlaced = i;
    state.idle = 0;
    state.order = state.order.filter((j) => j !== i);
    if (isComplete(state)) state.status = 'done';
    return { i, placed: true };
  }
  clampPiece(state, p);
  return { i, placed: false };
}

export const isComplete = (state) => state.pieces.every((p) => p.placed);

export function tick(state, dt) {
  state.time += dt;
  if (state.status === 'play' && state.held === null) state.idle += dt;
}

// After HINT_DELAY seconds without a placement, the loose piece to pulse (top-most first,
// so it is never one buried under others), else -1.
export function hintPiece(state) {
  if (state.status !== 'play' || state.idle < HINT_DELAY) return -1;
  for (let o = state.order.length - 1; o >= 0; o--) {
    const p = state.pieces[state.order[o]];
    if (!p.placed && state.held !== p.i) return p.i;
  }
  return -1;
}

// New screen size: board and tray move; loose pieces keep their place relative to the
// tray (if they were in it) or to the screen, and stay on screen.
export function relayout(state, w, h) {
  const old = state.layout;
  const L = computeLayout(w, h, state.size);
  const moves = state.pieces.map((p) => {
    if (p.placed) return null;
    const c = toScreen(old, p.x, p.y);
    if (inRect(old.tray, c.x, c.y)) {
      const u = (c.x - old.tray.x) / old.tray.w;
      const v = (c.y - old.tray.y) / old.tray.h;
      return { x: L.tray.x + u * L.tray.w, y: L.tray.y + v * L.tray.h };
    }
    return { x: (c.x / old.w) * w, y: (c.y / old.h) * h };
  });
  state.layout = L;
  state.pieces.forEach((p, k) => {
    if (!moves[k]) return;
    const q = toPic(L, moves[k].x, moves[k].y);
    p.x = q.x;
    p.y = q.y;
    clampPiece(state, p);
  });
}

// Plays one move the way a finger would: takes the top-most loose piece (by touching its
// centre), carries it to just above its home and lets go. Returns the result of the drop.
export function solveStep(state) {
  if (state.status !== 'play') return null;
  for (let o = state.order.length - 1; o >= 0; o--) {
    const p = state.pieces[state.order[o]];
    if (p.placed) continue;
    const c = toScreen(state.layout, p.x, p.y);
    const i = pickUp(state, c.x, c.y);
    if (i < 0) continue;
    const hp = homeOf(state.cut, i);
    const home = toScreen(state.layout, hp.x, hp.y);
    dragTo(state, home.x, home.y + liftUp(state));
    return drop(state);
  }
  return null;
}

export function autosolve(state) {
  let guard = state.pieces.length * 4;
  while (state.status === 'play' && guard-- > 0) solveStep(state);
  return isComplete(state);
}

// ---------------------------------------------------------------------------------------------
// Saved progress: { done: { [sceneId]: [sizes finished, ascending] } }
// ---------------------------------------------------------------------------------------------

export const SAVE_KEY = 'postcard-puzzles-progress';

export function normalizeProgress(raw, sceneIds) {
  const done = {};
  const src = raw && typeof raw === 'object' && raw.done && typeof raw.done === 'object' ? raw.done : {};
  for (const id of sceneIds) {
    const list = Array.isArray(src[id]) ? src[id] : [];
    const sizes = SIZES.map((s) => s.n).filter((n) => list.some((v) => Number(v) === n));
    if (sizes.length) done[id] = sizes;
  }
  return { done };
}

export function loadProgress(storage, sceneIds) {
  try {
    return normalizeProgress(JSON.parse(storage.getItem(SAVE_KEY) || '{}'), sceneIds);
  } catch {
    return { done: {} };
  }
}

export function saveProgress(storage, progress) {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(progress));
  } catch {
    // not kept if storage is unavailable
  }
}

export function recordDone(progress, sceneId, n) {
  const list = progress.done[sceneId] || [];
  if (!list.includes(n)) progress.done[sceneId] = SIZES.map((s) => s.n).filter((v) => v === n || list.includes(v));
  return progress;
}

export const finished = (progress, sceneId) => (progress.done[sceneId] || []).length > 0;
