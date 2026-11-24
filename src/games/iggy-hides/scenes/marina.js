// The marina on a breezy morning: sailboats on their moorings, a long pier with pelicans on
// the pilings, a fishing boat, a yacht, kayaks and a rowboat, a manatee nosing about, and
// the busy front dock with the bait shop, crates, nets and the fish stall.
import { TAU, INK, lin, circle, ellipse, poly, rect, rrect, line, curve, fs, sky, sun, cloud, water, label, shadow, glow } from '../art/kit.js';
import { crate, barrel, lamp, bench, ringFloat } from '../art/scenery.js';
import { person, personAt, randomPerson, TOPS } from '../art/people.js';
import { dog, gull, pelican, parrot, manatee, dolphin, turtle, fish, cat } from '../art/animals.js';
import { drawProp } from '../art/props.js';
import { drawIggy } from '../art/iggy.js';
import { scatter, keepOutOf, depth } from '../art/crowd.js';

const W = 1800;
const H = 1300;
const HORIZON = 220;
const DOCK = 1130; // front dock top edge
const PIER = 480; // back pier deck top
const PIER_X1 = 1240; // back pier ends here

const seaFill = (ctx) => lin(ctx, 0, HORIZON, 0, DOCK, [[0, '#1d86c4'], [0.5, '#25a7cc'], [1, '#38c4c8']]);

function seaCover(x, y, w = 46) {
  return (ctx, t) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - w, y + 2);
    for (let k = -w; k <= w; k += 8) ctx.lineTo(x + k, y + Math.sin(k / 9 + t * 3) * 1.5);
    ctx.lineTo(x + w, y + 60);
    ctx.lineTo(x - w, y + 60);
    ctx.closePath();
    ctx.fillStyle = seaFill(ctx);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, w * 0.8, 5, 0, 0, Math.PI);
    ctx.stroke();
  };
}

const sp = (x, y, o = {}) => ({ x, y, ...o });

// --- set pieces -------------------------------------------------------------------------------

function ripple(ctx, x, y, w) {
  if (!(w > 0.5)) return;
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y + 2, w, 5, 0, 0, Math.PI);
  ctx.stroke();
}

// A hull with a pointy bow on the right; waterline at y. Returns the deck y.
function boatHull(ctx, x, y, w, h, c, stripe, flip = false, name = null) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h);
  ctx.lineTo(w / 2 + 18, -h - 6);
  ctx.quadraticCurveTo(w / 2 + 2, 4, w / 2 - 24, 6);
  ctx.lineTo(-w / 2 + 6, 6);
  ctx.closePath();
  fs(ctx, c, 3);
  line(ctx, -w / 2 + 2, -h + 9, w / 2 + 12, -h + 6, stripe, 5);
  if (name) {
    ctx.scale(flip ? -1 : 1, 1);
    label(ctx, name, flip ? 10 : -10, -h / 2 + 4, Math.min(26, h * 0.6), INK, { lw: 0 });
  }
  ctx.restore();
  ripple(ctx, x, y, w * 0.55);
  return y - h;
}

function sailboat(ctx, x, y, s, hull, sailC, stripe = '#2fb5e8', flip = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const deck = boatHull(ctx, 0, 0, 120, 26, hull, stripe, flip);
  const mx = flip ? 6 : -6;
  line(ctx, mx, deck, mx, deck - 190, INK, 5);
  line(ctx, mx, deck, mx, deck - 190, '#e8e0d0', 2.5);
  poly(ctx, [[mx + 3, deck - 184], [mx + 3, deck - 10], [mx + 70, deck - 10]], sailC, 2.5);
  poly(ctx, [[mx - 3, deck - 170], [mx - 3, deck - 10], [mx - 50, deck - 10]], '#ffffff', 2.5);
  line(ctx, mx, deck - 190, mx + 66, deck - 6, 'rgba(22,11,51,0.4)', 1.2);
  poly(ctx, [[mx, deck - 190], [mx + 16, deck - 186], [mx, deck - 180]], '#ff3d5a', 1.5);
  ctx.restore();
}

function yacht(ctx, x, y) {
  const deck = boatHull(ctx, x, y, 360, 54, '#ffffff', '#1f4a8a');
  rrect(ctx, x - 150, deck - 50, 260, 54, 12, '#ffffff', 3);
  for (let k = 0; k < 6; k++) rrect(ctx, x - 136 + k * 40, deck - 38, 30, 20, 6, '#2a4a7a', 2);
  rrect(ctx, x - 110, deck - 92, 170, 44, 12, '#ffffff', 3);
  rrect(ctx, x - 96, deck - 82, 140, 18, 6, '#2a4a7a', 2);
  line(ctx, x - 60, deck - 92, x - 60, deck - 150, INK, 3);
  rect(ctx, x - 76, deck - 150, 32, 8, '#e8e0d0', 2);
  // rail
  line(ctx, x - 170, deck - 16, x + 186, deck - 20, 'rgba(22,11,51,0.7)', 2);
  label(ctx, 'SEA BISCUIT', x + 30, y - 14, 18, '#1f4a8a', { lw: 0 });
}

function fishingBoat(ctx, x, y) {
  const deck = boatHull(ctx, x, y, 260, 44, '#e8463c', '#ffffff', true);
  rect(ctx, x + 10, deck - 80, 90, 80, '#ffffff', 3);
  rect(ctx, x + 22, deck - 66, 30, 24, '#9fe6ff', 2.5);
  rect(ctx, x + 60, deck - 66, 30, 24, '#9fe6ff', 2.5);
  rect(ctx, x + 4, deck - 92, 102, 14, '#3a6bff', 2.5);
  // a short mast with a pennant, a deck winch and a fisherman showing off his catch
  line(ctx, x + 55, deck - 92, x + 55, deck - 150, INK, 4);
  poly(ctx, [[x + 55, deck - 150], [x + 85, deck - 143], [x + 55, deck - 136]], '#ffd23a', 2);
  rect(ctx, x - 90, deck - 22, 40, 22, '#3a3f55', 2.5);
  circle(ctx, x - 70, deck - 22, 9, '#c9d0de', 2);
  personAt(ctx, x - 20, deck, { pose: 'hold', skin: '#e0a878', hair: '#7a4a22', hairStyle: 'short', top: '#ffd23a', outfit: 'tee', bottom: '#3a3f55', hat: 'bucket', hatColour: '#ffd23a', shoes: '#ffd23a' }, 0);
  ctx.save();
  ctx.translate(x + 10, deck - 88);
  ctx.rotate(-1.3);
  ctx.scale(1.4, 1.4);
  fish(ctx, { colour: '#9fb8d8', fin: '#5a7ab8', stripe: '#c9d0de' }, 0);
  ctx.restore();
  label(ctx, 'LUCKY', x - 40, y - 20, 20, '#ffffff', { lw: 3 });
}

