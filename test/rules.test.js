import { describe, it, expect } from 'vitest';
import { mulberry32, parseLevel, openDistances, reachableColours } from '../src/rules.js';

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
