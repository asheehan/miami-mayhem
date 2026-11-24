// The jungle zoo: a monkey island in its moat, a flamingo pond, a tiger lounging behind the
// fence, a giraffe peering over the trees, a sloth, a toucan and a snake up in the branches,
// a snack kiosk, the zoo map and a little train looping along the front path.
import { TAU, INK, lin, circle, ellipse, poly, rect, rrect, line, curve, fs, sky, sun, cloud, label, shadow, limb, bush, speckle } from '../art/kit.js';
import { bench, bin, fence } from '../art/scenery.js';
import { person, personAt, randomPerson } from '../art/people.js';
import { monkey, flamingo, tiger, sloth, toucan, snake, parrot, giraffeHead, lizard, bee, butterfly } from '../art/animals.js';
import { drawProp } from '../art/props.js';
import { scatter, keepOutOf, depth } from '../art/crowd.js';

const W = 1800;
const H = 1300;
const PATH = 840; // the visitors' path starts here
const TRACK = 1250; // the train's rails

const POND = { x: 880, y: 700, rx: 240, ry: 82 };
const pondFill = (ctx) => lin(ctx, 0, POND.y - POND.ry, 0, POND.y + POND.ry, [[0, '#3fc8d8'], [1, '#1f9fc0']]);

const sp = (x, y, o = {}) => ({ x, y, ...o });

// Covers a floating thing below the waterline at y with pond water (kept inside the pond).
function pondCover(x, y, w = 44) {
  return (ctx, t) => {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(POND.x, POND.y, POND.rx, POND.ry, 0, 0, TAU);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(x - w, y + 2);
    for (let k = -w; k <= w; k += 8) ctx.lineTo(x + k, y + Math.sin(k / 9 + t * 3) * 1.5);
    ctx.lineTo(x + w, y + 60);
    ctx.lineTo(x - w, y + 60);
    ctx.closePath();
    ctx.fillStyle = pondFill(ctx);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, w * 0.8, 5, 0, 0, Math.PI);
    ctx.stroke();
  };
}

// A cluster of big jungle leaves, drawn in front of whatever hides behind it.
function leafCluster(x, y, s = 1, seed = 0) {
  return (ctx) => {
    const angles = [-2.4, -1.9, -1.2, -0.6, 0.1, -1.55];
    angles.forEach((a, i) => bigLeaf(ctx, x + Math.cos(a) * 6, y + 10, a + (seed % 3) * 0.1, s * (0.85 + (i % 3) * 0.12), i % 2 ? '#3fae4a' : '#2f8a3e'));
  };
}

function bushCover(x, y, w, h, seed, flowers = null) {
  return (ctx) => bush(ctx, x, y, w, h, { seed, flowers, fill: '#4fb84a', dark: '#2a8a3a', light: '#8fe06a' });
}

// --- set pieces -------------------------------------------------------------------------------

function bigLeaf(ctx, x, y, a, s, c) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(22, -14, 58, 0);
  ctx.quadraticCurveTo(22, 16, 0, 0);
  fs(ctx, c, 2.5);
  line(ctx, 2, 0, 54, 0, 'rgba(22,11,51,0.35)', 1.8);
  for (let k = 12; k < 50; k += 9) {
    line(ctx, k, 0, k + 6, -7, 'rgba(22,11,51,0.25)', 1.4);
    line(ctx, k, 0, k + 6, 7, 'rgba(22,11,51,0.25)', 1.4);
  }
  ctx.restore();
}

// A big leafy jungle tree with its foot at (x, y). Returns the canopy centre.
function jungleTree(ctx, x, y, h, r, { hollow = false, seed = 1, trunk = '#8a5a2c' } = {}) {
  const top = y - h;
  ctx.beginPath();
  ctx.moveTo(x - 34, y);
  ctx.quadraticCurveTo(x - 18, y - h * 0.5, x - 16, top + 30);
  ctx.lineTo(x + 16, top + 30);
  ctx.quadraticCurveTo(x + 18, y - h * 0.5, x + 34, y);
  ctx.closePath();
  fs(ctx, lin(ctx, x - 30, 0, x + 30, 0, [[0, trunk], [1, '#5e3a1c']]), 3);
  // roots
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + d * 20, y - 20);
    ctx.quadraticCurveTo(x + d * 44, y - 10, x + d * 56, y + 2);
    ctx.lineTo(x + d * 30, y + 2);
    ctx.closePath();
    fs(ctx, trunk, 2.5);
  }
  for (let k = 0; k < 5; k++) curve(ctx, x - 10 + k * 5, y - 30 - k * 26, x - 4 + k * 4, y - 50 - k * 26, x - 8 + k * 5, y - 70 - k * 26, 'rgba(22,11,51,0.3)', 2);
  if (hollow) {
    ellipse(ctx, x, top + h * 0.45, 22, 30, '#3a2410', 3);
    ellipse(ctx, x, top + h * 0.45 + 4, 14, 20, '#1e1208', 0);
  }
  // canopy blobs
  const blobs = [[-0.8, 0.1, 0.55], [-0.35, -0.3, 0.65], [0.3, -0.35, 0.62], [0.8, 0.05, 0.52], [0, 0.15, 0.6], [-0.5, 0.35, 0.4], [0.55, 0.38, 0.4]];
  const cy = top;
  ctx.beginPath();
  for (const [bx, by, br] of blobs) {
    ctx.moveTo(x + bx * r + br * r, cy + by * r);
    ctx.arc(x + bx * r, cy + by * r, br * r, 0, TAU);
  }
  ctx.fillStyle = seed % 2 ? '#2f8a3e' : '#3a9a44';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fill();
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU + seed;
    const d = r * (0.25 + ((i * 37) % 10) / 16);
    ctx.strokeStyle = i % 2 ? '#6fd36a' : '#1f6a30';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * d, cy + Math.sin(a) * d * 0.6, 10 + (i % 3) * 4, Math.PI * 1.1, Math.PI * 1.8);
    ctx.stroke();
  }
  return { x, y: cy };
}