// The boat called IGGY: a little green-and-white cabin cruiser.
function iggyBoat(ctx, x, y) {
  const deck = boatHull(ctx, x, y, 230, 40, '#ffffff', '#4fc93a', false, 'IGGY');
  rrect(ctx, x - 70, deck - 58, 110, 60, 10, '#e8f8e0', 3);
  rrect(ctx, x - 56, deck - 46, 34, 22, 5, '#9fe6ff', 2);
  rrect(ctx, x - 14, deck - 46, 34, 22, 5, '#9fe6ff', 2);
  rect(ctx, x - 76, deck - 66, 122, 10, '#4fc93a', 2.5);
  line(ctx, x + 60, deck, x + 110, deck - 6, INK, 2);
}

function rowboat(ctx, x, y, c = '#ff8a2a') {
  ctx.beginPath();
  ctx.moveTo(x - 80, y - 30);
  ctx.lineTo(x + 80, y - 30);
  ctx.quadraticCurveTo(x + 70, y + 6, x + 40, y + 6);
  ctx.lineTo(x - 50, y + 6);
  ctx.quadraticCurveTo(x - 76, y, x - 80, y - 30);
  fs(ctx, c, 3);
  line(ctx, x - 78, y - 22, x + 78, y - 22, '#ffffff', 4);
  line(ctx, x - 40, y - 30, x - 110, y + 14, '#a8743f', 5);
  ripple(ctx, x, y, 90);
}

function houseboat(ctx, x, y) {
  boatHull(ctx, x, y, 300, 24, '#e8e0d0', '#ff8a2a');
  rect(ctx, x - 120, y - 120, 200, 96, '#ffe9b0', 3);
  poly(ctx, [[x - 136, y - 118], [x + 96, y - 118], [x + 70, y - 150], [x - 110, y - 150]], '#3a8a7a', 3);
  rect(ctx, x - 100, y - 100, 44, 40, '#9fe6ff', 2.5);
  rect(ctx, x - 30, y - 100, 44, 40, '#9fe6ff', 2.5);
  rrect(ctx, x + 30, y - 104, 36, 80, 4, '#ff5ab8', 2.5);
  for (const fx of [x - 104, x - 34]) {
    rect(ctx, fx, y - 60, 52, 12, '#a8743f', 2);
    for (let k = 0; k < 4; k++) circle(ctx, fx + 8 + k * 12, y - 64, 5, ['#ff3d5a', '#ffd23a', '#ff5ab8', '#ffffff'][k], 1.5);
  }
  // washing line on the back deck
  line(ctx, x + 90, y - 24, x + 90, y - 90, INK, 3);
  line(ctx, x + 150, y - 30, x + 150, y - 90, INK, 3);
  curve(ctx, x + 90, y - 86, x + 120, y - 78, x + 150, y - 86, INK, 1.5);
  rect(ctx, x + 98, y - 84, 16, 22, '#2fb5e8', 1.5);
  poly(ctx, [[x + 120, y - 82], [x + 140, y - 82], [x + 138, y - 64], [x + 122, y - 64]], '#ffd23a', 1.5);
  ctx.save();
  ctx.translate(x - 20, y - 150);
  ctx.scale(0.8, 0.8);
  cat(ctx, { colour: '#3a3f55', flip: true }, 0);
  ctx.restore();
  personAt(ctx, x + 120, y - 24, { pose: 'hold', skin: '#c68a5a', hair: '#e8e0d0', hairStyle: 'bun', top: '#a64dff', outfit: 'dress', item: 'drink', phase: 6 }, 0);
}

function piling(ctx, x, top, bottom, w = 22) {
  rect(ctx, x - w / 2, top, w, bottom - top, '#8a5a3c', 2.5);
  ellipse(ctx, x, top, w / 2, 4, '#a8743f', 2);
  line(ctx, x - w / 2, bottom - 20, x + w / 2, bottom - 20, 'rgba(60,140,60,0.7)', 6);
}

// A lifebuoy hung on a post or wall (scenery: orange or green, never the red-white findable).
function buoy(ctx, x, y, a, b = '#ffffff') {
  ctx.lineWidth = 15;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 10;
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = i % 2 ? b : a;
    ctx.beginPath();
    ctx.arc(x, y, 15, (i / 4) * TAU, ((i + 1) / 4) * TAU);
    ctx.stroke();
  }
}

function fender(ctx, x, y, c = '#4fc93a') {
  line(ctx, x, y - 22, x, y - 10, INK, 2);
  rrect(ctx, x - 7, y - 10, 14, 28, 7, c, 2);
}

function netPile(ctx, x, y) {
  ellipse(ctx, x, y - 14, 50, 20, '#3a8a7a', 2.5);
  ctx.strokeStyle = 'rgba(22,11,51,0.45)';
  ctx.lineWidth = 1.5;
  for (let k = -40; k <= 40; k += 10) {
    ctx.beginPath();
    ctx.moveTo(x + k, y - 30);
    ctx.lineTo(x + k * 0.8 + 6, y);
    ctx.stroke();
  }
  for (const f of [-30, 0, 28]) circle(ctx, x + f, y - 26, 5, '#ffd23a', 1.5);
}

