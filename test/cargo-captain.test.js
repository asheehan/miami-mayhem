import { describe, it, expect } from 'vitest';
import { VOYAGES, TYPES, generateVoyage, generatePuzzle, voyageSeed, check } from '../src/games/cargo-captain/levels.js';
import {
  createVoyage, step, pickAt, moveHeld, dropHeld, answer, layout, totals, totalsOf, compare, targetTilt, rested,
  solveCrates, starsFor, parseProgress, serializeProgress, unlocked, hint, dropZone, diffOf,
  MAX_TILT, PIVOT_X, HOLD_LIFT, SIDE_DROP_Y, DECK_MAX, PLOP_DIFF, STAR3_MAX_WRONG, STAR2_MAX_WRONG,
  HINT_COUNT_DELAY, HINT_GLOW_DELAY, crateSize,
} from '../src/games/cargo-captain/sim.js';
import { playVoyage, nextMove, doMove, dropPoint } from '../src/games/cargo-captain/bot.js';

const run = (s, secs, dt = 1 / 60) => {
  for (let t = 0; t < secs; t += dt) step(s, dt);
};

// A one-puzzle voyage from a hand-made crate list, already past the arrival.
function puzzle(crates, extra = {}) {
  const p = { type: 'test', stage: { min: 1, max: 20, parts: 1 }, crates, ...extra };
  const s = createVoyage(0, [p]);
  run(s, 1.5);
  expect(s.status).toBe('play');
  return s;
}
const L = (n) => ({ n, place: 'left', fixed: true });
const R = (n, fixed = true) => ({ n, place: 'right', fixed });
const D = (n) => ({ n, place: 'dock', fixed: false });
const crate = (s, n) => s.crates.find((c) => c.n === n && !c.fixed);

// Drag a crate by where it is drawn, as a finger would, and let go so it shows over `to`.
function drag(s, c, to) {
  const p = layout(s).get(c.id);
  expect(pickAt(s, p.x, p.y)).toBe(c.id);
  const at = dropPoint(to);
  moveHeld(s, at.x, at.y);
  return dropHeld(s, at.x, at.y);
}

describe('weights', () => {
  it('adds up each side and compares them', () => {
    const t = totalsOf([L(3), L(4), R(5), D(9)]);
    expect(t).toEqual({ left: 7, right: 5 });
    expect(compare(7, 5)).toBe('>');
    expect(compare(4, 7)).toBe('<');
    expect(compare(7, 7)).toBe('=');
  });

  it('bigger numbers make bigger crates', () => {
    for (let n = 1; n < 10; n++) expect(crateSize(n + 1)).toBeGreaterThan(crateSize(n));
  });
});

describe('tilt', () => {
  it('the heavier side sinks, more for a bigger difference, up to a limit', () => {
    expect(targetTilt(0)).toBe(0);
    expect(targetTilt(1)).toBeGreaterThan(0.05); // even one unit shows
    expect(targetTilt(-1)).toBeLessThan(-0.05);
    for (let d = 1; d < 12; d++) expect(targetTilt(d + 1)).toBeGreaterThanOrEqual(targetTilt(d));
    expect(targetTilt(50)).toBe(MAX_TILT);
    const s = puzzle([L(4), D(4), D(2)]);
    expect(s.tilt).toBeLessThan(0); // left heavy: left side down
    drag(s, crate(s, 2), 'right');
    run(s, 3);
    expect(s.tilt).toBeLessThan(0);
    expect(Math.abs(s.tilt)).toBeLessThan(Math.abs(targetTilt(-4)));
  });

  it('springs past and wobbles, then settles level when the sides are equal', () => {
    const s = puzzle([L(4), D(4), D(2)]);
    const start = s.tilt;
    drag(s, crate(s, 4), 'right');
    expect(s.status).toBe('level');
    let overshoot = 0;
    for (let t = 0; t < 1.5; t += 1 / 60) {
      step(s, 1 / 60);
      overshoot = Math.max(overshoot, s.tilt * Math.sign(-start));
    }
    expect(overshoot).toBeGreaterThan(0.01); // swung past level a little
    expect(Math.abs(s.tilt)).toBeLessThan(0.02);
  });
});

