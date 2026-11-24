// Food Truck Chef customers: six regulars seen from the counter up (busts), with moods:
// 'wait', 'munch', 'love', 'yum', 'no' (head shake) and 'shrug'. Plus the free kitchen's gator
// chef and his reactions. Drawing only. (x, y) is the bottom middle of a bust; k scales a
// bust about 230 units tall.
import { INK, TAU, hash, roundRect, flame } from './draw-food.js';

function fs(ctx, fill, lw) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

function ell(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}

export function heart(ctx, x, y, r, fill = '#ff3d7a') {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.3, y, x - r * 0.9, y - r * 1.1, x, y - r * 0.4);
  ctx.bezierCurveTo(x + r * 0.9, y - r * 1.1, x + r * 1.3, y, x, y + r * 0.9);
  ctx.closePath();
  fs(ctx, fill, r * 0.18);
}

// Eyes for every face. look: -1..1 sideways glance.
function eye(ctx, x, y, r, mood, t, look = 0, ring = null) {
  const blink = mood === 'wait' && (t % 3.4) < 0.12;
  ctx.lineCap = 'round';
  if (mood === 'love') {
    heart(ctx, x, y, r * 0.95, '#ff2d6a');
    return;
  }
  if (mood === 'munch' || mood === 'yum' || blink) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = r * 0.35;
    ctx.beginPath();
    if (blink) {
      ctx.moveTo(x - r * 0.8, y);
      ctx.lineTo(x + r * 0.8, y);
    } else ctx.arc(x, y + r * 0.35, r * 0.75, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    return;
  }
  if (ring) {
    ell(ctx, x, y, r * 1.25, r * 1.25);
    fs(ctx, ring, r * 0.2);
  }
  ell(ctx, x, y, r, r * 1.08);
  fs(ctx, '#ffffff', r * 0.22);
  const px = x + look * r * 0.35;
  const py = y + (mood === 'shrug' ? r * 0.3 : 0);
  ell(ctx, px, py, r * 0.5, r * 0.56);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ell(ctx, px - r * 0.18, py - r * 0.22, r * 0.16, r * 0.16);
  ctx.fill();
  if (mood === 'shrug') {
    // heavy lids
    ctx.fillStyle = 'rgba(0,0,0,0.0)';
    ctx.beginPath();
    ctx.moveTo(x - r * 1.05, y - r * 0.1);
    ctx.lineTo(x + r * 1.05, y - r * 0.1);
    ctx.strokeStyle = INK;
    ctx.lineWidth = r * 0.28;
    ctx.stroke();
  }
}

function brows(ctx, x, y, w, mood, side) {
  if (mood !== 'no' && mood !== 'shrug') return;
  ctx.strokeStyle = INK;
  ctx.lineWidth = w * 0.28;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const tilt = mood === 'no' ? 0.35 : -0.35;
  ctx.moveTo(x - w * 0.6, y + side * tilt * w * 0.5);
  ctx.lineTo(x + w * 0.6, y - side * tilt * w * 0.5);
  ctx.stroke();
}

// A mouth for the human-ish faces.
function mouth(ctx, x, y, w, mood, t) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = w * 0.12;
  if (mood === 'munch') {
    const open = 0.3 + Math.abs(Math.sin(t * 9)) * 0.7;
    ell(ctx, x, y, w * 0.32, w * 0.22 * open);
    fs(ctx, '#7a1f2a', w * 0.1);
    return;
  }
  if (mood === 'love' || mood === 'yum') {
    ctx.beginPath();
    ctx.moveTo(x - w * 0.5, y - w * 0.1);
    ctx.quadraticCurveTo(x, y + w * 0.65, x + w * 0.5, y - w * 0.1);
    ctx.closePath();
    fs(ctx, '#7a1f2a', w * 0.1);
    if (mood === 'yum') {
      ell(ctx, x + w * 0.2 + Math.sin(t * 6) * w * 0.08, y + w * 0.28, w * 0.18, w * 0.14);
      fs(ctx, '#ff6b8a', w * 0.06);
    }
    return;
  }
  if (mood === 'no') {
    ctx.beginPath();
    ctx.arc(x, y + w * 0.35, w * 0.35, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
    return;
  }
  if (mood === 'shrug') {
    ctx.beginPath();
    ctx.moveTo(x - w * 0.35, y);
    ctx.quadraticCurveTo(x - w * 0.12, y - w * 0.1, x, y);
    ctx.quadraticCurveTo(x + w * 0.12, y + w * 0.1, x + w * 0.35, y);
    ctx.stroke();
    return;
  }
  ctx.beginPath();
  ctx.arc(x, y - w * 0.12, w * 0.36, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();
}

function cheeks(ctx, x, y, gap, r, mood) {
  ctx.fillStyle = mood === 'love' || mood === 'yum' || mood === 'munch' ? 'rgba(255,90,120,0.55)' : 'rgba(255,120,140,0.3)';
  ell(ctx, x - gap, y, r, r * 0.65);
  ctx.fill();
  ell(ctx, x + gap, y, r, r * 0.65);
  ctx.fill();
}

// Shoulders and shirt: a rounded block from the counter up to the neck.
function torso(ctx, x, y, w, h, fill, lw, up = 0) {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y + 10);
  ctx.lineTo(x - w / 2, y - h * 0.55 - up);
  ctx.quadraticCurveTo(x - w / 2, y - h - up, x - w * 0.2, y - h - up * 0.6);
  ctx.lineTo(x + w * 0.2, y - h - up * 0.6);
  ctx.quadraticCurveTo(x + w / 2, y - h - up, x + w / 2, y - h * 0.55 - up);
  ctx.lineTo(x + w / 2, y + 10);
  ctx.closePath();
  fs(ctx, fill, lw);
}

