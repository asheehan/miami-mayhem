import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  PADS, ROWS, STEPS, STYLES, TEMPOS, SCALE, inScale, bassNote, padNotes, variantCount, createTransport, startTransport,
  stopTransport, nextStep, catchUp, stepDur, quantiseHit, playheadAt, beatPhase, stylePattern, emptyPattern, setStep,
  stepRows, patternToStrings, patternFromStrings, isEmptyPattern, nearestTempo,
} from '../src/games/dj-booth/music.js';
import {
  MAX_SONG, MAX_SONGS, MAX_EVENTS, SAVE_KEY, startRecording, recEvent, recGrid, recScratch, finishRecording, createPlayer,
  playerTick, playerProgress, parseSongs, serializeSongs, addSong, removeSong, saveLibrary, cleanEvent, cleanSong,
  emptyLibrary, songLook, SONG_COLOURS, SONG_PICS,
} from '../src/games/dj-booth/song.js';
import { createClock, readClock, toAudio } from '../src/games/dj-booth/clock.js';
import { layoutBooth, layoutShelf, layoutConfirm, hit } from '../src/games/dj-booth/layout.js';
import * as sound from '../src/games/dj-booth/sound.js';

// a tiny seeded random, so simulated timer jitter is repeatable
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('music model', () => {
  it('keeps every pitched sound inside the pentatonic scale', () => {
    expect(SCALE).toEqual([0, 2, 4, 7, 9]);
    for (let p = 0; p < PADS.length; p++) {
      for (let v = 0; v < variantCount(p); v++) {
        const notes = padNotes(p, v);
        if (notes) for (const n of notes) expect(inScale(n), `${PADS[p].id} ${n}`).toBe(true);
      }
    }
    for (let s = 0; s < STEPS; s++) expect(inScale(bassNote(s))).toBe(true);
  });

  it('has a full sound board with unique pads and grid rows that are pads', () => {
    expect(PADS.length).toBeGreaterThanOrEqual(12);
    expect(PADS.length).toBeLessThanOrEqual(16);
    expect(new Set(PADS.map((p) => p.id)).size).toBe(PADS.length);
    expect(new Set(PADS.map((p) => p.colour)).size).toBe(PADS.length);
    for (const r of ROWS) expect(PADS.some((p) => p.id === r)).toBe(true);
  });

  it('has well-formed ready-made beats that are not empty', () => {
    expect(STYLES.length).toBeGreaterThanOrEqual(4);
    for (let i = 0; i < STYLES.length; i++) {
      const s = STYLES[i];
      expect(s.rows.length).toBe(ROWS.length);
      for (const r of s.rows) expect(r).toMatch(/^[x.]{16}$/);
      expect(TEMPOS[s.tempo]).toBeDefined();
      const p = stylePattern(i);
      expect(isEmptyPattern(p)).toBe(false);
      expect(patternToStrings(p)).toEqual(s.rows);
    }
  });

  it('round-trips patterns through strings and tolerates junk', () => {
    const p = stylePattern(2);
    expect(patternFromStrings(patternToStrings(p))).toEqual(p);
    expect(isEmptyPattern(patternFromStrings(null))).toBe(true);
    expect(isEmptyPattern(patternFromStrings([5, {}, 'zz']))).toBe(true);
    const q = emptyPattern();
    expect(setStep(q, 1, 3, true)).toBe(true);
    expect(setStep(q, 9, 3, true)).toBe(false);
    expect(setStep(q, 1, 16, true)).toBe(false);
    expect(stepRows(q, 3)).toEqual([1]);
  });

  it('picks the nearest tempo', () => {
    expect(nearestTempo(0)).toBe(0);
    expect(nearestTempo(1000)).toBe(TEMPOS.length - 1);
    expect(nearestTempo(TEMPOS[2] + 1)).toBe(2);
  });
});

