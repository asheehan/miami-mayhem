// The aquarium: one giant tank full of fish, sharks, a ray, a sea turtle and a diver cleaning
// the glass, a glowing jellyfish tower, the touch pool, the gift shop, and a hall packed with
// visitors pressing their noses to the glass.
import { TAU, INK, lin, rad, circle, ellipse, poly, rect, rrect, line, curve, fs, label, shadow, limb, glow, star, bush } from '../art/kit.js';
import { bench, bin, pot } from '../art/scenery.js';
import { person, personAt, randomPerson } from '../art/people.js';
import { fish, shark, ray, turtle, octopus, jelly, seahorse, starfishFace } from '../art/animals.js';
import { drawProp } from '../art/props.js';
import { scatter, keepOutOf, depth } from '../art/crowd.js';

const W = 1800;
const H = 1300;
const T = { x0: 60, x1: 1300, top: 150, surf: 175, floor: 740, y1: 800 }; // the big tank
const J = { x0: 1360, x1: 1740, top: 170, y1: 760 }; // the jellyfish tower
const HALL = 830; // the floor of the hall starts here
const POOL = { x: 520, y: 1110, rx: 210, ry: 62 }; // touch pool

const tankFill = (ctx) => lin(ctx, 0, T.surf, 0, T.floor, [[0, '#4fd0ee'], [0.5, '#1f9fd0'], [1, '#0f5a9a']]);
const poolFill = (ctx) => lin(ctx, 0, POOL.y - POOL.ry, 0, POOL.y + POOL.ry, [[0, '#5fe0f0'], [1, '#1f9fc0']]);

const sp = (x, y, o = {}) => ({ x, y, ...o });

// Tank water over the lower half of something floating at the surface.
function surfaceCover(x, y, w = 44) {
  return (ctx, t) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(T.x0 + 12, T.surf, T.x1 - T.x0 - 24, T.floor - T.surf);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(x - w, y + 2);
    for (let k = -w; k <= w; k += 8) ctx.lineTo(x + k, y + Math.sin(k / 9 + t * 3) * 1.5);
    ctx.lineTo(x + w, y + 60);
    ctx.lineTo(x - w, y + 60);
    ctx.closePath();
    ctx.fillStyle = tankFill(ctx);
    ctx.globalAlpha = 0.88;
    ctx.fill();
    ctx.restore();
  };
}

// A clump of coral in front of whatever hides behind it.
function coralCover(x, y, s = 1, kind = 0) {
  return (ctx) => coral(ctx, x, y, s, kind);
}

function potCover(x, y) {
  return (ctx) => fernPot(ctx, x, y);
}

// --- set pieces -------------------------------------------------------------------------------

function coral(ctx, x, y, s = 1, kind = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (kind === 0) {
    // branching pink coral
    const br = (x0, y0, a, len, d) => {
      const x1 = x0 + Math.cos(a) * len;
      const y1 = y0 + Math.sin(a) * len;
      limb(ctx, [[x0, y0], [x1, y1]], '#ff6aa8', 10 - d * 2, 2.5);
      if (d < 2) {
        br(x1, y1, a - 0.5, len * 0.7, d + 1);
        br(x1, y1, a + 0.5, len * 0.7, d + 1);
      } else circle(ctx, x1, y1, 5, '#ff9ed2', 2);
    };
    br(0, 0, -Math.PI / 2, 34, 0);
    br(-10, 0, -Math.PI / 2 - 0.6, 26, 1);
  } else if (kind === 1) {
    // a brain coral and a few orange fans
    ellipse(ctx, 0, -18, 40, 24, '#ffb84a', 3);
    for (let k = -2; k <= 2; k++) curve(ctx, -30, -18 + k * 7, 0, -26 + k * 7, 30, -18 + k * 7, 'rgba(160,90,20,0.6)', 2);
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.quadraticCurveTo(70, -70, 50, -80);
    ctx.quadraticCurveTo(20, -60, 30, 0);
    fs(ctx, '#ff7a3a', 2.5);
  } else {
    // purple tube coral
    for (let k = 0; k < 5; k++) {
      const h = 30 + ((k * 17) % 30);
      rrect(ctx, -30 + k * 13, -h, 12, h, 5, k % 2 ? '#a64dff' : '#c88aff', 2.5);
      ellipse(ctx, -24 + k * 13, -h, 6, 3, '#5a1a8a', 1.5);
    }
  }
  ctx.restore();
}

function kelp(ctx, x, y, h, t = 0, phase = 0) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  const pts = [];
  for (let k = 0; k <= h; k += 12) pts.push([x + Math.sin(k / 30 + t * 1.2 + phase) * (k / h) * 14, y - k]);
  limb(ctx, pts, '#3fae6a', 6, 2);
  for (let i = 2; i < pts.length; i += 2) ellipse(ctx, pts[i][0] + (i % 4 ? 9 : -9), pts[i][1], 10, 4.5, '#5fc87a', 1.8, INK, i % 4 ? 0.5 : -0.5);
}

