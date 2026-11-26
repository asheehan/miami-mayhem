// Beat Booth: a DJ toy. A turntable to scratch, a board of sound pads, a beat grid with
// ready-made styles, tempo and two effects, and a record button that keeps songs on a
// shelf to play back. The music model is in music.js, songs and storage in song.js, the
// clock in clock.js, screen layout in layout.js, pictures in draw.js and sounds in sound.js.
//
// Input: this game listens to every finger itself (pointer events on the shared canvas), so
// one hand can scratch while the other hits pads. The shell's single-pointer callbacks are
// left empty, so nothing is handled twice.
import {
  PADS, ROWS, STYLES, TEMPOS, DEFAULT_TEMPO, createTransport, startTransport, stopTransport, nextStep, catchUp,
  stepRows, quantiseHit, playheadAt, beatPhase, stylePattern, emptyPattern, clonePattern, setStep, variantCount,
  patternToStrings, stepDur,
} from './music.js';
import {
  MAX_SONG, SAVE_KEY, SONG_COLOURS, SONG_PICS, startRecording, recEvent, recGrid, recScratch, recElapsed, recFull,
  finishRecording, createPlayer, playerTick, playerProgress, parseSongs, saveLibrary, addSong, removeSong,
} from './song.js';
import { createClock, readClock, toAudio } from './clock.js';
import { layoutBooth, layoutShelf, layoutConfirm, hit } from './layout.js';
import {
  drawClub, drawStage, drawDeck, drawIconButton, glyph, drawRecButton, drawShelfButton, drawPad, drawFxPad, drawTabs,
  drawBigButton, drawTempo, drawGrid, drawDancer, drawSparks, drawSongRecord, drawIcon, drawTile, roundRect, C,
} from './draw.js';
import {
  unlockAudio, hush, audioTime, audioState, playPad, playStep, setEcho, setFilter, scratchOn, scratchSpeed, scratchOff,
} from './sound.js';

const AHEAD = 0.12; // seconds of music handed to the audio clock ahead of time
const TICK_MS = 25; // how often the scheduler looks ahead, independent of frames
const NORMAL_SPIN = Math.PI * 2 * 0.55; // the record's normal speed, radians a second
const TAU = Math.PI * 2;

export function loadLibrary() {
  try {
    return parseSongs(localStorage.getItem(SAVE_KEY));
  } catch {
    return parseSongs(null);
  }
}

function writeStore(text) {
  localStorage.setItem(SAVE_KEY, text);
}

export const djBooth = {
  id: 'dj-booth',
  title: 'Beat Booth',
  drawTile,
  create,
};

