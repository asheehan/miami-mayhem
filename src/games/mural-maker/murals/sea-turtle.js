// A sea turtle paddling over the sea floor. Comes alive: it glides up and down, with
// bubbles.
import { R, D, rect, circle, ellipse, blob, band, spline, hills, eye, svg, rpoly, poly, tf } from './kit.js';

const DY = 40; // the turtle sits a little below the middle
const T = (s) => tf(s, { y: DY });

const shell = T(svg('M70 430 C70 300 170 220 275 220 C380 220 480 300 480 430 Z')[0]);
const rim = T(svg('M56 430 L494 430 C494 458 470 474 440 474 L110 474 C80 474 56 458 56 430 Z')[0]);
const scuteM = T(rpoly([225, 262, 325, 262, 362, 340, 325, 416, 225, 416, 188, 340], 16));
const scuteL = T(rpoly([150, 290, 200, 272, 170, 340, 205, 416, 98, 416, 110, 345], 14));
const scuteR = T(rpoly([400, 290, 350, 272, 380, 340, 345, 416, 452, 416, 440, 345], 14));
const head = T(svg('M440 400 C452 360 470 318 520 310 C566 304 590 336 588 368 C586 404 556 420 520 420 C492 420 470 430 456 444 Z')[0]);
const front = T(svg('M352 466 C408 474 458 516 474 586 C478 606 456 614 444 600 C414 560 380 526 326 490 Z')[0]);
const back = T(svg('M146 462 C128 496 100 522 58 536 C40 542 42 562 62 564 C112 566 160 536 190 478 Z')[0]);
const far = T([
  svg('M392 300 C420 252 470 214 530 196 C550 192 558 212 542 222 C500 250 470 282 446 318 Z')[0],
  svg('M120 330 C92 312 70 290 52 262 C44 248 60 238 72 248 C100 270 130 290 160 300 Z')[0],
]);
const coral = [band([530, 720, 530, 660, 510, 626], 34, 24, { round: true }), band([532, 680, 566, 650, 568, 616], 28, 20, { round: true })];
const fish = [blob([90, 120, 130, 96, 172, 120, 130, 144]), poly([86, 120, 54, 98, 60, 142])];

export default {
  id: 'sea-turtle',
  items: [
    R(rect(0, 0, 600, 800)),
    D([spline([0, 40, 60, 30, 120, 40, 180, 30, 240, 40, 300, 30, 360, 40, 420, 30, 480, 40, 540, 30, 600, 40])], { w: 4 }),
    R(hills(690, 10, 4)),
    R(band([230, 740, 210, 690, 240, 650, 222, 610], 34, 20, { roundEnd: true })),
    R(coral),
    R(fish),
    D(circle(146, 114, 5), { fill: 'ink', w: 0 }),
    D([spline([220, 760, 250, 750, 280, 760]), spline([360, 776, 390, 766, 420, 776])], { w: 4 }),
    R(far, { part: 'turtle' }),
    R(head, { part: 'turtle' }),
    ...eye(540, 352 + DY, 17, { lx: 1, part: 'turtle' }),
    D(T(spline([548, 392, 566, 396, 582, 384])), { w: 5, part: 'turtle' }),
    R(shell, { part: 'turtle' }),
    R(scuteL, { part: 'turtle' }),
    R(scuteM, { part: 'turtle' }),
    R(scuteR, { part: 'turtle' }),
    R(rim, { part: 'turtle' }),
    R(back, { part: 'turtle' }),
    R(front, { part: 'turtle' }),
    D(T([ellipse(450, 520, 10, 7, 35), ellipse(462, 560, 8, 6, 30), ellipse(110, 520, 8, 6, -25)]), { w: 4, part: 'turtle' }),
  ],
  alive: {
    parts: { turtle: (t) => ({ x: Math.sin(t * 1.3) * 16, y: Math.sin(t * 2.6) * 22, r: Math.cos(t * 2.6) * 5, ox: 290, oy: 440 }) },
    wink: { x: 540, y: 352 + DY, r: 18, part: 'turtle', at: [1.4, 3.2] },
    fx: [{ type: 'bubbles', x: 580, y: 370, from: 0.3, to: 4.2 }],
  },
};
