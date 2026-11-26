// Beat Booth pictures, all drawn in code: the club, the turntable, pads and their icons,
// the beat grid, the dancers, the song records and the launcher tile.
import { PADS, ROWS, STYLES, TEMPOS } from './music.js';
import { SONG_COLOURS, SONG_PICS } from './song.js';

export const C = {
  ink: '#1b0f3b',
  night: '#160c34',
  plum: '#2d1257',
  violet: '#4b1d82',
  pink: '#ff3d9a',
  hot: '#ff2e63',
  orange: '#ff8a4c',
  sun: '#ffe14d',
  sea: '#19c3d6',
  mint: '#4fe07a',
  white: '#ffffff',
  red: '#ff3344',
  green: '#2fd36b',
};
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

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

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.1, r), 0, TAU);
}

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}

// fill and outline in one go
function paint(ctx, fill, lw) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (lw) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  }
}

// lighten (k > 0) or darken (k < 0) a #rrggbb colour
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k)));
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`;
}

// ---------- the club ----------

export function drawClub(ctx, w, h, time, pulse = 0, hue = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1a0b3d');
  g.addColorStop(0.6, '#2d1257');
  g.addColorStop(1, '#13082c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // light beams swinging from the ceiling
  const beams = ['#ff3d9a', '#19c3d6', '#ffe14d', '#4fe07a', '#a66bff'];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const x = w * (0.12 + i * 0.25);
    const a = Math.sin(time * (0.6 + i * 0.17) + i * 1.7) * 0.5;
    const col = beams[(i + hue) % beams.length];
    ctx.save();
    ctx.translate(x, -10);
    ctx.rotate(a);
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, col);
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.1 + pulse * 0.12;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(6, 0);
    ctx.lineTo(h * 0.22, h);
    ctx.lineTo(-h * 0.22, h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  // twinkly dots
  for (let i = 0; i < 40; i++) {
    const x = ((i * 137.5) % 1000) / 1000 * w;
    const y = ((i * 71.3) % 1000) / 1000 * h;
    const tw = 0.3 + 0.7 * Math.abs(Math.sin(time * 1.3 + i));
    ctx.fillStyle = `rgba(255,255,255,${0.08 * tw})`;
    circle(ctx, x, y, 1.5 + (i % 3));
    ctx.fill();
  }
}

// The stage behind the turntable: a glowing floor and a crowd that bobs on the beat.
export function drawStage(ctx, S, time, bounce, energy) {
  ctx.save();
  roundRect(ctx, S.x, S.y, S.w, S.h, 22);
  ctx.clip();
  const g = ctx.createLinearGradient(0, S.y, 0, S.y + S.h);
  g.addColorStop(0, 'rgba(255,61,154,0.10)');
  g.addColorStop(1, 'rgba(25,195,214,0.18)');
  ctx.fillStyle = g;
  ctx.fillRect(S.x, S.y, S.w, S.h);
  // dance floor tiles light up with the music
  const n = 10;
  const tw = S.w / n;
  const th = Math.min(28, S.h * 0.14);
  const cols = ['#ff3d9a', '#19c3d6', '#ffe14d', '#4fe07a', '#a66bff'];
  for (let i = 0; i < n; i++) {
    const on = energy > 0.05 && (i + Math.floor(time * 4)) % 3 === 0;
    ctx.fillStyle = on ? cols[i % cols.length] : 'rgba(255,255,255,0.06)';
    ctx.globalAlpha = on ? 0.35 + energy * 0.3 : 1;
    ctx.fillRect(S.x + i * tw + 1, S.y + S.h - th, tw - 2, th - 2);
  }
  ctx.globalAlpha = 1;
  // the crowd: little round critters along the bottom
  const r = clamp(S.h * 0.07, 7, 18);
  const count = Math.floor(S.w / (r * 2.6));
  const crowd = ['#4fe07a', '#ff8a4c', '#19c3d6', '#ffb3c6', '#ffe14d', '#b388ff'];
  for (let i = 0; i < count; i++) {
    const x = S.x + (i + 0.5) * (S.w / count);
    const hop = energy * Math.abs(Math.sin((bounce + i * 0.13) * Math.PI)) * r * 0.9;
    const y = S.y + S.h - th - r * 0.4 - hop;
    const col = crowd[i % crowd.length];
    circle(ctx, x, y, r);
    paint(ctx, col, Math.max(1.5, r * 0.15));
    // ears or eyes on stalks, so they read as animals
    if (i % 3 === 0) {
      circle(ctx, x - r * 0.6, y - r * 0.8, r * 0.35);
      paint(ctx, col, Math.max(1.5, r * 0.12));
      circle(ctx, x + r * 0.6, y - r * 0.8, r * 0.35);
      paint(ctx, col, Math.max(1.5, r * 0.12));
    }
    ctx.fillStyle = C.ink;
    circle(ctx, x - r * 0.32, y - r * 0.1, r * 0.14);
    ctx.fill();
    circle(ctx, x + r * 0.32, y - r * 0.1, r * 0.14);
    ctx.fill();
    // arms up when the music is going
    if (energy > 0.3 && i % 2 === 0) {
      ctx.strokeStyle = col;
      ctx.lineWidth = r * 0.3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - r * 0.8, y + r * 0.2);
      ctx.lineTo(x - r * 1.2, y - r * (0.8 + hop / r));
      ctx.moveTo(x + r * 0.8, y + r * 0.2);
      ctx.lineTo(x + r * 1.2, y - r * (0.8 + hop / r));
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ---------- the turntable ----------

export function drawDeck(ctx, deck, o) {
  const { cx, cy, r } = deck;
  const { angle, playing, held, label, time, beat } = o;
  // plinth
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  circle(ctx, cx + r * 0.04, cy + r * 0.07, r * 1.0);
  ctx.fill();
  const lw = Math.max(2, r * 0.03);
  circle(ctx, cx, cy, r);
  const pg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  pg.addColorStop(0, '#5d5a75');
  pg.addColorStop(1, '#2a2840');
  paint(ctx, pg, lw * 1.4);
  // glow ring that thumps with the beat
  if (playing) {
    ctx.strokeStyle = `rgba(255,225,77,${0.25 + 0.5 * beat})`;
    ctx.lineWidth = r * 0.05;
    circle(ctx, cx, cy, r * 0.965);
    ctx.stroke();
  }
  // the record
  const vr = r * 0.88;
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  circle(ctx, 0, 0, vr);
  paint(ctx, '#111018', lw);
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = Math.max(1, r * 0.008);
  for (let k = 0.45; k < 0.97; k += 0.07) {
    circle(ctx, 0, 0, vr * k);
    ctx.stroke();
  }
  // shine streaks show the spin
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = r * 0.05;
  ctx.beginPath();
  ctx.arc(0, 0, vr * 0.75, -0.5, 0.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, vr * 0.75, Math.PI - 0.5, Math.PI + 0.1);
  ctx.stroke();
  // label: the song picture or the style colour
  const lr = vr * 0.4;
  circle(ctx, 0, 0, lr);
  paint(ctx, label.colour, lw);
  if (label.pic) drawPic(ctx, label.pic, 0, 0, lr * 0.8, time);
  else {
    // a big star so the spin is easy to see
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    star(ctx, 0, -lr * 0.45, lr * 0.28);
    ctx.fill();
  }
  circle(ctx, 0, 0, lr * 0.1);
  paint(ctx, '#ddd', 0);
  ctx.restore();
  // the play / stop sign on the label (it does not spin)
  if (!o.song) {
    ctx.save();
    const s = lr * 0.42;
    ctx.globalAlpha = 0.95;
    circle(ctx, cx, cy, s * 1.25);
    paint(ctx, 'rgba(27,15,59,0.75)', 0);
    if (playing) {
      ctx.fillStyle = C.white;
      roundRect(ctx, cx - s * 0.5, cy - s * 0.5, s, s, s * 0.15);
      ctx.fill();
    } else {
      ctx.fillStyle = C.white;
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.38, cy - s * 0.6);
      ctx.lineTo(cx + s * 0.62, cy);
      ctx.lineTo(cx - s * 0.38, cy + s * 0.6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  // tone arm
  ctx.save();
  const ax = cx + r * 0.82;
  const ay = cy - r * 0.78;
  circle(ctx, ax, ay, r * 0.1);
  paint(ctx, '#c9c9d9', lw);
  ctx.strokeStyle = '#c9c9d9';
  ctx.lineWidth = r * 0.05;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  const swing = playing ? 0 : 0.25;
  const ex = cx + r * (0.42 + swing * 0.5);
  const ey = cy + r * (0.18 - swing);
  ctx.quadraticCurveTo(ax + r * 0.05, cy, ex, ey);
  ctx.stroke();
  ctx.fillStyle = '#8f8fa8';
  roundRect(ctx, ex - r * 0.07, ey - r * 0.04, r * 0.14, r * 0.13, r * 0.03);
  ctx.fill();
  ctx.restore();
  // a hand ring when the record is held
  if (held) {
    ctx.strokeStyle = `rgba(255,61,154,${0.6 + 0.3 * Math.sin(time * 20)})`;
    ctx.lineWidth = r * 0.06;
    circle(ctx, cx, cy, r * 1.02);
    ctx.stroke();
  }
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

// ---------- buttons ----------

// The same dark rounded square as the other games' home buttons.
export function drawIconButton(ctx, b, icon, active = false) {
  ctx.fillStyle = active ? 'rgba(255,61,154,0.75)' : 'rgba(22,11,51,0.45)';
  roundRect(ctx, b.x, b.y, b.w, b.h, b.w * 0.24);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.stroke();
  glyph(ctx, icon, b.x + b.w / 2, b.y + b.h / 2, b.w * 0.3, C.white);
}

// Simple white glyphs: home, back, play, stop, check, cross, bin.
export function glyph(ctx, kind, cx, cy, s, colour) {
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
  } else if (kind === 'play') {
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.6, cy - s * 0.9);
    ctx.lineTo(cx + s * 0.85, cy);
    ctx.lineTo(cx - s * 0.6, cy + s * 0.9);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'stop') {
    roundRect(ctx, cx - s * 0.7, cy - s * 0.7, s * 1.4, s * 1.4, s * 0.2);
    ctx.fill();
  } else if (kind === 'check') {
    ctx.lineWidth = s * 0.4;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.8, cy);
    ctx.lineTo(cx - s * 0.2, cy + s * 0.6);
    ctx.lineTo(cx + s * 0.85, cy - s * 0.6);
    ctx.stroke();
  } else if (kind === 'cross') {
    ctx.lineWidth = s * 0.4;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.7, cy - s * 0.7);
    ctx.lineTo(cx + s * 0.7, cy + s * 0.7);
    ctx.moveTo(cx + s * 0.7, cy - s * 0.7);
    ctx.lineTo(cx - s * 0.7, cy + s * 0.7);
    ctx.stroke();
  } else if (kind === 'bin') {
    ctx.lineWidth = s * 0.16;
    roundRect(ctx, cx - s * 0.65, cy - s * 0.45, s * 1.3, s * 1.4, s * 0.15);
    ctx.fill();
    roundRect(ctx, cx - s * 0.9, cy - s * 0.78, s * 1.8, s * 0.22, s * 0.08);
    ctx.fill();
    roundRect(ctx, cx - s * 0.3, cy - s * 1.0, s * 0.6, s * 0.3, s * 0.08);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    for (const dx of [-0.3, 0, 0.3]) {
      ctx.moveTo(cx + dx * s, cy - s * 0.25);
      ctx.lineTo(cx + dx * s, cy + s * 0.75);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// The big red record button, with a ring that fills as the song gets longer.
export function drawRecButton(ctx, b, o) {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const r = b.w / 2;
  const { mode, progress, time } = o; // mode: 'idle' | 'rec' | 'song'
  ctx.save();
  circle(ctx, cx, cy, r);
  paint(ctx, 'rgba(22,11,51,0.6)', 0);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = r * 0.14;
  circle(ctx, cx, cy, r * 0.86);
  ctx.stroke();
  if (mode !== 'idle') {
    ctx.strokeStyle = mode === 'rec' ? C.red : C.sun;
    ctx.lineWidth = r * 0.14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.86, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0.01, progress));
    ctx.stroke();
  }
  const pulse = mode === 'rec' ? 1 + 0.06 * Math.sin(time * 8) : 1;
  const ir = r * 0.62 * pulse;
  circle(ctx, cx, cy, ir);
  const g = ctx.createRadialGradient(cx - ir * 0.3, cy - ir * 0.3, ir * 0.1, cx, cy, ir);
  const base = mode === 'song' ? '#ffb020' : '#ff3344';
  g.addColorStop(0, shade(base, 0.45));
  g.addColorStop(1, base);
  paint(ctx, g, Math.max(2, r * 0.06));
  if (mode === 'rec' || mode === 'song') glyph(ctx, 'stop', cx, cy, ir * 0.42, C.white);
  else {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    circle(ctx, cx - ir * 0.3, cy - ir * 0.3, ir * 0.2);
    ctx.fill();
  }
  ctx.restore();
}

// The shelf button: a little crate of records, with how many songs are in it.
export function drawShelfButton(ctx, b, count, bump) {
  const k = 1 + bump * 0.25;
  ctx.save();
  ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
  ctx.scale(k, k);
  ctx.translate(-b.w / 2, -b.h / 2);
  ctx.fillStyle = 'rgba(22,11,51,0.45)';
  roundRect(ctx, 0, 0, b.w, b.h, b.w * 0.24);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.stroke();
  const s = b.w;
  const cols = ['#ff3d9a', '#19c3d6', '#ffe14d'];
  for (let i = 0; i < 3; i++) {
    const x = s * (0.32 + i * 0.18);
    const y = s * 0.42;
    circle(ctx, x, y, s * 0.2);
    paint(ctx, '#111018', 1.5);
    circle(ctx, x, y, s * 0.08);
    paint(ctx, cols[i], 0);
  }
  roundRect(ctx, s * 0.14, s * 0.5, s * 0.72, s * 0.32, s * 0.06);
  paint(ctx, '#c98a4b', 2);
  ctx.restore();
  if (count > 0) {
    const r = Math.max(10, b.w * 0.2);
    const x = b.x + b.w - r * 0.3;
    const y = b.y + r * 0.3;
    circle(ctx, x, y, r);
    paint(ctx, C.pink, 2);
    ctx.fillStyle = C.white;
    ctx.font = `800 ${Math.round(r * 1.15)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(count), x, y + r * 0.05);
  }
}

