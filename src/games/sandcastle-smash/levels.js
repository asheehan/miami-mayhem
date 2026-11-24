// Sandcastle Smash levels: three beach chapters of five. Pure data, built with the little
// helpers below so every piece sits exactly on the one under it. Positions are in metres
// with the sand at y = 0; the helpers take the bottom edge, not the middle. The slingshot
// is at x = 2.6 on every level.
//
// Each level: name, chapter (0 morning beach, 1 the pier, 2 sunset), teach (the new thing, for the picker icon), ammo (coconuts in order),
// pieces. Its width (how much beach the camera needs) and sky are filled in at the bottom.
import { CRAB_H, BUCKET_H } from './sim.js';

const box = (t) => (x, y, w = 1, h = 1, a = 0) => ({ t, x, y: y + h / 2, w, h, a });
const sand = box('sand');
const wood = box('wood');
const ice = box('ice');
const rock = (x, y, w, h, look = 'rock') => ({ t: 'rock', x, y: y + h / 2, w, h, look });
const crab = (x, y) => ({ t: 'crab', x, y: y + CRAB_H / 2 });
const bucket = (x, y) => ({ t: 'bucket', x, y: y + BUCKET_H / 2 });
const ball = (x, y, r = 0.5) => ({ t: 'ball', x, y: y + r, r });

// A pier deck on posts, fixed in place. Returns the pieces; the deck top is at `top`.
const pier = (x0, x1, top, thick = 0.4) => {
  const out = [rock((x0 + x1) / 2, top - thick, x1 - x0, thick, 'pier')];
  for (let x = x0 + 0.4; x <= x1 - 0.3; x += 2.2) out.push(rock(x, 0, 0.35, top - thick, 'post'));
  return out;
};

const coco = (n) => Array(n).fill('coco');

export const CHAPTERS = [
  { name: 'Morning Beach', sky: 'morning' },
  { name: 'The Pier', sky: 'noon' },
  { name: 'Sunset Shore', sky: 'sunset' },
];

