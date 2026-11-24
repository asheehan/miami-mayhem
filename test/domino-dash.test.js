import { describe, it, expect } from 'vitest';
import { LEVELS, FREE, scaleLevel, LEVEL_SCALE } from '../src/games/domino-dash/levels.js';
import {
  createLevel, beginStroke, strokeTo, endStroke, go, step, settled, standUp, undo, clearAll,
  beginErase, eraseAt, endErase, dropGoal, blockedAt, openEnds, starsFor, twoStar, used, left,
  carrierPos, parseProgress, serializeProgress, unlocked, fallTime,
  SPACING, MIN_SEP, REACH, DOM_T, STOP_RESET, FALL_TIME, FALL_MIN,
} from '../src/games/domino-dash/sim.js';
import { drawLine, layRoute, playOut, solve, brokenRoute } from '../src/games/domino-dash/bot.js';

// A plain test table with the start at the bottom facing up.
function table(extra = {}) {
  return createLevel({
    name: 'test', w: 400, h: 600, start: { x: 200, y: 560, a: -90 }, supply: 200, par: 50,
    goals: [{ kind: 'bell', x: 200, y: 60 }],
    ...extra,
  });
}
const laidOnly = (s) => s.dominoes.filter((d) => !d.fixed);
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const run = (s, secs = 30) => {
  for (let t = 0; t < secs && !settled(s); t += 1 / 60) step(s, 1 / 60);
  return s;
};

describe('laying dominoes along a finger path', () => {
  it('lays them at an even spacing, each facing along the line', () => {
    const s = table();
    drawLine(s, [[200, 560], [200, 300]]);
    const ds = laidOnly(s);
    expect(ds.length).toBe(Math.floor(260 / SPACING));
    let prev = s.start;
    for (const d of ds) {
      expect(Math.hypot(d.x - prev.x, d.y - prev.y)).toBeCloseTo(SPACING, 5);
      expect(angDiff(d.a, -Math.PI / 2)).toBeLessThan(1e-6);
      prev = d;
    }
  });

  it('turns each domino to face along a curve', () => {
    const s = table();
    drawLine(s, [[200, 560], [200, 450], [300, 350]]);
    const ds = laidOnly(s);
    for (let i = 1; i < ds.length - 1; i++) {
      const before = Math.atan2(ds[i].y - ds[i - 1].y, ds[i].x - ds[i - 1].x);
      const after = Math.atan2(ds[i + 1].y - ds[i].y, ds[i + 1].x - ds[i].x);
      // facing sits between the way in and the way out
      expect(angDiff(ds[i].a, before)).toBeLessThanOrEqual(angDiff(before, after) + 1e-9);
      expect(angDiff(ds[i].a, after)).toBeLessThanOrEqual(angDiff(before, after) + 1e-9);
    }
    expect(angDiff(ds[ds.length - 1].a, -Math.PI / 4)).toBeLessThan(0.3);
  });

  it('only starts at an open end: the start domino or the end of a trail', () => {
    const s = table();
    expect(beginStroke(s, 100, 300)).toBe(false); // nowhere near
    expect(openEnds(s).map((d) => d.id)).toEqual([s.start.id]);
    drawLine(s, [[200, 560], [200, 400]]);
    const ends = openEnds(s);
    expect(ends.length).toBe(1);
    expect(ends[0].id).not.toBe(s.start.id);
    expect(beginStroke(s, 200, 560)).toBe(false); // the start has a trail in front of it now
    expect(beginStroke(s, ends[0].x + 5, ends[0].y)).toBe(true);
    strokeTo(s, ends[0].x + 5, ends[0].y - 100);
    endStroke(s);
    expect(laidOnly(s).length).toBeGreaterThan(15);
  });

  it('goes straight out of the start domino first, whichever way the finger heads', () => {
    const s = table();
    beginStroke(s, 200, 560);
    strokeTo(s, 230, 540);
    endStroke(s);
    const first = laidOnly(s)[0];
    expect(first.x).toBeCloseTo(200);
    expect(first.y).toBeCloseTo(560 - SPACING);
  });

  it('never lays on an obstacle, and leaves a gap where the finger crosses one', () => {
    const s = table({ obstacles: [{ kind: 'cup', x: 200, y: 400, r: 30 }] });
    drawLine(s, [[200, 560], [200, 200]]);
    const ds = laidOnly(s);
    for (const d of ds) expect(Math.hypot(d.x - 200, d.y - 400)).toBeGreaterThanOrEqual(30);
    expect(ds.some((d) => d.y < 370)).toBe(true); // carried on past it
    expect(blockedAt(s, 200, 400)).toBe('obstacle');
    // the widest step is the jump over the cup
    let widest = 0;
    let prev = s.start;
    for (const d of ds) {
      widest = Math.max(widest, Math.hypot(d.x - prev.x, d.y - prev.y));
      prev = d;
    }
    expect(widest).toBeGreaterThan(60);
  });

  it('keeps dominoes off gaps between tables, but not off a bridge over them', () => {
    const s = table({ holes: [{ x0: 0, y0: 300, x1: 400, y1: 360 }], bridges: [{ x0: 180, y0: 300, x1: 220, y1: 360 }] });
    expect(blockedAt(s, 100, 330)).toBe('hole');
    expect(blockedAt(s, 200, 330)).toBe(null);
    drawLine(s, [[200, 560], [200, 200]]);
    expect(laidOnly(s).some((d) => d.y > 300 && d.y < 360)).toBe(true);
  });

  it('stops laying when the supply runs out', () => {
    const s = table({ supply: 5 });
    drawLine(s, [[200, 560], [200, 100]]);
    expect(used(s)).toBe(5);
    expect(left(s)).toBe(0);
  });

  it('keeps dominoes apart and on the table', () => {
    const s = table();
    drawLine(s, [[200, 560], [200, 300], [395, 300]]);
    const ds = s.dominoes;
    for (let i = 0; i < ds.length; i++) {
      expect(ds[i].x).toBeLessThan(400);
      for (let j = i + 1; j < ds.length; j++) expect(Math.hypot(ds[i].x - ds[j].x, ds[i].y - ds[j].y)).toBeGreaterThanOrEqual(MIN_SEP - 1e-9);
    }
  });
});

