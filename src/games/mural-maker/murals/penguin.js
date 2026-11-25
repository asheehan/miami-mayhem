// A round little penguin in a scarf, waving from the ice with a fish for lunch. Comes
// alive: it waves its flipper and the fish flips.
import { R, D, rect, circle, ellipse, blob, band, spline, eye, svg, all, poly, hills, inWall } from './kit.js';

const body = svg('M300 168 C392 168 442 248 448 340 C456 450 452 560 412 620 C380 664 220 664 188 620 C148 560 144 450 152 340 C158 248 208 168 300 168 Z')[0];
// White face and tummy in one heart-topped shape.
const front = svg('M300 238 C320 204 382 206 394 252 C402 282 392 302 384 322 C404 382 410 462 408 522 C404 592 370 634 300 638 C230 634 196 592 192 522 C190 462 196 382 216 322 C208 302 198 282 206 252 C218 206 280 204 300 238 Z')[0];
const flipperL = band([186, 410, 130, 350, 102, 276], 58, 30, { roundEnd: true });
const flipperR = band([416, 404, 462, 470, 474, 540], 58, 30, { roundEnd: true });
const scarf = band([190, 344, 300, 372, 410, 344], 42, 42, { round: true });
const scarfEnd = svg('M340 360 C350 400 352 440 340 480 L392 486 C398 446 394 400 380 360 Z')[0];
const feet = all(ellipse(244, 646, 52, 22, -6), ellipse(356, 646, 52, 22, 6));
const beak = svg('M266 296 C280 282 320 282 334 296 C326 318 310 330 300 332 C290 330 274 318 266 296 Z')[0];
const fish = all(ellipse(490, 690, 48, 26, -8), poly([530, 684, 572, 656, 568, 716]));
const mountains = blob([-40, 470, 60, 330, 120, 290, 180, 360, 260, 260, 320, 240, 400, 300, 470, 220, 540, 260, 640, 380, 640, 520, -40, 520], 0.6);

export default {
  id: 'penguin',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(512, 94, 50)),
    R(inWall(mountains)),
    R(hills(600, 10, 3)),
    R(flipperL, { part: 'wave' }),
    R(flipperR),
    R(body),
    R(front),
    R(feet),
    D([spline([212, 656, 220, 640]), spline([236, 662, 240, 644]), spline([364, 662, 360, 644]), spline([388, 656, 380, 640])], { w: 4 }),
    R(scarfEnd),
    D([spline([346, 470, 352, 486]), spline([366, 472, 370, 488]), spline([384, 474, 386, 488])], { w: 4 }),
    R(scarf),
    R(beak),
    D(spline([278, 304, 300, 312, 322, 304]), { w: 4 }),
    ...eye(254, 268, 19, { lx: 0.4 }),
    ...eye(346, 268, 19, { lx: 0.4 }),
    D([ellipse(232, 312, 16, 9), ellipse(368, 312, 16, 9)], { fill: '#ff9ab8', w: 0 }),
    R(fish, { part: 'fish' }),
    ...eye(468, 682, 8, { lx: -1, part: 'fish' }),
    D(spline([514, 670, 520, 690, 514, 708]), { w: 4, part: 'fish' }),
    D([circle(60, 140, 6), circle(140, 70, 5), circle(250, 120, 6), circle(380, 60, 5), circle(420, 170, 6), circle(60, 250, 5), circle(560, 200, 6)], { fill: '#ffffff', w: 3 }),
  ],
  alive: {
    parts: {
      wave: (t) => ({ r: Math.sin(t * 9) * 18, ox: 186, oy: 410 }),
      fish: (t) => ({ y: -Math.abs(Math.sin(t * 3)) * 40, r: Math.sin(t * 6) * 20, ox: 500, oy: 690 }),
    },
    wink: { x: 254, y: 268, r: 20, at: [1.3, 3.1] },
  },
};

