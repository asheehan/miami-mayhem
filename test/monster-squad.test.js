import { describe, it, expect } from 'vitest';
import {
  PART_KEYS, PART_LISTS, BODIES, STATS, MAX_PIP, ELEMENTS, BEATS, elementMult, edge, combinations, isPart,
} from '../src/games/monster-squad/parts.js';
import {
  randomMonster, randomParts, newMonster, pipsOf, statsOf, makeName, addXp, xpNeed, canEvolve, isValidMonster,
  packMonster, unpackMonster, MAX_LEVEL, EVOLVE_AT,
} from '../src/games/monster-squad/monster.js';
import {
  ZONES, SPECIES, SPECIES_BY_ID, speciesIn, bossOf, encounter, bossBattle, wildMonster, BOSS_WINS,
} from '../src/games/monster-squad/world.js';
import {
  createBattle, current, heroMove, foeMove, canUse, preview, timingMult, fighterAt, CHARGE, MOVE_INFO,
} from '../src/games/monster-squad/battle.js';
import {
  newProgress, makeMonster, recordBattle, battleRewards, befriend, befriendChance, snackWorks, zoneOpen, bossReady,
  buyTrain, buyMove, buyEvolve, buyToken, trainPrice, movePrice, evolvePrice, tokenPrice, setTeamSlot, leaveTeam,
  serialize, parse, sanitize, loadProgress, saveProgress, SAVE_KEY, VERSION, teamMons, caughtCount, ROSTER_MAX,
} from '../src/games/monster-squad/progress.js';
import { playBattle, playCampaign, botChoice, shop } from '../src/games/monster-squad/bot.js';
import {
  makerLayout, mapLayout, zoneLayout, battleLayout, panelLayout, befriendLayout, squadLayout, upgradeLayout, bookLayout,
  cornerButton,
} from '../src/games/monster-squad/layout.js';
import { drawMonster, bodyGeom, headroom, halfWidthAt, topAt } from '../src/games/monster-squad/draw-monster.js';
import { makeRng } from '../src/games/monster-squad/rng.js';

// A stand-in 2D context that accepts every call and records any number that is not finite.
function fakeCtx() {
  const bad = [];
  const target = { bad, calls: 0 };
  const grad = { addColorStop() {} };
  const handler = {
    get(t, key) {
      if (key in t) return t[key];
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => grad;
      if (key === 'measureText') return () => ({ width: 10 });
      return (...args) => {
        t.calls += 1;
        for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) bad.push(`${String(key)}(${args.join(',')})`);
      };
    },
    set(t, key, v) {
      t[key] = v;
      return true;
    },
  };
  return new Proxy(target, handler);
}

// ---------------------------------------------------------------------------------------------

