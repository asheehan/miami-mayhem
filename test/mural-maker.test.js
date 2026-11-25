import { describe, it, expect } from 'vitest';
import { WALL_DEFS, MURAL_DEFS, FREE_DEFS } from '../src/games/mural-maker/murals/index.js';
import { STAMPS, STAMP_IDS } from '../src/games/mural-maker/stamps.js';
import { R, rect, circle, flatten, polyArea, svg, clip, tf, reverse } from '../src/games/mural-maker/murals/kit.js';
import {
  WALL_W, WALL_H, SWATCHES, COLOURS, isPaint, paintFor, paintInfo, compileMural, regionAt, regionPoint, insideRegion,
  createWall, fillRegion, startStroke, extendStroke, endStroke, addStamp, resizeStamp, undo, clearWall, isBlank,
  dripsFor, simplify, encodeWall, decodeWall, serializeProgress, parseProgress, loadProgress, saveProgress, SAVE_KEY,
  WALL_BUDGET, MAX_POINTS, STAMP_MIN, STAMP_MAX, STAMP_SIZE, HISTORY_MAX, finishWall, trySave, SAVE_BUDGETS,
  OWN_MAX, SAVE_SOFT_MAX, isOwnId, ownMural, parseOwn, canAddWall, addOwnWall, removeOwnWall,
} from '../src/games/mural-maker/mural.js';
import {
  PER_PAGE, STREET_COLS, pageCount, pageOf, slotWall, swipeTurn, isTapMove, streetLayout, OWN_PER_PAGE, ownPageCount,
  streetPages, isOwnPage, ownPageOf, streetSlot, addSpot, dotWindow, MAX_DOTS,
} from '../src/games/mural-maker/index.js';

const MURALS = MURAL_DEFS.map(compileMural);
const ALL = WALL_DEFS.map(compileMural);
const MIN_AREA = 1700; // wall units², about 41 x 41: a comfortable finger target on a phone

const memStore = () => {
  const data = {};
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
};

// A long wiggly stroke, as a finger would make it.
function scribble(wall, n, { paint = '3', size = 1, seed = 5, drip = false, x0 = 100, y0 = 100 } = {}) {
  startStroke(wall, { paint, size, x: x0, y: y0, seed, drip });
  for (let k = 1; k < n; k++) extendStroke(wall, x0 + k * 4, y0 + Math.sin(k / 3) * 60 + (k % 7));
  return endStroke(wall);
}

