// Memory Beach pictures. Every picture draws itself centred on (0, 0) in a 100 x 100 box
// (-50..50 each way) through the ctx it is given: chunky shapes, thick ink outlines, one or
// two strong colours each, so they read at a glance even on a phone card. No DOM.
// drawPicture() scales one into place; tintable pictures take a colour for their main part.
import { COLOURS } from './catalog.js';

export const INK = '#160b33';
const TAU = Math.PI * 2;
const LW = 4;

// ---------------------------------------------------------------------------------------------
// Little helpers
// ---------------------------------------------------------------------------------------------

function poly(ctx, pts, close = true) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  if (close) ctx.closePath();
}
function circ(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
}
function oval(ctx, x, y, rx, ry, a = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, a, 0, TAU);
}
function rbox(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
// fill the current path, then ink round it
function paint(ctx, fill, lw = LW) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
}
function ink(ctx, lw = LW, colour = INK) {
  ctx.lineWidth = lw;
  ctx.strokeStyle = colour;
  ctx.stroke();
}
// a thick coloured line with an ink edge; build() traces the (open) path
function tube(ctx, build, colour, w) {
  ctx.beginPath();
  build();
  ink(ctx, w + LW * 1.6);
  ctx.beginPath();
  build();
  ink(ctx, w, colour);
}
const line = (pts) => (ctx) => () => pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
function eye(ctx, x, y, r = 5, dx = 0, dy = 0) {
  circ(ctx, x, y, r);
  paint(ctx, '#ffffff', 2.5);
  circ(ctx, x + dx * r * 0.35, y + dy * r * 0.35, r * 0.58);
  ctx.fillStyle = INK;
  ctx.fill();
  circ(ctx, x + dx * r * 0.35 - r * 0.2, y + dy * r * 0.35 - r * 0.22, r * 0.2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}
function dotEye(ctx, x, y, r = 3.2) {
  circ(ctx, x, y, r);
  ctx.fillStyle = INK;
  ctx.fill();
  circ(ctx, x - r * 0.3, y - r * 0.35, r * 0.35);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}
function smile(ctx, x, y, r, lw = 3) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0.2 * Math.PI, 0.8 * Math.PI);
  ink(ctx, lw);
}
function shine(ctx, x, y, rx, ry, a = 0, alpha = 0.55) {
  oval(ctx, x, y, rx, ry, a);
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.fill();
}
function cheek(ctx, x, y, r = 4) {
  circ(ctx, x, y, r);
  ctx.fillStyle = 'rgba(255,90,140,0.45)';
  ctx.fill();
}
function water(ctx, y, colour = '#2fb8ff') {
  ctx.beginPath();
  ctx.moveTo(-46, y);
  for (let x = -46; x <= 46; x += 2) ctx.lineTo(x, y + Math.sin(x / 7) * 3);
  ctx.lineTo(46, y + 14);
  ctx.quadraticCurveTo(0, y + 18, -46, y + 14);
  ctx.closePath();
  paint(ctx, colour, 3);
}
function sandMound(ctx, y, w = 46) {
  ctx.beginPath();
  ctx.moveTo(-w, y + 8);
  ctx.quadraticCurveTo(0, y - 10, w, y + 8);
  ctx.closePath();
  paint(ctx, '#f6d37a', 3);
}
// lighten or darken a #rrggbb colour by k (-1..1)
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// ---------------------------------------------------------------------------------------------
// The library
// ---------------------------------------------------------------------------------------------

function flamingo(ctx) {
  const leg = '#ff6f9f';
  tube(ctx, line([[6, 12], [6, 47]])(ctx), leg, 3.5);
  tube(ctx, line([[12, 12], [24, 26], [8, 30]])(ctx), leg, 3.5);
  poly(ctx, [[0, 46], [12, 46]], false);
  ink(ctx, 4);
  // tail
  poly(ctx, [[28, -6], [44, -14], [40, 4]]);
  paint(ctx, '#ff3d8b');
  oval(ctx, 10, 0, 26, 15, -0.2);
  paint(ctx, '#ff5fa2');
  oval(ctx, 16, -1, 15, 9, -0.35);
  paint(ctx, '#ff2e83', 3);
  // neck
  tube(ctx, () => {
    ctx.moveTo(-10, -6);
    ctx.bezierCurveTo(-30, -14, -4, -26, -14, -36);
  }, '#ff5fa2', 7);
  circ(ctx, -12, -38, 9);
  paint(ctx, '#ff5fa2');
  // the bent beak
  poly(ctx, [[-19, -42], [-34, -38], [-36, -28], [-31, -29], [-29, -34], [-19, -34]]);
  paint(ctx, '#fff0f5', 3);
  poly(ctx, [[-33, -38.5], [-36, -28], [-31, -29], [-30.5, -35]]);
  ctx.fillStyle = INK;
  ctx.fill();
  dotEye(ctx, -11, -40, 2.8);
}

function gator(ctx) {
  const g = '#3e9e3a';
  const gl = '#8fd35f';
  // tail
  poly(ctx, [[22, -4], [48, 14], [44, 18], [20, 12]]);
  paint(ctx, g);
  // legs
  rbox(ctx, -6, 12, 9, 14, 3);
  paint(ctx, g);
  rbox(ctx, 16, 12, 9, 14, 3);
  paint(ctx, g);
  oval(ctx, 8, 4, 22, 12);
  paint(ctx, g);
  oval(ctx, 8, 9, 16, 5);
  ctx.fillStyle = gl;
  ctx.fill();
  // back bumps
  for (let i = 0; i < 4; i++) {
    poly(ctx, [[-4 + i * 8, -6], [0 + i * 8, -12], [4 + i * 8, -6]]);
    paint(ctx, g, 3);
  }
  // open mouth: lower jaw, pink inside, upper jaw with teeth
  poly(ctx, [[-10, 6], [-47, 14], [-46, 20], [-8, 16]]);
  paint(ctx, g);
  poly(ctx, [[-12, -2], [-46, 0], [-45, 12], [-10, 8]]);
  paint(ctx, '#ff7a9a', 3);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 5; i++) {
    poly(ctx, [[-42 + i * 6, -1], [-39 + i * 6, 6], [-36 + i * 6, -1]]);
    paint(ctx, '#ffffff', 1.5);
    poly(ctx, [[-42 + i * 6, 14], [-39 + i * 6, 8], [-36 + i * 6, 13]]);
    paint(ctx, '#ffffff', 1.5);
  }
  poly(ctx, [[-6, -12], [-48, -8], [-48, -1], [-8, 0]]);
  paint(ctx, g);
  circ(ctx, -44, -9, 3);
  paint(ctx, g, 2.5);
  // eye bump
  circ(ctx, -12, -14, 7);
  paint(ctx, g);
  eye(ctx, -12, -15, 4.5, -0.4, 0);
}

function pelican(ctx) {
  rbox(ctx, -10, 26, 22, 24, 3);
  paint(ctx, '#a8703f');
  poly(ctx, [[-8, 32], [10, 32]], false);
  ink(ctx, 2);
  // feet
  oval(ctx, -4, 27, 7, 3);
  paint(ctx, '#ffa23a', 2.5);
  oval(ctx, 8, 27, 7, 3);
  paint(ctx, '#ffa23a', 2.5);
  oval(ctx, -4, 6, 20, 22);
  paint(ctx, '#f4f4ef');
  oval(ctx, -10, 8, 14, 17, 0.3);
  paint(ctx, '#b9c3d2', 3);
  // neck and head
  rbox(ctx, -2, -30, 14, 24, 7);
  paint(ctx, '#f4f4ef');
  circ(ctx, 4, -30, 11);
  paint(ctx, '#f4f4ef');
  poly(ctx, [[-2, -40], [6, -46], [8, -38]]);
  paint(ctx, '#ffe07a', 2.5);
  // the big pouch beak
  ctx.beginPath();
  ctx.moveTo(10, -26);
  ctx.quadraticCurveTo(26, -2, 47, -24);
  ctx.closePath();
  paint(ctx, '#ffd34d');
  poly(ctx, [[10, -35], [48, -27], [47, -23], [10, -26]]);
  paint(ctx, '#ff9f2e');
  dotEye(ctx, 3, -32, 3);
}

function manatee(ctx) {
  const g = '#8f9fb4';
  water(ctx, 30, '#59c8ff');
  // paddle tail
  oval(ctx, 40, 4, 9, 15, 0.1);
  paint(ctx, g);
  oval(ctx, 4, 4, 36, 21);
  paint(ctx, g);
  shine(ctx, 0, -8, 22, 6, 0, 0.35);
  // wrinkles
  for (const x of [12, 20]) {
    ctx.beginPath();
    ctx.arc(x, 4, 14, -0.6, 0.6);
    ink(ctx, 2, 'rgba(22,11,51,0.35)');
  }
  oval(ctx, -8, 20, 11, 5, 0.6);
  paint(ctx, g);
  // the snout
  oval(ctx, -30, 10, 14, 11);
  paint(ctx, '#b4c0d0');
  ctx.fillStyle = INK;
  for (const [x, y] of [[-36, 8], [-32, 12], [-27, 8], [-34, 14]]) {
    circ(ctx, x, y, 1.2);
    ctx.fill();
  }
  dotEye(ctx, -24, -6, 3);
  cheek(ctx, -20, 4, 3.5);
  ctx.beginPath();
  ctx.arc(-31, 14, 5, 0.3, 2.6);
  ink(ctx, 2.5);
}

function dolphin(ctx) {
  water(ctx, 32, '#59c8ff');
  ctx.save();
  ctx.rotate(-0.38);
  const b = '#3b8fe6';
  // flukes
  poly(ctx, [[30, -2], [48, -14], [44, 1], [48, 14], [30, 5]]);
  paint(ctx, b);
  poly(ctx, [[-2, -12], [10, -28], [13, -11]]);
  paint(ctx, b);
  oval(ctx, 0, 0, 34, 13);
  paint(ctx, b);
  oval(ctx, -6, 6, 24, 5.5);
  ctx.fillStyle = '#cfe8ff';
  ctx.fill();
  oval(ctx, -38, 3, 9, 4.5);
  paint(ctx, b);
  poly(ctx, [[-10, 8], [-2, 22], [4, 9]]);
  paint(ctx, b, 3);
  dotEye(ctx, -22, -3, 3);
  ctx.beginPath();
  ctx.arc(-34, 0, 7, 0.4, 1.6);
  ink(ctx, 2.5);
  ctx.restore();
  // splash drops
  for (const [x, y] of [[-30, 22], [-38, 16], [30, 26]]) {
    oval(ctx, x, y, 3, 4.5);
    paint(ctx, '#bdf0ff', 2);
  }
}

