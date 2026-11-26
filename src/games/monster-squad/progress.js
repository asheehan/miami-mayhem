// Saved progress and the economy: the roster and team, coins, maker tokens, zone wins and
// bosses, the monster book, battle rewards, befriending, shop prices and buying. Pure: storage
// is passed in.
//
// localStorage 'monster-squad-save':
//   { v: 1, coins, tokens, bought, nextUid, team: [uid x3], roster: [packed monster],
//     zones: [[wins, boss 0|1], ...], seen: [species id], caught: [species id], battles }
import {
  newMonster, packMonster, unpackMonster, addXp, canEvolve, MAX_TRAIN, MAX_MOVE, MAX_STAGE, MOVES,
} from './monster.js';
import { STATS } from './parts.js';
import { ZONES, SPECIES_BY_ID, BOSS_WINS, wildMonster } from './world.js';

export const SAVE_KEY = 'monster-squad-save';
export const VERSION = 1;
export const TEAM_SIZE = 3;
export const ROSTER_MAX = 500;
export const MAX_COINS = 99999;

export function newProgress() {
  return {
    coins: 0,
    tokens: 1, // monsters he may still make in the maker
    bought: 0, // tokens bought with coins
    nextUid: 1,
    team: [],
    roster: [],
    zones: ZONES.map(() => ({ wins: 0, boss: false })),
    seen: {},
    caught: {},
    battles: 0,
  };
}

// ---------- roster and team ----------

export const findMon = (p, uid) => p.roster.find((m) => m.uid === uid) || null;
export const teamMons = (p) => p.team.map((u) => findMon(p, u)).filter(Boolean);
export const inTeam = (p, uid) => p.team.includes(uid);

function addToRoster(p, mon) {
  if (p.roster.length >= ROSTER_MAX) return null;
  mon.uid = p.nextUid++;
  p.roster.push(mon);
  if (p.team.length < TEAM_SIZE) p.team.push(mon.uid);
  return mon;
}

// Makes a monster in the maker, using a token. Returns it, or null if no token is left.
export function makeMonster(p, parts, name, seed) {
  if (p.tokens < 1) return null;
  const mon = addToRoster(p, newMonster({ parts, name, seed }));
  if (mon) p.tokens -= 1;
  return mon;
}

// Puts a monster in a team slot. If it is already in the team it swaps places.
export function setTeamSlot(p, slot, uid) {
  if (!findMon(p, uid) || slot < 0 || slot >= TEAM_SIZE) return false;
  const team = p.team.slice();
  const at = team.indexOf(uid);
  if (slot >= team.length) {
    if (at >= 0) return false;
    team.push(uid);
  } else if (at >= 0) {
    [team[at], team[slot]] = [team[slot], team[at]];
  } else team[slot] = uid;
  p.team = team;
  return true;
}

// Takes a monster out of the team (never the last one).
export function leaveTeam(p, uid) {
  if (p.team.length <= 1 || !p.team.includes(uid)) return false;
  p.team = p.team.filter((u) => u !== uid);
  return true;
}

// ---------- zones ----------

export const zoneOpen = (p, zi) => zi === 0 || (zi > 0 && zi < ZONES.length && !!p.zones[zi - 1].boss);
export const bossReady = (p, zi) => zoneOpen(p, zi) && p.zones[zi].wins >= BOSS_WINS;
export const zonesOpen = (p) => ZONES.filter((_, i) => zoneOpen(p, i)).length;
export const allBeaten = (p) => p.zones.every((z) => z.boss);

// ---------- battles ----------

// What a battle pays: { coins, xp } (xp goes to every monster in the team, awake or dizzy).
export function battleRewards(zi, foes, { boss = false, won = true } = {}) {
  const lvSum = foes.reduce((s, m) => s + m.lv, 0);
  let coins = boss ? 30 + 15 * zi : 6 + 3 * zi + 2 * foes.length;
  let xp = foes.reduce((s, m) => s + 3 + m.lv, 0) + (boss ? 6 + lvSum : 0);
  if (!won) {
    coins = Math.max(2, Math.round(coins * 0.4));
    xp = Math.max(2, Math.round(xp * 0.4));
  }
  return { coins, xp };
}

