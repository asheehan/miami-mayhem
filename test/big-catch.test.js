import { describe, it, expect } from 'vitest';
import {
  createTrip, step, steer, touches, payout, haulPlan, haulProgress, depthBonus, settle, sanitize,
  newProgress, priceOf, canBuy, buy, maxed, albumCount, tripOptions, speciesAt, shallowestOf, zoneAt,
  FIELD_W, MAX_DEPTH, ROW_START, CAST_TIME, TURN_TIME, SINK_SPEED, REEL_SPEED, REEL_MIN_TIME, FULL_REEL_SPEED, reelSpeed,
  LINE, BUCKET, LURE, PRICES, ZONES, SPECIES, SPECIES_BY_ID, ALBUM, CHEST_VALUE, MIN_BONUS, ZAP_SAFE,
  UPGRADES, HOOK_MIN_X,
} from '../src/games/big-catch/sim.js';
import { playTrip, carefulTarget, clumsyBot, shopCheapest, predictX } from '../src/games/big-catch/bot.js';

const DT = 1 / 30;
const tick = () => new Promise((r) => setImmediate(r));
const run = (s, secs) => {
  for (let t = 0; t < secs - 1e-9; t += DT) step(s, DT);
};
const runUntil = (s, phase, limit = 120) => {
  for (let t = 0; t < limit && s.phase !== phase; t += DT) step(s, DT);
};
// A trip with nothing in the sea, so tests can place exactly what they want.
function emptyTrip(opts = {}) {
  const s = createTrip({ seed: 5, ...opts });
  s.creatures = [];
  return s;
}
function put(s, sp, x, y, extra = {}) {
  const d = SPECIES_BY_ID[sp];
  const c = { id: s.nextId++, sp, kind: d.kind, x, y, dir: 1, speed: 0, rx: d.rx, ry: d.ry, state: 'swim', fleeUntil: -1, look: 0, ...extra };
  s.creatures.push(c);
  return c;
}
// Gets an empty trip to the start of the reel at depth `y`.
function reelFrom(y, opts = {}) {
  const s = emptyTrip({ line: LINE.findIndex((l) => l >= y), ...opts });
  runUntil(s, 'drop');
  s.hook.y = y - 0.01;
  s.lineLen = y;
  runUntil(s, 'reel');
  s.creatures = s.creatures.filter((c) => c.state === 'hooked'); // no fresh arrivals
  return s;
}

describe('the trip, phase by phase', () => {
  it('casts, then sinks at a steady speed', () => {
    const s = emptyTrip();
    expect(s.phase).toBe('cast');
    run(s, CAST_TIME - 0.1);
    expect(s.phase).toBe('cast');
    expect(s.hook.y).toBe(0);
    run(s, 0.2);
    expect(s.phase).toBe('drop');
    const y = s.hook.y;
    run(s, 1);
    expect(s.hook.y - y).toBeCloseTo(SINK_SPEED, 0);
  });

  it('the drop ends where the line runs out, then turns and reels up', () => {
    const s = emptyTrip({ line: 2 });
    runUntil(s, 'turn');
    expect(s.dropEnd.reason).toBe('line');
    expect(s.dropEnd.depth).toBe(LINE[2]);
    expect(s.hook.y).toBe(LINE[2]);
    expect(s.depth).toBe(LINE[2]);
    run(s, TURN_TIME + DT);
    expect(s.phase).toBe('reel');
    const y = s.hook.y;
    s.creatures = [];
    run(s, 1);
    expect(y - s.hook.y).toBeCloseTo(Math.min(REEL_SPEED, LINE[2] / REEL_MIN_TIME), 0);
    runUntil(s, 'haul');
    expect(s.hook.y).toBe(0);
    runUntil(s, 'done');
    expect(s.phase).toBe('done');
  });

  it('touching any creature on the way down ends the drop right there', () => {
    for (const sp of ['sergeant', 'jelly', 'boot', 'turtle']) {
      const s = emptyTrip({ line: 5 });
      runUntil(s, 'drop');
      const c = put(s, sp, s.hook.x, 40);
      runUntil(s, 'turn');
      expect(s.dropEnd.reason).toBe('bump');
      expect(s.dropEnd.by).toBe(sp);
      expect(s.dropEnd.depth).toBeLessThan(40);
      expect(s.dropEnd.depth).toBeGreaterThan(40 - c.ry - 3);
      // the creature dashes off and nothing was caught
      expect(c.fleeUntil).toBeGreaterThan(s.t);
      expect(s.line.length).toBe(0);
    }
  });

  it('steering past a creature avoids it', () => {
    const s = emptyTrip({ line: 1 });
    runUntil(s, 'drop');
    put(s, 'snapper', FIELD_W / 2, 30);
    steer(s, HOOK_MIN_X);
    runUntil(s, 'turn');
    expect(s.dropEnd.reason).toBe('line');
  });

  it('the hook follows the finger smoothly and stays on screen', () => {
    const s = emptyTrip();
    steer(s, 1000);
    run(s, 0.05);
    expect(s.hook.x).toBeGreaterThan(FIELD_W / 2);
    expect(s.hook.x).toBeLessThan(FIELD_W - HOOK_MIN_X);
    run(s, 2);
    expect(s.hook.x).toBeCloseTo(FIELD_W - HOOK_MIN_X, 3);
    steer(s, 20);
    run(s, 2);
    expect(s.hook.x).toBeCloseTo(20, 2);
  });
});

