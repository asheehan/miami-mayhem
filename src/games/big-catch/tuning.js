// Big Catch tuning: every number worth changing by feel lives here.
// World units: x runs 0..FIELD_W across the screen (the screen is always FIELD_W wide),
// y is depth in metres, 0 at the sea surface and MAX_DEPTH at the sea bed.

// ---------- the world ----------
export const FIELD_W = 56; // world units across the screen; smaller = bigger fish on screen
export const MAX_DEPTH = 400; // the sea bed, where the treasure chest sits
export const TURN_MARGIN = 7; // creatures swim this far off either edge before turning back
export const ROW_START = 12; // the first row of creatures below the surface

// ---------- the hook ----------
export const HOOK_R = 1.2; // the hook's own hit radius
export const HOOK_MIN_X = 3; // the hook stays inside [HOOK_MIN_X, FIELD_W - HOOK_MIN_X]
export const STEER_GAIN = 9; // per second: how quickly the hook closes the gap to the finger
export const STEER_MAX = 45; // units/s: the hook's top sideways speed
export const CAST_TIME = 0.9; // seconds the cast takes before the hook starts to sink
export const SINK_SPEED = 14; // units/s on the way down
export const TURN_TIME = 0.7; // seconds the hook pauses at the bottom before reeling up
export const REEL_SPEED = 16; // units/s on the way up
export const REEL_MIN_TIME = 4.5; // but a short reel slows down so it always lasts at least this long
export const FULL_REEL_SPEED = 34; // units/s once the bucket is full (nothing left to catch)

// ---------- touching things ----------
export const DODGE_SCALE = 0.8; // on the way down creatures count as this much of their size (forgiving)
export const CATCH_PAD = 1.6; // on the way up fish are caught this much further out (generous)
export const HAZARD_SCALE = 0.75; // junk, stingers and blockers on the way up count as this much of their size
export const ZAP_SAFE = 1.3; // seconds after a sting before another one can happen
export const BONK_PUSH = 9; // units a blocker shoves the hook aside on the way up
export const FLEE_TIME = 1.6; // seconds a startled or freed creature dashes away
export const FLEE_MULT = 3; // and how much faster it swims while it does

// ---------- the line, bucket and lure (the three upgrades) ----------
// LINE[level] is how deep the hook can go. The last one reaches the sea bed.
export const LINE = [35, 55, 80, 110, 145, 185, 230, 280, 335, MAX_DEPTH];
// BUCKET[level] is how many things fit on the line.
export const BUCKET = [3, 4, 5, 6, 7, 8, 10, 12];
// LURE[level]: the lucky lure glows on the way up and pulls fish in from this much further away.
// (It only reaches fish; junk and stingers are not attracted.)
export const LURE = [0, 1.5, 3, 4.5, 6, 8];
// PRICES[kind][level] is the cost in sand dollars to go from `level` to `level + 1`.
export const PRICES = {
  line: [10, 20, 35, 55, 85, 125, 170, 230, 300],
  bucket: [12, 25, 45, 70, 100, 140, 190],
  lure: [18, 35, 60, 100, 150],
};

// ---------- money ----------
export const DEPTH_BONUS = 0.12; // sand dollars per metre of the deepest point reached
export const MIN_BONUS = 2; // a trip always pays at least this, even with nothing caught
export const CHEST_VALUE = 400; // the treasure chest on the sea bed

// ---------- the haul (cosmetic timing, kept in the sim so tests can step through it) ----------
export const HAUL_LEAD = 0.6; // seconds at the surface before the first fish flies out
export const HAUL_GAP_MAX = 0.6; // seconds between fish when there are few
export const HAUL_GAP_MIN = 0.28; // and when there are many
export const HAUL_SPREAD = 4.2; // total seconds the fish try to fit into
export const HAUL_FLY = 0.75; // seconds a fish spends in the air
export const HAUL_TAIL = 1.1; // seconds after the last one lands (the depth bonus) before it is done

// ---------- depth zones ----------
// rowGap: metres between rows of creatures. dropFill: chance a row has a creature on the way
// down. reelFill: chance of a fresh arrival in each gap between rows on the way up.
// pair: chance a filled row has two creatures. speed: multiplies every creature's speed.
export const ZONES = [
  { id: 'shallows', name: 'Sunny Shallows', top: 0, bottom: 50, rowGap: 11, dropFill: 0.4, reelFill: 0.9, pair: 0, speed: 0.85, colour: '#3fd8e6' },
  { id: 'reef', name: 'Coral Reef', top: 50, bottom: 130, rowGap: 11, dropFill: 0.55, reelFill: 0.65, pair: 0.1, speed: 1, colour: '#1a9fc9' },
  { id: 'twilight', name: 'Kelp & Wreck', top: 130, bottom: 250, rowGap: 12, dropFill: 0.55, reelFill: 0.55, pair: 0.12, speed: 1.05, colour: '#1f5f99' },
  { id: 'deep', name: 'Deep Dark', top: 250, bottom: MAX_DEPTH, rowGap: 13, dropFill: 0.6, reelFill: 0.6, pair: 0.12, speed: 1, colour: '#1a1d4d' },
];

// The very first trip: barely anything on the way down, lots of fish and no nasties on the way up.
// reelGap: metres between fresh arrivals on the first trip's way up (tighter than usual);
// pair: chance each of those rows has two fish.
export const FIRST_TRIP = { dropFill: 0.12, reelFill: 1, reelGap: 5, pair: 1, hazards: 0 };
// On the way up, the chance of junk, stingers and blockers among fresh arrivals is multiplied by this.
export const REEL_HAZARDS = 0.5;

