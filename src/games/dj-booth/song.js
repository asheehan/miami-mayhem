// Songs: recording a performance as events, playing it back from those events, and keeping
// songs in storage. Pure: no DOM, no audio.
//
// An event is an array [t, code, ...args], t in seconds from the start of the recording.
//   [t, 'p', pad, variant]        a pad hit (t is when it sounded)
//   [t, 's', row, step, on, k]    a beat square set on or off
//   [t, 'y', style, k]            a ready-made beat chosen (pattern and tempo)
//   [t, 'c', k]                   the beat cleared
//   [t, 't', tempo, k]            tempo changed (an index into TEMPOS)
//   [t, 'g', 1]                   the beat started (t is its first step)
//   [t, 'g', 0, k]                the beat stopped
//   [t, 'e', on]                  echo held / let go
//   [t, 'f', v]                   the filter (0 muffled .. 1 open)
//   [t, 'h', on]                  a hand put on / taken off the record
//   [t, 'x', v]                   scratch speed (record turns per normal turn, signed)
// Beat changes carry k: the count of beat steps (since the recording began) that had already
// been handed to the audio clock when the change was made. Playback applies the change just
// before step k, so the beat comes out exactly as it was heard.
import {
  PADS, ROWS, STEPS, STYLES, TEMPOS, DEFAULT_TEMPO, createTransport, nextStep, catchUp, stepRows,
  patternFromStrings, patternToStrings, stylePattern, emptyPattern, setStep,
} from './music.js';

export const MAX_SONG = 90; // seconds
export const MAX_EVENTS = 4000;
export const MAX_SONGS = 30;
export const SAVE_KEY = 'dj-booth-songs';
export const SONG_COLOURS = ['#ff3d9a', '#ffb020', '#19c3d6', '#4fe07a', '#a66bff', '#ff6b4a', '#ffe14d', '#3a7bff'];
export const SONG_PICS = ['flamingo', 'gator', 'turtle', 'crab', 'fish', 'palm', 'sun', 'star', 'pelican', 'octopus'];

const GRID = new Set(['s', 'y', 'c', 't', 'g']);
const r3 = (x) => Math.round(x * 1000) / 1000;
const r2 = (x) => Math.round(x * 100) / 100;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// A colour and picture for the n-th song ever made, so neighbours on the shelf differ.
export function songLook(seq) {
  const n = Math.max(0, Math.floor(seq) || 0);
  return { col: (n * 3) % SONG_COLOURS.length, pic: n % SONG_PICS.length };
}

// ---------- recording ----------

// live: { tr, queue (steps handed out, oldest first), pattern, tempo, style, echo, filter }
export function startRecording(now, live) {
  const { tr, queue } = live;
  let anchor = null;
  if (tr.playing) {
    anchor = (queue || []).find((s) => s.time >= now) || { n: tr.n, step: tr.step, time: tr.nextTime };
  }
  return {
    at: now,
    n0: anchor ? anchor.n : tr.n,
    lastX: -1,
    lastV: 0,
    start: {
      tempo: live.tempo,
      style: live.style,
      pattern: patternToStrings(live.pattern),
      playing: !!anchor,
      step: anchor ? anchor.step : 0,
      t0: anchor ? r3(Math.max(0, anchor.time - now)) : 0,
      echo: !!live.echo,
      filter: live.filter ?? 1,
    },
    ev: [],
  };
}

export const recElapsed = (rec, now) => Math.max(0, now - rec.at);
export const recFull = (rec, now) => recElapsed(rec, now) >= MAX_SONG || rec.ev.length >= MAX_EVENTS;

// A free-timed event (pads, echo, filter, the hand on the record).
export function recEvent(rec, time, code, ...args) {
  if (!rec || recFull(rec, time)) return false;
  rec.ev.push([r3(recElapsed(rec, time)), code, ...args]);
  return true;
}

// A beat change, tied to the transport's step count.
export function recGrid(rec, time, tr, code, ...args) {
  if (!rec || recFull(rec, time)) return false;
  const k = Math.max(0, tr.n - rec.n0);
  if (code === 'g' && args[0] === 1) rec.ev.push([r3(recElapsed(rec, time)), 'g', 1]);
  else rec.ev.push([r3(recElapsed(rec, time)), code, ...args, k]);
  return true;
}

// Scratch speed, thinned out: at most ~25 a second unless the speed changes a lot.
export function recScratch(rec, time, v) {
  if (!rec) return false;
  const vv = r2(clamp(v, -8, 8));
  if (time - rec.lastX < 0.04 && Math.abs(vv - rec.lastV) < 0.5) return false;
  if (!recEvent(rec, time, 'x', vv)) return false;
  rec.lastX = time;
  rec.lastV = vv;
  return true;
}