function vine(ctx, x, y0, len, seed = 0) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  for (let k = 0; k <= len; k += 10) ctx.lineTo(x + Math.sin(k / 40 + seed) * 10, y0 + k);
  ctx.stroke();
  ctx.strokeStyle = '#4f9a36';
  ctx.lineWidth = 3;
  ctx.stroke();
  for (let k = 20; k < len; k += 34) {
    const vx = x + Math.sin(k / 40 + seed) * 10;
    ellipse(ctx, vx + ((k / 34) % 2 ? 8 : -8), y0 + k, 8, 4.5, '#5fbf3a', 1.8, INK, (k / 34) % 2 ? 0.5 : -0.5);
  }
}

// An elephant side on, facing right, feet at (x, y). The mum's trunk is an actor.
function elephant(ctx, x, y, s, mum) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const g = '#9aa4b8';
  shadow(ctx, 0, 0, 80, 12);
  curve(ctx, -70, -70, -88, -50, -84, -30, INK, 4);
  for (const lx of [-50, -26, 26, 46]) rrect(ctx, lx - 12, -50, 24, 50, 8, g, 2.5);
  ellipse(ctx, -10, -76, 74, 46, g, 3);
  ellipse(ctx, 58, -92, 34, 32, g, 3);
  ellipse(ctx, 42, -88, 22, 30, '#b5c0d0', 2.5, INK, -0.2);
  circle(ctx, 70, -100, 3, INK, 0);
  if (!mum) {
    limb(ctx, [[84, -86], [96, -66], [100, -50]], g, 12);
  }
  poly(ctx, [[78, -76], [96, -70], [80, -68]], '#fff6e0', 2);
  ctx.restore();
}

function rock(ctx, x, y, w, h, c = '#9a8a7a') {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.quadraticCurveTo(x - w / 2, y - h * 0.9, x - w * 0.15, y - h);
  ctx.quadraticCurveTo(x + w * 0.3, y - h * 1.05, x + w / 2, y - h * 0.3);
  ctx.lineTo(x + w / 2, y);
  ctx.closePath();
  fs(ctx, c, 3);
  curve(ctx, x - w * 0.25, y - h * 0.7, x, y - h * 0.55, x + w * 0.2, y - h * 0.75, 'rgba(255,255,255,0.35)', 3);
}

function woodFence(ctx, x0, x1, y, h = 60) {
  for (const k of [0.3, 0.7]) {
    line(ctx, x0, y - h * k, x1, y - h * k, INK, 9);
    line(ctx, x0, y - h * k, x1, y - h * k, '#b8834a', 5);
  }
  for (let x = x0; x <= x1; x += 70) rrect(ctx, x - 6, y - h - 8, 12, h + 8, 3, '#9a6a3a', 2.5);
}

function kiosk(ctx, x, y) {
  shadow(ctx, x, y + 4, 120, 14);
  rect(ctx, x - 100, y - 140, 200, 140, '#ffe9b0', 3);
  for (let k = x - 90; k < x + 100; k += 22) line(ctx, k, y - 138, k, y - 62, 'rgba(160,110,50,0.35)', 3);
  rect(ctx, x - 110, y - 62, 220, 14, '#c98f4f', 2.5);
  rect(ctx, x - 100, y - 48, 200, 48, '#e8a860', 2.5);
  // a thatched roof
  poly(ctx, [[x - 130, y - 140], [x + 130, y - 140], [x + 80, y - 210], [x - 80, y - 210]], '#e8c060', 3);
  for (let k = -120; k <= 120; k += 14) line(ctx, x + k, y - 142, x + k * 0.62, y - 206, 'rgba(160,110,50,0.5)', 2);
  rrect(ctx, x - 70, y - 236, 140, 34, 8, '#ff7a2a', 2.5);
  label(ctx, 'SNACKS', x, y - 219, 22, '#ffffff', { lw: 4 });
  // the menu: an ice cream, a drink and a pretzel
  rect(ctx, x - 80, y - 128, 50, 54, '#3a3f55', 2);
  circle(ctx, x - 55, y - 110, 7, '#ff9ed2', 1.5);
  poly(ctx, [[x - 61, y - 106], [x - 49, y - 106], [x - 55, y - 92], [x - 55, y - 92]], '#e8b060', 1.5);
  rect(ctx, x + 30, y - 128, 50, 54, '#3a3f55', 2);
  ctx.strokeStyle = '#e8a860';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x + 48, y - 98, 8, 0, TAU);
  ctx.arc(x + 62, y - 98, 8, 0, TAU);
  ctx.stroke();
}

function mapBoard(ctx, x, y) {
  rect(ctx, x - 64, y - 30, 8, 30, '#6e4426', 2);
  rect(ctx, x + 56, y - 30, 8, 30, '#6e4426', 2);
  rrect(ctx, x - 80, y - 120, 160, 94, 6, '#8a5a2c', 3);
  rect(ctx, x - 70, y - 110, 140, 74, '#bfe8a0', 2);
  curve(ctx, x - 62, y - 50, x - 10, y - 100, x + 60, y - 60, '#e8d2a0', 6);
  ellipse(ctx, x + 6, y - 80, 18, 8, '#3fc8d8', 1.5);
  circle(ctx, x - 40, y - 90, 7, '#2f8a3e', 1.5);
  circle(ctx, x + 40, y - 96, 7, '#2f8a3e', 1.5);
  // you are here
  circle(ctx, x - 20, y - 56, 5, '#ff3d5a', 1.5);
}

// A signpost with a picture of the animal.
function signPost(ctx, x, y, kind) {
  rect(ctx, x - 4, y - 90, 8, 90, '#8a5a2c', 2);
  rrect(ctx, x - 40, y - 130, 80, 50, 8, '#ffe9b0', 2.5);
  ctx.save();
  ctx.translate(x, y - 96);
  ctx.scale(0.45, 0.45);
  if (kind === 'tiger') tiger(ctx, { flip: true }, 0);
  else if (kind === 'flamingo') {
    ctx.translate(0, 40);
    flamingo(ctx, {}, 0);
  } else monkey(ctx, {}, 0);
  ctx.restore();
}