function chest(ctx, x, y) {
  // an open treasure chest half buried in the sand, coins spilling out
  // the lid flipped open behind, a dark inside glinting with gold
  poly(ctx, [[x - 46, y - 46], [x + 46, y - 46], [x + 52, y - 96], [x - 52, y - 96]], '#a8743f', 3);
  rect(ctx, x - 40, y - 90, 80, 8, '#ffc93a', 2);
  rect(ctx, x - 44, y - 52, 88, 12, '#2a1808', 2);
  for (let k = 0; k < 5; k++) circle(ctx, x - 30 + k * 15, y - 50, 5, '#ffd23a', 1.2);
  rect(ctx, x - 46, y - 40, 92, 40, '#8a5a2c', 3);
  for (const k of [-30, 30]) rect(ctx, x + k - 4, y - 40, 8, 40, '#ffc93a', 2);
  rect(ctx, x - 6, y - 32, 12, 14, '#ffc93a', 2);
  for (let k = 0; k < 8; k++) circle(ctx, x + 40 + k * 9, y - 2 + (k % 2) * 4, 5, '#ffd23a', 1.5);
}

function wreck(ctx, x, y) {
  // the bow of a little sunken boat sticking out of the sand
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.2);
  ctx.beginPath();
  ctx.moveTo(-90, 0);
  ctx.lineTo(60, 0);
  ctx.quadraticCurveTo(90, -30, 80, -70);
  ctx.lineTo(-90, -70);
  ctx.closePath();
  fs(ctx, '#7a5a3a', 3);
  for (let k = -60; k < 60; k += 24) line(ctx, k, -66, k + 4, -4, 'rgba(22,11,51,0.35)', 2.5);
  circle(ctx, -30, -40, 10, '#1f3a5a', 2.5);
  line(ctx, -40, -70, -50, -150, INK, 6);
  line(ctx, -40, -70, -50, -150, '#6e4426', 3);
  ctx.restore();
}

function fernPot(ctx, x, y) {
  pot(ctx, x, y, 50, '#2fb5e8');
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.38;
    ctx.save();
    ctx.translate(x, y - 40);
    ctx.rotate(a + Math.PI / 2);
    ellipse(ctx, 0, -34, 9, 34, i % 2 ? '#3fae4a' : '#2f8a3e', 2);
    ctx.restore();
  }
}

// A soft toy for the gift shop shelf.
function plush(ctx, x, y, kind) {
  ctx.save();
  ctx.translate(x, y);
  if (kind === 'lizard') {
    // a green plush lizard: the decoy (no swim ring, button eyes, stitched smile)
    curve(ctx, -16, -8, -34, -6, -38, -18, INK, 9);
    curve(ctx, -16, -8, -34, -6, -38, -18, '#7cd34a', 5);
    ellipse(ctx, 0, -12, 18, 12, '#7cd34a', 2.5);
    circle(ctx, 18, -22, 11, '#7cd34a', 2.5);
    circle(ctx, 20, -25, 3, INK, 0);
    curve(ctx, 16, -17, 22, -14, 27, -18, INK, 1.5);
    for (const lx of [-8, 8]) ellipse(ctx, lx, -1, 5, 3, '#7cd34a', 1.5);
  } else if (kind === 'shark') {
    ctx.scale(0.42, 0.42);
    ctx.translate(0, -30);
    shark(ctx, {}, 0);
  } else if (kind === 'octo') {
    ctx.scale(0.5, 0.5);
    ctx.translate(0, -40);
    octopus(ctx, { colour: '#a64dff' }, 0);
  } else if (kind === 'turtle') {
    ctx.scale(0.8, 0.8);
    turtle(ctx, { colour: '#5fc93a', shell: '#2f8a3e' }, 0);
  } else if (kind === 'globe') {
    rect(ctx, -14, -8, 28, 8, '#8a5a2c', 2);
    circle(ctx, 0, -22, 16, 'rgba(180,230,255,0.75)', 2.5);
    ctx.save();
    ctx.translate(0, -18);
    ctx.scale(0.35, 0.35);
    fish(ctx, { colour: '#ff8a2a' }, 0);
    ctx.restore();
  } else {
    // a little plush dolphin
    ellipse(ctx, 0, -14, 22, 11, '#6a9ad8', 2.5);
    poly(ctx, [[-2, -24], [4, -34], [8, -24]], '#6a9ad8', 2);
    circle(ctx, 12, -16, 2, INK, 0);
  }
  ctx.restore();
}

function giftShop(ctx) {
  // back wall, sign, two shelves of toys and the till
  rect(ctx, 1340, 830, 440, 260, '#ffe9c0', 3);
  rrect(ctx, 1450, 800, 220, 50, 10, '#ff7a2a', 3);
  label(ctx, 'GIFTS', 1560, 826, 30, '#ffffff', { lw: 5 });
  for (const sy of [930, 1020]) {
    rect(ctx, 1350, sy, 420, 14, '#c98f4f', 2.5);
    rect(ctx, 1356, sy + 14, 10, 10, '#8a5a2c', 1.5);
    rect(ctx, 1754, sy + 14, 10, 10, '#8a5a2c', 1.5);
  }
  const top = ['shark', 'globe', 'dolphin', 'lizard', 'globe', 'octo'];
  top.forEach((k, i) => plush(ctx, 1385 + i * 68, 930, k));
  const low = ['turtle', 'octo', 'shark', 'dolphin', 'globe'];
  low.forEach((k, i) => plush(ctx, 1395 + i * 80 + (i > 2 ? 30 : 0), 1020, k));
}

