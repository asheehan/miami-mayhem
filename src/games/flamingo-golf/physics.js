// Pure mini golf rules: the ball, walls, bumpers, sand, water, flamingos, the gator,
// the cup, strokes and stars. No DOM. Everything is in the course's logical space
// (COURSE_W x COURSE_H, y down).
import { HOLES } from './holes.js';

export const COURSE_W = 400;
export const COURSE_H = 640;

export const BALL_R = 9;
export const CUP_R = 16;
export const WALL_HALF = 5; // walls are 10 units thick, centred on their line
export const MAX_SPEED = 1000; // a full-power shot, units per second
export const ROLL = 150; // rolling friction: constant slowdown, units/s^2
export const DRAG = 0.8; // plus slowdown proportional to speed, per second
export const SAND_ROLL = 900;
export const SAND_DRAG = 3.5;
export const SINK_SPEED = 280; // slower than this over the cup and it drops
export const CUP_PULL = 2400; // the cup's lip bends a passing ball toward the middle
export const STOP_SPEED = 6;
export const WALL_BOUNCE = 0.8;
export const BUMPER_KICK = 170;
export const STEP = 1 / 120;
export const MAX_MOVE = 2; // the ball moves at most this far per sub-step, so it can't pass a wall
export const SPLASH_TIME = 0.9;
export const MAX_ROLL_TIME = 20;
export const SKIP_AFTER = 10; // strokes before the Skip button shows

// Gator geometry, relative to the cup (its mouth) and the way it faces.
export const GATOR = { hinge: 30, jaw: 50, jawSpread: 0.65, jawR: 5, snout: 22, snoutR: 22, body0: 40, body1: 125, bodyR: 24 };

// Stars for a finished hole: 3 at or under par, 2 for one or two over, 1 otherwise.
export function starsFor(strokes, par) {
  if (strokes <= par) return 3;
  if (strokes <= par + 2) return 2;
  return 1;
}

