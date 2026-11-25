// A sleepy, smiley sloth hanging from a jungle branch. Comes alive: it swings gently
// from the branch.
import { R, D, rect, circle, ellipse, blob, band, spline, eye, svg, all, frond, inWall, cloud } from './kit.js';

const S = { part: 'sloth' };

const arms = all(
  band([214, 470, 180, 360, 214, 232], 62, 56, { round: true }),
  band([386, 470, 420, 360, 386, 232], 62, 56, { round: true }),
);
const legs = all(
  band([250, 600, 226, 680, 236, 736], 60, 50, { round: true }),
  band([350, 600, 374, 680, 364, 736], 60, 50, { round: true }),
);
const body = svg('M300 404 C390 404 430 470 430 540 C430 620 380 660 300 660 C220 660 170 620 170 540 C170 470 210 404 300 404 Z')[0];
const belly = ellipse(300, 556, 74, 80);
const head = svg('M300 254 C376 254 418 304 418 362 C418 426 370 466 300 466 C230 466 182 426 182 362 C182 304 224 254 300 254 Z')[0];
// The pale face mask, a wide peanut.
const mask = svg('M300 300 C330 284 384 290 394 336 C402 376 384 420 340 432 C320 438 280 438 260 432 C216 420 198 376 206 336 C216 290 270 284 300 300 Z')[0];
const patches = all(ellipse(256, 360, 38, 24, 28), ellipse(344, 360, 38, 24, -28));
const branch = inWall(band([-20, 236, 150, 214, 320, 230, 470, 206, 620, 222], 58, 50));

export default {
  id: 'sloth',
  items: [
    R(rect(0, 0, 600, 800)),
    R(inWall(cloud(60, 740, 230, 170))),
    R(inWall(cloud(550, 720, 240, 190))),
    R(all(frond(60, 240, 110, 130, 50, 0.1), frond(110, 236, 70, 110, 44, 0.1), frond(520, 220, 70, 130, 50, 0.1), frond(470, 226, 110, 110, 44, 0.1)).map(inWall)),
    R(branch),
    D([spline([60, 232, 100, 228]), spline([260, 222, 300, 228]), spline([520, 214, 560, 218])], { w: 4 }),
    R(all([0, 72, 144, 216, 288].map((a) => circle(500 + Math.cos((a * Math.PI) / 180) * 36, 380 + Math.sin((a * Math.PI) / 180) * 36, 28)))),
    R(circle(500, 380, 27)),
    R(legs, S),
    D([spline([216, 754, 222, 738]), spline([238, 760, 240, 742]), spline([362, 760, 360, 742]), spline([384, 754, 378, 738])], { w: 4, ...S }),
    R(body, S),
    R(belly, S),
    R(arms, S),
    D([spline([192, 210, 206, 196, 222, 204]), spline([212, 214, 226, 200, 242, 208]), spline([378, 204, 394, 196, 408, 210]), spline([358, 208, 374, 200, 388, 214])], { w: 5, ...S }),
    R(head, S),
    R(mask, S),
    R(patches, S),
    ...eye(258, 358, 11, { lx: 0.3, ...S }),
    ...eye(342, 358, 11, { lx: -0.3, ...S }),
    D(ellipse(300, 390, 18, 12), { fill: 'ink', w: 0, ...S }),
    D(spline([268, 410, 300, 426, 332, 410]), { w: 5, ...S }),
  ],
  alive: {
    parts: { sloth: (t) => ({ r: Math.sin(t * 1.8) * 6, ox: 300, oy: 220 }) },
    wink: { x: 258, y: 358, r: 12, part: 'sloth', at: [1.4, 3.2] },
  },
};
