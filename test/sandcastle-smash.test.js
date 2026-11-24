import { describe, it, expect } from 'vitest';
import { LEVELS, CHAPTERS } from '../src/games/sandcastle-smash/levels.js';
import {
  createLevel, step, run, until, fire, activate, crabs, nuts, blocks, isCalm, canFire, starsFor, flightPath,
  cloneState, coconutsLeft, SLING, DT, CLEAR_DELAY, MATERIALS, NUTS, CRAB_H,
} from '../src/games/sandcastle-smash/sim.js';
import { createWorld, addBody, findContacts, applyGravity, solve } from '../src/games/sandcastle-smash/physics.js';
import { anglesThrough, playLevel } from '../src/games/sandcastle-smash/bot.js';
import { unlocked } from '../src/games/sandcastle-smash/index.js';

const tick = () => new Promise((r) => setImmediate(r));

// A test beach: whatever pieces a test wants, plenty of coconuts.
const beach = (pieces, ammo = ['coco', 'coco', 'coco']) => createLevel({ name: 'test', chapter: 0, width: 30, sky: 'morning', ammo, pieces });
const B = (t, x, y, w = 1, h = 1) => ({ t, x, y: y + h / 2, w, h });
const crab = (x, y) => ({ t: 'crab', x, y: y + CRAB_H / 2 });
const rock = (x, y, w, h) => ({ t: 'rock', x, y: y + h / 2, w, h });
// a flat shot at height SLING.y needs the thing it hits up on a ledge at that height
const ledge = (x) => rock(x, 0, 1.2, SLING.y - 0.5);
// step until the shot in the air is done (next coconut ready, won, or lost)
const settle = (s, secs = 10) => until(s, (q) => q.status !== 'flying' && q.status !== 'clear', secs);
const moved = (b) => Math.hypot(b.x - b.start.x, b.y - b.start.y);

describe('physics', () => {
  it('a tall tower resting on the sand stays put for 10 seconds', () => {
    const w = createWorld();
    addBody(w, { shape: 'box', width: 100, height: 10, x: 0, y: -5 });
    const tower = [];
    for (let i = 0; i < 8; i++) tower.push(addBody(w, { shape: 'box', width: 1, height: 1, x: 5, y: 0.5 + i, density: 1.4, friction: 0.8 }));
    for (let i = 0; i < 600; i++) {
      findContacts(w);
      applyGravity(w);
      solve(w);
    }
    for (const [i, b] of tower.entries()) {
      expect(Math.abs(b.x - 5)).toBeLessThan(0.01);
      expect(Math.abs(b.y - (0.5 + i))).toBeLessThan(0.08); // only the small allowed overlap
      expect(Math.abs(b.a)).toBeLessThan(0.01);
      expect(Math.hypot(b.vx, b.vy)).toBeLessThan(0.01);
    }
  });

  it('a castle with a crab on top neither jitters apart nor pops anything by itself', () => {
    const s = beach([
      B('sand', 10, 0), B('sand', 11, 0), B('sand', 10.5, 1), B('wood', 10.5, 2, 3, 0.35),
      B('ice', 10, 2.35), B('ice', 11, 2.35), crab(10.5, 3.35),
    ]);
    expect(isCalm(s)).toBe(true);
    const n = s.world.bodies.length;
    run(s, 10);
    expect(s.world.bodies.length).toBe(n);
    for (const b of blocks(s).concat(crabs(s))) expect(moved(b)).toBeLessThan(0.03);
    expect(s.events.filter((e) => e.type === 'break' || e.type === 'pop')).toEqual([]);
  });

  it('balls bounce and then roll to a stop', () => {
    const s = beach([{ t: 'ball', x: 8, y: 4, r: 0.5 }, crab(20, 0)]);
    const ball = blocks(s)[0];
    // createLevel settles it quietly first, so drop it again
    ball.y = 5;
    ball.vy = 0;
    let bounced = false;
    for (let i = 0; i < 120; i++) {
      step(s);
      if (ball.vy > 2) bounced = true;
    }
    expect(bounced).toBe(true);
    ball.vx = 3;
    run(s, 12);
    expect(Math.abs(ball.vx)).toBeLessThan(0.3);
  });
});

