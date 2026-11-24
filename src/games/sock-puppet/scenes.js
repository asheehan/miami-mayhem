// Sock Puppet Show scenery: the story places (a still layer to cache and a little live motion
// on top), the animated overlays for problems, fixes and endings, and the pictures on the
// story cards. Drawing only. Everything is laid out in fractions of the box it fills, so a
// scene works from a tall phone page to a wide stage; u is one hundredth of the short side.
import {
  C, TAU, shade, roundRect, ellipse, circle, fillInk, stitches, shine, star, heart,
} from './art.js';

export const FLOOR = 0.8;

const U = (w, h) => Math.min(w, h) / 100;
const LW = (w, h) => Math.max(1.5, U(w, h) * 0.85);
// a steady pseudo-random number in 0..1 for (i, k)
const R = (i, k = 0) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const loop = (v) => v - Math.floor(v);

function vgrad(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}

function fillSky(ctx, w, h, stops, y1 = h) {
  ctx.fillStyle = vgrad(ctx, 0, y1, stops);
  ctx.fillRect(0, 0, w, h);
}

// Circles merged into one outlined blob (clouds, bushes, foam, scoops).
function blob(ctx, circles, fill, lw) {
  ctx.fillStyle = C.ink;
  for (const [x, y, r] of circles) {
    circle(ctx, x, y, r + lw);
    ctx.fill();
  }
  ctx.fillStyle = fill;
  for (const [x, y, r] of circles) {
    circle(ctx, x, y, r);
    ctx.fill();
  }
}

function cloud(ctx, x, y, s, lw, fill = '#ffffff') {
  blob(ctx, [[x - s * 0.55, y + s * 0.1, s * 0.38], [x - s * 0.1, y - s * 0.18, s * 0.5], [x + s * 0.42, y, s * 0.4], [x + s * 0.05, y + s * 0.18, s * 0.38]], fill, lw);
}

// Flat ground from y down, with a darker top edge line.
function ground(ctx, w, h, y, fill, edge) {
  ctx.fillStyle = fill;
  ctx.fillRect(-2, y, w + 4, h - y + 2);
  ctx.strokeStyle = edge || C.ink;
  ctx.lineWidth = LW(w, h);
  ctx.beginPath();
  ctx.moveTo(-2, y);
  ctx.lineTo(w + 2, y);
  ctx.stroke();
}

function sun(ctx, x, y, r, lw) {
  ctx.save();
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = lw * 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    ctx.moveTo(x + Math.cos(a) * r * 1.25, y + Math.sin(a) * r * 1.25);
    ctx.lineTo(x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * 1.6);
  }
  ctx.stroke();
  circle(ctx, x, y, r);
  fillInk(ctx, C.sun, lw);
  ctx.restore();
}

function palm(ctx, x, y, s, lw, lean = 1) {
  // trunk: a curved band of segments
  ctx.save();
  ctx.translate(x, y);
  const top = [lean * s * 0.35, -s * 1.5];
  ctx.beginPath();
  ctx.moveTo(-s * 0.1, 0);
  ctx.quadraticCurveTo(lean * s * 0.05, -s * 0.8, top[0] - s * 0.06, top[1]);
  ctx.lineTo(top[0] + s * 0.07, top[1]);
  ctx.quadraticCurveTo(lean * s * 0.18, -s * 0.8, s * 0.12, 0);
  ctx.closePath();
  fillInk(ctx, '#b07a4a', lw);
  ctx.strokeStyle = shade('#b07a4a', -0.35);
  ctx.lineWidth = lw * 0.8;
  for (let k = 1; k < 6; k++) {
    const t = k / 6;
    const cx = lean * s * 0.07 * t * 2.5 + (top[0] * t * t);
    const cy = top[1] * t;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.1, cy + s * 0.03);
    ctx.lineTo(cx + s * 0.1, cy - s * 0.02);
    ctx.stroke();
  }
  // fronds
  const [tx, ty] = top;
  const fronds = [-2.7, -2.1, -1.5, -0.9, -0.35, 0.15];
  for (const a of fronds) {
    const ex = tx + Math.cos(a) * s * 0.85;
    const ey = ty + Math.sin(a) * s * 0.55 + s * 0.25;
    const mx = tx + Math.cos(a) * s * 0.45;
    const my = ty + Math.sin(a) * s * 0.45 - s * 0.05;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(mx - s * 0.1, my - s * 0.12, ex, ey);
    ctx.quadraticCurveTo(mx + s * 0.08, my + s * 0.12, tx, ty);
    fillInk(ctx, C.leaf, lw);
  }
  circle(ctx, tx - s * 0.06, ty + s * 0.06, s * 0.08);
  fillInk(ctx, '#7a4a26', lw * 0.8);
  circle(ctx, tx + s * 0.08, ty + s * 0.08, s * 0.08);
  fillInk(ctx, '#7a4a26', lw * 0.8);
  ctx.restore();
}

function bigLeaf(ctx, x, y, s, a, lw, fill = C.leaf) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(s * 0.45, -s * 0.35, s, 0);
  ctx.quadraticCurveTo(s * 0.45, s * 0.35, 0, 0);
  fillInk(ctx, fill, lw);
  ctx.strokeStyle = shade(fill, -0.35);
  ctx.lineWidth = lw * 0.7;
  ctx.beginPath();
  ctx.moveTo(s * 0.05, 0);
  ctx.lineTo(s * 0.9, 0);
  for (let k = 1; k < 5; k++) {
    ctx.moveTo(s * k * 0.18, 0);
    ctx.lineTo(s * (k * 0.18 + 0.1), -s * 0.12);
    ctx.moveTo(s * k * 0.18, 0);
    ctx.lineTo(s * (k * 0.18 + 0.1), s * 0.12);
  }
  ctx.stroke();
  ctx.restore();
}

function waveBand(ctx, w, y, amp, len, fill, lw, bottom) {
  ctx.beginPath();
  ctx.moveTo(-4, bottom);
  ctx.lineTo(-4, y);
  for (let x = -4; x <= w + len; x += len) {
    ctx.quadraticCurveTo(x + len * 0.25, y - amp, x + len * 0.5, y);
    ctx.quadraticCurveTo(x + len * 0.75, y + amp, x + len, y);
  }
  ctx.lineTo(w + len * 2, bottom);
  ctx.closePath();
  fillInk(ctx, fill, lw);
}

