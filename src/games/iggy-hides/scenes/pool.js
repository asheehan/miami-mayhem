// A hotel pool party: a pink hotel behind, cabanas, a DJ and a pool bar along the back,
// a big blue pool full of floats and swimmers, a diving board and a twisty waterslide, and
// rows of loungers, cacti and potted palms across the front deck.
import { TAU, INK, lin, circle, ellipse, poly, rect, rrect, line, curve, fs, sky, cloud, palm, label, shadow, limb, neon, glow, windows, bunting, awning } from '../art/kit.js';
import { umbrella, towel, lounger, cactus, crocFloat, ringFloat, flamingoFloat, palmPot, pot } from '../art/scenery.js';
import { person, personAt, randomPerson } from '../art/people.js';
import { dog, gull, parrot } from '../art/animals.js';
import { drawProp } from '../art/props.js';
import { scatter, keepOutOf, depth } from '../art/crowd.js';

const W = 1800;
const H = 1300;
const GROUND = 330; // the hotel's foot, where the deck starts
const PX0 = 180;
const PX1 = 1540;
const PY0 = 470; // far edge of the pool
const PY1 = 880; // near edge

const poolFill = (ctx) => lin(ctx, 0, PY0, 0, PY1, [[0, '#2fb9ec'], [0.5, '#3fd2f2'], [1, '#6ee6f4']]);

// Pool water drawn over the part of a floating thing below the waterline at y.
function poolCover(x, y, w = 44) {
  return (ctx, t) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - w, y + 2);
    for (let k = -w; k <= w; k += 8) ctx.lineTo(x + k, y + Math.sin(k / 9 + t * 3) * 1.5);
    ctx.lineTo(x + w, y + 56);
    ctx.lineTo(x - w, y + 56);
    ctx.closePath();
    ctx.fillStyle = poolFill(ctx);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, w * 0.8, 5, 0, 0, Math.PI);
    ctx.stroke();
  };
}

const sp = (x, y, o = {}) => ({ x, y, ...o });

// --- set pieces -------------------------------------------------------------------------------

function hotel(ctx, r) {
  // a pink deco tower in the middle, mint wings either side, balconies all over
  const wing = (x, w, top, c) => {
    rect(ctx, x, top, w, GROUND - top, c, 3);
    windows(ctx, x + 20, top + 24, w - 40, GROUND - top - 60, Math.round(w / 70), 3, { glass: '#9fe6ff', lit: '#fff1a0', litChance: 0.15, r });
    for (let k = 0; k < 3; k++) rect(ctx, x + 6, top + 20 + k * ((GROUND - top - 60) / 3) + 52, w - 12, 6, '#ffffff', 2);
  };
  wing(0, 520, 110, '#9ff0d8');
  wing(1280, 520, 110, '#9ff0d8');
  rect(ctx, 500, 10, 800, GROUND - 10, '#ffb3cf', 3);
  // rounded deco stripes and eyebrows
  for (let k = 0; k < 4; k++) rect(ctx, 500, 60 + k * 64, 800, 10, '#ff7ab6', 2);
  windows(ctx, 540, 80, 720, 200, 9, 3, { glass: '#9fe6ff', lit: '#fff1a0', litChance: 0.2, r });
  // balconies with railings
  for (let k = 0; k < 4; k++) {
    const bx = 560 + k * 180;
    rrect(ctx, bx - 10, 170, 120, 14, 4, '#ffffff', 2.5);
    for (let j = 0; j < 7; j++) line(ctx, bx - 4 + j * 18, 150, bx - 4 + j * 18, 170, INK, 2);
    line(ctx, bx - 10, 150, bx + 110, 150, INK, 3);
  }
  rrect(ctx, 760, 18, 280, 52, 12, '#3a1a5a', 3);
}

function cabana(ctx, x, y, a, b) {
  // a striped tent, (x, y) the middle of its front at the floor
  shadow(ctx, x, y + 2, 110, 14);
  rect(ctx, x - 100, y - 150, 200, 150, 'rgba(22,11,51,0.25)', 0);
  rect(ctx, x - 100, y - 18, 200, 18, '#f2e6c8', 2.5);
  // the curtains, tied back
  poly(ctx, [[x - 100, y - 150], [x - 60, y - 150], [x - 84, y - 70], [x - 70, y], [x - 100, y]], '#ffffff', 2.5);
  poly(ctx, [[x + 100, y - 150], [x + 60, y - 150], [x + 84, y - 70], [x + 70, y], [x + 100, y]], '#ffffff', 2.5);
  circle(ctx, x - 84, y - 70, 5, a, 1.5);
  circle(ctx, x + 84, y - 70, 5, a, 1.5);
  awning(ctx, x - 112, y - 184, 224, 34, a, b, 8);
  poly(ctx, [[x - 112, y - 184], [x, y - 230], [x + 112, y - 184]], a, 2.5);
  line(ctx, x, y - 230, x, y - 250, INK, 2.5);
  poly(ctx, [[x, y - 250], [x + 18, y - 244], [x, y - 238]], b === '#ffffff' ? '#ffd23a' : b, 1.5);
}

