// Cargo Captain drawing. Reads the state and never changes game rules; the only state here is
// cosmetic (crates easing into place, plops, splashes, steam, cached scenery). The field is
// drawn in its own 400 x 760 units under one transform.
import {
  FIELD_W, PIVOT_X, DECK_Y, WATER_Y, DECK_INNER, COL_W, SIDE_DROP_Y,
  layout, shipPose, totals, compare, hint, crateSize, dockSpot, sizeOf,
} from './sim.js';

export const C = {
  night: '#2b1055',
  dusk: '#7a1fa2',
  pink: '#ff3d9a',
  orange: '#ff8a4c',
  sun: '#ffe14d',
  sea: '#0bb5c4',
  deep: '#0a3d6b',
  foam: '#c9fbff',
  ink: '#160b33',
  white: '#ffffff',
  cream: '#fff4dc',
  wood: '#dba25c',
  woodDark: '#a8692f',
  woodLight: '#f0c27e',
  steel: '#4d7fae',
  steelDark: '#2f5680',
  steelLight: '#7fb0d9',
  mystery: '#8a3fd1',
  mysteryDark: '#5b1f96',
  green: '#3fe07a',
  greenDark: '#1f9c4c',
  gator: '#58b84a',
  gatorDark: '#2f7a2b',
  red: '#ff4b4b',
  hull: '#1f2a4a',
  hullRed: '#d9423f',
  pier: '#b07a4a',
  pierDark: '#7a4f2c',
  pineapple: '#ffc21f',
  leaf: '#2fae4a',
  coconut: '#7a4a2a',
};