describe('the slingshot', () => {
  it('fires only with a coconut loaded and a long enough pull', () => {
    const s = beach([crab(20, 0)]);
    expect(canFire(s)).toBe(true);
    expect(fire(s, 0.5, 0.05)).toBe(false);
    expect(fire(s, 0.5, 0.8)).toBe(true);
    expect(s.status).toBe('flying');
    expect(fire(s, 0.5, 0.8)).toBe(false); // nothing loaded while one flies
    expect(s.shots).toBe(1);
  });

  it('the dotted preview is exactly the path the coconut flies', () => {
    const s = beach([crab(28, 0)]);
    const path = flightPath(0.7, 0.75, { steps: 60 });
    fire(s, 0.7, 0.75);
    const nut = nuts(s)[0];
    for (let i = 0; i < 60; i++) step(s);
    expect(nut.x).toBeCloseTo(path[59].x, 6);
    expect(nut.y).toBeCloseTo(path[59].y, 6);
  });

  it('reloads once things are still, and spent coconuts puff away', () => {
    const s = beach([crab(25, 0)], ['coco', 'split', 'coco']);
    fire(s, 0.3, 0.5);
    expect(settle(s)).toBe(true);
    expect(s.status).toBe('ready');
    expect(s.loaded).toBe('split');
    expect(nuts(s)).toEqual([]);
    expect(coconutsLeft(s)).toBe(2);
  });
});

describe('knocking things over', () => {
  it('a coconut into a tower knocks its blocks about', () => {
    const s = beach([B('wood', 9, 0, 0.4, 2), B('wood', 9, 2, 0.4, 2), crab(20, 0)]);
    const [a] = anglesThrough(9, 3, 0.8);
    fire(s, a, 0.8);
    settle(s);
    expect(blocks(s).some((b) => moved(b) > 0.5)).toBe(true);
  });

  it('blocks break by material: sand crumbles, ice shatters, driftwood takes a heavy coconut', () => {
    const hitWith = (mat, nut) => {
      const s = beach([ledge(7), B(mat, 7, SLING.y - 0.5), crab(25, 0)], [nut]);
      fire(s, 0, 1);
      run(s, 1);
      return s;
    };
    for (const mat of ['sand', 'ice']) {
      const s = hitWith(mat, 'coco');
      expect(blocks(s), mat).toEqual([]);
      expect(s.events.some((e) => e.type === 'break' && e.mat === mat)).toBe(true);
    }
    const wood = hitWith('wood', 'coco');
    expect(blocks(wood).length).toBe(1); // a plain coconut only dents driftwood
    expect(blocks(wood)[0].dmg).toBeGreaterThan(0);
    expect(blocks(hitWith('wood', 'heavy'))).toEqual([]);
    expect(MATERIALS.sand.hp).toBeLessThan(MATERIALS.ice.hp);
    expect(MATERIALS.ice.hp).toBeLessThan(MATERIALS.wood.hp);
  });

  it('buckets, balls and rocks never break', () => {
    const s = beach([ledge(7), { t: 'bucket', x: 7, y: SLING.y - 0.5 + 0.45 }, crab(25, 0)], ['heavy']);
    fire(s, 0, 1);
    run(s, 2);
    expect(s.events.some((e) => e.type === 'break')).toBe(false);
    expect(blocks(s).length).toBe(1);
  });

  it('a coconut smashes through a sand block and keeps going, slower', () => {
    const s = beach([ledge(7), B('sand', 7, SLING.y - 0.5), crab(28, 0)]);
    fire(s, 0, 1);
    const nut = nuts(s)[0];
    const v0 = nut.vx;
    until(s, (q) => blocks(q).length === 0, 1);
    step(s);
    expect(nut.vx).toBeGreaterThan(2);
    expect(nut.vx).toBeLessThan(v0 - 2);
  });
});

describe('crabs', () => {
  it('pop when a coconut hits them', () => {
    const s = beach([crab(9, 0), crab(25, 0)]);
    const [a] = anglesThrough(8.8, 0.3, 0.8);
    fire(s, a, 0.8);
    expect(until(s, (q) => crabs(q).length === 1, 3)).toBe(true);
    const pop = s.events.find((e) => e.type === 'pop');
    expect(pop.why).toBe('hit');
    expect(s.score).toBeGreaterThanOrEqual(500);
  });

  it('pop when they fall off their castle', () => {
    const s = beach([B('sand', 10, 0), B('sand', 10, 1), B('sand', 10, 2), crab(10, 3), crab(25, 0)]);
    const c = crabs(s)[0];
    c.vx = 4; // a shove off the top
    c.vy = 1;
    expect(until(s, (q) => crabs(q).length === 1, 3)).toBe(true);
    expect(s.events.find((e) => e.type === 'pop').why).toBe('fell');
  });

  it('a soft nudge does not pop a crab', () => {
    const s = beach([crab(10, 0), crab(25, 0)]);
    crabs(s)[0].vx = 0.8;
    run(s, 2);
    expect(crabs(s).length).toBe(2);
  });
});

