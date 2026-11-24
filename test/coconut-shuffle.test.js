import { describe, it, expect } from 'vitest';
import { LEVELS, difficulty, EASY } from '../src/games/coconut-shuffle/levels.js';
import {
  generateShuffle, applyStep, finalSlot, answerShell, timeline, shufflePoses, slotPositions, pairPos, arcDepth,
  createGame, step, tapShell, peek, canPeek, poses, starsFor, streakSpec, project, shellAt, parseProgress,
  serializeProgress, unlocked, streakUnlocked, record, totalStars, isOpen, SKINS, CRITTERS,
  SHELL_RX, SHELL_RZ, ROUNDS, DRUM, WRONG_SECOND, PEEK_TIME, revealLength,
} from '../src/games/coconut-shuffle/sim.js';

const SEEDS = [1, 2, 3, 7, 42, 99, 1234, 98765];
const real = (sh) => sh.steps.filter((s) => s.kind === 'swap' || s.kind === 'double' || s.kind === 'spin');

// Run a game until its round reaches a phase (or give up).
function until(g, cond, secs = 120) {
  for (let t = 0; t < secs && !cond(g); t += 1 / 60) step(g, 1 / 60);
  return cond(g);
}
const toChoose = (g) => until(g, (q) => q.status === 'done' || q.round.phase === 'choose');
const finishReveal = (g) => until(g, (q) => q.status === 'done' || q.round.phase !== 'reveal');

// The slot of a shell, tracked by hand: follow it through each step without applyStep.
function trackByHand(sh, shell) {
  let slot = sh.orders[0].indexOf(shell);
  const n = sh.n;
  for (const s of sh.steps) {
    if (s.kind === 'swap' || s.kind === 'double') {
      for (const [a, b] of s.pairs) {
        if (slot === a) slot = b;
        else if (slot === b) slot = a;
      }
    } else if (s.kind === 'spin') slot = (slot + s.k + n) % n;
  }
  return slot;
}

// Do two shell footprints (axis-aligned ellipses of the same size) overlap?
const overlap = (p, q, margin = 1) => Math.hypot((p.x - q.x) / SHELL_RX, (p.z - q.z) / SHELL_RZ) < 2 * margin;

describe('the shuffle generator', () => {
  it('is deterministic per seed and differs between seeds', () => {
    for (const L of LEVELS) {
      const a = generateShuffle(L, 5);
      const b = generateShuffle(L, 5);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    }
    const sigs = new Set(SEEDS.map((s) => JSON.stringify(generateShuffle(LEVELS[6], s).steps)));
    expect(sigs.size).toBeGreaterThan(SEEDS.length - 2);
  });

  it('makes the right number of swaps, plus the fake-outs and hops asked for', () => {
    for (const L of LEVELS) {
      for (const seed of SEEDS) {
        const sh = generateShuffle(L, seed);
        expect(real(sh).length, L.name).toBe(L.swaps);
        expect(sh.steps.filter((s) => s.kind === 'fake').length).toBe(L.fakes || 0);
        expect(sh.steps.filter((s) => s.kind === 'hop').length).toBe(L.decoy || 0);
        expect(sh.steps.filter((s) => s.kind === 'double').length).toBe(L.ring ? 0 : L.doubles || 0);
        expect(sh.steps.filter((s) => s.kind === 'spin').length).toBe(L.ring ? L.spins : 0);
        expect(sh.steps.filter((s) => s.leaf).length).toBe(L.leaf ? 1 : 0);
        expect(['swap', 'double', 'spin'].includes(sh.steps[0].kind) || sh.steps[0].kind === 'hop').toBe(true);
      }
    }
  });

  it('only makes valid swaps: distinct slots in range, within reach, double pairs side by side and apart', () => {
    for (const L of LEVELS) {
      for (const seed of SEEDS) {
        const sh = generateShuffle(L, seed);
        const n = L.shells;
        for (const s of sh.steps) {
          if (!s.pairs) continue;
          const used = new Set();
          for (const [a, b, front] of s.pairs) {
            expect(a).not.toBe(b);
            for (const v of [a, b]) {
              expect(v >= 0 && v < n).toBe(true);
              expect(used.has(v)).toBe(false);
              used.add(v);
            }
            expect([a, b]).toContain(front);
            if (L.ring) expect(Math.abs(a - b) === 1 || Math.abs(a - b) === n - 1).toBe(true);
            else expect(Math.abs(a - b)).toBeLessThanOrEqual(L.reach ?? n - 1);
          }
          if (s.kind === 'double') {
            const [[a, b], [c, d]] = s.pairs;
            expect(Math.max(a, b)).toBeLessThan(Math.min(c, d)); // never interleaved
          }
          if (s.kind === 'spin') expect([1, -1]).toContain(s.k);
        }
        // each step's order is a permutation
        for (const o of sh.orders) expect([...o].sort()).toEqual([...Array(n).keys()]);
      }
    }
  });

  it('the critter ends where tracking each swap by hand says', () => {
    for (const L of LEVELS) {
      for (const seed of SEEDS) {
        const sh = generateShuffle(L, seed);
        expect(finalSlot(sh, sh.target)).toBe(trackByHand(sh, sh.target));
        if (sh.second !== null) expect(finalSlot(sh, sh.second)).toBe(trackByHand(sh, sh.second));
        // and applyStep agrees with the stored orders
        let o = sh.orders[0];
        sh.steps.forEach((s, i) => {
          o = applyStep(o, s);
          expect(o).toEqual(sh.orders[i + 1]);
        });
      }
    }
  });

  it('the critter usually moves: most rounds it does not end where it started', () => {
    let moved = 0;
    let total = 0;
    for (const L of LEVELS.slice(0, 5)) {
      for (let seed = 1; seed <= 40; seed++) {
        const sh = generateShuffle(L, seed);
        total++;
        if (finalSlot(sh, sh.target) !== sh.orders[0].indexOf(sh.target)) moved++;
      }
    }
    expect(moved / total).toBeGreaterThan(0.5);
  });
});

