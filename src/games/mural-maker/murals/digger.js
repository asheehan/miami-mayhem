// A big digger scooping up a pile of dirt. Comes alive: the arm digs up and down.
import { R, D, rect, circle, cloud, blob, band, spline, hills, rpoly, line, inWall } from './kit.js';

const A = { part: 'arm' };

export default {
  id: 'digger',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(96, 100, 58)),
    R(cloud(420, 110, 190, 76)),
    R(hills(650, 10, 3)),
    R(inWall(blob([400, 690, 430, 620, 490, 580, 560, 590, 600, 620, 600, 700]))),
    D([circle(470, 660, 8), circle(530, 630, 6), circle(560, 670, 7)], { w: 4 }),
    R(band([340, 486, 404, 340, 470, 250], 58, 46, { round: true }), A),
    R(band([470, 250, 516, 330, 530, 430], 44, 38, { round: true }), A),
    D([circle(470, 250, 10), circle(340, 486, 10)], { fill: 'ink', w: 0, ...A }),
    R(rpoly([492, 414, 592, 432, 594, 500, 566, 552, 500, 572, 512, 548, 484, 548, 498, 522, 476, 518, 494, 480], [10, 12, 30, 30, 3, 6, 3, 6, 3, 10]), A),
    R(rect(48, 556, 340, 100, 50)),
    D([circle(100, 606, 26), circle(170, 606, 22), circle(240, 606, 22), circle(336, 606, 26)], { fill: '#ffffff', w: 4 }),
    R(rect(294, 380, 34, 80, 8)),
    R(rect(66, 446, 312, 116, 16)),
    R(rpoly([84, 450, 84, 296, 200, 296, 246, 450], [6, 14, 14, 6])),
    R(rpoly([104, 318, 186, 318, 220, 420, 104, 420], 10)),
    D([line([270, 470, 270, 540]), spline([300, 500, 330, 500])], { w: 4 }),
  ],
  alive: {
    parts: { arm: (t) => ({ r: -Math.max(0, Math.sin(t * 2.4)) * 12, ox: 340, oy: 486 }) },
  },
};
