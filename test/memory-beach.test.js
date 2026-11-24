import { describe, it, expect } from 'vitest';
import { LEVELS, TWO_SIZES, twoPlayerLevel } from '../src/games/memory-beach/levels.js';
import { LIBRARY, TINTABLE, COLOURS, BUDDY_PAIRS, ALBUM } from '../src/games/memory-beach/catalog.js';
import {
  deal, createGame, tapCard, tick, sameGroup, groupCount, groupSize, starLimits, starsFor, winnerOf, startGull,
  startWave, playArea, gridLayout, cardRect, slotAt, loadProgress, saveProgress, emptyProgress, recordStars,
  addToAlbum, seenAlbum, unlocked, SAVE_KEY, LOOK_TIME, DEAL_TIME, GULL_TIME, WAVE_TIME, WAVE_SHOW, WAVE_HIDE,
  MIN_CARD, MAX_COLS, FLIP_TIME,
} from '../src/games/memory-beach/logic.js';
import { playGame } from '../src/games/memory-beach/bot.js';
import { DRAW, drawPicture } from '../src/games/memory-beach/pictures.js';

const run = (s, secs, dt = 1 / 60) => {
  for (let t = 0; t < secs - 1e-9; t += dt) tick(s, dt);
};
// a game straight into play: no preview, the deal finished
const ready = (level, seed = 1, opts) => {
  const s = createGame({ preview: 0, ...level }, seed, opts);
  run(s, DEAL_TIME + 0.05);
  return s;
};
const slotsOf = (s, group) => s.cards.map((c, i) => (c.group === group ? i : -1)).filter((i) => i >= 0);
const otherGroup = (s, group) => s.cards.find((c) => c.group !== group).group;
const count = (arr) => arr.reduce((m, k) => m.set(k, (m.get(k) || 0) + 1), new Map());

const pairs = (cols = 3, rows = 4) => ({ cols, rows, mode: 'pairs' });

describe('the picture catalogue', () => {
  it('has at least 36 library pictures, every one drawable, no repeats', () => {
    expect(LIBRARY.length).toBeGreaterThanOrEqual(36);
    expect(new Set(LIBRARY.map((p) => p.id)).size).toBe(LIBRARY.length);
    for (const id of ALBUM) expect(typeof DRAW[id]).toBe('function');
    for (const p of TINTABLE) expect(LIBRARY.some((l) => l.id === p.id)).toBe(true);
  });

  it('draws every picture through the ctx alone (no DOM), in every colour', () => {
    const calls = { n: 0 };
    const grad = { addColorStop() {} };
    const ctx = new Proxy({}, {
      get(target, k) {
        if (k in target) return target[k];
        if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
        return () => {
          calls.n++;
        };
      },
      set(target, k, v) {
        target[k] = v;
        return true;
      },
    });
    for (const id of ALBUM) {
      const before = calls.n;
      drawPicture(ctx, id, 0, 0, 100);
      expect(calls.n - before).toBeGreaterThan(10);
    }
    for (const p of TINTABLE) for (const c of COLOURS) drawPicture(ctx, p.id, 0, 0, 60, c.id);
  });

  it('has enough buddy pairs and colours for the biggest levels, none sharing a picture', () => {
    const ids = BUDDY_PAIRS.flatMap((p) => [p.a, p.b]);
    expect(new Set(ids).size).toBe(ids.length);
    const families = new Set(BUDDY_PAIRS.filter((p) => p.family).map((p) => p.family));
    const spread = BUDDY_PAIRS.filter((p) => !p.family).length + families.size;
    for (const L of LEVELS.filter((l) => l.mode === 'buddies')) expect(groupCount(L)).toBeLessThanOrEqual(spread);
    expect(COLOURS.length).toBe(5);
  });
});

