// A battle: up to three of Riley's monsters (heroes) against one to three wild ones (foes).
// Turn based. Each round everyone acts once, fastest (zoom) first, heroes first on a tie. The
// foes choose what they will do at the start of the round and show it (intents), so Riley can
// see a big hit coming and bubble up. Nobody is hurt: a monster at 0 is dizzy and sits out.
// Deterministic for a seed. Pure.
import { statsOf } from './monster.js';
import { elementMult, edge } from './parts.js';
import { SPECIES_BY_ID, ZONES } from './world.js';
import { makeRng } from './rng.js';

// power by move level (1..3); bubble heals that share of the most hurt friend's hp.
export const MOVE_INFO = {
  bonk: { power: [2.0, 2.4, 2.8] },
  blast: { power: [1.7, 2.1, 2.5], element: true },
  bubble: { heal: [0.25, 0.35, 0.45] },
  special: { power: [2.3, 2.8, 3.3], element: true, all: true },
};
export const CHARGE = 3; // actions to fill the special
export const BOSS_HP = 2.4; // bosses have this much more hp
export const RARE_HP = 1.2;
export const FOE_TIMING = 1.2; // foes hit as if their timing was "good"
export const SHIELD = 0.5; // a bubble halves the next hit

// quality 0..1 from the timing moment: 1 is the green, never less than a plain hit.
export const timingMult = (q) => 1 + 0.5 * Math.max(0, Math.min(1, q));

function fighter(side, idx, mon) {
  const st = statsOf(mon);
  const sp = mon.sp ? SPECIES_BY_ID[mon.sp] : null;
  const hpK = side === 'foe' && sp ? (sp.rarity === 'boss' ? BOSS_HP : sp.rarity === 'rare' ? RARE_HP : 1) : 1;
  const fierce = side === 'foe' && sp ? ZONES[sp.zone].fierce : 1;
  const max = Math.round(st.hp * hpK * fierce);
  return {
    side, idx, mon, el: mon.parts.element, max, hp: max,
    atk: Math.max(1, Math.round(st.bonk * fierce)), def: st.guard, zoom: st.zoom,
    moves: { ...mon.moves }, charge: 0, shield: false, dizzy: false,
    boss: !!(sp && sp.rarity === 'boss'),
  };
}

export function createBattle({ heroes, foes, seed = 1 }) {
  const b = {
    heroes: heroes.slice(0, 3).map((m, i) => fighter('hero', i, m)),
    foes: foes.slice(0, 3).map((m, i) => fighter('foe', i, m)),
    rng: makeRng(seed),
    round: 0,
    order: [],
    turn: 0,
    intents: [],
    over: null, // null | 'win' | 'lose'
    log: [],
  };
  newRound(b);
  return b;
}

const sideOf = (b, side) => (side === 'hero' ? b.heroes : b.foes);
export const fighterAt = (b, ref) => (ref ? sideOf(b, ref.side)[ref.idx] : null);
const alive = (list) => list.filter((f) => !f.dizzy);

// The order this round: fastest first, heroes first on a tie.
function orderOf(b) {
  const all = [...b.heroes, ...b.foes].filter((f) => !f.dizzy);
  all.sort((p, q) => q.zoom - p.zoom || (p.side === q.side ? p.idx - q.idx : p.side === 'hero' ? -1 : 1));
  return all.map((f) => ({ side: f.side, idx: f.idx }));
}

function newRound(b) {
  b.round += 1;
  b.order = orderOf(b);
  b.turn = 0;
  b.intents = b.foes.map((f) => (f.dizzy ? null : chooseIntent(b, f)));
  skipDizzy(b);
}

function skipDizzy(b) {
  while (b.turn < b.order.length && fighterAt(b, b.order[b.turn]).dizzy) b.turn += 1;
}

// Whose turn it is: { side, idx }, or null when the battle is over.
export function current(b) {
  if (b.over) return null;
  return b.order[b.turn] || null;
}

function advance(b) {
  if (!alive(b.foes).length) b.over = 'win';
  else if (!alive(b.heroes).length) b.over = 'lose';
  if (b.over) return;
  b.turn += 1;
  skipDizzy(b);
  if (b.turn >= b.order.length) newRound(b);
}

// ---------- damage ----------

function damage(b, att, def, power, mult, timing, roll = true) {
  const r = roll ? 0.92 + b.rng() * 0.16 : 1;
  let d = power * att.atk * (10 / (10 + def.def)) * mult * timing * r;
  return Math.max(1, Math.round(d));
}

function multFor(move, att, def) {
  return MOVE_INFO[move].element ? elementMult(att.el, def.el) : 1;
}

export const canUse = (f, move) => {
  if (!f || f.dizzy || !MOVE_INFO[move]) return false;
  if (!(f.moves[move] > 0)) return false;
  if (move === 'special' && f.charge < CHARGE) return false;
  return true;
};

// What a move would do to a target with a middling timing, no luck: for the move buttons.
export function preview(b, att, move, def) {
  if (!att || !def) return 0;
  const lvl = Math.max(1, att.moves[move] || 1) - 1;
  if (move === 'bubble') return Math.round(MOVE_INFO.bubble.heal[lvl] * mostHurt(sideOf(b, att.side)).max * timingMult(0.5));
  return damage(b, att, def, MOVE_INFO[move].power[lvl], multFor(move, att, def), timingMult(0.5), false);
}

