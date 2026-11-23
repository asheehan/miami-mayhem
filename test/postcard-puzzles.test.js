import { describe, it, expect } from 'vitest';
import { SCENES } from '../src/games/postcard-puzzles/scenes/index.js';
import {
  SIZES, PIC_W, PIC_H, SNAP_FRAC, makeCut, pieceSides, tracePiece, createPuzzle, computeLayout, pickUp, dragTo, drop,
  pieceAt, pieceScale, isComplete, autosolve, hintPiece, tick, relayout, toScreen, homeOf, liftUp, snapDistance,
  normalizeProgress, loadProgress, saveProgress, recordDone, SAVE_KEY, HINT_DELAY, seedFor,
} from '../src/games/postcard-puzzles/puzzle.js';

const SCREENS = [[820, 1180], [390, 844]];
const IDS = SCENES.map((s) => s.id);

// Moves the held piece so its centre lands at picture point (px, py), as a finger would.
function carryTo(s, px, py) {
  const c = toScreen(s.layout, px, py);
  dragTo(s, c.x, c.y + liftUp(s));
}

function grab(s, i) {
  const p = s.pieces[i];
  const c = toScreen(s.layout, p.x, p.y);
  // bring it to the top first so nothing covers it
  s.order = s.order.filter((j) => j !== i).concat(i);
  return pickUp(s, c.x, c.y);
}

describe('the cut', () => {
  it('has the right number of pieces for each size', () => {
    for (const sz of SIZES) {
      const cut = makeCut(sz.cols, sz.rows, 7);
      expect(cut.pieces.length).toBe(sz.n);
      expect(sz.cols * sz.rows).toBe(sz.n);
      expect(cut.cw * sz.cols).toBeCloseTo(PIC_W);
      expect(cut.ch * sz.rows).toBeCloseTo(PIC_H);
    }
  });

  it('gives every internal edge exactly one tab and one matching blank, and flat borders', () => {
    for (const sz of SIZES) {
      for (const seed of [1, 99, 123456]) {
        const cut = makeCut(sz.cols, sz.rows, seed);
        const at = (c, r) => cut.pieces[r * sz.cols + c];
        for (const p of cut.pieces) {
          const { top, right, bottom, left } = p.edges;
          if (p.row === 0) expect(top.type).toBe(0);
          if (p.row === sz.rows - 1) expect(bottom.type).toBe(0);
          if (p.col === 0) expect(left.type).toBe(0);
          if (p.col === sz.cols - 1) expect(right.type).toBe(0);
          if (p.col < sz.cols - 1) {
            const q = at(p.col + 1, p.row);
            expect(Math.abs(right.type)).toBe(1);
            expect(q.edges.left.type).toBe(-right.type);
            expect(q.edges.left.edge).toBe(right.edge);
          }
          if (p.row < sz.rows - 1) {
            const q = at(p.col, p.row + 1);
            expect(Math.abs(bottom.type)).toBe(1);
            expect(q.edges.top.type).toBe(-bottom.type);
            expect(q.edges.top.edge).toBe(bottom.edge);
          }
        }
      }
    }
  });

  it('traces the same curve on both sides of a shared edge', () => {
    const cut = makeCut(3, 4, 5);
    const pts = (segs, ox, oy) => segs.flatMap((g) => {
      const out = [];
      for (let k = 0; k < g.length; k += 2) out.push(`${(g[k] + ox).toFixed(3)},${(g[k + 1] + oy).toFixed(3)}`);
      return out;
    });
    const key = (x, y) => `${x.toFixed(3)},${y.toFixed(3)}`;
    for (const p of cut.pieces) {
      if (p.col >= 2) continue;
      const q = cut.pieces[p.i + 1];
      // A's right side starts at its top-right corner; B's left side starts at its
      // bottom-left corner (the same points one cell over) and runs the other way.
      const a = new Set([key(cut.cw, 0), ...pts(pieceSides(cut, p.i).right, 0, 0)]);
      const b = new Set([key(cut.cw, cut.ch), ...pts(pieceSides(cut, q.i).left, cut.cw, 0)]);
      expect([...a].sort()).toEqual([...b].sort());
      expect(a.size).toBeGreaterThan(10);
    }
  });

  it('puts knobs outward for a tab and inward for a blank', () => {
    const cut = makeCut(2, 3, 11);
    for (const p of cut.pieces) {
      if (p.edges.right.type === 0) continue;
      const xs = pieceSides(cut, p.i).right.flatMap((g) => g.filter((_, k) => k % 2 === 0));
      const far = p.edges.right.type > 0 ? Math.max(...xs) : Math.min(...xs);
      if (p.edges.right.type > 0) expect(far).toBeGreaterThan(cut.cw + cut.tab * 0.8);
      else expect(far).toBeLessThan(cut.cw - cut.tab * 0.8);
    }
  });

  it('is the same every time for a seed, and different for another seed', () => {
    const sig = (cut) => JSON.stringify(cut.pieces.map((p) => Object.values(p.edges).map((e) => [e.type, e.edge ? e.edge.at.toFixed(5) : 0])));
    for (const sz of SIZES) {
      expect(sig(makeCut(sz.cols, sz.rows, 42))).toBe(sig(makeCut(sz.cols, sz.rows, 42)));
      expect(sig(makeCut(sz.cols, sz.rows, 42))).not.toBe(sig(makeCut(sz.cols, sz.rows, 43)));
    }
    expect(seedFor('lifeguard', 6)).toBe(seedFor('lifeguard', 6));
    expect(seedFor('lifeguard', 6)).not.toBe(seedFor('lifeguard', 12));
  });

  it('traces a closed outline through any path-like target', () => {
    const calls = [];
    const target = new Proxy({}, { get: (_, k) => (...a) => calls.push([k, ...a]) });
    tracePiece(target, makeCut(4, 6, 3), 9, 2, 10, 10);
    expect(calls[0][0]).toBe('moveTo');
    expect(calls.filter((c) => c[0] === 'bezierCurveTo').length).toBeGreaterThan(10);
  });
});

