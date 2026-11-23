// Saved stars per stage. Pure apart from the storage object handed in (localStorage in the game).
import { STAGES } from './tracks.js';

export const SAVE_KEY = 'sunset-drive-progress';

// Cleans up whatever was stored: anything odd becomes 0 stars.
export function sanitize(v) {
  const src = v && typeof v === 'object' && Array.isArray(v.stars) ? v.stars : [];
  return {
    stars: STAGES.map((_, i) => {
      const n = Number(src[i]);
      return Number.isInteger(n) && n >= 0 && n <= 3 ? n : 0;
    }),
  };
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

// Keeps the best result for a stage.
export function recordStars(progress, index, stars) {
  const next = sanitize(progress);
  next.stars[index] = Math.max(next.stars[index], Math.max(0, Math.min(3, stars | 0)));
  return next;
}

// A stage is open once the one before it (or the stage itself) has been finished.
export const unlocked = (progress, i) => i === 0 || progress.stars[i - 1] > 0 || progress.stars[i] > 0;

export function firstOpen(progress) {
  for (let i = 0; i < STAGES.length; i++) if (unlocked(progress, i) && progress.stars[i] === 0) return i;
  return 0;
}
