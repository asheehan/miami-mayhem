import { describe, it, expect } from 'vitest';
import {
  createGame, step, flap, nextObstacle, catchFish, circleHits, obstacleShapes, invulnerable,
  speedAt, gapAt, spacingAt, shiftAt, WATER, RADIUS, GRAVITY, FLAP, MAX_FALL, START_Y, HEARTS,
  INVULNERABLE, NEST_EVERY, FIRST_X, SPEED, GAP, SPACING, GAP_TOP_MIN, GAP_BOTTOM_MAX,
} from '../src/games/pelican-dash/sim.js';

const DT = 1 / 60;
const run = (s, secs) => {
  for (let t = 0; t < secs; t += DT) step(s, DT);
};
// Flap whenever below the middle of the next gap.
function bot(s) {
  const o = nextObstacle(s);
  if (s.y > (o ? o.centre : START_Y)) flap(s);
  step(s, DT);
}
// Every obstacle generated in a run, in order, collected while flying it with the bot.
function flyWithBot(seed, distance) {
  const s = createGame(seed);
  flap(s);
  const seen = new Map();
  while (s.x < distance && s.status === 'play') {
    for (const o of s.obstacles) seen.set(o.id, o);
    bot(s);
  }
  return { s, obstacles: [...seen.values()] };
}

describe('difficulty', () => {
  it('starts slow and wide, then tightens with distance to a fair floor', () => {
    expect(speedAt(0)).toBe(SPEED[0]);
    expect(gapAt(0)).toBe(GAP[0]);
    for (let d = 0; d < 20000; d += 100) {
      expect(speedAt(d + 100)).toBeGreaterThanOrEqual(speedAt(d));
      expect(gapAt(d + 100)).toBeLessThanOrEqual(gapAt(d));
      expect(spacingAt(d + 100)).toBeLessThanOrEqual(spacingAt(d));
    }
    expect(speedAt(1e6)).toBe(SPEED[1]);
    expect(gapAt(1e6)).toBe(GAP[1]);
    expect(spacingAt(1e6)).toBe(SPACING[1]);
    expect(GAP[1]).toBeGreaterThan(RADIUS * 2 * 3.5);
  });
});

describe('world', () => {
  it('is the same for the same seed and different for another', () => {
    const a = createGame(7);
    const b = createGame(7);
    const c = createGame(8);
    expect(a.obstacles.map((o) => o.centre)).toEqual(b.obstacles.map((o) => o.centre));
    expect(a.obstacles.map((o) => o.centre)).not.toEqual(c.obstacles.map((o) => o.centre));
  });

  it('keeps gaps, spacing and height changes inside the limits for a long way', () => {
    const { obstacles } = flyWithBot(3, 6000);
    expect(obstacles.length).toBeGreaterThan(100);
    expect(obstacles[0].x).toBe(FIRST_X);
    const kinds = new Set();
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (o.kind === 'nest') continue;
      kinds.add(o.kindTop).add(o.kindBottom);
      expect(o.gapBottom - o.gapTop).toBeGreaterThanOrEqual(GAP[1] - 1e-9);
      expect(o.gapBottom - o.gapTop).toBeCloseTo(gapAt(o.x));
      expect(o.gapTop).toBeGreaterThanOrEqual(GAP_TOP_MIN - 1e-9);
      expect(o.gapBottom).toBeLessThanOrEqual(GAP_BOTTOM_MAX + 1e-9);
      // nothing solid pokes into the gap
      for (let x = o.x - o.half; x <= o.x + o.half; x += 1) {
        for (let y = o.gapTop + 0.05; y < o.gapBottom; y += 1) {
          for (const sh of o.shapes) expect(circleHits(sh, x, y, 0)).toBe(false);
        }
      }
      if (i > 0) {
        const p = obstacles[i - 1];
        expect(o.x - p.x).toBeGreaterThanOrEqual(SPACING[1] - 1e-9);
        if (p.kind === 'pair') expect(Math.abs(o.centre - p.centre)).toBeLessThanOrEqual(shiftAt(p.x) + 1e-9);
      }
    }
    expect(kinds).toEqual(new Set(['signs', 'kites', 'blimp', 'pilings', 'pier', 'lifeguard']));
  });

  it('a blimp blocks the sky above it, so the only way through is the gap', () => {
    const shapes = obstacleShapes('blimp', 'pilings', 0, 40, 80);
    for (let y = 0; y < 40; y += 1) expect(shapes.some((sh) => circleHits(sh, 0, y, RADIUS))).toBe(true);
    expect(shapes.some((sh) => circleHits(sh, 0, 60, RADIUS))).toBe(false);
  });
});

describe('flying', () => {
  it('waits on the menu side until the first tap, then flies', () => {
    const s = createGame(1);
    run(s, 2);
    expect(s.status).toBe('ready');
    expect(s.x).toBe(0);
    expect(s.y).toBe(START_Y);
    flap(s);
    expect(s.status).toBe('play');
    step(s, 0.1);
    expect(s.x).toBeCloseTo(SPEED[0] * 0.1);
    expect(s.y).toBeLessThan(START_Y);
  });

  it('a flap sends the pelican up, gravity pulls it down, and falling has a top speed', () => {
    const s = createGame(1);
    flap(s);
    expect(s.vy).toBe(-FLAP);
    step(s, 0.2);
    expect(s.vy).toBeCloseTo(-FLAP + GRAVITY * 0.2);
    const s2 = createGame(1);
    flap(s2);
    s2.vy = 0;
    s2.y = 10;
    s2.invulnUntil = 99;
    step(s2, 1);
    expect(s2.vy).toBeLessThanOrEqual(MAX_FALL);
  });

  it('is gentle: one tap a second keeps the pelican in the air', () => {
    const s = createGame(1);
    s.obstacles.length = 0;
    s.nextX = 1e9;
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < 15; i++) {
      flap(s);
      for (let t = 0; t < 0.9; t += DT) {
        step(s, DT);
        lo = Math.min(lo, s.y);
        hi = Math.max(hi, s.y);
      }
    }
    expect(s.hearts).toBe(HEARTS);
    expect(hi - lo).toBeLessThan(30);
  });
});