describe('layout and scatter', () => {
  it('starts every piece fully on screen, in the tray, and never on its home', () => {
    for (const [w, h] of SCREENS) {
      for (const sz of SIZES) {
        for (const id of IDS.slice(0, 4)) {
          const s = createPuzzle({ sceneId: id, size: sz.n, w, h });
          const L = s.layout;
          for (const p of s.pieces) {
            const c = toScreen(L, p.x, p.y);
            const k = pieceScale(s, p);
            const hw = (s.cut.cw / 2) * k * L.s;
            const hh = (s.cut.ch / 2) * k * L.s;
            expect(c.x - hw).toBeGreaterThanOrEqual(0);
            expect(c.x + hw).toBeLessThanOrEqual(w);
            expect(c.y - hh).toBeGreaterThanOrEqual(L.hudH);
            expect(c.y + hh).toBeLessThanOrEqual(h);
            const home = homeOf(s.cut, p.i);
            expect(Math.hypot(p.x - home.x, p.y - home.y)).toBeGreaterThan(snapDistance(s.cut));
            expect(p.placed).toBe(false);
          }
        }
      }
    }
  });

  it('keeps the board on screen and the tray below it in portrait', () => {
    for (const [w, h] of SCREENS) {
      for (const sz of SIZES) {
        const L = computeLayout(w, h, sz);
        expect(L.bx).toBeGreaterThanOrEqual(0);
        expect(L.bx + L.bw).toBeLessThanOrEqual(w);
        expect(L.by + L.bh).toBeLessThanOrEqual(L.tray.y);
        expect(L.tray.y + L.tray.h).toBeLessThanOrEqual(h);
        // pieces stay a usable size for a small finger
        expect(L.trayPx).toBeGreaterThan(44);
        expect((PIC_H / sz.rows) * L.s).toBeGreaterThan(60);
      }
    }
  });

  it('keeps loose pieces on screen after a resize', () => {
    const s = createPuzzle({ sceneId: 'reef', size: 12, w: 820, h: 1180 });
    relayout(s, 390, 844);
    for (const p of s.pieces) {
      const c = toScreen(s.layout, p.x, p.y);
      expect(c.x).toBeGreaterThan(0);
      expect(c.x).toBeLessThan(390);
      expect(c.y).toBeGreaterThan(s.layout.hudH);
      expect(c.y).toBeLessThan(844);
    }
  });
});

