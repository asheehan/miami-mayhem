// The monster part catalogue: body shapes, colours, patterns, eyes, mouths, tops, arms, legs,
// backs and elements, with what each part adds to the four stats. Pure data and lookups; the
// drawing of each part lives in draw-monster.js.
//
// Stats are counted in pips (1 to MAX_PIP): hp (heart), bonk (fist), guard (shield) and zoom
// (lightning). A body gives 8 pips spread over the four stats; within each other category
// every choice adds the same total, so no monster is simply better than another, only
// different (big arms hit harder, wings are faster, a shell guards).

export const STATS = ['hp', 'bonk', 'guard', 'zoom'];
export const MAX_PIP = 8;

// The element ring: sun melts ice, ice freezes the wave, the wave puts out the sun.
export const ELEMENTS = ['sun', 'ice', 'wave'];
export const BEATS = { sun: 'ice', ice: 'wave', wave: 'sun' };
export const ELEMENT_COLOUR = { sun: '#ffb321', ice: '#8fe6ff', wave: '#2f80ff' };
export const SUPER = 1.5; // hitting the element you beat
export const WEAK = 0.7; // hitting the element that beats you

export function elementMult(attacker, defender) {
  if (BEATS[attacker] === defender) return SUPER;
  if (BEATS[defender] === attacker) return WEAK;
  return 1;
}

// 'up', 'down' or null: how an element hit lands, for the arrows on the screen.
export function edge(attacker, defender) {
  const m = elementMult(attacker, defender);
  return m > 1 ? 'up' : m < 1 ? 'down' : null;
}

const s = (hp = 0, bonk = 0, guard = 0, zoom = 0) => ({ hp, bonk, guard, zoom });

// Body outlines are the right half, from the top centre clockwise to the bottom centre, in
// monster units (the monster stands on y = 0 and is about 100 units wide). face: eye height,
// half the gap between two eyes, eye size; mouth height and width; arm: shoulder height.
export const BODIES = [
  {
    id: 'bean', stats: s(2, 2, 2, 2),
    half: [[0, -116], [28, -111], [45, -93], [52, -64], [53, -36], [44, -18], [22, -11], [0, -10]],
    face: { y: -80, gap: 18, r: 1, my: -55, mw: 1 }, arm: -50,
  },
  {
    id: 'ball', stats: s(3, 2, 2, 1),
    half: [[0, -114], [31, -107], [50, -87], [56, -60], [50, -32], [31, -14], [0, -9]],
    face: { y: -76, gap: 19, r: 1.05, my: -50, mw: 1.05 }, arm: -52,
  },
  {
    id: 'pear', stats: s(3, 1, 3, 1),
    half: [[0, -122], [19, -118], [30, -103], [33, -84], [45, -63], [56, -40], [51, -19], [27, -10], [0, -9]],
    face: { y: -98, gap: 13, r: 0.85, my: -79, mw: 0.8 }, arm: -58,
  },
  {
    id: 'egg', stats: s(2, 1, 2, 3),
    half: [[0, -132], [22, -127], [37, -106], [43, -74], [41, -42], [29, -17], [0, -10]],
    face: { y: -100, gap: 15, r: 0.95, my: -75, mw: 0.9 }, arm: -56,
  },
  {
    id: 'loaf', stats: s(2, 2, 3, 1),
    half: [[0, -101], [17, -105], [35, -111], [51, -103], [57, -81], [57, -42], [51, -18], [30, -11], [0, -10]],
    face: { y: -80, gap: 21, r: 1, my: -55, mw: 1.1 }, arm: -55,
  },
  {
    id: 'blob', stats: s(3, 1, 2, 2),
    half: [[0, -115], [30, -109], [47, -88], [52, -58], [55, -27], [51, -12], [42, -19], [34, -9], [24, -17], [12, -10], [0, -15]],
    face: { y: -82, gap: 18, r: 1, my: -57, mw: 1 }, arm: -50,
  },
  {
    id: 'peanut', stats: s(2, 3, 1, 2),
    half: [[0, -127], [24, -122], [35, -104], [29, -85], [41, -71], [53, -47], [47, -21], [25, -10], [0, -9]],
    face: { y: -104, gap: 14, r: 0.9, my: -86, mw: 0.85 }, arm: -56,
  },
  {
    id: 'puff', stats: s(1, 3, 3, 1),
    half: puffHalf(),
    face: { y: -72, gap: 18, r: 1, my: -48, mw: 1 }, arm: -54,
  },
  {
    id: 'toad', stats: s(3, 3, 1, 1),
    half: [[0, -86], [34, -87], [58, -75], [68, -52], [65, -28], [49, -14], [0, -10]],
    face: { y: -72, gap: 25, r: 1, my: -46, mw: 1.35 }, arm: -40,
  },
];

// A puffer: a ball with soft bumps all round.
function puffHalf() {
  const pts = [];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI;
    const r = i % 2 ? 57 : 49;
    pts.push([Math.round(Math.sin(a) * r), Math.round(-62 - Math.cos(a) * r)]);
  }
  pts[0][0] = 0;
  pts[n][0] = 0;
  return pts;
}