describe('the murals', () => {
  it('has four pages of twelve murals and four free walls, all with unique ids', () => {
    expect(MURAL_DEFS.length).toBe(48);
    expect(MURAL_DEFS.length % PER_PAGE).toBe(0);
    expect(FREE_DEFS.length).toBe(4);
    const ids = WALL_DEFS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of [
      'flamingo', 'gator', 'parrot', 'palm-sunset', 'rocket', 'octopus', 'ice-cream', 'dolphin', 'robot', 'dino', 'lighthouse', 'riley',
      'shark', 'sea-turtle', 'pirate-ship', 'mermaid', 'crab', 'sandcastle', 'monster-truck', 'race-car', 'unicorn', 'dragon', 'astronaut', 'pizza',
      'manatee', 'toucan', 'lifeguard-tower', 'hot-air-balloon', 'fire-truck', 'digger', 'butterfly', 'puppy', 'kitty', 'cupcake', 'castle', 'submarine',
      'narwhal', 'whale', 'penguin', 'lion', 'sloth', 'owl', 'train', 'airplane', 'helicopter', 'garbage-truck', 'tractor', 'donut',
    ]) {
      expect(ids).toContain(id);
    }
    // murals first, free walls last
    expect(WALL_DEFS.slice(0, MURAL_DEFS.length).every((d) => !d.free)).toBe(true);
    expect(WALL_DEFS.slice(MURAL_DEFS.length).every((d) => d.free)).toBe(true);
  });

  it('gives each mural plenty to colour', () => {
    for (const m of MURALS) {
      expect(m.regions.length, m.id).toBeGreaterThanOrEqual(10);
      expect(m.regions.length, m.id).toBeLessThanOrEqual(18);
    }
  });

  it('builds every region from closed paths with real area, inside the wall', () => {
    for (const m of ALL) {
      for (const r of m.regions) {
        expect(r.shapes.length, `${m.id} #${r.index}`).toBeGreaterThan(0);
        for (const s of r.shapes) {
          expect(s.open, `${m.id} #${r.index} is closed`).toBe(false);
          expect(s.d[0][0]).toBe('M');
          const p = flatten(s);
          expect(p.length).toBeGreaterThanOrEqual(6);
          expect(Math.abs(polyArea(p)), `${m.id} #${r.index} has area`).toBeGreaterThan(50);
          for (let k = 0; k < p.length; k += 2) {
            expect(p[k]).toBeGreaterThanOrEqual(-0.5);
            expect(p[k]).toBeLessThanOrEqual(WALL_W + 0.5);
            expect(p[k + 1]).toBeGreaterThanOrEqual(-0.5);
            expect(p[k + 1]).toBeLessThanOrEqual(WALL_H + 0.5);
          }
        }
      }
    }
  });

  it('starts every mural with a region covering the whole wall, so every tap hits something', () => {
    for (const m of ALL) {
      for (let y = 4; y < WALL_H; y += 37) {
        for (let x = 4; x < WALL_W; x += 41) expect(regionAt(m, x, y), `${m.id} ${x},${y}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('can hit every region: a point inside it resolves to it, with room for a finger', () => {
    for (const m of ALL) {
      for (const r of m.regions) {
        const p = regionPoint(m, r.index);
        expect(Number.isFinite(p.x), `${m.id} #${r.index} visible`).toBe(true);
        expect(regionAt(m, p.x, p.y)).toBe(r.index);
        expect(insideRegion(r, p.x, p.y)).toBe(true);
        expect(p.area, `${m.id} #${r.index} visible area`).toBeGreaterThanOrEqual(MIN_AREA);
      }
    }
  });

  it('resolves overlapping regions to the top-most one', () => {
    const m = compileMural({ id: 't', items: [R(rect(0, 0, 600, 800)), R(circle(300, 300, 100)), R(circle(340, 300, 60))] });
    expect(regionAt(m, 340, 300)).toBe(2);
    expect(regionAt(m, 220, 300)).toBe(1);
    expect(regionAt(m, 20, 20)).toBe(0);
    expect(regionAt(m, 700, 20)).toBe(-1);
    // in a real mural: the flamingo's wing sits on its body, the rocket's window on its body
    const fl = MURALS.find((x) => x.id === 'flamingo');
    const wing = fl.regions.findIndex((r, i) => i > 0 && insideRegion(r, 360, 372) && fl.regions.slice(0, i).some((q) => q.index > 0 && insideRegion(q, 360, 372)));
    expect(wing).toBeGreaterThan(0);
    expect(regionAt(fl, 360, 372)).toBe(wing);
    const rk = MURALS.find((x) => x.id === 'rocket');
    const hits = rk.regions.filter((r) => insideRegion(r, 300, 300)).map((r) => r.index);
    expect(hits.length).toBeGreaterThan(2);
    expect(regionAt(rk, 300, 300)).toBe(Math.max(...hits));
  });

  it('treats holes as holes (even-odd regions like the R)', () => {
    const m = compileMural({ id: 't', items: [R(rect(0, 0, 600, 800)), R([rect(100, 100, 200, 200), rect(150, 150, 100, 100)], { evenodd: true })] });
    expect(regionAt(m, 120, 120)).toBe(1);
    expect(regionAt(m, 200, 200)).toBe(0);
  });

  it('unions overlapping shapes in one region whichever way they were drawn', () => {
    const a = rect(100, 100, 200, 200);
    const b = reverse(rect(200, 200, 200, 200));
    const m = compileMural({ id: 't', items: [R(rect(0, 0, 600, 800)), R([a, b])] });
    expect(regionAt(m, 250, 250)).toBe(1);
    expect(regionAt(m, 350, 350)).toBe(1);
    expect(regionAt(m, 150, 150)).toBe(1);
  });

  it('gives every mural a celebration where each moving part names real regions', () => {
    for (const m of MURALS) {
      expect(m.alive, m.id).toBeTruthy();
      const parts = Object.keys(m.alive.parts || {});
      expect(parts.length, m.id).toBeGreaterThan(0);
      for (const p of parts) {
        expect(m.items.some((it) => it.part === p), `${m.id} ${p}`).toBe(true);
        for (const t of [0, 0.5, 1.7, 3, 4.4]) {
          const f = m.alive.parts[p](t);
          for (const v of Object.values(f)) expect(Number.isFinite(v)).toBe(true);
        }
      }
    }
  });
});

describe('the kit', () => {
  it('parses path strings with curves, relative moves and closing', () => {
    const [s] = svg('M10 10 l20 0 Q40 20 30 30 T10 30 C5 25 5 15 10 10 Z');
    expect(s.open).toBe(false);
    expect(s.d.map((c) => c[0])).toEqual(['M', 'L', 'C', 'C', 'C']);
    expect(s.d[1].slice(1)).toEqual([30, 10]);
    expect(svg('M0 0 L10 10')[0].open).toBe(true);
  });

  it('clips a shape to a convex window, keeping only what is inside', () => {
    const c = clip(circle(100, 100, 50), rect(0, 0, 100, 200));
    const p = flatten(c);
    for (let k = 0; k < p.length; k += 2) expect(p[k]).toBeLessThanOrEqual(100.001);
    expect(Math.abs(polyArea(p))).toBeCloseTo((Math.PI * 2500) / 2, -2);
  });

  it('moves shapes about a pivot', () => {
    const s = tf(rect(0, 0, 10, 10), { r: 90, ox: 0, oy: 0, x: 5 });
    expect(s.d[1][1]).toBeCloseTo(5);
    expect(s.d[1][2]).toBeCloseTo(10);
  });
});

describe('paints', () => {
  it('has twelve colours, rainbow, glitter, stripes and dots', () => {
    expect(COLOURS.length).toBe(12);
    expect(SWATCHES.length).toBe(16);
    expect(SWATCHES.slice(-4)).toEqual(['r', 'g', 's', 'd']);
    for (const s of SWATCHES) expect(isPaint(paintFor(s, 3))).toBe(true);
    expect(paintFor('s', 4)).toBe('s4');
    expect(paintInfo('s4')).toMatchObject({ kind: 'stripes', c: COLOURS[4] });
    expect(paintInfo('d10').c2).not.toBe('#ffffff'); // white dots on white would vanish
    for (const bad of ['', 'x', '12', 's12', null, 3, 'rr']) expect(isPaint(bad)).toBe(false);
  });
});

