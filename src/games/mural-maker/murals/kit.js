// Line-art kit for the murals and stamps. Pure data, no DOM: a shape is a list of path
// commands in wall units (the wall is 600 x 800), so every picture can be hit-tested and
// checked in tests, and drawn crisp at any size.
//
//   shape = { d: [['M', x, y], ['L', x, y], ['C', x1, y1, x2, y2, x, y], ...], open }
//
// Closed shapes (open: false) are fillable; open ones are only ever stroked (details).
// A mural is an ordered list of items: R(...) regions Riley can fill and D(...) details
// (eyes, smiles, feather lines) that are part of the line art. Later items sit on top.

const K = 0.5523; // cubic handle length for a quarter circle

export const shape = (d, open = false) => ({ d, open });

// Flattens nested arrays of shapes into one list.
export const all = (...s) => s.flat(Infinity).filter(Boolean);

// ---------------------------------------------------------------------------------------------
// SVG-style path strings: M L H V C S Q T Z, absolute (upper case) or relative (lower case)
// ---------------------------------------------------------------------------------------------

export function svg(str) {
  const toks = str.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || [];
  const shapes = [];
  let d = null;
  let i = 0;
  let cmd = 'M';
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let cubic = null; // last cubic control, for S
  let quad = null; // last quadratic control, for T
  const num = () => Number(toks[i++]);
  const start = () => {
    if (!d) d = [['M', x, y]];
  };
  const quadTo = (qx, qy, ex, ey) => {
    start();
    d.push(['C', x + ((qx - x) * 2) / 3, y + ((qy - y) * 2) / 3, ex + ((qx - ex) * 2) / 3, ey + ((qy - ey) * 2) / 3, ex, ey]);
    quad = [qx, qy];
    cubic = null;
    x = ex;
    y = ey;
  };
  while (i < toks.length) {
    if (/[A-Za-z]/.test(toks[i])) cmd = toks[i++];
    const C = cmd.toUpperCase();
    const rel = cmd !== C;
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    if (C === 'Z') {
      if (d && d.length > 1) shapes.push(shape(d));
      d = null;
      x = sx;
      y = sy;
      cubic = quad = null;
      continue;
    }
    if (i >= toks.length || /[A-Za-z]/.test(toks[i])) break; // a command with no numbers
    if (C === 'M') {
      if (d && d.length > 1) shapes.push(shape(d, true));
      x = ox + num();
      y = oy + num();
      d = [['M', x, y]];
      sx = x;
      sy = y;
      cmd = rel ? 'l' : 'L';
      cubic = quad = null;
    } else if (C === 'L') {
      start();
      x = ox + num();
      y = oy + num();
      d.push(['L', x, y]);
      cubic = quad = null;
    } else if (C === 'H') {
      start();
      x = ox + num();
      d.push(['L', x, y]);
      cubic = quad = null;
    } else if (C === 'V') {
      start();
      y = oy + num();
      d.push(['L', x, y]);
      cubic = quad = null;
    } else if (C === 'C' || C === 'S') {
      start();
      let c1x;
      let c1y;
      if (C === 'C') {
        c1x = ox + num();
        c1y = oy + num();
      } else {
        c1x = cubic ? 2 * x - cubic[0] : x;
        c1y = cubic ? 2 * y - cubic[1] : y;
      }
      const c2x = ox + num();
      const c2y = oy + num();
      const ex = ox + num();
      const ey = oy + num();
      d.push(['C', c1x, c1y, c2x, c2y, ex, ey]);
      cubic = [c2x, c2y];
      quad = null;
      x = ex;
      y = ey;
    } else if (C === 'Q') {
      const qx = ox + num();
      const qy = oy + num();
      quadTo(qx, qy, ox + num(), oy + num());
    } else if (C === 'T') {
      const qx = quad ? 2 * x - quad[0] : x;
      const qy = quad ? 2 * y - quad[1] : y;
      quadTo(qx, qy, ox + num(), oy + num());
    } else {
      i++; // unknown command: skip a number so we never loop forever
    }
  }
  if (d && d.length > 1) shapes.push(shape(d, true));
  return shapes;
}

// ---------------------------------------------------------------------------------------------
// Basic shapes (all closed)
// ---------------------------------------------------------------------------------------------

