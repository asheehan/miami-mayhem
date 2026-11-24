// Food Truck Chef food art: every ingredient as a bin picture, and every dish as it looks
// finished (order bubbles, the counter) or part-made (the stations). Bold shapes, warm outlines,
// a highlight on everything. Drawing only.
import { ING } from './recipes.js';

export const INK = '#3b2314';
export const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function hash(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function mix(a, b, k) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p, s) => (p >> s) & 255;
  const m = (s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * clamp(k, 0, 1));
  return `#${((1 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)).toString(16).slice(1)}`;
}

function fillStroke(ctx, fill, lw, stroke = INK) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}

function shine(ctx, x, y, rx, ry, rot = -0.5, a = 0.55) {
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.fillStyle = '#ffffff';
  ellipse(ctx, x, y, rx, ry, rot);
  ctx.fill();
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------------------------------------------------------------------------------------------
// Ingredients (bin pictures), each fitting a circle of radius r
// ---------------------------------------------------------------------------------------------

function mango(ctx, x, y, r) {
  const lw = r * 0.09;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.5);
  const g = ctx.createLinearGradient(-r * 0.8, -r * 0.5, r * 0.8, r * 0.5);
  g.addColorStop(0, '#e8323a');
  g.addColorStop(0.35, '#ff8a1e');
  g.addColorStop(0.7, '#ffc21f');
  g.addColorStop(1, '#9ccf3a');
  // a fat kidney bean
  ctx.beginPath();
  ctx.moveTo(-r * 0.95, -r * 0.05);
  ctx.bezierCurveTo(-r * 0.95, -r * 0.62, -r * 0.2, -r * 0.7, r * 0.25, -r * 0.48);
  ctx.bezierCurveTo(r * 0.62, -r * 0.32, r * 1.0, -r * 0.3, r * 0.92, r * 0.12);
  ctx.bezierCurveTo(r * 0.85, r * 0.62, r * 0.1, r * 0.72, -r * 0.4, r * 0.55);
  ctx.bezierCurveTo(-r * 0.8, r * 0.42, -r * 0.95, r * 0.25, -r * 0.95, -r * 0.05);
  fillStroke(ctx, g, lw);
  shine(ctx, -r * 0.35, -r * 0.3, r * 0.3, r * 0.1, -0.2);
  ctx.strokeStyle = '#6b3d1a';
  ctx.lineWidth = lw * 1.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.85, -r * 0.3);
  ctx.lineTo(-r * 1.0, -r * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r * 0.98, -r * 0.48);
  ctx.quadraticCurveTo(-r * 0.75, -r * 1.0, -r * 0.3, -r * 0.85);
  ctx.quadraticCurveTo(-r * 0.6, -r * 0.55, -r * 0.98, -r * 0.48);
  fillStroke(ctx, '#3fae3a', lw * 0.8);
  ctx.restore();
}

function strawberryShape(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 0.55, y + r * 0.6, x - r * 0.95, y + r * 0.05, x - r * 0.8, y - r * 0.4);
  ctx.bezierCurveTo(x - r * 0.65, y - r * 0.75, x - r * 0.2, y - r * 0.7, x, y - r * 0.6);
  ctx.bezierCurveTo(x + r * 0.2, y - r * 0.7, x + r * 0.65, y - r * 0.75, x + r * 0.8, y - r * 0.4);
  ctx.bezierCurveTo(x + r * 0.95, y + r * 0.05, x + r * 0.55, y + r * 0.6, x, y + r * 0.9);
  ctx.closePath();
}

function strawberry(ctx, x, y, r) {
  const lw = r * 0.09;
  strawberryShape(ctx, x, y + r * 0.05, r);
  const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.2, r * 0.1, x, y, r);
  g.addColorStop(0, '#ff6b7d');
  g.addColorStop(1, '#e0122f');
  fillStroke(ctx, g, lw);
  ctx.fillStyle = '#ffe27a';
  for (let i = 0; i < 11; i++) {
    const a = hash(i + 4) * TAU;
    const d = Math.sqrt(hash(i + 9)) * r * 0.6;
    ellipse(ctx, x + Math.cos(a) * d * 0.9, y + r * 0.12 + Math.sin(a) * d * 0.8, r * 0.04, r * 0.065);
    ctx.fill();
  }
  shine(ctx, x - r * 0.38, y - r * 0.15, r * 0.1, r * 0.22, 0.4);
  // leafy cap
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI + (i / 9) * Math.PI;
    const rr = i % 2 ? r * 0.2 : r * 0.48;
    ctx.lineTo(x + Math.cos(a) * rr, y - r * 0.52 + Math.sin(a) * rr * 0.55 + r * 0.05);
  }
  ctx.closePath();
  fillStroke(ctx, '#3fbf4a', lw * 0.8);
  ctx.strokeStyle = '#2e8a35';
  ctx.lineWidth = lw * 1.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.6);
  ctx.lineTo(x + r * 0.08, y - r * 0.85);
  ctx.stroke();
}

function banana(ctx, x, y, r) {
  const lw = r * 0.09;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.25);
  ctx.beginPath();
  ctx.moveTo(-r * 0.92, -r * 0.35);
  ctx.quadraticCurveTo(-r * 0.4, r * 0.75, r * 0.88, -r * 0.2);
  ctx.quadraticCurveTo(r * 0.92, -r * 0.08, r * 0.82, r * 0.02);
  ctx.quadraticCurveTo(-r * 0.25, r * 1.05, -r * 0.98, -r * 0.18);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -r * 0.2, 0, r * 0.6);
  g.addColorStop(0, '#fff07a');
  g.addColorStop(1, '#f2c21a');
  fillStroke(ctx, g, lw);
  ctx.strokeStyle = 'rgba(190,140,0,0.55)';
  ctx.lineWidth = lw * 0.7;
  ctx.beginPath();
  ctx.moveTo(-r * 0.75, -r * 0.15);
  ctx.quadraticCurveTo(-r * 0.3, r * 0.6, r * 0.7, -r * 0.08);
  ctx.stroke();
  // brown tips
  ctx.fillStyle = '#6b4520';
  ellipse(ctx, -r * 0.95, -r * 0.28, r * 0.08, r * 0.1, 0.4);
  ctx.fill();
  ellipse(ctx, r * 0.88, -r * 0.12, r * 0.07, r * 0.09, -0.5);
  ctx.fill();
  shine(ctx, -r * 0.1, r * 0.25, r * 0.28, r * 0.06, -0.3);
  ctx.restore();
}

function pineapple(ctx, x, y, r) {
  const lw = r * 0.09;
  // crown
  ctx.fillStyle = '#2fae4a';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * r * 0.09 - r * 0.1, y - r * 0.35);
    ctx.quadraticCurveTo(x + i * r * 0.22, y - r * 0.75, x + i * r * 0.2, y - r * (0.98 - Math.abs(i) * 0.12));
    ctx.quadraticCurveTo(x + i * r * 0.05 + r * 0.05, y - r * 0.6, x + i * r * 0.09 + r * 0.1, y - r * 0.35);
    fillStroke(ctx, i % 2 ? '#2a9c40' : '#45c457', lw * 0.7);
  }
  ellipse(ctx, x, y + r * 0.22, r * 0.55, r * 0.68);
  const g = ctx.createLinearGradient(x - r * 0.5, 0, x + r * 0.5, 0);
  g.addColorStop(0, '#ffd23a');
  g.addColorStop(1, '#f0a01a');
  fillStroke(ctx, g, lw);
  ctx.save();
  ellipse(ctx, x, y + r * 0.22, r * 0.55, r * 0.68);
  ctx.clip();
  ctx.strokeStyle = 'rgba(160,90,0,0.7)';
  ctx.lineWidth = lw * 0.6;
  for (let k = -4; k <= 4; k++) {
    ctx.beginPath();
    ctx.moveTo(x + k * r * 0.25 - r, y - r * 0.6);
    ctx.lineTo(x + k * r * 0.25 + r, y + r * 1.2);
    ctx.moveTo(x + k * r * 0.25 + r, y - r * 0.6);
    ctx.lineTo(x + k * r * 0.25 - r, y + r * 1.2);
    ctx.stroke();
  }
  ctx.restore();
  shine(ctx, x - r * 0.25, y + r * 0.02, r * 0.09, r * 0.22, 0.2);
}

function straw(ctx, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.35);
  const w = r * 0.26;
  roundRect(ctx, -w / 2, -r * 0.95, w, r * 1.9, w * 0.3);
  fillStroke(ctx, '#ffffff', r * 0.08);
  ctx.save();
  roundRect(ctx, -w / 2, -r * 0.95, w, r * 1.9, w * 0.3);
  ctx.clip();
  ctx.fillStyle = '#ff4f9a';
  for (let k = -6; k < 6; k++) {
    ctx.beginPath();
    ctx.moveTo(-w, k * r * 0.3);
    ctx.lineTo(w, k * r * 0.3 - r * 0.2);
    ctx.lineTo(w, k * r * 0.3 - r * 0.08);
    ctx.lineTo(-w, k * r * 0.3 + r * 0.12);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

function umbrella(ctx, x, y, r) {
  const lw = r * 0.08;
  ctx.strokeStyle = '#c98a4a';
  ctx.lineWidth = lw * 1.3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.4);
  ctx.lineTo(x + r * 0.15, y + r * 0.9);
  ctx.stroke();
  const cols = ['#3ad1e8', '#ff5fa2', '#ffe14d', '#3ad1e8', '#ff5fa2', '#ffe14d'];
  for (let i = 0; i < 6; i++) {
    const a0 = Math.PI + (i / 6) * Math.PI;
    const a1 = Math.PI + ((i + 1) / 6) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.92);
    ctx.lineTo(x + Math.cos(a0) * r * 0.95, y - r * 0.2 + Math.sin(a0) * r * 0.75);
    ctx.quadraticCurveTo(x + Math.cos((a0 + a1) / 2) * r * 0.75, y - r * 0.1 + Math.sin((a0 + a1) / 2) * r * 0.55, x + Math.cos(a1) * r * 0.95, y - r * 0.2 + Math.sin(a1) * r * 0.75);
    ctx.closePath();
    fillStroke(ctx, cols[i], lw * 0.7);
  }
  ctx.beginPath();
  ctx.arc(x, y - r * 0.95, r * 0.08, 0, TAU);
  fillStroke(ctx, '#ffe14d', lw * 0.6);
}

