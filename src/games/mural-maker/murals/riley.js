// RILEY in big bubble letters under a rainbow. Comes alive: the letters bounce in a wave
// and the heart beats.
import { R, D, rect, circle, cloud, rpoly, arcBand, star, heart, tf, spline } from './kit.js';

// Each letter drawn in its own box (190 tall), placed along the wall with a little tilt.
const LETTERS = [
  { id: 'R', w: 120, shapes: () => [
    rpoly([0, 0, 78, 0, 120, 28, 120, 92, 98, 114, 124, 190, 72, 190, 54, 126, 50, 126, 50, 190, 0, 190], [16, 34, 30, 30, 8, 12, 12, 6, 6, 12, 16]),
    rpoly([50, 40, 66, 40, 74, 50, 74, 74, 66, 86, 50, 86], 8),
  ] },
  { id: 'I', w: 58, shapes: () => [rect(0, 0, 58, 190, 26)] },
  { id: 'L', w: 106, shapes: () => [rpoly([0, 0, 52, 0, 52, 140, 106, 140, 106, 190, 0, 190], 18)] },
  { id: 'E', w: 106, shapes: () => [rpoly([0, 0, 106, 0, 106, 46, 52, 46, 52, 74, 96, 74, 96, 116, 52, 116, 52, 144, 106, 144, 106, 190, 0, 190], 14)] },
  { id: 'Y', w: 124, shapes: () => [rpoly([0, 0, 52, 0, 62, 56, 72, 0, 124, 0, 88, 104, 88, 190, 36, 190, 36, 104], 14)] },
];
const GAP = 16;
const TOP = 380;
const LIFT = [0, -14, 6, -10, 4];
const TILT = [-6, 4, -4, 5, -5];
let x = (600 - (LETTERS.reduce((a, l) => a + l.w, 0) + GAP * (LETTERS.length - 1))) / 2;
const placed = LETTERS.map((l, i) => {
  const cx = x + l.w / 2;
  const cy = TOP + LIFT[i] + 95;
  const shapes = tf(l.shapes(), { x: x, y: TOP + LIFT[i] }).map((s) => tf(s, { r: TILT[i], ox: cx, oy: cy }));
  const x0 = x;
  x += l.w + GAP;
  return { ...l, cx, cy, x0, shapes };
});

export default {
  id: 'riley',
  items: [
    R(rect(0, 0, 600, 800)),
    R(arcBand(300, 350, 274, 240, 180, 360)),
    R(arcBand(300, 350, 240, 206, 180, 360)),
    R(arcBand(300, 350, 206, 172, 180, 360)),
    R(circle(300, 262, 62), { part: 'sun' }),
    D([spline([272, 270, 300, 292, 328, 270])], { w: 5, part: 'sun' }),
    D([circle(280, 246, 6), circle(320, 246, 6)], { fill: 'ink', w: 0, part: 'sun' }),
    R(cloud(72, 340, 136, 64)),
    R(cloud(528, 340, 136, 64)),
    ...placed.map((l) => R(l.shapes, { evenodd: true, part: l.id })),
    ...placed.map((l, i) => D(tf(spline([l.x0 + 14, l.cy - 62, l.x0 + 14, l.cy - 36]), { r: TILT[i], ox: l.cx, oy: l.cy }), { w: 6, stroke: '#ffffff', part: l.id })),
    R(tf(star(0, 0, 62, 27), { r: -10, x: 110, y: 690 }), { part: 'star1' }),
    R(heart(300, 694, 132), { part: 'heart' }),
    R(tf(star(0, 0, 62, 27), { r: 12, x: 490, y: 690 }), { part: 'star2' }),
    D([star(200, 610, 12, 4, 4), star(400, 620, 10, 4, 4), star(40, 560, 10, 4, 4), star(560, 580, 12, 4, 4), star(300, 770, 9, 3, 4)], { fill: '#ffffff', w: 3 }),
  ],
  alive: {
    parts: {
      ...Object.fromEntries(placed.map((l, i) => [l.id, (t) => ({ y: -Math.max(0, Math.sin(t * 6 - i * 0.8)) * 46 })])),
      heart: (t) => {
        const b = 1 + Math.max(0, Math.sin(t * 9)) * 0.12;
        return { sx: b, sy: b, ox: 300, oy: 694 };
      },
      star1: (t) => ({ r: t * 90, ox: 110, oy: 690 }),
      star2: (t) => ({ r: -t * 90, ox: 490, oy: 690 }),
      sun: (t) => ({ r: Math.sin(t * 4) * 8, ox: 300, oy: 262 }),
    },
  },
};
