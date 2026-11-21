// Pure game rules. No DOM.
//
// Grid: grid[y][x] is a colour char or null (open). y = 0 is the top row.
// The virtual ground row y = h is always open. Cell index = y * w + x,
// with indices up to (h + 1) * w - 1 to cover the ground row.

import { JITTER } from './constants.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function parseLevel(level) {
  return level.rows.map((row) => [...row]);
}

// Scratch buffers reused between calls, so spawning ants does not create garbage.
let scratch = null;

// BFS over open cells from the ground cell (startX, h).
// Returns { dist, parent, w, h }; dist/parent are Int32Array of size w * (h + 1), -1 = not reached.
// The arrays are reused by the next call, so read them before calling again.
export function openDistances(grid, startX) {
  const h = grid.length;
  const w = h ? grid[0].length : 0;
  const size = w * (h + 1);
  if (!scratch || scratch.size !== size) {
    scratch = { size, dist: new Int32Array(size), parent: new Int32Array(size), queue: new Int32Array(size) };
  }
  const { dist, parent, queue } = scratch;
  dist.fill(-1);
  parent.fill(-1);
  let head = 0;
  let tail = 0;
  const start = h * w + startX;
  dist[start] = 0;
  queue[tail++] = start;
  while (head < tail) {
    const i = queue[head++];
    const x = i % w;
    const y = (i - x) / w;
    const d = dist[i] + 1;
    // up, left, right, down
    if (y > 0 && grid[y - 1][x] === null && dist[i - w] === -1) {
      dist[i - w] = d;
      parent[i - w] = i;
      queue[tail++] = i - w;
    }
    if (x > 0 && (y === h || grid[y][x - 1] === null) && dist[i - 1] === -1) {
      dist[i - 1] = d;
      parent[i - 1] = i;
      queue[tail++] = i - 1;
    }
    if (x < w - 1 && (y === h || grid[y][x + 1] === null) && dist[i + 1] === -1) {
      dist[i + 1] = d;
      parent[i + 1] = i;
      queue[tail++] = i + 1;
    }
    if (y < h && (y + 1 === h || grid[y + 1][x] === null) && dist[i + w] === -1) {
      dist[i + w] = d;
      parent[i + w] = i;
      queue[tail++] = i + w;
    }
  }
  return { dist, parent, w, h };
}

// Mask (Uint8Array, size w * (h + 1)) of open cells connected to the ground row.
export function connectedOpen(grid) {
  const h = grid.length;
  const w = h ? grid[0].length : 0;
  const mask = new Uint8Array(w * (h + 1));
  const queue = new Int32Array(w * (h + 1));
  let head = 0;
  let tail = 0;
  for (let x = 0; x < w; x++) {
    mask[h * w + x] = 1;
    queue[tail++] = h * w + x;
  }
  while (head < tail) {
    const i = queue[head++];
    const x = i % w;
    const y = (i - x) / w;
    if (y > 0 && y - 1 < h && grid[y - 1][x] === null && !mask[i - w]) {
      mask[i - w] = 1;
      queue[tail++] = i - w;
    }
    if (y < h) {
      if (x > 0 && grid[y][x - 1] === null && !mask[i - 1]) {
        mask[i - 1] = 1;
        queue[tail++] = i - 1;
      }
      if (x < w - 1 && grid[y][x + 1] === null && !mask[i + 1]) {
        mask[i + 1] = 1;
        queue[tail++] = i + 1;
      }
      if (y + 1 < h && grid[y + 1][x] === null && !mask[i + w]) {
        mask[i + w] = 1;
        queue[tail++] = i + w;
      }
    }
  }
  return mask;
}

// True if the pixel at (x, y) is 4-adjacent to a ground-connected open cell.
export function isReachable(mask, w, h, x, y) {
  return (
    mask[(y + 1) * w + x] === 1 ||
    (y > 0 && mask[(y - 1) * w + x] === 1) ||
    (x > 0 && mask[y * w + x - 1] === 1) ||
    (x < w - 1 && mask[y * w + x + 1] === 1)
  );
}

// Set of colour chars with at least one reachable pixel, ignoring reserved pixel indices.
export function reachableColours(grid, reserved) {
  const h = grid.length;
  const w = h ? grid[0].length : 0;
  const mask = connectedOpen(grid);
  const out = new Set();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = grid[y][x];
      if (c === null || out.has(c)) continue;
      if (reserved && reserved.has(y * w + x)) continue;
      if (isReachable(mask, w, h, x, y)) out.add(c);
    }
  }
  return out;
}