function hibiscus(ctx, x, y, r, col = '#ffe14d') {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    ell(ctx, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5, r * 0.36, a);
    ctx.fillStyle = col;
    ctx.fill();
  }
  ctx.fillStyle = '#ff7a1a';
  ell(ctx, x, y, r * 0.22, r * 0.22);
  ctx.fill();
}

// Shrug hands up beside the shoulders.
function shrugHands(ctx, x, y, w, skin, lw) {
  for (const s of [-1, 1]) {
    ell(ctx, x + s * w * 0.62, y - 95, 16, 13, s * 0.4);
    fs(ctx, skin, lw);
  }
}

function pelican(ctx, x, y, mood, t, lw) {
  const up = mood === 'shrug' ? 10 : 0;
  torso(ctx, x, y, 150, 90, '#f2f4f8', lw, up);
  // a little life vest
  ctx.beginPath();
  ctx.moveTo(x - 55, y + 10);
  ctx.lineTo(x - 50, y - 70);
  ctx.lineTo(x - 18, y - 80);
  ctx.lineTo(x - 18, y + 10);
  ctx.closePath();
  fs(ctx, '#ff8a2a', lw);
  ctx.beginPath();
  ctx.moveTo(x + 55, y + 10);
  ctx.lineTo(x + 50, y - 70);
  ctx.lineTo(x + 18, y - 80);
  ctx.lineTo(x + 18, y + 10);
  ctx.closePath();
  fs(ctx, '#ff8a2a', lw);
  // neck
  roundRect(ctx, x - 24, y - 150, 48, 90, 22);
  fs(ctx, '#f2f4f8', lw);
  // head
  ell(ctx, x, y - 168, 42, 38);
  fs(ctx, '#ffffff', lw);
  ctx.fillStyle = '#ffe48a';
  ell(ctx, x - 6, y - 196, 22, 10, -0.2);
  ctx.fill();
  eye(ctx, x - 16, y - 176, 8, mood, t, 0.4, '#ffd23a');
  eye(ctx, x + 16, y - 176, 8, mood, t, 0.4, '#ffd23a');
  brows(ctx, x - 16, y - 192, 12, mood, -1);
  brows(ctx, x + 16, y - 192, 12, mood, 1);
  // the great beak and pouch
  const open = mood === 'munch' ? Math.abs(Math.sin(t * 9)) * 14 : mood === 'love' || mood === 'yum' ? 10 : 0;
  ctx.beginPath();
  ctx.moveTo(x - 14, y - 160);
  ctx.quadraticCurveTo(x - 10, y - 110 + open, x + 6, y - 82 + open);
  ctx.quadraticCurveTo(x + 22, y - 110 + open, x + 14, y - 160);
  ctx.closePath();
  fs(ctx, '#ff9f6a', lw);
  ctx.beginPath();
  ctx.moveTo(x - 16, y - 162);
  ctx.quadraticCurveTo(x - 20, y - 118, x + 2, y - 92);
  ctx.quadraticCurveTo(x + 8, y - 120, x + 16, y - 162);
  ctx.quadraticCurveTo(x, y - 170, x - 16, y - 162);
  fs(ctx, '#ffb627', lw);
  ctx.fillStyle = '#e07a10';
  ell(ctx, x + 2, y - 95, 5, 4);
  ctx.fill();
  if (mood === 'no') {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 140);
    ctx.lineTo(x + 8, y - 136);
    ctx.stroke();
  }
  // bucket hat
  ctx.beginPath();
  ctx.moveTo(x - 50, y - 196);
  ctx.quadraticCurveTo(x, y - 210, x + 50, y - 196);
  ctx.lineTo(x + 34, y - 206);
  ctx.quadraticCurveTo(x + 30, y - 236, x, y - 236);
  ctx.quadraticCurveTo(x - 30, y - 236, x - 34, y - 206);
  ctx.closePath();
  fs(ctx, '#3ab8d6', lw);
  ctx.fillStyle = '#ffe14d';
  ctx.fillRect(x - 33, y - 214, 66, 7);
  if (mood === 'shrug') shrugHands(ctx, x, y, 150, '#f2f4f8', lw);
}

