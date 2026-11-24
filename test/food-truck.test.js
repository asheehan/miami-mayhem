import { describe, it, expect } from 'vitest';
import { DAYS, generateDay, CUSTOMERS, dishesBy } from '../src/games/food-truck/days.js';
import { makeOrder, sameDish, rng, DISHES, BINS, FREE_EXTRAS, LAYERS, FRUITS, FLAVOURS, ING } from '../src/games/food-truck/recipes.js';
import {
  createStation, add, grabTool, rub, setHold, moveTo, pullOut, stepStation, takeDish, restart, needs, stationHint,
  binsFor, feedable, BLEND_TIME, PRESS_TIME, GOOD_LO, GOOD_HI, FRY_GOLD, FRY_BURN, BAKE_GOLD, BAKE_BURN, RUB_NEED, FREE_CAP,
  ALL_INGREDIENTS,
} from '../src/games/food-truck/stations.js';
import {
  createDay, step, openOrder, tapOrder, closeStation, serve, binDish, dishPoints, starsFor, coinsFor, parseProgress,
  serializeProgress, unlocked, recordDay, buy, useAwning, SHOP, AWNINGS, createFreeKitchen, openStation, feed,
  gatorReaction, atWindow, WALK_TIME, DONE_HOLD, SHRUG_TIME, LEAVE_TIME, REACT_TIME,
} from '../src/games/food-truck/sim.js';
import { playDay, driveStation } from '../src/games/food-truck/bot.js';

const run = (st, secs, dt = 1 / 60) => {
  for (let t = 0; t < secs - 1e-9; t += dt) stepStation(st, dt);
};
const holdFor = (st, secs) => {
  expect(setHold(st, true)).toBe(true);
  run(st, secs);
  if (st.holding) setHold(st, false);
};
const rubAll = (st, tool) => {
  expect(grabTool(st, tool)).toBe(true);
  for (let i = 0; i < 100 && rub(st, tool, 40) < 1; i++);
};
// run a day until a condition holds
const until = (s, cond, secs = 60) => {
  for (let t = 0; t < secs && !cond(s); t += 1 / 60) step(s, 1 / 60);
  return cond(s);
};

describe('smoothie station', () => {
  const order = { kind: 'smoothie', fruits: ['banana', 'mango', 'mango'], toppers: ['straw', 'umbrella'] };

  it('takes only the pictured fruit, by count; anything else bounces as a slip', () => {
    const st = createStation('smoothie', order);
    expect(add(st, 'strawberry')).toBe('wrong');
    expect(add(st, 'mango')).toBe('ok');
    expect(add(st, 'mango')).toBe('ok');
    expect(add(st, 'mango')).toBe('wrong'); // only two pictured
    expect(add(st, 'straw')).toBe('wrong'); // straw goes in the cup later
    expect(st.slips).toBe(3);
    expect(setHold(st, true)).toBe(false); // not all in yet
    expect(add(st, 'banana')).toBe('ok');
    expect(needs(st)).toEqual([]);
  });

  it('blends while held; letting go early just needs more, in the green is perfect', () => {
    const st = createStation('smoothie', order);
    ['banana', 'mango', 'mango'].forEach((f) => add(st, f));
    holdFor(st, BLEND_TIME * GOOD_LO * 0.5);
    expect(st.phase).toBe('blend');
    expect(st.cook).toBe(null);
    holdFor(st, BLEND_TIME * ((GOOD_LO + GOOD_HI) / 2 - GOOD_LO * 0.5));
    expect(st.cook).toBe('good');
    expect(st.phase).toBe('pour');
    expect(add(st, 'straw')).toBe('no'); // pour first
    expect(moveTo(st, 'press')).toBe(false);
    expect(moveTo(st, 'cup')).toBe(true);
    expect(add(st, 'umbrella')).toBe('ok');
    expect(add(st, 'straw')).toBe('ok');
    expect(st.phase).toBe('done');
    const d = takeDish(st);
    expect(sameDish(order, d)).toBe(true);
    expect(d.cook).toBe('good');
    expect(d.slips).toBe(0);
  });

  it('held all the way it over-blends with a splat and lets go by itself', () => {
    const st = createStation('smoothie', { kind: 'smoothie', fruits: ['mango'], toppers: ['straw'] });
    add(st, 'mango');
    setHold(st, true);
    run(st, BLEND_TIME + 0.2);
    expect(st.holding).toBe(false);
    expect(st.cook).toBe('over');
    expect(st.events.some((e) => e.type === 'smoke')).toBe(true);
    expect(st.phase).toBe('pour');
  });
});