describe('dealing', () => {
  it('fills the grid, every picture exactly the right number of times', () => {
    for (const [i, L] of LEVELS.entries()) {
      for (const seed of [1, 2, 3, 99]) {
        const cards = deal(L, seed * 31 + i);
        expect(cards).toHaveLength(L.cols * L.rows);
        const groups = count(cards.map((c) => c.group));
        expect(groups.size).toBe(groupCount(L));
        for (const n of groups.values()) expect(n).toBe(groupSize(L));
        if (L.mode === 'pairs' || L.mode === 'triples') {
          for (const n of count(cards.map((c) => c.pic)).values()) expect(n).toBe(groupSize(L));
        }
        if (L.mode === 'colour') {
          for (const n of count(cards.map((c) => `${c.pic}|${c.colour}`)).values()) expect(n).toBe(2);
          // each picture really comes in more than one colour
          for (const n of count(cards.map((c) => c.pic)).values()) expect(n).toBe(2 * L.colours);
        }
        if (L.mode === 'buddies') {
          for (const n of count(cards.map((c) => c.pic)).values()) expect(n).toBe(1);
        }
      }
    }
  });

  it('is the same for the same seed and different for another', () => {
    const L = LEVELS[12];
    expect(deal(L, 42)).toEqual(deal(L, 42));
    expect(deal(L, 42).map((c) => c.pic)).not.toEqual(deal(L, 43).map((c) => c.pic));
  });

  it('never puts two lookalikes (one family) in one game', () => {
    const familyOf = (L) => {
      const list = L.mode === 'buddies' ? BUDDY_PAIRS.map((p) => ({ id: p.a, family: p.family })) : L.mode === 'colour' ? TINTABLE : LIBRARY;
      return new Map(list.map((p) => [p.id, p.family]));
    };
    for (const L of LEVELS) {
      const fam = familyOf(L);
      for (let seed = 1; seed <= 40; seed++) {
        const cards = deal(L, seed);
        // one picture (or buddy pair) per family at most
        const seen = new Map();
        for (const c of cards) {
          const f = fam.get(c.pic);
          if (!f) continue;
          if (seen.has(f)) expect(seen.get(f)).toBe(c.pic);
          else seen.set(f, c.pic);
        }
      }
    }
  });
});