describe('picking up and snapping', () => {
  it('picks up the top-most piece under the finger', () => {
    const s = createPuzzle({ sceneId: 'lifeguard', size: 6, w: 820, h: 1180 });
    // stack piece 0 on top of piece 1
    s.pieces[0].x = s.pieces[1].x;
    s.pieces[0].y = s.pieces[1].y;
    s.order = [2, 3, 4, 5, 1, 0];
    const c = toScreen(s.layout, s.pieces[1].x, s.pieces[1].y);
    expect(pieceAt(s, c.x, c.y)).toBe(0);
    s.order = [2, 3, 4, 5, 0, 1];
    expect(pickUp(s, c.x, c.y)).toBe(1);
    expect(s.order[s.order.length - 1]).toBe(1);
  });

  it('returns -1 when the finger misses every piece', () => {
    const s = createPuzzle({ sceneId: 'lifeguard', size: 6, w: 820, h: 1180 });
    expect(pickUp(s, 3, 3)).toBe(-1);
    expect(s.held).toBe(null);
  });

  it('snaps and locks a piece dropped within the snap distance of home', () => {
    const s = createPuzzle({ sceneId: 'cruise', size: 12, w: 390, h: 844 });
    const i = 5;
    expect(grab(s, i)).toBe(i);
    const home = homeOf(s.cut, i);
    const d = snapDistance(s.cut) * 0.9;
    carryTo(s, home.x + d * 0.6, home.y - d * 0.7);
    const r = drop(s);
    expect(r).toEqual({ i, placed: true });
    expect(s.pieces[i].placed).toBe(true);
    expect(s.pieces[i].x).toBeCloseTo(home.x);
    expect(s.pieces[i].y).toBeCloseTo(home.y);
    expect(snapDistance(s.cut)).toBeCloseTo(SNAP_FRAC * Math.min(s.cut.cw, s.cut.ch));
  });

  it('leaves a piece where it was dropped when too far from home', () => {
    const s = createPuzzle({ sceneId: 'cruise', size: 12, w: 390, h: 844 });
    const i = 7;
    grab(s, i);
    const home = homeOf(s.cut, i);
    const target = { x: home.x - snapDistance(s.cut) * 1.6, y: home.y };
    carryTo(s, target.x, target.y);
    expect(drop(s)).toEqual({ i, placed: false });
    expect(s.pieces[i].placed).toBe(false);
    expect(s.pieces[i].x).toBeCloseTo(target.x);
    expect(s.pieces[i].y).toBeCloseTo(target.y);
  });

  it('keeps a piece dropped off the edge on screen', () => {
    const s = createPuzzle({ sceneId: 'cruise', size: 6, w: 390, h: 844 });
    grab(s, 0);
    dragTo(s, -500, 5000);
    drop(s);
    const p = s.pieces[0];
    const c = toScreen(s.layout, p.x, p.y);
    const k = pieceScale(s, p);
    expect(c.x - (s.cut.cw / 2) * k * s.layout.s).toBeGreaterThanOrEqual(0);
    expect(c.y + (s.cut.ch / 2) * k * s.layout.s).toBeLessThanOrEqual(844);
  });

  it('a placed piece cannot be picked up again', () => {
    const s = createPuzzle({ sceneId: 'mural', size: 6, w: 820, h: 1180 });
    grab(s, 3);
    const home = homeOf(s.cut, 3);
    carryTo(s, home.x, home.y);
    drop(s);
    const c = toScreen(s.layout, home.x, home.y);
    expect(pieceAt(s, c.x, c.y)).toBe(-1);
    expect(pickUp(s, c.x, c.y)).toBe(-1);
  });

  it('holds the piece above the finger and draws it lifted', () => {
    const s = createPuzzle({ sceneId: 'mural', size: 6, w: 820, h: 1180 });
    grab(s, 1);
    dragTo(s, 400, 600);
    const c = toScreen(s.layout, s.pieces[1].x, s.pieces[1].y);
    expect(c.x).toBeCloseTo(400);
    expect(c.y).toBeLessThan(600);
    expect(pieceScale(s, s.pieces[1])).toBeGreaterThan(1);
  });
});