// main, belly (lighter), spot (the pattern colour), dark (shading)
export const COLOURS = [
  { id: 'pink', main: '#ff6fb5', belly: '#ffc4e1', spot: '#ffe14d', dark: '#d0458b' },
  { id: 'coral', main: '#ff8466', belly: '#ffd0bf', spot: '#fff0a8', dark: '#d65a3e' },
  { id: 'mango', main: '#ffa83a', belly: '#ffe0a8', spot: '#ff5f8a', dark: '#d97d12' },
  { id: 'lemon', main: '#ffde45', belly: '#fff6bf', spot: '#ff8a3d', dark: '#d6ae12' },
  { id: 'lime', main: '#9fe44c', belly: '#e2ffb8', spot: '#ffe14d', dark: '#6fb42a' },
  { id: 'swamp', main: '#5fae63', belly: '#cdeab0', spot: '#2f7a4a', dark: '#3d8247' },
  { id: 'mint', main: '#4fe3b4', belly: '#c8fff0', spot: '#ff7ab8', dark: '#22b68a' },
  { id: 'teal', main: '#22c6cf', belly: '#b8f6f6', spot: '#ffe14d', dark: '#0e9aa3' },
  { id: 'sky', main: '#62baff', belly: '#d2ecff', spot: '#ffffff', dark: '#3a8ad6' },
  { id: 'blue', main: '#5a73ff', belly: '#cdd5ff', spot: '#7ef0ff', dark: '#3a4fd6' },
  { id: 'grape', main: '#a061ff', belly: '#e2cfff', spot: '#ffd34d', dark: '#7a3fd8' },
  { id: 'lilac', main: '#d69cff', belly: '#f6e6ff', spot: '#7fe0ff', dark: '#ad6fdc' },
  { id: 'berry', main: '#ff4f6d', belly: '#ffc6cf', spot: '#ffffff', dark: '#d02e4c' },
  { id: 'cocoa', main: '#c98b5c', belly: '#f6dcc0', spot: '#7a4a2a', dark: '#9c6338' },
  { id: 'snow', main: '#eef3ff', belly: '#ffffff', spot: '#8fc6ff', dark: '#b9c6e6' },
];

export const PATTERNS = [
  { id: 'plain' }, { id: 'belly' }, { id: 'spots' }, { id: 'stripes' },
  { id: 'freckles' }, { id: 'cap' }, { id: 'tiger' },
];

export const EYES = [
  { id: 'googly' }, { id: 'cyclops' }, { id: 'three' }, { id: 'sleepy' }, { id: 'stalks' },
  { id: 'shades' }, { id: 'sparkle' }, { id: 'grumpy' }, { id: 'mismatch' },
];

export const MOUTHS = [
  { id: 'smile' }, { id: 'grin' }, { id: 'tongue' }, { id: 'oh' }, { id: 'fangs' },
  { id: 'beak' }, { id: 'buck' }, { id: 'wavy' }, { id: 'snout' },
];

export const TOPS = [
  { id: 'none', stats: s(1) },
  { id: 'nubs', stats: s(0, 1) },
  { id: 'ram', stats: s(0, 0, 1) },
  { id: 'antennae', stats: s(0, 0, 0, 1) },
  { id: 'cat', stats: s(0, 0, 0, 1) },
  { id: 'floppy', stats: s(1) },
  { id: 'mohawk', stats: s(0, 1) },
  { id: 'unihorn', stats: s(0, 1) },
  { id: 'sprout', stats: s(1) },
  { id: 'palm', stats: s(0, 0, 1) },
  { id: 'crest', stats: s(0, 0, 0, 1) },
];

export const ARMS = [
  { id: 'none', stats: s(1, 0, 1) },
  { id: 'stubby', stats: s(1, 1) },
  { id: 'muscle', stats: s(0, 2) },
  { id: 'noodle', stats: s(0, 1, 0, 1) },
  { id: 'pincers', stats: s(0, 1, 1) },
  { id: 'tiny', stats: s(0, 0, 0, 2) },
  { id: 'flippers', stats: s(0, 0, 1, 1) },
];

export const LEGS = [
  { id: 'stubby', stats: s(1, 0, 1) },
  { id: 'bigfeet', stats: s(0, 0, 2) },
  { id: 'tentacles', stats: s(1, 1) },
  { id: 'wheels', stats: s(0, 0, 0, 2) },
  { id: 'springs', stats: s(0, 1, 0, 1) },
  { id: 'duck', stats: s(1, 0, 0, 1) },
  { id: 'hover', stats: s(0, 0, 1, 1) },
];

export const BACKS = [
  { id: 'none', stats: s(2) },
  { id: 'wings', stats: s(0, 0, 0, 2) },
  { id: 'batwings', stats: s(0, 1, 0, 1) },
  { id: 'fluffy', stats: s(1, 0, 0, 1) },
  { id: 'spiketail', stats: s(0, 1, 1) },
  { id: 'fishtail', stats: s(0, 0, 1, 1) },
  { id: 'shell', stats: s(0, 0, 2) },
  { id: 'gatortail', stats: s(0, 2) },
];

// The maker's tabs, in order. Each part key maps to its list.
export const PART_KEYS = ['body', 'colour', 'pattern', 'eyes', 'mouth', 'top', 'arms', 'legs', 'back', 'element'];
export const PART_LISTS = {
  body: BODIES,
  colour: COLOURS,
  pattern: PATTERNS,
  eyes: EYES,
  mouth: MOUTHS,
  top: TOPS,
  arms: ARMS,
  legs: LEGS,
  back: BACKS,
  element: ELEMENTS.map((id) => ({ id })),
};

export function partDef(key, id) {
  const list = PART_LISTS[key];
  return (list && list.find((p) => p.id === id)) || (list && list[0]) || null;
}

export const isPart = (key, id) => !!PART_LISTS[key] && PART_LISTS[key].some((p) => p.id === id);

// How many different-looking monsters the maker can build.
export function combinations() {
  return PART_KEYS.reduce((n, k) => n * PART_LISTS[k].length, 1);
}
