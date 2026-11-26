// Drawing any monster from its parts, at any size, facing either way, in any pose: idle
// (breathing, blinking, wiggling parts), attack (lunge), hit (flinch), dizzy (wobble and stars)
// and happy (hop). Used by every screen and the launcher tile.
//
// Monster units: the monster stands on y = 0, faces +x and is about 100 units wide; the body
// is a smooth closed curve through hand-placed points (parts.js), drawn with a darker crescent
// underneath, a shine on top and a chunky ink outline. Parts sit on anchors worked out from
// the body outline, so every part fits every body.
import { partDef } from './parts.js';

export const INK = '#2a1636';
const LW = 4.6; // outline width in units
const TAU = Math.PI * 2;
const UNIT_H = 140; // a monster `size` px tall maps 140 units to it
const HORN = '#fff0c8';
const HORN_DARK = '#e7c98f';
const GOLD = '#ffd23f';

// ---------- colour helpers ----------

function hexRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a, b, k) {
  const x = hexRgb(a);
  const y = hexRgb(b);
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * k));
  return `#${((1 << 24) + (c[0] << 16) + (c[1] << 8) + c[2]).toString(16).slice(1)}`;
}

// ---------- shapes ----------

// A smooth closed (or open) curve through points [x0, y0, x1, y1, ...].
export function smoothPath(ctx, pts, closed = true) {
  const n = pts.length / 2;
  const P = (i) => {
    const k = closed ? ((i % n) + n) % n : Math.max(0, Math.min(n - 1, i));
    return [pts[k * 2], pts[k * 2 + 1]];
  };
  const [x0, y0] = P(0);
  ctx.moveTo(x0, y0);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const [ax, ay] = P(i - 1);
    const [bx, by] = P(i);
    const [cx, cy] = P(i + 1);
    const [dx, dy] = P(i + 2);
    ctx.bezierCurveTo(bx + (cx - ax) / 6, by + (cy - ay) / 6, cx - (dx - bx) / 6, cy - (dy - by) / 6, cx, cy);
  }
  if (closed) ctx.closePath();
}

function blob(ctx, pts, fill, lw = LW) {
  ctx.beginPath();
  smoothPath(ctx, pts, true);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
}

function circle(ctx, x, y, r, fill, lw = LW) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (lw) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
}

function ellipse(ctx, x, y, rx, ry, rot, fill, lw = LW) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (lw) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
}

// A thick outlined line (a noodle arm, a stalk, a tentacle): ink underneath, colour on top.
function tube(ctx, pts, width, colour, closed = false) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  smoothPath(ctx, pts, closed);
  ctx.lineWidth = width + LW * 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = width;
  ctx.strokeStyle = colour;
  ctx.stroke();
}

// ---------- the body and its anchors ----------

const bodyCache = new Map();

// { pts, path (Path2D or null), top, bottom, maxW } for a body id.
export function bodyGeom(id) {
  let g = bodyCache.get(id);
  if (g) return g;
  const def = partDef('body', id);
  const h = def.half;
  const pts = [];
  for (const [x, y] of h) pts.push(x, y);
  for (let i = h.length - 2; i >= 1; i--) pts.push(-h[i][0], h[i][1]);
  let path = null;
  if (typeof Path2D !== 'undefined') {
    path = new Path2D();
    smoothPath(path, pts, true);
  }
  const ys = h.map((p) => p[1]);
  g = {
    def, pts, path, half: h,
    top: Math.min(...ys),
    bottom: Math.max(...ys),
    maxW: Math.max(...h.map((p) => p[0])),
  };
  bodyCache.set(id, g);
  return g;
}

// Half the body's width at height y.
export function halfWidthAt(g, y) {
  let best = 0;
  const h = g.half;
  for (let i = 0; i < h.length - 1; i++) {
    const [x0, y0] = h[i];
    const [x1, y1] = h[i + 1];
    if ((y >= y0 && y <= y1) || (y >= y1 && y <= y0)) {
      const k = y1 === y0 ? 0 : (y - y0) / (y1 - y0);
      best = Math.max(best, x0 + (x1 - x0) * k);
    }
  }
  return best;
}

// The top of the body at x (left or right).
export function topAt(g, x) {
  const ax = Math.abs(x);
  let best = 0;
  const h = g.half;
  for (let i = 0; i < h.length - 1; i++) {
    const [x0, y0] = h[i];
    const [x1, y1] = h[i + 1];
    if ((ax >= x0 && ax <= x1) || (ax >= x1 && ax <= x0)) {
      const k = x1 === x0 ? 0 : (ax - x0) / (x1 - x0);
      best = Math.min(best, y0 + (y1 - y0) * k);
    }
  }
  return best || g.top;
}

function tracePath(ctx, g) {
  ctx.beginPath();
  smoothPath(ctx, g.pts, true);
}

function fillBody(ctx, g) {
  if (g.path) ctx.fill(g.path);
  else {
    tracePath(ctx, g);
    ctx.fill();
  }
}

function clipBody(ctx, g) {
  if (g.path) ctx.clip(g.path);
  else {
    tracePath(ctx, g);
    ctx.clip();
  }
}

function strokeBody(ctx, g) {
  ctx.lineWidth = LW;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  if (g.path) ctx.stroke(g.path);
  else {
    tracePath(ctx, g);
    ctx.stroke();
  }
}

// How far the legs lift the body off the ground.
const LIFT = { stubby: 2, bigfeet: 4, tentacles: 6, wheels: 12, springs: 16, duck: 14, hover: 18 };

// Where the top of the monster is (units above the ground, positive), for placing UI above it.
export function headroom(parts, stage = 0) {
  const g = bodyGeom(parts.body);
  const top = -g.top + (LIFT[parts.legs] || 0);
  const extra = { none: 0, nubs: 14, ram: 8, antennae: 30, cat: 22, floppy: 6, mohawk: 18, unihorn: 32, sprout: 22, palm: 40, crest: 26 }[parts.top] || 0;
  const eyes = parts.eyes === 'stalks' ? 26 : 0;
  return (top + Math.max(extra, eyes) + (stage >= 2 ? 22 : 0)) * (1 + 0.12 * stage);
}

// ---------- patterns ----------

const SPOTS = [[-0.62, -0.55, 0.13], [0.55, -0.7, 0.1], [-0.42, 0.35, 0.16], [0.5, 0.25, 0.12], [0.05, 0.62, 0.1], [-0.75, -0.05, 0.08], [0.78, -0.2, 0.08]];

