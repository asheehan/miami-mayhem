// Bots for the tests and the debug handle: a battle player that picks sensible moves, a shopper
// that spends coins the way a child would be shown to, and a whole-campaign player. Pure.
import { createBattle, current, fighterAt, heroMove, foeMove, canUse, preview, bestTarget } from './battle.js';
import { powerOf, canEvolve, randomParts } from './monster.js';
import { STATS } from './parts.js';
import { ZONES, encounter, bossBattle } from './world.js';
import {
  newProgress, makeMonster, teamMons, recordBattle, befriend, snackWorks, bossReady, zoneOpen,
  trainPrice, movePrice, buyTrain, buyMove, buyEvolve, findMon,
} from './progress.js';
import { makeRng } from './rng.js';

// The move a sensible player picks for the hero whose turn it is: { move, target }.
export function botChoice(b) {
  const cur = current(b);
  if (!cur || cur.side !== 'hero') return null;
  const f = fighterAt(b, cur);
  if (canUse(f, 'special')) return { move: 'special', target: null };
  const awake = b.heroes.filter((h) => !h.dizzy);
  const bigHit = b.intents.some((it) => it && it.move === 'special');
  const hurt = awake.some((h) => h.hp < h.max * 0.4);
  if (canUse(f, 'bubble') && (hurt || bigHit) && !awake.every((h) => h.shield)) return { move: 'bubble', target: null };
  const target = bestTarget(b, f);
  const t = b.foes[target];
  const bonk = preview(b, f, 'bonk', t);
  const blast = preview(b, f, 'blast', t);
  return { move: blast > bonk ? 'blast' : 'bonk', target };
}

// Plays a battle to the end. quality(rng) gives each timing moment's result.
export function playBattle(b, rng, quality = (r) => 0.3 + r() * 0.6) {
  for (let i = 0; i < 400 && !b.over; i++) {
    const cur = current(b);
    if (cur.side === 'hero') {
      const c = botChoice(b);
      heroMove(b, c.move, c.target, quality(rng));
    } else foeMove(b);
  }
  return b.over;
}

// The three strongest monsters.
export function bestTeam(p) {
  return [...p.roster].sort((a, b) => powerOf(b) - powerOf(a)).slice(0, 3).map((m) => m.uid);
}

// Spends coins on the team: evolve, learn bubble and special, then the cheapest training or
// move upgrade, until nothing more is affordable.
export function shop(p) {
  for (let guard = 0; guard < 200; guard++) {
    let did = false;
    for (const m of teamMons(p)) {
      if (canEvolve(m) && buyEvolve(p, m.uid)) did = true;
      if (!m.moves.bubble && buyMove(p, m.uid, 'bubble')) did = true;
      if (!m.moves.special && buyMove(p, m.uid, 'special')) did = true;
    }
    const options = [];
    for (const m of teamMons(p)) {
      for (const s of STATS) {
        const price = trainPrice(m, s);
        if (price != null) options.push({ price, buy: () => buyTrain(p, m.uid, s) });
      }
      for (const k of ['bonk', 'blast']) {
        const price = movePrice(m, k);
        if (price != null) options.push({ price: price + 5, buy: () => buyMove(p, m.uid, k) });
      }
    }
    options.sort((a, b) => a.price - b.price);
    if (options.length && options[0].price <= p.coins && options[0].buy()) did = true;
    if (!did) break;
  }
  return p;
}

// Plays from a fresh start until every boss is beaten (or maxBattles).
// Returns { p, battles, perZone: [battles to beat each boss], losses, firstBattle }.
export function playCampaign(seed, { maxBattles = 1500, quality, useShop = true } = {}) {
  const rng = makeRng(seed);
  const p = newProgress();
  makeMonster(p, randomParts(rng), null, Math.floor(rng() * 1e9) + 1);
  const perZone = [];
  let losses = 0;
  let firstBattle = null;
  let count = 0;
  let zoneStart = 0;
  for (; count < maxBattles; count++) {
    const zi = p.zones.findIndex((z) => !z.boss);
    if (zi < 0) break;
    if (!zoneOpen(p, zi)) break;
    const boss = bossReady(p, zi);
    const foes = boss ? bossBattle(zi, seed * 1000 + count) : encounter(zi, seed * 1000 + count, p.zones[zi].wins);
    const b = createBattle({ heroes: teamMons(p), foes, seed: seed * 7 + count });
    const res = playBattle(b, rng, quality);
    if (count === 0) {
      const hp = b.heroes.reduce((s, h) => s + h.hp, 0);
      const max = b.heroes.reduce((s, h) => s + h.max, 0);
      firstBattle = { result: res, hpLeft: hp / max, rounds: b.round };
    }
    const won = res === 'win';
    if (!won) losses += 1;
    recordBattle(p, { zone: zi, foes, boss, won });
    if (won) {
      // befriend the strongest beaten foe
      const best = [...foes].sort((a, b2) => powerOf(b2) - powerOf(a))[0];
      for (let tries = 0; tries < 5; tries++) {
        if (snackWorks(best, tries, rng())) {
          befriend(p, best);
          break;
        }
      }
      if (boss) {
        perZone.push(count + 1 - zoneStart);
        zoneStart = count + 1;
      }
    }
    p.team = bestTeam(p);
    if (useShop) shop(p);
  }
  return { p, battles: count, perZone, losses, firstBattle };
}

export { findMon, ZONES };
