// Food Truck Chef rules for a day at the window and for the free kitchen. Pure: no DOM, no
// Math.random, no clocks of its own. Customers walk up one at a time (two in a rush) with a
// picture order; tapping a picture opens that dish's station (stations.js); a finished dish
// lands on the counter and is dragged to the customer, who reacts and pays.
//
// Actions the UI (and the bot) use: openOrder(s, custId, item), closeStation(s), serve(s,
// dishId, custId), binDish(s, dishId), the station actions on s.station, and step(s, dt).
// Free kitchen: openStation(s, kind), feed(s).
import { DAYS, generateDay } from './days.js';
import { sameDish, contents, dishSize, FRUITS, FLAVOURS, BINS } from './recipes.js';
import { createStation, stepStation, takeDish, feedable, isDone } from './stations.js';

// ---------------------------------------------------------------------------------------------
// Tuning
// ---------------------------------------------------------------------------------------------

export const WALK_TIME = 1.5; // a customer walking up to the window
export const ARRIVE_GAP = 0.9; // pause before the next customer starts walking up
export const EAT_TIME = 2.6; // yum faces, hearts and coins before they go
export const SHRUG_TIME = 1.8; // out of patience: a shrug before they wander off
export const LEAVE_TIME = 1.4; // walking off
export const DONE_HOLD = 1.1; // a finished dish shows off in the station before it goes to the counter
export const SLIPS_COST = 2; // this many wrong things on one dish costs it a point
export const COUNTER_MAX = 3;

// Points for a served dish: 3, less one if it came out over-done, less one for slips (never
// below 1). A customer who left unserved scores 0.
export function dishPoints(dish) {
  return Math.max(1, 3 - (dish.cook === 'over' ? 1 : 0) - (dish.slips >= SLIPS_COST ? 1 : 0));
}

// Stars for a day from each customer's points (the mean of their dishes, 0 if they left).
// Finishing a day always earns at least one.
export function starsFor(points) {
  if (!points.length) return 1;
  const mean = points.reduce((a, b) => a + b, 0) / points.length;
  return mean >= 2.5 ? 3 : mean >= 1.5 ? 2 : 1;
}

// Coins from one happy customer: 2 a dish, plus a 1 coin tip for each perfect one.
export const COINS_PER_DISH = 2;
export const TIP = 1;
export function coinsFor(dishPointsList) {
  return dishPointsList.reduce((sum, p) => sum + COINS_PER_DISH + (p === 3 ? TIP : 0), 0);
}

// ---------------------------------------------------------------------------------------------
// The shop: cosmetic things for the truck, priced in coins.
// ---------------------------------------------------------------------------------------------

export const AWNINGS = ['awning-pink', 'awning-teal', 'awning-lime', 'awning-sunset', 'awning-purple'];
export const SHOP = [
  { id: 'awning-teal', price: 6 },
  { id: 'awning-lime', price: 8 },
  { id: 'awning-sunset', price: 10 },
  { id: 'awning-purple', price: 12 },
  { id: 'flowers', price: 10 },
  { id: 'sign', price: 15 },
  { id: 'lights', price: 20 },
  { id: 'surfboard', price: 25 },
  { id: 'disco', price: 35 },
  { id: 'parrot', price: 45 },
];
export const priceOf = (id) => SHOP.find((k) => k.id === id)?.price;

// Buy something. Returns 'ok', 'owned', 'poor' or 'no' (no such thing). Buying an awning puts it up.
export function buy(progress, id) {
  const price = priceOf(id);
  if (price === undefined) return 'no';
  if (progress.owned.includes(id)) return 'owned';
  if (progress.coins < price) return 'poor';
  progress.coins -= price;
  progress.owned.push(id);
  if (AWNINGS.includes(id)) progress.awning = id;
  return 'ok';
}

// Put up an awning you own (the pink one is always yours).
export function useAwning(progress, id) {
  if (!AWNINGS.includes(id) || (id !== 'awning-pink' && !progress.owned.includes(id))) return false;
  progress.awning = id;
  return true;
}

// ---------------------------------------------------------------------------------------------
// Progress: { stars: [12], coins, owned: [ids], awning }. Anything odd reads as a fresh start.
// ---------------------------------------------------------------------------------------------

