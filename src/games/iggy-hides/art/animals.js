// Animals. Each draws at the origin (feet on y = 0 for walkers, the middle for swimmers and
// fliers), facing right unless o.flip, with small animations driven by t.
import { TAU, INK, circle, ellipse, poly, rect, rrect, limb, fs, line, curve, shadow, star } from './kit.js';

const eye = (ctx, x, y, r = 3, blink = false) => {
  if (blink) {
    line(ctx, x - r, y, x + r, y, INK, 2);
    return;
  }
  circle(ctx, x, y, r, '#ffffff', 1.5);
  circle(ctx, x + r * 0.3, y, r * 0.55, INK, 0);
};
const blinks = (t, p = 0) => ((t + p) % 3.3) < 0.12;
function begin(ctx, o) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (o.flip) ctx.scale(-1, 1);
  if (o.s) ctx.scale(o.s, o.s);
}

export function dog(ctx, o = {}, t = 0) {
  const c = o.colour || '#c98f4f';
  const p = o.phase || 0;
  begin(ctx, o);
  if (o.pose === 'run') {
    const k = Math.sin(t * 14 + p);
    ctx.translate(0, -Math.abs(k) * 4);
    limb(ctx, [[-14, -14], [-22 - k * 6, -2]], c, 6);
    limb(ctx, [[14, -14], [22 + k * 6, -2]], c, 6);
    limb(ctx, [[-20, -24], [-32, -34 - k * 4]], c, 5);
    ellipse(ctx, 0, -20, 22, 11, c, 2.5);
  } else if (o.pose === 'sit') {
    limb(ctx, [[-14, -10], [-26, -18 + Math.sin(t * 8 + p) * 5]], c, 5);
    ellipse(ctx, -4, -16, 16, 16, c, 2.5);
    limb(ctx, [[6, -14], [8, -2]], c, 6);
  } else {
    const wag = Math.sin(t * 10 + p) * 6;
    limb(ctx, [[-20, -24], [-30, -36 + wag]], c, 5);
    for (const lx of [-14, -6, 10, 16]) limb(ctx, [[lx, -16], [lx, -2]], c, 6);
    ellipse(ctx, 0, -20, 22, 11, c, 2.5);
  }
  if (o.spot) ellipse(ctx, -6, -22, 7, 5, o.spot, 0);
  const hx = o.pose === 'sit' ? 8 : 20;
  const hy = o.pose === 'sit' ? -36 : -32;
  ellipse(ctx, hx, hy, 12, 10, c, 2.5);
  ellipse(ctx, hx + 11, hy + 3, 7, 5, c, 2.5);
  circle(ctx, hx + 17, hy + 1, 2.6, INK, 0);
  ellipse(ctx, hx - 6, hy + 2, 5, 9, o.ear || '#7a4a22', 2, INK, 0.3);
  eye(ctx, hx + 4, hy - 3, 2.6, blinks(t, p));
  if (o.tongue) ellipse(ctx, hx + 12, hy + 10, 3, 5, '#ff6a8a', 1.5);
  if (o.collar) line(ctx, hx - 6, hy + 8, hx + 4, hy + 10, o.collar, 3.5);
  ctx.restore();
}

export function cat(ctx, o = {}, t = 0) {
  const c = o.colour || '#ff9a3c';
  begin(ctx, o);
  curve(ctx, -14, -8, -34, -20, -26, -38 + Math.sin(t * 2 + (o.phase || 0)) * 5, INK, 7);
  curve(ctx, -14, -8, -34, -20, -26, -38 + Math.sin(t * 2 + (o.phase || 0)) * 5, c, 4);
  ellipse(ctx, -2, -14, 16, 14, c, 2.5);
  circle(ctx, 8, -32, 11, c, 2.5);
  poly(ctx, [[0, -38], [2, -50], [8, -41]], c, 2);
  poly(ctx, [[10, -41], [16, -50], [17, -37]], c, 2);
  eye(ctx, 5, -33, 2.4, blinks(t, o.phase));
  eye(ctx, 13, -33, 2.4, blinks(t, o.phase));
  circle(ctx, 9, -28, 1.6, '#ff6a8a', 0);
  if (o.stripes) for (let k = 0; k < 3; k++) line(ctx, -10 + k * 6, -26, -8 + k * 6, -18, o.stripes, 2.5);
  ctx.restore();
}

