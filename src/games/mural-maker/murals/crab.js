// A happy crab on the beach waving its big claws. Comes alive: the claws wave and snap.
import { R, D, rect, circle, ellipse, band, spline, hills, eye, svg, clip, tf, flipX, star, all } from './kit.js';

const body = svg('M110 560 C110 470 200 430 300 430 C400 430 490 470 490 560 C490 622 410 652 300 652 C190 652 110 622 110 560 Z')[0];
const belly = clip(body, ellipse(300, 690, 210, 110));
const legLines = [
  [140, 560, 76, 572, 44, 620],
  [140, 590, 84, 612, 62, 664],
  [158, 618, 116, 650, 104, 700],
];
const legsL = legLines.map((p) => band(p, 30, 24, { roundEnd: true }));
const legsR = legsL.map((s) => flipX(s, 300));
const armL = band([186, 480, 140, 440, 124, 390], 40, 34);
// a pincer claw pointing up: two fingers with a notch between them
const clawL = tf(svg('M130 345 C85 340 58 300 60 250 C62 200 80 162 110 146 C124 172 132 194 142 214 C152 196 160 180 178 164 C198 190 204 240 196 282 C188 322 166 345 130 345 Z')[0], { x: -8, y: 36 });
const stalks = [band([262, 446, 250, 370], 24, 22), band([338, 446, 350, 370], 24, 22)];
const shell = all(svg('M380 770 C350 730 370 680 420 670 C470 680 490 730 460 770 Z')[0]);

export default {
  id: 'crab',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(500, 100, 58)),
    R(hills(300, 10, 4)),
    R(hills(470, 14, 3)),
    R(legsL),
    R(legsR),
    R(armL, { part: 'clawL' }),
    R(clawL, { part: 'clawL' }),
    R(flipX(armL, 300), { part: 'clawR' }),
    R(flipX(clawL, 300), { part: 'clawR' }),
    R(stalks),
    R(body),
    R(belly),
    ...eye(250, 360, 30, { ly: 0.4 }),
    ...eye(350, 360, 30, { ly: 0.4 }),
    D(spline([250, 540, 300, 572, 350, 540]), { w: 6 }),
    D([ellipse(210, 530, 18, 11), ellipse(390, 530, 18, 11)], { fill: '#ff9ab8', w: 0 }),
    R(star(190, 732, 44, 20, 5, -70)),
    R(shell),
    D([spline([420, 674, 400, 770]), spline([420, 674, 420, 770]), spline([420, 674, 442, 770])], { w: 4 }),
  ],
  alive: {
    parts: {
      clawL: (t) => ({ r: -Math.abs(Math.sin(t * 4)) * 16, ox: 186, oy: 480 }),
      clawR: (t) => ({ r: Math.abs(Math.sin(t * 4 + 1)) * 16, ox: 414, oy: 480 }),
    },
    wink: { x: 350, y: 360, r: 31, at: [1.3, 3.1] },
  },
};
