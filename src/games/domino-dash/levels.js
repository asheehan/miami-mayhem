// Domino Dash levels. Pure data.
//
// w, h:      the table in world units (x right, y down the screen)
// start:     the start domino { x, y, a } (a in degrees; -90 faces up the table)
// goals:     [{ kind, x, y }] kind: 'popper' | 'bell' | 'rocket' | 'pinata' | 'drum'; all must go off
// obstacles: circles { kind, x, y, r } or boxes { kind, x, y, w, h }; kind: 'cup' | 'cat' |
//            'planter' | 'box'. Dominoes can't stand on them and can't knock through them.
// holes:     gaps between tables [{ x0, y0, x1, y1 }]: nothing stands there, but a domino can
//            topple across a narrow one
// bridges:   planks over a hole [{ x0, y0, x1, y1 }] where dominoes can stand
// gadgets:   splitters { kind: 'split', x, y, a, spread } (one domino in, two out at a +- spread)
//            and carriers { kind: 'ball' | 'car' | 'fan' | 'seesaw' | 'rooster', path: [[x, y]...] }
//            that are set off at the first point and knock over a domino standing at the last
// supply:    dominoes to lay
// par:       dominoes for three stars (sim.twoStar gives the two-star count)
// route:     a way to lay it, line by line (each line starts at an open end); the bot and the
//            tests use it, and the ghost finger on level 1 traces its first line
// teach:     the picture on the level picker
// hint:      show the ghost finger until the first drag
// zoom:      how far the camera closes in on the falling chain (big tables)

const FULL = (y0, y1, w = 520) => ({ x0: 0, y0, x1: w, y1 });

