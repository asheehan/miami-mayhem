import { describe, it, expect } from 'vitest';
import { LEVELS, LOOKS, groundAt } from '../src/games/swamp-buggy/tracks.js';
import { BUGGIES } from '../src/games/swamp-buggy/buggies.js';
import {
  createRun, step, setInput, buildTrack, groundY, contactAt, starsFor, starTargets, placeAt, speedOf, upY,
  GRAVITY, RIGHT_DELAY, RIGHT_TIME, STUCK_TIME, STAR3, FLIP_BONUS, BIG_AIR,
} from '../src/games/swamp-buggy/sim.js';
import { botPedal, gasPedal, makeRandomPedal } from '../src/games/swamp-buggy/bot.js';
import {
  sanitize, loadProgress, saveProgress, recordRun, unlocked, firstOpen, garageState, chooseBuggy, SAVE_KEY,
} from '../src/games/swamp-buggy/progress.js';

const DT = 1 / 60;
const tick = () => new Promise((r) => setImmediate(r));
const run = (s, secs, pedal = null) => {
  for (let t = 0; t < secs - 1e-9; t += DT) {
    setInput(s, typeof pedal === 'function' ? pedal(s) : pedal);
    step(s, DT);
  }
};
const until = (s, cond, secs, pedal = null) => {
  for (let t = 0; t < secs && !cond(s); t += DT) {
    setInput(s, typeof pedal === 'function' ? pedal(s) : pedal);
    step(s, DT);
  }
  return cond(s);
};
// A test course: whatever points a test wants, with flat run-up and run-out.
function course(pts, extra = {}) {
  return { name: 'test', look: 'swamp', pts, coins: [], water: [], mud: [], logs: [], bridges: [], critters: [], props: [], ramps: [], startX: 0, finishX: 1900, ...extra };
}
const flat = (extra) => course([[-50, 0], [2000, 0]], extra);
// Plays a whole level with a driver; gives up after `limit` seconds.
async function drive(level, driver, { limit = 240, buggy = 'hopper' } = {}) {
  const s = createRun(level, buggy);
  let frames = 0;
  let stuckFor = 0;
  let lastX = s.buggy.x;
  let worstStall = 0;
  while (s.status !== 'done' && s.time < limit) {
    setInput(s, driver(s));
    step(s, DT);
    s.events.length = 0;
    if (s.buggy.x > lastX + 3) {
      lastX = s.buggy.x;
      stuckFor = 0;
    } else stuckFor += DT;
    worstStall = Math.max(worstStall, stuckFor);
    if (++frames % 3000 === 0) await tick();
  }
  s.worstStall = worstStall;
  return s;
}

describe('terrain', () => {
  it('joins control points with straight lines and finds the ground under any x', () => {
    const tr = buildTrack(course([[0, 0], [10, 5], [20, 5]]));
    expect(groundY(tr, 5)).toBeCloseTo(2.5);
    expect(groundY(tr, 15)).toBe(5);
    expect(groundY(tr, -10)).toBe(0); // clamps at the ends
  });

  it('a circle touching the ground gets pushed out along the surface, rounding corners', () => {
    const tr = buildTrack(course([[0, 0], [10, 0], [10.15, 2], [20, 2]]));
    const flatHit = contactAt(tr, 5, 0.4, 0.5);
    expect(flatHit.pen).toBeCloseTo(0.1);
    expect(flatHit.ny).toBeCloseTo(1);
    const corner = contactAt(tr, 9.8, 2.2, 0.5); // just left of the step's top corner
    expect(corner.pen).toBeGreaterThan(0);
    expect(corner.nx).toBeLessThan(-0.3); // pushed back off the corner, not straight up
    expect(contactAt(tr, 5, 3, 0.5)).toBeNull();
  });
});