describe('reeling in', () => {
  it('every fish touched goes on the line, up to the bucket size', () => {
    const s = reelFrom(100, { bucket: 0 });
    for (let i = 0; i < 6; i++) put(s, 'snapper', s.hook.x, 90 - i * 10);
    runUntil(s, 'haul');
    expect(s.line.length).toBe(BUCKET[0]);
    expect(s.line.every((c) => c.state === 'hooked')).toBe(true);
    expect(s.creatures.filter((c) => c.state === 'swim').length).toBe(6 - BUCKET[0]);
    expect(s.events.some((e) => e.type === 'full')).toBe(true);
  });

  it('a full bucket reels up faster', () => {
    const s = reelFrom(100, { bucket: 0 });
    for (let i = 0; i < BUCKET[0]; i++) s.line.push({ sp: 'snapper', kind: 'fish', state: 'hooked' });
    const y = s.hook.y;
    run(s, 1);
    expect(y - s.hook.y).toBeCloseTo(FULL_REEL_SPEED, 0);
  });

  it('a short reel slows down so there is time to catch something', () => {
    const s = reelFrom(30);
    expect(reelSpeed(s)).toBeCloseTo(30 / REEL_MIN_TIME);
    let t = 0;
    while (s.phase === 'reel') {
      step(s, DT);
      t += DT;
    }
    expect(t).toBeGreaterThan(REEL_MIN_TIME - 0.2);
  });

  it('a bigger bucket carries more', () => {
    const s = reelFrom(100, { bucket: 3 });
    for (let i = 0; i < 10; i++) put(s, 'sergeant', s.hook.x, 92 - i * 8);
    runUntil(s, 'haul');
    expect(s.line.length).toBe(BUCKET[3]);
  });

  it('junk takes a bucket slot and is worth nothing', () => {
    const s = reelFrom(60);
    put(s, 'boot', s.hook.x, 50);
    put(s, 'snapper', s.hook.x, 35);
    runUntil(s, 'haul');
    expect(s.line.map((c) => c.sp)).toEqual(['boot', 'snapper']);
    expect(s.haul.total).toBe(SPECIES_BY_ID.snapper.value + depthBonus(60));
  });

  it('a jellyfish zaps one fish off the line, a pufferfish two', () => {
    for (const [zapper, lost] of [['jelly', 1], ['puffer', 2]]) {
      const s = reelFrom(100, { bucket: 4 });
      for (let i = 0; i < 3; i++) put(s, 'sergeant', s.hook.x, 95 - i * 5);
      put(s, zapper, s.hook.x, 60);
      run(s, (100 - 70) / REEL_SPEED);
      expect(s.line.length).toBe(3);
      runUntil(s, 'haul');
      expect(s.line.length).toBe(3 - lost);
      expect(s.events.filter((e) => e.type === 'lost').length).toBe(lost);
      // the freed fish swim off and aren't caught again straight away
      expect(s.creatures.filter((c) => c.sp === 'sergeant' && c.state === 'swim').length).toBe(lost);
    }
  });

  it('a sting gives a moment of safety', () => {
    const s = reelFrom(100, { bucket: 4 });
    for (let i = 0; i < 3; i++) put(s, 'sergeant', s.hook.x, 95 - i * 5);
    put(s, 'jelly', s.hook.x, 60);
    put(s, 'jelly', s.hook.x, 60 - REEL_SPEED * ZAP_SAFE * 0.5);
    runUntil(s, 'haul');
    expect(s.events.filter((e) => e.type === 'zap').length).toBe(1);
    expect(s.line.length).toBe(2);
  });

  it('a zap with nothing on the line costs nothing', () => {
    const s = reelFrom(60);
    put(s, 'jelly', s.hook.x, 40);
    runUntil(s, 'haul');
    expect(s.events.some((e) => e.type === 'zap')).toBe(true);
    expect(s.line.length).toBe(0);
  });

  it('turtles and manatees are only in the way: a bonk, never a catch', () => {
    const s = reelFrom(60);
    const x = s.hook.x;
    put(s, 'turtle', x, 40);
    runUntil(s, 'haul');
    expect(s.line.length).toBe(0);
    expect(s.events.some((e) => e.type === 'bonk')).toBe(true);
    expect(s.creatures[0].state).toBe('swim');
  });

  it('the lucky lure reaches fish further away', () => {
    const near = (lure) => {
      const s = reelFrom(60, { lure });
      steer(s, s.hook.x);
      put(s, 'snapper', s.hook.x + SPECIES_BY_ID.snapper.rx + 4.5, 40);
      runUntil(s, 'haul');
      return s.line.length;
    };
    expect(near(0)).toBe(0);
    expect(near(LURE.length - 1)).toBe(1);
  });

  it('reaching the sea bed hooks the treasure chest', () => {
    const s = emptyTrip({ line: LINE.length - 1 });
    runUntil(s, 'turn', 200);
    expect(s.dropEnd.reason).toBe('bottom');
    expect(s.chest).toBe(true);
    runUntil(s, 'haul', 200);
    expect(s.haul.items.some((it) => it.kind === 'chest' && it.value === CHEST_VALUE)).toBe(true);
  });
});

