// A palm tree on the beach at sunset with a sailboat. Comes alive: the sun dips into the
// sea and comes back up, the palm sways and the boat rocks.
import { R, D, rect, circle, cloud, band, spline, hills, poly, frond, frondLine, bandMarks, all, line } from './kit.js';

const trunk = [440, 770, 432, 640, 400, 480, 334, 306];
const crown = [334, 300];
const back = [frond(...crown, 228, 170, 46, 0.75), frond(...crown, 312, 170, 46, 0.75), frond(...crown, 268, 120, 40, 1.1)];
const FRONT = [[188, 210, 0.5], [352, 210, 0.5], [148, 170, 0.6], [32, 170, 0.6]];
const front = FRONT.map(([a, l, d]) => frond(...crown, a, l, 50, d));

export default {
  id: 'palm-sunset',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(300, 520, 160), { part: 'sun' }),
    D([line([170, 456, 430, 456]), line([152, 490, 448, 490])], { w: 4, part: 'sun' }),
    R(cloud(120, 150, 190, 74)),
    R(cloud(470, 250, 160, 62)),
    D([spline([200, 90, 214, 80, 228, 90, 242, 80, 256, 90]), spline([480, 120, 490, 112, 500, 120, 510, 112, 520, 120])], { w: 4 }),
    R(rect(0, 520, 600, 280)),
    D([spline([40, 560, 70, 556, 100, 560]), spline([400, 590, 440, 586, 480, 590]), spline([250, 620, 280, 616, 310, 620])], { w: 4 }),
    R(poly([146, 586, 146, 452, 214, 580]), { part: 'boat' }),
    D(line([140, 594, 140, 440]), { w: 5, part: 'boat' }),
    R(poly([82, 592, 216, 592, 196, 626, 104, 626]), { part: 'boat' }),
    R(hills(680, 14, 3)),
    D([circle(120, 740, 6), circle(520, 720, 5), circle(250, 770, 4)], { w: 3 }),
    R(band(trunk, 46, 26), { part: 'palm' }),
    D(bandMarks(trunk, 9, 46, 26), { w: 4, part: 'palm' }),
    R(all(back), { part: 'palm' }),
    R(all(front), { part: 'palm' }),
    D(FRONT.map(([a, l, d]) => spline(frondLine(...crown, a, l * 0.92, d))), { w: 3, part: 'palm' }),
    R(all(circle(316, 318, 21), circle(352, 320, 21), circle(334, 344, 20)), { part: 'palm' }),
  ],
  alive: {
    parts: {
      sun: (t) => ({ y: 150 * Math.pow(Math.sin(Math.min(1, t / 3.6) * Math.PI), 2) }),
      palm: (t) => ({ r: Math.sin(t * 2.4) * 3, ox: 440, oy: 770 }),
      boat: (t) => ({ r: Math.sin(t * 3) * 6, ox: 150, oy: 610, x: t * 6 }),
    },
  },
};
