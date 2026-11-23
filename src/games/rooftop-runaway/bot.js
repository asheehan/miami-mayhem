// Rooftop Runaway bot and route finding. Pure.
//
// The nav graph is the street grid plus a grid on every roof, joined by the level's links.
// Tests use it to check that every friend and the getaway can be reached, and the bot uses it
// to steer the leader: round the friends nearest-first, then to the getaway.
import { CELL, PAD, STREET, cellIndex, cellCentre, losClear, segDist } from './world.js';
import { step, setInput, leaderOf } from './sim.js';

const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

export function navGraph(level) {
  if (level._nav) return level._nav;
  const { cols, rows, blocked, buildings } = level;
  const NC = cols * rows;
  const layers = buildings.length + 1;
  const nodeOf = new Int32Array(layers * NC).fill(-1);
  const nodeLayer = [];
  const nodeCell = [];
  const open = (layer, c) => {
    if (layer === STREET) return !blocked[c];
    const m = cellCentre(level, c);
    const b = buildings[layer - 1];
    return m.x > b.x + PAD * 0.5 && m.x < b.x + b.w - PAD * 0.5 && m.y > b.y + PAD * 0.5 && m.y < b.y + b.d - PAD * 0.5;
  };
  for (let layer = 0; layer < layers; layer++) {
    let i0 = 0;
    let i1 = cols - 1;
    let j0 = 0;
    let j1 = rows - 1;
    if (layer > 0) {
      const b = buildings[layer - 1];
      i0 = Math.max(0, Math.floor(b.x / CELL));
      i1 = Math.min(cols - 1, Math.ceil((b.x + b.w) / CELL));
      j0 = Math.max(0, Math.floor(b.y / CELL));
      j1 = Math.min(rows - 1, Math.ceil((b.y + b.d) / CELL));
    }
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const c = j * cols + i;
        if (!open(layer, c)) continue;
        nodeOf[layer * NC + c] = nodeLayer.length;
        nodeLayer.push(layer);
        nodeCell.push(c);
      }
    }
  }
  const n = nodeLayer.length;
  const adj = Array.from({ length: n }, () => []);
  for (let k = 0; k < n; k++) {
    const layer = nodeLayer[k];
    const c = nodeCell[k];
    const ci = c % cols;
    const cj = (c - ci) / cols;
    const at = (i, j) => (i < 0 || j < 0 || i >= cols || j >= rows ? -1 : nodeOf[layer * NC + j * cols + i]);
    for (let d = 0; d < 8; d++) {
      const m = at(ci + N8[d][0], cj + N8[d][1]);
      if (m < 0) continue;
      if (d >= 4 && (at(ci + N8[d][0], cj) < 0 || at(ci, cj + N8[d][1]) < 0)) continue;
      adj[k].push(m);
    }
  }
  const nearest = (layer, x, y) => {
    const c = cellIndex(level, x, y);
    const ci = c % cols;
    const cj = Math.floor(c / cols);
    let best = -1;
    let bestD = Infinity;
    for (let dj = -4; dj <= 4; dj++) {
      for (let di = -4; di <= 4; di++) {
        const i = ci + di;
        const j = cj + dj;
        if (i < 0 || j < 0 || i >= cols || j >= rows) continue;
        const m = nodeOf[layer * NC + j * cols + i];
        if (m < 0) continue;
        const p = cellCentre(level, j * cols + i);
        const dd = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (dd < bestD) {
          bestD = dd;
          best = m;
        }
      }
    }
    return best;
  };
  // link edges, from the node nearest the middle of the trigger to the node nearest its far end
  const linkEdge = new Map(); // `${from}>${to}` -> link
  for (const link of level.links) {
    const am = [(link.a0[0] + link.a1[0]) / 2, (link.a0[1] + link.a1[1]) / 2];
    const bm = [(link.b0[0] + link.b1[0]) / 2, (link.b0[1] + link.b1[1]) / 2];
    const a = nearest(link.from, am[0], am[1]);
    const b = nearest(link.to, bm[0], bm[1]);
    if (a < 0 || b < 0) continue;
    if (segDist(...centre(level, nodeCell[a]), link.a0, link.a1).d > link.reach) continue;
    adj[a].push(b);
    linkEdge.set(`${a}>${b}`, link);
  }
  level._nav = { n, nodeOf, nodeLayer, nodeCell, adj, nearest, linkEdge, NC };
  return level._nav;
}

const centre = (level, c) => {
  const m = cellCentre(level, c);
  return [m.x, m.y];
};

// Breadth-first search from node `from`: { dist, prev }. Stops early once `to` is reached.
export function search(nav, from, to = -1) {
  const dist = new Int32Array(nav.n).fill(-1);
  const prev = new Int32Array(nav.n).fill(-1);
  const queue = new Int32Array(nav.n);
  let head = 0;
  let tail = 0;
  dist[from] = 0;
  queue[tail++] = from;
  while (head < tail) {
    const k = queue[head++];
    if (k === to) break;
    for (const m of nav.adj[k]) {
      if (dist[m] >= 0) continue;
      dist[m] = dist[k] + 1;
      prev[m] = k;
      queue[tail++] = m;
    }
  }
  return { dist, prev };
}