describe('dragging crates', () => {
  it('drops onto the left, the right, or back to the dock by where the crate is drawn', () => {
    expect(dropZone(50, 300)).toBe('left');
    expect(dropZone(350, 100)).toBe('right');
    expect(dropZone(PIVOT_X + 1, SIDE_DROP_Y - 1)).toBe('right');
    expect(dropZone(200, SIDE_DROP_Y + 1)).toBe('dock');
    const s = puzzle([L(6), D(1), D(2), D(3)]);
    expect(drag(s, crate(s, 3), 'right')).toBe('right');
    expect(totals(s)).toEqual({ left: 6, right: 3 });
    expect(drag(s, crate(s, 2), 'left')).toBe('left');
    expect(totals(s)).toEqual({ left: 8, right: 3 });
    expect(drag(s, crate(s, 2), 'dock')).toBe('dock');
    expect(totals(s)).toEqual({ left: 6, right: 3 });
    // let go anywhere high over a side: it still lands neatly on that deck
    const c = crate(s, 1);
    const p = layout(s).get(c.id);
    pickAt(s, p.x, p.y);
    expect(dropHeld(s, 395, 5 + HOLD_LIFT)).toBe('right');
    const q = layout(s).get(c.id);
    expect(q.place).toBe('right');
  });

  it('a held crate counts for neither side until it is let go', () => {
    const s = puzzle([L(6), D(2), D(3)]);
    drag(s, crate(s, 3), 'right');
    const c = crate(s, 3);
    const p = layout(s).get(c.id);
    pickAt(s, p.x, p.y);
    expect(totals(s)).toEqual({ left: 6, right: 0 });
    expect(layout(s).get(c.id).y).toBeCloseTo(p.y - HOLD_LIFT, 5); // drawn lifted above the finger
    dropHeld(s, p.x, p.y);
  });

  it('bolted crates cannot be picked up', () => {
    const s = puzzle([L(6), R(2), D(4), D(1)]);
    for (const c of s.crates.filter((k) => k.fixed)) {
      const p = layout(s).get(c.id);
      expect(pickAt(s, p.x, p.y)).toBeNull();
    }
    expect(s.events.some((e) => e.type === 'bolted')).toBe(true);
  });

  it('forgives a finger a little outside the crate', () => {
    const s = puzzle([L(6), D(2), D(5)]);
    const c = crate(s, 5);
    const p = layout(s).get(c.id);
    expect(pickAt(s, p.x + p.size / 2 + 8, p.y)).toBe(c.id);
  });

  it('a full deck sends extra crates back to the dock; crates stack without overlapping', () => {
    const s = puzzle([L(10), L(10), D(1), D(1), D(1), D(1), D(1), D(1), D(1)]);
    const loose = s.crates.filter((c) => !c.fixed);
    for (const c of loose) drag(s, c, 'right');
    expect(s.crates.filter((c) => c.place === 'right').length).toBe(DECK_MAX);
    expect(s.crates.filter((c) => c.place === 'dock').length).toBe(1);
    const pos = [...layout(s).values()].filter((p) => p.place === 'right');
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const a = pos[i];
        const b = pos[j];
        const apart = Math.abs(a.x - b.x) >= (a.size + b.size) / 2 - 2 || Math.abs(a.y - b.y) >= (a.size + b.size) / 2 - 2;
        expect(apart).toBe(true);
      }
    }
  });

  it('nothing can be picked up while the ship arrives or sails', () => {
    const s = createVoyage(0, generateVoyage(0));
    const c = s.crates.find((k) => !k.fixed);
    const p = layout(s).get(c.id);
    expect(pickAt(s, p.x, p.y)).toBeNull();
  });
});

