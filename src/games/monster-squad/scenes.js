// Backdrops: each zone's scenery (painted once per size into an offscreen canvas), the map of
// Miami with its zones, the little zone pictures, and the launcher tile.
import { C, TAU, roundRect, drawElement } from './ui.js';
import { drawMonster, drawStarShape, INK } from './draw-monster.js';

function makeCanvas(w, h) {
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * dpr));
  c.height = Math.max(1, Math.round(h * dpr));
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  return { c, g };
}

function grad(g, y0, y1, stops) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c));
  return gr;
}

function palm(g, x, y, s, lean = 1, colour = '#2b5c3a', trunk = '#8a5a35') {
  g.lineCap = 'round';
  g.strokeStyle = INK;
  g.lineWidth = s * 0.16;
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x + lean * s * 0.2, y - s * 0.6, x + lean * s * 0.45, y - s * 1.1);
  g.stroke();
  g.strokeStyle = trunk;
  g.lineWidth = s * 0.1;
  g.stroke();
  const tx = x + lean * s * 0.45;
  const ty = y - s * 1.1;
  for (const a of [-2.9, -2.3, -1.7, -1.1, -0.5, 0.1]) {
    g.fillStyle = colour;
    g.strokeStyle = INK;
    g.lineWidth = Math.max(1.5, s * 0.03);
    g.beginPath();
    g.moveTo(tx, ty);
    g.quadraticCurveTo(tx + Math.cos(a) * s * 0.45, ty + Math.sin(a) * s * 0.4 - s * 0.12, tx + Math.cos(a) * s * 0.7, ty + Math.sin(a) * s * 0.3 + s * 0.2);
    g.quadraticCurveTo(tx + Math.cos(a) * s * 0.35, ty + Math.sin(a) * s * 0.2 + s * 0.05, tx, ty);
    g.fill();
    g.stroke();
  }
}

function cloud(g, x, y, s, fill = 'rgba(255,255,255,0.9)') {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(x, y, s * 0.5, 0, TAU);
  g.arc(x + s * 0.5, y - s * 0.2, s * 0.6, 0, TAU);
  g.arc(x + s * 1.1, y, s * 0.45, 0, TAU);
  g.rect(x, y - s * 0.1, s * 1.1, s * 0.55);
  g.fill();
}

// ---------- zone scenery ----------

