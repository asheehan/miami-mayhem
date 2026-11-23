// Big Catch drawing: the sea (sky, surface, light shafts, parallax scenery, sea bed), the boat,
// the line and hook, creatures, the haul, the depth meter, small UI pieces and the launcher tile.
// Reads the trip state and never changes game rules; the only state here is cosmetic (camera,
// bubbles, cached sky).
import { FIELD_W, MAX_DEPTH, ZONES, LINE, SPECIES_BY_ID, CAST_TIME, haulProgress } from './sim.js';
import { drawCreature, drawChest, GLOWS } from './creatures.js';

export const C = {
  ink: '#160b33',
  white: '#ffffff',
  sun: '#ffe14d',
  pink: '#ff3d9a',
  orange: '#ff8a4c',
  foam: '#c9fbff',
  sea: '#19c3d6',
  red: '#ff4b4b',
  green: '#3fe07a',
  sand: '#f6d892',
  wood: '#b07a4a',
  woodDark: '#6e4426',
  dollar: '#f3e7c4',
  dollarEdge: '#c9b37a',
};

export const font = (px, weight = 900) => `${weight} ${Math.round(px)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, k) => a + (b - a) * k;

export const BOAT_X = FIELD_W * 0.3; // where the boat floats (world x)
export const ROD_TIP = { x: BOAT_X + 11, y: -10 }; // the end of the rod (world)
export const HOOK_START_X = FIELD_W / 2;

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

// A sand dollar: the money. Screen px.
export function drawSandDollar(ctx, x, y, r, dim = false) {
  ctx.save();
  ctx.globalAlpha *= dim ? 0.45 : 1;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = C.dollar;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.16);
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.strokeStyle = C.dollarEdge;
  ctx.lineWidth = Math.max(1, r * 0.1);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * TAU) / 5;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * r * 0.38, y + Math.sin(a) * r * 0.38, r * 0.3, r * 0.1, a, 0, TAU);
    ctx.stroke();
  }
  ctx.fillStyle = C.dollarEdge;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.1, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawStar(ctx, x, y, r, filled = true) {
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
  const gw = hasIcon ? b.h * 0.6 : 0;
  const cx = b.x + b.w / 2 + gw / 2;
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.label, cx, b.y + b.h / 2 + 1);
  if (hasIcon) glyph(ctx, b.glyph, cx - tw / 2 - gw * 0.6, b.y + b.h / 2, b.h * 0.22, C.ink);
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
  } else if (kind === 'next') {
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.6, cy - s * 0.9);
    ctx.lineTo(cx + s * 0.85, cy);
    ctx.lineTo(cx - s * 0.6, cy + s * 0.9);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'hook') {
    drawHookShape(ctx, cx, cy - s * 0.2, s * 1.1, colour);
  } else if (kind === 'book') {
    ctx.lineWidth = s * 0.25;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.6);
    ctx.quadraticCurveTo(cx - s * 0.6, cy - s * 0.95, cx - s * 1.1, cy - s * 0.6);
    ctx.lineTo(cx - s * 1.1, cy + s * 0.8);
    ctx.quadraticCurveTo(cx - s * 0.6, cy + s * 0.5, cx, cy + s * 0.8);
    ctx.quadraticCurveTo(cx + s * 0.6, cy + s * 0.5, cx + s * 1.1, cy + s * 0.8);
    ctx.lineTo(cx + s * 1.1, cy - s * 0.6);
    ctx.quadraticCurveTo(cx + s * 0.6, cy - s * 0.95, cx, cy - s * 0.6);
    ctx.lineTo(cx, cy + s * 0.8);
    ctx.stroke();
  }
  ctx.restore();
}

// Square icon buttons along the top: 'home', 'back'.
export function drawIconButton(ctx, b) {
  ctx.fillStyle = 'rgba(22,11,51,0.32)';
  roundRect(ctx, b.x, b.y, b.w, b.h, b.w * 0.24);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.stroke();
  glyph(ctx, b.icon, b.x + b.w / 2, b.y + b.h / 2, b.w * 0.3, C.white);
}

// A pointing finger with its tip at (x, y). sc ~ 1 for a 50 px hand.
export function drawFinger(ctx, x, y, sc, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(sc, sc);
  ctx.rotate(-0.2);
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

function drawHookShape(ctx, x, y, s, colour = '#d7dde6') {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = colour === C.white || colour === C.ink ? colour : C.ink;
  ctx.lineWidth = s * 0.55;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x, y + s * 0.6);
    ctx.arc(x - s * 0.55, y + s * 0.6, s * 0.55, 0, Math.PI, false);
    ctx.lineTo(x - s * 1.1, y + s * 0.25);
  };
  if (colour !== C.white && colour !== C.ink) {
    path();
    ctx.stroke();
    ctx.strokeStyle = colour;
    ctx.lineWidth = s * 0.28;
  }
  path();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y - s * 1.1, s * 0.25, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Upgrade pictures (screen px, r ~ half the picture size)
// ---------------------------------------------------------------------------------------------

export function drawUpgradeIcon(ctx, kind, x, y, r, t = 0) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (kind === 'line') {
    // a reel with line running down to a hook, an arrow pointing down
    ctx.fillStyle = '#ff8a4c';
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.48, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd9a8';
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.22, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = C.white;
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.35 + r * 0.48, y - r * 0.35);
    ctx.lineTo(x + r * 0.15, y + r * 0.55);
    ctx.stroke();
    drawHookShape(ctx, x + r * 0.15, y + r * 0.68, r * 0.16, '#d7dde6');
    const bob = Math.sin(t * 3) * r * 0.06;
    ctx.fillStyle = C.sun;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    ctx.moveTo(x + r * 0.55, y - r * 0.7 + bob);
    ctx.lineTo(x + r * 0.75, y - r * 0.7 + bob);
    ctx.lineTo(x + r * 0.75, y + r * 0.05 + bob);
    ctx.lineTo(x + r * 0.92, y + r * 0.05 + bob);
    ctx.lineTo(x + r * 0.65, y + r * 0.42 + bob);
    ctx.lineTo(x + r * 0.38, y + r * 0.05 + bob);
    ctx.lineTo(x + r * 0.55, y + r * 0.05 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (kind === 'bucket') {
    // a pail with fish poking out
    drawCreature(ctx, 'snapper', x - r * 0.25, y - r * 0.38, r * 0.11, 1, t, { rotate: -1.1 });
    drawCreature(ctx, 'sergeant', x + r * 0.28, y - r * 0.32, r * 0.1, -1, t, { rotate: -1.2, phase: 0.4 });
    ctx.fillStyle = '#3a7bff';
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.75, y - r * 0.2);
    ctx.lineTo(x + r * 0.75, y - r * 0.2);
    ctx.lineTo(x + r * 0.55, y + r * 0.85);
    ctx.lineTo(x - r * 0.55, y + r * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x - r * 0.55, y + r * 0.05, r * 0.15, r * 0.6);
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.2, r * 0.75, r * 0.15, 0, 0, TAU);
    ctx.fillStyle = '#6aa0ff';
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y - r * 0.2, r * 0.75, Math.PI * 1.1, Math.PI * 1.9);
    ctx.lineWidth = r * 0.06;
    ctx.stroke();
  } else if (kind === 'lure') {
    // a glowing lure, sparkling
    const pulse = 0.75 + Math.sin(t * 4) * 0.25;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 0.95);
    g.addColorStop(0, `rgba(255,240,120,${0.9 * pulse})`);
    g.addColorStop(1, 'rgba(255,240,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.95, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.5);
    ctx.fillStyle = '#ff3d9a';
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = r * 0.07;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.55, r * 0.25, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.sun;
    ctx.beginPath();
    ctx.ellipse(-r * 0.15, 0, r * 0.25, r * 0.25, 0, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.05, r * 0.09, 0, TAU);
    ctx.fill();
    ctx.restore();
    for (let i = 0; i < 3; i++) {
      const a = t * 1.5 + (i * TAU) / 3;
      sparkle(ctx, x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.6, r * 0.13);
    }
  }
  ctx.restore();
}

function sparkle(ctx, x, y, s) {
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x + s * 0.3, y - s * 0.3);
  ctx.lineTo(x + s, y);
  ctx.lineTo(x + s * 0.3, y + s * 0.3);
  ctx.lineTo(x, y + s);
  ctx.lineTo(x - s * 0.3, y + s * 0.3);
  ctx.lineTo(x - s, y);
  ctx.lineTo(x - s * 0.3, y - s * 0.3);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------------------------------------
// Colours by depth
// ---------------------------------------------------------------------------------------------

const WATER_STOPS = [
  [0, [70, 222, 232]],
  [50, [26, 166, 205]],
  [130, [22, 104, 160]],
  [250, [22, 52, 104]],
  [330, [14, 22, 60]],
  [MAX_DEPTH + 20, [6, 8, 28]],
];

export function waterRGB(d) {
  if (d <= WATER_STOPS[0][0]) return WATER_STOPS[0][1];
  for (let i = 1; i < WATER_STOPS.length; i++) {
    const [d1, c1] = WATER_STOPS[i];
    const [d0, c0] = WATER_STOPS[i - 1];
    if (d <= d1) {
      const k = (d - d0) / (d1 - d0);
      return [lerp(c0[0], c1[0], k), lerp(c0[1], c1[1], k), lerp(c0[2], c1[2], k)];
    }
  }
  return WATER_STOPS[WATER_STOPS.length - 1][1];
}
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

// ---------------------------------------------------------------------------------------------
// Scenery: generated once, fixed for every trip.
// ---------------------------------------------------------------------------------------------

const PAR = 0.82; // parallax: side scenery scrolls a little slower than the water

function makeScenery() {
  let r = 12345;
  const rnd = () => {
    r = (r * 16807) % 2147483647;
    return r / 2147483647;
  };
  const items = [];
  // depth d is where the item lines up with the hook; it is drawn at parallax position d * PAR + offset
  for (let d = 8; d < MAX_DEPTH + 40; d += 7 + rnd() * 7) {
    const side = rnd() < 0.5 ? -1 : 1;
    const zone = ZONES.find((z) => d < z.bottom)?.id || 'deep';
    let type;
    const k = rnd();
    if (zone === 'shallows') type = k < 0.5 ? 'grass' : 'rock';
    else if (zone === 'reef') type = k < 0.35 ? 'coral' : k < 0.65 ? 'fan' : k < 0.85 ? 'brain' : 'rock';
    else if (zone === 'twilight') type = k < 0.6 ? 'kelp' : 'rock';
    else type = k < 0.4 ? 'tube' : 'darkrock';
    items.push({ type, side, d, size: 0.7 + rnd() * 0.6, look: rnd(), hue: Math.floor(rnd() * 4) });
  }
  // a shipwreck in the twilight zone
  items.push({ type: 'wreck', side: 1, d: 195, size: 1, look: 0.3, hue: 0 });
  items.sort((a, b) => a.d - b.d);
  return items;
}
const SCENERY = makeScenery();
const CORAL_COLOURS = ['#ff6f91', '#ffb347', '#c77dff', '#ff8a4c'];

function drawScenery(ctx, it, sx, sy, s, t) {
  // sx is the side anchor in screen px (just inside the edge), s px per unit
  const z = it.size * s;
  const dir = it.side;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(22,11,51,0.5)';
  ctx.lineWidth = Math.max(1.5, 0.3 * s);
  const sway = Math.sin(t * 1.2 + it.look * 9);
  if (it.type === 'rock' || it.type === 'darkrock') {
    const dark = it.type === 'darkrock';
    for (let i = 0; i < 3; i++) {
      const bx = dir * (i * 2.2 - 0.5) * z;
      const by = (i % 2 ? 2.2 : 0) * z;
      const rx = (4.2 - i * 0.9) * z;
      const ry = (3.4 - i * 0.6) * z;
      ctx.fillStyle = dark ? ['#1e2540', '#252d4d', '#1a2038'][i] : ['#6f8a9a', '#7f9aa8', '#647d8c'][i];
      ctx.beginPath();
      ctx.ellipse(bx, by, rx, ry, dir * 0.2, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.ellipse(bx - dir * rx * 0.25, by - ry * 0.4, rx * 0.4, ry * 0.25, 0, 0, TAU);
      ctx.fill();
    }
    if (it.type === 'darkrock') {
      ctx.fillStyle = `rgba(140,255,240,${0.5 + 0.4 * Math.sin(t * 2 + it.look * 10)})`;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(dir * (1 + i * 1.4) * z, (-2 + i * 1.6) * z, 0.35 * s, 0, TAU);
        ctx.fill();
      }
    }
  } else if (it.type === 'grass') {
    ctx.strokeStyle = '#3fae6a';
    ctx.lineWidth = Math.max(2, 0.7 * s);
    for (let i = 0; i < 4; i++) {
      const bx = dir * (0.2 + i * 1.3) * z;
      ctx.beginPath();
      ctx.moveTo(bx, 6 * z);
      ctx.quadraticCurveTo(bx + sway * 1.5 * z, 0, bx + sway * 2 * z + dir * i * 0.3 * z, (-4 - (i % 2) * 2) * z);
      ctx.stroke();
    }
  } else if (it.type === 'coral') {
    ctx.strokeStyle = CORAL_COLOURS[it.hue];
    ctx.lineWidth = Math.max(3, 1.1 * s);
    const branch = (x, y, a, len, n) => {
      const x2 = x + Math.cos(a) * len;
      const y2 = y + Math.sin(a) * len;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      if (n > 0) {
        branch(x2, y2, a - 0.5, len * 0.7, n - 1);
        branch(x2, y2, a + 0.45, len * 0.7, n - 1);
      }
    };
    branch(dir * 1.5 * z, 6 * z, -Math.PI / 2 + dir * 0.25, 4 * z, 2);
  } else if (it.type === 'fan') {
    ctx.fillStyle = CORAL_COLOURS[(it.hue + 2) % 4];
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(dir * 2 * z, 6 * z);
    ctx.arc(dir * 2 * z, 6 * z, 7 * z, -Math.PI / 2 - 0.9 + sway * 0.05, -Math.PI / 2 + 0.9 + sway * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();
  } else if (it.type === 'brain') {
    ctx.fillStyle = '#f2a65a';
    ctx.beginPath();
    ctx.ellipse(dir * 2.5 * z, 3 * z, 4 * z, 3 * z, 0, Math.PI, 0);
    ctx.lineTo(dir * 6.5 * z, 6 * z);
    ctx.lineTo(dir * -1.5 * z, 6 * z);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(160,80,30,0.6)';
    ctx.beginPath();
    for (let i = 0; i < 3; i++) ctx.arc(dir * 2.5 * z, 3 * z, (1 + i) * z, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  } else if (it.type === 'kelp') {
    ctx.strokeStyle = '#5c8a2e';
    ctx.lineWidth = Math.max(3, 1.0 * s);
    for (let i = 0; i < 2; i++) {
      const bx = dir * (1 + i * 3) * z;
      ctx.beginPath();
      ctx.moveTo(bx, 8 * z);
      for (let k = 1; k <= 6; k++) ctx.lineTo(bx + Math.sin(t * 1.3 + k * 0.8 + it.look * 7 + i) * 1.2 * z, (8 - k * 3.2) * z);
      ctx.stroke();
      ctx.fillStyle = '#7aa83a';
      for (let k = 1; k < 6; k++) {
        const lx = bx + Math.sin(t * 1.3 + k * 0.8 + it.look * 7 + i) * 1.2 * z;
        ctx.beginPath();
        ctx.ellipse(lx + dir * 0.9 * z, (8 - k * 3.2) * z, 1.1 * z, 0.45 * z, dir * 0.5, 0, TAU);
        ctx.fill();
      }
    }
  } else if (it.type === 'tube') {
    for (let i = 0; i < 3; i++) {
      const bx = dir * (0.5 + i * 1.6) * z;
      const hh = (4 + (i % 2) * 2) * z;
      ctx.fillStyle = '#c9c3d9';
      ctx.fillRect(bx - 0.5 * z, 6 * z - hh, 1 * z, hh);
      ctx.fillStyle = '#ff4b6e';
      ctx.beginPath();
      ctx.ellipse(bx, 6 * z - hh, 1.1 * z, 0.6 * z, 0, 0, TAU);
      ctx.fill();
    }
  } else if (it.type === 'wreck') {
    ctx.fillStyle = '#3a3550';
    ctx.strokeStyle = 'rgba(10,6,30,0.6)';
    ctx.rotate(-0.12);
    ctx.beginPath();
    ctx.moveTo(dir * 2 * s, -4 * s);
    ctx.lineTo(dir * -14 * s, -5 * s);
    ctx.quadraticCurveTo(dir * -13 * s, 4 * s, dir * -4 * s, 6 * s);
    ctx.lineTo(dir * 4 * s, 6 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#4b4566';
    ctx.fillRect(Math.min(dir * -7 * s, dir * -6 * s), -18 * s, 1 * s, 13 * s);
    ctx.fillStyle = 'rgba(10,6,30,0.7)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(dir * (-2 - i * 3.5) * s, -1 * s, 0.9 * s, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// The boat and the kid
// ---------------------------------------------------------------------------------------------

// (x, y) is the waterline in screen px; s px per unit; pull leans the rod.
export function drawBoat(ctx, x, y, s, t, pull = 0, cheer = 0) {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 1.8) * 0.35 * s);
  ctx.rotate(Math.sin(t * 1.4) * 0.03);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, 0.35 * s);
  ctx.strokeStyle = C.ink;
  // the kid: body, head, cap
  const kx = 1.5 * s;
  const hop = cheer > 0 ? Math.abs(Math.sin(t * 8)) * 1.2 * s * cheer : 0;
  ctx.fillStyle = '#ff3d9a';
  roundRect(ctx, kx - 2 * s, -9 * s - hop, 4 * s, 6.5 * s, 1.5 * s);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffcf9e';
  ctx.beginPath();
  ctx.arc(kx, -11.5 * s - hop, 2.6 * s, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // cap
  ctx.fillStyle = '#3a7bff';
  ctx.beginPath();
  ctx.arc(kx, -12.2 * s - hop, 2.6 * s, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(kx + 1.5 * s, -12.2 * s - hop);
  ctx.lineTo(kx + 4.2 * s, -12 * s - hop);
  ctx.stroke();
  // face
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(kx + 1.2 * s, -11.4 * s - hop, 0.35 * s, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(kx + 0.9 * s, -10.6 * s - hop, 0.9 * s, 0.2, Math.PI * 0.8);
  ctx.stroke();
  // rod
  const tipX = (ROD_TIP.x - BOAT_X) * s;
  const tipY = ROD_TIP.y * s + pull * 2 * s;
  ctx.strokeStyle = '#4a2a14';
  ctx.lineWidth = Math.max(2, 0.45 * s);
  ctx.beginPath();
  ctx.moveTo(kx + 0.5 * s, -5 * s - hop);
  ctx.quadraticCurveTo(tipX * 0.6, -9 * s + pull * s, tipX, tipY);
  ctx.stroke();
  ctx.fillStyle = '#ff8a4c';
  ctx.beginPath();
  ctx.arc(kx + 2 * s, -5.5 * s - hop, 0.9 * s, 0, TAU);
  ctx.fill();
  // arm
  ctx.strokeStyle = '#ffcf9e';
  ctx.lineWidth = Math.max(2, 0.9 * s);
  ctx.beginPath();
  ctx.moveTo(kx, -7.5 * s - hop);
  ctx.lineTo(kx + 2.2 * s, -6 * s - hop);
  ctx.stroke();
  // hull
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = Math.max(2, 0.35 * s);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(-8 * s, -3.5 * s);
  ctx.lineTo(8.5 * s, -3.5 * s);
  ctx.quadraticCurveTo(7.5 * s, 1.8 * s, 4 * s, 2 * s);
  ctx.lineTo(-6 * s, 2 * s);
  ctx.quadraticCurveTo(-8 * s, 0, -8 * s, -3.5 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ff4b4b';
  ctx.fillRect(-7.6 * s, -2.2 * s, 15.6 * s, 1.1 * s);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// The renderer
// ---------------------------------------------------------------------------------------------

export function createRenderer() {
  const view = { w: 1, h: 1, s: 1, viewH: 1, camY: 0, ready: false };
  let bubbles = [];

  function resize(w, h) {
    view.w = w;
    view.h = h;
    view.s = w / FIELD_W;
    view.viewH = h / view.s;
  }

  const sx = (x) => x * view.s;
  const sy = (y) => (y - view.camY) * view.s;
  const toScreen = (x, y) => ({ x: sx(x), y: sy(y) });
  const toWorldX = (px) => px / view.s;

  function cameraTarget(s) {
    const { viewH } = view;
    if (!s || s.phase === 'haul' || s.phase === 'done') return -viewH * 0.4;
    const frac = s.phase === 'reel' || s.phase === 'turn' ? 0.6 : 0.32;
    // stay on the boat until the hook is under it
    return Math.max(-viewH * 0.32, Math.min(s.hook.y - viewH * frac, MAX_DEPTH + 12 - viewH));
  }

  function reset(s) {
    view.camY = cameraTarget(s);
    view.ready = true;
    bubbles = [];
  }

  function updateCamera(s, dt) {
    const target = cameraTarget(s);
    if (!view.ready) reset(s);
    const k = s.phase === 'drop' || s.phase === 'reel' ? 6 : 2.5;
    view.camY += (target - view.camY) * Math.min(1, dt * k);
  }

  // ----- background: sky, sun, skyline, water, light shafts -----
  function drawBackground(ctx, t) {
    const { w, h, s } = view;
    const surf = sy(0);
    // water
    const top = Math.max(0, surf);
    if (top < h) {
      const d0 = Math.max(0, view.camY);
      const d1 = view.camY + view.viewH;
      const g = ctx.createLinearGradient(0, top, 0, h);
      for (let i = 0; i <= 6; i++) {
        const k = i / 6;
        g.addColorStop(k, rgb(waterRGB(lerp(d0, d1, k))));
      }
      ctx.fillStyle = g;
      ctx.fillRect(0, top, w, h - top);
    }
    // sky
    if (surf > 0) {
      const skyTop = sy(-view.viewH * 0.6);
      const g = ctx.createLinearGradient(0, Math.min(skyTop, 0), 0, surf);
      g.addColorStop(0, '#3b1a6b');
      g.addColorStop(0.45, '#c2368f');
      g.addColorStop(0.8, '#ff8a4c');
      g.addColorStop(1, '#ffd36b');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, surf);
      // sun sinking into the sea
      const sunR = 7 * s;
      const sunX = w * 0.76;
      const sunY = surf - sunR * 0.35;
      const sg = ctx.createRadialGradient(sunX, sunY, sunR * 0.5, sunX, sunY, sunR * 2.4);
      sg.addColorStop(0, 'rgba(255,225,77,0.6)');
      sg.addColorStop(1, 'rgba(255,225,77,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(sunX - sunR * 2.4, sunY - sunR * 2.4, sunR * 4.8, Math.min(sunR * 4.8, surf - (sunY - sunR * 2.4)));
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, surf);
      ctx.clip();
      ctx.fillStyle = C.sun;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR, 0, TAU);
      ctx.fill();
      // skyline far away
      ctx.fillStyle = 'rgba(43,16,85,0.75)';
      const base = surf;
      const towers = [[0.02, 5], [0.07, 9], [0.12, 6.5], [0.16, 12], [0.21, 8], [0.26, 10.5], [0.31, 6], [0.36, 7.5], [0.44, 4.5], [0.52, 3.5], [0.9, 3], [0.95, 5]];
      for (const [k, th] of towers) ctx.fillRect(k * w, base - th * s, 0.045 * w, th * s);
      // a palm on the far shore
      ctx.strokeStyle = 'rgba(43,16,85,0.75)';
      ctx.lineWidth = Math.max(2, 0.5 * s);
      ctx.lineCap = 'round';
      const px = w * 0.62;
      const cx = px + 1.5 * s;
      const cy = base - 8 * s;
      ctx.beginPath();
      ctx.moveTo(px, base);
      ctx.quadraticCurveTo(px + 0.4 * s, base - 4 * s, cx, cy);
      ctx.stroke();
      ctx.fillStyle = 'rgba(43,16,85,0.75)';
      for (let i = 0; i < 6; i++) {
        const dx = (i < 3 ? -1 : 1) * (1.6 + (i % 3) * 0.9) * s;
        const sway = Math.sin(t * 1.5 + i) * 0.15 * s;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(cx + dx * 0.5, cy - 1.6 * s + Math.abs(dx) * 0.15, cx + dx, cy + 0.4 * s + Math.abs(dx) * 0.35 + sway);
        ctx.quadraticCurveTo(cx + dx * 0.5, cy - 0.6 * s, cx, cy);
        ctx.fill();
      }
      ctx.restore();
    }
    // light shafts near the surface
    const depthMid = view.camY + view.viewH * 0.5;
    const shaftA = clamp(1 - depthMid / 140, 0, 1);
    if (shaftA > 0.02 && top < h) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, top, w, h - top);
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const x0 = w * (0.1 + i * 0.27) + Math.sin(t * 0.4 + i * 2) * w * 0.04;
        const len = 120 * s;
        const g = ctx.createLinearGradient(0, surf, 0, surf + len);
        g.addColorStop(0, `rgba(255,255,220,${0.13 * shaftA})`);
        g.addColorStop(1, 'rgba(255,255,220,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x0, surf);
        ctx.lineTo(x0 + w * 0.07, surf);
        ctx.lineTo(x0 + w * 0.07 - w * 0.25, surf + len);
        ctx.lineTo(x0 - w * 0.25 - w * 0.05, surf + len);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    // marine snow in the deep
    const deepA = clamp((depthMid - 200) / 120, 0, 1);
    if (deepA > 0) {
      ctx.fillStyle = `rgba(200,230,255,${0.35 * deepA})`;
      for (let i = 0; i < 40; i++) {
        const x = ((i * 0.618 + t * 0.01 * ((i % 3) + 1)) % 1) * w;
        const yy = ((((i * 0.371 - view.camY * 0.004 + t * 0.02) % 1) + 1) % 1) * h;
        ctx.fillRect(x, yy, 2, 2);
      }
    }
  }

  function drawSceneryLayer(ctx, t) {
    const { w, h, s } = view;
    const top = Math.max(0, sy(0) + 2 * s);
    if (top >= h) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top, w, h - top);
    ctx.clip();
    for (const it of SCENERY) {
      const y = (it.d - view.camY * PAR - (1 - PAR) * view.viewH * 0.45) * s;
      if (y < -30 * s || y > h + 30 * s) continue;
      if (it.d * PAR < 2) continue;
      const x = it.side < 0 ? 0 : w;
      drawScenery(ctx, it, x, y, s, t);
    }
    ctx.restore();
  }

  function drawSeabed(ctx, t, s, chestOnBed) {
    const { w, h } = view;
    const y = sy(MAX_DEPTH);
    if (y > h + 20) return;
    ctx.fillStyle = '#3a3150';
    ctx.beginPath();
    ctx.moveTo(0, y + 2 * view.s);
    for (let i = 0; i <= 10; i++) ctx.lineTo((i / 10) * w, y + Math.sin(i * 1.7) * 1.2 * view.s);
    ctx.lineTo(w, h + 10);
    ctx.lineTo(0, h + 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4c4268';
    ctx.fillRect(0, y + 3 * view.s, w, h);
    if (chestOnBed) drawChest(ctx, sx(FIELD_W / 2), y - 1.2 * view.s, view.s, 0.15 + Math.sin(t * 2) * 0.1, t);
  }

  function drawSurface(ctx, t, front) {
    const { w, s } = view;
    const y = sy(0);
    if (y < -10 || y > view.h + 10) return;
    ctx.beginPath();
    ctx.moveTo(0, y + (front ? 1.2 * s : -10));
    for (let i = 0; i <= 24; i++) {
      const x = (i / 24) * w;
      const k = i / 24;
      ctx.lineTo(x, y + Math.sin(k * 14 + t * 2.2) * 0.7 * s + Math.sin(k * 5 - t * 1.3) * 0.5 * s);
    }
    if (front) {
      ctx.lineTo(w, y + 1.2 * s);
      ctx.closePath();
      ctx.fillStyle = 'rgba(201,251,255,0.55)';
      ctx.fill();
    } else {
      ctx.lineTo(w, y + 3 * s);
      ctx.lineTo(0, y + 3 * s);
      ctx.closePath();
      ctx.fillStyle = 'rgba(120,235,240,0.9)';
      ctx.fill();
      ctx.strokeStyle = C.foam;
      ctx.lineWidth = Math.max(2, 0.4 * s);
      ctx.stroke();
    }
  }

  // ----- creatures, line and hook -----

  function moodOf(trip, c) {
    if (trip.phase === 'turn' && trip.dropEnd?.by === c.sp && trip.t - trip.bumpTime < 1.2 && trip.t < c.fleeUntil) return 'surprised';
    if (c.kind === 'zap' && trip.t - trip.zapTime < 0.8) return 'happy';
    return 'normal';
  }

  function drawCreatures(ctx, trip, t) {
    const { s, h } = view;
    for (const c of trip.creatures) {
      if (c.state !== 'swim') continue;
      const y = sy(c.y);
      if (y < -12 * s || y > h + 12 * s) continue;
      const deep = c.y > 230;
      const puffed = c.sp === 'puffer' && trip.t - trip.zapTime < 1 && Math.abs(c.y - trip.hook.y) < 12;
      drawCreature(ctx, c.sp, sx(c.x), y, s, c.dir, t, {
        phase: c.look, mood: moodOf(trip, c), glow: deep && GLOWS.has(c.sp), puffed,
      });
    }
  }

  // Where the hook is drawn (follows the sim, except while the cast flies through the air).
  function hookPos(trip) {
    if (trip.phase === 'cast') {
      const k = clamp(trip.phaseT / CAST_TIME, 0, 1);
      return {
        x: lerp(ROD_TIP.x, trip.hook.x, k),
        y: lerp(ROD_TIP.y, 0, k) - Math.sin(k * Math.PI) * 10,
      };
    }
    if (trip.phase === 'haul' || trip.phase === 'done') return { x: haulHookX(trip), y: -1 };
    return { x: trip.hook.x, y: trip.hook.y };
  }

  function drawLine(ctx, trip, hp) {
    const tip = { x: sx(ROD_TIP.x), y: sy(ROD_TIP.y) };
    const hx = sx(hp.x);
    const hy = sy(hp.y);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(1.5, 0.2 * view.s);
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    const sag = trip.phase === 'reel' ? 0.15 : 0.3;
    ctx.quadraticCurveTo(lerp(tip.x, hx, 0.5), lerp(tip.y, hy, 0.5) + Math.abs(hx - tip.x) * sag, hx, hy - 1.3 * view.s);
    ctx.stroke();
  }

  function drawHook(ctx, trip, hp, t) {
    const { s } = view;
    const x = sx(hp.x);
    const y = sy(hp.y);
    // the lure's glow on the way up
    if (trip.lureReach > 0 && (trip.phase === 'reel' || trip.phase === 'turn')) {
      const r = (trip.lureReach + 2.5) * s;
      const pulse = 0.8 + Math.sin(t * 5) * 0.2;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,240,120,${0.45 * pulse})`);
      g.addColorStop(0.7, `rgba(255,240,120,${0.18 * pulse})`);
      g.addColorStop(1, 'rgba(255,240,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
    drawHookShape(ctx, x + 0.55 * s, y, 1.5 * s, '#e6ebf2');
    // a little worm on the hook
    ctx.strokeStyle = '#ff8fb3';
    ctx.lineWidth = Math.max(2, 0.55 * s);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 0.6 * s, y + 0.9 * s);
    ctx.quadraticCurveTo(x - 0.9 * s + Math.sin(t * 7) * 0.4 * s, y + 2 * s, x - 0.2 * s, y + 2.5 * s);
    ctx.stroke();
  }

  // Everything on the line hangs under the hook, wiggling.
  function drawCatch(ctx, trip, hp, t) {
    const { s } = view;
    const items = trip.line;
    const zapped = trip.t - trip.zapTime < 1;
    for (let i = items.length - 1; i >= 0; i--) {
      const c = items[i];
      const sp = SPECIES_BY_ID[c.sp];
      const col = (i % 3) - 1;
      const row = Math.floor(i / 3);
      const sc = 0.72;
      const x = sx(hp.x) + col * 2.6 * s;
      const y = sy(hp.y) + (1.5 + row * 2.4 + sp.rx * sc) * s;
      const wig = Math.sin(t * 9 + i * 1.7) * 0.3;
      drawCreature(ctx, c.sp, x, y, s * sc, 1, t, {
        rotate: -Math.PI / 2 + wig, phase: c.look, mood: zapped ? 'dizzy' : 'happy',
      });
    }
    if (trip.chest) drawChest(ctx, sx(hp.x), sy(hp.y) + 3.5 * s, s * 0.8, 0, t);
  }

  function drawBubbles(ctx, trip, dt) {
    const { s, h } = view;
    // trail from the hook while it moves
    if (trip && (trip.phase === 'drop' || trip.phase === 'reel') && Math.random() < dt * 9) {
      bubbles.push({ x: trip.hook.x + (Math.random() - 0.5) * 2, y: trip.hook.y + 1, r: 0.3 + Math.random() * 0.5, v: 4 + Math.random() * 4 });
    }
    if (Math.random() < dt * 3) bubbles.push({ x: Math.random() * FIELD_W, y: view.camY + view.viewH + 2, r: 0.3 + Math.random() * 0.7, v: 5 + Math.random() * 6 });
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = Math.max(1, 0.15 * s);
    const keep = [];
    for (const b of bubbles) {
      b.y -= b.v * dt;
      b.x += Math.sin(b.y * 0.7) * dt * 1.5;
      if (b.y < 0.5 || b.y < view.camY - 5) continue;
      keep.push(b);
      const y = sy(b.y);
      if (y > h + 5) continue;
      ctx.beginPath();
      ctx.arc(sx(b.x), y, b.r * s, 0, TAU);
      ctx.stroke();
    }
    bubbles = keep.slice(-90);
  }

  // A burst of text near a point (screen px).
  function pop(ctx, text, x, y, age, colour) {
    if (age < 0 || age > 1.1) return;
    const k = age / 1.1;
    const px = view.s * 3.4 * (1 + Math.max(0, 0.15 - age) * 3);
    ctx.save();
    ctx.globalAlpha = 1 - k * k;
    outlined(ctx, text, x, y - k * view.s * 6, px, colour);
    ctx.restore();
  }

  function drawEffects(ctx, trip, hp) {
    const { s } = view;
    const x = sx(hp.x);
    const y = sy(hp.y);
    for (const e of trip.events) {
      const age = trip.t - e.t;
      if (age > 1.2) continue;
      const side = x < view.w * 0.5 ? 1 : -1;
      if (e.type === 'catch') pop(ctx, `+${SPECIES_BY_ID[e.sp].value}`, x + side * 6 * s, y - 2 * s, age, C.sun);
      else if (e.type === 'junk') pop(ctx, 'Yuck!', x + side * 7 * s, y - 3 * s, age, '#c8c8c8');
      else if (e.type === 'bonk') pop(ctx, 'Bonk!', x + side * 7 * s, y - 3 * s, age, C.white);
      else if (e.type === 'bump') pop(ctx, 'Bonk!', x + side * 7 * s, y + 3 * s, age, C.white);
      else if (e.type === 'zap') {
        pop(ctx, 'ZAP!', x + side * 7 * s, y - 3 * s, age, '#9ff7ff');
        if (age < 0.6) {
          ctx.strokeStyle = age * 10 % 2 < 1 ? '#fff36b' : '#9ff7ff';
          ctx.lineWidth = Math.max(2, 0.4 * s);
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * TAU + age * 3;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(a) * 2 * s, y + Math.sin(a) * 2 * s);
            ctx.lineTo(x + Math.cos(a + 0.3) * 4 * s, y + Math.sin(a + 0.3) * 4 * s);
            ctx.lineTo(x + Math.cos(a - 0.1) * 5.5 * s, y + Math.sin(a - 0.1) * 5.5 * s);
            ctx.stroke();
          }
        }
      } else if (e.type === 'full') pop(ctx, 'FULL!', x, y - 6 * s, age * 0.7, C.green);
    }
    // stars circling after bumping into something
    if (trip.phase === 'turn' && trip.dropEnd?.reason === 'bump') {
      for (let i = 0; i < 3; i++) {
        const a = trip.phaseT * 6 + (i * TAU) / 3;
        drawStar(ctx, x + Math.cos(a) * 3 * s, y - 2 * s + Math.sin(a) * 1.2 * s, 0.9 * s);
      }
    }
  }

  // ----- the haul: catch flying into the boat -----

  // At the surface the hook swings in close to the boat, so the catch is easy to see.
  function haulHookX(trip) {
    const k = trip.phase === 'done' ? 1 : clamp(trip.phaseT / 0.5, 0, 1);
    return lerp(trip.hook.x, ROD_TIP.x + 4, k * k * (3 - 2 * k));
  }

  function drawHaul(ctx, trip, t) {
    const { s } = view;
    const plan = trip.haul;
    if (!plan) return;
    const T = trip.phase === 'done' ? Infinity : trip.phaseT;
    const from = { x: haulHookX(trip), y: -1 };
    const to = { x: BOAT_X - 1, y: -4 };
    let landedFish = 0;
    plan.items.forEach((it, i) => {
      const k = (T - it.start) / (it.land - it.start);
      if (k < 0) {
        // still hanging on the hook, wiggling
        if (it.kind === 'bonus') return;
        if (it.kind === 'chest') {
          drawChest(ctx, sx(from.x), sy(from.y) + 4 * s, s * 0.8, 0, t);
          return;
        }
        const col = (i % 3) - 1;
        const row = Math.floor(i / 3);
        const sp = SPECIES_BY_ID[it.sp];
        drawCreature(ctx, it.sp, sx(from.x) + col * 2.6 * s, sy(from.y) + (1.5 + row * 2.4 + sp.rx * 0.72) * s, s * 0.72, 1, t, {
          rotate: -Math.PI / 2 + Math.sin(t * 9 + i) * 0.3, mood: 'happy',
        });
        return;
      }
      if (k <= 1) {
        // flying in an arc, spinning, squashing as it lands
        const x = lerp(from.x, to.x, k);
        const y = lerp(from.y, to.y, k) - Math.sin(k * Math.PI) * Math.min(14, view.viewH * 0.11);
        const squash = k > 0.85 ? 1 + (k - 0.85) * 3 : 1;
        if (it.kind === 'bonus') drawSandDollar(ctx, sx(x), sy(y), 2.2 * s);
        else if (it.kind === 'chest') drawChest(ctx, sx(x), sy(y), s * (0.8 + Math.sin(k * Math.PI) * 0.4), k, t);
        else {
          ctx.save();
          ctx.translate(sx(x), sy(y));
          ctx.scale(1 / squash, squash);
          drawCreature(ctx, it.sp, 0, 0, s * (0.8 + Math.sin(k * Math.PI) * 0.3), 1, t, { rotate: k * TAU, mood: 'happy' });
          ctx.restore();
        }
        if (it.isNew) stamp(ctx, sx(x) + 5 * s, sy(y) - 4 * s, s, t);
      } else {
        if (it.kind !== 'bonus') landedFish++;
        const age = T - it.land;
        // the value pops up over the boat
        pop(ctx, `+${it.value}`, sx(to.x) + 6 * s, sy(to.y) - 10 * s, age * 0.9, it.kind === 'bonus' ? C.foam : C.sun);
        if (it.isNew && age < 1.6) stamp(ctx, sx(to.x) - 8 * s, sy(to.y) - 9 * s, s * (1 + Math.max(0, 0.2 - age) * 3), t);
      }
    });
    return landedFish;
  }

  function stamp(ctx, x, y, s, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.25 + Math.sin(t * 6) * 0.05);
    ctx.fillStyle = C.red;
    roundRect(ctx, -5 * s, -2.2 * s, 10 * s, 4.4 * s, 1.2 * s);
    ctx.fill();
    ctx.lineWidth = Math.max(2, 0.4 * s);
    ctx.strokeStyle = C.white;
    ctx.stroke();
    ctx.fillStyle = C.white;
    ctx.font = font(3 * s);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NEW!', 0, 0.2 * s);
    ctx.restore();
  }

  // Fish piled in the boat after the haul.
  function drawPile(ctx, trip, t, landed) {
    const { s } = view;
    const plan = trip.haul;
    let n = 0;
    for (const it of plan.items) {
      if (n >= landed) break;
      if (it.kind === 'bonus') continue;
      const k = n++;
      const x = sx(BOAT_X - 5 + (k % 5) * 2.2);
      const y = sy(-3.6 - Math.floor(k / 5) * 1.3);
      if (it.kind === 'chest') drawChest(ctx, x + 2 * s, y - 2 * s, s * 0.55, 1, t);
      else drawCreature(ctx, it.sp, x, y, s * 0.45, k % 2 ? 1 : -1, t * 0.3, { rotate: k % 2 ? 0.3 : -0.3, mood: 'happy' });
    }
  }

  // ----- the whole trip -----
  function drawTrip(ctx, trip, t, dt) {
    updateCamera(trip, dt);
    const { s } = view;
    drawBackground(ctx, t);
    drawSceneryLayer(ctx, t);
    drawSeabed(ctx, t, s, !trip.chest && trip.lineLen >= MAX_DEPTH);
    drawSurface(ctx, t, false);
    drawCreatures(ctx, trip, t);
    const hp = hookPos(trip);
    const hauling = trip.phase === 'haul' || trip.phase === 'done';
    let landed = 0;
    const pull = trip.phase === 'reel' ? 0.6 + Math.sin(t * 10) * 0.2 : 0;
    const cheer = hauling ? 1 : 0;
    if (hauling) {
      landed = haulProgress(trip).landed;
    }
    // boat (behind the haul, in front of the sky)
    drawBoat(ctx, sx(BOAT_X), sy(0), s, t, pull, cheer);
    if (hauling) drawPile(ctx, trip, t, landed);
    drawSurface(ctx, t, true);
    if (!hauling || trip.haul.items.some((it) => trip.phaseT < it.start)) drawLine(ctx, trip, hp);
    if (!hauling) {
      drawCatch(ctx, trip, hp, t);
      drawHook(ctx, trip, hp, t);
    } else drawHaul(ctx, trip, t);
    drawBubbles(ctx, trip, dt);
    if (!hauling) drawEffects(ctx, trip, hp);
  }

  // The menu's backdrop: sunset, sea, the boat bobbing and fish swimming past.
  function drawMenuScene(ctx, t, surfFrac = 0.34, cheer = 0) {
    const { w, h, s } = view;
    view.camY = -(h * surfFrac) / s;
    drawBackground(ctx, t);
    drawSurface(ctx, t, false);
    const fishes = ['sergeant', 'snapper', 'parrot', 'angel', 'grouper', 'turtle'];
    fishes.forEach((id, i) => {
      const sp = 3 + (i % 3) * 1.5;
      const dir = i % 2 ? 1 : -1;
      const span = FIELD_W + 30;
      const k = (((t * sp + i * 23) % span) + span) % span - 15;
      const x = dir > 0 ? k : FIELD_W - k;
      const y = 12 + i * ((view.viewH - view.viewH * surfFrac - 14) / fishes.length);
      drawCreature(ctx, id, sx(x), sy(y), s * 0.9, dir, t, { phase: i * 0.3 });
    });
    const bs = Math.min(s * 1.1, h / 120);
    drawBoat(ctx, sx(BOAT_X + 6), sy(0), bs, t, 0, cheer);
    // a line dangling
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = Math.max(1.5, 0.2 * s);
    const tip = { x: sx(BOAT_X + 6) + (ROD_TIP.x - BOAT_X) * bs, y: sy(0) + ROD_TIP.y * bs };
    const hy = sy(14 + Math.sin(t * 1.3) * 1.5);
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x, hy);
    ctx.stroke();
    drawHookShape(ctx, tip.x + 0.4 * s, hy + 1.2 * s, 1.1 * s, '#e6ebf2');
    drawSurface(ctx, t, true);
    drawBubbles(ctx, null, 1 / 60);
  }

  return { view, resize, reset, drawTrip, drawMenuScene, toScreen, toWorldX, hookPos };
}

