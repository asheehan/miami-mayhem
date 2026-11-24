// Flamingo Falls mini golf: a windmill hole, a giant pink flamingo to putt between, a pirate
// ship in the lagoon under a waterfall, a smoking volcano, a big green toy dinosaur, a gator
// that swallows balls, a snack and score hut, and families putting everywhere.
import { TAU, INK, lin, circle, ellipse, poly, rect, rrect, line, curve, fs, sky, sun, cloud, palm, speckle, label, shadow, limb, bush, glow } from '../art/kit.js';
import { bench, bin, fence } from '../art/scenery.js';
import { person, personAt, randomPerson } from '../art/people.js';
import { dog, gull, duck, bee } from '../art/animals.js';
import { drawProp } from '../art/props.js';
import { scatter, keepOutOf, depth } from '../art/crowd.js';

const W = 1800;
const H = 1300;
const TOP = 190; // where the course starts under the sky
const POND = { x: 1460, y: 590, rx: 300, ry: 120 };
const WATER = '#3ab8d8';

const sp = (x, y, o = {}) => ({ x, y, ...o });

// --- little bits ------------------------------------------------------------------------------

// A putting green: a rounded slab of bright turf with a timber edge.
function green(ctx, x, y, w, h, r = 60) {
  rrect(ctx, x - w / 2, y - h / 2 + 8, w, h, r, '#8a5a2c', 3);
  rrect(ctx, x - w / 2, y - h / 2, w, h, r, '#7ee06a', 3);
  ctx.save();
  rr0(ctx, x - w / 2, y - h / 2, w, h, r);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 14;
  for (let k = -h; k < w + h; k += 40) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + k, y - h / 2);
    ctx.lineTo(x - w / 2 + k - h, y + h / 2);
    ctx.stroke();
  }
  ctx.restore();
}
function rr0(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// A cup with a numbered yellow pennant (not the red findable flag).
function cup(ctx, x, y, n) {
  ellipse(ctx, x, y, 13, 6, '#1a2a1a', 2);
  line(ctx, x + 2, y, x + 2, y - 80, '#ffffff', 3);
  line(ctx, x + 2, y, x + 2, y - 80, INK, 1);
  poly(ctx, [[x + 3, y - 80], [x + 40, y - 70], [x + 3, y - 58]], '#ffe14d', 2);
  label(ctx, String(n), x + 16, y - 70, 12, INK, { lw: 0 });
}

function path(ctx, pts, w = 70) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = INK;
  ctx.lineWidth = w + 6;
  ctx.stroke();
  ctx.strokeStyle = '#e8d8b0';
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.setLineDash([2, 34]);
  ctx.strokeStyle = 'rgba(140,110,70,0.5)';
  ctx.lineWidth = w * 0.6;
  ctx.stroke();
  ctx.setLineDash([]);
}

function rock(ctx, x, y, s, c = '#9a8a7a') {
  poly(ctx, [[x - s, y], [x - s * 0.8, y - s * 0.7], [x - s * 0.1, y - s], [x + s * 0.7, y - s * 0.75], [x + s, y]], c, 2.5);
  line(ctx, x - s * 0.3, y - s * 0.6, x + s * 0.2, y - s * 0.3, 'rgba(22,11,51,0.3)', 2);
}

// A golfer with a putter. swing 0 = putter at the ball, positive = drawn back.
function golfer(ctx, x, y, o, t = 0, swing = 0) {
  shadow(ctx, x, y, o.kid ? 16 : 22);
  ctx.save();
  ctx.translate(x, y);
  if (o.flip) ctx.scale(-1, 1);
  person(ctx, { ...o, flip: false, pose: 'hold', item: null }, t);
  const S = o.kid ? 0.7 : 1;
  const hx = 24 * S;
  const hy = -68 * S;
  const len = 70 * S;
  const a = 0.18 + swing;
  const ex = hx + Math.sin(a) * len;
  const ey = hy + Math.cos(a) * len;
  line(ctx, hx, hy, ex, ey, INK, 4);
  line(ctx, hx, hy, ex, ey, '#c9d0de', 2);
  rrect(ctx, ex - 4, ey - 4, 16, 7, 3, '#3a3f55', 1.5);
  rrect(ctx, hx - 3, hy - 3, 6, 14, 2, o.grip || '#ff3d5a', 1.5);
  ctx.restore();
}

function ball(ctx, x, y, r = 6) {
  circle(ctx, x, y, r, '#ffffff', 2);
}

// --- set pieces -------------------------------------------------------------------------------

function windmill(ctx, x, y) {
  shadow(ctx, x + 10, y + 6, 110, 18, 0.2);
  poly(ctx, [[x - 75, y], [x + 75, y], [x + 55, y - 210], [x - 55, y - 210]], '#ff7a6a', 3);
  ctx.strokeStyle = 'rgba(22,11,51,0.25)';
  ctx.lineWidth = 2;
  for (let k = 1; k < 8; k++) line(ctx, x - 75 + k * 2.5, y - k * 26, x + 75 - k * 2.5, y - k * 26, 'rgba(22,11,51,0.22)', 2);
  poly(ctx, [[x - 70, y - 206], [x + 70, y - 206], [x, y - 270]], '#2fb5e8', 3);
  // little window and the door where the ball goes in
  rrect(ctx, x - 16, y - 170, 32, 36, 14, '#fff1a0', 2.5);
  line(ctx, x, y - 170, x, y - 134, INK, 2);
  ctx.beginPath();
  ctx.moveTo(x - 32, y);
  ctx.lineTo(x - 32, y - 56);
  ctx.arc(x, y - 56, 32, Math.PI, 0);
  ctx.lineTo(x + 32, y);
  ctx.closePath();
  fs(ctx, '#2a1a2a', 3);
  rect(ctx, x - 44, y - 6, 88, 8, '#ffffff', 2);
  // flower boxes
  rrect(ctx, x - 70, y - 104, 30, 14, 3, '#8a5a2c', 2);
  rrect(ctx, x + 40, y - 104, 30, 14, 3, '#8a5a2c', 2);
  for (let k = 0; k < 3; k++) {
    circle(ctx, x - 64 + k * 9, y - 108, 5, '#ffd23a', 1.5);
    circle(ctx, x + 46 + k * 9, y - 108, 5, '#ffffff', 1.5);
  }
  circle(ctx, x, y - 232, 10, '#ffe14d', 2.5);
}

