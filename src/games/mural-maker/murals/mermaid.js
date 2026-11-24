// A mermaid sitting on a rock in the sea, waving. Comes alive: she flicks her tail, with
// bubbles.
import { R, D, rect, circle, ellipse, cloud, blob, band, spline, hills, eye, svg, star, all, poly, inWall } from './kit.js';

const hair = svg('M300 92 C384 92 430 152 428 228 C426 300 456 360 446 432 C418 424 398 406 386 382 C374 412 352 426 330 426 L270 426 C248 426 226 412 214 382 C202 406 182 424 154 432 C144 360 174 300 172 228 C170 152 216 92 300 92 Z')[0];
const face = svg('M236 196 C252 178 284 170 300 146 C318 172 350 180 364 196 C370 246 342 276 300 276 C258 276 230 246 236 196 Z')[0];
const torso = svg('M278 268 L322 268 C326 292 360 306 362 360 C362 400 346 428 344 452 L256 452 C254 428 238 400 238 360 C240 306 274 292 278 268 Z')[0];
const armL = band([254, 306, 220, 366, 234, 420], 32, 28, { roundEnd: true });
const armR = band([346, 306, 398, 270, 420, 206], 32, 28, { roundEnd: true });
const top = all(blob([246, 338, 258, 312, 284, 306, 300, 330, 284, 358, 256, 360]), blob([354, 338, 342, 312, 316, 306, 300, 330, 316, 358, 344, 360]));
const tailLine = [300, 430, 312, 510, 370, 572, 452, 600, 516, 584];
const tail = band(tailLine, (t) => 124 - 84 * t);
const fluke = svg('M522 600 C488 570 476 520 492 470 C512 504 534 524 556 540 C568 526 584 524 598 530 C590 566 560 596 522 600 Z')[0];
const rock = inWall(blob([140, 660, 210, 560, 360, 534, 500, 566, 584, 660, 580, 780, 150, 790]));

export default {
  id: 'mermaid',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(518, 86, 50)),
    R(cloud(110, 96, 160, 62)),
    R(hills(390, 10, 4)),
    D([spline([40, 470, 70, 460, 100, 470]), spline([60, 720, 90, 710, 120, 720])], { w: 4 }),
    R([blob([60, 540, 100, 516, 140, 540, 100, 564]), poly([56, 540, 26, 518, 30, 562])]),
    D(circle(116, 534, 5), { fill: 'ink', w: 0 }),
    R(rock),
    R(star(210, 700, 48, 22, 5, -80)),
    R(hair, { part: 'girl' }),
    R([torso, armL, armR, face], { part: 'girl' }),
    R(top, { part: 'girl' }),
    D([spline([240, 340, 266, 346]), spline([334, 346, 360, 340])], { w: 0, part: 'girl' }),
    ...eye(276, 214, 14, { part: 'girl' }),
    ...eye(324, 214, 14, { part: 'girl' }),
    D(spline([282, 246, 300, 256, 318, 246]), { w: 5, part: 'girl' }),
    D([ellipse(258, 240, 11, 7), ellipse(342, 240, 11, 7)], { fill: '#ff9ab8', w: 0, part: 'girl' }),
    R(fluke, { part: 'fluke' }),
    R(tail),
    D([spline([280, 500, 300, 512, 320, 500]), spline([326, 540, 344, 556, 364, 548]), spline([300, 470, 320, 480, 340, 470]), spline([380, 566, 396, 582, 414, 578]), spline([430, 580, 446, 594, 462, 588])], { w: 4 }),
    D([circle(470, 300, 10), circle(490, 260, 7), circle(476, 226, 5)], { fill: '#ffffff', w: 4 }),
  ],
  alive: {
    parts: {
      fluke: (t) => ({ r: Math.sin(t * 5) * 14, ox: 516, oy: 590 }),
      girl: (t) => ({ r: Math.sin(t * 2.4) * 3, ox: 300, oy: 450 }),
    },
    wink: { x: 324, y: 214, r: 15, part: 'girl', at: [1.2, 3] },
    fx: [{ type: 'bubbles', x: 520, y: 520, from: 0.2, to: 4 }],
  },
};
