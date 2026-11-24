// Buttons and their little pictures. Nothing a 6-year-old needs to read: every button is a
// picture. Drawing only.
import { C, TAU, roundRect, circle, ellipse, star, heart, shade } from './art.js';

export const hit = (b, x, y, pad = 0) => x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad;

// A chunky button: shadow, fill, ink rim, a picture. b: { x, y, w, h, icon, fill, on, round }
export function drawButton(ctx, b, time = 0, opts = {}) {
  const fill = b.fill || (b.on ? C.sun : '#ffffff');
  const r = b.round ? Math.min(b.w, b.h) / 2 : Math.min(b.w, b.h) * 0.26;
  const press = b.pressed ? 3 : 0;
  ctx.fillStyle = 'rgba(20,8,40,0.35)';
  roundRect(ctx, b.x, b.y + 5, b.w, b.h, r);
  ctx.fill();
  ctx.fillStyle = fill;
  roundRect(ctx, b.x, b.y + press, b.w, b.h, r);
  ctx.fill();
  ctx.lineWidth = Math.max(2.5, Math.min(b.w, b.h) * 0.05);
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  if (b.on && !opts.noGlow) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    roundRect(ctx, b.x + 4, b.y + 4 + press, b.w - 8, b.h - 8, r * 0.8);
    ctx.stroke();
  }
  if (b.icon) glyph(ctx, b.icon, b.x + b.w / 2, b.y + b.h / 2 + press, Math.min(b.w, b.h) * 0.36, time, b);
}

const ink = (ctx, lw) => {
  ctx.lineWidth = lw;
  ctx.strokeStyle = C.ink;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
};

