// A monster truck on giant wheels on a dirt track. Comes alive: it bounces and the wheels
// spin.
import { R, D, rect, circle, cloud, band, spline, hills, ellipse, rpoly, svg, line } from './kit.js';

const W1 = [150, 590];
const W2 = [450, 590];
const body = rpoly([40, 380, 282, 380, 318, 284, 446, 280, 486, 372, 560, 382, 566, 476, 34, 476], [14, 8, 18, 18, 8, 18, 12, 12]);
const win = rpoly([334, 302, 432, 300, 462, 370, 316, 372], 10);
const flame = svg('M498 410 C522 418 526 450 500 460 L360 462 Q320 462 226 472 Q296 450 330 444 Q270 440 196 432 Q270 420 318 420 Q290 406 236 392 Q330 396 380 410 Z')[0];
const bumper = rpoly([540, 440, 590, 440, 590, 480, 540, 480], 8);
// a chunky tyre: rounded knobs all round
const tyre = (x, y) => {
  const pts = [];
  const n = 14;
  for (let k = 0; k < n * 2; k++) {
    const a = (k / (n * 2)) * Math.PI * 2;
    const r = k % 2 ? 104 : 120;
    pts.push(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  return rpoly(pts, 9);
};
const spokes = (cx, cy) => [0, 60, 120].map((a) => {
  const r = (a * Math.PI) / 180;
  return line([cx - Math.cos(r) * 34, cy - Math.sin(r) * 34, cx + Math.cos(r) * 34, cy + Math.sin(r) * 34]);
});
const springs = (x) => spline([x, 476, x - 14, 488, x + 14, 500, x - 14, 512, x + 14, 524, x, 536]);

export default {
  id: 'monster-truck',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(500, 96, 56)),
    R(cloud(130, 110, 180, 70)),
    R(cloud(330, 190, 120, 48)),
    R(hills(640, 16, 3)),
    D([spline([30, 760, 60, 750, 90, 760]), spline([280, 770, 310, 760, 340, 770]), spline([500, 750, 530, 740, 560, 750])], { w: 4 }),
    D([springs(190), springs(410), line([150, 590, 220, 476]), line([450, 590, 380, 476])], { w: 7, part: 'truck' }),
    R(rect(110, 470, 380, 28, 10), { part: 'truck' }),
    R(body, { part: 'truck' }),
    R(win, { part: 'truck' }),
    R(flame, { part: 'truck' }),
    R(bumper, { part: 'truck' }),
    D([circle(556, 404, 13)], { fill: '#fff6b0', w: 4, part: 'truck' }),
    D([line([316, 394, 344, 394])], { w: 4, part: 'truck' }),
    R(band([86, 384, 86, 290], 26, 26, { roundEnd: true }), { part: 'truck' }),
    R(tyre(...W1), { part: 'w1' }),
    R(circle(...W1, 56), { part: 'w1' }),
    D([circle(...W1, 16), ...spokes(...W1)], { w: 5, part: 'w1' }),
    R(tyre(...W2), { part: 'w2' }),
    R(circle(...W2, 56), { part: 'w2' }),
    D([circle(...W2, 16), ...spokes(...W2)], { w: 5, part: 'w2' }),
    R(ellipse(300, 736, 130, 30)),
  ],
  alive: {
    parts: {
      truck: (t) => ({ y: -Math.abs(Math.sin(t * 6)) * 26, r: Math.sin(t * 6) * 2, ox: 300, oy: 480 }),
      w1: (t) => ({ r: t * 260, ox: W1[0], oy: W1[1], y: -Math.abs(Math.sin(t * 6 + 0.6)) * 10 }),
      w2: (t) => ({ r: t * 260, ox: W2[0], oy: W2[1], y: -Math.abs(Math.sin(t * 6 + 0.6)) * 10 }),
    },
    fx: [{ type: 'smoke', x: 300, y: 660, from: 0.2, to: 3.6 }],
  },
};