describe('undo, eraser and clear', () => {
  it('undo takes back the last stroke, then the one before', () => {
    const s = table();
    drawLine(s, [[200, 560], [200, 450]]);
    const n1 = used(s);
    const end = openEnds(s)[0];
    drawLine(s, [[end.x, end.y], [end.x, end.y - 100]]);
    expect(used(s)).toBeGreaterThan(n1);
    expect(undo(s)).toBe(true);
    expect(used(s)).toBe(n1);
    undo(s);
    expect(used(s)).toBe(0);
    expect(undo(s)).toBe(false);
  });

  it('the eraser rubs out just the dominoes under the finger, and undo puts them back', () => {
    const s = table();
    drawLine(s, [[200, 560], [200, 300]]);
    const n = used(s);
    beginErase(s);
    eraseAt(s, 200, 420, 16);
    endErase(s);
    expect(used(s)).toBeLessThan(n);
    expect(used(s)).toBeGreaterThan(n - 5);
    expect(s.start).toBe(s.dominoes[0]); // the start can't be rubbed out
    undo(s);
    expect(used(s)).toBe(n);
  });

  it('clear removes every laid domino, and can be undone', () => {
    const s = table();
    drawLine(s, [[200, 560], [200, 300]]);
    const n = used(s);
    expect(clearAll(s)).toBe(true);
    expect(used(s)).toBe(0);
    undo(s);
    expect(used(s)).toBe(n);
  });
});

