// A dinosaur riding a surfboard on a big curling wave. Comes alive: rides the wave up and
// down with spray flying.
import { R, D, rect, circle, ellipse, blob, band, spline, hills, eye, svg, clip, tf, poly, all, inWall } from './kit.js';

const body = blob([186, 470, 194, 396, 244, 360, 312, 362, 354, 414, 350, 482, 304, 530, 226, 536, 190, 512]);
const head = blob([82, 266, 94, 222, 150, 198, 214, 204, 250, 236, 248, 284, 208, 310, 116, 308]);
const neck = [236, 400, 220, 340, 196, 280];
const tail = [334, 470, 404, 486, 462, 462, 512, 412];
const board = ellipse(270, 600, 224, 32, -6);
const spike = (x, y, ang) => tf(poly([-18, 8, 0, -30, 18, 8]), { r: ang, x, y });
const teeth = [];
for (const [x, y] of [[118, 296], [142, 302], [166, 304], [190, 300]]) teeth.push(poly([x - 8, y - 4, x + 8, y - 4, x, y + 8]));
const wave = svg('M250 800 L250 664 C330 644 404 594 436 504 C458 440 452 352 488 300 C524 252 584 246 600 258 L600 800 Z')[0];

export default {
  id: 'dino',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(110, 110, 62)),
    R(wave),
    D([spline([574, 300, 540, 330, 520, 400, 518, 480]), spline([590, 420, 566, 480, 560, 560]), spline([500, 560, 470, 620]), spline([590, 620, 584, 700])], { w: 4 }),
    R(inWall(blob([478, 318, 500, 270, 548, 244, 600, 240, 610, 300, 584, 292, 566, 318, 546, 300, 526, 330, 508, 306]))),
    R(hills(650, 12, 4)),
    D([spline([40, 700, 70, 690, 100, 700]), spline([320, 740, 350, 730, 380, 740]), spline([140, 770, 170, 760, 200, 770])], { w: 4 }),
    R(band(tail, 84, 10, { roundEnd: true }), { part: 'surfer' }),
    R(all(spike(250, 366, -14), spike(296, 360, 8), spike(340, 384, 36), spike(366, 432, 62), spike(404, 474, 72)), { part: 'surfer' }),
    R(all(band([238, 516, 230, 590], 50, 48), band([306, 512, 320, 586], 50, 48)), { part: 'surfer' }),
    R(band(neck, 70, 64), { part: 'surfer' }),
    R(all(body, band([204, 424, 168, 444, 154, 428], 22, 18, { roundEnd: true })), { part: 'surfer' }),
    R(clip(body, ellipse(232, 470, 58, 80, -10)), { part: 'surfer' }),
    D([spline([202, 430, 232, 436]), spline([200, 466, 232, 470]), spline([206, 500, 236, 504])], { w: 4, part: 'surfer' }),
    R(head, { part: 'surfer' }),
    D(teeth, { fill: '#ffffff', w: 3, part: 'surfer' }),
    D(spline([100, 288, 146, 304, 200, 298, 236, 276]), { w: 6, part: 'surfer' }),
    ...eye(190, 238, 15, { lx: -1, part: 'surfer' }),
    D([ellipse(108, 238, 5, 4)], { fill: 'ink', w: 0, part: 'surfer' }),
    R(board, { part: 'surfer' }),
    R(clip(board, tf(rect(40, 592, 460, 18), { r: -6, ox: 270, oy: 600 })), { part: 'surfer' }),
  ],
  alive: {
    parts: {
      surfer: (t) => ({ r: Math.sin(t * 3) * 6, y: Math.sin(t * 3 + 1) * 14 - 10, x: Math.sin(t * 1.5) * 12, ox: 270, oy: 600 }),
    },
    fx: [{ type: 'splash', x: 470, y: 610, from: 0.2, to: 1.2 }, { type: 'splash', x: 90, y: 630, from: 2, to: 3 }],
  },
};
