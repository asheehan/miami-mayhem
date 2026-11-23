// Big Catch creature art. Drawing only. Every creature is drawn in world units facing right,
// centred on (0, 0), with its body roughly filling its hit ellipse (rx by ry).
// drawCreature(ctx, id, x, y, scale, dir, t, opts) puts it on screen.
//   opts.mood: 'normal' | 'happy' | 'dizzy' | 'surprised'
//   opts.sil: a colour to draw the whole creature as a flat silhouette (for the album)
//   opts.glow: draw the deep-sea glow
//   opts.puffed: a pufferfish blown up
import { SPECIES_BY_ID } from './tuning.js';

const INK = '#160b33';
const TAU = Math.PI * 2;
let SIL = null;

const fill = (ctx, c) => {
  ctx.fillStyle = SIL || c;
};
const stroke = (ctx, c = INK) => {
  ctx.strokeStyle = SIL || c;
};
const ell = (ctx, x, y, rx, ry, rot = 0) => {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
};
const circle = (ctx, x, y, r) => ell(ctx, x, y, r, r);
function fillStroke(ctx, c, lw = 0.3) {
  fill(ctx, c);
  ctx.fill();
  ctx.lineWidth = lw;
  stroke(ctx);
  ctx.stroke();
}

// ---------- faces ----------

function eye(ctx, x, y, r, mood, t, look = 0.25) {
  if (SIL) return;
  ctx.fillStyle = '#ffffff';
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.lineWidth = r * 0.22;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = INK;
  if (mood === 'dizzy') {
    ctx.lineWidth = r * 0.28;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let a = 0; a < 2.4 * TAU; a += 0.4) {
      const rr = r * 0.12 + (a / (2.4 * TAU)) * r * 0.65;
      const aa = a + t * 9;
      ctx.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr);
    }
    ctx.stroke();
    return;
  }
  if (mood === 'happy') {
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = r * 0.32;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y + r * 0.25, r * 0.55, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    return;
  }
  const pr = mood === 'surprised' ? r * 0.28 : r * 0.52;
  circle(ctx, x + r * look, y + r * 0.05, pr);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  circle(ctx, x + r * look + pr * 0.35, y - pr * 0.35, pr * 0.3);
  ctx.fill();
}

// A mouth at the nose (x, y). size ~ the body's half height.
function mouth(ctx, kind, x, y, s, mood) {
  if (SIL) return;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = s * 0.13;
  if (mood === 'dizzy' || mood === 'surprised') {
    ctx.fillStyle = '#7a1030';
    ell(ctx, x - s * 0.22, y + s * 0.15, s * 0.18, s * 0.24);
    ctx.fill();
    ctx.stroke();
    return;
  }
  if (kind === 'grin') {
    ctx.beginPath();
    ctx.arc(x - s * 0.45, y - s * 0.05, s * 0.4, Math.PI * 0.1, Math.PI * 0.65);
    ctx.stroke();
  } else if (kind === 'pout') {
    ctx.fillStyle = '#ff6fa8';
    ell(ctx, x - s * 0.02, y + s * 0.1, s * 0.16, s * 0.24);
    ctx.fill();
    ctx.stroke();
  } else if (kind === 'buck') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - s * 0.28, y + s * 0.05, s * 0.2, s * 0.28);
    ctx.strokeRect(x - s * 0.28, y + s * 0.05, s * 0.2, s * 0.28);
    ctx.beginPath();
    ctx.moveTo(x - s * 0.6, y + s * 0.02);
    ctx.lineTo(x, y + s * 0.02);
    ctx.stroke();
  } else if (kind === 'tongue') {
    ctx.fillStyle = '#ff5c8a';
    ell(ctx, x - s * 0.08, y + s * 0.32, s * 0.15, s * 0.22, 0.4);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5, y + s * 0.1);
    ctx.quadraticCurveTo(x - s * 0.2, y + s * 0.25, x + s * 0.02, y + s * 0.08);
    ctx.stroke();
  } else if (kind === 'teeth') {
    ctx.fillStyle = '#5a0f2a';
    ctx.beginPath();
    ctx.moveTo(x + s * 0.05, y - s * 0.02);
    ctx.lineTo(x - s * 0.7, y + s * 0.06);
    ctx.lineTo(x + s * 0.05, y + s * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 3; i++) {
      const tx = x - s * (0.12 + i * 0.2);
      ctx.beginPath();
      ctx.moveTo(tx, y + s * 0.02);
      ctx.lineTo(tx - s * 0.06, y + s * 0.18);
      ctx.lineTo(tx - s * 0.12, y + s * 0.03);
      ctx.fill();
    }
  } else if (kind === 'o') {
    ctx.fillStyle = '#4a1030';
    circle(ctx, x - s * 0.15, y + s * 0.12, s * 0.14);
    ctx.fill();
    ctx.stroke();
  } else if (kind === 'sad') {
    ctx.beginPath();
    ctx.arc(x - s * 0.4, y + s * 0.45, s * 0.3, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
}

// ---------- generic fish ----------

function bodyPath(ctx, rx, ry, tallness = 1) {
  ctx.beginPath();
  ctx.moveTo(rx, 0);
  ctx.bezierCurveTo(rx * 0.95, -ry * 1.3 * tallness, -rx * 0.45, -ry * 1.25, -rx * 0.88, -ry * 0.2);
  ctx.lineTo(-rx * 0.88, ry * 0.2);
  ctx.bezierCurveTo(-rx * 0.45, ry * 1.25, rx * 0.95, ry * 1.3 * tallness, rx, 0);
  ctx.closePath();
}

function tail(ctx, rx, ry, swish, colour, style = 'fork') {
  ctx.save();
  ctx.translate(-rx * 0.82, 0);
  ctx.rotate(swish * 0.35);
  ctx.beginPath();
  if (style === 'crescent') {
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-rx * 0.25, -ry * 0.5, -rx * 0.55, -ry * 1.25);
    ctx.quadraticCurveTo(-rx * 0.3, 0, -rx * 0.55, ry * 1.25);
    ctx.quadraticCurveTo(-rx * 0.25, ry * 0.5, 0, 0);
  } else if (style === 'round') {
    ctx.moveTo(0, -ry * 0.25);
    ctx.quadraticCurveTo(-rx * 0.6, -ry * 1.1, -rx * 0.55, 0);
    ctx.quadraticCurveTo(-rx * 0.6, ry * 1.1, 0, ry * 0.25);
  } else {
    ctx.moveTo(0, -ry * 0.2);
    ctx.lineTo(-rx * 0.48, -ry * 0.95);
    ctx.lineTo(-rx * 0.34, 0);
    ctx.lineTo(-rx * 0.48, ry * 0.95);
    ctx.lineTo(0, ry * 0.2);
  }
  ctx.closePath();
  fillStroke(ctx, colour);
  ctx.restore();
}

