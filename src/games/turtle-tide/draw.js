// Turtle Tide drawing. Reads the state and never changes game rules; the only state here is
// cosmetic (bubbles, splashes, sparkles). The world is drawn side-on in world units with
// heights flipped (a thing at height h is drawn at y = -h) under one transform.
import {
  WORLD_H, TURTLE_H, CRAB_W, CRAB_H, JELLY_R, LOG_H, groundAt,
} from './sim.js';

export const C = {
  night: '#2b1055',
  dusk: '#7a1fa2',
  ink: '#160b33',
  white: '#ffffff',
  sun: '#ffe14d',
  pink: '#ff3d9a',
  orange: '#ff8a4c',
  foam: '#c9fbff',
  water: '#19c3d6',
  waterDeep: '#0b6fa0',
  sand: '#f6d892',
  sandMid: '#e9bf72',
  sandDark: '#c99a52',
  leaf: '#2fae4a',
  leafDark: '#1d7a33',
  trunk: '#8a5a3c',
  wood: '#b07a4a',
  woodDark: '#6e4426',
  rock: '#7a6aa6',
  rockDark: '#4d3f78',
  rockLight: '#a596cf',
  shell: '#2fa86a',
  shellDark: '#1b7048',
  shellLight: '#8fe0a8',
  skin: '#a7e36f',
  skinDark: '#6aa83f',
  crab: '#ff5a4b',
  crabDark: '#c2302a',
  jelly: '#ff8ad8',
  starfish: '#ff8a4c',
  silhouette: '#160b33',
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
  ctx.fillStyle = 'rgba(22,11,51,0.32)';
  roundRect(ctx, b.x, b.y, b.w, b.h, b.w * 0.24);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.stroke();
  glyph(ctx, b.icon, b.x + b.w / 2, b.y + b.h / 2, b.w * 0.3, C.white);
}

// A pointing finger with its tip at (x, y), in screen px.
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
// Little pictures. World units, drawn at (x, y) where y is already flipped (y = -height).
// ---------------------------------------------------------------------------------------------