describe('transport and look-ahead scheduling', () => {
  it('hands out evenly spaced steps up to the horizon, whatever the tick timing', () => {
    const tr = createTransport(120);
    startTransport(tr, 1);
    const steps = [];
    const r = rng(3);
    for (let t = 1; t < 5; t += 0.01 + r() * 0.06) {
      let s;
      while ((s = nextStep(tr, t + 0.12))) steps.push(s);
    }
    const d = stepDur(120);
    expect(d).toBeCloseTo(0.125, 9);
    steps.forEach((s, i) => {
      expect(s.time).toBeCloseTo(1 + i * d, 9);
      expect(s.step).toBe(i % STEPS);
      expect(s.n).toBe(i);
    });
    expect(steps[steps.length - 1].time).toBeLessThan(5 + 0.12);
  });

  it('applies a tempo change from the next step boundary', () => {
    const tr = createTransport(120);
    startTransport(tr, 0);
    nextStep(tr, 1);
    nextStep(tr, 1);
    tr.bpm = 60;
    const a = nextStep(tr, 10);
    const b = nextStep(tr, 10);
    expect(a.time).toBeCloseTo(0.25, 9);
    expect(b.time - a.time).toBeCloseTo(stepDur(60), 9);
  });

  it('gives nothing while stopped and skips missed steps after a stall', () => {
    const tr = createTransport(120);
    expect(nextStep(tr, 100)).toBeNull();
    startTransport(tr, 0);
    nextStep(tr, 0.1);
    const skipped = catchUp(tr, 5);
    expect(skipped).toBeGreaterThan(30);
    expect(tr.nextTime).toBeGreaterThanOrEqual(5);
    expect(tr.nextTime - 5).toBeLessThan(stepDur(120) + 1e-9);
    expect(catchUp(tr, tr.nextTime)).toBe(0);
    stopTransport(tr);
    expect(nextStep(tr, 100)).toBeNull();
  });

  it('snaps a pad hit forward onto a close sixteenth and plays far ones at once', () => {
    const tr = createTransport(120);
    expect(quantiseHit(3.3, tr)).toBe(3.3); // beat not running
    startTransport(tr, 0);
    while (nextStep(tr, 1)) { /* schedule ahead */ }
    const d = stepDur(120);
    expect(quantiseHit(0.5 - 0.02, tr)).toBeCloseTo(0.5, 9);
    expect(quantiseHit(0.5 + 0.03, tr)).toBeCloseTo(0.53, 9);
    expect(quantiseHit(0.5 + d / 2, tr)).toBeCloseTo(0.5 + d / 2, 9);
    for (let t = 0; t < 2; t += 0.0137) {
      const q = quantiseHit(t, tr);
      expect(q).toBeGreaterThanOrEqual(t);
      expect(q - t).toBeLessThanOrEqual(0.06 + 1e-9);
    }
  });

  it('finds the playhead and the beat phase from the steps handed out', () => {
    const q = [0, 1, 2, 3, 4].map((i) => ({ step: i, time: i * 0.125, bpm: 120 }));
    expect(playheadAt(q, -1)).toBe(-1);
    expect(playheadAt(q, 0.3)).toBe(2);
    expect(playheadAt(q, 10)).toBe(4);
    expect(beatPhase(q, -1)).toBeNull();
    const ph = beatPhase(q, 0.25);
    expect(ph.beat).toBe(0);
    expect(ph.phase).toBeCloseTo(0.5, 6);
  });
});

describe('game clock', () => {
  it('runs on the page clock without sound, then the audio clock, never jumping back', () => {
    const c = createClock();
    let last = readClock(c, null, 100);
    const seen = [last];
    for (let p = 100; p < 101; p += 0.1) seen.push(readClock(c, null, p));
    // sound starts: audio clock at 0.4, far from the page clock
    for (let a = 0.4; a < 2; a += 0.1) seen.push(readClock(c, a, 0));
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1] - 1e-9);
    last = seen[seen.length - 1];
    expect(toAudio(c, last)).toBeCloseTo(1.9, 6);
    // a long sleep on the page clock only nudges it
    const before = readClock(c, null, 0);
    expect(readClock(c, null, 5000) - before).toBeLessThanOrEqual(0.25);
  });
});