describe('the haul and payout', () => {
  it('pays every fish, the chest and a depth bonus', () => {
    expect(payout([], 0)).toBe(MIN_BONUS);
    expect(payout(['sergeant', 'snapper', 'boot'], 50)).toBe(1 + 2 + 0 + depthBonus(50));
    expect(payout(['squid'], MAX_DEPTH, true)).toBe(SPECIES_BY_ID.squid.value + CHEST_VALUE + depthBonus(MAX_DEPTH));
    expect(depthBonus(0)).toBe(MIN_BONUS);
    expect(depthBonus(400)).toBeGreaterThan(depthBonus(100));
  });

  it('marks a species new only the first time, and only if the album lacks it', () => {
    const plan = haulPlan(['snapper', 'snapper', 'sergeant', 'can'], false, 30, { sergeant: 2 });
    expect(plan.items.map((it) => it.isNew)).toEqual([true, false, false, false, false]);
    expect(plan.items.at(-1).kind).toBe('bonus');
    expect(plan.total).toBe(payout(['snapper', 'snapper', 'sergeant', 'can'], 30));
  });

  it('counts up as the catch lands, one by one, then finishes', () => {
    const s = reelFrom(50);
    for (let i = 0; i < 3; i++) put(s, 'snapper', s.hook.x, 45 - i * 8);
    runUntil(s, 'haul');
    const n = s.haul.items.length;
    expect(haulProgress(s)).toEqual({ landed: 0, counted: 0 });
    const lands = s.haul.items.map((it) => it.land);
    for (let i = 1; i < n; i++) expect(lands[i]).toBeGreaterThan(lands[i - 1]);
    run(s, s.haul.items[1].land + 0.01);
    expect(haulProgress(s).landed).toBe(2);
    expect(haulProgress(s).counted).toBe(4);
    runUntil(s, 'done');
    expect(haulProgress(s)).toEqual({ landed: n, counted: s.haul.total });
  });

  it('settling adds the sand dollars, the album entries, the best depth and the chest', () => {
    const s = reelFrom(80);
    put(s, 'snapper', s.hook.x, 70);
    put(s, 'parrot', s.hook.x, 60);
    runUntil(s, 'haul');
    const p0 = { ...newProgress(), coins: 5, album: { snapper: 1 } };
    const r = settle(p0, s);
    expect(r.gained).toBe(2 + 4 + depthBonus(80));
    expect(r.progress.coins).toBe(5 + r.gained);
    expect(r.progress.album).toEqual({ snapper: 2, parrot: 1 });
    expect(r.newSpecies).toEqual(['parrot']);
    expect(r.progress.best).toBe(80);
    expect(r.progress.trips).toBe(1);
    expect(r.firstChest).toBe(false);
    expect(p0.coins).toBe(5); // the old progress is left alone
    const deep = emptyTrip({ line: LINE.length - 1 });
    runUntil(deep, 'haul', 300);
    const r2 = settle(r.progress, deep);
    expect(r2.firstChest).toBe(true);
    expect(r2.progress.chest).toBe(true);
    expect(settle(r2.progress, deep).firstChest).toBe(false);
  });
});