function lightRays(ctx) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(T.x0, T.surf, T.x1 - T.x0, T.floor - T.surf);
  ctx.clip();
  for (let k = 0; k < 7; k++) {
    const x = T.x0 + 80 + k * 180;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(x, T.surf);
    ctx.lineTo(x + 60, T.surf);
    ctx.lineTo(x + 160, T.floor);
    ctx.lineTo(x + 40, T.floor);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// --- the picture ------------------------------------------------------------------------------

function back(ctx, r) {
  // the dark hall walls and ceiling with spotlights
  ctx.fillStyle = lin(ctx, 0, 0, 0, HALL, [[0, '#0f1a3a'], [1, '#1f2f6a']]);
  ctx.fillRect(0, 0, W, HALL);
  for (let k = 0; k < 9; k++) {
    const x = 100 + k * 205;
    rect(ctx, x - 20, 0, 40, 18, '#3a4a7a', 2);
    glow(ctx, x, 40, 60, 'rgba(255,240,180,0.25)');
    circle(ctx, x, 24, 8, '#fff6c8', 2);
  }
  // a wavy blue strip of light along the ceiling
  ctx.fillStyle = 'rgba(80,200,255,0.18)';
  ctx.beginPath();
  ctx.moveTo(0, 100);
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, 110 + Math.sin(x / 90) * 10);
  ctx.lineTo(W, 130);
  ctx.lineTo(0, 130);
  ctx.closePath();
  ctx.fill();
  // the big tank: frame, water, sand
  rrect(ctx, T.x0 - 24, T.top - 24, T.x1 - T.x0 + 48, T.y1 - T.top + 40, 18, '#2a3a5a', 4);
  ctx.fillStyle = tankFill(ctx);
  ctx.fillRect(T.x0, T.top, T.x1 - T.x0, T.y1 - T.top);
  ctx.fillStyle = 'rgba(200,250,255,0.35)';
  ctx.fillRect(T.x0, T.top, T.x1 - T.x0, T.surf - T.top);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = T.x0; x <= T.x1; x += 20) ctx.lineTo(x, T.surf + Math.sin(x / 30) * 3);
  ctx.stroke();
  lightRays(ctx);
  // sand
  ctx.fillStyle = lin(ctx, 0, T.floor - 40, 0, T.y1, [[0, '#f2d79a'], [1, '#d8b070']]);
  ctx.beginPath();
  ctx.moveTo(T.x0, T.floor);
  for (let x = T.x0; x <= T.x1; x += 40) ctx.lineTo(x, T.floor - 14 + Math.sin(x / 120) * 14);
  ctx.lineTo(T.x1, T.y1);
  ctx.lineTo(T.x0, T.y1);
  ctx.closePath();
  ctx.fill();
  for (let k = 0; k < 90; k++) circle(ctx, T.x0 + r() * (T.x1 - T.x0), T.floor - 6 + r() * 56, 1.8, 'rgba(160,110,50,0.4)', 0);
  // rocks with a cave (the eel lives there)
  for (const [rx, ry, rw, rh, c] of [[180, 760, 220, 130, '#5a6a8a'], [700, 760, 160, 70, '#6a7a9a'], [1160, 760, 200, 150, '#4f5f7f']]) {
    ctx.beginPath();
    ctx.moveTo(rx - rw / 2, ry);
    ctx.quadraticCurveTo(rx - rw / 2, ry - rh, rx, ry - rh);
    ctx.quadraticCurveTo(rx + rw / 2, ry - rh * 0.9, rx + rw / 2, ry);
    ctx.closePath();
    fs(ctx, c, 3);
  }
  ellipse(ctx, 1140, 700, 30, 24, '#1a2440', 2.5);
  wreck(ctx, 480, 770);
  chest(ctx, 900, 770);
  coral(ctx, 330, 770, 1.1, 0);
  coral(ctx, 600, 775, 1, 1);
  coral(ctx, 1020, 770, 1, 2);
  coral(ctx, 1250, 770, 0.8, 0);
  coral(ctx, 110, 775, 0.9, 2);
  coral(ctx, 760, 772, 0.9, 0);
  for (const [kx, kh, p] of [[240, 280, 0], [560, 220, 1], [820, 250, 2], [1090, 300, 3], [1280, 200, 4]]) kelp(ctx, kx, T.floor + 10, kh, 0, p);
  // sea urchins and anemones on the sand
  for (let k = 0; k < 7; k++) {
    const ux = 140 + k * 170;
    for (let a = 0; a < 12; a++) line(ctx, ux, T.floor + 30, ux + Math.cos((a / 12) * Math.PI + Math.PI) * 14, T.floor + 30 + Math.sin((a / 12) * Math.PI + Math.PI) * 14, '#3a1a5a', 2);
    circle(ctx, ux, T.floor + 30, 7, '#5a2a8a', 1.5);
  }
  // a few fish that stay put (the busy ones swim as actors)
  const FISH = [['#ffd23a', '#ff8a2a', null], ['#ff8a2a', '#ffffff', '#ffffff'], ['#2fb5e8', '#ffd23a', null], ['#ff5ab8', '#a64dff', null], ['#7cff6b', '#2f8a3e', null]];
  for (let k = 0; k < 10; k++) {
    const [b, f, st] = FISH[k % FISH.length];
    ctx.save();
    ctx.translate(140 + ((k * 131) % 1080), 260 + ((k * 97) % 360));
    fish(ctx, { colour: b, fin: f, stripe: st, flip: k % 2 === 0, s: 0.8 }, 0);
    ctx.restore();
  }
  // seahorses by the kelp and a starfish stuck on the glass
  ctx.save();
  ctx.translate(600, 520);
  seahorse(ctx, {}, 0);
  ctx.restore();
  // glass shine
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  poly(ctx, [[T.x0 + 40, T.top], [T.x0 + 120, T.top], [T.x0 + 20, T.y1], [T.x0, T.y1], [T.x0, T.top + 160]], 'rgba(255,255,255,0.08)', 0);
  // rivets on the frame
  for (let x = T.x0 - 8; x <= T.x1 + 8; x += 60) {
    circle(ctx, x, T.top - 12, 4, '#8a9ab8', 1.5);
    circle(ctx, x, T.y1 + 6, 4, '#8a9ab8', 1.5);
  }
  rrect(ctx, 690, T.y1 - 4, 260, 30, 6, '#ffffff', 2.5);
  label(ctx, 'OCEAN TANK', 820, T.y1 + 11, 20, '#1f5aa0', { lw: 0 });
  // the jellyfish tower: a tall glowing tube
  rrect(ctx, J.x0 - 18, J.top - 30, J.x1 - J.x0 + 36, J.y1 - J.top + 70, 40, '#2a3a5a', 4);
  ctx.save();
  rr(ctx, J.x0, J.top, J.x1 - J.x0, J.y1 - J.top, 30);
  ctx.clip();
  ctx.fillStyle = lin(ctx, 0, J.top, 0, J.y1, [[0, '#7a3aff'], [0.5, '#3a1a9a'], [1, '#ff3d9a']]);
  ctx.fillRect(J.x0, J.top, J.x1 - J.x0, J.y1 - J.top);
  for (let k = 0; k < 40; k++) circle(ctx, J.x0 + r() * (J.x1 - J.x0), J.top + r() * (J.y1 - J.top), 1.5 + r() * 2, 'rgba(255,255,255,0.35)', 0);
  ctx.restore();
  rr(ctx, J.x0, J.top, J.x1 - J.x0, J.y1 - J.top, 30);
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  rrect(ctx, J.x0 + 70, J.y1 + 12, 240, 26, 6, '#ffffff', 2.5);
  label(ctx, 'JELLIES', (J.x0 + J.x1) / 2, J.y1 + 25, 18, '#a64dff', { lw: 0 });
  // a pipe running up the wall between the tanks
  rect(ctx, 1318, 140, 22, 690, '#8a9ab8', 3);
  for (let y = 200; y < 820; y += 120) rect(ctx, 1312, y, 34, 12, '#6a7a98', 2);
  // the hall floor: big pale tiles
  ctx.fillStyle = lin(ctx, 0, HALL, 0, H, [[0, '#a8d8e8'], [1, '#88c0d8']]);
  ctx.fillRect(0, HALL, W, H - HALL);
  line(ctx, 0, HALL, W, HALL, INK, 3);
  for (let y = HALL + 60; y < H; y += 70) line(ctx, 0, y, W, y, 'rgba(22,11,51,0.12)', 2);
  for (let x = 0; x < W; x += 110) line(ctx, x, HALL, x - 60, H, 'rgba(22,11,51,0.1)', 2);
  // wavy light dancing on the floor
  for (let k = 0; k < 16; k++) curve(ctx, 40 + k * 80, HALL + 30 + (k % 3) * 18, 70 + k * 80, HALL + 20 + (k % 3) * 18, 100 + k * 80, HALL + 34 + (k % 3) * 18, 'rgba(255,255,255,0.4)', 3);
  // the touch pool
  ellipse(ctx, POOL.x, POOL.y + 10, POOL.rx + 22, POOL.ry + 22, '#8a9ab8', 3);
  ctx.fillStyle = poolFill(ctx);
  ctx.beginPath();
  ctx.ellipse(POOL.x, POOL.y, POOL.rx, POOL.ry, 0, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  for (const [sx, sy, c] of [[400, 1120, '#ff8a4c'], [600, 1130, '#ffd23a'], [660, 1095, '#a64dff']]) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(0.8, 0.8);
    starfishFace(ctx, { colour: c }, 0);
    ctx.restore();
  }
  for (const ux of [470, 560]) {
    for (let a = 0; a < 12; a++) line(ctx, ux, 1110, ux + Math.cos((a / 12) * TAU) * 11, 1110 + Math.sin((a / 12) * TAU) * 7, '#3a1a5a', 2);
    circle(ctx, ux, 1110, 6, '#5a2a8a', 1.5);
  }
  rrect(ctx, POOL.x - 70, POOL.y + POOL.ry + 26, 140, 26, 6, '#ffffff', 2.5);
  label(ctx, 'TOUCH POOL', POOL.x, POOL.y + POOL.ry + 39, 15, '#1f5aa0', { lw: 0 });
  // things on the floor, back to front
  const D = depth();
  const keep = keepOutOf([...iggy, ...items.flatMap((it) => it.spots)]);
  keep.push({ x: POOL.x, y: POOL.y, hw: POOL.rx + 40, hh: POOL.ry + 40 });
  const place = (x, y, hw, hh, fn) => {
    keep.push({ x, y: y - hh / 2, hw, hh: hh / 2 + 20 });
    D.add(y, fn);
  };
  place(1560, 1090, 230, 270, () => giftShop(ctx));
  place(1420, 1170, 70, 80, () => {
    // the till, with a cashier
    personAt(ctx, 1440, 1120, { pose: 'wave', skin: '#c68a5a', hair: '#2a1a10', hairStyle: 'curly', top: '#2fb5e8', bottom: '#3a3f55', logo: '#ffffff', phase: 1 }, 0);
    rect(ctx, 1380, 1110, 120, 60, '#c98f4f', 3);
    rrect(ctx, 1450, 1090, 40, 24, 4, '#3a3f55', 2);
  });
  place(1000, 1250, 70, 60, () => bench(ctx, 1000, 1250, 140, '#2f5a9a'));
  place(1180, 1230, 30, 60, () => bin(ctx, 1180, 1230, '#2f5a9a'));
  place(80, 1210, 40, 90, () => fernPot(ctx, 80, 1210));
  // a sign with a fish picture
  place(250, 900, 50, 120, () => {
    rect(ctx, 246, 820, 8, 80, '#3a3f55', 2);
    rrect(ctx, 200, 790, 100, 50, 8, '#ffffff', 2.5);
    ctx.save();
    ctx.translate(250, 815);
    fish(ctx, { colour: '#ff8a2a', fin: '#ffffff', stripe: '#ffffff', s: 0.9 }, 0);
    ctx.restore();
  });
  keep.push({ x: 650, y: 860, hw: 260, hh: 60 }); // kids at the glass (actors)
  keep.push({ x: 1090, y: 880, hw: 70, hh: 80 }); // dad and kid on his shoulders
  keep.push({ x: 860, y: 1010, hw: 120, hh: 80 }); // the school group (actor)
  keep.push({ x: 300, y: 1060, hw: 60, hh: 70 }); // touch pool helper (actor)
  const ITEMS = ['camera', 'phone', 'drink', null, 'popcorn', null, 'flag', null];
  const pts = scatter(r, 60, { x0: 40, y0: 900, x1: 1320, y1: 1290 }, keep, 54);
  pts.push(...scatter(r, 6, { x0: 1340, y0: 1200, x1: 1770, y1: 1290 }, keep, 54, pts));
  pts.forEach((p, i) => {
    const seed = 700 + i;
    const kind = i % 5;
    if (kind === 0) {
      D.add(p.y, () => {
        personAt(ctx, p.x - 16, p.y, randomPerson(seed, { kid: false, pose: 'point', item: null, outfit: 'tee' }), 0);
        personAt(ctx, p.x + 18, p.y + 2, randomPerson(seed + 9, { kid: true, pose: 'cheer', item: null, mood: 'wow' }), 0);
      });
    } else if (kind === 1) {
      D.add(p.y, () => personAt(ctx, p.x, p.y, randomPerson(seed, { kid: false, pose: 'hold', item: ITEMS[i % ITEMS.length] === 'flag' ? 'camera' : ITEMS[i % ITEMS.length] }), 0));
    } else if (kind === 2) {
      D.add(p.y, () => {
        // a stroller with a sleepy baby
        circle(ctx, p.x + 20, p.y - 6, 7, '#3a3f55', 2);
        circle(ctx, p.x + 52, p.y - 6, 7, '#3a3f55', 2);
        ctx.beginPath();
        ctx.moveTo(p.x + 12, p.y - 46);
        ctx.quadraticCurveTo(p.x + 36, p.y - 2, p.x + 62, p.y - 46);
        ctx.closePath();
        fs(ctx, ['#ff9ed2', '#9fe6ff', '#ffe14d'][i % 3], 2.5);
        circle(ctx, p.x + 38, p.y - 46, 9, '#ffd9b8', 2);
        personAt(ctx, p.x - 6, p.y, randomPerson(seed, { kid: false, pose: 'hold', item: null }), 0);
      });
    } else if (kind === 3) {
      D.add(p.y, () => personAt(ctx, p.x, p.y, randomPerson(seed, { kid: true, pose: i % 2 ? 'point' : 'wave', item: null }), 0));
    } else {
      D.add(p.y, () => {
        personAt(ctx, p.x - 18, p.y, randomPerson(seed, { pose: 'walk', item: 'drink' }), 0);
        personAt(ctx, p.x + 18, p.y + 3, randomPerson(seed + 3, { pose: 'stand', flip: true, item: 'phone' }), 0);
      });
    }
  });
  D.draw();
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// --- moving things -----------------------------------------------------------------------------

