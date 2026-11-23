import { describe, it, expect } from 'vitest';
import { LEVELS } from '../src/games/turtle-tide/levels.js';
import {
  createLevel, step, setTide, starsFor, groundAt, groundMax, navTarget, touchingDanger,
  WALK_SPEED, SWIM_SPEED, STEP_H, FLOAT_SINK, TURTLE_W, TURTLE_H, TIDE_SPEED, LOG_SINK, LOG_H,
  CRAB_HIDE, EEP_TIME, RETURN_TIME, WORLD_H,
} from '../src/games/turtle-tide/sim.js';
import { playNav, hintMove } from '../src/games/turtle-tide/bot.js';

const tick = () => new Promise((r) => setImmediate(r));
const run = (s, secs, dt = 1 / 30) => {
  for (let t = 0; t < secs - 1e-9; t += dt) step(s, dt);
};
// run until a condition holds (or give up after `secs`)
const until = (s, cond, secs = 30) => {
  for (let t = 0; t < secs && !cond(s); t += 1 / 60) step(s, 1 / 60);
  return cond(s);
};

// A small test beach: flat sand at 40, with whatever else a test adds. Goal far away.
function beach(extra = {}) {
  return createLevel({
    name: 'test', width: 2000, start: 40, goal: 1900,
    tide: { min: 0, max: 200, start: 10 },
    ground: [[0, 40], [2000, 40]],
    starfish: [[1500, 200], [1600, 200], [1700, 200]],
    ...extra,
  });
}

describe('terrain', () => {
  it('joins ground points with lines and makes sheer walls where two share an x', () => {
    const g = [[0, 10], [100, 30], [100, 60], [200, 60]];
    expect(groundAt(g, 50)).toBeCloseTo(20);
    expect(groundAt(g, 100)).toBe(60);
    expect(groundAt(g, 150)).toBe(60);
    expect(groundMax(g, 40, 99)).toBeLessThan(30);
    expect(groundMax(g, 90, 110)).toBe(60);
  });
});

describe('walking, blocking and floating', () => {
  it('walks right along the sand at walking speed', () => {
    const s = beach();
    run(s, 2);
    expect(s.turtle.mode).toBe('walk');
    expect(s.turtle.y).toBe(40);
    expect(s.turtle.x - 40).toBeCloseTo(WALK_SPEED * 2, 0);
  });

  it('steps up a small step but is blocked by a taller wall, and waits facing right', () => {
    const s = beach({ ground: [[0, 40], [100, 40], [100, 40 + STEP_H - 1], [200, 40 + STEP_H - 1], [200, 80], [400, 80]] });
    run(s, 4);
    expect(s.turtle.y).toBe(40 + STEP_H - 1); // climbed the small step
    run(s, 6);
    expect(s.turtle.blocked).toBe('wall');
    expect(s.turtle.x + TURTLE_W / 2).toBeLessThanOrEqual(200);
    expect(s.turtle.x + TURTLE_W / 2).toBeGreaterThan(198);
    const x = s.turtle.x;
    run(s, 5);
    expect(s.turtle.x).toBe(x); // still waiting; never turns back
    expect(s.turtle.blockedT).toBeGreaterThan(5);
  });

  it('floats at the surface once the water is deep enough, and swims faster than it walks', () => {
    const s = beach();
    setTide(s, 40 + FLOAT_SINK - 2); // shallow: still walking
    run(s, 2);
    expect(s.turtle.mode).toBe('walk');
    setTide(s, 100);
    run(s, 3);
    expect(s.turtle.mode).toBe('swim');
    expect(s.turtle.y).toBeCloseTo(100 - FLOAT_SINK, 1);
    const x0 = s.turtle.x;
    run(s, 2);
    expect(s.turtle.x - x0).toBeCloseTo(SWIM_SPEED * 2, 0);
    expect(SWIM_SPEED).toBeGreaterThan(WALK_SPEED);
  });

  it('raising the water lifts the turtle over a wall; lowering it sets the turtle down again', () => {
    const s = beach({ ground: [[0, 40], [200, 40], [200, 80], [400, 80], [400, 40], [2000, 40]] });
    expect(until(s, (q) => q.turtle.blocked === 'wall')).toBe(true);
    setTide(s, 95);
    expect(until(s, (q) => q.turtle.x > 260)).toBe(true);
    expect(s.turtle.mode).toBe('swim');
    setTide(s, 10);
    expect(until(s, (q) => q.turtle.mode === 'walk')).toBe(true);
    expect(s.turtle.y).toBe(80); // set down on top of the wall
    expect(until(s, (q) => q.turtle.x > 450 && q.turtle.mode === 'walk')).toBe(true);
    expect(s.turtle.y).toBe(40); // and walked off the far side
  });

  it('the water moves at most TIDE_SPEED and stays in the level range', () => {
    const s = beach();
    setTide(s, 500);
    expect(s.target).toBe(200);
    run(s, 0.5);
    expect(s.water - 10).toBeLessThanOrEqual(TIDE_SPEED * 0.5 + 0.01);
    expect(s.water - 10).toBeGreaterThan(TIDE_SPEED * 0.4);
    setTide(s, -50);
    expect(s.target).toBe(0);
  });
});

