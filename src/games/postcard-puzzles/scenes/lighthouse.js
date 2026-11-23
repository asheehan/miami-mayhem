// Cape Florida Lighthouse on Key Biscayne: the white tower with its dark lantern room, the
// keeper's cottage, dunes with sea oats, a pelican on a post and sailboats.
import { begin, end, sky, sun, cloud, sea, speckle, rect, poly, circle, ellipse, rr, fs, lin, line, gull, palm, glow, rng, INK, TAU } from './kit.js';

function tower(ctx) {
  const cx = 360;
  // light beams
  ctx.fillStyle = 'rgba(255,245,170,0.35)';
  ctx.beginPath();
  ctx.moveTo(cx - 10, 140);
  ctx.lineTo(0, 60);
  ctx.lineTo(0, 190);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 10, 140);
  ctx.lineTo(600, 90);
  ctx.lineTo(600, 210);
  ctx.closePath();
  ctx.fill();
  glow(ctx, cx, 140, 80, 'rgba(255,240,150,0.7)');
  // tapered white tower, shaded on the right
  poly(ctx, [[cx - 58, 610], [cx - 36, 190], [cx + 36, 190], [cx + 58, 610]], lin(ctx, cx - 58, 0, cx + 58, 0, [[0, '#ffffff'], [0.55, '#f2f4fa'], [1, '#c3c8da']]), 3.5);
  // brick lines
  ctx.strokeStyle = 'rgba(120,130,160,0.35)';
  ctx.lineWidth = 2;
  for (let y = 215; y < 600; y += 22) {
    const half = 36 + ((y - 190) / 420) * 22;
    ctx.beginPath();
    ctx.moveTo(cx - half + 3, y);
    ctx.lineTo(cx + half - 3, y);
    ctx.stroke();
  }
  // windows spiralling up and a door
  for (const [wx, wy] of [[cx - 8, 270], [cx + 10, 360], [cx - 12, 450]]) {
    rr(ctx, wx - 8, wy - 14, 16, 28, 8);
    fs(ctx, '#2b3d6b', 2.5);
  }
  rr(ctx, cx - 18, 548, 36, 62, 18);
  fs(ctx, '#3b6e5a', 3);
  circle(ctx, cx + 8, 582, 3, '#ffd23a', 1);
  // gallery, lantern room and dome
  rect(ctx, cx - 52, 182, 104, 12, '#2b2f45', 3);
  for (let x = cx - 48; x <= cx + 48; x += 12) line(ctx, x, 182, x, 160, '#2b2f45', 3);
  line(ctx, cx - 52, 160, cx + 52, 160, '#2b2f45', 4);
  rect(ctx, cx - 28, 118, 56, 64, '#2b2f45', 3);
  rect(ctx, cx - 20, 124, 40, 50, lin(ctx, 0, 124, 0, 174, [[0, '#fffbd0'], [1, '#ffd23a']]), 2.5);
  line(ctx, cx, 124, cx, 174, '#2b2f45', 3);
  ctx.beginPath();
  ctx.moveTo(cx - 34, 120);
  ctx.quadraticCurveTo(cx, 70, cx + 34, 120);
  ctx.closePath();
  fs(ctx, '#2b2f45', 3);
  circle(ctx, cx, 80, 8, '#2b2f45', 2.5);
  line(ctx, cx, 72, cx, 50, INK, 3);
}

function cottage(ctx) {
  // the keeper's cottage
  rect(ctx, 50, 520, 190, 95, lin(ctx, 0, 520, 0, 615, [[0, '#fff6d8'], [1, '#f1deae']]), 3);
  poly(ctx, [[34, 524], [145, 452], [256, 524]], '#d9534f', 3);
  for (let x = 60; x < 240; x += 18) line(ctx, x, 522, 145 + (x - 145) * 0.15, 460, 'rgba(120,20,20,0.35)', 2);
  rect(ctx, 120, 470, 18, 28, '#c64a3f', 2.5);
  for (const x of [70, 182]) {
    rect(ctx, x, 540, 38, 38, '#9fdcff', 3);
    line(ctx, x + 19, 540, x + 19, 578, INK, 2);
    line(ctx, x, 559, x + 38, 559, INK, 2);
    rect(ctx, x - 12, 538, 11, 42, '#2fa37a', 2.5);
    rect(ctx, x + 39, 538, 11, 42, '#2fa37a', 2.5);
  }
  rect(ctx, 130, 556, 30, 59, '#2fa37a', 3);
  // porch rail
  rect(ctx, 44, 600, 202, 10, '#ffffff', 2.5);
}

function pelicanPost(ctx, x, y) {
  rect(ctx, x - 10, y, 20, 120, '#8a5a3c', 3);
  for (let k = 1; k < 4; k++) line(ctx, x - 8, y + k * 28, x + 8, y + k * 28 - 4, '#5c3a22', 2);
  // pelican: body, neck, long beak with pouch
  ellipse(ctx, x, y - 22, 26, 20, '#b9bfcf', 3);
  ellipse(ctx, x - 6, y - 26, 18, 12, '#8e95aa', 2.5, INK, -0.3);
  ctx.beginPath();
  ctx.moveTo(x + 12, y - 30);
  ctx.quadraticCurveTo(x + 22, y - 60, x + 12, y - 70);
  ctx.lineWidth = 12;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  circle(ctx, x + 12, y - 72, 11, '#ffffff', 3);
  poly(ctx, [[x + 18, y - 76], [x + 62, y - 62], [x + 20, y - 64]], '#ffb347', 2.5);
  ctx.beginPath();
  ctx.moveTo(x + 22, y - 64);
  ctx.quadraticCurveTo(x + 38, y - 48, x + 56, y - 62);
  ctx.closePath();
  fs(ctx, '#ff8a4c', 2);
  circle(ctx, x + 14, y - 75, 2.5, INK, 0);
  line(ctx, x - 6, y - 4, x - 6, y + 2, '#ff8a4c', 4);
  line(ctx, x + 6, y - 4, x + 6, y + 2, '#ff8a4c', 4);
}

