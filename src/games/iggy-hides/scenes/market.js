// The Saturday farmers' market in the park: three rows of striped stalls (flowers, bread,
// honey, juice, pots, fruit, vegetables, cactuses, watermelons, a sausage grill), shoppers
// with baskets packed into the aisles, a juggler, a guitar player, a goat with ideas and a dog
// making off with a sausage.
import { TAU, INK, lin, circle, ellipse, poly, rect, rrect, line, curve, fs, sky, sun, cloud, label, shadow, limb, bunting, alpha } from '../art/kit.js';
import { stall, pot, cactus, crate, lamp, bench } from '../art/scenery.js';
import { person, personAt, randomPerson } from '../art/people.js';
import { dog, goat, bee, chicken, gull } from '../art/animals.js';
import { drawIggy } from '../art/iggy.js';
import { scatter, keepOutOf, depth } from '../art/crowd.js';

const W = 1800;
const H = 1300;
const ROW1 = 520; // back stalls' feet
const ROW2 = 880; // middle stalls' feet
const ROW3 = 1240; // front displays' feet

const sp = (x, y, o = {}) => ({ x, y, ...o });

// --- goods (none of these look like a findable thing) ------------------------------------------

function heap(ctx, x, y, w, rows, draw) {
  for (let j = 0; j < rows; j++) {
    const n = Math.floor(w / 22) - j;
    for (let i = 0; i < n; i++) draw(x - ((n - 1) * 22) / 2 + i * 22, y - 8 - j * 15);
  }
}
const orange = (ctx) => (x, y) => {
  circle(ctx, x, y, 10, '#ff9a2a', 2);
  circle(ctx, x - 3, y - 3, 2.5, 'rgba(255,255,255,0.6)', 0);
};
const apple = (ctx) => (x, y) => {
  circle(ctx, x, y, 10, '#e8303a', 2);
  line(ctx, x, y - 10, x + 2, y - 15, '#6e4426', 2);
};
const lemon = (ctx) => (x, y) => ellipse(ctx, x, y, 11, 8, '#ffe14d', 2);
const lime = (ctx) => (x, y) => ellipse(ctx, x, y, 10, 8, '#7cd34a', 2);
const plum = (ctx) => (x, y) => circle(ctx, x, y, 9, '#8a3ab8', 2);
const tomato = (ctx) => (x, y) => {
  circle(ctx, x, y, 10, '#ff3d3d', 2);
  poly(ctx, [[x - 4, y - 9], [x, y - 13], [x + 4, y - 9]], '#3fae4a', 1);
};
const eggplant = (ctx) => (x, y) => ellipse(ctx, x, y, 7, 12, '#5a2a7a', 2, INK, 0.3);
const cabbage = (ctx) => (x, y) => {
  circle(ctx, x, y, 11, '#a8e070', 2);
  curve(ctx, x - 6, y, x, y - 8, x + 6, y, '#6fae3a', 1.5);
};
const grapes = (ctx) => (x, y) => {
  for (const [dx, dy] of [[-4, -4], [4, -4], [0, 0], [-4, 4], [4, 4], [0, 8]]) circle(ctx, x + dx, y + dy, 4, '#7a3ab8', 1.2);
};

function loaf(ctx, x, y, c = '#d89a4a') {
  ellipse(ctx, x, y, 22, 11, c, 2.5);
  for (const k of [-10, 0, 10]) line(ctx, x + k - 3, y - 6, x + k + 3, y + 2, 'rgba(110,68,38,0.6)', 2);
}
function croissant(ctx, x, y) {
  ctx.beginPath();
  ctx.moveTo(x - 18, y + 4);
  ctx.quadraticCurveTo(x, y - 22, x + 18, y + 4);
  ctx.quadraticCurveTo(x, y - 6, x - 18, y + 4);
  fs(ctx, '#e8b060', 2.5);
}
function jar(ctx, x, y) {
  rrect(ctx, x - 11, y - 26, 22, 26, 5, '#ffb020', 2.5);
  rect(ctx, x - 12, y - 32, 24, 7, '#ff3d5a', 2);
  rect(ctx, x - 7, y - 18, 14, 9, '#fff3d0', 1.2);
}
function tulips(ctx, x, y, c) {
  for (let k = -2; k <= 2; k++) {
    line(ctx, x + k * 5, y, x + k * 8, y - 38, '#3fae4a', 2.5);
    ctx.beginPath();
    ctx.moveTo(x + k * 8 - 6, y - 40);
    ctx.lineTo(x + k * 8 - 6, y - 50);
    ctx.lineTo(x + k * 8 - 2, y - 45);
    ctx.lineTo(x + k * 8 + 2, y - 52);
    ctx.lineTo(x + k * 8 + 6, y - 45);
    ctx.lineTo(x + k * 8 + 6, y - 40);
    ctx.quadraticCurveTo(x + k * 8, y - 33, x + k * 8 - 6, y - 40);
    fs(ctx, k % 2 ? c : '#ffffff', 1.8);
  }
}
function sunflower(ctx, x, y, r = 12) {
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    ellipse(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.55, r * 0.3, '#ffd23a', 1.5, INK, a);
  }
  circle(ctx, x, y, r * 0.6, '#7a4a22', 2);
}
function tinBucket(ctx, x, y, w = 40) {
  poly(ctx, [[x - w / 2, y - w], [x + w / 2, y - w], [x + w * 0.4, y], [x - w * 0.4, y]], '#c9d0de', 2.5);
  line(ctx, x - w * 0.45, y - w * 0.5, x + w * 0.45, y - w * 0.5, 'rgba(22,11,51,0.3)', 2);
}
function watermelonWhole(ctx, x, y, s = 1) {
  ellipse(ctx, x, y, 30 * s, 21 * s, '#2f8a3e', 2.5);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, 30 * s, 21 * s, 0, 0, TAU);
  ctx.clip();
  ctx.strokeStyle = '#7fd36b';
  ctx.lineWidth = 4 * s;
  for (let k = -2; k <= 2; k++) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.abs(k) * 9 * s + 3, 23 * s, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}