function finTop(ctx, rx, ry, colour, tall = 0.7, spiky = false) {
  ctx.beginPath();
  ctx.moveTo(rx * 0.35, -ry * 0.85);
  if (spiky) {
    const n = 4;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      ctx.lineTo(rx * (0.3 - k * 0.8), -ry * (0.95 + (i % 2 ? 0.15 : tall)));
    }
  } else ctx.quadraticCurveTo(-rx * 0.05, -ry * (1 + tall * 1.2), -rx * 0.55, -ry * 0.75);
  ctx.lineTo(-rx * 0.5, -ry * 0.6);
  ctx.closePath();
  fillStroke(ctx, colour);
}

function finSide(ctx, rx, ry, colour, swish) {
  ctx.save();
  ctx.translate(rx * 0.05, ry * 0.25);
  ctx.rotate(0.5 + swish * 0.4);
  ell(ctx, -rx * 0.18, 0, rx * 0.22, ry * 0.18);
  fillStroke(ctx, colour, 0.22);
  ctx.restore();
}

// Paint stripes / spots clipped to the body path already in ctx.
function markings(ctx, rx, ry, L) {
  if (SIL) return;
  ctx.save();
  ctx.clip();
  if (L.belly) {
    ctx.fillStyle = L.belly;
    ell(ctx, rx * 0.1, ry * 0.75, rx * 1.1, ry * 0.55);
    ctx.fill();
  }
  if (L.stripes) {
    ctx.fillStyle = L.stripes.c;
    const n = L.stripes.n;
    for (let i = 0; i < n; i++) {
      const x = rx * (0.45 - (i * 1.25) / n);
      ctx.fillRect(x - rx * L.stripes.w, -ry * 1.5, rx * L.stripes.w * 2, ry * 3);
    }
  }
  if (L.spots) {
    ctx.fillStyle = L.spots;
    for (let i = 0; i < 9; i++) {
      circle(ctx, rx * (0.4 - ((i * 0.37) % 1.2)), ry * (-0.6 + ((i * 0.53) % 1.2)), Math.min(rx, ry) * 0.12);
      ctx.fill();
    }
  }
  if (L.patch) {
    ctx.fillStyle = L.patch;
    ell(ctx, -rx * 0.15, -ry * 0.1, rx * 0.35, ry * 0.5, 0.4);
    ctx.fill();
  }
  if (L.scales) {
    ctx.strokeStyle = L.scales;
    ctx.lineWidth = 0.15;
    for (let i = 0; i < 4; i++) {
      for (let j = -1; j <= 1; j++) {
        ctx.beginPath();
        ctx.arc(rx * (0.1 - i * 0.28), ry * j * 0.45, ry * 0.25, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
      }
    }
  }
  if (L.dots) {
    ctx.fillStyle = L.dots;
    for (let i = 0; i < 6; i++) {
      circle(ctx, rx * (0.45 - i * 0.24), ry * 0.6, ry * 0.11);
      ctx.fill();
    }
  }
  ctx.restore();
}

const LOOKS = {
  sergeant: { body: '#ffe14d', belly: '#fff8d6', fin: '#f5c400', stripes: { n: 4, c: '#2b2850', w: 0.11 }, face: 'grin', tail: 'fork' },
  snapper: { body: '#ff5a5f', belly: '#ffc2c4', fin: '#ff8a8e', face: 'pout', tail: 'fork', fins: 'spiky' },
  parrot: { body: '#2fd3a6', belly: '#b9f7e6', fin: '#ff7ac8', patch: '#ff9ad5', face: 'buck', tail: 'crescent', scales: 'rgba(22,11,51,0.25)' },
  hogfish: { body: '#ff9e7a', belly: '#ffe0cc', fin: '#ff7a55', face: 'tongue', tail: 'crescent', fins: 'spiky', snout: true },
  grouper: { body: '#7c8f4e', belly: '#c9d39c', fin: '#5e6f36', spots: '#4c5a2a', face: 'pout', tail: 'round', bigLips: true },
  barracuda: { body: '#b9c6d6', belly: '#eef3f8', fin: '#7d8ea3', stripes: { n: 6, c: 'rgba(40,52,80,0.45)', w: 0.05 }, face: 'teeth', tail: 'fork' },
  tarpon: { body: '#cfd9e6', belly: '#ffffff', fin: '#8fa3bd', scales: 'rgba(60,80,120,0.4)', face: 'grin', tail: 'fork', fins: 'tall' },
  swordfish: { body: '#4a6fa8', belly: '#b8cbe6', fin: '#33507e', face: 'grin', tail: 'crescent', fins: 'tall', bill: true },
  lantern: { body: '#2b3f8c', belly: '#4a62b8', fin: '#1f2d66', dots: '#9ff7ff', face: 'o', tail: 'fork', glowDots: true },
  viper: { body: '#232845', belly: '#3a4270', fin: '#151a33', dots: '#9fffd0', face: 'fangs', tail: 'fork', glowDots: true },
};

function genericFish(ctx, id, rx, ry, t, mood, ph) {
  const L = LOOKS[id];
  const swish = Math.sin(t * 9 + ph * 6);
  tail(ctx, rx, ry, swish, L.fin, L.tail);
  if (L.fins === 'spiky') finTop(ctx, rx, ry, L.fin, 0.55, true);
  else finTop(ctx, rx, ry, L.fin, L.fins === 'tall' ? 1.1 : 0.55);
  if (L.bill) {
    ctx.beginPath();
    ctx.moveTo(rx * 0.85, -ry * 0.25);
    ctx.lineTo(rx * 1.75, -ry * 0.05);
    ctx.lineTo(rx * 0.85, ry * 0.12);
    ctx.closePath();
    fillStroke(ctx, '#d9e3f2', 0.25);
  }
  if (L.snout) {
    ell(ctx, rx * 0.85, ry * 0.05, rx * 0.28, ry * 0.3);
    fillStroke(ctx, L.body);
  }
  bodyPath(ctx, rx, ry);
  fillStroke(ctx, L.body);
  bodyPath(ctx, rx, ry);
  markings(ctx, rx, ry, L);
  bodyPath(ctx, rx, ry);
  ctx.lineWidth = 0.3;
  stroke(ctx);
  ctx.stroke();
  finSide(ctx, rx, ry, L.fin, swish);
  if (L.glowDots && !SIL) {
    ctx.fillStyle = L.dots;
    for (let i = 0; i < 6; i++) {
      circle(ctx, rx * (0.45 - i * 0.24), ry * 0.6, ry * 0.13);
      ctx.fill();
    }
  }
  const er = Math.min(ry * 0.42, rx * 0.3);
  eye(ctx, rx * 0.42, -ry * 0.3, er, mood, t);
  const noseX = L.snout ? rx * 1.08 : rx * 0.98;
  if (L.bigLips && !SIL) {
    ctx.fillStyle = '#c47a6a';
    ell(ctx, noseX - ry * 0.1, ry * 0.15, ry * 0.22, ry * 0.32);
    ctx.fill();
    ctx.lineWidth = 0.25;
    ctx.strokeStyle = INK;
    ctx.stroke();
  } else if (L.face === 'fangs' && !SIL) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.15;
    for (const [fx, len] of [[0.92, 0.9], [0.72, 0.7]]) {
      ctx.beginPath();
      ctx.moveTo(rx * fx, ry * 0.05);
      ctx.lineTo(rx * fx + ry * 0.08, ry * (0.05 + len));
      ctx.lineTo(rx * fx + ry * 0.2, ry * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    mouth(ctx, 'grin', noseX, ry * 0.1, ry, mood);
  } else mouth(ctx, L.face, noseX, ry * 0.1, ry, mood);
}

// ---------- special shapes ----------

function angel(ctx, rx, ry, t, mood, ph) {
  const swish = Math.sin(t * 7 + ph * 6);
  const yellow = '#ffd23a';
  // long trailing fins above and below
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(rx * 0.3, sgn * ry * 0.7);
    ctx.quadraticCurveTo(-rx * 0.4, sgn * ry * 1.3, -rx * 1.3 - swish * 0.3, sgn * ry * (1.15 + 0.1 * swish));
    ctx.quadraticCurveTo(-rx * 0.6, sgn * ry * 0.6, -rx * 0.6, sgn * ry * 0.3);
    ctx.closePath();
    fillStroke(ctx, '#2f7bff', 0.25);
  }
  tail(ctx, rx, ry * 0.7, swish, yellow, 'round');
  ctx.beginPath();
  ctx.moveTo(rx, 0);
  ctx.quadraticCurveTo(rx * 0.5, -ry * 1.15, -rx * 0.1, -ry);
  ctx.quadraticCurveTo(-rx * 0.85, -ry * 0.3, -rx * 0.85, 0);
  ctx.quadraticCurveTo(-rx * 0.85, ry * 0.3, -rx * 0.1, ry);
  ctx.quadraticCurveTo(rx * 0.5, ry * 1.15, rx, 0);
  ctx.closePath();
  fillStroke(ctx, '#3fa0ff');
  if (!SIL) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = yellow;
    for (let i = 0; i < 3; i++) ctx.fillRect(-rx * (0.6 - i * 0.45), -ry * 2, rx * 0.18, ry * 4);
    ctx.restore();
  }
  eye(ctx, rx * 0.45, -ry * 0.22, ry * 0.3, mood, t);
  mouth(ctx, 'pout', rx * 0.98, ry * 0.05, ry * 0.8, mood);
}

