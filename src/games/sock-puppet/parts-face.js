// Pictures for the face parts: eyes, noses, mouths and hair. Each draws one part centred on
// (0, 0) in puppet units at scale 1, filling its box from parts.js. Pair parts are drawn as
// they sit on the puppet's right (the caller mirrors the left one). Drawing only.
//
// o = { t, tint, look {x, y}, blink, mood, jiggle {x, y}, side, seed, w, h } (see draw-puppet.js)
import { C, TAU, shade, lightness, ellipse, circle, fillInk, smoothPath, stitches, shine, star, heart, roundRect } from './art.js';

const LW = 5;
const LID = '#ffc9dc';
const WHITE = '#ffffff';

const tintOr = (o, c) => o.tint || c;
const stitchFor = (c) => (lightness(c) > 0.72 ? 'rgba(70,40,70,0.45)' : 'rgba(255,255,255,0.7)');

// ---------------------------------------------------------------------------------------------
// Eyes
// ---------------------------------------------------------------------------------------------

// How shut an eye is right now (mood can hold it shut or half shut).
function lidAmount(o, rest = 0) {
  if (o.mood === 'sleep') return 1;
  if (o.mood === 'surprised') return Math.max(0, Math.min(o.blink || 0, 1));
  return Math.max(rest, o.blink || 0);
}

// A shut eye: a sleepy curve with three little lashes.
function shutEye(ctx, rx, y = 0, lw = LW) {
  ctx.beginPath();
  ctx.moveTo(-rx, y - rx * 0.05);
  ctx.quadraticCurveTo(0, y + rx * 0.55, rx, y - rx * 0.05);
  ctx.lineWidth = lw * 1.3;
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.lineWidth = lw * 0.8;
  for (const u of [-0.5, 0, 0.5]) {
    const x = u * rx;
    const yy = y + rx * 0.26 * (1 - u * u) - rx * 0.02;
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + u * rx * 0.18, yy + rx * 0.3);
    ctx.stroke();
  }
}

// A happy squint: an upside-down U.
function happyEye(ctx, rx, y = 0, lw = LW) {
  ctx.beginPath();
  ctx.moveTo(-rx * 0.9, y + rx * 0.25);
  ctx.quadraticCurveTo(0, y - rx * 0.95, rx * 0.9, y + rx * 0.25);
  ctx.lineWidth = lw * 1.5;
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink;
  ctx.stroke();
}

// A worried brow: the inner end (towards the middle of the face, -x) up.
function worriedBrow(ctx, rx, ry, lw = LW) {
  ctx.beginPath();
  ctx.moveTo(-rx * 0.85, -ry - rx * 0.55);
  ctx.quadraticCurveTo(0, -ry - rx * 0.28, rx * 0.8, -ry - rx * 0.05);
  ctx.lineWidth = lw * 1.4;
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink;
  ctx.stroke();
}

// A felt lid coming down over an eye shape (the clip is already the eye).
function lid(ctx, rx, ry, amount, colour = LID, lw = LW) {
  if (amount <= 0.02) return;
  const edge = -ry + ry * 2 * Math.min(1, amount);
  ctx.beginPath();
  ctx.moveTo(-rx - 4, -ry - 4);
  ctx.lineTo(rx + 4, -ry - 4);
  ctx.lineTo(rx + 4, edge);
  ctx.quadraticCurveTo(0, edge + ry * 0.35 * Math.min(1, amount * 1.5), -rx - 4, edge);
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.lineWidth = lw * 0.9;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
}

// The usual eye: white, an iris and pupil that look about, a shine, lids and moods.
// opts: { rx, ry, iris, irisR, pupilR, rest (resting lid), lidColour, irisShape }
function eyeball(ctx, o, opts) {
  const { rx, ry, iris = '#3c8ce0', rest = 0, lidColour = LID, lw = LW } = opts;
  let irisR = opts.irisR ?? Math.min(rx, ry) * 0.62;
  const pupilR = opts.pupilR ?? irisR * 0.5;
  if (o.mood === 'happy') {
    happyEye(ctx, rx, 0, lw);
    return;
  }
  const amount = lidAmount(o, rest);
  if (amount >= 0.98) {
    shutEye(ctx, rx, 0, lw);
    if (o.mood === 'worried') worriedBrow(ctx, rx, ry, lw);
    return;
  }
  const big = o.mood === 'surprised' ? 1.12 : 1;
  const erx = rx * big;
  const ery = ry * big;
  if (o.mood === 'surprised') irisR *= 0.72;
  ellipse(ctx, 0, 0, erx, ery);
  ctx.fillStyle = WHITE;
  ctx.fill();
  ctx.save();
  ellipse(ctx, 0, 0, erx, ery);
  ctx.clip();
  // a little shadow under the top
  ctx.fillStyle = 'rgba(60,40,90,0.10)';
  ellipse(ctx, 0, -ery * 0.9, erx * 1.1, ery * 0.45);
  ctx.fill();
  const lx = (o.look?.x || 0) * (erx - irisR * 0.85) * 0.85;
  const ly = (o.look?.y || 0) * (ery - irisR * 0.85) * 0.85;
  if (opts.irisShape) opts.irisShape(ctx, lx, ly, irisR);
  else {
    circle(ctx, lx, ly, irisR);
    ctx.fillStyle = iris;
    ctx.fill();
    ctx.lineWidth = lw * 0.6;
    ctx.strokeStyle = shade(iris, -0.45);
    ctx.stroke();
    circle(ctx, lx, ly, o.mood === 'surprised' ? pupilR * 0.6 : pupilR);
    ctx.fillStyle = C.ink;
    ctx.fill();
  }
  circle(ctx, lx - irisR * 0.35, ly - irisR * 0.4, Math.max(2.5, irisR * 0.26));
  ctx.fillStyle = WHITE;
  ctx.fill();
  lid(ctx, erx, ery, amount, lidColour, lw);
  ctx.restore();
  ellipse(ctx, 0, 0, erx, ery);
  ctx.lineWidth = lw;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  if (o.mood === 'worried') worriedBrow(ctx, erx, ery, lw);
}