describe('toppling', () => {
  it('a straight chain falls end to end and sets off the goal', () => {
    const s = table();
    drawLine(s, [[200, 560], [200, 60]]);
    playOut(s);
    expect(s.status).toBe('won');
    expect(s.dominoes.every((d) => d.state === 'down')).toBe(true);
    expect(s.goals[0].fired).toBe(true);
  });

  it('falls in order, each domino after the one behind it, and speeds up along the chain', () => {
    const s = table();
    drawLine(s, [[200, 560], [200, 60]]);
    playOut(s);
    const ds = s.dominoes.slice().sort((a, b) => b.y - a.y);
    for (let i = 1; i < ds.length; i++) expect(ds[i].t0).toBeGreaterThan(ds[i - 1].t0);
    const early = ds[2].t0 - ds[1].t0;
    const late = ds[ds.length - 1].t0 - ds[ds.length - 2].t0;
    expect(late).toBeLessThan(early);
    expect(fallTime(0)).toBe(FALL_TIME);
    expect(fallTime(1000)).toBe(FALL_MIN);
  });

  it('a falling domino comes to rest leaning on the next; the last one lies flat', () => {
    const s = table({ goals: [] });
    drawLine(s, [[200, 560], [200, 400]]);
    playOut(s);
    const ds = s.dominoes.slice().sort((a, b) => b.y - a.y);
    expect(ds[0].rest).toBeLessThan(45);
    expect(ds[0].restOn).toBe(ds[1].id);
    expect(ds[ds.length - 1].rest).toBe(90);
  });

  it('a gap too wide stops the chain and says where', () => {
    const s = table();
    drawLine(s, [[200, 560], [200, 400]]);
    // a second trail starting a little way past the end of the first
    const end = openEnds(s)[0];
    const far = createLevel({ ...s.def });
    drawLine(far, [[200, 560], [200, 400]]);
    const s2 = far;
    s2.dominoes.push({ ...end, id: 999, x: end.x, y: end.y - (REACH + DOM_T + 6), fixed: false, pips: [1, 2] });
    playOut(s2);
    expect(s2.status).toBe('stopped');
    expect(s2.dominoes.find((d) => d.id === 999).state).toBe('stand');
    const b = s2.breaks[0];
    expect(b.reason).toBe('gap');
    expect(b.y).toBeCloseTo(end.y);
    expect(angDiff(b.a, -Math.PI / 2)).toBeLessThan(1e-6); // the hint points on up the line
  });

  it('a domino only just within reach is still knocked over', () => {
    const s = table({ goals: [] });
    s.dominoes.push({ ...s.start, id: 500, role: undefined, fixed: false, y: s.start.y - (REACH + DOM_T - 0.5), pips: [0, 0] });
    playOut(s);
    expect(s.dominoes.find((d) => d.id === 500).state).toBe('down');
  });

  it('a turn too sharp only wobbles the next domino and stops the chain there', () => {
    const s = table({ goals: [] });
    // two dominoes ahead of the start, the second at right angles to the first
    s.dominoes.push({ ...s.start, id: 501, role: undefined, fixed: false, y: s.start.y - SPACING, pips: [0, 0] });
    s.dominoes.push({ ...s.start, id: 502, role: undefined, fixed: false, y: s.start.y - 2 * SPACING, a: 0, dir: 0, pips: [0, 0] });
    playOut(s);
    expect(s.dominoes.find((d) => d.id === 501).state).toBe('down');
    expect(s.dominoes.find((d) => d.id === 502).state).toBe('wobble');
    expect(s.breaks[0].reason).toBe('turn');
    expect(s.breaks[0].id).toBe(501);
  });

  it('a gentle curve carries the chain round', () => {
    const s = table({ goals: [{ kind: 'bell', x: 360, y: 300 }] });
    drawLine(s, [[200, 560], [200, 460], [240, 380], [300, 320], [360, 300]]);
    playOut(s);
    expect(s.status).toBe('won');
  });

  it('a corner drawn too sharp breaks the chain', () => {
    const s = table({ goals: [{ kind: 'bell', x: 360, y: 380 }] });
    drawLine(s, [[200, 560], [200, 380], [190, 380], [360, 380]], 4);
    playOut(s);
    expect(s.status).toBe('stopped');
    expect(s.breaks[0].reason).toBe('turn');
    expect(s.breaks[0].y).toBeLessThan(400);
    expect(s.breaks[0].y).toBeGreaterThan(360);
  });

  it("a domino can't knock another through a cup in the way", () => {
    const s = table({ goals: [], obstacles: [{ kind: 'cup', x: 200, y: 540, r: 3 }] });
    s.dominoes.push({ ...s.start, id: 503, role: undefined, fixed: false, y: s.start.y - SPACING * 1.5, pips: [0, 0] });
    playOut(s);
    expect(s.dominoes.find((d) => d.id === 503).state).toBe('stand');
    expect(s.breaks[0].reason).toBe('blocked');
  });

  it('a short trail stops with the hint pointing at the goal', () => {
    const s = table({ goals: [{ kind: 'bell', x: 350, y: 100 }] });
    drawLine(s, [[200, 560], [200, 450]]);
    playOut(s);
    expect(s.status).toBe('stopped');
    const b = s.breaks[0];
    expect(b.reason).toBe('end');
    expect(angDiff(b.a, Math.atan2(100 - b.y, 350 - b.x))).toBeLessThan(1e-6);
  });

  it('after a stop the dominoes stand back up on their own, keeping the hint', () => {
    const s = table();
    drawLine(s, [[200, 560], [200, 450]]);
    playOut(s);
    expect(s.status).toBe('stopped');
    run(s, 0);
    for (let t = 0; t < STOP_RESET + 0.1; t += 1 / 30) step(s, 1 / 30);
    expect(s.status).toBe('build');
    expect(s.dominoes.every((d) => d.state === 'stand')).toBe(true);
    expect(s.breaks.length).toBe(1);
    // fixing just that part and going again wins
    const end = openEnds(s)[0];
    drawLine(s, [[end.x, end.y], [200, 60]]);
    expect(s.breaks.length).toBe(0);
    playOut(s);
    expect(s.status).toBe('won');
  });

  it('a goal across a narrow crack is reached; across a wide gap it is not', () => {
    const crack = table({ holes: [{ x0: 0, y0: 300, x1: 400, y1: 306 }] });
    drawLine(crack, [[200, 560], [200, 60]]);
    playOut(crack);
    expect(crack.status).toBe('won');
    const wide = table({ holes: [{ x0: 0, y0: 300, x1: 400, y1: 360 }] });
    drawLine(wide, [[200, 560], [200, 60]]);
    playOut(wide);
    expect(wide.status).toBe('stopped');
    expect(wide.breaks[0].y).toBeGreaterThan(360);
  });

  it('every goal must go off to win', () => {
    const s = table({ goals: [{ kind: 'bell', x: 200, y: 60 }, { kind: 'drum', x: 60, y: 60 }] });
    drawLine(s, [[200, 560], [200, 60]]);
    playOut(s);
    expect(s.goals[0].fired).toBe(true);
    expect(s.goals[1].fired).toBe(false);
    expect(s.status).toBe('stopped');
  });

  it('flicking with nothing laid just knocks the start over', () => {
    const s = table();
    playOut(s);
    expect(s.status).toBe('stopped');
    expect(s.breaks[0].id).toBe(s.start.id);
  });

  it('is deterministic', () => {
    const a = solve(LEVELS[14]);
    const b = solve(LEVELS[14]);
    expect(a.time).toBe(b.time);
    expect(a.dominoes.map((d) => [d.id, d.x, d.y, d.a, d.t0, d.state])).toEqual(b.dominoes.map((d) => [d.id, d.x, d.y, d.a, d.t0, d.state]));
    expect(a.events.map((e) => [e.type, e.t])).toEqual(b.events.map((e) => [e.type, e.t]));
  });
});

