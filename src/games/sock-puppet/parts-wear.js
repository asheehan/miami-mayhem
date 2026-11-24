// Pictures of the worn parts: ears and horns, hats, arms and hands, and the extras (bow ties,
// capes, stickers and the rest). Each draws centred on (0, 0) at scale 1, filling its box from
// parts.js; pair parts are drawn as they sit on the puppet's right side (the caller mirrors
// them on the left). Arms reach out to +x from a shoulder at (-w/2, 0).
import { C, TAU, shade, mix, lightness, roundRect, ellipse, circle, fillInk, smoothPath, stitches, shine, star, heart } from './art.js';

const LW = 5;
const tintOr = (o, c) => o.tint || c;
const stitchOn = (base) => (lightness(base) > 0.72 ? 'rgba(70,40,70,0.5)' : 'rgba(255,255,255,0.75)');

// a thick ink-edged stroke along a path built by fn
function rope(ctx, fn, width, colour, lw = LW) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  fn();
  ctx.lineWidth = width + lw * 2;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  fn();
  ctx.lineWidth = width;
  ctx.strokeStyle = colour;
  ctx.stroke();
}

function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
}

// ---------------------------------------------------------------------------------------------
// Ears and horns
// ---------------------------------------------------------------------------------------------

function bearEar(ctx, o) {
  const c = tintOr(o, '#8d5a36');
  circle(ctx, 0, 2, 35);
  fillInk(ctx, c, LW);
  circle(ctx, 2, 6, 20);
  fillInk(ctx, mix(c, '#ffb3c8', 0.6), 0);
  circle(ctx, 2, 6, 20);
  stitches(ctx, stitchOn(c), 2.2, 5);
  shine(ctx, -14, -14, 8, 0.35);
}

function bunnyEar(ctx, o) {
  const c = tintOr(o, '#fff3dc');
  ctx.save();
  ctx.translate(0, 88);
  ctx.rotate(0.12 + Math.sin(o.t * 2.2 + o.seed) * 0.03);
  ctx.translate(0, -88);
  // floppy tip
  smoothPath(ctx, [0, -88, 24, -76, 31, -30, 28, 30, 18, 86, -18, 86, -28, 30, -30, -30, -22, -76]);
  fillInk(ctx, c, LW);
  smoothPath(ctx, [0, -66, 12, -56, 15, -20, 13, 30, 8, 72, -8, 72, -13, 30, -15, -20, -12, -56]);
  fillInk(ctx, '#ffa6c4', 0);
  shine(ctx, -14, -50, 6, 0.4);
  ctx.restore();
}

function catEar(ctx, o) {
  const c = tintOr(o, '#33283f');
  ctx.beginPath();
  ctx.moveTo(-38, 40);
  ctx.quadraticCurveTo(-24, -10, 18, -42);
  ctx.quadraticCurveTo(34, 0, 38, 40);
  ctx.closePath();
  fillInk(ctx, c, LW);
  ctx.beginPath();
  ctx.moveTo(-18, 34);
  ctx.quadraticCurveTo(-8, 2, 15, -20);
  ctx.quadraticCurveTo(24, 8, 24, 34);
  ctx.closePath();
  fillInk(ctx, '#ff8fb5', 0);
}

function floppyEar(ctx, o) {
  const c = tintOr(o, '#8d5a36');
  const sw = Math.sin(o.t * 2.5 + o.seed) * 0.06;
  ctx.save();
  ctx.translate(0, -70);
  ctx.rotate(sw);
  ctx.translate(0, 70);
  smoothPath(ctx, [-16, -74, 12, -74, 26, -40, 36, 18, 32, 60, 8, 74, -18, 68, -32, 32, -30, -24]);
  fillInk(ctx, c, LW);
  smoothPath(ctx, [-4, -46, 12, -36, 20, 10, 18, 46, 4, 58, -12, 50, -18, 16, -16, -24]);
  fillInk(ctx, shade(c, -0.22), 0);
  smoothPath(ctx, [-16, -74, 12, -74, 26, -40, 36, 18, 32, 60, 8, 74, -18, 68, -32, 32, -30, -24]);
  ctx.save();
  ctx.clip();
  shine(ctx, -14, -30, 10, 0.3);
  ctx.restore();
  ctx.restore();
}

function elephantEar(ctx, o) {
  const c = tintOr(o, '#9aa3ad');
  smoothPath(ctx, [-60, -70, 10, -78, 62, -40, 68, 20, 40, 70, -10, 76, -40, 40, -66, 10]);
  fillInk(ctx, c, LW);
  smoothPath(ctx, [-36, -48, 10, -54, 44, -26, 46, 18, 26, 50, -8, 52, -28, 26, -42, 4]);
  fillInk(ctx, mix(c, '#ff9fbf', 0.55), 0);
  smoothPath(ctx, [-36, -48, 10, -54, 44, -26, 46, 18, 26, 50, -8, 52, -28, 26, -42, 4]);
  stitches(ctx, stitchOn(c), 2.4, 6);
}

function devilHorn(ctx) {
  ctx.beginPath();
  ctx.moveTo(-20, 36);
  ctx.quadraticCurveTo(-18, -10, 14, -36);
  ctx.quadraticCurveTo(6, 0, 20, 36);
  ctx.closePath();
  const g = ctx.createLinearGradient(-20, 0, 20, 0);
  g.addColorStop(0, '#ff5a4f');
  g.addColorStop(1, '#b8162e');
  fillInk(ctx, g, LW);
  ctx.beginPath();
  ctx.moveTo(-10, 26);
  ctx.quadraticCurveTo(-8, -4, 8, -24);
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.stroke();
}

function magicHorn(ctx, o) {
  ctx.beginPath();
  ctx.moveTo(-24, 56);
  ctx.lineTo(0, -58);
  ctx.lineTo(24, 56);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -58, 0, 56);
  g.addColorStop(0, '#fff6c9');
  g.addColorStop(1, '#ffd23f');
  fillInk(ctx, g, LW);
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = '#ff6fb1';
  ctx.lineWidth = 7;
  for (let y = -40; y < 60; y += 22) {
    ctx.beginPath();
    ctx.moveTo(-30, y + 12);
    ctx.lineTo(30, y - 4);
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-24, 56);
  ctx.lineTo(0, -58);
  ctx.lineTo(24, 56);
  ctx.closePath();
  ctx.lineWidth = LW;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  // twinkle
  const k = 0.6 + Math.sin(o.t * 4 + o.seed) * 0.4;
  star(ctx, 20, -44, 10 * k, 4, 0.35);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

function antler(ctx) {
  const col = '#b0773f';
  rope(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-40, 64);
    ctx.quadraticCurveTo(-30, 0, 10, -40);
    ctx.quadraticCurveTo(30, -58, 40, -64);
    ctx.moveTo(-28, 20);
    ctx.quadraticCurveTo(-50, -10, -48, -40);
    ctx.moveTo(-8, -20);
    ctx.quadraticCurveTo(-6, -50, -12, -64);
    ctx.moveTo(12, -40);
    ctx.quadraticCurveTo(40, -36, 56, -20);
    ctx.moveTo(-20, 30);
    ctx.quadraticCurveTo(20, 20, 40, 2);
  }, 14, col);
  ctx.beginPath();
  ctx.moveTo(-34, 40);
  ctx.quadraticCurveTo(-24, 0, 8, -32);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.stroke();
}

