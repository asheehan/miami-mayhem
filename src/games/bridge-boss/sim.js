// Bridge Boss rules: lanes, queues, the drawbridge, patience, hearts and winning.
// Pure: no DOM. Seeded, so the same level and seed always bring the same traffic.
//
// Every vehicle drives along a lane (a straight line with a direction). Its position s is
// how far its front has come along the lane; it takes up [s - len, s]. Where a lane meets a
// bridge there is a crossing: a stop line, and a zone (the span for cars, the water under the
// span for boats). A vehicle may pass a stop line only while the bridge is fully down (cars)
// or fully up (boats). A vehicle past the stop line whose tail is not yet out of the zone is
// on (or under) the bridge, and the bridge will not move until it has gone.
import {
  WORLD_W, WORLD_H, CHANNEL_X0, CHANNEL_X1, ROAD_HALF, ROAD_Y_ONE, ROAD_Y_TWO, CAR_LANE_OFFSET,
  BOAT_LANE_OFFSET, OFFSCREEN, BRIDGE_TIME, TOGGLE_DEBOUNCE, SPAN_MARGIN, UNDER_MARGIN, STOP_GAP,
  GAP, BRAKE, QUEUE_PATIENCE_RATE, HEARTS, TYPES, LEVELS,
} from './levels.js';

export * from './levels.js';

const MAX_STEP = 1 / 60;
const SCHEDULE_TIME = 600; // seconds of arrivals generated up front
const STILL = 0.4; // below this speed (units/s), and right up against what stops it, a vehicle is waiting
const POOF_TIME = 1.2; // how long a grumpy vehicle's poof cloud lasts

