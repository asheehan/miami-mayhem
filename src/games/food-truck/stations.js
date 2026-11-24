// Food Truck Chef stations: one state machine per dish, worked by the same few one-finger
// actions everywhere. Pure: no DOM, no clocks, no randomness. The UI turns touches into these:
//
//   add(st, ing)              an ingredient dropped on the food (or a tub tapped)
//   grabTool(st, tool)        a shaker / ladle / cheese bag picked up (false: it stays put)
//   rub(st, tool, dist, u, v) the tool rubbed over the food: dist finger travel, (u, v) in 0..1
//   setHold(st, on)           the blend button / press handle held down or let go
//   moveTo(st, where)         the food carried somewhere: 'cup' (pour), 'press', 'oven'
//   pullOut(st, id)           a piece lifted out of the fryer, or the pizza out of the oven ('oven')
//   restart(st)               the bin: start this dish again
//   stepStation(st, dt)       every frame
//
// With a customer's order (st.order) wrong things bounce back and count as slips. In the free
// kitchen (st.free) anything goes and nothing ever finishes by itself: you feed it to the gator.
import { BINS, FREE_EXTRAS, FRUITS, FLAVOURS, FRIED, SHAKE_FOR, PIZZA_TOPPINGS, TACO_FILLINGS, TACO_TOPPINGS, LAYERS } from './recipes.js';

// ---------------------------------------------------------------------------------------------
// Tuning
// ---------------------------------------------------------------------------------------------

export const BLEND_TIME = 3.2; // seconds of holding to fill the blend bar
export const PRESS_TIME = 3.6; // seconds of holding to fill the press bar
export const GOOD_LO = 0.5; // the green part of a bar: let go in here for a perfect result
export const GOOD_HI = 0.86; //   (1.15 s wide when blending, 1.3 s when pressing)
export const FRY_GOLD = 3.5; // seconds in the oil until a piece is golden (ding!)
export const FRY_BURN = 10; // ...and until it turns dark (still served, fewer stars)
export const BAKE_GOLD = 4.5;
export const BAKE_BURN = 12;
export const FRY_SLOTS = 4; // pieces in the oil at once
export const RUB_NEED = { sprinkles: 380, sugar: 380, salt: 380, sauce: 620, mozzarella: 460 }; // field units rubbed
export const FREE_CAP = 12; // the most of anything the free kitchen piles up
export const MARKS_KEEP = 90;

export const RUB_TOOLS = ['sprinkles', 'sugar', 'salt', 'sauce', 'mozzarella'];
const EVENTS_KEEP = 30;

// ---------------------------------------------------------------------------------------------

const FIRST_PHASE = { smoothie: 'fill', sandwich: 'build', taco: 'build', icecream: 'scoop', fried: 'fry', pizza: 'sauce' };

function emptyDish(kind) {
  switch (kind) {
    case 'smoothie': return { kind, fruits: [], toppers: [], extras: [] };
    case 'sandwich': return { kind, layers: [], extras: [] };
    case 'taco': return { kind, tortilla: false, fillings: [], extras: [] };
    case 'icecream': return { kind, scoops: [], sprinkles: false, cherry: false, extras: [] };
    case 'fried': return { kind, pieces: [], cooks: [], shake: null, extras: [] };
    case 'pizza': return { kind, sauce: false, cheese: false, toppings: [], extras: [] };
    default: throw new Error(`no station for ${kind}`);
  }
}

export function createStation(kind, order = null, { free = false } = {}) {
  const st = {
    kind,
    order,
    free: free || !order,
    phase: FIRST_PHASE[kind],
    time: 0,
    phaseT: 0,
    meter: 0, // blend / press bar, 0..1
    holding: false,
    cook: null, // 'good' | 'over' once blended / pressed / baked
    dish: emptyDish(kind),
    rub: {}, // tool -> distance rubbed
    marks: [], // where rubbing happened, for drawing: { tool, u, v }
    pieces: [], // fryer: { id, food, t, out }
    pieceSeq: 0,
    oven: 0, // seconds in the oven
    slips: 0,
    events: [],
    seq: 0,
  };
  if (st.free && kind === 'pizza') st.phase = 'build';
  return st;
}

