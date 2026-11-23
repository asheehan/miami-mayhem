// Rooftop Runaway: the shape of a level. Pure: no DOM, no three.js.
//
// The map is a flat rectangle W wide (x, east) and L long (y, north). The crowd starts at the
// south end and the getaway is at the north end. Buildings are boxes standing on it; each roof
// is its own walkable layer. Layer 0 is the street, layer i + 1 is the roof of building i.
// Links join layers: ladders and the like (up and down), trampolines (up), slides and zip
// lines (down) and hops between roofs that touch or nearly touch.
//
// A link has a trigger: a short line `a0`-`a1` on its `from` layer. Walking into it (within
// `reach`, pushing along `n`) starts the link; `t` is how far along that line it was taken,
// and the far end is the same `t` along `b0`-`b1` on the `to` layer.

export const CELL = 0.5; // grid size for robber and bot path finding
export const PAD = 0.3; // how close a body gets to a wall
export const STREET = 0;

const INF = 1e9;

// Seconds a link takes, and seconds between two people starting the same one (so a crowd
// climbs a ladder one after another).
export const LINK_KINDS = {
  ladder: { kind: 'climb', time: 1.0, gap: 0.2, off: 0.22 },
  stairs: { kind: 'climb', time: 1.1, gap: 0.18, off: 0.6 },
  crates: { kind: 'climb', time: 0.9, gap: 0.18, off: 0.3 },
  palm: { kind: 'climb', time: 1.2, gap: 0.24, off: 0.42 },
  bounce: { kind: 'bounce', time: 0.75, gap: 0.14 },
  hop: { kind: 'hop', time: 0.5, gap: 0.07 },
  slide: { kind: 'slide', time: 0.9, gap: 0.14 },
  zip: { kind: 'zip', time: 1.4, gap: 0.25 },
};

const lerp = (a, b, k) => a + (b - a) * k;

// The wall point, outward normal and direction along a building's side.
// side is 's' | 'n' | 'w' | 'e', f is 0..1 along it (west to east, or south to north).
export function sideInfo(b, side, f = 0.5) {
  if (side === 's') return { P: [b.x + f * b.w, b.y], o: [0, -1], tg: [1, 0], len: b.w };
  if (side === 'n') return { P: [b.x + f * b.w, b.y + b.d], o: [0, 1], tg: [1, 0], len: b.w };
  if (side === 'w') return { P: [b.x, b.y + f * b.d], o: [-1, 0], tg: [0, 1], len: b.d };
  return { P: [b.x + b.w, b.y + f * b.d], o: [1, 0], tg: [0, 1], len: b.d };
}

const off = (P, v, k, tg, s = 0) => [P[0] + v[0] * k + tg[0] * s, P[1] + v[1] * k + tg[1] * s];

