// A roadside fruit stand down in Homestead: a striped awning, hanging bananas, crates of
// mangoes, oranges, limes and coconuts, pineapples, a smoothie board and watermelons.
import { begin, end, sky, sun, cloud, rect, poly, circle, ellipse, rr, fs, lin, line, label, rng, INK, TAU } from './kit.js';

function grove(ctx, r) {
  for (let k = 0; k < 9; k++) {
    const x = k * 72 + 10;
    const y = 360 - (k % 2) * 8;
    rect(ctx, x - 5, y, 10, 40, '#7a4a22', 2);
    circle(ctx, x, y - 10, 38, k % 2 ? '#3f9a4a' : '#2f8a3e', 2.5);
    for (let f = 0; f < 5; f++) circle(ctx, x + (r() - 0.5) * 50, y - 10 + (r() - 0.5) * 40, 4.5, f % 2 ? '#ff8a2a' : '#ffd23a', 1.2);
  }
}

function crate(ctx, x, y, w, fruit) {
  // fruit heaped above the crate
  const rows = 2;
  for (let j = rows - 1; j >= 0; j--) {
    for (let i = 0; i < 4 - j; i++) {
      const fx = x + w * ((i + 0.5 + j * 0.5) / 4);
      const fy = y - 10 - j * 18;
      fruit(fx, fy);
    }
  }
  rect(ctx, x, y - 6, w, 46, '#c98f4f', 3);
  line(ctx, x, y + 10, x + w, y + 10, '#8a5a2c', 2.5);
  line(ctx, x, y + 24, x + w, y + 24, '#8a5a2c', 2.5);
}

function pineapple(ctx, x, y) {
  for (let k = -2; k <= 2; k++) poly(ctx, [[x + k * 5 - 4, y - 34], [x + k * 9, y - 70 + Math.abs(k) * 10], [x + k * 5 + 4, y - 34]], k % 2 ? '#3fae4a' : '#2f8a3e', 2);
  ellipse(ctx, x, y - 8, 20, 30, '#f2b23a', 3);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y - 8, 20, 30, 0, 0, TAU);
  ctx.clip();
  ctx.strokeStyle = '#b8781e';
  ctx.lineWidth = 2;
  for (let k = -40; k < 40; k += 10) {
    ctx.beginPath();
    ctx.moveTo(x + k, y - 40);
    ctx.lineTo(x + k + 40, y + 24);
    ctx.moveTo(x - k, y - 40);
    ctx.lineTo(x - k - 40, y + 24);
    ctx.stroke();
  }
  ctx.restore();
}

function bananas(ctx, x, y) {
  line(ctx, x, y - 14, x, y + 6, '#6e4426', 4);
  for (let k = 0; k < 6; k++) {
    const a = -0.9 + k * 0.36;
    ctx.save();
    ctx.translate(x, y + 6);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(14, 26, 4, 50);
    ctx.quadraticCurveTo(-4, 28, 0, 0);
    fs(ctx, k % 2 ? '#ffe14d' : '#ffd23a', 2.5);
    ctx.restore();
  }
}

function watermelon(ctx, x, y, s) {
  ellipse(ctx, x, y, 40 * s, 28 * s, '#2f8a3e', 3);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, 40 * s, 28 * s, 0, 0, TAU);
  ctx.clip();
  ctx.strokeStyle = '#7fd36b';
  ctx.lineWidth = 5 * s;
  for (let k = -3; k <= 3; k++) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.abs(k) * 12 * s + 4, 30 * s, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(x, y, 40 * s, 28 * s, 0, 0, TAU);
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

