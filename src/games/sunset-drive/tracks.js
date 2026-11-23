// Sunset Drive stages as plain data. sim.js turns these into road segments.
//
// A stage is a list of sections, driven in order:
//   { len, curve, hill, ...extras }
//     len    segments in the section (a segment is SEG_LEN world units long)
//     curve  how hard the road bends: + right, - left. 2 gentle, 4 firm, 6 tight. Eases in over
//            the first quarter and out over the last quarter.
//     hill   height change across the section, in thousands of world units (+ up, - down).
//            Eases in and out over the whole section, so crests and dips are smooth.
//     boost  true puts a boost pad (with a line of coins after it) early in the section
//     coins  'none' leaves it without a coin run; 'weave' snakes the run across the lanes
//     left / right  scenery set names for this section, overriding the stage's own
//     ground / groundL / groundR  'grass' | 'sand' | 'water' | 'city' | 'marsh' for this section
//     rail   true lines both edges with bridge railings (a bridge section)
//
// traffic: how many slow cars share the road; kinds: which ones, with weights.
// sky / colours: the look, read by draw.js.

const S = (len, o = {}) => ({ len, curve: 0, hill: 0, ...o });
const C = (len, curve, o = {}) => ({ len, curve, hill: 0, ...o });
const H = (len, hill, o = {}) => ({ len, curve: 0, hill, ...o });
const CH = (len, curve, hill, o = {}) => ({ len, curve, hill, ...o });

// Where each scenery kind stands, in road half-widths from the centre line (|x|), and how many
// segments a kind wants to itself before the next thing on the same side.
export const SCENERY = {
  palm: { off: [1.35, 2.4] },
  palmNight: { off: [1.35, 2.4] },
  palmBent: { off: [1.9, 3.0] },
  hotelPink: { off: [1.5, 1.9], room: 7 },
  hotelMint: { off: [1.5, 1.9], room: 7 },
  hotelLemon: { off: [1.5, 1.9], room: 7 },
  hotelLilac: { off: [1.5, 1.9], room: 7 },
  neonFlamingo: { off: [1.3, 1.5], room: 3 },
  neonPalm: { off: [1.3, 1.5], room: 3 },
  neonDiner: { off: [1.3, 1.5], room: 3 },
  lifeguard: { off: [1.6, 2.4], room: 4 },
  umbrella: { off: [1.4, 2.6] },
  flamingo: { off: [1.3, 2.0] },
  billboardSun: { off: [1.4, 1.8], room: 5 },
  billboardIce: { off: [1.4, 1.8], room: 5 },
  billboardKeys: { off: [1.4, 1.8], room: 5 },
  billboardGator: { off: [1.4, 1.8], room: 5 },
  mangrove: { off: [1.4, 3.0] },
  sawgrass: { off: [1.25, 2.6] },
  heron: { off: [1.4, 2.6] },
  gator: { off: [1.3, 1.8], room: 3 },
  airboat: { off: [2.4, 4.2], room: 6 },
  sailboat: { off: [3.0, 7.0], room: 4 },
  island: { off: [4.0, 8.0], room: 10 },
  pelicanPost: { off: [1.5, 2.4], room: 3 },
  tower: { off: [1.5, 2.0], room: 6 },
  towerBlue: { off: [1.5, 2.0], room: 6 },
  lamp: { off: [1.22, 1.22], room: 0 },
  lampNight: { off: [1.22, 1.22], room: 0 },
  sign: { off: [1.3, 1.5], room: 6 },
  shrub: { off: [1.3, 2.4] },
  lighthouse: { off: [3.0, 4.0], room: 20 },
};

