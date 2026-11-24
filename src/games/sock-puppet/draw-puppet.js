// Drawing a puppet: the sock on its arm, its parts in the right layers, the mouth that opens
// (the top of the head lifts, like fingers over a thumb), eyes that look and blink, googly
// pupils that swing, and arms that wave. Reads puppets and never changes them.
//
// The sock body (felt, pattern, knit, toe seam, cuff) is drawn once into an offscreen canvas
// per look and size; each frame draws it twice (bottom jaw, then the lifted top) through a clip
// along the mouth, then the parts on top. Everything is in puppet units under the caller's
// transform.
import { C, FELT, RAINBOW, TAU, felt, shade, mix, lightness, makeCanvas, smoothPath, fillInk, stitches, ellipse, circle, roundRect, font } from './art.js';
import { SHAPES, bodyOutline, drawOrder, onTopJaw, halfWidthAt } from './puppet.js';
import { partDef } from './parts.js';
import { FACE_DRAW } from './parts-face.js';
import { WEAR_DRAW } from './parts-wear.js';

const DRAW = { ...FACE_DRAW, ...WEAR_DRAW };
export const LINE = 6; // the sock's outline width in units
const BODY_X0 = -210;
const BODY_X1 = 210;
const BODY_Y0 = -250;

// ---------------------------------------------------------------------------------------------
// The body, cached
// ---------------------------------------------------------------------------------------------

const bodyCache = new Map(); // key -> canvas
const CACHE_MAX = 24;

export function bodyKey(sock, k) {
  return `${sock.shape}|${sock.colour}|${sock.pattern}|${sock.pcolour}|${Math.round(k * 20)}`;
}

function bodyY1(sh) {
  return sh.cuffBottom + 12;
}

// The sock body as an image: { canvas, x0, y0, k } with k device pixels per unit.
export function bodyImage(sock, k) {
  const key = bodyKey(sock, k);
  let hit = bodyCache.get(key);
  if (hit) {
    bodyCache.delete(key);
    bodyCache.set(key, hit);
    return hit;
  }
  const sh = SHAPES[sock.shape] || SHAPES.long;
  const w = (BODY_X1 - BODY_X0) * k;
  const h = (bodyY1(sh) - BODY_Y0) * k;
  const canvas = makeCanvas(w, h);
  const g = canvas.getContext('2d');
  g.setTransform(k, 0, 0, k, -BODY_X0 * k, -BODY_Y0 * k);
  renderBody(g, sock);
  hit = { canvas, x0: BODY_X0, y0: BODY_Y0, w: BODY_X1 - BODY_X0, h: bodyY1(sh) - BODY_Y0, k };
  bodyCache.set(key, hit);
  if (bodyCache.size > CACHE_MAX) bodyCache.delete(bodyCache.keys().next().value);
  return hit;
}

function tracePoly(g, pts) {
  smoothPath(g, pts, true);
}

// The sock (without the cuff) as a smooth path.
function bodyPath(g, shape) {
  const pts = bodyOutline(shape);
  // flatten the bottom: the outline ends at the cuff
  tracePoly(g, pts);
}