function octopus(ctx, rx, ry, t, mood, ph) {
  const c = '#ff7a3d';
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const bx = -rx * 0.75 + (i / 7) * rx * 1.5;
    const w = Math.sin(t * 5 + i * 0.9 + ph * 5);
    ctx.beginPath();
    ctx.moveTo(bx, ry * 0.1);
    ctx.quadraticCurveTo(bx + w * 1.2, ry * 0.9, bx - w * 0.8 + (i - 3.5) * 0.3, ry * 1.25);
    ctx.lineWidth = 1.1;
    stroke(ctx);
    ctx.stroke();
    ctx.lineWidth = 0.6;
    stroke(ctx, c);
    ctx.stroke();
  }
  ell(ctx, 0, -ry * 0.25, rx * 0.95, ry * 0.85);
  fillStroke(ctx, c);
  if (!SIL) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ell(ctx, -rx * 0.3, -ry * 0.7, rx * 0.25, ry * 0.15, -0.3);
    ctx.fill();
  }
  eye(ctx, -rx * 0.3, -ry * 0.05, ry * 0.3, mood, t, 0.1);
  eye(ctx, rx * 0.35, -ry * 0.05, ry * 0.3, mood, t, 0.1);
  if (!SIL) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.28;
    ctx.beginPath();
    ctx.arc(0, ry * 0.15, ry * 0.25, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
}