describe('shell motion during the shuffle', () => {
  it('a swap runs along an arc: one shell passes in front, the other behind, both end in each other’s place', () => {
    const slots = slotPositions(3);
    const D = arcDepth(0, 1, 3, false);
    const [a0, b0] = pairPos(slots[0], slots[1], true, D, 0);
    const [a1, b1] = pairPos(slots[0], slots[1], true, D, Math.PI);
    const [am, bm] = pairPos(slots[0], slots[1], true, D, Math.PI / 2);
    expect(a0.x).toBeCloseTo(slots[0].x);
    expect(b0.x).toBeCloseTo(slots[1].x);
    expect(a1.x).toBeCloseTo(slots[1].x);
    expect(b1.x).toBeCloseTo(slots[0].x);
    expect(am.z).toBeCloseTo(D); // in front
    expect(bm.z).toBeCloseTo(-D); // behind
    const [am2] = pairPos(slots[0], slots[1], false, D, Math.PI / 2);
    expect(am2.z).toBeCloseTo(-D);
  });

  it('positions are continuous: no shell ever jumps between frames', () => {
    for (const L of LEVELS) {
      for (const seed of [1, 42]) {
        const sh = generateShuffle(L, seed);
        const tl = timeline(sh, L);
        const dt = 1 / 240;
        let prev = shufflePoses(sh, tl, 0).shells;
        for (let t = dt; t <= tl.total; t += dt) {
          const cur = shufflePoses(sh, tl, t).shells;
          for (let id = 0; id < sh.n; id++) {
            const jump = Math.hypot(cur[id].x - prev[id].x, cur[id].z - prev[id].z);
            // the fastest move covers well under 10 units in 1/240 s
            expect(jump, `${L.name} t=${t.toFixed(3)} shell ${id}`).toBeLessThan(10);
          }
          prev = cur;
        }
      }
    }
  });

  it('shells never touch while moving, and sit on their own distinct slots at rest', () => {
    for (const L of LEVELS) {
      for (const seed of [1, 7, 42, 1234]) {
        const sh = generateShuffle(L, seed);
        const tl = timeline(sh, L);
        const slots = slotPositions(sh.n, sh.ring);
        for (let t = 0; t <= tl.total; t += 1 / 120) {
          const ps = shufflePoses(sh, tl, t).shells;
          for (let i = 0; i < sh.n; i++) {
            for (let j = i + 1; j < sh.n; j++) {
              expect(overlap(ps[i], ps[j]), `${L.name} seed ${seed} t=${t.toFixed(3)} shells ${i},${j}`).toBe(false);
            }
          }
        }
        // between steps every shell is exactly on a slot, one shell per slot
        for (const e of tl.steps) {
          const ps = shufflePoses(sh, tl, e.t1 + 1e-6).shells;
          const at = ps.map((p) => slots.findIndex((q) => Math.hypot(p.x - q.x, p.z - q.z) < 1e-6));
          expect(at.every((k) => k >= 0)).toBe(true);
          expect(new Set(at).size).toBe(sh.n);
          sh.orders[e.i + 1].forEach((id, j) => expect(at[id]).toBe(j));
        }
      }
    }
  });

  it('rest slots are far enough apart that a tap can never be ambiguous', () => {
    for (const n of [3, 4, 5]) {
      for (const ring of [false, true]) {
        const s = slotPositions(n, ring);
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) expect(overlap(s[i], s[j], 1.15)).toBe(false);
      }
    }
  });

  it('timeline: steps in order, with gaps, ending after the last step', () => {
    for (const L of LEVELS) {
      const sh = generateShuffle(L, 3);
      const tl = timeline(sh, L);
      for (let i = 1; i < tl.steps.length; i++) expect(tl.steps[i].t0).toBeGreaterThan(tl.steps[i - 1].t1);
      expect(tl.total).toBeGreaterThan(tl.steps[tl.steps.length - 1].t1);
    }
  });
});