function sausages(ctx, x, y) {
  rect(ctx, x - 70, y - 14, 140, 14, '#3a3f55', 2.5);
  for (let k = 0; k < 6; k++) rrect(ctx, x - 64 + k * 22, y - 22, 18, 9, 4, '#c8502a', 1.8);
  for (let k = 0; k < 5; k++) line(ctx, x - 60 + k * 30, y - 26, x - 56 + k * 30, y - 40, 'rgba(200,200,220,0.6)', 3);
}
function cup(ctx, x, y, c) {
  poly(ctx, [[x - 9, y - 26], [x + 9, y - 26], [x + 7, y], [x - 7, y]], c, 2);
  line(ctx, x + 3, y - 26, x + 8, y - 38, '#ffffff', 2.5);
}
function vase(ctx, x, y, c) {
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 40);
  ctx.quadraticCurveTo(x - 22, y - 20, x - 12, y);
  ctx.lineTo(x + 12, y);
  ctx.quadraticCurveTo(x + 22, y - 20, x + 8, y - 40);
  ctx.closePath();
  fs(ctx, c, 2.5);
  line(ctx, x - 14, y - 18, x + 14, y - 18, '#ffffff', 2.5);
}

// A stall with a painted sign. Returns the counter top.
function stallSign(ctx, x, y, w, a, b, text, colour) {
  const top = stall(ctx, x, y, w, a, b, { sign: true });
  label(ctx, text, x, y - 170 - 23, Math.min(22, w * 0.09), colour, { lw: 0 });
  return top;
}

// --- the picture ------------------------------------------------------------------------------

