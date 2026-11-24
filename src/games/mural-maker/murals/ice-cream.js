// An ice-cream truck with a giant cone on the roof. Comes alive: the truck bounces along,
// the wheels spin and music plays.
import { R, D, rect, circle, cloud, blob, poly, rpoly, spline, svg, clip, tf, all, line } from './kit.js';

const cone = poly([282, 262, 388, 262, 335, 382]);
const waffle = [];
for (let k = -4; k <= 4; k++) {
  waffle.push(clip(tf(rect(335 + k * 22 - 2, 180, 4, 240), { r: 26, ox: 335 + k * 22, oy: 300 }), cone));
  waffle.push(clip(tf(rect(335 + k * 22 - 2, 180, 4, 240), { r: -26, ox: 335 + k * 22, oy: 300 }), cone));
}
const body = rect(160, 380, 380, 250, 26);
let awning = 'M234 396 L466 396 L480 446';
const n = 8;
for (let k = 0; k < n; k++) {
  const x0 = 480 - (k * 260) / n;
  const x1 = 480 - ((k + 1) * 260) / n;
  awning += ` Q${(x0 + x1) / 2} 470 ${x1} 446`;
}
awning += ' Z';

const spokes = (cx, cy) => [0, 60, 120].map((a) => {
  const r = (a * Math.PI) / 180;
  return line([cx - Math.cos(r) * 20, cy - Math.sin(r) * 20, cx + Math.cos(r) * 20, cy + Math.sin(r) * 20]);
});

export default {
  id: 'ice-cream',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(500, 108, 62)),
    R(cloud(140, 130, 190, 80)),
    R(rect(0, 650, 600, 150)),
    D([rect(30, 728, 90, 14, 6), rect(190, 728, 90, 14, 6), rect(350, 728, 90, 14, 6), rect(510, 728, 90, 14, 6)].map((s) => clip(s, rect(0, 0, 600, 800))), { fill: '#ffffff', w: 3 }),
    R(cone, { part: 'truck' }),
    D(waffle.filter((s) => s.d.length > 2), { fill: 'ink', w: 0, part: 'truck' }),
    R(blob([266, 264, 272, 218, 300, 190, 336, 182, 372, 190, 398, 218, 404, 264, 388, 272, 374, 296, 360, 270, 340, 278, 320, 270, 304, 292, 290, 270]), { part: 'truck' }),
    R(blob([286, 198, 292, 160, 318, 134, 348, 132, 376, 152, 386, 186, 376, 204, 336, 210]), { part: 'truck' }),
    R(circle(342, 112, 25), { part: 'truck' }),
    D([spline([346, 88, 352, 70, 368, 60]), spline([332, 104, 338, 98])], { w: 4, part: 'truck' }),
    R(svg('M176 456 L122 462 Q82 470 74 514 L68 600 Q68 630 94 630 L182 630 Z'), { part: 'truck' }),
    R(body, { part: 'truck' }),
    R(rpoly([170, 472, 126, 478, 102, 532, 170, 532], 8), { part: 'truck' }),
    R(rect(250, 452, 200, 100, 12), { part: 'truck' }),
    R(svg(awning), { part: 'truck' }),
    D([line([280, 398, 274, 450]), line([320, 398, 318, 456]), line([360, 398, 360, 454]), line([400, 398, 402, 456]), line([440, 398, 446, 452])], { w: 4, part: 'truck' }),
    R(clip(body, rect(0, 574, 600, 30)), { part: 'truck' }),
    D([circle(84, 564, 12)], { fill: '#fff6b0', w: 4, part: 'truck' }),
    D([line([176, 470, 176, 620]), line([210, 590, 230, 590])], { w: 4, part: 'truck' }),
    D([circle(470, 500, 8), circle(490, 500, 8)], { w: 4, part: 'truck' }),
    R(circle(178, 640, 50)),
    D([circle(178, 640, 22)], { fill: '#ffffff', w: 4 }),
    D(spokes(178, 640), { w: 4, part: 'w1' }),
    R(circle(458, 640, 50)),
    D([circle(458, 640, 22)], { fill: '#ffffff', w: 4 }),
    D(spokes(458, 640), { w: 4, part: 'w2' }),
  ],
  alive: {
    parts: {
      truck: (t) => ({ y: -Math.abs(Math.sin(t * 7)) * 10, r: Math.sin(t * 7) * 0.8, ox: 300, oy: 630 }),
      w1: (t) => ({ r: -t * 300, ox: 178, oy: 640 }),
      w2: (t) => ({ r: -t * 300, ox: 458, oy: 640 }),
    },
    fx: [{ type: 'notes', x: 350, y: 440, from: 0, to: 4.2 }],
  },
};