// mulberry32, kept in the state so a level can be replayed from its seed.
function rand(s) {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const roadYs = (level) => (level.roads === 2 ? ROAD_Y_TWO : [ROAD_Y_ONE]);

// The lanes for a level: car lanes on every road, then boat lanes, each with its crossings
// in the order a vehicle meets them.
export function buildLanes(level) {
  const ys = roadYs(level);
  const lanes = [];
  const along = (lane, x, y) => (x - lane.x0) * lane.dx + (y - lane.y0) * lane.dy;
  const addCrossings = (lane, zones) => {
    lane.crossings = zones
      .map(({ bridge, a, b }) => {
        const p = along(lane, a.x, a.y);
        const q = along(lane, b.x, b.y);
        const zoneStart = Math.min(p, q);
        return { bridge, zoneStart, zoneEnd: Math.max(p, q), stopAt: zoneStart - STOP_GAP };
      })
      .sort((u, v) => u.zoneStart - v.zoneStart);
  };
  ys.forEach((y, bridge) => {
    for (const dir of level.carDirs) {
      const east = dir === 'E';
      const lane = {
        id: lanes.length, kind: 'road', dir, road: bridge,
        x0: east ? -OFFSCREEN : WORLD_W + OFFSCREEN, y0: y + (east ? CAR_LANE_OFFSET : -CAR_LANE_OFFSET),
        dx: east ? 1 : -1, dy: 0, length: WORLD_W + OFFSCREEN * 2,
      };
      addCrossings(lane, [{
        bridge, a: { x: CHANNEL_X0 - SPAN_MARGIN, y: lane.y0 }, b: { x: CHANNEL_X1 + SPAN_MARGIN, y: lane.y0 },
      }]);
      lanes.push(lane);
    }
  });
  const mid = (CHANNEL_X0 + CHANNEL_X1) / 2;
  for (const dir of level.boatDirs) {
    const north = dir === 'N';
    const lane = {
      id: lanes.length, kind: 'water', dir, road: -1,
      x0: mid + (north ? BOAT_LANE_OFFSET : -BOAT_LANE_OFFSET), y0: north ? WORLD_H + OFFSCREEN : -OFFSCREEN,
      dx: 0, dy: north ? -1 : 1, length: WORLD_H + OFFSCREEN * 2,
    };
    addCrossings(lane, ys.map((y, bridge) => ({
      bridge, a: { x: lane.x0, y: y - ROAD_HALF - UNDER_MARGIN }, b: { x: lane.x0, y: y + ROAD_HALF + UNDER_MARGIN },
    })));
    lanes.push(lane);
  }
  return lanes;
}

function pickType(s, weights, plain) {
  let r = rand(s);
  for (const [type, p] of Object.entries(weights)) {
    if (r < p) return type;
    r -= p;
  }
  return plain;
}

// Every arrival for every lane, decided up front so the traffic does not depend on play.
function buildSchedules(s) {
  const L = s.level;
  const introLane = L.intro ? s.lanes.find((l) => l.kind === L.intro.kind) : null;
  for (const lane of s.lanes) {
    const road = lane.kind === 'road';
    const [lo, hi] = road ? L.carEvery : L.boatEvery;
    // lanes after the first of their kind start a little later, so they don't arrive in step
    const sameKindBefore = s.lanes.filter((l) => l.kind === lane.kind && l.id < lane.id).length;
    let t = (road ? L.first.car : L.first.boat) + sameKindBefore * (lo * 0.45 + rand(s) * lo * 0.3);
    let n = 0;
    while (t < SCHEDULE_TIME) {
      let type = pickType(s, road ? L.cars : L.boats, road ? 'car' : 'boat');
      if (lane === introLane && n < L.intro.nth && type === L.intro.type) type = road ? 'car' : 'boat';
      if (lane === introLane && n === L.intro.nth) type = L.intro.type;
      lane.schedule.push({ t, type, look: Math.floor(rand(s) * 1000) });
      // a slow vehicle leaves a bigger gap behind it
      const slow = 1 / TYPES[type].speed;
      t += (lo + rand(s) * (hi - lo)) * Math.max(1, slow * 0.8);
      n++;
    }
  }
}

export function createGame(levelIndex = 0, seed = 1) {
  const index = Math.max(0, Math.min(LEVELS.length - 1, levelIndex | 0));
  const level = LEVELS[index];
  const s = {
    index, level, seed, rng: (seed * 2654435761 + index * 97) | 0,
    status: 'play', // 'play' | 'won' | 'lost'
    time: 0, endTime: -9, hearts: HEARTS, heartTime: -9,
    bridges: roadYs(level).map((y, id) => ({
      id, y, state: 'down', // 'down' | 'raising' | 'up' | 'lowering'
      k: 0, // 0 fully down .. 1 fully up
      toggleTime: -9, refusedTime: -9, refusedBy: -1,
    })),
    lanes: buildLanes(level).map((l) => ({ ...l, vehicles: [], schedule: [], next: 0 })),
    delivered: { cars: 0, boats: 0 },
    passed: [], // types in the order they got through, for the goal icons
    effects: [], // poof clouds: { type, x, y, angle, time, look }
    nextId: 1,
    lost: 0,
  };
  buildSchedules(s);
  return s;
}

export const goalMet = (s) => s.delivered.cars >= s.level.goal.cars && s.delivered.boats >= s.level.goal.boats;
// Stars for a finished level: one per heart left on a win, none otherwise.
export const starsFor = (s) => (s.status === 'won' ? Math.max(1, Math.min(3, s.hearts)) : 0);

// World position of a point `back` units behind a vehicle's front.
export function lanePoint(lane, sPos) {
  return { x: lane.x0 + lane.dx * sPos, y: lane.y0 + lane.dy * sPos };
}
export function vehicleCentre(lane, v) {
  return lanePoint(lane, v.s - v.len / 2);
}

const passable = (bridge, kind) => (kind === 'road' ? bridge.state === 'down' : bridge.state === 'up');

// The first vehicle found on the span (bridge down) or under it (bridge up), or null.
export function occupant(s, b) {
  for (const lane of s.lanes) {
    for (const c of lane.crossings) {
      if (c.bridge !== b) continue;
      for (const v of lane.vehicles) if (v.s > c.stopAt && v.s - v.len < c.zoneEnd) return v;
    }
  }
  return null;
}

export function canToggle(s, b) {
  const br = s.bridges[b];
  if (!br || s.status !== 'play') return false;
  if (s.time - br.toggleTime < TOGGLE_DEBOUNCE) return false;
  if (br.state === 'raising' || br.state === 'lowering') return true;
  return !occupant(s, b);
}

// A tap on bridge b. Returns true if it started moving (or turned round mid-move). A bridge
// with a car on it or a boat under it refuses: it shakes and shows a lock.
export function toggle(s, b) {
  const br = s.bridges[b];
  if (!br || s.status !== 'play') return false;
  if (s.time - br.toggleTime < TOGGLE_DEBOUNCE) return false;
  if (br.state === 'down' || br.state === 'up') {
    const v = occupant(s, b);
    if (v) {
      br.refusedTime = s.time;
      br.refusedBy = v.id;
      return false;
    }
  }
  // mid-move nobody can be on or under it, so turning round is always safe
  br.state = br.state === 'down' || br.state === 'lowering' ? 'raising' : 'lowering';
  br.toggleTime = s.time;
  return true;
}

function stepBridges(s, dt) {
  for (const br of s.bridges) {
    if (br.state === 'raising') {
      br.k = Math.min(1, br.k + dt / BRIDGE_TIME);
      if (br.k >= 1) br.state = 'up';
    } else if (br.state === 'lowering') {
      br.k = Math.max(0, br.k - dt / BRIDGE_TIME);
      if (br.k <= 0) br.state = 'down';
    }
  }
}

function spawn(s, lane) {
  const a = lane.schedule[lane.next];
  if (!a || a.t > s.time) return;
  const T = TYPES[a.type];
  const last = lane.vehicles[lane.vehicles.length - 1];
  if (last && last.s - last.len < GAP + 0.01) return; // the lane is backed up to its start; wait
  lane.next++;
  const base = lane.kind === 'road' ? s.level.carSpeed : s.level.boatSpeed;
  const patience = T.patienceSeconds ?? T.patience * (lane.kind === 'road' ? s.level.carPatience : s.level.boatPatience);
  const speed = base * T.speed;
  let v0 = speed;
  if (last) v0 = Math.min(v0, last.v + Math.sqrt(2 * BRAKE * Math.max(0, last.s - last.len - GAP)));
  lane.vehicles.push({
    id: s.nextId++, type: a.type, kind: lane.kind, lane: lane.id, look: a.look,
    len: T.len, width: T.width, speed, accel: T.accel, patienceTime: patience,
    s: 0, v: v0, patience: 0, waiting: false, front: false, waitTime: 0, delivered: false, born: s.time,
  });
}

function poof(s, lane, v) {
  const c = vehicleCentre(lane, v);
  s.effects.push({ type: v.type, x: c.x, y: c.y, dx: lane.dx, dy: lane.dy, time: s.time, look: v.look, len: v.len });
  s.lost++;
  s.hearts = Math.max(0, s.hearts - 1);
  s.heartTime = s.time;
  if (s.hearts === 0 && s.status === 'play') {
    s.status = 'lost';
    s.endTime = s.time;
  }
}

// Manners at a crossing, so the span always clears and the player gets a gap to switch:
// nobody follows a slower vehicle (a bus, a cruise ship) onto or under the bridge, and nobody
// goes on unless there is room to get all the way off it (between two bridges a queue can
// back up to the first one). Either way the follower waits at the stop line.
function mustWait(a, v, c) {
  if (!a) return false;
  const aRear = a.s - a.len;
  if (aRear - GAP >= c.zoneEnd + v.len) return false;
  return a.waiting || (a.s > c.stopAt - a.len && a.speed < v.speed * 0.9);
}

function stepLane(s, lane, dt) {
  const vs = lane.vehicles;
  for (let i = 0; i < vs.length; i++) {
    const v = vs[i];
    let limit = Infinity;
    let byBridge = false;
    if (i > 0) {
      const a = vs[i - 1];
      limit = a.s - a.len - GAP;
    }
    const a = i > 0 ? vs[i - 1] : null;
    for (const c of lane.crossings) {
      if (v.s > c.stopAt) continue; // already committed to this crossing
      const shut = !passable(s.bridges[c.bridge], lane.kind);
      if (shut || mustWait(a, v, c)) {
        if (c.stopAt <= limit) {
          limit = c.stopAt;
          byBridge = shut;
        }
        break;
      }
    }
    const room = Math.max(0, limit - v.s);
    const target = Math.min(v.speed, Math.sqrt(2 * BRAKE * room));
    v.v = v.v < target ? Math.min(target, v.v + v.accel * dt) : target;
    v.s = Math.max(v.s, Math.min(v.s + v.v * dt, limit));
    if (v.s >= limit) v.v = Math.min(v.v, 0);
    v.waiting = limit - v.s < 0.05 && v.v < STILL;
    v.front = v.waiting && byBridge;
    if (v.waiting) v.waitTime += dt;
    if (v.waiting && s.status === 'play') {
      v.patience += (dt * (v.front ? 1 : QUEUE_PATIENCE_RATE)) / v.patienceTime;
    }
    const last = lane.crossings[lane.crossings.length - 1];
    if (!v.delivered && v.s - v.len > last.zoneEnd) {
      v.delivered = true;
      if (s.status === 'play') {
        if (lane.kind === 'road') s.delivered.cars++;
        else s.delivered.boats++;
        s.passed.push(v.type);
      }
    }
  }
  // grumpy vehicles give up and poof away; finished ones drive off the end
  for (let i = vs.length - 1; i >= 0; i--) {
    const v = vs[i];
    if (v.patience >= 1 && s.status === 'play') {
      vs.splice(i, 1);
      poof(s, lane, v);
    } else if (v.s - v.len > lane.length) vs.splice(i, 1);
  }
}

function stepOnce(s, dt) {
  s.time += dt;
  stepBridges(s, dt);
  for (const lane of s.lanes) {
    stepLane(s, lane, dt);
    spawn(s, lane);
  }
  while (s.effects.length && s.time - s.effects[0].time > POOF_TIME) s.effects.shift();
  if (s.status === 'play' && goalMet(s)) {
    s.status = 'won';
    s.endTime = s.time;
  }
}

export function step(s, dt) {
  while (dt > 1e-9) {
    const d = Math.min(dt, MAX_STEP);
    stepOnce(s, d);
    dt -= d;
  }
}

// Every vehicle on the move, with its lane, for drawing and for bots.
export function allVehicles(s) {
  const out = [];
  for (const lane of s.lanes) for (const v of lane.vehicles) out.push({ lane, v });
  return out;
}

// The crossing a vehicle will meet next at bridge b, if it has not passed it yet.
export function crossingAhead(lane, v, b) {
  for (const c of lane.crossings) if (c.bridge === b && v.s <= c.stopAt) return c;
  return null;
}

// Which vehicles are waiting in front of bridge b (for hints and the lock icon).
export function waitingAt(s, b) {
  const out = [];
  for (const lane of s.lanes) {
    for (const v of lane.vehicles) {
      if (!v.front) continue;
      const c = crossingAhead(lane, v, b);
      if (c && c.stopAt - v.s < 0.1) out.push({ lane, v });
    }
  }
  return out;
}

export { POOF_TIME };