const PAINT = {
  beach(g, w, h, hz) {
    g.fillStyle = grad(g, 0, hz, ['#4fc3ff', '#a6e8ff', '#fff0c2']);
    g.fillRect(0, 0, w, hz);
    g.fillStyle = '#ffe36b';
    g.beginPath();
    g.arc(w * 0.82, hz * 0.32, Math.min(w, h) * 0.08, 0, TAU);
    g.fill();
    cloud(g, w * 0.12, hz * 0.3, Math.min(w, h) * 0.08);
    cloud(g, w * 0.5, hz * 0.18, Math.min(w, h) * 0.06);
    g.fillStyle = grad(g, hz - h * 0.04, hz + h * 0.06, ['#19c3d6', '#0e9fb8']);
    g.fillRect(0, hz - h * 0.04, w, h * 0.1);
    g.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 9; i++) g.fillRect(((i * 0.137) % 1) * w, hz - h * 0.02 + (i % 3) * h * 0.015, w * 0.06, 3);
    g.fillStyle = grad(g, hz + h * 0.05, h, ['#ffe2a1', '#f6c77a']);
    g.beginPath();
    g.moveTo(0, hz + h * 0.06);
    g.quadraticCurveTo(w * 0.5, hz + h * 0.03, w, hz + h * 0.06);
    g.lineTo(w, h);
    g.lineTo(0, h);
    g.fill();
    // lifeguard tower
    const tx = w * 0.88;
    const ty = hz + h * 0.07;
    const s = Math.min(w, h) * 0.12;
    g.strokeStyle = '#c96b2c';
    g.lineWidth = s * 0.06;
    g.beginPath();
    g.moveTo(tx - s * 0.4, ty);
    g.lineTo(tx - s * 0.3, ty - s * 0.7);
    g.moveTo(tx + s * 0.4, ty);
    g.lineTo(tx + s * 0.3, ty - s * 0.7);
    g.stroke();
    g.fillStyle = '#ff6fb5';
    roundRect(g, tx - s * 0.45, ty - s * 1.15, s * 0.9, s * 0.5, s * 0.08);
    g.fill();
    g.fillStyle = '#22c6cf';
    g.beginPath();
    g.moveTo(tx - s * 0.55, ty - s * 1.15);
    g.lineTo(tx, ty - s * 1.45);
    g.lineTo(tx + s * 0.55, ty - s * 1.15);
    g.fill();
    palm(g, w * 0.07, hz + h * 0.1, Math.min(w, h) * 0.22, 1, '#3fae5a');
    // shells in the sand
    g.fillStyle = '#ffd0e2';
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.arc(((i * 0.31 + 0.1) % 1) * w, hz + h * (0.25 + ((i * 0.17) % 0.6)), 4, 0, TAU);
      g.fill();
    }
  },
  swamp(g, w, h, hz) {
    g.fillStyle = grad(g, 0, hz, ['#ffb86b', '#ffd98a', '#d6f0a0']);
    g.fillRect(0, 0, w, hz);
    g.fillStyle = '#3d6b45';
    for (let i = 0; i < 7; i++) {
      const x = ((i * 0.17 + 0.05) % 1) * w;
      const s = Math.min(w, h) * (0.12 + (i % 3) * 0.04);
      g.fillRect(x - s * 0.05, hz - s * 1.3, s * 0.1, s * 1.3);
      g.beginPath();
      g.ellipse(x, hz - s * 1.3, s * 0.45, s * 0.25, 0, 0, TAU);
      g.ellipse(x - s * 0.2, hz - s, s * 0.35, s * 0.18, 0, 0, TAU);
      g.fill();
    }
    g.fillStyle = grad(g, hz, h, ['#6da35a', '#4f8a4a']);
    g.fillRect(0, hz, w, h - hz);
    g.fillStyle = 'rgba(64,140,130,0.6)';
    g.beginPath();
    g.ellipse(w * 0.5, hz + (h - hz) * 0.18, w * 0.6, (h - hz) * 0.1, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#8fd46a';
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      const x = ((i * 0.23 + 0.1) % 1) * w;
      const y = hz + (h - hz) * (0.12 + (i % 3) * 0.05);
      g.arc(x, y, 10, 0.3, TAU - 0.3);
      g.lineTo(x, y);
      g.fill();
    }
    g.strokeStyle = '#3f7a3a';
    g.lineWidth = 3;
    for (let i = 0; i < 40; i++) {
      const x = ((i * 0.071) % 1) * w;
      const y = hz + (h - hz) * (0.35 + ((i * 0.13) % 0.6));
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 4, y - 16);
      g.stroke();
    }
  },
  roofs(g, w, h, hz) {
    g.fillStyle = grad(g, 0, hz, ['#1a0b3d', '#4a1a7a', '#ff4fa3']);
    g.fillRect(0, 0, w, hz);
    g.fillStyle = '#fff';
    for (let i = 0; i < 40; i++) g.fillRect(((i * 0.137) % 1) * w, ((i * 0.071) % 0.6) * hz, 2, 2);
    const cols = ['#2a1550', '#341a63', '#22113f'];
    for (let i = 0; i < 12; i++) {
      const bw = w * 0.09;
      const x = i * w * 0.085 - 10;
      const bh = hz * (0.3 + ((i * 0.37) % 0.5));
      g.fillStyle = cols[i % 3];
      g.fillRect(x, hz - bh, bw, bh);
      g.fillStyle = i % 2 ? '#3ff0ff' : '#ffe14d';
      for (let r = 0; r < bh / 22 - 1; r++) for (let c = 0; c < 3; c++) if ((r + c + i) % 3) g.fillRect(x + 6 + c * bw * 0.3, hz - bh + 10 + r * 22, 6, 9);
    }
    g.fillStyle = grad(g, hz, h, ['#5c4a7a', '#3a2d55']);
    g.fillRect(0, hz, w, h - hz);
    g.strokeStyle = 'rgba(255,255,255,0.12)';
    g.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      g.beginPath();
      g.moveTo(0, hz + ((h - hz) * i) / 8);
      g.lineTo(w, hz + ((h - hz) * i) / 8);
      g.stroke();
    }
    // a neon palm sign
    g.save();
    g.shadowColor = '#ff4fa3';
    g.shadowBlur = 16;
    g.strokeStyle = '#ff7ac0';
    g.lineWidth = 4;
    const sx = w * 0.82;
    const sy = hz * 0.45;
    const s = Math.min(w, h) * 0.08;
    g.beginPath();
    g.moveTo(sx, sy + s);
    g.quadraticCurveTo(sx + s * 0.1, sy, sx + s * 0.3, sy - s * 0.4);
    for (const a of [-2.6, -1.6, -0.6]) {
      g.moveTo(sx + s * 0.3, sy - s * 0.4);
      g.quadraticCurveTo(sx + s * 0.3 + Math.cos(a) * s * 0.5, sy - s * 0.6 + Math.sin(a) * s * 0.4, sx + s * 0.3 + Math.cos(a) * s * 0.8, sy - s * 0.2 + Math.sin(a) * s * 0.2);
    }
    g.stroke();
    g.restore();
  },
  reef(g, w, h, hz) {
    g.fillStyle = grad(g, 0, h, ['#4fd6f0', '#1a8fc9', '#0b4f8a']);
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.12)';
    for (let i = 0; i < 5; i++) {
      const x = w * (0.1 + i * 0.22);
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + w * 0.08, 0);
      g.lineTo(x + w * 0.2, h * 0.7);
      g.lineTo(x + w * 0.1, h * 0.7);
      g.fill();
    }
    g.fillStyle = grad(g, hz, h, ['#f2d9a0', '#d9b878']);
    g.beginPath();
    g.moveTo(0, hz + 10);
    g.quadraticCurveTo(w * 0.3, hz - 10, w * 0.6, hz + 8);
    g.quadraticCurveTo(w * 0.8, hz + 16, w, hz);
    g.lineTo(w, h);
    g.lineTo(0, h);
    g.fill();
    const corals = ['#ff6f91', '#ffa83a', '#d69cff', '#ff4f6d'];
    for (let i = 0; i < 6; i++) {
      const x = ((i * 0.19 + 0.04) % 1) * w;
      const s = Math.min(w, h) * (0.06 + (i % 3) * 0.02);
      g.strokeStyle = corals[i % 4];
      g.lineCap = 'round';
      g.lineWidth = s * 0.22;
      g.beginPath();
      g.moveTo(x, hz + 6);
      g.lineTo(x, hz - s);
      g.moveTo(x, hz - s * 0.4);
      g.lineTo(x - s * 0.5, hz - s * 1.1);
      g.moveTo(x, hz - s * 0.6);
      g.lineTo(x + s * 0.5, hz - s * 1.3);
      g.stroke();
    }
    g.strokeStyle = 'rgba(255,255,255,0.6)';
    g.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      g.beginPath();
      g.arc(((i * 0.29) % 1) * w, ((i * 0.43) % 0.7) * h, 3 + (i % 4) * 2, 0, TAU);
      g.stroke();
    }
  },
  factory(g, w, h, hz) {
    g.fillStyle = grad(g, 0, hz, ['#bfe6ff', '#e8f6ff', '#ffe4f2']);
    g.fillRect(0, 0, w, hz);
    // a giant snow cone on the factory roof
    const fx = w * 0.72;
    const s = Math.min(w, h) * 0.2;
    g.fillStyle = '#ff9ccf';
    g.fillRect(fx - s, hz - s * 0.9, s * 2, s * 0.9);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) g.fillRect(fx - s * 0.85 + i * s * 0.45, hz - s * 0.6, s * 0.25, s * 0.25);
    g.fillStyle = '#f2c46b';
    g.beginPath();
    g.moveTo(fx - s * 0.35, hz - s * 0.9);
    g.lineTo(fx + s * 0.35, hz - s * 0.9);
    g.lineTo(fx, hz - s * 0.3);
    g.fill();
    for (const [c, dx] of [['#ff5f8a', -0.2], ['#62baff', 0.05], ['#ffe14d', 0.25]]) {
      g.fillStyle = c;
      g.beginPath();
      g.arc(fx + dx * s, hz - s * 1.05, s * 0.25, 0, TAU);
      g.fill();
    }
    g.fillStyle = grad(g, hz, h, ['#f2f8ff', '#cfe3f5']);
    g.fillRect(0, hz, w, h - hz);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 30; i++) {
      const x = ((i * 0.137) % 1) * w;
      const y = ((i * 0.31) % 1) * h;
      g.beginPath();
      g.arc(x, y, 2 + (i % 3), 0, TAU);
      g.fill();
    }
  },
  golf(g, w, h, hz) {
    g.fillStyle = grad(g, 0, hz, ['#ff7a5c', '#ffb36b', '#ffe08a']);
    g.fillRect(0, 0, w, hz);
    const vx = w * 0.3;
    const s = Math.min(w, h) * 0.35;
    g.fillStyle = '#7a4a3a';
    g.beginPath();
    g.moveTo(vx - s, hz);
    g.lineTo(vx - s * 0.2, hz - s * 0.8);
    g.lineTo(vx + s * 0.2, hz - s * 0.8);
    g.lineTo(vx + s, hz);
    g.fill();
    g.fillStyle = '#ff5a1f';
    g.beginPath();
    g.moveTo(vx - s * 0.2, hz - s * 0.8);
    g.quadraticCurveTo(vx - s * 0.1, hz - s * 0.5, vx - s * 0.25, hz - s * 0.35);
    g.lineTo(vx - s * 0.05, hz - s * 0.6);
    g.lineTo(vx + s * 0.1, hz - s * 0.4);
    g.quadraticCurveTo(vx + s * 0.1, hz - s * 0.6, vx + s * 0.2, hz - s * 0.8);
    g.fill();
    g.fillStyle = grad(g, hz, h, ['#6fdc5a', '#3fae4a']);
    g.fillRect(0, hz, w, h - hz);
    g.strokeStyle = 'rgba(255,255,255,0.18)';
    g.lineWidth = w * 0.04;
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.moveTo(i * w * 0.2, hz);
      g.lineTo(i * w * 0.2 - w * 0.1, h);
      g.stroke();
    }
    const fx = w * 0.86;
    const fy = hz + (h - hz) * 0.12;
    g.fillStyle = '#2a1636';
    g.beginPath();
    g.ellipse(fx, fy, 16, 6, 0, 0, TAU);
    g.fill();
    g.strokeStyle = '#ffffff';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(fx, fy);
    g.lineTo(fx, fy - 70);
    g.stroke();
    g.fillStyle = '#ff4fa3';
    g.beginPath();
    g.moveTo(fx, fy - 70);
    g.lineTo(fx + 30, fy - 60);
    g.lineTo(fx, fy - 50);
    g.fill();
  },
  storm(g, w, h, hz) {
    g.fillStyle = grad(g, 0, hz, ['#2a2f5a', '#4a5a8a', '#8aa3c9']);
    g.fillRect(0, 0, w, hz);
    for (let i = 0; i < 5; i++) cloud(g, ((i * 0.23) % 1) * w - 20, hz * (0.15 + (i % 3) * 0.15), Math.min(w, h) * 0.1, 'rgba(70,80,120,0.9)');
    g.strokeStyle = '#ffe14d';
    g.lineWidth = 5;
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(w * 0.62, hz * 0.25);
    g.lineTo(w * 0.58, hz * 0.45);
    g.lineTo(w * 0.64, hz * 0.45);
    g.lineTo(w * 0.59, hz * 0.7);
    g.stroke();
    g.fillStyle = grad(g, hz, h, ['#2f7a9a', '#1b4f6b']);
    g.fillRect(0, hz, w, h - hz);
    g.fillStyle = '#6b6f80';
    g.beginPath();
    g.ellipse(w * 0.5, hz + (h - hz) * 0.55, w * 0.62, (h - hz) * 0.5, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#8a8fa0';
    g.beginPath();
    g.ellipse(w * 0.5, hz + (h - hz) * 0.5, w * 0.58, (h - hz) * 0.42, 0, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(200,220,255,0.35)';
    g.lineWidth = 2;
    for (let i = 0; i < 30; i++) {
      const x = ((i * 0.137) % 1) * w;
      const y = ((i * 0.29) % 1) * hz;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - 6, y + 16);
      g.stroke();
    }
  },
};

