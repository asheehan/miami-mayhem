// Sandcastle Smash drawing. Reads the game state and never changes the rules; the only state
// here is cosmetic (sand puffs, shards, score pops, wobbles, confetti). The world is metres
// with y up; each thing is drawn at its screen spot under its own small transform.
import { SLING, MATERIALS, NUTS, CRAB_W, CRAB_H, BUCKET_W, BUCKET_H } from './sim.js';

export const C = {
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
  trunkDark: '#5e3a24',
  wood: '#c08a57',
  woodDark: '#7a4e2c',
  woodLight: '#e0b07e',
  ice: '#bff4ff',
  iceDark: '#62c6e6',
  rock: '#8f84b8',
  rockDark: '#5c5088',
  crab: '#ff5a4b',
  crabDark: '#c2302a',
  hat: '#2ec4b6',
  hatDark: '#1a8a80',
  nut: '#7a4a28',
  nutDark: '#4a2a14',
  nutLight: '#a8703f',
  pine: '#ffc93c',
  pineDark: '#d18a1c',
  dusk: '#7a1fa2',
  night: '#2b1055',
};

export const font = (px, weight = 900) => `${weight} ${Math.round(px)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

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
  if (tw > room) {
    ctx.font = font((px * room) / tw);
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
// Things, each drawn about (0, 0) in metres with y down (so the caller scales by px/metre).

// A coconut of radius r. kind: 'coco' | 'split' | 'bit' | 'heavy' | 'pineapple'.
export function drawCoconut(ctx, kind, r, spin = 0, lw = 0.05) {
  ctx.save();
  ctx.rotate(spin);
  ctx.lineWidth = lw;
  ctx.strokeStyle = C.ink;
  if (kind === 'pineapple') {
    // leafy crown
    ctx.fillStyle = C.leaf;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.25, -r * 0.8);
      ctx.quadraticCurveTo(i * r * 0.35, -r * 1.5, i * r * 0.42, -r * 1.75 + Math.abs(i) * r * 0.25);
      ctx.quadraticCurveTo(i * r * 0.1, -r * 1.2, r * 0.25, -r * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = C.pine;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.9, r * 1.05, 0, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = C.pineDark;
    ctx.lineWidth = lw * 0.9;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * r * 0.5 - r, -r * 1.2);
      ctx.lineTo(i * r * 0.5 + r, r * 1.2);
      ctx.moveTo(i * r * 0.5 + r, -r * 1.2);
      ctx.lineTo(i * r * 0.5 - r, r * 1.2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.9, r * 1.05, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const heavy = kind === 'heavy';
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, heavy ? '#6b6488' : C.nutLight);
  g.addColorStop(1, heavy ? '#262040' : C.nut);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  if (!heavy) {
    // hairy strokes
    ctx.strokeStyle = C.nutDark;
    ctx.lineWidth = lw * 0.7;
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + 0.3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45);
      ctx.lineTo(Math.cos(a + 0.25) * r * 0.85, Math.sin(a + 0.25) * r * 0.85);
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = C.sun;
    ctx.lineWidth = r * 0.16;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, -0.6, 0.9);
    ctx.stroke();
  }
  // three eyes (finger holes on the heavy one)
  ctx.fillStyle = heavy ? '#120e22' : C.nutDark;
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i - 1) * 0.5;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45 + r * 0.05, r * 0.12, 0, TAU);
    ctx.fill();
  }
  if (kind === 'split') {
    // a zig-zag seam shows it will split
    ctx.strokeStyle = C.sun;
    ctx.lineWidth = r * 0.14;
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) ctx.lineTo(-r * 0.8 + (i * r * 1.6) / 6, (i % 2 ? -1 : 1) * r * 0.15 + r * 0.35);
    ctx.stroke();
  }
  // shine
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.45, r * 0.22, r * 0.12, -0.6, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// A grumpy crab in a little bucket hat, about its middle, CRAB_W across. mood: 'grumpy' |
// 'scared' | 'dizzy' | 'laugh'.
export function drawCrab(ctx, o = {}) {
  const t = o.t || 0;
  const mood = o.mood || 'grumpy';
  const lw = o.lw || 0.05;
  const hw = CRAB_W / 2;
  const hh = CRAB_H / 2;
  ctx.save();
  ctx.lineWidth = lw;
  ctx.strokeStyle = C.ink;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // legs
  ctx.strokeStyle = C.crabDark;
  ctx.lineWidth = lw * 1.6;
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 3; i++) {
      const lx = side * (hw * 0.45 + i * hw * 0.17);
      const k = Math.sin(t * 9 + i + side) * 0.03;
      ctx.beginPath();
      ctx.moveTo(lx * 0.8, hh * 0.3);
      ctx.lineTo(lx + side * 0.06, hh * 0.7 + k);
      ctx.lineTo(lx + side * 0.1, hh + k);
      ctx.stroke();
    }
  }
  // claws up, snapping
  const snap = mood === 'scared' ? 0.5 : (Math.sin(t * 5) + 1) * 0.18;
  for (let side = -1; side <= 1; side += 2) {
    const cx = side * hw * 0.95;
    const cy = -hh * 0.55 + (mood === 'scared' ? -0.08 : Math.sin(t * 3 + side) * 0.03);
    ctx.strokeStyle = C.crabDark;
    ctx.lineWidth = lw * 1.6;
    ctx.beginPath();
    ctx.moveTo(side * hw * 0.6, hh * 0.05);
    ctx.lineTo(cx, cy + 0.08);
    ctx.stroke();
    ctx.fillStyle = C.crab;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(cx, cy, 0.13, side > 0 ? -Math.PI * 0.5 + snap : -Math.PI * 0.5, side > 0 ? Math.PI * 1.5 : Math.PI * 1.5 - snap);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // body
  ctx.fillStyle = C.crab;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.ellipse(0, hh * 0.1, hw * 0.78, hh * 0.72, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.ellipse(-hw * 0.25, -hh * 0.2, hw * 0.25, hh * 0.18, -0.3, 0, TAU);
  ctx.fill();
  // eye stalks and eyes
  const blink = mood !== 'scared' && (t % 3.7) < 0.12;
  for (let side = -1; side <= 1; side += 2) {
    const ex = side * hw * 0.28;
    const ey = -hh * 0.75;
    ctx.strokeStyle = C.crabDark;
    ctx.lineWidth = lw * 1.4;
    ctx.beginPath();
    ctx.moveTo(ex * 0.8, -hh * 0.35);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    const er = mood === 'scared' ? 0.12 : 0.095;
    ctx.fillStyle = C.white;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    if (blink) ctx.ellipse(ex, ey, er, er * 0.2, 0, 0, TAU);
    else ctx.arc(ex, ey, er, 0, TAU);
    ctx.fill();
    ctx.stroke();
    if (!blink) {
      ctx.fillStyle = C.ink;
      if (mood === 'dizzy') {
        ctx.lineWidth = lw * 0.6;
        ctx.beginPath();
        for (let k = 0; k < 10; k++) {
          const a = k * 0.9 + t * 8;
          ctx.lineTo(ex + Math.cos(a) * er * k * 0.08, ey + Math.sin(a) * er * k * 0.08);
        }
        ctx.stroke();
      } else {
        const px = mood === 'scared' ? 0 : side * -0.015 + 0.02;
        ctx.beginPath();
        ctx.arc(ex + px, ey + 0.01, er * (mood === 'scared' ? 0.35 : 0.5), 0, TAU);
        ctx.fill();
      }
      if (mood === 'grumpy' || mood === 'laugh') {
        // cross eyebrows
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = lw * 1.2;
        ctx.beginPath();
        ctx.moveTo(ex - side * er * 1.1, ey - er * 1.25);
        ctx.lineTo(ex + side * er * 0.9, ey - er * 0.65);
        ctx.stroke();
      }
    }
  }
  // mouth
  ctx.strokeStyle = C.ink;
  ctx.fillStyle = C.ink;
  ctx.lineWidth = lw;
  ctx.beginPath();
  if (mood === 'scared') {
    ctx.ellipse(0, hh * 0.3, 0.07, 0.09, 0, 0, TAU);
    ctx.fill();
  } else if (mood === 'laugh') {
    ctx.arc(0, hh * 0.15, 0.12, 0.1, Math.PI - 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C.pink;
    ctx.beginPath();
    ctx.ellipse(0.03, hh * 0.38, 0.05, 0.04, 0, 0, TAU);
    ctx.fill();
  } else if (mood === 'dizzy') {
    for (let i = 0; i <= 6; i++) ctx.lineTo(-0.12 + i * 0.04, hh * 0.3 + (i % 2 ? -0.025 : 0.025));
    ctx.stroke();
  } else {
    ctx.arc(0, hh * 0.45, 0.12, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.stroke();
  }
  // bucket hat
  ctx.save();
  ctx.translate(0, -hh * 0.62);
  ctx.rotate(-0.12);
  ctx.fillStyle = C.hat;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.ellipse(0, 0, hw * 0.62, 0.07, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-hw * 0.38, -0.02);
  ctx.lineTo(-hw * 0.3, -0.24);
  ctx.quadraticCurveTo(0, -0.3, hw * 0.3, -0.24);
  ctx.lineTo(hw * 0.38, -0.02);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.white;
  ctx.fillRect(-hw * 0.36, -0.09, hw * 0.72, 0.05);
  ctx.restore();
  ctx.restore();
}

// A box-shaped block, centred, hw/hh in metres.
function drawBlock(ctx, b, lw, crack) {
  const { hw, hh } = b;
  ctx.lineWidth = lw;
  ctx.strokeStyle = C.ink;
  ctx.lineJoin = 'round';
  if (b.mat === 'sand') {
    ctx.fillStyle = C.sand;
    roundRect(ctx, -hw, -hh, hw * 2, hh * 2, Math.min(hw, hh) * 0.15);
    ctx.fill();
    // shade along the bottom and dimples
    ctx.fillStyle = 'rgba(201,154,82,0.45)';
    ctx.fillRect(-hw, hh * 0.45, hw * 2, hh * 0.55);
    ctx.fillStyle = C.sandDark;
    const n = Math.max(3, Math.round(hw * hh * 14));
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.arc(-hw + hash(b.id * 7 + i) * hw * 2, -hh + hash(b.id * 13 + i) * hh * 2, 0.035, 0, TAU);
      ctx.fill();
    }
    // crenellations on castle-ish cubes
    if (hh >= 0.45 && hw >= 0.45) {
      ctx.fillStyle = C.sandMid;
      ctx.fillRect(-hw * 0.2, -hh * 0.65, hw * 0.4, hh * 0.55);
      ctx.strokeRect(-hw * 0.2, -hh * 0.65, hw * 0.4, hh * 0.55);
    }
    roundRect(ctx, -hw, -hh, hw * 2, hh * 2, Math.min(hw, hh) * 0.15);
    ctx.stroke();
  } else if (b.mat === 'wood') {
    ctx.fillStyle = C.wood;
    roundRect(ctx, -hw, -hh, hw * 2, hh * 2, Math.min(hw, hh) * 0.45);
    ctx.fill();
    ctx.strokeStyle = C.woodDark;
    ctx.lineWidth = lw * 0.7;
    const long = hw > hh;
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath();
      if (long) {
        const y = -hh + (i * hh * 2) / 3;
        ctx.moveTo(-hw * 0.85, y);
        ctx.bezierCurveTo(-hw * 0.3, y - hh * 0.25, hw * 0.3, y + hh * 0.25, hw * 0.85, y);
      } else {
        const x = -hw + (i * hw * 2) / 3;
        ctx.moveTo(x, -hh * 0.85);
        ctx.bezierCurveTo(x - hw * 0.25, -hh * 0.3, x + hw * 0.25, hh * 0.3, x, hh * 0.85);
      }
      ctx.stroke();
    }
    ctx.fillStyle = C.woodDark;
    ctx.beginPath();
    ctx.ellipse(long ? hw * 0.4 : 0, long ? 0 : hh * 0.3, Math.min(hw, hh) * 0.3, Math.min(hw, hh) * 0.2, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    if (long) ctx.fillRect(-hw * 0.9, -hh * 0.8, hw * 1.8, hh * 0.3);
    else ctx.fillRect(-hw * 0.8, -hh * 0.9, hw * 0.3, hh * 1.8);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw;
    roundRect(ctx, -hw, -hh, hw * 2, hh * 2, Math.min(hw, hh) * 0.45);
    ctx.stroke();
  } else if (b.mat === 'ice') {
    const g = ctx.createLinearGradient(-hw, -hh, hw, hh);
    g.addColorStop(0, 'rgba(235,252,255,0.95)');
    g.addColorStop(1, 'rgba(120,210,240,0.9)');
    ctx.fillStyle = g;
    roundRect(ctx, -hw, -hh, hw * 2, hh * 2, Math.min(hw, hh) * 0.2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = lw * 1.2;
    ctx.beginPath();
    ctx.moveTo(-hw * 0.7, hh * 0.2);
    ctx.lineTo(-hw * 0.1, -hh * 0.65);
    ctx.moveTo(-hw * 0.45, hh * 0.55);
    ctx.lineTo(-hw * 0.25, hh * 0.25);
    ctx.stroke();
    ctx.strokeStyle = '#2a7fa8';
    ctx.lineWidth = lw;
    roundRect(ctx, -hw, -hh, hw * 2, hh * 2, Math.min(hw, hh) * 0.2);
    ctx.stroke();
  } else if (b.mat === 'bucket') {
    // an upside-down sand bucket: wide at the bottom
    const colours = [['#ff5a8a', '#c22a5a'], ['#3a7bff', '#2350b8'], ['#ffd23a', '#d19a1c']];
    const [fill, dark] = colours[b.id % 3];
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(-hw * 0.72, -hh);
    ctx.lineTo(hw * 0.72, -hh);
    ctx.lineTo(hw, hh);
    ctx.lineTo(-hw, hh);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = dark;
    ctx.fillRect(-hw * 0.95, hh * 0.62, hw * 1.9, hh * 0.3);
    ctx.strokeStyle = dark;
    ctx.lineWidth = lw * 0.9;
    ctx.beginPath();
    ctx.arc(0, hh * 0.1, hw * 0.75, 0.15, Math.PI - 0.15);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(-hw * 0.55, -hh * 0.8, hw * 0.18, hh * 1.3);
  } else if (b.mat === 'rock') {
    if (b.look === 'pier') {
      ctx.fillStyle = C.woodDark;
      ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
      ctx.fillStyle = C.wood;
      for (let x = -hw; x < hw; x += 0.6) ctx.fillRect(x + 0.03, -hh, 0.54, hh * 1.4);
      ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
    } else if (b.look === 'post') {
      ctx.fillStyle = C.woodDark;
      ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
      ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      for (let y = -hh + 0.4; y < hh; y += 0.5) {
        ctx.moveTo(-hw, y);
        ctx.lineTo(hw, y + 0.1);
      }
      ctx.stroke();
    } else {
      ctx.fillStyle = C.rock;
      roundRect(ctx, -hw, -hh, hw * 2, hh * 2, Math.min(hw, hh) * 0.4);
      ctx.fill();
      ctx.fillStyle = C.rockDark;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.ellipse(-hw + hash(b.id + i) * hw * 2, -hh * 0.5 + hash(b.id * 3 + i) * hh * 1.2, 0.2, 0.08, 0, 0, TAU);
        ctx.fill();
      }
      roundRect(ctx, -hw, -hh, hw * 2, hh * 2, Math.min(hw, hh) * 0.4);
      ctx.stroke();
    }
  }
  if (crack > 0.2) {
    ctx.strokeStyle = b.mat === 'ice' ? 'rgba(255,255,255,0.95)' : 'rgba(22,11,51,0.6)';
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    const n = crack > 0.6 ? 3 : 2;
    for (let k = 0; k < n; k++) {
      let x = (hash(b.id * 5 + k) - 0.5) * hw * 1.2;
      let y = -hh;
      ctx.moveTo(x, y);
      for (let i = 0; i < 4; i++) {
        x += (hash(b.id * 9 + k * 4 + i) - 0.5) * hw * 0.7;
        y += (hh * 2 * crack) / 4;
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
}

function drawBall(ctx, b, lw) {
  const r = b.r;
  const cols = ['#ff3d5a', C.white, '#3a7bff', C.white, C.sun, C.white];
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = cols[i];
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, (i * TAU) / 6, ((i + 1) * TAU) / 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.2, 0, TAU);
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = C.ink;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();
}

// The palm-tree slingshot, base at (0, 0) in metres, y down; the fork is at SLING.
function drawSlingTree(ctx, lw, t, front) {
  const fx = 0;
  const fy = -SLING.y;
  if (!front) {
    // trunk, gently curved, in rings
    ctx.fillStyle = C.trunk;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(-0.32, 0);
    ctx.quadraticCurveTo(-0.35, fy * 0.5, -0.12, fy + 0.25);
    ctx.lineTo(0.12, fy + 0.25);
    ctx.quadraticCurveTo(0.05, fy * 0.5, 0.32, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = C.trunkDark;
    for (let y = -0.3; y > fy + 0.3; y -= 0.32) {
      ctx.beginPath();
      ctx.moveTo(-0.28 + (y / fy) * 0.12, y);
      ctx.quadraticCurveTo(0, y + 0.08, 0.26 - (y / fy) * 0.12, y);
      ctx.stroke();
    }
    // back prong with its fronds
    ctx.fillStyle = C.trunk;
    ctx.strokeStyle = C.ink;
    ctx.beginPath();
    ctx.moveTo(-0.12, fy + 0.3);
    ctx.lineTo(-0.42, fy - 0.55);
    ctx.lineTo(-0.26, fy - 0.6);
    ctx.lineTo(0.02, fy + 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * 0.95 + i * 0.45 + Math.sin(t * 1.5 + i) * 0.05;
      ctx.fillStyle = i % 2 ? C.leaf : C.leafDark;
      ctx.beginPath();
      ctx.moveTo(-0.34, fy - 0.6);
      ctx.quadraticCurveTo(-0.34 + Math.cos(a) * 0.6, fy - 0.6 + Math.sin(a) * 0.6 - 0.25, -0.34 + Math.cos(a) * 1.1, fy - 0.6 + Math.sin(a) * 1.1 + 0.15);
      ctx.quadraticCurveTo(-0.34 + Math.cos(a) * 0.5, fy - 0.6 + Math.sin(a) * 0.5, -0.34, fy - 0.6);
      ctx.fill();
      ctx.stroke();
    }
  } else {
    // the front prong
    ctx.fillStyle = C.trunk;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(-0.02, fy + 0.2);
    ctx.lineTo(0.32, fy - 0.55);
    ctx.lineTo(0.48, fy - 0.5);
    ctx.lineTo(0.12, fy + 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.nut;
    ctx.beginPath();
    ctx.arc(fx + 0.4, fy - 0.55, 0.1, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------------------------
// Backdrops

const SKIES = {
  morning: ['#7fd3ff', '#bfeaff', '#fff1c4'],
  noon: ['#2f9bff', '#7fd0ff', '#d4f4ff'],
  sunset: [C.dusk, C.pink, C.orange],
};

export function drawSky(ctx, w, h, sky, horizon, time) {
  const cols = SKIES[sky] || SKIES.morning;
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, cols[0]);
  g.addColorStop(0.6, cols[1]);
  g.addColorStop(1, cols[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, horizon + 2);
  // sun
  const sr = Math.min(w, h) * 0.09;
  const sx = sky === 'sunset' ? w * 0.7 : sky === 'noon' ? w * 0.78 : w * 0.2;
  const sy = sky === 'sunset' ? horizon - sr * 0.3 : sky === 'noon' ? horizon * 0.2 : horizon * 0.45;
  ctx.fillStyle = sky === 'sunset' ? C.sun : 'rgba(255,240,150,0.95)';
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, TAU);
  ctx.fill();
  if (sky === 'sunset') {
    ctx.fillStyle = C.pink;
    for (let i = 0; i < 4; i++) ctx.fillRect(sx - sr, sy + sr * 0.1 - i * sr * 0.22, sr * 2, Math.max(2, sr * 0.05 * (4 - i)));
  } else {
    ctx.fillStyle = 'rgba(255,240,150,0.25)';
    ctx.beginPath();
    ctx.arc(sx, sy, sr * 1.5, 0, TAU);
    ctx.fill();
  }
  // clouds drifting
  ctx.fillStyle = sky === 'sunset' ? 'rgba(255,190,220,0.55)' : 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 4; i++) {
    const cw = Math.min(w, h) * (0.12 + hash(i) * 0.08);
    const cx = ((hash(i + 5) * w + time * (8 + i * 3)) % (w + cw * 3)) - cw * 1.5;
    const cy = horizon * (0.12 + hash(i + 9) * 0.5);
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw, cw * 0.3, 0, 0, TAU);
    ctx.ellipse(cx - cw * 0.4, cy - cw * 0.15, cw * 0.45, cw * 0.35, 0, 0, TAU);
    ctx.ellipse(cx + cw * 0.3, cy - cw * 0.2, cw * 0.5, cw * 0.42, 0, 0, TAU);
    ctx.fill();
  }
}

export function drawSea(ctx, w, top, bottom, sky, time) {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, sky === 'sunset' ? '#7a5bd6' : '#1aa6d6');
  g.addColorStop(1, sky === 'sunset' ? '#ff9a8a' : '#5ee6f0');
  ctx.fillStyle = g;
  ctx.fillRect(0, top, w, bottom - top + 1);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  for (let k = 0; k < 3; k++) {
    const y = top + ((bottom - top) * (k + 0.6)) / 3.4;
    ctx.beginPath();
    for (let x = ((time * 14 * (k + 1)) % 60) - 60; x < w; x += 60) {
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 10, y - 4, x + 20, y);
    }
    ctx.stroke();
  }
}

function drawSand(ctx, w, top, h, time) {
  const g = ctx.createLinearGradient(0, top, 0, h);
  g.addColorStop(0, C.sand);
  g.addColorStop(1, C.sandMid);
  ctx.fillStyle = g;
  ctx.fillRect(0, top, w, h - top);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, top);
  ctx.lineTo(w, top);
  ctx.stroke();
  // the shoreline lapping at the bottom
  const sy = top + (h - top) * 0.62;
  if (h - sy > 20) {
    const wy = sy + Math.sin(time * 1.3) * 5;
    ctx.fillStyle = 'rgba(25,195,214,0.85)';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 10; x += 10) ctx.lineTo(x, wy + Math.sin(x / 35 + time * 2) * 4);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let x = 0; x <= w + 10; x += 10) ctx.lineTo(x, wy + Math.sin(x / 35 + time * 2) * 4);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------------------------
// The live world

export function createRenderer() {
  let parts = []; // { x, y, vx, vy, life, max, kind, colour, r, rot, spin, text }
  let shakes = new Map(); // body id -> wobble 0..1
  let laughUntil = -1;
  let screenShake = 0;

  const add = (p) => {
    if (parts.length >= 500) return;
    // score pops stack up instead of landing on each other
    if (p.kind === 'text') {
      for (let k = 0; k < 6; k++) {
        const clash = parts.some((q) => q.kind === 'text' && Math.abs(q.x - p.x) < 1.4 && Math.abs(q.y - p.y) < 0.7);
        if (!clash) break;
        p.y += 0.75;
      }
    }
    parts.push({ rot: 0, spin: 0, ...p, max: p.life });
  };

  function burstOf(kind, x, y, n, speed, colours, size = 0.12, life = 0.9) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const v = speed * (0.3 + Math.random() * 0.7);
      add({
        kind, x: x + (Math.random() - 0.5) * 0.4, y: y + (Math.random() - 0.5) * 0.4,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v + speed * 0.4,
        life: life * (0.6 + Math.random() * 0.6), colour: colours[i % colours.length], r: size * (0.5 + Math.random()),
        spin: (Math.random() - 0.5) * 12,
      });
    }
  }

  return {
    reset() {
      parts = [];
      shakes = new Map();
      laughUntil = -1;
      screenShake = 0;
    },

    // Turn the game's events into effects.
    take(events, time) {
      for (const e of events) {
        if (e.type === 'break') {
          if (e.mat === 'sand') burstOf('grain', e.x, e.y, 26, 4, [C.sand, C.sandMid, C.sandDark], 0.09, 1.1);
          else if (e.mat === 'ice') burstOf('shard', e.x, e.y, 16, 5, [C.ice, C.white, C.iceDark], 0.18, 0.9);
          else burstOf('splinter', e.x, e.y, 12, 4, [C.wood, C.woodDark, C.woodLight], 0.22, 1.0);
          burstOf('puff', e.x, e.y, 4, 1, ['rgba(255,245,220,0.8)'], 0.4, 0.6);
          add({ kind: 'text', x: e.x, y: e.y + 0.4, vx: 0, vy: 1.2, life: 0.8, text: `+${MATERIALS[e.mat].points}`, colour: C.white, r: 0.42 });
        } else if (e.type === 'pop') {
          burstOf('puff', e.x, e.y, 9, 2.4, ['rgba(255,255,255,0.95)', 'rgba(255,230,240,0.9)'], 0.45, 0.8);
          burstOf('grain', e.x, e.y, 10, 5, [C.crab, C.hat, C.sun], 0.1, 0.9);
          add({ kind: 'text', x: e.x, y: e.y + 0.6, vx: 0, vy: 1.6, life: 1.3, text: `+${e.points}`, colour: C.sun, r: 0.75 });
          add({ kind: 'hat', x: e.x, y: e.y + 0.3, vx: (Math.random() - 0.3) * 3, vy: 6, life: 1.6, colour: C.hat, r: 0.3, spin: 8 });
          screenShake = Math.max(screenShake, 0.25);
        } else if (e.type === 'thud') {
          if (e.ids) for (const id of e.ids) shakes.set(id, 1);
          if (e.speed > 4) burstOf('grain', e.x, e.y, Math.min(10, Math.round(e.speed)), 2, [C.sand, C.sandMid], 0.07, 0.6);
          if (e.heavy) screenShake = Math.max(screenShake, 0.4);
        } else if (e.type === 'burst') {
          burstOf('puff', e.x, e.y, 14, 6, ['rgba(255,240,150,0.95)', 'rgba(255,200,80,0.9)', 'rgba(255,255,255,0.9)'], 0.6, 0.7);
          burstOf('shard', e.x, e.y, 18, 8, [C.pine, C.leaf, C.pineDark], 0.15, 0.9);
          add({ kind: 'ring', x: e.x, y: e.y, vx: 0, vy: 0, life: 0.45, r: e.r, colour: C.sun });
          screenShake = Math.max(screenShake, 0.6);
        } else if (e.type === 'split') {
          burstOf('puff', e.x, e.y, 6, 2, ['rgba(255,255,255,0.9)'], 0.3, 0.5);
          add({ kind: 'ring', x: e.x, y: e.y, vx: 0, vy: 0, life: 0.3, r: 1.2, colour: C.white });
        } else if (e.type === 'poof') {
          burstOf('puff', e.x, e.y, 4, 1, ['rgba(255,255,255,0.8)'], 0.3, 0.5);
        } else if (e.type === 'reload') {
          laughUntil = time + 1.6;
        } else if (e.type === 'fire') {
          burstOf('leaf', SLING.x, SLING.y + 0.4, 3, 2, [C.leaf, C.leafDark], 0.14, 0.8);
        }
      }
    },

    shakeOffset(time) {
      if (screenShake <= 0) return { x: 0, y: 0 };
      return { x: Math.sin(time * 60) * screenShake * 8, y: Math.cos(time * 47) * screenShake * 6 };
    },

    // view: { s, camX, groundY, w, h }; aim: { pull (0..1), angle } while dragging.
    drawWorld(ctx, game, view, time, dt, aim) {
      const { s, w, h } = view;
      const sky = game.level.sky;
      const X = (x) => (x - view.camX) * s;
      const Y = (y) => view.groundY - y * s;
      const lw = Math.max(0.035, 1.6 / s);

      screenShake = Math.max(0, screenShake - dt * 1.5);
      const horizon = Math.min(view.groundY - s * 1.2, view.groundY - h * 0.06);
      drawSky(ctx, w, h, sky, horizon, time);
      drawSea(ctx, w, horizon, view.groundY, sky, time);
      // far palms on the sand bar, drifting slower than the world
      for (let i = 0; i < 4; i++) {
        const px = ((i * 9 + 6 - view.camX * 0.5) * s) % (w + s * 6);
        drawBackPalm(ctx, px, horizon + s * 0.3, s * 0.5, time + i);
      }
      drawSand(ctx, w, view.groundY, h, time);

      ctx.save();
      // the slingshot (back half)
      ctx.save();
      ctx.translate(X(SLING.x), Y(0));
      ctx.scale(s, s);
      drawSlingTree(ctx, lw, time, false);
      ctx.restore();

      // pouch position
      const pull = aim ? aim.pull : 0;
      const pa = aim ? aim.angle : 0;
      const px = SLING.x - Math.cos(pa) * pull * 1.6;
      const py = SLING.y - Math.sin(pa) * pull * 1.6;
      const backTip = { x: SLING.x - 0.34, y: SLING.y + 0.6 };
      const frontTip = { x: SLING.x + 0.4, y: SLING.y + 0.55 };
      ctx.strokeStyle = '#5a3a1a';
      ctx.lineWidth = Math.max(2, s * 0.09);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(X(backTip.x), Y(backTip.y));
      ctx.lineTo(X(px), Y(py));
      ctx.stroke();

      // bodies
      const nutsInAir = game.world.bodies.filter((b) => b.kind === 'nut' && !b.landed);
      for (const b of game.world.bodies) {
        if (b.kind === 'ground') continue;
        let wob = shakes.get(b.id) || 0;
        if (wob > 0) {
          wob = Math.max(0, wob - dt * 2.5);
          shakes.set(b.id, wob);
        }
        const jig = wob * Math.sin(time * 45) * 0.05;
        ctx.save();
        ctx.translate(X(b.x + jig), Y(b.y));
        ctx.scale(s, s);
        ctx.rotate(-b.a);
        if (b.kind === 'crab') {
          let mood = 'grumpy';
          const fast = Math.hypot(b.vx, b.vy) > 0.6 || Math.abs(b.w) > 1.2 || wob > 0.3;
          const near = nutsInAir.some((n) => n.x < b.x + 0.5 && b.x - n.x < 6 && Math.abs(n.y - b.y) < 5);
          if (fast) mood = 'dizzy';
          else if (near) mood = 'scared';
          else if (time < laughUntil) mood = 'laugh';
          const bob = mood === 'laugh' ? Math.abs(Math.sin(time * 14)) * -0.06 : 0;
          ctx.translate(0, bob);
          drawCrab(ctx, { t: time + b.id, mood, lw });
        } else if (b.kind === 'nut') {
          drawCoconut(ctx, b.nut, NUTS[b.nut].r, 0, lw);
        } else if (b.shape === 'circle') {
          drawBall(ctx, b, lw);
        } else {
          drawBlock(ctx, b, lw, isFinite(b.hp) ? clamp(b.dmg / b.hp, 0, 1) : 0);
        }
        ctx.restore();
      }

      // the loaded coconut in the pouch, then the front band and prong over it
      if (game.loaded) {
        ctx.save();
        ctx.translate(X(px), Y(py));
        ctx.scale(s, s);
        drawCoconut(ctx, game.loaded, NUTS[game.loaded].r, -pa * 0.3, lw);
        ctx.restore();
      }
      ctx.strokeStyle = '#6e4a22';
      ctx.lineWidth = Math.max(2, s * 0.09);
      ctx.beginPath();
      ctx.moveTo(X(px), Y(py));
      ctx.lineTo(X(frontTip.x), Y(frontTip.y));
      ctx.stroke();
      ctx.save();
      ctx.translate(X(SLING.x), Y(0));
      ctx.scale(s, s);
      drawSlingTree(ctx, lw, time, true);
      ctx.restore();

      // particles
      parts = parts.filter((p) => (p.life -= dt) > 0);
      for (const p of parts) {
        if (p.kind !== 'text' && p.kind !== 'ring') {
          p.vy -= (p.kind === 'puff' ? -1 : 12) * dt;
          if (p.kind === 'puff') {
            p.vx *= 1 - dt * 3;
            p.vy *= 1 - dt * 3;
          }
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.spin * dt;
        if (p.y < 0.03 && p.kind !== 'puff' && p.kind !== 'text') {
          p.y = 0.03;
          p.vy = 0;
          p.vx *= 0.8;
        }
        const k = p.life / p.max;
        ctx.save();
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.translate(X(p.x), Y(p.y));
        if (p.kind === 'text') {
          const pop = 1 + Math.max(0, k - 0.8) * 2;
          outlined(ctx, p.text, 0, 0, p.r * s * pop, p.colour);
        } else if (p.kind === 'ring') {
          ctx.strokeStyle = p.colour;
          ctx.lineWidth = Math.max(2, s * 0.15 * k);
          ctx.beginPath();
          ctx.arc(0, 0, p.r * s * (1 - k * 0.7), 0, TAU);
          ctx.stroke();
        } else if (p.kind === 'puff') {
          ctx.fillStyle = p.colour;
          ctx.beginPath();
          ctx.arc(0, 0, p.r * s * (1.6 - k * 0.6), 0, TAU);
          ctx.fill();
        } else if (p.kind === 'hat') {
          ctx.scale(s, s);
          ctx.rotate(p.rot);
          ctx.fillStyle = C.hat;
          ctx.strokeStyle = C.ink;
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.ellipse(0, 0.05, 0.28, 0.06, 0, 0, TAU);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-0.17, 0.03);
          ctx.lineTo(-0.13, -0.17);
          ctx.lineTo(0.13, -0.17);
          ctx.lineTo(0.17, 0.03);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.rotate(p.rot);
          ctx.fillStyle = p.colour;
          const r = p.r * s;
          if (p.kind === 'grain') ctx.fillRect(-r / 2, -r / 2, r, r);
          else if (p.kind === 'shard') {
            ctx.beginPath();
            ctx.moveTo(0, -r);
            ctx.lineTo(r * 0.6, r * 0.6);
            ctx.lineTo(-r * 0.5, r * 0.4);
            ctx.closePath();
            ctx.fill();
          } else ctx.fillRect(-r, -r * 0.2, r * 2, r * 0.4);
        }
        ctx.restore();
      }
      ctx.restore();
    },

    // A coconut gone above the top of the screen shows as a little marker.
    drawOffscreen(ctx, game, view, top) {
      for (const b of game.world.bodies) {
        if (b.kind !== 'nut') continue;
        const sy = view.groundY - b.y * view.s;
        if (sy > top) continue;
        const sx = (b.x - view.camX) * view.s;
        ctx.fillStyle = 'rgba(22,11,51,0.45)';
        ctx.beginPath();
        ctx.moveTo(sx, top + 4);
        ctx.lineTo(sx - 12, top + 22);
        ctx.lineTo(sx + 12, top + 22);
        ctx.closePath();
        ctx.fill();
        ctx.save();
        ctx.translate(sx, top + 34);
        ctx.scale(22, 22);
        drawCoconut(ctx, b.nut, 0.4, 0, 0.06);
        ctx.restore();
      }
    },
  };
}

function drawBackPalm(ctx, x, y, sc, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sc, sc);
  ctx.strokeStyle = 'rgba(30,90,70,0.55)';
  ctx.lineWidth = 0.25;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(0.6, -2, 0.3, -4);
  ctx.stroke();
  ctx.fillStyle = 'rgba(30,110,70,0.55)';
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI + i * 0.75 + Math.sin(t + i) * 0.06;
    ctx.beginPath();
    ctx.ellipse(0.3 + Math.cos(a) * 0.9, -4 + Math.sin(a) * 0.5 + 0.2, 1, 0.25, a, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// The dotted path a shot would take (screen points), with a ring where it first hits.
export function drawArc(ctx, pts, time, hitAt) {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const k = 1 - (i / Math.max(1, n)) * 0.55;
    const r = Math.max(2.5, p.r * k);
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + 1.8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = i % 2 ? C.white : C.sun;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, TAU);
    ctx.fill();
  }
  if (hitAt) {
    const r = hitAt.r * (1 + Math.sin(time * 8) * 0.12);
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(hitAt.x, hitAt.y, r, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = C.pink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(hitAt.x, hitAt.y, r * 0.6, 0, TAU);
    ctx.stroke();
  }
}

// Little picture for a level tile: what's new on that level.
export function drawTeachIcon(ctx, kind, x, y, r, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  const sc = r / 0.55;
  ctx.scale(sc, sc);
  const lw = 0.06;
  if (kind === 'sand' || kind === 'wood' || kind === 'ice' || kind === 'bucket') {
    const b = { id: 3, mat: kind, hw: 0.45, hh: 0.45 };
    if (kind === 'wood') {
      b.hw = 0.6;
      b.hh = 0.18;
    }
    ctx.rotate(Math.sin(t * 2) * 0.08);
    drawBlock(ctx, b, lw, 0);
  } else if (kind === 'ball') {
    ctx.rotate(t * 2);
    drawBall(ctx, { r: 0.5 }, lw);
  } else if (kind === 'split') {
    for (let k = -1; k <= 1; k++) {
      ctx.save();
      ctx.translate(k * 0.42, Math.abs(k) * 0.15 - 0.05);
      drawCoconut(ctx, 'bit', 0.26, t * 2, lw);
      ctx.restore();
    }
  } else if (kind === 'heavy' || kind === 'pineapple') {
    drawCoconut(ctx, kind, 0.42, kind === 'heavy' ? t * 2 : Math.sin(t * 3) * 0.2, lw);
  } else if (kind === 'pier') {
    drawBlock(ctx, { id: 1, mat: 'rock', look: 'pier', hw: 0.7, hh: 0.15 }, lw, 0);
    ctx.translate(0, -0.42);
    ctx.scale(0.7, 0.7);
    drawCrab(ctx, { t, lw });
  } else {
    // crab-ish levels, including far, tall and the king
    if (kind === 'king') {
      ctx.fillStyle = C.sun;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(-0.25, -0.45);
      ctx.lineTo(-0.25, -0.7);
      ctx.lineTo(-0.12, -0.58);
      ctx.lineTo(0, -0.75);
      ctx.lineTo(0.12, -0.58);
      ctx.lineTo(0.25, -0.7);
      ctx.lineTo(0.25, -0.45);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.scale(1.1, 1.1);
    drawCrab(ctx, { t, lw, mood: kind === 'crab' ? 'grumpy' : kind === 'far' ? 'laugh' : 'grumpy' });
  }
  ctx.restore();
}

// The launcher tile: a coconut arcs from the palm slingshot and knocks a crab off its castle.
export function drawTile(ctx, x, y, w, h, time) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.translate(x, y);
  const gy = h * 0.74;
  drawSky(ctx, w, h, 'morning', h * 0.55, time);
  drawSea(ctx, w, h * 0.55, gy, 'morning', time);
  ctx.fillStyle = C.sand;
  ctx.fillRect(0, gy, w, h - gy);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = Math.max(1.5, w * 0.008);
  ctx.beginPath();
  ctx.moveTo(0, gy);
  ctx.lineTo(w, gy);
  ctx.stroke();
  const s = w / 9;
  const lw = 0.06;
  // slingshot
  ctx.save();
  ctx.translate(s * 1.2, gy);
  ctx.scale(s * 0.75, s * 0.75);
  drawSlingTree(ctx, lw, time, false);
  drawSlingTree(ctx, lw, time, true);
  ctx.restore();
  // castle
  const cx = s * 6.6;
  const P = 2.6; // loop length
  const k = (time % P) / P;
  const hitK = 0.45;
  const knocked = k > hitK;
  const kt = (k - hitK) * P;
  const castle = [[cx - s * 0.5, gy - s], [cx + s * 0.5, gy - s], [cx, gy - s * 2]];
  castle.forEach(([bx, by], i) => {
    ctx.save();
    const fall = knocked && i === 2 ? Math.min(1, kt * 2) : 0;
    ctx.translate(bx + fall * s * 0.4, by + s / 2 + fall * s * 0.15);
    ctx.rotate(fall * 0.3);
    ctx.scale(s, s);
    drawBlock(ctx, { id: i + 2, mat: 'sand', hw: 0.5, hh: 0.5 }, lw, 0);
    ctx.restore();
  });
  // the crab: sits on top, then tumbles off with a puff
  if (!knocked || kt < 0.6) {
    ctx.save();
    const fx = knocked ? kt * s * 3 : 0;
    const fy = knocked ? -kt * s * 3 + kt * kt * s * 12 : Math.abs(Math.sin(time * 6)) * -s * 0.05;
    ctx.translate(cx + fx, gy - s * 2.3 + fy);
    ctx.rotate(knocked ? kt * 8 : 0);
    ctx.scale(s * 1.3, s * 1.3);
    drawCrab(ctx, { t: time, lw: 0.05, mood: knocked ? 'dizzy' : k > 0.25 ? 'scared' : 'grumpy' });
    ctx.restore();
  } else {
    const pk = Math.min(1, (kt - 0.6) * 2.5);
    ctx.fillStyle = `rgba(255,255,255,${0.9 * (1 - pk)})`;
    const px = cx + s * 1.8;
    const py = gy - s * 1.5 + s * 0.5;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(px + Math.cos(i * 1.3) * s * 0.5 * (0.5 + pk), py + Math.sin(i * 1.3) * s * 0.4 * (0.5 + pk), s * 0.3, 0, TAU);
      ctx.fill();
    }
    outlined(ctx, '+500', px, py - s * 0.6 - pk * s * 0.5, s * 0.55, C.sun);
  }
  // the coconut flies until it hits
  if (k < hitK + 0.05) {
    const u = Math.min(1, k / hitK);
    const sx = s * 1.2;
    const sy = gy - SLING.y * s * 0.75;
    const ex = cx - s * 0.1;
    const ey = gy - s * 2.2;
    const bx = sx + (ex - sx) * u;
    const by = sy + (ey - sy) * u - Math.sin(u * Math.PI) * h * 0.32;
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(s, s);
    drawCoconut(ctx, 'coco', 0.38, time * 8, lw);
    ctx.restore();
  }
  ctx.restore();
}
