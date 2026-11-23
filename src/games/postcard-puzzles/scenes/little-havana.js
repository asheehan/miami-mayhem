// Little Havana on Calle Ocho: tiled-roof shop fronts, a cafe window, string lights, a giant
// painted rooster statue and a domino table on the tiled plaza.
import { begin, end, sky, cloud, rect, poly, circle, ellipse, rr, fs, lin, line, label, glow, INK, TAU } from './kit.js';

function tiles(ctx, x, y, w) {
  // barrel roof tiles along a ledge
  rect(ctx, x - 6, y, w + 12, 18, '#c9502f', 3);
  for (let k = x; k < x + w; k += 16) {
    ctx.beginPath();
    ctx.arc(k + 8, y + 18, 8, 0, Math.PI);
    fs(ctx, '#e0663c', 2);
  }
}

function archWindow(ctx, x, y, w, h, frame, glass = '#7fd0ff') {
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + w / 2);
  ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  fs(ctx, glass, 3);
  ctx.lineWidth = 4;
  ctx.strokeStyle = frame;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + 4);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h * 0.55);
  ctx.lineTo(x + w, y + h * 0.55);
  ctx.stroke();
}

function balcony(ctx, x, y, w) {
  rect(ctx, x, y, w, 6, '#2b2b3a', 2);
  ctx.strokeStyle = '#2b2b3a';
  ctx.lineWidth = 2.5;
  for (let k = x + 6; k < x + w; k += 10) {
    ctx.beginPath();
    ctx.moveTo(k, y);
    ctx.lineTo(k, y - 24);
    ctx.stroke();
  }
  line(ctx, x, y - 24, x + w, y - 24, '#2b2b3a', 4);
  for (let k = x + 15; k < x + w - 5; k += 20) {
    ctx.beginPath();
    ctx.arc(k, y - 12, 5, 0, TAU);
    ctx.stroke();
  }
}

function facades(ctx) {
  // three shop fronts across the street
  const shops = [
    [-10, 200, 210, '#ffb347', '#2fa37a'],
    [200, 160, 200, '#3fc6c0', '#ffd23a'],
    [400, 210, 210, '#ff7aa8', '#3b6fd6'],
  ];
  for (const [x, top, w, wall, trim] of shops) {
    rect(ctx, x, top, w, 400 - top + 160, lin(ctx, x, 0, x + w, 0, [[0, wall], [1, wall + 'cc']]), 3);
    tiles(ctx, x, top - 18, w);
    // upstairs arched windows with balconies
    archWindow(ctx, x + 30, top + 28, 46, 70, trim);
    archWindow(ctx, x + w - 76, top + 28, 46, 70, trim);
    balcony(ctx, x + 20, top + 104, 66);
    balcony(ctx, x + w - 86, top + 104, 66);
    // decorative band
    for (let k = x + 4; k < x + w - 4; k += 20) {
      poly(ctx, [[k, top + 130], [k + 10, top + 120], [k + 20, top + 130], [k + 10, top + 140]], trim, 1.5);
    }
  }
  // ground floor: cafe with a window counter, a cigar-box shop door, a fruit shop
  rect(ctx, 20, 420, 150, 140, '#ffe9b0', 3);
  rect(ctx, 30, 470, 130, 70, lin(ctx, 0, 470, 0, 540, [[0, '#fff3c8'], [1, '#ffcf6a']]), 3);
  glow(ctx, 95, 505, 90, 'rgba(255,220,130,0.4)');
  // little coffee cups on the counter
  for (let k = 0; k < 4; k++) {
    rr(ctx, 44 + k * 30, 520, 18, 16, 4);
    fs(ctx, '#ffffff', 2);
    circle(ctx, 64 + k * 30, 527, 4, 'rgba(0,0,0,0)', 2);
  }
  rect(ctx, 25, 540, 140, 12, '#8a5a3c', 3);
  rect(ctx, 30, 392, 130, 30, '#2fa37a', 3);
  label(ctx, 'CAFE', 95, 408, 24, '#ffffff', { lw: 4 });
  // coffee cup sign
  rr(ctx, 168, 380, 34, 30, 6);
  fs(ctx, '#ffffff', 3);
  ctx.beginPath();
  ctx.arc(204, 395, 8, -1.2, 1.2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  for (const sx of [178, 192]) {
    ctx.beginPath();
    ctx.moveTo(sx, 374);
    ctx.quadraticCurveTo(sx + 6, 364, sx, 354);
    ctx.stroke();
  }
  // middle door with a striped awning
  rr(ctx, 255, 430, 90, 130, 44);
  fs(ctx, '#6b3f1c', 3);
  line(ctx, 300, 440, 300, 560, INK, 2.5);
  circle(ctx, 290, 500, 4, '#ffd23a', 1.5);
  circle(ctx, 310, 500, 4, '#ffd23a', 1.5);
  for (let k = 0; k < 8; k++) {
    poly(ctx, [[220 + k * 20, 392], [240 + k * 20, 392], [240 + k * 20, 420], [220 + k * 20, 420]], k % 2 ? '#ffffff' : '#e8463c', 0);
  }
  ctx.beginPath();
  ctx.rect(220, 392, 160, 28);
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // right shop window with fruit crates
  rect(ctx, 430, 430, 150, 110, '#bfe8ff', 3);
  for (let k = 0; k < 3; k++) {
    rect(ctx, 440 + k * 46, 500, 40, 34, '#c98f4f', 2.5);
    for (let f = 0; f < 3; f++) circle(ctx, 450 + k * 46 + f * 10, 498, 7, ['#ff8a2a', '#ffd23a', '#7cd34a'][k], 2);
  }
  rect(ctx, 430, 392, 150, 30, '#3b6fd6', 3);
  label(ctx, 'FRUTAS', 505, 408, 22, '#ffd23a', { lw: 4 });
}

function stringLights(ctx) {
  const colours = ['#ff4f8b', '#ffd23a', '#2ff3ff', '#7cff6b', '#ff8a4c'];
  for (const [y0, sag] of [[250, 40], [340, 30]]) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.quadraticCurveTo(300, y0 + sag * 2, 600, y0);
    ctx.stroke();
    for (let k = 0; k <= 14; k++) {
      const t = k / 14;
      const x = 600 * t;
      const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y0 + sag * 2) + t * t * y0;
      const c = colours[k % colours.length];
      glow(ctx, x, y + 9, 16, c + '88');
      ellipse(ctx, x, y + 9, 6, 8, c, 2);
    }
  }
}