function emit(st, type, extra = {}) {
  st.events.push({ type, t: st.time, seq: ++st.seq, ...extra });
  if (st.events.length > EVENTS_KEEP) st.events.shift();
}

function setPhase(st, phase) {
  st.phase = phase;
  st.phaseT = 0;
  emit(st, 'phase', { phase });
  if (phase === 'done') emit(st, 'done');
}

// What the bins at this station hold.
export function binsFor(st) {
  return st.free ? [...BINS[st.kind], ...FREE_EXTRAS[st.kind]] : BINS[st.kind].slice();
}

const minus = (want, have) => {
  const left = want.slice();
  for (const h of have) {
    const i = left.indexOf(h);
    if (i >= 0) left.splice(i, 1);
  }
  return left;
};
const piecesIn = (st) => st.pieces.filter((p) => !p.out);

// With an order: the ingredients (and tools) that are right to use right now.
export function needs(st) {
  const o = st.order;
  const d = st.dish;
  if (!o) return [];
  switch (st.kind) {
    case 'smoothie':
      if (st.phase === 'fill') return minus(o.fruits, d.fruits);
      if (st.phase === 'top') return minus(o.toppers, d.toppers);
      return [];
    case 'sandwich':
      return st.phase === 'build' && d.layers.length < o.layers.length ? [o.layers[d.layers.length]] : [];
    case 'taco':
      if (st.phase !== 'build') return [];
      return d.tortilla ? minus(o.fillings, d.fillings) : ['tortilla'];
    case 'icecream':
      if (st.phase === 'scoop') return d.scoops.length < o.scoops.length ? [o.scoops[d.scoops.length]] : [];
      if (st.phase === 'top') return [...(o.cherry && !d.cherry ? ['cherry'] : []), ...(o.sprinkles && !d.sprinkles ? ['sprinkles'] : [])];
      return [];
    case 'fried':
      if (st.phase === 'fry') return st.pieces.length < o.pieces.length ? [o.pieces[0]] : [];
      if (st.phase === 'shake') return o.shake && !d.shake ? [o.shake] : [];
      return [];
    case 'pizza':
      if (st.phase === 'sauce') return ['sauce'];
      if (st.phase === 'cheese') return ['mozzarella'];
      if (st.phase === 'top') return minus(o.toppings, d.toppings);
      return [];
    default:
      return [];
  }
}

// Phases where the hands are busy with something else: a dropped ingredient just bounces back
// without counting as a slip.
const BUSY = new Set(['blend', 'pour', 'press', 'bake', 'done']);

// Is the food ready for its next big step (blend, press, oven)?
export function ready(st) {
  const d = st.dish;
  if (st.free) {
    if (st.kind === 'smoothie') return d.fruits.length + d.extras.length > 0;
    if (st.kind === 'sandwich') return d.layers.length + d.extras.length > 0;
    if (st.kind === 'pizza') return true;
    return false;
  }
  if (st.kind === 'smoothie') return st.phase === 'fill' && needs(st).length === 0;
  if (st.kind === 'sandwich') return st.phase === 'build' && needs(st).length === 0;
  if (st.kind === 'pizza') return st.phase === 'top' && needs(st).length === 0;
  return false;
}