describe('special coconuts', () => {
  it('a tap splits the split coconut into three that spread out', () => {
    const s = beach([crab(28, 0)], ['split', 'coco']);
    fire(s, 0.5, 0.8);
    run(s, 0.3);
    expect(activate(s)).toBe(true);
    const bits = nuts(s);
    expect(bits.length).toBe(3);
    expect(bits.every((b) => b.nut === 'bit')).toBe(true);
    run(s, 0.4);
    const ys = nuts(s).map((b) => b.y).sort((a, b) => a - b);
    expect(ys[2] - ys[0]).toBeGreaterThan(1);
    expect(activate(s)).toBe(false); // once only
  });

  it('a plain or heavy coconut does nothing on a tap; the heavy one is much heavier', () => {
    for (const type of ['coco', 'heavy']) {
      const s = beach([crab(28, 0)], [type]);
      fire(s, 0.5, 0.8);
      run(s, 0.3);
      expect(activate(s)).toBe(false);
    }
    const m = (n) => NUTS[n].density * NUTS[n].r * NUTS[n].r;
    expect(m('heavy')).toBeGreaterThan(m('coco') * 3);
  });

  it('a pineapple bursts on its first touch, knocking and breaking what is near', () => {
    const s = beach([B('sand', 9, 0), B('sand', 10, 0), B('wood', 9.5, 1, 2.4, 0.35), crab(9.5, 1.35), crab(25, 0)], ['pineapple', 'coco']);
    const [a] = anglesThrough(9, 1, 0.8);
    fire(s, a, 0.8);
    expect(until(s, (q) => q.events.some((e) => e.type === 'burst'), 3)).toBe(true);
    run(s, 0.2);
    expect(crabs(s).length).toBe(1);
    expect(s.events.some((e) => e.type === 'break')).toBe(true);
    expect(nuts(s).length).toBe(0);
  });

  it('a tap bursts the pineapple in the air', () => {
    const s = beach([crab(28, 0)], ['pineapple']);
    fire(s, 0.6, 0.8);
    run(s, 0.4);
    expect(activate(s)).toBe(true);
    expect(s.events.some((e) => e.type === 'burst')).toBe(true);
  });
});

describe('winning, trying again and stars', () => {
  it('one star for clearing, one more for each coconut left, up to three', () => {
    expect(starsFor(0)).toBe(1);
    expect(starsFor(1)).toBe(2);
    expect(starsFor(2)).toBe(3);
    expect(starsFor(5)).toBe(3);
  });

  it('popping the last crab wins after a moment, with stars for the coconuts left', () => {
    const s = beach([crab(9, 0)], ['coco', 'coco', 'coco', 'coco']);
    const [a] = anglesThrough(8.8, 0.3, 0.8);
    fire(s, a, 0.8);
    expect(until(s, (q) => q.status === 'clear', 3)).toBe(true);
    expect(s.stars).toBe(3);
    run(s, CLEAR_DELAY + DT);
    expect(s.status).toBe('won');
  });

  it('running out of coconuts with crabs left is a kind try-again, not a crash', () => {
    const s = beach([crab(25, 0)], ['coco', 'coco']);
    fire(s, 1.4, 0.3);
    settle(s);
    expect(s.status).toBe('ready');
    fire(s, 1.4, 0.3);
    settle(s);
    expect(s.status).toBe('lost');
    expect(s.stars).toBe(0);
    expect(canFire(s)).toBe(false);
  });
});

