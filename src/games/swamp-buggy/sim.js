// Swamp Buggy rules and physics. Pure and deterministic: no DOM, no randomness, a fixed
// physics step. World units are metres, y points up, x runs along the course to the flag.
//
// The buggy is a rigid chassis plus two wheels. Each wheel is a small point mass held on a
// springy, damped strut along the chassis' "down" axis and stiffly sideways, so the body
// bounces on its suspension. Wheels roll on a height-field terrain (a polyline) as circles;
// the chassis has a handful of touch points so it can land on its roof.
import { BUGGIES } from './buggies.js';

export const STEP = 1 / 240; // fixed physics step (s)
export const GRAVITY = 14; // m/s^2: a touch more than real, so it's weighty but still gets air

// chassis
export const BODY_MASS = 6;
export const BODY_INERTIA = 6;
export const WHEEL_MASS = 1.2;
const TOTAL_MASS = BODY_MASS + WHEEL_MASS * 2;
// where the struts meet the body (local metres, x forward, y up)
export const REAR_MOUNT = [-1.1, -0.2];
export const FRONT_MOUNT = [1.15, -0.2];
// body touch points (local): bumpers, top corners, the roll cage and the belly
export const BODY_POINTS = [
  [-1.5, -0.25], [1.55, -0.2], [1.45, 0.4], [-1.45, 0.45], [-0.75, 1.25], [0.35, 1.25], [0, -0.38],
];
export const BODY_POINT_R = 0.16;

// suspension (per wheel; most numbers are scaled per buggy)
const SIDE_K = 6000; // sideways stiffness of a strut
const SIDE_C = 60;
const STOP_K = 4000; // the bump stops at either end of the travel
const STOP_C = 40;

// driving
export const ROLL_ACCEL = 0.5; // m/s^2 rolling resistance while coasting
export const HOLD_ACCEL = 3; // static grip when nearly stopped with no pedal: holds on gentle slopes
export const HOLD_SPEED = 0.5;
export const BRAKE_ACCEL = 16;
export const REVERSE_SPEED = 6;
export const REVERSE_ACCEL = 8;
export const MUD_ACCEL = 6; // extra drag in mud
export const MUD_TOP = 0.55; // share of top speed in mud
export const WATER_TOP = 0.7; // share of top speed with wheels in water
export const WATER_DRAG = 1.2; // per second, on anything under water
export const SPEED_CAP = 30;

// in the air
// A pedal held in the air steers the spin toward a rate that grows with air time:
// AIR_BASE + AIR_JERK * t^2 / 2 (up to AIR_SPIN). So small hops barely tip, a one-second jump
// tips about 80 degrees, and holding the pedal through big air (about 1.6 s) turns a full flip.
export const AIR_BASE = 0.3; // rad/s
export const AIR_JERK = 9; // rad/s^3
export const AIR_SPIN = 11; // rad/s
export const AIR_GRIP = 6; // per second: how quickly the spin follows the pedal
export const AIR_DAMP = 0.6; // per second, spin fading with no pedal
export const AIR_GRACE = 0.08; // seconds off the ground before the pedals tilt
export const FLIP_SLACK = 2; // radians short of a full turn that still counts as a flip (ramps and
// landing slopes differ by a good few degrees, so a backflip off a kicker is well short of 360)
export const SETTLE = 0.3; // seconds back on the ground before a jump's flips are counted
export const BIG_AIR = 1.1; // seconds of air for "BIG AIR!"
export const FLIP_BONUS = 3; // coins per flip
export const AIR_BONUS = 2; // coins for big air

// kindness
export const RIGHT_DELAY = 1.5; // seconds stuck on the roof or side before it flips back
export const RIGHT_EARLY = 0.4; // after this long a fresh press flips it back straight away
export const RIGHT_TIME = 0.6; // seconds the flip-back takes
export const RIGHT_LIFT = 1.6; // metres it's lifted while turning over
export const STUCK_TIME = 2.2; // seconds of gas without getting anywhere before a helpful hop
export const STUCK_SPEED = 0.8;
export const HOP_FORWARD = 2.5; // metres a helpful hop carries the buggy forward
export const CRITTER_BOUNCE = 6.5; // m/s upward kick from a gator's back

