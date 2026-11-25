// A sturdy farm tractor with a giant back wheel, in front of the barn. Comes alive: it
// bounces along and puffs smoke.
import { R, D, rect, circle, cloud, spline, hills, rpoly, poly, all, line } from './kit.js';

const T = { part: 'tractor' };

export default {
  id: 'tractor',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(92, 92, 52)),
    R(cloud(290, 90, 170, 64)),
    R(hills(420, 18, 3)),
    R(rpoly([420, 236, 576, 236, 576, 420, 420, 420], 6)),
    R(poly([404, 244, 498, 160, 592, 244])),
    D([rect(474, 330, 48, 90), line([474, 330, 522, 420]), line([522, 330, 474, 420])], { w: 4 }),
    R(hills(640, 10, 2)),
    D([spline([20, 760, 200, 740, 380, 760, 580, 740]), spline([20, 712, 200, 694, 380, 712, 580, 694])], { w: 4 }),
    R(rect(414, 296, 36, 120, 10), T),
    R(rpoly([92, 286, 290, 286, 300, 480, 84, 480], 16), T),
    R(rpoly([118, 318, 262, 318, 266, 430, 116, 430], 16), T),
    R(rect(64, 252, 252, 44, 20), T),
    R(rpoly([280, 400, 508, 410, 540, 536, 280, 536], [18, 26, 20, 6]), T),
    R(rect(504, 424, 46, 112, 14), T),
    D([line([514, 450, 540, 450]), line([514, 480, 540, 480]), line([514, 510, 540, 510])], { w: 4, ...T }),
    R(circle(184, 556, 126), T),
    R(circle(184, 556, 58), T),
    D(circle(184, 556, 16), { fill: 'ink', w: 0, ...T }),
    R(circle(462, 610, 72), T),
    R(circle(462, 610, 32), T),
    D(circle(462, 610, 10), { fill: 'ink', w: 0, ...T }),
  ],
  alive: {
    parts: { tractor: (t) => ({ y: -Math.abs(Math.sin(t * 6)) * 8, r: Math.sin(t * 6) * 1.5, ox: 300, oy: 680 }) },
    fx: [{ type: 'smoke', x: 432, y: 290, from: 0.2, to: 4 }],
  },
};