describe('driving', () => {
  it('rests on flat ground without drifting or jittering', () => {
    const s = createRun(flat());
    run(s, 2);
    const x = s.buggy.x;
    const y = s.buggy.y;
    let moved = 0;
    for (let i = 0; i < 180; i++) {
      step(s, DT);
      moved = Math.max(moved, Math.abs(s.buggy.y - y), Math.abs(s.buggy.x - x));
    }
    expect(moved).toBeLessThan(0.002);
    expect(Math.abs(s.buggy.a)).toBeLessThan(0.02);
    expect(s.wheels.every((w) => w.grounded)).toBe(true);
    // the wheels sit on the ground, not in it
    for (const w of s.wheels) expect(w.y - groundY(s.track, w.x)).toBeCloseTo(s.spec.wheelR, 2);
  });

  it('gas speeds it up toward top speed; letting go coasts; the brake stops it and then reverses', () => {
    const s = createRun(flat());
    run(s, 1, 'gas');
    expect(s.buggy.vx).toBeGreaterThan(5);
    run(s, 4, 'gas');
    expect(s.buggy.vx).toBeGreaterThan(s.spec.topSpeed * 0.9);
    expect(s.buggy.vx).toBeLessThan(s.spec.topSpeed * 1.05);
    const v = s.buggy.vx;
    run(s, 1);
    expect(s.buggy.vx).toBeLessThan(v);
    expect(s.buggy.vx).toBeGreaterThan(v - 1.5); // coasting is gentle
    run(s, 1.5, 'brake');
    expect(s.buggy.vx).toBeLessThan(0);
    run(s, 3, 'brake');
    expect(s.buggy.vx).toBeLessThan(-4); // reversing
  });

  it('climbs a long hill on the gas from a standstill', () => {
    const s = createRun(course([[-50, 0], [10, 0], [50, 10], [60, 10], [2000, 10]]));
    expect(until(s, (q) => q.buggy.x > 55, 20, 'gas')).toBe(true);
  });

  it('bounces on its springs over a bump and settles', () => {
    const s = createRun(course([[-50, 0], [20, 0], [21, 0.4], [22, 0], [2000, 0]]));
    run(s, 4, 'gas');
    run(s, 4);
    expect(Math.abs(s.buggy.a)).toBeLessThan(0.05);
  });

  it('climbs a small step with momentum', () => {
    const s = createRun(course([[-50, 0], [30, 0], [30.15, 0.4], [2000, 0.4]]));
    expect(until(s, (q) => q.buggy.x > 40, 10, 'gas')).toBe(true);
    expect(s.wheels.every((w) => w.y > 0.4)).toBe(true);
  });

  it('mud slows it down, but gas still gets it through', () => {
    const a = createRun(flat());
    const b = createRun(flat({ mud: [{ x0: 0, x1: 1000 }] }));
    run(a, 5, 'gas');
    run(b, 5, 'gas');
    expect(b.buggy.vx).toBeLessThan(a.buggy.vx * 0.7);
    expect(b.buggy.vx).toBeGreaterThan(3);
  });

  it('water splashes and slows it', () => {
    const s = createRun(flat({ water: [{ x0: 20, x1: 1000, y: 0.6 }] }));
    run(s, 8, 'gas');
    const dry = createRun(flat());
    run(dry, 8, 'gas');
    expect(s.buggy.x).toBeLessThan(dry.buggy.x - 5);
  });
});

describe('air time', () => {
  // a kicker up to 2 m with a lip and a long drop after it
  const kicker = () => course([[-50, 0], [40, 0], [46, 0.5], [50, 2], [50.3, -6], [2000, -6]]);

  it('a ramp gives air', () => {
    const s = createRun(kicker());
    expect(until(s, (q) => q.airborne && q.hangT > 0.3, 12, 'gas')).toBe(true);
  });

  it('in the air, gas tips the nose up and brake tips it down', () => {
    const up = createRun(kicker());
    const down = createRun(kicker());
    until(up, (q) => q.airborne && q.hangT > 0.15, 12, 'gas');
    until(down, (q) => q.airborne && q.hangT > 0.15, 12, 'gas');
    expect(up.buggy.a).toBe(down.buggy.a);
    run(up, 0.6, 'gas');
    run(down, 0.6, 'brake');
    expect(up.buggy.a - down.buggy.a).toBeGreaterThan(0.6);
    expect(up.buggy.w).toBeGreaterThan(0);
    expect(down.buggy.w).toBeLessThan(0);
  });

  it('lands back on its wheels and drives on', () => {
    const s = createRun(kicker());
    until(s, (q) => q.airborne, 12, 'gas');
    expect(until(s, (q) => !q.airborne && q.wheels.every((w) => w.grounded), 4, botPedal)).toBe(true);
    run(s, 2, 'gas');
    expect(upY(s)).toBeGreaterThan(0.9);
    expect(s.buggy.vx).toBeGreaterThan(5);
  });

  it('counts a flip when it turns right over and lands upright, with bonus coins', () => {
    const s = createRun(flat());
    run(s, 1);
    // throw it high with a backward spin
    for (const body of [s.buggy, ...s.wheels]) {
      body.y += 12;
      body.vx = 3;
    }
    s.buggy.w = 6;
    s.airborne = true;
    expect(until(s, (q) => q.flips > 0 || q.rightings > 0, 6, (q) => (q.airborne && q.buggy.a < 5.4 ? 'gas' : null))).toBe(true);
    expect(s.flips).toBe(1);
    expect(s.bonus).toBeGreaterThanOrEqual(FLIP_BONUS);
    expect(s.bigAirs).toBe(1); // a 12 m drop is big air too
  });

  it('no flip for a hop', () => {
    const s = createRun(kicker());
    run(s, 12, botPedal);
    expect(s.flips).toBe(0);
  });
});

