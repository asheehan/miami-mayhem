// Saved progress: best stars per level, the coin jar, which buggies are in the garage and which
// one is being driven. Pure apart from the storage object handed in (localStorage in the game).
import { LEVELS } from './tracks.js';
import { BUGGIES } from './buggies.js';

export const SAVE_KEY = 'swamp-buggy-progress';

const isCount = (n) => Number.isInteger(n) && n >= 0;

// Cleans up whatever was stored: anything odd falls back to a fresh start for that part.
export function sanitize(v) {
  const o = v && typeof v === 'object' ? v : {};
  const src = Array.isArray(o.stars) ? o.stars : [];
  const stars = LEVELS.map((_, i) => {
    const n = Number(src[i]);
    return Number.isInteger(n) && n >= 0 && n <= 3 ? n : 0;
  });
  const coins = isCount(Number(o.coins)) ? Math.min(Number(o.coins), 999999) : 0;
  const ids = new Set(BUGGIES.map((b) => b.id));
  const owned = [BUGGIES[0].id, ...(Array.isArray(o.owned) ? o.owned : [])]
    .filter((id, i, all) => ids.has(id) && all.indexOf(id) === i);
  const buggy = owned.includes(o.buggy) ? o.buggy : BUGGIES[0].id;
  return { stars, coins, owned, buggy };
}

export function loadProgress(storage) {
  try {
    return sanitize(JSON.parse(storage.getItem(SAVE_KEY) || '{}'));
  } catch {
    return sanitize(null);
  }
}

export function saveProgress(storage, progress) {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(sanitize(progress)));
  } catch {
    // not kept if storage is unavailable
  }
}

export const totalStars = (p) => p.stars.reduce((a, b) => a + b, 0);

// Keeps the best stars for a level and puts the run's coins (pick-ups and trick bonuses) in the jar.
export function recordRun(progress, index, stars, earned) {
  const next = sanitize(progress);
  next.stars[index] = Math.max(next.stars[index], Math.max(0, Math.min(3, stars | 0)));
  next.coins += Math.max(0, earned | 0);
  return sanitize(next);
}

// A level is open once the one before it (or the level itself) has been finished.
export const unlocked = (progress, i) => i === 0 || progress.stars[i - 1] > 0 || progress.stars[i] > 0;

export function firstOpen(progress) {
  for (let i = 0; i < LEVELS.length; i++) if (unlocked(progress, i) && progress.stars[i] === 0) return i;
  return 0;
}

// What a buggy in the garage is to this player: 'driving', 'owned', 'buy' (enough coins),
// 'short' (not enough coins yet) or 'stars' (earned with stars, not there yet).
export function garageState(progress, buggy) {
  if (progress.buggy === buggy.id) return 'driving';
  if (progress.owned.includes(buggy.id)) return 'owned';
  if (buggy.stars) return totalStars(progress) >= buggy.stars ? 'owned' : 'stars';
  return progress.coins >= buggy.price ? 'buy' : 'short';
}

// Tapping a buggy: drive it if it's ours (or just earned), buy it if there are enough coins.
// Returns { progress, result } where result is 'select', 'bought' or 'no'.
export function chooseBuggy(progress, id) {
  const buggy = BUGGIES.find((b) => b.id === id);
  if (!buggy) return { progress, result: 'no' };
  const state = garageState(progress, buggy);
  const next = sanitize(progress);
  if (state === 'driving') return { progress: next, result: 'select' };
  if (state === 'owned') {
    if (!next.owned.includes(id)) next.owned.push(id);
    next.buggy = id;
    return { progress: sanitize(next), result: 'select' };
  }
  if (state === 'buy') {
    next.coins -= buggy.price;
    next.owned.push(id);
    next.buggy = id;
    return { progress: sanitize(next), result: 'bought' };
  }
  return { progress: next, result: 'no' };
}
