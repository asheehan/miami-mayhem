// A yellow submarine cruising past the fish. Comes alive: it bobs along with its propeller
// spinning and bubbles streaming up.
import { R, D, rect, circle, ellipse, blob, band, spline, hills, eye, clip, svg, poly, all, rpoly } from './kit.js';

const body = svg('M112 430 C112 350 196 330 300 330 L430 330 C506 330 530 380 530 430 C530 480 506 530 430 530 L300 530 C196 530 112 510 112 430 Z')[0];
const fish = (x, y, s, dir) => all(ellipse(x, y, 46 * s, 30 * s), poly([x - dir * 40 * s, y, x - dir * 84 * s, y - 32 * s, x - dir * 84 * s, y + 32 * s]));
const spin = (t) => Math.cos(t * 18);
const bob = (t) => Math.sin(t * 2.4) * 14;

export default {
  id: 'submarine',
  items: [
    R(rect(0, 0, 600, 800)),
    R(hills(64, 10, 6, { bottom: 0 })),
    R(band([60, 740, 40, 660, 72, 590, 50, 530], 36, 14, { roundEnd: true })),
    R(band([548, 740, 572, 670, 540, 610, 562, 560], 34, 14, { roundEnd: true })),
    R(hills(700, 12, 4)),
    R(blob([250, 760, 270, 712, 330, 698, 380, 722, 392, 764])),
    R(fish(150, 196, 1, 1), { part: 'fish' }),
    ...eye(172, 188, 9, { lx: 1, part: 'fish' }),
    R(fish(492, 150, 0.85, -1)),
    ...eye(474, 142, 8, { lx: -1 }),
    R(svg('M500 372 L566 396 L566 464 L500 488 Z'), { part: 'sub' }),
    R([ellipse(578, 394, 15, 30), ellipse(578, 466, 15, 30)], { part: 'prop' }),
    D(circle(578, 430, 9), { fill: 'ink', w: 0, part: 'sub' }),
    R(all(rect(342, 176, 28, 100, 8), rect(342, 168, 76, 30, 12)), { part: 'sub' }),
    R(rpoly([248, 340, 272, 254, 410, 254, 432, 340], 16), { part: 'sub' }),
    R(body, { part: 'sub' }),
    R(clip(body, rect(0, 492, 600, 60)), { part: 'sub' }),
    R([circle(212, 420, 32), circle(316, 420, 32), circle(420, 420, 32)], { part: 'sub' }),
    D([circle(212, 420, 22), circle(316, 420, 22), circle(420, 420, 22)], { w: 4, part: 'sub' }),
    D([spline([200, 410, 206, 402, 216, 400]), spline([304, 410, 310, 402, 320, 400]), spline([408, 410, 414, 402, 424, 400])], { w: 4, part: 'sub' }),
    D([circle(290, 296, 8), circle(390, 296, 8), circle(140, 470, 6), circle(250, 510, 6), circle(380, 510, 6)], { fill: 'ink', w: 0, part: 'sub' }),
  ],
  alive: {
    parts: {
      sub: (t) => ({ y: bob(t), x: Math.sin(t * 1.2) * 10 }),
      prop: (t) => ({ y: bob(t), x: Math.sin(t * 1.2) * 10, sy: spin(t), ox: 578, oy: 430 }),
      fish: (t) => ({ x: Math.sin(t * 1.5) * 50, y: Math.sin(t * 5) * 5 }),
    },
    fx: [{ type: 'bubbles', x: 590, y: 420, from: 0, to: 4.2 }],
  },
};