describe('kindness', () => {
  it('lying on its roof, it wobbles, then flips itself back after about 1.5 s', () => {
    const s = createRun(flat());
    run(s, 0.5);
    placeAt(s, 20);
    s.buggy.a = Math.PI;
    s.buggy.y = 0.9;
    for (const w of s.wheels) w.y += 2.2;
    let started = null;
    for (let t = 0; t < 5 && s.rightings === 0; t += DT) {
      step(s, DT);
      if (started === null && s.strandT > 0) started = s.time;
    }
    expect(s.rightings).toBe(1);
    expect(s.time - started).toBeGreaterThan(RIGHT_DELAY - 0.1);
    expect(s.time - started).toBeLessThan(RIGHT_DELAY + 0.3);
    run(s, RIGHT_TIME + 1.5);
    expect(upY(s)).toBeGreaterThan(0.95);
    expect(s.wheels.every((w) => w.grounded)).toBe(true);
    run(s, 2, 'gas');
    expect(s.buggy.vx).toBeGreaterThan(4);
  });

  it('a fresh press flips it back early', () => {
    const s = createRun(flat());
    placeAt(s, 20);
    s.buggy.a = Math.PI;
    s.buggy.y = 0.9;
    for (const w of s.wheels) w.y += 2.2;
    until(s, (q) => q.strandT > 0.5, 3);
    setInput(s, 'gas');
    step(s, DT);
    expect(s.righting).not.toBeNull();
  });

  it('pressing gas while stuck against a wall gives a helpful hop', () => {
    const s = createRun(course([[-50, 0], [20, 0], [20.1, 3], [24, 3], [24.1, 0], [2000, 0]]));
    expect(until(s, (q) => q.hops > 0, 12, 'gas')).toBe(true);
    expect(s.time).toBeLessThan(2 + STUCK_TIME + 3);
    // a 3 m wall: the hops grow until one clears it
    expect(until(s, (q) => q.buggy.x > 30, 20, 'gas')).toBe(true);
  });

  it('gators are springy bumps, never a game over', () => {
    const lvl = course([[-50, 0], [20, 0], [21.4, 0.45], [22.8, 0], [2000, 0]], { critters: [{ kind: 'gator', x: 21.4, y: 0 }] });
    const s = createRun(lvl);
    let chomped = false;
    for (let t = 0; t < 8; t += DT) {
      setInput(s, 'gas');
      step(s, DT);
      if (s.events.some((e) => e.type === 'chomp')) chomped = true;
      s.events.length = 0;
    }
    expect(chomped).toBe(true);
    expect(s.buggy.x).toBeGreaterThan(40);
  });
});