function bread(ctx, x, y, r) {
  const lw = r * 0.09;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.12);
  roundRect(ctx, -r * 0.98, -r * 0.42, r * 1.96, r * 0.84, r * 0.42);
  const g = ctx.createLinearGradient(0, -r * 0.42, 0, r * 0.42);
  g.addColorStop(0, '#f8cf7e');
  g.addColorStop(0.6, '#e5a048');
  g.addColorStop(1, '#c47a2c');
  fillStroke(ctx, g, lw);
  ctx.strokeStyle = '#a8621f';
  ctx.lineWidth = lw * 0.9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, -r * 0.08);
  ctx.quadraticCurveTo(0, -r * 0.24, r * 0.7, -r * 0.1);
  ctx.stroke();
  shine(ctx, -r * 0.35, -r * 0.24, r * 0.28, r * 0.06, -0.05, 0.6);
  ctx.restore();
}

function ham(ctx, x, y, r) {
  const lw = r * 0.08;
  ellipse(ctx, x, y, r * 0.86, r * 0.78, 0.2);
  fillStroke(ctx, '#ffc7d2', lw);
  ellipse(ctx, x + r * 0.02, y + r * 0.02, r * 0.68, r * 0.6, 0.2);
  ctx.fillStyle = '#ff8fa6';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,228,0.9)';
  ctx.lineWidth = lw * 0.8;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.4, y - r * 0.1);
  ctx.quadraticCurveTo(x, y - r * 0.3, x + r * 0.35, y + r * 0.05);
  ctx.moveTo(x - r * 0.2, y + r * 0.3);
  ctx.quadraticCurveTo(x + r * 0.1, y + r * 0.15, x + r * 0.4, y + r * 0.32);
  ctx.stroke();
  shine(ctx, x - r * 0.35, y - r * 0.35, r * 0.2, r * 0.08, -0.4);
}

function pork(ctx, x, y, r) {
  const lw = r * 0.09;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.85, y - r * 0.1);
  ctx.quadraticCurveTo(x - r * 0.7, y - r * 0.6, x - r * 0.1, y - r * 0.55);
  ctx.quadraticCurveTo(x + r * 0.55, y - r * 0.7, x + r * 0.85, y - r * 0.2);
  ctx.quadraticCurveTo(x + r * 0.95, y + r * 0.35, x + r * 0.45, y + r * 0.55);
  ctx.quadraticCurveTo(x - r * 0.1, y + r * 0.75, x - r * 0.65, y + r * 0.45);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, y - r * 0.6, 0, y + r * 0.6);
  g.addColorStop(0, '#9a4f22');
  g.addColorStop(0.35, '#d08a4c');
  g.addColorStop(1, '#b86e36');
  fillStroke(ctx, g, lw);
  ctx.strokeStyle = 'rgba(110,50,20,0.75)';
  ctx.lineWidth = lw * 0.7;
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const xx = x - r * 0.55 + i * r * 0.26;
    ctx.beginPath();
    ctx.moveTo(xx, y - r * 0.25);
    ctx.quadraticCurveTo(xx + r * 0.1, y + r * 0.1, xx - r * 0.02, y + r * 0.4);
    ctx.stroke();
  }
  shine(ctx, x - r * 0.3, y - r * 0.35, r * 0.25, r * 0.07, -0.1, 0.4);
}

function cheese(ctx, x, y, r) {
  const lw = r * 0.08;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.12);
  ctx.beginPath();
  ctx.moveTo(-r * 0.8, -r * 0.55);
  ctx.lineTo(r * 0.8, -r * 0.7);
  ctx.lineTo(r * 0.72, r * 0.62);
  ctx.quadraticCurveTo(r * 0.5, r * 0.9, r * 0.35, r * 0.6);
  ctx.lineTo(-r * 0.75, r * 0.7);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -r * 0.7, 0, r * 0.7);
  g.addColorStop(0, '#ffe46a');
  g.addColorStop(1, '#ffc21f');
  fillStroke(ctx, g, lw);
  ctx.fillStyle = '#eaa812';
  for (const [hx, hy, hr] of [[-0.35, -0.2, 0.14], [0.3, 0.1, 0.18], [-0.1, 0.38, 0.1], [0.45, -0.38, 0.08]]) {
    ellipse(ctx, hx * r, hy * r, hr * r, hr * r * 0.85);
    ctx.fill();
  }
  shine(ctx, -r * 0.45, -r * 0.45, r * 0.22, r * 0.05, -0.08);
  ctx.restore();
}

function pickleSlice(ctx, x, y, r, lw) {
  ellipse(ctx, x, y, r, r * 0.9);
  fillStroke(ctx, '#4f9a2a', lw);
  ellipse(ctx, x, y, r * 0.74, r * 0.66);
  ctx.fillStyle = '#a8de6a';
  ctx.fill();
  ctx.fillStyle = '#e6f7b8';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    ellipse(ctx, x + Math.cos(a) * r * 0.36, y + Math.sin(a) * r * 0.32, r * 0.09, r * 0.13, a);
    ctx.fill();
  }
}

function pickles(ctx, x, y, r) {
  const lw = r * 0.07;
  pickleSlice(ctx, x - r * 0.38, y + r * 0.2, r * 0.44, lw);
  pickleSlice(ctx, x + r * 0.38, y + r * 0.22, r * 0.44, lw);
  pickleSlice(ctx, x, y - r * 0.28, r * 0.46, lw);
}

function tortilla(ctx, x, y, r) {
  const lw = r * 0.08;
  ellipse(ctx, x, y, r * 0.92, r * 0.86);
  const g = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.1, x, y, r);
  g.addColorStop(0, '#fbe7b0');
  g.addColorStop(1, '#ecc779');
  fillStroke(ctx, g, lw);
  ctx.fillStyle = 'rgba(150,90,30,0.55)';
  for (let i = 0; i < 9; i++) {
    const a = hash(i + 30) * TAU;
    const d = Math.sqrt(hash(i + 40)) * r * 0.7;
    ellipse(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.05 + hash(i) * 0.06), r * 0.05, a);
    ctx.fill();
  }
}

function crumbles(ctx, x, y, r, cols, n = 14, seed = 0) {
  for (let i = 0; i < n; i++) {
    const a = hash(i + seed) * TAU;
    const d = Math.sqrt(hash(i + seed + 50)) * r;
    const rr = r * (0.16 + hash(i + seed + 90) * 0.12);
    ellipse(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, rr, rr * 0.8, a);
    fillStroke(ctx, cols[i % cols.length], rr * 0.3);
  }
}

function beef(ctx, x, y, r) {
  crumbles(ctx, x, y + r * 0.05, r * 0.7, ['#8a4b2a', '#6b3519', '#a35a30'], 16, 3);
  shine(ctx, x - r * 0.3, y - r * 0.25, r * 0.1, r * 0.05, 0, 0.5);
}

function chickenStrip(ctx, x, y, len, w, rot, lw) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  roundRect(ctx, -len / 2, -w / 2, len, w, w * 0.45);
  fillStroke(ctx, '#eab872', lw);
  ctx.strokeStyle = '#a8622a';
  ctx.lineWidth = lw * 1.1;
  ctx.lineCap = 'round';
  for (let k = -1; k <= 1; k++) {
    ctx.beginPath();
    ctx.moveTo(k * len * 0.25 - w * 0.2, -w * 0.3);
    ctx.lineTo(k * len * 0.25 + w * 0.2, w * 0.3);
    ctx.stroke();
  }
  ctx.restore();
}

function chicken(ctx, x, y, r) {
  const lw = r * 0.07;
  chickenStrip(ctx, x - r * 0.1, y + r * 0.3, r * 1.4, r * 0.38, -0.15, lw);
  chickenStrip(ctx, x + r * 0.1, y - r * 0.05, r * 1.3, r * 0.36, 0.2, lw);
  chickenStrip(ctx, x - r * 0.05, y - r * 0.38, r * 1.2, r * 0.34, -0.05, lw);
}

function leaf(ctx, x, y, r, rot, fill) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  for (let i = 0; i <= 8; i++) {
    const k = i / 8;
    ctx.lineTo(-r + k * 2 * r, -r * 0.5 - Math.sin(k * Math.PI * 4) * r * 0.12);
  }
  ctx.quadraticCurveTo(r * 1.1, 0, r, r * 0.2);
  ctx.quadraticCurveTo(0, r * 0.45, -r, 0);
  fillStroke(ctx, fill, r * 0.09);
  ctx.restore();
}

function lettuce(ctx, x, y, r) {
  leaf(ctx, x - r * 0.25, y + r * 0.2, r * 0.6, -0.3, '#3fae3a');
  leaf(ctx, x + r * 0.25, y + r * 0.15, r * 0.6, 0.35, '#5fd35a');
  leaf(ctx, x, y - r * 0.15, r * 0.65, 0.05, '#7fe06a');
}