const loop = (t, period) => (t % period) / period;
// Keeps swimmers inside the big tank's glass.
function inTank(ctx, fn) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(T.x0, T.top, T.x1 - T.x0, T.y1 - T.top);
  ctx.clip();
  fn();
  ctx.restore();
}

const TANK_BOX = { x: (T.x0 + T.x1) / 2, y: (T.top + T.y1) / 2, hw: (T.x1 - T.x0) / 2, hh: (T.y1 - T.top) / 2 };

const actors = [
  // two sharks patrolling the tank, one each way
  ...[[0, 330, 1, 26], [0.5, 470, -1, 32]].map(([p, y, dir, period]) => ({
    ...TANK_BOX, over: true,
    draw(ctx, t) {
      const k = loop(t + p * period, period);
      const x = dir > 0 ? T.x0 - 120 + k * (T.x1 - T.x0 + 240) : T.x1 + 120 - k * (T.x1 - T.x0 + 240);
      inTank(ctx, () => {
        ctx.save();
        ctx.translate(x, y + Math.sin(t * 0.8 + p * 5) * 14);
        shark(ctx, { flip: dir < 0, phase: p * 3, s: 1.2 }, t);
        ctx.restore();
      });
    },
  })),
  // a ray gliding in long loops
  {
    ...TANK_BOX, over: true,
    draw(ctx, t) {
      const a = t * 0.25;
      inTank(ctx, () => {
        ctx.save();
        ctx.translate(680 + Math.cos(a) * 420, 600 + Math.sin(a * 2) * 50);
        ctx.rotate(Math.sin(a) > 0 ? Math.PI : 0);
        ray(ctx, { s: 1.1 }, t);
        ctx.restore();
      });
    },
  },
  // the big green sea turtle (a decoy) paddling past
  {
    ...TANK_BOX, over: true,
    draw(ctx, t) {
      const k = loop(t, 34);
      inTank(ctx, () => {
        ctx.save();
        ctx.translate(T.x1 + 100 - k * (T.x1 - T.x0 + 200), 250 + Math.sin(t * 0.5) * 30);
        turtle(ctx, { swim: true, flip: true, colour: '#6fd34a', shell: '#3a8a3a', s: 1.6 }, t);
        ctx.restore();
      });
    },
  },
  // shoals of little fish darting back and forth
  ...[[0, 400, '#ffd23a', '#ff8a2a'], [7, 600, '#2fb5e8', '#ffffff'], [13, 260, '#ff5ab8', '#ffd23a']].map(([p, y, c, f]) => ({
    ...TANK_BOX, over: true,
    draw(ctx, t) {
      const k = loop(t + p, 18);
      const dir = k < 0.5 ? 1 : -1;
      const e = k < 0.5 ? k * 2 : 2 - k * 2;
      const x = T.x0 + 100 + e * (T.x1 - T.x0 - 200);
      inTank(ctx, () => {
        for (let i = 0; i < 7; i++) {
          ctx.save();
          ctx.translate(x - dir * (i % 3) * 26 + Math.sin(t * 3 + i) * 4, y + (i - 3) * 14 + Math.cos(t * 2 + i) * 4);
          fish(ctx, { colour: c, fin: f, flip: dir < 0, s: 0.5, phase: i }, t);
          ctx.restore();
        }
      });
    },
  })),
  // the diver scrubbing the glass with a big sponge, bubbles going up
  {
    x: 1170, y: 400, hw: 90, hh: 230,
    keep: [{ x: 1180, y: 410, hw: 60, hh: 70 }],
    draw(ctx, t) {
      const scrub = Math.sin(t * 4) * 16;
      inTank(ctx, () => {
        ctx.save();
        ctx.translate(1180, 470);
        ctx.rotate(-0.15);
        // flippers and tank on her back
        limb(ctx, [[-8, -10], [-14, 30]], '#2a2a44', 9);
        limb(ctx, [[8, -10], [16, 30]], '#2a2a44', 9);
        ellipse(ctx, -18, 38, 10, 5, '#ffd23a', 2);
        ellipse(ctx, 20, 38, 10, 5, '#ffd23a', 2);
        rrect(ctx, -24, -70, 14, 50, 6, '#ffd23a', 2.5);
        rrect(ctx, -14, -60, 28, 52, 8, '#2a2a44', 2.5);
        limb(ctx, [[10, -52], [34 + scrub * 0.4, -66 + scrub]], '#2a2a44', 7);
        rrect(ctx, 28 + scrub * 0.4, -80 + scrub, 22, 16, 4, '#ffe14d', 2);
        circle(ctx, 0, -76, 13, '#ffd9b8', 2.5);
        rrect(ctx, -10, -84, 22, 13, 5, '#9fe6ff', 2.5);
        circle(ctx, -3, -78, 2, INK, 0);
        circle(ctx, 5, -78, 2, INK, 0);
        ctx.restore();
        for (let i = 0; i < 5; i++) {
          const k = (t * 0.6 + i / 5) % 1;
          circle(ctx, 1176 + Math.sin(k * 12 + i) * 6, 390 - k * 210, 4 + k * 3, 'rgba(255,255,255,0.4)', 1.2, 'rgba(255,255,255,0.9)');
        }
      });
      // soap swirls on the glass
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(1222, 400, 24, 0, TAU);
      ctx.stroke();
    },
  },
  // the green moray eel (a decoy) sliding in and out of its cave
  {
    x: 1140, y: 680, hw: 40, hh: 40,
    draw(ctx, t) {
      const out = (Math.sin(t * 0.9) + 1) / 2;
      ctx.save();
      ctx.translate(1140, 706);
      ctx.beginPath();
      ctx.ellipse(0, -6, 30, 24, 0, 0, TAU);
      ctx.clip();
      ctx.translate(-10 + out * 12, -8 - out * 4);
      ellipse(ctx, -6, 6, 16, 12, '#6fbf3a', 2.5);
      ellipse(ctx, 6, 0, 14, 12, '#6fbf3a', 2.5);
      circle(ctx, 8, -4, 3, '#ffe14d', 1.5);
      circle(ctx, 9, -4, 1.4, INK, 0);
      curve(ctx, 6, 7, 14, 9, 20, 4, INK, 2);
      ctx.restore();
    },
  },
  // the octopus waving on the left rocks
  {
    x: 190, y: 640, hw: 60, hh: 60,
    draw(ctx, t) {
      ctx.save();
      ctx.translate(190, 625);
      octopus(ctx, { colour: '#ff6a4a', phase: 1 }, t);
      ctx.restore();
    },
  },
  // swaying kelp, in front
  {
    x: 1065, y: 610, hw: 30, hh: 150,
    draw(ctx, t) {
      inTank(ctx, () => kelp(ctx, 1065, T.floor + 10, 240, t, 5));
    },
  },
  // the jellyfish drifting up and down their glowing tube
  {
    x: (J.x0 + J.x1) / 2, y: (J.top + J.y1) / 2, hw: (J.x1 - J.x0) / 2 + 20, hh: (J.y1 - J.top) / 2,
    draw(ctx, t) {
      ctx.save();
      rr(ctx, J.x0, J.top, J.x1 - J.x0, J.y1 - J.top, 30);
      ctx.clip();
      const cols = ['#ff9ed2', '#ffe9ff', '#9ff7f2', '#ffd0a0', '#ff9ed2', '#c8a8ff', '#9ff7f2', '#ffe9ff'];
      cols.forEach((c, i) => {
        const y = J.top + 60 + ((t * 18 + i * 73) % (J.y1 - J.top - 80));
        const x = J.x0 + 60 + ((i * 113) % (J.x1 - J.x0 - 120)) + Math.sin(t + i) * 12;
        glow(ctx, x, y, 34, 'rgba(255,200,255,0.25)');
        ctx.save();
        ctx.translate(x, y);
        jelly(ctx, { colour: c, phase: i, s: 1.3 + (i % 3) * 0.25 }, t);
        ctx.restore();
      });
      ctx.restore();
    },
  },
  // kids with their hands and noses pressed to the glass
  {
    x: 650, y: 860, hw: 280, hh: 80,
    keep: [{ x: 650, y: 860, hw: 260, hh: 60 }],
    draw(ctx, t) {
      [[420, 0], [500, 1], [690, 2], [770, 3], [870, 4]].forEach(([x, i]) => {
        ctx.save();
        ctx.translate(x, 905 + (i % 2) * 6);
        person(ctx, randomPerson(800 + i, { kid: true, pose: 'cheer', mood: 'wow', item: null, hat: i === 2 ? 'cap' : null, phase: i * 1.3 }), t * 0.5);
        ctx.restore();
      });
    },
  },
  // a dad with a kid on his shoulders, pointing at the sharks
  {
    x: 1090, y: 860, hw: 70, hh: 100,
    keep: [{ x: 1090, y: 880, hw: 60, hh: 80 }],
    draw(ctx, t) {
      ctx.save();
      ctx.translate(1090, 960);
      person(ctx, { pose: 'hold', skin: '#9a6440', hair: '#16101e', hairStyle: 'short', top: '#ff8a2a', bottom: '#2a4a8a', phase: 3 }, t);
      ctx.translate(0, -110 + Math.sin(t * 3) * 2);
      person(ctx, { pose: 'point', kid: true, skin: '#9a6440', hair: '#16101e', hairStyle: 'curly', top: '#ffd23a', bottom: '#2fb5e8', mood: 'wow', phase: 4 }, t);
      ctx.restore();
    },
  },
  // a teacher leading a school group with a little flag
  {
    x: 860, y: 1000, hw: 130, hh: 90,
    keep: [{ x: 860, y: 1010, hw: 120, hh: 80 }],
    draw(ctx, t) {
      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.translate(780 + i * 36, 1070 + (i % 2) * 8);
        person(ctx, randomPerson(900 + i, { kid: true, pose: i % 2 ? 'walk' : 'wave', top: '#ffd23a', hat: 'cap', hatColour: '#ff3d5a', item: null, phase: i }), t);
        ctx.restore();
      }
      ctx.save();
      ctx.translate(940, 1060);
      person(ctx, { pose: 'wave', item: 'flag', itemColour: '#ff3d5a', skin: '#ffd9b8', hair: '#c98f4f', hairStyle: 'bun', top: '#ff3d5a', bottom: '#3a3f55', phase: 5 }, t);
      ctx.restore();
    },
  },
  // a helper at the touch pool, showing a kid a starfish
  {
    x: 300, y: 1050, hw: 60, hh: 80,
    keep: [{ x: 300, y: 1060, hw: 50, hh: 70 }],
    draw(ctx, t) {
      ctx.save();
      ctx.translate(290, 1110);
      person(ctx, { pose: 'hold', skin: '#e0a878', hair: '#7a4a22', hairStyle: 'pony', top: '#2fb5e8', bottom: '#3a3f55', logo: '#ffffff', phase: 6 }, t);
      ctx.restore();
      ctx.save();
      ctx.translate(315 + Math.sin(t * 2) * 2, 1090 + Math.sin(t * 2) * 3);
      ctx.scale(0.6, 0.6);
      starfishFace(ctx, { colour: '#ff5a5a' }, t);
      ctx.restore();
    },
  },
  // bubbles rising from the wreck
  {
    x: 470, y: 450, hw: 40, hh: 300, over: true,
    draw(ctx, t) {
      inTank(ctx, () => {
        for (let i = 0; i < 6; i++) {
          const k = (t * 0.25 + i / 6) % 1;
          circle(ctx, 450 + Math.sin(k * 10 + i) * 10, 690 - k * 520, 5 + k * 5, 'rgba(255,255,255,0.3)', 1.5, 'rgba(255,255,255,0.85)');
        }
      });
    },
  },
];

