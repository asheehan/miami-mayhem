// The map: zones in the order they unlock, the wild species living in each (built from the same
// parts as the maker), and how a wild battle is put together. Pure.
import { newMonster } from './monster.js';
import { PART_KEYS } from './parts.js';
import { makeRng, pick, randInt, hashString } from './rng.js';

// Zone: id, wild levels, boss level, how much wild monsters have trained (they keep up with
// a team that trains between zones), how hard they hit (the first zones go easy) and where
// the zone sits on the map (0..1 across and down).
export const ZONES = [
  { id: 'beach', levels: [1, 2], boss: 3, train: 0, fierce: 0.65, map: [0.2, 0.9] },
  { id: 'swamp', levels: [3, 5], boss: 6, train: 0, fierce: 0.85, map: [0.74, 0.75] },
  { id: 'roofs', levels: [6, 8], boss: 9, train: 1, fierce: 1, map: [0.24, 0.6] },
  { id: 'reef', levels: [9, 11], boss: 12, train: 1, fierce: 1.1, map: [0.78, 0.45] },
  { id: 'factory', levels: [12, 14], boss: 15, train: 2, fierce: 1.2, map: [0.22, 0.3] },
  { id: 'golf', levels: [15, 17], boss: 18, train: 2, fierce: 1.3, map: [0.74, 0.15] },
  { id: 'storm', levels: [18, 20], boss: 22, train: 3, fierce: 1.4, map: [0.3, 0.0] },
];

export const BOSS_WINS = 4; // wild wins in a zone before its boss will battle