describe('twists', () => {
  const find = (pred) => LEVELS.find(pred);

  it('fake-out: the two shells start to swap and come back; nothing changes', () => {
    const L = find((l) => l.fakes);
    const sh = generateShuffle(L, 11);
    const tl = timeline(sh, L);
    const i = sh.steps.findIndex((s) => s.kind === 'fake');
    const e = tl.steps[i];
    expect(sh.orders[i + 1]).toEqual(sh.orders[i]);
    const [a, b] = sh.steps[i].pairs[0];
    const ida = sh.orders[i][a];
    const before = shufflePoses(sh, tl, e.t0 - 1e-6).shells[ida];
    const mid = shufflePoses(sh, tl, (e.t0 + e.t1) / 2).shells[ida];
    const after = shufflePoses(sh, tl, e.t1 + 1e-6).shells[ida];
    expect(Math.hypot(mid.x - before.x, mid.z - before.z)).toBeGreaterThan(20); // it really moved
    expect(after.x).toBeCloseTo(before.x);
    expect(after.z).toBeCloseTo(before.z);
    expect(b).not.toBe(a);
  });

  it('decoy: runs in from the side, hops only between shells with nothing under them, and is visible while moving', () => {
    const L = find((l) => l.decoy && !l.leaf);
    for (const seed of SEEDS) {
      const sh = generateShuffle(L, seed);
      const tl = timeline(sh, L);
      const hops = sh.steps.map((s, i) => [s, i]).filter(([s]) => s.kind === 'hop');
      expect(hops[0][0].from).toBe(-1);
      expect(hops[1][0].from).toBeGreaterThanOrEqual(0);
      for (const [s, i] of hops) {
        const tgt = sh.orders[i].indexOf(sh.target);
        expect(s.to).not.toBe(tgt);
        expect(s.to).not.toBe(s.from);
        const e = tl.steps[i];
        const p = shufflePoses(sh, tl, (e.t0 + e.t1) / 2);
        expect(p.decoy).not.toBeNull();
        expect(p.decoy.z).toBeGreaterThan(0); // runs round the front
      }
      // the decoy is never under the critter's shell
      sh.decoys.forEach((d) => expect(d).not.toBe(sh.target));
      expect(sh.decoys[sh.decoys.length - 1]).not.toBeNull();
    }
  });

  it('decoy: tapping its shell is wrong, and it shows the blue crab', () => {
    const L = find((l) => l.decoy && !l.leaf);
    const g = createGame({ mode: 'level', spec: L, seed: 4 });
    toChoose(g);
    const d = g.round.sh.decoys[g.round.sh.decoys.length - 1];
    expect(tapShell(g, d)).toBe(true);
    expect(g.round.correct).toBe(false);
    until(g, (q) => q.round.t > DRUM + 0.4);
    const ps = poses(g);
    const crab = ps.critters.find((c) => c.who === 'decoy');
    expect(crab.shell).toBe(d);
    expect(ps.shells[d].lift).toBeGreaterThan(0.5);
  });

  it('ring: shells sit on an oval, spin together without changing the order round the ring', () => {
    const L = find((l) => l.ring);
    const sh = generateShuffle(L, 8);
    const i = sh.steps.findIndex((s) => s.kind === 'spin');
    const s = sh.steps[i];
    const before = sh.orders[i];
    const after = sh.orders[i + 1];
    for (let j = 0; j < L.shells; j++) expect(after[(j + s.k + L.shells) % L.shells]).toBe(before[j]);
    const slots = slotPositions(L.shells, true);
    expect(new Set(slots.map((p) => Math.round(p.z))).size).toBeGreaterThan(2); // some at the back, some at the front
  });

  it('palm leaf: covers only during its swap, which moves the middle shell', () => {
    const L = find((l) => l.leaf && !l.decoy);
    for (const seed of SEEDS) {
      const sh = generateShuffle(L, seed);
      const tl = timeline(sh, L);
      const i = sh.steps.findIndex((s) => s.leaf);
      const s = sh.steps[i];
      expect(s.kind).toBe('swap');
      expect(s.pairs[0].slice(0, 2)).toContain(Math.floor(L.shells / 2));
      const e = tl.steps[i];
      expect(shufflePoses(sh, tl, (e.t0 + e.t1) / 2).leaf).toBe(1);
      expect(shufflePoses(sh, tl, 0).leaf).toBe(0);
      expect(shufflePoses(sh, tl, tl.total).leaf).toBe(0);
      // the shells under it still move truly (continuity is checked for every level above)
      const mid = shufflePoses(sh, tl, (e.t0 + e.t1) / 2).shells;
      expect(mid.some((p) => p.moving)).toBe(true);
    }
  });

  it('two critters: both shown, one asked for; only the asked one is right', () => {
    const L = find((l) => l.two);
    const asks = new Set();
    for (const seed of SEEDS) {
      const sh = generateShuffle(L, seed);
      expect(sh.second).not.toBeNull();
      expect(sh.second).not.toBe(sh.target);
      asks.add(sh.ask);
    }
    expect(asks).toEqual(new Set(['main', 'second']));
    const g = createGame({ mode: 'level', spec: L, seed: 9 });
    expect(poses(g).critters.filter((c) => c.who !== 'decoy').length).toBe(2);
    toChoose(g);
    const sh = g.round.sh;
    const other = sh.ask === 'main' ? sh.second : sh.target;
    tapShell(g, other);
    expect(g.round.correct).toBe(false);
  });

  it('double swaps: two pairs move at once', () => {
    const L = find((l) => l.doubles);
    const sh = generateShuffle(L, 3);
    const tl = timeline(sh, L);
    const i = sh.steps.findIndex((s) => s.kind === 'double');
    const e = tl.steps[i];
    const moving = shufflePoses(sh, tl, (e.t0 + e.t1) / 2).shells.filter((p) => p.moving);
    expect(moving.length).toBe(4);
  });
});