// A pad on the sound board: its colour, its icon, a flash and a squash when hit.
export function drawPad(ctx, b, pad, lit, time) {
  const p = PADS[pad];
  const squash = lit > 0 ? 1 - 0.08 * Math.sin(Math.min(1, lit) * Math.PI) : 1;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(squash * (1 + lit * 0.04), squash);
  const w = b.w;
  const h = b.h;
  const r = Math.min(w, h) * 0.2;
  // depth under the pad
  ctx.fillStyle = shade(p.colour, -0.45);
  roundRect(ctx, -w / 2, -h / 2 + 4, w, h, r);
  ctx.fill();
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, shade(p.colour, 0.3 + lit * 0.5));
  g.addColorStop(1, shade(p.colour, lit * 0.4));
  roundRect(ctx, -w / 2, -h / 2, w, h - 3, r);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = lit > 0.05 ? C.white : 'rgba(27,15,59,0.6)';
  ctx.stroke();
  if (lit > 0) {
    ctx.shadowColor = p.colour;
    ctx.shadowBlur = 30 * lit;
    ctx.strokeStyle = `rgba(255,255,255,${lit})`;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  // a soft shine
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, -w / 2 + 6, -h / 2 + 5, w - 12, h * 0.28, r * 0.7);
  ctx.fill();
  const s = Math.min(w, h) * 0.34;
  drawIcon(ctx, p.id, 0, 0, s, p.colour, time, lit);
  ctx.restore();
}

