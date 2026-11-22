// A patient wind, for tests and ?debug autopilot. Pure.
// Sail and herd: try a fan of gusts behind each loose thing, run each one forward on a copy of
// the state until things settle, and keep the one that leaves everything closest (by walking
// distance around obstacles) to home. Shoo: puff each gull away from the picnic as it comes.
import { step, gust, settled, GUST_FULL_LEN } from './sim.js';

const POWERS = [0.1, 0.18, 0.28, 0.4, 0.55, 0.75, 1];
const ANGLES = [0, -0.2, 0.2, -0.45, 0.45];
const BACKOFF = 18; // the bot's swipes start this far behind the thing they push

const navCache = new WeakMap();

export function goalPoint(level) {
  if (level.job === 'sail') return [level.dock.x + level.dock.w / 2, level.dock.y + level.dock.h / 2];
  if (level.job === 'herd') return [level.pool.x, level.pool.y];
  return [level.shoo.picnic.x, level.shoo.picnic.y];
}

// Can a thing of radius r travel straight from a to b without touching anything solid?
export function clear(level, ax, ay, bx, by, r) {
  const len = Math.hypot(bx - ax, by - ay);
  const n = Math.max(1, Math.ceil(len / 4));
  for (let i = 0; i <= n; i++) {
    const x = ax + ((bx - ax) * i) / n;
    const y = ay + ((by - ay) * i) / n;
    for (const c of level.circles || []) if (Math.hypot(x - c.x, y - c.y) < c.r + r * 0.95) return false;
    for (const w of level.walls || []) {
      const cx = Math.max(w.x, Math.min(x, w.x + w.w));
      const cy = Math.max(w.y, Math.min(y, w.y + w.h));
      if (Math.hypot(x - cx, y - cy) < r * 0.95) return false;
    }
  }
  return true;
}

// Waypoints with their walking distance to the goal (Dijkstra over straight clear hops).
function nav(level, r) {
  let byR = navCache.get(level);
  if (!byR) navCache.set(level, (byR = new Map()));
  if (byR.has(r)) return byR.get(r);
  const goal = goalPoint(level);
  const nodes = (level.nav || []).map((p) => ({ x: p[0], y: p[1], d: Infinity }));
  for (const n of nodes) if (clear(level, n.x, n.y, goal[0], goal[1], r)) n.d = Math.hypot(n.x - goal[0], n.y - goal[1]);
  for (let pass = 0; pass < nodes.length; pass++) {
    for (const a of nodes) {
      for (const b of nodes) {
        if (a === b || !Number.isFinite(b.d)) continue;
        const via = Math.hypot(a.x - b.x, a.y - b.y) + b.d;
        if (via < a.d && clear(level, a.x, a.y, b.x, b.y, r)) a.d = via;
      }
    }
  }
  const out = { goal, nodes };
  byR.set(r, out);
  return out;
}

// Walking distance home for a thing at (x, y), and the point to head for next.
export function routeTo(level, x, y, r) {
  const { goal, nodes } = nav(level, r);
  if (clear(level, x, y, goal[0], goal[1], r)) return { d: Math.hypot(goal[0] - x, goal[1] - y), to: goal };
  let best = { d: Infinity, to: goal };
  for (const n of nodes) {
    if (!Number.isFinite(n.d)) continue;
    const d = Math.hypot(n.x - x, n.y - y) + n.d;
    if (d < best.d && clear(level, x, y, n.x, n.y, r)) best = { d, to: [n.x, n.y] };
  }
  if (Number.isFinite(best.d)) return best;
  // nothing in sight: head for the nearest waypoint anyway, at a cost
  for (const n of nodes) {
    const d = Math.hypot(n.x - x, n.y - y) + n.d + 400;
    if (d < best.d) best = { d, to: [n.x, n.y] };
  }
  return Number.isFinite(best.d) ? best : { d: Math.hypot(goal[0] - x, goal[1] - y) + 400, to: goal };
}

function score(s) {
  if (s.status === 'won') return -1e6 + s.time;
  let total = 0;
  for (const m of s.movers) {
    if (m.docked) continue;
    if (s.job === 'herd' && m.inPool) continue;
    total += routeTo(s.level, m.x, m.y, m.r).d;
  }
  return total;
}

function copy(s) {
  const c = structuredClone({ ...s, level: null });
  c.level = s.level;
  return c;
}

// Let things slide until they settle (or a few seconds pass).
export function settle(s, maxSeconds = 3.5) {
  const t0 = s.time + s.statusT;
  do step(s, 0.05);
  while (s.status === 'play' && !(settled(s) && s.time - t0 > 0.15) && s.time + s.statusT - t0 < maxSeconds);
}

// The next swipe for a sail or herd level: [x0, y0, x1, y1], or null when done.
export function planGust(s) {
  if (s.status !== 'play') return null;
  const now = score(s);
  let best = null;
  for (const m of s.movers) {
    if (m.docked || (s.job === 'herd' && m.inPool)) continue;
    const { to } = routeTo(s.level, m.x, m.y, m.r);
    const base = Math.atan2(to[1] - m.y, to[0] - m.x);
    for (const da of ANGLES) {
      const a = base + da;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      for (const p of POWERS) {
        const swipe = [m.x - dx * BACKOFF, m.y - dy * BACKOFF, m.x - dx * BACKOFF + dx * p * GUST_FULL_LEN, m.y - dy * BACKOFF + dy * p * GUST_FULL_LEN];
        const c = copy(s);
        gust(c, ...swipe);
        settle(c);
        const sc = score(c);
        if (!best || sc < best.sc) best = { sc, swipe };
      }
    }
  }
  if (!best) return null;
  return best.sc < now - 0.5 ? best.swipe : best.swipe; // even a sideways gust shakes things loose
}

// The next swipe for a shoo level, or null if no gull needs shooing yet.
export function shooGust(s, reach = 260) {
  if (s.status !== 'play') return null;
  const p = s.level.shoo.picnic;
  let target = null;
  let bestD = Infinity;
  for (const g of s.gulls) {
    if (g.state === 'flee') continue;
    if (g.x < 0 || g.x > 400 || g.y < 0 || g.y > 640) continue;
    const d = Math.hypot(g.x - p.x, g.y - p.y);
    if (d < bestD) [bestD, target] = [d, g];
  }
  if (!target || bestD > reach) return null;
  const dx = (target.x - p.x) / bestD;
  const dy = (target.y - p.y) / bestD;
  const x0 = target.x - dx * 22;
  const y0 = target.y - dy * 22;
  return [x0, y0, x0 + dx * 60, y0 + dy * 60];
}

// Play a level to the end with the bot. onGust(swipe) is told about each gust.
export async function playLevel(s, { maxSeconds = 240, yieldEvery = 0, onGust } = {}) {
  let n = 0;
  while (s.status === 'play' && s.time < maxSeconds) {
    if (s.job === 'shoo') {
      const sw = shooGust(s);
      if (sw) {
        gust(s, ...sw);
        onGust?.(sw);
      }
      step(s, 0.2);
    } else {
      const sw = planGust(s);
      if (!sw) break;
      gust(s, ...sw);
      onGust?.(sw);
      settle(s);
    }
    if (yieldEvery && ++n % yieldEvery === 0) await new Promise((r) => setImmediate(r));
  }
  return s;
}
