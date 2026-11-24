// Domino Dash bot. Pure. Lays a level's route the way a finger would (a stroke per line, moved
// a few units at a time) and lets the chain fall. Used by the tests, the ?debug solver and the
// ghost finger on the first level (which traces the route's first line).
import { createLevel, beginStroke, strokeTo, endStroke, go, step, settled } from './sim.js';

const DT = 1 / 60;

// Drag along one line of [x, y] points, starting at its first point.
export function drawLine(s, line, stepLen = 4) {
  const [x0, y0] = line[0];
  if (!beginStroke(s, x0, y0)) return false;
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = line[i - 1];
    const [bx, by] = line[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / stepLen));
    for (let k = 1; k <= n; k++) strokeTo(s, ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n);
  }
  endStroke(s);
  return true;
}

// Lay every line of a route. Returns false if a line could not start (no open end there).
export function layRoute(s, route, stepLen = 4) {
  for (const line of route) if (!drawLine(s, line, stepLen)) return false;
  return true;
}

// Press GO and run until the chain has finished (won and settled, or stopped).
export function playOut(s, maxSeconds = 60) {
  go(s);
  const end = s.time + maxSeconds;
  while (s.time < end && !settled(s)) step(s, DT);
  return s;
}

// A fresh level, laid along its route and run.
export function solve(def, route = def.route) {
  const s = createLevel(def);
  layRoute(s, route);
  return playOut(s);
}

// The same route with its last line cut short, so the chain stops before the last goal.
export function brokenRoute(route, keep = 0.45) {
  const out = route.map((l) => l.map((p) => [...p]));
  const last = out[out.length - 1];
  const total = last.reduce((n, p, i) => (i ? n + Math.hypot(p[0] - last[i - 1][0], p[1] - last[i - 1][1]) : 0), 0);
  let want = total * keep;
  const cut = [last[0]];
  for (let i = 1; i < last.length; i++) {
    const [ax, ay] = last[i - 1];
    const [bx, by] = last[i];
    const l = Math.hypot(bx - ax, by - ay);
    if (l >= want) {
      cut.push([ax + ((bx - ax) * want) / l, ay + ((by - ay) * want) / l]);
      break;
    }
    cut.push([bx, by]);
    want -= l;
  }
  out[out.length - 1] = cut;
  return out;
}