// After something went on, move along if that finished a step.
function advance(st) {
  if (st.free) return;
  const n = needs(st).length;
  const o = st.order;
  if (st.kind === 'smoothie' && st.phase === 'top' && !n) setPhase(st, 'done');
  else if (st.kind === 'taco' && st.phase === 'build' && !n) setPhase(st, 'done');
  else if (st.kind === 'icecream') {
    if (st.phase === 'scoop' && !n) setPhase(st, o.sprinkles || o.cherry ? 'top' : 'done');
    else if (st.phase === 'top' && !n) setPhase(st, 'done');
  } else if (st.kind === 'fried') {
    const out = st.pieces.filter((p) => p.out).length;
    if (st.phase === 'fry' && out === o.pieces.length) setPhase(st, o.shake ? 'shake' : 'done');
    else if (st.phase === 'shake' && !n) setPhase(st, 'done');
  } else if (st.kind === 'pizza') {
    if (st.phase === 'sauce' && st.dish.sauce) setPhase(st, o.cheese ? 'cheese' : 'top');
    else if (st.phase === 'cheese' && st.dish.cheese) setPhase(st, 'top');
  }
}

function slip(st, ing) {
  st.slips++;
  emit(st, 'wrong', { ing });
  return 'wrong';
}

// Put one thing on the food. Returns 'ok', 'wrong' (bounces back, counts as a slip),
// 'full' (no room, bounces back) or 'no' (not now: bounces back quietly).
export function add(st, ing) {
  if (RUB_TOOLS.includes(ing)) return 'no'; // tools are rubbed on, not dropped
  if (st.free) return addFree(st, ing);
  if (BUSY.has(st.phase)) return 'no';
  if (!needs(st).includes(ing)) return slip(st, ing);
  const d = st.dish;
  if (st.kind === 'smoothie') (st.phase === 'fill' ? d.fruits : d.toppers).push(ing);
  else if (st.kind === 'sandwich') d.layers.push(ing);
  else if (st.kind === 'taco') ing === 'tortilla' ? (d.tortilla = true) : d.fillings.push(ing);
  else if (st.kind === 'icecream') ing === 'cherry' ? (d.cherry = true) : st.phase === 'scoop' ? d.scoops.push(ing) : null;
  else if (st.kind === 'fried') {
    if (piecesIn(st).length >= FRY_SLOTS) return 'full';
    st.pieces.push({ id: ++st.pieceSeq, food: ing, t: 0, out: false });
  } else if (st.kind === 'pizza') d.toppings.push(ing);
  emit(st, 'add', { ing });
  advance(st);
  return 'ok';
}

function addFree(st, ing) {
  const d = st.dish;
  const own = BINS[st.kind];
  const extra = () => {
    if (d.extras.length >= FREE_CAP) return 'full';
    d.extras.push(ing);
    return 'ok';
  };
  let r = 'no';
  if (st.kind === 'smoothie') {
    if (st.phase === 'fill' && !st.holding) {
      if (d.fruits.length + d.extras.length >= FREE_CAP) r = 'full';
      else if (FRUITS.includes(ing)) (d.fruits.push(ing), (r = 'ok'));
      else if (!own.includes(ing)) r = extra();
    } else if (st.phase === 'top' && (ing === 'straw' || ing === 'umbrella')) {
      if (d.toppers.length >= 6) r = 'full';
      else (d.toppers.push(ing), (r = 'ok'));
    }
  } else if (st.kind === 'sandwich') {
    if (st.phase === 'build') {
      if (d.layers.length + d.extras.length >= FREE_CAP) r = 'full';
      else if (own.includes(ing)) (d.layers.push(ing), (r = 'ok'));
      else r = extra();
    }
  } else if (st.kind === 'taco') {
    if (ing === 'tortilla') r = d.tortilla ? 'full' : ((d.tortilla = true), 'ok');
    else if (d.fillings.length + d.extras.length >= FREE_CAP) r = 'full';
    else if (own.includes(ing)) (d.fillings.push(ing), (r = 'ok'));
    else r = extra();
  } else if (st.kind === 'icecream') {
    if (FLAVOURS.includes(ing)) r = d.scoops.length >= FREE_CAP ? 'full' : (d.scoops.push(ing), 'ok');
    else if (ing === 'cherry') r = d.cherry ? 'full' : ((d.cherry = true), 'ok');
    else if (ing !== 'sprinkles') r = extra();
  } else if (st.kind === 'fried') {
    if (FRIED.includes(ing)) {
      if (piecesIn(st).length >= FRY_SLOTS || st.pieces.length >= 8) r = 'full';
      else (st.pieces.push({ id: ++st.pieceSeq, food: ing, t: 0, out: false }), (r = 'ok'));
    } else if (!RUB_TOOLS.includes(ing) && d.pieces.length) r = extra();
  } else if (st.kind === 'pizza') {
    if (st.phase === 'build' && !RUB_TOOLS.includes(ing)) {
      if (d.toppings.length + d.extras.length >= FREE_CAP * 2) r = 'full';
      else if (PIZZA_TOPPINGS.includes(ing)) (d.toppings.push(ing), (r = 'ok'));
      else r = extra();
    }
  }
  if (r === 'ok') emit(st, 'add', { ing });
  return r;
}

