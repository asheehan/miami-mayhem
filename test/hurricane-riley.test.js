import { describe, it, expect } from 'vitest';
import { LEVELS } from '../src/games/hurricane-riley/levels.js';
import {
  createLevel, step, gust, gustShape, gustFactor, starsFor, progressOf, settled,
  FIELD_W, FIELD_H, GUST_FULL_LEN, GUST_MIN_LEN, GUST_WIDTH, GUST_BACK, RADIUS, DRAG_SAND, GULL_SCARE,
} from '../src/games/hurricane-riley/sim.js';
import { playLevel, settle, clear, goalPoint } from '../src/games/hurricane-riley/bot.js';

const tick = () => new Promise((r) => setImmediate(r));
const run = (s, secs) => {
  for (let t = 0; t < secs; t += 0.05) step(s, 0.05);
};

// A bare herd level with one ball in open sand, far from the pool.
function openSand(x = 200, y = 400) {
  return createLevel({
    name: 'test', job: 'herd', par: 10, movers: [['ball', x, y]],
    pool: { x: 200, y: 60, r: 40, escape: 9999 }, walls: [], circles: [], shells: [], decor: [],
  });
}
const speed = (m) => Math.hypot(m.vx, m.vy);

describe('gusts', () => {
  it('push things the way the swipe goes', () => {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.6, -0.8]]) {
      const s = openSand();
      const b = s.movers[0];
      gust(s, b.x - dx * 20, b.y - dy * 20, b.x + dx * 100, b.y + dy * 100);
      const sp = speed(b);
      expect(sp).toBeGreaterThan(0);
      expect((b.vx * dx + b.vy * dy) / sp).toBeGreaterThan(0.999);
    }
  });

  it('grow stronger with a longer swipe, up to a cap', () => {
    const push = (len) => {
      const s = openSand();
      const b = s.movers[0];
      gust(s, b.x - 20, b.y, b.x - 20 + len, b.y);
      return speed(b);
    };
    const short = push(30);
    const medium = push(110);
    const long = push(GUST_FULL_LEN);
    expect(short).toBeGreaterThan(0);
    expect(medium).toBeGreaterThan(short * 2);
    expect(long).toBeGreaterThan(medium * 1.5);
    expect(push(GUST_FULL_LEN * 2)).toBeCloseTo(long, 5);
  });

  it('a quick flick is stronger than a slow drag of the same length', () => {
    expect(gustShape(0, 0, 100, 0, 0.05).power).toBeGreaterThan(gustShape(0, 0, 100, 0, 1).power);
  });

  it('ignores swipes too short to be a gust', () => {
    const s = openSand();
    expect(gust(s, 200, 400, 200 + GUST_MIN_LEN * 0.5, 400)).toBeNull();
    expect(speed(s.movers[0])).toBe(0);
  });

  it('fades out across and along the cone and is zero outside it', () => {
    const g = gustShape(100, 300, 200, 300);
    expect(gustFactor(g, 130, 300)).toBeGreaterThan(gustFactor(g, 130, 300 + GUST_WIDTH * 0.7));
    expect(gustFactor(g, 130, 300)).toBeGreaterThan(gustFactor(g, 100 + g.reach * 0.9, 300));
    expect(gustFactor(g, 130, 300 + GUST_WIDTH * 2)).toBe(0); // beside the cone
    expect(gustFactor(g, 100 - GUST_BACK - 5, 300)).toBe(0); // behind it
    expect(gustFactor(g, 100 + g.reach + 5, 300)).toBe(0); // past its reach
    // things outside the cone don't move at all
    const s = openSand(200, 400);
    gust(s, 200, 200, 200, 100); // blowing up the field, far above the ball
    expect(speed(s.movers[0])).toBe(0);
  });

  it('glides and settles in a second or two; a medium swipe moves a ball about a quarter of the field', () => {
    const s = openSand(100, 400);
    const b = s.movers[0];
    gust(s, 80, 400, 80 + GUST_FULL_LEN / 2, 400);
    let t = 0;
    while (!settled(s) && t < 5) {
      step(s, 0.05);
      t += 0.05;
    }
    expect(t).toBeGreaterThan(0.8);
    expect(t).toBeLessThan(2.5);
    const moved = b.x - 100;
    expect(moved).toBeGreaterThan(FIELD_W * 0.25);
    expect(moved).toBeLessThan(FIELD_H * 0.35);
    expect(DRAG_SAND).toBeGreaterThan(1);
  });

  it('makes the scenery react: palms lean, a strong gust topples an umbrella', () => {
    const s = createLevel(LEVELS[1]);
    const umb = s.decor.find((d) => d.kind === 'umbrella');
    gust(s, umb.x - 40, umb.y, umb.x + 200, umb.y);
    run(s, 0.1);
    expect(umb.lx).toBeGreaterThan(0);
    expect(umb.down).toBeGreaterThan(0);
    run(s, 4);
    expect(umb.down).toBe(0);
    expect(Math.abs(umb.lx)).toBeLessThan(0.05);
  });
});

