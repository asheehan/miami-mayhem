// South Beach: a rainbow-striped lifeguard tower on the sand, umbrellas, a sandcastle and a
// sailboat out on the turquoise water.
import { begin, end, sky, sun, cloud, sea, speckle, rect, poly, circle, ellipse, rr, fs, lin, line, gull, star, rng, INK, TAU } from './kit.js';

const STRIPES = ['#ff4f8b', '#ff8a4c', '#ffd23a', '#3fd26b', '#29b6f6', '#9b6bff'];

function tower(ctx) {
  // stilts and braces
  for (const x of [222, 292, 362]) rect(ctx, x - 7, 440, 14, 175, '#c9a06a', 3);
  ctx.strokeStyle = '#a07a48';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(222, 450);
  ctx.lineTo(362, 600);
  ctx.moveTo(362, 450);
  ctx.lineTo(222, 600);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(222, 450);
  ctx.lineTo(362, 600);
  ctx.moveTo(362, 450);
  ctx.lineTo(222, 600);
  ctx.stroke();
  // ramp
  poly(ctx, [[392, 446], [540, 640], [560, 640], [410, 446]], '#d8b07a', 3);
  for (let k = 0.1; k < 1; k += 0.12) line(ctx, 392 + 148 * k, 446 + 194 * k, 410 + 150 * k, 446 + 194 * k, '#8a6338', 2.5);
  // deck with railing
  rect(ctx, 188, 432, 228, 16, '#d8b07a', 3);
  for (let x = 196; x < 416; x += 22) line(ctx, x, 432, x, 404, '#ffffff', 5);
  line(ctx, 190, 404, 414, 404, '#ffffff', 6);
  // hut: rainbow stripes
  ctx.save();
  ctx.beginPath();
  ctx.rect(210, 300, 180, 106);
  ctx.clip();
  STRIPES.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(210 + i * 30, 300, 30, 106);
  });
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(210, 300, 180, 12);
  ctx.restore();
  ctx.beginPath();
  ctx.rect(210, 300, 180, 106);
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // window with a lifeguard and binoculars
  rr(ctx, 246, 318, 108, 52, 8);
  fs(ctx, '#1b3a63', 3);
  circle(ctx, 300, 352, 15, '#c98552', 2.5);
  rr(ctx, 284, 330, 32, 14, 6);
  fs(ctx, '#ff4f4f', 2.5);
  circle(ctx, 292, 352, 5, INK, 0);
  circle(ctx, 308, 352, 5, INK, 0);
  // roof
  poly(ctx, [[188, 302], [210, 262], [390, 262], [412, 302]], '#ff4f8b', 3);
  for (let x = 196; x < 410; x += 24) line(ctx, x + 6, 300, x + 16, 266, 'rgba(255,255,255,0.45)', 3);
  // flag
  line(ctx, 380, 262, 380, 190, INK, 4);
  poly(ctx, [[382, 192], [430, 206], [382, 222]], '#ff3b3b', 3);
  // lifebuoy on the railing
  ctx.beginPath();
  ctx.arc(232, 420, 22, 0, TAU);
  ctx.arc(232, 420, 11, 0, TAU, true);
  fs(ctx, '#ffffff', 3);
  ctx.strokeStyle = '#ff3b3b';
  ctx.lineWidth = 10;
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.arc(232, 420, 16.5, k * (TAU / 4), k * (TAU / 4) + 0.6);
    ctx.stroke();
  }
}

function umbrella(ctx, x, y, r, a, b) {
  line(ctx, x, y, x + 10, y + 150, '#ffffff', 6);
  line(ctx, x, y, x + 10, y + 150, INK, 2);
  // a dome seen from the side: panels fan from the tip to a scalloped rim
  const n = 6;
  const rim = (t) => [x + Math.cos(t) * r, y + 52 - Math.sin(t) * 14];
  const tipY = y - 8;
  for (let i = 0; i < n; i++) {
    const t0 = Math.PI - (i / n) * Math.PI;
    const t1 = Math.PI - ((i + 1) / n) * Math.PI;
    const [x0, y0] = rim(t0);
    const [x1, y1] = rim(t1);
    ctx.beginPath();
    ctx.moveTo(x, tipY);
    ctx.quadraticCurveTo(x + (x0 - x) * 0.45, tipY + 2, x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + 16, x1, y1);
    ctx.quadraticCurveTo(x + (x1 - x) * 0.45, tipY + 2, x, tipY);
    ctx.closePath();
    fs(ctx, i % 2 ? a : b, 2.5);
  }
  circle(ctx, x, tipY - 3, 6, '#ffffff', 2);
}

function sandcastle(ctx, x, y) {
  const sandC = lin(ctx, 0, y - 90, 0, y, [[0, '#f8d58a'], [1, '#dcae5a']]);
  rect(ctx, x - 70, y - 40, 140, 40, sandC, 3);
  rect(ctx, x - 80, y - 85, 40, 85, sandC, 3);
  rect(ctx, x + 40, y - 85, 40, 85, sandC, 3);
  rect(ctx, x - 25, y - 100, 50, 100, sandC, 3);
  for (const [cx, top, wd] of [[x - 60, y - 85, 40], [x + 60, y - 85, 40], [x, y - 100, 50]]) {
    for (let k = 0; k < 3; k++) rect(ctx, cx - wd / 2 + k * (wd / 3) + 2, top - 10, wd / 3 - 6, 10, sandC, 2.5);
  }
  rr(ctx, x - 12, y - 30, 24, 30, 12);
  fs(ctx, '#8a5a2c', 2.5);
  line(ctx, x, y - 110, x, y - 150, INK, 3);
  poly(ctx, [[x + 1, y - 150], [x + 30, y - 141], [x + 1, y - 132]], '#29b6f6', 2.5);
}