function back(ctx, r) {
  sky(ctx, W, 0, 300, [[0, '#5ab4ff'], [1, '#d8f2ff']]);
  sun(ctx, 1600, 80, 40, { rays: 12 });
  // town behind the park: pastel shopfronts and round trees
  const fronts = ['#ffb8c8', '#ffe9a0', '#a8e0d8', '#c8b8f0', '#ffd0a0', '#b8e0a8'];
  for (let i = 0; i < 12; i++) {
    const bx = i * 155 - 20;
    const bh = 150 + ((i * 53) % 70);
    rect(ctx, bx, 330 - bh, 150, bh, fronts[i % fronts.length], 2.5);
    rect(ctx, bx - 4, 330 - bh - 10, 158, 12, '#ffffff', 2);
    for (let j = 0; j < 3; j++) for (let k = 0; k < Math.floor(bh / 50) - 1; k++) rect(ctx, bx + 18 + j * 44, 330 - bh + 20 + k * 46, 26, 30, '#9fe6ff', 2);
  }
  for (let i = 0; i < 10; i++) {
    const tx = 60 + i * 190 + (i % 2) * 30;
    rect(ctx, tx - 9, 300, 18, 70, '#8a5a3c', 2.5);
    circle(ctx, tx, 280, 58, i % 2 ? '#4fae4a' : '#3f9a3e', 3);
    circle(ctx, tx - 22, 262, 18, 'rgba(255,255,255,0.12)', 0);
  }
  // the park ground: warm paving
  ctx.fillStyle = lin(ctx, 0, 360, 0, H, [[0, '#ead7b0'], [1, '#dcc092']]);
  ctx.fillRect(0, 360, W, H - 360);
  line(ctx, 0, 360, W, 360, INK, 3);
  ctx.strokeStyle = 'rgba(150,110,60,0.25)';
  ctx.lineWidth = 2;
  for (let y = 400; y < H; y += 46) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    for (let x = ((y / 46) % 2) * 45; x < W; x += 90) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 46);
      ctx.stroke();
    }
  }
  // the welcome banner between two posts
  line(ctx, 40, 380, 40, 170, INK, 6);
  line(ctx, 1760, 380, 1760, 170, INK, 6);
  bunting(ctx, 40, 180, 1760, 180, 26, ['#ff3d5a', '#ffd23a', '#2fb5e8', '#3fae4a', '#ff8a2a', '#a64dff'], 40);

  const D = depth();
  const keep = keepOutOf([...iggy, ...items.flatMap((it) => it.spots)]);
  const place = (x, y, hw, hh, fn) => {
    keep.push({ x, y: y - hh / 2, hw, hh: hh / 2 + 20 });
    D.add(y, fn);
  };

  // back row ------------------------------------------------------------------------------
  place(180, ROW1, 140, 220, () => {
    const top = stallSign(ctx, 180, ROW1, 260, '#ff5ab8', '#ffffff', 'FLOWERS', '#ff3d9a');
    tinBucket(ctx, 100, top, 36);
    tulips(ctx, 100, top - 30, '#ff3d5a');
    tinBucket(ctx, 160, top, 36);
    tulips(ctx, 160, top - 30, '#ffd23a');
    tinBucket(ctx, 250, top, 36);
    for (const [dx, dy] of [[-10, -60], [8, -70], [0, -50]]) {
      line(ctx, 250, top - 30, 250 + dx, top + dy, '#3fae4a', 3);
      sunflower(ctx, 250 + dx, top + dy, 10);
    }
  });
  place(480, ROW1, 140, 220, () => {
    const top = stallSign(ctx, 480, ROW1, 260, '#ff8a2a', '#ffffff', 'BAKERY', '#c86a1a');
    loaf(ctx, 400, top - 10);
    loaf(ctx, 446, top - 10, '#c88a3a');
    loaf(ctx, 422, top - 26, '#e8b060');
    croissant(ctx, 580, top - 8);
    croissant(ctx, 600, top - 22);
    // the bread basket Iggy sometimes hides in sits at x 520
    ctx.beginPath();
    ctx.ellipse(520, top - 8, 26, 9, 0, 0, TAU);
    fs(ctx, '#c98f4f', 2.5);
  });
  place(780, ROW1, 140, 220, () => {
    const top = stallSign(ctx, 780, ROW1, 260, '#ffd23a', '#ffffff', 'HONEY', '#c88a00');
    for (let k = 0; k < 6; k++) jar(ctx, 680 + k * 34, top);
    for (let k = 0; k < 4; k++) jar(ctx, 697 + k * 34, top - 34);
    // a beehive box on the ground
    rect(ctx, 880, ROW1 - 70, 50, 70, '#ffffff', 2.5);
    for (let k = 1; k < 4; k++) line(ctx, 880, ROW1 - 70 + k * 17, 930, ROW1 - 70 + k * 17, INK, 2);
  });
  place(1080, ROW1, 140, 220, () => {
    const top = stallSign(ctx, 1080, ROW1, 260, '#2fb5e8', '#ffffff', 'JUICE', '#1f7ab8');
    const cs = ['#ff8a2a', '#ff3d5a', '#7cd34a', '#ffd23a', '#ff5ab8'];
    for (let k = 0; k < 7; k++) cup(ctx, 990 + k * 30, top, cs[k % 5]);
    // a juicer with a pile of oranges
    rrect(ctx, 1150, top - 60, 40, 60, 8, '#c9d0de', 2.5);
    heap(ctx, 1110, top + 4, 60, 2, orange(ctx));
  });
  place(1380, ROW1, 140, 220, () => {
    const top = stallSign(ctx, 1380, ROW1, 260, '#a64dff', '#ffffff', 'POTTERY', '#7a2ab8');
    vase(ctx, 1300, top, '#2fb5e8');
    vase(ctx, 1340, top, '#ff8a2a');
    vase(ctx, 1420, top, '#ffd23a');
    vase(ctx, 1460, top, '#ff5ab8');
    pot(ctx, 1380, top, 40, '#d2703a');
  });
  place(1660, ROW1, 140, 220, () => {
    const top = stallSign(ctx, 1660, ROW1, 250, '#3fae4a', '#ffffff', 'EGGS', '#2f8a3e');
    for (let j = 0; j < 2; j++) {
      rect(ctx, 1580 + j * 90, top - 18, 70, 18, '#d8c8a0', 2);
      for (let k = 0; k < 5; k++) ellipse(ctx, 1588 + j * 90 + k * 13, top - 22, 5.5, 7, k % 2 ? '#ffffff' : '#f2d8b0', 1.5);
    }
  });
  // hens by the egg stall
  for (const [x, f] of [[1560, false], [1770, true]]) {
    D.add(ROW1 + 30, () => {
      ctx.save();
      ctx.translate(x, ROW1 + 30);
      chicken(ctx, { flip: f, colour: f ? '#c98f4f' : '#ffffff', phase: x }, 0);
      ctx.restore();
    });
    keep.push({ x, y: ROW1, hw: 40, hh: 40 });
  }
  // a tall tin of sunflowers in the aisle (Iggy hides in it sometimes)
  place(330, 600, 30, 60, () => {
    tinBucket(ctx, 330, 600, 46);
    for (const [dx, dy] of [[-16, -70], [0, -86], [16, -66]]) {
      line(ctx, 330, 560, 330 + dx, 600 + dy, '#3fae4a', 3);
    }
  });

  // middle row ----------------------------------------------------------------------------
  place(260, ROW2, 160, 220, () => {
    const top = stallSign(ctx, 260, ROW2, 300, '#ff3d5a', '#ffffff', 'FRUIT', '#e8303a');
    heap(ctx, 160, top, 70, 3, orange(ctx));
    heap(ctx, 240, top, 66, 3, apple(ctx));
    heap(ctx, 310, top, 60, 2, lemon(ctx));
    heap(ctx, 370, top, 60, 3, plum(ctx));
    for (let k = 0; k < 3; k++) grapes(ctx)(140 + k * 30, ROW2 - 140);
  });
  place(640, ROW2, 150, 220, () => {
    const top = stallSign(ctx, 640, ROW2, 280, '#3fae4a', '#ffd23a', 'VEGGIES', '#2f8a3e');
    heap(ctx, 550, top, 66, 3, tomato(ctx));
    heap(ctx, 610, top, 50, 2, eggplant(ctx));
    // a big green heap of limes (Iggy-coloured!)
    heap(ctx, 690, top, 70, 4, lime(ctx));
    heap(ctx, 750, top, 50, 2, cabbage(ctx));
  });
  place(980, ROW2, 140, 220, () => {
    const top = stallSign(ctx, 980, ROW2, 270, '#7cd34a', '#ffffff', 'CACTUS', '#2f8a3e');
    cactus(ctx, 890, top, 50);
    cactus(ctx, 940, top, 40);
    cactus(ctx, 1060, top, 56);
    pot(ctx, 1100, top, 30, '#ff8a2a');
    ellipse(ctx, 1100, top - 34, 14, 10, '#4fae4a', 2);
  });
  // more cactuses on the ground in front of it
  place(900, ROW2 + 40, 60, 80, () => {
    cactus(ctx, 860, ROW2 + 40, 44);
    cactus(ctx, 930, ROW2 + 50, 34);
  });
  place(1300, ROW2, 150, 220, () => {
    const top = stallSign(ctx, 1300, ROW2, 280, '#2f8a3e', '#ff4f6a', 'MELONS', '#2f8a3e');
    watermelonWhole(ctx, 1210, top - 18);
    watermelonWhole(ctx, 1270, top - 18);
    watermelonWhole(ctx, 1240, top - 46);
    watermelonWhole(ctx, 1340, top - 18, 0.9);
    ellipse(ctx, 1400, top - 14, 24, 16, '#e8e070', 2.5);
    ellipse(ctx, 1380, top - 34, 22, 15, '#c8e070', 2.5);
  });
  place(1640, ROW2, 140, 240, () => {
    const top = stallSign(ctx, 1640, ROW2, 260, '#ff8a2a', '#3a3f55', 'SAUSAGES', '#ff3d5a');
    sausages(ctx, 1640, top);
    // the cook
    personAt(ctx, 1700, top + 2, { pose: 'hold', flip: true, skin: '#f5c49c', hair: '#2a1a10', hairStyle: 'short', top: '#ffffff', outfit: 'tee', bottom: '#3a3f55', hat: 'chef', phase: 3 }, 0);
  });

  // front row: low displays so the shoppers show ----------------------------------------
  place(180, ROW3, 120, 80, () => {
    crate(ctx, 130, ROW3, 70, 40, '#c98f4f');
    crate(ctx, 210, ROW3, 70, 40, '#c98f4f');
    heap(ctx, 130, ROW3 - 40, 60, 2, orange(ctx));
    heap(ctx, 210, ROW3 - 40, 60, 2, cabbage(ctx));
  });
  // the wheelbarrow of watermelons
  place(1500, ROW3, 110, 90, () => {
    shadow(ctx, 1500, ROW3, 90, 12);
    line(ctx, 1420, ROW3 - 40, 1340, ROW3 - 10, '#6e4426', 6);
    circle(ctx, 1590, ROW3 - 18, 20, '#3a3f55', 2.5);
    watermelonWhole(ctx, 1470, ROW3 - 70, 0.8);
    watermelonWhole(ctx, 1530, ROW3 - 72, 0.8);
    poly(ctx, [[1410, ROW3 - 64], [1590, ROW3 - 64], [1570, ROW3 - 20], [1430, ROW3 - 20]], '#2fb5e8', 3);
  });
  place(1100, ROW3 + 40, 70, 70, () => bench(ctx, 1100, ROW3 + 40, 140, '#3fae4a'));
  D.add(ROW3 + 15, () => {
    personAt(ctx, 1070, ROW3 + 15, randomPerson(901, { pose: 'sit', item: 'drink', hairStyle: 'bun', hair: '#e8e0d0', kid: false }), 0);
  });
  // lamp posts along the aisles
  for (const x of [80, 900, 1740]) place(x, 720, 20, 230, () => lamp(ctx, x, 720, 200, '#2a5a4a'));

  // the shoppers -------------------------------------------------------------------------
  keep.push(
    { x: 560, y: 590, hw: 120, hh: 70 }, // juggler
    { x: 1180, y: 1080, hw: 60, hh: 80 }, // guitar player
    { x: 1460, y: 720, hw: 60, hh: 70 }, // goat and lady
    { x: 1250, y: 610, hw: 50, hh: 90 }, // egg boxes man
    { x: 1420, y: 1060, hw: 300, hh: 30 }, // the dog's dash
    { x: 760, y: 1120, hw: 40, hh: 90 }, // balloon kid
    { x: 260, y: 1050, hw: 40, hh: 80 }, // dad and kid
  );
  const kinds = ['walk', 'stand', 'point', 'hold', 'walk', 'wave', 'stand'];
  const things = ['basket', null, 'drink', null, 'basket', 'phone', null, 'icecream', 'basket'];
  const aisle = (n, y0, y1, seed) => scatter(r, n, { x0: 50, y0, x1: 1760, y1 }, keep, 58).forEach((p, i) => {
    D.add(p.y, () => {
      if (i % 9 === 8) {
        ctx.save();
        ctx.translate(p.x, p.y);
        dog(ctx, { pose: i % 2 ? 'sit' : 'stand', colour: ['#c98f4f', '#3a3f55', '#f2d27a'][i % 3], flip: i % 4 === 0 }, 0);
        ctx.restore();
        return;
      }
      if (i % 11 === 5) {
        ctx.save();
        ctx.translate(p.x, p.y);
        gull(ctx, { pose: 'peck', flip: i % 2 === 0 }, 0);
        ctx.restore();
        return;
      }
      personAt(ctx, p.x, p.y, randomPerson(seed + i, { pose: kinds[i % kinds.length], item: things[i % things.length], flip: i % 2 === 0, hat: i % 4 === 1 ? 'straw' : undefined }), 0);
    });
  });
  aisle(20, ROW1 + 50, 705, 1000);
  aisle(30, ROW2 + 50, 1140, 1100);
  aisle(16, 1170, 1290, 1200);
  D.draw();
}

