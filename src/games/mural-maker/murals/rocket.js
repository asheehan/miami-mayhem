// A rocket ready for lift-off in space, with a ringed planet and the moon. Comes alive:
// it rumbles, blasts off out of the top of the wall and lands back on its flame.
import { R, D, rect, circle, ellipse, blob, poly, rpoly, star, flipX, clip, all, spline, inWall } from './kit.js';

const CX = 300;
const TOP = 104;
const BOTTOM = 482;
const halfWidth = (y) => {
  const t = (y - TOP) / (BOTTOM - TOP);
  let w = 94 * Math.sqrt(Math.max(0, 1 - Math.pow(1 - Math.min(1, t / 0.5), 2)));
  if (t > 0.72) w *= 1 - 0.14 * ((t - 0.72) / 0.28);
  return w;
};
const side = [];
for (let k = 0; k <= 48; k++) {
  const y = TOP + ((BOTTOM - TOP) * k) / 48;
  side.push([CX + halfWidth(y), y]);
}
const body = poly([...side.flatMap((p) => p), ...side.slice().reverse().flatMap(([x, y]) => [2 * CX - x, y])]);
const fin = rpoly([218, 372, 150, 444, 136, 548, 152, 556, 224, 486], [8, 14, 10, 8, 8]);

// rocket motion: rumble, lift off out of the top, come back down and land
function fly(t) {
  const shake = t < 3.9 ? Math.sin(t * 70) * 3 * (t < 0.9 ? 1 : 0.4) : 0;
  let y = 0;
  if (t > 0.9 && t < 2.3) y = -Math.pow((t - 0.9) / 1.4, 2) * 1100;
  else if (t >= 2.3 && t < 3.9) {
    const k = (t - 2.3) / 1.6;
    y = -1000 * Math.pow(1 - k, 3);
  }
  return { x: shake, y };
}

export default {
  id: 'rocket',
  items: [
    R(rect(0, 0, 600, 800)),
    D([star(80, 300, 12, 5, 4), star(530, 360, 14, 6, 4), star(200, 60, 10, 4, 4), star(420, 520, 12, 5, 4), star(90, 520, 9, 4, 4), star(560, 640, 10, 4, 4), star(380, 40, 8, 3, 4)], { fill: '#ffffff', w: 3 }),
    R(circle(482, 168, 62)),
    D([spline([440, 140, 470, 128, 500, 136]), spline([450, 196, 490, 204])], { w: 4 }),
    R([ellipse(482, 168, 110, 28, -18), ellipse(482, 168, 80, 14, -18)], { evenodd: true }),
    R(circle(110, 140, 46)),
    D([circle(96, 126, 10), circle(126, 156, 8), circle(122, 116, 6)], { w: 4 }),
    R(blob([230, 522, 370, 522, 376, 578, 342, 626, 300, 706, 258, 626, 224, 578]), { part: 'flame' }),
    R(blob([262, 522, 338, 522, 336, 568, 300, 640, 264, 568]), { part: 'flame' }),
    R(all(fin, flipX(fin, CX)), { part: 'rocket' }),
    R(body, { part: 'rocket' }),
    R(clip(body, rect(0, 400, 600, 34)), { part: 'rocket' }),
    R(clip(body, rect(0, 0, 600, 212)), { part: 'rocket' }),
    R(circle(CX, 300, 48), { part: 'rocket' }),
    D(circle(CX, 300, 33), { w: 4, part: 'rocket' }),
    D(spline([280, 288, 288, 278, 300, 274]), { w: 5, stroke: '#ffffff', part: 'rocket' }),
    R(rpoly([244, 478, 356, 478, 374, 524, 226, 524], 6), { part: 'rocket' }),
    R(all(inWall(circle(80, 790, 80)), inWall(circle(170, 812, 64)), inWall(circle(520, 790, 84)), inWall(circle(430, 815, 62)))),
  ],
  alive: {
    parts: {
      rocket: fly,
      flame: (t) => {
        const f = fly(t);
        return { ...f, sx: 1 + Math.sin(t * 40) * 0.08, sy: 1.15 + Math.sin(t * 31) * 0.25 + (t > 0.9 && t < 3.9 ? 0.5 : 0), ox: 300, oy: 522 };
      },
    },
    fx: [{ type: 'smoke', x: 300, y: 700, from: 0.6, to: 3.6 }],
  },
};