describe('sail home', () => {
  it('docks when the boat is in the slip', () => {
    const s = createLevel(LEVELS[0]);
    const b = s.movers[0];
    const z = LEVELS[0].dock;
    b.x = z.x + z.w / 2;
    b.y = z.y + z.h / 2 + 10;
    run(s, 0.05);
    expect(s.status).toBe('won');
    expect(b.docked).toBe(true);
    expect(progressOf(s).done).toBe(1);
  });

  it('bumps off the dock if it comes in too fast on later levels', () => {
    const L = LEVELS[6];
    const s = createLevel(L);
    const b = s.movers[0];
    b.x = L.dock.x + L.dock.w / 2;
    b.y = L.dock.y + L.dock.h + 20;
    b.vy = -600;
    run(s, 0.1);
    expect(s.status).toBe('play');
  });

  it('is pushed back by rocks and carried by the current', () => {
    const L = LEVELS[6];
    const s = createLevel(L);
    const b = s.movers[0];
    const rock = L.circles.find((c) => c.kind === 'rock');
    b.x = rock.x;
    b.y = rock.y + 60;
    b.vy = -250;
    run(s, 0.4);
    expect(b.vy).toBeGreaterThan(0);
    const c = L.currents[0];
    const s2 = createLevel(L);
    const b2 = s2.movers[0];
    b2.x = 150;
    b2.y = c.y + c.h / 2;
    run(s2, 1);
    expect(b2.x).toBeGreaterThan(170);
  });

  it('never leaves the field', () => {
    const s = createLevel(LEVELS[0]);
    const b = s.movers[0];
    for (let i = 0; i < 30; i++) {
      const a = i * 0.9;
      gust(s, b.x, b.y, b.x + Math.cos(a) * 300, b.y + Math.sin(a) * 300);
      run(s, 0.3);
      expect(b.x).toBeGreaterThanOrEqual(b.r - 0.01);
      expect(b.x).toBeLessThanOrEqual(FIELD_W - b.r + 0.01);
      expect(b.y).toBeGreaterThanOrEqual(b.r - 0.01);
      expect(b.y).toBeLessThanOrEqual(FIELD_H - b.r + 0.01);
    }
  });
});

describe('herd', () => {
  it('wins only when every ball is in the pool and still', () => {
    const s = createLevel(LEVELS[1]);
    const p = LEVELS[1].pool;
    s.movers[0].x = p.x;
    s.movers[0].y = p.y;
    run(s, 0.2);
    expect(s.status).toBe('play');
    expect(progressOf(s)).toEqual({ done: 1, total: 2 });
    s.movers[1].x = p.x + 30;
    s.movers[1].y = p.y;
    run(s, 0.2);
    expect(s.status).toBe('won');
  });

  it('the rim holds gentle balls in, but a big gust blows them back out on later levels', () => {
    const L = LEVELS[4];
    const p = L.pool;
    const gentle = createLevel(L);
    const a = gentle.movers[0];
    a.x = p.x;
    a.y = p.y;
    run(gentle, 0.1);
    gust(gentle, a.x - 20, a.y, a.x + 30, a.y);
    run(gentle, 2);
    expect(a.inPool).toBe(true);
    expect(Math.hypot(a.x - p.x, a.y - p.y)).toBeLessThan(p.r);

    const rough = createLevel(L);
    const b = rough.movers[0];
    b.x = p.x;
    b.y = p.y;
    run(rough, 0.1);
    gust(rough, b.x - 20, b.y, b.x + 240, b.y);
    run(rough, 2);
    expect(b.inPool).toBe(false);
    // ...but on the first herd level nothing ever escapes
    const easy = createLevel(LEVELS[1]);
    const c = easy.movers[0];
    c.x = LEVELS[1].pool.x;
    c.y = LEVELS[1].pool.y;
    run(easy, 0.1);
    gust(easy, c.x - 20, c.y, c.x + 240, c.y);
    run(easy, 2);
    expect(c.inPool).toBe(true);
  });

  it('balls bump each other', () => {
    const s = openSand(100, 400);
    s.movers.push({ ...s.movers[0], id: 99, x: 100 + RADIUS.ball * 2 + 2 });
    s.movers[0].vx = 300;
    run(s, 0.2);
    expect(s.movers[1].vx).toBeGreaterThan(0);
  });
});