export function gull(ctx, o = {}, t = 0) {
  begin(ctx, o);
  const p = o.phase || 0;
  if (o.pose === 'fly') {
    const f = Math.sin(t * 9 + p);
    poly(ctx, [[-4, 0], [-26, -10 - f * 12], [-12, 2]], '#ffffff', 2);
    poly(ctx, [[4, 0], [26, -10 - f * 12], [12, 2]], '#ffffff', 2);
    ellipse(ctx, 0, 2, 12, 6, '#ffffff', 2);
    circle(ctx, 11, -1, 5, '#ffffff', 2);
    poly(ctx, [[15, -1], [22, 1], [15, 2]], '#ffb020', 1.5);
    circle(ctx, 12, -2, 1.3, INK, 0);
    if (o.item === 'fries') {
      for (let k = -1; k <= 1; k++) rect(ctx, 20 + k * 3, -2 + Math.abs(k), 2.5, 11, '#ffd23a', 1);
    }
    ctx.restore();
    return;
  }
  line(ctx, -3, -10, -4, 0, '#ffb020', 2.5);
  line(ctx, 4, -10, 5, 0, '#ffb020', 2.5);
  ellipse(ctx, 0, -18, 14, 9, '#ffffff', 2.5);
  ellipse(ctx, -6, -19, 10, 5, '#b8c4d8', 2, INK, -0.15);
  poly(ctx, [[-12, -18], [-22, -22], [-14, -14]], '#6a7490', 2);
  const peck = o.pose === 'peck' ? Math.max(0, Math.sin(t * 5 + p)) * 8 : 0;
  circle(ctx, 10, -28 + peck, 7, '#ffffff', 2.5);
  poly(ctx, [[15, -29 + peck], [25, -26 + peck], [15, -25 + peck]], '#ffb020', 1.5);
  eye(ctx, 11, -30 + peck, 1.8, blinks(t, p));
  ctx.restore();
}

export function pelican(ctx, o = {}, t = 0) {
  begin(ctx, o);
  line(ctx, -4, -14, -5, 0, '#ff9a3c', 3);
  line(ctx, 5, -14, 6, 0, '#ff9a3c', 3);
  ellipse(ctx, 0, -28, 18, 16, '#9aa4b8', 2.5);
  ellipse(ctx, -6, -28, 12, 10, '#7a849a', 2, INK, -0.3);
  limb(ctx, [[8, -38], [12, -54]], '#ffffff', 7);
  circle(ctx, 14, -60, 8, '#ffffff', 2.5);
  circle(ctx, 12, -66, 3, '#ffe14d', 0);
  const gulp = Math.max(0, Math.sin(t * 1.3 + (o.phase || 0))) * 3;
  poly(ctx, [[18, -63], [50, -56], [20, -54]], '#ffb020', 2);
  ctx.beginPath();
  ctx.moveTo(20, -55);
  ctx.quadraticCurveTo(34, -42 + gulp, 48, -55);
  fs(ctx, '#ffcf7a', 2);
  eye(ctx, 15, -62, 2, blinks(t, o.phase));
  ctx.restore();
}

export function parrot(ctx, o = {}, t = 0) {
  const c = o.colour || '#ff3d3d';
  const w = o.wing || '#2f7bff';
  begin(ctx, o);
  const bob = Math.sin(t * 3 + (o.phase || 0)) * 1.5;
  ctx.translate(0, bob);
  poly(ctx, [[-4, -8], [-10, 26], [2, 22], [4, -8]], o.tail || w, 2);
  ellipse(ctx, 0, -16, 10, 15, c, 2.5);
  ellipse(ctx, -3, -14, 7, 12, w, 2, INK, 0.2);
  circle(ctx, 3, -32, 9, c, 2.5);
  ellipse(ctx, 6, -32, 4, 4, '#ffffff', 0);
  circle(ctx, 7, -33, 1.7, INK, 0);
  ctx.beginPath();
  ctx.moveTo(10, -36);
  ctx.quadraticCurveTo(20, -32, 12, -24);
  ctx.lineTo(10, -28);
  ctx.closePath();
  fs(ctx, '#ffe9b0', 2);
  line(ctx, -2, -2, -3, 4, INK, 2);
  line(ctx, 3, -2, 4, 4, INK, 2);
  ctx.restore();
}

export function flamingo(ctx, o = {}, t = 0) {
  const c = o.colour || '#ff7ab6';
  begin(ctx, o);
  const p = o.phase || 0;
  line(ctx, 0, -50, 2, 0, '#e8508a', 3);
  if (o.oneLeg) {
    line(ctx, 0, -50, 10, -40, '#e8508a', 3);
    line(ctx, 10, -40, 1, -32, '#e8508a', 3);
  } else line(ctx, 6, -50, 8, 0, '#e8508a', 3);
  ellipse(ctx, 2, -58, 20, 13, c, 2.5);
  ellipse(ctx, -2, -58, 12, 8, '#ff5a9e', 0);
  const dip = o.feed ? (Math.sin(t * 1.2 + p) + 1) * 0.5 : 0;
  const nx = 22;
  const ny = -72 + dip * 60;
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(16, -60);
  ctx.quadraticCurveTo(4, -90 + dip * 30, nx, ny - 20 + dip * 10);
  ctx.stroke();
  ctx.strokeStyle = c;
  ctx.lineWidth = 5;
  ctx.stroke();
  circle(ctx, nx, ny - 20 + dip * 10, 6.5, c, 2.5);
  poly(ctx, [[nx + 4, ny - 22 + dip * 10], [nx + 14, ny - 14 + dip * 10], [nx + 4, ny - 16 + dip * 10]], '#2a1a2a', 1.5);
  circle(ctx, nx + 1, ny - 22 + dip * 10, 1.5, INK, 0);
  ctx.restore();
}

