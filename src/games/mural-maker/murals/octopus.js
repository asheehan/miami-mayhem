// A happy octopus under the sea with seaweed, a fish and a starfish. Comes alive: bobs and
// wiggles, blows bubbles, and the fish swims past.
import { R, D, rect, circle, ellipse, blob, band, spline, hills, eye, star, poly, all, alongBand, inWall, tf } from './kit.js';

const tentacles = [
  [200, 372, 150, 412, 102, 450, 72, 510, 86, 560, 118, 556],
  [236, 400, 204, 470, 166, 540, 154, 608, 182, 640, 208, 622],
  [272, 412, 262, 500, 244, 580, 234, 650, 258, 690, 284, 672],
];
for (const t of tentacles.slice()) tentacles.push(t.map((v, k) => (k % 2 ? v : 600 - v)));
const tentacleShape = (pts) => band(pts, (t) => 52 - 40 * t, 0, { roundEnd: true });
const suckers = tentacles.flatMap((pts) => alongBand(pts, [0.35, 0.52, 0.68, 0.82]).map(([x, y], k) => circle(x, y, 7 - k)));

export default {
  id: 'octopus',
  items: [
    R(rect(0, 0, 600, 800)),
    D([circle(90, 160, 14), circle(110, 120, 9), circle(96, 90, 6), circle(520, 380, 12), circle(540, 346, 8)], { w: 4 }),
    R(hills(700, 12, 4)),
    D([circle(300, 760, 5), circle(150, 740, 4), circle(420, 770, 4)], { w: 3 }),
    R(inWall(band([70, 812, 46, 700, 92, 600, 58, 500, 92, 420], 34, 14, { roundEnd: true }))),
    R(inWall(band([544, 812, 566, 690, 522, 590, 556, 490], 34, 14, { roundEnd: true }))),
    R(tf(star(0, 0, 44, 20), { r: 12, x: 470, y: 734 })),
    D([circle(462, 726, 3), circle(478, 734, 3), circle(468, 744, 3)], { fill: 'ink', w: 0 }),
    R(all(ellipse(470, 170, 58, 34), poly([520, 170, 566, 132, 566, 208])), { part: 'fish' }),
    D([spline([450, 140, 446, 170, 450, 200]), spline([476, 150, 498, 170, 476, 190])], { w: 4, part: 'fish' }),
    ...eye(436, 162, 9, { lx: -1, part: 'fish' }),
    ...tentacles.map((pts) => R(tentacleShape(pts), { part: 'octo' })),
    D(suckers, { w: 3, part: 'octo' }),
    R(blob([300, 138, 402, 164, 452, 258, 432, 360, 380, 420, 300, 436, 220, 420, 168, 360, 148, 258, 198, 164]), { part: 'octo' }),
    D([circle(250, 200, 14), circle(326, 178, 10), circle(380, 222, 12), circle(214, 262, 8)], { w: 4, part: 'octo' }),
    ...eye(254, 300, 30, { ly: 0.3, part: 'octo' }),
    ...eye(346, 300, 30, { ly: 0.3, part: 'octo' }),
    D([ellipse(206, 352, 22, 12), ellipse(394, 352, 22, 12)], { fill: 'rgba(255,90,150,0.45)', w: 0, part: 'octo' }),
    D(spline([262, 360, 300, 386, 338, 360]), { w: 6, part: 'octo' }),
  ],
  alive: {
    parts: {
      octo: (t) => ({ y: -Math.abs(Math.sin(t * 3.2)) * 40, sx: 1 + Math.sin(t * 6.4) * 0.04, sy: 1 - Math.sin(t * 6.4) * 0.04, ox: 300, oy: 600 }),
      fish: (t) => ({ x: -Math.sin(Math.min(1, t / 4) * Math.PI) * 300, y: Math.sin(t * 5) * 8 }),
    },
    fx: [{ type: 'bubbles', x: 300, y: 380, from: 0, to: 4.2 }],
  },
};
