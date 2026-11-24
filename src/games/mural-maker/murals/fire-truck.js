// A big red fire truck with its ladder and lights. Comes alive: it rumbles along with the
// wheels turning and the light flashing.
import { R, D, rect, circle, cloud, spline, svg, clip, rpoly, line, all } from './kit.js';

const body = rect(196, 382, 368, 222, 14);
const cab = svg('M214 604 L36 604 L36 474 C36 446 52 426 76 414 L118 340 C124 330 136 324 150 324 L214 324 Z')[0];
const stripe = rect(0, 506, 600, 30);
const spokes = (cx, cy) => [0, 60, 120].map((a) => {
  const r = (a * Math.PI) / 180;
  return line([cx - Math.cos(r) * 22, cy - Math.sin(r) * 22, cx + Math.cos(r) * 22, cy + Math.sin(r) * 22]);
});
const rungs = [];
for (let x = 262; x < 580; x += 34) rungs.push(line([x, 346, x, 372]));
const T = { part: 'truck' };

export default {
  id: 'fire-truck',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(500, 110, 60)),
    R(cloud(150, 130, 200, 80)),
    R(rect(0, 640, 600, 160)),
    D([rect(30, 726, 90, 14, 6), rect(190, 726, 90, 14, 6), rect(350, 726, 90, 14, 6), rect(510, 726, 90, 14, 6)].map((s) => clip(s, rect(0, 0, 600, 800))), { fill: '#ffffff', w: 3 }),
    D([line([260, 376, 260, 384]), line([520, 376, 520, 384])], { w: 6, ...T }),
    R(rect(236, 340, 352, 38, 10), T),
    D(rungs, { w: 4, ...T }),
    R(body, T),
    R(cab, T),
    R(rpoly([88, 418, 128, 352, 190, 352, 190, 418], 10), T),
    R([clip(body, stripe), clip(cab, stripe)], T),
    R(rect(20, 556, 80, 40, 12), T),
    D(circle(56, 486, 15), { fill: '#fff6b0', w: 4, ...T }),
    D([line([214, 430, 214, 590]), line([160, 450, 186, 450])], { w: 4, ...T }),
    R(rect(124, 288, 70, 38, 12), T),
    R(circle(300, 450, 48), T),
    D([circle(300, 450, 30), circle(300, 450, 12)], { w: 4, ...T }),
    R(rect(380, 404, 160, 90, 12), T),
    D([line([460, 404, 460, 494]), line([440, 450, 450, 450]), line([470, 450, 480, 450])], { w: 4, ...T }),
    R(circle(132, 618, 58)),
    D(circle(132, 618, 26), { fill: '#ffffff', w: 4 }),
    D(spokes(132, 618), { w: 4, part: 'w1' }),
    R(circle(450, 618, 58)),
    D(circle(450, 618, 26), { fill: '#ffffff', w: 4 }),
    D(spokes(450, 618), { w: 4, part: 'w2' }),
  ],
  alive: {
    parts: {
      truck: (t) => ({ y: -Math.abs(Math.sin(t * 8)) * 8, r: Math.sin(t * 8) * 0.6, ox: 300, oy: 610 }),
      w1: (t) => ({ r: -t * 320, ox: 132, oy: 618 }),
      w2: (t) => ({ r: -t * 320, ox: 450, oy: 618 }),
    },
    fx: [{ type: 'glow', x: 159, y: 300, from: 0, to: 4.2 }],
  },
};
