// A proud, fluffy lion sitting in the sunny grass. Comes alive: it swishes its tail and
// tilts its big maned head.
import { R, D, rect, circle, ellipse, cloud, blob, band, spline, hills, eye, svg, all } from './kit.js';

const H = { part: 'head' };
const T = { part: 'tail' };

// A big scalloped mane: points round a circle, in and out.
const manePts = [];
for (let k = 0; k < 28; k++) {
  const a = (k / 28) * Math.PI * 2;
  const r = k % 2 ? 176 : 204;
  manePts.push(300 + Math.cos(a) * r, 300 + Math.sin(a) * r * 0.94);
}
const mane = blob(manePts, 0.9);
const face = svg('M300 186 C380 186 420 240 420 300 C420 372 370 418 300 418 C230 418 180 372 180 300 C180 240 220 186 300 186 Z')[0];
const ears = all(circle(212, 200, 40), circle(388, 200, 40));
const cheeks = all(ellipse(268, 362, 44, 34), ellipse(332, 362, 44, 34));
const nose = svg('M264 326 C264 306 336 306 336 326 C336 348 314 362 300 364 C286 362 264 348 264 326 Z')[0];
const body = svg('M300 430 C392 430 446 510 454 596 C460 668 430 704 380 708 L220 708 C170 704 140 668 146 596 C154 510 208 430 300 430 Z')[0];
const belly = ellipse(300, 600, 78, 92);
const legs = all(band([248, 560, 240, 640, 246, 690], 66, 70, { round: true }), band([352, 560, 360, 640, 354, 690], 66, 70, { round: true }));
const paws = all(ellipse(236, 708, 54, 30), ellipse(364, 708, 54, 30));
const tailLine = [440, 670, 510, 660, 546, 600, 540, 520];
const tuft = svg('M540 540 C506 530 500 486 520 460 C530 474 540 470 544 452 C556 466 566 466 574 456 C590 490 578 530 540 540 Z')[0];

export default {
  id: 'lion',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(84, 84, 54)),
    R(cloud(530, 66, 130, 52)),
    R(hills(600, 14, 3)),
    D([spline([40, 680, 50, 650, 60, 680]), spline([520, 740, 530, 712, 540, 740]), spline([90, 770, 100, 744, 110, 770])], { w: 4 }),
    R(band(tailLine, 26, 20), T),
    R(tuft, T),
    R(body),
    R(belly),
    R(legs),
    R(paws),
    D([spline([220, 722, 222, 704]), spline([246, 724, 246, 704]), spline([354, 724, 354, 704]), spline([380, 722, 378, 704])], { w: 4 }),
    R(mane, H),
    R(ears, H),
    D([circle(212, 204, 20), circle(388, 204, 20)], { w: 4, ...H }),
    R(face, H),
    R(cheeks, H),
    D([circle(250, 362, 3.5), circle(266, 376, 3.5), circle(246, 382, 3.5), circle(350, 362, 3.5), circle(334, 376, 3.5), circle(354, 382, 3.5)], { fill: 'ink', w: 0, ...H }),
    D([spline([300, 364, 300, 382]), spline([268, 392, 300, 406, 332, 392])], { w: 5, ...H }),
    R(nose, H),
    ...eye(252, 280, 21, { ...H }),
    ...eye(348, 280, 21, { ...H }),
  ],
  alive: {
    parts: {
      head: (t) => ({ r: Math.sin(t * 2.2) * 7, ox: 300, oy: 440 }),
      tail: (t) => ({ r: Math.sin(t * 5) * 14, ox: 440, oy: 670 }),
    },
    wink: { x: 252, y: 280, r: 22, part: 'head', at: [1.3, 3.1] },
  },
};