export function crab(ctx, o = {}, t = 0) {
  const c = o.colour || '#ff4a3a';
  begin(ctx, o);
  const p = o.phase || 0;
  const k = Math.sin(t * 4 + p);
  for (const sgn of [-1, 1]) {
    for (let i = 0; i < 3; i++) line(ctx, sgn * 8, 2 + i * 3, sgn * (20 + i * 2), 8 + i * 4, INK, 2.5);
    limb(ctx, [[sgn * 12, -2], [sgn * 20, -10 - k * 2]], c, 4, 1.5);
    ctx.save();
    ctx.translate(sgn * 22, -14 - k * 2);
    ctx.rotate(sgn * 0.3);
    ellipse(ctx, 0, 0, 7, 6, c, 2);
    poly(ctx, [[sgn * 1, -2], [sgn * 9, -8 - k * 2], [sgn * 4, 1]], '#fff3e0', 1.2);
    ctx.restore();
  }
  ellipse(ctx, 0, 0, 16, 10, c, 2.5);
  line(ctx, -4, -8, -5, -16, INK, 2);
  line(ctx, 4, -8, 5, -16, INK, 2);
  eye(ctx, -5, -17, 3, blinks(t, p));
  eye(ctx, 5, -17, 3, blinks(t, p));
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 1, 5, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.restore();
}

export function turtle(ctx, o = {}, t = 0) {
  const c = o.colour || '#3fae4a';
  const sh = o.shell || '#8a5a2c';
  begin(ctx, o);
  const p = o.phase || 0;
  if (o.swim) {
    const f = Math.sin(t * 2 + p);
    ellipse(ctx, -12, 12, 12, 5, c, 2, INK, 0.5 + f * 0.3);
    ellipse(ctx, 14, 14, 13, 6, c, 2, INK, -0.4 - f * 0.3);
    ellipse(ctx, -14, -12, 10, 5, c, 2, INK, -0.5);
    ellipse(ctx, 16, -10, 12, 6, c, 2, INK, 0.4 + f * 0.3);
  } else {
    for (const lx of [-12, 12]) ellipse(ctx, lx, -2, 6, 5, c, 2);
  }
  ctx.beginPath();
  ctx.ellipse(0, o.swim ? 0 : -10, 22, o.swim ? 16 : 13, 0, o.swim ? 0 : Math.PI, o.swim ? TAU : TAU);
  if (!o.swim) ctx.closePath();
  fs(ctx, sh, 2.5);
  ctx.strokeStyle = 'rgba(22,11,51,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, o.swim ? -10 : -20);
  ctx.lineTo(-8, o.swim ? 10 : -10);
  ctx.moveTo(8, o.swim ? -10 : -20);
  ctx.lineTo(8, o.swim ? 10 : -10);
  ctx.stroke();
  ellipse(ctx, 26, o.swim ? 0 : -10, 9, 7, c, 2.5);
  eye(ctx, 28, o.swim ? -2 : -12, 2, blinks(t, p));
  ctx.restore();
}

export function gator(ctx, o = {}, t = 0) {
  const c = o.colour || '#4f8a3a';
  begin(ctx, o);
  const p = o.phase || 0;
  const open = o.open ? (Math.sin(t * 1.5 + p) + 1) * 0.12 + 0.1 : 0;
  // tail
  ctx.beginPath();
  ctx.moveTo(-30, -8);
  ctx.quadraticCurveTo(-80, -6, -110, 2);
  ctx.quadraticCurveTo(-80, 6, -30, 6);
  fs(ctx, c, 2.5);
  ellipse(ctx, -10, -4, 42, 14, c, 2.5);
  for (let k = 0; k < 8; k++) poly(ctx, [[-60 + k * 10, -8 + Math.abs(k - 4) * 0], [-56 + k * 10, -16], [-52 + k * 10, -8]], '#3a6a2a', 1.5);
  for (const lx of [-30, 14]) limb(ctx, [[lx, 4], [lx + 6, 10]], c, 7);
  // snout: upper jaw tilts open
  ctx.save();
  ctx.translate(26, -6);
  ctx.rotate(-open);
  rrect(ctx, 0, -8, 46, 12, 6, c, 2.5);
  for (let k = 0; k < 5; k++) poly(ctx, [[6 + k * 8, 4], [9 + k * 8, 9], [12 + k * 8, 4]], '#ffffff', 1);
  circle(ctx, 42, -5, 1.8, INK, 0);
  ctx.restore();
  rrect(ctx, 26, -2, 44, 9, 4, '#7fb85a', 2.5);
  circle(ctx, 22, -16, 7, c, 2.5);
  eye(ctx, 23, -18, 3.4, blinks(t, p));
  ctx.restore();
}