function iguana(ctx) {
  const g = '#7ed957';
  const gd = '#4ea83a';
  // curly tail
  tube(ctx, () => {
    ctx.moveTo(24, 8);
    ctx.bezierCurveTo(46, 12, 48, 36, 30, 36);
    ctx.bezierCurveTo(20, 36, 22, 26, 30, 28);
  }, g, 8);
  // legs
  for (const x of [-8, 18]) {
    tube(ctx, line([[x, 10], [x - 4, 24], [x - 10, 26]])(ctx), g, 5);
  }
  // crest spikes
  ctx.fillStyle = '#ff9a3c';
  for (let i = 0; i < 7; i++) {
    const x = -26 + i * 7.5;
    const y = i < 2 ? -14 : -8 + Math.abs(i - 4) * 0.8;
    poly(ctx, [[x - 3.5, y + 4], [x, y - 7], [x + 3.5, y + 4]]);
    paint(ctx, '#ff9a3c', 2.5);
  }
  oval(ctx, 6, 4, 22, 11);
  paint(ctx, g);
  // stripes
  for (const x of [2, 12, 22]) {
    poly(ctx, [[x, -6], [x - 3, 10]], false);
    ink(ctx, 3, gd);
  }
  // dewlap
  oval(ctx, -22, 8, 7, 9);
  paint(ctx, '#ffc14d', 3);
  // head
  ctx.beginPath();
  ctx.moveTo(-14, -12);
  ctx.quadraticCurveTo(-46, -16, -46, -2);
  ctx.quadraticCurveTo(-44, 6, -14, 6);
  ctx.closePath();
  paint(ctx, g);
  eye(ctx, -26, -6, 5.5, -0.5, 0);
  smile(ctx, -38, -6, 6, 2.5);
}

function crab(ctx, tint) {
  const c = tint || '#ff4b3e';
  const d = shade(c, -0.3);
  // legs
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      tube(ctx, line([[s * 18, 10 + i * 5], [s * 34, 14 + i * 7], [s * 40, 24 + i * 7]])(ctx), d, 4);
    }
    // arm and claw
    tube(ctx, line([[s * 18, 0], [s * 30, -10], [s * 32, -20]])(ctx), c, 5);
    ctx.beginPath();
    ctx.moveTo(s * 33, -24);
    ctx.arc(s * 33, -26, 12, -Math.PI / 2 + 0.5, -Math.PI / 2 - 0.5 + TAU);
    ctx.closePath();
    paint(ctx, c);
  }
  // eye stalks
  for (const s of [-1, 1]) {
    tube(ctx, line([[s * 7, -6], [s * 9, -20]])(ctx), c, 3);
    eye(ctx, s * 9, -22, 6, 0, -0.2);
  }
  oval(ctx, 0, 10, 28, 17);
  paint(ctx, c);
  shine(ctx, -10, 2, 9, 4, -0.3, 0.45);
  smile(ctx, 0, 10, 8, 3);
}

function turtle(ctx) {
  const skin = '#9bdc6a';
  // flippers
  oval(ctx, -26, -14, 16, 7, -0.6);
  paint(ctx, skin);
  oval(ctx, 26, -14, 16, 7, 0.6);
  paint(ctx, skin);
  oval(ctx, -20, 24, 10, 6, 0.6);
  paint(ctx, skin);
  oval(ctx, 20, 24, 10, 6, -0.6);
  paint(ctx, skin);
  poly(ctx, [[-4, 30], [0, 42], [4, 30]]);
  paint(ctx, skin, 3);
  // head
  oval(ctx, 0, -33, 10, 11);
  paint(ctx, skin);
  dotEye(ctx, -4.5, -36, 2.6);
  dotEye(ctx, 4.5, -36, 2.6);
  smile(ctx, 0, -33, 4, 2.2);
  // shell
  oval(ctx, 0, 4, 25, 29);
  paint(ctx, '#2f9e4a');
  oval(ctx, 0, 4, 19, 23);
  ctx.fillStyle = '#46b85a';
  ctx.fill();
  // hexagons
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#1d6b33';
  const hex = (x, y, r) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) ctx.lineTo(x + Math.cos((i * TAU) / 6) * r, y + Math.sin((i * TAU) / 6) * r);
    ctx.closePath();
    ctx.fillStyle = '#5fcf6c';
    ctx.fill();
    ctx.stroke();
  };
  hex(0, 4, 8);
  hex(0, -12, 6);
  hex(0, 20, 6);
  hex(-13, -3, 5.5);
  hex(13, -3, 5.5);
  hex(-13, 12, 5.5);
  hex(13, 12, 5.5);
}

function parrot(ctx) {
  // branch
  tube(ctx, line([[-40, 28], [40, 24]])(ctx), '#a8703f', 7);
  // tail
  poly(ctx, [[2, 18], [16, 50], [26, 46], [12, 16]]);
  paint(ctx, '#2f6bff', 3);
  poly(ctx, [[6, 18], [10, 48], [18, 48], [14, 16]]);
  paint(ctx, '#ff3b30', 3);
  oval(ctx, 2, 0, 17, 24, 0.15);
  paint(ctx, '#ff3b30');
  // wing: yellow then blue
  oval(ctx, 8, 6, 11, 19, 0.3);
  paint(ctx, '#2f6bff', 3);
  oval(ctx, 6, -2, 9, 9, 0.3);
  paint(ctx, '#ffd21a', 2.5);
  circ(ctx, -6, -24, 14);
  paint(ctx, '#ff3b30');
  // white face patch
  oval(ctx, -12, -24, 6, 7);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  // hooked beak
  ctx.beginPath();
  ctx.moveTo(-17, -32);
  ctx.quadraticCurveTo(-36, -30, -28, -12);
  ctx.lineTo(-24, -19);
  ctx.quadraticCurveTo(-20, -22, -16, -18);
  ctx.closePath();
  paint(ctx, '#fff1d6', 3);
  eye(ctx, -11, -27, 4, -0.3, 0);
  // feet
  for (const x of [-4, 6]) {
    oval(ctx, x, 24, 4, 3);
    paint(ctx, '#8a8a8a', 2);
  }
}

function toucan(ctx) {
  tube(ctx, line([[-40, 32], [40, 30]])(ctx), '#a8703f', 7);
  const body = '#2b2540';
  poly(ctx, [[10, 22], [16, 44], [26, 42], [20, 20]]);
  paint(ctx, body, 3);
  oval(ctx, 10, 6, 17, 24, 0.1);
  paint(ctx, body);
  oval(ctx, 2, -2, 10, 14);
  paint(ctx, '#fff3a8', 3);
  circ(ctx, 6, -22, 13);
  paint(ctx, body);
  oval(ctx, 0, -14, 7, 6);
  ctx.fillStyle = '#fff3a8';
  ctx.fill();
  // the huge beak
  ctx.beginPath();
  ctx.moveTo(-4, -32);
  ctx.bezierCurveTo(-28, -38, -46, -28, -48, -14);
  ctx.bezierCurveTo(-34, -16, -18, -14, -4, -16);
  ctx.closePath();
  paint(ctx, '#ff9a1a');
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#7ed957';
  ctx.fillRect(-50, -40, 60, 8);
  ctx.fillStyle = '#ff3b30';
  ctx.fillRect(-50, -40, 10, 40);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-4, -32);
  ctx.bezierCurveTo(-28, -38, -46, -28, -48, -14);
  ctx.bezierCurveTo(-34, -16, -18, -14, -4, -16);
  ctx.closePath();
  ink(ctx);
  circ(ctx, 6, -24, 6.5);
  paint(ctx, '#3db4ff', 2.5);
  dotEye(ctx, 6, -24, 3);
  for (const x of [4, 14]) {
    oval(ctx, x, 29, 4, 3);
    paint(ctx, '#5a8fd6', 2);
  }
}

function octopus(ctx, tint) {
  const c = tint || '#a64dff';
  for (let i = 0; i < 6; i++) {
    const x = -22 + i * 8.8;
    const dir = i < 3 ? -1 : 1;
    tube(ctx, () => {
      ctx.moveTo(x, 4);
      ctx.bezierCurveTo(x + dir * 2, 26, x + dir * 14, 34, x + dir * 12, 42);
      ctx.quadraticCurveTo(x + dir * 6, 46, x + dir * 6, 40);
    }, c, 7);
  }
  oval(ctx, 0, -12, 28, 27);
  paint(ctx, c);
  shine(ctx, -12, -26, 8, 5, -0.5, 0.45);
  for (const [x, y] of [[12, -26], [18, -16], [6, -32]]) {
    circ(ctx, x, y, 2.6);
    ctx.fillStyle = shade(c, -0.25);
    ctx.fill();
  }
  eye(ctx, -10, -8, 7, 0.2, 0.2);
  eye(ctx, 10, -8, 7, -0.2, 0.2);
  smile(ctx, 0, 2, 6, 3);
}

function jellyfish(ctx) {
  const c = '#ff8ad8';
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const x = -18 + i * 9;
    ctx.beginPath();
    ctx.moveTo(x, 4);
    for (let y = 4; y <= 44; y += 2) ctx.lineTo(x + Math.sin(y / 5 + i) * 4, y);
    ink(ctx, 8.5);
    ctx.beginPath();
    ctx.moveTo(x, 4);
    for (let y = 4; y <= 44; y += 2) ctx.lineTo(x + Math.sin(y / 5 + i) * 4, y);
    ink(ctx, 4, i % 2 ? '#c06cff' : '#ffb3e6');
  }
  // dome with a frilly edge
  ctx.beginPath();
  ctx.moveTo(-32, 4);
  ctx.bezierCurveTo(-32, -44, 32, -44, 32, 4);
  for (let i = 0; i < 6; i++) {
    const x0 = 32 - i * (64 / 6);
    ctx.quadraticCurveTo(x0 - 64 / 12, 12, x0 - 64 / 6, 4);
  }
  ctx.closePath();
  paint(ctx, c);
  shine(ctx, -14, -18, 8, 5, -0.6, 0.6);
  dotEye(ctx, -9, -6, 3.4);
  dotEye(ctx, 9, -6, 3.4);
  smile(ctx, 0, -4, 5, 2.5);
  cheek(ctx, -16, 0);
  cheek(ctx, 16, 0);
}

function starShape(ctx, r0, r1, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + rot + (i * Math.PI) / 5;
    const r = i % 2 ? r1 : r0;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
}

function starfish(ctx) {
  ctx.save();
  ctx.translate(0, 3);
  ctx.lineJoin = 'round';
  starShape(ctx, 46, 20, 0.12);
  ctx.lineWidth = 10;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#ff8a3c';
  ctx.stroke();
  ctx.fillStyle = '#ff8a3c';
  ctx.fill();
  ctx.fillStyle = '#ffc07a';
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + 0.12 + (i * TAU) / 5;
    for (const r of [18, 28]) {
      circ(ctx, Math.cos(a) * r, Math.sin(a) * r, r === 18 ? 3 : 2.4);
      ctx.fill();
    }
  }
  dotEye(ctx, -6, -2, 3);
  dotEye(ctx, 6, -2, 3);
  smile(ctx, 0, 2, 5, 2.5);
  ctx.restore();
}