function djBooth(ctx, x, y) {
  // speakers
  for (const sx of [x - 140, x + 140]) {
    rrect(ctx, sx - 30, y - 110, 60, 110, 6, '#2a2a44', 2.5);
    circle(ctx, sx, y - 76, 18, '#4a4a6a', 2.5);
    circle(ctx, sx, y - 76, 7, '#2a2a44', 2);
    circle(ctx, sx, y - 30, 12, '#4a4a6a', 2.5);
  }
  // the booth
  rrect(ctx, x - 100, y - 70, 200, 70, 8, '#a64dff', 3);
  for (let k = 0; k < 5; k++) rect(ctx, x - 88 + k * 36, y - 52, 26, 8, ['#ff3d9a', '#ffd23a', '#2fb5e8', '#7cff6b', '#ff8a2a'][k], 1.5);
  label(ctx, 'DJ', x, y - 24, 26, '#ffffff', { lw: 4 });
  rect(ctx, x - 106, y - 78, 212, 10, '#2a2a44', 2.5);
  circle(ctx, x - 50, y - 80, 14, '#3a3a5a', 2);
  circle(ctx, x + 50, y - 80, 14, '#3a3a5a', 2);
}

const BAR_TOP = 372;
function bar(ctx, x0, x1, y) {
  // back shelf with glass jars (no bottles), a thatched roof, the counter
  rect(ctx, x0 + 20, y - 200, x1 - x0 - 40, 120, '#8a5a3c', 3);
  for (let k = 0; k < 3; k++) line(ctx, x0 + 20, y - 170 + k * 34, x1 - 20, y - 170 + k * 34, '#6e4426', 4);
  const jars = ['#ff8a2a', '#7cff6b', '#ff3d9a', '#ffd23a', '#2fb5e8'];
  for (let j = 0; j < 2; j++) {
    for (let k = 0; k < 9; k++) {
      const jx = x0 + 44 + k * ((x1 - x0 - 80) / 8.5);
      rrect(ctx, jx - 9, y - 196 + j * 34, 18, 24, 5, jars[(k + j) % jars.length], 2);
    }
  }
  rect(ctx, x0 + 10, y - 260, 12, 200, '#a8743f', 2.5);
  rect(ctx, x1 - 22, y - 260, 12, 200, '#a8743f', 2.5);
  // grass roof
  ctx.beginPath();
  ctx.moveTo(x0 - 30, y - 220);
  for (let k = 0; k <= 24; k++) ctx.lineTo(x0 - 30 + ((x1 - x0 + 60) * k) / 24, y - 220 + (k % 2 ? 16 : 4));
  ctx.lineTo(x1 + 10, y - 270);
  ctx.lineTo(x0 - 10, y - 270);
  ctx.closePath();
  fs(ctx, '#e8c070', 3);
  for (let k = 0; k < 16; k++) line(ctx, x0 + k * ((x1 - x0) / 15), y - 268, x0 - 20 + k * ((x1 - x0 + 30) / 15), y - 214, 'rgba(160,110,40,0.6)', 2);
  label(ctx, 'TIKI BAR', (x0 + x1) / 2, y - 244, 24, '#ff3d9a', { lw: 4, stroke: '#ffffff' });
  // the counter front with bamboo
  rect(ctx, x0, BAR_TOP, x1 - x0, y - BAR_TOP, '#c98f4f', 3);
  for (let k = x0 + 16; k < x1; k += 22) line(ctx, k, BAR_TOP + 6, k, y - 4, 'rgba(110,68,38,0.5)', 5);
  rect(ctx, x0 - 8, BAR_TOP - 10, x1 - x0 + 16, 12, '#8a5a3c', 3);
  // stools
  for (let k = 0; k < 4; k++) {
    const sx = x0 + 50 + k * ((x1 - x0 - 100) / 3);
    line(ctx, sx, y + 30, sx, y - 20, INK, 4);
    ellipse(ctx, sx, y - 22, 18, 6, '#ff3d5a', 2.5);
  }
}

function slide(ctx) {
  // a tower with a ladder and a twisting blue tube that splashes into the pool
  for (const lx of [1660, 1760]) rect(ctx, lx - 6, 160, 12, 560, '#e8e0d0', 2.5);
  for (let y = 190; y < 700; y += 34) line(ctx, 1760, y, 1790, y, INK, 3);
  line(ctx, 1790, 170, 1790, 710, INK, 3);
  rect(ctx, 1640, 150, 140, 16, '#ffffff', 2.5);
  // tube
  const tube = [[1650, 165], [1560, 230], [1700, 330], [1560, 430], [1680, 520], [1560, 610], [1500, 660]];
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  tube.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = INK;
  ctx.lineWidth = 52;
  ctx.stroke();
  ctx.strokeStyle = '#2f7bff';
  ctx.lineWidth = 46;
  ctx.stroke();
  ctx.strokeStyle = '#7fb8ff';
  ctx.lineWidth = 10;
  ctx.stroke();
  // a flag on top
  line(ctx, 1770, 150, 1770, 90, INK, 3);
  poly(ctx, [[1770, 90], [1800 - 4, 98], [1770, 106]], '#ff3d5a', 2);
}

function divingBoard(ctx) {
  rect(ctx, 60, 520, 40, 90, '#e8e0d0', 2.5);
  rrect(ctx, 40, 506, 300, 16, 6, '#2fb5e8', 2.5);
  for (let k = 0; k < 4; k++) line(ctx, 60 + k * 70, 510, 80 + k * 70, 518, 'rgba(255,255,255,0.6)', 3);
}

