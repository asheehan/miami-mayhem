// Coconut Shuffle drawing. Reads poses from sim.js and never changes game rules. Shells,
// critters, the beach and table, the palm leaf, icons, buttons and the launcher tile.
import { project, pairPos, slotPositions, arcDepth, ease, SHELL_RX, LIFT_H } from './sim.js';

export const C = {
  night: '#2b1055',
  dusk: '#7a1fa2',
  pink: '#ff3d9a',
  orange: '#ff8a4c',
  sun: '#ffe14d',
  sea: '#19c3d6',
  deep: '#0b6fa0',
  foam: '#c9fbff',
  ink: '#160b33',
  white: '#ffffff',
  cream: '#fff4dc',
  sand: '#f6d58e',
  sandDark: '#e0b467',
  leaf: '#2fae4a',
  leafDark: '#1d7a33',
  green: '#3fe07a',
  red: '#ff5a36',
  blue: '#3a8bff',
};

export const font = (px, weight = 900) => `${weight} ${Math.round(px)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
const TAU = Math.PI * 2;
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
  if (!b.label) {
    if (hasIcon) glyph(ctx, b.glyph, b.x + b.w / 2, b.y + b.h / 2, Math.min(b.w, b.h) * 0.26, C.ink);
    return;
  }
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
  } else if (kind === 'grid') {
    const g = s * 0.55;
    for (let i = -1; i <= 1; i += 2) for (let j = -1; j <= 1; j += 2) ctx.fillRect(cx + i * g * 0.9 - g * 0.4, cy + j * g * 0.9 - g * 0.4, g * 0.8, g * 0.8);
  } else if (kind === 'flame') {
    const path = (k) => {
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.15 * k, cy - s * 1.15 * k);
      ctx.bezierCurveTo(cx + s * 0.9 * k, cy - s * 0.5 * k, cx + s * 0.95 * k, cy + s * 0.2, cx + s * 0.6 * k, cy + s * 0.75);
      ctx.quadraticCurveTo(cx, cy + s * 1.1, cx - s * 0.6 * k, cy + s * 0.75);
      ctx.bezierCurveTo(cx - s * 0.95 * k, cy + s * 0.3, cx - s * 0.75 * k, cy - s * 0.2 * k, cx - s * 0.35 * k, cy - s * 0.55 * k);
      ctx.quadraticCurveTo(cx - s * 0.25 * k, cy - s * 0.15 * k, cx - s * 0.05 * k, cy - s * 0.3 * k);
      ctx.quadraticCurveTo(cx + s * 0.1 * k, cy - s * 0.7 * k, cx + s * 0.15 * k, cy - s * 1.15 * k);
      ctx.closePath();
    };
    path(1);
    ctx.fillStyle = '#ff5a36';
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = Math.max(2, s * 0.14);
    ctx.stroke();
    ctx.fillStyle = C.sun;
    ctx.save();
    ctx.translate(0, s * 0.12);
    path(0.5);
    ctx.fill();
    ctx.restore();
  } else if (kind === 'eye') {
    ctx.lineWidth = s * 0.25;
    ctx.beginPath();
    ctx.moveTo(cx - s, cy);
    ctx.quadraticCurveTo(cx, cy - s * 0.9, cx + s, cy);
    ctx.quadraticCurveTo(cx, cy + s * 0.9, cx - s, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.32, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// Square icon buttons along the top: 'home', 'back', 'restart'.
export function drawIconButton(ctx, b) {
  ctx.fillStyle = 'rgba(22,11,51,0.35)';
  roundRect(ctx, b.x, b.y, b.w, b.h, b.w * 0.24);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
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

// A pointing hand with the fingertip at (x, y), finger up; r is about the hand's width.
export function drawHand(ctx, x, y, r, colour = C.white) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = colour;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = Math.max(2, r * 0.09);
  ctx.lineJoin = 'round';
  // fist with three curled fingers and a thumb
  roundRect(ctx, -r * 0.42, r * 0.62, r * 0.98, r * 0.86, r * 0.3);
  ctx.fill();
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    roundRect(ctx, r * 0.04 + i * r * 0.17, r * 0.56, r * 0.2, r * 0.42, r * 0.1);
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(-r * 0.42, r * 1.0, r * 0.16, r * 0.3, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // the pointing finger
  roundRect(ctx, -r * 0.28, 0, r * 0.32, r * 0.95, r * 0.16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,170,190,0.8)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.12, r * 0.14, r * 0.08, r * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// A big cartoon eye that looks left and right.
export function drawWatchEye(ctx, x, y, r, t, blink = false) {
  ctx.save();
  ctx.fillStyle = C.white;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = Math.max(2, r * 0.14);
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.25, blink ? r * 0.12 : r * 0.82, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  if (!blink) {
    const look = Math.sin(t * 2.6) * r * 0.42;
    ctx.fillStyle = '#2a7bd8';
    ctx.beginPath();
    ctx.arc(x + look, y, r * 0.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(x + look, y, r * 0.26, 0, TAU);
    ctx.fill();
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.arc(x + look + r * 0.14, y - r * 0.16, r * 0.1, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ---------- shells ----------

// A shell sitting with the middle of its rim at (x, y) and half-width r. o.lift lifts it by
// that many px, o.tilt leans it (radians), o.t animates the shine.
export function drawShell(ctx, skin, x, y, r, o = {}) {
  ctx.save();
  ctx.translate(x, y - (o.lift || 0));
  ctx.rotate(o.tilt || 0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const lw = Math.max(2, r * 0.07);
  if (skin === 'bucket') bucket(ctx, r, lw);
  else if (skin === 'sunhat') sunhat(ctx, r, lw);
  else if (skin === 'conch') conch(ctx, r, lw);
  else coconut(ctx, r, lw);
  ctx.restore();
}

function coconut(ctx, r, lw) {
  const H = r * 1.02;
  const rim = r * 0.3;
  // rim of white flesh at the front
  ctx.fillStyle = C.cream;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, rim, 0, 0, Math.PI);
  ctx.fill();
  const g = ctx.createRadialGradient(-r * 0.35, -H * 0.7, r * 0.1, 0, -H * 0.3, r * 1.25);
  g.addColorStop(0, '#b9773f');
  g.addColorStop(0.55, '#7d4a24');
  g.addColorStop(1, '#4a2912');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, H, 0, Math.PI, TAU);
  ctx.ellipse(0, 0, r * 0.97, rim * 0.6, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  // fibres
  ctx.strokeStyle = 'rgba(40,20,8,0.45)';
  ctx.lineWidth = Math.max(1, r * 0.035);
  for (let i = -3; i <= 3; i++) {
    const k = i / 4;
    ctx.beginPath();
    ctx.moveTo(k * r * 0.95, -Math.sqrt(1 - k * k) * H * 0.98);
    ctx.quadraticCurveTo(k * r * 1.1, -H * 0.35, k * r * 0.98, -rim * 0.3);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,210,150,0.35)';
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + 0.5 + i * 0.45;
    ctx.beginPath();
    ctx.arc(0, 0, r * (0.55 + (i % 2) * 0.2), a, a + 0.25);
    ctx.stroke();
  }
  // the three "eyes" on top
  ctx.fillStyle = '#2e1808';
  for (const [ex, ey] of [[-0.17, -0.9], [0.17, -0.9], [0, -0.74]]) {
    ctx.beginPath();
    ctx.ellipse(ex * r, ey * H, r * 0.08, r * 0.065, 0, 0, TAU);
    ctx.fill();
  }
  // shine
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = r * 0.09;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.72, H * 0.8, 0, Math.PI * 1.12, Math.PI * 1.35);
  ctx.stroke();
  // outline
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, H, 0, Math.PI, TAU);
  ctx.ellipse(0, 0, r, rim, 0, 0, Math.PI);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(22,11,51,0.5)';
  ctx.lineWidth = lw * 0.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.97, rim * 0.6, 0, 0, Math.PI);
  ctx.stroke();
}

function bucket(ctx, r, lw) {
  const H = r * 1.2;
  const top = r * 0.66;
  const rim = r * 0.28;
  const g = ctx.createLinearGradient(-r, 0, r, 0);
  g.addColorStop(0, '#1f6fe0');
  g.addColorStop(0.35, '#5aa8ff');
  g.addColorStop(1, '#1a55b8');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(-top, -H);
  ctx.ellipse(0, -H, top, rim * 0.6, 0, Math.PI, TAU);
  ctx.lineTo(r, 0);
  ctx.ellipse(0, 0, r, rim, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  // a yellow band and a starfish sticker
  ctx.fillStyle = C.sun;
  ctx.beginPath();
  ctx.moveTo(-r * 0.92, -H * 0.12);
  ctx.lineTo(r * 0.92, -H * 0.12);
  ctx.lineTo(r * 0.88, -H * 0.28);
  ctx.lineTo(-r * 0.88, -H * 0.28);
  ctx.closePath();
  ctx.fill();
  starShape(ctx, 0, -H * 0.62, r * 0.28, C.pink);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(-top, -H);
  ctx.ellipse(0, -H, top, rim * 0.6, 0, Math.PI, TAU);
  ctx.lineTo(r, 0);
  ctx.ellipse(0, 0, r, rim, 0, 0, Math.PI);
  ctx.stroke();
  // the handle hangs down one side
  ctx.strokeStyle = '#ffd23a';
  ctx.lineWidth = lw * 1.3;
  ctx.beginPath();
  ctx.arc(r * 0.55, -H * 0.45, r * 0.42, -0.4, 1.3);
  ctx.stroke();
}

function sunhat(ctx, r, lw) {
  const rim = r * 0.34;
  ctx.fillStyle = '#f2c76b';
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.05, r * 1.04, rim, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // weave on the brim
  ctx.strokeStyle = 'rgba(150,95,30,0.45)';
  ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.05, r * 0.85, rim * 0.78, 0, 0, TAU);
  ctx.stroke();
  // crown
  const cw = r * 0.62;
  const ch = r * 0.95;
  const g = ctx.createLinearGradient(-cw, 0, cw, 0);
  g.addColorStop(0, '#e9b552');
  g.addColorStop(0.4, '#ffe09a');
  g.addColorStop(1, '#c98f2e');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-cw, -r * 0.1);
  ctx.bezierCurveTo(-cw, -ch * 1.2, cw, -ch * 1.2, cw, -r * 0.1);
  ctx.ellipse(0, -r * 0.1, cw, rim * 0.5, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,95,30,0.4)';
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-cw * 0.95, -r * 0.1 - i * ch * 0.18);
    ctx.lineTo(cw * 0.95, -r * 0.1 - i * ch * 0.18);
    ctx.stroke();
  }
  // pink ribbon with a bow
  ctx.fillStyle = C.pink;
  ctx.beginPath();
  ctx.moveTo(-cw * 1.0, -r * 0.12);
  ctx.lineTo(cw * 1.0, -r * 0.12);
  ctx.lineTo(cw * 0.97, -r * 0.34);
  ctx.lineTo(-cw * 0.97, -r * 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cw * 0.75, -r * 0.24, r * 0.2, r * 0.12, 0.5, 0, TAU);
  ctx.ellipse(cw * 1.05, -r * 0.12, r * 0.18, r * 0.1, -0.4, 0, TAU);
  ctx.fill();
  // a little flower
  ctx.fillStyle = C.white;
  for (let i = 0; i < 5; i++) {
    const a = (i * TAU) / 5;
    ctx.beginPath();
    ctx.arc(-cw * 0.45 + Math.cos(a) * r * 0.1, -r * 0.23 + Math.sin(a) * r * 0.1, r * 0.07, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = C.sun;
  ctx.beginPath();
  ctx.arc(-cw * 0.45, -r * 0.23, r * 0.06, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-cw, -r * 0.1);
  ctx.bezierCurveTo(-cw, -ch * 1.2, cw, -ch * 1.2, cw, -r * 0.1);
  ctx.stroke();
}

function conch(ctx, r, lw) {
  const H = r * 1.45;
  const g = ctx.createLinearGradient(-r, -H, r, 0);
  g.addColorStop(0, '#fff0e6');
  g.addColorStop(0.5, '#ffc2a8');
  g.addColorStop(1, '#e88a7a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.bezierCurveTo(-r * 1.08, -H * 0.45, -r * 0.4, -H * 0.62, -r * 0.12, -H);
  ctx.lineTo(r * 0.05, -H * 0.98);
  ctx.bezierCurveTo(r * 0.45, -H * 0.62, r * 1.1, -H * 0.45, r, 0);
  ctx.ellipse(0, 0, r, r * 0.3, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  // spiral ridges with knobs
  ctx.strokeStyle = 'rgba(160,70,60,0.55)';
  ctx.lineWidth = Math.max(1.2, r * 0.05);
  for (let i = 1; i <= 4; i++) {
    const yy = -H * (i / 5);
    const ww = r * (1 - i * 0.19);
    ctx.beginPath();
    ctx.moveTo(-ww, yy + r * 0.12);
    ctx.quadraticCurveTo(0, yy - r * 0.12, ww, yy + r * 0.02);
    ctx.stroke();
    ctx.fillStyle = '#fff4ec';
    ctx.beginPath();
    ctx.arc(ww * 0.95, yy + r * 0.02, r * 0.08, 0, TAU);
    ctx.arc(-ww * 0.95, yy + r * 0.12, r * 0.08, 0, TAU);
    ctx.fill();
  }
  // the pink lip at the bottom
  ctx.fillStyle = '#ff7fa8';
  ctx.beginPath();
  ctx.ellipse(r * 0.15, -r * 0.08, r * 0.75, r * 0.22, -0.08, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.bezierCurveTo(-r * 1.08, -H * 0.45, -r * 0.4, -H * 0.62, -r * 0.12, -H);
  ctx.lineTo(r * 0.05, -H * 0.98);
  ctx.bezierCurveTo(r * 0.45, -H * 0.62, r * 1.1, -H * 0.45, r, 0);
  ctx.ellipse(0, 0, r, r * 0.3, 0, 0, Math.PI);
  ctx.stroke();
}

function starShape(ctx, x, y, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.5 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

// A soft shadow on the sand; it shrinks and fades as the thing above it rises.
export function drawShadow(ctx, x, y, r, lift = 0) {
  const k = 1 - clamp(lift, 0, 1) * 0.35;
  ctx.fillStyle = `rgba(80,45,10,${0.32 * k})`;
  ctx.beginPath();
  ctx.ellipse(x + r * 0.08, y + r * 0.05, r * 1.12 * k, r * 0.36 * k, 0, 0, TAU);
  ctx.fill();
}

// ---------- critters ----------

const COLOURS = {
  crab: { body: '#ff5a36', dark: '#c2321a', light: '#ff9a6b' },
  turtle: { body: '#3fbf5a', dark: '#1f7a35', light: '#a7ee8a' },
  starfish: { body: '#ffb02e', dark: '#d9771a', light: '#ffe08a' },
  pink: { body: '#ff6fbf', dark: '#c73d8c', light: '#ffb3e0' },
  blue: { body: '#3a8bff', dark: '#1f56b8', light: '#9cc8ff' },
};
export const colourFor = (kind, who) => (who === 'second' ? COLOURS.pink : who === 'decoy' ? COLOURS.blue : COLOURS[kind] || COLOURS.crab);

// A critter standing at (x, y) (its feet), r about a shell's half width. o.room is how much
// height it has under a rising shell (it crouches and peeks under the rim when that's small),
// o.mood: 'wave' | 'dance' | 'peek' | 'run' | 'sad'.
export function drawCritter(ctx, kind, x, y, r, col, o = {}) {
  const t = o.t || 0;
  const full = r * 1.35;
  const room = o.room ?? full;
  const squash = clamp(room / full, 0.32, 1);
  ctx.save();
  let bob = 0;
  let tilt = 0;
  if (o.mood === 'dance') {
    bob = -Math.abs(Math.sin(t * 9)) * r * 0.35;
    tilt = Math.sin(t * 9) * 0.18;
  } else if (o.mood === 'run') {
    bob = -(o.hop || 0) * r * 0.12;
  } else if (o.mood === 'wave') bob = -Math.abs(Math.sin(t * 4)) * r * 0.06;
  ctx.translate(x, y + bob);
  ctx.rotate(tilt);
  ctx.scale(1, squash);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (kind === 'turtle') turtle(ctx, r, col, t, o, squash);
  else if (kind === 'starfish') starfish(ctx, r, col, t, o, squash);
  else crab(ctx, r, col, t, o, squash);
  ctx.restore();
}

function eyes(ctx, x, y, r, sq, look, mood, t) {
  // eyes keep their shape even when the body is squashed
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 1 / sq);
  const blink = (t % 3.1) < 0.12 && mood !== 'dance';
  for (const s of [-1, 1]) {
    ctx.fillStyle = C.white;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = Math.max(1.5, r * 0.06);
    ctx.beginPath();
    ctx.ellipse(s * r * 0.2, 0, r * 0.17, blink ? r * 0.03 : r * 0.2, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    if (!blink) {
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      if (mood === 'dance') {
        // happy arcs
        ctx.lineWidth = Math.max(1.5, r * 0.07);
        ctx.arc(s * r * 0.2, r * 0.05, r * 0.09, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      } else {
        ctx.arc(s * r * 0.2 + look * r * 0.07, r * 0.03, r * 0.09, 0, TAU);
        ctx.fill();
        ctx.fillStyle = C.white;
        ctx.beginPath();
        ctx.arc(s * r * 0.2 + look * r * 0.07 + r * 0.03, -r * 0.02, r * 0.03, 0, TAU);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function crab(ctx, r, col, t, o, sq) {
  const lw = Math.max(1.5, r * 0.06);
  const by = -r * 0.42;
  const run = o.mood === 'run';
  // legs
  ctx.strokeStyle = col.dark;
  ctx.lineWidth = Math.max(2, r * 0.09);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const wig = run ? Math.sin(t * 30 + i * 2 + s) * r * 0.08 : Math.sin(t * 3 + i) * r * 0.02;
      ctx.beginPath();
      ctx.moveTo(s * r * 0.4, by + r * 0.05 + i * r * 0.08);
      ctx.lineTo(s * r * (0.72 + i * 0.07), by - r * 0.02 + i * r * 0.12 + wig);
      ctx.lineTo(s * r * (0.82 + i * 0.08), -r * 0.02 + wig * 0.5);
      ctx.stroke();
    }
  }
  // claws
  const up = o.mood === 'dance' ? 1 : o.mood === 'wave' ? 0.5 : 0;
  for (const s of [-1, 1]) {
    const wave = o.mood === 'wave' && s === 1 ? Math.sin(t * 7) * 0.35 : 0;
    const snap = o.mood === 'dance' ? Math.abs(Math.sin(t * 12 + s)) : 0.4;
    const ax = s * r * 0.55;
    const ay = by - r * 0.1;
    const cx = s * r * (0.78 + up * 0.05);
    const cy = by - r * (0.3 + up * 0.55) + wave * r;
    ctx.strokeStyle = col.dark;
    ctx.lineWidth = Math.max(2, r * 0.1);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(cx, cy + r * 0.12);
    ctx.stroke();
    ctx.fillStyle = col.body;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.2, r * 0.16, s * 0.4, 0, TAU);
    ctx.fill();
    ctx.stroke();
    // pincer gap
    ctx.fillStyle = col.dark;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + s * r * 0.2, cy - r * (0.08 + snap * 0.08));
    ctx.lineTo(cx + s * r * 0.2, cy + r * 0.02);
    ctx.closePath();
    ctx.fill();
  }
  // body
  const g = ctx.createRadialGradient(-r * 0.15, by - r * 0.15, r * 0.05, 0, by, r * 0.7);
  g.addColorStop(0, col.light);
  g.addColorStop(1, col.body);
  ctx.fillStyle = g;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.ellipse(0, by, r * 0.55, r * 0.36, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // spots
  ctx.fillStyle = col.dark;
  for (const [sx, sy] of [[-0.25, -0.12], [0.22, -0.16], [0.02, -0.24]]) {
    ctx.beginPath();
    ctx.arc(sx * r, by + sy * r, r * 0.045, 0, TAU);
    ctx.fill();
  }
  // smile
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = lw;
  ctx.beginPath();
  if (o.mood === 'sad') ctx.arc(0, by + r * 0.2, r * 0.12, Math.PI * 1.15, Math.PI * 1.85);
  else ctx.arc(0, by + r * 0.02, r * 0.14, 0.2, Math.PI - 0.2);
  ctx.stroke();
  // eye stalks
  const ey = by - r * 0.5;
  ctx.strokeStyle = col.dark;
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.beginPath();
  ctx.moveTo(-r * 0.15, by - r * 0.3);
  ctx.lineTo(-r * 0.2, ey);
  ctx.moveTo(r * 0.15, by - r * 0.3);
  ctx.lineTo(r * 0.2, ey);
  ctx.stroke();
  eyes(ctx, 0, ey, r, sq, Math.sin(t * 1.7), o.mood, t);
}

function turtle(ctx, r, col, t, o, sq) {
  const lw = Math.max(1.5, r * 0.06);
  const by = -r * 0.38;
  const paddle = o.mood === 'run' || o.mood === 'dance' ? Math.sin(t * 18) * 0.4 : Math.sin(t * 3) * 0.1;
  // flippers
  ctx.fillStyle = col.dark;
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(s * r * 0.5, by + r * 0.15);
    ctx.rotate(s * (0.5 + paddle));
    ctx.beginPath();
    ctx.ellipse(s * r * 0.2, 0, r * 0.28, r * 0.11, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // shell
  const g = ctx.createRadialGradient(-r * 0.15, by - r * 0.2, r * 0.05, 0, by, r * 0.7);
  g.addColorStop(0, col.light);
  g.addColorStop(1, col.body);
  ctx.fillStyle = g;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.ellipse(0, by, r * 0.58, r * 0.4, 0, Math.PI, TAU);
  ctx.ellipse(0, by, r * 0.58, r * 0.12, 0, 0, Math.PI);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = col.dark;
  ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, by - r * 0.36);
  ctx.lineTo(-r * 0.24, by);
  ctx.moveTo(r * 0.2, by - r * 0.36);
  ctx.lineTo(r * 0.24, by);
  ctx.moveTo(-r * 0.55, by - r * 0.14);
  ctx.lineTo(r * 0.55, by - r * 0.14);
  ctx.stroke();
  // head poking out the front
  const hy = by - r * 0.05;
  ctx.fillStyle = col.light;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.ellipse(0, hy + r * 0.05, r * 0.3, r * 0.26, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, hy + r * 0.1, r * 0.1, 0.25, Math.PI - 0.25);
  ctx.stroke();
  eyes(ctx, 0, hy - r * 0.05, r * 0.85, sq, Math.sin(t * 1.7), o.mood, t);
}

function starfish(ctx, r, col, t, o, sq) {
  const lw = Math.max(1.5, r * 0.06);
  const cy = -r * 0.55;
  const R = r * 0.62;
  const wig = o.mood === 'dance' || o.mood === 'run' ? Math.sin(t * 14) * 0.12 : Math.sin(t * 2) * 0.03;
  ctx.fillStyle = col.body;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = lw;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5 + (i % 2 ? 0 : wig);
    const rr = i % 2 ? R * 0.48 : R;
    ctx.lineTo(Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = col.light;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * TAU) / 5;
    for (const k of [0.55, 0.78]) {
      ctx.beginPath();
      ctx.arc(Math.cos(a) * R * k, cy + Math.sin(a) * R * k, r * 0.035, 0, TAU);
      ctx.fill();
    }
  }
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, cy + r * 0.1, r * 0.1, 0.25, Math.PI - 0.25);
  ctx.stroke();
  eyes(ctx, 0, cy - r * 0.06, r * 0.8, sq, Math.sin(t * 1.7), o.mood, t);
}

// ---------- the beach and the table ----------

export function drawBeach(ctx, w, h, t, horizon) {
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#2fb8ff');
  sky.addColorStop(0.7, '#8fe3ff');
  sky.addColorStop(1, '#ffe9b8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizon);
  // sun
  const sr = Math.min(w, h) * 0.07;
  ctx.fillStyle = 'rgba(255,225,77,0.35)';
  ctx.beginPath();
  ctx.arc(w * 0.8, horizon * 0.42, sr * 1.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = C.sun;
  ctx.beginPath();
  ctx.arc(w * 0.8, horizon * 0.42, sr, 0, TAU);
  ctx.fill();
  // clouds
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (let i = 0; i < 3; i++) {
    const cx = ((i * 0.37 + t * 0.008 * (1 + i * 0.3)) % 1.3) * w * 1.1 - w * 0.15;
    const cy = horizon * (0.22 + i * 0.17);
    const cr = Math.min(w, h) * (0.03 + (i % 2) * 0.012);
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, TAU);
    ctx.arc(cx + cr * 1.1, cy - cr * 0.4, cr * 1.2, 0, TAU);
    ctx.arc(cx + cr * 2.3, cy, cr * 0.95, 0, TAU);
    ctx.fill();
  }
  // sea
  const seaH = Math.max(30, h * 0.06);
  const sea = ctx.createLinearGradient(0, horizon, 0, horizon + seaH);
  sea.addColorStop(0, C.deep);
  sea.addColorStop(1, C.sea);
  ctx.fillStyle = sea;
  ctx.fillRect(0, horizon, w, seaH);
  // sand with the wet edge and foam
  const sandTop = horizon + seaH;
  const sand = ctx.createLinearGradient(0, sandTop, 0, h);
  sand.addColorStop(0, '#f9e1a6');
  sand.addColorStop(1, C.sand);
  ctx.fillStyle = sand;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w + 10; x += 10) ctx.lineTo(x, sandTop + Math.sin(x / 50 + t * 1.2) * 4 - 4);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let x = 0; x <= w + 10; x += 10) ctx.lineTo(x, sandTop + Math.sin(x / 50 + t * 1.2) * 4 - 5);
  ctx.stroke();
  // sand speckles
  ctx.fillStyle = 'rgba(190,140,70,0.25)';
  for (let i = 0; i < 70; i++) {
    const x = hash(i) * w;
    const y = sandTop + 12 + hash(i + 100) * (h - sandTop - 12);
    ctx.fillRect(x, y, 3, 2);
  }
  // palms at the sides
  drawPalm(ctx, w * 0.06, sandTop + h * 0.08, Math.min(w, h) * 0.0026, t, 1);
  drawPalm(ctx, w * 0.95, sandTop + h * 0.04, Math.min(w, h) * 0.0021, t + 1, -1);
}

const hash = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function drawPalm(ctx, x, y, sc, t, dir) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sc * dir, sc);
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(10, -90, 40, -170);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(60,35,10,0.35)';
  ctx.lineWidth = 3;
  for (let i = 1; i < 8; i++) {
    const k = i / 8;
    const px = 20 * k * k * 2 * (1 - k) + 40 * k * k;
    const py = -90 * 2 * k * (1 - k) - 170 * k * k;
    ctx.beginPath();
    ctx.moveTo(px - 8, py);
    ctx.lineTo(px + 8, py + 2);
    ctx.stroke();
  }
  ctx.translate(40, -170);
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI * 0.95 + i * 0.42 + Math.sin(t * 1.3 + i) * 0.05;
    frond(ctx, a, 95, C.leaf, C.leafDark);
  }
  ctx.fillStyle = '#6b3d1a';
  for (const [cx, cy] of [[-6, 6], [6, 8], [0, 14]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function frond(ctx, angle, len, fill, dark) {
  ctx.save();
  ctx.rotate(angle);
  ctx.fillStyle = fill;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.18, len, len * 0.1);
  ctx.quadraticCurveTo(len * 0.5, len * 0.12, 0, 0);
  ctx.fill();
  for (let i = 1; i < 7; i++) {
    const k = i / 7;
    ctx.beginPath();
    ctx.moveTo(len * k, -len * 0.08 * (1 - k) + len * 0.06 * k);
    ctx.lineTo(len * k + 10, len * 0.12);
    ctx.stroke();
  }
  ctx.restore();
}

// The striped beach towel the shells sit on, under the table's slots.
export function drawTowel(ctx, view, ring, n) {
  const hw = ring ? 205 : Math.min(220, ((n - 1) / 2) * ({ 3: 120, 4: 100, 5: 84 }[n] || 84) + 75);
  const hz = ring ? 112 : 92;
  const c = [project(view, -hw, -hz), project(view, hw, -hz), project(view, hw, hz), project(view, -hw, hz)];
  ctx.save();
  ctx.fillStyle = 'rgba(80,45,10,0.2)';
  ctx.beginPath();
  c.forEach((p) => ctx.lineTo(p.X + 6, p.Y + 8));
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  c.forEach((p) => ctx.lineTo(p.X, p.Y));
  ctx.closePath();
  ctx.fillStyle = C.white;
  ctx.fill();
  ctx.clip();
  // stripes across
  const cols = ['#ff6fa8', '#ffffff', '#19c3d6', '#ffffff', '#ffd23a', '#ffffff'];
  const bands = 12;
  for (let i = 0; i < bands; i++) {
    const z0 = -hz + (i * 2 * hz) / bands;
    const z1 = z0 + (2 * hz) / bands;
    const a = project(view, -hw - 30, z0);
    const b = project(view, hw + 30, z0);
    const d = project(view, -hw - 30, z1);
    const e = project(view, hw + 30, z1);
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath();
    ctx.moveTo(a.X, a.Y);
    ctx.lineTo(b.X, b.Y);
    ctx.lineTo(e.X, e.Y);
    ctx.lineTo(d.X, d.Y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(22,11,51,0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  c.forEach((p) => ctx.lineTo(p.X, p.Y));
  ctx.closePath();
  ctx.stroke();
  // fringe on the front edge
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  const steps = 26;
  for (let i = 0; i <= steps; i++) {
    const p = project(view, -hw + (i * 2 * hw) / steps, hz);
    ctx.beginPath();
    ctx.moveTo(p.X, p.Y);
    ctx.lineTo(p.X, p.Y + 8);
    ctx.stroke();
  }
}

// A big palm frond swinging in from the right over the middle of the table. k: 0 away, 1 over.
export function drawLeaf(ctx, view, k, w, t) {
  if (k <= 0) return;
  const s = view.s;
  ctx.save();
  const away = 1 - k;
  const len = 330 * s;
  // the frond points down-left with its middle over the middle of the table; it swings in
  // from up and to the right
  const a = 2.2 + away * 0.5 + Math.sin(t * 3) * 0.03;
  const mx = view.cx + away * w;
  const my = view.cy - 30 * s - away * 260 * s;
  ctx.translate(mx - Math.cos(a) * len * 0.55, my - Math.sin(a) * len * 0.55);
  ctx.rotate(a);
  ctx.lineCap = 'round';
  // leaflets both sides
  for (let i = 0; i < 16; i++) {
    const u = 0.12 + (i / 16) * 0.86;
    const px = len * u;
    const lf = len * 0.34 * Math.sin(Math.PI * (0.2 + u * 0.75));
    for (const side of [-1, 1]) {
      ctx.fillStyle = i % 2 ? C.leaf : '#3cc45a';
      ctx.strokeStyle = C.leafDark;
      ctx.lineWidth = Math.max(1.5, s * 1.5);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.quadraticCurveTo(px + lf * 0.35, side * lf * 0.5, px + lf * 0.55, side * lf);
      ctx.quadraticCurveTo(px + lf * 0.1, side * lf * 0.45, px - len * 0.03, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.strokeStyle = '#7a8a2a';
  ctx.lineWidth = Math.max(3, 7 * s);
  ctx.beginPath();
  ctx.moveTo(-len * 0.1, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.04, len, len * 0.06);
  ctx.stroke();
  ctx.restore();
}

// ---------- the whole table ----------

// Draw the shells and critters in depth order. ps from sim poses(); o: { skin, critter, t,
// lifts (px per field unit), dimmed, revealed (set of shell ids that may show their critter) }
export function drawTable(ctx, view, ps, o) {
  const items = [];
  for (const s of ps.shells) items.push({ z: s.z, kind: 'shell', s });
  for (const c of ps.critters) if (c.shell === null) items.push({ z: c.z + 0.01, kind: 'runner', c });
  items.sort((a, b) => a.z - b.z);
  for (const it of items) {
    if (it.kind === 'runner') {
      const q = project(view, it.c.x, it.c.z);
      const r = SHELL_RX * q.k * 0.7;
      drawShadow(ctx, q.X, q.Y, r * 0.7, 0);
      drawCritter(ctx, o.critter, q.X, q.Y, r, colourFor(o.critter, it.c.who), { t: o.t * 1.3, mood: 'run', hop: it.c.hop });
      continue;
    }
    const s = it.s;
    const q = project(view, s.x, s.z);
    const r = SHELL_RX * q.k;
    const lift = s.lift * LIFT_H * q.k;
    drawShadow(ctx, q.X, q.Y, r, s.lift);
    if (s.lift > 0.01) {
      for (const c of ps.critters) {
        if (c.shell !== s.id) continue;
        const cr = r * (ps.critters.length > 1 && c.who !== 'decoy' ? 0.72 : 0.75);
        drawCritter(ctx, o.critter, q.X, q.Y, cr, colourFor(o.critter, c.who), {
          t: o.t + s.id, mood: c.mood, room: lift + r * 0.1,
        });
      }
    }
    const tilt = s.wobble * 0.22 + (s.lift > 0 ? -0.12 * s.lift : 0);
    drawShell(ctx, o.skin, q.X, q.Y + (s.wobble ? -Math.abs(s.wobble) * r * 0.12 : 0), r, { lift, tilt });
  }
}

// ---------- menu demo and launcher tile ----------

// Three shells on a towel: two swap along their arcs, then the critter peeks out of the one it
// rode under. Loops every 4 s.
export function drawDemo(ctx, view, time, skin = 'coconut', critter = 'crab') {
  const slots = slotPositions(3);
  drawTowel(ctx, view, false, 3);
  const cycle = 4;
  const ph = time % cycle;
  const k = Math.floor(time / cycle) % 2; // alternate which pair swaps
  const pa = k ? 0 : 1;
  const pb = k ? 1 : 2;
  const theta = Math.PI * ease(clamp((ph - 0.4) / 1.2, 0, 1));
  const pos = slots.map((p) => ({ ...p }));
  const [A, B] = pairPos(slots[pa], slots[pb], true, arcDepth(pa, pb, 3, false), theta);
  pos[pa] = A;
  pos[pb] = B;
  const lift = ph > 2.2 ? Math.sin(Math.PI * clamp((ph - 2.2) / 1.5, 0, 1)) : 0;
  const order = [0, 1, 2].sort((i, j) => pos[i].z - pos[j].z);
  for (const i of order) {
    const q = project(view, pos[i].x, pos[i].z);
    const r = SHELL_RX * q.k;
    drawShadow(ctx, q.X, q.Y, r, 0);
    const isPeek = i === pb && ph > 2.2; // the critter rode under the pb shell
    const L = isPeek ? lift * LIFT_H * 0.8 * q.k : 0;
    if (isPeek && L > 1) drawCritter(ctx, critter, q.X, q.Y, r * 0.75, colourFor(critter, 'main'), { t: time, mood: 'wave', room: L + r * 0.1 });
    drawShell(ctx, skin, q.X, q.Y, r, { lift: L, tilt: -0.12 * (isPeek ? lift : 0) });
  }
}

export function drawTile(ctx, x, y, w, h, time) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.translate(x, y);
  drawBeach(ctx, w, h, time, h * 0.32);
  drawDemo(ctx, { cx: w / 2, cy: h * 0.7, s: w / 430 }, time);
  ctx.restore();
}