// Builds everything the run needs from a level definition (see levels.js).
export function buildLevel(def, index = 0) {
  const W = def.W;
  const L = def.L;
  const buildings = def.buildings.map(([x, y, w, d, h, tint], i) => ({ i, layer: i + 1, x, y, w, d, h, tint: tint ?? i }));
  const links = [];
  const add = (link) => {
    const info = LINK_KINDS[link.type];
    links.push({ reach: 0.9, time: info.time, gap: info.gap, kind: info.kind, hint: false, down: false, ...link, id: links.length });
  };

  // ladders, fire escape stairs, crate stacks and palms: up and down
  for (const c of def.climbs || []) {
    const b = buildings[c.b];
    const s = sideInfo(b, c.side, c.at ?? 0.5);
    const hw = 0.6;
    const base = { type: c.type || 'ladder', b: c.b, P: s.P, o: s.o, tg: s.tg, hw, H: b.h };
    add({
      ...base, from: STREET, to: b.layer, hA: 0, hB: b.h, hint: !!c.hint,
      a0: off(s.P, s.o, 0.45, s.tg, -hw), a1: off(s.P, s.o, 0.45, s.tg, hw),
      b0: off(s.P, s.o, -0.6, s.tg, -hw), b1: off(s.P, s.o, -0.6, s.tg, hw),
      n: [-s.o[0], -s.o[1]],
    });
    add({
      ...base, from: b.layer, to: STREET, hA: b.h, hB: 0, down: true,
      a0: off(s.P, s.o, -0.45, s.tg, -hw), a1: off(s.P, s.o, -0.45, s.tg, hw),
      b0: off(s.P, s.o, 0.75, s.tg, -hw), b1: off(s.P, s.o, 0.75, s.tg, hw),
      n: [s.o[0], s.o[1]],
    });
  }
  // trampolines under an awning: up only
  for (const c of def.bounces || []) {
    const b = buildings[c.b];
    const s = sideInfo(b, c.side, c.at ?? 0.5);
    const hw = 0.7;
    add({
      type: 'bounce', b: c.b, P: s.P, o: s.o, tg: s.tg, hw, H: b.h, from: STREET, to: b.layer, hA: 0, hB: b.h, hint: !!c.hint,
      a0: off(s.P, s.o, 0.9, s.tg, -hw), a1: off(s.P, s.o, 0.9, s.tg, hw),
      b0: off(s.P, s.o, -0.7, s.tg, -hw), b1: off(s.P, s.o, -0.7, s.tg, hw),
      n: [-s.o[0], -s.o[1]],
    });
  }
  // slides down to the street: down only
  for (const c of def.slides || []) {
    const b = buildings[c.b];
    const s = sideInfo(b, c.side, c.at ?? 0.5);
    const hw = 0.5;
    const len = c.len ?? 3;
    add({
      type: 'slide', b: c.b, P: s.P, o: s.o, tg: s.tg, hw, H: b.h, from: b.layer, to: STREET, hA: b.h, hB: 0, hint: !!c.hint,
      a0: off(s.P, s.o, -0.45, s.tg, -hw), a1: off(s.P, s.o, -0.45, s.tg, hw),
      b0: off(s.P, s.o, len, s.tg, -hw), b1: off(s.P, s.o, len, s.tg, hw),
      n: [s.o[0], s.o[1]], len,
    });
  }
  // zip lines from a roof edge to a pole on the street: down only
  for (const c of def.zips || []) {
    const b = buildings[c.b];
    const s = sideInfo(b, c.side, c.at ?? 0.5);
    const hw = 0.5;
    const a = off(s.P, s.o, -0.45, s.tg, 0);
    const dist = Math.hypot(c.to[0] - a[0], c.to[1] - a[1]);
    add({
      type: 'zip', b: c.b, P: s.P, o: s.o, tg: s.tg, hw, H: b.h, from: b.layer, to: STREET, hA: b.h, hB: 0, hint: !!c.hint,
      a0: off(s.P, s.o, -0.45, s.tg, -hw), a1: off(s.P, s.o, -0.45, s.tg, hw),
      b0: [c.to[0] - s.tg[0] * 0.01, c.to[1] - s.tg[1] * 0.01], b1: [c.to[0] + s.tg[0] * 0.01, c.to[1] + s.tg[1] * 0.01],
      n: [s.o[0], s.o[1]], time: Math.max(1.3, dist / 7.5), dist,
    });
  }
  // hops between roofs that touch or have a small gap, both ways
  const MAX_GAP = 2.2;
  const MAX_STEP = 2.6;
  for (let i = 0; i < buildings.length; i++) {
    for (let j = 0; j < buildings.length; j++) {
      if (i === j) continue;
      const A = buildings[i];
      const B = buildings[j];
      if (Math.abs(A.h - B.h) > MAX_STEP) continue;
      // B north of A
      const gN = B.y - (A.y + A.d);
      if (gN >= -0.01 && gN <= MAX_GAP) {
        const x0 = Math.max(A.x, B.x) + 0.4;
        const x1 = Math.min(A.x + A.w, B.x + B.w) - 0.4;
        if (x1 - x0 >= 0.8) {
          const ya = A.y + A.d - 0.45;
          const yb = B.y + 0.6;
          add({ type: 'hop', from: A.layer, to: B.layer, hA: A.h, hB: B.h, a0: [x0, ya], a1: [x1, ya], b0: [x0, yb], b1: [x1, yb], n: [0, 1], gapLen: gN });
        }
      }
      // B east of A
      const gE = B.x - (A.x + A.w);
      if (gE >= -0.01 && gE <= MAX_GAP) {
        const y0 = Math.max(A.y, B.y) + 0.4;
        const y1 = Math.min(A.y + A.d, B.y + B.d) - 0.4;
        if (y1 - y0 >= 0.8) {
          const xa = A.x + A.w - 0.45;
          const xb = B.x + 0.6;
          add({ type: 'hop', from: A.layer, to: B.layer, hA: A.h, hB: B.h, a0: [xa, y0], a1: [xa, y1], b0: [xb, y0], b1: [xb, y1], n: [1, 0], gapLen: gE });
        }
      }
      // and the other two directions, as mirror images
      const gS = A.y - (B.y + B.d);
      if (gS >= -0.01 && gS <= MAX_GAP) {
        const x0 = Math.max(A.x, B.x) + 0.4;
        const x1 = Math.min(A.x + A.w, B.x + B.w) - 0.4;
        if (x1 - x0 >= 0.8) {
          const ya = A.y + 0.45;
          const yb = B.y + B.d - 0.6;
          add({ type: 'hop', from: A.layer, to: B.layer, hA: A.h, hB: B.h, a0: [x0, ya], a1: [x1, ya], b0: [x0, yb], b1: [x1, yb], n: [0, -1], gapLen: gS });
        }
      }
      const gW = A.x - (B.x + B.w);
      if (gW >= -0.01 && gW <= MAX_GAP) {
        const y0 = Math.max(A.y, B.y) + 0.4;
        const y1 = Math.min(A.y + A.d, B.y + B.d) - 0.4;
        if (y1 - y0 >= 0.8) {
          const xa = A.x + 0.45;
          const xb = B.x + B.w - 0.6;
          add({ type: 'hop', from: A.layer, to: B.layer, hA: A.h, hB: B.h, a0: [xa, y0], a1: [xa, y1], b0: [xb, y0], b1: [xb, y1], n: [-1, 0], gapLen: gW });
        }
      }
    }
  }

  const level = {
    def, index, name: def.name, W, L, buildings, links,
    start: { x: def.start[0], y: def.start[1] },
    crowd: def.crowd,
    goal: { ...def.goal },
    friends: def.friends.map(([x, y, b]) => ({ x, y, layer: b == null ? STREET : b + 1 })),
    robbers: (def.robbers || []).map(([x, y, mode]) => ({ x, y, wait: mode === 'wait' })),
    hideouts: (def.hideouts || []).map(([x, y]) => ({ x, y })),
    robberSpeed: def.robberSpeed ?? 2.2,
    sight: def.sight ?? 9,
    theme: def.theme || {},
  };
  level.total = level.crowd + level.friends.length;

  // the street grid: a cell is blocked if its middle is too close to a wall or the edge
  const cols = Math.ceil(W / CELL);
  const rows = Math.ceil(L / CELL);
  const blocked = new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const cx = (i + 0.5) * CELL;
      const cy = (j + 0.5) * CELL;
      let b = cx < PAD || cx > W - PAD || cy < PAD || cy > L - PAD;
      for (let k = 0; !b && k < buildings.length; k++) b = insideRect(buildings[k], cx, cy, PAD);
      blocked[j * cols + i] = b ? 1 : 0;
    }
  }
  Object.assign(level, { cols, rows, blocked });
  level.hideoutField = level.hideouts.length ? bfsField(level, level.hideouts) : null;
  level.homeFields = level.robbers.map((r) => bfsField(level, [r]));
  return level;
}

