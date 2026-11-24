// A floppy-eared puppy sitting on a rug with its ball. Comes alive: it wags its tail and
// tilts its head.
import { R, D, rect, circle, ellipse, blob, band, spline, eye, flipX, clip } from './kit.js';

const head = blob([300, 152, 390, 166, 440, 230, 446, 310, 410, 380, 300, 410, 190, 380, 154, 310, 160, 230, 210, 166]);
const earL = blob([214, 172, 164, 166, 116, 216, 102, 318, 126, 386, 170, 376, 186, 300, 204, 232]);
const body = blob([300, 396, 380, 428, 420, 520, 432, 620, 402, 690, 300, 708, 198, 690, 168, 620, 180, 520, 220, 428]);
const ball = circle(508, 690, 50);

export default {
  id: 'puppy',
  items: [
    R(rect(0, 0, 600, 800)),
    R(rect(0, 630, 600, 170)),
    R(ellipse(300, 716, 270, 62)),
    R(band([396, 610, 456, 590, 496, 540, 508, 480], 44, 28, { roundEnd: true }), { part: 'tail' }),
    R(body),
    R(blob([300, 452, 352, 500, 354, 600, 300, 656, 246, 600, 248, 500])),
    D([spline([244, 560, 248, 668]), spline([356, 560, 352, 668])], { w: 5 }),
    R([ellipse(246, 694, 50, 28), ellipse(354, 694, 50, 28)]),
    D([spline([232, 704, 234, 688]), spline([258, 704, 258, 688]), spline([342, 704, 342, 688]), spline([368, 704, 366, 688])], { w: 4 }),
    R(band([212, 412, 300, 436, 388, 412], 32, 32, { round: true })),
    R(circle(300, 470, 27)),
    D(circle(300, 470, 10), { w: 4 }),
    R(ball),
    D([spline([466, 660, 500, 690, 510, 738]), spline([476, 720, 520, 680, 554, 668])], { w: 5 }),
    R(head, { part: 'head' }),
    R(blob([322, 236, 370, 214, 404, 248, 400, 302, 360, 314, 326, 290]), { part: 'head' }),
    R(earL, { part: 'head' }),
    R(flipX(earL, 300), { part: 'head' }),
    R(ellipse(300, 346, 80, 56), { part: 'head' }),
    R(blob([274, 370, 326, 370, 330, 406, 300, 428, 270, 406]), { part: 'head' }),
    D(spline([300, 382, 300, 412]), { w: 4, part: 'head' }),
    D(ellipse(300, 318, 28, 19), { fill: 'ink', w: 0, part: 'head' }),
    D(ellipse(292, 312, 8, 5), { fill: '#ffffff', w: 0, part: 'head' }),
    D([spline([300, 336, 300, 356]), spline([256, 358, 280, 372, 300, 356, 320, 372, 344, 358])], { w: 5, part: 'head' }),
    ...eye(250, 268, 21, { part: 'head' }),
    ...eye(352, 268, 21, { part: 'head' }),
  ],
  alive: {
    parts: {
      tail: (t) => ({ r: Math.sin(t * 12) * 16, ox: 400, oy: 610 }),
      head: (t) => ({ r: Math.sin(t * 2.4) * 7, ox: 300, oy: 410 }),
    },
    wink: { x: 250, y: 268, r: 22, part: 'head', at: [1.3, 3.1] },
  },
};