function gatorHead(ctx, x, y, mood, t, lw, chef = false) {
  // head: a broad green dome with a long snout toward the viewer's right
  const open = mood === 'munch' ? Math.abs(Math.sin(t * 9)) * 16 : mood === 'love' || mood === 'yum' ? 12 : 0;
  // lower jaw
  ctx.beginPath();
  ctx.moveTo(x - 40, y - 135);
  ctx.quadraticCurveTo(x + 10, y - 120 + open, x + 78, y - 138 + open * 0.8);
  ctx.quadraticCurveTo(x + 86, y - 146 + open * 0.6, x + 70, y - 150 + open * 0.5);
  ctx.lineTo(x - 30, y - 150);
  ctx.closePath();
  fs(ctx, '#7ccf5a', lw);
  if (open > 2) {
    ctx.beginPath();
    ctx.moveTo(x - 20, y - 148);
    ctx.lineTo(x + 70, y - 150 + open * 0.4);
    ctx.lineTo(x + 66, y - 146 + open * 0.7);
    ctx.quadraticCurveTo(x + 10, y - 132 + open * 0.8, x - 20, y - 140);
    ctx.closePath();
    fs(ctx, '#c0304a', 0);
  }
  // upper head and snout
  ctx.beginPath();
  ctx.moveTo(x - 52, y - 140);
  ctx.quadraticCurveTo(x - 56, y - 205, x - 10, y - 208);
  ctx.quadraticCurveTo(x + 20, y - 206, x + 30, y - 185);
  ctx.quadraticCurveTo(x + 70, y - 178, x + 88, y - 166);
  ctx.quadraticCurveTo(x + 96, y - 152, x + 80, y - 148);
  ctx.lineTo(x - 30, y - 148);
  ctx.closePath();
  fs(ctx, '#5bb84a', lw);
  // teeth along the snout
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 6; i++) {
    const tx = x - 8 + i * 14;
    ctx.beginPath();
    ctx.moveTo(tx, y - 149);
    ctx.lineTo(tx + 5, y - 140);
    ctx.lineTo(tx + 10, y - 149);
    ctx.closePath();
    fs(ctx, '#ffffff', 2);
  }
  // bumps, nostrils, scutes
  ctx.fillStyle = '#3f8f33';
  ell(ctx, x + 80, y - 166, 4, 3);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    ell(ctx, x - 30 + i * 16, y - 186 + Math.abs(i - 1.5) * 3, 5, 3);
    ctx.fill();
  }
  // eyes on bumps
  for (const [ex, ey] of [[-28, -204], [4, -206]]) {
    ell(ctx, x + ex, y + ey, 17, 15);
    fs(ctx, '#5bb84a', lw);
    eye(ctx, x + ex, y + ey - 2, 10, mood, t, 0.3, null);
  }
  brows(ctx, x - 28, y - 224, 14, mood, -1);
  brows(ctx, x + 4, y - 226, 14, mood, 1);
  if (chef) {
    // chef hat
    ctx.beginPath();
    ctx.moveTo(x - 40, y - 214);
    ctx.lineTo(x - 42, y - 240);
    ctx.arc(x - 30, y - 258, 22, Math.PI * 0.8, Math.PI * 1.75);
    ctx.arc(x - 2, y - 270, 26, Math.PI * 1.1, Math.PI * 1.9);
    ctx.arc(x + 24, y - 256, 22, Math.PI * 1.3, Math.PI * 0.2);
    ctx.lineTo(x + 30, y - 214);
    ctx.closePath();
    fs(ctx, '#ffffff', lw);
    ctx.strokeStyle = 'rgba(59,35,20,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 40, y - 226);
    ctx.lineTo(x + 30, y - 226);
    ctx.stroke();
  }
}