describe('settling, wrong settles and plops', () => {
  it('balancing levels the ship, toots, sails off and brings the next puzzle', () => {
    const s = createVoyage(0, generateVoyage(0));
    run(s, 1.5);
    const m = nextMove(s);
    doMove(s, m);
    expect(s.status).toBe('level');
    run(s, 2);
    expect(s.status).toBe('sail');
    run(s, 2);
    expect(s.index).toBe(1);
    expect(['arrive', 'play']).toContain(s.status);
  });

  it('adding to the light side without going past is never wrong', () => {
    const s = puzzle([L(9), D(4), D(2), D(3), D(5)]);
    drag(s, crate(s, 4), 'right');
    run(s, 4);
    expect(rested(s)).toBe(true);
    drag(s, crate(s, 2), 'right');
    run(s, 4);
    expect(s.wrongs).toBe(0);
    drag(s, crate(s, 3), 'right');
    expect(s.status).toBe('level');
    expect(s.wrongs).toBe(0);
  });

  it('going past level, or making the heavy side heavier, is a wrong settle once the ship rests', () => {
    const s = puzzle([L(5), D(4), D(3), D(2)]);
    drag(s, crate(s, 4), 'right');
    run(s, 4);
    expect(s.wrongs).toBe(0);
    drag(s, crate(s, 3), 'right'); // 7 against 5: past level
    expect(s.wrongs).toBe(0); // not until it settles
    run(s, 4);
    expect(s.wrongs).toBe(1);
    drag(s, crate(s, 2), 'right'); // heavier still
    run(s, 4);
    expect(s.wrongs).toBe(2);
    expect(s.events.filter((e) => e.type === 'wobble').length).toBe(2);
  });

  it('a held crate or a still-swinging ship never counts', () => {
    const s = puzzle([L(5), D(9), D(3), D(2)]);
    drag(s, crate(s, 9), 'right');
    run(s, 0.2);
    drag(s, crate(s, 9), 'dock'); // quick change of mind before it settled
    run(s, 4);
    expect(s.wrongs).toBe(0);
  });

  it('a very lopsided ship makes the crate just dropped plop off and come back to the dock', () => {
    const s = puzzle([L(1), D(10), D(1)]);
    drag(s, crate(s, 10), 'right');
    expect(Math.abs(diffOf(s))).toBeGreaterThanOrEqual(PLOP_DIFF);
    run(s, 5);
    expect(crate(s, 10).place).toBe('dock');
    expect(s.events.some((e) => e.type === 'plop')).toBe(true);
    expect(s.wrongs).toBe(1); // the plop itself doesn't add another
    run(s, 4);
    expect(s.wrongs).toBe(1);
  });

  it('crates that started on the ship never plop', () => {
    const s = puzzle([L(1), R(9, false), R(1, false)]);
    run(s, 5);
    expect(s.crates.filter((c) => c.place === 'right').length).toBe(2);
  });
});

describe('mystery crate', () => {
  it('balancing it asks for its number; a wrong tap is a wrong, the right one sails', () => {
    const p = { type: 'mystery', stage: { min: 1, max: 10, parts: 1 }, mystery: true, answer: 6, choices: [5, 6, 8],
      crates: [{ n: 6, place: 'left', fixed: true, mystery: true }, D(6), D(2)] };
    const s = createVoyage(0, [p]);
    run(s, 1.5);
    drag(s, s.crates.find((c) => c.n === 6 && !c.fixed), 'right');
    expect(s.status).toBe('choose');
    expect(answer(s, 5)).toBe(false);
    expect(s.wrongs).toBe(1);
    expect(answer(s, 6)).toBe(true);
    expect(s.status).toBe('level');
    expect(s.revealed).toBe(true);
  });

  it('trying crates on a mystery puzzle is not counted wrong', () => {
    const p = { type: 'mystery', stage: { min: 1, max: 10, parts: 1 }, mystery: true, answer: 4, choices: [4, 5, 6],
      crates: [{ n: 4, place: 'left', fixed: true, mystery: true }, D(4), D(7)] };
    const s = createVoyage(0, [p]);
    run(s, 1.5);
    drag(s, s.crates.find((c) => c.n === 7), 'right');
    run(s, 5);
    expect(s.wrongs).toBe(0);
  });

  it('in every voyage the answer is among the choices exactly once', () => {
    let seen = 0;
    VOYAGES.forEach((_, v) => {
      for (const p of generateVoyage(v)) {
        if (!p.mystery) continue;
        seen++;
        expect(p.choices.length).toBe(3);
        expect(p.choices.filter((c) => c === p.answer).length).toBe(1);
        expect(new Set(p.choices).size).toBe(3);
        expect(p.choices.every((c) => c >= 1)).toBe(true);
        expect(p.crates.find((c) => c.mystery).n).toBe(p.answer);
      }
    });
    expect(seen).toBeGreaterThanOrEqual(2);
  });
});