describe('upgrades and saved progress', () => {
  it('a purchase needs enough sand dollars, costs the price and goes up one level', () => {
    let p = newProgress();
    for (const k of UPGRADES) {
      expect(canBuy(p, k)).toBe(false);
      expect(buy(p, k)).toBeNull();
    }
    p.coins = PRICES.line[0];
    const q = buy(p, 'line');
    expect(q.line).toBe(1);
    expect(q.coins).toBe(0);
    expect(p.line).toBe(0);
    expect(buy(p, 'nonsense')).toBeNull();
  });

  it('every upgrade tops out and then cannot be bought', () => {
    let p = { ...newProgress(), coins: 1e6 };
    for (const k of UPGRADES) {
      let n = 0;
      while (canBuy(p, k)) {
        p = buy(p, k);
        n++;
      }
      expect(maxed(p, k)).toBe(true);
      expect(priceOf(p, k)).toBeNull();
      expect(buy(p, k)).toBeNull();
      expect(n).toBe(PRICES[k].length);
    }
    expect(PRICES.line.length).toBe(LINE.length - 1);
    expect(PRICES.bucket.length).toBe(BUCKET.length - 1);
    expect(PRICES.lure.length).toBe(LURE.length - 1);
  });

  it('prices go up, and so do the things they buy', () => {
    for (const k of UPGRADES) for (let i = 1; i < PRICES[k].length; i++) expect(PRICES[k][i]).toBeGreaterThan(PRICES[k][i - 1]);
    for (const arr of [LINE, BUCKET, LURE]) for (let i = 1; i < arr.length; i++) expect(arr[i]).toBeGreaterThan(arr[i - 1]);
    expect(LINE.at(-1)).toBe(MAX_DEPTH);
  });

  it('saved progress has a fixed shape and survives junk', () => {
    const p = newProgress();
    expect(Object.keys(p).sort()).toEqual(['album', 'best', 'bucket', 'chest', 'coins', 'earned', 'line', 'lure', 'trips']);
    expect(sanitize(null)).toEqual(p);
    expect(sanitize('nope')).toEqual(p);
    expect(sanitize({ coins: -5, line: 99, bucket: 2.7, lure: 'x', album: { snapper: 3, bogus: 9, boot: 2 }, best: 9999, trips: 4, chest: 'yes' }))
      .toEqual({ ...p, coins: 0, line: LINE.length - 1, bucket: 2, lure: 0, album: { snapper: 3 }, best: MAX_DEPTH, trips: 4, chest: false });
    const full = { coins: 12, line: 3, bucket: 2, lure: 1, album: { snapper: 2, angel: 1 }, best: 110, trips: 9, chest: true, earned: 300 };
    expect(sanitize(JSON.parse(JSON.stringify(full)))).toEqual(full);
    expect(albumCount(full)).toBe(2);
  });

  it('the next trip is set up from progress, and the first one is gentle', () => {
    const p = { ...newProgress(), line: 2, bucket: 1, lure: 3 };
    const o = tripOptions(p, 9);
    expect(o).toMatchObject({ seed: 9, line: 2, bucket: 1, lure: 3, first: true });
    const s = createTrip(o);
    expect(s.lineLen).toBe(LINE[2]);
    expect(s.bucketSize).toBe(BUCKET[1]);
    expect(s.lureReach).toBe(LURE[3]);
    expect(tripOptions({ ...p, trips: 1 }, 9).first).toBe(false);
  });
});