export function inRegion(r, x, y) {
  if (r.r !== undefined) return (x - r.x) ** 2 + (y - r.y) ** 2 <= r.r * r.r;
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function insidePolygon(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// The gator's mouth: open for `open` seconds out of every `period`.
export function gatorPhase(g, t) {
  const p = (((t + (g.phase || 0)) % g.period) + g.period) % g.period;
  return p;
}
export function gatorOpen(g, t) {
  return gatorPhase(g, t) < g.open;
}

function rot(fx, fy, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [fx * c - fy * s, fx * s + fy * c];
}

// Where a flamingo is at time t: its legs as capsules plus where its body is drawn.
export function flamingoPose(f, t) {
  const w = (Math.PI * 2) / f.period;
  if (f.kind === 'walk') {
    const u = 0.5 - 0.5 * Math.cos(w * t + (f.phase || 0));
    const x = f.a[0] + (f.b[0] - f.a[0]) * u;
    const y = f.a[1] + (f.b[1] - f.a[1]) * u;
    const dx = f.b[0] - f.a[0];
    const dy = f.b[1] - f.a[1];
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const half = 14;
    return { x, y, caps: [{ x1: x - ux * half, y1: y - uy * half, x2: x + ux * half, y2: y + uy * half, r: 9 }] };
  }
  // sweep: one long leg kicking back and forth around the hip
  const ang = f.a0 + f.amp * Math.sin(w * t + (f.phase || 0));
  const [px, py] = f.pivot;
  const tx = px + Math.cos(ang) * f.len;
  const ty = py + Math.sin(ang) * f.len;
  return {
    x: px,
    y: py,
    ang,
    caps: [
      { x1: px, y1: py, x2: px, y2: py, r: 20 },
      { x1: px, y1: py, x2: tx, y2: ty, r: 7 },
    ],
  };
}

// The gator's solid parts at time t (all static while the mouth is in one state).
export function gatorCaps(g, cup, t) {
  const fx = Math.cos(g.dir);
  const fy = Math.sin(g.dir);
  const [cx, cy] = cup;
  const hx = cx - fx * GATOR.hinge;
  const hy = cy - fy * GATOR.hinge;
  const caps = [{ x1: cx - fx * GATOR.body0, y1: cy - fy * GATOR.body0, x2: cx - fx * GATOR.body1, y2: cy - fy * GATOR.body1, r: GATOR.bodyR }];
  if (gatorOpen(g, t)) {
    for (const side of [-1, 1]) {
      const [jx, jy] = rot(fx, fy, side * GATOR.jawSpread);
      caps.push({ x1: hx, y1: hy, x2: hx + jx * GATOR.jaw, y2: hy + jy * GATOR.jaw, r: GATOR.jawR });
    }
  } else {
    caps.push({ x1: hx, y1: hy, x2: cx + fx * GATOR.snout, y2: cy + fy * GATOR.snout, r: GATOR.snoutR });
  }
  return caps;
}

// Static walls of a hole as capsules: the outline's edges and the inner walls.
export function wallCaps(hole) {
  const caps = [];
  const o = hole.outline;
  for (let i = 0; i < o.length; i++) {
    const [x1, y1] = o[i];
    const [x2, y2] = o[(i + 1) % o.length];
    caps.push({ x1, y1, x2, y2, r: WALL_HALF });
  }
  for (const [x1, y1, x2, y2] of hole.walls) caps.push({ x1, y1, x2, y2, r: WALL_HALF });
  return caps;
}

export function holeData(index) {
  return HOLES[index];
}

export function createHoleState(index, holes = HOLES) {
  const hole = holes[index];
  return {
    index,
    hole,
    walls: wallCaps(hole),
    t: 0,
    acc: 0,
    ball: { x: hole.tee[0], y: hole.tee[1], vx: 0, vy: 0 },
    shotStart: { x: hole.tee[0], y: hole.tee[1] },
    strokes: 0,
    status: 'ready', // 'ready' | 'rolling' | 'splash' | 'sunk'
    statusT: 0, // seconds in the current status
    rollT: 0,
    splashAt: null,
    flash: hole.bumpers.map(() => -10), // when each bumper was last hit
    escapes: 0,
    last: { x: hole.tee[0], y: hole.tee[1] },
  };
}

export function canShoot(s) {
  return s.status === 'ready';
}

// Hit the ball toward `angle` (radians, y down) with power 0..1. Counts a stroke.
export function shoot(s, angle, power) {
  if (!canShoot(s)) return false;
  const p = Math.max(0, Math.min(1, power));
  if (p <= 0) return false;
  s.shotStart = { x: s.ball.x, y: s.ball.y };
  s.ball.vx = Math.cos(angle) * MAX_SPEED * p;
  s.ball.vy = Math.sin(angle) * MAX_SPEED * p;
  s.strokes += 1;
  s.status = 'rolling';
  s.statusT = 0;
  s.rollT = 0;
  return true;
}

// Advance by dt seconds in fixed steps.
export function step(s, dt) {
  s.acc += dt;
  while (s.acc >= STEP) {
    s.acc -= STEP;
    tick(s);
  }
}

// Push the ball out of a capsule and bounce it off. The capsule may be moving with
// endpoint velocities (v1, v2). Returns true on contact.
function collide(b, c, bounce, v1x = 0, v1y = 0, v2x = 0, v2y = 0) {
  const dx = c.x2 - c.x1;
  const dy = c.y2 - c.y1;
  const len2 = dx * dx + dy * dy;
  let u = len2 > 0 ? ((b.x - c.x1) * dx + (b.y - c.y1) * dy) / len2 : 0;
  u = Math.max(0, Math.min(1, u));
  const px = c.x1 + dx * u;
  const py = c.y1 + dy * u;
  let nx = b.x - px;
  let ny = b.y - py;
  const d = Math.hypot(nx, ny);
  const min = BALL_R + c.r;
  if (d >= min) return false;
  if (d > 1e-6) {
    nx /= d;
    ny /= d;
  } else if (len2 > 0) {
    const l = Math.sqrt(len2);
    nx = -dy / l;
    ny = dx / l;
  } else {
    nx = 0;
    ny = -1;
  }
  b.x = px + nx * min;
  b.y = py + ny * min;
  const ox = v1x + (v2x - v1x) * u;
  const oy = v1y + (v2y - v1y) * u;
  const rx = b.vx - ox;
  const ry = b.vy - oy;
  const vn = rx * nx + ry * ny;
  if (vn < 0) {
    b.vx = rx - (1 + bounce) * vn * nx + ox;
    b.vy = ry - (1 + bounce) * vn * ny + oy;
  }
  return true;
}

function moving(s, t) {
  const out = [];
  const h = 1e-3;
  for (const f of s.hole.flamingos) {
    const now = flamingoPose(f, t).caps;
    const before = flamingoPose(f, t - h).caps;
    now.forEach((c, i) => {
      const p = before[i];
      out.push({ c, v1x: (c.x1 - p.x1) / h, v1y: (c.y1 - p.y1) / h, v2x: (c.x2 - p.x2) / h, v2y: (c.y2 - p.y2) / h });
    });
  }
  return out;
}

function tick(s) {
  s.t += STEP;
  s.statusT += STEP;
  const b = s.ball;
  const hole = s.hole;
  if (s.status === 'splash') {
    if (s.statusT >= SPLASH_TIME) {
      b.x = s.shotStart.x;
      b.y = s.shotStart.y;
      b.vx = 0;
      b.vy = 0;
      s.status = 'ready';
      s.statusT = 0;
    }
    return;
  }
  if (s.status === 'sunk') return;

  const movers = moving(s, s.t);
  const gator = hole.gator ? gatorCaps(hole.gator, hole.cup, s.t) : [];
  if (s.status === 'rolling') s.rollT += STEP;

  const speed0 = Math.hypot(b.vx, b.vy);
  const n = Math.max(1, Math.ceil((speed0 * STEP) / MAX_MOVE));
  const h = STEP / n;
  for (let k = 0; k < n; k++) {
    // friction
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > 0) {
      const sand = hole.sand.some((r) => inRegion(r, b.x, b.y));
      const slow = (sand ? SAND_ROLL + SAND_DRAG * sp : ROLL + DRAG * sp) * h;
      const ns = Math.max(0, sp - slow);
      b.vx *= ns / sp;
      b.vy *= ns / sp;
    }
    // the cup's lip
    const cdx = hole.cup[0] - b.x;
    const cdy = hole.cup[1] - b.y;
    const cd = Math.hypot(cdx, cdy);
    if (cd < CUP_R && cd > 1e-6 && s.status === 'rolling') {
      const a = CUP_PULL * (1 - cd / CUP_R) * h;
      b.vx += (cdx / cd) * a;
      b.vy += (cdy / cd) * a;
    }
    b.x += b.vx * h;
    b.y += b.vy * h;

    for (const m of movers) {
      if (collide(b, m.c, 0.6, m.v1x, m.v1y, m.v2x, m.v2y) && s.status === 'ready' && Math.hypot(b.vx, b.vy) > STOP_SPEED) {
        s.status = 'rolling';
        s.statusT = 0;
        s.rollT = 0;
      }
    }
    for (const c of gator) collide(b, c, WALL_BOUNCE);
    hole.bumpers.forEach(([x, y, r], i) => {
      const vin = b.vx * (b.x - x) + b.vy * (b.y - y);
      if (collide(b, { x1: x, y1: y, x2: x, y2: y, r }, 1)) {
        if (vin < 0) {
          const nx = (b.x - x) / (r + BALL_R);
          const ny = (b.y - y) / (r + BALL_R);
          b.vx += nx * BUMPER_KICK;
          b.vy += ny * BUMPER_KICK;
          const sp2 = Math.hypot(b.vx, b.vy);
          if (sp2 > MAX_SPEED) {
            b.vx *= MAX_SPEED / sp2;
            b.vy *= MAX_SPEED / sp2;
          }
          s.flash[i] = s.t;
          if (s.status === 'ready') {
            s.status = 'rolling';
            s.statusT = 0;
          }
        }
      }
    });
    for (const c of s.walls) collide(b, c, WALL_BOUNCE);

    // never leave the course: if something squeezed the ball out, put it back
    if (!insidePolygon(hole.outline, b.x, b.y)) {
      s.escapes += 1;
      b.x = s.last.x;
      b.y = s.last.y;
      b.vx = -b.vx * 0.5;
      b.vy = -b.vy * 0.5;
    }
    s.last.x = b.x;
    s.last.y = b.y;

    if (s.status !== 'rolling') continue;
    const d = Math.hypot(hole.cup[0] - b.x, hole.cup[1] - b.y);
    if (d < CUP_R && Math.hypot(b.vx, b.vy) < SINK_SPEED) {
      s.status = 'sunk';
      s.statusT = 0;
      b.x = hole.cup[0];
      b.y = hole.cup[1];
      b.vx = 0;
      b.vy = 0;
      return;
    }
    if (hole.water.some((r) => inRegion(r, b.x, b.y))) {
      s.status = 'splash';
      s.statusT = 0;
      s.splashAt = { x: b.x, y: b.y };
      s.strokes += 1;
      b.vx = 0;
      b.vy = 0;
      return;
    }
  }
  if (s.status === 'rolling' && (Math.hypot(b.vx, b.vy) < STOP_SPEED || s.rollT > MAX_ROLL_TIME)) {
    b.vx = 0;
    b.vy = 0;
    s.status = 'ready';
    s.statusT = 0;
  }
}

// A copy that can be simulated without touching the original (hole data is shared).
export function cloneState(s) {
  return {
    ...s,
    ball: { ...s.ball },
    shotStart: { ...s.shotStart },
    last: { ...s.last },
    flash: s.flash.slice(),
    splashAt: s.splashAt && { ...s.splashAt },
  };
}

// Run a shot until the ball rests, sinks or splashes (or maxT passes). Returns the state.
export function simulateShot(s, angle, power, maxT = 15) {
  const c = cloneState(s);
  if (!shoot(c, angle, power)) return c;
  let t = 0;
  while (c.status === 'rolling' && t < maxT) {
    tick(c);
    t += STEP;
  }
  return c;
}

// Let time pass (for movers and the gator) without a shot.
export function wait(s, seconds) {
  const n = Math.round(seconds / STEP);
  for (let i = 0; i < n; i++) tick(s);
}
