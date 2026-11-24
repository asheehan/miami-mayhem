// Ocean Drive on parade day: a row of pastel art-deco hotels with neon signs and balconies of
// waving guests, sidewalk cafes and a hot dog cart, and down the street a marching band, a
// vintage convertible, a giant flamingo float and a conga line, with crowds on both curbs.
import { TAU, INK, lin, circle, ellipse, poly, rect, rrect, line, curve, fs, sky, cloud, palm, label, shadow, limb, neon, glow, windows, awning, bunting, alpha } from '../art/kit.js';
import { umbrella, bench, lamp, pot } from '../art/scenery.js';
import { person, personAt, randomPerson, TOPS } from '../art/people.js';
import { dog, gull, cat } from '../art/animals.js';
import { drawProp } from '../art/props.js';
import { scatter, keepOutOf, depth } from '../art/crowd.js';

const W = 1800;
const H = 1300;
const FOOT = 480; // where the hotels meet the sidewalk
const CURB = 620; // back curb
const CURB2 = 1070; // front curb

const sp = (x, y, o = {}) => ({ x, y, ...o });
const loop = (t, period) => (t % period) / period;

// --- the hotels ---------------------------------------------------------------------------------

const HOTELS = [
  { x: 0, w: 300, top: 130, c: '#ffb3cf', a: '#ff5a9e', name: 'PALMS', neonC: '#ff3d9a' },
  { x: 300, w: 300, top: 90, c: '#9ff0d8', a: '#21c7a8', name: 'BREEZE', neonC: '#2ff3ff' },
  { x: 600, w: 300, top: 150, c: '#d8c0ff', a: '#a64dff', name: 'CORAL', neonC: '#ff8a2a' },
  { x: 900, w: 300, top: 70, c: '#ffd0a8', a: '#ff8a4c', name: 'SUNNY', neonC: '#ffe14d' },
  { x: 1200, w: 300, top: 120, c: '#b8e4ff', a: '#3a7bff', name: 'MARLIN', neonC: '#ff3d9a' },
  { x: 1500, w: 300, top: 100, c: '#fff0a0', a: '#ffb020', name: 'TIDES', neonC: '#7cff6b' },
];

function hotel(ctx, h, r) {
  const { x, w, top, c, a } = h;
  // a stepped crown with a fin
  rect(ctx, x + w * 0.3, top - 44, w * 0.4, 50, c, 3);
  rect(ctx, x + w * 0.42, top - 80, w * 0.16, 40, c, 3);
  rect(ctx, x + w * 0.48, top - 110, w * 0.04, 32, a, 2);
  rect(ctx, x, top, w, FOOT - top, c, 3);
  // eyebrow ledges over each row of windows
  const floors = Math.floor((380 - top - 60) / 80);
  for (let f = 0; f < floors; f++) {
    const fy = 380 - (f + 1) * 80;
    rect(ctx, x + 4, fy + 6, w - 8, 8, a, 2);
    ctx.fillStyle = 'rgba(22,11,51,0.12)';
    ctx.fillRect(x + 4, fy + 14, w - 8, 6);
    windows(ctx, x + 24, fy + 22, w - 48, 50, 4, 1, { glass: '#9fe6ff', lit: '#fff1a0', litChance: 0.25, r, gap: 0.35 });
  }
  // a band of deco stripes down the middle
  for (const dx of [-14, 0, 14]) rect(ctx, x + w / 2 + dx - 3, top + 10, 6, 380 - top - 30, alpha(a, 0.6), 0);
  // ground floor: shop windows and a door under a striped awning
  rect(ctx, x + 20, 410, 90, 66, '#9fe6ff', 2.5);
  rect(ctx, x + w - 110, 410, 90, 66, '#9fe6ff', 2.5);
  rrect(ctx, x + w / 2 - 26, 406, 52, 74, 20, '#5a3a2a', 2.5);
  awning(ctx, x + 10, 380, w - 20, 26, a, '#ffffff', 10);
  rect(ctx, x + 18, 474, 94, 6, '#ffffff', 2);
  rect(ctx, x + w - 112, 474, 94, 6, '#ffffff', 2);
  // the sign board for the neon (the glow is an actor)
  rrect(ctx, x + w / 2 - 90, top + 10, 180, 44, 10, '#2a1a4a', 2.5);
}

// balconies: two per hotel on its upper floor, each a railed slab
const BALCONIES = HOTELS.flatMap((h, i) => [0, 1].map((k) => ({ x: h.x + 40 + k * 150, y: 300 - (i % 2) * 80 + (k ? 0 : 0), hotel: i, k })));
function balconyRail(ctx, bx, by) {
  line(ctx, bx, by - 24, bx + 110, by - 24, INK, 3);
  for (let j = 0; j < 7; j++) line(ctx, bx + 4 + j * 17, by - 24, bx + 4 + j * 17, by, INK, 2);
  rrect(ctx, bx - 6, by, 122, 12, 4, '#ffffff', 2.5);
}
function balcony(ctx, b, flowers) {
  balconyRail(ctx, b.x, b.y);
  if (flowers) {
    rrect(ctx, b.x + 6, b.y - 36, 98, 14, 4, '#a8743f', 2);
    for (let k = 0; k < 6; k++) circle(ctx, b.x + 14 + k * 16, b.y - 40, 5, ['#ff3d5a', '#ffd23a', '#ff8a2a'][k % 3], 1.5);
  }
}