function flamingoStatue(ctx, x, y) {
  // a giant fibreglass flamingo; you putt between its legs
  shadow(ctx, x, y + 4, 90, 14);
  rect(ctx, x - 60, y - 10, 120, 14, '#e8e0d0', 2.5);
  for (const lx of [-26, 26]) {
    limb(ctx, [[x + lx, y - 8], [x + lx * 0.6, y - 170]], '#ff5a9e', 10);
    ellipse(ctx, x + lx * 1.2, y - 6, 18, 6, '#ff5a9e', 2);
  }
  ellipse(ctx, x, y - 200, 95, 55, '#ff7ab6', 3);
  ellipse(ctx, x - 20, y - 205, 60, 32, '#ff5a9e', 2.5, INK, -0.2);
  poly(ctx, [[x - 90, y - 210], [x - 140, y - 236], [x - 120, y - 196]], '#ff5a9e', 2.5);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 26;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 70, y - 220);
  ctx.quadraticCurveTo(x + 130, y - 300, x + 80, y - 360);
  ctx.stroke();
  ctx.strokeStyle = '#ff7ab6';
  ctx.lineWidth = 20;
  ctx.stroke();
  circle(ctx, x + 84, y - 370, 26, '#ff7ab6', 3);
  ctx.beginPath();
  ctx.moveTo(x + 102, y - 378);
  ctx.quadraticCurveTo(x + 150, y - 372, x + 140, y - 330);
  ctx.quadraticCurveTo(x + 124, y - 352, x + 104, y - 360);
  fs(ctx, '#2a1a2a', 2.5);
  rect(ctx, x + 104, y - 376, 18, 12, '#ffffff', 0);
  circle(ctx, x + 86, y - 378, 6, '#ffffff', 2);
  circle(ctx, x + 88, y - 378, 3, INK, 0);
}

function pirateShip(ctx, x, y) {
  // sits in the lagoon; waterline at y
  for (const [mx, h] of [[-90, 190], [0, 250], [90, 170]]) {
    rect(ctx, x + mx - 5, y - 40 - h, 10, h, '#6e4426', 2.5);
    ctx.beginPath();
    ctx.moveTo(x + mx - 50, y - 40 - h + 30);
    ctx.quadraticCurveTo(x + mx, y - 40 - h + 50, x + mx + 50, y - 40 - h + 30);
    ctx.lineTo(x + mx + 46, y - 40 - h * 0.35);
    ctx.quadraticCurveTo(x + mx, y - 40 - h * 0.25, x + mx - 46, y - 40 - h * 0.35);
    ctx.closePath();
    fs(ctx, '#fff6e0', 2.5);
  }
  // crow's nest on the main mast
  rrect(ctx, x - 26, y - 248, 52, 30, 5, '#a8743f', 2.5);
  line(ctx, x - 26, y - 236, x + 26, y - 236, 'rgba(22,11,51,0.4)', 2);
  // hull
  ctx.beginPath();
  ctx.moveTo(x - 170, y - 70);
  ctx.lineTo(x + 150, y - 70);
  ctx.lineTo(x + 190, y - 100);
  ctx.quadraticCurveTo(x + 170, y + 6, x + 100, y + 8);
  ctx.lineTo(x - 120, y + 8);
  ctx.quadraticCurveTo(x - 170, y - 10, x - 190, y - 90);
  ctx.closePath();
  fs(ctx, '#8a5a2c', 3);
  line(ctx, x - 176, y - 48, x + 170, y - 48, '#ffd23a', 5);
  for (let k = 0; k < 5; k++) circle(ctx, x - 110 + k * 50, y - 26, 8, '#3a2a1a', 2.5);
  // cannon
  rrect(ctx, x + 150, y - 92, 42, 14, 6, '#3a3f55', 2.5);
  label(ctx, 'HOLE 7', x - 20, y - 8, 16, '#ffd23a', { lw: 3 });
}

function volcano(ctx, x, y) {
  shadow(ctx, x, y + 6, 190, 22);
  ctx.beginPath();
  ctx.moveTo(x - 190, y);
  ctx.quadraticCurveTo(x - 90, y - 90, x - 50, y - 190);
  ctx.lineTo(x + 50, y - 190);
  ctx.quadraticCurveTo(x + 90, y - 90, x + 190, y);
  ctx.closePath();
  fs(ctx, '#8a6a5a', 3);
  // lava drips
  for (const [dx, len] of [[-34, 60], [-6, 95], [24, 50], [44, 80]]) {
    ctx.beginPath();
    ctx.moveTo(x + dx - 9, y - 190);
    ctx.lineTo(x + dx - 7, y - 190 + len);
    ctx.arc(x + dx, y - 190 + len, 7, Math.PI, 0, true);
    ctx.lineTo(x + dx + 9, y - 190);
    ctx.closePath();
    fs(ctx, '#ff7a2a', 2);
  }
  ellipse(ctx, x, y - 190, 52, 14, '#ff3d1a', 3);
  ellipse(ctx, x, y - 188, 40, 8, '#ffd23a', 0);
  // the tunnel the ball runs through
  ctx.beginPath();
  ctx.moveTo(x - 34, y);
  ctx.arc(x, y, 34, Math.PI, 0);
  ctx.closePath();
  fs(ctx, '#2a1a1a', 3);
  rock(ctx, x - 150, y + 4, 26, '#7a6a5a');
  rock(ctx, x + 140, y + 6, 22, '#7a6a5a');
}

