import { describe, it, expect } from 'vitest';
import { levels } from '../src/levels/index.js';

describe('levels', () => {
  it('ships the four pictures in order', () => {
    expect(levels.map((l) => l.name)).toEqual(['Rocket', 'Dino', 'Reef', 'Rainbow']);
  });

  for (const level of levels) {
    describe(level.name, () => {
      it('is 24 wide by 32 tall', () => {
        expect(level.rows.length).toBe(32);
        for (const row of level.rows) expect(row.length).toBe(24);
      });

      it('has a hex palette entry for every char', () => {
        for (const row of level.rows) {
          for (const ch of row) expect(level.palette[ch]).toMatch(/^#[0-9a-f]{6}$/);
        }
      });

      it('has at least 10 distinct colours', () => {
        expect(new Set(level.rows.join('')).size).toBeGreaterThanOrEqual(10);
      });

      it('uses default slots and picker size', () => {
        expect(level.slots).toBe(3);
        expect(level.pickerSize).toBe(9);
      });
    });
  }
});
