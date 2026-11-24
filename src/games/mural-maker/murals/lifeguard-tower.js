// A bright Miami Beach lifeguard tower by the sea. Comes alive: the flag flaps and the beach
// ball bounces.
import { R, D, rect, circle, cloud, spline, hills, rpoly, line, clip, band, bandMarks } from './kit.js';

const hut = rect(176, 250, 248, 172, 14);
const ramp = [176, 446, 112, 548, 42, 660];

export default {
  id: 'lifeguard-tower',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(500, 92, 56)),
    R(cloud(110, 110, 180, 72)),
    R(rect(0, 440, 600, 160)),
    D([spline([430, 480, 460, 470, 490, 480]), spline([60, 520, 90, 510, 120, 520]), spline([500, 550, 530, 540, 560, 550])], { w: 4 }),
    R(hills(590, 12, 3)),
    D([line([224, 470, 376, 600]), line([376, 470, 224, 600])], { w: 8 }),
    R([rect(196, 430, 28, 250, 6), rect(376, 430, 28, 250, 6)]),
    R(band(ramp, 48, 48)),
    D(bandMarks(ramp, 6, 48, 48, { bow: 0 }), { w: 4 }),
    R(rect(146, 418, 308, 34, 8)),
    R(hut),
    R(clip(hut, rect(0, 380, 600, 26))),
    R(rect(214, 278, 172, 78, 14)),
    D([line([300, 278, 300, 356])], { w: 4 }),
    R(rpoly([146, 258, 454, 258, 400, 176, 200, 176], 12)),
    D(line([300, 176, 300, 86]), { w: 5 }),
    R(rpoly([300, 84, 396, 106, 300, 132], 4), { part: 'flag' }),
    R([circle(482, 500, 42), circle(482, 500, 20)], { evenodd: true }),
    R(circle(480, 700, 44), { part: 'ball' }),
    D([spline([440, 690, 480, 676, 522, 690]), spline([470, 658, 462, 700, 476, 742])], { w: 4, part: 'ball' }),
  ],
  alive: {
    parts: {
      flag: (t) => ({ sx: 0.85 + Math.sin(t * 9) * 0.15, r: Math.sin(t * 5) * 5, ox: 300, oy: 108 }),
      ball: (t) => ({ y: -Math.abs(Math.sin(t * 3.2)) * 80, r: t * 120, ox: 480, oy: 700 }),
    },
  },
};
