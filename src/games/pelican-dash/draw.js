// Pelican Dash drawing. Reads the game state and never changes it.
// Static layers (sky, sun, skyline, palms, clouds) are painted once per screen size into
// offscreen canvases; the moving world is drawn in world units under one transform.
import { WATER, NEST_EVERY, INVULNERABLE } from './sim.js';

export const C = {
  night: '#2b1055',
  dusk: '#7a1fa2',
  pink: '#ff3d9a',
  orange: '#ff8a4c',
  sun: '#ffe14d',
  sea: '#0bb5c4',
  deep: '#0a3d6b',
  foam: '#9ff7f2',
  palm: '#160b33',
  ink: '#160b33',
  white: '#ffffff',
  wood: '#8a5a3c',
  woodLight: '#c48a5a',
  woodDark: '#5e3a24',
  rope: '#f2d29b',
};

export const font = (px, weight = 900) => `${weight} ${Math.round(px)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
// world-unit font (used under the world transform, so fractional sizes are fine)
const WORLD_FONT = '900 3px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function outlined(ctx, text, x, y, px, fill) {
  ctx.font = font(px);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = px * 0.2;
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

function starPath(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

// ---------- the pelican ----------

const PELICAN_LOOK = 0.85; // drawn size relative to world units

// Wing angle from how long ago the last flap was: a quick lift and a strong downstroke,
// then a slow glide.
export function wingAngle(age, time) {
  const glide = 0.15 + Math.sin(time * 5) * 0.08;
  if (age < 0.08) return glide + (0.95 - glide) * (age / 0.08);
  if (age < 0.26) return 0.95 - 1.7 * ((age - 0.08) / 0.18);
  if (age < 0.5) return -0.75 + (glide + 0.75) * ((age - 0.26) / 0.24);
  return glide;
}

// Pelican facing right, centred on its hit circle, in units of `k` pixels.
// fill: 0..1 how full the beak pouch is. mood: 'ok' | 'dizzy'
export function drawPelican(ctx, x, y, k, tilt, wing, fill, mood = 'ok') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(k * PELICAN_LOOK, k * PELICAN_LOOK);
  ctx.translate(-1.5, 0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = C.ink;

  // tail
  ctx.fillStyle = '#b9aa98';
  ctx.beginPath();
  ctx.moveTo(-5.5, -1.5);
  ctx.lineTo(-10, -3.2);
  ctx.lineTo(-10.4, -0.6);
  ctx.lineTo(-9.6, 1.4);
  ctx.lineTo(-5.5, 1.8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // feet tucked under
  ctx.fillStyle = C.orange;
  ctx.beginPath();
  ctx.ellipse(-2.5, 4.9, 1.8, 0.9, 0.3, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // body
  ctx.fillStyle = '#f3ece1';
  ctx.beginPath();
  ctx.ellipse(0, 0.6, 6.4, 4.7, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ddd2c2';
  ctx.beginPath();
  ctx.ellipse(-1.2, -1.2, 4.8, 2.6, -0.1, Math.PI, TAU);
  ctx.fill();

  // neck and head
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4.4;
  ctx.beginPath();
  ctx.moveTo(3.4, -0.8);
  ctx.quadraticCurveTo(5.6, -2.4, 5.6, -5);
  ctx.stroke();
  ctx.strokeStyle = C.white;
  ctx.lineWidth = 3.4;
  ctx.stroke();
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = C.ink;
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.arc(6, -5.6, 2.7, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.sun;
  ctx.beginPath();
  ctx.arc(6, -5.6, 2.7, Math.PI * 1.05, Math.PI * 1.75);
  ctx.lineTo(6, -5.6);
  ctx.closePath();
  ctx.fill();

  // pouch under the bill, bulging as it fills
  const bulge = 0.8 + fill * 4.2;
  ctx.fillStyle = '#ff9a5c';
  ctx.beginPath();
  ctx.moveTo(7.6, -4.6);
  ctx.lineTo(14.2, -4.2);
  ctx.quadraticCurveTo(12.6, -3 + bulge * 1.2, 9.2, -3.4 + bulge * 0.7);
  ctx.quadraticCurveTo(7.4, -3.4 + bulge * 0.3, 7.2, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (fill > 0) {
    // a tail poking out of the pouch
    ctx.fillStyle = '#9ff7f2';
    ctx.beginPath();
    ctx.moveTo(12.6, -4.1);
    ctx.lineTo(14.6, -5.6);
    ctx.lineTo(14.9, -3.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // upper bill with a hooked tip
  ctx.fillStyle = C.sun;
  ctx.beginPath();
  ctx.moveTo(7.4, -6.6);
  ctx.lineTo(14.4, -5.4);
  ctx.quadraticCurveTo(15.6, -5, 15.1, -3.9);
  ctx.lineTo(14.2, -4.3);
  ctx.lineTo(7.6, -4.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // eye
  if (mood === 'dizzy') {
    ctx.lineWidth = 0.45;
    ctx.beginPath();
    ctx.moveTo(6.2, -6.8);
    ctx.lineTo(7.6, -5.6);
    ctx.moveTo(7.6, -6.8);
    ctx.lineTo(6.2, -5.6);
    ctx.stroke();
  } else {
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(6.9, -6.1, 0.85, 0, TAU);
    ctx.fill();
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.arc(7.15, -6.4, 0.3, 0, TAU);
    ctx.fill();
  }

  // wing, hinged at the shoulder
  ctx.save();
  ctx.translate(0.6, -1.6);
  ctx.rotate(wing);
  ctx.lineWidth = 0.5;
  ctx.fillStyle = '#c9b8a4';
  ctx.beginPath();
  ctx.moveTo(1.2, -0.6);
  ctx.quadraticCurveTo(-4, -2.6, -9.6, -0.6);
  ctx.lineTo(-10.4, 0.9);
  ctx.quadraticCurveTo(-5, 2.8, 0.8, 1.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#6b5548';
  ctx.beginPath();
  ctx.moveTo(-6.6, -1.3);
  ctx.quadraticCurveTo(-8.4, -1.4, -9.6, -0.6);
  ctx.lineTo(-10.4, 0.9);
  ctx.quadraticCurveTo(-8.4, 1.6, -6.4, 1.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

// ---------- fish ----------

const FISH_COLOURS = ['#ffb347', '#9ff7f2', '#ff7eb6'];

function drawFish(ctx, x, y, angle, look, k = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(k, k);
  ctx.fillStyle = FISH_COLOURS[look];
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.35;
  ctx.beginPath();
  ctx.moveTo(-2.2, 0);
  ctx.lineTo(-4.2, -1.6);
  ctx.lineTo(-4.2, 1.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.9, 1.5, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(1.6, -0.35, 0.38, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ---------- obstacles ----------

const SIGN_COLOURS = ['#ff3d9a', '#ffe14d', '#9ff7f2', '#ff8a4c', '#b46bff'];
const SIGN_WORDS = ['SURF', 'TACOS', 'BEACH', 'FISH!', 'SUN', 'PIER', 'SODA', 'WOW'];
const KITE_COLOURS = [['#ff3d9a', '#ffe14d'], ['#1496ff', '#9ff7f2'], ['#ff8a4c', '#b46bff'], ['#ffe14d', '#0bb5c4']];
const HUT_COLOURS = [['#ff3d9a', '#ffd1e8'], ['#0bb5c4', '#d6fffb'], ['#ff8a4c', '#fff2a8']];

function drawSigns(ctx, o) {
  const { x, gapTop, look } = o;
  ctx.strokeStyle = C.rope;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(x - 3.5, -8);
  ctx.lineTo(x - 3.5, gapTop - 2);
  ctx.moveTo(x + 3.5, -8);
  ctx.lineTo(x + 3.5, gapTop - 2);
  ctx.stroke();
  ctx.font = WORLD_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0, bottom = gapTop; bottom > -2; i++, bottom -= 9.5) {
    const c = SIGN_COLOURS[(look + i) % SIGN_COLOURS.length];
    ctx.fillStyle = c;
    roundRect(ctx, x - 6, bottom - 7, 12, 7, 1.4);
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.fillText(SIGN_WORDS[(look * 3 + i) % SIGN_WORDS.length], x, bottom - 3.4);
  }
}

function drawKites(ctx, o, time) {
  const { x, gapTop, look } = o;
  ctx.strokeStyle = C.white;
  ctx.lineWidth = 0.35;
  ctx.beginPath();
  ctx.moveTo(x, -8);
  ctx.lineTo(x, gapTop);
  ctx.stroke();
  // tail fluttering behind the lowest kite
  ctx.strokeStyle = C.white;
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.moveTo(x, gapTop);
  for (let i = 1; i <= 4; i++) {
    const tx = x + i * 2.2;
    const ty = gapTop + 0.6 * i + Math.sin(time * 6 + i) * 0.9;
    ctx.lineTo(tx, ty);
  }
  ctx.stroke();
  for (let i = 1; i <= 4; i++) {
    const tx = x + i * 2.2;
    const ty = gapTop + 0.6 * i + Math.sin(time * 6 + i) * 0.9;
    ctx.fillStyle = SIGN_COLOURS[(look + i) % SIGN_COLOURS.length];
    ctx.beginPath();
    ctx.moveTo(tx - 0.9, ty - 0.7);
    ctx.lineTo(tx + 0.9, ty + 0.7);
    ctx.lineTo(tx + 0.9, ty - 0.7);
    ctx.lineTo(tx - 0.9, ty + 0.7);
    ctx.closePath();
    ctx.fill();
  }
  ctx.lineWidth = 0.45;
  for (let i = 0, cy = gapTop - 5; cy > -6; i++, cy -= 9) {
    const [a, b] = KITE_COLOURS[(look + i) % KITE_COLOURS.length];
    const sway = Math.sin(time * 2.4 + i * 1.3 + look) * 0.5;
    const cx = x + sway;
    ctx.fillStyle = a;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx - 5.2, cy);
    ctx.lineTo(cx, cy + 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = b;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx + 5.2, cy);
    ctx.lineTo(cx, cy + 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx - 5.2, cy);
    ctx.lineTo(cx, cy + 5);
    ctx.lineTo(cx + 5.2, cy);
    ctx.closePath();
    ctx.moveTo(cx - 5.2, cy);
    ctx.lineTo(cx + 5.2, cy);
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx, cy + 5);
    ctx.stroke();
  }
}

function drawBlimp(ctx, o) {
  const { x, gapTop } = o;
  const cy = gapTop - 8.5;
  // tether
  ctx.fillStyle = C.rope;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.4;
  ctx.fillRect(x - 1.1, -8, 2.2, cy - 6 + 8);
  ctx.strokeRect(x - 1.1, -8, 2.2, cy - 6 + 8);
  // fins
  ctx.fillStyle = C.pink;
  ctx.beginPath();
  ctx.moveTo(x + 6.5, cy - 3);
  ctx.lineTo(x + 11.5, cy - 7);
  ctx.lineTo(x + 10.5, cy - 1.5);
  ctx.closePath();
  ctx.moveTo(x + 6.5, cy + 3);
  ctx.lineTo(x + 11.5, cy + 7);
  ctx.lineTo(x + 10.5, cy + 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 0.5;
  ctx.stroke();
  // body
  ctx.fillStyle = '#f4f0ff';
  ctx.beginPath();
  ctx.ellipse(x, cy, 10, 6.5, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = C.pink;
  ctx.fillRect(x - 10, cy - 1.9, 20, 3.8);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(x - 3, cy - 4, 4.5, 1.1, -0.1, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(x, cy, 10, 6.5, 0, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = C.white;
  ctx.font = WORLD_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MIAMI', x, cy + 0.2);
  // gondola
  ctx.fillStyle = C.night;
  roundRect(ctx, x - 3.5, gapTop - 3.5, 7, 3.5, 1);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.sun;
  for (let i = -1; i <= 1; i++) ctx.fillRect(x + i * 2 - 0.5, gapTop - 2.6, 1, 1.2);
}

function drawPostPair(ctx, x, top, half, width) {
  for (let i = 0; i < 2; i++) {
    const px = i ? x + half - width : x - half;
    ctx.fillStyle = C.wood;
    ctx.fillRect(px, top, width, WATER + 6 - top);
    ctx.strokeRect(px, top, width, WATER + 6 - top);
    ctx.fillStyle = C.woodDark;
    ctx.fillRect(px + width * 0.62, top + 1, width * 0.18, WATER + 4 - top);
  }
}

function drawPilings(ctx, o) {
  const { x, gapBottom: top } = o;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.5;
  drawPostPair(ctx, x, top + 1, 5, 4.4);
  ctx.fillStyle = C.woodLight;
  for (let i = -1; i <= 1; i += 2) {
    const px = x + i * 2.8;
    ctx.beginPath();
    ctx.ellipse(px, top + 1, 2.2, 1, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  ctx.strokeStyle = C.rope;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(x - 5, top + 4);
  ctx.lineTo(x + 5, top + 4.6);
  ctx.moveTo(x - 5, top + 5.4);
  ctx.lineTo(x + 5, top + 6);
  ctx.stroke();
  ctx.fillStyle = 'rgba(47,143,122,0.85)';
  ctx.fillRect(x - 5, WATER - 4, 10, 6);
}

function drawPier(ctx, o) {
  const { x, gapBottom: top } = o;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.5;
  drawPostPair(ctx, x, top + 4, 4.6, 2.6);
  ctx.strokeStyle = C.woodDark;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (let y = top + 5; y < WATER - 4; y += 9) {
    ctx.moveTo(x - 2.2, y);
    ctx.lineTo(x + 2.2, y + 7);
    ctx.moveTo(x + 2.2, y);
    ctx.lineTo(x - 2.2, y + 7);
  }
  ctx.stroke();
  ctx.fillStyle = C.woodLight;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.5;
  ctx.fillRect(x - 8, top, 16, 4);
  ctx.strokeRect(x - 8, top, 16, 4);
  ctx.beginPath();
  for (let i = -6; i <= 6; i += 3) {
    ctx.moveTo(x + i, top);
    ctx.lineTo(x + i, top + 4);
  }
  ctx.stroke();
}

function drawLifeguard(ctx, o) {
  const { x, gapBottom: top, look } = o;
  const [roof, wall] = HUT_COLOURS[look % HUT_COLOURS.length];
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.5;
  drawPostPair(ctx, x, top + 12, 4.4, 1.8);
  ctx.strokeStyle = C.woodDark;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(x - 3, top + 14);
  ctx.lineTo(x + 3, top + 22);
  ctx.moveTo(x + 3, top + 14);
  ctx.lineTo(x - 3, top + 22);
  ctx.stroke();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.5;
  // hut with stripes
  ctx.fillStyle = wall;
  ctx.fillRect(x - 6, top + 3.5, 12, 8);
  ctx.fillStyle = roof;
  ctx.fillRect(x - 6, top + 9, 12, 1.4);
  ctx.strokeRect(x - 6, top + 3.5, 12, 8);
  ctx.fillStyle = C.night;
  roundRect(ctx, x - 3.4, top + 5, 6.8, 3.2, 0.8);
  ctx.fill();
  // red cross flag on the wall
  ctx.fillStyle = '#ff2d46';
  ctx.fillRect(x + 4, top + 5.2, 1.2, 3);
  ctx.fillRect(x + 3.1, top + 6.1, 3, 1.2);
  // roof
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - 7, top + 4);
  ctx.quadraticCurveTo(x, top - 1.5, x + 7, top + 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // deck
  ctx.fillStyle = C.woodLight;
  ctx.fillRect(x - 7, top + 11.3, 14, 1.7);
  ctx.strokeRect(x - 7, top + 11.3, 14, 1.7);
}

function drawNest(ctx, o, s) {
  const { x, nestY } = o;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.5;
  ctx.fillStyle = C.wood;
  ctx.fillRect(x - 1.6, nestY, 3.2, WATER + 6 - nestY);
  ctx.strokeRect(x - 1.6, nestY, 3.2, WATER + 6 - nestY);
  // chicks
  const since = s.time - s.nestTime;
  const party = o.done && since < 2.4;
  for (let i = -1; i <= 1; i++) {
    const hop = party ? -Math.abs(Math.sin(since * 9 + i * 1.2)) * 3 : Math.sin(s.time * 4 + i) * 0.3;
    const cx = x + i * 4;
    const cy = nestY - 2.2 + hop;
    ctx.fillStyle = '#d9d2c5';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.3, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(cx + 0.6, cy - 0.7, 0.4, 0, TAU);
    ctx.fill();
    // beak wide open, begging (or munching after dinner)
    const open = party ? 0.4 : 1.2;
    ctx.fillStyle = C.orange;
    ctx.beginPath();
    ctx.moveTo(cx + 1.6, cy - 0.4);
    ctx.lineTo(cx + 3.8, cy - 0.2 - open);
    ctx.lineTo(cx + 3.8, cy + 0.2 + open * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // nest bowl
  ctx.fillStyle = C.wood;
  ctx.beginPath();
  ctx.ellipse(x, nestY, 8, 3.2, 0, 0, Math.PI);
  ctx.lineTo(x - 8, nestY - 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = C.woodLight;
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const tx = x - 7 + i * 2.6;
    ctx.moveTo(tx, nestY - 0.6);
    ctx.lineTo(tx + 3, nestY + 1.8);
  }
  ctx.stroke();
}

// ---------- particles (a fixed pool, so nothing is allocated per frame) ----------

const POOL = 48;

function createParticles() {
  const list = [];
  for (let i = 0; i < POOL; i++) list.push({ life: 0, max: 1, x: 0, y: 0, vx: 0, vy: 0, g: 0, kind: 0, r: 1, spin: 0 });
  let next = 0;
  return {
    list,
    add(kind, x, y, vx, vy, g, life, r) {
      const p = list[next];
      next = (next + 1) % POOL;
      p.kind = kind; // 0 heart, 1 star, 2 feather, 3 drop
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.g = g;
      p.life = life;
      p.max = life;
      p.r = r;
      p.spin = Math.random() * TAU;
    },
    clear() {
      for (const p of list) p.life = 0;
    },
  };
}

// ---------- the renderer ----------

export function createRenderer() {
  let w = 1;
  let h = 1;
  let dpr = 1;
  const v = { scale: 1, waterY: 1, horizon: 1, px: 1 }; // px: pelican's screen x
  let sky = null;
  let far = null;
  let palms = null;
  let cloud = null;
  let tileW = 1;
  let nearGrad = null;
  let gradCtx = null;
  const parts = createParticles();
  const seen = { hit: -9, nest: -9, catch: -9, game: null };

  function offscreen(cw, ch) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(cw * dpr));
    c.height = Math.max(1, Math.round(ch * dpr));
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    return [c, g];
  }

  function paintSky() {
    const [c, g] = offscreen(w, v.waterY);
    const hz = v.horizon;
    const grad = g.createLinearGradient(0, 0, 0, hz);
    grad.addColorStop(0, C.night);
    grad.addColorStop(0.45, C.dusk);
    grad.addColorStop(0.8, C.pink);
    grad.addColorStop(1, C.orange);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, hz);
    // striped retro sun on the horizon
    const r = Math.min(w * 0.3, h * 0.16);
    const sx = w * 0.68;
    const sun = g.createLinearGradient(0, hz - r, 0, hz);
    sun.addColorStop(0, C.sun);
    sun.addColorStop(1, C.pink);
    g.save();
    g.beginPath();
    g.rect(0, 0, w, hz);
    g.clip();
    g.fillStyle = sun;
    g.beginPath();
    g.arc(sx, hz, r, 0, TAU);
    g.fill();
    for (let i = 0; i < 5; i++) {
      const y = hz - r * 0.5 + i * r * 0.11;
      g.clearRect(sx - r, y, r * 2, r * 0.03 + i * r * 0.012);
    }
    g.restore();
    // the sky behind the cleared stripes
    g.globalCompositeOperation = 'destination-over';
    g.fillStyle = grad;
    g.fillRect(0, 0, w, hz);
    g.globalCompositeOperation = 'source-over';
    // far sea
    const sea = g.createLinearGradient(0, hz, 0, v.waterY);
    sea.addColorStop(0, '#ff7a8a');
    sea.addColorStop(0.12, C.sea);
    sea.addColorStop(1, '#0b6f94');
    g.fillStyle = sea;
    g.fillRect(0, hz, w, v.waterY - hz);
    // sun glitter on the water
    g.fillStyle = 'rgba(255,225,77,0.55)';
    for (let i = 0; i < 9; i++) {
      const y = hz + 3 + i * i * (v.waterY - hz) * 0.011;
      const bw = r * (1.2 - i * 0.1);
      g.fillRect(sx - bw / 2, y, bw, Math.max(2, h * 0.004));
    }
    return c;
  }

  // A strip that repeats seamlessly: art deco hotels on the far shore.
  function paintFar() {
    const th = v.horizon;
    const [c, g] = offscreen(tileW, th);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const deco = ['#4a1a7a', '#5a2388', '#3d1566'];
    for (let x = 0; x < tileW; ) {
      const bw = h * (0.035 + rnd() * 0.04);
      const bh = h * (0.03 + rnd() * 0.08);
      const by = th - bh;
      const step = rnd() < 0.5;
      for (const ox of [0, -tileW, tileW]) {
        const bx = x + ox;
        if (bx > tileW || bx + bw < 0) continue;
        g.fillStyle = deco[Math.floor(rnd() * 3) % 3];
        g.fillRect(bx, by, bw, bh);
        if (step) g.fillRect(bx + bw * 0.2, by - bh * 0.15, bw * 0.6, bh * 0.15 + 1);
        g.fillStyle = 'rgba(255,225,77,0.6)';
        const win = Math.max(2, h * 0.004);
        for (let wy = by + win * 2; wy < th - win * 2; wy += win * 3) {
          for (let wx = bx + win; wx < bx + bw - win; wx += win * 2.5) if (rnd() < 0.35) g.fillRect(wx, wy, win, win);
        }
      }
      x += bw + h * (0.004 + rnd() * 0.03);
    }
    return c;
  }

  // Nearer islands with palm trees, also repeating.
  function paintPalms() {
    const th = v.horizon + h * 0.02;
    const [c, g] = offscreen(tileW, th);
    g.fillStyle = C.palm;
    g.strokeStyle = C.palm;
    g.lineCap = 'round';
    const islands = [0.12, 0.55, 0.82];
    for (const f of islands) {
      for (const ox of [0, -tileW, tileW]) {
        const ix = f * tileW + ox;
        const iw = tileW * 0.16;
        g.beginPath();
        g.ellipse(ix, v.horizon + h * 0.004, iw / 2, h * 0.012, 0, Math.PI, TAU);
        g.fill();
        for (let k = 0; k < 2; k++) {
          const bx = ix - iw * 0.18 + k * iw * 0.3;
          const lean = (k ? 1 : -1) * h * 0.012;
          const tx = bx + lean;
          const ty = v.horizon - h * (0.07 + k * 0.02);
          g.lineWidth = Math.max(3, h * 0.005);
          g.beginPath();
          g.moveTo(bx, v.horizon);
          g.quadraticCurveTo(bx, ty + h * 0.03, tx, ty);
          g.stroke();
          const len = h * 0.035;
          for (const a of [-2.9, -2.2, -1.5, -0.9, -0.2, 0.4]) {
            g.beginPath();
            g.moveTo(tx, ty);
            g.quadraticCurveTo(tx + Math.cos(a) * len * 0.6, ty + Math.sin(a) * len * 0.8 - len * 0.1, tx + Math.cos(a) * len, ty + Math.sin(a) * len * 0.6 + len * 0.3);
            g.quadraticCurveTo(tx + Math.cos(a) * len * 0.5, ty + Math.sin(a) * len * 0.4 + len * 0.1, tx, ty);
            g.fill();
          }
        }
      }
    }
    return c;
  }

  function paintCloud() {
    const cw = Math.min(w * 0.42, 300);
    const [c, g] = offscreen(cw, cw * 0.42);
    const ch = cw * 0.42;
    g.fillStyle = 'rgba(255,190,210,0.55)';
    g.beginPath();
    g.ellipse(cw * 0.5, ch * 0.7, cw * 0.48, ch * 0.22, 0, 0, TAU);
    g.ellipse(cw * 0.35, ch * 0.5, cw * 0.18, ch * 0.3, 0, 0, TAU);
    g.ellipse(cw * 0.58, ch * 0.38, cw * 0.22, ch * 0.34, 0, 0, TAU);
    g.ellipse(cw * 0.76, ch * 0.58, cw * 0.14, ch * 0.22, 0, 0, TAU);
    g.fill();
    return c;
  }

  function resize(nw, nh, ndpr) {
    w = nw;
    h = nh;
    dpr = ndpr;
    v.waterY = h * 0.8;
    v.scale = v.waterY / WATER;
    v.horizon = h * 0.52;
    v.px = w * 0.27;
    tileW = Math.ceil(Math.max(w, 600));
    sky = paintSky();
    far = paintFar();
    palms = paintPalms();
    cloud = paintCloud();
    nearGrad = null;
  }

  const camOf = (s) => s.x - v.px / v.scale;

  function drawStrip(ctx, img, shift, th) {
    const off = ((shift % tileW) + tileW) % tileW;
    ctx.drawImage(img, -off, 0, tileW, th);
    ctx.drawImage(img, tileW - off, 0, tileW, th);
  }

  // Everything behind the obstacles. camPx: the camera's x in screen pixels.
  function drawBackground(ctx, camPx, time) {
    ctx.drawImage(sky, 0, 0, w, v.waterY);
    const cw = Math.min(w * 0.42, 300);
    const ch = cw * 0.42;
    const span = w + cw * 1.6;
    for (let i = 0; i < 4; i++) {
      const scale = 0.6 + (i % 3) * 0.25;
      const x = ((((i * 0.29 * span - camPx * 0.03 - time * (5 + i * 2)) % span) + span) % span) - cw;
      ctx.drawImage(cloud, x, h * (0.06 + i * 0.075), cw * scale, ch * scale);
    }
    drawStrip(ctx, far, camPx * 0.06, v.horizon);
    drawStrip(ctx, palms, camPx * 0.16, v.horizon + h * 0.02);
    // wave lines on the open sea, faster nearer the front
    const rows = 9;
    const lh = Math.max(2, h * 0.0035);
    ctx.fillStyle = 'rgba(159,247,242,0.45)';
    for (let i = 0; i < rows; i++) {
      const f = (i + 0.5) / rows;
      const y = v.horizon + h * 0.03 + f * f * (v.waterY - v.horizon - h * 0.04);
      const dw = w * (0.05 + f * 0.08);
      const gapW = w * 0.45;
      const rate = 0.2 + f * 0.6;
      for (let k = 0; k < 3; k++) {
        const x = ((((k * gapW + i * 71 - camPx * rate - time * 8) % (gapW * 3)) + gapW * 3) % (gapW * 3)) - dw;
        ctx.fillRect(x, y, dw, lh);
      }
    }
  }

  // The near water in front of everything, with a rolling crest.
  function drawNearWater(ctx, camPx, time) {
    if (!nearGrad || gradCtx !== ctx) {
      gradCtx = ctx;
      nearGrad = ctx.createLinearGradient(0, v.waterY, 0, h);
      nearGrad.addColorStop(0, C.sea);
      nearGrad.addColorStop(0.4, C.deep);
      nearGrad.addColorStop(1, C.night);
    }
    const amp = v.scale * 0.9;
    const k = 0.035;
    const ph = camPx * k + time * 2;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 12; x += 12) ctx.lineTo(x, v.waterY + Math.sin(x * k + ph) * amp);
    ctx.lineTo(w + 12, h);
    ctx.closePath();
    ctx.fillStyle = nearGrad;
    ctx.fill();
    ctx.beginPath();
    for (let x = 0; x <= w + 12; x += 12) {
      const y = v.waterY + Math.sin(x * k + ph) * amp;
      if (x) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.strokeStyle = C.foam;
    ctx.lineWidth = Math.max(3, v.scale * 0.7);
    ctx.stroke();
    // foam streaks moving with the world
    ctx.fillStyle = 'rgba(159,247,242,0.35)';
    const lh = Math.max(2, h * 0.004);
    for (let i = 0; i < 6; i++) {
      const y = v.waterY + (h - v.waterY) * (0.2 + i * 0.13);
      const dw = w * (0.12 + (i % 3) * 0.05);
      const span = w * 1.3;
      const x = ((((i * 0.37 * span - camPx * (1 + i * 0.1)) % span) + span) % span) - dw;
      ctx.fillRect(x, y, dw, lh);
    }
  }

  function splashRing(ctx, x, age, big) {
    const k = age / 0.4;
    ctx.globalAlpha = 1 - k;
    ctx.beginPath();
    ctx.ellipse(x, WATER, 2 + k * (big ? 7 : 5), 0.8 + k * 1.4, 0, Math.PI, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function syncEffects(s) {
    if (seen.game !== s) {
      seen.game = s;
      seen.hit = s.hitTime;
      seen.nest = s.nestTime;
      seen.catch = s.catchTime;
      parts.clear();
    }
    if (s.hitTime !== seen.hit) {
      seen.hit = s.hitTime;
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * TAU;
        parts.add(2, s.x, s.y, Math.cos(a) * 14, Math.sin(a) * 14 - 6, 12, 1.1, 1);
      }
      if (s.hitBy === 'water') for (let i = 0; i < 10; i++) parts.add(3, s.x + (Math.random() - 0.5) * 6, WATER - 1, (Math.random() - 0.5) * 20, -20 - Math.random() * 20, 70, 0.8, 0.8);
    }
    if (s.catchTime !== seen.catch) {
      seen.catch = s.catchTime;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU;
        parts.add(1, s.x + 8, s.y - 3, Math.cos(a) * 16, Math.sin(a) * 16, 0, 0.45, 1.2);
      }
    }
    if (s.nestTime !== seen.nest) {
      seen.nest = s.nestTime;
      let nest = null;
      for (const o of s.obstacles) if (o.kind === 'nest' && o.done) nest = o;
      if (nest) {
        for (let i = 0; i < 18; i++) {
          parts.add(i % 2, nest.x + (Math.random() - 0.5) * 10, nest.nestY - 4, (Math.random() - 0.5) * 26, -22 - Math.random() * 22, 22, 1.6, 1.4 + Math.random());
        }
      }
    }
  }

  function drawParticles(ctx, dt) {
    for (const p of parts.list) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.spin += dt * 4;
      const a = Math.max(0, Math.min(1, p.life / (p.max * 0.5)));
      ctx.globalAlpha = a;
      if (p.kind === 0) {
        ctx.fillStyle = C.pink;
        heartPath(ctx, p.x, p.y, p.r);
        ctx.fill();
      } else if (p.kind === 1) {
        ctx.fillStyle = C.sun;
        starPath(ctx, p.x, p.y, p.r);
        ctx.fill();
      } else if (p.kind === 2) {
        ctx.fillStyle = '#f3ece1';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 1.6, 0.6, p.spin, 0, TAU);
        ctx.fill();
      } else {
        ctx.fillStyle = C.foam;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // The playing field: background, obstacles, nests, fish, pelican, water and effects.
  function drawWorld(ctx, s, time, dt) {
    syncEffects(s);
    const sc = v.scale;
    const cam = camOf(s);
    const camPx = cam * sc;
    drawBackground(ctx, camPx, time);

    ctx.save();
    ctx.translate(-camPx, 0);
    ctx.scale(sc, sc);
    const left = cam - 20;
    const right = cam + w / sc + 20;

    for (const o of s.obstacles) {
      if (o.x < left || o.x > right) continue;
      if (o.kind === 'nest') {
        drawNest(ctx, o, s);
        continue;
      }
      if (o.kindBottom === 'pilings') drawPilings(ctx, o);
      else if (o.kindBottom === 'pier') drawPier(ctx, o);
      else drawLifeguard(ctx, o);
      if (o.kindTop === 'signs') drawSigns(ctx, o);
      else if (o.kindTop === 'kites') drawKites(ctx, o, time);
      else drawBlimp(ctx, o);
    }

    // fish, and splashes where they leave and return to the sea
    ctx.strokeStyle = C.foam;
    ctx.lineWidth = 0.6;
    const fill = Math.min(s.pouch, NEST_EVERY) / NEST_EVERY;
    for (const f of s.fishes) {
      if (f.apexX < left || f.apexX > right + 20 || f.state === 0) continue;
      if (f.state === 1) {
        if (f.t < 0.4) splashRing(ctx, f.launchX, f.t, true);
        const vy = -(f.v0 - 55 * f.t);
        drawFish(ctx, f.x, f.y, Math.atan2(vy, -4), f.look);
      } else if (f.state === 3) {
        const age = s.time - f.endTime;
        if (age < 0.4 && f.endTime > 0) splashRing(ctx, f.x, age, false);
      } else if (f.state === 2) {
        // swallowed: shrink into the pouch
        const age = s.time - f.endTime;
        if (age < 0.25) {
          const k = age / 0.25;
          drawFish(ctx, f.x + (s.x + 9 - f.x) * k, f.y + (s.y - 3 - f.y) * k, 0, f.look, 1 - k * 0.7);
        }
      }
      ctx.strokeStyle = C.foam;
      ctx.lineWidth = 0.6;
    }

    // dinner for the chicks: fish arcing from the pouch to the nest
    const since = s.time - s.nestTime;
    if (since < 0.7) {
      let nest = null;
      for (const o of s.obstacles) if (o.kind === 'nest' && o.done) nest = o;
      if (nest) {
        const n = Math.min(s.delivered, 6);
        for (let i = 0; i < n; i++) {
          const k = clamp((since - i * 0.06) / 0.45, 0, 1);
          if (k <= 0 || k >= 1) continue;
          const fx = s.x + 9 + (nest.x - s.x - 9) * k;
          const fy = s.y - 3 + (nest.nestY - 3 - s.y + 3) * k - Math.sin(k * Math.PI) * 10;
          drawFish(ctx, fx, fy, k * 3, i % 3, 0.8);
        }
      }
    }

    // the pelican
    const over = s.status === 'over';
    const blink = s.time < s.invulnUntil && Math.floor((s.invulnUntil - s.time) * 8) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.35;
    let wing;
    let tilt;
    let bob = 0;
    if (s.status === 'ready') {
      wing = 0.1 + Math.sin(time * 7) * 0.6;
      tilt = 0;
      bob = Math.sin(time * 3) * 1.5;
    } else if (over) {
      wing = -0.3 + Math.sin(time * 3) * 0.1;
      tilt = s.y >= WATER - 1.5 ? 0.15 + Math.sin(time * 2) * 0.08 : clamp((s.time - s.overTime) * 6, 0, 2.6);
    } else {
      wing = wingAngle(s.time - s.flapTime, s.time);
      tilt = clamp(s.vy / 95, -0.35, 0.45);
    }
    drawPelican(ctx, s.x, s.y + bob, 1, tilt, wing, fill, over ? 'dizzy' : 'ok');
    ctx.globalAlpha = 1;
    ctx.restore();

    drawNearWater(ctx, camPx, time);

    ctx.save();
    ctx.translate(-camPx, 0);
    ctx.scale(sc, sc);
    drawParticles(ctx, dt);
    ctx.restore();
  }

  // Background, a bobbing pelican and leaping fish for the menu.
  function drawAttract(ctx, time) {
    const camPx = time * 40;
    drawBackground(ctx, camPx, time);
    const sc = v.scale;
    ctx.save();
    ctx.translate(w * 0.5, 0);
    ctx.scale(sc, sc);
    ctx.strokeStyle = C.foam;
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 2; i++) {
      const t = (time * 0.6 + i * 0.5) % 1;
      const fx = (i ? 16 : -18) + (1 - t) * 10;
      const fy = WATER - Math.sin(t * Math.PI) * 26;
      const vy = -Math.cos(t * Math.PI);
      drawFish(ctx, fx, fy, Math.atan2(vy * 3, -1), i + 1);
    }
    const y = h * 0.43 / sc + Math.sin(time * 2.4) * 2;
    drawPelican(ctx, -2, y, 1.25, Math.sin(time * 1.2) * 0.05, 0.1 + Math.sin(time * 7) * 0.6, (Math.sin(time * 0.8) + 1) * 0.5);
    ctx.restore();
    drawNearWater(ctx, camPx, time);
  }

  return {
    view: v,
    resize,
    drawWorld,
    drawAttract,
    toScreen(s, x, y) {
      return { x: (x - camOf(s)) * v.scale, y: y * v.scale };
    },
  };
}

// ---------- the launcher tile ----------

let tileBg = null;
let tileKey = '';

function paintTile(w, h, dpr) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * dpr));
  c.height = Math.max(1, Math.round(h * dpr));
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  const hz = h * 0.5;
  const sky = g.createLinearGradient(0, 0, 0, hz);
  sky.addColorStop(0, C.night);
  sky.addColorStop(0.55, C.pink);
  sky.addColorStop(1, C.orange);
  g.fillStyle = sky;
  g.fillRect(0, 0, w, hz);
  g.fillStyle = C.sun;
  g.beginPath();
  g.arc(w * 0.7, hz, w * 0.2, Math.PI, 0);
  g.fill();
  const sea = g.createLinearGradient(0, hz, 0, h);
  sea.addColorStop(0, C.sea);
  sea.addColorStop(1, C.deep);
  g.fillStyle = sea;
  g.fillRect(0, hz, w, h - hz);
  return c;
}

// An animated pelican flapping over the waves with a fish leaping beside it.
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
  // drifting wave lines
  ctx.fillStyle = 'rgba(159,247,242,0.5)';
  for (let i = 0; i < 5; i++) {
    const ly = y + h * (0.56 + i * 0.09);
    const lw = w * (0.12 + i * 0.03);
    const lx = x + ((((i * 0.37 - time * (0.05 + i * 0.02)) % 1) + 1) % 1) * (w + lw) - lw;
    ctx.fillRect(lx, ly, lw, Math.max(2, h * 0.012));
  }
  const k = w / 34;
  // a piling on the right
  ctx.fillStyle = C.wood;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2;
  ctx.fillRect(x + w * 0.82, y + h * 0.62, w * 0.1, h * 0.4);
  ctx.strokeRect(x + w * 0.82, y + h * 0.62, w * 0.1, h * 0.4);
  // a fish leaping
  const t = (time * 0.7) % 1;
  ctx.save();
  ctx.translate(x + w * (0.72 - t * 0.12), y + h * 0.86 - Math.sin(t * Math.PI) * h * 0.3);
  ctx.scale(k, k);
  drawFish(ctx, 0, 0, Math.atan2(-Math.cos(t * Math.PI) * 3, -1), 0);
  ctx.restore();
  // the pelican
  const py = y + h * 0.4 + Math.sin(time * 2.6) * h * 0.03;
  drawPelican(ctx, x + w * 0.4, py, k * 1.15, Math.sin(time * 1.3) * 0.06, 0.1 + Math.sin(time * 8) * 0.65, (Math.sin(time * 0.9) + 1) * 0.5);
  ctx.restore();
}