function gator(ctx, x, y, mood, t, lw) {
  const up = mood === 'shrug' ? 10 : 0;
  torso(ctx, x, y, 170, 95, '#ff5f6a', lw, up);
  // flowery shirt
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 85, y - 110, 170, 120);
  ctx.clip();
  for (let i = 0; i < 9; i++) hibiscus(ctx, x - 70 + (i % 5) * 36 + (i > 4 ? 18 : 0), y - 70 + (i > 4 ? 38 : 0), 12, i % 2 ? '#ffe14d' : '#ffffff');
  ctx.restore();
  // collar
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x, y - 92);
    ctx.lineTo(x + s * 38, y - 98);
    ctx.lineTo(x + s * 22, y - 66);
    ctx.closePath();
    fs(ctx, '#ff8a92', lw);
  }
  roundRect(ctx, x - 28, y - 150, 56, 64, 20);
  fs(ctx, '#5bb84a', lw);
  ctx.fillStyle = '#c6ec8a';
  roundRect(ctx, x - 16, y - 140, 32, 50, 12);
  ctx.fill();
  gatorHead(ctx, x, y + 4, mood, t, lw);
  if (mood === 'shrug') shrugHands(ctx, x, y, 170, '#5bb84a', lw);
}

function human(ctx, x, y, mood, t, lw, o) {
  const up = mood === 'shrug' ? 10 : 0;
  torso(ctx, x, y, o.w || 150, 88, o.shirt, lw, up);
  if (o.shirtArt) o.shirtArt();
  // neck
  roundRect(ctx, x - 17, y - 120, 34, 44, 12);
  fs(ctx, o.skin, lw);
  if (o.hairBack) o.hairBack();
  // ears
  ell(ctx, x - 46, y - 160, 10, 13);
  fs(ctx, o.skin, lw);
  ell(ctx, x + 46, y - 160, 10, 13);
  fs(ctx, o.skin, lw);
  // head
  ell(ctx, x, y - 165, 46, 52);
  fs(ctx, o.skin, lw);
  cheeks(ctx, x, y - 148, 27, 9, mood);
  if (o.freckles) {
    ctx.fillStyle = 'rgba(120,60,30,0.6)';
    for (let i = 0; i < 6; i++) {
      ell(ctx, x - 30 + (i % 3) * 6 + (i > 2 ? 48 : 0), y - 152 + (i % 2) * 5, 1.8, 1.8);
      ctx.fill();
    }
  }
  eye(ctx, x - 17, y - 170, 9, mood, t, 0.35);
  eye(ctx, x + 17, y - 170, 9, mood, t, 0.35);
  brows(ctx, x - 17, y - 186, 12, mood, -1);
  brows(ctx, x + 17, y - 186, 12, mood, 1);
  // nose
  ctx.strokeStyle = 'rgba(59,35,20,0.6)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 2, y - 162);
  ctx.quadraticCurveTo(x + 7, y - 152, x, y - 150);
  ctx.stroke();
  mouth(ctx, x, y - 134, 30, mood, t);
  if (o.hair) o.hair();
  if (mood === 'shrug') shrugHands(ctx, x, y, o.w || 150, o.skin, lw);
}

function surfer(ctx, x, y, mood, t, lw) {
  human(ctx, x, y, mood, t, lw, {
    skin: '#d99a6c',
    shirt: '#1fc6c6',
    shirtArt() {
      // tank top straps and a wave
      ctx.fillStyle = '#d99a6c';
      ctx.beginPath();
      ctx.moveTo(x - 40, y - 88);
      ctx.quadraticCurveTo(x, y - 40, x + 40, y - 88);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x - 40, y - 15);
      ctx.quadraticCurveTo(x - 20, y - 35, x, y - 20);
      ctx.quadraticCurveTo(x + 20, y - 5, x + 40, y - 25);
      ctx.stroke();
      // shell necklace
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (0.2 + (i / 6) * 0.6);
        ell(ctx, x + Math.cos(a) * 32, y - 92 + Math.sin(a) * 26, 3.5, 3.5);
        fs(ctx, i % 2 ? '#ffffff' : '#ffb0c0', 1.5);
      }
    },
    hair() {
      ctx.beginPath();
      ctx.moveTo(x - 50, y - 160);
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        const rr = 56 + (i % 2) * 10;
        ctx.lineTo(x + Math.cos(a) * rr, y - 172 + Math.sin(a) * rr * 0.85);
      }
      ctx.lineTo(x + 50, y - 160);
      ctx.quadraticCurveTo(x + 30, y - 190, x + 5, y - 186);
      ctx.quadraticCurveTo(x - 10, y - 196, x - 25, y - 186);
      ctx.quadraticCurveTo(x - 40, y - 182, x - 50, y - 160);
      fs(ctx, '#ffd84a', lw);
      // sunglasses on the forehead
      ctx.fillStyle = '#ff4f9a';
      roundRect(ctx, x - 36, y - 206, 30, 12, 5);
      fs(ctx, '#ff4f9a', 2.5);
      roundRect(ctx, x + 6, y - 206, 30, 12, 5);
      fs(ctx, '#ff4f9a', 2.5);
    },
  });
}