function googly(ctx, o, R) {
  const lw = Math.max(4, R * 0.12);
  if (o.mood === 'happy') {
    // still googly, but squinting up from below with a felt cheek
    drawGooglyBall(ctx, o, R, lw, 0);
    ctx.save();
    circle(ctx, 0, 0, R);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(-R - 4, R + 4);
    ctx.lineTo(-R - 4, R * 0.25);
    ctx.quadraticCurveTo(0, -R * 0.35, R + 4, R * 0.25);
    ctx.lineTo(R + 4, R + 4);
    ctx.closePath();
    ctx.fillStyle = LID;
    ctx.fill();
    ctx.lineWidth = lw;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.restore();
    circle(ctx, 0, 0, R);
    ctx.lineWidth = lw;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    return;
  }
  const amount = lidAmount(o);
  drawGooglyBall(ctx, o, R, lw, amount);
  if (amount >= 0.98) shutEye(ctx, R * 0.75, R * 0.05, lw);
  if (o.mood === 'worried') worriedBrow(ctx, R * 0.85, R * 0.75, lw);
}

function drawGooglyBall(ctx, o, R, lw, amount) {
  // the white backing and the clear plastic dome's rim
  circle(ctx, 0, 0, R);
  ctx.fillStyle = WHITE;
  ctx.fill();
  ctx.save();
  circle(ctx, 0, 0, R);
  ctx.clip();
  // the loose pupil rolls inside
  const pr = R * (o.mood === 'surprised' ? 0.42 : 0.56);
  const room = R - pr - lw * 0.4;
  const jx = o.jiggle?.x ?? 0;
  const jy = o.jiggle?.y ?? 0.6;
  circle(ctx, jx * room, jy * room, pr);
  ctx.fillStyle = '#17111f';
  ctx.fill();
  // the dome: a soft grey ring inside the rim and a bright curved glint
  ctx.lineWidth = R * 0.14;
  ctx.strokeStyle = 'rgba(150,170,200,0.35)';
  circle(ctx, 0, 0, R * 0.92);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.7, Math.PI * 1.08, Math.PI * 1.42);
  ctx.lineWidth = R * 0.13;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.stroke();
  circle(ctx, R * 0.42, -R * 0.5, R * 0.08);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();
  lid(ctx, R, R, amount, LID, lw);
  ctx.restore();
  // the rim
  circle(ctx, 0, 0, R);
  ctx.lineWidth = lw;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  circle(ctx, 0, 0, R - lw * 0.9);
  ctx.lineWidth = lw * 0.35;
  ctx.strokeStyle = 'rgba(120,130,160,0.5)';
  ctx.stroke();
}

function sewingButton(ctx, r, colour, holes = 4, thread = '#fff6e4') {
  circle(ctx, 0, 0, r);
  fillInk(ctx, colour, LW);
  circle(ctx, 0, 0, r * 0.74);
  ctx.lineWidth = 3;
  ctx.strokeStyle = shade(colour, -0.3);
  ctx.stroke();
  shine(ctx, -r * 0.38, -r * 0.45, r * 0.26, 0.45);
  const d = r * 0.26;
  const pts = holes === 4 ? [[-d, -d], [d, -d], [d, d], [-d, d]] : [[-d, 0], [d, 0]];
  // the thread crossing between the holes
  ctx.lineWidth = r * 0.11;
  ctx.lineCap = 'round';
  ctx.strokeStyle = thread;
  ctx.beginPath();
  if (holes === 4) {
    ctx.moveTo(-d, -d);
    ctx.lineTo(d, d);
    ctx.moveTo(d, -d);
    ctx.lineTo(-d, d);
  } else {
    ctx.moveTo(-d, 0);
    ctx.lineTo(d, 0);
  }
  ctx.stroke();
  for (const [x, y] of pts) {
    circle(ctx, x, y, r * 0.09);
    ctx.fillStyle = shade(colour, -0.55);
    ctx.fill();
  }
}