// ---------- icons ----------

// A pad or control picture, centred, about 2s across.
export function drawIcon(ctx, id, cx, cy, s, colour, time = 0, lit = 0) {
  const lw = Math.max(1.5, s * 0.11);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const W = C.white;
  switch (id) {
    case 'kick': {
      circle(ctx, 0, -s * 0.05, s * 0.85);
      paint(ctx, W, lw);
      circle(ctx, 0, -s * 0.05, s * 0.55);
      paint(ctx, shade(colour, 0.2), lw * 0.7);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        ellipse(ctx, Math.cos(a) * s * 0.85, -s * 0.05 + Math.sin(a) * s * 0.85, s * 0.09, s * 0.09);
        paint(ctx, '#ccc', lw * 0.5);
      }
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, s * 0.6);
      ctx.lineTo(-s * 0.75, s);
      ctx.moveTo(s * 0.5, s * 0.6);
      ctx.lineTo(s * 0.75, s);
      ctx.stroke();
      break;
    }
    case 'snare':
    case 'tom': {
      const tall = id === 'tom' ? 1.35 : 1;
      const top = -s * 0.15 * tall;
      const bh = s * 0.6 * tall;
      ctx.beginPath();
      ctx.moveTo(-s * 0.85, top);
      ctx.lineTo(-s * 0.85, top + bh);
      ctx.ellipse(0, top + bh, s * 0.85, s * 0.28, 0, Math.PI, 0, true);
      ctx.lineTo(s * 0.85, top);
      ctx.closePath();
      paint(ctx, shade(colour, -0.15), lw);
      ctx.strokeStyle = C.white;
      ctx.lineWidth = lw * 0.8;
      for (let i = 0; i < 4; i++) {
        const x = -s * 0.6 + i * s * 0.4;
        ctx.beginPath();
        ctx.moveTo(x, top + s * 0.1);
        ctx.lineTo(x + s * 0.18, top + bh + s * 0.15);
        ctx.stroke();
      }
      ellipse(ctx, 0, top, s * 0.85, s * 0.28);
      paint(ctx, W, lw);
      // sticks
      ctx.strokeStyle = '#f3c98b';
      ctx.lineWidth = lw * 1.3;
      ctx.beginPath();
      ctx.moveTo(-s * 0.95, -s * 0.95);
      ctx.lineTo(s * 0.15, top - s * 0.05);
      if (id === 'snare') {
        ctx.moveTo(s * 0.95, -s * 0.95);
        ctx.lineTo(-s * 0.15, top - s * 0.05);
      }
      ctx.stroke();
      break;
    }
    case 'hat': {
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.5);
      ctx.lineTo(0, s);
      ctx.moveTo(-s * 0.5, s);
      ctx.lineTo(s * 0.5, s);
      ctx.stroke();
      const open = lit * s * 0.15;
      ellipse(ctx, 0, -s * 0.15 - open, s * 0.95, s * 0.2);
      paint(ctx, '#ffe58a', lw);
      ellipse(ctx, 0, s * 0.12, s * 0.95, s * 0.2);
      paint(ctx, '#ffd23f', lw);
      break;
    }
    case 'clap': {
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * s * 0.32, s * 0.1);
        ctx.rotate(side * 0.35);
        roundRect(ctx, -s * 0.3, -s * 0.75, s * 0.6, s * 1.3, s * 0.3);
        paint(ctx, '#ffd6a8', lw);
        ctx.restore();
      }
      ctx.strokeStyle = W;
      ctx.lineWidth = lw;
      ctx.beginPath();
      for (const a of [-2.3, -1.57, -0.84]) {
        ctx.moveTo(Math.cos(a) * s * 0.95, Math.sin(a) * s * 0.95 - s * 0.1);
        ctx.lineTo(Math.cos(a) * s * 1.2, Math.sin(a) * s * 1.2 - s * 0.1);
      }
      ctx.stroke();
      break;
    }
    case 'bell': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.35, -s * 0.7);
      ctx.lineTo(s * 0.35, -s * 0.7);
      ctx.lineTo(s * 0.75, s * 0.7);
      ctx.lineTo(-s * 0.75, s * 0.7);
      ctx.closePath();
      paint(ctx, '#e8edf5', lw);
      ellipse(ctx, 0, s * 0.7, s * 0.75, s * 0.15);
      paint(ctx, '#9aa4b8', lw);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.arc(0, -s * 0.75, s * 0.25, Math.PI, 0);
      ctx.stroke();
      ctx.strokeStyle = W;
      ctx.beginPath();
      ctx.moveTo(s * 0.95, -s * 0.2);
      ctx.lineTo(s * 1.15, -s * 0.35);
      ctx.moveTo(-s * 0.95, -s * 0.2);
      ctx.lineTo(-s * 1.15, -s * 0.35);
      ctx.stroke();
      break;
    }
    case 'conga': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.55, -s * 0.75);
      ctx.quadraticCurveTo(-s * 0.8, 0, -s * 0.4, s * 0.95);
      ctx.lineTo(s * 0.4, s * 0.95);
      ctx.quadraticCurveTo(s * 0.8, 0, s * 0.55, -s * 0.75);
      ctx.closePath();
      paint(ctx, '#b5651d', lw);
      ctx.strokeStyle = '#ffe14d';
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(-s * 0.64, -s * 0.2);
      ctx.lineTo(s * 0.64, -s * 0.2);
      ctx.moveTo(-s * 0.55, s * 0.45);
      ctx.lineTo(s * 0.55, s * 0.45);
      ctx.stroke();
      ellipse(ctx, 0, -s * 0.75, s * 0.55, s * 0.18);
      paint(ctx, '#fff1d6', lw);
      break;
    }
    case 'steel': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.95, -s * 0.05);
      ctx.lineTo(-s * 0.95, s * 0.35);
      ctx.ellipse(0, s * 0.35, s * 0.95, s * 0.4, 0, Math.PI, 0, true);
      ctx.lineTo(s * 0.95, -s * 0.05);
      ctx.closePath();
      paint(ctx, '#c0c7d4', lw);
      ellipse(ctx, 0, -s * 0.05, s * 0.95, s * 0.45);
      paint(ctx, '#e9edf3', lw);
      for (const [x, y, r] of [[-0.4, -0.08, 0.2], [0.35, -0.12, 0.22], [0, 0.18, 0.18], [0.02, -0.3, 0.13]]) {
        ellipse(ctx, x * s, y * s, r * s, r * s * 0.55);
        paint(ctx, shade(colour, 0.1), lw * 0.6);
      }
      break;
    }
    case 'bass': {
      ctx.fillStyle = W;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = lw;
      for (const x of [-0.45, 0.55]) {
        ellipse(ctx, x * s - s * 0.12, s * 0.6, s * 0.32, s * 0.24, -0.4);
        paint(ctx, W, lw);
      }
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, s * 0.55);
      ctx.lineTo(-s * 0.3, -s * 0.75);
      ctx.lineTo(s * 0.7, -s * 0.95);
      ctx.lineTo(s * 0.7, s * 0.55);
      ctx.lineWidth = lw * 2.4;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      ctx.lineWidth = lw * 1.1;
      ctx.strokeStyle = W;
      ctx.stroke();
      break;
    }
    case 'stab': {
      roundRect(ctx, -s * 0.95, -s * 0.6, s * 1.9, s * 1.3, s * 0.15);
      paint(ctx, W, lw);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = lw * 0.6;
      ctx.beginPath();
      for (let i = 1; i < 5; i++) {
        ctx.moveTo(-s * 0.95 + (i * s * 1.9) / 5, -s * 0.6);
        ctx.lineTo(-s * 0.95 + (i * s * 1.9) / 5, s * 0.7);
      }
      ctx.stroke();
      ctx.fillStyle = C.ink;
      for (const i of [1, 2, 4]) {
        roundRect(ctx, -s * 0.95 + (i * s * 1.9) / 5 - s * 0.12, -s * 0.6, s * 0.24, s * 0.72, s * 0.05);
        ctx.fill();
      }
      break;
    }
    case 'horn': {
      roundRect(ctx, -s * 0.95, -s * 0.2, s * 0.75, s * 1.05, s * 0.18);
      paint(ctx, '#ff3344', lw);
      ctx.beginPath();
      ctx.moveTo(-s * 0.25, s * 0.05);
      ctx.lineTo(s * 0.55, -s * 0.55);
      ctx.lineTo(s * 0.7, s * 0.45);
      ctx.closePath();
      paint(ctx, '#e8edf5', lw);
      ellipse(ctx, s * 0.62, -s * 0.05, s * 0.14, s * 0.52, 0.1);
      paint(ctx, '#9aa4b8', lw);
      ctx.strokeStyle = W;
      ctx.lineWidth = lw;
      ctx.beginPath();
      for (const a of [-0.5, 0, 0.5]) {
        ctx.moveTo(s * 0.9 + Math.cos(a) * s * 0.05, -s * 0.05 + Math.sin(a) * s * 0.4);
        ctx.lineTo(s * 1.15, -s * 0.05 + Math.sin(a) * s * 0.7);
      }
      ctx.stroke();
      break;
    }
    case 'laser': {
      ctx.beginPath();
      ctx.moveTo(s * 0.2, -s);
      ctx.lineTo(-s * 0.55, s * 0.1);
      ctx.lineTo(-s * 0.02, s * 0.1);
      ctx.lineTo(-s * 0.25, s);
      ctx.lineTo(s * 0.6, -s * 0.2);
      ctx.lineTo(s * 0.05, -s * 0.2);
      ctx.closePath();
      paint(ctx, '#fff36b', lw);
      break;
    }
    case 'boing': {
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = lw * 2.2;
      const k = 1 + Math.sin(time * 18) * 0.12 * lit;
      const zig = () => {
        ctx.beginPath();
        ctx.moveTo(-s * 0.5, s * 0.95);
        for (let i = 0; i < 6; i++) ctx.lineTo((i % 2 ? -0.5 : 0.5) * s, (s * 0.95 - (i + 1) * s * 0.22 * k));
        ctx.stroke();
      };
      zig();
      ctx.strokeStyle = '#e8edf5';
      ctx.lineWidth = lw;
      zig();
      circle(ctx, s * 0.5, s * 0.95 - 6 * s * 0.22 * k - s * 0.25, s * 0.3);
      paint(ctx, '#ff3d9a', lw);
      break;
    }
    case 'scratch': {
      circle(ctx, 0, 0, s * 0.78);
      paint(ctx, '#111018', lw);
      circle(ctx, 0, 0, s * 0.3);
      paint(ctx, colour, lw * 0.6);
      ctx.strokeStyle = W;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.0, -2.6, -1.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.0, 0.5, 1.7);
      ctx.stroke();
      ctx.fillStyle = W;
      ctx.beginPath();
      ctx.moveTo(Math.cos(-1.4) * s * 1.0 + s * 0.22, Math.sin(-1.4) * s - s * 0.02);
      ctx.lineTo(Math.cos(-1.4) * s * 1.0 - s * 0.1, Math.sin(-1.4) * s - s * 0.22);
      ctx.lineTo(Math.cos(-1.4) * s * 1.0 - s * 0.1, Math.sin(-1.4) * s + s * 0.18);
      ctx.fill();
      break;
    }
    case 'robot': {
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.6);
      ctx.lineTo(0, -s * 0.95);
      ctx.stroke();
      circle(ctx, 0, -s * 0.98, s * 0.14);
      paint(ctx, lit > 0.1 ? '#ff3344' : '#ffe14d', lw * 0.6);
      roundRect(ctx, -s * 0.8, -s * 0.6, s * 1.6, s * 1.4, s * 0.25);
      paint(ctx, '#e8edf5', lw);
      for (const x of [-0.35, 0.35]) {
        circle(ctx, x * s, -s * 0.15, s * 0.2);
        paint(ctx, '#19c3d6', lw * 0.6);
      }
      roundRect(ctx, -s * 0.45, s * 0.3, s * 0.9, s * (0.22 + lit * 0.15), s * 0.06);
      paint(ctx, C.ink, 0);
      break;
    }
    case 'whistle': {
      circle(ctx, -s * 0.2, s * 0.15, s * 0.6);
      paint(ctx, '#ffd23f', lw);
      roundRect(ctx, -s * 0.15, -s * 0.45, s * 1.1, s * 0.4, s * 0.1);
      paint(ctx, '#ffd23f', lw);
      circle(ctx, -s * 0.2, s * 0.15, s * 0.2);
      paint(ctx, C.ink, 0);
      ctx.strokeStyle = W;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(-s * 0.85, -s * 0.5);
      ctx.lineTo(-s * 1.05, -s * 0.8);
      ctx.moveTo(-s * 0.55, -s * 0.7);
      ctx.lineTo(-s * 0.6, -s * 1.0);
      ctx.stroke();
      break;
    }
    // ---- styles ----
    case 'dembow': {
      ctx.strokeStyle = '#8a5a2b';
      ctx.lineWidth = s * 0.22;
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, s);
      ctx.quadraticCurveTo(-s * 0.05, 0, s * 0.15, -s * 0.5);
      ctx.stroke();
      ctx.fillStyle = '#2fae4a';
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = lw * 0.7;
      for (const a of [-2.7, -1.9, -1.2, -0.45, 0.2]) {
        ctx.beginPath();
        ctx.ellipse(s * 0.15 + Math.cos(a) * s * 0.45, -s * 0.5 + Math.sin(a) * s * 0.3, s * 0.5, s * 0.16, a, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      circle(ctx, s * 0.05, -s * 0.35, s * 0.12);
      paint(ctx, '#7a4a1b', lw * 0.5);
      break;
    }
    case 'hiphop': {
      roundRect(ctx, -s, -s * 0.55, s * 2, s * 1.25, s * 0.2);
      paint(ctx, '#3a3f58', lw);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(-s * 0.6, -s * 0.55);
      ctx.lineTo(-s * 0.45, -s * 0.85);
      ctx.lineTo(s * 0.45, -s * 0.85);
      ctx.lineTo(s * 0.6, -s * 0.55);
      ctx.stroke();
      const thump = 1 + lit * 0.15;
      for (const x of [-0.5, 0.5]) {
        circle(ctx, x * s, s * 0.12, s * 0.38 * thump);
        paint(ctx, '#c0c7d4', lw * 0.7);
        circle(ctx, x * s, s * 0.12, s * 0.15);
        paint(ctx, C.ink, 0);
      }
      break;
    }
    case 'house': {
      ctx.strokeStyle = '#c0c7d4';
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(0, -s * 0.75);
      ctx.stroke();
      circle(ctx, 0, s * 0.05, s * 0.8);
      paint(ctx, '#d9dde8', lw);
      ctx.save();
      circle(ctx, 0, s * 0.05, s * 0.8);
      ctx.clip();
      const cols = ['#ffffff', '#9fe8ff', '#ffb3e0', '#fff3a0'];
      const q = s * 0.27;
      for (let i = -3; i <= 3; i++) {
        for (let j = -3; j <= 3; j++) {
          ctx.fillStyle = cols[(i * 3 + j * 7 + Math.floor(time * 6) + 40) % 4];
          ctx.fillRect(i * q - q / 2 + 1, s * 0.05 + j * q - q / 2 + 1, q - 2, q - 2);
        }
      }
      ctx.restore();
      circle(ctx, 0, s * 0.05, s * 0.8);
      paint(ctx, null, lw);
      break;
    }
    case 'salsa': {
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.rotate(side * 0.5 + Math.sin(time * 10) * 0.08 * lit);
        ctx.strokeStyle = '#8a5a2b';
        ctx.lineWidth = s * 0.16;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.1);
        ctx.lineTo(0, s * 1.0);
        ctx.stroke();
        ellipse(ctx, 0, -s * 0.3, s * 0.42, s * 0.55);
        paint(ctx, side < 0 ? '#ff3d9a' : '#ffb020', lw);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        for (const yy of [-0.55, -0.25, 0.05]) {
          circle(ctx, 0, yy * s, s * 0.07);
          ctx.fill();
        }
        ctx.restore();
      }
      break;
    }
    case 'eraser': {
      ctx.rotate(-0.5);
      roundRect(ctx, -s * 0.9, -s * 0.42, s * 1.8, s * 0.84, s * 0.15);
      paint(ctx, '#ff9fc8', lw);
      ctx.beginPath();
      ctx.rect(s * 0.2, -s * 0.42, s * 0.7, s * 0.84);
      paint(ctx, '#7fc8ff', lw);
      ctx.rotate(0.5);
      ctx.strokeStyle = W;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(-s * 1.0, s * 0.95);
      ctx.lineTo(-s * 0.2, s * 0.95);
      ctx.moveTo(-s * 0.9, s * 0.72);
      ctx.lineTo(-s * 0.55, s * 0.72);
      ctx.stroke();
      break;
    }
    case 'turtle': {
      ellipse(ctx, -s * 0.55, s * 0.5, s * 0.18, s * 0.12);
      paint(ctx, '#7ed957', lw * 0.7);
      ellipse(ctx, s * 0.45, s * 0.5, s * 0.18, s * 0.12);
      paint(ctx, '#7ed957', lw * 0.7);
      circle(ctx, s * 0.85, s * 0.05, s * 0.25);
      paint(ctx, '#7ed957', lw * 0.7);
      ctx.fillStyle = C.ink;
      circle(ctx, s * 0.92, -s * 0.02, s * 0.05);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-s * 0.05, s * 0.35, s * 0.8, s * 0.65, 0, Math.PI, 0);
      ctx.closePath();
      paint(ctx, '#2fae4a', lw);
      ctx.strokeStyle = '#1d7a33';
      ctx.lineWidth = lw * 0.6;
      ctx.beginPath();
      ctx.moveTo(-s * 0.45, s * 0.3);
      ctx.lineTo(-s * 0.25, -s * 0.1);
      ctx.lineTo(s * 0.15, -s * 0.1);
      ctx.lineTo(s * 0.35, s * 0.3);
      ctx.stroke();
      break;
    }
    case 'rabbit': {
      for (const x of [-0.15, 0.2]) {
        ellipse(ctx, x * s, -s * 0.55, s * 0.14, s * 0.45, x * 0.8);
        paint(ctx, W, lw * 0.7);
        ellipse(ctx, x * s, -s * 0.5, s * 0.06, s * 0.3, x * 0.8);
        paint(ctx, '#ffb3c6', 0);
      }
      ellipse(ctx, -s * 0.1, s * 0.55, s * 0.75, s * 0.42);
      paint(ctx, W, lw);
      circle(ctx, s * 0.25, s * 0.1, s * 0.38);
      paint(ctx, W, lw);
      ctx.fillStyle = C.ink;
      circle(ctx, s * 0.38, s * 0.02, s * 0.06);
      ctx.fill();
      ctx.fillStyle = '#ff7aa8';
      circle(ctx, s * 0.6, s * 0.15, s * 0.07);
      ctx.fill();
      // speed lines
      ctx.strokeStyle = W;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(-s * 1.05, s * 0.3);
      ctx.lineTo(-s * 1.35, s * 0.3);
      ctx.moveTo(-s * 1.0, s * 0.6);
      ctx.lineTo(-s * 1.4, s * 0.6);
      ctx.stroke();
      break;
    }
    case 'echo': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.9, -s * 0.3);
      ctx.lineTo(-s * 0.55, -s * 0.3);
      ctx.lineTo(-s * 0.1, -s * 0.75);
      ctx.lineTo(-s * 0.1, s * 0.75);
      ctx.lineTo(-s * 0.55, s * 0.3);
      ctx.lineTo(-s * 0.9, s * 0.3);
      ctx.closePath();
      paint(ctx, W, lw);
      ctx.strokeStyle = W;
      for (let i = 0; i < 3; i++) {
        const ph = ((time * 1.5 + i / 3) % 1) * (lit > 0 ? 1 : 0);
        ctx.globalAlpha = lit > 0 ? 1 - ph : 1 - i * 0.25;
        ctx.lineWidth = lw * (1.3 - i * 0.25);
        ctx.beginPath();
        ctx.arc(-s * 0.1, 0, s * (0.4 + i * 0.3 + ph * 0.3), -0.8, 0.8);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'filter': {
      ctx.strokeStyle = W;
      ctx.lineWidth = lw * 1.4;
      const amp = s * 0.55 * (0.25 + 0.75 * (o_filterLevel ?? 1));
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const x = -s + (i / 40) * s * 2;
        const y = Math.sin(i / 40 * TAU * 2 + time * 4) * amp;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      break;
    }
    default:
      circle(ctx, 0, 0, s * 0.6);
      paint(ctx, W, lw);
  }
  ctx.restore();
}