export const nodeAt = (level, layer, x, y) => navGraph(level).nearest(layer, x, y);
export const goalNode = (level) => nodeAt(level, STREET, level.goal.x + level.goal.w / 2, level.goal.y + level.goal.d / 2);

// What can be reached from the start: { goal: bool, friends: [bool], dist }.
export function reachability(level) {
  const nav = navGraph(level);
  const s = nodeAt(level, STREET, level.start.x, level.start.y);
  const { dist } = search(nav, s);
  return {
    goal: dist[goalNode(level)] >= 0,
    friends: level.friends.map((f) => {
      const k = nodeAt(level, f.layer, f.x, f.y);
      return k >= 0 && dist[k] >= 0;
    }),
    dist,
  };
}

// A bot: mode 'all' collects every friend (nearest first), 'goal' heads straight for the getaway.
export function createBot(run, mode = 'all') {
  const level = run.level;
  const nav = navGraph(level);
  const order = [];
  if (mode === 'all') {
    const friendIds = run.people.filter((p) => p.state === 'wait').map((p) => p.id);
    let at = nodeAt(level, STREET, level.start.x, level.start.y);
    const left = new Set(friendIds);
    while (left.size) {
      const { dist } = search(nav, at);
      let best = -1;
      let bestD = Infinity;
      for (const id of left) {
        const p = run.people[id];
        const k = nodeAt(level, p.layer, p.x, p.y);
        if (k >= 0 && dist[k] >= 0 && dist[k] < bestD) {
          bestD = dist[k];
          best = id;
        }
      }
      if (best < 0) break;
      order.push(best);
      left.delete(best);
      const p = run.people[best];
      at = nodeAt(level, p.layer, p.x, p.y);
    }
  }
  return { mode, order, path: null, pathFor: -2, replan: 0, layer: -1 };
}

// The steer the bot wants now, as { x, y }.
export function botInput(run, bot, dt = 1 / 30) {
  const L = leaderOf(run);
  if (!L || L.state !== 'crowd' || run.status !== 'play') return { x: 0, y: 0 };
  const level = run.level;
  const nav = navGraph(level);
  while (bot.order.length && run.people[bot.order[0]].state !== 'wait') bot.order.shift();
  const target = bot.order.length ? bot.order[0] : -1;
  bot.replan -= dt;
  if (!bot.path || bot.pathFor !== target || bot.layer !== L.layer || bot.replan <= 0) {
    const from = nodeAt(level, L.layer, L.x, L.y);
    let to;
    if (target >= 0) {
      const f = run.people[target];
      to = nodeAt(level, f.layer, f.x, f.y);
    } else to = goalNode(level);
    const { dist, prev } = search(nav, from, to);
    const path = [];
    if (dist[to] >= 0) for (let k = to; k >= 0; k = prev[k]) path.unshift(k);
    bot.path = path;
    bot.pathFor = target;
    bot.layer = L.layer;
    bot.replan = 0.4;
  }
  const path = bot.path;
  if (path.length < 2) {
    // at the target cell: walk onto the exact spot
    const t = target >= 0 ? run.people[target] : { x: level.goal.x + level.goal.w / 2, y: level.goal.y + level.goal.d / 2 };
    return toward(L, t.x, t.y);
  }
  // the first link along the path
  let linkK = -1;
  for (let k = 0; k < path.length - 1; k++) {
    if (nav.nodeLayer[path[k]] !== nav.nodeLayer[path[k + 1]] || nav.linkEdge.has(`${path[k]}>${path[k + 1]}`)) {
      linkK = k;
      break;
    }
  }
  const segEnd = linkK >= 0 ? linkK : path.length - 1;
  let aim = Math.min(1, segEnd);
  for (let j = Math.min(segEnd, 24); j >= 1; j--) {
    const [x, y] = centre(level, nav.nodeCell[path[j]]);
    if (L.layer !== STREET || losClear(level, L.x, L.y, x, y, 0.3)) {
      aim = j;
      break;
    }
  }
  if (linkK >= 0 && (aim >= segEnd || linkK === 0)) {
    const link = nav.linkEdge.get(`${path[linkK]}>${path[linkK + 1]}`);
    if (link) {
      const { d, t } = segDist(L.x, L.y, link.a0, link.a1);
      const px = link.a0[0] + (link.a1[0] - link.a0[0]) * t;
      const py = link.a0[1] + (link.a1[1] - link.a0[1]) * t;
      if (d < 0.5) return { x: link.n[0], y: link.n[1] };
      return toward(L, px, py);
    }
  }
  const [x, y] = centre(level, nav.nodeCell[path[aim]]);
  return toward(L, x, y);
}

function toward(L, x, y) {
  const dx = x - L.x;
  const dy = y - L.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return { x: 0, y: 0 };
  return { x: dx / d, y: dy / d };
}

// Play until the run ends or maxSeconds of game time pass.
export async function playBot(run, mode = 'all', { maxSeconds = 240, dt = 1 / 30, yieldEvery = 0 } = {}) {
  const bot = createBot(run, mode);
  let nextYield = yieldEvery;
  while (run.status === 'play' && run.time < maxSeconds) {
    const v = botInput(run, bot, dt);
    setInput(run, v.x, v.y);
    step(run, dt);
    if (yieldEvery && run.time >= nextYield) {
      nextYield += yieldEvery;
      await new Promise((r) => setImmediate(r));
    }
  }
  return run;
}


