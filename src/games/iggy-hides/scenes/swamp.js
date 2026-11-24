// An airboat tour of the Everglades: cypress trees dripping with moss, golden sawgrass and
// murky water full of gators, a log of turtles, herons and frogs on lily pads, an airboat
// roaring down the channel and another loading up at the dock, and the visitor hut and
// boardwalk packed with tourists (one of them lost in a cloud of mosquitoes).
import { TAU, INK, lin, circle, ellipse, poly, rect, rrect, line, curve, fs, sky, sun, cloud, label, shadow, limb } from '../art/kit.js';
import { barrel, bench, crate } from '../art/scenery.js';
import { person, personAt, randomPerson } from '../art/people.js';
import { gator, heron, frog, turtle, snake, raccoon, lizard, flamingo } from '../art/animals.js';
import { drawProp } from '../art/props.js';
import { scatter, keepOutOf, depth } from '../art/crowd.js';

const W = 1800;
const H = 1300;
const WATER = 290; // where the water starts below the far trees
const DECK = 1170; // boardwalk floor (people's feet sit just below)

const waterFill = (ctx) => lin(ctx, 0, WATER, 0, H, [[0, '#7fb8a0'], [0.35, '#4f9486'], [1, '#2c6260']]);

// Murky water over the lower half of a floating thing at waterline y, plus a ripple.
function waterCover(x, y, w = 44) {
  return (ctx, t) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - w, y + 2);
    for (let k = -w; k <= w; k += 8) ctx.lineTo(x + k, y + Math.sin(k / 9 + t * 3) * 1.5);
    ctx.lineTo(x + w, y + 56);
    ctx.lineTo(x - w, y + 56);
    ctx.closePath();
    ctx.fillStyle = waterFill(ctx);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(230,255,240,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, w * 0.8, 5, 0, 0, Math.PI);
    ctx.stroke();
  };
}

const sp = (x, y, o = {}) => ({ x, y, ...o });

// --- set pieces -------------------------------------------------------------------------------

function ripple(ctx, x, y, w) {
  ctx.strokeStyle = 'rgba(230,255,240,0.6)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(x, y, w, w * 0.16, 0, 0, Math.PI);
  ctx.stroke();
}

// A clump of sawgrass: golden blades fanning up from a base at y.
function sawgrass(ctx, x, y, w, h, seed = 1) {
  let a = seed * 9301 + 49297;
  const rnd = () => ((a = (a * 9301 + 49297) % 233280) / 233280);
  const cols = ['#c8b45a', '#a89a48', '#d8c878', '#8f9a44', '#b8a050'];
  const n = Math.round(w / 6);
  for (let i = 0; i < n; i++) {
    const bx = x - w / 2 + (i / n) * w + rnd() * 6;
    const lean = (rnd() - 0.5) * w * 0.5 + (bx - x) * 0.4;
    const bh = h * (0.6 + rnd() * 0.45);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(bx, y);
    ctx.quadraticCurveTo(bx + lean * 0.3, y - bh * 0.6, bx + lean, y - bh);
    ctx.stroke();
    ctx.strokeStyle = cols[i % cols.length];
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function lilypad(ctx, x, y, r, bloom = false) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.ellipse(x, y, r, r * 0.42, 0, 0.35, TAU - 0.05);
  ctx.closePath();
  fs(ctx, '#5aa84a', 2.5);
  line(ctx, x, y, x - r * 0.6, y - r * 0.12, '#3f8a3a', 1.5);
  line(ctx, x, y, x - r * 0.3, y + r * 0.3, '#3f8a3a', 1.5);
  if (bloom) {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI - Math.PI;
      ellipse(ctx, x + r * 0.2 + Math.cos(a) * 6, y - 8 + Math.sin(a) * 6, 4, 8, '#ffffff', 1.5, INK, a + Math.PI / 2);
    }
    circle(ctx, x + r * 0.2, y - 8, 3.5, '#ffe14d', 1.2);
  }
}