// ---------------------------------------------------------------------------------------------
// HUD pieces
// ---------------------------------------------------------------------------------------------

// The depth meter down the right edge: zone colours, the line's reach, the best so far and
// where the hook is now. (x, y0, y1) in screen px.
export function drawDepthMeter(ctx, x, y0, y1, wpx, hookDepth, reach, best, t) {
  const H = y1 - y0;
  const at = (d) => y0 + (clamp(d, 0, MAX_DEPTH) / MAX_DEPTH) * H;
  ctx.save();
  ctx.fillStyle = 'rgba(22,11,51,0.35)';
  roundRect(ctx, x - wpx * 0.5 - 3, y0 - 3, wpx + 6, H + 6, wpx * 0.5 + 3);
  ctx.fill();
  for (const z of ZONES) {
    ctx.fillStyle = z.colour;
    ctx.fillRect(x - wpx / 2, at(z.top), wpx, at(z.bottom) - at(z.top));
  }
  // beyond the line's reach is dimmed
  ctx.fillStyle = 'rgba(10,6,30,0.6)';
  ctx.fillRect(x - wpx / 2, at(reach), wpx, y1 - at(reach));
  ctx.lineWidth = 2;
  ctx.strokeStyle = C.white;
  roundRect(ctx, x - wpx / 2, y0, wpx, H, Math.min(wpx / 2, 6));
  ctx.stroke();
  // reach tick
  ctx.strokeStyle = C.sun;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - wpx * 0.9, at(reach));
  ctx.lineTo(x + wpx * 0.9, at(reach));
  ctx.stroke();
  // best so far: a little flag
  if (best > 0) {
    const by = at(best);
    ctx.fillStyle = C.pink;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - wpx / 2, by);
    ctx.lineTo(x - wpx / 2 - wpx * 0.9, by - wpx * 0.45);
    ctx.lineTo(x - wpx / 2 - wpx * 0.9, by + wpx * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // the chest at the bottom
  drawChest(ctx, x, y1 + wpx * 0.9, wpx * 0.14, 0.1 + Math.sin(t * 2) * 0.1, t);
  // the hook marker
  const hy = at(hookDepth);
  ctx.fillStyle = C.white;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, hy, wpx * 0.7, 0, TAU);
  ctx.fill();
  ctx.stroke();
  drawHookShape(ctx, x + wpx * 0.15, hy - wpx * 0.05, wpx * 0.28, C.ink);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Launcher tile
