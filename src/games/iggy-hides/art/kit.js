// Drawing basics for Where's Iggy? scenes and props: chunky ink-outlined shapes, gradients,
// palms, clouds, water. Everything draws only through the ctx passed in (no DOM), in world
// units. Started from the postcard kit and grown for big pannable scenes.
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

// '#rrggbb' with an alpha, as an rgba() string.
export function alpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export const pick = (r, list) => list[Math.floor(r() * list.length) % list.length];

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
  r = Math.max(0, Math.min(r, w / 2, h / 2));
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

export function rrect(ctx, x, y, w, h, r, fill, lw = 3, stroke = INK) {
  rr(ctx, x, y, w, h, r);
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

export function curve(ctx, x0, y0, cx, cy, x1, y1, colour, lw) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx, cy, x1, y1);
  ctx.stroke();
}

// A thick limb with an ink edge: an ink stroke, then the colour stroke on top.
export function limb(ctx, pts, colour, w, edge = 2.5) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const path = () => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  };
  path();
  ctx.strokeStyle = INK;
  ctx.lineWidth = w + edge * 2;
  ctx.stroke();
  path();
  ctx.strokeStyle = colour;
  ctx.lineWidth = w;
  ctx.stroke();
}

export function shadow(ctx, x, y, rx, ry = rx * 0.28, a = 0.22) {
  ctx.fillStyle = `rgba(22,11,51,${a})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

// A soft glow blob (lamps, neon, fireworks).
export function glow(ctx, x, y, r, colour) {
  ctx.fillStyle = rad(ctx, x, y, 0, r, [[0, colour], [1, 'rgba(0,0,0,0)']]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

export function star(ctx, x, y, r, fill, points = 5, inner = 0.45, lw = 2.5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const k = i % 2 ? r * inner : r;
    ctx.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
  }
  ctx.closePath();
  fs(ctx, fill, lw);
}

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

const FONT = 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
export function label(ctx, text, x, y, px, fill, { stroke = INK, lw = px * 0.18, align = 'center', weight = 900 } = {}) {
  ctx.font = `${weight} ${px}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (lw > 0) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

export function neon(ctx, text, x, y, px, colour) {
  ctx.font = `900 ${px}px ${FONT}`;
  ctx.textAlign = 'center';
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

// Sky band over the full scene width.
export function sky(ctx, W, y0, y1, stops) {
  ctx.fillStyle = lin(ctx, 0, y0, 0, y1, stops);
  ctx.fillRect(0, y0, W, y1 - y0);
}

export function sun(ctx, x, y, r, { core = '#fff6a8', edge = '#ffd23a', glowC = 'rgba(255,230,120,0.45)', rays = 0 } = {}) {
  ctx.fillStyle = rad(ctx, x, y, r * 0.8, r * 2.6, [[0, glowC], [1, 'rgba(255,230,120,0)']]);
  ctx.beginPath();
  ctx.arc(x, y, r * 2.6, 0, TAU);
  ctx.fill();
  if (rays) {
    ctx.fillStyle = 'rgba(255,240,150,0.5)';
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

export function cloud(ctx, x, y, s, fill = '#ffffff', shade = 'rgba(160,190,230,0.55)') {
  const bumps = [[-0.9, 0, 0.42], [-0.42, -0.28, 0.55], [0.15, -0.38, 0.62], [0.68, -0.12, 0.45], [1.0, 0.05, 0.32]];
  ctx.save();
  ctx.beginPath();
  for (const [bx, by, br] of bumps) {
    ctx.moveTo(x + (bx + br) * s, y + by * s);
    ctx.arc(x + bx * s, y + by * s, br * s, 0, TAU);
  }
  ctx.rect(x - 0.9 * s, y - 0.05 * s, 1.9 * s, 0.35 * s);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.ellipse(x + 0.05 * s, y + 0.42 * s, 1.5 * s, 0.32 * s, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

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
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(mx, my, tx, ty);
  ctx.stroke();
}

// A palm tree with a ringed, curving trunk, coconuts and a crown of fronds. (x, y) is the foot.
export function palm(ctx, x, y, h, lean = 0.2, { trunk = '#a8743f', ring = '#6e4426', light = '#3cc25a', dark = '#1d7a33', size = 1, coconuts = true } = {}) {
  const tx = x + lean * h;
  const ty = y - h;
  const cx = x + lean * h * 0.15;
  const cy = y - h * 0.55;
  const w0 = 14 * size;
  const w1 = 8 * size;
  ctx.beginPath();
  ctx.moveTo(x - w0, y);
  ctx.quadraticCurveTo(cx - w0 * 0.8, cy, tx - w1, ty);
  ctx.lineTo(tx + w1, ty);
  ctx.quadraticCurveTo(cx + w0 * 0.8, cy, x + w0, y);
  ctx.closePath();
  fs(ctx, lin(ctx, x - w0, 0, x + w0, 0, [[0, trunk], [1, ring]]), 3);
  ctx.strokeStyle = ring;
  ctx.lineWidth = 2.5;
  for (let k = 0.08; k < 0.96; k += 0.09) {
    const px = (1 - k) * (1 - k) * x + 2 * (1 - k) * k * cx + k * k * tx;
    const py = (1 - k) * (1 - k) * y + 2 * (1 - k) * k * cy + k * k * ty;
    const ww = w0 + (w1 - w0) * k;
    ctx.beginPath();
    ctx.moveTo(px - ww * 0.95, py + 2);
    ctx.quadraticCurveTo(px, py + 6, px + ww * 0.95, py + 2);
    ctx.stroke();
  }
  const L = 85 * size;
  const angles = [-2.9, -2.4, -1.85, -1.3, -0.75, -0.2, 0.3, 3.4];
  angles.forEach((a, i) => frond(ctx, tx, ty, a, L * (0.8 + (i % 3) * 0.12), 15 * size, i % 2 ? light : dark, i % 2 ? dark : '#14592a'));
  if (coconuts) {
    circle(ctx, tx - 7 * size, ty + 9 * size, 7 * size, '#7a4a22', 2.5);
    circle(ctx, tx + 6 * size, ty + 11 * size, 7 * size, '#8a5a2c', 2.5);
  }
}

// A round leafy bush made of overlapping blobs. (x, y) is the bottom centre.
export function bush(ctx, x, y, w, h, { fill = '#3fae4a', dark = '#2a8a3a', light = '#6fd36a', flowers = null, seed = 1 } = {}) {
  const r = rng(seed);
  const n = Math.max(3, Math.round(w / 26));
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const k = (i + 0.5) / n;
    const bx = x - w / 2 + w * k;
    const by = y - h * (0.45 + 0.3 * Math.sin(k * Math.PI)) + (r() - 0.5) * 6;
    const br = (w / n) * (0.75 + r() * 0.2) + h * 0.12;
    ctx.moveTo(bx + br, by);
    ctx.arc(bx, by, br, 0, TAU);
  }
  ctx.rect(x - w / 2 + 6, y - h * 0.45, w - 12, h * 0.45);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fill();
  // leaf marks
  for (let i = 0; i < n * 2; i++) {
    const lx = x - w * 0.4 + r() * w * 0.8;
    const ly = y - h * 0.15 - r() * h * 0.65;
    ctx.strokeStyle = i % 2 ? dark : light;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(lx, ly, 6 + r() * 5, Math.PI * 1.1, Math.PI * 1.8);
    ctx.stroke();
  }
  if (flowers) {
    for (let i = 0; i < n + 2; i++) {
      const fx = x - w * 0.42 + r() * w * 0.84;
      const fy = y - h * 0.2 - r() * h * 0.6;
      circle(ctx, fx, fy, 4.5, flowers, 1.5);
      circle(ctx, fx, fy, 1.6, '#ffe14d', 0);
    }
  }
}

// Water from y0 to y1 across x0..x1 with rows of little wave crests.
export function water(ctx, x0, y0, x1, y1, top, bottom, r, crest = 'rgba(255,255,255,0.5)', rows = 10) {
  ctx.fillStyle = lin(ctx, 0, y0, 0, y1, [[0, top], [1, bottom]]);
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.strokeStyle = crest;
  for (let k = 0; k < rows; k++) {
    const t = (k + 0.5) / rows;
    const y = y0 + (y1 - y0) * t;
    const size = 7 + t * 9;
    ctx.lineWidth = 2 + t * 1.5;
    const n = Math.round(((x1 - x0) / 130) * (1.2 - t * 0.4));
    for (let i = 0; i < n; i++) {
      const x = x0 + ((i + r() * 0.8) / n) * (x1 - x0);
      ctx.beginPath();
      ctx.moveTo(x - size, y);
      ctx.quadraticCurveTo(x - size / 2, y - size * 0.45, x, y);
      ctx.quadraticCurveTo(x + size / 2, y - size * 0.45, x + size, y);
      ctx.stroke();
    }
  }
}

export function speckle(ctx, x, y, w, h, n, colours, r, size = 2) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colours[i % colours.length];
    ctx.beginPath();
    ctx.arc(x + r() * w, y + r() * h, size * (0.5 + r()), 0, TAU);
    ctx.fill();
  }
}

// A grid of windows inside a box; some lit.
export function windows(ctx, x, y, w, h, cols, rows, { glass = '#7fd8ff', lit = '#fff1a0', litChance = 0.3, gap = 0.3, r = null, lw = 2.5 } = {}) {
  const cw = w / cols;
  const ch = h / rows;
  const ww = cw * (1 - gap);
  const wh = ch * (1 - gap);
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const on = r ? r() < litChance : (i + j) % 3 === 0;
      ctx.beginPath();
      ctx.rect(x + i * cw + (cw - ww) / 2, y + j * ch + (ch - wh) / 2, ww, wh);
      fs(ctx, on ? lit : glass, lw);
    }
  }
}