export const font = (px, weight = 900) => `${weight} ${Math.round(px)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ease = (k) => 1 - (1 - k) * (1 - k);

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
  const room = b.w * (hasIcon ? 0.66 : 0.86);
  let size = px;
  if (tw > room) {
    size = (px * room) / tw;
    ctx.font = font(size);
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

// Square icon buttons along the top: 'home', 'back', 'restart'.
export function drawIconButton(ctx, b) {
  ctx.fillStyle = 'rgba(22,11,51,0.35)';
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

export function drawLock(ctx, x, y, r) {
  ctx.lineWidth = r * 0.3;
  ctx.strokeStyle = C.white;
  ctx.beginPath();
  ctx.arc(x, y - r * 0.4, r * 0.55, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = C.white;
  roundRect(ctx, x - r * 0.85, y - r * 0.4, r * 1.7, r * 1.3, r * 0.25);
  ctx.fill();
}

// ---------------------------------------------------------------------------------------------
// Crates
// ---------------------------------------------------------------------------------------------

// Where the dots go for 1..10, in a box from -1 to 1 each way: dice faces up to 6, then a
// ten-frame (a row of five on top, the rest below).
export function dotSpots(n) {
  const P = {
    1: [[0, 0]],
    2: [[-0.45, 0], [0.45, 0]],
    3: [[-0.7, 0.5], [0, -0.5], [0.7, 0.5]],
    4: [[-0.42, -0.5], [0.42, -0.5], [-0.42, 0.5], [0.42, 0.5]],
    5: [[-0.75, -0.5], [0.75, -0.5], [0, 0], [-0.75, 0.5], [0.75, 0.5]],
    6: [[-0.7, -0.5], [0, -0.5], [0.7, -0.5], [-0.7, 0.5], [0, 0.5], [0.7, 0.5]],
  };
  if (P[n]) return P[n];
  const out = [];
  for (let i = 0; i < n; i++) out.push([-0.8 + (i % 5) * 0.4, i < 5 ? -0.5 : 0.5]);
  return out;
}

function drawFruit(ctx, kind, x, y, r, lit) {
  if (lit) {
    ctx.fillStyle = C.sun;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.45, 0, TAU);
    ctx.fill();
  }
  ctx.lineWidth = Math.max(1, r * 0.22);
  ctx.strokeStyle = C.ink;
  if (kind === 'pineapple') {
    ctx.fillStyle = C.leaf;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.55, y - r * 0.6);
    ctx.lineTo(x - r * 0.3, y - r * 1.25);
    ctx.lineTo(x, y - r * 0.85);
    ctx.lineTo(x + r * 0.3, y - r * 1.25);
    ctx.lineTo(x + r * 0.55, y - r * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C.pineapple;
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.1, r * 0.78, r * 0.92, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(160,90,0,0.55)';
    ctx.lineWidth = Math.max(0.8, r * 0.12);
    ctx.beginPath();
    ctx.moveTo(x - r * 0.45, y - r * 0.25);
    ctx.lineTo(x + r * 0.3, y + r * 0.6);
    ctx.moveTo(x + r * 0.45, y - r * 0.25);
    ctx.lineTo(x - r * 0.3, y + r * 0.6);
    ctx.stroke();
  } else {
    ctx.fillStyle = C.coconut;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#3a2112';
    for (const [dx, dy] of [[-0.3, -0.2], [0.3, -0.2], [0, 0.3]]) {
      ctx.beginPath();
      ctx.arc(x + dx * r, y + dy * r, r * 0.16, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(x - r * 0.4, y - r * 0.45, r * 0.22, 0, TAU);
    ctx.fill();
  }
}

// A crate centred at (x, y), `size` across, turned by `angle`.
// c: { n, fixed, mystery, revealed, id }; o: { alpha, glow, lit, jiggle, ghost }
export function drawCrate(ctx, x, y, size, angle, c, o = {}) {
  const S = size;
  const h = S / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + (o.jiggle || 0));
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.glow) {
    ctx.fillStyle = `rgba(255,225,77,${0.45 + 0.35 * o.glow})`;
    roundRect(ctx, -h - 10, -h - 10, S + 20, S + 20, S * 0.25);
    ctx.fill();
  }
  const r = S * 0.12;
  if (o.ghost) {
    ctx.setLineDash([S * 0.09, S * 0.07]);
    ctx.lineWidth = Math.max(2, S * 0.05);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(ctx, -h, -h, S, S, r);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    // shadow, body
    ctx.fillStyle = 'rgba(22,11,51,0.25)';
    roundRect(ctx, -h + 3, -h + 4, S, S, r);
    ctx.fill();
    const body = c.mystery ? C.mystery : c.fixed ? C.steel : C.wood;
    const dark = c.mystery ? C.mysteryDark : c.fixed ? C.steelDark : C.woodDark;
    ctx.fillStyle = body;
    roundRect(ctx, -h, -h, S, S, r);
    ctx.fill();
    ctx.save();
    ctx.clip();
    if (c.fixed && !c.mystery) {
      // corrugated container ribs
      ctx.fillStyle = C.steelLight;
      for (let i = -3; i <= 3; i++) ctx.fillRect(i * S * 0.13 - S * 0.025, -h, S * 0.05, S);
      ctx.fillStyle = '#ffd23a';
      ctx.fillRect(-h, h - S * 0.11, S, S * 0.11);
      ctx.fillStyle = C.ink;
      for (let i = -4; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * S * 0.14, h);
        ctx.lineTo(i * S * 0.14 + S * 0.07, h - S * 0.11);
        ctx.lineTo(i * S * 0.14 + S * 0.13, h - S * 0.11);
        ctx.lineTo(i * S * 0.14 + S * 0.06, h);
        ctx.fill();
      }
    } else if (c.mystery) {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      for (let i = -2; i <= 2; i++) ctx.fillRect(i * S * 0.22 - S * 0.06, -h, S * 0.12, S);
    } else {
      // planks and a frame
      ctx.strokeStyle = 'rgba(110,60,20,0.35)';
      ctx.lineWidth = Math.max(1, S * 0.02);
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-h, -h + (S * i) / 4);
        ctx.lineTo(h, -h + (S * i) / 4);
        ctx.stroke();
      }
      ctx.fillStyle = C.woodLight;
      ctx.fillRect(-h, -h, S * 0.08, S);
      ctx.fillRect(h - S * 0.08, -h, S * 0.08, S);
    }
    ctx.restore();
    ctx.lineWidth = Math.max(2, S * 0.045);
    ctx.strokeStyle = dark;
    roundRect(ctx, -h, -h, S, S, r);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.5, S * 0.025);
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    if (c.fixed) {
      // bolts at the corners and clamps holding it to the deck
      for (const [bx, by] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        ctx.fillStyle = '#c9ced8';
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = Math.max(1, S * 0.02);
        ctx.beginPath();
        ctx.arc(bx * (h - S * 0.085), by * (h - S * 0.085), S * 0.055, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = '#5a5f73';
      ctx.fillRect(-h - S * 0.06, h - S * 0.16, S * 0.07, S * 0.18);
      ctx.fillRect(h - S * 0.01, h - S * 0.16, S * 0.07, S * 0.18);
    }
  }
  // label plate and numeral
  const showN = !c.mystery || c.revealed;
  const plateY = -h + S * 0.06;
  const plateH = S * 0.38;
  if (!o.ghost) {
    ctx.fillStyle = c.mystery ? '#3d0f6b' : C.cream;
    roundRect(ctx, -S * 0.3, plateY, S * 0.6, plateH, S * 0.08);
    ctx.fill();
    ctx.lineWidth = Math.max(1, S * 0.02);
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = showN ? String(c.n) : '?';
  ctx.font = font(S * (label.length > 1 ? 0.33 : 0.38));
  ctx.fillStyle = o.ghost ? C.white : c.mystery ? C.sun : C.ink;
  ctx.fillText(label, 0, plateY + plateH / 2 + S * 0.015);
  if (c.mystery && !showN) {
    ctx.font = font(S * 0.42);
    ctx.fillStyle = C.sun;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = S * 0.05;
    ctx.strokeText('?', 0, S * 0.24);
    ctx.fillText('?', 0, S * 0.24);
  }
  if (showN) {
    // that many fruit, to count
    const spots = dotSpots(c.n);
    const hw = S * 0.4;
    const hh = S * 0.2;
    const cy = -h + S * 0.71;
    const fr = c.n <= 2 ? S * 0.12 : c.n <= 6 ? S * 0.095 : S * 0.072;
    const kind = o.ghost ? 'ghost' : (c.fruit || (c.id % 2 ? 'pineapple' : 'coconut'));
    spots.forEach(([u, v], i) => {
      const lit = o.lit !== undefined && i < o.lit;
      const px = u * hw;
      const py = cy + v * hh;
      const rr = lit ? fr * 1.15 : fr;
      if (kind === 'ghost') {
        ctx.fillStyle = `rgba(255,225,77,${o.pulse === undefined ? 0.9 : 0.55 + 0.45 * o.pulse})`;
        ctx.beginPath();
        ctx.arc(px, py, rr, 0, TAU);
        ctx.fill();
      } else {
        drawFruit(ctx, kind, px, py + rr * 0.1, rr, lit);
      }
    });
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// The ship and its captain
// ---------------------------------------------------------------------------------------------

const DECK_END = DECK_INNER + COL_W * 2 + 8; // half-length of the deck
const TOWER_H = 74;

function hullPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-DECK_END - 6, -10);
  ctx.lineTo(-DECK_END + 2, 0);
  ctx.lineTo(DECK_END - 2, 0);
  ctx.lineTo(DECK_END + 16, -16);
  ctx.quadraticCurveTo(DECK_END + 8, 50, DECK_END - 30, 82);
  ctx.lineTo(-DECK_END + 14, 82);
  ctx.quadraticCurveTo(-DECK_END - 4, 60, -DECK_END - 6, -10);
  ctx.closePath();
}

// The hull, deck and bridge tower, in ship coordinates (pivot at 0, 0, deck along y = 0).
function drawHull(ctx, lamp, t) {
  // bridge tower
  ctx.fillStyle = C.white;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  roundRect(ctx, -DECK_INNER + 2, -TOWER_H, (DECK_INNER - 2) * 2, TOWER_H + 4, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2a4d7a';
  roundRect(ctx, -DECK_INNER + 6, -TOWER_H + 10, (DECK_INNER - 6) * 2, 12, 3);
  ctx.fill();
  // the level lamp: green when both sides weigh the same
  const g = lamp === 'green';
  if (g) {
    ctx.fillStyle = `rgba(63,224,122,${0.35 + 0.2 * Math.sin(t * 8)})`;
    ctx.beginPath();
    ctx.arc(0, -TOWER_H * 0.42, 20, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = g ? C.green : C.orange;
  ctx.beginPath();
  ctx.arc(0, -TOWER_H * 0.42, 10, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(-3, -TOWER_H * 0.42 - 3, 3, 0, TAU);
  ctx.fill();
  // funnel
  ctx.fillStyle = C.hullRed;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-DECK_INNER + 3, -TOWER_H);
  ctx.lineTo(-DECK_INNER + 1, -TOWER_H - 22);
  ctx.lineTo(-DECK_INNER + 15, -TOWER_H - 22);
  ctx.lineTo(-DECK_INNER + 13, -TOWER_H);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.fillRect(-DECK_INNER + 1, -TOWER_H - 24, 14, 6);
  // hull
  ctx.save();
  hullPath(ctx);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = C.hull;
  ctx.fillRect(-DECK_END - 30, -20, DECK_END * 2 + 60, 46);
  ctx.fillStyle = C.white;
  ctx.fillRect(-DECK_END - 30, 26, DECK_END * 2 + 60, 6);
  ctx.fillStyle = C.hullRed;
  ctx.fillRect(-DECK_END - 30, 32, DECK_END * 2 + 60, 60);
  // portholes
  ctx.fillStyle = '#9fd8ff';
  for (let i = -5; i <= 5; i++) {
    if (Math.abs(i) < 1) continue;
    ctx.beginPath();
    ctx.arc(i * 30, 13, 4.5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.restore();
  // deck rails at each end
  ctx.strokeStyle = C.white;
  ctx.lineWidth = 2.5;
  for (const dir of [-1, 1]) {
    const x0 = dir * (DECK_END - 2);
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.lineTo(x0, -16);
    ctx.moveTo(x0 - dir * 2, -16);
    ctx.lineTo(x0 + dir * 10, -22);
    ctx.stroke();
  }
}

// The captain: a pelican in a captain's hat, feet at (0, 0), facing right, about 70 tall.
// mood: 'calm' | 'nervous' | 'happy' | 'dizzy'; look: -1 left .. 1 right.
export function drawPelican(ctx, x, y, k, mood, t, look = 0, lean = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  const shake = mood === 'nervous' ? Math.sin(t * 30) * 0.025 : mood === 'dizzy' ? Math.sin(t * 9) * 0.18 : 0;
  ctx.rotate(lean + shake);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // legs
  ctx.strokeStyle = C.orange;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-5, 0);
  ctx.lineTo(-5, -12);
  ctx.moveTo(5, 0);
  ctx.lineTo(5, -12);
  ctx.stroke();
  // body
  ctx.fillStyle = C.white;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(0, -28, 16, 19, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // wing (flaps when nervous or happy)
  const flap = mood === 'nervous' ? Math.sin(t * 22) * 0.5 : mood === 'happy' ? Math.sin(t * 10) * 0.6 - 0.3 : 0.1;
  ctx.save();
  ctx.translate(-6, -34);
  ctx.rotate(-0.4 - flap);
  ctx.fillStyle = '#c8cfdd';
  ctx.beginPath();
  ctx.ellipse(0, 9, 7.5, 14, 0.15, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // neck and head
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.ellipse(3, -48, 6, 9, 0.1, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(4, -58, 10.5, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // beak with its pouch
  ctx.fillStyle = '#ffb02e';
  ctx.beginPath();
  ctx.moveTo(11, -61);
  ctx.lineTo(38, -56);
  ctx.quadraticCurveTo(40, -53, 36, -52);
  ctx.quadraticCurveTo(22, -40, 11, -51);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(160,80,0,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(12, -56);
  ctx.lineTo(36, -54);
  ctx.stroke();
  // eye
  ctx.strokeStyle = C.ink;
  ctx.fillStyle = C.ink;
  if (mood === 'happy') {
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(6, -60, 3.5, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  } else if (mood === 'dizzy') {
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let a = 0; a < TAU * 1.6; a += 0.3) {
      const rr = 0.5 + a * 0.45;
      ctx.lineTo(6 + Math.cos(a + t * 8) * rr, -60 + Math.sin(a + t * 8) * rr);
    }
    ctx.stroke();
  } else {
    const big = mood === 'nervous' ? 5 : 3.8;
    ctx.fillStyle = C.white;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(6, -60, big, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(6 + look * big * 0.45, -60 + (mood === 'nervous' ? 1.2 : 0), big * 0.45, 0, TAU);
    ctx.fill();
    if (mood === 'nervous') {
      // a sweat drop
      const dy = (t * 30) % 14;
      ctx.fillStyle = '#7fd8ff';
      ctx.beginPath();
      ctx.moveTo(-8, -66 + dy);
      ctx.quadraticCurveTo(-12, -59 + dy, -8, -57 + dy);
      ctx.quadraticCurveTo(-4, -59 + dy, -8, -66 + dy);
      ctx.fill();
    }
  }
  // captain's hat
  ctx.fillStyle = C.white;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(3, -71, 13, 6.5, -0.08, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.ink;
  roundRect(ctx, -7, -68.5, 21, 5, 2);
  ctx.fill();
  ctx.fillStyle = C.sun;
  ctx.beginPath();
  ctx.arc(5, -72, 2.6, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// The whole ship: hull, crates on deck (already laid out, in field units), captain on top.
function drawShip(ctx, pose, deck, opts) {
  const { t, lamp, mood, look } = opts;
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.angle);
  drawHull(ctx, lamp, t);
  ctx.restore();
  for (const d of deck) drawCrate(ctx, d.x, d.y, d.size, d.angle, d.c, d.o);
  // the captain stays upright on top of the tower, leaning against the tilt
  const tx = pose.x + Math.sin(pose.angle) * TOWER_H;
  const ty = pose.y - Math.cos(pose.angle) * TOWER_H;
  drawPelican(ctx, tx, ty, 1, mood, t, look, -pose.angle * 0.6);
}

// ---------------------------------------------------------------------------------------------
// Signs: the hungry gator (opens toward the heavier side) and the green "="
// ---------------------------------------------------------------------------------------------

// dir 1: the mouth opens to the right ("<", the right side is bigger); -1: opens to the left.
export function drawGator(ctx, x, y, r, dir, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  const open = 0.6 + Math.sin(t * 5) * 0.08; // chomp chomp
  const hx = -r * 0.7; // the hinge: the point of the sign
  const len = r * 1.55;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const tips = [-1, 1].map((s) => [hx + Math.cos(s * open) * len, Math.sin(s * open) * len]);
  // teeth along the inside of each jaw
  ctx.fillStyle = C.white;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = r * 0.05;
  tips.forEach(([ex, ey], k) => {
    const s = k ? 1 : -1;
    for (let i = 1; i <= 3; i++) {
      const f = 0.3 + i * 0.17;
      const bx = hx + (ex - hx) * f;
      const by = ey * f - s * r * 0.12;
      ctx.beginPath();
      ctx.moveTo(bx - r * 0.09, by);
      ctx.lineTo(bx, by - s * r * 0.2);
      ctx.lineTo(bx + r * 0.09, by);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  });
  // the two jaws as one thick green ">" (ink outline under the green)
  for (const [col, wd] of [[C.ink, r * 0.46], [C.gator, r * 0.32]]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = wd;
    ctx.beginPath();
    ctx.moveTo(tips[0][0], tips[0][1]);
    ctx.lineTo(hx, 0);
    ctx.lineTo(tips[1][0], tips[1][1]);
    ctx.stroke();
  }
  // nostrils on the snout tip, the head bump with an eye at the hinge
  ctx.fillStyle = C.gatorDark;
  ctx.beginPath();
  ctx.arc(tips[0][0] - r * 0.02, tips[0][1] + r * 0.02, r * 0.06, 0, TAU);
  ctx.fill();
  ctx.fillStyle = C.gator;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  ctx.arc(hx - r * 0.05, -r * 0.05, r * 0.3, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.arc(hx + r * 0.02, -r * 0.33, r * 0.2, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(hx + r * 0.08, -r * 0.33, r * 0.09, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawEquals(ctx, x, y, r, t, glow = 1) {
  ctx.save();
  ctx.fillStyle = `rgba(63,224,122,${(0.3 + 0.15 * Math.sin(t * 6)) * glow})`;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = C.green;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = r * 0.1;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.white;
  ctx.lineWidth = r * 0.07;
  for (const s of [-1, 1]) {
    roundRect(ctx, x - r * 0.55, y + s * r * 0.24 - r * 0.12, r * 1.1, r * 0.24, r * 0.1);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Scenery: PortMiami at sunset
// ---------------------------------------------------------------------------------------------

function hash(i) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

const SKY_STOPS = [[0, '#2b1055'], [0.35, '#7a1fa2'], [0.68, '#ff3d9a'], [0.88, '#ff8a4c'], [1, '#ffc36b']];

// The still part of the backdrop (sky, sun, skyline, cranes, containers) for field x0..x1,
// y0..WATER_Y.
function paintBackdrop(ctx, x0, x1, y0) {
  const g = ctx.createLinearGradient(0, Math.min(y0, -40), 0, WATER_Y);
  for (const [k, c] of SKY_STOPS) g.addColorStop(k, c);
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, x1 - x0, WATER_Y - y0 + 1);
  // a big striped sun sitting on the sea
  const sx = 300;
  const sy = WATER_Y - 30;
  const sr = 72;
  const sg = ctx.createLinearGradient(0, sy - sr, 0, sy + sr);
  sg.addColorStop(0, '#fff07a');
  sg.addColorStop(1, '#ff9a3c');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ff8a4c';
  for (let i = 0; i < 4; i++) ctx.fillRect(sx - sr, sy + 6 + i * 13, sr * 2, 3 + i * 1.5);
  // far skyline (Miami towers)
  const base = WATER_Y - 4;
  ctx.fillStyle = '#5a2380';
  let i = 0;
  for (let x = x0 - 20; x < x1; i++) {
    const w = 18 + hash(i) * 26;
    const hgt = 40 + hash(i + 50) * 110 * (1 - Math.abs(x - 120) / 600);
    ctx.fillRect(x, base - hgt, w - 2, hgt);
    if (hash(i + 7) > 0.6) ctx.fillRect(x + w * 0.4, base - hgt - 14, 2, 14);
    x += w;
  }
  ctx.fillStyle = '#3e1763';
  i = 100;
  for (let x = x0 - 10; x < x1; i++) {
    const w = 22 + hash(i) * 30;
    const hgt = 20 + hash(i + 50) * 70;
    ctx.fillRect(x, base - hgt, w - 3, hgt);
    ctx.fillStyle = 'rgba(255,190,230,0.55)';
    for (let wy = base - hgt + 6; wy < base - 6; wy += 9) {
      for (let wx = x + 4; wx < x + w - 7; wx += 7) if (hash(wx * 3.1 + wy) > 0.55) ctx.fillRect(wx, wy, 3, 4);
    }
    ctx.fillStyle = '#3e1763';
    x += w;
  }
  // port: stacked containers on the far quay
  const cols = ['#e2574c', '#2fa8b8', '#f2a541', '#4a6fd1', '#d14a8b', '#57b05a'];
  for (let k = 0; k < 40; k++) {
    const cx = x0 + ((k * 37) % Math.max(1, x1 - x0));
    const rows = 1 + Math.floor(hash(k + 300) * 3);
    for (let r = 0; r < rows; r++) {
      ctx.fillStyle = cols[(k + r * 2) % cols.length];
      ctx.globalAlpha = 0.75;
      ctx.fillRect(cx, base - 9 - r * 9, 30, 8);
    }
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#2b1055';
  ctx.fillRect(x0, base, x1 - x0, 6);
  // gantry cranes
  for (const [cx, dir] of [[48, 1], [355, -1], [x0 + 10, 1], [x1 - 10, -1]]) {
    if (cx < x0 - 60 || cx > x1 + 60) continue;
    ctx.strokeStyle = '#e8546a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'square';
    const top = WATER_Y - 210;
    ctx.beginPath();
    ctx.moveTo(cx - 16, base);
    ctx.lineTo(cx - 16, top);
    ctx.moveTo(cx + 16, base);
    ctx.lineTo(cx + 16, top);
    ctx.moveTo(cx - 16, top + 50);
    ctx.lineTo(cx + 16, top + 90);
    ctx.moveTo(cx + 16, top + 50);
    ctx.lineTo(cx - 16, top + 90);
    ctx.moveTo(cx - 40 * dir, top);
    ctx.lineTo(cx + 110 * dir, top);
    ctx.moveTo(cx, top - 30);
    ctx.lineTo(cx + 100 * dir, top);
    ctx.moveTo(cx, top - 30);
    ctx.lineTo(cx - 36 * dir, top);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.moveTo(cx + 80 * dir, top);
    ctx.lineTo(cx + 80 * dir, top + 70);
    ctx.stroke();
    ctx.fillStyle = cols[cx > 200 ? 1 : 2];
    ctx.fillRect(cx + 80 * dir - 14, top + 70, 28, 12);
  }
}

function drawGulls(ctx, x0, x1, t) {
  ctx.strokeStyle = C.white;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const span = x1 - x0 + 120;
  for (let i = 0; i < 4; i++) {
    const x = x0 - 60 + ((t * (14 + i * 5) + i * 140) % span);
    const y = 150 + i * 42 + Math.sin(t * 1.3 + i) * 10;
    const f = Math.sin(t * 7 + i * 2) * 5;
    ctx.beginPath();
    ctx.moveTo(x - 11, y - 3 + f);
    ctx.quadraticCurveTo(x - 5, y - 7 + f * 0.5, x, y);
    ctx.quadraticCurveTo(x + 5, y - 7 + f * 0.5, x + 11, y - 3 + f);
    ctx.stroke();
  }
}

function drawWaterBack(ctx, x0, x1, t) {
  const g = ctx.createLinearGradient(0, WATER_Y, 0, 600);
  g.addColorStop(0, '#ff9f7a');
  g.addColorStop(0.08, '#1bbcc8');
  g.addColorStop(1, '#0a4f80');
  ctx.fillStyle = g;
  ctx.fillRect(x0, WATER_Y, x1 - x0, 600 - WATER_Y);
  // the sun's reflection
  ctx.fillStyle = 'rgba(255,225,77,0.55)';
  for (let i = 0; i < 6; i++) {
    const w = 90 - i * 12 + Math.sin(t * 2 + i) * 6;
    ctx.fillRect(300 - w / 2, WATER_Y + 8 + i * 12, w, 4);
  }
}

// The front of the water, drawn over the bottom of the hull so the ship sits in the sea.
function drawWaterFront(ctx, x0, x1, t, slosh) {
  ctx.beginPath();
  ctx.moveTo(x0, 600);
  for (let x = x0; x <= x1 + 10; x += 10) {
    const y = WATER_Y + 6 + Math.sin(x * 0.045 + t * 2.4) * 3 + Math.sin((x - PIVOT_X) * 0.012) * slosh;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(x1, 600);
  ctx.closePath();
  ctx.fillStyle = 'rgba(16,150,180,0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(201,251,255,0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = x0; x <= x1 + 10; x += 10) {
    const y = WATER_Y + 6 + Math.sin(x * 0.045 + t * 2.4) * 3 + Math.sin((x - PIVOT_X) * 0.012) * slosh;
    if (x === x0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(201,251,255,0.35)';
  ctx.lineWidth = 2;
  for (let r = 0; r < 4; r++) {
    const y = 485 + r * 26;
    ctx.beginPath();
    for (let x = x0 + ((r * 37) % 60); x < x1; x += 60) {
      const xx = x + ((t * 12 * (r % 2 ? 1 : -1)) % 60);
      ctx.moveTo(xx, y);
      ctx.quadraticCurveTo(xx + 10, y - 4, xx + 20, y);
    }
    ctx.stroke();
  }
}

const DOCK_Y = 596;
function drawDock(ctx, x0, x1, y1) {
  ctx.fillStyle = C.pierDark;
  ctx.fillRect(x0, DOCK_Y - 6, x1 - x0, 12);
  for (let x = Math.floor(x0 / 60) * 60 + 20; x < x1; x += 60) {
    ctx.fillRect(x, DOCK_Y, 10, 30);
  }
  ctx.fillStyle = C.pier;
  ctx.fillRect(x0, DOCK_Y + 4, x1 - x0, y1 - DOCK_Y);
  ctx.strokeStyle = 'rgba(110,60,20,0.45)';
  ctx.lineWidth = 2;
  for (let y = DOCK_Y + 24; y < y1; y += 22) {
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(x0, DOCK_Y + 4, x1 - x0, 6);
  // bollards
  for (const bx of [16, 384]) {
    ctx.fillStyle = '#3a3f55';
    roundRect(ctx, bx - 9, DOCK_Y - 14, 18, 22, 5);
    ctx.fill();
    ctx.fillStyle = '#5a6080';
    ctx.fillRect(bx - 12, DOCK_Y - 16, 24, 6);
  }
}

// ---------------------------------------------------------------------------------------------
// The renderer
// ---------------------------------------------------------------------------------------------

const CRATE_K = 220; // spring that brings a crate into its spot after it moves
const CRATE_D = 20;

export function createRenderer() {
  let disp = new Map(); // id -> { ox, oy, vx, vy, place, x, y, hideUntil, jiggleAt }
  let puzzleRef = null;
  let seen = 0;
  let sprites = []; // plopped crates falling, splashes, steam, notes
  let bg = null; // cached backdrop canvas
  let bgKey = '';
  let mood = { dizzyUntil: 0 };

  function reset() {
    disp = new Map();
    puzzleRef = null;
    seen = 0;
    sprites = [];
  }

  function backdrop(ctx, x0, x1, y0, view) {
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const key = `${x0.toFixed(1)}|${x1.toFixed(1)}|${y0.toFixed(1)}|${view.s.toFixed(4)}|${dpr}`;
    if (key !== bgKey) {
      bgKey = key;
      const w = Math.ceil((x1 - x0) * view.s * dpr);
      const h = Math.ceil((WATER_Y - y0) * view.s * dpr) + 2;
      bg = document.createElement('canvas');
      bg.width = Math.max(1, w);
      bg.height = Math.max(1, h);
      const c = bg.getContext('2d');
      c.scale(view.s * dpr, view.s * dpr);
      c.translate(-x0, -y0);
      paintBackdrop(c, x0, x1, y0);
    }
    ctx.drawImage(bg, x0, y0, x1 - x0, WATER_Y - y0 + 2 / (view.s * dpr));
  }

  function events(s, time) {
    for (const e of s.events) {
      if (e.seq <= seen) continue;
      seen = e.seq;
      if (e.type === 'plop') {
        const r = disp.get(e.id);
        if (r) r.hideUntil = time + 1.15;
        const c = s.crates.find((k) => k.id === e.id);
        sprites.push({ kind: 'plop', t0: time, x: e.x, y: e.y, size: e.size, angle: e.angle, dir: e.side === 'left' ? -1 : 1, c: { ...c } });
      } else if (e.type === 'bolted') {
        const r = disp.get(e.id);
        if (r) r.jiggleAt = time;
      } else if (e.type === 'wobble') {
        mood.dizzyUntil = time + 1.3;
      } else if (e.type === 'level') {
        sprites.push({ kind: 'toot', t0: time });
      }
    }
  }

  // Each crate eases (with a little bounce) from wherever it was drawn into its spot.
  function place(s, pos, time, dt) {
    if (s.puzzle !== puzzleRef) {
      puzzleRef = s.puzzle;
      disp = new Map();
      let k = 0;
      for (const c of s.crates) {
        const p = pos.get(c.id);
        const fromSky = p.place === 'dock';
        disp.set(c.id, { ox: 0, oy: fromSky ? -260 - (k++) * 70 : 0, vx: 0, vy: 0, place: p.place, x: p.x, y: p.y, hideUntil: 0, jiggleAt: -9 });
      }
    }
    const out = new Map();
    for (const c of s.crates) {
      const p = pos.get(c.id);
      if (!p) continue;
      let r = disp.get(c.id);
      if (!r) {
        r = { ox: 0, oy: 0, vx: 0, vy: 0, place: p.place, x: p.x, y: p.y, hideUntil: 0, jiggleAt: -9 };
        disp.set(c.id, r);
      }
      const jumped = s.status === 'play' && r.place === p.place && Math.hypot(r.x - r.ox - p.x, r.y - r.oy - p.y) > 25;
      if (r.place !== p.place || jumped) {
        if (r.hideUntil > time) {
          r.ox = 0;
          r.oy = -200;
        } else {
          r.ox = r.x - p.x;
          r.oy = r.y - p.y;
        }
        r.place = p.place;
      }
      if (r.hideUntil > time) {
        r.ox = 0;
        r.oy = -220;
        r.vx = r.vy = 0;
      }
      const k = p.place === 'held' ? CRATE_K * 3 : CRATE_K;
      const d = p.place === 'held' ? CRATE_D * 1.8 : CRATE_D;
      const n = Math.max(1, Math.ceil(dt / 0.008));
      for (let i = 0; i < n; i++) {
        const h = dt / n;
        r.vx += (-k * r.ox - d * r.vx) * h;
        r.vy += (-k * r.oy - d * r.vy) * h;
        r.ox += r.vx * h;
        r.oy += r.vy * h;
      }
      r.x = p.x + r.ox;
      r.y = p.y + r.oy;
      const jt = time - r.jiggleAt;
      out.set(c.id, {
        c, x: r.x, y: r.y, size: p.size, place: p.place, hidden: r.hideUntil > time,
        angle: p.angle + (p.place === 'held' ? Math.sin(time * 9) * 0.05 : 0),
        jiggle: jt < 0.45 ? Math.sin(jt * 50) * 0.08 * (1 - jt / 0.45) : 0,
      });
    }
    return out;
  }

  function drawTotals(ctx, s, time, hintNow) {
    const t = totals(s);
    const sign = compare(t.left, t.right);
    const done = s.status === 'level' || s.status === 'sail' || s.status === 'choose' || s.status === 'done';
    ctx.fillStyle = 'rgba(22,11,51,0.45)';
    roundRect(ctx, 14, 12, FIELD_W - 28, 100, 26);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = sign === '=' ? C.green : 'rgba(255,255,255,0.5)';
    ctx.stroke();
    const myst = s.crates.find((c) => c.mystery);
    let leftLabel = String(t.left);
    if (myst && !s.revealed) {
      const rest = t.left - myst.n;
      leftLabel = rest > 0 ? `?+${rest}` : '?';
    }
    const heavyCol = '#ffd23a';
    const colL = sign === '=' ? C.green : sign === '>' ? heavyCol : C.white;
    const colR = sign === '=' ? C.green : sign === '<' ? heavyCol : C.white;
    const bounce = (side) => {
      if (!hintNow || hintNow.light !== side) return 1;
      return 1 + Math.sin(time * 6) * 0.05;
    };
    outlined(ctx, leftLabel, 100, 64, 66 * bounce('left'), colL, 140);
    outlined(ctx, String(t.right), 300, 64, 66 * bounce('right'), colR, 140);
    if (sign === '=') drawEquals(ctx, 200, 62, 30, time, done ? 1.4 : 1);
    else drawGator(ctx, 200, 62, 34, sign === '<' ? 1 : -1, time);
  }

  // Where a crate of `size` would sit on top of a side's stack right now (field units).
  function stackTop(s, placed, side, size) {
    let top = DECK_Y;
    for (const d of placed.values()) if (d.place === side) top = Math.min(top, d.y - d.size / 2);
    const pose = shipPose(s);
    const dir = side === 'left' ? -1 : 1;
    const x = pose.x + dir * (DECK_INNER + COL_W) + Math.sin(pose.angle) * (DECK_Y - top);
    return { x, y: top - size / 2 - 8 };
  }

  // The ghost crate on the light side showing how much is missing, as dots.
  function drawGhost(ctx, s, placed, h, time) {
    if (h.diff > 10) return;
    const size = crateSize(h.diff);
    const p = stackTop(s, placed, h.light, size);
    const pulse = 0.5 + 0.5 * Math.sin(time * 5);
    drawCrate(ctx, p.x, p.y + Math.sin(time * 3) * 3, size, 0, { n: h.diff, id: 0 }, { ghost: true, pulse, alpha: 0.95 });
  }

  function drawHintFinger(ctx, s, placed, h, time) {
    if (!h.move) return;
    const d = placed.get(h.move.id);
    if (!d) return;
    const c = d.c;
    const target = h.move.to === 'dock' ? dockSpot(s, c.slot, d.size) : stackTop(s, placed, h.move.to, d.size);
    const tx = target.x;
    const ty = target.y;
    const k = (time * 0.6) % 1;
    const mk = k < 0.15 ? 0 : k > 0.75 ? 1 : ease((k - 0.15) / 0.6);
    const x = d.x + (tx - d.x) * mk;
    const y = d.y + (ty - d.y) * mk - Math.sin(mk * Math.PI) * 40;
    const a = k > 0.9 ? 1 - (k - 0.9) * 10 : k < 0.08 ? k / 0.08 : 1;
    ctx.save();
    ctx.globalAlpha = 0.6 * a;
    drawCrate(ctx, x, y, d.size, 0, c, {});
    ctx.globalAlpha = a;
    drawFinger(ctx, x + 4, y + d.size * 0.35, 1.5);
    ctx.restore();
  }

  function drawSprites(ctx, time) {
    sprites = sprites.filter((sp) => time - sp.t0 < 2.4);
    for (const sp of sprites) {
      const t = time - sp.t0;
      if (sp.kind === 'plop') {
        if (t < 1.0) {
          // slide off the low end, tumble, splash
          const slide = Math.min(t, 0.35) / 0.35;
          let x = sp.x + sp.dir * slide * 70;
          let y = sp.y + slide * Math.abs(Math.sin(sp.angle)) * 70;
          let ang = sp.angle;
          if (t > 0.35) {
            const f = t - 0.35;
            x += sp.dir * f * 110;
            y += 260 * f * f + 30 * f;
            ang += sp.dir * f * 6;
          }
          const sink = y > WATER_Y + 20;
          if (!sink) drawCrate(ctx, x, y, sp.size, ang, sp.c, {});
          if (sink && !sp.splashed) {
            sp.splashed = true;
            sp.sx = x;
            sp.st = time;
          }
        }
        if (sp.splashed) {
          const f = time - sp.st;
          if (f < 0.9) {
            ctx.strokeStyle = `rgba(255,255,255,${1 - f / 0.9})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.ellipse(sp.sx, WATER_Y + 10, 20 + f * 70, 6 + f * 14, 0, 0, TAU);
            ctx.stroke();
            ctx.fillStyle = `rgba(201,251,255,${1 - f / 0.9})`;
            for (let i = 0; i < 8; i++) {
              const a = -Math.PI * (0.15 + 0.7 * (i / 7));
              const v = 160 + (i % 3) * 40;
              const px = sp.sx + Math.cos(a) * v * f;
              const py = WATER_Y + 6 + Math.sin(a) * v * f + 420 * f * f;
              ctx.beginPath();
              ctx.arc(px, py, 5, 0, TAU);
              ctx.fill();
            }
          }
        }
      } else if (sp.kind === 'toot') {
        if (t > 1.8) continue;
        // steam puffs from the funnel and notes floating up
        for (let i = 0; i < 3; i++) {
          const f = t - i * 0.25;
          if (f < 0 || f > 1.2) continue;
          const fx = (sp.fx ?? 0) - 6 + Math.sin(f * 4 + i) * 6;
          const fy = (sp.fy ?? 0) - f * 70;
          ctx.fillStyle = `rgba(255,255,255,${0.9 * (1 - f / 1.2)})`;
          ctx.beginPath();
          ctx.arc(fx, fy, 8 + f * 16, 0, TAU);
          ctx.fill();
        }
        for (let i = 0; i < 2; i++) {
          const f = t - 0.2 - i * 0.4;
          if (f < 0 || f > 1.3) continue;
          drawNote(ctx, (sp.fx ?? 0) + 30 + i * 26 + Math.sin(f * 5) * 8, (sp.fy ?? 0) - 10 - f * 80, 1 - f / 1.3);
        }
      }
    }
  }

  function drawNote(ctx, x, y, a) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = C.sun;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, 7, 5.5, -0.4, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(x + 4.5, y - 24, 3, 24);
    ctx.strokeRect(x + 4.5, y - 24, 3, 24);
    ctx.beginPath();
    ctx.moveTo(x + 7, y - 24);
    ctx.quadraticCurveTo(x + 18, y - 18, x + 14, y - 8);
    ctx.stroke();
    ctx.restore();
  }

  // Everything in field units. view: { s, ox, oy, w, h } to know how far the scenery extends.
  // opts: { choices: [{ value, x, y, r, wrongAt }] }
  function drawField(ctx, s, view, time, dt, opts = {}) {
    const x0 = -view.ox / view.s - 2;
    const x1 = (view.w - view.ox) / view.s + 2;
    const y0 = -view.oy / view.s - 2;
    const y1 = (view.h - view.oy) / view.s + 2;
    events(s, time);
    const pos = layout(s);
    const placed = place(s, pos, time, dt);
    const pose = shipPose(s);
    const t = totals(s);
    const level = t.left === t.right;
    const sunset = s.status === 'done';
    backdrop(ctx, x0, x1, y0, view);
    drawGulls(ctx, x0, x1, time);
    drawWaterBack(ctx, x0, x1, time);

    // the ship and what's on deck
    const deck = [];
    for (const d of placed.values()) {
      if (d.place === 'left' || d.place === 'right') {
        deck.push({ x: d.x, y: d.y, size: d.size, angle: d.angle, c: d.c, o: { jiggle: d.jiggle } });
      }
    }
    deck.sort((a, b) => b.y - a.y);
    let m = 'calm';
    if (time < mood.dizzyUntil) m = 'dizzy';
    else if (s.status === 'level' || s.status === 'sail' || s.status === 'done' || s.status === 'choose') m = 'happy';
    else if (Math.abs(s.tilt) > 0.03 || Math.abs(s.tiltV) > 0.2) m = 'nervous';
    const look = clamp(s.tilt * 6, -1, 1);
    const h = hint(s);
    if (h && h.stage >= 1) {
      const lit = Math.floor((time * 2.5) % 14);
      for (const d of deck) d.o.lit = d.c.mystery ? undefined : lit;
    }
    if (sunset) {
      // the voyage is over: the ship sails past the skyline into the sunset, smaller and far off
      const k = ((s.statusT + 4) % 16) / 16;
      const sx = -130 + k * (FIELD_W + 260);
      const sc = 0.7;
      ctx.save();
      ctx.translate(sx, WATER_Y - 8 + Math.sin(time * 1.6) * 2);
      ctx.scale(sc, sc);
      ctx.translate(-pose.x, -pose.y);
      const p2 = { ...pose, angle: Math.sin(time * 1.3) * 0.03 };
      drawShip(ctx, p2, deck.map((d) => ({ ...d, angle: p2.angle })), { t: time, lamp: 'green', mood: 'happy', look: 0 });
      ctx.restore();
      drawWaterFront(ctx, x0, x1, time, 0);
      drawDock(ctx, x0, x1, y1);
      return;
    }
    const lamp = level && !s.held ? 'green' : 'off';
    drawShip(ctx, pose, deck, { t: time, lamp, mood: m, look });
    // where the steam comes from (the funnel top), for the toot
    const flx = -DECK_INNER + 8;
    const fly = -TOWER_H - 26;
    const fx = pose.x + flx * Math.cos(pose.angle) - fly * Math.sin(pose.angle);
    const fy = pose.y + flx * Math.sin(pose.angle) + fly * Math.cos(pose.angle);
    for (const sp of sprites) if (sp.kind === 'toot') [sp.fx, sp.fy] = [fx, fy];
    drawWaterFront(ctx, x0, x1, time, s.tiltV * 10);
    drawDock(ctx, x0, x1, y1);

    // parking spots on the dock, then the dock crates
    const ghostA = s.status === 'sail' ? Math.max(0, 1 - s.statusT * 2) : 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]);
    for (const c of s.crates) {
      if (c.fixed || s.status === 'sail') continue;
      const size = sizeOf(c);
      const p = dockSpot(s, c.slot, size);
      roundRect(ctx, p.x - size / 2, p.y - size / 2, size, size, size * 0.12);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    const choosing = s.status === 'choose';
    for (const d of placed.values()) {
      if (d.place !== 'dock' || d.hidden) continue;
      const glow = h && h.stage >= 2 && h.move && h.move.id === d.c.id ? 0.5 + 0.5 * Math.sin(time * 6) : 0;
      drawCrate(ctx, d.x, d.y, d.size, d.angle, d.c, {
        alpha: choosing ? 0.35 : ghostA, glow, jiggle: d.jiggle, lit: h && h.stage >= 1 ? Math.floor((time * 2.5) % 14) : undefined,
      });
    }
    // glow on a deck crate that should come off
    if (h && h.stage >= 2 && h.move) {
      const d = placed.get(h.move.id);
      if (d && d.place !== 'dock') {
        drawCrate(ctx, d.x, d.y, d.size, d.angle, d.c, { glow: 0.5 + 0.5 * Math.sin(time * 6), lit: Math.floor((time * 2.5) % 14) });
      }
    }
    drawSprites(ctx, time);
    drawTotals(ctx, s, time, h);
    // the difference as ghost dots, unless the finger is already showing a crate going there
    if (h && !(h.stage >= 2 && h.move && h.move.to === h.light)) drawGhost(ctx, s, placed, h, time);
    if (h && h.stage >= 2) drawHintFinger(ctx, s, placed, h, time);

    // the crate in the hand, lifted above the finger, with its shadow where it would land
    for (const d of placed.values()) {
      if (d.place !== 'held') continue;
      const fy = s.held.y;
      ctx.fillStyle = 'rgba(22,11,51,0.25)';
      ctx.beginPath();
      ctx.ellipse(s.held.x, fy + 6, d.size * 0.4, d.size * 0.12, 0, 0, TAU);
      ctx.fill();
      const over = d.y < SIDE_DROP_Y;
      if (over) {
        // a soft marker on the side it will land on
        const side = d.x < PIVOT_X ? -1 : 1;
        ctx.fillStyle = 'rgba(255,225,77,0.22)';
        ctx.save();
        ctx.translate(pose.x, pose.y);
        ctx.rotate(pose.angle);
        roundRect(ctx, side < 0 ? -DECK_END : DECK_INNER, -8, DECK_END - DECK_INNER, 10, 4);
        ctx.fill();
        ctx.restore();
      }
      drawCrate(ctx, d.x, d.y, d.size * 1.08, d.angle, d.c, {});
    }

    // number choices for a balanced mystery crate
    if (choosing && opts.choices) {
      for (const b of opts.choices) {
        const wt = time - (b.wrongAt ?? -9);
        const shake = wt < 0.5 ? Math.sin(wt * 40) * 8 * (1 - wt / 0.5) : 0;
        const pop = 1 + Math.max(0, 0.25 - s.statusT) * 1.5 + Math.sin(time * 4 + b.x) * 0.03;
        ctx.save();
        ctx.translate(b.x + shake, b.y);
        ctx.scale(pop, pop);
        ctx.fillStyle = 'rgba(22,11,51,0.35)';
        ctx.beginPath();
        ctx.arc(3, 6, b.r, 0, TAU);
        ctx.fill();
        ctx.fillStyle = b.wrongAt !== undefined && wt < 30 ? '#b9b3c9' : C.sun;
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, b.r, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = C.ink;
        ctx.font = font(b.r * 1.1);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(b.value), 0, 3);
        ctx.restore();
      }
    }
  }

  return { reset, drawField };
}

