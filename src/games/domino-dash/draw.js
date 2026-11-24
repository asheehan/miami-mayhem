// Domino Dash drawing. Reads the state and never changes game rules; the only state kept here
// is cosmetic (particles, the cached paving pattern). The table is seen from above at a tilt:
// world (x, y, z) lands at (x, y * KY - z * KZ) before the view's scale and offset.
import {
  DOM_L, DOM_W, DOM_T, SPLIT_R, tiltOf, carrierPos, openEnds,
} from './sim.js';

export const KY = 0.8; // how much the table is squashed top to bottom by the tilt
export const KZ = 0.6; // how much of a thing's height shows

export const C = {
  night: '#2b1055',
  dusk: '#7a1fa2',
  pink: '#ff3d9a',
  orange: '#ff8a4c',
  sun: '#ffe14d',
  sea: '#0bb5c4',
  foam: '#c9fbff',
  ink: '#160b33',
  white: '#ffffff',
  cream: '#fff4dc',
  felt: '#1d7a5f',
  feltDark: '#145c47',
  feltLight: '#2a9472',
  wood: '#b8763c',
  woodDark: '#7a4a22',
  woodLight: '#dba25c',
  paver: '#c96f4a',
  paverDark: '#a4553a',
  grout: '#e8b48c',
  red: '#ff4b4b',
  green: '#3fe07a',
  greenDark: '#1f9c4c',
  brass: '#f2b632',
  brassDark: '#b07a12',
  coffee: '#5a2f17',
};

// Domino colours, unlocked by stars: { face, side, pip, edge }.
export const THEMES = [
  { name: 'Classic', stars: 0, face: '#fffaf0', side: '#e6d9bd', pip: '#1b1430', edge: '#3b2f22' },
  { name: 'Midnight', stars: 6, face: '#2a2540', side: '#191528', pip: '#ffffff', edge: '#0a0812' },
  { name: 'Flamingo', stars: 14, face: '#ff8cc0', side: '#e2609c', pip: '#ffffff', edge: '#7a1f4a' },
  { name: 'Ocean', stars: 22, face: '#3fd6e0', side: '#1ea2b8', pip: '#ffffff', edge: '#0a4f60' },
  { name: 'Sunshine', stars: 30, face: '#ffd84a', side: '#e8a91f', pip: '#3b1f00', edge: '#6b4000' },
  { name: 'Rainbow', stars: 40, rainbow: true, face: '#ffffff', side: '#dddddd', pip: '#ffffff', edge: '#1b1430' },
];
const RAINBOW = [['#ff5a5a', '#d63a3a'], ['#ff9f43', '#d97a1f'], ['#ffd84a', '#e0b020'], ['#4ed87a', '#2aa856'], ['#3fb8ff', '#1f8ad6'], ['#a77bff', '#7d52d9']];

