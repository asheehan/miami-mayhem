// A chunky steam train puffing along the track through the hills. Comes alive: it chugs
// and its smoke puffs float up.
import { R, D, rect, circle, cloud, spline, hills, rpoly, all, line } from './kit.js';

const T = { part: 'train' };
const wheels = all(circle(196, 606, 62), circle(336, 606, 62));
const smallWheel = circle(466, 626, 42);

export default {
  id: 'train',
  items: [
    R(rect(0, 0, 600, 800)),
    R(circle(90, 92, 54)),
    R(hills(470, 26, 3)),
    R(rect(0, 668, 600, 132)),
    R(all([0, 1, 2, 3, 4, 5].map((k) => rect(k * 100 + 18, 690, 64, 42, 6)))),
    D([line([0, 690, 600, 690]), line([0, 712, 600, 712])], { w: 6 }),
    R(cloud(430, 190, 130, 96), { part: 'smoke' }),
    R(cloud(520, 90, 110, 84), { part: 'smoke' }),
    R(rpoly([398, 432, 386, 330, 360, 286, 486, 286, 460, 330, 448, 432], [4, 8, 10, 10, 8, 4]), T),
    R(rpoly([260, 420, 300, 372, 340, 372, 380, 420], [4, 18, 18, 4]), T),
    R(rect(220, 410, 300, 160, 40), T),
    D([line([300, 412, 300, 566]), line([400, 412, 400, 566])], { w: 4, ...T }),
    R(rpoly([514, 414, 548, 430, 548, 556, 514, 570], 14), T),
    R(rect(70, 330, 180, 252, 16), T),
    R(rect(102, 364, 116, 96, 18), T),
    R(rect(52, 296, 216, 46, 20), T),
    R(rect(56, 560, 480, 44, 14), T),
    R(rpoly([520, 570, 556, 570, 596, 650, 520, 650], [6, 6, 8, 8]), T),
    D([line([540, 584, 554, 648]), line([560, 584, 576, 646])], { w: 4, ...T }),
    R(wheels, T),
    R(smallWheel, T),
    D([circle(196, 606, 22), circle(336, 606, 22), circle(466, 626, 14)], { fill: 'ink', w: 0, ...T }),
    D([line([196, 606, 336, 606]), line([140, 606, 252, 606]), line([196, 550, 196, 662]), line([336, 550, 336, 662])], { w: 5, ...T }),
  ],
  alive: {
    parts: {
      train: (t) => ({ y: -Math.abs(Math.sin(t * 7)) * 6 }),
      smoke: (t) => ({ y: -((t * 40) % 60), x: (t * 30) % 40 }),
    },
    fx: [{ type: 'smoke', x: 424, y: 280, from: 0.3, to: 4.2 }],
  },
};