// ---------------------------------------------------------------------------------------------
// Menu art and the launcher tile
// ---------------------------------------------------------------------------------------------

// A little ship rocking with a crate on each side, centred at (x, y), `k` times field size.
export function drawToyShip(ctx, x, y, k, t, crates = [[3, 'left'], [5, 'right']]) {
  const angle = Math.sin(t * 1.4) * 0.12;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  const pose = { x: 0, y: 0, angle };
  const deck = [];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const count = { left: 0, right: 0 };
  crates.forEach(([n, side], i) => {
    const size = crateSize(n);
    const dir = side === 'left' ? -1 : 1;
    const col = count[side]++;
    const lx = dir * (DECK_INNER + COL_W / 2 + col * COL_W);
    const ly = -size / 2;
    deck.push({ x: lx * cos - ly * sin, y: lx * sin + ly * cos, size, angle, c: { n, id: i + 1, fixed: false }, o: {} });
  });
  drawShip(ctx, pose, deck, { t, lamp: Math.abs(angle) < 0.03 ? 'green' : 'off', mood: Math.abs(angle) > 0.06 ? 'nervous' : 'calm', look: angle * 6 });
  ctx.restore();
}

// The sunset harbour as a backdrop for the menu and picker, filling w x h.
export function drawHarbour(ctx, w, h, t) {
  const s = w / FIELD_W;
  const horizon = h * 0.62;
  ctx.save();
  ctx.translate(0, horizon - WATER_Y * s);
  ctx.scale(s, s);
  const y0 = -(horizon - WATER_Y * s) / s;
  paintBackdrop(ctx, 0, FIELD_W, y0);
  drawGulls(ctx, 0, FIELD_W, t);
  drawWaterBack(ctx, 0, FIELD_W, t);
  const yb = (h - (horizon - WATER_Y * s)) / s;
  ctx.fillStyle = '#0a4f80';
  ctx.fillRect(0, 600, FIELD_W, Math.max(0, yb - 600));
  ctx.restore();
  return { s, toY: (fy) => horizon - WATER_Y * s + fy * s };
}