function drawPattern(ctx, g, kind, col, face) {
  const top = g.top;
  const bot = g.bottom;
  const H = bot - top;
  const W = g.maxW;
  const cy = (top + bot) / 2;
  if (kind === 'belly') {
    const by = face.my + (bot - face.my) * 0.48;
    ellipse(ctx, 4, by + 4, halfWidthAt(g, by) * 0.66, (bot - face.my) * 0.55, 0, col.belly, 0);
  } else if (kind === 'spots') {
    ctx.fillStyle = col.spot;
    for (const [sx, sy, r] of SPOTS) {
      ctx.beginPath();
      ctx.ellipse(sx * W, cy + sy * H * 0.5, r * W, r * W * 0.85, 0.3, 0, TAU);
      ctx.fill();
    }
  } else if (kind === 'stripes') {
    ctx.strokeStyle = col.spot;
    ctx.lineWidth = H * 0.075;
    for (const k of [0.62, 0.78, 0.94]) {
      const y = top + H * k;
      ctx.beginPath();
      ctx.moveTo(-W - 10, y - 6);
      ctx.quadraticCurveTo(0, y + 10, W + 10, y - 6);
      ctx.stroke();
    }
  } else if (kind === 'freckles') {
    ctx.fillStyle = col.dark;
    const y = face.y + 15;
    for (const s of [-1, 1]) {
      const x = 5 + s * (face.gap + 12);
      for (const [dx, dy] of [[-4, 0], [3, -2], [0, 4], [6, 3]]) {
        ctx.beginPath();
        ctx.arc(x + dx * s, y + dy, 1.8, 0, TAU);
        ctx.fill();
      }
    }
  } else if (kind === 'cap') {
    const y = face.y - 16 * face.r;
    ctx.fillStyle = col.spot;
    ctx.beginPath();
    ctx.moveTo(-W - 10, top - 10);
    ctx.lineTo(W + 10, top - 10);
    ctx.lineTo(W + 10, y);
    for (let i = 0; i <= 8; i++) {
      const x = W + 10 - ((2 * W + 20) * i) / 8;
      ctx.quadraticCurveTo(x + (W + 10) / 8, y + (i % 2 ? 10 : -4), x, y + 3);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (const [dx, dy, r] of [[-0.4, 0.3, 5], [0.25, 0.15, 4], [0.5, 0.55, 3]]) {
      ctx.beginPath();
      ctx.arc(dx * W, top + (y - top) * dy + 4, r, 0, TAU);
      ctx.fill();
    }
  } else if (kind === 'tiger') {
    ctx.fillStyle = col.dark;
    for (const s of [-1, 1]) {
      for (const k of [0.38, 0.58, 0.78]) {
        const y = top + H * k;
        const x = s * (halfWidthAt(g, y) + 4);
        ctx.beginPath();
        ctx.moveTo(x, y - 6);
        ctx.quadraticCurveTo(x - s * 14, y - 2, x - s * 22, y + 2);
        ctx.quadraticCurveTo(x - s * 12, y + 3, x, y + 6);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
}

// ---------- eyes ----------

function eyeball(ctx, x, y, r, look, t, seed, opts) {
  const { iris = null, blink = 0, mood = 'idle' } = opts;
  if (mood === 'hit') {
    // squeezed shut: > <
    ctx.strokeStyle = INK;
    ctx.lineWidth = LW * 0.9;
    ctx.lineCap = 'round';
    const s = x < opts.cx ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(x - s * r * 0.6, y - r * 0.55);
    ctx.lineTo(x + s * r * 0.5, y);
    ctx.lineTo(x - s * r * 0.6, y + r * 0.55);
    ctx.stroke();
    return;
  }
  if (mood === 'happy' || blink > 0.5) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = LW * 0.9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (mood === 'happy') ctx.arc(x, y + r * 0.35, r * 0.6, Math.PI * 1.1, Math.PI * 1.9);
    else ctx.arc(x, y - r * 0.1, r * 0.65, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
    return;
  }
  circle(ctx, x, y, r, '#ffffff');
  if (mood === 'dizzy') {
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1.5, r * 0.16);
    ctx.beginPath();
    for (let i = 0; i <= 26; i++) {
      const a = i * 0.55 + t * 6;
      const rr = (i / 26) * r * 0.75;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.stroke();
    return;
  }
  // googly pupil: looks the way the monster faces and jiggles
  const jx = Math.cos(t * 5.3 + seed) * r * 0.08;
  const jy = Math.sin(t * 4.1 + seed * 2) * r * 0.08;
  const px = x + look * r * 0.28 + jx;
  const py = y + r * 0.08 + jy;
  if (iris) {
    circle(ctx, px, py, r * 0.62, iris, 0);
    circle(ctx, px, py, r * 0.36, INK, 0);
    circle(ctx, px - r * 0.2, py - r * 0.24, r * 0.2, '#ffffff', 0);
    circle(ctx, px + r * 0.18, py + r * 0.18, r * 0.09, '#ffffff', 0);
  } else {
    circle(ctx, px, py, r * 0.46, INK, 0);
    circle(ctx, px - r * 0.15, py - r * 0.17, r * 0.15, '#ffffff', 0);
  }
}

// A lid closing over the top part of an eye (sleepy, grumpy).
function lid(ctx, x, y, r, colour, k, tilt = 0) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.clip();
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(x - r * 1.2, y - r * 1.2);
  ctx.lineTo(x + r * 1.2, y - r * 1.2);
  ctx.lineTo(x + r * 1.2, y - r + 2 * r * k + tilt * r);
  ctx.lineTo(x - r * 1.2, y - r + 2 * r * k - tilt * r);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = LW * 0.8;
  ctx.beginPath();
  ctx.moveTo(x - r * 1.2, y - r + 2 * r * k - tilt * r);
  ctx.lineTo(x + r * 1.2, y - r + 2 * r * k + tilt * r);
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.lineWidth = LW;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function drawEyes(ctx, kind, g, face, col, t, seed, mood, blink) {
  const fx = 5;
  const R = 11 * face.r;
  const y = face.y;
  const gap = face.gap;
  const o = { blink, mood, cx: fx };
  const plainMood = mood === 'hit' || mood === 'happy' || mood === 'dizzy' || blink > 0.5;
  switch (kind) {
    case 'cyclops':
      eyeball(ctx, fx, y, R * 1.65, 1, t, seed, { ...o, iris: col.spot === '#ffffff' ? '#3ab0ff' : mix(col.spot, '#2a8cff', 0.35) });
      break;
    case 'three':
      eyeball(ctx, fx - gap * 1.05, y + 2, R * 0.78, 1, t, seed, o);
      eyeball(ctx, fx + gap * 1.05, y + 2, R * 0.78, 1, t, seed + 1, o);
      eyeball(ctx, fx, y - R * 1.35, R * 0.7, 1, t, seed + 2, o);
      break;
    case 'sleepy':
      for (const s of [-1, 1]) {
        eyeball(ctx, fx + s * gap, y, R, 1, t * 0.4, seed + s, o);
        if (!plainMood) lid(ctx, fx + s * gap, y, R, col.main, 0.48);
      }
      break;
    case 'stalks': {
      const topY = topAt(g, 0);
      for (const s of [-1, 1]) {
        const sway = Math.sin(t * 2.2 + s) * 3;
        const ex = fx + s * gap * 0.9 + sway;
        const ey = topY - 24;
        tube(ctx, [fx + s * gap * 0.55, topY + 10, fx + s * gap * 0.75 + sway * 0.4, topY - 8, ex, ey + R * 0.6], 6, col.main);
        if (plainMood) circle(ctx, ex, ey, R * 0.95, col.main);
        eyeball(ctx, ex, ey, R * 0.95, 1, t, seed + s, o);
      }
      break;
    }
    case 'shades': {
      if (mood === 'hit' || mood === 'dizzy') {
        for (const s of [-1, 1]) eyeball(ctx, fx + s * gap, y, R, 1, t, seed + s, o);
        break;
      }
      const w = R * 2.2;
      const h = R * 1.6;
      ctx.lineWidth = LW;
      ctx.strokeStyle = INK;
      ctx.beginPath();
      ctx.moveTo(fx - gap + w * 0.4, y - h * 0.3);
      ctx.quadraticCurveTo(fx, y - h * 0.55, fx + gap - w * 0.4, y - h * 0.3);
      ctx.stroke();
      for (const s of [-1, 1]) {
        const cx = fx + s * gap;
        ctx.beginPath();
        ctx.moveTo(cx - w / 2, y - h / 2);
        ctx.lineTo(cx + w / 2, y - h / 2);
        ctx.quadraticCurveTo(cx + w / 2, y + h / 2, cx, y + h / 2);
        ctx.quadraticCurveTo(cx - w / 2, y + h / 2, cx - w / 2, y - h / 2);
        ctx.closePath();
        const gr = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
        gr.addColorStop(0, '#ff4fa3');
        gr.addColorStop(1, '#2a1a6b');
        ctx.fillStyle = gr;
        ctx.fill();
        ctx.lineWidth = LW;
        ctx.strokeStyle = INK;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.3, y - h * 0.15);
        ctx.lineTo(cx - w * 0.1, y - h * 0.35);
        ctx.stroke();
      }
      break;
    }
    case 'sparkle':
      for (const s of [-1, 1]) eyeball(ctx, fx + s * gap, y, R * 1.12, 1, t * 0.5, seed + s, { ...o, iris: '#3b2470' });
      break;
    case 'grumpy':
      for (const s of [-1, 1]) {
        eyeball(ctx, fx + s * gap, y, R, 1, t, seed + s, o);
        if (!plainMood) lid(ctx, fx + s * gap, y, R, col.main, 0.3, s * -0.25);
      }
      // brows
      ctx.strokeStyle = INK;
      ctx.lineCap = 'round';
      ctx.lineWidth = LW * 1.3;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(fx + s * (gap + R * 0.9), y - R * 1.35);
        ctx.lineTo(fx + s * (gap - R * 0.7), y - R * 0.95);
        ctx.stroke();
      }
      break;
    case 'mismatch':
      eyeball(ctx, fx - gap * 0.95, y - 2, R * 1.25, 1, t, seed, o);
      eyeball(ctx, fx + gap * 1.05, y + 2, R * 0.75, 1, t, seed + 1, o);
      break;
    default: // googly
      eyeball(ctx, fx - gap, y, R * 1.04, 1, t, seed, o);
      eyeball(ctx, fx + gap, y, R * 0.94, 1, t, seed + 3, o);
  }
}

// ---------- mouths ----------

const MOUTH_IN = '#6b1d3c';
const TONGUE = '#ff7aa2';

function openMouth(ctx, x, y, w, h) {
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.quadraticCurveTo(x, y - h * 0.18, x + w, y);
    ctx.quadraticCurveTo(x + w * 0.9, y + h, x, y + h);
    ctx.quadraticCurveTo(x - w * 0.9, y + h, x - w, y);
    ctx.closePath();
  };
  shape();
  ctx.fillStyle = MOUTH_IN;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ellipse(ctx, x + w * 0.1, y + h * 1.05, w * 0.6, h * 0.5, 0, TONGUE, 0);
  ctx.restore();
  shape();
  ctx.lineWidth = LW;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function drawMouth(ctx, kind, face, col, t, mood) {
  const x = 6;
  const y = face.my;
  const w = 11 * face.mw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const open = mood === 'attack' || mood === 'happy';
  if (kind === 'beak') {
    const gape = open ? 7 : mood === 'hit' ? 3 : 1;
    blob(ctx, [x - w * 0.9, y - 6, x + w * 0.4, y - 8, x + w * 1.6, y - 1, x + w * 0.4, y + 1, x - w * 0.9, y + 1], '#ffb12e');
    blob(ctx, [x - w * 0.8, y + 1 + gape * 0.3, x + w * 0.3, y + 2 + gape * 0.5, x + w * 1.15, y + 3 + gape, x + w * 0.2, y + 7 + gape, x - w * 0.8, y + 6], '#ff8a1f');
    return;
  }
  if (kind === 'snout') {
    ellipse(ctx, x + 4, y - 4, w * 1.25, w * 0.78, 0, mix(col.main, '#ffffff', 0.3));
    circle(ctx, x + 4 - w * 0.4, y - 6, 2.4, INK, 0);
    circle(ctx, x + 4 + w * 0.4, y - 6, 2.4, INK, 0);
    if (open) openMouth(ctx, x + 4, y + w * 0.55, w * 0.9, 9);
    else {
      ctx.strokeStyle = INK;
      ctx.lineWidth = LW * 0.85;
      ctx.beginPath();
      ctx.moveTo(x + 4 - w * 0.9, y + w * 0.72);
      ctx.quadraticCurveTo(x + 4, y + w * 1.15, x + 4 + w * 0.9, y + w * 0.72);
      ctx.stroke();
    }
    return;
  }
  if (mood === 'hit') {
    ellipse(ctx, x, y + 3, w * 0.4, w * 0.5, 0, MOUTH_IN);
    return;
  }
  if (mood === 'dizzy') {
    ctx.strokeStyle = INK;
    ctx.lineWidth = LW * 0.85;
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const px = x - w + (i / 8) * w * 2;
      const py = y + (i % 2 ? 3 : -2);
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.stroke();
    return;
  }
  if (open) {
    openMouth(ctx, x, y - 2, w * 1.05, w * 1.05);
    if (kind === 'fangs' || kind === 'grin' || kind === 'buck') {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + s * w * 0.55 - 3, y - 2);
        ctx.lineTo(x + s * w * 0.55 + 3, y - 2);
        ctx.lineTo(x + s * w * 0.55, y + 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    return;
  }
  switch (kind) {
    case 'grin': {
      const shape = () => {
        ctx.beginPath();
        ctx.moveTo(x - w * 1.2, y - 4);
        ctx.quadraticCurveTo(x, y - 1, x + w * 1.2, y - 4);
        ctx.quadraticCurveTo(x + w, y + w * 0.95, x, y + w * 0.95);
        ctx.quadraticCurveTo(x - w, y + w * 0.95, x - w * 1.2, y - 4);
        ctx.closePath();
      };
      shape();
      ctx.fillStyle = MOUTH_IN;
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - w * 1.3, y - 6, w * 2.6, 7);
      ctx.strokeStyle = 'rgba(42,22,54,0.35)';
      ctx.lineWidth = 1.5;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * w * 0.4, y - 6);
        ctx.lineTo(x + i * w * 0.4, y + 1);
        ctx.stroke();
      }
      ellipse(ctx, x + 2, y + w * 1.0, w * 0.6, w * 0.4, 0, TONGUE, 0);
      ctx.restore();
      shape();
      ctx.lineWidth = LW;
      ctx.strokeStyle = INK;
      ctx.stroke();
      break;
    }
    case 'tongue':
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x + w * 0.05, y + 2);
      ctx.quadraticCurveTo(x + w * 0.1, y + 13 + Math.sin(t * 3) * 1.5, x + w * 0.55, y + 12 + Math.sin(t * 3) * 1.5);
      ctx.quadraticCurveTo(x + w * 0.95, y + 10, x + w * 0.75, y + 1);
      ctx.closePath();
      ctx.fillStyle = TONGUE;
      ctx.fill();
      ctx.lineWidth = LW * 0.8;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = INK;
      ctx.lineWidth = LW * 0.9;
      ctx.beginPath();
      ctx.moveTo(x - w, y - 2);
      ctx.quadraticCurveTo(x, y + 6, x + w, y - 2);
      ctx.stroke();
      break;
    case 'oh':
      ellipse(ctx, x, y + 2, w * 0.45, w * 0.55 + Math.sin(t * 2.5) * 0.8, 0, MOUTH_IN);
      break;
    case 'fangs':
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = INK;
      ctx.lineWidth = LW * 0.6;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + s * w * 0.5 - 3.5, y + 1);
        ctx.lineTo(x + s * w * 0.5 + 3.5, y + 1.6);
        ctx.lineTo(x + s * w * 0.5, y + 9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.lineWidth = LW * 0.9;
      ctx.beginPath();
      ctx.moveTo(x - w * 1.05, y - 3);
      ctx.quadraticCurveTo(x, y + 5, x + w * 1.05, y - 3);
      ctx.stroke();
      break;
    case 'buck':
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = INK;
      ctx.lineWidth = LW * 0.6;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.rect(x + (s < 0 ? -6.5 : 0.5), y + 1, 6, 9);
        ctx.fill();
        ctx.stroke();
      }
      ctx.lineWidth = LW * 0.9;
      ctx.beginPath();
      ctx.moveTo(x - w, y - 2);
      ctx.quadraticCurveTo(x, y + 4, x + w, y - 2);
      ctx.stroke();
      break;
    case 'wavy':
      ctx.strokeStyle = INK;
      ctx.lineWidth = LW * 0.9;
      ctx.beginPath();
      ctx.moveTo(x - w * 1.1, y);
      ctx.bezierCurveTo(x - w * 0.6, y - 7, x - w * 0.3, y + 7, x, y);
      ctx.bezierCurveTo(x + w * 0.3, y - 7, x + w * 0.6, y + 7, x + w * 1.1, y);
      ctx.stroke();
      break;
    default: // smile with one little tooth
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = INK;
      ctx.lineWidth = LW * 0.55;
      ctx.beginPath();
      ctx.rect(x + w * 0.2, y + 2.5, 5, 5);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = LW * 0.9;
      ctx.beginPath();
      ctx.moveTo(x - w, y - 3);
      ctx.quadraticCurveTo(x, y + 7, x + w, y - 3);
      ctx.stroke();
  }
}

