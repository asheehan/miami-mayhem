import { describe, it, expect } from 'vitest';
import {
  generateLevel, levelParams, reachable, distanceMap, isBlocked, isSafe, moverX, laneHits,
  COLS, SPAN, PAD, START_COL, KINDS,
} from '../src/games/later-gator/level.js';
import {
  createRun, cloneRun, step, hop, hopTarget, HOP_TIME, BONK_TIME, INVULN_TIME, HEARTS, EDGE, progress,
} from '../src/games/later-gator/sim.js';

const DT = 1 / 60;
const run = (r, secs) => {
  for (let i = 0; i < Math.round(secs / DT); i++) step(r, DT);
};

// A hand-made level: rows given by type, empty lanes unless movers are passed.
function custom(types, extra = {}) {
  const rows = types.map((type) => {
    if (type === 'canal') return { type, dir: 1, speed: 1, drift: 0.5, movers: [] };
    if (type === 'road' || type === 'boardwalk') return { type, dir: 1, speed: 1, movers: [] };
    if (type === 'swamp') return { type };
    return { type, blockers: [] };
  });
  return { level: 0, cols: COLS, rows, snacks: [], start: { row: 0, col: START_COL }, ...extra };
}

describe('generateLevel', () => {
  it('is the same every time for a level number', () => {
    for (const n of [1, 4, 8, 13]) expect(generateLevel(n)).toEqual(generateLevel(n));
    expect(generateLevel(2)).not.toEqual(generateLevel(3));
  });

  it('grows from about 15 lanes at level 1 to about 25 at level 8, then keeps growing gently', () => {
    const lanes = (n) => generateLevel(n).rows.length - 2;
    expect(lanes(1)).toBeGreaterThanOrEqual(13);
    expect(lanes(1)).toBeLessThanOrEqual(17);
    expect(lanes(8)).toBeGreaterThanOrEqual(23);
    expect(lanes(8)).toBeLessThanOrEqual(27);
    expect(lanes(20)).toBeGreaterThan(lanes(8));
    expect(levelParams(8).speed).toBeGreaterThan(levelParams(1).speed);
    expect(levelParams(8).gap).toBeLessThan(levelParams(1).gap);
    expect(levelParams(30).speed).toBeGreaterThan(levelParams(8).speed);
    expect(levelParams(100).gap).toBeGreaterThanOrEqual(0.5);
  });

  for (let n = 1; n <= 20; n++) {
    it(`level ${n}: starts on land, ends in the swamp, safe strips every 4 hazard lanes or fewer`, () => {
      const lv = generateLevel(n);
      expect(lv.rows[0].type).toBe('start');
      expect(lv.rows[lv.rows.length - 1].type).toBe('swamp');
      expect(isSafe(lv.rows[lv.rows.length - 2].type)).toBe(true);
      let run = 0;
      for (const row of lv.rows.slice(1, -1)) {
        if (isSafe(row.type)) run = 0;
        else run++;
        expect(run).toBeLessThanOrEqual(4);
      }
      const types = new Set(lv.rows.map((r) => r.type));
      for (const t of ['road', 'canal']) expect(types.has(t)).toBe(true);
    });

    it(`level ${n}: blockers never wall off a row, and a path reaches the swamp`, () => {
      const lv = generateLevel(n);
      lv.rows.forEach((row) => {
        const b = row.blockers || [];
        expect(b.length).toBeLessThan(COLS);
        for (let i = 1; i < b.length; i++) expect(b[i] - b[i - 1]).toBeGreaterThan(1);
        if (!isSafe(row.type)) expect(b.length).toBe(0);
      });
      expect(isBlocked(lv, 0, START_COL)).toBe(false);
      const reach = reachable(lv);
      expect(reach[lv.rows.length - 1].some(Boolean)).toBe(true);
      // every open square on every row is reachable
      lv.rows.forEach((row, r) => {
        for (let c = 0; c < COLS; c++) if (!isBlocked(lv, r, c)) expect(reach[r][c]).toBe(true);
      });
    });

    it(`level ${n}: three snacks on reachable land squares, spread through the level`, () => {
      const lv = generateLevel(n);
      const reach = reachable(lv);
      expect(lv.snacks.length).toBe(3);
      for (const s of lv.snacks) {
        expect(reach[s.row][s.col]).toBe(true);
        expect(['canal', 'swamp', 'start']).not.toContain(lv.rows[s.row].type);
      }
      expect(lv.snacks[0].row).toBeLessThan(lv.snacks[2].row);
    });

    it(`level ${n}: every hazard lane has movers with room to cross between them`, () => {
      const lv = generateLevel(n);
      for (const row of lv.rows) {
        if (isSafe(row.type) || row.type === 'swamp') continue;
        expect(row.movers.length).toBeGreaterThan(0);
        for (const m of row.movers) expect(KINDS[m.kind].lane).toBe(row.type);
        const covered = row.movers.reduce((s, m) => s + m.len, 0);
        expect(covered).toBeLessThan(SPAN * 0.6);
        if (row.type === 'canal') expect(Math.abs(row.drift)).toBeGreaterThan(0.2);
      }
    });
  }
});