// A wavy band whose crest scrolls with phase (0..1).
function scrollingWaves(ctx, w, y, amp, len, phase, fill, lw, bottom) {
  ctx.save();
  ctx.translate(-loop(phase) * len, 0);
  waveBand(ctx, w + len * 2, y, amp, len, fill, lw, bottom);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------------------------

const STATIC = {
  beach(ctx, w, h, u, lw) {
    fillSky(ctx, w, h, ['#5ec8ff', '#a8e6ff', '#fff1c4'], h * 0.55);
    sun(ctx, w * 0.84, h * 0.13, u * 7, lw);
    cloud(ctx, w * 0.2, h * 0.14, u * 11, lw);
    // sea
    ctx.fillStyle = vgrad(ctx, h * 0.5, h * 0.68, ['#1fb6d6', '#5fe0e6']);
    ctx.fillRect(0, h * 0.5, w, h * 0.2);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.lineTo(w, h * 0.5);
    ctx.stroke();
    // sand with a wavy wet edge
    ctx.beginPath();
    ctx.moveTo(-4, h);
    ctx.lineTo(-4, h * 0.66);
    for (let k = 0; k <= 8; k++) ctx.quadraticCurveTo(w * (k / 8 - 1 / 16), h * (0.64 + (k % 2) * 0.03), w * (k / 8), h * 0.66);
    ctx.lineTo(w + 4, h);
    ctx.closePath();
    fillInk(ctx, C.sand, lw);
    ctx.fillStyle = shade(C.sand, -0.12);
    for (let k = 0; k < 14; k++) {
      circle(ctx, w * R(k, 1), h * (0.72 + R(k, 2) * 0.26), u * 0.7);
      ctx.fill();
    }
    // palm on the left, umbrella on the right
    palm(ctx, w * 0.06, h * 0.86, Math.min(h * 0.42, w * 0.5), lw, 1);
    const ux = w * 0.94;
    const uy = h * 0.5;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw * 2;
    ctx.beginPath();
    ctx.moveTo(ux, uy);
    ctx.lineTo(ux + u * 2, h * 0.88);
    ctx.stroke();
    const ur = u * 15;
    ctx.beginPath();
    ctx.moveTo(ux - ur, uy + u * 2);
    ctx.quadraticCurveTo(ux, uy - ur * 0.9, ux + ur, uy + u * 2);
    ctx.closePath();
    fillInk(ctx, C.hot, lw);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    for (let k = -2; k <= 2; k += 2) {
      ctx.beginPath();
      ctx.moveTo(ux, uy - ur * 0.5);
      ctx.lineTo(ux + (k - 0.5) * ur * 0.3, uy + u * 3);
      ctx.lineTo(ux + (k + 0.5) * ur * 0.3, uy + u * 3);
      ctx.fill();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(ux - ur, uy + u * 2);
    ctx.quadraticCurveTo(ux, uy - ur * 0.9, ux + ur, uy + u * 2);
    ctx.closePath();
    fillInk(ctx, null, lw);
    // a starfish and shell
    star(ctx, w * 0.5, h * 0.92, u * 3.4, 5, 0.5);
    fillInk(ctx, C.orange, lw * 0.8);
    ctx.beginPath();
    ctx.arc(w * 0.83, h * 0.95, u * 2.8, Math.PI, 0);
    ctx.closePath();
    fillInk(ctx, '#ffc4d6', lw * 0.8);
  },

  'pirate-ship'(ctx, w, h, u, lw) {
    fillSky(ctx, w, h, ['#58b9ff', '#bfe9ff'], h * 0.5);
    cloud(ctx, w * 0.75, h * 0.12, u * 10, lw);
    ctx.fillStyle = vgrad(ctx, h * 0.42, h * 0.62, ['#1a8fc2', '#36c2d8']);
    ctx.fillRect(0, h * 0.42, w, h * 0.3);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = lw;
    for (let k = 0; k < 7; k++) {
      const x = w * R(k, 3);
      const y = h * (0.46 + R(k, 4) * 0.12);
      ctx.beginPath();
      ctx.arc(x, y, u * 2.2, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    // mast and sail at the far left
    const mx = w * 0.07;
    ctx.fillStyle = C.woodDark;
    roundRect(ctx, mx - u * 2, -u * 2, u * 4, h * 0.72, u);
    fillInk(ctx, C.wood, lw);
    ctx.beginPath();
    ctx.moveTo(mx + u * 2, h * 0.05);
    ctx.quadraticCurveTo(mx + w * 0.17, h * 0.2, mx + u * 2, h * 0.4);
    ctx.closePath();
    fillInk(ctx, C.cream, lw);
    stitches(ctx, 'rgba(120,80,40,0.45)', lw * 0.6, u * 1.2);
    // a little flag at the top right on a rope
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    ctx.moveTo(mx, h * 0.04);
    ctx.lineTo(w * 1.02, h * 0.3);
    ctx.stroke();
    for (let k = 1; k < 6; k++) {
      const t = k / 6;
      const x = mx + (w * 1.02 - mx) * t;
      const y = h * 0.04 + (h * 0.26) * t;
      ctx.beginPath();
      ctx.moveTo(x - u * 2, y);
      ctx.lineTo(x + u * 2, y + u * 0.6);
      ctx.lineTo(x, y + u * 4.5);
      ctx.closePath();
      fillInk(ctx, [C.red, C.sun, C.sea, C.pink, C.leaf][k % 5], lw * 0.6);
    }
    // rail and posts
    const railY = h * 0.6;
    const deckY = h * 0.72;
    ctx.fillStyle = '#8a5530';
    ctx.fillRect(0, railY, w, deckY - railY);
    ctx.fillStyle = C.wood;
    for (let x = u * 2; x < w; x += u * 9) {
      roundRect(ctx, x, railY + u * 2, u * 3.4, deckY - railY - u * 2, u * 1.5);
      fillInk(ctx, '#c58b52', lw * 0.8);
    }
    roundRect(ctx, -u, railY - u * 1.5, w + u * 2, u * 3.5, u);
    fillInk(ctx, C.wood, lw);
    // deck planks
    ctx.fillStyle = '#c98f55';
    ctx.fillRect(0, deckY, w, h - deckY);
    ctx.strokeStyle = shade('#c98f55', -0.35);
    ctx.lineWidth = lw * 0.8;
    for (let k = 1; k < 6; k++) {
      const y = deckY + (h - deckY) * (k / 6) ** 0.9;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      for (let x = (k * 37) % (u * 24); x < w; x += u * 24) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - (h - deckY) / 6);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(0, deckY);
    ctx.lineTo(w, deckY);
    ctx.stroke();
    // a barrel on the right
    const bx = w * 0.93;
    const by = h * 0.9;
    roundRect(ctx, bx - u * 7, by - u * 15, u * 14, u * 17, u * 4);
    fillInk(ctx, '#a8692f', lw);
    ctx.strokeStyle = '#5b5560';
    ctx.lineWidth = lw * 1.3;
    for (const f of [0.25, 0.75]) {
      ctx.beginPath();
      ctx.moveTo(bx - u * 7, by - u * 15 + u * 17 * f);
      ctx.lineTo(bx + u * 7, by - u * 15 + u * 17 * f);
      ctx.stroke();
    }
  },

  space(ctx, w, h, u, lw) {
    fillSky(ctx, w, h, ['#120a3a', '#2b1466', '#4a1f80']);
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 60; k++) {
      circle(ctx, w * R(k, 5), h * 0.75 * R(k, 6), u * (0.25 + R(k, 7) * 0.45));
      ctx.fill();
    }
    // ringed planet top right
    const px = w * 0.8;
    const py = h * 0.18;
    const pr = u * 9;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-0.35);
    ellipse(ctx, 0, 0, pr * 1.9, pr * 0.5);
    ctx.lineWidth = lw * 3.4;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.lineWidth = lw * 1.8;
    ctx.strokeStyle = '#ffd23f';
    ctx.stroke();
    ctx.restore();
    circle(ctx, px, py, pr);
    fillInk(ctx, '#ff8a3d', lw);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#ffb36b';
    ctx.fillRect(px - pr, py - pr * 0.3, pr * 2, pr * 0.25);
    ctx.fillRect(px - pr, py + pr * 0.25, pr * 2, pr * 0.2);
    ctx.restore();
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-0.35);
    ctx.beginPath();
    ctx.ellipse(0, 0, pr * 1.9, pr * 0.5, 0, 0, Math.PI);
    ctx.lineWidth = lw * 3.4;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.lineWidth = lw * 1.8;
    ctx.strokeStyle = '#ffd23f';
    ctx.stroke();
    ctx.restore();
    // small planet top left
    circle(ctx, w * 0.14, h * 0.14, u * 5);
    fillInk(ctx, '#5cd6a8', lw);
    circle(ctx, w * 0.13, h * 0.13, u * 1.4);
    ctx.fillStyle = shade('#5cd6a8', -0.2);
    ctx.fill();
    // earth-like far away
    circle(ctx, w * 0.45, h * 0.08, u * 3);
    fillInk(ctx, C.sky, lw * 0.8);
    // moon surface
    const gy = h * 0.72;
    ctx.beginPath();
    ctx.moveTo(-4, h);
    ctx.lineTo(-4, gy + u * 2);
    ctx.quadraticCurveTo(w * 0.25, gy - u * 3, w * 0.5, gy + u);
    ctx.quadraticCurveTo(w * 0.75, gy + u * 4, w + 4, gy - u);
    ctx.lineTo(w + 4, h);
    ctx.closePath();
    fillInk(ctx, '#b9b3cf', lw);
    for (let k = 0; k < 7; k++) {
      const cx = w * (0.05 + R(k, 8) * 0.9);
      const cy = h * (0.8 + R(k, 9) * 0.16);
      ellipse(ctx, cx, cy, u * (2.5 + R(k, 10) * 3), u * (1 + R(k, 10) * 1.2));
      fillInk(ctx, '#9690b3', lw * 0.7);
    }
    // a flag in the moon
    const fx = w * 0.93;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(fx, gy);
    ctx.lineTo(fx, gy - u * 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(fx, gy - u * 14);
    ctx.lineTo(fx - u * 8, gy - u * 11.5);
    ctx.lineTo(fx, gy - u * 9);
    ctx.closePath();
    fillInk(ctx, C.pink, lw * 0.8);
  },

  jungle(ctx, w, h, u, lw) {
    fillSky(ctx, w, h, ['#8fe08a', '#c8f2a6', '#e9ffd0'], h * 0.75);
    // far trees
    ctx.fillStyle = '#6cc46a';
    for (let k = 0; k < 7; k++) {
      circle(ctx, w * (k / 6), h * 0.5, u * 16);
      ctx.fill();
    }
    ctx.fillRect(0, h * 0.5, w, h * 0.3);
    // trunks at the edges
    for (const [x, s] of [[w * 0.03, 1], [w * 0.97, -1]]) {
      roundRect(ctx, x - u * 5, -u * 2, u * 10, h * 0.9, u * 3);
      fillInk(ctx, '#8a5a3c', lw);
      ctx.strokeStyle = '#6a4228';
      ctx.lineWidth = lw * 0.8;
      for (let k = 1; k < 8; k++) {
        ctx.beginPath();
        ctx.arc(x, h * (k / 9), u * 3, 0.2 * s, Math.PI - 0.2 * s);
        ctx.stroke();
      }
    }
    // vines from the top
    ctx.strokeStyle = '#2f8a3a';
    ctx.lineWidth = lw * 1.4;
    for (const [x, len] of [[0.2, 0.32], [0.38, 0.18], [0.62, 0.22], [0.82, 0.36]]) {
      ctx.beginPath();
      ctx.moveTo(w * x, 0);
      ctx.quadraticCurveTo(w * x + u * 4, h * len * 0.5, w * x, h * len);
      ctx.stroke();
      bigLeaf(ctx, w * x, h * len, u * 6, 1.9, lw * 0.8, C.leaf);
    }
    // canopy leaves at the top
    for (let k = 0; k < 9; k++) bigLeaf(ctx, w * (k / 8), -u * 2, u * (14 + R(k, 11) * 6), 0.6 + R(k, 12) * 2, lw, k % 2 ? C.leaf : C.leafDark);
    // ground
    ctx.beginPath();
    ctx.moveTo(-4, h);
    ctx.lineTo(-4, h * 0.74);
    ctx.quadraticCurveTo(w * 0.5, h * 0.7, w + 4, h * 0.75);
    ctx.lineTo(w + 4, h);
    ctx.closePath();
    fillInk(ctx, '#8b6a3a', lw);
    ctx.fillStyle = '#7a5b30';
    for (let k = 0; k < 10; k++) {
      ellipse(ctx, w * R(k, 13), h * (0.82 + R(k, 14) * 0.15), u * 2, u * 0.8);
      ctx.fill();
    }
    // big leaves low at the sides
    bigLeaf(ctx, -u * 2, h * 0.86, u * 26, -0.5, lw);
    bigLeaf(ctx, -u * 2, h * 0.95, u * 22, -0.15, lw, C.leafDark);
    bigLeaf(ctx, w + u * 2, h * 0.86, u * 26, Math.PI + 0.5, lw);
    bigLeaf(ctx, w + u * 2, h * 0.96, u * 22, Math.PI + 0.15, lw, C.leafDark);
    // a red flower
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU;
      circle(ctx, w * 0.5 + Math.cos(a) * u * 2.4, h * 0.93 + Math.sin(a) * u * 2.4, u * 2);
      fillInk(ctx, C.red, lw * 0.7);
    }
    circle(ctx, w * 0.5, h * 0.93, u * 1.4);
    fillInk(ctx, C.sun, lw * 0.6);
  },

  'candy-land'(ctx, w, h, u, lw) {
    fillSky(ctx, w, h, ['#ffb8e0', '#ffe0f0', '#fff4c8'], h * 0.7);
    cloud(ctx, w * 0.3, h * 0.12, u * 9, lw, '#ffffff');
    cloud(ctx, w * 0.82, h * 0.2, u * 7, lw, '#ffe6f4');
    // gumdrop hills
    const hills = [[0.15, '#8fd14f'], [0.5, '#5cb8ff'], [0.85, '#ff8a3d']];
    for (const [x, col] of hills) {
      ctx.beginPath();
      ctx.ellipse(w * x, h * 0.66, w * 0.22, h * 0.2, 0, Math.PI, 0);
      ctx.closePath();
      fillInk(ctx, col, lw);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let k = 0; k < 5; k++) {
        circle(ctx, w * x + (R(k, x * 9) - 0.5) * w * 0.28, h * (0.53 + R(k, x * 7) * 0.1), u * 0.8);
        ctx.fill();
      }
    }
    // lollipop trees at the sides
    for (const [x, col] of [[0.07, C.hot], [0.93, '#8a4fd8']]) {
      const cx = w * x;
      const cy = h * 0.34;
      const r = u * 11;
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, cx - u * 1.5, cy, u * 3, h * 0.5, u);
      fillInk(ctx, '#ffffff', lw);
      circle(ctx, cx, cy, r);
      fillInk(ctx, '#ffffff', lw);
      ctx.strokeStyle = col;
      ctx.lineWidth = r * 0.22;
      ctx.beginPath();
      for (let a = 0; a < TAU * 2.2; a += 0.2) {
        const rr = (a / (TAU * 2.2)) * r * 0.85;
        const px = cx + Math.cos(a) * rr;
        const py = cy + Math.sin(a) * rr;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      circle(ctx, cx, cy, r);
      fillInk(ctx, null, lw);
    }
    // candy-stripe ground
    const gy = h * 0.74;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, gy, w, h - gy);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, gy, w, h - gy);
    ctx.clip();
    ctx.fillStyle = '#ff6fa8';
    const step = u * 10;
    for (let x = -h; x < w + h; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + step * 0.5, h);
      ctx.lineTo(x + step * 0.5 + (h - gy), gy);
      ctx.lineTo(x + (h - gy), gy);
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
    // a couple of wrapped sweets
    for (const [x, col] of [[0.5, C.sun], [0.86, C.sea]]) {
      const cx = w * x;
      const cy = h * 0.93;
      ctx.beginPath();
      ctx.moveTo(cx - u * 3, cy);
      ctx.lineTo(cx - u * 6, cy - u * 2.4);
      ctx.lineTo(cx - u * 6, cy + u * 2.4);
      ctx.closePath();
      fillInk(ctx, col, lw * 0.7);
      ctx.beginPath();
      ctx.moveTo(cx + u * 3, cy);
      ctx.lineTo(cx + u * 6, cy - u * 2.4);
      ctx.lineTo(cx + u * 6, cy + u * 2.4);
      ctx.closePath();
      fillInk(ctx, col, lw * 0.7);
      ellipse(ctx, cx, cy, u * 3.6, u * 2.6);
      fillInk(ctx, col, lw * 0.8);
      shine(ctx, cx - u, cy - u, u * 1.2);
    }
  },

  'under-sea'(ctx, w, h, u, lw) {
    fillSky(ctx, w, h, ['#2fb8e8', '#1677b8', '#0d4f8f']);
    // light rays
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for (let k = 0; k < 4; k++) {
      const x = w * (0.15 + k * 0.24);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + w * 0.08, 0);
      ctx.lineTo(x + w * 0.2, h * 0.8);
      ctx.lineTo(x + w * 0.04, h * 0.8);
      ctx.fill();
    }
    // far rocks
    ctx.fillStyle = '#145f96';
    for (let k = 0; k < 5; k++) {
      ellipse(ctx, w * (k / 4), h * 0.74, w * 0.15, h * 0.1);
      ctx.fill();
    }
    // sand floor
    ctx.beginPath();
    ctx.moveTo(-4, h);
    ctx.lineTo(-4, h * 0.76);
    ctx.quadraticCurveTo(w * 0.3, h * 0.72, w * 0.6, h * 0.76);
    ctx.quadraticCurveTo(w * 0.8, h * 0.79, w + 4, h * 0.75);
    ctx.lineTo(w + 4, h);
    ctx.closePath();
    fillInk(ctx, '#f2d48f', lw);
    // coral on the right
    const cx = w * 0.9;
    const cy = h * 0.8;
    ctx.strokeStyle = C.ink;
    ctx.lineCap = 'round';
    for (const [col, wd] of [[C.ink, u * 4.2 + lw * 2], ['#ff7a8a', u * 4.2]]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = wd;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy - u * 16);
      ctx.moveTo(cx, cy - u * 7);
      ctx.lineTo(cx - u * 7, cy - u * 14);
      ctx.lineTo(cx - u * 7, cy - u * 20);
      ctx.moveTo(cx, cy - u * 10);
      ctx.lineTo(cx + u * 6, cy - u * 17);
      ctx.stroke();
    }
    // shells and a starfish
    star(ctx, w * 0.55, h * 0.9, u * 3.4, 5, 0.5);
    fillInk(ctx, C.orange, lw * 0.8);
    ctx.beginPath();
    ctx.arc(w * 0.2, h * 0.94, u * 2.8, Math.PI, 0);
    ctx.closePath();
    fillInk(ctx, '#ffd0e0', lw * 0.8);
    // a treasure-ish rock on the left
    ellipse(ctx, w * 0.04, h * 0.82, u * 10, u * 7);
    fillInk(ctx, '#6c7aa8', lw);
  },

  'food-truck'(ctx, w, h, u, lw) {
    fillSky(ctx, w, h, ['#5ec8ff', '#c0ecff'], h * 0.6);
    // pastel buildings
    const cols = ['#ffb3c7', '#b6f0e0', '#ffe5a0', '#c9b6ff', '#ffc9a3'];
    const bw = w / 5;
    for (let k = 0; k < 5; k++) {
      const top = h * (0.12 + R(k, 15) * 0.14);
      ctx.fillStyle = cols[k];
      ctx.fillRect(k * bw, top, bw + 1, h * 0.7 - top);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = lw * 0.8;
      ctx.strokeRect(k * bw, top, bw, h * 0.7 - top);
      // deco stripes and windows
      ctx.fillStyle = shade(cols[k], -0.12);
      ctx.fillRect(k * bw, top + u * 2, bw, u * 1.5);
      ctx.fillStyle = '#6fd0ff';
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 2; c++) {
          const wx = k * bw + bw * (0.18 + c * 0.42);
          const wy = top + u * 6 + r * u * 9;
          if (wy + u * 5 > h * 0.58) continue;
          roundRect(ctx, wx, wy, bw * 0.24, u * 5, u);
          fillInk(ctx, '#6fd0ff', lw * 0.6);
        }
      }
    }
    // a palm between buildings
    palm(ctx, w * 0.02, h * 0.74, Math.min(h * 0.38, w * 0.45), lw, 1);
    // sidewalk and street
    ctx.fillStyle = '#d8d0e8';
    ctx.fillRect(0, h * 0.7, w, h * 0.3);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.7);
    ctx.lineTo(w, h * 0.7);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(80,60,120,0.25)';
    ctx.lineWidth = lw * 0.7;
    for (let x = 0; x < w; x += u * 14) {
      ctx.beginPath();
      ctx.moveTo(x, h * 0.7);
      ctx.lineTo(x - u * 6, h);
      ctx.stroke();
    }
    // the food truck on the right, in the background
    const tw = Math.min(w * 0.5, h * 0.62);
    const tx = w - tw * 0.92;
    const ty = h * 0.3;
    const th = h * 0.4;
    roundRect(ctx, tx, ty, tw, th, u * 4);
    fillInk(ctx, '#fff6e4', lw);
    // cab
    roundRect(ctx, tx + tw * 0.74, ty + th * 0.28, tw * 0.3, th * 0.72, u * 3);
    fillInk(ctx, '#fff6e4', lw);
    roundRect(ctx, tx + tw * 0.8, ty + th * 0.34, tw * 0.18, th * 0.24, u * 2);
    fillInk(ctx, '#8fdcff', lw * 0.8);
    // stripe
    ctx.fillStyle = C.hot;
    ctx.fillRect(tx + lw, ty + th * 0.72, tw * 0.74, th * 0.1);
    ctx.fillStyle = C.sea;
    ctx.fillRect(tx + lw, ty + th * 0.82, tw * 0.74, th * 0.06);
    // serving window and awning
    roundRect(ctx, tx + tw * 0.08, ty + th * 0.2, tw * 0.56, th * 0.4, u * 1.5);
    fillInk(ctx, '#5a3a6a', lw);
    ctx.fillStyle = '#ffd23f';
    roundRect(ctx, tx + tw * 0.1, ty + th * 0.52, tw * 0.52, th * 0.08, u);
    fillInk(ctx, '#e8a84a', lw * 0.7);
    const aw = tw * 0.62;
    const ax = tx + tw * 0.05;
    const ay = ty + th * 0.1;
    for (let k = 0; k < 6; k++) {
      ctx.beginPath();
      ctx.moveTo(ax + (k * aw) / 6, ay);
      ctx.lineTo(ax + ((k + 1) * aw) / 6, ay);
      ctx.lineTo(ax + ((k + 1) * aw) / 6, ay + th * 0.12);
      ctx.arc(ax + ((k + 0.5) * aw) / 6, ay + th * 0.12, aw / 12, 0, Math.PI);
      ctx.closePath();
      fillInk(ctx, k % 2 ? '#ffffff' : C.hot, lw * 0.7);
    }
    // a big taco sign on the roof
    const sx = tx + tw * 0.35;
    const sy = ty - u * 1;
    ctx.beginPath();
    ctx.arc(sx, sy, u * 7, Math.PI, 0);
    ctx.closePath();
    fillInk(ctx, '#ffcc4a', lw);
    ctx.fillStyle = C.leaf;
    for (let k = 0; k < 4; k++) {
      circle(ctx, sx - u * 4.5 + k * u * 3, sy - u * 6, u * 1.6);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(sx, sy, u * 7, Math.PI, 0);
    fillInk(ctx, null, lw);
    // wheels
    for (const f of [0.2, 0.84]) {
      circle(ctx, tx + tw * f, ty + th, u * 5);
      fillInk(ctx, '#3a3048', lw);
      circle(ctx, tx + tw * f, ty + th, u * 2);
      fillInk(ctx, '#c8c0d8', lw * 0.6);
    }
    // a little table with a cup on the far left
    ctx.fillStyle = C.sea;
    roundRect(ctx, w * 0.02, h * 0.86, u * 12, u * 2.4, u);
    fillInk(ctx, C.sea, lw * 0.8);
  },

  castle(ctx, w, h, u, lw) {
    // stone hall
    ctx.fillStyle = '#9b93b8';
    ctx.fillRect(0, 0, w, h);
    const bh = u * 7;
    ctx.strokeStyle = 'rgba(50,30,80,0.3)';
    ctx.lineWidth = lw * 0.8;
    for (let y = 0, row = 0; y < h * 0.74; y += bh, row++) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      for (let x = row % 2 ? bh : 0; x < w; x += bh * 2) {
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + bh);
      }
      ctx.stroke();
    }
    // light patches
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let k = 0; k < 10; k++) ctx.fillRect(w * R(k, 16), h * 0.7 * R(k, 17), bh * 2, bh);
    // arched door in the middle-back
    const dw = Math.min(w * 0.24, h * 0.3);
    const dx = w * 0.5 - dw / 2;
    const dy = h * 0.32;
    ctx.beginPath();
    ctx.moveTo(dx, h * 0.74);
    ctx.lineTo(dx, dy + dw / 2);
    ctx.arc(dx + dw / 2, dy + dw / 2, dw / 2, Math.PI, 0);
    ctx.lineTo(dx + dw, h * 0.74);
    ctx.closePath();
    fillInk(ctx, '#7a4a28', lw * 1.2);
    ctx.strokeStyle = '#5a3418';
    ctx.lineWidth = lw;
    for (let k = 1; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(dx + (dw * k) / 4, dy + (k === 2 ? 0 : dw * 0.08));
      ctx.lineTo(dx + (dw * k) / 4, h * 0.74);
      ctx.stroke();
    }
    circle(ctx, dx + dw * 0.68, h * 0.56, u * 1.2);
    fillInk(ctx, C.gold, lw * 0.6);
    // windows high up with a view of sky
    for (const x of [0.22, 0.78]) {
      const wx = w * x;
      ctx.beginPath();
      ctx.moveTo(wx - u * 4, h * 0.3);
      ctx.lineTo(wx - u * 4, h * 0.14);
      ctx.arc(wx, h * 0.14, u * 4, Math.PI, 0);
      ctx.lineTo(wx + u * 4, h * 0.3);
      ctx.closePath();
      fillInk(ctx, '#8fdcff', lw);
    }
    // banners
    for (const [x, col] of [[0.08, C.red], [0.36, '#3e5fd8'], [0.64, '#3e5fd8'], [0.92, C.red]]) {
      const bx = w * x;
      const bwd = u * 9;
      ctx.beginPath();
      ctx.moveTo(bx - bwd / 2, h * 0.02);
      ctx.lineTo(bx + bwd / 2, h * 0.02);
      ctx.lineTo(bx + bwd / 2, h * 0.3);
      ctx.lineTo(bx, h * 0.26);
      ctx.lineTo(bx - bwd / 2, h * 0.3);
      ctx.closePath();
      fillInk(ctx, col, lw);
      star(ctx, bx, h * 0.13, u * 2.6);
      fillInk(ctx, C.gold, lw * 0.6);
    }
    // torches
    for (const x of [0.5 - dw / w / 2 - 0.05, 0.5 + dw / w / 2 + 0.05]) {
      roundRect(ctx, w * x - u * 1.2, h * 0.42, u * 2.4, u * 8, u);
      fillInk(ctx, C.woodDark, lw * 0.8);
    }
    // checker floor
    const gy = h * 0.74;
    ctx.fillStyle = '#e8d8b8';
    ctx.fillRect(0, gy, w, h - gy);
    ctx.fillStyle = '#c4a878';
    const n = 10;
    const rows = 4;
    for (let r = 0; r < rows; r++) {
      const y0 = gy + (h - gy) * ((r / rows) ** 1.2);
      const y1 = gy + (h - gy) * (((r + 1) / rows) ** 1.2);
      for (let c = -4; c < n + 4; c++) {
        if ((r + c) % 2) continue;
        const sp = (y) => 1 + ((y - gy) / (h - gy)) * 0.6;
        const xa = (c / n - 0.5) * w * sp(y0) + w / 2;
        const xb = ((c + 1) / n - 0.5) * w * sp(y0) + w / 2;
        const xc = ((c + 1) / n - 0.5) * w * sp(y1) + w / 2;
        const xd = (c / n - 0.5) * w * sp(y1) + w / 2;
        ctx.beginPath();
        ctx.moveTo(xa, y0);
        ctx.lineTo(xb, y0);
        ctx.lineTo(xc, y1);
        ctx.lineTo(xd, y1);
        ctx.fill();
      }
    }
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
    // a red carpet up to the door
    ctx.beginPath();
    ctx.moveTo(dx + dw * 0.15, gy);
    ctx.lineTo(dx + dw * 0.85, gy);
    ctx.lineTo(w * 0.5 + dw * 0.6, h);
    ctx.lineTo(w * 0.5 - dw * 0.6, h);
    ctx.closePath();
    fillInk(ctx, C.curtain, lw);
  },

  'snowy-mountain'(ctx, w, h, u, lw) {
    fillSky(ctx, w, h, ['#8fd0ff', '#d8f0ff', '#f4fbff'], h * 0.7);
    // mountains
    const mts = [[0.25, 0.18, 0.4, '#8fa8d8'], [0.7, 0.1, 0.45, '#7a92c8'], [0.0, 0.3, 0.3, '#a4b8e0'], [1.0, 0.26, 0.3, '#a4b8e0']];
    for (const [x, top, half, col] of mts) {
      const px = w * x;
      const py = h * top;
      const bw = w * half;
      ctx.beginPath();
      ctx.moveTo(px - bw, h * 0.72);
      ctx.lineTo(px, py);
      ctx.lineTo(px + bw, h * 0.72);
      ctx.closePath();
      fillInk(ctx, col, lw);
      const sy = py + (h * 0.72 - py) * 0.28;
      const sw = bw * 0.28;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - sw, sy);
      ctx.lineTo(px - sw * 0.5, sy - u * 2);
      ctx.lineTo(px, sy + u * 1.5);
      ctx.lineTo(px + sw * 0.5, sy - u * 2);
      ctx.lineTo(px + sw, sy);
      ctx.closePath();
      fillInk(ctx, '#ffffff', lw);
    }
    // snow ground
    ctx.beginPath();
    ctx.moveTo(-4, h);
    ctx.lineTo(-4, h * 0.72);
    ctx.quadraticCurveTo(w * 0.3, h * 0.68, w * 0.55, h * 0.73);
    ctx.quadraticCurveTo(w * 0.8, h * 0.77, w + 4, h * 0.71);
    ctx.lineTo(w + 4, h);
    ctx.closePath();
    fillInk(ctx, '#ffffff', lw);
    ctx.fillStyle = '#dbe9ff';
    for (let k = 0; k < 6; k++) {
      ellipse(ctx, w * R(k, 18), h * (0.84 + R(k, 19) * 0.12), u * 8, u * 1.4);
      ctx.fill();
    }
    // pines at the edges
    for (const [x, s] of [[0.06, 1], [0.94, 0.85], [0.15, 0.6]]) {
      const px = w * x;
      const base = h * 0.8;
      const ph = u * 30 * s;
      roundRect(ctx, px - u * 1.5, base - u * 4, u * 3, u * 5, u * 0.5);
      fillInk(ctx, C.woodDark, lw * 0.8);
      for (let k = 0; k < 3; k++) {
        const ty = base - u * 3 - ph * (k / 3);
        const wd = u * 12 * s * (1 - k * 0.25);
        ctx.beginPath();
        ctx.moveTo(px - wd, ty);
        ctx.lineTo(px, ty - ph * 0.45);
        ctx.lineTo(px + wd, ty);
        ctx.closePath();
        fillInk(ctx, '#2e8a5a', lw);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(px - wd * 0.45, ty - ph * 0.25);
        ctx.lineTo(px, ty - ph * 0.45);
        ctx.lineTo(px + wd * 0.45, ty - ph * 0.25);
        ctx.closePath();
        ctx.fill();
      }
    }
    // a snowman friend far right
    const sx = w * 0.86;
    circle(ctx, sx, h * 0.89, u * 5);
    fillInk(ctx, '#ffffff', lw);
    circle(ctx, sx, h * 0.81, u * 3.6);
    fillInk(ctx, '#ffffff', lw);
    ctx.fillStyle = C.ink;
    circle(ctx, sx - u * 1.2, h * 0.8, u * 0.5);
    ctx.fill();
    circle(ctx, sx + u * 1.2, h * 0.8, u * 0.5);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx, h * 0.815);
    ctx.lineTo(sx + u * 3.4, h * 0.825);
    ctx.lineTo(sx, h * 0.83);
    ctx.closePath();
    fillInk(ctx, C.orange, lw * 0.5);
  },

  'dino-valley'(ctx, w, h, u, lw) {
    fillSky(ctx, w, h, ['#ffb36b', '#ffd79a', '#fff0c8'], h * 0.7);
    // volcano middle-back
    const vx = w * 0.55;
    ctx.beginPath();
    ctx.moveTo(vx - w * 0.32, h * 0.7);
    ctx.lineTo(vx - w * 0.07, h * 0.22);
    ctx.lineTo(vx + w * 0.07, h * 0.22);
    ctx.lineTo(vx + w * 0.32, h * 0.7);
    ctx.closePath();
    fillInk(ctx, '#8a6a7a', lw);
    ctx.beginPath();
    ctx.moveTo(vx - w * 0.07, h * 0.22);
    ctx.lineTo(vx - w * 0.05, h * 0.32);
    ctx.lineTo(vx - w * 0.02, h * 0.27);
    ctx.lineTo(vx + w * 0.01, h * 0.36);
    ctx.lineTo(vx + w * 0.04, h * 0.28);
    ctx.lineTo(vx + w * 0.07, h * 0.22);
    ctx.closePath();
    fillInk(ctx, '#ff5a2a', lw);
    // hills
    ctx.fillStyle = '#9ed36a';
    ellipse(ctx, w * 0.1, h * 0.72, w * 0.3, h * 0.14);
    fillInk(ctx, '#9ed36a', lw);
    ellipse(ctx, w * 0.95, h * 0.72, w * 0.3, h * 0.12);
    fillInk(ctx, '#8cc85a', lw);
    // ground
    ctx.beginPath();
    ctx.moveTo(-4, h);
    ctx.lineTo(-4, h * 0.73);
    ctx.quadraticCurveTo(w * 0.5, h * 0.69, w + 4, h * 0.74);
    ctx.lineTo(w + 4, h);
    ctx.closePath();
    fillInk(ctx, '#c9a35a', lw);
    ctx.fillStyle = '#b08a48';
    for (let k = 0; k < 8; k++) {
      ellipse(ctx, w * R(k, 20), h * (0.82 + R(k, 21) * 0.14), u * 2.6, u * 1);
      ctx.fill();
    }
    // a big footprint
    const fx = w * 0.52;
    const fy = h * 0.91;
    ellipse(ctx, fx, fy, u * 4, u * 2.2);
    ctx.fillStyle = '#a07a3a';
    ctx.fill();
    for (let k = -1; k <= 1; k++) {
      ellipse(ctx, fx + k * u * 3, fy - u * 3, u * 1.2, u * 1.6);
      ctx.fill();
    }
    // ferns
    const fern = (x, y, s, dir) => {
      for (let k = 0; k < 5; k++) bigLeaf(ctx, x, y, s * (1 - k * 0.08), -Math.PI / 2 + dir * (0.3 + k * 0.32), lw * 0.9, k % 2 ? C.leaf : '#4fb848');
    };
    fern(w * 0.02, h * 0.84, u * 22, 1);
    fern(w * 0.98, h * 0.84, u * 22, -1);
    // a dinosaur egg nest
    ellipse(ctx, w * 0.88, h * 0.95, u * 8, u * 2.6);
    fillInk(ctx, '#9a7444', lw * 0.8);
    for (const dx of [-3, 0, 3]) {
      ellipse(ctx, w * 0.88 + dx * u, h * 0.92, u * 2, u * 2.8);
      fillInk(ctx, '#f4ecd6', lw * 0.7);
    }
  },

  sky(ctx, w, h, u, lw) {
    fillSky(ctx, w, h, ['#6a7fe0', '#ff9ac8', '#ffcf8a'], h);
    sun(ctx, w * 0.82, h * 0.3, u * 8, lw);
    cloud(ctx, w * 0.12, h * 0.2, u * 9, lw, '#fff0f8');
    cloud(ctx, w * 0.6, h * 0.1, u * 6, lw, '#fff0f8');
    // birds
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw;
    for (const [x, y] of [[0.35, 0.18], [0.42, 0.24], [0.7, 0.5]]) {
      ctx.beginPath();
      ctx.moveTo(w * x - u * 2, h * y);
      ctx.quadraticCurveTo(w * x - u, h * y - u * 1.4, w * x, h * y);
      ctx.quadraticCurveTo(w * x + u, h * y - u * 1.4, w * x + u * 2, h * y);
      ctx.stroke();
    }
    // a cloud bank as the floor
    const circles = [];
    const n = 9;
    for (let k = 0; k <= n; k++) circles.push([w * (k / n), h * (FLOOR + 0.02) + (k % 2) * u * 2, Math.max(w / n * 0.72, u * 8)]);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, h * (FLOOR + 0.06), w, h);
    blob(ctx, circles, '#ffffff', lw);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, h * (FLOOR + 0.07), w, h);
    ctx.fillStyle = '#f0e8ff';
    for (let k = 0; k < 4; k++) {
      ellipse(ctx, w * (0.15 + k * 0.25), h * 0.93, u * 9, u * 2);
      ctx.fill();
    }
  },

  sea(ctx, w, h, u, lw) {
    fillSky(ctx, w, h, ['#ff8fb8', '#ffb07a', '#ffe08a'], h * 0.55);
    // sun setting on the horizon
    circle(ctx, w * 0.5, h * 0.55, u * 13);
    fillInk(ctx, '#ffd23f', lw);
    cloud(ctx, w * 0.18, h * 0.16, u * 8, lw, '#fff0f4');
    cloud(ctx, w * 0.8, h * 0.22, u * 6, lw, '#fff0f4');
    ctx.fillStyle = vgrad(ctx, h * 0.55, h, ['#2fa6d8', '#1a6fb0']);
    ctx.fillRect(0, h * 0.55, w, h * 0.45);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.55);
    ctx.lineTo(w, h * 0.55);
    ctx.stroke();
    // sun's path on the water
    ctx.fillStyle = 'rgba(255,230,140,0.75)';
    for (let k = 0; k < 6; k++) {
      const y = h * (0.58 + k * 0.045);
      const half = u * (10 - k * 1.2);
      roundRect(ctx, w * 0.5 - half, y, half * 2, u * 1.2, u * 0.6);
      ctx.fill();
    }
    // a far island with a palm
    ellipse(ctx, w * 0.12, h * 0.555, u * 10, u * 2.6);
    fillInk(ctx, C.sand, lw * 0.8);
    palm(ctx, w * 0.12, h * 0.55, u * 9, lw * 0.6, 1);
  },
};

