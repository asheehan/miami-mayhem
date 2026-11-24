import { describe, it, expect } from 'vitest';
import { SCENES, SCENE_IDS, resolveSpot } from '../src/games/iggy-hides/scenes/index.js';
import {
  computeLayout, camBounds, clampCam, dragCam, rubber, stepCamera, centerOn, toWorld, toScreen,
  startGesture, moveGesture, endGesture, isTap, pickRound, createRound, tapTarget, markFound, isComplete,
  remaining, nearestUnfound, useHint, hintReady, hintCharge, idleNudge, starsFor, clash, overlapFrac,
  normalizeProgress, loadProgress, saveProgress, recordStars,
  SAVE_KEY, MIN_HALF, MIN_TAP_PX, TAP_SLOP, HINT_RECHARGE, IDLE_NUDGE, OTHER_MIN, OTHER_MAX, OVERSCROLL,
} from '../src/games/iggy-hides/logic.js';
import { PROPS } from '../src/games/iggy-hides/art/props.js';

const SCREENS = [[820, 1180], [390, 844]];
const TOP_BAND = 110; // world units at the top kept clear for the back button and minimap
const allSpots = (sc) => [...sc.iggy, ...sc.items.flatMap((it) => it.spots)];
const memStore = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
};

// A ctx stand-in that accepts every call and counts drawing calls.
function stubCtx() {
  let calls = 0;
  const grad = { addColorStop() {} };
  const target = {
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    measureText: () => ({ width: 10 }),
    setLineDash() {},
  };
  return new Proxy(target, {
    get(t, k) {
      if (k === 'calls') return calls;
      if (k in t) return t[k];
      return () => {
        calls++;
      };
    },
    set() {
      return true;
    },
  });
}

describe('scenes', () => {
  it('has ten scenes with unique ids', () => {
    expect(SCENES.length).toBe(10);
    expect(new Set(SCENE_IDS).size).toBe(10);
  });

  for (const sc of SCENES) {
    describe(sc.id, () => {
      it('has at least 5 hiding places for Iggy and 15 other things to find', () => {
        expect(sc.iggy.length).toBeGreaterThanOrEqual(5);
        expect(sc.items.length).toBeGreaterThanOrEqual(15);
        expect(new Set(sc.items.map((it) => it.id)).size).toBe(sc.items.length);
        for (const it of sc.items) {
          expect(it.spots.length).toBeGreaterThanOrEqual(it.count);
          expect(PROPS[it.prop] || (sc.props && sc.props[it.prop])).toBeTruthy();
        }
      });

      it('keeps every hit box inside the scene and below the top buttons', () => {
        for (const sp of allSpots(sc)) {
          expect(sp.x - sp.hw).toBeGreaterThanOrEqual(0);
          expect(sp.x + sp.hw).toBeLessThanOrEqual(sc.W);
          expect(sp.y - sp.hh).toBeGreaterThanOrEqual(TOP_BAND);
          expect(sp.y + sp.hh).toBeLessThanOrEqual(sc.H);
        }
      });

      it('makes every hit box a comfortable tap on both screens', () => {
        for (const [w, h] of SCREENS) {
          const L = computeLayout(w, h, sc);
          for (const sp of allSpots(sc)) {
            expect(sp.hw * 2 * L.s).toBeGreaterThanOrEqual(MIN_TAP_PX);
            expect(sp.hh * 2 * L.s).toBeGreaterThanOrEqual(MIN_TAP_PX);
          }
        }
      });

      it('never lets one hiding place make another hard to tap', () => {
        const spots = allSpots(sc);
        const bad = [];
        for (let i = 0; i < spots.length; i++) {
          for (let j = i + 1; j < spots.length; j++) {
            if (clash(spots[i], spots[j])) bad.push(`${Math.round(spots[i].x)},${Math.round(spots[i].y)} vs ${Math.round(spots[j].x)},${Math.round(spots[j].y)}`);
          }
        }
        expect(bad).toEqual([]);
      });

      it('keeps animated actors off the hiding places', () => {
        const bad = [];
        for (const sp of allSpots(sc)) {
          for (const a of sc.actors) {
            if (a.over) continue; // small things passing by (birds, a bike), never parked on a spot
            for (const k of a.keep || [a]) {
              if (Math.abs(sp.x - k.x) < k.hw && Math.abs(sp.y - k.y) < k.hh) bad.push(`${Math.round(sp.x)},${Math.round(sp.y)} under actor at ${k.x},${k.y}`);
            }
          }
        }
        expect(bad).toEqual([]);
      });

      it('draws a full picture, its actors, covers and sticker with no DOM', () => {
        const ctx = stubCtx();
        sc.back(ctx, () => 0.5);
        expect(ctx.calls).toBeGreaterThan(1500);
        for (const a of sc.actors) a.draw(ctx, 1.3, { x0: 0, y0: 0, x1: sc.W, y1: sc.H });
        for (const sp of allSpots(sc)) if (sp.cover) sp.cover(ctx, 0.7);
        sc.sticker(ctx, 50, 0);
        expect(sc.actors.length).toBeGreaterThanOrEqual(10);
      });
    });
  }
});

