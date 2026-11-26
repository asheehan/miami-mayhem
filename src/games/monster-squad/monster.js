// A monster: its parts, name, level, xp, evolution stage, training and moves; its stats; random
// monsters; names from syllables; checking and packing monsters for the save. Pure.
import {
  STATS, MAX_PIP, PART_KEYS, PART_LISTS, BODIES, TOPS, ARMS, LEGS, BACKS, partDef, isPart,
} from './parts.js';
import { makeRng, pick } from './rng.js';

export const MAX_LEVEL = 30;
export const MAX_TRAIN = 5; // training steps per stat
export const MAX_MOVE = 3; // move levels
export const MOVES = ['bonk', 'blast', 'bubble', 'special'];
export const EVOLVE_AT = [5, 12]; // level needed for stage 1 and stage 2
export const MAX_STAGE = 2;

// xp needed to go from level lv to lv + 1
export const xpNeed = (lv) => 10 + lv * 5;

// ---------- parts ----------

// A full, valid parts object: anything missing or unknown becomes the first choice.
export function cleanParts(raw) {
  const out = {};
  for (const k of PART_KEYS) {
    const v = raw && raw[k];
    out[k] = isPart(k, v) ? v : PART_LISTS[k][0].id;
  }
  return out;
}

export function randomParts(rng) {
  const out = {};
  for (const k of PART_KEYS) out[k] = pick(rng, PART_LISTS[k]).id;
  return out;
}

// Stat pips from parts: { hp, bonk, guard, zoom }, each 1..MAX_PIP.
export function pipsOf(parts) {
  const p = cleanParts(parts);
  const add = [partDef('body', p.body), partDef('top', p.top), partDef('arms', p.arms), partDef('legs', p.legs), partDef('back', p.back)];
  const out = {};
  for (const st of STATS) {
    let v = 0;
    for (const d of add) v += (d && d.stats && d.stats[st]) || 0;
    out[st] = Math.max(1, Math.min(MAX_PIP, v));
  }
  return out;
}

// ---------- names ----------

const NAME_A = ['Bo', 'Zu', 'Gla', 'Mim', 'Fli', 'Wob', 'Snor', 'Pip', 'Gru', 'Ka', 'Lu', 'Tib', 'Mo', 'Squi', 'Blu', 'Zap', 'Noo', 'Fiz', 'Ri', 'Dor', 'Pom', 'Yu', 'Ji', 'Wa'];
const NAME_B = ['ba', 'lo', 'zi', 'mo', 'ga', 'pu', 'ri', 'ki', 'lu', 'no', '', '', ''];
const NAME_C = ['bo', 'ster', 'zle', 'mp', 'nk', 'by', 'loo', 'x', 'gus', 'pop', 'doo', 'mo', 'flap', 'roo', 'bean', 'puff'];

export function makeName(seed) {
  const rng = makeRng(seed * 7 + 3);
  const name = pick(rng, NAME_A) + pick(rng, NAME_B) + pick(rng, NAME_C);
  return name.length > 10 ? name.slice(0, 10) : name;
}

// ---------- monsters ----------

// { uid, sp, parts, name, lv, xp, stage, train, moves, seed }
// sp is the wild species id, or null for a monster built in the maker.
export function newMonster({ uid = 0, parts, name, seed = 1, sp = null, lv = 1, stage = 0, moves, train } = {}) {
  return {
    uid,
    sp,
    parts: cleanParts(parts),
    name: typeof name === 'string' && name ? name.slice(0, 14) : makeName(seed),
    lv: Math.max(1, Math.min(MAX_LEVEL, lv | 0)),
    xp: 0,
    stage: Math.max(0, Math.min(MAX_STAGE, stage | 0)),
    train: { hp: 0, bonk: 0, guard: 0, zoom: 0, ...(train || {}) },
    moves: { bonk: 1, blast: 1, bubble: 0, special: 0, ...(moves || {}) },
    seed: seed >>> 0 || 1,
  };
}

export function randomMonster(seed, opts = {}) {
  const rng = makeRng(seed);
  return newMonster({ ...opts, parts: randomParts(rng), seed: Math.floor(rng() * 1e9) + 1 });
}

// How much bigger everything gets with level and evolution.
export const growth = (lv, stage) => 1 + 0.14 * (lv - 1) + 0.2 * stage;