describe('movers', () => {
  it('slide along their lane at its speed and wrap round', () => {
    const lane = { dir: 1, speed: 2, movers: [{ x0: 5, len: 1 }] };
    expect(moverX(lane, lane.movers[0], 0)).toBeCloseTo(5 - PAD);
    expect(moverX(lane, lane.movers[0], 1)).toBeCloseTo(7 - PAD);
    expect(moverX(lane, lane.movers[0], SPAN / 2)).toBeCloseTo(5 - PAD);
    const back = { dir: -1, speed: 2, movers: [{ x0: 5, len: 1 }] };
    expect(moverX(back, back.movers[0], 1)).toBeCloseTo(3 - PAD);
  });

  it('hit whatever overlaps them', () => {
    const lane = { dir: 1, speed: 1, movers: [{ x0: 4 + PAD, len: 2 }] };
    expect(laneHits(lane, 4, 0)).toBe(true);
    expect(laneHits(lane, 5.2, 0)).toBe(true);
    expect(laneHits(lane, 5.5, 0)).toBe(false);
    expect(laneHits(lane, 7, 3)).toBe(true);
  });
});

describe('hopping', () => {
  it('a tap hops forward one square in a short arc, and swipes go left, right and back', () => {
    const r = createRun(custom(['start', 'grass', 'grass', 'swamp']));
    expect(hop(r, 'up')).toBe(true);
    run(r, HOP_TIME + 0.02);
    expect(r.row).toBe(1);
    expect(r.x).toBe(START_COL);
    hop(r, 'left');
    run(r, 0.2);
    expect(r.x).toBe(START_COL - 1);
    hop(r, 'right');
    run(r, 0.2);
    hop(r, 'right');
    run(r, 0.2);
    expect(r.x).toBe(START_COL + 1);
    hop(r, 'down');
    run(r, 0.2);
    expect(r.row).toBe(0);
  });

  it('buffers one hop asked for during a hop', () => {
    const r = createRun(custom(['start', 'grass', 'grass', 'grass', 'swamp']));
    hop(r, 'up');
    step(r, 0.05);
    hop(r, 'up');
    hop(r, 'up'); // still only one deep
    run(r, 0.5);
    expect(r.row).toBe(2);
  });

  it("can't hop off the sides, behind the start, or into a palm", () => {
    const lv = custom(['start', 'grass', 'swamp']);
    lv.rows[1].blockers = [START_COL];
    const r = createRun(lv);
    expect(hop(r, 'down')).toBe(false);
    expect(hop(r, 'up')).toBe(false);
    expect(r.bump.dir).toBe('up');
    r.x = 0;
    expect(hop(r, 'left')).toBe(false);
    r.x = COLS - 1;
    expect(hop(r, 'right')).toBe(false);
    expect(hop(r, 'up')).toBe(true);
  });
});

describe('swimming', () => {
  it('the current drifts him sideways continuously', () => {
    const r = createRun(custom(['start', 'canal', 'sand', 'swamp']));
    hop(r, 'up');
    run(r, HOP_TIME + 1);
    expect(r.row).toBe(1);
    expect(r.x).toBeGreaterThan(START_COL + 0.4);
    expect(r.x).toBeLessThan(START_COL + 0.6);
  });

  it('hopping out of the water snaps him to the nearest square', () => {
    const lv = custom(['start', 'canal', 'sand', 'swamp']);
    const r = createRun(lv);
    hop(r, 'up');
    run(r, HOP_TIME + 1.2);
    hop(r, 'up');
    run(r, 0.3);
    expect(r.row).toBe(2);
    expect(r.x).toBe(START_COL + 1);
    // next to a blocked square he climbs out on the open one beside it
    const lv2 = custom(['start', 'canal', 'sand', 'swamp']);
    lv2.rows[2].blockers = [START_COL];
    const r2 = createRun(lv2);
    hop(r2, 'up');
    run(r2, HOP_TIME + 0.4);
    hop(r2, 'up');
    run(r2, 0.3);
    expect(r2.row).toBe(2);
    expect(r2.x).toBe(START_COL + 1);
  });

  it('being carried off the side of the map costs a heart', () => {
    const r = createRun(custom(['start', 'canal', 'sand', 'swamp']));
    hop(r, 'up');
    run(r, HOP_TIME + (COLS - 1 - START_COL + EDGE) / 0.5 + 0.2);
    expect(r.status).toBe('bonk');
    expect(r.bonkBy).toBe('drift');
    expect(r.hearts).toBe(HEARTS - 1);
    run(r, BONK_TIME);
    expect(r.status).toBe('play');
    expect(r.row).toBe(0);
  });
});