function moray(ctx, rx, ry, t, mood, ph) {
  const c = '#4c9a3a';
  const n = 14;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const x = rx - k * rx * 2.05;
    const y = Math.sin(t * 6 + ph * 6 - k * 5) * ry * 0.7 * k;
    pts.push([x, y, ry * (1 - k * 0.65)]);
  }
  ctx.beginPath();
  pts.forEach(([x, y, w], i) => (i ? ctx.lineTo(x, y - w) : ctx.moveTo(x, y - w)));
  for (let i = n; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1] + pts[i][2]);
  ctx.closePath();
  fillStroke(ctx, c);
  if (!SIL) {
    ctx.fillStyle = '#ffe14d';
    for (let i = 2; i < n; i += 2) {
      circle(ctx, pts[i][0], pts[i][1] - pts[i][2] * 0.2, ry * 0.15);
      ctx.fill();
    }
  }
  eye(ctx, rx * 0.6, -ry * 0.35, ry * 0.42, mood, t);
  mouth(ctx, 'teeth', rx * 1.02, ry * 0.05, ry * 1.1, mood);
}

function blobfish(ctx, rx, ry, t, mood, ph) {
  const wob = Math.sin(t * 3 + ph * 4) * 0.08;
  ctx.beginPath();
  ctx.moveTo(rx * 0.9, -ry * 0.1);
  ctx.bezierCurveTo(rx * 0.9, -ry * (1.2 + wob), -rx * 0.8, -ry * 1.1, -rx * 0.95, 0);
  ctx.bezierCurveTo(-rx * 0.9, ry * 0.9, rx * 0.8, ry * (1.1 - wob), rx * 0.9, -ry * 0.1);
  ctx.closePath();
  fillStroke(ctx, '#f6a7c1');
  // droopy nose
  ell(ctx, rx * 0.78, ry * 0.1, rx * 0.28, ry * 0.42);
  fillStroke(ctx, '#ff8fb3');
  eye(ctx, rx * 0.25, -ry * 0.4, ry * 0.2, mood, t, 0);
  eye(ctx, rx * 0.55, -ry * 0.45, ry * 0.2, mood, t, 0);
  mouth(ctx, 'sad', rx * 0.7, ry * 0.25, ry, mood);
}