// ---------- creatures ----------
// kind: 'fish' (caught on the way up, in the album), 'junk' (takes a bucket slot, worth nothing),
// 'zap' (stings: you drop `loses` fish), 'blocker' (just in the way: bonks the hook aside).
// zones: where it lives (minDepth narrows that further). weight: how common it is there.
// value: sand dollars. rx, ry: half length and half height. speed: [slowest, fastest] units/s.
export const SPECIES = [
  { id: 'sergeant', name: 'Sergeant Major', kind: 'fish', zones: ['shallows'], weight: 5, value: 1, rx: 3.1, ry: 2.3, speed: [5, 8] },
  { id: 'snapper', name: 'Snapper', kind: 'fish', zones: ['shallows', 'reef'], weight: 4, value: 2, rx: 3.7, ry: 2.4, speed: [5, 8] },
  { id: 'parrot', name: 'Parrotfish', kind: 'fish', zones: ['shallows', 'reef'], weight: 2.5, value: 4, rx: 4.2, ry: 2.7, speed: [4, 7] },
  { id: 'angel', name: 'Angelfish', kind: 'fish', zones: ['reef'], weight: 4, value: 6, rx: 3.2, ry: 3.6, speed: [3, 6] },
  { id: 'hogfish', name: 'Hogfish', kind: 'fish', zones: ['reef'], weight: 3, value: 8, rx: 4.3, ry: 3, speed: [4, 6] },
  { id: 'grouper', name: 'Grouper', kind: 'fish', zones: ['reef', 'twilight'], weight: 2, value: 12, rx: 5.4, ry: 3.6, speed: [2.5, 4.5] },
  { id: 'barracuda', name: 'Barracuda', kind: 'fish', zones: ['reef', 'twilight'], weight: 1.4, value: 15, rx: 6.4, ry: 1.7, speed: [9, 13], minDepth: 80 },
  { id: 'octopus', name: 'Octopus', kind: 'fish', zones: ['twilight'], weight: 3, value: 18, rx: 3.6, ry: 3.8, speed: [3, 5] },
  { id: 'tarpon', name: 'Tarpon', kind: 'fish', zones: ['twilight'], weight: 2.5, value: 20, rx: 5.6, ry: 2.6, speed: [6, 9] },
  { id: 'moray', name: 'Moray Eel', kind: 'fish', zones: ['twilight'], weight: 2, value: 24, rx: 6.4, ry: 1.6, speed: [4, 6] },
  { id: 'swordfish', name: 'Swordfish', kind: 'fish', zones: ['twilight', 'deep'], weight: 1.2, value: 32, rx: 7.4, ry: 2.4, speed: [9, 12], minDepth: 190 },
  { id: 'lantern', name: 'Lanternfish', kind: 'fish', zones: ['deep'], weight: 4, value: 26, rx: 2.9, ry: 1.9, speed: [6, 9] },
  { id: 'viper', name: 'Viperfish', kind: 'fish', zones: ['deep'], weight: 3, value: 32, rx: 3.9, ry: 2.1, speed: [5, 8] },
  { id: 'blobfish', name: 'Blobfish', kind: 'fish', zones: ['deep'], weight: 2, value: 38, rx: 3.6, ry: 3, speed: [1.5, 3] },
  { id: 'angler', name: 'Anglerfish', kind: 'fish', zones: ['deep'], weight: 2, value: 48, rx: 4.2, ry: 3.6, speed: [2, 4], minDepth: 300 },
  { id: 'squid', name: 'Giant Squid', kind: 'fish', zones: ['deep'], weight: 0.8, value: 150, rx: 8.5, ry: 3.4, speed: [3, 5], minDepth: 345, legendary: true },
  { id: 'boot', name: 'Old Boot', kind: 'junk', zones: ['shallows', 'reef', 'twilight'], weight: 0.8, value: 0, rx: 2.6, ry: 2.6, speed: [0.8, 1.6] },
  { id: 'can', name: 'Tin Can', kind: 'junk', zones: ['shallows', 'reef'], weight: 0.8, value: 0, rx: 2, ry: 2.4, speed: [0.8, 1.6] },
  { id: 'jelly', name: 'Jellyfish', kind: 'zap', zones: ['shallows', 'reef', 'twilight', 'deep'], weight: 1, value: 0, rx: 2.8, ry: 3.2, speed: [1.5, 3], loses: 1 },
  { id: 'puffer', name: 'Pufferfish', kind: 'zap', zones: ['reef', 'twilight'], weight: 1, value: 0, rx: 3, ry: 3, speed: [2, 4], loses: 2 },
  { id: 'turtle', name: 'Sea Turtle', kind: 'blocker', zones: ['shallows', 'reef'], weight: 0.6, value: 0, rx: 6, ry: 3.6, speed: [3, 5] },
  { id: 'manatee', name: 'Manatee', kind: 'blocker', zones: ['shallows', 'reef'], weight: 0.4, value: 0, rx: 8.5, ry: 4, speed: [1.5, 3], minDepth: 25 },
];

// The fish album, in order (shallowest first, the legend last).
export const ALBUM = SPECIES.filter((s) => s.kind === 'fish').map((s) => s.id);
export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