const EYES = {
  googly: (ctx, o) => googly(ctx, o, 30),
  'googly-big': (ctx, o) => googly(ctx, o, 46),

  'button-eye': (ctx, o) => {
    sewingButton(ctx, 26, tintOr(o, '#33283f'));
  },

  sleepy: (ctx, o) => {
    const rx = 33;
    const ry = 23;
    eyeball(ctx, o, { rx, ry, iris: '#7a5a3a', rest: 0.48, lidColour: '#c9b6ff' });
    if (o.mood !== 'happy' && lidAmount(o, 0.48) < 0.98) {
      // lashes on the heavy lid
      const edge = -ry + ry * 2 * lidAmount(o, 0.48);
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = C.ink;
      for (const u of [-0.55, 0, 0.55]) {
        const x = u * rx;
        const y = edge + ry * 0.12 * (1 - u * u);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + u * 8, y + 9);
        ctx.stroke();
      }
    }
  },

  lashes: (ctx, o) => {
    const rx = 30;
    const ry = 26;
    ctx.save();
    ctx.translate(0, 5);
    // three big curly lashes on top, outer side (+x)
    if (o.mood !== 'happy' && lidAmount(o) < 0.98) {
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = C.ink;
      for (const [a, len] of [[-1.25, 15], [-0.8, 18], [-0.35, 17]]) {
        const sx = Math.cos(a) * rx;
        const sy = Math.sin(a) * ry;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len - 6, sx + Math.cos(a + 0.5) * len * 1.25, sy + Math.sin(a + 0.5) * len * 1.25 - 10);
        ctx.stroke();
      }
    }
    eyeball(ctx, o, { rx, ry, iris: '#2fae6a' });
    ctx.restore();
  },

  cyclops: (ctx, o) => {
    ctx.save();
    ctx.translate(0, 6);
    eyeball(ctx, o, { rx: 54, ry: 48, iris: '#8fd14f', irisR: 26, pupilR: 13, lw: 6 });
    // a big bushy brow
    if (o.mood !== 'worried' && o.mood !== 'happy') {
      const up = o.mood === 'surprised' ? -10 : 0;
      ctx.beginPath();
      ctx.moveTo(-46, -50 + up);
      ctx.quadraticCurveTo(0, -70 + up, 46, -50 + up);
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.strokeStyle = C.ink;
      ctx.stroke();
    }
    ctx.restore();
  },

  'star-eye': (ctx, o) => {
    eyeball(ctx, o, {
      rx: 32, ry: 32, irisR: 19,
      irisShape(g, x, y, r) {
        star(g, x, y, r * 1.05, 5, 0.5);
        g.fillStyle = '#ffd23f';
        g.fill();
        g.lineWidth = 3;
        g.strokeStyle = '#c98a00';
        g.stroke();
        circle(g, x, y + 1, r * 0.32);
        g.fillStyle = C.ink;
        g.fill();
      },
    });
  },

  glasses: (ctx, o) => {
    const R = 36;
    const gap = 54;
    // the eyes, big behind the lenses
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(s * gap, 2);
      eyeball(ctx, o, { rx: 24, ry: 24, iris: '#8d5a36', irisR: 13, lw: 4 });
      ctx.restore();
    }
    // the frames
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      circle(ctx, s * gap, 0, R);
      ctx.fillStyle = 'rgba(190,230,255,0.18)';
      ctx.fill();
      ctx.lineWidth = 12;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      ctx.lineWidth = 7;
      ctx.strokeStyle = '#e8384f';
      ctx.stroke();
      // glare
      ctx.beginPath();
      ctx.moveTo(s * gap - 18, -12);
      ctx.lineTo(s * gap - 6, -24);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.stroke();
    }
    // bridge and arms
    ctx.beginPath();
    ctx.moveTo(-gap + R - 2, -6);
    ctx.quadraticCurveTo(0, -20, gap - R + 2, -6);
    ctx.moveTo(-gap - R + 2, -8);
    ctx.lineTo(-gap - R - 10, -14);
    ctx.moveTo(gap + R - 2, -8);
    ctx.lineTo(gap + R + 10, -14);
    ctx.lineWidth = 12;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#e8384f';
    ctx.stroke();
  },

  'heart-eye': (ctx, o) => {
    eyeball(ctx, o, {
      rx: 30, ry: 28, irisR: 16,
      irisShape(g, x, y, r) {
        const k = 1 + Math.sin((o.t || 0) * 6) * 0.08;
        heart(g, x, y + 2, r * 1.15 * k);
        g.fillStyle = '#ff3d7a';
        g.fill();
        g.lineWidth = 3;
        g.strokeStyle = '#a3123f';
        g.stroke();
      },
    });
  },

  dizzy: (ctx, o) => {
    circle(ctx, 0, 0, 30);
    fillInk(ctx, WHITE, LW);
    ctx.save();
    ctx.rotate((o.t || 0) * 5);
    ctx.beginPath();
    for (let a = 0; a < TAU * 2.6; a += 0.2) {
      const r = 2 + a * 1.45;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (a) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#8a4fd8';
    ctx.stroke();
    ctx.restore();
  },

  'angry-eye': (ctx, o) => {
    ctx.save();
    ctx.translate(0, 8);
    eyeball(ctx, o, { rx: 30, ry: 24, iris: '#e8384f', rest: 0.22, irisR: 13 });
    if (o.mood !== 'worried' && o.mood !== 'sleep' && o.mood !== 'happy') {
      // a cross brow, down towards the middle of the face
      ctx.beginPath();
      ctx.moveTo(-32, -26);
      ctx.lineTo(30, -42);
      ctx.lineWidth = 11;
      ctx.lineCap = 'round';
      ctx.strokeStyle = C.ink;
      ctx.stroke();
    }
    ctx.restore();
  },

  'stalk-eye': (ctx, o) => {
    const t = o.t || 0;
    const sway = Math.sin(t * 2.2 + (o.seed || 0)) * 7;
    const col = tintOr(o, '#8fd14f');
    // the bendy stalk, from the head up to the eye
    ctx.beginPath();
    ctx.moveTo(-9, 70);
    ctx.quadraticCurveTo(-14 + sway * 0.5, 15, -8 + sway, -30);
    ctx.lineTo(8 + sway, -30);
    ctx.quadraticCurveTo(6 + sway * 0.5, 15, 11, 70);
    ctx.closePath();
    fillInk(ctx, col, LW);
    ctx.beginPath();
    ctx.moveTo(1, 64);
    ctx.quadraticCurveTo(-3 + sway * 0.5, 15, sway, -26);
    stitches(ctx, stitchFor(col), 2.5, 6);
    ctx.save();
    ctx.translate(sway, -38);
    circle(ctx, 0, 0, 33);
    fillInk(ctx, col, LW);
    eyeball(ctx, o, { rx: 25, ry: 25, iris: '#8a4fd8', irisR: 13, lidColour: col });
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------------------------
// Noses
// ---------------------------------------------------------------------------------------------

const NOSES = {
  pompom: (ctx, o) => {
    const col = tintOr(o, '#e8384f');
    const dark = shade(col, -0.22);
    const light = shade(col, 0.3);
    // a fluffy ball: a ring of little puffs round a middle, outlined as one
    const puffs = [[0, 0, 19]];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + 0.2;
      puffs.push([Math.cos(a) * 18, Math.sin(a) * 18, 10.5]);
    }
    ctx.fillStyle = C.ink;
    for (const [x, y, r] of puffs) {
      circle(ctx, x, y, r + 2.2);
      ctx.fill();
    }
    ctx.fillStyle = col;
    for (const [x, y, r] of puffs) {
      circle(ctx, x, y, r);
      ctx.fill();
    }
    // tufts of yarn ends
    ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const a = i * 2.39;
      const r = 4 + (i % 5) * 4.2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      ctx.beginPath();
      ctx.moveTo(x - 3, y - 2);
      ctx.lineTo(x + 3, y + 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = i % 2 ? dark : light;
      ctx.stroke();
    }
    shine(ctx, -9, -11, 8, 0.45);
  },

  'button-nose': (ctx, o) => sewingButton(ctx, 23, tintOr(o, '#ff8a3d'), 2),

  carrot: (ctx) => {
    // a leafy top on the face end, the point sticking out to the right
    ctx.save();
    ctx.translate(-36, 0);
    ctx.lineCap = 'round';
    for (const [a, len] of [[-2.5, 22], [-3.14, 26], [2.5, 22]]) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(Math.cos(a) * len * 0.5, Math.sin(a) * len * 0.5 - 6, Math.cos(a) * len, Math.sin(a) * len);
      ctx.lineWidth = 11;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#3cbf55';
      ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(-36, -19);
    ctx.quadraticCurveTo(10, -14, 50, -1);
    ctx.quadraticCurveTo(52, 2, 48, 3);
    ctx.quadraticCurveTo(10, 16, -36, 19);
    ctx.quadraticCurveTo(-46, 0, -36, -19);
    ctx.closePath();
    fillInk(ctx, '#ff8a3d', LW);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#c25a14';
    ctx.beginPath();
    for (const [x, h] of [[-18, 12], [2, 9], [22, 6]]) {
      ctx.moveTo(x, -h);
      ctx.lineTo(x + 5, -h + 7);
    }
    ctx.moveTo(-8, 13);
    ctx.lineTo(-3, 6);
    ctx.stroke();
    shine(ctx, -12, -9, 9, 0.35);
  },

  pig: (ctx) => {
    ellipse(ctx, 0, 0, 33, 25);
    fillInk(ctx, '#ff9ec0', LW);
    ellipse(ctx, 0, 2, 26, 18);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(190,60,110,0.35)';
    ctx.stroke();
    for (const s of [-1, 1]) {
      ellipse(ctx, s * 10, 2, 5.5, 9.5, s * 0.25);
      ctx.fillStyle = '#7a1f45';
      ctx.fill();
    }
    shine(ctx, -16, -12, 7, 0.55);
  },

  clown: (ctx) => {
    circle(ctx, 0, 0, 30);
    const g = ctx.createRadialGradient(-10, -12, 3, 0, 0, 32);
    g.addColorStop(0, '#ff7a7a');
    g.addColorStop(0.6, '#e8243c');
    g.addColorStop(1, '#a3122a');
    fillInk(ctx, g, LW);
    ellipse(ctx, -10, -12, 9, 6, -0.6);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
    circle(ctx, 9, 12, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();
  },

  potato: (ctx, o) => {
    const col = tintOr(o, '#8d5a36');
    smoothPath(ctx, [-36, -6, -22, -28, 4, -30, 30, -20, 39, 2, 28, 26, 0, 31, -26, 24]);
    fillInk(ctx, col, LW);
    ctx.fillStyle = shade(col, -0.3);
    for (const [x, y, r] of [[-14, -8, 4], [12, -14, 3], [18, 12, 4.5], [-6, 14, 3]]) {
      circle(ctx, x, y, r);
      ctx.fill();
    }
    shine(ctx, -16, -16, 9, 0.35);
  },

  triangle: (ctx, o) => {
    const col = tintOr(o, '#ffd23f');
    ctx.beginPath();
    ctx.moveTo(-28, -22);
    ctx.quadraticCurveTo(0, -28, 28, -22);
    ctx.quadraticCurveTo(30, -18, 4, 25);
    ctx.quadraticCurveTo(0, 30, -4, 25);
    ctx.quadraticCurveTo(-30, -18, -28, -22);
    ctx.closePath();
    fillInk(ctx, col, LW);
    ctx.beginPath();
    ctx.moveTo(-19, -16);
    ctx.lineTo(19, -16);
    ctx.lineTo(0, 15);
    ctx.closePath();
    stitches(ctx, stitchFor(col), 2.5, 5);
  },

  beak: (ctx) => {
    // upper beak
    ctx.beginPath();
    ctx.moveTo(-40, -6);
    ctx.quadraticCurveTo(-20, -30, 0, -28);
    ctx.quadraticCurveTo(20, -30, 40, -6);
    ctx.quadraticCurveTo(12, 12, 0, 26);
    ctx.quadraticCurveTo(-12, 12, -40, -6);
    ctx.closePath();
    fillInk(ctx, '#ffb020', LW);
    // lower beak peeking under
    ctx.beginPath();
    ctx.moveTo(-26, 4);
    ctx.quadraticCurveTo(0, 14, 26, 4);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#c77700';
    ctx.stroke();
    for (const s of [-1, 1]) {
      ellipse(ctx, s * 9, -14, 4, 2.5);
      ctx.fillStyle = '#8a4a00';
      ctx.fill();
    }
    shine(ctx, -18, -16, 8, 0.45);
  },

  trunk: (ctx, o) => {
    const col = tintOr(o, '#9aa3ad');
    const sw = Math.sin((o.t || 0) * 1.8) * 5;
    // a long trunk hanging down and curling up at the end
    ctx.beginPath();
    ctx.moveTo(-27, -72);
    ctx.quadraticCurveTo(-24, 0, -16 + sw * 0.4, 46);
    ctx.quadraticCurveTo(-10 + sw, 76, 14 + sw, 70);
    ctx.quadraticCurveTo(32 + sw, 62, 26 + sw, 44);
    ctx.lineTo(12 + sw, 46);
    ctx.quadraticCurveTo(10 + sw, 54, 4 + sw, 50);
    ctx.quadraticCurveTo(2 + sw * 0.6, 20, 9, -20);
    ctx.quadraticCurveTo(14, -50, 27, -72);
    ctx.closePath();
    fillInk(ctx, col, LW);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = shade(col, -0.3);
    ctx.beginPath();
    for (let y = -40; y < 40; y += 14) {
      const x = -6 + (y / 46) * sw * 0.4;
      ctx.moveTo(x - 10, y);
      ctx.quadraticCurveTo(x - 2, y + 4, x + 8, y);
    }
    ctx.stroke();
    ellipse(ctx, 19 + sw, 46, 6, 3);
    ctx.fillStyle = shade(col, -0.5);
    ctx.fill();
  },

  cherry: (ctx) => {
    ctx.beginPath();
    ctx.moveTo(-2, -6);
    ctx.quadraticCurveTo(0, -26, 10, -34);
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#3c8a2a';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, -32);
    ctx.quadraticCurveTo(22, -44, 26, -28);
    ctx.quadraticCurveTo(16, -22, 8, -32);
    fillInk(ctx, '#3cbf55', 3.5);
    circle(ctx, 0, 12, 24);
    fillInk(ctx, '#d81e3a', LW);
    ellipse(ctx, -9, 3, 7, 5, -0.6);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();
  },

  'dog-nose': (ctx) => {
    ctx.beginPath();
    ctx.moveTo(-30, -14);
    ctx.quadraticCurveTo(-28, -24, 0, -24);
    ctx.quadraticCurveTo(28, -24, 30, -14);
    ctx.quadraticCurveTo(30, 4, 0, 23);
    ctx.quadraticCurveTo(-30, 4, -30, -14);
    ctx.closePath();
    fillInk(ctx, '#2a1d33', LW);
    for (const s of [-1, 1]) {
      ellipse(ctx, s * 10, -2, 6, 4, s * -0.4);
      ctx.fillStyle = '#000';
      ctx.fill();
    }
    ellipse(ctx, -10, -15, 10, 5, -0.15);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fill();
  },

  'heart-nose': (ctx, o) => {
    const col = tintOr(o, '#ff6fb1');
    heart(ctx, 0, 2, 22);
    fillInk(ctx, col, LW);
    heart(ctx, 0, 2, 15);
    stitches(ctx, stitchFor(col), 2.5, 5);
    shine(ctx, -10, -8, 6, 0.5);
  },
};

// ---------------------------------------------------------------------------------------------
// Mouths
// ---------------------------------------------------------------------------------------------

function tooth(ctx, x, y, w, h, r = 8) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.closePath();
  fillInk(ctx, WHITE, LW);
}

function tache(ctx, o, curls) {
  const col = tintOr(o, '#8d5a36');
  ctx.beginPath();
  if (!curls) {
    ctx.moveTo(0, -22);
    ctx.bezierCurveTo(20, -32, 52, -26, 70, -6);
    ctx.bezierCurveTo(76, 8, 66, 24, 52, 14);
    ctx.bezierCurveTo(36, 6, 18, 6, 0, 10);
    ctx.bezierCurveTo(-18, 6, -36, 6, -52, 14);
    ctx.bezierCurveTo(-66, 24, -76, 8, -70, -6);
    ctx.bezierCurveTo(-52, -26, -20, -32, 0, -22);
  } else {
    ctx.moveTo(0, -20);
    ctx.bezierCurveTo(22, -32, 50, -14, 58, 0);
    ctx.bezierCurveTo(66, 12, 80, 8, 78, -6);
    ctx.bezierCurveTo(77, -14, 68, -14, 68, -8);
    ctx.bezierCurveTo(74, -16, 84, -6, 78, 6);
    ctx.bezierCurveTo(70, 22, 50, 18, 38, 10);
    ctx.bezierCurveTo(24, 4, 12, 8, 0, 12);
    ctx.bezierCurveTo(-12, 8, -24, 4, -38, 10);
    ctx.bezierCurveTo(-50, 18, -70, 22, -78, 6);
    ctx.bezierCurveTo(-84, -6, -74, -16, -68, -8);
    ctx.bezierCurveTo(-68, -14, -77, -14, -78, -6);
    ctx.bezierCurveTo(-80, 8, -66, 12, -58, 0);
    ctx.bezierCurveTo(-50, -14, -22, -32, 0, -20);
  }
  ctx.closePath();
  fillInk(ctx, col, LW);
  // bristles
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.strokeStyle = shade(col, lightness(col) > 0.5 ? -0.3 : 0.3);
  ctx.beginPath();
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const x = s * (10 + k * 12);
      ctx.moveTo(x, -12 + k * 1.5);
      ctx.lineTo(x + s * 6, 2 + k);
    }
  }
  ctx.stroke();
}

