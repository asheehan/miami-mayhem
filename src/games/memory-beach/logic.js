// Memory Beach rules. Pure: no DOM, no drawing, so all of it runs in the tests.
//
// A game is a grid of cards, one per slot (cards[slot]). Every card belongs to a group; a
// group is two cards (three on triples levels) and a turn matches when every card turned
// over belongs to one group. Which pictures make a group depends on the mode: the same
// picture (pairs, triples), the same picture in the same colour (colour twins) or two
// buddies (pail and spade). tick() runs the clock: flip animations, the look time after a
// miss, the preview, and the seagull and wave surprises.
import { LIBRARY, TINTABLE, COLOURS, BUDDY_PAIRS, ALBUM } from './catalog.js';
import { LEVELS } from './levels.js';

export const FLIP_TIME = 0.3; // s for a card to turn over
export const LOOK_TIME = 1.0; // s a mismatched pair stays up before turning back
export const DEAL_TIME = 0.7; // s the cards take to land at the start; taps wait for it
export const GULL_TIME = 3.4; // s the seagull's visit takes
export const WAVE_TIME = 3.6; // s the wave's visit takes
export const WAVE_SHOW = 0.9; // s into the wave when the row turns up
export const WAVE_HIDE = 2.9; // s into the wave when it turns back down
export const MAX_COLS = 5;
export const CARD_ASPECT = 1.22; // card height / width
export const MIN_CARD = 60; // px: the smallest card width allowed on any screen

export const GROUP_SIZE = { pairs: 2, buddies: 2, colour: 2, triples: 3 };

// ---------------------------------------------------------------------------------------------
// Randomness
// ---------------------------------------------------------------------------------------------