// --- street furniture and parade pieces --------------------------------------------------------

function cafeTable(ctx, x, y, u, seed, t = 0) {
  umbrella(ctx, x, y, 100, u[0], u[1]);
  personAt(ctx, x - 40, y - 10, randomPerson(seed, { pose: 'sit', outfit: 'tee', item: 'drink', kid: false }), t);
  personAt(ctx, x + 40, y - 10, randomPerson(seed + 1, { pose: 'sit', outfit: 'tee', kid: false, flip: true, item: null }), t);
  ellipse(ctx, x, y - 30, 34, 9, '#ffffff', 2.5);
  line(ctx, x, y - 24, x, y, INK, 3);
  circle(ctx, x - 10, y - 36, 5, '#8a5a2c', 1.5);
}

function newsBox(ctx, x, y) {
  shadow(ctx, x, y, 30, 6);
  rrect(ctx, x - 26, y - 70, 52, 70, 4, '#2f7bff', 2.5);
  rect(ctx, x - 18, y - 60, 36, 26, '#e8f4ff', 2);
  for (let k = 0; k < 3; k++) line(ctx, x - 14, y - 54 + k * 7, x + 14, y - 54 + k * 7, 'rgba(22,11,51,0.4)', 2);
  label(ctx, 'NEWS', x, y - 20, 12, '#ffffff', { lw: 0 });
}

function hotDogCart(ctx, x, y) {
  shadow(ctx, x, y + 4, 80, 10);
  circle(ctx, x - 40, y - 12, 14, '#3a3f55', 2.5);
  circle(ctx, x + 40, y - 12, 14, '#3a3f55', 2.5);
  rrect(ctx, x - 70, y - 86, 140, 66, 8, '#ffd23a', 3);
  // a giant sausage on top as the sign
  ellipse(ctx, x, y - 104, 50, 12, '#e8a860', 2.5);
  ellipse(ctx, x, y - 108, 52, 8, '#d2462a', 2);
  curve(ctx, x - 40, y - 108, x - 20, y - 100, x, y - 108, '#ffd23a', 3);
  curve(ctx, x, y - 108, x + 20, y - 100, x + 40, y - 108, '#ffd23a', 3);
  label(ctx, 'DOGS', x, y - 52, 22, '#ff3d5a', { lw: 4, stroke: '#ffffff' });
  line(ctx, x + 60, y - 86, x + 60, y - 200, INK, 4);
  umbrella(ctx, x + 60, y - 86, 120, '#ff3d5a', '#ffd23a');
}