function angler(ctx, rx, ry, t, mood, ph, glow) {
  const c = '#5a3d2b';
  const lx = rx * 1.15;
  const ly = -ry * 1.55 + Math.sin(t * 3 + ph * 5) * 0.4;
  if (glow && !SIL) {
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, ry * 1.4);
    g.addColorStop(0, 'rgba(255,250,170,0.9)');
    g.addColorStop(1, 'rgba(255,250,170,0)');
    ctx.fillStyle = g;
    circle(ctx, lx, ly, ry * 1.4);
    ctx.fill();
  }
  tail(ctx, rx, ry * 0.8, Math.sin(t * 6 + ph), '#3e2a1d', 'round');
  ctx.beginPath();
  ctx.moveTo(rx * 0.2, -ry * 0.8);
  ctx.quadraticCurveTo(rx * 0.6, -ry * 1.8, lx, ly);
  ctx.lineWidth = 0.35;
  stroke(ctx);
  ctx.stroke();
  circle(ctx, lx, ly, 0.55);
  fill(ctx, '#fff9a8');
  ctx.fill();
  ell(ctx, 0, 0, rx * 0.95, ry);
  fillStroke(ctx, c);
  // huge mouth with teeth
  if (!SIL) {
    ctx.fillStyle = '#2a0d1a';
    ctx.beginPath();
    ctx.moveTo(rx * 0.98, -ry * 0.15);
    ctx.quadraticCurveTo(rx * 0.1, ry * 0.25, rx * 0.95, ry * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      const k = i / 3;
      const x = rx * (0.92 - k * 0.45);
      const y = -ry * 0.1 + k * ry * 0.25;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 0.15, y + 0.55);
      ctx.lineTo(x - 0.4, y + 0.05);
      ctx.fill();
    }
  }
  eye(ctx, rx * 0.3, -ry * 0.45, ry * 0.22, mood, t);
}

function squid(ctx, rx, ry, t, mood, ph, glow) {
  const c = '#e0484f';
  if (glow && !SIL) {
    const g = ctx.createRadialGradient(0, 0, ry, 0, 0, rx * 1.6);
    g.addColorStop(0, 'rgba(255,210,90,0.35)');
    g.addColorStop(1, 'rgba(255,210,90,0)');
    ctx.fillStyle = g;
    circle(ctx, 0, 0, rx * 1.6);
    ctx.fill();
  }
  // tentacles trail to the left
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const yy = (i - 2.5) * ry * 0.22;
    const w = Math.sin(t * 4 + i + ph * 5);
    const len = i === 1 || i === 4 ? 1.25 : 0.85;
    ctx.beginPath();
    ctx.moveTo(-rx * 0.2, yy);
    ctx.quadraticCurveTo(-rx * 0.7, yy + w * ry * 0.6, -rx * (0.2 + len), yy * 1.6 + w * ry * 0.3);
    ctx.lineWidth = 1;
    stroke(ctx);
    ctx.stroke();
    ctx.lineWidth = 0.55;
    stroke(ctx, c);
    ctx.stroke();
  }
  // mantle pointing right, with fins at the tip
  ctx.beginPath();
  ctx.moveTo(rx * 0.95, -ry * 1.1);
  ctx.lineTo(rx * 1.1, 0);
  ctx.lineTo(rx * 0.95, ry * 1.1);
  ctx.lineTo(rx * 0.7, 0);
  ctx.closePath();
  fillStroke(ctx, '#c7323a');
  ctx.beginPath();
  ctx.moveTo(rx * 1.0, 0);
  ctx.bezierCurveTo(rx * 0.8, -ry * 0.9, -rx * 0.1, -ry * 0.95, -rx * 0.25, -ry * 0.55);
  ctx.lineTo(-rx * 0.25, ry * 0.55);
  ctx.bezierCurveTo(-rx * 0.1, ry * 0.95, rx * 0.8, ry * 0.9, rx * 1.0, 0);
  ctx.closePath();
  fillStroke(ctx, c);
  if (!SIL) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let i = 0; i < 4; i++) {
      circle(ctx, rx * (0.6 - i * 0.18), -ry * 0.35 + (i % 2) * ry * 0.4, ry * 0.12);
      ctx.fill();
    }
  }
  eye(ctx, -rx * 0.08, -ry * 0.15, ry * 0.5, mood, t, -0.2);
}