// ---------- tops: horns and ears (drawn behind the body) ----------

function drawTop(ctx, kind, g, col, t) {
  const top = (x) => topAt(g, x);
  switch (kind) {
    case 'nubs':
      for (const s of [-1, 1]) {
        const x = s * 18 + 3;
        const y = top(x) + 8;
        blob(ctx, [x - 8, y, x - 5 + s * 2, y - 14, x + s * 4, y - 22, x + 6 + s * 2, y - 13, x + 8, y], HORN);
      }
      break;
    case 'ram':
      for (const s of [-1, 1]) {
        const x = s * (halfWidthAt(g, g.top + 16) - 4);
        const y = top(x) + 10;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(s, 1);
        tube(ctx, [0, 0, 14, -10, 26, -4, 28, 10, 20, 18, 12, 12, 16, 4], 11, HORN);
        ctx.strokeStyle = HORN_DARK;
        ctx.lineWidth = 2;
        for (const [a, b2, c, d] of [[8, -8, 10, -2], [20, -8, 18, -1], [26, 4, 20, 4]]) {
          ctx.beginPath();
          ctx.moveTo(a, b2);
          ctx.lineTo(c, d);
          ctx.stroke();
        }
        ctx.restore();
      }
      break;
    case 'antennae':
      for (const s of [-1, 1]) {
        const x = s * 13 + 3;
        const y = top(x) + 6;
        const bob = Math.sin(t * 3 + s) * 3;
        const tx = x + s * 10 + bob;
        const ty = y - 34;
        tube(ctx, [x, y, x + s * 3, y - 16, tx, ty], 3.2, INK);
        circle(ctx, tx, ty, 7, col.spot);
        circle(ctx, tx - 2, ty - 2.5, 2, 'rgba(255,255,255,0.8)', 0);
      }
      break;
    case 'cat':
      for (const s of [-1, 1]) {
        const x = s * 24 + 3;
        const y = top(x) + 10;
        blob(ctx, [x - 15, y + 2, x - 6 + s * 2, y - 20, x + s * 6, y - 30, x + 10 + s * 2, y - 14, x + 15, y + 2], col.main);
        blob(ctx, [x - 7, y - 1, x - 2 + s * 2, y - 14, x + s * 5, y - 21, x + 6 + s, y - 10, x + 7, y - 1], TONGUE, 0);
      }
      break;
    case 'floppy':
      for (const s of [-1, 1]) {
        const x = s * 24 + 3;
        const y = top(x) + 10;
        const sw = Math.sin(t * 2.4 + s) * 0.08;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(s, 1);
        ctx.rotate(-1.05 - sw);
        blob(ctx, [-10, 4, -6, -10, 8, -12, 16, 6, 14, 40, 6, 54, -4, 46, -10, 24], col.main);
        blob(ctx, [-4, 2, 3, -5, 9, 8, 8, 36, 3, 44, -3, 30], col.belly, 0);
        ctx.restore();
      }
      break;
    case 'mohawk': {
      const xs = [-16, -5, 7, 19];
      xs.forEach((x, i) => {
        const y = top(x) + 8;
        const h = [16, 22, 24, 18][i];
        blob(ctx, [x - 7, y, x - 2, y - h * 0.7, x + 3, y - h, x + 6, y - h * 0.5, x + 8, y], col.spot);
      });
      break;
    }
    case 'unihorn': {
      const x = 5;
      const y = top(x) + 10;
      const horn = () => {
        ctx.beginPath();
        ctx.moveTo(x - 13, y + 2);
        ctx.quadraticCurveTo(x - 9, y - 22, x + 1, y - 38);
        ctx.quadraticCurveTo(x + 9, y - 22, x + 13, y + 2);
        ctx.closePath();
      };
      horn();
      ctx.fillStyle = GOLD;
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = '#e8a817';
      ctx.lineWidth = 3;
      for (const k of [0.22, 0.45, 0.66]) {
        ctx.beginPath();
        ctx.moveTo(x - 14, y - 38 * k + 4);
        ctx.lineTo(x + 14, y - 38 * k - 3);
        ctx.stroke();
      }
      ctx.restore();
      horn();
      ctx.lineWidth = LW;
      ctx.strokeStyle = INK;
      ctx.lineJoin = 'round';
      ctx.stroke();
      break;
    }
    case 'sprout': {
      const x = 3;
      const y = top(x) + 6;
      const sw = Math.sin(t * 2) * 3;
      tube(ctx, [x, y, x + 1, y - 10, x + sw * 0.5, y - 18], 3, '#3f9e3a');
      for (const s of [-1, 1]) {
        const lx = x + sw * 0.5;
        const ly = y - 18;
        blob(ctx, [lx, ly, lx + s * 8, ly - 10, lx + s * 20, ly - 8, lx + s * 14, ly + 1], '#7fdc4a');
      }
      break;
    }
    case 'palm': {
      const x = 2;
      const y = top(x) + 6;
      const sw = Math.sin(t * 1.8) * 2;
      tube(ctx, [x, y, x - 3, y - 14, x + sw, y - 30], 6, '#b07a4a');
      const cx = x + sw;
      const cy = y - 31;
      for (const a of [-2.6, -1.95, -1.2, -0.5, 0.15]) {
        const ex = cx + Math.cos(a) * 24;
        const ey = cy + Math.sin(a) * 16 + 8;
        blob(ctx, [cx, cy, cx + Math.cos(a - 0.25) * 14, cy + Math.sin(a - 0.25) * 12 - 3, ex, ey, cx + Math.cos(a + 0.25) * 12, cy + Math.sin(a + 0.25) * 9 + 1], '#4cc85a', LW * 0.75);
      }
      circle(ctx, cx - 4, cy + 4, 4.5, '#7a4a2a', LW * 0.6);
      circle(ctx, cx + 4, cy + 5, 4.5, '#7a4a2a', LW * 0.6);
      break;
    }
    case 'crest': {
      const x = 0;
      const y = top(x) + 8;
      const sw = Math.sin(t * 2.6) * 2;
      const feathers = [[-0.6, 30], [-0.25, 34], [0.1, 28]];
      for (const [a, len] of feathers) {
        const ex = x - Math.sin(-a) * len * 0.2 - len * 0.55 + sw;
        const ey = y - len;
        blob(ctx, [x - 4, y, x - 8 + a * 10, y - len * 0.5, ex, ey, x + 5 + a * 6, y - len * 0.45, x + 5, y], col.spot === '#ffffff' ? '#ff7ab8' : col.spot, LW * 0.85);
      }
      break;
    }
    default:
  }
}

