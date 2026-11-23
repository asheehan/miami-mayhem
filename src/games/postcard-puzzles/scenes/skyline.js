// Downtown Miami at sunset over Biscayne Bay: towers with lit windows and coloured crowns,
// the sun sinking behind them, reflections, a sailboat, a speedboat and the bayfront rail.
import { begin, end, sky, sun, streak, rect, poly, circle, rr, fs, lin, line, gull, glow, twinkle, palm, rng, INK, TAU } from './kit.js';

const BASE = 480;

function tower(ctx, x, w, top, body, r, { crown = null, spire = 0, round = false, cupola = false } = {}) {
  ctx.beginPath();
  if (round) {
    ctx.moveTo(x, BASE);
    ctx.lineTo(x, top + w / 2);
    ctx.arc(x + w / 2, top + w / 2, w / 2, Math.PI, 0);
    ctx.lineTo(x + w, BASE);
  } else {
    ctx.rect(x, top, w, BASE - top);
  }
  ctx.closePath();
  fs(ctx, body, 3);
  if (spire) {
    poly(ctx, [[x + w / 2 - 6, top], [x + w / 2, top - spire], [x + w / 2 + 6, top]], '#c9b8ff', 2.5);
    circle(ctx, x + w / 2, top - spire, 4, '#ff4060', 1.5);
  }
  if (crown) {
    crown.forEach((c, i) => rect(ctx, x + 4 + i * 2, top + 6 + i * 10, w - 8 - i * 4, 6, c, 0));
  }
  if (cupola) {
    rect(ctx, x + w * 0.25, top - 30, w * 0.5, 30, '#f6e2b8', 2.5);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, top - 30);
    ctx.quadraticCurveTo(x + w / 2, top - 70, x + w * 0.8, top - 30);
    ctx.closePath();
    fs(ctx, '#e9a23b', 2.5);
    line(ctx, x + w / 2, top - 58, x + w / 2, top - 74, INK, 2.5);
  }
  // windows
  const y0 = top + (crown ? 50 : round ? w / 2 + 6 : 14);
  const cols = Math.max(2, Math.round(w / 14));
  const cw = (w - 8) / cols;
  for (let y = y0; y < BASE - 10; y += 14) {
    for (let i = 0; i < cols; i++) {
      const on = r() < 0.45;
      ctx.fillStyle = on ? (r() < 0.5 ? '#ffe680' : '#ffb35c') : 'rgba(255,255,255,0.12)';
      ctx.fillRect(x + 5 + i * cw, y, cw - 4, 7);
    }
  }
}

