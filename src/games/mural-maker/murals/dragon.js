// A chubby friendly dragon sitting on a hill. Comes alive: it flaps its wing and puffs
// smoke.
import { R, D, rect, circle, ellipse, cloud, blob, band, spline, hills, eye, svg, clip, poly, rpoly, all, tf } from './kit.js';

const HY = 40; // the head sits down on the body
const H = (s) => tf(s, { y: HY });

const body = svg('M300 330 C380 330 430 400 440 480 C450 570 410 650 300 652 C196 654 160 580 168 500 C176 410 220 330 300 330 Z')[0];
const belly = clip(body, ellipse(350, 520, 92, 130));
const head = H(svg('M296 250 C296 180 352 140 414 148 C466 154 496 186 514 218 C552 226 576 256 570 290 C562 326 520 338 480 332 C440 340 378 336 338 316 C310 302 296 280 296 250 Z')[0]);
const horns = H(all(rpoly([334, 176, 330, 108, 372, 160], [8, 6, 8]), rpoly([392, 152, 412, 88, 436, 152], [8, 6, 8])));
const spikes = all(
  H(poly([304, 202, 264, 196, 296, 232])),
  H(poly([290, 250, 246, 252, 290, 282])),
  poly([248, 352, 208, 332, 228, 384]),
  poly([206, 410, 164, 404, 194, 446]),
);
const wing = svg('M246 410 C214 340 170 270 72 214 C96 262 88 302 62 334 C104 326 132 346 132 378 C164 360 200 378 210 410 Z')[0];
const tailLine = [220, 620, 140, 650, 84, 620, 70, 560];
const tail = band(tailLine, 64, 26);
const tip = svg('M70 572 C40 560 28 528 36 500 C52 510 62 512 70 506 C78 512 88 510 104 500 C112 528 100 560 70 572 Z')[0];
const feet = all(ellipse(250, 650, 62, 32), ellipse(380, 654, 66, 34));
const arm = band([392, 440, 424, 466, 432, 490], 40, 34, { round: true });

export default {
  id: 'dragon',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(110, 96, 52)),
    R(cloud(470, 90, 170, 66)),
    R(clip(blob([-20, 480, 80, 380, 160, 420, 240, 360, 340, 430, 450, 370, 540, 420, 640, 380, 640, 600, -20, 600]), rect(0, 0, 600, 800))),
    R(hills(620, 14, 3)),
    D([spline([40, 730, 70, 720, 100, 730]), spline([480, 760, 510, 750, 540, 760])], { w: 4 }),
    R(tail),
    R(tip),
    R(wing, { part: 'wing' }),
    D([spline([224, 396, 170, 320, 80, 222]), spline([184, 384, 140, 330, 66, 330])], { w: 4, part: 'wing' }),
    R(spikes),
    R(feet),
    R(body),
    R(belly),
    D([spline([294, 450, 350, 436, 404, 452]), spline([284, 510, 350, 496, 420, 512]), spline([290, 570, 350, 558, 412, 572])], { w: 4 }),
    R(arm),
    D([circle(230, 676, 6), circle(252, 680, 6), circle(362, 682, 6), circle(386, 684, 6)], { fill: 'ink', w: 0 }),
    R(horns),
    R(head),
    ...eye(414, 226 + HY, 22, { lx: 1 }),
    D(H([ellipse(540, 262, 6, 8), ellipse(560, 270, 5, 7)]), { fill: 'ink', w: 0 }),
    D(H(spline([470, 300, 506, 314, 548, 306])), { w: 6 }),
    D(H([ellipse(460, 278, 16, 10)]), { fill: '#ff9ab8', w: 0 }),
  ],
  alive: {
    parts: { wing: (t) => ({ r: Math.sin(t * 7) * 16, ox: 236, oy: 404 }) },
    wink: { x: 414, y: 226 + HY, r: 23, at: [1.2, 3] },
    fx: [{ type: 'smoke', x: 560, y: 260, from: 0.6, to: 3.6 }],
  },
};