// Scenery sets: `every` segments between things on that side (on average), and weighted kinds.
export const SETS = {
  hotels: { every: 6, kinds: [['hotelPink', 3], ['hotelMint', 3], ['hotelLemon', 2], ['hotelLilac', 2], ['palm', 5], ['neonFlamingo', 1], ['neonPalm', 1], ['shrub', 2]] },
  beach: { every: 5, kinds: [['palm', 5], ['umbrella', 4], ['lifeguard', 2], ['flamingo', 2], ['billboardSun', 1]] },
  shore: { every: 5, kinds: [['palm', 4], ['shrub', 3], ['flamingo', 1], ['billboardIce', 1], ['mangrove', 2]] },
  bay: { every: 11, kinds: [['sailboat', 4], ['pelicanPost', 2], ['island', 1]] },
  bridge: { every: 12, kinds: [['sailboat', 3], ['pelicanPost', 1], ['island', 1]] },
  city: { every: 5, kinds: [['towerBlue', 3], ['tower', 3], ['neonDiner', 2], ['neonFlamingo', 2], ['neonPalm', 2], ['palmNight', 3], ['billboardSun', 1], ['billboardIce', 1]] },
  glades: { every: 4, kinds: [['sawgrass', 6], ['mangrove', 3], ['heron', 2], ['gator', 2], ['billboardGator', 1]] },
  canal: { every: 5, kinds: [['airboat', 2], ['gator', 3], ['sawgrass', 3], ['heron', 2], ['mangrove', 2]] },
  keys: { every: 11, kinds: [['sailboat', 4], ['island', 2], ['pelicanPost', 2], ['lighthouse', 1]] },
  key: { every: 4, kinds: [['palm', 6], ['shrub', 2], ['billboardKeys', 1], ['umbrella', 1]] },
  storm: { every: 4, kinds: [['palmBent', 6], ['sign', 1], ['mangrove', 2], ['shrub', 2], ['lifeguard', 1]] },
  none: { every: 0, kinds: [] },
};

// Traffic sizes and speeds: w is width in road half-widths, speed a fraction of MAX_SPEED.
export const TRAFFIC = {
  carPink: { w: 0.44, speed: [0.42, 0.52] },
  carMint: { w: 0.44, speed: [0.42, 0.52] },
  carLemon: { w: 0.44, speed: [0.4, 0.5] },
  carSky: { w: 0.44, speed: [0.42, 0.52] },
  iceCream: { w: 0.5, speed: [0.33, 0.4] },
  scooter: { w: 0.22, speed: [0.36, 0.44] },
  bus: { w: 0.56, speed: [0.28, 0.34] },
};