function rooster(ctx, x, y) {
  // pedestal
  rect(ctx, x - 70, y + 120, 140, 70, '#f6e7c8', 3);
  for (let k = 0; k < 4; k++) poly(ctx, [[x - 60 + k * 34, y + 140], [x - 43 + k * 34, y + 128], [x - 26 + k * 34, y + 140], [x - 43 + k * 34, y + 152]], ['#ff4f8b', '#2ff3ff', '#ffd23a', '#7cff6b'][k], 2);
  rect(ctx, x - 78, y + 112, 156, 12, '#e0c89a', 3);
  // legs
  line(ctx, x - 14, y + 70, x - 18, y + 112, '#ffb347', 7);
  line(ctx, x + 16, y + 70, x + 18, y + 112, '#ffb347', 7);
  // tail feathers in rainbow arcs
  const tail = ['#2f7fd6', '#3fd26b', '#ffd23a', '#ff8a2a', '#e8463c'];
  tail.forEach((c, i) => {
    ctx.beginPath();
    ctx.moveTo(x + 30, y + 40);
    ctx.quadraticCurveTo(x + 70 + i * 6, y - 70 + i * 20, x + 100 - i * 4, y + 10 + i * 18);
    ctx.quadraticCurveTo(x + 60 + i * 4, y - 10 + i * 18, x + 30, y + 60);
    ctx.closePath();
    fs(ctx, c, 2.5);
  });
  // body painted with dots and swirls
  ellipse(ctx, x, y + 40, 52, 42, '#ffe14d', 3);
  for (const [dx, dy, c] of [[-20, 30, '#ff4f8b'], [6, 50, '#2f7fd6'], [24, 26, '#3fd26b'], [-6, 64, '#ff8a2a']]) circle(ctx, x + dx, y + dy, 7, c, 2);
  ctx.beginPath();
  ctx.ellipse(x + 6, y + 40, 30, 20, -0.3, 0.3, 2.8);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#e8463c';
  ctx.stroke();
  // neck and head
  ctx.beginPath();
  ctx.moveTo(x - 40, y + 30);
  ctx.quadraticCurveTo(x - 50, y - 20, x - 34, y - 40);
  ctx.lineTo(x - 6, y - 30);
  ctx.quadraticCurveTo(x - 10, y + 0, x + 0, y + 10);
  ctx.closePath();
  fs(ctx, '#ff8a2a', 3);
  circle(ctx, x - 26, y - 44, 20, '#ff8a2a', 3);
  // comb, beak, wattle, eye
  for (let k = 0; k < 3; k++) circle(ctx, x - 36 + k * 11, y - 66 + (k % 2) * 3, 8, '#e8463c', 2.5);
  poly(ctx, [[x - 44, y - 48], [x - 64, y - 40], [x - 44, y - 36]], '#ffd23a', 2.5);
  ellipse(ctx, x - 40, y - 26, 6, 10, '#e8463c', 2.5);
  circle(ctx, x - 28, y - 48, 5, '#ffffff', 2);
  circle(ctx, x - 29, y - 48, 2.5, INK, 0);
  // wing
  ctx.beginPath();
  ctx.ellipse(x + 8, y + 44, 26, 16, -0.2, 0, TAU);
  fs(ctx, '#2ff3ff', 2.5);
}