export function drawFrontWater(ctx, w, h, t) {
  const s = w / FIELD_W;
  const horizon = h * 0.62;
  ctx.save();
  ctx.translate(0, horizon - WATER_Y * s);
  ctx.scale(s, s);
  drawWaterFront(ctx, 0, FIELD_W, t, Math.sin(t * 1.4) * 4);
  const yb = (h - (horizon - WATER_Y * s)) / s;
  ctx.fillStyle = 'rgba(16,150,180,0.82)';
  ctx.fillRect(0, 600, FIELD_W, Math.max(0, yb - 600));
  ctx.restore();
}

export function drawTile(ctx, x, y, w, h, time) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, y, 0, y + h * 0.66);
  for (const [k, c] of SKY_STOPS) sky.addColorStop(k, c);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  // sun and a few towers
  ctx.fillStyle = C.sun;
  ctx.beginPath();
  ctx.arc(x + w * 0.72, y + h * 0.6, w * 0.17, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#5a2380';
  for (let i = 0; i < 8; i++) {
    const bw = w * 0.1;
    const bh = h * (0.08 + hash(i + 3) * 0.2);
    ctx.fillRect(x + i * w * 0.13, y + h * 0.66 - bh, bw, bh);
  }
  // crane
  ctx.strokeStyle = '#e8546a';
  ctx.lineWidth = Math.max(2, w * 0.02);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.1, y + h * 0.66);
  ctx.lineTo(x + w * 0.1, y + h * 0.22);
  ctx.lineTo(x + w * 0.5, y + h * 0.22);
  ctx.stroke();
  const sea = ctx.createLinearGradient(0, y + h * 0.66, 0, y + h);
  sea.addColorStop(0, '#1bbcc8');
  sea.addColorStop(1, '#0a4f80');
  ctx.fillStyle = sea;
  ctx.fillRect(x, y + h * 0.66, w, h * 0.34);
  // the ship rocking, crates swapping sides now and then
  const phase = Math.floor(time / 3) % 2;
  const crates = phase ? [[4, 'left'], [2, 'right'], [2, 'right']] : [[4, 'left'], [6, 'right']];
  drawToyShip(ctx, x + w * 0.5, y + h * 0.66, w / 470, time, crates);
  ctx.fillStyle = 'rgba(16,150,180,0.8)';
  ctx.fillRect(x, y + h * 0.7, w, h * 0.3);
  ctx.strokeStyle = 'rgba(201,251,255,0.8)';
  ctx.lineWidth = Math.max(1.5, w * 0.012);
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const xx = x + (i / 20) * w;
    const yy = y + h * 0.7 + Math.sin(i * 1.3 + time * 2.4) * h * 0.008;
    if (i === 0) ctx.moveTo(xx, yy);
    else ctx.lineTo(xx, yy);
  }
  ctx.stroke();
  ctx.restore();
}