function dinoStatue(ctx, x, y) {
  // a big green toy T-rex (an Iggy decoy), mouth open, tunnel between its legs
  const g = '#4fc93a';
  shadow(ctx, x, y + 6, 160, 20);
  ctx.beginPath();
  ctx.moveTo(x - 60, y - 110);
  ctx.quadraticCurveTo(x - 160, y - 90, x - 230, y - 10);
  ctx.quadraticCurveTo(x - 150, y - 60, x - 50, y - 70);
  fs(ctx, g, 3);
  for (const lx of [-50, 40]) {
    rrect(ctx, x + lx - 22, y - 110, 44, 110, 18, g, 3);
    ellipse(ctx, x + lx, y - 4, 30, 10, g, 2.5);
  }
  ellipse(ctx, x, y - 150, 95, 70, g, 3);
  ellipse(ctx, x + 14, y - 135, 50, 42, '#b5ec7a', 0);
  for (let k = 0; k < 7; k++) poly(ctx, [[x - 90 + k * 26, y - 206 + Math.abs(k - 3) * 6], [x - 78 + k * 26, y - 236 + Math.abs(k - 3) * 6], [x - 66 + k * 26, y - 206 + Math.abs(k - 3) * 6]], '#ffd23a', 2);
  limb(ctx, [[x + 60, y - 190], [x + 100, y - 250]], g, 50, 3);
  ellipse(ctx, x + 140, y - 268, 62, 40, g, 3);
  ctx.beginPath();
  ctx.moveTo(x + 120, y - 252);
  ctx.lineTo(x + 205, y - 250);
  ctx.quadraticCurveTo(x + 190, y - 214, x + 130, y - 226);
  ctx.closePath();
  fs(ctx, '#c83a4a', 2.5);
  for (let k = 0; k < 5; k++) poly(ctx, [[x + 135 + k * 14, y - 252], [x + 141 + k * 14, y - 240], [x + 147 + k * 14, y - 252]], '#ffffff', 1.2);
  circle(ctx, x + 150, y - 288, 12, '#ffffff', 2.5);
  circle(ctx, x + 154, y - 288, 6, INK, 0);
  limb(ctx, [[x + 70, y - 150], [x + 100, y - 130]], g, 12);
  ctx.beginPath();
  ctx.moveTo(x - 24, y);
  ctx.arc(x - 4, y, 28, Math.PI, 0);
  ctx.closePath();
  fs(ctx, '#1a2a1a', 2.5);
}

function gatorStatue(ctx, x, y) {
  // its lower jaw lies flat on the green; the top jaw is an actor
  const g = '#3f8a3a';
  shadow(ctx, x, y + 4, 150, 16);
  ctx.beginPath();
  ctx.moveTo(x - 60, y - 30);
  ctx.quadraticCurveTo(x - 190, y - 30, x - 240, y + 4);
  ctx.quadraticCurveTo(x - 160, y + 4, x - 60, y + 4);
  fs(ctx, g, 3);
  ellipse(ctx, x - 30, y - 30, 80, 38, g, 3);
  for (let k = 0; k < 6; k++) poly(ctx, [[x - 100 + k * 26, y - 62], [x - 88 + k * 26, y - 82], [x - 76 + k * 26, y - 62]], '#2f6a2a', 2);
  for (const lx of [-80, 20]) limb(ctx, [[x + lx, y - 10], [x + lx + 12, y + 4]], g, 16);
  rrect(ctx, x + 30, y - 22, 140, 26, 12, g, 3);
  rect(ctx, x + 50, y - 22, 110, 10, '#c83a4a', 2);
  for (let k = 0; k < 6; k++) poly(ctx, [[x + 56 + k * 18, y - 22], [x + 62 + k * 18, y - 32], [x + 68 + k * 18, y - 22]], '#ffffff', 1.5);
  ellipse(ctx, x + 70, y - 14, 13, 6, '#1a2a1a', 2);
}

function waterfallRocks(ctx) {
  // rocky cliff top right; the falling water is an actor
  ctx.beginPath();
  ctx.moveTo(1560, 470);
  ctx.lineTo(1600, 300);
  ctx.lineTo(1680, 250);
  ctx.lineTo(1800, 240);
  ctx.lineTo(1800, 560);
  ctx.closePath();
  fs(ctx, '#8a7a6a', 3);
  for (const [x, y, s] of [[1640, 330, 34], [1730, 300, 40], [1700, 420, 30], [1770, 470, 34], [1610, 440, 24]]) rock(ctx, x, y, s, '#9a8a7a');
  bush(ctx, 1720, 260, 140, 50, { seed: 31, flowers: '#ff5ab8' });
}