// the filter wave flattens as the sound is muffled; set before drawing that icon
let o_filterLevel = 1;
export function setFilterLevel(v) {
  o_filterLevel = v;
}

// ---------- effects pads ----------

export function drawFxPad(ctx, b, kind, active, value, time) {
  const col = kind === 'echo' ? '#19c3d6' : '#a66bff';
  ctx.save();
  ctx.fillStyle = shade(col, -0.5);
  roundRect(ctx, b.x, b.y + 4, b.w, b.h, b.w * 0.22);
  ctx.fill();
  const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
  g.addColorStop(0, shade(col, active ? 0.55 : 0.25));
  g.addColorStop(1, shade(col, active ? 0.2 : -0.1));
  ctx.fillStyle = g;
  roundRect(ctx, b.x, b.y, b.w, b.h - 3, b.w * 0.22);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = active ? C.white : 'rgba(27,15,59,0.6)';
  ctx.stroke();
  if (kind === 'filter') {
    // a slider dot shows how muffled it is
    const y = b.y + 8 + (1 - value) * (b.h - 19);
    ctx.fillStyle = 'rgba(27,15,59,0.25)';
    roundRect(ctx, b.x + b.w * 0.82, b.y + 8, b.w * 0.1, b.h - 19, b.w * 0.05);
    ctx.fill();
    circle(ctx, b.x + b.w * 0.87, y, Math.max(5, b.w * 0.09));
    paint(ctx, C.white, 2);
    setFilterLevel(value);
    drawIcon(ctx, 'filter', b.x + b.w * 0.44, b.y + b.h / 2, Math.min(b.w, b.h) * 0.28, col, time, active ? 1 : 0);
    setFilterLevel(1);
  } else {
    drawIcon(ctx, 'echo', b.x + b.w / 2 + b.w * 0.05, b.y + b.h / 2, Math.min(b.w, b.h) * 0.3, col, time, active ? 1 : 0);
  }
  ctx.restore();
}