describe('turning cards', () => {
  it('a matching pair stays up and counts', () => {
    const s = ready(pairs());
    const [a, b] = slotsOf(s, 0);
    expect(tapCard(s, a)).toBe('flip');
    expect(tapCard(s, b)).toBe('match');
    expect(s.cards[a].matched && s.cards[b].matched).toBe(true);
    expect(s.found).toBe(1);
    expect(s.turns).toBe(1);
    expect(s.flips).toBe(2);
    run(s, 2);
    expect(s.cards[a].flip).toBe(1);
    expect(tapCard(s, a)).toBe('ignored'); // a found card does nothing
  });

  it('a mismatch stays up about a second, then turns back', () => {
    const s = ready(pairs());
    const a = slotsOf(s, 0)[0];
    const b = slotsOf(s, otherGroup(s, 0))[0];
    tapCard(s, a);
    expect(tapCard(s, b)).toBe('miss');
    run(s, LOOK_TIME * 0.9);
    expect(s.cards[a].up && s.cards[b].up).toBe(true);
    expect(s.cards[a].flip).toBe(1);
    run(s, LOOK_TIME * 0.2);
    expect(s.cards[a].up || s.cards[b].up).toBe(false);
    run(s, FLIP_TIME + 0.05);
    expect(s.cards[a].flip).toBe(0);
    expect(s.turns).toBe(1);
    expect(s.found).toBe(0);
    expect(LOOK_TIME).toBeGreaterThanOrEqual(0.8);
  });

  it('tapping a third card early turns the two back at once and turns the new one', () => {
    const s = ready(pairs());
    const g2 = otherGroup(s, 0);
    const a = slotsOf(s, 0)[0];
    const b = slotsOf(s, g2)[0];
    const c = slotsOf(s, 0)[1];
    tapCard(s, a);
    tapCard(s, b);
    run(s, 0.2);
    expect(tapCard(s, c)).toBe('flip');
    expect(s.cards[a].up || s.cards[b].up).toBe(false);
    expect(s.cards[c].up).toBe(true);
    expect(s.open).toEqual([c]);
    expect(s.lookT).toBe(0);
    // and it goes on as a fresh turn: its partner now matches
    expect(tapCard(s, a)).toBe('match');
  });

  it('tapping one of the showing pair just turns them back early', () => {
    const s = ready(pairs());
    const a = slotsOf(s, 0)[0];
    const b = slotsOf(s, otherGroup(s, 0))[0];
    tapCard(s, a);
    tapCard(s, b);
    expect(tapCard(s, a)).toBe('hide');
    expect(s.cards[a].up || s.cards[b].up).toBe(false);
    expect(s.flips).toBe(2);
  });

  it('ignores the same card twice, taps before the deal lands and taps during the preview', () => {
    const s = ready(pairs());
    tapCard(s, 0);
    expect(tapCard(s, 0)).toBe('ignored');
    expect(s.flips).toBe(1);
    const p = createGame({ ...pairs(), preview: 3 }, 1);
    expect(tapCard(p, 0)).toBe('ignored');
    expect(p.status).toBe('preview');
    run(p, 1);
    expect(p.cards.every((c) => c.flip === 1)).toBe(true);
    expect(tapCard(p, 0)).toBe('ignored');
    run(p, DEAL_TIME + 2.5);
    expect(p.status).toBe('play');
    run(p, FLIP_TIME + 0.05);
    expect(p.cards.every((c) => c.flip === 0)).toBe(true);
    const q = createGame(pairs(), 1);
    expect(tapCard(q, 0)).toBe('ignored'); // cards still flying in
  });

  it('finishing every group wins', () => {
    const s = ready(pairs(2, 2));
    for (let g = 0; g < s.groups; g++) for (const i of slotsOf(s, g)) tapCard(s, i);
    expect(s.status).toBe('won');
    expect(s.events.some((e) => e.type === 'won')).toBe(true);
  });
});

describe('modes', () => {
  it('buddies: two different pictures of one pair match', () => {
    const s = ready({ cols: 2, rows: 4, mode: 'buddies' });
    const [a, b] = slotsOf(s, 0);
    expect(s.cards[a].pic).not.toBe(s.cards[b].pic);
    const pair = BUDDY_PAIRS.find((p) => [p.a, p.b].includes(s.cards[a].pic));
    expect([pair.a, pair.b]).toContain(s.cards[b].pic);
    tapCard(s, a);
    expect(tapCard(s, b)).toBe('match');
    const c = slotsOf(s, 1)[0];
    const d = slotsOf(s, 2)[0];
    tapCard(s, c);
    expect(tapCard(s, d)).toBe('miss');
  });

  it('colour twins: the same picture in another colour is no match', () => {
    const s = ready({ cols: 3, rows: 4, mode: 'colour', colours: 3 });
    const a = slotsOf(s, 0)[0];
    const twin = slotsOf(s, 0)[1];
    const cousin = s.cards.findIndex((c) => c.pic === s.cards[a].pic && c.colour !== s.cards[a].colour);
    expect(cousin).toBeGreaterThanOrEqual(0);
    tapCard(s, a);
    expect(tapCard(s, cousin)).toBe('miss');
    run(s, LOOK_TIME + 0.1);
    tapCard(s, a);
    expect(tapCard(s, twin)).toBe('match');
    expect(sameGroup([s.cards[a], s.cards[twin]])).toBe(true);
  });

  it('triples: three of a kind; a wrong second card misses at once', () => {
    const s = ready({ cols: 3, rows: 4, mode: 'triples' });
    expect(s.size).toBe(3);
    const [a, b, c] = slotsOf(s, 0);
    expect(tapCard(s, a)).toBe('flip');
    expect(tapCard(s, b)).toBe('flip');
    expect(tapCard(s, c)).toBe('match');
    expect(s.found).toBe(1);
    const [d] = slotsOf(s, 1);
    const [e] = slotsOf(s, 2);
    tapCard(s, d);
    expect(tapCard(s, e)).toBe('miss');
    expect(s.open).toHaveLength(2);
    // a miss on the third card of a triple
    run(s, LOOK_TIME + 0.1);
    const [f, g] = slotsOf(s, 1);
    tapCard(s, f);
    tapCard(s, g);
    expect(tapCard(s, e)).toBe('miss');
  });
});