// pick-ups
export const PICK_BODY = 1.5; // coin reach from the middle of the buggy
export const PICK_WHEEL = 1.0; // and from each wheel
export const STAR2 = 0.4; // share of a level's coins for the second star
export const STAR3 = 0.7; // and for the third

export const FINISH_STOP = 9; // m/s^2 the buggy brakes by itself after the flag

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const TAU = Math.PI * 2;

// ---------- terrain ----------

const built = new WeakMap();

// Turns a level's control points into typed arrays for fast lookups. Cached per level.
export function buildTrack(level) {
  if (built.has(level)) return built.get(level);
  const n = level.pts.length;
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  level.pts.forEach(([x, y], i) => {
    xs[i] = x;
    ys[i] = y;
  });
  const track = {
    level, xs, ys, n,
    bridges: level.bridges || [],
    water: level.water || [],
    mud: level.mud || [],
    startX: level.startX,
    finishX: level.finishX,
    endX: xs[n - 1],
  };
  built.set(level, track);
  return track;
}

// index of the last point at or left of x
function seg(track, x) {
  const { xs, n } = track;
  if (x <= xs[0]) return 0;
  if (x >= xs[n - 1]) return n - 2;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= x) lo = mid;
    else hi = mid;
  }
  return lo;
}

// How far a bobbing bridge is lifted at x and time t.
export function bridgeOffset(track, x, t) {
  for (const b of track.bridges) {
    if (x > b.x0 && x < b.x1) return b.amp * Math.sin((TAU * t) / b.period) * Math.sin((Math.PI * (x - b.x0)) / (b.x1 - b.x0));
  }
  return 0;
}

function pointY(track, i, t) {
  const y = track.ys[i];
  return track.bridges.length ? y + bridgeOffset(track, track.xs[i], t) : y;
}

export function groundY(track, x, t = 0) {
  const i = seg(track, x);
  const { xs } = track;
  const x0 = xs[i];
  const x1 = xs[i + 1];
  const y0 = pointY(track, i, t);
  const y1 = pointY(track, i + 1, t);
  const u = clamp((x - x0) / (x1 - x0), 0, 1);
  return y0 + (y1 - y0) * u;
}

// Slope angle of the ground at x (radians, up to the right is positive).
export function groundAngle(track, x, t = 0) {
  const i = seg(track, x);
  const dx = track.xs[i + 1] - track.xs[i];
  return Math.atan2(pointY(track, i + 1, t) - pointY(track, i, t), dx);
}

// Circle (x, y, r) against the ground: { pen, nx, ny } for the nearest ground point, or null
// when nothing is within r + slop. pen > 0 means overlapping; the normal points out of the ground.
export function contactAt(track, x, y, r, t = 0, slop = 0.05) {
  const reach = r + slop;
  let i = seg(track, x - reach);
  const last = seg(track, x + reach);
  let best = Infinity;
  let bx = 0;
  let by = 0;
  let bnx = 0;
  let bny = 1;
  for (; i <= last; i++) {
    const ax = track.xs[i];
    const ay = pointY(track, i, t);
    const ex = track.xs[i + 1] - ax;
    const ey = pointY(track, i + 1, t) - ay;
    const len2 = ex * ex + ey * ey;
    let u = ((x - ax) * ex + (y - ay) * ey) / len2;
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    const qx = ax + ex * u;
    const qy = ay + ey * u;
    const d2 = (x - qx) * (x - qx) + (y - qy) * (y - qy);
    if (d2 < best) {
      best = d2;
      bx = qx;
      by = qy;
      const len = Math.sqrt(len2);
      bnx = -ey / len;
      bny = ex / len;
    }
  }
  const gy = groundY(track, x, t);
  if (y < gy) {
    // the centre is inside the ground: push straight out along the surface normal
    const i2 = seg(track, x);
    const ex = track.xs[i2 + 1] - track.xs[i2];
    const ey = pointY(track, i2 + 1, t) - pointY(track, i2, t);
    const len = Math.hypot(ex, ey);
    const nx = -ey / len;
    const ny = ex / len;
    return { pen: r + (gy - y) * ny, nx, ny };
  }
  const d = Math.sqrt(best);
  if (d > reach) return null;
  if (d > 1e-6) return { pen: r - d, nx: (x - bx) / d, ny: (y - by) / d };
  return { pen: r, nx: bnx, ny: bny };
}

