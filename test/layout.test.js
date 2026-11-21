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
