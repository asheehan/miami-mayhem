// Set pieces shared by several scenes: umbrellas, towels, chairs, coolers, boats, benches,
// bins, lamp posts, fences and stalls. Positions are world units; (x, y) is where the thing
// stands on the ground unless said otherwise.
import { TAU, INK, circle, ellipse, poly, rect, rrect, line, curve, fs, lin, shadow, awning } from './kit.js';

export function umbrella(ctx, x, y, h = 120, a = '#ff3d5a', b = '#ffffff', tilt = 0) {
  shadow(ctx, x + 10, y + 2, 70, 14, 0.18);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  line(ctx, 0, 0, 0, -h, INK, 6);
  line(ctx, 0, 0, 0, -h, '#ffffff', 3);
  const r = 78;
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI + (i / n) * Math.PI;
    const a1 = Math.PI + ((i + 1) / n) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(0, -h - 28);
    ctx.lineTo(Math.cos(a0) * r, -h + 4 + Math.sin(a0) * 6);
    ctx.quadraticCurveTo(Math.cos((a0 + a1) / 2) * r * 0.92, -h + 12, Math.cos(a1) * r, -h + 4 + Math.sin(a1) * 6);
    ctx.closePath();
    fs(ctx, i % 2 ? b : a, 2.5);
  }
  circle(ctx, 0, -h - 30, 4, a, 2);
  ctx.restore();
}

export function towel(ctx, x, y, w = 110, h = 44, a = '#2fb5e8', b = '#ffffff', rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.transform(1, 0, -0.35, 1, 0, 0);
  rrect(ctx, -w / 2, -h / 2, w, h, 4, a, 2.5);
  ctx.fillStyle = b;
  for (let k = 1; k < 5; k += 2) ctx.fillRect(-w / 2 + (w * k) / 5, -h / 2 + 2, w / 10, h - 4);
  ctx.restore();
}

export function lounger(ctx, x, y, c = '#ffffff', flip = false) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  line(ctx, -50, 0, -50, -14, INK, 3);
  line(ctx, 40, 0, 40, -14, INK, 3);
  poly(ctx, [[-56, -14], [30, -14], [56, -48], [50, -52], [26, -20], [-56, -20]], c, 2.5);
  for (let k = -48; k < 26; k += 10) line(ctx, k, -14, k, -20, 'rgba(22,11,51,0.3)', 1.5);
  ctx.restore();
}

export function cooler(ctx, x, y, c = '#2fb5e8', open = false) {
  shadow(ctx, x, y, 34, 7);
  rrect(ctx, x - 30, y - 38, 60, 38, 6, c, 2.5);
  rect(ctx, x - 30, y - 24, 60, 6, '#ffffff', 2);
  if (open) {
    poly(ctx, [[x - 32, y - 38], [x + 32, y - 38], [x + 28, y - 70], [x - 28, y - 70]], '#ffffff', 2.5);
  } else rrect(ctx, x - 32, y - 46, 64, 10, 4, '#ffffff', 2.5);
  rect(ctx, x - 8, y - 50, 16, 5, '#3a3f55', 1.5);
}

export function sandcastle(ctx, x, y, s = 1, flag = '#ff3d5a') {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const sand = '#f2c46a';
  const dark = '#d8a548';
  const tower = (tx, ty, w, h) => {
    rect(ctx, tx - w / 2, ty - h, w, h, sand, 2.5);
    for (let k = 0; k < 3; k++) rect(ctx, tx - w / 2 + k * (w / 3) + 1, ty - h - 9, w / 3 - 5, 9, sand, 2);
    rrect(ctx, tx - 6, ty - h * 0.6, 12, 16, 6, dark, 2);
  };
  ellipse(ctx, 0, 0, 110, 18, dark, 2.5);
  tower(-70, 0, 40, 70);
  tower(70, 0, 40, 70);
  rect(ctx, -50, -50, 100, 50, sand, 2.5);
  for (let k = 0; k < 5; k++) rect(ctx, -50 + k * 20 + 2, -59, 14, 9, sand, 2);
  rrect(ctx, -14, -34, 28, 34, 14, dark, 2.5);
  tower(0, -50, 44, 56);
  line(ctx, 0, -115, 0, -150, INK, 2.5);
  poly(ctx, [[0, -150], [26, -142], [0, -134]], flag, 2);
  for (let k = 0; k < 7; k++) circle(ctx, -90 + k * 30, 8, 3, '#ffffff', 1);
  ctx.restore();
}

export function surfboard(ctx, x, y, len = 120, c = '#ff8a2a', rot = 0, stripe = '#ffffff') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ellipse(ctx, 0, 0, 16, len / 2, c, 2.5);
  line(ctx, 0, -len / 2 + 8, 0, len / 2 - 8, stripe, 3);
  ctx.restore();
}