function mouseEar(ctx, o) {
  const c = tintOr(o, '#9aa3ad');
  circle(ctx, 0, 0, 46);
  fillInk(ctx, c, LW);
  circle(ctx, 3, 4, 30);
  fillInk(ctx, '#ffa6c4', 0);
  shine(ctx, -20, -22, 10, 0.3);
}

function elfEar(ctx) {
  ctx.beginPath();
  ctx.moveTo(-40, -20);
  ctx.quadraticCurveTo(10, -16, 42, -32);
  ctx.quadraticCurveTo(20, 10, -2, 30);
  ctx.quadraticCurveTo(-30, 34, -40, 20);
  ctx.closePath();
  fillInk(ctx, '#f7c9a3', LW);
  ctx.beginPath();
  ctx.moveTo(-24, -8);
  ctx.quadraticCurveTo(8, -8, 26, -20);
  ctx.quadraticCurveTo(8, 6, -6, 18);
  ctx.quadraticCurveTo(-22, 18, -24, -8);
  ctx.closePath();
  fillInk(ctx, '#f19a9a', 0);
}

function bullHorn(ctx) {
  ctx.beginPath();
  ctx.moveTo(-48, 6);
  ctx.quadraticCurveTo(10, 20, 30, -8);
  ctx.quadraticCurveTo(40, -20, 44, -32);
  ctx.quadraticCurveTo(50, 10, 24, 26);
  ctx.quadraticCurveTo(-10, 40, -48, 30);
  ctx.closePath();
  const g = ctx.createLinearGradient(-48, 0, 48, 0);
  g.addColorStop(0, '#fff3dc');
  g.addColorStop(0.7, '#f1dcb0');
  g.addColorStop(1, '#6e4426');
  fillInk(ctx, g, LW);
  ctx.strokeStyle = 'rgba(110,68,38,0.45)';
  ctx.lineWidth = 3;
  for (const x of [-26, -6]) {
    ctx.beginPath();
    ctx.moveTo(x, 10 + (x + 26) * 0.1);
    ctx.quadraticCurveTo(x + 4, 22, x - 2, 33);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------------------------
// Hats
// ---------------------------------------------------------------------------------------------

function sunhat(ctx, o) {
  const c = tintOr(o, '#ffd23f');
  // brim
  ellipse(ctx, 0, 36, 158, 26);
  fillInk(ctx, c, LW);
  ellipse(ctx, 0, 36, 140, 18);
  stitches(ctx, 'rgba(110,68,38,0.4)', 2.4, 7);
  // crown
  ctx.beginPath();
  ctx.moveTo(-80, 34);
  ctx.bezierCurveTo(-84, -40, -40, -62, 0, -62);
  ctx.bezierCurveTo(40, -62, 84, -40, 80, 34);
  ctx.quadraticCurveTo(0, 50, -80, 34);
  ctx.closePath();
  fillInk(ctx, shade(c, 0.12), LW);
  // ribbon
  ctx.beginPath();
  ctx.moveTo(-81, 8);
  ctx.quadraticCurveTo(0, 26, 81, 8);
  ctx.lineTo(80, 30);
  ctx.quadraticCurveTo(0, 46, -80, 30);
  ctx.closePath();
  fillInk(ctx, '#ff4fa0', 4);
  // flower
  for (let k = 0; k < 5; k++) {
    const a = (k * TAU) / 5 + o.t * 0.3;
    circle(ctx, 56 + Math.cos(a) * 13, 14 + Math.sin(a) * 13, 11);
    fillInk(ctx, '#ffffff', 3);
  }
  circle(ctx, 56, 14, 9);
  fillInk(ctx, '#ffd23f', 3);
  shine(ctx, -40, -30, 16, 0.3);
}

function cap(ctx, o) {
  const c = tintOr(o, '#e8384f');
  // peak sticking out to the right
  ctx.beginPath();
  ctx.moveTo(20, 30);
  ctx.quadraticCurveTo(110, 18, 124, 44);
  ctx.quadraticCurveTo(80, 58, 10, 50);
  ctx.closePath();
  fillInk(ctx, shade(c, -0.2), LW);
  // dome
  ctx.beginPath();
  ctx.moveTo(-104, 44);
  ctx.bezierCurveTo(-106, -40, -50, -58, -4, -58);
  ctx.bezierCurveTo(50, -58, 100, -36, 100, 40);
  ctx.quadraticCurveTo(0, 54, -104, 44);
  ctx.closePath();
  fillInk(ctx, c, LW);
  ctx.strokeStyle = 'rgba(30,10,40,0.3)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-4, -56);
  ctx.quadraticCurveTo(-8, 0, -4, 48);
  ctx.moveTo(-4, -56);
  ctx.quadraticCurveTo(-60, -10, -70, 44);
  ctx.moveTo(-4, -56);
  ctx.quadraticCurveTo(54, -10, 64, 44);
  ctx.stroke();
  // front panel stripe
  ctx.beginPath();
  ctx.moveTo(-102, 26);
  ctx.quadraticCurveTo(0, 40, 100, 24);
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  circle(ctx, -4, -58, 9);
  fillInk(ctx, shade(c, -0.2), 4);
  shine(ctx, -50, -26, 16, 0.3);
}

function crown(ctx, o) {
  ctx.beginPath();
  ctx.moveTo(-84, 50);
  ctx.lineTo(-88, -40);
  ctx.lineTo(-50, -4);
  ctx.lineTo(-24, -54);
  ctx.lineTo(0, -10);
  ctx.lineTo(24, -54);
  ctx.lineTo(50, -4);
  ctx.lineTo(88, -40);
  ctx.lineTo(84, 50);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -54, 0, 50);
  g.addColorStop(0, '#fff09a');
  g.addColorStop(1, '#f0a800');
  fillInk(ctx, g, LW);
  roundRect(ctx, -86, 24, 172, 28, 8);
  fillInk(ctx, '#ffc93a', LW);
  const gems = [['#e8384f', -50], ['#3e5fd8', 0], ['#2fae6a', 50]];
  for (const [col, x] of gems) {
    ellipse(ctx, x, 38, 11, 9);
    fillInk(ctx, col, 3);
    shine(ctx, x - 3, 34, 3, 0.8);
  }
  for (const [x, y] of [[-88, -40], [-24, -54], [24, -54], [88, -40]]) {
    circle(ctx, x, y, 7);
    fillInk(ctx, '#ffffff', 3);
  }
  const k = Math.max(0, Math.sin(o.t * 2.6 + o.seed));
  if (k > 0.2) {
    star(ctx, -30, -14, 12 * k, 4, 0.3);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
}

function pirateHat(ctx) {
  ctx.beginPath();
  ctx.moveTo(-142, 0);
  ctx.quadraticCurveTo(-100, 30, -60, 40);
  ctx.quadraticCurveTo(0, 60, 60, 40);
  ctx.quadraticCurveTo(100, 30, 142, 0);
  ctx.quadraticCurveTo(120, -40, 70, -38);
  ctx.quadraticCurveTo(40, -70, 0, -68);
  ctx.quadraticCurveTo(-40, -70, -70, -38);
  ctx.quadraticCurveTo(-120, -40, -142, 0);
  ctx.closePath();
  fillInk(ctx, '#33283f', LW);
  // gold trim
  ctx.beginPath();
  ctx.moveTo(-132, 4);
  ctx.quadraticCurveTo(-100, 28, -60, 34);
  ctx.quadraticCurveTo(0, 52, 60, 34);
  ctx.quadraticCurveTo(100, 28, 132, 4);
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#ffc93a';
  ctx.stroke();
  // skull and bones
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#fff6e4';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-24, 0);
  ctx.lineTo(24, 30);
  ctx.moveTo(24, 0);
  ctx.lineTo(-24, 30);
  ctx.stroke();
  ellipse(ctx, 0, -14, 20, 18);
  ctx.fillStyle = '#fff6e4';
  ctx.fill();
  roundRect(ctx, -10, -4, 20, 14, 4);
  ctx.fill();
  ctx.fillStyle = '#33283f';
  circle(ctx, -7, -15, 5);
  ctx.fill();
  circle(ctx, 7, -15, 5);
  ctx.fill();
}

function chefHat(ctx) {
  const puffs = [[-58, -22, 36], [-20, -52, 40], [24, -50, 40], [60, -20, 36], [0, -12, 44]];
  ctx.beginPath();
  for (const [x, y, r] of puffs) {
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, TAU);
  }
  ctx.lineWidth = LW * 2;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  roundRect(ctx, -70, 10, 140, 76, 14);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = LW;
  ctx.strokeStyle = C.ink;
  ctx.beginPath();
  ctx.moveTo(-70, 0);
  ctx.lineTo(-70, 74);
  ctx.quadraticCurveTo(-70, 88, -56, 88);
  ctx.lineTo(56, 88);
  ctx.quadraticCurveTo(70, 88, 70, 74);
  ctx.lineTo(70, 0);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(42,24,56,0.18)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (const x of [-36, 0, 36]) {
    ctx.moveTo(x, 26);
    ctx.lineTo(x, 80);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(42,24,56,0.12)';
  ctx.fillRect(-68, 60, 136, 6);
}

function partyHat(ctx, o) {
  const c = tintOr(o, '#ff6fb1');
  ctx.beginPath();
  ctx.moveTo(-50, 62);
  ctx.lineTo(4, -56);
  ctx.lineTo(50, 62);
  ctx.quadraticCurveTo(0, 76, -50, 62);
  ctx.closePath();
  fillInk(ctx, c, LW);
  ctx.save();
  ctx.clip();
  const dots = ['#ffd23f', '#22b8b0', '#ffffff', '#8a4fd8'];
  let k = 0;
  for (let y = -30; y < 70; y += 24) {
    for (let x = -50 + ((y / 24) % 2) * 12; x < 50; x += 24) {
      circle(ctx, x, y, 6);
      ctx.fillStyle = dots[k++ % dots.length];
      ctx.fill();
    }
  }
  ctx.restore();
  // frilly brim
  ctx.beginPath();
  for (let i = 0; i <= 10; i++) {
    const x = -52 + i * 10.4;
    const y = 62 + Math.sin((x / 52) * Math.PI * 0.5) * 0 + (Math.abs(x) < 40 ? 6 : 2);
    ctx.moveTo(x + 7, y);
    ctx.arc(x, y, 7, 0, TAU);
  }
  fillInk(ctx, '#ffd23f', 3);
  // pompom
  const b = Math.sin(o.t * 5 + o.seed) * 3;
  for (let i = 0; i < 7; i++) {
    const a = (i * TAU) / 7;
    circle(ctx, 4 + Math.cos(a) * 9 + b, -64 + Math.sin(a) * 9, 9);
    fillInk(ctx, '#ffd23f', 3);
  }
  circle(ctx, 4 + b, -64, 9);
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
}

function floatie(ctx, o) {
  // the ring, a hole through the middle
  ctx.beginPath();
  ctx.ellipse(-20, 46, 128, 38, 0, 0, TAU);
  ctx.ellipse(-20, 42, 78, 18, 0, 0, TAU);
  const g = ctx.createLinearGradient(0, 8, 0, 84);
  g.addColorStop(0, '#ffb3d6');
  g.addColorStop(1, '#ff4fa0');
  ctx.fillStyle = g;
  ctx.fill('evenodd');
  ctx.lineWidth = LW;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  // shine along the front
  ctx.beginPath();
  ctx.ellipse(-20, 50, 108, 26, 0, 2.3, 2.9);
  ctx.lineWidth = 7;
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.stroke();
  // neck and head rising from the back right
  const bob = Math.sin(o.t * 2 + o.seed) * 0.05;
  ctx.save();
  ctx.translate(96, 40);
  ctx.rotate(bob);
  rope(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(30, -40, -30, -60, 0, -100);
  }, 22, '#ff6fb1');
  ellipse(ctx, 8, -110, 24, 20, 0.2);
  fillInk(ctx, '#ff6fb1', LW);
  // beak
  ctx.beginPath();
  ctx.moveTo(26, -118);
  ctx.quadraticCurveTo(52, -112, 48, -92);
  ctx.quadraticCurveTo(38, -100, 24, -100);
  ctx.closePath();
  fillInk(ctx, '#fff6e4', 4);
  ctx.beginPath();
  ctx.moveTo(44, -108);
  ctx.quadraticCurveTo(52, -104, 48, -92);
  ctx.quadraticCurveTo(44, -98, 40, -100);
  ctx.closePath();
  fillInk(ctx, '#33283f', 0);
  circle(ctx, 6, -116, 5);
  ctx.fillStyle = C.ink;
  ctx.fill();
  circle(ctx, 4.5, -117.5, 1.6);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.restore();
}

function topHat(ctx, o) {
  const c = tintOr(o, '#33283f');
  ellipse(ctx, 0, 72, 84, 16);
  fillInk(ctx, c, LW);
  ctx.beginPath();
  ctx.moveTo(-54, 72);
  ctx.lineTo(-58, -78);
  ctx.quadraticCurveTo(0, -94, 58, -78);
  ctx.lineTo(54, 72);
  ctx.quadraticCurveTo(0, 82, -54, 72);
  ctx.closePath();
  fillInk(ctx, c, LW);
  ellipse(ctx, 0, -80, 58, 12);
  fillInk(ctx, shade(c, 0.12), LW);
  ctx.beginPath();
  ctx.moveTo(-55, 30);
  ctx.quadraticCurveTo(0, 40, 55, 30);
  ctx.lineTo(54, 56);
  ctx.quadraticCurveTo(0, 66, -54, 56);
  ctx.closePath();
  fillInk(ctx, lightness(c) > 0.5 ? '#3e5fd8' : '#e8384f', 4);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(-42, -66, 14, 90);
}

function wizardHat(ctx, o) {
  const c = tintOr(o, '#8a4fd8');
  const flop = Math.sin(o.t * 1.6 + o.seed) * 4;
  ctx.beginPath();
  ctx.moveTo(-60, 84);
  ctx.quadraticCurveTo(-30, 0, -6, -60);
  ctx.quadraticCurveTo(10, -96, 46 + flop, -102);
  ctx.quadraticCurveTo(20, -70, 22, -30);
  ctx.quadraticCurveTo(30, 30, 60, 84);
  ctx.closePath();
  fillInk(ctx, c, LW);
  ellipse(ctx, 0, 86, 88, 18);
  fillInk(ctx, shade(c, -0.15), LW);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-60, 84);
  ctx.quadraticCurveTo(-30, 0, -6, -60);
  ctx.quadraticCurveTo(10, -96, 46 + flop, -102);
  ctx.quadraticCurveTo(20, -70, 22, -30);
  ctx.quadraticCurveTo(30, 30, 60, 84);
  ctx.closePath();
  ctx.clip();
  for (const [x, y, r] of [[-18, 40, 13], [16, -8, 10], [-6, -50, 8], [30, 54, 8]]) {
    star(ctx, x, y, r);
    ctx.fillStyle = '#ffd23f';
    ctx.fill();
  }
  // a moon
  circle(ctx, 28, 20, 11);
  ctx.fillStyle = '#fff6c9';
  ctx.fill();
  circle(ctx, 33, 16, 10);
  ctx.fillStyle = c;
  ctx.fill();
  ctx.restore();
  circle(ctx, 46 + flop, -102, 8);
  fillInk(ctx, '#ffd23f', 3);
}