// --- moving things -----------------------------------------------------------------------------

const loop = (t, period) => (t % period) / period;

const actors = [
  ...[[300, 70, 40, 0], [1000, 110, 50, 0.35], [1500, 160, 34, 0.7]].map(([x, y, s, p]) => ({
    x: W / 2, y, hw: W / 2 + 120, hh: s, over: true,
    draw(ctx, t) {
      cloud(ctx, ((x + t * 7 + p * W) % (W + 240)) - 120, y, s);
    },
  })),
  // the juggler and his ring of oranges
  {
    x: 560, y: 540, hw: 90, hh: 110,
    keep: [{ x: 560, y: 580, hw: 70, hh: 70 }],
    draw(ctx, t) {
      ctx.save();
      ctx.translate(560, 650);
      shadow(ctx, 0, 0, 22);
      person(ctx, { pose: 'cheer', skin: '#c68a5a', hair: '#16101e', hairStyle: 'spiky', top: '#ffd23a', stripes: '#ff3d5a', outfit: 'tee', bottom: '#a64dff', hat: 'party', hatColour: '#2fb5e8', phase: 1 }, t);
      ctx.restore();
      for (let k = 0; k < 4; k++) {
        const a = t * 4 + (k * TAU) / 4;
        circle(ctx, 560 + Math.cos(a) * 46, 490 + Math.sin(a) * 30 - 20, 9, ['#ff9a2a', '#ff3d5a', '#ffd23a', '#2fb5e8'][k], 2);
      }
      // kids watching
      for (const [kx, kf, seed] of [[480, false, 1301], [640, true, 1302]]) {
        ctx.save();
        ctx.translate(kx, 660);
        person(ctx, randomPerson(seed, { kid: true, pose: 'cheer', flip: kf, item: null }), t);
        ctx.restore();
      }
    },
  },
  // a guitar player on an upturned crate, foot tapping, hat out for coins
  {
    x: 1180, y: 1080, hw: 70, hh: 90,
    draw(ctx, t) {
      crate(ctx, 1180, 1120, 50, 36, '#c98f4f');
      ellipse(ctx, 1240, 1120, 18, 6, '#3a3f55', 2);
      circle(ctx, 1236, 1116, 3, '#ffc93a', 0);
      circle(ctx, 1244, 1117, 3, '#ffc93a', 0);
      ctx.save();
      ctx.translate(1180, 1084);
      person(ctx, { pose: 'sit', skin: '#9a6440', hair: '#2a1a10', hairStyle: 'long', top: '#2fb5e8', outfit: 'tee', bottom: '#3a3f55', hat: 'cowboy', hatColour: '#a8743f', phase: 4 }, t);
      ctx.restore();
      ctx.save();
      ctx.translate(1190, 1062);
      ctx.rotate(-0.5 + Math.sin(t * 8) * 0.04);
      ellipse(ctx, 0, 8, 16, 13, '#c86a1a', 2.5);
      ellipse(ctx, 0, -6, 12, 10, '#c86a1a', 2.5);
      circle(ctx, 0, 2, 4, INK, 0);
      rect(ctx, -3, -44, 6, 36, '#6e4426', 2);
      ctx.restore();
      // music notes floating up
      for (let k = 0; k < 2; k++) {
        const p = (t * 0.5 + k * 0.5) % 1;
        const nx = 1210 + p * 40 + Math.sin(p * 9) * 6;
        const ny = 1030 - p * 70;
        ctx.globalAlpha = 1 - p;
        circle(ctx, nx, ny, 4.5, INK, 0);
        line(ctx, nx + 4, ny, nx + 4, ny - 16, INK, 2);
        ctx.globalAlpha = 1;
      }
    },
  },
  // a goat on a lead nibbling a lady's straw hat
  {
    x: 1460, y: 700, hw: 80, hh: 80,
    keep: [{ x: 1460, y: 720, hw: 60, hh: 70 }],
    draw(ctx, t) {
      const nib = Math.max(0, Math.sin(t * 1.5));
      ctx.save();
      ctx.translate(1480, 760);
      person(ctx, { pose: 'hold', flip: true, skin: '#ffd9b8', hair: '#c98f4f', hairStyle: 'pony', top: '#ff7ab6', outfit: 'dress', item: 'basket', mood: nib > 0.6 ? 'wow' : 'smile', phase: 2, hat: nib > 0.6 ? null : 'straw', hatColour: '#ff3d5a' }, t);
      ctx.restore();
      ctx.save();
      ctx.translate(1420, 760);
      goat(ctx, { phase: 1 }, t);
      ctx.restore();
      if (nib > 0.6) {
        ctx.save();
        ctx.translate(1452, 718);
        ctx.rotate(-0.3);
        ellipse(ctx, 0, 0, 20, 6, '#f2d27a', 2);
        ctx.restore();
      }
      curve(ctx, 1450, 730, 1460, 760, 1462, 742, INK, 1.5);
    },
  },
  // a dog dashing off with a string of sausages, the cook shaking a fist
  {
    x: 1400, y: 1050, hw: 340, hh: 70,
    keep: [{ x: 1420, y: 1060, hw: 300, hh: 30 }],
    draw(ctx, t) {
      const k = loop(t, 8);
      if (k > 0.55) return;
      const a = k / 0.55;
      const x = 1700 - a * 600;
      ctx.save();
      ctx.translate(x, 1080);
      shadow(ctx, 0, 0, 24);
      dog(ctx, { pose: 'run', flip: true, colour: '#3a3f55', spot: '#ffffff', ear: '#16101e', phase: 2 }, t);
      ctx.restore();
      for (let i = 0; i < 4; i++) {
        const sx = x - 26 + i * 18 + 10;
        const sy = 1048 + Math.sin(t * 14 + i) * 3 + i * 2;
        rrect(ctx, sx, sy, 16, 8, 4, '#c8502a', 1.8);
      }
    },
  },
  // a kid with a bunch of balloons bobbing
  {
    x: 760, y: 1040, hw: 60, hh: 170,
    keep: [{ x: 760, y: 1120, hw: 40, hh: 90 }],
    draw(ctx, t) {
      const cs = ['#ff3d5a', '#2fb5e8', '#ffd23a'];
      for (let k = 0; k < 3; k++) {
        const bx = 780 + (k - 1) * 22 + Math.sin(t * 1.4 + k) * 5;
        const by = 940 - (k % 2) * 16;
        curve(ctx, 786, 1150 - 60, bx - 4, by + 40, bx, by + 18, INK, 1.3);
        ellipse(ctx, bx, by, 14, 18, cs[k], 2.5);
        ellipse(ctx, bx - 4, by - 6, 3, 5, 'rgba(255,255,255,0.6)', 0);
      }
      ctx.save();
      ctx.translate(770, 1150);
      shadow(ctx, 0, 0, 16);
      person(ctx, { pose: 'hold', kid: true, skin: '#e0a878', hair: '#2a1a10', hairStyle: 'curly', top: '#3fae4a', outfit: 'tee', bottom: '#ffd23a', phase: 5 }, t);
      ctx.restore();
    },
  },
  // a dad giving his kid a shoulder ride, the kid waving a carrot top
  {
    x: 260, y: 1020, hw: 50, hh: 120,
    keep: [{ x: 260, y: 1050, hw: 40, hh: 80 }],
    draw(ctx, t) {
      ctx.save();
      ctx.translate(260, 1120);
      shadow(ctx, 0, 0, 22);
      person(ctx, { pose: 'cheer', skin: '#6e4428', hair: '#16101e', hairStyle: 'short', top: '#ff8a2a', outfit: 'tee', bottom: '#2a4a8a', phase: 3 }, t);
      ctx.restore();
      ctx.save();
      ctx.translate(260, 1046 + Math.abs(Math.sin(t * 7)) * -3);
      person(ctx, { pose: 'sit', kid: true, wave: true, skin: '#6e4428', hair: '#16101e', hairStyle: 'pony', top: '#ff5ab8', outfit: 'dress', phase: 6 }, t);
      ctx.restore();
    },
  },
  // bees buzzing round the honey stall
  {
    x: 780, y: 400, hw: 110, hh: 70, over: true,
    draw(ctx, t) {
      for (let k = 0; k < 3; k++) {
        ctx.save();
        ctx.translate(780 + Math.cos(t * 2 + k * 2) * 90, 400 + Math.sin(t * 3.1 + k) * 40);
        bee(ctx, {}, t);
        ctx.restore();
      }
    },
  },
  // the bunting flags flutter (a light shimmer over the string)
  {
    x: W / 2, y: 200, hw: W / 2, hh: 30, over: true,
    draw(ctx, t, view) {
      const x0 = Math.max(60, view ? view.x0 : 0);
      const x1 = Math.min(W - 60, view ? view.x1 : W);
      for (let x = Math.ceil(x0 / 120) * 120; x < x1; x += 120) {
        const y = 180 + 26 * 2 * 0.5 * (1 - Math.pow((x - 900) / 860, 2)) + 6;
        twirl(ctx, x + 20, y + 4, t + x);
      }
    },
  },
  // a pigeon-ish gull hopping after crumbs by the bakery
  {
    x: 600, y: 760, hw: 50, hh: 30,
    keep: [{ x: 600, y: 760, hw: 40, hh: 25 }],
    draw(ctx, t) {
      const hop = Math.abs(Math.sin(t * 3)) * 6;
      ctx.save();
      ctx.translate(590 + Math.sin(t * 0.7) * 20, 775 - hop);
      gull(ctx, { pose: 'peck', flip: Math.cos(t * 0.7) < 0 }, t);
      ctx.restore();
    },
  },
  // a man carrying a wobbling tower of egg boxes
  {
    x: 1250, y: 580, hw: 60, hh: 110,
    keep: [{ x: 1250, y: 600, hw: 45, hh: 90 }],
    draw(ctx, t) {
      ctx.save();
      ctx.translate(1250, 680);
      shadow(ctx, 0, 0, 22);
      person(ctx, { pose: 'cheer', skin: '#f5c49c', hair: '#b23a1e', hairStyle: 'short', top: '#7cd34a', outfit: 'tee', bottom: '#2a4a8a', mood: 'wow', phase: 7 }, t);
      ctx.restore();
      for (let k = 0; k < 5; k++) {
        ctx.save();
        ctx.translate(1250 + Math.sin(t * 3 + k * 0.6) * k * 2.5, 560 - k * 17);
        rect(ctx, -24, -16, 48, 16, '#d8c8a0', 2);
        ctx.restore();
      }
    },
  },
];