describe('the seagull and the wave', () => {
  it('the gull swaps two face-down cards of different groups once, and the deal stays whole', () => {
    const level = { cols: 4, rows: 4, mode: 'pairs', preview: 0, gull: { after: 2 } };
    for (let seed = 1; seed <= 20; seed++) {
      const s = ready(level, seed);
      const before = s.cards.map((c) => c.id);
      // two misses, then let the cards settle
      for (let t = 0; t < 2; t++) {
        const a = s.cards.findIndex((c) => !c.matched && !c.up);
        const b = s.cards.findIndex((c, i) => i !== a && !c.matched && c.group !== s.cards[a].group);
        tapCard(s, a);
        tapCard(s, b);
        run(s, LOOK_TIME + FLIP_TIME + 0.1);
      }
      run(s, 0.1);
      expect(s.anim?.kind).toBe('gull');
      const { a, b } = s.anim;
      expect(s.cards[a].group).not.toBe(s.cards[b].group);
      expect(s.cards[a].id).toBe(before[b]);
      expect(s.cards[b].id).toBe(before[a]);
      expect(s.cards.map((c) => c.id).sort((x, y) => x - y)).toEqual([...before].sort((x, y) => x - y));
      for (const n of count(s.cards.map((c) => c.group)).values()) expect(n).toBe(2);
      expect(tapCard(s, 0)).toBe('ignored'); // hands off while the gull is busy
      run(s, GULL_TIME + 0.1);
      expect(s.anim).toBe(null);
      run(s, 5);
      expect(s.gulls).toBe(1); // only once
    }
  });

  it('the gull prefers cards that have been seen', () => {
    const s = ready({ cols: 4, rows: 4, mode: 'pairs' }, 5);
    s.cards.forEach((c, i) => (c.seen = i < 4));
    const seenGroups = new Set(s.cards.slice(0, 4).map((c) => c.group));
    if (seenGroups.size > 1) {
      startGull(s);
      expect(s.anim.a).toBeLessThan(4);
      expect(s.anim.b).toBeLessThan(4);
    }
  });

  it('the wave shows the fullest row for a moment, then turns it back', () => {
    const s = ready({ cols: 4, rows: 4, mode: 'pairs' }, 3);
    // finish a pair in row 0 so another row is fuller
    const g = s.cards[0].group;
    for (const i of slotsOf(s, g)) tapCard(s, i);
    run(s, 1);
    expect(startWave(s)).toBe(true);
    const row = s.anim.row;
    expect(s.anim.slots.length).toBe(4);
    expect(row).not.toBe(Math.floor(slotsOf(s, g)[0] / 4));
    run(s, WAVE_SHOW + 0.05);
    for (const i of s.anim.slots) expect(s.cards[i].peek).toBe(true);
    run(s, 0.4);
    for (const i of s.anim.slots) expect(s.cards[i].flip).toBe(1);
    run(s, WAVE_HIDE - WAVE_SHOW);
    expect(s.cards.some((c) => c.peek)).toBe(false);
    run(s, WAVE_TIME);
    expect(s.anim).toBe(null);
    expect(s.found).toBe(1); // a bonus look, never a free match
  });

  it('wave levels send it after the right number of turns, up to its times', () => {
    const level = { cols: 4, rows: 4, mode: 'pairs', preview: 0, wave: { after: 1, times: 2 } };
    const s = ready(level, 8);
    let waves = 0;
    for (let t = 0; t < 6 && s.status === 'play'; t++) {
      const a = s.cards.findIndex((c) => !c.matched && !c.up);
      const b = s.cards.findIndex((c, i) => i !== a && !c.matched && c.group !== s.cards[a].group);
      tapCard(s, a);
      tapCard(s, b);
      for (let k = 0; k < 400; k++) {
        tick(s, 1 / 60);
        if (s.events.some((e) => e.type === 'wave')) {
          waves++;
          s.events.length = 0;
        }
      }
    }
    expect(waves).toBe(2);
  });
});

