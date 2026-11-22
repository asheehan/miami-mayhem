// Hurricane Riley drawing. Reads the state and never changes game rules; the only state here
// is cosmetic (wind particles, wakes, cached backgrounds). The field is drawn in its own
// 400 x 640 units under one transform.
import { FIELD_W, FIELD_H, GUST_WIDTH, GUST_SPREAD } from './sim.js';

export const C = {
  sky: '#7fe3ff',
  night: '#123a6b',
  ink: '#160b33',
  white: '#ffffff',
  sun: '#ffe14d',
  pink: '#ff3d9a',
  orange: '#ff8a4c',
  foam: '#c9fbff',
  water: '#19c3d6',
  waterDeep: '#0b8fb0',
  sand: '#f6d892',
  sandDark: '#dcb466',
  leaf: '#2fae4a',
  leafDark: '#1d7a33',
  trunk: '#8a5a3c',
  wood: '#b07a4a',
  woodDark: '#6e4426',
  rock: '#8c8fa3',
  rockDark: '#5c5f75',
  pool: '#3fd2f0',
  poolDeep: '#1aa3d6',
  tile: '#f4f8ff',
  red: '#ff4b4b',
  gull: '#fbfbff',
  gullWing: '#aeb6c8',
  duck: '#ffd23a',
};