// A tuba player (standing still, puffing). The bell's rim is at (x + 22, y - 136).
function tubaPlayer(ctx, x, y, o) {
  personAt(ctx, x, y, { ...o, pose: 'stand', hat: 'band', outfit: 'suit', top: '#ff3d5a', bottom: '#ffffff', tie: '#ffd23a', hatColour: '#ff3d5a', shoes: '#ffffff' }, 0);
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  // coiled tube round the body and up to a big bell over the shoulder
  ctx.strokeStyle = INK;
  ctx.lineWidth = 15;
  ctx.beginPath();
  ctx.ellipse(-2, -66, 22, 18, 0, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = '#ffc93a';
  ctx.lineWidth = 10;
  ctx.stroke();
  limb(ctx, [[16, -78], [22, -110]], '#ffc93a', 12);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(x + 6, y - 112);
  ctx.lineTo(x - 6, y - 136);
  ctx.lineTo(x + 50, y - 136);
  ctx.lineTo(x + 38, y - 112);
  ctx.closePath();
  fs(ctx, '#ffc93a', 2.5);
  ellipse(ctx, x + 22, y - 136, 28, 7, '#e8a020', 2.5);
}
function tubaRim(x, y) {
  return (ctx) => {
    // the near half of the rim over his hands
    ctx.beginPath();
    ctx.ellipse(x + 22, y - 136, 28, 7, 0, 0, Math.PI);
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffc93a';
    ctx.stroke();
  };
}

const CAR = { x: 380, y: 940 };
function car(ctx) {
  const { x, y } = CAR;
  shadow(ctx, x, y + 4, 180, 16);
  // a long pink convertible with fins and whitewalls
  ctx.beginPath();
  ctx.moveTo(x - 180, y - 30);
  ctx.quadraticCurveTo(x - 190, y - 70, x - 150, y - 76);
  ctx.lineTo(x - 120, y - 76);
  ctx.lineTo(x - 100, y - 70);
  ctx.lineTo(x + 120, y - 70);
  ctx.quadraticCurveTo(x + 180, y - 70, x + 186, y - 30);
  ctx.lineTo(x + 186, y - 14);
  ctx.lineTo(x - 180, y - 14);
  ctx.closePath();
  fs(ctx, '#ff7ab6', 3);
  poly(ctx, [[x - 180, y - 70], [x - 200, y - 104], [x - 150, y - 76]], '#ff7ab6', 2.5);
  line(ctx, x - 176, y - 44, x + 182, y - 44, '#ffffff', 5);
  // windscreen
  poly(ctx, [[x + 40, y - 70], [x + 60, y - 118], [x + 70, y - 118], [x + 56, y - 70]], 'rgba(160,230,255,0.7)', 2.5);
  // seats
  rrect(ctx, x - 120, y - 100, 40, 32, 10, '#ffffff', 2.5);
  rrect(ctx, x - 10, y - 100, 40, 32, 10, '#ffffff', 2.5);
  for (const wx of [x - 110, x + 120]) {
    circle(ctx, wx, y - 14, 26, '#2a2a44', 3);
    circle(ctx, wx, y - 14, 16, '#ffffff', 2);
    circle(ctx, wx, y - 14, 6, '#c9d0de', 1.5);
  }
  circle(ctx, x + 182, y - 50, 8, '#fff6a8', 2);
  rect(ctx, x - 182, y - 22, 10, 10, '#ff3d3d', 1.5);
  // a sign on the side
  rrect(ctx, x - 70, y - 40, 140, 22, 6, '#ffffff', 2);
  label(ctx, 'PARADE QUEEN', x, y - 29, 12, '#ff3d9a', { lw: 0 });
  // a bunch of party balloons tied on the back (round, striped: not the findable balloon)
  for (let k = 0; k < 4; k++) {
    curve(ctx, x - 186, y - 70, x - 200 + k * 6, y - 120, x - 210 + k * 14, y - 160 - (k % 2) * 20, INK, 1.2);
    circle(ctx, x - 210 + k * 14, y - 172 - (k % 2) * 20, 13, ['#ffd23a', '#2fb5e8', '#ffffff', '#ff8a2a'][k], 2);
  }
}

const FLOAT = { x: 1160, y: 930 };
function flamingoFloatBody(ctx) {
  const { x, y } = FLOAT;
  shadow(ctx, x, y + 4, 220, 16);
  // the platform with a skirt of flowers
  rect(ctx, x - 200, y - 110, 400, 100, '#ff9ed2', 3);
  for (let k = 0; k < 20; k++) {
    const fx = x - 190 + k * 20;
    for (let j = 0; j < 4; j++) circle(ctx, fx + (j % 2) * 10, y - 100 + j * 24, 10, ['#ffffff', '#ffd23a', '#ff5ab8'][(k + j) % 3], 1.5);
  }
  rect(ctx, x - 206, y - 120, 412, 14, '#ffffff', 2.5);
  for (const wx of [x - 150, x + 150]) circle(ctx, wx, y - 6, 14, '#2a2a44', 2.5);
  // the giant flamingo's body and legs (head and neck are an actor)
  line(ctx, x - 20, y - 120, x - 24, y - 200, '#e8508a', 9);
  line(ctx, x + 20, y - 120, x + 24, y - 200, '#e8508a', 9);
  ellipse(ctx, x, y - 240, 110, 60, '#ff7ab6', 3);
  ellipse(ctx, x - 26, y - 236, 66, 36, '#ff5a9e', 2.5, INK, -0.1);
  poly(ctx, [[x - 104, y - 254], [x - 156, y - 284], [x - 120, y - 230]], '#ff5a9e', 2.5);
  label(ctx, 'VIVA MIAMI', x, y - 64, 26, '#ffffff', { lw: 5, stroke: '#ff3d9a' });
}
function floatFlowers(x, y) {
  return (ctx) => {
    for (let j = 0; j < 3; j++) for (let k = -2; k <= 2; k++) circle(ctx, x + k * 12, y - 4 - j * 12 + Math.abs(k) * 4, 10, ['#ffffff', '#ffd23a', '#ff5ab8'][(k + j + 5) % 3], 1.5);
  };
}

// --- the picture ------------------------------------------------------------------------------

function back(ctx, r) {
  sky(ctx, W, 0, FOOT, [[0, '#ff9a6a'], [0.45, '#ffc3a0'], [1, '#ffe6c8']]);
  for (const h of HOTELS) hotel(ctx, h, r);
  // balconies: flower boxes on the ones without waving guests
  BALCONIES.forEach((b, i) => balcony(ctx, b, i % 3 !== 0));
  bunting(ctx, 0, 200, 900, 210, 40, ['#ff3d5a', '#ffd23a', '#2fb5e8', '#7cff6b', '#ff5ab8'], 22);
  bunting(ctx, 900, 210, 1800, 190, 40, ['#ff5ab8', '#2fb5e8', '#ffd23a', '#ff8a2a'], 22);
  // sidewalks and the street
  ctx.fillStyle = '#f2e2d0';
  ctx.fillRect(0, FOOT, W, CURB - FOOT);
  for (let x = 0; x < W; x += 60) line(ctx, x, FOOT, x - 20, CURB, 'rgba(160,120,90,0.25)', 2);
  rect(ctx, -4, CURB, W + 8, 14, '#ffffff', 2.5);
  for (let x = 0; x < W; x += 80) rect(ctx, x, CURB, 40, 14, '#ff5a5a', 0);
  ctx.fillStyle = lin(ctx, 0, CURB + 14, 0, CURB2, [[0, '#6a6a80'], [1, '#7a7a90']]);
  ctx.fillRect(0, CURB + 14, W, CURB2 - CURB - 14);
  ctx.setLineDash([40, 30]);
  line(ctx, 0, 845, W, 845, '#ffd23a', 6);
  ctx.setLineDash([]);
  // painted street confetti
  for (let k = 0; k < 220; k++) {
    ctx.fillStyle = TOPS[k % TOPS.length];
    ctx.fillRect(r() * W, CURB + 20 + r() * (CURB2 - CURB - 30), 6, 4);
  }
  rect(ctx, -4, CURB2, W + 8, 14, '#ffffff', 2.5);
  ctx.fillStyle = '#f2e2d0';
  ctx.fillRect(0, CURB2 + 14, W, H - CURB2 - 14);
  for (let x = 0; x < W; x += 60) line(ctx, x, CURB2 + 14, x - 20, H, 'rgba(160,120,90,0.25)', 2);

  const D = depth();
  // things lying on the pavement only need a small clear patch; people may stand just behind
  const keep = keepOutOf([...iggy, ...items.flatMap((it) => it.spots)], 55, 45, 85);
  const place = (x, y, hw, hh, fn) => {
    keep.push({ x, y: y - hh / 2, hw, hh: hh / 2 + 20 });
    D.add(y, fn);
  };
  // back sidewalk: palms, lamps, cafe tables, the news box and the hot dog cart
  for (const px of [150, 870, 1420]) D.add(540, () => palm(ctx, px, 540, 330, px > 1000 ? 0.1 : -0.08, { size: 0.9 }));
  place(560, 600, 20, 230, () => lamp(ctx, 560, 600, 200, '#2a3a5a'));
  place(1500, 600, 20, 230, () => lamp(ctx, 1500, 600, 200, '#2a3a5a'));
  place(280, 560, 90, 90, () => cafeTable(ctx, 280, 560, ['#ff5a9e', '#ffffff'], 11));
  place(1000, 560, 90, 90, () => cafeTable(ctx, 1000, 560, ['#ff8a4c', '#ffffff'], 13));
  place(1720, 560, 80, 90, () => cafeTable(ctx, 1720, 560, ['#ffb020', '#ffffff'], 15));
  place(680, 600, 30, 70, () => newsBox(ctx, 680, 600));
  place(1290, 600, 100, 120, () => hotDogCart(ctx, 1290, 600));
  // a cat asleep on an awning, a dog begging at the hot dog cart
  D.add(380, () => {
    ctx.save();
    ctx.translate(1620, 380);
    cat(ctx, { colour: '#3a3f55', flip: true }, 0);
    ctx.restore();
  });
  place(1200, 610, 30, 50, () => {
    ctx.save();
    ctx.translate(1200, 610);
    dog(ctx, { pose: 'sit', colour: '#f2d27a', tongue: true, collar: '#ff3d5a' }, 0);
    ctx.restore();
  });
  // spectators packed along the back curb
  keep.push({ x: 1160, y: 640, hw: 120, hh: 30 }); // flamingo head
  const backPts = scatter(r, 30, { x0: 20, y0: 585, x1: 1780, y1: 632 }, keep, 34);
  backPts.forEach((p, i) => {
    D.add(p.y, () => personAt(ctx, p.x, p.y, randomPerson(400 + i, { pose: ['cheer', 'wave', 'stand', 'point'][i % 4], outfit: i % 5 ? 'tee' : 'dress', item: i % 6 === 0 ? 'flag' : null, itemColour: TOPS[i % TOPS.length] }), 0.2 * i));
  });
  // the parade, left to right
  place(CAR.x, CAR.y, 200, 140, () => {
    car(ctx);
    ctx.save();
    ctx.translate(CAR.x - 100, CAR.y - 82);
    dog(ctx, { pose: 'sit', colour: '#ffffff', ear: '#e8c098', tongue: true, collar: '#ffd23a', s: 0.9 }, 0);
    ctx.restore();
  });
  // the band: two tubas, drummers are actors
  place(660, 900, 40, 140, () => tubaPlayer(ctx, 660, 900, { skin: '#c68a5a', hair: '#16101e' }));
  place(800, 920, 40, 140, () => tubaPlayer(ctx, 800, 920, { skin: '#f5c49c', hair: '#7a4a22' }));
  place(FLOAT.x, FLOAT.y, 210, 300, () => flamingoFloatBody(ctx));
  // front sidewalk: a bench, a balloon seller, a man up a ladder to see over everyone
  place(240, 1250, 70, 70, () => {
    for (const [lx, ly, k] of [[200, 1250, 0], [240, 1250, 1]]) {
      line(ctx, lx - 20, ly, lx - 6, ly - 150, '#c9d0de', 5);
      line(ctx, lx + 20, ly, lx + 6, ly - 150, '#c9d0de', 5);
      for (let j = 1; j < 6; j++) line(ctx, lx - 20 + j * 2.5, ly - j * 26, lx + 20 - j * 2.5, ly - j * 26, '#c9d0de', 4);
      if (k) break;
    }
    personAt(ctx, 200, 1120, { pose: 'cheer', skin: '#e0a878', hair: '#2a1a10', hairStyle: 'spiky', top: '#2f7bff', outfit: 'tee', bottom: '#3a3f55', mood: 'wow' }, 0);
  });
  place(1620, 1260, 70, 260, () => {
    // balloon seller with a big bunch of round balloons
    for (let k = 0; k < 9; k++) {
      const bx = 1600 + (k % 3) * 26 - 26 + (k > 5 ? 13 : 0);
      const by = 1040 - Math.floor(k / 3) * 28;
      curve(ctx, 1640, 1160, bx, 1120, bx, by + 14, INK, 1);
      circle(ctx, bx + 26, by, 15, TOPS[(k * 3) % TOPS.length], 2);
    }
    personAt(ctx, 1640, 1260, { pose: 'hold', skin: '#9a6440', hair: '#e8e0d0', hairStyle: 'bald', top: '#ff8a2a', outfit: 'tee', bottom: '#2a4a8a', hat: 'cap', hatColour: '#ffd23a' }, 0);
  });
  place(980, 1250, 70, 50, () => bench(ctx, 980, 1250, 140, '#2fb5e8'));
  // the front crowd
  const frontPts = scatter(r, 80, { x0: 20, y0: 1110, x1: 1780, y1: 1298 }, keep, 40);
  frontPts.forEach((p, i) => {
    const seed = 500 + i;
    if (i % 9 === 4) {
      D.add(p.y, () => {
        ctx.save();
        ctx.translate(p.x, p.y);
        dog(ctx, { pose: 'stand', colour: ['#c98f4f', '#3a3f55', '#ffffff'][i % 3], flip: i % 2 === 0 }, 0);
        ctx.restore();
      });
    } else {
      D.add(p.y, () => personAt(ctx, p.x, p.y, randomPerson(seed, { pose: ['cheer', 'stand', 'wave', 'point', 'cheer', 'walk'][i % 6], outfit: i % 4 ? 'tee' : 'dress', item: i % 7 === 0 ? 'flag' : i % 7 === 3 ? 'drink' : null, itemColour: TOPS[(i * 5) % TOPS.length] }), 0.3 * i));
    }
  });
  D.draw();
}

// --- moving things -----------------------------------------------------------------------------

const actors = [
  ...[[300, 50, 34, 0], [1300, 40, 28, 0.5]].map(([x, y, s, p]) => ({
    x: W / 2, y, hw: W / 2 + 120, hh: s, over: true,
    draw(ctx, t) {
      cloud(ctx, ((x + t * 6 + p * W) % (W + 240)) - 120, y, s, '#fff4ea', 'rgba(255,170,140,0.5)');
    },
  })),
  // neon signs flickering on every hotel
  ...HOTELS.map((h, i) => ({
    x: h.x + h.w / 2, y: h.top + 32, hw: 100, hh: 30,
    draw(ctx, t) {
      const off = i === 2 && (t % 4) < 0.5 && (t % 0.16) < 0.08;
      if (!off) glow(ctx, h.x + h.w / 2, h.top + 32, 90, alpha(h.neonC, 0.25));
      neon(ctx, h.name, h.x + h.w / 2, h.top + 32, 30, off ? '#4a3a5a' : h.neonC);
    },
  })),
  // guests waving from every third balcony
  ...BALCONIES.filter((_, i) => i % 3 === 0).map((b, k) => ({
    x: b.x + 55, y: b.y - 40, hw: 60, hh: 50,
    draw(ctx, t) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(b.x - 10, b.y - 120, 130, 120);
      ctx.clip();
      ctx.translate(b.x + 55, b.y + 34);
      ctx.scale(0.8, 0.8);
      person(ctx, randomPerson(600 + k, { pose: k % 2 ? 'wave' : 'cheer', outfit: 'tee', item: null, phase: k }), t);
      ctx.restore();
      balconyRail(ctx, b.x, b.y);
    },
  })),
  // the parade queen waving from the back seat
  {
    x: CAR.x, y: CAR.y - 120, hw: 40, hh: 60,
    draw(ctx, t) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(CAR.x - 40, CAR.y - 230, 100, 160);
      ctx.clip();
      ctx.translate(CAR.x + 10, CAR.y - 60);
      person(ctx, { pose: 'wave', skin: '#e0a878', hair: '#2a1a10', hairStyle: 'bun', top: '#ffd23a', outfit: 'dress', shades: true, hat: 'party', hatColour: '#ff3d9a', phase: 1 }, t);
      ctx.restore();
      // sash and crown sparkle
      if ((t % 1.2) < 0.3) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(CAR.x + 12, CAR.y - 210, 4, 0, TAU);
        ctx.fill();
      }
    },
  },
  // the driver
  {
    x: CAR.x + 110, y: CAR.y - 110, hw: 30, hh: 50,
    draw(ctx, t) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(CAR.x + 60, CAR.y - 220, 90, 150);
      ctx.clip();
      ctx.translate(CAR.x + 100, CAR.y - 50);
      person(ctx, { pose: 'stand', skin: '#6e4428', hair: '#e8e0d0', hairStyle: 'short', top: '#3a3f55', outfit: 'suit', hat: 'cap', hatColour: '#3a3f55', phase: 2 }, t);
      ctx.restore();
    },
  },
  // drum major tossing a baton, leading the band
  {
    x: 940, y: 760, hw: 40, hh: 130,
    keep: [{ x: 940, y: 800, hw: 30, hh: 70 }],
    draw(ctx, t) {
      const k = loop(t, 2.2);
      const by = 700 - Math.sin(k * Math.PI) * 120;
      ctx.save();
      ctx.translate(940, 860);
      shadow(ctx, 0, 0, 20);
      person(ctx, { pose: 'cheer', skin: '#9a6440', hair: '#16101e', top: '#ffffff', outfit: 'suit', bottom: '#ff3d5a', tie: '#ffd23a', hat: 'band', hatColour: '#ffffff', shoes: '#ffffff', phase: 3 }, t);
      ctx.restore();
      ctx.save();
      ctx.translate(944, by);
      ctx.rotate(t * 12);
      line(ctx, -26, 0, 26, 0, '#ffffff', 5);
      circle(ctx, -26, 0, 5, '#ffd23a', 1.5);
      circle(ctx, 26, 0, 5, '#ffd23a', 1.5);
      ctx.restore();
    },
  },
  // drummers marching on the spot
  {
    x: 650, y: 700, hw: 120, hh: 80,
    keep: [{ x: 560, y: 700, hw: 30, hh: 65 }, { x: 740, y: 700, hw: 30, hh: 65 }],
    draw(ctx, t) {
      [[560, 0], [740, 1]].forEach(([x, k]) => {
        const b = Math.abs(Math.sin(t * 6 + k)) * 5;
        ctx.save();
        ctx.translate(x, 760 - b);
        shadow(ctx, 0, b, 18);
        person(ctx, { pose: 'hold', skin: ['#ffd9b8', '#6e4428'][k], hair: '#2a1a10', top: '#ff3d5a', outfit: 'suit', bottom: '#ffffff', tie: '#ffd23a', hat: 'band', hatColour: '#ff3d5a', shoes: '#ffffff', item: 'drum', itemColour: '#2f7bff', phase: k }, t);
        ctx.restore();
        const hit = Math.sin(t * 12 + k) > 0;
        line(ctx, x + 6, 704 - b, x + 20, hit ? 718 - b : 694 - b, '#ffffff', 3);
      });
    },
  },
  // the giant flamingo's neck, nodding to the music
  {
    x: FLOAT.x + 80, y: 580, hw: 120, hh: 140,
    keep: [{ x: FLOAT.x + 90, y: 590, hw: 80, hh: 110 }],
    draw(ctx, t) {
      const { x, y } = FLOAT;
      const nod = Math.sin(t * 2.4) * 10;
      ctx.lineCap = 'round';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 34;
      ctx.beginPath();
      ctx.moveTo(x + 80, y - 260);
      ctx.quadraticCurveTo(x + 150, y - 360, x + 90, y - 420 + nod);
      ctx.stroke();
      ctx.strokeStyle = '#ff7ab6';
      ctx.lineWidth = 27;
      ctx.stroke();
      circle(ctx, x + 90, y - 432 + nod, 30, '#ff7ab6', 3);
      ctx.beginPath();
      ctx.moveTo(x + 110, y - 440 + nod);
      ctx.quadraticCurveTo(x + 160, y - 430 + nod, x + 150, y - 392 + nod);
      ctx.lineTo(x + 112, y - 420 + nod);
      ctx.closePath();
      fs(ctx, '#2a1a2a', 2.5);
      circle(ctx, x + 96, y - 440 + nod, 7, '#ffffff', 2);
      circle(ctx, x + 98, y - 440 + nod, 3.5, INK, 0);
      // party sunglasses on the flamingo
      ellipse(ctx, x + 98, y - 440 + nod, 12, 8, 'rgba(255,61,154,0.75)', 2.5);
    },
  },
  // dancers on the float
  {
    x: FLOAT.x, y: 740, hw: 210, hh: 80,
    keep: [{ x: FLOAT.x - 150, y: 740, hw: 30, hh: 70 }, { x: FLOAT.x + 40, y: 740, hw: 30, hh: 70 }],
    draw(ctx, t) {
      [[FLOAT.x - 150, 0], [FLOAT.x + 40, 1]].forEach(([x, k]) => {
        ctx.save();
        ctx.translate(x, FLOAT.y - 120);
        ctx.rotate(Math.sin(t * 5 + k) * 0.12);
        // a feather headdress behind the head
        for (let f = -2; f <= 2; f++) ellipse(ctx, f * 9, -140, 7, 26, ['#ff3d9a', '#ffd23a', '#2ff3ff', '#ffd23a', '#ff3d9a'][f + 2], 1.5, INK, f * 0.3);
        person(ctx, { pose: 'cheer', skin: ['#c68a5a', '#ffd9b8'][k], hair: '#2a1a10', hairStyle: 'long', top: ['#ffd23a', '#2ff3ff'][k], outfit: 'dress', phase: k * 2 }, t);
        ctx.restore();
      });
    },
  },
  // the conga line snaking along
  {
    x: 1580, y: 900, hw: 220, hh: 110,
    keep: [{ x: 1580, y: 900, hw: 200, hh: 75 }],
    draw(ctx, t) {
      for (let k = 0; k < 6; k++) {
        const x = 1400 + k * 64;
        const y = 960 + Math.sin(t * 3 - k * 0.8) * 12;
        ctx.save();
        ctx.translate(x, y);
        shadow(ctx, 0, 0, 18);
        ctx.rotate(Math.sin(t * 6 - k) * 0.08);
        person(ctx, randomPerson(700 + k, { pose: 'walk', outfit: k % 2 ? 'tee' : 'dress', hat: k === 0 ? 'party' : null, item: null, flip: false, phase: k }), t);
        ctx.restore();
      }
    },
  },
  // a stilt walker in stripy trousers, swaying
  {
    x: 110, y: 760, hw: 60, hh: 220,
    keep: [{ x: 110, y: 760, hw: 30, hh: 150 }],
    draw(ctx, t) {
      const sway = Math.sin(t * 1.6) * 0.06;
      ctx.save();
      ctx.translate(110, 930);
      ctx.rotate(sway);
      shadow(ctx, 0, 0, 24);
      for (const sx of [-10, 10]) {
        rect(ctx, sx - 5, -150, 10, 150, '#ffffff', 2.5);
        for (let k = 0; k < 5; k++) rect(ctx, sx - 5, -150 + k * 30, 10, 15, '#ff3d5a', 0);
      }
      ctx.translate(0, -150);
      person(ctx, { pose: 'cheer', skin: '#f5c49c', hair: '#ff8a2a', hairStyle: 'curly', top: '#a64dff', stripes: '#ffd23a', outfit: 'tee', bottom: '#ff3d5a', hat: 'party', hatColour: '#2fb5e8', phase: 7 }, t);
      ctx.restore();
    },
  },
  // a hot dog seller turning sausages
  {
    x: 1330, y: 520, hw: 30, hh: 50,
    draw(ctx, t) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(1290, 420, 90, 116);
      ctx.clip();
      ctx.translate(1340, 600);
      person(ctx, { pose: 'wave', flip: true, skin: '#f5c49c', hair: '#4a2c18', hairStyle: 'short', top: '#ffffff', outfit: 'tee', hat: 'chef', phase: 4 }, t);
      ctx.restore();
    },
  },
  // a kid on dad's shoulders on the front curb
  {
    x: 1100, y: 1050, hw: 40, hh: 120,
    keep: [{ x: 1100, y: 1060, hw: 30, hh: 100 }],
    draw(ctx, t) {
      ctx.save();
      ctx.translate(1100, 1170);
      shadow(ctx, 0, 0, 22);
      person(ctx, { pose: 'hold', skin: '#c68a5a', hair: '#2a1a10', hairStyle: 'short', top: '#3fae4a', outfit: 'tee', bottom: '#3a3f55', phase: 5 }, t);
      ctx.restore();
      ctx.save();
      ctx.translate(1100, 1048);
      person(ctx, { pose: 'sit', kid: true, wave: true, skin: '#c68a5a', hair: '#2a1a10', hairStyle: 'pony', top: '#ffd23a', outfit: 'tee', bottom: '#ff5ab8', phase: 6 }, t);
      ctx.restore();
    },
  },
  // confetti floating down over the street
  {
    x: W / 2, y: 840, hw: W / 2, hh: 260, over: true,
    draw(ctx, t, view) {
      const x0 = view ? view.x0 : 0;
      const x1 = view ? view.x1 : W;
      for (let i = 0; i < 120; i++) {
        const x = (i * 97.3) % W;
        if (x < x0 - 20 || x > x1 + 20) continue;
        const y = 560 + ((t * (40 + (i % 5) * 9) + i * 53) % 520);
        ctx.save();
        ctx.translate(x + Math.sin(t * 2 + i) * 10, y);
        ctx.rotate(t * 3 + i);
        ctx.fillStyle = TOPS[i % TOPS.length];
        ctx.fillRect(-5, -3, 10, 6);
        ctx.restore();
      }
    },
  },
  // a gull gliding over the rooftops
  {
    x: W / 2, y: 150, hw: W / 2 + 100, hh: 40, over: true,
    draw(ctx, t) {
      ctx.save();
      ctx.translate(W + 60 - loop(t, 20) * (W + 120), 150 + Math.sin(t * 1.5) * 15);
      gull(ctx, { pose: 'fly', flip: true }, t);
      ctx.restore();
    },
  },
];

