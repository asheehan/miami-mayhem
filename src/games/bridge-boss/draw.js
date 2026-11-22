// Bridge Boss drawing. Reads the game state and never changes it.
// The world is drawn top-down in world units under one transform (see createRenderer); the
// ground, water, roads and scenery are painted once per screen size into an offscreen canvas.
import {
  WORLD_W, WORLD_H, CHANNEL_X0, CHANNEL_X1, ROAD_HALF, TYPES, roadYs, vehicleCentre, lanePoint,
  occupant, waitingAt, canToggle, POOF_TIME,
} from './sim.js';

export const C = {
  night: '#2b1055',
  dusk: '#7a1fa2',
  pink: '#ff3d9a',
  hotPink: '#ff5fb4',
  orange: '#ff8a4c',
  sun: '#ffe14d',
  sea: '#0bb5c4',
  deep: '#0a3d6b',
  foam: '#9ff7f2',
  ink: '#160b33',
  white: '#ffffff',
  red: '#ff3b3b',
  green: '#3ddc84',
  road: '#3d3357',
  roadLight: '#56497a',
  walk: '#f6d3c2',
  sand: '#ffcf9e',
  grass: '#6fcf7f',
  grassDark: '#4fae66',
  stone: '#c9a7a0',
  steel: '#8f86b3',
};

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const MID_X = (CHANNEL_X0 + CHANNEL_X1) / 2;
const LEAF = (CHANNEL_X1 - CHANNEL_X0) / 2;
const MAX_ANGLE = 1.35; // radians the leaves tip up to when fully open
const LIFT = 0.7; // how far a raised leaf leans up the screen, for the 3/4 look