// ---------- recording and playback ----------

// Run the booth's live engine the way index.js does: the user acts at given times, a
// jittery timer schedules steps ahead, and everything heard is noted down.
function performLive(script, seed, end) {
  const live = { tr: createTransport(TEMPOS[STYLES[0].tempo]), queue: [], pattern: stylePattern(0), tempo: STYLES[0].tempo, style: 0, echo: false, filter: 1 };
  const heard = [];
  const pads = [];
  let rec = null;
  let song = null;
  const r = rng(seed);
  const ops = script.slice().sort((a, b) => a.at - b.at);
  let oi = 0;
  const variant = PADS.map(() => 0);
  for (let t = 10; t < end; t += 0.008 + r() * 0.04) {
    while (oi < ops.length && ops[oi].at <= t) {
      const o = ops[oi++];
      const tr = live.tr;
      if (o.do === 'rec') rec = startRecording(t, live);
      else if (o.do === 'play') {
        const at = t + 0.05;
        startTransport(tr, at);
        if (rec) recGrid(rec, at, tr, 'g', 1);
      } else if (o.do === 'stop') {
        if (rec) recGrid(rec, t, tr, 'g', 0);
        stopTransport(tr);
      } else if (o.do === 'toggle') {
        const on = !live.pattern[o.row][o.step];
        setStep(live.pattern, o.row, o.step, on);
        if (rec) recGrid(rec, t, tr, 's', o.row, o.step, on ? 1 : 0);
      } else if (o.do === 'style') {
        live.pattern = stylePattern(o.i);
        live.style = o.i;
        live.tempo = STYLES[o.i].tempo;
        tr.bpm = TEMPOS[live.tempo];
        if (rec) recGrid(rec, t, tr, 'y', o.i);
      } else if (o.do === 'tempo') {
        live.tempo = o.i;
        tr.bpm = TEMPOS[o.i];
        if (rec) recGrid(rec, t, tr, 't', o.i);
      } else if (o.do === 'clear') {
        live.pattern = emptyPattern();
        live.style = -1;
        if (rec) recGrid(rec, t, tr, 'c');
      } else if (o.do === 'pad') {
        const q = quantiseHit(t, tr);
        const v = variant[o.pad];
        variant[o.pad] = (v + 1) % variantCount(o.pad);
        pads.push({ time: q, pad: o.pad, variant: v });
        if (rec) recEvent(rec, q, 'p', o.pad, v);
      } else if (o.do === 'end') {
        song = finishRecording(rec, t, { id: 'a', seq: 0 });
        song.recAt = rec.at;
        rec = null;
      }
    }
    let s;
    while ((s = nextStep(live.tr, t + 0.12))) {
      heard.push({ time: s.time, step: s.step, rows: stepRows(live.pattern, s.step) });
      live.queue.push(s);
    }
  }
  return { song, heard, pads };
}

function playBack(song, seed, at = 500) {
  const pl = createPlayer(song, at);
  const steps = [];
  const pads = [];
  const r = rng(seed);
  let ended = false;
  for (let t = at - 0.2; !ended && t < at + song.len + 2; t += 0.005 + r() * 0.05) {
    for (const a of playerTick(pl, t, 0.12)) {
      if (a.type === 'step') steps.push({ time: a.time - at, step: a.step, rows: a.rows });
      if (a.type === 'pad') pads.push({ time: a.time - at, pad: a.pad, variant: a.variant });
      if (a.type === 'end') ended = true;
    }
  }
  return { steps, pads, ended, pl };
}

