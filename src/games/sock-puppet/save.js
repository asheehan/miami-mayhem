// Saved progress: the puppet shelf, the bookshelf and each puppet's last stage show. Pure:
// storage is passed in.
//
// localStorage 'sock-puppet-progress':
//   { v: 1, shelf: [puppet | 0, ...SHELF_SLOTS], books: [book, ...], shows: { [uid]: show } }
// Puppets are puppet.js's compact form (about 30 characters a part), books are story.js's
// (picks and a seed, about 130 characters), shows are show.js's (up to SHOW_BUDGET each).
// Everything is checked on the way in: junk is dropped, unknown part ids are kept untouched.
// If storage is full the shows are left out first, then the oldest books; play carries on.
import { encodePuppet, decodePuppet } from './puppet.js';
import { decodeBook, BOOKS_MAX } from './story.js';
import { decodeShow, showSize, SHOW_BUDGET } from './show.js';

export const SAVE_KEY = 'sock-puppet-progress';
export const SHELF_SLOTS = 9;
export const SHOWS_MAX = 6;

export function createProgress() {
  return { shelf: Array(SHELF_SLOTS).fill(null), books: [], shows: {} };
}

export const shelfPuppets = (progress) => progress.shelf.filter(Boolean);
export const firstEmptySlot = (progress) => progress.shelf.findIndex((p) => !p);
export const findPuppet = (progress, uid) => progress.shelf.find((p) => p && p.uid === uid) || null;
export const slotOf = (progress, uid) => progress.shelf.findIndex((p) => p && p.uid === uid);

// Puts a puppet in a slot (replacing whatever was there). Returns false for a bad slot.
export function putOnShelf(progress, slot, puppet) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= SHELF_SLOTS) return false;
  progress.shelf[slot] = puppet;
  return true;
}

// Takes a puppet off the shelf, with its books and its show.
export function removeFromShelf(progress, slot) {
  const p = progress.shelf[slot];
  if (!p) return false;
  progress.shelf[slot] = null;
  progress.books = progress.books.filter((b) => b.u !== p.uid);
  delete progress.shows[p.uid];
  return true;
}

export const booksFor = (progress, uid) => progress.books.filter((b) => b.u === uid).sort((a, b) => b.t - a.t);

// Keeps a show for a puppet if it fits the budget (returns false if it is only kept in memory
// by the caller). Only the newest SHOWS_MAX puppets' shows are kept.
export function keepShow(progress, uid, show) {
  if (!show || showSize(show) > SHOW_BUDGET) return false;
  progress.shows[uid] = { ...show, t: Date.now ? Date.now() : 0 };
  const uids = Object.keys(progress.shows).sort((a, b) => (progress.shows[b].t || 0) - (progress.shows[a].t || 0));
  for (const u of uids.slice(SHOWS_MAX)) delete progress.shows[u];
  return true;
}

export function serializeProgress(progress, { shows = true, books = BOOKS_MAX } = {}) {
  const out = {
    v: 1,
    shelf: progress.shelf.map((p) => (p ? encodePuppet(p) : 0)),
    books: [...progress.books].sort((a, b) => a.t - b.t).slice(-books),
  };
  if (shows) {
    out.shows = {};
    for (const [u, s] of Object.entries(progress.shows)) if (progress.shelf.some((p) => p && p.uid === u)) out.shows[u] = s;
  }
  return JSON.stringify(out);
}

export function parseProgress(text) {
  const progress = createProgress();
  let raw = null;
  try {
    raw = JSON.parse(text || 'null');
  } catch {
    raw = null;
  }
  if (!raw || typeof raw !== 'object') return progress;
  const seen = new Set();
  if (Array.isArray(raw.shelf)) {
    for (let i = 0; i < SHELF_SLOTS; i++) {
      const p = decodePuppet(raw.shelf[i]);
      if (p && !seen.has(p.uid)) {
        seen.add(p.uid);
        progress.shelf[i] = p;
      }
    }
  }
  if (Array.isArray(raw.books)) {
    const ids = new Set();
    for (const r of raw.books.slice(-BOOKS_MAX * 2)) {
      const b = decodeBook(r);
      if (b && seen.has(b.u) && !ids.has(b.id)) {
        ids.add(b.id);
        progress.books.push(b);
      }
    }
    progress.books = progress.books.sort((a, b) => a.t - b.t).slice(-BOOKS_MAX);
  }
  if (raw.shows && typeof raw.shows === 'object') {
    for (const [u, r] of Object.entries(raw.shows)) {
      if (!seen.has(u)) continue;
      const s = decodeShow(r);
      if (s) progress.shows[u] = { ...s, t: Number.isFinite(r.t) ? r.t : 0 };
    }
  }
  return progress;
}

export function loadProgress(storage) {
  try {
    return parseProgress(storage.getItem(SAVE_KEY));
  } catch {
    return createProgress();
  }
}

// Saves, leaving out shows and then older books if storage says it's full. Returns the number
// of characters written, or 0 if nothing could be saved.
export function saveProgress(storage, progress) {
  const tries = [{ shows: true }, { shows: false }, { shows: false, books: 8 }, { shows: false, books: 0 }];
  for (const opts of tries) {
    const text = serializeProgress(progress, opts);
    try {
      storage.setItem(SAVE_KEY, text);
      return text.length;
    } catch {
      // full or unavailable: try smaller
    }
  }
  return 0;
}
