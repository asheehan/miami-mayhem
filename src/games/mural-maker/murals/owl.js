// A round, wide-eyed owl on a branch under the moon. Comes alive: it flaps its wings and
// winks.
import { R, D, rect, circle, ellipse, blob, band, spline, hills, eye, svg, all, star, crescent, clip, frond, inWall } from './kit.js';

// One round body with two ear tufts.
const body = svg('M300 208 C334 208 366 196 396 150 C406 190 414 216 424 238 C474 290 484 380 474 460 C462 576 400 640 300 640 C200 640 138 576 126 460 C116 380 126 290 176 238 C186 216 194 190 204 150 C234 196 266 208 300 208 Z')[0];
const belly = clip(body, ellipse(300, 530, 124, 130));
const face = all(circle(240, 318, 70), circle(360, 318, 70));
const beak = svg('M274 366 C284 354 316 354 326 366 C324 396 310 418 300 424 C290 418 276 396 274 366 Z')[0];
const wingL = svg('M150 340 C96 380 88 480 128 574 C168 556 196 470 186 370 Z')[0];
const wingR = svg('M450 340 C504 380 512 480 472 574 C432 556 404 470 414 370 Z')[0];
const feet = all(blob([236, 626, 262, 620, 282, 634, 286, 664, 262, 668, 240, 666, 224, 660]), blob([318, 626, 344, 620, 364, 634, 376, 660, 360, 666, 338, 668, 314, 664]));
const branch = inWall(band([-20, 672, 200, 656, 420, 662, 620, 640], 56, 48));

export default {
  id: 'owl',
  items: [
    R(rect(0, 0, 600, 800)),
    R(crescent(490, 110, 62, 30, -18, 54)),
    R(all(star(90, 90, 30, 13), star(230, 60, 22, 10), star(560, 300, 24, 11), star(56, 330, 24, 11))),
    R(hills(740, 12, 3)),
    R(body),
    R(belly),
    D([spline([254, 480, 270, 494, 286, 480]), spline([314, 480, 330, 494, 346, 480]), spline([224, 536, 240, 550, 256, 536]), spline([284, 536, 300, 550, 316, 536]), spline([344, 536, 360, 550, 376, 536]), spline([254, 590, 270, 604, 286, 590]), spline([314, 590, 330, 604, 346, 590])], { w: 4 }),
    R(face),
    ...eye(240, 318, 40, { lx: 0.3 }),
    ...eye(360, 318, 40, { lx: -0.3 }),
    R(beak),
    R(wingL, { part: 'wingL' }),
    D([spline([150, 420, 130, 470, 128, 530]), spline([170, 440, 156, 490, 150, 540])], { w: 4, part: 'wingL' }),
    R(wingR, { part: 'wingR' }),
    D([spline([450, 420, 470, 470, 472, 530]), spline([430, 440, 444, 490, 450, 540])], { w: 4, part: 'wingR' }),
    R(branch),
    R(all(frond(120, 690, 100, 80, 40, 0.1), frond(80, 660, 160, 70, 36, -0.3), frond(500, 664, 70, 80, 40, 0.1), frond(540, 648, 20, 60, 34, 0.3))),
    R(feet),
    D([spline([258, 640, 258, 664]), spline([342, 640, 342, 664])], { w: 4 }),
  ],
  alive: {
    parts: {
      wingL: (t) => ({ r: Math.sin(t * 9) * 16, ox: 170, oy: 360 }),
      wingR: (t) => ({ r: -Math.sin(t * 9) * 16, ox: 430, oy: 360 }),
    },
    wink: { x: 360, y: 318, r: 41, at: [1.3, 3.1] },
  },
};
