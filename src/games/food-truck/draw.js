// Food Truck Chef drawing: buttons and icons, the beach outside the window, the truck from
// outside with whatever has been bought for it, the window view (frame, counter, kitchen row),
// order bubbles, and the launcher tile. Drawing only.
import { INK, TAU, hash, roundRect, drawDish, drawStrip, recipeStrip, mix } from './draw-food.js';
import { heart } from './draw-folks.js';
import { LAYERS } from './recipes.js';

export const C = {
  ink: '#22113a',
  white: '#ffffff',
  sun: '#ffe14d',
  pink: '#ff5fa2',
  teal: '#1fc6c6',
  sea: '#19b8d6',
  sand: '#ffe2a8',
  green: '#3fe07a',
  orange: '#ff8a2a',
  red: '#ff4b4b',
  coin: '#ffc21f',
  steel: '#c9d3df',
  truck: '#fffaf0',
  truckBand: '#1fc6c6',
};

export const font = (px, weight = 900) => `${weight} ${Math.round(px)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;

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
  ctx.fillStyle = filled ? C.sun : 'rgba(34,17,58,0.3)';
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, r * 0.16);
  ctx.strokeStyle = filled ? C.ink : 'rgba(255,255,255,0.6)';
  ctx.stroke();
}

export function drawCoin(ctx, x, y, r, spin = 0) {
  const sx = Math.max(0.15, Math.abs(Math.cos(spin)));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, 1);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fillStyle = C.coin;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.16);
  ctx.strokeStyle = '#8a5a00';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, 0, TAU);
  ctx.strokeStyle = '#e09a00';
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.stroke();
  // a little star stamped on it
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.2 : r * 0.42;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.fillStyle = '#fff1a0';
  ctx.fill();
  ctx.restore();
}

function glyph(ctx, kind, cx, cy, s, colour) {
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
  } else if (kind === 'grid') {
    const g = s * 0.55;
    for (let i = -1; i <= 1; i += 2) for (let j = -1; j <= 1; j += 2) ctx.fillRect(cx + i * g * 0.9 - g * 0.4, cy + j * g * 0.9 - g * 0.4, g * 0.8, g * 0.8);
  } else if (kind === 'coin') {
    drawCoin(ctx, cx, cy, s * 0.95);
  } else if (kind === 'pan') {
    // a frying pan
    ctx.beginPath();
    ctx.arc(cx - s * 0.2, cy, s * 0.72, 0, TAU);
    ctx.fill();
    ctx.lineWidth = s * 0.3;
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.4, cy - s * 0.1);
    ctx.lineTo(cx + s * 1.15, cy - s * 0.4);
    ctx.stroke();
  } else if (kind === 'gator') {
    ctx.beginPath();
    ctx.ellipse(cx - s * 0.2, cy, s * 0.7, s * 0.55, 0, 0, TAU);
    ctx.fill();
    ctx.fillRect(cx, cy - s * 0.25, s * 1.1, s * 0.5);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - s * 0.35, cy - s * 0.25, s * 0.18, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function drawButton(ctx, b, fill = C.sun) {
  ctx.fillStyle = 'rgba(34,17,58,0.35)';
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
  const room = b.w * (hasIcon ? 0.62 : 0.86);
  if (tw > room) {
    ctx.font = font((px * room) / tw);
    tw = room;
  }
  const gw = hasIcon ? b.h * 0.6 : 0;
  const cx = b.x + b.w / 2 + gw / 2;
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.label, cx, b.y + b.h / 2 + 1);
  if (hasIcon) glyph(ctx, b.glyph, cx - tw / 2 - gw * 0.7, b.y + b.h / 2, b.h * 0.22, b.glyph === 'coin' ? C.coin : C.ink);
}

export function drawIconButton(ctx, b) {
  ctx.fillStyle = 'rgba(34,17,58,0.4)';
  roundRect(ctx, b.x, b.y, b.w, b.h, b.w * 0.24);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.stroke();
  glyph(ctx, b.icon, b.x + b.w / 2, b.y + b.h / 2, b.w * 0.3, C.white);
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

// ---------------------------------------------------------------------------------------------
// The beach outside
// ---------------------------------------------------------------------------------------------

export function drawBeach(ctx, x0, y0, w, h, t, horizonK = 0.55) {
  const hy = y0 + h * horizonK;
  const sky = ctx.createLinearGradient(0, y0, 0, hy);
  sky.addColorStop(0, '#4fc3ff');
  sky.addColorStop(0.7, '#9fe2ff');
  sky.addColorStop(1, '#ffe7c2');
  ctx.fillStyle = sky;
  ctx.fillRect(x0, y0, w, hy - y0);
  // sun with rays
  const sx = x0 + w * 0.8;
  const sy = y0 + h * 0.2;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(t * 0.15);
  ctx.fillStyle = 'rgba(255,240,150,0.5)';
  for (let i = 0; i < 12; i++) {
    ctx.rotate(TAU / 12);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-8, -h * 0.14);
    ctx.lineTo(8, -h * 0.14);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#ffe14d';
  ctx.beginPath();
  ctx.arc(sx, sy, h * 0.065, 0, TAU);
  ctx.fill();
  // clouds
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (let i = 0; i < 3; i++) {
    const cx = x0 + ((i * 0.37 + t * 0.008 * (i + 1)) % 1.3 - 0.15) * w;
    const cy = y0 + h * (0.12 + i * 0.09);
    for (let j = 0; j < 4; j++) {
      ctx.beginPath();
      ctx.arc(cx + j * 16 - 24, cy - (j % 2) * 8, 15 + (j % 2) * 6, 0, TAU);
      ctx.fill();
    }
  }
  // sea
  const sea = ctx.createLinearGradient(0, hy, 0, hy + h * 0.16);
  sea.addColorStop(0, '#13a6d1');
  sea.addColorStop(1, '#3fd8e0');
  ctx.fillStyle = sea;
  ctx.fillRect(x0, hy, w, h * 0.17);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 3;
  for (let r = 0; r < 3; r++) {
    ctx.beginPath();
    const yy = hy + h * (0.03 + r * 0.045);
    for (let i = 0; i <= 24; i++) {
      const xx = x0 + (i / 24) * w;
      ctx.lineTo(xx, yy + Math.sin(i * 1.4 + t * 1.6 + r) * 2.5);
    }
    ctx.stroke();
  }
  // a sailboat far out
  const bx = x0 + ((t * 0.01) % 1) * w;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(bx, hy - 2);
  ctx.lineTo(bx + 4, hy - 26);
  ctx.lineTo(bx + 18, hy - 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ff5fa2';
  ctx.fillRect(bx - 6, hy - 3, 28, 4);
  // sand
  const sandY = hy + h * 0.16;
  const sand = ctx.createLinearGradient(0, sandY, 0, y0 + h);
  sand.addColorStop(0, '#fff0c8');
  sand.addColorStop(1, '#f6cf86');
  ctx.fillStyle = sand;
  ctx.beginPath();
  ctx.moveTo(x0, sandY);
  for (let i = 0; i <= 12; i++) ctx.lineTo(x0 + (i / 12) * w, sandY + Math.sin(i * 1.3 + t * 1.2) * 3);
  ctx.lineTo(x0 + w, y0 + h);
  ctx.lineTo(x0, y0 + h);
  ctx.fill();
  // a pastel lifeguard tower
  const lx = x0 + w * 0.12;
  const ly = sandY + h * 0.02;
  ctx.fillStyle = '#ff9ec7';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  roundRect(ctx, lx - 22, ly - 40, 44, 26, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#7fe0ff';
  ctx.beginPath();
  ctx.moveTo(lx - 28, ly - 40);
  ctx.lineTo(lx, ly - 58);
  ctx.lineTo(lx + 28, ly - 40);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#8a6a4a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(lx - 16, ly - 14);
  ctx.lineTo(lx - 20, ly + 10);
  ctx.moveTo(lx + 16, ly - 14);
  ctx.lineTo(lx + 20, ly + 10);
  ctx.stroke();
  // palm tree on the right
  drawPalm(ctx, x0 + w * 0.93, sandY + h * 0.05, Math.min(h * 0.0042, w * 0.0024), t);
}

export function drawPalm(ctx, x, y, k, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k * 60, k * 60);
  ctx.strokeStyle = '#8a5a2a';
  ctx.lineWidth = 0.22;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-0.3, -1.5, 0.2, -3);
  ctx.stroke();
  ctx.strokeStyle = '#6b4520';
  ctx.lineWidth = 0.04;
  for (let i = 0; i < 8; i++) {
    const yy = -i * 0.36;
    ctx.beginPath();
    ctx.moveTo(-0.12, yy);
    ctx.lineTo(0.1, yy - 0.05);
    ctx.stroke();
  }
  const sway = Math.sin(t * 1.2) * 0.08;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.55 + sway;
    ctx.fillStyle = i % 2 ? '#2fae4a' : '#45c457';
    ctx.beginPath();
    ctx.moveTo(0.2, -3);
    ctx.quadraticCurveTo(0.2 + Math.cos(a - 0.3) * 1.2, -3 + Math.sin(a - 0.3) * 1.2 - 0.3, 0.2 + Math.cos(a) * 1.7, -3 + Math.sin(a) * 1.0 + 0.6);
    ctx.quadraticCurveTo(0.2 + Math.cos(a + 0.3) * 0.9, -3 + Math.sin(a + 0.3) * 0.9, 0.2, -3);
    ctx.fill();
  }
  ctx.fillStyle = '#7a4a2a';
  for (const [cx, cy] of [[0.05, -2.85], [0.35, -2.8], [0.2, -2.65]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 0.14, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// The truck and its decorations
// ---------------------------------------------------------------------------------------------

export const AWNING_COLS = {
  'awning-pink': ['#ff5fa2', '#ffffff'],
  'awning-teal': ['#1fc6c6', '#ffffff'],
  'awning-lime': ['#7ed63a', '#ffffff'],
  'awning-sunset': ['#ff7a1a', '#ffe14d'],
  'awning-purple': ['#8a4fff', '#ffd0f0'],
};

// Scalloped stripy awning edge from x0 to x1 hanging from y, depth d.
export function drawAwning(ctx, x0, x1, y, d, awning, t = 0) {
  const [a, b] = AWNING_COLS[awning] || AWNING_COLS['awning-pink'];
  const n = Math.max(5, Math.round((x1 - x0) / 34));
  const sw = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const sx = x0 + i * sw;
    ctx.beginPath();
    ctx.moveTo(sx, y);
    ctx.lineTo(sx + sw, y);
    ctx.lineTo(sx + sw, y + d * 0.7);
    ctx.arc(sx + sw / 2, y + d * 0.7, sw / 2, 0, Math.PI);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? b : a;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  ctx.fillStyle = mix(a, '#22113a', 0.25);
  ctx.fillRect(x0, y - 6, x1 - x0, 8);
}

// String lights along a sagging line, blinking.
export function drawLights(ctx, x0, x1, y, sag, t) {
  ctx.strokeStyle = '#3a2a4a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.quadraticCurveTo((x0 + x1) / 2, y + sag * 2, x1, y);
  ctx.stroke();
  const cols = ['#ff4b4b', '#ffe14d', '#3fe07a', '#3ab8ff', '#ff5fa2'];
  const n = Math.max(6, Math.round((x1 - x0) / 30));
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const xx = x0 + (x1 - x0) * k;
    const yy = y + sag * 4 * k * (1 - k) + 6;
    const on = (Math.floor(t * 3) + i) % 3 !== 0;
    ctx.fillStyle = on ? cols[i % cols.length] : mix(cols[i % cols.length], '#22113a', 0.5);
    if (on) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(xx, yy, 10, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.ellipse(xx, yy, 4.5, 6.5, 0, 0, TAU);
    ctx.fill();
  }
}

export function drawDisco(ctx, x, y, r, t) {
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 2.2);
  ctx.lineTo(x, y - r);
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = '#b8c4d8';
  ctx.fill();
  ctx.clip();
  const n = 6;
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const lit = (Math.floor(t * 6) + i * 3 + j * 7) % 5 === 0;
      ctx.fillStyle = lit ? '#ffffff' : (i + j) % 2 ? '#8a96aa' : '#d8e0ee';
      ctx.fillRect(x + i * r / 3 - r / 6 + ((t * 8) % (r / 3)), y + j * r / 3 - r / 6, r / 3 - 1, r / 3 - 1);
    }
  }
  ctx.restore();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
}

// Coloured spots the disco ball throws around.
export function drawDiscoSpots(ctx, x0, y0, w, h, t) {
  const cols = ['#ff5fa2', '#3ab8ff', '#ffe14d', '#3fe07a'];
  ctx.save();
  ctx.globalAlpha = 0.22;
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = cols[i % 4];
    const xx = x0 + ((hash(i) + t * 0.05 * (1 + hash(i + 3))) % 1) * w;
    const yy = y0 + hash(i + 7) * h;
    ctx.beginPath();
    ctx.arc(xx, yy, 6 + hash(i + 2) * 6, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function drawParrot(ctx, x, y, k, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.rotate(Math.sin(t * 2) * 0.06);
  const lw = 2.5;
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  // tail
  for (const [c, a] of [['#3ab8ff', 0.2], ['#ffe14d', 0], ['#e8303a', -0.2]]) {
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(-6, 10);
    ctx.lineTo(-4, 52);
    ctx.lineTo(6, 52);
    ctx.lineTo(6, 10);
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // body
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 24, 0.15, 0, TAU);
  ctx.fillStyle = '#e8303a';
  ctx.fill();
  ctx.stroke();
  // wing
  ctx.beginPath();
  ctx.ellipse(6, 4, 9, 17, 0.3, 0, TAU);
  ctx.fillStyle = '#3ab8ff';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffe14d';
  ctx.beginPath();
  ctx.ellipse(8, -4, 7, 6, 0.3, 0, TAU);
  ctx.fill();
  // head
  ctx.beginPath();
  ctx.arc(-2, -26, 13, 0, TAU);
  ctx.fillStyle = '#e8303a';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-6, -28, 5.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(-7, -28, 2.6, 0, TAU);
  ctx.fill();
  // beak
  ctx.beginPath();
  ctx.moveTo(-13, -26);
  ctx.quadraticCurveTo(-24, -24, -18, -12);
  ctx.quadraticCurveTo(-14, -18, -9, -18);
  ctx.closePath();
  ctx.fillStyle = '#ffe48a';
  ctx.fill();
  ctx.stroke();
  // feet
  ctx.strokeStyle = '#8a8a9a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-4, 22);
  ctx.lineTo(-6, 28);
  ctx.moveTo(4, 22);
  ctx.lineTo(4, 28);
  ctx.stroke();
  ctx.restore();
}

function drawSurfboard(ctx, x, y, len, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.ellipse(0, 0, len / 2, len * 0.09, 0, 0, TAU);
  ctx.fillStyle = '#ffe14d';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = '#ff5fa2';
  ctx.fillRect(-len * 0.45, -len * 0.015, len * 0.9, len * 0.03);
  ctx.restore();
}

function drawFlowerBox(ctx, x, y, w, t) {
  for (let i = 0; i < 5; i++) {
    const fx = x - w / 2 + (i + 0.5) * (w / 5);
    ctx.strokeStyle = '#2f8a35';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(fx, y);
    ctx.lineTo(fx + Math.sin(t * 2 + i) * 2, y - 16);
    ctx.stroke();
    const col = ['#ff4f9a', '#ffe14d', '#ff7a1a', '#b07aff', '#ff4b4b'][i];
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * TAU + t * 0.4;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(fx + Math.cos(a) * 5 + Math.sin(t * 2 + i) * 2, y - 18 + Math.sin(a) * 5, 4.5, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath();
    ctx.arc(fx + Math.sin(t * 2 + i) * 2, y - 18, 2.5, 0, TAU);
    ctx.fill();
  }
  roundRect(ctx, x - w / 2, y - 4, w, 16, 4);
  ctx.fillStyle = '#b06a3a';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

// A little chef (Riley) seen in the serving window: (x, y) bottom middle, k scale.
export function drawChefKid(ctx, x, y, k, t) {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 3) * 2 * k);
  ctx.scale(k, k);
  const lw = 3;
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  roundRect(ctx, -30, -40, 60, 50, 18);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -62, 24, 0, TAU);
  ctx.fillStyle = '#f2c29a';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#6b3d1a';
  ctx.beginPath();
  ctx.arc(0, -70, 22, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(-8, -62, 3, 0, TAU);
  ctx.arc(8, -62, 3, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, -56, 8, 0.2, Math.PI - 0.2);
  ctx.stroke();
  // chef hat
  ctx.beginPath();
  ctx.moveTo(-18, -80);
  ctx.lineTo(-20, -96);
  ctx.arc(-12, -104, 11, Math.PI * 0.8, Math.PI * 1.75);
  ctx.arc(2, -110, 13, Math.PI * 1.1, Math.PI * 1.9);
  ctx.arc(14, -102, 11, Math.PI * 1.3, Math.PI * 0.2);
  ctx.lineTo(18, -80);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.stroke();
  // a spatula waving
  ctx.save();
  ctx.translate(36, -34);
  ctx.rotate(0.55 + Math.sin(t * 4) * 0.3);
  ctx.fillStyle = '#9aa6b8';
  ctx.fillRect(-2, -34, 4, 30);
  roundRect(ctx, -9, -50, 18, 18, 3);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

// The food truck side-on: (x, y) where the wheels touch the ground, k scale (400 units long).
export function drawTruck(ctx, x, y, k, deco, t) {
  const owned = new Set(deco.owned || []);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  const lw = 4;
  ctx.lineJoin = 'round';
  // shadow
  ctx.fillStyle = 'rgba(80,50,20,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 200, 14, 0, 0, TAU);
  ctx.fill();
  if (owned.has('surfboard')) drawSurfboard(ctx, 10, -250, 240, -0.04);
  if (owned.has('sign')) {
    // a neon sign with a smoothie and a taco on the roof
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-40, -238);
    ctx.lineTo(-40, -262);
    ctx.moveTo(60, -238);
    ctx.lineTo(60, -262);
    ctx.stroke();
    roundRect(ctx, -90, -330, 200, 76, 18);
    ctx.fillStyle = '#2b1055';
    ctx.fill();
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.save();
    ctx.shadowColor = '#ff5fa2';
    ctx.shadowBlur = 12 + Math.sin(t * 5) * 6;
    roundRect(ctx, -82, -322, 184, 60, 14);
    ctx.strokeStyle = '#ff5fa2';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
    drawDish(ctx, { kind: 'smoothie', fruits: ['strawberry'], toppers: ['straw'] }, -35, -298, 56, t);
    drawDish(ctx, { kind: 'taco', fillings: ['beef', 'lettuce', 'cheese'] }, 55, -292, 70, t);
  }
  // body
  roundRect(ctx, -195, -240, 340, 210, 28);
  ctx.fillStyle = C.truck;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.save();
  roundRect(ctx, -195, -240, 340, 210, 28);
  ctx.clip();
  ctx.fillStyle = C.truckBand;
  ctx.fillRect(-200, -95, 360, 70);
  ctx.fillStyle = '#ff5fa2';
  ctx.fillRect(-200, -103, 360, 10);
  ctx.restore();
  // cab
  ctx.beginPath();
  ctx.moveTo(145, -200);
  ctx.lineTo(178, -200);
  ctx.quadraticCurveTo(205, -195, 210, -150);
  ctx.lineTo(214, -60);
  ctx.quadraticCurveTo(214, -30, 190, -30);
  ctx.lineTo(145, -30);
  ctx.closePath();
  ctx.fillStyle = C.truck;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.truckBand;
  ctx.fillRect(147, -95, 64, 62);
  ctx.beginPath();
  ctx.moveTo(152, -190);
  ctx.lineTo(176, -190);
  ctx.quadraticCurveTo(196, -186, 200, -140);
  ctx.lineTo(152, -140);
  ctx.closePath();
  ctx.fillStyle = '#9fe2ff';
  ctx.fill();
  ctx.stroke();
  // serving window with the chef inside
  roundRect(ctx, -160, -200, 230, 100, 10);
  ctx.fillStyle = '#ffe9c8';
  ctx.fill();
  ctx.stroke();
  if (owned.has('disco')) drawDiscoSpots(ctx, -155, -195, 220, 90, t);
  ctx.save();
  roundRect(ctx, -160, -200, 230, 100, 10);
  ctx.clip();
  drawChefKid(ctx, -40, -96, 0.82, t);
  if (owned.has('disco')) drawDisco(ctx, 30, -168, 14, t);
  ctx.restore();
  // counter shelf with a smoothie on it
  roundRect(ctx, -172, -104, 254, 14, 4);
  ctx.fillStyle = C.steel;
  ctx.fill();
  ctx.stroke();
  drawDish(ctx, { kind: 'smoothie', fruits: ['mango', 'strawberry'], toppers: ['straw', 'umbrella'] }, 30, -128, 44, t);
  // awning
  ctx.save();
  ctx.translate(0, 0);
  drawAwning(ctx, -176, 86, -214, 34, deco.awning, t);
  ctx.restore();
  if (owned.has('lights')) drawLights(ctx, -176, 86, -180, 6, t);
  if (owned.has('flowers')) drawFlowerBox(ctx, -45, -30, 150, t);
  // wheels
  for (const wx of [-120, 140]) {
    ctx.beginPath();
    ctx.arc(wx, -22, 30, 0, TAU);
    ctx.fillStyle = '#2b2b3a';
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(wx, -22, 13, 0, TAU);
    ctx.fillStyle = '#c9d3df';
    ctx.fill();
    ctx.stroke();
  }
  if (owned.has('parrot')) drawParrot(ctx, -120, -268, 1.1, t);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// The window view (from inside the truck)
// ---------------------------------------------------------------------------------------------

export function drawWindowFrame(ctx, FW, L, deco, t) {
  const owned = new Set(deco.owned || []);
  // pillars either side
  ctx.fillStyle = '#e9f6f8';
  ctx.fillRect(0, 0, 12, L.counterY);
  ctx.fillRect(FW - 12, 0, 12, L.counterY);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(-2, -10, 14, L.counterY + 10);
  ctx.strokeRect(FW - 12, -10, 14, L.counterY + 10);
  drawAwning(ctx, 0, FW, 8, 44, deco.awning, t);
  if (owned.has('lights')) drawLights(ctx, 14, FW - 14, 58, 7, t);
  if (owned.has('disco')) {
    drawDiscoSpots(ctx, 14, 60, FW - 28, L.counterY - 70, t);
    drawDisco(ctx, FW * 0.5, 92, 17, t);
  }
  if (owned.has('parrot')) drawParrot(ctx, 30, 86, 0.95, t);
}

export function drawCounter(ctx, FW, FH, L, deco, t) {
  const owned = new Set(deco.owned || []);
  const y = L.counterY;
  // the kitchen wall below: cheerful tiles
  ctx.fillStyle = '#fff6e6';
  ctx.fillRect(0, y, FW, FH - y);
  ctx.strokeStyle = 'rgba(31,198,198,0.25)';
  ctx.lineWidth = 2;
  for (let yy = y + L.counterH; yy < FH; yy += 32) {
    ctx.beginPath();
    ctx.moveTo(0, yy);
    ctx.lineTo(FW, yy);
    ctx.stroke();
  }
  for (let xx = 0; xx < FW; xx += 32) {
    ctx.beginPath();
    ctx.moveTo(xx, y + L.counterH);
    ctx.lineTo(xx, FH);
    ctx.stroke();
  }
  // counter top
  const g = ctx.createLinearGradient(0, y, 0, y + L.counterH);
  g.addColorStop(0, '#eef3f8');
  g.addColorStop(0.3, '#c9d3df');
  g.addColorStop(1, '#9aa8b8');
  ctx.fillStyle = g;
  ctx.fillRect(0, y, FW, L.counterH);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(FW, y);
  ctx.moveTo(0, y + L.counterH);
  ctx.lineTo(FW, y + L.counterH);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(0, y + 4, FW, 4);
  if (owned.has('flowers')) drawFlowerBox(ctx, FW - 120, y + 2, 70, t);
}

export function drawBin(ctx, b, open = 0) {
  const { x, y, r } = b;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.75, y - r * 0.55);
  ctx.lineTo(x + r * 0.75, y - r * 0.55);
  ctx.lineTo(x + r * 0.6, y + r);
  ctx.lineTo(x - r * 0.6, y + r);
  ctx.closePath();
  ctx.fillStyle = '#5a9ad8';
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  for (const k of [-0.3, 0, 0.3]) {
    ctx.beginPath();
    ctx.moveTo(x + k * r, y - r * 0.35);
    ctx.lineTo(x + k * r * 0.85, y + r * 0.8);
    ctx.stroke();
  }
  ctx.translate(x - r * 0.8, y - r * 0.6);
  ctx.rotate(-open * 0.7);
  roundRect(ctx, 0, -r * 0.25, r * 1.6, r * 0.25, r * 0.1);
  ctx.fillStyle = '#3f7ab8';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.stroke();
  roundRect(ctx, r * 0.6, -r * 0.45, r * 0.4, r * 0.22, r * 0.08);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// A sample of each dish for the kitchen row and the free-kitchen picker.
export const SAMPLE = {
  smoothie: { kind: 'smoothie', fruits: ['strawberry', 'banana'], toppers: ['straw', 'umbrella'] },
  icecream: { kind: 'icecream', scoops: ['berry', 'mint'], sprinkles: true, cherry: true },
  taco: { kind: 'taco', fillings: ['beef', 'lettuce', 'tomato', 'cheese'] },
  sandwich: { kind: 'sandwich', layers: LAYERS },
  fried: { kind: 'fried', pieces: ['churro', 'churro', 'churro'], shake: 'sugar', cooks: ['good', 'good', 'good'] },
  pizza: { kind: 'pizza', toppings: ['pepperoni', 'pepperoni', 'pepperoni', 'pepperoni', 'mushroom', 'mushroom'], cheese: true },
};
const TILE_COL = { smoothie: '#ff9ec7', icecream: '#9ee8ff', taco: '#ffd27a', sandwich: '#ffb27a', fried: '#ff8a8a', pizza: '#b8f08a' };

// One appliance tile in the kitchen row: open (lit), glow (this one's wanted) or locked.
export function drawAppliance(ctx, a, t, { locked = false, glow = 0 } = {}) {
  const bounce = glow ? Math.abs(Math.sin(t * 5)) * 6 : 0;
  ctx.save();
  ctx.translate(0, -bounce);
  if (glow) {
    ctx.save();
    ctx.shadowColor = '#ffe14d';
    ctx.shadowBlur = 18;
    roundRect(ctx, a.x, a.y, a.w, a.h, 18);
    ctx.fillStyle = '#ffe14d';
    ctx.fill();
    ctx.restore();
  }
  roundRect(ctx, a.x, a.y, a.w, a.h, 18);
  ctx.fillStyle = TILE_COL[a.kind];
  ctx.fill();
  ctx.lineWidth = glow ? 5 : 3;
  ctx.strokeStyle = glow ? '#ff7a1a' : INK;
  ctx.stroke();
  ctx.save();
  roundRect(ctx, a.x, a.y, a.w, a.h, 18);
  ctx.clip();
  const s = Math.min(a.w * 0.8, a.h * 0.92);
  drawDish(ctx, SAMPLE[a.kind], a.x + a.w / 2, a.y + a.h * 0.5, s, t);
  ctx.restore();
  if (locked) {
    roundRect(ctx, a.x, a.y, a.w, a.h, 18);
    ctx.fillStyle = 'rgba(34,17,58,0.6)';
    ctx.fill();
    drawLock(ctx, a.x + a.w / 2, a.y + a.h / 2, Math.min(a.w, a.h) * 0.16);
  }
  ctx.restore();
}

// A speech bubble with the dishes wanted. state per item: 'todo' | 'cooking' | 'ready' | 'done'.
export function drawBubble(ctx, b, items, states, t, { pop = 1, patience = null, hintItem = -1 } = {}) {
  ctx.save();
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  ctx.translate(cx, cy);
  ctx.scale(pop, pop);
  ctx.translate(-cx, -cy);
  ctx.fillStyle = 'rgba(34,17,58,0.25)';
  roundRect(ctx, b.x + 4, b.y + 6, b.w, b.h, 26);
  ctx.fill();
  roundRect(ctx, b.x, b.y, b.w, b.h, 26);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // tail toward the speaker
  const tx = Math.max(b.x + 30, Math.min(b.x + b.w - 30, b.tail.x));
  const below = b.tail.y > b.y + b.h;
  ctx.beginPath();
  if (below) {
    ctx.moveTo(tx - 16, b.y + b.h - 2);
    ctx.lineTo(b.tail.x - 4, b.tail.y);
    ctx.lineTo(tx + 14, b.y + b.h - 2);
  } else {
    ctx.moveTo(b.x + 2, b.y + b.h * 0.55);
    ctx.lineTo(b.tail.x, b.tail.y);
    ctx.lineTo(b.x + 2, b.y + b.h * 0.8);
  }
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(below ? tx - 14 : b.x - 1, below ? b.y + b.h - 8 : b.y + b.h * 0.55 + 3, below ? 26 : 6, below ? 8 : b.h * 0.25 - 6);
  const n = items.length;
  const pad = 10;
  const cw = (b.w - pad * 2) / n;
  items.forEach((o, i) => {
    const x = b.x + pad + cw * i + cw / 2;
    const stripH = Math.min(34, b.h * 0.2);
    const picH = b.h - pad * 2 - stripH - 4;
    const s = Math.min(cw * 0.95, picH * 1.05);
    const st = states[i];
    ctx.save();
    if (st === 'done') ctx.globalAlpha = 0.35;
    const wig = i === hintItem ? Math.sin(t * 10) * 0.06 : 0;
    ctx.translate(x, b.y + pad + picH / 2 + 4);
    ctx.rotate(wig);
    drawDish(ctx, o, 0, 0, s, t);
    ctx.restore();
    drawStrip(ctx, recipeStrip(o), x, b.y + b.h - pad - stripH / 2, stripH * 0.46, cw - 8);
    if (st === 'cooking' || st === 'ready' || st === 'done') {
      const bx = x + cw * 0.36;
      const by = b.y + pad + 14;
      ctx.beginPath();
      ctx.arc(bx, by, 14, 0, TAU);
      ctx.fillStyle = st === 'cooking' ? '#ffb627' : '#3fe07a';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (st === 'cooking') {
        ctx.arc(bx, by, 7, t * 6, t * 6 + 4);
      } else {
        ctx.moveTo(bx - 6, by);
        ctx.lineTo(bx - 1, by + 5);
        ctx.lineTo(bx + 7, by - 6);
      }
      ctx.stroke();
    }
    if (n > 1 && i > 0) {
      ctx.strokeStyle = 'rgba(34,17,58,0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b.x + pad + cw * i, b.y + 16);
      ctx.lineTo(b.x + pad + cw * i, b.y + b.h - 16);
      ctx.stroke();
    }
  });
  ctx.restore();
  if (patience !== null) {
    // a row of hearts that empties
    const hw = Math.min(b.w * 0.5, 110);
    const hx = b.x + b.w - hw - 12;
    const hy = b.y + b.h + 16;
    const n2 = 5;
    for (let i = 0; i < n2; i++) {
      const full = patience * n2 - i;
      const k = Math.max(0, Math.min(1, full));
      const px = hx + (i + 0.5) * (hw / n2);
      heart(ctx, px, hy, 9, k > 0.5 ? '#ff3d7a' : k > 0 ? '#ffa0bf' : '#e8dde8');
    }
  }
}

// The order card in the corner of a station: the picture and its strip.
export function drawOrderCard(ctx, card, o, t, wrongAt = -1) {
  const shake = wrongAt >= 0 && t - wrongAt < 0.5 ? Math.sin((t - wrongAt) * 50) * 5 : 0;
  ctx.save();
  ctx.translate(shake, 0);
  ctx.fillStyle = 'rgba(34,17,58,0.3)';
  roundRect(ctx, card.x + 3, card.y + 5, card.w, card.h, 20);
  ctx.fill();
  roundRect(ctx, card.x, card.y, card.w, card.h, 20);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // pinned with a little tack
  ctx.beginPath();
  ctx.arc(card.x + 16, card.y + 16, 6, 0, TAU);
  ctx.fillStyle = '#3ab8ff';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.stroke();
  const stripH = Math.min(36, card.h * 0.22);
  const picH = card.h - stripH - 18;
  drawDish(ctx, o, card.x + card.w / 2, card.y + 8 + picH / 2, Math.min(card.w * 0.9, picH), t);
  drawStrip(ctx, recipeStrip(o), card.x + card.w / 2, card.y + card.h - 8 - stripH / 2, stripH * 0.46, card.w - 10);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// The launcher tile: the truck bobbing on the beach, steam puffing, a smoothie spinning
// ---------------------------------------------------------------------------------------------

export function drawTile(ctx, x, y, w, h, time) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  drawBeach(ctx, x, y, w, h, time, 0.42);
  const k = (w / 470) * (1 + Math.sin(time * 3) * 0.01);
  const owned = Math.floor(time / 3) % 2 ? ['lights', 'parrot', 'sign'] : ['lights', 'disco', 'flowers'];
  drawTruck(ctx, x + w * 0.48, y + h * 0.94 - Math.abs(Math.sin(time * 4)) * h * 0.012, k, { awning: 'awning-pink', owned }, time);
  // steam puffs from the roof
  for (let i = 0; i < 3; i++) {
    const tt = (time * 0.6 + i / 3) % 1;
    ctx.globalAlpha = 0.7 * (1 - tt);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + w * 0.3 + Math.sin(tt * 6 + i) * 6, y + h * 0.42 - tt * h * 0.2, w * (0.03 + tt * 0.04), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