function jelly(ctx, rx, ry, t, mood, ph, glow) {
  const pulse = Math.sin(t * 4 + ph * 6);
  const c = glow ? 'rgba(150,240,255,0.85)' : 'rgba(255,140,200,0.85)';
  if (glow && !SIL) {
    const g = ctx.createRadialGradient(0, -ry * 0.3, 0, 0, -ry * 0.3, rx * 2);
    g.addColorStop(0, 'rgba(120,240,255,0.5)');
    g.addColorStop(1, 'rgba(120,240,255,0)');
    ctx.fillStyle = g;
    circle(ctx, 0, -ry * 0.3, rx * 2);
    ctx.fill();
  }
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const x = -rx * 0.7 + (i / 4) * rx * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let k = 1; k <= 4; k++) ctx.lineTo(x + Math.sin(t * 5 + i + k + ph * 4) * 0.5, k * ry * 0.38);
    ctx.lineWidth = 0.35;
    stroke(ctx, SIL || (glow ? '#9ff7ff' : '#ff7ab8'));
    ctx.stroke();
  }
  const w = rx * (1 + pulse * 0.07);
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.bezierCurveTo(-w, -ry * 1.35, w, -ry * 1.35, w, 0);
  for (let i = 4; i >= 0; i--) ctx.quadraticCurveTo(-w + ((i + 0.5) / 5) * 2 * w, ry * 0.3, -w + (i / 5) * 2 * w, 0);
  ctx.closePath();
  fillStroke(ctx, c, 0.28);
  eye(ctx, -rx * 0.3, -ry * 0.45, ry * 0.18, mood, t, 0);
  eye(ctx, rx * 0.3, -ry * 0.45, ry * 0.18, mood, t, 0);
  if (!SIL) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.2;
    ctx.beginPath();
    ctx.arc(0, -ry * 0.3, ry * 0.15, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
}

function puffer(ctx, rx, ry, t, mood, ph, puffed) {
  const r = Math.min(rx, ry) * (puffed ? 1.25 : 0.92);
  const swish = Math.sin(t * 9 + ph * 6);
  if (!puffed) tail(ctx, r * 1.05, r * 0.6, swish, '#d9a330', 'round');
  // spikes
  const n = puffed ? 16 : 10;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    ctx.moveTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9);
    ctx.lineTo(Math.cos(a) * r * (puffed ? 1.4 : 1.18), Math.sin(a) * r * (puffed ? 1.4 : 1.18));
  }
  ctx.lineWidth = 0.3;
  stroke(ctx);
  ctx.stroke();
  circle(ctx, 0, 0, r);
  fillStroke(ctx, '#f2c14e');
  if (!SIL) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#fff3c4';
    ell(ctx, 0, r * 0.7, r * 1.1, r * 0.6);
    ctx.fill();
    ctx.fillStyle = '#9a6b1f';
    for (let i = 0; i < 6; i++) {
      circle(ctx, -r * 0.6 + (i % 3) * r * 0.5, -r * 0.5 + Math.floor(i / 3) * r * 0.4, r * 0.1);
      ctx.fill();
    }
    ctx.restore();
  }
  eye(ctx, r * 0.4, -r * 0.3, r * 0.3, puffed ? 'surprised' : mood, t);
  mouth(ctx, 'o', r * 0.98, r * 0.1, r * 0.9, mood);
}

function turtle(ctx, rx, ry, t, mood, ph) {
  const paddle = Math.sin(t * 3 + ph * 6);
  const skin = '#8fd18a';
  // flippers
  for (const [fx, fy, a] of [[rx * 0.35, ry * 0.5, 0.6 + paddle * 0.5], [-rx * 0.5, ry * 0.55, 0.3 - paddle * 0.4]]) {
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(a);
    ell(ctx, rx * 0.1, ry * 0.45, rx * 0.15, ry * 0.5);
    fillStroke(ctx, skin);
    ctx.restore();
  }
  // head
  ell(ctx, rx * 0.85, -ry * 0.1, rx * 0.22, ry * 0.38);
  fillStroke(ctx, skin);
  eye(ctx, rx * 0.9, -ry * 0.25, ry * 0.15, mood, t);
  if (!SIL) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.22;
    ctx.beginPath();
    ctx.arc(rx * 0.92, -ry * 0.02, ry * 0.12, 0.1, Math.PI - 0.6);
    ctx.stroke();
  }
  // shell
  ctx.beginPath();
  ctx.moveTo(rx * 0.68, ry * 0.25);
  ctx.bezierCurveTo(rx * 0.6, -ry * 1.15, -rx * 0.75, -ry * 1.1, -rx * 0.85, ry * 0.25);
  ctx.closePath();
  fillStroke(ctx, '#3d8a4a');
  if (!SIL) {
    ctx.strokeStyle = '#26602f';
    ctx.lineWidth = 0.25;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(-rx * 0.45 + i * rx * 0.42, -ry * 0.2, ry * 0.32, 0, TAU);
      ctx.stroke();
    }
  }
  ell(ctx, -rx * 0.08, ry * 0.3, rx * 0.78, ry * 0.12);
  fillStroke(ctx, '#e8d27a', 0.22);
}