function hut(ctx, x, y) {
  shadow(ctx, x, y + 6, 160, 18);
  rect(ctx, x - 150, y - 160, 300, 160, '#fff1d0', 3);
  for (let k = x - 140; k < x + 150; k += 22) line(ctx, k, y - 158, k, y - 2, 'rgba(160,110,60,0.25)', 2);
  // snack and putter window
  rect(ctx, x - 120, y - 126, 170, 70, '#4a2c18', 3);
  rect(ctx, x - 128, y - 60, 186, 12, '#ff8a2a', 2.5);
  // stripy roof
  const n = 8;
  const sw = 340 / n;
  for (let i = 0; i < n; i++) {
    const sx = x - 170 + i * sw;
    ctx.beginPath();
    ctx.moveTo(sx, y - 200);
    ctx.lineTo(sx + sw, y - 200);
    ctx.lineTo(sx + sw, y - 166);
    ctx.arc(sx + sw / 2, y - 166, sw / 2, 0, Math.PI);
    ctx.closePath();
    fs(ctx, i % 2 ? '#ffffff' : '#ff5ab8', 2.5);
  }
  rrect(ctx, x - 130, y - 250, 260, 46, 10, '#2fb5e8', 3);
  label(ctx, 'MINI GOLF', x, y - 226, 28, '#ffe14d', { lw: 5 });
  // putters on a rack inside
  for (let k = 0; k < 6; k++) {
    line(ctx, x - 108 + k * 14, y - 118, x - 104 + k * 14, y - 64, ['#ff3d5a', '#2fb5e8', '#ffd23a', '#3fae4a', '#a64dff', '#ff8a2a'][k], 3);
  }
  // scoreboard on the side
  rect(ctx, x + 70, y - 140, 70, 90, '#2a3a2a', 3);
  for (let k = 0; k < 4; k++) line(ctx, x + 78, y - 124 + k * 18, x + 132, y - 124 + k * 18, 'rgba(255,255,255,0.7)', 2);
}

function sign(ctx, x, y, text, c = '#ff5ab8') {
  line(ctx, x, y, x, y - 70, '#6e4426', 5);
  rrect(ctx, x - 50, y - 100, 100, 36, 8, c, 3);
  label(ctx, text, x, y - 82, 18, '#ffffff', { lw: 3 });
}

const pondFill = () => WATER;
function pondCover(x, y, w = 46) {
  return (ctx, t) => {
    ctx.beginPath();
    ctx.moveTo(x - w, y + 2);
    for (let k = -w; k <= w; k += 8) ctx.lineTo(x + k, y + Math.sin(k / 9 + t * 3) * 1.5);
    ctx.lineTo(x + w * 0.8, y + 24);
    ctx.quadraticCurveTo(x, y + 34, x - w * 0.8, y + 24);
    ctx.closePath();
    ctx.fillStyle = pondFill();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, w * 0.8, 5, 0, 0, Math.PI);
    ctx.stroke();
  };
}

// --- the picture ------------------------------------------------------------------------------

