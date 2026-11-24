// Stamps for the free wall. Pure line art in a 100 x 100 box centred on (0, 0), built with
// the same kit as the murals: regions take the chosen paint (unless `fixed`), details are
// ink. A stamp on the wall is scaled to its size and tilted a little.
import { R, D, circle, ellipse, star, heart, blob, band, poly, spline, rpoly, all } from './murals/kit.js';

const BROWN = '#94572e';
const INK = 'ink';

function palm() {
  const leaf = (pts) => blob(pts, 1);
  return [
    R(band([-4, 50, 0, 20, 6, -16], 16, 10), { fixed: BROWN }),
    D([spline([-10, 34, 4, 31]), spline([-8, 18, 6, 16]), spline([-6, 2, 8, 1])], { w: 3 }),
    R(all(
      leaf([6, -20, -20, -36, -46, -26, -48, -8, -30, -22]),
      leaf([6, -20, 30, -38, 48, -30, 50, -10, 28, -22]),
      leaf([6, -20, -12, -46, -2, -50, 10, -48, 6, -30]),
      leaf([6, -20, -26, -10, -34, 8, -26, 12, -10, -8]),
      leaf([6, -20, 34, -6, 40, 12, 30, 14, 20, -6]),
    )),
    D([circle(0, -14, 6), circle(12, -12, 6)], { fill: BROWN, w: 3 }),
  ];
}

function flamingo() {
  return [
    D([poly([2, 26, 2, 50]), poly([10, 26, 18, 38, 8, 40])], { w: 4 }),
    R(all(
      blob([-28, 12, -14, -4, 16, -8, 40, -14, 30, 6, 14, 24, -12, 28]),
      band([-20, 6, -14, -16, -24, -36, -10, -46], 12, 11),
      circle(-12, -44, 11),
    )),
    D(spline([0, 2, 14, -2, 26, 4]), { w: 3 }),
    R(poly([-3, -46, -22, -34, -26, -18, -20, -26, -6, -38]), { fixed: '#2b2340' }),
    D(circle(-12, -47, 2.6), { fill: INK, w: 0 }),
  ];
}

function crab() {
  const legs = [];
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) legs.push(spline([s * 22, 14 + k * 6, s * (38 + k * 2), 22 + k * 6, s * (44 + k), 34 + k * 5]));
  }
  return [
    D(legs, { w: 4 }),
    D([spline([-12, -4, -16, -24]), spline([12, -4, 16, -24])], { w: 4 }),
    R(all(
      ellipse(0, 12, 38, 24),
      blob([-30, -4, -42, -18, -46, -34, -36, -40, -30, -30, -22, -34, -18, -22, -22, -8]),
      blob([30, -4, 42, -18, 46, -34, 36, -40, 30, -30, 22, -34, 18, -22, 22, -8]),
    )),
    D([circle(-16, -26, 7), circle(16, -26, 7)], { fill: '#ffffff', w: 3 }),
    D([circle(-15, -25, 3.4), circle(17, -25, 3.4)], { fill: INK, w: 0 }),
    D(spline([-12, 16, 0, 24, 12, 16]), { w: 4 }),
  ];
}

function smiley() {
  return [
    R(circle(0, 0, 48)),
    D([ellipse(-16, -14, 6, 9), ellipse(16, -14, 6, 9)], { fill: INK, w: 0 }),
    D(spline([-27, 8, -14, 26, 0, 30, 14, 26, 27, 8]), { w: 6 }),
  ];
}

function flower() {
  const petals = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    petals.push(circle(Math.cos(a) * 28, Math.sin(a) * 28, 21));
  }
  return [R(petals), R(circle(0, 0, 19), { fixed: '#ffd919' })];
}

export const STAMPS = [
  { id: 'star', items: [R(star(0, 2, 52, 23)), D(spline([-8, -16, -2, -28]), { w: 4, stroke: '#ffffff' })] },
  { id: 'heart', items: [R(heart(0, 6, 104)), D(spline([-30, -20, -22, -30, -12, -30]), { w: 5, stroke: '#ffffff' })] },
  { id: 'smiley', items: smiley() },
  { id: 'bolt', items: [R(rpoly([14, -50, -30, 6, -4, 6, -18, 50, 32, -10, 6, -10, 24, -50], 3))] },
  { id: 'palm', items: palm() },
  { id: 'flamingo', items: flamingo() },
  { id: 'crab', items: crab() },
  { id: 'flower', items: flower() },
];

export const STAMP_IDS = STAMPS.map((s) => s.id);
export const stampById = (id) => STAMPS.find((s) => s.id === id) || STAMPS[0];
