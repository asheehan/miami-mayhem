// Game state and the tick loop. No DOM.
import { ANT_SPEED, SPAWN_INTERVAL, SLOT_Y } from './constants.js';
import { parseLevel, findTarget, reachableColours } from './rules.js';

// Grid-space x of slot i's centre.
export function slotX(state, i) {
  const n = state.slots.length;
  return ((i + 0.5) * state.w) / n - 0.5;
}

// Ground column an ant from slot i starts its path at.
function slotColumn(state, i) {
  return Math.min(state.w - 1, Math.max(0, Math.round(slotX(state, i))));
}

// deal = { queue: [{ colour, count }] }; options = { antSpeed, spawnInterval } for testing.
export function createGame(level, deal, options = {}) {
  const grid = parseLevel(level);
  const h = grid.length;
  const w = grid[0].length;
  const queue = deal.queue.map((b) => ({ colour: b.colour, count: b.count }));
  const pickerSize = level.pickerSize ?? 9;
  const picker = [];
  for (let i = 0; i < pickerSize; i++) picker.push(queue.length ? queue.shift() : null);
  return {
    level,
    w,
    h,
    grid,
    reserved: new Set(),
    remaining: w * h,
    slots: Array(level.slots ?? 3).fill(null),
    picker,
    queue,
    ants: [],
    status: 'playing',
    time: 0,
    antSpeed: options.antSpeed ?? ANT_SPEED,
    spawnInterval: options.spawnInterval ?? SPAWN_INTERVAL,
  };
}

export function placeBlock(state, pickerIndex, slotIndex) {
  if (state.status !== 'playing') return false;
  if (!(pickerIndex >= 0 && pickerIndex < state.picker.length)) return false;
  if (!(slotIndex >= 0 && slotIndex < state.slots.length)) return false;
  const block = state.picker[pickerIndex];
  if (!block || state.slots[slotIndex]) return false;
  state.slots[slotIndex] = { colour: block.colour, count: block.count, out: 0, cooldown: 0 };
  state.picker[pickerIndex] = state.queue.length ? state.queue.shift() : null;
  return true;
}

export function isStuck(state) {
  if (state.ants.length > 0) return false;
  if (state.slots.some((s) => s === null)) return false;
  const reach = reachableColours(state.grid, state.reserved);
  return !state.slots.some((s) => reach.has(s.colour));
}

// Polyline for an ant: slot centre, then the path cells.
function makeAnt(state, slotIndex, colour, found) {
  const points = [{ x: slotX(state, slotIndex), y: state.h + SLOT_Y }, ...found.path];
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    lengths.push(lengths[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
  }
  return {
    slot: slotIndex,
    colour,
    target: found.target,
    path: found.path,
    points,
    lengths,
    t: 0,
    phase: 'out',
    pos: { ...points[0] },
  };
}

// Position at distance d along the polyline, walked forwards (out) or backwards (back).
function antPosition(ant) {
  const { points, lengths } = ant;
  const total = lengths[lengths.length - 1];
  const d = ant.phase === 'out' ? ant.t : total - ant.t;
  if (d <= 0) return { ...points[0] };
  if (d >= total) return { ...points[points.length - 1] };
  let i = 1;
  while (lengths[i] < d) i++;
  const a = points[i - 1];
  const b = points[i];
  const f = (d - lengths[i - 1]) / (lengths[i] - lengths[i - 1]);
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

function advanceAnts(state, dt) {
  const step = state.antSpeed * dt;
  const keep = [];
  for (const ant of state.ants) {
    const total = ant.lengths[ant.lengths.length - 1];
    ant.t += step;
    if (ant.phase === 'out' && ant.t >= total) {
      const { x, y } = ant.target;
      state.grid[y][x] = null;
      state.reserved.delete(y * state.w + x);
      state.remaining--;
      ant.phase = 'back';
      ant.t = 0;
    } else if (ant.phase === 'back' && ant.t >= total) {
      const slot = state.slots[ant.slot];
      slot.count--;
      slot.out--;
      if (slot.count === 0) state.slots[ant.slot] = null;
      continue;
    }
    ant.pos = antPosition(ant);
    keep.push(ant);
  }
  state.ants = keep;
}

function spawnAnts(state, dt) {
  for (let i = 0; i < state.slots.length; i++) {
    const slot = state.slots[i];
    if (!slot) continue;
    slot.cooldown -= dt;
    if (slot.cooldown > 0 || slot.count - slot.out <= 0) continue;
    const found = findTarget(state.grid, state.reserved, slot.colour, slotColumn(state, i));
    if (!found) continue;
    state.reserved.add(found.target.y * state.w + found.target.x);
    state.ants.push(makeAnt(state, i, slot.colour, found));
    slot.out++;
    slot.cooldown = state.spawnInterval;
  }
}

// Advances ants, spawns new ones, updates status. Callers keep dt <= 0.05.
export function tick(state, dt) {
  if (state.status !== 'playing') return;
  state.time += dt;
  advanceAnts(state, dt);
  spawnAnts(state, dt);
  if (state.remaining === 0 && state.ants.length === 0) state.status = 'won';
  else if (isStuck(state)) state.status = 'stuck';
}