// [id, name, rarity, body, colour, pattern, eyes, mouth, top, arms, legs, back, element]
const RAW = {
  beach: [
    ['sandbun', 'Sandbun', 'common', 'bean', 'lemon', 'freckles', 'googly', 'smile', 'none', 'stubby', 'stubby', 'none', 'sun'],
    ['crabbo', 'Crabbo', 'common', 'loaf', 'coral', 'belly', 'stalks', 'grin', 'none', 'pincers', 'stubby', 'none', 'wave'],
    ['flopsicle', 'Flopsicle', 'common', 'egg', 'pink', 'stripes', 'sleepy', 'tongue', 'none', 'tiny', 'hover', 'none', 'ice'],
    ['shellby', 'Shellby', 'common', 'ball', 'mint', 'belly', 'sparkle', 'smile', 'antennae', 'none', 'stubby', 'shell', 'wave'],
    ['gullup', 'Gullup', 'common', 'pear', 'snow', 'plain', 'googly', 'beak', 'crest', 'tiny', 'duck', 'wings', 'wave'],
    ['sunnyflop', 'Sunnyflop', 'rare', 'puff', 'mango', 'spots', 'shades', 'grin', 'palm', 'noodle', 'springs', 'none', 'sun'],
    ['bigtoasty', 'Big Toasty', 'boss', 'loaf', 'mango', 'cap', 'shades', 'grin', 'mohawk', 'muscle', 'bigfeet', 'spiketail', 'sun'],
  ],
  swamp: [
    ['chompo', 'Chompo', 'common', 'toad', 'swamp', 'spots', 'sleepy', 'snout', 'nubs', 'tiny', 'stubby', 'gatortail', 'wave'],
    ['froggle', 'Froggle', 'common', 'toad', 'lime', 'spots', 'googly', 'wavy', 'none', 'noodle', 'springs', 'none', 'wave'],
    ['mossmop', 'Mossmop', 'common', 'blob', 'swamp', 'freckles', 'sleepy', 'oh', 'sprout', 'none', 'tentacles', 'none', 'sun'],
    ['bzzbo', 'Bzzbo', 'common', 'egg', 'grape', 'stripes', 'three', 'fangs', 'antennae', 'tiny', 'hover', 'batwings', 'ice'],
    ['turtlebun', 'Turtlebun', 'common', 'ball', 'lime', 'belly', 'sparkle', 'smile', 'none', 'flippers', 'stubby', 'shell', 'wave'],
    ['glowbug', 'Glowbug', 'rare', 'peanut', 'lemon', 'belly', 'sparkle', 'smile', 'antennae', 'noodle', 'hover', 'wings', 'sun'],
    ['grannygator', 'Granny Gator', 'boss', 'toad', 'swamp', 'tiger', 'grumpy', 'snout', 'ram', 'muscle', 'bigfeet', 'gatortail', 'wave'],
  ],
  roofs: [
    ['neonoodle', 'Neonoodle', 'common', 'egg', 'pink', 'stripes', 'shades', 'grin', 'antennae', 'noodle', 'wheels', 'none', 'sun'],
    ['pigeonk', 'Pigeonk', 'common', 'pear', 'blue', 'plain', 'googly', 'beak', 'crest', 'tiny', 'duck', 'wings', 'wave'],
    ['trashbo', 'Trashbo', 'common', 'peanut', 'lilac', 'freckles', 'mismatch', 'buck', 'cat', 'stubby', 'wheels', 'fluffy', 'ice'],
    ['bloopy', 'Bloopy', 'common', 'blob', 'teal', 'spots', 'cyclops', 'oh', 'none', 'none', 'hover', 'none', 'wave'],
    ['skaterboo', 'Skaterboo', 'common', 'bean', 'grape', 'cap', 'shades', 'tongue', 'mohawk', 'noodle', 'wheels', 'none', 'ice'],
    ['discopuff', 'Disco Puff', 'rare', 'puff', 'lilac', 'spots', 'sparkle', 'grin', 'unihorn', 'tiny', 'hover', 'batwings', 'ice'],
    ['meganeon', 'Mega Neon', 'boss', 'loaf', 'grape', 'stripes', 'shades', 'fangs', 'unihorn', 'muscle', 'wheels', 'batwings', 'ice'],
  ],
  reef: [
    ['coralina', 'Coralina', 'common', 'puff', 'coral', 'spots', 'sparkle', 'smile', 'sprout', 'flippers', 'tentacles', 'none', 'wave'],
    ['jellywob', 'Jellywob', 'common', 'blob', 'lilac', 'belly', 'sleepy', 'oh', 'antennae', 'none', 'tentacles', 'none', 'ice'],
    ['puffpuff', 'Puffpuff', 'common', 'puff', 'lemon', 'spots', 'googly', 'oh', 'none', 'flippers', 'hover', 'fishtail', 'wave'],
    ['squidlet', 'Squidlet', 'common', 'egg', 'pink', 'freckles', 'googly', 'wavy', 'none', 'none', 'tentacles', 'none', 'ice'],
    ['seahorsey', 'Seahorsey', 'common', 'peanut', 'mango', 'stripes', 'sparkle', 'beak', 'crest', 'tiny', 'hover', 'fishtail', 'sun'],
    ['pearlo', 'Pearlo', 'rare', 'ball', 'snow', 'belly', 'sparkle', 'smile', 'none', 'pincers', 'stubby', 'shell', 'ice'],
    ['captentacle', 'Cap Tentacle', 'boss', 'ball', 'berry', 'spots', 'cyclops', 'grin', 'ram', 'pincers', 'tentacles', 'shell', 'wave'],
  ],
  factory: [
    ['brrrito', 'Brrrito', 'common', 'loaf', 'snow', 'freckles', 'sleepy', 'buck', 'cat', 'stubby', 'bigfeet', 'fluffy', 'ice'],
    ['slushy', 'Slushy', 'common', 'blob', 'sky', 'cap', 'googly', 'tongue', 'none', 'noodle', 'hover', 'none', 'ice'],
    ['conehead', 'Conehead', 'common', 'egg', 'pink', 'stripes', 'mismatch', 'smile', 'unihorn', 'tiny', 'wheels', 'none', 'ice'],
    ['frostbun', 'Frostbun', 'common', 'bean', 'snow', 'spots', 'sparkle', 'fangs', 'floppy', 'stubby', 'duck', 'fluffy', 'ice'],
    ['steamy', 'Steamy', 'common', 'ball', 'coral', 'cap', 'grumpy', 'oh', 'antennae', 'muscle', 'wheels', 'none', 'sun'],
    ['polarpop', 'Polar Pop', 'rare', 'toad', 'sky', 'belly', 'shades', 'grin', 'floppy', 'flippers', 'bigfeet', 'none', 'wave'],
    ['yetisupreme', 'Yeti Supreme', 'boss', 'pear', 'snow', 'belly', 'grumpy', 'fangs', 'ram', 'muscle', 'bigfeet', 'fluffy', 'ice'],
  ],
  golf: [
    ['magmo', 'Magmo', 'common', 'blob', 'mango', 'spots', 'grumpy', 'grin', 'none', 'stubby', 'stubby', 'none', 'sun'],
    ['puttbug', 'Puttbug', 'common', 'ball', 'lime', 'plain', 'googly', 'smile', 'antennae', 'tiny', 'wheels', 'wings', 'sun'],
    ['flamingolf', 'Flamingolf', 'common', 'pear', 'pink', 'plain', 'sparkle', 'beak', 'crest', 'noodle', 'springs', 'wings', 'wave'],
    ['cinderpuff', 'Cinderpuff', 'common', 'puff', 'berry', 'tiger', 'three', 'fangs', 'mohawk', 'pincers', 'hover', 'none', 'sun'],
    ['holymoly', 'Holy Moly', 'common', 'peanut', 'cocoa', 'freckles', 'sleepy', 'buck', 'cat', 'muscle', 'stubby', 'fluffy', 'wave'],
    ['lavalamp', 'Lava Lamp', 'rare', 'egg', 'grape', 'stripes', 'cyclops', 'oh', 'none', 'none', 'hover', 'batwings', 'sun'],
    ['volcanoggin', 'Volcanoggin', 'boss', 'toad', 'berry', 'cap', 'grumpy', 'fangs', 'mohawk', 'muscle', 'bigfeet', 'spiketail', 'sun'],
  ],
  storm: [
    ['thundum', 'Thundum', 'common', 'bean', 'blue', 'tiger', 'grumpy', 'grin', 'antennae', 'muscle', 'stubby', 'batwings', 'wave'],
    ['cloudle', 'Cloudle', 'common', 'puff', 'snow', 'plain', 'sleepy', 'smile', 'none', 'tiny', 'hover', 'wings', 'ice'],
    ['drizzlop', 'Drizzlop', 'common', 'blob', 'sky', 'spots', 'googly', 'wavy', 'sprout', 'noodle', 'tentacles', 'none', 'wave'],
    ['whirlybop', 'Whirlybop', 'common', 'egg', 'teal', 'stripes', 'three', 'oh', 'unihorn', 'flippers', 'wheels', 'wings', 'ice'],
    ['hailbonk', 'Hailbonk', 'common', 'loaf', 'lilac', 'freckles', 'mismatch', 'fangs', 'ram', 'pincers', 'bigfeet', 'shell', 'ice'],
    ['rainbowl', 'Rainbowl', 'rare', 'ball', 'lemon', 'stripes', 'sparkle', 'grin', 'crest', 'stubby', 'hover', 'wings', 'sun'],
    ['hurricanehank', 'Hurricane Hank', 'boss', 'peanut', 'blue', 'tiger', 'shades', 'grin', 'unihorn', 'muscle', 'wheels', 'wings', 'wave'],
  ],
};

