// A racing car zooming along the track past a waving chequered flag. Comes alive: the car
// zooms, the wheels spin and the flag waves.
import { R, D, rect, circle, cloud, band, svg, clip, rpoly, poly, line, all } from './kit.js';

const W1 = [158, 612];
const W2 = [482, 616];
const body = svg('M44 620 L40 548 C40 528 54 520 74 518 L180 498 C220 488 250 490 268 506 L290 522 L384 522 L404 512 C470 520 540 536 580 558 C594 566 596 590 586 606 C580 616 572 620 560 620 Z')[0];
const stripe = clip(body, rect(0, 552, 600, 30));
const spoiler = all(rpoly([18, 404, 150, 396, 154, 442, 22, 450], 10), rect(76, 440, 24, 80));
const helmet = circle(334, 476, 50);
const visor = svg('M340 446 L380 446 C386 462 386 480 378 496 L344 496 C334 480 334 462 340 446 Z')[0];
const bolt = poly([282, 534, 336, 534, 316, 560, 352, 560, 280, 614, 300, 574, 264, 574]);
const spokes = (cx, cy) => [0, 60, 120].map((a) => {
  const r = (a * Math.PI) / 180;
  return line([cx - Math.cos(r) * 22, cy - Math.sin(r) * 22, cx + Math.cos(r) * 22, cy + Math.sin(r) * 22]);
});
// a waving chequered flag: the top and bottom edges follow the same wave, and so do the
// squares
const wave = (x) => -14 * Math.sin(((x - 90) / 150) * Math.PI * 2);
const flagPts = [];
for (let x = 90; x <= 240; x += 10) flagPts.push(x, 130 + wave(x));
for (let x = 240; x >= 90; x -= 10) flagPts.push(x, 240 + wave(x));
const flag = poly(flagPts);
const checks = [];
for (let r = 0; r < 4; r++) {
  for (let c = 0; c < 5; c++) {
    if ((r + c) % 2) continue;
    const x0 = 90 + c * 30;
    const pts = [];
    for (let x = x0; x <= x0 + 30; x += 10) pts.push(x, 130 + r * 27.5 + wave(x));
    for (let x = x0 + 30; x >= x0; x -= 10) pts.push(x, 157.5 + r * 27.5 + wave(x));
    checks.push(poly(pts));
  }
}

export default {
  id: 'race-car',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(490, 100, 54)),
    R(cloud(400, 230, 160, 60)),
    R(rect(0, 460, 600, 100)),
    R(rect(0, 560, 600, 240)),
    D([rect(20, 722, 100, 16, 6), rect(180, 722, 100, 16, 6), rect(340, 722, 100, 16, 6), rect(500, 722, 100, 16, 6)].map((s) => clip(s, rect(0, 0, 600, 800))), { fill: '#ffffff', w: 3 }),
    R(band([84, 470, 84, 116], 14, 14), { part: 'flag' }),
    R(flag, { part: 'flag' }),
    D(checks, { fill: 'ink', w: 0, part: 'flag' }),
    R(spoiler, { part: 'car' }),
    R(helmet, { part: 'car' }),
    R(visor, { part: 'car' }),
    R(body, { part: 'car' }),
    R(stripe, { part: 'car' }),
    R(bolt, { part: 'car' }),
    D([circle(566, 574, 10)], { fill: '#fff6b0', w: 4, part: 'car' }),
    R(circle(...W1, 72), { part: 'car' }),
    D([circle(...W1, 32)], { fill: '#ffffff', w: 4, part: 'car' }),
    D(spokes(...W1), { w: 4, part: 'w1' }),
    R(circle(...W2, 64), { part: 'car' }),
    D([circle(...W2, 28)], { fill: '#ffffff', w: 4, part: 'car' }),
    D(spokes(...W2), { w: 4, part: 'w2' }),
  ],
  alive: {
    parts: {
      car: (t) => ({ x: Math.sin(t * 2) * 30, y: Math.sin(t * 30) * 2 }),
      w1: (t) => ({ x: Math.sin(t * 2) * 30, r: t * 400, ox: W1[0], oy: W1[1] }),
      w2: (t) => ({ x: Math.sin(t * 2) * 30, r: t * 400, ox: W2[0], oy: W2[1] }),
      flag: (t) => ({ r: Math.sin(t * 5) * 8, ox: 90, oy: 470 }),
    },
    fx: [{ type: 'smoke', x: 30, y: 580, from: 0.2, to: 3.8 }],
  },
};