const SCRIPT = [
  { at: 10.1, do: 'play' },
  { at: 10.9, do: 'rec' }, // recording starts with the beat already going
  { at: 11.3, do: 'pad', pad: 0 },
  { at: 11.41, do: 'pad', pad: 7 },
  { at: 11.52, do: 'pad', pad: 7 },
  { at: 11.77, do: 'toggle', row: 3, step: 2 },
  { at: 11.78, do: 'toggle', row: 3, step: 3 },
  { at: 12.31, do: 'tempo', i: 4 },
  { at: 13.05, do: 'style', i: 3 },
  { at: 13.5, do: 'pad', pad: 10 },
  { at: 14.02, do: 'stop' },
  { at: 14.4, do: 'toggle', row: 0, step: 1 },
  { at: 14.5, do: 'clear' },
  { at: 14.6, do: 'toggle', row: 4, step: 0 },
  { at: 14.7, do: 'pad', pad: 12 },
  { at: 15.0, do: 'play' },
  { at: 15.9, do: 'tempo', i: 0 },
  { at: 16.4, do: 'toggle', row: 2, step: 5 },
  { at: 17.3, do: 'style', i: 1 },
  { at: 18.0, do: 'end' },
];

describe('recording and playing back', () => {
  it('plays back exactly the beat and pads that were heard, under different timer jitter', () => {
    for (const [liveSeed, playSeed] of [[1, 2], [5, 9], [42, 7], [123, 321]]) {
      const { song, heard, pads } = performLive(SCRIPT, liveSeed, 20);
      expect(song).not.toBeNull();
      const t0 = song.recAt;
      const want = heard.filter((s) => s.time >= t0 && s.time < t0 + song.len).map((s) => ({ ...s, time: s.time - t0 }));
      const got = playBack(song, playSeed);
      expect(got.ended).toBe(true);
      expect(got.steps.length).toBe(want.length);
      got.steps.forEach((s, i) => {
        expect(s.step).toBe(want[i].step);
        expect(s.rows).toEqual(want[i].rows);
        expect(Math.abs(s.time - want[i].time)).toBeLessThan(0.002);
      });
      const wantPads = pads.filter((p) => p.time >= t0).map((p) => ({ ...p, time: p.time - t0 }));
      expect(got.pads.length).toBe(wantPads.length);
      got.pads.forEach((p, i) => {
        expect(p.pad).toBe(wantPads[i].pad);
        expect(p.variant).toBe(wantPads[i].variant);
        expect(Math.abs(p.time - wantPads[i].time)).toBeLessThan(0.002);
      });
    }
  });

  it('ends with the same pattern, style and tempo the performance ended with', () => {
    const { song } = performLive(SCRIPT, 3, 20);
    const { pl } = playBack(song, 4);
    expect(pl.style).toBe(1);
    expect(pl.tempo).toBe(STYLES[1].tempo);
    expect(patternToStrings(pl.pattern)).toEqual(STYLES[1].rows);
  });

  it('records a song that starts with the beat stopped', () => {
    const script = [
      { at: 10.2, do: 'rec' },
      { at: 10.5, do: 'pad', pad: 2 },
      { at: 10.9, do: 'toggle', row: 1, step: 4 },
      { at: 11.2, do: 'play' },
      { at: 12.9, do: 'end' },
    ];
    const { song, heard } = performLive(script, 8, 14);
    expect(song.start.playing).toBe(false);
    const want = heard.filter((s) => s.time < song.recAt + song.len);
    const got = playBack(song, 11);
    expect(got.steps.length).toBe(want.length);
    expect(got.steps.map((s) => s.rows)).toEqual(want.map((s) => s.rows));
    expect(Math.abs(got.steps[0].time - (want[0].time - song.recAt))).toBeLessThan(0.001); // times are kept to the millisecond
  });

  it('caps a recording at the maximum length and event count', () => {
    const tr = createTransport();
    const rec = startRecording(0, { tr, queue: [], pattern: emptyPattern(), tempo: 2, style: -1, echo: false, filter: 1 });
    expect(recEvent(rec, 1, 'p', 0, 0)).toBe(true);
    expect(recEvent(rec, MAX_SONG + 1, 'p', 0, 0)).toBe(false);
    for (let i = 0; i < MAX_EVENTS + 50; i++) recEvent(rec, 2 + i * 0.001, 'p', 1, 0);
    expect(rec.ev.length).toBe(MAX_EVENTS);
    const song = finishRecording(rec, MAX_SONG + 20, { id: 'x', seq: 3 });
    expect(song.len).toBe(MAX_SONG);
    expect(song.col).toBe(songLook(3).col);
  });

  it('drops a recording where nothing happened', () => {
    const rec = startRecording(5, { tr: createTransport(), queue: [], pattern: emptyPattern(), tempo: 2, style: -1 });
    expect(finishRecording(rec, 9, { id: 'e' })).toBeNull();
  });

  it('thins out scratch moves', () => {
    const rec = startRecording(0, { tr: createTransport(), queue: [], pattern: emptyPattern(), tempo: 2, style: -1 });
    let kept = 0;
    for (let t = 0; t < 1; t += 0.005) if (recScratch(rec, t, 1 + Math.sin(t * 3) * 0.1)) kept++;
    expect(kept).toBeLessThanOrEqual(26);
    expect(kept).toBeGreaterThan(10);
    expect(recScratch(rec, 1.001, -3)).toBe(true); // a big change gets through
  });

  it('plays back effects and scratches at their times and reports progress', () => {
    const song = cleanSong({
      id: 'fx', len: 2, start: { playing: false }, ev: [[0.5, 'e', 1], [0.6, 'f', 0.3], [0.7, 'h', 1], [0.75, 'x', 2.5], [0.9, 'h', 0], [1.2, 'e', 0]],
    });
    const pl = createPlayer(song, 10);
    const acts = [];
    for (let t = 9.9; t < 12.5; t += 0.03) acts.push(...playerTick(pl, t));
    expect(acts.filter((a) => a.type !== 'end').map((a) => a.type)).toEqual(['echo', 'filter', 'hold', 'scratch', 'hold', 'echo']);
    expect(acts.find((a) => a.type === 'scratch').time).toBeCloseTo(10.75, 9);
    expect(acts[acts.length - 1].type).toBe('end');
    expect(playerProgress(pl, 11)).toBeCloseTo(0.5, 6);
    expect(playerTick(pl, 13)).toEqual([]);
  });
});