function rope(ctx, x, y) {
  for (let k = 0; k < 4; k++) ellipse(ctx, x, y - k * 5, 24 - k * 3, 8 - k, '#e8d0a0', 2);
}

function baitShop(ctx, x, y) {
  // weathered blue shack on stilts at the dock's left end; (x, y) bottom-left on the deck
  shadow(ctx, x + 190, y + 4, 200, 14);
  rect(ctx, x, y - 280, 380, 280, '#5aa8d8', 3);
  for (let k = 1; k < 14; k++) line(ctx, x + 2, y - 280 + k * 20, x + 378, y - 280 + k * 20, 'rgba(22,11,51,0.18)', 2);
  poly(ctx, [[x - 24, y - 276], [x + 404, y - 276], [x + 360, y - 340], [x + 20, y - 340]], '#e8463c', 3);
  for (let k = 0; k < 9; k++) line(ctx, x + 10 + k * 44, y - 338, x - 10 + k * 46, y - 278, 'rgba(22,11,51,0.25)', 2);
  rrect(ctx, x + 60, y - 334, 260, 46, 8, '#fff3d0', 3);
  label(ctx, 'BAIT & TACKLE', x + 190, y - 310, 30, '#1f4a8a', { lw: 0 });
  // window with a sill
  rect(ctx, x + 40, y - 240, 140, 110, '#bfeaff', 3);
  line(ctx, x + 110, y - 240, x + 110, y - 130, INK, 2.5);
  line(ctx, x + 40, y - 186, x + 180, y - 186, INK, 2.5);
  rect(ctx, x + 32, y - 130, 156, 12, '#ffffff', 2.5);
  // door
  rrect(ctx, x + 240, y - 190, 90, 190, 6, '#2a4a7a', 3);
  circle(ctx, x + 316, y - 96, 5, '#ffd23a', 1.5);
  rrect(ctx, x + 252, y - 160, 66, 40, 4, '#fff3d0', 2);
  label(ctx, 'OPEN', x + 285, y - 140, 16, '#e8463c', { lw: 0 });
  buoy(ctx, x + 205, y - 230, '#ff8a2a');
  // a rack of fishing rods by the door
  for (let k = 0; k < 4; k++) line(ctx, x + 196 + k * 10, y - 4, x + 186 + k * 14, y - 150, '#6e4426', 3);
  rect(ctx, x + 184, y - 40, 52, 10, '#8a5a3c', 2);
}

function fishStall(ctx, x, y) {
  // ice table with fish on it, striped awning
  rect(ctx, x - 6, y - 210, 10, 210, '#8a5a3c', 2.5);
  rect(ctx, x + 250, y - 210, 10, 210, '#8a5a3c', 2.5);
  for (let i = 0; i < 9; i++) {
    const sx = x - 20 + i * 32;
    ctx.beginPath();
    ctx.moveTo(sx, y - 220);
    ctx.lineTo(sx + 32, y - 220);
    ctx.lineTo(sx + 32, y - 196);
    ctx.arc(sx + 16, y - 196, 16, 0, Math.PI);
    ctx.closePath();
    fs(ctx, i % 2 ? '#ffffff' : '#2fb5e8', 2.5);
  }
  rrect(ctx, x + 30, y - 262, 196, 40, 8, '#ffffff', 3);
  label(ctx, 'FRESH FISH', x + 128, y - 242, 24, '#2fb5e8', { lw: 0 });
  rect(ctx, x - 10, y - 70, 274, 70, '#c9d0de', 3);
  rect(ctx, x - 14, y - 86, 282, 18, '#e8f6ff', 2.5);
  const cols = [['#ff8a6a', '#ff5a3a'], ['#c9d0de', '#8a96aa'], ['#ffd23a', '#ff8a2a'], ['#ff7ab6', '#ff3d9a'], ['#9fb8d8', '#5a7ab8']];
  for (let k = 0; k < 7; k++) {
    ctx.save();
    ctx.translate(x + 18 + k * 38, y - 92 - (k % 2) * 6);
    ctx.rotate(-0.4 + (k % 3) * 0.3);
    ctx.scale(0.8, 0.8);
    fish(ctx, { colour: cols[k % 5][0], fin: cols[k % 5][1] }, 0);
    ctx.restore();
  }
}

// --- the picture ------------------------------------------------------------------------------