const AUTHORED = [
  {
    name: 'First Clack',
    teach: 'popper',
    hint: true,
    w: 520, h: 640,
    start: { x: 260, y: 500, a: -90 },
    goals: [{ kind: 'popper', x: 260, y: 250 }],
    supply: 24, par: 14,
    route: [[[260, 500], [260, 250]]],
  },
  {
    name: 'Gentle Curve',
    teach: 'bell',
    w: 520, h: 680,
    start: { x: 130, y: 560, a: -90 },
    goals: [{ kind: 'bell', x: 390, y: 190 }],
    supply: 50, par: 29,
    route: [[[130, 560], [130, 430], [175, 320], [270, 240], [390, 190]]],
  },
  {
    name: 'Cafecito',
    teach: 'cup',
    w: 520, h: 700,
    start: { x: 260, y: 600, a: -90 },
    goals: [{ kind: 'pinata', x: 260, y: 160 }],
    obstacles: [{ kind: 'cup', x: 260, y: 390, r: 38 }],
    supply: 48, par: 28,
    route: [[[260, 600], [260, 520], [205, 460], [180, 390], [205, 315], [260, 255], [260, 160]]],
  },
  {
    name: 'Sleepy Cat',
    teach: 'cat',
    w: 520, h: 720,
    start: { x: 420, y: 640, a: -90 },
    goals: [{ kind: 'drum', x: 130, y: 130 }],
    obstacles: [{ kind: 'cat', x: 400, y: 450, r: 55 }, { kind: 'planter', x: 150, y: 310, r: 45 }],
    supply: 62, par: 36,
    route: [[[420, 640], [412, 575], [330, 520], [292, 440], [296, 350], [282, 255], [225, 180], [130, 130]]],
  },
  {
    name: 'Mind the Gap',
    teach: 'bridge',
    w: 520, h: 720,
    start: { x: 110, y: 620, a: -90 },
    goals: [{ kind: 'rocket', x: 400, y: 140 }],
    holes: [FULL(330, 400)],
    bridges: [{ x0: 225, y0: 330, x1: 295, y1: 400 }],
    supply: 60, par: 35,
    route: [[[110, 620], [115, 535], [165, 475], [235, 445], [260, 405], [260, 310], [300, 240], [400, 140]]],
  },
  {
    name: 'Tiny Crack',
    teach: 'crack',
    w: 520, h: 700,
    start: { x: 400, y: 600, a: -90 },
    goals: [{ kind: 'bell', x: 130, y: 140 }],
    holes: [{ x0: 0, y0: 380, x1: 330, y1: 388 }, { x0: 330, y0: 350, x1: 520, y1: 420 }],
    obstacles: [{ kind: 'box', x: 330, y: 230, w: 70, h: 44 }],
    supply: 53, par: 31,
    route: [[[400, 600], [385, 520], [295, 465], [235, 400], [215, 300], [130, 140]]],
  },
  {
    name: 'Rolling Ball',
    teach: 'ball',
    w: 520, h: 720,
    start: { x: 390, y: 620, a: -90 },
    goals: [{ kind: 'popper', x: 390, y: 130 }],
    holes: [FULL(300, 420)],
    gadgets: [{ kind: 'ball', path: [[150, 455], [150, 262]] }],
    supply: 60, par: 35,
    route: [
      [[390, 620], [382, 540], [300, 495], [210, 470], [150, 455]],
      [[150, 262], [150, 205], [240, 150], [390, 130]],
    ],
  },
  {
    name: 'Split!',
    teach: 'split',
    w: 520, h: 720,
    start: { x: 260, y: 640, a: -90 },
    goals: [{ kind: 'popper', x: 110, y: 150 }, { kind: 'bell', x: 410, y: 150 }],
    gadgets: [{ kind: 'split', x: 260, y: 420, a: -90, spread: 40 }],
    supply: 72, par: 42,
    route: [
      [[260, 640], [260, 420]],
      [[245.9, 403.1], [200, 350], [130, 235], [110, 150]],
      [[274.1, 403.1], [320, 350], [390, 235], [410, 150]],
    ],
  },
  {
    name: 'Toy Car',
    teach: 'car',
    w: 520, h: 740,
    start: { x: 110, y: 660, a: -90 },
    goals: [{ kind: 'rocket', x: 150, y: 110 }],
    holes: [FULL(280, 400)],
    obstacles: [{ kind: 'planter', x: 250, y: 580, r: 44 }],
    gadgets: [{ kind: 'car', path: [[390, 445], [390, 240]] }],
    supply: 68, par: 40,
    route: [
      [[110, 660], [112, 560], [170, 490], [280, 455], [390, 445]],
      [[390, 240], [390, 180], [300, 120], [150, 110]],
    ],
  },
  {
    name: 'Seesaw',
    teach: 'seesaw',
    w: 520, h: 740,
    start: { x: 400, y: 660, a: -90 },
    goals: [{ kind: 'pinata', x: 380, y: 120 }],
    holes: [FULL(270, 430)],
    obstacles: [{ kind: 'cup', x: 300, y: 560, r: 30 }],
    gadgets: [{ kind: 'seesaw', path: [[130, 475], [130, 232]] }],
    supply: 65, par: 38,
    route: [
      [[400, 660], [398, 590], [350, 510], [250, 480], [130, 475]],
      [[130, 232], [133, 180], [180, 140], [260, 120], [380, 120]],
    ],
  },
  {
    name: 'Beach Breeze',
    teach: 'fan',
    w: 520, h: 720,
    start: { x: 110, y: 640, a: -90 },
    goals: [{ kind: 'bell', x: 410, y: 590 }],
    holes: [{ x0: 225, y0: 0, x1: 300, y1: 720 }],
    obstacles: [{ kind: 'cup', x: 420, y: 160, r: 30 }],
    gadgets: [{ kind: 'fan', path: [[185, 300], [340, 300]] }],
    supply: 65, par: 38,
    route: [
      [[110, 640], [110, 430], [135, 350], [185, 300]],
      [[340, 300], [400, 305], [438, 360], [440, 480], [410, 590]],
    ],
  },
  {
    name: 'Rooster Hop',
    teach: 'rooster',
    w: 520, h: 740,
    start: { x: 420, y: 660, a: -90 },
    goals: [{ kind: 'drum', x: 110, y: 110 }],
    holes: [FULL(300, 410)],
    obstacles: [{ kind: 'cat', x: 140, y: 560, r: 50 }, { kind: 'planter', x: 150, y: 210, r: 38 }],
    gadgets: [{ kind: 'rooster', path: [[260, 450], [260, 262]] }],
    supply: 51, par: 30,
    route: [
      [[420, 660], [410, 565], [340, 495], [260, 450]],
      [[260, 262], [268, 175], [220, 115], [110, 110]],
    ],
  },
  {
    name: 'Three Cheers',
    teach: 'three',
    w: 520, h: 760,
    start: { x: 260, y: 680, a: -90 },
    goals: [{ kind: 'popper', x: 90, y: 160 }, { kind: 'bell', x: 260, y: 150 }, { kind: 'rocket', x: 460, y: 170 }],
    gadgets: [
      { kind: 'split', x: 260, y: 500, a: -90, spread: 45 },
      { kind: 'split', x: 370, y: 350, a: -70, spread: 35 },
    ],
    supply: 94, par: 55,
    route: [
      [[260, 680], [260, 500]],
      [[244.4, 484.4], [190, 430], [110, 330], [90, 160]],
      [[275.6, 484.4], [330, 430], [370, 350]],
      [[364.3, 328.75], [340, 240], [260, 150]],
      [[388.0, 337.4], [430, 300], [460, 240], [460, 170]],
    ],
  },
  {
    name: 'Long Table',
    teach: 'long',
    zoom: 1.35,
    w: 520, h: 1000,
    start: { x: 420, y: 930, a: -90 },
    goals: [{ kind: 'rocket', x: 150, y: 90 }],
    holes: [FULL(500, 580), FULL(200, 270)],
    obstacles: [
      { kind: 'cup', x: 420, y: 800, r: 30 },
      { kind: 'cat', x: 250, y: 700, r: 50 },
      { kind: 'planter', x: 300, y: 390, r: 42 },
    ],
    gadgets: [
      { kind: 'ball', path: [[130, 620], [130, 462]] },
      { kind: 'car', path: [[400, 320], [400, 160]] },
    ],
    supply: 104, par: 61,
    route: [
      [[420, 930], [418, 870], [360, 825], [342, 760], [338, 700], [305, 650], [240, 625], [130, 620]],
      [[130, 462], [135, 405], [200, 360], [240, 315], [320, 305], [400, 320]],
      [[400, 160], [398, 122], [365, 96], [290, 88], [150, 90]],
    ],
  },
  {
    name: 'Grand Finale',
    teach: 'star',
    zoom: 1.35,
    w: 520, h: 1000,
    start: { x: 260, y: 930, a: -90 },
    goals: [{ kind: 'popper', x: 130, y: 110 }, { kind: 'bell', x: 260, y: 150 }, { kind: 'pinata', x: 470, y: 130 }],
    holes: [FULL(470, 560)],
    obstacles: [{ kind: 'cup', x: 260, y: 620, r: 30 }, { kind: 'cat', x: 250, y: 330, r: 45 }],
    gadgets: [
      { kind: 'split', x: 260, y: 780, a: -90, spread: 40 },
      { kind: 'fan', path: [[110, 600], [110, 430]] },
      { kind: 'rooster', path: [[410, 600], [410, 430]] },
      { kind: 'split', x: 410, y: 330, a: -90, spread: 40 },
    ],
    supply: 113, par: 66,
    route: [
      [[260, 930], [260, 780]],
      [[245.9, 763.1], [200, 700], [130, 640], [110, 600]],
      [[274.1, 763.1], [320, 700], [390, 640], [410, 600]],
      [[110, 430], [110, 300], [125, 180], [130, 110]],
      [[410, 430], [410, 330]],
      [[395.9, 313.1], [350, 250], [270, 160]],
      [[424.1, 313.1], [460, 250], [470, 130]],
    ],
  },
];

