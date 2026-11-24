// A big pizza on a plate with one slice pulled out, cheese stretching. Comes alive: the
// pizza spins round.
import { R, D, rect, circle, ellipse, spline, poly, band, all, line } from './kit.js';

const C = [270, 404];
const SL = [352, 404];
const RC = 212; // crust
const S9 = 0.9; // toppings spread // where the pulled-out slice's tip sits
// A pie wedge from angle a0 to a1 (degrees, 0 = east, clockwise), radius r(a).
function pie([cx, cy], r, a0, a1, step = 3) {
  const pts = [cx, cy];
  for (let a = a0; a <= a1 + 1e-9; a += (a1 - a0) / Math.ceil((a1 - a0) / step)) {
    const t = (a * Math.PI) / 180;
    const rr = typeof r === 'function' ? r(a) : r;
    pts.push(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr);
  }
  return poly(pts);
}
const wavy = (a) => 176 + Math.sin((a * Math.PI) / 18) * 6;
const at = ([cx, cy], dx, dy) => [cx + dx * S9, cy + dy * S9];
const edge = (c, a, d) => [c[0] + Math.cos((a * Math.PI) / 180) * d, c[1] + Math.sin((a * Math.PI) / 180) * d];
// stretchy cheese across the gap between the pizza and the slice
const strings = [[-25, 70], [-25, 130], [25, 80], [25, 140]].map(([a, d]) => {
  const p = edge(C, a, d);
  const q = edge(SL, a, d);
  return spline([...p, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2 + 10, ...q]);
});

const pepperoni = all(
  ...[[-110, -100], [0, -134], [-152, 30], [-52, 112], [70, 128], [-40, -24]].map(([x, y]) => circle(...at(C, x, y), 29)),
  circle(...at(SL, 118, 0), 27),
);
const mushroom = (x, y) => all(
  rect(x - 9, y - 4, 18, 26, 6),
  ellipse(x, y - 6, 26, 18),
);
const mushrooms = all(mushroom(...at(C, 70, -70)), mushroom(...at(C, -108, -24)), mushroom(...at(C, 8, 56)), mushroom(...at(SL, 176, 6)));
const olive = (x, y) => [circle(x, y, 15), circle(x, y, 6)];
const olives = [...olive(...at(C, -76, -170)), ...olive(...at(C, 136, 84)), ...olive(...at(C, -120, 100)), ...olive(...at(C, 100, -116)), ...olive(...at(C, -6, -50)), ...olive(...at(SL, 66, -10))];
const pepperBits = (x, y, rot) => band([x - 22 * Math.cos(rot), y - 22 * Math.sin(rot), x, y + 8, x + 22 * Math.cos(rot), y + 22 * Math.sin(rot)], 14, 14, { round: true });
const peppers = all(pepperBits(...at(C, -160, -60), 0.4), pepperBits(...at(C, 20, 170), -0.3), pepperBits(...at(C, -70, 50), 0.9), pepperBits(...at(C, 40, -184 + 20), 0), pepperBits(...at(SL, 120, 44), 1.2));

const plate = circle(300, 404, 270);

export default {
  id: 'pizza',
  items: [
    R(rect(0, 0, 600, 800)),
    R(rect(0, 600, 600, 200)),
    D([0, 1, 2, 3, 4, 5].map((k) => line([k * 120 + 20, 600, k * 120 - 20, 800])).concat([line([0, 680, 600, 680]), line([0, 750, 600, 750])]), { w: 4 }),
    R(plate, { part: 'pizza' }),
    R(pie(C, RC, 25, 335), { part: 'pizza' }),
    R(pie(C, wavy, 25, 335), { part: 'pizza' }),
    R(pie(SL, RC, -25, 25), { part: 'pizza' }),
    R(pie(SL, wavy, -25, 25), { part: 'pizza' }),
    D(strings, { w: 4, part: 'pizza' }),
    D([90, 150, 210, 270].map((a) => line([C[0], C[1], C[0] + Math.cos((a * Math.PI) / 180) * 176, C[1] + Math.sin((a * Math.PI) / 180) * 176])), { w: 4, part: 'pizza' }),
    R(pepperoni, { part: 'pizza' }),
    R(mushrooms, { part: 'pizza' }),
    R(olives, { part: 'pizza', evenodd: true }),
    R(peppers, { part: 'pizza' }),
  ],
  alive: {
    parts: {
      pizza: (t) => {
        const k = Math.min(1, t / 3.6);
        return { r: 360 * k * k * (3 - 2 * k), ox: 300, oy: 404 };
      },
    },
  },
};