function manatee(ctx, rx, ry, t, mood, ph) {
  const c = '#9aa4b5';
  const wag = Math.sin(t * 2 + ph * 5);
  // paddle tail
  ctx.save();
  ctx.translate(-rx * 0.8, 0);
  ctx.rotate(wag * 0.2);
  ell(ctx, -rx * 0.18, 0, rx * 0.2, ry * 0.6);
  fillStroke(ctx, '#87909f');
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(rx, ry * 0.1);
  ctx.bezierCurveTo(rx * 1.0, -ry * 1.2, -rx * 0.5, -ry * 1.1, -rx * 0.85, -ry * 0.1);
  ctx.bezierCurveTo(-rx * 0.5, ry * 1.05, rx * 0.9, ry * 1.1, rx, ry * 0.1);
  ctx.closePath();
  fillStroke(ctx, c);
  if (!SIL) {
    ctx.fillStyle = '#b9c1cf';
    ell(ctx, 0, ry * 0.6, rx * 0.7, ry * 0.3);
    ctx.fill();
  }
  // flipper
  ctx.save();
  ctx.translate(rx * 0.45, ry * 0.45);
  ctx.rotate(0.7 + wag * 0.3);
  ell(ctx, 0, ry * 0.3, rx * 0.08, ry * 0.35);
  fillStroke(ctx, '#87909f');
  ctx.restore();
  // snout
  ell(ctx, rx * 0.88, ry * 0.15, rx * 0.17, ry * 0.4);
  fillStroke(ctx, '#aab3c2');
  if (!SIL) {
    ctx.fillStyle = INK;
    for (let i = 0; i < 3; i++) {
      circle(ctx, rx * 0.92, ry * (0.05 + i * 0.15), 0.12);
      ctx.fill();
    }
  }
  eye(ctx, rx * 0.6, -ry * 0.25, ry * 0.13, mood === 'normal' ? 'happy' : mood, t);
}

function boot(ctx, rx, ry, t) {
  ctx.save();
  ctx.rotate(Math.sin(t * 1.3) * 0.2);
  ctx.beginPath();
  ctx.moveTo(-rx * 0.5, -ry);
  ctx.lineTo(rx * 0.25, -ry);
  ctx.lineTo(rx * 0.25, ry * 0.15);
  ctx.quadraticCurveTo(rx * 1.05, ry * 0.2, rx * 1.0, ry * 0.75);
  ctx.lineTo(-rx * 0.6, ry * 0.75);
  ctx.closePath();
  fillStroke(ctx, '#7a4a2a');
  ctx.beginPath();
  ctx.rect(-rx * 0.65, ry * 0.75, rx * 1.7, ry * 0.25);
  fillStroke(ctx, '#3b2416', 0.25);
  if (!SIL) {
    ctx.strokeStyle = '#f6e2b0';
    ctx.lineWidth = 0.22;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-rx * 0.15, -ry * 0.6 + i * ry * 0.35);
      ctx.lineTo(rx * 0.25, -ry * 0.45 + i * ry * 0.35);
      ctx.stroke();
    }
    // a little worm peeking out
    ctx.strokeStyle = '#ff8fb3';
    ctx.lineWidth = 0.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-rx * 0.1, -ry);
    ctx.quadraticCurveTo(-rx * 0.1 + Math.sin(t * 4) * 0.6, -ry * 1.5, rx * 0.2, -ry * 1.4);
    ctx.stroke();
  }
  ctx.restore();
}

function can(ctx, rx, ry, t) {
  ctx.save();
  ctx.rotate(0.5 + Math.sin(t * 1.1) * 0.25);
  ctx.beginPath();
  ctx.rect(-rx * 0.8, -ry * 0.85, rx * 1.6, ry * 1.7);
  fillStroke(ctx, '#b8c0cc');
  if (!SIL) {
    ctx.fillStyle = '#ff4b4b';
    ctx.fillRect(-rx * 0.8, -ry * 0.4, rx * 1.6, ry * 0.8);
    ctx.fillStyle = '#ffffff';
    circle(ctx, 0, 0, ry * 0.25);
    ctx.fill();
  }
  ell(ctx, 0, -ry * 0.85, rx * 0.8, ry * 0.2);
  fillStroke(ctx, '#d7dde6', 0.22);
  ctx.restore();
}