const LIVE = {
  beach(ctx, w, h, t, u, lw) {
    // waves rolling on the shore and a drifting cloud
    cloud(ctx, ((t * u * 1.6 + w * 0.55) % (w + u * 30)) - u * 15, h * 0.26, u * 6, lw);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = lw * 1.2;
    ctx.lineCap = 'round';
    for (let k = 0; k < 5; k++) {
      const x = loop(R(k, 30) + t * 0.03) * w;
      const y = h * (0.54 + R(k, 31) * 0.1);
      ctx.beginPath();
      ctx.moveTo(x - u * 3, y);
      ctx.quadraticCurveTo(x, y - u * 1.6, x + u * 3, y);
      ctx.stroke();
    }
    const foam = h * 0.655 + Math.sin(t * 1.4) * u * 0.8;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = lw * 1.6;
    ctx.beginPath();
    for (let x = 0; x <= w; x += u * 4) {
      const y = foam + Math.sin(x / (u * 4) + t * 2) * u * 0.6;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  },
  'pirate-ship'(ctx, w, h, t, u, lw) {
    // the flag on top of the mast flaps; gulls glide
    const mx = w * 0.07;
    const fl = Math.sin(t * 6) * u;
    ctx.beginPath();
    ctx.moveTo(mx, h * 0.0);
    ctx.quadraticCurveTo(mx + u * 5, h * 0.0 + fl, mx + u * 10, h * 0.02);
    ctx.lineTo(mx + u * 10, h * 0.07 + fl * 0.5);
    ctx.quadraticCurveTo(mx + u * 5, h * 0.06 - fl, mx, h * 0.07);
    ctx.closePath();
    fillInk(ctx, '#33283f', lw);
    circle(ctx, mx + u * 5, h * 0.035 + fl * 0.3, u * 1.2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    const gx = loop(t * 0.04) * (w + u * 20) - u * 10;
    const gy = h * 0.2 + Math.sin(t * 1.3) * u * 2;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw;
    const fla = Math.sin(t * 8) * u;
    ctx.beginPath();
    ctx.moveTo(gx - u * 3, gy - fla);
    ctx.quadraticCurveTo(gx - u * 1.5, gy - u * 2, gx, gy);
    ctx.quadraticCurveTo(gx + u * 1.5, gy - u * 2, gx + u * 3, gy - fla);
    ctx.stroke();
  },
  space(ctx, w, h, t, u, lw) {
    // twinkling stars and a shooting star
    for (let k = 0; k < 8; k++) {
      const a = 0.5 + 0.5 * Math.sin(t * 3 + k * 1.7);
      ctx.globalAlpha = a;
      star(ctx, w * R(k, 40), h * 0.6 * R(k, 41), u * 1.6, 4, 0.35);
      ctx.fillStyle = '#fff6a8';
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const p = loop(t * 0.18);
    if (p < 0.35) {
      const q = p / 0.35;
      const x = w * (0.1 + q * 0.7);
      const y = h * (0.05 + q * 0.25);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = lw * 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - u * 10, y - u * 3.5);
      ctx.lineTo(x, y);
      ctx.stroke();
      star(ctx, x, y, u * 1.8, 5, 0.45);
      fillInk(ctx, '#fff27a', lw * 0.5);
    }
  },
  jungle(ctx, w, h, t, u, lw) {
    // a butterfly
    const x = w * 0.5 + Math.sin(t * 0.7) * w * 0.25;
    const y = h * 0.28 + Math.sin(t * 1.9) * h * 0.05;
    const f = Math.abs(Math.sin(t * 12));
    for (const s of [-1, 1]) {
      ellipse(ctx, x + s * u * 1.8 * f, y, u * 2 * f + 0.5, u * 2.6);
      fillInk(ctx, s < 0 ? '#ff8a3d' : '#ffd23f', lw * 0.6);
    }
    ctx.fillStyle = C.ink;
    ellipse(ctx, x, y, u * 0.5, u * 2);
    ctx.fill();
  },
  'candy-land'(ctx, w, h, t, u, lw) {
    // floating sprinkles
    for (let k = 0; k < 10; k++) {
      const x = w * R(k, 50) + Math.sin(t + k) * u * 2;
      const y = h * (0.75 - loop(R(k, 51) + t * 0.05) * 0.7);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 1.5 + k);
      roundRect(ctx, -u * 1.2, -u * 0.4, u * 2.4, u * 0.8, u * 0.4);
      ctx.fillStyle = ['#ff4fa0', '#5cb8ff', '#ffd23f', '#8fd14f', '#8a4fd8'][k % 5];
      ctx.fill();
      ctx.restore();
    }
  },
  'under-sea'(ctx, w, h, t, u, lw) {
    // swaying seaweed at the edges and bubbles
    for (const [x, hh, col] of [[0.05, 0.42, '#2fae6a'], [0.1, 0.28, '#3cbf55'], [0.78, 0.3, '#2fae6a']]) {
      const base = h * 0.8;
      const top = base - h * hh;
      const sw = Math.sin(t * 1.4 + x * 10) * u * 3;
      ctx.beginPath();
      ctx.moveTo(w * x - u * 1.6, base);
      ctx.bezierCurveTo(w * x - u * 5 + sw, base - h * hh * 0.4, w * x + u * 3 + sw, base - h * hh * 0.7, w * x + sw * 1.4, top);
      ctx.bezierCurveTo(w * x + u * 6 + sw, base - h * hh * 0.7, w * x - u * 1 + sw, base - h * hh * 0.4, w * x + u * 1.6, base);
      ctx.closePath();
      fillInk(ctx, col, lw);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = lw * 0.8;
    for (let k = 0; k < 9; k++) {
      const x = w * R(k, 60) + Math.sin(t * 2 + k) * u;
      const y = h * (0.85 - loop(R(k, 61) + t * 0.08) * 0.85);
      circle(ctx, x, y, u * (0.6 + R(k, 62) * 1.2));
      ctx.stroke();
    }
    // a little fish
    const fx = w * (1.1 - loop(t * 0.05) * 1.2);
    const fy = h * 0.22 + Math.sin(t * 2) * u * 2;
    ctx.beginPath();
    ctx.moveTo(fx + u * 3, fy);
    ctx.lineTo(fx + u * 5.5, fy - u * 2);
    ctx.lineTo(fx + u * 5.5, fy + u * 2);
    ctx.closePath();
    fillInk(ctx, C.orange, lw * 0.7);
    ellipse(ctx, fx, fy, u * 3.5, u * 2.2);
    fillInk(ctx, C.orange, lw * 0.7);
    circle(ctx, fx - u * 1.5, fy - u * 0.4, u * 0.5);
    ctx.fillStyle = C.ink;
    ctx.fill();
  },
  'food-truck'(ctx, w, h, t, u, lw) {
    // steam from the truck window
    const tw = Math.min(w * 0.5, h * 0.62);
    const tx = w - tw * 0.92;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = lw * 1.3;
    ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const x = tx + tw * (0.2 + k * 0.15);
      const p = loop(t * 0.5 + k * 0.33);
      const y = h * 0.42 - p * h * 0.12;
      ctx.globalAlpha = 1 - p;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + u * 2, y - u * 2, x, y - u * 4);
      ctx.quadraticCurveTo(x - u * 2, y - u * 6, x, y - u * 8);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
  castle(ctx, w, h, t, u, lw) {
    // torch flames flicker beside the door
    const dw = Math.min(w * 0.24, h * 0.3) / w;
    for (const x of [0.5 - dw / 2 - 0.05, 0.5 + dw / 2 + 0.05]) {
      const fx = w * x;
      const fy = h * 0.42;
      const f = 1 + Math.sin(t * 13 + x * 9) * 0.15;
      ctx.beginPath();
      ctx.moveTo(fx - u * 2.4, fy);
      ctx.quadraticCurveTo(fx - u * 2.6, fy - u * 4 * f, fx, fy - u * 7 * f);
      ctx.quadraticCurveTo(fx + u * 2.6, fy - u * 4 * f, fx + u * 2.4, fy);
      ctx.closePath();
      fillInk(ctx, C.orange, lw * 0.8);
      ctx.beginPath();
      ctx.moveTo(fx - u * 1.1, fy);
      ctx.quadraticCurveTo(fx, fy - u * 4 * f, fx + u * 1.1, fy);
      ctx.fillStyle = C.sun;
      ctx.fill();
    }
  },
  'snowy-mountain'(ctx, w, h, t, u, lw) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(80,110,170,0.6)';
    ctx.lineWidth = lw * 0.5;
    for (let k = 0; k < 24; k++) {
      const x = loop(R(k, 70) + Math.sin(t * 0.5 + k) * 0.01) * w;
      const y = loop(R(k, 71) + t * (0.05 + R(k, 72) * 0.04)) * h;
      circle(ctx, x, y, u * (0.5 + R(k, 73) * 0.8));
      ctx.fill();
      ctx.stroke();
    }
  },
  'dino-valley'(ctx, w, h, t, u, lw) {
    // smoke puffs from the volcano
    const vx = w * 0.55;
    for (let k = 0; k < 4; k++) {
      const p = loop(t * 0.15 + k / 4);
      const x = vx + Math.sin(p * 4 + k) * u * 3 + p * u * 8;
      const y = h * 0.2 - p * h * 0.2;
      circle(ctx, x, y, u * (3 + Math.sin(p * Math.PI) * 4));
      fillInk(ctx, '#ece4ec', lw * 0.7);
    }
    // a pterodactyl-ish bird gliding
    const bx = loop(t * 0.035 + 0.3) * (w + u * 30) - u * 15;
    const by = h * 0.12 + Math.sin(t) * u * 2;
    const f = Math.sin(t * 5) * u * 1.5;
    ctx.beginPath();
    ctx.moveTo(bx - u * 6, by - f);
    ctx.lineTo(bx, by + u);
    ctx.lineTo(bx + u * 6, by - f);
    ctx.lineTo(bx, by - u);
    ctx.closePath();
    fillInk(ctx, '#7a5a8a', lw * 0.7);
  },
  sky(ctx, w, h, t, u, lw) {
    // clouds drifting past (as if flying)
    for (let k = 0; k < 3; k++) {
      const x = w * 1.2 - loop(t * 0.05 + k / 3) * w * 1.5;
      cloud(ctx, x, h * (0.38 + k * 0.12), u * (5 + k), lw, '#ffffff');
    }
  },
  sea(ctx, w, h, t, u, lw) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = lw * 1.2;
    ctx.lineCap = 'round';
    for (let k = 0; k < 8; k++) {
      const x = loop(R(k, 80) - t * 0.02) * w;
      const y = h * (0.6 + R(k, 81) * 0.35);
      const s = u * (2 + R(k, 82) * 2);
      ctx.beginPath();
      ctx.moveTo(x - s, y);
      ctx.quadraticCurveTo(x, y - s * 0.6 + Math.sin(t * 2 + k) * u * 0.4, x + s, y);
      ctx.stroke();
    }
  },
};