function tomato(ctx, x, y, r) {
  const lw = r * 0.08;
  ellipse(ctx, x, y, r * 0.85, r * 0.8);
  fillStroke(ctx, '#ff3b2e', lw);
  ellipse(ctx, x, y, r * 0.66, r * 0.62);
  ctx.fillStyle = '#ff7a5c';
  ctx.fill();
  ctx.strokeStyle = '#ff3b2e';
  ctx.lineWidth = lw * 1.2;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * r * 0.66, y + Math.sin(a) * r * 0.62);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffe27a';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.5;
    ellipse(ctx, x + Math.cos(a) * r * 0.38, y + Math.sin(a) * r * 0.35, r * 0.07, r * 0.1, a);
    ctx.fill();
  }
  shine(ctx, x - r * 0.45, y - r * 0.45, r * 0.15, r * 0.07, -0.7);
}

function avocado(ctx, x, y, r) {
  const lw = r * 0.08;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.3);
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.92);
  ctx.bezierCurveTo(r * 0.45, -r * 0.92, r * 0.42, -r * 0.3, r * 0.68, r * 0.25);
  ctx.bezierCurveTo(r * 0.85, r * 0.9, -r * 0.85, r * 0.9, -r * 0.68, r * 0.25);
  ctx.bezierCurveTo(-r * 0.42, -r * 0.3, -r * 0.45, -r * 0.92, 0, -r * 0.92);
  fillStroke(ctx, '#2f6b22', lw);
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.78);
  ctx.bezierCurveTo(r * 0.35, -r * 0.78, r * 0.32, -r * 0.25, r * 0.55, r * 0.25);
  ctx.bezierCurveTo(r * 0.7, r * 0.75, -r * 0.7, r * 0.75, -r * 0.55, r * 0.25);
  ctx.bezierCurveTo(-r * 0.32, -r * 0.25, -r * 0.35, -r * 0.78, 0, -r * 0.78);
  const g = ctx.createRadialGradient(0, r * 0.3, r * 0.1, 0, r * 0.1, r * 0.8);
  g.addColorStop(0, '#f2f7a0');
  g.addColorStop(1, '#a6d65a');
  ctx.fillStyle = g;
  ctx.fill();
  ellipse(ctx, 0, r * 0.3, r * 0.27, r * 0.28);
  fillStroke(ctx, '#9a5a2a', lw * 0.8);
  shine(ctx, -r * 0.08, r * 0.2, r * 0.07, r * 0.09, 0);
  ctx.restore();
}

function hotsauce(ctx, x, y, r) {
  const lw = r * 0.08;
  // bottle
  ctx.beginPath();
  ctx.moveTo(x - r * 0.12, y - r * 0.62);
  ctx.lineTo(x - r * 0.12, y - r * 0.4);
  ctx.quadraticCurveTo(x - r * 0.42, y - r * 0.28, x - r * 0.42, y + r * 0.05);
  ctx.lineTo(x - r * 0.42, y + r * 0.8);
  ctx.quadraticCurveTo(x, y + r * 0.95, x + r * 0.42, y + r * 0.8);
  ctx.lineTo(x + r * 0.42, y + r * 0.05);
  ctx.quadraticCurveTo(x + r * 0.42, y - r * 0.28, x + r * 0.12, y - r * 0.4);
  ctx.lineTo(x + r * 0.12, y - r * 0.62);
  ctx.closePath();
  fillStroke(ctx, '#e8201a', lw);
  roundRect(ctx, x - r * 0.15, y - r * 0.95, r * 0.3, r * 0.36, r * 0.08);
  fillStroke(ctx, '#2fae4a', lw * 0.8);
  // label with a flame
  roundRect(ctx, x - r * 0.34, y + r * 0.1, r * 0.68, r * 0.5, r * 0.1);
  fillStroke(ctx, '#fff4dc', lw * 0.6);
  flame(ctx, x, y + r * 0.52, r * 0.3, 0);
  shine(ctx, x - r * 0.26, y - r * 0.05, r * 0.05, r * 0.14, 0);
}

export function flame(ctx, x, y, r, t) {
  const wob = Math.sin(t * 20) * r * 0.08;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - r * 0.75, y - r * 0.2, x - r * 0.1 + wob, y - r * 1.1);
  ctx.quadraticCurveTo(x + r * 0.1, y - r * 0.6, x + r * 0.25, y - r * 0.75);
  ctx.quadraticCurveTo(x + r * 0.75, y - r * 0.2, x, y);
  ctx.fillStyle = '#ff7a1a';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.05);
  ctx.quadraticCurveTo(x - r * 0.35, y - r * 0.25, x + wob * 0.5, y - r * 0.65);
  ctx.quadraticCurveTo(x + r * 0.35, y - r * 0.25, x, y - r * 0.05);
  ctx.fillStyle = '#ffe14d';
  ctx.fill();
}

// An ice cream scoop (round with a drippy rim), centred at (x, y).
export function scoop(ctx, x, y, r, flavour, lw = r * 0.08) {
  const col = { vanilla: '#fff1c9', chocolate: '#8a4a2a', berry: '#ff9cc2', mint: '#9ef2cf' }[flavour] || ING[flavour]?.colour || '#ffffff';
  const dark = mix(col, '#3b2314', 0.25);
  ctx.beginPath();
  ctx.arc(x, y - r * 0.05, r * 0.82, Math.PI * 0.95, Math.PI * 2.05);
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const xx = x + r * 0.86 - k * r * 1.72;
    const yy = y + r * 0.3 + (i % 2 ? r * 0.16 : 0);
    ctx.lineTo(xx, yy);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, mix(col, '#ffffff', 0.35));
  g.addColorStop(1, col);
  fillStroke(ctx, g, lw);
  if (flavour === 'mint') {
    ctx.fillStyle = '#4a2716';
    for (let i = 0; i < 6; i++) {
      ellipse(ctx, x + (hash(i + 3) - 0.5) * r * 1.2, y + (hash(i + 7) - 0.6) * r * 0.9, r * 0.07, r * 0.045, i);
      ctx.fill();
    }
  }
  if (flavour === 'berry') {
    ctx.fillStyle = '#e0122f';
    for (let i = 0; i < 4; i++) {
      ellipse(ctx, x + (hash(i + 13) - 0.5) * r * 1.1, y + (hash(i + 17) - 0.6) * r * 0.8, r * 0.08, r * 0.06, i);
      ctx.fill();
    }
  }
  ctx.strokeStyle = dark;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = lw * 0.8;
  ctx.beginPath();
  ctx.arc(x + r * 0.1, y - r * 0.05, r * 0.5, Math.PI * 0.15, Math.PI * 0.7);
  ctx.stroke();
  ctx.globalAlpha = 1;
  shine(ctx, x - r * 0.35, y - r * 0.45, r * 0.18, r * 0.1, -0.6);
}

function tub(ctx, x, y, r, flavour) {
  const lw = r * 0.08;
  const col = { vanilla: '#fff1c9', chocolate: '#8a4a2a', berry: '#ff9cc2', mint: '#9ef2cf' }[flavour];
  scoop(ctx, x, y - r * 0.18, r * 0.62, flavour, lw);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.78, y + r * 0.05);
  ctx.lineTo(x + r * 0.78, y + r * 0.05);
  ctx.lineTo(x + r * 0.62, y + r * 0.9);
  ctx.lineTo(x - r * 0.62, y + r * 0.9);
  ctx.closePath();
  fillStroke(ctx, '#ffffff', lw);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.74, y + r * 0.28);
  ctx.lineTo(x + r * 0.74, y + r * 0.28);
  ctx.lineTo(x + r * 0.68, y + r * 0.6);
  ctx.lineTo(x - r * 0.68, y + r * 0.6);
  ctx.closePath();
  ctx.fillStyle = mix(col, '#3b2314', flavour === 'vanilla' ? 0.12 : 0);
  ctx.fill();
}

const SPRINKLE_COLS = ['#ff4f9a', '#3ad1e8', '#ffe14d', '#7be04a', '#ff8a2a', '#b07aff'];

function shaker(ctx, x, y, r, body, cap, grains, speckle) {
  const lw = r * 0.08;
  roundRect(ctx, x - r * 0.45, y - r * 0.4, r * 0.9, r * 1.3, r * 0.22);
  fillStroke(ctx, body, lw);
  ctx.save();
  roundRect(ctx, x - r * 0.45, y - r * 0.4, r * 0.9, r * 1.3, r * 0.22);
  ctx.clip();
  ctx.fillStyle = grains;
  ctx.fillRect(x - r, y + r * 0.05, r * 2, r);
  if (speckle) {
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = speckle[i % speckle.length];
      ctx.fillRect(x - r * 0.4 + hash(i) * r * 0.8, y + r * 0.1 + hash(i + 40) * r * 0.75, r * 0.1, r * 0.06);
    }
  }
  ctx.restore();
  shine(ctx, x - r * 0.26, y + r * 0.05, r * 0.06, r * 0.3, 0);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.42, y - r * 0.4);
  ctx.quadraticCurveTo(x - r * 0.4, y - r * 0.92, x, y - r * 0.92);
  ctx.quadraticCurveTo(x + r * 0.4, y - r * 0.92, x + r * 0.42, y - r * 0.4);
  ctx.closePath();
  fillStroke(ctx, cap, lw);
  ctx.fillStyle = INK;
  for (const [hx, hy] of [[-0.15, -0.68], [0.15, -0.68], [0, -0.55], [-0.2, -0.5], [0.2, -0.5]]) {
    ctx.beginPath();
    ctx.arc(x + hx * r, y + hy * r, r * 0.04, 0, TAU);
    ctx.fill();
  }
}

function sprinkles(ctx, x, y, r) {
  shaker(ctx, x, y, r, 'rgba(255,255,255,0.9)', '#ff5fa2', '#fff4dc', SPRINKLE_COLS);
}

