// Things to find. Each entry draws one thing at the origin and gives its box as
// [centre x, centre y, half w, half h] so the tray can frame it and the hit area can cover it.
// The same picture is drawn in the scene and in the tray, so Riley can match them by eye.
import { TAU, INK, circle, ellipse, poly, rect, rrect, line, curve, fs, star, limb, lin } from './kit.js';
import { drawIggy, IGGY_BOX } from './iggy.js';
import * as A from './animals.js';

const P = {};
const def = (name, box, draw) => {
  P[name] = { box, draw };
};

// --- Iggy himself (pose comes from the spot) ---
for (const pose of Object.keys(IGGY_BOX)) def(`iggy-${pose}`, IGGY_BOX[pose], (ctx, o, t) => drawIggy(ctx, pose, t, o));

// --- beach things ---
def('beachball', [0, 0, 20, 20], (ctx, o, t) => {
  ctx.save();
  ctx.rotate(o.still ? 0 : Math.sin(t * 1.5) * 0.2);
  const cs = ['#ff3d5a', '#ffffff', '#2fb5e8', '#ffffff', '#ffd23a', '#ffffff'];
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 20, (i / 6) * TAU, ((i + 1) / 6) * TAU);
    ctx.closePath();
    ctx.fillStyle = cs[i];
    ctx.fill();
  }
  circle(ctx, 0, 0, 20, 'rgba(0,0,0,0)', 2.5);
  circle(ctx, 0, 0, 4, '#ffffff', 1.5);
  ctx.restore();
});
def('bucket', [0, -4, 22, 24], (ctx, o) => {
  const c = o.colour || '#ff3d5a';
  curve(ctx, -15, -14, 0, -38, 15, -14, INK, 2.5);
  poly(ctx, [[-17, -16], [17, -16], [12, 18], [-12, 18]], c, 2.5);
  ellipse(ctx, 0, -16, 17, 4.5, '#e8c890', 2);
  line(ctx, -15, -4, 15, -4, 'rgba(255,255,255,0.6)', 3);
});
def('spade', [0, 0, 10, 26], (ctx, o) => {
  line(ctx, 0, -24, 0, 6, INK, 6);
  line(ctx, 0, -24, 0, 6, o.colour || '#2fb5e8', 3);
  rect(ctx, -6, -28, 12, 6, o.colour || '#2fb5e8', 2);
  poly(ctx, [[-9, 4], [9, 4], [7, 22], [0, 26], [-7, 22]], o.colour || '#2fb5e8', 2.5);
});
def('starfish', [0, 0, 20, 20], (ctx, o, t) => A.starfishFace(ctx, o, t));
def('shell', [0, 0, 18, 16], (ctx, o) => {
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.lineTo(-18, -4);
  ctx.quadraticCurveTo(0, -24, 18, -4);
  ctx.closePath();
  fs(ctx, o.colour || '#ffb8c8', 2.5);
  for (const a of [-0.9, -0.45, 0, 0.45, 0.9]) line(ctx, 0, 12, Math.sin(a) * 15, -10 + Math.abs(a) * 6, 'rgba(22,11,51,0.45)', 1.8);
  rect(ctx, -4, 12, 8, 4, o.colour || '#ffb8c8', 2);
});
def('flipflop', [0, 0, 12, 22], (ctx, o) => {
  ellipse(ctx, 0, 0, 11, 21, o.colour || '#ffd23a', 2.5);
  curve(ctx, -9, 2, 0, -18, 9, 2, '#ff3d9a', 3.5);
});
def('sunglasses', [0, 0, 24, 10], (ctx, o) => {
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(-6, -2);
  ctx.quadraticCurveTo(0, -6, 6, -2);
  ctx.stroke();
  ellipse(ctx, -13, 0, 10, 8, o.colour || '#2a2a44', 2.5);
  ellipse(ctx, 13, 0, 10, 8, o.colour || '#2a2a44', 2.5);
  line(ctx, -23, -3, -27, -6, o.frame || '#ff3d9a', 3);
  line(ctx, 23, -3, 27, -6, o.frame || '#ff3d9a', 3);
  rect(ctx, -17, -4, 3, 3, 'rgba(255,255,255,0.75)', 0);
  rect(ctx, 9, -4, 3, 3, 'rgba(255,255,255,0.75)', 0);
});
def('cone', [0, 0, 14, 26], (ctx, o) => {
  poly(ctx, [[-11, -2], [11, -2], [0, 26]], '#e8b060', 2.5);
  line(ctx, -6, 4, 4, 14, 'rgba(122,74,34,0.6)', 1.5);
  line(ctx, 6, 4, -4, 14, 'rgba(122,74,34,0.6)', 1.5);
  circle(ctx, 0, -8, 11, o.colour || '#ff9ed2', 2.5);
  circle(ctx, -2, -19, 8, o.top || '#8a5a2c', 2.5);
  circle(ctx, 2, -27, 3.5, '#ff3d3d', 1.5);
});
def('bottle', [0, 0, 10, 24], (ctx) => {
  ctx.save();
  ctx.rotate(0.35);
  rrect(ctx, -9, -10, 18, 30, 6, 'rgba(120,220,200,0.75)', 2.5);
  rect(ctx, -4, -20, 8, 10, 'rgba(120,220,200,0.75)', 2);
  rect(ctx, -4, -24, 8, 5, '#a8743f', 1.8);
  rrect(ctx, -5, -4, 10, 18, 2, '#fff3d0', 1.5);
  ctx.restore();
});
def('duck', [0, -2, 20, 17], (ctx, o, t) => {
  ctx.save();
  ctx.rotate(Math.sin(t * 2 + (o.phase || 0)) * 0.06);
  ctx.beginPath();
  ctx.moveTo(-18, -2);
  ctx.quadraticCurveTo(-20, 12, 0, 12);
  ctx.quadraticCurveTo(18, 12, 16, -2);
  ctx.quadraticCurveTo(4, 2, -18, -2);
  fs(ctx, o.colour || '#ffd23a', 2.5);
  poly(ctx, [[-18, -2], [-24, -8], [-16, -6]], o.colour || '#ffd23a', 2);
  circle(ctx, 6, -8, 9, o.colour || '#ffd23a', 2.5);
  poly(ctx, [[13, -9], [22, -6], [13, -3]], '#ff8a2a', 1.8);
  circle(ctx, 8, -10, 1.8, INK, 0);
  ctx.restore();
});
def('sunhat', [0, 0, 28, 14], (ctx, o) => {
  ellipse(ctx, 0, 4, 28, 9, o.colour || '#f2d27a', 2.5);
  ctx.beginPath();
  ctx.arc(0, 3, 15, Math.PI, 0);
  ctx.closePath();
  fs(ctx, o.colour || '#f2d27a', 2.5);
  rect(ctx, -15, -4, 30, 6, o.band || '#ff3d9a', 1.8);
  circle(ctx, 10, -2, 4, '#ffffff', 1.5);
});
def('camera', [0, 0, 20, 14], (ctx, o) => {
  rrect(ctx, -19, -10, 38, 24, 5, o.colour || '#3a3f55', 2.5);
  rect(ctx, -12, -14, 10, 5, o.colour || '#3a3f55', 2);
  circle(ctx, 2, 2, 9, '#7fd8ff', 2.5);
  circle(ctx, 2, 2, 4, '#2a4a8a', 0);
  circle(ctx, 13, -5, 2.5, '#ff3d3d', 0);
});
def('melon', [0, 0, 24, 14], (ctx) => {
  ctx.beginPath();
  ctx.moveTo(-24, -8);
  ctx.arc(0, -8, 24, 0, Math.PI, false);
  ctx.closePath();
  fs(ctx, '#ff4f6a', 2.5);
  ctx.beginPath();
  ctx.arc(0, -8, 22, 0.05, Math.PI - 0.05);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#3fae4a';
  ctx.stroke();
  for (let k = 0; k < 5; k++) ellipse(ctx, -12 + k * 6, -3 + (k % 2) * 5, 1.6, 2.6, INK, 0);
});
def('pineapple', [0, -6, 16, 30], (ctx) => {
  for (let k = -2; k <= 2; k++) poly(ctx, [[k * 3 - 3, -14], [k * 6, -36 + Math.abs(k) * 6], [k * 3 + 3, -14]], k % 2 ? '#3fae4a' : '#2f8a3e', 1.8);
  ellipse(ctx, 0, 4, 14, 20, '#f2b23a', 2.5);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 4, 14, 20, 0, 0, TAU);
  ctx.clip();
  ctx.strokeStyle = '#b8781e';
  ctx.lineWidth = 1.8;
  for (let k = -30; k < 30; k += 8) {
    ctx.beginPath();
    ctx.moveTo(k, -18);
    ctx.lineTo(k + 26, 26);
    ctx.moveTo(-k, -18);
    ctx.lineTo(-k - 26, 26);
    ctx.stroke();
  }
  ctx.restore();
});
def('bananas', [0, 0, 20, 18], (ctx) => {
  for (let k = 0; k < 4; k++) {
    ctx.save();
    ctx.translate(-10, -12);
    ctx.rotate(-0.4 + k * 0.28);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(26, 6, 34, 26);
    ctx.quadraticCurveTo(14, 18, 0, 0);
    fs(ctx, k % 2 ? '#ffe14d' : '#ffd23a', 2.2);
    ctx.restore();
  }
  rect(ctx, -14, -16, 8, 7, '#6e4426', 1.8);
});
def('coconut', [0, -4, 18, 22], (ctx) => {
  circle(ctx, 0, 4, 17, '#8a5a2c', 2.5);
  ellipse(ctx, 0, -6, 13, 5, '#fff6e0', 2);
  line(ctx, 4, -6, 14, -26, '#ff3d9a', 3);
  poly(ctx, [[-14, -10], [-4, -22], [2, -8]], '#ffd23a', 1.5);
});
def('kite', [0, 0, 20, 30], (ctx, o, t) => {
  ctx.save();
  ctx.rotate(Math.sin(t * 1.4) * 0.1);
  poly(ctx, [[0, -28], [18, -4], [0, 22], [-18, -4]], o.colour || '#ff3d9a', 2.5);
  line(ctx, 0, -28, 0, 22, INK, 1.5);
  line(ctx, -18, -4, 18, -4, INK, 1.5);
  curve(ctx, 0, 22, 10, 34, 2, 44, INK, 1.5);
  for (let k = 0; k < 3; k++) poly(ctx, [[3 + k * 0, 28 + k * 6], [10, 30 + k * 6], [3, 33 + k * 6]], '#ffd23a', 1);
  ctx.restore();
});
def('teddy', [0, -2, 18, 22], (ctx, o) => {
  const c = o.colour || '#c98f4f';
  circle(ctx, -10, -18, 6, c, 2);
  circle(ctx, 10, -18, 6, c, 2);
  ellipse(ctx, 0, 10, 14, 12, c, 2.5);
  circle(ctx, 0, -10, 12, c, 2.5);
  ellipse(ctx, 0, -6, 6, 4.5, '#f2d2a8', 1.5);
  circle(ctx, -4, -13, 1.8, INK, 0);
  circle(ctx, 4, -13, 1.8, INK, 0);
  circle(ctx, 0, -8, 1.8, INK, 0);
  poly(ctx, [[-6, 0], [0, 4], [6, 0], [0, -2]], o.bow || '#ff3d5a', 1.5);
});
def('balloon', [0, -6, 16, 30], (ctx, o, t) => {
  const sway = Math.sin(t * 1.6 + (o.phase || 0)) * 2;
  curve(ctx, sway, 4, -4, 18, 2, 30, INK, 1.5);
  ellipse(ctx, sway, -14, 15, 19, o.colour || '#ff3d5a', 2.5);
  ellipse(ctx, sway - 5, -20, 3.5, 6, 'rgba(255,255,255,0.6)', 0);
  poly(ctx, [[sway - 3, 5], [sway + 3, 5], [sway, 0]], o.colour || '#ff3d5a', 1.5);
});
def('lollipop', [0, -6, 16, 26], (ctx, o) => {
  line(ctx, 0, 0, 0, 24, '#ffffff', 4);
  line(ctx, 0, 0, 0, 24, INK, 1);
  circle(ctx, 0, -14, 15, o.colour || '#ff5ab8', 2.5);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let a = 0; a < 12; a += 0.3) ctx.lineTo(Math.cos(a) * a * 1.1, -14 + Math.sin(a) * a * 1.1);
  ctx.stroke();
});
def('donut', [0, 0, 18, 14], (ctx, o) => {
  ellipse(ctx, 0, 2, 18, 12, '#e8a860', 2.5);
  ellipse(ctx, 0, 0, 16, 10, o.colour || '#ff7ab6', 2);
  ellipse(ctx, 0, 1, 5, 3, '#fff6e0', 2);
  const sp = ['#ffe14d', '#2fb5e8', '#ffffff', '#7cd34a'];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU;
    line(ctx, Math.cos(a) * 10, Math.sin(a) * 6, Math.cos(a) * 10 + 3, Math.sin(a) * 6 + 1, sp[k % 4], 2);
  }
});
def('pizza', [0, 0, 18, 20], (ctx) => {
  poly(ctx, [[-16, -16], [16, -16], [0, 20]], '#ffd23a', 2.5);
  rrect(ctx, -18, -20, 36, 7, 3, '#d2903a', 2);
  for (const [x, y] of [[-6, -8], [5, -6], [0, 4]]) circle(ctx, x, y, 3.5, '#e8463c', 1.5);
});
def('hotdog', [0, 0, 22, 10], (ctx) => {
  ellipse(ctx, 0, 2, 20, 8, '#e8a860', 2.5);
  ellipse(ctx, 0, -1, 22, 5, '#d2462a', 2);
  curve(ctx, -16, -2, -6, 3, 0, -2, '#ffd23a', 2);
  curve(ctx, 0, -2, 8, 3, 16, -2, '#ffd23a', 2);
});
def('popcorn', [0, -2, 16, 22], (ctx) => {
  for (let k = -3; k <= 3; k++) circle(ctx, k * 4, -14 - (k % 2) * 4, 5, '#fff6c8', 1.5);
  poly(ctx, [[-14, -12], [14, -12], [10, 18], [-10, 18]], '#ffffff', 2.5);
  for (const x of [-6, 2]) poly(ctx, [[x - 1, -12], [x + 4, -12], [x + 3, 18], [x - 1, 18]], '#ff3d3d', 0);
  poly(ctx, [[-14, -12], [14, -12], [10, 18], [-10, 18]], 'rgba(0,0,0,0)', 2.5);
});
def('cupcake', [0, -2, 16, 20], (ctx, o) => {
  poly(ctx, [[-12, 0], [12, 0], [9, 16], [-9, 16]], '#2fb5e8', 2.5);
  circle(ctx, -6, -4, 8, o.colour || '#ff9ed2', 2);
  circle(ctx, 6, -4, 8, o.colour || '#ff9ed2', 2);
  circle(ctx, 0, -11, 8, o.colour || '#ff9ed2', 2);
  circle(ctx, 0, -20, 3.5, '#ff3d3d', 1.5);
});
def('trophy', [0, -2, 18, 22], (ctx) => {
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(-14, -10, 6, Math.PI * 0.5, Math.PI * 1.5);
  ctx.moveTo(14, -16);
  ctx.arc(14, -10, 6, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-14, -18);
  ctx.lineTo(14, -18);
  ctx.quadraticCurveTo(12, 4, 0, 6);
  ctx.quadraticCurveTo(-12, 4, -14, -18);
  fs(ctx, '#ffc93a', 2.5);
  rect(ctx, -3, 6, 6, 8, '#ffc93a', 2);
  rect(ctx, -11, 14, 22, 6, '#a8743f', 2);
  star(ctx, 0, -8, 5, '#ffffff', 5, 0.45, 1);
});
def('anchor', [0, 0, 18, 22], (ctx, o) => {
  const c = o.colour || '#3a3f55';
  circle(ctx, 0, -18, 5, 'rgba(0,0,0,0)', 3);
  line(ctx, 0, -13, 0, 18, INK, 7);
  line(ctx, 0, -13, 0, 18, c, 4);
  line(ctx, -9, -8, 9, -8, c, 4);
  ctx.lineWidth = 7;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(0, 4, 16, 0.3, Math.PI - 0.3);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.strokeStyle = c;
  ctx.stroke();
});
def('lifering', [0, 0, 20, 20], (ctx) => {
  ctx.lineWidth = 15;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 10;
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = i % 2 ? '#ffffff' : '#ff3d3d';
    ctx.beginPath();
    ctx.arc(0, 0, 14, (i / 4) * TAU, ((i + 1) / 4) * TAU);
    ctx.stroke();
  }
});
def('key', [0, 0, 20, 10], (ctx, o) => {
  circle(ctx, -12, 0, 8, o.colour || '#ffc93a', 2.5);
  circle(ctx, -12, 0, 3, '#ffffff', 1.5);
  rect(ctx, -4, -3, 24, 6, o.colour || '#ffc93a', 2);
  rect(ctx, 12, 3, 4, 6, o.colour || '#ffc93a', 1.5);
  rect(ctx, 6, 3, 3, 4, o.colour || '#ffc93a', 1.5);
});
def('trumpet', [0, 0, 24, 12], (ctx) => {
  line(ctx, -20, 0, 8, 0, INK, 7);
  line(ctx, -20, 0, 8, 0, '#ffc93a', 4);
  poly(ctx, [[8, -3], [22, -11], [22, 11], [8, 3]], '#ffc93a', 2.5);
  for (const x of [-8, -2, 4]) rect(ctx, x - 1.5, -9, 3, 8, '#ffc93a', 1.2);
  ellipse(ctx, -22, 0, 3, 4, '#ffc93a', 1.5);
});
def('maracas', [0, 0, 20, 20], (ctx) => {
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.rotate(s * 0.4);
    line(ctx, 0, 4, 0, 20, '#6e4426', 4);
    ellipse(ctx, 0, -6, 9, 12, s < 0 ? '#ff3d5a' : '#ffd23a', 2.5);
    line(ctx, -6, -6, 6, -6, s < 0 ? '#ffd23a' : '#3fae4a', 2.5);
    ctx.restore();
  }
});
def('guitar', [0, 0, 14, 30], (ctx) => {
  ctx.save();
  ctx.rotate(0.3);
  rect(ctx, -3, -32, 6, 26, '#6e4426', 2);
  rect(ctx, -5, -38, 10, 8, '#4a2c18', 2);
  ellipse(ctx, 0, 6, 12, 10, '#e8a040', 2.5);
  ellipse(ctx, 0, 18, 14, 11, '#e8a040', 2.5);
  ellipse(ctx, 0, 6, 12, 10, '#e8a040', 0);
  circle(ctx, 0, 8, 4, INK, 0);
  ctx.restore();
});
def('flower', [0, 0, 18, 18], (ctx, o, t) => {
  ctx.save();
  ctx.rotate(Math.sin(t * 1.2 + (o.phase || 0)) * 0.1);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    ellipse(ctx, Math.cos(a) * 10, Math.sin(a) * 10, 8, 6, o.colour || '#ff5ab8', 2, INK, a);
  }
  circle(ctx, 0, 0, 7, '#ffd23a', 2);
  ctx.restore();
});
def('butterfly', [0, 0, 18, 16], (ctx, o, t) => A.butterfly(ctx, { ...o, s: 1.5 }, t));
def('crab', [0, -4, 26, 16], (ctx, o, t) => A.crab(ctx, o, t));
def('parrot', [0, -8, 16, 26], (ctx, o, t) => A.parrot(ctx, o, t));
def('frog', [0, -10, 16, 12], (ctx, o, t) => A.frog(ctx, { ...o, phase: 99 }, 0));
def('fish', [0, 0, 26, 14], (ctx, o, t) => A.fish(ctx, o, t));
def('snail', [0, -10, 22, 14], (ctx, o) => {
  ctx.beginPath();
  ctx.moveTo(-20, 0);
  ctx.lineTo(18, 0);
  ctx.quadraticCurveTo(24, -2, 22, -10);
  ctx.lineTo(16, -8);
  ctx.closePath();
  fs(ctx, '#c8e08a', 2);
  line(ctx, 18, -10, 20, -22, INK, 1.5);
  line(ctx, 22, -10, 26, -20, INK, 1.5);
  circle(ctx, 20, -22, 2, INK, 0);
  circle(ctx, 26, -20, 2, INK, 0);
  circle(ctx, -2, -10, 12, o.colour || '#ff8a2a', 2.5);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let a = 0; a < 10; a += 0.3) ctx.lineTo(-2 + Math.cos(a) * a, -10 + Math.sin(a) * a);
  ctx.stroke();
});
def('snorkel', [0, 0, 22, 18], (ctx, o) => {
  rrect(ctx, -20, -10, 30, 20, 8, o.colour || '#ff8a2a', 2.5);
  rrect(ctx, -16, -6, 22, 12, 5, '#9ff7f2', 2);
  line(ctx, 14, 6, 14, -14, INK, 7);
  line(ctx, 14, 6, 14, -14, '#ffd23a', 4);
});
def('watch', [0, 0, 12, 22], (ctx, o) => {
  rrect(ctx, -6, -22, 12, 44, 4, o.colour || '#ff3d9a', 2);
  circle(ctx, 0, 0, 10, '#ffffff', 2.5);
  line(ctx, 0, 0, 0, -6, INK, 2);
  line(ctx, 0, 0, 4, 2, INK, 2);
});
def('tophat', [0, -4, 20, 18], (ctx, o) => {
  ellipse(ctx, 0, 10, 20, 5, o.colour || '#2a2a44', 2.5);
  rect(ctx, -12, -18, 24, 28, o.colour || '#2a2a44', 2.5);
  rect(ctx, -12, 2, 24, 5, '#ff3d5a', 1.5);
});
def('compass', [0, 0, 18, 18], (ctx) => {
  circle(ctx, 0, 0, 17, '#ffc93a', 2.5);
  circle(ctx, 0, 0, 12, '#ffffff', 2);
  poly(ctx, [[0, -11], [3, 0], [-3, 0]], '#ff3d3d', 1);
  poly(ctx, [[0, 11], [3, 0], [-3, 0]], '#3a3f55', 1);
});
def('glove', [0, 0, 18, 18], (ctx, o) => {
  ctx.save();
  ctx.rotate(-0.3);
  rrect(ctx, -12, -2, 24, 18, 6, o.colour || '#ff3d5a', 2.5);
  for (let k = 0; k < 4; k++) rrect(ctx, -12 + k * 6, -16, 6, 18, 3, o.colour || '#ff3d5a', 2);
  rrect(ctx, 10, 0, 10, 7, 3, o.colour || '#ff3d5a', 2);
  ctx.restore();
});
def('paintbrush', [0, 0, 8, 26], (ctx, o) => {
  rrect(ctx, -3, -26, 6, 30, 3, '#c98f4f', 2);
  rect(ctx, -5, 4, 10, 6, '#c9d0de', 1.5);
  poly(ctx, [[-5, 10], [5, 10], [3, 24], [-3, 24]], o.colour || '#ff3d9a', 2);
});
def('mango', [0, 0, 18, 14], (ctx) => {
  ctx.save();
  ctx.rotate(0.3);
  ellipse(ctx, 0, 0, 18, 13, lin(ctx, -18, 0, 18, 0, [[0, '#ff3d5a'], [0.5, '#ff8a2a'], [1, '#ffd23a']]), 2.5);
  ellipse(ctx, 14, -12, 6, 3, '#3fae4a', 1.5, INK, -0.5);
  ctx.restore();
});
def('carrot', [0, 0, 10, 24], (ctx) => {
  for (const a of [-0.5, 0, 0.5]) ellipse(ctx, Math.sin(a) * 6, -22, 3, 8, '#3fae4a', 1.5, INK, a);
  poly(ctx, [[-8, -14], [8, -14], [0, 24]], '#ff8a2a', 2.5);
  line(ctx, -3, -6, 2, -6, 'rgba(22,11,51,0.4)', 1.5);
  line(ctx, -2, 4, 2, 4, 'rgba(22,11,51,0.4)', 1.5);
});
def('cheese', [0, 0, 20, 14], (ctx) => {
  poly(ctx, [[-20, 12], [20, 12], [20, -4], [-20, -12]], '#ffd23a', 2.5);
  for (const [x, y, r] of [[-8, 2, 3.5], [6, 6, 2.5], [10, -2, 2]]) circle(ctx, x, y, r, '#e8b020', 0);
});
def('ticket', [0, 0, 22, 12], (ctx, o) => {
  ctx.save();
  ctx.rotate(-0.15);
  rrect(ctx, -22, -12, 44, 24, 3, o.colour || '#ff3d5a', 2.5);
  ctx.setLineDash([3, 3]);
  line(ctx, 10, -10, 10, 10, '#ffffff', 2);
  ctx.setLineDash([]);
  star(ctx, -4, 0, 6, '#ffe14d', 5, 0.45, 1.2);
  ctx.restore();
});
def('cottoncandy', [0, -6, 16, 26], (ctx) => {
  line(ctx, 0, 4, 0, 22, '#ffffff', 4);
  line(ctx, 0, 4, 0, 22, INK, 1);
  circle(ctx, -6, -10, 10, '#ff9ed2', 2);
  circle(ctx, 6, -12, 10, '#ff9ed2', 2);
  circle(ctx, 0, -20, 10, '#ffb8e0', 2);
});
def('golfball', [0, 0, 11, 11], (ctx) => {
  circle(ctx, 0, 0, 10, '#ffffff', 2.5);
  for (const [x, y] of [[-3, -3], [3, -2], [0, 3], [-4, 3], [4, 4]]) circle(ctx, x, y, 1.3, 'rgba(22,11,51,0.3)', 0);
});
def('flag', [0, 0, 16, 28], (ctx, o, t) => {
  line(ctx, -8, 28, -8, -26, '#ffffff', 4);
  line(ctx, -8, 28, -8, -26, INK, 1.2);
  const f = Math.sin(t * 4) * 3;
  ctx.beginPath();
  ctx.moveTo(-8, -26);
  ctx.quadraticCurveTo(4, -24 + f, 16, -18);
  ctx.quadraticCurveTo(4, -12 - f, -8, -10);
  fs(ctx, o.colour || '#ff3d5a', 2);
});
def('dino', [0, -10, 24, 20], (ctx, o) => {
  // a little toy dinosaur, orange so he is never mistaken for Iggy
  const c = o.colour || '#ff8a2a';
  curve(ctx, -10, -6, -24, -4, -28, 4, c, 6);
  ellipse(ctx, 0, -8, 14, 10, c, 2.5);
  limb(ctx, [[8, -14], [14, -26]], c, 8);
  ellipse(ctx, 18, -30, 9, 7, c, 2.5);
  circle(ctx, 20, -32, 1.8, INK, 0);
  for (const lx of [-6, 6]) limb(ctx, [[lx, -2], [lx, 6]], c, 5);
  for (let k = 0; k < 4; k++) poly(ctx, [[-10 + k * 6, -16], [-7 + k * 6, -22], [-4 + k * 6, -16]], '#ffd23a', 1.2);
});

export const PROPS = P;

// Draws a prop by name; unknown names draw a pink square so they are easy to spot.
export function drawProp(ctx, name, o = {}, t = 0, extra = null) {
  const p = (extra && extra[name]) || P[name];
  if (!p) {
    rect(ctx, -15, -15, 30, 30, '#ff00ff', 2);
    return;
  }
  p.draw(ctx, o, t);
}

export function propBox(name, extra = null) {
  const p = (extra && extra[name]) || P[name];
  return p ? p.box : [0, 0, 15, 15];
}