// ---------- the beats panel ----------

export function drawTabs(ctx, tabs, current) {
  for (const t of tabs) {
    const on = t.tab === current;
    ctx.fillStyle = on ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.14)';
    roundRect(ctx, t.x, t.y, t.w, t.h, Math.min(16, t.h * 0.35));
    ctx.fill();
    if (on) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = C.pink;
      ctx.stroke();
    }
    const cx = t.x + t.w / 2;
    const cy = t.y + t.h / 2;
    const s = t.h * 0.3;
    if (t.tab === 'pads') {
      const cols = ['#ff4d6d', '#ffd60a', '#4cc9f0', '#00d084'];
      for (let i = 0; i < 4; i++) {
        roundRect(ctx, cx - s * 1.05 + (i % 2) * s * 1.1, cy - s * 1.05 + Math.floor(i / 2) * s * 1.1, s, s, s * 0.25);
        paint(ctx, cols[i], 2);
      }
    } else {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 5; c++) {
          const on2 = (r === 0 && c % 2 === 0) || (r === 1 && c === 2) || (r === 2 && c !== 2);
          roundRect(ctx, cx - s * 1.6 + c * s * 0.66, cy - s * 1.0 + r * s * 0.7, s * 0.55, s * 0.55, s * 0.12);
          paint(ctx, on2 ? '#ff3d9a' : 'rgba(27,15,59,0.25)', 0);
        }
      }
    }
  }
}

