import { describe, it, expect } from 'vitest';
import { computeLayout } from '../src/render.js';
import { levels } from '../src/levels/index.js';
import { SLOT_Y } from '../src/constants.js';

const level = levels[0];
const W = 24;
const H = 32;
const slotCentreX = (i) => ((i + 0.5) * W) / 3 - 0.5;

const inside = (r, width, height) =>
  r.x >= 0 && r.y >= 0 && r.x + r.w <= width + 1e-6 && r.y + r.h <= height + 1e-6;
const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

for (const [name, width, height, minBlock] of [
  ['iPad portrait', 820, 1180, 44],
  ['phone portrait', 390, 844, 40],
]) {
  describe(`computeLayout at ${name} ${width}x${height}`, () => {
    const L = computeLayout(width, height, level);

    it('has 3 slots and 9 picker spaces', () => {
      expect(L.slotRects.length).toBe(3);
      expect(L.pickerRects.length).toBe(9);
    });

    it('keeps everything inside the canvas', () => {
      const tl = L.toScreen(-0.5, -0.5);
      const br = L.toScreen(W - 0.5, H - 0.5);
      expect(inside({ x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y }, width, height)).toBe(true);
      for (const r of [...L.slotRects, ...L.pickerRects, L.homeBtn]) expect(inside(r, width, height)).toBe(true);
    });

    it('centres slots on their grid-space positions', () => {
      L.slotRects.forEach((r, i) => {
        const c = L.toScreen(slotCentreX(i), H + SLOT_Y);
        expect(r.x + r.w / 2).toBeCloseTo(c.x);
        expect(r.y + r.h / 2).toBeCloseTo(c.y);
      });
    });

    it('maps cells at cell size', () => {
      const a = L.toScreen(0, 0);
      const b = L.toScreen(1, 1);
      expect(b.x - a.x).toBeCloseTo(L.cell);
      expect(b.y - a.y).toBeCloseTo(L.cell);
    });

    it('does not overlap picker spaces, slots or the picture', () => {
      const br = L.toScreen(W - 0.5, H - 0.5);
      const rects = [...L.pickerRects, ...L.slotRects];
      for (let i = 0; i < rects.length; i++) {
        expect(rects[i].y).toBeGreaterThan(br.y);
        for (let j = i + 1; j < rects.length; j++) expect(overlaps(rects[i], rects[j])).toBe(false);
      }
    });

    it(`blocks are at least ${minBlock}px`, () => {
      expect(L.blockSize * L.cell).toBeGreaterThanOrEqual(minBlock);
      for (const r of L.pickerRects) expect(r.w).toBeGreaterThanOrEqual(minBlock);
    });
  });
}

describe('computeLayout column choice', () => {
  it('uses one picker row on a wide canvas', () => {
    const L = computeLayout(2000, 1000, level);
    const ys = new Set(L.pickerRects.map((r) => Math.round(r.y)));
    expect(ys.size).toBe(1);
  });
});

describe('homeButtons paging', () => {
  const eight = Array.from({ length: 8 }, (_, i) => ({ name: `L${i}` }));
  for (const [w, h] of [[820, 1180], [390, 844]]) {
    it(`${w}x${h}: four levels per page with page arrows that fit on screen`, async () => {
      const { homeButtons } = await import('../src/render.js');
      const p0 = homeButtons(w, h, eight, 0);
      const p1 = homeButtons(w, h, eight, 1);
      expect(p0.filter((b) => b.id === 'level').map((b) => b.index)).toEqual([0, 1, 2, 3]);
      expect(p1.filter((b) => b.id === 'level').map((b) => b.index)).toEqual([4, 5, 6, 7]);
      expect(p0.filter((b) => b.id !== 'level').map((b) => b.id)).toEqual(['settings', 'next']);
      expect(p1.filter((b) => b.id !== 'level').map((b) => b.id)).toEqual(['settings', 'prev']);
      for (const b of [...p0, ...p1]) {
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.w).toBeLessThanOrEqual(w);
        expect(b.y + b.h).toBeLessThanOrEqual(h);
      }
      const nav = p0.find((b) => b.id === 'next');
      expect(nav.w).toBeGreaterThanOrEqual(44);
      for (const b of p0.filter((x) => x.id === 'level')) expect(b.y + b.h).toBeLessThanOrEqual(nav.y);
    });
  }

  it('shows no page arrows when everything fits on one page', async () => {
    const { homeButtons } = await import('../src/render.js');
    expect(homeButtons(820, 1180, eight.slice(0, 4), 0).map((b) => b.id)).toEqual(['level', 'level', 'level', 'level', 'settings']);
  });
});

describe('hard difficulty (double resolution)', () => {
  it('doubles every pixel into a 2 x 2 square', async () => {
    const { doubled } = await import('../src/levels/index.js');
    const d = doubled({ name: 'T', palette: {}, rows: ['AB', 'CD'] }, { blockMax: 80 });
    expect(d.rows).toEqual(['AABB', 'AABB', 'CCDD', 'CCDD']);
    expect(d.scale).toBe(2);
    expect(d.blockMax).toBe(80);
  });

  for (const [w, h] of [[820, 1180], [390, 844]]) {
    it(`${w}x${h}: slots, picker and picture sit in the same place as on easy`, async () => {
      const { doubled } = await import('../src/levels/index.js');
      const easy = computeLayout(w, h, level);
      const hard = computeLayout(w, h, doubled(level));
      expect(hard.cell).toBeCloseTo(easy.cell / 2);
      hard.pickerRects.forEach((r, i) => {
        expect(r.x).toBeCloseTo(easy.pickerRects[i].x);
        expect(r.y).toBeCloseTo(easy.pickerRects[i].y);
      });
      hard.slotRects.forEach((r, i) => {
        expect(r.w).toBeCloseTo(easy.slotRects[i].w);
        expect(r.x).toBeCloseTo(easy.slotRects[i].x);
        expect(r.y).toBeCloseTo(easy.slotRects[i].y);
      });
      const a = easy.toScreen(-0.5, -0.5);
      const b = hard.toScreen(-0.5, -0.5);
      expect(b.x).toBeCloseTo(a.x);
      expect(b.y).toBeCloseTo(a.y);
      const c = easy.toScreen(23.5, 31.5);
      const d = hard.toScreen(47.5, 63.5);
      expect(d.x).toBeCloseTo(c.x);
      expect(d.y).toBeCloseTo(c.y);
    });
  }
});