describe('the sea', () => {
  it('is the same for the same seed, and different for another', () => {
    const sig = (s) => s.creatures.map((c) => `${c.sp}@${c.x.toFixed(3)},${c.y.toFixed(3)}`).join('|');
    const a = createTrip({ seed: 11, line: 6 });
    const b = createTrip({ seed: 11, line: 6 });
    const c = createTrip({ seed: 12, line: 6 });
    expect(sig(a)).toBe(sig(b));
    expect(sig(a)).not.toBe(sig(c));
    // and a whole trip played the same way comes out the same
    const t1 = playTrip({ seed: 21, line: 5, bucket: 3 });
    const t2 = playTrip({ seed: 21, line: 5, bucket: 3 });
    expect(t1.line.map((x) => x.sp)).toEqual(t2.line.map((x) => x.sp));
    expect(t1.haul.total).toBe(t2.haul.total);
  });

  it('what you dodged on the way down is still there on the way up', () => {
    const s = createTrip({ seed: 3, line: 4 });
    const ids = s.creatures.map((c) => c.id);
    let wait = 0;
    while (s.phase !== 'reel') {
      if ((wait -= DT) <= 0) {
        steer(s, carefulTarget(s));
        wait = 0.1;
      }
      step(s, DT);
    }
    const now = new Set(s.creatures.map((c) => c.id));
    for (const id of ids) expect(now.has(id)).toBe(true);
    expect(s.creatures.length).toBeGreaterThan(ids.length); // plus fresh arrivals
  });

  it('creatures swim sideways and turn back at the edges', () => {
    const s = createTrip({ seed: 4, line: 3 });
    const c = s.creatures[0];
    const y = c.y;
    let minX = Infinity;
    let maxX = -Infinity;
    for (let t = 0; t < 40; t += DT) {
      step(s, DT);
      if (s.phase !== 'cast') s.phase = 'cast'; // hold the hook at the surface
      minX = Math.min(minX, c.x);
      maxX = Math.max(maxX, c.x);
    }
    expect(c.y).toBe(y);
    expect(minX).toBeLessThan(0);
    expect(maxX).toBeGreaterThan(FIELD_W);
  });

  it('predicting where a creature will be matches the sim', () => {
    const s = createTrip({ seed: 8, line: 6 });
    const c = s.creatures.find((x) => x.speed > 3);
    const guess = predictX(c, 7);
    for (let t = 0; t < 7 - 1e-9; t += DT) {
      step(s, DT);
      s.phase = 'cast';
    }
    expect(c.x).toBeCloseTo(guess, 1);
  });

  it('rows thin out on the very first trip on the way down and fill up on the way up', () => {
    let down = 0;
    let up = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const s = createTrip({ seed, first: true });
      down += s.creatures.filter((c) => c.y < LINE[0]).length;
      const r = playTrip({ seed, first: true });
      up += r.line.length;
      expect(r.line.every((c) => c.kind === 'fish')).toBe(true); // nothing nasty the first time
    }
    expect(down / 20).toBeLessThan(1);
    expect(up / 20).toBeGreaterThan(2);
  });
});