// A finger picked up a rubbing tool. Returns true if it may be rubbed now (with an order, the
// wrong tool is a slip and stays in its bin).
export function grabTool(st, tool) {
  if (!RUB_TOOLS.includes(tool)) return false;
  if (st.free) {
    if (st.kind === 'icecream') return tool === 'sprinkles';
    if (st.kind === 'fried') return st.dish.pieces.length > 0 && ['sugar', 'salt', 'sprinkles'].includes(tool);
    if (st.kind === 'pizza') return st.phase === 'build' && (tool === 'sauce' || tool === 'mozzarella');
    return false;
  }
  if (BUSY.has(st.phase)) return false;
  if (needs(st).includes(tool)) return true;
  slip(st, tool);
  return false;
}

// Rub a held tool over the food. Returns how far along that tool's job is (0..1).
export function rub(st, tool, dist, u = 0.5, v = 0.5) {
  const need = RUB_NEED[tool];
  if (!need || dist <= 0) return 0;
  const before = st.rub[tool] || 0;
  if (before >= need) return 1;
  const now = Math.min(need, before + dist);
  st.rub[tool] = now;
  st.marks.push({ tool, u, v });
  if (st.marks.length > MARKS_KEEP) st.marks.splice(0, st.marks.length - MARKS_KEEP);
  if (now >= need) {
    const d = st.dish;
    if (tool === 'sprinkles') {
      if (st.kind === 'icecream') d.sprinkles = true;
      else d.extras.push('sprinkles');
    } else if (tool === 'sugar' || tool === 'salt') {
      if (!d.shake) d.shake = tool;
      else if (d.shake !== tool) d.extras.push(tool);
    } else if (tool === 'sauce') d.sauce = true;
    else if (tool === 'mozzarella') d.cheese = true;
    emit(st, 'rubbed', { tool });
    advance(st);
  }
  return now / need;
}

export const rubProgress = (st, tool) => Math.min(1, (st.rub[tool] || 0) / RUB_NEED[tool]);

// The blend button or the press handle. Returns true if it took.
export function setHold(st, on) {
  const holdPhase = st.kind === 'smoothie' ? 'blend' : st.kind === 'sandwich' ? 'press' : null;
  if (!holdPhase) return false;
  if (on) {
    if (st.kind === 'smoothie' && st.phase === 'fill') {
      if (!ready(st)) return false;
      setPhase(st, 'blend');
    }
    if (st.phase !== holdPhase || st.holding) return false;
    st.holding = true;
    emit(st, 'holdOn');
    return true;
  }
  if (!st.holding) return false;
  st.holding = false;
  emit(st, 'holdOff', { meter: st.meter });
  if (st.meter >= GOOD_LO) finishHold(st);
  else emit(st, 'more');
  return true;
}

function finishHold(st) {
  st.holding = false;
  st.cook = st.meter > GOOD_HI ? 'over' : 'good';
  emit(st, st.cook === 'over' ? 'overdone' : 'perfect');
  if (st.kind === 'smoothie') setPhase(st, 'pour');
  else setPhase(st, 'done');
}

