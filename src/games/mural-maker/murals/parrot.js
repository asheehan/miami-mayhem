// A parrot on a branch among jungle leaves, with a hibiscus. Comes alive: flaps its wing
// and bobs its head.
import { R, D, rect, circle, ellipse, blob, band, spline, eye, svg, all, inWall } from './kit.js';

const petals = [];
for (let k = 0; k < 5; k++) {
  const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
  petals.push(ellipse(500 + Math.cos(a) * 30, 520 + Math.sin(a) * 30, 30, 24, (a * 180) / Math.PI));
}

export default {
  id: 'parrot',
  items: [
    R(rect(0, 0, 600, 800)),
    R(inWall(blob([600, 30, 520, 50, 440, 130, 428, 230, 480, 268, 560, 258, 600, 220]))),
    D([spline([596, 110, 530, 150, 470, 220]), spline([540, 140, 520, 90]), spline([510, 180, 560, 215])], { w: 4 }),
    R(inWall(blob([0, 50, 80, 36, 150, 90, 160, 170, 100, 210, 24, 196, 0, 150]))),
    D([spline([4, 100, 70, 120, 130, 160]), spline([60, 116, 80, 70])], { w: 4 }),
    R(inWall(blob([0, 500, 90, 488, 160, 530, 184, 620, 130, 668, 40, 660, 0, 620]))),
    D([spline([4, 560, 80, 580, 150, 630]), spline([80, 580, 110, 530])], { w: 4 }),
    R(inWall(blob([284, 540, 340, 540, 372, 690, 362, 790, 318, 790, 290, 690])), { part: 'body' }),
    D([spline([314, 580, 326, 780]), spline([300, 640, 304, 760]), spline([344, 640, 344, 770])], { w: 4, part: 'body' }),
    R(inWall(band([-10, 658, 180, 632, 400, 618, 610, 584], 48, 36))),
    D([spline([60, 652, 120, 640]), spline([440, 612, 520, 598])], { w: 4 }),
    R(all(petals)),
    D([circle(500, 520, 12)], { fill: '#ffd919', w: 4 }),
    R(blob([256, 320, 322, 290, 386, 330, 402, 440, 382, 540, 332, 612, 276, 592, 250, 480, 244, 380]), { part: 'body' }),
    D([spline([280, 606, 284, 628]), spline([296, 608, 300, 630]), spline([328, 606, 332, 628]), spline([344, 606, 350, 628])], { w: 5, part: 'body' }),
    R(blob([332, 340, 396, 372, 412, 480, 388, 580, 348, 612, 330, 520, 320, 420]), { part: 'wing' }),
    D([spline([340, 450, 380, 470, 404, 500]), spline([338, 510, 372, 530, 392, 556]), spline([336, 400, 372, 410, 400, 440])], { w: 4, part: 'wing' }),
    R(circle(300, 250, 80), { part: 'head' }),
    R(ellipse(326, 252, 42, 36), { part: 'head' }),
    ...eye(332, 246, 13, { lx: -1, part: 'head' }),
    R(svg('M246 214 C208 200 176 222 174 262 C172 292 184 312 196 320 C200 300 214 290 238 288 C232 300 236 312 254 304 C262 280 258 240 246 214 Z'), { part: 'head' }),
    D([spline([196, 320, 214, 296, 240, 288]), spline([226, 232, 232, 236])], { w: 4, part: 'head' }),
  ],
  alive: {
    parts: {
      wing: (t) => ({ r: -Math.abs(Math.sin(t * 6)) * 24, ox: 336, oy: 350, y: Math.sin(t * 3) * 4 }),
      head: (t) => ({ r: Math.sin(t * 4) * 7, ox: 300, oy: 330, y: Math.sin(t * 3) * 4 }),
      body: (t) => ({ y: Math.sin(t * 3) * 4 }),
    },
  },
};