function twirl(ctx, x, y, t) {
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  const k = Math.sin(t * 4);
  ctx.beginPath();
  ctx.ellipse(x, y, 3 + Math.abs(k) * 4, 7, k, 0, TAU);
  ctx.fill();
}

// --- hiding places ----------------------------------------------------------------------------

const iggy = [
  sp(690, 776, { pose: 'peek' }), // in the heap of limes
  sp(330, 556, {
    pose: 'peek',
    cover: (ctx) => {
      // sunflowers nodding in front of him
      sunflower(ctx, 314, 528, 11);
      sunflower(ctx, 350, 516, 10);
    },
  }), // in the tin of sunflowers
  sp(1010, 812, { pose: 'stand', s: 0.8, cover: (ctx) => pot(ctx, 1010, 822, 44, '#d2703a') }), // posing as a cactus
  sp(520, 452, {
    pose: 'peek',
    cover: (ctx) => {
      ctx.beginPath();
      ctx.moveTo(494, 452);
      ctx.lineTo(546, 452);
      ctx.lineTo(540, 466);
      ctx.lineTo(500, 466);
      ctx.closePath();
      fs(ctx, '#c98f4f', 2.5);
      for (const x of [506, 520, 534]) line(ctx, x, 454, x, 464, 'rgba(110,68,38,0.6)', 2);
    },
  }), // in the bread basket
  sp(1195, 352, { pose: 'lie' }), // sunbathing on the juice stall roof, against a green tree
  sp(882, 640, { pose: 'cling', flip: true, s: 0.9 }), // up a lamp post
  sp(1500, 1176, { pose: 'peek' }), // in the wheelbarrow of watermelons
  sp(1380, 806, { pose: 'peek', s: 0.9 }), // between the melons
];