const MOUTHS = {
  tongue: (ctx, o) => {
    const wag = Math.sin((o.t || 0) * 3) * 0.06;
    ctx.save();
    ctx.translate(0, -40);
    ctx.rotate(wag);
    ctx.beginPath();
    ctx.moveTo(-26, 0);
    ctx.lineTo(-27, 44);
    ctx.quadraticCurveTo(-28, 82, 0, 82);
    ctx.quadraticCurveTo(28, 82, 27, 44);
    ctx.lineTo(26, 0);
    ctx.quadraticCurveTo(0, 6, -26, 0);
    ctx.closePath();
    fillInk(ctx, '#ff6f93', LW);
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.quadraticCurveTo(2, 40, 0, 58);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#c0365e';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-20, 10);
    ctx.lineTo(-20, 50);
    ctx.quadraticCurveTo(-20, 74, 0, 75);
    stitches(ctx, 'rgba(255,255,255,0.6)', 2.5, 5);
    shine(ctx, -12, 28, 6, 0.4);
    ctx.restore();
  },

  'buck-teeth': (ctx) => {
    tooth(ctx, -28, -24, 28, 46, 9);
    tooth(ctx, 0, -24, 28, 46, 9);
    ctx.fillStyle = 'rgba(160,170,200,0.35)';
    ctx.fillRect(-24, -21, 6, 30);
    ctx.fillRect(4, -21, 6, 30);
  },

  fangs: (ctx) => {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 50, -20);
      ctx.lineTo(s * 20, -20);
      ctx.quadraticCurveTo(s * 30, 10, s * 37, 22);
      ctx.quadraticCurveTo(s * 42, 6, s * 50, -20);
      ctx.closePath();
      fillInk(ctx, WHITE, LW);
      shine(ctx, s * 30, -8, 3, 0.3);
    }
  },

  moustache: (ctx, o) => tache(ctx, o, false),
  'curly-tache': (ctx, o) => tache(ctx, o, true),

  lipstick: (ctx) => {
    // upper lip with a little dip, then the lower lip
    ctx.beginPath();
    ctx.moveTo(-56, 2);
    ctx.bezierCurveTo(-40, -24, -18, -28, -6, -18);
    ctx.quadraticCurveTo(0, -14, 6, -18);
    ctx.bezierCurveTo(18, -28, 40, -24, 56, 2);
    ctx.quadraticCurveTo(0, -4, -56, 2);
    ctx.closePath();
    fillInk(ctx, '#e8243c', LW);
    ctx.beginPath();
    ctx.moveTo(-56, 2);
    ctx.quadraticCurveTo(0, 4, 56, 2);
    ctx.bezierCurveTo(44, 30, 18, 32, 0, 32);
    ctx.bezierCurveTo(-18, 32, -44, 30, -56, 2);
    ctx.closePath();
    fillInk(ctx, '#ff3d5e', LW);
    ellipse(ctx, -14, 15, 12, 5, -0.15);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();
  },

  grin: (ctx) => {
    ctx.beginPath();
    ctx.moveTo(-68, -20);
    ctx.quadraticCurveTo(0, -12, 68, -20);
    ctx.quadraticCurveTo(56, 34, 0, 32);
    ctx.quadraticCurveTo(-56, 34, -68, -20);
    ctx.closePath();
    fillInk(ctx, '#6b1830', LW);
    ctx.save();
    ctx.clip();
    // a row of teeth along the top and a tongue at the bottom
    ctx.fillStyle = WHITE;
    ctx.fillRect(-70, -24, 140, 22);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(60,30,60,0.5)';
    ctx.beginPath();
    for (let x = -50; x <= 50; x += 20) {
      ctx.moveTo(x, -20);
      ctx.lineTo(x, -3);
    }
    ctx.moveTo(-70, -3);
    ctx.lineTo(70, -3);
    ctx.stroke();
    ellipse(ctx, 6, 32, 34, 16);
    ctx.fillStyle = '#ff7d9c';
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(-68, -20);
    ctx.quadraticCurveTo(0, -12, 68, -20);
    ctx.quadraticCurveTo(56, 34, 0, 32);
    ctx.quadraticCurveTo(-56, 34, -68, -20);
    ctx.closePath();
    ctx.lineWidth = LW;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  },

  beard: (ctx, o) => {
    const col = tintOr(o, '#8d5a36');
    // a big fluffy beard hanging from the mouth, a gap for the mouth at the top
    const pts = [];
    const n = 22;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const a = Math.PI * (1 - u);
      const bump = i % 2 ? 0.9 : 1;
      pts.push(Math.cos(a) * 92 * bump, -36 + Math.sin(a) * 104 * bump);
    }
    ctx.beginPath();
    ctx.moveTo(-94, -66);
    for (let i = 0; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.lineTo(94, -66);
    ctx.quadraticCurveTo(70, -44, 40, -50);
    ctx.quadraticCurveTo(0, -30, -40, -50);
    ctx.quadraticCurveTo(-70, -44, -94, -66);
    ctx.closePath();
    ctx.lineJoin = 'round';
    fillInk(ctx, col, LW);
    // curls
    ctx.lineWidth = 3;
    ctx.strokeStyle = shade(col, lightness(col) > 0.5 ? -0.28 : 0.28);
    for (const [x, y] of [[-50, -10], [-14, 4], [24, -8], [56, 10], [-36, 30], [6, 40], [40, 36], [-4, -26], [-62, 18]]) {
      ctx.beginPath();
      ctx.arc(x, y, 8, 0.4, Math.PI * 1.6);
      ctx.stroke();
    }
  },

  goatee: (ctx, o) => {
    const col = tintOr(o, '#8d5a36');
    ctx.beginPath();
    ctx.moveTo(-26, -38);
    ctx.quadraticCurveTo(0, -30, 26, -38);
    ctx.quadraticCurveTo(30, -6, 20, 16);
    ctx.quadraticCurveTo(18, 26, 12, 22);
    ctx.quadraticCurveTo(10, 36, 2, 40);
    ctx.quadraticCurveTo(-4, 34, -6, 26);
    ctx.quadraticCurveTo(-14, 30, -16, 18);
    ctx.quadraticCurveTo(-30, -6, -26, -38);
    ctx.closePath();
    fillInk(ctx, col, LW);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = shade(col, lightness(col) > 0.5 ? -0.3 : 0.3);
    ctx.beginPath();
    for (const x of [-12, 0, 12]) {
      ctx.moveTo(x, -24);
      ctx.quadraticCurveTo(x * 0.7, 0, x * 0.3, 24);
    }
    ctx.stroke();
  },

  bubblegum: (ctx, o) => {
    const k = 0.88 + (Math.sin((o.t || 0) * 1.7) * 0.5 + 0.5) * 0.12;
    circle(ctx, 0, 0, 46 * k);
    ctx.fillStyle = 'rgba(255,140,200,0.92)';
    ctx.fill();
    ctx.lineWidth = LW;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 34 * k, Math.PI * 1.1, Math.PI * 1.45);
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.stroke();
    circle(ctx, 18 * k, -22 * k, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();
  },

  'one-tooth': (ctx) => {
    tooth(ctx, -14, -20, 28, 40, 8);
    ctx.fillStyle = 'rgba(160,170,200,0.35)';
    ctx.fillRect(-9, -16, 5, 24);
  },

  whiskers: (ctx, o) => {
    const t = o.t || 0;
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.fillStyle = 'rgba(42,24,56,0.6)';
      for (const [x, y] of [[26, -6], [38, 4], [24, 10], [36, -14]]) {
        circle(ctx, s * x, y, 3.2);
        ctx.fill();
      }
      ctx.lineWidth = 5.5;
      ctx.strokeStyle = C.ink;
      for (const [y0, y1, k] of [[-8, -26, 0], [2, 2, 1], [12, 30, 2]]) {
        const tw = Math.sin(t * 7 + k + s) * 2;
        ctx.beginPath();
        ctx.moveTo(s * 44, y0);
        ctx.quadraticCurveTo(s * 72, (y0 + y1) / 2 - 3 + tw, s * 98, y1 + tw);
        ctx.stroke();
      }
    }
  },

  zipper: (ctx) => {
    roundRect(ctx, -62, -10, 124, 20, 8);
    fillInk(ctx, '#3e5fd8', 4);
    ctx.fillStyle = '#d8dce6';
    for (let x = -54; x <= 50; x += 9) {
      ctx.fillRect(x, -7, 6, 6);
      ctx.fillRect(x + 4, 1, 6, 6);
    }
    ctx.beginPath();
    ctx.moveTo(-58, 0);
    ctx.lineTo(58, 0);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(40,40,60,0.6)';
    ctx.stroke();
    // the pull
    roundRect(ctx, 34, -6, 16, 28, 5);
    fillInk(ctx, '#e6e9f0', 3.5);
    circle(ctx, 42, 15, 3.5);
    ctx.fillStyle = C.ink;
    ctx.fill();
  },
};

