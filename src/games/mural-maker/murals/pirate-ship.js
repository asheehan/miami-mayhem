// A pirate ship with a skull-and-crossbones sail on the waves. Comes alive: the ship
// rocks on the sea.
import { R, D, rect, circle, cloud, band, spline, hills, svg, clip, rpoly, poly, all } from './kit.js';

const hull = svg('M44 466 C180 500 400 500 562 446 C544 540 500 604 440 632 L168 632 C106 610 66 552 44 466 Z')[0];
const stripe = clip(hull, rect(0, 532, 600, 38));
const cabin = rpoly([58, 400, 214, 400, 214 , 500, 58, 500], 10);
const mainSail = svg('M166 194 C250 178 350 178 434 194 C460 282 460 370 434 452 C350 438 250 438 166 452 C190 370 190 282 166 194 Z')[0];
const topSail = svg('M208 100 C270 88 330 88 392 100 C404 128 404 150 394 172 C330 164 270 164 206 172 C196 150 196 128 208 100 Z')[0];
const flag = svg('M308 38 C340 26 372 52 412 40 L406 88 C372 100 340 74 308 86 Z')[0];
const bones = [band([228, 262, 372, 392], 20, 20, { round: true }), band([372, 262, 228, 392], 20, 20, { round: true })];
const skull = all(circle(300, 296, 50), rpoly([270, 320, 330, 320, 326, 358, 274, 358], 10));

export default {
  id: 'pirate-ship',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(512, 300, 50)),
    R(cloud(110, 150, 170, 70)),
    D([spline([480, 160, 496, 150, 510, 160, 524, 150, 540, 160])], { w: 4 }),
    R(hills(560, 10, 5)),
    R(cabin, { part: 'ship' }),
    D([rect(84, 424, 30, 30, 6), rect(150, 424, 30, 30, 6)], { fill: '#ffffff', w: 4, part: 'ship' }),
    R(band([300, 520, 300, 34], 18, 16), { part: 'ship' }),
    R(flag, { part: 'ship' }),
    R(topSail, { part: 'ship' }),
    R(mainSail, { part: 'ship' }),
    R(bones, { part: 'ship' }),
    R(skull, { part: 'ship' }),
    D([circle(282, 294, 13), circle(318, 294, 13), poly([300, 312, 292, 326, 308, 326])], { fill: 'ink', w: 0, part: 'ship' }),
    D([spline([286, 342, 286, 356]), spline([300, 344, 300, 358]), spline([314, 342, 314, 356])], { w: 4, part: 'ship' }),
    R(hull, { part: 'ship' }),
    R(stripe, { part: 'ship' }),
    D([circle(160, 551, 11), circle(260, 551, 11), circle(360, 551, 11), circle(460, 551, 11)], { fill: '#ffffff', w: 4, part: 'ship' }),
    D([spline([60, 470, 180, 500, 300, 504, 420, 492, 556, 452])], { w: 4, part: 'ship' }),
    R(hills(640, 18, 4, { flip: true })),
    D([spline([60, 712, 100, 702, 140, 712]), spline([300, 742, 340, 732, 380, 742]), spline([460, 772, 500, 762, 540, 772])], { w: 4 }),
  ],
  alive: {
    parts: { ship: (t) => ({ r: Math.sin(t * 2.2) * 5, y: Math.sin(t * 4.4) * 6, ox: 300, oy: 620 }) },
    fx: [{ type: 'splash', x: 480, y: 630, from: 0.4, to: 1.4 }, { type: 'splash', x: 130, y: 630, from: 2.4, to: 3.4 }],
  },
};
