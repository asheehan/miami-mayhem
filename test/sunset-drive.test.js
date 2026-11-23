import { describe, it, expect } from 'vitest';
import { STAGES, SCENERY, SETS, TRAFFIC } from '../src/games/sunset-drive/tracks.js';
import {
  buildTrack, trackFor, createRace, step, setSteer, project, cameraFor, segmentAt, roadHeightAt, starsFor, starTargets,
  cruiseTime, progressOf, makeRng, SEG_LEN, ROAD_HALF, LEAD_IN, RUN_OUT, MAX_SPEED, BOOST_SPEED, OFFROAD_SPEED, STEER_RATE,
  CENTRIFUGAL, X_LIMIT, RAIL_LIMIT, MIN_SPEED, BUMP_GRACE, COUNTDOWN, COIN_REACH, STAR_COINS, CAMERA_HEIGHT, CAMERA_DEPTH,
  PLAYER_Z, DRAW_DISTANCE, FINISH_SPEED,
} from '../src/games/sunset-drive/sim.js';
import { botSteer, makeRandomDriver } from '../src/games/sunset-drive/bot.js';
import { sanitize, loadProgress, saveProgress, recordStars, unlocked, firstOpen, SAVE_KEY } from '../src/games/sunset-drive/progress.js';

const DT = 1 / 60;
const tick = () => new Promise((r) => setImmediate(r));
const run = (s, secs) => {
  for (let t = 0; t < secs - 1e-9; t += DT) step(s, DT);
};
// A race already past the countdown, with no traffic unless asked for.
function racing(stage = 0, { traffic = false, seed = 3 } = {}) {
  const s = createRace(stage, seed);
  if (!traffic) s.traffic = [];
  run(s, COUNTDOWN + DT);
  expect(s.status).toBe('race');
  return s;
}
// Drives a whole stage with `driver(s)` steering every frame; gives up after `limit` race seconds.
async function drive(stage, seed, driver, limit = 400) {
  const s = createRace(stage, seed);
  let frames = 0;
  while (s.status !== 'done' && s.raceTime < limit) {
    setSteer(s, driver(s));
    step(s, DT);
    if (++frames % 1500 === 0) await tick();
  }
  return s;
}
// The first segment of the longest straight-and-level section with no rail.
function flatStraight(track) {
  const secs = [{ len: LEAD_IN }, ...track.stage.sections];
  let best = 1;
  secs.forEach((sec, i) => {
    if (i && !sec.curve && !sec.hill && !sec.rail && sec.len > secs[best].len) best = i;
  });
  return track.sectionStarts[best];
}

