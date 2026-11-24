// The twelve days at the beach: who comes, what is on the menu, and the twist each day adds.
// Pure. Every day introduces one new dish or one new twist, and the first customer of a day
// always orders the new dish so it is met straight away.
import { makeOrder, rng } from './recipes.js';

export const CUSTOMERS = ['pelican', 'gator', 'surfer', 'abuela', 'flamingo', 'skater'];

// customers: how many come. menu: the dishes on offer. size: how big orders get (1-3).
// two: the chance an order is two dishes. queue: how many wait at the window at once.
// patience: seconds a customer waits untended before shrugging off (0 = for ever).
// special: the chance of a "no ..." request. fresh: the dish (or twist) that is new today.
export const DAYS = [
  { customers: 4, menu: ['smoothie'], size: 1, two: 0, queue: 1, patience: 0, special: 0, fresh: 'smoothie' },
  { customers: 4, menu: ['smoothie', 'icecream'], size: 1, two: 0, queue: 1, patience: 0, special: 0, fresh: 'icecream' },
  { customers: 5, menu: ['smoothie', 'icecream', 'taco'], size: 1, two: 0, queue: 1, patience: 0, special: 0, fresh: 'taco' },
  { customers: 5, menu: ['icecream', 'taco', 'sandwich'], size: 1, two: 0, queue: 1, patience: 0, special: 0, fresh: 'sandwich' },
  { customers: 5, menu: ['smoothie', 'taco', 'sandwich', 'fried'], size: 1, two: 0, queue: 1, patience: 0, special: 0, fresh: 'fried' },
  { customers: 6, menu: ['smoothie', 'icecream', 'taco', 'sandwich', 'fried'], size: 2, two: 0, queue: 1, patience: 0, special: 0, fresh: 'bigger' },
  { customers: 6, menu: ['icecream', 'taco', 'sandwich', 'fried'], size: 2, two: 0, queue: 1, patience: 0, special: 1, fresh: 'special' },
  { customers: 6, menu: ['smoothie', 'icecream', 'taco', 'sandwich', 'fried'], size: 2, two: 0, queue: 1, patience: 120, special: 0.3, fresh: 'patience' },
  { customers: 7, menu: ['smoothie', 'icecream', 'taco', 'sandwich', 'fried', 'pizza'], size: 2, two: 0, queue: 1, patience: 120, special: 0.3, fresh: 'pizza' },
  { customers: 7, menu: ['smoothie', 'icecream', 'taco', 'sandwich', 'fried', 'pizza'], size: 2, two: 0.5, queue: 1, patience: 150, special: 0.3, fresh: 'two' },
  { customers: 7, menu: ['smoothie', 'icecream', 'taco', 'sandwich', 'fried', 'pizza'], size: 2, two: 0.2, queue: 2, patience: 150, special: 0.3, fresh: 'rush' },
  { customers: 8, menu: ['smoothie', 'icecream', 'taco', 'sandwich', 'fried', 'pizza'], size: 3, two: 0.35, queue: 2, patience: 180, special: 0.4, fresh: 'party' },
];

// The orders of day i: [{ who, items: [order, ...] }], the same every time for a seed.
export function generateDay(i, seed = 1) {
  const d = DAYS[i];
  const r = rng(seed * 7919 + i * 104729 + 1);
  const out = [];
  let lastWho = null;
  for (let k = 0; k < d.customers; k++) {
    let who = CUSTOMERS[Math.floor(r() * CUSTOMERS.length)];
    if (who === lastWho) who = CUSTOMERS[(CUSTOMERS.indexOf(who) + 1) % CUSTOMERS.length];
    lastWho = who;
    let first;
    if (k === 0 && d.menu.includes(d.fresh)) first = d.fresh;
    else first = d.menu[Math.floor(r() * d.menu.length)];
    const special = (d.fresh === 'special' && k < 2) || r() < d.special;
    // a fresh-twist day shows its twist on the first customer
    const two = (d.fresh === 'two' && k === 0) || (k > 0 && r() < d.two);
    const items = [makeOrder(first, r, { size: d.size, special: special && (first === 'sandwich' || first === 'pizza') })];
    if (d.fresh === 'special' && k < 2) items[0] = makeOrder('sandwich', r, { size: d.size, special: true });
    if (two) {
      const others = d.menu.filter((m) => m !== first);
      items.push(makeOrder(others[Math.floor(r() * others.length)], r, { size: Math.min(d.size, 2) }));
    }
    out.push({ who, items });
  }
  // the special day opens with a crossed-out picture
  if (d.fresh === 'special' && !out[0].items[0].no?.length) {
    out[0].items[0] = { kind: 'sandwich', layers: ['bread', 'ham', 'pork', 'cheese'], no: ['pickles'] };
  }
  return out;
}

// Which dishes have been met by day i (for the free kitchen's picker and the day cards).
export function dishesBy(i) {
  const set = new Set();
  for (let k = 0; k <= i && k < DAYS.length; k++) DAYS[k].menu.forEach((m) => set.add(m));
  return [...set];
}
