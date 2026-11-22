import rocket from './rocket.js';
import dino from './dino.js';
import reef from './reef.js';
import rainbow from './rainbow.js';
import digger from './digger.js';
import castle from './castle.js';
import robot from './robot.js';
import ship from './ship.js';
import shark from './shark.js';
import monsterTruck from './monster-truck.js';
import flamingo from './flamingo.js';
import iceCream from './ice-cream.js';
import dragon from './dragon.js';
import fireTruck from './fire-truck.js';
import seaTurtle from './sea-turtle.js';
import train from './train.js';
import ufo from './ufo.js';
import volcano from './volcano.js';
import raceCar from './race-car.js';
import lighthouse from './lighthouse.js';

// Shown four to a page on the home screen, in this order. The second page is harder,
// roughly easiest to hardest; Robot is the hardest picture of all.
export const levels = [
  rocket, dino, reef, rainbow,
  ship, digger, castle, robot,
  shark, monsterTruck, flamingo, iceCream,
  dragon, fireTruck, seaTurtle, train,
  ufo, volcano, raceCar, lighthouse,
];

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