describe('tracks', () => {
  it('has at least six stages, each with its own look and only known scenery and traffic', () => {
    expect(STAGES.length).toBeGreaterThanOrEqual(6);
    expect(new Set(STAGES.map((s) => s.name)).size).toBe(STAGES.length);
    expect(new Set(STAGES.map((s) => s.sky.top)).size).toBe(STAGES.length);
    for (const st of STAGES) {
      for (const [k] of st.kinds) expect(TRAFFIC[k]).toBeDefined();
      for (const name of [st.left, st.right, ...st.sections.flatMap((x) => [x.left, x.right])].filter(Boolean)) {
        expect(SETS[name], name).toBeDefined();
      }
    }
    for (const set of Object.values(SETS)) for (const [k] of set.kinds) expect(SCENERY[k], k).toBeDefined();
  });

  it('builds the segments its sections ask for, plus a lead-in and a run-out past the finish', () => {
    for (let i = 0; i < STAGES.length; i++) {
      const t = buildTrack(STAGES[i]);
      const total = STAGES[i].sections.reduce((a, x) => a + x.len, 0);
      expect(t.finishSeg).toBe(LEAD_IN + total);
      expect(t.segs.length).toBe(t.finishSeg + RUN_OUT);
      expect(RUN_OUT).toBeGreaterThan(DRAW_DISTANCE);
      t.segs.forEach((seg, k) => expect(seg.i).toBe(k));
      // every stage has a finish banner on its finish segment
      expect(t.segs[t.finishSeg].sprites.some((sp) => sp.kind === 'finishBanner')).toBe(true);
      expect(t.finishZ).toBe(t.finishSeg * SEG_LEN);
    }
  });

  it('is the same every time it is built', () => {
    const a = buildTrack(STAGES[2]);
    const b = buildTrack(STAGES[2]);
    expect(a.coins.map((c) => [c.seg, c.x])).toEqual(b.coins.map((c) => [c.seg, c.x]));
    expect(a.segs.map((s) => s.sprites.length)).toEqual(b.segs.map((s) => s.sprites.length));
  });

  it('eases curves and hills in and out, with no sudden steps', () => {
    for (const st of STAGES) {
      const t = buildTrack(st);
      const maxCurve = Math.max(...st.sections.map((x) => Math.abs(x.curve)));
      for (let i = 1; i < t.segs.length; i++) {
        const a = t.segs[i - 1];
        const b = t.segs[i];
        expect(Math.abs(b.curve - a.curve)).toBeLessThan(maxCurve * 0.2 + 1e-9);
        expect(b.y1).toBeCloseTo(a.y2, 6); // the road is continuous
      }
      // every section starts and ends almost straight and level-ish in slope
      t.sectionStarts.forEach((s0, si) => {
        if (si === 0) return;
        const sec = st.sections[si - 1];
        const first = t.segs[s0];
        const last = t.segs[s0 + sec.len - 1];
        expect(Math.abs(first.curve)).toBeLessThan(Math.abs(sec.curve) * 0.2 + 1e-9);
        expect(Math.abs(last.curve)).toBeLessThan(Math.abs(sec.curve) * 0.2 + 1e-9);
        const slope = (seg) => seg.y2 - seg.y1;
        const mid = t.segs[s0 + Math.floor(sec.len / 2)];
        expect(Math.abs(slope(first))).toBeLessThanOrEqual(Math.abs(slope(mid)) + 1e-9);
        expect(Math.abs(slope(last))).toBeLessThanOrEqual(Math.abs(slope(mid)) + 1e-9);
      });
    }
  });

  it('lasts 60 to 90 seconds at cruising speed, later stages longer, curvier and busier', () => {
    const times = STAGES.map((_, i) => cruiseTime(trackFor(i)));
    for (const t of times) {
      expect(t).toBeGreaterThanOrEqual(60);
      expect(t).toBeLessThanOrEqual(90);
    }
    expect(times[STAGES.length - 1]).toBeGreaterThan(times[0]);
    const tightest = (st) => Math.max(...st.sections.map((x) => Math.abs(x.curve)));
    const hilliest = (st) => Math.max(...st.sections.map((x) => Math.abs(x.hill)));
    const last = STAGES[STAGES.length - 1];
    expect(tightest(last)).toBeGreaterThan(tightest(STAGES[0]));
    expect(hilliest(last)).toBeGreaterThan(hilliest(STAGES[0]));
    expect(last.traffic).toBeGreaterThan(STAGES[0].traffic);
    for (let i = 1; i < STAGES.length; i++) expect(STAGES[i].traffic).toBeGreaterThanOrEqual(STAGES[i - 1].traffic);
  });

  it('puts coin runs and boost pads on the road, inside the lanes', () => {
    for (let i = 0; i < STAGES.length; i++) {
      const t = trackFor(i);
      expect(t.coins.length).toBeGreaterThan(40);
      expect(t.pads.length).toBeGreaterThanOrEqual(2);
      for (const c of t.coins) {
        expect(Math.abs(c.x)).toBeLessThanOrEqual(0.7);
        expect(c.seg).toBeLessThan(t.finishSeg);
        expect(t.segs[c.seg].coins).toContain(c);
      }
    }
  });

  it('coins in a bend trace the inside line', () => {
    const t = trackFor(0);
    let checked = 0;
    for (const c of t.coins) {
      const seg = t.segs[c.seg];
      if (Math.abs(seg.curve) >= 1.5 && Math.abs(c.x) > 0.2 && !t.pads.some((p) => Math.abs(p.seg - c.seg) < 40)) {
        expect(Math.sign(c.x)).toBe(Math.sign(seg.curve));
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(10);
  });
});

describe('projection', () => {
  const view = { cx: 200, horizon: 300, k: 400 };
  const cam = { x: 0, y: CAMERA_HEIGHT, z: 0 };

  it('puts the road under the car at the car line, and further points higher and smaller', () => {
    const near = project(0, 0, PLAYER_Z, cam, view);
    expect(near.y).toBeCloseTo(view.horizon + view.k);
    expect(near.w).toBeCloseTo((view.k * ROAD_HALF) / CAMERA_HEIGHT);
    let prev = near;
    for (let z = PLAYER_Z + 500; z < 40000; z += 500) {
      const p = project(0, 0, z, cam, view);
      expect(p.y).toBeLessThan(prev.y);
      expect(p.y).toBeGreaterThan(view.horizon);
      expect(p.w).toBeLessThan(prev.w);
      expect(p.scale).toBeLessThan(prev.scale);
      prev = p;
    }
  });

  it('moves points right of the camera to the right, higher points up, and flags points behind it', () => {
    const p = project(1000, 0, 5000, cam, view);
    expect(p.x).toBeGreaterThan(view.cx);
    expect(project(0, 3000, 5000, cam, view).y).toBeLessThan(project(0, 0, 5000, cam, view).y);
    expect(project(0, 0, -10, cam, view).scale).toBe(0);
    expect(CAMERA_DEPTH).toBeGreaterThan(0);
  });

  it('the camera follows the car along and over the hills', () => {
    const s = racing(4);
    const c = cameraFor(s);
    expect(c.z).toBeCloseTo(s.z - PLAYER_Z);
    expect(c.y).toBeCloseTo(roadHeightAt(s.track, s.z) + CAMERA_HEIGHT);
    const hill = s.track.segs.find((seg) => seg.y2 > 1000);
    expect(roadHeightAt(s.track, hill.z + SEG_LEN)).toBeGreaterThan(1000);
  });
});

describe('driving', () => {
  it('waits for 3-2-1-GO, then speeds up by itself to cruising speed', () => {
    const s = createRace(0, 1);
    s.traffic = [];
    run(s, COUNTDOWN - 0.1);
    expect(s.status).toBe('count');
    expect(s.speed).toBe(0);
    expect(s.z).toBe(s.track.startZ);
    run(s, 0.2);
    expect(s.status).toBe('race');
    run(s, 6);
    expect(s.speed).toBeCloseTo(MAX_SPEED);
    expect(s.z).toBeGreaterThan(s.track.startZ);
  });

  it('steers left and right at the steering rate', () => {
    const s = racing(0);
    s.z = flatStraight(s.track) * SEG_LEN;
    s.speed = MAX_SPEED;
    setSteer(s, 1);
    run(s, 0.2);
    expect(s.x).toBeCloseTo(STEER_RATE * 0.2, 1);
    setSteer(s, -1);
    run(s, 0.4);
    expect(s.x).toBeLessThan(0);
    setSteer(s, 7);
    expect(s.steer).toBe(1);
    setSteer(s, NaN);
    expect(s.steer).toBe(0);
  });

  it('bends push the car toward the outside, more at speed, and steering can hold the line', () => {
    const t = trackFor(5);
    const bendSeg = t.segs.find((seg) => seg.curve >= 4 && t.segs[seg.i + 30]?.curve >= 4);
    const drift = (speed, steer = 0) => {
      const s = racing(5);
      s.z = bendSeg.z;
      s.speed = speed;
      setSteer(s, steer);
      step(s, 0.25);
      return s.x;
    };
    expect(drift(MAX_SPEED)).toBeLessThan(0); // a right bend pushes left
    expect(drift(MAX_SPEED)).toBeLessThan(drift(MAX_SPEED * 0.5));
    expect(Math.abs(drift(MAX_SPEED))).toBeCloseTo(bendSeg.curve * CENTRIFUGAL * 0.25, 1);
    const held = racing(5);
    held.z = bendSeg.z;
    held.speed = MAX_SPEED;
    for (let k = 0; k < 60; k++) {
      setSteer(held, botSteer(held));
      step(held, DT);
    }
    expect(Math.abs(held.x)).toBeLessThan(0.8);
  });

  it('the verge slows the car a lot, but it keeps rolling and can always get back', () => {
    const s = racing(0);
    s.z = flatStraight(s.track) * SEG_LEN;
    s.speed = MAX_SPEED;
    s.x = 1.6;
    setSteer(s, 0.3);
    run(s, 1.5);
    expect(s.offroad).toBe(true);
    expect(s.speed).toBeCloseTo(OFFROAD_SPEED, -1);
    expect(s.speed).toBeGreaterThan(0.3 * MAX_SPEED);
    // the car can't wander off forever
    setSteer(s, 1);
    run(s, 3);
    expect(s.x).toBeLessThanOrEqual(X_LIMIT);
    // with no finger down it eases back to the road edge
    setSteer(s, 0);
    run(s, 3);
    expect(Math.abs(s.x)).toBeLessThanOrEqual(1);
    run(s, 4);
    expect(s.speed).toBeCloseTo(MAX_SPEED, -2);
  });

  it('bridge railings keep the car on the road', () => {
    const s = racing(1);
    const bridge = s.track.segs.find((seg) => seg.rail && !seg.curve && s.track.segs[seg.i + 40]?.rail);
    s.z = bridge.z;
    s.speed = MAX_SPEED;
    setSteer(s, 1);
    run(s, 0.6);
    expect(s.x).toBeCloseTo(RAIL_LIMIT);
    expect(s.offroad).toBe(false);
    expect(s.scraping).toBe(true);
  });

  it('boost pads speed the car up for a while', () => {
    const s = racing(0);
    const pad = s.track.pads[0];
    s.z = pad.z - 1500;
    s.x = pad.x;
    s.speed = MAX_SPEED;
    run(s, 0.3);
    expect(s.boosts).toBe(1);
    expect(s.boostT).toBeGreaterThan(0);
    run(s, 0.6);
    expect(s.speed).toBeGreaterThan(MAX_SPEED * 1.15);
    expect(s.speed).toBeLessThanOrEqual(BOOST_SPEED);
    run(s, 5);
    expect(s.boostT).toBe(0);
    expect(s.speed).toBeCloseTo(MAX_SPEED, -2);
  });

  it('missing the pad does nothing', () => {
    const s = racing(0);
    const pad = s.track.pads[0];
    s.z = pad.z - 1500;
    s.x = pad.x + 0.62 * (pad.x > 0 ? -1 : 1);
    s.speed = MAX_SPEED;
    run(s, 0.3);
    expect(s.boosts).toBe(0);
  });
});

describe('coins and stars', () => {
  it('a coin is caught by driving through it, and only once', () => {
    const s = racing(0);
    const c = s.track.coins[0];
    s.z = c.z - 900;
    s.x = c.x + COIN_REACH * 0.8;
    s.speed = MAX_SPEED;
    run(s, 0.2);
    expect(s.got[c.id]).toBe(1);
    expect(s.coins).toBeGreaterThanOrEqual(1);
    const before = s.coins;
    s.z = c.z - 900;
    run(s, 0.2);
    expect(s.coins).toBe(before);
  });

  it('a coin a lane away is missed', () => {
    const s = racing(0);
    const c = s.track.coins[0];
    s.z = c.z - 900;
    s.x = c.x + 0.62;
    s.speed = MAX_SPEED;
    run(s, 0.12);
    expect(s.got[c.id]).toBe(0);
  });

  it('one star for finishing, more for coins, shown as targets on the bar', () => {
    expect(starsFor(0, 100)).toBe(1);
    expect(starsFor(49, 100)).toBe(1);
    expect(starsFor(50, 100)).toBe(2);
    expect(starsFor(79, 100)).toBe(2);
    expect(starsFor(80, 100)).toBe(3);
    expect(starsFor(100, 100)).toBe(3);
    expect(starTargets(100)).toEqual([50, 80]);
    expect(starTargets(141)).toEqual(STAR_COINS.map((f) => Math.ceil(141 * f)));
    expect(starsFor(starTargets(141)[1], 141)).toBe(3);
  });

  it('crossing the finish ends the race with the stars earned, and the car coasts on', () => {
    const s = racing(0);
    s.z = s.track.finishZ - 3000;
    s.speed = MAX_SPEED;
    s.coins = starTargets(s.total)[0];
    run(s, 1);
    expect(s.status).toBe('done');
    expect(s.stars).toBe(2);
    expect(progressOf(s)).toBe(1);
    run(s, 6);
    expect(s.speed).toBeCloseTo(FINISH_SPEED, -2);
    expect(s.z).toBeLessThan(s.track.segs.length * SEG_LEN);
  });
});

describe('traffic', () => {
  it('cars drive along their lanes slower than the player', () => {
    const s = createRace(2, 4);
    expect(s.traffic.length).toBeGreaterThan(10);
    const z0 = s.traffic.map((c) => c.z);
    run(s, COUNTDOWN + 2);
    s.traffic.forEach((c, i) => {
      expect(c.speed).toBeLessThan(MAX_SPEED * 0.6);
      expect(c.z).toBeGreaterThan(z0[i]);
    });
  });

  it('a bump boings: speed drops, the car wobbles and is pushed aside, the other car moves over', () => {
    const s = racing(0, { traffic: true });
    s.z = flatStraight(s.track) * SEG_LEN;
    s.speed = MAX_SPEED;
    s.x = 0.05;
    const car = s.traffic[0];
    car.z = s.z + 300;
    car.x = 0;
    car.targetX = 0;
    run(s, 0.1);
    expect(s.bumps).toBe(1);
    expect(s.speed).toBeLessThan(MAX_SPEED * 0.6);
    expect(s.speed).toBeGreaterThanOrEqual(MIN_SPEED);
    expect(s.spinT).toBeGreaterThan(0);
    expect(s.events).toContain('bump');
    expect(car.targetX).not.toBe(0);
    run(s, 0.5);
    expect(Math.abs(s.x - car.x)).toBeGreaterThan(0.3);
    // no second bump during the grace time even if a car is right there
    const other = s.traffic[1];
    other.z = s.z + 100;
    other.x = s.x;
    other.targetX = s.x;
    run(s, BUMP_GRACE - 0.7);
    expect(s.bumps).toBe(1);
  });

  it('never stops progress for good: a car parked in every lane is still passed', () => {
    const s = racing(0, { traffic: true });
    s.z = flatStraight(s.track) * SEG_LEN;
    s.speed = MAX_SPEED;
    s.traffic = [-0.62, 0, 0.62].map((x, id) => ({
      id, kind: 'bus', w: TRAFFIC.bus.w, lane: id, x, targetX: x, z: s.z + 2000, speed: 0.3 * MAX_SPEED, cruise: 0.3 * MAX_SPEED, wobbleT: -9, look: 0, phase: 0,
    }));
    run(s, 8);
    expect(s.traffic.every((c) => c.z < s.z)).toBe(true);
    expect(s.bumps).toBeLessThanOrEqual(3);
  });

  it('the same seed gives the same race, another seed a different one', () => {
    const a = createRace(3, 11);
    const b = createRace(3, 11);
    const c = createRace(3, 12);
    expect(a.traffic.map((x) => [x.kind, x.z, x.x])).toEqual(b.traffic.map((x) => [x.kind, x.z, x.x]));
    expect(a.traffic.map((x) => [x.kind, x.z, x.x])).not.toEqual(c.traffic.map((x) => [x.kind, x.z, x.x]));
    const steerA = makeRandomDriver(makeRng(1));
    const steerB = makeRandomDriver(makeRng(1));
    for (let k = 0; k < 900; k++) {
      setSteer(a, steerA(a));
      setSteer(b, steerB(b));
      step(a, DT);
      step(b, DT);
    }
    expect(a.z).toBe(b.z);
    expect(a.x).toBe(b.x);
    expect(a.coins).toBe(b.coins);
    expect(a.bumps).toBe(b.bumps);
  });
});

describe('every stage', () => {
  STAGES.forEach((st, i) => {
    it(`${i + 1} ${st.name}: a careful bot gets 3 stars, a hands-off and a random driver still finish`, async () => {
      const cruise = cruiseTime(trackFor(i));
      const bot = await drive(i, 100 + i, botSteer);
      expect(bot.status).toBe('done');
      expect(bot.stars).toBe(3);
      expect(bot.finishTime).toBeLessThan(cruise * 1.15);
      const idle = await drive(i, 200 + i, () => 0);
      expect(idle.status).toBe('done');
      expect(idle.finishTime).toBeLessThan(cruise * 1.6);
      const rnd = await drive(i, 300 + i, makeRandomDriver(makeRng(77 + i)));
      expect(rnd.status).toBe('done');
      expect(rnd.finishTime).toBeLessThan(cruise * 2.5);
    });
  });
});

describe('progress', () => {
  const memory = (init) => {
    const m = new Map(init ? [[SAVE_KEY, init]] : []);
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), m };
  };

  it('saves and loads stars per stage', () => {
    const store = memory();
    let p = loadProgress(store);
    expect(p).toEqual({ stars: STAGES.map(() => 0) });
    p = recordStars(p, 0, 2);
    p = recordStars(p, 0, 1); // keeps the best
    saveProgress(store, p);
    expect(JSON.parse(store.m.get(SAVE_KEY))).toEqual({ stars: [2, ...STAGES.slice(1).map(() => 0)] });
    expect(loadProgress(store).stars[0]).toBe(2);
  });

  it('shrugs off bad saved data', () => {
    for (const bad of ['not json', '{"stars":"lots"}', '{"stars":[9,-1,1.5,"2",null,3,3,3,3]}', 'null', '[]']) {
      const p = loadProgress(memory(bad));
      expect(p.stars.length).toBe(STAGES.length);
      for (const n of p.stars) expect([0, 1, 2, 3]).toContain(n);
    }
    expect(loadProgress(memory('{"stars":[9,-1,1.5,"2"]}')).stars.slice(0, 4)).toEqual([0, 0, 0, 2]);
    expect(sanitize(undefined).stars.every((n) => n === 0)).toBe(true);
    const broken = { getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); } };
    expect(loadProgress(broken).stars.length).toBe(STAGES.length);
    expect(() => saveProgress(broken, { stars: [] })).not.toThrow();
  });

  it('finishing a stage unlocks the next', () => {
    const p = sanitize({ stars: [1] });
    expect(unlocked(p, 0)).toBe(true);
    expect(unlocked(p, 1)).toBe(true);
    expect(unlocked(p, 2)).toBe(false);
    expect(firstOpen(p)).toBe(1);
    expect(firstOpen(sanitize({ stars: STAGES.map(() => 3) }))).toBe(0);
  });
});

describe('the road under the car', () => {
  it('segmentAt clamps to the track', () => {
    const t = trackFor(0);
    expect(segmentAt(t, -500).i).toBe(0);
    expect(segmentAt(t, 1e12).i).toBe(t.segs.length - 1);
  });
});