const sceneCache = new Map();

// A zone's scenery filling the screen; hz is where the ground starts.
export function drawZoneScene(ctx, zoneId, w, h, hz) {
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const key = `${zoneId}|${Math.round(w)}|${Math.round(h)}|${Math.round(hz)}|${dpr}`;
  let c = sceneCache.get(key);
  if (!c) {
    const m = makeCanvas(w, h);
    (PAINT[zoneId] || PAINT.beach)(m.g, w, h, hz);
    c = m.c;
    sceneCache.set(key, c);
    if (sceneCache.size > 12) sceneCache.delete(sceneCache.keys().next().value);
  }
  ctx.drawImage(c, 0, 0, w, h);
}

// ---------- the map ----------

let mapCache = null;

function paintMap(w, h, area) { // area.nodes: the zone centres
  const m = makeCanvas(w, h);
  const g = m.g;
  g.fillStyle = grad(g, 0, h, ['#38c9e6', '#1f9fd0', '#1677b8']);
  g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,0.18)';
  g.lineWidth = 3;
  for (let i = 0; i < 26; i++) {
    const x = ((i * 0.137) % 1) * w;
    const y = ((i * 0.071) % 1) * h;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + 10, y - 6, x + 20, y);
    g.quadraticCurveTo(x + 30, y + 6, x + 40, y);
    g.stroke();
  }
  // a long sandy island under the zones
  const pts = area.nodes;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = '#f6d892';
  g.lineWidth = Math.min(w, h) * 0.2;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
  g.strokeStyle = '#7fd66a';
  g.lineWidth = Math.min(w, h) * 0.15;
  g.stroke();
  for (let i = 0; i < 8; i++) {
    const [x, y] = pts[i % pts.length];
    palm(g, x + (i % 2 ? 1 : -1) * Math.min(w, h) * 0.11, y + Math.min(w, h) * 0.04, Math.min(w, h) * 0.07, i % 2 ? -1 : 1, '#2f8a45');
  }
  return m.c;
}