// Split a colour's pixel total into block counts: whole if <= max, else parts of min..max.
export function splitBlocks(total, rng, min = 10, max = 40) {
  if (total <= max) return [total];
  const parts = [];
  let rest = total;
  while (rest > max) {
    const top = Math.min(max, rest - min);
    const size = min + Math.floor(rng() * (top - min + 1));
    parts.push(size);
    rest -= size;
  }
  parts.push(rest);
  return parts;
}

// All blocks for a grid, shallow first. Each block's key is the mean depth of its
// consecutive share of the colour's depth-sorted pixels, plus jitter in [-jitter, jitter] rows.
// opts = { blockMin, blockMax, scale }; scale widens the jitter for finer grids.
export function buildQueue(grid, rng, opts = {}) {
  const min = opts.blockMin ?? 10;
  const max = opts.blockMax ?? 40;
  const jitter = JITTER * (opts.scale ?? 1);
  const h = grid.length;
  const depths = new Map();
  for (let y = 0; y < h; y++) {
    for (const c of grid[y]) {
      if (c === null) continue;
      if (!depths.has(c)) depths.set(c, []);
      depths.get(c).push(h - 1 - y);
    }
  }
  const keyed = [];
  for (const [colour, ds] of depths) {
    ds.sort((a, b) => a - b);
    let i = 0;
    for (const count of splitBlocks(ds.length, rng, min, max)) {
      let sum = 0;
      for (let k = 0; k < count; k++) sum += ds[i + k];
      i += count;
      keyed.push({ colour, count, key: sum / count + (rng() * 2 - 1) * jitter });
    }
  }
  keyed.sort((a, b) => a.key - b.key);
  return keyed.map(({ colour, count }) => ({ colour, count }));
}

// Picks the next pixel of `colour` for an ant starting at ground cell (startX, h), among
// reachable, unreserved pixels.
//   mode 'rows'    - lowest row first, then the column nearest startX (left before right),
//                    so ants clear a layer side to side before digging deeper.
//   mode 'nearest' - shortest walk first; ties go to the lower row, then the leftmost column.
// Returns { target: {x, y}, path: [{x, y}, ...] } or null; path runs from (startX, h)
// to the open cell next to the target, inclusive.
export function findTarget(grid, reserved, colour, startX, mode = 'nearest') {
  const { dist, parent, w, h } = openDistances(grid, startX);
  const rows = mode === 'rows';
  let bx = -1;
  let by = -1;
  let bd = -1;
  let bfrom = -1;
  for (let y = 0; y < h; y++) {
    const row = grid[y];
    for (let x = 0; x < w; x++) {
      if (row[x] !== colour) continue;
      if (reserved && reserved.has(y * w + x)) continue;
      // nearest reached open neighbour; order: below, left, right, above
      let from = -1;
      let d = -1;
      let i = (y + 1) * w + x;
      if (dist[i] !== -1) {
        d = dist[i];
        from = i;
      }
      if (x > 0) {
        i = y * w + x - 1;
        if (dist[i] !== -1 && (d === -1 || dist[i] < d)) {
          d = dist[i];
          from = i;
        }
      }
      if (x < w - 1) {
        i = y * w + x + 1;
        if (dist[i] !== -1 && (d === -1 || dist[i] < d)) {
          d = dist[i];
          from = i;
        }
      }
      if (y > 0) {
        i = (y - 1) * w + x;
        if (dist[i] !== -1 && (d === -1 || dist[i] < d)) {
          d = dist[i];
          from = i;
        }
      }
      if (from === -1) continue;
      let better;
      if (bfrom === -1) better = true;
      else if (rows) {
        const dx = Math.abs(x - startX);
        const bdx = Math.abs(bx - startX);
        better = y > by || (y === by && (dx < bdx || (dx === bdx && x < bx)));
      } else {
        better = d < bd || (d === bd && (y > by || (y === by && x < bx)));
      }
      if (better) {
        bx = x;
        by = y;
        bd = d;
        bfrom = from;
      }
    }
  }
  if (bfrom === -1) return null;
  const path = [];
  for (let i = bfrom; i !== -1; i = parent[i]) {
    const x = i % w;
    path.push({ x, y: (i - x) / w });
  }
  path.reverse();
  return { target: { x: bx, y: by }, path };
}