function deckTiles(ctx) {
  ctx.fillStyle = lin(ctx, 0, GROUND, 0, H, [[0, '#f2e2c0'], [1, '#e8cfa0']]);
  ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.strokeStyle = 'rgba(160,120,70,0.25)';
  ctx.lineWidth = 2;
  for (let y = GROUND + 40; y < H; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let x = 0; x < W; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  line(ctx, 0, GROUND, W, GROUND, INK, 3);
}

function pool(ctx) {
  // coping, then water with wobbly light lines and lane tiles on the bottom
  rrect(ctx, PX0 - 18, PY0 - 18, PX1 - PX0 + 36, PY1 - PY0 + 36, 40, '#ffffff', 3);
  rrect(ctx, PX0, PY0, PX1 - PX0, PY1 - PY0, 26, '#2fb9ec', 3);
  ctx.save();
  rrect(ctx, PX0, PY0, PX1 - PX0, PY1 - PY0, 26);
  ctx.clip();
  ctx.fillStyle = poolFill(ctx);
  ctx.fillRect(PX0, PY0, PX1 - PX0, PY1 - PY0);
  for (let k = 0; k < 4; k++) rect(ctx, PX0 + 120, PY0 + 70 + k * 100, PX1 - PX0 - 240, 8, 'rgba(20,90,160,0.25)', 0);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 3;
  for (let j = 0; j < 9; j++) {
    for (let i = 0; i < 12; i++) {
      const x = PX0 + 40 + i * 115 + (j % 2) * 50;
      const y = PY0 + 30 + j * 46;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 15, y - 8, x + 30, y);
      ctx.quadraticCurveTo(x + 45, y + 8, x + 60, y);
      ctx.stroke();
    }
  }
  ctx.restore();
  // pool steps and a ladder
  for (let k = 0; k < 3; k++) rect(ctx, PX1 - 120 + k * 0, PY1 - 30 - k * 24, 100, 24, 'rgba(255,255,255,0.35)', 2);
  for (const lx of [PX0 + 60, PX0 + 100]) curve(ctx, lx, PY0 - 30, lx + 8, PY0 - 10, lx, PY0 + 40, '#c9d0de', 5);
  label(ctx, '4 FT', PX0 + 80, PY1 + 9, 14, '#2a4a8a', { lw: 0 });
  label(ctx, 'NO DIVING', 1300, PY1 + 9, 14, '#ff3d5a', { lw: 0 });
}

function plantPot(ctx, x, y) {
  // a big pot with a fan palm; Iggy can peek over its rim
  pot(ctx, x, y, 70, '#ff8a4c');
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 2 + (k - 3) * 0.42;
    ctx.save();
    ctx.translate(x, y - 64);
    ctx.rotate(a + Math.PI / 2);
    ellipse(ctx, 0, -46, 12, 46, k % 2 ? '#3fae4a' : '#2f8a3e', 2.5);
    line(ctx, 0, -6, 0, -86, '#1d7a33', 2);
    ctx.restore();
  }
}
// Leaves drawn again over something peeking from the pot.
function potLeaves(x, y) {
  return (ctx) => {
    for (const k of [0, 6]) {
      const a = -Math.PI / 2 + (k - 3) * 0.42;
      ctx.save();
      ctx.translate(x, y - 64);
      ctx.rotate(a + Math.PI / 2);
      ellipse(ctx, 0, -46, 12, 46, k % 2 ? '#3fae4a' : '#2f8a3e', 2.5);
      ctx.restore();
    }
    rrect(ctx, x - 38, y - 64, 76, 8, 3, '#ff8a4c', 2.5);
  };
}

function towelCart(ctx, x, y) {
  shadow(ctx, x, y + 2, 80, 10);
  rect(ctx, x - 70, y - 90, 140, 80, '#ffffff', 3);
  for (let k = 0; k < 3; k++) for (let j = 0; j < 3; j++) rrect(ctx, x - 64 + k * 44, y - 84 + j * 24, 40, 20, 6, ['#2fb5e8', '#ff8a2a', '#ffd23a'][(k + j) % 3], 2);
  circle(ctx, x - 50, y - 6, 9, '#3a3f55', 2.5);
  circle(ctx, x + 50, y - 6, 9, '#3a3f55', 2.5);
}

// a green inflatable dinosaur pool toy (decoy)
function dinoFloat(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  const g = '#7cd34a';
  ellipse(ctx, 0, -10, 46, 18, g, 2.5);
  curve(ctx, -40, -14, -70, -18, -80, -4, INK, 13);
  curve(ctx, -40, -14, -70, -18, -80, -4, g, 8);
  limb(ctx, [[30, -20], [44, -60], [52, -78]], g, 16);
  ellipse(ctx, 60, -84, 18, 12, g, 2.5);
  circle(ctx, 62, -90, 4, '#ffffff', 1.5);
  circle(ctx, 63, -90, 2, INK, 0);
  for (let k = 0; k < 4; k++) poly(ctx, [[-24 + k * 14, -26], [-18 + k * 14, -38], [-12 + k * 14, -26]], '#ffd23a', 1.5);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 4, 54, 6, 0, 0, Math.PI);
  ctx.stroke();
  ctx.restore();
}

function noodle(ctx, x, y, rot, c) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  rrect(ctx, -60, -8, 120, 15, 7, c, 2.5);
  ctx.restore();
}

