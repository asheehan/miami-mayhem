// Swamp Buggy drawing: skies and parallax scenery for the four looks, the terrain (only the
// part on screen), water, mud, log bridges, the bobbing bridge, gators, turtles, crates, beach
// balls, coins and oranges, the finish flag, the buggy itself, and the particles and pop-up
// words. Also the shared button and text helpers and the launcher tile. Reads the run and
// never changes rules; the only state here is cosmetic (camera, particles, cached pictures).
import { groundY, REAR_MOUNT, FRONT_MOUNT, RIGHT_DELAY } from './sim.js';

export const C = {
  ink: '#1d1730',
  white: '#ffffff',
  sun: '#ffe14d',
  pink: '#ff3d9a',
  orange: '#ff8a2a',
  teal: '#19c3d6',
  red: '#ff4b4b',
  green: '#3fe07a',
  coin: '#ffb627',
};

export const font = (px, weight = 900) => `${weight} ${Math.round(px)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ---------- shared helpers ----------

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
  ctx.fillStyle = filled ? C.sun : 'rgba(29,23,48,0.3)';
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, r * 0.16);
  ctx.strokeStyle = filled ? C.ink : 'rgba(255,255,255,0.6)';
  ctx.stroke();
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
  } else if (kind === 'wrench') {
    // a garage: a little house with a big door
    ctx.beginPath();
    ctx.moveTo(cx - s * 1.05, cy - s * 0.2);
    ctx.lineTo(cx, cy - s);
    ctx.lineTo(cx + s * 1.05, cy - s * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx - s * 0.85, cy - s * 0.25, s * 1.7, s * 1.15);
    ctx.fillStyle = 'rgba(29,23,48,0.55)';
    for (let i = 0; i < 3; i++) ctx.fillRect(cx - s * 0.55, cy + s * (0.02 + i * 0.28), s * 1.1, s * 0.18);
  }
  ctx.restore();
}

export function drawButton(ctx, b, fill = C.sun) {
  ctx.fillStyle = 'rgba(29,23,48,0.35)';
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

export function drawIconButton(ctx, b) {
  ctx.fillStyle = 'rgba(29,23,48,0.4)';
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

export function drawCoinIcon(ctx, x, y, r, squash = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(Math.max(0.12, squash), 1);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fillStyle = C.coin;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.16);
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.7, 0, TAU);
  ctx.fillStyle = C.sun;
  ctx.fill();
  ctx.beginPath();
  for (let j = 0; j < 10; j++) {
    const a = -Math.PI / 2 + (j * Math.PI) / 5;
    const rr = j % 2 ? r * 0.22 : r * 0.5;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = '#ff9a1f';
  ctx.fill();
  ctx.restore();
}

export function drawOrange(ctx, x, y, r, bob = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(bob);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fillStyle = '#ff8a1c';
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.14);
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.arc(-r * 0.35, -r * 0.35, r * 0.25, 0, TAU);
  ctx.fill();
  // stalk and leaf
  ctx.fillStyle = '#3aa845';
  ctx.beginPath();
  ctx.ellipse(r * 0.35, -r * 0.95, r * 0.42, r * 0.2, -0.5, 0, TAU);
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.stroke();
  ctx.restore();
}

// ---------- the four looks ----------

export const LOOK = {
  swamp: {
    sky: ['#6ccbff', '#bdeeff', '#eafbff'],
    top: '#79c043', topDark: '#4f8f2a', soil: '#7a5a30', soilDeep: '#4e3519',
    water: 'rgba(70,150,140,0.62)', waterTop: '#9fe3d6', creek: '#3f8f86', bed: '#3c2c18',
    far: '#9cc9b0', mid: '#5d9a78', near: '#3c7a56',
    decor: 'grass',
  },
  mangrove: {
    sky: ['#2f8c74', '#8fd8b8', '#d7f7e6'],
    top: '#5aa83c', topDark: '#3b7a26', soil: '#6a4a2e', soilDeep: '#3f2a18',
    water: 'rgba(60,130,120,0.62)', waterTop: '#a8ead8', creek: '#2f7a70', bed: '#33241a',
    far: '#6fb394', mid: '#2f6b4f', near: '#1f4f39',
    decor: 'roots',
  },
  beach: {
    sky: ['#3fb8ff', '#9ee2ff', '#e2f7ff'],
    top: '#ffe7a6', topDark: '#f2c96a', soil: '#f0c46a', soilDeep: '#d29a45',
    water: 'rgba(40,170,215,0.6)', waterTop: '#c8f4ff', creek: '#2aa6d6', bed: '#caa060',
    far: '#7fd0f0', mid: '#2fb0d8', near: '#3fae5a',
    decor: 'shells',
  },
  causeway: {
    sky: ['#3b1d6e', '#c8407a', '#ffb35c'],
    top: '#5d5672', topDark: '#3f3a52', soil: '#a596c4', soilDeep: '#6a5c8c',
    water: 'rgba(110,70,150,0.6)', waterTop: '#ffc6e0', creek: '#6e4596', bed: '#3a2b52',
    far: '#7c4a8e', mid: '#5a3277', near: '#2c1a45',
    decor: 'road',
  },
};

// ---------- the buggy ----------

// Draws the buggy body (and its wheels and struts) in world units with y up: ctx must already be
// in world space. pose: { x, y, a }, wheels: [{ x, y, spin }], opts: { r, t, gas, face, fanSpin }.
export function drawBuggy(ctx, look, pose, wheels, opts) {
  const { r, t = 0 } = opts;
  const c = Math.cos(pose.a);
  const sn = Math.sin(pose.a);
  const mounts = [REAR_MOUNT, FRONT_MOUNT];
  // struts behind everything
  ctx.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const [lx, ly] = mounts[i];
    const mx = pose.x + lx * c - ly * sn;
    const my = pose.y + lx * sn + ly * c;
    const w = wheels[i];
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.2;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(w.x, w.y);
    ctx.stroke();
    // a coil spring
    const dx = w.x - mx;
    const dy = w.y - my;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    ctx.strokeStyle = look.trim;
    ctx.lineWidth = 0.07;
    ctx.beginPath();
    const coils = 5;
    for (let k = 0; k <= coils * 2; k++) {
      const u = 0.1 + (0.75 * k) / (coils * 2);
      const side = k % 2 ? 0.15 : -0.15;
      ctx.lineTo(mx + dx * u + nx * side, my + dy * u + ny * side);
    }
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.a);
  const ink = 0.07;
  ctx.lineJoin = 'round';

  // fan cage at the back (fan boat)
  if (look.fan) {
    ctx.save();
    ctx.translate(-1.25, 0.95);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, 0.62, 0, TAU);
    ctx.fill();
    ctx.rotate(opts.fanSpin || 0);
    ctx.fillStyle = '#6b4a2a';
    for (let k = 0; k < 2; k++) {
      ctx.rotate(Math.PI);
      ctx.beginPath();
      ctx.ellipse(0, 0.28, 0.1, 0.3, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.06;
    ctx.beginPath();
    ctx.arc(-1.25, 0.95, 0.62, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-1.25, 0.95);
    ctx.lineTo(-1.25, 0.3);
    ctx.stroke();
  }

  // snorkel exhaust
  if (!look.fan) {
    ctx.fillStyle = '#8a8698';
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.05;
    roundRect(ctx, -1.5, 0.3, 0.16, 0.75, 0.06);
    ctx.fill();
    ctx.stroke();
    roundRect(ctx, -1.58, 0.98, 0.32, 0.14, 0.05);
    ctx.fill();
    ctx.stroke();
  }

  // roll cage behind the driver
  ctx.strokeStyle = look.cage;
  ctx.lineWidth = 0.12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-1.0, 0.38);
  ctx.lineTo(-0.78, 1.2);
  ctx.lineTo(0.3, 1.2);
  ctx.lineTo(0.78, 0.4);
  ctx.stroke();

  // the driver
  const bob = Math.sin(t * 9) * 0.015;
  ctx.fillStyle = '#ff9f43';
  roundRect(ctx, -0.5, 0.3, 0.5, 0.42, 0.14);
  ctx.fill();
  ctx.lineWidth = 0.05;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  // arm to the wheel
  ctx.strokeStyle = '#f2c094';
  ctx.lineWidth = 0.11;
  ctx.beginPath();
  ctx.moveTo(-0.15, 0.6);
  ctx.lineTo(0.3, 0.55);
  ctx.stroke();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  ctx.moveTo(0.42, 0.72);
  ctx.lineTo(0.3, 0.38);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0.43, 0.7, 0.13, 0, TAU);
  ctx.stroke();
  // head
  const hx = -0.22;
  const hy = 0.92 + bob;
  ctx.fillStyle = '#f7c79a';
  ctx.beginPath();
  ctx.arc(hx, hy, 0.27, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 0.05;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  // helmet
  ctx.fillStyle = look.helmet;
  ctx.beginPath();
  ctx.arc(hx, hy + 0.02, 0.3, 0.05, Math.PI - 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.white;
  ctx.fillRect(hx - 0.04, hy + 0.12, 0.08, 0.18);
  // goggles and face (y is up here, so the face is drawn upside-down-aware)
  ctx.fillStyle = '#bff3ff';
  ctx.beginPath();
  ctx.ellipse(hx + 0.12, hy + 0.0, 0.1, 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(hx + 0.15, hy, 0.035, 0, TAU);
  ctx.fill();
  const face = opts.face || 'grin';
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.045;
  ctx.beginPath();
  if (face === 'oh') {
    ctx.fillStyle = '#7a2a3a';
    ctx.arc(hx + 0.14, hy - 0.15, 0.06, 0, TAU);
    ctx.fill();
  } else if (face === 'wow') {
    ctx.arc(hx + 0.12, hy - 0.12, 0.09, Math.PI, TAU);
    ctx.closePath();
    ctx.fillStyle = '#7a2a3a';
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.arc(hx + 0.12, hy - 0.06, 0.09, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }

  // the tub
  ctx.beginPath();
  ctx.moveTo(-1.55, 0.42);
  ctx.lineTo(-1.6, -0.12);
  ctx.quadraticCurveTo(-1.55, -0.36, -1.3, -0.36);
  ctx.lineTo(1.1, -0.36);
  ctx.quadraticCurveTo(1.55, -0.32, 1.68, 0.02);
  ctx.quadraticCurveTo(1.66, 0.3, 1.38, 0.36);
  ctx.lineTo(0.62, 0.4);
  ctx.quadraticCurveTo(0.2, 0.18, -0.6, 0.22);
  ctx.quadraticCurveTo(-0.9, 0.24, -1.0, 0.42);
  ctx.closePath();
  ctx.fillStyle = look.body;
  ctx.fill();
  // lower panel
  ctx.save();
  ctx.clip();
  ctx.fillStyle = look.dark;
  ctx.fillRect(-1.7, -0.4, 3.5, 0.26);
  if (look.checks) {
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = i % 2 ? C.ink : C.white;
      ctx.fillRect(-1.55 + i * 0.18, 0.02, 0.18, 0.09);
      ctx.fillStyle = i % 2 ? C.white : C.ink;
      ctx.fillRect(-1.55 + i * 0.18, -0.07, 0.18, 0.09);
    }
  }
  if (look.flames) {
    ctx.fillStyle = '#ff8a2a';
    ctx.beginPath();
    ctx.moveTo(-0.2, -0.14);
    for (let i = 0; i < 4; i++) {
      ctx.quadraticCurveTo(0.1 + i * 0.35, 0.25, 0.25 + i * 0.35, 0.02);
    }
    ctx.lineTo(1.6, -0.14);
    ctx.closePath();
    ctx.fill();
  }
  if (look.gold) {
    ctx.fillStyle = look.trim;
    for (const [sx, sy, sr] of [[-1.1, 0.12, 0.08], [-0.5, 0.0, 0.06], [0.4, 0.05, 0.09], [1.1, 0.1, 0.07]]) {
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, TAU);
      ctx.fill();
    }
  }
  // shine
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillRect(-1.6, 0.28, 3.3, 0.06);
  ctx.restore();
  ctx.lineWidth = ink;
  ctx.strokeStyle = C.ink;
  ctx.stroke();

  // big round headlight
  ctx.fillStyle = '#fff6c8';
  ctx.beginPath();
  ctx.arc(1.42, 0.1, 0.17, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 0.05;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(1.47, 0.15, 0.06, 0, TAU);
  ctx.fill();
  // bumper
  ctx.fillStyle = look.trim;
  roundRect(ctx, 1.45, -0.34, 0.34, 0.14, 0.06);
  ctx.fill();
  ctx.stroke();
  roundRect(ctx, -1.78, -0.3, 0.3, 0.14, 0.06);
  ctx.fill();
  ctx.stroke();
  // a little flag on a whip at the back
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  ctx.moveTo(-0.9, 0.4);
  ctx.quadraticCurveTo(-1.05, 1.2, -1.1, 1.75);
  ctx.stroke();
  ctx.fillStyle = look.trim === '#2b2633' ? C.pink : look.trim;
  const wave = Math.sin(t * 10) * 0.06;
  ctx.beginPath();
  ctx.moveTo(-1.1, 1.75);
  ctx.lineTo(-1.55, 1.62 + wave);
  ctx.lineTo(-1.1, 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 0.03;
  ctx.stroke();
  // taxi roof light
  if (look.checks) {
    ctx.fillStyle = '#fff1a0';
    roundRect(ctx, -0.5, 1.2, 0.6, 0.24, 0.06);
    ctx.fill();
    ctx.lineWidth = 0.04;
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.fillRect(-0.36, 1.27, 0.32, 0.08);
  }
  ctx.restore();

  // wheels on top
  for (let i = 0; i < 2; i++) drawWheel(ctx, wheels[i].x, wheels[i].y, r, wheels[i].spin, look.hub);
}

export function drawWheel(ctx, x, y, r, spin, hub) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-spin);
  ctx.fillStyle = '#2b2633';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  // tread blocks
  ctx.fillStyle = '#4a4458';
  for (let k = 0; k < 10; k++) {
    ctx.save();
    ctx.rotate((k * TAU) / 10);
    ctx.fillRect(r * 0.72, -r * 0.13, r * 0.24, r * 0.26);
    ctx.restore();
  }
  ctx.lineWidth = Math.max(0.05, r * 0.07);
  ctx.strokeStyle = C.ink;
  ctx.beginPath();
  ctx.arc(0, 0, r - ctx.lineWidth / 2, 0, TAU);
  ctx.stroke();
  // rim
  ctx.fillStyle = hub;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.5, 0, TAU);
  ctx.fill();
  ctx.lineWidth = r * 0.06;
  ctx.stroke();
  ctx.fillStyle = C.ink;
  for (let k = 0; k < 5; k++) {
    const a = (k * TAU) / 5;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, r * 0.06, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.12, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ---------- critters and loose things (world space, y up) ----------

function drawGator(ctx, x, y, t, snap) {
  const open = snap > 0 ? Math.sin(Math.min(1, snap) * Math.PI) : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 0.06;
  ctx.strokeStyle = C.ink;
  // tail curling off to the left
  ctx.fillStyle = '#3f9a45';
  ctx.beginPath();
  ctx.moveTo(-1.3, 0.05);
  ctx.quadraticCurveTo(-2.1, 0.05 + Math.sin(t * 2) * 0.06, -2.4, 0.22);
  ctx.quadraticCurveTo(-2.0, 0.24, -1.3, 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // body = the hump the wheels roll over
  ctx.beginPath();
  ctx.moveTo(-1.45, 0);
  for (let i = 0; i <= 16; i++) {
    const u = i / 16;
    ctx.lineTo(-1.4 + 2.8 * u, 0.45 * Math.sin(Math.PI * u) ** 0.8 + 0.02);
  }
  ctx.lineTo(1.45, 0);
  ctx.closePath();
  ctx.fillStyle = '#4caf50';
  ctx.fill();
  ctx.stroke();
  // belly and back bumps
  ctx.fillStyle = '#d8e89a';
  ctx.fillRect(-1.2, 0, 2.4, 0.08);
  ctx.fillStyle = '#2f7d36';
  for (let i = 1; i < 7; i++) {
    const u = i / 7;
    const bx = -1.4 + 2.8 * u;
    const by = 0.45 * Math.sin(Math.PI * u) ** 0.8;
    ctx.beginPath();
    ctx.arc(bx, by - 0.02, 0.08, 0, Math.PI);
    ctx.fill();
  }
  // head and snout to the right
  ctx.save();
  ctx.translate(1.35, 0.12);
  ctx.fillStyle = '#4caf50';
  ctx.beginPath();
  ctx.moveTo(0, -0.12);
  ctx.lineTo(1.0, -0.12);
  ctx.quadraticCurveTo(1.15, -0.05, 1.0, 0.02);
  ctx.lineTo(0, 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.rotate(open * 0.5);
  ctx.beginPath();
  ctx.moveTo(0, 0.02);
  ctx.lineTo(1.0, 0.04);
  ctx.quadraticCurveTo(1.15, 0.12, 0.95, 0.2);
  ctx.quadraticCurveTo(0.4, 0.28, 0, 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // teeth (friendly little ones)
  ctx.fillStyle = C.white;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(0.3 + i * 0.18, 0.04);
    ctx.lineTo(0.37 + i * 0.18, -0.03);
    ctx.lineTo(0.44 + i * 0.18, 0.04);
    ctx.fill();
  }
  // eye bump and a happy eye
  ctx.fillStyle = '#4caf50';
  ctx.beginPath();
  ctx.arc(0.18, 0.3, 0.14, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.arc(0.2, 0.33, 0.08 + open * 0.03, 0, TAU);
  ctx.fill();
  ctx.fillStyle = C.ink;
  const blink = Math.sin(t * 1.3 + x) > 0.97;
  if (blink && !open) ctx.fillRect(0.12, 0.32, 0.16, 0.025);
  else {
    ctx.beginPath();
    ctx.arc(0.23, 0.33, 0.04, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
  // little legs
  ctx.fillStyle = '#3f9a45';
  for (const lx of [-0.9, 0.8]) {
    ctx.beginPath();
    ctx.ellipse(lx, 0.02, 0.18, 0.08, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawTurtle(ctx, x, y, t, hide) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 0.05;
  ctx.strokeStyle = C.ink;
  const peek = hide ? 0 : 1;
  // head
  if (peek) {
    ctx.fillStyle = '#8bd06a';
    ctx.beginPath();
    ctx.arc(0.72, 0.16 + Math.sin(t * 3 + x) * 0.02, 0.14, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(0.77, 0.2, 0.03, 0, TAU);
    ctx.fill();
  }
  // shell
  ctx.beginPath();
  ctx.moveTo(-0.62, 0);
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    ctx.lineTo(-0.6 + 1.2 * u, 0.32 * Math.sin(Math.PI * u) + 0.03);
  }
  ctx.lineTo(0.62, 0);
  ctx.closePath();
  ctx.fillStyle = '#c9843a';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#8a5524';
  for (const [sx, sy] of [[-0.25, 0.14], [0.1, 0.18], [0.38, 0.1]]) {
    ctx.beginPath();
    ctx.ellipse(sx, sy, 0.11, 0.07, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawCrate(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.a);
  const r = p.r;
  ctx.fillStyle = '#c98a45';
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.strokeStyle = '#7a4a1c';
  ctx.lineWidth = 0.08;
  ctx.strokeRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
  ctx.beginPath();
  ctx.moveTo(-r * 0.8, -r * 0.8);
  ctx.lineTo(r * 0.8, r * 0.8);
  ctx.stroke();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.06;
  ctx.strokeRect(-r, -r, r * 2, r * 2);
  ctx.restore();
}

function drawBall(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.a);
  const cols = ['#ff4b4b', '#ffffff', '#3a7bff', '#ffffff', '#ffd23f', '#ffffff'];
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, p.r, (i * TAU) / 6, ((i + 1) * TAU) / 6);
    ctx.closePath();
    ctx.fillStyle = cols[i];
    ctx.fill();
  }
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.arc(0, 0, p.r * 0.2, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 0.05;
  ctx.strokeStyle = C.ink;
  ctx.beginPath();
  ctx.arc(0, 0, p.r, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

// ---------- the renderer ----------

const VIEW_NARROW = 16; // metres across a phone-width screen
const VIEW_WIDE = 20; // and across a tablet
export const BUGGY_X = 0.34; // where across the screen the buggy rides
export const BUGGY_Y = 0.62; // and how far down

export function createRenderer() {
  const r = {
    w: 1, h: 1, dpr: 1,
    cam: { x: 0, y: 0, k: 30, zoom: 1, ready: false },
    particles: [],
    popups: [],
    skyKey: '',
    sky: null,
    stats: { frames: 0, ms: 0 },
    lastLook: null,
  };

  r.resize = (w, h, dpr) => {
    r.w = w;
    r.h = h;
    r.dpr = dpr;
    r.skyKey = '';
  };

  r.baseK = () => r.w / (r.w < 600 ? VIEW_NARROW : VIEW_WIDE);

  // world -> screen
  r.toScreen = (x, y) => ({ x: (x - r.cam.x) * r.cam.k + r.w / 2, y: (r.cam.y - y) * r.cam.k + r.h / 2 });

  r.reset = (s) => {
    r.cam.ready = false;
    r.particles.length = 0;
    r.popups.length = 0;
    r.follow(s, 1);
  };

  // Camera: the buggy sits left of centre and low; it looks ahead with speed and zooms out a
  // little at speed and in the air.
  r.follow = (s, dt) => {
    const b = s.buggy;
    const sp = Math.hypot(b.vx, b.vy);
    const air = s.airborne || s.righting ? Math.min(1, s.hangT * 1.5) : 0;
    const zoomT = 1 / (1 + 0.22 * clamp(sp / 14, 0, 1.3) + 0.15 * air);
    const cam = r.cam;
    const ease = (rate) => (cam.ready ? 1 - Math.exp(-rate * dt) : 1);
    cam.zoom += (zoomT - cam.zoom) * ease(1.6);
    cam.k = r.baseK() * cam.zoom;
    const look = clamp(b.vx * 0.25, -1.5, 4);
    const tx = b.x + (0.5 - BUGGY_X) * (r.w / cam.k) + look;
    const ty = b.y + ((r.anchorY ?? BUGGY_Y) - 0.5) * (r.h / cam.k) - 0.6;
    cam.x += (tx - cam.x) * ease(5);
    cam.y += (ty - cam.y) * ease(s.airborne ? 2.5 : 5);
    // keep the buggy well on screen whatever the easing is doing
    const sy = (cam.y - b.y) * cam.k + r.h / 2;
    const top = r.h * 0.22;
    const bot = r.h * 0.8;
    if (sy < top) cam.y += (top - sy) / cam.k;
    if (sy > bot) cam.y -= (sy - bot) / cam.k;
    const sx = (b.x - cam.x) * cam.k + r.w / 2;
    if (sx < r.w * 0.15) cam.x -= (r.w * 0.15 - sx) / cam.k;
    if (sx > r.w * 0.7) cam.x += (sx - r.w * 0.7) / cam.k;
    cam.ready = true;
  };

  // ---------- particles ----------

  function burst(n, x, y, colour, spread, up, size, life) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const sp = Math.random() * spread;
      r.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.abs(Math.sin(a)) * sp * 0.6 + up * (0.5 + Math.random() * 0.5),
        life, t: 0, size: size * (0.6 + Math.random() * 0.6), colour, g: 12,
      });
    }
  }

  function popup(text, colour, big = 1) {
    r.popups.push({ text, colour, t: 0, big });
  }

  r.feed = (s, events) => {
    const lk = LOOK[s.level.look];
    for (const e of events) {
      if (e.type === 'coin') {
        burst(7, e.x, e.y, e.kind === 'orange' ? '#ff8a1c' : C.sun, 3, 2, 0.14, 0.5);
        r.particles.push({ x: e.x, y: e.y, vx: 0, vy: 2.5, life: 0.7, t: 0, text: '+1', g: 0 });
      } else if (e.type === 'land') {
        burst(Math.min(14, 4 + e.speed), e.x, e.y + 0.1, lk.decor === 'road' ? '#d9cfe8' : lk.soil, 2.5, 1.5, 0.18, 0.6);
      } else if (e.type === 'thud') {
        burst(8, e.x, e.y, lk.soil, 2, 1.5, 0.16, 0.5);
      } else if (e.type === 'splash') {
        burst(18, e.x, e.y, '#d6f6ff', 3.5, 4 + e.speed * 0.25, 0.13, 0.8);
      } else if (e.type === 'flip') {
        const words = ['FLIP!', 'DOUBLE FLIP!', 'TRIPLE FLIP!'];
        popup(words[Math.min(2, e.count - 1)] || 'MEGA FLIP!', C.pink, 1.2);
      } else if (e.type === 'bigair') {
        popup('BIG AIR!', C.teal, 1);
      } else if (e.type === 'boing') {
        burst(10, e.x, e.y + 0.5, C.sun, 3, 3, 0.16, 0.6);
        if (!e.hop) popup('BOING!', C.sun, 0.8);
      } else if (e.type === 'chomp') {
        r.particles.push({ x: e.x + 1, y: e.y + 1.2, vx: 0, vy: 1.5, life: 0.8, t: 0, text: 'boing!', g: 0 });
      } else if (e.type === 'bonk') {
        burst(5, e.x, e.y, e.kind === 'ball' ? C.white : '#c98a45', 2.5, 2, 0.12, 0.4);
      }
    }
  };

  // dust, mud and exhaust while driving
  function trail(s, dt) {
    const lk = LOOK[s.level.look];
    for (const w of s.wheels) {
      const sp = Math.abs(w.spinV) * s.spec.wheelR;
      if (!w.grounded || sp < 3) continue;
      const chance = dt * (w.mud ? 30 : w.wet ? 26 : 6) * Math.min(1, sp / 10);
      if (Math.random() < chance) {
        const colour = w.mud ? '#5a3a1c' : w.wet ? '#d6f6ff' : lk.decor === 'road' ? 'rgba(220,210,235,0.8)' : lk.soil;
        r.particles.push({
          x: w.x - s.spec.wheelR * 0.6, y: w.y - s.spec.wheelR * 0.7, vx: -1.5 - Math.random() * 2, vy: 1 + Math.random() * 2.5,
          life: 0.5, t: 0, size: w.mud ? 0.16 : 0.12, colour, g: 9,
        });
      }
    }
    if (s.input === 'gas' && !s.righting && Math.random() < dt * 12) {
      const b = s.buggy;
      const c = Math.cos(b.a);
      const sn = Math.sin(b.a);
      if (!s.spec.look.fan) {
        r.particles.push({
          x: b.x + -1.42 * c - 1.1 * sn, y: b.y + -1.42 * sn + 1.1 * c, vx: -1 + b.vx * 0.3, vy: 1.2,
          life: 0.7, t: 0, size: 0.16, colour: 'rgba(240,240,250,0.8)', g: -1, grow: true,
        });
      }
    }
  }

  function stepParticles(dt) {
    let j = 0;
    for (const p of r.particles) {
      p.t += dt;
      if (p.t >= p.life) continue;
      p.vy -= (p.g || 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      r.particles[j++] = p;
    }
    r.particles.length = Math.min(j, 220);
    j = 0;
    for (const p of r.popups) {
      p.t += dt;
      if (p.t < 1.3) r.popups[j++] = p;
    }
    r.popups.length = j;
  }

  // ---------- sky and scenery ----------

  function skyCanvas(look) {
    const key = `${look}|${r.w}x${r.h}@${r.dpr}`;
    if (key === r.skyKey) return r.sky;
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(r.w * r.dpr));
    cv.height = Math.max(1, Math.round(r.h * r.dpr));
    const c = cv.getContext('2d');
    c.scale(r.dpr, r.dpr);
    const lk = LOOK[look];
    const g = c.createLinearGradient(0, 0, 0, r.h);
    g.addColorStop(0, lk.sky[0]);
    g.addColorStop(0.55, lk.sky[1]);
    g.addColorStop(1, lk.sky[2]);
    c.fillStyle = g;
    c.fillRect(0, 0, r.w, r.h);
    r.skyKey = key;
    r.sky = cv;
    return cv;
  }

  // Scenery layers scroll at a fraction `f` of the camera; things are placed every `gap` px.
  function layer(ctx, f, gap, each) {
    const k = r.cam.k;
    const scroll = r.cam.x * k * f;
    const i0 = Math.floor((scroll - gap) / gap);
    const i1 = Math.ceil((scroll + r.w + gap) / gap);
    for (let i = i0; i <= i1; i++) each(i * gap - scroll, i);
  }

  // where a far layer's "ground line" sits on screen: drifts with the camera a little
  const horizon = (f, base) => clamp(base + (r.cam.y * r.cam.k * f * 0.25), r.h * 0.15, r.h * 0.95);

  function cloud(ctx, x, y, s) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(x + s, y);
    ctx.arc(x, y, s, 0, TAU);
    ctx.moveTo(x + s * 0.9 + s * 0.75, y + s * 0.2);
    ctx.arc(x + s * 0.9, y + s * 0.2, s * 0.75, 0, TAU);
    ctx.moveTo(x - s * 0.9 + s * 0.7, y + s * 0.25);
    ctx.arc(x - s * 0.9, y + s * 0.25, s * 0.7, 0, TAU);
    ctx.moveTo(x + s * 0.2 + s * 0.7, y - s * 0.4);
    ctx.arc(x + s * 0.2, y - s * 0.4, s * 0.7, 0, TAU);
    ctx.fill();
  }

  function bird(ctx, x, y, s, flap, colour) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = Math.max(1.5, s * 0.18);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - s, y - flap * s * 0.5);
    ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.3, x, y);
    ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.3, x + s, y - flap * s * 0.5);
    ctx.stroke();
  }

  // a heron: long legs trailing, neck tucked, slow wing beats
  function heron(ctx, x, y, s, t) {
    const flap = Math.sin(t * 3);
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#f4f4f8';
    ctx.fillStyle = '#f4f4f8';
    ctx.lineCap = 'round';
    ctx.lineWidth = s * 0.12;
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, 0);
    ctx.lineTo(-s * 1.5, s * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0 + s * 0.6, 0);
    ctx.ellipse(0, 0, s * 0.6, s * 0.2, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.7 + s * 0.15, -s * 0.12);
    ctx.arc(s * 0.7, -s * 0.12, s * 0.15, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#ffb627';
    ctx.lineWidth = s * 0.07;
    ctx.beginPath();
    ctx.moveTo(s * 0.8, -s * 0.12);
    ctx.lineTo(s * 1.15, -s * 0.05);
    ctx.stroke();
    ctx.fillStyle = '#e4e4ee';
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, 0);
    ctx.quadraticCurveTo(0, -s * (0.2 + flap * 0.9), s * 0.3, 0);
    ctx.fill();
    ctx.restore();
  }

  function cypress(ctx, x, gy, hgt, colour, moss) {
    ctx.fillStyle = colour;
    // flared trunk
    ctx.beginPath();
    ctx.moveTo(x - hgt * 0.09, gy);
    ctx.quadraticCurveTo(x - hgt * 0.03, gy - hgt * 0.25, x - hgt * 0.025, gy - hgt * 0.7);
    ctx.lineTo(x + hgt * 0.025, gy - hgt * 0.7);
    ctx.quadraticCurveTo(x + hgt * 0.03, gy - hgt * 0.25, x + hgt * 0.09, gy);
    ctx.fill();
    // flat-topped crown
    ctx.beginPath();
    ctx.moveTo(x + hgt * 0.22, gy - hgt * 0.78);
    ctx.ellipse(x, gy - hgt * 0.78, hgt * 0.22, hgt * 0.1, 0, 0, TAU);
    ctx.moveTo(x - hgt * 0.12 + hgt * 0.16, gy - hgt * 0.68);
    ctx.ellipse(x - hgt * 0.12, gy - hgt * 0.68, hgt * 0.16, hgt * 0.08, 0, 0, TAU);
    ctx.moveTo(x + hgt * 0.13 + hgt * 0.15, gy - hgt * 0.7);
    ctx.ellipse(x + hgt * 0.13, gy - hgt * 0.7, hgt * 0.15, hgt * 0.07, 0, 0, TAU);
    ctx.fill();
    if (moss) {
      ctx.strokeStyle = moss;
      ctx.lineWidth = Math.max(1, hgt * 0.015);
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(x + k * hgt * 0.07, gy - hgt * 0.68);
        ctx.lineTo(x + k * hgt * 0.07 + hgt * 0.01, gy - hgt * (0.55 - Math.abs(k) * 0.03));
        ctx.stroke();
      }
    }
  }

  function palm(ctx, x, gy, hgt, colour, t) {
    ctx.strokeStyle = colour;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2, hgt * 0.05);
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.quadraticCurveTo(x + hgt * 0.15, gy - hgt * 0.5, x + hgt * 0.08, gy - hgt);
    ctx.stroke();
    ctx.lineWidth = Math.max(2, hgt * 0.06);
    const tx = x + hgt * 0.08;
    const ty = gy - hgt;
    for (const a of [-2.8, -2.2, -1.6, -1.0, -0.35]) {
      const sway = Math.sin(t * 1.3 + x) * 0.05;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(tx + Math.cos(a + sway) * hgt * 0.3, ty + Math.sin(a + sway) * hgt * 0.25 - hgt * 0.05,
        tx + Math.cos(a + sway) * hgt * 0.45, ty + Math.sin(a + sway) * hgt * 0.2 + hgt * 0.12);
      ctx.stroke();
    }
  }

  function mangroveTree(ctx, x, gy, hgt, colour) {
    ctx.strokeStyle = colour;
    ctx.fillStyle = colour;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.5, hgt * 0.035);
    // arching prop roots
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(x, gy - hgt * 0.35);
      ctx.quadraticCurveTo(x + k * hgt * 0.12, gy - hgt * 0.32, x + k * hgt * 0.16, gy);
      ctx.stroke();
    }
    ctx.lineWidth = Math.max(2, hgt * 0.06);
    ctx.beginPath();
    ctx.moveTo(x, gy - hgt * 0.33);
    ctx.lineTo(x + hgt * 0.02, gy - hgt * 0.75);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + hgt * 0.22, gy - hgt * 0.82);
    ctx.arc(x, gy - hgt * 0.82, hgt * 0.22, 0, TAU);
    ctx.moveTo(x - hgt * 0.2 + hgt * 0.16, gy - hgt * 0.72);
    ctx.arc(x - hgt * 0.2, gy - hgt * 0.72, hgt * 0.16, 0, TAU);
    ctx.moveTo(x + hgt * 0.2 + hgt * 0.17, gy - hgt * 0.74);
    ctx.arc(x + hgt * 0.2, gy - hgt * 0.74, hgt * 0.17, 0, TAU);
    ctx.fill();
  }

  function scenery(ctx, look, time) {
    const { w, h } = r;
    const lk = LOOK[look];
    const k = r.cam.k;
    if (look === 'causeway') {
      // big low sun with stripes, and its shimmer on the sea
      const sx = w * 0.7;
      const sy = horizon(0.04, h * 0.42);
      ctx.fillStyle = '#ffe27a';
      ctx.beginPath();
      ctx.arc(sx, sy, Math.min(w, h) * 0.16, Math.PI, 0);
      ctx.fill();
    } else if (look !== 'mangrove') {
      ctx.fillStyle = 'rgba(255,250,210,0.95)';
      ctx.beginPath();
      ctx.arc(w * 0.8, h * 0.12, Math.min(w, h) * 0.07, 0, TAU);
      ctx.fill();
    }
    // clouds
    layer(ctx, 0.04, w * 0.55, (x, i) => {
      if (look === 'mangrove') return;
      const y = h * (0.08 + hash(i) * 0.22);
      cloud(ctx, x + hash(i + 9) * w * 0.3, y, Math.min(w, h) * (0.035 + hash(i + 3) * 0.03));
    });

    // far layer
    const hzFar = horizon(0.15, h * 0.5);
    if (look === 'beach' || look === 'causeway') {
      // the sea
      ctx.fillStyle = look === 'beach' ? '#36b7e0' : '#8a4c96';
      ctx.fillRect(0, hzFar, w, h - hzFar);
      ctx.fillStyle = look === 'beach' ? 'rgba(255,255,255,0.5)' : 'rgba(255,210,140,0.45)';
      layer(ctx, 0.15, 90, (x, i) => {
        const y = hzFar + 8 + hash(i) * (h - hzFar) * 0.5;
        ctx.fillRect(x + Math.sin(time + i) * 6, y, 24 + hash(i + 2) * 30, 3);
      });
    }
    layer(ctx, 0.15, Math.max(60, k * 3.2), (x, i) => {
      const hh = k * (3 + hash(i) * 2.5);
      if (look === 'swamp') cypress(ctx, x, hzFar + 4, hh * 1.3, lk.far, null);
      else if (look === 'mangrove') mangroveTree(ctx, x, hzFar + 4, hh * 1.2, lk.far);
      else if (look === 'beach') {
        if (hash(i + 5) < 0.12) {
          // a red and white lighthouse
          const lw = k * 0.9;
          const lh = k * 5;
          for (let s2 = 0; s2 < 5; s2++) {
            ctx.fillStyle = s2 % 2 ? '#ffffff' : '#ff5a5a';
            ctx.fillRect(x - lw / 2, hzFar - (s2 + 1) * lh / 5, lw, lh / 5 + 1);
          }
          ctx.fillStyle = '#ffe27a';
          ctx.fillRect(x - lw * 0.4, hzFar - lh - lw * 0.6, lw * 0.8, lw * 0.6);
        } else if (hash(i + 7) < 0.5) palm(ctx, x, hzFar + 2, hh * 0.8, lk.near, time);
      } else if (look === 'causeway') {
        // a long bridge on piers across the bay
        ctx.fillStyle = lk.far;
        ctx.fillRect(x - 3, hzFar - k * 1.6, 6, k * 1.6);
      }
    });
    if (look === 'causeway') {
      ctx.fillStyle = lk.far;
      ctx.fillRect(0, hzFar - k * 1.8, w, k * 0.3);
      // a far skyline
      layer(ctx, 0.06, 26, (x, i) => {
        const bh = k * (1 + hash(i) * 3.5);
        ctx.fillStyle = 'rgba(70,30,100,0.55)';
        ctx.fillRect(x, hzFar - k * 1.8 - bh, 22, bh);
      });
    }
    if (look === 'swamp' || look === 'mangrove') {
      ctx.fillStyle = lk.far;
      ctx.fillRect(0, hzFar, w, h - hzFar);
    }

    // birds
    layer(ctx, 0.25, w * 0.9, (x, i) => {
      const y = h * (0.12 + hash(i + 1) * 0.2) + Math.sin(time * 0.8 + i) * 6;
      const bx = x + ((time * 18 + hash(i) * 300) % (w * 0.9));
      if (look === 'swamp') heron(ctx, bx, y, Math.max(10, k * 0.45), time + i);
      else if (look === 'beach') bird(ctx, bx, y, Math.max(6, k * 0.25), Math.sin(time * 6 + i), '#ffffff');
      else if (look === 'causeway') bird(ctx, bx, y, Math.max(6, k * 0.25), Math.sin(time * 6 + i), '#3a1f55');
    });

    // mid layer
    const hzMid = horizon(0.4, h * 0.6);
    layer(ctx, 0.4, Math.max(80, k * 4.5), (x, i) => {
      if (hash(i + 21) < 0.35) return;
      const hh = k * (4 + hash(i + 4) * 3);
      if (look === 'swamp') cypress(ctx, x, hzMid + 10, hh * 1.4, lk.mid, 'rgba(200,215,190,0.8)');
      else if (look === 'mangrove') mangroveTree(ctx, x, hzMid + 10, hh * 1.3, lk.mid);
      else if (look === 'beach') palm(ctx, x, hzMid + 10, hh, '#7a5a30', time);
      else if (look === 'causeway') palm(ctx, x, hzMid + 10, hh, lk.near, time);
    });
    if (look === 'swamp' || look === 'mangrove') {
      ctx.fillStyle = lk.mid;
      ctx.fillRect(0, hzMid + 8, w, h - hzMid);
    } else if (look === 'beach') {
      ctx.fillStyle = '#f7dc95';
      ctx.fillRect(0, hzMid + 8, w, h - hzMid);
    } else {
      ctx.fillStyle = lk.mid;
      ctx.fillRect(0, hzMid + 8, w, h - hzMid);
    }

    // the mangrove tunnel: a leafy canopy hanging over the top, with dangling roots
    if (look === 'mangrove') {
      layer(ctx, 0.7, Math.max(50, k * 2.2), (x, i) => {
        const rr = k * (1.4 + hash(i) * 1.2);
        ctx.fillStyle = hash(i + 3) < 0.5 ? '#1f5a3c' : '#24683f';
        ctx.beginPath();
        ctx.arc(x, -rr * 0.2 + hash(i + 8) * k * 0.6, rr, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#4a3622';
        ctx.lineWidth = Math.max(1.5, k * 0.06);
        const len = k * (1 + hash(i + 2) * 2.5);
        ctx.beginPath();
        ctx.moveTo(x + rr * 0.3, rr * 0.5);
        ctx.quadraticCurveTo(x + rr * 0.3 + Math.sin(time + i) * 4, rr * 0.5 + len * 0.5, x + rr * 0.25, rr * 0.5 + len);
        ctx.stroke();
      });
    }
  }

  // ---------- terrain ----------

  function visibleRange() {
    const half = r.w / 2 / r.cam.k;
    return [r.cam.x - half - 2, r.cam.x + half + 2];
  }

  function terrain(ctx, s, x0, x1) {
    const { track } = s;
    const lk = LOOK[s.level.look];
    const t = s.time;
    const { xs } = track;
    // first index at or before x0, last at or after x1
    let i0 = 0;
    let lo = 0;
    let hi = track.n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid] <= x0) lo = mid;
      else hi = mid;
    }
    i0 = lo;
    ctx.beginPath();
    ctx.moveTo(x0, groundY(track, x0, t));
    let i = i0 + 1;
    for (; i < track.n && xs[i] < x1; i++) ctx.lineTo(xs[i], groundY(track, xs[i], t));
    ctx.lineTo(x1, groundY(track, x1, t));
    const bottom = r.cam.y - r.h / 2 / r.cam.k - 2;
    const surface = new Path2D();
    // keep a copy of the surface for the grass stroke
    surface.moveTo(x0, groundY(track, x0, t));
    for (let j = i0 + 1; j < i; j++) surface.lineTo(xs[j], groundY(track, xs[j], t));
    surface.lineTo(x1, groundY(track, x1, t));
    ctx.lineTo(x1, bottom);
    ctx.lineTo(x0, bottom);
    ctx.closePath();
    const top = r.cam.y + r.h / 2 / r.cam.k;
    const g = ctx.createLinearGradient(0, top - (r.h / r.cam.k) * 0.4, 0, bottom);
    g.addColorStop(0, lk.soil);
    g.addColorStop(1, lk.soilDeep);
    ctx.fillStyle = g;
    ctx.fill();
    // pebbles / roots in the soil
    for (let xx = Math.floor(x0 / 3) * 3; xx < x1; xx += 3) {
      const hv = hash(xx * 0.37);
      const gy = groundY(track, xx + 1, t);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.ellipse(xx + 1, gy - 0.9 - hv * 2.5, 0.25 + hv * 0.3, 0.14, 0, 0, TAU);
      ctx.fill();
    }
    // creeks under log bridges and the bobbing bridges
    for (const span of [...s.level.logs, ...s.level.bridges]) {
      if (span.x1 < x0 || span.x0 > x1) continue;
      const bob = span.amp ? 0 : 0.35;
      const top = (span.amp ? groundY(track, span.x0, t) : span.y) - bob;
      ctx.fillStyle = lk.creek;
      ctx.fillRect(span.x0, span.bed, span.x1 - span.x0, top - span.bed);
      ctx.fillStyle = lk.bed;
      ctx.fillRect(span.x0, span.bed - 0.5, span.x1 - span.x0, 0.55);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let xx = span.x0 + 0.5; xx < span.x1 - 0.5; xx += 1.6) {
        ctx.fillRect(xx + Math.sin(s.time * 2 + xx) * 0.2, span.bed + 0.8 + (xx % 0.5), 0.8, 0.06);
      }
    }
    // the grassy (or sandy, or tarmac) top
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = lk.topDark;
    ctx.lineWidth = 0.55;
    ctx.stroke(surface);
    ctx.strokeStyle = lk.top;
    ctx.lineWidth = 0.38;
    ctx.stroke(surface);
    // mud
    for (const m of track.mud) {
      if (m.x1 < x0 || m.x0 > x1) continue;
      ctx.strokeStyle = '#5a3a1c';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let xx = m.x0; xx <= m.x1; xx += 0.5) ctx.lineTo(xx, groundY(track, xx, t) + 0.02);
      ctx.stroke();
      ctx.fillStyle = '#7a5230';
      for (let xx = m.x0 + 0.4; xx < m.x1; xx += 1.1) {
        ctx.beginPath();
        ctx.arc(xx, groundY(track, xx, t) + 0.18, 0.12 + 0.05 * Math.sin(s.time * 3 + xx), 0, TAU);
        ctx.fill();
      }
    }
    decor(ctx, s, x0, x1, lk);
    // log bridges: a row of log ends with posts
    for (const lg of s.level.logs) {
      if (lg.x1 < x0 || lg.x0 > x1) continue;
      ctx.fillStyle = '#6b4a2a';
      for (const px of [lg.x0 + 0.3, (lg.x0 + lg.x1) / 2, lg.x1 - 0.3]) ctx.fillRect(px - 0.15, lg.bed, 0.3, lg.y - lg.bed);
      for (let xx = lg.x0 + 0.22; xx < lg.x1; xx += 0.44) {
        ctx.fillStyle = '#9a6a3a';
        ctx.beginPath();
        ctx.arc(xx, lg.y - 0.22, 0.22, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 0.04;
        ctx.stroke();
        ctx.strokeStyle = '#d9a86a';
        ctx.lineWidth = 0.03;
        ctx.beginPath();
        ctx.arc(xx, lg.y - 0.22, 0.11, 0, TAU);
        ctx.stroke();
      }
    }
    // bobbing bridges: planks on ropes between two posts
    for (const br of s.level.bridges) {
      if (br.x1 < x0 || br.x0 > x1) continue;
      const y0 = groundY(track, br.x0 - 0.01, t);
      ctx.strokeStyle = '#6b4a2a';
      ctx.lineWidth = 0.25;
      for (const px of [br.x0, br.x1]) {
        ctx.beginPath();
        ctx.moveTo(px, br.bed);
        ctx.lineTo(px, y0 + 1.6);
        ctx.stroke();
      }
      ctx.strokeStyle = '#e8d2a0';
      ctx.lineWidth = 0.06;
      ctx.beginPath();
      ctx.moveTo(br.x0, y0 + 1.5);
      for (let xx = br.x0; xx <= br.x1; xx += 0.5) ctx.lineTo(xx, groundY(track, xx, t) + 0.9 + 0.6 * Math.abs((xx - (br.x0 + br.x1) / 2) / (br.x1 - br.x0)));
      ctx.lineTo(br.x1, y0 + 1.5);
      ctx.stroke();
      for (let xx = br.x0 + 0.25; xx < br.x1; xx += 0.5) {
        const yy = groundY(track, xx, t);
        ctx.fillStyle = hash(xx) < 0.5 ? '#b07a42' : '#c18a4e';
        ctx.fillRect(xx - 0.22, yy - 0.3, 0.44, 0.3);
        ctx.strokeStyle = 'rgba(232,210,160,0.7)';
        ctx.lineWidth = 0.03;
        ctx.beginPath();
        ctx.moveTo(xx, yy);
        ctx.lineTo(xx, yy + 0.9);
        ctx.stroke();
      }
    }
  }

  function decor(ctx, s, x0, x1, lk) {
    const { track } = s;
    const t = s.time;
    const onLogs = (x) => s.level.logs.some((l) => x > l.x0 && x < l.x1) || s.level.bridges.some((b) => x > b.x0 - 0.3 && x < b.x1 + 0.3);
    const start = Math.floor(x0 / 0.9) * 0.9;
    if (lk.decor === 'grass' || lk.decor === 'roots') {
      ctx.strokeStyle = lk.decor === 'grass' ? '#5aa62e' : '#3d8a2c';
      ctx.lineWidth = 0.07;
      ctx.lineCap = 'round';
      for (let x = start; x < x1; x += 0.9) {
        if (onLogs(x) || track.water.some((w) => x > w.x0 - 0.5 && x < w.x1 + 0.5)) continue;
        const hv = hash(x * 1.7);
        if (hv < 0.35) continue;
        const gy = groundY(track, x, t);
        const tall = 0.35 + hv * 0.45;
        const sway = Math.sin(s.time * 2 + x) * 0.06;
        ctx.beginPath();
        for (const dx of [-0.12, 0, 0.12]) {
          ctx.moveTo(x + dx * 0.5, gy);
          ctx.lineTo(x + dx + sway, gy + tall * (dx ? 0.75 : 1));
        }
        ctx.stroke();
      }
      if (lk.decor === 'roots') {
        ctx.strokeStyle = '#5a3f26';
        ctx.lineWidth = 0.09;
        for (let x = Math.floor(x0 / 4.3) * 4.3; x < x1; x += 4.3) {
          if (hash(x) < 0.5 || onLogs(x)) continue;
          const gy = groundY(track, x, t);
          ctx.beginPath();
          ctx.moveTo(x - 0.6, gy - 0.05);
          ctx.quadraticCurveTo(x, gy + 0.35, x + 0.6, gy - 0.05);
          ctx.stroke();
        }
      }
    } else if (lk.decor === 'shells') {
      for (let x = Math.floor(x0 / 2.7) * 2.7; x < x1; x += 2.7) {
        const hv = hash(x * 0.71);
        if (hv < 0.55) continue;
        const gy = groundY(track, x, t);
        if (hv > 0.85) {
          // a starfish
          ctx.fillStyle = '#ff7a5a';
          ctx.beginPath();
          for (let j = 0; j < 10; j++) {
            const a = (j * Math.PI) / 5 + 0.3;
            const rr = j % 2 ? 0.07 : 0.18;
            ctx.lineTo(x + Math.cos(a) * rr, gy + 0.08 + Math.sin(a) * rr * 0.6);
          }
          ctx.fill();
        } else {
          ctx.fillStyle = '#fff3e6';
          ctx.beginPath();
          ctx.arc(x, gy + 0.03, 0.12, 0, Math.PI);
          ctx.fill();
        }
      }
    } else if (lk.decor === 'road') {
      // dashed centre line on the tarmac
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 0.08;
      for (let x = Math.floor(x0 / 2.4) * 2.4; x < x1; x += 2.4) {
        if (onLogs(x)) continue;
        ctx.beginPath();
        ctx.moveTo(x, groundY(track, x, t) - 0.05);
        ctx.lineTo(x + 1.1, groundY(track, x + 1.1, t) - 0.05);
        ctx.stroke();
      }
      // a railing every so often
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 0.05;
      for (let x = Math.floor(x0 / 1.2) * 1.2; x < x1; x += 1.2) {
        if (onLogs(x) || s.level.water.some((w) => x > w.x0 - 1 && x < w.x1 + 1)) continue;
        const gy = groundY(track, x, t);
        if (Math.abs(groundY(track, x + 1.2, t) - gy) > 0.6) continue;
        ctx.beginPath();
        ctx.moveTo(x, gy + 0.2);
        ctx.lineTo(x, gy + 0.75);
        ctx.stroke();
      }
    }
  }

  function water(ctx, s, x0, x1) {
    const { track } = s;
    const lk = LOOK[s.level.look];
    for (const w of track.water) {
      if (w.x1 < x0 || w.x0 > x1) continue;
      ctx.beginPath();
      const a = Math.max(w.x0, x0);
      const b = Math.min(w.x1, x1);
      for (let x = a; x <= b + 0.001; x += 0.4) ctx.lineTo(x, w.y + Math.sin(s.time * 3 + x * 1.7) * 0.05);
      // down along the ground (where it is under the water)
      for (let x = b; x >= a - 0.001; x -= 0.4) ctx.lineTo(x, Math.min(w.y, groundY(track, x, s.time)));
      ctx.closePath();
      ctx.fillStyle = lk.water;
      ctx.fill();
      ctx.strokeStyle = lk.waterTop;
      ctx.lineWidth = 0.08;
      ctx.beginPath();
      for (let x = a; x <= b + 0.001; x += 0.4) ctx.lineTo(x, w.y + Math.sin(s.time * 3 + x * 1.7) * 0.05);
      ctx.stroke();
    }
  }

  function finishFlag(ctx, s, time) {
    const x = s.track.finishX;
    const gy = groundY(s.track, x, s.time);
    ctx.fillStyle = '#e8e8f4';
    ctx.fillRect(x - 0.08, gy, 0.16, 5);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.04;
    ctx.strokeRect(x - 0.08, gy, 0.16, 5);
    // checkered flag, waving
    const fw = 2.2;
    const fh = 1.4;
    const n = 6;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < 4; j++) {
        const u0 = i / n;
        const u1 = (i + 1) / n;
        const wv = (u) => Math.sin(time * 5 - u * 5) * 0.18 * u;
        ctx.fillStyle = (i + j) % 2 ? C.ink : C.white;
        ctx.beginPath();
        ctx.moveTo(x + u0 * fw, gy + 5 - (j * fh) / 4 + wv(u0));
        ctx.lineTo(x + u1 * fw, gy + 5 - (j * fh) / 4 + wv(u1));
        ctx.lineTo(x + u1 * fw, gy + 5 - ((j + 1) * fh) / 4 + wv(u1));
        ctx.lineTo(x + u0 * fw, gy + 5 - ((j + 1) * fh) / 4 + wv(u0));
        ctx.fill();
      }
    }
    // checkered strip on the ground
    for (let j = 0; j < 4; j++) {
      ctx.fillStyle = j % 2 ? C.ink : C.white;
      ctx.fillRect(x - 0.3 + (j % 2) * 0.3, gy - 0.15 - j * 0.0, 0.3, 0.15);
    }
  }

  // ---------- the whole scene ----------

  r.drawWorld = (ctx, s, time, dt, opts = {}) => {
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    r.follow(s, dt);
    stepParticles(dt);
    if (!opts.still) trail(s, dt);
    const look = s.level.look;
    ctx.drawImage(skyCanvas(look), 0, 0, r.w, r.h);
    scenery(ctx, look, time);

    const [x0, x1] = visibleRange();
    const k = r.cam.k;
    ctx.save();
    ctx.translate(r.w / 2 - r.cam.x * k, r.h / 2 + r.cam.y * k);
    ctx.scale(k, -k);

    terrain(ctx, s, x0, x1);
    if (s.track.finishX > x0 - 3 && s.track.finishX < x1 + 3) finishFlag(ctx, s, time);

    // critters
    const crits = s.level.critters || [];
    for (let i = 0; i < crits.length; i++) {
      const cr = crits[i];
      if (cr.x < x0 - 3 || cr.x > x1 + 3) continue;
      const since = s.time - s.critterT[i];
      if (cr.kind === 'gator') drawGator(ctx, cr.x, cr.y, time, since < 0.6 ? since / 0.6 : 0);
      else drawTurtle(ctx, cr.x, cr.y, time, since < 1.5 || Math.abs(s.buggy.x - cr.x) < 3);
    }
    // crates and balls
    for (const p of s.props) {
      if (p.x < x0 - 2 || p.x > x1 + 2) continue;
      if (p.kind === 'ball') drawBall(ctx, p);
      else drawCrate(ctx, p);
    }
    // the buggy
    const b = s.buggy;
    let wob = 0;
    if (s.strandT > 0.15) wob = Math.sin(time * 22) * 0.06;
    const face = s.strandT > 0.15 || s.righting ? 'oh' : s.airborne && s.hangT > 0.35 ? 'wow' : 'grin';
    drawBuggy(ctx, s.spec.look, { x: b.x, y: b.y, a: b.a + wob }, s.wheels, {
      r: s.spec.wheelR, t: time, face, fanSpin: time * (s.input === 'gas' ? 40 : 12),
    });

    water(ctx, s, x0, x1);

    // particles in the world
    for (const p of r.particles) {
      const a = 1 - p.t / p.life;
      if (p.text) continue;
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = p.colour;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.grow ? 1 + p.t * 3 : 1), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // coins and oranges (in screen space so their outlines stay crisp)
    const coins = s.level.coins;
    const cr = 0.42 * k;
    for (let i = 0; i < coins.length; i++) {
      const cn = coins[i];
      if (s.got[i] || cn.x < x0 - 1 || cn.x > x1 + 1) continue;
      const q = r.toScreen(cn.x, cn.y);
      if (cn.kind === 'orange') drawOrange(ctx, q.x, q.y + Math.sin(time * 3 + cn.x) * cr * 0.2, cr, Math.sin(time * 2 + cn.x) * 0.2);
      else drawCoinIcon(ctx, q.x, q.y, cr * 0.95, Math.cos(time * 3 + cn.x * 0.7));
    }

    // words: floating +1s and pop-ups
    for (const p of r.particles) {
      if (!p.text) continue;
      const q = r.toScreen(p.x, p.y);
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
      outlined(ctx, p.text, q.x, q.y, Math.max(16, k * 0.6), p.text === '+1' ? C.sun : C.white);
    }
    ctx.globalAlpha = 1;
    r.popups.forEach((p, i) => {
      const grow = p.t < 0.18 ? 0.4 + (p.t / 0.18) * 0.8 : 1.2 - Math.min(0.2, (p.t - 0.18) * 0.6);
      ctx.globalAlpha = p.t > 1 ? Math.max(0, (1.3 - p.t) / 0.3) : 1;
      const px = Math.min(r.h * 0.075, r.w / 7) * p.big;
      ctx.save();
      ctx.translate(r.w / 2, r.h * 0.27 + i * px * 1.1);
      ctx.rotate(-0.06 + Math.sin(p.t * 8) * 0.03);
      outlined(ctx, p.text, 0, 0, px * grow, p.colour, r.w * 0.9);
      ctx.restore();
    });
    ctx.globalAlpha = 1;

    if (s.strandT > 0.15 && !s.righting) flipBubble(ctx, s, time);
    if (t0) {
      r.stats.frames++;
      r.stats.ms += performance.now() - t0;
    }
  };

  // "Flip me!" speech bubble with a ring that fills until the buggy flips itself back.
  function flipBubble(ctx, s, time) {
    const q = r.toScreen(s.buggy.x, s.buggy.y);
    const R = Math.max(34, Math.min(60, r.w * 0.08));
    const bx = clamp(q.x + R * 1.2, R * 1.3, r.w - R * 1.3);
    const by = clamp(q.y - R * 2.6 + Math.sin(time * 6) * 3, R * 2.4, r.h - R * 2);
    ctx.fillStyle = C.white;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(bx, by, R, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx - R * 0.5, by + R * 0.8);
    ctx.lineTo(q.x, q.y - R * 0.4);
    ctx.lineTo(bx - R * 0.05, by + R * 0.95);
    ctx.fillStyle = C.white;
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bx, by, R * 0.95, 0, TAU);
    ctx.fill();
    // ring
    const k = Math.min(1, s.strandT / RIGHT_DELAY);
    ctx.strokeStyle = C.green;
    ctx.lineWidth = R * 0.16;
    ctx.beginPath();
    ctx.arc(bx, by, R * 0.78, -Math.PI / 2, -Math.PI / 2 + TAU * k);
    ctx.stroke();
    // a curly turn-over arrow
    ctx.strokeStyle = C.pink;
    ctx.lineWidth = R * 0.14;
    ctx.lineCap = 'round';
    const spin = time * 3;
    ctx.beginPath();
    ctx.arc(bx, by - R * 0.08, R * 0.38, spin, spin + Math.PI * 1.4);
    ctx.stroke();
    const ea = spin + Math.PI * 1.4;
    const ex = bx + Math.cos(ea) * R * 0.38;
    const ey = by - R * 0.08 + Math.sin(ea) * R * 0.38;
    ctx.fillStyle = C.pink;
    ctx.beginPath();
    ctx.arc(ex, ey, R * 0.13, 0, TAU);
    ctx.fill();
    outlined(ctx, 'Flip me!', bx, by + R * 0.55, R * 0.32, C.sun, R * 1.6);
  }

  return r;
}

// ---------- the launcher tile ----------

let tileKey = '';
let tileBg = null;

function paintTile(w, h, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  const c = cv.getContext('2d');
  c.scale(dpr, dpr);
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#5cc6ff');
  g.addColorStop(0.7, '#d8f6ff');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(255,250,210,0.95)';
  c.beginPath();
  c.arc(w * 0.8, h * 0.18, w * 0.09, 0, TAU);
  c.fill();
  // a row of cypress trees
  c.fillStyle = '#8fc4a6';
  for (let i = 0; i < 5; i++) {
    const x = w * (0.05 + i * 0.24);
    const th = h * (0.3 + (i % 2) * 0.1);
    c.fillRect(x - w * 0.012, h * 0.62 - th * 0.7, w * 0.024, th * 0.7);
    c.beginPath();
    c.ellipse(x, h * 0.62 - th * 0.75, w * 0.08, h * 0.05, 0, 0, TAU);
    c.fill();
  }
  c.fillStyle = '#9cc9b0';
  c.fillRect(0, h * 0.6, w, h * 0.4);
  return cv;
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
  // bumpy ground scrolling past (world metres: the tile shows about 8 m)
  const k = w / 8;
  const scroll = time * 4;
  const ground = (wx) => 0.35 * Math.sin(wx * 0.9) + 0.25 * Math.sin(wx * 2.1 + 1) + Math.max(0, 1.2 - Math.abs(((wx % 14) + 14) % 14 - 7) * 0.6);
  const baseY = y + h * 0.86;
  ctx.save();
  ctx.translate(x + w * 0.35 - scroll * k, baseY);
  ctx.scale(k, -k);
  ctx.beginPath();
  const xa = scroll - 0.35 * 8 - 1;
  const xb = xa + 10;
  ctx.moveTo(xa, -5);
  for (let wx = xa; wx <= xb; wx += 0.2) ctx.lineTo(wx, ground(wx));
  ctx.lineTo(xb, -5);
  ctx.closePath();
  ctx.fillStyle = '#7a5a30';
  ctx.fill();
  ctx.strokeStyle = '#79c043';
  ctx.lineWidth = 0.3;
  ctx.beginPath();
  for (let wx = xa; wx <= xb; wx += 0.2) ctx.lineTo(wx, ground(wx));
  ctx.stroke();
  // the buggy riding the bumps
  const bx = scroll;
  const rr = 0.58;
  const rx = bx - 1.1;
  const fx = bx + 1.15;
  const ry = ground(rx) + rr;
  const fy = ground(fx) + rr;
  const hop = Math.max(0, Math.sin(time * 2.2)) * 0.15;
  const a = Math.atan2(fy - ry, fx - rx);
  const cy = (ry + fy) / 2 + 0.75 + hop + Math.sin(time * 11) * 0.03;
  drawBuggy(ctx, { body: '#47c25a', dark: '#2a8a3e', trim: '#ffd23f', hub: '#ff7a2f', cage: '#3a3550', helmet: '#ff5a3c' },
    { x: bx + 0.03, y: cy, a }, [{ x: rx, y: ry, spin: scroll / rr }, { x: fx, y: fy, spin: scroll / rr }], { r: rr, t: time });
  ctx.restore();
  ctx.restore();
}