function sugar(ctx, x, y, r) {
  // cinnamon sugar: warm speckles
  shaker(ctx, x, y, r, 'rgba(255,255,255,0.9)', '#ff9a3a', '#fbeed8', ['#b06a2a', '#d98a3a', '#ffffff']);
}

function salt(ctx, x, y, r) {
  shaker(ctx, x, y, r, 'rgba(225,240,255,0.9)', '#b8c4d4', '#ffffff', ['#dce6f2', '#ffffff']);
}

function cherry(ctx, x, y, r) {
  const lw = r * 0.08;
  ctx.strokeStyle = '#3f7a2a';
  ctx.lineWidth = lw * 1.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + r * 0.1, y - r * 0.6, x + r * 0.4, y - r * 0.85);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x - r * 0.05, y + r * 0.25, r * 0.55, 0, TAU);
  const g = ctx.createRadialGradient(x - r * 0.25, y, r * 0.05, x, y + r * 0.25, r * 0.6);
  g.addColorStop(0, '#ff5a6e');
  g.addColorStop(1, '#c00a24');
  fillStroke(ctx, g, lw);
  shine(ctx, x - r * 0.25, y + r * 0.05, r * 0.12, r * 0.08, -0.6, 0.8);
}

// Fried pieces. d: 0 raw, 1 golden, 2 dark.
export function friedColour(food, d) {
  const raw = { churro: '#f3dfae', tostone: '#f6e48a', empanada: '#f6dcaa' }[food] || '#f3dfae';
  const gold = { churro: '#e0952f', tostone: '#f2b636', empanada: '#e8a03a' }[food] || '#e0952f';
  if (d <= 1) return mix(raw, gold, d);
  return mix(gold, '#4a2a14', Math.min(1, (d - 1) * 1.1));
}

export function friedPiece(ctx, food, x, y, r, d = 1, rot = 0) {
  const lw = r * 0.09;
  const col = friedColour(food, d);
  const edge = mix(col, '#3b2314', 0.35);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  if (food === 'churro') {
    const len = r * 1.9;
    const w = r * 0.42;
    ctx.beginPath();
    ctx.moveTo(-len / 2, -w / 2);
    ctx.quadraticCurveTo(0, -w / 2 - r * 0.18, len / 2, -w / 2);
    ctx.arc(len / 2, 0, w / 2, -Math.PI / 2, Math.PI / 2);
    ctx.quadraticCurveTo(0, w / 2 - r * 0.18, -len / 2, w / 2);
    ctx.arc(-len / 2, 0, w / 2, Math.PI / 2, Math.PI * 1.5);
    fillStroke(ctx, col, lw);
    ctx.strokeStyle = edge;
    ctx.lineWidth = lw * 0.8;
    for (const k of [-0.22, 0, 0.22]) {
      ctx.beginPath();
      ctx.moveTo(-len / 2 + r * 0.1, k * w * 1.2);
      ctx.quadraticCurveTo(0, k * w * 1.2 - r * 0.18, len / 2 - r * 0.1, k * w * 1.2);
      ctx.stroke();
    }
    shine(ctx, -len * 0.15, -w * 0.32, len * 0.25, w * 0.08, -0.05, 0.5);
  } else if (food === 'tostone') {
    ctx.beginPath();
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU;
      const rr = r * (0.72 + (i % 2 ? 0.08 : 0) + hash(i + 2) * 0.06);
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.86);
    }
    ctx.closePath();
    fillStroke(ctx, col, lw);
    ellipse(ctx, 0, 0, r * 0.45, r * 0.38);
    ctx.fillStyle = mix(col, '#ffffff', 0.18);
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = lw * 0.6;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.12, Math.sin(a) * r * 0.1);
      ctx.lineTo(Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.34);
      ctx.stroke();
    }
    shine(ctx, -r * 0.3, -r * 0.35, r * 0.18, r * 0.06, -0.4, 0.5);
  } else {
    // empanada: a half moon with a crimped edge
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, r * 0.3);
    ctx.quadraticCurveTo(-r * 0.85, -r * 0.7, 0, -r * 0.72);
    ctx.quadraticCurveTo(r * 0.85, -r * 0.7, r * 0.9, r * 0.3);
    ctx.quadraticCurveTo(0, r * 0.5, -r * 0.9, r * 0.3);
    fillStroke(ctx, col, lw);
    ctx.strokeStyle = edge;
    ctx.lineWidth = lw * 0.9;
    ctx.lineCap = 'round';
    for (let i = 0; i <= 8; i++) {
      const k = i / 8;
      const xx = -r * 0.82 + k * r * 1.64;
      const yy = r * 0.3 + Math.sin(k * Math.PI) * r * 0.16;
      ctx.beginPath();
      ctx.moveTo(xx, yy - r * 0.04);
      ctx.lineTo(xx, yy - r * 0.18);
      ctx.stroke();
    }
    shine(ctx, -r * 0.25, -r * 0.4, r * 0.3, r * 0.08, -0.2, 0.5);
  }
  ctx.restore();
}

function rawPile(ctx, food, x, y, r) {
  if (food === 'churro') {
    friedPiece(ctx, food, x, y - r * 0.25, r * 0.62, 0, -0.15);
    friedPiece(ctx, food, x, y + r * 0.25, r * 0.62, 0, 0.1);
  } else if (food === 'tostone') {
    friedPiece(ctx, food, x - r * 0.3, y + r * 0.2, r * 0.48, 0);
    friedPiece(ctx, food, x + r * 0.3, y + r * 0.15, r * 0.48, 0);
    friedPiece(ctx, food, x, y - r * 0.3, r * 0.5, 0);
  } else friedPiece(ctx, food, x, y + r * 0.05, r * 0.8, 0);
}

function sauce(ctx, x, y, r) {
  const lw = r * 0.08;
  // a bowl of tomato sauce with a ladle
  ellipse(ctx, x, y + r * 0.1, r * 0.85, r * 0.3);
  fillStroke(ctx, '#d8342c', lw);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.85, y + r * 0.1);
  ctx.quadraticCurveTo(x - r * 0.8, y + r * 0.85, x, y + r * 0.85);
  ctx.quadraticCurveTo(x + r * 0.8, y + r * 0.85, x + r * 0.85, y + r * 0.1);
  ctx.quadraticCurveTo(x, y + r * 0.45, x - r * 0.85, y + r * 0.1);
  fillStroke(ctx, '#ffffff', lw);
  ctx.strokeStyle = '#9aa6b8';
  ctx.lineWidth = lw * 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + r * 0.1, y + r * 0.05);
  ctx.lineTo(x + r * 0.6, y - r * 0.85);
  ctx.stroke();
  shine(ctx, x - r * 0.3, y + r * 0.03, r * 0.22, r * 0.06, 0, 0.6);
}

function mozzarella(ctx, x, y, r) {
  const lw = r * 0.08;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.85, y - r * 0.05);
  ctx.quadraticCurveTo(x - r * 0.8, y + r * 0.85, x, y + r * 0.85);
  ctx.quadraticCurveTo(x + r * 0.8, y + r * 0.85, x + r * 0.85, y - r * 0.05);
  ctx.closePath();
  fillStroke(ctx, '#7ab8ff', lw);
  ctx.strokeStyle = '#fff2c4';
  ctx.lineCap = 'round';
  for (let i = 0; i < 18; i++) {
    const xx = x + (hash(i + 5) - 0.5) * r * 1.4;
    const yy = y - r * 0.05 - hash(i + 9) * r * 0.45;
    ctx.lineWidth = r * 0.11;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.moveTo(xx, yy);
    ctx.lineTo(xx + r * 0.18, yy + (hash(i) - 0.5) * r * 0.2);
    ctx.stroke();
    ctx.lineWidth = r * 0.07;
    ctx.strokeStyle = i % 3 ? '#fff2c4' : '#ffe38a';
    ctx.stroke();
  }
}

export function pepperoni(ctx, x, y, r) {
  ellipse(ctx, x, y, r, r * 0.95);
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, '#ef5a3c');
  g.addColorStop(1, '#b8221c');
  fillStroke(ctx, g, r * 0.12);
  ctx.fillStyle = 'rgba(255,200,170,0.8)';
  for (let i = 0; i < 5; i++) {
    const a = hash(i + 61) * TAU;
    ellipse(ctx, x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.45, r * 0.12, r * 0.1);
    ctx.fill();
  }
}

export function mushroom(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.quadraticCurveTo(x - r, y - r * 0.95, x, y - r * 0.95);
  ctx.quadraticCurveTo(x + r, y - r * 0.95, x + r, y);
  ctx.lineTo(x + r * 0.35, y);
  ctx.lineTo(x + r * 0.4, y + r * 0.8);
  ctx.quadraticCurveTo(x, y + r * 0.95, x - r * 0.4, y + r * 0.8);
  ctx.lineTo(x - r * 0.35, y);
  ctx.closePath();
  fillStroke(ctx, '#efe0c8', r * 0.12);
  ctx.strokeStyle = '#a88a68';
  ctx.lineWidth = r * 0.08;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.8, y - r * 0.05);
  ctx.quadraticCurveTo(x, y - r * 0.25, x + r * 0.8, y - r * 0.05);
  ctx.stroke();
}

export function pepperRing(ctx, x, y, r) {
  ctx.lineWidth = r * 0.5;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.8, r * 0.7, 0.3, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = r * 0.3;
  ctx.strokeStyle = '#3fbf3a';
  ctx.stroke();
}

export function oliveRing(ctx, x, y, r) {
  ctx.lineWidth = r * 0.55;
  ctx.strokeStyle = '#120c10';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.62, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = r * 0.3;
  ctx.strokeStyle = '#3a3640';
  ctx.stroke();
}