describe('filling, undo and clear', () => {
  const m = MURALS.find((x) => x.id === 'flamingo');

  it('fills a region, ignores a repeat, and undoes back to blank', () => {
    const w = createWall(m);
    expect(fillRegion(w, 2, '4')).toEqual({ changed: true });
    expect(fillRegion(w, 2, '4').changed).toBe(false);
    fillRegion(w, 2, 'r');
    expect(w.fills[2]).toBe('r');
    expect(undo(w)).toBe('fills');
    expect(w.fills[2]).toBe('4');
    expect(undo(w)).toBe('fills');
    expect(w.fills[2]).toBe(null);
    expect(undo(w)).toBe(null);
  });

  it('never finishes a free wall, however it is painted', () => {
    const w = createWall(compileMural(FREE_DEFS[0]));
    expect(fillRegion(w, 0, '5')).toEqual({ changed: true });
    expect(w.done).toBe(false);
    expect(finishWall(w)).toBe(false);
    expect(w.done).toBe(false);
  });

  it('rejects bad regions and paints', () => {
    const w = createWall(m);
    expect(fillRegion(w, -1, '1').changed).toBe(false);
    expect(fillRegion(w, 99, '1').changed).toBe(false);
    expect(fillRegion(w, 0, 'purple').changed).toBe(false);
  });

  it('never finishes a mural by filling it, however much is coloured', () => {
    for (const mm of MURALS) {
      const w = createWall(mm);
      mm.regions.forEach((r, i) => expect(fillRegion(w, i, String(i % 12))).toEqual({ changed: true }));
      expect(w.done, mm.id).toBe(false);
    }
  });

  it('finishes a mural when Done is pressed: once, not when blank, and the star survives clear and save', () => {
    const w = createWall(m);
    expect(finishWall(w)).toBe(false); // blank: nothing to finish
    expect(w.done).toBe(false);
    fillRegion(w, 1, '3');
    expect(finishWall(w)).toBe(true);
    expect(w.done).toBe(true);
    expect(finishWall(w)).toBe(false); // again: no second star
    expect(w.done).toBe(true);
    clearWall(w);
    expect(w.done).toBe(true);
    // a spray stroke alone is enough to say done
    const s2 = createWall(m);
    scribble(s2, 5);
    expect(finishWall(s2)).toBe(true);
    // round trip
    const p = parseProgress(null, ALL);
    p.walls.flamingo = w;
    const back = parseProgress(serializeProgress(p), ALL);
    expect(back.walls.flamingo.done).toBe(true);
    // free walls and his own walls never finish
    for (const fm of [compileMural(FREE_DEFS[0]), ownMural('own-3')]) {
      const fw = createWall(fm);
      fillRegion(fw, 0, '2');
      expect(finishWall(fw)).toBe(false);
      expect(fw.done).toBe(false);
    }
  });

  it('clears the whole wall and brings it all back with undo', () => {
    const w = createWall(m);
    fillRegion(w, 1, '2');
    scribble(w, 20);
    addStamp(w, { kind: 'star', x: 300, y: 300, paint: '1' });
    expect(clearWall(w)).toBe(true);
    expect(w.fills.every((f) => f === null)).toBe(true);
    expect(w.marks.length).toBe(0);
    expect(clearWall(w)).toBe(false); // nothing to clear
    expect(undo(w)).toBe('all');
    expect(w.fills[1]).toBe('2');
    expect(w.marks.length).toBe(2);
  });

  it('keeps a limited history', () => {
    const w = createWall(m);
    for (let k = 0; k < HISTORY_MAX + 30; k++) fillRegion(w, 1, String(k % 12));
    expect(w.history.length).toBe(HISTORY_MAX);
  });
});

describe('spray strokes', () => {
  const m = MURALS[0];

  it('adds a point only once the finger has moved, and undoes a stroke whole', () => {
    const w = createWall(m);
    startStroke(w, { paint: '0', x: 10, y: 10, seed: 3 });
    expect(extendStroke(w, 11, 10)).toBe(null);
    expect(extendStroke(w, 20, 10)).toEqual({ mark: w.marks[0], from: 0 });
    expect(extendStroke(w, 30, 12).from).toBe(1);
    endStroke(w);
    expect(extendStroke(w, 50, 50)).toBe(null); // no live stroke
    expect(undo(w)).toBe('marks');
    expect(w.marks.length).toBe(0);
  });

  it('splits a very long stroke into capped pieces that undo together', () => {
    const w = createWall(m);
    scribble(w, MAX_POINTS * 3);
    expect(w.marks.length).toBeGreaterThan(2);
    for (const mk of w.marks) expect(mk.q.length / 2).toBeLessThanOrEqual(MAX_POINTS);
    // pieces join up end to start
    for (let k = 1; k < w.marks.length; k++) {
      const a = w.marks[k - 1].q;
      expect(w.marks[k].q.slice(0, 2)).toEqual(a.slice(-2));
    }
    expect(undo(w)).toBe('marks');
    expect(w.marks.length).toBe(0);
  });

  it('simplifies straight runs to their ends and keeps corners', () => {
    const line = [];
    for (let k = 0; k <= 50; k++) line.push(k * 4, 100);
    expect(simplify(line, 1)).toEqual([0, 100, 200, 100]);
    const corner = [0, 0, 50, 0, 100, 0, 100, 50, 100, 100];
    expect(simplify(corner, 1)).toEqual([0, 0, 100, 0, 100, 100]);
    const w = createWall(m);
    startStroke(w, { paint: '0', x: 0, y: 0, seed: 1 });
    for (let k = 1; k <= 40; k++) extendStroke(w, k * 5, 0);
    expect(endStroke(w).q).toEqual([0, 0, 200, 0]);
  });

  it('keeps points as whole wall units, near the wall', () => {
    const w = createWall(m);
    startStroke(w, { paint: '0', x: 10.6, y: -500, seed: 1 });
    extendStroke(w, 2000.2, 50.4);
    for (const v of w.marks[0].q) expect(Number.isInteger(v)).toBe(true);
    expect(Math.min(...w.marks[0].q)).toBeGreaterThanOrEqual(-60);
    expect(Math.max(...w.marks[0].q)).toBeLessThanOrEqual(WALL_W + 60);
  });

  it('makes the same drips every time, only when drips are on', () => {
    const w = createWall(m);
    const a = scribble(w, 60, { drip: true, seed: 9 });
    const b = scribble(w, 60, { drip: false, seed: 9 });
    expect(dripsFor(b)).toEqual([]);
    const d = dripsFor(a);
    expect(d.length).toBeGreaterThan(0);
    expect(dripsFor(a)).toEqual(d);
    for (const x of d) {
      expect(x.len).toBeGreaterThan(0);
      expect(x.w).toBeGreaterThan(0);
    }
  });
});