function fish(ctx, tint) {
  const c = tint || '#ff8a1f';
  // tail
  poly(ctx, [[22, 0], [46, -18], [42, 0], [46, 18]]);
  paint(ctx, c);
  // fins
  poly(ctx, [[-6, -18], [6, -30], [14, -16]]);
  paint(ctx, c, 3);
  poly(ctx, [[-2, 18], [8, 28], [12, 16]]);
  paint(ctx, c, 3);
  oval(ctx, -6, 0, 30, 21);
  paint(ctx, c);
  // white stripes (clownfish)
  ctx.save();
  oval(ctx, -6, 0, 30, 21);
  ctx.clip();
  for (const x of [-18, 6]) {
    ctx.beginPath();
    ctx.moveTo(x - 4, -24);
    ctx.quadraticCurveTo(x + 4, 0, x - 4, 24);
    ctx.lineTo(x + 5, 24);
    ctx.quadraticCurveTo(x + 13, 0, x + 5, -24);
    ctx.closePath();
    paint(ctx, '#ffffff', 2.5);
  }
  ctx.restore();
  oval(ctx, -6, 0, 30, 21);
  ink(ctx);
  eye(ctx, -24, -5, 5.5, -0.3, 0);
  ctx.beginPath();
  ctx.arc(-30, 6, 4, -0.2, 1.4);
  ink(ctx, 2.5);
}

function seahorse(ctx) {
  ctx.save();
  ctx.scale(1.12, 1.08);
  const c = '#ffb22e';
  const d = '#e8831a';
  // dorsal fin
  ctx.beginPath();
  ctx.moveTo(14, -10);
  ctx.quadraticCurveTo(32, -4, 16, 12);
  ctx.closePath();
  paint(ctx, '#ffe07a', 3);
  // body and curled tail
  tube(ctx, () => {
    ctx.moveTo(2, -20);
    ctx.bezierCurveTo(18, -6, 18, 14, 4, 22);
    ctx.bezierCurveTo(-10, 30, 0, 46, 12, 42);
    ctx.bezierCurveTo(20, 38, 16, 30, 10, 32);
  }, c, 12);
  ctx.beginPath();
  ctx.moveTo(-4, -18);
  ctx.bezierCurveTo(-12, 0, -6, 18, 8, 18);
  ctx.bezierCurveTo(20, 10, 22, -8, 8, -22);
  ctx.closePath();
  paint(ctx, c);
  // belly ridges
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-6 + i * 1.5, -8 + i * 7);
    ctx.lineTo(2 + i * 1.5, -6 + i * 7);
    ink(ctx, 2, d);
  }
  // head and snout
  oval(ctx, 0, -28, 12, 11, 0.2);
  paint(ctx, c);
  rbox(ctx, -30, -30, 22, 8, 4);
  paint(ctx, c);
  // crown
  poly(ctx, [[0, -38], [3, -48], [8, -38]]);
  paint(ctx, d, 2.5);
  eye(ctx, -2, -29, 4.5, -0.4, 0);
  ctx.restore();
}

function pineapple(ctx) {
  // crown
  const leaf = (pts) => {
    poly(ctx, pts);
    paint(ctx, '#2fae4a', 3);
  };
  leaf([[-4, -18], [-22, -44], [-2, -24]]);
  leaf([[4, -18], [22, -44], [2, -24]]);
  leaf([[-8, -16], [-26, -28], [-4, -20]]);
  leaf([[8, -16], [26, -28], [4, -20]]);
  leaf([[-4, -18], [0, -50], [4, -18]]);
  oval(ctx, 0, 12, 24, 32);
  paint(ctx, '#ffc72c');
  ctx.save();
  oval(ctx, 0, 12, 24, 32);
  ctx.clip();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#c98a12';
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 10 - 30, -24);
    ctx.lineTo(i * 10 + 30, 48);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i * 10 + 30, -24);
    ctx.lineTo(i * 10 - 30, 48);
    ctx.stroke();
  }
  ctx.restore();
  oval(ctx, 0, 12, 24, 32);
  ink(ctx);
  shine(ctx, -10, -2, 5, 10, 0.2, 0.5);
}

function coconut(ctx) {
  // whole one behind
  circ(ctx, -10, -6, 26);
  paint(ctx, '#8b5a2b');
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#5e3818';
  for (let i = 0; i < 9; i++) {
    const a = i * 0.7;
    ctx.beginPath();
    ctx.moveTo(-10 + Math.cos(a) * 12, -6 + Math.sin(a) * 12);
    ctx.lineTo(-10 + Math.cos(a + 0.2) * 22, -6 + Math.sin(a + 0.2) * 22);
    ctx.stroke();
  }
  ctx.fillStyle = INK;
  for (const [x, y] of [[-16, -16], [-6, -16], [-11, -8]]) {
    circ(ctx, x, y, 3);
    ctx.fill();
  }
  // a cracked-open half in front
  ctx.beginPath();
  ctx.moveTo(-8, 18);
  ctx.quadraticCurveTo(-6, 46, 20, 46);
  ctx.quadraticCurveTo(46, 46, 48, 18);
  ctx.closePath();
  paint(ctx, '#8b5a2b');
  oval(ctx, 20, 18, 28, 9);
  paint(ctx, '#ffffff');
  oval(ctx, 20, 19, 20, 5);
  ctx.fillStyle = '#e8f4ff';
  ctx.fill();
}

function mango(ctx) {
  ctx.save();
  ctx.rotate(-0.35);
  oval(ctx, 0, 6, 32, 28);
  const g = ctx.createLinearGradient(-30, -20, 30, 30);
  g.addColorStop(0, '#ff3b4a');
  g.addColorStop(0.5, '#ff8a1f');
  g.addColorStop(1, '#ffd21a');
  paint(ctx, g);
  shine(ctx, -12, -6, 9, 5, -0.4, 0.5);
  ctx.restore();
  tube(ctx, line([[-6, -22], [-8, -32]])(ctx), '#7a4a22', 3);
  ctx.beginPath();
  ctx.moveTo(-8, -30);
  ctx.quadraticCurveTo(8, -48, 30, -36);
  ctx.quadraticCurveTo(10, -24, -8, -30);
  paint(ctx, '#2fae4a', 3);
  ctx.beginPath();
  ctx.moveTo(-6, -31);
  ctx.quadraticCurveTo(10, -38, 24, -36);
  ink(ctx, 2, '#1d7a33');
}

function icecream(ctx) {
  poly(ctx, [[-18, 4], [18, 4], [0, 48]]);
  paint(ctx, '#e8a85a');
  ctx.save();
  poly(ctx, [[-18, 4], [18, 4], [0, 48]]);
  ctx.clip();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#b06e2a';
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 8 - 20, 0);
    ctx.lineTo(i * 8 + 20, 50);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i * 8 + 20, 0);
    ctx.lineTo(i * 8 - 20, 50);
    ctx.stroke();
  }
  ctx.restore();
  // scoops with drippy bottoms
  const scoop = (y, r, fill) => {
    ctx.beginPath();
    ctx.arc(0, y, r, Math.PI * 0.95, Math.PI * 0.05);
    ctx.quadraticCurveTo(r * 0.7, y + r * 0.6, r * 0.4, y + r * 0.35);
    ctx.quadraticCurveTo(r * 0.1, y + r * 0.75, -r * 0.2, y + r * 0.35);
    ctx.quadraticCurveTo(-r * 0.6, y + r * 0.65, -r * 0.98, y + r * 0.2);
    ctx.closePath();
    paint(ctx, fill);
  };
  scoop(0, 20, '#7ee8b0');
  scoop(-24, 17, '#ff8ac8');
  shine(ctx, -8, -32, 5, 3, -0.5, 0.6);
  circ(ctx, 3, -42, 6);
  paint(ctx, '#ff2d3a', 3);
  ctx.beginPath();
  ctx.moveTo(4, -48);
  ctx.quadraticCurveTo(8, -54, 14, -52);
  ink(ctx, 2.5);
}

function snowcone(ctx) {
  // shaved-ice dome in three flavours
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-26, 2);
  ctx.bezierCurveTo(-28, -40, 28, -40, 26, 2);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = '#ff3b4a';
  ctx.fillRect(-30, -40, 20, 44);
  ctx.fillStyle = '#ffd21a';
  ctx.fillRect(-10, -40, 19, 44);
  ctx.fillStyle = '#2f9bff';
  ctx.fillRect(9, -40, 22, 44);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 18; i++) {
    circ(ctx, -22 + ((i * 37) % 44), -28 + ((i * 23) % 28), 1.6);
    ctx.fill();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-26, 2);
  ctx.bezierCurveTo(-28, -40, 28, -40, 26, 2);
  ctx.closePath();
  ink(ctx);
  // paper cone, striped
  poly(ctx, [[-24, 0], [24, 0], [0, 48]]);
  paint(ctx, '#ffffff');
  ctx.save();
  poly(ctx, [[-24, 0], [24, 0], [0, 48]]);
  ctx.clip();
  ctx.fillStyle = '#ff3d9a';
  for (let i = 0; i < 4; i++) {
    poly(ctx, [[-30 + i * 16, 0], [-22 + i * 16, 0], [4 + i * 4, 50], [-2 + i * 4, 50]]);
    ctx.fill();
  }
  ctx.restore();
  poly(ctx, [[-24, 0], [24, 0], [0, 48]]);
  ink(ctx);
  // spoon-straw
  tube(ctx, line([[10, -10], [22, -42]])(ctx), '#ffffff', 3);
}

function sandwich(ctx) {
  ctx.save();
  ctx.rotate(-0.12);
  // bottom bread
  rbox(ctx, -46, 8, 92, 16, 8);
  paint(ctx, '#e8b25a');
  // pickles
  for (const x of [-34, -12, 10, 32]) {
    oval(ctx, x, 6, 10, 4);
    paint(ctx, '#7ecb4a', 2.5);
  }
  // cheese with drips
  poly(ctx, [[-44, 0], [44, 0], [44, 6], [30, 6], [26, 12], [22, 6], [-10, 6], [-14, 12], [-18, 6], [-44, 6]]);
  paint(ctx, '#ffd84a', 2.5);
  // ham, wavy
  ctx.beginPath();
  ctx.moveTo(-46, -6);
  for (let x = -46; x <= 46; x += 4) ctx.lineTo(x, -6 + Math.sin(x / 4) * 2);
  ctx.lineTo(46, 2);
  ctx.lineTo(-46, 2);
  ctx.closePath();
  paint(ctx, '#ff9aa8', 2.5);
  // pressed top bread with grill marks
  rbox(ctx, -46, -26, 92, 20, 10);
  paint(ctx, '#f2c26a');
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#a8662a';
  for (let x = -34; x <= 34; x += 14) {
    ctx.beginPath();
    ctx.moveTo(x - 4, -22);
    ctx.lineTo(x + 4, -10);
    ctx.stroke();
  }
  ctx.restore();
  // a toothpick with a flag
  tube(ctx, line([[0, -18], [0, -44]])(ctx), '#e8c28a', 2.5);
  poly(ctx, [[0, -44], [14, -40], [0, -36]]);
  paint(ctx, '#2f6bff', 2.5);
}