describe('overhangs', () => {
  const cave = () => beach({ tide: { min: 0, max: 200, start: 100 }, rocks: [{ kind: 'cave', x0: 200, x1: 300, y0: 70, y1: 400 }] });

  it('a floating turtle bonks its head on a low rock and is blocked until the water goes down', () => {
    const s = cave();
    expect(until(s, (q) => q.turtle.blocked === 'bonk')).toBe(true);
    expect(s.bonks).toBe(1);
    expect(s.events.some((e) => e.type === 'bonk')).toBe(true);
    run(s, 4);
    expect(s.turtle.x + TURTLE_W / 2).toBeLessThanOrEqual(200);
    setTide(s, 70 - TURTLE_H + FLOAT_SINK - 2); // the shell's top now clears the rock
    expect(until(s, (q) => q.turtle.x > 320)).toBe(true);
  });

  it('a walking turtle fits under it, and water that rises while it is underneath pins it below the rock', () => {
    const s = cave();
    setTide(s, 10);
    expect(until(s, (q) => q.turtle.x > 230)).toBe(true);
    setTide(s, 150);
    run(s, 1);
    expect(s.turtle.y + TURTLE_H).toBeLessThanOrEqual(70.01);
    expect(until(s, (q) => q.turtle.x > 320)).toBe(true);
    run(s, 1);
    expect(s.turtle.y).toBeGreaterThan(130); // popped back up to the surface
  });
});

describe('driftwood logs', () => {
  // a pit in the sand with a log held inside it, next to a cliff
  const pit = (start = 20) => createLevel({
    name: 'log', width: 2000, start: 40, goal: 1900, tide: { min: 10, max: 100, start },
    ground: [[0, 60], [200, 60], [200, 20], [250, 20], [250, 110], [2000, 110]],
    logs: [{ x: 203, w: 44 }],
    starfish: [[1500, 200], [1600, 200], [1700, 200]],
  });

  it('rest on the ground when the water is low and float with the surface when it is high', () => {
    const s = pit(10);
    expect(s.logs[0].y).toBe(20);
    setTide(s, 70);
    run(s, 3);
    expect(s.logs[0].y).toBeCloseTo(70 - LOG_SINK, 1);
    setTide(s, 10);
    run(s, 3);
    expect(s.logs[0].y).toBe(20);
  });

  it('carry a turtle standing on them, higher than it could swim', () => {
    const s = pit(10);
    expect(until(s, (q) => q.turtle.blocked === 'wall' && q.turtle.x > 210)).toBe(true);
    expect(s.turtle.y).toBe(20 + LOG_H); // walked onto the log in the pit
    setTide(s, 100);
    expect(until(s, (q) => q.turtle.x > 300)).toBe(true);
    expect(s.turtle.y).toBe(110); // stepped off the raised log onto the cliff top
    // swimming alone never gets there: the surface would be 5 below the cliff top
    expect(100 - FLOAT_SINK + 14).toBeLessThan(110);
  });

  it('block a swimming turtle: a floating log sticks up out of the water', () => {
    const s = pit(80);
    expect(until(s, (q) => q.turtle.blocked === 'wall')).toBe(true);
    expect(s.turtle.mode).toBe('swim');
    expect(s.turtle.x + TURTLE_W / 2).toBeLessThanOrEqual(203.5);
  });
});