function abuela(ctx, x, y, mood, t, lw) {
  human(ctx, x, y, mood, t, lw, {
    skin: '#eab896',
    shirt: '#a46ad8',
    shirtArt() {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - 75, y - 100, 150, 110);
      ctx.clip();
      for (let i = 0; i < 8; i++) hibiscus(ctx, x - 62 + (i % 4) * 40 + (i > 3 ? 20 : 0), y - 60 + (i > 3 ? 36 : 0), 10, i % 2 ? '#ffd0e8' : '#ffe14d');
      ctx.restore();
      // white collar
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x, y - 86);
        ctx.quadraticCurveTo(x + s * 30, y - 96, x + s * 36, y - 80);
        ctx.quadraticCurveTo(x + s * 22, y - 66, x, y - 76);
        ctx.closePath();
        fs(ctx, '#ffffff', lw * 0.8);
      }
    },
    hairBack() {
      ell(ctx, x, y - 222, 26, 20);
      fs(ctx, '#e8e8f0', lw);
    },
    hair() {
      ctx.beginPath();
      ctx.moveTo(x - 50, y - 160);
      ctx.quadraticCurveTo(x - 56, y - 222, x, y - 220);
      ctx.quadraticCurveTo(x + 56, y - 222, x + 50, y - 160);
      ctx.quadraticCurveTo(x + 40, y - 190, x, y - 192);
      ctx.quadraticCurveTo(x - 40, y - 190, x - 50, y - 160);
      fs(ctx, '#f2f2f8', lw);
      ctx.strokeStyle = '#c8c8d8';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(x - 30 + i * 20, y - 200, 8, Math.PI, 0);
        ctx.stroke();
      }
      // round glasses
      ctx.strokeStyle = '#c0306a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x - 17, y - 170, 14, 0, TAU);
      ctx.moveTo(x + 31, y - 170);
      ctx.arc(x + 17, y - 170, 14, 0, TAU);
      ctx.moveTo(x - 3, y - 172);
      ctx.lineTo(x + 3, y - 172);
      ctx.stroke();
      // earrings
      for (const s of [-1, 1]) {
        ell(ctx, x + s * 47, y - 146, 5, 5);
        fs(ctx, '#ffffff', 1.5);
      }
    },
  });
}

function skater(ctx, x, y, mood, t, lw) {
  human(ctx, x, y + 8, mood, t, lw, {
    skin: '#a86a42',
    shirt: '#ffd23a',
    w: 136,
    freckles: true,
    shirtArt() {
      // lightning bolt
      ctx.beginPath();
      ctx.moveTo(x + 6, y - 66);
      ctx.lineTo(x - 14, y - 30);
      ctx.lineTo(x, y - 30);
      ctx.lineTo(x - 8, y);
      ctx.lineTo(x + 16, y - 40);
      ctx.lineTo(x + 2, y - 40);
      ctx.closePath();
      fs(ctx, '#ff5f2a', 2.5);
    },
    hair() {
      // backwards cap
      ctx.beginPath();
      ctx.moveTo(x - 48, y - 168);
      ctx.quadraticCurveTo(x - 50, y - 222, x, y - 222);
      ctx.quadraticCurveTo(x + 50, y - 222, x + 48, y - 168);
      ctx.quadraticCurveTo(x, y - 184, x - 48, y - 168);
      fs(ctx, '#e8303a', lw);
      ctx.beginPath();
      ctx.moveTo(x - 40, y - 176);
      ctx.quadraticCurveTo(x - 68, y - 172, x - 74, y - 160);
      ctx.quadraticCurveTo(x - 60, y - 162, x - 44, y - 166);
      fs(ctx, '#b8202a', lw);
      ctx.fillStyle = '#ffffff';
      ell(ctx, x, y - 222, 5, 3);
      ctx.fill();
      // curls poking out
      ctx.fillStyle = '#2b1a12';
      for (let i = 0; i < 3; i++) {
        ell(ctx, x + 36 + i * 4, y - 170 + i * 8, 7, 6);
        ctx.fill();
      }
    },
  });
}