describe('saving songs', () => {
  const sample = (id, extra = {}) => ({
    v: 1, id, made: 1, len: 3, col: 1, pic: 2,
    start: { tempo: 2, style: 0, pattern: STYLES[0].rows, playing: true, step: 3, t0: 0.05, echo: false, filter: 1 },
    ev: [[0.1, 'p', 0, 0], [0.2, 's', 1, 2, 1, 3], [0.3, 'g', 0, 5], [0.4, 'g', 1]],
    ...extra,
  });

  it('round-trips a library', () => {
    let lib = emptyLibrary();
    lib = addSong(lib, cleanSong(sample('a')));
    lib = addSong(lib, cleanSong(sample('b')));
    const back = parseSongs(serializeSongs(lib));
    expect(back).toEqual(lib);
    expect(back.songs[0].id).toBe('b');
    expect(back.seq).toBe(2);
    expect(SAVE_KEY.startsWith('dj-booth')).toBe(true);
  });

  it('never breaks on garbage or old data', () => {
    for (const junk of [null, undefined, '', 'nope{', '42', 'null', '[]', '{"songs":5}', '{"songs":[1,"x",null,[]]}', JSON.stringify({ songs: [{ id: 'q' }] })]) {
      const lib = parseSongs(junk);
      expect(Array.isArray(lib.songs)).toBe(true);
      expect(lib.songs.length).toBe(0);
    }
    // an old bare array of songs still loads
    expect(parseSongs(JSON.stringify([sample('old')])).songs.length).toBe(1);
  });

  it('cleans bad fields and events, drops duplicates, and caps the shelf', () => {
    const messy = sample('m', {
      col: 99, pic: -1, len: 1e9,
      start: { tempo: 77, style: 'x', pattern: 'no', playing: 'yes', step: 40, t0: -5, filter: 9 },
      ev: [[0.1, 'p', 0, 0], [0.2, 'p', 99, 0], ['a', 'p', 0, 0], [0.3, 'zz'], [0.4, 's', 1, 2, 1], [-1, 'p', 0, 0], [0.5, 'f', 7], [0.6, 'x', -40], 'bad'],
    });
    const s = cleanSong(messy);
    expect(s.col).toBe(0);
    expect(s.pic).toBe(0);
    expect(s.len).toBe(MAX_SONG);
    expect(s.start.tempo).toBe(2);
    expect(s.start.style).toBe(-1);
    expect(s.start.playing).toBe(false);
    expect(s.start.step).toBe(0);
    expect(s.start.filter).toBe(1);
    expect(s.ev).toEqual([[0.1, 'p', 0, 0], [0.5, 'f', 1], [0.6, 'x', -8]]);
    expect(cleanEvent([0.1, 'g', 1])).toEqual([0.1, 'g', 1]);
    expect(cleanEvent([0.1, 'g', 0])).toBeNull();
    const many = [];
    for (let i = 0; i < 40; i++) many.push(sample(`s${i}`));
    many.push(sample('s3'));
    const lib = parseSongs(JSON.stringify({ seq: 50, songs: many }));
    expect(lib.songs.length).toBe(MAX_SONGS);
    expect(new Set(lib.songs.map((x) => x.id)).size).toBe(MAX_SONGS);
    let full = lib;
    full = addSong(full, cleanSong(sample('new')));
    expect(full.songs.length).toBe(MAX_SONGS);
    expect(full.songs[0].id).toBe('new');
    expect(removeSong(full, 'new').songs.length).toBe(MAX_SONGS - 1);
  });

  it('lets go of the oldest songs when storage is full', () => {
    let lib = emptyLibrary();
    for (let i = 0; i < 6; i++) lib = addSong(lib, cleanSong(sample(`k${i}`)));
    const limit = serializeSongs({ seq: lib.seq, songs: lib.songs.slice(0, 3) }).length;
    let stored = null;
    const res = saveLibrary(lib, (text) => {
      if (text.length > limit) throw new Error('QuotaExceededError');
      stored = text;
    });
    expect(res.ok).toBe(true);
    expect(res.lib.songs.map((s) => s.id)).toEqual(['k5', 'k4', 'k3']);
    expect(parseSongs(stored).songs.length).toBe(3);
    const fail = saveLibrary(lib, () => {
      throw new Error('no storage');
    });
    expect(fail.ok).toBe(false);
    expect(fail.lib.songs.length).toBe(6);
  });

  it('gives neighbouring songs different looks', () => {
    for (let i = 0; i < 20; i++) {
      const a = songLook(i);
      const b = songLook(i + 1);
      expect(a.col !== b.col || a.pic !== b.pic).toBe(true);
      expect(SONG_COLOURS[a.col]).toBeDefined();
      expect(SONG_PICS[a.pic]).toBeDefined();
    }
  });
});