describe('sandwich station', () => {
  it('builds bread, ham, pork, cheese, pickles strictly in order', () => {
    const st = createStation('sandwich', makeOrder('sandwich', rng(1)));
    expect(add(st, 'ham')).toBe('wrong');
    for (const l of LAYERS) {
      expect(moveTo(st, 'press')).toBe(false);
      expect(add(st, l)).toBe('ok');
    }
    expect(add(st, 'ham')).toBe('wrong');
    expect(st.dish.layers).toEqual(LAYERS);
    expect(moveTo(st, 'press')).toBe(true);
    expect(st.phase).toBe('press');
  });

  it('a "no pickles" order skips the pickles; adding them bounces', () => {
    const st = createStation('sandwich', { kind: 'sandwich', layers: ['bread', 'ham', 'pork', 'cheese'], no: ['pickles'] });
    ['bread', 'ham', 'pork', 'cheese'].forEach((l) => expect(add(st, l)).toBe('ok'));
    expect(add(st, 'pickles')).toBe('wrong');
    expect(moveTo(st, 'press')).toBe(true);
  });

  it('press timing: under keeps pressing, green is good, too long smokes but still serves', () => {
    const make = () => {
      const st = createStation('sandwich', { kind: 'sandwich', layers: LAYERS.slice(), no: [] });
      LAYERS.forEach((l) => add(st, l));
      moveTo(st, 'press');
      return st;
    };
    const a = make();
    holdFor(a, PRESS_TIME * GOOD_LO * 0.8);
    expect(a.phase).toBe('press');
    expect(a.events.some((e) => e.type === 'more')).toBe(true);
    holdFor(a, PRESS_TIME * 0.3);
    expect(a.phase).toBe('done');
    expect(takeDish(a).cook).toBe('good');

    const b = make();
    holdFor(b, PRESS_TIME * (GOOD_HI + 0.05));
    expect(b.phase).toBe('done');
    expect(takeDish(b).cook).toBe('over');
    expect(dishPoints(takeDish(b))).toBe(2);

    const c = make();
    setHold(c, true);
    run(c, PRESS_TIME + 0.5);
    expect(c.events.some((e) => e.type === 'smoke')).toBe(true);
    expect(takeDish(c).cook).toBe('over');
  });
});

describe('taco station', () => {
  it('tortilla first, then the pictured fillings in any order, each once', () => {
    const order = { kind: 'taco', fillings: ['chicken', 'lettuce', 'avocado'], no: [] };
    const st = createStation('taco', order);
    expect(add(st, 'chicken')).toBe('wrong');
    expect(add(st, 'tortilla')).toBe('ok');
    expect(add(st, 'tortilla')).toBe('wrong');
    expect(add(st, 'avocado')).toBe('ok');
    expect(add(st, 'tomato')).toBe('wrong');
    expect(add(st, 'avocado')).toBe('wrong');
    expect(add(st, 'chicken')).toBe('ok');
    expect(add(st, 'lettuce')).toBe('ok');
    expect(st.phase).toBe('done');
    expect(sameDish(order, takeDish(st))).toBe(true);
    expect(takeDish(st).slips).toBe(4);
    expect(dishPoints(takeDish(st))).toBe(2);
  });
});

describe('ice cream station', () => {
  it('scoops go on in the pictured order, then cherry and rubbed-on sprinkles', () => {
    const order = { kind: 'icecream', scoops: ['mint', 'chocolate', 'mint'], sprinkles: true, cherry: true };
    const st = createStation('icecream', order);
    expect(add(st, 'chocolate')).toBe('wrong');
    expect(add(st, 'mint')).toBe('ok');
    expect(add(st, 'cherry')).toBe('wrong'); // cherry goes on top
    expect(add(st, 'chocolate')).toBe('ok');
    expect(add(st, 'mint')).toBe('ok');
    expect(st.phase).toBe('top');
    expect(grabTool(st, 'sugar')).toBe(false);
    expect(rub(st, 'sprinkles', 0)).toBe(0);
    expect(grabTool(st, 'sprinkles')).toBe(true);
    expect(rub(st, 'sprinkles', RUB_NEED.sprinkles / 2)).toBeCloseTo(0.5);
    expect(st.dish.sprinkles).toBe(false);
    rub(st, 'sprinkles', RUB_NEED.sprinkles);
    expect(st.dish.sprinkles).toBe(true);
    expect(st.phase).toBe('top');
    expect(add(st, 'cherry')).toBe('ok');
    expect(st.phase).toBe('done');
    expect(sameDish(order, takeDish(st))).toBe(true);
  });

  it('a plain cone is done after its scoops; sprinkles then bounce', () => {
    const st = createStation('icecream', { kind: 'icecream', scoops: ['vanilla'], sprinkles: false, cherry: false });
    add(st, 'vanilla');
    expect(st.phase).toBe('done');
    expect(grabTool(st, 'sprinkles')).toBe(false);
  });
});

