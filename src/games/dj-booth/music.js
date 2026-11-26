// The music model for Beat Booth: the pads, the scale every pitched sound comes from, the
// beat grid and its ready-made styles, tempo, the step transport and pad quantising.
// Pure: no DOM, no audio. Times are seconds on whatever clock the caller uses.

export const STEPS = 16; // sixteenth notes in one loop (one bar)

// Every pitched sound uses C major pentatonic, so any mix of pads and steps sounds fine.
export const SCALE = [0, 2, 4, 7, 9];
export const inScale = (midi) => SCALE.includes(((Math.round(midi) % 12) + 12) % 12);
export const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);

// The sound board. `notes` lists the variants a pitched pad steps through on each hit
// (a note or a chord), so tapping one again and again plays a little tune.
export const PADS = [
  { id: 'kick', colour: '#ff4d6d' },
  { id: 'snare', colour: '#ff9f1c' },
  { id: 'hat', colour: '#ffd60a' },
  { id: 'clap', colour: '#ff70d8' },
  { id: 'tom', colour: '#b388ff' },
  { id: 'bell', colour: '#4cc9f0' },
  { id: 'conga', colour: '#f4845f' },
  { id: 'steel', colour: '#2ec4b6', notes: [[76], [79], [81], [79], [84], [81], [79], [76]] },
  { id: 'bass', colour: '#7b61ff', notes: [[36], [36], [43], [45], [40], [43]] },
  { id: 'stab', colour: '#00d084', notes: [[60, 64, 67], [62, 67, 69], [57, 60, 64], [55, 62, 67]] },
  { id: 'horn', colour: '#ff595e', notes: [[69, 76]] },
  { id: 'laser', colour: '#80ff72' },
  { id: 'boing', colour: '#ffb3c6' },
  { id: 'scratch', colour: '#a0c4ff' },
  { id: 'robot', colour: '#c3c7e8', notes: [[72, 67], [69, 74], [67, 64], [76, 72]] },
  { id: 'whistle', colour: '#fdffb6' },
];
export const padIndex = (id) => PADS.findIndex((p) => p.id === id);
export const variantCount = (pad) => (PADS[pad] && PADS[pad].notes ? PADS[pad].notes.length : 1);
export const padNotes = (pad, variant) => {
  const p = PADS[pad];
  if (!p || !p.notes) return null;
  return p.notes[((variant % p.notes.length) + p.notes.length) % p.notes.length];
};

// The rows of the beat grid, each played by the pad of the same id.
export const ROWS = ['kick', 'snare', 'hat', 'bell', 'bass'];
export const rowPad = (row) => padIndex(ROWS[row]);

// The bass row's note on each step: a pentatonic line that fits any pattern.
const BASS_LINE = [36, 36, 48, 36, 43, 43, 45, 43, 36, 36, 48, 36, 45, 43, 40, 43];
export const bassNote = (step) => BASS_LINE[((step % STEPS) + STEPS) % STEPS];

// Tempo choices, slow (turtle) to fast (rabbit), in beats per minute.
export const TEMPOS = [80, 92, 104, 116, 128];
export const DEFAULT_TEMPO = 2;
export const nearestTempo = (bpm) => {
  let best = 0;
  TEMPOS.forEach((t, i) => {
    if (Math.abs(t - bpm) < Math.abs(TEMPOS[best] - bpm)) best = i;
  });
  return best;
};
export const stepDur = (bpm) => 60 / bpm / 4;

// Ready-made beats. Each row is 16 characters, 'x' for a hit.
export const STYLES = [
  {
    id: 'dembow', tempo: 1, colour: '#ff4fa3',
    rows: ['x...x...x...x...', '...x..x....x..x.', '..x...x...x...x.', '................', 'x.......x..x....'],
  },
  {
    id: 'hiphop', tempo: 1, colour: '#ffb020',
    rows: ['x.....x...x.....', '....x.......x...', 'x.x.x.x.x.x.x.x.', '................', 'x.....x...x.....'],
  },
  {
    id: 'house', tempo: 3, colour: '#3ad6ff',
    rows: ['x...x...x...x...', '....x.......x...', '..x...x...x...x.', '..............x.', '..x...x...x...x.'],
  },
  {
    id: 'salsa', tempo: 2, colour: '#4fe07a',
    rows: ['x.......x.......', '............x...', 'x.xx.xx.x.xx.xx.', 'x..x..x...x.x...', '...x..x....x..x.'],
  },
];