describe('determinism', () => {
  it('the same shots always end the same way, and a copy plays out like the original', () => {
    const play = (shots) => {
      const s = createLevel(LEVELS[9]);
      for (const [a, p, tap] of shots) {
        if (!canFire(s)) break;
        fire(s, a, p);
        for (let i = 0; i < 600 && s.status === 'flying'; i++) {
          if (tap && s.shotT >= tap) activate(s);
          step(s);
        }
      }
      return s.world.bodies.map((b) => [b.x, b.y, b.a].map((v) => v.toFixed(6)).join()).join('|') + s.status + s.score;
    };
    const shots = [[0.3, 0.9], [0.5, 0.95, 0.5], [0.2, 1]];
    expect(play(shots)).toBe(play(shots));
    expect(play(shots)).not.toBe(play([[0.31, 0.9], ...shots.slice(1)]));

    const s = createLevel(LEVELS[4]);
    fire(s, 0.35, 0.8);
    run(s, 0.5);
    const c = cloneState(s);
    run(s, 2);
    run(c, 2);
    expect(JSON.stringify(c.world.bodies.map((b) => [b.x, b.y]))).toBe(JSON.stringify(s.world.bodies.map((b) => [b.x, b.y])));
  });
});

describe('levels', () => {
  it('fifteen levels in three chapters of five, each new thing arriving one at a time', () => {
    expect(LEVELS.length).toBe(15);
    expect(CHAPTERS.length).toBe(3);
    for (let c = 0; c < 3; c++) expect(LEVELS.filter((L) => L.chapter === c).length).toBe(5);
    expect(LEVELS.map((L) => L.chapter)).toEqual([...LEVELS.map((L) => L.chapter)].sort());
    const first = (f) => LEVELS.findIndex(f);
    const has = (t) => (L) => L.pieces.some((p) => p.t === t);
    const ammo = (t) => (L) => L.ammo.includes(t);
    const order = [first(has('wood')), first(has('ball')), first(has('ice')), first(ammo('split')), first(has('bucket')), first(ammo('heavy')), first(ammo('pineapple'))];
    expect(order.every((i) => i > 2)).toBe(true); // the first three are plain sand and coconuts
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // a special's first level leads with it
    for (const t of ['split', 'heavy', 'pineapple']) expect(LEVELS[first(ammo(t))].ammo[0]).toBe(t);
  });

  it('the first three are small: one or two crabs and plenty of coconuts', () => {
    for (const L of LEVELS.slice(0, 3)) {
      const n = L.pieces.filter((p) => p.t === 'crab').length;
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(2);
      expect(L.ammo.length).toBeGreaterThanOrEqual(4);
      expect(L.ammo.every((a) => a === 'coco')).toBe(true);
    }
  });

  for (let i = 0; i < LEVELS.length; i++) {
    const L = LEVELS[i];
    it(`${i + 1} ${L.name}: valid, starts at rest and stays at rest for 10 s`, () => {
      expect(L.ammo.length).toBeGreaterThanOrEqual(4);
      for (const a of L.ammo) expect(NUTS[a]).toBeDefined();
      const s = createLevel(L);
      expect(s.world.bodies.length).toBeLessThanOrEqual(60);
      expect(crabs(s).length).toBeGreaterThan(0);
      // settling barely moved anything from where the level put it
      for (const b of s.world.bodies) {
        if (!b.im) continue;
        const p = L.pieces.find((q) => Math.abs(q.x - b.x) < 0.1 && Math.abs(q.y - b.y) < 0.1);
        expect(p, `${b.mat} at ${b.x.toFixed(2)},${b.y.toFixed(2)}`).toBeDefined();
        expect(b.x).toBeLessThan(L.width);
      }
      expect(isCalm(s)).toBe(true);
      const n = s.world.bodies.length;
      run(s, 10);
      expect(s.world.bodies.length).toBe(n);
      for (const b of s.world.bodies) if (b.im) expect(moved(b)).toBeLessThan(0.05);
      expect(s.status).toBe('ready');
    });
  }

  for (let i = 0; i < LEVELS.length; i++) {
    const L = LEVELS[i];
    it(`${i + 1} ${L.name}: the bot clears it within its coconuts`, async () => {
      await tick();
      const s = createLevel(L);
      playLevel(s);
      expect(s.status).toBe('won');
      expect(s.shots).toBeLessThanOrEqual(L.ammo.length);
      expect(s.stars).toBeGreaterThanOrEqual(1);
    }, 60000);
  }
});

describe('progress', () => {
  it('a level opens once the one before it has a star', () => {
    const p = { stars: LEVELS.map(() => 0) };
    expect(unlocked(p, 0)).toBe(true);
    expect(unlocked(p, 1)).toBe(false);
    p.stars[0] = 1;
    expect(unlocked(p, 1)).toBe(true);
    expect(unlocked(p, 2)).toBe(false);
  });
});
