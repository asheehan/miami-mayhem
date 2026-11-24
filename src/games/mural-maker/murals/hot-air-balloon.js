// A striped hot-air balloon floating over the hills. Comes alive: it drifts up and sways.
import { R, D, rect, circle, ellipse, cloud, spline, hills, svg, clip, rpoly, line } from './kit.js';

const envelope = svg('M300 66 C432 66 512 168 512 288 C512 392 432 452 378 500 L222 500 C168 452 88 392 88 288 C88 168 168 66 300 66 Z')[0];
const basket = rpoly([244, 604, 356, 604, 344, 694, 256, 694], 10);
const P = { part: 'balloon' };

export default {
  id: 'hot-air-balloon',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(552, 58, 46)),
    R(cloud(104, 590, 170, 66)),
    R(cloud(500, 520, 150, 60)),
    D([spline([506, 190, 518, 180, 530, 190, 542, 180, 554, 190]), spline([60, 210, 72, 200, 84, 210, 96, 200, 108, 210])], { w: 4 }),
    R(hills(690, 22, 2)),
    R(hills(740, 14, 3, { flip: true })),
    D([line([250, 540, 262, 604]), line([350, 540, 338, 604]), line([300, 540, 300, 604])], { w: 4, ...P }),
    R(envelope, P),
    R(clip(envelope, ellipse(300, 286, 146, 262)), P),
    R(clip(envelope, ellipse(300, 286, 60, 262)), P),
    R(clip(envelope, rect(0, 300, 600, 56)), P),
    R(rpoly([222, 496, 378, 496, 358, 542, 242, 542], 8), P),
    R(basket, P),
    D([line([262, 650, 338, 650]), line([278, 620, 282, 694]), line([300, 620, 300, 694]), line([322, 620, 318, 694])], { w: 4, ...P }),
    R(rect(234, 592, 132, 28, 10), P),
  ],
  alive: {
    parts: { balloon: (t) => ({ y: -Math.sin(Math.min(1, t / 4) * Math.PI) * 70, r: Math.sin(t * 2.2) * 4, ox: 300, oy: 300 }) },
  },
};