// Records a finished battle: pays coins, gives xp, counts the zone win or the boss, fills in
// the book. Returns { coins, xp, ups: [{ uid, from, to }], bossFirst, token }.
export function recordBattle(p, { zone, foes, boss = false, won }) {
  const r = battleRewards(zone, foes, { boss, won });
  p.coins = Math.min(MAX_COINS, p.coins + r.coins);
  p.battles += 1;
  for (const f of foes) if (f.sp) p.seen[f.sp] = 1;
  const ups = [];
  for (const m of teamMons(p)) {
    const from = m.lv;
    if (addXp(m, r.xp) > 0) ups.push({ uid: m.uid, from, to: m.lv });
  }
  let bossFirst = false;
  let token = false;
  const z = p.zones[zone];
  if (won && z) {
    if (boss) {
      if (!z.boss) {
        bossFirst = true;
        token = true;
        p.tokens += 1;
      }
      z.boss = true;
    } else z.wins += 1;
  }
  return { ...r, ups, bossFirst, token };
}

// ---------- befriending ----------

// Chance a snack wins a beaten monster over, by try (0, 1, 2...). The third try always works.
export const FRIEND_CHANCE = { common: [0.7, 0.9, 1], rare: [0.5, 0.8, 1], boss: [0.4, 0.75, 1] };

export function befriendChance(mon, tries) {
  const sp = mon.sp ? SPECIES_BY_ID[mon.sp] : null;
  const table = FRIEND_CHANCE[(sp && sp.rarity) || 'common'];
  return table[Math.min(tries, table.length - 1)];
}

// One snack: roll is 0..1. Returns true if it joins.
export const snackWorks = (mon, tries, roll) => roll < befriendChance(mon, tries);

// The beaten wild monster joins: a fresh copy, awake, at its level, ready to grow.
export function befriend(p, wild) {
  const sp = wild.sp ? SPECIES_BY_ID[wild.sp] : null;
  const mon = sp ? wildMonster(sp, wild.lv) : newMonster({ parts: wild.parts, seed: wild.seed, lv: wild.lv });
  mon.xp = 0;
  // it starts its own journey: not evolved, untrained, the two first moves
  mon.stage = 0;
  mon.train = { hp: 0, bonk: 0, guard: 0, zoom: 0 };
  mon.moves = { bonk: 1, blast: 1, bubble: 0, special: 0 };
  const added = addToRoster(p, mon);
  if (!added) return null;
  if (sp) {
    p.caught[sp.id] = (p.caught[sp.id] || 0) + 1;
    p.seen[sp.id] = 1;
  }
  return added;
}

export const caughtCount = (p) => Object.keys(p.caught).filter((id) => SPECIES_BY_ID[id]).length;

// ---------- the shop ----------

export function trainPrice(mon, stat) {
  const n = mon.train[stat];
  return n >= MAX_TRAIN ? null : 8 + 6 * n;
}

const LEARN = { bubble: 15, special: 30 };
export function movePrice(mon, move) {
  const lv = mon.moves[move] || 0;
  if (lv >= MAX_MOVE) return null;
  if (lv === 0) return LEARN[move] || 15;
  return 25 * lv + (move === 'special' ? 10 : 0);
}

export function evolvePrice(mon) {
  if (mon.stage >= MAX_STAGE) return null;
  return mon.stage === 0 ? 30 : 80;
}

export const tokenPrice = (p) => 40 + 20 * p.bought;

function spend(p, price) {
  if (price == null || p.coins < price) return false;
  p.coins -= price;
  return true;
}

export function buyTrain(p, uid, stat) {
  const m = findMon(p, uid);
  if (!m || !STATS.includes(stat) || !spend(p, trainPrice(m, stat))) return false;
  m.train[stat] += 1;
  return true;
}

export function buyMove(p, uid, move) {
  const m = findMon(p, uid);
  if (!m || !MOVES.includes(move) || !spend(p, movePrice(m, move))) return false;
  m.moves[move] += 1;
  return true;
}

export function buyEvolve(p, uid) {
  const m = findMon(p, uid);
  if (!m || !canEvolve(m)) return false;
  if (!spend(p, evolvePrice(m))) return false;
  m.stage += 1;
  return true;
}