function cowboyHat(ctx, o) {
  const c = tintOr(o, '#8d5a36');
  ctx.beginPath();
  ctx.moveTo(-158, 0);
  ctx.quadraticCurveTo(-140, 40, -60, 44);
  ctx.quadraticCurveTo(0, 50, 60, 44);
  ctx.quadraticCurveTo(140, 40, 158, 0);
  ctx.quadraticCurveTo(120, 24, 60, 22);
  ctx.lineTo(-60, 22);
  ctx.quadraticCurveTo(-120, 24, -158, 0);
  ctx.closePath();
  fillInk(ctx, shade(c, -0.1), LW);
  ctx.beginPath();
  ctx.moveTo(-66, 30);
  ctx.bezierCurveTo(-72, -40, -54, -62, -24, -56);
  ctx.quadraticCurveTo(0, -42, 24, -56);
  ctx.bezierCurveTo(54, -62, 72, -40, 66, 30);
  ctx.quadraticCurveTo(0, 40, -66, 30);
  ctx.closePath();
  fillInk(ctx, c, LW);
  ctx.beginPath();
  ctx.moveTo(-68, 8);
  ctx.quadraticCurveTo(0, 18, 68, 8);
  ctx.lineTo(67, 28);
  ctx.quadraticCurveTo(0, 38, -67, 28);
  ctx.closePath();
  fillInk(ctx, '#fff6e4', 3);
  star(ctx, 0, 21, 10);
  fillInk(ctx, '#ffc93a', 2);
  ctx.beginPath();
  ctx.moveTo(0, -44);
  ctx.quadraticCurveTo(-4, -20, 0, 0);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(30,10,40,0.3)';
  ctx.stroke();
}

