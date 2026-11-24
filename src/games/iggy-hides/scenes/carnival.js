// The night carnival: a big ferris wheel turning under the stars, a carousel, the big top,
// a row of game booths (ring toss, the duck pond, the prize stand, the high striker), carts
// of cotton candy and popcorn, strings of lights, fireworks, and a crowd out late.
import { TAU, INK, alpha, lin, rad, circle, ellipse, poly, rect, rrect, line, curve, fs, sky, label, shadow, limb, glow, star, neon, twinkle, awning } from '../art/kit.js';
import { bench, bin } from '../art/scenery.js';
import { person, personAt, randomPerson } from '../art/people.js';
import { dog } from '../art/animals.js';
import { drawProp } from '../art/props.js';
import { scatter, keepOutOf, depth } from '../art/crowd.js';

const W = 1800;
const H = 1300;
const GROUND = 600;
const WHEEL = { x: 380, y: 345, r: 240 };
const TROUGH = '#2f8ad8';

const sp = (x, y, o = {}) => ({ x, y, ...o });
const loop = (t, period) => (t % period) / period;

// --- set pieces -------------------------------------------------------------------------------

function wheelFrame(ctx) {
  const { x, y } = WHEEL;
  // two A-frame legs and the boarding platform
  for (const s of [-1, 1]) {
    limb(ctx, [[x, y], [x + s * 170, 700]], '#c9d0de', 12, 3);
  }
  line(ctx, x - 110, 560, x + 110, 560, '#c9d0de', 6);
  rect(ctx, x - 200, 700, 400, 26, '#5a4a7a', 3);
  rect(ctx, x - 200, 726, 400, 34, '#3a2a5a', 3);
  for (let k = 0; k < 9; k++) circle(ctx, x - 180 + k * 45, 713, 4, k % 2 ? '#ffe14d' : '#ff5ab8', 1.5);
}

function bigTop(ctx, x, y) {
  // the circus tent on the right
  const w = 300;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x - w / 2 + 20, y - 150);
  ctx.quadraticCurveTo(x - 60, y - 200, x, y - 300);
  ctx.quadraticCurveTo(x + 60, y - 200, x + w / 2 - 20, y - 150);
  ctx.lineTo(x + w / 2, y);
  ctx.closePath();
  ctx.clip();
  for (let k = -8; k < 8; k++) {
    ctx.fillStyle = k % 2 ? '#e8324a' : '#fff0e0';
    ctx.beginPath();
    ctx.moveTo(x, y - 300);
    ctx.lineTo(x + k * 40, y);
    ctx.lineTo(x + (k + 1) * 40, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x - w / 2 + 20, y - 150);
  ctx.quadraticCurveTo(x - 60, y - 200, x, y - 300);
  ctx.quadraticCurveTo(x + 60, y - 200, x + w / 2 - 20, y - 150);
  ctx.lineTo(x + w / 2, y);
  ctx.closePath();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // the door flaps, open, with warm light inside
  poly(ctx, [[x - 50, y], [x, y - 110], [x + 50, y]], '#ffcf6a', 3);
  glow(ctx, x, y - 40, 90, 'rgba(255,200,90,0.35)');
  line(ctx, x, y - 300, x, y - 350, INK, 3);
  poly(ctx, [[x, y - 350], [x + 30, y - 340], [x, y - 330]], '#ffe14d', 2);
}

function lightString(ctx, x0, y0, x1, y1, sag, n = 14) {
  curve(ctx, x0, y0, (x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1, '#1a1030', 2);
  const cs = ['#ffe14d', '#ff5ab8', '#2ff3ff', '#7cff6b', '#ff8a2a'];
  for (let i = 1; i < n; i++) {
    const k = i / n;
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2 + sag * 2;
    const px = (1 - k) * (1 - k) * x0 + 2 * (1 - k) * k * mx + k * k * x1;
    const py = (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * my + k * k * y1;
    const c = cs[i % cs.length];
    glow(ctx, px, py + 5, 18, alpha(c, 0.45));
    circle(ctx, px, py + 5, 5, c, 1.5);
  }
}

// A lit booth: a striped awning, a sign, warm light inside, a counter. Returns the counter y.
function booth(ctx, x, y, w, a, b, title, signC = '#ffe14d') {
  const h = 210;
  shadow(ctx, x, y + 4, w * 0.55, 14, 0.35);
  rect(ctx, x - w / 2, y - h, w, h, '#5a2a4a', 3);
  ctx.fillStyle = rad(ctx, x, y - h * 0.5, 10, w * 0.6, [[0, 'rgba(255,220,140,0.9)'], [1, 'rgba(255,150,80,0.25)']]);
  ctx.fillRect(x - w / 2 + 10, y - h + 40, w - 20, h - 100);
  rect(ctx, x - w / 2 - 6, y - h - 14, 12, h + 14, '#8a5a3c', 2.5);
  rect(ctx, x + w / 2 - 6, y - h - 14, 12, h + 14, '#8a5a3c', 2.5);
  awning(ctx, x - w / 2 - 10, y - h - 14, w + 20, 40, a, b, Math.max(5, Math.round(w / 30)));
  rrect(ctx, x - w * 0.42, y - h - 70, w * 0.84, 44, 10, '#2a1a4a', 3);
  neon(ctx, title, x, y - h - 48, 24, signC);
  for (let k = 0; k < 8; k++) circle(ctx, x - w * 0.4 + (k * w * 0.8) / 7, y - h - 74, 3.5, k % 2 ? '#ffe14d' : '#ffffff', 1);
  rect(ctx, x - w / 2, y - 64, w, 64, '#c83a5a', 3);
  rect(ctx, x - w / 2 - 6, y - 72, w + 12, 12, '#ffe14d', 2.5);
  for (let k = x - w / 2 + 18; k < x + w / 2; k += 30) star(ctx, k, y - 30, 7, '#ffe14d', 5, 0.45, 1.2);
  return y - 72;
}

function ringToss(ctx, x, y) {
  const top = booth(ctx, x, y, 260, '#2fb5e8', '#ffffff', 'RING TOSS', '#2ff3ff');
  // a pyramid of glass bottles on the counter (plain, no labels)
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 4 - row; i++) {
      const bx = x - 80 + i * 26 + row * 13;
      const by = top - row * 30;
      rrect(ctx, bx - 8, by - 26, 16, 26, 5, row % 2 ? '#7ad8c8' : '#a8e8ff', 2);
      rect(ctx, bx - 3, by - 34, 6, 8, '#7ad8c8', 1.5);
    }
  }
  for (const [rx, ry, c] of [[x + 70, top - 10, '#ff3d5a'], [x + 50, top - 50, '#ffe14d']]) {
    ctx.beginPath();
    ctx.ellipse(rx, ry, 14, 6, 0, 0, TAU);
    ctx.lineWidth = 6;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = c;
    ctx.stroke();
  }
}