// A green chameleon on a branch, with a curly tail (a decoy, no swim ring).
function chameleon(ctx, x, y, flip = false) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-14, -6);
  ctx.quadraticCurveTo(-34, -4, -32, 8);
  ctx.arc(-26, 8, 6, Math.PI, Math.PI * 2.6);
  ctx.stroke();
  ctx.strokeStyle = '#7cd34a';
  ctx.lineWidth = 4;
  ctx.stroke();
  ellipse(ctx, 0, -10, 18, 11, '#7cd34a', 2.5);
  poly(ctx, [[12, -18], [26, -12], [14, -4]], '#7cd34a', 2.5);
  circle(ctx, 14, -12, 5, '#ffe14d', 2);
  circle(ctx, 15, -12, 2, INK, 0);
  for (const lx of [-8, 8]) line(ctx, lx, 0, lx + 2, 6, INK, 3);
  for (let k = 0; k < 3; k++) circle(ctx, -8 + k * 7, -12, 2.5, '#4fae3a', 0);
  ctx.restore();
}

// A hedge clipped into a big lizard (another decoy).
function topiary(ctx, x, y) {
  shadow(ctx, x, y + 2, 80, 12);
  rect(ctx, x - 50, y - 24, 100, 24, '#c98f4f', 2.5);
  const g = '#3fae4a';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.moveTo(x - 30, y - 40);
  ctx.quadraticCurveTo(x - 90, y - 30, x - 80, y - 70);
  ctx.stroke();
  ctx.strokeStyle = g;
  ctx.lineWidth = 16;
  ctx.stroke();
  ellipse(ctx, x, y - 50, 44, 24, g, 3);
  circle(ctx, x + 44, y - 78, 20, g, 3);
  for (const lx of [-24, 24]) rect(ctx, x + lx - 6, y - 34, 12, 12, g, 2);
  circle(ctx, x + 50, y - 82, 4, INK, 0);
  for (let k = 0; k < 6; k++) circle(ctx, x - 30 + k * 12, y - 60 + (k % 2) * 8, 3, '#6fd36a', 0);
}

function trainTrack(ctx) {
  ctx.fillStyle = '#c9a878';
  ctx.fillRect(0, TRACK - 20, W, 40);
  for (let x = 6; x < W; x += 28) rect(ctx, x, TRACK - 16, 14, 32, '#8a5a3c', 1.5);
  line(ctx, 0, TRACK - 8, W, TRACK - 8, '#6a7490', 5);
  line(ctx, 0, TRACK + 8, W, TRACK + 8, '#6a7490', 5);
}

// --- the picture ------------------------------------------------------------------------------