export function drawMapScene(ctx, w, h, area, buttons) {
  const key = `${w}|${h}`;
  const nodes = buttons.filter((b) => b.id === 'zone').map((b) => [b.cx, b.cy]);
  if (!mapCache || mapCache.key !== key) mapCache = { key, c: paintMap(w, h, { nodes }) };
  ctx.drawImage(mapCache.c, 0, 0, w, h);
  // the dotted road from zone to zone
  const zs = buttons.filter((b) => b.id === 'zone');
  ctx.save();
  ctx.setLineDash([10, 12]);
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  zs.forEach((b, i) => (i ? ctx.lineTo(b.cx, b.cy) : ctx.moveTo(b.cx, b.cy)));
  ctx.stroke();
  ctx.restore();
}

// A little round picture for each zone.
export function drawZoneIcon(ctx, id, x, y, r, t = 0) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.clip();
  const bg = { beach: '#8fe3ff', swamp: '#a7d98a', roofs: '#4a1a7a', reef: '#2a9fd6', factory: '#e8f6ff', golf: '#ffb36b', storm: '#4a5a8a' }[id];
  ctx.fillStyle = bg;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  const s = r * 0.5;
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.strokeStyle = INK;
  switch (id) {
    case 'beach':
      ctx.fillStyle = '#f6d892';
      ctx.fillRect(x - r, y + r * 0.3, r * 2, r);
      drawElement(ctx, 'sun', x + s * 0.7, y - s * 0.7, s * 0.6);
      ctx.fillStyle = '#ff4fa3';
      ctx.beginPath();
      ctx.arc(x - s * 0.4, y + s * 0.2, s * 0.9, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - s * 0.4, y + s * 0.2);
      ctx.lineTo(x - s * 0.4, y + s * 1.2);
      ctx.stroke();
      break;
    case 'swamp':
      ctx.fillStyle = '#3d8a7a';
      ctx.fillRect(x - r, y + r * 0.2, r * 2, r);
      ctx.fillStyle = '#5fae63';
      ctx.beginPath();
      ctx.ellipse(x, y + s * 0.4, s * 1.1, s * 0.5, 0, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      for (const d of [-0.5, 0.5]) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x + d * s, y - s * 0.1, s * 0.3, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.arc(x + d * s + s * 0.08, y - s * 0.05, s * 0.13, 0, TAU);
        ctx.fill();
      }
      break;
    case 'roofs':
      for (let i = -2; i <= 2; i++) {
        const bh = s * (1 + ((i + 3) % 3) * 0.5);
        ctx.fillStyle = '#2a1550';
        ctx.fillRect(x + i * s * 0.45 - s * 0.2, y + r - bh - s * 0.3, s * 0.42, bh + s);
        ctx.fillStyle = i % 2 ? '#3ff0ff' : '#ffe14d';
        ctx.fillRect(x + i * s * 0.45 - s * 0.08, y + r - bh, s * 0.12, s * 0.15);
      }
      ctx.fillStyle = '#ff4fa3';
      ctx.beginPath();
      ctx.arc(x + s * 0.6, y - s * 0.7, s * 0.25, 0, TAU);
      ctx.fill();
      break;
    case 'reef':
      ctx.strokeStyle = '#ff6f91';
      ctx.lineWidth = s * 0.3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y + r);
      ctx.lineTo(x, y);
      ctx.lineTo(x - s * 0.6, y - s * 0.7);
      ctx.moveTo(x, y + s * 0.2);
      ctx.lineTo(x + s * 0.7, y - s * 0.5);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + s * 0.8, y - s, s * 0.2, 0, TAU);
      ctx.stroke();
      break;
    case 'factory':
      ctx.fillStyle = '#f2c46b';
      ctx.beginPath();
      ctx.moveTo(x - s * 0.6, y);
      ctx.lineTo(x + s * 0.6, y);
      ctx.lineTo(x, y + s * 1.3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      for (const [c, dx, dy] of [['#ff5f8a', -0.35, -0.15], ['#62baff', 0.35, -0.15], ['#fff', 0, -0.55]]) {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(x + dx * s, y + dy * s, s * 0.45, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      break;
    case 'golf':
      ctx.fillStyle = '#3fae4a';
      ctx.fillRect(x - r, y + r * 0.4, r * 2, r);
      ctx.fillStyle = '#7a4a3a';
      ctx.beginPath();
      ctx.moveTo(x - s * 1.2, y + r * 0.4);
      ctx.lineTo(x - s * 0.3, y - s * 0.7);
      ctx.lineTo(x + s * 0.3, y - s * 0.7);
      ctx.lineTo(x + s * 1.2, y + r * 0.4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ff5a1f';
      ctx.beginPath();
      ctx.arc(x, y - s * 0.9 - Math.abs(Math.sin(t * 3)) * s * 0.2, s * 0.25, 0, TAU);
      ctx.fill();
      break;
    case 'storm':
      ctx.fillStyle = '#c9d2e6';
      ctx.beginPath();
      ctx.arc(x - s * 0.4, y - s * 0.2, s * 0.6, 0, TAU);
      ctx.arc(x + s * 0.3, y - s * 0.4, s * 0.7, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffe14d';
      ctx.beginPath();
      ctx.moveTo(x + s * 0.1, y);
      ctx.lineTo(x - s * 0.35, y + s * 0.7);
      ctx.lineTo(x, y + s * 0.65);
      ctx.lineTo(x - s * 0.2, y + s * 1.3);
      ctx.lineTo(x + s * 0.45, y + s * 0.45);
      ctx.lineTo(x + s * 0.1, y + s * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    default:
  }
  ctx.restore();
}

// ---------- the launcher tile ----------

const TILE_HERO = { parts: { body: 'bean', colour: 'pink', pattern: 'belly', eyes: 'googly', mouth: 'grin', top: 'nubs', arms: 'muscle', legs: 'stubby', back: 'none', element: 'sun' }, seed: 5 };
const TILE_WILD = { parts: { body: 'ball', colour: 'teal', pattern: 'spots', eyes: 'cyclops', mouth: 'oh', top: 'antennae', arms: 'tiny', legs: 'hover', back: 'wings', element: 'wave' }, seed: 9 };

export function drawTile(ctx, x, y, w, h, time) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const hz = y + h * 0.58;
  ctx.fillStyle = grad(ctx, y, hz, ['#6a2fd1', '#ff4fa3', '#ffb36b']);
  ctx.fillRect(x, y, w, hz - y);
  ctx.fillStyle = '#ffe36b';
  ctx.beginPath();
  ctx.arc(x + w * 0.5, hz, w * 0.22, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = grad(ctx, hz, y + h, ['#ffe2a1', '#f2b866']);
  ctx.fillRect(x, hz, w, y + h - hz);
  palm(ctx, x + w * 0.08, hz + h * 0.02, w * 0.3, 1, '#2f8a45');
  // the bonk: every 2.4 s the hero lunges and the wild one flinches and sees stars
  const cyc = time % 2.4;
  const lunge = cyc > 1.2 && cyc < 1.7 ? (cyc - 1.2) / 0.5 : 0;
  const hitT = cyc > 1.4 ? Math.min(1, (cyc - 1.4) / 0.6) : 0;
  const s = w * 0.54;
  drawMonster(ctx, TILE_WILD, x + w * 0.76, y + h * 0.84, s * 0.78, {
    t: time, face: -1, pose: hitT > 0 && hitT < 1 ? 'hit' : cyc > 2 ? 'dizzy' : 'idle', p: hitT,
  });
  drawMonster(ctx, TILE_HERO, x + w * 0.32, y + h * 0.93, s, { t: time, pose: lunge ? 'attack' : 'idle', p: lunge });
  if (hitT > 0 && hitT < 0.6) {
    const k = hitT / 0.6;
    drawStarShape(ctx, x + w * 0.6, y + h * 0.6, w * (0.08 + k * 0.08), '#ffe14d', 2);
  }
  ctx.restore();
}

export { drawElement, C };
