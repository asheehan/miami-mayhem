// A flamingo on one leg in a sunny lagoon. Comes alive: sways and winks.
import { R, D, rect, circle, ellipse, cloud, blob, band, spline, hills, eye, clip, svg } from './kit.js';

const beak = svg('M186 132 C160 126 134 134 122 152 C110 170 110 194 118 216 C126 202 134 190 146 182 C160 174 174 172 192 170 Z')[0];
const body = blob([200, 395, 232, 348, 300, 322, 380, 318, 440, 312, 494, 292, 476, 342, 430, 396, 340, 452, 248, 446]);
const neck = band([236, 372, 266, 306, 266, 246, 236, 196, 214, 168], 36, 28);

export default {
  id: 'flamingo',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(476, 146, 74)),
    R(cloud(120, 400, 170, 76)),
    R(hills(600, 12, 6)),
    D([ellipse(324, 650, 54, 12), ellipse(324, 650, 86, 22)], { w: 4 }),
    R(ellipse(126, 712, 84, 30)),
    D(spline([126, 712, 160, 690]), { w: 4 }),
    R([band([324, 440, 324, 540, 320, 648], 16, 14), band([356, 444, 404, 512, 346, 538], 15, 14, { round: true })], { part: 'bird' }),
    R(neck, { part: 'bird' }),
    R(body, { part: 'bird' }),
    R(blob([266, 374, 318, 344, 398, 338, 448, 350, 424, 380, 362, 402, 300, 406]), { part: 'bird' }),
    D([spline([318, 372, 364, 366, 412, 366]), spline([332, 390, 372, 386]), spline([452, 316, 476, 306])], { w: 4, part: 'bird' }),
    R(circle(212, 150, 36), { part: 'bird' }),
    R(beak, { part: 'bird' }),
    R(clip(beak, rect(0, 0, 148, 800)), { part: 'bird' }),
    ...eye(214, 140, 10, { lx: -1, part: 'bird' }),
  ],
  alive: {
    parts: { bird: (t) => ({ r: Math.sin(t * 2.6) * 4, ox: 322, oy: 648 }) },
    wink: { x: 214, y: 140, r: 11, part: 'bird', at: [1.1, 2.9] },
  },
};