// --- hiding places ----------------------------------------------------------------------------

const B = (i) => BALCONIES[i];
const iggy = [
  sp(B(4).x + 70, B(4).y - 24, { pose: 'peek' }), // on a mint hotel balcony
  sp(660 + 22, 900 - 136, { pose: 'peek', s: 0.85, cover: tubaRim(660, 900) }), // in the tuba bell
  sp(CAR.x - 150, CAR.y - 76, { pose: 'peek' }), // in the car's back fin seat
  sp(680, 530, { pose: 'peek' }), // on the news box
  sp(FLOAT.x + 150, FLOAT.y - 120, { pose: 'stand', s: 0.9, cover: floatFlowers(FLOAT.x + 150, FLOAT.y - 110) }), // dancing on the float
  sp(1480, 470, { pose: 'cling', flip: false }), // up the lamp post
  sp(1050, 378, { pose: 'lie' }), // sunbathing on an awning
  sp(1650, 474, { pose: 'peek' }), // in a shop window
];

const items = [
  { id: 'trumpet', prop: 'trumpet', spots: [sp(1700, 1020), sp(1460, 1180, { rot: -0.3 })] },
  { id: 'maracas', prop: 'maracas', count: 2, spots: [sp(880, 690), sp(1400, 700), sp(140, 820), sp(500, 1150)] },
  { id: 'tophat', prop: 'tophat', spots: [sp(420, 650), sp(1760, 1170)] },
  { id: 'sunglasses', prop: 'sunglasses', spots: [sp(170, 680), sp(1180, 1200)] },
  { id: 'camera', prop: 'camera', spots: [sp(780, 530), sp(60, 1200)] },
  { id: 'cone', prop: 'cone', spots: [sp(1460, 680), sp(780, 1180)] },
  { id: 'popcorn', prop: 'popcorn', spots: [sp(300, 1010), sp(1260, 1010)] },
  { id: 'ticket', prop: 'ticket', count: 2, spots: [sp(560, 1000), sp(1000, 990), sp(80, 990), sp(1760, 760)] },
  { id: 'key', prop: 'key', spots: [sp(880, 1010), sp(380, 1210)] },
  { id: 'guitar', prop: 'guitar', spots: [sp(1560, 760), sp(660, 1190)] },
  { id: 'flower', prop: 'flower', spots: [sp(B(7).x + 30, B(7).y - 40), sp(B(10).x + 80, B(10).y - 40)] },
  { id: 'cupcake', prop: 'cupcake', spots: [sp(1100, 540), sp(1540, 1220)] },
  { id: 'teddy', prop: 'teddy', spots: [sp(B(2).x + 55, B(2).y - 22), sp(860, 1220)] },
  { id: 'lollipop', prop: 'lollipop', spots: [sp(260, 700), sp(1700, 670)] },
  { id: 'paintbrush', prop: 'paintbrush', spots: [sp(1440, 600, { rot: 0.6 }), sp(40, 700)] },
  { id: 'watch', prop: 'watch', spots: [sp(560, 850, { rot: 1.3 }), sp(1360, 1250, { rot: 0.5 })] },
  { id: 'duck', prop: 'duck', spots: [sp(B(8).x + 30, B(8).y - 18), sp(720, 1260)] },
];

function sticker(ctx, r, t) {
  ctx.save();
  ctx.scale(r / 100, r / 100);
  ctx.fillStyle = lin(ctx, 0, -100, 0, 100, [[0, '#ff9a6a'], [1, '#ffe6c8']]);
  ctx.beginPath();
  ctx.arc(0, 0, 100, 0, TAU);
  ctx.fill();
  rect(ctx, -90, -40, 90, 140, '#ffb3cf', 3);
  rect(ctx, 0, -70, 90, 170, '#9ff0d8', 3);
  for (let k = 0; k < 3; k++) {
    rect(ctx, -84, -20 + k * 34, 78, 6, '#ff5a9e', 1.5);
    rect(ctx, 6, -50 + k * 34, 78, 6, '#21c7a8', 1.5);
  }
  neon(ctx, 'DECO', 0, -82, 30, '#ff3d9a');
  ctx.translate(0, 92);
  ctx.scale(1.1, 1.1);
  drawProp(ctx, 'iggy-stand', {}, t);
  ctx.restore();
}

export default {
  id: 'deco',
  name: 'Ocean Drive Parade',
  W, H,
  edge: '#f2e2d0',
  back,
  actors,
  iggy,
  items,
  sticker,
};