describe('crabs and jellyfish', () => {
  const crabby = (start = 10) => beach({ tide: { min: 0, max: 200, start }, crabs: [{ x0: 200, x1: 260 }], checkpoints: [120] });

  it('touching an awake crab makes the turtle eep and hop back to the last sandcastle', () => {
    const s = crabby();
    expect(until(s, (q) => q.turtle.mode === 'eep')).toBe(true);
    expect(s.mishaps).toBe(1);
    expect(s.checkpoint).toBe(120);
    expect(s.events.some((e) => e.type === 'eep')).toBe(true);
    run(s, EEP_TIME + RETURN_TIME + 0.05, 1 / 60);
    expect(s.turtle.x).toBeLessThan(130);
    expect(s.turtle.x).toBeGreaterThanOrEqual(120);
    expect(s.turtle.safe).toBeGreaterThan(0);
    expect(s.status).toBe('play');
  });

  it('crabs hide in their shells under water and are harmless', () => {
    const s = crabby(40 + CRAB_HIDE + 1); // covered, but too shallow for the turtle to float
    run(s, 0.1);
    expect(s.crabs[0].hidden).toBe(true);
    expect(s.turtle.mode).toBe('walk');
    expect(until(s, (q) => q.turtle.x > 300)).toBe(true);
    expect(s.mishaps).toBe(0);
    // and they wake when the water goes
    setTide(s, 10);
    run(s, 1);
    expect(s.crabs[0].hidden).toBe(false);
  });

  it('a floating jelly stings, a jelly resting on the sand does not', () => {
    const wet = beach({ tide: { min: 0, max: 200, start: 90 }, jellies: [{ x0: 150, x1: 160 }] });
    expect(until(wet, (q) => q.mishaps > 0)).toBe(true);
    const dry = beach({ tide: { min: 0, max: 200, start: 45 }, jellies: [{ x0: 150, x1: 160 }] });
    run(dry, 0.2);
    expect(dry.jellies[0].rest).toBe(true);
    expect(until(dry, (q) => q.turtle.x > 250)).toBe(true);
    expect(dry.mishaps).toBe(0);
    expect(touchingDanger(dry)).toBeNull();
  });
});

describe('starfish and stars', () => {
  it('one star for reaching the sea, two with two starfish, three with all three', () => {
    const s = beach();
    expect(starsFor(s)).toBe(1);
    s.starfish[0].got = true;
    expect(starsFor(s)).toBe(1);
    s.starfish[1].got = true;
    expect(starsFor(s)).toBe(2);
    s.starfish[2].got = true;
    expect(starsFor(s)).toBe(3);
  });

  it('picks up a starfish it passes through, high or low, and wins at the goal', () => {
    const s = createLevel({
      name: 't', width: 600, start: 40, goal: 400, tide: { min: 0, max: 200, start: 10 },
      ground: [[0, 40], [600, 40]], starfish: [[100, 48], [200, 120], [300, 48]],
    });
    expect(until(s, (q) => q.starfish[0].got)).toBe(true);
    setTide(s, 121);
    expect(until(s, (q) => q.turtle.x > 220)).toBe(true);
    expect(s.starfish[1].got).toBe(true);
    expect(until(s, (q) => q.status === 'won', 60)).toBe(true);
    expect(s.starfish[2].got).toBe(false); // swam right over the low one
    expect(s.stars).toBe(2);
  });
});