export function renderBody(g, sock) {
  const sh = SHAPES[sock.shape] || SHAPES.long;
  const base = felt(sock.colour);
  const pc = felt(sock.pcolour === sock.colour ? sock.colour + 3 : sock.pcolour);
  const top = sh.half[0][1];
  const maxW = sh.half.reduce((m, [x]) => Math.max(m, x), 0);

  // the tube
  g.save();
  bodyPath(g, sock.shape);
  g.fillStyle = base;
  g.fill();
  g.clip();
  drawPattern(g, sock, sh, base, pc, top, maxW);
  // knitted look: rows of little v stitches
  g.strokeStyle = lightness(base) > 0.6 ? 'rgba(80,50,40,0.10)' : 'rgba(0,0,0,0.13)';
  g.lineWidth = 1.6;
  g.beginPath();
  for (let y = top + 6, row = 0; y < sh.cuffTop; y += 13, row++) {
    for (let x = -maxW + (row % 2) * 6; x < maxW; x += 12) {
      g.moveTo(x - 3, y - 3);
      g.lineTo(x, y + 2);
      g.lineTo(x + 3, y - 3);
    }
  }
  g.stroke();
  // round it: darker at the sides, a soft shine on the left
  const grad = g.createLinearGradient(-maxW, 0, maxW, 0);
  grad.addColorStop(0, 'rgba(30,10,40,0.30)');
  grad.addColorStop(0.18, 'rgba(30,10,40,0.06)');
  grad.addColorStop(0.36, 'rgba(255,255,255,0.14)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0)');
  grad.addColorStop(0.82, 'rgba(30,10,40,0.08)');
  grad.addColorStop(1, 'rgba(30,10,40,0.34)');
  g.fillStyle = grad;
  g.fillRect(-maxW - 10, top - 10, maxW * 2 + 20, sh.cuffTop - top + 20);
  // the top of the head is a little lighter (the toe, stretched over the fingers)
  const tg = g.createRadialGradient(-maxW * 0.3, top + 60, 10, -maxW * 0.2, top + 80, maxW * 1.2);
  tg.addColorStop(0, 'rgba(255,255,255,0.20)');
  tg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = tg;
  g.fillRect(-maxW - 10, top - 10, maxW * 2 + 20, 260);
  // the toe seam, stitched across the top
  const seamY = sh.toeY;
  const hw = maxW * 0.82;
  g.beginPath();
  g.moveTo(-hw, seamY + 14);
  g.quadraticCurveTo(0, seamY - 22, hw, seamY + 14);
  g.lineWidth = 3;
  g.strokeStyle = 'rgba(30,10,40,0.22)';
  g.stroke();
  stitches(g, lightness(sock.pattern === 'patches' ? pc : base) > 0.7 ? 'rgba(60,40,60,0.45)' : 'rgba(255,255,255,0.7)', 2.6, 6);
  // the fold where the thumb pushes in, under the mouth
  g.beginPath();
  g.moveTo(-maxW * 0.5, sh.mouthY + 54);
  g.quadraticCurveTo(0, sh.mouthY + 74, maxW * 0.5, sh.mouthY + 54);
  g.lineWidth = 3;
  g.strokeStyle = 'rgba(30,10,40,0.10)';
  g.stroke();
  g.restore();
  // outline
  bodyPath(g, sock.shape);
  g.lineWidth = LINE;
  g.lineJoin = 'round';
  g.strokeStyle = C.ink;
  g.stroke();

  // the ribbed cuff
  const cw = sh.cuffW;
  const cuffC = sock.pattern === 'plain' ? shade(base, -0.12) : sock.pattern === 'rainbow' ? felt(sock.pcolour) : pc;
  g.save();
  roundRect(g, -cw, sh.cuffTop - 6, cw * 2, sh.cuffBottom - sh.cuffTop + 6, 16);
  g.fillStyle = cuffC;
  g.fill();
  g.clip();
  g.strokeStyle = 'rgba(30,10,40,0.22)';
  g.lineWidth = 3;
  g.beginPath();
  for (let x = -cw + 12; x < cw; x += 15) {
    g.moveTo(x, sh.cuffTop);
    g.lineTo(x, sh.cuffBottom);
  }
  g.stroke();
  if (sock.pattern !== 'plain') {
    // a band of the sock colour round the cuff
    g.fillStyle = sock.pattern === 'rainbow' ? RAINBOW[4] : base;
    g.fillRect(-cw, sh.cuffTop + (sh.cuffBottom - sh.cuffTop) * 0.36, cw * 2, 12);
  }
  const cg = g.createLinearGradient(-cw, 0, cw, 0);
  cg.addColorStop(0, 'rgba(30,10,40,0.3)');
  cg.addColorStop(0.35, 'rgba(255,255,255,0.12)');
  cg.addColorStop(1, 'rgba(30,10,40,0.3)');
  g.fillStyle = cg;
  g.fillRect(-cw, sh.cuffTop - 6, cw * 2, sh.cuffBottom - sh.cuffTop + 6);
  g.restore();
  roundRect(g, -cw, sh.cuffTop - 6, cw * 2, sh.cuffBottom - sh.cuffTop + 6, 16);
  g.lineWidth = LINE;
  g.strokeStyle = C.ink;
  g.stroke();
}

