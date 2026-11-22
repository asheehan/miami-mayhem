// Bridge Boss tuning: the world's shape, every vehicle type and every level.
// All the numbers worth tuning by feel live here. Distances are world units (the world is
// WORLD_W wide and WORLD_H tall; a plain car is 9 units long), times are seconds and speeds
// are units per second.

// ---------- the world ----------

export const WORLD_W = 100;
export const WORLD_H = 160;
export const CHANNEL_X0 = 36; // the channel's banks; boats run up and down between them
export const CHANNEL_X1 = 64;
export const ROAD_HALF = 8; // half the road's width; each road has one lane each way
export const ROAD_Y_ONE = 84; // where the road crosses on one-bridge levels
export const ROAD_Y_TWO = [46, 118]; // where the two roads cross on two-bridge levels
export const CAR_LANE_OFFSET = 4; // eastbound cars drive this far below the road's middle, westbound above
export const BOAT_LANE_OFFSET = 6.5; // northbound boats run this far right of the channel's middle, southbound left
export const OFFSCREEN = 45; // vehicles appear this far beyond the world's edge, out of sight

// ---------- the bridge ----------

export const BRIDGE_TIME = 0.6; // seconds for the bridge to open or close
export const TOGGLE_DEBOUNCE = 0.25; // taps this soon after a toggle are ignored (a double tap is not a reverse)
export const SPAN_MARGIN = 1; // the span is this much longer than the channel is wide, each end
export const UNDER_MARGIN = 1; // boats count as under the bridge this far either side of the road
export const STOP_GAP = 1.5; // vehicles stop this far short of the span (or of the water under it)

// ---------- driving ----------

export const GAP = 2.5; // bumper-to-bumper gap kept in a queue
export const BRAKE = 30; // how hard vehicles slow down (units/s²); braking curves keep queues tidy

// How quickly patience fills for a vehicle stuck behind another one, compared with the one
// at the front of the queue (which fills at 1). A long queue gets grumpy faster.
export const QUEUE_PATIENCE_RATE = 0.3;
export const HEARTS = 3;

// ---------- vehicles ----------
// speed and patience multiply the level's carSpeed/boatSpeed and carPatience/boatPatience,
// unless patienceSeconds is given (an ambulance or speedboat is impatient on every level).
// len and width are the vehicle's size in world units; accel is how fast it pulls away.
export const TYPES = {
  car: { kind: 'road', len: 9, width: 6, speed: 1, accel: 18, patience: 1 },
  bus: { kind: 'road', len: 17, width: 6.6, speed: 0.6, accel: 8, patience: 1.1 },
  truck: { kind: 'road', len: 15, width: 6.6, speed: 0.65, accel: 8, patience: 1.1 },
  ambulance: { kind: 'road', len: 10, width: 6.2, speed: 1.25, accel: 22, patienceSeconds: 6 },
  boat: { kind: 'water', len: 13, width: 7.5, speed: 1, accel: 6, patience: 1 },
  speedboat: { kind: 'water', len: 10, width: 5.5, speed: 2.4, accel: 16, patienceSeconds: 6 },
  cruise: { kind: 'water', len: 30, width: 12, speed: 0.8, accel: 4, patience: 1.6 },
};
export const CAR_TYPES = ['car', 'bus', 'truck', 'ambulance'];
export const BOAT_TYPES = ['boat', 'speedboat', 'cruise'];