describe('parts and elements', () => {
  it('make well over a thousand different monsters', () => {
    expect(combinations()).toBeGreaterThan(1e6);
    for (const k of PART_KEYS) expect(PART_LISTS[k].length).toBeGreaterThanOrEqual(3);
  });

  it('every part id is unique within its list', () => {
    for (const k of PART_KEYS) {
      const ids = PART_LISTS[k].map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('within a category every choice adds the same total, so no monster is simply better', () => {
    const total = (st) => STATS.reduce((s, k) => s + (st[k] || 0), 0);
    for (const k of ['body', 'top', 'arms', 'legs', 'back']) {
      const totals = new Set(PART_LISTS[k].map((p) => total(p.stats)));
      expect(totals.size, k).toBe(1);
    }
  });

  it('parts show in the stats the way a child can see: big arms bonk, wings zoom, a shell guards', () => {
    const base = { body: 'bean', colour: 'pink', pattern: 'plain', eyes: 'googly', mouth: 'smile', top: 'none', arms: 'stubby', legs: 'stubby', back: 'none', element: 'sun' };
    expect(pipsOf({ ...base, arms: 'muscle' }).bonk).toBeGreaterThan(pipsOf(base).bonk);
    expect(pipsOf({ ...base, back: 'wings' }).zoom).toBeGreaterThan(pipsOf(base).zoom);
    expect(pipsOf({ ...base, back: 'shell' }).guard).toBeGreaterThan(pipsOf(base).guard);
    expect(pipsOf({ ...base, legs: 'wheels' }).zoom).toBeGreaterThan(pipsOf(base).zoom);
  });

  it('the element ring: sun melts ice, ice freezes the wave, the wave puts out the sun', () => {
    expect(ELEMENTS.length).toBe(3);
    expect(BEATS).toEqual({ sun: 'ice', ice: 'wave', wave: 'sun' });
    for (const a of ELEMENTS) {
      expect(elementMult(a, BEATS[a])).toBeGreaterThan(1);
      expect(elementMult(BEATS[a], a)).toBeLessThan(1);
      expect(elementMult(a, a)).toBe(1);
      expect(edge(a, BEATS[a])).toBe('up');
      expect(edge(BEATS[a], a)).toBe('down');
    }
  });
});

describe('monsters', () => {
  it('random monsters are valid, with pips in range, and the same seed gives the same monster', () => {
    for (let s = 1; s < 300; s++) {
      const m = randomMonster(s);
      expect(isValidMonster(m)).toBe(true);
      const p = pipsOf(m.parts);
      for (const k of STATS) expect(p[k]).toBeGreaterThanOrEqual(1), expect(p[k]).toBeLessThanOrEqual(MAX_PIP);
      expect(randomMonster(s)).toEqual(m);
    }
  });

  it('names are made from syllables, short and different', () => {
    const names = new Set();
    for (let s = 1; s < 200; s++) {
      const n = makeName(s);
      expect(n).toMatch(/^[A-Z][a-z]+$/);
      expect(n.length).toBeLessThanOrEqual(10);
      names.add(n);
    }
    expect(names.size).toBeGreaterThan(150);
  });

  it('levels up through xp and grows its stats; evolving makes it bigger still', () => {
    const m = randomMonster(5);
    const s1 = statsOf(m);
    expect(addXp(m, xpNeed(1) + xpNeed(2))).toBe(2);
    expect(m.lv).toBe(3);
    const s3 = statsOf(m);
    expect(s3.hp).toBeGreaterThan(s1.hp);
    expect(s3.bonk).toBeGreaterThan(s1.bonk);
    expect(canEvolve(m)).toBe(false);
    addXp(m, 10000);
    expect(m.lv).toBe(MAX_LEVEL);
    expect(canEvolve(m)).toBe(true);
    const before = statsOf(m).hp;
    m.stage = 1;
    expect(statsOf(m).hp).toBeGreaterThan(before);
  });

  it('stats stay small and legible', () => {
    const m = randomMonster(9);
    m.lv = MAX_LEVEL;
    m.stage = 2;
    m.train = { hp: 5, bonk: 5, guard: 5, zoom: 5 };
    const st = statsOf(m);
    for (const k of STATS) expect(st[k]).toBeLessThan(1000);
  });

  it('packs and unpacks for the save, and junk unpacks to nothing or to something safe', () => {
    for (let s = 1; s < 50; s++) {
      const m = randomMonster(s, { uid: s });
      m.lv = 7;
      m.xp = 3;
      m.train.bonk = 2;
      m.moves.special = 1;
      expect(unpackMonster(JSON.parse(JSON.stringify(packMonster(m))))).toEqual(m);
    }
    expect(unpackMonster(null)).toBe(null);
    expect(unpackMonster('x')).toBe(null);
    expect(unpackMonster({})).toBe(null);
    const odd = unpackMonster({ u: 3, p: [99, -5, 'a', null], l: 9999, e: 7, t: [100, -1], m: [0, 0, 9, 'x'], n: 5 });
    expect(isValidMonster(odd)).toBe(true);
    expect(odd.lv).toBe(MAX_LEVEL);
    expect(odd.moves.bonk).toBe(1);
  });
});

describe('wild species and zones', () => {
  it('has 40+ species, each valid, in 7 zones with a rare and a boss each', () => {
    expect(SPECIES.length).toBeGreaterThanOrEqual(40);
    expect(new Set(SPECIES.map((s) => s.id)).size).toBe(SPECIES.length);
    expect(new Set(SPECIES.map((s) => s.name)).size).toBe(SPECIES.length);
    for (const sp of SPECIES) {
      for (const k of PART_KEYS) expect(isPart(k, sp.parts[k]), `${sp.id}.${k}`).toBe(true);
      expect(isValidMonster(wildMonster(sp, 5))).toBe(true);
    }
    ZONES.forEach((z, i) => {
      const list = speciesIn(i);
      expect(list.filter((s) => s.rarity === 'boss').length).toBe(1);
      expect(list.filter((s) => s.rarity === 'rare').length).toBeGreaterThanOrEqual(1);
      expect(list.filter((s) => s.rarity === 'common').length).toBeGreaterThanOrEqual(3);
      expect(bossOf(i).zone).toBe(i);
    });
  });

  it('species within a zone look different from each other', () => {
    const key = (p) => PART_KEYS.filter((k) => k !== 'element').map((k) => p[k]).join('.');
    expect(new Set(SPECIES.map((s) => key(s.parts))).size).toBe(SPECIES.length);
  });

  it('every species draws in every pose at any size without bad numbers', () => {
    const ctx = fakeCtx();
    for (const sp of SPECIES) {
      for (const pose of ['idle', 'attack', 'hit', 'dizzy', 'happy']) {
        for (const size of [30, 140, 400]) {
          drawMonster(ctx, { parts: sp.parts, stage: sp.rarity === 'boss' ? 2 : 0 }, 100, 200, size, { pose, p: 0.5, t: 1.3, face: -1 });
        }
      }
      expect(Number.isFinite(headroom(sp.parts, 2))).toBe(true);
    }
    expect(ctx.bad).toEqual([]);
    expect(ctx.calls).toBeGreaterThan(1000);
  });

  it('random built monsters draw too', () => {
    const ctx = fakeCtx();
    for (let s = 0; s < 300; s++) drawMonster(ctx, randomMonster(s), 0, 0, 120, { t: s * 0.1, pose: ['idle', 'attack', 'hit', 'dizzy', 'happy'][s % 5] });
    expect(ctx.bad).toEqual([]);
  });

  it('body outlines give sensible anchors for parts', () => {
    for (const b of BODIES) {
      const g = bodyGeom(b.id);
      expect(g.top).toBeLessThan(-80);
      expect(g.bottom).toBeGreaterThan(-20);
      expect(halfWidthAt(g, b.arm)).toBeGreaterThan(20);
      expect(topAt(g, 0)).toBeLessThan(b.face.y);
      expect(b.face.my).toBeGreaterThan(b.face.y);
    }
  });

  it('encounters are 1 to 3 monsters at the zone levels; the very first is one easy level 1', () => {
    for (let s = 1; s < 200; s++) {
      const zi = s % ZONES.length;
      const foes = encounter(zi, s, 2);
      expect(foes.length).toBeGreaterThanOrEqual(1);
      expect(foes.length).toBeLessThanOrEqual(3);
      for (const f of foes) {
        expect(f.lv).toBeGreaterThanOrEqual(ZONES[zi].levels[0]);
        expect(f.lv).toBeLessThanOrEqual(ZONES[zi].levels[1]);
        expect(SPECIES_BY_ID[f.sp].zone).toBe(zi);
      }
      const first = encounter(0, s, 0);
      expect(first.length).toBe(1);
      expect(first[0].lv).toBe(1);
      expect(SPECIES_BY_ID[first[0].sp].rarity).toBe('common');
    }
    const boss = bossBattle(3, 5);
    expect(SPECIES_BY_ID[boss[0].sp].rarity).toBe('boss');
  });

  it('zones unlock in order as bosses are beaten', () => {
    const p = newProgress();
    expect(zoneOpen(p, 0)).toBe(true);
    expect(zoneOpen(p, 1)).toBe(false);
    expect(bossReady(p, 0)).toBe(false);
    p.zones[0].wins = BOSS_WINS;
    expect(bossReady(p, 0)).toBe(true);
    p.zones[0].boss = true;
    expect(zoneOpen(p, 1)).toBe(true);
    expect(zoneOpen(p, 2)).toBe(false);
  });
});

describe('battles', () => {
  const team = () => [randomMonster(1), randomMonster(2), randomMonster(3)];

  it('is deterministic for a seed', () => {
    const run = () => {
      const b = createBattle({ heroes: team(), foes: encounter(1, 4, 1), seed: 99 });
      playBattle(b, makeRng(7));
      return JSON.stringify(b.log);
    };
    expect(run()).toBe(run());
  });

  it('goes fastest first and lets only the current side act', () => {
    const b = createBattle({ heroes: team(), foes: encounter(1, 4, 1), seed: 3 });
    const zooms = b.order.map((r) => fighterAt(b, r).zoom);
    expect([...zooms].sort((a, c) => c - a)).toEqual(zooms);
    const cur = current(b);
    if (cur.side === 'hero') expect(foeMove(b)).toBe(null);
    else expect(heroMove(b, 'bonk', 0, 1)).toBe(null);
  });

  it('a better timing hits harder but a poor one still hits', () => {
    expect(timingMult(0)).toBe(1);
    expect(timingMult(1)).toBe(1.5);
    const hero = randomMonster(4);
    const foe = wildMonster(SPECIES[0], 1);
    hero.parts.legs = 'wheels'; // make sure the hero goes first
    hero.parts.back = 'wings';
    const hit = (q) => {
      const b = createBattle({ heroes: [hero], foes: [foe], seed: 1 });
      return heroMove(b, 'bonk', 0, q).hits[0].dmg;
    };
    expect(hit(0)).toBeGreaterThan(0);
    expect(hit(1)).toBeGreaterThan(hit(0));
  });

  it('element blasts are super against the element they beat, and weak the other way', () => {
    const mk = (el, zoom) => newMonster({ parts: { ...randomParts(makeRng(3)), element: el, legs: zoom ? 'wheels' : 'stubby', back: 'none' }, seed: 2 });
    for (const el of ELEMENTS) {
      const b = createBattle({ heroes: [mk(el, true)], foes: [mk(BEATS[el], false), mk(el, false)], seed: 1 });
      const n = preview(b, b.heroes[0], 'blast', b.foes[0]);
      const same = preview(b, b.heroes[0], 'blast', b.foes[1]);
      expect(n).toBeGreaterThan(same);
      const ev = heroMove(b, 'blast', 0, 0.5);
      expect(ev.hits[0].edge).toBe('up');
    }
  });

  it('bubble heals the most hurt friend and halves the next hit; special needs a full charge', () => {
    const h = randomMonster(8);
    h.moves.bubble = 1;
    h.moves.special = 1;
    h.parts.legs = 'wheels';
    h.parts.back = 'wings';
    const foe = wildMonster(SPECIES[1], 1);
    const b = createBattle({ heroes: [h], foes: [foe], seed: 2 });
    expect(canUse(b.heroes[0], 'special')).toBe(false);
    b.heroes[0].hp -= 10;
    const ev = heroMove(b, 'bubble', null, 1);
    expect(ev.heal.amount).toBeGreaterThan(0);
    expect(b.heroes[0].shield).toBe(true);
    const fe = foeMove(b);
    if (fe.hits.length) expect(fe.hits[0].shielded).toBe(true);
    b.heroes[0].charge = CHARGE;
    expect(canUse(b.heroes[0], 'special')).toBe(true);
    expect(MOVE_INFO.special.all).toBe(true);
  });

  it('foes say what they will do (intents) and nobody can go below 0', () => {
    const b = createBattle({ heroes: team(), foes: encounter(4, 9, 2), seed: 8 });
    for (const it of b.intents) if (it) expect(['bonk', 'blast', 'bubble', 'special']).toContain(it.move);
    playBattle(b, makeRng(1));
    expect(b.over).not.toBe(null);
    for (const f of [...b.heroes, ...b.foes]) expect(f.hp).toBeGreaterThanOrEqual(0);
  });

  it('battles are short: a handful of rounds', () => {
    const rounds = [];
    for (let s = 1; s < 60; s++) {
      const b = createBattle({ heroes: team(), foes: encounter(0, s, 2), seed: s });
      playBattle(b, makeRng(s));
      rounds.push(b.round);
    }
    const avg = rounds.reduce((a, c) => a + c, 0) / rounds.length;
    expect(avg).toBeLessThan(7);
  });

  it('a fresh starter wins the first battle comfortably, even with poor timing', () => {
    let wins = 0;
    let hpLeft = 0;
    const N = 300;
    for (let s = 1; s <= N; s++) {
      const starter = randomMonster(s * 13);
      const b = createBattle({ heroes: [starter], foes: encounter(0, s, 0), seed: s });
      playBattle(b, makeRng(s), () => 0.2);
      if (b.over === 'win') wins += 1;
      hpLeft += b.heroes[0].hp / b.heroes[0].max;
    }
    expect(wins / N).toBeGreaterThan(0.97);
    expect(hpLeft / N).toBeGreaterThan(0.35);
  });

  it('the bot picks blast when it has the element edge', () => {
    const mk = (el, zoom) => newMonster({ parts: { ...randomParts(makeRng(5)), element: el, legs: zoom ? 'wheels' : 'stubby', arms: 'tiny' }, seed: 2 });
    const b = createBattle({ heroes: [mk('wave', true)], foes: [mk('sun', false)], seed: 3 });
    expect(botChoice(b).move).toBe('blast');
  });
});

describe('the whole game is beatable', () => {
  it('a sensible player who upgrades beats every boss in every zone', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const r = playCampaign(seed, { maxBattles: 400 });
      expect(r.perZone.length, `seed ${seed}`).toBe(ZONES.length);
      expect(r.p.zones.every((z) => z.boss)).toBe(true);
      expect(r.battles).toBeLessThan(150);
      // never so easy it is just tapping: bosses later on sometimes need another go
      expect(r.firstBattle.result).toBe('win');
    }
  });

  it('even with poor timing every zone is still beatable', () => {
    const r = playCampaign(11, { maxBattles: 600, quality: () => 0.15 });
    expect(r.p.zones.every((z) => z.boss)).toBe(true);
  });
});

describe('economy', () => {
  it('losing still pays coins and xp, so he can never be stuck', () => {
    for (let zi = 0; zi < ZONES.length; zi++) {
      const foes = encounter(zi, 3, 1);
      const r = battleRewards(zi, foes, { won: false });
      expect(r.coins).toBeGreaterThan(0);
      expect(r.xp).toBeGreaterThan(0);
      expect(battleRewards(zi, foes, { won: true }).coins).toBeGreaterThan(r.coins);
    }
  });

  it('battles are always free and the first zone is always open', () => {
    const p = newProgress();
    p.coins = 0;
    expect(zoneOpen(p, 0)).toBe(true);
    // a brand new save always has a token to make the first monster
    expect(p.tokens).toBe(1);
    expect(sanitize({ v: VERSION, tokens: 0, roster: [] }).tokens).toBe(1);
  });

  it('the next thing in the shop is always within a few battles of coins', () => {
    const p = newProgress();
    const m = makeMonster(p, randomParts(makeRng(1)), 'A', 1);
    const cheapest = Math.min(trainPrice(m, 'hp'), movePrice(m, 'bubble'));
    const perBattle = battleRewards(0, encounter(0, 1, 0), { won: true }).coins;
    expect(cheapest / perBattle).toBeLessThan(3);
    // and losing every time still gets there
    const lose = battleRewards(0, encounter(0, 1, 0), { won: false }).coins;
    expect(cheapest / lose).toBeLessThan(8);
  });

  it('buying: prices rise, maxed things stop, coins never go negative', () => {
    const p = newProgress();
    const m = makeMonster(p, randomParts(makeRng(2)), 'B', 2);
    p.coins = 10000;
    const a = trainPrice(m, 'bonk');
    expect(buyTrain(p, m.uid, 'bonk')).toBe(true);
    expect(trainPrice(m, 'bonk')).toBeGreaterThan(a);
    for (let i = 0; i < 10; i++) buyTrain(p, m.uid, 'bonk');
    expect(m.train.bonk).toBe(5);
    expect(trainPrice(m, 'bonk')).toBe(null);
    expect(buyMove(p, m.uid, 'special')).toBe(true);
    expect(m.moves.special).toBe(1);
    expect(buyEvolve(p, m.uid)).toBe(false); // too young
    m.lv = EVOLVE_AT[0];
    expect(buyEvolve(p, m.uid)).toBe(true);
    expect(m.stage).toBe(1);
    expect(evolvePrice(m)).toBeGreaterThan(0);
    p.coins = 1;
    expect(buyTrain(p, m.uid, 'hp')).toBe(false);
    expect(buyToken(p)).toBe(false);
    expect(p.coins).toBe(1);
    p.coins = tokenPrice(p);
    expect(buyToken(p)).toBe(true);
    expect(p.coins).toBe(0);
  });

  it('records wins toward the boss, a boss win gives a maker token, and befriending fills the book', () => {
    const p = newProgress();
    makeMonster(p, randomParts(makeRng(3)), 'C', 3);
    const foes = encounter(0, 5, 0);
    recordBattle(p, { zone: 0, foes, won: true });
    expect(p.zones[0].wins).toBe(1);
    expect(p.seen[foes[0].sp]).toBe(1);
    const r = recordBattle(p, { zone: 0, foes: bossBattle(0, 1), boss: true, won: true });
    expect(r.bossFirst).toBe(true);
    expect(p.tokens).toBe(1);
    expect(zoneOpen(p, 1)).toBe(true);
    const mon = befriend(p, foes[0]);
    expect(mon.uid).toBeGreaterThan(0);
    expect(caughtCount(p)).toBe(1);
    expect(teamMons(p).length).toBe(2);
  });

  it('befriending is likely, and certain by the third snack', () => {
    for (const sp of SPECIES) {
      const m = wildMonster(sp, 3);
      expect(befriendChance(m, 0)).toBeGreaterThanOrEqual(0.4);
      expect(snackWorks(m, 2, 0.9999)).toBe(true);
    }
  });

  it('team slots: swap, add, and never empty the team', () => {
    const p = newProgress();
    p.tokens = 5;
    const a = makeMonster(p, randomParts(makeRng(1)), 'A', 1);
    const b = makeMonster(p, randomParts(makeRng(2)), 'B', 2);
    expect(p.team).toEqual([a.uid, b.uid]);
    expect(setTeamSlot(p, 0, b.uid)).toBe(true);
    expect(p.team).toEqual([b.uid, a.uid]);
    expect(leaveTeam(p, a.uid)).toBe(true);
    expect(leaveTeam(p, b.uid)).toBe(false);
  });

  it('the roster can hold hundreds', () => {
    const p = newProgress();
    p.tokens = 1;
    makeMonster(p, randomParts(makeRng(1)), 'A', 1);
    for (let i = 0; i < 400; i++) befriend(p, wildMonster(SPECIES[i % SPECIES.length], 3));
    expect(p.roster.length).toBe(401);
    expect(ROSTER_MAX).toBeGreaterThanOrEqual(400);
    const back = parse(serialize(p));
    expect(back.roster.length).toBe(401);
  });
});

describe('saving', () => {
  const memStore = () => {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m };
  };

  it('round-trips a played game', () => {
    const r = playCampaign(3, { maxBattles: 40 });
    const s = memStore();
    expect(saveProgress(s, r.p)).toBe(true);
    expect(SAVE_KEY.startsWith('monster-squad')).toBe(true);
    const back = loadProgress(s);
    expect(JSON.parse(serialize(back))).toEqual(JSON.parse(serialize(r.p)));
  });

  it('survives garbage, old versions and missing storage', () => {
    for (const junk of [null, '', 'nope', '{', '[]', '42', 'null', '{"v":0,"coins":5}', '{"v":1,"coins":"lots","roster":"x","team":{},"zones":7}',
      JSON.stringify({ v: 1, coins: -50, roster: [null, 1, { p: [1] }, { u: 2, p: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }], team: [2, 2, 99], zones: [[3, 1], [2, 0], [9, 1]] })]) {
      const p = parse(junk);
      expect(p.coins).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(p.roster)).toBe(true);
      expect(p.zones.length).toBe(ZONES.length);
      for (const u of p.team) expect(p.roster.some((m) => m.uid === u)).toBe(true);
    }
    const p = parse(JSON.stringify({ v: 1, roster: [{ u: 2, p: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }], team: [2, 2, 99], zones: [[3, 1], [2, 0], [9, 1]] }));
    expect(p.team).toEqual([2]);
    // a zone can't be beaten if the one before it wasn't
    expect(p.zones[2].boss).toBe(false);
    expect(p.nextUid).toBeGreaterThan(2);
    expect(loadProgress({ getItem() { throw new Error('denied'); } }).coins).toBe(0);
  });

  it('a full storage is ignored without throwing', () => {
    const full = { getItem: () => null, setItem() { throw new Error('QuotaExceededError'); } };
    const p = newProgress();
    expect(() => saveProgress(full, p)).not.toThrow();
    expect(saveProgress(full, p)).toBe(false);
  });
});

