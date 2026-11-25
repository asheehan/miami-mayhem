// A chubby narwhal swimming under the icebergs, its long twisty tusk pointing up. Comes
// alive: it swims up and down and flicks its tail.
import { R, D, rect, circle, ellipse, blob, band, bandMarks, spline, hills, eye, svg, clip, rpoly, star } from './kit.js';

const N = { part: 'nar' };

// One curved body, round head to the right, tail sweeping up to the left.
const body = blob([540, 430, 518, 366, 450, 324, 350, 322, 256, 342, 196, 330, 162, 296, 112, 306, 116, 376, 166, 446, 262, 506, 380, 530, 486, 512, 534, 476]);
const belly = clip(body, ellipse(380, 560, 210, 110));
const flukes = svg('M136 318 C112 280 70 274 34 236 C78 222 116 236 136 264 C148 228 178 206 226 206 C206 254 176 284 136 318 Z')[0];
const flipper = svg('M340 462 C320 496 290 524 262 540 C270 574 330 568 360 536 C380 514 392 490 394 466 Z')[0];
const tuskLine = [500, 362, 540, 270, 584, 164];
const tusk = band(tuskLine, 34, 6, { roundStart: true });

export default {
  id: 'narwhal',
  items: [
    R(rect(0, 0, 600, 800)),
    R(hills(110, 10, 5, { bottom: 0 })),
    R(rpoly([36, 112, 70, 50, 112, 66, 150, 28, 214, 112], [6, 10, 10, 10, 6])),
    R(rpoly([300, 112, 336, 62, 390, 56, 432, 112], [6, 12, 12, 6])),
    R(band([60, 770, 40, 700, 70, 640, 50, 580], 36, 14, { roundEnd: true })),
    R(band([130, 770, 150, 700, 124, 640, 140, 590], 32, 12, { roundEnd: true })),
    R(hills(710, 12, 4)),
    R(star(500, 744, 48, 22, 5, -80)),
    D(circle(500, 742, 7), { w: 4 }),
    R(flukes, N),
    R(body, N),
    R(belly, N),
    D([circle(300, 366, 9), circle(340, 392, 7), circle(250, 380, 7), circle(390, 360, 8), circle(210, 360, 6)], { w: 4, ...N }),
    R(flipper, N),
    R(tusk, N),
    D(bandMarks(tuskLine, 6, 34, 6, { from: 0.1, to: 0.9 }), { w: 4, ...N }),
    ...eye(450, 410, 16, { lx: 1, ...N }),
    D(spline([462, 456, 492, 466, 520, 452]), { w: 5, ...N }),
    D(ellipse(420, 448, 16, 9), { fill: '#ff9ab8', w: 0, ...N }),
    D([circle(560, 300, 9), circle(548, 262, 6), circle(574, 236, 11)], { fill: '#ffffff', w: 4 }),
  ],
  alive: {
    parts: {
      nar: (t) => ({ y: -Math.sin(t * 2) * 30, r: Math.sin(t * 2 + 0.8) * 6, ox: 340, oy: 430 }),
    },
    wink: { x: 450, y: 410, r: 17, part: 'nar', at: [1.3, 3.1] },
    fx: [{ type: 'bubbles', x: 540, y: 430, from: 0.3, to: 4 }],
  },
};