function drawPattern(g, sock, sh, base, pc, top, maxW) {
  const y1 = sh.cuffTop + 10;
  const sag = (x) => x * x * 0.0012; // bands curve round the tube
  if (sock.pattern === 'stripes') {
    g.fillStyle = pc;
    for (let y = top + 40; y < y1; y += 72) {
      g.beginPath();
      g.moveTo(-maxW - 4, y + sag(maxW));
      for (let x = -maxW; x <= maxW; x += 20) g.lineTo(x, y + sag(x));
      for (let x = maxW; x >= -maxW; x -= 20) g.lineTo(x, y + 34 + sag(x));
      g.closePath();
      g.fill();
    }
  } else if (sock.pattern === 'dots') {
    g.fillStyle = pc;
    for (let y = top + 20, row = 0; y < y1; y += 50, row++) {
      for (let x = -maxW + (row % 2 ? 26 : 0); x <= maxW + 26; x += 52) {
        circle(g, x, y, 11.5);
        g.fill();
      }
    }
  } else if (sock.pattern === 'argyle') {
    const dw = 62;
    const dh = 92;
    const alt = mix(base, pc, 0.45);
    for (let y = top, row = 0; y < y1 + dh; y += dh / 2, row++) {
      for (let x = -maxW - dw + (row % 2 ? dw / 2 : 0); x <= maxW + dw; x += dw) {
        g.fillStyle = (row + Math.round(x / dw)) % 2 ? pc : alt;
        g.beginPath();
        g.moveTo(x, y - dh / 2);
        g.lineTo(x + dw / 2, y);
        g.lineTo(x, y + dh / 2);
        g.lineTo(x - dw / 2, y);
        g.closePath();
        g.fill();
      }
    }
    // the thin crossing lines
    g.strokeStyle = lightness(base) > 0.75 ? '#7a5a8a' : '#fff6e4';
    g.lineWidth = 2.2;
    g.beginPath();
    for (let x = -maxW * 3; x <= maxW * 3; x += dw) {
      g.moveTo(x, top);
      g.lineTo(x + ((y1 - top) * dw) / dh, y1);
      g.moveTo(x, top);
      g.lineTo(x - ((y1 - top) * dw) / dh, y1);
    }
    g.stroke();
  } else if (sock.pattern === 'zigzag') {
    g.strokeStyle = pc;
    g.lineWidth = 15;
    g.lineJoin = 'miter';
    for (let y = top + 50; y < y1; y += 66) {
      g.beginPath();
      for (let x = -maxW - 20, k = 0; x <= maxW + 30; x += 26, k++) {
        const yy = y + (k % 2 ? 16 : -16) + sag(x);
        if (k) g.lineTo(x, yy);
        else g.moveTo(x, yy);
      }
      g.stroke();
    }
  } else if (sock.pattern === 'rainbow') {
    const band = 44;
    for (let y = top - 10, k = 0; y < y1; y += band, k++) {
      g.fillStyle = RAINBOW[k % RAINBOW.length];
      g.beginPath();
      g.moveTo(-maxW - 4, y + sag(maxW));
      for (let x = -maxW; x <= maxW; x += 20) g.lineTo(x, y + sag(x));
      for (let x = maxW; x >= -maxW; x -= 20) g.lineTo(x, y + band + 1 + sag(x));
      g.closePath();
      g.fill();
    }
  } else if (sock.pattern === 'patches') {
    // toe cap over the top of the head and a heel patch round the side
    g.fillStyle = pc;
    g.beginPath();
    g.moveTo(-maxW - 10, sh.toeY + 14);
    g.quadraticCurveTo(0, sh.toeY - 22, maxW + 10, sh.toeY + 14);
    g.lineTo(maxW + 10, top - 20);
    g.lineTo(-maxW - 10, top - 20);
    g.closePath();
    g.fill();
    // the heel, round the back of the wrist
    const hy = sh.cuffTop - 70;
    const hx = halfWidthAt(sock.shape, hy);
    ellipse(g, hx + 6, hy, 70, 62);
    g.fill();
    ellipse(g, hx + 6, hy, 56, 48);
    stitches(g, 'rgba(255,255,255,0.65)', 2.4, 6);
  }
}

// ---------------------------------------------------------------------------------------------
// The mouth
// ---------------------------------------------------------------------------------------------

export function mouthGeom(p) {
  const sh = SHAPES[p.sock.shape] || SHAPES.long;
  // the crease reaches right across the face
  return { y: sh.mouthY, hw: halfWidthAt(p.sock.shape, sh.mouthY - 8) - 3, sag: 26 };
}

function mouthCurve(g, m, dy, reverse) {
  if (!reverse) {
    g.moveTo(-m.hw, m.y + dy - 8);
    g.quadraticCurveTo(0, m.y + dy + m.sag * 2 - 8, m.hw, m.y + dy - 8);
  } else {
    g.lineTo(m.hw, m.y + dy - 8);
    g.quadraticCurveTo(0, m.y + dy + m.sag * 2 - 8, -m.hw, m.y + dy - 8);
  }
}

// ---------------------------------------------------------------------------------------------
// The whole puppet
// ---------------------------------------------------------------------------------------------

