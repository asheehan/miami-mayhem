// An astronaut floating in space and waving, with a ringed planet and the moon. Comes
// alive: the astronaut floats and turns, and winks.
import { R, D, rect, circle, ellipse, band, spline, eye, rpoly, star, tf, inWall, all } from './kit.js';

// the astronaut leans a little, floating
const TILT = { r: -8, ox: 300, oy: 420 };
const A = (s) => tf(s, TILT);
const P = (x, y) => {
  const a = (TILT.r * Math.PI) / 180;
  const u = x - TILT.ox;
  const v = y - TILT.oy;
  return [TILT.ox + u * Math.cos(a) - v * Math.sin(a), TILT.oy + u * Math.sin(a) + v * Math.cos(a)];
};

const backpack = A(rect(192, 330, 216, 200, 26));
const suit = A(all(
  rpoly([222, 330, 378, 330, 392, 560, 208, 560], 44),
  band([230, 376, 176, 334, 152, 262], 60, 54),
  band([370, 376, 424, 420, 444, 484], 60, 54),
  band([258, 540, 250, 636], 72, 68),
  band([342, 540, 350, 636], 72, 68),
));
const belt = A(rect(210, 496, 180, 32, 12));
const panel = A(rect(256, 396, 88, 66, 12));
const boots = A(all(rect(198, 624, 104, 54, 20), rect(298, 624, 104, 54, 20)));
const gloves = A(all(circle(150, 250, 36), circle(446, 492, 36)));
const helmet = A(circle(300, 236, 106));
const visor = A(ellipse(300, 244, 76, 62));
const [e1x, e1y] = P(276, 238);
const [e2x, e2y] = P(324, 238);

export default {
  id: 'astronaut',
  items: [
    R(rect(0, 0, 600, 800)),
    D([star(60, 330, 12, 5, 4), star(540, 300, 14, 6, 4), star(250, 60, 10, 4, 4), star(420, 620, 12, 5, 4), star(70, 560, 10, 4, 4), star(560, 460, 9, 4, 4), star(330, 760, 10, 4, 4)], { fill: '#ffffff', w: 3 }),
    R(circle(500, 104, 62)),
    D([circle(480, 86, 12), circle(522, 124, 9), circle(516, 78, 7)], { w: 4 }),
    R(star(96, 110, 50, 22, 5)),
    R(inWall(circle(500, 712, 104))),
    R([ellipse(500, 712, 170, 36, -18), ellipse(500, 712, 126, 18, -18)].map(inWall), { evenodd: true }),
    R(backpack, { part: 'spaceman' }),
    R(suit, { part: 'spaceman' }),
    R(belt, { part: 'spaceman' }),
    R(panel, { part: 'spaceman' }),
    D(A([circle(280, 428, 10), circle(320, 428, 10)]), { fill: '#ffffff', w: 4, part: 'spaceman' }),
    R(boots, { part: 'spaceman' }),
    R(gloves, { part: 'spaceman' }),
    R(helmet, { part: 'spaceman' }),
    R(visor, { part: 'spaceman' }),
    ...eye(e1x, e1y, 13, { part: 'spaceman' }),
    ...eye(e2x, e2y, 13, { part: 'spaceman' }),
    D(A(spline([282, 272, 300, 284, 318, 272])), { w: 5, part: 'spaceman' }),
    D(A(spline([248, 214, 262, 196, 282, 188])), { w: 6, stroke: '#ffffff', part: 'spaceman' }),
  ],
  alive: {
    parts: { spaceman: (t) => ({ y: Math.sin(t * 1.8) * 30, r: Math.sin(t * 1.2) * 10, ox: 300, oy: 420 }) },
    wink: { x: e2x, y: e2y, r: 14, part: 'spaceman', at: [1.3, 3.1] },
  },
};
