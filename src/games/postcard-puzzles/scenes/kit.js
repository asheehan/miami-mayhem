// Shared bits for the postcard scenes. Everything draws only through the ctx passed in
// (no DOM), in the scene's own 600 x 800 units, set up by begin().
export const SW = 600;
export const SH = 800;
export const TAU = Math.PI * 2;
export const INK = '#160b33';

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

// Scales the ctx so a scene can draw in 600 x 800 units whatever the target size.
export function begin(ctx, w, h) {
  ctx.save();
  ctx.scale(w / SW, h / SH);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}
export const end = (ctx) => ctx.restore();

export function lin(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([at, c]) => g.addColorStop(at, c));
  return g;
}

export function rad(ctx, x, y, r0, r1, stops) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  stops.forEach(([at, c]) => g.addColorStop(at, c));
  return g;
}

export function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Fills the current path, then outlines it in ink.
export function fs(ctx, fill, lw = 3, stroke = INK) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

export function rect(ctx, x, y, w, h, fill, lw = 3, stroke = INK) {
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  fs(ctx, fill, lw, stroke);
}

export function circle(ctx, x, y, r, fill, lw = 3, stroke = INK) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  fs(ctx, fill, lw, stroke);
}

export function ellipse(ctx, x, y, rx, ry, fill, lw = 3, stroke = INK, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  fs(ctx, fill, lw, stroke);
}

export function poly(ctx, pts, fill, lw = 3, stroke = INK) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  fs(ctx, fill, lw, stroke);
}

export function line(ctx, x0, y0, x1, y1, colour, lw) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

// A sky band from y0 to y1.
export function sky(ctx, stops, y0 = 0, y1 = SH) {
  ctx.fillStyle = lin(ctx, 0, y0, 0, y1, stops);
  ctx.fillRect(0, y0, SW, y1 - y0);
}

