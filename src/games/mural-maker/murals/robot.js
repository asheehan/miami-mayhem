// A friendly robot waving hello, with cogs on the wall. Comes alive: waves, tilts its head
// and its antenna lights up.
import { R, D, rect, circle, band, line, heart, gear, all } from './kit.js';

export default {
  id: 'robot',
  items: [
    R(rect(0, 0, 600, 800)),
    R(rect(0, 706, 600, 94)),
    D([line([0, 740, 600, 740])], { w: 3 }),
    R([gear(96, 116, 66, 50, 10), circle(96, 116, 18)], { evenodd: true, part: 'cog1' }),
    R([gear(524, 530, 50, 38, 8), circle(524, 530, 14)], { evenodd: true, part: 'cog2' }),
    R(all(rect(220, 560, 50, 116, 10), rect(330, 560, 50, 116, 10))),
    R(all(rect(192, 664, 104, 46, 20), rect(304, 664, 104, 46, 20))),
    R(all(band([176, 380, 130, 432, 116, 506], 36, 34), circle(112, 534, 32))),
    D([line([96, 552, 104, 540]), line([126, 552, 120, 540])], { w: 4 }),
    R(all(band([424, 380, 476, 344, 500, 268], 36, 34), circle(506, 238, 32)), { part: 'arm' }),
    D([line([490, 222, 498, 232]), line([520, 220, 514, 232])], { w: 4, part: 'arm' }),
    R(all(rect(170, 342, 260, 230, 26), rect(268, 312, 64, 40, 6))),
    R(rect(214, 382, 172, 122, 16)),
    R(heart(300, 446, 76)),
    D([circle(242, 536, 10), circle(274, 536, 10), circle(358, 536, 10)], { w: 4 }),
    D(line([300, 150, 300, 112]), { w: 6, part: 'head' }),
    R(circle(300, 96, 26), { part: 'head' }),
    R(all(rect(166, 198, 28, 74, 10), rect(406, 198, 28, 74, 10)), { part: 'head' }),
    R(rect(190, 148, 220, 172, 30), { part: 'head' }),
    R(all(circle(254, 224, 32), circle(346, 224, 32)), { part: 'head' }),
    D([circle(244, 212, 9), circle(336, 212, 9)], { fill: '#ffffff', w: 0, part: 'head' }),
    D([circle(258, 228, 10), circle(350, 228, 10)], { fill: 'ink', w: 0, part: 'head' }),
    R(rect(238, 270, 124, 32, 12), { part: 'head' }),
    D([line([269, 270, 269, 302]), line([300, 270, 300, 302]), line([331, 270, 331, 302])], { w: 4, part: 'head' }),
    D([circle(208, 166, 5), circle(392, 166, 5)], { fill: 'ink', w: 0, part: 'head' }),
  ],
  alive: {
    parts: {
      arm: (t) => ({ r: -Math.sin(t * 8) * 16 - 4, ox: 424, oy: 380 }),
      head: (t) => ({ r: Math.sin(t * 3) * 7, ox: 300, oy: 330 }),
      cog1: (t) => ({ r: t * 90, ox: 96, oy: 116 }),
      cog2: (t) => ({ r: -t * 120, ox: 524, oy: 530 }),
    },
    fx: [{ type: 'glow', x: 300, y: 96, part: 'head', from: 0, to: 4.2 }],
  },
};
