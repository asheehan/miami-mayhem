// Mural Maker drawing. Reads walls and murals and never changes them. A wall on screen is
// three layers, each an offscreen canvas at device resolution: fills (redrawn only when a
// region changes), paint (strokes and stamps, drawn into incrementally as the finger moves)
// and lines (the line art, drawn once per size). Composited every frame: fills, paint,
// lines, so outlines always sit on top.
import {
  WALL_W, WALL_H, COLOURS, RAINBOW, BRUSHES, paintInfo, makeRng, dripsFor, regionAt, compileMural,
} from './mural.js';
import { STAMPS } from './stamps.js';

export const C = {
  night: '#2b1055',
  dusk: '#7a1fa2',
  pink: '#ff3d9a',
  orange: '#ff8a4c',
  sun: '#ffe14d',
  sea: '#0bb5c4',
  foam: '#9ff7f2',
  ink: '#221640',
  white: '#ffffff',
  gold: '#ffc93a',
  primer: '#fffdf6',
  free: '#f4ece0',
};

export const LINE_W = 7; // outline width, wall units
const TAU = Math.PI * 2;

export const font = (px, weight = 900) => `${weight} ${Math.round(px)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;

export function roundRect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function outlined(ctx, text, x, y, px, fill, maxW) {
  ctx.font = font(px);
  if (maxW) {
    const tw = ctx.measureText(text).width;
    if (tw > maxW) {
      px = (px * maxW) / tw;
      ctx.font = font(px);
    }
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = px * 0.22;
  ctx.strokeStyle = C.ink;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

// ---------------------------------------------------------------------------------------------
// Paths and paints
// ---------------------------------------------------------------------------------------------

export function tracePath(g, shapes) {
  for (const s of shapes) {
    for (const c of s.d) {
      if (c[0] === 'M') g.moveTo(c[1], c[2]);
      else if (c[0] === 'L') g.lineTo(c[1], c[2]);
      else g.bezierCurveTo(c[1], c[2], c[3], c[4], c[5], c[6]);
    }
    if (!s.open) g.closePath();
  }
}

// Applies a celebration transform ({ x, y, r, sx, sy, ox, oy }, r in degrees).
export function applyXf(g, f) {
  const ox = f.ox || 0;
  const oy = f.oy || 0;
  g.translate(ox + (f.x || 0), oy + (f.y || 0));
  if (f.r) g.rotate((f.r * Math.PI) / 180);
  if (f.sx !== undefined || f.sy !== undefined) g.scale(f.sx ?? 1, f.sy ?? 1);
  g.translate(-ox, -oy);
}

// Fills the box with a paint (call with a clip already set).
function fillBox(g, info, box, seed) {
  const { x, y, w, h } = box;
  if (info.kind === 'solid') {
    g.fillStyle = info.c;
    g.fillRect(x - 2, y - 2, w + 4, h + 4);
    return;
  }
  if (info.kind === 'rainbow') {
    const grad = g.createLinearGradient(x, y, x + w * 0.6, y + h);
    RAINBOW.forEach((c, k) => grad.addColorStop(k / (RAINBOW.length - 1), c));
    g.fillStyle = grad;
    g.fillRect(x - 2, y - 2, w + 4, h + 4);
    return;
  }
  if (info.kind === 'glitter') {
    const grad = g.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, '#ffe680');
    grad.addColorStop(0.45, '#f7b500');
    grad.addColorStop(0.7, '#ffe9a3');
    grad.addColorStop(1, '#e89d00');
    g.fillStyle = grad;
    g.fillRect(x - 2, y - 2, w + 4, h + 4);
    const rng = makeRng(seed * 977 + 3);
    const n = Math.min(500, Math.round((w * h) / 260));
    for (let k = 0; k < n; k++) {
      const px = x + rng() * w;
      const py = y + rng() * h;
      const r = 1 + rng() * 2.6;
      g.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,0.85)' : rng() < 0.5 ? '#fff3b0' : '#c77d00';
      g.beginPath();
      g.arc(px, py, r, 0, TAU);
      g.fill();
    }
    for (let k = 0; k < n / 12; k++) sparkle(g, x + rng() * w, y + rng() * h, 5 + rng() * 6, '#ffffff');
    return;
  }
  if (info.kind === 'stripes') {
    g.fillStyle = info.c2;
    g.fillRect(x - 2, y - 2, w + 4, h + 4);
    g.fillStyle = info.c;
    const step = 40;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const R = Math.hypot(w, h) / 2 + step;
    g.save();
    g.translate(cx, cy);
    g.rotate(-Math.PI / 4);
    for (let u = -R; u < R; u += step) g.fillRect(u, -R, step / 2, R * 2);
    g.restore();
    return;
  }
  // dots
  g.fillStyle = info.c;
  g.fillRect(x - 2, y - 2, w + 4, h + 4);
  g.fillStyle = info.c2;
  const sp = 34;
  for (let row = 0, py = y - sp; py < y + h + sp; py += sp * 0.87, row++) {
    for (let px = x - sp + (row % 2) * sp * 0.5; px < x + w + sp; px += sp) {
      g.beginPath();
      g.arc(px, py, 8.5, 0, TAU);
      g.fill();
    }
  }
}

// Fills a region's shapes with a paint (a paint string or a paintInfo object).
export function paintShapes(g, shapes, evenodd, paint, box, seed = 1) {
  const info = typeof paint === 'string' ? paintInfo(paint) : paint;
  const rule = evenodd ? 'evenodd' : 'nonzero';
  g.beginPath();
  tracePath(g, shapes);
  if (info.kind === 'solid') {
    g.fillStyle = info.c;
    g.fill(rule);
    return;
  }
  g.save();
  g.clip(rule);
  fillBox(g, info, box, seed);
  g.restore();
}

export function sparkle(g, x, y, r, colour) {
  g.fillStyle = colour;
  g.beginPath();
  g.moveTo(x, y - r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.quadraticCurveTo(x, y, x, y + r);
  g.quadraticCurveTo(x, y, x - r, y);
  g.quadraticCurveTo(x, y, x, y - r);
  g.fill();
}

// A plain colour standing in for a paint (eyelids, swatch rims).
export function paintColour(paint) {
  if (!paint) return C.primer;
  const info = paintInfo(paint);
  if (info.kind === 'rainbow') return RAINBOW[2];
  return info.c;
}

// ---------------------------------------------------------------------------------------------
// Wall layers
// ---------------------------------------------------------------------------------------------

// The fills layer. opts.xform(part) gives a celebration transform; opts.wipe =
// { i, prev, paint, x, y, r } draws region i part-way through being sprayed in: the old
// paint, with the new paint inside a circle of radius r round (x, y).
export function renderFills(g, m, fills, k, opts = {}) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, g.canvas.width, g.canvas.height);
  g.setTransform(k, 0, 0, k, 0, 0);
  const blank = m.free ? C.free : C.primer;
  for (const r of m.regions) {
    const xf = r.part && opts.xform ? opts.xform(r.part) : null;
    g.save();
    if (xf) applyXf(g, xf);
    const wipe = opts.wipe && opts.wipe.i === r.index ? opts.wipe : null;
    const paint = wipe ? wipe.prev : fills[r.index];
    paintShapes(g, r.shapes, r.evenodd, paint || { kind: 'solid', c: blank }, r.box, r.index + 1);
    if (wipe) {
      g.save();
      g.beginPath();
      tracePath(g, r.shapes);
      g.clip(r.evenodd ? 'evenodd' : 'nonzero');
      g.beginPath();
      g.arc(wipe.x, wipe.y, wipe.r, 0, TAU);
      g.clip();
      fillBox(g, paintInfo(wipe.paint), r.box, r.index + 1);
      g.restore();
      // spray speckles just ahead of the edge
      g.save();
      g.beginPath();
      tracePath(g, r.shapes);
      g.clip(r.evenodd ? 'evenodd' : 'nonzero');
      const rng = makeRng(Math.round(wipe.r) + 11);
      g.fillStyle = paintColour(wipe.paint);
      const n = Math.min(160, 20 + wipe.r * 0.8);
      for (let j = 0; j < n; j++) {
        const a = rng() * TAU;
        const d = wipe.r * (1 + rng() * 0.18) + rng() * 6;
        g.beginPath();
        g.arc(wipe.x + Math.cos(a) * d, wipe.y + Math.sin(a) * d, 1.5 + rng() * 3.5, 0, TAU);
        g.fill();
      }
      g.restore();
    }
    g.restore();
  }
}

// Brick joints for the free walls (drawn over the paint, faintly, like paint on bricks).
function bricks(g) {
  g.strokeStyle = 'rgba(80,50,40,0.13)';
  g.lineWidth = 2.5;
  g.beginPath();
  const bh = 40;
  for (let row = 0; row * bh < WALL_H; row++) {
    const y = row * bh;
    g.moveTo(0, y);
    g.lineTo(WALL_W, y);
    for (let x = row % 2 ? 50 : 0; x < WALL_W; x += 100) {
      g.moveTo(x, y);
      g.lineTo(x, y + bh);
    }
  }
  g.stroke();
}

function drawDetail(g, it, scale = 1) {
  g.beginPath();
  tracePath(g, it.shapes);
  if (it.fill) {
    g.fillStyle = it.fill === 'ink' ? C.ink : it.fill;
    g.fill();
  }
  if (it.w > 0) {
    g.lineWidth = it.w * scale;
    g.strokeStyle = it.stroke || C.ink;
    g.stroke();
  }
}

// The line layer: each region's outline, with anything under a region rubbed out first,
// so an outline is only seen where its shape is.
export function renderLines(g, m, k, opts = {}) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, g.canvas.width, g.canvas.height);
  g.setTransform(k, 0, 0, k, 0, 0);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  if (m.free) {
    bricks(g);
    return;
  }
  let first = true;
  for (const it of m.items) {
    const xf = it.part && opts.xform ? opts.xform(it.part) : null;
    g.save();
    if (xf) applyXf(g, xf);
    if (it.type === 'region') {
      const rule = it.evenodd ? 'evenodd' : 'nonzero';
      const erase = () => {
        g.globalCompositeOperation = 'destination-out';
        g.beginPath();
        tracePath(g, it.shapes);
        g.fill(rule);
        g.globalCompositeOperation = 'source-over';
      };
      if (!first) erase();
      // a region made of several overlapping shapes gets one outline round the lot: a
      // double-width stroke with the inside rubbed out again
      const union = !it.evenodd && it.shapes.length > 1 && !first;
      first = false;
      g.beginPath();
      tracePath(g, it.shapes);
      g.lineWidth = union ? LINE_W * 2 : LINE_W;
      g.strokeStyle = C.ink;
      g.stroke();
      if (union) erase();
    } else drawDetail(g, it);
    g.restore();
  }
}

// ---------------------------------------------------------------------------------------------
// Strokes, drips and stamps (the paint layer)
// ---------------------------------------------------------------------------------------------

function strokeColour(info, along) {
  switch (info.kind) {
    case 'rainbow':
      return `hsl(${Math.round(along * 0.9) % 360}, 95%, 56%)`;
    case 'glitter':
      return '#f9c11a';
    case 'stripes':
      return Math.floor(along / 26) % 2 ? info.c2 : info.c;
    default:
      return info.c;
  }
}

function speckles(g, rng, x0, y0, x1, y1, W, info, along, n) {
  for (let k = 0; k < n; k++) {
    const t = rng();
    const a = rng() * TAU;
    const d = W * (0.36 + rng() * 0.42);
    const r = W * (0.02 + rng() * 0.05) + 0.6;
    g.fillStyle = info.kind === 'glitter' ? (rng() < 0.5 ? '#ffffff' : '#ffe680') : strokeColour(info, along);
    g.beginPath();
    g.arc(x0 + (x1 - x0) * t + Math.cos(a) * d, y0 + (y1 - y0) * t + Math.sin(a) * d, r, 0, TAU);
    g.fill();
  }
}

// Draws a stroke's segments from point index `from` to the end. With from = 0 it draws
// the whole stroke (and a single point as a puff).
export function drawStroke(g, mark, from = 0) {
  const W = BRUSHES[mark.w] ?? BRUSHES[1];
  const info = paintInfo(mark.p);
  const q = mark.q;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (q.length === 2) {
    if (from > 0) return;
    const rng = makeRng(mark.s * 7919 + 1);
    g.fillStyle = strokeColour(info, 0);
    g.beginPath();
    g.arc(q[0], q[1], W * 0.42, 0, TAU);
    g.fill();
    speckles(g, rng, q[0], q[1], q[0], q[1], W, info, 0, 14);
    return;
  }
  let along = 0;
  for (let j = 1; j < q.length / 2; j++) {
    const x0 = q[j * 2 - 2];
    const y0 = q[j * 2 - 1];
    const x1 = q[j * 2];
    const y1 = q[j * 2 + 1];
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (j > from) {
      const rng = makeRng(mark.s * 7919 + j * 104729);
      g.lineWidth = W * 0.8;
      // colours that change along the stroke are laid down in short steps, so a long
      // straight piece is still a rainbow
      const steps = info.kind === 'rainbow' || info.kind === 'stripes' ? Math.max(1, Math.ceil(len / 10)) : 1;
      for (let k = 0; k < steps; k++) {
        g.strokeStyle = strokeColour(info, along + (len * k) / steps);
        g.beginPath();
        g.moveTo(x0 + ((x1 - x0) * k) / steps, y0 + ((y1 - y0) * k) / steps);
        g.lineTo(x0 + ((x1 - x0) * (k + 1)) / steps, y0 + ((y1 - y0) * (k + 1)) / steps);
        g.stroke();
      }
      speckles(g, rng, x0, y0, x1, y1, W, info, along, 2 + Math.floor(len * W * 0.012));
      if (info.kind === 'dots' || info.kind === 'glitter') {
        const gap = info.kind === 'dots' ? Math.max(18, W * 0.9) : 22;
        for (let a = Math.ceil(along / gap) * gap; a < along + len; a += gap) {
          const t = (a - along) / (len || 1);
          const px = x0 + (x1 - x0) * t;
          const py = y0 + (y1 - y0) * t;
          if (info.kind === 'dots') {
            g.fillStyle = info.c2;
            g.beginPath();
            g.arc(px, py, W * 0.17, 0, TAU);
            g.fill();
          } else sparkle(g, px + (rng() - 0.5) * W * 0.5, py + (rng() - 0.5) * W * 0.5, W * 0.22, '#ffffff');
        }
      }
    }
    along += len;
  }
}

// One drip: from its start down to `len` (or part of the way, from `from`).
export function drawDrip(g, mark, d, from, to, end = true) {
  const info = paintInfo(mark.p);
  g.strokeStyle = strokeColour(info, d.at);
  g.fillStyle = g.strokeStyle;
  g.lineCap = 'round';
  g.lineWidth = d.w;
  g.beginPath();
  g.moveTo(d.x, d.y + from);
  g.lineTo(d.x, d.y + Math.max(from + 0.1, to));
  g.stroke();
  if (end) {
    g.beginPath();
    g.arc(d.x, d.y + to, d.w * 0.72, 0, TAU);
    g.fill();
  }
}

const STAMP_ART = new Map(STAMPS.map((s) => [s.id, compileMural({ id: s.id, items: s.items })]));

export function drawStamp(g, mark, pop = 1) {
  const m = STAMP_ART.get(mark.k) || STAMP_ART.get('star');
  const s = (mark.z / 100) * pop;
  if (s <= 0.001) return;
  g.save();
  g.translate(mark.x, mark.y);
  g.rotate(((mark.a || 0) * Math.PI) / 180);
  g.scale(s, s);
  const lw = Math.max(3.5, Math.min(11, mark.z * 0.045)) / s;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  for (const it of m.items) {
    if (it.type === 'region') {
      paintShapes(g, it.shapes, it.evenodd, it.fixed ? { kind: 'solid', c: it.fixed } : mark.p, it.box, mark.x + mark.y);
      g.beginPath();
      tracePath(g, it.shapes);
      g.lineWidth = lw;
      g.strokeStyle = C.ink;
      g.stroke();
    } else drawDetail(g, it, lw / 5);
  }
  g.restore();
}

// A whole mark (stroke with its drips, or stamp), as it looks when finished.
export function drawMark(g, mark) {
  if (mark.t === 'm') {
    drawStamp(g, mark);
    return;
  }
  drawStroke(g, mark, 0);
  for (const d of dripsFor(mark)) drawDrip(g, mark, d, 0, d.len);
}

export function renderPaint(g, marks, k) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, g.canvas.width, g.canvas.height);
  g.setTransform(k, 0, 0, k, 0, 0);
  for (const mk of marks) drawMark(g, mk);
}

// ---------------------------------------------------------------------------------------------
// Glitter twinkles, the wink and celebration effects (drawn per frame, in wall units)
// ---------------------------------------------------------------------------------------------

const twinkleSpots = new WeakMap();
function spotsFor(m, i) {
  let all = twinkleSpots.get(m);
  if (!all) {
    all = [];
    twinkleSpots.set(m, all);
  }
  if (!all[i]) {
    const r = m.regions[i];
    const rng = makeRng(i * 31 + 17);
    const spots = [];
    const want = Math.max(2, Math.min(12, Math.round((r.box.w * r.box.h) / 9000)));
    for (let k = 0; k < want * 8 && spots.length < want; k++) {
      const x = r.box.x + rng() * r.box.w;
      const y = r.box.y + rng() * r.box.h;
      if (regionAt(m, x, y) === i) spots.push({ x, y, ph: rng() * TAU, s: 7 + rng() * 9 });
    }
    all[i] = spots;
  }
  return all[i];
}

export function drawTwinkles(g, m, fills, time) {
  fills.forEach((p, i) => {
    if (p !== 'g') return;
    for (const s of spotsFor(m, i)) {
      const a = Math.sin(time * 3 + s.ph);
      if (a <= 0.2) continue;
      g.globalAlpha = a;
      sparkle(g, s.x, s.y, s.s * a, '#ffffff');
    }
  });
  g.globalAlpha = 1;
}

// A gold sparkle that pulses over a spot still waiting for colour.
export function drawHint(g, x, y, time) {
  const a = 0.5 + 0.5 * Math.sin(time * 4);
  g.save();
  g.globalAlpha = 0.55 + 0.45 * a;
  sparkle(g, x, y, 15 + 7 * a, '#1f1440');
  sparkle(g, x, y, 11 + 6 * a, '#ffd23f');
  g.restore();
}

// The wink: an eyelid the colour of the face closes over the eye and opens again.
export function drawWink(g, w, amount, lidPaint) {
  if (amount <= 0) return;
  g.save();
  g.beginPath();
  g.arc(w.x, w.y, w.r + 1.5, 0, TAU);
  g.clip();
  g.fillStyle = paintColour(lidPaint);
  g.fillRect(w.x - w.r - 3, w.y - w.r - 3, (w.r + 3) * 2, (w.r + 3) * 2 * amount);
  g.restore();
  g.lineWidth = 4;
  g.strokeStyle = C.ink;
  g.lineCap = 'round';
  const ly = w.y - w.r + (w.r * 2 + 2) * amount;
  const half = Math.sqrt(Math.max(0, w.r * w.r - (ly - w.y) * (ly - w.y)));
  g.beginPath();
  g.moveTo(w.x - half - 2, ly);
  g.quadraticCurveTo(w.x, ly + w.r * 0.35 * amount, w.x + half + 2, ly);
  g.stroke();
}

export function drawFx(g, fx, t) {
  if (t < fx.from || t > fx.to) return;
  const u = t - fx.from;
  const span = fx.to - fx.from;
  const fade = Math.min(1, u / 0.3, (fx.to - t) / 0.4);
  g.save();
  g.globalAlpha = Math.max(0, fade);
  if (fx.type === 'bubbles') {
    for (let k = 0; k < 9; k++) {
      const p = ((u * 0.35 + k / 9) % 1);
      const x = fx.x + Math.sin(k * 2.1 + u * 3) * 40 + (k - 4) * 14;
      const y = fx.y - p * fx.y * 0.95;
      g.lineWidth = 4;
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.beginPath();
      g.arc(x, y, 8 + (k % 3) * 5, 0, TAU);
      g.stroke();
    }
  } else if (fx.type === 'notes') {
    for (let k = 0; k < 5; k++) {
      const p = (u * 0.4 + k / 5) % 1;
      const x = fx.x - 60 + k * 40 + Math.sin(u * 4 + k) * 20;
      const y = fx.y - p * 300;
      g.globalAlpha = Math.max(0, fade) * (1 - p);
      g.fillStyle = [C.pink, '#3550e8', '#9046e8', C.orange, '#12c9c1'][k];
      g.beginPath();
      g.ellipse(x, y, 13, 10, -0.4, 0, TAU);
      g.fill();
      g.fillRect(x + 9, y - 44, 5, 44);
      g.fillRect(x + 9, y - 44, 20, 7);
    }
  } else if (fx.type === 'smoke') {
    for (let k = 0; k < 14; k++) {
      const p = ((u * 0.8 + k / 14) % 1);
      const side = k % 2 ? 1 : -1;
      const x = fx.x + side * (20 + p * 220) + Math.sin(k) * 20;
      const y = fx.y + 60 + p * 40 - Math.sin(p * Math.PI) * 30;
      g.globalAlpha = Math.max(0, fade) * (1 - p) * 0.9;
      g.fillStyle = k % 3 ? '#f3eef8' : '#d8d0e6';
      g.beginPath();
      g.arc(x, y, 26 + p * 50, 0, TAU);
      g.fill();
    }
  } else if (fx.type === 'splash') {
    const p = u / span;
    for (let k = 0; k < 12; k++) {
      const a = Math.PI + (k / 11) * Math.PI;
      const sp = 180 + (k % 3) * 60;
      const x = fx.x + Math.cos(a) * sp * p;
      const y = fx.y + Math.sin(a) * sp * p + 300 * p * p;
      g.fillStyle = k % 2 ? '#ffffff' : '#9ff7f2';
      g.beginPath();
      g.arc(x, y, 9 - p * 4, 0, TAU);
      g.fill();
    }
  } else if (fx.type === 'glow') {
    const r = 60 + Math.sin(u * 8) * 16;
    const grad = g.createRadialGradient(fx.x, fx.y, 4, fx.x, fx.y, r);
    grad.addColorStop(0, 'rgba(255,250,200,0.95)');
    grad.addColorStop(1, 'rgba(255,230,120,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(fx.x, fx.y, r, 0, TAU);
    g.fill();
  }
  g.restore();
}

export function drawConfetti(ctx, w, h, t) {
  const colours = [C.pink, C.sun, C.foam, C.white, C.orange, '#3a7bff', '#7cff6b'];
  for (let i = 0; i < 90; i++) {
    const speed = 110 + ((i * 53) % 110);
    const x = ((i * 0.137) % 1) * w + Math.sin(t * 2 + i) * 20;
    const y = t * speed - 40 - ((i * 97) % 300);
    if (y < -20 || y > h + 20) continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 3 + i);
    ctx.fillStyle = colours[i % colours.length];
    ctx.fillRect(-7, -4, 14, 8);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------------------------
// A whole wall as one picture (gallery thumbnails, the launcher tile, debug)
// ---------------------------------------------------------------------------------------------

export function renderWallImage(m, wall, pw, lineCache) {
  const k = pw / WALL_W;
  const ph = Math.round(WALL_H * k);
  const out = makeCanvas(pw, ph);
  const g = out.getContext('2d');
  renderFills(g, m, wall.fills, k);
  const paint = makeCanvas(pw, ph);
  renderPaint(paint.getContext('2d'), wall.marks, k);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(paint, 0, 0);
  let lines = lineCache?.get(`${m.id}|${pw}`);
  if (!lines) {
    lines = makeCanvas(pw, ph);
    renderLines(lines.getContext("2d"), m, k);
    lineCache?.set(`${m.id}|${pw}`, lines);
  }
  g.drawImage(lines, 0, 0);
  return out;
}

// ---------------------------------------------------------------------------------------------
// Buttons and icons
// ---------------------------------------------------------------------------------------------

export function drawStar(ctx, cx, cy, r, fill = C.gold, line = C.ink) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 ? r * 0.46 : r;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (line) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, r * 0.16);
    ctx.strokeStyle = line;
    ctx.stroke();
  }
}

// A chunky button: a rounded tile, raised when `on`.
export function drawTool(ctx, b, on = false) {
  const r = b.w * 0.26;
  ctx.fillStyle = 'rgba(10,4,30,0.35)';
  roundRect(ctx, b.x, b.y + 4, b.w, b.h, r);
  ctx.fill();
  ctx.fillStyle = on ? C.sun : b.fill || '#ffffff';
  roundRect(ctx, b.x, b.y, b.w, b.h, r);
  ctx.fill();
  ctx.lineWidth = on ? 4 : 2.5;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
}

// Icons, drawn inside a box of size s centred on (cx, cy).
export function glyph(ctx, name, cx, cy, s, opts = {}) {
  const u = s / 100;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(u, u);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 7;
  ctx.strokeStyle = C.ink;
  const fillStroke = (fill) => {
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
  };
  switch (name) {
    case 'home': {
      ctx.beginPath();
      ctx.moveTo(-38, -2);
      ctx.lineTo(0, -38);
      ctx.lineTo(38, -2);
      ctx.lineTo(28, -2);
      ctx.lineTo(28, 36);
      ctx.lineTo(-28, 36);
      ctx.lineTo(-28, -2);
      ctx.closePath();
      fillStroke(C.pink);
      ctx.beginPath();
      roundRect(ctx, -10, 10, 20, 26, 4);
      fillStroke(C.sun);
      break;
    }
    case 'street': {
      // three little painted walls
      const cols = [C.pink, '#4fb3ff', C.sun];
      [-30, 0, 30].forEach((x, k) => {
        roundRect(ctx, x - 15, -30 + (k % 2) * 10, 30, 64 - (k % 2) * 10, 4);
        fillStroke(cols[k]);
      });
      ctx.beginPath();
      ctx.moveTo(-46, 36);
      ctx.lineTo(46, 36);
      ctx.stroke();
      break;
    }
    case 'bucket': {
      ctx.beginPath();
      ctx.moveTo(-30, -16);
      ctx.lineTo(30, -16);
      ctx.lineTo(22, 38);
      ctx.lineTo(-22, 38);
      ctx.closePath();
      fillStroke('#cfd6e6');
      ctx.beginPath();
      ctx.ellipse(0, -16, 30, 9, 0, 0, TAU);
      fillStroke(opts.colour || C.pink);
      ctx.beginPath();
      ctx.moveTo(-30, -16);
      ctx.quadraticCurveTo(0, -60, 30, -16);
      ctx.stroke();
      // a drip of paint
      ctx.beginPath();
      ctx.moveTo(18, -12);
      ctx.quadraticCurveTo(26, 4, 30, 14);
      ctx.arc(32, 18, 6, Math.PI, 0, true);
      ctx.fillStyle = opts.colour || C.pink;
      ctx.lineWidth = 0;
      ctx.fill();
      break;
    }
    case 'spray': {
      ctx.beginPath();
      roundRect(ctx, -20, -16, 40, 56, 8);
      fillStroke('#cfd6e6');
      ctx.beginPath();
      roundRect(ctx, -20, 0, 40, 22, 2);
      fillStroke(opts.colour || C.pink);
      ctx.beginPath();
      roundRect(ctx, -9, -32, 18, 16, 4);
      fillStroke('#8f97ab');
      ctx.fillStyle = opts.colour || C.pink;
      for (const [x, y, r] of [[22, -40, 5], [34, -30, 4], [30, -48, 3.5], [42, -42, 3], [40, -20, 3]]) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
      }
      break;
    }
    case 'size': {
      const r = [10, 19, 30][opts.size ?? 1];
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      fillStroke(opts.colour || C.ink);
      break;
    }
    case 'drip': {
      ctx.beginPath();
      ctx.moveTo(-34, -30);
      ctx.lineTo(34, -30);
      ctx.lineTo(34, -12);
      ctx.lineTo(14, -12);
      ctx.lineTo(14, 22);
      ctx.arc(8, 24, 8, 0, Math.PI);
      ctx.lineTo(2, -12);
      ctx.lineTo(-12, -12);
      ctx.lineTo(-12, 6);
      ctx.arc(-18, 8, 7, 0, Math.PI);
      ctx.lineTo(-24, -12);
      ctx.lineTo(-34, -12);
      ctx.closePath();
      fillStroke(opts.colour || '#4fb3ff');
      break;
    }
    case 'undo': {
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(4, 6, 26, -Math.PI * 0.95, Math.PI * 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-40, -24);
      ctx.lineTo(-20, 10);
      ctx.lineTo(-4, -18);
      ctx.closePath();
      ctx.fillStyle = C.ink;
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.stroke();
      break;
    }
    case 'trash': {
      ctx.beginPath();
      ctx.moveTo(-26, -18);
      ctx.lineTo(26, -18);
      ctx.lineTo(20, 38);
      ctx.lineTo(-20, 38);
      ctx.closePath();
      fillStroke('#ff8fa0');
      ctx.beginPath();
      roundRect(ctx, -34, -30, 68, 12, 4);
      fillStroke('#ff8fa0');
      ctx.beginPath();
      roundRect(ctx, -10, -40, 20, 10, 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-8, -6);
      ctx.lineTo(-6, 28);
      ctx.moveTo(8, -6);
      ctx.lineTo(6, 28);
      ctx.stroke();
      break;
    }
    case 'tick': {
      ctx.lineWidth = 16;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-30, 2);
      ctx.lineTo(-8, 26);
      ctx.lineTo(32, -24);
      ctx.stroke();
      break;
    }
    case 'cross': {
      ctx.lineWidth = 16;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-26, -26);
      ctx.lineTo(26, 26);
      ctx.moveTo(26, -26);
      ctx.lineTo(-26, 26);
      ctx.stroke();
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

// A palette swatch: a round blob of paint.
export function drawSwatch(ctx, cx, cy, r, paint, on, time = 0) {
  const info = paintInfo(paint);
  const lift = on ? 1.12 : 1;
  const R = r * lift;
  const y = cy - (on ? r * 0.12 : 0);
  ctx.fillStyle = 'rgba(10,4,30,0.35)';
  ctx.beginPath();
  ctx.arc(cx, y + 4, R, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, y, R, 0, TAU);
  ctx.clip();
  ctx.translate(cx - R, y - R);
  const k = (R * 2) / 100;
  ctx.scale(k, k);
  fillBox(ctx, info, { x: 0, y: 0, w: 100, h: 100 }, 5);
  ctx.restore();
  if (info.kind === 'glitter') {
    const a = (Math.sin(time * 4) + 1) / 2;
    sparkle(ctx, cx + R * 0.3, y - R * 0.3, R * (0.25 + a * 0.2), '#ffffff');
  }
  ctx.beginPath();
  ctx.arc(cx, y, R, 0, TAU);
  ctx.lineWidth = on ? 5 : 2.5;
  ctx.strokeStyle = on ? '#ffffff' : C.ink;
  ctx.stroke();
  if (on) {
    ctx.beginPath();
    ctx.arc(cx, y, R + 4, 0, TAU);
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  }
  // a shine
  ctx.beginPath();
  ctx.arc(cx - R * 0.32, y - R * 0.34, R * 0.16, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();
}

// A stamp button: the stamp in the chosen paint.
export function drawStampIcon(ctx, kind, cx, cy, s, paint) {
  ctx.save();
  ctx.translate(cx, cy);
  const k = s / 110;
  ctx.scale(k, k);
  drawStamp(ctx, { k: kind, p: paint, x: 0, y: 0, z: 100, a: 0 });
  ctx.restore();
}

export const COLOUR_LIST = COLOURS;