// Spanish moss: grey-green strands hanging from (x, y).
function moss(ctx, x, y, len, sway = 0) {
  for (let k = -2; k <= 2; k++) {
    const l = len * (0.7 + ((k + 2) % 3) * 0.15);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x + k * 5, y);
    ctx.quadraticCurveTo(x + k * 6 + sway * 0.5, y + l * 0.5, x + k * 4 + sway, y + l);
    ctx.stroke();
    ctx.strokeStyle = k % 2 ? '#a8b898' : '#8fa080';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

// A bald cypress standing in the water: a flared trunk, knees round the foot, crooked
// branches and flat clouds of needles hung with moss. (x, y) is the waterline at the trunk.
function cypress(ctx, x, y, h, flip = 1) {
  const bark = '#8a7058';
  const dark = '#5e4a38';
  // knees poking out of the water
  for (const [kx, kh] of [[-70, 22], [-48, 30], [52, 26], [78, 18], [-95, 14]]) {
    poly(ctx, [[x + kx * flip - 7, y + 4], [x + kx * flip - 3, y - kh], [x + kx * flip + 3, y - kh - 3], [x + kx * flip + 7, y + 4]], bark, 2.5);
  }
  ctx.beginPath();
  ctx.moveTo(x - 64, y + 4);
  ctx.quadraticCurveTo(x - 20, y - 40, x - 18, y - h * 0.4);
  ctx.lineTo(x - 13, y - h);
  ctx.lineTo(x + 13, y - h);
  ctx.lineTo(x + 18, y - h * 0.4);
  ctx.quadraticCurveTo(x + 20, y - 40, x + 64, y + 4);
  ctx.closePath();
  fs(ctx, lin(ctx, x - 60, 0, x + 60, 0, [[0, bark], [1, dark]]), 3);
  for (let k = 0; k < 7; k++) line(ctx, x - 10 + (k % 3) * 9, y - 30 - k * (h / 8), x - 8 + (k % 3) * 9, y - 70 - k * (h / 8), 'rgba(40,28,18,0.4)', 2);
  ripple(ctx, x, y + 4, 80);
  // branches
  const br = [[-1, 0.62, 120], [1, 0.72, 140], [-1, 0.86, 100], [1, 0.95, 90]];
  for (const [d, at, len] of br) {
    const by = y - h * at;
    limb(ctx, [[x, by], [x + d * flip * len * 0.6, by - 30], [x + d * flip * len, by - 20]], bark, 9, 2.5);
  }
  // needle clouds
  const clouds = [[-130, 0.66, 70], [140, 0.76, 80], [-90, 0.9, 64], [100, 0.98, 60], [0, 1.04, 70], [-40, 0.8, 50], [60, 0.86, 55]];
  for (const [cx, at, r] of clouds) {
    const px = x + cx * flip;
    const py = y - h * at - 20;
    ellipse(ctx, px, py, r, r * 0.42, '#5d8f3a', 2.5);
    ellipse(ctx, px - r * 0.2, py - r * 0.12, r * 0.6, r * 0.2, '#7aab4a', 0);
  }
  for (const [cx, at, r] of clouds) moss(ctx, x + cx * flip - r * 0.3, y - h * at - 4, 40 + r * 0.4);
}

function log(ctx, x, y, w) {
  ripple(ctx, x, y + 18, w * 0.6);
  rrect(ctx, x - w / 2, y - 22, w, 44, 22, '#8a6040', 3);
  for (let k = 0; k < 5; k++) curve(ctx, x - w / 2 + 40 + k * (w / 6), y - 12, x - w / 2 + 60 + k * (w / 6), y - 6, x - w / 2 + 80 + k * (w / 6), y - 14, 'rgba(40,28,18,0.4)', 2);
  ellipse(ctx, x + w / 2 - 6, y, 16, 22, '#c89a6a', 3);
  ellipse(ctx, x + w / 2 - 6, y, 8, 11, 'rgba(0,0,0,0)', 2);
  // a little branch with a leaf
  limb(ctx, [[x - w * 0.25, y - 18], [x - w * 0.3, y - 50]], '#8a6040', 6, 2);
  ellipse(ctx, x - w * 0.3 - 8, y - 54, 10, 5, '#7aab4a', 2, INK, -0.5);
}

function mudbank(ctx, x0, x1, y) {
  ctx.beginPath();
  ctx.moveTo(x0, y + 20);
  ctx.quadraticCurveTo(x0 + 40, y - 30, (x0 + x1) / 2, y - 34);
  ctx.quadraticCurveTo(x1 - 40, y - 30, x1, y + 20);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, y - 34, 0, y + 20, [[0, '#a88a5a'], [1, '#7a6040']]), 3);
  for (let k = 0; k < 14; k++) ellipse(ctx, x0 + 40 + ((k * 73) % (x1 - x0 - 80)), y - 10 + ((k * 31) % 22), 4, 2, 'rgba(60,40,20,0.35)', 0);
  ripple(ctx, (x0 + x1) / 2, y + 22, (x1 - x0) * 0.55);
}

// The hut on the boardwalk: a tin roof, a gift shop window with a plush gator, a ticket
// window and an AIRBOAT TOURS sign.
function hut(ctx, x, y) {
  rect(ctx, x, y - 190, 290, 190, '#e8c890', 3);
  for (let k = 1; k < 9; k++) line(ctx, x + 4, y - 190 + k * 21, x + 286, y - 190 + k * 21, 'rgba(110,68,38,0.35)', 2);
  poly(ctx, [[x - 24, y - 186], [x + 314, y - 186], [x + 270, y - 250], [x + 20, y - 250]], '#7fb0c0', 3);
  for (let k = 0; k < 14; k++) line(ctx, x - 14 + k * 24, y - 188, x + 26 + k * 18.5, y - 248, 'rgba(22,11,51,0.25)', 2);
  rrect(ctx, x + 40, y - 300, 210, 46, 10, '#ffe14d', 3);
  label(ctx, 'AIRBOAT TOURS', x + 145, y - 277, 22, '#ff3d5a', { lw: 4, stroke: '#ffffff' });
  line(ctx, x + 70, y - 254, x + 70, y - 250, INK, 3);
  line(ctx, x + 220, y - 254, x + 220, y - 250, INK, 3);
  // gift shop window with a plush green gator (a decoy) and a pink flamingo toy
  rect(ctx, x + 18, y - 150, 100, 70, '#bfe8ff', 3);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 18, y - 150, 100, 70);
  ctx.clip();
  rrect(ctx, x + 26, y - 108, 70, 22, 11, '#6fd34a', 2.5);
  rrect(ctx, x + 80, y - 112, 30, 14, 7, '#6fd34a', 2.5);
  circle(ctx, x + 82, y - 116, 5, '#ffffff', 1.5);
  circle(ctx, x + 83, y - 116, 2, INK, 0);
  ctx.restore();
  rect(ctx, x + 14, y - 82, 108, 8, '#ffffff', 2);
  // ticket window (Iggy sometimes peeks out of it)
  rect(ctx, x + 160, y - 150, 100, 64, '#3a3f55', 3);
  rect(ctx, x + 154, y - 88, 112, 9, '#ffffff', 2);
  rect(ctx, x + 175, y - 165, 70, 16, '#ff8a2a', 2);
  label(ctx, 'TICKETS', x + 210, y - 157, 11, '#ffffff', { lw: 0 });
  // door
  rect(ctx, x + 126, y - 120, 30, 120, '#a8743f', 2.5);
  circle(ctx, x + 150, y - 60, 3, '#ffe14d', 1);
}

function boardwalk(ctx, x0, x1) {
  // posts into the water, the deck and the back rail
  for (let x = x0 + 20; x < x1; x += 90) rect(ctx, x - 8, DECK + 50, 16, H - DECK - 40, '#6e4426', 2.5);
  ctx.fillStyle = lin(ctx, 0, DECK - 20, 0, DECK + 52, [[0, '#d0a068'], [1, '#b8844c']]);
  ctx.beginPath();
  ctx.rect(x0, DECK - 20, x1 - x0, 72);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  for (let x = x0 + 30; x < x1; x += 30) line(ctx, x, DECK - 18, x - 6, DECK + 50, 'rgba(110,68,38,0.45)', 2);
  rect(ctx, x0, DECK + 50, x1 - x0, 12, '#8a5a2c', 2.5);
}

function backRail(ctx, x0, x1) {
  for (let x = x0 + 10; x < x1; x += 60) rect(ctx, x - 4, DECK - 72, 8, 54, '#a8743f', 2);
  rrect(ctx, x0, DECK - 78, x1 - x0, 9, 4, '#c98f4f', 2.5);
  rrect(ctx, x0, DECK - 50, x1 - x0, 7, 3, '#c98f4f', 2);
}