export default {
  id: 'fruit-stand',
  place: 'Homestead',
  draw(ctx, w, h) {
    const r = rng(1212);
    begin(ctx, w, h);
    sky(ctx, [[0, '#3a9bff'], [1, '#bfe8ff']], 0, 380);
    sun(ctx, 520, 70, 40, { rays: 12 });
    cloud(ctx, 110, 80, 46);
    cloud(ctx, 330, 50, 34);
    grove(ctx, r);
    // field
    ctx.fillStyle = lin(ctx, 0, 380, 0, 800, [[0, '#8fd06a'], [1, '#5aa83e']]);
    ctx.fillRect(0, 390, 600, 410);
    line(ctx, 0, 391, 600, 391, INK, 2.5);
    // stand posts, back wall and the sign
    rect(ctx, 40, 290, 520, 210, '#e9c38a', 3);
    for (let x = 60; x < 560; x += 40) line(ctx, x, 292, x, 498, 'rgba(110,68,38,0.35)', 2.5);
    rect(ctx, 30, 160, 18, 480, '#8a5a3c', 3);
    rect(ctx, 552, 160, 18, 480, '#8a5a3c', 3);
    rr(ctx, 110, 120, 380, 74, 14);
    fs(ctx, '#ffffff', 4);
    label(ctx, 'FRESH FRUIT', 300, 158, 40, '#ff5a3c', { lw: 6 });
    for (const [fx, c] of [[136, '#ff8a2a'], [464, '#7cd34a']]) circle(ctx, fx, 157, 14, c, 2.5);
    // striped scalloped awning
    const n = 13;
    const sw = 560 / n;
    for (let i = 0; i < n; i++) {
      const x = 20 + i * sw;
      ctx.beginPath();
      ctx.moveTo(x, 200);
      ctx.lineTo(x + sw, 200);
      ctx.lineTo(x + sw, 262);
      ctx.arc(x + sw / 2, 262, sw / 2, 0, Math.PI);
      ctx.closePath();
      fs(ctx, i % 2 ? '#ffffff' : '#3fae4a', 2.5);
    }
    line(ctx, 20, 200, 580, 200, INK, 4);
    // bananas hanging from the beam
    for (const bx of [110, 230, 380, 500]) bananas(ctx, bx, 300);
    // smoothie board
    rect(ctx, 248, 330, 104, 120, '#2b3b2e', 4);
    label(ctx, 'SMOOTHIES', 300, 348, 15, '#ffffff', { lw: 0 });
    poly(ctx, [[280, 368], [320, 368], [314, 432], [286, 432]], '#ff7aa8', 2.5);
    line(ctx, 306, 376, 318, 356, '#2ff3ff', 4);
    circle(ctx, 290, 366, 7, '#ff8a2a', 2);
    // counter and crates
    rect(ctx, 20, 520, 560, 30, '#a8743f', 3);
    rect(ctx, 40, 550, 520, 90, '#c98f4f', 3);
    for (let x = 60; x < 560; x += 50) line(ctx, x, 552, x, 638, 'rgba(110,68,38,0.45)', 3);
    // hand-painted fruit along the counter front, and an OPEN sign
    const painted = [['#ff8a2a', '#3fae4a'], ['#ffd23a', '#3fae4a'], ['#ff3d5a', '#3fae4a'], ['#7cd34a', '#2f8a3e']];
    for (let k = 0; k < 4; k++) {
      const px = 80 + k * 70;
      circle(ctx, px, 596, 22, painted[k][0], 3);
      ellipse(ctx, px + 8, 572, 10, 5, painted[k][1], 2, INK, -0.5);
      circle(ctx, px - 7, 589, 5, 'rgba(255,255,255,0.6)', 0);
    }
    rr(ctx, 380, 566, 150, 58, 12);
    fs(ctx, '#ff4f8b', 3);
    label(ctx, 'OPEN', 455, 596, 34, '#ffffff', { lw: 5 });
    const mango = (fx, fy) => {
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(0.4);
      ellipse(ctx, 0, 0, 16, 12, lin(ctx, -16, 0, 16, 0, [[0, '#ff3d5a'], [0.5, '#ff8a2a'], [1, '#ffd23a']]), 2.5);
      ctx.restore();
    };
    const orange = (fx, fy) => {
      circle(ctx, fx, fy, 13, '#ff9a2a', 2.5);
      circle(ctx, fx - 4, fy - 4, 3, 'rgba(255,255,255,0.6)', 0);
    };
    const lime = (fx, fy) => ellipse(ctx, fx, fy, 13, 11, '#7cd34a', 2.5);
    const coconut = (fx, fy) => {
      circle(ctx, fx, fy, 14, '#8a5a2c', 2.5);
      for (const [dx, dy] of [[-4, -3], [3, -3], [0, 3]]) circle(ctx, fx + dx, fy + dy, 2, '#4a2a12', 0);
    };
    const dragon = (fx, fy) => {
      ellipse(ctx, fx, fy, 14, 13, '#ff3d9a', 2.5);
      for (let k = 0; k < 4; k++) poly(ctx, [[fx - 8 + k * 5, fy - 6], [fx - 10 + k * 6, fy - 18], [fx - 3 + k * 5, fy - 8]], '#7cd34a', 1.5);
    };
    crate(ctx, 50, 490, 96, mango);
    crate(ctx, 152, 490, 96, orange);
    crate(ctx, 254, 490, 92, dragon);
    crate(ctx, 352, 490, 96, lime);
    crate(ctx, 454, 490, 96, coconut);
    // price tags
    for (const x of [98, 200, 300, 400, 502]) {
      rr(ctx, x - 18, 506, 36, 20, 4);
      fs(ctx, '#fffbe0', 2);
      label(ctx, '$1', x, 517, 13, INK, { lw: 0 });
    }
    // ground in front: dirt path and grass tufts
    ctx.fillStyle = lin(ctx, 0, 640, 0, 800, [[0, '#d9b07a'], [1, '#c4955a']]);
    ctx.beginPath();
    ctx.moveTo(0, 640);
    ctx.lineTo(600, 640);
    ctx.lineTo(600, 800);
    ctx.lineTo(0, 800);
    ctx.fill();
    line(ctx, 0, 640, 600, 640, INK, 3);
    for (let k = 0; k < 40; k++) circle(ctx, r() * 600, 650 + r() * 150, 2 + r() * 2, '#a8743f', 0);
    for (let k = 0; k < 10; k++) {
      const gx = r() * 600;
      const gy = 700 + r() * 100;
      for (let b = -2; b <= 2; b++) line(ctx, gx, gy, gx + b * 6, gy - 16 - Math.abs(b) * -3, '#4f9a36', 3);
    }
    pineapple(ctx, 70, 700);
    pineapple(ctx, 112, 712);
    pineapple(ctx, 36, 730);
    // wheelbarrow of watermelons
    line(ctx, 330, 730, 250, 690, '#6e4426', 7);
    circle(ctx, 470, 760, 24, '#3b3f55', 3);
    circle(ctx, 470, 760, 8, '#c9d0de', 2);
    watermelon(ctx, 380, 680, 0.8);
    watermelon(ctx, 450, 676, 0.85);
    watermelon(ctx, 414, 656, 0.8);
    poly(ctx, [[320, 690], [510, 690], [490, 744], [340, 744]], '#e8463c', 3);
    line(ctx, 330, 706, 500, 706, '#ff7a6a', 3);
    // a slice of watermelon on a crate in front
    rect(ctx, 170, 720, 70, 50, '#c98f4f', 3);
    ctx.beginPath();
    ctx.moveTo(176, 716);
    ctx.arc(205, 716, 32, Math.PI, 0, true);
    ctx.closePath();
    fs(ctx, '#ff4f6a', 3);
    ctx.beginPath();
    ctx.arc(205, 716, 32, 0, Math.PI);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#3fae4a';
    ctx.stroke();
    for (let k = 0; k < 5; k++) ellipse(ctx, 188 + k * 8, 724 + (k % 2) * 6, 2, 3.5, INK, 0);
    // a chicken pecking about
    ellipse(ctx, 560, 735, 26, 20, '#ffffff', 3);
    circle(ctx, 538, 716, 11, '#ffffff', 3);
    poly(ctx, [[528, 716], [516, 720], [528, 724]], '#ffd23a', 2);
    circle(ctx, 538, 704, 5, '#e8463c', 1.5);
    circle(ctx, 536, 714, 2, INK, 0);
    line(ctx, 556, 754, 552, 772, '#ffb347', 4);
    line(ctx, 566, 754, 570, 772, '#ffb347', 4);
    end(ctx);
  },
};
