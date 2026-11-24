// A giant party cupcake with swirly frosting and a cherry on top. Comes alive: it does a
// squishy happy bounce while the balloons bob.
import { R, D, rect, circle, ellipse, blob, spline, rpoly, poly, clip, tf, star, all } from './kit.js';

const wrapper = rpoly([132, 430, 468, 430, 414, 664, 186, 664], 10);
const pleats = [];
for (let k = 0; k < 8; k += 2) {
  const t0 = 132 + k * 42;
  const t1 = t0 + 42;
  const b0 = 186 + k * 28.5;
  const b1 = b0 + 28.5;
  pleats.push(clip(wrapper, poly([t0, 420, t1, 420, b1, 680, b0, 680])));
}
const tier1 = blob([118, 420, 130, 362, 200, 330, 300, 320, 400, 330, 470, 362, 482, 420, 446, 452, 404, 432, 360, 460, 300, 442, 240, 460, 198, 434, 156, 454]);
const tier2 = blob([164, 346, 190, 284, 300, 260, 410, 284, 436, 346, 380, 366, 300, 360, 220, 366]);
const tier3 = blob([210, 282, 236, 224, 280, 200, 300, 166, 322, 200, 364, 224, 390, 282, 340, 298, 260, 298]);
const sprinkle = (x, y, r) => tf(rect(x - 11, y - 4, 22, 8, 4), { r, ox: x, oy: y });
const sprinkles = [sprinkle(170, 390, 30), sprinkle(240, 404, -20), sprinkle(420, 394, 50), sprinkle(360, 412, 10), sprinkle(230, 316, 70), sprinkle(370, 318, -40), sprinkle(300, 330, 0), sprinkle(262, 250, -30), sprinkle(340, 256, 20)];
const cake = { ox: 300, oy: 664 };

export default {
  id: 'cupcake',
  items: [
    R(rect(0, 0, 600, 800)),
    R([star(70, 560, 44, 19), star(530, 570, 40, 17)]),
    D([spline([96, 236, 106, 300, 92, 360, 104, 420]), spline([508, 252, 498, 320, 512, 380, 500, 440])], { w: 4 }),
    R(ellipse(96, 170, 58, 70), { part: 'balloons' }),
    D(poly([96, 240, 86, 254, 106, 254]), { fill: 'ink', w: 0, part: 'balloons' }),
    R(ellipse(508, 186, 58, 70), { part: 'balloons' }),
    D(poly([508, 256, 498, 270, 518, 270]), { fill: 'ink', w: 0, part: 'balloons' }),
    D([spline([72, 140, 80, 124, 94, 116]), spline([484, 156, 492, 140, 506, 132])], { w: 4, stroke: '#ffffff', part: 'balloons' }),
    R(rect(0, 640, 600, 160)),
    R(ellipse(300, 668, 236, 42)),
    R(wrapper, { part: 'cake' }),
    R(pleats, { part: 'cake' }),
    R(tier1, { part: 'cake' }),
    R(tier2, { part: 'cake' }),
    R(tier3, { part: 'cake' }),
    D(sprinkles, { fill: '#ffffff', w: 3, part: 'cake' }),
    R(circle(300, 130, 40), { part: 'cake' }),
    D([spline([300, 92, 306, 64, 330, 44]), spline([280, 116, 288, 106, 300, 102])], { w: 5, part: 'cake' }),
  ],
  alive: {
    parts: {
      cake: (t) => ({ sy: 1 + Math.sin(t * 6) * 0.06, sx: 1 - Math.sin(t * 6) * 0.04, ...cake }),
      balloons: (t) => ({ y: Math.sin(t * 2.5) * 14 }),
    },
  },
};