describe('fryer station', () => {
  const order = { kind: 'fried', pieces: ['churro', 'churro', 'churro'], shake: 'sugar' };

  it('takes exactly the pictured count of the right food', () => {
    const st = createStation('fried', order);
    expect(add(st, 'tostone')).toBe('wrong');
    for (let i = 0; i < 3; i++) expect(add(st, 'churro')).toBe('ok');
    expect(add(st, 'churro')).toBe('wrong'); // a fourth: count them!
    expect(st.pieces.length).toBe(3);
  });

  it('a pale piece plops back in; golden is good; dark is over-done but still comes out', () => {
    const st = createStation('fried', order);
    add(st, 'churro');
    run(st, FRY_GOLD * 0.5);
    const p = st.pieces[0];
    expect(pullOut(st, p.id)).toBe('notyet');
    run(st, FRY_GOLD * 0.6);
    expect(st.events.some((e) => e.type === 'ding')).toBe(true);
    expect(pullOut(st, p.id)).toBe('ok');
    add(st, 'churro');
    add(st, 'churro');
    run(st, FRY_BURN + 0.5);
    expect(st.events.some((e) => e.type === 'burnt')).toBe(true);
    for (const q of st.pieces.filter((k) => !k.out)) expect(pullOut(st, q.id)).toBe('ok');
    expect(st.phase).toBe('shake');
    expect(grabTool(st, 'salt')).toBe(false);
    rubAll(st, 'sugar');
    expect(st.phase).toBe('done');
    const d = takeDish(st);
    expect(sameDish(order, d)).toBe(true);
    expect(d.cook).toBe('over');
  });

  it('empanadas need no shaking', () => {
    const st = createStation('fried', { kind: 'fried', pieces: ['empanada'], shake: null });
    add(st, 'empanada');
    run(st, FRY_GOLD + 0.1);
    pullOut(st, st.pieces[0].id);
    expect(st.phase).toBe('done');
  });
});

describe('pizza station', () => {
  it('sauce, cheese, toppings by count, then the oven with a golden window', () => {
    const order = { kind: 'pizza', toppings: ['mushroom', 'pepperoni', 'pepperoni', 'pepperoni'], cheese: true, no: [] };
    const st = createStation('pizza', order);
    expect(add(st, 'pepperoni')).toBe('wrong');
    rubAll(st, 'sauce');
    expect(st.phase).toBe('cheese');
    rubAll(st, 'mozzarella');
    expect(st.phase).toBe('top');
    for (let i = 0; i < 3; i++) expect(add(st, 'pepperoni')).toBe('ok');
    expect(add(st, 'pepperoni')).toBe('wrong'); // only three pictured
    expect(moveTo(st, 'oven')).toBe(false);
    expect(add(st, 'mushroom')).toBe('ok');
    expect(moveTo(st, 'oven')).toBe(true);
    run(st, BAKE_GOLD - 1);
    expect(pullOut(st, 'oven')).toBe('notyet');
    run(st, 1.5);
    expect(pullOut(st, 'oven')).toBe('ok');
    const d = takeDish(st);
    expect(d.cook).toBe('good');
    expect(sameDish(order, d)).toBe(true);
  });

  it('"no cheese" skips the cheese step, and a long bake burns', () => {
    const st = createStation('pizza', { kind: 'pizza', toppings: ['olive'], cheese: false, no: ['mozzarella'] });
    rubAll(st, 'sauce');
    expect(st.phase).toBe('top');
    expect(grabTool(st, 'mozzarella')).toBe(false);
    add(st, 'olive');
    moveTo(st, 'oven');
    run(st, BAKE_BURN + 0.5);
    pullOut(st, 'oven');
    expect(takeDish(st).cook).toBe('over');
  });

  it('the bin starts a dish again', () => {
    const st = createStation('pizza', { kind: 'pizza', toppings: ['olive'], cheese: true, no: [] });
    rubAll(st, 'sauce');
    restart(st);
    expect(st.phase).toBe('sauce');
    expect(st.dish.sauce).toBe(false);
  });
});