export function bench(ctx, x, y, w = 120, c = '#c98f4f') {
  line(ctx, x - w / 2 + 8, y, x - w / 2 + 8, y - 24, INK, 4);
  line(ctx, x + w / 2 - 8, y, x + w / 2 - 8, y - 24, INK, 4);
  rrect(ctx, x - w / 2, y - 28, w, 8, 3, c, 2.5);
  rrect(ctx, x - w / 2, y - 58, w, 8, 3, c, 2.5);
  rrect(ctx, x - w / 2, y - 44, w, 8, 3, c, 2.5);
}

export function bin(ctx, x, y, c = '#2f8a3e') {
  shadow(ctx, x, y, 26, 6);
  poly(ctx, [[x - 24, y - 60], [x + 24, y - 60], [x + 20, y], [x - 20, y]], c, 2.5);
  for (const k of [-10, 0, 10]) line(ctx, x + k, y - 52, x + k * 0.85, y - 6, 'rgba(22,11,51,0.3)', 2);
  rrect(ctx, x - 28, y - 66, 56, 9, 4, c, 2.5);
}

export function lamp(ctx, x, y, h = 200, c = '#2a3a5a', lit = false) {
  rect(ctx, x - 4, y - h, 8, h, c, 2.5);
  rect(ctx, x - 9, y - 12, 18, 12, c, 2);
  if (lit) {
    ctx.fillStyle = 'rgba(255,230,140,0.3)';
    ctx.beginPath();
    ctx.arc(x, y - h - 14, 40, 0, TAU);
    ctx.fill();
  }
  poly(ctx, [[x - 14, y - h], [x + 14, y - h], [x + 9, y - h - 26], [x - 9, y - h - 26]], lit ? '#fff3a0' : '#e8f4ff', 2.5);
  poly(ctx, [[x - 16, y - h - 26], [x + 16, y - h - 26], [x, y - h - 40]], c, 2.5);
}

export function fence(ctx, x0, x1, y, h = 40, c = '#ffffff') {
  line(ctx, x0, y - h * 0.75, x1, y - h * 0.75, INK, 7);
  line(ctx, x0, y - h * 0.75, x1, y - h * 0.75, c, 4);
  for (let x = x0; x <= x1; x += 22) {
    poly(ctx, [[x - 6, y], [x - 6, y - h], [x, y - h - 8], [x + 6, y - h], [x + 6, y]], c, 2);
  }
}

// A market or fair stall: posts, a counter and a striped awning. Returns the counter top y.
export function stall(ctx, x, y, w, a, b, { h = 170, counter = '#c98f4f', sign = null, signColour = '#ffffff' } = {}) {
  rect(ctx, x - w / 2 + 6, y - h, 10, h, '#8a5a3c', 2.5);
  rect(ctx, x + w / 2 - 16, y - h, 10, h, '#8a5a3c', 2.5);
  rect(ctx, x - w / 2 + 16, y - h + 40, w - 32, h - 100, 'rgba(22,11,51,0.18)', 0);
  awning(ctx, x - w / 2 - 6, y - h, w + 12, 34, a, b, Math.max(4, Math.round(w / 26)));
  rect(ctx, x - w / 2, y - 60, w, 60, counter, 2.5);
  for (let k = x - w / 2 + 20; k < x + w / 2; k += 24) line(ctx, k, y - 56, k, y - 4, 'rgba(110,68,38,0.4)', 2);
  if (sign) {
    rrect(ctx, x - w * 0.32, y - h - 40, w * 0.64, 34, 8, signColour, 2.5);
  }
  return y - 60;
}

// A simple boat hull seen side on, sitting in water at y. Returns the deck y.
export function hull(ctx, x, y, w, c = '#ffffff', stripe = '#2fb5e8', h = 30) {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - h);
  ctx.lineTo(x + w / 2 + 14, y - h);
  ctx.quadraticCurveTo(x + w / 2, y + 2, x + w / 2 - 20, y + 4);
  ctx.lineTo(x - w / 2 + 6, y + 4);
  ctx.closePath();
  fs(ctx, c, 2.5);
  line(ctx, x - w / 2 + 2, y - h + 10, x + w / 2 + 8, y - h + 10, stripe, 5);
  return y - h;
}

export function sail(ctx, x, y, h, c = '#ffffff', jib = true) {
  line(ctx, x, y, x, y - h, INK, 4);
  poly(ctx, [[x + 3, y - h], [x + 3, y - 8], [x + h * 0.55, y - 8]], c, 2.5);
  if (jib) poly(ctx, [[x - 3, y - h * 0.9], [x - 3, y - 8], [x - h * 0.35, y - 8]], c, 2.5);
}

export function crate(ctx, x, y, w = 60, h = 44, c = '#c98f4f') {
  rect(ctx, x - w / 2, y - h, w, h, c, 2.5);
  line(ctx, x - w / 2 + 4, y - h + 4, x + w / 2 - 4, y - 4, 'rgba(110,68,38,0.6)', 3);
  line(ctx, x - w / 2, y - h / 2, x + w / 2, y - h / 2, 'rgba(110,68,38,0.6)', 2.5);
}