describe('rounds: taps, reveal, scoring', () => {
  const L = LEVELS[0];

  it('a round shows the critter, drops the shells, shuffles, then waits for a tap', () => {
    const g = createGame({ mode: 'level', spec: L, seed: 1 });
    expect(g.round.phase).toBe('show');
    step(g, 0.6);
    const p = poses(g);
    expect(p.shells.every((s) => s.lift > 0.9)).toBe(true);
    expect(p.critters[0].out).toBe(1);
    until(g, (q) => q.round.phase === 'shuffle');
    expect(poses(g).shells.every((s) => s.lift === 0)).toBe(true);
    toChoose(g);
    expect(g.round.phase).toBe('choose');
    step(g, 30); // it waits as long as it takes
    expect(g.round.phase).toBe('choose');
  });

  it('taps are ignored while showing and shuffling', () => {
    const g = createGame({ mode: 'level', spec: L, seed: 1 });
    expect(tapShell(g, 0)).toBe(false);
    until(g, (q) => q.round.phase === 'shuffle');
    step(g, 1);
    expect(tapShell(g, g.round.sh.target)).toBe(false);
    expect(g.results).toEqual([]);
    expect(g.ignoredAt).toBeCloseTo(g.time);
    expect(g.events.some((e) => e.type === 'ignored')).toBe(true);
  });

  it('the right shell: lifts, critter dances, scores', () => {
    const g = createGame({ mode: 'level', spec: L, seed: 1 });
    toChoose(g);
    const ans = answerShell(g.round.sh);
    expect(tapShell(g, ans)).toBe(true);
    expect(tapShell(g, ans)).toBe(false); // only one tap per round
    expect(g.right).toBe(1);
    until(g, (q) => q.round.t > DRUM + 0.5);
    const p = poses(g);
    expect(p.shells[ans].lift).toBeGreaterThan(0.9);
    expect(p.critters[0].mood).toBe('dance');
    expect(g.events.some((e) => e.type === 'right')).toBe(true);
  });

  it('a wrong shell: lifts empty, then the right one lifts to show where it was; no score', () => {
    const g = createGame({ mode: 'level', spec: L, seed: 1 });
    toChoose(g);
    const ans = answerShell(g.round.sh);
    const wrong = (ans + 1) % 3;
    tapShell(g, wrong);
    expect(g.right).toBe(0);
    expect(g.results).toEqual([false]);
    until(g, (q) => q.round.t > DRUM + 0.4);
    let p = poses(g);
    expect(p.shells[wrong].lift).toBeGreaterThan(0.9);
    expect(p.shells[ans].lift).toBe(0);
    until(g, (q) => q.round.t > DRUM + WRONG_SECOND + 0.4);
    p = poses(g);
    expect(p.shells[ans].lift).toBeGreaterThan(0.9);
    expect(g.events.some((e) => e.type === 'nope')).toBe(true);
    expect(g.events.some((e) => e.type === 'there')).toBe(true);
  });

  it('the critter is under the shell the player sees it go to', () => {
    // the shell drawn where the critter is at the end is the answer
    for (const spec of LEVELS) {
      const g = createGame({ mode: 'level', spec, seed: 21 });
      toChoose(g);
      const p = poses(g);
      const main = p.critters.find((c) => c.who === (g.round.sh.ask === 'second' ? 'second' : 'main'));
      expect(main.shell).toBe(answerShell(g.round.sh));
      expect(main.x).toBeCloseTo(p.shells[main.shell].x);
    }
  });

  it('a tap on the screen finds the shell drawn there', () => {
    const g = createGame({ mode: 'level', spec: LEVELS[7], seed: 2 });
    toChoose(g);
    const view = { cx: 400, cy: 500, s: 1.8 };
    const p = poses(g);
    for (const s of p.shells) {
      const q = project(view, s.x, s.z);
      expect(shellAt(g, view, q.X, q.Y - 20)).toBe(s.id);
    }
    expect(shellAt(g, view, 5, 5)).toBeNull();
  });

  it('five rounds make a level; stars from how many were right', () => {
    expect(starsFor(5)).toBe(3);
    expect(starsFor(4)).toBe(2);
    expect(starsFor(3)).toBe(1);
    expect(starsFor(2)).toBe(0);
    expect(starsFor(0)).toBe(0);
    for (const rightCount of [5, 4, 3, 2]) {
      const g = createGame({ mode: 'level', spec: L, seed: 5 });
      for (let r = 0; r < ROUNDS; r++) {
        toChoose(g);
        const ans = answerShell(g.round.sh);
        tapShell(g, r < rightCount ? ans : (ans + 1) % 3);
        finishReveal(g);
      }
      expect(g.status).toBe('done');
      expect(g.right).toBe(rightCount);
      expect(g.stars).toBe(starsFor(rightCount));
      expect(g.results.length).toBe(ROUNDS);
    }
  });

  it('every round in a level is a fresh shuffle', () => {
    const g = createGame({ mode: 'level', spec: LEVELS[4], seed: 5 });
    const seen = new Set();
    for (let r = 0; r < ROUNDS; r++) {
      seen.add(JSON.stringify(g.round.sh.steps));
      toChoose(g);
      tapShell(g, 0);
      finishReveal(g);
    }
    expect(seen.size).toBe(ROUNDS);
  });

  it('the peek hint wobbles the right shell, once per level, only while choosing', () => {
    const g = createGame({ mode: 'level', spec: L, seed: 1 });
    expect(peek(g)).toBe(false);
    toChoose(g);
    expect(canPeek(g)).toBe(true);
    expect(peek(g)).toBe(true);
    step(g, 0.1);
    const ans = answerShell(g.round.sh);
    const p = poses(g);
    expect(Math.abs(p.shells[ans].wobble)).toBeGreaterThan(0);
    p.shells.filter((s) => s.id !== ans).forEach((s) => expect(s.wobble).toBe(0));
    step(g, PEEK_TIME);
    expect(poses(g).shells[ans].wobble).toBe(0);
    tapShell(g, ans);
    finishReveal(g);
    toChoose(g);
    expect(canPeek(g)).toBe(false);
    expect(peek(g)).toBe(false);
  });

  it('the same seed plays the same game', () => {
    const play = (seed) => {
      const g = createGame({ mode: 'level', spec: LEVELS[9], seed });
      const trace = [];
      for (let r = 0; r < ROUNDS; r++) {
        toChoose(g);
        trace.push(answerShell(g.round.sh), JSON.stringify(g.round.sh.steps));
        tapShell(g, 1);
        finishReveal(g);
      }
      return trace.join('|');
    };
    expect(play(3)).toBe(play(3));
    expect(play(3)).not.toBe(play(4));
  });
});