// ---------- layout ----------

const SIZES = [[820, 1180], [1180, 820], [390, 844]];
const overlaps = (a, b) => a.x < b.x + b.w - 0.01 && b.x < a.x + a.w - 0.01 && a.y < b.y + b.h - 0.01 && b.y < a.y + a.h - 0.01;

function checkControls(controls, w, h, label) {
  for (const c of controls) {
    expect(c.x, `${label} ${c.id} left`).toBeGreaterThanOrEqual(0);
    expect(c.y, `${label} ${c.id} top`).toBeGreaterThanOrEqual(0);
    expect(c.x + c.w, `${label} ${c.id} right`).toBeLessThanOrEqual(w + 0.01);
    expect(c.y + c.h, `${label} ${c.id} bottom`).toBeLessThanOrEqual(h + 0.01);
    expect(Math.min(c.w, c.h), `${label} ${c.id} size`).toBeGreaterThanOrEqual(44);
  }
  for (let i = 0; i < controls.length; i++) {
    for (let j = i + 1; j < controls.length; j++) {
      expect(overlaps(controls[i], controls[j]), `${label} ${controls[i].id}/${controls[j].id}`).toBe(false);
    }
  }
}

describe('layout', () => {
  for (const [w, h] of SIZES) {
    for (const tab of ['pads', 'beats']) {
      it(`puts every booth control on screen, apart and big enough at ${w}x${h} (${tab})`, () => {
        const L = layoutBooth(w, h, tab);
        checkControls(L.controls, w, h, `${w}x${h} ${tab}`);
        if (tab === 'pads') expect(L.pads.length).toBe(PADS.length);
        else {
          expect(L.beats.cells.length).toBe(ROWS.length * STEPS);
          const steps = new Set(L.beats.cells.map((c) => `${c.row}/${c.step}`));
          expect(steps.size).toBe(ROWS.length * STEPS);
          expect(L.beats.styles.length).toBe(STYLES.length);
        }
        // the record is round: its circle must not reach any other control
        const d = L.stage.deck;
        for (const c of L.controls) {
          if (c === d) continue;
          const nx = Math.max(c.x, Math.min(d.cx, c.x + c.w));
          const ny = Math.max(c.y, Math.min(d.cy, c.y + c.h));
          expect(Math.hypot(nx - d.cx, ny - d.cy), c.id).toBeGreaterThanOrEqual(d.r - 0.01);
        }
        expect(d.r).toBeGreaterThanOrEqual(40);
        // the home button sits where the other games put it
        expect(L.bar.home.x).toBe(Math.max(10, w * 0.025));
        expect(L.bar.home.y).toBe(Math.max(10, w * 0.025));
      });
    }

    it(`shelves every song and the confirm buttons fit at ${w}x${h}`, () => {
      const S = layoutShelf(w, h);
      expect(S.slots.length).toBe(MAX_SONGS);
      checkControls(S.controls, w, h, `${w}x${h} shelf`);
      const C = layoutConfirm(w, h);
      checkControls([C.yes, C.no], w, h, `${w}x${h} confirm`);
      expect(C.pic.cy + C.pic.r).toBeLessThanOrEqual(C.yes.y);
    });
  }

  it('still lays out (smaller) on a phone held sideways and a small phone', () => {
    for (const [w, h] of [[844, 390], [375, 667], [320, 480]]) {
      for (const tab of ['pads', 'beats']) {
        const L = layoutBooth(w, h, tab);
        for (const c of L.controls) {
          expect(c.w).toBeGreaterThan(10);
          expect(c.x + c.w).toBeLessThanOrEqual(w + 0.01);
          expect(c.y + c.h).toBeLessThanOrEqual(h + 0.01);
        }
      }
    }
  });

  it('hit tests rectangles', () => {
    const b = { x: 10, y: 10, w: 50, h: 50 };
    expect(hit(b, 10, 10)).toBe(true);
    expect(hit(b, 61, 30)).toBe(false);
    expect(hit(null, 0, 0)).toBe(false);
  });
});