function create(host) {
  const canvas = host.canvas;
  let size = { w: 1, h: 1 };
  let tab = 'pads';
  let screen = 'booth'; // 'booth' | 'shelf'
  let L = null; // booth layout
  let SL = null; // shelf layout
  let binMode = false;
  let confirm = null; // id of the song asking to be thrown away
  let time = 0; // frame time, for wobbles
  let closed = false;

  const clock = createClock();
  const now = () => readClock(clock, audioTime(), performance.now() / 1000);
  const aT = (t) => toAudio(clock, t);

  // the live booth
  const live = {
    tr: createTransport(TEMPOS[STYLES[0].tempo]),
    queue: [], // steps handed to the audio clock, oldest first
    pattern: stylePattern(0),
    tempo: STYLES[0].tempo,
    style: 0,
    echo: false,
    filter: 1,
  };
  const variant = PADS.map(() => 0);
  let lib = loadLibrary();
  let rec = null; // the recording in progress
  let player = null; // the song playing back
  let playQueue = [];
  let before = null; // the booth as it was before a song started
  let playingId = null;

  // what the pictures need
  const padHit = PADS.map(() => -10); // game time each pad last sounded
  const rowHit = ROWS.map(() => -10);
  const fingers = new Map(); // pointer id -> what that finger is doing
  let sparks = [];
  let deckAngle = 0;
  let deckSpeed = 0;
  let deckHand = null; // pointer id holding the record
  let songHold = false; // the song being played has a hand on the record
  let songScratch = 0;
  let energy = 0;
  let shelfBump = 0;
  let flying = null; // a new song flying to the shelf
  let filterShown = 1;
  let echoShown = false;
  let pressed = null; // button under a finger, for a pressed look
  let lastFilterRec = -1;

  // ---------- layout ----------

  function relayout() {
    L = layoutBooth(size.w, size.h, tab);
    SL = layoutShelf(size.w, size.h);
  }

  // ---------- the beat ----------

  const tr = () => (player ? player.tr : live.tr);
  const shownPattern = () => (player ? player.pattern : live.pattern);
  const shownTempo = () => (player ? player.tempo : live.tempo);
  const shownStyle = () => (player ? player.style : live.style);
  const queue = () => (player ? playQueue : live.queue);

  function pump() {
    if (closed) return;
    const t = now();
    if (player) {
      for (const a of playerTick(player, t, AHEAD)) songAction(a);
    } else {
      catchUp(live.tr, t);
      let s;
      while ((s = nextStep(live.tr, t + AHEAD))) {
        const rows = stepRows(live.pattern, s.step);
        playStep(rows, s.step, aT(s.time));
        live.queue.push({ ...s, rows });
      }
    }
    const q = queue();
    while (q.length > 48 || (q.length && q[0].time < t - 2)) q.shift();
    if (rec && recFull(rec, t)) stopRecording();
  }

  function startBeat() {
    if (player || live.tr.playing) return;
    const t = now() + 0.05;
    startTransport(live.tr, t);
    if (rec) recGrid(rec, t, live.tr, 'g', 1);
    pump();
  }

  function stopBeat() {
    if (player || !live.tr.playing) return;
    if (rec) recGrid(rec, now(), live.tr, 'g', 0);
    stopTransport(live.tr);
  }

  function toggleBeat() {
    if (live.tr.playing) stopBeat();
    else startBeat();
  }

  function chooseStyle(i) {
    if (player) return;
    const t = now();
    live.pattern = stylePattern(i);
    live.style = i;
    live.tempo = STYLES[i].tempo;
    live.tr.bpm = TEMPOS[live.tempo];
    if (rec) recGrid(rec, t, live.tr, 'y', i);
    if (!live.tr.playing) startBeat();
    burst(L.beats ? centre(L.beats.styles[i]) : centre(L.stage.deck), STYLES[i].colour, 10);
  }

  function clearBeat() {
    if (player) return;
    live.pattern = emptyPattern();
    live.style = -1;
    if (rec) recGrid(rec, now(), live.tr, 'c');
  }

  function setTempo(i) {
    if (player) return;
    const v = Math.max(0, Math.min(TEMPOS.length - 1, i));
    if (v === live.tempo) return;
    live.tempo = v;
    live.tr.bpm = TEMPOS[v];
    if (rec) recGrid(rec, now(), live.tr, 't', v);
    if (live.echo) setEcho(true, aT(now()), live.tr.bpm);
  }

  function setCell(row, step, on) {
    if (player) return;
    if (live.pattern[row][step] === on) return;
    setStep(live.pattern, row, step, on);
    if (rec) recGrid(rec, now(), live.tr, 's', row, step, on ? 1 : 0);
    // with the beat stopped, a new square plays its sound so it is heard at once
    if (on && !live.tr.playing) {
      const t = now();
      playStep([row], step, aT(t));
      rowHit[row] = t;
    }
  }

  function hitPad(i, record = true) {
    const t0 = now();
    const t = quantiseHit(t0, tr());
    const v = variant[i];
    variant[i] = (v + 1) % variantCount(i);
    playPad(i, v, aT(t));
    padHit[i] = t;
    energy = Math.min(1.4, energy + 0.35);
    if (record && rec) recEvent(rec, t, 'p', i, v);
    const b = L.pads[i];
    if (b) burst(centre(b), PADS[i].colour, 7);
  }

  function setEchoOn(on, record = true) {
    if (live.echo === on) return;
    live.echo = on;
    echoShown = on;
    const t = now();
    setEcho(on, aT(t), tr().bpm);
    if (record && rec) recEvent(rec, t, 'e', on ? 1 : 0);
  }

  function setFilterTo(v, record = true) {
    const t = now();
    live.filter = v;
    filterShown = v;
    setFilter(v, aT(t));
    if (record && rec && (Math.abs(v - lastFilterRec) >= 0.03 || v === 1)) {
      recEvent(rec, t, 'f', Math.round(v * 100) / 100);
      lastFilterRec = v;
    }
  }

  // ---------- the record (turntable) ----------

  function handOn() {
    const t = now();
    scratchOn(aT(t));
    if (rec) recEvent(rec, t, 'h', 1);
  }

  function handOff() {
    const t = now();
    scratchOff(aT(t));
    if (rec) recEvent(rec, t, 'h', 0);
  }

  function scratchAt(v) {
    const t = now();
    scratchSpeed(v, aT(t));
    if (rec) recScratch(rec, t, v);
  }

  // ---------- recording ----------

  function startRecordingNow() {
    if (rec || player) return;
    rec = startRecording(now(), live);
    lastFilterRec = live.filter;
  }

  function stopRecording() {
    if (!rec) return;
    const t = now();
    const r = rec;
    rec = null;
    const id = `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
    const song = finishRecording(r, t, { id, made: Date.now(), seq: lib.seq });
    if (!song) return;
    lib = addSong(lib, song);
    persist();
    shelfBump = 1;
    flying = { song, t: 0, from: centre(L.stage.deck), to: centre(L.bar.right) };
  }

  function persist() {
    try {
      const res = saveLibrary(lib, writeStore);
      lib = res.lib;
    } catch {
      // storage unavailable: songs stay for this visit only
    }
  }

  // ---------- song playback ----------

  function playSong(id) {
    const song = lib.songs.find((s) => s.id === id);
    if (!song) return;
    if (rec) stopRecording();
    stopSong(false);
    before = { pattern: clonePattern(live.pattern), tempo: live.tempo, style: live.style };
    stopTransport(live.tr);
    live.queue.length = 0;
    releaseFx();
    player = createPlayer(song, now() + 0.12);
    playQueue = [];
    playingId = id;
    songHold = false;
    songScratch = 0;
    screen = 'booth';
    setEcho(song.start.echo, aT(player.at), player.tr.bpm);
    setFilter(song.start.filter, aT(player.at));
    filterShown = song.start.filter;
    echoShown = song.start.echo;
    pump();
  }

  function stopSong(restore = true) {
    if (!player) return;
    player = null;
    playQueue = [];
    playingId = null;
    if (songHold) scratchOff(aT(now()));
    songHold = false;
    setEcho(false, aT(now()), live.tr.bpm);
    setFilter(1, aT(now()));
    filterShown = 1;
    echoShown = false;
    if (restore && before) {
      live.pattern = before.pattern;
      live.tempo = before.tempo;
      live.style = before.style;
      live.tr.bpm = TEMPOS[live.tempo];
    }
    before = null;
  }

  function songAction(a) {
    switch (a.type) {
      case 'step':
        playStep(a.rows, a.step, aT(a.time));
        playQueue.push(a);
        break;
      case 'pad':
        playPad(a.pad, a.variant, aT(a.time));
        padHit[a.pad] = a.time;
        break;
      case 'echo':
        setEcho(a.on, aT(a.time), player.tr.bpm);
        echoShown = a.on;
        break;
      case 'filter':
        setFilter(a.v, aT(a.time));
        filterShown = a.v;
        break;
      case 'hold':
        if (a.on) scratchOn(aT(a.time));
        else scratchOff(aT(a.time));
        songHold = a.on;
        songScratch = 0;
        break;
      case 'scratch':
        scratchSpeed(a.v, aT(a.time));
        songScratch = a.v;
        break;
      case 'end':
        stopSong(true);
        break;
      default:
    }
  }

  // ---------- leaving ----------

  function releaseFx() {
    if (live.echo) setEchoOn(false);
    if (live.filter !== 1) setFilterTo(1);
    if (deckHand !== null) {
      deckHand = null;
      handOff();
    }
    for (const [, f] of fingers) f.dead = true;
    fingers.clear();
  }

  // Stop every sound: the beat, a song, the effects. A recording is kept.
  function silence() {
    if (rec) stopRecording();
    stopSong(true);
    releaseFx();
    stopTransport(live.tr);
    live.queue.length = 0;
    hush();
  }

  function onVisibility() {
    if (document.hidden) silence();
  }

  function leave() {
    if (closed) return;
    silence();
    closed = true;
    clearInterval(timer);
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', up);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', silence);
    if (window.__dj === debugApi) delete window.__dj;
    host.exit();
  }

  // ---------- pictures' helpers ----------

  function centre(b) {
    return b.cx !== undefined ? { x: b.cx, y: b.cy } : { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  }

  function burst(p, colour, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const sp = 80 + Math.random() * 160;
      sparks.push({
        kind: i % 2 ? 'note' : 'star', x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120,
        r: 5 + Math.random() * 6, t: 0, life: 0.7 + Math.random() * 0.3, c: i % 3 ? colour : '#ffffff',
      });
    }
    if (sparks.length > 160) sparks.splice(0, sparks.length - 160);
  }

  // ---------- input ----------

  const point = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const inDeck = (x, y) => {
    const d = L.stage.deck;
    return Math.hypot(x - d.cx, y - d.cy) <= d.r;
  };

  // What a touch at (x, y) lands on.
  function targetAt(x, y) {
    if (confirm) {
      const c = layoutConfirm(size.w, size.h);
      if (hit(c.yes, x, y)) return { kind: 'button', id: 'yes', box: c.yes };
      if (hit(c.no, x, y)) return { kind: 'button', id: 'no', box: c.no };
      return { kind: 'button', id: 'no', box: null };
    }
    if (screen === 'shelf') {
      if (hit(SL.back, x, y)) return { kind: 'button', id: 'back', box: SL.back };
      if (hit(SL.bin, x, y)) return { kind: 'button', id: 'bin', box: SL.bin };
      if (hit(SL.bar.rec, x, y) && player) return { kind: 'button', id: 'rec', box: SL.bar.rec };
      const s = SL.slots.find((b) => hit(b, x, y));
      if (s && lib.songs[s.index]) return { kind: 'button', id: 'slot', index: s.index, box: s };
      return null;
    }
    const b = L;
    if (hit(b.bar.home, x, y)) return { kind: 'button', id: 'home', box: b.bar.home };
    if (hit(b.bar.rec, x, y)) return { kind: 'button', id: 'rec', box: b.bar.rec };
    if (hit(b.bar.right, x, y)) return { kind: 'button', id: 'shelf', box: b.bar.right };
    if (inDeck(x, y)) return { kind: 'deck' };
    if (hit(b.stage.echo, x, y)) return { kind: 'echo' };
    if (hit(b.stage.filter, x, y)) return { kind: 'filter' };
    for (const t of b.tabs) if (hit(t, x, y)) return { kind: 'button', id: 'tab', tab: t.tab, box: t };
    if (b.beats) {
      const B = b.beats;
      if (hit(B.play, x, y)) return { kind: 'button', id: 'play', box: B.play };
      if (hit(B.clear, x, y)) return { kind: 'button', id: 'clear', box: B.clear };
      const st = B.styles.find((s) => hit(s, x, y));
      if (st) return { kind: 'button', id: 'style', index: st.index, box: st };
      if (hit(B.slower, x, y)) return { kind: 'button', id: 'slower', box: B.slower };
      if (hit(B.faster, x, y)) return { kind: 'button', id: 'faster', box: B.faster };
      if (hit(B.tempo, x, y)) return { kind: 'tempo' };
      const c = B.cells.find((q) => hit(q, x, y));
      if (c) return { kind: 'cell', row: c.row, step: c.step };
      const l = B.labels.find((q) => hit(q, x, y));
      if (l) return { kind: 'label', row: l.row };
    } else {
      const p = b.pads.find((q) => hit(q, x, y));
      if (p) return { kind: 'pad', index: p.index };
    }
    return null;
  }

  function tempoFromX(x) {
    const T = L.beats.tempo;
    const pad = T.h * 0.4;
    const f = (x - T.x - pad) / Math.max(1, T.w - pad * 2);
    return Math.round(Math.max(0, Math.min(1, f)) * (TEMPOS.length - 1));
  }

  const filterFromY = (y) => {
    const F = L.stage.filter;
    return Math.max(0, Math.min(1, 1 - (y - F.y) / F.h));
  };

  function down(e) {
    if (closed) return;
    e.preventDefault();
    unlockAudio();
    const p = point(e);
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // best effort
    }
    const tgt = targetAt(p.x, p.y);
    if (!tgt) return;
    const f = { ...tgt, x0: p.x, y0: p.y, x: p.x, y: p.y };
    fingers.set(e.pointerId, f);
    if (tgt.kind === 'pad') hitPad(tgt.index);
    else if (tgt.kind === 'echo') setEchoOn(true);
    else if (tgt.kind === 'filter') setFilterTo(filterFromY(p.y));
    else if (tgt.kind === 'tempo') setTempo(tempoFromX(p.x));
    else if (tgt.kind === 'cell') {
      if (!player) {
        f.paint = !live.pattern[tgt.row][tgt.step];
        setCell(tgt.row, tgt.step, f.paint);
      }
    } else if (tgt.kind === 'label') {
      const t = now();
      playStep([tgt.row], 0, aT(t));
      rowHit[tgt.row] = t;
    } else if (tgt.kind === 'deck') {
      const d = L.stage.deck;
      f.a = Math.atan2(p.y - d.cy, p.x - d.cx);
      f.t = performance.now() / 1000;
      f.turned = 0;
      f.scratching = false;
      f.v = 0;
    } else if (tgt.kind === 'button') pressed = f;
  }

  function move(e) {
    const f = fingers.get(e.pointerId);
    if (!f || closed) return;
    e.preventDefault();
    const p = point(e);
    f.x = p.x;
    f.y = p.y;
    if (f.kind === 'filter') setFilterTo(filterFromY(p.y));
    else if (f.kind === 'tempo') setTempo(tempoFromX(p.x));
    else if (f.kind === 'cell') {
      const c = L.beats && L.beats.cells.find((q) => hit(q, p.x, p.y));
      if (c && f.paint !== undefined) setCell(c.row, c.step, f.paint);
    } else if (f.kind === 'deck') {
      const d = L.stage.deck;
      const a = Math.atan2(p.y - d.cy, p.x - d.cx);
      let da = a - f.a;
      if (da > Math.PI) da -= TAU;
      if (da < -Math.PI) da += TAU;
      const t = performance.now() / 1000;
      const dt = Math.max(0.008, t - f.t);
      f.a = a;
      f.t = t;
      f.turned += Math.abs(da);
      // near the middle a small finger move is a big turn, so it counts for less
      const reach = Math.min(1, Math.hypot(p.x - d.cx, p.y - d.cy) / (d.r * 0.5));
      deckAngle += da;
      if (!f.scratching && (f.turned > 0.12 || Math.hypot(p.x - f.x0, p.y - f.y0) > 10)) {
        f.scratching = true;
        if (deckHand === null) {
          deckHand = e.pointerId;
          handOn();
        }
      }
      if (f.scratching && deckHand === e.pointerId) {
        const v = ((da / dt) / NORMAL_SPIN) * reach;
        f.v = f.v * 0.4 + v * 0.6;
        f.lastMove = t;
        scratchAt(f.v);
      }
    }
  }

  function up(e) {
    const f = fingers.get(e.pointerId);
    if (!f || closed) return;
    e.preventDefault();
    fingers.delete(e.pointerId);
    const p = e.type === 'pointercancel' ? { x: f.x, y: f.y } : point(e);
    if (pressed === f) pressed = null;
    if (f.kind === 'echo') {
      if (![...fingers.values()].some((g) => g.kind === 'echo')) setEchoOn(false);
    } else if (f.kind === 'filter') {
      if (![...fingers.values()].some((g) => g.kind === 'filter')) setFilterTo(1);
    } else if (f.kind === 'deck') {
      if (deckHand === e.pointerId) {
        deckHand = null;
        handOff();
        deckSpeed = 0;
      } else if (!f.scratching && e.type === 'pointerup' && !player) toggleBeat();
    } else if (f.kind === 'button' && e.type === 'pointerup') {
      const again = targetAt(p.x, p.y);
      const same = again && again.id === f.id && again.index === f.index && again.tab === f.tab;
      if (same || (f.id === 'no' && confirm)) press(f);
    }
  }

  function press(b) {
    switch (b.id) {
      case 'home':
        leave();
        break;
      case 'rec':
        if (player) stopSong(true);
        else if (rec) stopRecording();
        else startRecordingNow();
        break;
      case 'shelf':
        if (rec) stopRecording();
        screen = 'shelf';
        binMode = false;
        break;
      case 'back':
        screen = 'booth';
        binMode = false;
        break;
      case 'bin':
        binMode = !binMode;
        break;
      case 'slot': {
        const s = lib.songs[b.index];
        if (!s) break;
        if (binMode) confirm = s.id;
        else playSong(s.id);
        break;
      }
      case 'yes':
        if (playingId === confirm) stopSong(true);
        lib = removeSong(lib, confirm);
        persist();
        confirm = null;
        if (!lib.songs.length) binMode = false;
        break;
      case 'no':
        confirm = null;
        break;
      case 'tab':
        tab = b.tab;
        relayout();
        break;
      case 'play':
        toggleBeat();
        break;
      case 'clear':
        clearBeat();
        break;
      case 'style':
        chooseStyle(b.index);
        break;
      case 'slower':
        setTempo(live.tempo - 1);
        break;
      case 'faster':
        setTempo(live.tempo + 1);
        break;
      default:
    }
  }

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', silence);
  const timer = setInterval(pump, TICK_MS);

  // ---------- drawing ----------

  function drawBooth(ctx, t) {
    const { w, h } = size;
    const q = queue();
    const playing = tr().playing;
    const ph = beatPhase(q, t);
    const beat = ph ? ph.phase : 0;
    const head = playing || (q.length && t - q[q.length - 1].time < 0.2) ? playheadAt(q, t) : -1;
    const kick = ph && playing ? Math.max(0, 1 - ((t - lastStepTime(q, t)) / 0.15)) : 0;
    drawClub(ctx, w, h, time, kick * 0.6 + energy * 0.3, ph ? ph.beat : 0);
    // the dancers in the top bar
    const songKey = player ? 1 : 0;
    drawDancer(ctx, L.bar.dancers[0], 'flamingo', { beat: (beat * 4) % 1, energy: Math.min(1, energy), time });
    drawDancer(ctx, L.bar.dancers[1], 'gator', { beat: (beat * 4 + 0.5) % 1, energy: Math.min(1, energy), time: time + songKey });
    drawStage(ctx, L.stage.rect, time, (beat * 4) % 1, Math.min(1, energy));
    const song = player ? player.song : null;
    drawDeck(ctx, L.stage.deck, {
      angle: deckAngle,
      playing,
      held: deckHand !== null || songHold,
      label: song ? { colour: SONG_COLOURS[song.col], pic: SONG_PICS[song.pic] } : { colour: shownStyle() >= 0 ? STYLES[shownStyle()].colour : '#7b61ff', pic: null },
      time,
      beat: kick,
      song: !!song,
    });
    drawFxPad(ctx, L.stage.echo, 'echo', echoShown, 1, time);
    drawFxPad(ctx, L.stage.filter, 'filter', filterShown < 0.98, filterShown, time);
    drawTabs(ctx, L.tabs, tab);
    if (L.beats) drawBeats(ctx, t, head);
    else {
      L.pads.forEach((b, i) => {
        const dt = t - padHit[i];
        const lit = dt >= 0 && dt < 0.35 ? 1 - dt / 0.35 : 0;
        drawPad(ctx, b, i, lit, time);
      });
    }
    drawSparks(ctx, sparks);
    drawTopButtons(ctx, L.bar, t);
    if (rec) {
      // a red glow round the edge while recording
      const a = 0.5 + 0.3 * Math.sin(time * 6);
      ctx.strokeStyle = `rgba(255,51,68,${a})`;
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, w - 8, h - 8);
    }
  }

  function lastStepTime(q, t) {
    let last = -10;
    for (const s of q) {
      if (s.time <= t) last = s.time;
      else break;
    }
    return last;
  }

  function drawTopButtons(ctx, bar, t) {
    if (screen === 'shelf') drawIconButton(ctx, SL.back, 'back');
    else drawIconButton(ctx, bar.home, 'home');
    const mode = player ? 'song' : rec ? 'rec' : 'idle';
    const progress = player ? playerProgress(player, t) : rec ? recElapsed(rec, t) / MAX_SONG : 0;
    if (screen === 'booth' || player) drawRecButton(ctx, bar.rec, { mode, progress, time });
    if (screen === 'booth') drawShelfButton(ctx, bar.right, lib.songs.length, shelfBump);
  }

  function drawBeats(ctx, t, head) {
    const B = L.beats;
    const playing = tr().playing;
    const locked = !!player;
    ctx.save();
    if (locked) ctx.globalAlpha = 0.92;
    drawBigButton(ctx, B.play, playing ? '#ff3344' : '#2fd36b', playing ? 'stop' : 'play', { on: pressed && pressed.id === 'play' });
    B.styles.forEach((b) => {
      drawBigButton(ctx, b, STYLES[b.index].colour, STYLES[b.index].id, { on: shownStyle() === b.index, time });
    });
    drawBigButton(ctx, B.clear, '#8d86a8', 'eraser', { on: pressed && pressed.id === 'clear' });
    const flash = {};
    ROWS.forEach((_, r) => {
      const dt = t - rowHit[r];
      flash[`row${r}`] = dt >= 0 && dt < 0.3 ? 1 - dt / 0.3 : 0;
    });
    drawGrid(ctx, B, shownPattern(), { playhead: head, flash, time });
    drawBigButton(ctx, B.slower, '#2fae4a', 'turtle', { on: pressed && pressed.id === 'slower' });
    drawBigButton(ctx, B.faster, '#ff6fa8', 'rabbit', { on: pressed && pressed.id === 'faster' });
    drawTempo(ctx, B.tempo, shownTempo(), time);
    ctx.restore();
  }

  function drawShelf(ctx, t) {
    const { w, h } = size;
    drawClub(ctx, w, h, time, energy * 0.3, 0);
    drawIconButton(ctx, SL.back, 'back');
    if (player) drawRecButton(ctx, SL.bar.rec, { mode: 'song', progress: playerProgress(player, t), time });
    if (lib.songs.length) drawIconButton(ctx, SL.bin, 'bin', binMode);
    // wooden shelves behind each row of records
    // shelves for the rows in use and one spare
    const cols = SL.slots.filter((s) => s.y === SL.slots[0].y).length;
    const used = Math.ceil(Math.max(1, lib.songs.length + 1) / cols);
    const rows = [...new Set(SL.slots.map((s) => s.y))].slice(0, used);
    for (const y of rows) {
      const s = SL.slots[0].h;
      ctx.fillStyle = '#7a4a2b';
      roundRect(ctx, SL.body.x, y + s * 0.92, SL.body.w, Math.max(6, s * 0.08), 4);
      ctx.fill();
    }
    if (!lib.songs.length) {
      // empty: a ghost record and the red record button, meaning "make one"
      const cx = w / 2;
      const cy = size.h * 0.42;
      const r = Math.min(w, h) * 0.2;
      ctx.setLineDash([12, 10]);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      const k = 1 + 0.08 * Math.sin(time * 5);
      ctx.fillStyle = C.red;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.35 * k, 0, TAU);
      ctx.fill();
      return;
    }
    lib.songs.forEach((song, i) => {
      const b = SL.slots[i];
      const r = b.w * 0.44;
      const on = song.id === playingId;
      const wob = binMode ? Math.sin(time * 14 + i) * 0.08 : 0;
      drawSongRecord(ctx, b.x + b.w / 2, b.y + b.h * 0.47, r, song, { spin: on ? time * 3 : 0, time, playing: on, wobble: wob });
      if (binMode) {
        const br = Math.max(12, b.w * 0.16);
        ctx.fillStyle = C.red;
        ctx.beginPath();
        ctx.arc(b.x + b.w - br * 0.9, b.y + br * 0.9, br, 0, TAU);
        ctx.fill();
        glyph(ctx, 'bin', b.x + b.w - br * 0.9, b.y + br * 0.95, br * 0.55, C.white);
      }
    });
  }

  function drawConfirm(ctx) {
    const { w, h } = size;
    const c = layoutConfirm(w, h);
    ctx.fillStyle = 'rgba(15,6,35,0.82)';
    ctx.fillRect(0, 0, w, h);
    const song = lib.songs.find((s) => s.id === confirm);
    if (song) drawSongRecord(ctx, c.pic.cx, c.pic.cy, c.pic.r, song, { time, wobble: Math.sin(time * 10) * 0.06 });
    // red bin: throw it away; green cross: keep it
    drawBigButton(ctx, c.yes, '#ff3344', null, {});
    glyph(ctx, 'bin', c.yes.x + c.yes.w / 2, c.yes.y + c.yes.h / 2 + c.yes.w * 0.04, c.yes.w * 0.24, C.white);
    drawBigButton(ctx, c.no, '#2fd36b', null, {});
    glyph(ctx, 'cross', c.no.x + c.no.w / 2, c.no.y + c.no.h / 2 - 2, c.no.w * 0.22, C.white);
  }

  function drawFlying(ctx) {
    if (!flying) return;
    const k = Math.min(1, flying.t / 0.7);
    const e = 1 - (1 - k) ** 3;
    const x = flying.from.x + (flying.to.x - flying.from.x) * e;
    const y = flying.from.y + (flying.to.y - flying.from.y) * e - Math.sin(k * Math.PI) * 80;
    const r = (1 - k * 0.7) * Math.min(60, L.stage.deck.r * 0.5);
    drawSongRecord(ctx, x, y, r, flying.song, { spin: k * 12, time });
  }

  // ---------- the game object ----------

  const api = {
    resize(w, h) {
      size = { w, h };
      relayout();
    },

    update(dt) {
      if (closed) return;
      time += dt;
      pump();
      const playing = tr().playing;
      energy += ((playing ? 1 : 0) - energy) * Math.min(1, dt * (playing ? 3 : 1.2));
      shelfBump = Math.max(0, shelfBump - dt * 1.5);
      if (flying) {
        flying.t += dt;
        if (flying.t > 0.7) flying = null;
      }
      for (const p of sparks) {
        p.t += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 400 * dt;
      }
      sparks = sparks.filter((p) => p.t < p.life);
      // the record: follows a hand, or spins back up to speed
      const target = playing ? NORMAL_SPIN * (tr().bpm / 104) : 0;
      if (deckHand !== null) {
        const f = fingers.get(deckHand);
        // a still finger means a still record
        if (f && f.lastMove && performance.now() / 1000 - f.lastMove > 0.06 && f.v !== 0) {
          f.v = 0;
          scratchAt(0);
        }
      } else if (songHold) {
        deckAngle += songScratch * NORMAL_SPIN * dt;
      } else {
        deckSpeed += (target - deckSpeed) * Math.min(1, dt * 4);
        deckAngle += deckSpeed * dt;
      }
    },

    draw(ctx) {
      const t = now();
      if (screen === 'shelf') drawShelf(ctx, t);
      else drawBooth(ctx, t);
      drawFlying(ctx);
      if (confirm) drawConfirm(ctx);
    },

    // every finger is handled by this game's own listeners
    onPickUp: () => false,
    onDrag() {},
    onDrop() {},
    onTap() {},
  };

  // ---------- debug handle ----------

  const debugApi = {
    state: () => ({
      screen, tab, binMode, confirm,
      clock: clock.src,
      audio: audioState(),
      playing: tr().playing,
      step: tr().step,
      stepsScheduled: tr().n,
      bpm: tr().bpm,
      tempo: shownTempo(),
      style: shownStyle(),
      pattern: patternToStrings(shownPattern()),
      recording: !!rec,
      recSeconds: rec ? recElapsed(rec, now()) : 0,
      recEvents: rec ? rec.ev.length : 0,
      songPlaying: playingId,
      songProgress: player ? playerProgress(player, now()) : 0,
      echo: echoShown,
      filter: filterShown,
      deckHeld: deckHand !== null || songHold,
      padHit: padHit.slice(),
      queue: queue().map((s) => ({ time: s.time, step: s.step, rows: s.rows })),
      now: now(),
    }),
    layout: () => (screen === 'shelf' ? SL : L),
    confirmLayout: () => layoutConfirm(size.w, size.h),
    hitPad: (i) => hitPad(i),
    toggleStep: (row, step) => setCell(row, step, !live.pattern[row][step]),
    style: (i) => chooseStyle(i),
    clear: () => clearBeat(),
    tempo: (i) => setTempo(i),
    play: () => startBeat(),
    stop: () => stopBeat(),
    tab: (name) => {
      tab = name;
      relayout();
    },
    startRecording: () => startRecordingNow(),
    stopRecording: () => stopRecording(),
    songs: () => lib.songs.map((s) => ({ id: s.id, len: s.len, events: s.ev.length, col: s.col, pic: s.pic })),
    song: (id) => lib.songs.find((s) => s.id === id) || null,
    playSong: (id) => playSong(id ?? (lib.songs[0] && lib.songs[0].id)),
    stopSong: () => stopSong(true),
    shelf: () => {
      screen = 'shelf';
    },
    booth: () => {
      screen = 'booth';
    },
    deleteSong: (id) => {
      lib = removeSong(lib, id);
      persist();
    },
    exit: () => leave(),
  };
  window.__dj = debugApi;

  return api;
}