function back(ctx, r) {
  sky(ctx, W, 0, HORIZON, [[0, '#5ab4ff'], [0.75, '#b8e6ff'], [1, '#e8f8ff']]);
  sun(ctx, 260, 80, 42, { rays: 12 });
  // far shore: a green headland with a lighthouse and condo towers
  ctx.beginPath();
  ctx.moveTo(0, HORIZON);
  ctx.quadraticCurveTo(200, HORIZON - 40, 520, HORIZON - 16);
  ctx.lineTo(520, HORIZON);
  ctx.closePath();
  fs(ctx, '#7cc46a', 2);
  rect(ctx, 380, HORIZON - 70, 16, 54, '#ffffff', 2);
  rect(ctx, 380, HORIZON - 58, 16, 10, '#e8463c', 0);
  poly(ctx, [[376, HORIZON - 70], [400, HORIZON - 70], [388, HORIZON - 84]], '#e8463c', 2);
  for (let i = 0; i < 12; i++) {
    const bx = 1020 + i * 62;
    const bh = 40 + ((i * 41) % 70);
    rect(ctx, bx, HORIZON - bh, 48, bh, i % 2 ? '#bcd8f0' : '#d8c8f0', 1.5, 'rgba(22,11,51,0.4)');
    for (let j = 0; j < bh / 14 - 1; j++) rect(ctx, bx + 8, HORIZON - bh + 8 + j * 14, 32, 4, 'rgba(255,255,255,0.6)', 0);
  }
  // water
  ctx.fillStyle = seaFill(ctx);
  ctx.fillRect(0, HORIZON, W, DOCK - HORIZON);
  water(ctx, 0, HORIZON + 6, W, DOCK - 10, 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', r, 'rgba(255,255,255,0.4)', 16);
  line(ctx, 0, HORIZON, W, HORIZON, 'rgba(22,11,51,0.5)', 2);
  // channel markers
  for (const [x, c] of [[620, '#3fae4a'], [760, '#e8463c']]) {
    rect(ctx, x - 6, HORIZON + 30, 12, 34, c, 2);
    poly(ctx, [[x - 10, HORIZON + 30], [x + 10, HORIZON + 30], [x, HORIZON + 12]], c, 2);
  }
  // moored sailboats behind the pier
  const sails = [['#ffffff', '#ff3d5a'], ['#2a4a7a', '#ffd23a'], ['#ffffff', '#2fb5e8'], ['#ffd23a', '#ffffff'], ['#ffffff', '#a64dff'], ['#3a6bff', '#ffffff'], ['#ffffff', '#ff8a2a']];
  const xs = [90, 330, 560, 820, 1080, 1340, 1620];
  xs.forEach((x, i) => {
    if (i === 3) return; // the one in the middle rocks (an actor)
    sailboat(ctx, x, 400 + (i % 2) * 18, 0.85 + (i % 3) * 0.06, sails[i][0], sails[i][1], TOPS[i], i % 2 === 1);
  });
  // the back pier with pilings, lamps, pelicans and people
  for (let x = 30; x <= PIER_X1; x += 120) piling(ctx, x, PIER - 18, 590);
  ctx.fillStyle = '#c9965a';
  ctx.fillRect(0, PIER, PIER_X1 + 20, 28);
  for (let x = 0; x < PIER_X1 + 20; x += 24) line(ctx, x, PIER, x, PIER + 28, 'rgba(110,68,38,0.5)', 2);
  rect(ctx, 0, PIER, PIER_X1 + 20, 28, 'rgba(0,0,0,0)', 3);
  rect(ctx, 0, PIER + 28, PIER_X1 + 20, 10, '#8a5a3c', 2.5);
  // rail posts
  for (let x = 90; x < PIER_X1; x += 120) {
    line(ctx, x, PIER + 2, x, PIER - 34, INK, 4);
    line(ctx, x, PIER + 2, x, PIER - 34, '#e8e0d0', 2);
  }
  line(ctx, 0, PIER - 30, PIER_X1, PIER - 30, '#e8e0d0', 3);
  // hanging buoys (green ones are decoys)
  buoy(ctx, 330, PIER + 52, '#4fc93a');
  buoy(ctx, 810, PIER + 52, '#ff8a2a');
  buoy(ctx, 1170, PIER + 52, '#4fc93a', '#ffd23a');
  lamp(ctx, 210, PIER + 4, 120, '#2a3a5a');
  lamp(ctx, 930, PIER + 4, 120, '#2a3a5a');
  // pelicans and gulls on the piling tops (one gulps a fish: an actor)
  for (const [x, flip] of [[30, false], [510, true], [1110, false]]) {
    ctx.save();
    ctx.translate(x, PIER - 18);
    ctx.scale(0.8, 0.8);
    pelican(ctx, { flip }, 0);
    ctx.restore();
  }
  for (const x of [390, 990]) {
    ctx.save();
    ctx.translate(x, PIER - 18);
    gull(ctx, { flip: x > 500 }, 0);
    ctx.restore();
  }
  const keepPier = keepOutOf([...iggy, ...items.flatMap((it) => it.spots)], 50, 40, 140);
  const walkers = scatter(r, 9, { x0: 60, y0: PIER + 18, x1: PIER_X1 - 40, y1: PIER + 22 }, [...keepPier, { x: 720, y: PIER, hw: 60, hh: 60 }, { x: 640, y: 500, hw: 50, hh: 60 }], 50);
  walkers.sort((a, b) => a.x - b.x).forEach((p, i) => {
    personAt(ctx, p.x, p.y, randomPerson(300 + i, { pose: ['walk', 'stand', 'point', 'wave'][i % 4], item: i % 3 === 0 ? 'phone' : i % 5 === 1 ? 'icecream' : null, flip: i % 2 === 1 }), 0);
  });
  // the pier's end: a fisherman leaning on the rail
  personAt(ctx, PIER_X1 - 20, PIER + 20, { pose: 'hold', skin: '#c68a5a', hair: '#e8e0d0', hairStyle: 'bald', top: '#3fae4a', outfit: 'tee', bottom: '#c98f4f', hat: 'bucket', hatColour: '#c98f4f', item: 'rod', phase: 2 }, 0);

  // middle water: boats moored between the pier and the dock
  const D = depth();
  D.add(700, () => fishingBoat(ctx, 310, 700));
  D.add(690, () => {
    iggyBoat(ctx, 880, 700);
    fender(ctx, 800, 680);
    fender(ctx, 960, 680, '#4fc93a');
  });
  D.add(760, () => {
    yacht(ctx, 1500, 770);
    fender(ctx, 1400, 740, '#ffffff');
    fender(ctx, 1600, 740, '#4fc93a');
    // a captain with a green parrot on his shoulder waving from the flybridge
    personAt(ctx, 1450, 626, { pose: 'wave', skin: '#ffd9b8', hair: '#e8e0d0', hairStyle: 'short', top: '#ffffff', outfit: 'suit', tie: '#1f4a8a', bottom: '#1f4a8a', hat: 'cap', hatColour: '#ffffff', phase: 4 }, 0);
    ctx.save();
    ctx.translate(1440, 534);
    parrot(ctx, { colour: '#4fc93a', wing: '#2f8a2a', tail: '#ffd23a', flip: true, s: 0.8 }, 0);
    ctx.restore();
    // and sunbathers on the bow
    personAt(ctx, 1590, 714, randomPerson(410, { pose: 'lie', outfit: 'swim', shades: true }), 0);
  });
  D.add(1010, () => rowboat(ctx, 590, 1010, '#ff8a2a'));
  D.add(1060, () => rowboat(ctx, 1380, 1060, '#3a6bff'));
  // a sea turtle (green, a decoy) and a buoy
  D.add(860, () => {
    ctx.save();
    ctx.translate(700, 860);
    turtle(ctx, { swim: true, colour: '#4fae4a', shell: '#2f8a3e' }, 0);
    ctx.restore();
    ripple(ctx, 700, 868, 30);
  });
  D.add(930, () => buoy(ctx, 1230, 920, '#4fc93a', '#ffffff'));
  // a hat floating by itself: someone fell in (they wave from beside it, an actor)
  D.add(820, () => {
    ellipse(ctx, 520, 880, 30, 8, '#f2d27a', 2.5);
    ctx.beginPath();
    ctx.arc(520, 878, 15, Math.PI, 0);
    ctx.closePath();
    fs(ctx, '#f2d27a', 2.5);
    rect(ctx, 505, 868, 30, 5, '#ff3d5a', 1.5);
  });
  // swimmers, floating gulls and mooring balls dotted over the open water
  const waterKeep = [
    ...keepOutOf([...iggy, ...items.flatMap((it) => it.spots)], 60, 50, 60),
    { x: 880, y: 690, hw: 150, hh: 60 }, { x: 1500, y: 720, hw: 230, hh: 110 }, { x: 1560, y: 930, hw: 190, hh: 100 },
    { x: 590, y: 1000, hw: 120, hh: 45 }, { x: 1380, y: 1050, hw: 110, hh: 40 }, { x: 880, y: 990, hw: 150, hh: 50 },
    { x: 700, y: 860, hw: 50, hh: 40 }, { x: 455, y: 810, hw: 80, hh: 35 }, { x: 1305, y: 790, hw: 45, hh: 35 },
    { x: 1180, y: 1050, hw: 90, hh: 90 }, { x: 1230, y: 920, hw: 35, hh: 35 }, { x: 550, y: 875, hw: 70, hh: 45 },
    { x: 1060, y: 610, hw: 100, hh: 45 }, { x: 780, y: 1090, hw: 100, hh: 45 }, { x: 980, y: 770, hw: 70, hh: 45 },
    { x: 310, y: 680, hw: 190, hh: 100 },
  ];
  scatter(r, 16, { x0: 440, y0: 740, x1: 1420, y1: 1070 }, waterKeep, 45).forEach((p, i) => {
    D.add(p.y, () => {
      if (i % 3 === 0) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(0.8, 0.8);
        person(ctx, randomPerson(800 + i, { pose: 'swim', outfit: 'swim', hat: null }), 0);
        ctx.restore();
      } else if (i % 3 === 1) {
        ctx.save();
        ctx.translate(p.x, p.y + 6);
        gull(ctx, { flip: i % 2 === 0 }, 0);
        ctx.restore();
        ripple(ctx, p.x, p.y + 4, 20);
      } else {
        circle(ctx, p.x, p.y - 6, 10, i % 2 ? '#ffffff' : '#ff8a2a', 2.5);
        line(ctx, p.x - 8, p.y - 10, p.x + 8, p.y - 10, 'rgba(22,11,51,0.3)', 2);
        ripple(ctx, p.x, p.y + 2, 18);
      }
    });
  });
  // a houseboat with flower boxes, washing on a line and a cat on the roof
  D.add(990, () => houseboat(ctx, 1560, 990));
  // a jet ski tied up, and a snorkeler with only his flippers showing
  D.add(820, () => {
    poly(ctx, [[400, 820], [500, 820], [516, 804], [420, 800]], '#2fb5e8', 2.5);
    rrect(ctx, 430, 788, 40, 12, 5, '#3a3f55', 2);
    ripple(ctx, 455, 822, 60);
  });
  D.add(800, () => {
    for (const [fx, a] of [[1294, -0.3], [1316, 0.3]]) {
      ctx.save();
      ctx.translate(fx, 800);
      ctx.rotate(a);
      poly(ctx, [[-4, 0], [4, 0], [10, -26], [-10, -26]], '#ffd23a', 2);
      ctx.restore();
    }
    ripple(ctx, 1305, 802, 30);
  });
  // an inflatable unicorn with a kid asleep on it
  D.add(1080, () => {
    ringFloat(ctx, 1180, 1080, 38, '#ffffff', '#ff9ed2');
    ctx.strokeStyle = INK;
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.moveTo(1212, 1070);
    ctx.quadraticCurveTo(1236, 1040, 1222, 1018);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.stroke();
    circle(ctx, 1222, 1014, 10, '#ffffff', 2.5);
    poly(ctx, [[1218, 1006], [1226, 1006], [1224, 986]], '#ffd23a', 1.5);
    curve(ctx, 1214, 1012, 1200, 1020, 1206, 1036, '#ff5ab8', 4);
    personAt(ctx, 1170, 1072, randomPerson(420, { pose: 'lie', kid: true, outfit: 'swim', mood: 'sleep' }), 0);
  });
  D.draw();

  // the front dock
  ctx.fillStyle = lin(ctx, 0, DOCK, 0, H, [[0, '#d8a868'], [1, '#b8844a']]);
  ctx.fillRect(0, DOCK, W, H - DOCK);
  line(ctx, 0, DOCK, W, DOCK, INK, 3.5);
  for (let y = DOCK + 24; y < H; y += 24) line(ctx, 0, y, W, y, 'rgba(110,68,38,0.45)', 2);
  for (let x = 0; x < W; x += 90) line(ctx, x + ((x / 90) % 2) * 45, DOCK, x + ((x / 90) % 2) * 45, H, 'rgba(110,68,38,0.3)', 2);
  for (let x = 60; x < W; x += 180) {
    rect(ctx, x - 12, DOCK - 30, 24, 34, '#8a5a3c', 2.5);
    ellipse(ctx, x, DOCK - 30, 12, 4, '#a8743f', 2);
  }
  const F = depth();
  const keep = keepOutOf([...iggy, ...items.flatMap((it) => it.spots)]);
  const place = (x, y, hw, hh, fn) => {
    keep.push({ x, y: y - hh / 2, hw, hh: hh / 2 + 20 });
    F.add(y, fn);
  };
  place(230, 1180, 240, 340, () => baitShop(ctx, 40, 1180));
  place(1590, 1250, 170, 260, () => fishStall(ctx, 1470, 1250));
  place(900, 1240, 40, 50, () => {
    crate(ctx, 900, 1240, 64, 44, '#c98f4f');
    crate(ctx, 966, 1240, 60, 44, '#b87a3c');
    crate(ctx, 934, 1196, 56, 40, '#d8a060');
    label(ctx, 'LIMES', 966, 1222, 12, '#2f8a3e', { lw: 0 });
  });
  place(1440, 1250, 30, 70, () => barrel(ctx, 1440, 1250, '#a8743f'));
  place(560, 1210, 60, 40, () => netPile(ctx, 560, 1210));
  place(1100, 1180, 30, 30, () => rope(ctx, 1100, 1180));
  place(740, 1290, 70, 70, () => bench(ctx, 740, 1290, 130, '#2fb5e8'));
  // sitters on the dock edge with their legs over the water
  for (const [x, seed, item] of [[480, 501, 'rod'], [1240, 502, 'rod']]) {
    F.add(DOCK + 2, () => {
      ctx.save();
      ctx.translate(x, DOCK + 4);
      person(ctx, randomPerson(seed, { pose: 'sit', item, kid: false }), 0);
      ctx.restore();
    });
    keep.push({ x, y: DOCK, hw: 50, hh: 60 });
  }
  // a cat watching the fish stall hopefully
  place(1330, 1290, 30, 40, () => {
    ctx.save();
    ctx.translate(1330, 1290);
    cat(ctx, { colour: '#ff9a3c', stripes: '#d86a1a', flip: true }, 0);
    ctx.restore();
  });
  keep.push({ x: 700, y: 1200, hw: 60, hh: 60 }, { x: 1700, y: 1240, hw: 40, hh: 80 }); // actors
  const pts = scatter(r, 14, { x0: 470, y0: 1170, x1: 1420, y1: 1290 }, keep, 50);
  pts.forEach((p, i) => {
    F.add(p.y, () => {
      if (i % 5 === 4) {
        ctx.save();
        ctx.translate(p.x, p.y);
        dog(ctx, { pose: i % 2 ? 'sit' : 'stand', colour: ['#c98f4f', '#3a3f55', '#ffffff'][i % 3], spot: '#7a4a22', flip: i % 3 === 0 }, 0);
        ctx.restore();
      } else {
        personAt(ctx, p.x, p.y, randomPerson(600 + i, { pose: ['walk', 'stand', 'point', 'hold'][i % 4], item: i % 4 === 3 ? ['drink', 'phone', 'basket'][i % 3] : null, hat: i % 3 === 0 ? 'cap' : undefined, flip: p.x > 950 }), 0);
      }
    });
  });
  F.draw();
}

