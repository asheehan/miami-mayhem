// The nine Hurricane Riley levels as plain data, in the 400 x 640 field (y down).
//
// job 'sail': blow the boat into the dock slip (dock: { x, y, w, h, maxSpeed }).
// job 'herd': blow every ball or duck into the pool (pool: { x, y, r, escape } — a thing in the
//             pool moving faster than `escape` toward the rim goes back out).
// job 'shoo': keep the gulls off the picnic until the clock runs out (shoo: see below).
//
// walls: sand banks, pier posts, chairs: { x, y, w, h, kind, bounce }.
// circles: mangrove islands, rocks, palms, umbrellas: { x, y, r, kind, bounce, kick }.
// currents: { x, y, w, h, vx, vy } — water that carries the boat.
// shells: [x, y] to collect along the way (a star for getting them all).
// decor: scenery that only reacts to the wind (palms, umbrellas, towels).
// nav: waypoints around obstacles, used by the bot and for the hint arrow.
// par: seconds to beat for a star (sail and herd).
// noFail: levels where nothing can go wrong.

const beachTop = { x: 0, y: 0, w: 400, h: 34, kind: 'sand' };

export const LEVELS = [
  {
    name: 'First Sail',
    job: 'sail',
    noFail: true,
    par: 16,
    movers: [['boat', 200, 540]],
    dock: { x: 144, y: 34, w: 112, h: 84, maxSpeed: 9999 },
    walls: [
      beachTop,
      { x: 0, y: 598, w: 400, h: 42, kind: 'sand' },
      { x: 132, y: 34, w: 12, h: 84, kind: 'pier', bounce: 0.3 },
      { x: 256, y: 34, w: 12, h: 84, kind: 'pier', bounce: 0.3 },
    ],
    circles: [],
    shells: [[175, 420], [225, 260]],
    decor: [
      { kind: 'palm', x: 40, y: 14 }, { kind: 'palm', x: 360, y: 18 },
      { kind: 'palm', x: 50, y: 622 }, { kind: 'umbrella', x: 330, y: 620 },
    ],
    nav: [],
  },
  {
    name: 'Beach Balls',
    job: 'herd',
    noFail: true,
    par: 16,
    movers: [['ball', 140, 470], ['ball', 260, 470]],
    pool: { x: 200, y: 190, r: 88, escape: 9999, kind: 'pool' },
    walls: [],
    circles: [],
    shells: [[150, 340], [250, 340]],
    decor: [
      { kind: 'umbrella', x: 62, y: 572 }, { kind: 'umbrella', x: 345, y: 70 },
      { kind: 'towel', x: 330, y: 590 }, { kind: 'palm', x: 28, y: 40 }, { kind: 'palm', x: 378, y: 600 },
    ],
    nav: [],
  },
  {
    name: 'Picnic Time',
    job: 'shoo',
    noFail: true,
    shoo: {
      picnic: { x: 200, y: 330, r: 52 }, snacks: 4, duration: 25, gulls: 6, firstAt: 2, quietEnd: 5,
      walkSpeed: 26, flySpeed: 60, flyers: 0, sides: ['left', 'right'],
    },
    movers: [],
    walls: [],
    circles: [],
    shells: [],
    decor: [
      { kind: 'umbrella', x: 290, y: 245 }, { kind: 'palm', x: 40, y: 60 }, { kind: 'palm', x: 360, y: 590 },
      { kind: 'palm', x: 350, y: 70 }, { kind: 'towel', x: 80, y: 560 },
    ],
    nav: [],
  },
  {
    name: 'Mangrove Maze',
    job: 'sail',
    par: 22,
    movers: [['boat', 330, 560]],
    dock: { x: 288, y: 34, w: 88, h: 80, maxSpeed: 260 },
    walls: [
      beachTop,
      { x: 0, y: 602, w: 400, h: 38, kind: 'sand' },
      { x: 276, y: 34, w: 12, h: 80, kind: 'pier', bounce: 0.3 },
      { x: 376, y: 34, w: 12, h: 80, kind: 'pier', bounce: 0.3 },
    ],
    circles: [
      { x: 120, y: 440, r: 70, kind: 'mangrove', bounce: 0.4 },
      { x: 285, y: 290, r: 68, kind: 'mangrove', bounce: 0.4 },
      { x: 105, y: 150, r: 42, kind: 'mangrove', bounce: 0.4 },
    ],
    shells: [[335, 470], [178, 325], [250, 180]],
    decor: [{ kind: 'palm', x: 40, y: 14 }, { kind: 'palm', x: 200, y: 12 }, { kind: 'palm', x: 40, y: 622 }, { kind: 'umbrella', x: 360, y: 622 }],
    nav: [[175, 310], [355, 200]],
  },
  {
    name: 'Pool Party',
    job: 'herd',
    par: 26,
    movers: [['ball', 90, 540], ['ball', 200, 575], ['ball', 310, 540]],
    pool: { x: 200, y: 150, r: 74, escape: 170, kind: 'pool' },
    walls: [
      { x: 112, y: 244, w: 36, h: 66, kind: 'chair', bounce: 0.4 },
      { x: 252, y: 244, w: 36, h: 66, kind: 'chair', bounce: 0.4 },
    ],
    circles: [
      { x: 200, y: 395, r: 26, kind: 'umbrella', bounce: 0.5 },
      { x: 60, y: 310, r: 20, kind: 'palm', bounce: 0.5 },
      { x: 340, y: 310, r: 20, kind: 'palm', bounce: 0.5 },
    ],
    shells: [[200, 480], [120, 410], [280, 410]],
    decor: [{ kind: 'towel', x: 60, y: 120 }, { kind: 'umbrella', x: 350, y: 70 }, { kind: 'palm', x: 30, y: 600 }],
    nav: [[200, 330], [125, 420], [275, 420]],
  },
  {
    name: 'Gull Gang',
    job: 'shoo',
    shoo: {
      picnic: { x: 200, y: 330, r: 52 }, snacks: 4, duration: 30, gulls: 11, firstAt: 1.5, quietEnd: 5,
      walkSpeed: 32, flySpeed: 62, flyers: 0.3, sides: ['left', 'right', 'top', 'bottom'],
    },
    movers: [],
    walls: [],
    circles: [],
    shells: [],
    decor: [
      { kind: 'umbrella', x: 110, y: 240 }, { kind: 'umbrella', x: 300, y: 430 }, { kind: 'palm', x: 40, y: 60 },
      { kind: 'palm', x: 360, y: 590 }, { kind: 'towel', x: 320, y: 140 }, { kind: 'towel', x: 80, y: 520 },
    ],
    nav: [],
  },
  {
    name: 'Rocky Channel',
    job: 'sail',
    par: 26,
    movers: [['boat', 90, 568]],
    dock: { x: 40, y: 34, w: 80, h: 80, maxSpeed: 180 },
    walls: [
      beachTop,
      { x: 0, y: 604, w: 400, h: 36, kind: 'sand' },
      { x: 0, y: 250, w: 135, h: 170, kind: 'sand' },
      { x: 265, y: 250, w: 135, h: 170, kind: 'sand' },
      { x: 28, y: 34, w: 12, h: 80, kind: 'pier', bounce: 0.3 },
      { x: 120, y: 34, w: 12, h: 80, kind: 'pier', bounce: 0.3 },
    ],
    circles: [
      { x: 165, y: 330, r: 15, kind: 'rock', bounce: 0.9, kick: 70 },
      { x: 240, y: 372, r: 15, kind: 'rock', bounce: 0.9, kick: 70 },
      { x: 305, y: 150, r: 50, kind: 'mangrove', bounce: 0.4 },
    ],
    currents: [{ x: 0, y: 440, w: 400, h: 90, vx: 55, vy: 0 }],
    shells: [[200, 485], [202, 300], [150, 190]],
    decor: [
      { kind: 'palm', x: 60, y: 300 }, { kind: 'palm', x: 340, y: 360 }, { kind: 'umbrella', x: 70, y: 390 },
      { kind: 'palm', x: 220, y: 14 }, { kind: 'palm', x: 360, y: 622 },
    ],
    nav: [[200, 445], [202, 350], [200, 230]],
  },
  {
    name: 'Duck Pond',
    job: 'herd',
    par: 34,
    movers: [['duck', 70, 560], ['duck', 150, 585], ['duck', 250, 585], ['duck', 330, 560]],
    pool: { x: 290, y: 140, r: 64, escape: 140, kind: 'pond' },
    walls: [
      { x: 40, y: 200, w: 70, h: 50, kind: 'castle', bounce: 0.4 },
      { x: 150, y: 232, w: 150, h: 14, kind: 'fence', bounce: 0.4 },
    ],
    circles: [
      { x: 150, y: 340, r: 20, kind: 'palm', bounce: 0.5 },
      { x: 262, y: 410, r: 20, kind: 'palm', bounce: 0.5 },
    ],
    shells: [[350, 290], [200, 480]],
    decor: [{ kind: 'umbrella', x: 70, y: 90 }, { kind: 'towel', x: 140, y: 100 }, { kind: 'palm', x: 380, y: 620 }],
    nav: [[352, 300], [352, 215], [130, 300], [210, 300]],
  },
  {
    name: 'Big Picnic',
    job: 'shoo',
    shoo: {
      picnic: { x: 200, y: 320, r: 56 }, snacks: 5, duration: 40, gulls: 16, firstAt: 1, quietEnd: 5,
      walkSpeed: 36, flySpeed: 70, flyers: 0.45, sides: ['left', 'right', 'top', 'bottom'], windySnacks: true,
    },
    movers: [],
    walls: [],
    circles: [],
    shells: [],
    decor: [
      { kind: 'umbrella', x: 290, y: 235 }, { kind: 'umbrella', x: 110, y: 410 }, { kind: 'palm', x: 40, y: 60 },
      { kind: 'palm', x: 360, y: 60 }, { kind: 'palm', x: 40, y: 590 }, { kind: 'palm', x: 360, y: 590 },
      { kind: 'towel', x: 320, y: 500 },
    ],
    nav: [],
  },
];