export function waterAt(track, x) {
  for (const w of track.water) if (x >= w.x0 && x <= w.x1) return w;
  return null;
}

export function inMud(track, x) {
  for (const m of track.mud) if (x >= m.x0 && x <= m.x1) return true;
  return false;
}

// ---------- the run ----------

export function buggySpec(id) {
  return BUGGIES.find((b) => b.id === id) || BUGGIES[0];
}

// Places the buggy at rest with its back wheel at x.
function placeBuggy(s, x, angle = null) {
  const { track, spec } = s;
  const a = angle == null ? groundAngle(track, x + 1, s.time) : angle;
  const c = Math.cos(a);
  const sn = Math.sin(a);
  const rest = spec.restLen - (BODY_MASS * GRAVITY) / 2 / spec.springK;
  const hgt = spec.wheelR + rest - REAR_MOUNT[1];
  const cx = x - REAR_MOUNT[0];
  const gy = Math.max(groundY(track, cx + REAR_MOUNT[0], s.time), groundY(track, cx + FRONT_MOUNT[0], s.time));
  const b = s.buggy;
  b.x = cx - sn * hgt;
  b.y = gy + c * hgt;
  b.a = a;
  b.vx = 0;
  b.vy = 0;
  b.w = 0;
  [REAR_MOUNT, FRONT_MOUNT].forEach((m, i) => {
    const w = s.wheels[i];
    const lx = m[0];
    const ly = m[1] - rest;
    w.x = b.x + lx * c - ly * sn;
    w.y = b.y + lx * sn + ly * c;
    w.vx = 0;
    w.vy = 0;
  });
}

export function createRun(level, buggyId = 'hopper') {
  const track = buildTrack(level);
  const spec = buggySpec(buggyId);
  const s = {
    level, track, spec,
    time: 0, acc: 0,
    status: 'play', // 'play' | 'done'
    doneTime: 0,
    input: null, // 'gas' | 'brake' | null
    pressT: -1, // time of the latest fresh press
    buggy: { x: 0, y: 0, a: 0, vx: 0, vy: 0, w: 0 },
    wheels: [0, 1].map(() => ({
      x: 0, y: 0, vx: 0, vy: 0, grounded: false, nx: 0, ny: 1, spin: 0, spinV: 0, wet: false, mud: false,
    })),
    bodyTouch: false,
    airborne: false,
    airT: 0, // seconds in the air this jump
    hangT: 0, // seconds since all of the buggy last left the ground
    airRot: 0, // radians turned since then
    flight: false, // in a jump (in the air, or just landed and settling)
    settle: 0,
    flips: 0,
    bigAirs: 0,
    bonus: 0,
    strandT: 0, // seconds on its roof or side
    righting: null, // { t, from, to }
    rightings: 0,
    stuckT: 0,
    hops: 0,
    hopX: -1e9,
    hopRun: 0,
    coins: 0,
    got: new Uint8Array(level.coins.length),
    total: level.coins.length,
    critterT: (level.critters || []).map(() => -10),
    props: (level.props || []).map((p) => ({
      kind: p.kind, x: p.x, y: 0, vx: 0, vy: 0, a: 0, va: 0, r: p.kind === 'ball' ? 0.55 : 0.5, hitT: -10,
    })),
    maxX: 0,
    stars: 0,
    events: [],
  };
  for (const p of s.props) p.y = groundY(track, p.x) + p.r;
  placeBuggy(s, level.startX);
  s.maxX = s.buggy.x;
  return s;
}

// A fresh press (from nothing to a pedal) is remembered so it can flip a stranded buggy early.
export function setInput(s, v) {
  const next = v === 'gas' || v === 'brake' ? v : null;
  if (next && !s.input) s.pressT = s.time;
  s.input = next;
}