export function barrel(ctx, x, y, c = '#a8743f') {
  ellipse(ctx, x, y - 30, 22, 30, c, 2.5);
  line(ctx, x - 21, y - 44, x + 21, y - 44, INK, 2.5);
  line(ctx, x - 21, y - 16, x + 21, y - 16, INK, 2.5);
}

export function pot(ctx, x, y, w = 40, c = '#d2703a') {
  poly(ctx, [[x - w / 2, y - w * 0.8], [x + w / 2, y - w * 0.8], [x + w * 0.38, y], [x - w * 0.38, y]], c, 2.5);
  rrect(ctx, x - w / 2 - 3, y - w * 0.85, w + 6, 8, 3, c, 2.5);
}

// A tall cactus in a pot (Iggy decoy: green and spiky).
export function cactus(ctx, x, y, h = 70) {
  pot(ctx, x, y, 34);
  const g = '#4fae4a';
  rrect(ctx, x - 9, y - 26 - h, 18, h + 4, 9, g, 2.5);
  rrect(ctx, x - 26, y - 26 - h * 0.7, 12, h * 0.35, 6, g, 2.5);
  rrect(ctx, x + 14, y - 26 - h * 0.85, 12, h * 0.4, 6, g, 2.5);
  line(ctx, x - 14, y - 26 - h * 0.4, x - 9, y - 26 - h * 0.4, INK, 2.5);
  line(ctx, x + 9, y - 26 - h * 0.5, x + 14, y - 26 - h * 0.5, INK, 2.5);
  for (let k = 0; k < 5; k++) line(ctx, x - 2, y - 30 - k * (h / 5), x + 2, y - 33 - k * (h / 5), '#2a6a2a', 1.5);
  circle(ctx, x, y - 30 - h, 5, '#ff5ab8', 1.5);
}

// A green crocodile pool float (Iggy decoy), floating at waterline y.
export function crocFloat(ctx, x, y, s = 1, flip = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -s : s, s);
  const g = '#6fd34a';
  ctx.beginPath();
  ctx.moveTo(-70, -4);
  ctx.quadraticCurveTo(-90, -8, -100, -2);
  ctx.quadraticCurveTo(-80, 4, -60, 4);
  fs(ctx, g, 2.5);
  rrect(ctx, -70, -20, 110, 24, 12, g, 2.5);
  rrect(ctx, 30, -26, 46, 16, 8, g, 2.5);
  rrect(ctx, 34, -14, 44, 10, 5, '#8fe36a', 2);
  circle(ctx, 34, -30, 7, '#ffffff', 2);
  circle(ctx, 36, -30, 3, INK, 0);
  for (let k = 0; k < 5; k++) poly(ctx, [[-56 + k * 18, -20], [-50 + k * 18, -30], [-44 + k * 18, -20]], '#4fae3a', 1.5);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(-10, 4, 80, 6, 0, 0, Math.PI);
  ctx.stroke();
  ctx.restore();
}

// A swim ring float on the water at waterline y.
export function ringFloat(ctx, x, y, r = 30, a = '#ffd23a', b = '#ff3d5a') {
  ctx.save();
  ctx.lineWidth = r * 0.55 + 5;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.ellipse(x, y - 4, r, r * 0.35, 0, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = r * 0.55;
  ctx.strokeStyle = a;
  ctx.stroke();
  ctx.strokeStyle = b;
  ctx.setLineDash([10, 14]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function flamingoFloat(ctx, x, y, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ringFloat(ctx, 0, 0, 40, '#ff7ab6', '#ff9ed2');
  ctx.strokeStyle = INK;
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(30, -6);
  ctx.quadraticCurveTo(52, -40, 34, -62);
  ctx.stroke();
  ctx.strokeStyle = '#ff7ab6';
  ctx.lineWidth = 11;
  ctx.stroke();
  circle(ctx, 32, -66, 10, '#ff7ab6', 2.5);
  poly(ctx, [[38, -68], [54, -60], [40, -60]], '#2a1a2a', 1.5);
  circle(ctx, 32, -68, 2, INK, 0);
  ctx.restore();
}

export function palmPot(ctx, x, y, s = 1) {
  pot(ctx, x, y, 44 * s, '#e8e0d0');
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k - 2) * 0.5;
    ctx.save();
    ctx.translate(x, y - 36 * s);
    ctx.rotate(a + Math.PI / 2);
    ellipse(ctx, 0, -30 * s, 9 * s, 32 * s, k % 2 ? '#3fae4a' : '#2f8a3e', 2);
    ctx.restore();
  }
}

export function wavesFoam(ctx, x0, x1, y, t, colour = '#ffffff') {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(x0, y + 12);
  for (let x = x0; x <= x1; x += 20) ctx.lineTo(x, y + Math.sin(x / 50 + t * 1.6) * 5);
  ctx.lineTo(x1, y + 12);
  ctx.closePath();
  ctx.fill();
}

export { lin };
