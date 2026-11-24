// Memory Beach bots. Pure. They play through tapCard and tick exactly as a finger would,
// for the tests, the star tuning and the ?debug autoplay.
//
// memory: true  remembers every card it has seen (preview, flips, the wave) and follows the
//               seagull's swap, so it never misses twice on what it already knows
// memory: false taps a random face-down card every time
// span:   how many cards it can hold in mind at once (oldest forgotten first); Infinity for
//         perfect memory. A careful six-year-old is roughly a span of 6 to 8.
// early:  true  doesn't wait for a miss to turn back: taps the next card straight away
import { tapCard, tick, rng } from './logic.js';

export const BOT_DT = 1 / 30;

// drain: clear the game's event list as it goes (the tests; the game screen clears its own)
export function createBot({ memory = true, span = Infinity, early = false, seed = 7, drain = true } = {}) {
  return { memory, span, early, drain, rand: rng(seed), known: new Map(), done: new WeakSet() };
}

function look(bot, s) {
  for (const e of s.events) {
    if (e.type === 'swap' && !bot.done.has(e)) {
      bot.done.add(e);
      const ka = bot.known.get(e.a);
      const kb = bot.known.get(e.b);
      bot.known.delete(e.a);
      bot.known.delete(e.b);
      if (kb !== undefined) bot.known.set(e.a, kb);
      if (ka !== undefined) bot.known.set(e.b, ka);
    }
  }
  if (bot.drain) s.events.length = 0;
  if (!bot.memory) return;
  s.cards.forEach((c, i) => {
    if (c.flip >= 0.5 || c.up || c.peek) {
      if (c.matched) bot.known.delete(i);
      else if (!bot.known.has(i)) bot.known.set(i, c.group);
    }
  });
  // forget the oldest (a Map keeps insertion order)
  while (bot.known.size > bot.span) bot.known.delete(bot.known.keys().next().value);
}

// Which slot to tap next (or -1 for none).
export function choose(bot, s) {
  const free = [];
  s.cards.forEach((c, i) => {
    if (!c.matched && !s.open.includes(i)) free.push(i);
  });
  if (!free.length) return -1;
  const pickRandom = (list) => list[Math.floor(bot.rand() * list.length)];
  if (!bot.memory) return pickRandom(free);
  const unknown = free.filter((i) => !bot.known.has(i));
  const open = s.lookT > 0 ? [] : s.open;
  if (open.length) {
    const g = s.cards[open[0]].group;
    const partner = free.find((i) => bot.known.get(i) === g);
    if (partner !== undefined) return partner;
    return unknown.length ? pickRandom(unknown) : pickRandom(free);
  }
  // a whole group already known? go for it
  const byGroup = new Map();
  for (const i of free) {
    if (!bot.known.has(i)) continue;
    const g = bot.known.get(i);
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(i);
  }
  for (const list of byGroup.values()) if (list.length >= s.size) return list[0];
  return unknown.length ? pickRandom(unknown) : pickRandom(free);
}

// One bot moment: look, maybe tap, then let time pass.
export function botStep(bot, s, dt = BOT_DT) {
  look(bot, s);
  if (s.status === 'play' && !s.anim && s.time > 0.8) {
    const busy = s.lookT > 0 && !bot.early;
    if (!busy) {
      const slot = choose(bot, s);
      if (slot >= 0) tapCard(s, slot);
      look(bot, s);
    }
  }
  tick(s, dt);
}

export function playGame(s, opts = {}, maxSeconds = 3000) {
  const bot = createBot(opts);
  while (s.status !== 'won' && s.time < maxSeconds) botStep(bot, s);
  return s;
}
