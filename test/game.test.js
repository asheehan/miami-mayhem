import { describe, it, expect } from 'vitest';
import { createGame, placeBlock, tick, isStuck, slotX } from '../src/games/pixel-ants/game.js';
import { SLOT_Y } from '../src/games/pixel-ants/constants.js';

const tiny = { name: 'Tiny', palette: {}, rows: ['AB', 'CC'], slots: 2, pickerSize: 2 };
const B = (colour, count) => ({ colour, count });
const tinyDeal = () => ({ queue: [B('C', 2), B('A', 1), B('B', 1)] });

const openCount = (state) => state.grid.flat().filter((c) => c === null).length;

function runUntil(state, done, maxTicks = 2000, each) {
  for (let i = 0; i < maxTicks && !done(state); i++) {
    tick(state, 0.05);
    if (each) each(state);
  }
}

// Fills every empty slot with the first non-empty picker block.
function autoPlace(state) {
  for (let s = 0; s < state.slots.length; s++) {
    if (state.slots[s]) continue;
    const i = state.picker.findIndex((b) => b);
    if (i === -1) return;
    placeBlock(state, i, s);
  }
}

describe('slotX', () => {
  it('spreads slots evenly across the grid width', () => {
    const state = createGame({ ...tiny, rows: ['A'.repeat(24)], slots: 3 }, { queue: [B('A', 24)] });
    expect([0, 1, 2].map((i) => slotX(state, i))).toEqual([3.5, 11.5, 19.5]);
  });
});

describe('createGame', () => {
  it('fills the picker from the queue', () => {
    const state = createGame(tiny, tinyDeal());
    expect(state.picker).toEqual([B('C', 2), B('A', 1)]);
    expect(state.queue).toEqual([B('B', 1)]);
    expect(state.slots).toEqual([null, null]);
    expect(state.remaining).toBe(4);
    expect(state.status).toBe('playing');
    expect(state.ants).toEqual([]);
    expect(state.w).toBe(2);
    expect(state.h).toBe(2);
  });

  it('does not share block objects with the deal', () => {
    const deal = tinyDeal();
    const state = createGame(tiny, deal);
    placeBlock(state, 0, 0);
    runUntil(state, (s) => s.slots[0] === null);
    expect(deal.queue[0]).toEqual(B('C', 2));
  });
});

describe('placeBlock', () => {
  it('moves a block into an empty slot and refills that picker space', () => {
    const state = createGame(tiny, tinyDeal());
    expect(placeBlock(state, 0, 0)).toBe(true);
    expect(state.slots[0]).toMatchObject({ colour: 'C', count: 2, out: 0 });
    expect(state.picker).toEqual([B('B', 1), B('A', 1)]);
    expect(state.queue).toEqual([]);
  });

  it('rejects an occupied slot and leaves state unchanged', () => {
    const state = createGame(tiny, tinyDeal());
    placeBlock(state, 0, 0);
    const before = structuredClone(state);
    expect(placeBlock(state, 1, 0)).toBe(false);
    expect(state).toEqual(before);
  });

  it('rejects an empty picker space and leaves state unchanged', () => {
    const state = createGame(tiny, { queue: [B('C', 2)] });
    expect(state.picker).toEqual([B('C', 2), null]);
    const before = structuredClone(state);
    expect(placeBlock(state, 1, 0)).toBe(false);
    expect(state).toEqual(before);
  });

  it('rejects out-of-range indices', () => {
    const state = createGame(tiny, tinyDeal());
    expect(placeBlock(state, 5, 0)).toBe(false);
    expect(placeBlock(state, 0, 5)).toBe(false);
    expect(placeBlock(state, -1, 0)).toBe(false);
  });

  it('leaves picker spaces empty once the queue is empty', () => {
    const state = createGame(tiny, tinyDeal());
    placeBlock(state, 0, 0); // C out, B in
    placeBlock(state, 1, 1); // A out, nothing left
    expect(state.picker).toEqual([B('B', 1), null]);
  });
});