describe('streak mode', () => {
  it('each right answer turns it up a notch; it is endless', () => {
    for (let k = 0; k < 40; k++) {
      const a = streakSpec(k);
      const b = streakSpec(k + 1);
      expect(b.time).toBeLessThanOrEqual(a.time);
      if (a.time > 0.35) expect(b.time).toBeLessThan(a.time);
      expect(b.swaps).toBeGreaterThanOrEqual(a.swaps);
      expect(b.shells).toBeGreaterThanOrEqual(a.shells);
      expect(a.shells).toBeLessThanOrEqual(5);
    }
    expect(streakSpec(0).shells).toBe(3);
    const g = createGame({ mode: 'streak', seed: 3 });
    for (let k = 0; k < 12; k++) {
      toChoose(g);
      expect(g.round.spec.time).toBeCloseTo(streakSpec(k).time);
      tapShell(g, answerShell(g.round.sh));
      finishReveal(g);
      expect(g.status).toBe('play');
      expect(g.streak).toBe(k + 1);
    }
  });

  it('a wrong answer ends the run kindly (after showing where it was) and keeps the streak', () => {
    const g = createGame({ mode: 'streak', seed: 3 });
    for (let k = 0; k < 3; k++) {
      toChoose(g);
      tapShell(g, answerShell(g.round.sh));
      finishReveal(g);
    }
    toChoose(g);
    const ans = answerShell(g.round.sh);
    tapShell(g, (ans + 1) % g.round.sh.n);
    step(g, revealLength(false) - 0.1);
    expect(g.status).toBe('play'); // still showing where it was
    finishReveal(g);
    expect(g.status).toBe('done');
    expect(g.streak).toBe(3);
    const p = parseProgress(null, LEVELS.length);
    expect(record(p, g, 0).newBest).toBe(true);
    expect(p.best).toBe(3);
    const worse = { mode: 'streak', streak: 1 };
    expect(record(p, worse, 0).newBest).toBe(false);
    expect(p.best).toBe(3);
  });
});

