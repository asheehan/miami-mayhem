// A chubby little propeller plane flying through the clouds. Comes alive: it bobs along
// and its propeller spins.
import { R, D, rect, circle, ellipse, cloud, spline, hills, svg, all, rpoly } from './kit.js';

const P = { part: 'plane' };
const bob = (t) => Math.sin(t * 2.6) * 18;

// The plane's body: a round nose on the right, tapering up to the tail on the left.
const body = svg('M96 352 C150 332 250 340 340 336 C430 332 506 350 520 410 C530 456 498 482 440 488 C340 498 220 474 150 440 C104 418 76 380 96 352 Z')[0];
const fin = svg('M100 366 C92 312 92 250 112 210 C150 212 178 262 206 344 Z')[0];
const canopy = svg('M350 342 C356 290 418 280 452 318 C460 328 462 340 460 350 Z')[0];
const windows = all(circle(220, 392, 20), circle(270, 394, 20), circle(320, 396, 20));
const wing = rpoly([262, 432, 400, 440, 300, 604, 214, 600], [12, 22, 28, 22]);
const spinner = ellipse(522, 416, 30, 36);
const blades = all(ellipse(536, 352, 16, 58), ellipse(536, 480, 16, 58));

export default {
  id: 'airplane',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(500, 98, 54)),
    R(cloud(150, 130, 200, 110)),
    R(cloud(440, 640, 190, 100)),
    R(hills(700, 20, 3)),
    D([spline([380, 160, 396, 148, 412, 160, 428, 148, 444, 160]), spline([260, 210, 272, 200, 284, 210, 296, 200, 308, 210])], { w: 4 }),
    R(fin, P),
    R(body, P),
    R(canopy, P),
    D(spline([404, 296, 410, 346]), { w: 4, ...P }),
    R(windows, P),
    R(wing, P),
    R(spinner, P),
    R(blades, { part: 'prop' }),
    R(cloud(90, 620, 170, 96)),
  ],
  alive: {
    parts: {
      plane: (t) => ({ y: bob(t) }),
      prop: (t) => ({ y: bob(t), sy: Math.cos(t * 22), ox: 536, oy: 416 }),
    },
  },
};