function back(ctx, r) {
  sky(ctx, W, 0, TOP + 40, [[0, '#5ab4ff'], [1, '#c8eeff']]);
  sun(ctx, 260, 80, 40, { rays: 12 });
  // hotel towers behind the palms
  for (let i = 0; i < 9; i++) {
    const bx = 520 + i * 120;
    const bh = 70 + ((i * 53) % 70);
    rect(ctx, bx, TOP + 20 - bh, 90, bh, ['#ffd0e0', '#d0f0ff', '#fff0c0'][i % 3], 2);
    for (let k = 0; k < 3; k++) line(ctx, bx + 10, TOP + 10 - bh + 20 + k * 20, bx + 80, TOP + 10 - bh + 20 + k * 20, 'rgba(22,11,51,0.2)', 3);
  }
  // the turf
  ctx.fillStyle = lin(ctx, 0, TOP, 0, H, [[0, '#3fae4a'], [1, '#2f9a3e']]);
  ctx.fillRect(0, TOP, W, H - TOP);
  line(ctx, 0, TOP, W, TOP, INK, 3);
  speckle(ctx, 0, TOP + 10, W, H - TOP, 600, ['#5fcf5a', '#2a8a3a'], r, 2);
  for (let k = 0; k < 14; k++) palm(ctx, 30 + k * 135 + (k % 2) * 30, TOP + 30, 120 + (k % 3) * 25, (k % 2 ? 0.15 : -0.1), { size: 0.7 });
  fence(ctx, 0, W, TOP + 40, 30, '#ffffff');
  // paths between the holes
  path(ctx, [[0, 640], [300, 660], [620, 600], [1000, 640], [1180, 760], [1120, 1000], [880, 1080], [500, 1060], [200, 1000], [0, 1030]]);
  path(ctx, [[620, 600], [640, 1300]], 60);
  path(ctx, [[1180, 760], [1800, 780]], 60);
  path(ctx, [[1120, 1000], [1300, 1300]], 60);
  // the lagoon
  ellipse(ctx, POND.x, POND.y + 10, POND.rx + 20, POND.ry + 18, '#c9b08a', 3);
  ellipse(ctx, POND.x, POND.y, POND.rx, POND.ry, WATER, 3);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 3;
  for (let k = 0; k < 14; k++) {
    const wx = POND.x - 250 + r() * 500;
    const wy = POND.y - 80 + r() * 160;
    ctx.beginPath();
    ctx.moveTo(wx - 10, wy);
    ctx.quadraticCurveTo(wx - 5, wy - 5, wx, wy);
    ctx.quadraticCurveTo(wx + 5, wy - 5, wx + 10, wy);
    ctx.stroke();
  }
  // lily pads (no frogs on them; the frogs are things to find)
  for (const [x, y] of [[1220, 640], [1690, 560], [1590, 680], [1250, 540]]) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.ellipse(x, y, 22, 9, 0, 0.3, TAU - 0.1);
    ctx.closePath();
    fs(ctx, '#5fbf3a', 2);
  }
  waterfallRocks(ctx);

  const D = depth();
  const keep = keepOutOf([...iggy, ...items.flatMap((it) => it.spots)]);
  const place = (x, y, hw, hh, fn) => {
    keep.push({ x, y: y - hh / 2, hw, hh: hh / 2 + 20 });
    D.add(y, fn);
  };
  // the holes
  place(300, 560, 150, 280, () => {
    green(ctx, 300, 600, 340, 110);
    windmill(ctx, 300, 560);
    cup(ctx, 420, 610, 1);
  });
  place(820, 540, 150, 380, () => {
    green(ctx, 820, 520, 380, 110);
    flamingoStatue(ctx, 800, 530);
    cup(ctx, 930, 540, 2);
  });
  D.add(POND.y + 20, () => {
    pirateShip(ctx, 1430, 600);
    cup(ctx, 1240, 720, 7);
  });
  keep.push({ x: 1430, y: 480, hw: 200, hh: 150 });
  place(500, 920, 250, 340, () => {
    green(ctx, 480, 900, 460, 130, 64);
    dinoStatue(ctx, 470, 900);
    cup(ctx, 640, 930, 3);
  });
  place(960, 900, 200, 120, () => {
    green(ctx, 920, 900, 380, 110);
    gatorStatue(ctx, 920, 900);
    cup(ctx, 760, 900, 4);
  });
  place(1550, 950, 200, 240, () => {
    green(ctx, 1550, 960, 460, 120);
    volcano(ctx, 1550, 950);
    cup(ctx, 1730, 980, 5);
  });
  place(1220, 1180, 160, 70, () => {
    green(ctx, 1000, 1180, 420, 110);
    cup(ctx, 850, 1170, 6);
    // a little bridge over a stream
    ellipse(ctx, 1080, 1190, 60, 18, WATER, 2.5);
  });
  place(170, 1240, 175, 260, () => hut(ctx, 170, 1240));
  // benches, bins, signs, rocks and bushes
  place(1700, 1250, 70, 70, () => bench(ctx, 1700, 1250, 130, '#ff5ab8'));
  place(380, 1260, 30, 70, () => bin(ctx, 380, 1260, '#2fb5e8'));
  place(1010, 760, 50, 100, () => sign(ctx, 1010, 760, 'THIS WAY', '#2fb5e8'));
  place(560, 1210, 50, 100, () => sign(ctx, 560, 1210, 'NO RUNNING', '#ff3d5a'));
  place(80, 780, 90, 70, () => bush(ctx, 80, 780, 160, 66, { seed: 2, flowers: '#ffd23a' }));
  place(1780, 1090, 60, 70, () => bush(ctx, 1780, 1090, 110, 60, { seed: 9, flowers: '#ff5ab8' }));
  place(1300, 870, 50, 50, () => rock(ctx, 1300, 870, 34));
  keep.push({ x: POND.x, y: POND.y + 40, hw: POND.rx + 20, hh: POND.ry + 60 }); // the lagoon
  keep.push({ x: 1700, y: 400, hw: 150, hh: 180 }); // the waterfall rocks
  // a bush Iggy can stand behind (the bush in front is his spot's cover)
  keep.push({ x: 1200, y: 1130, hw: 60, hh: 60 });
  // actors' patches
  keep.push({ x: 1170, y: 520, hw: 60, hh: 80 }); // dad with the net
  keep.push({ x: 300, y: 330, hw: 150, hh: 150 }); // windmill blades
  keep.push({ x: 640, y: 700, hw: 60, hh: 90 }); // ball into the cup kid
  keep.push({ x: 1460, y: 1080, hw: 80, hh: 60 }); // sprinkler
  keep.push({ x: 860, y: 1240, hw: 70, hh: 60 }); // dog
  // the crowd: families putting, waiting, cheering, keeping score
  const pts = scatter(r, 34, { x0: 40, y0: 260, x1: 1760, y1: 1260 }, keep, 64);
  pts.forEach((p, i) => {
    const seed = 300 + i;
    const kind = i % 6;
    if (kind === 0 || kind === 3) {
      D.add(p.y, () => {
        golfer(ctx, p.x, p.y, randomPerson(seed, { hat: i % 2 ? 'visor' : 'cap', item: null }), 0, 0.1 * (i % 3));
        ball(ctx, p.x + (i % 2 ? 50 : 40), p.y - 2);
      });
    } else if (kind === 1) {
      D.add(p.y, () => {
        personAt(ctx, p.x - 18, p.y, randomPerson(seed, { pose: 'cheer', kid: true, item: null }), 0);
        golfer(ctx, p.x + 26, p.y + 4, randomPerson(seed + 9, { kid: false, item: null, flip: true }), 0, 0.5);
      });
    } else if (kind === 2) {
      D.add(p.y, () => personAt(ctx, p.x, p.y, randomPerson(seed, { pose: i % 4 ? 'point' : 'stand', item: i % 3 ? 'drink' : null, flip: i % 2 === 0 }), 0));
    } else if (kind === 4) {
      D.add(p.y, () => {
        personAt(ctx, p.x - 16, p.y, randomPerson(seed, { pose: 'walk', item: null }), 0);
        personAt(ctx, p.x + 18, p.y + 4, randomPerson(seed + 3, { pose: 'walk', kid: true, item: 'balloon', itemColour: '#2fb5e8' }), 0);
      });
    } else {
      D.add(p.y, () => {
        golfer(ctx, p.x, p.y, randomPerson(seed, { kid: true, item: null }), 0, 1.2);
        personAt(ctx, p.x + 40, p.y + 2, randomPerson(seed + 4, { pose: 'stand', mood: 'wow', item: null, flip: true }), 0);
      });
    }
  });
  D.draw();
  // stray balls on the turf (white, plain: not things to find)
  for (let k = 0; k < 14; k++) ball(ctx, 60 + r() * 1680, 280 + r() * 960, 5);
}

