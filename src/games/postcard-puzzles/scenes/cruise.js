// PortMiami: a big cruise ship with a waterslide heads out past a palm island, cranes and
// the skyline behind, a tugboat, a dolphin and a channel buoy in front.
import { begin, end, sky, sun, cloud, sea, rect, poly, circle, ellipse, rr, fs, lin, line, gull, palm, rng, INK, TAU } from './kit.js';

function ship(ctx, r) {
  // bow wave
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(60, 548);
  ctx.quadraticCurveTo(110, 520, 160, 540);
  ctx.quadraticCurveTo(300, 560, 600, 556);
  ctx.lineTo(600, 572);
  ctx.quadraticCurveTo(300, 580, 60, 560);
  ctx.closePath();
  ctx.fill();
  // upper decks, stepped toward the bow
  const decks = [[230, 300], [205, 330], [180, 360], [160, 390], [140, 420]];
  decks.forEach(([x, y], k) => {
    rect(ctx, x, y, 620 - x, 32, k % 2 ? '#ffffff' : '#f2f5fb', 3);
    // windows / balconies
    for (let wx = x + 14; wx < 600; wx += 18) {
      const c = k === 4 ? '#1d4f9a' : r() < 0.15 ? '#ff8ac0' : r() < 0.2 ? '#ffe680' : '#3f8fd6';
      ctx.fillStyle = c;
      ctx.fillRect(wx, y + 9, 11, 14);
    }
  });
  // bridge windows across the front
  for (let k = 0; k < 5; k++) rect(ctx, 236 + k * 12 - k * 25, 308 + k * 30, 14, 16, '#1d2f5a', 0);
  // lifeboats
  for (let x = 220; x < 600; x += 62) {
    rr(ctx, x, 404, 44, 16, 8);
    fs(ctx, '#ff8a2a', 2.5);
  }
  // hull with a pink stripe and portholes
  ctx.beginPath();
  ctx.moveTo(70, 450);
  ctx.lineTo(620, 450);
  ctx.lineTo(620, 552);
  ctx.lineTo(160, 552);
  ctx.quadraticCurveTo(100, 520, 70, 450);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, 450, 0, 552, [[0, '#2a4fa8'], [1, '#132f6e']]), 3.5);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#ff3d9a';
  ctx.fillRect(0, 468, 620, 10);
  ctx.fillStyle = '#2ff3ff';
  ctx.fillRect(0, 480, 620, 5);
  ctx.restore();
  for (let x = 170; x < 600; x += 26) circle(ctx, x, 510, 5, '#bfe8ff', 2);
  // anchor
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(122, 494);
  ctx.lineTo(122, 520);
  ctx.moveTo(112, 502);
  ctx.lineTo(132, 502);
  ctx.moveTo(110, 514);
  ctx.quadraticCurveTo(122, 528, 134, 514);
  ctx.stroke();
  // funnel
  poly(ctx, [[430, 300], [446, 220], [520, 220], [526, 300]], '#ffffff', 3);
  ctx.fillStyle = '#ff3d9a';
  ctx.fillRect(442, 236, 80, 16);
  ctx.fillStyle = '#2ff3ff';
  ctx.fillRect(440, 254, 82, 10);
  poly(ctx, [[446, 220], [446, 210], [520, 210], [520, 220]], INK, 2);
  // waterslide: a twisting tube
  ctx.lineCap = 'round';
  const slide = [[300, 300], [300, 250], [340, 236], [370, 260], [340, 286], [380, 296]];
  for (const [lw, c] of [[20, INK], [14, '#ffd23a']]) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = c;
    ctx.beginPath();
    ctx.moveTo(...slide[0]);
    ctx.bezierCurveTo(...slide[1], ...slide[2], ...slide[3]);
    ctx.bezierCurveTo(...slide[4], ...slide[5], 400, 300);
    ctx.stroke();
  }
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#ff4f8b';
  ctx.setLineDash?.([10, 12]);
  ctx.beginPath();
  ctx.moveTo(...slide[0]);
  ctx.bezierCurveTo(...slide[1], ...slide[2], ...slide[3]);
  ctx.bezierCurveTo(...slide[4], ...slide[5], 400, 300);
  ctx.stroke();
  ctx.setLineDash?.([]);
  rect(ctx, 290, 246, 8, 54, '#9aa3b5', 2);
  // masts and flags
  line(ctx, 250, 300, 250, 250, INK, 3);
  for (let k = 0; k < 5; k++) {
    const fx = 250 + k * 34;
    poly(ctx, [[fx, 254 + k * 9], [fx + 14, 262 + k * 9], [fx, 270 + k * 9]], ['#ff3d9a', '#ffd23a', '#2ff3ff', '#7cff6b', '#ff8a4c'][k], 1.5);
  }
  line(ctx, 250, 252, 430, 296, INK, 1.5);
}