export function monkey(ctx, o = {}, t = 0) {
  const c = o.colour || '#8a5a2c';
  begin(ctx, o);
  const p = o.phase || 0;
  if (o.hang) {
    // hanging by one arm from y = 0, swinging
    ctx.rotate(Math.sin(t * 2 + p) * 0.25);
    limb(ctx, [[0, 0], [2, 26]], c, 6);
    curve(ctx, -4, 50, -26, 60, -20, 76, c, 5);
    ellipse(ctx, 0, 46, 13, 17, c, 2.5);
    ellipse(ctx, 0, 49, 8, 11, '#e8c098', 0);
    limb(ctx, [[-8, 54], [-14, 72]], c, 6);
    limb(ctx, [[8, 54], [14, 72]], c, 6);
    limb(ctx, [[-10, 38], [-22, 50]], c, 5);
    ctx.translate(0, 18);
  } else {
    curve(ctx, -10, -8, -34, -10, -30, -34 + Math.sin(t * 2 + p) * 4, c, 5);
    ellipse(ctx, 0, -18, 13, 16, c, 2.5);
    ellipse(ctx, 0, -15, 8, 10, '#e8c098', 0);
    limb(ctx, [[-8, -6], [-14, 0]], c, 6);
    limb(ctx, [[8, -6], [14, 0]], c, 6);
    limb(ctx, [[-10, -24], [-18, -10]], c, 5);
    limb(ctx, [[10, -24], [20, -36 + Math.sin(t * 5 + p) * 4]], c, 5);
    ctx.translate(0, -46);
  }
  circle(ctx, -13, 0, 5, '#e8c098', 2);
  circle(ctx, 13, 0, 5, '#e8c098', 2);
  circle(ctx, 0, 0, 12, c, 2.5);
  ellipse(ctx, 0, 3, 9, 7, '#e8c098', 0);
  eye(ctx, -4, -2, 2.2, blinks(t, p));
  eye(ctx, 4, -2, 2.2, blinks(t, p));
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 4, 4, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.restore();
}

export function heron(ctx, o = {}, t = 0) {
  const c = o.colour || '#ffffff';
  begin(ctx, o);
  line(ctx, -2, -44, -3, 0, '#3a3f55', 2.5);
  line(ctx, 4, -44, 6, 0, '#3a3f55', 2.5);
  ellipse(ctx, 0, -52, 18, 11, c, 2.5, INK, -0.3);
  const stab = Math.max(0, Math.sin(t * 0.9 + (o.phase || 0)) - 0.8) * 30;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(10, -58);
  ctx.quadraticCurveTo(20, -74, 12, -84 + stab);
  ctx.stroke();
  ctx.strokeStyle = c;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  circle(ctx, 14, -88 + stab, 6, c, 2);
  poly(ctx, [[18, -90 + stab], [36, -86 + stab], [18, -85 + stab]], '#ffb020', 1.5);
  circle(ctx, 15, -90 + stab, 1.4, INK, 0);
  ctx.restore();
}

export function frog(ctx, o = {}, t = 0) {
  const c = o.colour || '#5fbf3a';
  begin(ctx, o);
  const hop = Math.max(0, Math.sin(t * 2 + (o.phase || 0)) - 0.85) * 40;
  ctx.translate(0, -hop);
  ellipse(ctx, -10, -3, 8, 4, c, 2);
  ellipse(ctx, 10, -3, 8, 4, c, 2);
  ellipse(ctx, 0, -9, 13, 9, c, 2.5);
  circle(ctx, -6, -17, 4.5, c, 2);
  circle(ctx, 6, -17, 4.5, c, 2);
  circle(ctx, -6, -17, 2, INK, 0);
  circle(ctx, 6, -17, 2, INK, 0);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, -9, 6, 0.3, Math.PI - 0.3);
  ctx.stroke();
  ctx.restore();
}

