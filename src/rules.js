// Pure game rules. No DOM.
//
// Grid: grid[y][x] is a colour char or null (open). y = 0 is the top row.
// The virtual ground row y = h is always open. Cell index = y * w + x,
// with indices up to (h + 1) * w - 1 to cover the ground row.

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

function isWalkable(grid, w, h, x, y) {
  if (x < 0 || x >= w) return false;
  if (y === h) return true;
  return y >= 0 && y < h && grid[y][x] === null;
}

// BFS over open cells from the ground cell (startX, h).
// Returns { dist, parent, w, h }; dist/parent are Int32Array of size w * (h + 1), -1 = not reached.
export function openDistances(grid, startX) {
  const h = grid.length;
  const w = h ? grid[0].length : 0;
  const size = w * (h + 1);
  const dist = new Int32Array(size).fill(-1);
  const parent = new Int32Array(size).fill(-1);
  const queue = new Int32Array(size);
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
    const ns = [
      [x, y - 1],
      [x - 1, y],
      [x + 1, y],
      [x, y + 1],
    ];
    for (const [nx, ny] of ns) {
      if (!isWalkable(grid, w, h, nx, ny)) continue;
      const j = ny * w + nx;
      if (dist[j] !== -1) continue;
      dist[j] = d;
      parent[j] = i;
      queue[tail++] = j;
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