// A picture of size ~2s across centred on (cx, cy).
export function glyph(ctx, kind, cx, cy, s, time = 0, b = {}) {
  ctx.save();
  ctx.translate(cx, cy);
  const lw = Math.max(2.5, s * 0.16);
  ink(ctx, lw);
  switch (kind) {
    case 'home': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.95, -s * 0.05);
      ctx.lineTo(0, -s * 0.9);
      ctx.lineTo(s * 0.95, -s * 0.05);
      ctx.lineTo(s * 0.7, -s * 0.05);
      ctx.lineTo(s * 0.7, s * 0.85);
      ctx.lineTo(-s * 0.7, s * 0.85);
      ctx.lineTo(-s * 0.7, -s * 0.05);
      ctx.closePath();
      ctx.fillStyle = '#ff8a4c';
      ctx.fill();
      ctx.stroke();
      roundRect(ctx, -s * 0.22, s * 0.25, s * 0.44, s * 0.6, s * 0.1);
      ctx.fillStyle = '#7a1fa2';
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'back':
    case 'left':
    case 'right': {
      const d = kind === 'right' ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(d * s * 0.9, 0);
      ctx.lineTo(-d * s * 0.1, -s * 0.85);
      ctx.lineTo(-d * s * 0.1, -s * 0.38);
      ctx.lineTo(-d * s * 0.85, -s * 0.38);
      ctx.lineTo(-d * s * 0.85, s * 0.38);
      ctx.lineTo(-d * s * 0.1, s * 0.38);
      ctx.lineTo(-d * s * 0.1, s * 0.85);
      ctx.closePath();
      ctx.fillStyle = kind === 'back' ? '#5cb8ff' : C.sun;
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'undo': {
      ctx.lineWidth = lw * 1.4;
      ctx.beginPath();
      ctx.arc(s * 0.1, s * 0.15, s * 0.62, Math.PI * 1.05, Math.PI * 2.45);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.95, -s * 0.45);
      ctx.lineTo(-s * 0.48, s * 0.25);
      ctx.lineTo(-s * 0.05, -s * 0.42);
      ctx.closePath();
      ctx.fillStyle = C.ink;
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'dice': {
      ctx.rotate(Math.sin(time * 3) * 0.12);
      roundRect(ctx, -s * 0.8, -s * 0.8, s * 1.6, s * 1.6, s * 0.35);
      ctx.fillStyle = '#ff4f7a';
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      for (const [x, y] of [[-0.4, -0.4], [0.4, -0.4], [0, 0], [-0.4, 0.4], [0.4, 0.4]]) {
        circle(ctx, x * s, y * s, s * 0.15);
        ctx.fill();
      }
      break;
    }
    case 'tag': {
      // a name label
      ctx.rotate(-0.15);
      ctx.beginPath();
      ctx.moveTo(-s * 0.9, -s * 0.5);
      ctx.lineTo(s * 0.45, -s * 0.5);
      ctx.lineTo(s * 0.95, 0);
      ctx.lineTo(s * 0.45, s * 0.5);
      ctx.lineTo(-s * 0.9, s * 0.5);
      ctx.closePath();
      ctx.fillStyle = C.sun;
      ctx.fill();
      ctx.stroke();
      circle(ctx, s * 0.42, 0, s * 0.12);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = lw * 0.7;
      for (const y of [-0.18, 0.12]) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.68, y * s);
        ctx.lineTo(s * (y < 0 ? 0.1 : -0.1), y * s);
        ctx.stroke();
      }
      break;
    }
    case 'tick': {
      ctx.lineWidth = lw * 2.6;
      ctx.strokeStyle = C.ink;
      ctx.beginPath();
      ctx.moveTo(-s * 0.7, 0);
      ctx.lineTo(-s * 0.2, s * 0.55);
      ctx.lineTo(s * 0.8, -s * 0.6);
      ctx.stroke();
      ctx.lineWidth = lw * 1.3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      break;
    }
    case 'cross': {
      ctx.lineWidth = lw * 2.6;
      ctx.beginPath();
      ctx.moveTo(-s * 0.6, -s * 0.6);
      ctx.lineTo(s * 0.6, s * 0.6);
      ctx.moveTo(s * 0.6, -s * 0.6);
      ctx.lineTo(-s * 0.6, s * 0.6);
      ctx.stroke();
      ctx.lineWidth = lw * 1.3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      break;
    }
    case 'bin':
    case 'bin-open': {
      const open = kind === 'bin-open' ? 1 : 0;
      roundRect(ctx, -s * 0.62, -s * 0.45, s * 1.24, s * 1.3, s * 0.14);
      ctx.fillStyle = '#9aa3ad';
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = lw * 0.7;
      for (const x of [-0.25, 0, 0.25]) {
        ctx.beginPath();
        ctx.moveTo(x * s, -s * 0.2);
        ctx.lineTo(x * s, s * 0.62);
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(-s * 0.75, -s * 0.55);
      ctx.rotate(-open * 0.7);
      ink(ctx, lw);
      roundRect(ctx, 0, -s * 0.15, s * 1.5, s * 0.25, s * 0.08);
      ctx.fillStyle = '#c3cad2';
      ctx.fill();
      ctx.stroke();
      roundRect(ctx, s * 0.55, -s * 0.33, s * 0.4, s * 0.2, s * 0.06);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'layer-back':
    case 'layer-front': {
      // two cards; the arrow says which way the part goes
      const front = kind === 'layer-front';
      roundRect(ctx, -s * 0.85, -s * 0.85, s * 1.1, s * 1.1, s * 0.18);
      ctx.fillStyle = front ? '#ffffff' : '#ff6fb1';
      ctx.fill();
      ctx.stroke();
      roundRect(ctx, -s * 0.25, -s * 0.25, s * 1.1, s * 1.1, s * 0.18);
      ctx.fillStyle = front ? '#ff6fb1' : '#ffffff';
      ctx.fill();
      ctx.stroke();
      if (!front) {
        roundRect(ctx, -s * 0.85, -s * 0.85, s * 1.1, s * 1.1, s * 0.18);
        ctx.fillStyle = 'rgba(255,111,177,0.0)';
        ctx.setLineDash([s * 0.15, s * 0.12]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      break;
    }
    case 'paint': {
      // a paint blob with a drip, in the colour it will become
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.9);
      ctx.bezierCurveTo(s * 0.9, -s * 0.1, s * 0.75, s * 0.8, 0, s * 0.8);
      ctx.bezierCurveTo(-s * 0.75, s * 0.8, -s * 0.9, -s * 0.1, 0, -s * 0.9);
      ctx.fillStyle = b.colour || '#ff6fb1';
      ctx.fill();
      ctx.stroke();
      ellipse(ctx, -s * 0.25, s * 0.15, s * 0.14, s * 0.24, 0.3);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fill();
      break;
    }
    case 'brush': {
      ctx.rotate(0.7);
      roundRect(ctx, -s * 0.14, -s * 0.95, s * 0.28, s * 1.1, s * 0.1);
      ctx.fillStyle = '#b0773f';
      ctx.fill();
      ctx.stroke();
      roundRect(ctx, -s * 0.2, s * 0.1, s * 0.4, s * 0.25, s * 0.05);
      ctx.fillStyle = '#c3cad2';
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, s * 0.35);
      ctx.quadraticCurveTo(-s * 0.25, s * 0.8, 0, s * 1.0);
      ctx.quadraticCurveTo(s * 0.25, s * 0.8, s * 0.2, s * 0.35);
      ctx.closePath();
      ctx.fillStyle = '#ff4f7a';
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'book': {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.55);
      ctx.quadraticCurveTo(-s * 0.5, -s * 0.8, -s * 0.95, -s * 0.6);
      ctx.lineTo(-s * 0.95, s * 0.65);
      ctx.quadraticCurveTo(-s * 0.5, s * 0.45, 0, s * 0.7);
      ctx.quadraticCurveTo(s * 0.5, s * 0.45, s * 0.95, s * 0.65);
      ctx.lineTo(s * 0.95, -s * 0.6);
      ctx.quadraticCurveTo(s * 0.5, -s * 0.8, 0, -s * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.55);
      ctx.lineTo(0, s * 0.7);
      ctx.stroke();
      ctx.lineWidth = lw * 0.55;
      for (const y of [-0.25, 0, 0.25]) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.75, y * s);
        ctx.lineTo(-s * 0.2, y * s + s * 0.04);
        ctx.moveTo(s * 0.2, y * s + s * 0.04);
        ctx.lineTo(s * 0.75, y * s);
        ctx.stroke();
      }
      star(ctx, s * 0.62, -s * 0.78, s * 0.3);
      ctx.fillStyle = C.sun;
      ctx.lineWidth = lw * 0.6;
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'stage': {
      // a little theatre: curtains open on a spotlight
      roundRect(ctx, -s * 0.95, -s * 0.8, s * 1.9, s * 1.6, s * 0.12);
      ctx.fillStyle = '#ffe9a8';
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = C.curtain;
      for (const d of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(d * s * 0.95, -s * 0.8);
        ctx.lineTo(d * s * 0.25, -s * 0.8);
        ctx.quadraticCurveTo(d * s * 0.35, s * 0.1, d * s * 0.85, s * 0.8);
        ctx.lineTo(d * s * 0.95, s * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-s * 0.95, -s * 0.8);
      ctx.lineTo(s * 0.95, -s * 0.8);
      ctx.lineTo(s * 0.95, -s * 0.5);
      for (let k = 4; k >= 0; k--) ctx.quadraticCurveTo(s * (-0.95 + (k + 0.5) * 0.38), -s * 0.3, s * (-0.95 + k * 0.38), -s * 0.5);
      ctx.closePath();
      ctx.fillStyle = C.curtainDark;
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'speaker':
    case 'speaker-auto':
    case 'speaker-off': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.9, -s * 0.3);
      ctx.lineTo(-s * 0.45, -s * 0.3);
      ctx.lineTo(s * 0.05, -s * 0.8);
      ctx.lineTo(s * 0.05, s * 0.8);
      ctx.lineTo(-s * 0.45, s * 0.3);
      ctx.lineTo(-s * 0.9, s * 0.3);
      ctx.closePath();
      ctx.fillStyle = '#5cb8ff';
      ctx.fill();
      ctx.stroke();
      if (kind === 'speaker-off') {
        ctx.lineWidth = lw * 1.1;
        ctx.beginPath();
        ctx.moveTo(s * 0.35, -s * 0.35);
        ctx.lineTo(s * 0.95, s * 0.35);
        ctx.moveTo(s * 0.95, -s * 0.35);
        ctx.lineTo(s * 0.35, s * 0.35);
        ctx.stroke();
      } else {
        const pulse = kind === 'speaker' && b.on ? (Math.sin(time * 8) + 1) * 0.5 : 1;
        for (const r of [0.45, 0.8]) {
          ctx.globalAlpha = r > 0.5 ? 0.4 + pulse * 0.6 : 1;
          ctx.beginPath();
          ctx.arc(s * 0.05, 0, s * r, -0.8, 0.8);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        if (kind === 'speaker-auto') {
          // little pages turning on their own
          ctx.lineWidth = lw * 0.7;
          ctx.beginPath();
          ctx.arc(s * 0.55, s * 0.62, s * 0.3, 0.2, Math.PI * 1.6);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(s * 0.85, s * 0.45);
          ctx.lineTo(s * 0.88, s * 0.75);
          ctx.lineTo(s * 0.62, s * 0.62);
          ctx.stroke();
        }
      }
      break;
    }
    case 'record': {
      circle(ctx, 0, 0, s * 0.72);
      ctx.fillStyle = '#ff3047';
      ctx.fill();
      ctx.stroke();
      circle(ctx, -s * 0.22, -s * 0.22, s * 0.18);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fill();
      break;
    }
    case 'stop': {
      roundRect(ctx, -s * 0.6, -s * 0.6, s * 1.2, s * 1.2, s * 0.15);
      ctx.fillStyle = C.ink;
      ctx.fill();
      break;
    }
    case 'play': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, -s * 0.75);
      ctx.lineTo(s * 0.8, 0);
      ctx.lineTo(-s * 0.5, s * 0.75);
      ctx.closePath();
      ctx.fillStyle = '#2fbf5b';
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'plus': {
      ctx.lineWidth = lw * 2.4;
      ctx.beginPath();
      ctx.moveTo(-s * 0.7, 0);
      ctx.lineTo(s * 0.7, 0);
      ctx.moveTo(0, -s * 0.7);
      ctx.lineTo(0, s * 0.7);
      ctx.stroke();
      ctx.lineWidth = lw * 1.1;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      break;
    }
    case 'sock': {
      // a sock with a plus: another puppet
      ctx.beginPath();
      ctx.moveTo(-s * 0.35, -s * 0.9);
      ctx.lineTo(s * 0.25, -s * 0.9);
      ctx.lineTo(s * 0.25, s * 0.15);
      ctx.quadraticCurveTo(s * 0.95, s * 0.2, s * 0.85, s * 0.6);
      ctx.quadraticCurveTo(s * 0.75, s * 0.95, s * 0.1, s * 0.85);
      ctx.quadraticCurveTo(-s * 0.4, s * 0.8, -s * 0.35, s * 0.3);
      ctx.closePath();
      ctx.fillStyle = b.colour || '#8fd14f';
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = lw * 0.6;
      for (const y of [-0.7, -0.5]) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.35, y * s);
        ctx.lineTo(s * 0.25, y * s);
        ctx.stroke();
      }
      break;
    }
    case 'backdrop': {
      // a little landscape picture
      roundRect(ctx, -s * 0.9, -s * 0.7, s * 1.8, s * 1.4, s * 0.12);
      ctx.fillStyle = '#7fd3ff';
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#3cbf55';
      ctx.beginPath();
      ctx.moveTo(-s, s * 0.7);
      ctx.quadraticCurveTo(-s * 0.4, -s * 0.2, s * 0.2, s * 0.3);
      ctx.quadraticCurveTo(s * 0.6, 0, s, s * 0.2);
      ctx.lineTo(s, s * 0.8);
      ctx.closePath();
      ctx.fill();
      circle(ctx, s * 0.45, -s * 0.3, s * 0.2);
      ctx.fillStyle = C.sun;
      ctx.fill();
      ctx.restore();
      roundRect(ctx, -s * 0.9, -s * 0.7, s * 1.8, s * 1.4, s * 0.12);
      ctx.stroke();
      break;
    }
    case 'heart': {
      heart(ctx, 0, 0, s * 0.8);
      ctx.fillStyle = '#ff4f7a';
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'again': {
      ctx.lineWidth = lw * 1.3;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.62, -0.4, Math.PI * 1.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.4, -s * 0.85);
      ctx.lineTo(s * 0.75, -s * 0.25);
      ctx.lineTo(s * 0.05, -s * 0.3);
      ctx.closePath();
      ctx.fillStyle = C.ink;
      ctx.fill();
      ctx.stroke();
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

// A soft rounded panel.
export function panel(ctx, x, y, w, h, fill = 'rgba(255,255,255,0.14)', r = 18) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

// A swatch: a felt circle with a stitched rim, bigger and bouncing when chosen.
export function drawSwatch(ctx, x, y, r, colour, on, time = 0, kind = 'plain') {
  const rr = on ? r * (1.08 + Math.sin(time * 6) * 0.04) : r;
  circle(ctx, x, y + 3, rr);
  ctx.fillStyle = 'rgba(20,8,40,0.35)';
  ctx.fill();
  circle(ctx, x, y, rr);
  ctx.fillStyle = colour;
  ctx.fill();
  if (kind === 'stripes') {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let k = -3; k <= 3; k++) ctx.fillRect(x - rr, y + k * rr * 0.45 - rr * 0.1, rr * 2, rr * 0.2);
    ctx.restore();
    circle(ctx, x, y, rr);
  }
  ctx.lineWidth = on ? 5 : 3;
  ctx.strokeStyle = on ? '#ffffff' : C.ink;
  ctx.stroke();
  if (on) {
    circle(ctx, x, y, rr + 4);
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ellipse(ctx, x - rr * 0.3, y - rr * 0.35, rr * 0.3, rr * 0.18, -0.5);
  ctx.fill();
}

export const lighten = shade;
export { TAU };