// ---------- sound and the whole game without a browser ----------

describe('without Web Audio', () => {
  it('the sound module does nothing and never throws', () => {
    expect(() => sound.unlockAudio()).not.toThrow();
    expect(sound.audioTime()).toBeNull();
    expect(sound.audioState()).toBe('none');
    expect(sound.playPad(0, 0, 0)).toBe(false);
    expect(sound.playStep([0, 1], 0, 0)).toBe(false);
    expect(() => {
      sound.setEcho(true, 0, 100);
      sound.setFilter(0.2, 0);
      sound.scratchOn(0);
      sound.scratchSpeed(2, 0);
      sound.scratchOff(0);
      sound.hush();
    }).not.toThrow();
    expect(sound.filterHz(1)).toBeGreaterThan(15000);
    expect(sound.filterHz(0)).toBeLessThan(300);
  });
});

describe('the game in a pretend page', () => {
  const saved = {};
  let listeners;
  let docListeners;
  let store;
  let fakeMs = 1000; // the page clock, moved on by hand

  // a 2D context that accepts every call
  const fakeCtx = () => {
    const grad = { addColorStop() {} };
    return new Proxy({}, {
      get(t, k) {
        if (k in t) return t[k];
        if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
        if (k === 'measureText') return () => ({ width: 10 });
        return () => {};
      },
      set(t, k, v) {
        t[k] = v;
        return true;
      },
    });
  };

  beforeAll(() => {
    for (const k of ['window', 'document', 'localStorage']) saved[k] = globalThis[k];
    saved.now = performance.now;
    performance.now = () => fakeMs;
    store = new Map();
    globalThis.window = { addEventListener() {}, removeEventListener() {} };
    docListeners = new Map();
    globalThis.document = {
      hidden: false,
      addEventListener: (k, f) => docListeners.set(k, f),
      removeEventListener: (k) => docListeners.delete(k),
    };
    globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  });

  afterAll(() => {
    performance.now = saved.now;
    delete saved.now;
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete globalThis[k];
      else globalThis[k] = saved[k];
    }
  });

  it('plays, records, keeps, plays back and deletes a song, then cleans up on exit', async () => {
    const { djBooth } = await import('../src/games/dj-booth/index.js');
    expect(djBooth.id).toBe('dj-booth');
    expect(djBooth.title).toBe('Beat Booth');
    const ctx = fakeCtx();
    expect(() => djBooth.drawTile(ctx, 0, 0, 200, 150, 1.5)).not.toThrow();
    store.set(SAVE_KEY, 'garbage{');
    listeners = new Map();
    let exited = 0;
    const canvas = {
      addEventListener: (k, f) => listeners.set(k, f),
      removeEventListener: (k) => listeners.delete(k),
      getBoundingClientRect: () => ({ left: 0, top: 0 }),
      setPointerCapture() {},
    };
    const g = djBooth.create({ canvas, exit: () => exited++ });
    expect(listeners.size).toBe(4);
    g.resize(390, 844);
    const dj = window.__dj;
    const run = (secs) => {
      for (let i = 0; i < secs * 60; i++) {
        fakeMs += 1000 / 60;
        g.update(1 / 60);
        g.draw(ctx);
      }
    };
    // a real finger on a pad, through the game's own pointer listener
    const L = dj.layout();
    const pad = L.pads[3];
    const ev = (x, y, id = 1) => ({ clientX: x, clientY: y, pointerId: id, type: 'pointerdown', preventDefault() {} });
    listeners.get('pointerdown')(ev(pad.x + 5, pad.y + 5));
    listeners.get('pointerup')({ ...ev(pad.x + 5, pad.y + 5), type: 'pointerup' });
    expect(dj.state().padHit[3]).toBeGreaterThanOrEqual(0);
    // shell callbacks do nothing, so nothing is handled twice
    expect(g.onPickUp(pad.x + 5, pad.y + 5)).toBe(false);
    g.onTap(pad.x + 5, pad.y + 5);

    dj.startRecording();
    dj.play();
    run(0.5);
    expect(dj.state().playing).toBe(true);
    expect(dj.state().stepsScheduled).toBeGreaterThan(2);
    dj.hitPad(7);
    dj.toggleStep(3, 1);
    dj.tab('beats');
    run(0.3);
    dj.style(2);
    dj.tempo(4);
    run(0.5);
    dj.stopRecording();
    expect(dj.songs().length).toBe(1);
    expect(parseSongs(store.get(SAVE_KEY)).songs.length).toBe(1);
    dj.playSong();
    run(0.4);
    expect(dj.state().songPlaying).toBe(dj.songs()[0].id);
    run(dj.songs()[0].len + 1);
    expect(dj.state().songPlaying).toBeNull();
    dj.shelf();
    run(0.1);
    dj.deleteSong(dj.songs()[0].id);
    expect(dj.songs().length).toBe(0);
    // hiding the page stops the beat
    dj.booth();
    dj.play();
    run(0.2);
    document.hidden = true;
    docListeners.get('visibilitychange')();
    document.hidden = false;
    expect(dj.state().playing).toBe(false);
    dj.exit();
    expect(exited).toBe(1);
    expect(listeners.size).toBe(0);
    expect(docListeners.has('visibilitychange')).toBe(false);
    expect(window.__dj).toBeUndefined();
  });
});