// ---------------------------------------------------------------------------------------------

let tileKey = '';
let tileBg = null;

function paintTile(w, h, dpr) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * dpr));
  c.height = Math.max(1, Math.round(h * dpr));
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  const surf = h * 0.3;
  const sky = g.createLinearGradient(0, 0, 0, surf);
  sky.addColorStop(0, '#3b1a6b');
  sky.addColorStop(0.5, '#c2368f');
  sky.addColorStop(1, '#ffb05a');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, surf);
  g.fillStyle = C.sun;
  g.beginPath();
  g.arc(w * 0.78, surf - h * 0.02, w * 0.1, 0, TAU);
  g.fill();
  g.fillStyle = 'rgba(43,16,85,0.7)';
  for (const [k, th] of [[0.02, 0.06], [0.08, 0.1], [0.14, 0.07], [0.2, 0.12], [0.27, 0.08]]) g.fillRect(k * w, surf - th * h, w * 0.05, th * h);
  const sea = g.createLinearGradient(0, surf, 0, h);
  sea.addColorStop(0, rgb(waterRGB(0)));
  sea.addColorStop(0.45, rgb(waterRGB(110)));
  sea.addColorStop(1, rgb(waterRGB(320)));
  g.fillStyle = sea;
  g.fillRect(0, surf, w, h - surf);
  // light shafts
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const x0 = w * (0.15 + i * 0.3);
    const sg = g.createLinearGradient(0, surf, 0, h * 0.8);
    sg.addColorStop(0, 'rgba(255,255,220,0.16)');
    sg.addColorStop(1, 'rgba(255,255,220,0)');
    g.fillStyle = sg;
    g.beginPath();
    g.moveTo(x0, surf);
    g.lineTo(x0 + w * 0.08, surf);
    g.lineTo(x0 - w * 0.12, h * 0.8);
    g.lineTo(x0 - w * 0.25, h * 0.8);
    g.closePath();
    g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  // kelp and a rock at the bottom
  g.fillStyle = '#1e2540';
  g.beginPath();
  g.moveTo(0, h);
  g.quadraticCurveTo(w * 0.15, h * 0.86, w * 0.32, h);
  g.fill();
  g.beginPath();
  g.moveTo(w * 0.7, h);
  g.quadraticCurveTo(w * 0.9, h * 0.84, w, h * 0.9);
  g.lineTo(w, h);
  g.fill();
  return c;
}

