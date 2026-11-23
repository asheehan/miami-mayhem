// A flamingo lagoon: a flock standing, feeding and flapping in turquoise water with their
// reflections, mangroves and palms behind, water lilies and reeds in front.
import { begin, end, sky, sun, cloud, poly, circle, ellipse, fs, lin, line, palm, rng, INK, TAU } from './kit.js';

const PINK = '#ff7aa8';
const DEEP = '#ff4f8b';

function leg(ctx, x0, y0, x1, y1, kx, ky) {
  for (const [lw, c] of [[7, INK], [3.5, '#ff9ec0']]) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = c;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(kx, ky);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
}

function neck(ctx, pts) {
  for (const [lw, c] of [[17, INK], [11, PINK]]) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = c;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    ctx.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]);
    ctx.stroke();
  }
}

function head(ctx, x, y, down) {
  circle(ctx, x, y, 13, PINK, 3);
  // bent beak: pale with a black tip
  const d = down ? 1 : -1;
  poly(ctx, [[x - 8, y - 4 * d], [x - 30, y + 6 * d], [x - 34, y + 18 * d], [x - 26, y + 14 * d], [x - 6, y + 6 * d]], '#fff1e0', 2.5);
  poly(ctx, [[x - 30, y + 6 * d], [x - 34, y + 18 * d], [x - 26, y + 14 * d]], INK, 1.5);
  circle(ctx, x - 2, y - 3 * d, 3, '#ffe14d', 1.5);
  circle(ctx, x - 2, y - 3 * d, 1.3, INK, 0);
}

// One flamingo facing left with its feet at (x, y). pose: 'stand' | 'oneleg' | 'feed' | 'wings'
function flamingo(ctx, x, y, s, pose, flip = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -s : s, s);
  const by = -150;
  if (pose === 'oneleg') {
    leg(ctx, 4, by + 18, 0, 0, 2, -70);
    leg(ctx, 12, by + 20, 18, by + 70, 34, by + 52);
  } else {
    leg(ctx, -6, by + 18, -16, 0, -6, -72);
    leg(ctx, 10, by + 18, 18, 0, 16, -70);
  }
  if (pose === 'wings') {
    for (const [a, c] of [[-0.9, DEEP], [-0.5, PINK]]) {
      ctx.save();
      ctx.translate(8, by - 4);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(40, -50, 100, -30);
      ctx.quadraticCurveTo(60, 4, 0, 14);
      ctx.closePath();
      fs(ctx, c, 3);
      poly(ctx, [[78, -36], [100, -30], [82, -16]], INK, 1.5);
      ctx.restore();
    }
  }
  // body
  ctx.beginPath();
  ctx.moveTo(-34, by);
  ctx.bezierCurveTo(-36, by - 30, 30, by - 34, 46, by - 8);
  ctx.lineTo(62, by - 4);
  ctx.lineTo(48, by + 6);
  ctx.bezierCurveTo(30, by + 30, -30, by + 30, -34, by);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, by - 30, 0, by + 30, [[0, '#ff9ec0'], [1, DEEP]]), 3);
  ctx.beginPath();
  ctx.ellipse(10, by - 4, 26, 13, 0.15, 0, TAU);
  fs(ctx, DEEP, 2);
  ctx.strokeStyle = '#ffd1e2';
  ctx.lineWidth = 2;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(-2 + k * 10, by - 10);
    ctx.lineTo(10 + k * 10, by + 2);
    ctx.stroke();
  }
  if (pose === 'feed') {
    neck(ctx, [-28, by - 6, -70, by - 40, -80, by + 60, -70, by + 120]);
    head(ctx, -70, by + 124, true);
  } else {
    neck(ctx, [-28, by - 6, -40, by - 60, 10, by - 70, -14, by - 120]);
    head(ctx, -16, by - 126, false);
  }
  ctx.restore();
}

function lily(ctx, x, y, s, flower) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.ellipse(x, y, 34 * s, 12 * s, 0, 0.25, TAU - 0.25);
  ctx.closePath();
  fs(ctx, '#3fae4a', 2.5);
  if (flower) {
    for (let k = 0; k < 6; k++) ellipse(ctx, x + Math.cos(k * 1.05) * 9, y - 6 + Math.sin(k * 1.05) * 4, 9, 4.5, '#ffffff', 1.5, INK, k * 1.05);
    circle(ctx, x, y - 6, 4.5, '#ffd23a', 1.5);
  }
}

