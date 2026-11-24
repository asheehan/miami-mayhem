// Food Truck Chef data: ingredients, the six dishes, and how an order for each is made up.
// Pure: no DOM. Orders and finished dishes share one shape per dish, so matching is a compare.
//
//   smoothie { fruits: [...], toppers: ['straw', 'umbrella'?] }          fruits may repeat
//   sandwich { layers: ['bread', 'ham', 'pork', 'cheese', 'pickles'], no: [...] }  in order
//   taco     { fillings: [...], no: [] }                                  tortilla goes first
//   icecream { scoops: [...], sprinkles, cherry }                         scoops in order
//   fried    { pieces: ['churro', ...], shake: 'sugar' | 'salt' | null }  one kind per order
//   pizza    { toppings: [...], cheese, no: [] }                          toppings by count
//
// Every dish may also carry `extras` (free kitchen silliness: pickles in a smoothie).

// Each ingredient's main colour (for smoothie mixing and crumbs) and whether it is sweet.
export const ING = {
  mango: { colour: '#ffb21e', sweet: true },
  strawberry: { colour: '#ff3b5c', sweet: true },
  banana: { colour: '#ffe45c', sweet: true },
  pineapple: { colour: '#ffd23a', sweet: true },
  straw: { colour: '#ff5fa2' },
  umbrella: { colour: '#3ad1e8' },
  bread: { colour: '#e9a94f' },
  ham: { colour: '#ff9db0' },
  pork: { colour: '#c27a44' },
  cheese: { colour: '#ffd640' },
  pickles: { colour: '#6cb83a' },
  tortilla: { colour: '#f4d48c' },
  beef: { colour: '#8a4b2a' },
  chicken: { colour: '#e8b36a' },
  lettuce: { colour: '#5fd35a' },
  tomato: { colour: '#ff4a3d' },
  avocado: { colour: '#9fd65a' },
  hotsauce: { colour: '#ff2a1a', hot: true },
  vanilla: { colour: '#fff3cf', sweet: true, cold: true },
  chocolate: { colour: '#7a4326', sweet: true, cold: true },
  berry: { colour: '#ff8fb8', sweet: true, cold: true }, // strawberry ice cream
  mint: { colour: '#8ff0c8', sweet: true, cold: true },
  sprinkles: { colour: '#ff5fa2', sweet: true },
  cherry: { colour: '#e8122f', sweet: true },
  churro: { colour: '#d9913f', sweet: true },
  tostone: { colour: '#f2c045' },
  empanada: { colour: '#e9a64a' },
  sugar: { colour: '#ffffff', sweet: true },
  salt: { colour: '#e8eef5' },
  sauce: { colour: '#e5352b' },
  mozzarella: { colour: '#fff2c4' },
  pepperoni: { colour: '#d8342c' },
  mushroom: { colour: '#e6d3b8' },
  pepper: { colour: '#3fae3a' },
  olive: { colour: '#2b2b33' },
};

export const FRUITS = ['mango', 'strawberry', 'banana', 'pineapple'];
export const TOPPERS = ['straw', 'umbrella'];
export const LAYERS = ['bread', 'ham', 'pork', 'cheese', 'pickles']; // a Cuban, bottom up
export const TACO_FILLINGS = ['beef', 'chicken'];
export const TACO_TOPPINGS = ['lettuce', 'tomato', 'cheese', 'avocado', 'hotsauce'];
export const FLAVOURS = ['vanilla', 'chocolate', 'berry', 'mint'];
export const FRIED = ['churro', 'tostone', 'empanada'];
export const SHAKE_FOR = { churro: 'sugar', tostone: 'salt', empanada: null };
export const PIZZA_TOPPINGS = ['pepperoni', 'mushroom', 'pepper', 'olive', 'pineapple'];

// The six dishes, the station each is cooked at, and the order they arrive in the days.
export const DISHES = ['smoothie', 'icecream', 'taco', 'sandwich', 'fried', 'pizza'];
export const STATION_OF = {
  smoothie: 'blender', icecream: 'icecream', taco: 'taco', sandwich: 'press', fried: 'fryer', pizza: 'pizza',
};

// What each station's bins hold (in a kitchen with customers), and the silly extras the free
// kitchen adds to each.
export const BINS = {
  smoothie: ['mango', 'strawberry', 'banana', 'pineapple', 'straw', 'umbrella'],
  sandwich: ['bread', 'ham', 'pork', 'cheese', 'pickles'],
  taco: ['tortilla', 'beef', 'chicken', 'lettuce', 'tomato', 'cheese', 'avocado', 'hotsauce'],
  icecream: ['vanilla', 'chocolate', 'berry', 'mint', 'sprinkles', 'cherry'],
  fried: ['churro', 'tostone', 'empanada', 'sugar', 'salt'],
  pizza: ['sauce', 'mozzarella', 'pepperoni', 'mushroom', 'pepper', 'olive', 'pineapple'],
};
export const FREE_EXTRAS = {
  smoothie: ['pickles', 'hotsauce', 'chocolate'],
  sandwich: ['hotsauce', 'mango', 'banana'],
  taco: ['pickles', 'strawberry', 'chocolate'],
  icecream: ['pickles', 'hotsauce', 'banana'],
  fried: ['hotsauce', 'sprinkles'],
  pizza: ['pickles', 'banana', 'hotsauce'],
};

// ---------- small seeded random ----------

export function rng(seed) {
  let a = seed | 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, list) => list[Math.floor(r() * list.length)];