describe('hints', () => {
  it('every station hint is an action that moves it on', () => {
    for (const dish of DISHES) {
      const o = makeOrder(dish, rng(3), { size: 3 });
      const st = createStation(dish, o);
      for (let i = 0; i < 4000 && st.phase !== 'done'; i++) {
        driveStation(st);
        stepStation(st, 1 / 30);
      }
      expect(st.phase, dish).toBe('done');
      const d = takeDish(st);
      expect(sameDish(o, d), dish).toBe(true);
      expect(dishPoints(d), dish).toBe(3);
      expect(stationHint(st)).toBe(null);
    }
  });
});

describe('orders and days', () => {
  it('there are twelve days, 4 customers rising to 8, introducing one thing each', () => {
    expect(DAYS.length).toBe(12);
    expect(DAYS[0].customers).toBe(4);
    expect(DAYS[DAYS.length - 1].customers).toBe(8);
    for (let i = 1; i < DAYS.length; i++) expect(DAYS[i].customers).toBeGreaterThanOrEqual(DAYS[i - 1].customers);
    const fresh = DAYS.map((d) => d.fresh);
    expect(new Set(fresh).size).toBe(DAYS.length);
    // each dish's first day is the day that calls it fresh
    for (const dish of DISHES) {
      const first = DAYS.findIndex((d) => d.menu.includes(dish));
      expect(DAYS[first].fresh, dish).toBe(dish);
    }
    expect(dishesBy(DAYS.length - 1).sort()).toEqual(DISHES.slice().sort());
  });

  it('day 1 is trivially simple: smoothies of one or two different fruits, a straw, no waiting', () => {
    expect(DAYS[0].menu).toEqual(['smoothie']);
    expect(DAYS[0].patience).toBe(0);
    expect(DAYS[0].queue).toBe(1);
    for (const seed of [1, 2, 3, 4, 5]) {
      for (const c of generateDay(0, seed)) {
        expect(c.items.length).toBe(1);
        const o = c.items[0];
        expect(o.kind).toBe('smoothie');
        expect(o.fruits.length).toBeGreaterThanOrEqual(1);
        expect(o.fruits.length).toBeLessThanOrEqual(2);
        expect(new Set(o.fruits).size).toBe(o.fruits.length);
        expect(o.toppers).toEqual(['straw']);
      }
    }
  });

  it('patience, two-dish orders and the rush come late, and only after the dishes are met', () => {
    const firstWith = (f) => DAYS.findIndex(f);
    expect(firstWith((d) => d.patience > 0)).toBeGreaterThanOrEqual(6);
    expect(firstWith((d) => d.two > 0)).toBeGreaterThan(firstWith((d) => d.patience > 0));
    expect(firstWith((d) => d.queue > 1)).toBeGreaterThan(firstWith((d) => d.two > 0));
    expect(firstWith((d) => d.special > 0)).toBeGreaterThan(firstWith((d) => d.menu.includes('sandwich')));
  });

  for (let i = 0; i < DAYS.length; i++) {
    it(`day ${i + 1}: seeded orders use only dishes met so far, are valid, and the first is the new dish`, () => {
      const met = dishesBy(i);
      expect(generateDay(i, 7)).toEqual(generateDay(i, 7));
      for (const seed of [1, 2, 3, 11, 99]) {
        const day = generateDay(i, seed);
        expect(day.length).toBe(DAYS[i].customers);
        if (DISHES.includes(DAYS[i].fresh)) expect(day[0].items[0].kind).toBe(DAYS[i].fresh);
        for (const c of day) {
          expect(CUSTOMERS).toContain(c.who);
          expect(c.items.length).toBeLessThanOrEqual(DAYS[i].two > 0 ? 2 : 1);
          for (const o of c.items) {
            expect(DAYS[i].menu).toContain(o.kind);
            expect(met).toContain(o.kind);
            // every ingredient is one the station has a bin for, and "no" requests are real
            const bins = BINS[o.kind];
            if (o.kind === 'smoothie') [...o.fruits, ...o.toppers].forEach((x) => expect(bins).toContain(x));
            if (o.kind === 'sandwich') {
              expect(o.layers[0]).toBe('bread');
              expect([...o.layers, ...o.no].sort()).toEqual(LAYERS.slice().sort());
              expect(o.layers).toEqual(LAYERS.filter((l) => !o.no.includes(l)));
            }
            if (o.kind === 'taco') {
              expect(['beef', 'chicken']).toContain(o.fillings[0]);
              expect(new Set(o.fillings).size).toBe(o.fillings.length);
              o.fillings.forEach((x) => expect(bins).toContain(x));
            }
            if (o.kind === 'icecream') o.scoops.forEach((x) => expect(FLAVOURS).toContain(x));
            if (o.kind === 'fried') {
              expect(new Set(o.pieces).size).toBe(1);
              expect(o.pieces.length).toBeLessThanOrEqual(4);
            }
            if (o.kind === 'pizza') {
              o.toppings.forEach((x) => expect(bins).toContain(x));
              expect(o.cheese).toBe(!o.no.includes('mozzarella'));
            }
            if (o.no?.length) expect(DAYS[i].special).toBeGreaterThan(0);
          }
        }
      }
    });
  }

  it('the special-request day opens with a crossed-out picture', () => {
    const i = DAYS.findIndex((d) => d.fresh === 'special');
    for (const seed of [1, 2, 3, 4, 5, 6]) expect(generateDay(i, seed)[0].items[0].no.length).toBe(1);
  });

  it('matching ignores the order of order-free things but not of layers and scoops', () => {
    expect(sameDish({ kind: 'smoothie', fruits: ['mango', 'banana'], toppers: ['straw'] }, { kind: 'smoothie', fruits: ['banana', 'mango'], toppers: ['straw'], extras: [] })).toBe(true);
    expect(sameDish({ kind: 'smoothie', fruits: ['mango'], toppers: ['straw'] }, { kind: 'smoothie', fruits: ['mango', 'mango'], toppers: ['straw'] })).toBe(false);
    expect(sameDish({ kind: 'icecream', scoops: ['mint', 'vanilla'] }, { kind: 'icecream', scoops: ['vanilla', 'mint'] })).toBe(false);
    expect(sameDish({ kind: 'taco', fillings: ['beef', 'tomato'] }, { kind: 'taco', fillings: ['tomato', 'beef'] })).toBe(true);
    expect(sameDish({ kind: 'taco', fillings: ['beef'] }, { kind: 'pizza', toppings: [] })).toBe(false);
  });
});

