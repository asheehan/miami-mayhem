// Postcard Puzzles drawing. Reads the puzzle state and never changes rules. Pictures, cut
// pieces and the board's static layer are rendered once into offscreen canvases and reused
// every frame; only loose pieces, the held piece and effects are drawn per frame.
import { SCENES } from './scenes/index.js';
import { PIC_W, PIC_H, SIZES, makeCut, tracePiece, piecePad, toScreen, pieceScale, homeOf } from './puzzle.js';

export const C = {
  night: '#2b1055',
  dusk: '#7a1fa2',
  pink: '#ff3d9a',
  orange: '#ff8a4c',
  sun: '#ffe14d',
  sea: '#0bb5c4',
  foam: '#9ff7f2',
  ink: '#160b33',
  white: '#ffffff',
  card: '#fffaf0',
  gold: '#ffc93a',
};

export const font = (px, weight = 900) => `${weight} ${Math.round(px)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
const SCRIPT = (px) => `italic 700 ${Math.round(px)}px "Snell Roundhand", "Brush Script MT", "Segoe Script", Georgia, serif`;
const TAU = Math.PI * 2;
const dprNow = () => (typeof window !== 'undefined' && window.devicePixelRatio) || 1;

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

export function outlined(ctx, text, x, y, px, fill, maxW, align = 'center') {
  ctx.font = font(px);
  if (maxW) {
    const tw = ctx.measureText(text).width;
    if (tw > maxW) {
      px = (px * maxW) / tw;
      ctx.font = font(px);
    }
  }
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = px * 0.22;
  ctx.strokeStyle = C.ink;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

// ---------------------------------------------------------------------------------------------
// Pictures
// ---------------------------------------------------------------------------------------------

const pictures = new Map(); // `${index}|${width}|${grey}` -> canvas
function remember(key, c) {
  pictures.set(key, c);
  if (pictures.size > 48) pictures.delete(pictures.keys().next().value);
  return c;
}

// A scene rendered to a canvas `pw` device pixels wide (3:4).
export function picture(index, pw, grey = false) {
  pw = Math.max(8, Math.round(pw));
  const key = `${index}|${pw}|${grey ? 1 : 0}`;
  const hit = pictures.get(key);
  if (hit) return hit;
  if (grey) {
    const src = picture(index, pw, false);
    const c = makeCanvas(src.width, src.height);
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    try {
      const img = g.getImageData(0, 0, c.width, c.height);
      const d = img.data;
      for (let k = 0; k < d.length; k += 4) {
        const l = d[k] * 0.3 + d[k + 1] * 0.59 + d[k + 2] * 0.11;
        const v = 70 + l * 0.62;
        d[k] = v * 0.92 + d[k] * 0.08;
        d[k + 1] = v * 0.92 + d[k + 1] * 0.08;
        d[k + 2] = v * 0.98 + d[k + 2] * 0.08;
      }
      g.putImageData(img, 0, 0);
    } catch {
      g.fillStyle = 'rgba(120,120,140,0.6)';
      g.fillRect(0, 0, c.width, c.height);
    }
    return remember(key, c);
  }
  const ph = Math.round((pw * PIC_H) / PIC_W);
  const c = makeCanvas(pw, ph);
  SCENES[index].draw(c.getContext('2d'), pw, ph);
  return remember(key, c);
}

// Cuts each piece out of a picture rendered at S device px per picture unit.
function cutPieces(cut, pic, S, dpr) {
  const pad = piecePad(cut);
  return cut.pieces.map((p) => {
    const c = makeCanvas((cut.cw + pad * 2) * S, (cut.ch + pad * 2) * S);
    const g = c.getContext('2d');
    const ox = pad * S;
    const oy = pad * S;
    const path = () => {
      g.beginPath();
      tracePiece(g, cut, p.i, S, ox, oy);
    };
    g.save();
    path();
    g.clip();
    g.drawImage(pic, ox - p.col * cut.cw * S, oy - p.row * cut.ch * S);
    // a soft bevel: light along the top-left inside edge, shade along the bottom-right
    g.lineJoin = 'round';
    g.lineWidth = 4 * dpr;
    g.translate(1.5 * dpr, 1.5 * dpr);
    path();
    g.strokeStyle = 'rgba(255,255,255,0.55)';
    g.stroke();
    g.translate(-3 * dpr, -3 * dpr);
    path();
    g.strokeStyle = 'rgba(22,11,51,0.35)';
    g.stroke();
    g.restore();
    path();
    g.lineWidth = 1.3 * dpr;
    g.strokeStyle = 'rgba(22,11,51,0.6)';
    g.stroke();
    return c;
  });
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
  } else if (kind === 'album') {
    // two stacked postcards
    ctx.lineWidth = s * 0.22;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.2);
    ctx.strokeRect(-s * 0.75, -s * 0.6, s * 1.3, s * 1.0);
    ctx.restore();
    ctx.save();
    ctx.translate(cx + s * 0.1, cy + s * 0.08);
    ctx.rotate(0.1);
    ctx.fillRect(-s * 0.7, -s * 0.55, s * 1.4, s * 1.05);
    ctx.restore();
  } else if (kind === 'eye' || kind === 'eye-off') {
    ctx.lineWidth = s * 0.22;
    ctx.beginPath();
    ctx.moveTo(cx - s * 1.05, cy);
    ctx.quadraticCurveTo(cx, cy - s * 1.1, cx + s * 1.05, cy);
    ctx.quadraticCurveTo(cx, cy + s * 1.1, cx - s * 1.05, cy);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.36, 0, TAU);
    ctx.fill();
    if (kind === 'eye-off') {
      ctx.lineWidth = s * 0.26;
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.95, cy - s * 0.85);
      ctx.lineTo(cx + s * 0.95, cy + s * 0.85);
      ctx.stroke();
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
  const px = b.h * 0.42;
  ctx.font = font(px);
  let tw = ctx.measureText(b.label).width;
  const room = b.w * (hasIcon ? 0.62 : 0.86);
  if (tw > room) {
    ctx.font = font((px * room) / tw);
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

export function drawIconButton(ctx, b, on = false) {
  ctx.fillStyle = on ? 'rgba(255,225,77,0.9)' : 'rgba(22,11,51,0.28)';
  roundRect(ctx, b.x, b.y, b.w, b.h, b.w * 0.24);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = on ? C.ink : 'rgba(255,255,255,0.6)';
  ctx.stroke();
  glyph(ctx, b.icon, b.x + b.w / 2, b.y + b.h / 2, b.w * 0.3, on ? C.ink : C.white);
}

// A grid icon for a puzzle size: cols x rows little rounded tiles in a 3:4 frame.
export function drawGridIcon(ctx, cx, cy, h, size, colour = C.ink) {
  const w = h * 0.75;
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  const gw = w / size.cols;
  const gh = h / size.rows;
  ctx.fillStyle = colour;
  for (let i = 0; i < size.cols; i++) {
    for (let j = 0; j < size.rows; j++) {
      roundRect(ctx, x0 + i * gw + gw * 0.08, y0 + j * gh + gh * 0.08, gw * 0.84, gh * 0.84, Math.min(gw, gh) * 0.2);
      ctx.fill();
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Backdrops, confetti, sparkles
// ---------------------------------------------------------------------------------------------

export function drawBackdrop(ctx, w, h, time = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, C.night);
  g.addColorStop(0.5, C.dusk);
  g.addColorStop(1, '#c2368f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // drifting soft circles for a little life
  for (let i = 0; i < 6; i++) {
    const x = (((i * 0.37 + time * 0.01 * (1 + (i % 3))) % 1.2) - 0.1) * w;
    const y = h * (0.15 + ((i * 0.29) % 0.8));
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.arc(x, y, Math.min(w, h) * (0.08 + (i % 3) * 0.05), 0, TAU);
    ctx.fill();
  }
}

export function drawConfetti(ctx, w, h, t) {
  const colours = [C.pink, C.sun, C.foam, C.white, C.orange, '#3a7bff', '#7cff6b'];
  for (let i = 0; i < 80; i++) {
    const speed = 90 + ((i * 53) % 90);
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

// ---------------------------------------------------------------------------------------------
// The postcard: white border, "Greetings from" caption, a stamp and a postmark
// ---------------------------------------------------------------------------------------------

// Card geometry around a picture rect.
export function cardRect(px, py, pw, ph) {
  const b = pw * 0.045;
  const strip = ph * 0.15;
  return { x: px - b, y: py - b, w: pw + b * 2, h: ph + b + strip, b, strip };
}

function stamp(ctx, x, y, w, h, index) {
  // white paper with a scalloped (perforated-looking) edge
  const r = w * 0.055;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, w, h);
  for (let k = 0; k <= 8; k++) {
    for (const [cx, cy] of [[x + (k / 8) * w, y], [x + (k / 8) * w, y + h], [x, y + (k / 8) * h], [x + w, y + (k / 8) * h]]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.fill();
    }
  }
  // a tiny sunset with a palm
  const ix = x + w * 0.12;
  const iy = y + h * 0.1;
  const iw = w * 0.76;
  const ih = h * 0.62;
  const g = ctx.createLinearGradient(0, iy, 0, iy + ih);
  const tints = [['#ff3d9a', '#ffb35c'], ['#2f9bff', '#9ff7f2'], ['#7a1fa2', '#ff8a4c']][index % 3];
  g.addColorStop(0, tints[0]);
  g.addColorStop(1, tints[1]);
  ctx.fillStyle = g;
  ctx.fillRect(ix, iy, iw, ih);
  ctx.fillStyle = C.sun;
  ctx.beginPath();
  ctx.arc(ix + iw * 0.62, iy + ih * 0.55, iw * 0.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#0bb5c4';
  ctx.fillRect(ix, iy + ih * 0.72, iw, ih * 0.28);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = Math.max(1.5, w * 0.04);
  ctx.beginPath();
  ctx.moveTo(ix + iw * 0.28, iy + ih);
  ctx.quadraticCurveTo(ix + iw * 0.25, iy + ih * 0.6, ix + iw * 0.36, iy + ih * 0.3);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.5, w * 0.05);
  for (const a of [-2.6, -1.9, -1.1, -0.4]) {
    ctx.beginPath();
    ctx.moveTo(ix + iw * 0.36, iy + ih * 0.3);
    ctx.quadraticCurveTo(ix + iw * 0.36 + Math.cos(a) * iw * 0.18, iy + ih * 0.3 + Math.sin(a) * iw * 0.12, ix + iw * 0.36 + Math.cos(a) * iw * 0.3, iy + ih * 0.3 + Math.sin(a) * iw * 0.2 + iw * 0.08);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
  ctx.strokeRect(ix, iy, iw, ih);
  ctx.fillStyle = C.ink;
  ctx.font = font(h * 0.15);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MIAMI', x + w / 2, y + h * 0.85);
}

function postmark(ctx, x, y, r) {
  ctx.save();
  ctx.strokeStyle = 'rgba(40,30,80,0.55)';
  ctx.lineWidth = Math.max(1.5, r * 0.07);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.72, 0, TAU);
  ctx.stroke();
  for (let k = -1; k <= 1; k++) {
    ctx.beginPath();
    const yy = y + k * r * 0.35;
    ctx.moveTo(x + r * 0.9, yy);
    for (let i = 1; i <= 6; i++) ctx.quadraticCurveTo(x + r * 0.9 + (i - 0.5) * r * 0.4, yy + (i % 2 ? -1 : 1) * r * 0.18, x + r * 0.9 + i * r * 0.4, yy);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(40,30,80,0.55)';
  ctx.font = font(r * 0.32);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FLA', x, y);
  ctx.restore();
}

// A full postcard: `pic` drawn into the picture rect, with the card around it. `k` (0..1)
// fades in the border, caption and stamp (for the finish animation).
export function drawPostcard(ctx, index, pic, px, py, pw, ph, k = 1, tilt = 0) {
  const cr = cardRect(px, py, pw, ph);
  ctx.save();
  ctx.translate(px + pw / 2, py + ph / 2);
  ctx.rotate(tilt);
  ctx.translate(-(px + pw / 2), -(py + ph / 2));
  if (k > 0) {
    ctx.globalAlpha = k;
    ctx.fillStyle = 'rgba(22,11,51,0.35)';
    roundRect(ctx, cr.x + 6, cr.y + 10, cr.w, cr.h, cr.b * 0.6);
    ctx.fill();
    ctx.fillStyle = C.card;
    roundRect(ctx, cr.x, cr.y, cr.w, cr.h, cr.b * 0.6);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.drawImage(pic, px, py, pw, ph);
  if (k > 0) {
    ctx.globalAlpha = k;
    ctx.strokeStyle = 'rgba(22,11,51,0.5)';
    ctx.lineWidth = Math.max(1, pw * 0.004);
    ctx.strokeRect(px, py, pw, ph);
    // caption
    const sy = py + ph + cr.strip * 0.5;
    const scriptPx = cr.strip * 0.3;
    ctx.font = SCRIPT(scriptPx);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c2368f';
    const greet = 'Greetings from';
    ctx.fillText(greet, px + pw * 0.02, sy - cr.strip * 0.2);
    const place = SCENES[index].place.toUpperCase();
    const g = ctx.createLinearGradient(0, sy - cr.strip * 0.1, 0, sy + cr.strip * 0.4);
    g.addColorStop(0, C.sun);
    g.addColorStop(0.5, C.orange);
    g.addColorStop(1, C.pink);
    const maxW = pw * 0.96;
    let px2 = cr.strip * 0.42;
    ctx.font = font(px2);
    const tw = ctx.measureText(place).width;
    if (tw > maxW) px2 = (px2 * maxW) / tw;
    ctx.font = font(px2);
    ctx.lineJoin = 'round';
    ctx.lineWidth = px2 * 0.22;
    ctx.strokeStyle = C.ink;
    ctx.textAlign = 'left';
    ctx.strokeText(place, px + pw * 0.02, sy + cr.strip * 0.18);
    ctx.fillStyle = g;
    ctx.fillText(place, px + pw * 0.02, sy + cr.strip * 0.18);
    // stamp over the top-right corner, and a postmark beside it
    const sw = pw * 0.17;
    const sh = sw * 1.2;
    ctx.save();
    ctx.translate(px + pw - sw * 0.55, py + sh * 0.45);
    ctx.rotate(0.08);
    ctx.fillStyle = 'rgba(22,11,51,0.3)';
    ctx.fillRect(-sw / 2 + 3, -sh / 2 + 4, sw, sh);
    stamp(ctx, -sw / 2, -sh / 2, sw, sh, index);
    ctx.restore();
    postmark(ctx, px + pw - sw * 1.45, py + sh * 0.55, sw * 0.42);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Album and size chooser pictures
// ---------------------------------------------------------------------------------------------

// A postcard thumbnail with three size badges underneath.
export function drawAlbumCard(ctx, b, index, done, time) {
  const dpr = dprNow();
  const tilt = ((index * 37) % 7 - 3) * 0.012;
  // every postcard is in full colour so none looks locked; the badges show what's finished
  const pic = picture(index, b.pw * dpr, false);
  ctx.save();
  ctx.translate(b.px + b.pw / 2, b.py + b.ph / 2);
  ctx.rotate(tilt);
  const bx = -b.pw / 2;
  const by = -b.ph / 2;
  const border = b.pw * 0.06;
  ctx.fillStyle = 'rgba(22,11,51,0.4)';
  roundRect(ctx, bx - border + 4, by - border + 6, b.pw + border * 2, b.ph + border * 2, border);
  ctx.fill();
  ctx.fillStyle = C.card;
  roundRect(ctx, bx - border, by - border, b.pw + border * 2, b.ph + border * 2, border);
  ctx.fill();
  ctx.drawImage(pic, bx, by, b.pw, b.ph);
  ctx.restore();
  // badges: one per size, gold when finished at that size
  const r = Math.min(b.badgeH * 0.42, b.w / 7.5);
  const gap = r * 2.5;
  SIZES.forEach((s, k) => {
    const cx = b.x + b.w / 2 + (k - 1) * gap;
    const cy = b.y + b.h - b.badgeH / 2;
    const got = done.includes(s.n);
    const bob = got ? Math.sin(time * 3 + index + k) * r * 0.06 : 0;
    ctx.fillStyle = got ? C.gold : 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.arc(cx, cy + bob, r, 0, TAU);
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.16);
    ctx.strokeStyle = got ? C.ink : 'rgba(255,255,255,0.45)';
    ctx.stroke();
    ctx.fillStyle = got ? C.ink : 'rgba(255,255,255,0.7)';
    ctx.font = font(r * (s.n > 9 ? 0.95 : 1.15));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(s.n), cx, cy + bob + 1);
  });
}

// ---------------------------------------------------------------------------------------------
// Play
// ---------------------------------------------------------------------------------------------

export function createRenderer() {
  let key = '';
  let pic = null;
  let pieces = [];
  let layer = null; // { canvas, x, y, w, h } in CSS px
  let layerKey = '';
  let S = 1;
  let dpr = 1;

  // Rebuilds the picture and the cut pieces when the puzzle, its size or the screen changes.
  function prepare(state, sceneIndex) {
    dpr = dprNow();
    const L = state.layout;
    const k = `${sceneIndex}|${state.size.n}|${L.s.toFixed(4)}|${dpr}|${state.cut.seed}`;
    if (k === key) return;
    key = k;
    S = L.s * dpr;
    pic = picture(sceneIndex, PIC_W * S);
    pieces = cutPieces(state.cut, pic, S, dpr);
    layerKey = '';
  }

  // The board's static layer: frame, backing, ghost, outlines of empty homes and the placed
  // pieces (or the whole clean picture once finished). Redrawn only when something lands.
  function staticLayer(state, ghost) {
    const L = state.layout;
    const placed = state.pieces.filter((p) => p.placed).length;
    const k = `${key}|${ghost}|${placed}|${state.status}|${L.bx}|${L.by}`;
    if (k === layerKey && layer) return layer;
    layerKey = k;
    const frame = Math.max(6, L.bw * 0.022);
    const x = L.bx - frame;
    const y = L.by - frame;
    const w = L.bw + frame * 2;
    const h = L.bh + frame * 2;
    const canvas = layer && layer.canvas.width === Math.round((w + 12) * dpr) && layer.canvas.height === Math.round((h + 14) * dpr) ? layer.canvas : makeCanvas((w + 12) * dpr, (h + 14) * dpr);
    const g = canvas.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.setTransform(dpr, 0, 0, dpr, -x * dpr + 6 * dpr, -y * dpr + 4 * dpr);
    // frame: a white postcard edge with a shadow
    g.fillStyle = 'rgba(22,11,51,0.45)';
    roundRect(g, x + 3, y + 6, w, h, frame);
    g.fill();
    g.fillStyle = C.card;
    roundRect(g, x, y, w, h, frame);
    g.fill();
    if (state.status === 'done') {
      g.drawImage(pic, L.bx, L.by, L.bw, L.bh);
    } else {
      // backing: soft sand with a faint dot pattern so empty spots read as "empty"
      g.fillStyle = '#efe6d6';
      g.fillRect(L.bx, L.by, L.bw, L.bh);
      g.fillStyle = 'rgba(150,120,90,0.12)';
      const step = Math.max(10, L.bw / 30);
      for (let yy = L.by + step / 2; yy < L.by + L.bh; yy += step) {
        for (let xx = L.bx + step / 2 + ((yy / step) % 2) * step * 0.5; xx < L.bx + L.bw; xx += step) {
          g.beginPath();
          g.arc(xx, yy, step * 0.12, 0, TAU);
          g.fill();
        }
      }
      if (ghost) {
        g.globalAlpha = 0.32;
        g.drawImage(pic, L.bx, L.by, L.bw, L.bh);
        g.globalAlpha = 1;
      }
      // outlines of every home
      g.lineJoin = 'round';
      g.lineWidth = 1.5;
      g.strokeStyle = 'rgba(255,255,255,0.75)';
      for (const p of state.pieces) {
        if (p.placed) continue;
        const cp = state.cut.pieces[p.i];
        g.beginPath();
        tracePiece(g, state.cut, p.i, L.s, L.bx + cp.col * state.cut.cw * L.s, L.by + cp.row * state.cut.ch * L.s);
        g.stroke();
      }
      const pad = piecePad(state.cut);
      for (const p of state.pieces) {
        if (!p.placed) continue;
        const cp = state.cut.pieces[p.i];
        g.drawImage(pieces[p.i], L.bx + (cp.col * state.cut.cw - pad) * L.s, L.by + (cp.row * state.cut.ch - pad) * L.s, pieces[p.i].width / dpr, pieces[p.i].height / dpr);
      }
    }
    g.lineWidth = 2;
    g.strokeStyle = 'rgba(22,11,51,0.35)';
    g.strokeRect(L.bx, L.by, L.bw, L.bh);
    layer = { canvas, x: x - 6, y: y - 4, w: w + 12, h: h + 14 };
    return layer;
  }

  // Draws piece i centred at screen (cx, cy) at scale k of its board size.
  function drawPiece(ctx, state, i, cx, cy, k) {
    const L = state.layout;
    const img = pieces[i];
    const pad = piecePad(state.cut);
    const w = (img.width / dpr) * k;
    const h = (img.height / dpr) * k;
    ctx.drawImage(img, cx - (state.cut.cw / 2 + pad) * L.s * k, cy - (state.cut.ch / 2 + pad) * L.s * k, w, h);
  }

  function tracePieceAt(ctx, state, i, cx, cy, k) {
    const L = state.layout;
    const sc = L.s * k;
    tracePiece(ctx, state.cut, i, sc, cx - (state.cut.cw / 2) * sc, cy - (state.cut.ch / 2) * sc);
  }

  // fx: { ghost, held: {x, y, k} display pos of held piece, hint: index, pops: [{i, t}],
  //       sparkles: [...], time, finishT }
  function drawPlay(ctx, state, sceneIndex, fx) {
    prepare(state, sceneIndex);
    const L = state.layout;
    // tray panel
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    roundRect(ctx, L.tray.x, L.tray.y, L.tray.w, L.tray.h, 18);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.stroke();
    const lay = staticLayer(state, fx.ghost);
    ctx.drawImage(lay.canvas, lay.x, lay.y, lay.w, lay.h);
    // pops on pieces that just landed
    for (const pop of fx.pops) {
      const hp = homeOf(state.cut, pop.i);
      const c = toScreen(L, hp.x, hp.y);
      const k = 1 + 0.14 * Math.sin(Math.min(1, pop.t / 0.35) * Math.PI);
      drawPiece(ctx, state, pop.i, c.x, c.y, k);
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - pop.t / 0.5);
      ctx.strokeStyle = C.sun;
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      tracePieceAt(ctx, state, pop.i, c.x, c.y, k);
      ctx.stroke();
      ctx.restore();
    }
    // hint: the home outline and the piece pulse
    const pulse = 0.5 + 0.5 * Math.sin(fx.time * 5);
    if (fx.hint >= 0) {
      const hp = homeOf(state.cut, fx.hint);
      const c = toScreen(L, hp.x, hp.y);
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -fx.time * 30;
      ctx.lineWidth = 5;
      ctx.strokeStyle = `rgba(255,225,77,${0.45 + 0.55 * pulse})`;
      ctx.beginPath();
      tracePieceAt(ctx, state, fx.hint, c.x, c.y, 1);
      ctx.stroke();
      ctx.restore();
    }
    // loose pieces, bottom to top
    for (const i of state.order) {
      const p = state.pieces[i];
      if (p.placed || state.held === i) continue;
      const c = toScreen(L, p.x, p.y);
      let k = pieceScale(state, p);
      if (fx.hint === i) {
        k *= 1 + 0.07 * pulse;
        ctx.save();
        ctx.shadowColor = `rgba(255,225,77,${0.6 + 0.4 * pulse})`;
        ctx.shadowBlur = 18 + 10 * pulse;
        drawPiece(ctx, state, i, c.x, c.y, k);
        ctx.restore();
      } else {
        drawPiece(ctx, state, i, c.x, c.y, k);
      }
    }
    // the held piece, lifted with a shadow
    if (state.held !== null && fx.held) {
      ctx.save();
      ctx.shadowColor = 'rgba(10,5,30,0.45)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 12;
      drawPiece(ctx, state, state.held, fx.held.x, fx.held.y, fx.held.k);
      ctx.restore();
    }
    for (const s of fx.sparkles) {
      const a = 1 - s.t / s.life;
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      drawSparkle(ctx, s.x, s.y, s.r * (0.6 + a * 0.6), s.c);
    }
    ctx.globalAlpha = 1;
  }

  return {
    prepare,
    drawPlay,
    picture: () => pic,
    reset() {
      key = '';
      layer = null;
      layerKey = '';
    },
  };
}

// ---------------------------------------------------------------------------------------------
// The launcher tile: a postcard with one piece floating in and clicking into place
// ---------------------------------------------------------------------------------------------

let tileCache = null;
const TILE_SIZE = SIZES[0];
export function drawTile(ctx, x, y, w, h, time) {
  const dpr = dprNow();
  const cut = makeCut(TILE_SIZE.cols, TILE_SIZE.rows, 4242);
  // picture area: 3:4 inside the tile with a white border
  const b = Math.max(4, w * 0.06);
  let pw = w - b * 2;
  let ph = (pw * PIC_H) / PIC_W;
  if (ph > h - b * 2) {
    ph = h - b * 2;
    pw = (ph * PIC_W) / PIC_H;
  }
  const px = x + (w - pw) / 2;
  const py = y + (h - ph) / 2;
  const s = pw / PIC_W;
  const key = `${Math.round(pw * dpr)}|${dpr}`;
  if (!tileCache || tileCache.key !== key) {
    const pic = picture(0, PIC_W * s * dpr);
    tileCache = { key, pic, pieces: cutPieces(cut, pic, s * dpr, dpr) };
  }
  // background: sunset with the card
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#ff8a4c');
  g.addColorStop(1, '#ff3d9a');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = C.card;
  roundRect(ctx, px - b * 0.6, py - b * 0.6, pw + b * 1.2, ph + b * 1.2, b * 0.4);
  ctx.fill();
  ctx.drawImage(tileCache.pic, px, py, pw, ph);
  // one piece flies out and back in, on a 4 s loop
  const moving = 3;
  const cp = cut.pieces[moving];
  const hx = px + (cp.col + 0.5) * cut.cw * s;
  const hy = py + (cp.row + 0.5) * cut.ch * s;
  const t = time % 4;
  const away = t < 1.6 ? 1 : t < 2.6 ? 1 - (t - 1.6) : 0;
  const ease = away * away * (3 - 2 * away);
  // the hole
  ctx.fillStyle = 'rgba(43,16,85,0.55)';
  ctx.beginPath();
  tracePiece(ctx, cut, moving, s, px + cp.col * cut.cw * s, py + cp.row * cut.ch * s);
  ctx.fill();
  const cx = hx + ease * w * 0.22 + Math.sin(time * 3) * ease * w * 0.02;
  const cy = hy + ease * h * 0.1 - ease * h * 0.06;
  const k = 1 + ease * 0.12;
  const pad = piecePad(cut);
  const img = tileCache.pieces[moving];
  ctx.save();
  if (ease > 0.02) {
    ctx.shadowColor = 'rgba(10,5,30,0.45)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 6 * ease;
  }
  ctx.drawImage(img, cx - (cut.cw / 2 + pad) * s * k, cy - (cut.ch / 2 + pad) * s * k, (img.width / dpr) * k, (img.height / dpr) * k);
  ctx.restore();
  // sparkle as it lands
  if (t >= 2.6 && t < 3.2) {
    const a = 1 - (t - 2.6) / 0.6;
    ctx.globalAlpha = a;
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * TAU;
      const rr = (1 - a) * w * 0.22 + w * 0.05;
      drawSparkle(ctx, hx + Math.cos(ang) * rr, hy + Math.sin(ang) * rr, w * 0.04, i % 2 ? C.sun : C.white);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