function seaOats(ctx, x, y, r) {
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 0.9;
    const len = 40 + r() * 40;
    const tx = x + Math.cos(a) * len;
    const ty = y + Math.sin(a) * len;
    ctx.strokeStyle = k % 2 ? '#7bbf4a' : '#5a9a36';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + 8, y + Math.sin(a) * len * 0.5, tx, ty);
    ctx.stroke();
    if (k % 2 === 0) ellipse(ctx, tx, ty, 4, 9, '#e8c36a', 1.5, INK, a + Math.PI / 2);
  }
}

export default {
  id: 'lighthouse',
  place: 'Cape Florida',
  draw(ctx, w, h) {
    const r = rng(33);
    begin(ctx, w, h);
    sky(ctx, [[0, '#7cc8ff'], [0.55, '#bfe6ff'], [1, '#ffe2b8']], 0, 470);
    sun(ctx, 120, 360, 46, { core: '#fff8c8', edge: '#ffc85a' });
    cloud(ctx, 150, 120, 55);
    cloud(ctx, 500, 250, 42, '#ffffff', 'rgba(255,190,170,0.5)');
    cloud(ctx, 60, 250, 32);
    gull(ctx, 230, 210, 12);
    gull(ctx, 470, 60, 14);
    sea(ctx, 470, 640, '#1e9ed6', '#5fe0d8', r, 'rgba(255,255,255,0.6)', 7);
    // sailboats
    for (const [bx, by, s, c] of [[470, 500, 1, '#ff4f8b'], [560, 482, 0.6, '#ffd23a'], [40, 492, 0.7, '#7c5cff']]) {
      poly(ctx, [[bx - 30 * s, by], [bx + 30 * s, by], [bx + 22 * s, by + 12 * s], [bx - 22 * s, by + 12 * s]], '#ffffff', 2.5);
      poly(ctx, [[bx, by - 4], [bx, by - 70 * s], [bx + 34 * s, by - 4]], c, 2.5);
      poly(ctx, [[bx - 4, by - 4], [bx - 4, by - 52 * s], [bx - 30 * s, by - 4]], '#ffffff', 2.5);
    }
    // rocks with splashes on the right
    for (const [rx, ry, rs] of [[520, 640, 46], [585, 650, 40], [460, 660, 30]]) {
      ctx.beginPath();
      ctx.moveTo(rx - rs, ry + 20);
      ctx.quadraticCurveTo(rx - rs * 0.8, ry - rs * 0.8, rx, ry - rs * 0.7);
      ctx.quadraticCurveTo(rx + rs * 0.9, ry - rs * 0.6, rx + rs, ry + 20);
      ctx.closePath();
      fs(ctx, lin(ctx, rx - rs, 0, rx + rs, 0, [[0, '#9aa0b5'], [1, '#62677d']]), 3);
    }
    for (let k = 0; k < 9; k++) circle(ctx, 500 + r() * 90, 585 + r() * 30, 4 + r() * 6, '#ffffff', 0);
    // dunes and beach
    ctx.beginPath();
    ctx.moveTo(0, 600);
    ctx.bezierCurveTo(150, 570, 300, 600, 450, 640);
    ctx.bezierCurveTo(520, 660, 560, 660, 600, 670);
    ctx.lineTo(600, 800);
    ctx.lineTo(0, 800);
    ctx.closePath();
    fs(ctx, lin(ctx, 0, 600, 0, 800, [[0, '#ffe4a8'], [1, '#efc370']]), 3);
    speckle(ctx, 0, 640, 600, 160, 120, ['#d9a957', '#fff3c8'], r, 1.6);
    // grassy rise under the tower and cottage
    ctx.beginPath();
    ctx.moveTo(0, 610);
    ctx.bezierCurveTo(120, 590, 330, 600, 460, 640);
    ctx.bezierCurveTo(300, 650, 120, 640, 0, 660);
    ctx.closePath();
    fs(ctx, lin(ctx, 0, 600, 0, 660, [[0, '#6fcf5a'], [1, '#3e9e40']]), 3);
    tower(ctx);
    cottage(ctx);
    palm(ctx, 22, 640, 300, 0.1, { size: 0.9 });
    palm(ctx, 258, 630, 210, 0.2, { size: 0.75 });
    // sea grape bushes
    for (const [bx, by] of [[240, 640], [455, 650], [300, 655]]) {
      for (let k = 0; k < 5; k++) circle(ctx, bx + (k - 2) * 16, by - (k % 2) * 12, 16, k % 2 ? '#4caf50' : '#2e8b3e', 2.5);
    }
    for (const [ox, oy] of [[60, 720], [180, 760], [380, 730], [540, 770], [270, 700]]) seaOats(ctx, ox, oy, r);
    pelicanPost(ctx, 470, 700);
    // a starfish and shells on the sand
    for (const [sx, sy] of [[120, 785], [330, 790]]) {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.arc(sx, sy, 10, Math.PI * 1.05, Math.PI * 1.95);
      ctx.closePath();
      fs(ctx, '#ffd6e6', 2);
    }
    end(ctx);
  },
};