function duckPond(ctx, x, y) {
  booth(ctx, x, y, 300, '#ffd23a', '#ff8a2a', 'DUCK POND', '#ffe14d');
  // the water trough in front of the counter
  rrect(ctx, x - 160, y - 92, 320, 60, 14, '#c9d0de', 3);
  rrect(ctx, x - 148, y - 86, 296, 40, 10, TROUGH, 2.5);
}

function prizes(ctx, x, y) {
  const top = booth(ctx, x, y, 280, '#a64dff', '#ffffff', 'PRIZES', '#ff5ab8');
  // two shelves of plush toys: bunnies, unicorns, octopus, and one giant green dragon
  line(ctx, x - 130, top - 70, x + 130, top - 70, '#8a5a3c', 6);
  const bunny = (bx, by, c) => {
    ellipse(ctx, bx - 5, by - 34, 4, 12, c, 1.8);
    ellipse(ctx, bx + 5, by - 34, 4, 12, c, 1.8);
    ellipse(ctx, bx, by - 8, 11, 10, c, 2);
    circle(ctx, bx, by - 22, 9, c, 2);
    circle(ctx, bx - 3, by - 23, 1.4, INK, 0);
    circle(ctx, bx + 3, by - 23, 1.4, INK, 0);
  };
  const unicorn = (bx, by) => {
    ellipse(ctx, bx, by - 9, 13, 10, '#ffffff', 2);
    circle(ctx, bx + 8, by - 24, 9, '#ffffff', 2);
    poly(ctx, [[bx + 6, by - 32], [bx + 10, by - 48], [bx + 13, by - 31]], '#ffe14d', 1.5);
    ellipse(ctx, bx, by - 30, 5, 8, '#ff5ab8', 1.5, INK, -0.5);
    circle(ctx, bx + 10, by - 25, 1.4, INK, 0);
  };
  const octo = (bx, by) => {
    for (let k = -2; k <= 2; k++) curve(ctx, bx + k * 4, by - 8, bx + k * 7, by - 2, bx + k * 9, by, '#ff8a2a', 4);
    ellipse(ctx, bx, by - 16, 12, 11, '#ff8a2a', 2);
    circle(ctx, bx - 4, by - 17, 1.5, INK, 0);
    circle(ctx, bx + 4, by - 17, 1.5, INK, 0);
  };
  bunny(x - 110, top - 72, '#ffb8e0');
  unicorn(x - 80, top - 72);
  octo(x + 80, top - 72);
  bunny(x + 110, top - 72, '#b8e0ff');
  unicorn(x - 110, top);
  bunny(x + 115, top, '#ffe9a0');
  // the giant green plush dragon hanging in the middle (an Iggy decoy)
  const g = '#5fd34a';
  curve(ctx, x - 30, top - 20, x - 80, top - 10, x - 70, top - 50, INK, 14);
  curve(ctx, x - 30, top - 20, x - 80, top - 10, x - 70, top - 50, g, 9);
  ellipse(ctx, x, top - 40, 40, 34, g, 3);
  ellipse(ctx, x + 6, top - 34, 22, 22, '#c8f59a', 0);
  for (const s of [-1, 1]) poly(ctx, [[x + s * 20, top - 64], [x + s * 56, top - 110], [x + s * 50, top - 60]], '#3fae3a', 2.5);
  circle(ctx, x + 4, top - 96, 26, g, 3);
  for (let k = 0; k < 4; k++) poly(ctx, [[x - 18 + k * 12, top - 118], [x - 12 + k * 12, top - 132], [x - 6 + k * 12, top - 118]], '#ffd23a', 1.5);
  circle(ctx, x - 6, top - 100, 6, '#ffffff', 2);
  circle(ctx, x + 14, top - 100, 6, '#ffffff', 2);
  circle(ctx, x - 5, top - 100, 3, INK, 0);
  circle(ctx, x + 15, top - 100, 3, INK, 0);
  curve(ctx, x - 6, top - 84, x + 4, top - 78, x + 14, top - 84, INK, 2.5);
  rrect(ctx, x - 24, top - 22, 48, 18, 4, '#ffe14d', 2);
  label(ctx, '1ST', x, top - 13, 12, INK, { lw: 0 });
}