describe('layout', () => {
  const SIZES = [[820, 1180], [1180, 820], [390, 844]];
  const MIN = 44;

  function check(name, w, h, buttons) {
    for (const b of buttons) {
      const tag = `${name} ${w}x${h} ${b.id}${b.key || ''}${b.index ?? ''}`;
      expect(b.x, tag).toBeGreaterThanOrEqual(0);
      expect(b.y, tag).toBeGreaterThanOrEqual(0);
      expect(b.x + b.w, tag).toBeLessThanOrEqual(w + 0.01);
      expect(b.y + b.h, tag).toBeLessThanOrEqual(h + 0.01);
      expect(Math.min(b.w, b.h), tag).toBeGreaterThanOrEqual(MIN);
    }
    for (let i = 0; i < buttons.length; i++) {
      for (let j = i + 1; j < buttons.length; j++) {
        const a = buttons[i];
        const c = buttons[j];
        const ox = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x);
        const oy = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
        expect(ox > 0.5 && oy > 0.5, `${name} ${w}x${h}: ${a.id}${a.key || a.index || ''} overlaps ${c.id}${c.key || c.index || ''}`).toBe(false);
      }
    }
  }

  for (const [w, h] of SIZES) {
    it(`every screen fits, buttons are big and apart at ${w}x${h}`, () => {
      for (const tab of PART_KEYS) {
        check(`maker:${tab}`, w, h, makerLayout(w, h, { tab }).buttons);
        check(`maker-first:${tab}`, w, h, makerLayout(w, h, { tab, first: true }).buttons);
      }
      check('map', w, h, mapLayout(w, h).buttons);
      check('zone', w, h, zoneLayout(w, h).buttons);
      for (let nh = 1; nh <= 3; nh++) for (let nf = 1; nf <= 3; nf++) check(`battle ${nh}v${nf}`, w, h, battleLayout(w, h, nh, nf).buttons);
      check('panel', w, h, panelLayout(w, h).buttons);
      for (let n = 1; n <= 3; n++) check(`pick ${n}`, w, h, befriendLayout(w, h, n, true).buttons);
      check('snacks', w, h, befriendLayout(w, h, 1, false).buttons);
      for (const n of [0, 1, 7, 40, 300]) {
        const first = squadLayout(w, h, n, 0);
        check(`squad ${n}`, w, h, first.buttons);
        check(`squad ${n} last page`, w, h, squadLayout(w, h, n, first.pages - 1).buttons);
        expect(first.per).toBeGreaterThanOrEqual(6);
      }
      check('upgrade', w, h, upgradeLayout(w, h).buttons);
      check('book', w, h, bookLayout(w, h).buttons);
    });
  }

  it('the home or back button is in the same top-left spot on every screen', () => {
    const [w, h] = [820, 1180];
    const c = cornerButton(w, h);
    for (const L of [mapLayout(w, h), zoneLayout(w, h), battleLayout(w, h, 3, 2), squadLayout(w, h, 10), upgradeLayout(w, h), bookLayout(w, h), makerLayout(w, h)]) {
      expect({ x: L.buttons[0].x, y: L.buttons[0].y }).toEqual({ x: c.x, y: c.y });
    }
  });

  it('the maker shows every option of every tab', () => {
    for (const [w, h] of SIZES) for (const tab of PART_KEYS) {
      expect(makerLayout(w, h, { tab }).buttons.filter((b) => b.id === 'opt').length).toBe(PART_LISTS[tab].length);
    }
  });

  it('the squad pages reach every monster in the roster', () => {
    for (const [w, h] of SIZES) {
      const n = 123;
      const seen = new Set();
      const { pages } = squadLayout(w, h, n, 0);
      for (let pg = 0; pg < pages; pg++) for (const b of squadLayout(w, h, n, pg).buttons) if (b.id === 'mon') seen.add(b.index);
      expect(seen.size).toBe(n);
    }
  });
});

describe('the bot shopper', () => {
  it('spends coins on the team without going below zero', () => {
    const p = newProgress();
    makeMonster(p, randomParts(makeRng(9)), 'Z', 9);
    p.coins = 500;
    shop(p);
    expect(p.coins).toBeGreaterThanOrEqual(0);
    expect(p.coins).toBeLessThan(500);
  });
});