// --- moving things -----------------------------------------------------------------------------

const loop = (t, period) => (t % period) / period;

const actors = [
  ...[[300, 70, 40, 0], [900, 120, 52, 0.4], [1500, 60, 36, 0.75]].map(([x, y, s, p]) => ({
    x: W / 2, y, hw: W / 2 + 120, hh: s, over: true,
    draw(ctx, t) {
      cloud(ctx, ((x + t * 7 + p * W) % (W + 240)) - 120, y, s);
    },
  })),
  ...[[700, 170, 0], [1350, 150, 2.5], [450, 640, 4]].map(([x, y, p]) => ({
    x, y, hw: 150, hh: 50, over: true,
    draw(ctx, t) {
      ctx.save();
      ctx.translate(x + Math.cos(t * 0.5 + p) * 120, y + Math.sin(t * 1.1 + p) * 26);
      gull(ctx, { pose: 'fly', flip: Math.sin(t * 0.5 + p) > 0, phase: p }, t);
      ctx.restore();
    },
  })),
  // the middle sailboat rocking on its mooring
  {
    x: 820, y: 300, hw: 90, hh: 150,
    keep: [{ x: 820, y: 330, hw: 80, hh: 120 }],
    draw(ctx, t) {
      ctx.save();
      ctx.translate(820, 405);
      ctx.rotate(Math.sin(t * 1.1) * 0.05);
      sailboat(ctx, 0, Math.sin(t * 1.6) * 2, 0.95, '#ffffff', '#ff3d9a', '#4fc93a');
      ctx.restore();
    },
  },
  // a pelican gulping a fish on the pier end piling
  {
    x: 750, y: PIER - 60, hw: 40, hh: 50,
    draw(ctx, t) {
      piling(ctx, 750, PIER - 26, PIER);
      ctx.save();
      ctx.translate(750, PIER - 26);
      ctx.scale(0.85, 0.85);
      pelican(ctx, { flip: true, phase: 1 }, t);
      ctx.restore();
      if (loop(t, 5) < 0.4) {
        ctx.save();
        ctx.translate(708, PIER - 74);
        ctx.rotate(Math.sin(t * 12) * 0.3);
        poly(ctx, [[0, 0], [-10, -8], [-10, 8]], '#ffb020', 1.5);
        ctx.restore();
      }
    },
  },
  // a dolphin leaping now and then
  {
    x: 1300, y: 600, hw: 100, hh: 80,
    keep: [{ x: 1300, y: 590, hw: 90, hh: 60 }],
    draw(ctx, t) {
      const k = loop(t, 7);
      if (k > 0.25) return;
      const a = k / 0.25;
      ctx.save();
      ctx.translate(1230 + a * 140, 620 - Math.sin(a * Math.PI) * 90);
      ctx.rotate(-1 + a * 2);
      dolphin(ctx, {}, t);
      ctx.restore();
      ripple(ctx, 1230, 624, 20 * (1 - a * 0.5));
      ripple(ctx, 1370, 624, 20 * a);
    },
  },
  // a manatee drifting under the surface, waving a flipper at the kayaker
  {
    x: 880, y: 985, hw: 120, hh: 40,
    draw(ctx, t) {
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.translate(870 + Math.sin(t * 0.3) * 30, 990);
      ctx.scale(0.9, 0.9);
      manatee(ctx, {}, t);
      ctx.save();
      ctx.translate(30, 18);
      ctx.rotate(-0.8 + Math.sin(t * 3) * 0.4);
      ellipse(ctx, 12, 0, 14, 6, '#8a96aa', 2);
      ctx.restore();
      ctx.restore();
    },
  },
  // kayakers paddling on the spot
  ...[[1060, 610, '#ffd23a', 701], [780, 1090, '#ff3d5a', 702]].map(([x, y, c, seed]) => ({
    x, y: y - 30, hw: 90, hh: 50,
    draw(ctx, t) {
      const b = Math.sin(t * 2 + seed) * 2;
      ctx.save();
      ctx.translate(x, y + b);
      ctx.beginPath();
      ctx.moveTo(-70, -4);
      ctx.quadraticCurveTo(0, -16, 74, -4);
      ctx.quadraticCurveTo(0, 12, -70, -4);
      fs(ctx, c, 2.5);
      ctx.save();
      ctx.translate(0, -4);
      ctx.scale(0.75, 0.75);
      person(ctx, randomPerson(seed, { pose: 'swim', outfit: 'tee', hat: 'visor' }), 0);
      ctx.restore();
      const a = Math.sin(t * 3 + seed) * 0.6;
      ctx.rotate(a);
      line(ctx, -40, 0, 40, 0, '#3a3f55', 4);
      ellipse(ctx, -44, 0, 8, 4, '#3a3f55', 1.5);
      ellipse(ctx, 44, 0, 8, 4, '#3a3f55', 1.5);
      ctx.restore();
      ripple(ctx, x, y + 6, 70);
    },
  })),
  // the swimmer who fell in, waving next to his floating hat
  {
    x: 580, y: 860, hw: 30, hh: 40,
    draw(ctx, t) {
      ctx.save();
      ctx.translate(580, 888);
      ctx.scale(0.85, 0.85);
      person(ctx, { pose: 'swim', skin: '#ffd9b8', hair: '#7a4a22', hairStyle: 'bald', top: '#ff8a2a', mood: 'wow', phase: 3 }, t);
      ctx.restore();
    },
  },
  // a dog in goggles driving a speedboat across, his owner hanging on
  {
    x: W / 2, y: 560, hw: W / 2 + 200, hh: 50, over: true,
    draw(ctx, t) {
      const k = loop(t, 18);
      if (k > 0.6) return;
      const x = -200 + (k / 0.6) * (W + 400);
      const y = 590 + Math.sin(t * 6) * 2;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (let i = 1; i < 8; i++) {
        ctx.beginPath();
        ctx.arc(x - 70 - i * 16, y + 2 + Math.sin(i + t * 9) * 2, 9 - i, 0, TAU);
        ctx.fill();
      }
      poly(ctx, [[x - 70, y - 22], [x + 50, y - 22], [x + 74, y - 34], [x + 50, y + 2], [x - 66, y + 2]], '#ff3d9a', 2.5);
      line(ctx, x - 66, y - 14, x + 56, y - 14, '#ffffff', 3);
      poly(ctx, [[x + 10, y - 22], [x + 26, y - 46], [x + 32, y - 22]], '#bfeaff', 2);
      ctx.save();
      ctx.translate(x - 8, y - 22);
      dog(ctx, { pose: 'sit', colour: '#f2d27a', ear: '#c98f4f', tongue: true }, t);
      ctx.restore();
      ellipse(ctx, x + 6, y - 60, 9, 5, '#2fb5e8', 2);
      ctx.save();
      ctx.translate(x - 48, y - 20);
      ctx.scale(0.75, 0.75);
      person(ctx, { pose: 'cheer', skin: '#e0a878', hair: '#16101e', hairStyle: 'long', top: '#ffd23a', outfit: 'tee', bottom: '#2a4a8a', mood: 'wow', phase: 1 }, t);
      ctx.restore();
    },
  },
  // the kid on the rowboat-side dock pulls up an enormous fish
  {
    x: 700, y: 1170, hw: 70, hh: 90,
    keep: [{ x: 700, y: 1200, hw: 60, hh: 60 }],
    draw(ctx, t) {
      const k = loop(t, 6);
      const up = k < 0.5 ? Math.sin(k * 2 * Math.PI) : 0;
      ctx.save();
      ctx.translate(700, 1250);
      person(ctx, { pose: 'cheer', kid: true, skin: '#9a6440', hair: '#16101e', hairStyle: 'curly', top: '#ff3d5a', outfit: 'tee', bottom: '#2a4a8a', mood: up > 0.3 ? 'wow' : 'smile', phase: 2 }, t);
      ctx.restore();
      line(ctx, 720, 1168, 760, 1100, '#6e4426', 3);
      curve(ctx, 760, 1100, 770, 1110 - up * 30, 760, 1140 - up * 60, '#ffffff', 1.2);
      ctx.save();
      ctx.translate(760, 1150 - up * 60);
      ctx.rotate(-Math.PI / 2 + Math.sin(t * 10) * 0.3 * up);
      ctx.scale(1.3, 1.3);
      fish(ctx, { colour: '#ff8a6a', fin: '#ff5a3a', stripe: '#ffd23a' }, t);
      ctx.restore();
    },
  },
  // a fish leaping out of the water every few seconds
  {
    x: 980, y: 760, hw: 60, hh: 60,
    draw(ctx, t) {
      const k = loop(t + 2, 4);
      if (k > 0.3) return;
      const a = k / 0.3;
      ctx.save();
      ctx.translate(940 + a * 80, 790 - Math.sin(a * Math.PI) * 60);
      ctx.rotate(-0.9 + a * 1.8);
      fish(ctx, { colour: '#ffd23a', fin: '#ff8a2a' }, t);
      ctx.restore();
      ripple(ctx, 940, 792, 14);
      ripple(ctx, 1020, 792, 14 * a);
    },
  },
  // the fish seller waving a fish
  {
    x: 1700, y: 1190, hw: 40, hh: 80,
    draw(ctx, t) {
      ctx.save();
      ctx.translate(1700, 1250);
      person(ctx, { pose: 'wave', flip: true, skin: '#c68a5a', hair: '#16101e', hairStyle: 'short', top: '#ffffff', outfit: 'tee', bottom: '#2a4a8a', hat: 'cap', hatColour: '#2fb5e8', phase: 5 }, t);
      ctx.restore();
    },
  },
  // a flag on the bait shop roof
  {
    x: 380, y: 760, hw: 40, hh: 40,
    draw(ctx, t) {
      line(ctx, 360, 840, 360, 740, INK, 3);
      const f = Math.sin(t * 5) * 4;
      ctx.beginPath();
      ctx.moveTo(360, 742);
      ctx.quadraticCurveTo(380, 744 + f, 404, 750);
      ctx.quadraticCurveTo(380, 758 - f, 360, 762);
      fs(ctx, '#4fc93a', 2);
    },
  },
];