function highStriker(ctx, x, y) {
  shadow(ctx, x, y + 4, 60, 10, 0.35);
  rect(ctx, x - 50, y - 20, 100, 20, '#c83a5a', 3);
  rrect(ctx, x - 16, y - 34, 32, 16, 4, '#3a3f55', 2.5);
  rect(ctx, x - 14, y - 420, 28, 390, '#fff6e0', 3);
  const cs = ['#ff3d5a', '#ff8a2a', '#ffd23a', '#7cd34a', '#2fb5e8', '#a64dff'];
  for (let k = 0; k < 12; k++) rect(ctx, x - 14, y - 64 - k * 30, 28, 6, cs[k % cs.length], 1.5);
  circle(ctx, x, y - 440, 26, '#ffc93a', 3);
  rrect(ctx, x - 40, y - 500, 80, 34, 8, '#2a1a4a', 3);
  neon(ctx, 'STRONG!', x, y - 483, 18, '#ff3d5a');
}

function cottonCandyCart(ctx, x, y) {
  shadow(ctx, x, y + 4, 100, 12, 0.35);
  for (const wx of [-60, 60]) circle(ctx, x + wx, y - 14, 16, '#3a3f55', 3);
  rrect(ctx, x - 100, y - 110, 200, 90, 10, '#ff9ed2', 3);
  for (let k = 0; k < 6; k++) circle(ctx, x - 80 + k * 32, y - 30, 7, '#ffffff', 1.5);
  rect(ctx, x - 90, y - 180, 6, 70, '#c9d0de', 2);
  rect(ctx, x + 84, y - 180, 6, 70, '#c9d0de', 2);
  awning(ctx, x - 110, y - 196, 220, 30, '#ff5ab8', '#ffffff', 7);
  // the spinning bowl with a pink cloud in it
  ellipse(ctx, x, y - 118, 50, 14, '#c9d0de', 3);
  circle(ctx, x - 14, y - 132, 18, '#ffc0e3', 2);
  circle(ctx, x + 12, y - 136, 20, '#ffb0dc', 2);
  rrect(ctx, x - 70, y - 90, 140, 34, 8, '#ffffff', 2.5);
  label(ctx, 'COTTON CANDY', x, y - 73, 15, '#ff3d9a', { lw: 0 });
}

function popcornCart(ctx, x, y) {
  shadow(ctx, x, y + 4, 90, 12, 0.35);
  for (const wx of [-56, 56]) circle(ctx, x + wx, y - 14, 18, '#ffd23a', 3);
  rect(ctx, x - 90, y - 70, 180, 50, '#e8324a', 3);
  // glass case full of popped corn
  rect(ctx, x - 70, y - 200, 140, 130, 'rgba(220,240,255,0.55)', 3);
  for (let k = 0; k < 40; k++) circle(ctx, x - 62 + ((k * 37) % 124), y - 78 - (k % 7) * 10 - Math.floor(k / 7) * 2, 6, '#fff6c8', 1);
  rect(ctx, x - 80, y - 214, 160, 16, '#e8324a', 3);
  poly(ctx, [[x - 60, y - 214], [x + 60, y - 214], [x, y - 254]], '#e8324a', 3);
  label(ctx, 'POPCORN', x, y - 46, 20, '#ffffff', { lw: 3 });
}

function ticketBooth(ctx, x, y) {
  shadow(ctx, x, y + 4, 80, 12, 0.35);
  rect(ctx, x - 70, y - 170, 140, 170, '#2fb5e8', 3);
  rect(ctx, x - 50, y - 140, 100, 70, '#ffcf6a', 3);
  rect(ctx, x - 58, y - 72, 116, 10, '#ffffff', 2.5);
  poly(ctx, [[x - 86, y - 170], [x + 86, y - 170], [x, y - 230]], '#ff3d5a', 3);
  rrect(ctx, x - 64, y - 52, 128, 30, 6, '#ffe14d', 2.5);
  label(ctx, 'TICKETS', x, y - 37, 18, '#e8324a', { lw: 0 });
}

// a lamp post with a warm glow (drawn here so the glow reads at night)
function nightLamp(ctx, x, y, h) {
  glow(ctx, x, y - h - 12, 70, 'rgba(255,220,130,0.45)');
  rect(ctx, x - 4, y - h, 8, h, '#2a3a5a', 2.5);
  rect(ctx, x - 9, y - 12, 18, 12, '#2a3a5a', 2);
  poly(ctx, [[x - 14, y - h], [x + 14, y - h], [x + 9, y - h - 26], [x - 9, y - h - 26]], '#fff3a0', 2.5);
  poly(ctx, [[x - 16, y - h - 26], [x + 16, y - h - 26], [x, y - h - 40]], '#2a3a5a', 2.5);
}

function stars(ctx, r) {
  for (let k = 0; k < 120; k++) {
    const x = r() * W;
    const y = r() * (GROUND - 120);
    const s = 1 + r() * 2.2;
    ctx.fillStyle = k % 5 ? 'rgba(255,255,255,0.8)' : '#ffe9a0';
    ctx.beginPath();
    ctx.arc(x, y, s, 0, TAU);
    ctx.fill();
  }
  for (let k = 0; k < 8; k++) twinkle(ctx, r() * W, r() * 300 + 20, 8, '#ffffff');
}

// water over the bottom of something floating in the duck trough
function troughCover(x, y, w = 40) {
  return (ctx, t) => {
    ctx.beginPath();
    ctx.moveTo(x - w, y + 2);
    for (let k = -w; k <= w; k += 8) ctx.lineTo(x + k, y + Math.sin(k / 8 + t * 3) * 1.5);
    ctx.lineTo(x + w, y + 36);
    ctx.lineTo(x - w, y + 36);
    ctx.closePath();
    ctx.fillStyle = TROUGH;
    ctx.fill();
  };
}

// a front row of popped corn in the glass case
const popCover = (x, y) => (ctx) => {
  for (let k = 0; k < 7; k++) circle(ctx, x - 30 + k * 10, y + 4 - (k % 2) * 5, 6, '#fff6c8', 1);
};