export const STAGES = [
  {
    name: 'Ocean Drive',
    blurb: 'Sunset on the beach',
    left: 'hotels', right: 'beach', groundL: 'grass', groundR: 'sand',
    traffic: 14,
    kinds: [['carPink', 3], ['carMint', 3], ['carSky', 2], ['iceCream', 2], ['scooter', 2]],
    sky: { top: '#3b1d6e', mid: '#e8507a', low: '#ffb35c', sun: '#ffe27a', sunGlow: '#ff8f5c', far: 'ocean', near: 'deco', cloud: '#ffc0a8', dusk: '#2a1050' },
    colours: {
      road: '#5a4a6e', road2: '#56466a', rumble: '#ffffff', rumble2: '#ff4f8b', lane: '#fff6d6',
      grass: '#3fbf6a', grass2: '#37b060', sand: '#f6d892', sand2: '#eecb7c', fog: '#ffa37a',
    },
    sections: [
      S(70), C(150, 2), S(90, { boost: true }), C(150, -2), S(110, { coins: 'weave' }), C(170, 3),
      S(120), C(150, -2), H(110, 2), H(110, -2, { boost: true }), C(190, 2), S(110, { coins: 'weave' }),
      C(160, -3), S(140), C(170, 2), S(100, { boost: true }), C(160, -2), S(110), C(160, 3), S(150),
      C(140, -2), S(130, { coins: 'weave' }), S(60, { coins: 'none' }),
    ],
  },
  {
    name: 'Causeway',
    blurb: 'Across the bay',
    left: 'shore', right: 'shore', groundL: 'grass', groundR: 'grass',
    traffic: 18,
    kinds: [['carPink', 2], ['carMint', 2], ['carLemon', 2], ['carSky', 2], ['iceCream', 1], ['scooter', 2], ['bus', 1]],
    sky: { top: '#2b6cc4', mid: '#7cc6f0', low: '#ffd59a', sun: '#fff1a8', sunGlow: '#ffc36b', far: 'skyline', near: 'none', cloud: '#ffffff', dusk: '#e0567a' },
    colours: {
      road: '#5d6170', road2: '#585c6b', rumble: '#ffffff', rumble2: '#ff7a3d', lane: '#ffffff',
      grass: '#45c46e', grass2: '#3cb865', sand: '#f3dba0', sand2: '#e9cd8a',
      water: '#2aa6d8', water2: '#259bcc', fog: '#bfe3f2',
    },
    sections: [
      S(80), C(140, 2), S(60, { coins: 'none' }),
      S(130, { rail: true, ground: 'water', left: 'bay', right: 'bay', boost: true }),
      C(170, -2, { rail: true, ground: 'water', left: 'bay', right: 'bay' }),
      H(130, 3.5, { rail: true, ground: 'water', left: 'bridge', right: 'bridge' }),
      H(130, -3.5, { rail: true, ground: 'water', left: 'bridge', right: 'bridge' }),
      C(170, 3, { rail: true, ground: 'water', left: 'bay', right: 'bay' }),
      S(120, { rail: true, ground: 'water', left: 'bay', right: 'bay', coins: 'weave' }),
      S(80, { left: 'shore', right: 'beach', groundR: 'sand' }), C(160, -3, { right: 'beach', groundR: 'sand' }),
      S(70, { coins: 'none' }),
      S(120, { rail: true, ground: 'water', left: 'bay', right: 'bay', boost: true }),
      C(170, 2, { rail: true, ground: 'water', left: 'bay', right: 'bay' }),
      H(130, 3, { rail: true, ground: 'water', left: 'bridge', right: 'bridge' }),
      H(130, -3, { rail: true, ground: 'water', left: 'bridge', right: 'bridge' }),
      C(170, -3, { rail: true, ground: 'water', left: 'bay', right: 'bay' }),
      S(120, { rail: true, ground: 'water', left: 'bay', right: 'bay', coins: 'weave' }),
      S(90), C(160, 2, { boost: true }), S(120, { coins: 'weave' }), C(150, -2),
      S(130, { rail: true, ground: 'water', left: 'bay', right: 'bay' }),
      C(150, 2, { rail: true, ground: 'water', left: 'bay', right: 'bay' }),
      S(90), S(60, { coins: 'none' }),
    ],
  },
  {
    name: 'Neon Nights',
    blurb: 'Downtown after dark',
    left: 'city', right: 'city', groundL: 'city', groundR: 'city',
    traffic: 22,
    kinds: [['carPink', 2], ['carMint', 2], ['carLemon', 2], ['carSky', 2], ['scooter', 2], ['bus', 2], ['iceCream', 1]],
    night: true,
    sky: { top: '#0a0a2e', mid: '#2a1660', low: '#7a2a8a', sun: '#f4f0ff', sunGlow: '#9a6aff', moon: true, stars: true, far: 'city', near: 'none', cloud: '#3a2a70', dusk: '#05051a' },
    colours: {
      road: '#2c2a40', road2: '#2a283c', rumble: '#ff3df0', rumble2: '#30e0ff', lane: '#ffe14d',
      city: '#3a3654', city2: '#35314d', fog: '#3a1d5c',
    },
    sections: [
      S(70), C(140, 3), S(90, { boost: true }), C(150, -3), H(110, 2.5), H(110, -2.5, { coins: 'weave' }),
      C(160, 4), S(100), C(140, -4), S(90, { boost: true }), CH(160, 3, 2), CH(160, -2, -2),
      S(110, { coins: 'weave' }), C(150, -4), S(100), C(150, 4), H(110, 3), H(110, -3, { boost: true }),
      C(150, -3), S(120), C(160, 3), S(150, { coins: 'weave' }), C(150, -4), S(100, { boost: true }),
      CH(160, 4, 2), CH(150, -3, -2), S(60, { coins: 'none' }),
    ],
  },
  {
    name: 'Everglades',
    blurb: 'Gators by the road',
    left: 'glades', right: 'canal', groundL: 'marsh', groundR: 'water',
    traffic: 28,
    kinds: [['carPink', 2], ['carMint', 2], ['carLemon', 2], ['carSky', 2], ['iceCream', 1], ['bus', 2], ['scooter', 1]],
    sky: { top: '#3a8fd6', mid: '#9fd8f0', low: '#fff0b0', sun: '#fff6c8', sunGlow: '#ffd36b', far: 'trees', near: 'none', cloud: '#ffffff', dusk: '#f08a5a' },
    colours: {
      road: '#5b5b5e', road2: '#57575a', rumble: '#ffffff', rumble2: '#ffd23a', lane: '#ffffff',
      marsh: '#7fbf4a', marsh2: '#74b342', water: '#3d8f7a', water2: '#378570', fog: '#d7ecc8',
    },
    sections: [
      S(90), S(200, { boost: true }), C(160, 1), S(220, { coins: 'weave' }), C(160, -1.5), S(220),
      S(160, { boost: true }), C(180, 2), S(220, { coins: 'weave' }), C(160, -2), S(200),
      S(160, { boost: true }), C(160, 1.5), S(220, { coins: 'weave' }), C(150, -1), S(200),
      S(160, { boost: true }), C(170, 2.5), S(200, { coins: 'weave' }), C(150, -2), S(60, { coins: 'none' }),
    ],
  },
  {
    name: 'Overseas Highway',
    blurb: 'Bridges to the Keys',
    left: 'keys', right: 'keys', ground: 'water',
    traffic: 28,
    kinds: [['carPink', 2], ['carMint', 2], ['carLemon', 2], ['carSky', 2], ['iceCream', 2], ['bus', 1], ['scooter', 2]],
    sky: { top: '#5a2d8c', mid: '#ff6f91', low: '#ffc46b', sun: '#ffe68a', sunGlow: '#ff9a6b', far: 'islands', near: 'none', cloud: '#ffd0c0', dusk: '#3a1660' },
    colours: {
      road: '#5f5670', road2: '#5a516b', rumble: '#ffffff', rumble2: '#18c8c0', lane: '#fff6d6',
      water: '#22c7d0', water2: '#1dbac4', sand: '#f8e2a8', sand2: '#f0d48e', grass: '#52c46a', grass2: '#48b862', fog: '#ffb08a',
    },
    sections: [
      S(70, { ground: 'sand', left: 'key', right: 'key' }), C(130, 2, { ground: 'sand', left: 'key', right: 'key' }),
      S(100, { rail: true, boost: true }), H(140, 4, { rail: true }), H(140, -4, { rail: true }),
      C(160, -3, { rail: true }), H(120, 3, { rail: true }), H(120, -3, { rail: true, coins: 'weave' }),
      S(80, { ground: 'sand', left: 'key', right: 'key' }), C(150, 3, { ground: 'sand', left: 'key', right: 'key' }),
      S(60, { ground: 'sand', left: 'key', right: 'key', coins: 'none' }),
      S(120, { rail: true, boost: true }), CH(160, -3, 4, { rail: true }), CH(160, 3, -4, { rail: true }),
      S(160, { rail: true, coins: 'weave' }), H(130, 3.5, { rail: true }), H(130, -3.5, { rail: true }),
      C(150, -4, { rail: true, boost: true }), S(100, { rail: true }),
      S(70, { ground: 'sand', left: 'key', right: 'key' }), C(140, -2, { ground: 'sand', left: 'key', right: 'key' }),
      S(110, { rail: true, boost: true }), H(150, 4.5, { rail: true }), H(150, -4.5, { rail: true }),
      C(150, 3, { rail: true }), S(120, { rail: true, coins: 'weave' }),
      S(80, { ground: 'sand', left: 'key', right: 'key' }), C(150, 3, { ground: 'sand', left: 'key', right: 'key' }),
      S(130, { ground: 'sand', left: 'key', right: 'key', coins: 'weave' }), S(60, { ground: 'sand', left: 'key', right: 'key', coins: 'none' }),
    ],
  },
  {
    name: 'Storm Run',
    blurb: 'Wind, rain and puddles',
    left: 'storm', right: 'storm', groundL: 'grass', groundR: 'grass',
    traffic: 32,
    kinds: [['carPink', 2], ['carMint', 2], ['carLemon', 2], ['carSky', 2], ['bus', 2], ['iceCream', 1], ['scooter', 1]],
    storm: true,
    sky: { top: '#262a44', mid: '#4a4f72', low: '#8a7f9a', sun: '#d8d8e8', sunGlow: '#9a9ab8', far: 'stormSea', near: 'none', cloud: '#5a5f80', dusk: '#151728', hideSun: true },
    colours: {
      road: '#3e4152', road2: '#3a3d4e', rumble: '#ffffff', rumble2: '#ffcc33', lane: '#e8eefc',
      grass: '#3f8a5a', grass2: '#3a8054', sand: '#bfae86', sand2: '#b3a37c', fog: '#7a7f9a',
    },
    sections: [
      S(70), C(140, 4), S(80, { boost: true }), C(150, -5), H(110, 3), H(110, -3), C(150, 5),
      S(110, { coins: 'weave' }), CH(150, -4, 3), CH(150, 4, -3), S(90, { boost: true }), C(140, -6),
      S(90), C(140, 5), H(100, 3.5), H(100, -3.5, { coins: 'weave' }), C(150, -5), S(90, { boost: true }),
      CH(150, 5, 2.5), CH(150, -4, -2.5), C(140, 6), S(100), C(150, -4), S(140, { coins: 'weave' }),
      CH(150, 5, 3), CH(150, -5, -3), S(90, { boost: true }), C(140, -6), S(110, { coins: 'weave' }), C(140, 5),
      S(60, { coins: 'none' }),
    ],
  },
];