function beanie(ctx, o) {
  const c = tintOr(o, '#22b8b0');
  ctx.beginPath();
  ctx.moveTo(-100, 40);
  ctx.bezierCurveTo(-104, -40, -50, -56, 0, -56);
  ctx.bezierCurveTo(50, -56, 104, -40, 100, 40);
  ctx.closePath();
  fillInk(ctx, c, LW);
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(30,10,40,0.16)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = -90; x <= 90; x += 18) {
    ctx.moveTo(x, 40);
    ctx.quadraticCurveTo(x * 0.6, -10, x * 0.2, -56);
  }
  ctx.stroke();
  ctx.restore();
  roundRect(ctx, -108, 20, 216, 44, 16);
  fillInk(ctx, shade(c, -0.14), LW);
  ctx.save();
  roundRect(ctx, -108, 20, 216, 44, 16);
  ctx.clip();
  ctx.strokeStyle = 'rgba(30,10,40,0.22)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let x = -100; x < 108; x += 13) {
    ctx.moveTo(x, 22);
    ctx.lineTo(x, 62);
  }
  ctx.stroke();
  ctx.restore();
  // pompom
  const b = Math.sin(o.t * 4 + o.seed) * 2;
  for (let i = 0; i < 8; i++) {
    const a = (i * TAU) / 8;
    circle(ctx, Math.cos(a) * 12 + b, -60 + Math.sin(a) * 10, 11);
    fillInk(ctx, '#ffffff', 3);
  }
  circle(ctx, b, -60, 13);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

function propeller(ctx, o) {
  const cols = ['#e8384f', '#ffd23f', '#3e5fd8', '#2fae6a'];
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-100, 54);
  ctx.bezierCurveTo(-104, -20, -50, -36, 0, -36);
  ctx.bezierCurveTo(50, -36, 104, -20, 100, 54);
  ctx.closePath();
  ctx.clip();
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(0, -40);
    ctx.lineTo(-110 + i * 55, 60);
    ctx.lineTo(-55 + i * 55, 60);
    ctx.closePath();
    ctx.fillStyle = cols[i];
    ctx.fill();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-100, 54);
  ctx.bezierCurveTo(-104, -20, -50, -36, 0, -36);
  ctx.bezierCurveTo(50, -36, 104, -20, 100, 54);
  ctx.quadraticCurveTo(0, 64, -100, 54);
  ctx.closePath();
  ctx.lineWidth = LW;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  // little peak
  ctx.beginPath();
  ctx.moveTo(10, 50);
  ctx.quadraticCurveTo(80, 50, 110, 66);
  ctx.quadraticCurveTo(60, 72, 10, 62);
  ctx.closePath();
  fillInk(ctx, '#e8384f', 4);
  // stalk and the spinning blades
  roundRect(ctx, -4, -58, 8, 24, 3);
  fillInk(ctx, '#9aa3ad', 3);
  const k = Math.cos(o.t * 14);
  ctx.save();
  ctx.translate(0, -60);
  ctx.scale(k, 1);
  ellipse(ctx, -42, 0, 40, 9);
  fillInk(ctx, '#ff8a3d', 4);
  ellipse(ctx, 42, 0, 40, 9);
  fillInk(ctx, '#22b8b0', 4);
  ctx.restore();
  circle(ctx, 0, -60, 7);
  fillInk(ctx, '#ffd23f', 3);
  shine(ctx, -50, -10, 14, 0.3);
}