// Real stats: { hp, bonk, guard, zoom } as whole numbers.
export function statsOf(mon) {
  const p = pipsOf(mon.parts);
  const g = growth(mon.lv, mon.stage);
  const t = mon.train || {};
  return {
    hp: Math.round((20 + 5 * p.hp) * g) + 5 * (t.hp || 0),
    bonk: Math.round((4 + 1.5 * p.bonk) * g) + 2 * (t.bonk || 0),
    guard: Math.round((3 + 1.2 * p.guard) * g) + 2 * (t.guard || 0),
    zoom: Math.round((3 + 1.5 * p.zoom) * g) + 2 * (t.zoom || 0),
  };
}

// One number for "how strong": used to sort and by the bots.
export function powerOf(mon) {
  const st = statsOf(mon);
  const mv = mon.moves || {};
  return Math.round(st.hp * 0.5 + st.bonk * 2.2 + st.guard * 1.5 + st.zoom * 0.6 + (mv.bubble ? 4 : 0) + (mv.special ? 6 : 0) + ((mv.bonk || 1) + (mv.blast || 1) - 2) * 3);
}

// Adds xp, levelling up as far as it reaches. Returns how many levels were gained.
export function addXp(mon, xp) {
  let ups = 0;
  mon.xp += Math.max(0, Math.round(xp));
  while (mon.lv < MAX_LEVEL && mon.xp >= xpNeed(mon.lv)) {
    mon.xp -= xpNeed(mon.lv);
    mon.lv += 1;
    ups += 1;
  }
  if (mon.lv >= MAX_LEVEL) mon.xp = 0;
  return ups;
}

export const canEvolve = (mon) => mon.stage < MAX_STAGE && mon.lv >= EVOLVE_AT[mon.stage];
export const nextEvolveLevel = (mon) => (mon.stage < MAX_STAGE ? EVOLVE_AT[mon.stage] : null);

// ---------- checking and packing ----------

// Every part is known and every number is in range.
export function isValidMonster(m) {
  if (!m || typeof m !== 'object') return false;
  if (!PART_KEYS.every((k) => isPart(k, m.parts && m.parts[k]))) return false;
  if (!Number.isInteger(m.lv) || m.lv < 1 || m.lv > MAX_LEVEL) return false;
  if (!Number.isInteger(m.stage) || m.stage < 0 || m.stage > MAX_STAGE) return false;
  return STATS.every((s) => Number.isInteger(m.train[s]) && m.train[s] >= 0 && m.train[s] <= MAX_TRAIN)
    && MOVES.every((k) => Number.isInteger(m.moves[k]) && m.moves[k] >= 0 && m.moves[k] <= MAX_MOVE);
}

// Packed form for the save: { u, sp, p: [part indexes], n, l, x, e, t: [4], m: [4], s }
export function packMonster(m) {
  return {
    u: m.uid,
    sp: m.sp || 0,
    p: PART_KEYS.map((k) => PART_LISTS[k].findIndex((d) => d.id === m.parts[k])),
    n: m.name,
    l: m.lv,
    x: m.xp,
    e: m.stage,
    t: STATS.map((s) => m.train[s]),
    m: MOVES.map((k) => m.moves[k]),
    s: m.seed,
  };
}

const int = (v, lo, hi, d) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : d);

// The packed form back to a monster, fixing anything out of range; null if it is junk.
export function unpackMonster(r) {
  if (!r || typeof r !== 'object' || !Array.isArray(r.p)) return null;
  const parts = {};
  PART_KEYS.forEach((k, i) => {
    const list = PART_LISTS[k];
    const idx = int(r.p[i], 0, list.length - 1, 0);
    parts[k] = list[idx].id;
  });
  const t = Array.isArray(r.t) ? r.t : [];
  const mv = Array.isArray(r.m) ? r.m : [];
  const m = newMonster({
    uid: int(r.u, 0, 1e9, 0),
    sp: typeof r.sp === 'string' && r.sp ? r.sp : null,
    parts,
    name: typeof r.n === 'string' ? r.n : '',
    seed: int(r.s, 1, 4294967295, 1),
    lv: int(r.l, 1, MAX_LEVEL, 1),
    stage: int(r.e, 0, MAX_STAGE, 0),
  });
  m.xp = int(r.x, 0, xpNeed(m.lv) - 1, 0);
  STATS.forEach((s, i) => { m.train[s] = int(t[i], 0, MAX_TRAIN, 0); });
  MOVES.forEach((k, i) => { m.moves[k] = int(mv[i], 0, MAX_MOVE, k === 'bonk' || k === 'blast' ? 1 : 0); });
  if (m.moves.bonk < 1) m.moves.bonk = 1;
  if (m.moves.blast < 1) m.moves.blast = 1;
  return m;
}

// The part lists re-exported for convenience.
export { BODIES, TOPS, ARMS, LEGS, BACKS };