describe('hit boxes', () => {
  it('grow to the minimum and follow scale and flip', () => {
    const small = resolveSpot({ x: 100, y: 200 }, 'golfball');
    expect(small.hw).toBe(MIN_HALF);
    expect(small.hh).toBe(MIN_HALF);
    const big = resolveSpot({ x: 100, y: 200, s: 2 }, 'iggy-lie');
    expect(big.hw).toBeGreaterThan(100);
    const r = resolveSpot({ x: 100, y: 200, flip: true }, 'iggy-stand');
    const l = resolveSpot({ x: 100, y: 200 }, 'iggy-stand');
    expect(r.px).toBe(100);
    expect(r.y).toBeLessThan(200); // the box is centred on the body, above the feet
    expect(r.y).toBe(l.y);
  });
});

describe('layout and camera', () => {
  const sc = SCENES[0];

  it('makes the scene bigger than the screen both ways and fits the tray', () => {
    for (const [w, h] of SCREENS) {
      const L = computeLayout(w, h, sc, 9);
      expect(sc.W * L.s).toBeGreaterThan(w * 1.8);
      expect(sc.H * L.s).toBeGreaterThan(L.viewH * 1.2);
      expect(L.slots.length).toBe(9);
      for (const s of L.slots) {
        expect(s.x - s.size / 2).toBeGreaterThanOrEqual(0);
        expect(s.x + s.size / 2).toBeLessThan(L.hint.x - L.hint.r);
        expect(s.y - s.size / 2).toBeGreaterThanOrEqual(L.viewH);
        expect(s.y + s.size / 2).toBeLessThanOrEqual(h);
        expect(s.size).toBeGreaterThan(40);
      }
      expect(L.hint.r * 2).toBeGreaterThanOrEqual(80);
    }
    expect(computeLayout(390, 844, sc, 9).rows).toBe(2);
    expect(computeLayout(820, 1180, sc, 9).rows).toBe(1);
  });

  it('clamps the camera to the scene', () => {
    const L = computeLayout(820, 1180, sc);
    const b = camBounds(L, sc);
    expect(b.minX).toBe(0);
    expect(b.maxX).toBeCloseTo(sc.W - 820 / L.s);
    expect(b.maxY).toBeCloseTo(sc.H - L.viewH / L.s);
    expect(clampCam({ x: -50, y: 99999 }, b)).toEqual({ x: 0, y: b.maxY });
    expect(clampCam({ x: 100, y: 100 }, b)).toEqual({ x: 100, y: 100 });
    const c = centerOn(L, b, 0, 0);
    expect(c).toEqual({ x: 0, y: 0 });
  });

  it('centres a scene that is smaller than the view', () => {
    const tiny = { W: 300, H: 200 };
    const L = { w: 820, viewH: 1000, s: 1 };
    const b = camBounds(L, tiny);
    expect(b.minX).toBe(b.maxX);
    expect(b.minX).toBe(-260);
  });

  it('gives softly past the edges and springs back', () => {
    expect(rubber(50, 0, 100, 70)).toBe(50);
    const past = rubber(-1000, 0, 100, 70);
    expect(past).toBeLessThan(0);
    expect(past).toBeGreaterThan(-70);
    const L = computeLayout(820, 1180, sc);
    const b = camBounds(L, sc);
    const cam = dragCam({ x: 0, y: 0 }, 500, 0, L.s, b); // dragging right at the left edge
    expect(cam.x).toBeLessThan(0);
    expect(cam.x * L.s).toBeGreaterThan(-OVERSCROLL);
    const vel = { x: 0, y: 0 };
    for (let i = 0; i < 120; i++) stepCamera(cam, vel, 1 / 60, b);
    expect(cam.x).toBeCloseTo(0, 1);
  });

  it('coasts after a flick and slows to a stop inside the scene', () => {
    const L = computeLayout(820, 1180, sc);
    const b = camBounds(L, sc);
    const cam = { x: 200, y: 100 };
    const vel = { x: 900, y: 0 };
    stepCamera(cam, vel, 1 / 60, b);
    expect(cam.x).toBeGreaterThan(200);
    for (let i = 0; i < 600; i++) stepCamera(cam, vel, 1 / 60, b);
    expect(vel.x).toBe(0);
    expect(cam.x).toBeLessThanOrEqual(b.maxX + 0.01);
  });

  it('maps screen and world points both ways', () => {
    const L = computeLayout(390, 844, sc);
    const cam = { x: 300, y: 200 };
    const w = toWorld(L, cam, 100, 50);
    const s = toScreen(L, cam, w.x, w.y);
    expect(s.x).toBeCloseTo(100);
    expect(s.y).toBeCloseTo(50);
  });
});

