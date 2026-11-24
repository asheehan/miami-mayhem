// Memory Beach drawing. Reads the game and never changes rules. Card faces and backs are
// rendered once into offscreen canvases and reused; a turning card is drawn in thin upright
// strips, each scaled for its depth, so it really looks like it swings round in 3D.
import { drawPicture, shade } from './pictures.js';
import { cardRect, FLIP_TIME } from './logic.js';

export const C = {
  night: '#2b1055',
  dusk: '#7a1fa2',
  pink: '#ff3d9a',
  orange: '#ff8a4c',
  sun: '#ffe14d',
  sea: '#19c3d6',
  seaDeep: '#0b8fb0',
  foam: '#c9fbff',
  sand: '#f6d892',
  sandMid: '#ecc677',
  sandDark: '#c99a52',
  ink: '#160b33',
  white: '#ffffff',
  card: '#fffaf0',
  gold: '#ffc93a',
  p1: '#19c3d6', // the bottom player (teal)
  p2: '#ff3d9a', // the top player (pink)
};

export const font = (px, weight = 900) => `${weight} ${Math.round(px)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
const TAU = Math.PI * 2;
const dprNow = () => Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ease = (k) => k * k * (3 - 2 * k);

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
  ctx.strokeStyle = filled ? C.ink : 'rgba(255,255,255,0.6)';
  ctx.stroke();
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

// ---------------------------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------------------------

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
  } else if (kind === 'album') {
    // an open book of stickers
    ctx.lineWidth = s * 0.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.6);
    ctx.quadraticCurveTo(cx - s * 0.5, cy - s * 0.85, cx - s * 1.05, cy - s * 0.6);
    ctx.lineTo(cx - s * 1.05, cy + s * 0.75);
    ctx.quadraticCurveTo(cx - s * 0.5, cy + s * 0.5, cx, cy + s * 0.75);
    ctx.quadraticCurveTo(cx + s * 0.5, cy + s * 0.5, cx + s * 1.05, cy + s * 0.75);
    ctx.lineTo(cx + s * 1.05, cy - s * 0.6);
    ctx.quadraticCurveTo(cx + s * 0.5, cy - s * 0.85, cx, cy - s * 0.6);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.6);
    ctx.lineTo(cx, cy + s * 0.75);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - s * 0.52, cy + s * 0.02, s * 0.26, 0, TAU);
    ctx.arc(cx + s * 0.52, cy + s * 0.02, s * 0.26, 0, TAU);
    ctx.fill();
  } else if (kind === 'two') {
    // two little people
    for (const [dx, sc] of [[-0.5, 0.9], [0.5, 1]]) {
      ctx.beginPath();
      ctx.arc(cx + dx * s, cy - s * 0.45 * sc, s * 0.32 * sc, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + dx * s, cy + s * 0.65, s * 0.55 * sc, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
    }
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
  const label = b.label || '';
  const px = b.h * 0.42;
  ctx.font = font(px);
  let tw = label ? ctx.measureText(label).width : 0;
  const room = b.w * (hasIcon ? 0.62 : 0.86);
  if (tw > room) {
    ctx.font = font((px * room) / tw);
    tw = room;
  }
  const gw = hasIcon ? b.h * 0.55 : 0;
  const cx = b.x + b.w / 2 + (label ? gw / 2 : 0);
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (label) ctx.fillText(label, cx, b.y + b.h / 2 + 1);
  if (hasIcon) glyph(ctx, b.glyph, label ? cx - tw / 2 - gw * 0.7 : b.x + b.w / 2, b.y + b.h / 2, b.h * 0.22, C.ink);
}

export function drawIconButton(ctx, b) {
  ctx.fillStyle = 'rgba(22,11,51,0.32)';
  roundRect(ctx, b.x, b.y, b.w, b.h, b.w * 0.24);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.stroke();
  glyph(ctx, b.icon, b.x + b.w / 2, b.y + b.h / 2, b.w * 0.3, C.white);
}

// A little grid picture: cols x rows squares (the size buttons).
export function drawGridIcon(ctx, cx, cy, h, cols, rows, colour = C.ink) {
  const cell = Math.min(h / rows, (h * 1.1) / cols);
  const g = cell * 0.18;
  const w = cols * cell;
  const hh = rows * cell;
  ctx.fillStyle = colour;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      roundRect(ctx, cx - w / 2 + c * cell + g / 2, cy - hh / 2 + r * cell + g / 2, cell - g, cell - g, cell * 0.2);
      ctx.fill();
    }
  }
}

// ---------------------------------------------------------------------------------------------
// The beach
// ---------------------------------------------------------------------------------------------

let sandCache = null;
// Sand with a strip of sea along the top: drawn once per screen size.
export function drawBeach(ctx, w, h, time, seaH = 0) {
  const dpr = dprNow();
  const key = `${w}|${h}|${dpr}|${Math.round(seaH)}`;
  if (!sandCache || sandCache.key !== key) {
    const c = makeCanvas(w * dpr, h * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#f9e3a8');
    grad.addColorStop(1, C.sandMid);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    // grains and little shells
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < (w * h) / 900; i++) {
      g.fillStyle = rnd() < 0.5 ? 'rgba(201,154,82,0.35)' : 'rgba(255,255,255,0.4)';
      g.fillRect(rnd() * w, rnd() * h, 2, 2);
    }
    for (let i = 0; i < 9; i++) {
      const x = rnd() * w;
      const y = seaH + 20 + rnd() * (h - seaH - 20);
      g.fillStyle = ['#ffb3c7', '#fff1d6', '#ffd0b0'][i % 3];
      g.strokeStyle = 'rgba(22,11,51,0.35)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(x, y, 5 + rnd() * 3, Math.PI, 0);
      g.closePath();
      g.fill();
      g.stroke();
    }
    sandCache = { key, c };
  }
  ctx.drawImage(sandCache.c, 0, 0, w, h);
  if (seaH > 0) {
    const g = ctx.createLinearGradient(0, 0, 0, seaH);
    g.addColorStop(0, C.seaDeep);
    g.addColorStop(1, C.sea);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);
    for (let x = w; x >= -10; x -= 10) ctx.lineTo(x, seaH + Math.sin(x / 50 + time * 1.4) * 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let x = -10; x <= w + 10; x += 10) ctx.lineTo(x, seaH + Math.sin(x / 50 + time * 1.4) * 5);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------------------------

const cards = new Map();
let flipScratch = null;
function remember(key, c) {
  cards.set(key, c);
  if (cards.size > 220) cards.delete(cards.keys().next().value);
  return c;
}

// Face: a cream postcard with the picture big in the middle.
function faceCanvas(pic, colour, w, h, dpr) {
  const key = `f|${pic}|${colour}|${Math.round(w)}|${Math.round(h)}|${dpr}`;
  const hit = cards.get(key);
  if (hit) return hit;
  const c = makeCanvas(w * dpr, h * dpr);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  const r = w * 0.12;
  roundRect(g, 1.5, 1.5, w - 3, h - 3, r);
  g.fillStyle = C.card;
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = C.ink;
  g.stroke();
  roundRect(g, w * 0.07, w * 0.07, w - w * 0.14, h - w * 0.14, r * 0.6);
  g.lineWidth = Math.max(1.5, w * 0.02);
  g.strokeStyle = 'rgba(25,195,214,0.45)';
  g.setLineDash([w * 0.06, w * 0.04]);
  g.stroke();
  g.setLineDash([]);
  const size = Math.min(w * 0.86, h * 0.72);
  drawPicture(g, pic, w / 2, h / 2, size, colour);
  return remember(key, c);
}

// Back: a stripy beach towel with fringes and a sun in the middle. Every back is the same.
function backCanvas(w, h, dpr) {
  const key = `b|${Math.round(w)}|${Math.round(h)}|${dpr}`;
  const hit = cards.get(key);
  if (hit) return hit;
  const c = makeCanvas(w * dpr, h * dpr);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  const r = w * 0.12;
  const fr = Math.max(3, h * 0.05);
  // fringe
  g.strokeStyle = '#fff1d6';
  g.lineWidth = Math.max(1.2, w * 0.018);
  for (let x = r * 0.6; x < w - r * 0.6; x += Math.max(4, w * 0.06)) {
    g.beginPath();
    g.moveTo(x, 1);
    g.lineTo(x, fr + 2);
    g.moveTo(x, h - fr - 2);
    g.lineTo(x, h - 1);
    g.stroke();
  }
  roundRect(g, 1.5, fr, w - 3, h - fr * 2, r * 0.7);
  g.save();
  g.clip();
  const stripes = ['#ff3d9a', '#ff8a4c', '#ffe14d', '#19c3d6', '#ffffff'];
  const n = 9;
  for (let i = 0; i < n; i++) {
    g.fillStyle = stripes[i % stripes.length];
    g.fillRect(0, fr + ((h - fr * 2) * i) / n, w, (h - fr * 2) / n + 1);
  }
  g.restore();
  roundRect(g, 1.5, fr, w - 3, h - fr * 2, r * 0.7);
  g.lineWidth = 3;
  g.strokeStyle = C.ink;
  g.stroke();
  // the sun badge
  const sr = Math.min(w, h) * 0.2;
  g.beginPath();
  g.arc(w / 2, h / 2, sr * 1.45, 0, TAU);
  g.fillStyle = '#ffffff';
  g.fill();
  g.lineWidth = 2.5;
  g.strokeStyle = C.ink;
  g.stroke();
  g.fillStyle = '#ff9a1a';
  for (let i = 0; i < 10; i++) {
    const a = (i * TAU) / 10;
    g.beginPath();
    g.moveTo(w / 2 + Math.cos(a - 0.2) * sr * 0.9, h / 2 + Math.sin(a - 0.2) * sr * 0.9);
    g.lineTo(w / 2 + Math.cos(a) * sr * 1.32, h / 2 + Math.sin(a) * sr * 1.32);
    g.lineTo(w / 2 + Math.cos(a + 0.2) * sr * 0.9, h / 2 + Math.sin(a + 0.2) * sr * 0.9);
    g.fill();
  }
  g.beginPath();
  g.arc(w / 2, h / 2, sr * 0.85, 0, TAU);
  g.fillStyle = '#ffd21a';
  g.fill();
  g.lineWidth = 2;
  g.stroke();
  return remember(key, c);
}

// A card's two sides, ready to draw at w x h css px.
export function cardImages(card, w, h) {
  const dpr = dprNow();
  return { face: faceCanvas(card.pic, card.colour, w, h, dpr), back: backCanvas(w, h, dpr) };
}

// Draws a card turned k of the way over (0 = back up, 1 = face up), centred on (cx, cy).
// o: { lift (extra height 0..1), rot, scale, glow, dim }
export function drawCardAt(ctx, card, cx, cy, w, h, k, o = {}) {
  const { face, back } = cardImages(card, w, h);
  const swing = Math.sin(k * Math.PI); // 1 when edge-on
  const lift = Math.max(o.lift || 0, swing);
  const sc = (o.scale || 1) * (1 + lift * 0.1);
  // shadow on the sand, further away the higher the card is
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(o.rot || 0);
  ctx.fillStyle = `rgba(90,60,20,${0.28 - lift * 0.1})`;
  const sw = w * (0.35 + 0.65 * Math.abs(Math.cos(k * Math.PI))) * sc;
  roundRect(ctx, -sw / 2 + 3 + lift * w * 0.06, -h * sc / 2 + 5 + lift * h * 0.1, sw, h * sc, w * 0.12);
  ctx.fill();
  ctx.translate(0, -lift * h * 0.05);
  ctx.scale(sc, sc);
  if (o.glow) {
    ctx.shadowColor = o.glow;
    ctx.shadowBlur = 18;
  }
  const showFace = k > 0.5;
  const img = showFace ? face : back;
  const phi = showFace ? (1 - k) * Math.PI : k * Math.PI; // 0 flat .. pi/2 edge-on
  const cos = Math.cos(phi);
  if (phi < 0.02) {
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
  } else if (cos > 0.01) {
    // thin strips, each scaled for how near it is, drawn into a scratch canvas so the
    // turning-away shade only lands on the card itself
    const sin = Math.sin(phi);
    const F = w * 4;
    const dir = showFace ? -1 : 1;
    const N = 18;
    const X = (u) => (u * w * cos * F) / (F - dir * u * w * sin);
    const sx = img.width / w; // device px per css px
    const tw = Math.ceil(w * 1.3 * sx);
    const th = Math.ceil(h * 1.3 * sx);
    if (!flipScratch || flipScratch.width < tw || flipScratch.height < th) flipScratch = makeCanvas(Math.max(tw, flipScratch?.width || 0), Math.max(th, flipScratch?.height || 0));
    const g = flipScratch.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, tw, th);
    g.setTransform(sx, 0, 0, sx, tw / 2, th / 2);
    for (let i = 0; i < N; i++) {
      const u0 = -0.5 + i / N;
      const u1 = u0 + 1 / N;
      const um = (u0 + u1) / 2;
      const sc2 = F / (F - dir * um * w * sin);
      const x0 = X(u0);
      const x1 = X(u1);
      const hh = h * sc2;
      g.drawImage(img, (i / N) * img.width, 0, img.width / N + 0.5, img.height, x0, -hh / 2, x1 - x0 + 0.4, hh);
    }
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = `rgba(22,11,51,${0.25 * sin})`;
    g.fillRect(-w, -h, w * 2, h * 2);
    g.globalCompositeOperation = 'source-over';
    g.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(flipScratch, 0, 0, tw, th, (-tw / sx) / 2, (-th / sx) / 2, tw / sx, th / sx);
  }
  ctx.shadowBlur = 0;
  if (o.dim) {
    ctx.fillStyle = `rgba(255,250,240,${o.dim})`;
    roundRect(ctx, -w / 2, -h / 2, w, h, w * 0.12);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// The board
// ---------------------------------------------------------------------------------------------

const MATCH_WIGGLE = 0.9; // s
export const PILE_FLY = 0.75; // s after a two-player match before the cards fly to the pile
export const PILE_FLY_TIME = 0.5;

// Where a card in the gull's visit is drawn: carried from slot a to b (and b slides to a).
function gullPath(s, L, slot) {
  const a = s.anim;
  if (!a || a.kind !== 'gull' || (slot !== a.a && slot !== a.b)) return null;
  const t = a.t;
  const ra = cardRect(L, a.a);
  const rb = cardRect(L, a.b);
  const from = slot === a.b ? ra : rb; // the card now in b came from a
  const to = slot === a.b ? rb : ra;
  const k = ease(clamp((t - 0.9) / 1.2, 0, 1));
  const carried = slot === a.b;
  const x = from.x + (to.x - from.x) * k + L.cw / 2;
  const y = from.y + (to.y - from.y) * k + L.ch / 2;
  const up = carried ? Math.sin(k * Math.PI) * L.ch * 0.5 + (t > 0.7 && t < 2.3 ? L.ch * 0.1 : 0) : 0;
  return { x, y: y - up, lift: carried ? clamp((t - 0.7) / 0.2, 0, 1) * (t < 2.2 ? 1 : clamp((2.4 - t) / 0.2, 0, 1)) : 0, carried };
}

export function gullPos(s, L) {
  const a = s.anim;
  if (!a || a.kind !== 'gull') return null;
  const t = a.t;
  const ra = cardRect(L, a.a);
  const rb = cardRect(L, a.b);
  const pa = { x: ra.x + L.cw / 2, y: ra.y, h: L.ch };
  const pb = { x: rb.x + L.cw / 2, y: rb.y, h: L.ch };
  const offR = { x: L.x0 + L.gw + L.cw * 2, y: L.y0 - L.ch };
  const offL = { x: L.x0 - L.cw * 2, y: L.y0 - L.ch * 1.5 };
  const g = gullLeg(t, pa, pb, offR, offL);
  // the picture faces left (face 1); flip it to face the way it is flying
  g.face = g.dx < 0 ? 1 : -1;
  return g;
}

function gullLeg(t, pa, pb, offR, offL) {
  if (t < 0.7) {
    const k = ease(t / 0.7);
    return { x: offR.x + (pa.x - offR.x) * k, y: offR.y + (pa.y - offR.y) * k - Math.sin(k * Math.PI) * pa.h * 0.4, flap: t * 14, dx: pa.x - offR.x };
  }
  if (t < 0.9) return { x: pa.x, y: pa.y, flap: t * 22, dx: pb.x - pa.x };
  if (t < 2.1) {
    const k = ease((t - 0.9) / 1.2);
    return { x: pa.x + (pb.x - pa.x) * k, y: pa.y + (pb.y - pa.y) * k - Math.sin(k * Math.PI) * pa.h * 0.5 - pa.h * 0.1, flap: t * 16, dx: pb.x - pa.x };
  }
  if (t < 2.4) return { x: pb.x, y: pb.y, flap: t * 20, dx: offL.x - pb.x };
  const k = ease(clamp((t - 2.4) / 1.0, 0, 1));
  return { x: pb.x + (offL.x - pb.x) * k, y: pb.y + (offL.y - pb.y) * k, flap: t * 14, dx: offL.x - pb.x };
}

// A cheeky seagull, (x, y) at its feet, `s` px wide.
export function drawGull(ctx, x, y, s, flap = 0, face = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((face * s) / 100, s / 100);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const wing = Math.sin(flap) * 0.6;
  const W = (sgn) => {
    ctx.save();
    ctx.translate(sgn * 6, -30);
    ctx.rotate(sgn * (-0.3 + wing));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(sgn * 30, -30, sgn * 58, -8);
    ctx.quadraticCurveTo(sgn * 30, -6, 0, 10);
    ctx.closePath();
    ctx.fillStyle = '#c9d2e0';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sgn * 44, -12);
    ctx.quadraticCurveTo(sgn * 52, -12, sgn * 58, -8);
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();
  };
  W(-1);
  // legs
  ctx.strokeStyle = '#ff9a1a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-6, -12);
  ctx.lineTo(-8, 0);
  ctx.moveTo(6, -12);
  ctx.lineTo(8, 0);
  ctx.stroke();
  // body
  ctx.beginPath();
  ctx.ellipse(0, -28, 20, 16, 0, 0, TAU);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-14, -46, 12, 0, TAU);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.stroke();
  // beak
  ctx.beginPath();
  ctx.moveTo(-24, -48);
  ctx.lineTo(-40, -44);
  ctx.lineTo(-24, -41);
  ctx.closePath();
  ctx.fillStyle = '#ffc93a';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-32, -44, 2, 0, TAU);
  ctx.fillStyle = '#ff3b30';
  ctx.fill();
  // cheeky eye with a brow
  ctx.beginPath();
  ctx.arc(-15, -49, 3, 0, TAU);
  ctx.fillStyle = C.ink;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-21, -56);
  ctx.lineTo(-10, -53);
  ctx.lineWidth = 3;
  ctx.stroke();
  W(1);
  ctx.restore();
}

// The wave: water rushing up from the bottom of the board over one row and back.
function drawWave(ctx, s, L, time) {
  const a = s.anim;
  if (!a || a.kind !== 'wave') return;
  const t = a.t;
  const rowY = L.y0 + a.row * (L.ch + L.gap);
  const bottom = L.y0 + L.gh + L.gap * 2;
  const top = rowY - L.gap;
  let k;
  if (t < 0.8) k = ease(t / 0.8);
  else if (t < 1.4) k = 1;
  else k = 1 - ease(clamp((t - 1.4) / 0.9, 0, 1));
  if (k <= 0.001) return;
  const edge = bottom + (top - bottom) * k;
  const x0 = L.x0 - L.gap * 2;
  const x1 = L.x0 + L.gw + L.gap * 2;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0, bottom + 40);
  for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, edge + Math.sin(x / 30 + time * 5) * 6);
  ctx.lineTo(x1, bottom + 40);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, edge, 0, bottom);
  g.addColorStop(0, 'rgba(25,195,214,0.55)');
  g.addColorStop(1, 'rgba(11,143,176,0.4)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, edge + Math.sin(x / 30 + time * 5) * 6);
  ctx.stroke();
  // foam bubbles
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 18; i++) {
    const x = x0 + ((i * 97) % (x1 - x0));
    ctx.beginPath();
    ctx.arc(x, edge + 8 + ((i * 13) % 20), 3 + (i % 3), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// The whole board. fx: { sparkles, time, piles (two-player pile targets), hideOwnedAfterFly }
export function drawBoard(ctx, s, L, fx) {
  const time = fx.time;
  const order = [];
  s.cards.forEach((c, i) => order.push(i));
  // lifted cards draw last
  const liftOf = (i) => {
    const c = s.cards[i];
    if (gullPath(s, L, i)?.carried) return 3;
    if (c.flip > 0 && c.flip < 1) return 2;
    if (c.matched && s.time - c.matchT < MATCH_WIGGLE) return 1;
    return 0;
  };
  order.sort((a, b) => liftOf(a) - liftOf(b));
  for (const i of order) {
    const c = s.cards[i];
    const r = cardRect(L, i);
    let cx = r.x + r.w / 2;
    let cy = r.y + r.h / 2;
    // dealing in: each card slides from the bottom, one after another
    const dealK = clamp((s.time - (i / s.cards.length) * 0.45) / 0.35, 0, 1);
    if (dealK < 1) {
      const e = ease(dealK);
      cy += (1 - e) * (L.y0 + L.gh + L.ch - cy + 200);
    }
    const o = {};
    const g = gullPath(s, L, i);
    if (g) {
      cx = g.x;
      cy = g.y;
      o.lift = g.lift;
    }
    if (c.matched) {
      const mt = s.time - c.matchT;
      if (mt < MATCH_WIGGLE && mt >= FLIP_TIME * 0.5) {
        const w = (mt - FLIP_TIME * 0.5) / (MATCH_WIGGLE - FLIP_TIME * 0.5);
        o.rot = Math.sin(w * Math.PI * 6) * 0.14 * (1 - w);
        o.scale = 1 + Math.sin(w * Math.PI) * 0.12;
        cy -= Math.abs(Math.sin(w * Math.PI * 3)) * L.ch * 0.1 * (1 - w);
      }
      if (s.players === 2 && c.owner >= 0 && fx.pileOf) {
        const fly = clamp((mt - PILE_FLY) / PILE_FLY_TIME, 0, 1);
        if (fly >= 1) continue;
        if (fly > 0) {
          const p = fx.pileOf(c);
          const e = ease(fly);
          cx += (p.x - cx) * e;
          cy += (p.y - cy) * e - Math.sin(e * Math.PI) * L.ch * 0.5;
          o.scale = 1 + (p.scale - 1) * e;
          o.rot = (c.owner === 1 ? Math.PI : 0) * e;
        }
      } else if (mt > MATCH_WIGGLE) {
        o.glow = 'rgba(255,201,58,0.95)';
      }
    }
    if (s.lookT > 0 && s.open.includes(i) && c.flip >= 1) {
      // a miss: a little head-shake
      const mt = 1 - s.lookT;
      o.rot = Math.sin(mt * 30) * 0.05 * Math.max(0, 1 - mt * 2.5);
    }
    drawCardAt(ctx, c, cx, cy, L.cw, L.ch, c.flip, o);
    if (c.matched && s.players === 1 && s.time - c.matchT > MATCH_WIGGLE * 0.6) {
      // a gold star badge on finished pairs
      drawStar(ctx, cx + L.cw * 0.36, cy - L.ch * 0.38, Math.max(7, L.cw * 0.11), true);
    }
  }
  drawWave(ctx, s, L, time);
  const gp = gullPos(s, L);
  if (gp) drawGull(ctx, gp.x, gp.y + L.ch * 0.1, Math.max(70, L.cw * 0.9), gp.flap, gp.face);
  // sand sparkles
  for (const p of fx.sparkles || []) {
    const life = 1 - p.t / p.life;
    ctx.globalAlpha = Math.max(0, life);
    drawSparkle(ctx, p.x, p.y, p.r * (0.5 + life * 0.5), p.c);
  }
  ctx.globalAlpha = 1;
}

export function drawSparkle(ctx, x, y, r, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

export function drawConfetti(ctx, w, h, t) {
  const colours = [C.pink, C.sun, C.foam, C.white, C.orange, '#3a7bff', '#2fbf4a'];
  for (let i = 0; i < 80; i++) {
    const speed = 90 + ((i * 53) % 80);
    const x = ((i * 0.137) % 1) * w + Math.sin(t * 2 + i) * 20;
    const y = ((t * speed + i * 41) % (h + 40)) - 20;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 3 + i);
    ctx.fillStyle = colours[i % colours.length];
    ctx.fillRect(-6, -3.5, 12, 7);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------------------------
// Stickers (the album)
// ---------------------------------------------------------------------------------------------

const stickers = new Map();
// A round die-cut sticker; unknown pictures are a dark silhouette.
export function drawSticker(ctx, pic, cx, cy, d, known, wobble = 0) {
  const dpr = dprNow();
  const key = `${pic}|${Math.round(d)}|${known ? 1 : 0}|${dpr}`;
  let c = stickers.get(key);
  if (!c) {
    c = makeCanvas((d + 8) * dpr, (d + 8) * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const m = (d + 8) / 2;
    g.beginPath();
    g.arc(m, m + 2, d / 2, 0, TAU);
    g.fillStyle = 'rgba(22,11,51,0.25)';
    g.fill();
    g.beginPath();
    g.arc(m, m, d / 2, 0, TAU);
    g.fillStyle = known ? C.white : 'rgba(255,255,255,0.35)';
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = known ? C.ink : 'rgba(22,11,51,0.3)';
    g.stroke();
    if (known) drawPicture(g, pic, m, m, d * 0.78);
    else {
      const t = makeCanvas(d * dpr, d * dpr);
      const tg = t.getContext('2d');
      tg.scale(dpr, dpr);
      drawPicture(tg, pic, d / 2, d / 2, d * 0.78);
      tg.globalCompositeOperation = 'source-in';
      tg.fillStyle = 'rgba(22,11,51,0.45)';
      tg.fillRect(0, 0, d, d);
      g.drawImage(t, m - d / 2, m - d / 2, d, d);
    }
    stickers.set(key, c);
    if (stickers.size > 300) stickers.delete(stickers.keys().next().value);
  }
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(wobble);
  ctx.drawImage(c, -(d + 8) / 2, -(d + 8) / 2, d + 8, d + 8);
  ctx.restore();
}

export function drawNewTag(ctx, x, y, s, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.25 + Math.sin(t * 6) * 0.06);
  const w = s * 2.1;
  const h = s * 0.95;
  ctx.fillStyle = C.pink;
  roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.4);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.fillStyle = C.white;
  ctx.font = font(s * 0.62);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NEW!', 0, 1);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Little explainer pictures: the level picker icons and the teaching demos
// ---------------------------------------------------------------------------------------------

const mini = (pic, colour = null) => ({ pic, colour });

// A small card at (cx, cy), w wide, k turned (0 back, 1 face).
function miniCard(ctx, card, cx, cy, w, k = 1, o = {}) {
  drawCardAt(ctx, card, cx, cy, w, w * 1.22, k, o);
}

function tick(ctx, x, y, r, good) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = good ? '#2fbf4a' : '#ff3b30';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.strokeStyle = C.white;
  ctx.lineWidth = r * 0.32;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (good) {
    ctx.moveTo(x - r * 0.45, y);
    ctx.lineTo(x - r * 0.1, y + r * 0.38);
    ctx.lineTo(x + r * 0.5, y - r * 0.35);
  } else {
    ctx.moveTo(x - r * 0.38, y - r * 0.38);
    ctx.lineTo(x + r * 0.38, y + r * 0.38);
    ctx.moveTo(x + r * 0.38, y - r * 0.38);
    ctx.lineTo(x - r * 0.38, y + r * 0.38);
  }
  ctx.stroke();
  ctx.restore();
}

function heart(ctx, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, r * 0.9);
  ctx.bezierCurveTo(-r * 1.4, -r * 0.1, -r * 0.7, -r * 1.2, 0, -r * 0.45);
  ctx.bezierCurveTo(r * 0.7, -r * 1.2, r * 1.4, -r * 0.1, 0, r * 0.9);
  ctx.fillStyle = C.pink;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.restore();
}

// The picker icon for a level's idea, in a box r across.
export function drawModeIcon(ctx, L, cx, cy, r, time = 0) {
  const w = r * 0.62;
  if (L.mode === 'buddies') {
    miniCard(ctx, mini('pail'), cx - w * 0.42, cy, w, 1, { rot: -0.12 });
    miniCard(ctx, mini('spade'), cx + w * 0.42, cy, w, 1, { rot: 0.12 });
  } else if (L.mode === 'colour') {
    miniCard(ctx, mini('crab', 'red'), cx - w * 0.42, cy, w, 1, { rot: -0.12 });
    miniCard(ctx, mini('crab', 'blue'), cx + w * 0.42, cy, w, 1, { rot: 0.12 });
  } else if (L.mode === 'triples') {
    miniCard(ctx, mini('sun'), cx - w * 0.6, cy, w * 0.85, 1, { rot: -0.18 });
    miniCard(ctx, mini('sun'), cx + w * 0.6, cy, w * 0.85, 1, { rot: 0.18 });
    miniCard(ctx, mini('sun'), cx, cy - w * 0.08, w * 0.85, 1);
  } else {
    miniCard(ctx, mini('starfish'), cx - w * 0.42, cy, w, 1, { rot: -0.12 });
    miniCard(ctx, mini('starfish'), cx + w * 0.42, cy, w, 1, { rot: 0.12 });
  }
  if (L.gull) drawGull(ctx, cx + r * 0.5, cy - r * 0.15, r * 0.55, time * 10, -1);
  if (L.wave) {
    ctx.save();
    ctx.strokeStyle = C.white;
    ctx.fillStyle = 'rgba(25,195,214,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const y = cy + r * 0.42;
    ctx.moveTo(cx - r * 0.7, y + r * 0.2);
    for (let i = 0; i <= 14; i++) ctx.lineTo(cx - r * 0.7 + (i * r * 1.4) / 14, y + Math.sin(i * 1.3 + time * 4) * r * 0.05);
    ctx.lineTo(cx + r * 0.7, y + r * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// The teaching demo for an idea, looping, inside box (x, y, w, h).
export function drawTeach(ctx, kind, x, y, w, h, t) {
  const cw = Math.min(w / 3.4, h / 2.1);
  const cx = x + w / 2;
  const cy = y + h * 0.5;
  const loop = t % 4;
  const turn = (start) => clamp((loop - start) / 0.3, 0, 1) * (loop < 3.3 ? 1 : clamp(1 - (loop - 3.3) / 0.3, 0, 1));
  if (kind === 'pairs' || kind === 'buddies' || kind === 'triples') {
    const cardsFor = {
      pairs: [mini('crab'), mini('crab')],
      buddies: [mini('pail'), mini('spade')],
      triples: [mini('sun'), mini('sun'), mini('sun')],
    }[kind];
    const n = cardsFor.length;
    const gap = cw * 0.25;
    const sc = n === 3 ? 0.85 : 1;
    const span = n * cw * sc + (n - 1) * gap;
    cardsFor.forEach((c, i) => {
      const k = turn(0.4 + i * 0.6);
      const done = loop > 0.4 + n * 0.6 + 0.2 && loop < 3.3;
      const wig = done ? Math.sin(loop * 18) * 0.08 : 0;
      miniCard(ctx, c, cx - span / 2 + cw * sc * (i + 0.5) + gap * i, cy, cw * sc, k, { rot: wig, glow: done ? 'rgba(255,201,58,0.9)' : null });
    });
    if (loop > 0.4 + n * 0.6 + 0.2 && loop < 3.3) {
      if (kind === 'buddies') heart(ctx, cx, cy - cw * 0.85, cw * 0.28);
      tick(ctx, cx, cy + cw * 0.95, cw * 0.22, true);
    }
  } else if (kind === 'colour') {
    // top: red + red = yes. bottom: red + blue = no.
    const rows = [[mini('crab', 'red'), mini('crab', 'red'), true], [mini('crab', 'red'), mini('crab', 'blue'), false]];
    const sc = 0.78;
    rows.forEach(([a, b, good], r) => {
      const ry = y + h * (0.27 + r * 0.48);
      const k = turn(0.3 + r * 0.9);
      miniCard(ctx, a, cx - cw * 0.62, ry, cw * sc, k);
      miniCard(ctx, b, cx + cw * 0.38, ry, cw * sc, turn(0.6 + r * 0.9));
      if (loop > 0.9 + r * 0.9 && loop < 3.3) tick(ctx, cx + cw * 1.25, ry, cw * 0.2, good);
    });
  } else if (kind === 'gull') {
    // two cards swap places while a gull carries one over
    const k = ease(clamp((loop - 0.8) / 1.4, 0, 1)) * (loop < 3.4 ? 1 : 1 - ease(clamp((loop - 3.4) / 0.5, 0, 1)));
    const ax = cx - cw * 0.8;
    const bx = cx + cw * 0.8;
    const show = loop < 0.6 ? 1 : clamp(1 - (loop - 0.6) / 0.25, 0, 1);
    const fx = ax + (bx - ax) * k;
    miniCard(ctx, mini('dolphin'), bx + (ax - bx) * k, cy, cw * 0.9, show);
    miniCard(ctx, mini('pineapple'), fx, cy - Math.sin(k * Math.PI) * cw * 0.7, cw * 0.9, show, { lift: Math.sin(k * Math.PI) });
    drawGull(ctx, fx, cy - cw * 0.6 - Math.sin(k * Math.PI) * cw * 0.7, cw * 0.9, t * 14, -1);
  } else if (kind === 'wave') {
    const n = 3;
    const sc = 0.8;
    const pics = ['flamingo', 'taco', 'rocket'];
    const k = loop < 0.7 ? ease(loop / 0.7) : loop < 1.2 ? 1 : 1 - ease(clamp((loop - 1.2) / 0.7, 0, 1));
    const up = loop > 0.8 && loop < 3 ? 1 : 0;
    for (let i = 0; i < n; i++) {
      miniCard(ctx, mini(pics[i]), cx + (i - 1) * cw * 1.0, cy, cw * sc, up ? Math.min(1, (loop - 0.8) / 0.3) * (loop > 2.7 ? Math.max(0, (3 - loop) / 0.3) : 1) : 0);
    }
    const bottom = y + h;
    const top = cy - cw * 0.6;
    const edge = bottom + (top - bottom) * k;
    if (k > 0.01) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, bottom);
      for (let xx = x; xx <= x + w; xx += 6) ctx.lineTo(xx, edge + Math.sin(xx / 20 + t * 5) * 4);
      ctx.lineTo(x + w, bottom);
      ctx.closePath();
      ctx.fillStyle = 'rgba(25,195,214,0.55)';
      ctx.fill();
      ctx.strokeStyle = C.white;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------------------------------------
// The launcher tile
// ---------------------------------------------------------------------------------------------

export function drawTile(ctx, x, y, w, h, time = 0) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#f9e3a8');
  g.addColorStop(1, C.sandMid);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // the sea along the top
  ctx.fillStyle = C.sea;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  for (let i = 12; i >= 0; i--) ctx.lineTo(x + (w * i) / 12, y + h * 0.2 + Math.sin(i + time * 2) * h * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = C.white;
  ctx.lineWidth = Math.max(2, w * 0.012);
  ctx.beginPath();
  for (let i = 0; i <= 12; i++) ctx.lineTo(x + (w * i) / 12, y + h * 0.2 + Math.sin(i + time * 2) * h * 0.02);
  ctx.stroke();
  // four cards: two turn over in turn, match, wiggle and turn back
  const cw = Math.min(w * 0.3, h * 0.3);
  const pics = [mini('flamingo'), mini('crab'), mini('crab'), mini('flamingo')];
  const loop = time % 5;
  const kFor = (i) => {
    const start = i === 1 ? 0.4 : i === 2 ? 1.0 : i === 0 ? 2.2 : 2.8;
    return Math.min(clamp((loop - start) / 0.3, 0, 1), clamp((4.7 - loop) / 0.3, 0, 1));
  };
  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = x + w / 2 + (col - 0.5) * cw * 1.22;
    const cy = y + h * 0.6 + (row - 0.5) * cw * 1.38;
    const matched = ((i === 1 || i === 2) && loop > 1.4 && loop < 4.4) || ((i === 0 || i === 3) && loop > 3.2 && loop < 4.6);
    const wig = matched ? Math.sin(time * 16) * 0.08 : 0;
    drawCardAt(ctx, pics[i], cx, cy, cw, cw * 1.22, kFor(i), { rot: wig + (col ? 0.04 : -0.04), glow: matched ? 'rgba(255,201,58,0.9)' : null });
  }
  ctx.restore();
}

export { shade };