export function ellipse(cx, cy, rx, ry, rotDeg = 0) {
  const a = (rotDeg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const P = (u, v) => [cx + u * c - v * s, cy + u * s + v * c];
  const kx = rx * K;
  const ky = ry * K;
  const d = [['M', ...P(rx, 0)]];
  d.push(['C', ...P(rx, ky), ...P(kx, ry), ...P(0, ry)]);
  d.push(['C', ...P(-kx, ry), ...P(-rx, ky), ...P(-rx, 0)]);
  d.push(['C', ...P(-rx, -ky), ...P(-kx, -ry), ...P(0, -ry)]);
  d.push(['C', ...P(kx, -ry), ...P(rx, -ky), ...P(rx, 0)]);
  return shape(d);
}

export const circle = (cx, cy, r) => ellipse(cx, cy, r, r);

export function rect(x, y, w, h, r = 0) {
  if (r <= 0) return poly([x, y, x + w, y, x + w, y + h, x, y + h]);
  return rpoly([x, y, x + w, y, x + w, y + h, x, y + h], r);
}

// A straight-edged polygon through flat [x, y, x, y, ...] points.
export function poly(pts) {
  const d = [['M', pts[0], pts[1]]];
  for (let k = 2; k < pts.length; k += 2) d.push(['L', pts[k], pts[k + 1]]);
  return shape(d);
}

// A polygon with every corner rounded off (radius r, or per-corner radii).
export function rpoly(pts, r) {
  const n = pts.length / 2;
  const P = (k) => [pts[((k + n) % n) * 2], pts[((k + n) % n) * 2 + 1]];
  const rad = (k) => (Array.isArray(r) ? r[k % r.length] : r);
  const corners = [];
  for (let k = 0; k < n; k++) {
    const [ax, ay] = P(k - 1);
    const [px, py] = P(k);
    const [bx, by] = P(k + 1);
    const la = Math.hypot(ax - px, ay - py);
    const lb = Math.hypot(bx - px, by - py);
    const rr = Math.min(rad(k), la / 2, lb / 2);
    corners.push({
      in: [px + ((ax - px) / la) * rr, py + ((ay - py) / la) * rr],
      at: [px, py],
      out: [px + ((bx - px) / lb) * rr, py + ((by - py) / lb) * rr],
    });
  }
  const d = [['M', ...corners[0].out]];
  for (let k = 1; k <= n; k++) {
    const c = corners[k % n];
    d.push(['L', ...c.in]);
    const [ix, iy] = c.in;
    const [qx, qy] = c.at;
    const [ex, ey] = c.out;
    d.push(['C', ix + ((qx - ix) * 2) / 3, iy + ((qy - iy) * 2) / 3, ex + ((qx - ex) * 2) / 3, ey + ((qy - ey) * 2) / 3, ex, ey]);
  }
  return shape(d);
}

// A smooth closed curve through flat points (Catmull-Rom as cubics). tension 1 is the
// classic curve; less is tighter.
export function blob(pts, tension = 1) {
  const n = pts.length / 2;
  const P = (k) => [pts[((k + n) % n) * 2], pts[((k + n) % n) * 2 + 1]];
  const t = tension / 6;
  const d = [['M', ...P(0)]];
  for (let k = 0; k < n; k++) {
    const [x0, y0] = P(k - 1);
    const [x1, y1] = P(k);
    const [x2, y2] = P(k + 1);
    const [x3, y3] = P(k + 2);
    d.push(['C', x1 + (x2 - x0) * t, y1 + (y2 - y0) * t, x2 - (x3 - x1) * t, y2 - (y3 - y1) * t, x2, y2]);
  }
  return shape(d);
}

// A smooth open curve through flat points (for details).
export function spline(pts, tension = 1) {
  const n = pts.length / 2;
  const P = (k) => [pts[Math.max(0, Math.min(n - 1, k)) * 2], pts[Math.max(0, Math.min(n - 1, k)) * 2 + 1]];
  const t = tension / 6;
  const d = [['M', ...P(0)]];
  for (let k = 0; k < n - 1; k++) {
    const [x0, y0] = P(k - 1);
    const [x1, y1] = P(k);
    const [x2, y2] = P(k + 1);
    const [x3, y3] = P(k + 2);
    d.push(['C', x1 + (x2 - x0) * t, y1 + (y2 - y0) * t, x2 - (x3 - x1) * t, y2 - (y3 - y1) * t, x2, y2]);
  }
  return shape(d, true);
}

// An open polyline (for details).
export function line(pts) {
  const s = poly(pts);
  s.open = true;
  return s;
}

// Points along an open Catmull-Rom spline, `per` samples per span.
export function splinePoints(pts, per) {
  const n = pts.length / 2;
  const P = (k) => [pts[Math.max(0, Math.min(n - 1, k)) * 2], pts[Math.max(0, Math.min(n - 1, k)) * 2 + 1]];
  const out = [P(0)];
  for (let k = 0; k < n - 1; k++) {
    const [x0, y0] = P(k - 1);
    const [x1, y1] = P(k);
    const [x2, y2] = P(k + 1);
    const [x3, y3] = P(k + 2);
    for (let j = 1; j <= per; j++) {
      const u = j / per;
      const u2 = u * u;
      const u3 = u2 * u;
      const f = (a, b, c, e) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - e) * u2 + (-a + 3 * b - 3 * c + e) * u3);
      out.push([f(x0, x1, x2, x3), f(y0, y1, y2, y3)]);
    }
  }
  return out;
}