// ---------- arms ----------

function drawArm(ctx, kind, side, x, y, col, t, attack) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(side, 1);
  const front = side > 0;
  const sway = Math.sin(t * 2.6 + (front ? 0 : 1.6)) * 0.1;
  ctx.rotate(sway - (front ? attack * 0.9 : 0));
  switch (kind) {
    case 'stubby':
      blob(ctx, [-4, -8, 9, -9, 19, -3, 21, 7, 14, 12, 3, 10, -4, 5], col.main);
      break;
    case 'muscle':
      blob(ctx, [-6, -14, 10, -18, 24, -12, 29, 0, 27, 12, 30, 18, 36, 26, 33, 36, 22, 38, 16, 30, 12, 20, 2, 12, -6, 8], col.main);
      circle(ctx, 30, 38, 11, mix(col.main, '#ffffff', 0.15));
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(26, 30);
      ctx.lineTo(27, 37);
      ctx.moveTo(32, 30);
      ctx.lineTo(33, 37);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(14, -4, 9, Math.PI * 1.1, Math.PI * 1.6);
      ctx.stroke();
      break;
    case 'noodle': {
      const w = Math.sin(t * 3.2 + side) * 5;
      tube(ctx, [-2, 0, 14, 2 + w, 24, 14 - w, 26, 28 + w * 0.5], 7, col.main);
      circle(ctx, 26, 31 + w * 0.5, 6.5, col.main);
      break;
    }
    case 'pincers': {
      tube(ctx, [-2, 0, 10, 6, 18, 14], 9, col.main);
      const open = 0.35 + Math.sin(t * 4) * 0.12 + attack * 0.3;
      ctx.translate(22, 18);
      ctx.save();
      ctx.rotate(-open);
      blob(ctx, [-6, 2, -2, -10, 10, -14, 20, -8, 14, -4, 4, -2], mix(col.main, '#ff5a3c', 0.25));
      ctx.restore();
      ctx.save();
      ctx.rotate(open * 0.6);
      blob(ctx, [-6, -2, 2, 8, 14, 10, 20, 4, 12, 1, 2, 0], mix(col.main, '#ff5a3c', 0.25));
      ctx.restore();
      break;
    }
    case 'tiny':
      tube(ctx, [-2, 0, 6, 4, 10, 8], 6, col.main);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(11, 9);
      ctx.lineTo(14, 13);
      ctx.moveTo(9, 11);
      ctx.lineTo(10, 15);
      ctx.stroke();
      break;
    case 'flippers':
      blob(ctx, [-4, -6, 12, -4, 28, 8, 32, 20, 22, 18, 8, 10, -3, 6], mix(col.main, col.dark, 0.35));
      break;
    default:
  }
  ctx.restore();
}