// A sun with a soft glow and optional rays.
export function sun(ctx, x, y, r, { core = '#fff6a8', edge = '#ffd23a', glow = 'rgba(255,230,120,0.45)', rays = 0, rayColour = 'rgba(255,240,150,0.5)' } = {}) {
  ctx.fillStyle = rad(ctx, x, y, r * 0.8, r * 2.6, [[0, glow], [1, 'rgba(255,230,120,0)']]);
  ctx.beginPath();
  ctx.arc(x, y, r * 2.6, 0, TAU);
  ctx.fill();
  if (rays) {
    ctx.fillStyle = rayColour;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * TAU;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a - 0.08) * r * 1.2, y + Math.sin(a - 0.08) * r * 1.2);
      ctx.lineTo(x + Math.cos(a) * r * 2.1, y + Math.sin(a) * r * 2.1);
      ctx.lineTo(x + Math.cos(a + 0.08) * r * 1.2, y + Math.sin(a + 0.08) * r * 1.2);
      ctx.fill();
    }
  }
  ctx.fillStyle = rad(ctx, x - r * 0.3, y - r * 0.3, r * 0.1, r, [[0, core], [1, edge]]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

// A puffy cloud: a flat bottom and three to five bumps, with a shaded underside.
export function cloud(ctx, x, y, s, fill = '#ffffff', shade = 'rgba(160,190,230,0.55)', lw = 0) {
  const bumps = [[-0.9, 0, 0.42], [-0.42, -0.28, 0.55], [0.15, -0.38, 0.62], [0.68, -0.12, 0.45], [1.0, 0.05, 0.32]];
  const path = () => {
    ctx.beginPath();
    for (const [bx, by, br] of bumps) {
      ctx.moveTo(x + (bx + br) * s, y + by * s);
      ctx.arc(x + bx * s, y + by * s, br * s, 0, TAU);
    }
    ctx.rect(x - 0.9 * s, y - 0.05 * s, 1.9 * s, 0.35 * s);
  };
  ctx.save();
  path();
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
  }
  ctx.clip();
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.ellipse(x + 0.05 * s, y + 0.42 * s, 1.5 * s, 0.32 * s, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// A flat cloud streak for sunset skies.
export function streak(ctx, x, y, w, h, fill) {
  ctx.fillStyle = fill;
  rr(ctx, x, y, w, h, h / 2);
  ctx.fill();
}

// One palm frond from (x, y) at angle a (radians, 0 = right), drooping.
export function frond(ctx, x, y, a, len, wid, light, dark) {
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const droop = len * 0.35 * Math.abs(ca);
  const tx = x + ca * len;
  const ty = y + sa * len + droop;
  const mx = x + ca * len * 0.55;
  const my = y + sa * len * 0.55 - len * 0.08;
  const nx = -sa * wid;
  const ny = ca * wid;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(mx + nx, my + ny, tx, ty);
  ctx.quadraticCurveTo(mx - nx, my - ny, x, y);
  ctx.fillStyle = light;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // leaflet notches and the midrib
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(mx, my, tx, ty);
  ctx.stroke();
  for (let k = 0.2; k < 0.9; k += 0.14) {
    const px = x + (tx - x) * k + (mx - (x + tx) / 2) * 2 * k * (1 - k);
    const py = y + (ty - y) * k + (my - (y + ty) / 2) * 2 * k * (1 - k);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + nx * 0.8 * (1 - k) + ca * 6, py + ny * 0.8 * (1 - k) + sa * 6);
    ctx.moveTo(px, py);
    ctx.lineTo(px - nx * 0.8 * (1 - k) + ca * 6, py - ny * 0.8 * (1 - k) + sa * 6);
    ctx.stroke();
  }
}

// A palm tree with a ringed, curving trunk, coconuts and a crown of fronds.
export function palm(ctx, x, y, h, lean = 0.2, { trunk = '#a8743f', ring = '#6e4426', light = '#3cc25a', dark = '#1d7a33', size = 1, coconuts = true } = {}) {
  const tx = x + lean * h;
  const ty = y - h;
  const cx = x + lean * h * 0.15;
  const cy = y - h * 0.55;
  const w0 = 16 * size;
  const w1 = 9 * size;
  ctx.beginPath();
  ctx.moveTo(x - w0, y);
  ctx.quadraticCurveTo(cx - w0 * 0.8, cy, tx - w1, ty);
  ctx.lineTo(tx + w1, ty);
  ctx.quadraticCurveTo(cx + w0 * 0.8, cy, x + w0, y);
  ctx.closePath();
  fs(ctx, lin(ctx, x - w0, 0, x + w0, 0, [[0, trunk], [1, ring]]), 3);
  ctx.strokeStyle = ring;
  ctx.lineWidth = 2.5;
  for (let k = 0.06; k < 0.96; k += 0.075) {
    const px = (1 - k) * (1 - k) * x + 2 * (1 - k) * k * cx + k * k * tx;
    const py = (1 - k) * (1 - k) * y + 2 * (1 - k) * k * cy + k * k * ty;
    const ww = w0 + (w1 - w0) * k;
    ctx.beginPath();
    ctx.moveTo(px - ww * 0.95, py + 2);
    ctx.quadraticCurveTo(px, py + 7, px + ww * 0.95, py + 2);
    ctx.stroke();
  }
  const L = 95 * size;
  const angles = [-2.9, -2.4, -1.85, -1.3, -0.75, -0.2, 0.3, 3.4];
  angles.forEach((a, i) => frond(ctx, tx, ty, a, L * (0.8 + (i % 3) * 0.12), 17 * size, i % 2 ? light : dark, i % 2 ? dark : '#14592a'));
  if (coconuts) {
    circle(ctx, tx - 8 * size, ty + 10 * size, 8 * size, '#7a4a22', 2.5);
    circle(ctx, tx + 7 * size, ty + 12 * size, 8 * size, '#8a5a2c', 2.5);
    circle(ctx, tx, ty + 4 * size, 7 * size, '#6b3f1c', 2.5);
  }
}

// Water from y0 to y1 with rows of little wave crests.
export function sea(ctx, y0, y1, top, bottom, r, crest = 'rgba(255,255,255,0.55)', rows = 9) {
  ctx.fillStyle = lin(ctx, 0, y0, 0, y1, [[0, top], [1, bottom]]);
  ctx.fillRect(0, y0, SW, y1 - y0);
  ctx.strokeStyle = crest;
  for (let k = 0; k < rows; k++) {
    const t = (k + 0.5) / rows;
    const y = y0 + (y1 - y0) * t * t * 0.95 + 4;
    const size = 6 + t * 16;
    ctx.lineWidth = 1.5 + t * 2.5;
    const n = Math.round(5 + (1 - t) * 6);
    for (let i = 0; i < n; i++) {
      const x = ((i + r() * 0.8) / n) * SW;
      ctx.beginPath();
      ctx.moveTo(x - size, y);
      ctx.quadraticCurveTo(x - size / 2, y - size * 0.45, x, y);
      ctx.quadraticCurveTo(x + size / 2, y - size * 0.45, x + size, y);
      ctx.stroke();
    }
  }
}

// Speckles (sand grains, stars, foam).
export function speckle(ctx, x, y, w, h, n, colours, r, size = 2) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colours[i % colours.length];
    ctx.beginPath();
    ctx.arc(x + r() * w, y + r() * h, size * (0.5 + r()), 0, TAU);
    ctx.fill();
  }
}

