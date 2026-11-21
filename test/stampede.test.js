import { describe, it, expect } from 'vitest';
import {
  generateTrack, bestCount, applyOp, hits, hammerDown, sawX, TRACK_HALF, PIT_GAP, SPEED, STAGE,
} from '../src/games/stampede/track.js';
import {
  createRun, step, steer, count, strikerState, crowdRadius, MAX_VISIBLE, FINALE_MIN,
  towerState, cannonState, finaleState, pickFinale, FINALES, FINALE_FULL,
} from '../src/games/stampede/sim.js';

const DT = 1 / 60;
const emptyTrack = (extra = {}) => ({ level: 0, gates: [], obstacles: [], finishZ: 1000, length: 1100, ...extra });
const pit = (z, c) => ({
  type: 'pit', z, z0: z - 1.1, z1: z + 1.1,
  holes: [[-TRACK_HALF, c - PIT_GAP / 2], [c + PIT_GAP / 2, TRACK_HALF]].filter(([a, b]) => b - a > 0.05),
});
// Run forward until the crowd's middle passes z.
function runTo(run, z) {
  for (let i = 0; i < 100000 && run.z < z && run.status === 'running'; i++) step(run, DT);
}

describe('gate maths', () => {
  it('adds, subtracts (never below zero) and multiplies', () => {
    expect(applyOp(7, { op: '+', n: 20 })).toBe(27);
    expect(applyOp(7, { op: '-', n: 5 })).toBe(2);
    expect(applyOp(7, { op: '-', n: 50 })).toBe(0);
    expect(applyOp(7, { op: 'x', n: 2 })).toBe(14);
  });
});

describe('generateTrack', () => {
  for (let level = 0; level < 12; level++) {
    it(`level ${level}: one x2 gate, 50+ people to gain, and obstacles between gate rows`, () => {
      const t = generateTrack(level);
      const all = t.gates.flatMap((g) => [g.left, g.right]);
      expect(all.filter((g) => g.op === 'x').length).toBe(1);
      const plus = t.gates.reduce((s, g) => s + Math.max(g.left.op === '+' ? g.left.n : 0, g.right.op === '+' ? g.right.n : 0), 0);
      expect(plus).toBeGreaterThanOrEqual(50);
      expect(bestCount(t)).toBeGreaterThanOrEqual(51);
      // never two bad gates side by side
      for (const g of t.gates) expect(g.left.op === '-' && g.right.op === '-').toBe(false);
      expect(t.obstacles.length).toBeGreaterThanOrEqual(t.gates.length);
      for (const ob of t.obstacles) expect(['pit', 'saw', 'hammer']).toContain(ob.type);
      // the first thing on the track is a gate, and gates are not inside obstacles
      expect(t.gates[0].z).toBeLessThan(t.obstacles[0].z0);
      for (const g of t.gates) for (const ob of t.obstacles) expect(g.z < ob.z0 - 5 || g.z > ob.z1 + 5).toBe(true);
      expect(t.finishZ).toBeGreaterThan(Math.max(...t.obstacles.map((o) => o.z1)));
    });
  }

  it('is the same every time for a level, so a retry is the same track', () => {
    expect(generateTrack(3)).toEqual(generateTrack(3));
  });

  it('a level takes roughly 30 to 50 seconds to run', () => {
    const secs = generateTrack(0).finishZ / SPEED;
    expect(secs).toBeGreaterThan(30);
    expect(secs).toBeLessThan(50);
  });
});