export const heightOf = (level, layer) => (layer === STREET ? 0 : level.buildings[layer - 1].h);

export function insideRect(b, x, y, pad = 0) {
  return x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.d + pad;
}

// Which building's footprint (if any) a street point is in, or -1.
export function buildingAt(level, x, y, pad = 0) {
  for (const b of level.buildings) if (insideRect(b, x, y, pad)) return b.i;
  return -1;
}

export const cellIndex = (level, x, y) => {
  const i = Math.max(0, Math.min(level.cols - 1, Math.floor(x / CELL)));
  const j = Math.max(0, Math.min(level.rows - 1, Math.floor(y / CELL)));
  return j * level.cols + i;
};

export const cellCentre = (level, c) => ({ x: ((c % level.cols) + 0.5) * CELL, y: (Math.floor(c / level.cols) + 0.5) * CELL });

// Nearest open street cell to a point (searching outwards a little), or -1.
export function openCellNear(level, x, y) {
  const c = cellIndex(level, x, y);
  if (!level.blocked[c]) return c;
  let best = -1;
  let bestD = INF;
  const ci = c % level.cols;
  const cj = Math.floor(c / level.cols);
  for (let dj = -3; dj <= 3; dj++) {
    for (let di = -3; di <= 3; di++) {
      const i = ci + di;
      const j = cj + dj;
      if (i < 0 || j < 0 || i >= level.cols || j >= level.rows) continue;
      const k = j * level.cols + i;
      if (level.blocked[k]) continue;
      const m = cellCentre(level, k);
      const d = (m.x - x) ** 2 + (m.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
  }
  return best;
}

const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

// Steps (in cells) from every street cell to the nearest source point, through open cells.
// Diagonal steps never cut a corner. Unreachable cells are INF.
export function bfsField(level, sources, out) {
  const { cols, rows, blocked } = level;
  const field = out || new Int32Array(cols * rows);
  field.fill(INF);
  const queue = level._queue || (level._queue = new Int32Array(cols * rows));
  let head = 0;
  let tail = 0;
  for (const s of sources) {
    const c = openCellNear(level, s.x, s.y);
    if (c < 0 || field[c] === 0) continue;
    field[c] = 0;
    queue[tail++] = c;
  }
  while (head < tail) {
    const c = queue[head++];
    const ci = c % cols;
    const cj = (c - ci) / cols;
    const v = field[c] + 1;
    for (let k = 0; k < 8; k++) {
      const i = ci + N8[k][0];
      const j = cj + N8[k][1];
      if (i < 0 || j < 0 || i >= cols || j >= rows) continue;
      const n = j * cols + i;
      if (blocked[n] || field[n] <= v) continue;
      if (k >= 4 && (blocked[cj * cols + i] || blocked[j * cols + ci])) continue;
      field[n] = v;
      queue[tail++] = n;
    }
  }
  return field;
}

export const FIELD_INF = INF;

// The field's value where (x, y) is: its own cell, or the best open neighbour if that cell is
// blocked (a body pressed against a wall can sit in a blocked cell).
export function fieldAt(level, field, x, y) {
  const c = cellIndex(level, x, y);
  if (!level.blocked[c]) return field[c];
  const n = openCellNear(level, x, y);
  return n < 0 ? INF : field[n];
}

// Where to walk next to go downhill on a field: the middle of the best neighbouring cell,
// or null if already at the bottom (or cut off).
export function descend(level, field, x, y) {
  const { cols, rows, blocked } = level;
  let c = cellIndex(level, x, y);
  if (blocked[c]) {
    c = openCellNear(level, x, y);
    if (c < 0) return null;
    if (field[c] < INF) return cellCentre(level, c);
  }
  const ci = c % cols;
  const cj = (c - ci) / cols;
  let best = field[c];
  let pick = -1;
  for (let k = 0; k < 8; k++) {
    const i = ci + N8[k][0];
    const j = cj + N8[k][1];
    if (i < 0 || j < 0 || i >= cols || j >= rows) continue;
    const n = j * cols + i;
    if (blocked[n]) continue;
    if (k >= 4 && (blocked[cj * cols + i] || blocked[j * cols + ci])) continue;
    if (field[n] < best) {
      best = field[n];
      pick = n;
    }
  }
  return pick < 0 ? null : cellCentre(level, pick);
}

// True if a straight walk from (x0, y0) to (x1, y1) on the street misses every building
// (each grown by `pad`).
export function losClear(level, x0, y0, x1, y1, pad = 0.22) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  for (const b of level.buildings) {
    let t0 = 0;
    let t1 = 1;
    const lo = [b.x - pad, b.y - pad];
    const hi = [b.x + b.w + pad, b.y + b.d + pad];
    const p = [x0, y0];
    const v = [dx, dy];
    let hit = true;
    for (let a = 0; a < 2; a++) {
      if (Math.abs(v[a]) < 1e-9) {
        if (p[a] <= lo[a] || p[a] >= hi[a]) {
          hit = false;
          break;
        }
      } else {
        let ta = (lo[a] - p[a]) / v[a];
        let tb = (hi[a] - p[a]) / v[a];
        if (ta > tb) [ta, tb] = [tb, ta];
        t0 = Math.max(t0, ta);
        t1 = Math.min(t1, tb);
        if (t0 >= t1) {
          hit = false;
          break;
        }
      }
    }
    if (hit) return false;
  }
  return true;
}

// Keeps a body on the street: inside the map and out of every building.
export function collideStreet(level, p) {
  for (let pass = 0; pass < 2; pass++) {
    for (const b of level.buildings) {
      if (!insideRect(b, p.x, p.y, PAD)) continue;
      const l = p.x - (b.x - PAD);
      const r = b.x + b.w + PAD - p.x;
      const s = p.y - (b.y - PAD);
      const n = b.y + b.d + PAD - p.y;
      const m = Math.min(l, r, s, n);
      if (m === l) p.x = b.x - PAD;
      else if (m === r) p.x = b.x + b.w + PAD;
      else if (m === s) p.y = b.y - PAD;
      else p.y = b.y + b.d + PAD;
    }
    p.x = Math.max(PAD, Math.min(level.W - PAD, p.x));
    p.y = Math.max(PAD, Math.min(level.L - PAD, p.y));
  }
}

export function clampRoof(b, p) {
  p.x = Math.max(b.x + PAD, Math.min(b.x + b.w - PAD, p.x));
  p.y = Math.max(b.y + PAD, Math.min(b.y + b.d - PAD, p.y));
}

// Keeps a body where it may stand on its layer.
export function confine(level, p) {
  if (p.layer === STREET) collideStreet(level, p);
  else clampRoof(level.buildings[p.layer - 1], p);
}

// Distance from a point to the segment a-b, and how far along it (0..1) the nearest point is.
export function segDist(x, y, a, b) {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const len2 = vx * vx + vy * vy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - a[0]) * vx + (y - a[1]) * vy) / len2)) : 0;
  const px = a[0] + vx * t;
  const py = a[1] + vy * t;
  return { d: Math.hypot(x - px, y - py), t };
}