export function starTargets(total) {
  return [Math.max(1, Math.ceil(total * STAR2)), Math.max(1, Math.ceil(total * STAR3))];
}

export function starsFor(coins, total, done = true) {
  if (!done) return 0;
  const [t2, t3] = starTargets(total);
  return coins >= t3 ? 3 : coins >= t2 ? 2 : 1;
}

export function progressOf(s) {
  const { startX, finishX } = s.track;
  return clamp((s.buggy.x - startX) / (finishX - startX), 0, 1);
}

export const speedOf = (s) => Math.hypot(s.buggy.vx, s.buggy.vy);
export const upY = (s) => Math.cos(s.buggy.a);

export function step(s, dt) {
  s.acc += Math.max(0, Math.min(dt, 0.25));
  while (s.acc >= STEP - 1e-12) {
    s.acc -= STEP;
    tick(s);
  }
}

function event(s, type, x, y, extra) {
  s.events.push({ type, x, y, t: s.time, ...extra });
}

function tick(s) {
  s.time += STEP;
  if (s.righting) righting(s);
  else physics(s);
  pickups(s);
  props(s);
  if (s.buggy.x > s.maxX) s.maxX = s.buggy.x;
  if (s.status === 'play' && s.buggy.x >= s.track.finishX) {
    s.status = 'done';
    s.doneTime = s.time;
    s.stars = starsFor(s.coins, s.total, true);
    event(s, 'finish', s.buggy.x, s.buggy.y);
  }
}