describe('tap or pan', () => {
  it('counts a press that barely moves as a tap', () => {
    const g = startGesture(100, 100, 0);
    moveGesture(g, 104, 103, 0.05);
    const r = endGesture(g, 106, 104, 0.12);
    expect(r.tap).toBe(true);
    expect(r.vx).toBe(0);
  });

  it('counts a drag as a pan even if it comes back to where it started', () => {
    const g = startGesture(100, 100, 0);
    moveGesture(g, 100 + TAP_SLOP + 10, 100, 0.1);
    const r = endGesture(g, 101, 100, 0.3);
    expect(r.tap).toBe(false);
    expect(isTap(g)).toBe(false);
  });

  it('measures flick speed from the last moments of the drag', () => {
    const g = startGesture(300, 300, 0);
    moveGesture(g, 280, 300, 0.2);
    moveGesture(g, 260, 300, 0.25);
    const r = endGesture(g, 220, 300, 0.3);
    expect(r.tap).toBe(false);
    expect(r.vx).toBeLessThan(-300);
    expect(Math.abs(r.vy)).toBeLessThan(1);
  });

  it('caps a wild flick', () => {
    const g = startGesture(0, 0, 0);
    const r = endGesture(g, 900, 0, 0.01);
    expect(Math.hypot(r.vx, r.vy)).toBeLessThanOrEqual(4000.01);
  });
});