function viking(ctx) {
  // horns
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 76, 20);
    ctx.quadraticCurveTo(s * 130, 10, s * 128, -70);
    ctx.quadraticCurveTo(s * 112, -20, s * 70, -14);
    ctx.closePath();
    fillInk(ctx, '#fff3dc', LW);
  }
  ctx.beginPath();
  ctx.moveTo(-90, 56);
  ctx.bezierCurveTo(-96, -36, -46, -60, 0, -60);
  ctx.bezierCurveTo(46, -60, 96, -36, 90, 56);
  ctx.closePath();
  const g = ctx.createLinearGradient(-90, -60, 60, 60);
  g.addColorStop(0, '#dfe5ea');
  g.addColorStop(1, '#8a95a0');
  fillInk(ctx, g, LW);
  roundRect(ctx, -96, 36, 192, 34, 10);
  fillInk(ctx, '#c9a24a', LW);
  roundRect(ctx, -10, -58, 20, 100, 6);
  fillInk(ctx, '#c9a24a', 4);
  ctx.fillStyle = '#6e4426';
  for (let x = -78; x <= 78; x += 26) {
    circle(ctx, x, 53, 4);
    ctx.fill();
  }
  shine(ctx, -46, -24, 16, 0.5);
}

// ---------------------------------------------------------------------------------------------
// Arms and hands (shoulder at the left edge, hand at the right)
// ---------------------------------------------------------------------------------------------

function noodleArm(ctx, o) {
  const c = tintOr(o, '#ff6fb1');
  const wig = Math.sin(o.t * 3 + o.seed) * 4;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(-84, 10);
    ctx.bezierCurveTo(-40, 40 + wig, -10, -30 - wig, 30, -6);
    ctx.quadraticCurveTo(46, 2, 52, -16);
  };
  rope(ctx, path, 14, c);
  // fuzz
  path();
  ctx.setLineDash([2, 5]);
  ctx.lineWidth = 20;
  ctx.strokeStyle = shade(c, 0.3);
  ctx.stroke();
  ctx.setLineDash([]);
  // three loopy fingers
  for (const a of [-1.2, -0.5, 0.2]) {
    rope(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(52, -16);
      ctx.lineTo(52 + Math.cos(a) * 28, -16 + Math.sin(a) * 28);
    }, 9, c, 4);
  }
  circle(ctx, 52, -16, 10);
  fillInk(ctx, c, 0);
}

function mitten(ctx, o) {
  const c = tintOr(o, '#e8384f');
  // a felt stub of arm
  roundRect(ctx, -50, -10, 40, 24, 10);
  fillInk(ctx, shade(c, -0.2), LW);
  ctx.save();
  ctx.translate(14, -4);
  ctx.rotate(-0.2);
  // thumb
  ellipse(ctx, -2, -26, 12, 20, -0.6);
  fillInk(ctx, c, LW);
  smoothPath(ctx, [-24, 30, -26, -10, -12, -44, 16, -50, 34, -26, 34, 10, 22, 34]);
  fillInk(ctx, c, LW);
  // cuff
  roundRect(ctx, -30, 20, 58, 26, 10);
  fillInk(ctx, '#fff3dc', LW);
  ctx.strokeStyle = 'rgba(30,10,40,0.2)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = -22; x < 26; x += 9) {
    ctx.moveTo(x, 24);
    ctx.lineTo(x, 42);
  }
  ctx.stroke();
  heart(ctx, 6, -16, 10);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();
}

function claw(ctx, o) {
  const red = '#ff5a4b';
  const snap = Math.max(0, Math.sin(o.t * 3 + o.seed)) * 0.25;
  rope(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-58, 8);
    ctx.quadraticCurveTo(-30, 20, -6, 6);
  }, 18, red);
  ctx.save();
  ctx.translate(10, 0);
  // bottom pincer
  ctx.save();
  ctx.rotate(snap);
  ctx.beginPath();
  ctx.moveTo(-10, 6);
  ctx.quadraticCurveTo(30, 40, 52, 10);
  ctx.quadraticCurveTo(30, 18, 10, 2);
  ctx.closePath();
  fillInk(ctx, red, LW);
  ctx.restore();
  // top pincer (the big one)
  ctx.save();
  ctx.rotate(-snap);
  ctx.beginPath();
  ctx.moveTo(-18, 4);
  ctx.bezierCurveTo(-20, -40, 40, -50, 54, -2);
  ctx.quadraticCurveTo(30, -18, 8, 6);
  ctx.closePath();
  fillInk(ctx, red, LW);
  shine(ctx, 8, -26, 9, 0.5);
  ctx.restore();
  ctx.restore();
}

function wing(ctx, o) {
  const flap = Math.sin(o.t * 3 + o.seed) * 0.05;
  ctx.save();
  ctx.translate(-90, 20);
  ctx.rotate(-flap);
  ctx.translate(90, -20);
  // long feathers fanning out from the shoulder, back to front
  const fan = [[-0.62, 176], [-0.28, 168], [0.06, 152], [0.4, 132], [0.74, 108]];
  for (let i = 0; i < fan.length; i++) {
    const [a, len] = fan[i];
    ctx.save();
    ctx.translate(-78, 14);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.quadraticCurveTo(len * 0.7, -22, len, 0);
    ctx.quadraticCurveTo(len * 0.7, 22, 0, 16);
    ctx.closePath();
    fillInk(ctx, i % 2 ? '#f4efff' : '#ffffff', 4.5);
    ctx.beginPath();
    ctx.moveTo(len * 0.2, 0);
    ctx.lineTo(len * 0.86, 0);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(140,120,190,0.5)';
    ctx.stroke();
    ctx.restore();
  }
  // the soft top of the wing with a row of little round feathers
  smoothPath(ctx, [-96, 30, -84, -30, -30, -62, 30, -66, 40, -36, -10, -10, -50, 26]);
  fillInk(ctx, '#ffffff', LW);
  for (const [x, y] of [[-60, 8], [-36, -8], [-10, -22], [16, -36]]) {
    ctx.beginPath();
    ctx.arc(x, y, 13, 0.2, Math.PI - 0.2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(140,120,190,0.55)';
    ctx.stroke();
  }
  ctx.restore();
}

function batWing(ctx, o) {
  const flap = Math.sin(o.t * 4 + o.seed) * 0.06;
  ctx.save();
  ctx.translate(-100, 10);
  ctx.rotate(-flap);
  ctx.translate(100, -10);
  ctx.beginPath();
  ctx.moveTo(-100, 20);
  ctx.lineTo(-20, -60);
  ctx.lineTo(100, -40);
  ctx.quadraticCurveTo(90, -10, 96, 20);
  ctx.quadraticCurveTo(70, 0, 52, 30);
  ctx.quadraticCurveTo(30, 6, 6, 44);
  ctx.quadraticCurveTo(-20, 20, -44, 56);
  ctx.quadraticCurveTo(-60, 30, -100, 20);
  ctx.closePath();
  fillInk(ctx, '#5b3a8c', LW);
  ctx.strokeStyle = '#2a1838';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const [x, y] of [[96, 20], [52, 30], [6, 44], [-44, 56]]) {
    ctx.moveTo(-20, -60);
    ctx.lineTo(x, y);
  }
  ctx.stroke();
  circle(ctx, -20, -60, 7);
  fillInk(ctx, '#2a1838', 0);
  ctx.restore();
}