function physics(s) {
  const { track, spec, buggy: b, wheels } = s;
  const dt = STEP;
  const t = s.time;
  const done = s.status === 'done';
  const gas = !done && s.input === 'gas';
  const brake = !done && s.input === 'brake';
  const c = Math.cos(b.a);
  const sn = Math.sin(b.a);
  // body axes: forward f, down d
  const fx = c;
  const fy = sn;
  const dx = sn;
  const dy = -c;

  let bfx = 0;
  let bfy = -GRAVITY * BODY_MASS;
  let torque = 0;
  const mounts = [REAR_MOUNT, FRONT_MOUNT];
  const wf = [];
  for (let i = 0; i < 2; i++) {
    const w = wheels[i];
    const [lx, ly] = mounts[i];
    const ox = lx * c - ly * sn;
    const oy = lx * sn + ly * c;
    const ax = b.x + ox;
    const ay = b.y + oy;
    const avx = b.vx - b.w * oy;
    const avy = b.vy + b.w * ox;
    const rx = w.x - ax;
    const ry = w.y - ay;
    const rvx = w.vx - avx;
    const rvy = w.vy - avy;
    const ext = rx * dx + ry * dy;
    const extV = rvx * dx + rvy * dy;
    const lat = rx * fx + ry * fy;
    const latV = rvx * fx + rvy * fy;
    let fs = -spec.springK * (ext - spec.restLen) - spec.springC * extV;
    if (ext < spec.minExt) fs += STOP_K * (spec.minExt - ext) - (extV < 0 ? STOP_C * extV : 0);
    if (ext > spec.maxExt) fs -= STOP_K * (ext - spec.maxExt) + (extV > 0 ? STOP_C * extV : 0);
    const fl = -SIDE_K * lat - SIDE_C * latV;
    const fwx = fs * dx + fl * fx;
    const fwy = fs * dy + fl * fy;
    wf.push(fwx, fwy);
    bfx -= fwx;
    bfy -= fwy;
    torque -= ox * fwy - oy * fwx;
  }

  // pedals tilt the buggy once it has been in the air a moment
  if (s.airborne && s.hangT > AIR_GRACE) {
    const want = gas ? 1 : brake ? -1 : 0;
    if (want) {
      const tau = s.hangT - AIR_GRACE;
      const target = want * Math.min(AIR_SPIN, (AIR_BASE + (AIR_JERK * tau * tau) / 2) * spec.air);
      if (want * (target - b.w) > 0) b.w += (target - b.w) * Math.min(1, AIR_GRIP * dt);
    } else {
      b.w *= 1 - AIR_DAMP * dt;
    }
  }

  b.vx += (bfx / BODY_MASS) * dt;
  b.vy += (bfy / BODY_MASS) * dt;
  b.w += (torque / BODY_INERTIA) * dt;

  // the body in water is slowed
  if (waterAt(track, b.x) && b.y < waterAt(track, b.x).y) {
    b.vx *= 1 - WATER_DRAG * dt;
    b.vy *= 1 - WATER_DRAG * dt;
  }

  const half = TOTAL_MASS / 2 / WHEEL_MASS; // turns a per-wheel acceleration into a wheel's share of force
  for (let i = 0; i < 2; i++) {
    const w = wheels[i];
    w.vx += (wf[i * 2] / WHEEL_MASS) * dt;
    w.vy += (wf[i * 2 + 1] / WHEEL_MASS - GRAVITY) * dt;
    const water = waterAt(track, w.x);
    w.wet = !!water && w.y - spec.wheelR * 0.4 < water.y;
    w.mud = inMud(track, w.x);
    if (w.wet) {
      w.vx *= 1 - WATER_DRAG * dt;
      w.vy *= 1 - WATER_DRAG * dt;
    }
    if (w.grounded) {
      const tx = w.ny;
      const ty = -w.nx;
      const vt = w.vx * tx + w.vy * ty;
      let top = spec.topSpeed;
      if (w.mud) top *= 1 - (1 - MUD_TOP) * spec.wade;
      if (w.wet) top *= 1 - (1 - WATER_TOP) * spec.wade;
      let dv = 0;
      if (gas) {
        dv = spec.engine * Math.max(0, 1 - vt / top) * half * dt;
        if (vt > top) dv = -Math.min(vt - top, ROLL_ACCEL * 4 * half * dt);
      } else if (brake) {
        if (vt > HOLD_SPEED) dv = -Math.min(vt, BRAKE_ACCEL * half * dt);
        else dv = REVERSE_ACCEL * Math.max(0, 1 + vt / REVERSE_SPEED) * half * dt * -1;
      } else {
        let limit = Math.abs(vt) < HOLD_SPEED ? HOLD_ACCEL : ROLL_ACCEL;
        if (done) limit = FINISH_STOP;
        dv = clamp(-vt, -limit * half * dt, limit * half * dt);
      }
      if (w.mud) {
        const drag = MUD_ACCEL * spec.wade * half * dt;
        dv += clamp(-vt - dv, -drag, drag);
      }
      w.vx += dv * tx;
      w.vy += dv * ty;
    }
  }

  // move
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.a += b.w * dt;
  for (const w of wheels) {
    const sp = Math.hypot(w.vx, w.vy);
    if (sp > SPEED_CAP) {
      w.vx *= SPEED_CAP / sp;
      w.vy *= SPEED_CAP / sp;
    }
    w.x += w.vx * dt;
    w.y += w.vy * dt;
  }

  // wheels against the ground
  const wasAir = s.airborne;
  let anyWheel = false;
  for (const w of wheels) {
    const ct = contactAt(track, w.x, w.y, spec.wheelR, t);
    w.grounded = !!ct && ct.pen > -0.03;
    if (w.grounded) {
      anyWheel = true;
      w.nx = ct.nx;
      w.ny = ct.ny;
      if (ct.pen > 0) {
        w.x += ct.nx * ct.pen;
        w.y += ct.ny * ct.pen;
      }
      const vn = w.vx * ct.nx + w.vy * ct.ny;
      if (vn < 0) {
        const e = vn < -6 ? 0.2 : 0;
        w.vx -= (1 + e) * vn * ct.nx;
        w.vy -= (1 + e) * vn * ct.ny;
        if (vn < -4 && wasAir) event(s, 'land', w.x, w.y - spec.wheelR, { speed: -vn });
      }
      // gators and turtles are springy
      bounceCritters(s, w);
    }
    // spin for drawing
    if (w.grounded) {
      w.spinV = (w.vx * w.ny - w.vy * w.nx) / spec.wheelR;
    } else if (gas || brake) {
      w.spinV += ((gas ? 1 : -0.5) * (spec.topSpeed / spec.wheelR) - w.spinV) * 3 * dt;
    }
    w.spin += w.spinV * dt;
  }

  // the body against the ground
  s.bodyTouch = false;
  for (const [px, py] of BODY_POINTS) {
    const c2 = Math.cos(b.a);
    const s2 = Math.sin(b.a);
    const ox = px * c2 - py * s2;
    const oy = px * s2 + py * c2;
    const ct = contactAt(track, b.x + ox, b.y + oy, BODY_POINT_R, t, 0.02);
    if (!ct || ct.pen <= 0) continue;
    s.bodyTouch = true;
    b.x += ct.nx * ct.pen * 0.8;
    b.y += ct.ny * ct.pen * 0.8;
    const vpx = b.vx - b.w * oy;
    const vpy = b.vy + b.w * ox;
    const vn = vpx * ct.nx + vpy * ct.ny;
    if (vn < 0) {
      const rn = ox * ct.ny - oy * ct.nx;
      const k = 1 / BODY_MASS + (rn * rn) / BODY_INERTIA;
      const j = (-(1 + 0.25) * vn) / k;
      b.vx += (j * ct.nx) / BODY_MASS;
      b.vy += (j * ct.ny) / BODY_MASS;
      b.w += (rn * j) / BODY_INERTIA;
      // scraping friction
      const tx = ct.ny;
      const ty = -ct.nx;
      const vt = vpx * tx + vpy * ty;
      const rt = ox * ty - oy * tx;
      const kt = 1 / BODY_MASS + (rt * rt) / BODY_INERTIA;
      const jt = clamp(-vt / kt, -0.5 * j, 0.5 * j);
      b.vx += (jt * tx) / BODY_MASS;
      b.vy += (jt * ty) / BODY_MASS;
      b.w += (rt * jt) / BODY_INERTIA;
      if (vn < -5) event(s, 'thud', b.x + ox, b.y + oy, { speed: -vn });
    }
  }

  // air time, flips and big air
  const nowAir = !anyWheel && !s.bodyTouch;
  // A flight lasts from take-off until the buggy has been back down for SETTLE seconds, so a
  // landing that touches a wheel mid-spin and bounces still counts as one jump.
  s.hangT = nowAir ? s.hangT + dt : 0;
  if (nowAir) {
    s.airT += dt;
    s.airRot += b.w * dt;
    s.flight = true;
    s.settle = 0;
  } else if (s.flight) {
    s.airRot += b.w * dt;
    s.settle += dt;
    if (s.settle >= SETTLE) landed(s, anyWheel);
  } else {
    s.airT = 0;
    s.airRot = 0;
  }
  s.airborne = nowAir;

  // splashes
  for (const w of wheels) {
    const water = waterAt(track, w.x);
    const under = !!water && w.y < water.y;
    if (under && !w.under && Math.abs(w.vy) + Math.abs(w.vx) > 3) event(s, 'splash', w.x, water.y, { speed: Math.hypot(w.vx, w.vy) });
    w.under = under;
  }

  stranded(s, anyWheel);
  stuck(s, anyWheel, gas);
}