// A thick smooth stroke as a closed shape: a centreline through flat points, width w0 at
// the start easing to w1 at the end (or w(t) for t in 0..1). Ends can be round.
export function band(pts, w0, w1 = w0, { round = false, roundStart = round, roundEnd = round, per = 10 } = {}) {
  const line = splinePoints(pts, per);
  const lens = [0];
  for (let k = 1; k < line.length; k++) lens.push(lens[k - 1] + Math.hypot(line[k][0] - line[k - 1][0], line[k][1] - line[k - 1][1]));
  const L = lens[lens.length - 1] || 1;
  const width = typeof w0 === 'function' ? w0 : (t) => w0 + (w1 - w0) * t;
  const left = [];
  const right = [];
  const norms = [];
  for (let k = 0; k < line.length; k++) {
    const a = line[Math.max(0, k - 1)];
    const b = line[Math.min(line.length - 1, k + 1)];
    let tx = b[0] - a[0];
    let ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const nx = -ty;
    const ny = tx;
    const h = width(lens[k] / L) / 2;
    norms.push([nx, ny, tx, ty, h]);
    left.push([line[k][0] + nx * h, line[k][1] + ny * h]);
    right.push([line[k][0] - nx * h, line[k][1] - ny * h]);
  }
  const cap = (k, dir) => {
    // half circle from the right side round to the left side (end) or left to right (start)
    const [nx, ny, tx, ty, h] = norms[k];
    const [cx, cy] = line[k];
    const out = [];
    for (let j = 1; j < 8; j++) {
      const a = (j / 8) * Math.PI;
      const c = Math.cos(a);
      const s = Math.sin(a);
      // end: from left (+n) through +t to right (-n); start: from right (-n) through -t to left
      if (dir > 0) out.push([cx + (nx * c + tx * s) * h, cy + (ny * c + ty * s) * h]);
      else out.push([cx + (-nx * c - tx * s) * h, cy + (-ny * c - ty * s) * h]);
    }
    return out;
  };
  const ring = [...left];
  if (roundEnd) ring.push(...cap(line.length - 1, 1));
  ring.push(...right.reverse());
  if (roundStart) ring.push(...cap(0, -1));
  const d = [['M', ...ring[0]]];
  for (let k = 1; k < ring.length; k++) d.push(['L', ...ring[k]]);
  return shape(d);
}

// A ring-shaped arc band (centre, radii, angles in degrees, 0 = east, clockwise on screen).
export function arcBand(cx, cy, rOuter, rInner, a0, a1, steps = 32) {
  const pts = [];
  for (let k = 0; k <= steps; k++) {
    const a = ((a0 + ((a1 - a0) * k) / steps) * Math.PI) / 180;
    pts.push(cx + Math.cos(a) * rOuter, cy + Math.sin(a) * rOuter);
  }
  for (let k = steps; k >= 0; k--) {
    const a = ((a0 + ((a1 - a0) * k) / steps) * Math.PI) / 180;
    pts.push(cx + Math.cos(a) * rInner, cy + Math.sin(a) * rInner);
  }
  return poly(pts);
}

