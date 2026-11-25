// A giant happy donut with drippy icing and sprinkles, sitting on a plate at a party.
// Comes alive: the donut wiggles with joy and winks.
import { R, D, rect, circle, ellipse, blob, band, spline, eye, poly, all, tf } from './kit.js';

const C = [300, 420]; // the donut's middle
const P = { part: 'donut' };

// Icing: a wavy outer edge with drips, and a wavy hole.
const icingOut = [];
for (let k = 0; k < 60; k++) {
  const a = (k / 60) * Math.PI * 2;
  const drip = Math.sin(a) > 0 ? 26 * Math.max(0, Math.cos(a * 6)) ** 2 : 0; // drips hang down
  const r = 194 + 8 * Math.cos(a * 9) + drip;
  icingOut.push(C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r * 0.92);
}
const icingIn = [];
for (let k = 0; k < 12; k++) {
  const a = (k / 12) * Math.PI * 2;
  const r = 84 + (k % 2 ? 6 : -6);
  icingIn.push(C[0] + Math.cos(a) * r, C[1] - 44 + Math.sin(a) * r * 0.9);
}
const sprinkle = (x, y, r) => tf(band([-14, 0, 14, 0], 10, 10, { round: true }), { r, x, y });
const sprinkles = [
  sprinkle(200, 300, 30), sprinkle(250, 254, -40), sprinkle(350, 252, 20), sprinkle(410, 300, -60), sprinkle(150, 380, 80),
  sprinkle(450, 380, 10), sprinkle(440, 440, -30), sprinkle(160, 440, 50), sprinkle(300, 230, 90),
];

export default {
  id: 'donut',
  items: [
    R(rect(0, 0, 600, 800)),
    R(all([0, 1, 2, 3, 4, 5].map((k) => rect(k * 100 + 50, 0, 50, 640)))),
    R(all(poly([0, 40, 70, 54, 36, 120]), poly([150, 60, 230, 62, 192, 132]), poly([300, 64, 380, 60, 340, 132]), poly([450, 56, 520, 46, 488, 116]))),
    D(spline([0, 40, 150, 60, 300, 64, 450, 56, 600, 36]), { w: 5 }),
    D([spline([60, 260, 70, 320, 54, 380, 66, 440]), spline([540, 250, 528, 310, 546, 370, 534, 430])], { w: 4 }),
    R(ellipse(60, 200, 46, 58), { part: 'balloons' }),
    R(ellipse(540, 190, 46, 58), { part: 'balloons' }),
    D([poly([54, 256, 66, 256, 60, 266]), poly([534, 246, 546, 246, 540, 256])], { fill: 'ink', w: 0, part: 'balloons' }),
    R(rect(0, 620, 600, 180)),
    R(all([0, 1, 2, 3, 4, 5].map((k) => rect(k * 100 + (k % 2) * 0, 700, 50, 100)).concat([0, 1, 2, 3, 4, 5].map((k) => rect(k * 100 + 50, 620, 50, 80))))),
    R(ellipse(300, 650, 270, 60)),
    D(ellipse(300, 644, 200, 34), { w: 4 }),
    R([circle(...C, 230), ellipse(C[0], C[1] - 44, 60, 52)], { evenodd: true, ...P }),
    R([blob(icingOut), blob(icingIn)], { evenodd: true, ...P }),
    D(sprinkles, { fill: '#ffffff', w: 4, ...P }),
    R(all(ellipse(202, 516, 30, 18), ellipse(398, 516, 30, 18)), P),
    ...eye(244, 480, 24, P),
    ...eye(356, 480, 24, P),
    D(spline([270, 516, 300, 536, 330, 516]), { w: 6, ...P }),
  ],
  alive: {
    parts: {
      balloons: (t) => ({ y: Math.sin(t * 2) * 10 }),
      donut: (t) => ({ r: Math.sin(t * 6) * 5, sy: 1 + Math.sin(t * 12) * 0.03, ox: 300, oy: 640 }) },
    wink: { x: 356, y: 480, r: 25, part: 'donut', at: [1.3, 3.1] },
  },
};
