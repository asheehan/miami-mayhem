// Drawing for Flamingo Golf. Reads game state; changes nothing. Course pictures are
// drawn in the course's logical space, scaled by the view { s, ox, oy }.
import { COURSE_W, COURSE_H, BALL_R, CUP_R, GATOR, gatorPhase, flamingoPose, inRegion } from './physics.js';

export const C = {
  night: '#2b1055',
  dusk: '#7a1fa2',
  pink: '#ff3d9a',
  hotPink: '#ff5fae',
  lightPink: '#ffb3d6',
  orange: '#ff8a4c',
  sun: '#ffe14d',
  sea: '#0bb5c4',
  deep: '#0a3d6b',
  foam: '#9ff7f2',
  ink: '#160b33',
  white: '#ffffff',
  felt: '#35c65a',
  feltLight: '#45d66a',
  feltDark: '#1f8f3f',
  rim: '#f6dcb0',
  sand: '#f4d58d',
  sandDark: '#d9b05f',
  water: '#16c7d6',
  waterDark: '#0a8aa6',
  gator: '#4f9e3a',
  gatorDark: '#2f6b22',
  gatorBelly: '#a8d86a',
};

export const font = (px, weight = 900) => `${weight} ${Math.round(px)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;

export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function outlined(ctx, text, x, y, px, fill, maxW) {
  ctx.font = font(px);
  if (maxW) {
    const tw = ctx.measureText(text).width;
    if (tw > maxW) {
      px = (px * maxW) / tw;
      ctx.font = font(px);
    }
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = px * 0.22;
  ctx.strokeStyle = C.ink;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

export function drawStar(ctx, x, y, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.48 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? C.sun : 'rgba(22,11,51,0.3)';
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, r * 0.16);
  ctx.strokeStyle = filled ? C.ink : 'rgba(255,255,255,0.55)';
  ctx.stroke();
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
  ctx.fillStyle = C.ink;
  let px = b.h * 0.42;
  ctx.font = font(px);
  const tw = ctx.measureText(b.label).width;
  if (tw > b.w * 0.86) ctx.font = font((px * b.w * 0.86) / tw);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
}

// Small square icon buttons: 'home', 'back', 'restart'.
export function drawIconButton(ctx, b) {
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  roundRect(ctx, b.x, b.y, b.w, b.h, b.w * 0.24);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.stroke();
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const s = b.w * 0.3;
  ctx.fillStyle = C.white;
  ctx.strokeStyle = C.white;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (b.icon === 'home') {
    ctx.beginPath();
    ctx.moveTo(cx - s * 1.05, cy - s * 0.05);
    ctx.lineTo(cx, cy - s);
    ctx.lineTo(cx + s * 1.05, cy - s * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx - s * 0.7, cy - s * 0.1, s * 1.4, s * 0.95);
  } else if (b.icon === 'back') {
    ctx.lineWidth = s * 0.42;
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.35, cy - s * 0.8);
    ctx.lineTo(cx - s * 0.45, cy);
    ctx.lineTo(cx + s * 0.35, cy + s * 0.8);
    ctx.stroke();
  } else if (b.icon === 'restart') {
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
  }
}

// The sunset behind everything, painted once per size.
let backdrop = null;
export function drawBackdrop(ctx, w, h) {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  if (!backdrop || backdrop.width !== Math.round(w * dpr) || backdrop.height !== Math.round(h * dpr)) {
    backdrop = document.createElement('canvas');
    backdrop.width = Math.round(w * dpr);
    backdrop.height = Math.round(h * dpr);
    const b = backdrop.getContext('2d');
    b.scale(dpr, dpr);
    paintBackdrop(b, w, h);
  }
  ctx.drawImage(backdrop, 0, 0, w, h);
}

function paintBackdrop(ctx, w, h) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, C.night);
  sky.addColorStop(0.4, C.dusk);
  sky.addColorStop(0.75, C.pink);
  sky.addColorStop(1, C.orange);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // soft sun glow low in the sky
  const r = Math.min(w, h) * 0.5;
  const glow = ctx.createRadialGradient(w / 2, h * 0.92, 0, w / 2, h * 0.92, r);
  glow.addColorStop(0, 'rgba(255,225,77,0.55)');
  glow.addColorStop(1, 'rgba(255,225,77,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  // palm silhouettes in the bottom corners
  for (const side of [-1, 1]) {
    const baseX = side < 0 ? w * 0.02 : w * 0.98;
    const topX = baseX - side * w * 0.07;
    const topY = h * 0.8;
    ctx.strokeStyle = 'rgba(22,11,51,0.55)';
    ctx.fillStyle = 'rgba(22,11,51,0.55)';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(5, w * 0.015);
    ctx.beginPath();
    ctx.moveTo(baseX, h);
    ctx.quadraticCurveTo(baseX, h * 0.9, topX, topY);
    ctx.stroke();
    const len = Math.min(w * 0.16, h * 0.1);
    for (const a of [-2.9, -2.3, -1.6, -0.9, -0.25, 0.35]) {
      const ex = topX + Math.cos(a) * len;
      const ey = topY + Math.sin(a) * len * 0.75 + len * 0.28;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(topX + Math.cos(a) * len * 0.6, topY + Math.sin(a) * len * 0.9 - len * 0.1, ex, ey);
      ctx.quadraticCurveTo(topX + Math.cos(a) * len * 0.5, topY + Math.sin(a) * len * 0.5 + len * 0.08, topX, topY);
      ctx.fill();
    }
  }
}

function tracePolygon(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

function traceRegion(ctx, r) {
  ctx.beginPath();
  if (r.r !== undefined) ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
  else roundRect(ctx, r.x, r.y, r.w, r.h, 14);
}

// Everything about a hole that never moves, in logical units (call inside the view transform).
function paintHole(ctx, hole) {
  const o = hole.outline;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // soft deck around the felt
  ctx.save();
  ctx.shadowColor = 'rgba(22,11,51,0.45)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  tracePolygon(ctx, o);
  ctx.lineWidth = 34;
  ctx.strokeStyle = C.rim;
  ctx.stroke();
  ctx.fillStyle = C.rim;
  ctx.fill();
  ctx.restore();
  tracePolygon(ctx, o);
  ctx.lineWidth = 34;
  ctx.strokeStyle = C.rim;
  ctx.stroke();

  // the felt with mowing stripes
  ctx.save();
  tracePolygon(ctx, o);
  ctx.clip();
  ctx.fillStyle = C.felt;
  ctx.fillRect(0, 0, COURSE_W, COURSE_H);
  ctx.fillStyle = C.feltLight;
  for (let y = 0; y < COURSE_H; y += 80) ctx.fillRect(0, y, COURSE_W, 40);
  // inner shade along the edges
  tracePolygon(ctx, o);
  ctx.lineWidth = 26;
  ctx.strokeStyle = 'rgba(20,90,40,0.25)';
  ctx.stroke();

  // sand
  for (const r of hole.sand) {
    traceRegion(ctx, r);
    ctx.fillStyle = C.sand;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.sandDark;
    ctx.stroke();
    ctx.fillStyle = C.sandDark;
    const bx = r.r !== undefined ? r.x - r.r : r.x;
    const by = r.r !== undefined ? r.y - r.r : r.y;
    const bw = r.r !== undefined ? r.r * 2 : r.w;
    const bh = r.r !== undefined ? r.r * 2 : r.h;
    for (let i = 0; i < (bw * bh) / 260; i++) {
      const x = bx + ((i * 37.3) % bw);
      const y = by + ((i * 61.7 + (i % 7) * 13) % bh);
      if (inRegion(r, x, y)) {
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // water
  for (const r of hole.water) {
    traceRegion(ctx, r);
    ctx.fillStyle = C.water;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = C.waterDark;
    ctx.stroke();
    ctx.save();
    traceRegion(ctx, r);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    const bx = r.r !== undefined ? r.x - r.r : r.x;
    const by = r.r !== undefined ? r.y - r.r : r.y;
    const bw = r.r !== undefined ? r.r * 2 : r.w;
    const bh = r.r !== undefined ? r.r * 2 : r.h;
    for (let y = by + 18; y < by + bh; y += 26) {
      for (let x = bx + 10 + ((y / 26) % 2) * 22; x < bx + bw - 10; x += 44) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 6, y - 6, x + 12, y);
        ctx.quadraticCurveTo(x + 18, y + 6, x + 24, y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  ctx.restore();

  // tee mat
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(hole.tee[0], hole.tee[1], 15, 0, Math.PI * 2);
  ctx.fill();

  // cup
  const [cx, cy] = hole.cup;
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.arc(cx, cy, CUP_R + 4, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(cx, cy - 4, 2, cx, cy, CUP_R);
  g.addColorStop(0, '#000');
  g.addColorStop(1, '#0d2e18');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, CUP_R, 0, Math.PI * 2);
  ctx.fill();

  // walls: outline and inner walls
  const wallPath = () => {
    tracePolygon(ctx, o);
    for (const [x1, y1, x2, y2] of hole.walls) {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
  };
  wallPath();
  ctx.lineWidth = 14;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  wallPath();
  ctx.lineWidth = 10;
  ctx.strokeStyle = C.hotPink;
  ctx.stroke();
  ctx.save();
  ctx.translate(-1, -1.5);
  wallPath();
  ctx.lineWidth = 3;
  ctx.strokeStyle = C.lightPink;
  ctx.stroke();
  ctx.restore();
}

// The whole static play screen (sunset + hole) for one hole and view, cached.
const cache = { key: '', canvas: null };
export function drawStaticHole(ctx, hole, view, w, h) {
  const dpr = window.devicePixelRatio || 1;
  const key = `${hole.name}|${w}|${h}|${dpr}|${view.s}`;
  if (cache.key !== key) {
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const c = cv.getContext('2d');
    c.scale(dpr, dpr);
    paintBackdrop(c, w, h);
    c.save();
    c.translate(view.ox, view.oy);
    c.scale(view.s, view.s);
    paintHole(c, hole);
    c.restore();
    cache.key = key;
    cache.canvas = cv;
  }
  ctx.drawImage(cache.canvas, 0, 0, w, h);
}

// A cartoon flamingo standing with its feet at (x, y). size ~ 1 is about 80 units tall.
// legs: { dance } or { kickAngle, kickLen } for a sweeping leg.
export function drawFlamingo(ctx, x, y, size, time, opts = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size * (opts.flip ? -1 : 1), size);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const bob = opts.dance ? Math.abs(Math.sin(time * 8)) * 8 : 0;
  const sway = opts.dance ? Math.sin(time * 4) * 0.25 : Math.sin(time * 1.5) * 0.04;
  const step = opts.step ?? 0;
  // legs
  ctx.strokeStyle = '#e0457f';
  ctx.lineWidth = 3.2;
  const hipY = -38 - bob;
  if (opts.kick === undefined) {
    const k1 = opts.dance ? Math.sin(time * 8) * 10 : step * 6;
    const k2 = opts.dance ? -Math.sin(time * 8) * 10 : -step * 6;
    ctx.beginPath();
    ctx.moveTo(-3, hipY);
    ctx.lineTo(-4 + k1 * 0.5, hipY * 0.5);
    ctx.lineTo(-6 + k1, Math.min(0, -Math.max(0, k1) * 0.6));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(3, hipY);
    ctx.lineTo(4 + k2 * 0.5, hipY * 0.5);
    ctx.lineTo(6 + k2, Math.min(0, -Math.max(0, k2) * 0.6));
    ctx.stroke();
    // feet
    ctx.fillStyle = '#e0457f';
    for (const fx of [-6 + k1, 6 + k2]) {
      ctx.beginPath();
      ctx.ellipse(fx + 2, 0, 5, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // standing leg
    ctx.beginPath();
    ctx.moveTo(0, hipY);
    ctx.lineTo(0, 0);
    ctx.stroke();
  }
  // body
  ctx.save();
  ctx.translate(0, hipY - 6);
  ctx.rotate(sway);
  ctx.fillStyle = C.pink;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(-2, 0, 17, 11, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // wing
  ctx.fillStyle = C.hotPink;
  ctx.beginPath();
  const flap = opts.dance ? Math.sin(time * 10) * 0.5 : 0;
  ctx.ellipse(-5, -2, 10, 6, -0.3 - flap, 0, Math.PI * 2);
  ctx.fill();
  // neck
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 7.5;
  ctx.beginPath();
  ctx.moveTo(10, -4);
  ctx.bezierCurveTo(22, -14, 4, -26, 12, -38);
  ctx.stroke();
  ctx.strokeStyle = C.pink;
  ctx.lineWidth = 4.5;
  ctx.stroke();
  // head
  ctx.fillStyle = C.pink;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(14, -40, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // beak
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.moveTo(18, -42);
  ctx.lineTo(26, -38);
  ctx.lineTo(22, -33);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.moveTo(18, -42);
  ctx.lineTo(24, -39);
  ctx.lineTo(19, -37);
  ctx.closePath();
  ctx.fill();
  // eye
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(14.5, -41.5, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

function drawWalker(ctx, f, t) {
  const p = flamingoPose(f, t);
  const w = (Math.PI * 2) / f.period;
  const dir = Math.sin(w * t + (f.phase || 0)); // >0 while heading toward b
  const flip = (f.b[0] - f.a[0]) * dir < 0;
  // shadow on the felt where the legs are
  ctx.fillStyle = 'rgba(0,60,20,0.3)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 2, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  drawFlamingo(ctx, p.x, p.y + 4, 1.15, t, { step: Math.sin(t * 9), flip });
}

function drawSweeper(ctx, f, t) {
  const p = flamingoPose(f, t);
  const leg = p.caps[1];
  // the long kicking leg along the felt
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 15;
  ctx.beginPath();
  ctx.moveTo(leg.x1, leg.y1);
  ctx.lineTo(leg.x2, leg.y2);
  ctx.stroke();
  ctx.strokeStyle = '#e0457f';
  ctx.lineWidth = 10;
  ctx.stroke();
  // knee and foot
  ctx.fillStyle = '#c93a70';
  const kx = leg.x1 + (leg.x2 - leg.x1) * 0.5;
  const ky = leg.y1 + (leg.y2 - leg.y1) * 0.5;
  ctx.beginPath();
  ctx.arc(kx, ky, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(leg.x2, leg.y2);
  ctx.rotate(p.ang);
  ctx.beginPath();
  ctx.moveTo(-4, -9);
  ctx.lineTo(12, 0);
  ctx.lineTo(-4, 9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // the flamingo itself, on its other leg
  ctx.fillStyle = 'rgba(0,60,20,0.3)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 4, 22, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  drawFlamingo(ctx, p.x, p.y + 6, 1.2, t, { kick: true });
}

// Gator lying on the cup; facing dir, mouth opening and closing.
function drawGator(ctx, g, cup, t, hole) {
  const [cx, cy] = cup;
  const ph = gatorPhase(g, t);
  // jaws: animate quickly open at the start of the open window, snap shut at its end
  let open;
  if (ph < g.open) open = Math.min(1, ph / 0.18);
  else open = Math.max(0, 1 - (ph - g.open) / 0.1);
  const warn = ph < g.open && g.open - ph < 0.45; // about to snap: wiggle
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(g.dir - Math.PI / 2); // draw as if facing down (+y)
  if (warn) ctx.translate(Math.sin(t * 60) * 1.2, 0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const H = -GATOR.hinge; // hinge y
  const b0 = -GATOR.body0;
  const b1 = -GATOR.body1;
  // tail, curling to the side
  ctx.fillStyle = C.gator;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-16, b1 + 4);
  ctx.quadraticCurveTo(-10, b1 - 40, 30 + Math.sin(t * 2) * 6, b1 - 42);
  ctx.quadraticCurveTo(4, b1 - 26, 16, b1 + 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // legs
  ctx.fillStyle = C.gatorDark;
  for (const [lx, ly, a] of [[-26, b0 - 14, -0.5], [26, b0 - 14, 0.5], [-26, b1 + 14, 0.5], [26, b1 + 14, -0.5]]) {
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(a);
    roundRect(ctx, -10, -6, 20, 12, 6);
    ctx.fill();
    ctx.restore();
  }
  // body
  ctx.fillStyle = C.gator;
  roundRect(ctx, -GATOR.bodyR - 2, b1 - 6, (GATOR.bodyR + 2) * 2, b0 - b1 + 22, 22);
  ctx.fill();
  ctx.stroke();
  // bumps along the back
  ctx.fillStyle = C.gatorDark;
  for (let y = b1 + 8; y < b0 + 6; y += 14) {
    for (const x of [-8, 8]) {
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // head
  const jawLen = GATOR.jaw + 4;
  const spread = GATOR.jawSpread * open;
  // the head where the jaws meet
  ctx.fillStyle = C.gator;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  roundRect(ctx, -24, H - 18, 48, 30, 14);
  ctx.fill();
  ctx.stroke();
  if (open > 0.05) {
    // pink mouth between the jaws
    ctx.fillStyle = '#ff7aa8';
    ctx.strokeStyle = '#c2185b';
    ctx.lineWidth = 3;
    const ms = spread + 0.12;
    ctx.beginPath();
    ctx.moveTo(0, H - 4);
    ctx.lineTo(-Math.sin(ms) * jawLen, H + Math.cos(ms) * jawLen);
    ctx.quadraticCurveTo(0, H + jawLen * 1.15, Math.sin(ms) * jawLen, H + Math.cos(ms) * jawLen);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // the cup shows in its mouth
    ctx.fillStyle = '#0d2e18';
    ctx.beginPath();
    ctx.arc(0, 0, CUP_R, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const side of [-1, 1]) {
    const a = side * spread;
    ctx.save();
    ctx.translate(0, H);
    ctx.rotate(-a);
    // jaw
    ctx.fillStyle = C.gator;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    const half = open > 0.05 ? 8 : 22;
    roundRect(ctx, -half, -4, half * 2, jawLen + 4, half);
    ctx.fill();
    ctx.stroke();
    // teeth on the inner edge
    if (open > 0.05) {
      ctx.fillStyle = C.white;
      for (let k = 10; k < jawLen; k += 9) {
        const ex = -side * half;
        ctx.beginPath();
        ctx.moveTo(ex, k);
        ctx.lineTo(ex - side * 8, k + 4);
        ctx.lineTo(ex, k + 8);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
    if (open <= 0.05) break; // closed: one snout
  }
  if (open <= 0.05) {
    // closed teeth peeking out along the snout
    ctx.fillStyle = C.white;
    for (let k = H + 12; k < H + jawLen - 4; k += 10) {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * 21, k);
        ctx.lineTo(side * 26, k + 4);
        ctx.lineTo(side * 21, k + 8);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.fillStyle = C.gatorDark;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * 6, H + jawLen - 4, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // eyes on top of the head
  for (const side of [-1, 1]) {
    ctx.fillStyle = C.gator;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(side * 13, H - 6, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.sun;
    ctx.beginPath();
    ctx.arc(side * 13, H - 5, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.ink;
    ctx.fillRect(side * 13 - 1.2, H - 9.5, 2.4, 9);
  }
  ctx.restore();
}

function drawFlag(ctx, hole, t) {
  const [cx, cy] = hole.cup;
  ctx.strokeStyle = C.white;
  ctx.lineCap = 'round';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(cx + 2, cy);
  ctx.lineTo(cx + 2, cy - 58);
  ctx.stroke();
  const wave = Math.sin(t * 4) * 4;
  ctx.fillStyle = C.pink;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + 3, cy - 58);
  ctx.quadraticCurveTo(cx + 18, cy - 56 + wave, cx + 32, cy - 50 + wave);
  ctx.quadraticCurveTo(cx + 18, cy - 44 - wave, cx + 3, cy - 40);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawBall(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(0,40,10,0.35)';
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 3, r, r * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.white;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(180,180,210,0.6)';
  ctx.beginPath();
  ctx.arc(x + r * 0.25, y + r * 0.3, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.arc(x - r * 0.1, y - r * 0.1, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
}

// The moving parts of a hole and the ball, plus the aim line. aim = { angle, power } or null.
export function drawHoleLive(ctx, game, view, aim, time) {
  const { hole, t, ball } = game;
  ctx.save();
  ctx.translate(view.ox, view.oy);
  ctx.scale(view.s, view.s);

  // bumpers, flashing when hit
  hole.bumpers.forEach(([x, y, r], i) => {
    const since = t - game.flash[i];
    const pop = since < 0.25 ? 1 + 0.18 * (1 - since / 0.25) : 1;
    const rr = r * pop;
    ctx.fillStyle = 'rgba(0,50,20,0.35)';
    ctx.beginPath();
    ctx.arc(x + 2, y + 4, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = since < 0.25 ? C.white : C.pink;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.sun;
    ctx.beginPath();
    ctx.arc(x, y, rr * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.orange;
    ctx.beginPath();
    ctx.arc(x, y, rr * 0.28, 0, Math.PI * 2);
    ctx.fill();
  });

  // ball under the gator's jaws when in its mouth, otherwise above things on the felt
  const sunk = game.status === 'sunk';
  const splash = game.status === 'splash';
  if (!hole.gator && !sunk) drawFlag(ctx, hole, time);

  if (splash && game.splashAt) {
    const k = game.statusT / 0.9;
    ctx.strokeStyle = `rgba(255,255,255,${1 - k})`;
    ctx.lineWidth = 3;
    for (const m of [1, 0.6]) {
      ctx.beginPath();
      ctx.arc(game.splashAt.x, game.splashAt.y, (8 + k * 36) * m, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (k < 0.3) drawBall(ctx, game.splashAt.x, game.splashAt.y, BALL_R * (1 - k / 0.3));
  } else if (sunk) {
    const k = Math.min(1, game.statusT / 0.3);
    if (k < 1) drawBall(ctx, ball.x, ball.y, BALL_R * (1 - k * 0.6));
  } else {
    drawBall(ctx, ball.x, ball.y, BALL_R);
  }

  if (hole.gator) drawGator(ctx, hole.gator, hole.cup, t, hole);
  for (const f of hole.flamingos) (f.kind === 'walk' ? drawWalker : drawSweeper)(ctx, f, t);

  // ready: a gentle ring says "your turn"
  if (game.status === 'ready' && !aim) {
    const p = (time * 1.2) % 1;
    ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - p)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R + 4 + p * 18, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (aim) {
    const col = aim.power < 0.4 ? C.white : aim.power < 0.75 ? C.sun : C.pink;
    const len = 30 + aim.power * 190;
    const dx = Math.cos(aim.angle);
    const dy = Math.sin(aim.angle);
    // dotted line
    for (let d = BALL_R + 10; d < len; d += 15) {
      const r = 4.5 - (d / len) * 1.5;
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.arc(ball.x + dx * d, ball.y + dy * d, r + 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(ball.x + dx * d, ball.y + dy * d, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // arrow head
    const hx = ball.x + dx * (len + 6);
    const hy = ball.y + dy * (len + 6);
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(aim.angle);
    ctx.fillStyle = col;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-6, -10);
    ctx.lineTo(-6, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // power ring around the ball
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(22,11,51,0.5)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R + 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R + 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * aim.power);
    ctx.stroke();
  }
  ctx.restore();
}

// A short burst of confetti, deterministic from time.
export function drawConfetti(ctx, w, h, time) {
  const colours = [C.pink, C.sun, C.foam, C.white, C.orange, '#b46bff'];
  for (let i = 0; i < 70; i++) {
    const speed = 90 + ((i * 53) % 80);
    const x = (((i * 97.3) % 1) * 0 + ((i * 0.137) % 1)) * w + Math.sin(time * 2 + i) * 20;
    const y = ((time * speed + i * 41) % (h + 40)) - 20;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(time * 3 + i);
    ctx.fillStyle = colours[i % colours.length];
    ctx.fillRect(-5, -3, 10, 6);
    ctx.restore();
  }
}

// Launcher tile: a flamingo watching a ball roll into the cup, over and over.
export function drawTile(ctx, x, y, w, h, time) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, C.dusk);
  sky.addColorStop(0.5, C.pink);
  sky.addColorStop(1, C.orange);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  // the green
  const gx = x + w * 0.08;
  const gy = y + h * 0.3;
  const gw = w * 0.84;
  const gh = h * 0.62;
  ctx.fillStyle = C.rim;
  roundRect(ctx, gx - 6, gy - 6, gw + 12, gh + 12, 18);
  ctx.fill();
  ctx.fillStyle = C.felt;
  roundRect(ctx, gx, gy, gw, gh, 14);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = C.hotPink;
  ctx.stroke();
  // cup and flag
  const hx = gx + gw * 0.72;
  const hy = gy + gh * 0.3;
  ctx.fillStyle = '#0d2e18';
  ctx.beginPath();
  ctx.ellipse(hx, hy, w * 0.045, w * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.white;
  ctx.lineWidth = Math.max(2, w * 0.012);
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(hx, hy - h * 0.3);
  ctx.stroke();
  ctx.fillStyle = C.sun;
  const wave = Math.sin(time * 4) * h * 0.01;
  ctx.beginPath();
  ctx.moveTo(hx, hy - h * 0.3);
  ctx.lineTo(hx + w * 0.16, hy - h * 0.26 + wave);
  ctx.lineTo(hx, hy - h * 0.21);
  ctx.closePath();
  ctx.fill();
  // the ball rolls in, waits, and starts again
  const cyc = time % 3;
  const k = Math.min(1, cyc / 1.6);
  const e = 1 - (1 - k) ** 3;
  const sx = gx + gw * 0.3;
  const sy = gy + gh * 0.85;
  const bx = sx + (hx - sx) * e;
  const by = sy + (hy - sy) * e;
  if (cyc < 1.7) {
    const r = w * 0.035 * (cyc > 1.55 ? 0.6 : 1);
    ctx.fillStyle = C.white;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // flamingo, dancing when it drops
  drawFlamingo(ctx, x + w * 0.27, y + h * 0.88, w / 150, time, { dance: cyc > 1.6 });
  if (cyc > 1.6) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const d = (cyc - 1.6) * w * 0.25;
      ctx.fillStyle = [C.sun, C.foam, C.white][i % 3];
      ctx.fillRect(hx + Math.cos(a) * d - 3, hy + Math.sin(a) * d - 3, 6, 6);
    }
  }
  ctx.restore();
}
