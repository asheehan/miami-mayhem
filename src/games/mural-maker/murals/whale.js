// A big happy whale at the top of the sea, blowing a fountain from its spout. Comes alive:
// it rocks on the waves and the fountain bobs up and down.
import { R, D, rect, circle, ellipse, cloud, blob, band, spline, hills, eye, svg, clip, all } from './kit.js';

const W = { part: 'whale' };

// A big bean: round head on the left, tail lifting up on the right.
const body = blob([50, 440, 82, 346, 170, 294, 290, 290, 392, 318, 456, 360, 494, 316, 506, 262, 556, 266, 566, 336, 534, 430, 456, 506, 330, 556, 180, 560, 84, 516]);
const belly = clip(body, ellipse(230, 610, 230, 120));
const flukes = svg('M530 284 C512 250 474 238 446 196 C490 188 516 204 530 226 C544 202 566 188 598 190 C590 236 556 252 530 284 Z')[0];
const flipper = band([338, 432, 368, 472, 414, 494], 46, 34, { roundEnd: true });
// A fountain of water: a stem that splashes over into round drops on both sides.
const spout = all(
  band([196, 304, 194, 240, 196, 170], 34, 26),
  band([196, 176, 160, 130, 120, 132, 96, 176], 30, 26, { roundEnd: true }),
  band([196, 176, 232, 130, 272, 132, 296, 176], 30, 26, { roundEnd: true }),
  circle(196, 158, 30),
);

export default {
  id: 'whale',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(512, 84, 52)),
    R(cloud(330, 70, 150, 58)),
    R(hills(500, 10, 5)),
    R(spout, { part: 'spout' }),
    D([ellipse(150, 92, 9, 12), ellipse(244, 92, 9, 12), ellipse(196, 84, 8, 11), ellipse(80, 220, 8, 11), ellipse(312, 220, 8, 11)], { fill: '#ffffff', w: 4, part: 'spout' }),
    R(flukes, W),
    R(body, W),
    R(belly, W),
    D([spline([100, 520, 180, 536, 270, 528]), spline([150, 548, 220, 556, 300, 546])], { w: 4, ...W }),
    R(flipper, W),
    ...eye(140, 400, 18, { lx: -1, ...W }),
    D(spline([60, 452, 110, 482, 170, 478]), { w: 6, ...W }),
    D(ellipse(178, 446, 18, 10), { fill: '#ff9ab8', w: 0, ...W }),
    D(spline([180, 300, 196, 290, 212, 300]), { w: 4, ...W }),
    R(hills(560, 16, 4, { flip: true })),
    D([spline([60, 640, 100, 628, 140, 640]), spline([380, 650, 420, 638, 460, 650]), spline([220, 710, 260, 698, 300, 710])], { w: 4 }),
    R(hills(730, 10, 5)),
    D([spline([500, 770, 530, 760, 560, 770]), spline([60, 780, 90, 770, 120, 780])], { w: 4 }),
  ],
  alive: {
    parts: {
      whale: (t) => ({ y: Math.sin(t * 2.4) * 12, r: Math.sin(t * 2.4 + 0.5) * 3, ox: 300, oy: 480 }),
      spout: (t) => ({ y: Math.sin(t * 2.4) * 12 - Math.abs(Math.sin(t * 4)) * 24, sy: 1 + Math.abs(Math.sin(t * 4)) * 0.15, ox: 196, oy: 300 }),
    },
    wink: { x: 140, y: 400, r: 19, part: 'whale', at: [1.4, 3.2] },
    fx: [{ type: 'splash', x: 470, y: 520, from: 0.4, to: 1.4 }, { type: 'splash', x: 120, y: 540, from: 2.6, to: 3.6 }],
  },
};
