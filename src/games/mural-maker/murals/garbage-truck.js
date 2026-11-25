// A big garbage truck rumbling down the street, with a trash can waiting by the curb.
// Comes alive: the truck rumbles and the can's lid pops up.
import { R, D, rect, circle, cloud, spline, hills, rpoly, all, line, blob } from './kit.js';

const T = { part: 'truck' };

export default {
  id: 'garbage-truck',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(500, 96, 54)),
    D([spline([150, 236, 140, 210, 152, 186]), spline([210, 226, 222, 200, 210, 176]), spline([270, 236, 260, 210, 272, 186])], { w: 4 }),
    R(all(blob([100, 316, 110, 270, 150, 252, 194, 266, 206, 316]), blob([196, 316, 210, 262, 250, 246, 292, 262, 300, 316])), T),
    D([spline([140, 260, 150, 250, 160, 262]), spline([240, 254, 250, 242, 262, 254])], { w: 4, ...T }),
    R(rect(0, 640, 600, 160)),
    R(rect(0, 640, 600, 46)),
    D([line([40, 740, 110, 740]), line([200, 740, 270, 740]), line([360, 740, 430, 740]), line([520, 740, 590, 740])], { w: 8 }),
    R(rect(30, 574, 470, 44, 12), T),
    R(rpoly([60, 300, 330, 300, 330, 586, 60, 586], [20, 16, 8, 8]), T),
    D([line([130, 318, 130, 570]), line([200, 318, 200, 570]), line([270, 318, 270, 570])], { w: 4, ...T }),
    R(rect(60, 452, 270, 56), T),
    R(rpoly([10, 590, 10, 430, 56, 340, 92, 340, 92, 590], [8, 14, 14, 10, 8]), T),
    R(rpoly([24, 540, 24, 446, 56, 384, 78, 384, 78, 540], [8, 10, 10, 8, 8]), T),
    D([spline([30, 520, 50, 500, 72, 512]), spline([36, 470, 52, 452, 70, 462])], { w: 4, ...T }),
    R(rpoly([340, 380, 444, 380, 500, 470, 504, 590, 340, 590], [16, 16, 30, 12, 6]), T),
    R(rpoly([360, 400, 432, 400, 474, 472, 360, 472], [12, 12, 10, 10]), T),
    D([line([372, 500, 400, 500])], { w: 6, ...T }),
    R(rect(466, 548, 76, 48, 16), T),
    R(all(circle(110, 630, 50), circle(220, 630, 50), circle(420, 630, 50)), T),
    R(all(circle(110, 630, 22), circle(220, 630, 22), circle(420, 630, 22)), T),
    R(rpoly([514, 556, 592, 556, 584, 676, 522, 676], 8)),
    D([line([538, 574, 540, 660]), line([568, 574, 566, 660])], { w: 4 }),
    R(rpoly([504, 560, 518, 524, 586, 524, 600, 560], [6, 16, 16, 6]), { part: 'lid' }),
  ],
  alive: {
    parts: {
      truck: (t) => ({ y: -Math.abs(Math.sin(t * 9)) * 5, x: Math.sin(t * 1.3) * 10 }),
      lid: (t) => ({ y: -Math.max(0, Math.sin(t * 3)) * 26, r: -Math.max(0, Math.sin(t * 3)) * 10, ox: 552, oy: 556 }),
    },
    fx: [{ type: 'smoke', x: 40, y: 560, from: 0.3, to: 3.8 }],
  },
};