// Every species: { id, name, zone (index), rarity, parts }
export const SPECIES = [];
ZONES.forEach((z, zi) => {
  for (const r of RAW[z.id]) {
    const parts = {};
    PART_KEYS.forEach((k, i) => { parts[k] = r[3 + i]; });
    SPECIES.push({ id: r[0], name: r[1], zone: zi, rarity: r[2], parts });
  }
});
export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
export const speciesIn = (zi) => SPECIES.filter((s) => s.zone === zi);
export const bossOf = (zi) => SPECIES.find((s) => s.zone === zi && s.rarity === 'boss');

// How a species looks when wild: rares are already evolved once, bosses twice.
const STAGE = { common: 0, rare: 1, boss: 2 };

// A wild monster of a species at a level (with the zone's training and move levels).
export function wildMonster(sp, lv, uid = 0) {
  const z = ZONES[sp.zone];
  const t = z.train;
  const mlv = Math.min(3, 1 + Math.floor(sp.zone / 2));
  const m = newMonster({
    uid,
    sp: sp.id,
    parts: sp.parts,
    name: sp.name,
    seed: hashString(sp.id) || 1,
    lv,
    stage: STAGE[sp.rarity] || 0,
    train: { hp: t, bonk: t, guard: t, zoom: t },
    moves: { bonk: mlv, blast: mlv, bubble: sp.zone >= 1 ? 1 : 0, special: sp.rarity === 'boss' ? mlv : 0 },
  });
  return m;
}

// A random wild battle in a zone: 1 to 3 monsters. The very first battle is one easy monster.
// wins: battles already won in this zone.
export function encounter(zi, seed, wins = 0) {
  const rng = makeRng(seed);
  const z = ZONES[zi];
  const commons = speciesIn(zi).filter((s) => s.rarity === 'common');
  const rare = speciesIn(zi).find((s) => s.rarity === 'rare');
  let n;
  if (zi === 0) n = wins < 1 ? 1 : rng() < 0.6 ? 1 : 2;
  else if (zi < 3) n = rng() < 0.3 ? 1 : rng() < 0.8 ? 2 : 3;
  else n = rng() < 0.15 ? 1 : rng() < 0.6 ? 2 : 3;
  const foes = [];
  for (let i = 0; i < n; i++) {
    const sp = rare && wins > 0 && rng() < 0.12 ? rare : pick(rng, commons);
    let lv = randInt(rng, z.levels[0], z.levels[1]);
    if (zi === 0 && wins < 1) lv = 1;
    if (n === 3) lv = Math.max(z.levels[0], lv - 1); // three at once are a little smaller
    foes.push(wildMonster(sp, lv, i + 1));
  }
  return foes;
}

// The boss battle: the boss and (after the first zone) one or two helpers.
export function bossBattle(zi, seed) {
  const rng = makeRng(seed);
  const z = ZONES[zi];
  const commons = speciesIn(zi).filter((s) => s.rarity === 'common');
  const foes = [wildMonster(bossOf(zi), z.boss, 1)];
  const helpers = zi === 0 ? 0 : zi < 4 ? 1 : 2;
  for (let i = 0; i < helpers; i++) foes.push(wildMonster(pick(rng, commons), z.levels[0], i + 2));
  return foes;
}