// ---------- legs ----------

function drawLegs(ctx, kind, g, col, t, lift) {
  const by = g.bottom - 6; // where legs leave the body
  const gy = lift; // ground, relative to the body which is lifted by `lift`
  const hx = Math.max(16, halfWidthAt(g, by - 6) * 0.5);
  const foot = mix(col.main, col.dark, 0.25);
  switch (kind) {
    case 'stubby':
      for (const s of [-1, 1]) {
        const x = s * hx + 2;
        blob(ctx, [x - 9, by - 4, x + 9, by - 4, x + 10, gy - 6, x + 14 + s * 0, gy - 1, x + 13, gy + 1, x - 11, gy + 1, x - 12, gy - 4, x - 9, gy - 8], foot);
      }
      break;
    case 'bigfeet':
      for (const s of [-1, 1]) {
        const x = s * hx;
        blob(ctx, [x - 7, by - 4, x + 7, by - 4, x + 8, gy - 6, x - 8, gy - 6], foot);
        blob(ctx, [x - 14, gy - 10, x + 2, gy - 14, x + 22, gy - 10, x + 28, gy - 3, x + 20, gy + 1, x - 12, gy + 1, x - 17, gy - 4], foot);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 17, gy - 9);
        ctx.lineTo(x + 18, gy - 4);
        ctx.moveTo(x + 22, gy - 8);
        ctx.lineTo(x + 23, gy - 3);
        ctx.stroke();
      }
      break;
    case 'tentacles':
      [-1.3, -0.45, 0.45, 1.3].forEach((k, i) => {
        const x = k * hx * 0.9;
        const w = Math.sin(t * 3 + i * 1.7) * 4;
        const s = k < 0 ? -1 : 1;
        tube(ctx, [x, by - 6, x + s * 4 + w, gy - 6, x + s * 14 + w, gy - 2, x + s * 18, gy - 10], 9, mix(col.main, col.dark, 0.2));
      });
      break;
    case 'wheels': {
      for (const s of [-1, 1]) {
        const x = s * hx * 1.05;
        const r = 12;
        const cy = gy - r;
        tube(ctx, [x, by - 4, x, cy], 6, '#9aa3b5');
        circle(ctx, x, cy, r, '#3a3550');
        circle(ctx, x, cy, r * 0.55, col.spot === '#ffffff' ? '#ffd23f' : col.spot, LW * 0.6);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        for (let k = 0; k < 3; k++) {
          const a = t * 6 + (k * TAU) / 3;
          ctx.beginPath();
          ctx.moveTo(x, cy);
          ctx.lineTo(x + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55);
          ctx.stroke();
        }
      }
      break;
    }
    case 'springs':
      for (const s of [-1, 1]) {
        const x = s * hx;
        const pts = [];
        const n = 7;
        for (let i = 0; i <= n; i++) {
          const y = by - 4 + ((gy - 6 - (by - 4)) * i) / n;
          pts.push(x + (i === 0 || i === n ? 0 : i % 2 ? 7 : -7), y);
        }
        ctx.lineJoin = 'round';
        ctx.beginPath();
        pts.forEach((v, i) => (i % 2 ? 0 : i ? ctx.lineTo(v, pts[i + 1]) : ctx.moveTo(v, pts[i + 1])));
        ctx.lineWidth = 4 + LW * 2;
        ctx.strokeStyle = INK;
        ctx.stroke();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#c9d2e6';
        ctx.stroke();
        ellipse(ctx, x + 3, gy - 4, 12, 5, 0, foot);
      }
      break;
    case 'duck':
      for (const s of [-1, 1]) {
        const x = s * hx * 0.8;
        tube(ctx, [x, by - 4, x + 1, gy - 4], 4, '#ff9a2e');
        blob(ctx, [x - 6, gy - 5, x + 4, gy - 7, x + 18, gy - 3, x + 16, gy + 1, x - 8, gy + 1], '#ffa83a', LW * 0.85);
      }
      break;
    default: // hover: a soft glow under the body
      break;
  }
}