// Levels are written on a 520-wide grid and shrunk to the size the dominoes are built for,
// so the dominoes show up big on the screen.
export const LEVEL_SCALE = 0.58;

export function scaleLevel(def, k) {
  const p = ([x, y]) => [+(x * k).toFixed(1), +(y * k).toFixed(1)];
  const r = (o) => ({ ...o, x0: o.x0 * k, y0: o.y0 * k, x1: o.x1 * k, y1: o.y1 * k });
  const out = { ...def, w: Math.round(def.w * k), h: Math.round(def.h * k) };
  out.start = { ...def.start, x: def.start.x * k, y: def.start.y * k };
  out.goals = (def.goals || []).map((g) => ({ ...g, x: g.x * k, y: g.y * k }));
  out.obstacles = (def.obstacles || []).map((o) => ({
    ...o, x: o.x * k, y: o.y * k, ...(o.r ? { r: o.r * k } : { w: o.w * k, h: o.h * k }),
  }));
  out.holes = (def.holes || []).map(r);
  out.bridges = (def.bridges || []).map(r);
  out.gadgets = (def.gadgets || []).map((g) => (g.path ? { ...g, path: g.path.map(p) } : { ...g, x: g.x * k, y: g.y * k }));
  if (def.route) out.route = def.route.map((l) => l.map(p));
  return out;
}

export const LEVELS = AUTHORED.map((L) => scaleLevel(L, LEVEL_SCALE));

// The free-play table: big, empty, lots of dominoes, goals to drop in from the tray.
export const FREE = {
  name: 'Free Play',
  free: true,
  zoom: 1.6,
  w: 480, h: 680,
  start: { x: 240, y: 620, a: -90 },
  goals: [],
  obstacles: [{ kind: 'planter', x: 50, y: 50, r: 28 }, { kind: 'cup', x: 435, y: 55, r: 22 }],
  supply: 150,
};