describe('gadgets', () => {
  it('a splitter sends one chain out two ways', () => {
    const s = table({
      goals: [{ kind: 'popper', x: 100, y: 100 }, { kind: 'bell', x: 300, y: 100 }],
      gadgets: [{ kind: 'split', x: 200, y: 400, a: -90, spread: 40 }],
    });
    const [l, r] = s.gadgets[0].outs.map((id) => s.dominoes.find((d) => d.id === id));
    expect(l.x).toBeLessThan(200);
    expect(r.x).toBeGreaterThan(200);
    layRoute(s, [[[200, 560], [200, 400]], [[l.x, l.y], [140, 300], [100, 100]], [[r.x, r.y], [260, 300], [300, 100]]]);
    playOut(s);
    expect(s.gadgets[0].state).toBe('done');
    expect(s.goals.every((g) => g.fired)).toBe(true);
    expect(s.status).toBe('won');
  });

  for (const kind of ['ball', 'car', 'fan', 'seesaw', 'rooster']) {
    it(`a ${kind} carries the chain over a gap nothing can stand in`, () => {
      const def = {
        holes: [{ x0: 0, y0: 250, x1: 400, y1: 350 }],
        gadgets: [{ kind, path: [[200, 390], [200, 210]] }],
      };
      const s = table(def);
      expect(blockedAt(s, 200, 300)).not.toBe(null);
      layRoute(s, [[[200, 560], [200, 390]], [[200, 210], [200, 60]]]);
      go(s);
      let moving = false;
      let lastK = 0;
      for (let t = 0; t < 30 && !settled(s); t += 1 / 60) {
        step(s, 1 / 60);
        const g = s.gadgets[0];
        if (g.state === 'go') {
          moving = true;
          const p = carrierPos(s, g);
          expect(p.k).toBeGreaterThanOrEqual(lastK);
          lastK = p.k;
        }
      }
      expect(moving).toBe(true);
      expect(s.gadgets[0].state).toBe('done');
      expect(s.status).toBe('won');
      // without the gadget being hit, the far side never falls
      const miss = table(def);
      layRoute(miss, [[[200, 560], [200, 470]], [[200, 210], [200, 60]]]);
      playOut(miss);
      expect(miss.status).toBe('stopped');
      expect(miss.gadgets[0].state).toBe('idle');
    });
  }

  it('the seesaw ball and the rooster leave the table on the way', () => {
    for (const kind of ['seesaw', 'rooster']) {
      const s = table({ gadgets: [{ kind, path: [[200, 390], [200, 210]] }] });
      const g = s.gadgets[0];
      g.state = 'go';
      g.t0 = 0;
      s.time = g.windup + g.travel * 0.4;
      expect(carrierPos(s, g).z).toBeGreaterThan(5);
    }
  });
});