// --- moving things -----------------------------------------------------------------------------

const loop = (t, period) => (t % period) / period;

const actors = [
  ...[[300, 70, 40, 0], [1100, 110, 34, 0.4], [1500, 60, 46, 0.7]].map(([x, y, s, p]) => ({
    x: W / 2, y, hw: W / 2 + 120, hh: s, over: true,
    draw(ctx, t) {
      cloud(ctx, ((x + t * 7 + p * W) % (W + 240)) - 120, y, s);
    },
  })),
  // windmill blades turning
  {
    x: 300, y: 330, hw: 150, hh: 150,
    draw(ctx, t) {
      const a0 = t * 0.9;
      ctx.save();
      ctx.translate(300, 330);
      for (let k = 0; k < 4; k++) {
        ctx.save();
        ctx.rotate(a0 + (k * Math.PI) / 2);
        rect(ctx, -4, -140, 8, 130, '#8a5a2c', 2);
        rect(ctx, 4, -136, 30, 110, '#ffffff', 2.5);
        for (let j = 1; j < 4; j++) line(ctx, 4, -136 + j * 27, 34, -136 + j * 27, 'rgba(22,11,51,0.35)', 1.5);
        ctx.restore();
      }
      circle(ctx, 0, 0, 14, '#ffe14d', 3);
      ctx.restore();
    },
  },
  // the waterfall pouring into the lagoon
  {
    x: 1600, y: 420, hw: 60, hh: 120,
    draw(ctx, t) {
      ctx.fillStyle = 'rgba(180,240,255,0.95)';
      ctx.beginPath();
      ctx.moveTo(1580, 310);
      ctx.lineTo(1620, 310);
      ctx.quadraticCurveTo(1612, 420, 1630, 520);
      ctx.lineTo(1580, 520);
      ctx.quadraticCurveTo(1570, 420, 1580, 310);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 3;
      for (let k = 0; k < 5; k++) {
        const y = 310 + ((t * 120 + k * 42) % 210);
        line(ctx, 1586 + k * 7, y, 1588 + k * 7, y + 18, '#ffffff', 3);
      }
      for (let k = 0; k < 5; k++) {
        const a = (t * 2 + k) % 1;
        ctx.globalAlpha = 1 - a;
        circle(ctx, 1590 + (k - 2) * 14 + a * (k - 2) * 10, 520 - a * 22, 6 + a * 6, '#ffffff', 0);
      }
      ctx.globalAlpha = 1;
    },
  },
  // pirate flag flapping and the cannon going "pop" now and then
  {
    x: 1450, y: 330, hw: 220, hh: 100,
    keep: [{ x: 1470, y: 320, hw: 50, hh: 30 }, { x: 1650, y: 500, hw: 50, hh: 30 }],
    draw(ctx, t) {
      const f = Math.sin(t * 5) * 4;
      line(ctx, 1430, 352, 1430, 300, '#6e4426', 4);
      ctx.beginPath();
      ctx.moveTo(1432, 302);
      ctx.quadraticCurveTo(1460, 300 + f, 1490, 306);
      ctx.lineTo(1488, 334 - f);
      ctx.quadraticCurveTo(1460, 332, 1432, 330);
      ctx.closePath();
      fs(ctx, '#1a1a2a', 2);
      circle(ctx, 1460, 314, 6, '#ffffff', 0);
      line(ctx, 1452, 324, 1468, 324, '#ffffff', 3);
      const k = loop(t, 5);
      if (k < 0.3) {
        const a = k / 0.3;
        ctx.globalAlpha = 1 - a;
        for (let i = 0; i < 4; i++) circle(ctx, 1640 + a * 40 + i * 10, 504 - i * 6 - a * 10, 10 + a * 14, '#ffffff', 0);
        ctx.globalAlpha = 1;
        label(ctx, 'POP!', 1680, 470 - a * 20, 20, '#ffe14d', { lw: 4 });
      }
    },
  },
  // volcano puffing smoke
  {
    x: 1690, y: 715, hw: 110, hh: 60,
    keep: [{ x: 1690, y: 715, hw: 100, hh: 45 }],
    draw(ctx, t) {
      // the wind blows the smoke off to the right, over the grass
      for (let k = 0; k < 5; k++) {
        const a = (t * 0.3 + k / 5) % 1;
        ctx.globalAlpha = 0.9 * (1 - a);
        circle(ctx, 1590 + a * 180, 745 - a * 60 + Math.sin(a * 6 + k) * 6, 10 + a * 18, '#9a909a', 2);
      }
      ctx.globalAlpha = 1;
    },
  },
  // the gator's top jaw snapping
  {
    x: 1010, y: 870, hw: 90, hh: 50,
    draw(ctx, t) {
      const open = 0.15 + Math.max(0, Math.sin(t * 1.4)) * 0.4;
      ctx.save();
      ctx.translate(950, 880);
      ctx.rotate(-open);
      rrect(ctx, 0, -26, 140, 26, 12, '#3f8a3a', 3);
      for (let k = 0; k < 6; k++) poly(ctx, [[22 + k * 18, 0], [28 + k * 18, 10], [34 + k * 18, 0]], '#ffffff', 1.5);
      circle(ctx, 128, -20, 3, INK, 0);
      ctx.restore();
      circle(ctx, 952, 852, 16, '#3f8a3a', 3);
      circle(ctx, 955, 849, 9, '#ffffff', 2);
      circle(ctx, 958, 849, 4.5, INK, 0);
    },
  },
  // a ball rolling up to cup 3 and dropping in; the kid cheers
  {
    x: 640, y: 720, hw: 70, hh: 110,
    keep: [{ x: 655, y: 740, hw: 30, hh: 45 }],
    draw(ctx, t) {
      const k = loop(t, 4);
      const got = k > 0.55;
      ctx.save();
      ctx.translate(660, 780);
      shadow(ctx, 0, 0, 16);
      person(ctx, { pose: got ? 'cheer' : 'stand', kid: true, skin: '#c68a5a', hair: '#16101e', hairStyle: 'curly', top: '#ff8a2a', outfit: 'tee', bottom: '#2a4a8a', hat: 'cap', hatColour: '#ffd23a', mood: got ? 'wow' : 'smile', phase: 3 }, t);
      ctx.restore();
      if (!got) ball(ctx, 600 + (k / 0.55) * 38, 760 - (k / 0.55) * 4);
      else if (k < 0.75) label(ctx, 'HOLE IN ONE!', 650, 640 - (k - 0.55) * 60, 16, '#ffe14d', { lw: 4 });
    },
  },
  // dad fishing his ball out of the lagoon with a net
  {
    x: 1170, y: 520, hw: 60, hh: 80,
    draw(ctx, t) {
      const lean = Math.sin(t * 1.5) * 0.08;
      ctx.save();
      ctx.translate(1150, 590);
      ctx.rotate(0.2 + lean);
      person(ctx, { pose: 'hold', skin: '#f5c49c', hair: '#7a4a22', hairStyle: 'short', top: '#3a6bff', outfit: 'tee', bottom: '#c98f4f', hat: 'visor', hatColour: '#ff3d5a', mood: 'grr', phase: 1 }, t);
      ctx.restore();
      line(ctx, 1176, 524, 1228, 590 + Math.sin(t * 1.5) * 6, '#6e4426', 3);
      ellipse(ctx, 1234, 598 + Math.sin(t * 1.5) * 6, 14, 6, 'rgba(255,255,255,0.4)', 2);
      ball(ctx, 1250, 604 + Math.sin(t * 2) * 2, 5);
    },
  },
  // white ducks paddling about the lagoon (not the yellow rubber duck)
  {
    x: 1460, y: 650, hw: 260, hh: 40, over: true,
    draw(ctx, t) {
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.03 + i / 3) % 1;
        const dir = Math.sin((t * 0.03 + i / 3) * TAU) > 0 ? 1 : -1;
        const x = 1460 + Math.cos((t * 0.03 + i / 3) * TAU) * 230;
        ctx.save();
        ctx.translate(x, 660 + i * 8);
        duck(ctx, { flip: dir > 0, phase: i, s: 0.9 - i * 0.1 }, t);
        ctx.restore();
        void k;
      }
    },
  },
  // a putter winding up, again and again
  {
    x: 1100, y: 1120, hw: 60, hh: 80,
    draw(ctx, t) {
      const sw = Math.max(0, Math.sin(t * 1.6)) * 0.9;
      golfer(ctx, 1080, 1180, { skin: '#9a6440', hair: '#e8e0d0', hairStyle: 'bald', top: '#ffffff', outfit: 'tee', bottom: '#2a4a8a', hat: 'cap', hatColour: '#3fae4a', shades: true, phase: 5 }, t, sw);
      ball(ctx, 1124, 1178);
    },
  },
  // a sprinkler spraying an unlucky golfer
  {
    x: 1460, y: 1090, hw: 80, hh: 70,
    draw(ctx, t) {
      const a = Math.sin(t * 2) * 0.9;
      rect(ctx, 1424, 1130, 12, 10, '#3a3f55', 2);
      ctx.strokeStyle = 'rgba(160,230,255,0.9)';
      ctx.lineWidth = 3;
      for (let k = 0; k < 5; k++) {
        const ang = -Math.PI / 2 + a + (k - 2) * 0.12;
        ctx.beginPath();
        ctx.moveTo(1430, 1128);
        ctx.quadraticCurveTo(1430 + Math.cos(ang) * 60, 1128 + Math.sin(ang) * 60 - 10, 1430 + Math.cos(ang) * 90, 1128 + Math.sin(ang) * 40);
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(1500, 1150);
      shadow(ctx, 0, 0, 22);
      person(ctx, { pose: 'cheer', skin: '#ffd9b8', hair: '#f2d27a', hairStyle: 'long', top: '#a64dff', outfit: 'dress', mood: 'wow', phase: 6 }, t);
      ctx.restore();
    },
  },
  // a dog trotting off with somebody's golf ball
  {
    x: 860, y: 1240, hw: 70, hh: 60,
    draw(ctx, t) {
      const x = 860 + Math.sin(t * 0.8) * 50;
      ctx.save();
      ctx.translate(x, 1270);
      shadow(ctx, 0, 0, 24);
      dog(ctx, { pose: 'run', flip: Math.cos(t * 0.8) < 0, colour: '#f2d27a', ear: '#c98f4f', collar: '#2fb5e8' }, t);
      ctx.restore();
      ball(ctx, x + (Math.cos(t * 0.8) < 0 ? -34 : 34), 1240, 5);
    },
  },
  // a gull over the lagoon
  {
    x: 1100, y: 260, hw: 160, hh: 60, over: true,
    draw(ctx, t) {
      ctx.save();
      ctx.translate(1100 + Math.cos(t * 0.5) * 140, 260 + Math.sin(t) * 30);
      gull(ctx, { pose: 'fly', flip: Math.sin(t * 0.5) > 0 }, t);
      ctx.restore();
    },
  },
  // bees round the windmill flower boxes
  {
    x: 300, y: 450, hw: 70, hh: 30, over: true,
    draw(ctx, t) {
      for (let i = 0; i < 2; i++) {
        ctx.save();
        ctx.translate(300 + Math.cos(t * 2 + i * 3) * 60, 450 + Math.sin(t * 3 + i) * 14);
        bee(ctx, {}, t);
        ctx.restore();
      }
    },
  },
];

