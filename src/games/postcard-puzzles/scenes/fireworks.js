// The causeway at night: fireworks burst over the bay, the bridge's humped span glows with
// lamps and car lights, the city twinkles behind and everything shimmers in the water.
import { begin, end, sky, rect, poly, circle, ellipse, fs, lin, line, glow, twinkle, palm, rng, INK, TAU } from './kit.js';

function burst(ctx, x, y, R, colours, r) {
  glow(ctx, x, y, R * 1.4, colours[0] + '55');
  const n = 22;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r() * 0.1;
    const c = colours[i % colours.length];
    const len = R * (0.75 + r() * 0.3);
    ctx.strokeStyle = c;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * R * 0.18, y + Math.sin(a) * R * 0.18);
    ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.7, y + Math.sin(a) * len * 0.7, x + Math.cos(a) * len, y + Math.sin(a) * len + len * 0.08);
    ctx.stroke();
    circle(ctx, x + Math.cos(a) * len, y + Math.sin(a) * len + len * 0.08, 4.5, '#ffffff', 0);
    circle(ctx, x + Math.cos(a) * len, y + Math.sin(a) * len + len * 0.08, 2.5, c, 0);
  }
  // inner ring of sparkles
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    twinkle(ctx, x + Math.cos(a) * R * 0.42, y + Math.sin(a) * R * 0.42, 7, '#fffbe0');
  }
  circle(ctx, x, y, 6, '#ffffff', 0);
}

function trail(ctx, x0, y0, x1, y1, colour) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = 3;
  ctx.setLineDash?.([6, 8]);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo((x0 + x1) / 2 + 10, (y0 + y1) / 2, x1, y1);
  ctx.stroke();
  ctx.setLineDash?.([]);
}

// The bridge deck's top edge as a function of x: flat, then a gentle hump in the middle.
const deckY = (x) => 470 - 70 * Math.exp(-(((x - 330) / 120) ** 2));

function bridge(ctx, r) {
  // piers
  for (let x = 20; x < 600; x += 62) {
    const top = deckY(x) + 26;
    rect(ctx, x - 9, top, 18, 520 - top, lin(ctx, x - 9, 0, x + 9, 0, [[0, '#5a4a8a'], [1, '#2f2560']]), 2.5);
  }
  // deck
  ctx.beginPath();
  ctx.moveTo(-10, deckY(-10));
  for (let x = 0; x <= 610; x += 10) ctx.lineTo(x, deckY(x));
  for (let x = 610; x >= -10; x -= 10) ctx.lineTo(x, deckY(x) + 26);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, 380, 0, 500, [[0, '#7a6ab8'], [1, '#463a80']]), 3);
  // railing glow line
  ctx.strokeStyle = '#ffe680';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = -10; x <= 610; x += 10) ctx.lineTo(x, deckY(x) + 8);
  ctx.stroke();
  // car light streaks: white heading one way, red the other
  for (let k = 0; k < 9; k++) {
    const x = 20 + k * 66 + r() * 20;
    const y = deckY(x) + 15;
    const c = k % 2 ? '#ff4060' : '#fffbe0';
    glow(ctx, x, y, 14, c + '88');
    ctx.strokeStyle = c;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - 14, deckY(x - 14) + 15);
    ctx.lineTo(x + 14, deckY(x + 14) + 15);
    ctx.stroke();
  }
  // lamp posts
  for (let x = 40; x < 600; x += 80) {
    const y = deckY(x);
    line(ctx, x, y, x, y - 42, '#2b1b4a', 4);
    line(ctx, x, y - 42, x + 10, y - 42, '#2b1b4a', 4);
    glow(ctx, x + 10, y - 38, 26, 'rgba(255,230,140,0.7)');
    circle(ctx, x + 10, y - 38, 5, '#fff3b0', 1.5);
  }
}