describe('stars', () => {
  it('3 stars for few misses, at least 1 for finishing', () => {
    const L = LEVELS[7];
    const lim = starLimits(L);
    const s = { level: L, turns: groupCount(L) + lim.three, found: groupCount(L) };
    expect(starsFor(s)).toBe(3);
    s.turns++;
    expect(starsFor(s)).toBe(2);
    s.turns = groupCount(L) + lim.two + 1;
    expect(starsFor(s)).toBe(1);
    s.turns = 9999;
    expect(starsFor(s)).toBe(1);
    expect(lim.three).toBeGreaterThanOrEqual(1);
  });

  it('is generous: triples and the trickier modes allow more misses', () => {
    expect(starLimits({ cols: 4, rows: 6, mode: 'triples' }).three).toBeGreaterThan(starLimits({ cols: 4, rows: 4, mode: 'pairs' }).three);
    expect(starLimits({ cols: 4, rows: 4, mode: 'colour' }).three).toBeGreaterThan(starLimits({ cols: 4, rows: 4, mode: 'pairs' }).three);
  });
});

describe('bots', () => {
  it('a bot with perfect memory finishes every level with 3 stars', () => {
    for (const [i, L] of LEVELS.entries()) {
      for (let seed = 1; seed <= 8; seed++) {
        const s = playGame(createGame(L, seed * 13 + i), { memory: true, seed });
        expect(s.status).toBe('won');
        expect(starsFor(s)).toBe(3);
        if (L.gull) expect(s.gulls).toBe(1);
      }
    }
  });

  it('a bot with no memory at all still finishes every level (with at least a star)', () => {
    for (const [i, L] of LEVELS.entries()) {
      const s = playGame(createGame(L, 500 + i), { memory: false, seed: i + 1 }, 30000);
      expect(s.status).toBe('won');
      expect(starsFor(s)).toBeGreaterThanOrEqual(1);
    }
  });

  it('a bot that taps the next card early (never waiting out a miss) finishes too', () => {
    for (const L of [LEVELS[3], LEVELS[11], LEVELS[17]]) {
      const s = playGame(createGame(L, 77), { memory: true, early: true });
      expect(s.status).toBe('won');
    }
  });

  it('a bot that only holds 8 cards in mind (a careful child) usually earns 3 stars', () => {
    for (const [i, L] of LEVELS.entries()) {
      let three = 0;
      for (let seed = 1; seed <= 10; seed++) {
        const s = playGame(createGame(L, seed * 7 + i), { memory: true, span: 8, seed });
        if (starsFor(s) === 3) three++;
      }
      expect(three).toBeGreaterThanOrEqual(7);
    }
  });
});

