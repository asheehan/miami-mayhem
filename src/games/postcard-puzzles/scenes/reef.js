// Under Biscayne Bay: a gentle manatee drifting over a bright coral reef, with fish, a sea
// turtle, sea fans, brain coral, anemones, sea grass, a starfish and bubbles.
import { begin, end, rect, poly, circle, ellipse, rr, fs, lin, line, fish, bubble, star, speckle, rng, INK, TAU } from './kit.js';

function manatee(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  // paddle tail
  ctx.beginPath();
  ctx.moveTo(120, -10);
  ctx.bezierCurveTo(170, -70, 230, -40, 220, 10);
  ctx.bezierCurveTo(230, 60, 170, 70, 120, 20);
  ctx.closePath();
  fs(ctx, '#8b98ad', 3.5);
  // body
  ctx.beginPath();
  ctx.moveTo(-150, -10);
  ctx.bezierCurveTo(-140, -80, 60, -90, 130, -20);
  ctx.bezierCurveTo(150, 10, 120, 40, 60, 54);
  ctx.bezierCurveTo(-20, 70, -140, 60, -150, -10);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, -80, 0, 60, [[0, '#a9b5c8'], [1, '#7d8aa0']]), 3.5);
  // belly and skin spots
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.ellipse(-10, 50, 150, 30, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(80,90,110,0.25)';
  for (const [sx, sy, sr] of [[-40, -40, 8], [10, -30, 6], [60, -40, 7], [-80, -20, 5], [90, -10, 6], [30, -55, 5]]) {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // flipper
  ctx.beginPath();
  ctx.moveTo(-80, 30);
  ctx.quadraticCurveTo(-90, 80, -50, 90);
  ctx.quadraticCurveTo(-40, 70, -50, 30);
  ctx.closePath();
  fs(ctx, '#7d8aa0', 3);
  // snout, whiskers, eye
  ellipse(ctx, -150, 8, 34, 28, '#9aa7bb', 3.5);
  ellipse(ctx, -165, 14, 14, 10, '#b8c3d4', 2.5);
  for (const [dx, dy] of [[-170, 10], [-162, 18], [-174, 20], [-158, 10]]) circle(ctx, dx, dy, 1.6, INK, 0);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  for (const a of [-0.3, 0, 0.3]) {
    ctx.beginPath();
    ctx.moveTo(-176, 16);
    ctx.lineTo(-198, 16 + a * 30);
    ctx.stroke();
  }
  circle(ctx, -132, -8, 5, INK, 0);
  circle(ctx, -130, -10, 1.6, '#ffffff', 0);
  ctx.beginPath();
  ctx.arc(-150, 22, 12, 0.3, Math.PI - 0.3);
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
}

function turtle(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.2);
  for (const [fx, fy, a] of [[-26, -26, -0.8], [26, -24, 0.6], [-24, 26, 0.6], [24, 24, -0.5]]) ellipse(ctx, fx * 1.4, fy, 22, 9, '#7fc25a', 2.5, INK, a);
  ellipse(ctx, 0, 0, 40, 30, '#8a5a2c', 3);
  for (const [px, py] of [[0, 0], [-18, -10], [18, -10], [-18, 10], [18, 10]]) {
    ctx.beginPath();
    for (let k = 0; k < 6; k++) ctx.lineTo(px + Math.cos((k * TAU) / 6) * 9, py + Math.sin((k * TAU) / 6) * 8);
    ctx.closePath();
    fs(ctx, '#b07a3c', 2);
  }
  ellipse(ctx, -50, 0, 14, 11, '#7fc25a', 2.5);
  circle(ctx, -54, -3, 2.5, INK, 0);
  ctx.restore();
}

function jellyfish(ctx, x, y, s, colour) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = 3;
  for (let k = -2; k <= 2; k++) {
    ctx.beginPath();
    ctx.moveTo(x + k * 7 * s, y);
    ctx.bezierCurveTo(x + k * 7 * s + 8, y + 20 * s, x + k * 7 * s - 8, y + 40 * s, x + k * 7 * s + 4, y + 60 * s);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x - 24 * s, y + 2);
  ctx.bezierCurveTo(x - 26 * s, y - 34 * s, x + 26 * s, y - 34 * s, x + 24 * s, y + 2);
  ctx.quadraticCurveTo(x, y + 10 * s, x - 24 * s, y + 2);
  fs(ctx, colour + 'cc', 2.5);
  circle(ctx, x - 8 * s, y - 14 * s, 4 * s, 'rgba(255,255,255,0.7)', 0);
}