export default {
  id: 'skyline',
  place: 'Downtown Miami',
  draw(ctx, w, h) {
    const r = rng(44);
    begin(ctx, w, h);
    sky(ctx, [[0, '#2b1055'], [0.25, '#5d1d8f'], [0.55, '#ff3d9a'], [0.82, '#ff8a4c'], [1, '#ffd36b']], 0, BASE);
    for (let i = 0; i < 14; i++) twinkle(ctx, r() * 600, r() * 110, 2 + r() * 3.5, 'rgba(255,255,255,0.8)');
    sun(ctx, 430, 420, 78, { core: '#fff3a0', edge: '#ff9a3b', glow: 'rgba(255,180,90,0.55)' });
    streak(ctx, 30, 150, 260, 20, 'rgba(255,120,190,0.7)');
    streak(ctx, 120, 182, 180, 12, 'rgba(255,160,120,0.7)');
    streak(ctx, 330, 120, 250, 22, 'rgba(180,90,200,0.7)');
    streak(ctx, 380, 300, 200, 14, 'rgba(255,200,120,0.75)');
    streak(ctx, 20, 270, 140, 12, 'rgba(255,170,140,0.7)');
    gull(ctx, 90, 220, 12, '#2b1055');
    gull(ctx, 120, 236, 9, '#2b1055');
    // back row of towers, hazy purple
    for (const [x, ww, top] of [[-10, 60, 330], [150, 50, 300], [255, 45, 250], [350, 55, 320], [470, 50, 280], [540, 70, 350]]) {
      rect(ctx, x, top, ww, BASE - top, 'rgba(120,60,170,0.85)', 2);
      for (let y = top + 10; y < BASE; y += 16) {
        ctx.fillStyle = 'rgba(255,200,140,0.35)';
        ctx.fillRect(x + 6, y, ww - 12, 4);
      }
    }
    // front row
    tower(ctx, 20, 70, 300, '#3a2273', r, { cupola: true });
    tower(ctx, 95, 60, 360, '#2a1a5e', r);
    tower(ctx, 165, 80, 200, '#33206b', r, { crown: ['#ff3d9a', '#ffd23a', '#2ff3ff', '#7cff6b'] });
    tower(ctx, 250, 64, 120, '#251652', r, { spire: 50 });
    tower(ctx, 318, 70, 230, '#3b2678', r, { round: true });
    tower(ctx, 392, 56, 330, '#2a1a5e', r);
    tower(ctx, 452, 78, 180, '#30206a', r, { crown: ['#2ff3ff', '#b36bff', '#ff3d9a'] });
    tower(ctx, 535, 75, 290, '#271858', r, { round: true });
    // red aircraft lights
    for (const [x, y] of [[282, 72], [205, 196], [491, 176]]) glow(ctx, x, y, 12, 'rgba(255,60,80,0.8)');
    // the bay
    ctx.fillStyle = lin(ctx, 0, BASE, 0, 800, [[0, '#ff7aa8'], [0.25, '#9b3fa8'], [1, '#1d1450']]);
    ctx.fillRect(0, BASE, 600, 320);
    line(ctx, 0, BASE, 600, BASE, INK, 3);
    // reflections of the towers: broken wavy bars
    for (const [x, ww, c] of [[20, 70, '#ffd36b'], [165, 80, '#ff3d9a'], [250, 64, '#ffe680'], [318, 70, '#ffb35c'], [452, 78, '#2ff3ff'], [535, 75, '#ffe680']]) {
      for (let k = 0; k < 12; k++) {
        const y = BASE + 8 + k * 14;
        ctx.globalAlpha = 0.5 - k * 0.035;
        ctx.fillStyle = c;
        ctx.fillRect(x + 8 + (k % 2) * 8 + r() * 6, y, ww * (0.5 - k * 0.02) + r() * 10, 4);
      }
    }
    ctx.globalAlpha = 1;
    // the sun's glitter path
    for (let k = 0; k < 18; k++) {
      const y = BASE + 6 + k * 13;
      const half = 30 + k * 6;
      ctx.fillStyle = k % 2 ? 'rgba(255,240,160,0.85)' : 'rgba(255,200,110,0.7)';
      rr(ctx, 430 - half * (0.4 + r() * 0.6), y, half * (0.5 + r()), 4, 2);
      ctx.fill();
    }
    // a sailboat
    poly(ctx, [[85, 632], [195, 632], [180, 652], [100, 652]], '#ffffff', 3);
    poly(ctx, [[142, 626], [142, 520], [196, 626]], '#ff4f8b', 3);
    poly(ctx, [[136, 626], [136, 540], [96, 626]], '#ffd23a', 3);
    line(ctx, 139, 520, 139, 630, INK, 3);
    for (let k = 0; k < 5; k++) line(ctx, 90 + k * 22, 662 + (k % 2) * 4, 104 + k * 22, 662 + (k % 2) * 4, 'rgba(255,255,255,0.6)', 3);
    // a speedboat and its wake
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.moveTo(470, 708);
    ctx.lineTo(600, 690);
    ctx.lineTo(600, 740);
    ctx.closePath();
    ctx.fill();
    poly(ctx, [[380, 700], [470, 690], [482, 714], [400, 720]], '#ffffff', 3);
    poly(ctx, [[400, 698], [418, 680], [450, 680], [458, 694]], '#2ff3ff', 2.5);
    line(ctx, 390, 712, 478, 704, '#ff3d9a', 4);
    // bayfront rail, lamps and a palm
    ctx.fillStyle = lin(ctx, 0, 752, 0, 800, [[0, '#c9a6d8'], [1, '#8a6aa8']]);
    ctx.fillRect(0, 760, 600, 40);
    line(ctx, 0, 760, 600, 760, INK, 3);
    for (let x = 10; x < 600; x += 26) line(ctx, x, 760, x, 732, '#ffffff', 4);
    line(ctx, 0, 732, 600, 732, '#ffffff', 6);
    line(ctx, 0, 729, 600, 729, INK, 2);
    for (const x of [230, 520]) {
      glow(ctx, x, 672, 50, 'rgba(255,230,150,0.6)');
      rect(ctx, x - 4, 680, 8, 80, '#2b1b4a', 2.5);
      circle(ctx, x, 672, 11, '#fff3b0', 3);
    }
    palm(ctx, 30, 790, 270, 0.2, { trunk: '#5a2f6b', ring: '#3a1d48', light: '#2f7a4a', dark: '#1f5a36', size: 0.9, coconuts: false });
    end(ctx);
  },
};