// a lamp post Iggy hugs: his arms go round the post, so the post is drawn in front
const postCover = (x, y0, y1) => (ctx) => rect(ctx, x - 4, y0, 8, y1 - y0, '#2a3a5a', 2.5);

// --- the picture ------------------------------------------------------------------------------

function back(ctx, r) {
  sky(ctx, W, 0, GROUND, [[0, '#0b0628'], [0.6, '#2b1055'], [1, '#5a2a7a']]);
  stars(ctx, r);
  // the moon, with a face
  glow(ctx, 1520, 110, 110, 'rgba(255,240,190,0.35)');
  circle(ctx, 1520, 110, 46, '#fff3c8', 2);
  circle(ctx, 1505, 100, 7, 'rgba(200,180,120,0.5)', 0);
  circle(ctx, 1535, 125, 10, 'rgba(200,180,120,0.5)', 0);
  // far city lights
  for (let i = 0; i < 18; i++) {
    const bx = 620 + i * 66;
    const bh = 60 + ((i * 41) % 90);
    rect(ctx, bx, GROUND - bh, 56, bh, '#1e1440', 0);
    for (let k = 0; k < 6; k++) if ((i + k) % 3) rect(ctx, bx + 8 + (k % 3) * 15, GROUND - bh + 10 + Math.floor(k / 3) * 22, 8, 10, '#ffd86a', 0);
  }
  // the midway: dark ground with pools of light
  ctx.fillStyle = lin(ctx, 0, GROUND, 0, H, [[0, '#3a2a5a'], [1, '#4a3868']]);
  ctx.fillRect(0, GROUND, W, H - GROUND);
  line(ctx, 0, GROUND, W, GROUND, INK, 3);
  for (let k = 0; k < 160; k++) circle(ctx, r() * W, GROUND + 20 + r() * (H - GROUND), 2 + r() * 2, 'rgba(255,255,255,0.06)', 0);
  for (const [x, y, rr2] of [[380, 760, 260], [1250, 760, 260], [300, 960, 200], [700, 960, 220], [1060, 960, 220], [1420, 960, 160], [900, 1200, 260], [250, 1220, 200], [1550, 1200, 220]]) {
    glow(ctx, x, y, rr2, 'rgba(255,200,120,0.18)');
  }
  // dropped tickets and confetti on the ground
  const cs = ['#ff5ab8', '#ffe14d', '#2ff3ff', '#7cff6b'];
  for (let k = 0; k < 90; k++) {
    ctx.fillStyle = cs[k % 4];
    ctx.save();
    ctx.translate(r() * W, GROUND + 30 + r() * (H - GROUND - 30));
    ctx.rotate(r() * 3);
    ctx.fillRect(-3, -2, 6, 4);
    ctx.restore();
  }
  wheelFrame(ctx);
  bigTop(ctx, 1640, 640);
  // carousel: the pole, the canopy and the round base; the horses are actors
  const cx = 1180;
  rect(ctx, cx - 10, 380, 20, 260, '#ffd23a', 3);
  ellipse(ctx, cx, 660, 230, 40, '#c83a5a', 3);
  ellipse(ctx, cx, 648, 230, 36, '#ffe9c8', 3);
  for (let k = 0; k < 14; k++) circle(ctx, cx - 210 + k * 32, 672, 4, '#ffe14d', 1);
  poly(ctx, [[cx - 240, 400], [cx + 240, 400], [cx, 300]], '#ff3d5a', 3);
  for (let k = 0; k < 8; k++) poly(ctx, [[cx, 300], [cx - 240 + k * 60, 400], [cx - 210 + k * 60, 400]], '#ffffff', 2);
  const n = 12;
  for (let i = 0; i < n; i++) {
    const sx = cx - 240 + i * 40;
    ctx.beginPath();
    ctx.moveTo(sx, 400);
    ctx.lineTo(sx + 40, 400);
    ctx.lineTo(sx + 40, 420);
    ctx.arc(sx + 20, 420, 20, 0, Math.PI);
    ctx.closePath();
    fs(ctx, i % 2 ? '#ffffff' : '#ff3d5a', 2.5);
  }
  line(ctx, cx, 300, cx, 270, INK, 3);
  poly(ctx, [[cx, 270], [cx + 24, 278], [cx, 286]], '#ffe14d', 2);
  // strings of lights over the midway
  lightString(ctx, 0, 640, 560, 660, 30);
  lightString(ctx, 680, 640, 1000, 640, 26, 10);
  lightString(ctx, 1460, 660, 1800, 640, 26, 10);
  lightString(ctx, 0, 1000, 600, 1010, 24);
  lightString(ctx, 1200, 1010, 1800, 1000, 24);

  const D = depth();
  const keep = keepOutOf([...iggy, ...items.flatMap((it) => it.spots)]);
  const place = (x, y, hw, hh, fn) => {
    keep.push({ x, y: y - hh / 2, hw, hh: hh / 2 + 20 });
    D.add(y, fn);
  };
  keep.push({ x: WHEEL.x, y: 560, hw: 300, hh: 220 }); // under the wheel
  keep.push({ x: 1180, y: 560, hw: 260, hh: 140 }); // the carousel
  keep.push({ x: 1640, y: 560, hw: 160, hh: 120 }); // the big top
  place(300, 920, 140, 300, () => ringToss(ctx, 300, 920));
  place(680, 920, 160, 300, () => duckPond(ctx, 680, 920));
  place(1060, 920, 150, 300, () => prizes(ctx, 1060, 920));
  place(1450, 920, 60, 500, () => highStriker(ctx, 1450, 920));
  place(250, 1250, 120, 200, () => cottonCandyCart(ctx, 250, 1250));
  place(1550, 1250, 100, 260, () => popcornCart(ctx, 1550, 1250));
  place(1700, 960, 90, 230, () => ticketBooth(ctx, 1700, 960));
  for (const [x, y] of [[520, 1050], [1250, 1060], [60, 760]]) place(x, y, 24, 240, () => nightLamp(ctx, x, y, 200));
  place(860, 1270, 70, 60, () => bench(ctx, 860, 1270, 130, '#ff5ab8'));
  place(1180, 1250, 30, 70, () => bin(ctx, 1180, 1250, '#2fb5e8'));
  place(40, 1250, 30, 70, () => bin(ctx, 40, 1250, '#ff8a2a'));
  // patches the actors use
  keep.push({ x: 1390, y: 880, hw: 50, hh: 80 }); // the kid at the high striker
  keep.push({ x: 660, y: 1130, hw: 70, hh: 80 }); // juggler
  keep.push({ x: 1000, y: 1120, hw: 60, hh: 100 }); // clown
  keep.push({ x: 420, y: 1110, hw: 60, hh: 80 }); // balloon kid
  keep.push({ x: 1380, y: 1180, hw: 60, hh: 60 }); // dog
  keep.push({ x: 1720, y: 1220, hw: 60, hh: 90 }); // glow stick kids
  // the crowd out for the night
  const pts = scatter(r, 40, { x0: 40, y0: 650, x1: 1760, y1: 1280 }, keep, 62);
  pts.forEach((p, i) => {
    const seed = 700 + i;
    const kind = i % 5;
    if (kind === 0) {
      D.add(p.y, () => {
        personAt(ctx, p.x - 18, p.y, randomPerson(seed, { pose: 'walk', kid: false, item: null }), 0);
        personAt(ctx, p.x + 18, p.y + 4, randomPerson(seed + 1, { pose: 'walk', kid: true, item: 'balloon', itemColour: ['#ff5ab8', '#2ff3ff', '#ffe14d'][i % 3] }), 0);
      });
    } else if (kind === 1) {
      D.add(p.y, () => personAt(ctx, p.x, p.y, randomPerson(seed, { pose: 'point', item: null, flip: i % 2 === 0 }), 0));
    } else if (kind === 2) {
      D.add(p.y, () => {
        personAt(ctx, p.x - 16, p.y, randomPerson(seed, { pose: 'stand', kid: true, mood: 'wow', item: null }), 0);
        personAt(ctx, p.x + 18, p.y + 2, randomPerson(seed + 5, { pose: 'hold', item: 'drink', flip: true }), 0);
      });
    } else if (kind === 3) {
      D.add(p.y, () => personAt(ctx, p.x, p.y, randomPerson(seed, { pose: 'cheer', kid: i % 2 === 0, item: null, hat: i % 3 ? 'party' : null, hatColour: '#2ff3ff' }), 0));
    } else {
      D.add(p.y, () => {
        personAt(ctx, p.x - 14, p.y, randomPerson(seed, { pose: 'walk', item: 'phone' }), 0);
        personAt(ctx, p.x + 20, p.y + 6, randomPerson(seed + 3, { pose: 'wave', kid: true, item: null, flip: true }), 0);
      });
    }
  });
  D.draw();
}