describe('finishing, hints and autosolve', () => {
  it('is complete only when every piece is placed', () => {
    const s = createPuzzle({ sceneId: 'lighthouse', size: 6, w: 820, h: 1180 });
    for (let i = 0; i < 5; i++) {
      grab(s, i);
      const home = homeOf(s.cut, i);
      carryTo(s, home.x, home.y);
      drop(s);
      expect(isComplete(s)).toBe(false);
      expect(s.status).toBe('play');
    }
    grab(s, 5);
    const home = homeOf(s.cut, 5);
    carryTo(s, home.x, home.y);
    drop(s);
    expect(isComplete(s)).toBe(true);
    expect(s.status).toBe('done');
  });

  it('shows a hint only after a while without a placement', () => {
    const s = createPuzzle({ sceneId: 'lighthouse', size: 12, w: 820, h: 1180 });
    tick(s, HINT_DELAY - 1);
    expect(hintPiece(s)).toBe(-1);
    tick(s, 2);
    const i = hintPiece(s);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(s.pieces[i].placed).toBe(false);
    grab(s, i);
    const home = homeOf(s.cut, i);
    carryTo(s, home.x, home.y);
    drop(s);
    expect(hintPiece(s)).toBe(-1);
  });

  it('autosolve completes every picture at every size on both screens', () => {
    for (const [w, h] of SCREENS) {
      for (const id of IDS) {
        for (const sz of SIZES) {
          const s = createPuzzle({ sceneId: id, size: sz.n, w, h });
          expect(autosolve(s)).toBe(true);
          expect(s.status).toBe('done');
          expect(s.placedCount).toBe(sz.n);
        }
      }
    }
  });
});

describe('saved progress', () => {
  const memory = () => {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
  };

  it('round-trips finished sizes per postcard', () => {
    const st = memory();
    const p = loadProgress(st, IDS);
    expect(p).toEqual({ done: {} });
    recordDone(p, 'reef', 12);
    recordDone(p, 'reef', 6);
    recordDone(p, 'reef', 12);
    recordDone(p, 'skyline', 24);
    saveProgress(st, p);
    expect(JSON.parse(st.m.get(SAVE_KEY))).toEqual({ done: { reef: [6, 12], skyline: [24] } });
    expect(loadProgress(st, IDS)).toEqual({ done: { reef: [6, 12], skyline: [24] } });
  });

  it('tolerates bad or foreign data', () => {
    for (const raw of ['nonsense{', 'null', '42', '[]', '{"done":7}', '{"done":{"reef":"6"}}']) {
      const st = memory();
      st.setItem(SAVE_KEY, raw);
      expect(loadProgress(st, IDS)).toEqual({ done: {} });
    }
    const st = memory();
    st.setItem(SAVE_KEY, JSON.stringify({ done: { reef: [6, 6, '12', 13, null], nowhere: [6], skyline: [] } }));
    expect(loadProgress(st, IDS)).toEqual({ done: { reef: [6, 12] } });
    expect(normalizeProgress(undefined, IDS)).toEqual({ done: {} });
    const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('full'); } };
    expect(loadProgress(broken, IDS)).toEqual({ done: {} });
    expect(() => saveProgress(broken, { done: {} })).not.toThrow();
  });
});

describe('scenes', () => {
  // A ctx stand-in that accepts any call or property and counts the calls.
  function stubCtx() {
    const counts = { calls: 0 };
    const fn = () => {
      counts.calls++;
      return proxy;
    };
    const proxy = new Proxy(fn, {
      get: (_, k) => (k === Symbol.toPrimitive ? () => 1 : k === 'width' ? 100 : proxy),
      set: () => true,
      apply: () => {
        counts.calls++;
        return proxy;
      },
    });
    return { ctx: proxy, counts };
  }

  it('there are at least ten, with unique ids and place names', () => {
    expect(SCENES.length).toBeGreaterThanOrEqual(10);
    expect(new Set(IDS).size).toBe(SCENES.length);
    for (const s of SCENES) expect(typeof s.place).toBe('string');
  });

  it('every scene draws plenty without a DOM', () => {
    for (const s of SCENES) {
      const { ctx, counts } = stubCtx();
      expect(() => s.draw(ctx, PIC_W, PIC_H)).not.toThrow();
      expect(counts.calls).toBeGreaterThan(400);
    }
  });
});
