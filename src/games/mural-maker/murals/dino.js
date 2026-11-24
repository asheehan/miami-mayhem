// A chunky, grinning T-rex stomping past a smoking volcano. Comes alive: stomps, sways
// and winks.
import { R, D, rect, circle, ellipse, cloud, spline, band, alongBand, hills, eye, svg, clip, inWall, tf, rpoly, all } from './kit.js';

// The whole body in one outline, facing right: big head, thick neck, round body and a
// long tail sweeping down to the left.
const body = svg(`
  M400 160 C452 138 538 138 574 168 C596 188 600 222 594 244 C590 276 568 300 530 306
  C490 312 452 314 424 318 C414 334 416 352 422 372 C444 424 446 500 414 552
  C388 596 332 616 272 612 C222 610 178 592 152 570 C112 582 62 596 14 598
  C30 568 70 522 110 482 C150 442 182 384 230 346 C270 318 308 300 326 270
  C338 240 346 186 400 160 Z`)[0];

// the pale belly down the front
const belly = clip(body, ellipse(418, 476, 64, 156, -10));

// the near leg: a big thigh, a stout shin and a foot pointing forward
const nearLeg = svg(`
  M214 470 C228 418 330 410 356 466 C372 506 362 546 346 572 C338 596 340 620 354 636
  C384 644 398 668 376 676 L258 676 C240 676 240 654 258 640 C270 622 266 600 250 580
  C220 550 204 512 214 470 Z`)[0];

// the far leg peeps out from behind
const farLeg = svg(`
  M136 540 C160 512 214 520 226 558 C232 590 222 616 228 636 C250 646 260 668 238 674
  L138 674 C120 674 120 652 140 642 C152 624 144 600 136 580 Z`)[0];

// spikes along the neck, back and tail (their bases hide behind the body)
const spike = (x, y, r, s = 1) => tf(rpoly([-26, 16, 0, -38, 26, 16], 7), { x, y, r, s });
const spikes = all(
  spike(352, 198, -52, 1.05),
  spike(326, 262, -58, 1.1),
  spike(284, 314, -55, 1.1),
  spike(228, 352, -50, 1.05),
  spike(170, 412, -48, 0.95),
  spike(112, 478, -46, 0.85),
  spike(62, 540, -44, 0.7),
);

// spots on the back and tail
const spots = all(ellipse(288, 372, 24, 17, -20), ellipse(232, 408, 19, 14, -30), ellipse(332, 330, 15, 11, -30), ellipse(170, 470, 18, 13, -38), ellipse(108, 530, 14, 10, -40));

// a tiny arm, bent at the elbow, with two little claws
const arm = band([408, 392, 444, 402, 458, 428], 36, 30, { round: true });
const claws = [svg('M444 436 L440 458 L456 444 Z')[0], svg('M462 440 L468 460 L474 438 Z')[0]];

const volcano = svg('M0 430 C30 400 48 362 64 330 L156 330 C176 400 222 520 300 652 L0 652 Z')[0];
const lava = svg('M64 330 L156 330 C160 346 165 362 170 378 C160 392 150 372 140 386 C130 400 120 378 108 392 C98 404 90 380 80 390 C70 398 60 384 50 368 C55 356 59 344 64 330 Z')[0];

// a big toothy grin: the teeth hang from the mouth line
const mouthLine = [446, 256, 494, 284, 548, 290, 586, 262];
const teeth = alongBand(mouthLine, [0.28, 0.48, 0.68]).map(([x, y]) => svg(`M${x - 16} ${y - 1} L${x + 16} ${y - 1} L${x} ${y + 24} Z`)[0]);

// the T-rex is drawn a little smaller than authored, so its snout clears the wall's edge
const REX = { s: 0.92, ox: 290, oy: 676, x: -10 };
const rexPt = (x, y) => [REX.ox + (x - REX.ox) * REX.s + REX.x, REX.oy + (y - REX.oy) * REX.s];
const rex = (items) => items.map((it) => ({ ...it, shapes: tf(it.shapes, REX), part: 'rex' }));
const [ex, ey] = rexPt(500, 206);

export default {
  id: 'dino',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(236, 96, 52)),
    R(cloud(124, 244, 160, 104)),
    R(volcano),
    R(lava),
    R(hills(646, 10, 3)),
    D([spline([30, 720, 54, 704, 78, 720]), spline([210, 760, 234, 744, 258, 760]), spline([420, 740, 444, 724, 468, 740])], { w: 4 }),
    R(inWall(cloud(526, 610, 150, 96))),
    R(ellipse(520, 668, 40, 50)),
    D(spline([482, 664, 496, 654, 506, 668, 518, 652, 530, 668, 542, 654, 556, 666]), { w: 4 }),
    ...rex([
      R(farLeg, { part: 'rex' }),
      R(spikes, { part: 'rex' }),
      R(body, { part: 'rex' }),
      R(belly, { part: 'rex' }),
      D([spline([380, 440, 404, 446, 432, 442]), spline([378, 490, 404, 496, 434, 490]), spline([370, 540, 396, 546, 420, 538])], { w: 4, part: 'rex' }),
      R(spots, { part: 'rex' }),
      R(nearLeg, { part: 'rex' }),
      D([spline([346, 650, 352, 664, 350, 676]), spline([322, 646, 326, 662, 322, 676])], { w: 4, part: 'rex' }),
      D(claws, { fill: '#ffffff', w: 3, part: 'rex' }),
      R(arm, { part: 'rex' }),
      D(spline(mouthLine), { w: 6, part: 'rex' }),
      D(teeth, { fill: '#ffffff', w: 4, part: 'rex' }),
      D(spline([434, 248, 446, 256, 444, 270]), { w: 5, part: 'rex' }),
      ...eye(500, 206, 27, { lx: 0.5, ly: 0.1 }),
      D(ellipse(574, 196, 6, 4, -20), { fill: 'ink', w: 0, part: 'rex' }),
    ]),
  ],
  alive: {
    parts: {
      rex: (t) => {
        // three big stomps, swaying side to side
        const k = (t % 1.3) / 1.3;
        const hop = t < 3.9 ? Math.sin(Math.min(1, k / 0.55) * Math.PI) : 0;
        return { y: -hop * 34, r: Math.sin(t * 2.4) * 4, ox: 300, oy: 676 };
      },
    },
    wink: { x: ex, y: ey, r: 27 * REX.s + 1, part: 'rex', at: [1.6, 3.4] },
    fx: [
      { type: 'smoke', x: 300, y: 600, from: 0.7, to: 1.6 },
      { type: 'smoke', x: 300, y: 600, from: 2.0, to: 2.9 },
      { type: 'smoke', x: 300, y: 600, from: 3.3, to: 4.2 },
    ],
  },
};