// An airboat seen side on, facing right, waterline at y: a flat hull, rows of tourists, a
// high driver's chair and the big caged fan at the back. Returns the fan centre.
function airboat(ctx, x, y, s, riders, t, spin = true) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // riders sit behind the gunwale
  riders.forEach((o, i) => {
    ctx.save();
    ctx.translate(-30 + i * 52, -24);
    ctx.scale(0.8, 0.8);
    person(ctx, o, t);
    ctx.restore();
  });
  // driver up on his chair
  rect(ctx, -132, -110, 8, 78, '#c9d0de', 2);
  rect(ctx, -104, -110, 8, 78, '#c9d0de', 2);
  rrect(ctx, -140, -118, 52, 12, 4, '#3a3f55', 2.5);
  ctx.save();
  ctx.translate(-114, -118);
  ctx.scale(0.8, 0.8);
  person(ctx, { pose: 'sit', skin: '#e0a878', hair: '#4a2c18', hairStyle: 'short', top: '#3fae4a', outfit: 'tee', bottom: '#3a3f55', hat: 'cap', hatColour: '#ff8a2a', shades: true, phase: 3 }, t);
  ctx.restore();
  // hull
  ctx.beginPath();
  ctx.moveTo(-210, -36);
  ctx.lineTo(200, -36);
  ctx.quadraticCurveTo(240, -36, 250, -14);
  ctx.lineTo(236, 4);
  ctx.lineTo(-210, 4);
  ctx.closePath();
  fs(ctx, '#ffffff', 3);
  line(ctx, -206, -22, 236, -22, '#ff3d5a', 6);
  line(ctx, -206, -12, 240, -12, '#2fb5e8', 4);
  // the fan cage
  rect(ctx, -196, -70, 12, 40, '#c9d0de', 2);
  const fx = -190;
  const fy = -130;
  circle(ctx, fx, fy, 72, 'rgba(255,255,255,0.12)', 3);
  ctx.strokeStyle = 'rgba(22,11,51,0.55)';
  ctx.lineWidth = 1.5;
  for (let k = -60; k <= 60; k += 15) {
    const hh = Math.sqrt(72 * 72 - k * k);
    line(ctx, fx + k, fy - hh, fx + k, fy + hh, 'rgba(22,11,51,0.45)', 1.5);
  }
  if (spin) fan(ctx, fx, fy, t);
  circle(ctx, fx, fy, 72, 'rgba(0,0,0,0)', 4);
  ctx.restore();
}

function fan(ctx, fx, fy, t) {
  ctx.save();
  ctx.translate(fx, fy);
  ctx.rotate(t * 25);
  ctx.fillStyle = 'rgba(122,74,34,0.35)';
  ctx.beginPath();
  ctx.arc(0, 0, 64, 0, TAU);
  ctx.fill();
  for (let k = 0; k < 2; k++) {
    ctx.rotate(Math.PI);
    ellipse(ctx, 0, -34, 9, 32, '#a8743f', 2);
  }
  ctx.restore();
  circle(ctx, fx, fy, 9, '#3a3f55', 2);
}

// Just the eyes and snout of a gator lying low in the water at waterline y.
function gatorLow(ctx, x, y, s = 1, flip = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -s : s, s);
  ellipse(ctx, -40, 0, 34, 7, '#4f7a3a', 2.5);
  for (let k = 0; k < 4; k++) poly(ctx, [[-66 + k * 14, -4], [-62 + k * 14, -11], [-58 + k * 14, -4]], '#3a6a2a', 1.5);
  ellipse(ctx, 22, 0, 30, 7, '#4f7a3a', 2.5);
  circle(ctx, 0, -6, 8, '#4f7a3a', 2.5);
  circle(ctx, 1, -8, 3.5, '#ffe14d', 1.5);
  line(ctx, 1, -11, 1, -5, INK, 2);
  circle(ctx, 46, -4, 2, INK, 0);
  ctx.restore();
  ripple(ctx, x, y + 4, 70 * s);
}

function picnicTable(ctx, x, y) {
  rect(ctx, x - 70, y - 54, 140, 12, '#a8743f', 2.5);
  line(ctx, x - 54, y - 42, x - 64, y, INK, 5);
  line(ctx, x + 54, y - 42, x + 64, y, INK, 5);
  rect(ctx, x - 80, y - 26, 160, 8, '#a8743f', 2);
}

function signpost(ctx, x, y, text, c = '#ffffff') {
  rect(ctx, x - 5, y - 110, 10, 110, '#8a5a3c', 2.5);
  rrect(ctx, x - 70, y - 150, 140, 50, 6, c, 3);
  label(ctx, text, x, y - 125, 17, '#ff3d5a', { lw: 0 });
}

// --- scene-only things to find ---------------------------------------------------------------

const props = {
  boot: {
    box: [0, -2, 18, 22],
    draw(ctx, o) {
      const c = o.colour || '#ffd23a';
      ctx.beginPath();
      ctx.moveTo(-12, -22);
      ctx.lineTo(6, -22);
      ctx.lineTo(6, 6);
      ctx.quadraticCurveTo(20, 6, 20, 16);
      ctx.lineTo(-14, 18);
      ctx.closePath();
      fs(ctx, c, 2.5);
      rect(ctx, -14, -24, 22, 6, c, 2);
      line(ctx, -14, 12, 20, 12, 'rgba(22,11,51,0.4)', 3);
    },
  },
  paddle: {
    box: [0, 0, 10, 30],
    draw(ctx, o) {
      ctx.save();
      ctx.rotate(0.5);
      line(ctx, 0, -30, 0, 14, INK, 7);
      line(ctx, 0, -30, 0, 14, '#c98f4f', 4);
      rect(ctx, -6, -34, 12, 5, '#3a3f55', 1.5);
      rrect(ctx, -9, 10, 18, 26, 8, o.colour || '#ff8a2a', 2.5);
      ctx.restore();
    },
  },
  lantern: {
    box: [0, 0, 15, 22],
    draw(ctx, o) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -16, 8, Math.PI, 0);
      ctx.stroke();
      rect(ctx, -12, -16, 24, 6, o.colour || '#ff3d5a', 2);
      rrect(ctx, -10, -10, 20, 24, 4, '#fff3a0', 2.5);
      line(ctx, -10, 2, 10, 2, 'rgba(22,11,51,0.4)', 1.5);
      rect(ctx, -12, 14, 24, 6, o.colour || '#ff3d5a', 2);
    },
  },
};