describe('levels', () => {
  it('about fifteen levels, each sane', () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(14);
    for (const L of LEVELS) {
      expect(L.shells >= 3 && L.shells <= 5).toBe(true);
      expect(L.swaps).toBeGreaterThanOrEqual(3);
      expect(L.time).toBeGreaterThanOrEqual(0.4);
      if (L.decoy || L.doubles) expect(L.shells).toBeGreaterThanOrEqual(4);
      if (L.ring) expect(L.spins).toBeGreaterThan(0);
    }
  });

  it('levels 1-3 are easy: three slow shells, a few swaps, no twists', () => {
    for (const L of LEVELS.slice(0, 3)) {
      expect(L.shells).toBe(EASY.shells);
      expect(L.swaps).toBeLessThanOrEqual(EASY.maxSwaps);
      expect(L.time).toBeGreaterThanOrEqual(EASY.minTime);
      for (const k of ['doubles', 'fakes', 'decoy', 'ring', 'leaf', 'two']) expect(L[k]).toBeFalsy();
    }
    expect(LEVELS[0].reach).toBe(1);
  });

  it('difficulty never drops sharply and the last level is the hardest by far', () => {
    const d = LEVELS.map(difficulty);
    for (let i = 1; i < d.length; i++) expect(d[i], LEVELS[i].name).toBeGreaterThanOrEqual(d[i - 1] * 0.8);
    expect(d[d.length - 1]).toBe(Math.max(...d));
    expect(d[d.length - 1]).toBeGreaterThan(d[0] * 20);
  });

  it('twists arrive one at a time, after the plain levels', () => {
    const firstWith = (k) => LEVELS.findIndex((L) => !!L[k]);
    const order = ['doubles', 'decoy', 'fakes', 'ring', 'leaf', 'two'].map(firstWith);
    expect(order.every((i) => i >= 5)).toBe(true);
    expect(new Set(order).size).toBe(order.length);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

describe('saved progress', () => {
  it('round-trips and survives junk', () => {
    const p = parseProgress(null, LEVELS.length);
    expect(p).toEqual({ stars: LEVELS.map(() => 0), best: 0, skin: 'coconut', critter: 'crab' });
    p.stars[0] = 3;
    p.stars[1] = 2;
    p.best = 7;
    const back = parseProgress(serializeProgress(p), LEVELS.length);
    expect(back).toEqual(p);
    expect(parseProgress('{oops', 3).stars).toEqual([0, 0, 0]);
    expect(parseProgress('{"stars":[9,-1,"3",2.5,2]}', 5).stars).toEqual([0, 0, 0, 0, 2]);
    expect(parseProgress('{"best":-4}', 2).best).toBe(0);
  });

  it('unlocks levels in order and the streak after level 3', () => {
    const p = parseProgress(null, LEVELS.length);
    expect(unlocked(p, 0)).toBe(true);
    expect(unlocked(p, 1)).toBe(false);
    p.stars[0] = 1;
    expect(unlocked(p, 1)).toBe(true);
    expect(streakUnlocked(p)).toBe(false);
    p.stars[1] = 1;
    p.stars[2] = 1;
    expect(streakUnlocked(p)).toBe(true);
  });

  it('a level keeps its best stars, and stars open shell skins and critters', () => {
    const p = parseProgress(null, LEVELS.length);
    const g = { mode: 'level', stars: 3 };
    record(p, g, 0);
    record(p, { mode: 'level', stars: 1 }, 0);
    expect(p.stars[0]).toBe(3);
    expect(isOpen(SKINS, 'bucket', p)).toBe(false);
    p.stars[1] = 2;
    const res = record(p, { mode: 'level', stars: 1 }, 2);
    expect(totalStars(p)).toBe(6);
    expect(res.unlocks).toContain('bucket');
    expect(isOpen(SKINS, 'bucket', p)).toBe(true);
    expect(isOpen(CRITTERS, 'turtle', p)).toBe(false);
    // a saved skin that isn't earned reads back as the coconut
    expect(parseProgress('{"stars":[1],"skin":"conch","critter":"starfish"}', 3)).toMatchObject({ skin: 'coconut', critter: 'crab' });
    expect(parseProgress(`{"stars":[3,3,3,3,3,3,3,3,3],"skin":"conch","critter":"starfish"}`, 9)).toMatchObject({ skin: 'conch', critter: 'starfish' });
  });
});