// a: {
//   t          seconds (blinks, googly wobble, waving)
//   k          device pixels per unit (picks the body image's resolution)
//   mouth      0 shut .. 1 wide open
//   look       { x, y } a puppet point the eyes look at, or null to look ahead
//   blink      0..1 (1 = shut)
//   mood       'normal' | 'happy' | 'surprised' | 'sleep' | 'worried'
//   wave       0..1 how much the arms wave
//   googly     Map(part index -> { x, y }) googly pupil swing, -1..1
//   armTo      how far down the arm is drawn (units), default 1100
//   skip       a part index not to draw (it is being dragged and drawn elsewhere)
// }
export function drawPuppet(ctx, p, a = {}) {
  const t = a.t || 0;
  const k = a.k || 2;
  const sh = SHAPES[p.sock.shape] || SHAPES.long;
  const m = mouthGeom(p);
  const open = Math.max(0, Math.min(1.2, a.mouth || 0));
  const lift = open * 30; // the top of the head rises this much...
  const gape = open * 86; // ...and the mouth opens this much in the middle (corners stay put)
  const { back, front } = drawOrder(p);
  const img = bodyImage(p.sock, k);
  const topJaw = (q) => onTopJaw(p, q);

  const jaw = (fn) => {
    ctx.save();
    ctx.translate(0, m.y);
    ctx.scale(1 + open * 0.025, 1 - open * 0.015);
    ctx.translate(0, -m.y - lift);
    fn();
    ctx.restore();
  };

  // 1. parts behind the sock
  for (const i of back) {
    if (i === a.skip) continue;
    const q = p.parts[i];
    if (topJaw(q)) jaw(() => drawPartOn(ctx, p, i, a));
    else drawPartOn(ctx, p, i, a);
  }

  // 2. the arm inside the sock, and a sleeve further down
  drawArm(ctx, sh, a.armTo ?? 1100);

  // 3. the sock
  ctx.drawImage(img.canvas, img.x0, img.y0, img.w, img.h);
  const lens = () => {
    ctx.beginPath();
    ctx.moveTo(-m.hw, m.y - 8);
    ctx.quadraticCurveTo(0, m.y - 8 + m.sag * 2 - gape * 2, m.hw, m.y - 8);
    ctx.quadraticCurveTo(0, m.y - 8 + m.sag * 2, -m.hw, m.y - 8);
    ctx.closePath();
  };
  if (open > 0.02) {
    // the top of the head, lifted
    jaw(() => {
      ctx.save();
      ctx.beginPath();
      mouthCurve(ctx, m, 0, false);
      ctx.lineTo(400, -2000);
      ctx.lineTo(-400, -2000);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img.canvas, img.x0, img.y0, img.w, img.h);
      ctx.restore();
    });
    // inside the mouth: dark, with a tongue
    ctx.save();
    lens();
    ctx.fillStyle = C.mouth;
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = C.tongue;
    ellipse(ctx, 0, m.y + m.sag - 6, m.hw * 0.46, 16 + gape * 0.3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,20,50,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, m.y + m.sag - 10 - gape * 0.2);
    ctx.lineTo(0, m.y + m.sag + 2);
    ctx.stroke();
    ctx.restore();
    lens();
    ctx.lineWidth = LINE * 1.1;
    ctx.strokeStyle = C.ink;
    ctx.lineJoin = 'round';
    ctx.stroke();
  } else {
    // a shut mouth: the crease, with little dimples at the corners
    ctx.beginPath();
    mouthCurve(ctx, m, 0, false);
    ctx.lineWidth = LINE * 1.15;
    ctx.strokeStyle = C.ink;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.lineWidth = 4;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * (m.hw - 12), m.y - 22);
      ctx.quadraticCurveTo(s * (m.hw + 1), m.y - 12, s * (m.hw - 8), m.y + 2);
      ctx.stroke();
    }
  }

  // 4. parts on the bottom jaw, then the top
  for (const i of front) if (i !== a.skip && !topJaw(p.parts[i])) drawPartOn(ctx, p, i, a);
  jaw(() => {
    for (const i of front) if (i !== a.skip && topJaw(p.parts[i])) drawPartOn(ctx, p, i, a);
  });
}

function drawArm(ctx, sh, armTo) {
  const y0 = sh.cuffBottom - 8;
  if (armTo <= y0) return;
  const w = sh.armW;
  const grad = ctx.createLinearGradient(-w, 0, w, 0);
  grad.addColorStop(0, C.skinDark);
  grad.addColorStop(0.35, C.skin);
  grad.addColorStop(1, C.skinDark);
  ctx.beginPath();
  ctx.moveTo(-w, y0);
  ctx.lineTo(w, y0);
  ctx.lineTo(w * 1.06, armTo);
  ctx.lineTo(-w * 1.06, armTo);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = LINE;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  // a striped sleeve further down the arm
  const sy = y0 + 210;
  if (armTo > sy) {
    ctx.beginPath();
    ctx.moveTo(-w * 1.5, sy);
    ctx.quadraticCurveTo(0, sy - 16, w * 1.5, sy);
    ctx.lineTo(w * 1.7, armTo);
    ctx.lineTo(-w * 1.7, armTo);
    ctx.closePath();
    ctx.fillStyle = '#3fb4e8';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    for (let y = sy + 14; y < armTo; y += 44) ctx.fillRect(-w * 2, y, w * 4, 18);
    ctx.restore();
    ctx.stroke();
  }
}