describe('stamps', () => {
  it('has the stamp set, each a closed shape inside its box', () => {
    for (const id of ['star', 'heart', 'smiley', 'bolt', 'palm', 'flamingo', 'crab']) expect(STAMP_IDS).toContain(id);
    for (const s of STAMPS) {
      const c = compileMural({ id: s.id, items: s.items });
      expect(c.regions.length, s.id).toBeGreaterThan(0);
      for (const r of c.regions) {
        for (const sh of r.shapes) expect(sh.open).toBe(false);
        expect(r.box.x).toBeGreaterThanOrEqual(-55);
        expect(r.box.y).toBeGreaterThanOrEqual(-55);
        expect(r.box.x + r.box.w).toBeLessThanOrEqual(55);
        expect(r.box.y + r.box.h).toBeLessThanOrEqual(55);
      }
      expect(regionAt(c, 0, 4) >= 0 || regionAt(c, 0, 20) >= 0 || regionAt(c, 0, -20) >= 0, s.id).toBe(true);
    }
  });

  it('puts a stamp down at a tap, sizes it by dragging within limits, and undoes it', () => {
    const w = createWall(compileMural(FREE_DEFS[0]));
    const s = addStamp(w, { kind: 'crab', x: 200.4, y: 300.6, paint: 'r', seed: 4 });
    expect(s).toMatchObject({ t: 'm', k: 'crab', p: 'r', x: 200, y: 301, z: STAMP_SIZE });
    expect(Math.abs(s.a)).toBeLessThanOrEqual(14);
    expect(addStamp(createWall(compileMural(FREE_DEFS[0])), { kind: 'crab', x: 0, y: 0, paint: 'r', seed: 4 }).a).toBe(s.a);
    resizeStamp(s, 5);
    expect(s.z).toBe(STAMP_MIN);
    resizeStamp(s, 5000);
    expect(s.z).toBe(STAMP_MAX);
    expect(undo(w)).toBe('marks');
    expect(w.marks).toEqual([]);
  });
});