function robotArm(ctx, o) {
  const grey = '#b8c2cc';
  roundRect(ctx, -80, -12, 70, 26, 10);
  fillInk(ctx, grey, LW);
  ctx.strokeStyle = 'rgba(30,10,40,0.3)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = -66; x < -14; x += 12) {
    ctx.moveTo(x, -10);
    ctx.lineTo(x, 12);
  }
  ctx.stroke();
  circle(ctx, -6, 0, 16);
  fillInk(ctx, '#ff8a3d', LW);
  circle(ctx, -6, 0, 5);
  fillInk(ctx, C.ink, 0);
  ctx.save();
  ctx.translate(-6, 0);
  ctx.rotate(-0.3);
  roundRect(ctx, 8, -11, 50, 22, 8);
  fillInk(ctx, grey, LW);
  // gripper
  const g = Math.sin(o.t * 3 + o.seed) * 0.15 + 0.2;
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(60, s * 6);
    ctx.rotate(s * g);
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(22, s * 10 - 4);
    ctx.lineTo(26, s * 2);
    ctx.lineTo(0, 5);
    ctx.closePath();
    fillInk(ctx, '#7f8a96', 4);
    ctx.restore();
  }
  circle(ctx, 60, 0, 9);
  fillInk(ctx, '#ffd23f', 4);
  ctx.restore();
  // a blinking light
  circle(ctx, -50, 0, 5);
  ctx.fillStyle = Math.sin(o.t * 5) > 0 ? '#ff3d7a' : '#7a2040';
  ctx.fill();
}

function glove(ctx, o) {
  const col = '#ffd23f';
  rope(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-54, 20);
    ctx.quadraticCurveTo(-30, 26, -10, 14);
  }, 16, shade(col, -0.15));
  ctx.save();
  ctx.translate(18, 0);
  ctx.rotate(-0.3 + Math.sin(o.t * 4 + o.seed) * 0.06);
  // fingers
  const fingers = [[-22, -44, -0.3], [-6, -52, -0.08], [10, -50, 0.14]];
  for (const [x, y, a] of fingers) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    roundRect(ctx, -9, -10, 18, 44, 9);
    fillInk(ctx, col, LW);
    ctx.restore();
  }
  // thumb
  ellipse(ctx, 26, -8, 10, 20, 0.8);
  fillInk(ctx, col, LW);
  roundRect(ctx, -30, -24, 52, 46, 18);
  fillInk(ctx, col, LW);
  ctx.fillStyle = col;
  ctx.fillRect(-26, -26, 44, 10);
  // cuff
  roundRect(ctx, -32, 18, 56, 20, 8);
  fillInk(ctx, '#3e5fd8', LW);
  ctx.strokeStyle = 'rgba(30,10,40,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-6, -10);
  ctx.lineTo(-6, 10);
  ctx.moveTo(8, -8);
  ctx.lineTo(8, 10);
  ctx.stroke();
  ctx.restore();
}

function tentacle(ctx, o) {
  const c = tintOr(o, '#8a4fd8');
  const w = Math.sin(o.t * 2.4 + o.seed) * 6;
  const pts = [[-70, -10], [-30, 10], [10, 30 + w], [44, 30], [60, 4], [48, -20], [30, -16]];
  ctx.lineCap = 'round';
  // thick at the shoulder, thin at the curl: a few strokes of shrinking width
  for (const [wd, col] of [[48, C.ink], [37, c]]) {
    for (let i = 1; i < pts.length; i++) {
      const k = 1 - (i - 1) / pts.length;
      ctx.beginPath();
      ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
      ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.lineWidth = wd * (0.45 + 0.55 * k);
      ctx.strokeStyle = col;
      ctx.stroke();
    }
  }
  for (let i = 1; i < 5; i++) {
    const [x, y] = pts[i];
    circle(ctx, x, y + 9 - i * 1.5, 8 - i * 0.9);
    fillInk(ctx, '#ffc4e0', 2.5);
  }
  shine(ctx, -50, -6, 8, 0.4);
}

function fairyWing(ctx, o) {
  const flap = Math.sin(o.t * 5 + o.seed) * 0.08;
  ctx.save();
  ctx.translate(-90, 10);
  ctx.rotate(-flap);
  ctx.translate(90, -10);
  const g = ctx.createLinearGradient(-90, -90, 90, 90);
  g.addColorStop(0, 'rgba(180,240,255,0.92)');
  g.addColorStop(0.5, 'rgba(255,190,240,0.92)');
  g.addColorStop(1, 'rgba(255,240,170,0.92)');
  smoothPath(ctx, [-90, 0, -40, -70, 30, -96, 86, -80, 70, -30, 0, 0]);
  fillInk(ctx, g, LW);
  smoothPath(ctx, [-86, 14, -20, 20, 40, 50, 46, 90, 0, 96, -50, 60]);
  fillInk(ctx, g, LW);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-80, 4);
  ctx.quadraticCurveTo(-10, -50, 60, -70);
  ctx.moveTo(-80, 16);
  ctx.quadraticCurveTo(0, 50, 20, 80);
  ctx.stroke();
  for (const [x, y] of [[20, -50], [50, -60], [-10, 50], [10, 70]]) {
    circle(ctx, x, y, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  ctx.restore();
}

function boxingGlove(ctx) {
  rope(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-58, 14);
    ctx.quadraticCurveTo(-34, 20, -20, 10);
  }, 16, '#f2c49b');
  roundRect(ctx, -30, -8, 26, 40, 8);
  fillInk(ctx, '#ffffff', LW);
  ctx.beginPath();
  ctx.moveTo(-10, 30);
  ctx.bezierCurveTo(-20, -40, 60, -56, 60, 0);
  ctx.bezierCurveTo(60, 40, 10, 50, -10, 30);
  ctx.closePath();
  fillInk(ctx, '#e8384f', LW);
  // thumb
  ctx.beginPath();
  ctx.moveTo(4, 6);
  ctx.quadraticCurveTo(30, -6, 40, 18);
  ctx.lineWidth = 4;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  shine(ctx, 18, -22, 12, 0.5);
}

function leafHand(ctx, o) {
  rope(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-72, 10);
    ctx.quadraticCurveTo(-30, 20, 0, 4);
    ctx.moveTo(-36, 14);
    ctx.lineTo(-30, -6);
  }, 9, '#8d5a36');
  ctx.save();
  ctx.translate(0, 4);
  ctx.rotate(-0.2 + Math.sin(o.t * 2.5 + o.seed) * 0.08);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(20, -44, 60, -40, 74, -4);
  ctx.bezierCurveTo(56, 34, 20, 34, 0, 0);
  ctx.closePath();
  fillInk(ctx, '#3cbf55', LW);
  ctx.strokeStyle = '#22813a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.lineTo(68, -4);
  for (const x of [20, 36, 52]) {
    ctx.moveTo(x, -1);
    ctx.lineTo(x + 10, -18);
    ctx.moveTo(x, -1);
    ctx.lineTo(x + 10, 14);
  }
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Extras
// ---------------------------------------------------------------------------------------------

function bowTie(ctx, o) {
  const c = tintOr(o, '#e8384f');
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(s * 30, -34, s * 60, -26);
    ctx.quadraticCurveTo(s * 66, 0, s * 60, 26);
    ctx.quadraticCurveTo(s * 30, 34, 0, 0);
    ctx.closePath();
    fillInk(ctx, c, LW);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = lightness(c) > 0.75 ? '#e8384f' : '#ffffff';
    for (const [x, y] of [[22, -10], [40, 8], [48, -14], [26, 16]]) {
      circle(ctx, s * x, y, 5);
      ctx.fill();
    }
    ctx.restore();
  }
  roundRect(ctx, -14, -18, 28, 36, 10);
  fillInk(ctx, shade(c, -0.15), LW);
}