// --- the picture ------------------------------------------------------------------------------

function back(ctx, r) {
  sky(ctx, W, 0, WATER, [[0, '#7cc4f0'], [0.7, '#c8ecf0'], [1, '#e8f6e0']]);
  sun(ctx, 300, 90, 40, { glowC: 'rgba(255,240,180,0.45)' });
  // far cypress domes and pines
  for (let i = 0; i < 26; i++) {
    const x = i * 72 + ((i * 37) % 30);
    const h = 50 + ((i * 53) % 60);
    ellipse(ctx, x, WATER - h * 0.4, 50, h * 0.6, i % 2 ? '#7aa87a' : '#6a986e', 2, 'rgba(22,11,51,0.4)');
  }
  for (let i = 0; i < 9; i++) {
    const x = 120 + i * 200 + ((i * 41) % 60);
    line(ctx, x, WATER, x, WATER - 120, '#5a5040', 4);
    ellipse(ctx, x, WATER - 130, 26, 12, '#4f7a4a', 2, 'rgba(22,11,51,0.4)');
  }
  // the water
  ctx.fillStyle = waterFill(ctx);
  ctx.fillRect(0, WATER, W, H - WATER);
  line(ctx, 0, WATER, W, WATER, 'rgba(22,11,51,0.5)', 2);
  for (let k = 0; k < 60; k++) ripple(ctx, r() * W, WATER + 20 + r() * (H - WATER - 40), 10 + r() * 20);
  // far sawgrass prairie, the airboat channel cut through it
  for (let i = 0; i < 30; i++) sawgrass(ctx, i * 62 + 20, WATER + 60 + (i % 3) * 8, 80, 50, i + 3);
  for (let i = 0; i < 10; i++) {
    const x = 60 + i * 190;
    sawgrass(ctx, x, 640 + (i % 2) * 14, 120, 70, i + 40);
  }

  const D = depth();
  const keep = keepOutOf([...iggy, ...items.flatMap((it) => it.spots)]);
  const place = (x, y, hw, hh, fn) => {
    keep.push({ x, y: y - hh / 2, hw, hh: hh / 2 + 20 });
    D.add(y, fn);
  };
  // big cypresses at each side
  D.add(880, () => cypress(ctx, 150, 880, 620, 1));
  D.add(800, () => cypress(ctx, 1660, 800, 560, -1));
  // anoles on the trunks (little brown and green lizards: decoys)
  D.add(881, () => {
    ctx.save();
    ctx.translate(178, 640);
    ctx.rotate(-1.4);
    lizard(ctx, { colour: '#5fbf3a', s: 1.4 }, 0);
    ctx.restore();
    ctx.save();
    ctx.translate(1630, 520);
    ctx.rotate(1.6);
    lizard(ctx, { colour: '#a8743f', s: 1.4 }, 0);
    ctx.restore();
  });
  // a log full of turtles sunning themselves
  place(930, 790, 170, 60, () => {
    log(ctx, 930, 790, 300);
    for (const [tx, c, sh, fl] of [[840, '#5a9a3a', '#6e5a3a', false], [905, '#4f8a3a', '#8a6a3a', false], [975, '#5a9a3a', '#5a4a3a', true]]) {
      ctx.save();
      ctx.translate(tx, 770);
      turtle(ctx, { colour: c, shell: sh, flip: fl }, 0);
      ctx.restore();
    }
  });
  // the mud bank with gators sunbathing; one wears a party hat for its birthday
  place(1390, 850, 240, 90, () => {
    mudbank(ctx, 1150, 1620, 840);
    ctx.save();
    ctx.translate(1270, 830);
    gator(ctx, { colour: '#4f7a3a' }, 0);
    ctx.restore();
    ctx.save();
    ctx.translate(1540, 822);
    ctx.scale(-0.9, 0.9);
    gator(ctx, { colour: '#5a8a42' }, 0);
    ctx.restore();
    poly(ctx, [[1462, 800], [1484, 800], [1474, 770]], '#ff5ab8', 2);
    circle(ctx, 1474, 768, 4, '#ffe14d', 1.5);
    for (let k = 0; k < 3; k++) circle(ctx, 1466 + k * 6, 792 - k * 8, 2, '#ffffff', 0);
  });
  // a gator chilling in a pink swim ring (a decoy for Iggy's ring)
  place(1110, 940, 70, 50, () => {
    gatorLow(ctx, 1110, 940, 0.9, true);
    ctx.save();
    ctx.lineWidth = 16 + 5;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.ellipse(1112, 940, 34, 11, 0, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = 16;
    ctx.strokeStyle = '#ff7ab6';
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(1100, 934);
    ctx.scale(-0.9, 0.9);
    circle(ctx, 0, -6, 8, '#4f7a3a', 2.5);
    circle(ctx, 1, -8, 3.5, '#ffe14d', 1.5);
    line(ctx, 1, -11, 1, -5, INK, 2);
    ctx.restore();
  });
  // gators lying low all over the water
  for (const [gx, gy, gs, fl] of [[420, 900, 1, false], [1300, 1010, 0.9, true], [760, 610, 0.7, false], [1530, 640, 0.75, true], [300, 700, 0.8, true], [1000, 1060, 0.85, false]]) {
    D.add(gy, () => gatorLow(ctx, gx, gy, gs, fl));
  }
  // lily pads with frogs (green decoys) and water lilies
  D.add(730, () => {
    for (const [lx, ly, lr, b] of [[220, 735, 26, true], [300, 760, 22, false], [380, 720, 20, false], [120, 760, 18, true], [560, 760, 24, true], [640, 735, 18, false]]) lilypad(ctx, lx, ly, lr, b);
  });
  D.add(1020, () => {
    for (const [lx, ly, lr, b] of [[600, 1030, 26, false], [690, 1050, 22, true], [780, 1020, 20, false], [880, 1060, 24, true], [1180, 1080, 20, false]]) lilypad(ctx, lx, ly, lr, b);
  });
  for (const [fx, fy] of [[380, 716], [780, 1016]]) {
    D.add(fy + 1, () => {
      ctx.save();
      ctx.translate(fx, fy);
      frog(ctx, { colour: '#6fcf4a' }, 0);
      ctx.restore();
    });
  }
  // sawgrass islands in the middle water (Iggy sometimes hides behind one)
  place(760, 980, 120, 90, () => sawgrass(ctx, 760, 980, 160, 90, 77));
  place(470, 1000, 90, 80, () => sawgrass(ctx, 470, 1000, 110, 80, 78));
  place(1210, 700, 80, 70, () => sawgrass(ctx, 1210, 700, 110, 70, 79));
  // a spoonbill and egret wading
  place(1030, 640, 30, 100, () => {
    ctx.save();
    ctx.translate(1030, 650);
    flamingo(ctx, { colour: '#ffa8c8', oneLeg: true }, 0);
    ctx.restore();
    ripple(ctx, 1035, 652, 26);
  });
  place(260, 1010, 30, 100, () => {
    ctx.save();
    ctx.translate(260, 1010);
    heron(ctx, { colour: '#ffffff', flip: true }, 0);
    ctx.restore();
    ripple(ctx, 262, 1012, 26);
  });
  // the parked airboat at the dock, loading tourists
  place(1490, 1120, 260, 200, () => {
    airboat(ctx, 1500, 1130, 1, [
      randomPerson(201, { pose: 'sit', kid: false, outfit: 'tee', item: 'phone', hat: 'visor' }),
      randomPerson(202, { pose: 'sit', kid: true, outfit: 'tee', item: null, hat: null }),
      randomPerson(203, { pose: 'sit', kid: false, outfit: 'tee', item: null, shades: true, hat: 'cap' }),
      randomPerson(204, { pose: 'sit', kid: false, outfit: 'dress', item: null, hat: null, wave: true }),
      randomPerson(205, { pose: 'sit', kid: true, outfit: 'tee', item: null, hat: 'bucket' }),
    ], 0, false);
    ripple(ctx, 1520, 1136, 260);
  });
  // the dock
  D.add(1180, () => {
    for (let x = 1240; x < W; x += 110) rect(ctx, x - 8, 1200, 16, 100, '#6e4426', 2.5);
    ctx.fillStyle = lin(ctx, 0, 1160, 0, 1210, [[0, '#d0a068'], [1, '#b8844c']]);
    ctx.fillRect(1200, 1160, W - 1200, 46);
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.strokeRect(1200, 1160, W - 1200 + 4, 46);
    for (let x = 1220; x < W; x += 28) line(ctx, x, 1162, x - 4, 1204, 'rgba(110,68,38,0.45)', 2);
    rect(ctx, 1200, 1206, W - 1200, 10, '#8a5a2c', 2.5);
    for (const x of [1250, 1760]) {
      rect(ctx, x - 10, 1120, 20, 50, '#8a5a2c', 2.5);
      ellipse(ctx, x, 1120, 10, 4, '#a8743f', 2);
    }
  });
  // the boardwalk, rail, hut and the people on it
  D.add(1150, () => {
    boardwalk(ctx, 0, 1200);
    backRail(ctx, 330, 1200);
  });
  place(160, 1170, 160, 250, () => hut(ctx, 15, 1170));
  place(1080, 1176, 30, 70, () => barrel(ctx, 1080, 1176, '#a8743f'));
  place(560, 1180, 70, 70, () => {
    bench(ctx, 560, 1180, 120, '#8a5a3c');
  });
  place(860, 1180, 80, 70, () => picnicTable(ctx, 860, 1182));
  // the NO FEEDING sign, planted right by the gators' bank
  place(1250, 905, 70, 150, () => {
    signpost(ctx, 1250, 905, 'NO FEEDING!', '#ffffff');
    ripple(ctx, 1250, 908, 30);
  });
  // a far-off lookout tower with tiny visitors
  D.add(420, () => {
    for (const lx of [-30, 30]) line(ctx, 1300 + lx, 430, 1300 + lx * 0.6, 340, '#8a6a4a', 5);
    rect(ctx, 1260, 320, 80, 22, '#a8743f', 2.5);
    poly(ctx, [[1252, 322], [1348, 322], [1300, 290]], '#5a8a5a', 2.5);
    for (let k = 0; k < 3; k++) {
      circle(ctx, 1280 + k * 20, 312, 6, ['#ffd9b8', '#c68a5a', '#e0a878'][k], 1.5);
      rect(ctx, 1275 + k * 20, 316, 10, 6, ['#ff3d5a', '#2fb5e8', '#ffd23a'][k], 1);
    }
  });
  // far egrets standing in the prairie
  for (const [ex, ey] of [[260, 372], [620, 368], [880, 376], [1500, 370], [1720, 374]]) {
    D.add(ey, () => {
      ctx.save();
      ctx.translate(ex, ey);
      ctx.scale(0.5, 0.5);
      heron(ctx, { colour: '#ffffff', flip: ex > 900 }, 0);
      ctx.restore();
    });
  }
  place(1700, 1185, 30, 50, () => crate(ctx, 1700, 1185, 56, 40, '#c98f4f'));
  // fill the open water: lily pads, tufts, cattails, stumps with birds drying their wings
  const fillers = scatter(r, 26, { x0: 40, y0: 690, x1: 1640, y1: 1110 }, keep, 40);
  fillers.forEach((p, i) => {
    const k = i % 6;
    D.add(p.y, () => {
      if (k === 0 || k === 3) {
        lilypad(ctx, p.x, p.y, 18 + (i % 3) * 5, i % 4 === 0);
        lilypad(ctx, p.x + 30, p.y + 8, 14, false);
      } else if (k === 1) {
        sawgrass(ctx, p.x, p.y, 60, 44, 200 + i);
      } else if (k === 2) {
        for (let c = -1; c <= 1; c++) {
          line(ctx, p.x + c * 10, p.y, p.x + c * 12, p.y - 60 - c * 6, INK, 5);
          line(ctx, p.x + c * 10, p.y, p.x + c * 12, p.y - 60 - c * 6, '#6a8a3a', 3);
          rrect(ctx, p.x + c * 12 - 5, p.y - 80 - c * 6, 10, 24, 5, '#7a4a22', 2);
        }
        ripple(ctx, p.x, p.y + 2, 24);
      } else if (k === 4) {
        rrect(ctx, p.x - 16, p.y - 40, 32, 44, 6, '#7a6050', 2.5);
        ellipse(ctx, p.x, p.y - 40, 16, 5, '#a88a6a', 2);
        ripple(ctx, p.x, p.y + 4, 30);
        // anhinga spreading its wings to dry
        ctx.save();
        ctx.translate(p.x, p.y - 44);
        poly(ctx, [[0, -14], [-34, -30], [-28, -6]], '#2a2a3a', 2);
        poly(ctx, [[0, -14], [34, -30], [28, -6]], '#2a2a3a', 2);
        ellipse(ctx, 0, -12, 8, 14, '#2a2a3a', 2);
        curve(ctx, 0, -24, 6, -36, 0, -44, INK, 5);
        curve(ctx, 0, -24, 6, -36, 0, -44, '#3a3a4a', 3);
        poly(ctx, [[0, -46], [12, -44], [0, -42]], '#ffb020', 1.2);
        ctx.restore();
      } else {
        // a floating leaf and some duckweed
        for (let d = 0; d < 9; d++) circle(ctx, p.x + Math.cos(d * 2.4) * 20, p.y + Math.sin(d * 2.4) * 6, 3, '#9ad86a', 1);
        ripple(ctx, p.x, p.y + 4, 22);
      }
    });
  });
  // tourists on the boardwalk
  const pts = scatter(r, 9, { x0: 360, y0: 1176, x1: 1180, y1: 1205 }, keep, 26);
  pts.forEach((p, i) => {
    const kinds = ['stand', 'point', 'walk', 'wave', 'hold', 'stand'];
    D.add(p.y + 2, () => personAt(ctx, p.x, p.y + 4, randomPerson(300 + i, { pose: kinds[i % kinds.length], outfit: i % 4 ? 'tee' : 'tank', hat: ['cap', 'visor', 'bucket', null][i % 4], item: i % 3 === 0 ? 'phone' : i % 3 === 1 ? 'drink' : null, flip: i % 2 === 1, kid: i % 3 === 2 }), 0));
  });
  // two tourists waiting on the dock
  D.add(1196, () => {
    personAt(ctx, 1330, 1196, randomPerson(401, { pose: 'stand', outfit: 'tee', hat: 'cap', item: 'drink' }), 0);
    personAt(ctx, 1380, 1200, randomPerson(402, { pose: 'cheer', kid: true, outfit: 'tee', hat: null, item: null }), 0);
  });
  // a gator posing behind a tourist's selfie (he has no idea)
  place(380, 1110, 70, 60, () => {
    ctx.save();
    ctx.translate(380, 1110);
    gator(ctx, { colour: '#4f7a3a', flip: true }, 0);
    ctx.restore();
    ripple(ctx, 380, 1118, 90);
  });
  D.draw();
  // sun sparkles on the water
  for (let k = 0; k < 30; k++) {
    const x = r() * W;
    const y = WATER + 30 + r() * 300;
    line(ctx, x - 6, y, x + 6, y, 'rgba(255,255,240,0.7)', 2);
  }
}

// --- moving things ----------------------------------------------------------------------------

const loop = (t, period) => (t % period) / period;

const actors = [
  // clouds
  ...[[400, 70, 40, 0], [1100, 110, 52, 0.4], [1600, 60, 34, 0.7]].map(([x, y, s, p]) => ({
    x: W / 2, y, hw: W / 2 + 120, hh: s, over: true,
    draw(ctx, t) {
      const cx = ((x + t * 7 + p * W) % (W + 240)) - 120;
      cloud(ctx, cx, y, s);
    },
  })),
  // an egret flapping across the sky
  {
    x: W / 2, y: 180, hw: W / 2 + 100, hh: 40, over: true,
    draw(ctx, t) {
      const x = ((t * 60) % (W + 200)) - 100;
      const y = 180 + Math.sin(t) * 12;
      const f = Math.sin(t * 6);
      ctx.save();
      ctx.translate(x, y);
      poly(ctx, [[-4, 0], [-34, -14 - f * 16], [-14, 4]], '#ffffff', 2);
      poly(ctx, [[4, 0], [30, -14 - f * 16], [12, 4]], '#ffffff', 2);
      ellipse(ctx, 0, 2, 16, 6, '#ffffff', 2);
      curve(ctx, 14, 0, 22, -6, 28, -2, INK, 5);
      curve(ctx, 14, 0, 22, -6, 28, -2, '#ffffff', 3);
      poly(ctx, [[30, -4], [42, -1], [30, 0]], '#ffb020', 1.2);
      line(ctx, -14, 2, -34, 4, INK, 2);
      ctx.restore();
    },
  },
  // the airboat roaring up and down the channel, spray flying
  {
    x: 940, y: 460, hw: 800, hh: 140,
    keep: [{ x: 940, y: 460, hw: 700, hh: 90 }],
    draw(ctx, t) {
      const k = loop(t, 22);
      const dir = k < 0.5 ? 1 : -1;
      const e = k < 0.5 ? k * 2 : 2 - k * 2;
      const x = 420 + ease(e) * 1000;
      const y = 540 + Math.sin(t * 4) * 2;
      ctx.fillStyle = 'rgba(230,255,240,0.75)';
      for (let i = 1; i < 9; i++) {
        ctx.beginPath();
        ctx.arc(x - dir * (200 + i * 16), y - 4 + Math.sin(i + t * 9) * 3, 11 - i, 0, TAU);
        ctx.fill();
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(dir, 1);
      airboat(ctx, 0, 0, 0.85, [0, 1, 2, 3].map((i) => randomPerson(500 + i, { pose: 'sit', outfit: 'tee', hat: i === 1 ? null : 'cap', item: null, wave: i % 2 === 0, phase: i })), t, true);
      ctx.restore();
      // a cap blowing off in the wind
      const ck = loop(t, 5);
      ctx.save();
      ctx.translate(x - dir * (60 + ck * 160), y - 90 - Math.sin(ck * Math.PI) * 50);
      ctx.rotate(ck * 8);
      ctx.beginPath();
      ctx.arc(0, 0, 10, Math.PI, 0);
      ctx.closePath();
      fs(ctx, '#ff3d5a', 2);
      ctx.restore();
    },
  },
  // the parked airboat's fan idling
  {
    x: 1310, y: 1000, hw: 80, hh: 80,
    draw(ctx, t) {
      fan(ctx, 1310, 1000, t * 0.3);
    },
  },
  // the tour guide on the dock, pointing out the gators
  {
    x: 1600, y: 1130, hw: 50, hh: 80,
    keep: [{ x: 1600, y: 1140, hw: 34, hh: 60 }],
    draw(ctx, t) {
      ctx.save();
      ctx.translate(1600, 1198);
      shadow(ctx, 0, 0, 20);
      const pointing = Math.sin(t * 0.8) > -0.3;
      person(ctx, { pose: pointing ? 'point' : 'wave', flip: true, skin: '#9a6440', hair: '#16101e', hairStyle: 'short', top: '#ffd23a', outfit: 'tee', bottom: '#3a6a3a', hat: 'cowboy', hatColour: '#8a5a2c', phase: 2 }, t);
      ctx.restore();
    },
  },
  // the ranger with binoculars, looking the wrong way while a gator smiles behind him
  {
    x: 690, y: 1120, hw: 40, hh: 80,
    keep: [{ x: 690, y: 1135, hw: 30, hh: 60 }],
    draw(ctx, t) {
      ctx.save();
      ctx.translate(690, 1196);
      shadow(ctx, 0, 0, 20);
      person(ctx, { pose: 'hold', flip: Math.sin(t * 0.4) > 0, skin: '#f5c49c', hair: '#c98f4f', hairStyle: 'short', top: '#a8a070', outfit: 'tee', bottom: '#5a6a3a', hat: 'cowboy', hatColour: '#7a6a4a', item: 'binoculars', phase: 4 }, t);
      ctx.restore();
    },
  },
  // a tourist in a cloud of mosquitoes, swatting
  {
    x: 960, y: 1110, hw: 60, hh: 90,
    keep: [{ x: 960, y: 1125, hw: 40, hh: 70 }],
    draw(ctx, t) {
      ctx.save();
      ctx.translate(960, 1200);
      shadow(ctx, 0, 0, 20);
      person(ctx, { pose: 'cheer', skin: '#ffd9b8', hair: '#f2d27a', hairStyle: 'spiky', top: '#ff7a6a', outfit: 'tee', bottom: '#2fb5e8', mood: 'wow', phase: 5 }, t * 2.5);
      ctx.restore();
      for (let i = 0; i < 14; i++) {
        const a = t * (3 + (i % 4)) + i * 1.7;
        const mx = 960 + Math.cos(a) * (30 + (i % 3) * 10);
        const my = 1080 + Math.sin(a * 1.3) * 28;
        circle(ctx, mx, my, 2.2, INK, 0);
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(mx - 3, my - 3);
        ctx.lineTo(mx, my);
        ctx.lineTo(mx + 3, my - 3);
        ctx.stroke();
      }
    },
  },
  // the selfie-taker (the gator behind her grins)
  {
    x: 440, y: 1130, hw: 40, hh: 80,
    keep: [{ x: 445, y: 1140, hw: 30, hh: 60 }],
    draw(ctx, t) {
      ctx.save();
      ctx.translate(445, 1198);
      shadow(ctx, 0, 0, 20);
      person(ctx, { pose: 'hold', skin: '#c68a5a', hair: '#2a1a10', hairStyle: 'long', top: '#a64dff', outfit: 'dress', item: 'phone', phase: 6 }, t);
      ctx.restore();
      if (((t % 4) < 0.15)) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(475, 1090, 14, 0, TAU);
        ctx.fill();
      }
    },
  },
  // gators on the bank opening and shutting their jaws
  {
    x: 1300, y: 805, hw: 120, hh: 50,
    keep: [{ x: 1300, y: 815, hw: 80, hh: 25 }],
    draw(ctx, t) {
      ctx.save();
      ctx.translate(1180, 812);
      gator(ctx, { colour: '#3f6a30', open: true, phase: 1, s: 0.85 }, t);
      ctx.restore();
    },
  },
  // the heron fishing (stab!)
  {
    x: 520, y: 870, hw: 40, hh: 70,
    keep: [{ x: 520, y: 865, hw: 25, hh: 50 }],
    draw(ctx, t) {
      ctx.save();
      ctx.translate(520, 905);
      heron(ctx, { colour: '#8aa0c8', phase: 2 }, t);
      ctx.restore();
      ripple(ctx, 522, 907, 26);
    },
  },
  // a snake swaying on the left cypress branch
  {
    x: 70, y: 435, hw: 70, hh: 20,
    draw(ctx, t) {
      ctx.save();
      ctx.translate(60, 430);
      ctx.rotate(0.2);
      snake(ctx, { colour: '#ffb020', s: 0.8, flip: true }, t);
      ctx.restore();
    },
  },
  // frogs hopping on lily pads
  ...[[300, 756, 1], [880, 1056, 2], [560, 756, 3]].map(([x, y, p]) => ({
    x, y: y - 20, hw: 22, hh: 30,
    draw(ctx, t) {
      ctx.save();
      ctx.translate(x, y);
      frog(ctx, { colour: '#5fbf3a', phase: p }, t);
      ctx.restore();
    },
  })),
  // a kayak drifting about with two paddlers
  {
    x: 980, y: 670, hw: 120, hh: 60,
    keep: [{ x: 1120, y: 660, hw: 60, hh: 40 }],
    draw(ctx, t) {
      const x = 1120 + Math.sin(t * 0.3) * 20;
      const y = 680;
      ctx.save();
      ctx.translate(x, y);
      ctx.save();
      ctx.beginPath();
      ctx.rect(-80, -120, 160, 112);
      ctx.clip();
      for (const [px, seed] of [[-20, 601], [22, 602]]) {
        ctx.save();
        ctx.translate(px, -6);
        ctx.scale(0.62, 0.62);
        person(ctx, randomPerson(seed, { pose: 'sit', outfit: 'tee', hat: px < 0 ? 'bucket' : null, item: null }), t);
        ctx.restore();
      }
      ctx.restore();
      const a = Math.sin(t * 3) * 0.6;
      line(ctx, -30 * Math.cos(a), -20 + Math.sin(a) * 20, 30 * Math.cos(a), -20 - Math.sin(a) * 20, INK, 4);
      ctx.beginPath();
      ctx.moveTo(-60, -10);
      ctx.quadraticCurveTo(0, 8, 60, -10);
      ctx.quadraticCurveTo(0, -2, -60, -10);
      fs(ctx, '#ff8a2a', 2.5);
      ctx.restore();
      ripple(ctx, x, y + 2, 64);
    },
  },
  // the raccoon on the hut roof, peeking at the picnic food
  {
    x: 70, y: 925, hw: 40, hh: 30,
    draw(ctx, t) {
      ctx.save();
      ctx.translate(60, 935 + Math.max(0, Math.sin(t * 0.9)) * 8);
      ctx.rotate(0.2);
      raccoon(ctx, { s: 0.9 }, t);
      ctx.restore();
    },
  },
  // dragonflies darting about
  ...[[600, 880, 0], [1400, 960, 2]].map(([x, y, p]) => ({
    x, y, hw: 90, hh: 50, over: true,
    draw(ctx, t) {
      const dx = x + Math.sin(t * 1.3 + p) * 80;
      const dy = y + Math.sin(t * 2.1 + p) * 30;
      const f = Math.abs(Math.sin(t * 40));
      ellipse(ctx, dx - 6, dy - 6, 10, 3 + f * 2, 'rgba(255,255,255,0.7)', 1, INK, -0.3);
      ellipse(ctx, dx + 6, dy - 6, 10, 3 + f * 2, 'rgba(255,255,255,0.7)', 1, INK, 0.3);
      line(ctx, dx - 14, dy, dx + 10, dy, INK, 5);
      line(ctx, dx - 14, dy, dx + 10, dy, '#2fb5e8', 3);
      circle(ctx, dx + 12, dy, 3.5, '#2fb5e8', 1.5);
    },
  })),
  // moss swaying on the right cypress
  {
    x: 1730, y: 360, hw: 40, hh: 60,
    draw(ctx, t) {
      moss(ctx, 1740, 300, 90, Math.sin(t * 1.2) * 8);
    },
  },
];

const ease = (k) => k * k * (3 - 2 * k);

// --- hiding places ----------------------------------------------------------------------------

// sawgrass in front of Iggy when he stands in the island
const grassCover = (x, y) => (ctx) => sawgrass(ctx, x, y + 6, 90, 60, 91);
// moss strands across Iggy on the trunk
const mossCover = (x, y) => (ctx, t) => moss(ctx, x, y, 70, Math.sin(t * 1.2) * 4);

const iggy = [
  sp(1050, 768, { pose: 'peek' }), // on the end of the turtle log
  sp(220, 700, { pose: 'float', cover: waterCover(220, 700) }), // among the lily pads
  sp(1606, 640, { pose: 'cling', s: 0.9, cover: mossCover(1596, 600) }), // up the cypress trunk
  sp(210, 1080, { pose: 'peek' }), // in the ticket window
  sp(700, 972, { pose: 'stand', cover: grassCover(700, 972) }), // in the sawgrass island
  sp(1560, 1094, { pose: 'peek' }), // aboard the parked airboat
  sp(1405, 812, { pose: 'lie' }), // sunbathing on the gators' mud bank
  sp(1080, 1110, { pose: 'peek', hy: -16, hit: [34, 30] }), // in the barrel on the boardwalk
];

const items = [
  { id: 'sunhat', prop: 'sunhat', spots: [sp(1440, 1190), sp(440, 640), sp(770, 1125)] },
  { id: 'camera', prop: 'camera', spots: [sp(560, 1140), sp(1340, 770)] },
  { id: 'bottle', prop: 'bottle', spots: [sp(110, 990), sp(1250, 920)] },
  { id: 'duck', prop: 'duck', count: 2, spots: [sp(470, 760), sp(1720, 960), sp(940, 980), sp(330, 860)] },
  { id: 'lifering', prop: 'lifering', spots: [sp(300, 960), sp(1760, 1080)] },
  { id: 'compass', prop: 'compass', spots: [sp(1690, 860), sp(40, 1250)] },
  { id: 'key', prop: 'key', spots: [sp(320, 1240), sp(1700, 1240)] },
  { id: 'sunglasses', prop: 'sunglasses', spots: [sp(1310, 1240), sp(760, 1250)] },
  { id: 'fish', prop: 'fish', count: 2, spots: [sp(620, 880), sp(860, 880), sp(1460, 960), sp(160, 1220)] },
  { id: 'flipflop', prop: 'flipflop', spots: [sp(1150, 1240, { rot: 0.6 }), sp(1760, 700)] },
  { id: 'snail', prop: 'snail', count: 2, spots: [sp(100, 860), sp(990, 760), sp(1600, 780), sp(520, 1250)] },
  { id: 'watch', prop: 'watch', spots: [sp(645, 718), sp(1430, 700), sp(40, 560)] },
  { id: 'teddy', prop: 'teddy', spots: [sp(1460, 1050), sp(960, 1250)] },
  { id: 'hotdog', prop: 'hotdog', spots: [sp(830, 1120), sp(1630, 1235)] },
  { id: 'popcorn', prop: 'popcorn', spots: [sp(600, 1110), sp(1760, 1150)] },
  { id: 'anchor', prop: 'anchor', spots: [sp(1220, 1140), sp(60, 700)] },
  { id: 'boot', prop: 'boot', spots: [sp(1000, 900), sp(380, 1000)] },
  { id: 'paddle', prop: 'paddle', spots: [sp(1760, 1000), sp(580, 980)] },
  { id: 'lantern', prop: 'lantern', spots: [sp(1210, 1060), sp(150, 1100)] },
];

function sticker(ctx, r, t) {
  ctx.save();
  ctx.scale(r / 100, r / 100);
  ctx.fillStyle = lin(ctx, 0, -100, 0, 100, [[0, '#c8ecf0'], [0.35, '#e8f6e0'], [0.36, '#5c9c8a'], [1, '#2c6260']]);
  ctx.beginPath();
  ctx.arc(0, 0, 100, 0, TAU);
  ctx.fill();
  sawgrass(ctx, -60, -20, 90, 50, 4);
  sawgrass(ctx, 70, -24, 80, 40, 5);
  airboat(ctx, 10, 40, 0.42, [randomPerson(1, { pose: 'sit', outfit: 'tee', hat: 'cap' }), randomPerson(2, { pose: 'sit', outfit: 'tee' })], t, true);
  gatorLow(ctx, -40, 80, 0.7, false);
  ctx.translate(48, 34);
  drawProp(ctx, 'iggy-peek', {}, t);
  ctx.restore();
}

export default {
  id: 'swamp',
  name: 'Airboat Tour',
  W, H,
  edge: '#2c6260',
  back,
  actors,
  props,
  iggy,
  items,
  sticker,
};