// ---------- levels ----------
// roads: 1 or 2 bridges. carDirs: which way cars drive ('E', 'W') on every road.
// boatDirs: which way boats go ('N' up the screen, 'S' down).
// goal: how many cars and boats must get through to win.
// carEvery / boatEvery: [min, max] seconds between arrivals in each lane.
// first: seconds before the first car and first boat in each lane arrive.
// cars / boats: chance of each special in place of a plain car or boat.
// intro: the first special of a kind is forced as the nth arrival in the first lane of its
// kind, so a new special shows up early and on its own.
export const LEVELS = [
  {
    // just one car lane and one boat lane, very slow and very patient
    roads: 1, carDirs: ['E'], boatDirs: ['N'], goal: { cars: 4, boats: 3 },
    carSpeed: 16, boatSpeed: 7, carPatience: 24, boatPatience: 24,
    carEvery: [8, 11], boatEvery: [11, 14], first: { car: 1, boat: 5 },
    cars: {}, boats: {}, hints: true,
  },
  {
    roads: 1, carDirs: ['E', 'W'], boatDirs: ['N'], goal: { cars: 6, boats: 4 },
    carSpeed: 16, boatSpeed: 7.5, carPatience: 20, boatPatience: 20,
    carEvery: [9, 13], boatEvery: [10, 14], first: { car: 1, boat: 6 },
    cars: {}, boats: {}, hints: true,
  },
  {
    // boats both ways, and the first school bus
    roads: 1, carDirs: ['E', 'W'], boatDirs: ['N', 'S'], goal: { cars: 8, boats: 5 },
    carSpeed: 17, boatSpeed: 8, carPatience: 17, boatPatience: 17,
    carEvery: [8, 12], boatEvery: [11, 16], first: { car: 1, boat: 5 },
    cars: { bus: 0.15 }, boats: {}, intro: { kind: 'road', nth: 2, type: 'bus' }, hints: true,
  },
  {
    // the ambulance: let it through fast
    roads: 1, carDirs: ['E', 'W'], boatDirs: ['N', 'S'], goal: { cars: 10, boats: 6 },
    carSpeed: 18, boatSpeed: 8, carPatience: 15, boatPatience: 15,
    carEvery: [7, 11], boatEvery: [10, 15], first: { car: 1, boat: 4 },
    cars: { bus: 0.12, ambulance: 0.1 }, boats: {}, intro: { kind: 'road', nth: 3, type: 'ambulance' },
  },
  {
    // the cruise ship: long and slow, so let the cars go first
    roads: 1, carDirs: ['E', 'W'], boatDirs: ['N', 'S'], goal: { cars: 10, boats: 6 },
    carSpeed: 18, boatSpeed: 8, carPatience: 16, boatPatience: 15,
    carEvery: [7, 11], boatEvery: [11, 16], first: { car: 1, boat: 4 },
    cars: { bus: 0.1, truck: 0.1, ambulance: 0.06 }, boats: { cruise: 0.12 },
    intro: { kind: 'water', nth: 1, type: 'cruise' },
  },
  {
    // the speedboat: fast and impatient
    roads: 1, carDirs: ['E', 'W'], boatDirs: ['N', 'S'], goal: { cars: 12, boats: 8 },
    carSpeed: 19, boatSpeed: 8.5, carPatience: 14, boatPatience: 14,
    carEvery: [6, 10], boatEvery: [9, 14], first: { car: 1, boat: 4 },
    cars: { bus: 0.1, truck: 0.12, ambulance: 0.08 }, boats: { speedboat: 0.2, cruise: 0.08 },
    intro: { kind: 'water', nth: 2, type: 'speedboat' },
  },
  {
    // a second bridge: each road has its own, tapped separately
    roads: 2, carDirs: ['E'], boatDirs: ['N'], goal: { cars: 10, boats: 5 },
    carSpeed: 17, boatSpeed: 8, carPatience: 16, boatPatience: 16,
    carEvery: [8, 12], boatEvery: [11, 15], first: { car: 1, boat: 4 },
    cars: { bus: 0.12 }, boats: {},
  },
  {
    roads: 2, carDirs: ['E', 'W'], boatDirs: ['N'], goal: { cars: 14, boats: 6 },
    carSpeed: 18, boatSpeed: 8.5, carPatience: 13, boatPatience: 13,
    carEvery: [8, 12], boatEvery: [10, 14], first: { car: 1, boat: 4 },
    cars: { bus: 0.1, truck: 0.1, ambulance: 0.07 }, boats: { speedboat: 0.2 },
  },
  {
    // everything at once
    roads: 2, carDirs: ['E', 'W'], boatDirs: ['N', 'S'], goal: { cars: 16, boats: 8 },
    carSpeed: 19, boatSpeed: 9, carPatience: 11, boatPatience: 12,
    carEvery: [8, 12], boatEvery: [10, 15], first: { car: 1, boat: 4 },
    cars: { bus: 0.1, truck: 0.1, ambulance: 0.08 }, boats: { speedboat: 0.18, cruise: 0.08 },
  },
];