describe('determinism', () => {
  it('the same seed and the same finger give the same game', () => {
    const play = (seed) => {
      const s = createLevel(LEVELS[4], seed);
      const trace = [];
      for (let i = 0; i < 900; i++) {
        if (i === 200) setTide(s, 60);
        if (i === 500) setTide(s, 20);
        step(s, 1 / 30);
        if (i % 50 === 0) trace.push([s.turtle.x, s.turtle.y, s.water, ...s.crabs.map((c) => c.x)].map((v) => v.toFixed(4)).join());
      }
      return trace.join('|');
    };
    expect(play(5)).toBe(play(5));
    expect(play(5)).not.toBe(play(6)); // crab pauses come from the seed
  });
});

describe('levels', () => {
  it('there are at least ten, each with three starfish, sandcastles in order and the sea at the end', () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(10);
    for (const L of LEVELS) {
      expect(L.starfish.length).toBe(3);
      expect(L.goal).toBeLessThan(L.width);
      expect(L.start).toBeLessThan(L.goal);
      const cps = L.checkpoints || [];
      expect([...cps].sort((a, b) => a - b)).toEqual(cps);
      for (const x of cps) expect(x > L.start && x < L.goal).toBe(true);
      expect(L.tide.start).toBeGreaterThanOrEqual(L.tide.min);
      expect(L.tide.start).toBeLessThanOrEqual(L.tide.max);
      expect(L.tide.max).toBeLessThan(WORLD_H);
      // the goal is always in the sea, even at the lowest tide
      expect(groundAt(L.ground, L.goal)).toBeLessThan(L.tide.min - (L.swell?.amp || 0));
      for (const [x, h] of L.nav.concat(L.navAll)) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(h).toBeGreaterThanOrEqual(L.tide.min);
        expect(h).toBeLessThanOrEqual(L.tide.max);
      }
    }
  });

  it('introduce one new thing at a time', () => {
    const firstWith = (f) => LEVELS.findIndex(f);
    const order = [
      firstWith((L) => !!L.rocks?.length),
      firstWith((L) => !!L.logs?.length),
      firstWith((L) => !!L.crabs?.length),
      firstWith((L) => !!L.jellies?.length),
      firstWith((L) => !!L.swell),
    ];
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(new Set(order).size).toBe(order.length);
    expect(LEVELS[0].hint && LEVELS[1].hint).toBe(true);
  });

  it('the hint finger points up at the first wall and down at the first cave', () => {
    const a = createLevel(LEVELS[0], 1);
    until(a, (q) => q.turtle.blocked === 'wall');
    expect(hintMove(a)?.dir).toBe('up');
    const b = createLevel(LEVELS[1], 1);
    until(b, (q) => q.turtle.blocked === 'bonk');
    expect(hintMove(b)?.dir).toBe('down');
  });

  for (let i = 0; i < LEVELS.length; i++) {
    const L = LEVELS[i];
    it(`${i + 1} ${L.name}: the nav bot reaches the sea, the starfish bot gets all three, leaving the tide alone does not finish`, async () => {
      for (const seed of [1, 42]) {
        const s = createLevel(L, seed);
        await playNav(s, L.nav, { maxSeconds: 120, yieldEvery: 20 });
        expect(s.status, `nav, seed ${seed}`).toBe('won');
        expect(s.stars).toBeGreaterThanOrEqual(1);

        const all = createLevel(L, seed);
        await playNav(all, L.navAll, { maxSeconds: 120, yieldEvery: 20 });
        expect(all.status, `navAll, seed ${seed}`).toBe('won');
        expect(all.starfish.every((f) => f.got), `navAll starfish, seed ${seed}`).toBe(true);
        expect(all.stars).toBe(3);
      }
      const idle = createLevel(L, 7);
      for (let t = 0; t < 120 && idle.status === 'play'; t += 0.1) {
        step(idle, 0.1);
        if (t % 30 < 0.1) await tick();
      }
      expect(idle.status).not.toBe('won');
      expect(navTarget(L.nav, L.start)).toBe(L.tide.start); // the nav starts where the water does
    });
  }
});
