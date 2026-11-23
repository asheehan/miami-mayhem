// Sunset Drive rules: road building, driving physics, traffic, coins, boost pads and stars.
// Pure: no DOM. World units: z runs along the road from the first segment, x across it and
// y up. The car's sideways position s.x is in road half-widths: 0 is the centre line and ±1 the
// road edges; past that is the verge (grass, sand or shallow water) where the car slows down.

import { STAGES, SCENERY, SETS, TRAFFIC } from './tracks.js';

// ---------- the road ----------
export const SEG_LEN = 200; // world units per road segment
export const ROAD_HALF = 1000; // half the road's width in world units (x = 1)
export const LANE_X = [-0.62, 0, 0.62]; // lane centres, in road half-widths
export const RUMBLE_LEN = 3; // segments per stripe of the rumble strips and lane dashes
export const LEAD_IN = 14; // straight segments before the start, so the camera has road under it
export const START_LINE = LEAD_IN + 4; // the segment with the start gantry
export const RUN_OUT = 240; // straight segments past the finish, to coast down and keep drawing
export const CURVE_GAIN = 0.55; // how much a curve unit bends the drawn road (world units per segment²)
export const HILL_UNIT = 1000; // a section's `hill: 1` is this many world units of height

// ---------- the camera ----------
export const CAMERA_HEIGHT = 1800; // above the road under the car; with ROAD_HALF sets how wide the road looks
export const FOV = 100; // degrees, horizontal field of view used for the depth factor
export const CAMERA_DEPTH = 1 / Math.tan(((FOV / 2) * Math.PI) / 180);
export const PLAYER_Z = CAMERA_HEIGHT * CAMERA_DEPTH; // the camera rides this far behind the car
export const DRAW_DISTANCE = 140; // segments drawn ahead of the camera

// ---------- driving ----------
export const MAX_SPEED = 9000; // world units/s the car cruises at by itself (45 segments a second)
export const ACCEL = 2600; // units/s² while below cruising speed: about 3.5 s from a standstill
export const DECEL = 3500; // units/s² back down to cruising speed after a boost
export const BOOST_SPEED = 12600; // a boost pad's top speed
export const BOOST_ACCEL = 12000; // units/s² while boosting
export const BOOST_TIME = 1.7; // seconds a boost pad lasts
export const STEER_RATE = 1.9; // road half-widths per second at full steer and full speed
export const STEER_LOW = 0.45; // fraction of the steering still there at a standstill
export const CENTRIFUGAL = 0.17; // outward drift per second = curve × (speed fraction)² × this
export const OFFROAD_SPEED = 0.45 * MAX_SPEED; // top speed on the verge
export const OFFROAD_DECEL = 9000; // units/s² of drag on the verge above that speed
export const OFFROAD_ASSIST = 0.8; // half-widths/s the car eases back to the road edge with no finger down
export const X_LIMIT = 2.1; // the furthest the car can wander from the centre line
export const RAIL_LIMIT = 0.93; // on a bridge the railings keep the car's centre inside this
export const RAIL_SPEED = 0.78 * MAX_SPEED; // scraping a railing slows the car to this
export const SKY_PARALLAX = 0.035; // how far the sky slides per second per curve unit at full speed

// ---------- bumps ----------
export const CAR_W = 0.5; // the player's car width in road half-widths
export const HIT_LEN = 250; // world units along the road within which a car's back counts as touching
export const HIT_SCALE = 0.85; // cars count as this fraction of their width (forgiving)
export const BUMP_KEEP = 0.4; // a bump keeps this fraction of the speed
export const MIN_SPEED = 0.2 * MAX_SPEED; // but never drops below this
export const SPIN_TIME = 0.8; // seconds of quarter-turn wobble, with no steering
export const BUMP_GRACE = 1.4; // seconds after a bump when traffic can't bump the car again
export const BUMP_PUSH = 1.1; // half-widths/s sideways shove away from the car that was hit
export const LANE_CHANGE = 1.2; // half-widths/s a bumped car moves over to make room

