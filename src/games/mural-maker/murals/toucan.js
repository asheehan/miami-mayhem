// A toucan with a giant beak perched on a jungle branch. Comes alive: he bobs and winks.
import { R, D, rect, circle, ellipse, blob, band, spline, eye, clip, svg, frond, all, inWall } from './kit.js';

const body = blob([168, 282, 196, 205, 262, 172, 322, 195, 345, 255, 352, 330, 354, 420, 338, 520, 298, 592, 235, 616, 168, 578, 138, 470, 146, 360]);
const wing = blob([168, 362, 236, 344, 278, 410, 272, 500, 240, 580, 188, 562, 158, 470]);
const bib = blob([292, 214, 336, 240, 344, 320, 332, 410, 302, 442, 272, 400, 264, 320, 272, 250]);
const upper = svg('M316 206 C390 160 510 178 566 290 C582 322 578 356 556 348 C490 302 400 296 334 322 Z')[0];
const lower = svg('M334 300 C410 288 500 300 556 348 C510 368 420 370 338 356 Z')[0];
const tipBox = rect(484, 0, 116, 800);

export default {
  id: 'toucan',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(500, 96, 60)),
    R(all(frond(0, 0, 30, 240, 80, 0.25), frond(0, 0, 62, 200, 70, 0.15), frond(0, 0, 4, 200, 60, 0.35)).map(inWall)),
    R(all(frond(470, 640, 70, 140, 52, 0.15), frond(470, 640, 20, 120, 46, 0.3)).map(inWall)),
    R(band([226, 580, 216, 660, 204, 740], 78, 62, { roundEnd: true }), { part: 'bird' }),
    R(body, { part: 'bird' }),
    R(wing, { part: 'bird' }),
    D([spline([190, 440, 220, 470, 232, 520]), spline([180, 490, 206, 530])], { w: 4, part: 'bird' }),
    R(bib, { part: 'bird' }),
    R(inWall(band([0, 650, 200, 626, 400, 636, 600, 610], 48, 40))),
    D([spline([60, 640, 100, 636]), spline([300, 632, 350, 634]), spline([500, 620, 540, 614])], { w: 4 }),
    R([ellipse(240, 616, 32, 17), ellipse(298, 612, 32, 17)], { part: 'bird' }),
    D([spline([230, 606, 232, 626]), spline([250, 606, 252, 626]), spline([288, 602, 290, 622]), spline([308, 602, 310, 622])], { w: 4, part: 'bird' }),
    R(upper, { part: 'bird' }),
    R(lower, { part: 'bird' }),
    R([clip(upper, tipBox), clip(lower, tipBox)], { part: 'bird' }),
    D(spline([352, 234, 400, 212, 450, 214]), { w: 4, part: 'bird' }),
    R(circle(280, 252, 34), { part: 'bird' }),
    ...eye(282, 250, 17, { lx: 1, part: 'bird' }),
  ],
  alive: {
    parts: { bird: (t) => ({ r: Math.sin(t * 3) * 6, ox: 270, oy: 612 }) },
    wink: { x: 282, y: 250, r: 18, part: 'bird', at: [1.2, 3] },
  },
};