export function drawTile(ctx, x, y, w, h, time) {
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const key = `${Math.round(w)}x${Math.round(h)}@${dpr}`;
  if (key !== tileKey) {
    tileKey = key;
    tileBg = paintTile(w, h, dpr);
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(tileBg, x, y, w, h);
  const s = w / 40;
  const surf = y + h * 0.3;
  // fish swimming past at different depths
  const swim = (id, depthK, speed, dir, ph, sc = 1) => {
    const span = w + 16 * s;
    const k = ((((time * speed * s + ph * span) % span) + span) % span) - 8 * s;
    const fx = dir > 0 ? x + k : x + w - k;
    drawCreature(ctx, id, fx, y + h * depthK, s * sc, dir, time, { phase: ph, glow: depthK > 0.8 });
  };
  swim('sergeant', 0.42, 5, 1, 0.1);
  swim('angel', 0.58, 3.5, -1, 0.6);
  swim('lantern', 0.88, 4, 1, 0.3);
  // the line and hook, with a big grouper eyeing it up
  const hx = x + w * 0.36 + (ROD_TIP.x - BOAT_X) * s * 0.95;
  const hy = y + h * (0.68 + Math.sin(time * 1.6) * 0.02);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(1, s * 0.25);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.36 + (ROD_TIP.x - BOAT_X) * s * 0.95, surf + ROD_TIP.y * s * 0.95);
  ctx.lineTo(hx, hy - s);
  ctx.stroke();
  drawHookShape(ctx, hx + s * 0.4, hy, s * 1.2, '#e6ebf2');
  const lunge = Math.max(0, Math.sin(time * 1.4)) ** 3;
  drawCreature(ctx, 'grouper', hx - s * (11 - lunge * 4), hy + s * 2, s * 1.1, 1, time, { mood: lunge > 0.6 ? 'surprised' : 'normal' });
  // surface and boat
  ctx.fillStyle = 'rgba(201,251,255,0.8)';
  ctx.beginPath();
  ctx.moveTo(x, surf);
  for (let i = 0; i <= 12; i++) ctx.lineTo(x + (i / 12) * w, surf + Math.sin(i * 1.3 + time * 2.5) * s * 0.5);
  ctx.lineTo(x + w, surf + s);
  ctx.lineTo(x, surf + s);
  ctx.closePath();
  ctx.fill();
  drawBoat(ctx, x + w * 0.36, surf, s * 0.95, time, 0, 0);
  ctx.restore();
}
