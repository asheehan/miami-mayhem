// Small things people carry, drawn at the hand position (x, y), scaled by S.
import { INK, circle, ellipse, poly, rect, rrect, line, curve, star } from './kit.js';

export function drawHeld(ctx, item, x, y, S = 1, o = {}, t = 0) {
  const c = o.itemColour || '#ff3d9a';
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(S, S);
  switch (item) {
    case 'icecream':
      poly(ctx, [[-6, -2], [6, -2], [0, 16]], '#e8b060', 2);
      circle(ctx, 0, -7, 7.5, c, 2);
      circle(ctx, 0, -15, 6, '#fff3e0', 2);
      break;
    case 'balloon': {
      const sway = Math.sin(t * 1.6 + (o.phase || 0)) * 4;
      curve(ctx, 0, 0, 6, -40, sway, -78, INK, 1.5);
      ellipse(ctx, sway, -96, 15, 19, c, 2.5);
      ellipse(ctx, sway - 5, -102, 3.5, 6, 'rgba(255,255,255,0.6)', 0);
      poly(ctx, [[sway - 3, -77], [sway + 3, -77], [sway, -73]], c, 1.5);
      break;
    }
    case 'drink':
      poly(ctx, [[-6, -12], [6, -12], [4, 6], [-4, 6]], c, 2);
      line(ctx, 2, -12, 7, -24, '#ffffff', 2.5);
      circle(ctx, -6, -12, 4, '#7cd34a', 1.5);
      break;
    case 'phone':
      rrect(ctx, -5, -10, 10, 18, 2, '#3a3f55', 2);
      rect(ctx, -3, -8, 6, 12, '#7fd8ff', 0);
      break;
    case 'camera':
      rrect(ctx, -11, -8, 22, 15, 3, '#3a3f55', 2);
      circle(ctx, 0, 0, 5, '#7fd8ff', 2);
      rect(ctx, 4, -11, 6, 4, '#3a3f55', 1.5);
      break;
    case 'fries':
      for (let k = -2; k <= 2; k++) rect(ctx, k * 3 - 1.5, -16 + Math.abs(k) * 2, 3, 14, '#ffd23a', 1);
      poly(ctx, [[-8, -6], [8, -6], [6, 8], [-6, 8]], '#ff3d3d', 2);
      break;
    case 'flag':
      line(ctx, 0, 12, 0, -50, '#6e4426', 3);
      poly(ctx, [[0, -50], [26, -42], [0, -34]], c, 2);
      break;
    case 'binoculars':
      rrect(ctx, -10, -8, 9, 14, 3, '#3a3f55', 2);
      rrect(ctx, 1, -8, 9, 14, 3, '#3a3f55', 2);
      break;
    case 'hotdog':
      ellipse(ctx, 0, 0, 13, 5, '#e8a860', 2);
      ellipse(ctx, 0, -2, 14, 3.5, '#d2462a', 1.5);
      curve(ctx, -10, -3, 0, 2, 10, -3, '#ffd23a', 1.5);
      break;
    case 'trumpet':
      line(ctx, -14, 0, 10, 0, '#ffc93a', 4);
      poly(ctx, [[10, -2], [22, -9], [22, 9], [10, 2]], '#ffc93a', 2);
      rect(ctx, -2, -6, 3, 6, '#ffc93a', 1);
      rect(ctx, 3, -6, 3, 6, '#ffc93a', 1);
      break;
    case 'drum':
      rect(ctx, -16, -6, 32, 20, c, 2.5);
      ellipse(ctx, 0, -6, 16, 5, '#ffffff', 2);
      line(ctx, -14, -4, 14, 12, '#ffffff', 2);
      line(ctx, 14, -4, -14, 12, '#ffffff', 2);
      break;
    case 'maracas':
      line(ctx, 0, 8, 0, -4, '#6e4426', 3);
      ellipse(ctx, 0, -10, 7, 9, c, 2);
      line(ctx, -4, -12, 4, -12, '#ffe14d', 2);
      break;
    case 'basket':
      curve(ctx, -12, -2, 0, -22, 12, -2, '#8a5a2c', 3);
      poly(ctx, [[-14, -2], [14, -2], [10, 14], [-10, 14]], '#c98f4f', 2);
      circle(ctx, -5, -4, 5, '#ff8a2a', 1.5);
      circle(ctx, 4, -5, 5, '#7cd34a', 1.5);
      break;
    case 'net':
      line(ctx, 0, 10, 0, -40, '#6e4426', 3);
      ellipse(ctx, 0, -52, 12, 14, 'rgba(255,255,255,0.35)', 2);
      break;
    case 'rod':
      line(ctx, 0, 10, 40, -60, '#6e4426', 3);
      curve(ctx, 40, -60, 60, -30, 62, 20 + Math.sin(t * 2) * 4, '#ffffff', 1.2);
      break;
    case 'popcorn':
      poly(ctx, [[-9, -8], [9, -8], [6, 12], [-6, 12]], '#ffffff', 2);
      line(ctx, -3, -8, -2, 12, '#ff3d3d', 3);
      line(ctx, 3, -8, 2, 12, '#ff3d3d', 3);
      for (let k = -2; k <= 2; k++) circle(ctx, k * 4, -10 - (k % 2) * 3, 4, '#fff6c8', 1.2);
      break;
    case 'cottoncandy':
      line(ctx, 0, 10, 0, -10, '#ffffff', 3);
      circle(ctx, 0, -20, 13, '#ff9ed2', 2);
      circle(ctx, -6, -24, 6, '#ffc0e3', 0);
      break;
    case 'starwand':
      line(ctx, 0, 10, 0, -24, '#ffffff', 2.5);
      star(ctx, 0, -30, 9, '#ffe14d', 5, 0.45, 2);
      break;
    case 'sign':
      line(ctx, 0, 10, 0, -40, '#6e4426', 3);
      rrect(ctx, -24, -70, 48, 32, 5, c, 2.5);
      break;
    default:
  }
  ctx.restore();
}