export const LEVELS = [
  // ---------- Morning Beach ----------
  {
    name: 'Hello, Crab!',
    chapter: 0,
    teach: 'crab',
    ammo: coco(4),
    pieces: [
      sand(8.5, 0), sand(9.5, 0), sand(10.5, 0),
      sand(9, 1), sand(10, 1),
      crab(9.5, 2),
    ],
  },
  {
    name: 'Two Towers',
    chapter: 0,
    teach: 'crab',
    ammo: coco(5),
    pieces: [
      sand(8.5, 0), sand(8.5, 1), crab(8.5, 2),
      sand(12, 0), sand(13, 0), sand(12.5, 1), sand(12.5, 2), crab(12.5, 3),
    ],
  },
  {
    name: 'Sand Pyramid',
    chapter: 0,
    teach: 'sand',
    ammo: coco(5),
    pieces: [
      crab(8, 0),
      sand(10, 0), sand(11, 0), sand(12, 0), sand(13, 0),
      sand(10.5, 1), sand(11.5, 1), sand(12.5, 1),
      sand(11, 2), sand(12, 2),
      sand(11.5, 3),
      crab(11.5, 4),
    ],
  },
  {
    name: 'Driftwood Hut',
    chapter: 0,
    teach: 'wood',
    ammo: coco(5),
    pieces: [
      sand(10, 0), sand(10, 1),
      sand(13, 0), sand(13, 1),
      crab(11.5, 0),
      wood(11.5, 2, 4, 0.35),
      sand(11, 2.35), sand(12, 2.35),
      crab(11.5, 3.35),
    ],
  },
  {
    name: 'Bouncy Balls',
    chapter: 0,
    teach: 'ball',
    ammo: coco(6),
    pieces: [
      wood(9.4, 0, 0.35, 2), wood(11.6, 0, 0.35, 2),
      wood(10.5, 2, 3, 0.35),
      ball(10, 2.35), ball(11.05, 2.35),
      crab(10.5, 0),
      sand(14, 0), sand(15, 0), sand(14.5, 1),
      crab(14.5, 2),
    ],
  },

  // ---------- The Pier ----------
  {
    name: 'Cooler Ice',
    chapter: 1,
    teach: 'ice',
    ammo: coco(6),
    pieces: [
      ice(10, 0), ice(11, 0), ice(12, 0),
      ice(10.5, 1), ice(11.5, 1),
      crab(11, 2),
      ice(14.5, 0, 1, 2), ice(15.5, 0, 1, 2),
      ice(15, 2, 2.4, 0.4),
      crab(15, 2.4),
    ],
  },
  {
    name: 'Split Coconut',
    chapter: 1,
    teach: 'split',
    ammo: ['split', 'split', 'split', 'coco', 'coco'],
    pieces: [
      sand(10, 0), sand(10, 1), crab(10, 2),
      ice(12.5, 0), ice(12.5, 1), crab(12.5, 2),
      sand(15, 0), sand(15, 1), crab(15, 2),
    ],
  },
  {
    name: 'Pier Party',
    chapter: 1,
    teach: 'pier',
    ammo: coco(6),
    pieces: [
      ...pier(10, 16, 3),
      bucket(11, 3), bucket(12, 3),
      wood(11.5, 3.9, 2.6, 0.3),
      crab(11.5, 4.2),
      sand(14, 3), sand(15, 3), sand(14.5, 4),
      crab(14.5, 5),
      crab(17.6, 0),
    ],
  },
  {
    name: 'Bucket Brigade',
    chapter: 1,
    teach: 'bucket',
    ammo: ['coco', 'split', 'coco', 'split', 'coco', 'coco'],
    pieces: [
      bucket(9.6, 0), bucket(10.6, 0), bucket(11.6, 0),
      wood(10.6, BUCKET_H, 3.2, 0.3),
      bucket(10.1, BUCKET_H + 0.3), bucket(11.1, BUCKET_H + 0.3),
      wood(10.6, BUCKET_H * 2 + 0.3, 2.2, 0.3),
      crab(10.6, BUCKET_H * 2 + 0.6),
      crab(13.4, 0),
      ice(16, 0), ice(17, 0), ice(16.5, 1),
      crab(16.5, 2),
    ],
  },
  {
    name: 'Icy Pier',
    chapter: 1,
    teach: 'pier',
    ammo: ['coco', 'split', 'coco', 'split', 'coco', 'coco'],
    pieces: [
      ...pier(11, 18, 2.6),
      ice(12, 2.6, 0.5, 1.6), ice(14, 2.6, 0.5, 1.6),
      wood(13, 4.2, 2.8, 0.3),
      crab(13, 2.6),
      ice(12.6, 4.5), ice(13.4, 4.5, 0.6, 1),
      crab(13, 5.5),
      sand(16, 2.6), sand(17, 2.6), sand(16.5, 3.6),
      crab(16.5, 4.6),
      sand(19.4, 0), crab(19.4, 1),
    ],
  },

  // ---------- Sunset Shore ----------
  {
    name: 'Bowling Coconut',
    chapter: 2,
    teach: 'heavy',
    ammo: ['heavy', 'heavy', 'coco', 'heavy', 'coco', 'coco'],
    pieces: [
      wood(10, 0, 0.4, 2.2), wood(11.5, 0, 0.4, 2.2), wood(13, 0, 0.4, 2.2),
      wood(11.5, 2.2, 3.6, 0.35),
      crab(10.75, 0), crab(12.25, 0),
      wood(10.6, 2.55, 0.4, 1.6), wood(12.4, 2.55, 0.4, 1.6),
      wood(11.5, 4.15, 2.6, 0.35),
      crab(11.5, 2.55),
      crab(11.5, 4.5),
    ],
  },
  {
    name: 'Pineapple Pop',
    chapter: 2,
    teach: 'pineapple',
    ammo: ['pineapple', 'pineapple', 'coco', 'pineapple', 'coco', 'coco'],
    pieces: [
      wood(10, 0, 0.4, 1.8), wood(13, 0, 0.4, 1.8),
      wood(11.5, 1.8, 3.4, 0.35),
      crab(11, 0), crab(12, 0),
      sand(10.5, 2.15), sand(12.5, 2.15),
      wood(11.5, 3.15, 3, 0.35),
      crab(11.5, 3.5),
      ice(15.5, 0), ice(16.5, 0), ice(16, 1), crab(16, 2),
    ],
  },
  {
    name: 'Far Fort',
    chapter: 2,
    teach: 'far',
    ammo: ['coco', 'split', 'heavy', 'coco', 'pineapple', 'coco', 'coco'],
    pieces: [
      rock(19.5, 0, 6, 1.2),
      sand(17.5, 1.2), sand(17.5, 2.2), sand(17.5, 3.2),
      sand(21.5, 1.2), sand(21.5, 2.2), sand(21.5, 3.2),
      wood(19.5, 4.2, 5, 0.35),
      crab(19.5, 1.2), crab(20.5, 1.2),
      ice(18.5, 4.55), ice(20.5, 4.55),
      wood(19.5, 5.55, 3, 0.3),
      crab(19.5, 5.85),
      crab(14, 0),
      sand(25, 0), sand(25, 1), crab(25, 2),
    ],
  },
  {
    name: 'Crab Tower',
    chapter: 2,
    teach: 'tall',
    ammo: ['heavy', 'coco', 'split', 'pineapple', 'coco', 'heavy', 'coco'],
    pieces: [
      sand(12, 0), sand(13, 0), sand(14, 0), sand(15, 0),
      wood(13.5, 1, 4.2, 0.35),
      crab(12.6, 1.35), crab(14.4, 1.35),
      ice(12, 1.35, 0.5, 1.4), ice(13.5, 1.35, 0.5, 1.4), ice(15, 1.35, 0.5, 1.4),
      wood(13.5, 2.75, 3.6, 0.35),
      sand(12.9, 3.1), sand(14.1, 3.1),
      wood(13.5, 4.1, 2.6, 0.35),
      bucket(13.5, 4.45),
      crab(13.5, 4.45 + BUCKET_H),
      ball(17.3, 0, 0.6),
      sand(18.6, 0, 1, 2),
      crab(19.6, 0),
      wood(19.6, 2, 2.8, 0.3),
      sand(20.6, 0, 1, 2),
    ],
  },
  {
    name: 'King Crab Castle',
    chapter: 2,
    teach: 'king',
    ammo: ['coco', 'split', 'heavy', 'pineapple', 'coco', 'split', 'heavy', 'pineapple'],
    pieces: [
      crab(11.5, 0),
      sand(13, 0), sand(13, 1), sand(13, 2),
      sand(18, 0), sand(18, 1), sand(18, 2),
      wood(15.5, 0, 0.4, 3),
      crab(14.3, 0), crab(16.7, 0),
      wood(15.5, 3, 6, 0.35),
      ice(13.6, 3.35, 0.5, 1.5), ice(17.4, 3.35, 0.5, 1.5),
      bucket(15.5, 3.35),
      crab(15.5, 3.35 + BUCKET_H),
      wood(15.5, 4.85, 4.4, 0.35),
      sand(14.6, 5.2), sand(16.4, 5.2),
      wood(15.5, 6.2, 2.8, 0.3),
      crab(15.5, 6.5),
      ball(20.5, 0, 0.55),
      crab(21.8, 0),
    ],
  },
];

// Each level is as wide as its castle plus a little sand, so the camera fits it snugly.
for (const L of LEVELS) {
  L.sky = CHAPTERS[L.chapter].sky;
  const right = Math.max(...L.pieces.map((p) => p.x + (p.t === 'ball' ? p.r : p.t === 'crab' || p.t === 'bucket' ? 0.5 : p.w / 2)));
  L.width = Math.max(13, Math.ceil((right + 1.4) * 2) / 2);
}