describe('free play', () => {
  it('has lots of dominoes, never wins, and lets goals be dropped in and erased', () => {
    const s = createLevel(FREE);
    expect(s.supply).toBeGreaterThanOrEqual(150);
    const g = dropGoal(s, 'rocket', 240, 200);
    expect(g).not.toBe(null);
    expect(dropGoal(s, 'bell', 240, 205)).toBe(null); // too close to the first
    drawLine(s, [[240, 620], [240, 200]]);
    playOut(s);
    expect(s.goals[0].fired).toBe(true);
    expect(s.status).toBe('stopped'); // nothing to win; it just stays fallen
    for (let t = 0; t < 10; t += 0.1) step(s, 0.1);
    expect(s.status).toBe('stopped');
    standUp(s);
    beginErase(s);
    eraseAt(s, 240, 200, 16);
    endErase(s);
    expect(s.goals.length).toBe(0);
  });

  it('a long spiral of 150 dominoes falls all the way', () => {
    const s = createLevel(FREE);
    const pts = [[240, 620], [240, 570], [262, 520], [330, 480], [420, 470], [455, 430]];
    for (let i = 0; i <= 300; i++) {
      const a = Math.PI / 2 + (i / 300) * Math.PI * 4.6;
      const r = 215 - i * 0.6;
      pts.push([240 + Math.sin(a) * r, 330 + Math.cos(a) * r * 1.2]);
    }
    drawLine(s, pts);
    expect(used(s)).toBe(FREE.supply);
    playOut(s);
    expect(s.dominoes.every((d) => d.state === 'down')).toBe(true);
  });
});

describe('stars and progress', () => {
  it('1 star for setting off every goal, 2 near par, 3 at or under par', () => {
    const def = { par: 20 };
    expect(starsFor(def, 20)).toBe(3);
    expect(starsFor(def, 21)).toBe(2);
    expect(starsFor(def, twoStar(def))).toBe(2);
    expect(starsFor(def, twoStar(def) + 1)).toBe(1);
    expect(starsFor({ free: true, par: 0 }, 0)).toBe(0);
  });

  it('a wobbly, wasteful trail still wins but with fewer stars', () => {
    const L = LEVELS[0];
    const s = createLevel(L);
    const zig = [[L.start.x, L.start.y]];
    for (let y = L.start.y - 10, k = 0; y > L.goals[0].y; y -= 6, k++) zig.push([L.start.x + (k % 2 ? 10 : -10), y]);
    zig.push([L.goals[0].x, L.goals[0].y]);
    drawLine(s, zig, 2);
    playOut(s);
    expect(s.status).toBe('won');
    expect(s.stars).toBeLessThan(3);
  });

  it('progress round-trips and rejects junk', () => {
    const p = parseProgress(serializeProgress({ stars: [3, 1, 0], theme: 2 }), 4);
    expect(p).toEqual({ stars: [3, 1, 0, 0], theme: 2 });
    expect(parseProgress('nonsense', 2)).toEqual({ stars: [0, 0], theme: 0 });
    expect(parseProgress('{"stars":[9,"x",-1]}', 3).stars).toEqual([0, 0, 0]);
    expect(unlocked({ stars: [0, 0] }, 0)).toBe(true);
    expect(unlocked({ stars: [0, 0] }, 1)).toBe(false);
    expect(unlocked({ stars: [1, 0] }, 1)).toBe(true);
  });
});

