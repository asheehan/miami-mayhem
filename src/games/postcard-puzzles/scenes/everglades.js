// The Everglades: an airboat with its big caged fan skimming past sawgrass and cypress,
// a smiling gator in front, an egret wading, a heron flying and a turtle on a log.
import { begin, end, sky, sun, cloud, rect, poly, circle, ellipse, rr, fs, lin, line, rng, INK, TAU } from './kit.js';

function cypress(ctx, x, y, h, r) {
  poly(ctx, [[x - 12, y], [x - 5, y - h], [x + 5, y - h], [x + 12, y]], '#6b5a48', 2.5);
  for (let k = 0; k < 5; k++) {
    const yy = y - h + k * (h / 5);
    ellipse(ctx, x + (k % 2 ? 18 : -18), yy, 34 - k * 2, 14, k % 2 ? '#4f8a4a' : '#3f7a3e', 2.5);
    // spanish moss
    ctx.strokeStyle = '#a9b9a0';
    ctx.lineWidth = 2;
    for (let m = 0; m < 4; m++) {
      const mx = x + (k % 2 ? 18 : -18) + (m - 1.5) * 12;
      ctx.beginPath();
      ctx.moveTo(mx, yy + 8);
      ctx.quadraticCurveTo(mx + 4, yy + 20, mx - 2, yy + 26 + r() * 14);
      ctx.stroke();
    }
  }
}

function sawgrass(ctx, x, y, n, r, h = 60) {
  for (let k = 0; k < n; k++) {
    const bx = x + (r() - 0.5) * 40;
    const a = -Math.PI / 2 + (r() - 0.5) * 0.9;
    const len = h * (0.6 + r() * 0.6);
    ctx.fillStyle = k % 3 ? '#b6c94a' : '#8fae3c';
    ctx.beginPath();
    ctx.moveTo(bx - 4, y);
    ctx.quadraticCurveTo(bx + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5, bx + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.quadraticCurveTo(bx + Math.cos(a) * len * 0.5 + 6, y + Math.sin(a) * len * 0.5, bx + 4, y);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#4f6a1e';
    ctx.stroke();
  }
}

function airboat(ctx) {
  // spray behind
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let k = 0; k < 10; k++) {
    ctx.beginPath();
    ctx.arc(470 + k * 14, 560 - (k % 3) * 8, 10 + (k % 4) * 3, 0, TAU);
    ctx.fill();
  }
  // hull
  poly(ctx, [[130, 540], [450, 540], [455, 568], [160, 572]], lin(ctx, 0, 540, 0, 572, [[0, '#e8eef8'], [1, '#9aa3b5']]), 3);
  line(ctx, 140, 552, 450, 552, '#2f7fd6', 5);
  // seats with riders
  rect(ctx, 210, 510, 40, 30, '#2f7fd6', 2.5);
  rect(ctx, 270, 510, 40, 30, '#2f7fd6', 2.5);
  for (const [px, c, hat] of [[230, '#ff8a4c', '#ffd23a'], [290, '#ff4f8b', '#2ff3ff']]) {
    rr(ctx, px - 12, 482, 24, 30, 8);
    fs(ctx, c, 2.5);
    circle(ctx, px, 474, 11, '#d9a06a', 2.5);
    ellipse(ctx, px, 466, 15, 5, hat, 2);
    rect(ctx, px - 6, 462, 12, 6, hat, 2);
  }
  // raised driver's seat
  line(ctx, 352, 540, 352, 470, INK, 5);
  line(ctx, 380, 540, 380, 470, INK, 5);
  rect(ctx, 340, 462, 50, 12, '#2f7fd6', 2.5);
  rr(ctx, 354, 432, 24, 30, 8);
  fs(ctx, '#3fd26b', 2.5);
  circle(ctx, 366, 424, 11, '#a5653a', 2.5);
  ctx.beginPath();
  ctx.ellipse(366, 416, 18, 6, 0, 0, TAU);
  fs(ctx, '#e8c36a', 2);
  rect(ctx, 357, 404, 18, 12, '#e8c36a', 2);
  // the fan cage
  circle(ctx, 430, 470, 62, 'rgba(255,255,255,0.15)', 4);
  ctx.strokeStyle = '#3b3f55';
  ctx.lineWidth = 2;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU;
    ctx.beginPath();
    ctx.moveTo(430, 470);
    ctx.lineTo(430 + Math.cos(a) * 62, 470 + Math.sin(a) * 62);
    ctx.stroke();
  }
  circle(ctx, 430, 470, 40, 'rgba(0,0,0,0)', 2);
  // propeller blur and blades
  circle(ctx, 430, 470, 54, 'rgba(200,210,230,0.35)', 0);
  ellipse(ctx, 430, 446, 9, 26, '#8a5a3c', 2.5, INK, 0.3);
  ellipse(ctx, 430, 494, 9, 26, '#8a5a3c', 2.5, INK, 0.3);
  circle(ctx, 430, 470, 9, '#ff4060', 2.5);
  // engine and rudders
  rect(ctx, 400, 500, 40, 40, '#5c6075', 2.5);
  rect(ctx, 488, 430, 8, 80, '#3b3f55', 2);
  rect(ctx, 500, 430, 8, 80, '#3b3f55', 2);
  // flag on a pole
  line(ctx, 452, 408, 452, 360, INK, 3);
  poly(ctx, [[453, 362], [490, 372], [453, 382]], '#ff4f8b', 2.5);
}