function landed(s, onWheels) {
  const rot = Math.abs(s.airRot);
  const upright = Math.cos(s.buggy.a) > 0.3;
  if (onWheels && upright && s.status === 'play') {
    const n = Math.floor((rot + FLIP_SLACK) / TAU);
    if (n >= 1) {
      s.flips += n;
      s.bonus += n * FLIP_BONUS;
      event(s, 'flip', s.buggy.x, s.buggy.y, { count: n, back: s.airRot > 0 });
    }
    if (s.airT >= BIG_AIR) {
      s.bigAirs++;
      s.bonus += AIR_BONUS;
      event(s, 'bigair', s.buggy.x, s.buggy.y, { air: s.airT });
    }
  }
  s.airT = 0;
  s.airRot = 0;
  s.flight = false;
  s.settle = 0;
}

function bounceCritters(s, w) {
  const list = s.level.critters;
  if (!list) return;
  for (let i = 0; i < list.length; i++) {
    const cr = list[i];
    const half = cr.kind === 'gator' ? 1.3 : 0.5;
    if (Math.abs(w.x - cr.x) > half) continue;
    if (cr.kind === 'gator' && w.vy < CRITTER_BOUNCE) {
      if (s.time - s.critterT[i] > 0.4) event(s, 'chomp', cr.x, w.y, { kind: cr.kind });
      w.vy = CRITTER_BOUNCE;
    }
    if (s.time - s.critterT[i] > 0.4 && cr.kind !== 'gator') event(s, 'peep', cr.x, w.y, { kind: cr.kind });
    s.critterT[i] = s.time;
  }
}