describe('obstacles', () => {
  it('a pit only catches people over a hole', () => {
    const ob = pit(50, 0);
    expect(hits(ob, 0, 50, 0)).toBe(false);
    expect(hits(ob, 0.7, 50, 0)).toBe(false);
    expect(hits(ob, 1.5, 50, 0)).toBe(true);
    expect(hits(ob, -3, 50, 0)).toBe(true);
    expect(hits(ob, -3, 45, 0)).toBe(false);
  });

  it('a saw catches people within its blade as they cross it', () => {
    const ob = { type: 'saw', z: 50, z0: 49.6, z1: 50.4, r: 1.15, cx: 0, amp: 3.6, speed: 2, phase: 0 };
    expect(sawX(ob, 0)).toBeCloseTo(0);
    expect(hits(ob, 0.5, 50, 0)).toBe(true);
    expect(hits(ob, 2, 50, 0)).toBe(false);
    expect(hits(ob, 0.5, 51, 0)).toBe(false);
  });

  it('a hammer only catches people under it while it is down', () => {
    const ob = { type: 'hammer', z: 50, z0: 48.8, z1: 51.2, x: 0, w: 5.5, d: 2.4, period: 1.5, phase: 0 };
    expect(hammerDown(ob, 0.2)).toBe(false);
    expect(hammerDown(ob, 1.3)).toBe(true);
    expect(hits(ob, 1, 50, 1.3)).toBe(true);
    expect(hits(ob, 1, 50, 0.2)).toBe(false);
    expect(hits(ob, 4, 50, 1.3)).toBe(false);
  });
});

describe('a run', () => {
  it('starts with one runner and moves forward', () => {
    const run = createRun(emptyTrack());
    expect(count(run)).toBe(1);
    step(run, 0.5);
    expect(run.z).toBeCloseTo(SPEED * 0.5);
  });

  it('takes the gate on the side the crowd is on', () => {
    const gates = [{ z: 10, left: { op: '+', n: 20 }, right: { op: '-', n: 5 } }];
    const left = createRun(emptyTrack({ gates }));
    steer(left, -2);
    runTo(left, 12);
    expect(count(left)).toBe(21);
    expect(left.taken).toEqual(['left']);

    const right = createRun(emptyTrack({ gates }), 8);
    steer(right, 2);
    runTo(right, 12);
    expect(count(right)).toBe(3);
  });

  it('a minus gate that takes everyone ends the run', () => {
    const gates = [{ z: 10, left: { op: '-', n: 5 }, right: { op: '-', n: 5 } }];
    const run = createRun(emptyTrack({ gates }), 3);
    runTo(run, 30);
    expect(run.status).toBe('lost');
    expect(count(run)).toBe(0);
  });

  it('doubles the crowd at a x2 gate and keeps counting past the number drawn', () => {
    const gates = [{ z: 10, left: { op: 'x', n: 2 }, right: { op: 'x', n: 2 } }];
    const run = createRun(emptyTrack({ gates }), 100);
    runTo(run, 12);
    expect(count(run)).toBe(200);
    expect(run.people.length).toBe(MAX_VISIBLE);
    expect(run.reserve).toBe(50);
  });

  it('keeps the crowd on the boardwalk however hard it is steered', () => {
    const run = createRun(emptyTrack(), 30);
    for (let i = 0; i < 120; i++) {
      steer(run, 1);
      step(run, DT);
    }
    for (const p of run.people) expect(Math.abs(p.x)).toBeLessThanOrEqual(TRACK_HALF);
  });

  it('a single runner gets through a pit gap untouched', () => {
    const run = createRun(emptyTrack({ obstacles: [pit(40, 2)] }));
    steer(run, 2);
    runTo(run, 50);
    expect(count(run)).toBe(1);
    expect(run.status).toBe('running');
  });

  it('a runner over the hole falls in and the run is lost', () => {
    const run = createRun(emptyTrack({ obstacles: [pit(40, 2)] }));
    steer(run, -3);
    runTo(run, 50);
    expect(run.status).toBe('lost');
    expect(run.fallen[0].kind).toBe('pit');
  });

  for (const c of [-2, 0, 2]) {
    it(`a crowd of 40 loses at least half at a pit, even steering straight at the gap (gap at ${c})`, () => {
      let best = 0;
      for (let aim = -5; aim <= 5; aim += 0.5) {
        const run = createRun(emptyTrack({ obstacles: [pit(60, c)] }), 40);
        steer(run, aim);
        runTo(run, 75);
        best = Math.max(best, count(run));
      }
      expect(best).toBeLessThanOrEqual(20);
      expect(best).toBeGreaterThan(5);
    });
  }

  it('people lost from the drawn crowd are replaced from the reserve, and the count drops by one each', () => {
    const run = createRun(emptyTrack({ obstacles: [pit(60, 0)] }), 170);
    runTo(run, 75);
    const lost = 170 - count(run);
    expect(lost).toBeGreaterThan(20);
    expect(run.people.length + run.reserve).toBe(count(run));
  });

  it('crowd radius grows with the crowd', () => {
    expect(crowdRadius(40)).toBeGreaterThan(crowdRadius(12));
    expect(crowdRadius(40)).toBeGreaterThan(PIT_GAP);
  });
});