describe('rounds', () => {
  it('picks the same round for the same seed, and a different one for another', () => {
    for (const sc of SCENES) {
      expect(pickRound(sc, 42)).toEqual(pickRound(sc, 42));
      const sigs = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((s) => JSON.stringify(pickRound(sc, s))));
      expect(sigs.size).toBeGreaterThan(4);
    }
  });

  it('always includes Iggy first, with 6-8 other things at fair spots', () => {
    for (const sc of SCENES) {
      const iggySpots = new Set();
      for (let seed = 1; seed <= 60; seed++) {
        const rd = createRound(sc, seed);
        expect(rd.targets[0].iggy).toBe(true);
        expect(rd.targets[0].id).toBe('iggy');
        const others = rd.targets.length - 1;
        expect(others).toBeGreaterThanOrEqual(OTHER_MIN);
        expect(others).toBeLessThanOrEqual(OTHER_MAX);
        expect(new Set(rd.targets.map((t) => t.id)).size).toBe(rd.targets.length);
        const n = rd.targets.reduce((a, t) => a + t.count, 0);
        expect(rd.instances.length).toBe(n);
        for (const t of rd.targets.slice(1)) {
          const item = sc.items.find((it) => it.id === t.id);
          expect(t.count).toBe(item.count);
        }
        for (let i = 0; i < rd.instances.length; i++) {
          for (let j = i + 1; j < rd.instances.length; j++) expect(clash(rd.instances[i].spot, rd.instances[j].spot)).toBe(false);
        }
        iggySpots.add(rd.pick.iggy);
      }
      // over many plays Iggy uses most of his hiding places
      expect(iggySpots.size).toBeGreaterThanOrEqual(Math.min(4, sc.iggy.length));
    }
  });

  it('finds the top-most unfound thing under a tap, and nothing on a miss', () => {
    const sc = SCENES[0];
    const rd = createRound(sc, 9);
    const it = rd.instances[rd.instances.length - 1];
    expect(tapTarget(rd, it.spot.x, it.spot.y)).toBe(rd.instances.length - 1);
    expect(tapTarget(rd, -500, -500)).toBe(-1);
    // two overlapping boxes: the later (drawn on top) wins
    const a = { x: 100, y: 100, hw: 40, hh: 40 };
    const b = { x: 120, y: 110, hw: 40, hh: 40 };
    const fake = { instances: [{ spot: a, found: false }, { spot: b, found: false }] };
    expect(tapTarget(fake, 110, 105)).toBe(1);
    fake.instances[1].found = true;
    expect(tapTarget(fake, 110, 105)).toBe(0);
  });

  it('counts finds per thing, ignores repeats, and completes', () => {
    const sc = SCENES[0];
    let rd = null;
    for (let seed = 1; !rd || !rd.targets.some((t) => t.count > 1); seed++) rd = createRound(sc, seed);
    const multi = rd.targets.findIndex((t) => t.count > 1);
    const idx = rd.instances.map((it, i) => (it.target === multi ? i : -1)).filter((i) => i >= 0);
    const first = markFound(rd, idx[0], 5);
    expect(first.targetDone).toBe(false);
    expect(rd.targets[multi].found).toBe(1);
    expect(markFound(rd, idx[0], 6)).toBe(null);
    expect(rd.lastFoundAt).toBe(5);
    expect(tapTarget(rd, rd.instances[idx[0]].spot.x, rd.instances[idx[0]].spot.y)).not.toBe(idx[0]);
    let last = null;
    rd.instances.forEach((it, i) => {
      if (!it.found) last = markFound(rd, i, 10);
    });
    expect(last.roundDone).toBe(true);
    expect(isComplete(rd)).toBe(true);
    expect(remaining(rd)).toBe(0);
    expect(rd.done).toBe(true);
    expect(rd.doneAt).toBe(10);
  });
});