// A chunky coloured button with an icon (play, styles, clear).
export function drawBigButton(ctx, b, colour, icon, o = {}) {
  const press = o.on ? 1 : 0;
  ctx.save();
  ctx.fillStyle = shade(colour, -0.5);
  roundRect(ctx, b.x, b.y + 4, b.w, b.h - 4, Math.min(18, b.h * 0.3));
  ctx.fill();
  const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
  g.addColorStop(0, shade(colour, 0.35 + press * 0.3));
  g.addColorStop(1, shade(colour, press * 0.15));
  ctx.fillStyle = g;
  roundRect(ctx, b.x, b.y + press * 2, b.w, b.h - 4, Math.min(18, b.h * 0.3));
  ctx.fill();
  ctx.lineWidth = o.on ? 4 : 2.5;
  ctx.strokeStyle = o.on ? C.white : 'rgba(27,15,59,0.55)';
  ctx.stroke();
  const s = Math.min(b.w, b.h) * 0.3;
  if (!icon) {
    // the caller draws its own picture
  } else if (icon === 'play' || icon === 'stop') glyph(ctx, icon, b.x + b.w / 2, b.y + b.h / 2, s * 0.85, C.white);
  else drawIcon(ctx, icon, b.x + b.w / 2, b.y + b.h / 2 - 1, s, colour, o.time || 0, press);
  ctx.restore();
}

export function drawTempo(ctx, track, tempo, time) {
  const y = track.y + track.h / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  roundRect(ctx, track.x, track.y + track.h * 0.2, track.w, track.h * 0.6, track.h * 0.3);
  ctx.fill();
  const n = TEMPOS.length;
  const pad = track.h * 0.4;
  const span = track.w - pad * 2;
  const g = ctx.createLinearGradient(track.x, 0, track.x + track.w, 0);
  g.addColorStop(0, '#2fae4a');
  g.addColorStop(1, '#ff3d9a');
  ctx.fillStyle = g;
  roundRect(ctx, track.x + pad - 4, y - 5, (span * tempo) / (n - 1) + 8, 10, 5);
  ctx.fill();
  for (let i = 0; i < n; i++) {
    const x = track.x + pad + (span * i) / (n - 1);
    circle(ctx, x, y, track.h * 0.09);
    ctx.fillStyle = i <= tempo ? C.white : 'rgba(255,255,255,0.35)';
    ctx.fill();
  }
  const kx = track.x + pad + (span * tempo) / (n - 1);
  const bob = Math.sin(time * (4 + tempo * 2)) * 2;
  circle(ctx, kx, y + bob, track.h * 0.3);
  paint(ctx, C.sun, 3);
}

// Faint picture of each row's sound, used in the row labels and the empty squares.
export function drawRowIcon(ctx, row, cx, cy, s, time = 0, lit = 0) {
  const id = ROWS[row];
  const pad = PADS.find((p) => p.id === id);
  drawIcon(ctx, id, cx, cy, s, pad.colour, time, lit);
}

export function drawGrid(ctx, beats, pattern, o) {
  const { playhead, flash, time } = o;
  for (const l of beats.labels) {
    const pad = PADS.find((p) => p.id === ROWS[l.row]);
    const lit = flash[`row${l.row}`] || 0;
    ctx.fillStyle = shade(pad.colour, -0.25 + lit * 0.4);
    roundRect(ctx, l.x + 2, l.y + 2, l.w - 4, l.h - 4, 10);
    ctx.fill();
    drawRowIcon(ctx, l.row, l.x + l.w / 2, l.y + l.h / 2, Math.min(l.w, l.h) * 0.3, time, lit);
  }
  for (const c of beats.cells) {
    const pad = PADS.find((p) => p.id === ROWS[c.row]);
    const on = pattern[c.row][c.step];
    const head = c.step === playhead;
    const beatStart = c.step % 4 === 0;
    const m = Math.max(2, Math.min(c.w, c.h) * 0.07);
    const x = c.x + m;
    const y = c.y + m;
    const w = c.w - m * 2;
    const h = c.h - m * 2;
    const r = Math.min(w, h) * 0.22;
    if (on) {
      const hitNow = head ? 1 : 0;
      ctx.fillStyle = shade(pad.colour, -0.45);
      roundRect(ctx, x, y + 3, w, h - 2, r);
      ctx.fill();
      ctx.fillStyle = shade(pad.colour, 0.15 + hitNow * 0.6);
      roundRect(ctx, x, y, w, h - 3, r);
      ctx.fill();
      ctx.lineWidth = head ? 3 : 2;
      ctx.strokeStyle = head ? C.white : 'rgba(27,15,59,0.5)';
      ctx.stroke();
      drawRowIcon(ctx, c.row, x + w / 2, y + h / 2 - 1, Math.min(w, h) * 0.3 * (1 + hitNow * 0.15), time, hitNow);
    } else {
      ctx.fillStyle = head ? 'rgba(255,255,255,0.30)' : beatStart ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.09)';
      roundRect(ctx, x, y, w, h, r);
      ctx.fill();
      ctx.globalAlpha = 0.22;
      drawRowIcon(ctx, c.row, x + w / 2, y + h / 2, Math.min(w, h) * 0.22, time, 0);
      ctx.globalAlpha = 1;
    }
  }
}

// ---------- dancers ----------