export const font = (px, weight = 900) => `${weight} ${Math.round(px)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
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
  }
  ctx.restore();
}

// Square icon buttons along the top: 'home', 'back', 'restart'.
export function drawIconButton(ctx, b) {
  ctx.fillStyle = 'rgba(22,11,51,0.28)';
  roundRect(ctx, b.x, b.y, b.w, b.h, b.w * 0.24);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.stroke();
  glyph(ctx, b.icon, b.x + b.w / 2, b.y + b.h / 2, b.w * 0.3, C.white);
}

// ---------------------------------------------------------------------------------------------
// Little pictures (field units unless said otherwise)
// ---------------------------------------------------------------------------------------------

function shadow(ctx, x, y, rx, ry = rx * 0.6) {
  ctx.fillStyle = 'rgba(22,11,51,0.18)';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 4, rx, ry, 0, 0, TAU);
  ctx.fill();
}

const BALL_COLOURS = [C.red, C.white, '#3a7bff', C.white, C.sun, C.white];
export function drawBall(ctx, x, y, r, spin) {
  shadow(ctx, x, y, r, r * 0.8);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = BALL_COLOURS[i];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r, spin + (i * TAU) / 6, spin + ((i + 1) * TAU) / 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.22, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = C.ink;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(x - r * 0.4, y - r * 0.45, r * 0.22, 0, TAU);
  ctx.fill();
}

export function drawDuck(ctx, x, y, r, face, bob = 0) {
  shadow(ctx, x, y, r, r * 0.7);
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.rotate(face);
  ctx.lineWidth = 2;
  ctx.strokeStyle = C.ink;
  ctx.fillStyle = C.duck;
  ctx.beginPath();
  ctx.ellipse(-r * 0.15, 0, r * 1.05, r * 0.8, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f2b400';
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, 0, r * 0.5, r * 0.45, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = C.duck;
  ctx.beginPath();
  ctx.arc(r * 0.55, 0, r * 0.55, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.orange;
  ctx.beginPath();
  ctx.ellipse(r * 1.15, 0, r * 0.35, r * 0.22, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.ink;
  for (const sy of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(r * 0.7, sy * r * 0.25, r * 0.1, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function drawBoat(ctx, x, y, r, heading, sailPuff, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading);
  ctx.fillStyle = 'rgba(11,80,110,0.35)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.1 + 3, 4, r * 1.5, r * 0.75, 0, 0, TAU);
  ctx.fill();
  // hull (bow points along +x)
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = C.ink;
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.moveTo(r * 1.6, 0);
  ctx.quadraticCurveTo(r * 0.6, -r * 0.85, -r * 1.1, -r * 0.7);
  ctx.lineTo(-r * 1.1, r * 0.7);
  ctx.quadraticCurveTo(r * 0.6, r * 0.85, r * 1.6, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ff6f3c';
  ctx.beginPath();
  ctx.moveTo(r * 1.2, 0);
  ctx.quadraticCurveTo(r * 0.5, -r * 0.55, -r * 0.8, -r * 0.45);
  ctx.lineTo(-r * 0.8, r * 0.45);
  ctx.quadraticCurveTo(r * 0.5, r * 0.55, r * 1.2, 0);
  ctx.closePath();
  ctx.fill();
  // boom and sail, bellying out with the wind
  const flap = Math.sin(t * 9) * 0.06 * (1 - sailPuff);
  const swing = 0.5 + flap;
  ctx.strokeStyle = C.woodDark;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(r * 0.5, 0);
  ctx.lineTo(r * 0.5 - Math.cos(swing) * r * 1.7, Math.sin(swing) * r * 1.7);
  ctx.stroke();
  ctx.fillStyle = '#fffbe8';
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.8;
  const ex = r * 0.5 - Math.cos(swing) * r * 1.7;
  const ey = Math.sin(swing) * r * 1.7;
  const belly = r * (0.35 + sailPuff * 0.7);
  ctx.beginPath();
  ctx.moveTo(r * 0.5, 0);
  ctx.quadraticCurveTo((r * 0.5 + ex) / 2 - Math.sin(swing) * belly, ey / 2 - Math.cos(swing) * belly, ex, ey);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.pink;
  ctx.beginPath();
  ctx.arc(r * 0.5, 0, r * 0.22, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawGull(ctx, g, t) {
  const flying = g.state !== 'walk';
  const face = Math.atan2(g.vy, g.vx || 0.001);
  const r = 14; // drawn a little bigger than its 11-unit body so it reads on a phone
  if (!flying) shadow(ctx, g.x, g.y, r * 0.9, r * 0.6);
  else {
    ctx.fillStyle = 'rgba(22,11,51,0.12)';
    ctx.beginPath();
    ctx.ellipse(g.x + 10, g.y + 16, r, r * 0.5, 0, 0, TAU);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.rotate(face);
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = C.ink;
  if (flying) {
    const f = Math.sin(t * 22 + g.id) * 0.6;
    ctx.fillStyle = C.gullWing;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(r * 0.2, 0);
      ctx.quadraticCurveTo(-r * 0.1, side * r * (1.4 + f), -r * 0.7, side * r * (2.2 + f));
      ctx.quadraticCurveTo(-r * 0.6, side * r * 0.8, -r * 0.5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else {
    // little legs stepping
    const st = Math.sin(t * 14 + g.id) * r * 0.35;
    ctx.strokeStyle = C.orange;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.3);
    ctx.lineTo(st, -r * 0.55);
    ctx.moveTo(0, r * 0.3);
    ctx.lineTo(-st, r * 0.55);
    ctx.stroke();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.8;
  }
  ctx.fillStyle = C.gull;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.6, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  if (!flying) {
    ctx.fillStyle = C.gullWing;
    ctx.beginPath();
    ctx.ellipse(-r * 0.2, 0, r * 0.65, r * 0.42, 0, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = C.gull;
  ctx.beginPath();
  ctx.arc(r * 0.85, 0, r * 0.45, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffb02e';
  ctx.beginPath();
  ctx.moveTo(r * 1.2, -r * 0.14);
  ctx.lineTo(r * 1.75, 0);
  ctx.lineTo(r * 1.2, r * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.ink;
  for (const sy of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(r * 1.0, sy * r * 0.2, r * 0.09, 0, TAU);
    ctx.fill();
  }
  if (g.snack) {
    ctx.fillStyle = '#e8a25a';
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(r * 1.6, -r * 0.5);
    ctx.lineTo(r * 2.3, 0);
    ctx.lineTo(r * 1.6, r * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

// Snack i of the picnic (0..), drawn centred at (x, y) with size r.
export function drawSnack(ctx, i, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = Math.max(1.2, r * 0.14);
  ctx.strokeStyle = C.ink;
  const k = i % 5;
  if (k === 0) {
    // watermelon slice
    ctx.fillStyle = '#3cb44b';
    ctx.beginPath();
    ctx.arc(0, -r * 0.3, r, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff5a6e';
    ctx.beginPath();
    ctx.arc(0, -r * 0.3, r * 0.78, 0.12 * Math.PI, 0.88 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C.ink;
    for (const sx of [-0.3, 0, 0.3]) ctx.fillRect(sx * r - 1, r * 0.1, 2, 3);
  } else if (k === 1) {
    // sandwich
    ctx.fillStyle = '#f7d89a';
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.7);
    ctx.lineTo(r, r * 0.7);
    ctx.lineTo(0, -r * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#5fd35f';
    ctx.fillRect(-r * 0.7, r * 0.45, r * 1.4, r * 0.18);
  } else if (k === 2) {
    // cookie
    ctx.fillStyle = '#d99a52';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#5b3418';
    for (const [a, b] of [[-0.3, -0.3], [0.35, -0.1], [-0.1, 0.35], [0.25, 0.4]]) {
      ctx.beginPath();
      ctx.arc(a * r, b * r, r * 0.13, 0, TAU);
      ctx.fill();
    }
  } else if (k === 3) {
    // grapes
    ctx.fillStyle = '#9b5de5';
    for (const [a, b] of [[-0.35, -0.4], [0.35, -0.4], [0, -0.4], [-0.18, 0], [0.18, 0], [0, 0.4]]) {
      ctx.beginPath();
      ctx.arc(a * r, b * r, r * 0.3, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
  } else {
    // juice box
    ctx.fillStyle = '#ffb02e';
    ctx.fillRect(-r * 0.55, -r * 0.75, r * 1.1, r * 1.5);
    ctx.strokeRect(-r * 0.55, -r * 0.75, r * 1.1, r * 1.5);
    ctx.fillStyle = C.white;
    ctx.fillRect(r * 0.15, -r * 1.2, r * 0.15, r * 0.5);
  }
  ctx.restore();
}

export function drawShell(ctx, x, y, r, t) {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 3 + x) * 1.2);
  // sparkle glow
  const g = 0.45 + Math.sin(t * 4 + y) * 0.2;
  ctx.fillStyle = `rgba(255,255,255,${g * 0.5})`;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffb3c7';
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, r * 0.8);
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.9 + r * 0.1);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#d9607e';
  ctx.lineWidth = 1.2;
  for (let i = 1; i < 5; i++) {
    const a = Math.PI + (i / 5) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.7);
    ctx.lineTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.8 + r * 0.1);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPalm(ctx, d, t) {
  const lx = d.lx * 16;
  const ly = d.ly * 16;
  // trunk seen from above: a short shadowed stub, the crown leaning with the wind
  ctx.fillStyle = 'rgba(22,11,51,0.18)';
  ctx.beginPath();
  ctx.ellipse(d.x + 10, d.y + 12, 26, 14, 0.3, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = C.trunk;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(d.x, d.y);
  ctx.lineTo(d.x + lx * 0.6, d.y + ly * 0.6);
  ctx.stroke();
  const cx = d.x + lx;
  const cy = d.y + ly;
  const sway = Math.sin(t * 1.4 + d.x) * 0.05;
  const stretch = Math.hypot(d.lx, d.ly);
  const la = Math.atan2(d.ly, d.lx);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + sway + d.x * 0.01;
    // fronds on the downwind side stream out longer
    const along = Math.cos(a - la);
    const len = 26 * (1 + stretch * 0.5 * along);
    const ex = cx + Math.cos(a) * len;
    const ey = cy + Math.sin(a) * len;
    ctx.fillStyle = i % 2 ? C.leaf : C.leafDark;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cx + Math.cos(a + 0.35) * len * 0.6, cy + Math.sin(a + 0.35) * len * 0.6, ex, ey);
    ctx.quadraticCurveTo(cx + Math.cos(a - 0.35) * len * 0.6, cy + Math.sin(a - 0.35) * len * 0.6, cx, cy);
    ctx.fill();
  }
  ctx.fillStyle = '#7a4f1f';
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, TAU);
  ctx.fill();
}

function drawUmbrella(ctx, d, t) {
  const r = d.r && d.r > 20 ? d.r : 24;
  if (d.down > 0) {
    // knocked over: lying on its side, rocking, then popping back up
    const k = Math.min(1, (3 - d.down) * 4);
    ctx.save();
    ctx.translate(d.x + d.downX * 18 * k, d.y + d.downY * 18 * k);
    ctx.rotate(Math.atan2(d.downY, d.downX) + Math.sin(t * 8) * 0.08);
    ctx.fillStyle = 'rgba(22,11,51,0.18)';
    ctx.beginPath();
    ctx.ellipse(4, 5, r * 0.55, r, 0, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? C.sun : '#16b3a3';
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, 0);
      ctx.ellipse(0, 0, r * 0.45, r, 0, (i * TAU) / 12 - Math.PI / 2, ((i + 1) * TAU) / 12 - Math.PI / 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.45, r, 0, -Math.PI / 2, Math.PI / 2);
    ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, 0);
    ctx.lineTo(-r * 1.4, 0);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const ox = d.lx * 8;
  const oy = d.ly * 8;
  const wob = Math.hypot(d.lvx, d.lvy) * 0.02;
  ctx.fillStyle = 'rgba(22,11,51,0.18)';
  ctx.beginPath();
  ctx.ellipse(d.x + 8, d.y + 10, r, r * 0.75, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(d.x + ox, d.y + oy);
  ctx.rotate(d.x + wob);
  // a scalloped canopy in teal and yellow, so it never looks like a beach ball
  const ribs = 8;
  ctx.beginPath();
  for (let i = 0; i < ribs; i++) {
    const a0 = (i * TAU) / ribs;
    const a1 = ((i + 1) * TAU) / ribs;
    if (i === 0) ctx.moveTo(Math.cos(a0) * r, Math.sin(a0) * r);
    const am = (a0 + a1) / 2;
    ctx.quadraticCurveTo(Math.cos(am) * r * 0.82, Math.sin(am) * r * 0.82, Math.cos(a1) * r, Math.sin(a1) * r);
  }
  ctx.closePath();
  ctx.fillStyle = '#16b3a3';
  ctx.fill();
  for (let i = 0; i < ribs; i += 2) {
    const a0 = (i * TAU) / ribs;
    const a1 = ((i + 1) * TAU) / ribs;
    const am = (a0 + a1) / 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
    ctx.quadraticCurveTo(Math.cos(am) * r * 0.82, Math.sin(am) * r * 0.82, Math.cos(a1) * r, Math.sin(a1) * r);
    ctx.closePath();
    ctx.fillStyle = C.sun;
    ctx.fill();
  }
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < ribs; i++) {
    const a0 = (i * TAU) / ribs;
    const a1 = ((i + 1) * TAU) / ribs;
    const am = (a0 + a1) / 2;
    if (i === 0) ctx.moveTo(Math.cos(a0) * r, Math.sin(a0) * r);
    ctx.quadraticCurveTo(Math.cos(am) * r * 0.82, Math.sin(am) * r * 0.82, Math.cos(a1) * r, Math.sin(a1) * r);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(22,11,51,0.35)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < ribs; i++) {
    const a = (i * TAU) / ribs;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.stroke();
  }
  ctx.fillStyle = C.white;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawMangrove(ctx, d, t) {
  const ox = d.lx * 5;
  const oy = d.ly * 5;
  // roots and mud ring, then a lumpy leafy crown
  ctx.fillStyle = '#7a5a3a';
  ctx.beginPath();
  ctx.arc(d.x, d.y, d.r + 2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#5b3f25';
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU;
    ctx.beginPath();
    ctx.moveTo(d.x + Math.cos(a) * d.r * 0.7, d.y + Math.sin(a) * d.r * 0.7);
    ctx.quadraticCurveTo(d.x + Math.cos(a + 0.1) * d.r * 1.05, d.y + Math.sin(a + 0.1) * d.r * 1.05, d.x + Math.cos(a) * (d.r + 3), d.y + Math.sin(a) * (d.r + 3));
    ctx.stroke();
  }
  const n = Math.max(6, Math.round(d.r / 7));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + d.x;
    const rr = d.r * 0.62;
    ctx.fillStyle = i % 2 ? C.leaf : '#27984a';
    ctx.beginPath();
    ctx.arc(d.x + ox + Math.cos(a) * rr * 0.75, d.y + oy + Math.sin(a) * rr * 0.75, d.r * 0.42, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#3cc35a';
  ctx.beginPath();
  ctx.arc(d.x + ox * 1.4, d.y + oy * 1.4, d.r * 0.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.arc(d.x + ox * 1.6 - d.r * 0.2, d.y + oy * 1.6 - d.r * 0.25, d.r * 0.22, 0, TAU);
  ctx.fill();
}

function drawTowel(ctx, d) {
  const ox = d.lx * 3;
  const oy = d.ly * 3;
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.rotate(0.2);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i % 2 ? C.white : '#3a7bff';
    ctx.fillRect(-26 + i * 10.4, -16, 10.4, 32);
  }
  // the downwind corner lifts
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.moveTo(26, 16);
  ctx.lineTo(26 + ox * 2, 16 + oy * 2 - Math.abs(ox + oy));
  ctx.lineTo(16, 16);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// The renderer
// ---------------------------------------------------------------------------------------------

export function createRenderer() {
  let cache = null; // { key, canvas }
  let particles = [];
  const seen = new WeakSet();
  const seenGusts = new WeakSet();
  const wakes = new Map();
  let ambientT = 0;

  function staticLayer(level, view) {
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const key = `${level.name}|${view.s}|${dpr}`;
    if (cache && cache.key === key) return cache.canvas;
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(FIELD_W * view.s * dpr));
    cv.height = Math.max(1, Math.round(FIELD_H * view.s * dpr));
    const c = cv.getContext('2d');
    c.scale(view.s * dpr, view.s * dpr);
    paintStatic(c, level);
    cache = { key, canvas: cv };
    return cv;
  }

  function spawnGust(g) {
    const n = Math.round(18 + 42 * g.power);
    for (let i = 0; i < n; i++) {
      const along = Math.random() * g.reach * 0.75 - 10;
      const hw = GUST_WIDTH + Math.max(0, along) * GUST_SPREAD;
      const lat = (Math.random() * 2 - 1) * hw * 0.9;
      const sp = (260 + 520 * g.power) * (0.6 + Math.random() * 0.5);
      particles.push({
        x: g.x + g.dx * along - g.dy * lat,
        y: g.y + g.dy * along + g.dx * lat,
        vx: g.dx * sp,
        vy: g.dy * sp,
        life: 0,
        max: 0.4 + Math.random() * 0.45,
        kind: i % 5 === 0 ? 'leaf' : i % 3 === 0 ? 'sand' : 'streak',
        rot: Math.random() * TAU,
        delay: Math.max(0, along) / 1400,
      });
    }
  }

  function burst(x, y, n, colours, speed = 120, kind = 'spark') {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const sp = speed * (0.4 + Math.random() * 0.8);
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 0.5 + Math.random() * 0.4, kind, colour: colours[i % colours.length], rot: a, delay: 0 });
    }
  }

  function absorb(s) {
    for (const g of s.gusts) {
      if (seenGusts.has(g)) continue;
      seenGusts.add(g);
      spawnGust(g);
    }
    for (const e of s.events) {
      if (seen.has(e)) continue;
      seen.add(e);
      if (e.type === 'shell') burst(e.x, e.y, 16, [C.sun, C.white, '#ffb3c7'], 140);
      else if (e.type === 'bump') burst(e.x, e.y, 6, [C.white, C.foam], 80);
      else if (e.type === 'steal') burst(e.x, e.y, 10, ['#e8a25a', '#ffe0b0'], 90, 'crumb');
      else if (e.type === 'blown') {
        for (let i = 0; i < 4; i++) particles.push({ x: e.x, y: e.y, vx: e.dx * 300 + (Math.random() - 0.5) * 80, vy: e.dy * 300 + (Math.random() - 0.5) * 80, life: 0, max: 1.2, kind: 'napkin', rot: 0, delay: i * 0.05 });
      } else if (e.type === 'topple') burst(e.x, e.y, 12, [C.sandDark, C.sand], 110, 'crumb');
      else if (e.type === 'in') burst(e.x, e.y, 14, [C.white, C.foam, C.pool], 110, 'drop');
      else if (e.type === 'out') burst(e.x, e.y, 8, [C.white, C.foam], 90, 'drop');
    }
  }

  function updateParticles(s, dt) {
    ambientT += dt;
    // a light breeze always drifts a few grains, so the scene is never quite still
    if (ambientT > 0.25) {
      ambientT = 0;
      const sail = s.job === 'sail';
      particles.push({ x: -10, y: Math.random() * FIELD_H, vx: 30 + Math.random() * 25, vy: -6 + Math.random() * 12, life: 0, max: 14, kind: sail ? 'glint' : 'grain', rot: 0, delay: 0 });
    }
    for (const p of particles) {
      if (p.delay > 0) {
        p.delay -= dt;
        continue;
      }
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = p.kind === 'leaf' || p.kind === 'napkin' ? 1.6 : p.kind === 'spark' || p.kind === 'crumb' || p.kind === 'drop' ? 3.5 : 2.4;
      if (p.kind !== 'grain' && p.kind !== 'glint') {
        p.vx *= Math.exp(-k * dt);
        p.vy *= Math.exp(-k * dt);
      }
      p.rot += dt * 6;
    }
    particles = particles.filter((p) => p.life < p.max && p.x < FIELD_W + 40);
    if (particles.length > 600) particles.splice(0, particles.length - 600);
    // wakes behind moving things
    for (const m of s.movers) {
      let w = wakes.get(m.id);
      if (!w) wakes.set(m.id, (w = { pts: [], face: 0, tail: 0 }));
      const sp = Math.hypot(m.vx, m.vy);
      if (sp > 8) w.face = Math.atan2(m.vy, m.vx);
      w.tail += dt;
      if (w.tail > 0.05) {
        w.tail = 0;
        if (sp > 20) w.pts.push({ x: m.x, y: m.y, age: 0 });
      }
      for (const p of w.pts) p.age += dt;
      w.pts = w.pts.filter((p) => p.age < 0.9);
    }
  }

  function drawParticles(ctx, under) {
    for (const p of particles) {
      if (p.delay > 0) continue;
      const a = 1 - p.life / p.max;
      if (p.kind === 'grain' || p.kind === 'glint') {
        if (!under) continue;
        ctx.fillStyle = p.kind === 'glint' ? `rgba(255,255,255,${0.5 * Math.min(1, a * 3)})` : `rgba(160,120,60,${0.5 * Math.min(1, a * 3)})`;
        if (p.kind === 'glint') ctx.fillRect(p.x, p.y, 7, 1.6);
        else ctx.fillRect(p.x, p.y, 2, 2);
        continue;
      }
      if (under) continue;
      if (p.kind === 'streak' || p.kind === 'sand') {
        const len = Math.hypot(p.vx, p.vy) * 0.06;
        const sp = Math.hypot(p.vx, p.vy) || 1;
        ctx.strokeStyle = p.kind === 'sand' ? `rgba(236,200,130,${a * 0.9})` : `rgba(255,255,255,${a * 0.8})`;
        ctx.lineWidth = p.kind === 'sand' ? 2 : 2.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - (p.vx / sp) * len, p.y - (p.vy / sp) * len);
        ctx.stroke();
      } else if (p.kind === 'leaf' || p.kind === 'napkin') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, a * 2);
        ctx.fillStyle = p.kind === 'napkin' ? '#ffe0b0' : C.leaf;
        if (p.kind === 'napkin') ctx.fillRect(-5, -4, 10, 8);
        else {
          ctx.beginPath();
          ctx.ellipse(0, 0, 5, 2.2, 0, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = Math.max(0, a);
        ctx.fillStyle = p.colour || C.white;
        if (p.kind === 'spark') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-3, -1, 6, 2);
          ctx.fillRect(-1, -3, 2, 6);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.kind === 'drop' ? 2.6 : 2, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  // Swooshes: a curved front sweeping along each recent gust.
  function drawGustFronts(ctx, s) {
    for (const g of s.gusts) {
      const at = s.now - g.t;
      if (at < 0 || at > 0.6) continue;
      const along = -10 + at * (500 + 700 * g.power);
      if (along > g.reach) continue;
      const hw = GUST_WIDTH + Math.max(0, along) * GUST_SPREAD;
      const cx = g.x + g.dx * along;
      const cy = g.y + g.dy * along;
      const a = (1 - at / 0.6) * (0.35 + 0.4 * g.power);
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.lineWidth = 3 + 5 * g.power;
      ctx.lineCap = 'round';
      for (const off of [0, -14]) {
        ctx.beginPath();
        const bx = cx + g.dx * off;
        const by = cy + g.dy * off;
        ctx.moveTo(bx - g.dy * hw * 0.8 - g.dx * hw * 0.25, by + g.dx * hw * 0.8 - g.dy * hw * 0.25);
        ctx.quadraticCurveTo(bx + g.dx * hw * 0.15, by + g.dy * hw * 0.15, bx + g.dy * hw * 0.8 - g.dx * hw * 0.25, by - g.dx * hw * 0.8 - g.dy * hw * 0.25);
        ctx.stroke();
        ctx.lineWidth *= 0.5;
      }
    }
  }

  function drawWakes(ctx, s) {
    for (const m of s.movers) {
      const w = wakes.get(m.id);
      if (!w) continue;
      for (const p of w.pts) {
        const a = 1 - p.age / 0.9;
        if (s.job === 'sail') {
          ctx.strokeStyle = `rgba(255,255,255,${a * 0.55})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, m.r * (0.6 + p.age * 1.2), 0, TAU);
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(150,110,50,${a * 0.25})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, m.r * 0.5, 0, TAU);
          ctx.fill();
        }
      }
    }
  }

  function drawGoalGlow(ctx, s, t) {
    const L = s.level;
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    if (s.job === 'sail') {
      const z = L.dock;
      if (s.movers[0].docked) return;
      ctx.strokeStyle = `rgba(255,225,77,${0.55 + pulse * 0.45})`;
      ctx.lineWidth = 4 + pulse * 3;
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -t * 30;
      roundRect(ctx, z.x + 4, z.y + 4, z.w - 8, z.h - 8, 10);
      ctx.stroke();
      ctx.setLineDash([]);
      // a bobbing arrow into the slip
      const ax = z.x + z.w / 2;
      const ay = z.y + z.h + 14 + pulse * 6;
      ctx.fillStyle = C.sun;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ax, ay - 14);
      ctx.lineTo(ax + 12, ay + 2);
      ctx.lineTo(ax + 5, ay + 2);
      ctx.lineTo(ax + 5, ay + 12);
      ctx.lineTo(ax - 5, ay + 12);
      ctx.lineTo(ax - 5, ay + 2);
      ctx.lineTo(ax - 12, ay + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (s.job === 'herd') {
      const p = L.pool;
      ctx.strokeStyle = `rgba(255,225,77,${0.45 + pulse * 0.45})`;
      ctx.lineWidth = 4 + pulse * 3;
      ctx.setLineDash([12, 9]);
      ctx.lineDashOffset = -t * 30;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 10, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawPicnic(ctx, s, t) {
    const sh = s.level.shoo;
    const p = sh.picnic;
    const r = p.r;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(-0.08);
    ctx.fillStyle = 'rgba(22,11,51,0.15)';
    roundRect(ctx, -r + 4, -r + 6, r * 2, r * 2, 8);
    ctx.fill();
    const n = 6;
    const cell = (r * 2) / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        ctx.fillStyle = (i + j) % 2 ? C.white : C.red;
        ctx.fillRect(-r + i * cell, -r + j * cell, cell + 0.5, cell + 0.5);
      }
    }
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = C.ink;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    ctx.restore();
    // snacks in a ring, the basket in the middle
    const total = sh.snacks;
    const danger = s.gulls.some((g) => g.state !== 'flee' && Math.hypot(g.x - p.x, g.y - p.y) < p.r + 60);
    for (let i = 0; i < total; i++) {
      const a = -Math.PI / 2 + (i / total) * TAU;
      const x = p.x + Math.cos(a) * r * 0.58;
      const y = p.y + Math.sin(a) * r * 0.58;
      if (i < s.snacks) drawSnack(ctx, i, x, y + (danger ? Math.sin(t * 20 + i) * 1.2 : 0), r * 0.2);
      else {
        ctx.fillStyle = 'rgba(22,11,51,0.18)';
        ctx.beginPath();
        ctx.arc(x, y, r * 0.14, 0, TAU);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#c98a3e';
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    roundRect(ctx, p.x - 11, p.y - 8, 22, 16, 4);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#8a5a26';
    ctx.beginPath();
    ctx.moveTo(p.x - 11, p.y);
    ctx.lineTo(p.x + 11, p.y);
    ctx.stroke();
  }

  function drawCurrents(ctx, s, t) {
    for (const c of s.level.currents || []) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(c.x, c.y, c.w, c.h);
      const sp = Math.hypot(c.vx, c.vy);
      const dx = c.vx / sp;
      const dy = c.vy / sp;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const row = i % 3;
        const off = ((t * sp + i * 97) % (c.w + 60)) - 30;
        const x = c.x + off;
        const y = c.y + c.h * (0.2 + row * 0.3);
        ctx.beginPath();
        ctx.moveTo(x - dx * 14, y - dy * 14);
        ctx.lineTo(x, y);
        ctx.lineTo(x - dx * 6 - dy * 5, y - dy * 6 + dx * 5);
        ctx.moveTo(x, y);
        ctx.lineTo(x - dx * 6 + dy * 5, y - dy * 6 - dx * 5);
        ctx.stroke();
      }
    }
  }

  // Everything in the field, in field units (the caller has set the transform).
  function drawField(ctx, s, view, t, dt, extras = {}) {
    absorb(s);
    updateParticles(s, dt);
    ctx.drawImage(staticLayer(s.level, view), 0, 0, FIELD_W, FIELD_H);
    drawCurrents(ctx, s, t);
    drawParticles(ctx, true);
    drawGoalGlow(ctx, s, t);
    for (const sh of s.shells) {
      if (!sh.got) drawShell(ctx, sh.x, sh.y, 9, t);
      else if (s.time - sh.gotT < 0.5) {
        const k = (s.time - sh.gotT) / 0.5;
        ctx.globalAlpha = 1 - k;
        drawShell(ctx, sh.x, sh.y - k * 30, 9 * (1 + k), t);
        ctx.globalAlpha = 1;
      }
    }
    if (s.job === 'shoo') drawPicnic(ctx, s, t);
    for (const d of s.decor) if (d.kind === 'towel') drawTowel(ctx, d);
    drawWakes(ctx, s);
    for (const m of s.movers) {
      const w = wakes.get(m.id);
      if (m.kind === 'boat') {
        const sp = Math.hypot(m.vx, m.vy);
        drawBoat(ctx, m.x, m.y, m.r, m.heading, clamp(sp / 250, 0, 1), t);
      } else if (m.kind === 'ball') drawBall(ctx, m.x, m.y, m.r, m.spin * 0.6);
      else drawDuck(ctx, m.x, m.y, m.r, w ? w.face : -Math.PI / 2, m.inPool ? Math.sin(t * 3 + m.id) * 1.2 : 0);
    }
    for (const d of s.decor) {
      if (d.kind === 'mangrove') drawMangrove(ctx, d, t);
      else if (d.kind === 'umbrella') drawUmbrella(ctx, d, t);
    }
    for (const g of s.gulls) if (g.state === 'walk') drawGull(ctx, g, t);
    for (const d of s.decor) if (d.kind === 'palm') drawPalm(ctx, d, t);
    for (const g of s.gulls) if (g.state !== 'walk') drawGull(ctx, g, t);
    if (extras.hint) drawHint(ctx, s, extras.hint, t);
    drawGustFronts(ctx, s);
    drawParticles(ctx, false);
  }

  // A friendly hint: a dashed arrow from the loose thing toward where it should go, and on
  // the first levels a ghost finger showing a swipe.
  function drawHint(ctx, s, hint, t) {
    const a = Math.min(1, hint.alpha);
    if (a <= 0) return;
    ctx.globalAlpha = a;
    if (hint.arrow) {
      const [x0, y0, x1, y1] = hint.arrow;
      const len = Math.hypot(x1 - x0, y1 - y0) || 1;
      const dx = (x1 - x0) / len;
      const dy = (y1 - y0) / len;
      ctx.strokeStyle = C.sun;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.setLineDash([2, 12]);
      ctx.lineDashOffset = -t * 40;
      ctx.beginPath();
      ctx.moveTo(x0 + dx * 22, y0 + dy * 22);
      ctx.lineTo(x1 - dx * 14, y1 - dy * 14);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.sun;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - dx * 18 - dy * 11, y1 - dy * 18 + dx * 11);
      ctx.lineTo(x1 - dx * 18 + dy * 11, y1 - dy * 18 - dx * 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    if (hint.finger) {
      const [x0, y0, x1, y1] = hint.finger;
      const cyc = (t % 1.6) / 1.6;
      const k = clamp((cyc - 0.15) / 0.55, 0, 1);
      const e = k * k * (3 - 2 * k);
      const fx = x0 + (x1 - x0) * e;
      const fy = y0 + (y1 - y0) * e;
      if (k > 0 && k < 1) {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(fx, fy);
        ctx.stroke();
      }
      drawFinger(ctx, fx, fy, 1);
    }
    ctx.globalAlpha = 1;
  }

  return {
    drawField,
    reset() {
      particles = [];
      wakes.clear();
    },
    spawnGust,
  };
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

function paintStatic(c, L) {
  const water = L.job === 'sail';
  if (water) {
    const g = c.createLinearGradient(0, 0, 0, FIELD_H);
    g.addColorStop(0, C.waterDeep);
    g.addColorStop(0.5, C.water);
    g.addColorStop(1, '#3fe0e6');
    c.fillStyle = g;
    c.fillRect(0, 0, FIELD_W, FIELD_H);
    c.strokeStyle = 'rgba(255,255,255,0.22)';
    c.lineWidth = 2;
    for (let i = 0; i < 46; i++) {
      const x = (i * 137) % FIELD_W;
      const y = (i * 251) % FIELD_H;
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + 8, y - 5, x + 16, y);
      c.quadraticCurveTo(x + 24, y + 5, x + 32, y);
      c.stroke();
    }
  } else {
    c.fillStyle = C.sand;
    c.fillRect(0, 0, FIELD_W, FIELD_H);
    for (let i = 0; i < 420; i++) {
      c.fillStyle = i % 3 ? 'rgba(200,150,70,0.25)' : 'rgba(255,255,255,0.35)';
      c.fillRect((i * 97.13) % FIELD_W, (i * 211.7) % FIELD_H, 2.2, 2.2);
    }
  }
  if (L.pool) {
    const p = L.pool;
    if (p.kind === 'pond') {
      c.fillStyle = '#4fbf5a';
      c.beginPath();
      c.arc(p.x, p.y, p.r + 10, 0, TAU);
      c.fill();
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * TAU;
        c.fillStyle = i % 2 ? '#2f9a3f' : '#6fd36a';
        c.beginPath();
        c.arc(p.x + Math.cos(a) * (p.r + 8), p.y + Math.sin(a) * (p.r + 8), 7, 0, TAU);
        c.fill();
      }
    } else {
      c.fillStyle = C.tile;
      c.beginPath();
      c.arc(p.x, p.y, p.r + 10, 0, TAU);
      c.fill();
      c.strokeStyle = '#c9d6ea';
      c.lineWidth = 1.5;
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * TAU;
        c.beginPath();
        c.moveTo(p.x + Math.cos(a) * p.r, p.y + Math.sin(a) * p.r);
        c.lineTo(p.x + Math.cos(a) * (p.r + 10), p.y + Math.sin(a) * (p.r + 10));
        c.stroke();
      }
    }
    const g = c.createRadialGradient(p.x, p.y, p.r * 0.1, p.x, p.y, p.r);
    g.addColorStop(0, p.kind === 'pond' ? '#3fb6e0' : C.pool);
    g.addColorStop(1, p.kind === 'pond' ? '#1f7fb0' : C.poolDeep);
    c.fillStyle = g;
    c.beginPath();
    c.arc(p.x, p.y, p.r, 0, TAU);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.45)';
    c.lineWidth = 2.5;
    for (let i = 0; i < 5; i++) {
      const x = p.x - p.r * 0.5 + ((i * 37) % (p.r * 1.0));
      const y = p.y - p.r * 0.5 + ((i * 53) % (p.r * 1.0));
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + 7, y - 4, x + 14, y);
      c.stroke();
    }
    if (p.kind === 'pond') {
      c.fillStyle = '#58c25a';
      for (const [a, d] of [[0.7, 0.6], [2.6, 0.55], [4.4, 0.65]]) {
        c.beginPath();
        c.arc(p.x + Math.cos(a) * p.r * d, p.y + Math.sin(a) * p.r * d, 8, 0.4, TAU - 0.2);
        c.lineTo(p.x + Math.cos(a) * p.r * d, p.y + Math.sin(a) * p.r * d);
        c.fill();
      }
    } else {
      // a ladder
      c.strokeStyle = '#a7b3c6';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(p.x + p.r - 4, p.y - 12);
      c.lineTo(p.x + p.r + 8, p.y - 12);
      c.moveTo(p.x + p.r - 4, p.y + 12);
      c.lineTo(p.x + p.r + 8, p.y + 12);
      c.stroke();
    }
  }
  for (const w of L.walls || []) {
    if (w.kind === 'sand') {
      c.fillStyle = '#fff3c8';
      roundRect(c, w.x - 4, w.y - 4, w.w + 8, w.h + 8, 14);
      c.fill();
      c.fillStyle = C.sand;
      roundRect(c, w.x, w.y, w.w, w.h, 12);
      c.fill();
      for (let i = 0; i < (w.w * w.h) / 220; i++) {
        c.fillStyle = 'rgba(200,150,70,0.3)';
        c.fillRect(w.x + ((i * 97.13) % w.w), w.y + ((i * 41.7) % w.h), 2, 2);
      }
    } else if (w.kind === 'pier') {
      c.fillStyle = C.woodDark;
      c.fillRect(w.x, w.y, w.w, w.h);
      c.fillStyle = C.wood;
      for (let y = w.y; y < w.y + w.h; y += 9) c.fillRect(w.x + 1, y + 1, w.w - 2, 7);
      c.fillStyle = '#5b3a20';
      c.beginPath();
      c.arc(w.x + w.w / 2, w.y + w.h, w.w * 0.6, 0, TAU);
      c.fill();
    } else if (w.kind === 'chair') {
      c.fillStyle = 'rgba(22,11,51,0.15)';
      c.fillRect(w.x + 4, w.y + 5, w.w, w.h);
      c.fillStyle = C.white;
      roundRect(c, w.x, w.y, w.w, w.h, 6);
      c.fill();
      c.fillStyle = '#3fd2f0';
      for (let y = w.y + 4; y < w.y + w.h - 4; y += 10) c.fillRect(w.x + 4, y, w.w - 8, 5);
      c.strokeStyle = C.ink;
      c.lineWidth = 2;
      roundRect(c, w.x, w.y, w.w, w.h, 6);
      c.stroke();
    } else if (w.kind === 'castle') {
      c.fillStyle = 'rgba(22,11,51,0.15)';
      c.fillRect(w.x + 4, w.y + 5, w.w, w.h);
      c.fillStyle = '#e8c070';
      c.fillRect(w.x, w.y, w.w, w.h);
      c.fillStyle = '#d4a650';
      for (const [cx, cy] of [[w.x + 10, w.y + 10], [w.x + w.w - 10, w.y + 10], [w.x + 10, w.y + w.h - 10], [w.x + w.w - 10, w.y + w.h - 10]]) {
        c.beginPath();
        c.arc(cx, cy, 10, 0, TAU);
        c.fill();
      }
      c.fillStyle = C.pink;
      c.beginPath();
      c.moveTo(w.x + w.w / 2, w.y + w.h / 2 - 12);
      c.lineTo(w.x + w.w / 2 + 12, w.y + w.h / 2 - 6);
      c.lineTo(w.x + w.w / 2, w.y + w.h / 2);
      c.fill();
    } else {
      // fence / boardwalk
      c.fillStyle = 'rgba(22,11,51,0.15)';
      c.fillRect(w.x + 3, w.y + 4, w.w, w.h);
      c.fillStyle = C.wood;
      c.fillRect(w.x, w.y, w.w, w.h);
      c.fillStyle = C.woodDark;
      for (let x = w.x; x < w.x + w.w; x += 12) c.fillRect(x, w.y, 2, w.h);
    }
  }
  if (L.dock) {
    const z = L.dock;
    // planks across the back of the slip
    c.fillStyle = C.wood;
    c.fillRect(z.x - 12, z.y - 12, z.w + 24, 16);
    c.fillStyle = C.woodDark;
    for (let x = z.x - 12; x < z.x + z.w + 12; x += 10) c.fillRect(x, z.y - 12, 1.5, 16);
    c.fillStyle = 'rgba(255,255,255,0.12)';
    c.fillRect(z.x, z.y, z.w, z.h);
  }
  for (const r of L.circles || []) {
    if (r.kind !== 'rock') continue;
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.beginPath();
    c.arc(r.x, r.y, r.r + 4, 0, TAU);
    c.fill();
    c.fillStyle = C.rockDark;
    c.beginPath();
    c.arc(r.x + 1.5, r.y + 2, r.r, 0, TAU);
    c.fill();
    c.fillStyle = C.rock;
    c.beginPath();
    c.arc(r.x - 1, r.y - 1, r.r * 0.85, 0, TAU);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.beginPath();
    c.arc(r.x - r.r * 0.35, r.y - r.r * 0.35, r.r * 0.25, 0, TAU);
    c.fill();
  }
}

