// A big sandcastle on the beach with a bucket and spade. Comes alive: the flag flutters
// and the castle wobbles.
import { R, D, rect, circle, cloud, band, spline, hills, svg, rpoly, star, poly } from './kit.js';

// A block with a crenellated (bumpy) top: x from x0 to x1, top at y (merlons rise mh above
// it), bottom at y1.
function battlement(x0, x1, y, y1, n, mh = 30) {
  const pts = [x0, y1, x0, y - mh];
  const w = (x1 - x0) / (n * 2 - 1);
  for (let k = 0; k < n; k++) {
    const a = x0 + k * 2 * w;
    pts.push(a + w, y - mh);
    if (k < n - 1) pts.push(a + w, y, a + 2 * w, y, a + 2 * w, y - mh);
  }
  pts.push(x1, y1);
  return rpoly(pts, 6);
}

const towerL = battlement(60, 180, 400, 690, 3);
const towerR = battlement(420, 540, 400, 690, 3);
const wall = battlement(170, 430, 500, 690, 5, 28);
const keep = battlement(220, 380, 290, 520, 3, 32);
const door = svg('M252 690 L252 616 C252 570 348 570 348 616 L348 690 Z')[0];
const windows = [
  svg('M100 520 L100 486 C100 462 140 462 140 486 L140 520 Z')[0],
  svg('M460 520 L460 486 C460 462 500 462 500 486 L500 520 Z')[0],
  svg('M280 400 L280 366 C280 342 320 342 320 366 L320 400 Z')[0],
];
const flag = svg('M304 150 C336 138 364 166 404 152 L398 202 C364 216 336 188 304 200 Z')[0];
const bucket = rpoly([462, 650, 578, 650, 562, 770, 478, 770], 8);
const spade = [band([70, 600, 100, 700], 18, 18, { round: true }), svg('M74 690 L132 676 C142 710 140 750 116 772 C92 778 74 750 74 690 Z')[0]];

export default {
  id: 'sandcastle',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(500, 90, 56)),
    R(cloud(120, 110, 170, 66)),
    R(hills(410, 10, 4)),
    R(hills(560, 12, 3)),
    R(towerL, { part: 'castle' }),
    R(towerR, { part: 'castle' }),
    D(band([304, 290, 304, 136], 8), { fill: 'ink', w: 0, part: 'castle' }),
    R(flag, { part: 'flag' }),
    R(keep, { part: 'castle' }),
    R(wall, { part: 'castle' }),
    R(door, { part: 'castle' }),
    R(windows, { part: 'castle' }),
    D([circle(200, 600, 7), circle(400, 600, 7), circle(120, 600, 6), circle(480, 600, 6), circle(250, 440, 6), circle(350, 450, 6)], { fill: 'ink', w: 0, part: 'castle' }),
    R(spade),
    R(bucket),
    D(spline([466, 664, 520, 590, 574, 664]), { w: 6 }),
    D(rect(456, 640, 128, 22, 8), { w: 4 }),
    R(star(300, 750, 40, 18, 5, -80)),
  ],
  alive: {
    parts: {
      flag: (t) => ({ sx: 0.8 + Math.sin(t * 8) * 0.2, r: Math.sin(t * 8) * 4, ox: 304, oy: 176 }),
      castle: (t) => ({ sx: 1 + Math.sin(t * 6) * 0.02, sy: 1 - Math.sin(t * 6) * 0.02, ox: 300, oy: 690 }),
    },
  },
};
