// A unicorn standing in a meadow under a rainbow. Comes alive: it prances and winks.
import { R, D, rect, circle, ellipse, cloud, band, spline, hills, eye, svg, clip, arcBand, rpoly, poly, all } from './kit.js';

// body and neck as one chunky silhouette; the head sits on top
const body = svg('M160 430 C200 400 290 404 352 402 C372 370 382 330 398 296 L474 318 C474 360 470 400 464 440 C460 500 420 552 360 556 L214 556 C152 556 120 520 124 480 C126 456 140 440 160 430 Z')[0];
const head = svg('M394 252 C398 210 438 188 480 198 C522 208 542 248 550 288 C558 330 532 352 500 350 C470 348 450 334 430 322 C404 308 390 284 394 252 Z')[0];
const muzzle = clip(head, circle(536, 322, 50));
const ear = rpoly([482, 216, 520, 128, 544, 228], [8, 6, 8]);
const horn = poly([446, 202, 506, 100, 478, 214]);
const mane = svg('M446 196 C404 186 372 206 362 246 C340 266 332 296 342 318 C320 338 316 368 332 388 C320 408 330 430 354 442 C372 400 390 340 404 300 C416 262 430 228 446 196 Z')[0];
const tail = svg('M162 436 C112 424 76 456 78 506 C68 540 82 580 102 604 C110 574 122 556 144 544 C132 520 140 492 172 474 Z')[0];
const leg = (x) => band([x, 520, x, 656], 50, 44);
const hoof = (x) => rpoly([x - 27, 646, x + 27, 646, x + 28, 680, x - 28, 680], 10);
// the near front leg is lifted and bent, prancing
const liftLine = [404, 520, 430, 576, 404, 614];
const lift = band(liftLine, 50, 44);
const liftHoof = rpoly([370, 598, 412, 596, 420, 632, 378, 640], 10);
const flower = (x, y) => [0, 72, 144, 216, 288].map((a) => circle(x + Math.cos((a * Math.PI) / 180) * 12, y + Math.sin((a * Math.PI) / 180) * 12, 9));

export default {
  id: 'unicorn',
  items: [
    R(rect(0, 0, 600, 800)),
    R(arcBand(180, 350, 156, 122, 180, 360, 48)),
    R(arcBand(180, 350, 122, 88, 180, 360, 48)),
    R(arcBand(180, 350, 88, 54, 180, 360, 48)),
    R(all(cloud(76, 352, 150, 66), cloud(290, 352, 150, 66))),
    R(hills(626, 12, 4)),
    D([...flower(70, 730), ...flower(530, 740), ...flower(300, 760)], { fill: '#ffffff', w: 4 }),
    D([circle(70, 730, 7), circle(530, 740, 7), circle(300, 760, 7)], { fill: 'ink', w: 0 }),
    R([leg(244), leg(446), hoof(244), hoof(446)], { part: 'uni' }),
    R(tail, { part: 'uni' }),
    R([leg(196), lift], { part: 'uni' }),
    R([hoof(196), liftHoof], { part: 'uni' }),
    R(body, { part: 'uni' }),
    R(ear, { part: 'uni' }),
    R(head, { part: 'uni' }),
    R(muzzle, { part: 'uni' }),
    R(horn, { part: 'uni' }),
    D([spline([458, 186, 478, 178]), spline([466, 166, 486, 156]), spline([476, 144, 494, 136])], { w: 4, part: 'uni' }),
    R(mane, { part: 'uni' }),
    ...eye(468, 262, 16, { lx: 1, part: 'uni' }),
    D([spline([458, 246, 450, 236]), spline([470, 242, 468, 230]), spline([482, 246, 488, 236])], { w: 4, part: 'uni' }),
    D([ellipse(540, 314, 5, 7)], { fill: 'ink', w: 0, part: 'uni' }),
    D(spline([500, 334, 516, 342, 532, 340]), { w: 5, part: 'uni' }),
    D([ellipse(486, 304, 14, 9)], { fill: '#ff9ab8', w: 0, part: 'uni' }),
  ],
  alive: {
    parts: { uni: (t) => ({ y: -Math.abs(Math.sin(t * 4)) * 30, r: Math.sin(t * 4) * 3, ox: 300, oy: 680 }) },
    wink: { x: 468, y: 262, r: 17, part: 'uni', at: [1.2, 3] },
    fx: [{ type: 'glow', x: 506, y: 110, from: 0, to: 4.2 }],
  },
};