function taco(ctx) {
  // a folded shell seen from the side, tipped up, stuffed full
  ctx.save();
  ctx.translate(2, 10);
  ctx.rotate(-0.18);
  const shell = '#ffcf4a';
  // the back half of the shell, peeking up behind the fillings
  ctx.beginPath();
  ctx.arc(4, -6, 42, Math.PI * 1.02, Math.PI * 1.98, true);
  ctx.closePath();
  paint(ctx, '#f0b430');
  // lettuce frills, tomato and meat
  ctx.beginPath();
  ctx.moveTo(-40, -2);
  for (let i = 0; i <= 16; i++) {
    const x = -40 + i * 5;
    ctx.lineTo(x, -12 - (i % 2 ? 9 : 2) - Math.sin(i) * 2);
  }
  ctx.lineTo(40, -2);
  ctx.closePath();
  paint(ctx, '#5fd04a', 3);
  for (const [x, y] of [[-24, -14], [0, -18], [22, -13]]) {
    circ(ctx, x, y, 6.5);
    paint(ctx, '#ff3b30', 2.5);
  }
  for (const [x, y] of [[-12, -10], [12, -11]]) {
    oval(ctx, x, y, 8, 5);
    paint(ctx, '#8b4a22', 2.5);
  }
  // cheese shreds
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffe14d';
  for (const [x, y] of [[-30, -8], [-4, -6], [26, -6], [34, -10]]) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 5, y - 3);
    ctx.stroke();
  }
  // the front half: a thick crescent
  ctx.beginPath();
  ctx.arc(0, -4, 44, 0, Math.PI);
  ctx.arc(0, -4, 36, Math.PI - 0.05, 0.05, true);
  ctx.closePath();
  ctx.beginPath();
  ctx.arc(0, -4, 44, -0.02, Math.PI + 0.02);
  ctx.closePath();
  paint(ctx, shell);
  ctx.fillStyle = '#e8a51a';
  for (const [x, y] of [[-24, 12], [4, 26], [22, 14], [-6, 6], [-34, 2], [30, 2]]) {
    circ(ctx, x, y, 2.2);
    ctx.fill();
  }
  shine(ctx, -18, 6, 10, 3, 0.4, 0.5);
  ctx.restore();
}

function watermelon(ctx) {
  ctx.save();
  ctx.translate(0, -36);
  const R = 82;
  const a0 = Math.PI / 2 - 0.55;
  const a1 = Math.PI / 2 + 0.55;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, R, a0, a1);
  ctx.closePath();
  paint(ctx, '#2fae4a');
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, R - 7, a0 + 0.01, a1 - 0.01);
  ctx.closePath();
  ctx.fillStyle = '#e9ffd8';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, R - 11, a0 + 0.02, a1 - 0.02);
  ctx.closePath();
  ctx.fillStyle = '#ff4d5e';
  ctx.fill();
  ctx.fillStyle = INK;
  for (const [r, a] of [[30, 0], [50, -0.25], [50, 0.25], [62, -0.05], [42, 0.12], [42, -0.12], [62, 0.38], [62, -0.38]]) {
    const ang = Math.PI / 2 + a;
    oval(ctx, Math.cos(ang) * r, Math.sin(ang) * r, 2.2, 3.4, ang + Math.PI / 2);
    ctx.fill();
  }
  ctx.restore();
}

function surfboard(ctx, tint) {
  const c = tint || '#ff8a3c';
  ctx.save();
  ctx.rotate(0.55);
  ctx.beginPath();
  ctx.moveTo(0, -48);
  ctx.bezierCurveTo(22, -30, 18, 34, 0, 46);
  ctx.bezierCurveTo(-18, 34, -22, -30, 0, -48);
  ctx.closePath();
  paint(ctx, c);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-4, -50, 8, 100);
  ctx.fillStyle = shade(c, -0.3);
  ctx.fillRect(-30, 12, 60, 6);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(0, -48);
  ctx.bezierCurveTo(22, -30, 18, 34, 0, 46);
  ctx.bezierCurveTo(-18, 34, -22, -30, 0, -48);
  ctx.closePath();
  ink(ctx);
  shine(ctx, -6, -18, 3, 12, 0, 0.5);
  ctx.restore();
}

function beachball(ctx) {
  const cols = ['#ff3b30', '#ffffff', '#2f6bff', '#ffd21a', '#ffffff', '#2fbf4a'];
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 40, (i * TAU) / 6 - 0.3, ((i + 1) * TAU) / 6 - 0.3);
    ctx.closePath();
    ctx.fillStyle = cols[i];
    ctx.fill();
  }
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = INK;
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6 - 0.3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * 40, Math.sin(a) * 40);
    ctx.stroke();
  }
  circ(ctx, 0, 0, 9);
  paint(ctx, '#ffffff', 3);
  circ(ctx, 0, 0, 40);
  ink(ctx);
  shine(ctx, -16, -20, 9, 5, -0.7, 0.6);
}

function sunglasses(ctx, tint) {
  const c = tint || '#ff3d9a';
  // arms
  tube(ctx, line([[-40, -8], [-48, -20]])(ctx), c, 4);
  tube(ctx, line([[40, -8], [48, -20]])(ctx), c, 4);
  const lens = (s) => {
    ctx.beginPath();
    ctx.moveTo(s * 4, -12);
    ctx.lineTo(s * 44, -14);
    ctx.quadraticCurveTo(s * 46, 18, s * 26, 18);
    ctx.quadraticCurveTo(s * 6, 18, s * 4, -12);
    ctx.closePath();
  };
  for (const s of [-1, 1]) {
    lens(s);
    ctx.lineWidth = 12;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = c;
    ctx.stroke();
    ctx.fillStyle = '#2b2540';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(120,200,255,0.55)';
    poly(ctx, [[s * 14, -14], [s * 22, -14], [s * 10, 20], [s * 2, 20]]);
    ctx.fill();
    ctx.restore();
  }
  // bridge
  ctx.beginPath();
  ctx.moveTo(-6, -10);
  ctx.quadraticCurveTo(0, -18, 6, -10);
  ink(ctx, 9);
  ctx.beginPath();
  ctx.moveTo(-6, -10);
  ctx.quadraticCurveTo(0, -18, 6, -10);
  ink(ctx, 4, c);
}

function flipflopOne(ctx, c) {
  ctx.beginPath();
  ctx.moveTo(0, -36);
  ctx.bezierCurveTo(16, -36, 16, -6, 10, 8);
  ctx.bezierCurveTo(6, 22, 14, 38, 0, 38);
  ctx.bezierCurveTo(-14, 38, -8, 22, -10, 8);
  ctx.bezierCurveTo(-14, -6, -16, -36, 0, -36);
  ctx.closePath();
  paint(ctx, c);
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.quadraticCurveTo(-12, -14, -11, 4);
  ctx.moveTo(0, -24);
  ctx.quadraticCurveTo(12, -14, 10, 4);
  ink(ctx, 8);
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.quadraticCurveTo(-12, -14, -11, 4);
  ctx.moveTo(0, -24);
  ctx.quadraticCurveTo(12, -14, 10, 4);
  ink(ctx, 4, '#ffffff');
  circ(ctx, 0, -24, 3.5);
  paint(ctx, '#ffffff', 2.5);
}

function flipflop(ctx, tint) {
  const c = tint || '#2fbfe0';
  ctx.save();
  ctx.translate(-16, 2);
  ctx.rotate(-0.18);
  flipflopOne(ctx, c);
  ctx.restore();
  ctx.save();
  ctx.translate(18, 6);
  ctx.rotate(0.2);
  ctx.scale(-1, 1);
  flipflopOne(ctx, c);
  ctx.restore();
}

function sandcastle(ctx) {
  const s = '#f2c96b';
  const d = '#c99a3c';
  const tower = (x, y, w, h) => {
    rbox(ctx, x - w / 2, y, w, h, 2);
    paint(ctx, s);
    poly(ctx, [[x - w / 2 - 2, y], [x - w / 2 - 2, y - 7], [x - w / 6, y - 7], [x - w / 6, y - 3], [x + w / 6, y - 3], [x + w / 6, y - 7], [x + w / 2 + 2, y - 7], [x + w / 2 + 2, y]]);
    paint(ctx, s, 3);
  };
  tower(-30, -6, 18, 48);
  tower(30, -6, 18, 48);
  rbox(ctx, -24, 6, 48, 36, 2);
  paint(ctx, s);
  tower(0, -24, 22, 34);
  // flag
  tube(ctx, line([[0, -31], [0, -48]])(ctx), INK, 1);
  poly(ctx, [[0, -48], [16, -43], [0, -38]]);
  paint(ctx, '#ff3d9a', 2.5);
  // door and windows
  ctx.beginPath();
  ctx.moveTo(-8, 42);
  ctx.lineTo(-8, 30);
  ctx.arc(0, 30, 8, Math.PI, 0);
  ctx.lineTo(8, 42);
  ctx.closePath();
  paint(ctx, '#7a4a22', 3);
  for (const [x, y] of [[-30, 6], [30, 6], [0, -12]]) {
    rbox(ctx, x - 3.5, y, 7, 9, 3.5);
    paint(ctx, '#7a4a22', 2);
  }
  ctx.fillStyle = d;
  for (const [x, y] of [[-34, 26], [-26, 34], [34, 30], [18, 16], [-14, 16]]) {
    circ(ctx, x, y, 1.6);
    ctx.fill();
  }
  // sand at the foot
  rbox(ctx, -46, 40, 92, 8, 4);
  paint(ctx, '#f6d37a', 3);
}

function lighthouse(ctx) {
  // rocks
  oval(ctx, 0, 42, 40, 8);
  paint(ctx, '#8c8aa8');
  // striped tower
  ctx.save();
  poly(ctx, [[-18, 40], [18, 40], [11, -18], [-11, -18]]);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = '#ff3b30';
  for (let i = 0; i < 3; i++) ctx.fillRect(-20, -12 + i * 18, 40, 9);
  ctx.restore();
  poly(ctx, [[-18, 40], [18, 40], [11, -18], [-11, -18]]);
  ink(ctx);
  rbox(ctx, -4, 22, 8, 16, 4);
  paint(ctx, '#2b2540', 2.5);
  // gallery and lamp
  rbox(ctx, -16, -22, 32, 6, 2);
  paint(ctx, '#2b2540', 3);
  // light beams
  ctx.fillStyle = 'rgba(255,225,77,0.65)';
  poly(ctx, [[-8, -32], [-48, -46], [-48, -22]]);
  ctx.fill();
  poly(ctx, [[8, -32], [48, -46], [48, -22]]);
  ctx.fill();
  rbox(ctx, -9, -38, 18, 16, 3);
  paint(ctx, '#ffe14d', 3);
  ctx.beginPath();
  ctx.moveTo(-12, -38);
  ctx.quadraticCurveTo(0, -54, 12, -38);
  ctx.closePath();
  paint(ctx, '#ff3b30', 3);
}

function sailboat(ctx) {
  water(ctx, 32);
  // hull
  poly(ctx, [[-40, 18], [40, 18], [30, 34], [-30, 34]]);
  paint(ctx, '#2f6bff');
  poly(ctx, [[-38, 22], [38, 22]], false);
  ink(ctx, 3, '#ffffff');
  tube(ctx, line([[-2, 18], [-2, -46]])(ctx), '#a8703f', 3);
  // sails
  poly(ctx, [[2, -44], [36, 12], [2, 12]]);
  paint(ctx, '#ffffff');
  poly(ctx, [[-6, -38], [-6, 12], [-34, 12]]);
  paint(ctx, '#ff3d9a');
  poly(ctx, [[2, -44], [14, -40], [2, -36]]);
  paint(ctx, '#ffd21a', 2.5);
}

