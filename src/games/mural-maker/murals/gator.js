// A cool gator in sunglasses lying on the sand under a palm. Comes alive: the shades lift
// to show his eyes and his tail wags.
import { R, D, rect, circle, ellipse, blob, band, spline, hills, eye, clip, frond, frondLine, bandMarks, all, poly, inWall } from './kit.js';

const trunk = [548, 560, 556, 430, 540, 300, 506, 200];
const body = blob([96, 556, 140, 512, 250, 492, 360, 494, 420, 516, 430, 566, 392, 600, 250, 610, 128, 598]);
const head = blob([368, 522, 380, 470, 420, 438, 470, 430, 508, 446, 586, 462, 598, 492, 584, 524, 500, 540, 400, 552]);
const tail = [124, 566, 64, 580, 24, 552, 18, 500, 40, 468];

const teeth = [];
for (let k = 0; k < 7; k++) {
  const x = 418 + k * 22;
  const y = 517 - k * 1.2;
  teeth.push(poly([x - 8, y - 1, x + 8, y - 2, x, y + 11]));
}
// bumps along his back and tail
const ridge = [];
for (const [x, y] of [[176, 506], [222, 496], [268, 492], [314, 492], [358, 496]]) ridge.push(spline([x - 16, y + 2, x, y - 12, x + 16, y + 2]));

export default {
  id: 'gator',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(110, 120, 70)),
    R(hills(560, 10, 4)),
    D([spline([60, 690, 90, 680, 120, 690]), spline([450, 720, 480, 710, 510, 720]), spline([250, 750, 280, 740, 310, 750])], { w: 4 }),
    R(band(trunk, 40, 26)),
    D(bandMarks(trunk, 7, 40, 26), { w: 4 }),
    R(all(
      frond(506, 196, 196, 160, 44, 0.45), frond(506, 196, 150, 140, 40, 0.5), 
      frond(506, 196, 345, 120, 40, 0.6), frond(506, 196, 30, 100, 36, 0.6),
    ).map(inWall)),
    D([frondLine(506, 196, 196, 150, 0.45), frondLine(506, 196, 150, 130, 0.5), frondLine(506, 196, 345, 110, 0.6)].map((p) => spline(p)), { w: 3 }),
    R(band(tail, 80, 8, { roundEnd: true }), { part: 'tail' }),
    D(bandMarks(tail, 5, 80, 8, { from: 0.12, to: 0.8 }), { w: 4, part: 'tail' }),
    R(blob([160, 580, 212, 578, 226, 628, 248, 652, 200, 656, 160, 650, 150, 616])),
    R(blob([340, 580, 392, 578, 404, 628, 426, 652, 380, 656, 340, 650, 330, 616])),
    D([spline([180, 656, 184, 644]), spline([204, 656, 206, 644]), spline([360, 656, 364, 644]), spline([384, 656, 386, 644])], { w: 4 }),
    R(body),
    R(clip(body, ellipse(262, 624, 190, 46))),
    D(ridge, { w: 5 }),
    D([ellipse(200, 540, 16, 10), ellipse(262, 528, 12, 8), ellipse(320, 548, 14, 9), ellipse(150, 556, 10, 7), ellipse(380, 530, 10, 7)], { w: 4 }),
    R(head),
    D(teeth, { fill: '#ffffff', w: 3 }),
    D(spline([396, 512, 440, 518, 500, 514, 556, 504, 578, 486]), { w: 6 }),
    D([ellipse(566, 470, 5, 4), ellipse(582, 476, 5, 4)], { fill: 'ink', w: 0 }),
    ...eye(436, 440, 18, { lx: 1 }),
    ...eye(520, 440, 18, { lx: 1 }),
    R(all(
      rect(386, 410, 96, 62, 26), rect(476, 410, 92, 60, 26),
    ), { part: 'shades' }),
    D([spline([404, 428, 422, 418]), spline([494, 428, 512, 418])], { w: 6, stroke: '#ffffff', part: 'shades' }),
  ],
  alive: {
    parts: {
      shades: (t) => {
        const up = (a, b) => (t > a && t < b ? Math.sin(((t - a) / (b - a)) * Math.PI) : 0);
        return { y: -60 * (up(0.4, 1.6) + up(2.2, 3.4)), r: -6 * (up(0.4, 1.6) + up(2.2, 3.4)), ox: 476, oy: 440 };
      },
      tail: (t) => ({ r: Math.sin(t * 7) * 9, ox: 124, oy: 566 }),
    },
  },
};
