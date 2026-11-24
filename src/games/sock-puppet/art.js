// Sock Puppet Show drawing kit: the palette, felt colours, text, rounded boxes, stitches and
// small shape helpers shared by the puppet, the parts, the scenes and the buttons. Drawing
// only; the colour maths (shade, mix) is pure.

export const TAU = Math.PI * 2;

export const C = {
  night: '#2b1055',
  dusk: '#7a1fa2',
  ink: '#2a1838',
  white: '#ffffff',
  cream: '#fff6e4',
  sun: '#ffe14d',
  gold: '#ffc93a',
  pink: '#ff4fa0',
  hot: '#ff3d7a',
  orange: '#ff8a4c',
  red: '#e8384f',
  sea: '#16b8c8',
  sky: '#7fd3ff',
  leaf: '#3cbf55',
  leafDark: '#22813a',
  wood: '#b0773f',
  woodDark: '#6e4426',
  sand: '#f6d892',
  mouth: '#6b1830',
  tongue: '#ff7d9c',
  skin: '#f2c49b',
  skinDark: '#d79c72',
  curtain: '#c8183c',
  curtainDark: '#7d0d26',
};

// The felt colours. Socks, tinted parts and the paint tab all use this list; a puppet stores
// colours as indexes into it, so saved puppets stay small.
export const FELT = [
  '#e8384f', // red
  '#ff8a3d', // orange
  '#ffd23f', // yellow
  '#8fd14f', // lime
  '#2fae6a', // green
  '#22b8b0', // teal
  '#5cb8ff', // sky
  '#3e5fd8', // blue
  '#8a4fd8', // purple
  '#ff6fb1', // pink
  '#fff3dc', // cream
  '#9aa3ad', // grey
  '#8d5a36', // brown
  '#33283f', // black
];
export const RAINBOW = ['#e8384f', '#ff8a3d', '#ffd23f', '#8fd14f', '#22b8b0', '#3e5fd8', '#8a4fd8'];

export const felt = (i) => FELT[((i % FELT.length) + FELT.length) % FELT.length];

export const font = (px, weight = 900) => `${weight} ${Math.round(px)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;

// ---------------------------------------------------------------------------------------------
// Colour maths (pure)
// ---------------------------------------------------------------------------------------------

function parse(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

// Lighter (amt > 0, towards white) or darker (amt < 0, towards black), amt in -1..1.
export function shade(hex, amt) {
  const [r, g, b] = parse(hex);
  if (amt >= 0) return toHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
  const k = 1 + amt;
  return toHex(r * k, g * k, b * k);
}

export function mix(a, b, t) {
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

// Perceived lightness 0..1, for picking a contrasting stitch or outline.
export function lightness(hex) {
  const [r, g, b] = parse(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// ---------------------------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------------------------

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

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

export function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
}

export function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.01, r), 0, TAU);
}

// Fill and ink-outline the current path. lw in the current units.
export function fillInk(ctx, fill, lw = 5, ink = C.ink) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = ink;
    ctx.stroke();
  }
}

// A smooth closed curve through points [x0, y0, x1, y1, ...] (Catmull-Rom as beziers).
export function smoothPath(ctx, pts, closed = true) {
  const n = pts.length / 2;
  const P = (i) => {
    const k = closed ? ((i % n) + n) % n : Math.max(0, Math.min(n - 1, i));
    return [pts[k * 2], pts[k * 2 + 1]];
  };
  ctx.beginPath();
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

// Little running stitches along the current path (call after building a path).
export function stitches(ctx, colour = 'rgba(255,255,255,0.75)', lw = 2.5, dash = 7) {
  ctx.save();
  ctx.setLineDash([dash, dash * 0.9]);
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.strokeStyle = colour;
  ctx.stroke();
  ctx.restore();
}

// A soft white shine, top-left of a round thing.
export function shine(ctx, x, y, r, alpha = 0.55) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = '#ffffff';
  ellipse(ctx, x, y, r, r * 0.62, -0.6);
  ctx.fill();
  ctx.restore();
}

export function star(ctx, x, y, r, points = 5, inner = 0.48, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = rot + (i * Math.PI) / points;
    const rr = i % 2 ? r * inner : r;
    if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

export function heart(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.95);
  ctx.bezierCurveTo(x - r * 1.5, y - r * 0.05, x - r * 0.75, y - r * 1.15, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.75, y - r * 1.15, x + r * 1.5, y - r * 0.05, x, y + r * 0.95);
  ctx.closePath();
}

// Big outlined text (titles, the story's words).
export function outlined(ctx, text, x, y, px, fill = C.white, maxW = 0, ink = C.ink) {
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
  ctx.strokeStyle = ink;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  return px;
}

// Splits text into lines no wider than maxW at the current font.
export function wrap(ctx, text, maxW) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(next).width > maxW) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