function speedboat(ctx) {
  water(ctx, 30);
  // spray behind
  for (const [x, y, r] of [[-40, 20, 7], [-46, 12, 5], [-34, 10, 4]]) {
    circ(ctx, x, y, r);
    paint(ctx, '#d8f6ff', 2);
  }
  // windscreen
  poly(ctx, [[0, 0], [10, -18], [16, -18], [12, 0]]);
  paint(ctx, '#9fe3ff', 3);
  // hull: a long wedge to a pointy nose
  ctx.beginPath();
  ctx.moveTo(-36, -2);
  ctx.lineTo(28, -2);
  ctx.quadraticCurveTo(44, 0, 48, 6);
  ctx.quadraticCurveTo(30, 26, -32, 26);
  ctx.closePath();
  paint(ctx, '#ffffff');
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#ff3b30';
  ctx.fillRect(-40, 10, 92, 7);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-36, -2);
  ctx.lineTo(28, -2);
  ctx.quadraticCurveTo(44, 0, 48, 6);
  ctx.quadraticCurveTo(30, 26, -32, 26);
  ctx.closePath();
  ink(ctx);
  // motor
  rbox(ctx, -44, -8, 10, 24, 3);
  paint(ctx, '#2b2540', 3);
  // speed lines
  for (const y of [-26, -16]) {
    poly(ctx, [[-30, y], [-10, y]], false);
    ink(ctx, 3);
  }
}

function rocket(ctx) {
  // flame
  ctx.beginPath();
  ctx.moveTo(-10, 28);
  ctx.quadraticCurveTo(0, 60, 10, 28);
  ctx.closePath();
  paint(ctx, '#ff8a1f', 3);
  ctx.beginPath();
  ctx.moveTo(-5, 28);
  ctx.quadraticCurveTo(0, 46, 5, 28);
  ctx.closePath();
  ctx.fillStyle = '#ffe14d';
  ctx.fill();
  // fins
  poly(ctx, [[-14, 6], [-30, 28], [-14, 24]]);
  paint(ctx, '#ff3b30');
  poly(ctx, [[14, 6], [30, 28], [14, 24]]);
  paint(ctx, '#ff3b30');
  // body
  ctx.beginPath();
  ctx.moveTo(0, -48);
  ctx.bezierCurveTo(22, -30, 18, 10, 14, 28);
  ctx.lineTo(-14, 28);
  ctx.bezierCurveTo(-18, 10, -22, -30, 0, -48);
  ctx.closePath();
  paint(ctx, '#f4f4f8');
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#ff3b30';
  ctx.fillRect(-30, -50, 60, 18);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(0, -48);
  ctx.bezierCurveTo(22, -30, 18, 10, 14, 28);
  ctx.lineTo(-14, 28);
  ctx.bezierCurveTo(-18, 10, -22, -30, 0, -48);
  ctx.closePath();
  ink(ctx);
  circ(ctx, 0, -10, 8);
  paint(ctx, '#5ec8ff');
  shine(ctx, -3, -13, 3, 2, -0.5, 0.8);
  poly(ctx, [[0, 6], [0, 28]], false);
  ink(ctx, 3);
}

function palm(ctx) {
  sandMound(ctx, 40, 40);
  // trunk
  tube(ctx, () => {
    ctx.moveTo(6, 42);
    ctx.quadraticCurveTo(-2, 10, 8, -20);
  }, '#a8703f', 9);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#6e4426';
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    const x = (1 - t) * (1 - t) * 6 + 2 * (1 - t) * t * -2 + t * t * 8;
    const y = (1 - t) * (1 - t) * 42 + 2 * (1 - t) * t * 10 + t * t * -20;
    ctx.beginPath();
    ctx.moveTo(x - 4, y);
    ctx.lineTo(x + 4, y - 2);
    ctx.stroke();
  }
  // fronds
  const frond = (ang, len) => {
    const ex = 8 + Math.cos(ang) * len;
    const ey = -22 + Math.sin(ang) * len;
    const mx = 8 + Math.cos(ang) * len * 0.5;
    const my = -22 + Math.sin(ang) * len * 0.5 - 12;
    ctx.beginPath();
    ctx.moveTo(8, -22);
    ctx.quadraticCurveTo(mx - 6 * Math.sin(ang), my, ex, ey);
    ctx.quadraticCurveTo(mx + 6 * Math.sin(ang), my + 10, 8, -22);
    ctx.closePath();
    paint(ctx, '#2fae4a', 3);
  };
  frond(Math.PI + 0.5, 42);
  frond(-0.5 + Math.PI * 2, 40);
  frond(Math.PI + 0.05, 40);
  frond(0.1, 40);
  frond(-Math.PI / 2 - 0.4, 30);
  frond(-Math.PI / 2 + 0.5, 30);
  for (const [x, y] of [[4, -16], [12, -14], [8, -10]]) {
    circ(ctx, x, y, 5);
    paint(ctx, '#7a4a22', 2.5);
  }
}

function hibiscus(ctx) {
  // leaves
  oval(ctx, -26, 26, 16, 8, -0.6);
  paint(ctx, '#2fae4a', 3);
  oval(ctx, 28, 24, 16, 8, 0.6);
  paint(ctx, '#2fae4a', 3);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * TAU) / 5;
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(16, -18, 44, -12, 40, 4);
    ctx.bezierCurveTo(44, 18, 16, 20, 0, 0);
    paint(ctx, '#ff3b5c');
    ctx.restore();
  }
  circ(ctx, 0, 0, 11);
  ctx.fillStyle = '#b3123a';
  ctx.fill();
  // stamen
  tube(ctx, line([[0, 0], [14, -26]])(ctx), '#ffe14d', 3);
  for (const [x, y] of [[14, -28], [18, -24], [11, -32], [17, -31]]) {
    circ(ctx, x, y, 2.8);
    paint(ctx, '#ffd21a', 1.5);
  }
}

function conch(ctx) {
  ctx.save();
  ctx.rotate(-0.4);
  // spire: stacked rings with knobs to the left
  for (let i = 3; i >= 0; i--) {
    const x = -24 - i * 7;
    const r = 15 - i * 3;
    oval(ctx, x, -2, r * 0.8, r);
    paint(ctx, '#ffd0b0', 3);
  }
  // body
  ctx.beginPath();
  ctx.moveTo(-26, -16);
  ctx.bezierCurveTo(0, -34, 34, -24, 44, -2);
  ctx.bezierCurveTo(34, 26, 0, 30, -26, 14);
  ctx.closePath();
  paint(ctx, '#ffc3a0');
  // knobs
  for (const x of [-12, 2, 16]) {
    poly(ctx, [[x - 5, -22 + Math.abs(x) * 0.1], [x, -32 + Math.abs(x) * 0.15], [x + 5, -22 + Math.abs(x) * 0.1]]);
    paint(ctx, '#ffd0b0', 3);
  }
  // the pink flared lip
  ctx.beginPath();
  ctx.moveTo(-6, 2);
  ctx.bezierCurveTo(10, -18, 44, -10, 46, 4);
  ctx.bezierCurveTo(46, 26, 6, 30, -6, 2);
  ctx.closePath();
  paint(ctx, '#ff7aa0');
  ctx.beginPath();
  ctx.moveTo(2, 4);
  ctx.bezierCurveTo(14, -8, 36, -4, 38, 6);
  ctx.bezierCurveTo(36, 18, 10, 20, 2, 4);
  ctx.closePath();
  ctx.fillStyle = '#ffb3c7';
  ctx.fill();
  ctx.restore();
}

function lifeguard(ctx) {
  sandMound(ctx, 42, 48);
  // stilts
  for (const x of [-22, 22]) {
    tube(ctx, line([[x, 0], [x + Math.sign(x) * 4, 44]])(ctx), '#f4f4f0', 3.5);
  }
  tube(ctx, line([[-22, 22], [22, 22]])(ctx), '#f4f4f0', 3);
  // ramp
  poly(ctx, [[-28, 6], [-48, 44], [-40, 46], [-22, 10]]);
  paint(ctx, '#ffffff', 3);
  // the hut
  rbox(ctx, -30, -24, 60, 28, 3);
  paint(ctx, '#ffd21a');
  ctx.save();
  rbox(ctx, -30, -24, 60, 28, 3);
  ctx.clip();
  ctx.fillStyle = '#2fd0c0';
  for (let i = 0; i < 4; i++) ctx.fillRect(-30 + i * 16, -24, 7, 28);
  ctx.restore();
  rbox(ctx, -30, -24, 60, 28, 3);
  ink(ctx);
  rbox(ctx, -14, -18, 28, 12, 2);
  paint(ctx, '#2b2540', 3);
  // roof
  poly(ctx, [[-36, -22], [36, -22], [24, -36], [-24, -36]]);
  paint(ctx, '#ff3d9a');
  // flag
  tube(ctx, line([[24, -36], [24, -50]])(ctx), INK, 1);
  poly(ctx, [[24, -50], [42, -46], [24, -40]]);
  paint(ctx, '#ff3b30', 2.5);
}

function skate(ctx, tint) {
  const c = tint || '#ff5fa2';
  // wheels
  for (const x of [-22, 22]) {
    circ(ctx, x, 36, 9);
    paint(ctx, '#ffd21a');
    circ(ctx, x, 36, 3);
    ctx.fillStyle = INK;
    ctx.fill();
  }
  rbox(ctx, -36, 22, 74, 7, 3);
  paint(ctx, '#b9c3d2', 3);
  // boot
  ctx.beginPath();
  ctx.moveTo(-30, 22);
  ctx.lineTo(-30, -40);
  ctx.lineTo(4, -40);
  ctx.lineTo(6, -4);
  ctx.quadraticCurveTo(40, -2, 42, 14);
  ctx.lineTo(42, 22);
  ctx.closePath();
  paint(ctx, c);
  // toe stopper and sole
  circ(ctx, 44, 22, 6);
  paint(ctx, '#ff3b30', 3);
  rbox(ctx, -32, 16, 76, 7, 3);
  paint(ctx, '#ffffff', 3);
  // laces
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffffff';
  for (let i = 0; i < 4; i++) {
    const y = -32 + i * 10;
    ctx.beginPath();
    ctx.moveTo(-2, y);
    ctx.lineTo(8 + i * 4, y + 8);
    ctx.moveTo(8 + i * 4, y);
    ctx.lineTo(-2, y + 8);
    ctx.stroke();
  }
  rbox(ctx, -32, -46, 38, 8, 3);
  paint(ctx, '#ffffff', 3);
}

function car(ctx, tint) {
  const c = tint || '#ff3b30';
  // windscreen
  poly(ctx, [[-2, -6], [6, -26], [10, -26], [6, -6]]);
  paint(ctx, '#9fe3ff', 3);
  // body with tail fin
  ctx.beginPath();
  ctx.moveTo(-46, 10);
  ctx.lineTo(-46, -12);
  ctx.lineTo(-36, -16);
  ctx.lineTo(-30, -8);
  ctx.lineTo(28, -8);
  ctx.quadraticCurveTo(46, -6, 48, 6);
  ctx.lineTo(48, 14);
  ctx.quadraticCurveTo(0, 18, -46, 14);
  ctx.closePath();
  paint(ctx, c);
  // seat
  rbox(ctx, -24, -16, 14, 10, 4);
  paint(ctx, '#ffffff', 3);
  // stripe and headlight
  poly(ctx, [[-40, 2], [40, 2]], false);
  ink(ctx, 3, '#ffffff');
  circ(ctx, 44, 0, 4);
  paint(ctx, '#ffe14d', 2.5);
  for (const x of [-26, 26]) {
    circ(ctx, x, 16, 12);
    paint(ctx, '#2b2540');
    circ(ctx, x, 16, 5);
    paint(ctx, '#dfe6f0', 2.5);
  }
}