describe('hearts and checkpoints', () => {
  const carLane = () => ({ type: 'road', dir: 1, speed: 2, movers: [{ kind: 'convertible', x0: 0, len: 1.8 }] });

  it('standing still on a road eventually gets hit', () => {
    const lv = custom(['start', 'road', 'grass', 'swamp']);
    lv.rows[1] = carLane();
    const r = createRun(lv);
    hop(r, 'up');
    let t = 0;
    while (r.status === 'play' && t < SPAN) {
      step(r, DT);
      t += DT;
    }
    expect(r.status).toBe('bonk');
    expect(r.bonkBy).toBe('hit');
    expect(r.hearts).toBe(HEARTS - 1);
  });

  it('standing still on a generated road gets hit too', () => {
    const lv = generateLevel(1);
    const roadRow = lv.rows.findIndex((row) => row.type === 'road');
    const r = createRun(lv);
    r.row = roadRow;
    run(r, SPAN);
    expect(r.hearts).toBeLessThan(HEARTS);
  });

  it('a hit sends him back to the last safe strip he reached, blinking for 1.5 seconds', () => {
    const lv = custom(['start', 'road', 'grass', 'road', 'road', 'grass', 'swamp']);
    lv.rows[4] = carLane();
    const r = createRun(lv);
    r.x = 2;
    for (let i = 0; i < 3; i++) {
      hop(r, 'up');
      run(r, HOP_TIME + 0.02);
    }
    expect(r.row).toBe(3);
    expect(r.checkpoint).toEqual({ row: 2, col: 2 });
    hop(r, 'up');
    let t = 0;
    while (r.status === 'play' && t < SPAN) {
      step(r, DT);
      t += DT;
    }
    expect(r.status).toBe('bonk');
    hop(r, 'up'); // ignored while bonked
    run(r, BONK_TIME + DT);
    expect(r.status).toBe('play');
    expect(r.row).toBe(2);
    expect(r.x).toBe(2);
    expect(r.invuln).toBeGreaterThan(INVULN_TIME - 0.1);
    // blinking: a car can't hurt him
    hop(r, 'up');
    hop(r, 'up');
    run(r, 0.5);
    expect(r.hearts).toBe(HEARTS - 1);
  });

  it('no hearts left means the level is lost', () => {
    const lv = custom(['start', 'road', 'grass', 'swamp']);
    lv.rows[1] = { ...carLane(), movers: [{ kind: 'truck', x0: 0, len: SPAN * 0.9 }] };
    const r = createRun(lv);
    for (let i = 0; i < HEARTS; i++) {
      hop(r, 'up');
      run(r, 0.3);
      expect(r.status).toBe('bonk');
      run(r, BONK_TIME);
      r.invuln = 0;
    }
    expect(r.hearts).toBe(0);
    expect(r.status).toBe('lost');
    expect(hop(r, 'up')).toBe(false);
  });
});

describe('snacks and the swamp', () => {
  it('landing on a snack collects it, once', () => {
    const lv = custom(['start', 'grass', 'grass', 'swamp'], { snacks: [{ row: 1, col: START_COL, kind: 'hotdog' }, { row: 2, col: 0, kind: 'pizza' }] });
    const r = createRun(lv);
    hop(r, 'up');
    run(r, 0.3);
    expect(r.got).toEqual([true, false]);
    hop(r, 'down');
    run(r, 0.3);
    hop(r, 'up');
    run(r, 0.3);
    expect(r.gotCount).toBe(1);
  });

  it('reaching the swamp wins the level', () => {
    const r = createRun(custom(['start', 'grass', 'swamp']));
    hop(r, 'up');
    hop(r, 'up');
    run(r, 0.5);
    expect(r.status).toBe('won');
    expect(progress(r)).toBe(1);
    expect(hop(r, 'down')).toBe(false);
  });
});