export function parseProgress(raw, count = DAYS.length) {
  let v = null;
  try {
    v = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    v = null;
  }
  const ok = v && typeof v === 'object';
  const list = ok && Array.isArray(v.stars) ? v.stars : [];
  const stars = [];
  for (let i = 0; i < count; i++) {
    const n = list[i];
    stars.push(Number.isInteger(n) && n >= 0 && n <= 3 ? n : 0);
  }
  const coins = ok && Number.isInteger(v.coins) && v.coins >= 0 ? Math.min(v.coins, 99999) : 0;
  const owned = ok && Array.isArray(v.owned) ? [...new Set(v.owned.filter((id) => priceOf(id) !== undefined))] : [];
  const awning = ok && (v.awning === 'awning-pink' || owned.includes(v.awning)) ? v.awning : 'awning-pink';
  return { stars, coins, owned, awning };
}

export const serializeProgress = (p) => JSON.stringify({ stars: p.stars.slice(), coins: p.coins, owned: p.owned.slice(), awning: p.awning });

// A day opens once the day before it (or the day itself) has a star.
export const unlocked = (progress, i) => i === 0 || progress.stars[i - 1] > 0 || progress.stars[i] > 0;

// Fold a finished day into progress: best stars kept, coins added.
export function recordDay(progress, i, stars, coins) {
  progress.stars[i] = Math.max(progress.stars[i] || 0, stars);
  progress.coins = Math.min(99999, progress.coins + coins);
  return progress;
}

// ---------------------------------------------------------------------------------------------
// A day at the window
// ---------------------------------------------------------------------------------------------

function emit(s, type, extra = {}) {
  s.events.push({ type, t: s.time, seq: ++s.seq, ...extra });
  if (s.events.length > 30) s.events.shift();
}

export function createDay(dayIndex, seed = 1, orders = generateDay(dayIndex, seed)) {
  const def = DAYS[dayIndex];
  return {
    mode: 'day',
    day: dayIndex,
    def,
    time: 0,
    status: 'open', // 'open' | 'done'
    statusT: 0,
    customers: orders.map((o, i) => ({
      id: i + 1,
      who: o.who,
      items: o.items,
      filled: o.items.map(() => false),
      points: o.items.map(() => 0),
      state: 'queued', // 'queued' | 'walk' | 'wait' | 'eat' | 'shrug' | 'leave' | 'gone'
      t: 0,
      spot: -1,
      patience: def.patience * o.items.length,
      patienceMax: def.patience * o.items.length,
      coins: 0,
      mood: 'wait',
      moodT: 0,
    })),
    gap: 0.3,
    station: null,
    stationFor: null, // { cust, item }
    counter: [], // { id, dish, cust, item }
    dishSeq: 0,
    coins: 0,
    stars: 0,
    served: 0,
    left: 0,
    events: [],
    seq: 0,
  };
}

export const atWindow = (s) => s.customers.filter((c) => c.state !== 'queued' && c.state !== 'gone');
export const customer = (s, id) => s.customers.find((c) => c.id === id);

// Is someone already cooking (or holding on the counter) this item?
function attended(s, c, item) {
  if (s.stationFor && s.stationFor.cust === c.id && s.stationFor.item === item) return true;
  return s.counter.some((k) => k.cust === c.id && k.item === item);
}

// Tap a picture in a customer's bubble: open that dish's station. Opening another dish
// throws away the one in progress. Returns true if it opened (or was already open).
export function openOrder(s, custId, item) {
  const c = customer(s, custId);
  if (!c || c.state !== 'wait' || c.filled[item] || s.status !== 'open') return false;
  if (s.stationFor && s.stationFor.cust === custId && s.stationFor.item === item) return true;
  if (s.counter.some((k) => k.cust === custId && k.item === item)) return false;
  s.station = createStation(c.items[item].kind, c.items[item]);
  s.stationFor = { cust: custId, item };
  emit(s, 'open', { cust: custId, item });
  return true;
}

// Back out of a station (the dish in progress is kept until another is opened).
export function closeStation(s) {
  if (!s.station) return false;
  s.parked = { station: s.station, for: s.stationFor };
  s.station = null;
  s.stationFor = null;
  return true;
}

// Go back into a parked station, if it still belongs to someone waiting.
export function reopen(s, custId, item) {
  const p = s.parked;
  if (!p || p.for.cust !== custId || p.for.item !== item) return false;
  const c = customer(s, custId);
  if (!c || c.state !== 'wait') return false;
  s.station = p.station;
  s.stationFor = p.for;
  s.parked = null;
  return true;
}

