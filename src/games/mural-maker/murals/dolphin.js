// A dolphin leaping out of the waves. Comes alive: it jumps and flicks its tail, with a
// splash.
import { R, D, rect, circle, cloud, band, spline, hills, eye, svg, clip, ellipse, tf, blob } from './kit.js';

const spine = [92, 252, 150, 250, 232, 272, 322, 326, 398, 404, 446, 486];
const prof = [[0, 14], [0.07, 24], [0.13, 46], [0.22, 100], [0.38, 124], [0.58, 100], [0.82, 50], [1, 24]];
const width = (t) => {
  for (let k = 1; k < prof.length; k++) {
    if (t <= prof[k][0]) {
      const [t0, w0] = prof[k - 1];
      const [t1, w1] = prof[k];
      const u = (t - t0) / (t1 - t0);
      return w0 + (w1 - w0) * (u * u * (3 - 2 * u));
    }
  }
  return prof[prof.length - 1][1];
};
const body = band(spine, width, 0, { roundStart: true, per: 14 });
// the tail flukes, drawn pointing down then turned to follow the tail
const flukes = tf(blob([0, -14, 40, -6, 78, -22, 104, -38, 94, 2, 60, 30, 26, 40, 0, 28, -26, 40, -60, 30, -94, 2, -104, -38, -78, -22, -40, -6], 0.8), { r: -30, x: 452, y: 498 });

export default {
  id: 'dolphin',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(486, 112, 58)),
    R(cloud(130, 110, 180, 72)),
    R(cloud(330, 180, 130, 52)),
    R(hills(600, 12, 4)),
    R(flukes, { part: 'dolphin' }),
    R(svg('M330 318 Q382 248 444 244 Q406 292 404 368 Z'), { part: 'dolphin' }),
    R(body, { part: 'dolphin' }),
    R(clip(body, ellipse(232, 344, 200, 52, 30)), { part: 'dolphin' }),
    R(svg('M234 328 Q190 392 204 432 Q252 398 286 346 Z'), { part: 'dolphin' }),
    ...eye(176, 262, 10, { lx: -1, part: 'dolphin' }),
    D(spline([100, 268, 132, 278, 160, 276]), { w: 5, part: 'dolphin' }),
    D(spline([186, 228, 196, 222]), { w: 4, part: 'dolphin' }),
    D([spline([150, 160, 160, 150, 170, 160, 180, 150, 190, 160])], { w: 4 }),
    R(hills(660, 16, 5, { flip: true })),
    D([spline([60, 712, 100, 702, 140, 712]), spline([300, 730, 340, 720, 380, 730]), spline([460, 770, 500, 760, 540, 770]), spline([120, 780, 160, 770, 200, 780])], { w: 4 }),
    D([circle(440, 620, 9), circle(480, 600, 7), circle(510, 626, 8), circle(400, 600, 6), circle(530, 590, 5)], { fill: '#ffffff', w: 4 }),
  ],
  alive: {
    parts: {
      dolphin: (t) => {
        const k = Math.sin(Math.min(1, t / 3.8) * Math.PI);
        return { y: -k * 120, r: -Math.sin(t * 1.7) * 14, ox: 300, oy: 420 };
      },
    },
    fx: [{ type: 'splash', x: 450, y: 640, from: 0, to: 0.9 }, { type: 'splash', x: 300, y: 640, from: 3.2, to: 4.2 }],
  },
};