describe('saved progress', () => {
  const ids = ALL.map((m) => m.id);

  it('loads fresh, blank walls for everything when nothing is saved or the save is junk', () => {
    for (const text of [null, '', '{', '[]', '{"walls":5}', '{"walls":{"rocket":{"f":"x","m":{}}}}']) {
      const p = parseProgress(text, ALL);
      expect(Object.keys(p.walls).sort()).toEqual([...ids].sort());
      for (const w of Object.values(p.walls)) {
        expect(w.marks).toEqual([]);
        expect(w.fills.every((f) => f === null)).toBe(true);
      }
    }
  });

  it('round-trips fills, strokes, stamps and stickers', () => {
    const store = memStore();
    const p = parseProgress(null, ALL);
    const rocket = p.walls.rocket;
    const rm = ALL.find((m) => m.id === 'rocket');
    rm.regions.forEach((_, i) => fillRegion(rocket, i, i % 2 ? 'g' : 's5'));
    scribble(rocket, 30, { paint: 'r', size: 2, seed: 77 });
    finishWall(rocket);
    const free = p.walls.free2;
    scribble(free, 40, { paint: 'd3', drip: true, seed: 12 });
    addStamp(free, { kind: 'heart', x: 100, y: 120, size: 260, paint: '8', seed: 2 });
    expect(saveProgress(store, p)).toBeGreaterThan(0);
    const back = loadProgress(store, ALL);
    expect(back.walls.rocket.fills).toEqual(rocket.fills);
    expect(back.walls.rocket.done).toBe(true);
    expect(back.walls.rocket.marks).toEqual(rocket.marks.map((mk) => ({ ...mk })));
    expect(back.walls.free2.marks).toEqual(free.marks);
    expect(back.walls.flamingo.marks).toEqual([]);
    // only walls with something on them are written
    expect(Object.keys(JSON.parse(store.data[SAVE_KEY]).walls).sort()).toEqual(['free2', 'rocket']);
  });

  it('stores stroke points compactly as whole-number steps', () => {
    const w = createWall(MURALS[0]);
    scribble(w, 100);
    const enc = encodeWall(w);
    const q = enc.m[0].q;
    expect(q.every(Number.isInteger)).toBe(true);
    expect(Math.max(...q.slice(2).map(Math.abs))).toBeLessThan(100);
    expect(decodeWall(enc, MURALS[0]).marks[0].q).toEqual(w.marks[0].q);
  });

  it('keeps one wall under its budget, simplifying first and then dropping the oldest marks', () => {
    const w = createWall(MURALS[0]);
    for (let k = 0; k < 400; k++) scribble(w, 120, { seed: k, x0: k % 300, y0: (k * 7) % 700 });
    const full = JSON.stringify(encodeWall(w, Infinity)).length;
    expect(full).toBeGreaterThan(WALL_BUDGET);
    const enc = encodeWall(w);
    expect(JSON.stringify(enc).length).toBeLessThanOrEqual(WALL_BUDGET);
    const back = decodeWall(enc, MURALS[0]);
    expect(back.marks.length).toBeGreaterThan(0);
    // what's kept is the newest work
    const last = w.marks[w.marks.length - 1];
    expect(back.marks[back.marks.length - 1].s).toBe(last.s);
    // a tight budget still saves something sensible
    const tiny = encodeWall(w, 3000);
    expect(JSON.stringify(tiny).length).toBeLessThanOrEqual(3000);
    expect(tiny.f.length).toBe(MURALS[0].regions.length);
  });

  it('shrinks the save when storage is full, and carries on when it cannot save at all', () => {
    const p = parseProgress(null, ALL);
    for (const id of ['flamingo', 'free1', 'free3']) for (let k = 0; k < 200; k++) scribble(p.walls[id], 100, { seed: k + 1, y0: k * 3 });
    const big = serializeProgress(p).length;
    let writes = 0;
    const cramped = {
      getItem: () => null,
      setItem(k, v) {
        writes++;
        if (v.length > big / 2) throw new Error('QuotaExceededError');
        this.v = v;
      },
    };
    const n = saveProgress(cramped, p);
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(big / 2);
    expect(writes).toBeGreaterThan(1);
    expect(parseProgress(cramped.v, ALL).walls.flamingo.marks.length).toBeGreaterThan(0);
    const broken = { getItem: () => { throw new Error('nope'); }, setItem: () => { throw new Error('nope'); } };
    expect(saveProgress(broken, p)).toBe(0);
    expect(loadProgress(broken, ALL).walls.flamingo.marks).toEqual([]);
  });

  it('drops marks and fills it does not recognise', () => {
    const raw = JSON.stringify({ v: 1, walls: { flamingo: { f: ['1', 'zz', 3], m: [{ t: 's', p: '1', w: 1, s: 1, q: [1, 2, 3] }, { t: 'm', k: 'unicorn', p: '1', x: 1, y: 1, z: 50 }, { t: 'm', k: 'star', p: '1', x: 1, y: 1, z: 9999, a: 3 }] } } });
    const w = parseProgress(raw, ALL).walls.flamingo;
    expect(w.fills.slice(0, 3)).toEqual(['1', null, null]);
    expect(w.marks).toEqual([{ t: 'm', k: 'star', p: '1', x: 1, y: 1, z: STAMP_MAX, a: 3 }]);
  });
});