// The baby turtle, facing right, standing on (x, y). o: { t, phase, swim, look, blink, bonk, eep, alpha }
export function drawTurtle(ctx, x, y, o = {}) {
  const t = o.t || 0;
  const ph = o.phase || 0;
  ctx.save();
  ctx.translate(x, y);
  if (o.scale) ctx.scale(o.scale, o.scale);
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  if (o.tilt) ctx.rotate(o.tilt);
  const squish = o.bonk ? 1 - 0.12 * Math.max(0, Math.sin(Math.min(1, o.bonk) * Math.PI)) : 1;
  ctx.scale(1 / Math.sqrt(squish), squish);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.6;
  // flippers: a lazy walk on sand, big strokes in water
  const stroke = o.swim ? Math.sin(ph) * 0.9 : Math.sin(ph) * 0.45;
  const flip = (fx, fy, len, wid, rot) => {
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(rot);
    ctx.fillStyle = C.skin;
    ctx.beginPath();
    ctx.ellipse(len * 0.5, 0, len * 0.55, wid, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };
  // far-side flippers (darker, behind the shell)
  ctx.globalAlpha *= 0.85;
  flip(-10, -3, 7, 2.4, (o.swim ? 2.4 : 2.7) - stroke * 0.8);
  flip(3, -3, o.swim ? 11 : 9, 2.8, (o.swim ? 0.5 : 1.0) - stroke);
  ctx.globalAlpha /= 0.85;
  // tail
  ctx.fillStyle = C.skin;
  ctx.beginPath();
  ctx.moveTo(-14, -4);
  ctx.lineTo(-19, -2.5);
  ctx.lineTo(-14, -1.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // head and neck
  const look = o.look === 'up' ? -0.55 : o.look === 'down' ? 0.25 : Math.sin(t * 1.3) * 0.06;
  ctx.save();
  ctx.translate(6, -6);
  ctx.rotate(look);
  ctx.fillStyle = C.skin;
  ctx.beginPath();
  ctx.ellipse(3, -1, 5, 3.4, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(7.5, -2.5, 5, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // cheek
  ctx.fillStyle = 'rgba(255,61,154,0.35)';
  ctx.beginPath();
  ctx.arc(8, 0, 1.6, 0, TAU);
  ctx.fill();
  // eye
  const wide = o.eep ? 1.35 : 1;
  const shut = o.blink ? 0.15 : 1;
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.ellipse(9, -4, 2.3 * wide, 2.5 * wide * shut, 0, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 0.9;
  ctx.stroke();
  if (!o.blink) {
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(9.6, o.look === 'up' ? -5 : -3.8, o.eep ? 0.9 : 1.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.arc(10.1, -4.6, 0.5, 0, TAU);
    ctx.fill();
  }
  // mouth
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  if (o.eep) ctx.ellipse(11.2, -0.2, 1, 1.3, 0, 0, TAU);
  else ctx.arc(10, -1, 2, 0.2, 1.2);
  ctx.stroke();
  ctx.restore();
  // shell
  ctx.lineWidth = 1.6;
  ctx.fillStyle = '#f2e08a';
  ctx.beginPath();
  ctx.moveTo(-15, -1.5);
  ctx.lineTo(8, -1.5);
  ctx.quadraticCurveTo(9, -4, 8, -5);
  ctx.lineTo(-15, -5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const g = ctx.createLinearGradient(0, -17, 0, -3);
  g.addColorStop(0, C.shellLight);
  g.addColorStop(0.5, C.shell);
  g.addColorStop(1, C.shellDark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-16, -3.5);
  ctx.bezierCurveTo(-15, -15, -8, -17, -3.5, -17);
  ctx.bezierCurveTo(2, -17, 8, -13, 9, -3.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // shell plates
  ctx.strokeStyle = C.shellDark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-8, -14.5);
  ctx.lineTo(-6.5, -9);
  ctx.lineTo(-0.5, -9);
  ctx.lineTo(1, -14.5);
  ctx.moveTo(-6.5, -9);
  ctx.lineTo(-10, -4);
  ctx.moveTo(-0.5, -9);
  ctx.lineTo(3, -4);
  ctx.moveTo(-6.5, -9);
  ctx.lineTo(-12.5, -10);
  ctx.moveTo(-0.5, -9);
  ctx.lineTo(5.5, -10);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(-6, -14, 3.5, 1.4, -0.2, 0, TAU);
  ctx.fill();
  // near-side flippers
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.6;
  flip(-11, -2.5, 7, 2.4, (o.swim ? 2.4 : 2.6) + stroke * 0.8);
  flip(4, -2.5, o.swim ? 12 : 9.5, 3, (o.swim ? 0.45 : 0.9) + stroke);
  ctx.restore();
  // bonk: little stars spin round the head
  if (o.bonk && o.bonk < 1.6) {
    ctx.save();
    ctx.translate(x + 12, y - 22);
    for (let i = 0; i < 3; i++) {
      const a = t * 5 + (i * TAU) / 3;
      drawTinyStar(ctx, Math.cos(a) * 7, Math.sin(a) * 2.2, 2.4, C.sun);
    }
    ctx.restore();
  }
}

function drawTinyStar(ctx, x, y, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
}

// A starfish centred on (x, y), radius r.
export function drawStarfish(ctx, x, y, r, t = 0, face = true) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 1.5) * 0.15);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.5 : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = C.starfish;
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(0.8, r * 0.12);
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.fillStyle = '#ffd0a8';
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * TAU) / 5;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.09, 0, TAU);
    ctx.fill();
  }
  if (face) {
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(-r * 0.17, -r * 0.08, r * 0.08, 0, TAU);
    ctx.arc(r * 0.17, -r * 0.08, r * 0.08, 0, TAU);
    ctx.fill();
    ctx.lineWidth = r * 0.07;
    ctx.beginPath();
    ctx.arc(0, r * 0.05, r * 0.15, 0.3, Math.PI - 0.3);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCrab(ctx, c, t) {
  const x = c.x;
  const y = -c.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink;
  if (c.hidden) {
    // tucked into its shell, sleepy bubbles
    ctx.fillStyle = C.crab;
    ctx.beginPath();
    ctx.ellipse(0, -1, CRAB_W * 0.42, CRAB_H * 0.6, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(-3, -5, 3, 1.2, -0.3, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-4, -3);
    ctx.lineTo(-1.5, -3);
    ctx.moveTo(1.5, -3);
    ctx.lineTo(4, -3);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const walk = Math.sin(t * 14 + c.id) * (c.pause > 0 ? 0.2 : 1);
  const snap = Math.max(0, Math.sin(t * 6 + c.id * 2));
  // legs
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = C.crabDark;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const lx = side * (4 + i * 2.5);
      ctx.beginPath();
      ctx.moveTo(lx, -4);
      ctx.lineTo(lx + side * 3, -2 + (i % 2 ? walk : -walk) * 1.2);
      ctx.lineTo(lx + side * 4.5, 0);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = C.ink;
  // claws
  for (const side of [-1, 1]) {
    ctx.fillStyle = C.crab;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(side * 7, -7);
    ctx.lineTo(side * 11, -12);
    ctx.stroke();
    ctx.save();
    ctx.translate(side * 12, -14);
    ctx.rotate(side * (0.3 + snap * 0.35));
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.4, 2.6, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.moveTo(side * 1, -1);
    ctx.lineTo(side * 4.5, -3.5 - snap * 2);
    ctx.lineTo(side * 3, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // body
  ctx.fillStyle = C.crab;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, -6, CRAB_W * 0.42, CRAB_H * 0.48, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.ellipse(-3, -8.5, 3, 1.2, -0.2, 0, TAU);
  ctx.fill();
  // eyes on stalks
  for (const side of [-1, 1]) {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(side * 2.5, -10);
    ctx.lineTo(side * 3, -14);
    ctx.stroke();
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.arc(side * 3, -15, 2, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(side * 3 + c.dir * 0.6, -15, 0.9, 0, TAU);
    ctx.fill();
  }
  // grumpy mouth
  ctx.beginPath();
  ctx.moveTo(-2, -4.5);
  ctx.lineTo(2, -4.5);
  ctx.stroke();
  ctx.restore();
}

function drawJelly(ctx, j, t) {
  ctx.save();
  ctx.translate(j.x, -j.y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (j.rest) {
    // flopped on the sand, snoozing
    ctx.strokeStyle = 'rgba(214,77,170,0.8)';
    ctx.lineWidth = 1.2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 3, 2);
      ctx.quadraticCurveTo(i * 5, 4, i * 6.5, 4);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,138,216,0.9)';
    ctx.strokeStyle = C.ink;
    ctx.beginPath();
    ctx.ellipse(0, 1, JELLY_R * 1.25, JELLY_R * 0.42, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4, -1);
    ctx.lineTo(-1.5, -1);
    ctx.moveTo(1.5, -1);
    ctx.lineTo(4, -1);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const pulse = 1 + Math.sin(t * 4 + j.id) * 0.08;
  // tentacles
  ctx.strokeStyle = 'rgba(214,77,170,0.85)';
  ctx.lineWidth = 1.3;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 2.6, 2);
    for (let k = 1; k <= 4; k++) ctx.lineTo(i * 2.6 + Math.sin(t * 3 + k + i) * 1.6, 2 + k * 3.2);
    ctx.stroke();
  }
  // bell
  ctx.fillStyle = 'rgba(255,138,216,0.88)';
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.ellipse(0, 2, JELLY_R * pulse, JELLY_R * 1.05 / pulse, 0, Math.PI, 0);
  ctx.quadraticCurveTo(JELLY_R * 0.5, 4, 0, 2.5);
  ctx.quadraticCurveTo(-JELLY_R * 0.5, 4, -JELLY_R * pulse, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-3, -4, 2.5, 1.4, -0.4, 0, TAU);
  ctx.fill();
  // face
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(-2.4, -1.5, 0.9, 0, TAU);
  ctx.arc(2.4, -1.5, 0.9, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawLog(ctx, lg) {
  const x = lg.x;
  const y = -(lg.y + LOG_H);
  const w = lg.w;
  const h = LOG_H;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.fillStyle = C.wood;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.6;
  roundRect(ctx, x, y, w, h, h * 0.45);
  ctx.fill();
  ctx.stroke();
  // bark stripes
  ctx.strokeStyle = C.woodDark;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    const yy = y + (h * i) / 4;
    ctx.moveTo(x + h * 0.6, yy);
    for (let k = x + h * 0.6; k < x + w - h * 0.4; k += 8) ctx.lineTo(k + 4, yy + (((k / 8) | 0) % 2 ? 1 : -1));
  }
  ctx.stroke();
  // cut end with rings
  ctx.fillStyle = '#e8b97a';
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(x + w - h * 0.32, y + h / 2, h * 0.3, h * 0.48, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = C.woodDark;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(x + w - h * 0.32, y + h / 2, h * 0.17, h * 0.27, 0, 0, TAU);
  ctx.stroke();
  // a little leaf sprouting
  ctx.fillStyle = C.leaf;
  ctx.beginPath();
  ctx.ellipse(x + w * 0.3, y - 2, 3.5, 1.6, -0.6, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawPalm(ctx, x, gy, t, big) {
  const k = big ? 1.35 : 1;
  const sway = Math.sin(t * 0.9 + x) * 4;
  const tx = x + 12 * k + sway;
  const ty = gy - 80 * k;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.silhouette;
  ctx.lineWidth = 5 * k;
  ctx.beginPath();
  ctx.moveTo(x, gy);
  ctx.quadraticCurveTo(x - 4 * k, gy - 45 * k, tx, ty);
  ctx.stroke();
  ctx.fillStyle = C.silhouette;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI + (i / 6) * Math.PI + Math.sin(t * 1.3 + i) * 0.06;
    const len = (30 + (i % 2) * 8) * k;
    const ex = tx + Math.cos(a) * len;
    const ey = ty + Math.sin(a) * len * 0.45 + len * 0.35;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo((tx + ex) / 2, ty - len * 0.35, ex, ey);
    ctx.quadraticCurveTo((tx + ex) / 2, ty - len * 0.1, tx, ty + 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(tx - 2, ty + 3, 3 * k, 0, TAU);
  ctx.arc(tx + 3, ty + 4, 3 * k, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawShellDecor(ctx, x, gy) {
  ctx.save();
  ctx.translate(x, gy - 3);
  ctx.fillStyle = '#ffd7e8';
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-5, 3);
  ctx.quadraticCurveTo(-6, -4, 0, -5);
  ctx.quadraticCurveTo(6, -4, 5, 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  for (let i = -2; i <= 2; i++) {
    ctx.moveTo(0, 3);
    ctx.lineTo(i * 2, -4);
  }
  ctx.stroke();
  ctx.restore();
}

function drawNest(ctx, x, gy) {
  ctx.save();
  ctx.fillStyle = C.sandMid;
  ctx.beginPath();
  ctx.ellipse(x, gy, 20, 6, 0, Math.PI, 0);
  ctx.fill();
  for (const [ex, tilt] of [[-10, -0.4], [9, 0.5], [-1, 0.1]]) {
    ctx.save();
    ctx.translate(x + ex, gy - 4);
    ctx.rotate(tilt);
    ctx.fillStyle = '#fffaf0';
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.quadraticCurveTo(-4, 5, 0, 5);
    ctx.quadraticCurveTo(4, 5, 4, 0);
    ctx.lineTo(2.5, -1.5);
    ctx.lineTo(1, 0);
    ctx.lineTo(-1, -1.5);
    ctx.lineTo(-2.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

// A sandcastle with a flag: the checkpoint. The flag runs up its pole once reached.
function drawCastle(ctx, x, gy, raised, t) {
  ctx.save();
  ctx.translate(x, gy);
  ctx.fillStyle = C.sandMid;
  ctx.strokeStyle = 'rgba(22,11,51,0.55)';
  ctx.lineWidth = 1;
  const tower = (tx, w, h) => {
    ctx.beginPath();
    ctx.moveTo(tx - w / 2, 0);
    ctx.lineTo(tx - w / 2, -h);
    for (let i = 0; i < 3; i++) {
      const bx = tx - w / 2 + (i * w) / 3;
      ctx.lineTo(bx, -h - 3);
      ctx.lineTo(bx + w / 6, -h - 3);
      ctx.lineTo(bx + w / 6, -h);
      ctx.lineTo(bx + w / 3, -h);
    }
    ctx.lineTo(tx + w / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  tower(-7, 9, 12);
  tower(7, 9, 12);
  tower(0, 10, 19);
  ctx.fillStyle = 'rgba(22,11,51,0.5)';
  roundRect(ctx, -2, -6, 4, 6, 2);
  ctx.fill();
  // pole and flag
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(0, -40);
  ctx.stroke();
  const k = clamp(raised, 0, 1);
  const fy = -26 - k * 13;
  const wave = Math.sin(t * 6) * 1.5 * k;
  ctx.fillStyle = k > 0 ? C.pink : 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(0, fy - 5);
  ctx.quadraticCurveTo(6, fy - 6 + wave, 11, fy - 3 + wave);
  ctx.quadraticCurveTo(6, fy - 1 + wave, 0, fy);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// The goal: a striped buoy with a flag, bobbing at the surface.
function drawBuoy(ctx, x, wy, t) {
  ctx.save();
  ctx.translate(x, wy + Math.sin(t * 2) * 1.2);
  ctx.rotate(Math.sin(t * 1.5) * 0.08);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(0, -40);
  ctx.stroke();
  ctx.fillStyle = C.sun;
  ctx.beginPath();
  ctx.moveTo(0, -40);
  ctx.quadraticCurveTo(9, -40 + Math.sin(t * 5), 16, -35);
  ctx.quadraticCurveTo(9, -31, 0, -30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.moveTo(-9, 2);
  ctx.lineTo(-6, -14);
  ctx.lineTo(6, -14);
  ctx.lineTo(9, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.pink;
  ctx.fillRect(-7.2, -9, 14.4, 5);
  ctx.strokeRect(-7.2, -9, 14.4, 5);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// The world
// ---------------------------------------------------------------------------------------------

// Cheap deterministic noise for scenery specks.
const hash = (n) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

function wave(x, t) {
  return Math.sin(x * 0.07 + t * 2.1) * 1.3 + Math.sin(x * 0.13 - t * 1.4) * 0.8;
}

export function createRenderer() {
  let bubbles = [];
  let bits = []; // splash drops, sparkles, starfish pops
  let lastEvent = -1;
  let bubbleAcc = 0;
  let levelRef = null;

  function reset() {
    bubbles = [];
    bits = [];
    lastEvent = -1;
    levelRef = null;
  }

  // Spawn cosmetic bits for new sim events.
  function absorb(s) {
    if (levelRef !== s.level) {
      reset();
      levelRef = s.level;
      lastEvent = s.now;
    }
    for (const e of s.events) {
      if (e.t <= lastEvent) continue;
      if (e.type === 'splash' || e.type === 'win') {
        const n = e.type === 'win' ? 26 : 10;
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
          const sp = 40 + Math.random() * (e.type === 'win' ? 110 : 60);
          bits.push({ kind: 'drop', x: e.x, y: -e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.9, age: 0 });
        }
      } else if (e.type === 'star') {
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU;
          bits.push({ kind: 'spark', x: e.x, y: -e.y, vx: Math.cos(a) * 50, vy: Math.sin(a) * 50, life: 0.6, age: 0 });
        }
      } else if (e.type === 'hide') {
        for (let i = 0; i < 4; i++) bubbles.push({ x: e.x + (Math.random() - 0.5) * 10, y: -e.y - 6, r: 1 + Math.random() * 1.5, vy: 20 + Math.random() * 15, ph: Math.random() * TAU });
      }
      lastEvent = e.t;
    }
  }

  function step(s, view, dt) {
    for (const b of bits) {
      b.age += dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.kind === 'drop') b.vy += 260 * dt;
      else {
        b.vx *= 0.92;
        b.vy *= 0.92;
      }
    }
    bits = bits.filter((b) => b.age < b.life);
    // bubbles rise from the sea bed and the turtle
    const surf = -s.water;
    bubbleAcc += dt * 3;
    while (bubbleAcc > 1) {
      bubbleAcc -= 1;
      const x = view.camX + Math.random() * view.vw;
      const g = -groundAt(s.level.ground, x);
      if (g > surf + 8) bubbles.push({ x, y: g - 2, r: 0.8 + Math.random() * 1.8, vy: 12 + Math.random() * 14, ph: Math.random() * TAU });
    }
    const t = s.turtle;
    if (t.mode === 'swim' && Math.random() < dt * 2.5) bubbles.push({ x: t.x + 14, y: -(t.y + 6), r: 1 + Math.random(), vy: 18, ph: 0 });
    for (const b of bubbles) {
      b.y -= b.vy * dt;
      b.ph += dt * 3;
    }
    bubbles = bubbles.filter((b) => b.y > surf + 1 && b.x > view.camX - 20 && b.x < view.camX + view.vw + 20).slice(-60);
  }

  // Sky, sun and far islands, in screen px.
  function drawSky(ctx, view, t) {
    const { w, h, s, by, camX } = view;
    const g = ctx.createLinearGradient(0, 0, 0, by);
    g.addColorStop(0, C.night);
    g.addColorStop(0.35, C.dusk);
    g.addColorStop(0.62, C.pink);
    g.addColorStop(0.85, C.orange);
    g.addColorStop(1, '#ffc46b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // twinkly stars high up
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 18; i++) {
      const sx = (hash(i) * w * 1.3 - camX * s * 0.05) % w;
      const sy = hash(i + 50) * by * 0.35;
      const a = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.8 + hash(i + 9)) + i));
      ctx.globalAlpha = a;
      ctx.fillRect((sx + w) % w, sy, 2, 2);
    }
    ctx.globalAlpha = 1;
    // the big sunset sun, with stripes, low over the far horizon
    const horizon = by - 150 * s;
    const sr = Math.min(w * 0.22, 70 * s);
    const sx = w * 0.62 - camX * s * 0.04;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, horizon);
    ctx.clip();
    const sg = ctx.createLinearGradient(0, horizon - sr, 0, horizon + sr * 0.2);
    sg.addColorStop(0, C.sun);
    sg.addColorStop(1, C.orange);
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sx, horizon + sr * 0.15, sr, 0, TAU);
    ctx.fill();
    ctx.fillStyle = C.pink;
    for (let i = 0; i < 4; i++) {
      const yy = horizon - sr * 0.12 - i * sr * 0.2;
      ctx.fillRect(sx - sr, yy, sr * 2, Math.max(2, sr * 0.05 * (4 - i)));
    }
    ctx.restore();
    // far sea band and island silhouettes with palms (slow parallax)
    const fg = ctx.createLinearGradient(0, horizon, 0, by);
    fg.addColorStop(0, '#9a3fb0');
    fg.addColorStop(1, '#ff8fb0');
    ctx.fillStyle = fg;
    ctx.fillRect(0, horizon, w, by - horizon + 2);
    ctx.fillStyle = 'rgba(255,225,77,0.55)';
    for (let i = 0; i < 6; i++) {
      const yy = horizon + 6 + i * 9 * s * 0.4;
      const ww = sr * (1.2 - i * 0.15);
      ctx.fillRect(sx - ww / 2 + Math.sin(t * 1.5 + i) * 4, yy, ww, Math.max(1.5, s * 0.8));
    }
    const par = 0.3;
    ctx.save();
    ctx.translate(-camX * s * par, horizon);
    ctx.scale(s * 0.6, s * 0.6);
    ctx.fillStyle = '#5b2378';
    const span = (w / (s * 0.6)) / 1 + camX * par / 0.6 + 400;
    for (let ix = -200; ix < span; ix += 520) {
      ctx.beginPath();
      ctx.ellipse(ix + 120, 0, 130, 22, 0, Math.PI, 0);
      ctx.fill();
      drawPalmSil(ctx, ix + 90, -14, 0.8, t);
      drawPalmSil(ctx, ix + 140, -18, 1, t);
    }
    ctx.restore();
  }

  function drawPalmSil(ctx, x, y, k, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k, k);
    ctx.strokeStyle = '#5b2378';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-4, -30, 8, -60);
    ctx.stroke();
    ctx.fillStyle = '#5b2378';
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI + (i / 5) * Math.PI + Math.sin(t + i) * 0.05;
      ctx.beginPath();
      ctx.moveTo(8, -60);
      ctx.quadraticCurveTo(8 + Math.cos(a) * 15, -70, 8 + Math.cos(a) * 28, -60 + Math.sin(a) * 8 + 14);
      ctx.quadraticCurveTo(8 + Math.cos(a) * 12, -62, 8, -58);
      ctx.fill();
    }
    ctx.restore();
  }

  // Everything in the world. view: { w, h, s, by, camX, vw }
  function drawWorld(ctx, s, view, t, dt) {
    absorb(s);
    step(s, view, dt);
    const L = s.level;
    const { s: sc, by, camX, vw } = view;
    const x0 = camX - 30;
    const x1 = camX + vw + 30;
    const bottom = (view.h - by) / sc + 20;
    drawSky(ctx, view, t);
    ctx.save();
    ctx.translate(-camX * sc, by);
    ctx.scale(sc, sc);

    // palms standing on the sand, behind everything
    for (const d of L.decor || []) {
      if (d.kind !== 'palm' || d.x < x0 - 60 || d.x > x1 + 60) continue;
      drawPalm(ctx, d.x, -groundAt(L.ground, d.x), t, d.big);
    }
    // pier posts (scenery only)
    for (const r of L.rocks || []) {
      if (r.kind !== 'pier' || r.x1 < x0 || r.x0 > x1) continue;
      ctx.fillStyle = C.woodDark;
      for (let px = r.x0 + 12; px < r.x1; px += 44) {
        const gy = -groundAt(L.ground, px);
        ctx.fillRect(px - 3, -r.y1, 6, gy + r.y1);
      }
    }
    // cave shadows on the ground under the rock
    for (const r of L.rocks || []) {
      if (r.kind !== 'cave' || r.x1 < x0 || r.x0 > x1) continue;
      const g = ctx.createLinearGradient(0, -r.y0, 0, -r.y0 + 40);
      g.addColorStop(0, 'rgba(45,25,80,0.55)');
      g.addColorStop(1, 'rgba(45,25,80,0.1)');
      ctx.fillStyle = g;
      ctx.fillRect(r.x0 + 4, -r.y0, r.x1 - r.x0 - 8, r.y0);
    }

    drawGround(ctx, L, x0, x1, bottom);

    for (const d of L.decor || []) {
      if (d.kind === 'shell' && d.x > x0 && d.x < x1) drawShellDecor(ctx, d.x, -groundAt(L.ground, d.x));
    }
    drawNest(ctx, L.start - 6, -groundAt(L.ground, L.start - 6));
    for (const cp of s.checkpoints) {
      if (cp.x < x0 - 20 || cp.x > x1 + 20) continue;
      const raised = cp.reached ? Math.min(1, (s.now - cp.reachedT) / 0.5) : 0;
      drawCastle(ctx, cp.x - 4, -groundAt(L.ground, cp.x - 4), raised, t);
    }

    // starfish (and the pop when one is picked up)
    for (const f of s.starfish) {
      if (f.x < x0 || f.x > x1) continue;
      if (!f.got) {
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 3 + f.id);
        ctx.fillStyle = C.sun;
        ctx.beginPath();
        ctx.arc(f.x, -f.y, 12, 0, TAU);
        ctx.fill();
        ctx.restore();
        drawStarfish(ctx, f.x, -f.y + Math.sin(t * 2 + f.id) * 1.2, 8.5, t + f.id);
      } else {
        const k = (s.now - f.gotT) / 0.6;
        if (k < 1) {
          ctx.save();
          ctx.globalAlpha = 1 - k;
          drawStarfish(ctx, f.x, -f.y - k * 30, 8.5 * (1 + k), t * 4);
          ctx.restore();
        }
      }
    }

    for (const lg of s.logs) drawLog(ctx, lg);
    for (const j of s.jellies) drawJelly(ctx, j, t);
    for (const c of s.crabs) drawCrab(ctx, c, t);
    drawTheTurtle(ctx, s, t);

    // rocks and the pier deck go in front of the turtle's back
    for (const r of L.rocks || []) {
      if (r.x1 < x0 || r.x0 > x1) continue;
      if (r.kind === 'pier') drawPier(ctx, r);
      else drawRock(ctx, r, r.y1 >= WORLD_H ? Math.max(r.y1, by / sc + 20) : r.y1);
    }

    drawBuoy(ctx, L.goal + 14, -s.water, t);
    drawWater(ctx, s, x0, x1, bottom, t);

    // bits
    for (const b of bits) {
      const a = 1 - b.age / b.life;
      ctx.globalAlpha = a;
      if (b.kind === 'drop') {
        ctx.fillStyle = C.foam;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 1.8, 0, TAU);
        ctx.fill();
      } else drawTinyStar(ctx, b.x, b.y, 2.5, C.sun);
    }
    ctx.globalAlpha = 1;
    drawSpeech(ctx, s, t);
    ctx.restore();
  }

  function drawGround(ctx, L, x0, x1, bottom) {
    const pts = L.ground;
    ctx.beginPath();
    ctx.moveTo(x0, -groundAt(pts, x0));
    for (const [x, h] of pts) if (x > x0 && x < x1) ctx.lineTo(x, -h);
    ctx.lineTo(x1, -groundAt(pts, x1));
    ctx.lineTo(x1, bottom);
    ctx.lineTo(x0, bottom);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -160, 0, 20);
    g.addColorStop(0, C.sand);
    g.addColorStop(0.6, C.sandMid);
    g.addColorStop(1, C.sandDark);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(22,11,51,0.55)';
    ctx.stroke();
    // a sunny lip along the top
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,248,210,0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let prev = null;
    for (const [x, h] of [[x0, groundAt(pts, x0)], ...pts.filter(([x]) => x > x0 && x < x1), [x1, groundAt(pts, x1)]]) {
      if (prev && Math.abs(x - prev[0]) > 0.5) {
        ctx.moveTo(prev[0], -prev[1] + 1.8);
        ctx.lineTo(x, -h + 1.8);
      }
      prev = [x, h];
    }
    ctx.stroke();
    // specks and pebbles
    for (let x = Math.floor(x0 / 14) * 14; x < x1; x += 14) {
      const gy = -groundAt(pts, x);
      for (let k = 0; k < 2; k++) {
        const r = hash(x * 3.1 + k);
        const dy = 6 + r * 60;
        ctx.fillStyle = k ? 'rgba(201,154,82,0.6)' : 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.arc(x + hash(x + k * 7) * 14, gy + dy, 0.8 + r * 1.4, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawRock(ctx, r, top) {
    const yb = -r.y0;
    const yt = -top - 10;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(r.x0 + 2, yt);
    // left side, lumpy
    ctx.lineTo(r.x0 - 2, yb - 30);
    ctx.quadraticCurveTo(r.x0 - 4, yb - 6, r.x0 + 6, yb);
    // bottom edge with drips
    const n = Math.max(3, Math.round((r.x1 - r.x0) / 18));
    for (let i = 0; i < n; i++) {
      const a = r.x0 + 6 + ((r.x1 - r.x0 - 12) * i) / n;
      const b = r.x0 + 6 + ((r.x1 - r.x0 - 12) * (i + 1)) / n;
      const drip = i % 2 ? 2.5 : 0.5;
      ctx.quadraticCurveTo((a + b) / 2, yb + drip, b, yb);
    }
    ctx.quadraticCurveTo(r.x1 + 4, yb - 6, r.x1 + 2, yb - 30);
    ctx.lineTo(r.x1 - 2, yt);
    ctx.closePath();
    const g = ctx.createLinearGradient(r.x0, 0, r.x1, 0);
    g.addColorStop(0, C.rockLight);
    g.addColorStop(0.3, C.rock);
    g.addColorStop(1, C.rockDark);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.stroke();
    // cracks and bumps
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(22,11,51,0.35)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 8; i++) {
      const cx = r.x0 + 10 + hash(r.x0 + i) * (r.x1 - r.x0 - 20);
      const cy = yb - 14 - hash(r.x0 + i * 3) * 120;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + 5, cy + 6);
      ctx.lineTo(cx + 2, cy + 12);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(r.x0 + 8 + hash(r.x1 + i) * (r.x1 - r.x0 - 16), yb - 20 - hash(r.x1 + i * 5) * 140, 5, 3, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    // seaweed dangling from the bottom edge
    ctx.strokeStyle = C.leaf;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let x = r.x0 + 14; x < r.x1 - 8; x += 26) {
      ctx.beginPath();
      ctx.moveTo(x, yb);
      ctx.quadraticCurveTo(x + 3, yb + 4, x - 1, yb + 6);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPier(ctx, r) {
    const y = -r.y1;
    const h = r.y1 - r.y0;
    ctx.save();
    ctx.fillStyle = C.wood;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.6;
    roundRect(ctx, r.x0, y, r.x1 - r.x0, h, 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = C.woodDark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = r.x0 + 11; x < r.x1; x += 11) {
      ctx.moveTo(x, y + 1);
      ctx.lineTo(x, y + h - 1);
    }
    ctx.stroke();
    // railing
    ctx.strokeStyle = C.woodDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r.x0 + 2, y - 12);
    ctx.lineTo(r.x1 - 2, y - 12);
    for (let x = r.x0 + 4; x < r.x1; x += 22) {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 12);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawTheTurtle(ctx, s, t) {
    const tu = s.turtle;
    const swim = tu.mode === 'swim';
    const blink = (t % 3.7) < 0.12;
    let look = null;
    if (tu.blocked === 'wall' && tu.blockedT > 0.2) look = 'up';
    if (tu.mode === 'fall') look = 'down';
    const o = {
      t,
      phase: tu.walked * (swim ? 0.18 : 0.45) + (tu.blocked ? t * 3 : 0) + (swim ? t * 2 : 0),
      swim,
      look,
      blink: blink && tu.mode !== 'eep',
      bonk: tu.blocked === 'bonk' ? Math.min(tu.blockedT * 3, 1.5) : 0,
      eep: tu.mode === 'eep' || tu.mode === 'return',
      alpha: tu.safe > 0 && Math.sin(t * 25) > 0 ? 0.45 : 1,
    };
    let y = -tu.y;
    if (tu.mode === 'eep') y -= Math.abs(Math.sin(tu.modeT * 18)) * 4;
    if (tu.mode === 'return') o.tilt = -tu.modeT * 9;
    if (swim) o.tilt = Math.sin(t * 2.4) * 0.05;
    if (tu.blocked === 'wall' && !swim) o.tilt = -0.12;
    drawTurtle(ctx, tu.x - 3, y, o);
  }

  function drawSpeech(ctx, s, t) {
    const tu = s.turtle;
    if (tu.mode !== 'eep') return;
    const x = tu.x + 6;
    const y = -(tu.y + TURTLE_H + 16);
    const pop = Math.min(1, tu.modeT * 6);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pop, pop);
    ctx.fillStyle = C.white;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.4;
    roundRect(ctx, -15, -9, 30, 16, 7);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4, 7);
    ctx.lineTo(-8, 13);
    ctx.lineTo(2, 7);
    ctx.fill();
    ctx.fillStyle = C.pink;
    ctx.font = font(10);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('eep!', 0, -1 + Math.sin(t * 30) * 0.6);
    ctx.restore();
  }

  function drawWater(ctx, s, x0, x1, bottom, t) {
    const surf = -s.water;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, surf - wave(x0, t));
    for (let x = x0; x <= x1 + 6; x += 6) ctx.lineTo(x, surf - wave(x, t));
    ctx.lineTo(x1 + 6, bottom);
    ctx.lineTo(x0, bottom);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, surf, 0, Math.max(surf + 20, 10));
    g.addColorStop(0, 'rgba(40,215,230,0.5)');
    g.addColorStop(1, 'rgba(11,111,160,0.62)');
    ctx.fillStyle = g;
    ctx.fill();
    // light rays
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    for (let i = Math.floor(x0 / 60); i < x1 / 60; i++) {
      const rx = i * 60 + Math.sin(t * 0.6 + i) * 10;
      ctx.beginPath();
      ctx.moveTo(rx, surf);
      ctx.lineTo(rx + 14, surf);
      ctx.lineTo(rx - 10, surf + 90);
      ctx.lineTo(rx - 26, surf + 90);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // foam line
    ctx.beginPath();
    for (let x = x0; x <= x1 + 6; x += 6) ctx.lineTo(x, surf - wave(x, t));
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.strokeStyle = 'rgba(201,251,255,0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let x = x0; x <= x1 + 6; x += 6) ctx.lineTo(x, surf - wave(x, t) + 3.5);
    ctx.stroke();
    // bubbles
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 0.8;
    for (const b of bubbles) {
      ctx.beginPath();
      ctx.arc(b.x + Math.sin(b.ph) * 1.5, b.y, b.r, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  return { reset, drawWorld };
}

// ---------------------------------------------------------------------------------------------
// Small pictures for the picker, HUD and launcher (screen px)
// ---------------------------------------------------------------------------------------------

// What each level teaches, as a picture centred at (x, y), about r across.
export function drawTeachIcon(ctx, kind, x, y, r, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  const k = r / 16;
  ctx.scale(k, k);
  if (kind === 'crab') drawCrab(ctx, { x: 0, y: -8, id: 1, dir: 1, pause: 0, hidden: false }, t);
  else if (kind === 'jelly') drawJelly(ctx, { x: 0, y: 2, id: 1, rest: false }, t);
  else if (kind === 'log') drawLog(ctx, { x: -16, y: -10, w: 32 });
  else if (kind === 'down' || kind === 'up' || kind === 'swell') {
    // a wave with an arrow
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = -14; i <= 14; i++) ctx.lineTo(i, 8 + Math.sin(i * 0.45 + t * 3) * 2.5);
    ctx.stroke();
    if (kind !== 'swell') {
      const d = kind === 'up' ? -1 : 1;
      ctx.fillStyle = C.sun;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -2 + d * 12);
      ctx.lineTo(9, -2);
      ctx.lineTo(4, -2);
      ctx.lineTo(4, -2 - d * 9);
      ctx.lineTo(-4, -2 - d * 9);
      ctx.lineTo(-4, -2);
      ctx.lineTo(-9, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      for (let i = -14; i <= 14; i++) ctx.lineTo(i, -4 + Math.sin(i * 0.45 + t * 3 + 1) * 2.5);
      ctx.stroke();
    }
  } else if (kind === 'star') drawStarfish(ctx, 0, 0, 14, t);
  else {
    ctx.scale(0.6, 0.6);
    drawTurtle(ctx, 3, 12, { t, phase: t * 4 });
  }
  ctx.restore();
}

// The launcher tile: a sunset, the tide rising and falling, a turtle floating up over a sand step.
export function drawTile(ctx, x, y, w, h, time) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, C.dusk);
  sky.addColorStop(0.45, C.pink);
  sky.addColorStop(0.75, C.orange);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  // sun
  ctx.fillStyle = C.sun;
  ctx.beginPath();
  ctx.arc(x + w * 0.72, y + h * 0.42, w * 0.16, 0, TAU);
  ctx.fill();
  ctx.fillStyle = C.pink;
  for (let i = 0; i < 3; i++) ctx.fillRect(x + w * 0.56, y + h * (0.42 + i * 0.045), w * 0.32, Math.max(1.5, h * 0.012 * (3 - i)));
  // a palm silhouette
  const sc = w / 230;
  ctx.save();
  ctx.translate(x + w * 0.16, y + h * 0.62);
  ctx.scale(sc, sc);
  drawPalm(ctx, 0, 0, time, true);
  ctx.restore();
  // sand: low beach, then a step up
  const step = x + w * 0.55;
  const low = y + h * 0.78;
  const high = y + h * 0.6;
  ctx.fillStyle = C.sand;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = Math.max(1.5, w * 0.008);
  ctx.beginPath();
  ctx.moveTo(x - 2, low);
  ctx.lineTo(step, low);
  ctx.lineTo(step, high);
  ctx.lineTo(x + w + 2, high);
  ctx.lineTo(x + w + 2, y + h + 2);
  ctx.lineTo(x - 2, y + h + 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // the tide going up and down, the turtle riding it
  const k = (Math.sin(time * 1.2) + 1) / 2;
  const water = low + 6 - k * (low - high + 26) * 1.0;
  const tx = x + w * 0.38 + k * w * 0.18;
  const ty = Math.min(low, water + h * 0.03);
  ctx.save();
  ctx.translate(tx, ty);
  const ts = (w / 230) * 2.6;
  ctx.scale(ts, ts);
  drawTurtle(ctx, 0, 0, { t: time, phase: time * 5, swim: water < low - 4, blink: (time % 3) < 0.12 });
  ctx.restore();
  const wg = ctx.createLinearGradient(0, water, 0, y + h);
  wg.addColorStop(0, 'rgba(40,215,230,0.6)');
  wg.addColorStop(1, 'rgba(11,111,160,0.75)');
  ctx.fillStyle = wg;
  ctx.beginPath();
  ctx.moveTo(x, water);
  for (let i = 0; i <= 24; i++) ctx.lineTo(x + (w * i) / 24, water + Math.sin(i * 0.9 + time * 3) * h * 0.012);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = C.white;
  ctx.lineWidth = Math.max(2, w * 0.012);
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) ctx.lineTo(x + (w * i) / 24, water + Math.sin(i * 0.9 + time * 3) * h * 0.012);
  ctx.stroke();
  // the up/down hint on the edge
  const hx = x + w * 0.92;
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  roundRect(ctx, hx - w * 0.02, y + h * 0.18, w * 0.04, h * 0.7, w * 0.02);
  ctx.fill();
  ctx.fillStyle = C.water;
  ctx.strokeStyle = C.white;
  ctx.lineWidth = Math.max(2, w * 0.012);
  ctx.beginPath();
  ctx.arc(hx, water, w * 0.045, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // a starfish
  drawStarfish(ctx, x + w * 0.8, y + h * 0.5, w * 0.05, time);
  ctx.restore();
}