// --- moving things -----------------------------------------------------------------------------

const GONDOLA = ['#ff3d5a', '#ffd23a', '#2fb5e8', '#7cd34a', '#a64dff', '#ff8a2a', '#ff5ab8', '#21c7a8'];

const actors = [
  // the ferris wheel, turning slowly, gondolas hanging level, bulbs twinkling
  {
    x: WHEEL.x, y: WHEEL.y, hw: WHEEL.r + 50, hh: WHEEL.r + 60,
    keep: [{ x: WHEEL.x, y: WHEEL.y, hw: WHEEL.r + 50, hh: WHEEL.r + 35 }],
    draw(ctx, t) {
      const { x, y, r } = WHEEL;
      const a0 = t * 0.12;
      ctx.lineWidth = 5;
      ctx.strokeStyle = INK;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.moveTo(x + r * 0.72, y);
      ctx.arc(x, y, r * 0.72, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ff5ab8';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = '#2ff3ff';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.72, 0, TAU);
      ctx.stroke();
      const n = 8;
      for (let i = 0; i < 16; i++) {
        const a = a0 + (i / 16) * TAU;
        line(ctx, x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, 'rgba(255,255,255,0.7)', 2);
      }
      for (let i = 0; i < 24; i++) {
        const a = a0 + (i / 24) * TAU;
        const on = Math.floor(t * 4 + i) % 3 !== 0;
        if (on) glow(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, 12, 'rgba(255,240,140,0.6)');
        circle(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, 3.5, on ? '#fff6a8' : '#8a7a5a', 0);
      }
      circle(ctx, x, y, 22, '#ffe14d', 3);
      star(ctx, x, y, 12, '#ff5ab8', 5, 0.45, 2);
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * TAU;
        const gx = x + Math.cos(a) * r;
        const gy = y + Math.sin(a) * r;
        const swing = Math.sin(t * 1.5 + i) * 0.06;
        ctx.save();
        ctx.translate(gx, gy);
        ctx.rotate(swing);
        line(ctx, 0, 0, 0, 14, INK, 3);
        ctx.beginPath();
        ctx.moveTo(-26, 14);
        ctx.lineTo(26, 14);
        ctx.lineTo(22, 46);
        ctx.quadraticCurveTo(0, 54, -22, 46);
        ctx.closePath();
        fs(ctx, GONDOLA[i], 2.5);
        // riders' heads poking up
        for (const hx of [-10, 10]) {
          if ((i + hx) % 3 === 0) continue;
          circle(ctx, hx, 8, 8, ['#ffd9b8', '#c68a5a', '#9a6440', '#f5c49c'][(i + (hx > 0 ? 1 : 0)) % 4], 2);
        }
        rect(ctx, -26, 12, 52, 6, '#ffffff', 2);
        ctx.restore();
      }
    },
  },
  // carousel horses (and one green dragon seat) going up and down as they go round
  {
    x: 1180, y: 540, hw: 240, hh: 120,
    draw(ctx, t) {
      const cx = 1180;
      const items = [];
      for (let i = 0; i < 6; i++) {
        const a = t * 0.6 + (i / 6) * TAU;
        items.push({ i, a, x: cx + Math.cos(a) * 190, depth: Math.sin(a) });
      }
      items.sort((p, q) => p.depth - q.depth);
      for (const h of items) {
        const k = (0.75 + h.depth * 0.25) * 1.3;
        const y = 600 + Math.sin(t * 3 + h.i * 1.7) * 18;
        line(ctx, h.x, 420, h.x, 640, '#ffd23a', 4);
        ctx.save();
        ctx.translate(h.x, y);
        ctx.scale(k * (Math.cos(h.a) > 0 ? -1 : 1), k);
        ctx.globalAlpha = 0.6 + 0.4 * (h.depth + 1) / 2;
        if (h.i === 3) {
          // the green dragon seat (an Iggy decoy)
          ellipse(ctx, 0, 0, 34, 16, '#5fd34a', 2.5);
          circle(ctx, 30, -20, 13, '#5fd34a', 2.5);
          for (let s = 0; s < 4; s++) poly(ctx, [[-20 + s * 10, -14], [-15 + s * 10, -26], [-10 + s * 10, -14]], '#ffd23a', 1.5);
          circle(ctx, 33, -22, 3, INK, 0);
        } else {
          const c = ['#ffffff', '#ffd6e8', '#d6f0ff', '#fff0c0', '#e8d6ff', '#ffffff'][h.i];
          ellipse(ctx, 0, 0, 34, 16, c, 2.5);
          limb(ctx, [[24, -6], [38, -30]], c, 12, 2.5);
          ellipse(ctx, 44, -32, 13, 8, c, 2.5, INK, 0.4);
          poly(ctx, [[30, -40], [20, -22], [28, -20]], ['#ff5ab8', '#2fb5e8', '#ffd23a', '#a64dff', '#7cd34a', '#ff8a2a'][h.i], 1.5);
          for (const lx of [-22, 18]) limb(ctx, [[lx, 10], [lx + 6, 30]], c, 6);
          rect(ctx, -12, -18, 22, 6, '#ff3d5a', 1.5);
        }
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      // chasing lights round the canopy
      for (let i = 0; i < 12; i++) {
        const on = Math.floor(t * 6 + i) % 2 === 0;
        circle(ctx, 960 + i * 40, 438, 4.5, on ? '#fff6a8' : '#8a6a3a', 1.2);
      }
    },
  },
  // fireworks over the city
  {
    x: 1100, y: 200, hw: 600, hh: 160, over: true,
    draw(ctx, t) {
      for (let j = 0; j < 3; j++) {
        const k = loop(t + j * 1.3, 3.9);
        const fx = 760 + j * 300 + Math.sin(j * 4) * 60;
        const fy = 140 + j * 40;
        const cs = ['#ff5ab8', '#2ff3ff', '#ffe14d'][j];
        if (k < 0.25) {
          const a = k / 0.25;
          circle(ctx, fx, GROUND - 40 - a * (GROUND - 40 - fy), 3, '#ffffff', 0);
        } else if (k < 0.8) {
          const a = (k - 0.25) / 0.55;
          ctx.globalAlpha = 1 - a;
          for (let i = 0; i < 14; i++) {
            const ang = (i / 14) * TAU;
            const d = 20 + a * 90;
            line(ctx, fx + Math.cos(ang) * d * 0.6, fy + Math.sin(ang) * d * 0.6 + a * 20, fx + Math.cos(ang) * d, fy + Math.sin(ang) * d + a * 20, cs, 4);
          }
          ctx.globalAlpha = 1;
        }
      }
    },
  },
  // the high striker: the kid rings the bell; the strongman next to him can't
  {
    x: 1420, y: 700, hw: 90, hh: 260,
    keep: [{ x: 1390, y: 880, hw: 50, hh: 80 }],
    draw(ctx, t) {
      const k = loop(t, 4);
      const hitting = k < 0.15;
      const puck = k < 0.15 ? 0 : k < 0.45 ? (k - 0.15) / 0.3 : k < 0.75 ? 1 - (k - 0.45) / 0.3 : 0;
      const py = 880 - puck * 400;
      rrect(ctx, 1438, py - 10, 24, 18, 5, '#e8324a', 2);
      if (puck > 0.96) {
        glow(ctx, 1450, 480, 70, 'rgba(255,230,120,0.7)');
        label(ctx, 'DING!', 1520, 450, 22, '#ffe14d', { lw: 4 });
      }
      ctx.save();
      ctx.translate(1390, 940);
      shadow(ctx, 0, 0, 16);
      person(ctx, { pose: puck > 0.9 ? 'cheer' : 'hold', kid: true, skin: '#9a6440', hair: '#16101e', hairStyle: 'pony', top: '#ff5ab8', outfit: 'tee', bottom: '#2a4a8a', mood: puck > 0.9 ? 'wow' : 'smile', phase: 2 }, t);
      ctx.restore();
      // the mallet
      const ang = hitting ? 0.2 : -1.2;
      ctx.save();
      ctx.translate(1406, 880);
      ctx.rotate(ang);
      line(ctx, 0, 0, 36, 0, '#a8743f', 4);
      rrect(ctx, 32, -10, 16, 20, 3, '#8a5a2c', 2);
      ctx.restore();
    },
  },
  // a juggler with three balls
  {
    x: 660, y: 1080, hw: 70, hh: 130,
    keep: [{ x: 660, y: 1130, hw: 50, hh: 80 }],
    draw(ctx, t) {
      ctx.save();
      ctx.translate(660, 1200);
      shadow(ctx, 0, 0, 22);
      person(ctx, { pose: 'cheer', skin: '#e0a878', hair: '#2a1a10', hairStyle: 'spiky', top: '#ffd23a', stripes: '#ff3d5a', outfit: 'tee', bottom: '#a64dff', hat: 'party', hatColour: '#2ff3ff', phase: 4 }, t);
      ctx.restore();
      for (let i = 0; i < 3; i++) {
        const a = t * 4 + (i * TAU) / 3;
        circle(ctx, 660 + Math.cos(a) * 34, 1060 - Math.abs(Math.sin(a)) * 60, 8, ['#ff3d5a', '#2ff3ff', '#7cff6b'][i], 2);
      }
    },
  },
  // a clown with a squirting flower, soaking a man who isn't amused
  {
    x: 1000, y: 1130, hw: 90, hh: 110,
    keep: [{ x: 1000, y: 1120, hw: 60, hh: 100 }],
    draw(ctx, t) {
      const k = loop(t, 5);
      ctx.save();
      ctx.translate(970, 1200);
      shadow(ctx, 0, 0, 24);
      person(ctx, { pose: 'point', skin: '#ffffff', hair: '#ff5a2a', hairStyle: 'curly', top: '#2fb5e8', stripes: '#ffe14d', outfit: 'tee', bottom: '#ff3d5a', shoes: '#ff3d5a', hat: 'party', hatColour: '#ff5ab8', phase: 1 }, t);
      circle(ctx, 0, -99, 5, '#ff3d3d', 1.5);
      ctx.restore();
      circle(ctx, 1010, 1112, 7, '#ffe14d', 1.5);
      if (k > 0.3 && k < 0.6) {
        ctx.strokeStyle = 'rgba(160,230,255,0.95)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(1012, 1110);
        ctx.quadraticCurveTo(1030, 1080, 1046, 1102);
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(1050, 1215);
      shadow(ctx, 0, 0, 22);
      person(ctx, { pose: 'stand', flip: true, skin: '#f5c49c', hair: '#7a4a22', hairStyle: 'short', top: '#7cd34a', outfit: 'tee', bottom: '#3a3f55', mood: k > 0.4 && k < 0.9 ? 'grr' : 'smile', phase: 7 }, t);
      ctx.restore();
    },
  },
  // a kid whose balloon got away: it drifts up, up and away, again and again
  {
    x: 420, y: 900, hw: 60, hh: 300,
    keep: [{ x: 420, y: 1120, hw: 40, hh: 70 }],
    draw(ctx, t) {
      const k = loop(t, 7);
      const by = 1060 - k * 620;
      const bx = 430 + Math.sin(t * 1.4) * 14 + k * 40;
      ctx.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1;
      curve(ctx, bx, by + 18, bx - 6, by + 40, bx + 4, by + 60, '#ffffff', 1.5);
      ellipse(ctx, bx, by, 16, 20, '#7cff6b', 2.5);
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(420, 1180);
      shadow(ctx, 0, 0, 16);
      person(ctx, { pose: 'point', kid: true, skin: '#ffd9b8', hair: '#f2d27a', hairStyle: 'bun', top: '#a64dff', outfit: 'dress', mood: 'wow', phase: 3 }, t);
      ctx.restore();
    },
  },
  // a dog with cotton candy stuck on its head
  {
    x: 1380, y: 1180, hw: 80, hh: 50,
    draw(ctx, t) {
      const x = 1380 + Math.sin(t * 0.9) * 40;
      const flip = Math.cos(t * 0.9) < 0;
      ctx.save();
      ctx.translate(x, 1215);
      shadow(ctx, 0, 0, 24);
      dog(ctx, { pose: 'run', flip, colour: '#3a3f55', ear: '#16101e', collar: '#ff5ab8' }, t);
      ctx.restore();
      circle(ctx, x + (flip ? -20 : 20), 1176, 13, '#ffb0dc', 2);
    },
  },
  // kids waving glow sticks
  {
    x: 1720, y: 1180, hw: 70, hh: 110,
    keep: [{ x: 1720, y: 1220, hw: 60, hh: 90 }],
    draw(ctx, t) {
      for (const [x, seed, c] of [[1690, 0, '#7cff6b'], [1745, 1, '#ff5ab8']]) {
        ctx.save();
        ctx.translate(x, 1280);
        person(ctx, { ...randomPerson(900 + seed, { kid: true, item: null }), pose: 'stand' }, t);
        ctx.restore();
        const a = Math.sin(t * 5 + seed * 2) * 0.9;
        const hx = x + 17;
        const hy = 1214;
        const ex = hx + Math.sin(a) * 34;
        const ey = hy - Math.cos(a) * 34;
        ctx.lineCap = 'round';
        ctx.strokeStyle = alpha(c, 0.35);
        ctx.lineWidth = 16;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        line(ctx, hx, hy, ex, ey, c, 6);
      }
    },
  },
  // rubber ducks bobbing along the trough (Iggy's float spot stays clear at the right end)
  {
    x: 640, y: 830, hw: 120, hh: 30,
    keep: [{ x: 635, y: 830, hw: 100, hh: 24 }],
    draw(ctx, t) {
      for (let i = 0; i < 5; i++) {
        const x = 545 + ((t * 18 + i * 36) % 180);
        ctx.save();
        ctx.translate(x, 832 + Math.sin(t * 3 + i) * 1.5);
        ctx.scale(0.75, 0.75);
        drawProp(ctx, 'duck', { colour: ['#ffd23a', '#ff8a2a', '#ffd23a', '#ff5ab8', '#ffd23a'][i], phase: i }, t);
        ctx.restore();
      }
    },
  },
  // the big top's flag and a ringmaster waving everyone in
  {
    x: 1640, y: 450, hw: 60, hh: 220,
    keep: [{ x: 1600, y: 590, hw: 30, hh: 70 }],
    draw(ctx, t) {
      ctx.save();
      ctx.translate(1600, 650);
      person(ctx, { pose: 'wave', skin: '#c68a5a', hair: '#16101e', hairStyle: 'short', top: '#e8324a', outfit: 'suit', bottom: '#16101e', hat: 'band', hatColour: '#16101e', phase: 2 }, t);
      ctx.restore();
    },
  },
];

// --- hiding places ----------------------------------------------------------------------------

const iggy = [
  sp(350, 848, { pose: 'peek' }), // on the ring toss counter, by the bottles
  sp(1112, 776, { pose: 'peek', s: 0.9 }), // on the prize shelf by the dragon
  sp(1180, 1186, { pose: 'peek' }), // in the bin
  sp(1700, 888, { pose: 'peek' }), // in the ticket window
  sp(772, 836, { pose: 'float', s: 0.8, cover: troughCover(772, 836, 34) }), // in the duck pond
  sp(1530, 1150, { pose: 'peek', s: 0.9, cover: popCover(1530, 1150) }), // in the popcorn
  sp(502, 940, { pose: 'cling', s: 0.9, cover: postCover(520, 900, 990) }), // up a lamp post
  sp(200, 1160, { pose: 'peek' }), // behind the cotton candy sign
];

const items = [
  { id: 'ticket', prop: 'ticket', o: { colour: '#ff3d5a' }, count: 3, spots: [sp(120, 700), sp(880, 720), sp(1540, 750), sp(330, 1060), sp(1310, 1120)] },
  { id: 'cupcake', prop: 'cupcake', spots: [sp(980, 790), sp(110, 960)] },
  { id: 'donut', prop: 'donut', spots: [sp(600, 1240), sp(1540, 860)] },
  { id: 'pizza', prop: 'pizza', spots: [sp(1290, 1250), sp(740, 1040)] },
  { id: 'key', prop: 'key', spots: [sp(860, 1220), sp(60, 900)] },
  { id: 'watch', prop: 'watch', spots: [sp(1600, 1000), sp(540, 760)] },
  { id: 'sunglasses', prop: 'sunglasses', o: { colour: '#2a2a44', frame: '#2ff3ff' }, spots: [sp(1240, 960), sp(400, 1000)] },
  { id: 'camera', prop: 'camera', spots: [sp(1650, 1170), sp(220, 760)] },
  { id: 'trophy', prop: 'trophy', spots: [sp(960, 700), sp(1760, 760)] },
  { id: 'tophat', prop: 'tophat', spots: [sp(770, 1150), sp(1520, 700)] },
  { id: 'glove', prop: 'glove', o: { colour: '#ffe14d' }, spots: [sp(1150, 1040), sp(40, 1080)] },
  { id: 'trumpet', prop: 'trumpet', spots: [sp(920, 1050), sp(1640, 1120)] },
  { id: 'maracas', prop: 'maracas', spots: [sp(560, 670), sp(1340, 1260)] },
  { id: 'guitar', prop: 'guitar', spots: [sp(830, 650), sp(140, 1240)] },
  { id: 'lollipop', prop: 'lollipop', o: { colour: '#2ff3ff' }, spots: [sp(1520, 640), sp(700, 1260)] },
  { id: 'cone', prop: 'cone', spots: [sp(380, 1262), sp(1760, 1062)] },
  { id: 'dino', prop: 'dino', spots: [sp(160, 830), sp(1090, 1180)] },
  { id: 'flower', prop: 'flower', o: { colour: '#ff8a2a' }, count: 2, spots: [sp(960, 1250), sp(610, 1110), sp(1700, 680)] },
];

function sticker(ctx, r, t) {
  ctx.save();
  ctx.scale(r / 100, r / 100);
  ctx.fillStyle = lin(ctx, 0, -100, 0, 100, [[0, '#0b0628'], [0.7, '#5a2a7a'], [0.71, '#3a2a5a'], [1, '#4a3868']]);
  ctx.beginPath();
  ctx.arc(0, 0, 100, 0, TAU);
  ctx.fill();
  for (const [x, y] of [[-70, -50], [60, -70], [20, -85], [-30, -80]]) twinkle(ctx, x, y, 6);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#ff5ab8';
  ctx.beginPath();
  ctx.arc(-20, -10, 60, 0, TAU);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = t * 0.3 + (i / 8) * TAU;
    line(ctx, -20, -10, -20 + Math.cos(a) * 60, -10 + Math.sin(a) * 60, 'rgba(255,255,255,0.7)', 2);
    circle(ctx, -20 + Math.cos(a) * 60, -10 + Math.sin(a) * 60, 7, GONDOLA[i], 1.5);
  }
  ctx.translate(45, 75);
  drawProp(ctx, 'iggy-stand', {}, t);
  ctx.restore();
}

export default {
  id: 'carnival',
  name: 'Night Carnival',
  W, H,
  edge: '#1a1030',
  back,
  actors,
  iggy,
  items,
  sticker,
};
