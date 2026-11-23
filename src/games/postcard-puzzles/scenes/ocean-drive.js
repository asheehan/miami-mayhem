// Ocean Drive at dusk: pastel Art Deco hotels with neon signs, palms and a classic car.
import { begin, end, sky, sun, streak, rect, poly, circle, rr, fs, lin, windows, palm, neon, glow, twinkle, rng, line, INK, TAU, speckle } from './kit.js';

function eyebrows(ctx, x, y, w, rows, gap, colour) {
  for (let k = 0; k < rows; k++) {
    ctx.beginPath();
    ctx.rect(x - 6, y + k * gap, w + 12, 7);
    fs(ctx, colour, 2.5);
  }
}

function leftHotel(ctx, r) {
  // pink hotel with a stepped top and a blade sign
  poly(ctx, [[-10, 600], [-10, 250], [40, 250], [40, 228], [120, 228], [120, 250], [190, 250], [190, 600]], lin(ctx, 0, 0, 190, 0, [[0, '#ffb3d6'], [1, '#ff8cc0']]));
  rect(ctx, 70, 205, 30, 24, '#ffd1e6', 3);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(84, 254, 14, 270);
  for (let k = 0; k < 4; k++) {
    windows(ctx, 10, 280 + k * 62, 160, 34, 4, 1, { glass: '#8fd7ff', lit: '#fff0a0', r, litChance: 0.45, gap: 0.28 });
  }
  eyebrows(ctx, 10, 272, 160, 4, 62, '#ffe0ef');
  // blade sign
  rect(ctx, 172, 150, 40, 220, '#3b1b5e', 3);
  'HOTEL'.split('').forEach((ch, i) => neon(ctx, ch, 192, 175 + i * 42, 34, '#ff4fb0'));
}

function middleHotel(ctx, r) {
  // mint hotel with a ziggurat tower
  poly(ctx, [[190, 600], [190, 190], [410, 190], [410, 600]], lin(ctx, 190, 0, 410, 0, [[0, '#9ff5d6'], [0.5, '#c8fbe8'], [1, '#6fe0bc']]));
  poly(ctx, [[255, 190], [255, 150], [270, 150], [270, 125], [285, 125], [285, 95], [315, 95], [315, 125], [330, 125], [330, 150], [345, 150], [345, 190]], '#b8f8e2');
  line(ctx, 300, 95, 300, 55, INK, 3);
  poly(ctx, [[300, 56], [328, 64], [300, 72]], '#ff3d9a', 2.5);
  // vertical fins
  for (const fx of [222, 292, 302, 372]) rect(ctx, fx, 232, 8, 300, '#ffe14d', 2.5);
  neon(ctx, 'OCEAN', 300, 214, 34, '#2ff3ff');
  // porthole and ribbon windows
  for (let k = 0; k < 4; k++) {
    const y = 262 + k * 66;
    circle(ctx, 258, y, 16, r() < 0.4 ? '#fff0a0' : '#8fd7ff', 3);
    circle(ctx, 342, y, 16, r() < 0.4 ? '#fff0a0' : '#8fd7ff', 3);
    windows(ctx, 232, y + 22, 136, 20, 4, 1, { glass: '#5fc4f0', lit: '#ffe9a0', r, litChance: 0.4, gap: 0.2 });
  }
}

function rightHotel(ctx, r) {
  // lemon hotel with a rounded corner tower
  ctx.beginPath();
  ctx.moveTo(410, 600);
  ctx.lineTo(410, 260);
  ctx.lineTo(560, 260);
  ctx.arc(560, 300, 40, -Math.PI / 2, 0);
  ctx.lineTo(610, 300);
  ctx.lineTo(610, 600);
  ctx.closePath();
  fs(ctx, lin(ctx, 410, 0, 610, 0, [[0, '#ffe98f'], [1, '#ffcf5a']]));
  rect(ctx, 440, 232, 90, 30, '#c9a2ff', 3);
  neon(ctx, 'DECO', 485, 247, 24, '#b36bff');
  for (let k = 0; k < 4; k++) {
    const y = 290 + k * 62;
    windows(ctx, 425, y, 165, 30, 5, 1, { glass: '#8fd7ff', lit: '#fff6c0', r, litChance: 0.4, gap: 0.22 });
  }
  eyebrows(ctx, 425, 282, 165, 4, 62, '#ffffff');
  // round tower stripes
  ctx.strokeStyle = '#ff8a4c';
  ctx.lineWidth = 5;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(420, 272 + k * 8);
    ctx.lineTo(560, 272 + k * 8);
    ctx.stroke();
  }
}

function awning(ctx, x, y, w, a, b) {
  const n = Math.round(w / 18);
  const sw = w / n;
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * sw, y);
    ctx.lineTo(x + (i + 1) * sw, y);
    ctx.lineTo(x + (i + 1) * sw + 4, y + 30);
    ctx.arc(x + (i + 0.5) * sw + 4, y + 30, sw / 2, 0, Math.PI);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? a : b;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.rect(x, y, w + 4, 30);
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function groundFloor(ctx) {
  // lit shop fronts
  for (const [x, w] of [[8, 165], [205, 190], [425, 170]]) {
    rect(ctx, x, 545, w, 55, '#ffd98a', 3);
    for (let k = 1; k < 4; k++) line(ctx, x + (w * k) / 4, 545, x + (w * k) / 4, 600, INK, 2);
    glow(ctx, x + w / 2, 572, w * 0.6, 'rgba(255,230,150,0.35)');
  }
  awning(ctx, 4, 515, 170, '#ffffff', '#ff5fa8');
  awning(ctx, 200, 515, 196, '#ffffff', '#1fc7c7');
  awning(ctx, 420, 515, 176, '#ffffff', '#b36bff');
}