// --- hiding places ----------------------------------------------------------------------------

const bushCover = (x, y) => (ctx) => bush(ctx, x, y, 110, 58, { seed: 14, flowers: '#ffffff' });

const iggy = [
  sp(300, 562, { pose: 'peek' }), // in the windmill door
  sp(1430, 252, { pose: 'peek' }), // in the pirate ship's crow's nest
  sp(1515, 764, { pose: 'peek' }), // in the volcano crater
  sp(1300, 640, { pose: 'float', cover: pondCover(1300, 640) }), // swimming in the lagoon
  sp(850, 1172, { pose: 'peek' }), // popping out of cup 6
  sp(1200, 1150, { pose: 'stand', cover: bushCover(1200, 1160), hit: [34, 40], hy: -40 }), // behind a bush
  sp(175, 1182, { pose: 'peek' }), // on the hut's counter
  sp(784, 470, { pose: 'cling' }), // hugging the flamingo's leg
  sp(628, 680, { pose: 'peek', s: 0.8 }), // in the dinosaur's mouth
];

const items = [
  { id: 'frog', prop: 'frog', count: 2, spots: [sp(1190, 694), sp(640, 1060), sp(1300, 1150)] },
  { id: 'flower', prop: 'flower', o: { colour: '#ff5ab8' }, count: 3, spots: [sp(90, 600), sp(660, 300), sp(1010, 1080), sp(1760, 1220), sp(460, 1180)] },
  { id: 'duck', prop: 'duck', spots: [sp(1670, 660), sp(1340, 690)] },
  { id: 'trophy', prop: 'trophy', spots: [sp(60, 1110), sp(1000, 300)] },
  { id: 'teddy', prop: 'teddy', spots: [sp(720, 760), sp(1700, 1080)] },
  { id: 'sunglasses', prop: 'sunglasses', spots: [sp(960, 1110), sp(380, 680)] },
  { id: 'cone', prop: 'cone', spots: [sp(1300, 1230), sp(560, 560)] },
  { id: 'camera', prop: 'camera', spots: [sp(1110, 330), sp(300, 1010)] },
  { id: 'compass', prop: 'compass', spots: [sp(1520, 516), sp(60, 960)] },
  { id: 'anchor', prop: 'anchor', spots: [sp(1690, 600), sp(940, 1260)] },
  { id: 'glove', prop: 'glove', spots: [sp(1060, 700), sp(200, 850)] },
  { id: 'watch', prop: 'watch', spots: [sp(520, 1080), sp(1440, 830)] },
  { id: 'cupcake', prop: 'cupcake', spots: [sp(1640, 1240), sp(300, 760)] },
  { id: 'key', prop: 'key', spots: [sp(1180, 1260), sp(740, 420)] },
  { id: 'lollipop', prop: 'lollipop', spots: [sp(60, 470), sp(1310, 1060)] },
  { id: 'parrot', prop: 'parrot', o: { colour: '#ff3d3d', wing: '#2f7bff' }, spots: [sp(1360, 520), sp(1740, 400)] },
  { id: 'tophat', prop: 'tophat', spots: [sp(470, 640), sp(1580, 1200)] },
  { id: 'butterfly', prop: 'butterfly', o: { colour: '#ff8a2a' }, count: 2, spots: [sp(120, 480), sp(980, 430), sp(740, 1150), sp(1460, 1240)] },
  { id: 'snail', prop: 'snail', spots: [sp(430, 1270), sp(1200, 900)] },
];

function sticker(ctx, r, t) {
  ctx.save();
  ctx.scale(r / 100, r / 100);
  ctx.fillStyle = lin(ctx, 0, -100, 0, 100, [[0, '#7fd8ff'], [0.5, '#c8eeff'], [0.51, '#4fbf4a'], [1, '#2f9a3e']]);
  ctx.beginPath();
  ctx.arc(0, 0, 100, 0, TAU);
  ctx.fill();
  green(ctx, 0, 50, 180, 50, 25);
  ellipse(ctx, 40, 52, 10, 5, '#1a2a1a', 1.5);
  line(ctx, 42, 52, 42, -30, '#ffffff', 3);
  poly(ctx, [[42, -30], [80, -20], [42, -8]], '#ffe14d', 2);
  ctx.translate(-30, 62);
  drawProp(ctx, 'iggy-stand', {}, t);
  ctx.restore();
  void glow;
}

export default {
  id: 'golf',
  name: 'Mini Golf',
  W, H,
  edge: '#2f9a3e',
  back,
  actors,
  iggy,
  items,
  sticker,
};