export function pineappleChunk(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x - r * 0.8, y - r * 0.5);
  ctx.lineTo(x + r * 0.8, y - r * 0.6);
  ctx.lineTo(x + r * 0.55, y + r * 0.7);
  ctx.lineTo(x - r * 0.6, y + r * 0.6);
  ctx.closePath();
  fillStroke(ctx, '#ffd93a', r * 0.12);
  shine(ctx, x - r * 0.2, y - r * 0.2, r * 0.3, r * 0.1, -0.1, 0.5);
}

function pepper(ctx, x, y, r) {
  // a whole green pepper with a ring beside it
  ctx.beginPath();
  ctx.moveTo(x - r * 0.05, y - r * 0.5);
  ctx.bezierCurveTo(x - r * 0.9, y - r * 0.6, x - r * 0.75, y + r * 0.8, x - r * 0.2, y + r * 0.85);
  ctx.quadraticCurveTo(x + r * 0.05, y + r * 0.7, x + r * 0.25, y + r * 0.85);
  ctx.bezierCurveTo(x + r * 0.8, y + r * 0.75, x + r * 0.85, y - r * 0.6, x - r * 0.05, y - r * 0.5);
  fillStroke(ctx, '#3fbf3a', r * 0.09);
  ctx.strokeStyle = '#2a8a2a';
  ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.35);
  ctx.quadraticCurveTo(x - r * 0.05, y + r * 0.2, x + r * 0.02, y + r * 0.7);
  ctx.stroke();
  ctx.strokeStyle = '#2f7a2a';
  ctx.lineWidth = r * 0.16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.05, y - r * 0.5);
  ctx.quadraticCurveTo(x - r * 0.05, y - r * 0.8, x + r * 0.25, y - r * 0.85);
  ctx.stroke();
  shine(ctx, x - r * 0.4, y - r * 0.05, r * 0.08, r * 0.25, 0.1);
}

function olive(ctx, x, y, r) {
  for (const [dx, dy] of [[-0.35, 0.2], [0.35, 0.25], [0, -0.3]]) {
    ellipse(ctx, x + dx * r, y + dy * r, r * 0.42, r * 0.36);
    fillStroke(ctx, '#2b2731', r * 0.08);
    ellipse(ctx, x + dx * r, y + dy * r, r * 0.14, r * 0.12);
    ctx.fillStyle = '#7a1f2a';
    ctx.fill();
    shine(ctx, x + dx * r - r * 0.18, y + dy * r - r * 0.14, r * 0.1, r * 0.05, -0.5, 0.6);
  }
}

function pepperoniPile(ctx, x, y, r) {
  pepperoni(ctx, x - r * 0.35, y + r * 0.25, r * 0.48);
  pepperoni(ctx, x + r * 0.35, y + r * 0.2, r * 0.48);
  pepperoni(ctx, x, y - r * 0.3, r * 0.5);
}

function mushroomPile(ctx, x, y, r) {
  mushroom(ctx, x - r * 0.3, y + r * 0.25, r * 0.5);
  mushroom(ctx, x + r * 0.3, y - r * 0.2, r * 0.55);
}

const DRAW_ING = {
  mango, strawberry, banana, pineapple, straw, umbrella, bread, ham, pork, cheese, pickles, tortilla, beef, chicken,
  lettuce, tomato, avocado, hotsauce, sprinkles, cherry, sugar, salt, sauce, mozzarella,
  pepperoni: pepperoniPile, mushroom: mushroomPile, pepper, olive,
  vanilla: (c, x, y, r) => tub(c, x, y, r, 'vanilla'),
  chocolate: (c, x, y, r) => tub(c, x, y, r, 'chocolate'),
  berry: (c, x, y, r) => tub(c, x, y, r, 'berry'),
  mint: (c, x, y, r) => tub(c, x, y, r, 'mint'),
  churro: (c, x, y, r) => rawPile(c, 'churro', x, y, r),
  tostone: (c, x, y, r) => rawPile(c, 'tostone', x, y, r),
  empanada: (c, x, y, r) => rawPile(c, 'empanada', x, y, r),
};

// An ingredient's picture, fitting a circle of radius r.
export function drawIng(ctx, id, x, y, r) {
  const f = DRAW_ING[id];
  ctx.save();
  if (f) f(ctx, x, y, r);
  else {
    ctx.beginPath();
    ctx.arc(x, y, r * 0.6, 0, TAU);
    fillStroke(ctx, ING[id]?.colour || '#cccccc', r * 0.08);
  }
  ctx.restore();
}

// The same small, for ingredient strips: what a whole scoop of ice cream is rather than a tub.
export function drawIngSmall(ctx, id, x, y, r) {
  if (['vanilla', 'chocolate', 'berry', 'mint'].includes(id)) {
    ctx.save();
    scoop(ctx, x, y + r * 0.1, r * 0.85, id, r * 0.12);
    ctx.restore();
  } else if (['churro', 'tostone', 'empanada'].includes(id)) {
    ctx.save();
    friedPiece(ctx, id, x, y, r * 0.85, 1, id === 'churro' ? -0.5 : 0);
    ctx.restore();
  } else if (id === 'pepperoni') {
    ctx.save();
    pepperoni(ctx, x, y, r * 0.8);
    ctx.restore();
  } else if (id === 'mushroom') {
    ctx.save();
    mushroom(ctx, x, y, r * 0.8);
    ctx.restore();
  } else if (id === 'olive') {
    ctx.save();
    oliveRing(ctx, x, y, r * 0.9);
    ctx.restore();
  } else if (id === 'pepper') {
    ctx.save();
    pepperRing(ctx, x, y, r * 0.9);
    ctx.restore();
  } else drawIng(ctx, id, x, y, r);
}

// ---------------------------------------------------------------------------------------------
// Dishes
// ---------------------------------------------------------------------------------------------

// The colour a blend of these ingredients makes.
export function blendColour(items) {
  if (!items.length) return '#ffffff';
  const cols = items.map((i) => ({ mango: '#ffa41e', strawberry: '#ff3b5c', banana: '#ffe680', pineapple: '#ffd23a',
    pickles: '#7fc23a', hotsauce: '#e8201a', chocolate: '#7a4326' }[i] || ING[i]?.colour || '#ffffff'));
  let r = 0;
  let g = 0;
  let b = 0;
  for (const c of cols) {
    const p = parseInt(c.slice(1), 16);
    r += (p >> 16) & 255;
    g += (p >> 8) & 255;
    b += p & 255;
  }
  const n = cols.length;
  const out = (v) => Math.round(v / n).toString(16).padStart(2, '0');
  return mix(`#${out(r)}${out(g)}${out(b)}`, '#ffffff', 0.12);
}

// A smoothie in a tall cup, (x, y) the cup's bottom middle, s its height.
// opts.fill 0..1 how full, opts.colour overrides.
export function drawSmoothieCup(ctx, dish, x, y, s, opts = {}) {
  const lw = s * 0.03;
  const top = y - s;
  const wT = s * 0.36;
  const wB = s * 0.26;
  const fill = opts.fill ?? 1;
  const col = opts.colour || blendColour([...(dish.fruits || []), ...(dish.extras || [])]);
  const toppers = dish.toppers || [];
  // straw behind the foam
  if (toppers.includes('straw')) {
    ctx.save();
    ctx.translate(x + s * 0.08, top + s * 0.1);
    ctx.rotate(0.28);
    roundRect(ctx, -s * 0.045, -s * 0.42, s * 0.09, s * 0.7, s * 0.03);
    fillStroke(ctx, '#ffffff', lw * 0.8);
    ctx.save();
    roundRect(ctx, -s * 0.045, -s * 0.42, s * 0.09, s * 0.7, s * 0.03);
    ctx.clip();
    ctx.fillStyle = '#ff4f9a';
    for (let k = 0; k < 8; k++) ctx.fillRect(-s * 0.1, -s * 0.42 + k * s * 0.1, s * 0.2, s * 0.045);
    ctx.restore();
    ctx.restore();
  }
  const cup = () => {
    ctx.beginPath();
    ctx.moveTo(x - wT, top);
    ctx.lineTo(x + wT, top);
    ctx.lineTo(x + wB, y);
    ctx.quadraticCurveTo(x, y + s * 0.03, x - wB, y);
    ctx.closePath();
  };
  cup();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fill();
  if (fill > 0) {
    ctx.save();
    cup();
    ctx.clip();
    const fy = y - (s * 0.92) * fill;
    const g = ctx.createLinearGradient(0, fy, 0, y);
    g.addColorStop(0, mix(col, '#ffffff', 0.25));
    g.addColorStop(1, mix(col, '#3b2314', 0.08));
    ctx.fillStyle = g;
    ctx.fillRect(x - s, fy, s * 2, s * 2);
    // little fruit bits in the smoothie
    ctx.fillStyle = mix(col, '#3b2314', 0.18);
    for (let i = 0; i < 9; i++) {
      const yy = fy + s * 0.08 + hash(i + 21) * (y - fy - s * 0.12);
      if (yy > y) continue;
      ellipse(ctx, x + (hash(i + 3) - 0.5) * wB * 1.6, yy, s * 0.016, s * 0.012);
      ctx.fill();
    }
    ctx.restore();
    if (fill >= 0.98 && !opts.noFoam) {
      // a frothy domed top
      ctx.beginPath();
      ctx.moveTo(x - wT * 0.98, top + s * 0.02);
      for (let i = 0; i <= 5; i++) {
        const k = i / 5;
        ctx.arc(x - wT * 0.8 + k * wT * 1.6, top - s * 0.01 - Math.sin(k * Math.PI) * s * 0.06, s * 0.07, Math.PI, 0);
      }
      ctx.lineTo(x + wT * 0.98, top + s * 0.02);
      ctx.closePath();
      fillStroke(ctx, mix(col, '#ffffff', 0.45), lw);
    }
  }
  cup();
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // cup stripe and gloss
  shine(ctx, x - wT * 0.62, top + s * 0.42, s * 0.025, s * 0.3, 0.12, 0.7);
  if (toppers.includes('umbrella')) {
    ctx.save();
    ctx.translate(x - wT * 0.55, top - s * 0.1);
    ctx.rotate(-0.4);
    umbrella(ctx, 0, 0, s * 0.3);
    ctx.restore();
  }
  // a slice of the first fruit on the rim
  const f = (dish.fruits || [])[0];
  if (f && fill >= 0.98 && opts.garnish !== false) {
    ctx.save();
    ctx.translate(x + wT * 0.95, top + s * 0.04);
    drawIngSmall(ctx, f, 0, 0, s * 0.12);
    ctx.restore();
  }
}

