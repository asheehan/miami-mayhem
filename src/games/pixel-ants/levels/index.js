import rocket from './rocket.js';
import dino from './dino.js';
import reef from './reef.js';
import rainbow from './rainbow.js';
import digger from './digger.js';
import castle from './castle.js';
import robot from './robot.js';
import ship from './ship.js';

// Shown four to a page on the home screen, in this order. The second page is harder,
// roughly easiest to hardest.
export const levels = [rocket, dino, reef, rainbow, ship, digger, castle, robot];

// The same picture at double resolution: every pixel becomes a 2 x 2 square, so there are
// four times as many pixels to clear. `scale` tells the game and layout how much finer the
// grid is than the standard 24 x 32.
export function doubled(level, extra = {}) {
  const rows = [];
  for (const row of level.rows) {
    const wide = [...row].map((c) => c + c).join('');
    rows.push(wide, wide);
  }
  return { ...level, rows, scale: 2, ...extra };
}
