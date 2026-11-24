// A simple player for tests and debug. For each shot it aims at the crabs and at the blocks
// holding them up (low and high arcs, a few strengths), plays every candidate forward on a
// copy of the game, and takes the one that pops the most crabs, then the one that shakes
// things up the most. Split coconuts are tapped a little before the target. Pure.
import {
  SLING, MAX_SPEED, GRAVITY, DT, ANGLE_MIN, ANGLE_MAX, step, fire, activate, crabs, canFire, cloneState,
} from './sim.js';

// Launch angles that pass through (x, y) at this power: [low, high], or [] if out of reach.
export function anglesThrough(x, y, power) {
  const v = power * MAX_SPEED;
  const dx = x - SLING.x;
  const dy = y - SLING.y;
  if (dx <= 0.2) return [];
  const g = -GRAVITY;
  const k = (g * dx * dx) / (2 * v * v);
  const disc = dx * dx - 4 * k * (k + dy);
  if (disc < 0) return [];
  const r = Math.sqrt(disc);
  return [(dx - r) / (2 * k), (dx + r) / (2 * k)]
    .map((u) => Math.atan(u))
    .filter((a) => a >= ANGLE_MIN && a <= ANGLE_MAX);
}

// Spots worth hitting: each crab, and the blocks near and under it.
function targets(s) {
  const out = [];
  const bodies = s.world.bodies.filter((b) => b.im && b.kind !== 'nut');
  for (const c of crabs(s)) {
    out.push({ x: c.x - 0.2, y: c.y });
    const under = bodies
      .filter((b) => b !== c && b.y < c.y + 0.2 && Math.abs(b.x - c.x) < 2.2)
      .sort((p, q) => Math.abs(p.x - c.x) + Math.abs(p.y - c.y) * 0.5 - (Math.abs(q.x - c.x) + Math.abs(q.y - c.y) * 0.5));
    for (const b of under.slice(0, 3)) {
      const half = b.shape === 'circle' ? b.r : b.hw;
      out.push({ x: b.x - half * 0.6, y: b.y + (b.shape === 'circle' ? 0 : b.hh * 0.5) });
    }
  }
  return out;
}

// Play one shot on a copy and score it.
function tryShot(s, shot, secs = 4) {
  const c = cloneState(s);
  const before = crabs(c).length;
  fire(c, shot.angle, shot.power);
  const n = Math.round(secs / DT);
  for (let i = 0; i < n; i++) {
    if (shot.tapAt != null && c.shotT >= shot.tapAt) activate(c);
    step(c);
    if (c.status === 'clear' || c.status === 'won') break;
    if (c.status === 'ready' || c.status === 'lost') break;
  }
  const after = crabs(c).length;
  let shake = 0;
  for (const b of c.world.bodies) {
    if (!b.start || !b.im || b.kind === 'nut') continue;
    shake += Math.hypot(b.x - b.start.x, b.y - b.start.y);
  }
  // crabs nudged closer to falling count a little too
  let wobble = 0;
  for (const q of crabs(c)) wobble += Math.abs(q.homeY - q.y) + Math.abs(q.a);
  return { popped: before - after, score: (before - after) * 1000 + (c.score - s.score) * 0.05 + shake * 2 + wobble * 20, cleared: after === 0 };
}

export function candidates(s) {
  const type = s.loaded;
  const list = [];
  const powers = type === 'heavy' ? [0.7, 0.8, 0.9, 1] : [0.55, 0.65, 0.75, 0.85, 1];
  for (const t of targets(s)) {
    for (const p of powers) {
      for (const a of anglesThrough(t.x, t.y, p)) {
        const shot = { angle: a, power: p };
        if (type === 'split') {
          // tap so the three spread just before they get there
          const vx = Math.cos(a) * p * MAX_SPEED;
          shot.tapAt = Math.max(0.15, (t.x - 3 - SLING.x) / vx);
        }
        list.push(shot);
      }
    }
  }
  return list;
}

// The best shot for the coconut in the slingshot.
export function planShot(s) {
  if (!canFire(s)) return null;
  let best = null;
  for (const shot of candidates(s)) {
    const r = tryShot(s, shot);
    if (!best || r.score > best.r.score) best = { shot, r };
    if (r.cleared) break;
  }
  return best && best.shot;
}

// Play a level to the end: plan, fire, tap if planned, wait for the next coconut.
// onShot(shot) is told about each shot.
export function playLevel(s, { onShot } = {}) {
  for (let guard = 0; guard < 40 && s.status !== 'won' && s.status !== 'lost'; guard++) {
    if (s.status === 'clear') {
      for (let i = 0; i < 200 && s.status === 'clear'; i++) step(s);
      continue;
    }
    if (!canFire(s)) {
      for (let i = 0; i < 1000 && !canFire(s) && s.status !== 'won' && s.status !== 'lost' && s.status !== 'clear'; i++) step(s);
      continue;
    }
    const shot = planShot(s);
    onShot?.(shot);
    fire(s, shot.angle, shot.power);
    for (let i = 0; i < 1000 && s.status === 'flying'; i++) {
      if (shot.tapAt != null && s.shotT >= shot.tapAt) activate(s);
      step(s);
    }
  }
  return s;
}