describe('hints', () => {
  it('after a while stuck the dots count and the difference shows; later the right crate glows', () => {
    const s = createVoyage(2, generateVoyage(2));
    run(s, 1.5);
    expect(hint(s)).toBeNull();
    run(s, HINT_COUNT_DELAY);
    const h1 = hint(s);
    expect(h1.stage).toBe(1);
    expect(h1.diff).toBe(Math.abs(diffOf(s)));
    expect(h1.light).toBe(diffOf(s) > 0 ? 'left' : 'right');
    run(s, HINT_GLOW_DELAY - HINT_COUNT_DELAY);
    const h2 = hint(s);
    expect(h2.stage).toBe(2);
    // doing what the glow says is a step toward level
    const before = Math.abs(diffOf(s));
    const c = s.crates.find((k) => k.id === h2.move.id);
    drag(s, c, h2.move.to);
    expect(Math.abs(diffOf(s))).toBeLessThan(before);
    expect(hint(s)).toBeNull(); // touching a crate resets the wait
  });
});

describe('stars and progress', () => {
  it('3 stars for few wrong settles, then 2, then 1', () => {
    expect(starsFor(0)).toBe(3);
    expect(starsFor(STAR3_MAX_WRONG)).toBe(3);
    expect(starsFor(STAR3_MAX_WRONG + 1)).toBe(2);
    expect(starsFor(STAR2_MAX_WRONG)).toBe(2);
    expect(starsFor(STAR2_MAX_WRONG + 1)).toBe(1);
    expect(starsFor(99)).toBe(1);
  });

  it('saves and loads { stars: [...] } and shrugs off bad data', () => {
    const n = VOYAGES.length;
    const p = { stars: [3, 2, 1, 0, 0, 0].slice(0, n) };
    expect(parseProgress(serializeProgress(p), n)).toEqual(p);
    const zero = { stars: new Array(n).fill(0) };
    for (const bad of [null, undefined, '', 'nonsense{', '[]', '{"stars":"x"}', '{"stars":null}', 42, { stars: {} }]) {
      expect(parseProgress(bad, n)).toEqual(zero);
    }
    expect(parseProgress('{"stars":[5,-1,2.5,"3",null,2,3,3,3]}', n).stars).toEqual([0, 0, 0, 0, 0, 2].slice(0, n));
    expect(parseProgress('{"stars":[1]}', n).stars.length).toBe(n);
  });

  it('a voyage opens once the one before it has a star', () => {
    const p = { stars: [0, 0, 0, 0, 0, 0] };
    expect(unlocked(p, 0)).toBe(true);
    expect(unlocked(p, 1)).toBe(false);
    p.stars[0] = 1;
    expect(unlocked(p, 1)).toBe(true);
    expect(unlocked(p, 2)).toBe(false);
  });
});