// The finished song, or null when nothing at all happened.
export function finishRecording(rec, now, meta = {}) {
  const len = r3(Math.min(MAX_SONG, recElapsed(rec, now)));
  if (!rec.ev.length && !rec.start.playing) return null;
  if (len < 0.3) return null;
  const look = songLook(meta.seq || 0);
  return {
    v: 1,
    id: String(meta.id ?? Math.floor(rec.at * 1000)),
    made: meta.made ?? 0,
    len,
    col: look.col,
    pic: look.pic,
    start: { ...rec.start, pattern: rec.start.pattern.slice() },
    ev: rec.ev.map((e) => e.slice()),
  };
}

// ---------- playback ----------

export function createPlayer(song, at) {
  const st = song.start;
  const tr = createTransport(TEMPOS[st.tempo] || TEMPOS[DEFAULT_TEMPO]);
  if (st.playing) {
    tr.playing = true;
    tr.step = st.step;
    tr.nextTime = at + st.t0;
  }
  return {
    song,
    at,
    end: at + song.len,
    grid: song.ev.filter((e) => GRID.has(e[1])),
    gi: 0,
    sound: song.ev.filter((e) => !GRID.has(e[1])).sort((a, b) => a[0] - b[0]),
    si: 0,
    tr,
    pattern: patternFromStrings(st.pattern),
    tempo: st.tempo,
    style: st.style,
    done: false,
  };
}

const kOf = (e) => e[e.length - 1];
const keyedByStep = (e) => !(e[1] === 'g' && e[2] === 1);

function applyGrid(pl, e, out) {
  const tr = pl.tr;
  const time = pl.at + e[0];
  switch (e[1]) {
    case 's':
      setStep(pl.pattern, e[2], e[3], e[4]);
      out.push({ type: 'toggle', row: e[2], step: e[3], on: !!e[4], time });
      break;
    case 'y':
      pl.pattern = stylePattern(e[2]);
      pl.style = e[2];
      pl.tempo = STYLES[e[2]].tempo;
      tr.bpm = TEMPOS[pl.tempo];
      out.push({ type: 'style', style: e[2], time });
      break;
    case 'c':
      pl.pattern = emptyPattern();
      pl.style = -1;
      out.push({ type: 'clear', time });
      break;
    case 't':
      pl.tempo = e[2];
      tr.bpm = TEMPOS[e[2]];
      out.push({ type: 'tempo', tempo: e[2], time });
      break;
    case 'g':
      if (e[2] === 1) {
        tr.playing = true;
        tr.step = 0;
        tr.nextTime = time;
        out.push({ type: 'play', time });
      } else {
        tr.playing = false;
        out.push({ type: 'stop', time });
      }
      break;
    default:
  }
}

// Everything due before now + ahead, in a list of actions for the caller to play and show.
export function playerTick(pl, now, ahead = 0.12) {
  const out = [];
  if (pl.done) return out;
  const horizon = now + ahead;
  const tr = pl.tr;
  catchUp(tr, now);
  for (let guard = 0; guard < 20000; guard++) {
    const e = pl.grid[pl.gi];
    if (tr.playing) {
      if (e && keyedByStep(e) && kOf(e) <= tr.n) {
        applyGrid(pl, e, out);
        pl.gi++;
        continue;
      }
      if (e && !keyedByStep(e) && pl.at + e[0] <= Math.min(tr.nextTime, horizon)) {
        applyGrid(pl, e, out);
        pl.gi++;
        continue;
      }
      const s = nextStep(tr, Math.min(horizon, pl.end));
      if (!s) break;
      out.push({ type: 'step', time: s.time, step: s.step, n: s.n, bpm: s.bpm, rows: stepRows(pl.pattern, s.step) });
    } else {
      if (!e || pl.at + e[0] > horizon) break;
      applyGrid(pl, e, out);
      pl.gi++;
    }
  }
  while (pl.si < pl.sound.length && pl.at + pl.sound[pl.si][0] <= horizon) {
    const e = pl.sound[pl.si++];
    const time = pl.at + e[0];
    if (e[1] === 'p') out.push({ type: 'pad', time, pad: e[2], variant: e[3] });
    else if (e[1] === 'e') out.push({ type: 'echo', time, on: !!e[2] });
    else if (e[1] === 'f') out.push({ type: 'filter', time, v: e[2] });
    else if (e[1] === 'h') out.push({ type: 'hold', time, on: !!e[2] });
    else if (e[1] === 'x') out.push({ type: 'scratch', time, v: e[2] });
  }
  if (now >= pl.end) {
    pl.done = true;
    tr.playing = false;
    out.push({ type: 'end', time: pl.end });
  }
  return out;
}

export const playerProgress = (pl, now) => clamp((now - pl.at) / Math.max(0.001, pl.song.len), 0, 1);

// ---------- storage ----------

const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const K_MAX = 1e6;