export function buyToken(p) {
  if (!spend(p, tokenPrice(p))) return false;
  p.tokens += 1;
  p.bought += 1;
  return true;
}

// Anything in the shop he can afford right now for this monster.
export function canAffordAny(p, m) {
  if (!m) return false;
  const prices = [
    ...STATS.map((s) => trainPrice(m, s)),
    ...MOVES.map((k) => movePrice(m, k)),
    canEvolve(m) ? evolvePrice(m) : null,
  ];
  return prices.some((x) => x != null && x <= p.coins);
}

// ---------- saving ----------

export function serialize(p) {
  return JSON.stringify({
    v: VERSION,
    coins: p.coins,
    tokens: p.tokens,
    bought: p.bought,
    nextUid: p.nextUid,
    team: p.team,
    roster: p.roster.map(packMonster),
    zones: p.zones.map((z) => [z.wins, z.boss ? 1 : 0]),
    seen: Object.keys(p.seen),
    caught: Object.entries(p.caught),
    battles: p.battles,
  });
}

const int = (v, lo, hi, d) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : d);

// Anything at all to a good progress: junk is dropped, numbers are clamped, the team only
// holds monsters on the roster, and zones only count as beaten in order.
export function sanitize(raw) {
  const p = newProgress();
  if (!raw || typeof raw !== 'object' || raw.v !== VERSION) return p;
  p.coins = int(raw.coins, 0, MAX_COINS, 0);
  p.tokens = int(raw.tokens, 0, 99, 1);
  p.bought = int(raw.bought, 0, 999, 0);
  const seenUid = new Set();
  if (Array.isArray(raw.roster)) {
    for (const r of raw.roster.slice(0, ROSTER_MAX)) {
      const m = unpackMonster(r);
      if (!m || !m.uid || seenUid.has(m.uid)) continue;
      if (m.sp && !SPECIES_BY_ID[m.sp]) m.sp = null;
      seenUid.add(m.uid);
      p.roster.push(m);
    }
  }
  const maxUid = p.roster.reduce((x, m) => Math.max(x, m.uid), 0);
  p.nextUid = Math.max(maxUid + 1, int(raw.nextUid, 1, 1e9, 1));
  if (Array.isArray(raw.team)) {
    for (const u of raw.team) if (seenUid.has(u) && !p.team.includes(u) && p.team.length < TEAM_SIZE) p.team.push(u);
  }
  for (const m of p.roster) if (p.team.length < TEAM_SIZE && !p.team.includes(m.uid)) p.team.push(m.uid);
  if (Array.isArray(raw.zones)) {
    let open = true;
    p.zones.forEach((z, i) => {
      const r = Array.isArray(raw.zones[i]) ? raw.zones[i] : [];
      z.wins = open ? int(r[0], 0, 99999, 0) : 0;
      z.boss = open && r[1] === 1;
      if (!z.boss) open = false;
    });
  }
  if (Array.isArray(raw.seen)) for (const id of raw.seen) if (SPECIES_BY_ID[id]) p.seen[id] = 1;
  if (Array.isArray(raw.caught)) {
    for (const e of raw.caught) {
      if (Array.isArray(e) && SPECIES_BY_ID[e[0]]) {
        p.caught[e[0]] = int(e[1], 1, 9999, 1);
        p.seen[e[0]] = 1;
      }
    }
  }
  p.battles = int(raw.battles, 0, 1e7, 0);
  // never stuck: no monster and no token means a token
  if (!p.roster.length && p.tokens < 1) p.tokens = 1;
  return p;
}

export function parse(text) {
  try {
    return sanitize(JSON.parse(text || 'null'));
  } catch {
    return newProgress();
  }
}

export function loadProgress(storage) {
  try {
    return parse(storage.getItem(SAVE_KEY));
  } catch {
    return newProgress();
  }
}

// Returns true if it was written. A full or missing storage is ignored: play carries on.
export function saveProgress(storage, p) {
  try {
    storage.setItem(SAVE_KEY, serialize(p));
    return true;
  } catch {
    return false;
  }
}