export function duck(ctx, o = {}, t = 0) {
  // a duck on the water, the waterline at y = 0
  const c = o.colour || '#ffffff';
  begin(ctx, o);
  ctx.translate(0, Math.sin(t * 2 + (o.phase || 0)) * 1.2);
  ctx.beginPath();
  ctx.moveTo(-16, -6);
  ctx.quadraticCurveTo(-20, -16, -12, -14);
  ctx.quadraticCurveTo(0, -18, 12, -10);
  ctx.quadraticCurveTo(14, 2, 0, 2);
  ctx.quadraticCurveTo(-14, 2, -16, -6);
  fs(ctx, c, 2.5);
  circle(ctx, 9, -20, 7, o.head || c, 2.5);
  poly(ctx, [[14, -21], [22, -18], [14, -16]], '#ffb020', 1.5);
  circle(ctx, 10, -22, 1.5, INK, 0);
  ctx.restore();
}

export function fish(ctx, o = {}, t = 0) {
  const body = o.colour || '#ffb020';
  const fin = o.fin || '#ff6a2a';
  begin(ctx, o);
  const wig = Math.sin(t * 6 + (o.phase || 0)) * 0.15;
  ctx.save();
  ctx.translate(-14, 0);
  ctx.rotate(wig);
  poly(ctx, [[0, 0], [-12, -11], [-10, 0], [-12, 11]], fin, 2.5);
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 11, 0, 0, TAU);
  fs(ctx, body, 2.5);
  if (o.stripe) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 11, 0, 0, TAU);
    ctx.clip();
    ctx.fillStyle = o.stripe;
    ctx.fillRect(-4, -12, 6, 24);
    ctx.fillRect(-14, -12, 4, 24);
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 11, 0, 0, TAU);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  poly(ctx, [[-2, -10], [6, -17], [10, -9]], fin, 2);
  eye(ctx, 9, -2, 3.2, false);
  ctx.restore();
}

export function butterfly(ctx, o = {}, t = 0) {
  begin(ctx, o);
  // wings flap but never fold flat, so a still butterfly still reads
  const f = 0.45 + 0.55 * Math.abs(Math.cos(t * 10 + (o.phase || 0)));
  const c = o.colour || '#ff8a2a';
  ellipse(ctx, -7 * f - 2, -4, 8 * f + 1, 8, c, 1.5);
  ellipse(ctx, 7 * f + 2, -4, 8 * f + 1, 8, c, 1.5);
  ellipse(ctx, -5 * f - 2, 5, 5 * f + 1, 5, c, 1.5);
  ellipse(ctx, 5 * f + 2, 5, 5 * f + 1, 5, c, 1.5);
  line(ctx, 0, -8, 0, 8, INK, 2.5);
  ctx.restore();
}

export function lizard(ctx, o = {}, t = 0) {
  // a little brown anole (not Iggy): skinny, no ring, a red throat fan that pops in and out
  const c = o.colour || '#a8743f';
  begin(ctx, o);
  curve(ctx, -10, 0, -30, 4, -40, -4, c, 3);
  ellipse(ctx, 0, 0, 12, 4, c, 1.5);
  ellipse(ctx, 14, -1, 6, 3.5, c, 1.5);
  const fan = Math.max(0, Math.sin(t * 2 + (o.phase || 0)));
  if (fan > 0.3) circle(ctx, 12, 4, 3 * fan, '#ff3d3d', 1);
  for (const lx of [-6, 6]) {
    line(ctx, lx, 2, lx - 3, 7, c, 2);
    line(ctx, lx, -2, lx - 3, -7, c, 2);
  }
  circle(ctx, 16, -2, 1, INK, 0);
  ctx.restore();
}

export function snake(ctx, o = {}, t = 0) {
  const c = o.colour || '#ffb020';
  begin(ctx, o);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 11;
  const pts = [];
  for (let k = 0; k <= 20; k++) {
    const a = (k / 20) * Math.PI * 3;
    pts.push([-40 + k * 4, Math.sin(a + t * 2 + (o.phase || 0)) * 6]);
  }
  limb(ctx, pts, c, 7);
  ellipse(ctx, 44, pts[20][1], 9, 7, c, 2.5);
  circle(ctx, 46, pts[20][1] - 2, 1.8, INK, 0);
  if (Math.sin(t * 3) > 0.5) line(ctx, 52, pts[20][1] + 1, 60, pts[20][1] + 2, '#ff3d3d', 1.5);
  ctx.restore();
}