describe('two players', () => {
  it('a match gives another go and scores; a miss passes the turn when the cards turn back', () => {
    const s = ready(twoPlayerLevel('small'), 4, { players: 2 });
    expect(s.players).toBe(2);
    expect(s.current).toBe(0);
    const [a, b] = slotsOf(s, 0);
    tapCard(s, a);
    tapCard(s, b);
    expect(s.scores).toEqual([1, 0]);
    expect(s.current).toBe(0);
    expect(s.cards[a].owner).toBe(0);
    const c = slotsOf(s, 1)[0];
    const d = slotsOf(s, 2)[0];
    tapCard(s, c);
    tapCard(s, d);
    expect(s.current).toBe(0); // still looking
    run(s, LOOK_TIME + 0.05);
    expect(s.current).toBe(1);
    const [e, f] = slotsOf(s, 3);
    tapCard(s, e);
    tapCard(s, f);
    expect(s.scores).toEqual([1, 1]);
    expect(s.cards[e].owner).toBe(1);
  });

  it('an early tap after a miss passes the turn first; the new card is the next player\'s', () => {
    const s = ready(twoPlayerLevel('small'), 4, { players: 2 });
    const [a, a2] = slotsOf(s, 0);
    const b = slotsOf(s, 1)[0];
    tapCard(s, a);
    tapCard(s, b);
    tapCard(s, a2);
    expect(s.current).toBe(1);
    tapCard(s, a);
    expect(s.scores).toEqual([0, 1]);
  });

  it('plays to the end with no preview, and the winner is the bigger pile', () => {
    for (const t of TWO_SIZES) {
      const s = createGame(twoPlayerLevel(t.id), 9, { players: 2 });
      expect(s.status).toBe('play');
      playGame(s, { memory: true, seed: 3 });
      expect(s.status).toBe('won');
      expect(s.scores[0] + s.scores[1]).toBe(s.groups);
      const w = winnerOf(s);
      if (s.scores[0] === s.scores[1]) expect(w).toBe(-1);
      else expect(s.scores[w]).toBeGreaterThan(s.scores[1 - w]);
    }
    expect(winnerOf({ scores: [3, 3] })).toBe(-1);
    expect(winnerOf({ scores: [2, 5] })).toBe(1);
  });
});

describe('album and saved progress', () => {
  const fakeStore = () => {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
  };

  it('adds each picture once, marks it new until the album is looked at', () => {
    const p = emptyProgress();
    expect(addToAlbum(p, ['crab', 'pail'])).toEqual(['crab', 'pail']);
    expect(addToAlbum(p, ['crab', 'nonsense'])).toEqual([]);
    expect(p.album).toEqual(['crab', 'pail']);
    expect(p.fresh).toEqual(['crab', 'pail']);
    seenAlbum(p);
    expect(p.fresh).toEqual([]);
    expect(ALBUM.length).toBeGreaterThanOrEqual(LIBRARY.length);
    expect(new Set(ALBUM).size).toBe(ALBUM.length);
  });

  it('a buddy match adds both pictures', () => {
    const s = ready({ cols: 2, rows: 2, mode: 'buddies' });
    const [a, b] = slotsOf(s, 0);
    tapCard(s, a);
    tapCard(s, b);
    const m = s.events.find((e) => e.type === 'match');
    expect(m.pics).toHaveLength(2);
  });

  it('saves and loads stars and stickers, and survives bad data', () => {
    const store = fakeStore();
    const p = emptyProgress();
    recordStars(p, 0, 2);
    recordStars(p, 0, 1); // best is kept
    recordStars(p, 3, 3);
    addToAlbum(p, ['gator']);
    saveProgress(store, p);
    expect(store.m.has(SAVE_KEY)).toBe(true);
    expect(SAVE_KEY).toBe('memory-beach-progress');
    const q = loadProgress(store);
    expect(q.stars[0]).toBe(2);
    expect(q.stars[3]).toBe(3);
    expect(q.album).toEqual(['gator']);
    expect(q.fresh).toEqual(['gator']);
    store.setItem(SAVE_KEY, '{not json');
    expect(loadProgress(store)).toEqual(emptyProgress());
    store.setItem(SAVE_KEY, JSON.stringify({ stars: [7, -1, 'x', 2.5, 3], album: ['crab', 42, 'zzz'], fresh: ['zzz'] }));
    const r = loadProgress(store);
    expect(r.stars.slice(0, 5)).toEqual([0, 0, 0, 0, 3]);
    expect(r.stars).toHaveLength(LEVELS.length);
    expect(r.album).toEqual(['crab']);
    expect(r.fresh).toEqual([]);
    const broken = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); } };
    expect(loadProgress(broken)).toEqual(emptyProgress());
    expect(() => saveProgress(broken, p)).not.toThrow();
  });

  it('a level opens once the one before is finished', () => {
    const p = emptyProgress();
    expect(unlocked(p, 0)).toBe(true);
    expect(unlocked(p, 1)).toBe(false);
    p.stars[0] = 1;
    expect(unlocked(p, 1)).toBe(true);
    expect(unlocked(p, 2)).toBe(false);
  });
});