export const font = (px, weight = 900) => `${weight} ${px}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;

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
  ctx.font = font(Math.round(px));
  if (maxW) {
    const tw = ctx.measureText(text).width;
    if (tw > maxW) {
      px = (px * maxW) / tw;
      ctx.font = font(Math.round(px));
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

export function heartPath(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.95);
  ctx.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.75, y - r * 1.25, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.75, y - r * 1.25, x + r * 1.5, y - r * 0.1, x, y + r * 0.95);
  ctx.closePath();
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
  ctx.strokeStyle = filled ? C.ink : 'rgba(255,255,255,0.55)';
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
  ctx.fillStyle = C.ink;
  const px = Math.round(b.h * 0.42);
  ctx.font = font(px);
  const tw = ctx.measureText(b.label).width;
  if (tw > b.w * 0.86) ctx.font = font(Math.round((px * b.w * 0.86) / tw));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
}

export function drawIconButton(ctx, b) {
  ctx.fillStyle = 'rgba(22,11,51,0.45)';
  roundRect(ctx, b.x, b.y, b.w, b.h, b.w * 0.24);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.stroke();
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const s = b.w * 0.3;
  ctx.fillStyle = C.white;
  ctx.strokeStyle = C.white;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (b.icon === 'home') {
    ctx.beginPath();
    ctx.moveTo(cx - s * 1.05, cy - s * 0.05);
    ctx.lineTo(cx, cy - s);
    ctx.lineTo(cx + s * 1.05, cy - s * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx - s * 0.7, cy - s * 0.1, s * 1.4, s * 0.95);
  } else if (b.icon === 'back') {
    ctx.lineWidth = s * 0.42;
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.35, cy - s * 0.8);
    ctx.lineTo(cx - s * 0.45, cy);
    ctx.lineTo(cx + s * 0.35, cy + s * 0.8);
    ctx.stroke();
  } else if (b.icon === 'restart') {
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
  }
}

export function drawConfetti(ctx, w, h, time) {
  const colours = [C.pink, C.sun, C.foam, C.white, C.orange, '#b46bff'];
  for (let i = 0; i < 70; i++) {
    const speed = 90 + ((i * 53) % 80);
    const x = ((i * 0.137) % 1) * w + Math.sin(time * 2 + i) * 20;
    const y = ((time * speed + i * 41) % (h + 40)) - 20;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(time * 3 + i);
    ctx.fillStyle = colours[i % colours.length];
    ctx.fillRect(-5, -3, 10, 6);
    ctx.restore();
  }
}

export function drawLock(ctx, x, y, r) {
  ctx.lineJoin = 'round';
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = r * 0.5;
  ctx.beginPath();
  ctx.arc(x, y - r * 0.35, r * 0.62, Math.PI, 0);
  ctx.stroke();
  ctx.strokeStyle = '#d9d2f2';
  ctx.lineWidth = r * 0.26;
  ctx.stroke();
  ctx.fillStyle = C.sun;
  roundRect(ctx, x - r, y - r * 0.4, r * 2, r * 1.5, r * 0.3);
  ctx.fill();
  ctx.lineWidth = r * 0.16;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(x, y + r * 0.2, r * 0.24, 0, TAU);
  ctx.fill();
  ctx.fillRect(x - r * 0.09, y + r * 0.2, r * 0.18, r * 0.5);
}

// ---------- vehicles ----------

const CAR_COLOURS = ['#ff3d9a', '#1496ff', '#ffe14d', '#3ddc84', '#ff8a4c', '#b46bff', '#9ff7f2'];
const BOAT_TRIM = ['#ff3d9a', '#0bb5c4', '#ff8a4c', '#b46bff', '#1496ff'];

// Two eyes looking forward, with brows that tilt as patience runs out.
function eyes(ctx, x, half, r, mood, time, blinkSeed) {
  const blink = (time * 0.7 + blinkSeed) % 3.2 < 0.12 && mood < 0.75;
  for (const side of [-1, 1]) {
    const ey = side * half;
    ctx.fillStyle = C.white;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = r * 0.28;
    ctx.beginPath();
    if (blink) ctx.ellipse(x, ey, r * 0.35, r, 0, 0, TAU);
    else ctx.arc(x, ey, r, 0, TAU);
    ctx.fill();
    ctx.stroke();
    if (!blink) {
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.arc(x + r * 0.35, ey, r * (mood > 0.5 ? 0.4 : 0.52), 0, TAU);
      ctx.fill();
    }
    if (mood > 0.6) {
      // cross brows, angled down toward the middle
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = r * 0.45;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - r * 1.1, ey + side * r * 1.25);
      ctx.lineTo(x + r * 0.9, ey + side * r * 0.55);
      ctx.stroke();
    }
  }
}

function carBody(ctx, len, w, fill) {
  // wheels
  ctx.fillStyle = C.ink;
  for (const fx of [-len * 0.3, len * 0.28]) {
    roundRect(ctx, fx - 1.2, -w / 2 - 0.5, 2.4, w + 1, 0.6);
    ctx.fill();
  }
  ctx.fillStyle = fill;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.45;
  roundRect(ctx, -len / 2, -w / 2, len, w, w * 0.32);
  ctx.fill();
  ctx.stroke();
}

function headlights(ctx, len, w, on) {
  ctx.fillStyle = on ? '#fff6b0' : '#f2e6c9';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(len / 2 - 0.45, side * w * 0.32, 0.4, 0.75, 0, 0, TAU);
    ctx.fill();
  }
}

// One vehicle centred on the origin, facing +x, in world units.
// opts: { look, mood (0..1), time, speedK (0..1 how fast it is going), flash }
export function drawVehicle(ctx, type, opts = {}) {
  const T = TYPES[type];
  const { len, width: w } = T;
  const look = opts.look ?? 0;
  const mood = opts.mood ?? 0;
  const time = opts.time ?? 0;
  const k = opts.speedK ?? 0;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (T.kind === 'water') {
    // wake
    if (k > 0.05) {
      ctx.strokeStyle = `rgba(255,255,255,${0.25 + 0.45 * k})`;
      ctx.lineWidth = 0.7;
      const spread = type === 'speedboat' ? 1.1 : 0.55;
      const back = len * (type === 'speedboat' ? 0.9 : 0.45) * (0.4 + k * 0.6);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(len * 0.3, side * w * 0.45);
        ctx.quadraticCurveTo(-len * 0.4, side * w * (0.6 + spread * 0.4), -len / 2 - back, side * (w * 0.5 + back * spread * 0.5));
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(255,255,255,${0.35 * k})`;
      ctx.beginPath();
      ctx.ellipse(-len / 2 - 1, 0, 2.2 + back * 0.15, w * 0.35, 0, 0, TAU);
      ctx.fill();
    }
    hullPath(ctx, len, w);
    ctx.fillStyle = type === 'speedboat' ? '#ff3b3b' : type === 'cruise' ? '#fdfbff' : C.white;
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    if (type === 'boat') {
      const trim = BOAT_TRIM[look % BOAT_TRIM.length];
      ctx.strokeStyle = trim;
      ctx.lineWidth = 0.9;
      hullPath(ctx, len - 1.4, w - 1.4);
      ctx.stroke();
      // cabin
      ctx.fillStyle = '#e9e3ff';
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.4;
      roundRect(ctx, -len * 0.3, -w * 0.28, len * 0.38, w * 0.56, 0.8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#7fd6ff';
      ctx.fillRect(len * 0.02, -w * 0.22, 0.9, w * 0.44);
      if (look % 2 === 0) {
        // a sail, seen from above as a curved triangle
        ctx.fillStyle = '#fff7e0';
        ctx.beginPath();
        ctx.moveTo(-len * 0.1, 0);
        ctx.quadraticCurveTo(-len * 0.25, -w * 0.9, -len * 0.48, -w * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      eyes(ctx, len * 0.26, w * 0.17, 0.8, mood, time, look);
    } else if (type === 'speedboat') {
      ctx.fillStyle = C.sun;
      ctx.beginPath();
      ctx.moveTo(len / 2 - 0.8, 0);
      ctx.lineTo(-len * 0.4, -w * 0.28);
      ctx.lineTo(-len * 0.4, w * 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#7fd6ff';
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(-len * 0.02, -w * 0.38);
      ctx.quadraticCurveTo(len * 0.12, 0, -len * 0.02, w * 0.38);
      ctx.lineTo(-len * 0.12, w * 0.32);
      ctx.quadraticCurveTo(0, 0, -len * 0.12, -w * 0.32);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      eyes(ctx, len * 0.24, w * 0.2, 0.7, mood, time, look);
    } else {
      // cruise ship: decks, a pool, funnels and lifeboats
      ctx.fillStyle = '#dcd6f7';
      roundRect(ctx, -len * 0.42, -w * 0.32, len * 0.72, w * 0.64, 1.2);
      ctx.fill();
      ctx.fillStyle = '#5ad1ff';
      roundRect(ctx, -len * 0.1, -w * 0.16, len * 0.16, w * 0.32, 0.8);
      ctx.fill();
      ctx.fillStyle = '#1496ff';
      for (let i = 0; i < 9; i++) {
        const x = -len * 0.4 + i * len * 0.08;
        ctx.fillRect(x, -w * 0.44, len * 0.04, 0.7);
        ctx.fillRect(x, w * 0.44 - 0.7, len * 0.04, 0.7);
      }
      ctx.fillStyle = C.orange;
      for (const x of [-len * 0.3, -len * 0.18, len * 0.12]) {
        roundRect(ctx, x, -w * 0.5 - 0.6, 2.2, 1, 0.5);
        ctx.fill();
        roundRect(ctx, x, w * 0.5 - 0.4, 2.2, 1, 0.5);
        ctx.fill();
      }
      for (const fx of [-len * 0.3, -len * 0.18]) {
        ctx.fillStyle = C.red;
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 0.4;
        roundRect(ctx, fx - 1.6, -1.6, 3.2, 3.2, 1);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = C.ink;
        ctx.beginPath();
        ctx.arc(fx, 0, 0.8, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#f5f0ff';
      ctx.strokeStyle = C.ink;
      roundRect(ctx, len * 0.18, -w * 0.25, len * 0.12, w * 0.5, 1);
      ctx.fill();
      ctx.stroke();
      eyes(ctx, len * 0.36, w * 0.16, 1.1, mood, time, look);
    }
    return;
  }
  if (type === 'car') {
    carBody(ctx, len, w, CAR_COLOURS[look % CAR_COLOURS.length]);
    ctx.fillStyle = 'rgba(22,11,51,0.18)';
    roundRect(ctx, -len * 0.3, -w * 0.36, len * 0.5, w * 0.72, 1);
    ctx.fill();
    ctx.fillStyle = '#7fd6ff';
    ctx.fillRect(len * 0.12, -w * 0.33, len * 0.1, w * 0.66);
    ctx.fillRect(-len * 0.33, -w * 0.3, len * 0.07, w * 0.6);
    headlights(ctx, len, w, false);
    eyes(ctx, len * 0.32, w * 0.2, 0.95, mood, time, look);
  } else if (type === 'bus') {
    carBody(ctx, len, w, '#ffc928');
    ctx.fillStyle = C.ink;
    ctx.fillRect(-len / 2 + 1, -w * 0.08, len - 2.5, w * 0.16);
    ctx.fillStyle = '#7fd6ff';
    for (let i = 0; i < 6; i++) {
      const x = -len / 2 + 1.6 + i * 2.2;
      ctx.fillRect(x, -w / 2 + 0.5, 1.5, 0.9);
      ctx.fillRect(x, w / 2 - 1.4, 1.5, 0.9);
    }
    ctx.fillRect(len / 2 - 1.8, -w * 0.36, 0.9, w * 0.72);
    headlights(ctx, len, w, true);
    eyes(ctx, len / 2 - 3, w * 0.2, 1, mood, time, look);
  } else if (type === 'truck') {
    ctx.fillStyle = C.ink;
    for (const fx of [-len * 0.35, -len * 0.2, len * 0.32]) {
      roundRect(ctx, fx - 1.2, -w / 2 - 0.5, 2.4, w + 1, 0.6);
      ctx.fill();
    }
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.45;
    ctx.fillStyle = '#f2eefc';
    roundRect(ctx, -len / 2, -w / 2, len * 0.7, w, 0.8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = CAR_COLOURS[(look + 2) % CAR_COLOURS.length];
    ctx.fillRect(-len / 2 + 0.6, -0.7, len * 0.7 - 1.2, 1.4);
    ctx.fillStyle = CAR_COLOURS[look % CAR_COLOURS.length];
    roundRect(ctx, len * 0.22, -w / 2, len * 0.28, w, w * 0.3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#7fd6ff';
    ctx.fillRect(len * 0.36, -w * 0.33, 0.9, w * 0.66);
    headlights(ctx, len, w, true);
    eyes(ctx, len * 0.33, w * 0.2, 0.9, mood, time, look);
  } else if (type === 'ambulance') {
    carBody(ctx, len, w, C.white);
    ctx.fillStyle = C.red;
    ctx.fillRect(-len / 2 + 0.5, -w / 2 + 0.3, len - 1.6, 0.8);
    ctx.fillRect(-len / 2 + 0.5, w / 2 - 1.1, len - 1.6, 0.8);
    // red cross on the roof
    ctx.fillRect(-len * 0.22 - 0.6, -1.8, 1.2, 3.6);
    ctx.fillRect(-len * 0.22 - 1.8, -0.6, 3.6, 1.2);
    ctx.fillStyle = '#7fd6ff';
    ctx.fillRect(len * 0.18, -w * 0.33, len * 0.08, w * 0.66);
    // the flashing light bar
    const on = Math.floor(time * 6) % 2 === 0;
    const glowA = on ? 'rgba(255,59,59,0.45)' : 'rgba(20,150,255,0.45)';
    ctx.fillStyle = glowA;
    ctx.beginPath();
    ctx.arc(len * 0.07, on ? -1.3 : 1.3, 3.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = on ? C.red : '#ff9a9a';
    roundRect(ctx, len * 0.02 - 0.5, -w * 0.38, 1.2, w * 0.36, 0.4);
    ctx.fill();
    ctx.fillStyle = on ? '#9ccfff' : '#1496ff';
    roundRect(ctx, len * 0.02 - 0.5, 0.02, 1.2, w * 0.36, 0.4);
    ctx.fill();
    headlights(ctx, len, w, on);
    eyes(ctx, len * 0.36, w * 0.2, 0.85, mood, time, look);
  }
}

function hullPath(ctx, len, w) {
  const r = w * 0.35;
  ctx.beginPath();
  ctx.moveTo(len / 2, 0);
  ctx.quadraticCurveTo(len * 0.32, -w / 2, len * 0.05, -w / 2);
  ctx.lineTo(-len / 2 + r, -w / 2);
  ctx.quadraticCurveTo(-len / 2, -w / 2, -len / 2, -w / 2 + r);
  ctx.lineTo(-len / 2, w / 2 - r);
  ctx.quadraticCurveTo(-len / 2, w / 2, -len / 2 + r, w / 2);
  ctx.lineTo(len * 0.05, w / 2);
  ctx.quadraticCurveTo(len * 0.32, w / 2, len / 2, 0);
  ctx.closePath();
}

// A vehicle as a small icon in screen pixels (for the goal counter and level tiles).
export function drawVehicleIcon(ctx, type, x, y, size, angle = 0, mood = 0) {
  const T = TYPES[type];
  const k = size / Math.max(T.len, 11);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(k, k);
  drawVehicle(ctx, type, { look: type === 'car' ? 0 : 1, time: 0, mood });
  ctx.restore();
}

// ---------- scenery ----------

function palm(ctx, x, y, r, seed) {
  ctx.fillStyle = 'rgba(40,10,60,0.22)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.7, y + r * 0.5, r * 1.05, r * 0.8, 0.4, 0, TAU);
  ctx.fill();
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + seed;
    const ex = x + Math.cos(a) * r;
    const ey = y + Math.sin(a) * r;
    ctx.fillStyle = i % 2 ? '#2f9e55' : '#3fbf66';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a + 0.35) * r * 0.7, y + Math.sin(a + 0.35) * r * 0.7, ex, ey);
    ctx.quadraticCurveTo(x + Math.cos(a - 0.35) * r * 0.7, y + Math.sin(a - 0.35) * r * 0.7, x, y);
    ctx.fill();
  }
  ctx.fillStyle = '#8a5a3c';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.16, 0, TAU);
  ctx.fill();
}

const BUILDING_COLOURS = [['#ff9ecf', '#ff5fb4'], ['#8ff0d2', '#3fcfa8'], ['#fff0a0', '#ffc928'], ['#c7a8ff', '#9a70f0'], ['#ffc29e', '#ff8a4c']];

function building(ctx, x, y, w, h, look) {
  const [fill, trim] = BUILDING_COLOURS[look % BUILDING_COLOURS.length];
  ctx.fillStyle = 'rgba(40,10,60,0.25)';
  ctx.fillRect(x + 1.6, y + 1.6, w, h);
  ctx.fillStyle = fill;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.35;
  roundRect(ctx, x, y, w, h, 0.8);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = trim;
  ctx.lineWidth = 0.8;
  roundRect(ctx, x + 1, y + 1, w - 2, h - 2, 0.5);
  ctx.stroke();
  if (look % 3 === 0 && w > 10 && h > 10) {
    // a rooftop pool
    ctx.fillStyle = '#5ad1ff';
    roundRect(ctx, x + w * 0.25, y + h * 0.3, w * 0.5, h * 0.35, 1);
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(x + w * 0.2, y + h * 0.25, 2.4, 2.4);
    ctx.fillRect(x + w * 0.6, y + h * 0.55, 2.4, 2.4);
  }
}

// The ground, channel and roads. Bridge decks are drawn live, so the roads stop at the banks.
function paintScene(ctx, x0, y0, x1, y1, ys) {
  ctx.fillStyle = C.sand;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  // lawns
  ctx.fillStyle = C.grass;
  const bands = [y0, ...ys.flatMap((y) => [y - ROAD_HALF - 3, y + ROAD_HALF + 3]), y1];
  for (let i = 0; i < bands.length; i += 2) {
    const top = bands[i] + (i === 0 ? 0 : 0);
    const bottom = bands[i + 1];
    if (bottom - top < 2) continue;
    ctx.fillRect(x0, top + 1, CHANNEL_X0 - 4 - x0, bottom - top - 2);
    ctx.fillRect(CHANNEL_X1 + 4, top + 1, x1 - CHANNEL_X1 - 4, bottom - top - 2);
  }
  // water, with a sunset shimmer
  const water = ctx.createLinearGradient(0, y0, 0, y1);
  water.addColorStop(0, '#1d7fb8');
  water.addColorStop(0.45, C.sea);
  water.addColorStop(1, '#1d7fb8');
  ctx.fillStyle = water;
  ctx.fillRect(CHANNEL_X0, y0, CHANNEL_X1 - CHANNEL_X0, y1 - y0);
  const glow = ctx.createLinearGradient(CHANNEL_X0, 0, CHANNEL_X1, 0);
  glow.addColorStop(0, 'rgba(255,138,76,0)');
  glow.addColorStop(0.5, 'rgba(255,138,76,0.28)');
  glow.addColorStop(1, 'rgba(255,61,154,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(CHANNEL_X0, y0, CHANNEL_X1 - CHANNEL_X0, y1 - y0);
  // sea walls
  ctx.fillStyle = C.stone;
  ctx.fillRect(CHANNEL_X0 - 1.4, y0, 1.4, y1 - y0);
  ctx.fillRect(CHANNEL_X1, y0, 1.4, y1 - y0);
  ctx.fillStyle = 'rgba(22,11,51,0.25)';
  ctx.fillRect(CHANNEL_X0, y0, 0.6, y1 - y0);
  ctx.fillRect(CHANNEL_X1 - 0.6, y0, 0.6, y1 - y0);
  // roads up to the banks
  for (const y of ys) {
    for (const [a, b] of [[x0, CHANNEL_X0], [CHANNEL_X1, x1]]) {
      ctx.fillStyle = C.walk;
      ctx.fillRect(a, y - ROAD_HALF - 2, b - a, ROAD_HALF * 2 + 4);
      ctx.fillStyle = C.road;
      ctx.fillRect(a, y - ROAD_HALF, b - a, ROAD_HALF * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(a, y - ROAD_HALF + 0.6, b - a, 0.4);
      ctx.fillRect(a, y + ROAD_HALF - 1, b - a, 0.4);
      ctx.fillStyle = C.sun;
      for (let x = Math.ceil(a / 6) * 6; x < b - 3; x += 6) {
        if (x > CHANNEL_X0 - 9 && x < CHANNEL_X1 + 6) continue;
        ctx.fillRect(x, y - 0.35, 3.2, 0.7);
      }
    }
    // stop lines
    ctx.fillStyle = C.white;
    ctx.fillRect(CHANNEL_X0 - 2.6, y, 0.8, ROAD_HALF - 0.5);
    ctx.fillRect(CHANNEL_X1 + 1.8, y - ROAD_HALF + 0.5, 0.8, ROAD_HALF - 0.5);
    // bridge-tender houses on the corners
    for (const [hx, hy] of [[CHANNEL_X0 - 8.5, y - ROAD_HALF - 8], [CHANNEL_X1 + 2.5, y + ROAD_HALF + 2.2]]) {
      ctx.fillStyle = 'rgba(40,10,60,0.25)';
      ctx.fillRect(hx + 1.2, hy + 1.2, 6, 5.6);
      ctx.fillStyle = '#ffe9f4';
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.35;
      ctx.fillRect(hx, hy, 6, 5.6);
      ctx.strokeRect(hx, hy, 6, 5.6);
      ctx.fillStyle = C.pink;
      ctx.beginPath();
      ctx.moveTo(hx - 0.6, hy + 2.8);
      ctx.lineTo(hx + 3, hy - 0.6);
      ctx.lineTo(hx + 6.6, hy + 2.8);
      ctx.lineTo(hx + 3, hy + 6.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  // palms and buildings on the lawns, away from the roads and the water
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < bands.length; i += 2) {
    const top = bands[i] + 1;
    const bottom = bands[i + 1] - 1;
    if (bottom - top < 8) continue;
    for (const [a, b] of [[x0, CHANNEL_X0 - 4], [CHANNEL_X1 + 4, x1]]) {
      // buildings in a loose grid
      for (let gy = top + 3; gy + 12 < bottom; gy += 22) {
        for (let gx = a + 2; gx + 12 < b; gx += 20) {
          if (rnd() < 0.25) continue;
          const bw = 11 + rnd() * 6;
          const bh = 10 + rnd() * 7;
          const bx = Math.min(gx + rnd() * 3, b - bw - 2);
          const by = Math.min(gy + rnd() * 3, bottom - bh - 2);
          building(ctx, bx, by, bw, bh, Math.floor(rnd() * 15));
        }
      }
    }
  }
  // palms along the banks and the roads
  const palms = [];
  for (let y = y0 + 6; y < y1; y += 13) {
    palms.push([CHANNEL_X0 - 4.5, y], [CHANNEL_X1 + 4.5, y + 6]);
  }
  for (const y of ys) {
    for (let x = x0 + 4; x < x1; x += 15) {
      if (x > CHANNEL_X0 - 12 && x < CHANNEL_X1 + 12) continue;
      palms.push([x, y - ROAD_HALF - 4.8], [x + 7, y + ROAD_HALF + 4.8]);
    }
  }
  for (const [px, py] of palms) {
    if (ys.some((y) => Math.abs(py - y) < ROAD_HALF + 4)) continue;
    palm(ctx, px, py, 3.6 + rnd() * 1.2, rnd() * TAU);
  }
  // a warm sunset light over everything
  const tint = ctx.createLinearGradient(0, y0, 0, y1);
  tint.addColorStop(0, 'rgba(255,61,154,0.16)');
  tint.addColorStop(0.5, 'rgba(255,138,76,0.06)');
  tint.addColorStop(1, 'rgba(122,31,162,0.18)');
  ctx.fillStyle = tint;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
}

// ---------- bridges ----------

const leafAngle = (br) => {
  const k = br.k;
  return MAX_ANGLE * (k * k * (3 - 2 * k));
};

// One leaf of the bascule bridge. side -1 hinges on the west bank, +1 on the east.
function drawLeaf(ctx, y, side, a, shakeX) {
  const hinge = side < 0 ? CHANNEL_X0 : CHANNEL_X1;
  const reach = LEAF * Math.cos(a);
  const rise = LEAF * Math.sin(a) * LIFT;
  const tip = hinge - side * reach + shakeX;
  const top = y - ROAD_HALF;
  const bottom = y + ROAD_HALF;
  // shadow on the water
  if (a > 0.02) {
    const sh = LEAF * Math.sin(a) * 0.55;
    ctx.fillStyle = 'rgba(22,11,51,0.28)';
    ctx.beginPath();
    ctx.moveTo(hinge, top);
    ctx.lineTo(tip + sh * 0.7, top + sh * 0.35);
    ctx.lineTo(tip + sh * 0.7, bottom + sh * 0.35);
    ctx.lineTo(hinge, bottom);
    ctx.closePath();
    ctx.fill();
  }
  // the deck's front edge, seen as the leaf lifts
  if (a > 0.02) {
    ctx.fillStyle = '#2a2240';
    ctx.beginPath();
    ctx.moveTo(hinge, bottom);
    ctx.lineTo(tip, bottom - rise);
    ctx.lineTo(tip, bottom - rise + 1.4);
    ctx.lineTo(hinge, bottom + 1.4);
    ctx.closePath();
    ctx.fill();
  }
  // deck
  const lit = Math.min(1, a / MAX_ANGLE);
  ctx.fillStyle = lit > 0.02 ? `rgb(${61 + 50 * lit},${51 + 30 * lit},${87 + 40 * lit})` : C.road;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.moveTo(hinge, top);
  ctx.lineTo(tip, top - rise);
  ctx.lineTo(tip, bottom - rise);
  ctx.lineTo(hinge, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // steel grating lines across the deck
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 0.3;
  for (let i = 1; i < 6; i++) {
    const f = i / 6;
    const x = hinge + (tip - hinge) * f;
    ctx.beginPath();
    ctx.moveTo(x, top - rise * f + 0.8);
    ctx.lineTo(x, bottom - rise * f - 0.8);
    ctx.stroke();
  }
  // centre line
  ctx.strokeStyle = C.sun;
  ctx.lineWidth = 0.7;
  ctx.setLineDash([2.4, 2]);
  ctx.beginPath();
  ctx.moveTo(hinge, y);
  ctx.lineTo(tip, y - rise);
  ctx.stroke();
  ctx.setLineDash([]);
  // railings, red and white
  for (const ry of [top, bottom]) {
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hinge, ry);
    ctx.lineTo(tip, ry - rise);
    ctx.stroke();
    ctx.strokeStyle = C.red;
    ctx.setLineDash([1.2, 1.2]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // the tip plate
  ctx.strokeStyle = C.sun;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(tip, top - rise);
  ctx.lineTo(tip, bottom - rise);
  ctx.stroke();
}

function light(ctx, x, y, go) {
  ctx.fillStyle = C.ink;
  roundRect(ctx, x - 1.5, y - 2.6, 3, 5.2, 0.8);
  ctx.fill();
  ctx.fillStyle = go ? 'rgba(80,30,30,1)' : C.red;
  ctx.beginPath();
  ctx.arc(x, y - 1.2, 1, 0, TAU);
  ctx.fill();
  ctx.fillStyle = go ? C.green : 'rgba(20,70,40,1)';
  ctx.beginPath();
  ctx.arc(x, y + 1.2, 1, 0, TAU);
  ctx.fill();
  ctx.fillStyle = go ? 'rgba(61,220,132,0.3)' : 'rgba(255,59,59,0.3)';
  ctx.beginPath();
  ctx.arc(x, y + (go ? 1.2 : -1.2), 2.3, 0, TAU);
  ctx.fill();
}

// A striped barrier arm. closed 0 = up out of the way, 1 = across the lane.
function gate(ctx, px, py, dir, closed) {
  const len = ROAD_HALF - 1;
  const a = (1 - closed) * 1.3;
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(1, dir);
  const ex = Math.sin(a) * len * 0.35;
  const ey = -Math.cos(a) * len;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.strokeStyle = C.white;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = C.red;
  ctx.setLineDash([1.2, 1.2]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawBridge(ctx, s, br, time, level) {
  const y = br.y;
  const a = leafAngle(br);
  const since = s.time - br.refusedTime;
  const shake = since < 0.45 ? Math.sin(since * 70) * 0.9 * (1 - since / 0.45) : 0;
  // the gap between the leaves shows dark water once they part
  drawLeaf(ctx, y, -1, a, shake);
  drawLeaf(ctx, y, 1, a, shake);
  const carsGo = br.state === 'down';
  const boatsGo = br.state === 'up';
  const closed = br.state === 'down' ? 0 : br.state === 'lowering' ? Math.min(1, br.k * 3) : Math.min(1, br.k * 4 + 0.4);
  const east = level.carDirs.includes('E');
  const west = level.carDirs.includes('W');
  if (east) {
    gate(ctx, CHANNEL_X0 - 4, y + ROAD_HALF + 0.5, 1, closed);
    light(ctx, CHANNEL_X0 - 6.5, y + ROAD_HALF + 4, carsGo);
  }
  if (west) {
    gate(ctx, CHANNEL_X1 + 4, y - ROAD_HALF - 0.5, -1, closed);
    light(ctx, CHANNEL_X1 + 6.5, y - ROAD_HALF - 4, carsGo);
  }
  if (level.boatDirs.includes('N')) light(ctx, CHANNEL_X1 - 1.8, y + ROAD_HALF + 5, boatsGo);
  if (level.boatDirs.includes('S')) light(ctx, CHANNEL_X0 + 1.8, y - ROAD_HALF - 5, boatsGo);
}

// ---------- the renderer ----------

export function createRenderer() {
  const r = {
    view: { s: 1, ox: 0, oy: 0, w: 1, h: 1 },
    bg: null,
    bgKey: '',
  };

  // world -> screen fit: the world's height fits between the HUD and the goal bar, and at
  // least MIN_VIEW_W of its width stays on screen (the edges are scenery and queues).
  r.layout = function layout(w, h, top, bottom) {
    const MIN_VIEW_W = 84;
    const availH = h - top - bottom;
    const s = Math.min(w / MIN_VIEW_W, availH / WORLD_H);
    r.view = { s, ox: (w - WORLD_W * s) / 2, oy: top + (availH - WORLD_H * s) / 2, w, h };
  };

  r.toScreen = (x, y) => ({ x: r.view.ox + x * r.view.s, y: r.view.oy + y * r.view.s });
  r.toWorld = (x, y) => ({ x: (x - r.view.ox) / r.view.s, y: (y - r.view.oy) / r.view.s });

  function background(ys) {
    const { w, h, s, ox, oy } = r.view;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const key = `${w}x${h}@${dpr}:${s}:${ys.join(',')}`;
    if (key === r.bgKey && r.bg) return r.bg;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * dpr));
    c.height = Math.max(1, Math.round(h * dpr));
    const g = c.getContext('2d');
    g.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    const p0 = r.toWorld(0, 0);
    const p1 = r.toWorld(w, h);
    paintScene(g, p0.x - 2, p0.y - 2, p1.x + 2, p1.y + 2, ys);
    r.bg = c;
    r.bgKey = key;
    return c;
  }

  // Patience pie: fills and turns from green to red.
  function pie(ctx, x, y, p, rad) {
    ctx.fillStyle = C.white;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, TAU);
    ctx.fill();
    ctx.stroke();
    const hue = 120 * (1 - clamp(p, 0, 1));
    ctx.fillStyle = `hsl(${hue},85%,50%)`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, rad - 0.45, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(p, 0, 1));
    ctx.closePath();
    ctx.fill();
  }

  function bubble(ctx, x, y, text, t, colour) {
    // pops up, bounces, fades
    const pop = t < 0.15 ? t / 0.15 : 1;
    const fade = t > 0.75 ? Math.max(0, 1 - (t - 0.75) / 0.25) : 1;
    const bounce = Math.sin(t * 18) * 0.5 * (1 - t);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(x, y + bounce - t * 1.5);
    ctx.scale(pop, pop);
    ctx.font = font(3);
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = colour;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.4;
    roundRect(ctx, -tw / 2 - 1, -2.2, tw + 2, 4.4, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0.2);
    ctx.restore();
  }

  function outward(s, lane) {
    if (lane.kind === 'road') return { x: 0, y: lane.dx > 0 ? 1 : -1 };
    return { x: lane.dy < 0 ? 1 : -1, y: 0 };
  }

  function drawVehicles(ctx, s, kind, time) {
    for (const lane of s.lanes) {
      if (lane.kind !== kind) continue;
      const angle = Math.atan2(lane.dy, lane.dx);
      for (const v of lane.vehicles) {
        const c = vehicleCentre(lane, v);
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(angle);
        const wobble = v.patience > 0.75 && v.waiting ? Math.sin(time * 40 + v.id) * 0.25 : 0;
        ctx.translate(wobble, 0);
        drawVehicle(ctx, v.type, { look: v.look, mood: v.patience, time, speedK: v.v / Math.max(1, v.speed) });
        ctx.restore();
      }
    }
  }

  function drawOverlays(ctx, s, time) {
    for (const lane of s.lanes) {
      const out = outward(s, lane);
      for (const v of lane.vehicles) {
        if (!v.waiting && v.patience < 0.05) continue;
        if (!v.waiting) continue;
        const side = lane.kind === 'water' ? -1 : 1; // boats show their pie on the channel side
        const pc = lanePoint(lane, v.s - Math.min(v.len * 0.5, 5));
        const d = v.width / 2 + 2.9;
        if (v.front || v.patience > 0.4) pie(ctx, pc.x + out.x * d * side, pc.y + out.y * d * side, v.patience, 2.3);
        // honks: more often as patience runs out
        if (v.patience > 0.25 || v.type === 'ambulance') {
          const every = 2.2 - 1.6 * v.patience;
          const t = ((time + v.id * 0.37) % every) / Math.min(1, every);
          if (t < 1) {
            const fc = lanePoint(lane, v.s - 1);
            const off = v.width / 2 + (lane.kind === 'water' ? 8 : 4);
            const bx = fc.x + out.x * off + lane.dx * 2;
            const by = fc.y + out.y * off + lane.dy * 2;
            const word = v.type === 'ambulance' ? 'wee-oo!' : lane.kind === 'road' ? 'beep!' : 'toot!';
            bubble(ctx, bx, by, word, t, v.patience > 0.7 ? '#ffb3b3' : C.white);
          }
        }
      }
    }
  }

  function drawPoofs(ctx, s) {
    for (const e of s.effects) {
      const t = (s.time - e.time) / POOF_TIME;
      if (t < 0 || t > 1) continue;
      ctx.save();
      ctx.globalAlpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      // the vehicle spins round and shrinks into the cloud
      if (t < 0.35) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(Math.atan2(e.dy, e.dx) + (t / 0.35) * Math.PI);
        const k = 1 - t / 0.35;
        ctx.scale(k, k);
        drawVehicle(ctx, e.type, { look: e.look, mood: 1, time: 0 });
        ctx.restore();
      }
      const R = Math.min(9, 4 + e.len * 0.25) * (0.5 + t);
      ctx.fillStyle = '#f1ecff';
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.4;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + t;
        ctx.beginPath();
        ctx.arc(e.x + Math.cos(a) * R * 0.7, e.y + Math.sin(a) * R * 0.55, R * 0.45, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(e.x, e.y, R * 0.6, 0, TAU);
      ctx.fill();
      // a grumpy face in the cloud
      const fx = e.x;
      const fy = e.y - t * 2;
      ctx.fillStyle = C.ink;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.5;
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(fx + side * 1.4, fy - 0.3, 0.45, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(fx + side * 2.3, fy - 1.8);
        ctx.lineTo(fx + side * 0.6, fy - 1.1);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(fx, fy + 2, 1.2, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      // a heart floats away
      heartPath(ctx, e.x + R * 0.9, e.y - R * 0.6 - t * 8, 1.8);
      ctx.fillStyle = C.pink;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawWater(ctx, s, time) {
    // ripples drifting down the channel
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 0.45;
    const span = WORLD_H + 80;
    for (let i = 0; i < 16; i++) {
      const x = CHANNEL_X0 + 3 + ((i * 7.3) % (CHANNEL_X1 - CHANNEL_X0 - 6));
      const y = -40 + ((i * 37 + time * (2 + (i % 3))) % span);
      ctx.beginPath();
      ctx.moveTo(x - 2, y);
      ctx.quadraticCurveTo(x, y - 0.8, x + 2, y);
      ctx.stroke();
    }
  }

  function drawHint(ctx, s, time) {
    for (const br of s.bridges) {
      if (!waitingAt(s, br.id).length || !canToggle(s, br.id) || br.state === 'raising' || br.state === 'lowering') continue;
      const x = MID_X - 7;
      const y = br.y - 4;
      const t = (time * 1.4) % 1;
      ctx.strokeStyle = `rgba(255,255,255,${1 - t})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(MID_X, br.y, 3 + t * 9, 0, TAU);
      ctx.stroke();
      // a pointing finger, tapping
      const press = Math.abs(Math.sin(time * Math.PI * 1.4));
      ctx.save();
      ctx.translate(x + 2, y + 3 + press * 1.5);
      ctx.fillStyle = C.white;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.5;
      roundRect(ctx, -1.2, -5, 2.4, 6.5, 1.2);
      ctx.fill();
      ctx.stroke();
      roundRect(ctx, -2.4, 0, 5.6, 5, 1.8);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawRefusals(ctx, s) {
    for (const br of s.bridges) {
      const since = s.time - br.refusedTime;
      if (since > 0.9) continue;
      const pop = since < 0.12 ? since / 0.12 : 1;
      const wob = Math.sin(since * 40) * 0.25 * (1 - since);
      ctx.save();
      ctx.globalAlpha = since > 0.7 ? (0.9 - since) / 0.2 : 1;
      ctx.translate(MID_X, br.y - ROAD_HALF - 4.5);
      ctx.rotate(wob);
      ctx.scale(pop, pop);
      drawLock(ctx, 0, 0, 2.8);
      ctx.restore();
      // ring the vehicle that is in the way
      for (const lane of s.lanes) {
        const v = lane.vehicles.find((u) => u.id === br.refusedBy);
        if (!v) continue;
        const c = vehicleCentre(lane, v);
        ctx.strokeStyle = `rgba(255,225,77,${1 - since})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, (lane.dx ? v.len : v.width) * 0.65 + 1, (lane.dy ? v.len : v.width) * 0.65 + 1, 0, 0, TAU);
        ctx.stroke();
      }
    }
  }

  // The whole world, under the world transform.
  r.drawWorld = function drawWorld(ctx, s, time, taps = []) {
    const { w, h, s: k, ox, oy } = r.view;
    const ys = roadYs(s.level);
    ctx.drawImage(background(ys), 0, 0, w, h);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(k, k);
    drawWater(ctx, s, time);
    drawVehicles(ctx, s, 'water', time);
    for (const br of s.bridges) drawBridge(ctx, s, br, time, s.level);
    drawVehicles(ctx, s, 'road', time);
    drawOverlays(ctx, s, time);
    drawPoofs(ctx, s);
    drawRefusals(ctx, s);
    if (s.level.hints && s.status === 'play') drawHint(ctx, s, time);
    for (const tp of taps) {
      const t = (time - tp.time) / 0.45;
      if (t < 0 || t > 1) continue;
      const p = r.toWorld(tp.x, tp.y);
      ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - t)})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2 + t * 7, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  };

  return r;
}

// ---------- launcher tile ----------

// A little drawbridge going up and down with a car and a boat taking turns.
export function drawTile(ctx, x, y, w, h, time) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const k = w / 60;
  ctx.translate(x, y);
  ctx.scale(k, k);
  const H = h / k;
  ctx.fillStyle = C.grass;
  ctx.fillRect(0, 0, 60, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1d7fb8');
  g.addColorStop(1, C.sea);
  ctx.fillStyle = g;
  ctx.fillRect(18, 0, 24, H);
  ctx.fillStyle = C.stone;
  ctx.fillRect(16.8, 0, 1.2, H);
  ctx.fillRect(42, 0, 1.2, H);
  const ry = H * 0.52;
  ctx.fillStyle = C.walk;
  ctx.fillRect(0, ry - 8, 18, 16);
  ctx.fillRect(42, ry - 8, 18, 16);
  ctx.fillStyle = C.road;
  ctx.fillRect(0, ry - 6.5, 18, 13);
  ctx.fillRect(42, ry - 6.5, 18, 13);
  // cycle: 0-0.4 bridge down (car crosses), 0.4-0.5 opening, 0.5-0.9 up (boat), 0.9-1 closing
  const c = (time / 6) % 1;
  const open = c < 0.4 ? 0 : c < 0.5 ? (c - 0.4) / 0.1 : c < 0.9 ? 1 : 1 - (c - 0.9) / 0.1;
  const boatY = c < 0.45 ? H + 14 : H + 14 - ((c - 0.45) / 0.5) * (H + 30);
  ctx.save();
  ctx.translate(34, boatY);
  ctx.rotate(-Math.PI / 2);
  ctx.scale(0.95, 0.95);
  drawVehicle(ctx, 'boat', { look: 0, time, speedK: 1 });
  ctx.restore();
  const a = MAX_ANGLE * open * open * (3 - 2 * open);
  for (const side of [-1, 1]) {
    const hinge = side < 0 ? 18 : 42;
    const tip = hinge - side * 12 * Math.cos(a);
    const rise = 12 * Math.sin(a) * LIFT;
    ctx.fillStyle = 'rgba(22,11,51,0.28)';
    if (a > 0.02) {
      ctx.beginPath();
      ctx.moveTo(hinge, ry - 6.5);
      ctx.lineTo(tip + rise * 0.6, ry - 6.5 + rise * 0.3);
      ctx.lineTo(tip + rise * 0.6, ry + 6.5 + rise * 0.3);
      ctx.lineTo(hinge, ry + 6.5);
      ctx.fill();
    }
    ctx.fillStyle = a > 0.02 ? '#6a5a92' : C.road;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(hinge, ry - 6.5);
    ctx.lineTo(tip, ry - 6.5 - rise);
    ctx.lineTo(tip, ry + 6.5 - rise);
    ctx.lineTo(hinge, ry + 6.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    for (const yy of [ry - 6.5, ry + 6.5]) {
      ctx.strokeStyle = C.white;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(hinge, yy);
      ctx.lineTo(tip, yy - rise);
      ctx.stroke();
      ctx.strokeStyle = C.red;
      ctx.setLineDash([1.1, 1.1]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  // the car drives across while the bridge is down, and the next one waits on the left
  const carX = c < 0.4 ? 10 + (c / 0.4) * 62 : Math.min(10, -10 + ((c - 0.4) / 0.2) * 20);
  ctx.save();
  ctx.translate(carX, ry + 3);
  drawVehicle(ctx, 'car', { look: 0, time, mood: 0 });
  ctx.restore();
  ctx.restore();
}

export { leafAngle, MID_X };