export function raccoon(ctx, o = {}, t = 0) {
  begin(ctx, o);
  curve(ctx, -14, -10, -34, -14, -36, -30, INK, 12);
  ctx.setLineDash([5, 5]);
  curve(ctx, -14, -10, -34, -14, -36, -30, '#9aa4b8', 8);
  ctx.setLineDash([]);
  ellipse(ctx, 0, -14, 18, 14, '#9aa4b8', 2.5);
  circle(ctx, 14, -30, 12, '#9aa4b8', 2.5);
  poly(ctx, [[6, -40], [8, -48], [13, -41]], '#9aa4b8', 2);
  poly(ctx, [[16, -41], [21, -48], [23, -38]], '#9aa4b8', 2);
  ellipse(ctx, 14, -31, 11, 4.5, '#3a3f55', 0);
  circle(ctx, 10, -31, 2, '#ffffff', 0);
  circle(ctx, 18, -31, 2, '#ffffff', 0);
  circle(ctx, 25, -27, 2.5, INK, 0);
  ctx.restore();
}

export function toucan(ctx, o = {}, t = 0) {
  begin(ctx, o);
  ctx.translate(0, Math.sin(t * 2 + (o.phase || 0)) * 1.2);
  poly(ctx, [[-4, -6], [-8, 18], [4, 16]], '#222233', 2);
  ellipse(ctx, 0, -16, 10, 15, '#222233', 2.5);
  ellipse(ctx, 3, -24, 6, 6, '#ffe14d', 0);
  circle(ctx, 2, -30, 8, '#222233', 2.5);
  ctx.beginPath();
  ctx.moveTo(7, -36);
  ctx.quadraticCurveTo(34, -36, 34, -26);
  ctx.quadraticCurveTo(20, -24, 7, -26);
  ctx.closePath();
  fs(ctx, '#ff8a2a', 2);
  line(ctx, 12, -31, 30, -30, '#ff3d3d', 2);
  eye(ctx, 3, -32, 2.2, false);
  ctx.restore();
}

export function sloth(ctx, o = {}, t = 0) {
  // hanging under a branch at y = 0
  begin(ctx, o);
  ctx.rotate(Math.sin(t * 0.8 + (o.phase || 0)) * 0.05);
  const c = o.colour || '#a88a6a';
  limb(ctx, [[-14, 0], [-12, 22]], c, 7);
  limb(ctx, [[14, 0], [12, 22]], c, 7);
  limb(ctx, [[-22, 0], [-16, 30]], c, 7);
  limb(ctx, [[22, 0], [16, 30]], c, 7);
  ellipse(ctx, 0, 30, 24, 15, c, 2.5);
  circle(ctx, 22, 36, 11, c, 2.5);
  ellipse(ctx, 23, 37, 8, 7, '#f2e0c0', 0);
  ellipse(ctx, 19, 36, 3.5, 2.5, '#4a3a2a', 0);
  ellipse(ctx, 27, 36, 3.5, 2.5, '#4a3a2a', 0);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(23, 39, 3, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.restore();
}

export function manatee(ctx, o = {}, t = 0) {
  begin(ctx, o);
  ctx.rotate(Math.sin(t * 0.7 + (o.phase || 0)) * 0.05);
  ellipse(ctx, -60, 0, 18, 22, '#8a96aa', 2.5);
  ellipse(ctx, -10, 0, 55, 25, '#9aa6ba', 2.5);
  ellipse(ctx, 50, 2, 20, 18, '#9aa6ba', 2.5);
  ellipse(ctx, 62, 8, 10, 8, '#b5c0d0', 2);
  ellipse(ctx, 10, 20, 12, 6, '#8a96aa', 2, INK, 0.5);
  circle(ctx, 54, -4, 2, INK, 0);
  ctx.restore();
}

export function dolphin(ctx, o = {}, t = 0) {
  begin(ctx, o);
  ctx.beginPath();
  ctx.moveTo(-40, 6);
  ctx.quadraticCurveTo(-10, -26, 30, -8);
  ctx.quadraticCurveTo(44, -2, 48, 2);
  ctx.quadraticCurveTo(36, 4, 28, 6);
  ctx.quadraticCurveTo(0, 14, -40, 6);
  fs(ctx, '#6a9ad8', 2.5);
  poly(ctx, [[-6, -12], [2, -26], [8, -12]], '#6a9ad8', 2);
  poly(ctx, [[-40, 6], [-54, -6], [-50, 6], [-54, 16]], '#6a9ad8', 2);
  circle(ctx, 28, -6, 2, INK, 0);
  ctx.restore();
}

export function jelly(ctx, o = {}, t = 0) {
  const c = o.colour || '#ff9ed2';
  begin(ctx, o);
  const p = (Math.sin(t * 2 + (o.phase || 0)) + 1) / 2;
  for (let k = -2; k <= 2; k++) curve(ctx, k * 6, 0, k * 8 + Math.sin(t * 3 + k) * 5, 18, k * 6, 34 + p * 6, c, 2.5);
  ctx.beginPath();
  ctx.ellipse(0, 0, 18 - p * 3, 15 + p * 2, 0, Math.PI, 0);
  ctx.closePath();
  fs(ctx, c, 2.5);
  eye(ctx, -5, -5, 2, false);
  eye(ctx, 5, -5, 2, false);
  ctx.restore();
}

export function octopus(ctx, o = {}, t = 0) {
  const c = o.colour || '#ff6a4a';
  begin(ctx, o);
  for (let k = 0; k < 6; k++) {
    const a = -0.3 + k * 0.32;
    const sx = (k - 2.5) * 8;
    curve(ctx, sx, 10, sx * 2 + Math.sin(t * 3 + k) * 8, 30, sx * 2.6 + Math.cos(t * 2 + k) * 6, 44 + a, INK, 9);
    curve(ctx, sx, 10, sx * 2 + Math.sin(t * 3 + k) * 8, 30, sx * 2.6 + Math.cos(t * 2 + k) * 6, 44 + a, c, 5.5);
  }
  ellipse(ctx, 0, -6, 24, 22, c, 2.5);
  eye(ctx, -8, -2, 4, blinks(t, o.phase));
  eye(ctx, 8, -2, 4, blinks(t, o.phase));
  ctx.restore();
}

export function shark(ctx, o = {}, t = 0) {
  begin(ctx, o);
  const s = Math.sin(t * 3 + (o.phase || 0)) * 0.12;
  ctx.save();
  ctx.translate(-50, 0);
  ctx.rotate(s);
  poly(ctx, [[0, 0], [-28, -24], [-20, 0], [-26, 18]], '#7a8aa8', 2.5);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-52, 0);
  ctx.quadraticCurveTo(-10, -26, 40, -8);
  ctx.quadraticCurveTo(60, 0, 40, 10);
  ctx.quadraticCurveTo(-10, 20, -52, 0);
  fs(ctx, '#8a9ab8', 2.5);
  ctx.beginPath();
  ctx.moveTo(20, 8);
  ctx.quadraticCurveTo(-10, 18, -40, 4);
  ctx.quadraticCurveTo(-10, 10, 20, 8);
  fs(ctx, '#e8eef8', 0);
  poly(ctx, [[-8, -14], [0, -40], [12, -12]], '#7a8aa8', 2.5);
  poly(ctx, [[0, 6], [-10, 26], [12, 10]], '#7a8aa8', 2);
  circle(ctx, 34, -4, 2.5, INK, 0);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(38, 6, 8, 0.4, 1.6);
  ctx.stroke();
  for (let k = 0; k < 3; k++) line(ctx, 18 + k * 4, -4, 17 + k * 4, 4, INK, 1.5);
  ctx.restore();
}