function gator(ctx) {
  // water ripples around
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 3;
  for (const [x, y, rx] of [[220, 732, 150], [470, 740, 140]]) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, 14, 0, 0, Math.PI);
    ctx.stroke();
  }
  // back and tail with ridges
  ctx.beginPath();
  ctx.moveTo(190, 728);
  ctx.quadraticCurveTo(320, 690, 450, 712);
  ctx.quadraticCurveTo(540, 722, 610, 740);
  ctx.lineTo(610, 752);
  ctx.quadraticCurveTo(400, 740, 190, 740);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, 690, 0, 745, [[0, '#6fae4a'], [1, '#3e7a2e']]), 3);
  for (let x = 230; x < 600; x += 22) {
    const y = x < 450 ? 728 - Math.sin(((x - 190) / 260) * Math.PI) * 28 : 712 + (x - 450) * 0.17;
    poly(ctx, [[x - 8, y + 4], [x, y - 10], [x + 8, y + 4]], '#5a9a3e', 2);
  }
  // head and snout
  ctx.beginPath();
  ctx.moveTo(220, 742);
  ctx.quadraticCurveTo(200, 700, 160, 706);
  ctx.lineTo(50, 718);
  ctx.quadraticCurveTo(28, 724, 40, 740);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, 700, 0, 742, [[0, '#7fc25a'], [1, '#4a8a36']]), 3);
  // smile and teeth
  ctx.beginPath();
  ctx.moveTo(48, 732);
  ctx.quadraticCurveTo(120, 742, 196, 728);
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  for (let x = 66; x < 186; x += 18) poly(ctx, [[x, 734], [x + 5, 742], [x + 10, 734]], '#ffffff', 1.5);
  circle(ctx, 58, 718, 3, INK, 0);
  // eyes
  for (const ex of [160, 196]) {
    circle(ctx, ex, 694, 15, '#6fae4a', 3);
    circle(ctx, ex, 692, 9, '#fff6a0', 2);
    ellipse(ctx, ex + 1, 692, 3, 7, INK, 0);
  }
}

function egret(ctx, x, y) {
  line(ctx, x - 6, y, x - 10, y + 80, INK, 3);
  line(ctx, x + 6, y, x + 4, y + 80, INK, 3);
  ellipse(ctx, x, y - 12, 34, 20, '#ffffff', 3, INK, -0.3);
  ctx.beginPath();
  ctx.moveTo(x - 24, y - 20);
  ctx.bezierCurveTo(x - 50, y - 40, x - 10, y - 70, x - 30, y - 96);
  ctx.lineWidth = 11;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  circle(ctx, x - 30, y - 100, 10, '#ffffff', 3);
  poly(ctx, [[x - 38, y - 104], [x - 82, y - 94], [x - 38, y - 96]], '#ffd23a', 2);
  circle(ctx, x - 32, y - 102, 2.5, INK, 0);
}