// An n-pointed star.
export function star(cx, cy, rOut, rIn, n = 5, rotDeg = -90) {
  const pts = [];
  for (let k = 0; k < n * 2; k++) {
    const a = ((rotDeg + (k * 180) / n) * Math.PI) / 180;
    const r = k % 2 ? rIn : rOut;
    pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return poly(pts);
}

// A heart, centre (cx, cy), about `s` wide.
export function heart(cx, cy, s) {
  const k = s / 100;
  return tf(svg('M0 32 C-18 18 -50 0 -50 -22 C-50 -44 -22 -52 0 -30 C22 -52 50 -44 50 -22 C50 0 18 18 0 32 Z')[0], { s: k, x: cx, y: cy });
}

// A puffy cloud: overlapping bumps along the bottom line, as one smooth outline.
export function cloud(cx, cy, w, h) {
  const pts = [];
  const bumps = [
    [-0.5, 0.15], [-0.42, -0.2], [-0.22, -0.42], [0.02, -0.5], [0.24, -0.38], [0.42, -0.18], [0.5, 0.15], [0.3, 0.32], [-0.3, 0.32],
  ];
  for (const [u, v] of bumps) pts.push(cx + u * w, cy + v * h);
  return blob(pts, 1.1);
}

// ---------------------------------------------------------------------------------------------
// Transforms
// ---------------------------------------------------------------------------------------------

// Moves shapes: scale (s or sx / sy) and rotate (r degrees) about (ox, oy), then shift by
// (x, y). Works on one shape or a list.
export function tf(s, { x = 0, y = 0, r = 0, s: k = 1, sx = k, sy = k, ox = 0, oy = 0 } = {}) {
  if (Array.isArray(s)) return s.map((one) => tf(one, { x, y, r, sx, sy, ox, oy }));
  const a = (r * Math.PI) / 180;
  const c = Math.cos(a);
  const sn = Math.sin(a);
  const map = (px, py) => {
    const u = (px - ox) * sx;
    const v = (py - oy) * sy;
    return [ox + u * c - v * sn + x, oy + u * sn + v * c + y];
  };
  return { open: s.open, d: s.d.map(([op, ...v]) => {
    const out = [op];
    for (let k2 = 0; k2 < v.length; k2 += 2) out.push(...map(v[k2], v[k2 + 1]));
    return out;
  }) };
}

// Mirror image across the vertical line x = cx.
export const flipX = (s, cx) => tf(s, { sx: -1, sy: 1, ox: cx });

// The same shape traced the other way round.
export function reverse(s) {
  const segs = [];
  let px = s.d[0][1];
  let py = s.d[0][2];
  const sx = px;
  const sy = py;
  for (const c of s.d.slice(1)) {
    const [op, ...v] = c;
    const ex = v[v.length - 2];
    const ey = v[v.length - 1];
    segs.push({ op, from: [px, py], v });
    px = ex;
    py = ey;
  }
  if (!s.open && (Math.abs(px - sx) > 1e-9 || Math.abs(py - sy) > 1e-9)) {
    segs.push({ op: 'L', from: [px, py], v: [sx, sy] });
    px = sx;
    py = sy;
  }
  const d = [['M', px, py]];
  for (let k = segs.length - 1; k >= 0; k--) {
    const g = segs[k];
    if (g.op === 'C') d.push(['C', g.v[2], g.v[3], g.v[0], g.v[1], ...g.from]);
    else d.push(['L', ...g.from]);
  }
  return { open: s.open, d };
}

// ---------------------------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------------------------

// A shape as a flat polygon [x, y, x, y, ...], each cubic cut into `n` lines.
export function flatten(s, n = 12) {
  const out = [];
  let x = 0;
  let y = 0;
  for (const c of s.d) {
    if (c[0] === 'M' || c[0] === 'L') {
      x = c[1];
      y = c[2];
      out.push(x, y);
    } else {
      const [, x1, y1, x2, y2, x3, y3] = c;
      for (let k = 1; k <= n; k++) {
        const t = k / n;
        const u = 1 - t;
        const a = u * u * u;
        const b = 3 * u * u * t;
        const d = 3 * u * t * t;
        const e = t * t * t;
        out.push(a * x + b * x1 + d * x2 + e * x3, a * y + b * y1 + d * y2 + e * y3);
      }
      x = x3;
      y = y3;
    }
  }
  return out;
}

// Signed area of a flat polygon (positive = clockwise on screen, y down).
export function polyArea(p) {
  let a = 0;
  for (let k = 0, n = p.length; k < n; k += 2) {
    const j = (k + 2) % n;
    a += p[k] * p[j + 1] - p[j] * p[k + 1];
  }
  return a / 2;
}

// Winding number of polygon p around (x, y).
export function winding(p, x, y) {
  let w = 0;
  const n = p.length;
  for (let k = 0; k < n; k += 2) {
    const x0 = p[k];
    const y0 = p[k + 1];
    const x1 = p[(k + 2) % n];
    const y1 = p[(k + 3) % n];
    if (y0 <= y) {
      if (y1 > y && (x1 - x0) * (y - y0) - (x - x0) * (y1 - y0) > 0) w++;
    } else if (y1 <= y && (x1 - x0) * (y - y0) - (x - x0) * (y1 - y0) < 0) w--;
  }
  return w;
}

export function bbox(polys) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of polys) {
    for (let k = 0; k < p.length; k += 2) {
      if (p[k] < x0) x0 = p[k];
      if (p[k] > x1) x1 = p[k];
      if (p[k + 1] < y0) y0 = p[k + 1];
      if (p[k + 1] > y1) y1 = p[k + 1];
    }
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// ---------------------------------------------------------------------------------------------
// Mural items
// ---------------------------------------------------------------------------------------------

// A region Riley can fill. opts: { part } (moves in the celebration), { evenodd } (inner
// shapes are holes, as in the R's bowl), { fixed: colour } (stamps: always this colour).
export const R = (shapes, opts = {}) => ({ type: 'region', shapes: all(shapes), ...opts });

// Line-art detail. opts: { w } line width (default 5, 0 for none), { fill } a colour
// ('ink' for the line colour), { part }.
export const D = (shapes, opts = {}) => ({ type: 'detail', shapes: all(shapes), w: 5, ...opts });

// Eye: white, pupil, glint. Looking a little toward (lx, ly).
export function eye(x, y, r, { lx = 0, ly = 0, part, lid = false } = {}) {
  const out = [
    D(circle(x, y, r), { fill: '#ffffff', w: 4, part }),
    D(circle(x + lx * r * 0.3, y + ly * r * 0.3, r * 0.55), { fill: 'ink', w: 0, part }),
    D(circle(x + lx * r * 0.3 - r * 0.18, y + ly * r * 0.3 - r * 0.2, r * 0.18), { fill: '#ffffff', w: 0, part }),
  ];
  if (lid) out.push(D(spline([x - r * 1.1, y - r * 0.9, x, y - r * 1.25, x + r * 1.1, y - r * 0.9]), { w: 4, part }));
  return out;
}

// ---------------------------------------------------------------------------------------------
// Scenery helpers
// ---------------------------------------------------------------------------------------------

export const WALL = { w: 600, h: 800 };

// Ground or sea: a wavy top edge at height y (n gentle waves of height amp) down to the
// bottom of the wall.
export function hills(y, amp, n, { bottom = WALL.h, flip = false, x0 = 0, x1 = WALL.w } = {}) {
  let s = `M${x0} ${y}`;
  const seg = (x1 - x0) / n;
  for (let k = 0; k < n; k++) s += ` Q${x0 + seg * (k + 0.5)} ${y + amp * 2 * ((k % 2 === 0) !== flip ? -1 : 1)} ${x0 + seg * (k + 1)} ${y}`;
  return svg(`${s} L${x1} ${bottom} L${x0} ${bottom} Z`)[0];
}

// The part of shape s inside the convex shape c (as a dense polygon). Pieces cut this
// way share their edges exactly with the shape they came from.
export function clip(s, c, n = 16) {
  const toPts = (f) => {
    const out = [];
    for (let k = 0; k < f.length; k += 2) out.push([f[k], f[k + 1]]);
    return out;
  };
  let pts = toPts(flatten(s, n));
  const cf = flatten(c, 16);
  const cp = toPts(cf);
  const sign = polyArea(cf) > 0 ? 1 : -1;
  for (let k = 0; k < cp.length && pts.length; k++) {
    const a = cp[k];
    const b = cp[(k + 1) % cp.length];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    if (!ex && !ey) continue;
    const side = (p) => (ex * (p[1] - a[1]) - ey * (p[0] - a[0])) * sign;
    const cut = (p, q) => {
      const sp = side(p);
      const sq = side(q);
      const t = sp / (sp - sq);
      return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    };
    const input = pts;
    pts = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i];
      const prev = input[(i + input.length - 1) % input.length];
      const ci = side(cur) >= 0;
      const pi = side(prev) >= 0;
      if (ci) {
        if (!pi) pts.push(cut(prev, cur));
        pts.push(cur);
      } else if (pi) pts.push(cut(prev, cur));
    }
  }
  // drop points that repeat
  const clean = pts.filter((p, i) => {
    const q = pts[(i + pts.length - 1) % pts.length];
    return Math.abs(p[0] - q[0]) > 1e-6 || Math.abs(p[1] - q[1]) > 1e-6;
  });
  return poly(clean.flat());
}

