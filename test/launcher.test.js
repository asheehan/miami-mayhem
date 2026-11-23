import { describe, it, expect } from 'vitest';
import { launcherButtons, pageCount, PAGE_SIZE } from '../src/launcher.js';

describe('launcherButtons', () => {
  const game = (id) => ({ id, title: id });
  for (const [w, h] of [[820, 1180], [390, 844]]) {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      it(`${w}x${h}: ${n} game(s) fit on screen below the title without overlapping`, () => {
        const buttons = launcherButtons(w, h, Array.from({ length: n }, (_, i) => game(`g${i}`)));
        expect(buttons.filter((b) => b.id === 'game').map((b) => b.index)).toEqual([...Array(n).keys()]);
        // a gap in the last row leaves room for one "more soon" tile
        const cols = n > 4 ? 3 : 2;
        expect(buttons.filter((b) => b.id === 'soon').length).toBe(n % cols ? 1 : 0);
        for (const b of buttons) {
          expect(b.x).toBeGreaterThanOrEqual(0);
          expect(b.x + b.w).toBeLessThanOrEqual(w);
          expect(b.y).toBeGreaterThanOrEqual(h * 0.3);
          expect(b.y + b.h).toBeLessThanOrEqual(h);
          expect(b.w).toBeGreaterThanOrEqual(n > 4 ? 95 : 120);
        }
        for (let i = 0; i < buttons.length; i++) {
          for (let j = i + 1; j < buttons.length; j++) {
            const a = buttons[i];
            const b = buttons[j];
            expect(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h).toBe(false);
          }
        }
      });
    }
    for (const n of [10, 12, 18, 19]) {
      it(`${w}x${h}: ${n} games are split into pages of nine with arrows and dots`, () => {
        const all = Array.from({ length: n }, (_, i) => game(`g${i}`));
        const pages = pageCount(all);
        expect(pages).toBe(Math.ceil(n / PAGE_SIZE));
        const seen = [];
        let tile = null;
        for (let p = 0; p < pages; p++) {
          const buttons = launcherButtons(w, h, all, p);
          const tiles = buttons.filter((b) => b.id === 'game');
          seen.push(...tiles.map((b) => b.index));
          // tiles are the same size and place on every page
          tile ??= tiles[0];
          expect(tiles[0]).toMatchObject({ x: tile.x, y: tile.y, w: tile.w, h: tile.h });
          expect(buttons.some((b) => b.id === 'prev')).toBe(p > 0);
          expect(buttons.some((b) => b.id === 'next')).toBe(p < pages - 1);
          expect(buttons.find((b) => b.id === 'dots')).toMatchObject({ page: p, pages });
          expect(buttons.filter((b) => b.id === 'soon').length).toBe(tiles.length < PAGE_SIZE ? 1 : 0);
          for (const b of buttons) {
            expect(b.x).toBeGreaterThanOrEqual(0);
            expect(b.x + b.w).toBeLessThanOrEqual(w);
            expect(b.y).toBeGreaterThanOrEqual(h * 0.3);
            expect(b.y + b.h).toBeLessThanOrEqual(h);
            if (b.id === 'game') expect(b.w).toBeGreaterThanOrEqual(95);
          }
          for (let i = 0; i < buttons.length; i++) {
            for (let j = i + 1; j < buttons.length; j++) {
              const a = buttons[i];
              const b = buttons[j];
              expect(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h).toBe(false);
            }
          }
        }
        expect(seen).toEqual([...Array(n).keys()]);
        // a page past the end shows the last page
        expect(launcherButtons(w, h, all, 99).find((b) => b.id === 'dots').page).toBe(pages - 1);
      });
    }
  }
});