export function ray(ctx, o = {}, t = 0) {
  begin(ctx, o);
  const f = Math.sin(t * 2 + (o.phase || 0)) * 8;
  ctx.beginPath();
  ctx.moveTo(30, 0);
  ctx.quadraticCurveTo(0, -30 - f, -24, -36 - f);
  ctx.quadraticCurveTo(-14, -4, -30, 0);
  ctx.quadraticCurveTo(-14, 4, -24, 36 + f);
  ctx.quadraticCurveTo(0, 30 + f, 30, 0);
  fs(ctx, o.colour || '#5a6a8a', 2.5);
  curve(ctx, -30, 0, -60, 4, -76, -6, INK, 2.5);
  circle(ctx, 14, -6, 2, INK, 0);
  circle(ctx, 14, 6, 2, INK, 0);
  ctx.restore();
}

export function seahorse(ctx, o = {}, t = 0) {
  const c = o.colour || '#ffb020';
  begin(ctx, o);
  ctx.translate(0, Math.sin(t * 2 + (o.phase || 0)) * 3);
  curve(ctx, 0, 0, -4, 24, 6, 26, INK, 9);
  curve(ctx, 0, 0, -4, 24, 6, 26, c, 5);
  ellipse(ctx, 2, -6, 9, 14, c, 2.5);
  circle(ctx, 4, -22, 7, c, 2.5);
  rrect(ctx, 8, -24, 12, 6, 3, c, 2);
  eye(ctx, 5, -23, 2, false);
  ctx.restore();
}

export function starfishFace(ctx, o = {}, t = 0) {
  begin(ctx, o);
  ctx.rotate(Math.sin(t * 1.2 + (o.phase || 0)) * 0.1);
  star(ctx, 0, 0, 18, o.colour || '#ff8a4c', 5, 0.5, 2.5);
  circle(ctx, -4, -2, 1.8, INK, 0);
  circle(ctx, 4, -2, 1.8, INK, 0);
  ctx.restore();
}