describe('tick', () => {
  it('ants take the slotted colour and the slot frees when done', () => {
    const state = createGame(tiny, tinyDeal());
    placeBlock(state, 0, 0);
    runUntil(state, (s) => s.slots[0] === null);
    expect(state.slots[0]).toBeNull();
    expect(state.grid[1]).toEqual([null, null]);
    expect(state.grid[0]).toEqual(['A', 'B']);
    expect(state.remaining).toBe(2);
    expect(state.ants).toEqual([]);
  });

  it('count only drops when an ant gets home', () => {
    const state = createGame(tiny, tinyDeal());
    placeBlock(state, 0, 0);
    tick(state, 0.01);
    expect(state.ants.length).toBe(1);
    expect(state.slots[0].count).toBe(2);
    expect(state.slots[0].out).toBe(1);
    // The pixel is taken when the ant reaches it, before it gets home.
    const ant = state.ants[0];
    runUntil(state, (s) => s.ants[0] !== ant || ant.phase === 'back');
    expect(ant.phase).toBe('back');
    expect(state.grid[ant.target.y][ant.target.x]).toBeNull();
    expect(state.slots[0].count).toBe(2);
    runUntil(state, (s) => !s.ants.includes(ant));
    expect(state.slots[0].count).toBe(1);
  });

  it('starts each ant at its slot and moves it toward the target', () => {
    const state = createGame(tiny, tinyDeal());
    placeBlock(state, 1, 1);
    tick(state, 0.01);
    expect(state.ants.length).toBe(0); // A is not reachable yet
    placeBlock(state, 0, 0);
    tick(state, 0);
    const ant = state.ants[0];
    expect(ant.pos.x).toBeCloseTo(slotX(state, 0));
    expect(ant.pos.y).toBeCloseTo(state.h + SLOT_Y);
    tick(state, 0.05);
    expect(ant.pos.y).toBeLessThan(state.h + SLOT_Y);
  });

  it('never sends more ants than the block count', () => {
    const level = { ...tiny, rows: ['CCCCC'], slots: 1, pickerSize: 1 };
    const state = createGame(level, { queue: [B('C', 2), B('C', 3)] });
    placeBlock(state, 0, 0);
    let maxOut = 0;
    runUntil(state, (s) => s.slots[0] === null, 2000, (s) => {
      if (s.slots[0]) maxOut = Math.max(maxOut, s.slots[0].out);
    });
    expect(maxOut).toBe(2);
    expect(openCount(state)).toBe(2);
    expect(state.remaining).toBe(3);
  });

  it('never gives two ants the same target', () => {
    const level = { ...tiny, rows: ['CCCCCC', 'CCCCCC', 'CCCCCC'], slots: 2, pickerSize: 2 };
    const state = createGame(level, { queue: [B('C', 9), B('C', 9)] });
    placeBlock(state, 0, 0);
    placeBlock(state, 1, 1);
    let maxAnts = 0;
    runUntil(state, (s) => s.status !== 'playing', 5000, (s) => {
      const keys = s.ants.filter((a) => a.phase === 'out').map((a) => `${a.target.x},${a.target.y}`);
      expect(new Set(keys).size).toBe(keys.length);
      maxAnts = Math.max(maxAnts, s.ants.length);
    });
    expect(maxAnts).toBeGreaterThan(2);
    expect(state.status).toBe('won');
  });

  it('wins only once the grid is empty and every ant is home', () => {
    const state = createGame(tiny, tinyDeal());
    let sawWonWithAnts = false;
    let sawEmptyWithAnts = false;
    autoPlace(state);
    runUntil(state, (s) => s.status !== 'playing', 5000, (s) => {
      if (s.status === 'won' && s.ants.length > 0) sawWonWithAnts = true;
      if (s.remaining === 0 && s.ants.length > 0) sawEmptyWithAnts = true;
      autoPlace(s);
    });
    expect(state.status).toBe('won');
    expect(state.remaining).toBe(0);
    expect(sawWonWithAnts).toBe(false);
    expect(sawEmptyWithAnts).toBe(true);
  });

  it('does nothing once the game is over', () => {
    const state = createGame(tiny, { queue: [B('A', 1), B('B', 1), B('C', 2)] });
    placeBlock(state, 0, 0);
    placeBlock(state, 1, 1);
    tick(state, 0.05);
    expect(state.status).toBe('stuck');
    const before = structuredClone(state);
    tick(state, 0.05);
    expect(state).toEqual(before);
  });
});

describe('stuck', () => {
  it('is stuck when all slots hold unreachable colours', () => {
    const state = createGame(tiny, { queue: [B('A', 1), B('B', 1), B('C', 2)] });
    placeBlock(state, 0, 0);
    placeBlock(state, 1, 1);
    expect(isStuck(state)).toBe(true);
    tick(state, 0.05);
    expect(state.status).toBe('stuck');
  });

  it('is not stuck while a slot is empty', () => {
    const state = createGame(tiny, { queue: [B('A', 1), B('B', 1), B('C', 2)] });
    placeBlock(state, 0, 0);
    tick(state, 0.05);
    expect(isStuck(state)).toBe(false);
    expect(state.status).toBe('playing');
  });

  it('is not stuck while an ant is out', () => {
    // The only slot is full and its one C pixel is reserved by a walking ant.
    const level = { ...tiny, rows: ['A', 'C'], slots: 1, pickerSize: 1 };
    const state = createGame(level, { queue: [B('C', 1), B('A', 1)] });
    placeBlock(state, 0, 0);
    tick(state, 0.01);
    expect(state.ants.length).toBe(1);
    expect(isStuck(state)).toBe(false);
  });
});