// Keeps a shape inside the wall.
export const inWall = (s) => clip(s, rect(0, 0, WALL.w, WALL.h));

// A palm frond: from (x, y) out at angle `ang` (degrees, 0 = east, 90 = down), `len` long,
// `wid` at its widest, drooping by `droop` x len at the tip. Pointed at both ends.
export function frondLine(x, y, ang, len, droop = 0.3) {
  const a = (ang * Math.PI) / 180;
  const pts = [];
  for (let k = 0; k <= 4; k++) {
    const t = k / 4;
    pts.push(x + Math.cos(a) * len * t, y + Math.sin(a) * len * t + droop * len * t * t);
  }
  return pts;
}
export function frond(x, y, ang, len, wid, droop = 0.3) {
  return band(frondLine(x, y, ang, len, droop), (t) => 2 + wid * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.75));
}

// Short curved marks across a band (palm trunk rings, tail stripes): `count` marks along
// the same centreline band() would use, each `w` wide.
export function bandMarks(pts, count, w0, w1 = w0, { from = 0.08, to = 0.92, bow = 0.25 } = {}) {
  const line = splinePoints(pts, 10);
  const lens = [0];
  for (let k = 1; k < line.length; k++) lens.push(lens[k - 1] + Math.hypot(line[k][0] - line[k - 1][0], line[k][1] - line[k - 1][1]));
  const L = lens[lens.length - 1];
  const out = [];
  for (let m = 0; m < count; m++) {
    const t = from + ((to - from) * (m + 0.5)) / count;
    let k = lens.findIndex((v) => v >= t * L);
    if (k < 1) k = 1;
    const [x0, y0] = line[k - 1];
    const [x1, y1] = line[k];
    const tl = Math.hypot(x1 - x0, y1 - y0) || 1;
    const tx = (x1 - x0) / tl;
    const ty = (y1 - y0) / tl;
    const h = (w0 + (w1 - w0) * t) / 2;
    out.push(spline([x1 - ty * h, y1 + tx * h, x1 + tx * h * bow, y1 + ty * h * bow, x1 + ty * h, y1 - tx * h]));
  }
  return out;
}