function conga(ctx) {
  // barrel drum
  ctx.beginPath();
  ctx.moveTo(-20, -30);
  ctx.bezierCurveTo(-34, 0, -26, 30, -16, 46);
  ctx.lineTo(16, 46);
  ctx.bezierCurveTo(26, 30, 34, 0, 20, -30);
  ctx.closePath();
  paint(ctx, '#d0763a');
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#ffd21a';
  ctx.fillRect(-40, -4, 80, 8);
  ctx.fillStyle = '#2fbf4a';
  ctx.fillRect(-40, 4, 80, 4);
  ctx.fillStyle = '#ff3b30';
  ctx.fillRect(-40, -8, 80, 4);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#8a4a1e';
  for (const x of [-12, 0, 12]) {
    ctx.beginPath();
    ctx.moveTo(x, -30);
    ctx.quadraticCurveTo(x * 1.5, 8, x * 0.9, 46);
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-20, -30);
  ctx.bezierCurveTo(-34, 0, -26, 30, -16, 46);
  ctx.lineTo(16, 46);
  ctx.bezierCurveTo(26, 30, 34, 0, 20, -30);
  ctx.closePath();
  ink(ctx);
  // metal hoop and lugs
  for (const x of [-22, 22]) {
    rbox(ctx, x - 2.5, -30, 5, 16, 2);
    paint(ctx, '#c9d2e0', 2.5);
  }
  oval(ctx, 0, -32, 22, 7);
  paint(ctx, '#c9d2e0');
  oval(ctx, 0, -33, 18, 5);
  ctx.fillStyle = '#fff1d6';
  ctx.fill();
  // a hand-slap burst
  for (const [x0, y0, x1, y1] of [[-14, -44, -18, -50], [0, -44, 0, -52], [14, -44, 18, -50]]) {
    poly(ctx, [[x0, y0], [x1, y1]], false);
    ink(ctx, 3);
  }
}

function maraca(ctx, a, c) {
  ctx.save();
  ctx.rotate(a);
  rbox(ctx, -4, 4, 8, 40, 4);
  paint(ctx, '#a8703f');
  oval(ctx, 0, -18, 17, 22);
  paint(ctx, c);
  ctx.save();
  oval(ctx, 0, -18, 17, 22);
  ctx.clip();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-20, -22, 40, 5);
  ctx.fillStyle = '#2fbf4a';
  ctx.fillRect(-20, -12, 40, 5);
  ctx.restore();
  oval(ctx, 0, -18, 17, 22);
  ink(ctx);
  shine(ctx, -7, -28, 4, 6, 0.3, 0.6);
  ctx.restore();
}

function maracas(ctx) {
  ctx.save();
  ctx.translate(0, 6);
  maraca(ctx, -0.5, '#ff3b30');
  maraca(ctx, 0.5, '#ffd21a');
  ctx.restore();
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * 36, -28, 8, s > 0 ? -1.2 : Math.PI - 0.6, s > 0 ? 0.6 : Math.PI + 1.2);
    ink(ctx, 3);
  }
}

function kite(ctx, tint) {
  const c = tint || '#ff3b30';
  // tail
  ctx.beginPath();
  ctx.moveTo(4, 14);
  ctx.bezierCurveTo(-10, 26, 20, 34, 8, 48);
  ink(ctx, 2.5);
  for (const [x, y] of [[0, 26], [10, 38]]) {
    poly(ctx, [[x - 6, y - 4], [x + 6, y + 4], [x + 6, y - 4], [x - 6, y + 4]]);
    paint(ctx, '#ffd21a', 2);
  }
  ctx.save();
  ctx.translate(-4, -12);
  ctx.rotate(-0.25);
  const pts = [[0, -34], [24, -6], [0, 30], [-24, -6]];
  poly(ctx, pts);
  paint(ctx, c);
  ctx.save();
  poly(ctx, pts);
  ctx.clip();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, -40, 30, 34);
  ctx.fillRect(-30, -6, 30, 40);
  ctx.restore();
  poly(ctx, pts);
  ink(ctx);
  poly(ctx, [[0, -34], [0, 30]], false);
  ink(ctx, 2.5);
  poly(ctx, [[-24, -6], [24, -6]], false);
  ink(ctx, 2.5);
  ctx.restore();
}

function umbrella(ctx) {
  sandMound(ctx, 40, 40);
  ctx.save();
  ctx.translate(0, -4);
  ctx.rotate(-0.2);
  tube(ctx, line([[0, -26], [0, 48]])(ctx), '#a8703f', 3.5);
  // canopy: stripes in a half dome with a scalloped edge
  const canopy = () => {
    ctx.beginPath();
    ctx.moveTo(-42, -12);
    ctx.bezierCurveTo(-40, -50, 40, -50, 42, -12);
    for (let i = 0; i < 6; i++) {
      const x0 = 42 - i * 14;
      ctx.quadraticCurveTo(x0 - 7, -4, x0 - 14, -12);
    }
    ctx.closePath();
  };
  canopy();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#ff3b30';
  for (let i = 0; i < 3; i++) {
    poly(ctx, [[0, -42], [-42 + i * 28, -4], [-28 + i * 28, -4]]);
    ctx.fill();
  }
  ctx.restore();
  canopy();
  ink(ctx);
  circ(ctx, 0, -42, 3.5);
  paint(ctx, '#ffd21a', 2);
  ctx.restore();
}

function sun(ctx) {
  ctx.fillStyle = '#ff9a1a';
  for (let i = 0; i < 12; i++) {
    const a = (i * TAU) / 12;
    ctx.save();
    ctx.rotate(a);
    poly(ctx, [[-6, -30], [0, -47], [6, -30]]);
    paint(ctx, '#ff9a1a', 3);
    ctx.restore();
  }
  circ(ctx, 0, 0, 30);
  paint(ctx, '#ffd21a');
  shine(ctx, -12, -14, 7, 4, -0.6, 0.6);
  dotEye(ctx, -10, -4, 3.6);
  dotEye(ctx, 10, -4, 3.6);
  smile(ctx, 0, 2, 11, 3.5);
  cheek(ctx, -18, 6, 4.5);
  cheek(ctx, 18, 6, 4.5);
}

// ---------------------------------------------------------------------------------------------
// The buddies' own pictures
// ---------------------------------------------------------------------------------------------

function pail(ctx) {
  // handle
  ctx.beginPath();
  ctx.arc(0, -16, 30, Math.PI * 1.05, Math.PI * 1.95);
  ink(ctx, 8);
  ctx.beginPath();
  ctx.arc(0, -16, 30, Math.PI * 1.05, Math.PI * 1.95);
  ink(ctx, 3.5, '#ffd21a');
  // sand heaped in it
  ctx.beginPath();
  ctx.moveTo(-30, -14);
  ctx.quadraticCurveTo(0, -36, 30, -14);
  ctx.closePath();
  paint(ctx, '#f6d37a', 3);
  poly(ctx, [[-32, -14], [32, -14], [24, 44], [-24, 44]]);
  paint(ctx, '#2f9bff');
  rbox(ctx, -35, -20, 70, 10, 4);
  paint(ctx, '#2f9bff');
  // a star on it
  ctx.save();
  ctx.translate(0, 16);
  ctx.scale(0.3, 0.3);
  starShape(ctx, 46, 20, 0);
  ctx.restore();
  paint(ctx, '#ffe14d', 2.5);
  shine(ctx, -18, 6, 3, 12, 0.1, 0.45);
}

function spade(ctx) {
  ctx.save();
  ctx.rotate(0.35);
  // handle and grip
  rbox(ctx, -4, -40, 8, 52, 4);
  paint(ctx, '#ff3b30');
  ctx.beginPath();
  ctx.moveTo(-12, -46);
  ctx.lineTo(12, -46);
  ctx.lineTo(12, -38);
  ctx.lineTo(-12, -38);
  ctx.closePath();
  paint(ctx, '#ff3b30');
  // blade
  ctx.beginPath();
  ctx.moveTo(-16, 8);
  ctx.lineTo(16, 8);
  ctx.lineTo(16, 30);
  ctx.quadraticCurveTo(0, 50, -16, 30);
  ctx.closePath();
  paint(ctx, '#ffd21a');
  shine(ctx, -6, 20, 3, 8, 0, 0.5);
  ctx.restore();
}

function cone(ctx) {
  ctx.beginPath();
  ctx.moveTo(-24, -24);
  ctx.lineTo(24, -24);
  ctx.lineTo(0, 46);
  ctx.closePath();
  paint(ctx, '#e8a85a');
  ctx.save();
  ctx.clip();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#b06e2a';
  for (let i = -5; i <= 5; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 10 - 30, -30);
    ctx.lineTo(i * 10 + 30, 50);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i * 10 + 30, -30);
    ctx.lineTo(i * 10 - 30, 50);
    ctx.stroke();
  }
  ctx.restore();
  // the open top
  oval(ctx, 0, -24, 25, 7);
  paint(ctx, '#c98840');
  oval(ctx, 0, -23, 19, 4);
  ctx.fillStyle = '#8a5424';
  ctx.fill();
}

function scoop(ctx) {
  ctx.beginPath();
  ctx.arc(0, -4, 34, Math.PI * 0.96, Math.PI * 0.04);
  ctx.quadraticCurveTo(28, 26, 18, 22);
  ctx.quadraticCurveTo(14, 38, 8, 22);
  ctx.quadraticCurveTo(0, 28, -6, 22);
  ctx.quadraticCurveTo(-12, 34, -18, 22);
  ctx.quadraticCurveTo(-30, 24, -34, -2);
  ctx.closePath();
  paint(ctx, '#ff8ac8');
  shine(ctx, -14, -20, 8, 5, -0.6, 0.6);
  const sprinkles = [['#ffd21a', -6, -26, 0.4], ['#2f6bff', 10, -18, -0.6], ['#2fbf4a', -18, -6, 1.1], ['#ffffff', 16, -2, 0.2], ['#ff3b30', 2, -8, -1.2], ['#a64dff', 20, -26, 0.9]];
  for (const [c, x, y, a] of sprinkles) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    rbox(ctx, -4, -1.5, 8, 3, 1.5);
    ctx.fillStyle = c;
    ctx.fill();
    ctx.restore();
  }
  circ(ctx, 2, -40, 6);
  paint(ctx, '#ff2d3a', 3);
}

function key(ctx) {
  ctx.save();
  ctx.rotate(-0.5);
  const gold = '#ffc93a';
  // teeth
  poly(ctx, [[22, 0], [22, 14], [28, 14], [28, 6], [34, 6], [34, 16], [40, 16], [40, 0]]);
  paint(ctx, gold);
  rbox(ctx, -12, -5, 56, 10, 4);
  paint(ctx, gold);
  // the round bow with a hole
  circ(ctx, -26, 0, 18);
  paint(ctx, gold);
  circ(ctx, -26, 0, 7);
  paint(ctx, '#ffffff', 3);
  shine(ctx, -32, -8, 5, 3, -0.6, 0.6);
  ctx.restore();
}