function swimmer(ctx, x, y, o, t = 0, k = 0.85) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  person(ctx, { pose: 'swim', outfit: 'swim', ...o }, t);
  ctx.restore();
}

// --- the picture ------------------------------------------------------------------------------

function back(ctx, r) {
  sky(ctx, W, 0, GROUND, [[0, '#4aa8ff'], [1, '#bfeaff']]);
  hotel(ctx, r);
  palm(ctx, 470, GROUND + 10, 300, -0.1, { size: 0.95 });
  palm(ctx, 1330, GROUND + 10, 290, 0.12, { size: 0.9 });
  bunting(ctx, 0, 120, 500, 140, 30, ['#ff3d5a', '#ffd23a', '#2fb5e8', '#7cff6b', '#ff5ab8'], 14);
  bunting(ctx, 1300, 140, 1800, 120, 30, ['#ff5ab8', '#2fb5e8', '#ffd23a', '#ff8a2a'], 14);
  deckTiles(ctx);
  pool(ctx);
  divingBoard(ctx);
  // floats and decoys on the water
  crocFloat(ctx, 520, 620, 1.05);
  dinoFloat(ctx, 1290, 780);
  noodle(ctx, 800, 520, -0.15, '#7cff6b');
  noodle(ctx, 1380, 600, 0.3, '#ff5ab8');
  ringFloat(ctx, 680, 760, 30, '#ffffff', '#ff3d5a');
  // grandma on the flamingo float, sound asleep
  flamingoFloat(ctx, 300, 820, 1.0);
  ctx.save();
  ctx.translate(290, 800);
  person(ctx, { pose: 'sit', skin: '#ffd9b8', hair: '#e8e0d0', hairStyle: 'curly', top: '#2fb5e8', outfit: 'swim', swimTop: true, mood: 'sleep', hat: 'sun', hatColour: '#ff5ab8' }, 0);
  ctx.restore();
  // a man in a suit who fell in, still holding his phone up high
  swimmer(ctx, 1120, 530, { skin: '#f5c49c', hair: '#4a2c18', hairStyle: 'short', top: '#3a3f55', swimTop: true, mood: 'wow' }, 0, 0.9);
  ctx.save();
  ctx.translate(1146, 496);
  drawPhone(ctx);
  ctx.restore();
  // a pug on a ring wearing tiny sunglasses
  ringFloat(ctx, 960, 830, 28, '#ffd23a', '#2fb5e8');
  ctx.save();
  ctx.translate(950, 822);
  dog(ctx, { pose: 'sit', colour: '#e8c098', ear: '#4a3a2a', s: 0.8 }, 0);
  ctx.restore();
  ellipse(ctx, 958, 789, 5, 3.5, INK, 0);
  ellipse(ctx, 968, 789, 5, 3.5, INK, 0);
  line(ctx, 958, 789, 968, 789, INK, 2);
  // static swimmers
  for (const [x, y, seed] of [[260, 560, 1], [400, 700, 2], [880, 650, 3], [1460, 520, 4], [1450, 720, 5], [760, 560, 6], [1180, 860, 7]]) {
    swimmer(ctx, x, y, randomPerson(seed, { hat: null, kid: seed % 3 === 0 }), 0);
  }
  // a lady with a green frog swim cap (decoy)
  swimmer(ctx, 600, 860, { skin: '#c68a5a', hair: '#2a1a10', hairStyle: 'bald', top: '#ff5ab8', swimTop: true }, 0);
  circle(ctx, 600 - 0, 848, 13, '#5fc93c', 2.5);
  circle(ctx, 592, 836, 4.5, '#5fc93c', 2);
  circle(ctx, 608, 836, 4.5, '#5fc93c', 2);
  circle(ctx, 592, 836, 2, INK, 0);
  circle(ctx, 608, 836, 2, INK, 0);

  // everything standing on the deck, back to front
  const D = depth();
  const keep = keepOutOf([...iggy, ...items.flatMap((it) => it.spots)]);
  const place = (x, y, hw, hh, fn) => {
    keep.push({ x, y: y - hh / 2, hw, hh: hh / 2 + 20 });
    D.add(y, fn);
  };
  // back deck: cabanas, DJ booth and the tiki bar
  D.add(440, () => {
    cabana(ctx, 140, 440, '#ff3d5a', '#ffffff');
    // a couple inside the first cabana sharing a giant fruit platter
    personAt(ctx, 110, 430, randomPerson(31, { pose: 'sit', outfit: 'swim', kid: false, item: 'drink' }), 0);
    ctx.save();
    ctx.translate(165, 430);
    person(ctx, randomPerson(32, { pose: 'sit', outfit: 'swim', kid: false, shades: true, flip: true }), 0);
    ctx.restore();
  });
  D.add(440, () => cabana(ctx, 390, 440, '#2fb5e8', '#ffffff'));
  D.add(440, () => djBooth(ctx, 660, 450));
  D.add(460, () => bar(ctx, 1060, 1420, 450));
  D.add(720, () => slide(ctx));
  keep.push({ x: 1680, y: 450, hw: 130, hh: 300 });
  // a parrot on the bar roof post (decoy)
  D.add(461, () => {
    ctx.save();
    ctx.translate(1412, 186);
    parrot(ctx, { colour: '#4fc93a', wing: '#2f8a2a', tail: '#ffd23a', flip: true }, 0);
    ctx.restore();
  });
  // side deck bits
  place(70, 760, 40, 110, () => cactus(ctx, 70, 760, 70));
  place(1700, 1000, 50, 150, () => plantPot(ctx, 1700, 1000));
  place(110, 1000, 50, 150, () => plantPot(ctx, 110, 1000));
  place(1040, 1270, 80, 100, () => towelCart(ctx, 1040, 1270));
  place(1570, 900, 30, 110, () => cactus(ctx, 1570, 900, 60));
  place(780, 980, 30, 110, () => cactus(ctx, 780, 980, 50));
  // NO RUNNING sign... with a kid running right past it
  place(300, 940, 70, 140, () => {
    line(ctx, 260, 940, 260, 850, INK, 4);
    rrect(ctx, 210, 820, 100, 40, 6, '#ffffff', 2.5);
    label(ctx, 'NO RUNNING', 260, 840, 13, '#ff3d5a', { lw: 0 });
    personAt(ctx, 330, 945, { pose: 'walk', kid: true, skin: '#9a6440', hair: '#16101e', hairStyle: 'spiky', top: '#ffd23a', outfit: 'swim', bottom: '#ff3d5a', mood: 'wow' }, 0.3);
  });
  // big lounger rows and people packed across the front deck
  const UMB = [['#ff3d9a', '#ffffff'], ['#2fb5e8', '#ffffff'], ['#ffd23a', '#ff8a2a'], ['#a64dff', '#ffffff'], ['#21c7a8', '#ffffff']];
  const TOWEL = [['#2fb5e8', '#ffffff'], ['#ff8a2a', '#ffffff'], ['#ff5ab8', '#ffd23a'], ['#7cd34a', '#ffffff'], ['#a64dff', '#ffffff']];
  const pts = scatter(r, 75, { x0: 60, y0: 960, x1: 1760, y1: 1295 }, keep, 50);
  pts.forEach((p, i) => {
    const seed = 200 + i;
    const kind = i % 7;
    if (kind === 0 || kind === 3) {
      D.add(p.y, () => {
        lounger(ctx, p.x, p.y, ['#ffffff', '#ff8a2a', '#2fb5e8'][i % 3], true);
        personAt(ctx, p.x + 4, p.y - 16, randomPerson(seed, { pose: 'lie', outfit: 'swim', kid: false, item: null }), 0);
      });
    } else if (kind === 1) {
      const u = UMB[i % UMB.length];
      D.add(p.y, () => {
        umbrella(ctx, p.x - 40, p.y + 4, 110, u[0], u[1]);
        lounger(ctx, p.x, p.y, '#ffffff');
        personAt(ctx, p.x - 14, p.y - 12, randomPerson(seed, { pose: 'sit', outfit: 'swim', item: i % 2 ? 'drink' : 'phone', shades: true }), 0);
      });
    } else if (kind === 2) {
      D.add(p.y, () => {
        personAt(ctx, p.x - 18, p.y, randomPerson(seed, { pose: 'stand', outfit: i % 2 ? 'swim' : 'tee', item: 'drink' }), 0);
        personAt(ctx, p.x + 20, p.y + 3, randomPerson(seed + 40, { pose: 'point', outfit: 'swim', flip: true, item: null }), 0);
      });
    } else if (kind === 4) {
      const tw = TOWEL[i % TOWEL.length];
      D.add(p.y, () => {
        towel(ctx, p.x, p.y, 110, 38, tw[0], tw[1]);
        personAt(ctx, p.x - 14, p.y - 2, randomPerson(seed, { pose: 'sit', outfit: 'swim', kid: true, item: null }), 0);
        personAt(ctx, p.x + 22, p.y + 2, randomPerson(seed + 3, { pose: 'sit', outfit: 'swim', kid: true, item: null }), 0);
      });
    } else if (kind === 5) {
      D.add(p.y, () => {
        if (i % 14 === 5) cactus(ctx, p.x, p.y, 40 + (i % 3) * 12);
        else {
          personAt(ctx, p.x, p.y, randomPerson(seed, { pose: 'hold', outfit: 'tee', item: 'drink', hat: 'straw' }), 0);
        }
      });
    } else {
      D.add(p.y, () => personAt(ctx, p.x, p.y, randomPerson(seed, { pose: i % 2 ? 'walk' : 'wave', outfit: 'swim', kid: i % 3 === 0, item: null }), 0));
    }
  });
  // loungers drawn by the hiding spots so they always exist
  place(470, 1120, 70, 70, () => lounger(ctx, 470, 1120, '#ffd23a'));
  D.draw();
}