// --- hiding places ----------------------------------------------------------------------------

const iggy = [
  sp(610, 980, { pose: 'peek' }), // over the side of the orange rowboat
  sp(1060, 860, { pose: 'float', cover: seaCover(1060, 860) }), // bobbing between the boats
  sp(612, 548, { pose: 'cling', flip: true, s: 0.9, cover: (ctx) => piling(ctx, 630, PIER + 38, 590, 18) }), // up a pier piling
  sp(934, 1158, { pose: 'peek' }), // in the top crate on the dock
  sp(140, 1052, { pose: 'peek' }), // in the bait shop window
  sp(860, 642, { pose: 'peek' }), // on the roof of the boat called IGGY
  sp(470, 500, { pose: 'lie' }), // sunbathing on the pier
  sp(1440, 1182, { pose: 'peek' }), // in the barrel by the fish stall
];

const items = [
  { id: 'crab', prop: 'crab', count: 2, spots: [sp(1160, 1255), sp(80, 1255), sp(1520, 1080), sp(380, 1255)] },
  { id: 'starfish', prop: 'starfish', count: 2, spots: [sp(270, PIER - 10), sp(870, PIER - 10), sp(1660, 1050), sp(1000, 1100)] },
  { id: 'anchor', prop: 'anchor', spots: [sp(590, 745), sp(1060, 1215)] },
  { id: 'compass', prop: 'compass', spots: [sp(1520, 600), sp(1300, 1240)] },
  { id: 'key', prop: 'key', spots: [sp(640, 1255), sp(1060, 500)] },
  { id: 'bottle', prop: 'bottle', spots: [sp(160, 760), sp(1700, 900)] },
  { id: 'duck', prop: 'duck', spots: [sp(980, 1040), sp(520, 700)] },
  { id: 'sunglasses', prop: 'sunglasses', spots: [sp(1620, 700), sp(300, 1250)] },
  { id: 'cone', prop: 'cone', spots: [sp(1010, 1252), sp(160, 495)] },
  { id: 'trophy', prop: 'trophy', spots: [sp(250, 1100), sp(1780 - 40, 1160)] },
  { id: 'teddy', prop: 'teddy', spots: [sp(1380, 1030), sp(1290, 490)] },
  { id: 'snorkel', prop: 'snorkel', spots: [sp(1800 - 50, 640), sp(700, 760)] },
  { id: 'watch', prop: 'watch', spots: [sp(800, 1250), sp(1350, 690, { rot: 1.2 })] },
  { id: 'bucket', prop: 'bucket', o: { colour: '#ffd23a' }, spots: [sp(1230, 1150), sp(310, 650)] },
  { id: 'hotdog', prop: 'hotdog', spots: [sp(1600, 1140), sp(590, 1110)] },
  { id: 'captainhat', prop: 'captainhat', spots: [sp(1760, 790), sp(820, 1180)] },
  { id: 'boot', prop: 'boot', spots: [sp(450, 1150), sp(1130, 960)] },
];