// Tap a picture: reopen the parked dish for it, or start it fresh.
export function tapOrder(s, custId, item) {
  return reopen(s, custId, item) || openOrder(s, custId, item);
}

// Drag a counter dish onto a customer. Returns 'ok', 'wrong' (they shake their head; it slides
// back and counts as a slip on that dish) or 'no'.
export function serve(s, dishId, custId) {
  const k = s.counter.find((d) => d.id === dishId);
  const c = customer(s, custId);
  if (!k || !c || c.state !== 'wait') return 'no';
  let item = -1;
  if (k.cust === c.id && !c.filled[k.item] && sameDish(c.items[k.item], k.dish)) item = k.item;
  else item = c.items.findIndex((o, i) => !c.filled[i] && sameDish(o, k.dish) && !s.counter.some((q) => q !== k && q.cust === c.id && q.item === i));
  if (item < 0) {
    k.dish.slips++;
    c.mood = 'no';
    c.moodT = 0;
    emit(s, 'wrongServe', { cust: c.id, dish: k.id });
    return 'wrong';
  }
  s.counter.splice(s.counter.indexOf(k), 1);
  c.filled[item] = true;
  c.points[item] = dishPoints(k.dish);
  c.mood = 'munch';
  c.moodT = 0;
  emit(s, 'serve', { cust: c.id, item, points: c.points[item], cook: k.dish.cook });
  if (c.filled.every(Boolean)) {
    c.state = 'eat';
    c.t = 0;
    c.coins = coinsFor(c.points);
    c.mood = c.points.every((p) => p === 3) ? 'love' : 'yum';
    s.coins += c.coins;
    s.served++;
    emit(s, 'pay', { cust: c.id, coins: c.coins, mood: c.mood });
  }
  return 'ok';
}

// Throw a counter dish in the bin.
export function binDish(s, dishId) {
  const i = s.counter.findIndex((d) => d.id === dishId);
  if (i < 0) return false;
  s.counter.splice(i, 1);
  emit(s, 'bin');
  return true;
}

// The spots at the window: one in the middle, or two side by side in a rush.
function freeSpot(s) {
  const taken = atWindow(s).map((c) => c.spot);
  const spots = s.def.queue > 1 ? [0, 1] : [0];
  return spots.find((k) => !taken.includes(k));
}

function tick(s, dt) {
  s.time += dt;
  s.statusT += dt;
  if (s.status !== 'open') return;
  // the next customer walks up when there is room
  const waiting = atWindow(s).length;
  const next = s.customers.find((c) => c.state === 'queued');
  if (next && waiting < s.def.queue) {
    s.gap -= dt;
    if (s.gap <= 0) {
      next.state = 'walk';
      next.t = 0;
      next.spot = freeSpot(s) ?? 0;
      s.gap = ARRIVE_GAP;
      emit(s, 'arrive', { cust: next.id });
    }
  }
  for (const c of s.customers) {
    if (c.state === 'queued' || c.state === 'gone') continue;
    c.t += dt;
    c.moodT += dt;
    if ((c.mood === 'no' || c.mood === 'munch') && c.moodT > 1.1 && c.state === 'wait') c.mood = 'wait';
    if (c.state === 'walk' && c.t >= WALK_TIME) {
      c.state = 'wait';
      c.t = 0;
      emit(s, 'order', { cust: c.id });
    } else if (c.state === 'wait') {
      const busy = c.items.some((_, i) => !c.filled[i] && attended(s, c, i));
      if (s.def.patience > 0 && !busy) {
        c.patience -= dt;
        if (c.patience <= 0) {
          c.patience = 0;
          c.state = 'shrug';
          c.t = 0;
          c.mood = 'shrug';
          if (s.parked && s.parked.for.cust === c.id) s.parked = null;
          emit(s, 'shrug', { cust: c.id });
        }
      }
    } else if (c.state === 'eat' && c.t >= EAT_TIME) {
      c.state = 'leave';
      c.t = 0;
    } else if (c.state === 'shrug' && c.t >= SHRUG_TIME) {
      c.state = 'leave';
      c.t = 0;
      s.left++;
    } else if (c.state === 'leave' && c.t >= LEAVE_TIME) {
      c.state = 'gone';
      c.t = 0;
    }
  }
  if (s.station) {
    stepStation(s.station, dt);
    if (isDone(s.station) && s.station.phaseT >= DONE_HOLD) finishStation(s);
  }
  if (s.customers.every((c) => c.state === 'gone')) {
    s.status = 'done';
    s.statusT = 0;
    s.station = null;
    s.stars = starsFor(dayPoints(s));
    emit(s, 'dayDone', { stars: s.stars, coins: s.coins });
  }
}