// Lying on the roof or a side: after a moment it turns itself back over.
function stranded(s, anyWheel) {
  const b = s.buggy;
  const up = Math.cos(b.a);
  const slow = Math.hypot(b.vx, b.vy) < 3;
  const bothWheels = s.wheels[0].grounded && s.wheels[1].grounded;
  if (up < 0.3 && slow && (s.bodyTouch || anyWheel) && !bothWheels) s.strandT += STEP;
  else if (up < 0.3 && slow && s.strandT > 0) s.strandT += STEP; // rocking about on its roof
  else s.strandT = 0;
  const early = s.strandT > RIGHT_EARLY && s.pressT >= s.time - s.strandT;
  if (s.strandT >= RIGHT_DELAY || early) startRighting(s);
}

export function startRighting(s, forward = 0.6, hop = false) {
  const b = s.buggy;
  const tx = b.x + forward;
  const ta = groundAngle(s.track, tx, s.time);
  const rest = s.spec.restLen - (BODY_MASS * GRAVITY) / 2 / s.spec.springK;
  const hgt = s.spec.wheelR + rest - REAR_MOUNT[1];
  const gy = Math.max(groundY(s.track, tx - 1.2, s.time), groundY(s.track, tx, s.time), groundY(s.track, tx + 1.2, s.time));
  // the shortest way round to upright
  let a0 = b.a % TAU;
  if (a0 > Math.PI) a0 -= TAU;
  if (a0 < -Math.PI) a0 += TAU;
  s.righting = { t: 0, from: { x: b.x, y: b.y, a: a0 }, to: { x: tx, y: gy + hgt + 0.15, a: ta } };
  s.strandT = 0;
  s.flight = false;
  s.airT = 0;
  s.airRot = 0;
  if (hop) s.hops++;
  else s.rightings++;
  event(s, 'boing', b.x, b.y, { hop });
}

function righting(s) {
  const r = s.righting;
  r.t += STEP;
  const k = Math.min(1, r.t / RIGHT_TIME);
  const e = k * k * (3 - 2 * k);
  const b = s.buggy;
  b.x = r.from.x + (r.to.x - r.from.x) * e;
  b.y = r.from.y + (r.to.y - r.from.y) * e + Math.sin(Math.PI * k) * RIGHT_LIFT;
  b.a = r.from.a + (r.to.a - r.from.a) * e;
  // wheels ride along at their resting places
  const c = Math.cos(b.a);
  const sn = Math.sin(b.a);
  const rest = s.spec.restLen - (BODY_MASS * GRAVITY) / 2 / s.spec.springK;
  [REAR_MOUNT, FRONT_MOUNT].forEach((m, i) => {
    const w = s.wheels[i];
    const ly = m[1] - rest;
    w.x = b.x + m[0] * c - ly * sn;
    w.y = b.y + m[0] * sn + ly * c;
    w.vx = 0;
    w.vy = 0;
    w.grounded = false;
  });
  if (k >= 1) {
    s.righting = null;
    b.vx = 1.5 * Math.cos(b.a);
    b.vy = 0;
    b.w = 0;
    for (const w of s.wheels) {
      w.vx = b.vx;
      w.vy = 0;
    }
    s.airborne = false;
    s.airT = 0;
    s.airRot = 0;
    s.flight = false;
    s.stuckT = 0;
  }
}