// --- hiding places ----------------------------------------------------------------------------

const iggy = [
  sp(900, 692, { pose: 'peek' }), // in the treasure chest
  sp(640, 176, { pose: 'float', cover: surfaceCover(640, 176) }), // floating at the top of the tank
  sp(330, 735, { pose: 'peek', cover: coralCover(330, 772, 1.1, 0) }), // behind the pink coral
  sp(1690, 930, { pose: 'peek' }), // on the gift shop shelf with the toys
  sp(700, 1052, { pose: 'peek' }), // at the edge of the touch pool
  sp(1300, 600, { pose: 'cling', s: 0.95 }), // hugging the pipe on the wall
  sp(1250, 1180, { pose: 'stand', cover: potCover(1250, 1210), hit: [34, 34], hy: -95 }), // behind a fern pot
];

const items = [
  { id: 'crab', prop: 'crab', count: 2, spots: [sp(150, 772), sp(620, 772), sp(1050, 772), sp(1240, 772)] },
  { id: 'snorkel', prop: 'snorkel', spots: [sp(760, 700), sp(1100, 270)] },
  { id: 'anchor', prop: 'anchor', spots: [sp(410, 690), sp(1000, 520)] },
  { id: 'key', prop: 'key', spots: [sp(980, 760), sp(1560, 1180)] },
  { id: 'compass', prop: 'compass', spots: [sp(550, 690), sp(40 + 60, 1000)] },
  { id: 'bottle', prop: 'bottle', spots: [sp(260, 300), sp(820, 420)] },
  { id: 'shell', prop: 'shell', count: 2, spots: [sp(1180, 768), sp(480, 774), sp(80, 690), sp(1400, 1020)] },
  { id: 'trophy', prop: 'trophy', spots: [sp(860, 600), sp(1530, 870)] },
  { id: 'tophat', prop: 'tophat', spots: [sp(260, 600), sp(1640, 1015)] },
  { id: 'lifering', prop: 'lifering', spots: [sp(1000, 178), sp(260, 178)] },
  { id: 'duck', prop: 'duck', spots: [sp(430, 1105), sp(610, 1150)] },
  { id: 'sunglasses', prop: 'sunglasses', spots: [sp(1000, 1180), sp(140, 900)] },
  { id: 'teddy', prop: 'teddy', spots: [sp(1450, 900), sp(400, 940)] },
  { id: 'ticket', prop: 'ticket', spots: [sp(1080, 1110), sp(230, 1252)] },
  { id: 'balloon', prop: 'balloon', o: { colour: '#2fb5e8' }, spots: [sp(1270, 880), sp(60, 820)] },
  { id: 'lollipop', prop: 'lollipop', spots: [sp(1320, 990), sp(760, 1260)] },
  { id: 'watch', prop: 'watch', spots: [sp(1220, 960, { rot: 1.4 }), sp(560, 1240, { rot: 1.4 })] },
  { id: 'flipflop', prop: 'flipflop', o: { colour: '#ff5ab8' }, spots: [sp(1300, 1252, { rot: 0.4 }), sp(40, 1080)] },
];

function sticker(ctx, r, t) {
  ctx.save();
  ctx.scale(r / 100, r / 100);
  ctx.fillStyle = lin(ctx, 0, -100, 0, 100, [[0, '#4fd0ee'], [1, '#0f5a9a']]);
  ctx.beginPath();
  ctx.arc(0, 0, 100, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(-30, -40);
  shark(ctx, { s: 0.9 }, t);
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.translate(-60 + i * 30, 30 + (i % 2) * 14);
    fish(ctx, { colour: ['#ffd23a', '#ff5ab8', '#2fb5e8'][i], s: 0.6 }, t);
    ctx.restore();
  }
  ctx.save();
  ctx.translate(48, 76);
  drawProp(ctx, 'iggy-stand', {}, t);
  ctx.restore();
  ctx.restore();
}

export default {
  id: 'aquarium',
  name: 'The Aquarium',
  W, H,
  edge: '#1f2f6a',
  back,
  actors,
  iggy,
  items,
  sticker,
};