// ---------- backs: tails, wings, shells (drawn behind the body) ----------

function drawBack(ctx, kind, g, col, t, flap) {
  const wingY = g.top + (g.bottom - g.top) * 0.42;
  const hw = halfWidthAt(g, wingY);
  switch (kind) {
    case 'wings':
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(s * (hw - 10), wingY);
        ctx.scale(s, 1);
        ctx.rotate(-0.15 - flap * 0.35);
        blob(ctx, [0, 6, 6, -14, 22, -32, 40, -40, 52, -36, 48, -26, 56, -20, 48, -10, 52, -2, 36, 2, 18, 8], col.belly);
        ctx.strokeStyle = 'rgba(42,22,54,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(14, -6);
        ctx.quadraticCurveTo(30, -18, 44, -24);
        ctx.moveTo(18, 2);
        ctx.quadraticCurveTo(34, -6, 46, -8);
        ctx.stroke();
        ctx.restore();
      }
      break;
    case 'batwings':
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(s * (hw - 10), wingY);
        ctx.scale(s, 1);
        ctx.rotate(-0.1 - flap * 0.35);
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.lineTo(12, -24);
        ctx.quadraticCurveTo(34, -40, 58, -30);
        ctx.quadraticCurveTo(52, -18, 56, -6);
        ctx.quadraticCurveTo(44, -10, 38, 2);
        ctx.quadraticCurveTo(28, -4, 20, 8);
        ctx.quadraticCurveTo(10, 2, 0, 4);
        ctx.closePath();
        ctx.fillStyle = mix(col.dark, '#2a1636', 0.25);
        ctx.fill();
        ctx.lineWidth = LW;
        ctx.strokeStyle = INK;
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.restore();
      }
      break;
    case 'fluffy': {
      const sw = Math.sin(t * 2.2) * 3;
      const bx = -halfWidthAt(g, g.bottom - 30) + 4;
      const pts = [[bx - 6, -34, 13], [bx - 18 + sw * 0.5, -46, 14], [bx - 22 + sw, -62, 13], [bx - 12 + sw, -72, 11]];
      ctx.lineWidth = LW * 2;
      ctx.strokeStyle = INK;
      for (const [x, y, r] of pts) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.stroke();
      }
      ctx.fillStyle = col.belly;
      for (const [x, y, r] of pts) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
      }
      break;
    }
    case 'spiketail': {
      const sw = Math.sin(t * 2) * 3;
      const bx = -halfWidthAt(g, g.bottom - 16) + 10;
      const spikes = [[bx - 16, -27], [bx - 32 + sw * 0.4, -30], [bx - 46 + sw, -38]];
      for (const [x, y] of spikes) blob(ctx, [x - 7, y + 2, x - 3, y - 12, x + 7, y + 1], col.spot, LW * 0.8);
      blob(ctx, [bx + 6, -30, bx - 16, -24, bx - 34 + sw * 0.4, -28, bx - 52 + sw, -42, bx - 58 + sw, -36, bx - 44 + sw * 0.6, -16, bx - 18, -6, bx + 6, -6], col.main);
      break;
    }
    case 'fishtail': {
      const sw = Math.sin(t * 3) * 0.15;
      const bx = -halfWidthAt(g, g.bottom - 20) + 6;
      ctx.save();
      ctx.translate(bx - 10, -24);
      ctx.rotate(-0.5 + sw);
      blob(ctx, [10, 4, -10, -2, -26, -18, -30, -6, -22, 2, -30, 12, -26, 22, -10, 8], mix(col.main, col.spot, 0.35));
      ctx.restore();
      break;
    }
    case 'shell': {
      const cy = g.top + (g.bottom - g.top) * 0.52;
      const rx = g.maxW + 10;
      const ry = (g.bottom - g.top) * 0.5 + 6;
      ellipse(ctx, -12, cy, rx, ry, 0, '#7cc95e');
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(-12, cy, rx, ry, 0, 0, TAU);
      ctx.clip();
      ctx.strokeStyle = '#4d9a3c';
      ctx.lineWidth = 4;
      for (const [x, y] of [[-rx * 0.85, cy - ry * 0.35], [-rx * 0.85, cy + ry * 0.35], [-rx * 0.45, cy - ry * 0.85]]) {
        ctx.beginPath();
        ctx.arc(x - 12, y, 16, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'gatortail': {
      const sw = Math.sin(t * 1.8) * 3;
      const bx = -halfWidthAt(g, g.bottom - 14) + 10;
      blob(ctx, [bx + 6, -32, bx - 20, -26, bx - 52, -14 + sw * 0.4, bx - 74, -6 + sw, bx - 56, -2, bx - 20, -2, bx + 6, -6], mix(col.main, col.dark, 0.3));
      ctx.fillStyle = mix(col.dark, INK, 0.2);
      for (const k of [0.25, 0.48, 0.7]) {
        const x = bx - 74 * k;
        const y = -26 + 20 * k + sw * k;
        ctx.beginPath();
        ctx.moveTo(x - 5, y + 2);
        ctx.lineTo(x, y - 6);
        ctx.lineTo(x + 5, y + 2);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    default:
  }
}

// ---------- evolution extras ----------

function drawRidge(ctx, g, col) {
  // three soft spikes peeking up behind the head
  for (const [x, h] of [[-22, 14], [-6, 18], [12, 12]]) {
    const y = topAt(g, x) + 6;
    blob(ctx, [x - 9, y + 4, x - 3, y - h, x + 2, y - h - 2, x + 9, y + 4], mix(col.dark, col.spot, 0.3), LW * 0.9);
  }
}

function drawCrown(ctx, g, t) {
  const y = topAt(g, 4) - 4;
  const x = 6;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.12);
  ctx.beginPath();
  ctx.moveTo(-16, 0);
  ctx.lineTo(-18, -18);
  ctx.lineTo(-8, -9);
  ctx.lineTo(0, -22);
  ctx.lineTo(8, -9);
  ctx.lineTo(18, -18);
  ctx.lineTo(16, 0);
  ctx.closePath();
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.lineWidth = LW * 0.9;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.stroke();
  circle(ctx, 0, -7, 3.5, '#ff4f8a', 2);
  const tw = 0.5 + 0.5 * Math.sin(t * 4);
  ctx.fillStyle = `rgba(255,255,255,${0.5 + tw * 0.5})`;
  sparkle(ctx, 14, -22, 3 + tw * 2);
  ctx.restore();
}

function sparkle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

function drawAura(ctx, g, el, t) {
  const c = { sun: '255,190,60', ice: '150,230,255', wave: '80,150,255' }[el] || '255,255,255';
  const cy = (g.top + g.bottom) / 2;
  const r = (g.bottom - g.top) * 0.85 + Math.sin(t * 3) * 4;
  const gr = ctx.createRadialGradient(0, cy, r * 0.3, 0, cy, r);
  gr.addColorStop(0, `rgba(${c},0.55)`);
  gr.addColorStop(1, `rgba(${c},0)`);
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.arc(0, cy, r, 0, TAU);
  ctx.fill();
}

export function drawStarShape(ctx, x, y, r, fill = '#ffe14d', lw = 2) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.5 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
}

// ---------- the whole monster ----------

// look: a monster or species ({ parts, stage?, seed? }).
// opts: { pose: 'idle'|'attack'|'hit'|'dizzy'|'happy', p: 0..1 (how far into the pose),
//         t: seconds, face: 1 (right) | -1 (left), stage, shadow: bool, aura: bool }
// (x, y) is the point on the ground under the monster; size is the height of 140 units in px.
export function drawMonster(ctx, look, x, y, size, opts = {}) {
  const parts = look.parts || look;
  const stage = opts.stage != null ? opts.stage : look.stage || 0;
  const seed = ((look.seed || 7) % 1000) / 37;
  const t = (opts.t || 0) + seed;
  const pose = opts.pose || 'idle';
  const p = opts.p == null ? 1 : opts.p;
  const face = opts.face || 1;
  const col = partDef('colour', parts.colour);
  const g = bodyGeom(parts.body);
  const faceDef = g.def.face;
  const k = (size / UNIT_H) * (1 + 0.12 * stage);
  const lift = LIFT[parts.legs] || 0;
  const hover = parts.legs === 'hover';

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k * face, k);

  // shadow on the ground
  if (opts.shadow !== false) {
    ctx.fillStyle = 'rgba(20,10,40,0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 0, g.maxW * (hover ? 0.7 : 0.95), 7, 0, 0, TAU);
    ctx.fill();
  }

  // pose: where the body sits and how it leans
  let dx = 0;
  let dy = -lift;
  let rot = 0;
  let sx = 1;
  let sy = 1;
  let attack = 0;
  let mood = pose;
  const breath = Math.sin(t * 3);
  if (pose === 'idle') {
    sy = 1 + breath * 0.025;
    sx = 1 - breath * 0.018;
    if (hover) dy += Math.sin(t * 2.4) * 3;
    if (parts.legs === 'springs') dy += Math.abs(Math.sin(t * 3.2)) * -3;
  } else if (pose === 'attack') {
    attack = Math.sin(Math.min(1, p) * Math.PI);
    dx = attack * 26;
    rot = attack * 0.14;
    sx = 1 + attack * 0.06;
    sy = 1 - attack * 0.05;
  } else if (pose === 'hit') {
    const a = Math.sin(Math.min(1, p) * Math.PI);
    dx = -a * 14 + Math.sin(t * 50) * a * 2;
    rot = -a * 0.16;
    sx = 1 - a * 0.05;
    sy = 1 + a * 0.04;
  } else if (pose === 'dizzy') {
    rot = Math.sin(t * 2.2) * 0.12;
    sy = 0.94;
    sx = 1.04;
    dy += 2;
  } else if (pose === 'happy') {
    const hop = Math.abs(Math.sin(t * 6));
    dy -= hop * 14;
    sy = 1 + (hop - 0.5) * 0.06;
    sx = 1 - (hop - 0.5) * 0.04;
  }
  const flap = parts.back === 'wings' || parts.back === 'batwings' ? (Math.sin(t * (pose === 'idle' ? 6 : 10)) + 1) / 2 : 0;

  if (stage >= 2 && opts.aura !== false) drawAura(ctx, g, parts.element, t);
  if (hover) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, -6, g.maxW * 0.55, 6, 0, 0, TAU);
    ctx.fill();
  }

  ctx.translate(dx, dy);
  // rotate and squash about the middle of the bottom
  ctx.rotate(rot);
  ctx.scale(sx, sy);

  drawBack(ctx, parts.back, g, col, t, flap);
  if (stage >= 1) drawRidge(ctx, g, col);
  drawLegs(ctx, parts.legs, g, col, t, lift);
  drawTop(ctx, parts.top, g, col, t);
  // arms on the far side go behind the body
  const armY = g.def.arm;
  const ax = halfWidthAt(g, armY) - 5;

  // the body: darker crescent underneath, pattern, shine, outline
  ctx.save();
  clipBody(ctx, g);
  ctx.fillStyle = col.dark;
  fillBody(ctx, g);
  ctx.save();
  ctx.translate(-5, -7);
  ctx.scale(0.985, 0.985);
  ctx.fillStyle = col.main;
  fillBody(ctx, g);
  ctx.restore();
  drawPattern(ctx, g, parts.pattern, col, faceDef);
  // cheeks
  ctx.fillStyle = 'rgba(255,90,140,0.28)';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(5 + s * (faceDef.gap + 13), faceDef.y + 13, 7, 4.5, 0, 0, TAU);
    ctx.fill();
  }
  // shine
  const shX = -g.maxW * 0.45;
  const shY = g.top + (g.bottom - g.top) * 0.18;
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(shX, shY + 6, 9, 5, -0.7, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(shX + 9, shY - 2, 2.8, 0, TAU);
  ctx.fill();
  ctx.restore();
  strokeBody(ctx, g);

  // face
  const period = 3.4 + (seed % 2);
  const blink = pose === 'idle' && (t % period) > period - 0.14 ? 1 : 0;
  drawEyes(ctx, parts.eyes, g, faceDef, col, t, seed, mood, blink);
  drawMouth(ctx, parts.mouth, faceDef, col, t, mood);

  drawArm(ctx, parts.arms, -1, -ax, armY, col, t, 0);
  drawArm(ctx, parts.arms, 1, ax, armY, col, t, attack);

  if (stage >= 2) drawCrown(ctx, g, t);

  ctx.restore();

  if (pose === 'dizzy') {
    const hy = -headroom(parts, stage) * k - size * 0.02;
    for (let i = 0; i < 3; i++) {
      const a = t * 3 + (i * TAU) / 3;
      drawStarShape(ctx, x + Math.cos(a) * size * 0.22, y + hy + Math.sin(a) * size * 0.05, size * 0.05, '#ffe14d', Math.max(1, size * 0.008));
    }
  }
}