// A flamingo or a gator in shades, dancing in a box; beat is 0..1 through the beat.
export function drawDancer(ctx, box, kind, o) {
  const { beat, energy, time } = o;
  if (box.w < 30 || box.h < 30) return;
  const s = Math.min(box.h / 2.2, box.w / 1.6);
  const cx = box.x + box.w / 2;
  const base = box.y + box.h - 2;
  const hop = energy * Math.abs(Math.sin(beat * Math.PI)) * s * 0.18;
  const sway = energy * Math.sin(beat * Math.PI * 2) * 0.18;
  ctx.save();
  ctx.translate(cx, base - hop);
  ctx.rotate(sway);
  const lw = Math.max(1.5, s * 0.07);
  if (kind === 'flamingo') {
    ctx.strokeStyle = '#ff8fb8';
    ctx.lineWidth = s * 0.07;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.85);
    ctx.lineTo(0, 0);
    const kick = energy * Math.sin(time * 8) * 0.5;
    ctx.moveTo(0, -s * 0.85);
    ctx.lineTo(s * 0.3 + Math.cos(kick) * s * 0.1, -s * 0.5 - kick * s * 0.3);
    ctx.lineTo(s * 0.05, -s * 0.35 - kick * s * 0.2);
    ctx.stroke();
    ellipse(ctx, 0, -s * 1.1, s * 0.48, s * 0.3, -0.2);
    paint(ctx, '#ff6fa8', lw);
    // wing flaps with the music
    ctx.save();
    ctx.translate(-s * 0.05, -s * 1.15);
    ctx.rotate(-0.4 - energy * Math.abs(Math.sin(beat * Math.PI * 2)) * 0.8);
    ellipse(ctx, -s * 0.25, 0, s * 0.3, s * 0.13);
    paint(ctx, '#ff4f93', lw);
    ctx.restore();
    ctx.strokeStyle = '#ff6fa8';
    ctx.lineWidth = s * 0.12;
    ctx.beginPath();
    ctx.moveTo(s * 0.3, -s * 1.2);
    ctx.quadraticCurveTo(s * 0.55, -s * 1.5, s * 0.25, -s * 1.7);
    ctx.quadraticCurveTo(s * 0.05, -s * 1.85, s * 0.2, -s * 2.0);
    ctx.stroke();
    circle(ctx, s * 0.25, -s * 2.0, s * 0.16);
    paint(ctx, '#ff6fa8', lw);
    ctx.beginPath();
    ctx.moveTo(s * 0.38, -s * 2.02);
    ctx.lineTo(s * 0.62, -s * 1.92);
    ctx.lineTo(s * 0.38, -s * 1.9);
    ctx.closePath();
    paint(ctx, '#222', 0);
    ctx.fillStyle = C.ink;
    circle(ctx, s * 0.28, -s * 2.05, s * 0.035);
    ctx.fill();
  } else {
    // gator standing up, arms in the air on the beat
    const arm = energy * Math.abs(Math.sin(beat * Math.PI));
    ctx.strokeStyle = '#3fb34f';
    ctx.lineWidth = s * 0.14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s * 0.4);
    ctx.lineTo(-s * 0.25, 0);
    ctx.moveTo(s * 0.2, -s * 0.4);
    ctx.lineTo(s * 0.25, 0);
    ctx.moveTo(-s * 0.3, -s * 1.1);
    ctx.lineTo(-s * 0.6, -s * (1.0 + arm * 0.7));
    ctx.moveTo(s * 0.3, -s * 1.1);
    ctx.lineTo(s * 0.6, -s * (1.0 + arm * 0.7));
    ctx.stroke();
    ellipse(ctx, 0, -s * 0.85, s * 0.38, s * 0.55);
    paint(ctx, '#3fb34f', lw);
    ellipse(ctx, 0, -s * 0.8, s * 0.22, s * 0.38);
    paint(ctx, '#c9f08a', 0);
    // head with a long snout
    roundRect(ctx, -s * 0.3, -s * 1.75, s * 0.95, s * 0.42, s * 0.18);
    paint(ctx, '#3fb34f', lw);
    circle(ctx, -s * 0.05, -s * 1.75, s * 0.2);
    paint(ctx, '#3fb34f', lw);
    // shades
    ctx.fillStyle = C.ink;
    roundRect(ctx, -s * 0.25, -s * 1.86, s * 0.42, s * 0.14, s * 0.05);
    ctx.fill();
    ctx.strokeStyle = C.white;
    ctx.lineWidth = lw * 0.6;
    ctx.beginPath();
    ctx.moveTo(s * 0.1, -s * 1.47);
    for (let i = 0; i < 4; i++) ctx.lineTo(s * (0.18 + i * 0.1), -s * (i % 2 ? 1.47 : 1.42));
    ctx.stroke();
  }
  ctx.restore();
  // music notes float up when it is loud
  if (energy > 0.2) {
    for (let i = 0; i < 2; i++) {
      const ph = (time * 0.6 + i * 0.5) % 1;
      const nx = cx + (i ? 1 : -1) * s * (0.6 + ph * 0.3);
      const ny = base - s * (1.2 + ph * 1.0);
      ctx.globalAlpha = (1 - ph) * energy;
      note(ctx, nx, ny, s * 0.18, i ? '#ffe14d' : '#19c3d6');
      ctx.globalAlpha = 1;
    }
  }
}

function note(ctx, x, y, s, col) {
  ctx.fillStyle = col;
  ctx.strokeStyle = col;
  ellipse(ctx, x, y, s * 0.6, s * 0.45, -0.4);
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, s * 0.2);
  ctx.beginPath();
  ctx.moveTo(x + s * 0.5, y);
  ctx.lineTo(x + s * 0.5, y - s * 1.8);
  ctx.lineTo(x + s * 1.1, y - s * 1.4);
  ctx.stroke();
}