// Pressing gas but going nowhere (nose in a ditch, high-centred on a crest): a helpful hop.
function stuck(s, anyWheel, gas) {
  const b = s.buggy;
  if (gas && (anyWheel || s.bodyTouch) && b.vx < STUCK_SPEED && s.status === 'play') s.stuckT += STEP;
  else s.stuckT = Math.max(0, s.stuckT - STEP * 2);
  if (s.stuckT >= STUCK_TIME) {
    s.stuckT = 0;
    // a boing up and forward onto the ground ahead; repeats in the same place go further
    s.hopRun = Math.abs(b.x - s.hopX) < 4 ? s.hopRun + 1 : 0;
    s.hopX = b.x;
    startRighting(s, HOP_FORWARD * (1 + Math.min(3, s.hopRun) * 0.5), true);
    return;
  }
}

function pickups(s) {
  const { coins } = s.level;
  const b = s.buggy;
  const [w0, w1] = s.wheels;
  for (let i = 0; i < coins.length; i++) {
    if (s.got[i]) continue;
    const cn = coins[i];
    if (cn.x < b.x - 4) continue;
    if (cn.x > b.x + 4) continue;
    const near = (x, y, r) => (cn.x - x) * (cn.x - x) + (cn.y - y) * (cn.y - y) < r * r;
    if (near(b.x, b.y, PICK_BODY) || near(w0.x, w0.y, PICK_WHEEL) || near(w1.x, w1.y, PICK_WHEEL)) {
      s.got[i] = 1;
      s.coins++;
      event(s, 'coin', cn.x, cn.y, { kind: cn.kind });
    }
  }
}

// Crates and beach balls: knocked flying by the buggy, then bounce about on their own.
function props(s) {
  const b = s.buggy;
  const { track } = s;
  for (const p of s.props) {
    if (Math.abs(p.x - b.x) > 40) continue;
    const reach = p.r + 1.3;
    const dxb = p.x - b.x;
    const dyb = p.y - b.y;
    let hitBy = dxb * dxb + dyb * dyb < reach * reach;
    for (const w of s.wheels) {
      const rr = p.r + s.spec.wheelR;
      if ((p.x - w.x) ** 2 + (p.y - w.y) ** 2 < rr * rr) hitBy = true;
    }
    if (hitBy && s.time - p.hitT > 0.3) {
      p.hitT = s.time;
      const push = Math.max(2, b.vx);
      p.vx = Math.max(p.vx, push * (p.kind === 'ball' ? 1.5 : 1.15) + 1.5);
      p.vy = Math.max(p.vy, 3 + push * (p.kind === 'ball' ? 0.6 : 0.35));
      p.va = -p.vx / p.r * (p.kind === 'ball' ? 1 : 0.4);
      b.vx *= p.kind === 'ball' ? 0.99 : 0.95;
      event(s, 'bonk', p.x, p.y, { kind: p.kind });
    }
    if (p.vx === 0 && p.vy === 0) continue;
    p.vy -= GRAVITY * STEP;
    p.x += p.vx * STEP;
    p.y += p.vy * STEP;
    p.a += p.va * STEP;
    const gy = groundY(track, p.x, s.time) + p.r;
    if (p.y < gy) {
      p.y = gy;
      const bounce = p.kind === 'ball' ? 0.65 : 0.25;
      p.vy = p.vy < -1.5 ? -p.vy * bounce : 0;
      p.vx *= p.kind === 'ball' ? 0.97 : 0.85;
      p.va = p.kind === 'ball' ? -p.vx / p.r : p.va * 0.6;
      if (Math.abs(p.vx) < 0.15 && p.vy === 0) {
        p.vx = 0;
        p.va = 0;
      }
    }
  }
}

// Puts the buggy somewhere along the course at rest (debug and tests).
export function placeAt(s, x) {
  s.righting = null;
  placeBuggy(s, x);
  s.airborne = false;
  s.airT = 0;
  s.airRot = 0;
  s.flight = false;
  s.strandT = 0;
  s.stuckT = 0;
}