function flamingo(ctx, x, y, mood, t, lw) {
  const up = mood === 'shrug' ? 10 : 0;
  // body: fluffy pink with a lei
  ctx.beginPath();
  ctx.moveTo(x - 70, y + 10);
  ctx.quadraticCurveTo(x - 80, y - 60 - up, x - 30, y - 78 - up);
  ctx.quadraticCurveTo(x + 10, y - 90 - up, x + 50, y - 70 - up);
  ctx.quadraticCurveTo(x + 82, y - 40, x + 72, y + 10);
  ctx.closePath();
  fs(ctx, '#ff8fbf', lw);
  ctx.strokeStyle = 'rgba(220,60,130,0.5)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(x - 40 + i * 26, y - 30, 14, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  // S neck
  ctx.strokeStyle = INK;
  ctx.lineWidth = 30;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 6, y - 70);
  ctx.bezierCurveTo(x + 40, y - 110, x - 40, y - 140, x - 4, y - 172);
  ctx.stroke();
  ctx.strokeStyle = '#ff8fbf';
  ctx.lineWidth = 24;
  ctx.stroke();
  // lei
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.05 + (i / 6) * 0.9);
    hibiscus(ctx, x - 4 + Math.cos(a) * 30, y - 76 + Math.sin(a) * 12, 8, i % 2 ? '#ffe14d' : '#ffffff');
  }
  // head
  ell(ctx, x, y - 182, 30, 26);
  fs(ctx, '#ff8fbf', lw);
  eye(ctx, x - 6, y - 190, 8, mood, t, 0.4);
  brows(ctx, x - 6, y - 206, 11, mood, -1);
  // bent beak
  const open = mood === 'munch' ? Math.abs(Math.sin(t * 9)) * 8 : 0;
  ctx.beginPath();
  ctx.moveTo(x + 18, y - 194);
  ctx.quadraticCurveTo(x + 52, y - 196, x + 58, y - 172);
  ctx.quadraticCurveTo(x + 60, y - 156 + open, x + 50, y - 150 + open);
  ctx.quadraticCurveTo(x + 42, y - 168, x + 22, y - 172);
  ctx.closePath();
  fs(ctx, '#fff2e0', lw);
  ctx.beginPath();
  ctx.moveTo(x + 48, y - 182);
  ctx.quadraticCurveTo(x + 60, y - 176, x + 58, y - 168);
  ctx.quadraticCurveTo(x + 60, y - 156 + open, x + 50, y - 150 + open);
  ctx.quadraticCurveTo(x + 48, y - 164, x + 44, y - 170);
  ctx.closePath();
  fs(ctx, '#2b1f3a', lw * 0.7);
  if (mood === 'love' || mood === 'yum' || mood === 'munch') cheeks(ctx, x + 6, y - 172, 0, 8, mood);
  if (mood === 'shrug') {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + s * 60, y - 60);
      ctx.quadraticCurveTo(x + s * 90, y - 100, x + s * 70, y - 115);
      ctx.quadraticCurveTo(x + s * 60, y - 90, x + s * 45, y - 70);
      fs(ctx, '#ff6fa8', lw);
    }
  }
}

const FOLKS = { pelican, gator, surfer, abuela, flamingo, skater };

// A customer at the counter. shake: head-shake phase for 'no'.
export function drawCustomer(ctx, who, x, y, k, mood, t) {
  ctx.save();
  let dx = 0;
  if (mood === 'no') dx = Math.sin(t * 22) * 7 * Math.max(0, 1 - (t % 1.2));
  const bob = mood === 'munch' ? Math.abs(Math.sin(t * 9)) * 3 : mood === 'love' || mood === 'yum' ? Math.abs(Math.sin(t * 5)) * 6 : Math.sin(t * 2) * 2;
  ctx.translate(x + dx, y - bob);
  ctx.scale(k, k);
  (FOLKS[who] || surfer)(ctx, 0, 0, mood, t, 4.5);
  ctx.restore();
}