export function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// n items from list, at most one per family (lookalikes never meet in one game).
export function pickSpread(list, n, rand) {
  if (n > list.length) throw new Error(`need ${n} pictures, only ${list.length}`);
  const pool = shuffle(list.slice(), rand);
  const out = [];
  const families = new Set();
  for (const p of pool) {
    if (out.length === n) break;
    if (p.family && families.has(p.family)) continue;
    out.push(p);
    if (p.family) families.add(p.family);
  }
  // not enough without doubling a family: fill up anyway (never needed by the level table)
  for (const p of pool) {
    if (out.length === n) break;
    if (!out.includes(p)) out.push(p);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Dealing
// ---------------------------------------------------------------------------------------------

export const groupSize = (level) => GROUP_SIZE[level.mode] || 2;
export const groupCount = (level) => (level.cols * level.rows) / groupSize(level);

// The cards for one play of a level, shuffled by the seed: [{ id, pic, colour, group }].
export function deal(level, seed) {
  const rand = rng(seed);
  const size = groupSize(level);
  const groups = groupCount(level);
  if (!Number.isInteger(groups)) throw new Error('grid does not split into groups');
  const cards = [];
  const add = (pic, colour, group) => cards.push({ pic, colour, group });
  if (level.mode === 'buddies') {
    pickSpread(BUDDY_PAIRS, groups, rand).forEach((p, g) => {
      add(p.a, null, g);
      add(p.b, null, g);
    });
  } else if (level.mode === 'colour') {
    const nCol = level.colours || 2;
    const pics = pickSpread(TINTABLE, groups / nCol, rand);
    const cols = shuffle(COLOURS.slice(), rand).slice(0, nCol);
    let g = 0;
    for (const p of pics) {
      for (const c of cols) {
        add(p.id, c.id, g);
        add(p.id, c.id, g);
        g++;
      }
    }
  } else {
    pickSpread(LIBRARY, groups, rand).forEach((p, g) => {
      for (let k = 0; k < size; k++) add(p.id, null, g);
    });
  }
  shuffle(cards, rand);
  return cards.map((c, i) => ({ id: i, ...c }));
}

// Do these cards make a group? (Every card from one group, and a whole group.)
export const sameGroup = (cards) => cards.length > 0 && cards.every((c) => c.group === cards[0].group);

// ---------------------------------------------------------------------------------------------
// A game
// ---------------------------------------------------------------------------------------------

// level: a row of LEVELS (or a two-player level). opts: { players: 1 | 2 }
export function createGame(level, seed = 1, opts = {}) {
  const cards = deal(level, seed).map((c) => ({
    ...c, up: false, matched: false, peek: false, seen: false, flip: 0, matchT: -1, owner: -1,
  }));
  const preview = opts.players === 2 ? 0 : level.preview || 0;
  return {
    level,
    seed,
    rand: rng((seed ^ 0x9e3779b9) >>> 0),
    cols: level.cols,
    rows: level.rows,
    mode: level.mode,
    size: groupSize(level),
    groups: groupCount(level),
    cards,
    players: opts.players === 2 ? 2 : 1,
    current: 0, // whose turn (two players)
    scores: [0, 0],
    status: preview > 0 ? 'preview' : 'play', // 'preview' | 'play' | 'won'
    preview,
    previewT: preview,
    time: 0,
    open: [], // slots turned up this turn
    lookT: 0, // > 0 while a miss is showing
    turns: 0,
    flips: 0,
    found: 0,
    wonT: 0,
    anim: null, // { kind: 'gull' | 'wave', t, dur, a, b, row }
    gulls: 0,
    waves: 0,
    events: [],
  };
}

const faceDown = (s) => s.cards.filter((c) => !c.matched && !c.up && !c.peek);

// The player taps the card in `slot`. Returns what happened:
// 'flip' (turned over, turn goes on), 'match', 'miss', 'hide' (a showing miss turned back
// early) or 'ignored'. A tap on a new card while a miss is showing turns the miss back at
// once and turns the new card over: the result is that of the new card.
export function tapCard(s, slot) {
  if (s.status !== 'play' || s.anim || s.time < DEAL_TIME) return 'ignored';
  const c = s.cards[slot];
  if (!c || c.matched) return 'ignored';
  if (s.lookT > 0) {
    const showing = s.open.includes(slot);
    hideOpen(s);
    if (showing) return 'hide';
  } else if (c.up) return 'ignored';
  c.up = true;
  c.seen = true;
  s.flips++;
  s.open.push(slot);
  s.events.push({ type: 'flip', slot });
  const open = s.open.map((i) => s.cards[i]);
  if (!sameGroup(open)) {
    // a miss shows as soon as two cards disagree (a triple doesn't need its third card)
    s.turns++;
    s.lookT = LOOK_TIME;
    s.events.push({ type: 'miss', slots: s.open.slice() });
    return 'miss';
  }
  if (open.length < s.size) return 'flip';
  s.turns++;
  s.found++;
  for (const m of open) {
    m.matched = true;
    m.up = false;
    m.matchT = s.time;
    m.owner = s.players === 2 ? s.current : -1;
  }
  if (s.players === 2) s.scores[s.current]++;
  s.events.push({ type: 'match', slots: s.open.slice(), pics: [...new Set(open.map((m) => m.pic))], player: s.current });
  s.open = [];
  if (s.found === s.groups) {
    s.status = 'won';
    s.wonT = 0;
    s.events.push({ type: 'won' });
  }
  return 'match';
}

// Turn a showing miss back down; with two players the turn passes.
function hideOpen(s) {
  for (const i of s.open) s.cards[i].up = false;
  s.open = [];
  s.lookT = 0;
  s.events.push({ type: 'hide' });
  if (s.players === 2) {
    s.current = 1 - s.current;
    s.events.push({ type: 'turn', player: s.current });
  }
}

export function tick(s, dt) {
  s.time += dt;
  const step = dt / FLIP_TIME;
  for (const c of s.cards) {
    const want = c.up || c.matched || c.peek || s.status === 'preview' ? 1 : 0;
    c.flip = want > c.flip ? Math.min(want, c.flip + step) : Math.max(want, c.flip - step);
  }
  if (s.status === 'won') {
    s.wonT += dt;
    return;
  }
  if (s.status === 'preview') {
    if (s.time > DEAL_TIME) s.previewT -= dt;
    if (s.previewT <= 0) {
      s.status = 'play';
      s.previewT = 0;
      for (const c of s.cards) c.seen = true;
      s.events.push({ type: 'previewDone' });
    }
    return;
  }
  if (s.lookT > 0) {
    s.lookT -= dt;
    if (s.lookT <= 0) hideOpen(s);
  }
  if (s.anim) {
    stepAnim(s, dt);
    return;
  }
  maybeSurprise(s);
}

function stepAnim(s, dt) {
  const a = s.anim;
  const before = a.t;
  a.t += dt;
  if (a.kind === 'wave') {
    if (before < WAVE_SHOW && a.t >= WAVE_SHOW) {
      for (const i of a.slots) {
        s.cards[i].peek = true;
        s.cards[i].seen = true;
      }
    }
    if (before < WAVE_HIDE && a.t >= WAVE_HIDE) for (const i of a.slots) s.cards[i].peek = false;
  }
  if (a.t >= a.dur) {
    s.anim = null;
    s.events.push({ type: `${a.kind}Done` });
  }
}

// The seagull and the wave only come between turns (nothing turned up). A card still
// turning back down finishes long before the gull lands or the water arrives.
function maybeSurprise(s) {
  const L = s.level;
  if (s.status !== 'play' || s.open.length || s.lookT > 0) return;
  if (L.gull && s.gulls === 0 && s.turns >= L.gull.after) {
    s.gulls = 1;
    if (startGull(s)) return;
  }
  if (L.wave && s.waves < (L.wave.times || 1) && s.turns >= L.wave.after * (s.waves + 1)) {
    s.waves++;
    startWave(s);
  }
}

// Picks two face-down cards from different groups (ones already seen if it can, so the swap
// matters) and swaps them. The cards really move at once; the drawing flies them over.
export function startGull(s) {
  const down = faceDown(s);
  let best = null;
  let bestScore = -1;
  for (let i = 0; i < down.length; i++) {
    for (let j = i + 1; j < down.length; j++) {
      const a = down[i];
      const b = down[j];
      if (a.group === b.group) continue;
      const score = (a.seen ? 2 : 0) + (b.seen ? 2 : 0) + s.rand();
      if (score > bestScore) {
        bestScore = score;
        best = [s.cards.indexOf(a), s.cards.indexOf(b)];
      }
    }
  }
  if (!best) return false;
  const [a, b] = best;
  [s.cards[a], s.cards[b]] = [s.cards[b], s.cards[a]];
  s.anim = { kind: 'gull', t: 0, dur: GULL_TIME, a, b };
  s.events.push({ type: 'swap', a, b });
  return true;
}

// The wave turns up the row with the most face-down cards for a moment.
export function startWave(s) {
  let bestRow = -1;
  let bestN = 1;
  for (let r = 0; r < s.rows; r++) {
    let n = 0;
    for (let c = 0; c < s.cols; c++) {
      const card = s.cards[r * s.cols + c];
      if (!card.matched && !card.up) n++;
    }
    if (n > bestN || (n === bestN && bestRow >= 0 && s.rand() < 0.5)) {
      bestN = n;
      bestRow = r;
    }
  }
  if (bestRow < 0) return false;
  const slots = [];
  for (let c = 0; c < s.cols; c++) {
    const i = bestRow * s.cols + c;
    if (!s.cards[i].matched && !s.cards[i].up) slots.push(i);
  }
  s.anim = { kind: 'wave', t: 0, dur: WAVE_TIME, row: bestRow, slots };
  s.events.push({ type: 'wave', row: bestRow, slots });
  return true;
}

// ---------------------------------------------------------------------------------------------
// Stars and the two-player result
// ---------------------------------------------------------------------------------------------

// Misses allowed for 3 and 2 stars. Generous: a careful child who remembers what they have
// seen gets 3; finishing always gets at least 1. Triples allow more, since every miss there
// can cost a card that was a lucky guess. Tuned with the bots in bot.js: the perfect-memory
// bot always gets 3, a bot that only holds 8 cards in mind usually does too.
export function starLimits(level) {
  const g = groupCount(level);
  const k = level.mode === 'triples' ? 2.5 : 1;
  const extra = level.mode === 'buddies' || level.mode === 'colour' ? 1 : 0;
  return { three: Math.ceil(g * k) + 1 + extra, two: Math.ceil(g * 2.5 * k) + 3 + extra };
}

export function starsFor(s) {
  const misses = s.turns - s.found;
  const lim = starLimits(s.level);
  return misses <= lim.three ? 3 : misses <= lim.two ? 2 : 1;
}

// 0 or 1 for the winner, -1 for a draw.
export const winnerOf = (s) => (s.scores[0] === s.scores[1] ? -1 : s.scores[0] > s.scores[1] ? 0 : 1);

// ---------------------------------------------------------------------------------------------
// Layout (px)
// ---------------------------------------------------------------------------------------------

export const hudHeight = (w, h) => Math.max(64, Math.min(100, h * 0.08));
export const bandHeight = (w, h) => Math.max(72, Math.min(120, h * 0.092));

// The part of the screen the grid may use.
export function playArea(w, h, players = 1) {
  const side = Math.max(10, Math.min(24, w * 0.025));
  if (players === 2) {
    const band = bandHeight(w, h);
    return { left: side, right: w - side, top: band + 6, bottom: h - band - 6 };
  }
  return { left: side, right: w - side, top: hudHeight(w, h) + 4, bottom: h - Math.max(12, h * 0.02) };
}

export function gridLayout(area, cols, rows) {
  const aw = area.right - area.left;
  const ah = area.bottom - area.top;
  const gap = Math.max(7, Math.min(16, Math.min(aw, ah) * 0.022));
  let cw = Math.min((aw - gap * (cols - 1)) / cols, (ah - gap * (rows - 1)) / rows / CARD_ASPECT);
  cw = Math.min(cw, 210);
  const ch = cw * CARD_ASPECT;
  const gw = cw * cols + gap * (cols - 1);
  const gh = ch * rows + gap * (rows - 1);
  return { cols, rows, cw, ch, gap, x0: area.left + (aw - gw) / 2, y0: area.top + (ah - gh) / 2, gw, gh };
}

export function cardRect(L, slot) {
  const col = slot % L.cols;
  const row = Math.floor(slot / L.cols);
  return { x: L.x0 + col * (L.cw + L.gap), y: L.y0 + row * (L.ch + L.gap), w: L.cw, h: L.ch };
}

// The slot under (x, y), counting half the gap round each card so near misses still land.
export function slotAt(L, x, y) {
  const col = Math.floor((x - L.x0 + L.gap / 2) / (L.cw + L.gap));
  const row = Math.floor((y - L.y0 + L.gap / 2) / (L.ch + L.gap));
  if (col < 0 || row < 0 || col >= L.cols || row >= L.rows) return -1;
  return row * L.cols + col;
}

// ---------------------------------------------------------------------------------------------
// Saved progress: best stars per level and the sticker album
// ---------------------------------------------------------------------------------------------

export const SAVE_KEY = 'memory-beach-progress';

export const emptyProgress = () => ({ stars: LEVELS.map(() => 0), album: [], fresh: [] });

export function loadProgress(store) {
  const p = emptyProgress();
  try {
    const v = JSON.parse(store.getItem(SAVE_KEY) || '{}') || {};
    if (Array.isArray(v.stars)) {
      p.stars = p.stars.map((_, i) => {
        const n = Number(v.stars[i]);
        return Number.isInteger(n) && n >= 0 && n <= 3 ? n : 0;
      });
    }
    if (Array.isArray(v.album)) p.album = ALBUM.filter((id) => v.album.includes(id));
    if (Array.isArray(v.fresh)) p.fresh = p.album.filter((id) => v.fresh.includes(id));
  } catch {
    // bad or missing data: start fresh
  }
  return p;
}

export function saveProgress(store, p) {
  try {
    store.setItem(SAVE_KEY, JSON.stringify(p));
  } catch {
    // not kept if storage is unavailable
  }
}

export function recordStars(p, i, n) {
  p.stars[i] = Math.max(p.stars[i] || 0, n);
}

// Adds pictures to the album; returns the ones that are new.
export function addToAlbum(p, pics) {
  const added = [];
  for (const id of pics) {
    if (!ALBUM.includes(id) || p.album.includes(id)) continue;
    p.album.push(id);
    p.fresh.push(id);
    added.push(id);
  }
  return added;
}

export const seenAlbum = (p) => {
  p.fresh = [];
};

// A level is open once the one before it (or the level itself) has been finished.
export const unlocked = (p, i) => i === 0 || p.stars[i - 1] > 0 || p.stars[i] > 0;