describe('hints and stars', () => {
  it('points at the nearest unfound thing, then needs to recharge', () => {
    const sc = SCENES[0];
    const rd = createRound(sc, 3, 0);
    const target = rd.instances[2].spot;
    expect(nearestUnfound(rd, target.x, target.y)).toBe(2);
    expect(hintReady(rd, 0)).toBe(true);
    expect(useHint(rd, 0, target.x, target.y)).toBe(2);
    expect(rd.hintsUsed).toBe(1);
    expect(hintReady(rd, 5)).toBe(false);
    expect(useHint(rd, 5, 0, 0)).toBe(-1);
    expect(hintCharge(rd, HINT_RECHARGE / 2)).toBeCloseTo(0.5);
    markFound(rd, 2, 6);
    const next = useHint(rd, HINT_RECHARGE, target.x, target.y);
    expect(next).not.toBe(2);
    expect(rd.instances[next].found).toBe(false);
    expect(rd.hintsUsed).toBe(2);
  });

  it('never points at a found thing', () => {
    const rd = createRound(SCENES[1], 8, 0);
    for (let k = 0; k < rd.instances.length - 1; k++) {
      const i = useHint(rd, k * HINT_RECHARGE, 0, 0);
      expect(rd.instances[i].found).toBe(false);
      markFound(rd, i, k * HINT_RECHARGE);
    }
  });

  it('nudges after a long quiet spell', () => {
    const rd = createRound(SCENES[0], 3, 0);
    expect(idleNudge(rd, IDLE_NUDGE - 1)).toBe(false);
    expect(idleNudge(rd, IDLE_NUDGE)).toBe(true);
    markFound(rd, 0, IDLE_NUDGE + 1);
    expect(idleNudge(rd, IDLE_NUDGE + 5)).toBe(false);
  });

  it('gives 3 stars with no hints, 2 for one or two, 1 otherwise', () => {
    expect(starsFor(0)).toBe(3);
    expect(starsFor(1)).toBe(2);
    expect(starsFor(2)).toBe(2);
    expect(starsFor(3)).toBe(1);
    expect(starsFor(40)).toBe(1);
  });
});

describe('progress', () => {
  it('saves and loads best stars per scene', () => {
    const store = memStore();
    const p = loadProgress(store, SCENE_IDS);
    expect(Object.values(p.stars).every((n) => n === 0)).toBe(true);
    let r = recordStars(p, 'beach', 2);
    expect(r).toEqual({ best: 2, newSticker: true, improved: true });
    r = recordStars(p, 'beach', 1);
    expect(r).toEqual({ best: 2, newSticker: false, improved: false });
    r = recordStars(p, 'beach', 3);
    expect(r.improved).toBe(true);
    saveProgress(store, p);
    expect(store.m.has(SAVE_KEY)).toBe(true);
    expect(loadProgress(store, SCENE_IDS).stars.beach).toBe(3);
  });

  it('shrugs off bad saved data', () => {
    const store = memStore();
    store.setItem(SAVE_KEY, '{not json');
    expect(loadProgress(store, SCENE_IDS).stars.beach).toBe(0);
    expect(normalizeProgress({ stars: { beach: 9, pool: -1, deco: 2.5, zoo: 2 } }, SCENE_IDS).stars).toMatchObject({ beach: 0, pool: 0, deco: 0, zoo: 2 });
    const broken = { getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); } };
    expect(loadProgress(broken, SCENE_IDS).stars.pool).toBe(0);
    expect(() => saveProgress(broken, { stars: {} })).not.toThrow();
  });
});

describe('overlap maths', () => {
  it('measures how much boxes cover each other', () => {
    const a = { x: 0, y: 0, hw: 10, hh: 10 };
    expect(overlapFrac(a, { x: 0, y: 0, hw: 10, hh: 10 })).toBeCloseTo(1);
    expect(overlapFrac(a, { x: 30, y: 0, hw: 10, hh: 10 })).toBe(0);
    expect(overlapFrac(a, { x: 10, y: 0, hw: 10, hh: 10 })).toBeCloseTo(0.5);
    expect(clash(a, { x: 19, y: 0, hw: 10, hh: 10 })).toBe(false);
    expect(clash(a, { x: 5, y: 0, hw: 10, hh: 10 })).toBe(true);
  });
});