function ray(ctx, x, y) {
  ctx.beginPath();
  ctx.moveTo(x - 70, y);
  ctx.quadraticCurveTo(x - 20, y - 36, x + 6, y - 10);
  ctx.quadraticCurveTo(x + 30, y - 6, x + 56, y + 14);
  ctx.quadraticCurveTo(x + 10, y + 12, x - 4, y + 22);
  ctx.quadraticCurveTo(x - 30, y + 14, x - 70, y);
  fs(ctx, '#3b4a7a', 3);
  for (const [dx, dy] of [[-30, -4], [-14, -12], [0, 4], [16, 2], [-20, 8]]) circle(ctx, x + dx, y + dy, 3, '#ffffff', 0);
  ctx.beginPath();
  ctx.moveTo(x - 2, y + 18);
  ctx.quadraticCurveTo(x - 40, y + 50, x - 90, y + 44);
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  circle(ctx, x + 40, y + 6, 2.5, INK, 0);
}

function brainCoral(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI, 0);
  ctx.closePath();
  fs(ctx, '#e7c25a', 3);
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = '#b8902e';
  ctx.lineWidth = 3;
  for (let k = 0; k < 7; k++) {
    ctx.beginPath();
    const yy = y - r + k * (r / 7) + 6;
    ctx.moveTo(x - r, yy);
    for (let xx = x - r; xx < x + r; xx += 16) ctx.quadraticCurveTo(xx + 8, yy + (k % 2 ? 8 : -8), xx + 16, yy);
    ctx.stroke();
  }
  ctx.restore();
}

