// Rooftop Runaway's 2D drawing: the launcher tile, the menu picture, buttons, stars, little
// people and robbers for the HUD and the level picker. No game rules.

export const C = {
  night: '#2b1055',
  dusk: '#7a1fa2',
  pink: '#ff3d9a',
  orange: '#ff8a4c',
  sun: '#ffe14d',
  foam: '#9ff7f2',
  ink: '#160b33',
  white: '#ffffff',
  green: '#7dff6a',
};
const PASTELS = ['#ff9ec7', '#8ff0ea', '#ffe28a', '#c9b3ff', '#ffbf94', '#a8eea0'];
const SHIRTS = ['#ffe14d', '#19c3d6', '#ff8a4c', '#59d86b', '#b46bff', '#ffffff', '#ff5a5a'];
const TAU = Math.PI * 2;

export const font = (px, weight = 900) => `${weight} ${Math.round(px)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;

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

// Big text with a dark outline; shrinks to fit maxW if given.
export function outlined(ctx, text, x, y, px, fill, maxW) {
  ctx.font = font(px);
  if (maxW) {
    const tw = ctx.measureText(text).width;
    if (tw > maxW) {
      px *= maxW / tw;
      ctx.font = font(px);
    }
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, px * 0.2);
  ctx.strokeStyle = C.ink;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

export function drawStar(ctx, cx, cy, r, full) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = full ? C.sun : 'rgba(22,11,51,0.45)';
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.12);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = full ? C.ink : 'rgba(255,255,255,0.6)';
  ctx.stroke();
}

function glyph(ctx, kind, cx, cy, s, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (kind === 'home') {
    ctx.beginPath();
    ctx.moveTo(cx - s * 1.05, cy - s * 0.05);
    ctx.lineTo(cx, cy - s);
    ctx.lineTo(cx + s * 1.05, cy - s * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx - s * 0.7, cy - s * 0.1, s * 1.4, s * 0.95);
  } else if (kind === 'back') {
    ctx.lineWidth = s * 0.42;
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.35, cy - s * 0.8);
    ctx.lineTo(cx - s * 0.45, cy);
    ctx.lineTo(cx + s * 0.35, cy + s * 0.8);
    ctx.stroke();
  } else if (kind === 'next' || kind === 'play') {
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.6, cy - s * 0.9);
    ctx.lineTo(cx + s * 0.85, cy);
    ctx.lineTo(cx - s * 0.6, cy + s * 0.9);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'restart') {
    ctx.lineWidth = s * 0.36;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.8, -Math.PI * 0.35, Math.PI * 1.25);
    ctx.stroke();
    const a = -Math.PI * 0.35;
    const ax = cx + Math.cos(a) * s * 0.8;
    const ay = cy + Math.sin(a) * s * 0.8;
    ctx.beginPath();
    ctx.moveTo(ax + s * 0.5, ay - s * 0.05);
    ctx.lineTo(ax - s * 0.2, ay - s * 0.55);
    ctx.lineTo(ax - s * 0.12, ay + s * 0.4);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'grid') {
    const g = s * 0.55;
    for (let i = -1; i <= 1; i += 2) for (let j = -1; j <= 1; j += 2) ctx.fillRect(cx + i * g * 0.9 - g * 0.4, cy + j * g * 0.9 - g * 0.4, g * 0.8, g * 0.8);
  }
  ctx.restore();
}

export function drawButton(ctx, b, fill = C.sun) {
  ctx.fillStyle = 'rgba(22,11,51,0.35)';
  roundRect(ctx, b.x, b.y + 5, b.w, b.h, b.h * 0.3);
  ctx.fill();
  ctx.fillStyle = fill;
  roundRect(ctx, b.x, b.y, b.w, b.h, b.h * 0.3);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  const hasIcon = !!b.glyph;
  let px = b.h * 0.42;
  ctx.font = font(px);
  let tw = ctx.measureText(b.label).width;
  const room = b.w * (hasIcon ? 0.66 : 0.86);
  if (tw > room) {
    px = (px * room) / tw;
    ctx.font = font(px);
    tw = room;
  }
  const gw = hasIcon ? b.h * 0.5 : 0;
  const cx = b.x + b.w / 2 + gw / 2;
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.label, cx, b.y + b.h / 2 + 1);
  if (hasIcon) glyph(ctx, b.glyph, cx - tw / 2 - gw * 0.75, b.y + b.h / 2, b.h * 0.2, C.ink);
}

export function drawIconButton(ctx, b) {
  ctx.fillStyle = 'rgba(22,11,51,0.4)';
  roundRect(ctx, b.x, b.y, b.w, b.h, b.w * 0.24);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.stroke();
  glyph(ctx, b.icon, b.x + b.w / 2, b.y + b.h / 2, b.w * 0.3, C.white);
}

// A pointing finger with its tip at (x, y).
export function drawFinger(ctx, x, y, sc) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sc, sc);
  ctx.rotate(-0.35);
  ctx.fillStyle = C.white;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2.5;
  roundRect(ctx, -6, 0, 12, 30, 6);
  ctx.fill();
  ctx.stroke();
  roundRect(ctx, -13, 22, 28, 26, 10);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// A little person from the side, feet at (x, y), s tall, running right.
export function drawPerson2D(ctx, x, y, s, phase, shirt, o = {}) {
  const swing = Math.sin(phase) * 0.6;
  const bob = Math.abs(Math.sin(phase)) * s * 0.05;
  const by = y - bob;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2b3a8c';
  ctx.lineWidth = s * 0.12;
  for (const k of [1, -1]) {
    ctx.beginPath();
    ctx.moveTo(x, by - s * 0.36);
    ctx.lineTo(x + Math.sin(swing * k) * s * 0.22, by - s * 0.02);
    ctx.stroke();
  }
  ctx.fillStyle = shirt;
  roundRect(ctx, x - s * 0.15, by - s * 0.72, s * 0.3, s * 0.4, s * 0.12);
  ctx.fill();
  ctx.strokeStyle = shirt;
  ctx.lineWidth = s * 0.1;
  const up = o.arms ? -1 : 1;
  for (const k of [1, -1]) {
    ctx.beginPath();
    ctx.moveTo(x, by - s * 0.64);
    ctx.lineTo(x - Math.sin(swing * k) * s * 0.2, by - s * 0.64 + up * s * 0.24);
    ctx.stroke();
  }
  ctx.fillStyle = o.skin || '#f2c9a0';
  ctx.beginPath();
  ctx.arc(x + s * 0.02, by - s * 0.86, s * 0.16, 0, TAU);
  ctx.fill();
  ctx.fillStyle = o.hair || '#3b2414';
  ctx.beginPath();
  ctx.arc(x + s * 0.0, by - s * 0.9, s * 0.16, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fill();
  if (o.cap) {
    ctx.fillStyle = '#ff2d46';
    ctx.beginPath();
    ctx.arc(x + s * 0.02, by - s * 0.92, s * 0.17, Math.PI, TAU);
    ctx.fill();
    ctx.fillRect(x + s * 0.05, by - s * 0.94, s * 0.22, s * 0.05);
  }
  ctx.fillStyle = C.ink;
  ctx.fillRect(x + s * 0.08, by - s * 0.9, s * 0.04, s * 0.05);
  ctx.restore();
}

// A cartoon robber from the side: striped shirt, mask, beanie and a sack. Feet at (x, y).
export function drawRobber2D(ctx, x, y, s, phase, o = {}) {
  const swing = Math.sin(phase) * 0.6;
  const bob = Math.abs(Math.sin(phase)) * s * 0.05;
  const by = y - bob;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#1a1426';
  ctx.lineWidth = s * 0.13;
  for (const k of [1, -1]) {
    ctx.beginPath();
    ctx.moveTo(x, by - s * 0.36);
    ctx.lineTo(x + Math.sin(swing * k) * s * 0.24, by - s * 0.02);
    ctx.stroke();
  }
  // the sack over his shoulder
  ctx.fillStyle = '#d9b98a';
  ctx.strokeStyle = '#8a5a34';
  ctx.lineWidth = Math.max(1, s * 0.03);
  ctx.beginPath();
  ctx.ellipse(x - s * 0.3, by - s * 0.78, s * 0.2 * (o.full ? 1.3 : 1), s * 0.22 * (o.full ? 1.3 : 1), -0.3, 0, TAU);
  ctx.fill();
  ctx.stroke();
  if (o.full) {
    ctx.fillStyle = '#f2c9a0';
    ctx.beginPath();
    ctx.arc(x - s * 0.36, by - s * 1.08, s * 0.12, 0, TAU);
    ctx.fill();
  }
  // striped shirt
  ctx.save();
  roundRect(ctx, x - s * 0.17, by - s * 0.76, s * 0.34, s * 0.44, s * 0.12);
  ctx.clip();
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? '#ffffff' : '#1a1426';
    ctx.fillRect(x - s * 0.2, by - s * 0.76 + (i * s * 0.44) / 6, s * 0.4, s * 0.44 / 6 + 0.5);
  }
  ctx.restore();
  ctx.strokeStyle = '#1a1426';
  ctx.lineWidth = s * 0.1;
  ctx.beginPath();
  ctx.moveTo(x, by - s * 0.66);
  ctx.lineTo(x + s * 0.22 + swing * s * 0.1, by - s * 0.5);
  ctx.stroke();
  // head, mask and beanie
  ctx.fillStyle = '#f2c9a0';
  ctx.beginPath();
  ctx.arc(x + s * 0.02, by - s * 0.92, s * 0.17, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#1a1426';
  ctx.fillRect(x - s * 0.15, by - s * 0.98, s * 0.34, s * 0.09);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + s * 0.12, by - s * 0.935, s * 0.035, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#1a1426';
  ctx.beginPath();
  ctx.arc(x + s * 0.02, by - s * 1.0, s * 0.17, Math.PI, TAU);
  ctx.fill();
  ctx.fillStyle = C.pink;
  ctx.beginPath();
  ctx.arc(x + s * 0.02, by - s * 1.18, s * 0.05, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// A pastel art deco building, from the front.
function decoBuilding(ctx, x, top, w, bottom, colour, sign) {
  const h = bottom - top;
  ctx.fillStyle = colour;
  ctx.fillRect(x, top, w, h);
  ctx.fillStyle = 'rgba(22,11,51,0.12)';
  ctx.fillRect(x + w * 0.82, top, w * 0.18, h);
  const floors = Math.max(2, Math.round(h / (w * 0.32)));
  for (let f = 0; f < floors; f++) {
    const fy = top + h * 0.12 + (f * h * 0.82) / floors;
    ctx.fillStyle = '#3d8fc4';
    ctx.fillRect(x + w * 0.12, fy, w * 0.76, (h * 0.82) / floors * 0.42);
    ctx.fillStyle = '#fff6ea';
    ctx.fillRect(x - w * 0.03, fy - h * 0.025, w * 1.06, Math.max(2, h * 0.025));
  }
  ctx.fillStyle = '#fff6ea';
  ctx.fillRect(x - w * 0.02, top - h * 0.04, w * 1.04, h * 0.05);
  ctx.fillRect(x + w * 0.42, top - h * 0.12, w * 0.16, h * 0.1);
  if (sign) {
    ctx.fillStyle = C.pink;
    ctx.fillRect(x + w * 0.47, top + h * 0.1, w * 0.06, h * 0.8);
  }
}

function palm2D(ctx, x, y, s, time) {
  ctx.strokeStyle = '#3a1f4a';
  ctx.lineWidth = s * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.12, y - s * 0.5, x + s * 0.05, y - s);
  ctx.stroke();
  ctx.fillStyle = '#3a1f4a';
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k - 2.5) * 0.55 + Math.sin(time * 1.5 + k) * 0.05;
    ctx.save();
    ctx.translate(x + s * 0.05, y - s);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(s * 0.26, 0, s * 0.3, s * 0.07, 0.3, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

// The picture on the tile and behind the menu: a sunset over pastel rooftops, a crowd running
// along them and hopping the gaps, and a robber close behind.
export function drawScene(ctx, x, y, w, h, time, o = {}) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, C.night);
  sky.addColorStop(0.35, C.dusk);
  sky.addColorStop(0.62, C.pink);
  sky.addColorStop(0.85, C.orange);
  sky.addColorStop(1, '#ffb36b');
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  const ground = y + h * (o.ground ?? 0.9);
  // the sun, with stripes across it
  const sr = Math.min(w, h) * 0.2;
  const sx = x + w * 0.68;
  const sy = y + h * 0.5;
  ctx.fillStyle = C.sun;
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, TAU);
  ctx.fill();
  ctx.fillStyle = C.pink;
  for (let i = 0; i < 4; i++) ctx.fillRect(sx - sr, sy + sr * (0.15 + i * 0.2), sr * 2, Math.max(1.5, sr * 0.045 * (i + 1)));
  // distant skyline
  ctx.fillStyle = 'rgba(122,31,162,0.55)';
  for (let i = 0; i < 9; i++) {
    const bw = w * 0.11;
    const bh = h * (0.18 + ((i * 37) % 5) * 0.035);
    ctx.fillRect(x + i * w * 0.115 - w * 0.02, ground - h * 0.32 - bh, bw, bh + h * 0.3);
  }
  // the rooftops the crowd runs on: [left, right, roof height] as fractions
  const roofs = o.roofs || [[-0.05, 0.3, 0.5], [0.37, 0.64, 0.58], [0.71, 1.05, 0.48]];
  roofs.forEach(([l, r, top], i) => decoBuilding(ctx, x + w * l, y + h * top, w * (r - l), ground, PASTELS[(i * 2 + 1) % PASTELS.length], i === 1));
  const ps = Math.min(w, h);
  palm2D(ctx, x + w * 0.335, ground, ps * 0.3, time);
  palm2D(ctx, x + w * 0.675, ground, ps * 0.26, time + 1);
  ctx.fillStyle = '#6b5a8e';
  ctx.fillRect(x, ground, w, y + h - ground);
  // the height of the roof under x (with an arc over the gaps)
  const roofAt = (fx) => {
    for (let i = 0; i < roofs.length; i++) {
      const [l, r, top] = roofs[i];
      if (fx >= l && fx <= r) return top;
      const next = roofs[i + 1];
      if (next && fx > r && fx < next[0]) {
        const k = (fx - r) / (next[0] - r);
        return top + (next[2] - top) * k - Math.sin(k * Math.PI) * 0.1;
      }
    }
    return roofs[roofs.length - 1][2];
  };
  const s = Math.min(w * 0.075, h * 0.1) * (o.scale ?? 1);
  const span = 1.3;
  const speed = 0.13;
  const lead = ((time * speed) % span) - 0.15;
  const n = o.crowd ?? 6;
  for (let i = n - 1; i >= 0; i--) {
    const fx = lead - i * 0.055;
    if (fx < -0.1 || fx > 1.1) continue;
    const py = y + h * roofAt(Math.max(-0.05, Math.min(1.05, fx)));
    drawPerson2D(ctx, x + w * fx, py, s, time * 11 + i * 1.3, SHIRTS[i % SHIRTS.length], { cap: i === 0, hair: i % 2 ? '#d9a04a' : '#3b2414', skin: ['#f2c9a0', '#a86f44', '#d9a273'][i % 3] });
  }
  const rx = lead - n * 0.055 - 0.12;
  if (rx > -0.15 && rx < 1.15) drawRobber2D(ctx, x + w * rx, y + h * roofAt(Math.max(-0.05, Math.min(1.05, rx))), s * 1.12, time * 10, { full: o.full });
  ctx.restore();
}

export function drawTile(ctx, x, y, w, h, time) {
  drawScene(ctx, x, y, w, h, time, { crowd: 5 });
}

// Little pictures for the level picker: what each level brings in.
export function drawTeachIcon(ctx, kind, x, y, r, time = 0) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(22,11,51,0.25)';
  ctx.beginPath();
  ctx.arc(x, y, r * 1.15, 0, TAU);
  ctx.fill();
  const wall = (wx, wy, ww, wh, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(wx, wy, ww, wh);
  };
  if (kind === 'run') {
    drawPerson2D(ctx, x - r * 0.1, y + r * 0.7, r * 1.3, time * 10, C.sun, { cap: true });
  } else if (kind === 'ladder' || kind === 'stairs' || kind === 'crates' || kind === 'palm') {
    wall(x - r * 0.2, y - r * 0.6, r * 0.9, r * 1.4, PASTELS[0]);
    if (kind === 'ladder') {
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = r * 0.1;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.45, y + r * 0.8);
      ctx.lineTo(x - r * 0.45, y - r * 0.8);
      ctx.moveTo(x - r * 0.1, y + r * 0.8);
      ctx.lineTo(x - r * 0.1, y - r * 0.8);
      for (let k = 0; k < 4; k++) {
        ctx.moveTo(x - r * 0.45, y + r * (0.6 - k * 0.4));
        ctx.lineTo(x - r * 0.1, y + r * (0.6 - k * 0.4));
      }
      ctx.stroke();
    } else if (kind === 'stairs') {
      ctx.strokeStyle = '#3a2f4a';
      ctx.lineWidth = r * 0.12;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.9, y + r * 0.8);
      ctx.lineTo(x - r * 0.25, y + r * 0.25);
      ctx.lineTo(x - r * 0.9, y - r * 0.25);
      ctx.lineTo(x - r * 0.25, y - r * 0.7);
      ctx.stroke();
    } else if (kind === 'crates') {
      for (const [cx, cy] of [[-0.85, 0.45], [-0.5, 0.45], [-0.5, 0.05], [-0.15, 0.45], [-0.15, 0.05], [-0.15, -0.35]]) {
        wall(x + r * cx - r * 0.17, y + r * cy - r * 0.17, r * 0.34, r * 0.36, '#c98a55');
      }
    } else {
      palm2D(ctx, x - r * 0.4, y + r * 0.85, r * 1.6, time);
    }
    drawPerson2D(ctx, x + r * 0.35, y - r * 0.6, r * 0.7, time * 8, C.sun, { cap: true, arms: true });
  } else if (kind === 'hop') {
    wall(x - r * 1.0, y - r * 0.1, r * 0.8, r * 0.9, PASTELS[1]);
    wall(x + r * 0.25, y - r * 0.3, r * 0.75, r * 1.1, PASTELS[3]);
    ctx.strokeStyle = C.white;
    ctx.lineWidth = r * 0.1;
    ctx.setLineDash([r * 0.15, r * 0.12]);
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, y - r * 0.2);
    ctx.quadraticCurveTo(x - r * 0.05, y - r * 1.1, x + r * 0.55, y - r * 0.4);
    ctx.stroke();
    ctx.setLineDash([]);
    const k = (time * 0.8) % 1;
    drawPerson2D(ctx, x + r * (-0.5 + k * 1.05), y - r * 0.2 - Math.sin(k * Math.PI) * r * 0.7, r * 0.6, time * 8, C.sun, { cap: true });
  } else if (kind === 'bounce') {
    wall(x - r * 0.1, y - r * 0.8, r * 1.0, r * 1.6, PASTELS[2]);
    for (let k = 0; k < 4; k++) wall(x - r * 0.4 + k * r * 0.2, y - r * 0.2, r * 0.2, r * 0.15, k % 2 ? '#ffffff' : C.pink);
    wall(x - r * 0.9, y + r * 0.6, r * 0.8, r * 0.12, '#29b6f6');
    const k = Math.abs(Math.sin(time * 3));
    drawPerson2D(ctx, x - r * 0.5, y + r * 0.6 - k * r * 0.8, r * 0.6, 0, C.sun, { cap: true, arms: true });
  } else if (kind === 'zip') {
    wall(x - r * 1.0, y - r * 0.5, r * 0.6, r * 1.3, PASTELS[4]);
    ctx.strokeStyle = '#1a1426';
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.6, y - r * 0.85);
    ctx.lineTo(x + r * 0.95, y + r * 0.2);
    ctx.stroke();
    const k = (time * 0.6) % 1;
    const px = x - r * 0.6 + k * r * 1.55;
    const py = y - r * 0.85 + k * r * 1.05;
    drawPerson2D(ctx, px, py + r * 0.6, r * 0.6, 0, C.sun, { cap: true, arms: true });
  } else {
    drawStar(ctx, x, y, r * 0.8, true);
  }
  ctx.restore();
}

// A little head-and-shoulders person, for counting on the HUD.
export function drawBuddy(ctx, x, y, s, shirt, cap = false) {
  ctx.fillStyle = shirt;
  roundRect(ctx, x - s * 0.42, y, s * 0.84, s * 0.55, s * 0.25);
  ctx.fill();
  ctx.fillStyle = '#f2c9a0';
  ctx.beginPath();
  ctx.arc(x, y - s * 0.2, s * 0.3, 0, TAU);
  ctx.fill();
  if (cap) {
    ctx.fillStyle = '#ff2d46';
    ctx.beginPath();
    ctx.arc(x, y - s * 0.27, s * 0.31, Math.PI, TAU);
    ctx.fill();
  }
}
