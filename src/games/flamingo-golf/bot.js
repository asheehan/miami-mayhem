// A simple golfer for tests and debug: tries a grid of angles and powers and takes the
// shot that sinks, or else the one that ends closest to the cup by walking distance
// (around walls and water, not through them). Pure.
import { BALL_R, WALL_HALF, COURSE_W, COURSE_H, inRegion, insidePolygon, wallCaps, simulateShot, cloneState, wait } from './physics.js';

const CELL = 8;

function segDist(x, y, c) {
  const dx = c.x2 - c.x1;
  const dy = c.y2 - c.y1;
  const len2 = dx * dx + dy * dy;
  let u = len2 > 0 ? ((x - c.x1) * dx + (y - c.y1) * dy) / len2 : 0;
  u = Math.max(0, Math.min(1, u));
  return Math.hypot(x - (c.x1 + dx * u), y - (c.y1 + dy * u));
}

// Walking distance from every grid cell to the cup (Dijkstra on an 8-way grid).
export function distanceField(hole) {
  const cols = Math.ceil(COURSE_W / CELL);
  const rows = Math.ceil(COURSE_H / CELL);
  const walls = wallCaps(hole);
  const free = new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = (i + 0.5) * CELL;
      const y = (j + 0.5) * CELL;
      let ok = insidePolygon(hole.outline, x, y);
      ok = ok && !hole.water.some((r) => inRegion(r, x, y));
      ok = ok && walls.every((c) => segDist(x, y, c) > WALL_HALF + BALL_R * 0.6);
      ok = ok && hole.bumpers.every(([bx, by, r]) => Math.hypot(x - bx, y - by) > r + BALL_R * 0.6);
      free[j * cols + i] = ok ? 1 : 0;
    }
  }
  const dist = new Float64Array(cols * rows).fill(Infinity);
  const ci = Math.min(cols - 1, Math.floor(hole.cup[0] / CELL));
  const cj = Math.min(rows - 1, Math.floor(hole.cup[1] / CELL));
  dist[cj * cols + ci] = 0;
  // small grid: a simple bucketless Dijkstra with a sorted frontier is plenty
  const open = [cj * cols + ci];
  const done = new Uint8Array(cols * rows);
  const steps = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
  while (open.length) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (dist[open[k]] < dist[open[bi]]) bi = k;
    const cur = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    if (done[cur]) continue;
    done[cur] = 1;
    const i = cur % cols;
    const j = (cur - i) / cols;
    for (const [di, dj, w] of steps) {
      const ni = i + di;
      const nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue;
      const nk = nj * cols + ni;
      if (!free[nk] || done[nk]) continue;
      const nd = dist[cur] + w * CELL;
      if (nd < dist[nk]) {
        dist[nk] = nd;
        open.push(nk);
      }
    }
  }
  return (x, y) => {
    const i = Math.max(0, Math.min(cols - 1, Math.floor(x / CELL)));
    const j = Math.max(0, Math.min(rows - 1, Math.floor(y / CELL)));
    let best = dist[j * cols + i];
    if (best === Infinity) {
      for (let r = 1; r < 4 && best === Infinity; r++) {
        for (let dj = -r; dj <= r; dj++) {
          for (let di = -r; di <= r; di++) {
            const ni = i + di;
            const nj = j + dj;
            if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue;
            best = Math.min(best, dist[nj * cols + ni] + Math.hypot(di, dj) * CELL);
          }
        }
      }
    }
    return best === Infinity ? 1e6 : best;
  };
}

// Best next shot from state s, for a steady but imperfect player: every shot on a grid of
// angles and powers is tried, then the most promising few are tried again with small aim
// and power mistakes, and the one that does best on average is taken. If nothing sinks
// from here, it also tries waiting a moment (for the gator's mouth or a flamingo).
// Returns { wait, angle, power, sinks, score }.
export function planShot(s, field = distanceField(s.hole), opts = {}) {
  const angles = opts.angles ?? 48;
  const powers = opts.powers ?? [0.15, 0.25, 0.35, 0.45, 0.55, 0.7, 0.85, 1];
  const waits = opts.waits ?? [0, 0.5, 1, 1.5, 2, 2.5];
  const errors = opts.errors ?? [[0, 0], [0.05, 0], [-0.05, 0], [0, 0.05], [0, -0.05], [0.035, 0.035], [-0.035, -0.035]];
  const keep = opts.keep ?? 16;
  const outcome = (base, angle, power) => {
    const r = simulateShot(base, angle, power);
    if (r.status === 'sunk') return 0;
    if (r.status === 'splash') return field(s.ball.x, s.ball.y) + 150;
    return field(r.ball.x, r.ball.y);
  };
  let best = null;
  for (const w of waits) {
    const base = cloneState(s);
    if (w > 0) wait(base, w);
    if (base.status !== 'ready') continue;
    const tried = [];
    for (let a = 0; a < angles; a++) {
      const angle = (a / angles) * Math.PI * 2;
      for (const power of powers) tried.push({ angle, power, first: outcome(base, angle, power) });
    }
    tried.sort((p, q) => p.first - q.first);
    for (const c of tried.slice(0, keep)) {
      let sum = 0;
      let sunk = 0;
      for (const [da, dp] of errors) {
        const o = outcome(base, c.angle + da, Math.min(1, Math.max(0.05, c.power * (1 + dp))));
        sum += o;
        if (o === 0) sunk++;
      }
      const score = sum / errors.length + w * 5;
      if (!best || score < best.score) best = { wait: w, angle: c.angle, power: c.power, score, sinks: c.first === 0, reliable: sunk / errors.length };
    }
    if (best && best.reliable >= 0.5) break;
  }
  return best;
}
