// A round, friendly helicopter flying over the hills. Comes alive: its big rotor whirls
// and it bobs up and down.
import { R, D, rect, circle, ellipse, cloud, band, spline, hills, svg, clip, all, rpoly, line } from './kit.js';

const H = { part: 'heli' };
const bob = (t) => Math.sin(t * 2.4) * 16;

// A big round cabin, nose to the right.
const body = svg('M340 298 C440 298 510 352 516 430 C522 508 460 552 360 552 C260 552 196 500 196 424 C196 350 252 298 340 298 Z')[0];
const window = clip(body, ellipse(440, 404, 104, 84));
const door = rpoly([258, 350, 334, 350, 334, 470, 258, 470], 22);
const stripe = clip(body, rect(0, 486, 600, 34));
const boom = band([230, 420, 140, 392, 66, 360], 60, 30, { roundEnd: true });
const fin = circle(66, 352, 46);
const rotor = ellipse(344, 254, 250, 22);
const hub = rpoly([304, 246, 384, 246, 394, 310, 294, 310], 14);
const skids = all(
  rect(230, 540, 30, 64, 8),
  rect(420, 540, 30, 64, 8),
  rpoly([186, 592, 470, 592, 520, 574, 532, 590, 486, 626, 186, 626], [16, 10, 8, 8, 14, 16]),
);

export default {
  id: 'helicopter',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(96, 96, 54)),
    R(cloud(470, 120, 170, 96)),
    R(hills(660, 24, 3)),
    R(hills(730, 14, 4, { flip: true })),
    R(boom, H),
    R(fin, H),
    D([line([66, 312, 66, 392]), line([26, 352, 106, 352])], { w: 5, ...H }),
    D(circle(66, 352, 9), { fill: 'ink', w: 0, ...H }),
    R(skids, H),
    R(body, H),
    R(window, H),
    R(door, H),
    D(circle(312, 410, 6), { fill: 'ink', w: 0, ...H }),
    R(stripe, H),
    R(hub, H),
    R(rotor, { part: 'rotor' }),
  ],
  alive: {
    parts: {
      heli: (t) => ({ y: bob(t), r: Math.sin(t * 2.4 + 1) * 3, ox: 350, oy: 430 }),
      rotor: (t) => ({ y: bob(t), sx: Math.cos(t * 16), ox: 344, oy: 254 }),
    },
  },
};