export function giraffeHead(ctx, o = {}, t = 0) {
  // a long neck rising from y = 0, chewing
  begin(ctx, o);
  ctx.rotate(Math.sin(t * 0.7 + (o.phase || 0)) * 0.04);
  const c = '#ffc84a';
  rrect(ctx, -10, -150, 22, 152, 10, c, 2.5);
  for (let k = 0; k < 6; k++) ellipse(ctx, k % 2 ? 4 : -2, -130 + k * 22, 5, 6, '#b8742a', 0);
  ellipse(ctx, 14, -160, 26, 14, c, 2.5, INK, 0.3);
  ellipse(ctx, 34, -150, 10, 8, '#f2d29a', 2);
  line(ctx, -2, -168, -6, -184, INK, 3);
  line(ctx, 8, -170, 8, -186, INK, 3);
  circle(ctx, -6, -186, 3.5, '#b8742a', 1.5);
  circle(ctx, 8, -188, 3.5, '#b8742a', 1.5);
  ellipse(ctx, -12, -166, 8, 4, c, 2, INK, -0.4);
  eye(ctx, 12, -164, 3, blinks(t, o.phase));
  ctx.restore();
}

export function tiger(ctx, o = {}, t = 0) {
  // lounging, side on, feet on y = 0
  begin(ctx, o);
  const c = '#ff9a2a';
  curve(ctx, -44, -16, -70, -20, -66, -44 + Math.sin(t * 2) * 6, INK, 10);
  curve(ctx, -44, -16, -70, -20, -66, -44 + Math.sin(t * 2) * 6, c, 6);
  ellipse(ctx, -6, -16, 46, 17, c, 2.5);
  for (let k = 0; k < 6; k++) line(ctx, -36 + k * 12, -30, -32 + k * 12, -18, INK, 3);
  ellipse(ctx, 34, -4, 16, 5, c, 2.5);
  circle(ctx, 42, -30, 17, c, 2.5);
  circle(ctx, 32, -45, 5, c, 2);
  circle(ctx, 52, -45, 5, c, 2);
  ellipse(ctx, 46, -24, 9, 6, '#ffffff', 0);
  circle(ctx, 50, -27, 2.5, INK, 0);
  const yawn = ((t + (o.phase || 0)) % 7) < 1.2;
  eye(ctx, 37, -33, 2.5, yawn || blinks(t, o.phase));
  eye(ctx, 47, -33, 2.5, yawn || blinks(t, o.phase));
  if (yawn) ellipse(ctx, 47, -20, 5, 6, '#7a1a2a', 1.5);
  ctx.restore();
}

export function bee(ctx, o = {}, t = 0) {
  begin(ctx, o);
  const f = Math.abs(Math.sin(t * 30));
  ellipse(ctx, -2, -7, 5, 7 * f + 1, 'rgba(255,255,255,0.8)', 1.2);
  ellipse(ctx, 4, -7, 5, 7 * f + 1, 'rgba(255,255,255,0.8)', 1.2);
  ellipse(ctx, 0, 0, 9, 6, '#ffd23a', 1.8);
  line(ctx, -2, -5, -2, 5, INK, 2);
  line(ctx, 3, -5, 3, 5, INK, 2);
  ctx.restore();
}

export function goat(ctx, o = {}, t = 0) {
  begin(ctx, o);
  for (const lx of [-14, -6, 10, 16]) limb(ctx, [[lx, -18], [lx, -2]], '#f2f2f2', 5);
  ellipse(ctx, 0, -24, 22, 12, '#f2f2f2', 2.5);
  const chew = Math.sin(t * 8) * 1.5;
  ellipse(ctx, 24, -38, 9, 12, '#f2f2f2', 2.5, INK, 0.5);
  curve(ctx, 20, -48, 14, -60, 6, -56, '#a8743f', 3);
  ellipse(ctx, 30, -30 + chew, 4, 6, '#f2f2f2', 1.5);
  eye(ctx, 25, -42, 2, blinks(t, o.phase));
  ctx.restore();
}

export function chicken(ctx, o = {}, t = 0) {
  begin(ctx, o);
  const peck = Math.max(0, Math.sin(t * 4 + (o.phase || 0))) * 10;
  line(ctx, -2, -10, -4, 0, '#ffb347', 3);
  line(ctx, 6, -10, 8, 0, '#ffb347', 3);
  ellipse(ctx, 0, -20, 20, 15, o.colour || '#ffffff', 2.5);
  poly(ctx, [[-18, -24], [-28, -36], [-16, -30]], o.colour || '#ffffff', 2);
  circle(ctx, 16, -34 + peck, 9, o.colour || '#ffffff', 2.5);
  poly(ctx, [[24, -35 + peck], [32, -32 + peck], [24, -30 + peck]], '#ffd23a', 1.5);
  circle(ctx, 16, -44 + peck, 4, '#e8463c', 1.5);
  circle(ctx, 18, -36 + peck, 1.5, INK, 0);
  ctx.restore();
}

export { shadow };
