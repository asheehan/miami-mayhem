// A chubby manatee drifting over the sea grass. Comes alive: she bobs and blows bubbles.
import { R, D, rect, ellipse, blob, band, spline, hills, eye, clip, star, poly, all } from './kit.js';

const body = blob([170, 280, 112, 306, 78, 362, 84, 424, 128, 462, 200, 488, 300, 504, 400, 492, 468, 456, 512, 418, 504, 368, 452, 326, 360, 280, 262, 268]);
const tail = blob([476, 414, 520, 330, 566, 310, 594, 352, 594, 446, 566, 498, 520, 490]);
const flipper = blob([186, 444, 236, 446, 240, 500, 214, 552, 172, 556, 162, 520, 172, 474]);
const muzzle = ellipse(100, 404, 58, 48, -10);
const fish = all(ellipse(468, 168, 52, 34), poly([512, 168, 560, 130, 556, 206]));

export default {
  id: 'manatee',
  items: [
    R(rect(0, 0, 600, 800)),
    R(hills(70, 10, 6, { bottom: 0 })),
    R(band([66, 730, 44, 650, 78, 570, 52, 490], 38, 16, { roundEnd: true })),
    R(band([540, 730, 566, 660, 534, 590, 560, 520], 36, 14, { roundEnd: true })),
    R(hills(680, 12, 4)),
    R(blob([90, 740, 112, 680, 172, 664, 226, 690, 238, 740])),
    R(star(440, 728, 44, 19, 5, -80)),
    D([ellipse(440, 728, 8, 8)], { w: 4 }),
    R(fish, { part: 'fish' }),
    ...eye(452, 160, 9, { lx: -1, part: 'fish' }),
    D(spline([500, 150, 506, 168, 500, 186]), { w: 4, part: 'fish' }),
    R(tail, { part: 'cow' }),
    D([spline([540, 360, 560, 400, 556, 450])], { w: 4, part: 'cow' }),
    R(body, { part: 'cow' }),
    R(clip(body, ellipse(300, 560, 250, 110)), { part: 'cow' }),
    D([spline([226, 300, 238, 336, 232, 372]), spline([380, 318, 392, 344])], { w: 4, part: 'cow' }),
    R(flipper, { part: 'cow' }),
    D([spline([180, 540, 184, 528]), spline([200, 546, 202, 532])], { w: 4, part: 'cow' }),
    R(muzzle, { part: 'cow' }),
    D([ellipse(74, 388, 6, 8, -20), ellipse(96, 380, 6, 8, -20)], { fill: 'ink', w: 0, part: 'cow' }),
    D([ellipse(96, 418, 3, 3), ellipse(112, 424, 3, 3), ellipse(128, 418, 3, 3), ellipse(110, 406, 3, 3)], { fill: 'ink', w: 0, part: 'cow' }),
    D(spline([88, 444, 112, 452, 140, 444]), { w: 5, part: 'cow' }),
    ...eye(168, 360, 15, { lx: -1, part: 'cow' }),
    D([ellipse(60, 280, 10, 10), ellipse(46, 240, 7, 7), ellipse(64, 206, 12, 12)], { fill: '#ffffff', w: 4 }),
  ],
  alive: {
    parts: {
      cow: (t) => ({ y: Math.sin(t * 2.2) * 16, r: Math.sin(t * 2.2 + 0.6) * 3, ox: 300, oy: 400 }),
      fish: (t) => ({ x: -Math.sin(t * 1.6) * 40, y: Math.sin(t * 4) * 6 }),
    },
    wink: { x: 168, y: 360, r: 16, part: 'cow', at: [1.4, 3.2] },
    fx: [{ type: 'bubbles', x: 70, y: 380, from: 0.2, to: 4 }],
  },
};