const items = [
  { id: 'mango', prop: 'mango', count: 3, spots: [sp(150, 760), sp(1160, 760), sp(470, 1080), sp(1690, 1180), sp(1010, 1000)] },
  { id: 'carrot', prop: 'carrot', count: 2, spots: [sp(380, 970), sp(1560, 980), sp(60, 1180), sp(1000, 640)] },
  { id: 'flower', prop: 'flower', o: { colour: '#ff5ab8' }, count: 2, spots: [sp(40, 470), sp(1740, 610), sp(820, 1240), sp(430, 720)] },
  { id: 'butterfly', prop: 'butterfly', o: { colour: '#2fb5e8' }, count: 2, spots: [sp(640, 340), sp(1300, 330), sp(60, 860), sp(1760, 1030)] },
  { id: 'bananas', prop: 'bananas', spots: [sp(420, 1180), sp(1530, 590)] },
  { id: 'pineapple', prop: 'pineapple', spots: [sp(1450, 1000), sp(720, 600)] },
  { id: 'cheese', prop: 'cheese', spots: [sp(1610, 470), sp(330, 1240)] },
  { id: 'cupcake', prop: 'cupcake', spots: [sp(620, 470), sp(1280, 1180)] },
  { id: 'coconut', prop: 'coconut', spots: [sp(1200, 470), sp(920, 1100)] },
  { id: 'melon', prop: 'melon', spots: [sp(1290, 1250), sp(170, 1000)] },
  { id: 'lollipop', prop: 'lollipop', spots: [sp(980, 1240), sp(1760, 760)] },
  { id: 'teddy', prop: 'teddy', spots: [sp(60, 640), sp(1000, 470)] },
  { id: 'key', prop: 'key', spots: [sp(700, 1260), sp(1640, 960)] },
  { id: 'sunhat', prop: 'sunhat', o: { colour: '#ff8a2a', band: '#2fb5e8' }, spots: [sp(1760, 470), sp(540, 980)] },
  { id: 'trumpet', prop: 'trumpet', spots: [sp(1100, 960), sp(360, 820)] },
  { id: 'donut', prop: 'donut', spots: [sp(430, 470), sp(1600, 1260)] },
  { id: 'glove', prop: 'glove', o: { colour: '#3fae4a' }, spots: [sp(160, 1100), sp(1400, 1150)] },
  { id: 'snail', prop: 'snail', spots: [sp(1150, 1270), sp(800, 690)] },
];

function sticker(ctx, r, t) {
  ctx.save();
  ctx.scale(r / 100, r / 100);
  ctx.fillStyle = lin(ctx, 0, -100, 0, 100, [[0, '#9fdcff'], [0.45, '#e8f8ff'], [0.46, '#ead7b0'], [1, '#dcc092']]);
  ctx.beginPath();
  ctx.arc(0, 0, 100, 0, TAU);
  ctx.fill();
  stall(ctx, 0, 90, 190, '#3fae4a', '#ffd23a', { h: 150 });
  heap(ctx, -50, 30, 70, 3, lime(ctx));
  heap(ctx, 50, 30, 66, 3, tomato(ctx));
  ctx.translate(0, 34);
  ctx.scale(1.2, 1.2);
  drawIggy(ctx, 'peek', t, {});
  ctx.restore();
}

export default {
  id: 'market',
  name: "Farmers' Market",
  W, H,
  edge: '#dcc092',
  back,
  actors,
  iggy,
  items,
  sticker,
};

