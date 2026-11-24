// A fairy-tale castle on a green hill. Comes alive: the flag on the tallest tower flutters.
import { R, D, rect, circle, cloud, spline, hills, svg, rpoly, poly, line } from './kit.js';

const crenels = (x0, x1, y, n, h) => {
  const w = (x1 - x0) / (n * 2 - 1);
  const pts = [x0, y + 400];
  for (let k = 0; k < n; k++) {
    const a = x0 + k * 2 * w;
    pts.push(a, y, a + w, y);
    if (k < n - 1) pts.push(a + w, y + h, a + 2 * w, y + h);
  }
  pts.push(x1, y + 400);
  return pts;
};
const keep = poly(crenels(170, 430, 360, 5, 26).map((v, i) => (i % 2 && v > 700 ? 640 : v)));
const arch = (x, y, w, h) => svg(`M${x - w / 2} ${y + h} L${x - w / 2} ${y + w / 2} C${x - w / 2} ${y - w * 0.15} ${x + w / 2} ${y - w * 0.15} ${x + w / 2} ${y + w / 2} L${x + w / 2} ${y + h} Z`)[0];

export default {
  id: 'castle',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(522, 42, 36)),
    R(cloud(196, 40, 150, 58)),
    R(hills(610, 16, 3)),
    R(poly([256, 640, 344, 640, 420, 800, 180, 800])),
    R(rect(60, 300, 120, 340)),
    R(rect(420, 300, 120, 340)),
    R(keep),
    R(rect(236, 214, 128, 200)),
    R(rpoly([40, 304, 120, 140, 200, 304], [8, 6, 8])),
    R(rpoly([400, 304, 480, 140, 560, 304], [8, 6, 8])),
    R(rpoly([216, 218, 300, 70, 384, 218], [8, 6, 8])),
    D([line([120, 140, 120, 84]), line([480, 140, 480, 84]), line([300, 70, 300, 14])], { w: 5 }),
    R([rpoly([120, 84, 194, 106, 120, 130], 4), rpoly([480, 84, 554, 106, 480, 130], 4)]),
    R(rpoly([300, 12, 392, 38, 300, 66], 4), { part: 'flag' }),
    R(arch(300, 520, 96, 120)),
    D([line([300, 500, 300, 640]), circle(318, 584, 5)], { w: 4 }),
    R([arch(120, 380, 46, 62), arch(480, 380, 46, 62), arch(120, 510, 46, 62), arch(480, 510, 46, 62), arch(300, 264, 52, 70)]),
    D([spline([200, 440, 230, 440]), spline([380, 460, 410, 460]), spline([200, 590, 230, 590]), spline([380, 580, 410, 580]), spline([70, 600, 100, 600]), spline([500, 440, 530, 440])], { w: 4 }),
  ],
  alive: {
    parts: { flag: (t) => ({ sx: 0.8 + Math.sin(t * 9) * 0.2, r: Math.sin(t * 5) * 6, ox: 300, oy: 38 }) },
  },
};