export default {
  id: 'everglades',
  place: 'The Everglades',
  draw(ctx, w, h) {
    const r = rng(55);
    begin(ctx, w, h);
    sky(ctx, [[0, '#56b2ff'], [0.6, '#a8dcff'], [1, '#ffe0a8']], 0, 420);
    sun(ctx, 90, 330, 46, { core: '#fff8c8', edge: '#ffcf5a' });
    cloud(ctx, 260, 110, 58);
    cloud(ctx, 520, 200, 44);
    cloud(ctx, 90, 210, 30);
    // a heron flying
    ctx.save();
    ctx.translate(420, 110);
    ellipse(ctx, 0, 0, 26, 9, '#7d9ac8', 2.5);
    poly(ctx, [[-10, -2], [10, -46], [22, -40], [10, 0]], '#9ab6e0', 2.5);
    line(ctx, -26, 0, -46, -4, INK, 3);
    circle(ctx, -48, -5, 6, '#7d9ac8', 2);
    poly(ctx, [[-54, -6], [-74, -2], [-54, -2]], '#ffd23a', 1.5);
    line(ctx, 24, 2, 58, 6, INK, 2.5);
    ctx.restore();
    // far tree islands and cypress
    for (const [x, y, ww, hh, c] of [[-30, 425, 260, 46, '#4f8a6a'], [210, 428, 200, 32, '#5f9a76'], [380, 425, 260, 52, '#477e60']]) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k <= 8; k++) ctx.quadraticCurveTo(x + (k - 0.5) * (ww / 8), y - hh - (k % 2) * 12, x + k * (ww / 8), y - hh * 0.6);
      ctx.lineTo(x + ww, y);
      ctx.closePath();
      fs(ctx, c, 2.5);
    }
    cypress(ctx, 60, 430, 190, r);
    cypress(ctx, 540, 432, 150, r);
    // water
    ctx.fillStyle = lin(ctx, 0, 420, 0, 800, [[0, '#7fc9c8'], [0.5, '#3f9fa8'], [1, '#2c6f86']]);
    ctx.fillRect(0, 420, 600, 380);
    line(ctx, 0, 421, 600, 421, INK, 2.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 3;
    for (let k = 0; k < 22; k++) {
      const x = r() * 600;
      const y = 450 + r() * 330;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 20 + r() * 30, y);
      ctx.stroke();
    }
    for (const [x, y] of [[30, 440], [150, 445], [300, 438], [470, 444], [580, 440]]) sawgrass(ctx, x, y, 14, r, 55);
    // lily pads with flowers
    for (const [x, y, s] of [[330, 640, 1], [410, 672, 0.8], [520, 790, 1.1], [330, 780, 0.9], [250, 610, 0.7]]) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.ellipse(x, y, 30 * s, 12 * s, 0, 0.3, TAU - 0.3);
      ctx.closePath();
      fs(ctx, '#4caf50', 2.5);
    }
    for (const [x, y] of [[330, 632], [520, 780]]) {
      for (let k = 0; k < 5; k++) ellipse(ctx, x + Math.cos(k * 1.26) * 8, y + Math.sin(k * 1.26) * 4 - 4, 7, 4, '#ff8ac0', 1.5, INK, k * 1.26);
      circle(ctx, x, y - 4, 4, '#ffd23a', 1.5);
    }
    airboat(ctx);
    // turtle on a log
    rr(ctx, 440, 612, 140, 22, 11);
    fs(ctx, '#8a5a3c', 3);
    circle(ctx, 572, 623, 8, '#6e4426', 2);
    ellipse(ctx, 500, 606, 26, 14, '#5a8a3e', 3);
    ctx.strokeStyle = '#3e6a2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(488, 596);
    ctx.lineTo(492, 616);
    ctx.moveTo(512, 596);
    ctx.lineTo(508, 616);
    ctx.stroke();
    circle(ctx, 530, 604, 8, '#7fae5a', 2.5);
    circle(ctx, 533, 602, 2, INK, 0);
    egret(ctx, 120, 596);
    sawgrass(ctx, 10, 800, 16, r, 90);
    sawgrass(ctx, 590, 690, 10, r, 70);
    gator(ctx);
    end(ctx);
  },
};