// ---------------------------------------------------------------------------------------------
// Hair
// ---------------------------------------------------------------------------------------------

const strand = (col) => shade(col, lightness(col) > 0.5 ? -0.25 : 0.3);

const HAIR = {
  mop: (ctx, o) => {
    const col = tintOr(o, '#ffd23f');
    const t = o.t || 0;
    const hl = shade(col, 0.4);
    // strands of yarn from a parting on top, flopping out and down every which way
    const strands = [];
    for (let i = 0; i < 15; i++) {
      const u = i / 14 - 0.5; // -0.5 .. 0.5
      const side = u < 0 ? -1 : 1;
      const len = 0.75 + ((i * 7) % 5) * 0.08;
      const sx = u * 50;
      const ex = u * 236 * len;
      const ey = 50 - Math.abs(u) * 30 + ((i * 3) % 4) * 6;
      strands.push([sx, -44 + Math.abs(u) * 20, ex, ey, side, i]);
    }
    // back strands first (the outer ones), then the middle on top
    strands.sort((a, b) => Math.abs(b[0]) - Math.abs(a[0]));
    for (const [sx, sy, ex, ey, side, i] of strands) {
      const wob = Math.sin(t * 2.2 + i) * 3;
      const cx = (sx + ex) / 2 + side * 26;
      const cy = Math.min(sy, ey) - 36;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(cx, cy, ex - side * 18, ey - 40, ex + wob, ey);
      ctx.lineCap = 'round';
      ctx.lineWidth = 22;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      ctx.lineWidth = 13;
      ctx.strokeStyle = col;
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = hl;
      ctx.stroke();
    }
  },

  pigtail: (ctx, o) => {
    const col = tintOr(o, '#ff8a3d');
    const sw = Math.sin((o.t || 0) * 2.4 + (o.seed || 0)) * 0.08;
    ctx.save();
    ctx.translate(-30, -46);
    ctx.rotate(sw);
    // a bunch of yarn strands hanging out and down
    ctx.beginPath();
    ctx.moveTo(-8, -10);
    ctx.bezierCurveTo(40, -20, 76, 30, 78, 90);
    ctx.quadraticCurveTo(80, 118, 62, 116);
    ctx.quadraticCurveTo(52, 108, 50, 100);
    ctx.quadraticCurveTo(44, 112, 34, 104);
    ctx.bezierCurveTo(40, 60, 24, 24, -6, 16);
    ctx.closePath();
    fillInk(ctx, col, LW);
    ctx.lineWidth = 3;
    ctx.strokeStyle = strand(col);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(6, -6);
    ctx.bezierCurveTo(40, 0, 62, 40, 64, 96);
    ctx.moveTo(4, 8);
    ctx.bezierCurveTo(30, 20, 48, 50, 48, 92);
    ctx.stroke();
    // the bow where it's tied
    const bow = lightness(col) > 0.6 && col.toLowerCase() !== '#ff8a3d' ? '#ff4fa0' : col.toLowerCase() === '#ff6fb1' ? '#ffd23f' : '#ff4fa0';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.quadraticCurveTo(s * 18, -26, s * 26, -4);
      ctx.quadraticCurveTo(s * 22, 14, 0, 2);
      ctx.closePath();
      fillInk(ctx, bow, 4);
    }
    circle(ctx, 0, 2, 7);
    fillInk(ctx, bow, 4);
    ctx.restore();
  },

  mohawk: (ctx, o) => {
    const col = tintOr(o, '#ff6fb1');
    ctx.beginPath();
    ctx.moveTo(-30, 75);
    const spikes = [[-34, 30], [-24, 42], [-30, -10], [-14, 4], [-18, -50], [-2, -34], [2, -76], [12, -32], [24, -48], [20, -4], [34, -6], [26, 36], [34, 40], [30, 75]];
    for (const [x, y] of spikes) ctx.lineTo(x, y);
    ctx.quadraticCurveTo(0, 82, -30, 75);
    ctx.closePath();
    fillInk(ctx, col, LW);
    ctx.lineWidth = 3;
    ctx.strokeStyle = strand(col);
    ctx.beginPath();
    ctx.moveTo(0, 70);
    ctx.lineTo(2, -60);
    ctx.moveTo(-12, 66);
    ctx.lineTo(-16, -30);
    ctx.moveTo(12, 66);
    ctx.lineTo(18, -26);
    ctx.stroke();
  },

  curly: (ctx, o) => {
    const col = tintOr(o, '#8d5a36');
    const curls = [[-96, 18, 24], [-66, -4, 28], [-32, -20, 30], [4, -26, 31], [40, -20, 30], [72, -4, 28], [100, 18, 23], [-48, 22, 26], [-12, 14, 27], [24, 14, 27], [58, 22, 26]];
    for (const [x, y, r] of curls) {
      circle(ctx, x, y, r);
      fillInk(ctx, col, LW);
    }
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = strand(col);
    for (const [x, y, r] of curls) {
      ctx.beginPath();
      for (let a = 0; a < TAU * 1.4; a += 0.3) {
        const rr = r * 0.12 + a * r * 0.07;
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr;
        if (a) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
  },

  antennae: (ctx, o) => {
    const col = tintOr(o, '#8fd14f');
    const t = o.t || 0;
    for (const s of [-1, 1]) {
      const b = Math.sin(t * 3 + s) * 6;
      const tipX = s * 58 + b;
      const tipY = -58 + Math.abs(b) * 0.3;
      // a pipe cleaner, wiggly
      ctx.beginPath();
      ctx.moveTo(s * 22, 82);
      ctx.bezierCurveTo(s * 10, 30, s * 60 + b * 0.5, 20, tipX, tipY);
      ctx.lineWidth = 16;
      ctx.lineCap = 'round';
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      ctx.lineWidth = 9;
      ctx.strokeStyle = col;
      ctx.stroke();
      ctx.setLineDash([2, 5]);
      ctx.lineWidth = 13;
      ctx.strokeStyle = shade(col, 0.35);
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
      // pom-pom tip
      circle(ctx, tipX, tipY, 22);
      fillInk(ctx, s < 0 ? '#ff4fa0' : '#ffd23f', LW);
      shine(ctx, tipX - 7, tipY - 8, 6, 0.55);
    }
  },

  spiky: (ctx, o) => {
    const col = tintOr(o, '#33283f');
    ctx.beginPath();
    ctx.moveTo(-108, 46);
    const n = 7;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = -104 + u * 208;
      const arc = Math.sin(u * Math.PI);
      const tipY = 30 - arc * 76;
      const lean = (u - 0.5) * 30;
      ctx.lineTo(x + lean, tipY);
      if (i < n) ctx.lineTo(x + 208 / n / 2, 20 - arc * 36);
    }
    ctx.lineTo(108, 46);
    ctx.quadraticCurveTo(0, 10, -108, 46);
    ctx.closePath();
    fillInk(ctx, col, LW);
    shine(ctx, -30, -10, 12, 0.25);
  },

  bun: (ctx, o) => {
    const col = tintOr(o, '#8d5a36');
    ctx.save();
    ctx.translate(0, 4);
    // a little base of hair and a round bun on top
    ctx.beginPath();
    ctx.moveTo(-54, 48);
    ctx.quadraticCurveTo(0, 14, 54, 48);
    ctx.quadraticCurveTo(0, 36, -54, 48);
    ctx.closePath();
    fillInk(ctx, col, LW);
    circle(ctx, 0, -6, 40);
    fillInk(ctx, col, LW);
    ctx.lineWidth = 3;
    ctx.strokeStyle = strand(col);
    ctx.beginPath();
    ctx.arc(0, -6, 26, 3.6, 5.6);
    ctx.moveTo(-16, -30);
    ctx.quadraticCurveTo(6, -12, -8, 14);
    ctx.stroke();
    // hair tie
    roundRect(ctx, -26, 26, 52, 12, 6);
    fillInk(ctx, '#ff4fa0', 4);
    shine(ctx, -14, -24, 9, 0.35);
    ctx.restore();
  },

  'long-hair': (ctx, o) => {
    const col = tintOr(o, '#ffd23f');
    ctx.save();
    ctx.scale((o.w || 300) / 300, (o.h || 360) / 360);
    const t = o.t || 0;
    const sw = Math.sin(t * 1.6) * 4;
    ctx.beginPath();
    ctx.moveTo(0, -178);
    ctx.bezierCurveTo(110, -180, 142, -100, 140, 0);
    ctx.bezierCurveTo(140, 80, 146 + sw, 130, 150 + sw, 170);
    ctx.quadraticCurveTo(130 + sw, 184, 116 + sw, 170);
    ctx.quadraticCurveTo(100 + sw, 186, 86 + sw, 168);
    ctx.quadraticCurveTo(80, 100, 60, 60);
    ctx.lineTo(-60, 60);
    ctx.quadraticCurveTo(-80, 100, -86 - sw, 168);
    ctx.quadraticCurveTo(-100 - sw, 186, -116 - sw, 170);
    ctx.quadraticCurveTo(-130 - sw, 184, -150 - sw, 170);
    ctx.bezierCurveTo(-146 - sw, 130, -140, 80, -140, 0);
    ctx.bezierCurveTo(-142, -100, -110, -180, 0, -178);
    ctx.closePath();
    fillInk(ctx, col, LW);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = strand(col);
    ctx.beginPath();
    for (const s of [-1, 1]) {
      for (const k of [0, 1, 2]) {
        const x = s * (118 + k * 9);
        ctx.moveTo(s * (90 + k * 14), -130 + k * 10);
        ctx.bezierCurveTo(s * (130 + k * 4), -60, x, 40, x + s * sw, 150);
      }
    }
    ctx.stroke();
    ctx.restore();
  },

  afro: (ctx, o) => {
    const col = tintOr(o, '#33283f');
    ctx.save();
    ctx.scale((o.w || 290) / 290, (o.h || 190) / 190);
    // a big cloud of puffs, outlined as one shape
    const puffs = [[0, 8, 0]];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU;
      puffs.push([Math.cos(a) * 118, 8 + Math.sin(a) * 66, 1]);
    }
    const R = (k) => (k ? 30 : 0);
    ctx.fillStyle = C.ink;
    ellipse(ctx, 0, 8, 124, 72);
    ctx.fill();
    for (const [x, y, k] of puffs) if (k) {
      circle(ctx, x, y, R(k) + 2.5);
      ctx.fill();
    }
    ctx.fillStyle = col;
    ellipse(ctx, 0, 8, 120, 68);
    ctx.fill();
    for (const [x, y, k] of puffs) if (k) {
      circle(ctx, x, y, R(k));
      ctx.fill();
    }
    ctx.fillStyle = shade(col, lightness(col) > 0.5 ? -0.12 : 0.15);
    for (const [x, y] of [[-80, -40], [-30, -66], [30, -62], [84, -36], [-104, 20], [106, 24]]) {
      circle(ctx, x, y, 12);
      ctx.fill();
    }
    ctx.restore();
  },

  bangs: (ctx, o) => {
    const col = tintOr(o, '#ff8a3d');
    ctx.beginPath();
    ctx.moveTo(-108, 10);
    ctx.quadraticCurveTo(-90, -38, 0, -38);
    ctx.quadraticCurveTo(90, -38, 108, 10);
    // scalloped fringe
    const n = 7;
    for (let i = n; i >= 1; i--) {
      const x0 = -108 + (i / n) * 216;
      const x1 = -108 + ((i - 1) / n) * 216;
      const mid = (x0 + x1) / 2;
      ctx.quadraticCurveTo(mid + 4, 50 - Math.abs(mid) * 0.12, x1, 12 - Math.abs(x1) * 0.02);
    }
    ctx.closePath();
    fillInk(ctx, col, LW);
    ctx.lineWidth = 3;
    ctx.strokeStyle = strand(col);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = -108 + ((i + 0.5) / n) * 216;
      ctx.moveTo(x * 0.8, -24);
      ctx.lineTo(x, 22 - Math.abs(x) * 0.1);
    }
    ctx.stroke();
  },

  feather: (ctx, o) => {
    const col = tintOr(o, '#5cb8ff');
    const sw = Math.sin((o.t || 0) * 2.2) * 0.07;
    ctx.save();
    ctx.translate(-6, 76);
    ctx.rotate(0.15 + sw);
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.bezierCurveTo(-36, -60, -32, -120, 4, -152);
    ctx.bezierCurveTo(34, -120, 36, -62, 0, -20);
    ctx.closePath();
    fillInk(ctx, col, LW);
    // barbs
    ctx.lineWidth = 3;
    ctx.strokeStyle = shade(col, -0.3);
    ctx.beginPath();
    for (let y = -36; y > -140; y -= 14) {
      ctx.moveTo(1, y);
      ctx.lineTo(-18, y - 10);
      ctx.moveTo(1, y);
      ctx.lineTo(20, y - 10);
    }
    ctx.stroke();
    // a notch and the quill
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.quadraticCurveTo(2, -80, 4, -148);
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.cream;
    ctx.stroke();
    ctx.restore();
  },

  sprout: (ctx, o) => {
    const sw = Math.sin((o.t || 0) * 2) * 0.08;
    ctx.save();
    ctx.translate(0, 52);
    ctx.rotate(sw);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-4, -40, 0, -62);
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#3cbf55';
    ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, -60);
      ctx.bezierCurveTo(s * 10, -96, s * 44, -100, s * 44, -82);
      ctx.bezierCurveTo(s * 44, -62, s * 14, -56, 0, -60);
      ctx.closePath();
      fillInk(ctx, s < 0 ? '#8fd14f' : '#3cbf55', LW);
      ctx.beginPath();
      ctx.moveTo(s * 4, -62);
      ctx.quadraticCurveTo(s * 22, -76, s * 36, -80);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(20,80,30,0.5)';
      ctx.stroke();
    }
    ctx.restore();
  },
};

export const FACE_DRAW = { ...EYES, ...NOSES, ...MOUTHS, ...HAIR };