// A careful bot: before each move it plays it forward on a copy of the run, and only takes
// it if nothing hits him during it and, from where he ends up, some next move (or waiting)
// keeps him safe for a moment longer. Otherwise it waits.
// `goals` are squares to visit in order (snacks), then any square of the swamp.
const LOOK = 0.5; // seconds he must be able to stay put at the end of the plan
const PAUSE = 0.2; // how long "wait" waits before thinking again
const MOVES = [null, 'up', 'left', 'right', 'down'];
// Seconds survived (Infinity if safe) for move `dir` (null = wait), looking `depth` moves ahead.
function survives(r, dir, depth = 2) {
  const c = cloneRun(r);
  if (dir && !hop(c, dir)) return -1;
  const dur = depth > 0 ? (dir ? HOP_TIME + DT : PAUSE) : (dir ? HOP_TIME + DT : 0) + LOOK;
  let t = 0;
  while (t < dur) {
    step(c, DT);
    t += DT;
    if (c.status === 'bonk') return t;
    if (c.status === 'won') return Infinity;
  }
  if (depth === 0) return Infinity;
  let best = 0;
  for (const next of MOVES) {
    const s = survives(c, next, depth - 1);
    if (s === Infinity) return Infinity;
    best = Math.max(best, s);
  }
  return t + best;
}

function playBot(level, { snacks = false, limit = 400 } = {}) {
  const r = createRun(level);
  const last = level.rows.length - 1;
  const swamp = Array.from({ length: COLS }, (_, col) => ({ row: last, col }));
  const goals = snacks ? [...level.snacks.map((s, i) => ({ ...s, i }))].sort((a, b) => a.row - b.row) : [];
  let goal = 0;
  let maps = new Map();
  const mapFor = (g) => {
    const key = g ? `${g.row},${g.col}` : 'swamp';
    if (!maps.has(key)) maps.set(key, distanceMap(level, g ? [g] : swamp));
    return maps.get(key);
  };
  while (r.time < limit && r.status !== 'won' && r.status !== 'lost') {
    while (goal < goals.length && r.got[goals[goal].i]) goal++;
    if (r.status === 'play' && !r.hop) {
      const dist = mapFor(goals[goal]);
      const here = dist[r.row][Math.max(0, Math.min(COLS - 1, Math.round(r.x)))];
      const lane = level.rows[r.row];
      const scored = [];
      for (const dir of ['up', 'left', 'right', 'down']) {
        const t = hopTarget(r, dir);
        if (!t) continue;
        let d = dist[t.row1][Math.max(0, Math.min(COLS - 1, Math.round(t.x1)))];
        // in a canal near the edge the current is pushing him to, swimming upstream comes first
        if (lane.type === 'canal' && t.row1 === r.row) {
          const downstream = lane.drift > 0 ? COLS - 1 - r.x : r.x;
          const upstream = Math.sign(t.x1 - r.x) === -Math.sign(lane.drift);
          if (downstream < 1.5 && upstream) d = here - 0.5;
        }
        scored.push({ dir, d });
      }
      scored.push({ dir: null, d: here });
      scored.sort((a, b) => a.d - b.d || (a.dir === null ? -1 : b.dir === null ? 1 : 0));
      let choice = scored.find((s) => survives(r, s.dir) === Infinity);
      if (!choice) {
        // nothing is safe: take whatever keeps him out of trouble longest
        choice = scored.reduce((best, s) => (survives(r, s.dir) > survives(r, best.dir) ? s : best));
      }
      if (choice.dir) hop(r, choice.dir);
    }
    const before = r.status;
    step(r, DT);
    if (r.status === 'bonk' && before !== 'bonk') {
      r.bonks = r.bonks || [];
      r.bonks.push({ t: +r.time.toFixed(2), row: r.row, x: +r.x.toFixed(2), type: level.rows[r.row].type, by: r.bonkBy });
    }
  }
  return r;
}

describe('a careful bot', () => {
  const times = [];
  for (let n = 1; n <= 8; n++) {
    it(`finishes level ${n} without losing a heart`, () => {
      const r = playBot(generateLevel(n));
      expect(r.status).toBe('won');
      expect(r.bonks || []).toEqual([]);
      expect(r.hearts).toBe(HEARTS);
      times.push(`level ${n}: ${r.time.toFixed(1)}s, ${r.hops} hops, ${generateLevel(n).rows.length - 2} lanes`);
    });
  }

  for (let n = 1; n <= 8; n++) {
    it(`collects all three snacks on level ${n} and still finishes`, () => {
      const r = playBot(generateLevel(n), { snacks: true });
      expect(r.status).toBe('won');
      expect(r.gotCount).toBe(3);
      expect(r.hearts).toBeGreaterThan(0);
      times.push(`level ${n} with snacks: ${r.time.toFixed(1)}s, hearts left ${r.hearts} ${JSON.stringify(r.bonks || [])}`);
    });
  }

  it('reports its times', () => {
    console.log(`bot times\n${times.join('\n')}`);
    expect(times.length).toBe(16);
  });
});