describe('the street, a page at a time', () => {
  const N = MURAL_DEFS.length;
  const SIZES = [[820, 1180], [1180, 820], [390, 844]];

  it('splits the murals into pages of twelve', () => {
    expect(pageCount(36)).toBe(3);
    expect(pageCount(37)).toBe(4);
    expect(pageCount(12)).toBe(1);
    expect(pageCount(0)).toBe(1);
    expect(pageCount(N)).toBe(N / PER_PAGE);
  });

  it('knows which page a mural is on, and that free walls are on every page', () => {
    expect(pageOf(0, 36)).toBe(0);
    expect(pageOf(11, 36)).toBe(0);
    expect(pageOf(12, 36)).toBe(1);
    expect(pageOf(35, 36)).toBe(2);
    expect(pageOf(36, 36)).toBe(-1); // the first free wall
    expect(pageOf(-1, 36)).toBe(-1);
    expect(pageOf(WALL_DEFS.findIndex((d) => d.id === 'dino'), N)).toBe(0);
    expect(pageOf(WALL_DEFS.findIndex((d) => d.id === 'submarine'), N)).toBe(2);
  });

  it('fills each page with its twelve murals and the same free walls along the bottom', () => {
    const seen = new Set();
    for (let p = 0; p < pageCount(N); p++) {
      const slots = Array.from({ length: PER_PAGE + FREE_DEFS.length }, (_, k) => slotWall(p, k, N));
      for (const i of slots.slice(0, PER_PAGE)) {
        expect(WALL_DEFS[i].free).toBeFalsy();
        expect(pageOf(i, N)).toBe(p);
        seen.add(i);
      }
      expect(slots.slice(PER_PAGE).map((i) => WALL_DEFS[i].id)).toEqual(FREE_DEFS.map((d) => d.id));
    }
    expect(seen.size).toBe(N);
    // a short last page leaves its spare slots empty
    expect(slotWall(1, 5, 15)).toBe(-1);
    expect(slotWall(1, 2, 15)).toBe(14);
    expect(slotWall(1, 12, 15)).toBe(15);
  });

  it('turns the page for a sideways swipe only', () => {
    expect(swipeTurn(-200, 10, 820)).toBe(1);
    expect(swipeTurn(200, -20, 820)).toBe(-1);
    expect(swipeTurn(30, 0, 820)).toBe(0); // too short
    expect(swipeTurn(-120, 200, 820)).toBe(0); // mostly up and down
    expect(swipeTurn(-50, 0, 390)).toBe(1); // a phone needs less
    expect(isTapMove(3, -4)).toBe(true);
    expect(isTapMove(40, 0)).toBe(false);
  });

  it('lays the street out with everything on screen, big arrows clear of the bottom edge', () => {
    for (const [w, h] of SIZES) {
      const L = streetLayout(w, h, 3);
      expect(L.slots.length).toBe(PER_PAGE + STREET_COLS);
      const all = [L.home, L.prev, L.next, L.dots, ...L.slots];
      for (const b of all) {
        expect(b.x, `${w}x${h}`).toBeGreaterThanOrEqual(0);
        expect(b.y).toBeGreaterThanOrEqual(0);
        expect(b.x + b.w).toBeLessThanOrEqual(w);
        expect(b.y + b.h).toBeLessThanOrEqual(h - 40);
      }
      for (const b of [L.prev, L.next, L.dots]) {
        expect(b.h, `${w}x${h} ${b.id}`).toBeGreaterThanOrEqual(52);
        expect(b.w).toBeGreaterThanOrEqual(52);
        // nothing else under the page controls
        for (const s of L.slots) expect(s.y + s.h).toBeLessThan(b.y);
      }
      // arrows either side of the dots, not overlapping
      expect(L.prev.x + L.prev.w).toBeLessThan(L.dots.x);
      expect(L.next.x).toBeGreaterThan(L.dots.x + L.dots.w);
      // tiles are all the same size, a 3:4 wall, in a 4 x 4 grid with the free walls last
      for (const s of L.slots) {
        expect(s.w).toBeCloseTo(L.slots[0].w);
        expect(s.h / s.w).toBeCloseTo(WALL_H / WALL_W);
        expect(s.w).toBeGreaterThanOrEqual(60);
      }
      expect(Math.max(...L.slots.map((s) => s.row))).toBe(PER_PAGE / STREET_COLS);
      expect(L.slots.slice(PER_PAGE).every((s) => s.row === PER_PAGE / STREET_COLS)).toBe(true);
    }
  });
});