describe('hearts', () => {
  it('hitting an obstacle costs a heart, bumps to the gap and blinks for about 2 seconds', () => {
    const s = createGame(5);
    flap(s);
    const o = s.obstacles[0];
    // fly straight at the piling, below the gap
    s.x = o.x - o.half - RADIUS - 0.5;
    s.y = o.gapBottom + 1;
    s.vy = 0;
    for (let i = 0; i < 30 && s.hearts === HEARTS; i++) step(s, DT);
    expect(s.hearts).toBe(HEARTS - 1);
    expect(s.hitBy).toBe('obstacle');
    expect(invulnerable(s)).toBe(true);
    expect(s.invulnUntil - s.hitTime).toBeCloseTo(INVULNERABLE);
    run(s, 0.5);
    expect(s.y).toBeCloseTo(o.centre, 0);
    // still blinking, so no more hearts are lost even back at the water
    s.y = WATER - 1;
    run(s, 0.5);
    expect(s.hearts).toBe(HEARTS - 1);
    // once the blinking stops, the water costs a heart again
    run(s, INVULNERABLE);
    expect(s.hearts).toBe(HEARTS - 2);
  });

  it('the water and the top of the sky each cost a heart', () => {
    const a = createGame(1);
    flap(a);
    a.y = WATER - RADIUS - 0.1;
    a.vy = 10;
    step(a, 0.05);
    expect(a.hearts).toBe(HEARTS - 1);
    expect(a.hitBy).toBe('water');
    const b = createGame(1);
    flap(b);
    b.y = RADIUS + 0.1;
    b.vy = -FLAP;
    step(b, 0.05);
    expect(b.hearts).toBe(HEARTS - 1);
    expect(b.hitBy).toBe('top');
  });

  it('doing nothing loses all three hearts and ends the game', () => {
    const s = createGame(2);
    flap(s);
    run(s, 15);
    expect(s.hearts).toBe(0);
    expect(s.status).toBe('over');
    const x = s.x;
    run(s, 2);
    expect(s.x).toBe(x);
    expect(flap(s)).toBe(false);
  });
});

describe('fish and nests', () => {
  it('flying through a leaping fish catches it', () => {
    const s = createGame(1);
    // the first fish leaps right in front of the pelican's starting height
    const f = s.fishes[0];
    flap(s);
    for (let i = 0; i < 400 && f.state < 2; i++) {
      if (s.y > START_Y) flap(s);
      step(s, DT);
    }
    expect(f.state).toBe(2);
    expect(s.fish).toBe(1);
    expect(s.pouch).toBe(1);
  });

  it('a fish nobody catches falls back into the sea', () => {
    const s = createGame(1);
    const f = s.fishes[0];
    flap(s);
    s.y = 15;
    for (let i = 0; i < 400 && f.state < 2; i++) {
      if (s.y > 15) flap(s);
      step(s, DT);
    }
    expect(f.state).toBe(3);
    expect(s.fish).toBe(0);
  });

  it('ten fish call a nest; passing it feeds the chicks, empties the pouch and gives back a heart', () => {
    const s = createGame(4);
    flap(s);
    s.hearts = 1;
    catchFish(s, NEST_EVERY);
    const nest = s.obstacles.find((o) => o.kind === 'nest');
    expect(nest).toBeTruthy();
    expect(nest.x).toBeGreaterThan(s.x + 100);
    expect(nest.shapes.length).toBe(0);
    while (s.x < nest.x + 1 && s.status === 'play') bot(s);
    expect(nest.done).toBe(true);
    expect(s.pouch).toBe(0);
    expect(s.fish).toBeGreaterThanOrEqual(NEST_EVERY);
    expect(s.delivered).toBeGreaterThanOrEqual(NEST_EVERY);
    expect(s.hearts).toBe(2);
    expect(s.fed).toBe(1);
  });

  it('hearts never go above three', () => {
    const s = createGame(4);
    flap(s);
    catchFish(s, NEST_EVERY);
    const nest = s.obstacles.find((o) => o.kind === 'nest');
    while (s.x < nest.x + 1 && s.status === 'play') bot(s);
    expect(s.fed).toBe(1);
    expect(s.hearts).toBe(HEARTS);
    expect(s.healed).toBe(false);
  });
});

describe('the course is always passable', () => {
  for (const seed of [1, 2, 3, 42, 1234, 99999]) {
    it(`a simple bot flies 8000 units on seed ${seed} without a scratch`, () => {
      const { s } = flyWithBot(seed, 8000);
      expect(s.status).toBe('play');
      expect(s.hearts).toBe(HEARTS);
      expect(s.x).toBeGreaterThanOrEqual(8000);
      // it picks up fish on the way and reaches nests
      expect(s.fish).toBeGreaterThan(50);
      expect(s.fed).toBeGreaterThan(3);
    });
  }

  it('a slower thumb (at most four taps a second) still gets far without losing a heart', () => {
    for (const seed of [5, 6, 7]) {
      const s = createGame(seed);
      flap(s);
      let last = 0;
      while (s.x < 5000 && s.status === 'play') {
        const o = nextObstacle(s);
        if (s.y > o.centre && s.time - last >= 0.25) {
          flap(s);
          last = s.time;
        }
        step(s, DT);
      }
      expect(s.hearts).toBe(HEARTS);
    }
  });
});