export function drawChest(ctx, x, y, scale, open = 0, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const w = 5;
  const h = 3.4;
  if (open > 0 && !SIL) {
    const g = ctx.createRadialGradient(0, -h * 0.4, 0, 0, -h * 0.4, w * 2.2);
    g.addColorStop(0, `rgba(255,230,90,${0.8 * open})`);
    g.addColorStop(1, 'rgba(255,230,90,0)');
    ctx.fillStyle = g;
    circle(ctx, 0, -h * 0.4, w * 2.2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.rect(-w, -h * 0.5, w * 2, h * 1.1);
  fillStroke(ctx, '#9a5a2a', 0.35);
  if (open > 0) {
    // gold heaped up inside
    fill(ctx, '#ffd23a');
    ctx.beginPath();
    ctx.moveTo(-w * 0.95, -h * 0.5);
    for (let i = 0; i <= 6; i++) ctx.lineTo(-w * 0.95 + (i / 6) * w * 1.9, -h * 0.5 - (i % 2 ? 1.1 : 0.6) * open);
    ctx.lineTo(w * 0.95, -h * 0.5);
    ctx.fill();
    ctx.lineWidth = 0.25;
    stroke(ctx);
    ctx.stroke();
  }
  // lid (tips back when open)
  ctx.save();
  ctx.translate(-w, -h * 0.5);
  ctx.rotate(-open * 1.9);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -h * 0.35);
  ctx.quadraticCurveTo(w, -h * 1.1, w * 2, -h * 0.35);
  ctx.lineTo(w * 2, 0);
  ctx.closePath();
  fillStroke(ctx, '#b06a32', 0.35);
  ctx.restore();
  fill(ctx, '#ffd23a');
  for (const bx of [-w * 0.6, w * 0.5]) {
    ctx.beginPath();
    ctx.rect(bx, -h * 0.5, w * 0.12, h * 1.1);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.rect(-w * 0.18, -h * 0.35, w * 0.36, h * 0.45);
  fillStroke(ctx, '#ffd23a', 0.25);
  if (open > 0 && !SIL) {
    for (let i = 0; i < 4; i++) {
      const a = t * 2 + i * 1.6;
      const sx = Math.cos(a) * w * 1.1;
      const sy = -h * 1.2 + Math.sin(a * 1.3) * h * 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(sx, sy - 0.6);
      ctx.lineTo(sx + 0.18, sy - 0.18);
      ctx.lineTo(sx + 0.6, sy);
      ctx.lineTo(sx + 0.18, sy + 0.18);
      ctx.lineTo(sx, sy + 0.6);
      ctx.lineTo(sx - 0.18, sy + 0.18);
      ctx.lineTo(sx - 0.6, sy);
      ctx.lineTo(sx - 0.18, sy - 0.18);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Draws creature `id` centred at screen (x, y), `scale` px per world unit, facing dir (±1).
export function drawCreature(ctx, id, x, y, scale, dir = 1, t = 0, opts = {}) {
  const sp = SPECIES_BY_ID[id];
  if (!sp) return;
  const mood = opts.mood || 'normal';
  const ph = opts.phase || 0;
  const glow = !!opts.glow;
  SIL = opts.sil || null;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * scale, scale);
  if (opts.rotate) ctx.rotate(opts.rotate);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const { rx, ry } = sp;
  if (LOOKS[id]) {
    if (glow && LOOKS[id].glowDots && !SIL) {
      const g = ctx.createRadialGradient(0, 0, ry * 0.5, 0, 0, rx * 1.5);
      g.addColorStop(0, 'rgba(140,255,240,0.28)');
      g.addColorStop(1, 'rgba(140,255,240,0)');
      ctx.fillStyle = g;
      circle(ctx, 0, 0, rx * 1.5);
      ctx.fill();
    }
    genericFish(ctx, id, rx, ry, t, mood, ph);
  } else if (id === 'angel') angel(ctx, rx, ry, t, mood, ph);
  else if (id === 'octopus') octopus(ctx, rx, ry, t, mood, ph);
  else if (id === 'moray') moray(ctx, rx, ry, t, mood, ph);
  else if (id === 'blobfish') blobfish(ctx, rx, ry, t, mood, ph);
  else if (id === 'angler') angler(ctx, rx, ry, t, mood, ph, glow);
  else if (id === 'squid') squid(ctx, rx, ry, t, mood, ph, glow);
  else if (id === 'jelly') jelly(ctx, rx, ry, t, mood, ph, glow);
  else if (id === 'puffer') puffer(ctx, rx, ry, t, mood, ph, !!opts.puffed);
  else if (id === 'turtle') turtle(ctx, rx, ry, t, mood, ph);
  else if (id === 'manatee') manatee(ctx, rx, ry, t, mood, ph);
  else if (id === 'boot') boot(ctx, rx, ry, t + ph * 5);
  else if (id === 'can') can(ctx, rx, ry, t + ph * 5);
  ctx.restore();
  SIL = null;
}

// Things that glow in the dark.
export const GLOWS = new Set(['lantern', 'viper', 'angler', 'squid', 'jelly']);