describe('walls of his own', () => {
  const fresh = () => parseProgress(null, ALL);

  it('starts with none, and adds blank free walls in order with fresh ids', () => {
    const p = fresh();
    expect(p.own).toEqual({ ids: [], next: 0 });
    const a = addOwnWall(p);
    const b = addOwnWall(p);
    expect([a, b]).toEqual(['own-0', 'own-1']);
    expect(p.own.ids).toEqual(['own-0', 'own-1']);
    const w = p.walls[a];
    expect(w.free).toBe(true);
    expect(w.fills).toEqual([null]);
    expect(isBlank(w)).toBe(true);
    // one big region covering the wall, like the free walls
    const m = ownMural(a);
    expect(m.free).toBe(true);
    expect(m.regions.length).toBe(1);
    expect(regionAt(m, 5, 5)).toBe(0);
    expect(regionAt(m, WALL_W - 5, WALL_H - 5)).toBe(0);
    // drips work on them
    const mk = scribble(w, 40, { drip: true, seed: 3 });
    expect(dripsFor(mk).length).toBeGreaterThan(0);
  });

  it('removes a wall, shifts the rest up, and never reuses an id', () => {
    const p = fresh();
    for (let k = 0; k < 4; k++) addOwnWall(p);
    expect(removeOwnWall(p, 'own-1')).toBe(1);
    expect(p.own.ids).toEqual(['own-0', 'own-2', 'own-3']);
    expect(p.walls['own-1']).toBeUndefined();
    expect(removeOwnWall(p, 'own-3')).toBe(2);
    expect(addOwnWall(p)).toBe('own-4'); // not own-3 again
    expect(p.own.ids).toEqual(['own-0', 'own-2', 'own-4']);
    // murals, the free walls and unknown ids can't be removed
    for (const id of ['flamingo', 'free1', 'own-99', 'nope', null]) expect(removeOwnWall(p, id)).toBe(-1);
    expect(p.walls.flamingo).toBeTruthy();
    expect(p.walls.free1).toBeTruthy();
    // and the counter survives a save, even after the newest wall is removed
    removeOwnWall(p, 'own-4');
    const back = parseProgress(serializeProgress(p), ALL);
    expect(back.own).toEqual({ ids: ['own-0', 'own-2'], next: 5 });
    expect(addOwnWall(back)).toBe('own-5');
  });

  it('round-trips his walls, painted and blank, in order', () => {
    const store = memStore();
    const p = fresh();
    const ids = [addOwnWall(p), addOwnWall(p), addOwnWall(p)];
    scribble(p.walls[ids[0]], 30, { paint: 'r', drip: true, seed: 4 });
    fillRegion(p.walls[ids[2]], 0, 'd5');
    addStamp(p.walls[ids[2]], { kind: 'star', x: 200, y: 300, paint: '1', seed: 7 });
    expect(saveProgress(store, p)).toBeGreaterThan(0);
    const back = loadProgress(store, ALL);
    expect(back.own.ids).toEqual(ids);
    expect(back.walls[ids[0]].marks).toEqual(p.walls[ids[0]].marks);
    expect(isBlank(back.walls[ids[1]])).toBe(true);
    expect(back.walls[ids[2]].fills).toEqual(['d5']);
    expect(back.walls[ids[2]].marks.length).toBe(1);
    // blank walls are listed but cost nothing more
    expect(Object.keys(JSON.parse(store.data[SAVE_KEY]).walls).sort()).toEqual([ids[0], ids[2]].sort());
  });

  it('loads an old save (from before own walls) unchanged, and writes it back the same', () => {
    const p = fresh();
    scribble(p.walls.free2, 20, { seed: 2 });
    fillRegion(p.walls.rocket, 0, '4');
    delete p.own; // as the old game had it
    const oldText = serializeProgress(p);
    expect(JSON.parse(oldText).own).toBeUndefined();
    const back = parseProgress(oldText, ALL);
    expect(back.own).toEqual({ ids: [], next: 0 });
    expect(back.walls.free2.marks).toEqual(p.walls.free2.marks);
    expect(back.walls.rocket.fills[0]).toBe('4');
    expect(serializeProgress(back)).toBe(oldText);
  });

  it('ignores garbage in the own-walls part of a save', () => {
    const walls = { 'own-2': { f: ['3'], m: [] }, 'own-9': { f: ['4'], m: [] }, 'own-x': { f: ['1'] } };
    for (const own of [null, 5, 'x', [], { ids: 'no' }, { ids: [1, null, {}, 'flamingo', 'own-', 'own-1.5', 'own--1', 'OWN-1', 'own-12345678901'] }]) {
      const p = parseProgress(JSON.stringify({ v: 1, walls, own }), ALL);
      expect(p.own.ids, JSON.stringify(own)).toEqual([]);
      expect(p.walls['own-2']).toBeUndefined();
      expect(p.walls.flamingo).toBeTruthy();
    }
    const p = parseProgress(JSON.stringify({ v: 1, walls: { ...walls, 'own-3': 'junk' }, own: { n: 'lots', ids: ['own-2', 'own-2', 'own-3', 7, 'own-9'] } }), ALL);
    expect(p.own.ids).toEqual(['own-2', 'own-3', 'own-9']); // duplicates and junk dropped
    expect(p.own.next).toBe(10); // past every id seen, whatever n said
    expect(p.walls['own-2'].fills).toEqual(['3']);
    expect(isBlank(p.walls['own-3'])).toBe(true);
    expect(parseOwn({ n: 3, ids: ['own-7'] }).next).toBe(8);
    expect(parseOwn({ n: 20, ids: ['own-7'] }).next).toBe(20);
    // a list longer than the ceiling is cut at it
    const many = Array.from({ length: OWN_MAX + 30 }, (_, k) => `own-${k}`);
    expect(parseOwn({ n: 0, ids: many }).ids.length).toBe(OWN_MAX);
    expect(isOwnId('own-0')).toBe(true);
    expect(isOwnId('free1')).toBe(false);
  });

  it('stops adding at the ceiling, or when storage is filling up, and starts again after a removal', () => {
    const p = fresh();
    for (let k = 0; k < OWN_MAX; k++) expect(addOwnWall(p)).toBeTruthy();
    expect(canAddWall(p)).toBe(false);
    expect(addOwnWall(p)).toBe(null);
    expect(p.own.ids.length).toBe(OWN_MAX);
    removeOwnWall(p, 'own-5');
    expect(canAddWall(p)).toBe(true);
    expect(addOwnWall(p)).toBe(`own-${OWN_MAX}`);
    // storage
    const q = fresh();
    expect(canAddWall(q, null)).toBe(true);
    expect(canAddWall(q, { chars: 1000, budget: WALL_BUDGET })).toBe(true);
    expect(canAddWall(q, { chars: 1000, budget: WALL_BUDGET / 4 })).toBe(false); // had to squeeze
    expect(canAddWall(q, { chars: 0, budget: 0 })).toBe(false); // couldn't save at all
    expect(canAddWall(q, { chars: SAVE_SOFT_MAX + 1, budget: WALL_BUDGET })).toBe(false);
    expect(addOwnWall(q, { chars: 0, budget: 0 })).toBe(null);
  });

  it('fits the ceiling in storage even when every wall is painted heavily', () => {
    // every mural, free wall and own wall at the smallest budget stays well under ~2.5M chars
    const walls = ALL.length + OWN_MAX;
    expect(walls * SAVE_BUDGETS[SAVE_BUDGETS.length - 1]).toBeLessThan(1_000_000);
    expect(SAVE_SOFT_MAX).toBeLessThan(2_500_000);
    // a real heavy save of many walls squeezes down instead of failing
    const p = fresh();
    for (let k = 0; k < 40; k++) {
      const id = addOwnWall(p);
      for (let j = 0; j < 30; j++) scribble(p.walls[id], 120, { seed: k * 50 + j + 1, y0: j * 20 });
    }
    const limit = 400_000;
    const store = { data: null, getItem: () => null, setItem(k, v) { if (v.length > limit) throw new Error('QuotaExceededError'); this.data = v; } };
    const r = trySave(store, p);
    expect(r.chars).toBeGreaterThan(0);
    expect(r.chars).toBeLessThanOrEqual(limit);
    expect(r.budget).toBeLessThan(WALL_BUDGET);
    expect(canAddWall(p, r)).toBe(false);
    expect(parseProgress(store.data, ALL).own.ids.length).toBe(40);
  });

  it('never throws or overwrites the old save when storage refuses', () => {
    const p = fresh();
    addOwnWall(p);
    scribble(p.walls['own-0'], 30);
    const store = memStore();
    store.data[SAVE_KEY] = 'old save';
    const refusing = { getItem: store.getItem, setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(trySave(refusing, p)).toEqual({ chars: 0, budget: 0 });
    expect(store.data[SAVE_KEY]).toBe('old save');
  });
});

describe('the street with his own walls', () => {
  const N = MURAL_DEFS.length;
  const MP = pageCount(N);
  const SIZES = [[820, 1180], [1180, 820], [390, 844]];

  it('keeps the mural pages as they were, then at least one page of his walls', () => {
    expect(MP).toBe(N / PER_PAGE);
    expect(OWN_PER_PAGE).toBe(16);
    expect(streetPages(N, 0)).toBe(MP + 1);
    for (let p = 0; p < MP; p++) {
      expect(isOwnPage(p, N)).toBe(false);
      for (let k = 0; k < OWN_PER_PAGE; k++) expect(streetSlot(p, k, N, 7)).toEqual({ kind: 'wall', index: slotWall(p, k, N) });
    }
    expect(isOwnPage(MP, N)).toBe(true);
    // with none made, the page shows just the '+'
    expect(streetSlot(MP, 0, N, 0)).toEqual({ kind: 'add' });
    for (let k = 1; k < OWN_PER_PAGE; k++) expect(streetSlot(MP, k, N, 0)).toBe(null);
  });

  it('moves the + to a fresh page when a page fills', () => {
    for (const [n, pages, plusPage, plusSlot] of [[0, 1, 0, 0], [1, 1, 0, 1], [15, 1, 0, 15], [16, 2, 1, 0], [17, 2, 1, 1], [31, 2, 1, 15], [32, 3, 2, 0]]) {
      expect(ownPageCount(n), `n=${n}`).toBe(pages);
      expect(streetPages(N, n)).toBe(MP + pages);
      expect(addSpot(n, N)).toEqual({ page: MP + plusPage, slot: plusSlot });
      expect(streetSlot(MP + plusPage, plusSlot, N, n)).toEqual({ kind: 'add' });
    }
    // every wall in order, each exactly once, across the pages
    const n = 37;
    const seen = [];
    for (let p = MP; p < streetPages(N, n); p++) {
      for (let k = 0; k < OWN_PER_PAGE; k++) {
        const it = streetSlot(p, k, N, n);
        if (it && it.kind === 'own') {
          seen.push(it.i);
          expect(ownPageOf(it.i, N)).toBe(p);
        }
      }
    }
    expect(seen).toEqual([...Array(n).keys()]);
    expect(streetSlot(streetPages(N, n), 0, N, n)).toBe(null); // past the end
    expect(ownPageCount(OWN_MAX)).toBe(Math.floor(OWN_MAX / 16) + 1);
  });

  it('shows a window of dots when there are too many pages', () => {
    expect(dotWindow(0, 5, 9)).toEqual({ first: 0, count: 5 });
    expect(dotWindow(0, 20, 5)).toEqual({ first: 0, count: 5 });
    expect(dotWindow(10, 20, 5)).toEqual({ first: 8, count: 5 });
    expect(dotWindow(19, 20, 5)).toEqual({ first: 15, count: 5 });
    for (let page = 0; page < 20; page++) {
      const w = dotWindow(page, 20, 5);
      expect(page).toBeGreaterThanOrEqual(w.first);
      expect(page).toBeLessThan(w.first + w.count);
    }
  });

  it('keeps the street on screen and clear of the bottom edge with many pages', () => {
    for (const [w, h] of SIZES) {
      for (const pages of [MP + 1, MP + 3, streetPages(N, OWN_MAX)]) {
        const L = streetLayout(w, h, pages);
        expect(L.dots.max).toBeGreaterThanOrEqual(3);
        expect(L.dots.max).toBeLessThanOrEqual(MAX_DOTS);
        // each dot gets at least a fingertip's width
        expect(L.dots.w / Math.min(pages, L.dots.max), `${w}x${h} ${pages}`).toBeGreaterThanOrEqual(36);
        for (const b of [L.home, L.prev, L.next, L.dots, ...L.slots]) {
          expect(b.x, `${w}x${h} ${pages} ${b.id}`).toBeGreaterThanOrEqual(0);
          expect(b.y).toBeGreaterThanOrEqual(0);
          expect(b.x + b.w, `${w}x${h} ${pages} ${b.id}`).toBeLessThanOrEqual(w);
          expect(b.y + b.h).toBeLessThanOrEqual(h - 40);
        }
        for (const b of [L.prev, L.next]) expect(b.w, `${w}x${h} ${pages}`).toBeGreaterThanOrEqual(52);
        expect(L.prev.x + L.prev.w).toBeLessThan(L.dots.x);
        expect(L.next.x).toBeGreaterThan(L.dots.x + L.dots.w);
        expect(L.slots.length).toBe(OWN_PER_PAGE);
      }
    }
  });
});