// A pattern is an array of rows, each an array of STEPS booleans.
export const emptyPattern = () => ROWS.map(() => new Array(STEPS).fill(false));
export const clonePattern = (p) => p.map((r) => r.slice());
export const styleIndex = (id) => STYLES.findIndex((s) => s.id === id);
export function stylePattern(i) {
  const s = STYLES[i];
  if (!s) return emptyPattern();
  return s.rows.map((r) => Array.from({ length: STEPS }, (_, k) => r[k] === 'x'));
}
export const patternToStrings = (p) => p.map((r) => r.map((on) => (on ? 'x' : '.')).join(''));
export function patternFromStrings(rows) {
  const p = emptyPattern();
  if (!Array.isArray(rows)) return p;
  for (let r = 0; r < ROWS.length; r++) {
    const s = typeof rows[r] === 'string' ? rows[r] : '';
    for (let k = 0; k < STEPS; k++) p[r][k] = s[k] === 'x';
  }
  return p;
}
export const isEmptyPattern = (p) => p.every((r) => r.every((on) => !on));
export function setStep(p, row, step, on) {
  if (row < 0 || row >= ROWS.length || step < 0 || step >= STEPS) return false;
  p[row][step] = !!on;
  return true;
}
// rows that sound on a step
export const stepRows = (p, step) => {
  const out = [];
  for (let r = 0; r < p.length; r++) if (p[r][step]) out.push(r);
  return out;
};

// ---------- the transport ----------
// Steps are handed out one at a time a little ahead of when they should sound, each with
// an exact time: the look-ahead scheduler calls nextStep until the next one is beyond its
// horizon. `n` counts every step ever handed out, so changes can be tied to a step.

export function createTransport(bpm = TEMPOS[DEFAULT_TEMPO]) {
  return { playing: false, bpm, step: 0, n: 0, nextTime: 0 };
}

export function startTransport(tr, at) {
  tr.playing = true;
  tr.step = 0;
  tr.nextTime = at;
}

export function stopTransport(tr) {
  tr.playing = false;
}

// The next step if it is due before `until`, or null. Gaps use the tempo current when the
// step before was handed out, so a tempo change lands on a step boundary.
export function nextStep(tr, until) {
  if (!tr.playing || tr.nextTime >= until) return null;
  const s = { n: tr.n, step: tr.step, time: tr.nextTime, bpm: tr.bpm };
  tr.n += 1;
  tr.step = (tr.step + 1) % STEPS;
  tr.nextTime += stepDur(tr.bpm);
  return s;
}

// If the clock jumped ahead (a stall, the app paused), skip the steps that were missed
// rather than playing them all at once. Returns how many were skipped.
export function catchUp(tr, now, late = 0.25) {
  if (!tr.playing || now - tr.nextTime < late) return 0;
  const d = stepDur(tr.bpm);
  const skip = Math.ceil((now - tr.nextTime) / d);
  tr.nextTime += skip * d;
  tr.step = (tr.step + skip) % STEPS;
  tr.n += skip;
  return skip;
}

// Where the playhead is at `now`, given the steps already handed out (oldest first).
// Returns the step index or -1 when nothing has sounded yet.
export function playheadAt(queue, now) {
  let at = -1;
  for (const s of queue) {
    if (s.time <= now) at = s.step;
    else break;
  }
  return at;
}

// Soft quantising for pads: with the beat running, a hit just before a sixteenth waits for
// it (so it lands on the beat); otherwise it plays straight away. `tr.nextTime` is a step
// boundary, so the boundaries are nextTime minus whole steps.
export function quantiseHit(now, tr, maxWait = 0.06) {
  if (!tr.playing) return now;
  const d = stepDur(tr.bpm);
  const wait = Math.min(maxWait, d * 0.4);
  let b = tr.nextTime - Math.floor((tr.nextTime - now) / d) * d;
  if (b < now) b += d;
  return b - now <= wait ? b : now;
}

// How far through the beat (0..1) a time is, for things that bounce on the beat.
export function beatPhase(queue, now) {
  let last = null;
  for (const s of queue) {
    if (s.time <= now) last = s;
    else break;
  }
  if (!last) return null;
  const d = stepDur(last.bpm);
  const into = (last.step % 4) + (now - last.time) / d;
  return { beat: Math.floor(last.step / 4), phase: Math.min(1, into / 4) };
}