export function cleanEvent(e) {
  if (!Array.isArray(e) || !isNum(e[0]) || e[0] < 0 || e[0] > MAX_SONG + 1) return null;
  const t = r3(e[0]);
  const [, c, a, b, d, k] = e;
  switch (c) {
    case 'p':
      return isInt(a, 0, PADS.length - 1) && isInt(b, 0, 99) ? [t, c, a, b] : null;
    case 's':
      return isInt(a, 0, ROWS.length - 1) && isInt(b, 0, STEPS - 1) && (d === 0 || d === 1) && isInt(k, 0, K_MAX) ? [t, c, a, b, d, k] : null;
    case 'y':
      return isInt(a, 0, STYLES.length - 1) && isInt(b, 0, K_MAX) ? [t, c, a, b] : null;
    case 'c':
      return isInt(a, 0, K_MAX) ? [t, c, a] : null;
    case 't':
      return isInt(a, 0, TEMPOS.length - 1) && isInt(b, 0, K_MAX) ? [t, c, a, b] : null;
    case 'g':
      if (a === 1) return [t, c, 1];
      return a === 0 && isInt(b, 0, K_MAX) ? [t, c, 0, b] : null;
    case 'e':
    case 'h':
      return a === 0 || a === 1 ? [t, c, a] : null;
    case 'f':
      return isNum(a) ? [t, c, r2(clamp(a, 0, 1))] : null;
    case 'x':
      return isNum(a) ? [t, c, r2(clamp(a, -8, 8))] : null;
    default:
      return null;
  }
}

export function cleanSong(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return null;
  if (!(typeof s.id === 'string' || isNum(s.id))) return null;
  const id = String(s.id).slice(0, 40);
  if (!id) return null;
  if (!isNum(s.len) || s.len <= 0) return null;
  if (!Array.isArray(s.ev)) return null;
  const st = s.start && typeof s.start === 'object' ? s.start : {};
  const ev = [];
  for (const e of s.ev) {
    if (ev.length >= MAX_EVENTS) break;
    const c = cleanEvent(e);
    if (c) ev.push(c);
  }
  const playing = st.playing === true;
  if (!ev.length && !playing) return null;
  return {
    v: 1,
    id,
    made: isNum(s.made) ? s.made : 0,
    len: r3(Math.min(MAX_SONG, s.len)),
    col: isInt(s.col, 0, SONG_COLOURS.length - 1) ? s.col : 0,
    pic: isInt(s.pic, 0, SONG_PICS.length - 1) ? s.pic : 0,
    start: {
      tempo: isInt(st.tempo, 0, TEMPOS.length - 1) ? st.tempo : DEFAULT_TEMPO,
      style: isInt(st.style, -1, STYLES.length - 1) ? st.style : -1,
      pattern: patternToStrings(patternFromStrings(st.pattern)),
      playing,
      step: isInt(st.step, 0, STEPS - 1) ? st.step : 0,
      t0: isNum(st.t0) ? r3(clamp(st.t0, 0, 1)) : 0,
      echo: st.echo === true,
      filter: isNum(st.filter) ? clamp(st.filter, 0, 1) : 1,
    },
    ev,
  };
}

export const emptyLibrary = () => ({ seq: 0, songs: [] });

// Never throws: anything unreadable becomes an empty shelf, bad songs are dropped.
export function parseSongs(text) {
  let data;
  try {
    data = typeof text === 'string' ? JSON.parse(text) : text;
  } catch {
    return emptyLibrary();
  }
  if (!data || typeof data !== 'object') return emptyLibrary();
  const list = Array.isArray(data) ? data : Array.isArray(data.songs) ? data.songs : [];
  const songs = [];
  const seen = new Set();
  for (const raw of list) {
    if (songs.length >= MAX_SONGS) break;
    let s = null;
    try {
      s = cleanSong(raw);
    } catch {
      s = null;
    }
    if (!s || seen.has(s.id)) continue;
    seen.add(s.id);
    songs.push(s);
  }
  const seq = isInt(data.seq, 0, 1e9) ? data.seq : songs.length;
  return { seq: Math.max(seq, songs.length), songs };
}

export const serializeSongs = (lib) => JSON.stringify({ v: 1, seq: lib.seq, songs: lib.songs });

// Newest first; the oldest falls off the end past MAX_SONGS.
export function addSong(lib, song) {
  return { seq: lib.seq + 1, songs: [song, ...lib.songs.filter((s) => s.id !== song.id)].slice(0, MAX_SONGS) };
}

export const removeSong = (lib, id) => ({ seq: lib.seq, songs: lib.songs.filter((s) => s.id !== id) });

// Write the library; if storage is full, let go of the oldest songs until it fits (the
// newest is always tried last on its own). Returns the library that was actually kept.
export function saveLibrary(lib, write) {
  let songs = lib.songs.slice();
  for (;;) {
    const attempt = { seq: lib.seq, songs };
    try {
      write(serializeSongs(attempt));
      return { ok: true, lib: attempt };
    } catch {
      if (songs.length <= 1) return { ok: false, lib };
      songs = songs.slice(0, -1);
    }
  }
}