function necklace(ctx, o) {
  const n = 15;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const x = -96 + u * 192;
    const y = -40 + 70 * (1 - Math.pow(2 * u - 1, 2));
    pts.push([x, y]);
  }
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.lineWidth = 3;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  for (const [x, y] of pts) {
    circle(ctx, x, y, 9);
    fillInk(ctx, '#fff6ef', 3);
    shine(ctx, x - 3, y - 3, 3, 0.9);
  }
  // pendant
  const sw = Math.sin(o.t * 2 + o.seed) * 0.12;
  ctx.save();
  ctx.translate(0, 30);
  ctx.rotate(sw);
  heart(ctx, 0, 16, 15);
  fillInk(ctx, '#ff4fa0', 4);
  shine(ctx, -5, 10, 4, 0.8);
  ctx.restore();
}

function cape(ctx, o) {
  const c = tintOr(o, '#e8384f');
  const w = Math.sin(o.t * 2 + o.seed) * 8;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(-96, -172);
    ctx.quadraticCurveTo(0, -150, 96, -172);
    ctx.quadraticCurveTo(150, 0, 166 + w, 170);
    ctx.quadraticCurveTo(120, 190, 84, 172);
    ctx.quadraticCurveTo(40, 194, 0, 174);
    ctx.quadraticCurveTo(-40, 194, -84, 172);
    ctx.quadraticCurveTo(-120, 190, -166 - w, 170);
    ctx.quadraticCurveTo(-150, 0, -96, -172);
    ctx.closePath();
  };
  path();
  fillInk(ctx, c, LW);
  // the lining showing at the edges
  ctx.save();
  path();
  ctx.clip();
  ctx.fillStyle = shade(c, -0.3);
  ctx.beginPath();
  ctx.moveTo(-96, -172);
  ctx.quadraticCurveTo(-150, 0, -166 - w, 170);
  ctx.lineTo(-130, 200);
  ctx.quadraticCurveTo(-120, 0, -80, -172);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(96, -172);
  ctx.quadraticCurveTo(150, 0, 166 + w, 170);
  ctx.lineTo(130, 200);
  ctx.quadraticCurveTo(120, 0, 80, -172);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // stand-up collar points
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 70, -168);
    ctx.lineTo(s * 132, -188);
    ctx.lineTo(s * 110, -140);
    ctx.closePath();
    fillInk(ctx, shade(c, -0.3), LW);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.moveTo(-60, -150);
  ctx.quadraticCurveTo(-90, 0, -100, 160);
  ctx.lineTo(-70, 160);
  ctx.quadraticCurveTo(-60, 0, -40, -150);
  ctx.closePath();
  ctx.fill();
}

function scarf(ctx, o) {
  const c = tintOr(o, '#22b8b0');
  const stripe = lightness(c) > 0.75 ? '#e8384f' : '#ffffff';
  const sw = Math.sin(o.t * 2 + o.seed) * 4;
  // hanging end
  const end = () => {
    ctx.beginPath();
    ctx.moveTo(34, -10);
    ctx.lineTo(86, -10);
    ctx.lineTo(92 + sw, 62);
    ctx.lineTo(44 + sw, 66);
    ctx.closePath();
  };
  end();
  fillInk(ctx, c, LW);
  ctx.save();
  end();
  ctx.clip();
  ctx.fillStyle = stripe;
  for (const y of [8, 36]) ctx.fillRect(30, y, 70, 10);
  ctx.restore();
  // fringe
  ctx.strokeStyle = c;
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const x = 47 + sw + i * 11;
    ctx.beginPath();
    ctx.moveTo(x, 64);
    ctx.lineTo(x + 1, 76);
    ctx.lineWidth = 9;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeStyle = c;
    ctx.stroke();
  }
  // the wrap round the neck
  const band = () => {
    ctx.beginPath();
    ctx.moveTo(-128, -40);
    ctx.quadraticCurveTo(0, -10, 128, -40);
    ctx.lineTo(124, 0);
    ctx.quadraticCurveTo(0, 34, -124, 0);
    ctx.closePath();
  };
  band();
  fillInk(ctx, c, LW);
  ctx.save();
  band();
  ctx.clip();
  ctx.fillStyle = stripe;
  for (let x = -112; x < 128; x += 46) {
    ctx.beginPath();
    ctx.moveTo(x, -50);
    ctx.lineTo(x + 12, -50);
    ctx.lineTo(x + 24, 30);
    ctx.lineTo(x + 12, 30);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // the knot
  roundRect(ctx, 30, -30, 46, 34, 12);
  fillInk(ctx, shade(c, -0.1), LW);
}

function sunglasses(ctx) {
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-18, -10);
  ctx.quadraticCurveTo(0, -20, 18, -10);
  ctx.lineWidth = 12;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#ff4fa0';
  ctx.stroke();
  for (const s of [-1, 1]) {
    const x = s * 56;
    roundRect(ctx, x - 44, -30, 88, 60, 24);
    fillInk(ctx, '#ff4fa0', LW + 1);
    roundRect(ctx, x - 36, -22, 72, 46, 18);
    const g = ctx.createLinearGradient(x, -22, x, 24);
    g.addColorStop(0, '#3b2a6b');
    g.addColorStop(1, '#16b8c8');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x - 30, 10);
    ctx.lineTo(x - 6, -24);
    ctx.moveTo(x - 12, 22);
    ctx.lineTo(x + 8, -6);
    ctx.stroke();
    ctx.restore();
  }
}

function eyePatch(ctx) {
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-45, -36);
  ctx.lineTo(45, 20);
  ctx.moveTo(-45, 26);
  ctx.lineTo(10, 4);
  ctx.lineWidth = 9;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#4a3a58';
  ctx.stroke();
  ellipse(ctx, 6, 4, 32, 28);
  fillInk(ctx, '#33283f', LW);
  ellipse(ctx, 6, 4, 24, 20);
  stitches(ctx, 'rgba(255,255,255,0.35)', 2, 5);
  shine(ctx, -6, -8, 6, 0.25);
}

function patch(ctx, o) {
  const c = tintOr(o, '#ffd23f');
  ctx.save();
  ctx.rotate(0.12);
  roundRect(ctx, -34, -34, 68, 68, 8);
  fillInk(ctx, c, LW);
  roundRect(ctx, -26, -26, 52, 52, 4);
  stitches(ctx, stitchOn(c), 3, 6);
  // a cross-stitch in the middle
  ctx.strokeStyle = lightness(c) > 0.7 ? '#e8384f' : '#ffffff';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-9, -9);
  ctx.lineTo(9, 9);
  ctx.moveTo(9, -9);
  ctx.lineTo(-9, 9);
  ctx.stroke();
  ctx.restore();
}