function drawPhone(ctx) {
  limb(ctx, [[0, 20], [4, 0]], '#f5c49c', 7, 2);
  rrect(ctx, -2, -18, 12, 20, 2, '#3a3f55', 2);
  rect(ctx, 0, -16, 8, 14, '#7fd8ff', 0);
}

// --- moving things -----------------------------------------------------------------------------

const loop = (t, period) => (t % period) / period;

const actors = [
  ...[[300, 80, 40, 0], [1400, 60, 34, 0.5]].map(([x, y, s, p]) => ({
    x: W / 2, y, hw: W / 2 + 120, hh: s, over: true,
    draw(ctx, t) {
      cloud(ctx, ((x + t * 7 + p * W) % (W + 240)) - 120, y, s);
    },
  })),
  // the hotel sign buzzing
  {
    x: 900, y: 44, hw: 150, hh: 40,
    draw(ctx, t) {
      const on = (t % 5) > 0.25 || (t % 0.1) > 0.05;
      if (on) glow(ctx, 900, 44, 150, 'rgba(255,61,154,0.18)');
      neon(ctx, 'HOTEL IGUANA', 900, 44, 34, on ? '#ff3d9a' : '#5a2a5a');
    },
  },
  // guests waving from the balconies
  ...[[600, 0], [780, 1], [960, 2], [1140, 3]].map(([x, k]) => ({
    x, y: 120, hw: 40, hh: 50,
    draw(ctx, t) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - 50, 60, 100, 110);
      ctx.clip();
      ctx.translate(x + 10, 172);
      ctx.scale(0.75, 0.75);
      person(ctx, randomPerson(300 + k, { pose: k % 2 ? 'wave' : 'cheer', outfit: 'tee', kid: false, item: null, phase: k }), t);
      ctx.restore();
      for (let j = 0; j < 7; j++) line(ctx, x - 4 + j * 18 - 40, 150, x - 4 + j * 18 - 40, 170, INK, 2);
      rrect(ctx, x - 50, 170, 120, 14, 4, '#ffffff', 2.5);
    },
  })),
  // the DJ nodding along and the dancers in front
  {
    x: 660, y: 380, hw: 60, hh: 70,
    draw(ctx, t) {
      const nod = Math.abs(Math.sin(t * 6)) * 4;
      ctx.save();
      ctx.beginPath();
      ctx.rect(560, 250, 200, 125);
      ctx.clip();
      ctx.translate(660, 440 + nod);
      person(ctx, { pose: 'cheer', skin: '#6e4428', hair: '#16101e', hairStyle: 'spiky', top: '#ff3d9a', outfit: 'tee', shades: true, phase: 2 }, t);
      ctx.restore();
      // headphones
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(660, 318 + nod, 16, Math.PI, 0);
      ctx.stroke();
      circle(ctx, 644, 320 + nod, 6, '#ffd23a', 2);
      circle(ctx, 676, 320 + nod, 6, '#ffd23a', 2);
      // records spinning
      for (const dx of [-50, 50]) {
        const a = t * 6 + dx;
        line(ctx, 660 + dx, 370, 660 + dx + Math.cos(a) * 10, 370 + Math.sin(a) * 3, '#ffffff', 2);
      }
      // music notes floating up
      for (let k = 0; k < 3; k++) {
        const q = loop(t + k, 3);
        const nx = 560 + k * 100 + Math.sin(q * 6) * 10;
        const ny = 300 - q * 120;
        ctx.globalAlpha = 1 - q;
        circle(ctx, nx, ny, 6, '#ff3d9a', 2);
        line(ctx, nx + 5, ny, nx + 5, ny - 22, INK, 2.5);
        ctx.globalAlpha = 1;
      }
    },
  },
  {
    x: 840, y: 400, hw: 40, hh: 70,
    draw(ctx, t) {
      ctx.save();
      ctx.translate(840, 455);
      ctx.rotate(Math.sin(t * 6) * 0.1);
      person(ctx, { pose: 'cheer', skin: '#e0a878', hair: '#b23a1e', hairStyle: 'long', top: '#7cd34a', outfit: 'swim', swimTop: true, bottom: '#7cd34a', phase: 1 }, t);
      ctx.restore();
    },
  },
  // bartender shaking a cocktail behind the counter
  {
    x: 1240, y: 320, hw: 50, hh: 60,
    draw(ctx, t) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(1170, 220, 140, BAR_TOP - 222);
      ctx.clip();
      ctx.translate(1240, 440);
      person(ctx, { pose: 'cheer', skin: '#c68a5a', hair: '#2a1a10', hairStyle: 'short', top: '#ffffff', outfit: 'suit', tie: '#ff3d5a', phase: 3, mood: 'smile' }, t);
      ctx.restore();
      const sx = 1268 + Math.sin(t * 14) * 4;
      const sy = 290 + Math.cos(t * 14) * 6;
      rrect(ctx, sx - 7, sy - 18, 14, 26, 4, '#c9d0de', 2);
    },
  },
  // a kid bouncing on the diving board, then a cannonball
  {
    x: 330, y: 520, hw: 120, hh: 150,
    keep: [{ x: 310, y: 450, hw: 30, hh: 60 }, { x: 400, y: 600, hw: 50, hh: 60 }],
    draw(ctx, t) {
      const k = loop(t, 6);
      let x = 310;
      let y = 506;
      let pose = 'stand';
      if (k < 0.4) y = 506 - Math.abs(Math.sin(k * 40)) * 16;
      else if (k < 0.65) {
        const a = (k - 0.4) / 0.25;
        x = 310 + a * 90;
        y = 506 - Math.sin(a * Math.PI) * 120 + a * 120;
        pose = 'cheer';
      } else {
        const a = (k - 0.65) / 0.35;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        for (let i = 0; i < 9; i++) {
          const ang = Math.PI + (i / 8) * Math.PI;
          const rr = 20 + a * 50;
          ctx.beginPath();
          ctx.arc(400 + Math.cos(ang) * rr, 630 + Math.sin(ang) * rr * 1.2, 8 * (1 - a) + 2, 0, TAU);
          ctx.fill();
        }
        return;
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(0.85, 0.85);
      person(ctx, { pose, kid: true, skin: '#f5c49c', hair: '#c98f4f', hairStyle: 'short', top: '#2fb5e8', outfit: 'swim', bottom: '#ff8a2a', mood: 'wow' }, t);
      ctx.restore();
    },
  },
  // waterslide rider
  {
    x: 1620, y: 420, hw: 160, hh: 300,
    keep: [{ x: 1630, y: 420, hw: 90, hh: 270 }],
    draw(ctx, t) {
      const pts = [[1650, 165], [1560, 230], [1700, 330], [1560, 430], [1680, 520], [1560, 610], [1500, 660]];
      const k = loop(t, 5);
      if (k > 0.75) {
        const a = (k - 0.75) / 0.25;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        for (let i = 0; i < 8; i++) {
          const ang = Math.PI + (i / 7) * Math.PI;
          ctx.beginPath();
          ctx.arc(1480 + Math.cos(ang) * (20 + a * 40), 680 + Math.sin(ang) * (20 + a * 50), 7 * (1 - a) + 2, 0, TAU);
          ctx.fill();
        }
        return;
      }
      const f = (k / 0.75) * (pts.length - 1);
      const i = Math.min(pts.length - 2, Math.floor(f));
      const u = f - i;
      const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u;
      const y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u;
      ctx.save();
      ctx.translate(x, y + 18);
      ctx.scale(0.7, 0.7);
      person(ctx, { pose: 'cheer', kid: true, skin: '#9a6440', hair: '#16101e', hairStyle: 'pony', top: '#ff5ab8', outfit: 'swim', swimTop: true, mood: 'wow', phase: 4 }, t);
      ctx.restore();
    },
  },
  // the waiter weaving along the deck with a wobbly tray of drinks
  {
    x: 800, y: 950, hw: 700, hh: 90,
    keep: [{ x: 1000, y: 920, hw: 30, hh: 30 }],
    over: true,
    draw(ctx, t) {
      const k = loop(t, 18);
      const e = k < 0.5 ? k * 2 : 2 - k * 2;
      const x = 200 + e * 1300;
      const dir = k < 0.5 ? 1 : -1;
      ctx.save();
      ctx.translate(x, 952);
      shadow(ctx, 0, 0, 20);
      person(ctx, { pose: 'walk', flip: dir < 0, skin: '#e0a878', hair: '#2a1a10', hairStyle: 'short', top: '#ffffff', outfit: 'suit', bottom: '#2a2a44', tie: '#2a2a44', phase: 5 }, t);
      ctx.restore();
      const tilt = Math.sin(t * 3) * 0.12;
      ctx.save();
      ctx.translate(x + dir * 20, 828);
      ctx.rotate(tilt);
      line(ctx, 0, 24, 0, 6, '#e0a878', 7);
      ellipse(ctx, 0, 4, 34, 6, '#c9d0de', 2.5);
      const cs = ['#ff8a2a', '#ff3d9a', '#7cff6b'];
      for (let i = 0; i < 3; i++) {
        poly(ctx, [[-24 + i * 20, -16], [-12 + i * 20, -16], [-18 + i * 20, -2]], cs[i], 2);
        line(ctx, -18 + i * 20, -2, -18 + i * 20, 2, INK, 2);
        poly(ctx, [[-20 + i * 20, -24], [-14 + i * 20, -30], [-10 + i * 20, -22]], '#ffd23a', 1);
      }
      ctx.restore();
    },
  },
  // aqua aerobics: three grannies in flowery caps
  {
    x: 1010, y: 690, hw: 120, hh: 60,
    keep: [{ x: 1000, y: 700, hw: 20, hh: 20 }],
    draw(ctx, t) {
      [[880, 0], [1180, 1]].forEach(([x, k]) => {
        ctx.save();
        ctx.translate(x, 720 + Math.sin(t * 3 + k) * 3);
        ctx.scale(0.85, 0.85);
        person(ctx, { pose: 'swim', outfit: 'swim', swimTop: true, top: ['#ff5ab8', '#a64dff'][k], skin: ['#ffd9b8', '#c68a5a'][k], hair: '#e8e0d0', hairStyle: 'bald', hat: 'flower', hatColour: ['#ffd23a', '#ff8a2a'][k], phase: k * 2 }, t * 1.5);
        ctx.restore();
      });
    },
  },
  // swimmers bobbing
  ...[[340, 640, 41], [700, 680, 42], [1360, 680, 43], [1000, 560, 44], [480, 760, 45]].map(([x, y, seed]) => ({
    x, y: y - 25, hw: 30, hh: 40,
    draw(ctx, t) {
      swimmer(ctx, x, y, randomPerson(seed, { hat: null, kid: seed % 2 === 0 }), t);
    },
  })),
  // a lady on a giant doughnut... ring float drifting
  {
    x: 1250, y: 620, hw: 140, hh: 70,
    keep: [{ x: 1250, y: 610, hw: 40, hh: 30 }],
    draw(ctx, t) {
      const x = 1250 + Math.sin(t * 0.4) * 40;
      const y = 640 + Math.sin(t * 1.3) * 2;
      ringFloat(ctx, x, y, 36, '#ffb3cf', '#ffffff');
      ctx.save();
      ctx.translate(x - 4, y - 12);
      person(ctx, { pose: 'sit', skin: '#9a6440', hair: '#2a1a10', hairStyle: 'bun', top: '#ffd23a', outfit: 'swim', swimTop: true, shades: true, item: 'drink', itemColour: '#ff8a2a', phase: 6 }, t);
      ctx.restore();
    },
  },
  // a gull swooping off with a cocktail umbrella
  {
    x: 900, y: 260, hw: 900, hh: 80, over: true,
    draw(ctx, t) {
      const k = loop(t, 14);
      ctx.save();
      ctx.translate(-100 + k * (W + 200), 240 + Math.sin(t * 2) * 20);
      gull(ctx, { pose: 'fly' }, t);
      line(ctx, 22, 0, 26, 16, INK, 1.5);
      poly(ctx, [[14, 2], [38, 2], [26, -8]], '#ff3d9a', 1.5);
      ctx.restore();
    },
  },
];