function back(ctx, r) {
  sky(ctx, W, 0, 320, [[0, '#6fc8ff'], [1, '#d8f6ff']]);
  sun(ctx, 1080, 80, 40);
  // far jungle hills
  ctx.fillStyle = '#5fa860';
  ctx.beginPath();
  ctx.moveTo(0, 320);
  for (let x = 0; x <= W; x += 60) ctx.lineTo(x, 230 + Math.sin(x / 140) * 30 + Math.sin(x / 47) * 12);
  ctx.lineTo(W, 320);
  ctx.closePath();
  ctx.fill();
  // ground: jungle grass
  ctx.fillStyle = lin(ctx, 0, 300, 0, PATH, [[0, '#5fb84a'], [1, '#7cc85a']]);
  ctx.fillRect(0, 300, W, PATH - 300);
  // a dense row of canopies along the back
  for (let k = 0; k < 13; k++) {
    const cx = k * 150 + (k % 2) * 30;
    const cy = 250 + (k % 3) * 18;
    ctx.beginPath();
    for (const [bx, by, br] of [[-50, 10, 55], [0, -20, 70], [55, 5, 58]]) {
      ctx.moveTo(cx + bx + br, cy + by);
      ctx.arc(cx + bx, cy + by, br, 0, TAU);
    }
    ctx.fillStyle = k % 2 ? '#2a7a38' : '#317f3c';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(22,11,51,0.6)';
    ctx.stroke();
    ctx.fill();
  }
  ctx.fillStyle = '#2a7a38';
  ctx.fillRect(0, 280, W, 40);
  // the giraffe's body in its yard at the back (her neck and head move)
  for (const lx of [1610, 1625, 1665, 1680]) limb(ctx, [[lx, 440], [lx + (lx > 1650 ? 4 : -4), 520]], '#ffc84a', 9);
  ellipse(ctx, 1645, 432, 52, 28, '#ffc84a', 3);
  for (const [gx, gy] of [[1620, 425], [1650, 440], [1675, 425], [1640, 418]]) ellipse(ctx, gx, gy, 8, 6, '#b8742a', 0);
  curve(ctx, 1694, 430, 1712, 440, 1708, 470, INK, 3);
  // background trees
  jungleTree(ctx, 60, 520, 300, 150, { seed: 1, hollow: true });
  jungleTree(ctx, 1000, 470, 260, 140, { seed: 2 });
  jungleTree(ctx, 1270, 480, 250, 130, { seed: 3 });
  jungleTree(ctx, 1760, 520, 320, 150, { seed: 4 });
  // the giraffe yard behind the tiger, with a feeding platform
  for (const lx of [1470, 1560]) rect(ctx, lx - 4, 296, 8, 210, '#8a5a2c', 2);
  line(ctx, 1470, 330, 1560, 480, '#8a5a2c', 5);
  rect(ctx, 1450, 280, 125, 18, '#c98f4f', 2.5);
  // the elephants: mum (her trunk sprays, so it is drawn live) and a baby
  elephant(ctx, 720, 520, 1, true);
  elephant(ctx, 600, 525, 0.55, false);
  // big jungle plants along the back
  for (const [lx, ly, sc] of [[520, 540, 1.1], [930, 530, 1], [1140, 520, 1.2], [1490, 520, 1], [880, 540, 0.8]]) {
    for (let i = 0; i < 6; i++) bigLeaf(ctx, lx, ly, -2.9 + i * 0.45, sc * (0.9 + (i % 2) * 0.25), i % 2 ? '#3fae4a' : '#2f8a3e');
  }
  // monkey island: moat, rocks and a climbing tree with ropes
  ctx.fillStyle = lin(ctx, 0, 520, 0, 760, [[0, '#3fc8d8'], [1, '#1f9fc0']]);
  ctx.beginPath();
  ctx.ellipse(300, 650, 270, 105, 0, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  for (let k = 0; k < 8; k++) curve(ctx, 100 + k * 50, 700 + (k % 2) * 20, 112 + k * 50, 694 + (k % 2) * 20, 124 + k * 50, 700 + (k % 2) * 20, 'rgba(255,255,255,0.6)', 2.5);
  ellipse(ctx, 300, 625, 200, 72, '#a89070', 3);
  rock(ctx, 210, 640, 150, 90, '#9a8a7a');
  rock(ctx, 420, 650, 130, 70, '#8a7a6a');
  // the climbing tree with a rope swing
  jungleTree(ctx, 330, 600, 280, 120, { seed: 5, trunk: '#7a4a22' });
  line(ctx, 180, 380, 480, 360, INK, 10);
  line(ctx, 180, 380, 480, 360, '#7a4a22', 6);
  curve(ctx, 440, 362, 446, 420, 440, 470, '#c98f4f', 3);
  curve(ctx, 470, 360, 476, 420, 470, 470, '#c98f4f', 3);
  rect(ctx, 432, 468, 46, 8, '#8a5a2c', 2);
  ctx.save();
  ctx.translate(455, 470);
  monkey(ctx, { colour: '#6e4426', phase: 2 }, 0);
  ctx.restore();
  // the flamingo pond
  ctx.fillStyle = pondFill(ctx);
  ctx.beginPath();
  ctx.ellipse(POND.x, POND.y, POND.rx, POND.ry, 0, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#c9b07a';
  ctx.beginPath();
  ctx.ellipse(POND.x, POND.y, POND.rx + 6, POND.ry + 6, 0, 0.1, Math.PI - 0.1);
  ctx.stroke();
  for (let k = 0; k < 9; k++) curve(ctx, 700 + k * 42, 690 + (k % 3) * 18, 712 + k * 42, 684 + (k % 3) * 18, 724 + k * 42, 690 + (k % 3) * 18, 'rgba(255,255,255,0.6)', 2.5);
  for (const [lx, ly] of [[880, 764], [760, 754], [930, 642]]) {
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.arc(lx, ly, 16, 0.4, TAU - 0.2);
    ctx.closePath();
    fs(ctx, '#4fb84a', 2);
  }
  // reeds round the pond
  for (let k = 0; k < 14; k++) {
    const rx = 640 + k * 38 + (k > 6 ? 200 : 0) - (k > 6 ? 200 : 0);
    if (k % 2) continue;
    curve(ctx, rx, 620, rx + 4, 590, rx - 4, 560, '#3a7a2a', 3);
    ellipse(ctx, rx - 4, 566, 4, 10, '#8a5a2c', 1.5);
  }
  // static flamingos at the pond's edge
  for (const [fx, fy, f, one] of [[1070, 722, true, false], [1105, 676, true, true]]) {
    ctx.save();
    ctx.translate(fx, fy);
    flamingo(ctx, { flip: f, oneLeg: one, s: 0.9 }, 0);
    ctx.restore();
  }
  // the tiger yard: long grass, a pool, rocks, and a fence along the front
  ctx.fillStyle = '#8fcf5a';
  ctx.fillRect(1140, 520, 640, 300);
  ellipse(ctx, 1260, 700, 70, 22, '#3fc8d8', 2.5);
  for (let k = 0; k < 40; k++) {
    const gx = 1150 + ((k * 97) % 620);
    const gy = 560 + ((k * 53) % 240);
    curve(ctx, gx, gy, gx + 3, gy - 14, gx + 8, gy - 22, '#5f9a3a', 2.5);
  }
  for (let i = 0; i < 7; i++) bigLeaf(ctx, 1200, 560, -2.9 + i * 0.4, 1.2, i % 2 ? '#3fae4a' : '#2f8a3e');
  for (let i = 0; i < 7; i++) bigLeaf(ctx, 1760, 560, -2.9 + i * 0.4, 1.1, i % 2 ? '#3fae4a' : '#2f8a3e');
  // a hollow log and a big red and white ball
  ctx.save();
  ctx.translate(1290, 790);
  rrect(ctx, -70, -30, 140, 30, 14, '#8a5a2c', 3);
  ellipse(ctx, 70, -15, 10, 15, '#c98f4f', 2.5);
  ellipse(ctx, 70, -15, 5, 9, '#3a2410', 0);
  ctx.restore();
  circle(ctx, 1560, 790, 22, '#ff3d3d', 3);
  ctx.save();
  ctx.beginPath();
  ctx.arc(1560, 790, 22, 0, TAU);
  ctx.clip();
  rect(ctx, 1538, 782, 44, 16, '#ffffff', 0);
  ctx.restore();
  rock(ctx, 1430, 740, 240, 80, '#b0a090');
  rock(ctx, 1610, 730, 130, 46, '#a89888');
  // a tug-toy and a hanging tyre for the tiger
  line(ctx, 1700, 540, 1700, 640, INK, 3);
  ctx.lineWidth = 14;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.ellipse(1700, 660, 26, 20, 0, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 9;
  ctx.strokeStyle = '#3a3f55';
  ctx.stroke();
  woodFence(ctx, 1130, 1790, 830, 64);
  // pond fence
  fence(ctx, 600, 1110, 830, 30, '#ffffff');
  // vines hanging from the canopies
  vine(ctx, 150, 330, 230, 1);
  vine(ctx, 1080, 300, 210, 2);
  vine(ctx, 1210, 330, 150, 3);
  vine(ctx, 1720, 340, 200, 4);
  // up in the trees: parrots, a green parrot, a chameleon and a toucan's friend
  for (const [px, py, c, wng, fl] of [[20, 380, '#ff3d3d', '#2f7bff', false], [130, 300, '#ffd23a', '#2f7bff', true], [1300, 380, '#4fc93a', '#2f8a2a', false], [1750, 300, '#ff3d3d', '#ffd23a', true]]) {
    ctx.save();
    ctx.translate(px, py);
    parrot(ctx, { colour: c, wing: wng, flip: fl }, 0);
    ctx.restore();
  }
  chameleon(ctx, 1000, 390, false);
  // a little lizard sunning on the island rock (brown, no ring)
  ctx.save();
  ctx.translate(420, 585);
  lizard(ctx, { colour: '#6fae3a' }, 0);
  ctx.restore();
  // the visitors' path
  ctx.fillStyle = lin(ctx, 0, PATH, 0, H, [[0, '#ecd7a8'], [1, '#e0c48a']]);
  ctx.fillRect(0, PATH, W, H - PATH);
  line(ctx, 0, PATH, W, PATH, INK, 3);
  speckle(ctx, 0, PATH, W, H - PATH, 500, ['#d2b07a', '#f6e6c0'], r, 2);
  // grass verges with flowers along the path edge
  ctx.fillStyle = '#7cc85a';
  ctx.fillRect(0, PATH, W, 22);
  line(ctx, 0, PATH + 22, W, PATH + 22, 'rgba(22,11,51,0.4)', 2);
  trainTrack(ctx);
  ctx.fillStyle = '#7cc85a';
  ctx.fillRect(0, TRACK + 22, W, H - TRACK - 22);
  line(ctx, 0, TRACK + 22, W, TRACK + 22, 'rgba(22,11,51,0.4)', 2);
  for (let k = 0; k < 40; k++) circle(ctx, (k * 47) % W, TRACK + 34 + (k % 3) * 6, 4, ['#ff5ab8', '#ffe14d', '#ffffff'][k % 3], 1.2);
  // everything on the path, back to front
  const D = depth();
  const keep = keepOutOf([...iggy, ...items.flatMap((it) => it.spots)]);
  const place = (x, y, hw, hh, fn) => {
    keep.push({ x, y: y - hh / 2, hw, hh: hh / 2 + 20 });
    D.add(y, fn);
  };
  place(250, 1010, 140, 240, () => kiosk(ctx, 250, 1010));
  // cafe tables by the kiosk
  for (const tx of [440]) {
    place(tx, 1080, 60, 90, () => {
      line(ctx, tx, 1080, tx, 1040, INK, 4);
      ellipse(ctx, tx, 1040, 34, 9, '#ffffff', 2.5);
      ctx.save();
      ctx.translate(tx, 1036);
      poly(ctx, [[-4, -12], [4, -12], [3, 0], [-3, 0]], '#ff7aa8', 1.5);
      ctx.restore();
      line(ctx, tx, 1040, tx, 960, INK, 3);
      ctx.beginPath();
      ctx.moveTo(tx - 60, 975);
      ctx.quadraticCurveTo(tx, 930, tx + 60, 975);
      ctx.closePath();
      fs(ctx, '#ff7a2a', 2.5);
    });
  }
  place(1000, 1000, 90, 130, () => mapBoard(ctx, 1000, 1000));
  place(1660, 1010, 80, 100, () => topiary(ctx, 1660, 1010));
  place(1350, 1100, 70, 70, () => bench(ctx, 1350, 1100, 130, '#2f8a3e'));
  place(1460, 1110, 30, 70, () => bin(ctx, 1460, 1110, '#2f8a3e'));
  place(1080, 880, 45, 130, () => signPost(ctx, 1080, 880, 'flamingo'));
  place(1290, 880, 45, 130, () => signPost(ctx, 1290, 880, 'tiger'));
  place(560, 880, 45, 130, () => signPost(ctx, 560, 880, 'monkey'));
  // a flower planter (Iggy sometimes peeks out of it)
  place(1100, 1150, 70, 60, () => {
    rect(ctx, 1040, 1110, 120, 40, '#c98f4f', 2.5);
    for (let k = 0; k < 6; k++) circle(ctx, 1050 + k * 20, 1104, 9, ['#ff5ab8', '#ffe14d', '#ff8a2a'][k % 3], 1.5);
  });
  // a dad asleep on a bench with a parrot sitting on his head
  place(760, 1110, 70, 80, () => {
    bench(ctx, 760, 1110, 120, '#c98f4f');
    personAt(ctx, 750, 1085, { pose: 'sit', skin: '#e0a878', hair: '#2a1a10', hairStyle: 'short', top: '#3a6bff', bottom: '#c98f4f', mood: 'sleep', hat: 'sun', hatColour: '#ffffff' }, 0);
    ctx.save();
    ctx.translate(752, 1001);
    parrot(ctx, { colour: '#ff3d3d', wing: '#ffd23a' }, 0);
    ctx.restore();
  });
  keep.push({ x: 1380, y: 940, hw: 60, hh: 70 }); // the kid roaring at the tiger
  keep.push({ x: 720, y: 870, hw: 70, hh: 70 }); // zookeeper by the pond
  keep.push({ x: 630, y: 840, hw: 60, hh: 50 }); // the peacock
  const ITEMS = ['icecream', 'camera', 'phone', 'drink', 'popcorn', 'binoculars', null, null, 'icecream'];
  const pts = scatter(r, 70, { x0: 50, y0: 900, x1: 1770, y1: 1195 }, keep, 50);
  pts.forEach((p, i) => {
    const seed = 300 + i;
    const kind = i % 6;
    if (kind === 0) {
      D.add(p.y, () => {
        // a family: a parent and a kid holding hands
        personAt(ctx, p.x - 16, p.y, randomPerson(seed, { kid: false, pose: 'walk', item: ITEMS[i % ITEMS.length], outfit: 'tee' }), 0);
        personAt(ctx, p.x + 18, p.y + 2, randomPerson(seed + 9, { kid: true, pose: 'stand', item: 'icecream', outfit: 'tee' }), 0);
      });
    } else if (kind === 1) {
      D.add(p.y, () => personAt(ctx, p.x, p.y, randomPerson(seed, { kid: true, pose: i % 4 ? 'cheer' : 'point', item: null }), 0));
    } else if (kind === 2) {
      D.add(p.y, () => {
        personAt(ctx, p.x, p.y, randomPerson(seed, { kid: false, pose: 'hold', item: 'camera', hat: i % 3 ? 'sun' : 'cap' }), 0);
      });
    } else if (kind === 3) {
      D.add(p.y, () => {
        // a stroller with a baby
        circle(ctx, p.x + 20, p.y - 6, 7, '#3a3f55', 2);
        circle(ctx, p.x + 52, p.y - 6, 7, '#3a3f55', 2);
        ctx.beginPath();
        ctx.moveTo(p.x + 12, p.y - 46);
        ctx.quadraticCurveTo(p.x + 36, p.y - 2, p.x + 62, p.y - 46);
        ctx.closePath();
        fs(ctx, ['#ff9ed2', '#9fe6ff', '#ffe14d'][i % 3], 2.5);
        circle(ctx, p.x + 38, p.y - 46, 9, '#ffd9b8', 2);
        personAt(ctx, p.x - 6, p.y, randomPerson(seed, { kid: false, pose: 'hold', item: null }), 0);
      });
    } else if (kind === 4) {
      D.add(p.y, () => personAt(ctx, p.x, p.y, randomPerson(seed, { kid: false, pose: i % 2 ? 'point' : 'walk', item: ITEMS[(i + 3) % ITEMS.length] }), 0));
    } else {
      D.add(p.y, () => {
        personAt(ctx, p.x - 18, p.y, randomPerson(seed, { pose: 'stand', item: 'drink' }), 0);
        personAt(ctx, p.x + 18, p.y + 3, randomPerson(seed + 3, { pose: 'wave', flip: true, item: null }), 0);
      });
    }
  });
  D.draw();
}

// --- moving things -----------------------------------------------------------------------------

const loop = (t, period) => (t % period) / period;

const actors = [
  ...[[300, 70, 44, 0], [1400, 120, 36, 0.5]].map(([x, y, s, p]) => ({
    x: W / 2, y, hw: W / 2 + 120, hh: s, over: true,
    draw(ctx, t) {
      cloud(ctx, ((x + t * 7 + p * W) % (W + 240)) - 120, y, s);
    },
  })),
  // the giraffe leaning over the trees to nibble, chewing
  {
    x: 1580, y: 280, hw: 70, hh: 150,
    keep: [{ x: 1590, y: 300, hw: 60, hh: 140 }],
    draw(ctx, t) {
      ctx.save();
      ctx.translate(1600, 430);
      giraffeHead(ctx, { s: 1.1 }, t);
      ctx.restore();
    },
  },
  // mum elephant's trunk swinging up to spray a fountain now and then
  {
    x: 800, y: 420, hw: 90, hh: 110,
    keep: [{ x: 800, y: 430, hw: 60, hh: 90 }],
    draw(ctx, t) {
      const k = loop(t, 5);
      const up = k < 0.5 ? Math.sin((k / 0.5) * Math.PI) : 0;
      const tx = 820 + up * 10;
      const ty = 505 - up * 105;
      limb(ctx, [[800, 436], [816, 470 - up * 40], [tx, ty]], '#9aa4b8', 14);
      if (up > 0.6) {
        for (let i = 0; i < 9; i++) {
          const a = i / 9;
          ctx.fillStyle = 'rgba(160,230,255,0.85)';
          ctx.beginPath();
          ctx.arc(tx + a * 70, ty - Math.sin(a * Math.PI) * 60 - 6, 5 - a * 2, 0, TAU);
          ctx.fill();
        }
      }
    },
  },
  // a peacock on the verge, fanning his tail open and shut
  {
    x: 630, y: 830, hw: 60, hh: 50,
    keep: [{ x: 630, y: 835, hw: 55, hh: 45 }],
    draw(ctx, t) {
      const k = loop(t, 6);
      const open = k < 0.5 ? Math.sin((k / 0.5) * Math.PI) : 0;
      ctx.save();
      ctx.translate(630, 872);
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i - 4) * (0.12 + open * 0.2);
        const L = 30 + open * 30;
        ctx.save();
        ctx.rotate(a + Math.PI / 2);
        ellipse(ctx, 0, -L / 2 - 10, 7 + open * 4, L / 2, '#2fa86a', 1.8);
        circle(ctx, 0, -L - 4, 4 + open * 2, '#2f7bff', 1.5);
        ctx.restore();
      }
      ellipse(ctx, 0, -14, 10, 14, '#2f6bff', 2.5);
      limb(ctx, [[4, -24], [8, -40]], '#2f6bff', 6);
      circle(ctx, 9, -44, 6, '#2f6bff', 2);
      poly(ctx, [[14, -45], [20, -43], [14, -41]], '#ffb020', 1);
      line(ctx, 9, -50, 9, -58, INK, 1.5);
      circle(ctx, 9, -59, 2.5, '#2fa86a', 1);
      line(ctx, -2, -2, -3, 6, INK, 2);
      line(ctx, 4, -2, 5, 6, INK, 2);
      ctx.restore();
    },
  },
  // the zookeeper up on the giraffe platform, holding out leaves
  {
    x: 1520, y: 230, hw: 50, hh: 70,
    keep: [{ x: 1515, y: 235, hw: 30, hh: 55 }],
    draw(ctx, t) {
      ctx.save();
      ctx.translate(1510, 280);
      ctx.scale(0.85, 0.85);
      person(ctx, { pose: 'point', skin: '#c68a5a', hair: '#2a1a10', top: '#c9b46a', bottom: '#7a6a3a', hat: 'sun', hatColour: '#c9b46a', phase: 1 }, t);
      ctx.restore();
      ellipse(ctx, 1546, 236 + Math.sin(t * 2) * 2, 12, 6, '#3fae4a', 2, INK, -0.4);
    },
  },
  // two monkeys swinging from the island branch, one with a stolen hat
  ...[[230, 377, 0, false], [380, 370, 1.7, true]].map(([x, y, p, hat]) => ({
    x, y: y + 50, hw: 50, hh: 70,
    draw(ctx, t) {
      ctx.save();
      ctx.translate(x, y);
      monkey(ctx, { hang: true, phase: p, colour: hat ? '#a8743f' : '#8a5a2c' }, t);
      if (hat) {
        ctx.rotate(Math.sin(t * 2 + p) * 0.25);
        ellipse(ctx, 0, 52, 18, 5, '#ff3d5a', 2);
        rrect(ctx, -9, 40, 18, 12, 5, '#ff3d5a', 2);
      }
      ctx.restore();
    },
  })),
  // a monkey on the rock eating a banana
  {
    x: 200, y: 520, hw: 40, hh: 50,
    draw(ctx, t) {
      ctx.save();
      ctx.translate(200, 558);
      monkey(ctx, { phase: 3 }, t);
      ctx.restore();
    },
  },
  // flamingos dipping for food in the pond
  ...[[790, 690, 0, false], [690, 712, 2, false]].map(([x, y, p, f]) => ({
    x, y: y - 45, hw: 40, hh: 55,
    draw(ctx, t) {
      ctx.save();
      ctx.translate(x, y);
      flamingo(ctx, { feed: true, phase: p, flip: f, s: 0.9 }, t);
      ctx.restore();
    },
  })),
  // the tiger stretched on the big rock, tail swishing, yawning now and then
  {
    x: 1420, y: 640, hw: 110, hh: 60,
    keep: [{ x: 1420, y: 650, hw: 100, hh: 50 }],
    draw(ctx, t) {
      ctx.save();
      ctx.translate(1410, 678);
      ctx.scale(1.3, 1.3);
      tiger(ctx, { phase: 0 }, t);
      ctx.restore();
    },
  },
  // a kid roaring back at the tiger while dad takes a photo
  {
    x: 1380, y: 920, hw: 70, hh: 80,
    keep: [{ x: 1380, y: 920, hw: 60, hh: 70 }],
    draw(ctx, t) {
      ctx.save();
      ctx.translate(1350, 970);
      person(ctx, { pose: 'cheer', kid: true, skin: '#f5c49c', hair: '#b23a1e', hairStyle: 'spiky', top: '#ff8a2a', stripes: '#16101e', bottom: '#2a4a8a', mood: 'wow', phase: 2 }, t);
      ctx.restore();
      ctx.save();
      ctx.translate(1410, 975);
      person(ctx, { pose: 'hold', flip: true, item: 'camera', skin: '#ffd9b8', hair: '#7a4a22', hairStyle: 'short', top: '#21c7a8', bottom: '#3a3f55', hat: 'cap', hatColour: '#ff3d5a', phase: 4 }, t);
      ctx.restore();
    },
  },
  // the keeper by the pond throwing food
  {
    x: 720, y: 860, hw: 60, hh: 70,
    keep: [{ x: 720, y: 860, hw: 55, hh: 60 }],
    draw(ctx, t) {
      ctx.save();
      ctx.translate(720, 920);
      person(ctx, { pose: 'wave', skin: '#9a6440', hair: '#16101e', hairStyle: 'bun', top: '#c9b46a', bottom: '#7a6a3a', hat: 'sun', hatColour: '#c9b46a', phase: 5 }, t);
      ctx.restore();
      const k = loop(t, 1.2);
      for (let i = 0; i < 4; i++) circle(ctx, 750 + k * 60 + i * 6, 790 - Math.sin(k * Math.PI) * 50 + i * 3, 2.5, '#ff8a6a', 0);
    },
  },
  // the sloth hanging from a branch of the big tree, very slowly
  {
    x: 1010, y: 230, hw: 50, hh: 50,
    draw(ctx, t) {
      line(ctx, 950, 208, 1070, 214, INK, 10);
      line(ctx, 950, 208, 1070, 214, '#6e4426', 6);
      ctx.save();
      ctx.translate(1010, 212);
      sloth(ctx, {}, t);
      ctx.restore();
    },
  },
  // the toucan bobbing on a branch, and a green snake draped beside it
  {
    x: 1250, y: 320, hw: 90, hh: 50,
    draw(ctx, t) {
      ctx.save();
      ctx.translate(1215, 345);
      toucan(ctx, {}, t);
      ctx.restore();
      ctx.save();
      ctx.translate(1270, 330);
      ctx.scale(0.8, 0.8);
      snake(ctx, { colour: '#5fc93a' }, t);
      ctx.restore();
    },
  },
  // a parrot flying across the canopy
  {
    x: W / 2, y: 180, hw: W / 2 + 100, hh: 60, over: true,
    draw(ctx, t) {
      const k = loop(t, 14);
      const x = -60 + k * (W + 120);
      const y = 170 + Math.sin(t * 2) * 30;
      const f = Math.sin(t * 12);
      ctx.save();
      ctx.translate(x, y);
      poly(ctx, [[-4, 0], [-10, -20 - f * 12], [8, -2]], '#2f7bff', 2);
      ellipse(ctx, 0, 0, 16, 7, '#ff3d3d', 2);
      poly(ctx, [[-14, 0], [-34, 4], [-14, 5]], '#ffd23a', 2);
      circle(ctx, 16, -3, 6, '#ff3d3d', 2);
      poly(ctx, [[21, -4], [27, 0], [21, 2]], '#ffe9b0', 1.5);
      ctx.restore();
    },
  },
  // bees busy over the planter
  {
    x: 1100, y: 1070, hw: 60, hh: 30, over: true,
    draw(ctx, t) {
      for (let i = 0; i < 2; i++) {
        ctx.save();
        ctx.translate(1100 + Math.cos(t * 1.7 + i * 3) * 50, 1070 + Math.sin(t * 2.3 + i) * 15);
        bee(ctx, {}, t);
        ctx.restore();
      }
    },
  },
  // the little zoo train chugging along the front
  {
    x: W / 2, y: TRACK - 50, hw: W / 2 + 300, hh: 80,
    keep: [{ x: W / 2, y: TRACK - 40, hw: W / 2, hh: 55 }],
    draw(ctx, t, view) {
      const head = ((t * 60) % (W + 700)) - 100;
      // carriages behind the engine
      const cols = ['#ff3d5a', '#ffd23a', '#2fb5e8', '#a64dff'];
      for (let c = 0; c < 4; c++) {
        const cx = head - 150 - c * 130;
        if (view && (cx + 80 < view.x0 || cx - 80 > view.x1)) continue;
        for (let k = 0; k < 2; k++) {
          ctx.save();
          ctx.translate(cx - 26 + k * 50, TRACK - 30 + Math.abs(Math.sin(t * 6 + c + k)) * -2);
          ctx.scale(0.7, 0.7);
          person(ctx, randomPerson(500 + c * 2 + k, { pose: (c + k) % 2 ? 'wave' : 'cheer', kid: (c + k) % 3 !== 0, item: null, hat: null }), t);
          ctx.restore();
        }
        rrect(ctx, cx - 58, TRACK - 44, 116, 36, 6, cols[c], 2.5);
        line(ctx, cx - 58, TRACK - 32, cx + 58, TRACK - 32, '#ffffff', 3);
        circle(ctx, cx - 34, TRACK - 6, 9, '#3a3f55', 2);
        circle(ctx, cx + 34, TRACK - 6, 9, '#3a3f55', 2);
        line(ctx, cx + 58, TRACK - 20, cx + 72, TRACK - 20, INK, 3);
      }
      // the engine: a green and yellow puffer with a smiley face
      ctx.save();
      ctx.translate(head, TRACK);
      rrect(ctx, -60, -70, 70, 62, 6, '#2f8a3e', 2.5);
      rect(ctx, -50, -60, 40, 26, '#9fe6ff', 2);
      rrect(ctx, 0, -50, 70, 42, 18, '#ffd23a', 2.5);
      rect(ctx, 40, -78, 16, 30, '#3a3f55', 2.5);
      circle(ctx, 62, -30, 4, INK, 0);
      circle(ctx, -36, -6, 14, '#ff3d5a', 2.5);
      circle(ctx, 30, -6, 11, '#ff3d5a', 2.5);
      ctx.translate(-30, -48);
      ctx.scale(0.65, 0.65);
      person(ctx, { pose: 'wave', skin: '#e0a878', hair: '#e8e0d0', hairStyle: 'bald', top: '#2f8a3e', bottom: '#3a3f55', hat: 'cap', hatColour: '#3a3f55', phase: 6 }, t);
      ctx.restore();
      for (let i = 0; i < 4; i++) {
        const k = ((t * 1.5 + i / 4) % 1);
        ctx.fillStyle = `rgba(255,255,255,${0.8 - k * 0.8})`;
        ctx.beginPath();
        ctx.arc(head + 48 - k * 60, TRACK - 84 - k * 50, 8 + k * 14, 0, TAU);
        ctx.fill();
      }
    },
  },
];

// --- hiding places ----------------------------------------------------------------------------

const iggy = [
  sp(60, 378, { pose: 'peek' }), // in the hollow of the big tree
  sp(985, 705, { pose: 'float', cover: pondCover(985, 705) }), // among the flamingos
  sp(1610, 686, { pose: 'lie', s: 0.9 }), // sunbathing on the small rock beside the tiger
  sp(298, 470, { pose: 'cling', cover: leafCluster(300, 504, 0.55, 1) }), // up the island tree
  sp(1560, 950, { pose: 'stand', cover: bushCover(1560, 960, 120, 60, 7, '#ff5ab8'), hit: [34, 34], hy: -80 }), // behind a bush
  sp(300, 950, { pose: 'peek' }), // on the snack kiosk counter
  sp(1000, 882, { pose: 'peek' }), // on top of the zoo map
  sp(1110, 1106, { pose: 'peek' }), // in the flower planter
];

const items = [
  { id: 'bananas', prop: 'bananas', spots: [sp(470, 560), sp(1220, 1130)] },
  { id: 'butterfly', prop: 'zoo-butterfly', o: { colour: '#ff8a2a' }, count: 2, spots: [sp(560, 400), sp(860, 560), sp(150, 880), sp(1730, 1130)] },
  { id: 'frog', prop: 'frog', count: 2, spots: [sp(880, 762), sp(760, 752), sp(930, 640)] },
  { id: 'snail', prop: 'snail', count: 2, spots: [sp(90, 770), sp(1180, 990), sp(620, 1130), sp(1760, 900)] },
  { id: 'balloon', prop: 'balloon', o: { colour: '#ff3d5a' }, spots: [sp(640, 330), sp(1380, 460)] },
  { id: 'ticket', prop: 'ticket', spots: [sp(420, 1135), sp(900, 1135)] },
  { id: 'key', prop: 'key', spots: [sp(1520, 800), sp(170, 1130)] },
  { id: 'sunhat', prop: 'sunhat', spots: [sp(1180, 780), sp(650, 960)] },
  { id: 'teddy', prop: 'teddy', spots: [sp(1745, 610), sp(520, 1060)] },
  { id: 'flower', prop: 'flower', o: { colour: '#ff5ab8' }, count: 2, spots: [sp(40, 1130), sp(1300, 1135), sp(760, 990), sp(1680, 1120)] },
  { id: 'pineapple', prop: 'pineapple', spots: [sp(1680, 780), sp(400, 1090)] },
  { id: 'carrot', prop: 'carrot', spots: [sp(1330, 770, { rot: 1.2 }), sp(50, 980)] },
  { id: 'sunglasses', prop: 'sunglasses', spots: [sp(1130, 650), sp(850, 1090)] },
  { id: 'compass', prop: 'compass', spots: [sp(1480, 1135), sp(260, 1135)] },
  { id: 'lollipop', prop: 'lollipop', spots: [sp(980, 1100), sp(140, 1060)] },
  { id: 'watch', prop: 'watch', spots: [sp(590, 660, { rot: 1.4 }), sp(1440, 1010, { rot: 1.4 })] },
  { id: 'glove', prop: 'glove', o: { colour: '#2fb5e8' }, spots: [sp(560, 760), sp(1240, 1080)] },
];

function sticker(ctx, r, t) {
  ctx.save();
  ctx.scale(r / 100, r / 100);
  ctx.fillStyle = lin(ctx, 0, -100, 0, 100, [[0, '#8fe06a'], [1, '#2f8a3e']]);
  ctx.beginPath();
  ctx.arc(0, 0, 100, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 6; i++) bigLeaf(ctx, -100 + i * 40, -60 + (i % 2) * 20, -0.3 + (i % 3) * 0.4, 1.1, i % 2 ? '#3fae4a' : '#2f8a3e');
  ctx.save();
  ctx.translate(-40, 4);
  monkey(ctx, { hang: true }, t);
  ctx.restore();
  ctx.save();
  ctx.translate(40, 72);
  drawProp(ctx, 'iggy-stand', {}, t);
  ctx.restore();
  ctx.restore();
}

// The shared butterfly folds its wings shut at t = 0, which reads badly in the tray and the
// still picture, so this one is always caught with its wings open.
const props = {
  'zoo-butterfly': { box: [0, 0, 18, 16], draw: (ctx, o, t) => butterfly(ctx, { ...o, s: 1.5 }, 0.15 + (o.still ? 0 : (Math.abs(Math.sin(t * 2)) * 0.1))) },
};

export default {
  id: 'zoo',
  props,
  name: 'Jungle Zoo',
  W, H,
  edge: '#3a9a44',
  back,
  actors,
  iggy,
  items,
  sticker,
};