describe('levels and layout', () => {
  const screens = [[820, 1180], [390, 844]];

  it('has about 18 levels, every grid splitting into whole groups', () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(16);
    expect(LEVELS.length).toBeLessThanOrEqual(20);
    for (const L of LEVELS) {
      expect(Number.isInteger(groupCount(L))).toBe(true);
      expect(L.cols).toBeLessThanOrEqual(MAX_COLS);
      if (L.mode === 'colour') expect(Number.isInteger(groupCount(L) / L.colours)).toBe(true);
    }
  });

  it('fits every grid on the iPad and the phone with cards at least the minimum size', () => {
    const all = [...LEVELS.map((L) => [L, 1]), ...TWO_SIZES.map((t) => [twoPlayerLevel(t.id), 2])];
    for (const [w, h] of screens) {
      for (const [L, players] of all) {
        const g = gridLayout(playArea(w, h, players), L.cols, L.rows);
        expect(g.cw).toBeGreaterThanOrEqual(MIN_CARD);
        expect(g.x0).toBeGreaterThanOrEqual(0);
        expect(g.y0).toBeGreaterThanOrEqual(0);
        expect(g.x0 + g.gw).toBeLessThanOrEqual(w);
        expect(g.y0 + g.gh).toBeLessThanOrEqual(h);
      }
    }
  });

  it('ramps up: previews shrink then stop, boards grow, every idea taught where it first appears', () => {
    for (let i = 1; i < LEVELS.length; i++) expect(LEVELS[i].preview).toBeLessThanOrEqual(LEVELS[i - 1].preview);
    expect(LEVELS[0].preview).toBeGreaterThanOrEqual(3);
    expect(LEVELS.at(-1).preview).toBe(0);
    const cards = LEVELS.map((L) => L.cols * L.rows);
    const third = Math.floor(LEVELS.length / 3);
    const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    expect(avg(cards.slice(third, third * 2))).toBeGreaterThan(avg(cards.slice(0, third)));
    expect(avg(cards.slice(third * 2))).toBeGreaterThan(avg(cards.slice(third, third * 2)));
    expect(cards[0]).toBe(4);
    expect(Math.max(...cards)).toBe(30);
    const ideas = ['pairs', 'buddies', 'colour', 'triples', 'gull', 'wave'];
    for (const idea of ideas) {
      const first = LEVELS.findIndex((L) => L.mode === idea || L[idea]);
      expect(first).toBeGreaterThanOrEqual(0);
      expect(LEVELS[first].teach).toBe(idea);
      expect(LEVELS.filter((L) => L.teach === idea)).toHaveLength(1);
    }
    expect(LEVELS.filter((L) => L.mode === 'triples').length).toBeGreaterThanOrEqual(2);
  });

  it('finds the card under a finger, counting half the gap round each card', () => {
    const g = gridLayout(playArea(390, 844, 1), 5, 6);
    for (let i = 0; i < 30; i++) {
      const r = cardRect(g, i);
      expect(slotAt(g, r.x + r.w / 2, r.y + r.h / 2)).toBe(i);
      expect(slotAt(g, r.x - g.gap * 0.4, r.y + 2)).toBe(i);
    }
    expect(slotAt(g, g.x0 - g.gap * 2, g.y0 + 10)).toBe(-1);
    expect(slotAt(g, 10, 5)).toBe(-1);
  });
});