describe('shoo', () => {
  it('gulls walk in and steal snacks; on later levels losing them all is a soft fail', () => {
    const s = createLevel(LEVELS[5], 3);
    let stole = false;
    for (let t = 0; t < 60 && s.status === 'play'; t += 0.1) {
      step(s, 0.1);
      if (s.snacks < LEVELS[5].shoo.snacks) stole = true;
    }
    expect(stole).toBe(true);
    expect(s.status).toBe('fail');
    expect(s.snacks).toBe(0);
  });

  it('on the easy picnic the basket refills instead, and the clock starts over', () => {
    const s = createLevel(LEVELS[2], 3);
    for (let t = 0; t < 80; t += 0.1) step(s, 0.1);
    expect(s.status).toBe('play');
    expect(s.refills).toBeGreaterThan(0);
    expect(s.clock).toBeLessThan(LEVELS[2].shoo.duration);
  });

  it('a gust scares a gull away for good; a tiny puff only nudges it', () => {
    const s = createLevel(LEVELS[5], 3);
    while (!s.gulls.length) step(s, 0.1);
    const g = s.gulls[0];
    g.x = 200;
    g.y = 150;
    g.vx = 0;
    g.vy = 0;
    gust(s, 200, 175, 200, 175 - GUST_MIN_LEN - 1, 1); // weakest possible puff, upward
    expect(g.state).not.toBe('flee');
    expect(g.vy).toBeLessThan(0);
    gust(s, 200, 175, 200, 75);
    expect(g.state).toBe('flee');
    run(s, 3);
    expect(s.gulls.includes(g)).toBe(false);
    expect(GULL_SCARE).toBeGreaterThan(0);
  });

  it('wins when the clock runs out with snacks left', () => {
    const s = createLevel(LEVELS[5], 3);
    s.clock = LEVELS[5].shoo.duration - 0.01;
    run(s, 0.05);
    expect(s.status).toBe('won');
  });

  it('a huge gust over the blanket blows a snack away on the windy level only', () => {
    const big = createLevel(LEVELS[8]);
    const p = LEVELS[8].shoo.picnic;
    gust(big, p.x - 10, p.y + 20, p.x - 10, p.y - 300);
    expect(big.snacks).toBe(LEVELS[8].shoo.snacks - 1);
    const calm = createLevel(LEVELS[5]);
    const q = LEVELS[5].shoo.picnic;
    gust(calm, q.x - 10, q.y + 20, q.x - 10, q.y - 300);
    expect(calm.snacks).toBe(LEVELS[5].shoo.snacks);
  });
});

describe('stars', () => {
  it('sail and herd: one for finishing, one for every shell, one for beating par', () => {
    const s = createLevel(LEVELS[0]);
    s.time = LEVELS[0].par + 1;
    expect(starsFor(s)).toBe(1);
    s.shells.forEach((x) => (x.got = true));
    expect(starsFor(s)).toBe(2);
    s.time = LEVELS[0].par - 1;
    expect(starsFor(s)).toBe(3);
    s.shells[0].got = false;
    expect(starsFor(s)).toBe(2);
  });

  it('shoo: three for every snack kept, two for half, one otherwise or after a refill', () => {
    const s = createLevel(LEVELS[5]);
    const n = LEVELS[5].shoo.snacks;
    s.snacks = n;
    expect(starsFor(s)).toBe(3);
    s.snacks = Math.ceil(n / 2);
    expect(starsFor(s)).toBe(2);
    s.snacks = 1;
    expect(starsFor(s)).toBe(1);
    const e = createLevel(LEVELS[2]);
    e.refills = 1;
    expect(starsFor(e)).toBe(1);
  });
});

describe('levels', () => {
  it('there are at least nine, mixing all three jobs, with forgiving first levels', () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(9);
    for (const job of ['sail', 'herd', 'shoo']) expect(LEVELS.filter((l) => l.job === job).length).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < 3; i++) expect(LEVELS[i].noFail).toBe(true);
    expect(new Set(LEVELS.slice(0, 3).map((l) => l.job)).size).toBe(3);
  });

  it('start with every loose thing in open space inside the field', () => {
    for (const L of LEVELS) {
      for (const [kind, x, y] of L.movers) {
        expect(x).toBeGreaterThan(RADIUS[kind]);
        expect(x).toBeLessThan(FIELD_W - RADIUS[kind]);
        expect(clear(L, x, y, x, y, RADIUS[kind])).toBe(true);
      }
      if (L.job !== 'shoo') {
        const [gx, gy] = goalPoint(L);
        expect(clear(L, gx, gy, gx, gy, 12)).toBe(true);
      }
    }
  });

  for (let i = 0; i < LEVELS.length; i++) {
    const L = LEVELS[i];
    it(`${i + 1} ${L.name}: the bot wins it, and doing nothing does not`, async () => {
      for (const seed of [1, 42]) {
        const s = createLevel(L, seed);
        await playLevel(s, { maxSeconds: 180, yieldEvery: 4 });
        expect(s.status, `seed ${seed}`).toBe('won');
        expect(s.stars).toBeGreaterThanOrEqual(1);
        expect(s.stars).toBeLessThanOrEqual(3);
        // the scene keeps reacting after the win
        settle(s, 0.5);
      }
      const idle = createLevel(L, 7);
      for (let t = 0; t < 150 && idle.status === 'play'; t += 0.1) {
        step(idle, 0.1);
        if (t % 30 < 0.1) await tick();
      }
      expect(idle.status).not.toBe('won');
    });
  }
});