// --- hiding places ----------------------------------------------------------------------------

const iggy = [
  sp(1040, 700, { pose: 'float', cover: poolCover(1040, 700) }), // floating between the aqua grannies
  sp(930, 478, { pose: 'peek' }), // hanging on the far edge of the pool
  sp(1350, BAR_TOP, { pose: 'peek' }), // over the tiki bar counter
  sp(585, 372, { pose: 'peek', s: 0.9 }), // behind the DJ's decks
  sp(462, 1104, { pose: 'lie' }), // sunbathing on the yellow lounger
  sp(1700, 936, { pose: 'peek', cover: potLeaves(1700, 1000) }), // in the big plant pot
  sp(452, 440, { pose: 'stand', s: 0.9, cover: (ctx) => {
    poly(ctx, [[490, 290], [450, 290], [474, 370], [460, 440], [490, 440]], '#ffffff', 2.5);
    circle(ctx, 474, 370, 5, '#2fb5e8', 1.5);
  } }), // behind the blue cabana's curtain
  sp(1040, 1180, { pose: 'peek' }), // on top of the towel cart
];

const items = [
  { id: 'duck', prop: 'duck', count: 3, spots: [sp(470, 530), sp(720, 800), sp(1250, 540), sp(1460, 820), sp(820, 600)] },
  { id: 'beachball', prop: 'beachball', spots: [sp(560, 720), sp(1500, 1060), sp(380, 1240)] },
  { id: 'sunglasses', prop: 'sunglasses', spots: [sp(820, 1010), sp(1470, 410)] },
  { id: 'cone', prop: 'cone', spots: [sp(170, 1180), sp(1240, 1180)] },
  { id: 'lollipop', prop: 'lollipop', spots: [sp(120, 680), sp(1660, 1180)] },
  { id: 'flipflop', prop: 'flipflop', count: 2, spots: [sp(330, 1010, { rot: -0.4 }), sp(990, 1010), sp(1580, 1000)] },
  { id: 'camera', prop: 'camera', spots: [sp(1000, 410), sp(700, 1150)] },
  { id: 'melon', prop: 'melon', spots: [sp(330, 1110), sp(1340, 1010)] },
  { id: 'snorkel', prop: 'snorkel', spots: [sp(300, 690), sp(1110, 1070)] },
  { id: 'watch', prop: 'watch', spots: [sp(1180, 1130, { rot: 1.2 }), sp(50, 1160, { rot: 0.4 })] },
  { id: 'sunhat', prop: 'sunhat', spots: [sp(1440, 1240), sp(900, 1130)] },
  { id: 'cupcake', prop: 'cupcake', spots: [sp(1110, 362), sp(590, 1230)] },
  { id: 'flower', prop: 'flower', spots: [sp(1720, 790), sp(1530, 1130)] },
  { id: 'coconut', prop: 'coconut', spots: [sp(1310, 1250), sp(800, 1240)] },
  { id: 'teddy', prop: 'teddy', spots: [sp(60, 880), sp(1210, 1250)] },
  { id: 'key', prop: 'key', spots: [sp(420, 1010), sp(1000, 1140, { rot: 0.5 })] },
  { id: 'pizza', prop: 'pizza', spots: [sp(1600, 1080), sp(220, 1080, { rot: 0.3 })] },
];

function sticker(ctx, r, t) {
  ctx.save();
  ctx.scale(r / 100, r / 100);
  ctx.fillStyle = lin(ctx, 0, -100, 0, 100, [[0, '#ffb3cf'], [0.35, '#ffb3cf'], [0.36, '#3fd2f2'], [1, '#2fb9ec']]);
  ctx.beginPath();
  ctx.arc(0, 0, 100, 0, TAU);
  ctx.fill();
  for (let k = 0; k < 4; k++) rect(ctx, -100, -88 + k * 16, 200, 5, '#ff7ab6', 0);
  ringFloat(ctx, 0, 52, 52, '#ff4f9a', '#ffffff');
  ctx.translate(0, 64);
  ctx.scale(1.2, 1.2);
  drawProp(ctx, 'iggy-float', {}, t);
  ctx.restore();
}

export default {
  id: 'pool',
  name: 'Pool Party',
  W, H,
  edge: '#e8cfa0',
  back,
  actors,
  iggy,
  items,
  sticker,
};