describe('the finish', () => {
  const finishWith = (n) => {
    const run = createRun(emptyTrack({ finishZ: 20 }), n);
    for (let i = 0; i < 3000 && run.status === 'running'; i++) step(run, DT);
    return run;
  };

  it(`finishing with ${FINALE_MIN} or fewer is a plain finish`, () => {
    const run = finishWith(FINALE_MIN);
    expect(run.status).toBe('finished');
    expect(run.finalCount).toBe(FINALE_MIN);
  });

  it('finishing with more starts the finale, and the crowd jogs to the button and stops', () => {
    const run = finishWith(FINALE_MIN + 1);
    expect(run.status).toBe('finale');
    for (let i = 0; i < 600; i++) step(run, DT);
    expect(run.z).toBeCloseTo(20 + STAGE, 1);
  });

  it('the striker score counts up to ten per person, and the puck height follows the crowd size', () => {
    const small = finishWith(15);
    const big = finishWith(60);
    const states = [];
    for (let i = 0; i < 60 * 9; i++) {
      step(small, DT);
      step(big, DT);
      states.push(strikerState(small).score);
    }
    expect(states[0]).toBe(0);
    for (let i = 1; i < states.length; i++) expect(states[i]).toBeGreaterThanOrEqual(states[i - 1]);
    const s = strikerState(small);
    const b = strikerState(big);
    expect(s.score).toBe(150);
    expect(s.done).toBe(true);
    expect(s.bell).toBe(false);
    expect(s.puck).toBeCloseTo(0.25);
    expect(b.score).toBe(600);
    expect(b.puck).toBeCloseTo(1);
    expect(b.bell).toBe(true);
  });

  it('the finale is picked at random when the run is created, or forced', () => {
    const track = emptyTrack({ finishZ: 20 });
    expect(createRun(track, 1, { random: () => 0 }).finaleKind).toBe('striker');
    expect(createRun(track, 1, { random: () => 0.5 }).finaleKind).toBe('tower');
    expect(createRun(track, 1, { random: () => 0.999 }).finaleKind).toBe('cannon');
    expect(createRun(track, 1, { random: () => 0, finale: 'cannon' }).finaleKind).toBe('cannon');
    expect(createRun(track, 1, { random: () => 0.5, finale: 'nonsense' }).finaleKind).toBe('tower');
    expect(pickFinale(() => 1)).toBe('cannon');
    const seen = new Set();
    for (let i = 0; i < 200; i++) seen.add(createRun(track).finaleKind);
    expect([...seen].sort()).toEqual([...FINALES].sort());
  });
});