export const font = (px, weight = 900) => `${weight} ${Math.round(px)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

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

export function drawStar(ctx, x, y, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.48 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? C.sun : 'rgba(22,11,51,0.3)';
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, r * 0.16);
  ctx.strokeStyle = filled ? C.ink : 'rgba(255,255,255,0.6)';
  ctx.stroke();
}

export function drawButton(ctx, b, fill = C.sun) {
  ctx.fillStyle = 'rgba(22,11,51,0.35)';
  roundRect(ctx, b.x, b.y + 5, b.w, b.h, b.h * 0.3);
  ctx.fill();
  ctx.fillStyle = fill;
  roundRect(ctx, b.x, b.y, b.w, b.h, b.h * 0.3);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  const hasIcon = !!b.glyph;
  const px = b.h * 0.42;
  ctx.font = font(px);
  let tw = ctx.measureText(b.label).width;
  const room = b.w * (hasIcon ? 0.66 : 0.86);
  let size = px;
  if (tw > room) {
    size = (px * room) / tw;
    ctx.font = font(size);
    tw = room;
  }
  const gw = hasIcon ? b.h * 0.5 : 0;
  const cx = b.x + b.w / 2 + gw / 2;
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.label, cx, b.y + b.h / 2 + 1);
  if (hasIcon) glyph(ctx, b.glyph, cx - tw / 2 - gw * 0.75, b.y + b.h / 2, b.h * 0.2, C.ink);
}

export function glyph(ctx, kind, cx, cy, s, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (kind === 'home') {
    ctx.beginPath();
    ctx.moveTo(cx - s * 1.05, cy - s * 0.05);
    ctx.lineTo(cx, cy - s);
    ctx.lineTo(cx + s * 1.05, cy - s * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx - s * 0.7, cy - s * 0.1, s * 1.4, s * 0.95);
  } else if (kind === 'back') {
    ctx.lineWidth = s * 0.42;
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.35, cy - s * 0.8);
    ctx.lineTo(cx - s * 0.45, cy);
    ctx.lineTo(cx + s * 0.35, cy + s * 0.8);
    ctx.stroke();
  } else if (kind === 'next' || kind === 'play') {
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.6, cy - s * 0.9);
    ctx.lineTo(cx + s * 0.85, cy);
    ctx.lineTo(cx - s * 0.6, cy + s * 0.9);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'restart') {
    ctx.lineWidth = s * 0.36;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.8, -Math.PI * 0.35, Math.PI * 1.25);
    ctx.stroke();
    const a = -Math.PI * 0.35;
    const ax = cx + Math.cos(a) * s * 0.8;
    const ay = cy + Math.sin(a) * s * 0.8;
    ctx.beginPath();
    ctx.moveTo(ax + s * 0.5, ay - s * 0.05);
    ctx.lineTo(ax - s * 0.2, ay - s * 0.55);
    ctx.lineTo(ax - s * 0.12, ay + s * 0.4);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'undo') {
    ctx.lineWidth = s * 0.36;
    ctx.beginPath();
    ctx.arc(cx + s * 0.1, cy + s * 0.15, s * 0.75, -Math.PI * 0.95, Math.PI * 0.55);
    ctx.stroke();
    const ax = cx + s * 0.1 - s * 0.75;
    const ay = cy + s * 0.05;
    ctx.beginPath();
    ctx.moveTo(ax - s * 0.5, ay - s * 0.15);
    ctx.lineTo(ax + s * 0.45, ay - s * 0.25);
    ctx.lineTo(ax, ay + s * 0.55);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'eraser') {
    ctx.translate(cx, cy);
    ctx.rotate(-0.6);
    ctx.fillStyle = '#ff8cc0';
    roundRect(ctx, -s * 1.1, -s * 0.5, s * 2.2, s, s * 0.25);
    ctx.fill();
    ctx.fillStyle = '#7aa8ff';
    roundRect(ctx, -s * 1.1, -s * 0.5, s * 0.8, s, s * 0.25);
    ctx.fill();
    ctx.lineWidth = s * 0.16;
    ctx.strokeStyle = colour;
    roundRect(ctx, -s * 1.1, -s * 0.5, s * 2.2, s, s * 0.25);
    ctx.stroke();
  } else if (kind === 'trash') {
    ctx.lineWidth = s * 0.22;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.75, cy - s * 0.45);
    ctx.lineTo(cx - s * 0.55, cy + s * 0.9);
    ctx.lineTo(cx + s * 0.55, cy + s * 0.9);
    ctx.lineTo(cx + s * 0.75, cy - s * 0.45);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.95, cy - s * 0.62);
    ctx.lineTo(cx + s * 0.95, cy - s * 0.62);
    ctx.moveTo(cx - s * 0.25, cy - s * 0.85);
    ctx.lineTo(cx + s * 0.25, cy - s * 0.85);
    ctx.moveTo(cx - s * 0.2, cy - s * 0.15);
    ctx.lineTo(cx - s * 0.15, cy + s * 0.6);
    ctx.moveTo(cx + s * 0.2, cy - s * 0.15);
    ctx.lineTo(cx + s * 0.15, cy + s * 0.6);
    ctx.stroke();
  } else if (kind === 'grid') {
    const g = s * 0.55;
    for (let i = -1; i <= 1; i += 2) for (let j = -1; j <= 1; j += 2) ctx.fillRect(cx + i * g * 0.9 - g * 0.4, cy + j * g * 0.9 - g * 0.4, g * 0.8, g * 0.8);
  } else if (kind === 'domino') {
    ctx.fillStyle = C.cream;
    roundRect(ctx, cx - s * 0.55, cy - s, s * 1.1, s * 2, s * 0.2);
    ctx.fill();
    ctx.lineWidth = s * 0.14;
    ctx.strokeStyle = colour;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.4, cy);
    ctx.lineTo(cx + s * 0.4, cy);
    ctx.stroke();
    ctx.fillStyle = colour;
    for (const [px, py] of [[0, -0.5], [-0.25, 0.3], [0.25, 0.7]]) {
      ctx.beginPath();
      ctx.arc(cx + px * s, cy + py * s, s * 0.13, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Square icon buttons: 'home', 'back', 'restart', 'undo', 'eraser', 'trash'. `on` lights it up.
export function drawIconButton(ctx, b) {
  ctx.fillStyle = b.on ? C.sun : 'rgba(22,11,51,0.35)';
  roundRect(ctx, b.x, b.y, b.w, b.h, b.w * 0.24);
  ctx.fill();
  ctx.lineWidth = b.on ? 4 : 2;
  ctx.strokeStyle = b.on ? C.ink : 'rgba(255,255,255,0.7)';
  ctx.stroke();
  ctx.globalAlpha = b.dim ? 0.35 : 1;
  glyph(ctx, b.icon, b.x + b.w / 2, b.y + b.h / 2, b.w * 0.3, b.on ? C.ink : C.white);
  ctx.globalAlpha = 1;
}

// A pointing finger with its tip at (x, y).
export function drawFinger(ctx, x, y, sc) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sc, sc);
  ctx.rotate(-0.35);
  ctx.fillStyle = C.white;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2.5;
  roundRect(ctx, -6, 0, 12, 30, 6);
  ctx.fill();
  ctx.stroke();
  roundRect(ctx, -13, 22, 28, 26, 10);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawLock(ctx, x, y, r) {
  ctx.lineWidth = r * 0.3;
  ctx.strokeStyle = C.white;
  ctx.beginPath();
  ctx.arc(x, y - r * 0.4, r * 0.55, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = C.white;
  roundRect(ctx, x - r * 0.85, y - r * 0.4, r * 1.7, r * 1.3, r * 0.25);
  ctx.fill();
}

function ell(ctx, x, y, rx, ry, fill, stroke, lw) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, TAU);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw || 1;
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------------------------
// Dominoes
// ---------------------------------------------------------------------------------------------

const PIPS = {
  0: [],
  1: [[0.5, 0.5]],
  2: [[0.27, 0.27], [0.73, 0.73]],
  3: [[0.27, 0.27], [0.5, 0.5], [0.73, 0.73]],
  4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]],
  5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]],
  6: [[0.27, 0.25], [0.27, 0.5], [0.27, 0.75], [0.73, 0.25], [0.73, 0.5], [0.73, 0.75]],
};
const LIGHT = (() => {
  const v = [-0.35, 0.45, 0.82];
  const l = Math.hypot(...v);
  return v.map((k) => k / l);
})();
const SHADOW_X = 0.55; // a thing of height z casts its shadow this far right and up the table
const SHADOW_Y = -0.3;
const FACES = [
  // corner indices (iu * 4 + iv * 2 + iz) and which normal
  { c: [4, 6, 7, 5], n: 'front' },
  { c: [0, 2, 3, 1], n: 'back' },
  { c: [1, 3, 7, 5], n: 'top' },
  { c: [2, 6, 7, 3], n: 'side+' },
  { c: [0, 4, 5, 1], n: 'side-' },
];
const SC = new Float64Array(16); // screen corners, x y pairs
const GC = new Float64Array(16); // shadow corners on the table

function hull(pts, n) {
  const p = [];
  for (let i = 0; i < n; i++) p.push([pts[i * 2], pts[i * 2 + 1]]);
  p.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const up = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

function corners(x, y, dir, tilt, lift) {
  const th = tilt * DEG;
  const c = Math.cos(th);
  const s = Math.sin(th);
  const ux = Math.cos(dir);
  const uy = Math.sin(dir);
  for (let iu = 0; iu < 2; iu++) {
    const uu = iu ? 0 : -DOM_T;
    for (let iv = 0; iv < 2; iv++) {
      const v = iv ? DOM_W / 2 : -DOM_W / 2;
      for (let iz = 0; iz < 2; iz++) {
        const z = iz ? DOM_L : 0;
        const u2 = DOM_T / 2 + uu * c + z * s;
        const z2 = -uu * s + z * c + lift;
        const wx = x + u2 * ux - v * uy;
        const wy = y + u2 * uy + v * ux;
        const i = (iu * 4 + iv * 2 + iz) * 2;
        SC[i] = wx;
        SC[i + 1] = wy * KY - z2 * KZ;
        GC[i] = wx + z2 * SHADOW_X;
        GC[i + 1] = (wy + z2 * SHADOW_Y) * KY;
      }
    }
  }
  return { c, s, ux, uy };
}

export function drawDominoShadow(ctx, x, y, dir, tilt, lift = 0) {
  corners(x, y, dir, tilt, lift);
  const h = hull(GC, 8);
  ctx.beginPath();
  ctx.moveTo(h[0][0], h[0][1]);
  for (let i = 1; i < h.length; i++) ctx.lineTo(h[i][0], h[i][1]);
  ctx.closePath();
  ctx.fill();
}

function faceNormal(n, c, s, ux, uy) {
  if (n === 'front') return [c * ux, c * uy, -s];
  if (n === 'back') return [-c * ux, -c * uy, s];
  if (n === 'top') return [s * ux, s * uy, c];
  if (n === 'side+') return [-uy, ux, 0];
  return [uy, -ux, 0];
}

// One domino as a little box, tipped `tilt` degrees over its front edge towards `dir`.
// opts: { theme, pips: [a, b], id, start (gold rim), lift (raised off the table), glow }
export function drawDomino(ctx, x, y, dir, tilt, opts) {
  const th = opts.theme || THEMES[0];
  let face = th.face;
  let side = th.side;
  if (th.rainbow) [face, side] = RAINBOW[(opts.id || 0) % RAINBOW.length];
  const { c, s, ux, uy } = corners(x, y, dir, tilt, opts.lift || 0);
  for (const f of FACES) {
    const N = faceNormal(f.n, c, s, ux, uy);
    const vis = N[1] * KZ + N[2] * KY;
    if (vis <= 0.02) continue;
    const big = f.n === 'front' || f.n === 'back';
    const [a, b, cc, d] = f.c;
    ctx.beginPath();
    ctx.moveTo(SC[a * 2], SC[a * 2 + 1]);
    ctx.lineTo(SC[b * 2], SC[b * 2 + 1]);
    ctx.lineTo(SC[cc * 2], SC[cc * 2 + 1]);
    ctx.lineTo(SC[d * 2], SC[d * 2 + 1]);
    ctx.closePath();
    ctx.fillStyle = big ? face : side;
    ctx.fill();
    const lit = N[0] * LIGHT[0] + N[1] * LIGHT[1] + N[2] * LIGHT[2];
    const dark = clamp(0.3 - lit * 0.45, 0, 0.42);
    if (dark > 0.02) {
      ctx.fillStyle = `rgba(20,10,30,${dark.toFixed(3)})`;
      ctx.fill();
    }
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = opts.start ? C.brassDark : th.edge;
    ctx.stroke();
    if (big && vis > 0.12) drawPipFace(ctx, f.n === 'front' ? [4, 6, 5] : [0, 2, 1], opts.pips || [0, 0], th, opts.start, dark);
  }
  if (opts.start) {
    // a gold band round the start domino so it stands out
    const top = FACES[2].c;
    ctx.beginPath();
    ctx.moveTo(SC[top[0] * 2], SC[top[0] * 2 + 1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(SC[top[i] * 2], SC[top[i] * 2 + 1]);
    ctx.closePath();
    ctx.fillStyle = C.sun;
    ctx.fill();
  }
}

function drawPipFace(ctx, [o, e1, e2], pips, th, start, dark) {
  const ox = SC[o * 2];
  const oy = SC[o * 2 + 1];
  ctx.save();
  ctx.transform((SC[e1 * 2] - ox) / DOM_W, (SC[e1 * 2 + 1] - oy) / DOM_W, (SC[e2 * 2] - ox) / DOM_L, (SC[e2 * 2 + 1] - oy) / DOM_L, ox, oy);
  // the line across the middle
  ctx.fillStyle = start ? C.brassDark : th.pip;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(1.6, DOM_L / 2 - 0.5, DOM_W - 3.2, 1);
  ctx.globalAlpha = 1;
  const half = DOM_L / 2;
  for (let k = 0; k < 2; k++) {
    for (const [px, py] of PIPS[pips[k]]) {
      ctx.beginPath();
      ctx.arc(1 + px * (DOM_W - 2), k * half + 1 + py * (half - 2), 1.65, 0, TAU);
      ctx.fill();
    }
  }
  if (dark > 0.2) {
    ctx.fillStyle = `rgba(20,10,30,${(dark * 0.5).toFixed(3)})`;
    ctx.fillRect(0, 0, DOM_W, DOM_L);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Things on the table. Each is drawn with its foot at (0, 0); heights go up the screen by KZ.
// ---------------------------------------------------------------------------------------------

function softShadow(ctx, rx, ry, dx = 4, dy = 3) {
  ell(ctx, dx, dy, rx, ry, 'rgba(10,30,20,0.3)');
}

export function drawCup(ctx, r, t) {
  const k = r / 38;
  softShadow(ctx, r * 1.05, r * 0.85 * KY, 6 * k, 6 * k);
  ell(ctx, 0, 0, r, r * KY, '#fdf8ef', C.ink, 1.5);
  ell(ctx, 0, 0, r * 0.72, r * 0.72 * KY, '#efe4d0');
  const cr = r * 0.48;
  const ht = 20 * k * KZ;
  // cup body
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, 0, cr * 0.82, cr * 0.82 * KY, 0, 0, Math.PI);
  ctx.lineTo(-cr, -ht);
  ctx.ellipse(0, -ht, cr, cr * KY, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // the little blue band of a Cuban cafecito cup
  ctx.strokeStyle = '#2f6fd6';
  ctx.lineWidth = 2.4 * k;
  ctx.beginPath();
  ctx.ellipse(0, -ht * 0.55, cr * 0.93, cr * 0.93 * KY, 0, 0.1, Math.PI - 0.1);
  ctx.stroke();
  // handle
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4.5 * k;
  ctx.beginPath();
  ctx.arc(cr * 1.05, -ht * 0.55, cr * 0.32, -1.3, 1.3);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5 * k;
  ctx.stroke();
  ell(ctx, 0, -ht, cr, cr * KY, '#ffffff', C.ink, 1.5);
  ell(ctx, 0, -ht + 0.5, cr * 0.82, cr * 0.82 * KY, C.coffee);
  ell(ctx, -cr * 0.15, -ht, cr * 0.45, cr * 0.3 * KY, '#c48a4c');
  // steam
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2.5 * k;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.6 + i / 3) % 1;
    const x0 = (i - 1) * cr * 0.4;
    ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.8;
    ctx.beginPath();
    for (let j = 0; j <= 8; j++) {
      const yy = -ht - 4 - (ph * 26 + j * 3) * k;
      ctx.lineTo(x0 + Math.sin(j * 0.8 + t * 3 + i) * 3 * k, yy);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function drawCat(ctx, r, t) {
  const k = r / 55;
  const breathe = 1 + Math.sin(t * 1.6) * 0.025;
  softShadow(ctx, r * 1.05, r * 0.9 * KY, 7 * k, 7 * k);
  ctx.save();
  ctx.scale(breathe, breathe);
  // curled body
  ell(ctx, 0, -6 * k, r, r * 0.86 * KY + 6 * k, '#f39a3d', C.ink, 2);
  // stripes
  ctx.strokeStyle = '#c96a1c';
  ctx.lineWidth = 5 * k;
  ctx.lineCap = 'round';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.arc(0, -6 * k, r * (0.55 + i * 0.08), -2.6 + i * 0.1, -1.6 + i * 0.1);
    ctx.stroke();
  }
  // tail wrapped round the front
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 13 * k;
  ctx.beginPath();
  ctx.ellipse(-4 * k, 0, r * 0.82, r * 0.6 * KY, 0, 0.2, 2.2);
  ctx.stroke();
  ctx.strokeStyle = '#f39a3d';
  ctx.lineWidth = 9.5 * k;
  ctx.stroke();
  // head tucked in
  const hx = r * 0.42;
  const hy = 6 * k;
  ctx.fillStyle = '#f39a3d';
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + s * 12 * k, hy - 12 * k);
    ctx.lineTo(hx + s * 19 * k, hy - 30 * k);
    ctx.lineTo(hx + s * 3 * k, hy - 18 * k);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ell(ctx, hx, hy, 21 * k, 17 * k, '#f39a3d', C.ink, 2);
  ell(ctx, hx, hy + 6 * k, 9 * k, 6 * k, '#ffd9a8');
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(hx + s * 8 * k, hy - 2 * k, 4 * k, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  ell(ctx, hx, hy + 3 * k, 2.6 * k, 2 * k, '#ff7eb6');
  ctx.restore();
  // Zzz
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.4 + i / 3) % 1;
    ctx.globalAlpha = Math.sin(ph * Math.PI);
    outlinedSmall(ctx, 'z', hx + 14 * k + ph * 26 * k, hy - 30 * k - ph * 40 * k, (10 + ph * 8) * k);
  }
  ctx.globalAlpha = 1;
}

function outlinedSmall(ctx, text, x, y, px) {
  ctx.font = font(px);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = px * 0.25;
  ctx.strokeStyle = C.ink;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = C.white;
  ctx.fillText(text, x, y);
}

export function drawPlanter(ctx, r, t) {
  const k = r / 45;
  softShadow(ctx, r * 1.1, r * 0.9 * KY, 10 * k, 10 * k);
  const ht = 26 * k * KZ;
  const pr = r * 0.78;
  ctx.fillStyle = '#c4572f';
  ctx.beginPath();
  ctx.ellipse(0, 0, pr * 0.8, pr * 0.8 * KY, 0, 0, Math.PI);
  ctx.lineTo(-pr, -ht);
  ctx.ellipse(0, -ht, pr, pr * KY, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ell(ctx, 0, -ht, pr, pr * KY, '#e0743f', C.ink, 1.8);
  ell(ctx, 0, -ht, pr * 0.8, pr * 0.8 * KY, '#5a3a22');
  // fronds
  const sway = Math.sin(t * 1.1) * 0.05;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + 0.3 + sway;
    const len = r * (0.95 + (i % 2) * 0.15);
    const ex = Math.cos(a) * len;
    const ey = Math.sin(a) * len * KY - ht - 16 * k;
    ctx.strokeStyle = '#1f7a2e';
    ctx.lineWidth = 9 * k;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -ht - 8 * k);
    ctx.quadraticCurveTo(ex * 0.5, ey - 14 * k, ex, ey);
    ctx.stroke();
    ctx.strokeStyle = '#3fb84a';
    ctx.lineWidth = 5 * k;
    ctx.stroke();
  }
}

export function drawBox(ctx, w, h) {
  const ht = 14 * KZ;
  ctx.fillStyle = 'rgba(10,30,20,0.3)';
  ctx.fillRect(-w / 2 + 5, (-h / 2) * KY + 5, w, h * KY);
  ctx.fillStyle = C.woodDark;
  ctx.fillRect(-w / 2, (h / 2) * KY - ht, w, ht);
  ctx.fillStyle = C.wood;
  roundRect(ctx, -w / 2, (-h / 2) * KY - ht, w, h * KY, 3);
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.strokeStyle = C.woodDark;
  ctx.lineWidth = 1;
  ctx.strokeRect(-w / 2 + 5, (-h / 2) * KY - ht + 4, w - 10, h * KY - 8);
  ctx.font = font(Math.min(13, w / 6));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = C.cream;
  ctx.fillText('DOMINÓ', 0, -ht);
}

function drawObstacle(ctx, o, t) {
  if (o.kind === 'cup') drawCup(ctx, o.r, t);
  else if (o.kind === 'cat') drawCat(ctx, o.r, t);
  else if (o.kind === 'planter') drawPlanter(ctx, o.r, t);
  else drawBox(ctx, o.w || o.r * 2, o.h || o.r * 2);
}

// ---------------------------------------------------------------------------------------------
// Goals. `ft` is seconds since it went off (or < 0 if it hasn't).
// ---------------------------------------------------------------------------------------------

export function drawGoal(ctx, kind, ft, t) {
  const fired = ft >= 0;
  // a glowing ring on the table round a goal waiting to go off
  if (!fired) {
    const p = 0.5 + 0.5 * Math.sin(t * 4);
    ell(ctx, 0, 0, 20 + p * 3, (20 + p * 3) * KY, null, `rgba(255,225,77,${0.5 + p * 0.4})`, 2.5);
  }
  softShadow(ctx, 15, 11, 5, 4);
  if (kind === 'popper') drawPopper(ctx, ft, t);
  else if (kind === 'bell') drawBell(ctx, ft, t);
  else if (kind === 'rocket') drawRocket(ctx, ft, t);
  else if (kind === 'pinata') drawPinata(ctx, ft, t);
  else drawDrum(ctx, ft, t);
}

function drawPopper(ctx, ft, t) {
  const tip = ft >= 0 ? Math.min(1, ft * 6) : 0;
  ctx.save();
  ctx.rotate(-0.25 - tip * 0.3);
  // cone, wide end up
  const h = 34 * KZ + 6;
  ctx.fillStyle = C.pink;
  ctx.beginPath();
  ctx.moveTo(-3, 0);
  ctx.lineTo(3, 0);
  ctx.lineTo(10, -h);
  ctx.lineTo(-10, -h);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = C.sun;
  for (let i = 0; i < 4; i++) ctx.fillRect(-12, -h + 3 + i * 7, 24, 3);
  ctx.restore();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ell(ctx, 0, -h, 10, 4, ft >= 0 ? '#3b1f4a' : '#ffffff', C.ink, 1.6);
  if (ft < 0) {
    // the string to pull
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(8, 8, 14, 4 + Math.sin(t * 3) * 1.5);
    ctx.stroke();
    ell(ctx, 14, 4 + Math.sin(t * 3) * 1.5, 2.4, 2.4, C.red);
  }
  ctx.restore();
  if (ft >= 0 && ft < 1.6) {
    // streamers shooting out of the top
    const k = Math.min(1, ft * 3);
    const cols = [C.sun, C.pink, '#3fb8ff', C.green, C.orange];
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 - 0.9 + (i / 6) * 1.8;
      const len = 30 + k * 40 + (i % 3) * 8;
      ctx.strokeStyle = cols[i % cols.length];
      ctx.globalAlpha = 1 - Math.max(0, ft - 1) / 0.6;
      ctx.beginPath();
      for (let j = 0; j <= 10; j++) {
        const d = (j / 10) * len * k;
        ctx.lineTo(Math.cos(a) * d + Math.sin(j + i) * 3, -20 + Math.sin(a) * d + ft * ft * 20 * (j / 10));
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function drawBell(ctx, ft, t) {
  const swing = ft >= 0 ? Math.sin(ft * 16) * 0.5 * Math.exp(-ft * 1.2) : 0;
  const top = -40 * KZ - 14;
  // a little wooden frame
  ctx.strokeStyle = C.woodDark;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-14, 2);
  ctx.lineTo(-12, top);
  ctx.lineTo(12, top);
  ctx.lineTo(14, 2);
  ctx.stroke();
  ctx.strokeStyle = C.woodLight;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  ctx.translate(0, top + 2);
  ctx.rotate(swing);
  ctx.fillStyle = C.brass;
  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.quadraticCurveTo(-8, 4, -8, 12);
  ctx.quadraticCurveTo(-9, 18, -12, 20);
  ctx.lineTo(12, 20);
  ctx.quadraticCurveTo(9, 18, 8, 12);
  ctx.quadraticCurveTo(8, 4, 4, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(-5, 4, 2.5, 12);
  ell(ctx, Math.sin(swing * 2) * 3, 21, 3, 3, C.brassDark, C.ink, 1.2);
  ctx.restore();
  if (ft >= 0 && ft < 2.4) {
    // ring waves
    ctx.strokeStyle = C.sun;
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) {
      const k = (ft * 1.4 + i / 3) % 1;
      ctx.globalAlpha = (1 - k) * (1 - ft / 2.4);
      ctx.beginPath();
      ctx.arc(0, top + 12, 14 + k * 34, -2.6, -0.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function drawRocket(ctx, ft, t) {
  // launch pad
  ell(ctx, 0, 0, 14, 10, '#8a8fa3', C.ink, 1.4);
  const lift = ft >= 0 ? Math.max(0, ft - 0.25) ** 2 * 900 : 0;
  if (lift > 2000) return;
  const shake = ft >= 0 && ft < 0.25 ? Math.sin(ft * 90) * 1.5 : 0;
  ctx.save();
  ctx.translate(shake, -lift);
  const h = 44 * KZ + 8;
  if (ft >= 0) {
    // flame
    const fl = 10 + Math.sin(t * 40) * 3 + Math.min(20, lift * 0.1);
    ctx.fillStyle = C.orange;
    ctx.beginPath();
    ctx.moveTo(-5, -4);
    ctx.quadraticCurveTo(0, fl + 4, 5, -4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C.sun;
    ctx.beginPath();
    ctx.moveTo(-3, -4);
    ctx.quadraticCurveTo(0, fl * 0.6, 3, -4);
    ctx.closePath();
    ctx.fill();
  }
  // fins
  ctx.fillStyle = C.red;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.4;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 6, -14);
    ctx.lineTo(s * 13, -2);
    ctx.lineTo(s * 6, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // body
  ctx.fillStyle = '#f4f4fb';
  ctx.beginPath();
  ctx.moveTo(-6, -4);
  ctx.lineTo(-6, -h + 12);
  ctx.quadraticCurveTo(0, -h - 6, 6, -h + 12);
  ctx.lineTo(6, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = C.red;
  ctx.fillRect(-8, -h - 6, 16, 12);
  ctx.restore();
  ell(ctx, 0, -h * 0.55, 3.2, 3.2, '#3fb8ff', C.ink, 1.2);
  ctx.restore();
  if (ft >= 0) {
    // smoke puffs left behind
    for (let i = 0; i < 6; i++) {
      const k = ft - i * 0.08;
      if (k < 0) continue;
      const y = -(Math.max(0, k - 0.25) ** 2) * 900;
      ctx.globalAlpha = Math.max(0, 0.6 - ft * 0.25);
      ell(ctx, Math.sin(i * 2) * 6, y + 4, 8 + ft * 6, 6 + ft * 4, '#ffffff');
    }
    ctx.globalAlpha = 1;
  }
}

function drawPinata(ctx, ft, t) {
  const burst = ft >= 0 ? Math.min(1, ft * 4) : 0;
  const top = -34 * KZ - 10;
  // stand
  ctx.strokeStyle = C.woodDark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, top);
  ctx.stroke();
  const cols = [C.pink, C.sun, '#3fb8ff', C.green, C.orange];
  const bob = ft < 0 ? Math.sin(t * 2) * 1.5 : 0;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * TAU) / 5;
    const fly = burst * (22 + i * 3);
    const cx = Math.cos(a) * fly;
    const cy = top + bob + Math.sin(a) * fly + burst * ft * ft * 40;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a + burst * ft * 6);
    ctx.globalAlpha = 1 - Math.max(0, ft - 1.2);
    ctx.fillStyle = cols[i];
    ctx.beginPath();
    ctx.moveTo(6, -5);
    ctx.lineTo(19, 0);
    ctx.lineTo(6, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  if (burst < 1) ell(ctx, 0, top + bob, 9, 9, '#ffffff', C.ink, 1.4);
}

function drawDrum(ctx, ft, t) {
  const hit = ft >= 0 ? Math.max(0, 1 - ft * 3) : 0;
  const h = 30 * KZ + 6;
  const squash = 1 - hit * 0.12;
  ctx.save();
  ctx.scale(1 + hit * 0.06, squash);
  ctx.fillStyle = '#c4572f';
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 10 * KY, 0, 0, Math.PI);
  ctx.lineTo(-12, -h);
  ctx.ellipse(0, -h, 12, 12 * KY, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = C.sun;
  ctx.lineWidth = 2;
  for (const y of [-h * 0.3, -h * 0.7]) {
    ctx.beginPath();
    ctx.ellipse(0, y, 11, 11 * KY, 0, 0.15, Math.PI - 0.15);
    ctx.stroke();
  }
  ell(ctx, 0, -h, 12, 12 * KY, '#f6e7c8', C.ink, 1.5);
  ctx.restore();
  if (ft >= 0 && ft < 2.5) {
    // notes
    for (let i = 0; i < 3; i++) {
      const k = (ft * 0.8 + i * 0.3) % 1;
      ctx.globalAlpha = (1 - k) * (1 - ft / 2.5);
      const x = (i - 1) * 14 + Math.sin(ft * 4 + i) * 4;
      const y = -h - 10 - k * 40;
      ctx.fillStyle = C.ink;
      ell(ctx, x, y, 3.5, 2.8, C.ink);
      ctx.fillRect(x + 2.5, y - 12, 1.6, 12);
    }
    ctx.globalAlpha = 1;
  } else if (ft < 0) {
    // a ball ready to drop on it
    ell(ctx, 0, -h - 9 + Math.sin(t * 3) * 1.5, 5, 5, '#3fb8ff', C.ink, 1.3);
  }
}

// ---------------------------------------------------------------------------------------------
// Gadgets
// ---------------------------------------------------------------------------------------------

function plank(ctx, path, width) {
  // a wooden plank along the path (flat on the table, in table space)
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = C.woodDark;
  ctx.lineWidth = width + 3;
  ctx.beginPath();
  path.forEach(([x, y], i) => (i ? ctx.lineTo(x, y * KY) : ctx.moveTo(x, y * KY)));
  ctx.stroke();
  ctx.strokeStyle = C.woodLight;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(122,74,34,0.5)';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 10]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function chute(ctx, path) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = C.woodDark;
  ctx.lineWidth = 17;
  ctx.beginPath();
  path.forEach(([x, y], i) => (i ? ctx.lineTo(x, y * KY) : ctx.moveTo(x, y * KY)));
  ctx.stroke();
  ctx.strokeStyle = '#e8c48a';
  ctx.lineWidth = 11;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(122,74,34,0.6)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

// The track or plank a carrier gadget travels along (drawn flat, before things stand on it).
export function drawGadgetTrack(ctx, g) {
  if (!g.path) return;
  if (g.kind === 'ball') chute(ctx, g.path);
  else if (g.kind === 'car' || g.kind === 'fan') plank(ctx, g.path, 22);
  else if (g.kind === 'rooster') plank(ctx, g.path, 16);
  else {
    // seesaw: a dotted arc of where the ball will fly
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 6]);
    const [x0, y0] = g.path[0];
    const [x1, y1] = g.path[g.path.length - 1];
    const hgt = Math.max(40, g.len * 0.55) * KZ;
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const k = i / 20;
      ctx.lineTo(x0 + (x1 - x0) * k, (y0 + (y1 - y0) * k) * KY - Math.sin(k * Math.PI) * hgt);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function beachBall(ctx, r, spin) {
  ctx.save();
  ctx.rotate(spin);
  const cols = [C.red, '#ffffff', '#3fb8ff', '#ffffff', C.sun, '#ffffff'];
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = cols[i];
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, (i * TAU) / 6, ((i + 1) * TAU) / 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ell(ctx, 0, 0, r, r, null, C.ink, 1.3);
  ell(ctx, -r * 0.35, -r * 0.35, r * 0.25, r * 0.18, 'rgba(255,255,255,0.7)');
}

function marble(ctx, r) {
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#bdf2ff');
  g.addColorStop(1, '#1f6fd6');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

function toyCar(ctx, a, t, moving) {
  ctx.save();
  ctx.scale(1, KY);
  ctx.rotate(a);
  // body (seen from above): nose towards +x
  ctx.fillStyle = 'rgba(10,30,20,0.3)';
  roundRect(ctx, -14, -9, 30, 20, 6);
  ctx.fill();
  ctx.fillStyle = '#1b1430';
  for (const [x, y] of [[-9, -10], [7, -10], [-9, 7], [7, 7]]) ctx.fillRect(x, y, 7, 3.5);
  ctx.fillStyle = C.red;
  roundRect(ctx, -15, -8, 30, 16, 6);
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#bfe9ff';
  roundRect(ctx, -3, -6, 9, 12, 3);
  ctx.fill();
  ctx.fillStyle = C.sun;
  ctx.fillRect(12, -6, 3, 3);
  ctx.fillRect(12, 3, 3, 3);
  // wind-up key on the back
  ctx.save();
  ctx.translate(-17, 0);
  ctx.rotate(moving ? t * 12 : 0);
  ctx.fillStyle = C.brass;
  ctx.fillRect(-1, -6, 2, 12);
  ell(ctx, 0, -6, 3, 2, C.brass, C.ink, 1);
  ell(ctx, 0, 6, 3, 2, C.brass, C.ink, 1);
  ctx.restore();
  ctx.restore();
}

function drawFan(ctx, a, on, t) {
  ctx.save();
  // base
  ell(ctx, 0, 0, 11, 8, '#e8eef7', C.ink, 1.3);
  ctx.strokeStyle = '#8a8fa3';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -22);
  ctx.stroke();
  ctx.translate(0, -26);
  // the head faces along the path; squash it to show which way
  const sx = Math.abs(Math.sin(a)) * 0.6 + 0.4;
  ctx.scale(sx, 1);
  ell(ctx, 0, 0, 16, 16, 'rgba(255,255,255,0.4)', C.ink, 1.6);
  ctx.save();
  ctx.rotate(on ? t * 30 : 0.3);
  ctx.fillStyle = '#3fb8ff';
  for (let i = 0; i < 3; i++) {
    ctx.rotate(TAU / 3);
    ctx.beginPath();
    ctx.ellipse(0, -7, 4.5, 7, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ell(ctx, 0, 0, 3, 3, C.red);
  ctx.strokeStyle = 'rgba(22,11,51,0.5)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos((i * TAU) / 6) * 16, Math.sin((i * TAU) / 6) * 16);
    ctx.stroke();
  }
  ctx.restore();
  if (on) {
    // breeze lines
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const ux = Math.cos(a);
    const uy = Math.sin(a) * KY;
    for (let i = 0; i < 3; i++) {
      const k = (t * 2 + i / 3) % 1;
      const d = 18 + k * 50;
      const off = (i - 1) * 8;
      ctx.globalAlpha = 1 - k;
      ctx.beginPath();
      ctx.moveTo(ux * d - uy * off, -20 + uy * d + ux * off);
      ctx.lineTo(ux * (d + 12) - uy * off, -20 + uy * (d + 12) + ux * off);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

export function drawRooster(ctx, a, t, pose = {}) {
  const face = Math.cos(a) >= 0 ? 1 : -1;
  ctx.save();
  ctx.scale(face, 1);
  const peck = pose.peck || 0;
  // legs
  ctx.strokeStyle = C.brassDark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-3, 0);
  ctx.lineTo(-2, -10);
  ctx.moveTo(4, 0);
  ctx.lineTo(3, -10);
  ctx.stroke();
  // tail
  const tails = ['#1f3a2a', '#2f6f3a', '#1b1430'];
  tails.forEach((c, i) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, -18);
    ctx.quadraticCurveTo(-22 - i * 2, -34 + i * 4, -16 + i * 3, -14 + i * 2 + Math.sin(t * 3 + i) * 1.2);
    ctx.stroke();
  });
  // body
  ell(ctx, 0, -18, 13, 10, '#c0552a', C.ink, 1.5);
  ell(ctx, -2, -17, 8, 6, '#e07a3a');
  ctx.save();
  ctx.translate(9, -26);
  ctx.rotate(peck * 0.9);
  // neck and head
  ell(ctx, 0, 0, 6, 7, '#f0e0c0', C.ink, 1.3);
  ctx.fillStyle = C.red;
  ctx.beginPath();
  ctx.arc(-1, -7, 2.6, 0, TAU);
  ctx.arc(2, -8, 2.8, 0, TAU);
  ctx.arc(5, -6.5, 2.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = C.sun;
  ctx.beginPath();
  ctx.moveTo(5, -2);
  ctx.lineTo(11, 0);
  ctx.lineTo(5, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1;
  ctx.stroke();
  ell(ctx, 6, 4, 2, 3, C.red);
  ell(ctx, 2, -1.5, 1.3, 1.3, C.ink);
  ctx.restore();
  ctx.restore();
}

function drawSplitter(ctx, g, t) {
  const fired = g.state !== 'idle';
  ctx.save();
  ctx.scale(1, KY);
  ctx.rotate(g.a);
  // a wooden wedge: the point faces back the way the chain comes in
  ctx.fillStyle = 'rgba(10,30,20,0.3)';
  ctx.beginPath();
  ctx.moveTo(-14 + 4, 3);
  ctx.lineTo(10 + 4, -15 + 3);
  ctx.lineTo(10 + 4, 15 + 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = fired ? C.sun : C.woodLight;
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.lineTo(10, -15);
  ctx.lineTo(10, 15);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // little arrows showing the two ways out
  ctx.strokeStyle = C.woodDark;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(4, s * 7);
    ctx.stroke();
  }
  ctx.restore();
  if (!fired) {
    const p = 0.5 + 0.5 * Math.sin(t * 4);
    ell(ctx, 0, 0, 19 + p * 2, (19 + p * 2) * KY, null, `rgba(255,225,77,${0.35 + p * 0.3})`, 2);
  }
}

// A carrier gadget's moving part and machinery, at its trigger (0, 0 is the trigger point).
function drawCarrier(ctx, s, g, t) {
  const p = carrierPos(s, g);
  const moving = g.state === 'go';
  const idle = g.state === 'idle';
  if (idle) {
    const q = 0.5 + 0.5 * Math.sin(t * 4);
    ell(ctx, 0, 0, 18 + q * 2, (18 + q * 2) * KY, null, `rgba(255,225,77,${0.35 + q * 0.35})`, 2);
  }
  const dx = p.x - g.x;
  const dy = (p.y - g.y) * KY - p.z * KZ;
  if (g.kind === 'ball') {
    // a little ledge the marble sits on
    ell(ctx, 0, 0, 12, 9, C.woodDark, C.ink, 1.2);
    ctx.save();
    ctx.translate(dx, dy - 7);
    marble(ctx, 7);
    ctx.restore();
  } else if (g.kind === 'car') {
    ctx.save();
    ctx.translate(dx, (p.y - g.y) * KY);
    toyCar(ctx, p.a, t, moving);
    ctx.restore();
  } else if (g.kind === 'fan') {
    const back = -14;
    ctx.save();
    ctx.translate(Math.cos(g.a) * back, Math.sin(g.a) * back * KY);
    drawFan(ctx, g.a, moving && p.t < g.dur, t);
    ctx.restore();
    ctx.save();
    ell(ctx, dx + 3, (p.y - g.y) * KY + 2, 8, 5, 'rgba(10,30,20,0.3)');
    ctx.translate(dx, dy - 9);
    beachBall(ctx, 9, (p.k * g.len) / 9);
    ctx.restore();
  } else if (g.kind === 'seesaw') {
    const tilt = idle ? 0.22 : Math.min(1, (s.time - g.t0) / 0.12) * -0.44 + 0.22;
    ctx.save();
    ctx.scale(1, KY);
    ctx.rotate(g.a);
    ctx.fillStyle = C.woodDark;
    ctx.beginPath();
    ctx.moveTo(-6, 6);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, -4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // the board, tipping
    const ux = Math.cos(g.a);
    const uy = Math.sin(g.a) * KY;
    const L = 22;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-ux * L, -uy * L - 8 + tilt * -22);
    ctx.lineTo(ux * L, uy * L - 8 + tilt * 22);
    ctx.stroke();
    ctx.strokeStyle = C.woodLight;
    ctx.lineWidth = 4.5;
    ctx.stroke();
    if (idle || p.k <= 0) {
      ctx.save();
      ctx.translate(ux * L * 0.8, uy * L * 0.8 - 14 + tilt * 18);
      beachBall(ctx, 6.5, 0);
      ctx.restore();
    } else {
      ctx.save();
      ell(ctx, dx + p.z * 0.2, (p.y - g.y) * KY + 3, 6, 4, 'rgba(10,30,20,0.25)');
      ctx.translate(dx, dy - 7);
      beachBall(ctx, 6.5, p.k * 8);
      ctx.restore();
    }
  } else if (g.kind === 'rooster') {
    const peck = g.state === 'done' ? Math.max(0, Math.sin((s.time - g.t0 - g.dur) * 14)) * Math.max(0, 1 - (s.time - g.t0 - g.dur)) : 0;
    const flap = moving && p.z > 1 ? 1 : 0;
    ctx.save();
    ell(ctx, dx + 3, (p.y - g.y) * KY + 2, 12, 6, 'rgba(10,30,20,0.3)');
    ctx.translate(dx, dy);
    drawRooster(ctx, p.a, t, { peck: peck || (idle ? Math.max(0, Math.sin(t * 2.2)) ** 8 * 0.6 : 0), flap });
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------------------------
// The table and the park round it
// ---------------------------------------------------------------------------------------------

let paverPattern = null;
function pavers(ctx) {
  if (paverPattern) return paverPattern;
  try {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = C.grout;
    g.fillRect(0, 0, 64, 64);
    const tiles = [[1, 1, 30, 30], [33, 1, 30, 30], [1, 33, 30, 30], [33, 33, 30, 30]];
    tiles.forEach(([x, y, w, h], i) => {
      g.fillStyle = i % 3 ? C.paver : '#d27c55';
      g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(255,255,255,0.08)';
      g.fillRect(x, y, w, 4);
    });
    paverPattern = ctx.createPattern(c, 'repeat');
  } catch {
    paverPattern = C.paver;
  }
  return paverPattern;
}

function drawGround(ctx, x0, y0, x1, y1, t) {
  ctx.save();
  ctx.scale(1, KY);
  ctx.fillStyle = pavers(ctx);
  ctx.fillRect(x0, y0 / KY, x1 - x0, (y1 - y0) / KY);
  ctx.restore();
}

// Big soft palm shadows drifting over everything.
function drawPalmShade(ctx, w, h, t) {
  ctx.save();
  ctx.fillStyle = 'rgba(20,40,30,0.13)';
  const palms = [[-40, h * 0.18, 150], [w + 50, h * 0.55, 170], [w * 0.3, h + 60, 130]];
  for (const [px, py, r] of palms) {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + Math.sin(t * 0.5 + i) * 0.04;
      ctx.beginPath();
      ctx.ellipse(px + Math.cos(a) * r * 0.5, (py + Math.sin(a) * r * 0.5) * KY, r * 0.5, r * 0.09, a, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

const RIM = 14; // wooden rim round the felt
const SLAB = 12; // how thick the table top is

function drawTable(ctx, s) {
  const { w, h } = s;
  // the table's front edge
  ctx.fillStyle = C.woodDark;
  ctx.fillRect(-RIM, (h + RIM) * KY, w + RIM * 2, SLAB * KZ + 2);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-RIM + 6, (h + RIM) * KY + SLAB * KZ + 2, w + RIM * 2, 8);
  // rim and felt
  ctx.save();
  ctx.scale(1, KY);
  ctx.fillStyle = C.wood;
  roundRect(ctx, -RIM, -RIM, w + RIM * 2, h + RIM * 2, 10);
  ctx.fill();
  ctx.strokeStyle = C.woodDark;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = C.felt;
  ctx.fillRect(0, 0, w, h);
  // a faint diamond pattern in the felt
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let k = -h; k < w; k += 40) {
    ctx.moveTo(k, 0);
    ctx.lineTo(k + h, h);
    ctx.moveTo(k + h, 0);
    ctx.lineTo(k, h);
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  ctx.beginPath();
  for (let k = -h; k < w; k += 40) {
    ctx.moveTo(k, 0);
    ctx.lineTo(k + h, h);
    ctx.moveTo(k + h, 0);
    ctx.lineTo(k, h);
  }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
  ctx.restore();
  // gaps between tables: the paving shows through, with the far table's edge
  for (const r of s.holes) {
    ctx.save();
    ctx.beginPath();
    const x0 = r.x0 <= 0 ? -RIM - 1 : r.x0;
    const x1 = r.x1 >= w ? w + RIM + 1 : r.x1;
    const y0 = r.y0 <= 0 ? -RIM - 1 : r.y0;
    const y1 = r.y1 >= h ? h + RIM + 1 : r.y1;
    ctx.rect(x0, y0 * KY, x1 - x0, (y1 - y0) * KY);
    ctx.clip();
    ctx.save();
    ctx.translate(0, 14);
    drawGround(ctx, x0 - 64, y0 * KY - 64, x1 + 64, y1 * KY + 64);
    ctx.restore();
    ctx.fillStyle = 'rgba(20,10,30,0.35)';
    ctx.fillRect(x0, y0 * KY, x1 - x0, (y1 - y0) * KY);
    // the far table's front edge, and its rim
    ctx.fillStyle = C.woodDark;
    ctx.fillRect(x0, y0 * KY, x1 - x0, SLAB * KZ);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x0, y0 * KY + SLAB * KZ, x1 - x0, 5);
    ctx.restore();
    ctx.strokeStyle = C.wood;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0, y0 * KY);
    ctx.lineTo(x1, y0 * KY);
    ctx.moveTo(x0, y1 * KY);
    ctx.lineTo(x1, y1 * KY);
    if (r.x0 > 0) {
      ctx.moveTo(r.x0, y0 * KY);
      ctx.lineTo(r.x0, y1 * KY);
    }
    if (r.x1 < w) {
      ctx.moveTo(r.x1, y0 * KY);
      ctx.lineTo(r.x1, y1 * KY);
    }
    ctx.stroke();
  }
  // planks over the gaps
  for (const b of s.bridges) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(b.x0 + 4, b.y0 * KY + 4, b.x1 - b.x0, (b.y1 - b.y0) * KY);
    ctx.fillStyle = C.woodLight;
    ctx.fillRect(b.x0, b.y0 * KY - 6, b.x1 - b.x0, (b.y1 - b.y0) * KY + 12);
    ctx.strokeStyle = C.woodDark;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(b.x0, b.y0 * KY - 6, b.x1 - b.x0, (b.y1 - b.y0) * KY + 12);
    ctx.beginPath();
    for (let x = b.x0 + 12; x < b.x1 - 4; x += 12) {
      ctx.moveTo(x, b.y0 * KY - 6);
      ctx.lineTo(x, b.y1 * KY + 6);
    }
    ctx.strokeStyle = 'rgba(122,74,34,0.45)';
    ctx.stroke();
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------------------------
// The renderer: the whole table scene for one state, plus particles
// ---------------------------------------------------------------------------------------------

const PARTICLE_MAX = 320;

export function createRenderer() {
  let parts = [];
  let seen = 0;
  let tiltBuf = new Map();

  function burst(x, y, z, n, kind, spread = 1) {
    for (let i = 0; i < n && parts.length < PARTICLE_MAX; i++) {
      const a = Math.random() * TAU;
      const sp = (40 + Math.random() * 120) * spread;
      parts.push({
        kind, x, y, z,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 80 + Math.random() * 160 * spread,
        life: 1.4 + Math.random() * 0.8, age: 0, spin: Math.random() * TAU,
        col: [C.pink, C.sun, '#3fb8ff', C.green, C.orange, C.white][i % 6],
      });
    }
  }

  function spawn(s) {
    for (const e of s.events) {
      if (e.n <= seen) continue;
      seen = e.n;
      if (e.type === 'goal') {
        const n = e.kind === 'pinata' ? 60 : 45;
        burst(e.x, e.y, 30, n, e.kind === 'pinata' ? 'candy' : 'confetti', 1.1);
      } else if (e.type === 'clack' && parts.length < PARTICLE_MAX - 40) {
        // a puff of dust where it lands
        for (let i = 0; i < 2; i++) {
          parts.push({ kind: 'dust', x: e.x + (Math.random() - 0.5) * 10, y: e.y + (Math.random() - 0.5) * 10, z: 2, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, vz: 10, life: 0.5, age: 0, spin: 0, col: '#fff' });
        }
      } else if (e.type === 'release' || e.type === 'gadget') {
        burst(e.x, e.y, 10, 8, 'spark', 0.4);
      }
    }
  }

  function stepParts(dt) {
    for (const p of parts) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.kind === 'dust') {
        p.vx *= 0.9;
        p.vy *= 0.9;
      } else {
        p.vz -= 320 * dt;
        p.vx *= 0.985;
        p.vy *= 0.985;
        if (p.z < 0) {
          p.z = 0;
          p.vz = 0;
          p.vx *= 0.6;
          p.vy *= 0.6;
        }
      }
    }
    parts = parts.filter((p) => p.age < p.life);
  }

  function drawParts(ctx) {
    for (const p of parts) {
      const fade = Math.min(1, (p.life - p.age) / 0.4);
      ctx.globalAlpha = fade;
      const sx = p.x;
      const sy = p.y * KY - p.z * KZ;
      if (p.kind === 'dust') {
        ell(ctx, sx, sy, 3 + p.age * 12, 2 + p.age * 8, `rgba(255,255,255,${0.35 * (1 - p.age / p.life)})`);
      } else if (p.kind === 'spark') {
        ctx.fillStyle = C.sun;
        ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
      } else if (p.kind === 'candy') {
        ctx.fillStyle = p.col;
        ctx.beginPath();
        ctx.arc(sx, sy, 2.6, 0, TAU);
        ctx.fill();
      } else {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(p.spin + p.age * 8);
        ctx.fillStyle = p.col;
        ctx.fillRect(-3, -1.8, 6, 3.6);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  // How far each domino is tipped for drawing, with a leaning domino settling a little deeper
  // as the one it rests on goes down, and dominoes standing back up after a run.
  function tilts(s, time) {
    tiltBuf.clear();
    for (const d of s.dominoes) tiltBuf.set(d.id, tiltOf(s, d));
    const out = new Map();
    const rise = clamp((s.time - s.riseT) / 0.45, 0, 1);
    for (const d of s.dominoes) {
      let th = tiltBuf.get(d.id);
      if (d.state !== 'stand' && d.state !== 'wobble' && d.restOn != null && th >= d.rest - 0.01) {
        const next = tiltBuf.get(d.restOn) || 0;
        const deep = Math.min(80, d.rest + 26);
        th = d.rest + (deep - d.rest) * (next / 90);
      }
      if (d.state === 'stand' && d.riseFrom > 0 && rise < 1) {
        const e = 1 - (1 - rise) * (1 - rise);
        th = d.riseFrom * (1 - e);
      }
      out.set(d.id, th);
    }
    return out;
  }

  return {
    reset() {
      parts = [];
      seen = 0;
    },
    // Skip particles for events already gone (for a new state).
    sync(s) {
      seen = s.eventN;
    },

    // ctx is already in world space (see the caller's transform). opts: { theme, view: { x0, y0,
    // x1, y1 } the visible world rect, ends (pulse open ends), breaks, dt, stroke: {x, y} finger }
    drawWorld(ctx, s, time, opts = {}) {
      const dt = opts.dt || 0;
      spawn(s);
      stepParts(dt);
      const v = opts.view || { x0: -200, y0: -200, x1: s.w + 200, y1: s.h + 200 };
      drawGround(ctx, v.x0 - 64, v.y0 * KY - 64, v.x1 + 64, v.y1 * KY + 200, time);
      drawPalmShade(ctx, s.w, s.h, time);
      drawTable(ctx, s);
      for (const g of s.gadgets) drawGadgetTrack(ctx, g);
      const theme = opts.theme || THEMES[0];
      const th = tilts(s, time);
      // shadows of the dominoes first, so nothing sits under another's shadow oddly
      ctx.fillStyle = 'rgba(8,30,22,0.32)';
      for (const d of s.dominoes) {
        let tt = th.get(d.id);
        let dir = d.dir;
        if (d.state === 'wobble' || (d.state === 'stand' && time - d.wobbleT < 1.2)) {
          const w = wobble(s.time - d.wobbleT);
          tt = Math.abs(w);
          if (w < 0) dir += Math.PI;
        }
        drawDominoShadow(ctx, d.x, d.y, dir, tt, lift(s, d));
      }
      // everything that stands up, back to front
      const items = [];
      for (const o of s.obstacles) items.push({ y: o.y, o, k: 'ob' });
      for (const g of s.goals) items.push({ y: g.y, o: g, k: 'goal' });
      for (const g of s.gadgets) {
        if (g.kind === 'split') items.push({ y: g.y - 6, o: g, k: 'split' });
        else {
          const p = carrierPos(s, g);
          items.push({ y: g.state === 'idle' ? g.y : p.y, o: g, k: 'carrier' });
        }
      }
      for (const d of s.dominoes) {
        const tt = th.get(d.id);
        items.push({ y: d.y + Math.sin(d.dir) * (DOM_L / 2) * Math.sin(tt * DEG), o: d, k: 'dom', tt });
      }
      items.sort((a, b) => a.y - b.y);
      for (const it of items) {
        const o = it.o;
        if (it.k === 'dom') {
          let tt = it.tt;
          let dir = o.dir;
          if (o.state === 'wobble' || (o.state === 'stand' && s.time - o.wobbleT < 1.2)) {
            const w = wobble(s.time - o.wobbleT);
            tt = Math.abs(w);
            if (w < 0) dir += Math.PI;
          }
          drawDomino(ctx, o.x, o.y, dir, tt, { theme, pips: o.pips, id: o.id, start: o.role === 'start', lift: lift(s, o) });
        } else {
          ctx.save();
          ctx.translate(o.x, o.y * KY);
          if (it.k === 'ob') drawObstacle(ctx, o, time);
          else if (it.k === 'goal') drawGoal(ctx, o.kind, o.fired ? s.time - o.t : -1, time);
          else if (it.k === 'split') drawSplitter(ctx, o, time);
          else drawCarrier(ctx, s, o, time);
          ctx.restore();
        }
      }
      if (opts.ends) drawEnds(ctx, s, time);
      drawStartArrow(ctx, s, time);
      if (opts.stroke) drawStrokeLead(ctx, s, opts.stroke);
      for (let i = 0; i < s.breaks.length; i++) drawBreak(ctx, s, s.breaks[i], time, i === 0);
      drawParts(ctx);
    },
  };
}

// A wobbling domino rocks back and forth and settles: degrees (sign = which way).
function wobble(dt) {
  if (dt < 0 || dt > 1.2) return 0;
  return Math.sin(dt * 20) * 14 * Math.exp(-dt * 3);
}

// A domino just laid drops into place.
function lift(s, d) {
  const age = s.time - (d.born ?? -9);
  return age < 0.14 ? (1 - age / 0.14) * 10 : 0;
}

function drawEnds(ctx, s, t) {
  const p = 0.5 + 0.5 * Math.sin(t * 5);
  for (const d of openEnds(s)) {
    ctx.save();
    ctx.translate(d.x, d.y * KY);
    ell(ctx, 0, 0, 15 + p * 4, (15 + p * 4) * KY, `rgba(255,225,77,${0.12 + p * 0.1})`, `rgba(255,225,77,${0.55 + p * 0.35})`, 2.2);
    ctx.restore();
  }
}

// The start domino gets a curved "flick" arrow showing which way it will fall.
function drawStartArrow(ctx, s, t) {
  if (s.status !== 'build') return;
  const d = s.start;
  const ux = Math.cos(d.a);
  const uy = Math.sin(d.a);
  const bob = Math.sin(t * 4) * 2;
  const bx = d.x - ux * 34;
  const by = d.y - uy * 34;
  ctx.save();
  ctx.translate(bx - ux * 9, by * KY - uy * 9 * KY - 4 + bob);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  const ax = ux * 18;
  const ay = uy * 18 * KY;
  ctx.beginPath();
  ctx.moveTo(-ax * 0.4, -ay * 0.4 + 6);
  ctx.quadraticCurveTo(ax * 0.2, ay * 0.2 - 8, ax, ay);
  ctx.stroke();
  ctx.strokeStyle = C.sun;
  ctx.lineWidth = 3.2;
  ctx.stroke();
  const a = Math.atan2(ay + 6, ax);
  ctx.fillStyle = C.sun;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(ax + Math.cos(a) * 7, ay + Math.sin(a) * 7);
  ctx.lineTo(ax + Math.cos(a + 2.3) * 7, ay + Math.sin(a + 2.3) * 7);
  ctx.lineTo(ax + Math.cos(a - 2.3) * 7, ay + Math.sin(a - 2.3) * 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawStrokeLead(ctx, s, f) {
  const st = s.stroke;
  if (!st) return;
  const P = st.last;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 3;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(P.x, P.y * KY);
  ctx.lineTo(f.x, f.y * KY);
  ctx.stroke();
  ctx.setLineDash([]);
  ell(ctx, f.x, f.y * KY, 10, 8, st.empty ? 'rgba(255,75,75,0.45)' : 'rgba(255,255,255,0.3)');
}

// Where the chain stopped: a pulsing red ring, "oops", and an arrow showing where to go on.
function drawBreak(ctx, s, b, t, main) {
  const p = 0.5 + 0.5 * Math.sin(t * 6);
  ctx.save();
  ctx.translate(b.x, b.y * KY);
  ell(ctx, 0, 0, 18 + p * 5, (18 + p * 5) * KY, `rgba(255,75,75,${0.15 + p * 0.1})`, C.red, 3);
  if (main) {
    const ux = Math.cos(b.a);
    const uy = Math.sin(b.a) * KY;
    const n = Math.hypot(ux, uy);
    const ax = ux / n;
    const ay = uy / n;
    const go = 26 + ((t * 30) % 14);
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.setLineDash([6, 7]);
    ctx.lineDashOffset = -t * 30;
    ctx.beginPath();
    ctx.moveTo(ax * 22, ay * 22);
    ctx.lineTo(ax * (go + 22), ay * (go + 22));
    ctx.stroke();
    ctx.setLineDash([]);
    const hx = ax * (go + 30);
    const hy = ay * (go + 30);
    ctx.fillStyle = C.white;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx + ax * 10, hy + ay * 10);
    ctx.lineTo(hx - ay * 9, hy + ax * 9);
    ctx.lineTo(hx + ay * 9, hy - ax * 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (s.status === 'stopped') {
      // "oops!" bubble
      const k = Math.min(1, s.statusT * 4);
      ctx.save();
      ctx.translate(-ax * 46, -ay * 46 - 10);
      ctx.scale(k, k);
      ctx.fillStyle = C.white;
      roundRect(ctx, -30, -14, 60, 28, 12);
      ctx.fill();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = C.red;
      ctx.font = font(17);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('oops!', 0, 1);
      ctx.restore();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Little pictures for the level picker and the launcher tile
// ---------------------------------------------------------------------------------------------

// A short row of dominoes falling in a loop (a sim-free toy for tiles and icons).
function dominoRow(ctx, n, t, theme, spacing = 14) {
  const cycle = 3.2;
  const k = t % cycle;
  for (let i = n - 1; i >= 0; i--) {
    const start = 0.4 + i * 0.14;
    const u = clamp((k - start) / 0.28, 0, 1);
    let tilt = Math.min(i < n - 1 ? 32 : 90, 90 * u * u);
    if (i < n - 1 && k > start + 0.28) tilt = 32 + Math.min(1, (k - start - 0.28) / 0.3) * 30;
    if (k > cycle - 0.4) tilt *= (cycle - k) / 0.4;
    drawDomino(ctx, 0, -i * spacing, -Math.PI / 2, tilt, { theme, pips: [(i * 3 + 1) % 7, (i * 5 + 2) % 7], id: i, start: i === 0 });
  }
}

// kind: a goal kind, an obstacle, a gadget, or 'bridge' | 'crack' | 'split' | 'three' | 'long' | 'star'
export function drawTeachIcon(ctx, kind, x, y, r, t) {
  ctx.save();
  ctx.translate(x, y);
  const k = r / 22;
  ctx.scale(k, k);
  const fake = (g) => ({ time: t, ...g });
  if (['popper', 'bell', 'rocket', 'pinata', 'drum'].includes(kind)) {
    ctx.translate(0, 14);
    drawGoal(ctx, kind, -1, t);
  } else if (kind === 'cup') {
    ctx.translate(0, 8);
    drawCup(ctx, 20, t);
  } else if (kind === 'cat') {
    ctx.translate(0, 8);
    drawCat(ctx, 22, t);
  } else if (kind === 'bridge' || kind === 'crack') {
    ctx.fillStyle = C.felt;
    ctx.fillRect(-24, -22, 48, 44);
    ctx.fillStyle = C.paverDark;
    if (kind === 'bridge') {
      ctx.fillRect(-24, -6, 48, 12);
      ctx.fillStyle = C.woodLight;
      ctx.fillRect(-7, -9, 14, 18);
      ctx.strokeStyle = C.woodDark;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-7, -9, 14, 18);
    } else {
      ctx.fillRect(-24, -2, 48, 4);
    }
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(-24, -22, 48, 44);
  } else if (kind === 'ball') {
    ctx.translate(0, 6);
    ctx.save();
    ctx.scale(1, 1);
    chute(ctx, [[-18, 12], [18, -16]]);
    ctx.restore();
    ctx.translate(-12 + Math.sin(t * 2) * 4, 2);
    marble(ctx, 7);
  } else if (kind === 'car') {
    ctx.translate(Math.sin(t * 1.5) * 6, 4);
    ctx.scale(1.3, 1.3);
    toyCar(ctx, 0, t, true);
  } else if (kind === 'fan') {
    ctx.translate(-8, 16);
    drawFan(ctx, 0, true, t);
    ctx.translate(26, -8);
    beachBall(ctx, 7, t);
  } else if (kind === 'seesaw') {
    ctx.strokeStyle = C.woodLight;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-20, 8);
    ctx.lineTo(20, -6);
    ctx.stroke();
    ctx.fillStyle = C.woodDark;
    ctx.beginPath();
    ctx.moveTo(-6, 14);
    ctx.lineTo(6, 14);
    ctx.lineTo(0, 2);
    ctx.fill();
    ctx.translate(14, -18 - Math.abs(Math.sin(t * 3)) * 8);
    beachBall(ctx, 6.5, t);
  } else if (kind === 'rooster') {
    ctx.translate(0, 18 - Math.abs(Math.sin(t * 4)) * 6);
    ctx.scale(1.2, 1.2);
    drawRooster(ctx, 0, t);
  } else if (kind === 'split') {
    drawSplitter(ctx, fake({ a: -Math.PI / 2, state: 'idle' }), t);
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -14);
    ctx.lineTo(-16, -26);
    ctx.moveTo(6, -14);
    ctx.lineTo(16, -26);
    ctx.stroke();
  } else if (kind === 'three') {
    ctx.save();
    ctx.translate(-16, 10);
    ctx.scale(0.7, 0.7);
    drawGoal(ctx, 'popper', -1, t);
    ctx.restore();
    ctx.save();
    ctx.translate(0, 4);
    ctx.scale(0.7, 0.7);
    drawGoal(ctx, 'bell', -1, t);
    ctx.restore();
    ctx.save();
    ctx.translate(16, 10);
    ctx.scale(0.7, 0.7);
    drawGoal(ctx, 'rocket', -1, t);
    ctx.restore();
  } else if (kind === 'long') {
    ctx.translate(-10, 22);
    ctx.rotate(0);
    dominoRow(ctx, 4, t, THEMES[0], 13);
  } else {
    drawStar(ctx, 0, 0, 18, true);
  }
  ctx.restore();
}

// The launcher tile: a felt table in the domino park with a row of dominoes falling.
export function drawTile(ctx, x, y, w, h, time) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = C.paver;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = C.grout;
  const g = w / 6;
  for (let i = 0; i <= 6; i++) {
    ctx.fillRect(x + i * g - 1, y, 2, h);
    ctx.fillRect(x, y + i * g - 1, w, 2);
  }
  // table
  const tx = x + w * 0.1;
  const ty = y + h * 0.14;
  const tw = w * 0.8;
  const th = h * 0.72;
  ctx.fillStyle = C.woodDark;
  ctx.fillRect(tx, ty + th, tw, h * 0.05);
  ctx.fillStyle = C.wood;
  roundRect(ctx, tx, ty, tw, th, w * 0.04);
  ctx.fill();
  ctx.fillStyle = C.felt;
  ctx.fillRect(tx + w * 0.035, ty + w * 0.035, tw - w * 0.07, th - w * 0.07);
  // palm shade
  ctx.fillStyle = 'rgba(20,40,30,0.18)';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + Math.sin(time * 0.6) * 0.05;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.95 + Math.cos(a) * w * 0.18, y + h * 0.1 + Math.sin(a) * w * 0.18, w * 0.2, w * 0.035, a, 0, TAU);
    ctx.fill();
  }
  // the falling row
  ctx.save();
  ctx.translate(x + w * 0.42, y + h * 0.78);
  ctx.scale(w / 150, w / 150);
  ctx.rotate(0.35);
  dominoRow(ctx, 6, time, THEMES[0]);
  ctx.restore();
  // a bell at the end of it
  ctx.save();
  ctx.translate(x + w * 0.74, y + h * 0.34);
  ctx.scale(w / 140, w / 140);
  const k = time % 3.2;
  drawGoal(ctx, 'bell', k > 1.55 && k < 2.9 ? k - 1.55 : -1, time);
  ctx.restore();
  // a cafecito
  ctx.save();
  ctx.translate(x + w * 0.24, y + h * 0.3);
  ctx.scale(w / 220, w / 220);
  drawCup(ctx, 30, time);
  ctx.restore();
  ctx.restore();
}