const props = {
  captainhat: {
    box: [0, -4, 24, 14],
    draw(ctx) {
      ellipse(ctx, 0, -10, 22, 11, '#ffffff', 2.5);
      rrect(ctx, -18, -6, 36, 10, 3, '#1f4a8a', 2.5);
      ellipse(ctx, 8, 6, 16, 5, '#1f2a4a', 2.5);
      // a little gold anchor badge
      circle(ctx, 0, -10, 5, '#ffc93a', 1.5);
      line(ctx, 0, -14, 0, -6, INK, 1.5);
    },
  },
  boot: {
    // an old yellow wellington boot, fished up, dripping
    box: [0, 0, 18, 24],
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(-10, -22);
      ctx.lineTo(8, -22);
      ctx.lineTo(8, 8);
      ctx.lineTo(20, 10);
      ctx.quadraticCurveTo(24, 22, 14, 22);
      ctx.lineTo(-12, 22);
      ctx.closePath();
      fs(ctx, '#ffd23a', 2.5);
      rect(ctx, -12, -26, 22, 8, '#e8b020', 2);
      line(ctx, -12, 14, 22, 14, 'rgba(22,11,51,0.4)', 2);
      ellipse(ctx, -2, 30, 3, 4, '#9fe6ff', 1);
    },
  },
};

function sticker(ctx, r, t) {
  ctx.save();
  ctx.scale(r / 100, r / 100);
  ctx.fillStyle = lin(ctx, 0, -100, 0, 100, [[0, '#9fdcff'], [0.5, '#e8f8ff'], [0.51, '#25a7cc'], [1, '#1d86c4']]);
  ctx.beginPath();
  ctx.arc(0, 0, 100, 0, TAU);
  ctx.fill();
  sailboat(ctx, -20, 40, 0.75, '#ffffff', '#ff3d9a', '#4fc93a');
  ctx.translate(48, 50);
  ctx.scale(1.1, 1.1);
  drawIggy(ctx, 'float', t, {});
  ctx.restore();
}

export default {
  id: 'marina',
  name: 'The Marina',
  W, H,
  edge: '#1d86c4',
  back,
  actors,
  props,
  iggy,
  items,
  sticker,
};