function bigButton(ctx, o) {
  const c = tintOr(o, '#5cb8ff');
  circle(ctx, 0, 0, 26);
  fillInk(ctx, c, LW);
  circle(ctx, 0, 0, 19);
  ctx.lineWidth = 3;
  ctx.strokeStyle = shade(c, -0.25);
  ctx.stroke();
  ctx.fillStyle = shade(c, -0.45);
  for (const [x, y] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) {
    circle(ctx, x, y, 3.4);
    ctx.fill();
  }
  ctx.strokeStyle = '#fff6e4';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-6, -6);
  ctx.lineTo(6, 6);
  ctx.moveTo(6, -6);
  ctx.lineTo(-6, 6);
  ctx.stroke();
  shine(ctx, -12, -13, 6, 0.6);
}

function sticker(ctx, path, fill, glint) {
  path();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 16;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.lineWidth = 11;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  path();
  ctx.fillStyle = fill;
  ctx.fill();
  if (glint) glint();
}

function stickerStar(ctx, o) {
  const g = ctx.createLinearGradient(-30, -30, 30, 30);
  g.addColorStop(0, '#fff09a');
  g.addColorStop(1, '#f0a800');
  sticker(ctx, () => star(ctx, 0, 2, 28, 5, 0.5), g, () => {
    const k = 0.5 + 0.5 * Math.sin(o.t * 3 + o.seed);
    star(ctx, -8, -6, 6 + k * 3, 4, 0.3);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  });
}

function stickerHeart(ctx) {
  sticker(ctx, () => heart(ctx, 0, 0, 24), '#ff4fa0', () => shine(ctx, -10, -10, 6, 0.7));
}

function stickerBolt(ctx) {
  sticker(ctx, () => poly(ctx, [6, -36, -20, 6, -2, 6, -8, 36, 20, -6, 2, -6, 12, -36]), '#ffd23f', () => {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    poly(ctx, [4, -30, -8, -8, -2, -8]);
    ctx.fill();
  });
}

function medal(ctx, o) {
  // ribbon
  ctx.beginPath();
  ctx.moveTo(-24, -58);
  ctx.lineTo(-4, 14);
  ctx.lineTo(10, 14);
  ctx.lineTo(-6, -58);
  ctx.closePath();
  fillInk(ctx, '#3e5fd8', 4);
  ctx.beginPath();
  ctx.moveTo(24, -58);
  ctx.lineTo(4, 14);
  ctx.lineTo(-10, 14);
  ctx.lineTo(6, -58);
  ctx.closePath();
  fillInk(ctx, '#e8384f', 4);
  const sw = Math.sin(o.t * 2 + o.seed) * 0.08;
  ctx.save();
  ctx.translate(0, 14);
  ctx.rotate(sw);
  circle(ctx, 0, 24, 26);
  const g = ctx.createLinearGradient(-20, 0, 20, 50);
  g.addColorStop(0, '#fff09a');
  g.addColorStop(1, '#e89d00');
  fillInk(ctx, g, LW);
  circle(ctx, 0, 24, 19);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(150,90,0,0.6)';
  ctx.stroke();
  star(ctx, 0, 25, 12);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();
}

function freckles(ctx) {
  ctx.fillStyle = '#9a5a3a';
  for (const [x, y, r] of [[-22, -8, 5], [-6, -14, 4.5], [10, -6, 5.5], [26, -12, 4], [-14, 8, 4.5], [4, 10, 5], [20, 8, 4.2]]) {
    circle(ctx, x, y, r);
    ctx.fill();
  }
}

function cheeks(ctx) {
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 32);
  g.addColorStop(0, 'rgba(255,90,140,0.85)');
  g.addColorStop(0.7, 'rgba(255,110,150,0.55)');
  g.addColorStop(1, 'rgba(255,110,150,0)');
  ellipse(ctx, 0, 0, 32, 22);
  ctx.fillStyle = g;
  ctx.fill();
  shine(ctx, -10, -6, 5, 0.5);
}

function bandage(ctx) {
  for (const a of [-0.32, 0.32]) {
    ctx.save();
    ctx.rotate(a);
    roundRect(ctx, -44, -12, 88, 24, 12);
    fillInk(ctx, '#f3c79a', 4);
    roundRect(ctx, -12, -9, 24, 18, 4);
    ctx.fillStyle = '#e8b07c';
    ctx.fill();
    ctx.fillStyle = 'rgba(140,80,40,0.35)';
    for (const x of [-34, -26, 26, 34]) {
      circle(ctx, x, -3, 1.8);
      ctx.fill();
      circle(ctx, x, 4, 1.8);
      ctx.fill();
    }
    ctx.restore();
  }
}

function necktie(ctx, o) {
  const c = tintOr(o, '#3e5fd8');
  const sw = Math.sin(o.t * 1.8 + o.seed) * 0.04;
  ctx.save();
  ctx.translate(0, -70);
  ctx.rotate(sw);
  ctx.translate(0, 70);
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(-14, -56);
    ctx.lineTo(14, -56);
    ctx.lineTo(30, 56);
    ctx.lineTo(0, 82);
    ctx.lineTo(-30, 56);
    ctx.closePath();
  };
  body();
  fillInk(ctx, c, LW);
  ctx.save();
  body();
  ctx.clip();
  ctx.strokeStyle = lightness(c) > 0.7 ? '#e8384f' : '#ffd23f';
  ctx.lineWidth = 8;
  ctx.beginPath();
  for (let y = -60; y < 100; y += 32) {
    ctx.moveTo(-40, y);
    ctx.lineTo(40, y + 30);
  }
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-22, -84);
  ctx.lineTo(22, -84);
  ctx.lineTo(14, -54);
  ctx.lineTo(-14, -54);
  ctx.closePath();
  fillInk(ctx, shade(c, -0.15), LW);
  ctx.restore();
}

export const WEAR_DRAW = {
  'bear-ear': bearEar,
  'bunny-ear': bunnyEar,
  'cat-ear': catEar,
  'floppy-ear': floppyEar,
  'elephant-ear': elephantEar,
  'devil-horn': devilHorn,
  'magic-horn': magicHorn,
  antler,
  'mouse-ear': mouseEar,
  'elf-ear': elfEar,
  'bull-horn': bullHorn,
  sunhat,
  cap,
  crown,
  'pirate-hat': pirateHat,
  'chef-hat': chefHat,
  'party-hat': partyHat,
  floatie,
  'top-hat': topHat,
  'wizard-hat': wizardHat,
  'cowboy-hat': cowboyHat,
  beanie,
  propeller,
  viking,
  'noodle-arm': noodleArm,
  mitten,
  claw,
  wing,
  'bat-wing': batWing,
  'robot-arm': robotArm,
  glove,
  tentacle,
  'fairy-wing': fairyWing,
  'boxing-glove': boxingGlove,
  'leaf-hand': leafHand,
  'bow-tie': bowTie,
  necklace,
  cape,
  scarf,
  sunglasses,
  'eye-patch': eyePatch,
  patch,
  'big-button': bigButton,
  'sticker-star': stickerStar,
  'sticker-heart': stickerHeart,
  'sticker-bolt': stickerBolt,
  medal,
  freckles,
  cheeks,
  bandage,
  necktie,
};