// Bursts of notes and stars from a pad hit.
export function drawSparks(ctx, sparks) {
  for (const p of sparks) {
    const a = 1 - p.t / p.life;
    ctx.globalAlpha = Math.max(0, a);
    if (p.kind === 'note') note(ctx, p.x, p.y, p.r, p.c);
    else {
      ctx.fillStyle = p.c;
      star(ctx, p.x, p.y, p.r);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// ---------- songs ----------

// A song as a record: its colour on the label and its picture in the middle.
export function drawSongRecord(ctx, cx, cy, r, song, o = {}) {
  const { spin = 0, time = 0, playing = false, wobble = 0 } = o;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(wobble);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  circle(ctx, r * 0.05, r * 0.08, r);
  ctx.fill();
  ctx.save();
  ctx.rotate(spin);
  circle(ctx, 0, 0, r);
  paint(ctx, '#111018', Math.max(2, r * 0.04));
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  for (let k = 0.5; k < 0.97; k += 0.1) {
    circle(ctx, 0, 0, r * k);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = r * 0.06;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.78, -0.6, 0.0);
  ctx.stroke();
  const col = SONG_COLOURS[song.col] || SONG_COLOURS[0];
  circle(ctx, 0, 0, r * 0.48);
  paint(ctx, col, Math.max(1.5, r * 0.03));
  ctx.restore();
  drawPic(ctx, SONG_PICS[song.pic] || 'star', 0, 0, r * 0.4, time);
  if (playing) {
    ctx.strokeStyle = `rgba(255,225,77,${0.6 + 0.4 * Math.sin(time * 8)})`;
    ctx.lineWidth = r * 0.08;
    circle(ctx, 0, 0, r * 1.06);
    ctx.stroke();
  }
  ctx.restore();
}

// Song pictures: Miami animals and things, drawn in a circle of radius r.
export function drawPic(ctx, pic, cx, cy, r, time = 0) {
  const lw = Math.max(1, r * 0.08);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (pic) {
    case 'flamingo': {
      // legs, body, an S-shaped neck and a bent black-tipped beak
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(-r * 0.15, r * 0.3);
      ctx.lineTo(-r * 0.15, r * 0.85);
      ctx.moveTo(-r * 0.05, r * 0.3);
      ctx.lineTo(r * 0.15, r * 0.55);
      ctx.lineTo(-r * 0.05, r * 0.62);
      ctx.stroke();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = r * 0.22;
      const neck = () => {
        ctx.beginPath();
        ctx.moveTo(r * 0.25, r * 0.1);
        ctx.bezierCurveTo(r * 0.55, -r * 0.2, -r * 0.05, -r * 0.35, r * 0.2, -r * 0.6);
        ctx.stroke();
      };
      neck();
      ctx.strokeStyle = '#ffb3d1';
      ctx.lineWidth = r * 0.12;
      neck();
      ellipse(ctx, -r * 0.05, r * 0.15, r * 0.48, r * 0.3, -0.25);
      paint(ctx, '#ffb3d1', lw);
      ellipse(ctx, -r * 0.15, r * 0.12, r * 0.26, r * 0.14, -0.25);
      paint(ctx, '#ff6fa8', lw * 0.6);
      circle(ctx, r * 0.22, -r * 0.65, r * 0.17);
      paint(ctx, '#ffb3d1', lw);
      ctx.beginPath();
      ctx.moveTo(r * 0.34, -r * 0.72);
      ctx.lineTo(r * 0.62, -r * 0.6);
      ctx.lineTo(r * 0.55, -r * 0.42);
      ctx.lineTo(r * 0.36, -r * 0.58);
      ctx.closePath();
      paint(ctx, '#fff1d6', lw * 0.7);
      ctx.fillStyle = C.ink;
      circle(ctx, r * 0.22, -r * 0.7, r * 0.05);
      ctx.fill();
      break;
    }
    case 'gator': {
      roundRect(ctx, -r * 0.75, -r * 0.25, r * 1.5, r * 0.5, r * 0.2);
      paint(ctx, '#3fb34f', lw);
      circle(ctx, -r * 0.35, -r * 0.3, r * 0.18);
      paint(ctx, '#3fb34f', lw);
      circle(ctx, -r * 0.35, -r * 0.32, r * 0.07);
      paint(ctx, C.ink, 0);
      ctx.strokeStyle = C.white;
      ctx.lineWidth = lw;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) ctx.lineTo(-r * 0.1 + i * r * 0.15, i % 2 ? r * 0.05 : r * 0.15);
      ctx.stroke();
      break;
    }
    case 'turtle':
      ctx.save();
      ctx.scale(0.8, 0.8);
      drawIcon(ctx, 'turtle', -r * 0.1, -r * 0.1, r, '#2fae4a');
      ctx.restore();
      break;
    case 'crab': {
      ctx.strokeStyle = '#ff5a36';
      ctx.lineWidth = lw * 1.2;
      ctx.beginPath();
      for (const sd of [-1, 1]) {
        ctx.moveTo(sd * r * 0.4, 0);
        ctx.lineTo(sd * r * 0.7, -r * 0.35);
        for (const k of [0.1, 0.3]) {
          ctx.moveTo(sd * r * 0.35, r * k);
          ctx.lineTo(sd * r * 0.75, r * (k + 0.25));
        }
      }
      ctx.stroke();
      for (const sd of [-1, 1]) {
        circle(ctx, sd * r * 0.72, -r * 0.45, r * 0.17);
        paint(ctx, '#ff5a36', lw);
      }
      ellipse(ctx, 0, r * 0.1, r * 0.5, r * 0.35);
      paint(ctx, '#ff5a36', lw);
      for (const sd of [-1, 1]) {
        circle(ctx, sd * r * 0.15, -r * 0.3, r * 0.1);
        paint(ctx, C.white, lw * 0.6);
      }
      break;
    }
    case 'fish': {
      ctx.beginPath();
      ctx.moveTo(r * 0.35, 0);
      ctx.lineTo(r * 0.75, -r * 0.35);
      ctx.lineTo(r * 0.75, r * 0.35);
      ctx.closePath();
      paint(ctx, '#ffb020', lw);
      ellipse(ctx, -r * 0.1, 0, r * 0.55, r * 0.38);
      paint(ctx, '#ffb020', lw);
      circle(ctx, -r * 0.35, -r * 0.08, r * 0.08);
      paint(ctx, C.ink, 0);
      break;
    }
    case 'palm':
      drawIcon(ctx, 'dembow', 0, 0, r * 0.85, '#2fae4a');
      break;
    case 'sun': {
      ctx.strokeStyle = '#ff8a1c';
      ctx.lineWidth = lw * 1.5;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + time * 0.5;
        ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5);
        ctx.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
      }
      ctx.stroke();
      circle(ctx, 0, 0, r * 0.4);
      paint(ctx, '#ffe14d', lw);
      break;
    }
    case 'star':
      star(ctx, 0, 0, r * 0.75);
      paint(ctx, '#fff36b', lw);
      break;
    case 'pelican': {
      ellipse(ctx, -r * 0.15, r * 0.2, r * 0.45, r * 0.32);
      paint(ctx, '#e8edf5', lw);
      circle(ctx, r * 0.15, -r * 0.35, r * 0.2);
      paint(ctx, '#e8edf5', lw);
      ctx.beginPath();
      ctx.moveTo(r * 0.3, -r * 0.4);
      ctx.lineTo(r * 0.8, -r * 0.2);
      ctx.quadraticCurveTo(r * 0.5, r * 0.1, r * 0.25, -r * 0.2);
      ctx.closePath();
      paint(ctx, '#ffb020', lw);
      circle(ctx, r * 0.15, -r * 0.4, r * 0.05);
      paint(ctx, C.ink, 0);
      break;
    }
    case 'octopus': {
      ctx.strokeStyle = '#b388ff';
      ctx.lineWidth = lw * 1.6;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const x = -r * 0.5 + i * r * 0.25;
        ctx.moveTo(x, r * 0.05);
        ctx.quadraticCurveTo(x + Math.sin(time * 3 + i) * r * 0.15, r * 0.4, x, r * 0.7);
      }
      ctx.stroke();
      circle(ctx, 0, -r * 0.15, r * 0.45);
      paint(ctx, '#b388ff', lw);
      for (const sd of [-1, 1]) {
        circle(ctx, sd * r * 0.16, -r * 0.2, r * 0.08);
        paint(ctx, C.ink, 0);
      }
      break;
    }
    default:
      star(ctx, 0, 0, r * 0.7);
      paint(ctx, C.white, lw);
  }
  ctx.restore();
}

// ---------- launcher tile ----------

export function drawTile(ctx, x, y, w, h, time = 0) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.translate(x, y);
  const beat = (time * 1.7) % 1;
  const pulse = Math.max(0, 1 - beat * 3);
  drawClub(ctx, w, h, time, pulse, Math.floor(time * 1.7) % 5);
  const r = Math.min(w * 0.42, h * 0.34);
  const cy = h * 0.5;
  // speakers in the bottom corners
  for (const sd of [-1, 1]) {
    const sw = w * 0.2;
    const sh = sw * 1.5;
    const sx = sd < 0 ? sw * 0.6 : w - sw * 0.6;
    const sy = h - sh * 0.75;
    roundRect(ctx, sx - sw / 2, sy, sw, sh, sw * 0.15);
    paint(ctx, '#2a2840', 2);
    for (const [k, rr] of [[0.25, 0.28], [0.62, 0.38]]) {
      circle(ctx, sx, sy + sh * k, sw * rr * (1 + pulse * 0.15));
      paint(ctx, '#55536e', 1.5);
      circle(ctx, sx, sy + sh * k, sw * rr * 0.35);
      paint(ctx, '#111018', 0);
    }
  }
  drawDeck(ctx, { cx: w / 2, cy, r }, {
    angle: time * 3.2, playing: true, held: false, label: { colour: '#ff3d9a', pic: 'flamingo' }, time, beat: pulse, song: true,
  });
  // notes rising
  for (let i = 0; i < 4; i++) {
    const ph = (time * 0.45 + i * 0.25) % 1;
    ctx.globalAlpha = 1 - ph;
    note(ctx, w * (0.15 + i * 0.23) + Math.sin(time * 2 + i) * 6, h * (0.4 - ph * 0.35), Math.min(w, h) * 0.05, ['#ffe14d', '#19c3d6', '#ff3d9a', '#4fe07a'][i]);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

export const styleColour = (i) => (STYLES[i] ? STYLES[i].colour : '#ff3d9a');