// ---------- cached still pictures (for grids of many monsters) ----------

const stillCache = new Map();
const STILL_MAX = 400;

export const lookKey = (look) => {
  const p = look.parts || look;
  return `${p.body}.${p.colour}.${p.pattern}.${p.eyes}.${p.mouth}.${p.top}.${p.arms}.${p.legs}.${p.back}.${p.element}.${look.stage || 0}`;
};

// A still monster (idle, no blink) drawn into a canvas once and reused. silhouette: a colour
// to fill the whole shape with instead (for monsters not found yet).
export function drawMonsterStill(ctx, look, x, y, size, { silhouette = null, face = 1 } = {}) {
  if (typeof document === 'undefined') return;
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const key = `${lookKey(look)}|${Math.round(size)}|${dpr}|${silhouette || ''}|${face}`;
  let c = stillCache.get(key);
  if (!c) {
    const W = size * 1.7;
    const H = size * 1.55;
    c = document.createElement('canvas');
    c.width = Math.ceil(W * dpr);
    c.height = Math.ceil(H * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    drawMonster(g, { parts: look.parts || look, stage: look.stage || 0, seed: 1 }, W / 2, H * 0.92, size, { t: 0.3, face, shadow: !silhouette, aura: !silhouette });
    if (silhouette) {
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = silhouette;
      g.fillRect(0, 0, W, H);
    }
    c.box = { W, H };
    stillCache.set(key, c);
    if (stillCache.size > STILL_MAX) stillCache.delete(stillCache.keys().next().value);
  }
  ctx.drawImage(c, x - c.box.W / 2, y - c.box.H * 0.92, c.box.W, c.box.H);
}
