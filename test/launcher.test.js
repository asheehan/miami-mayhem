import { describe, it, expect } from 'vitest';
import { launcherButtons } from '../src/launcher.js';

describe('launcherButtons', () => {
  const game = (id) => ({ id, title: id });
  for (const [w, h] of [[820, 1180], [390, 844]]) {
    for (const n of [1, 2, 3, 4]) {
      it(`${w}x${h}: ${n} game(s) fit on screen below the title without overlapping`, () => {
        const buttons = launcherButtons(w, h, Array.from({ length: n }, (_, i) => game(`g${i}`)));
        expect(buttons.filter((b) => b.id === 'game').map((b) => b.index)).toEqual([...Array(n).keys()]);
        // an odd number of games leaves room for a "more soon" tile
        expect(buttons.filter((b) => b.id === 'soon').length).toBe(n % 2);
        for (const b of buttons) {
          expect(b.x).toBeGreaterThanOrEqual(0);
          expect(b.x + b.w).toBeLessThanOrEqual(w);
          expect(b.y).toBeGreaterThanOrEqual(h * 0.3);
          expect(b.y + b.h).toBeLessThanOrEqual(h);
          expect(b.w).toBeGreaterThanOrEqual(120);
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
  }
});