describe('a day at the window', () => {
  const day1 = () => createDay(0, 1, [
    { who: 'pelican', items: [{ kind: 'smoothie', fruits: ['mango'], toppers: ['straw'] }] },
    { who: 'gator', items: [{ kind: 'smoothie', fruits: ['banana', 'strawberry'], toppers: ['straw'] }] },
  ]);
  const cook = (s) => {
    for (let i = 0; i < 3000 && s.station; i++) {
      driveStation(s.station);
      step(s, 1 / 30);
    }
  };

  it('a customer walks up, orders, gets their smoothie, munches, pays and leaves', () => {
    const s = day1();
    expect(atWindow(s).length).toBe(0);
    expect(until(s, (q) => q.customers[0].state === 'wait', WALK_TIME + 2)).toBe(true);
    expect(s.customers[1].state).toBe('queued'); // one at a time
    expect(openOrder(s, 2, 0)).toBe(false);
    expect(tapOrder(s, 1, 0)).toBe(true);
    expect(s.station.kind).toBe('smoothie');
    cook(s);
    expect(s.counter.length).toBe(1);
    expect(serve(s, s.counter[0].id, 1)).toBe('ok');
    expect(s.customers[0].state).toBe('eat');
    expect(s.customers[0].mood).toBe('love');
    expect(s.coins).toBe(3);
    expect(until(s, (q) => q.customers[1].state === 'wait')).toBe(true);
    expect(s.customers[0].state).toBe('gone');
  });

  it('a dish for someone else is refused and costs that dish a slip', () => {
    const s = createDay(10, 1, [
      { who: 'pelican', items: [{ kind: 'smoothie', fruits: ['mango'], toppers: ['straw'] }] },
      { who: 'gator', items: [{ kind: 'taco', fillings: ['beef', 'cheese'], no: [] }] },
    ]);
    expect(until(s, (q) => q.customers.every((c) => c.state === 'wait'))).toBe(true); // a rush: both at once
    expect(new Set(s.customers.map((c) => c.spot)).size).toBe(2);
    tapOrder(s, 2, 0);
    cook(s);
    const k = s.counter[0];
    expect(serve(s, k.id, 1)).toBe('wrong');
    expect(k.dish.slips).toBe(1);
    expect(s.customers[0].mood).toBe('no');
    expect(serve(s, k.id, 2)).toBe('ok');
  });

  it('backing out keeps the dish in progress for that order; another order replaces it', () => {
    const s = day1();
    until(s, (q) => q.customers[0].state === 'wait');
    tapOrder(s, 1, 0);
    add(s.station, 'mango');
    closeStation(s);
    expect(s.station).toBe(null);
    expect(tapOrder(s, 1, 0)).toBe(true);
    expect(s.station.dish.fruits).toEqual(['mango']);
  });

  it('patience only drains while nobody is cooking for them; running out is a shrug, not a fail', () => {
    const s = createDay(7, 1, [
      { who: 'abuela', items: [{ kind: 'taco', fillings: ['beef'], no: [] }] },
      { who: 'skater', items: [{ kind: 'taco', fillings: ['beef'], no: [] }] },
    ]);
    until(s, (q) => q.customers[0].state === 'wait');
    const max = s.customers[0].patienceMax;
    expect(max).toBe(DAYS[7].patience);
    step(s, 0.05);
    for (let i = 0; i < 300; i++) step(s, 0.1);
    const before = s.customers[0].patience;
    expect(before).toBeLessThan(max);
    tapOrder(s, 1, 0);
    for (let i = 0; i < 300; i++) step(s, 0.1);
    expect(s.customers[0].patience).toBeCloseTo(before, 5); // cooking for them: they wait happily
    closeStation(s);
    for (let i = 0; i < max * 10 + 10 && s.customers[0].state === 'wait'; i++) step(s, 0.1);
    expect(s.customers[0].state).toBe('shrug');
    expect(s.parked).toBe(null);
    for (let i = 0; i < (SHRUG_TIME + LEAVE_TIME) * 10 + 5; i++) step(s, 0.1);
    expect(s.customers[0].state).toBe('gone');
    expect(s.left).toBe(1);
    // the second still comes and can be served; the day ends with a star
    expect(until(s, (q) => q.customers[1].state === 'wait')).toBe(true);
    tapOrder(s, 2, 0);
    cook(s);
    serve(s, s.counter[0].id, 2);
    expect(until(s, (q) => q.status === 'done')).toBe(true);
    expect(s.stars).toBe(2); // one perfect (3), one left (0): a mean of 1.5
  });

  it('no patience meter on the early days', () => {
    const s = day1();
    until(s, (q) => q.customers[0].state === 'wait');
    for (let i = 0; i < 6000; i++) step(s, 0.1);
    expect(s.customers[0].state).toBe('wait');
  });

  it('a finished dish shows off in the station before going to the counter; dishes can be binned', () => {
    const s = day1();
    until(s, (q) => q.customers[0].state === 'wait');
    tapOrder(s, 1, 0);
    for (let i = 0; i < 3000 && s.station.phase !== 'done'; i++) {
      driveStation(s.station);
      step(s, 1 / 60);
    }
    expect(s.counter.length).toBe(0);
    for (let t = 0; t < DONE_HOLD * 0.5; t += 0.05) step(s, 0.05);
    expect(s.station).not.toBe(null);
    for (let t = 0; t < DONE_HOLD * 0.6; t += 0.05) step(s, 0.05);
    expect(s.station).toBe(null);
    expect(binDish(s, s.counter[0].id)).toBe(true);
    expect(s.counter.length).toBe(0);
  });
});