function chest(ctx) {
  // coins spilling
  for (const [x, y] of [[-38, 40], [-28, 44], [36, 42]]) {
    oval(ctx, x, y, 7, 4);
    paint(ctx, '#ffc93a', 2.5);
  }
  rbox(ctx, -38, -4, 76, 44, 4);
  paint(ctx, '#a8622a');
  // lid
  ctx.beginPath();
  ctx.moveTo(-38, -4);
  ctx.bezierCurveTo(-38, -36, 38, -36, 38, -4);
  ctx.closePath();
  paint(ctx, '#bf7434');
  // gold peeking from under the lid
  for (const [x, y] of [[-20, -6], [0, -8], [18, -6]]) {
    circ(ctx, x, y, 6);
    paint(ctx, '#ffd84a', 2);
  }
  // bands
  for (const x of [-26, 26]) {
    rbox(ctx, x - 4, -28, 8, 68, 2);
    paint(ctx, '#ffc93a', 3);
  }
  rbox(ctx, -38, -6, 76, 6, 2);
  paint(ctx, '#ffc93a', 3);
  // lock and keyhole
  rbox(ctx, -8, -6, 16, 18, 3);
  paint(ctx, '#ffc93a', 3);
  circ(ctx, 0, 1, 2.6);
  ctx.fillStyle = INK;
  ctx.fill();
  poly(ctx, [[-1.5, 2], [1.5, 2], [2, 8], [-2, 8]]);
  ctx.fill();
}

function dog(ctx) {
  const fur = '#f0b56a';
  // floppy ears
  oval(ctx, -28, -2, 11, 22, 0.35);
  paint(ctx, '#8b4a22');
  oval(ctx, 28, -2, 11, 22, -0.35);
  paint(ctx, '#8b4a22');
  // collar
  rbox(ctx, -20, 30, 40, 9, 4);
  paint(ctx, '#ff3b30', 3);
  circ(ctx, 0, 42, 5);
  paint(ctx, '#ffc93a', 2.5);
  oval(ctx, 0, 2, 26, 30);
  paint(ctx, fur);
  // eye patch
  oval(ctx, 10, -8, 9, 10);
  ctx.fillStyle = '#c47a3a';
  ctx.fill();
  // muzzle
  oval(ctx, 0, 16, 15, 11);
  paint(ctx, '#fff1d6', 3);
  // tongue
  ctx.beginPath();
  ctx.moveTo(-5, 22);
  ctx.quadraticCurveTo(0, 36, 5, 22);
  ctx.closePath();
  paint(ctx, '#ff7a9a', 2.5);
  oval(ctx, 0, 9, 6, 4.5);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 13);
  ctx.lineTo(0, 18);
  ctx.moveTo(-8, 20);
  ctx.quadraticCurveTo(-4, 23, 0, 18);
  ctx.quadraticCurveTo(4, 23, 8, 20);
  ink(ctx, 2.5);
  dotEye(ctx, -10, -8, 4);
  dotEye(ctx, 10, -8, 4);
}

function bone(ctx) {
  ctx.save();
  ctx.rotate(-0.5);
  // outline every part first, then fill them all, so the joins vanish
  const parts = () => {
    rbox(ctx, -32, -8, 64, 16, 6);
    ctx.moveTo(-26, -11);
    for (const [x, y] of [[-34, -11], [-34, 11], [34, -11], [34, 11]]) {
      ctx.moveTo(x + 11, y);
      ctx.arc(x, y, 11, 0, TAU);
    }
  };
  parts();
  ink(ctx, LW * 2);
  parts();
  ctx.fillStyle = '#fffaf0';
  ctx.fill('nonzero');
  shine(ctx, -6, -2, 16, 2.5, 0, 0.9);
  ctx.restore();
}

function bat(ctx) {
  ctx.save();
  ctx.rotate(0.7);
  ctx.beginPath();
  ctx.moveTo(-3, 44);
  ctx.lineTo(3, 44);
  ctx.lineTo(4, 10);
  ctx.quadraticCurveTo(11, -20, 9, -42);
  ctx.quadraticCurveTo(0, -50, -9, -42);
  ctx.quadraticCurveTo(-11, -20, -4, 10);
  ctx.closePath();
  paint(ctx, '#e0a868');
  shine(ctx, -3, -20, 2.5, 14, 0, 0.5);
  // grip tape and knob
  rbox(ctx, -4.5, 22, 9, 22, 2);
  paint(ctx, '#2b2540', 3);
  oval(ctx, 0, 46, 8, 4);
  paint(ctx, '#2b2540', 3);
  ctx.restore();
}

function baseball(ctx) {
  circ(ctx, 0, 0, 36);
  paint(ctx, '#fffaf0');
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * 54, 0, 34, Math.PI - 0.82 + (s > 0 ? 0 : -Math.PI), Math.PI + 0.82 + (s > 0 ? 0 : -Math.PI));
    ink(ctx, 3, '#ff3b30');
    for (let i = -3; i <= 3; i++) {
      const a = (s > 0 ? Math.PI : 0) + i * 0.2;
      const x = s * 54 + Math.cos(a) * 34;
      const y = Math.sin(a) * 34;
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 2);
      ctx.lineTo(x + 4, y + 2);
      ink(ctx, 2.5, '#ff3b30');
    }
  }
  circ(ctx, 0, 0, 36);
  ink(ctx);
  shine(ctx, -14, -16, 8, 4, -0.7, 0.8);
}

function rod(ctx) {
  // the bendy rod from bottom left up to the right
  tube(ctx, () => {
    ctx.moveTo(-40, 44);
    ctx.quadraticCurveTo(-10, -30, 34, -38);
  }, '#2b2540', 3);
  // handle and reel
  tube(ctx, line([[-40, 44], [-30, 22]])(ctx), '#a8703f', 6);
  circ(ctx, -26, 20, 8);
  paint(ctx, '#c9d2e0');
  circ(ctx, -26, 20, 3);
  ctx.fillStyle = INK;
  ctx.fill();
  // line, bobber and hook
  ctx.beginPath();
  ctx.moveTo(34, -38);
  ctx.lineTo(34, 30);
  ink(ctx, 1.8);
  circ(ctx, 34, 4, 8);
  paint(ctx, '#ffffff', 3);
  ctx.save();
  circ(ctx, 34, 4, 8);
  ctx.clip();
  ctx.fillStyle = '#ff3b30';
  ctx.fillRect(24, -6, 20, 10);
  ctx.restore();
  circ(ctx, 34, 4, 8);
  ink(ctx, 3);
  ctx.beginPath();
  ctx.moveTo(34, 30);
  ctx.lineTo(34, 40);
  ctx.arc(28, 40, 6, 0, Math.PI * 0.9);
  ink(ctx, 3);
}

function egg(ctx) {
  // the baby turtle popping out
  oval(ctx, 0, -14, 12, 12);
  paint(ctx, '#9bdc6a');
  dotEye(ctx, -5, -16, 2.8);
  dotEye(ctx, 5, -16, 2.8);
  smile(ctx, 0, -13, 4, 2);
  oval(ctx, -16, -2, 8, 4, -0.6);
  paint(ctx, '#9bdc6a', 3);
  oval(ctx, 16, -2, 8, 4, 0.6);
  paint(ctx, '#9bdc6a', 3);
  // bottom half of the shell, cracked edge
  ctx.beginPath();
  ctx.moveTo(-26, 0);
  ctx.lineTo(-18, -6);
  ctx.lineTo(-10, 2);
  ctx.lineTo(-2, -6);
  ctx.lineTo(6, 2);
  ctx.lineTo(14, -6);
  ctx.lineTo(20, 0);
  ctx.lineTo(26, -4);
  ctx.bezierCurveTo(30, 30, 16, 44, 0, 44);
  ctx.bezierCurveTo(-16, 44, -30, 30, -26, 0);
  ctx.closePath();
  paint(ctx, '#fff6e0');
  for (const [x, y] of [[-12, 20], [10, 28], [4, 12]]) {
    circ(ctx, x, y, 2.4);
    ctx.fillStyle = '#e0c9a0';
    ctx.fill();
  }
  // a shell bit as a hat
  poly(ctx, [[-10, -24], [-4, -34], [4, -30], [10, -36], [12, -24]]);
  paint(ctx, '#fff6e0', 3);
  // sand
  oval(ctx, 0, 44, 34, 5);
  paint(ctx, '#f6d37a', 3);
}

function bee(ctx) {
  // wings
  oval(ctx, -10, -24, 11, 15, -0.4);
  paint(ctx, 'rgba(220,245,255,0.95)', 3);
  oval(ctx, 10, -24, 11, 15, 0.4);
  paint(ctx, 'rgba(220,245,255,0.95)', 3);
  // stinger
  poly(ctx, [[30, 4], [44, 6], [30, 10]]);
  paint(ctx, '#2b2540', 2.5);
  oval(ctx, 4, 6, 28, 20);
  paint(ctx, '#ffd21a');
  ctx.save();
  oval(ctx, 4, 6, 28, 20);
  ctx.clip();
  ctx.fillStyle = INK;
  for (const x of [-2, 12, 26]) ctx.fillRect(x, -20, 7, 50);
  ctx.restore();
  oval(ctx, 4, 6, 28, 20);
  ink(ctx);
  // head
  circ(ctx, -26, 2, 13);
  paint(ctx, '#ffd21a');
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-28 + s * 4, -10);
    ctx.quadraticCurveTo(-30 + s * 8, -22, -32 + s * 10, -24);
    ink(ctx, 2.5);
    circ(ctx, -32 + s * 10, -24, 3);
    ctx.fillStyle = INK;
    ctx.fill();
  }
  dotEye(ctx, -30, 0, 3);
  smile(ctx, -30, 3, 5, 2.2);
}

function honey(ctx) {
  // the pot
  ctx.beginPath();
  ctx.moveTo(-22, -18);
  ctx.bezierCurveTo(-48, 0, -40, 44, 0, 44);
  ctx.bezierCurveTo(40, 44, 48, 0, 22, -18);
  ctx.closePath();
  paint(ctx, '#d0763a');
  rbox(ctx, -26, -26, 52, 12, 5);
  paint(ctx, '#e8924a');
  // honey dripping over the rim
  ctx.beginPath();
  ctx.moveTo(-26, -20);
  ctx.lineTo(26, -20);
  ctx.lineTo(26, -10);
  ctx.quadraticCurveTo(20, 10, 14, -10);
  ctx.quadraticCurveTo(6, 2, 0, -10);
  ctx.quadraticCurveTo(-8, 16, -14, -10);
  ctx.quadraticCurveTo(-20, -4, -26, -10);
  ctx.closePath();
  paint(ctx, '#ffb81a', 3);
  oval(ctx, 0, -26, 26, 6);
  paint(ctx, '#ffc93a', 3);
  // the dipper
  ctx.save();
  ctx.rotate(0.35);
  rbox(ctx, 2, -62, 6, 40, 3);
  paint(ctx, '#a8703f', 3);
  ctx.restore();
  shine(ctx, -18, 14, 5, 10, 0.2, 0.4);
}