// Carry the food somewhere. Returns true if it went.
export function moveTo(st, where) {
  if (st.kind === 'smoothie' && where === 'cup' && st.phase === 'pour') {
    emit(st, 'pour');
    setPhase(st, 'top');
    return true;
  }
  if (st.kind === 'sandwich' && where === 'press' && st.phase === 'build' && ready(st)) {
    st.meter = 0;
    setPhase(st, 'press');
    return true;
  }
  if (st.kind === 'pizza' && where === 'oven' && (st.phase === 'top' || st.phase === 'build') && ready(st)) {
    st.oven = 0;
    setPhase(st, 'bake');
    return true;
  }
  return false;
}

// Lift a fried piece (by id) or the pizza ('oven') out. Returns 'ok', 'notyet' (too pale:
// it plops back in) or 'no'.
export function pullOut(st, id) {
  if (st.kind === 'pizza') {
    if (id !== 'oven' || st.phase !== 'bake') return 'no';
    if (st.oven < BAKE_GOLD) {
      emit(st, 'notyet');
      return 'notyet';
    }
    st.cook = st.oven > BAKE_BURN ? 'over' : 'good';
    emit(st, st.cook === 'over' ? 'overdone' : 'perfect');
    setPhase(st, 'done');
    return 'ok';
  }
  if (st.kind !== 'fried' || st.phase !== 'fry') return 'no';
  const p = st.pieces.find((k) => k.id === id && !k.out);
  if (!p) return 'no';
  if (p.t < FRY_GOLD) {
    emit(st, 'notyet', { id });
    return 'notyet';
  }
  p.out = true;
  p.cook = p.t > FRY_BURN ? 'over' : 'good';
  st.dish.pieces.push(p.food);
  st.dish.cooks.push(p.cook);
  emit(st, p.cook === 'over' ? 'overdone' : 'perfect', { id });
  advance(st);
  return 'ok';
}

// How done a fried piece (or the pizza) looks: 'raw', 'golden' or 'dark'.
export function doneness(t, gold = FRY_GOLD, burn = FRY_BURN) {
  return t < gold ? 'raw' : t > burn ? 'dark' : 'golden';
}

// The bin: start this dish again from nothing. Slips are kept.
export function restart(st) {
  st.phase = FIRST_PHASE[st.kind];
  if (st.free && st.kind === 'pizza') st.phase = 'build';
  st.phaseT = 0;
  st.meter = 0;
  st.holding = false;
  st.cook = null;
  st.dish = emptyDish(st.kind);
  st.rub = {};
  st.marks = [];
  st.pieces = [];
  st.oven = 0;
  emit(st, 'restart');
}

export const isDone = (st) => st.phase === 'done';

export function stepStation(st, dt) {
  st.time += dt;
  st.phaseT += dt;
  if (st.holding) {
    const T = st.kind === 'smoothie' ? BLEND_TIME : PRESS_TIME;
    const before = st.meter;
    st.meter = Math.min(1, st.meter + dt / T);
    if (before < GOOD_LO && st.meter >= GOOD_LO) emit(st, 'green');
    if (before <= GOOD_HI && st.meter > GOOD_HI) emit(st, 'tooLong');
    if (st.meter >= 1) {
      // held all the way: a comic puff of smoke (or a blender burp) and it lets go by itself
      emit(st, 'smoke');
      finishHold(st);
    }
  }
  for (const p of st.pieces) {
    if (p.out) continue;
    const before = p.t;
    p.t += dt;
    if (before < FRY_GOLD && p.t >= FRY_GOLD) emit(st, 'ding', { id: p.id });
    if (before <= FRY_BURN && p.t > FRY_BURN) emit(st, 'burnt', { id: p.id });
  }
  if (st.kind === 'pizza' && st.phase === 'bake') {
    const before = st.oven;
    st.oven += dt;
    if (before < BAKE_GOLD && st.oven >= BAKE_GOLD) emit(st, 'ding', { id: 'oven' });
    if (before <= BAKE_BURN && st.oven > BAKE_BURN) emit(st, 'burnt', { id: 'oven' });
  }
}