export function drawPlaceStatic(ctx, id, w, h) {
  const u = U(w, h);
  const lw = LW(w, h);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const f = STATIC[id];
  if (f) f(ctx, w, h, u, lw);
  else fillSky(ctx, w, h, ['#7fd3ff', '#fff1c4']);
  ctx.restore();
}

export function drawPlaceLive(ctx, id, w, h, t) {
  const f = LIVE[id];
  if (!f) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  f(ctx, w, h, t, U(w, h), LW(w, h));
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Little pictures the effects use
// ---------------------------------------------------------------------------------------------

function taco(ctx, x, y, s, a, lw) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  // lettuce ruffle peeking out the top
  ctx.fillStyle = C.leaf;
  for (let k = 0; k < 5; k++) {
    circle(ctx, -s * 0.7 + k * s * 0.35, -s * 0.12, s * 0.22);
    ctx.fill();
  }
  ctx.fillStyle = C.red;
  circle(ctx, -s * 0.2, -s * 0.2, s * 0.13);
  ctx.fill();
  circle(ctx, s * 0.35, -s * 0.18, s * 0.12);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -s * 0.1, s * 0.9, 0, Math.PI);
  ctx.closePath();
  fillInk(ctx, '#ffc845', lw);
  ctx.fillStyle = '#e8a030';
  for (let k = 0; k < 3; k++) {
    circle(ctx, -s * 0.4 + k * s * 0.4, s * 0.3, s * 0.07);
    ctx.fill();
  }
  ctx.restore();
}

function note(ctx, x, y, s, col, lw, double) {
  ctx.fillStyle = col;
  ellipse(ctx, x, y, s * 0.55, s * 0.4, -0.4);
  fillInk(ctx, col, lw);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = lw * 1.3;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.48, y - s * 0.1);
  ctx.lineTo(x + s * 0.48, y - s * 1.5);
  if (double) {
    ctx.lineTo(x + s * 1.7, y - s * 1.8);
    ctx.lineTo(x + s * 1.7, y - s * 0.4);
  } else ctx.quadraticCurveTo(x + s * 1.2, y - s * 1.2, x + s * 1.1, y - s * 0.7);
  ctx.stroke();
  if (double) {
    ellipse(ctx, x + s * 1.22, y - s * 0.3, s * 0.55, s * 0.4, -0.4);
    fillInk(ctx, col, lw);
  }
}

function sparkle(ctx, x, y, r, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

function feather(ctx, x, y, s, a, col, lw) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(0, s);
  ctx.quadraticCurveTo(-s * 0.5, s * 0.1, 0, -s);
  ctx.quadraticCurveTo(s * 0.5, s * 0.1, 0, s);
  fillInk(ctx, col, lw);
  ctx.strokeStyle = shade(col, -0.3);
  ctx.lineWidth = lw * 0.7;
  ctx.beginPath();
  ctx.moveTo(0, s * 1.2);
  ctx.lineTo(0, -s * 0.8);
  for (let k = -2; k <= 2; k++) {
    ctx.moveTo(0, k * s * 0.3);
    ctx.lineTo(-s * 0.25, k * s * 0.3 - s * 0.15);
    ctx.moveTo(0, k * s * 0.3);
    ctx.lineTo(s * 0.25, k * s * 0.3 - s * 0.15);
  }
  ctx.stroke();
  ctx.restore();
}

function gear(ctx, x, y, r, a, col, lw, teeth = 8) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.beginPath();
  for (let k = 0; k < teeth * 2; k++) {
    const a0 = (k / (teeth * 2)) * TAU;
    const a1 = ((k + 1) / (teeth * 2)) * TAU;
    const rr = k % 2 ? r : r * 1.25;
    ctx.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
    ctx.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr);
  }
  ctx.closePath();
  fillInk(ctx, col, lw);
  circle(ctx, 0, 0, r * 0.35);
  fillInk(ctx, '#ffffff', lw);
  ctx.restore();
}

function zShape(ctx, x, y, s, lw, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(x - s, y - s);
    ctx.lineTo(x + s, y - s);
    ctx.lineTo(x - s, y + s);
    ctx.lineTo(x + s, y + s);
  };
  path();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = s * 0.55 + lw;
  ctx.stroke();
  path();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = s * 0.55;
  ctx.stroke();
  ctx.restore();
}

function hat(ctx, x, y, s, a, lw) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ellipse(ctx, 0, s * 0.3, s * 1.1, s * 0.28);
  fillInk(ctx, '#3e5fd8', lw);
  ctx.beginPath();
  ctx.moveTo(-s * 0.6, s * 0.3);
  ctx.lineTo(-s * 0.5, -s * 0.6);
  ctx.quadraticCurveTo(0, -s * 0.8, s * 0.5, -s * 0.6);
  ctx.lineTo(s * 0.6, s * 0.3);
  ctx.closePath();
  fillInk(ctx, '#3e5fd8', lw);
  ctx.fillStyle = C.sun;
  ctx.fillRect(-s * 0.58, s * 0.02, s * 1.16, s * 0.2);
  star(ctx, s * 0.25, s * 0.1, s * 0.16);
  fillInk(ctx, C.red, lw * 0.5);
  ctx.restore();
}

function speedLines(ctx, x, y, len, n, gap, lw, dir = 1) {
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let k = 0; k < n; k++) {
    const yy = y + (k - (n - 1) / 2) * gap;
    const l = len * (k % 2 ? 0.7 : 1);
    ctx.moveTo(x, yy);
    ctx.lineTo(x + dir * l, yy);
  }
  ctx.stroke();
}

function puff(ctx, x, y, r, lw, col = '#f4ead8') {
  blob(ctx, [[x - r * 0.5, y, r * 0.6], [x + r * 0.4, y - r * 0.1, r * 0.55], [x, y - r * 0.4, r * 0.55]], col, lw * 0.8);
}

function balloon(ctx, x, y, r, col, lw, t = 0) {
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = lw * 0.7;
  ctx.beginPath();
  ctx.moveTo(x, y + r * 1.15);
  ctx.quadraticCurveTo(x + Math.sin(t * 2) * r * 0.4, y + r * 2, x, y + r * 2.8);
  ctx.stroke();
  ellipse(ctx, x, y, r * 0.85, r);
  fillInk(ctx, col, lw);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.15, y + r * 1.15);
  ctx.lineTo(x + r * 0.15, y + r * 1.15);
  ctx.lineTo(x, y + r * 0.95);
  ctx.closePath();
  fillInk(ctx, col, lw * 0.6);
  shine(ctx, x - r * 0.3, y - r * 0.4, r * 0.25);
}

function cone(ctx, x, y, s, scoops, lw) {
  ctx.beginPath();
  ctx.moveTo(x - s * 0.5, y);
  ctx.lineTo(x + s * 0.5, y);
  ctx.lineTo(x, y + s * 1.3);
  ctx.closePath();
  fillInk(ctx, '#e8b060', lw);
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = '#b67c34';
  ctx.lineWidth = lw * 0.6;
  for (let k = -3; k <= 3; k++) {
    ctx.beginPath();
    ctx.moveTo(x + k * s * 0.22 - s, y);
    ctx.lineTo(x + k * s * 0.22 + s, y + s * 2);
    ctx.moveTo(x + k * s * 0.22 + s, y);
    ctx.lineTo(x + k * s * 0.22 - s, y + s * 2);
    ctx.stroke();
  }
  ctx.restore();
  scoops.forEach((col, i) => {
    const sy = y - s * 0.3 - i * s * 0.55;
    circle(ctx, x, sy, s * 0.48);
    fillInk(ctx, col, lw);
    ctx.fillStyle = ['#ff4fa0', '#5cb8ff', '#ffd23f'][i % 3];
    for (let k = 0; k < 3; k++) {
      ctx.save();
      ctx.translate(x + (k - 1) * s * 0.2, sy - s * 0.15 + (k % 2) * s * 0.12);
      ctx.rotate(k);
      ctx.fillRect(-s * 0.07, -s * 0.025, s * 0.14, s * 0.05);
      ctx.restore();
    }
  });
  circle(ctx, x, y - s * 0.3 - (scoops.length - 1) * s * 0.55 - s * 0.5, s * 0.12);
  fillInk(ctx, C.red, lw * 0.7);
}

function whale(ctx, x, y, s, lw, t) {
  // body rising from below with a happy face, facing right
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(-s * 1.3, s * 0.6);
  ctx.bezierCurveTo(-s * 1.3, -s * 0.5, -s * 0.4, -s * 0.85, s * 0.3, -s * 0.8);
  ctx.bezierCurveTo(s * 1.1, -s * 0.75, s * 1.35, -s * 0.2, s * 1.3, s * 0.6);
  ctx.closePath();
  fillInk(ctx, '#4f8fe0', lw);
  ctx.beginPath();
  ctx.moveTo(-s * 0.2, s * 0.6);
  ctx.bezierCurveTo(-s * 0.1, s * 0.1, s * 1.0, s * 0.0, s * 1.25, s * 0.25);
  ctx.lineTo(s * 1.3, s * 0.6);
  ctx.closePath();
  fillInk(ctx, '#cfe6ff', lw * 0.8);
  // tail
  ctx.save();
  ctx.translate(-s * 1.25, -s * 0.2);
  ctx.rotate(-0.5 + Math.sin(t * 3) * 0.2);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-s * 0.2, -s * 0.5, -s * 0.6, -s * 0.6);
  ctx.quadraticCurveTo(-s * 0.3, -s * 0.2, -s * 0.05, -s * 0.15);
  ctx.quadraticCurveTo(s * 0.1, -s * 0.6, s * 0.45, -s * 0.7);
  ctx.quadraticCurveTo(s * 0.3, -s * 0.2, 0, 0.1);
  fillInk(ctx, '#4f8fe0', lw);
  ctx.restore();
  // eye and smile
  ctx.fillStyle = C.ink;
  circle(ctx, s * 0.6, -s * 0.25, s * 0.1);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  circle(ctx, s * 0.63, -s * 0.28, s * 0.035);
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(s * 0.8, -s * 0.05, s * 0.25, 0.2, 1.4);
  ctx.stroke();
  ctx.fillStyle = '#ff9ac0';
  circle(ctx, s * 0.95, s * 0.02, s * 0.09);
  ctx.fill();
  ctx.restore();
}

// A little generic sock puppet for card pictures: a hand in a sock rising from below, its
// toe the head, the mouth where the fingers meet the thumb. (x, y) is the mouth's middle.
function miniSock(ctx, x, y, s, col, lw, mood = 'happy', t = 0) {
  ctx.save();
  ctx.translate(x, y);
  const dark = shade(col, -0.22);
  // the arm, then the ribbed cuff
  roundRect(ctx, -s * 0.3, s * 0.85, s * 0.6, s * 1.4, s * 0.15);
  fillInk(ctx, C.skin, lw);
  // the body tube from the mouth down to the cuff
  ctx.beginPath();
  ctx.moveTo(-s * 0.44, 0);
  ctx.quadraticCurveTo(-s * 0.42, s * 0.5, -s * 0.38, s * 0.66);
  ctx.lineTo(s * 0.38, s * 0.66);
  ctx.quadraticCurveTo(s * 0.42, s * 0.5, s * 0.44, 0);
  ctx.closePath();
  fillInk(ctx, col, lw);
  roundRect(ctx, -s * 0.42, s * 0.62, s * 0.84, s * 0.3, s * 0.08);
  fillInk(ctx, dark, lw);
  ctx.strokeStyle = shade(col, -0.45);
  ctx.lineWidth = lw * 0.55;
  ctx.beginPath();
  for (let k = -3; k <= 3; k++) {
    ctx.moveTo(k * s * 0.1, s * 0.66);
    ctx.lineTo(k * s * 0.1, s * 0.88);
  }
  ctx.stroke();
  const open = mood === 'open' ? 0.2 : mood === 'laugh' ? 0.1 + Math.abs(Math.sin(t * 9)) * 0.14 : 0;
  if (open > 0) {
    // the mouth: dark felt with a tongue
    ctx.beginPath();
    ctx.moveTo(-s * 0.44, 0);
    ctx.quadraticCurveTo(0, s * 0.2, s * 0.44, 0);
    ctx.lineTo(s * 0.44, -open * s);
    ctx.quadraticCurveTo(0, s * (0.1 - open), -s * 0.44, -open * s);
    ctx.closePath();
    fillInk(ctx, C.mouth, lw);
    ellipse(ctx, 0, s * 0.06, s * 0.2, s * 0.07);
    ctx.fillStyle = C.tongue;
    ctx.fill();
  }
  // the head: the toe of the sock, lifted when the mouth opens
  ctx.save();
  ctx.translate(0, -open * s);
  ctx.beginPath();
  ctx.moveTo(-s * 0.44, 0);
  ctx.bezierCurveTo(-s * 0.5, -s * 0.55, -s * 0.36, -s * 0.9, 0, -s * 0.9);
  ctx.bezierCurveTo(s * 0.36, -s * 0.9, s * 0.5, -s * 0.55, s * 0.44, 0);
  ctx.quadraticCurveTo(0, s * 0.18, -s * 0.44, 0);
  ctx.closePath();
  fillInk(ctx, col, lw);
  // the toe seam
  ctx.beginPath();
  ctx.moveTo(-s * 0.3, -s * 0.68);
  ctx.quadraticCurveTo(0, -s * 0.78, s * 0.3, -s * 0.68);
  stitches(ctx, 'rgba(255,255,255,0.75)', lw * 0.6, s * 0.045);
  // eyes
  for (const ex of [-0.17, 0.17]) {
    if (mood === 'sleep') {
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = lw * 1.1;
      ctx.beginPath();
      ctx.arc(ex * s, -s * 0.42, s * 0.08, 0.25, Math.PI - 0.25);
      ctx.stroke();
    } else {
      circle(ctx, ex * s, -s * 0.44, s * 0.12);
      fillInk(ctx, '#ffffff', lw * 0.8);
      ctx.fillStyle = C.ink;
      const look = mood === 'up' ? -s * 0.05 : s * 0.02;
      circle(ctx, ex * s + s * 0.015, -s * 0.44 + look, s * 0.055);
      ctx.fill();
    }
  }
  // a pom-pom nose
  circle(ctx, 0, -s * 0.22, s * 0.08);
  fillInk(ctx, C.hot, lw * 0.7);
  if (open === 0) {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw * 1.1;
    ctx.beginPath();
    ctx.moveTo(-s * 0.44, 0);
    ctx.quadraticCurveTo(0, s * 0.18, s * 0.44, 0);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

function giftBox(ctx, x, y, s, lw, t) {
  // a mystery present with sparkles bursting out the top
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(255,240,150,0.55)';
  ctx.beginPath();
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 2 + (k - 3) * 0.28 + Math.sin(t * 2) * 0.05;
    ctx.moveTo(0, -s * 0.3);
    ctx.lineTo(Math.cos(a - 0.08) * s * 1.6, -s * 0.3 + Math.sin(a - 0.08) * s * 1.6);
    ctx.lineTo(Math.cos(a + 0.08) * s * 1.6, -s * 0.3 + Math.sin(a + 0.08) * s * 1.6);
  }
  ctx.fill();
  roundRect(ctx, -s * 0.6, -s * 0.3, s * 1.2, s * 0.9, s * 0.08);
  fillInk(ctx, '#8a4fd8', lw);
  ctx.fillStyle = C.gold;
  ctx.fillRect(-s * 0.1, -s * 0.3, s * 0.2, s * 0.9);
  ctx.save();
  ctx.translate(-s * 0.1, -s * 0.36);
  ctx.rotate(-0.35 + Math.sin(t * 3) * 0.05);
  roundRect(ctx, -s * 0.62, -s * 0.18, s * 1.34, s * 0.24, s * 0.06);
  fillInk(ctx, '#a06ae8', lw);
  ctx.restore();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = lw;
  roundRect(ctx, -s * 0.6, -s * 0.3, s * 1.2, s * 0.9, s * 0.08);
  ctx.stroke();
  for (let k = 0; k < 5; k++) {
    const p = loop(t * 0.6 + k / 5);
    sparkle(ctx, Math.sin(k * 2.3) * s * 0.8 * p, -s * 0.4 - p * s * 1.2, s * 0.16 * (1 - p * 0.5), k % 2 ? '#ffffff' : C.sun);
  }
  ctx.restore();
}

// A gust of wind: a long wavy stroke ending in a curl at (x, y).
function gust(ctx, x, y, len, curl, lw) {
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(x - len, y);
    ctx.bezierCurveTo(x - len * 0.6, y - curl * 1.2, x - len * 0.2, y + curl * 1.2, x, y);
    ctx.arc(x, y - curl, curl, Math.PI / 2, -Math.PI * 0.9, true);
  };
  ctx.lineCap = 'round';
  path();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = lw * 2.6;
  ctx.stroke();
  path();
  ctx.strokeStyle = '#e8f8ff';
  ctx.lineWidth = lw * 1.4;
  ctx.stroke();
}

