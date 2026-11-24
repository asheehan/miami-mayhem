// A big smiling butterfly over a flower meadow. Comes alive: it flaps its wings.
import { R, D, rect, circle, ellipse, blob, spline, hills, eye, svg, flipX, all, tf } from './kit.js';

const upR = svg('M306 372 C330 250 410 160 500 160 C572 160 590 240 560 310 C530 380 420 420 306 412 Z')[0];
const loR = svg('M306 408 C390 410 470 430 486 500 C500 572 440 616 384 600 C334 586 310 520 304 440 Z')[0];
const upL = flipX(upR, 300);
const loL = flipX(loR, 300);
const flower = (cx, cy, r) => {
  const out = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 - Math.PI / 2;
    out.push(circle(cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62, r * 0.46));
  }
  return out;
};
const tuft = (x, y) => [spline([x - 14, y - 26, x - 6, y]), spline([x, y - 34, x, y]), spline([x + 14, y - 26, x + 6, y])];

export default {
  id: 'butterfly',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(80, 80, 52)),
    R(hills(640, 14, 3)),
    D([...tuft(300, 740), ...tuft(40, 780), ...tuft(560, 770), ...tuft(230, 680), ...tuft(380, 690)], { w: 4 }),
    D([spline([120, 800, 116, 720]), spline([480, 800, 484, 700])], { w: 6 }),
    R(flower(116, 690, 66)),
    R(circle(116, 690, 27)),
    R(flower(484, 676, 70)),
    R(circle(484, 676, 28)),
    R(upL, { part: 'wl' }),
    R(loL, { part: 'wl' }),
    R([circle(166, 250, 42), circle(210, 512, 34)], { part: 'wl' }),
    R(upR, { part: 'wr' }),
    R(loR, { part: 'wr' }),
    R([circle(434, 250, 42), circle(390, 512, 34)], { part: 'wr' }),
    R(ellipse(300, 470, 30, 120)),
    D([spline([274, 430, 300, 440, 326, 430]), spline([272, 480, 300, 490, 328, 480]), spline([276, 530, 300, 538, 324, 530])], { w: 4 }),
    D([spline([284, 312, 272, 250, 246, 186]), spline([316, 312, 328, 250, 354, 186])], { w: 6 }),
    D([circle(244, 180, 12), circle(356, 180, 12)], { fill: 'ink', w: 0 }),
    R(circle(300, 342, 44)),
    ...eye(284, 334, 10),
    ...eye(316, 334, 10),
    D(spline([284, 358, 300, 368, 316, 358]), { w: 5 }),
  ],
  alive: {
    parts: {
      wl: (t) => ({ sx: 0.45 + 0.55 * Math.abs(Math.cos(t * 6)), ox: 300, oy: 400 }),
      wr: (t) => ({ sx: 0.45 + 0.55 * Math.abs(Math.cos(t * 6)), ox: 300, oy: 400 }),
    },
    wink: { x: 316, y: 334, r: 11, at: [1.5, 3.2] },
  },
};