function cloud(ctx) {
  // rain
  ctx.fillStyle = '#2f9bff';
  for (const [x, y] of [[-20, 26], [0, 34], [20, 26], [-10, 44], [12, 46]]) {
    ctx.beginPath();
    ctx.moveTo(x, y - 8);
    ctx.quadraticCurveTo(x + 5, y, x, y + 3);
    ctx.quadraticCurveTo(x - 5, y, x, y - 8);
    paint(ctx, '#2f9bff', 2.5);
  }
  ctx.beginPath();
  ctx.moveTo(-34, 14);
  ctx.arc(-30, 0, 14, Math.PI * 0.6, Math.PI * 1.5);
  ctx.arc(-8, -14, 18, Math.PI * 1.1, Math.PI * 1.85);
  ctx.arc(18, -10, 16, Math.PI * 1.3, Math.PI * 0.05 + TAU);
  ctx.arc(32, 4, 12, Math.PI * 1.6, Math.PI * 0.5);
  ctx.closePath();
  paint(ctx, '#aab6cc');
  dotEye(ctx, -10, 0, 3);
  dotEye(ctx, 8, 0, 3);
  ctx.beginPath();
  ctx.arc(-1, 9, 5, Math.PI * 1.15, Math.PI * 1.85);
  ink(ctx, 2.5);
}

function monkey(ctx) {
  const fur = '#7a4a22';
  const face = '#f2c48a';
  for (const s of [-1, 1]) {
    circ(ctx, s * 32, -4, 12);
    paint(ctx, fur);
    circ(ctx, s * 32, -4, 6);
    ctx.fillStyle = face;
    ctx.fill();
  }
  circ(ctx, 0, 0, 30);
  paint(ctx, fur);
  // heart-shaped face
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.bezierCurveTo(-6, -24, -30, -16, -22, 4);
  ctx.bezierCurveTo(-30, 24, -10, 30, 0, 28);
  ctx.bezierCurveTo(10, 30, 30, 24, 22, 4);
  ctx.bezierCurveTo(30, -16, 6, -24, 0, -6);
  ctx.closePath();
  paint(ctx, face, 3);
  dotEye(ctx, -9, -4, 4);
  dotEye(ctx, 9, -4, 4);
  for (const s of [-1, 1]) {
    circ(ctx, s * 3, 8, 1.6);
    ctx.fillStyle = INK;
    ctx.fill();
  }
  smile(ctx, 0, 12, 9, 3);
  // tuft
  ctx.beginPath();
  ctx.moveTo(-4, -30);
  ctx.quadraticCurveTo(0, -40, 6, -34);
  ink(ctx, 3);
}

function banana(ctx) {
  ctx.save();
  ctx.rotate(-0.3);
  ctx.beginPath();
  ctx.moveTo(-36, -18);
  ctx.quadraticCurveTo(-30, 30, 30, 22);
  ctx.quadraticCurveTo(40, 18, 40, 12);
  ctx.quadraticCurveTo(-10, 20, -28, -20);
  ctx.closePath();
  paint(ctx, '#ffd21a');
  ctx.beginPath();
  ctx.moveTo(-32, -18);
  ctx.quadraticCurveTo(-22, 18, 30, 18);
  ink(ctx, 2, '#d9a81a');
  // tips
  rbox(ctx, -40, -26, 9, 9, 3);
  paint(ctx, '#7a4a22', 3);
  circ(ctx, 40, 14, 3.5);
  paint(ctx, '#2b2540', 2);
  ctx.restore();
}

function rabbit(ctx) {
  for (const s of [-1, 1]) {
    oval(ctx, s * 12, -26, 9, 24, s * 0.15);
    paint(ctx, '#ffffff');
    oval(ctx, s * 12, -24, 4.5, 17, s * 0.15);
    ctx.fillStyle = '#ffb3c7';
    ctx.fill();
  }
  oval(ctx, 0, 16, 28, 26);
  paint(ctx, '#ffffff');
  dotEye(ctx, -11, 10, 4);
  dotEye(ctx, 11, 10, 4);
  cheek(ctx, -18, 22, 4);
  cheek(ctx, 18, 22, 4);
  // nose, mouth and teeth
  poly(ctx, [[-4, 18], [4, 18], [0, 22]]);
  paint(ctx, '#ff7aa0', 2);
  rbox(ctx, -5, 26, 10, 8, 1.5);
  paint(ctx, '#ffffff', 2);
  poly(ctx, [[0, 26], [0, 34]], false);
  ink(ctx, 1.5);
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.lineTo(0, 25);
  ctx.moveTo(-8, 25);
  ctx.quadraticCurveTo(0, 28, 8, 25);
  ink(ctx, 2);
  for (const s of [-1, 1]) {
    for (const dy of [-2, 3]) {
      poly(ctx, [[s * 10, 21 + dy], [s * 26, 18 + dy * 2]], false);
      ink(ctx, 1.5);
    }
  }
}

function carrot(ctx) {
  ctx.save();
  ctx.rotate(0.55);
  // greens
  for (const a of [-0.5, 0, 0.5]) {
    ctx.save();
    ctx.translate(0, -26);
    ctx.rotate(a);
    oval(ctx, 0, -12, 5, 14);
    paint(ctx, '#2fbf4a', 3);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.moveTo(-14, -26);
  ctx.quadraticCurveTo(0, -32, 14, -26);
  ctx.quadraticCurveTo(10, 10, 0, 46);
  ctx.quadraticCurveTo(-10, 10, -14, -26);
  ctx.closePath();
  paint(ctx, '#ff8a1f');
  for (const [y, x0, x1] of [[-12, -10, -2], [2, 4, 10], [16, -6, 0], [28, 2, 6]]) {
    poly(ctx, [[x0, y], [x1, y + 2]], false);
    ink(ctx, 2.5, '#c95a0a');
  }
  ctx.restore();
}

function mouse(ctx) {
  // tail
  ctx.beginPath();
  ctx.moveTo(22, 30);
  ctx.bezierCurveTo(46, 30, 44, 4, 36, 10);
  ink(ctx, 6);
  ctx.beginPath();
  ctx.moveTo(22, 30);
  ctx.bezierCurveTo(46, 30, 44, 4, 36, 10);
  ink(ctx, 2.5, '#ff9ab8');
  // body
  oval(ctx, 6, 22, 24, 18);
  paint(ctx, '#a6a6b8');
  // big round ears
  for (const s of [-1, 1]) {
    circ(ctx, s * 18 - 6, -24, 15);
    paint(ctx, '#a6a6b8');
    circ(ctx, s * 18 - 6, -24, 9);
    ctx.fillStyle = '#ffb3c7';
    ctx.fill();
  }
  // head, pointy toward the left
  ctx.beginPath();
  ctx.moveTo(-40, 2);
  ctx.quadraticCurveTo(-30, -22, -6, -18);
  ctx.quadraticCurveTo(16, -14, 14, 4);
  ctx.quadraticCurveTo(10, 18, -10, 16);
  ctx.quadraticCurveTo(-30, 14, -40, 2);
  ctx.closePath();
  paint(ctx, '#bcbccc');
  circ(ctx, -40, 2, 4);
  paint(ctx, '#ff7aa0', 2);
  dotEye(ctx, -14, -4, 4);
  for (const dy of [-2, 4]) {
    poly(ctx, [[-34, 4], [-48, 4 + dy * 2]], false);
    ink(ctx, 1.5);
  }
}

function cheese(ctx) {
  const shape = [[-40, 0], [36, -24], [40, 0], [40, 32], [-40, 32]];
  // top face
  poly(ctx, [[-40, 0], [36, -24], [40, 0]]);
  paint(ctx, '#ffe36a');
  poly(ctx, [[-40, 0], [40, 0], [40, 32], [-40, 32]]);
  paint(ctx, '#ffc72c');
  ctx.save();
  poly(ctx, shape);
  ctx.clip();
  for (const [x, y, r] of [[-22, 14, 6], [4, 20, 8], [26, 10, 5], [30, 28, 4], [-4, 6, 3.5], [14, -8, 4]]) {
    circ(ctx, x, y, r);
    ctx.fillStyle = '#d99a12';
    ctx.fill();
  }
  ctx.restore();
  poly(ctx, shape);
  ink(ctx);
  poly(ctx, [[-40, 0], [40, 0]], false);
  ink(ctx, 3);
}

function spider(ctx) {
  // thread
  poly(ctx, [[0, -50], [0, -18]], false);
  ink(ctx, 2);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const y = -6 + i * 8;
      tube(ctx, line([[s * 10, y], [s * 30, y - 12 + i * 4], [s * 42, y + 6 + i * 4]])(ctx), '#2b2540', 3);
    }
  }
  oval(ctx, 0, 6, 18, 20);
  paint(ctx, '#2b2540');
  circ(ctx, 0, -14, 11);
  paint(ctx, '#2b2540');
  eye(ctx, -5, -15, 5, 0, 0.2);
  eye(ctx, 5, -15, 5, 0, 0.2);
  smile(ctx, 0, -11, 4, 2);
  shine(ctx, -6, 0, 4, 7, 0.3, 0.3);
}

function web(ctx) {
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#7a86a6';
  const spokes = 8;
  for (let i = 0; i < spokes; i++) {
    const a = (i * TAU) / spokes;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * 46, Math.sin(a) * 46);
    ctx.stroke();
  }
  for (const r of [12, 24, 36]) {
    ctx.beginPath();
    for (let i = 0; i <= spokes; i++) {
      const a0 = (i * TAU) / spokes;
      const a1 = ((i + 1) * TAU) / spokes;
      const p0 = [Math.cos(a0) * r, Math.sin(a0) * r];
      const p1 = [Math.cos(a1) * r, Math.sin(a1) * r];
      const m = (a0 + a1) / 2;
      if (i === 0) ctx.moveTo(p0[0], p0[1]);
      if (i < spokes) ctx.quadraticCurveTo(Math.cos(m) * r * 0.8, Math.sin(m) * r * 0.8, p1[0], p1[1]);
    }
    ctx.stroke();
  }
  // dew drops
  for (const [x, y] of [[24, -10], [-14, 22], [-30, -20]]) {
    circ(ctx, x, y, 3.5);
    paint(ctx, '#9fe3ff', 2);
  }
}

export const DRAW = {
  flamingo, gator, pelican, manatee, dolphin, iguana, crab, turtle, parrot, toucan, octopus, jellyfish,
  starfish, fish, seahorse, pineapple, coconut, mango, icecream, snowcone, sandwich, taco, watermelon,
  surfboard, beachball, sunglasses, flipflop, sandcastle, lighthouse, sailboat, speedboat, rocket, palm,
  hibiscus, conch, lifeguard, skate, car, conga, maracas, kite, umbrella, sun,
  pail, spade, cone, scoop, key, chest, dog, bone, bat, baseball, rod, egg, bee, honey, cloud, monkey,
  banana, rabbit, carrot, mouse, cheese, spider, web,
};

export const colourFill = (id) => COLOURS.find((c) => c.id === id)?.fill || null;

// Draws picture `id` centred on (x, y), `size` px across. colour: a COLOURS id or null.
export function drawPicture(ctx, id, x, y, size, colour = null) {
  const fn = DRAW[id];
  if (!fn) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  fn(ctx, colourFill(colour));
  ctx.restore();
}
