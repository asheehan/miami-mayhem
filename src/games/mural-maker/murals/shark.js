// A big friendly shark swimming over the sea floor. Comes alive: it swims to and fro,
// swishing, with bubbles.
import { R, D, rect, circle, ellipse, blob, band, spline, hills, eye, clip, svg, star, poly } from './kit.js';

// One chunky silhouette: round snout on the right, tapering to the tail on the left.
const body = svg('M118 366 C186 300 270 262 360 262 C456 262 530 306 554 368 C566 410 528 452 456 464 C364 480 254 452 180 418 C160 408 140 396 118 386 Z')[0];
const belly = clip(body, ellipse(380, 520, 250, 104));
const tail = svg('M156 360 C128 330 96 288 44 246 C64 300 74 344 72 378 C88 420 88 460 70 512 C112 478 140 438 160 402 Z')[0];
const dorsal = svg('M290 274 C300 226 324 186 372 150 C378 196 392 238 424 266 Z')[0];
const flipper = svg('M330 428 C322 476 300 512 252 540 C310 540 366 508 392 440 Z')[0];
const teeth = [];
for (const [x, y] of [[476, 420], [500, 418], [524, 410]]) teeth.push(poly([x - 10, y - 1, x + 10, y - 3, x + 1, y + 16]));
const fish = [blob([70, 150, 110, 124, 150, 150, 110, 176]), poly([66, 150, 34, 128, 40, 172])];
const weedL = [60, 720, 40, 640, 76, 580, 50, 520, 80, 470];
const weedR = [540, 730, 566, 650, 530, 590, 560, 530];

export default {
  id: 'shark',
  items: [
    R(rect(0, 0, 600, 800)),
    D([spline([180, 60, 230, 50, 280, 60]), spline([420, 90, 470, 80, 520, 90])], { w: 4 }),
    R(hills(680, 12, 4)),
    R(band(weedL, 34, 18, { roundEnd: true })),
    R(band(weedR, 34, 18, { roundEnd: true })),
    R(blob([360, 700, 390, 652, 450, 640, 500, 668, 506, 712, 420, 722])),
    R(star(220, 728, 40, 18, 5, -80)),
    D([spline([120, 760, 150, 750, 180, 760]), spline([300, 770, 330, 760, 360, 770])], { w: 4 }),
    R(fish),
    D(circle(126, 144, 5), { fill: 'ink', w: 0 }),
    R(tail, { part: 'shark' }),
    R(dorsal, { part: 'shark' }),
    R(body, { part: 'shark' }),
    R(belly, { part: 'shark' }),
    D([spline([394, 330, 384, 360, 392, 392]), spline([412, 326, 402, 358, 410, 390]), spline([430, 324, 420, 356, 428, 388])], { w: 5, part: 'shark' }),
    R(flipper, { part: 'shark' }),
    D(teeth, { fill: '#ffffff', w: 3, part: 'shark' }),
    D(spline([452, 408, 480, 420, 512, 418, 544, 400]), { w: 6, part: 'shark' }),
    ...eye(484, 338, 22, { lx: 1, part: 'shark' }),
    D([circle(560, 260, 10), circle(574, 220, 7), circle(566, 186, 5)], { fill: '#ffffff', w: 4 }),
  ],
  alive: {
    parts: { shark: (t) => ({ x: Math.sin(t * 1.6) * 24, y: Math.sin(t * 3.2) * 8, r: Math.sin(t * 3.2) * 3, ox: 330, oy: 380 }) },
    wink: { x: 484, y: 338, r: 23, part: 'shark', at: [1.2, 3] },
    fx: [{ type: 'bubbles', x: 560, y: 360, from: 0, to: 4.2 }],
  },
};