export default {
  id: 'flamingos',
  place: 'Flamingo Lagoon',
  draw(ctx, w, h) {
    const r = rng(1010);
    begin(ctx, w, h);
    sky(ctx, [[0, '#8fd0ff'], [0.55, '#ffd1e2'], [1, '#ffe8b0']], 0, 360);
    sun(ctx, 470, 150, 50, { core: '#fffbe0', edge: '#ffd36b', glow: 'rgba(255,220,180,0.5)' });
    cloud(ctx, 140, 100, 50, '#ffffff', 'rgba(255,170,200,0.5)');
    cloud(ctx, 330, 210, 36, '#ffffff', 'rgba(255,170,200,0.5)');
    // flying flamingo silhouettes
    for (const [fx, fy] of [[260, 80], [300, 60], [340, 90]]) {
      line(ctx, fx - 34, fy, fx + 30, fy + 2, DEEP, 4);
      circle(ctx, fx - 36, fy, 4, DEEP, 0);
      ctx.strokeStyle = PINK;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(fx - 20, fy - 16);
      ctx.quadraticCurveTo(fx - 8, fy - 2, fx, fy);
      ctx.quadraticCurveTo(fx + 8, fy - 2, fx + 20, fy - 16);
      ctx.stroke();
    }
    // mangroves and palms on the far shore
    for (let k = 0; k < 12; k++) circle(ctx, k * 56, 350 - (k % 3) * 10, 40, k % 2 ? '#3f9a5a' : '#2f8a4e', 2.5);
    ctx.strokeStyle = '#5a3a22';
    ctx.lineWidth = 3;
    for (let k = 0; k < 30; k++) {
      const mx = k * 20 + 5;
      ctx.beginPath();
      ctx.moveTo(mx, 350);
      ctx.quadraticCurveTo(mx + 8, 365, mx + 4 + (k % 3) * 4, 375);
      ctx.stroke();
    }
    palm(ctx, 70, 360, 180, 0.15, { size: 0.7 });
    palm(ctx, 540, 360, 210, -0.1, { size: 0.75 });
    // lagoon
    ctx.fillStyle = lin(ctx, 0, 370, 0, 800, [[0, '#7fe8e0'], [0.5, '#2fc3c8'], [1, '#1a8fb0']]);
    ctx.fillRect(0, 370, 600, 430);
    line(ctx, 0, 371, 600, 371, INK, 2.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    for (let k = 0; k < 26; k++) {
      const x = r() * 600;
      const y = 390 + r() * 400;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 16 + r() * 30, y);
      ctx.stroke();
    }
    const flock = [
      [120, 600, 1, 'oneleg', false],
      [270, 560, 0.85, 'feed', false],
      [420, 620, 1.05, 'wings', true],
      [530, 520, 0.7, 'stand', true],
      [200, 470, 0.6, 'stand', false],
    ];
    // reflections first, faint and squashed upside down
    ctx.save();
    ctx.globalAlpha = 0.25;
    for (const [fx, fy, fsz, pose, flip] of flock) {
      ctx.save();
      ctx.translate(0, fy);
      ctx.scale(1, -0.6);
      ctx.translate(0, -fy);
      flamingo(ctx, fx, fy, fsz, pose, flip);
      ctx.restore();
    }
    ctx.restore();
    // ripples at the feet
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2.5;
    for (const [fx, fy, fsz] of flock) {
      ctx.beginPath();
      ctx.ellipse(fx, fy, 34 * fsz, 8 * fsz, 0, 0, TAU);
      ctx.stroke();
    }
    lily(ctx, 60, 700, 1, true);
    lily(ctx, 340, 720, 0.8, false);
    lily(ctx, 470, 760, 1.1, true);
    lily(ctx, 560, 680, 0.7, false);
    lily(ctx, 380, 470, 0.6, true);
    for (const [fx, fy, fsz, pose, flip] of flock.slice().sort((a, b) => a[1] - b[1])) flamingo(ctx, fx, fy, fsz, pose, flip);
    // reeds in front
    for (let k = 0; k < 14; k++) {
      const rx = k < 7 ? r() * 90 : 520 + r() * 90;
      const rh = 80 + r() * 90;
      ctx.lineWidth = 6;
      ctx.strokeStyle = INK;
      ctx.beginPath();
      ctx.moveTo(rx, 800);
      ctx.quadraticCurveTo(rx + 10, 800 - rh / 2, rx + (r() - 0.5) * 20, 800 - rh);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#7cbf4a';
      ctx.stroke();
      if (k % 3 === 0) {
        ellipse(ctx, rx, 800 - rh + 4, 6, 18, '#8a5a2c', 2);
      }
    }
    // a dragonfly
    ellipse(ctx, 300, 330, 22, 6, 'rgba(200,240,255,0.8)', 1.5, INK, -0.4);
    ellipse(ctx, 300, 330, 22, 6, 'rgba(200,240,255,0.8)', 1.5, INK, 0.4);
    line(ctx, 280, 330, 324, 330, '#2f7fd6', 5);
    end(ctx);
  },
};
