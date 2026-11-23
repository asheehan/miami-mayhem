// Cargo Captain puzzles. Pure. Six voyages of five puzzles; each puzzle is made by a seeded
// generator from a hand-tuned stage below, so a voyage is the same every time it is played.
//
// A stage: { type, min, max, parts, extra, crateMax, double }
//   type     'match'   left has one bolted crate; put the same number on the right
//            'make'    left has one bolted crate; find `parts` dock crates that add up to it
//            'missing' left bolted T, right already has a bolted part; find the missing part(s)
//            'heavy'   right is loaded too heavy with loose crates; take `parts` of them off
//            'both'    bolted crates on both sides; add `parts` dock crates to the lighter side
//            'mystery' left has a bolted "?" crate; balance it, then tap its number
//   min, max  the range of the balanced side's total
//   parts     how many crates the cheapest answer moves
//   extra     distractors: dock crates not needed (for 'heavy', the loose crates that stay on)
//   crateMax  no loose crate is bigger than this (and no crate at all is bigger than 10)
//   double    the parts are a double (two crates the same)
//
// A puzzle: { type, stage, crates: [{ n, place: 'left'|'right'|'dock', fixed, mystery }],
//             mystery?, answer?, choices? }
import { solveCrates, totalsOf, DECK_MAX } from './sim.js';

export const TYPES = ['match', 'make', 'missing', 'heavy', 'both', 'mystery'];

export const VOYAGES = [
  {
    name: 'Count',
    stages: [
      { type: 'match', min: 1, max: 3, parts: 1, extra: 2, crateMax: 5 },
      { type: 'match', min: 2, max: 5, parts: 1, extra: 2, crateMax: 6 },
      { type: 'match', min: 3, max: 6, parts: 1, extra: 2, crateMax: 8 },
      { type: 'match', min: 4, max: 8, parts: 1, extra: 3, crateMax: 9 },
      { type: 'match', min: 5, max: 10, parts: 1, extra: 3, crateMax: 10 },
    ],
  },
  {
    name: 'Make it',
    stages: [
      { type: 'match', min: 3, max: 9, parts: 1, extra: 3, crateMax: 10 },
      { type: 'make', min: 5, max: 5, parts: 2, extra: 2, crateMax: 4 },
      { type: 'make', min: 4, max: 6, parts: 2, extra: 2, crateMax: 5 },
      { type: 'make', min: 6, max: 8, parts: 2, extra: 2, crateMax: 7 },
      { type: 'make', min: 7, max: 10, parts: 2, extra: 3, crateMax: 9 },
    ],
  },
  {
    name: 'Missing part',
    stages: [
      { type: 'missing', min: 4, max: 6, parts: 1, extra: 2, crateMax: 6 },
      { type: 'missing', min: 5, max: 8, parts: 1, extra: 2, crateMax: 8 },
      { type: 'make', min: 6, max: 10, parts: 2, extra: 2, crateMax: 9 },
      { type: 'missing', min: 6, max: 10, parts: 1, extra: 3, crateMax: 10 },
      { type: 'missing', min: 7, max: 10, parts: 2, extra: 2, crateMax: 10 },
    ],
  },
  {
    name: 'Too heavy',
    stages: [
      { type: 'heavy', min: 3, max: 6, parts: 1, extra: 1, crateMax: 6 },
      { type: 'heavy', min: 4, max: 8, parts: 1, extra: 2, crateMax: 8 },
      { type: 'missing', min: 6, max: 10, parts: 1, extra: 3, crateMax: 10 },
      { type: 'heavy', min: 6, max: 10, parts: 1, extra: 2, crateMax: 10 },
      { type: 'heavy', min: 6, max: 10, parts: 2, extra: 2, crateMax: 10 },
    ],
  },
  {
    name: 'Both sides',
    stages: [
      { type: 'both', min: 5, max: 8, parts: 1, extra: 2, crateMax: 8 },
      { type: 'both', min: 6, max: 10, parts: 1, extra: 3, crateMax: 10 },
      { type: 'heavy', min: 7, max: 10, parts: 1, extra: 2, crateMax: 10 },
      { type: 'both', min: 8, max: 12, parts: 2, extra: 2, crateMax: 10 },
      { type: 'make', min: 7, max: 10, parts: 3, extra: 2, crateMax: 10 },
    ],
  },
  {
    name: 'Mystery',
    stages: [
      { type: 'both', min: 10, max: 16, parts: 2, extra: 2, crateMax: 10, double: true },
      { type: 'mystery', min: 3, max: 7, parts: 1, extra: 2, crateMax: 8 },
      { type: 'make', min: 12, max: 18, parts: 2, extra: 2, crateMax: 10 },
      { type: 'both', min: 12, max: 20, parts: 3, extra: 2, crateMax: 10 },
      { type: 'mystery', min: 5, max: 10, parts: 2, extra: 2, crateMax: 10 },
    ],
  },
];