describe('coins, stars and the finish', () => {
  it('picks up a coin by driving through it, once', () => {
    const s = createRun(flat({ coins: [{ x: 20, y: 1.2, kind: 'coin' }, { x: 30, y: 9, kind: 'orange' }] }));
    run(s, 6, 'gas');
    expect(s.coins).toBe(1); // the high orange is out of reach on the flat
    expect(s.got[0]).toBe(1);
  });

  it('one star for finishing, two and three for collecting, with three at about 70%', () => {
    expect(starsFor(0, 50, false)).toBe(0);
    expect(starsFor(0, 50)).toBe(1);
    const [t2, t3] = starTargets(50);
    expect(t3).toBe(Math.ceil(50 * STAR3));
    expect(STAR3).toBeLessThanOrEqual(0.72);
    expect(starsFor(t2 - 1, 50)).toBe(1);
    expect(starsFor(t2, 50)).toBe(2);
    expect(starsFor(t3, 50)).toBe(3);
  });

  it('crossing the flag finishes with stars, and the buggy brakes by itself', () => {
    const s = createRun(flat({ finishX: 60 }));
    expect(until(s, (q) => q.status === 'done', 20, 'gas')).toBe(true);
    expect(s.stars).toBe(1);
    expect(s.events.some((e) => e.type === 'finish')).toBe(true);
    run(s, 6, 'gas'); // pedals do nothing now
    expect(Math.abs(s.buggy.vx)).toBeLessThan(0.5);
  });

  it('is deterministic: the same inputs give the same run', async () => {
    const pedal = makeRandomPedal(((seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(7));
    const a = await drive(LEVELS[2], pedal, { limit: 20 });
    const pedal2 = makeRandomPedal(((seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(7));
    const b = await drive(LEVELS[2], pedal2, { limit: 20 });
    expect(b.buggy.x).toBe(a.buggy.x);
    expect(b.buggy.y).toBe(a.buggy.y);
    expect(b.coins).toBe(a.coins);
  });

  it('frame rate does not change the outcome much (fixed physics step)', () => {
    const a = createRun(flat());
    const b = createRun(flat());
    for (let t = 0; t < 4; t += 1 / 60) {
      setInput(a, 'gas');
      step(a, 1 / 60);
    }
    for (let t = 0; t < 4; t += 1 / 30) {
      setInput(b, 'gas');
      step(b, 1 / 30);
    }
    expect(Math.abs(a.buggy.x - b.buggy.x)).toBeLessThan(0.3);
  });
});

describe('levels', () => {
  it('has twelve levels in four looks, three of each, with unique names', () => {
    expect(LEVELS.length).toBe(12);
    expect(new Set(LEVELS.map((l) => l.name)).size).toBe(12);
    for (const look of LOOKS) expect(LEVELS.filter((l) => l.look === look).length).toBe(3);
  });

  LEVELS.forEach((lv, i) => {
    it(`${i + 1} ${lv.name}: continuous ground, finish inside it, sensible pick-ups and features`, () => {
      const xs = lv.pts.map((p) => p[0]);
      for (let k = 1; k < xs.length; k++) expect(xs[k] - xs[k - 1]).toBeGreaterThan(0.04);
      for (const [x, y] of lv.pts) {
        expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
      }
      expect(lv.startX).toBeGreaterThan(xs[0] + 10);
      expect(lv.finishX).toBeLessThan(xs[xs.length - 1] - 20);
      expect(lv.coins.length).toBeGreaterThanOrEqual(30);
      for (const c of lv.coins) {
        expect(c.x).toBeGreaterThan(lv.startX);
        expect(c.x).toBeLessThan(lv.finishX);
        const above = c.y - groundAt(lv.pts, c.x);
        expect(above).toBeGreaterThan(0.5);
        expect(above).toBeLessThan(12);
      }
      // no cliff-like climbs except the deliberate little steps (under half a metre)
      for (let k = 1; k < lv.pts.length; k++) {
        const [x0, y0] = lv.pts[k - 1];
        const [x1, y1] = lv.pts[k];
        if ((y1 - y0) / (x1 - x0) > 1.2) expect(y1 - y0).toBeLessThanOrEqual(0.5 + 1e-9);
      }
      for (const w of lv.water) {
        expect(w.x1).toBeGreaterThan(w.x0);
        expect(groundAt(lv.pts, (w.x0 + w.x1) / 2)).toBeLessThan(w.y); // there's water to splash in
      }
    });
  });

  it('get longer and harder: level 1 is gentle, later levels have bigger jumps', () => {
    const relief = (lv) => Math.max(...lv.pts.map((p) => p[1])) - Math.min(...lv.pts.map((p) => p[1]));
    expect(relief(LEVELS[0])).toBeLessThan(2.5);
    expect(LEVELS[0].ramps.every((r) => r.y - groundAt(LEVELS[0].pts, r.x - 6) < 1.2)).toBe(true);
    expect(relief(LEVELS[11])).toBeGreaterThan(relief(LEVELS[0]) * 3);
    expect(LEVELS[11].finishX).toBeGreaterThan(LEVELS[0].finishX * 1.5);
  });
});

describe('playing every level', () => {
  LEVELS.forEach((lv, i) => {
    it(`${i + 1} ${lv.name}: the bot finishes in 30-70 s with three stars`, async () => {
      const s = await drive(lv, botPedal);
      expect(s.status).toBe('done');
      expect(s.time).toBeGreaterThan(28);
      expect(s.time).toBeLessThan(72);
      expect(s.stars).toBeGreaterThanOrEqual(1);
      expect(s.coins / s.total).toBeGreaterThanOrEqual(STAR3);
    });

    it(`${i + 1} ${lv.name}: holding the gas the whole way never gets stuck for good`, async () => {
      const s = await drive(lv, gasPedal, { limit: 200 });
      expect(s.status).toBe('done');
      expect(s.worstStall).toBeLessThan(8);
      if (i < 4) {
        expect(s.time).toBeLessThan(60);
        expect(s.stars).toBeGreaterThanOrEqual(2);
      }
    });
  });

  it('a child poking the pedals at random still gets through the first levels', async () => {
    for (const [i, seed] of [[0, 3], [1, 11], [3, 5]]) {
      let x = seed;
      const rng = () => (x = (x * 16807) % 2147483647) / 2147483647;
      const s = await drive(LEVELS[i], makeRandomPedal(rng), { limit: 300 });
      expect(s.status, `level ${i + 1}`).toBe('done');
    }
  });

  it('holding gas over the big final jump turns a flip', async () => {
    const s = createRun(LEVELS[11]);
    let flips = 0;
    let frames = 0;
    while (s.status !== 'done' && s.time < 120) {
      setInput(s, 'gas');
      step(s, DT);
      flips += s.events.filter((e) => e.type === 'flip').length;
      s.events.length = 0;
      if (++frames % 3000 === 0) await tick();
    }
    expect(flips).toBeGreaterThanOrEqual(1);
  });

  it('every buggy can finish a middle level and a jumpy one', async () => {
    for (const bg of BUGGIES) {
      for (const i of [4, 9]) {
        const s = await drive(LEVELS[i], botPedal, { buggy: bg.id });
        expect(s.status, `${bg.id} on ${i + 1}`).toBe('done');
      }
    }
  });

  it('buggies differ only mildly', () => {
    const base = BUGGIES[0];
    for (const bg of BUGGIES) {
      expect(bg.topSpeed / base.topSpeed).toBeGreaterThan(0.9);
      expect(bg.topSpeed / base.topSpeed).toBeLessThan(1.12);
      expect(bg.engine / base.engine).toBeLessThan(1.15);
    }
  });
});

describe('saved progress and the garage', () => {
  const mem = () => {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), m };
  };

  it('saves and loads stars, coins and buggies', () => {
    const st = mem();
    let p = loadProgress(st);
    expect(p.stars.every((n) => n === 0)).toBe(true);
    expect(p.buggy).toBe('hopper');
    p = recordRun(p, 0, 2, 40);
    p = recordRun(p, 0, 1, 10); // best stars kept, coins add up
    saveProgress(st, p);
    const q = loadProgress(st);
    expect(q.stars[0]).toBe(2);
    expect(q.coins).toBe(50);
    expect(st.m.has(SAVE_KEY)).toBe(true);
  });

  it('shrugs off bad saved data', () => {
    expect(sanitize({ stars: ['x', 9, -1, 2.5], coins: -4, owned: ['nope', 'taxi'], buggy: 'nope' })).toEqual({
      stars: LEVELS.map((_, i) => (i === 0 ? 0 : 0)), coins: 0, owned: ['hopper', 'taxi'], buggy: 'hopper',
    });
    expect(loadProgress({ getItem: () => '{not json' }).coins).toBe(0);
  });

  it('finishing a level unlocks the next', () => {
    let p = sanitize(null);
    expect(unlocked(p, 1)).toBe(false);
    p = recordRun(p, 0, 1, 0);
    expect(unlocked(p, 1)).toBe(true);
    expect(firstOpen(p)).toBe(1);
  });

  it('buys a buggy with coins, then drives it; can not buy without enough', () => {
    const taxi = BUGGIES.find((b) => b.id === 'taxi');
    let p = sanitize({ coins: taxi.price - 1 });
    expect(garageState(p, taxi)).toBe('short');
    expect(chooseBuggy(p, 'taxi').result).toBe('no');
    p = sanitize({ coins: taxi.price + 5 });
    const out = chooseBuggy(p, 'taxi');
    expect(out.result).toBe('bought');
    expect(out.progress.coins).toBe(5);
    expect(out.progress.buggy).toBe('taxi');
    expect(garageState(out.progress, taxi)).toBe('driving');
    const back = chooseBuggy(out.progress, 'hopper');
    expect(back.result).toBe('select');
    expect(back.progress.coins).toBe(5);
    expect(garageState(back.progress, taxi)).toBe('owned');
  });

  it('the golden buggy is earned with stars', () => {
    const gold = BUGGIES.find((b) => b.stars);
    const few = sanitize({ stars: LEVELS.map(() => 1), coins: 99999 });
    expect(garageState(few, gold)).toBe('stars');
    expect(chooseBuggy(few, gold.id).result).toBe('no');
    const many = sanitize({ stars: LEVELS.map(() => 3) });
    expect(chooseBuggy(many, gold.id).progress.buggy).toBe(gold.id);
  });
});

void GRAVITY;
void speedOf;
void BIG_AIR;