// Points along the centreline band() would use, at fractions ts of its length.
export function alongBand(pts, ts) {
  const line = splinePoints(pts, 10);
  const lens = [0];
  for (let k = 1; k < line.length; k++) lens.push(lens[k - 1] + Math.hypot(line[k][0] - line[k - 1][0], line[k][1] - line[k - 1][1]));
  const L = lens[lens.length - 1];
  return ts.map((t) => {
    const k = Math.max(0, lens.findIndex((v) => v >= t * L));
    return line[k];
  });
}

// A cog with n teeth.
export function gear(cx, cy, rOut, rIn, n = 10) {
  const pts = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const da = (Math.PI * 2) / n;
    for (const [f, r] of [[0, rIn], [0.18, rOut], [0.5, rOut], [0.68, rIn]]) {
      pts.push(cx + Math.cos(a + da * f) * r, cy + Math.sin(a + da * f) * r);
    }
  }
  return rpoly(pts, 3);
}

// A crescent: the circle (cx, cy, r) with the circle (cx + dx, cy + dy, r2) bitten out.
export function crescent(cx, cy, r, dx, dy, r2, n = 96) {
  const ring = (x, y, rr, keep) => {
    const pts = [];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const p = [x + Math.cos(a) * rr, y + Math.sin(a) * rr];
      pts.push({ p, in: keep(p) });
    }
    // the run of kept points, starting just after a dropped one
    const s = pts.findIndex((q, k) => q.in && !pts[(k + n - 1) % n].in);
    const out = [];
    for (let k = 0; k < n && s >= 0; k++) {
      const q = pts[(s + k) % n];
      if (!q.in) break;
      out.push(q.p);
    }
    return out;
  };
  const outer = ring(cx, cy, r, ([x, y]) => Math.hypot(x - cx - dx, y - cy - dy) > r2);
  const inner = ring(cx + dx, cy + dy, r2, ([x, y]) => Math.hypot(x - cx, y - cy) < r).reverse();
  return blob([...outer, ...inner].flat(), 0);
}