// A Cuban sandwich side-on: (x, y) bottom middle, w its length. pressed: 0..1 how squashed.
export function drawSandwich(ctx, layers, x, y, w, opts = {}) {
  const lw = w * 0.022;
  const pressed = opts.pressed || 0;
  const cook = opts.cook || null; // null raw, 'good' toasty, 'over' dark
  const breadCol = cook === 'over' ? '#8a4a1a' : mix('#f1bd6a', '#d98b32', pressed);
  const sq = (1 - pressed * 0.35) * 1.35;
  let yy = y;
  const half = w / 2;
  const bottom = layers[0] === 'bread' || opts.loaf;
  // bottom bread
  if (bottom) {
    const h = w * 0.085 * sq;
    ctx.beginPath();
    ctx.moveTo(x - half, yy - h);
    ctx.lineTo(x + half, yy - h);
    ctx.quadraticCurveTo(x + half + w * 0.02, yy, x + half - w * 0.06, yy);
    ctx.lineTo(x - half + w * 0.06, yy);
    ctx.quadraticCurveTo(x - half - w * 0.02, yy, x - half, yy - h);
    fillStroke(ctx, breadCol, lw);
    ctx.fillStyle = '#fff1cf';
    ctx.fillRect(x - half + lw, yy - h + lw * 0.5, w - lw * 2, h * 0.28);
    yy -= h;
  }
  for (const l of layers) {
    if (l === 'bread') continue;
    if (l === 'ham') {
      const h = w * 0.07 * sq;
      ctx.beginPath();
      ctx.moveTo(x - half - w * 0.03, yy);
      for (let i = 0; i <= 10; i++) ctx.lineTo(x - half - w * 0.03 + (i / 10) * (w + w * 0.06), yy - h - Math.sin(i * 1.7) * h * 0.25);
      ctx.lineTo(x + half + w * 0.03, yy);
      ctx.closePath();
      fillStroke(ctx, '#ff9db0', lw);
      ctx.strokeStyle = '#ffd0da';
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath();
      ctx.moveTo(x - half, yy - h * 0.5);
      ctx.lineTo(x + half, yy - h * 0.55);
      ctx.stroke();
      yy -= h;
    } else if (l === 'pork') {
      const h = w * 0.08 * sq;
      ctx.beginPath();
      ctx.moveTo(x - half - w * 0.02, yy);
      for (let i = 0; i <= 12; i++) ctx.lineTo(x - half - w * 0.02 + (i / 12) * (w + w * 0.04), yy - h - (hash(i + 7) - 0.3) * h * 0.4);
      ctx.lineTo(x + half + w * 0.02, yy);
      ctx.closePath();
      fillStroke(ctx, '#c27a44', lw);
      ctx.strokeStyle = '#8a4a22';
      ctx.lineWidth = lw * 0.7;
      for (let i = 0; i < 9; i++) {
        const xx = x - half + (i + 0.5) * (w / 9);
        ctx.beginPath();
        ctx.moveTo(xx, yy - h * 0.2);
        ctx.lineTo(xx + w * 0.02, yy - h * 0.8);
        ctx.stroke();
      }
      yy -= h;
    } else if (l === 'cheese') {
      const h = w * 0.04 * sq;
      ctx.beginPath();
      ctx.moveTo(x - half - w * 0.02, yy - h);
      ctx.lineTo(x + half + w * 0.02, yy - h);
      ctx.lineTo(x + half + w * 0.02, yy);
      // melty drips, longer when pressed
      for (let i = 6; i >= 0; i--) {
        const xx = x - half + (i / 6) * w;
        ctx.lineTo(xx + w * 0.03, yy);
        ctx.quadraticCurveTo(xx, yy + h * (0.8 + pressed * 1.8) * (i % 2 ? 1 : 0.5), xx - w * 0.03, yy);
      }
      ctx.lineTo(x - half - w * 0.02, yy);
      ctx.closePath();
      fillStroke(ctx, '#ffd23a', lw);
      yy -= h;
    } else if (l === 'pickles') {
      const h = w * 0.035 * sq;
      for (let i = 0; i < 4; i++) {
        const xx = x - half * 0.75 + (i / 3) * half * 1.5;
        ellipse(ctx, xx, yy - h * 0.5, w * 0.09, h * 0.75);
        fillStroke(ctx, '#7ec850', lw * 0.8);
        ctx.fillStyle = '#c8ec8a';
        ellipse(ctx, xx, yy - h * 0.5, w * 0.06, h * 0.35);
        ctx.fill();
      }
      yy -= h;
    } else {
      // anything else from the free kitchen: a slice of it
      const h = w * 0.07 * sq;
      ctx.save();
      drawIngSmall(ctx, l, x + (hash(yy) - 0.5) * w * 0.4, yy - h * 0.5, h * 1.1);
      ctx.restore();
      yy -= h * 0.8;
    }
  }
  for (const e of opts.extras || []) {
    const h = w * 0.07;
    ctx.save();
    drawIngSmall(ctx, e, x + (hash(yy) - 0.5) * w * 0.5, yy - h * 0.5, h);
    ctx.restore();
    yy -= h * 0.7;
  }
  // top bread
  if (opts.lid) {
    const h = w * 0.2 * sq;
    ctx.beginPath();
    ctx.moveTo(x - half, yy);
    ctx.quadraticCurveTo(x - half - w * 0.02, yy - h, x - half + w * 0.15, yy - h);
    ctx.lineTo(x + half - w * 0.15, yy - h);
    ctx.quadraticCurveTo(x + half + w * 0.02, yy - h, x + half, yy);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, yy - h, 0, yy);
    g.addColorStop(0, cook === 'over' ? '#5a2a0a' : mix('#f8d48a', '#d9862c', pressed));
    g.addColorStop(1, breadCol);
    fillStroke(ctx, g, lw);
    if (pressed > 0.3) {
      // grill stripes
      ctx.strokeStyle = cook === 'over' ? '#1a0c04' : 'rgba(110,50,10,0.75)';
      ctx.lineWidth = w * 0.025;
      ctx.lineCap = 'round';
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - half, yy - h, w, h);
      ctx.clip();
      for (let i = 0; i < 7; i++) {
        const xx = x - half + w * 0.08 + i * w * 0.14;
        ctx.beginPath();
        ctx.moveTo(xx, yy - h * 0.15);
        ctx.lineTo(xx + w * 0.07, yy - h * 0.9);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      shine(ctx, x - half * 0.3, yy - h * 0.7, w * 0.22, h * 0.12, -0.03, 0.55);
      ctx.strokeStyle = '#b0661f';
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(x - half * 0.6, yy - h * 0.55);
      ctx.quadraticCurveTo(x, yy - h * 0.8, x + half * 0.6, yy - h * 0.55);
      ctx.stroke();
    }
    yy -= h;
  }
  return yy;
}

// A taco side-on in its shell: (x, y) bottom middle, w its width.
export function drawTaco(ctx, dish, x, y, w, opts = {}) {
  const lw = w * 0.025;
  const r = w / 2;
  const cy = y - r * 0.95;
  const fillings = dish.fillings || [];
  const items = [...fillings, ...(dish.extras || [])];
  // what's inside, peeking over the rim
  if (dish.tortilla !== false || opts.shell) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - r * 1.2, cy - r * 1.2, r * 2.4, r * 1.25);
    ctx.clip();
    const order = ['beef', 'chicken'];
    const sortedItems = items.slice().sort((a, b) => (order.includes(b) ? 1 : 0) - (order.includes(a) ? 1 : 0));
    sortedItems.forEach((it, i) => {
      if (it === 'hotsauce') return;
      const k = sortedItems.length > 1 ? i / (sortedItems.length - 1) : 0.5;
      const h = r * (0.12 + i * 0.1);
      tacoBand(ctx, it, x, cy - h, r * (0.86 - k * 0.1), lw, i);
    });
    ctx.restore();
  } else {
    // fillings without a shell: a sad heap
    items.forEach((it, i) => {
      ctx.save();
      drawIngSmall(ctx, it, x + (hash(i + 2) - 0.5) * r, y - r * 0.3 - i * r * 0.15, r * 0.35);
      ctx.restore();
    });
  }
  if (dish.tortilla !== false || opts.shell) {
    // the shell: a folded tortilla seen side-on, a filled half moon
    ctx.beginPath();
    ctx.moveTo(x - r * 1.02, cy);
    ctx.arc(x, cy, r * 1.02, Math.PI, 0, true);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, cy, 0, cy + r);
    g.addColorStop(0, '#ffe39a');
    g.addColorStop(1, '#e2a94a');
    fillStroke(ctx, g, lw);
    ctx.strokeStyle = 'rgba(170,110,40,0.6)';
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    ctx.arc(x, cy, r * 0.8, Math.PI * 0.12, Math.PI * 0.88);
    ctx.stroke();
    ctx.fillStyle = 'rgba(160,90,30,0.5)';
    for (let i = 0; i < 9; i++) {
      const a = 0.3 + hash(i + 5) * 2.5;
      const d = r * (0.3 + hash(i + 11) * 0.6);
      ellipse(ctx, x + Math.cos(a) * d, cy + Math.sin(a) * d, r * 0.05, r * 0.03, a);
      ctx.fill();
    }
    shine(ctx, x - r * 0.55, cy + r * 0.55, r * 0.16, r * 0.05, 0.8, 0.5);
  }
  if (items.includes('hotsauce')) {
    const n = items.filter((i) => i === 'hotsauce').length;
    ctx.strokeStyle = '#d8120a';
    ctx.lineWidth = r * 0.07;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let k = 0; k < n; k++) {
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const xx = x - r * 0.75 + (i / 8) * r * 1.5;
        ctx.lineTo(xx, cy - r * (0.32 + k * 0.08 + Math.min(0.35, fillings.length * 0.08)) + (i % 2 ? -r * 0.1 : r * 0.08));
      }
      ctx.stroke();
    }
  }
}

