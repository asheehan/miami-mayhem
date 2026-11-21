import { describe, it, expect } from 'vitest';
import { botMove, simulateDeal, dealLevel } from '../src/deal.js';
import { createGame, placeBlock } from '../src/game.js';
import { levels } from '../src/levels/index.js';

const tiny = { name: 'Tiny', palette: {}, rows: ['AB', 'CC'], slots: 2, pickerSize: 2 };
const B = (colour, count) => ({ colour, count });

describe('botMove', () => {
  it('prefers the first picker block with a reachable colour', () => {
    const state = createGame(tiny, { queue: [B('A', 1), B('C', 2), B('B', 1)] });
    expect(botMove(state)).toEqual({ pickerIndex: 1, slotIndex: 0 });
  });

  it('falls back to the first picker block', () => {
    const state = createGame(tiny, { queue: [B('A', 1), B('B', 1), B('C', 2)] });
    expect(botMove(state)).toEqual({ pickerIndex: 0, slotIndex: 0 });
  });

  it('uses the first empty slot', () => {
    const state = createGame(tiny, { queue: [B('C', 2), B('A', 1), B('B', 1)] });
    placeBlock(state, 0, 0);
    expect(botMove(state)).toEqual({ pickerIndex: 0, slotIndex: 1 });
  });

  it('skips empty picker spaces', () => {
    const state = createGame(tiny, { queue: [B('C', 2), B('A', 1)] });
    placeBlock(state, 0, 0);
    expect(state.picker[0]).toBeNull();
    expect(botMove(state)).toEqual({ pickerIndex: 1, slotIndex: 1 });
  });

  it('returns null when the slots are full', () => {
    const state = createGame(tiny, { queue: [B('A', 1), B('B', 1), B('C', 2)] });
    placeBlock(state, 0, 0);
    placeBlock(state, 1, 1);
    expect(botMove(state)).toBeNull();
  });

  it('returns null when the picker is empty', () => {
    const state = createGame(tiny, { queue: [B('C', 2)] });
    placeBlock(state, 0, 0);
    expect(botMove(state)).toBeNull();
  });
});

describe('simulateDeal', () => {
  it('passes a winnable deal', () => {
    expect(simulateDeal(tiny, [B('C', 2), B('A', 1), B('B', 1)])).toBe(true);
  });

  it('fails a deal that forces an unreachable block into the only slot', () => {
    const level = { ...tiny, rows: ['A', 'B'], slots: 1, pickerSize: 1 };
    expect(simulateDeal(level, [B('A', 1), B('B', 1)])).toBe(false);
    expect(simulateDeal(level, [B('B', 1), B('A', 1)])).toBe(true);
  });

  it('does not modify the queue it is given', () => {
    const queue = [B('C', 2), B('A', 1), B('B', 1)];
    simulateDeal(tiny, queue);
    expect(queue).toEqual([B('C', 2), B('A', 1), B('B', 1)]);
  });
});

describe('dealLevel', () => {
  for (const level of levels) {
    it(`finds a passing deal for ${level.name}`, () => {
      const deal = dealLevel(level, 1);
      expect(deal.passed).toBe(true);
      expect(deal.seed).toBeGreaterThanOrEqual(1);
      expect(deal.queue.reduce((a, b) => a + b.count, 0)).toBe(768);
    });
  }

  it('is deterministic for a seed', () => {
    expect(dealLevel(levels[0], 7)).toEqual(dealLevel(levels[0], 7));
  });
});
