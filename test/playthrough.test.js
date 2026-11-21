import { describe, it, expect } from 'vitest';
import { botMove, dealLevel } from '../src/deal.js';
import { createGame, placeBlock, tick } from '../src/game.js';
import { levels } from '../src/levels/index.js';

describe('bot playthrough', { timeout: 120_000 }, () => {
  for (const level of levels) {
    it(`${level.name}: the bot wins seeds 1-20 in the real game loop`, async () => {
      const failures = [];
      for (let seed = 1; seed <= 20; seed++) {
        // Yield between seeds so the test worker can answer the runner on slow machines.
        await new Promise((resolve) => setImmediate(resolve));
        const deal = dealLevel(level, seed);
        const state = createGame(level, deal);
        for (let i = 0; i < 200000 && state.status === 'playing'; i++) {
          let move;
          while ((move = botMove(state))) placeBlock(state, move.pickerIndex, move.slotIndex);
          tick(state, 0.05);
        }
        if (state.status !== 'won') failures.push({ seed, passed: deal.passed, status: state.status, remaining: state.remaining });
      }
      expect(failures).toEqual([]);
    });
  }
});
