// Deal generation and the deal-check bot. No DOM.
import { MAX_DEAL_TRIES } from './constants.js';
import { mulberry32, parseLevel, buildQueue, reachableColours } from './rules.js';
import { createGame, placeBlock, tick } from './game.js';

// Tick length for the headless deal check; main.js clamps frames to the same maximum.
export const SIM_DT = 0.05;

// Bot move: first empty slot; first picker block whose colour has a reachable pixel,
// else the first picker block. Returns { pickerIndex, slotIndex } or null.
export function botMove(state) {
  const slotIndex = state.slots.indexOf(null);
  if (slotIndex === -1) return null;
  const reach = reachableColours(state.grid, state.reserved);
  let first = -1;
  for (let i = 0; i < state.picker.length; i++) {
    const b = state.picker[i];
    if (!b) continue;
    if (reach.has(b.colour)) return { pickerIndex: i, slotIndex };
    if (first === -1) first = i;
  }
  return first === -1 ? null : { pickerIndex: first, slotIndex };
}

// Runs the bot on a deal headlessly and returns true if it clears the grid.
//
// This plays the real game loop (createGame + tick with ants) rather than an ant-free
// shortcut. In the real game a slot only frees when its last ant walks home, so the board
// the bot sees when it picks the next block depends on ant timing; an instant-dig
// simulation picks different blocks, and on the shipped levels it agreed with the real
// loop on too few deals. Running the same loop makes the deal check exact for the bot.
// Cost is roughly 100 ms per deal tried on a laptop.
export function simulateDeal(level, queue, options = {}, maxTicks = 200000) {
  const state = createGame(level, { queue }, options);
  for (let i = 0; i < maxTicks && state.status === 'playing'; i++) {
    let move;
    while ((move = botMove(state))) placeBlock(state, move.pickerIndex, move.slotIndex);
    tick(state, SIM_DT);
  }
  return state.status === 'won';
}

// Tries seeds seed, seed + 1, ... up to MAX_DEAL_TRIES. Returns the first passing deal,
// or the last one tried with passed = false.
// `options` are the createGame options the real game will use (e.g. targeting).
export function dealLevel(level, seed, options = {}) {
  const grid = parseLevel(level);
  let deal = null;
  for (let t = 0; t < MAX_DEAL_TRIES; t++) {
    const s = seed + t;
    const queue = buildQueue(grid, mulberry32(s), level);
    const passed = simulateDeal(level, queue, options);
    deal = { queue, seed: s, passed };
    if (passed) return deal;
  }
  return deal;
}