function tacoBand(ctx, it, x, y, r, lw, seed) {
  if (it === 'beef' || it === 'chicken') {
    const cols = it === 'beef' ? ['#8a4b2a', '#6b3519', '#a35a30'] : ['#eab872', '#d9963f', '#f2cf8f'];
    for (let i = 0; i < 16; i++) {
      const xx = x - r + (i / 15) * r * 2;
      const rr = r * (0.13 + hash(i + seed * 9) * 0.06);
      ellipse(ctx, xx, y + hash(i + 3) * r * 0.08, rr * (it === 'chicken' ? 1.5 : 1), rr * 0.8, hash(i) * 2);
      fillStroke(ctx, cols[i % 3], lw * 0.8);
    }
  } else if (it === 'lettuce') {
    for (let i = 0; i < 6; i++) leaf(ctx, x - r * 0.8 + i * r * 0.32, y - r * 0.02, r * 0.26, -0.6 + i * 0.25, i % 2 ? '#5fd35a' : '#7fe06a');
  } else if (it === 'tomato') {
    for (let i = 0; i < 6; i++) {
      const xx = x - r * 0.75 + i * r * 0.3;
      roundRect(ctx, xx - r * 0.1, y - r * 0.1 - (i % 2) * r * 0.06, r * 0.2, r * 0.18, r * 0.04);
      fillStroke(ctx, '#ff3b2e', lw * 0.8);
    }
  } else if (it === 'cheese') {
    ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const xx = x - r * 0.85 + i * r * 0.15;
      const yy = y - r * 0.05 - hash(i + seed) * r * 0.12;
      ctx.strokeStyle = INK;
      ctx.lineWidth = r * 0.09;
      ctx.beginPath();
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx + r * 0.12, yy - r * 0.08 + hash(i) * r * 0.16);
      ctx.stroke();
      ctx.strokeStyle = '#ffd23a';
      ctx.lineWidth = r * 0.055;
      ctx.stroke();
    }
  } else if (it === 'avocado') {
    for (let i = 0; i < 4; i++) {
      const xx = x - r * 0.6 + i * r * 0.4;
      ctx.save();
      ctx.translate(xx, y - r * 0.08);
      ctx.rotate(-0.4 + i * 0.25);
      ellipse(ctx, 0, 0, r * 0.2, r * 0.1);
      fillStroke(ctx, '#b8e06a', lw * 0.8);
      ctx.strokeStyle = '#2f6b22';
      ctx.lineWidth = lw * 0.9;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.2, r * 0.1, 0, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
      ctx.restore();
    }
  } else {
    for (let i = 0; i < 3; i++) {
      ctx.save();
      drawIngSmall(ctx, it, x - r * 0.5 + i * r * 0.5, y - r * 0.08, r * 0.2);
      ctx.restore();
    }
  }
}

// A waffle cone with its scoops: (x, y) the cone's tip, s the cone's height.
export function drawCone(ctx, dish, x, y, s, opts = {}) {
  const lw = s * 0.035;
  const wTop = s * 0.42;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - wTop, y - s);
  ctx.quadraticCurveTo(x, y - s - s * 0.08, x + wTop, y - s);
  ctx.closePath();
  const g = ctx.createLinearGradient(x - wTop, 0, x + wTop, 0);
  g.addColorStop(0, '#f2b45a');
  g.addColorStop(1, '#d98a32');
  fillStroke(ctx, g, lw);
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(140,70,20,0.6)';
  ctx.lineWidth = lw * 0.6;
  for (let k = -6; k <= 6; k++) {
    ctx.beginPath();
    ctx.moveTo(x + k * s * 0.14 - s, y - s * 1.2);
    ctx.lineTo(x + k * s * 0.14 + s * 0.4, y + s * 0.2);
    ctx.moveTo(x + k * s * 0.14 + s, y - s * 1.2);
    ctx.lineTo(x + k * s * 0.14 - s * 0.4, y + s * 0.2);
    ctx.stroke();
  }
  ctx.restore();
  const scoops = dish.scoops || [];
  const n = scoops.length;
  const r = s * 0.48;
  // tall towers squash closer together and wobble
  const pitch = n > 4 ? r * Math.max(0.55, 1.15 - n * 0.05) : r * 1.05;
  let top = y - s;
  const t = opts.t || 0;
  scoops.forEach((f, i) => {
    const wob = n > 4 ? Math.sin(t * 2.5 + i * 0.6) * i * s * 0.012 : 0;
    const cy = y - s - r * 0.35 - i * pitch;
    scoop(ctx, x + wob, cy, r, f, lw);
    top = cy - r * 0.85;
  });
  const topX = n > 4 ? x + Math.sin(t * 2.5 + (n - 1) * 0.6) * (n - 1) * s * 0.012 : x;
  if (dish.sprinkles || opts.sprinkleMarks) {
    const count = dish.sprinkles ? 26 : Math.min(26, opts.sprinkleMarks || 0);
    const topCy = y - s - r * 0.35 - Math.max(0, n - 1) * pitch;
    for (let i = 0; i < count; i++) {
      const a = Math.PI * (1.05 + hash(i + 3) * 0.9);
      const d = r * (0.35 + hash(i + 8) * 0.45);
      ctx.save();
      ctx.translate(topX + Math.cos(a) * d, topCy - r * 0.05 + Math.sin(a) * d * 0.9);
      ctx.rotate(hash(i) * 3);
      ctx.fillStyle = SPRINKLE_COLS[i % SPRINKLE_COLS.length];
      roundRect(ctx, -s * 0.035, -s * 0.012, s * 0.07, s * 0.024, s * 0.012);
      ctx.fill();
      ctx.restore();
    }
  }
  (dish.extras || []).forEach((e, i) => {
    ctx.save();
    drawIngSmall(ctx, e, topX + (i % 2 ? 1 : -1) * r * 0.45, top + r * 0.4 + i * 2, r * 0.42);
    ctx.restore();
  });
  if (dish.cherry) {
    ctx.save();
    cherry(ctx, topX + s * 0.04, top - s * 0.06, s * 0.2);
    ctx.restore();
    top -= s * 0.25;
  }
  return top;
}

// A red-and-white paper boat of fried things: (x, y) the boat's bottom middle, w its width.
// cooks: per piece 'good' | 'over' | 'raw' (defaults to good).
export function drawFriedBoat(ctx, dish, x, y, w, opts = {}) {
  const lw = w * 0.022;
  const h = w * 0.3;
  const pieces = dish.pieces || [];
  const cooks = dish.cooks || [];
  // pieces sit in the boat
  pieces.forEach((p, i) => {
    const n = pieces.length;
    const k = n > 1 ? i / (n - 1) - 0.5 : 0;
    const d = cooks[i] === 'over' ? 2 : cooks[i] === 'raw' ? 0 : 1;
    const pr = w * (n > 4 ? 0.16 : 0.2);
    const px = x + k * w * 0.62;
    const py = y - h - pr * 0.35 - (i % 2) * w * 0.06;
    friedPiece(ctx, p, px, py, pr, d, p === 'churro' ? -1.1 + k * 0.9 : k * 0.4);
  });
  // sugar or salt on top
  const shakes = [dish.shake, ...(dish.extras || []).filter((e) => e === 'sugar' || e === 'salt' || e === 'sprinkles')].filter(Boolean);
  const marks = opts.shakeMarks || 0;
  shakes.forEach((sh, j) => {
    const cols = sh === 'sugar' ? ['#ffffff', '#c27a3a', '#fff4dc'] : sh === 'salt' ? ['#ffffff', '#e8f0ff'] : SPRINKLE_COLS;
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(x + (hash(i + 70 + j * 9) - 0.5) * w * 0.8, y - h * 0.8 - hash(i + 90 + j * 9) * w * 0.25, w * 0.016, w * 0.016);
    }
  });
  if (marks && !dish.shake) {
    for (let i = 0; i < Math.min(40, marks); i++) {
      ctx.fillStyle = opts.shakeTool === 'salt' ? '#ffffff' : i % 2 ? '#ffffff' : '#c27a3a';
      ctx.fillRect(x + (hash(i + 170) - 0.5) * w * 0.8, y - h * 0.8 - hash(i + 190) * w * 0.25, w * 0.016, w * 0.016);
    }
  }
  (dish.extras || []).filter((e) => e === 'hotsauce').forEach((_, k) => {
    ctx.strokeStyle = '#d8120a';
    ctx.lineWidth = w * 0.025;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) ctx.lineTo(x - w * 0.3 + (i / 8) * w * 0.6, y - h - w * 0.06 * k + (i % 2 ? -w * 0.04 : w * 0.03));
    ctx.stroke();
  });
  // the boat
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, y - h);
  ctx.lineTo(x + w * 0.5, y - h);
  ctx.lineTo(x + w * 0.4, y);
  ctx.lineTo(x - w * 0.4, y);
  ctx.closePath();
  fillStroke(ctx, '#ffffff', lw);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#ff4b4b';
  const c = w * 0.09;
  for (let i = -6; i < 6; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) ctx.fillRect(x + i * c, y - h + j * c, c, c);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, y - h);
  ctx.lineTo(x + w * 0.5, y - h);
  ctx.lineTo(x + w * 0.4, y);
  ctx.lineTo(x - w * 0.4, y);
  ctx.closePath();
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