// The dish as it stands, with how it was cooked: 'good', 'over' or 'raw' (never cooked).
export function takeDish(st) {
  const d = JSON.parse(JSON.stringify(st.dish));
  let cook = 'good';
  if (st.kind === 'smoothie' || st.kind === 'sandwich' || st.kind === 'pizza') cook = st.cook || 'raw';
  if (st.kind === 'fried') cook = d.cooks.includes('over') ? 'over' : d.pieces.length ? 'good' : 'raw';
  if (st.kind === 'fried') {
    // the pieces still in the oil come along too in the free kitchen (it is a gator)
    for (const p of st.pieces) if (!p.out) (d.pieces.push(p.food), d.cooks.push(p.t < FRY_GOLD ? 'raw' : p.t > FRY_BURN ? 'over' : 'good'));
    if (d.cooks.includes('over')) cook = 'over';
    else if (d.cooks.length && d.cooks.every((c) => c === 'raw')) cook = 'raw';
  }
  if (st.kind === 'icecream' && !d.scoops.length) cook = 'raw';
  if (st.kind === 'taco' && !d.tortilla && !d.fillings.length) cook = 'raw';
  d.cook = cook;
  d.slips = st.slips;
  return d;
}

// Is there anything to feed the gator? (free kitchen)
export function feedable(st) {
  const d = st.dish;
  switch (st.kind) {
    case 'smoothie': return d.fruits.length + d.extras.length > 0;
    case 'sandwich': return d.layers.length + d.extras.length > 0;
    case 'taco': return d.tortilla || d.fillings.length + d.extras.length > 0;
    case 'icecream': return d.scoops.length + d.extras.length > 0 || d.cherry;
    case 'fried': return st.pieces.length > 0;
    case 'pizza': return true;
    default: return false;
  }
}

// The next right thing to do with an order, as a finger would do it (for hints and the bot):
// { do: 'add', ing } | { do: 'rub', tool } | { do: 'hold' } | { do: 'release' } | { do: 'wait' }
// | { do: 'move', to } | { do: 'pull', id } | null when done.
export function stationHint(st) {
  if (st.free || st.phase === 'done') return null;
  if (st.holding) return st.meter >= (GOOD_LO + GOOD_HI) / 2 ? { do: 'release' } : { do: 'wait' };
  if (st.phase === 'blend' || st.phase === 'press') return { do: 'hold' };
  if (st.phase === 'pour') return { do: 'move', to: 'cup' };
  if (st.phase === 'bake') return st.oven >= BAKE_GOLD ? { do: 'pull', id: 'oven' } : { do: 'wait' };
  if (ready(st)) {
    if (st.kind === 'smoothie') return { do: 'hold' };
    if (st.kind === 'sandwich') return { do: 'move', to: 'press' };
    if (st.kind === 'pizza') return { do: 'move', to: 'oven' };
  }
  if (st.kind === 'fried' && st.phase === 'fry') {
    const golden = piecesIn(st).find((p) => p.t >= FRY_GOLD);
    if (golden) return { do: 'pull', id: golden.id };
    const n = needs(st);
    if (n.length && piecesIn(st).length < FRY_SLOTS) return { do: 'add', ing: n[0] };
    return { do: 'wait' };
  }
  const n = needs(st);
  if (!n.length) return null;
  return RUB_TOOLS.includes(n[0]) ? { do: 'rub', tool: n[0] } : { do: 'add', ing: n[0] };
}

// For tests: everything a bin can hold is a known ingredient.
export const ALL_INGREDIENTS = new Set([...FRUITS, 'straw', 'umbrella', ...LAYERS, 'tortilla', ...TACO_FILLINGS,
  ...TACO_TOPPINGS, ...FLAVOURS, 'sprinkles', 'cherry', ...FRIED, 'sugar', 'salt', 'sauce', 'mozzarella', ...PIZZA_TOPPINGS]);
export { SHAKE_FOR };