export const voyageSeed = (v, i) => 7919 * (v + 1) + 104729 * (i + 1);

function rng(seed) {
  let a = seed | 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const int = (r, a, b) => a + Math.floor(r() * (b - a + 1));

function shuffle(r, list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// `p` positive whole numbers adding to `total`, none bigger than `cap`, or null.
function split(r, total, p, cap, double) {
  if (double) return p === 2 && total % 2 === 0 && total / 2 <= cap ? [total / 2, total / 2] : null;
  for (let tries = 0; tries < 40; tries++) {
    const parts = [];
    let left = total;
    for (let k = p; k > 1; k--) {
      const hi = Math.min(cap, left - (k - 1));
      const lo = Math.max(1, left - cap * (k - 1));
      if (hi < lo) break;
      const v = int(r, lo, hi);
      parts.push(v);
      left -= v;
    }
    if (parts.length === p - 1 && left >= 1 && left <= cap) {
      parts.push(left);
      // two parts the same is a double: kept for the doubles stage only
      if (p > 1 && new Set(parts).size < parts.length) continue;
      return parts;
    }
  }
  return null;
}

// Distractors: `count` numbers from lo..hi, none in `avoid`, all different where possible.
function distractors(r, count, lo, hi, avoid) {
  const pool = [];
  for (let v = lo; v <= hi; v++) if (!avoid.includes(v)) pool.push(v);
  shuffle(r, pool);
  const out = pool.slice(0, count);
  while (out.length < count && pool.length) out.push(pool[int(r, 0, pool.length - 1)]);
  return out;
}

// One bolted crate for a total up to 10, otherwise two.
function bolted(r, total, cap) {
  if (total <= cap) return [total];
  const a = int(r, Math.max(1, total - cap), Math.min(cap, total - 1));
  return [a, total - a];
}

function build(stage, r) {
  const { type, min, max, parts: p = 1, extra = 2, crateMax: cap = 10, double = false } = stage;
  const T = int(r, min, max);
  const crates = [];
  const put = (n, place, fixed = false, more = {}) => crates.push({ n, place, fixed, ...more });
  const dock = (list) => shuffle(r, list).forEach((n) => put(n, 'dock'));
  if (type === 'match') {
    if (T > cap) return null;
    put(T, 'left', true);
    const others = distractors(r, extra, 1, cap, [T]);
    // no two distractors that also make T: this stage is about matching
    for (let i = 0; i < others.length; i++) for (let j = i + 1; j < others.length; j++) if (others[i] + others[j] === T) return null;
    dock([T, ...others]);
  } else if (type === 'make') {
    const parts = split(r, T, p, Math.min(cap, T - 1), double);
    if (!parts) return null;
    bolted(r, T, 10).forEach((n) => put(n, 'left', true));
    // two-part answers get tempting smaller distractors; three-part ones may use bigger crates
    const hi = p > 2 ? cap : Math.min(cap, T - 1);
    dock([...parts, ...distractors(r, extra, 1, hi, [...parts, T])]);
  } else if (type === 'missing') {
    const need = int(r, p, Math.min(T - 1, cap * p));
    const f = T - need;
    if (f < 1 || f > 10) return null;
    const parts = split(r, need, p, cap, double);
    if (!parts) return null;
    bolted(r, T, 10).forEach((n) => put(n, 'left', true));
    put(f, 'right', true);
    dock([...parts, ...distractors(r, extra, 1, cap, [...parts, T])]);
  } else if (type === 'heavy') {
    const keep = split(r, T, extra, cap, false);
    if (!keep) return null;
    const off = split(r, int(r, p, Math.min(cap * p, p * 4)), p, cap, false);
    if (!off) return null;
    bolted(r, T, 10).forEach((n) => put(n, 'left', true));
    shuffle(r, [...keep, ...off]).forEach((n) => put(n, 'right'));
  } else if (type === 'both') {
    const need = double ? 2 * int(r, 2, Math.min(cap, Math.floor((T - 1) / 2))) : int(r, p, Math.min(T - 1, cap * p));
    const lightFixed = T - need;
    if (lightFixed < 1 || lightFixed > 10) return null;
    const parts = split(r, need, p, cap, double);
    if (!parts) return null;
    const heavySide = r() < 0.5 ? 'left' : 'right';
    const lightSide = heavySide === 'left' ? 'right' : 'left';
    const heavy = bolted(r, T, 10);
    if (heavy.length === 1 && heavy[0] === lightFixed) return null;
    heavy.forEach((n) => put(n, heavySide, true));
    put(lightFixed, lightSide, true);
    dock([...parts, ...distractors(r, extra, 1, cap, parts)]);
  } else if (type === 'mystery') {
    const parts = split(r, T, p, cap, double);
    if (!parts) return null;
    put(T, 'left', true, { mystery: true });
    dock([...parts, ...distractors(r, extra, 1, cap, [...parts, T])]);
    const near = [];
    for (let v = Math.max(1, T - 3); v <= T + 3; v++) if (v !== T) near.push(v);
    shuffle(r, near);
    return { type, stage, crates, mystery: true, answer: T, choices: shuffle(r, [T, near[0], near[1]]) };
  }
  return { type, stage, crates };
}

// Does this puzzle do what its stage promises? (Also used by the tests.)
export function check(puzzle) {
  const { stage, crates } = puzzle;
  const cap = stage.crateMax ?? 10;
  if (crates.some((c) => !Number.isInteger(c.n) || c.n < 1 || c.n > 10)) return 'crate out of range';
  if (crates.some((c) => !c.fixed && !c.mystery && c.n > cap)) return 'loose crate too big';
  const t = totalsOf(crates);
  if (t.left === t.right) return 'balanced at the start';
  if (crates.filter((c) => c.place === 'left').length > DECK_MAX) return 'too many on the left';
  if (crates.filter((c) => c.place === 'right').length > DECK_MAX) return 'too many on the right';
  const sol = solveCrates(crates.map((c, i) => ({ ...c, id: i + 1, fixed: c.fixed || c.mystery })));
  if (!sol) return 'no solution';
  if (sol.length !== (stage.parts ?? 1)) return `cheapest answer moves ${sol.length}, not ${stage.parts ?? 1}`;
  const loose = crates.filter((c) => !c.fixed && !c.mystery).length;
  if (loose <= sol.length) return 'no distractor';
  const bal = balancedTotal(puzzle);
  if (bal < stage.min || bal > stage.max) return `balanced total ${bal} outside ${stage.min}-${stage.max}`;
  return null;
}

// The total the ship balances at (left side, once the cheapest answer is carried out).
export function balancedTotal(puzzle) {
  const sol = solveCrates(puzzle.crates.map((c, i) => ({ ...c, id: i + 1, fixed: c.fixed || c.mystery })));
  const after = puzzle.crates.map((c, i) => {
    const m = sol && sol.find((k) => k.id === i + 1);
    return m ? { ...c, place: m.to } : c;
  });
  return totalsOf(after).left;
}

// avoidTotal: the previous puzzle's balanced total, so two in a row don't feel the same.
export function generatePuzzle(stage, seed, avoidTotal = null) {
  const r = rng(seed);
  for (let tries = 0; tries < 2000; tries++) {
    const p = build(stage, r);
    if (!p || check(p)) continue;
    if (tries < 1000 && stage.min !== stage.max && balancedTotal(p) === avoidTotal) continue;
    return p;
  }
  throw new Error(`cannot make a ${stage.type} puzzle`);
}

// The five puzzles of voyage v (0-based). Always the same for the same v.
export function generateVoyage(v) {
  const out = [];
  VOYAGES[v].stages.forEach((stage, i) => {
    const prev = out.length ? balancedTotal(out[out.length - 1]) : null;
    out.push(generatePuzzle(stage, voyageSeed(v, i), prev));
  });
  return out;
}