// Draws part i where it sits on puppet p.
export function drawPartOn(ctx, p, i, a = {}) {
  const q = p.parts[i];
  const def = partDef(q.id);
  if (!def) return;
  const mirror = def.pair && q.x < 0;
  ctx.save();
  ctx.translate(q.x, q.y);
  ctx.rotate(q.r);
  ctx.scale(mirror ? -q.s : q.s, q.s);
  // waving arms swing about their shoulder (the box's inner edge)
  if (def.drawer === 'arms' && a.wave) {
    const sw = Math.sin((a.t || 0) * 9 + (mirror ? 1.3 : 0)) * 0.4 * a.wave - 0.3 * a.wave;
    ctx.translate(-def.w / 2, 0);
    ctx.rotate(sw);
    ctx.translate(def.w / 2, 0);
  }
  let look = null;
  if (def.eye && a.look) {
    const dx = a.look.x - q.x;
    const dy = a.look.y - q.y;
    const c = Math.cos(-q.r);
    const s = Math.sin(-q.r);
    let lx = dx * c - dy * s;
    const ly = dx * s + dy * c;
    if (mirror) lx = -lx;
    const d = Math.hypot(lx, ly);
    const kk = Math.min(1, d / 140) / (d || 1);
    look = { x: lx * kk, y: ly * kk };
  }
  const o = {
    t: a.t || 0,
    tint: q.c >= 0 ? FELT[q.c % FELT.length] : null,
    look: look || { x: 0, y: 0 },
    blink: a.blink || 0,
    mood: a.mood || 'normal',
    jiggle: (a.googly && a.googly.get(i)) || { x: 0, y: 0.6 },
    side: mirror ? -1 : 1,
    seed: i,
    w: def.w,
    h: def.h,
  };
  drawPartPicture(ctx, def, o);
  ctx.restore();
}

// A part's picture centred on (0, 0) at scale 1. Missing pictures show as a labelled box.
export function drawPartPicture(ctx, def, o) {
  const fn = DRAW[def.id];
  if (fn) {
    try {
      fn(ctx, o);
      return;
    } catch {
      // fall through to the box
    }
  }
  roundRect(ctx, -def.w / 2, -def.h / 2, def.w, def.h, 12);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fill();
  ctx.setLineDash([8, 6]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = C.ink;
  ctx.font = font(14, 700);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(def.id, 0, 0);
}

// A part on its own, fitted into a box of `size` px centred on (cx, cy) (drawer tiles, ghosts).
export function drawPartIcon(ctx, id, cx, cy, size, t = 0, c = null) {
  const def = partDef(id);
  if (!def) return;
  const s = size / Math.max(def.w, def.h);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  drawPartPicture(ctx, def, {
    t, tint: def.tint === null ? null : FELT[(c ?? def.tint) % FELT.length], look: { x: 0, y: 0 }, blink: 0, mood: 'normal',
    jiggle: { x: 0, y: 0.6 }, side: 1, seed: 0, w: def.w, h: def.h,
  });
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Googly pupils: a pendulum each, swung by how the part (or the whole puppet) moves
// ---------------------------------------------------------------------------------------------

export function stepGoogly(st, dt, ax, ay) {
  // st: { x, y, vx, vy } in -1..1; gravity pulls down, the puppet's acceleration flings
  const k = 38;
  const damp = 3.2;
  st.vx += (-st.x * k * 0.25 - st.vx * damp - ax) * dt;
  st.vy += ((0.6 - st.y) * k * 0.4 - st.vy * damp - ay) * dt;
  st.x += st.vx * dt;
  st.y += st.vy * dt;
  const d = Math.hypot(st.x, st.y);
  if (d > 1) {
    st.x /= d;
    st.y /= d;
    // bounce off the rim
    const dot = st.vx * st.x + st.vy * st.y;
    if (dot > 0) {
      st.vx -= 1.6 * dot * st.x;
      st.vy -= 1.6 * dot * st.y;
    }
  }
  return st;
}

export { TAU };