// ---------------------------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------------------------

const EFFECTS = {
  'taco-rain'(ctx, w, h, t, u, lw) {
    for (let k = 0; k < 13; k++) {
      const x = w * (0.04 + R(k, 100) * 0.92);
      const y = h * (loop(R(k, 101) + t * (0.18 + R(k, 102) * 0.1)) * 1.25 - 0.15);
      taco(ctx, x, y, u * (5.5 + R(k, 103) * 3), Math.sin(t * 2 + k) * 0.6, lw * 0.8);
    }
  },
  'lost-hat'(ctx, w, h, t, u, lw) {
    const p = loop(t * 0.22);
    const x = w * (0.75 - p * 0.9);
    const y = h * 0.16 + Math.sin(p * TAU * 2) * h * 0.05;
    speedLines(ctx, x + u * 14, y, u * 12, 3, u * 4, lw * 1.2, 1);
    hat(ctx, x, y, u * 11, Math.sin(t * 5) * 0.4 - p * 1.5, lw);
    // swirl the wind leaves behind
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = lw * 1.5;
    ctx.beginPath();
    ctx.arc(x + u * 22, y + u * 2, u * 3.5, 0.5, TAU - 0.5);
    ctx.stroke();
  },
  'giant-wave'(ctx, w, h, t, u, lw) {
    // a big curling wave on the right, cresting over the top
    const rise = 0.5 + 0.5 * Math.sin(t * 1.2);
    const x0 = w * 0.84 - rise * w * 0.04;
    const top = h * (0.12 + (1 - rise) * 0.08);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(w + 4, h + 4);
    ctx.lineTo(x0 - w * 0.06, h + 4);
    ctx.bezierCurveTo(x0 - w * 0.02, h * 0.6, x0 - w * 0.08, top + h * 0.1, x0 - w * 0.2, top + h * 0.12);
    ctx.bezierCurveTo(x0 - w * 0.18, top - h * 0.02, x0 - w * 0.04, top - h * 0.06, x0 + w * 0.08, top);
    ctx.bezierCurveTo(x0 + w * 0.16, top + h * 0.04, w, top + h * 0.06, w + 4, top + h * 0.1);
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, top, h, ['#4fd6f0', '#1a8fd0']);
    ctx.fill();
    ctx.lineWidth = lw * 1.2;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    // curl hollow
    ctx.beginPath();
    ctx.arc(x0 - w * 0.08, top + h * 0.13, Math.min(w, h) * 0.06, Math.PI * 0.9, Math.PI * 2.2);
    ctx.lineWidth = lw * 1.4;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();
    // foam blobs along the crest
    const foam = [];
    for (let k = 0; k < 6; k++) foam.push([x0 - w * 0.19 + k * w * 0.045, top + h * 0.015 * Math.abs(3 - k) - u, u * (2.4 + (k % 2))]);
    blob(ctx, foam, '#ffffff', lw * 0.8);
    // spray drops
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 6; k++) {
      const p = loop(t * 0.8 + k / 6);
      circle(ctx, x0 - w * 0.2 - p * w * 0.1, top + h * 0.1 - Math.sin(p * Math.PI) * h * 0.08 + p * h * 0.08, u * (1.2 - p * 0.6));
      fillInk(ctx, '#ffffff', lw * 0.5);
    }
    // a shallow wash along the floor
    scrollingWaves(ctx, w, h * 0.93, u * 1.2, u * 12, t * 0.4, 'rgba(60,190,230,0.85)', lw, h + 4);
  },
  hiccups(ctx, w, h, t, u, lw) {
    // bubbles pop out of each mouth with a little burst
    for (const [cx, ph] of [[0.28, 0], [0.72, 0.5]]) {
      for (let k = 0; k < 3; k++) {
        const p = loop(t * 0.7 + ph + k / 3);
        const out = cx < 0.5 ? -1 : 1;
        const x = w * cx + out * p * w * 0.12 + Math.sin(p * 6 + k) * u * 3;
        const y = h * 0.45 - p * h * 0.38;
        if (p < 0.82) {
          circle(ctx, x, y, u * (3 + p * 5));
          ctx.fillStyle = 'rgba(200,240,255,0.45)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(42,24,56,0.6)';
          ctx.lineWidth = lw * 2;
          ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = lw;
          ctx.stroke();
          shine(ctx, x - u * (1 + p * 1.5), y - u * (1 + p * 1.5), u * (0.6 + p));
        } else {
          const q = (p - 0.82) / 0.18;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = lw * 1.2;
          ctx.beginPath();
          for (let r = 0; r < 8; r++) {
            const a = (r / 8) * TAU;
            ctx.moveTo(x + Math.cos(a) * u * (3 + q * 4), y + Math.sin(a) * u * (3 + q * 4));
            ctx.lineTo(x + Math.cos(a) * u * (5 + q * 5), y + Math.sin(a) * u * (5 + q * 5));
          }
          ctx.stroke();
        }
      }
      // jolt marks beside the head
      if (loop(t * 1.4 + ph) < 0.3) {
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = lw * 1.2;
        ctx.beginPath();
        for (const s of [-1, 1]) {
          ctx.moveTo(w * cx + s * u * 14, h * 0.36);
          ctx.lineTo(w * cx + s * u * 18, h * 0.32);
          ctx.moveTo(w * cx + s * u * 15, h * 0.42);
          ctx.lineTo(w * cx + s * u * 20, h * 0.42);
        }
        ctx.stroke();
      }
    }
  },
  'big-wind'(ctx, w, h, t, u, lw) {
    for (let k = 0; k < 5; k++) {
      const p = loop(t * 0.45 + k / 5);
      gust(ctx, w * (p * 1.6 - 0.3), h * (0.12 + ((k * 0.37) % 1) * 0.6), w * 0.3, u * 3.5, lw);
    }
    for (let k = 0; k < 7; k++) {
      const p = loop(t * 0.45 + R(k, 112));
      const x = w * (p * 1.3 - 0.15);
      const y = h * (0.15 + R(k, 113) * 0.65) + Math.sin(t * 4 + k) * u * 3;
      bigLeaf(ctx, x, y, u * 5, t * 4 + k, lw * 0.7, k % 2 ? C.leaf : C.orange);
    }
  },
  stinky(ctx, w, h, t, u, lw) {
    ctx.strokeStyle = '#7ed04a';
    ctx.lineCap = 'round';
    for (let k = 0; k < 5; k++) {
      const x = w * (0.4 + k * 0.05);
      const p = loop(t * 0.4 + k * 0.2);
      ctx.globalAlpha = Math.sin(p * Math.PI);
      ctx.lineWidth = lw * 2.2;
      ctx.beginPath();
      const y0 = h * 0.8 - p * h * 0.2;
      ctx.moveTo(x, y0);
      for (let s = 1; s <= 6; s++) ctx.lineTo(x + Math.sin(s * 1.6 + t * 3) * u * 2.5, y0 - s * h * 0.05);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // a stinky old sock lying on the floor where it all comes from
    ctx.save();
    ctx.translate(w * 0.5, h * 0.82);
    ctx.rotate(-0.15);
    ctx.beginPath();
    ctx.moveTo(-u * 7, -u * 4);
    ctx.lineTo(u * 2, -u * 4);
    ctx.quadraticCurveTo(u * 9, -u * 4, u * 9, u * 1);
    ctx.quadraticCurveTo(u * 9, u * 4, u * 3, u * 4);
    ctx.lineTo(-u * 7, u * 2);
    ctx.closePath();
    fillInk(ctx, '#c8c0a0', lw);
    ctx.fillStyle = '#9a8f6a';
    circle(ctx, u * 5, 0, u * 1.2);
    ctx.fill();
    ctx.restore();
    // the fly in a figure of eight
    const fx = w * 0.5 + Math.sin(t * 2.2) * w * 0.16;
    const fy = h * 0.4 + Math.sin(t * 4.4) * h * 0.08;
    const f = Math.abs(Math.sin(t * 40));
    for (const s of [-1, 1]) {
      ellipse(ctx, fx + s * u * 1.2, fy - u * 1.6, u * 1.2, u * (0.6 + f * 1.2), s * 0.5);
      ctx.fillStyle = 'rgba(230,250,255,0.85)';
      ctx.fill();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = lw * 0.5;
      ctx.stroke();
    }
    circle(ctx, fx, fy, u * 1.6);
    fillInk(ctx, '#3a3448', lw * 0.6);
    ctx.fillStyle = C.red;
    circle(ctx, fx + u * 0.8, fy - u * 0.5, u * 0.5);
    ctx.fill();
  },
  'sticky-mud'(ctx, w, h, t, u, lw) {
    const y = h * FLOOR;
    ctx.beginPath();
    ctx.moveTo(w * 0.04, y + u * 2);
    for (let k = 0; k <= 10; k++) {
      const x = w * (0.04 + k * 0.092);
      ctx.quadraticCurveTo(x - w * 0.046, y - u * (3 + (k % 3)), x, y - u * 1);
    }
    ctx.quadraticCurveTo(w, y + h * 0.08, w * 0.5, y + h * 0.13);
    ctx.quadraticCurveTo(0, y + h * 0.08, w * 0.04, y + u * 2);
    ctx.closePath();
    fillInk(ctx, '#7a4e2a', lw * 1.2);
    ctx.fillStyle = '#9a6a3c';
    for (let k = 0; k < 6; k++) {
      ellipse(ctx, w * (0.12 + k * 0.15), y + h * 0.05, u * 4, u * 1);
      ctx.fill();
    }
    for (let k = 0; k < 5; k++) {
      const p = loop(t * 0.5 + k / 5);
      const x = w * (0.15 + R(k, 120) * 0.7);
      circle(ctx, x, y + h * 0.04 - p * u * 3, u * (0.8 + p * 1.6));
      ctx.strokeStyle = '#4a2e18';
      ctx.lineWidth = lw * 0.8;
      ctx.globalAlpha = 1 - p * 0.6;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // splats
    for (const [x, s] of [[0.2, 1], [0.8, -1]]) {
      const yy = y - u * 4 - Math.abs(Math.sin(t * 2 + x * 9)) * u * 3;
      circle(ctx, w * x + s * u * 6, yy, u * 1.2);
      fillInk(ctx, '#7a4e2a', lw * 0.6);
    }
  },
  'lights-out'(ctx, w, h, t, u, lw) {
    const cx = w * 0.5 + Math.sin(t * 0.8) * w * 0.22;
    const cy = h * 0.5 + Math.sin(t * 1.3) * h * 0.05;
    const R0 = Math.min(w, h) * 0.18;
    const R1 = Math.max(w, h) * 0.7;
    const g = ctx.createRadialGradient(cx, cy, R0 * 0.6, cx, cy, R1);
    g.addColorStop(0, 'rgba(255,240,170,0.15)');
    g.addColorStop(0.18, 'rgba(15,8,40,0.55)');
    g.addColorStop(0.5, 'rgba(10,5,30,0.82)');
    g.addColorStop(1, 'rgba(8,4,24,0.9)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // pairs of eyes blinking in the dark corners
    for (const [x, y, ph] of [[0.08, 0.2, 0], [0.92, 0.25, 1.7], [0.1, 0.92, 3.1]]) {
      if (Math.sin(t * 1.5 + ph) > -0.7) {
        ctx.fillStyle = '#fff27a';
        for (const s of [-1, 1]) {
          ellipse(ctx, w * x + s * u * 1.6, h * y, u * 1, u * 1.3);
          ctx.fill();
        }
      }
    }
  },
  bouncy(ctx, w, h, t, u, lw) {
    const y = h * FLOOR;
    // the floor wobbles like a trampoline
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw * 1.4;
    ctx.beginPath();
    for (let x = 0; x <= w; x += u * 3) {
      const yy = y + Math.sin(x / (u * 10) + t * 8) * u * 1.4;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
    // springs poking up out of the floor
    for (const x of [0.5, 0.07, 0.93]) {
      const sq = 1 + Math.sin(t * 8 + x * 6) * 0.35;
      const coil = () => {
        ctx.beginPath();
        for (let k = 0; k <= 10; k++) ctx.lineTo(w * x + (k % 2 ? u * 4 : -u * 4), y - k * u * 1.4 * sq);
      };
      coil();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = lw * 3;
      ctx.stroke();
      coil();
      ctx.strokeStyle = '#c8c8dc';
      ctx.lineWidth = lw * 1.4;
      ctx.stroke();
      roundRect(ctx, w * x - u * 5, y - u * 14 * sq - u * 2, u * 10, u * 3, u * 1.5);
      fillInk(ctx, C.hot, lw);
    }
    // bounce marks beside both characters
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw * 1.4;
    ctx.lineCap = 'round';
    for (const cx of [0.28, 0.72]) {
      const p = Math.abs(Math.sin(t * 4 + cx * 5));
      for (const sd of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
          const x = w * cx + sd * (u * 15 + k * u * 3);
          const yy = h * 0.5 + (k - 1) * u * 5 + p * u * 3;
          ctx.beginPath();
          ctx.arc(x - sd * u * 6, yy, u * 6, sd > 0 ? -0.35 : Math.PI - 0.35, sd > 0 ? 0.35 : Math.PI + 0.35);
          ctx.stroke();
        }
      }
    }
  },
  runaway(ctx, w, h, t, u, lw, o) {
    const p = loop(t * 0.3);
    const size = u * 22;
    const x = w * (0.42 + p * 0.7);
    const hop = Math.abs(Math.sin(p * Math.PI * 6)) * u * 6;
    const y = h * FLOOR - size * 0.5 - hop;
    for (let k = 1; k <= 3; k++) puff(ctx, x - size * 0.4 - k * u * 5, h * FLOOR - u * 2, u * (3.5 - k * 0.7), lw);
    speedLines(ctx, x - size * 0.7, y, u * 10, 3, u * 3.5, lw, -1);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 10) * 0.12);
    // little running legs
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw * 2;
    ctx.beginPath();
    const leg = Math.sin(t * 16) * u * 3;
    ctx.moveTo(-size * 0.15, size * 0.3);
    ctx.lineTo(-size * 0.15 + leg, size * 0.52);
    ctx.moveTo(size * 0.15, size * 0.3);
    ctx.lineTo(size * 0.15 - leg, size * 0.52);
    ctx.stroke();
    ellipse(ctx, -size * 0.15 + leg + u, size * 0.54, u * 2, u * 1.1);
    fillInk(ctx, C.red, lw * 0.6);
    ellipse(ctx, size * 0.15 - leg + u, size * 0.54, u * 2, u * 1.1);
    fillInk(ctx, C.red, lw * 0.6);
    if (o.drawThing) o.drawThing(ctx, size);
    else giftBox(ctx, 0, size * 0.1, size * 0.45, lw, t);
    ctx.restore();
  },
  notes(ctx, w, h, t, u, lw) {
    const cols = [C.hot, '#5cb8ff', C.sun, '#8fd14f', '#8a4fd8'];
    for (let k = 0; k < 8; k++) {
      const src = k % 2 ? 0.72 : 0.28;
      const p = loop(t * 0.35 + k / 8);
      const x = w * src + Math.sin(p * 8 + k) * u * 6 + (src < 0.5 ? 1 : -1) * p * w * 0.1;
      const y = h * 0.55 - p * h * 0.5;
      ctx.globalAlpha = Math.min(1, (1 - p) * 3);
      note(ctx, x, y, u * 4.4, cols[k % 5], lw * 0.8, k % 3 === 0);
    }
    ctx.globalAlpha = 1;
  },
  dance(ctx, w, h, t, u, lw) {
    // coloured spots on the floor and swoosh marks beside the dancers
    const cols = ['rgba(255,79,160,0.5)', 'rgba(92,184,255,0.5)', 'rgba(255,210,63,0.55)'];
    for (let k = 0; k < 3; k++) {
      const x = w * (0.5 + Math.sin(t * 1.5 + k * 2.1) * 0.35);
      ellipse(ctx, x, h * (FLOOR + 0.06), w * 0.1, h * 0.03);
      ctx.fillStyle = cols[k];
      ctx.fill();
    }
    // swooshes on the outside of each dancer, swapping sides with the beat
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw * 1.4;
    ctx.lineCap = 'round';
    const sd = Math.sin(t * 6) > 0 ? 1 : -1;
    for (const cx of [0.28, 0.72]) {
      for (let k = 0; k < 3; k++) {
        const r = Math.min(w, h) * (0.16 + k * 0.035);
        const a0 = sd > 0 ? -0.5 : Math.PI - 0.5;
        ctx.beginPath();
        ctx.arc(w * cx, h * 0.5, r, a0 + k * 0.08, a0 + 1 - k * 0.08);
        ctx.stroke();
      }
    }
    for (let k = 0; k < 8; k++) {
      const a = 0.5 + 0.5 * Math.sin(t * 5 + k * 1.3);
      sparkle(ctx, w * R(k, 130), h * (0.08 + R(k, 131) * 0.5), u * 4 * a, k % 2 ? '#ffffff' : C.sun);
    }
  },
  sparkles(ctx, w, h, t, u, lw, o) {
    if (o.drawThing) {
      const x = w * 0.5;
      const y = h * 0.28 + Math.sin(t * 2) * u * 2;
      const g = ctx.createRadialGradient(x, y, 0, x, y, u * 20);
      g.addColorStop(0, 'rgba(255,250,190,0.95)');
      g.addColorStop(1, 'rgba(255,250,190,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - u * 20, y - u * 20, u * 40, u * 40);
      ctx.save();
      ctx.translate(x, y);
      o.drawThing(ctx, u * 18);
      ctx.restore();
    }
    for (let k = 0; k < 14; k++) {
      const a = Math.max(0, Math.sin(t * 3 + k * 1.1));
      const ang = (k / 14) * TAU + t * 0.4;
      const r = Math.min(w, h) * (0.18 + R(k, 140) * 0.2);
      sparkle(ctx, w * 0.5 + Math.cos(ang) * r * 1.3, h * 0.32 + Math.sin(ang) * r * 0.8, u * 4 * a, k % 3 ? C.sun : '#ffffff');
    }
  },
  hearts(ctx, w, h, t, u, lw) {
    const beat = 1 + Math.max(0, Math.sin(t * 6)) * 0.15;
    heart(ctx, w * 0.5, h * 0.22, u * 9 * beat);
    fillInk(ctx, C.hot, lw);
    shine(ctx, w * 0.5 - u * 3, h * 0.22, u * 1.6);
    const cols = [C.hot, '#ff8fc8', C.red];
    for (let k = 0; k < 9; k++) {
      const p = loop(t * 0.3 + k / 9);
      const x = w * (0.5 + (R(k, 150) - 0.5) * 0.5) + Math.sin(p * 6 + k) * u * 3;
      const y = h * 0.7 - p * h * 0.6;
      ctx.globalAlpha = Math.min(1, (1 - p) * 3);
      heart(ctx, x, y, u * (2.6 + R(k, 151) * 2.2));
      fillInk(ctx, cols[k % 3], lw * 0.7);
    }
    ctx.globalAlpha = 1;
  },
  tickle(ctx, w, h, t, u, lw) {
    feather(ctx, w * 0.42, h * 0.55, u * 10, -0.6 + Math.sin(t * 9) * 0.35, '#ff8fc8', lw);
    feather(ctx, w * 0.58, h * 0.55, u * 10, 0.6 + Math.sin(t * 9 + 1) * 0.35, '#5cb8ff', lw);
    // giggle squiggles
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw * 1.1;
    ctx.lineCap = 'round';
    for (const cx of [0.28, 0.72]) {
      for (let k = 0; k < 2; k++) {
        const p = loop(t * 0.8 + k * 0.5 + cx);
        const x = w * cx + (k ? 1 : -1) * u * 14;
        const y = h * 0.4 - p * h * 0.12;
        ctx.globalAlpha = 1 - p;
        ctx.lineWidth = lw * 1.6;
        ctx.beginPath();
        for (let s = 0; s <= 6; s++) ctx.lineTo(x - u * 4 + s * u * 1.8, y + (s % 2 ? -u * 1.8 : u * 1.8));
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  },
  magic(ctx, w, h, t, u, lw) {
    // a wand drawing a swirl of stars
    const wx = w * 0.5 + Math.sin(t * 2) * u * 6;
    const wy = h * 0.22;
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(-0.6 + Math.sin(t * 2) * 0.3);
    roundRect(ctx, -u * 1.5, 0, u * 3, u * 22, u * 1.5);
    fillInk(ctx, C.ink, lw * 0.5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-u * 1.5, u * 17, u * 3, u * 5);
    star(ctx, 0, 0, u * 6.5);
    fillInk(ctx, C.sun, lw);
    ctx.restore();
    for (let k = 0; k < 16; k++) {
      const p = loop(t * 0.5 + k / 16);
      const ang = p * TAU * 1.5;
      const r = p * Math.min(w, h) * 0.3;
      const x = wx + Math.cos(ang) * r * 1.4;
      const y = wy + u * 4 + Math.sin(ang) * r * 0.8 + p * h * 0.15;
      ctx.globalAlpha = 1 - p;
      star(ctx, x, y, u * (1.8 + (1 - p) * 2.4), 5, 0.5, t + k);
      fillInk(ctx, ['#ffd23f', '#ff8fc8', '#8fe0ff', '#c9a0ff'][k % 4], lw * 0.5);
    }
    ctx.globalAlpha = 1;
  },
  whale(ctx, w, h, t, u, lw) {
    const s = Math.min(w * 0.17, h * 0.2);
    const rise = Math.sin(t * 1.2) * u * 2;
    const x = w * 0.5;
    const y = h + s * 0.05 + rise;
    // spout between the characters
    const sp = 0.8 + Math.sin(t * 5) * 0.08;
    ctx.fillStyle = '#bff0ff';
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x - u * 2, y - s * 0.8);
    ctx.quadraticCurveTo(x - u * 3, y - s * 1.4, x - u, h * 0.32 * (2 - sp));
    ctx.lineTo(x + u, h * 0.32 * (2 - sp));
    ctx.quadraticCurveTo(x + u * 3, y - s * 1.4, x + u * 2, y - s * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    const top = h * 0.32 * (2 - sp);
    blob(ctx, [[x - u * 6, top + u * 2, u * 3.5], [x, top - u * 1, u * 4.5], [x + u * 6, top + u * 2, u * 3.5]], '#bff0ff', lw);
    for (let k = 0; k < 6; k++) {
      const p = loop(t * 0.9 + k / 6);
      const dx = (k % 2 ? 1 : -1) * (u * 6 + p * u * 14);
      circle(ctx, x + dx, top + p * h * 0.25, u * 1.2);
      fillInk(ctx, '#bff0ff', lw * 0.5);
    }
    whale(ctx, x, y, s, lw, t);
    scrollingWaves(ctx, w, h * 0.95, u * 1.4, u * 12, t * 0.3, 'rgba(60,180,230,0.9)', lw, h + 4);
  },
  machine(ctx, w, h, t, u, lw) {
    // a whirly contraption standing between the characters
    const x = w * 0.5;
    const base = h * FLOOR;
    const s = Math.min(w * 0.13, h * 0.16);
    const bob = Math.abs(Math.sin(t * 6)) * s * 0.1;
    // spring
    ctx.strokeStyle = '#5b5570';
    ctx.lineWidth = lw * 1.6;
    ctx.beginPath();
    for (let k = 0; k <= 8; k++) ctx.lineTo(x + (k % 2 ? s * 0.25 : -s * 0.25), base - k * (s * 0.4 - bob) / 8);
    ctx.stroke();
    const by = base - s * 0.4 + bob;
    roundRect(ctx, x - s * 0.6, by - s * 0.95, s * 1.2, s * 0.95, s * 0.12);
    fillInk(ctx, '#ff8a3d', lw);
    // dial and buttons
    circle(ctx, x - s * 0.2, by - s * 0.55, s * 0.2);
    fillInk(ctx, '#ffffff', lw * 0.8);
    ctx.strokeStyle = C.red;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.2, by - s * 0.55);
    ctx.lineTo(x - s * 0.2 + Math.cos(t * 4) * s * 0.15, by - s * 0.55 + Math.sin(t * 4) * s * 0.15);
    ctx.stroke();
    for (let k = 0; k < 3; k++) {
      circle(ctx, x + s * 0.3, by - s * 0.75 + k * s * 0.22, s * 0.07);
      fillInk(ctx, Math.sin(t * 6 + k * 2) > 0 ? ['#8fd14f', C.sun, C.hot][k] : '#605870', lw * 0.6);
    }
    gear(ctx, x - s * 0.55, by - s * 1.05, s * 0.32, t * 2, '#ffd23f', lw);
    gear(ctx, x + s * 0.1, by - s * 1.2, s * 0.24, -t * 2.7, '#5cb8ff', lw);
    // funnel with puffs
    ctx.beginPath();
    ctx.moveTo(x + s * 0.35, by - s * 0.95);
    ctx.lineTo(x + s * 0.45, by - s * 1.35);
    ctx.lineTo(x + s * 0.7, by - s * 1.5);
    ctx.lineTo(x + s * 0.7, by - s * 1.3);
    ctx.lineTo(x + s * 0.55, by - s * 0.95);
    ctx.closePath();
    fillInk(ctx, '#9aa3ad', lw);
    for (let k = 0; k < 3; k++) {
      const p = loop(t * 0.7 + k / 3);
      puff(ctx, x + s * 0.75 + p * s * 0.5, by - s * 1.6 - p * s * 0.9, s * 0.3 * Math.sin(p * Math.PI) + s * 0.02, lw, '#ffffff');
    }
    // a flag waving on a stick
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.15, by - s * 0.95);
    ctx.lineTo(x - s * 0.15, by - s * 1.75);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - s * 0.15, by - s * 1.75);
    ctx.quadraticCurveTo(x - s * 0.4, by - s * 1.7 + Math.sin(t * 8) * s * 0.06, x - s * 0.6, by - s * 1.65);
    ctx.lineTo(x - s * 0.15, by - s * 1.5);
    ctx.closePath();
    fillInk(ctx, C.hot, lw * 0.7);
  },
  wind(ctx, w, h, t, u, lw) {
    for (let k = 0; k < 7; k++) {
      const p = loop(t * 0.6 + k / 7);
      gust(ctx, w * (p * 1.6 - 0.4), h * (0.15 + k * 0.1), w * 0.25, u * 2.5, lw);
    }
  },
  bubble(ctx, w, h, t, u, lw) {
    const p = loop(t * 0.12);
    const r = Math.min(w, h) * (0.12 + p * 0.06);
    const x = w * 0.5 + Math.sin(t * 1.3) * w * 0.05;
    const y = h * (0.62 - p * 0.42);
    circle(ctx, x, y, r);
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.15)');
    g.addColorStop(0.7, 'rgba(180,230,255,0.25)');
    g.addColorStop(0.9, 'rgba(255,170,230,0.5)');
    g.addColorStop(1, 'rgba(140,220,255,0.75)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = lw;
    ctx.strokeStyle = 'rgba(42,24,56,0.5)';
    ctx.stroke();
    shine(ctx, x - r * 0.4, y - r * 0.45, r * 0.22, 0.85);
    circle(ctx, x + r * 0.45, y + r * 0.35, r * 0.07);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fill();
    // little bubbles around
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = lw * 0.8;
    for (let k = 0; k < 6; k++) {
      const q = loop(t * 0.3 + k / 6);
      circle(ctx, w * (0.3 + R(k, 160) * 0.4), h * (0.7 - q * 0.6), u * (0.8 + R(k, 161) * 1.2));
      ctx.stroke();
    }
  },
  confetti(ctx, w, h, t, u, lw) {
    const cols = [C.hot, '#5cb8ff', C.sun, '#8fd14f', '#8a4fd8', C.orange];
    balloon(ctx, w * 0.07, h * 0.18 + Math.sin(t * 1.3) * u * 2, u * 6, C.hot, lw, t);
    balloon(ctx, w * 0.93, h * 0.14 + Math.sin(t * 1.1 + 1) * u * 2, u * 6, '#5cb8ff', lw, t + 1);
    balloon(ctx, w * 0.86, h * 0.26 + Math.sin(t * 1.4 + 2) * u * 2, u * 5, C.sun, lw, t + 2);
    for (let k = 0; k < 36; k++) {
      const x = w * R(k, 170) + Math.sin(t * 2 + k) * u * 2;
      const y = h * (loop(R(k, 171) + t * (0.12 + R(k, 172) * 0.08)) * 1.1 - 0.05);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 3 + k);
      ctx.scale(1, Math.cos(t * 5 + k));
      ctx.fillStyle = cols[k % cols.length];
      ctx.fillRect(-u * 1.5, -u * 0.9, u * 3, u * 1.8);
      ctx.restore();
    }
  },
  zzz(ctx, w, h, t, u, lw) {
    ctx.fillStyle = 'rgba(30,20,90,0.42)';
    ctx.fillRect(0, 0, w, h);
    // moon and stars
    const mx = w * 0.86;
    const my = h * 0.13;
    circle(ctx, mx, my, u * 7);
    fillInk(ctx, '#fff2a8', lw);
    circle(ctx, mx + u * 3.5, my - u * 2, u * 6);
    ctx.fillStyle = '#4a3a8a';
    ctx.fill();
    for (let k = 0; k < 7; k++) {
      const a = 0.5 + 0.5 * Math.sin(t * 2 + k * 1.3);
      star(ctx, w * (0.05 + R(k, 180) * 0.7), h * (0.05 + R(k, 181) * 0.2), u * 1.4 * (0.6 + a * 0.4), 5, 0.45);
      ctx.fillStyle = '#fff6b0';
      ctx.fill();
    }
    for (const cx of [0.28, 0.72]) {
      for (let k = 0; k < 3; k++) {
        const p = loop(t * 0.3 + k / 3 + cx);
        zShape(ctx, w * cx + u * 8 + p * u * 10 + Math.sin(p * 6) * u * 2, h * 0.38 - p * h * 0.25, u * (1.2 + p * 1.6), lw, Math.min(1, (1 - p) * 2.5));
      }
    }
  },
  'hot-air-balloon'(ctx, w, h, t, u, lw, o) {
    const layer = o.layer;
    const sway = Math.sin(t * 1.1) * 0.03;
    const bx0 = w * 0.1;
    const bx1 = w * 0.9;
    const top = h * (FLOOR - 0.12);
    const bot = h * (FLOOR + 0.12);
    if (layer !== 'front') {
      // envelope
      const cx = w * 0.5;
      const cy = h * 0.22;
      const rx = Math.min(w * 0.24, h * 0.3);
      const ry = h * 0.2;
      ctx.save();
      ctx.translate(cx, cy + ry);
      ctx.rotate(sway);
      ctx.translate(-cx, -(cy + ry));
      // ropes
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(cx - rx * 0.55, cy + ry * 0.75);
      ctx.lineTo(bx0 + w * 0.04, top);
      ctx.moveTo(cx + rx * 0.55, cy + ry * 0.75);
      ctx.lineTo(bx1 - w * 0.04, top);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - rx * 0.3, cy + ry * 1.05);
      ctx.bezierCurveTo(cx - rx * 1.25, cy + ry * 0.3, cx - rx * 1.05, cy - ry * 1.05, cx, cy - ry * 1.05);
      ctx.bezierCurveTo(cx + rx * 1.05, cy - ry * 1.05, cx + rx * 1.25, cy + ry * 0.3, cx + rx * 0.3, cy + ry * 1.05);
      ctx.closePath();
      ctx.save();
      ctx.clip();
      const cols = [C.hot, C.sun, '#5cb8ff', C.sun, C.hot];
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = cols[k];
        ctx.fillRect(cx - rx * 1.3 + k * rx * 0.52, cy - ry * 1.2, rx * 0.52 + 1, ry * 2.4);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ellipse(ctx, cx - rx * 0.4, cy - ry * 0.4, rx * 0.2, ry * 0.4);
      ctx.fill();
      ctx.restore();
      fillInk(ctx, null, lw * 1.2);
      roundRect(ctx, cx - rx * 0.32, cy + ry * 1.0, rx * 0.64, ry * 0.15, u);
      fillInk(ctx, '#b0773f', lw);
      ctx.restore();
      // back rim of the basket
      roundRect(ctx, bx0, top - u * 3, bx1 - bx0, u * 6, u * 2);
      fillInk(ctx, '#8a5530', lw);
    }
    if (layer !== 'back') {
      roundRect(ctx, bx0, top, bx1 - bx0, bot - top, u * 3);
      fillInk(ctx, '#c98f55', lw * 1.2);
      ctx.save();
      roundRect(ctx, bx0, top, bx1 - bx0, bot - top, u * 3);
      ctx.clip();
      ctx.strokeStyle = '#8a5a30';
      ctx.lineWidth = lw * 0.8;
      for (let y = top + u * 4; y < bot; y += u * 4) {
        ctx.beginPath();
        ctx.moveTo(bx0, y);
        ctx.lineTo(bx1, y);
        ctx.stroke();
      }
      for (let x = bx0, r = 0; x < bx1; x += u * 5, r++) {
        for (let y = top, c = 0; y < bot; y += u * 4, c++) {
          if ((r + c) % 2) continue;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + u * 4);
          ctx.stroke();
        }
      }
      ctx.restore();
      roundRect(ctx, bx0 - u, top - u * 2, bx1 - bx0 + u * 2, u * 4, u * 2);
      fillInk(ctx, '#a06a38', lw);
    }
  },
  'ice-cream'(ctx, w, h, t, u, lw) {
    const s = Math.min(w * 0.08, h * 0.1);
    cone(ctx, w * 0.07, h * 0.62, s, ['#ffd0e0', '#8a5a36', '#fff3dc'], lw);
    cone(ctx, w * 0.93, h * 0.62, s, ['#bff0c0', '#ff9ac0'], lw);
    for (let k = 0; k < 4; k++) {
      const x = w * (0.2 + k * 0.2);
      const y = h * 0.14 + Math.sin(t * 2 + k) * u * 2;
      cone(ctx, x, y, s * 0.45, [['#ff9ac0', '#bff0c0', '#ffe08a', '#c9b0ff'][k]], lw * 0.7);
    }
    const cols = ['#ff4fa0', '#5cb8ff', '#ffd23f', '#8fd14f'];
    for (let k = 0; k < 14; k++) {
      const x = w * R(k, 190);
      const y = h * loop(R(k, 191) + t * 0.15);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(k + t);
      ctx.fillStyle = cols[k % 4];
      roundRect(ctx, -u, -u * 0.35, u * 2, u * 0.7, u * 0.35);
      ctx.fill();
      ctx.restore();
    }
  },
  parade(ctx, w, h, t, u, lw) {
    // bunting along the top
    const cols = [C.hot, C.sun, '#5cb8ff', '#8fd14f', '#8a4fd8'];
    for (const [y0, sag, off] of [[0.02, 0.08, 0], [0.0, 0.14, 0.5]]) {
      const n = 9;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(0, h * y0);
      ctx.quadraticCurveTo(w * 0.5, h * (y0 + sag * 2), w, h * y0);
      ctx.stroke();
      for (let k = 0; k < n; k++) {
        const q = (k + off + 0.5) / (n + 0.5);
        const x = w * q;
        const y = h * y0 + 4 * q * (1 - q) * h * sag;
        const fl = Math.sin(t * 4 + k) * u * 0.8;
        ctx.beginPath();
        ctx.moveTo(x - u * 2.6, y);
        ctx.lineTo(x + u * 2.6, y);
        ctx.lineTo(x + fl, y + u * 5.5);
        ctx.closePath();
        fillInk(ctx, cols[(k + (off ? 2 : 0)) % 5], lw * 0.7);
      }
    }
    // a drum in the middle with drumsticks
    const x = w * 0.5;
    const y = h * FLOOR - u * 6;
    const s = Math.min(w * 0.08, h * 0.09);
    roundRect(ctx, x - s, y - s * 0.8, s * 2, s * 1.3, s * 0.2);
    fillInk(ctx, C.red, lw);
    ctx.strokeStyle = C.sun;
    ctx.lineWidth = lw * 1.2;
    ctx.beginPath();
    for (let k = 0; k <= 4; k++) ctx.lineTo(x - s + k * s * 0.5, y - s * 0.7 + (k % 2) * s * 1.1);
    ctx.stroke();
    ellipse(ctx, x, y - s * 0.8, s, s * 0.28);
    fillInk(ctx, '#fff6e4', lw);
    for (const sd of [-1, 1]) {
      const hit = Math.max(0, Math.sin(t * 10 + (sd > 0 ? Math.PI : 0)));
      ctx.save();
      ctx.translate(x + sd * s * 0.5, y - s * 0.9);
      ctx.rotate(sd * (0.5 + hit * 0.5));
      roundRect(ctx, -u * 0.6, -s * 1.2, u * 1.2, s * 1.1, u * 0.6);
      fillInk(ctx, C.wood, lw * 0.6);
      circle(ctx, 0, -s * 1.2, u * 1.4);
      fillInk(ctx, '#fff6e4', lw * 0.6);
      ctx.restore();
    }
    // flags waving at the sides
    for (const [fx, col] of [[0.06, C.hot], [0.94, '#5cb8ff']]) {
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = lw * 1.2;
      ctx.beginPath();
      ctx.moveTo(w * fx, h * FLOOR);
      ctx.lineTo(w * fx, h * 0.32);
      ctx.stroke();
      const f = Math.sin(t * 5 + fx * 8) * u * 1.5;
      const dir = fx < 0.5 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(w * fx, h * 0.32);
      ctx.quadraticCurveTo(w * fx + dir * u * 6, h * 0.32 + f, w * fx + dir * u * 12, h * 0.33);
      ctx.lineTo(w * fx + dir * u * 12, h * 0.42 + f * 0.5);
      ctx.quadraticCurveTo(w * fx + dir * u * 6, h * 0.41 - f, w * fx, h * 0.42);
      ctx.closePath();
      fillInk(ctx, col, lw);
      star(ctx, w * fx + dir * u * 6, h * 0.37, u * 2.2);
      fillInk(ctx, C.sun, lw * 0.5);
    }
  },
  fireworks(ctx, w, h, t, u, lw) {
    ctx.fillStyle = 'rgba(20,10,60,0.45)';
    ctx.fillRect(0, 0, w, h);
    const cols = [C.hot, C.sun, '#5cb8ff', '#8fd14f', '#ff8a3d', '#c9a0ff'];
    for (let k = 0; k < 4; k++) {
      const p = loop(t * 0.45 + k / 4);
      const cycle = Math.floor(t * 0.45 + k / 4);
      const x = w * (0.15 + R(k, cycle + 200) * 0.7);
      const y = h * (0.1 + R(k, cycle + 300) * 0.22);
      const col = cols[(k + cycle) % cols.length];
      if (p < 0.3) {
        const q = p / 0.3;
        ctx.strokeStyle = '#fff6b0';
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(x, h * FLOOR - (h * FLOOR - y) * q + u * 4);
        ctx.lineTo(x, h * FLOOR - (h * FLOOR - y) * q);
        ctx.stroke();
      } else {
        const q = (p - 0.3) / 0.7;
        const r = Math.min(w, h) * 0.2 * Math.sqrt(q);
        ctx.globalAlpha = 1 - q * q;
        ctx.strokeStyle = col;
        ctx.lineWidth = lw * 1.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let s = 0; s < 12; s++) {
          const a = (s / 12) * TAU;
          ctx.moveTo(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55 + q * u * 3);
          ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r + q * u * 4);
        }
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        for (let s = 0; s < 12; s += 2) {
          const a = (s / 12) * TAU + 0.2;
          circle(ctx, x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 1.1 + q * u * 5, u * 0.6);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
  },
  campfire(ctx, w, h, t, u, lw) {
    ctx.fillStyle = 'rgba(25,15,70,0.45)';
    ctx.fillRect(0, 0, w, h);
    for (let k = 0; k < 9; k++) {
      const a = 0.5 + 0.5 * Math.sin(t * 2 + k * 1.7);
      star(ctx, w * R(k, 210), h * R(k, 211) * 0.25, u * 1.3 * (0.6 + 0.4 * a), 5, 0.45);
      ctx.fillStyle = '#fff6b0';
      ctx.fill();
    }
    const x = w * 0.5;
    const y = h * FLOOR + u * 2;
    const g = ctx.createRadialGradient(x, y - u * 6, u * 2, x, y - u * 6, Math.min(w, h) * 0.45);
    g.addColorStop(0, 'rgba(255,200,90,0.55)');
    g.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const s = Math.min(w * 0.08, h * 0.1);
    // logs
    for (const a of [-0.25, 0.25]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      roundRect(ctx, -s * 1.1, -s * 0.18, s * 2.2, s * 0.36, s * 0.18);
      fillInk(ctx, '#8a5530', lw);
      circle(ctx, a < 0 ? -s * 1.0 : s * 1.0, 0, s * 0.15);
      fillInk(ctx, '#e8c090', lw * 0.6);
      ctx.restore();
    }
    // flames
    const fl = (sc, col, ph) => {
      const f = 1 + Math.sin(t * 11 + ph) * 0.1;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.7 * sc, y - s * 0.1);
      ctx.quadraticCurveTo(x - s * 0.9 * sc, y - s * 0.9 * sc * f, x - s * 0.25 * sc + Math.sin(t * 7) * s * 0.1, y - s * 1.6 * sc * f);
      ctx.quadraticCurveTo(x - s * 0.05 * sc, y - s * 1.0 * sc, x + s * 0.2 * sc, y - s * 1.9 * sc * f);
      ctx.quadraticCurveTo(x + s * 0.95 * sc, y - s * 0.9 * sc, x + s * 0.7 * sc, y - s * 0.1);
      ctx.closePath();
      fillInk(ctx, col, sc > 0.8 ? lw : 0);
    };
    fl(1, '#ff6a2a', 0);
    fl(0.7, '#ffb02a', 1);
    fl(0.4, '#fff07a', 2);
    for (let k = 0; k < 5; k++) {
      const p = loop(t * 0.6 + k / 5);
      circle(ctx, x + Math.sin(p * 9 + k) * s * 0.6, y - s * 1.5 - p * h * 0.25, u * 0.6);
      ctx.fillStyle = `rgba(255,${180 + k * 10},80,${1 - p})`;
      ctx.fill();
    }
  },
  boat(ctx, w, h, t, u, lw, o) {
    const layer = o.layer;
    const bob = Math.sin(t * 1.5) * u * 0.6;
    const top = h * (FLOOR - 0.1) + bob;
    const bot = h * (FLOOR + 0.13) + bob;
    const x0 = w * 0.06;
    const x1 = w * 0.94;
    if (layer !== 'front') {
      // mast and sail between the characters
      const mx = w * 0.5;
      ctx.fillStyle = C.wood;
      roundRect(ctx, mx - u * 1.2, h * 0.05 + bob, u * 2.4, top - h * 0.05, u);
      fillInk(ctx, C.wood, lw);
      const fl = Math.sin(t * 2) * u;
      ctx.beginPath();
      ctx.moveTo(mx + u * 1.5, h * 0.08 + bob);
      ctx.quadraticCurveTo(mx + w * 0.12 + fl, h * 0.3, mx + u * 1.5, top - h * 0.12);
      ctx.closePath();
      fillInk(ctx, '#ffffff', lw);
      ctx.beginPath();
      ctx.moveTo(mx - u * 1.5, h * 0.14 + bob);
      ctx.quadraticCurveTo(mx - w * 0.09 + fl, h * 0.32, mx - u * 1.5, top - h * 0.12);
      ctx.closePath();
      fillInk(ctx, C.hot, lw);
      ctx.beginPath();
      ctx.moveTo(mx, h * 0.05 + bob);
      ctx.lineTo(mx + u * 7, h * 0.07 + bob + fl * 0.5);
      ctx.lineTo(mx, h * 0.09 + bob);
      ctx.closePath();
      fillInk(ctx, C.sun, lw * 0.7);
      // back edge of the deck
      roundRect(ctx, x0 + u * 2, top - u * 3, x1 - x0 - u * 4, u * 5, u * 2);
      fillInk(ctx, '#8a5530', lw);
    }
    if (layer !== 'back') {
      ctx.beginPath();
      ctx.moveTo(x0 - u * 2, top);
      ctx.lineTo(x1 + u * 2, top);
      ctx.quadraticCurveTo(x1, bot, x1 - w * 0.12, bot);
      ctx.lineTo(x0 + w * 0.12, bot);
      ctx.quadraticCurveTo(x0, bot, x0 - u * 2, top);
      ctx.closePath();
      fillInk(ctx, '#ff8a3d', lw * 1.2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x0 + u * 2, top + (bot - top) * 0.3, x1 - x0 - u * 4, (bot - top) * 0.14);
      for (let k = 0; k < 4; k++) {
        circle(ctx, w * (0.2 + k * 0.2), top + (bot - top) * 0.65, u * 2.2);
        fillInk(ctx, '#8fdcff', lw * 0.8);
      }
      roundRect(ctx, x0 - u * 3, top - u * 2, x1 - x0 + u * 6, u * 4, u * 2);
      fillInk(ctx, '#ffd23f', lw);
      scrollingWaves(ctx, w, h * 0.95, u * 1.4, u * 12, t * 0.3, 'rgba(40,150,210,0.95)', lw, h + 4);
    }
  },
  disco(ctx, w, h, t, u, lw) {
    ctx.fillStyle = 'rgba(30,10,60,0.35)';
    ctx.fillRect(0, 0, w, h);
    const x = w * 0.5;
    const r = Math.min(w, h) * 0.07;
    const y = r * 1.4;
    const cols = ['rgba(255,79,160,0.22)', 'rgba(92,184,255,0.22)', 'rgba(255,210,63,0.22)', 'rgba(143,209,79,0.22)'];
    for (let k = 0; k < 6; k++) {
      const a = Math.PI / 2 + Math.sin(t * 0.9 + k * 1.1) * 0.9;
      const len = h * 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a - 0.09) * len, y + Math.sin(a - 0.09) * len);
      ctx.lineTo(x + Math.cos(a + 0.09) * len, y + Math.sin(a + 0.09) * len);
      ctx.closePath();
      ctx.fillStyle = cols[k % 4];
      ctx.fill();
    }
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, y - r);
    ctx.stroke();
    circle(ctx, x, y, r);
    fillInk(ctx, '#c8d0e0', lw);
    ctx.save();
    circle(ctx, x, y, r);
    ctx.clip();
    const sq = r / 3;
    for (let i = -3; i < 3; i++) {
      for (let j = -3; j < 3; j++) {
        const lit = Math.sin(t * 6 + i * 1.7 + j * 2.3) > 0.4;
        ctx.fillStyle = lit ? '#ffffff' : (i + j) % 2 ? '#9aa3c0' : '#b8c0d8';
        ctx.fillRect(x + i * sq + ((t * 8) % sq), y + j * sq, sq - 1, sq - 1);
      }
    }
    ctx.restore();
    circle(ctx, x, y, r);
    fillInk(ctx, null, lw);
    for (let k = 0; k < 8; k++) {
      const a = Math.max(0, Math.sin(t * 4 + k * 1.9));
      sparkle(ctx, w * R(k, 220), h * (0.1 + R(k, 221) * 0.6), u * 2.2 * a, '#ffffff');
    }
    // glowing floor tiles
    const ty = h * FLOOR + u * 2;
    const n = 8;
    for (let k = 0; k < n; k++) {
      const on = Math.sin(t * 4 + k * 2.1) > 0;
      ctx.fillStyle = on ? ['rgba(255,79,160,0.5)', 'rgba(92,184,255,0.5)', 'rgba(255,210,63,0.5)'][k % 3] : 'rgba(255,255,255,0.08)';
      ctx.fillRect((w / n) * k + 1, ty, w / n - 2, h - ty);
    }
  },
  picnic(ctx, w, h, t, u, lw) {
    const y = h * FLOOR - u * 2;
    const x0 = w * 0.04;
    const x1 = w * 0.96;
    ctx.beginPath();
    ctx.moveTo(x0 + w * 0.06, y);
    ctx.lineTo(x1 - w * 0.06, y);
    ctx.lineTo(x1, h + 2);
    ctx.lineTo(x0, h + 2);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(232,56,79,0.85)';
    const sq = u * 5;
    for (let r = 0; r * sq < h - y + sq; r++) {
      for (let c = 0; c * sq < w; c++) {
        if ((r + c) % 2) continue;
        ctx.fillRect(c * sq, y + r * sq, sq, sq);
      }
    }
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(x0 + w * 0.06, y);
    ctx.lineTo(x1 - w * 0.06, y);
    ctx.lineTo(x1, h + 2);
    ctx.lineTo(x0, h + 2);
    ctx.closePath();
    fillInk(ctx, null, lw);
    // basket in the middle
    const bx = w * 0.5;
    const by = y + u * 4;
    const s = Math.min(w * 0.07, h * 0.08);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw * 1.6;
    ctx.beginPath();
    ctx.arc(bx, by - s * 0.4, s * 0.7, Math.PI, 0);
    ctx.stroke();
    ctx.strokeStyle = '#c98f55';
    ctx.lineWidth = lw * 0.8;
    ctx.stroke();
    roundRect(ctx, bx - s, by - s * 0.4, s * 2, s * 1.1, s * 0.2);
    fillInk(ctx, '#d8a060', lw);
    ctx.strokeStyle = '#9a6a38';
    ctx.lineWidth = lw * 0.7;
    for (let k = 1; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(bx - s, by - s * 0.4 + k * s * 0.36);
      ctx.lineTo(bx + s, by - s * 0.4 + k * s * 0.36);
      ctx.stroke();
    }
    // sandwich and watermelon
    ctx.beginPath();
    ctx.moveTo(w * 0.38 - s * 0.6, by + s * 0.6);
    ctx.lineTo(w * 0.38 + s * 0.6, by + s * 0.6);
    ctx.lineTo(w * 0.38, by - s * 0.2);
    ctx.closePath();
    fillInk(ctx, '#f6d892', lw);
    ctx.fillStyle = C.leaf;
    ctx.fillRect(w * 0.38 - s * 0.45, by + s * 0.42, s * 0.9, s * 0.08);
    ctx.beginPath();
    ctx.arc(w * 0.62, by + s * 0.1, s * 0.6, 0, Math.PI);
    ctx.closePath();
    fillInk(ctx, '#ff5a6a', lw);
    ctx.strokeStyle = '#3cbf55';
    ctx.lineWidth = lw * 1.6;
    ctx.beginPath();
    ctx.arc(w * 0.62, by + s * 0.1, s * 0.6, 0.1, Math.PI - 0.1);
    ctx.stroke();
    ctx.fillStyle = C.ink;
    for (let k = 0; k < 3; k++) {
      ellipse(ctx, w * 0.62 + (k - 1) * s * 0.25, by + s * 0.3, s * 0.04, s * 0.07);
      ctx.fill();
    }
    // a butterfly visiting
    const fx = w * 0.5 + Math.sin(t * 0.8) * w * 0.15;
    const fy = h * 0.3 + Math.sin(t * 2) * h * 0.04;
    const f = Math.abs(Math.sin(t * 12));
    for (const sd of [-1, 1]) {
      ellipse(ctx, fx + sd * u * 2.6 * f, fy, u * 2.8 * f + 0.5, u * 3.6);
      fillInk(ctx, sd < 0 ? '#ff8fc8' : '#8fe0ff', lw * 0.6);
    }
  },
};

