import { describe, it, expect } from 'vitest';
import { botMove, dealLevel } from '../src/games/pixel-ants/deal.js';
import { createGame, placeBlock, tick } from '../src/games/pixel-ants/game.js';
import { levels, doubled } from '../src/games/pixel-ants/levels/index.js';
import { HARD } from '../src/games/pixel-ants/constants.js';

describe('bot playthrough', { timeout: 120_000 }, () => {
  // Robot is deliberately very hard for the simple bot, so it is left out.
  for (const level of levels.filter((l) => l.name !== 'Robot')) {
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

describe('bot playthrough on hard', { timeout: 120_000 }, () => {
  it('Rocket at double resolution: the bot wins seeds 1-3', async () => {
    const level = doubled(levels[0], HARD);
    for (let seed = 1; seed <= 3; seed++) {
      await new Promise((resolve) => setImmediate(resolve));
      const deal = dealLevel(level, seed);
      expect(deal.queue.reduce((n, b) => n + b.count, 0)).toBe(48 * 64);
      expect(Math.max(...deal.queue.map((b) => b.count))).toBeLessThanOrEqual(80);
      const state = createGame(level, deal);
      for (let i = 0; i < 400000 && state.status === 'playing'; i++) {
        let move;
        while ((move = botMove(state))) placeBlock(state, move.pickerIndex, move.slotIndex);
        tick(state, 0.05);
      }
      expect(state.status).toBe('won');
    }
  });
});