function tug(ctx, x, y) {
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(x + 10, y + 46, 120, 12, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 100, y);
  ctx.lineTo(x + 110, y);
  ctx.quadraticCurveTo(x + 105, y + 40, x + 80, y + 44);
  ctx.lineTo(x - 80, y + 44);
  ctx.quadraticCurveTo(x - 100, y + 30, x - 100, y);
  ctx.closePath();
  fs(ctx, '#e8463c', 3);
  line(ctx, x - 98, y + 12, x + 108, y + 12, '#ffffff', 5);
  for (let k = 0; k < 4; k++) circle(ctx, x - 70 + k * 46, y + 28, 10, '#2b2b3a', 2.5);
  rect(ctx, x - 50, y - 50, 90, 50, '#ffffff', 3);
  rect(ctx, x - 30, y - 82, 54, 32, '#ffffff', 3);
  for (let k = 0; k < 3; k++) rect(ctx, x - 26 + k * 17, y - 74, 12, 14, '#3f8fd6', 2);
  rect(ctx, x + 50, y - 70, 20, 70, '#2b2b3a', 3);
  ctx.fillStyle = '#ffd23a';
  ctx.fillRect(x + 51, y - 60, 18, 8);
  for (let k = 0; k < 4; k++) circle(ctx, x + 64 + k * 10, y - 86 - k * 18, 10 + k * 4, 'rgba(240,240,250,0.9)', 2);
}

export default {
  id: 'cruise',
  place: 'PortMiami',
  draw(ctx, w, h) {
    const r = rng(66);
    begin(ctx, w, h);
    sky(ctx, [[0, '#2f7fff'], [0.7, '#86d4ff'], [1, '#d8f4ff']], 0, 400);
    sun(ctx, 90, 90, 40, { rays: 12 });
    cloud(ctx, 310, 90, 60);
    cloud(ctx, 520, 160, 40);
    cloud(ctx, 150, 220, 34);
    gull(ctx, 360, 190, 12);
    gull(ctx, 390, 176, 9);
    gull(ctx, 60, 300, 11);
    // far skyline and port cranes
    for (const [x, ww, top] of [[0, 30, 330], [32, 22, 300], [58, 34, 340], [96, 26, 310], [126, 40, 350]]) {
      rect(ctx, x, top, ww, 400 - top, '#9fb8d8', 2);
      for (let y = top + 8; y < 395; y += 12) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(x + 5, y, ww - 10, 4);
      }
    }
    for (const x of [470, 545]) {
      ctx.strokeStyle = '#ff8a2a';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x, 400);
      ctx.lineTo(x, 300);
      ctx.moveTo(x + 40, 400);
      ctx.lineTo(x + 40, 300);
      ctx.moveTo(x - 30, 300);
      ctx.lineTo(x + 80, 300);
      ctx.moveTo(x, 330);
      ctx.lineTo(x + 40, 360);
      ctx.stroke();
    }
    sea(ctx, 398, 800, '#1f7fd0', '#0e4e9a', r, 'rgba(255,255,255,0.5)', 11);
    line(ctx, 0, 399, 600, 399, INK, 2.5);
    ship(ctx, r);
    // palm island with a little house
    ctx.beginPath();
    ctx.moveTo(-10, 640);
    ctx.bezierCurveTo(40, 590, 200, 590, 250, 640);
    ctx.closePath();
    fs(ctx, lin(ctx, 0, 600, 0, 640, [[0, '#ffe4a0'], [1, '#e9c070']]), 3);
    ctx.beginPath();
    ctx.moveTo(10, 626);
    ctx.bezierCurveTo(50, 598, 180, 598, 230, 630);
    ctx.lineTo(10, 630);
    ctx.closePath();
    fs(ctx, '#5fc25a', 2.5);
    rect(ctx, 100, 584, 56, 34, '#fff4e0', 2.5);
    poly(ctx, [[94, 586], [128, 562], [162, 586]], '#ff7aa8', 2.5);
    rect(ctx, 122, 596, 12, 22, '#2fa37a', 2);
    palm(ctx, 50, 620, 150, 0.15, { size: 0.7 });
    palm(ctx, 200, 624, 120, -0.2, { size: 0.6 });
    // a jumping dolphin
    ctx.save();
    ctx.translate(330, 680);
    ctx.rotate(-0.5);
    ctx.beginPath();
    ctx.moveTo(-60, 10);
    ctx.quadraticCurveTo(-10, -40, 50, -6);
    ctx.quadraticCurveTo(62, 0, 70, 4);
    ctx.quadraticCurveTo(56, 6, 48, 10);
    ctx.quadraticCurveTo(0, 24, -60, 10);
    ctx.closePath();
    fs(ctx, lin(ctx, 0, -30, 0, 20, [[0, '#6f8fb8'], [1, '#c9d8ee']]), 3);
    poly(ctx, [[-6, -16], [4, -40], [14, -14]], '#6f8fb8', 2.5);
    poly(ctx, [[-58, 10], [-82, -6], [-74, 12], [-84, 28]], '#6f8fb8', 2.5);
    circle(ctx, 40, -4, 3, INK, 0);
    ctx.restore();
    for (let k = 0; k < 6; k++) circle(ctx, 270 + k * 12, 724 + (k % 2) * 4, 5, '#ffffff', 0);
    tug(ctx, 470, 690);
    // channel buoy
    poly(ctx, [[46, 790], [60, 700], [88, 700], [102, 790]], '#e8463c', 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(52, 740, 44, 14);
    rect(ctx, 70, 676, 8, 26, INK, 0);
    circle(ctx, 74, 674, 7, '#ffd23a', 2);
    ellipse(ctx, 74, 790, 50, 9, '#c23a32', 2.5);
    end(ctx);
  },
};