export function drawEffect(ctx, effect, w, h, t, o = {}) {
  const f = EFFECTS[effect];
  if (!f) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  f(ctx, w, h, t, U(w, h), LW(w, h), o);
  ctx.restore();
}

export const EFFECT_IDS = Object.keys(EFFECTS);
export const LAYERED_EFFECTS = ['hot-air-balloon', 'boat'];

// ---------------------------------------------------------------------------------------------
// Story card pictures
// ---------------------------------------------------------------------------------------------

function cardBack(ctx, w, h, stops) {
  ctx.fillStyle = vgrad(ctx, 0, h, stops);
  ctx.fillRect(0, 0, w, h);
}

function cardGround(ctx, w, h, col) {
  const lw = LW(w, h);
  ctx.beginPath();
  ctx.moveTo(-2, h);
  ctx.lineTo(-2, h * FLOOR);
  ctx.quadraticCurveTo(w * 0.5, h * (FLOOR - 0.04), w + 2, h * FLOOR);
  ctx.lineTo(w + 2, h);
  ctx.closePath();
  fillInk(ctx, col, lw);
}

const SOCK_COL = '#5cb8ff';

const CARDS = {
  problem: {
    'taco-rain'(ctx, w, h, t, u, lw) {
      cardBack(ctx, w, h, ['#8fd8ff', '#e0f6ff']);
      cardGround(ctx, w, h, '#8fd14f');
      miniSock(ctx, w * 0.5, h * 0.62, Math.min(w, h) * 0.36, SOCK_COL, lw, 'open', t);
      drawEffect(ctx, 'taco-rain', w, h, t);
    },
    'lost-hat'(ctx, w, h, t, u, lw) {
      cardBack(ctx, w, h, ['#ffe08a', '#fff6d8']);
      cardGround(ctx, w, h, '#8fd14f');
      miniSock(ctx, w * 0.36, h * 0.66, Math.min(w, h) * 0.34, '#8fd14f', lw, 'open', t);
      const p = loop(t * 0.4);
      const x = w * (0.5 + p * 0.35);
      const y = h * (0.32 - Math.sin(p * Math.PI) * 0.12);
      speedLines(ctx, x - u * 10, y, u * 8, 3, u * 4, lw, -1);
      hat(ctx, x, y, u * 12, p * 2, lw);
    },
    'giant-wave'(ctx, w, h, t, u, lw) {
      drawPlaceStatic(ctx, 'beach', w, h);
      miniSock(ctx, w * 0.3, h * 0.72, Math.min(w, h) * 0.32, '#ff6fb1', lw, 'open', t);
      drawEffect(ctx, 'giant-wave', w * 1.3, h, t);
    },
    hiccups(ctx, w, h, t, u, lw) {
      cardBack(ctx, w, h, ['#c9b6ff', '#f0e8ff']);
      const jolt = loop(t * 1.4) < 0.15 ? -u * 4 : 0;
      miniSock(ctx, w * 0.5, h * 0.66 + jolt, Math.min(w, h) * 0.38, '#ff8a3d', lw, 'open', t);
      ctx.save();
      ctx.translate(w * 0.22, 0);
      drawEffect(ctx, 'hiccups', w, h, t);
      ctx.restore();
    },
    'big-wind'(ctx, w, h, t, u, lw) {
      cardBack(ctx, w, h, ['#9adfff', '#e4f7ff']);
      cardGround(ctx, w, h, '#8fd14f');
      ctx.save();
      ctx.translate(w * 0.5, h * 0.66);
      ctx.rotate(0.15 + Math.sin(t * 4) * 0.05);
      miniSock(ctx, 0, 0, Math.min(w, h) * 0.34, '#ffd23f', lw, 'open', t);
      ctx.restore();
      drawEffect(ctx, 'big-wind', w, h, t);
    },
    stinky(ctx, w, h, t, u, lw) {
      cardBack(ctx, w, h, ['#d8f0b0', '#f4ffe0']);
      drawEffect(ctx, 'stinky', w, h, t);
      // a sock pinching its nose shut: shut eyes
      miniSock(ctx, w * 0.2, h * 0.72, Math.min(w, h) * 0.3, '#ff6fb1', lw, 'sleep', t);
    },
    'sticky-mud'(ctx, w, h, t, u, lw) {
      cardBack(ctx, w, h, ['#ffd79a', '#fff0c8']);
      miniSock(ctx, w * 0.5, h * 0.62 + Math.sin(t * 3) * u, Math.min(w, h) * 0.36, '#22b8b0', lw, 'open', t);
      drawEffect(ctx, 'sticky-mud', w, h, t);
    },
    'lights-out'(ctx, w, h, t, u, lw) {
      cardBack(ctx, w, h, ['#3a2a7a', '#6a4aaa']);
      miniSock(ctx, w * 0.5, h * 0.62, Math.min(w, h) * 0.36, '#ffd23f', lw, 'up', t);
      drawEffect(ctx, 'lights-out', w, h, t * 0.5);
    },
    bouncy(ctx, w, h, t, u, lw) {
      cardBack(ctx, w, h, ['#ffb8e0', '#fff0f8']);
      const b = Math.abs(Math.sin(t * 4)) * h * 0.12;
      miniSock(ctx, w * 0.28, h * 0.56 - b, Math.min(w, h) * 0.32, '#8a4fd8', lw, 'open', t);
      drawEffect(ctx, 'bouncy', w, h, t);
    },
    runaway(ctx, w, h, t, u, lw) {
      cardBack(ctx, w, h, ['#9adfff', '#e8f8ff']);
      cardGround(ctx, w, h, '#f6d892');
      miniSock(ctx, w * 0.22, h * 0.66, Math.min(w, h) * 0.3, '#e8384f', lw, 'open', t);
      ctx.save();
      ctx.translate(-w * 0.2, -h * 0.4);
      ctx.scale(1.5, 1.5);
      drawEffect(ctx, 'runaway', w, h, t * 0.6);
      ctx.restore();
    },
  },
  fix: {
    'silly-song'(ctx, w, h, t, u, lw) {
      cardBack(ctx, w, h, ['#ffe08a', '#fff6d8']);
      miniSock(ctx, w * 0.5, h * 0.66, Math.min(w, h) * 0.38, '#ff6fb1', lw, 'laugh', t);
      ctx.save();
      ctx.translate(w * 0.22, 0);
      drawEffect(ctx, 'notes', w, h, t);
      ctx.restore();
    },
    'wiggle-dance'(ctx, w, h, t, u, lw) {
      cardBack(ctx, w, h, ['#c9b6ff', '#ffe0f0']);
      ctx.save();
      ctx.translate(w * 0.5, h * 0.66);
      ctx.rotate(Math.sin(t * 6) * 0.25);
      miniSock(ctx, 0, 0, Math.min(w, h) * 0.36, '#ff8a3d', lw, 'laugh', t);
      ctx.restore();
      ctx.save();
      ctx.translate(w * 0.22, 0);
      drawEffect(ctx, 'dance', w, h, t);
      ctx.restore();
    },
    'use-thing'(ctx, w, h, t, u, lw) {
      cardBack(ctx, w, h, ['#8a4fd8', '#c9a0ff']);
      giftBox(ctx, w * 0.5, h * 0.6, Math.min(w, h) * 0.3, lw, t);
      for (let k = 0; k < 8; k++) {
        const a = Math.max(0, Math.sin(t * 3 + k * 1.2));
        sparkle(ctx, w * R(k, 240), h * R(k, 241) * 0.5, u * 4 * a, k % 2 ? '#ffffff' : C.sun);
      }
    },
    'big-hug'(ctx, w, h, t, u, lw) {
      cardBack(ctx, w, h, ['#ffd0e0', '#fff0f4']);
      const s = Math.min(w, h) * 0.32;
      ctx.save();
      ctx.translate(w * 0.38, h * 0.68);
      ctx.rotate(0.18);
      miniSock(ctx, 0, 0, s, '#5cb8ff', lw, 'sleep', t);
      ctx.restore();
      ctx.save();
      ctx.translate(w * 0.62, h * 0.68);
      ctx.rotate(-0.18);
      miniSock(ctx, 0, 0, s, '#ffd23f', lw, 'sleep', t);
      ctx.restore();
      drawEffect(ctx, 'hearts', w, h * 0.9, t);
    },
    tickles(ctx, w, h, t, u, lw) {
      cardBack(ctx, w, h, ['#bff0e0', '#f0fff8']);
      ctx.save();
      ctx.translate(w * 0.5, h * 0.66);
      ctx.rotate(Math.sin(t * 12) * 0.08);
      miniSock(ctx, 0, 0, Math.min(w, h) * 0.36, '#8fd14f', lw, 'laugh', t);
      ctx.restore();
      feather(ctx, w * 0.22, h * 0.5, u * 10, -0.7 + Math.sin(t * 9) * 0.35, '#ff8fc8', lw);
      feather(ctx, w * 0.8, h * 0.5, u * 10, 0.7 + Math.sin(t * 9 + 1) * 0.35, '#5cb8ff', lw);
    },
    'magic-words'(ctx, w, h, t, u, lw) {
      cardBack(ctx, w, h, ['#3a2a8a', '#8a4fd8']);
      ctx.save();
      ctx.translate(-w * 0.3, -h * 0.15);
      ctx.scale(1.6, 1.6);
      drawEffect(ctx, 'magic', w, h, t);
      ctx.restore();
    },
    'whale-help'(ctx, w, h, t, u, lw) {
      drawPlaceStatic(ctx, 'sea', w, h);
      drawEffect(ctx, 'whale', w, h, t);
    },
    machine(ctx, w, h, t, u, lw) {
      cardBack(ctx, w, h, ['#b6f0e0', '#e8fff8']);
      cardGround(ctx, w, h, '#d8d0e8');
      ctx.save();
      ctx.translate(-w * 0.35, -h * 0.3);
      ctx.scale(1.7, 1.45);
      drawEffect(ctx, 'machine', w, h, t);
      ctx.restore();
    },
    'sock-fan'(ctx, w, h, t, u, lw) {
      cardBack(ctx, w, h, ['#9adfff', '#e8f8ff']);
      ctx.save();
      ctx.translate(w * 0.28, h * 0.66);
      ctx.rotate(0.3);
      const s = Math.min(w, h) * 0.36;
      // flapping very fast
      miniSock(ctx, 0, 0, s, '#e8384f', lw, Math.sin(t * 30) > 0 ? 'open' : 'happy', t);
      ctx.restore();
      ctx.save();
      ctx.translate(w * 0.15, 0);
      ctx.beginPath();
      ctx.rect(w * 0.25, 0, w, h);
      ctx.clip();
      drawEffect(ctx, 'wind', w, h, t);
      ctx.restore();
    },
    bubble(ctx, w, h, t, u, lw) {
      cardBack(ctx, w, h, ['#8fd0ff', '#e0f4ff']);
      miniSock(ctx, w * 0.3, h * 0.74, Math.min(w, h) * 0.3, '#ff8a3d', lw, 'open', t);
      drawEffect(ctx, 'bubble', w * 1.1, h, t);
    },
  },
  ending: {
    party(ctx, w, h, t, u, lw) {
      cardBack(ctx, w, h, ['#ffb8e0', '#fff0f8']);
      miniSock(ctx, w * 0.5, h * 0.68, Math.min(w, h) * 0.34, '#22b8b0', lw, 'laugh', t);
      // party hat
      ctx.beginPath();
      const s = Math.min(w, h) * 0.34;
      ctx.moveTo(w * 0.5 - s * 0.25, h * 0.68 - s * 0.62);
      ctx.lineTo(w * 0.5, h * 0.68 - s * 1.2);
      ctx.lineTo(w * 0.5 + s * 0.25, h * 0.68 - s * 0.62);
      ctx.closePath();
      fillInk(ctx, C.sun, lw);
      circle(ctx, w * 0.5, h * 0.68 - s * 1.22, s * 0.07);
      fillInk(ctx, C.hot, lw * 0.7);
      drawEffect(ctx, 'confetti', w, h, t);
    },
    nap(ctx, w, h, t, u, lw) {
      cardBack(ctx, w, h, ['#5a4aa8', '#8a7ad0']);
      // pillow and blanket
      ellipse(ctx, w * 0.5, h * 0.82, w * 0.38, h * 0.1);
      fillInk(ctx, '#ffffff', lw);
      miniSock(ctx, w * 0.5, h * 0.66, Math.min(w, h) * 0.32, '#ffd23f', lw, 'sleep', t);
      roundRect(ctx, w * 0.12, h * 0.8, w * 0.76, h * 0.25, u * 4);
      fillInk(ctx, '#ff6fb1', lw);
      ctx.save();
      ctx.translate(-w * 0.06, 0);
      drawEffect(ctx, 'zzz', w, h, t);
      ctx.restore();
    },
    'fly-away'(ctx, w, h, t, u, lw) {
      drawPlaceStatic(ctx, 'sky', w, h);
      drawPlaceLive(ctx, 'sky', w, h, t);
      ctx.save();
      ctx.translate(0, -h * 0.08 + Math.sin(t) * u * 2);
      drawEffect(ctx, 'hot-air-balloon', w, h, t, { layer: 'back' });
      miniSock(ctx, w * 0.5, h * 0.68, Math.min(w, h) * 0.22, '#e8384f', lw, 'laugh', t);
      drawEffect(ctx, 'hot-air-balloon', w, h, t, { layer: 'front' });
      ctx.restore();
    },
    'ice-cream'(ctx, w, h, t, u, lw) {
      cardBack(ctx, w, h, ['#bff0e0', '#fff0f8']);
      const s = Math.min(w, h) * 0.2;
      cone(ctx, w * 0.5, h * 0.48, s, ['#ffd0e0', '#8a5a36', '#bff0c0'], lw);
      cone(ctx, w * 0.2, h * 0.62, s * 0.6, ['#ffe08a'], lw);
      cone(ctx, w * 0.8, h * 0.62, s * 0.6, ['#c9b0ff', '#ff9ac0'], lw);
    },
    parade(ctx, w, h, t, u, lw) {
      cardBack(ctx, w, h, ['#9adfff', '#e8f8ff']);
      cardGround(ctx, w, h, '#d8d0e8');
      miniSock(ctx, w * 0.3, h * 0.66, Math.min(w, h) * 0.28, '#ff8a3d', lw, 'laugh', t);
      ctx.save();
      ctx.translate(w * 0.62, h * 0.86);
      ctx.scale(1.5, 1.5);
      ctx.translate(-w * 0.5, -h * 0.8);
      drawEffect(ctx, 'parade', w, h, t);
      ctx.restore();
    },
    fireworks(ctx, w, h, t, u, lw) {
      cardBack(ctx, w, h, ['#1a1050', '#4a2a8a']);
      cardGround(ctx, w, h, '#2a2060');
      drawEffect(ctx, 'fireworks', w, h * 1.3, t);
    },
    campfire(ctx, w, h, t, u, lw) {
      cardBack(ctx, w, h, ['#1a1050', '#3a2a7a']);
      cardGround(ctx, w, h, '#4a7a4a');
      ctx.save();
      ctx.translate(-w * 0.5, -h * 0.75);
      ctx.scale(2, 1.9);
      drawEffect(ctx, 'campfire', w, h, t);
      ctx.restore();
    },
    'sail-home'(ctx, w, h, t, u, lw) {
      drawPlaceStatic(ctx, 'sea', w, h);
      drawPlaceLive(ctx, 'sea', w, h, t);
      drawEffect(ctx, 'boat', w, h, t, { layer: 'back' });
      miniSock(ctx, w * 0.3, h * 0.7, Math.min(w, h) * 0.2, '#8fd14f', lw, 'laugh', t);
      drawEffect(ctx, 'boat', w, h, t, { layer: 'front' });
    },
    disco(ctx, w, h, t, u, lw) {
      cardBack(ctx, w, h, ['#2a1060', '#6a2aa0']);
      drawEffect(ctx, 'disco', w, h, t);
      ctx.save();
      ctx.translate(w * 0.5, h * 0.74);
      ctx.rotate(Math.sin(t * 6) * 0.25);
      miniSock(ctx, 0, 0, Math.min(w, h) * 0.3, '#ff6fb1', lw, 'laugh', t);
      ctx.restore();
    },
    picnic(ctx, w, h, t, u, lw) {
      cardBack(ctx, w, h, ['#9adfff', '#e8f8ff']);
      cardGround(ctx, w, h * 0.92, '#8fd14f');
      sun(ctx, w * 0.82, h * 0.16, U(w, h) * 8, lw);
      cloud(ctx, w * 0.25, h * 0.16, U(w, h) * 10, lw);
      miniSock(ctx, w * 0.5, h * 0.62, Math.min(w, h) * 0.3, '#ffd23f', lw, 'laugh', t);
      ctx.save();
      ctx.translate(-w * 0.2, -h * 0.5);
      ctx.scale(1.4, 1.55);
      drawEffect(ctx, 'picnic', w, h, t);
      ctx.restore();
    },
  },
};

export function drawCardArt(ctx, beat, id, w, h, t = 0) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (beat === 'place') {
    drawPlaceStatic(ctx, id, w, h);
    drawPlaceLive(ctx, id, w, h, t);
  } else {
    const f = CARDS[beat] && CARDS[beat][id];
    if (f) f(ctx, w, h, t, U(w, h), LW(w, h));
    else cardBack(ctx, w, h, ['#c9b6ff', '#f0e8ff']);
  }
  ctx.restore();
}