// ---------- pickups and stars ----------
export const COIN_REACH = 0.34; // a coin is caught within this many half-widths of the car's centre
export const COIN_RUN = 5; // coins in a run
export const COIN_GAP = 5; // segments between coins in a run
export const WEAVE_COINS = 9; // coins in a weave across the lanes
export const PAD_REACH = 0.42; // a boost pad is hit within this of the car's centre
export const STAR_COINS = [0.5, 0.8]; // the 2nd and 3rd stars need these fractions of the coins
export const COUNTDOWN = 3; // seconds of 3-2-1 before GO
export const FINISH_SPEED = 0.3 * MAX_SPEED; // the car coasts down to this past the finish
export const TRAFFIC_GAP = 28; // segments kept between cars meeting the player in the same lane

const MAX_STEP = 1 / 120;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const easeInOut = (a, b, p) => a + (b - a) * (0.5 - Math.cos(p * Math.PI) / 2);

// mulberry32, kept in an object so a race can be replayed from its seed.
export function makeRng(seed) {
  const r = { s: seed | 0 };
  return () => {
    let t = (r.s = (r.s + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, weighted) {
  let total = 0;
  for (const [, w] of weighted) total += w;
  let r = rng() * total;
  for (const [k, w] of weighted) {
    r -= w;
    if (r < 0) return k;
  }
  return weighted[weighted.length - 1][0];
}

// ---------- building a track ----------

function sideGround(stage, sec, side) {
  const key = side < 0 ? 'groundL' : 'groundR';
  return sec[key] || sec.ground || stage[key] || stage.ground || 'grass';
}

// Turns a stage's sections into segments with scenery, coins, boost pads, start and finish.
export function buildTrack(stage) {
  const index = STAGES.indexOf(stage);
  const rng = makeRng(9001 + (index < 0 ? 77 : index) * 131);
  const segs = [];
  const sectionStarts = [];
  let y = 0;
  const lead = { len: LEAD_IN, curve: 0, hill: 0, coins: 'none' };
  const tail = stage.sections[stage.sections.length - 1];
  const all = [lead, ...stage.sections];
  const addSeg = (curve, y1, y2, sec, si) => {
    const i = segs.length;
    segs.push({
      i, z: i * SEG_LEN, curve, y1, y2, sec: si,
      band: Math.floor(i / RUMBLE_LEN) % 2,
      groundL: sideGround(stage, sec, -1), groundR: sideGround(stage, sec, 1),
      rail: !!sec.rail,
      sprites: [], coins: [], pad: null,
    });
  };
  all.forEach((sec, si) => {
    sectionStarts.push(segs.length);
    const n = sec.len;
    const enter = Math.max(1, Math.round(n / 4));
    const leave = enter;
    const hold = n - enter - leave;
    const y0 = y;
    const y1 = y0 + (sec.hill || 0) * HILL_UNIT;
    for (let k = 0; k < n; k++) {
      let c;
      if (k < enter) c = easeInOut(0, sec.curve, (k + 0.5) / enter);
      else if (k < enter + hold) c = sec.curve;
      else c = easeInOut(sec.curve, 0, (k - enter - hold + 0.5) / leave);
      const ny = easeInOut(y0, y1, (k + 1) / n);
      addSeg(c, y, ny, sec, si);
      y = ny;
    }
  });
  const finishSeg = segs.length;
  for (let k = 0; k < RUN_OUT; k++) addSeg(0, y, y, { ...tail, boost: false }, all.length - 1);

  const track = {
    stage, segs, finishSeg, finishZ: finishSeg * SEG_LEN, startZ: (LEAD_IN + 0.5) * SEG_LEN,
    length: finishSeg * SEG_LEN, coins: [], pads: [], sectionStarts,
  };
  placeScenery(track, all, rng);
  placePickups(track, all, rng);
  segs[START_LINE].sprites.push({ kind: 'startGantry', x: 0 });
  segs[finishSeg].sprites.push({ kind: 'finishBanner', x: 0 });
  return track;
}

function placeScenery(track, all, rng) {
  const { segs, stage } = track;
  const next = { [-1]: 2, [1]: 4 };
  for (const seg of segs) {
    const sec = all[seg.sec];
    const night = !!stage.night;
    if (seg.rail) {
      // the railings themselves are drawn along the road edges by draw.js
      if (seg.i % 16 === 8) {
        seg.sprites.push({ kind: night ? 'lampNight' : 'lamp', x: -1.24, flip: true });
        seg.sprites.push({ kind: night ? 'lampNight' : 'lamp', x: 1.24 });
      }
    } else if (night && seg.i % 12 === 6) {
      seg.sprites.push({ kind: 'lampNight', x: -1.24, flip: true });
      seg.sprites.push({ kind: 'lampNight', x: 1.24 });
    }
    if (seg.i >= START_LINE - 1 && seg.i <= START_LINE + 1) continue;
    if (seg.i > track.finishSeg - 2 && seg.i < track.finishSeg + 3) continue;
    for (const side of [-1, 1]) {
      if (seg.i < next[side]) continue;
      const setName = (side < 0 ? sec.left : sec.right) || (side < 0 ? stage.left : stage.right);
      const set = SETS[setName] || SETS.none;
      if (!set.every) {
        next[side] = seg.i + 4;
        continue;
      }
      const kind = pick(rng, set.kinds);
      const meta = SCENERY[kind];
      const [a, b] = meta.off;
      seg.sprites.push({ kind, x: side * (a + rng() * (b - a)), flip: rng() < 0.5 });
      const room = meta.room || 0;
      next[side] = seg.i + Math.max(room, Math.round(set.every * (0.6 + rng() * 0.8)));
    }
  }
}

function addCoin(track, segIndex, x) {
  const seg = track.segs[segIndex];
  const coin = { id: track.coins.length, seg: segIndex, z: (segIndex + 0.5) * SEG_LEN, x };
  seg.coins.push(coin);
  track.coins.push(coin);
}

function placePickups(track, all, rng) {
  all.forEach((sec, si) => {
    if (si === 0 || sec.coins === 'none' || sec.len < 60) return;
    const s0 = track.sectionStarts[si];
    if (sec.boost) {
      const lane = LANE_X[Math.floor(rng() * 3)];
      const pi = s0 + 8;
      const pad = { seg: pi, z: (pi + 0.5) * SEG_LEN, x: lane };
      track.segs[pi].pad = pad;
      track.pads.push(pad);
      for (let k = 0; k < COIN_RUN; k++) addCoin(track, pi + 6 + k * 4, lane);
      if (sec.len < 120) return;
    }
    const span = (COIN_RUN - 1) * COIN_GAP;
    const mid = s0 + Math.floor(sec.len * (sec.boost ? 0.72 : 0.5));
    const first = Math.max(s0 + 4, mid - Math.floor(span / 2));
    if (sec.curve) {
      // the inside of the bend, swinging in to the apex and back out
      const side = Math.sign(sec.curve);
      for (let k = 0; k < COIN_RUN; k++) {
        addCoin(track, first + k * COIN_GAP, side * 0.58 * Math.sin((Math.PI * (k + 0.5)) / COIN_RUN));
      }
    } else if (sec.coins === 'weave') {
      // a slow S across the lanes, gentle enough to follow at full speed
      const n = WEAVE_COINS;
      const gap = Math.max(6, Math.min(12, Math.floor((sec.len - 10) / (n - 1))));
      const start = Math.max(s0 + 4, mid - Math.floor(((n - 1) * gap) / 2));
      const dir = rng() < 0.5 ? -1 : 1;
      for (let k = 0; k < n; k++) addCoin(track, start + k * gap, dir * 0.5 * Math.sin((Math.PI * 2 * k) / (n - 1)));
    } else {
      const lane = LANE_X[Math.floor(rng() * 3)];
      for (let k = 0; k < COIN_RUN; k++) addCoin(track, first + k * COIN_GAP, lane);
    }
  });
}

const trackCache = new Map();
export function trackFor(stageIndex) {
  if (!trackCache.has(stageIndex)) trackCache.set(stageIndex, buildTrack(STAGES[stageIndex]));
  return trackCache.get(stageIndex);
}

// ---------- reading the road ----------

export const segmentAt = (track, z) => track.segs[clamp(Math.floor(z / SEG_LEN), 0, track.segs.length - 1)];

export function roadHeightAt(track, z) {
  const seg = segmentAt(track, z);
  const p = clamp(z / SEG_LEN - seg.i, 0, 1);
  return seg.y1 + (seg.y2 - seg.y1) * p;
}

// Where a world point lands on the screen. cam: { x, y, z } in world units; view: { cx, horizon, k }
// where k is how many pixels below the horizon the road under the car is drawn. Returns
// { x, y, w, scale, dz }: w is the road's half-width in pixels at that depth.
export function project(x, y, z, cam, view, out = {}) {
  const dz = z - cam.z;
  out.dz = dz;
  if (dz <= 1e-6) {
    out.scale = 0;
    out.x = view.cx;
    out.y = Infinity;
    out.w = 0;
    return out;
  }
  const scale = CAMERA_DEPTH / dz;
  out.scale = scale;
  out.x = view.cx + scale * (x - cam.x) * view.k;
  out.y = view.horizon - scale * (y - cam.y) * view.k;
  out.w = scale * ROAD_HALF * view.k;
  return out;
}

export function cameraFor(s, out = {}) {
  out.x = s.x * ROAD_HALF;
  out.y = roadHeightAt(s.track, s.z) + CAMERA_HEIGHT;
  out.z = s.z - PLAYER_Z;
  return out;
}

// ---------- a race ----------

function coinsNear(track, z, x) {
  const mid = Math.floor(z / SEG_LEN);
  let n = 0;
  for (let i = Math.max(0, mid - 40); i <= Math.min(track.segs.length - 1, mid + 40); i++) {
    for (const c of track.segs[i].coins) if (Math.abs(c.x - x) < 0.5) n++;
    const p = track.segs[i].pad;
    if (p && Math.abs(p.x - x) < 0.5) n += 3;
  }
  return n;
}

function placeTraffic(s) {
  const { track, stage } = s;
  const rng = s.rng;
  const n = stage.traffic;
  const from = track.startZ + 70 * SEG_LEN;
  const to = track.finishZ - 70 * SEG_LEN;
  const lastMeet = [-1e9, -1e9, -1e9];
  const cars = [];
  for (let j = 0; j < n; j++) {
    const meet = from + ((j + 0.15 + rng() * 0.7) / n) * (to - from);
    const kind = pick(rng, stage.kinds);
    const t = TRAFFIC[kind];
    // the lane with the fewest coins near where the player will catch up, so a careful driver
    // can collect them all without a car sitting on them
    const r0 = rng();
    let lane = -1;
    let fewest = Infinity;
    for (let k = 0; k < 3; k++) {
      const l = (Math.floor(r0 * 3) + k) % 3;
      if (meet - lastMeet[l] < TRAFFIC_GAP * SEG_LEN) continue;
      const n = coinsNear(track, meet, LANE_X[l]);
      if (n < fewest) [lane, fewest] = [l, n];
    }
    if (lane < 0) continue;
    lastMeet[lane] = meet;
    const frac = t.speed[0] + rng() * (t.speed[1] - t.speed[0]);
    const speed = frac * MAX_SPEED;
    // start it far enough back that the player catches it near `meet`
    const tMeet = (meet - track.startZ) / MAX_SPEED + 2;
    const z = meet - speed * tMeet;
    cars.push({
      id: cars.length, kind, w: t.w, lane, x: LANE_X[lane], targetX: LANE_X[lane], z, speed, cruise: speed,
      wobbleT: -9, look: Math.floor(rng() * 1000), phase: rng() * Math.PI * 2,
    });
  }
  cars.sort((a, b) => a.z - b.z);
  return cars;
}

export function createRace(stageIndex, seed = 1) {
  const track = trackFor(stageIndex);
  const s = {
    stageIndex, stage: track.stage, track, seed, rng: makeRng(seed),
    status: 'count', // 'count' | 'race' | 'done'
    time: 0, raceTime: 0, countT: COUNTDOWN, doneTime: -1, finishTime: 0,
    z: track.startZ, x: 0, speed: 0, steer: 0, lean: 0,
    offroad: false, scraping: false, boostT: 0, spinT: 0, spinDir: 1, graceT: 0, pushV: 0,
    coins: 0, total: track.coins.length, got: new Uint8Array(track.coins.length), stars: 0,
    bumps: 0, boosts: 0, offroadTime: 0,
    lastCoinT: -9, lastBumpT: -9, lastBoostT: -9, lastBumpX: 0,
    skyX: 0, events: [],
    traffic: [],
  };
  s.traffic = placeTraffic(s);
  return s;
}

// Steering input, -1 (full left) to 1 (full right).
export function setSteer(s, v) {
  s.steer = clamp(Number.isFinite(v) ? v : 0, -1, 1);
}

export const speedFraction = (s) => s.speed / MAX_SPEED;

export function starsFor(coins, total) {
  if (total <= 0) return 3;
  let n = 1;
  for (const f of STAR_COINS) if (coins >= Math.ceil(total * f - 1e-9)) n++;
  return n;
}

// Coins needed for each extra star, for the HUD's star markers.
export const starTargets = (total) => STAR_COINS.map((f) => Math.ceil(total * f - 1e-9));

function bump(s, car) {
  s.speed = Math.max(MIN_SPEED, s.speed * BUMP_KEEP);
  s.spinT = SPIN_TIME;
  s.graceT = BUMP_GRACE;
  s.boostT = 0;
  const away = s.x >= car.x ? 1 : -1;
  s.spinDir = away;
  s.pushV = away * BUMP_PUSH;
  s.bumps += 1;
  s.lastBumpT = s.time;
  s.lastBumpX = car.x;
  car.wobbleT = s.time;
  // the bumped car moves over to whichever lane is furthest from the player
  let best = car.targetX;
  let bestD = -1;
  for (const lx of LANE_X) {
    const d = Math.abs(lx - s.x);
    if (d > bestD) [best, bestD] = [lx, d];
  }
  car.targetX = best;
  s.events.push('bump');
}

function moveTraffic(s, dt) {
  const cars = s.traffic;
  for (const c of cars) {
    // keep a polite distance behind a slower car in the same lane
    let want = c.cruise;
    for (const o of cars) {
      if (o === c) continue;
      const dz = o.z - c.z;
      if (dz > 0 && dz < 3 * SEG_LEN && Math.abs(o.x - c.x) < 0.45) want = Math.min(want, o.speed);
    }
    c.speed += clamp(want - c.speed, -4000 * dt, 2000 * dt);
    c.z += c.speed * dt;
    if (c.x !== c.targetX) {
      const d = c.targetX - c.x;
      const m = LANE_CHANGE * dt;
      c.x = Math.abs(d) <= m ? c.targetX : c.x + Math.sign(d) * m;
    }
  }
}

function collideTraffic(s) {
  if (s.graceT > 0 || s.status !== 'race') return;
  for (const c of s.traffic) {
    if (Math.abs(c.z - s.z) > HIT_LEN) continue;
    if (Math.abs(c.x - s.x) < ((CAR_W + c.w) / 2) * HIT_SCALE) {
      bump(s, c);
      return;
    }
  }
}

function pickUp(s, z0, z1) {
  const { track } = s;
  const a = Math.max(0, Math.floor(z0 / SEG_LEN));
  const b = Math.min(track.segs.length - 1, Math.floor(z1 / SEG_LEN));
  for (let i = a; i <= b; i++) {
    const seg = track.segs[i];
    for (const coin of seg.coins) {
      if (s.got[coin.id] || coin.z <= z0 || coin.z > z1) continue;
      if (Math.abs(coin.x - s.x) < COIN_REACH) {
        s.got[coin.id] = 1;
        s.coins += 1;
        s.lastCoinT = s.time;
        s.events.push('coin');
      }
    }
    const pad = seg.pad;
    if (pad && pad.z > z0 && pad.z <= z1 && Math.abs(pad.x - s.x) < PAD_REACH && s.spinT <= 0) {
      s.boostT = BOOST_TIME;
      s.boosts += 1;
      s.lastBoostT = s.time;
      s.events.push('boost');
    }
  }
}

function stepOnce(s, dt) {
  s.time += dt;
  const { track } = s;
  if (s.status === 'count') {
    s.countT -= dt;
    if (s.countT <= 0) {
      s.status = 'race';
      s.countT = 0;
      s.events.push('go');
    }
    return;
  }
  if (s.status === 'race') s.raceTime += dt;
  const seg = segmentAt(track, s.z);
  const done = s.status === 'done';
  const pct = s.speed / MAX_SPEED;

  // speed
  s.offroad = Math.abs(s.x) > 1;
  if (s.offroad) s.offroadTime += dt;
  let target = s.boostT > 0 ? BOOST_SPEED : MAX_SPEED;
  if (done) target = FINISH_SPEED;
  if (s.offroad) target = Math.min(target, OFFROAD_SPEED);
  if (s.scraping) target = Math.min(target, RAIL_SPEED);
  if (s.speed < target) s.speed = Math.min(target, s.speed + (s.boostT > 0 ? BOOST_ACCEL : ACCEL) * dt);
  else s.speed = Math.max(target, s.speed - (s.offroad ? OFFROAD_DECEL : DECEL) * dt);
  s.boostT = Math.max(0, s.boostT - dt);

  // steering, the bend's outward push, a bump's shove
  let steer = s.spinT > 0 ? 0 : s.steer;
  if (done) steer = clamp(-s.x * 2, -1, 1);
  const rate = STEER_RATE * (STEER_LOW + (1 - STEER_LOW) * Math.min(1, pct));
  let x = s.x + steer * rate * dt;
  x -= seg.curve * pct * pct * CENTRIFUGAL * dt;
  x += s.pushV * dt;
  s.pushV *= Math.exp(-4 * dt);
  if (Math.abs(x) > 1 && Math.abs(s.steer) < 0.05 && s.spinT <= 0) {
    const edge = Math.sign(x) * 0.95;
    const d = edge - x;
    x += Math.sign(d) * Math.min(Math.abs(d), OFFROAD_ASSIST * dt);
  }
  s.scraping = false;
  if (seg.rail && Math.abs(x) > RAIL_LIMIT) {
    x = Math.sign(x) * RAIL_LIMIT;
    s.scraping = true;
    if (Math.sign(s.pushV) === Math.sign(x)) s.pushV = 0;
  }
  s.x = clamp(x, -X_LIMIT, X_LIMIT);
  s.spinT = Math.max(0, s.spinT - dt);
  s.graceT = Math.max(0, s.graceT - dt);
  s.lean += (clamp(steer, -1, 1) - s.lean) * Math.min(1, dt * 7);
  s.skyX += seg.curve * Math.min(pct, 1.2) * SKY_PARALLAX * dt;

  const z0 = s.z;
  s.z = Math.min(s.z + s.speed * dt, (track.segs.length - DRAW_DISTANCE - 2) * SEG_LEN);
  moveTraffic(s, dt);
  if (!done) {
    pickUp(s, z0, s.z);
    collideTraffic(s);
    if (s.z >= track.finishZ) {
      s.status = 'done';
      s.doneTime = s.time;
      s.finishTime = s.raceTime;
      s.stars = starsFor(s.coins, s.total);
      s.events.push('finish');
    }
  }
}

export function step(s, dt) {
  while (dt > 1e-9) {
    const d = Math.min(dt, MAX_STEP);
    stepOnce(s, d);
    dt -= d;
  }
}

// Seconds the stage takes at cruising speed, start to finish.
export const cruiseTime = (track) => (track.finishZ - track.startZ) / MAX_SPEED;

// How far through the stage the car is, 0..1.
export const progressOf = (s) => clamp((s.z - s.track.startZ) / (s.track.finishZ - s.track.startZ), 0, 1);