describe('levels', () => {
  it('has about fifteen levels, and the first three are simple', () => {
    expect(LEVELS.length).toBe(15);
    for (const L of LEVELS.slice(0, 3)) {
      expect(L.gadgets.length).toBe(0);
      expect(L.holes.length).toBe(0);
      expect(L.goals.length).toBe(1);
      expect(L.obstacles.length).toBeLessThanOrEqual(1);
    }
    expect(LEVELS[0].route[0].length).toBe(2); // a straight line
    expect(LEVELS[0].hint).toBe(true);
    expect(LEVELS[2].obstacles.length).toBe(1);
  });

  it('brings in each new thing', () => {
    const kinds = new Set(LEVELS.flatMap((L) => L.gadgets.map((g) => g.kind)));
    for (const k of ['split', 'ball', 'car', 'fan', 'seesaw', 'rooster']) expect(kinds.has(k)).toBe(true);
    expect(LEVELS.some((L) => L.bridges.length)).toBe(true);
    expect(LEVELS.some((L) => L.goals.length === 3)).toBe(true);
    const obs = new Set(LEVELS.flatMap((L) => L.obstacles.map((o) => o.kind)));
    for (const k of ['cup', 'cat', 'planter']) expect(obs.has(k)).toBe(true);
  });

  it('scaling a level scales everything in it', () => {
    const raw = { w: 100, h: 200, start: { x: 10, y: 20, a: -90 }, goals: [{ kind: 'bell', x: 50, y: 60 }], obstacles: [{ kind: 'box', x: 5, y: 5, w: 10, h: 4 }], route: [[[10, 20], [50, 60]]] };
    const s = scaleLevel(raw, 0.5);
    expect(s.w).toBe(50);
    expect(s.start).toEqual({ x: 5, y: 10, a: -90 });
    expect(s.obstacles[0]).toMatchObject({ w: 5, h: 2 });
    expect(s.route[0][1]).toEqual([25, 30]);
    expect(LEVEL_SCALE).toBeGreaterThan(0);
  });

  LEVELS.forEach((L, i) => {
    it(`level ${i + 1} (${L.name}) is laid out sensibly`, () => {
      const s = createLevel(L);
      for (const d of s.dominoes) expect(blockedAt(s, d.x, d.y, d.id)).toBe(null);
      for (const g of s.goals) {
        expect(g.x).toBeGreaterThan(0);
        expect(g.x).toBeLessThan(L.w);
        expect(g.y).toBeGreaterThan(0);
        expect(g.y).toBeLessThan(L.h);
      }
      expect(L.par).toBeLessThan(twoStar(L));
      expect(L.supply).toBeGreaterThan(twoStar(L));
    });

    it(`level ${i + 1} (${L.name}): the bot wins within par, and a broken try does not`, () => {
      const s = solve(L);
      expect(s.status).toBe('won');
      expect(s.goals.every((g) => g.fired)).toBe(true);
      expect(used(s)).toBeLessThanOrEqual(L.par);
      expect(s.stars).toBe(3);
      const b = solve(L, brokenRoute(L.route));
      expect(b.status).toBe('stopped');
      expect(b.breaks.length).toBeGreaterThan(0);
      expect(b.goals.some((g) => !g.fired)).toBe(true);
      // and flicking an empty table never wins
      const empty = playOut(createLevel(L));
      expect(empty.status).toBe('stopped');
    });
  });
});