// Little floating hearts / sparkles / crumbs over a happy customer, t seconds into it.
export function drawHappyBits(ctx, x, y, k, mood, t) {
  ctx.save();
  if (mood === 'love' || mood === 'yum') {
    for (let i = 0; i < 6; i++) {
      const tt = (t * 0.8 + i / 6) % 1;
      const hx = x + Math.sin(i * 2.1 + t * 2) * 60 * k + (i - 2.5) * 18 * k;
      const hy = y - 230 * k - tt * 120 * k;
      ctx.globalAlpha = 1 - tt;
      if (mood === 'love') heart(ctx, hx, hy, 12 * k * (0.7 + tt * 0.6));
      else {
        // "mmm" wavy lines
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4 * k;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let j = 0; j <= 6; j++) ctx.lineTo(hx - 14 * k + j * 5 * k, hy + (j % 2 ? -5 : 5) * k);
        ctx.stroke();
      }
    }
  }
  if (mood === 'munch') {
    for (let i = 0; i < 5; i++) {
      const tt = (t * 1.5 + i / 5) % 1;
      ctx.globalAlpha = 1 - tt;
      ctx.fillStyle = i % 2 ? '#e5a54a' : '#f6d38a';
      ctx.fillRect(x + (hash(i) - 0.5) * 60 * k, y - 140 * k + tt * 60 * k, 6 * k, 6 * k);
    }
  }
  if (mood === 'shrug') {
    ctx.globalAlpha = Math.min(1, t * 2);
    ctx.fillStyle = '#9ad8ff';
    ctx.beginPath();
    const sx = x + 48 * k;
    const sy = y - 200 * k + Math.min(t, 1) * 12 * k;
    ctx.moveTo(sx, sy - 12 * k);
    ctx.quadraticCurveTo(sx + 9 * k, sy, sx, sy + 6 * k);
    ctx.quadraticCurveTo(sx - 9 * k, sy, sx, sy - 12 * k);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// The free kitchen's hungry gator, with his reactions
// ---------------------------------------------------------------------------------------------

const REACT_MOOD = { love: 'love', yum: 'yum', yuck: 'no', fire: 'munch', freeze: 'shrug', smoke: 'no', burp: 'yum', rainbow: 'love' };

// The gator chef at (x, y) (bottom middle), k scale. reaction: { kind, power } or null, t its age.
export function drawGatorChef(ctx, x, y, k, reaction, t, time) {
  const kind = reaction?.kind;
  ctx.save();
  let dx = 0;
  let dy = Math.sin(time * 2) * 3;
  let sc = 1;
  if (kind === 'freeze') dx = Math.sin(time * 40) * 3;
  if (kind === 'yuck') dx = Math.sin(time * 18) * 5 * Math.max(0, 1 - t * 0.4);
  if (kind === 'burp') sc = 1 + Math.max(0, Math.sin(Math.min(t, 1) * Math.PI)) * 0.12;
  if (kind === 'love' || kind === 'rainbow') dy -= Math.abs(Math.sin(time * 6)) * 8;
  ctx.translate(x + dx, y + dy);
  ctx.scale(k * sc, k * sc);
  const mood = !reaction ? (Math.sin(time * 0.7) > 0.6 ? 'yum' : 'wait') : REACT_MOOD[kind] || 'yum';
  // body in a chef's bib
  torso(ctx, 0, 0, 180, 95, '#5bb84a', 4.5);
  ctx.beginPath();
  ctx.moveTo(-50, 10);
  ctx.lineTo(-44, -80);
  ctx.quadraticCurveTo(0, -92, 44, -80);
  ctx.lineTo(50, 10);
  ctx.closePath();
  fs(ctx, '#ffffff', 4.5);
  heart(ctx, 0, -40, 14, '#ff5f8a');
  roundRect(ctx, -28, -150, 56, 70, 20);
  fs(ctx, '#5bb84a', 4.5);
  ctx.fillStyle = '#c6ec8a';
  roundRect(ctx, -16, -140, 32, 56, 12);
  ctx.fill();
  // tint the head for some reactions
  gatorHead(ctx, 0, 4, kind === 'burp' ? 'love' : mood, time, 4.5, true);
  if (kind === 'yuck') {
    // green face and a tongue out
    ctx.fillStyle = 'rgba(120,200,40,0.35)';
    ell(ctx, 10, -175, 70, 40);
    ctx.fill();
    ell(ctx, 50, -128, 16, 10, 0.3);
    fs(ctx, '#ff6b8a', 3);
    ctx.strokeStyle = '#3f8f33';
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(-70 - i * 8, -190 + i * 18, 10, -0.8, 0.8);
      ctx.stroke();
    }
  }
  if (kind === 'freeze') {
    ctx.fillStyle = 'rgba(140,210,255,0.45)';
    ell(ctx, 10, -175, 74, 46);
    ctx.fill();
    // icicles off the snout and an ice cube on the head
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(-4 + i * 16, -146);
      ctx.lineTo(4 + i * 16, -146);
      ctx.lineTo(i * 16, -128 + (i % 2) * 6);
      ctx.closePath();
      fs(ctx, '#d8f4ff', 2);
    }
    ctx.save();
    ctx.translate(-12, -290);
    ctx.rotate(0.2);
    roundRect(ctx, -18, -18, 36, 36, 6);
    fs(ctx, 'rgba(200,240,255,0.9)', 3);
    ctx.restore();
  }
  if (kind === 'smoke') {
    ctx.fillStyle = 'rgba(40,30,30,0.35)';
    ell(ctx, 10, -178, 74, 44);
    ctx.fill();
  }
  ctx.restore();
  // effects in screen space around the snout
  const sx = x + 92 * k;
  const sy = y - 150 * k;
  ctx.save();
  if (kind === 'fire') {
    const n = Math.min(4, reaction.power);
    const grow = Math.min(1, t * 2.5) * (1.3 + n * 0.3);
    for (let i = 0; i < 6; i++) {
      const fx = sx + (20 + i * 26) * k * grow;
      const fy = sy + Math.sin(time * 18 + i) * 6 * k;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(Math.PI / 2);
      flame(ctx, 0, 0, (34 - i * 3) * k * grow, time + i);
      ctx.restore();
    }
  }
  if (kind === 'smoke' || kind === 'burp') {
    for (let i = 0; i < 4; i++) {
      const tt = (t * 0.7 + i * 0.25) % 1;
      ctx.globalAlpha = 1 - tt;
      if (kind === 'smoke') {
        ctx.fillStyle = '#4a4048';
        ell(ctx, sx + tt * 80 * k, sy - tt * 90 * k, (14 + tt * 30) * k, (12 + tt * 24) * k);
        ctx.fill();
      } else {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6 * k;
        ctx.beginPath();
        ctx.arc(sx, sy, (20 + tt * 140) * k, -0.9, 0.9);
        ctx.stroke();
      }
    }
  }
  if (kind === 'rainbow') {
    const cols = ['#ff4b4b', '#ff9a2a', '#ffe14d', '#5fd35a', '#3ab8ff', '#a46ad8'];
    const len = Math.min(1, t * 1.5);
    cols.forEach((c, i) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = 9 * k;
      ctx.beginPath();
      ctx.arc(sx + 60 * k, sy + 20 * k, (110 - i * 9) * k, Math.PI, Math.PI + Math.PI * len);
      ctx.stroke();
    });
  }
  if (kind === 'love' || kind === 'rainbow') {
    for (let i = 0; i < 7; i++) {
      const tt = (t * 0.6 + i / 7) % 1;
      ctx.globalAlpha = 1 - tt;
      heart(ctx, x + (i - 3) * 34 * k + Math.sin(time * 3 + i) * 10 * k, y - 260 * k - tt * 160 * k, 14 * k);
    }
  }
  if (kind === 'freeze') {
    for (let i = 0; i < 8; i++) {
      const tt = (t * 0.5 + i / 8) % 1;
      ctx.globalAlpha = 1 - tt;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3 * k;
      const fx = x + (i - 3.5) * 40 * k;
      const fy = y - 300 * k + tt * 200 * k;
      for (let a = 0; a < 3; a++) {
        ctx.beginPath();
        ctx.moveTo(fx - Math.cos(a) * 9 * k, fy - Math.sin(a) * 9 * k);
        ctx.lineTo(fx + Math.cos(a) * 9 * k, fy + Math.sin(a) * 9 * k);
        ctx.stroke();
      }
    }
  }
  if (kind === 'yum') {
    for (let i = 0; i < 4; i++) {
      const tt = (t * 0.8 + i / 4) % 1;
      ctx.globalAlpha = 1 - tt;
      ctx.fillStyle = '#ffe14d';
      const fx = x + (i - 1.5) * 50 * k;
      const fy = y - 270 * k - tt * 100 * k;
      ctx.beginPath();
      for (let j = 0; j < 8; j++) {
        const a = (j / 8) * TAU;
        const rr = j % 2 ? 4 * k : 11 * k;
        ctx.lineTo(fx + Math.cos(a) * rr, fy + Math.sin(a) * rr);
      }
      ctx.fill();
    }
  }
  ctx.restore();
}