// A striped awning with a scalloped edge, from x to x + w with its top at y.
export function awning(ctx, x, y, w, h, a, b, n = 8) {
  const sw = w / n;
  for (let i = 0; i < n; i++) {
    const sx = x + i * sw;
    ctx.beginPath();
    ctx.moveTo(sx, y);
    ctx.lineTo(sx + sw, y);
    ctx.lineTo(sx + sw, y + h);
    ctx.arc(sx + sw / 2, y + h, sw / 2, 0, Math.PI);
    ctx.closePath();
    fs(ctx, i % 2 ? b : a, 2.5);
  }
  line(ctx, x, y, x + w, y, INK, 3.5);
}

// A string of little party lights or bunting between two points, sagging.
export function bunting(ctx, x0, y0, x1, y1, sag, colours, n = 12, flags = true) {
  curve(ctx, x0, y0, (x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1, INK, 2);
  for (let i = 1; i < n; i++) {
    const k = i / n;
    const px = (1 - k) * (1 - k) * x0 + 2 * (1 - k) * k * ((x0 + x1) / 2) + k * k * x1;
    const py = (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * ((y0 + y1) / 2 + sag * 2) + k * k * y1;
    const c = colours[i % colours.length];
    if (flags) poly(ctx, [[px - 9, py], [px + 9, py], [px, py + 17]], c, 1.5);
    else {
      glow(ctx, px, py + 5, 16, alpha(c, 0.4));
      circle(ctx, px, py + 5, 5, c, 1.5);
    }
  }
}