function finishStation(s) {
  const dish = takeDish(s.station);
  const id = ++s.dishSeq;
  s.counter.push({ id, dish, cust: s.stationFor.cust, item: s.stationFor.item });
  if (s.counter.length > COUNTER_MAX) s.counter.shift();
  emit(s, 'ready', { dish: id, cust: s.stationFor.cust });
  s.station = null;
  s.stationFor = null;
}

// Each customer's points: the mean of their dishes if they were served, else 0.
export function dayPoints(s) {
  return s.customers.map((c) => (c.filled.every(Boolean) ? c.points.reduce((a, b) => a + b, 0) / c.points.length : 0));
}

const STEP = 1 / 60;
export function step(s, dt) {
  if (s.mode === 'free') return stepFree(s, dt);
  let left = Math.min(dt, 0.1);
  while (left > 1e-9) {
    const h = Math.min(STEP, left);
    tick(s, h);
    left -= h;
  }
}

// ---------------------------------------------------------------------------------------------
// The free kitchen: no customers, just a hungry gator who will eat anything.
// ---------------------------------------------------------------------------------------------

export const REACT_TIME = 3.2;

export function createFreeKitchen() {
  return { mode: 'free', time: 0, station: null, gator: { reaction: null, t: 0, dish: null }, fed: 0, events: [], seq: 0 };
}

export function openStation(s, kind) {
  if (!BINS[kind]) return false;
  s.station = createStation(kind, null, { free: true });
  emit(s, 'open', { kind });
  return true;
}

// Give the gator whatever is at the station. Returns the reaction or null.
export function feed(s) {
  if (!s.station || !feedable(s.station)) return null;
  const dish = takeDish(s.station);
  const reaction = gatorReaction(dish);
  s.gator = { reaction, t: 0, dish };
  s.fed++;
  s.station = null;
  emit(s, 'feed', { reaction: reaction.kind });
  return reaction;
}

function stepFree(s, dt) {
  s.time += dt;
  if (s.gator.reaction) {
    s.gator.t += dt;
    if (s.gator.t >= REACT_TIME) s.gator = { reaction: null, t: 0, dish: null };
  }
  if (s.station) stepStation(s.station, dt);
}

const SWEET_DISH = new Set(['smoothie', 'icecream']);

// How the gator takes a dish: { kind, power }.
//   yuck    pickles in something sweet, or anything raw (uncooked dough, a pale churro)
//   fire    hot sauce: fire breath (power = how many squirts)
//   freeze  four scoops or more, or ice cream in a smoothie: brain freeze
//   smoke   something burnt: a sooty cough
//   burp    a giant pile (8+ things): an enormous burp
//   rainbow every fruit, or every flavour: a rainbow sparkle
//   love    a proper dish of that station's own things: hearts
//   yum     anything else: happy munching
export function gatorReaction(dish) {
  const all = contents(dish);
  const count = (id) => all.filter((x) => x === id).length;
  const sweet = SWEET_DISH.has(dish.kind) || dish.shake === 'sugar' || (dish.kind === 'fried' && dish.pieces.every((p) => p === 'churro'));
  if (count('pickles') && sweet) return { kind: 'yuck', power: count('pickles') };
  if (dish.cook === 'raw' && (dish.kind === 'pizza' || dish.kind === 'fried')) return { kind: 'yuck', power: 1 };
  if (count('hotsauce')) return { kind: 'fire', power: count('hotsauce') };
  const scoops = all.filter((x) => FLAVOURS.includes(x)).length;
  if (scoops >= 4 || (dish.kind === 'smoothie' && scoops > 0)) return { kind: 'freeze', power: scoops };
  if (dish.cook === 'over') return { kind: 'smoke', power: 1 };
  const size = dishSize(dish);
  if (size >= 8) return { kind: 'burp', power: size };
  const kinds = new Set(all);
  if (FRUITS.every((f) => kinds.has(f)) || FLAVOURS.every((f) => kinds.has(f))) return { kind: 'rainbow', power: 1 };
  if (!dish.extras?.length && all.length && dish.cook === 'good') return { kind: 'love', power: 1 };
  return { kind: 'yum', power: 1 };
}
