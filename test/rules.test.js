import { describe, it, expect } from 'vitest';
import {
  mulberry32,
  parseLevel,
  openDistances,
  reachableColours,
  splitBlocks,
  buildQueue,
} from '../src/rules.js';
import { levels } from '../src/levels/index.js';

// Builds a grid from row strings; '.' means open.
function g(rows) {
  return rows.map((r) => [...r].map((ch) => (ch === '.' ? null : ch)));
}

const set = (s) => new Set(s);

describe('mulberry32', () => {
  it('is deterministic and in [0, 1)', () => {
    const a = mulberry32(1);
    const b = mulberry32(1);
    const xs = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(xs);
    for (const x of xs) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('differs between seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe('parseLevel', () => {
  it('turns rows into a full grid of chars', () => {
    expect(parseLevel({ rows: ['AB', 'CC'] })).toEqual([['A', 'B'], ['C', 'C']]);
  });
});

describe('reachableColours', () => {
  it('full grid: only the bottom row', () => {
    expect(reachableColours(g(['AB', 'CC']))).toEqual(set(['C']));
  });

  it('a pixel above an open bottom cell is reachable', () => {
    // B touches only A and C, so it is not reachable.
    expect(reachableColours(g(['AB', '.C']))).toEqual(set(['A', 'C']));
  });

  it('an open pocket not connected to the ground does not count', () => {
    expect(reachableColours(g(['A.B', 'CCC']))).toEqual(set(['C']));
  });

  it('reaches around a corner', () => {
    // Open path goes up the right column, then left along the top row to A.
    expect(reachableColours(g(['A..', 'BC.']))).toEqual(set(['A', 'B', 'C']));
  });

  it('does not reach through diagonals', () => {
    // A touches only B and C; B touches the open right column.
    expect(reachableColours(g(['AB.', 'C..']))).toEqual(set(['B', 'C']));
    // The open cell at (1,0) touches (2,1) only diagonally, so it is a pocket and A is not reachable.
    expect(reachableColours(g(['A.B', 'CC.']))).toEqual(set(['B', 'C']));
  });

  it('ignores reserved pixels', () => {
    // index = y * w + x; B is at (0,1) -> 1.
    expect(reachableColours(g(['A', 'B']), new Set([1]))).toEqual(set([]));
  });

  it('empty grid has nothing reachable', () => {
    expect(reachableColours(g(['..', '..']))).toEqual(set([]));
  });
});

describe('openDistances', () => {
  it('BFS distances from a ground cell', () => {
    const { dist, w, h } = openDistances(g(['A.', '..']), 0);
    expect(w).toBe(2);
    expect(h).toBe(2);
    const at = (x, y) => dist[y * w + x];
    expect(at(0, 2)).toBe(0);
    expect(at(1, 2)).toBe(1);
    expect(at(0, 1)).toBe(1);
    expect(at(1, 0)).toBe(3);
    expect(at(0, 0)).toBe(-1);
  });

  it('parent links lead back to the start', () => {
    const { dist, parent, w } = openDistances(g(['A.', '..']), 0);
    let i = 0 * w + 1; // (1,0)
    let steps = 0;
    while (parent[i] !== -1) {
      i = parent[i];
      steps++;
    }
    expect(i).toBe(2 * w + 0);
    expect(steps).toBe(dist[1]);
  });
});

describe('splitBlocks', () => {
  it('keeps totals of 40 or less whole', () => {
    expect(splitBlocks(7)).toEqual([7]);
    expect(splitBlocks(40)).toEqual([40]);
  });

  it('splits larger totals into parts of 10-40 that sum exactly', () => {
    for (const total of [41, 50, 99, 188]) {
      for (let seed = 1; seed <= 50; seed++) {
        const parts = splitBlocks(total, mulberry32(seed));
        expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
        for (const p of parts) {
          expect(p).toBeGreaterThanOrEqual(10);
          expect(p).toBeLessThanOrEqual(40);
        }
      }
    }
  });
});

describe('buildQueue', () => {
  it('Dino: blocks sum to each colour total and to 768', () => {
    const dino = levels.find((l) => l.name === 'Dino');
    const grid = parseLevel(dino);
    const counts = {};
    for (const row of dino.rows) for (const ch of row) counts[ch] = (counts[ch] || 0) + 1;
    for (let seed = 1; seed <= 10; seed++) {
      const queue = buildQueue(grid, mulberry32(seed));
      const sums = {};
      for (const b of queue) sums[b.colour] = (sums[b.colour] || 0) + b.count;
      expect(sums).toEqual(counts);
      expect(queue.reduce((a, b) => a + b.count, 0)).toBe(768);
    }
  });

  it('puts shallow colours first', () => {
    // Mean depths: C 0, B 1, A 2.5. With jitter of 1.5, A can only come first
    // if its key lands in [1, 1.5) and both others land above it.
    for (let seed = 1; seed <= 20; seed++) {
      const queue = buildQueue(g(['AAAA', 'AAAA', 'BBBB', 'CCCC']), mulberry32(seed));
      expect(queue.map((b) => b.colour).sort()).toEqual(['A', 'B', 'C']);
      expect(['B', 'C']).toContain(queue[0].colour);
    }
  });

  it('on a tall grid the bottom colour comes earlier on average', () => {
    const rows = [];
    for (let y = 0; y < 32; y++) rows.push((y < 16 ? 'A' : 'B').repeat(24));
    for (let seed = 1; seed <= 10; seed++) {
      const queue = buildQueue(g(rows), mulberry32(seed));
      const mean = (c) => {
        const idx = queue.map((b, i) => (b.colour === c ? i : -1)).filter((i) => i >= 0);
        return idx.reduce((a, b) => a + b, 0) / idx.length;
      };
      expect(mean('B')).toBeLessThan(mean('A'));
    }
  });
});