// Small job pictures for the HUD and the level picker, centred at (x, y), size r (screen px).
export function drawJobIcon(ctx, job, x, y, r, t = 0) {
  ctx.save();
  if (job === 'sail') {
    ctx.translate(x, y);
    const k = r / 14;
    ctx.scale(k, k);
    drawBoat(ctx, 0, 0, 10, -Math.PI / 2 + Math.sin(t * 2) * 0.1, 0.8, t);
  } else if (job === 'herd') {
    drawBall(ctx, x, y, r * 0.75, t);
  } else {
    drawSnack(ctx, 1, x, y, r * 0.8);
  }
  ctx.restore();
}

// The launcher tile: a palm whipping in the wind, a beach ball tumbling past and wind lines.
export function drawTile(ctx, x, y, w, h, time) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, '#3aa8ff');
  sky.addColorStop(0.62, C.sky);
  sky.addColorStop(0.62, C.water);
  sky.addColorStop(0.8, '#3fe0e6');
  sky.addColorStop(0.8, C.sand);
  sky.addColorStop(1, C.sand);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  // swirl
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const k = ((time * 0.8 + i * 0.25) % 1);
    ctx.lineWidth = Math.max(2, w * 0.018);
    ctx.globalAlpha = Math.sin(k * Math.PI);
    ctx.beginPath();
    const cx = x + w * (0.2 + k * 0.7);
    const cy = y + h * (0.18 + i * 0.12);
    ctx.moveTo(cx - w * 0.22, cy);
    ctx.quadraticCurveTo(cx, cy - h * 0.06, cx + w * 0.1, cy);
    ctx.arc(cx + w * 0.1, cy - h * 0.035, h * 0.035, Math.PI / 2, -Math.PI, true);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // palm bending (side view)
  const bend = 0.5 + Math.sin(time * 3) * 0.25;
  const bx = x + w * 0.22;
  const by = y + h * 0.86;
  const tx = bx + w * 0.18 * bend;
  const ty = y + h * 0.35;
  ctx.strokeStyle = C.trunk;
  ctx.lineWidth = Math.max(4, w * 0.04);
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.quadraticCurveTo(bx, y + h * 0.55, tx, ty);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = -0.3 + i * 0.16 + bend * 0.5 - (i % 2) * 0.1;
    const len = w * (0.2 + (i % 3) * 0.03);
    ctx.strokeStyle = i % 2 ? C.leaf : C.leafDark;
    ctx.lineWidth = Math.max(3, w * 0.035);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx + Math.cos(a) * len * 0.6, ty + Math.sin(a) * len * 0.3 - len * 0.2, tx + Math.cos(a) * len, ty + Math.sin(a) * len * 0.8);
    ctx.stroke();
  }
  // beach ball tumbling across
  const k = (time * 0.35) % 1;
  drawBall(ctx, x + w * (-0.1 + k * 1.2), y + h * (0.88 - Math.abs(Math.sin(k * Math.PI * 3)) * 0.18), w * 0.07, time * 6);
  ctx.restore();
}