describe('scoring', () => {
  it('dish points: 3, minus one for over-done, minus one for slips, never below 1', () => {
    expect(dishPoints({ cook: 'good', slips: 0 })).toBe(3);
    expect(dishPoints({ cook: 'good', slips: 1 })).toBe(3);
    expect(dishPoints({ cook: 'over', slips: 0 })).toBe(2);
    expect(dishPoints({ cook: 'good', slips: 2 })).toBe(2);
    expect(dishPoints({ cook: 'over', slips: 9 })).toBe(1);
  });

  it('stars from the mean of customer points, at least one', () => {
    expect(starsFor([3, 3, 3, 3])).toBe(3);
    expect(starsFor([3, 3, 2, 2])).toBe(3);
    expect(starsFor([2, 2, 2, 2])).toBe(2);
    expect(starsFor([3, 0, 3, 0])).toBe(2);
    expect(starsFor([1, 1, 1, 1])).toBe(1);
    expect(starsFor([0, 0, 0])).toBe(1);
  });

  it('coins: 2 a dish and a tip for each perfect one', () => {
    expect(coinsFor([3])).toBe(3);
    expect(coinsFor([2])).toBe(2);
    expect(coinsFor([3, 1])).toBe(5);
  });
});

describe('progress and the shop', () => {
  it('parses junk as a fresh start and round-trips', () => {
    for (const raw of [null, '', 'nope', '[]', '{"stars":"x"}', '{"stars":[9,-1,"a",2.5]}']) {
      const p = parseProgress(raw);
      expect(p.stars).toEqual(Array(12).fill(0));
      expect(p.coins).toBe(0);
      expect(p.owned).toEqual([]);
      expect(p.awning).toBe('awning-pink');
    }
    const p = parseProgress('{"stars":[3,2],"coins":40,"owned":["lights","bogus","lights","awning-lime"],"awning":"awning-lime"}');
    expect(p.stars.slice(0, 3)).toEqual([3, 2, 0]);
    expect(p.owned).toEqual(['lights', 'awning-lime']);
    expect(p.awning).toBe('awning-lime');
    expect(parseProgress(serializeProgress(p))).toEqual(p);
    expect(parseProgress('{"awning":"awning-purple"}').awning).toBe('awning-pink'); // not owned
  });

  it('days unlock one after another; best stars are kept and coins add up', () => {
    const p = parseProgress(null);
    expect(unlocked(p, 0)).toBe(true);
    expect(unlocked(p, 1)).toBe(false);
    recordDay(p, 0, 2, 10);
    recordDay(p, 0, 1, 5);
    expect(p.stars[0]).toBe(2);
    expect(p.coins).toBe(15);
    expect(unlocked(p, 1)).toBe(true);
    expect(unlocked(p, 2)).toBe(false);
  });

  it('buying takes coins, refuses when short, never twice, and puts a new awning up', () => {
    const p = parseProgress(null);
    p.coins = 20;
    expect(buy(p, 'disco')).toBe('poor');
    expect(buy(p, 'lights')).toBe('ok');
    expect(p.coins).toBe(0);
    expect(buy(p, 'lights')).toBe('owned');
    expect(buy(p, 'rocket')).toBe('no');
    p.coins = 12;
    expect(buy(p, 'awning-lime')).toBe('ok');
    expect(p.awning).toBe('awning-lime');
    expect(useAwning(p, 'awning-pink')).toBe(true);
    expect(useAwning(p, 'awning-purple')).toBe(false);
    expect(useAwning(p, 'awning-lime')).toBe(true);
    expect(SHOP.every((k) => k.price > 0)).toBe(true);
    expect(AWNINGS.filter((a) => a !== 'awning-pink').every((a) => SHOP.some((k) => k.id === a))).toBe(true);
  });

  it('a full run of perfect days earns enough to buy everything', () => {
    let coins = 0;
    for (let i = 0; i < DAYS.length; i++) {
      const s = playDay(createDay(i, 1));
      coins += s.coins;
    }
    expect(coins).toBeGreaterThanOrEqual(SHOP.reduce((a, k) => a + k.price, 0));
  });
});