describe('every finale', () => {
  const finishWith = (n, finale) => {
    const run = createRun(emptyTrack({ finishZ: 20 }), n, { finale });
    for (let i = 0; i < 3000 && run.status === 'running'; i++) step(run, DT);
    return run;
  };
  // Play the finale out, collecting its state every frame.
  const playOut = (n, finale) => {
    const run = finishWith(n, finale);
    expect(run.status).toBe('finale');
    expect(run.finaleKind).toBe(finale);
    const states = [];
    for (let i = 0; i < 60 * 12; i++) {
      states.push({ t: run.endTime, ...finaleState(run) });
      step(run, DT);
    }
    return states;
  };
  const sizes = [13, 30, 59, 60, 150, 400];

  for (const finale of FINALES) {
    describe(finale, () => {
      for (const n of sizes) {
        it(`with ${n}: the score climbs to ten per runner and it ends in 5 to 9 seconds`, () => {
          const states = playOut(n, finale);
          expect(states[0].score).toBe(0);
          for (let i = 1; i < states.length; i++) expect(states[i].score).toBeGreaterThanOrEqual(states[i - 1].score);
          const last = states[states.length - 1];
          expect(last.score).toBe(n * 10);
          expect(last.total).toBe(n * 10);
          expect(last.done).toBe(true);
          const doneAt = states.find((s) => s.done).t;
          expect(doneAt).toBeGreaterThan(5);
          expect(doneAt).toBeLessThan(9);
          // the score is complete by the time the buttons show
          expect(states.find((s) => s.done).score).toBe(n * 10);
          expect(last.celebrate).toBe(n >= FINALE_FULL);
          // nobody celebrates before the end of the show
          expect(states.some((s) => s.celebrate && s.score < s.total)).toBe(false);
        });
      }
    });
  }

  const atEnd = (n, finale) => {
    const states = playOut(n, finale);
    return states[states.length - 1];
  };

  it('the human tower grows taller with more runners, and 60 reaches the star', () => {
    const h = [13, 30, 59, 60, 150].map((n) => atEnd(n, 'tower'));
    for (let i = 1; i < h.length; i++) expect(h[i].height).toBeGreaterThanOrEqual(h[i - 1].height);
    expect(h[0].height).toBeLessThan(h[1].height);
    expect(h[1].height).toBeLessThan(h[2].height);
    expect(h[2].height).toBeLessThan(1);
    expect(h[3].height).toBe(1);
    expect(h[4].height).toBe(1);
    expect(h[2].star).toBe(false);
    expect(h[3].star).toBe(true);
    // every layer has someone in it
    for (const [n, s] of [[13, h[0]], [30, h[1]], [60, h[3]]]) expect(s.layers).toBeLessThanOrEqual(n);
  });

  it('the human tower builds from the bottom up and never shrinks', () => {
    const states = playOut(45, 'tower');
    for (let i = 1; i < states.length; i++) expect(states[i].built).toBeGreaterThanOrEqual(states[i - 1].built);
    expect(states[states.length - 1].built).toBe(states[0].layers);
  });

  it('the cannon fires them further with more runners, and 60 reaches the target', () => {
    const c = [13, 30, 59, 60, 150].map((n) => atEnd(n, 'cannon'));
    expect(c[0].distance).toBeLessThan(c[1].distance);
    expect(c[1].distance).toBeLessThan(c[2].distance);
    expect(c[2].distance).toBeLessThan(c[3].distance);
    expect(c[3].distance).toBe(c[4].distance);
    expect(c[2].hit).toBe(false);
    expect(c[3].hit).toBe(true);
  });

  it('the cannon loads before it fires, and the crowd flies forward only after firing', () => {
    const states = playOut(40, 'cannon');
    const fire = states.findIndex((s) => s.fired);
    expect(fire).toBeGreaterThan(0);
    expect(states[fire - 1].load).toBe(1);
    for (let i = 0; i < fire; i++) expect(states[i].distance).toBe(0);
    for (let i = 1; i < states.length; i++) expect(states[i].distance).toBeGreaterThanOrEqual(states[i - 1].distance);
  });

  it('finaleState follows the run\'s finale', () => {
    const run = finishWith(20, 'tower');
    expect(finaleState(run)).toEqual(towerState(run));
    run.finaleKind = 'cannon';
    expect(finaleState(run)).toEqual(cannonState(run));
    run.finaleKind = 'striker';
    expect(finaleState(run)).toEqual(strikerState(run));
  });
});