const between = (r, [lo, hi]) => lo + Math.floor(r() * (hi - lo + 1));
function pickSome(r, list, n) {
  const pool = list.slice();
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
}

// ---------- making an order ----------

// size: 1 (first days), 2 or 3 (later): how big an order of this dish may be.
// special: true lets it carry a "no ..." request (shown crossed out).
export function makeOrder(dish, r, { size = 1, special = false } = {}) {
  if (dish === 'smoothie') {
    const n = between(r, size === 1 ? [1, 2] : size === 2 ? [2, 3] : [2, 4]);
    // the first days use different fruits; later a fruit may come twice (count them!)
    const fruits = size === 1 ? pickSome(r, FRUITS, n) : Array.from({ length: n }, () => pick(r, FRUITS));
    const toppers = size > 1 && r() < 0.5 ? ['straw', 'umbrella'] : ['straw'];
    return { kind: 'smoothie', fruits: fruits.sort(), toppers };
  }
  if (dish === 'icecream') {
    const n = between(r, size === 1 ? [1, 2] : size === 2 ? [2, 2] : [2, 3]);
    const scoops = Array.from({ length: n }, () => pick(r, FLAVOURS));
    return { kind: 'icecream', scoops, sprinkles: size > 1 ? r() < 0.6 : r() < 0.4, cherry: size > 1 && r() < 0.5 };
  }
  if (dish === 'taco') {
    const tops = pickSome(r, TACO_TOPPINGS.filter((t) => size > 1 || t !== 'hotsauce'), between(r, size === 1 ? [1, 2] : [2, 3]));
    return { kind: 'taco', fillings: [pick(r, TACO_FILLINGS), ...tops], no: [] };
  }
  if (dish === 'sandwich') {
    const no = special && r() < 0.6 ? [pick(r, ['pickles', 'cheese', 'ham'])] : [];
    return { kind: 'sandwich', layers: LAYERS.filter((l) => !no.includes(l)), no };
  }
  if (dish === 'fried') {
    const food = pick(r, FRIED);
    const count = between(r, size === 1 ? [1, 2] : size === 2 ? [2, 3] : [2, 4]);
    return { kind: 'fried', pieces: Array(count).fill(food), shake: SHAKE_FOR[food] };
  }
  if (dish === 'pizza') {
    const kinds = pickSome(r, PIZZA_TOPPINGS, size === 3 ? 2 : between(r, [1, 2]));
    const toppings = [];
    for (const k of kinds) for (let i = between(r, [1, kinds.length > 1 ? 3 : 4]); i > 0; i--) toppings.push(k);
    const no = special && r() < 0.35 ? ['mozzarella'] : [];
    return { kind: 'pizza', toppings: toppings.sort(), cheese: !no.length, no };
  }
  throw new Error(`no dish ${dish}`);
}

// ---------- comparing ----------

const sorted = (a) => (a || []).slice().sort();
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// Does a made dish match an order (or another dish)? Cooking quality is not part of it.
export function sameDish(order, dish) {
  if (!order || !dish || order.kind !== dish.kind) return false;
  if (!same(sorted(order.extras), sorted(dish.extras))) return false;
  switch (order.kind) {
    case 'smoothie':
      return same(sorted(order.fruits), sorted(dish.fruits)) && same(sorted(order.toppers), sorted(dish.toppers));
    case 'sandwich':
      return same(order.layers, dish.layers);
    case 'taco':
      return same(sorted(order.fillings), sorted(dish.fillings));
    case 'icecream':
      return same(order.scoops, dish.scoops) && !!order.sprinkles === !!dish.sprinkles && !!order.cherry === !!dish.cherry;
    case 'fried':
      return same(sorted(order.pieces), sorted(dish.pieces)) && (order.shake || null) === (dish.shake || null);
    case 'pizza':
      return same(sorted(order.toppings), sorted(dish.toppings)) && !!order.cheese === !!dish.cheese;
    default:
      return false;
  }
}

// How many separate things go into a dish (for the free kitchen's "huge" reaction).
export function dishSize(d) {
  const n = (a) => (a ? a.length : 0);
  switch (d.kind) {
    case 'smoothie': return n(d.fruits) + n(d.extras);
    case 'sandwich': return n(d.layers) + n(d.extras);
    case 'taco': return n(d.fillings) + n(d.extras) + (d.tortilla === false ? 0 : 1);
    case 'icecream': return n(d.scoops) + n(d.extras) + (d.sprinkles ? 1 : 0) + (d.cherry ? 1 : 0);
    case 'fried': return n(d.pieces) + n(d.extras);
    case 'pizza': return n(d.toppings) + n(d.extras) + (d.cheese ? 1 : 0);
    default: return 0;
  }
}

// Every ingredient in a dish, as a flat list.
export function contents(d) {
  const out = [];
  const add = (a) => a && out.push(...a);
  if (d.kind === 'smoothie') add(d.fruits), add(d.toppers);
  if (d.kind === 'sandwich') add(d.layers);
  if (d.kind === 'taco') d.tortilla !== false && out.push('tortilla'), add(d.fillings);
  if (d.kind === 'icecream') add(d.scoops), d.sprinkles && out.push('sprinkles'), d.cherry && out.push('cherry');
  if (d.kind === 'fried') add(d.pieces), d.shake && out.push(d.shake);
  if (d.kind === 'pizza') d.sauce !== false && out.push('sauce'), d.cheese && out.push('mozzarella'), add(d.toppings);
  add(d.extras);
  return out;
}