function seaFan(ctx, x, y, s, colour) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x - 90 * s, y - 40 * s, x - 70 * s, y - 170 * s, x, y - 160 * s);
  ctx.bezierCurveTo(x + 70 * s, y - 170 * s, x + 90 * s, y - 40 * s, x, y);
  fs(ctx, colour + '99', 3);
  ctx.strokeStyle = colour;
  ctx.lineWidth = 3;
  for (let k = -3; k <= 3; k++) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + k * 18 * s, y - 70 * s, x + k * 22 * s, y - 145 * s + Math.abs(k) * 12 * s);
    ctx.stroke();
  }
  ctx.lineWidth = 1.5;
  for (let k = 1; k < 6; k++) {
    ctx.beginPath();
    ctx.ellipse(x, y - 10 * s, 14 * k * s, 26 * k * s, 0, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
}

function staghorn(ctx, x, y, s, colour) {
  const branch = (bx, by, a, len, depth) => {
    const ex = bx + Math.cos(a) * len;
    const ey = by + Math.sin(a) * len;
    ctx.lineWidth = 15 * s - depth * 3;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.lineWidth = 10 * s - depth * 3;
    ctx.strokeStyle = colour;
    ctx.stroke();
    if (depth < 2) {
      branch(ex, ey, a - 0.5, len * 0.7, depth + 1);
      branch(ex, ey, a + 0.45, len * 0.75, depth + 1);
    }
  };
  branch(x, y, -Math.PI / 2 - 0.4, 50 * s, 0);
  branch(x, y, -Math.PI / 2 + 0.4, 50 * s, 0);
}

function anemone(ctx, x, y, colour) {
  for (let k = 0; k < 9; k++) {
    const a = -Math.PI + (k / 8) * Math.PI;
    const tx = x + Math.cos(a) * 34;
    const ty = y + Math.sin(a) * 40;
    ctx.lineWidth = 9;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo((x + tx) / 2 + 6, (y + ty) / 2, tx, ty);
    ctx.stroke();
    ctx.lineWidth = 5.5;
    ctx.strokeStyle = colour;
    ctx.stroke();
    circle(ctx, tx, ty, 4, '#ffffff', 1.5);
  }
  rr(ctx, x - 18, y - 4, 36, 22, 8);
  fs(ctx, '#7a1fa2', 3);
}

export default {
  id: 'reef',
  place: 'Biscayne Bay',
  draw(ctx, w, h) {
    const r = rng(99);
    begin(ctx, w, h);
    ctx.fillStyle = lin(ctx, 0, 0, 0, 800, [[0, '#56e0f0'], [0.45, '#1aa3d6'], [1, '#0a3d6b']]);
    ctx.fillRect(0, 0, 600, 800);
    // surface ripples
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(600, 0);
    ctx.lineTo(600, 26);
    for (let x = 600; x >= 0; x -= 40) ctx.quadraticCurveTo(x - 20, 40, x - 40, 26);
    ctx.closePath();
    ctx.fill();
    // sun rays
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.moveTo(60 + k * 110, 0);
      ctx.lineTo(110 + k * 110, 0);
      ctx.lineTo(10 + k * 110 + 200, 780);
      ctx.lineTo(-40 + k * 110 + 200, 780);
      ctx.closePath();
      ctx.fill();
    }
    // far reef silhouettes
    for (let k = 0; k < 8; k++) {
      ctx.fillStyle = 'rgba(10,60,110,0.45)';
      ctx.beginPath();
      ctx.arc(40 + k * 80, 560, 50 + (k % 3) * 18, Math.PI, 0);
      ctx.lineTo(40 + k * 80 + 50 + (k % 3) * 18, 700);
      ctx.lineTo(40 + k * 80 - 50 - (k % 3) * 18, 700);
      ctx.fill();
    }
    // a school of little fish
    for (let k = 0; k < 14; k++) {
      const fx = 360 + (k % 5) * 34 + (r() - 0.5) * 14;
      const fy = 90 + Math.floor(k / 5) * 26 + (r() - 0.5) * 10;
      fish(ctx, fx, fy, 0.5, '#d9f2ff', '#9fc4e8', -1);
    }
    jellyfish(ctx, 540, 190, 1.1, '#ff7aa8');
    jellyfish(ctx, 250, 80, 0.7, '#b36bff');
    ray(ctx, 470, 470);
    fish(ctx, 60, 40 + 160, 0.8, '#ffe14d', '#ff8a4c', 1);
    fish(ctx, 300, 160, 0.9, '#ff8a4c', '#ffe14d', -1, '#ffffff');
    fish(ctx, 200, 420, 0.8, '#2ff3ff', '#2f7fd6', 1);
    turtle(ctx, 120, 120);
    manatee(ctx, 300, 300);
    // sand bottom
    ctx.beginPath();
    ctx.moveTo(0, 640);
    ctx.bezierCurveTo(150, 600, 420, 660, 600, 620);
    ctx.lineTo(600, 800);
    ctx.lineTo(0, 800);
    ctx.closePath();
    fs(ctx, lin(ctx, 0, 620, 0, 800, [[0, '#f2dc9c'], [1, '#d8b56a']]), 3);
    speckle(ctx, 0, 650, 600, 150, 90, ['#c9a256', '#fff1c8'], r, 1.6);
    // sea grass
    for (let k = 0; k < 18; k++) {
      const gx = 380 + r() * 220;
      const gh = 60 + r() * 90;
      ctx.lineWidth = 7;
      ctx.strokeStyle = INK;
      ctx.beginPath();
      ctx.moveTo(gx, 700);
      ctx.quadraticCurveTo(gx + 20, 700 - gh / 2, gx + (r() - 0.5) * 30, 700 - gh);
      ctx.stroke();
      ctx.lineWidth = 4;
      ctx.strokeStyle = k % 2 ? '#3fd26b' : '#2fae4a';
      ctx.stroke();
    }
    seaFan(ctx, 80, 650, 1.1, '#b36bff');
    seaFan(ctx, 520, 640, 0.8, '#ff4f8b');
    brainCoral(ctx, 230, 690, 70);
    staghorn(ctx, 380, 700, 1.1, '#ff8a4c');
    staghorn(ctx, 160, 760, 0.8, '#ffd23a');
    anemone(ctx, 470, 740, '#ff7aa8');
    // tube sponges
    for (const [tx, th, c] of [[300, 90, '#7cff6b'], [324, 70, '#2ff3ff'], [344, 56, '#7cff6b']]) {
      rr(ctx, tx - 11, 790 - th, 22, th, 10);
      fs(ctx, c, 3);
      ellipse(ctx, tx, 790 - th + 6, 7, 4, '#1d5a3a', 0);
    }
    star(ctx, 70, 770, 24, '#ff8a2a', 5, 0.45, 3);
    star(ctx, 560, 785, 16, '#ff3d9a', 5, 0.45, 2.5);
    // reef fish
    fish(ctx, 470, 560, 1.3, '#ffe14d', '#2f7fd6', -1, '#2f7fd6');
    fish(ctx, 120, 470, 1.4, '#2f7fd6', '#ffe14d', 1);
    fish(ctx, 300, 530, 1.1, '#ff8a4c', '#ff3d9a', 1, '#ffffff');
    fish(ctx, 560, 380, 1, '#7cff6b', '#2ff3ff', -1);
    fish(ctx, 60, 300, 0.9, '#ff4f8b', '#ffe14d', 1, '#ffffff');
    for (const [bx, by, br] of [[120, 270, 8], [128, 240, 5], [135, 215, 4], [520, 330, 7], [530, 300, 5], [380, 470, 6], [384, 445, 4]]) bubble(ctx, bx, by, br);
    end(ctx);
  },
};