function car(ctx) {
  const tyre = (x, y) => {
    circle(ctx, x, y, 28, '#1d1530', 3);
    circle(ctx, x, y, 19, '#f4f4f4', 2);
    circle(ctx, x, y, 12, lin(ctx, x - 12, y - 12, x + 12, y + 12, [[0, '#ffffff'], [1, '#9aa3b5']]), 2);
    circle(ctx, x, y, 4, '#6a7285', 1.5);
  };
  // shadow
  ctx.fillStyle = 'rgba(10,5,30,0.45)';
  ctx.beginPath();
  ctx.ellipse(300, 768, 175, 14, 0, 0, TAU);
  ctx.fill();
  // roof and windows
  poly(ctx, [[250, 692], [282, 648], [372, 646], [400, 690]], '#f6f6ff');
  poly(ctx, [[264, 690], [287, 656], [322, 655], [322, 690]], lin(ctx, 0, 650, 0, 690, [[0, '#bff2ff'], [1, '#5fb8e8']]), 2.5);
  poly(ctx, [[330, 690], [330, 655], [368, 655], [388, 690]], lin(ctx, 0, 650, 0, 690, [[0, '#bff2ff'], [1, '#5fb8e8']]), 2.5);
  // body with tail fin
  ctx.beginPath();
  ctx.moveTo(140, 742);
  ctx.lineTo(138, 712);
  ctx.quadraticCurveTo(142, 694, 175, 692);
  ctx.lineTo(430, 688);
  ctx.lineTo(462, 664);
  ctx.quadraticCurveTo(470, 690, 464, 742);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, 690, 0, 745, [[0, '#4fe3e0'], [1, '#1aa7b3']]), 3.5);
  // white side spear and chrome line
  poly(ctx, [[190, 712], [440, 706], [440, 722], [230, 724]], '#f6f6ff', 2.5);
  line(ctx, 150, 702, 455, 698, '#e8eef8', 3);
  // wheel arches
  ctx.fillStyle = '#1a3d4d';
  for (const wx of [205, 392]) {
    ctx.beginPath();
    ctx.arc(wx, 742, 34, Math.PI, 0);
    ctx.fill();
  }
  tyre(205, 744);
  tyre(392, 744);
  // bumpers and lights
  rr(ctx, 128, 728, 34, 16, 7);
  fs(ctx, lin(ctx, 0, 728, 0, 744, [[0, '#ffffff'], [1, '#9aa3b5']]), 2.5);
  rr(ctx, 448, 728, 26, 16, 7);
  fs(ctx, lin(ctx, 0, 728, 0, 744, [[0, '#ffffff'], [1, '#9aa3b5']]), 2.5);
  glow(ctx, 120, 712, 60, 'rgba(255,240,170,0.6)');
  circle(ctx, 142, 712, 8, '#fff6b0', 2.5);
  poly(ctx, [[456, 676], [466, 672], [467, 694], [458, 694]], '#ff4060', 2);
  // driver's sunglasses face peeking
  circle(ctx, 345, 676, 11, '#a5653a', 2);
  rect(ctx, 336, 672, 18, 5, INK, 0);
}

export default {
  id: 'ocean-drive',
  place: 'Ocean Drive',
  draw(ctx, w, h) {
    const r = rng(11);
    begin(ctx, w, h);
    sky(ctx, [[0, '#2b1055'], [0.3, '#7a1fa2'], [0.62, '#ff3d9a'], [1, '#ffb35c']], 0, 520);
    for (let i = 0; i < 18; i++) twinkle(ctx, r() * 600, r() * 150, 2 + r() * 4, 'rgba(255,255,255,0.85)');
    sun(ctx, 300, 300, 70, { core: '#fff3a0', edge: '#ffb03b', glow: 'rgba(255,200,120,0.5)' });
    streak(ctx, 20, 120, 200, 16, 'rgba(255,150,200,0.7)');
    streak(ctx, 360, 95, 230, 18, 'rgba(255,170,210,0.6)');
    streak(ctx, 420, 150, 150, 12, 'rgba(255,190,120,0.7)');
    streak(ctx, 70, 170, 120, 10, 'rgba(255,200,140,0.6)');
    middleHotel(ctx, r);
    leftHotel(ctx, r);
    rightHotel(ctx, r);
    groundFloor(ctx);
    // sidewalk with tiles
    rect(ctx, -5, 600, 610, 42, lin(ctx, 0, 600, 0, 642, [[0, '#ffd2e6'], [1, '#f2a9cc']]), 3);
    for (let x = 0; x < 600; x += 40) line(ctx, x, 602, x - 10, 640, 'rgba(22,11,51,0.25)', 2);
    // street, wet with neon reflections
    ctx.fillStyle = lin(ctx, 0, 642, 0, 800, [[0, '#4a3470'], [1, '#22163d']]);
    ctx.fillRect(0, 642, 600, 158);
    for (const [x, c] of [[192, 'rgba(255,79,176,0.35)'], [300, 'rgba(47,243,255,0.3)'], [485, 'rgba(179,107,255,0.35)']]) {
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = c;
        ctx.fillRect(x - 16 + (k % 2) * 6, 652 + k * 10, 32 - k * 3, 4);
      }
    }
    for (let x = -20; x < 600; x += 80) rect(ctx, x, 784, 44, 7, '#ffe14d', 0);
    speckle(ctx, 0, 650, 600, 150, 60, ['rgba(255,255,255,0.12)'], r, 1.5);
    palm(ctx, 40, 650, 400, 0.12, { size: 1.05 });
    palm(ctx, 572, 650, 360, -0.16, { size: 1 });
    car(ctx);
    end(ctx);
  },
};