export const linkStart = (link, t) => [lerp(link.a0[0], link.a1[0], t), lerp(link.a0[1], link.a1[1], t)];
export const linkEnd = (link, t) => [lerp(link.b0[0], link.b1[0], t), lerp(link.b0[1], link.b1[1], t)];

// Where someone is, `p` (0..1) of the way through a link taken at `t`: { x, y, h }, with h
// the height of their feet. The view draws ladders, slides and lines along the same paths.
export function linkPos(link, t, p) {
  const a = linkStart(link, t);
  const b = linkEnd(link, t);
  const out = { x: 0, y: 0, h: 0 };
  if (link.kind === 'climb') {
    // q runs from the street (0) to the roof (1)
    const q = link.down ? 1 - p : p;
    const street = link.down ? b : a;
    const roof = link.down ? a : b;
    const s = (t - 0.5) * 2 * link.hw;
    const wall = [link.P[0] + link.tg[0] * s, link.P[1] + link.tg[1] * s];
    const info = LINK_KINDS[link.type];
    const H = link.H;
    const o = link.o;
    if (link.type === 'crates') {
      // up a staircase of crates that sticks out from the wall
      const reachOut = 1.7;
      if (q < 0.1) {
        const k = q / 0.1;
        out.x = lerp(street[0], wall[0] + o[0] * reachOut, k);
        out.y = lerp(street[1], wall[1] + o[1] * reachOut, k);
        out.h = 0;
      } else if (q < 0.88) {
        const k = (q - 0.1) / 0.78;
        const steps = 3;
        const st = Math.min(steps, Math.floor(k * steps + 0.5));
        const out1 = reachOut * (1 - k) + info.off;
        out.x = wall[0] + o[0] * out1;
        out.y = wall[1] + o[1] * out1;
        out.h = lerp((H * st) / steps, H * k, 0.5) + Math.sin(k * steps * Math.PI) ** 2 * 0.25;
      } else {
        const k = (q - 0.88) / 0.12;
        out.x = lerp(wall[0] + o[0] * info.off, roof[0], k);
        out.y = lerp(wall[1] + o[1] * info.off, roof[1], k);
        out.h = H + Math.sin(k * Math.PI) * 0.3;
      }
      return out;
    }
    const w = [wall[0] + o[0] * info.off, wall[1] + o[1] * info.off];
    if (q < 0.12) {
      const k = q / 0.12;
      out.x = lerp(street[0], w[0], k);
      out.y = lerp(street[1], w[1], k);
      out.h = 0;
    } else if (q < 0.86) {
      const k = (q - 0.12) / 0.74;
      out.x = w[0];
      out.y = w[1];
      out.h = H * k;
      if (link.type === 'stairs') {
        // back and forth up the flights of a fire escape
        const flights = 3;
        const f = k * flights;
        const tri = Math.floor(f) % 2 ? 1 - (f % 1) : f % 1;
        const side = (tri - 0.5) * 1.3;
        out.x += link.tg[0] * side;
        out.y += link.tg[1] * side;
      }
    } else {
      const k = (q - 0.86) / 0.14;
      out.x = lerp(w[0], roof[0], k);
      out.y = lerp(w[1], roof[1], k);
      out.h = H + Math.sin(k * Math.PI) * 0.3;
    }
    return out;
  }
  if (link.kind === 'hop') {
    out.x = lerp(a[0], b[0], p);
    out.y = lerp(a[1], b[1], p);
    out.h = lerp(link.hA, link.hB, p) + (0.8 + 0.2 * link.gapLen) * 4 * p * (1 - p);
    return out;
  }
  if (link.kind === 'bounce') {
    if (p < 0.18) {
      out.x = a[0];
      out.y = a[1];
      out.h = -0.12 * Math.sin((p / 0.18) * Math.PI);
      return out;
    }
    const k = (p - 0.18) / 0.82;
    out.x = lerp(a[0], b[0], k);
    out.y = lerp(a[1], b[1], k);
    out.h = link.hB * k + 2 * 4 * k * (1 - k);
    return out;
  }
  if (link.kind === 'slide') {
    out.x = lerp(a[0], b[0], p);
    out.y = lerp(a[1], b[1], p);
    out.h = link.hA * (Math.cos(Math.min(1, p * 1.08) * Math.PI) + 1) / 2;
    return out;
  }
  // zip line: hanging from the line, then a little drop at the far pole
  const line = zipLineHeight(link, p);
  out.x = lerp(a[0], b[0], p);
  out.y = lerp(a[1], b[1], p);
  const feet = line - 1.45;
  if (p > 0.9) {
    const k = (p - 0.9) / 0.1;
    out.h = lerp(zipLineHeight(link, 0.9) - 1.45, 0, k * k);
  } else out.h = feet;
  return out;
}

export const ZIP_TOP = 1.75; // pole height above the roof
export const ZIP_END = 2.2; // pole height at the street end
export function zipLineHeight(link, p) {
  return lerp(link.hA + ZIP_TOP, ZIP_END, p) - 0.35 * 4 * p * (1 - p);
}
