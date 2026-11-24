// A dolphin leaping out of the waves. Comes alive: it jumps and flicks its tail, with a
// splash.
import { R, D, rect, circle, cloud, spline, hills, eye, svg } from './kit.js';

// The dolphin arcs over the water, nose down to the left and tail to the right.
const body = svg('M92 470 C110 452 126 440 142 430 C150 396 176 366 210 346 C270 312 350 316 410 356 C450 384 480 424 496 468 L474 480 C456 450 430 430 396 424 C336 412 276 428 236 452 C208 470 178 474 152 468 C130 466 108 472 92 470 Z')[0];
const belly = svg('M152 468 C178 474 208 470 236 452 C276 428 336 412 396 424 C430 430 456 450 474 480 C452 432 420 400 384 392 C330 382 270 396 226 424 C200 442 176 452 152 468 Z')[0];
const dorsal = svg('M318 322 C340 270 380 250 420 252 C402 280 400 320 412 360 Z')[0];
const flipper = svg('M236 440 C232 480 252 520 290 536 C286 500 282 462 276 430 Z')[0];
const flukes = svg('M474 478 C440 500 420 530 418 566 C446 548 472 538 494 536 C512 548 536 554 566 548 C552 516 528 488 496 468 Z')[0];
const mouth = spline([96, 470, 126, 458, 152, 452, 168, 440]);
const [ex, ey] = [186, 414];

export default {
  id: 'dolphin',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(486, 112, 58)),
    R(cloud(130, 110, 180, 72)),
    R(cloud(330, 180, 130, 52)),
    R(hills(600, 12, 4)),
    R(flukes, { part: 'dolphin' }),
    R(dorsal, { part: 'dolphin' }),
    R(body, { part: 'dolphin' }),
    R(belly, { part: 'dolphin' }),
    R(flipper, { part: 'dolphin' }),
    ...eye(ex, ey, 11, { lx: -1, part: 'dolphin' }),
    D(mouth, { w: 5, part: 'dolphin' }),
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