export default {
  id: 'fireworks',
  place: 'Rickenbacker Causeway',
  draw(ctx, w, h) {
    const r = rng(1111);
    begin(ctx, w, h);
    sky(ctx, [[0, '#0b0830'], [0.55, '#2b1055'], [1, '#6a2a9a']], 0, 470);
    for (let i = 0; i < 40; i++) {
      const x = r() * 600;
      const y = r() * 330;
      if (r() < 0.25) twinkle(ctx, x, y, 3 + r() * 4);
      else circle(ctx, x, y, 1 + r() * 1.5, 'rgba(255,255,255,0.8)', 0);
    }
    // crescent moon
    circle(ctx, 530, 70, 34, '#fff4c0', 0);
    circle(ctx, 546, 60, 30, '#120c3a', 0);
    // far city lights
    for (let k = 0; k < 12; k++) {
      const x = k * 50 + r() * 10;
      const ww = 26 + r() * 20;
      const top = 360 + r() * 60;
      rect(ctx, x, top, ww, 470 - top, '#241a55', 1.5);
      for (let y = top + 6; y < 465; y += 9) {
        for (let xx = x + 4; xx < x + ww - 4; xx += 7) {
          if (r() < 0.45) {
            ctx.fillStyle = r() < 0.6 ? '#ffe680' : '#ff9ec0';
            ctx.fillRect(xx, y, 3.5, 4);
          }
        }
      }
    }
    trail(ctx, 160, 470, 150, 200, 'rgba(255,200,120,0.6)');
    trail(ctx, 420, 470, 440, 150, 'rgba(160,220,255,0.6)');
    burst(ctx, 150, 190, 110, ['#ff3d9a', '#ffe14d', '#ff8a4c'], r);
    burst(ctx, 440, 150, 95, ['#2ff3ff', '#7cff6b', '#ffffff'], r);
    burst(ctx, 330, 300, 70, ['#b36bff', '#ff7aa8', '#ffe14d'], r);
    burst(ctx, 60, 360, 45, ['#7cff6b', '#2ff3ff'], r);
    burst(ctx, 545, 300, 50, ['#ffe14d', '#ff3d9a'], r);
    // bay with reflections
    ctx.fillStyle = lin(ctx, 0, 470, 0, 800, [[0, '#3a1f78'], [0.5, '#1d1458'], [1, '#0b0830']]);
    ctx.fillRect(0, 470, 600, 330);
    for (const [x, c] of [[150, '#ff3d9a'], [440, '#2ff3ff'], [330, '#b36bff'], [545, '#ffe14d'], [60, '#7cff6b']]) {
      for (let k = 0; k < 14; k++) {
        ctx.globalAlpha = 0.6 - k * 0.035;
        ctx.fillStyle = c;
        const ww = 50 - k * 2 + r() * 20;
        ctx.fillRect(x - ww / 2 + (r() - 0.5) * 16, 530 + k * 18, ww, 4);
      }
    }
    ctx.globalAlpha = 1;
    bridge(ctx, r);
    // lamp reflections under the bridge
    for (let x = 50; x < 600; x += 80) {
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = 'rgba(255,230,140,0.55)';
        ctx.fillRect(x - 6 + (k % 2) * 4, 520 + k * 14, 12 - k, 3);
      }
    }
    // shore in front with palms
    ctx.beginPath();
    ctx.moveTo(0, 700);
    ctx.quadraticCurveTo(160, 680, 260, 800);
    ctx.lineTo(0, 800);
    ctx.closePath();
    fs(ctx, '#1c1240', 3);
    palm(ctx, 50, 760, 230, 0.15, { trunk: '#3a2a5a', ring: '#24183f', light: '#2a4a5a', dark: '#1b3344', size: 0.85, coconuts: false });
    palm(ctx, 150, 770, 150, -0.25, { trunk: '#3a2a5a', ring: '#24183f', light: '#2a4a5a', dark: '#1b3344', size: 0.65, coconuts: false });
    // a sailboat with string lights
    ctx.save();
    ctx.translate(440, 690);
    poly(ctx, [[-90, 0], [90, 0], [70, 30], [-70, 30]], '#f2f0ff', 3);
    line(ctx, -84, 12, 84, 12, '#ff3d9a', 4);
    line(ctx, 0, 0, 0, -170, INK, 4);
    poly(ctx, [[6, -6], [6, -160], [80, -6]], '#dcd8f6', 3);
    poly(ctx, [[-6, -6], [-6, -130], [-70, -6]], '#c6c0ee', 3);
    const lights = ['#ff3d9a', '#ffe14d', '#2ff3ff', '#7cff6b'];
    for (let k = 0; k <= 10; k++) {
      const t = k / 10;
      const lx = -86 + t * 86;
      const ly = -4 - t * 164;
      glow(ctx, lx, ly, 9, lights[k % 4] + 'aa');
      circle(ctx, lx, ly, 3, lights[k % 4], 0);
      const rx = t * 86;
      glow(ctx, rx, -168 + t * 164, 9, lights[(k + 2) % 4] + 'aa');
      circle(ctx, rx, -168 + t * 164, 3, lights[(k + 2) % 4], 0);
    }
    ctx.restore();
    ellipse(ctx, 440, 730, 110, 8, 'rgba(255,255,255,0.15)', 0);
    end(ctx);
  },
};
