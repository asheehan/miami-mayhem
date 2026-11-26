// Shared drawing for the screens: fonts, rounded boxes, outlined numbers, buttons, every icon
// (Riley reads pictures, not words), the element ring, coins and stat bars.
import { ELEMENT_COLOUR } from './parts.js';
import { INK, drawStarShape } from './draw-monster.js';

export const C = {
  ink: INK,
  white: '#ffffff',
  sun: '#ffe14d',
  pink: '#ff4fa3',
  orange: '#ff8a3d',
  green: '#43d96b',
  greenDark: '#22a447',
  red: '#ff4b5c',
  sky: '#6fd6ff',
  purple: '#6a3fd1',
  night: '#2b1055',
  card: '#fff6e0',
  grey: '#b9b3c9',
  heart: '#ff4f7a',
  bonk: '#ff8a3d',
  guard: '#5a8dff',
  zoom: '#ffcf1f',
};
export const TAU = Math.PI * 2;

export const font = (px, weight = 900) => `${weight} ${Math.round(px)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
export const hit = (b, x, y, pad = 0) => b && x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad;

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

export function outlined(ctx, text, x, y, px, fill = C.white, maxW = 0, align = 'center') {
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
  ctx.lineWidth = Math.max(2, px * 0.22);
  ctx.strokeStyle = C.ink;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

// A chunky card or button: shadow, fill, ink edge. press: 0..1 pushes it down.
export function panel(ctx, x, y, w, h, fill, { r = Math.min(22, h * 0.3), press = 0, lw = 4, shadow = true } = {}) {
  const dy = press * 4;
  if (shadow) {
    ctx.fillStyle = 'rgba(22,11,51,0.35)';
    roundRect(ctx, x, y + 6, w, h, r);
    ctx.fill();
  }
  ctx.fillStyle = fill;
  roundRect(ctx, x, y + dy, w, h, r);
  ctx.fill();
  if (lw) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  }
  // a soft shine along the top
  ctx.save();
  roundRect(ctx, x, y + dy, w, h, r);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(x, y + dy, w, h * 0.42);
  ctx.restore();
}

// Square see-through icon buttons in the top corners: the same look as the other games.
export function cornerIcon(ctx, b, icon) {
  ctx.fillStyle = 'rgba(22,11,51,0.32)';
  roundRect(ctx, b.x, b.y, b.w, b.h, b.w * 0.24);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.stroke();
  drawIcon(ctx, icon, b.x + b.w / 2, b.y + b.h / 2, b.w * 0.3, C.white);
}

// ---------- icons ----------

// Draws an icon centred on (x, y) about 2s across. colour is for the simple line icons.
export function drawIcon(ctx, kind, x, y, s, colour = C.ink, t = 0) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (kind) {
    case 'home':
      ctx.beginPath();
      ctx.moveTo(x - s * 1.05, y - s * 0.05);
      ctx.lineTo(x, y - s);
      ctx.lineTo(x + s * 1.05, y - s * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(x - s * 0.7, y - s * 0.1, s * 1.4, s * 0.95);
      break;
    case 'back':
      ctx.lineWidth = s * 0.42;
      ctx.beginPath();
      ctx.moveTo(x + s * 0.35, y - s * 0.8);
      ctx.lineTo(x - s * 0.45, y);
      ctx.lineTo(x + s * 0.35, y + s * 0.8);
      ctx.stroke();
      break;
    case 'next':
      ctx.lineWidth = s * 0.42;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.35, y - s * 0.8);
      ctx.lineTo(x + s * 0.45, y);
      ctx.lineTo(x - s * 0.35, y + s * 0.8);
      ctx.stroke();
      break;
    case 'check':
      ctx.lineWidth = s * 0.45;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.8, y);
      ctx.lineTo(x - s * 0.2, y + s * 0.6);
      ctx.lineTo(x + s * 0.85, y - s * 0.6);
      ctx.stroke();
      break;
    case 'cross':
      ctx.lineWidth = s * 0.4;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.6, y - s * 0.6);
      ctx.lineTo(x + s * 0.6, y + s * 0.6);
      ctx.moveTo(x + s * 0.6, y - s * 0.6);
      ctx.lineTo(x - s * 0.6, y + s * 0.6);
      ctx.stroke();
      break;
    case 'dice': {
      const r = s * 0.95;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.2 + Math.sin(t * 3) * 0.05);
      ctx.fillStyle = C.white;
      roundRect(ctx, -r, -r, r * 2, r * 2, r * 0.35);
      ctx.fill();
      ctx.lineWidth = Math.max(2, s * 0.14);
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      ctx.fillStyle = C.pink;
      for (const [a, b] of [[-0.5, -0.5], [0.5, -0.5], [0, 0], [-0.5, 0.5], [0.5, 0.5]]) {
        ctx.beginPath();
        ctx.arc(a * r, b * r, r * 0.17, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'reroll': {
      // a name tag with a little round arrow
      ctx.fillStyle = C.white;
      ctx.lineWidth = Math.max(2, s * 0.14);
      ctx.strokeStyle = C.ink;
      ctx.beginPath();
      ctx.arc(x, y, s * 0.75, -0.3, Math.PI * 1.45);
      ctx.lineWidth = s * 0.28;
      ctx.strokeStyle = colour;
      ctx.stroke();
      const a = -0.3;
      const ax = x + Math.cos(a) * s * 0.75;
      const ay = y + Math.sin(a) * s * 0.75;
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.moveTo(ax - s * 0.4, ay - s * 0.05);
      ctx.lineTo(ax + s * 0.35, ay - s * 0.1);
      ctx.lineTo(ax + s * 0.02, ay + s * 0.45);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'book':
      ctx.lineWidth = s * 0.22;
      ctx.fillStyle = C.white;
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.6);
      ctx.quadraticCurveTo(x - s * 0.6, y - s * 0.95, x - s * 1.1, y - s * 0.6);
      ctx.lineTo(x - s * 1.1, y + s * 0.8);
      ctx.quadraticCurveTo(x - s * 0.6, y + s * 0.5, x, y + s * 0.8);
      ctx.quadraticCurveTo(x + s * 0.6, y + s * 0.5, x + s * 1.1, y + s * 0.8);
      ctx.lineTo(x + s * 1.1, y - s * 0.6);
      ctx.quadraticCurveTo(x + s * 0.6, y - s * 0.95, x, y - s * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.6);
      ctx.lineTo(x, y + s * 0.8);
      ctx.stroke();
      break;
    case 'egg': {
      ctx.fillStyle = '#fff3d6';
      ctx.lineWidth = Math.max(2, s * 0.14);
      ctx.strokeStyle = C.ink;
      ctx.beginPath();
      ctx.ellipse(x, y + s * 0.1, s * 0.72, s * 0.92, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = C.pink;
      for (const [a, b, r] of [[-0.3, -0.2, 0.18], [0.3, 0.25, 0.22], [-0.15, 0.5, 0.12]]) {
        ctx.beginPath();
        ctx.arc(x + a * s, y + b * s, r * s, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = C.sun;
      drawStarShape(ctx, x + s * 0.75, y - s * 0.75, s * 0.38, C.sun, Math.max(1.5, s * 0.1));
      break;
    }
    case 'fist': {
      ctx.lineWidth = Math.max(2, s * 0.14);
      ctx.strokeStyle = C.ink;
      ctx.fillStyle = '#ffb07a';
      roundRect(ctx, x - s * 0.8, y - s * 0.55, s * 1.5, s * 1.2, s * 0.4);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x - s * 0.55, y + s * 0.05, s * 0.32, s * 0.5, 0.4, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = Math.max(1.5, s * 0.09);
      for (const k of [-0.15, 0.2]) {
        ctx.beginPath();
        ctx.moveTo(x + k * s, y - s * 0.55);
        ctx.lineTo(x + k * s, y - s * 0.15);
        ctx.stroke();
      }
      // swoosh lines
      ctx.lineWidth = Math.max(2, s * 0.14);
      ctx.strokeStyle = colour === C.ink ? C.ink : colour;
      for (const k of [-0.4, 0, 0.4]) {
        ctx.beginPath();
        ctx.moveTo(x + s * 0.95, y + k * s);
        ctx.lineTo(x + s * 1.3, y + k * s * 1.2);
        ctx.stroke();
      }
      break;
    }
    case 'sun':
    case 'ice':
    case 'wave':
      drawElement(ctx, kind, x, y, s);
      break;
    case 'bubble':
      ctx.fillStyle = 'rgba(160,230,255,0.85)';
      ctx.lineWidth = Math.max(2, s * 0.13);
      ctx.strokeStyle = C.ink;
      ctx.beginPath();
      ctx.arc(x, y, s, 0, TAU);
      ctx.fill();
      ctx.stroke();
      drawHeart(ctx, x, y + s * 0.08, s * 0.55);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = s * 0.14;
      ctx.beginPath();
      ctx.arc(x, y, s * 0.72, Math.PI * 1.1, Math.PI * 1.45);
      ctx.stroke();
      break;
    case 'special':
      drawStarShape(ctx, x, y, s * 1.1, C.sun, Math.max(2, s * 0.13));
      drawStarShape(ctx, x, y, s * 0.45, '#ff7ab8', 0);
      break;
    case 'heart':
    case 'hp':
      drawHeart(ctx, x, y, s);
      break;
    case 'bonk':
      drawIcon(ctx, 'fist', x - s * 0.15, y, s * 0.85, C.ink);
      break;
    case 'guard':
      ctx.fillStyle = C.guard;
      ctx.lineWidth = Math.max(2, s * 0.14);
      ctx.strokeStyle = C.ink;
      ctx.beginPath();
      ctx.moveTo(x, y - s);
      ctx.quadraticCurveTo(x + s * 0.5, y - s * 0.75, x + s * 0.9, y - s * 0.78);
      ctx.quadraticCurveTo(x + s * 0.95, y + s * 0.5, x, y + s);
      ctx.quadraticCurveTo(x - s * 0.95, y + s * 0.5, x - s * 0.9, y - s * 0.78);
      ctx.quadraticCurveTo(x - s * 0.5, y - s * 0.75, x, y - s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.7);
      ctx.lineTo(x, y + s * 0.7);
      ctx.quadraticCurveTo(x - s * 0.65, y + s * 0.3, x - s * 0.65, y - s * 0.55);
      ctx.closePath();
      ctx.fill();
      break;
    case 'zoom':
      ctx.fillStyle = C.zoom;
      ctx.lineWidth = Math.max(2, s * 0.14);
      ctx.strokeStyle = C.ink;
      ctx.beginPath();
      ctx.moveTo(x + s * 0.25, y - s);
      ctx.lineTo(x - s * 0.6, y + s * 0.15);
      ctx.lineTo(x - s * 0.02, y + s * 0.15);
      ctx.lineTo(x - s * 0.3, y + s);
      ctx.lineTo(x + s * 0.65, y - s * 0.2);
      ctx.lineTo(x + s * 0.05, y - s * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'coin':
      drawCoin(ctx, x, y, s);
      break;
    case 'lock':
      ctx.lineWidth = s * 0.3;
      ctx.strokeStyle = colour;
      ctx.beginPath();
      ctx.arc(x, y - s * 0.3, s * 0.48, Math.PI, 0);
      ctx.lineTo(x + s * 0.48, y);
      ctx.moveTo(x - s * 0.48, y - s * 0.3);
      ctx.lineTo(x - s * 0.48, y);
      ctx.stroke();
      roundRect(ctx, x - s * 0.8, y - s * 0.1, s * 1.6, s * 1.1, s * 0.25);
      ctx.fill();
      break;
    case 'crown':
      ctx.fillStyle = '#ffd23f';
      ctx.lineWidth = Math.max(2, s * 0.14);
      ctx.strokeStyle = C.ink;
      ctx.beginPath();
      ctx.moveTo(x - s, y + s * 0.6);
      ctx.lineTo(x - s * 1.05, y - s * 0.55);
      ctx.lineTo(x - s * 0.45, y);
      ctx.lineTo(x, y - s * 0.85);
      ctx.lineTo(x + s * 0.45, y);
      ctx.lineTo(x + s * 1.05, y - s * 0.55);
      ctx.lineTo(x + s, y + s * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ff4f8a';
      ctx.beginPath();
      ctx.arc(x, y + s * 0.15, s * 0.2, 0, TAU);
      ctx.fill();
      break;
    case 'up':
    case 'down': {
      const d = kind === 'up' ? -1 : 1;
      ctx.fillStyle = kind === 'up' ? C.green : C.red;
      ctx.lineWidth = Math.max(2, s * 0.14);
      ctx.strokeStyle = C.ink;
      ctx.beginPath();
      ctx.moveTo(x, y + d * s);
      ctx.lineTo(x + s * 0.9, y);
      ctx.lineTo(x + s * 0.38, y);
      ctx.lineTo(x + s * 0.38, y - d * s);
      ctx.lineTo(x - s * 0.38, y - d * s);
      ctx.lineTo(x - s * 0.38, y);
      ctx.lineTo(x - s * 0.9, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'squad':
      // three little monster heads
      for (const [dx, dy, c] of [[-0.75, 0.15, '#ff6fb5'], [0.75, 0.15, '#62baff'], [0, -0.15, '#9fe44c']]) {
        ctx.fillStyle = c;
        ctx.lineWidth = Math.max(2, s * 0.12);
        ctx.strokeStyle = C.ink;
        ctx.beginPath();
        ctx.ellipse(x + dx * s, y + dy * s + s * 0.2, s * 0.55, s * 0.62, 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = C.white;
        for (const e of [-0.2, 0.2]) {
          ctx.beginPath();
          ctx.arc(x + (dx + e) * s, y + dy * s + s * 0.05, s * 0.15, 0, TAU);
          ctx.fill();
          ctx.stroke();
        }
      }
      break;
    case 'zzz':
      ctx.font = font(s * 1.1);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('z', x - s * 0.4, y + s * 0.3);
      ctx.font = font(s * 0.8);
      ctx.fillText('z', x + s * 0.3, y - s * 0.3);
      break;
    case 'plus':
      ctx.lineWidth = s * 0.4;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.7, y);
      ctx.lineTo(x + s * 0.7, y);
      ctx.moveTo(x, y - s * 0.7);
      ctx.lineTo(x, y + s * 0.7);
      ctx.stroke();
      break;
    default:
      if (kind.startsWith('tab-') && TAB_ICONS[kind.slice(4)]) TAB_ICONS[kind.slice(4)](ctx, x, y, s);
  }
  ctx.restore();
}

export function drawHeart(ctx, x, y, s, fill = C.heart) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.lineWidth = Math.max(2, s * 0.14);
  ctx.strokeStyle = C.ink;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.85);
  ctx.bezierCurveTo(x - s * 1.3, y - s * 0.05, x - s * 0.7, y - s * 1.05, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.7, y - s * 1.05, x + s * 1.3, y - s * 0.05, x, y + s * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(x - s * 0.42, y - s * 0.32, s * 0.18, s * 0.12, -0.6, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// The money: a gold coin with a palm tree stamped on it.
export function drawCoin(ctx, x, y, r) {
  ctx.save();
  ctx.fillStyle = '#ffcf33';
  ctx.lineWidth = Math.max(1.5, r * 0.16);
  ctx.strokeStyle = C.ink;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#e0a200';
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.72, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = '#b97c00';
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.05, y + r * 0.45);
  ctx.quadraticCurveTo(x + r * 0.05, y, x + r * 0.08, y - r * 0.3);
  ctx.stroke();
  for (const a of [-2.6, -1.6, -0.6]) {
    ctx.beginPath();
    ctx.moveTo(x + r * 0.08, y - r * 0.3);
    ctx.quadraticCurveTo(x + r * 0.08 + Math.cos(a) * r * 0.3, y - r * 0.3 + Math.sin(a) * r * 0.35, x + r * 0.08 + Math.cos(a + 0.4) * r * 0.45, y - r * 0.3 + Math.sin(a + 0.6) * r * 0.25 + r * 0.1);
    ctx.stroke();
  }
  ctx.restore();
}

// The three element pictures: a smiling sun, an ice pop, a wave.
export function drawElement(ctx, el, x, y, s) {
  ctx.save();
  ctx.lineWidth = Math.max(1.5, s * 0.13);
  ctx.strokeStyle = C.ink;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (el === 'sun') {
    ctx.fillStyle = ELEMENT_COLOUR.sun;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      const r = i % 2 ? s * 0.68 : s * 0.98;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath();
    ctx.arc(x, y, s * 0.55, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(x - s * 0.18, y - s * 0.08, s * 0.07, 0, TAU);
    ctx.arc(x + s * 0.18, y - s * 0.08, s * 0.07, 0, TAU);
    ctx.fill();
    ctx.lineWidth = Math.max(1, s * 0.08);
    ctx.beginPath();
    ctx.arc(x, y + s * 0.05, s * 0.2, 0.3, Math.PI - 0.3);
    ctx.stroke();
  } else if (el === 'ice') {
    // an ice pop on a stick
    ctx.fillStyle = '#d9a36b';
    roundRect(ctx, x - s * 0.13, y + s * 0.35, s * 0.26, s * 0.65, s * 0.1);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = ELEMENT_COLOUR.ice;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.55, y + s * 0.45);
    ctx.lineTo(x - s * 0.55, y - s * 0.5);
    ctx.arc(x, y - s * 0.5, s * 0.55, Math.PI, 0);
    ctx.lineTo(x + s * 0.55, y + s * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(1.5, s * 0.12);
    ctx.beginPath();
    ctx.moveTo(x - s * 0.28, y + s * 0.2);
    ctx.lineTo(x - s * 0.28, y - s * 0.55);
    ctx.stroke();
    // a snowflake sparkle
    ctx.strokeStyle = C.white;
    ctx.lineWidth = Math.max(1, s * 0.08);
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(x + s * 0.18 + Math.cos(a) * s * 0.2, y - s * 0.2 + Math.sin(a) * s * 0.2);
      ctx.lineTo(x + s * 0.18 - Math.cos(a) * s * 0.2, y - s * 0.2 - Math.sin(a) * s * 0.2);
      ctx.stroke();
    }
  } else {
    // a curling wave
    ctx.fillStyle = ELEMENT_COLOUR.wave;
    ctx.beginPath();
    ctx.moveTo(x - s, y + s * 0.8);
    ctx.quadraticCurveTo(x - s * 0.95, y - s * 0.6, x + s * 0.1, y - s * 0.85);
    ctx.quadraticCurveTo(x + s * 0.95, y - s * 0.9, x + s * 0.95, y - s * 0.15);
    ctx.quadraticCurveTo(x + s * 0.55, y - s * 0.5, x + s * 0.15, y - s * 0.2);
    ctx.quadraticCurveTo(x + s * 0.5, y - s * 0.05, x + s * 0.4, y + s * 0.3);
    ctx.quadraticCurveTo(x + s * 0.8, y + s * 0.55, x + s, y + s * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.arc(x + s * 0.65, y - s * 0.55, s * 0.13, 0, TAU);
    ctx.arc(x - s * 0.35, y - s * 0.3, s * 0.09, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// The element ring as a little picture: sun -> ice -> wave -> sun, each beating the next.
export function drawElementRing(ctx, x, y, r, highlight = null) {
  const pos = { sun: -Math.PI / 2, ice: Math.PI / 6, wave: (Math.PI * 5) / 6 };
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.beginPath();
  ctx.arc(x, y, r * 1.55, 0, TAU);
  ctx.fill();
  ctx.stroke();
  const order = ['sun', 'ice', 'wave'];
  order.forEach((el, i) => {
    const next = order[(i + 1) % 3];
    const a0 = pos[el] + 0.48;
    const a1 = pos[next] - 0.48 + (next === 'sun' ? TAU : 0);
    ctx.strokeStyle = highlight === el ? C.greenDark : C.ink;
    ctx.lineWidth = Math.max(2, r * (highlight === el ? 0.13 : 0.08));
    ctx.beginPath();
    ctx.arc(x, y, r, a0, a1);
    ctx.stroke();
    const ax = x + Math.cos(a1) * r;
    const ay = y + Math.sin(a1) * r;
    const d = a1 + Math.PI / 2;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(ax + Math.cos(d) * r * 0.22, ay + Math.sin(d) * r * 0.22);
    ctx.lineTo(ax + Math.cos(d + 2.4) * r * 0.18, ay + Math.sin(d + 2.4) * r * 0.18);
    ctx.lineTo(ax + Math.cos(d - 2.4) * r * 0.18, ay + Math.sin(d - 2.4) * r * 0.18);
    ctx.closePath();
    ctx.fill();
  });
  for (const el of order) drawElement(ctx, el, x + Math.cos(pos[el]) * r, y + Math.sin(pos[el]) * r, r * 0.42);
  ctx.restore();
}

// ---------- maker tab icons ----------

const TAB_ICONS = {
  body(ctx, x, y, s) {
    ctx.fillStyle = '#ff6fb5';
    ctx.lineWidth = Math.max(2, s * 0.14);
    ctx.strokeStyle = C.ink;
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.bezierCurveTo(x + s * 1.1, y - s, x + s, y + s * 0.9, x, y + s * 0.85);
    ctx.bezierCurveTo(x - s, y + s * 0.9, x - s * 1.1, y - s, x, y - s);
    ctx.fill();
    ctx.stroke();
  },
  colour(ctx, x, y, s) {
    const cols = ['#ff4f6d', '#ffde45', '#4fe3b4', '#5a73ff'];
    cols.forEach((c, i) => {
      const a = -Math.PI / 2 + (i * TAU) / 4;
      ctx.fillStyle = c;
      ctx.lineWidth = Math.max(1.5, s * 0.1);
      ctx.strokeStyle = C.ink;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * s * 0.48, y + Math.sin(a) * s * 0.48, s * 0.42, 0, TAU);
      ctx.fill();
      ctx.stroke();
    });
  },
  pattern(ctx, x, y, s) {
    ctx.fillStyle = '#62baff';
    ctx.lineWidth = Math.max(2, s * 0.14);
    ctx.strokeStyle = C.ink;
    ctx.beginPath();
    ctx.arc(x, y, s * 0.95, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#ffe14d';
    for (const [a, b, r] of [[-0.4, -0.4, 0.28], [0.45, -0.1, 0.22], [-0.1, 0.5, 0.25], [0.5, 0.6, 0.15]]) {
      ctx.beginPath();
      ctx.arc(x + a * s, y + b * s, r * s, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x, y, s * 0.95, 0, TAU);
    ctx.stroke();
  },
  eyes(ctx, x, y, s) {
    for (const d of [-0.5, 0.5]) {
      ctx.fillStyle = C.white;
      ctx.lineWidth = Math.max(2, s * 0.13);
      ctx.strokeStyle = C.ink;
      ctx.beginPath();
      ctx.arc(x + d * s, y, s * 0.48, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.arc(x + d * s + s * 0.12, y + s * 0.05, s * 0.22, 0, TAU);
      ctx.fill();
    }
  },
  mouth(ctx, x, y, s) {
    ctx.fillStyle = '#6b1d3c';
    ctx.lineWidth = Math.max(2, s * 0.13);
    ctx.strokeStyle = C.ink;
    ctx.beginPath();
    ctx.moveTo(x - s, y - s * 0.3);
    ctx.quadraticCurveTo(x, y - s * 0.1, x + s, y - s * 0.3);
    ctx.quadraticCurveTo(x + s * 0.8, y + s * 0.8, x, y + s * 0.8);
    ctx.quadraticCurveTo(x - s * 0.8, y + s * 0.8, x - s, y - s * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.white;
    ctx.fillRect(x - s * 0.5, y - s * 0.25, s * 0.35, s * 0.3);
    ctx.fillRect(x + s * 0.15, y - s * 0.25, s * 0.35, s * 0.3);
  },
  top(ctx, x, y, s) {
    for (const d of [-1, 1]) {
      ctx.fillStyle = '#fff0c8';
      ctx.lineWidth = Math.max(2, s * 0.13);
      ctx.strokeStyle = C.ink;
      ctx.beginPath();
      ctx.moveTo(x + d * s * 0.15, y + s * 0.8);
      ctx.quadraticCurveTo(x + d * s * 0.2, y - s * 0.2, x + d * s * 0.85, y - s * 0.9);
      ctx.quadraticCurveTo(x + d * s * 0.9, y + s * 0.2, x + d * s * 0.85, y + s * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  },
  arms(ctx, x, y, s) {
    ctx.fillStyle = '#9fe44c';
    ctx.lineWidth = Math.max(2, s * 0.13);
    ctx.strokeStyle = C.ink;
    ctx.beginPath();
    ctx.moveTo(x - s, y + s * 0.6);
    ctx.quadraticCurveTo(x - s * 0.6, y - s * 0.4, x, y - s * 0.5);
    ctx.quadraticCurveTo(x + s * 0.3, y - s * 0.9, x + s * 0.5, y - s * 0.4);
    ctx.quadraticCurveTo(x + s * 0.2, y - s * 0.1, x - s * 0.2, y);
    ctx.quadraticCurveTo(x - s * 0.4, y + s * 0.5, x - s * 0.4, y + s * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + s * 0.65, y - s * 0.55, s * 0.36, 0, TAU);
    ctx.fill();
    ctx.stroke();
  },
  legs(ctx, x, y, s) {
    ctx.fillStyle = '#ffa83a';
    ctx.lineWidth = Math.max(2, s * 0.13);
    ctx.strokeStyle = C.ink;
    roundRect(ctx, x - s * 0.35, y - s, s * 0.6, s * 1.3, s * 0.25);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x + s * 0.15, y + s * 0.5, s * 0.8, s * 0.4, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  },
  back(ctx, x, y, s) {
    ctx.fillStyle = C.white;
    ctx.lineWidth = Math.max(2, s * 0.13);
    ctx.strokeStyle = C.ink;
    ctx.beginPath();
    ctx.moveTo(x - s, y + s * 0.5);
    ctx.quadraticCurveTo(x - s * 0.5, y - s * 0.9, x + s, y - s * 0.8);
    ctx.quadraticCurveTo(x + s * 0.7, y - s * 0.4, x + s * 0.9, y - s * 0.2);
    ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.05, x + s * 0.6, y + s * 0.3);
    ctx.quadraticCurveTo(x, y + s * 0.3, x - s, y + s * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  },
  element(ctx, x, y, s) {
    drawElement(ctx, 'sun', x - s * 0.5, y - s * 0.35, s * 0.5);
    drawElement(ctx, 'ice', x + s * 0.55, y - s * 0.3, s * 0.5);
    drawElement(ctx, 'wave', x, y + s * 0.5, s * 0.5);
  },
};

// ---------- small pieces ----------

// A row of pips: filled out of max, in a colour.
export function drawPips(ctx, x, y, w, h, filled, max, colour) {
  const gap = Math.max(2, w * 0.02);
  const pw = (w - gap * (max - 1)) / max;
  for (let i = 0; i < max; i++) {
    ctx.fillStyle = i < filled ? colour : 'rgba(42,22,54,0.18)';
    roundRect(ctx, x + i * (pw + gap), y, pw, h, Math.min(pw, h) * 0.35);
    ctx.fill();
    if (i < filled) {
      ctx.lineWidth = Math.max(1.5, h * 0.12);
      ctx.strokeStyle = C.ink;
      ctx.stroke();
    }
  }
}

export const STAT_COLOUR = { hp: C.heart, bonk: C.bonk, guard: C.guard, zoom: C.zoom };

// A coin count pill, right-aligned at x.
export function coinPill(ctx, x, y, h, n) {
  const label = String(n);
  const px = h * 0.55;
  ctx.font = font(px);
  const tw = ctx.measureText(label).width;
  const w = tw + h * 1.45;
  ctx.fillStyle = 'rgba(22,11,51,0.5)';
  roundRect(ctx, x - w, y, w, h, h / 2);
  ctx.fill();
  drawCoin(ctx, x - w + h * 0.5, y + h / 2, h * 0.34);
  outlined(ctx, label, x - w + h * 0.95 + tw / 2, y + h / 2 + 1, px, C.white);
  return w;
}

// A health bar with numbers: hp / max.
export function hpBar(ctx, x, y, w, h, hp, max, shown = hp) {
  const k = Math.max(0, Math.min(1, shown / max));
  ctx.fillStyle = 'rgba(22,11,51,0.55)';
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = k > 0.5 ? C.green : k > 0.25 ? '#ffc93d' : C.red;
  if (k > 0) {
    roundRect(ctx, x + 2, y + 2, Math.max(h - 4, (w - 4) * k), h - 4, (h - 4) / 2);
    ctx.fill();
  }
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  outlined(ctx, `${Math.round(shown)}`, x + w / 2, y + h / 2 + 1, h * 0.78, C.white);
}

// Confetti falling over the whole screen, t seconds in.
export function confetti(ctx, w, h, t, n = 70) {
  const colours = [C.pink, C.sun, C.sky, C.white, C.orange, C.green];
  for (let i = 0; i < n; i++) {
    const speed = 90 + ((i * 53) % 80);
    const x = ((i * 0.137) % 1) * w + Math.sin(t * 2 + i) * 20;
    const y = ((t * speed + i * 41) % (h + 40)) - 20;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 3 + i);
    ctx.fillStyle = colours[i % colours.length];
    ctx.fillRect(-5, -3, 10, 6);
    ctx.restore();
  }
}

// Snacks for befriending: a mango, a guava pastry, a coconut with a straw.
export const SNACKS = ['mango', 'pastry', 'coconut'];
export function drawSnack(ctx, kind, x, y, s) {
  ctx.save();
  ctx.lineWidth = Math.max(2, s * 0.1);
  ctx.strokeStyle = C.ink;
  ctx.lineJoin = 'round';
  if (kind === 'mango') {
    ctx.fillStyle = '#ffb02e';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.1, s * 0.85, s * 0.68, -0.4, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff5f6d';
    ctx.beginPath();
    ctx.ellipse(x + s * 0.35, y - s * 0.12, s * 0.35, s * 0.3, -0.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#4cc85a';
    ctx.beginPath();
    ctx.ellipse(x + s * 0.55, y - s * 0.65, s * 0.35, s * 0.15, -0.6, 0, TAU);
    ctx.fill();
    ctx.stroke();
  } else if (kind === 'pastry') {
    ctx.fillStyle = '#f2c46b';
    roundRect(ctx, x - s * 0.9, y - s * 0.55, s * 1.8, s * 1.1, s * 0.3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff5f8a';
    roundRect(ctx, x - s * 0.5, y - s * 0.25, s, s * 0.5, s * 0.2);
    ctx.fill();
    ctx.strokeStyle = '#d99a3a';
    ctx.lineWidth = Math.max(1.5, s * 0.07);
    for (const k of [-0.6, 0.6]) {
      ctx.beginPath();
      ctx.moveTo(x + k * s, y - s * 0.4);
      ctx.lineTo(x + k * s, y + s * 0.4);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#8a5a35';
    ctx.beginPath();
    ctx.arc(x, y + s * 0.1, s * 0.8, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff6e0';
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.35, s * 0.55, s * 0.2, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = Math.max(4, s * 0.2);
    ctx.beginPath();
    ctx.moveTo(x + s * 0.1, y - s * 0.35);
    ctx.lineTo(x + s * 0.45, y - s * 1.05);
    ctx.stroke();
    ctx.strokeStyle = '#ff4fa3';
    ctx.lineWidth = Math.max(2, s * 0.12);
    ctx.stroke();
  }
  ctx.restore();
}

// A big picture button: a coloured card with an icon (and an optional number underneath or
// beside it). opts: { fill, icon, number, coin (show the number as a price), dim, pulse, t }
export function bigButton(ctx, b, opts = {}) {
  const { fill = C.sun, icon = null, number = null, coin = false, dim = false, pulse = 0, t = 0, iconScale = 1 } = opts;
  ctx.save();
  if (pulse) {
    const k = 1 + Math.sin(t * 5) * 0.03 * pulse;
    ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
    ctx.scale(k, k);
    ctx.translate(-b.x - b.w / 2, -b.y - b.h / 2);
  }
  ctx.globalAlpha *= dim ? 0.55 : 1;
  panel(ctx, b.x, b.y, b.w, b.h, dim ? C.grey : fill, { r: Math.min(22, b.h * 0.3) });
  const s = Math.min(b.w, b.h) * 0.26 * iconScale;
  const hasNum = number != null;
  const wide = b.w > b.h * 1.6;
  if (hasNum && wide) {
    // icon, then the number (with a coin when it is a price), centred together
    const px = Math.min(b.h * 0.42, b.w * 0.3);
    ctx.font = font(px);
    const label = String(number);
    const tw = ctx.measureText(label).width;
    const iw = icon ? s * 2.4 : 0;
    const cw = coin ? px * 1.05 : 0;
    const gap = s * 0.5;
    let x = b.x + (b.w - (iw + (icon ? gap : 0) + cw + tw)) / 2;
    const cy = b.y + b.h / 2;
    if (icon) {
      drawIcon(ctx, icon, x + iw / 2, cy, s, C.ink, t);
      x += iw + gap;
    }
    if (coin) {
      drawCoin(ctx, x + px * 0.42, cy, px * 0.42);
      x += cw;
    }
    outlined(ctx, label, x + tw / 2, cy + 1, px, C.white);
  } else {
    const iy = hasNum ? b.y + b.h * 0.38 : b.y + b.h / 2;
    if (icon) drawIcon(ctx, icon, b.x + b.w / 2, iy, s, C.ink, t);
    if (hasNum) {
      const px = Math.min(b.h * 0.26, b.w * 0.3);
      const nx = b.x + b.w / 2;
      const ny = b.y + b.h * 0.78;
      if (coin) {
        ctx.font = font(px);
        const tw = ctx.measureText(String(number)).width;
        drawCoin(ctx, nx - tw / 2 - px * 0.45, ny, px * 0.42);
        outlined(ctx, String(number), nx + px * 0.2, ny, px, C.white);
      } else outlined(ctx, String(number), nx, ny, px, C.white);
    }
  }
  ctx.restore();
}