describe('puzzles', () => {
  const all = VOYAGES.map((_, v) => generateVoyage(v));

  it('at least 30 puzzles in voyages of five', () => {
    expect(VOYAGES.length).toBeGreaterThanOrEqual(6);
    for (const V of VOYAGES) expect(V.stages.length).toBe(5);
  });

  it('are the same every time', () => {
    VOYAGES.forEach((_, v) => expect(generateVoyage(v)).toEqual(all[v]));
  });

  it('every one has a balance using loose crates only, a distractor, the right numbers, and starts unbalanced', () => {
    all.forEach((list, v) => list.forEach((p, i) => {
      const where = `voyage ${v + 1} puzzle ${i + 1} (${p.type})`;
      expect(check(p), where).toBeNull();
      const crates = p.crates.map((c, k) => ({ ...c, id: k + 1, fixed: c.fixed || c.mystery }));
      const t = totalsOf(crates);
      expect(t.left, where).not.toBe(t.right);
      const sol = solveCrates(crates);
      expect(sol, where).not.toBeNull();
      // brute force again, independently: every way to put the loose crates left/right/dock
      const loose = crates.filter((c) => !c.fixed);
      const fixed = crates.filter((c) => c.fixed);
      let found = false;
      for (let mask = 0; mask < 3 ** loose.length && !found; mask++) {
        let m = mask;
        const tried = loose.map((c) => {
          const place = ['left', 'right', 'dock'][m % 3];
          m = Math.floor(m / 3);
          return { ...c, place };
        });
        const tt = totalsOf([...fixed, ...tried]);
        if (tt.left === tt.right && tt.left > 0) found = true;
      }
      expect(found, where).toBe(true);
      expect(loose.length, where).toBeGreaterThan(sol.length); // at least one distractor
      const st = p.stage;
      for (const c of crates) {
        expect(c.n, where).toBeGreaterThanOrEqual(1);
        expect(c.n, where).toBeLessThanOrEqual(10);
        if (!c.fixed) expect(c.n, where).toBeLessThanOrEqual(st.crateMax);
      }
      const after = crates.map((c) => {
        const mv = sol.find((k) => k.id === c.id);
        return mv ? { ...c, place: mv.to } : c;
      });
      const bal = totalsOf(after).left;
      expect(bal, where).toBeGreaterThanOrEqual(st.min);
      expect(bal, where).toBeLessThanOrEqual(st.max);
      expect(sol.length, where).toBe(st.parts);
    }));
  });

  it('bring in the puzzle types in order, at most one new type per voyage', () => {
    const seen = [];
    all.forEach((list) => {
      const fresh = [...new Set(list.map((p) => p.type))].filter((t) => !seen.includes(t));
      expect(fresh.length).toBeLessThanOrEqual(1);
      seen.push(...fresh);
    });
    expect(seen).toEqual(TYPES);
  });

  it('ramp up: later voyages reach bigger totals, up to 20', () => {
    const top = all.map((list) => Math.max(...list.map((p) => p.stage.max)));
    for (let v = 1; v < top.length; v++) expect(top[v]).toBeGreaterThanOrEqual(top[v - 1]);
    expect(top[0]).toBeLessThanOrEqual(10);
    expect(top[top.length - 1]).toBe(20);
    expect(all.flat().some((p) => p.stage.parts === 3)).toBe(true); // three-crate sums
    expect(all.flat().some((p) => p.stage.double)).toBe(true); // doubles
  });

  it('the generator stays sound on other seeds too', () => {
    VOYAGES.forEach((V, v) => V.stages.forEach((st, i) => {
      for (const extra of [1, 2, 3]) expect(check(generatePuzzle(st, voyageSeed(v, i) + extra * 31337))).toBeNull();
    }));
  });
});

describe('the bot', () => {
  for (let v = 0; v < VOYAGES.length; v++) {
    it(`finishes voyage ${v + 1} with 3 stars through the same actions as the touch screen`, () => {
      const s = createVoyage(v, generateVoyage(v));
      playVoyage(s);
      expect(s.status).toBe('done');
      expect(s.index).toBe(4);
      expect(s.wrongs).toBe(0);
      expect(s.stars).toBe(3);
    });
  }

  it('doing nothing never finishes a puzzle', () => {
    const s = createVoyage(0, generateVoyage(0));
    run(s, 60, 1 / 30);
    expect(s.status).toBe('play');
    expect(s.index).toBe(0);
  });
});