describe('the free kitchen', () => {
  const make = (kind, fn) => {
    const s = createFreeKitchen();
    openStation(s, kind);
    fn(s.station);
    return feed(s);
  };

  it('anything goes: a ten-scoop cone, an everything smoothie, pickles anywhere, no slips', () => {
    const s = createFreeKitchen();
    expect(feed(s)).toBe(null);
    openStation(s, 'icecream');
    for (let i = 0; i < 10; i++) expect(add(s.station, FLAVOURS[i % 4])).toBe('ok');
    for (let i = 0; i < FREE_CAP; i++) add(s.station, 'vanilla');
    expect(s.station.dish.scoops.length).toBe(FREE_CAP);
    expect(s.station.slips).toBe(0);
    expect(s.station.phase).toBe('scoop'); // never finishes by itself
    expect(binsFor(s.station)).toEqual([...BINS.icecream, ...FREE_EXTRAS.icecream]);
    const r = feed(s);
    expect(r.kind).toBe('freeze');
    expect(s.station).toBe(null);
    expect(s.gator.reaction.kind).toBe('freeze');
    for (let i = 0; i < REACT_TIME * 10 + 2; i++) step(s, 0.1);
    expect(s.gator.reaction).toBe(null);
  });

  it('the gator loves a proper dish', () => {
    expect(make('taco', (st) => ['tortilla', 'beef', 'cheese'].forEach((x) => add(st, x))).kind).toBe('love');
    expect(make('smoothie', (st) => {
      add(st, 'mango');
      holdFor(st, BLEND_TIME * 0.7);
      moveTo(st, 'cup');
      add(st, 'straw');
    }).kind).toBe('love');
  });

  it('pickles in a smoothie or on ice cream: yuck', () => {
    expect(make('smoothie', (st) => ['banana', 'pickles'].forEach((x) => add(st, x))).kind).toBe('yuck');
    expect(make('icecream', (st) => ['vanilla', 'pickles'].forEach((x) => add(st, x))).kind).toBe('yuck');
  });

  it('hot sauce: fire breath, bigger with more', () => {
    const r = make('taco', (st) => ['tortilla', 'beef', 'hotsauce', 'hotsauce'].forEach((x) => add(st, x)));
    expect(r).toEqual({ kind: 'fire', power: 2 });
  });

  it('brain freeze from a tall cone or ice cream in a smoothie', () => {
    expect(make('icecream', (st) => ['mint', 'mint', 'mint', 'mint'].forEach((x) => add(st, x))).kind).toBe('freeze');
    expect(make('smoothie', (st) => ['mango', 'chocolate'].forEach((x) => add(st, x))).kind).toBe('freeze');
  });

  it('burnt things make a sooty cough; raw dough is yuck', () => {
    expect(make('sandwich', (st) => {
      add(st, 'bread');
      moveTo(st, 'press');
      setHold(st, true);
      run(st, PRESS_TIME + 1);
    }).kind).toBe('smoke');
    expect(make('pizza', () => {}).kind).toBe('yuck');
    expect(make('fried', (st) => {
      add(st, 'churro');
      run(st, FRY_BURN + 1);
      pullOut(st, st.pieces[0].id);
    }).kind).toBe('smoke');
  });

  it('a giant pile burps, every fruit makes a rainbow', () => {
    expect(make('sandwich', (st) => {
      for (let i = 0; i < 9; i++) add(st, ['ham', 'pork', 'cheese'][i % 3]);
    }).kind).toBe('burp');
    expect(make('smoothie', (st) => FRUITS.forEach((f) => add(st, f))).kind).toBe('rainbow');
  });

  it('every station feeds something once anything is on it', () => {
    for (const dish of DISHES) {
      const st = createStation(dish, null, { free: true });
      const first = binsFor(st).find((x) => add(createStation(dish, null, { free: true }), x) === 'ok');
      expect(first, dish).toBeTruthy();
      add(st, first);
      expect(feedable(st), dish).toBe(true);
      expect(['love', 'yum', 'yuck', 'fire', 'freeze', 'smoke', 'burp', 'rainbow']).toContain(gatorReaction(takeDish(st)).kind);
    }
  });

  it('every bin holds a known ingredient with a colour', () => {
    for (const dish of DISHES) {
      for (const x of [...BINS[dish], ...FREE_EXTRAS[dish]]) {
        expect(ING[x], x).toBeTruthy();
        expect(ALL_INGREDIENTS.has(x), x).toBe(true);
      }
    }
  });
});

describe('the bots', () => {
  for (let i = 0; i < DAYS.length; i++) {
    it(`day ${i + 1}: a tidy chef gets 3 stars; a sloppy one still finishes with at least 1`, () => {
      for (const seed of [1, 5]) {
        const s = playDay(createDay(i, seed));
        expect(s.status, `tidy seed ${seed}`).toBe('done');
        expect(s.stars).toBe(3);
        expect(s.left).toBe(0);
        expect(s.served).toBe(DAYS[i].customers);
        const m = playDay(createDay(i, seed), { sloppy: true });
        expect(m.status, `sloppy seed ${seed}`).toBe('done');
        expect(m.stars).toBeGreaterThanOrEqual(1);
        expect(m.customers.some((c) => c.points.some((p) => p > 0 && p < 3))).toBe(true);
      }
    });
  }
});