// A seagull: a little "m" of wings.
export function gull(ctx, x, y, s, colour = INK) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(2, s * 0.18);
  ctx.beginPath();
  ctx.moveTo(x - s, y);
  ctx.quadraticCurveTo(x - s * 0.5, y - s * 0.6, x, y);
  ctx.quadraticCurveTo(x + s * 0.5, y - s * 0.6, x + s, y);
  ctx.stroke();
}

// A grid of windows inside a box; some lit.
export function windows(ctx, x, y, w, h, cols, rows, { frame = INK, glass = '#7fd8ff', lit = '#fff1a0', litChance = 0.3, gap = 0.3, r = null, lw = 2 } = {}) {
  const cw = w / cols;
  const ch = h / rows;
  const ww = cw * (1 - gap);
  const wh = ch * (1 - gap);
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const on = r ? r() < litChance : (i + j) % 3 === 0;
      ctx.beginPath();
      ctx.rect(x + i * cw + (cw - ww) / 2, y + j * ch + (ch - wh) / 2, ww, wh);
      fs(ctx, on ? lit : glass, lw, frame);
    }
  }
}

export function star(ctx, x, y, r, fill, points = 5, inner = 0.45, lw = 2.5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const rr2 = i % 2 ? r * inner : r;
    ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2);
  }
  ctx.closePath();
  fs(ctx, fill, lw);
}

// A twinkle: a thin four-point sparkle.
export function twinkle(ctx, x, y, r, colour = '#ffffff') {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

// Text with a chunky ink outline.
export function label(ctx, text, x, y, px, fill, { stroke = INK, lw = px * 0.18, align = 'center', font = 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif', weight = 900 } = {}) {
  ctx.font = `${weight} ${px}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

// Neon tube text: a wide soft glow, a coloured tube and a white-hot core.
export function neon(ctx, text, x, y, px, colour, { font = 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif', align = 'center' } = {}) {
  ctx.font = `900 ${px}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = colour;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = px * 0.4;
  ctx.strokeText(text, x, y);
  ctx.globalAlpha = 1;
  ctx.lineWidth = px * 0.14;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x, y);
}

// A soft glow blob (lamps, neon, fireworks).
export function glow(ctx, x, y, r, colour) {
  ctx.fillStyle = rad(ctx, x, y, 0, r, [[0, colour], [1, 'rgba(0,0,0,0)']]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

// A fish: body ellipse, tail, eye and a stripe.
export function fish(ctx, x, y, s, body, fin, face = 1, stripe = null) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face * s, s);
  poly(ctx, [[-14, 0], [-26, -11], [-24, 0], [-26, 11]], fin, 2.5);
  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 11, 0, 0, TAU);
  fs(ctx, body, 2.5);
  if (stripe) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = stripe;
    ctx.fillRect(-4, -12, 6, 24);
    ctx.fillRect(-14, -12, 4, 24);
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 11, 0, 0, TAU);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  poly(ctx, [[-2, -10], [6, -17], [10, -9]], fin, 2);
  circle(ctx, 9, -2, 3.2, '#ffffff', 1.5);
  circle(ctx, 9.8, -2, 1.6, INK, 0);
  ctx.restore();
}

// Flat-topped hills / far islands.
export function island(ctx, x, y, w, h, fill, lw = 3) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x + w * 0.15, y - h, x + w * 0.85, y - h, x + w, y);
  ctx.closePath();
  fs(ctx, fill, lw);
}

// Bubbles for underwater scenes.
export function bubble(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, TAU);
  ctx.fill();
}