describe('zone and species tables', () => {
  it('zones stack from the surface to the sea bed', () => {
    expect(ZONES.length).toBeGreaterThanOrEqual(4);
    expect(ZONES[0].top).toBe(0);
    expect(ZONES.at(-1).bottom).toBe(MAX_DEPTH);
    for (let i = 1; i < ZONES.length; i++) expect(ZONES[i].top).toBe(ZONES[i - 1].bottom);
    for (const z of ZONES) {
      expect(z.rowGap).toBeGreaterThan(5);
      expect(z.dropFill).toBeGreaterThan(0);
      expect(z.dropFill).toBeLessThanOrEqual(1);
      expect(speciesAt((z.top + z.bottom) / 2).some((sp) => sp.kind === 'fish')).toBe(true);
    }
    expect(zoneAt(0).id).toBe(ZONES[0].id);
    expect(zoneAt(MAX_DEPTH).id).toBe(ZONES.at(-1).id);
  });

  it('has at least 16 album fish, each in a real zone and reachable with some line', () => {
    expect(ALBUM.length).toBeGreaterThanOrEqual(16);
    const zoneIds = new Set(ZONES.map((z) => z.id));
    const ids = new Set();
    for (const sp of SPECIES) {
      expect(ids.has(sp.id)).toBe(false);
      ids.add(sp.id);
      expect(sp.zones.length).toBeGreaterThan(0);
      for (const z of sp.zones) expect(zoneIds.has(z)).toBe(true);
      const lo = shallowestOf(sp);
      expect(lo).toBeLessThan(LINE.at(-1));
      expect(speciesAt(lo + 0.5).includes(sp)).toBe(true);
      expect(sp.rx).toBeGreaterThan(0);
      expect(sp.ry).toBeGreaterThan(0);
      expect(sp.speed[1]).toBeGreaterThanOrEqual(sp.speed[0]);
      if (sp.kind === 'fish') expect(sp.value).toBeGreaterThan(0);
      else expect(sp.value).toBe(0);
      if (sp.kind === 'zap') expect(sp.loses).toBeGreaterThanOrEqual(1);
    }
    for (const want of ['sergeant', 'snapper', 'parrot', 'angel', 'barracuda', 'octopus', 'swordfish', 'angler', 'squid']) expect(ALBUM).toContain(want);
    for (const blocker of ['turtle', 'manatee']) expect(SPECIES_BY_ID[blocker].kind).toBe('blocker');
    expect(SPECIES_BY_ID.puffer.kind).toBe('zap');
    expect(SPECIES_BY_ID.jelly.kind).toBe('zap');
  });

  it('deeper fish are worth more on average, and the legend lives at the very bottom', () => {
    const avg = (z) => {
      const f = SPECIES.filter((sp) => sp.kind === 'fish' && zoneAt(shallowestOf(sp)).id === z.id);
      return f.reduce((a, sp) => a + sp.value, 0) / f.length;
    };
    for (let i = 1; i < ZONES.length; i++) expect(avg(ZONES[i])).toBeGreaterThan(avg(ZONES[i - 1]));
    const legend = SPECIES.find((sp) => sp.legendary);
    expect(legend.value).toBe(Math.max(...SPECIES.map((sp) => sp.value)));
    expect(shallowestOf(legend)).toBeGreaterThan(LINE.at(-2));
  });

  it('every album fish actually turns up across many trips', async () => {
    const seen = new Set();
    for (let seed = 1; seed <= 60; seed++) {
      for (const c of createTrip({ seed, line: LINE.length - 1 }).creatures) if (ALBUM.includes(c.sp)) seen.add(c.sp);
      if (seed % 10 === 0) await tick();
    }
    for (const id of ALBUM) expect(seen.has(id)).toBe(true);
  });
});

describe('the economy', () => {
  // Plays trips from a fresh save until the chest is found (or `max` trips), shopping cheapest first.
  async function career(seed, botFor, max) {
    let p = newProgress();
    const trips = [];
    for (let i = 0; i < max; i++) {
      const s = playTrip(tripOptions(p, seed * 1000 + i), botFor(i));
      const r = settle(p, s);
      trips.push({ gained: r.gained, line: p.line, depth: s.depth, bought: 0 });
      const before = r.progress;
      p = shopCheapest(r.progress);
      trips.at(-1).bought = UPGRADES.filter((k) => p[k] !== before[k]).length;
      if (r.firstChest) return { p, trips, chestAt: i + 1 };
      if (i % 5 === 4) await tick();
    }
    return { p, trips, chestAt: null };
  }

  it('a careful player reaches the treasure chest in a sensible number of trips', async () => {
    for (const seed of [1, 2]) {
      const { trips, chestAt, p } = await career(seed, () => carefulTarget, 80);
      expect(chestAt).not.toBeNull();
      expect(chestAt).toBeGreaterThanOrEqual(12);
      expect(chestAt).toBeLessThanOrEqual(60);
      // early on, a new upgrade every one to three trips
      let since = 0;
      for (const t of trips.slice(0, 12)) {
        since = t.bought ? 0 : since + 1;
        expect(since).toBeLessThan(3);
      }
      expect(albumCount(p)).toBeGreaterThanOrEqual(12);
    }
  });

  it('a clumsy player still earns something every trip and makes progress', async () => {
    const { trips, p } = await career(3, (i) => clumsyBot(77 + i), 30);
    for (const t of trips) expect(t.gained).toBeGreaterThanOrEqual(MIN_BONUS);
    expect(trips.slice(0, 3).reduce((a, t) => a + t.gained, 0)).toBeGreaterThan(PRICES.line[0]);
    expect(p.line + p.bucket + p.lure).toBeGreaterThanOrEqual(4);
    expect(albumCount(p)).toBeGreaterThanOrEqual(3);
  });

  it('the first trip is nearly impossible to mess up', async () => {
    let caught = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const s = playTrip({ seed, first: true }, clumsyBot(seed));
      if (s.line.length > 0) caught++;
      if (seed % 10 === 0) await tick();
    }
    expect(caught).toBeGreaterThanOrEqual(28);
  });
});