function beachBall(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(120,80,20,0.25)';
  ctx.beginPath();
  ctx.ellipse(x + 6, y + r * 0.9, r, r * 0.3, 0, 0, TAU);
  ctx.fill();
  const cols = ['#ff3b3b', '#ffffff', '#29b6f6', '#ffffff', '#ffd23a', '#ffffff'];
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r, 0.4 + (i * TAU) / 6, 0.4 + ((i + 1) * TAU) / 6);
    ctx.closePath();
    ctx.fillStyle = cols[i];
    ctx.fill();
  }
  circle(ctx, x, y, r, 'rgba(0,0,0,0)', 3);
  circle(ctx, x - r * 0.35, y - r * 0.35, r * 0.18, 'rgba(255,255,255,0.8)', 0);
}

export default {
  id: 'lifeguard',
  place: 'South Beach',
  draw(ctx, w, h) {
    const r = rng(22);
    begin(ctx, w, h);
    sky(ctx, [[0, '#2f86ff'], [0.7, '#7fd6ff'], [1, '#c9f4ff']], 0, 330);
    sun(ctx, 510, 85, 42, { rays: 14 });
    cloud(ctx, 120, 110, 62);
    cloud(ctx, 380, 200, 40);
    cloud(ctx, 560, 250, 30);
    gull(ctx, 250, 120, 14);
    gull(ctx, 285, 140, 10);
    gull(ctx, 450, 170, 12);
    sea(ctx, 330, 525, '#0b8fb0', '#4fe3d6', r, 'rgba(255,255,255,0.6)', 8);
    // a sailboat
    poly(ctx, [[90, 372], [160, 372], [150, 386], [100, 386]], '#ffffff', 2.5);
    poly(ctx, [[124, 368], [124, 300], [166, 368]], '#ff8a4c', 2.5);
    poly(ctx, [[120, 368], [120, 316], [92, 368]], '#ffd23a', 2.5);
    // a far ship
    poly(ctx, [[440, 344], [540, 344], [532, 354], [448, 354]], '#ffffff', 2);
    rect(ctx, 460, 334, 60, 10, '#ffffff', 2);
    rect(ctx, 500, 324, 10, 10, '#ff4f8b', 2);
    // surf
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, 540);
    for (let x = 0; x <= 600; x += 30) ctx.quadraticCurveTo(x + 15, 512 + (x % 60 ? 4 : -2), x + 30, 524);
    ctx.lineTo(600, 560);
    ctx.lineTo(0, 560);
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, 530, 0, 800, [[0, '#e9c47a'], [0.15, '#ffe2a0'], [1, '#f2c56e']]);
    ctx.beginPath();
    ctx.moveTo(0, 548);
    for (let x = 0; x <= 600; x += 40) ctx.quadraticCurveTo(x + 20, 538, x + 40, 548);
    ctx.lineTo(600, 800);
    ctx.lineTo(0, 800);
    ctx.fill();
    speckle(ctx, 0, 560, 600, 240, 160, ['#d9a957', '#fff3c8', '#c98f3f'], r, 1.8);
    // footprints
    for (let k = 0; k < 6; k++) ellipse(ctx, 440 + k * 22 + (k % 2) * 8, 780 - k * 32, 6, 10, '#ddb063', 0, INK, -0.5);
    tower(ctx);
    // towel and umbrella
    ctx.save();
    ctx.translate(95, 660);
    ctx.rotate(-0.12);
    rr(ctx, -70, -26, 140, 52, 6);
    fs(ctx, '#3fd26b', 3);
    ctx.fillStyle = '#ffffff';
    for (let k = -60; k < 70; k += 30) ctx.fillRect(k, -26, 12, 52);
    rr(ctx, -70, -26, 140, 52, 6);
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.restore();
    umbrella(ctx, 110, 500, 105, '#ff4f8b', '#ffe14d');
    sandcastle(ctx, 140, 790);
    beachBall(ctx, 480, 712, 38);
    // bucket and spade
    poly(ctx, [[262, 700], [302, 700], [296, 745], [268, 745]], '#29b6f6', 3);
    ctx.beginPath();
    ctx.arc(282, 700, 20, Math.PI, 0);
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    line(ctx, 320, 690, 345, 740, '#ff3b3b', 6);
    ellipse(ctx, 348, 748, 10, 14, '#ff3b3b', 2.5, INK, -0.45);
    star(ctx, 380, 770, 16, '#ff8a4c', 5, 0.45, 2.5);
    star(ctx, 220, 770, 11, '#ff4f8b', 5, 0.45, 2);
    // shells
    for (const [sx, sy] of [[560, 610], [30, 760], [420, 600]]) {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.arc(sx, sy, 11, Math.PI * 1.05, Math.PI * 1.95);
      ctx.closePath();
      fs(ctx, '#ffd6e6', 2);
    }
    end(ctx);
  },
};