// Where the n-th topping of a pizza sits, in -1..1 of its radius.
export function toppingSpot(i, n) {
  if (n <= 1) return [0, 0];
  const ring = i < 6 ? 0 : 1;
  const inRing = ring === 0 ? Math.min(n, 6) : n - 6;
  const k = ring === 0 ? i : i - 6;
  const a = (k / inRing) * TAU + (ring ? 0.4 : -Math.PI / 2);
  const d = ring === 0 ? (n === 2 ? 0.35 : 0.48) : 0.18 + (k % 2) * 0.06;
  return [Math.cos(a) * d, Math.sin(a) * d];
}

// A pizza from above: (x, y) its middle, r its radius.
// opts: sauce 0..1, cheese 0..1 (part-done), bake 0..2 (raw, golden, dark), marks.
export function drawPizza(ctx, dish, x, y, r, opts = {}) {
  const lw = r * 0.04;
  const bake = opts.bake ?? (dish.cook === 'over' ? 2 : dish.cook === 'good' ? 1 : 0);
  const crust = bake <= 1 ? mix('#f6dca0', '#e5a54a', bake) : mix('#e5a54a', '#4a2a14', (bake - 1) * 0.9);
  ellipse(ctx, x, y, r, r * 0.97);
  fillStroke(ctx, crust, lw);
  ellipse(ctx, x, y, r * 0.84, r * 0.82);
  ctx.fillStyle = bake <= 1 ? mix('#fbe6b8', '#f0c070', bake) : mix('#f0c070', '#6b3a1a', bake - 1);
  ctx.fill();
  // sauce
  const sauceK = dish.sauce ? 1 : opts.sauce || 0;
  if (sauceK > 0) {
    ctx.save();
    ellipse(ctx, x, y, r * 0.82, r * 0.8);
    ctx.clip();
    ctx.fillStyle = mix('#e5352b', '#a01a12', bake > 1 ? bake - 1 : 0);
    if (dish.sauce) {
      ellipse(ctx, x, y, r * 0.8, r * 0.78);
      ctx.fill();
    } else {
      ctx.globalAlpha = 0.5 + 0.5 * sauceK;
      for (const m of opts.marks || []) {
        if (m.tool !== 'sauce') continue;
        ctx.beginPath();
        ctx.arc(x + (m.u * 2 - 1) * r, y + (m.v * 2 - 1) * r, r * 0.2, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = sauceK * 0.6;
      ellipse(ctx, x, y, r * 0.8 * sauceK, r * 0.78 * sauceK);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  // cheese
  const cheeseK = dish.cheese ? 1 : opts.cheese || 0;
  if (cheeseK > 0) {
    ctx.save();
    ellipse(ctx, x, y, r * 0.8, r * 0.78);
    ctx.clip();
    const melted = bake >= 0.5;
    const cc = bake <= 1 ? mix('#fff4cf', '#ffd77a', bake) : mix('#ffd77a', '#7a4a1a', bake - 1);
    if (melted && dish.cheese) {
      ctx.fillStyle = cc;
      ctx.beginPath();
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU;
        const rr = r * (0.68 + hash(i + 33) * 0.1);
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.fill();
      // golden blisters
      ctx.fillStyle = bake > 1.4 ? '#3a1f0e' : 'rgba(214,140,50,0.75)';
      for (let i = 0; i < 9; i++) {
        const a = hash(i + 51) * TAU;
        const d = Math.sqrt(hash(i + 52)) * r * 0.62;
        ellipse(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.07, r * 0.05, a);
        ctx.fill();
      }
    } else {
      const n = Math.floor(60 * cheeseK);
      ctx.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const a = hash(i + 101) * TAU;
        const d = Math.sqrt(hash(i + 102)) * r * 0.74;
        const xx = x + Math.cos(a) * d;
        const yy = y + Math.sin(a) * d;
        const ang = hash(i + 103) * 3;
        ctx.strokeStyle = 'rgba(160,110,40,0.7)';
        ctx.lineWidth = r * 0.06;
        ctx.beginPath();
        ctx.moveTo(xx, yy);
        ctx.lineTo(xx + Math.cos(ang) * r * 0.12, yy + Math.sin(ang) * r * 0.12);
        ctx.stroke();
        ctx.strokeStyle = cc;
        ctx.lineWidth = r * 0.04;
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  // toppings
  const tops = [...(dish.toppings || []), ...(dish.extras || [])];
  tops.forEach((tp, i) => {
    const [u, v] = toppingSpot(i, tops.length);
    const tx = x + u * r;
    const ty = y + v * r;
    const tr = r * (tops.length > 8 ? 0.11 : 0.15);
    ctx.save();
    if (tp === 'pepperoni') pepperoni(ctx, tx, ty, tr);
    else if (tp === 'mushroom') mushroom(ctx, tx, ty, tr);
    else if (tp === 'pepper') pepperRing(ctx, tx, ty, tr);
    else if (tp === 'olive') oliveRing(ctx, tx, ty, tr * 0.9);
    else if (tp === 'pineapple') pineappleChunk(ctx, tx, ty, tr);
    else drawIngSmall(ctx, tp, tx, ty, tr * 1.1);
    ctx.restore();
  });
  if (bake > 1.3) {
    ctx.fillStyle = 'rgba(30,15,5,0.55)';
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU + 0.3;
      ellipse(ctx, x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.88, r * 0.1, r * 0.06, a);
      ctx.fill();
    }
  }
  shine(ctx, x - r * 0.55, y - r * 0.55, r * 0.2, r * 0.06, -0.8, 0.4);
}

// A finished dish (or an order) at size s, centred on (x, y) as a picture.
export function drawDish(ctx, dish, x, y, s, t = 0) {
  ctx.save();
  switch (dish.kind) {
    case 'smoothie':
      drawSmoothieCup(ctx, dish, x, y + s * 0.42, s * 0.78);
      break;
    case 'sandwich':
      drawSandwich(ctx, dish.layers, x, y + s * 0.2, s * 0.9, { lid: true, pressed: 0.45, cook: dish.cook === 'over' ? 'over' : 'good', extras: dish.extras });
      break;
    case 'taco':
      drawTaco(ctx, dish, x, y + s * 0.3, s * 0.86);
      break;
    case 'icecream': {
      const n = (dish.scoops || []).length;
      const k = n > 3 ? 3 / n : 1;
      drawCone(ctx, dish, x, y + s * 0.48, s * 0.46 * Math.max(0.55, k), { t });
      break;
    }
    case 'fried':
      drawFriedBoat(ctx, dish, x, y + s * 0.25, s * 0.85);
      break;
    case 'pizza':
      drawPizza(ctx, { ...dish, sauce: dish.sauce !== false }, x, y, s * 0.42, { bake: dish.cook === 'over' ? 2 : 1 });
      break;
    default:
  }
  ctx.restore();
}

// The ingredients of an order as a row of little pictures (in order where order matters):
// [{ id, no }] where no = shown crossed out.
export function recipeStrip(o) {
  const out = [];
  const add = (id, no = false) => out.push({ id, no });
  if (o.kind === 'smoothie') {
    o.fruits.forEach((f) => add(f));
    o.toppers.filter((x) => x !== 'straw').forEach((f) => add(f));
  } else if (o.kind === 'sandwich') {
    o.layers.forEach((l) => add(l));
    (o.no || []).forEach((l) => add(l, true));
  } else if (o.kind === 'taco') {
    add('tortilla');
    o.fillings.forEach((f) => add(f));
  } else if (o.kind === 'icecream') {
    o.scoops.forEach((f) => add(f));
    if (o.sprinkles) add('sprinkles');
    if (o.cherry) add('cherry');
  } else if (o.kind === 'fried') {
    o.pieces.forEach((p) => add(p));
    if (o.shake) add(o.shake);
  } else if (o.kind === 'pizza') {
    o.toppings.forEach((p) => add(p));
    (o.no || []).forEach((l) => add(l, true));
  }
  return out;
}

// A red "no" ring with a slash over whatever was drawn at (x, y).
export function drawNo(ctx, x, y, r) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = r * 0.34;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.moveTo(x - r * 0.7, y + r * 0.7);
  ctx.lineTo(x + r * 0.7, y - r * 0.7);
  ctx.stroke();
  ctx.strokeStyle = '#e8121a';
  ctx.lineWidth = r * 0.2;
  ctx.stroke();
  ctx.restore();
}

// The row of little ingredient pictures, centred on (x, y), each icon r in radius, at most maxW wide.
export function drawStrip(ctx, strip, x, y, r, maxW) {
  const n = strip.length;
  if (!n) return;
  let rr = r;
  if (n * rr * 2.1 > maxW) rr = maxW / (n * 2.1);
  const pitch = rr * 2.1;
  strip.forEach((it, i) => {
    const ix = x + (i - (n - 1) / 2) * pitch;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(ix, y, rr * 1.02, 0, TAU);
    ctx.fill();
    drawIngSmall(ctx, it.id, ix, y, rr * 0.86);
    ctx.restore();
    if (it.no) drawNo(ctx, ix, y, rr * 0.95);
  });
}