function dominoTable(ctx, x, y) {
  // chairs
  for (const cx of [x - 110, x + 110]) {
    rect(ctx, cx - 22, y - 30, 44, 8, '#2f7fd6', 2.5);
    line(ctx, cx - 18, y - 22, cx - 18, y + 70, INK, 4);
    line(ctx, cx + 18, y - 22, cx + 18, y + 70, INK, 4);
    rect(ctx, cx - 24, y + 20, 48, 10, '#2f7fd6', 2.5);
    line(ctx, cx - 22, y - 30, cx - 22, y - 70, '#2f7fd6', 6);
    line(ctx, cx + 22, y - 30, cx + 22, y - 70, '#2f7fd6', 6);
    rect(ctx, cx - 24, y - 76, 48, 14, '#2f7fd6', 2.5);
  }
  // table top seen slightly from above
  line(ctx, x, y + 20, x, y + 90, INK, 8);
  ellipse(ctx, x, y + 92, 40, 8, '#2b2b3a', 2);
  ctx.beginPath();
  ctx.ellipse(x, y, 100, 34, 0, 0, TAU);
  fs(ctx, '#2e8b57', 3);
  ctx.beginPath();
  ctx.ellipse(x, y, 88, 26, 0, 0, TAU);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#1f6a40';
  ctx.stroke();
  // dominoes in a snake
  const ds = [[-62, -6, 0], [-34, -6, 0], [-6, -6, 0], [20, -2, 0.4], [40, 10, 0], [66, 10, 0]];
  ds.forEach(([dx, dy, a], i) => {
    ctx.save();
    ctx.translate(x + dx, y + dy);
    ctx.rotate(a);
    rr(ctx, -13, -7, 26, 14, 3);
    fs(ctx, '#ffffff', 2);
    line(ctx, 0, -6, 0, 6, INK, 1.5);
    const n1 = (i * 3) % 6 + 1;
    const n2 = (i * 5 + 2) % 6 + 1;
    for (let p = 0; p < n1 && p < 4; p++) circle(ctx, -9 + (p % 2) * 5, -3 + Math.floor(p / 2) * 6, 1.6, INK, 0);
    for (let p = 0; p < n2 && p < 4; p++) circle(ctx, 4 + (p % 2) * 5, -3 + Math.floor(p / 2) * 6, 1.6, INK, 0);
    ctx.restore();
  });
  // two little cups of cafecito
  for (const cx of [x - 70, x + 74]) {
    rr(ctx, cx - 7, y - 26, 14, 12, 3);
    fs(ctx, '#ffffff', 2);
  }
}

export default {
  id: 'little-havana',
  place: 'Little Havana',
  draw(ctx, w, h) {
    begin(ctx, w, h);
    sky(ctx, [[0, '#3a8dff'], [1, '#bfe8ff']], 0, 260);
    cloud(ctx, 120, 70, 44);
    cloud(ctx, 460, 50, 52);
    cloud(ctx, 300, 130, 30);
    facades(ctx);
    // sidewalk
    rect(ctx, -5, 560, 610, 40, '#d9d2c2', 3);
    for (let x = 0; x < 600; x += 40) line(ctx, x, 562, x, 598, 'rgba(22,11,51,0.25)', 2);
    // tiled plaza: a checker of terracotta and cream
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 600, 600, 200);
    ctx.clip();
    for (let j = 0; j < 8; j++) {
      for (let i = 0; i < 16; i++) {
        const y = 600 + j * 26;
        const x = i * 40 - (j % 2) * 20;
        poly(ctx, [[x, y + 13], [x + 20, y], [x + 40, y + 13], [x + 20, y + 26]], (i + j) % 2 ? '#e9a06a' : '#fff1d6', 1.5);
      }
    }
    ctx.restore();
    line(ctx, 0, 600, 600, 600, INK, 3);
    stringLights(ctx);
    // potted plant
    poly(ctx, [[540, 600], [580, 600], [574, 640], [546, 640]], '#c9502f', 3);
    for (let k = 0; k < 5; k++) ellipse(ctx, 560 + (k - 2) * 10, 586 - (k % 2) * 10, 9, 18, '#3fae4a', 2, INK, (k - 2) * 0.4);
    dominoTable(ctx, 210, 690);
    rooster(ctx, 470, 590);
    end(ctx);
  },
};
