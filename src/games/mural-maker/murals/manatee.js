// A big gentle manatee floating under the water with a leaf of lettuce, sea grass below.
// Comes alive: she bobs, waves her round paddle tail and blows bubbles.
import { R, D, rect, ellipse, blob, band, spline, hills, eye, svg, all, poly, inWall } from './kit.js';

// One chunky potato body, nose to the left, rear lifting a little to the right.
const body = svg('M58 404 C76 334 150 290 236 284 C318 278 392 290 440 318 C470 336 492 352 506 366 C514 390 506 410 490 422 C446 470 384 504 300 512 C218 520 146 508 100 484 C60 462 46 436 58 404 Z')[0];
// The tail: a short stalk opening into a wide, round, flat paddle (a big spoon).
const tailPts = [440, 330, 476, 346];
for (let a = -128; a <= 152; a += 20) tailPts.push(530 + Math.cos((a * Math.PI) / 180) * 66, 432 + Math.sin((a * Math.PI) / 180) * 62);
tailPts.push(462, 458, 440, 420);
const tail = blob(tailPts);
const belly = svg('M100 484 C146 508 218 520 300 512 C384 504 446 470 490 422 C440 452 380 470 300 474 C220 478 150 470 100 452 C92 462 92 474 100 484 Z')[0];
const muzzle = svg('M44 420 C40 384 64 360 100 360 C140 360 166 384 164 420 C162 450 140 470 104 470 C70 470 46 452 44 420 Z')[0];
const farFlipper = svg('M250 450 C266 490 284 530 306 556 C324 578 360 570 356 540 C350 506 326 474 296 448 Z')[0];
const flipper = svg('M204 440 C190 476 172 512 150 536 C128 560 138 598 174 592 C214 584 246 536 260 478 Z')[0];
const lettuce = blob([62, 520, 84, 500, 108, 510, 130, 498, 152, 514, 158, 540, 172, 564, 160, 590, 138, 600, 114, 614, 90, 602, 68, 608, 54, 584, 38, 560, 48, 538]);
const fish = all(ellipse(470, 150, 50, 32), poly([512, 150, 556, 118, 552, 184]));
const grassL = all(
  band([40, 730, 26, 660, 54, 600, 34, 540], 34, 14, { roundEnd: true }),
  band([90, 730, 104, 670, 84, 620], 28, 12, { roundEnd: true }),
);
const grassR = all(
  band([470, 730, 450, 670, 476, 610, 458, 560], 34, 14, { roundEnd: true }),
  band([540, 740, 562, 680, 540, 630, 560, 590], 30, 12, { roundEnd: true }),
);

export default {
  id: 'manatee',
  items: [
    R(rect(0, 0, 600, 800)),
    R(hills(70, 10, 6, { bottom: 0 })),
    R(grassL),
    R(grassR),
    R(hills(690, 12, 4)),
    R(blob([230, 770, 250, 718, 310, 700, 370, 716, 388, 770])),
    R(fish, { part: 'fish' }),
    ...eye(448, 142, 9, { lx: -1, part: 'fish' }),
    D(spline([500, 132, 508, 150, 500, 168]), { w: 4, part: 'fish' }),
    R(tail, { part: 'tail' }),
    D([spline([520, 392, 546, 404, 566, 430]), spline([514, 420, 540, 436, 554, 466])], { w: 4, part: 'tail' }),
    R(farFlipper, { part: 'cow' }),
    R(body, { part: 'cow' }),
    R(belly, { part: 'cow' }),
    D([spline([92, 340, 112, 330, 134, 336]), spline([104, 322, 122, 314, 142, 320]), ellipse(340, 340, 6, 5), ellipse(372, 370, 5, 4), ellipse(410, 346, 6, 5), ellipse(316, 392, 5, 4)], { w: 4, part: 'cow' }),
    R(muzzle, { part: 'cow' }),
    D([spline([66, 444, 104, 464, 142, 444])], { w: 5, part: 'cow' }),
    D([ellipse(70, 380, 7, 5, -30), ellipse(96, 372, 7, 5, -10)], { fill: 'ink', w: 0, part: 'cow' }),
    D([ellipse(68, 418, 3.5, 3.5), ellipse(84, 410, 3.5, 3.5), ellipse(80, 430, 3.5, 3.5), ellipse(124, 410, 3.5, 3.5), ellipse(140, 418, 3.5, 3.5), ellipse(128, 430, 3.5, 3.5)], { fill: 'ink', w: 0, part: 'cow' }),
    ...eye(176, 362, 13, { lx: -1, part: 'cow' }),
        R(lettuce, { part: 'cow' }),
    D([spline([58, 584, 90, 558, 128, 526]), spline([78, 568, 72, 540]), spline([98, 548, 110, 522]), spline([84, 564, 110, 576])], { w: 4, part: 'cow' }),
    R(flipper, { part: 'cow' }),
    D([ellipse(148, 570, 5, 5), ellipse(160, 582, 5, 5), ellipse(176, 584, 5, 5)], { fill: '#ffffff', w: 3, part: 'cow' }),
    D([ellipse(40, 300, 10, 10), ellipse(28, 258, 7, 7), ellipse(44, 220, 12, 12)], { fill: '#ffffff', w: 4 }),
  ],
  alive: {
    parts: {
      cow: (t) => ({ y: Math.sin(t * 2.2) * 14, r: Math.sin(t * 2.2 + 0.6) * 2.5, ox: 300, oy: 420 }),
      tail: (t) => ({ y: Math.sin(t * 2.2) * 14 + Math.sin(t * 4.4) * 10, r: Math.sin(t * 4.4) * 9, ox: 470, oy: 400 }),
      fish: (t) => ({ x: -Math.sin(t * 1.6) * 40, y: Math.sin(t * 4) * 6 }),
    },
    wink: { x: 176, y: 362, r: 14, part: 'cow', at: [1.4, 3.2] },
    fx: [{ type: 'bubbles', x: 60, y: 360, from: 0.2, to: 4 }],
  },
};