function mostHurt(list) {
  const a = alive(list);
  return a.reduce((m, f) => (f.hp / f.max < m.hp / m.max ? f : m), a[0]);
}

// Hits targets with a move. Returns the event for the screen to play.
function act(b, att, move, targetRef, timing) {
  const lvl = Math.max(1, att.moves[move] || 1) - 1;
  const ev = { who: { side: att.side, idx: att.idx }, move, timing, hits: [], heal: null, shields: [] };
  att.charge = move === 'special' ? 0 : Math.min(CHARGE, att.charge + 1);
  if (move === 'bubble') {
    const friends = sideOf(b, att.side);
    const t = mostHurt(friends);
    const amount = Math.min(t.max - t.hp, Math.round(MOVE_INFO.bubble.heal[lvl] * t.max * timing));
    t.hp += amount;
    ev.heal = { side: t.side, idx: t.idx, amount };
    for (const f of alive(friends)) {
      f.shield = true;
      ev.shields.push({ side: f.side, idx: f.idx });
    }
    return ev;
  }
  const enemies = att.side === 'hero' ? b.foes : b.heroes;
  let targets;
  if (MOVE_INFO[move].all) targets = alive(enemies);
  else {
    let t = targetRef != null ? enemies[targetRef] : null;
    if (!t || t.dizzy) t = alive(enemies)[0];
    targets = t ? [t] : [];
  }
  for (const t of targets) {
    const mult = multFor(move, att, t);
    let dmg = damage(b, att, t, MOVE_INFO[move].power[lvl], mult, timing);
    const shielded = t.shield;
    if (shielded) {
      dmg = Math.max(1, Math.round(dmg * SHIELD));
      t.shield = false;
    }
    dmg = Math.min(dmg, t.hp);
    t.hp -= dmg;
    if (t.hp <= 0) {
      t.hp = 0;
      t.dizzy = true;
      t.shield = false;
    }
    ev.hits.push({
      side: t.side, idx: t.idx, dmg, mult,
      edge: MOVE_INFO[move].element ? edge(att.el, t.el) : null,
      dizzy: t.dizzy, shielded,
    });
  }
  return ev;
}

// Riley's move for the hero whose turn it is. quality 0..1 from the timing moment.
// Returns the event, or null if it is not a hero's turn or the move can't be used.
export function heroMove(b, move, target, quality = 0.5) {
  const cur = current(b);
  if (!cur || cur.side !== 'hero') return null;
  const f = fighterAt(b, cur);
  if (!canUse(f, move)) return null;
  const ev = act(b, f, move, target, timingMult(quality));
  b.log.push(ev);
  advance(b);
  return ev;
}

// The foe whose turn it is does what it said it would.
export function foeMove(b) {
  const cur = current(b);
  if (!cur || cur.side !== 'foe') return null;
  const f = fighterAt(b, cur);
  const intent = b.intents[f.idx] || chooseIntent(b, f);
  let move = intent.move;
  if (!canUse(f, move)) move = 'bonk';
  let target = intent.target;
  if (target != null && b.heroes[target] && b.heroes[target].dizzy) target = null;
  if (target == null && move !== 'bubble' && move !== 'special') target = pickHeroTarget(b, f).idx;
  const ev = act(b, f, move, target, FOE_TIMING);
  b.log.push(ev);
  advance(b);
  return ev;
}

// The hero a foe would rather hit: one it beats on element, else a random awake one.
function pickHeroTarget(b, f) {
  const a = alive(b.heroes);
  const good = a.filter((h) => elementMult(f.el, h.el) > 1);
  const from = good.length && b.rng() < 0.6 ? good : a;
  return from[Math.floor(b.rng() * from.length) % from.length];
}

function chooseIntent(b, f) {
  if (f.moves.special > 0 && f.charge >= CHARGE) return { move: 'special', target: null };
  const friends = alive(b.foes);
  const hurt = friends.some((x) => x.hp < x.max * 0.4);
  if (f.moves.bubble > 0 && hurt && b.rng() < 0.35) return { move: 'bubble', target: null };
  const t = pickHeroTarget(b, f);
  if (!t) return { move: 'bonk', target: null };
  const blastBetter = elementMult(f.el, t.el) > 1 || (elementMult(f.el, t.el) === 1 && b.rng() < 0.4);
  return { move: blastBetter ? 'blast' : 'bonk', target: t.idx };
}

// The foe a hero should aim at by default: one it beats on element, then the weakest.
export function bestTarget(b, hero) {
  const a = alive(b.foes);
  if (!a.length) return 0;
  const score = (f) => (elementMult(hero.el, f.el) > 1 ? 1000 : 0) - f.hp;
  return a.reduce((m, f) => (score(f) > score(m) ? f : m), a[0]).idx;
}

// Ends a battle at once (used by the debug handle): everyone on the losing side is dizzy.
export function forceEnd(b, result) {
  const losers = result === 'win' ? b.foes : b.heroes;
  for (const f of losers) {
    f.hp = 0;
    f.dizzy = true;
  }
  b.over = result;
}
