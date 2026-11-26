// Every Beat Booth sound, synthesised with Web Audio (no audio files). Notes are scheduled
// at exact audio-clock times so the beat stays steady. Everything goes through one chain:
//
//   voices -> loop / pad bus -> mute -> filter -> master -> compressor -> speakers
//                                          \-> echo send -> delay (with feedback) -> master
//
// Silent (and never throws) wherever Web Audio is missing or not yet unlocked by a touch.
import { PADS, ROWS, midiHz, padNotes, bassNote } from './music.js';

let ac = null;
let nodes = null; // the fixed chain, made once with the context
let noise = null; // one second of white noise, reused by every noisy sound
let scratch = null; // the running scratch voice while a hand is on the record

const running = () => !!ac && ac.state === 'running';
export const audioRunning = running;
export const audioTime = () => (running() ? ac.currentTime : null);
export const audioState = () => (ac ? ac.state : 'none');

function build() {
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return false;
  ac = new AC();
  const master = ac.createGain();
  master.gain.value = 0.55;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 6;
  comp.ratio.value = 10;
  comp.attack.value = 0.003;
  comp.release.value = 0.2;
  const out = ac.createGain();
  out.gain.value = 0.95;
  master.connect(comp);
  comp.connect(out);
  out.connect(ac.destination);

  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 20000;
  filter.Q.value = 1;
  filter.connect(master);

  // the echo: a dotted-eighth delay that feeds back through a soft low-pass
  const send = ac.createGain();
  send.gain.value = 0;
  const delay = ac.createDelay(2);
  delay.delayTime.value = 0.4;
  const fb = ac.createGain();
  fb.gain.value = 0.45;
  const fbTone = ac.createBiquadFilter();
  fbTone.type = 'lowpass';
  fbTone.frequency.value = 3200;
  filter.connect(send);
  send.connect(delay);
  delay.connect(fbTone);
  fbTone.connect(fb);
  fb.connect(delay);
  fbTone.connect(master);

  // the mute is how sound is stopped at once (anything already scheduled goes silent)
  const mute = ac.createGain();
  mute.connect(filter);
  const loop = ac.createGain(); // the beat grid; dips while a hand holds the record
  loop.connect(mute);
  const pads = ac.createGain();
  pads.connect(mute);

  noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  nodes = { master, filter, send, delay, mute, loop, pads };
  return true;
}

// Call from inside a touch: iOS only lets audio start in a user gesture, and it can leave
// the context 'suspended' or 'interrupted' after a call or a trip to the home screen.
export function unlockAudio() {
  try {
    if (!ac && !build()) return;
    if (ac.state !== 'running' && ac.state !== 'closed') {
      const p = ac.resume();
      if (p && p.catch) p.catch(() => {});
    }
    // a silent blip, which is what older iOS needs to really start
    if (!ac.__unlocked) {
      const b = ac.createBuffer(1, 1, ac.sampleRate);
      const s = ac.createBufferSource();
      s.buffer = b;
      s.connect(ac.destination);
      s.start(0);
      ac.__unlocked = true;
    }
    // undo a hush, a little after now so stale scheduled notes stay silent
    const m = nodes.mute.gain;
    if (m.value < 0.5 || nodes.hushed) {
      const t = ac.currentTime;
      m.cancelScheduledValues(t);
      m.setValueAtTime(0, t);
      m.setValueAtTime(1, t + 0.15);
      nodes.hushed = false;
    }
  } catch {
    // no sound, the game still works
  }
}

// Silence everything now (exit, page hidden) and let the context sleep.
export function hush() {
  if (!ac || !nodes) return;
  try {
    scratchOff();
    const t = ac.currentTime;
    nodes.mute.gain.cancelScheduledValues(t);
    nodes.mute.gain.setValueAtTime(0, t);
    nodes.send.gain.cancelScheduledValues(t);
    nodes.send.gain.setValueAtTime(0, t);
    nodes.filter.frequency.cancelScheduledValues(t);
    nodes.filter.frequency.setValueAtTime(20000, t);
    nodes.loop.gain.cancelScheduledValues(t);
    nodes.loop.gain.setValueAtTime(1, t);
    nodes.hushed = true;
    if (ac.state === 'running') {
      const p = ac.suspend();
      if (p && p.catch) p.catch(() => {});
    }
  } catch {
    // nothing to do
  }
}

// ---------- building blocks ----------

const at = (when) => Math.max(ac.currentTime, when || 0);

function env(g, t, peak, attack, decay) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function finish(src, t, ...chain) {
  src.stop(t);
  src.onended = () => {
    try {
      src.disconnect();
      chain.forEach((n) => n.disconnect());
    } catch {
      // already gone
    }
  };
}

function osc(type, f, t, dur, out, peak, attack = 0.004, slideTo = null, slideDur = dur) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + slideDur);
  env(g, t, peak, attack, dur);
  o.connect(g);
  g.connect(out);
  o.start(t);
  finish(o, t + attack + dur + 0.05, g);
  return o;
}

function hiss(t, dur, out, peak, type, freq, q = 1, attack = 0.002) {
  const s = ac.createBufferSource();
  s.buffer = noise;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  f.Q.value = q;
  const g = ac.createGain();
  env(g, t, peak, attack, dur);
  s.connect(f);
  f.connect(g);
  g.connect(out);
  s.start(t, Math.random() * 0.8);
  finish(s, t + attack + dur + 0.05, f, g);
  return { s, f, g };
}

// ---------- the voices ----------

const VOICES = {
  kick(t, out) {
    osc('sine', 160, t, 0.42, out, 1, 0.003, 42, 0.16);
    hiss(t, 0.012, out, 0.25, 'highpass', 3000);
  },
  snare(t, out) {
    hiss(t, 0.18, out, 0.7, 'highpass', 1300);
    osc('triangle', 200, t, 0.11, out, 0.45, 0.002, 150);
  },
  hat(t, out) {
    hiss(t, 0.05, out, 0.32, 'highpass', 7500);
  },
  clap(t, out) {
    const s = ac.createBufferSource();
    s.buffer = noise;
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1150;
    f.Q.value = 1.4;
    const g = ac.createGain();
    const p = g.gain;
    p.setValueAtTime(0.0001, t);
    for (let i = 0; i < 3; i++) {
      p.setValueAtTime(0.9, t + i * 0.012);
      p.exponentialRampToValueAtTime(0.15, t + i * 0.012 + 0.01);
    }
    p.setValueAtTime(0.8, t + 0.036);
    p.exponentialRampToValueAtTime(0.0001, t + 0.26);
    s.connect(f);
    f.connect(g);
    g.connect(out);
    s.start(t, Math.random() * 0.8);
    finish(s, t + 0.3, f, g);
  },
  tom(t, out) {
    osc('sine', 230, t, 0.34, out, 0.9, 0.003, 115, 0.3);
  },
  bell(t, out) {
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 820;
    f.Q.value = 2.5;
    const g = ac.createGain();
    g.gain.value = 1;
    f.connect(g);
    g.connect(out);
    osc('square', 540, t, 0.28, f, 0.4, 0.002);
    osc('square', 812, t, 0.28, f, 0.4, 0.002).addEventListener('ended', () => {
      try {
        f.disconnect();
        g.disconnect();
      } catch {
        // already gone
      }
    });
  },
  conga(t, out) {
    osc('sine', 380, t, 0.22, out, 0.85, 0.002, 315, 0.04);
    hiss(t, 0.02, out, 0.25, 'bandpass', 2200, 2);
  },
  steel(t, out, notes) {
    const f = midiHz(notes[0]);
    osc('sine', f, t, 0.7, out, 0.55, 0.004);
    osc('sine', f * 2, t, 0.35, out, 0.25, 0.004);
    osc('sine', f * 3.01, t, 0.18, out, 0.1, 0.003);
  },
  bass(t, out, notes) {
    const f = midiHz(notes[0]);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 7;
    lp.frequency.setValueAtTime(1400, t);
    lp.frequency.exponentialRampToValueAtTime(180, t + 0.25);
    const g = ac.createGain();
    g.gain.value = 1;
    lp.connect(g);
    g.connect(out);
    const o = osc('sawtooth', f, t, 0.36, lp, 0.55, 0.005);
    osc('sine', f, t, 0.4, out, 0.5, 0.005);
    o.addEventListener('ended', () => {
      try {
        lp.disconnect();
        g.disconnect();
      } catch {
        // already gone
      }
    });
  },
  stab(t, out, notes) {
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3000, t);
    lp.frequency.exponentialRampToValueAtTime(700, t + 0.3);
    lp.connect(out);
    let last = null;
    for (const n of notes) {
      const f = midiHz(n);
      osc('sawtooth', f * 1.004, t, 0.3, lp, 0.16, 0.006);
      last = osc('sawtooth', f * 0.996, t, 0.3, lp, 0.16, 0.006);
    }
    last.addEventListener('ended', () => {
      try {
        lp.disconnect();
      } catch {
        // already gone
      }
    });
  },
  horn(t, out, notes) {
    const bp = ac.createBiquadFilter();
    bp.type = 'lowpass';
    bp.frequency.value = 2600;
    bp.connect(out);
    let last = null;
    for (const n of notes) {
      const f = midiHz(n);
      for (const d of [0.995, 1, 1.006]) {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f * d, t);
        o.frequency.setValueAtTime(f * d, t + 0.42);
        o.frequency.exponentialRampToValueAtTime(f * d * 0.86, t + 0.6);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.13, t + 0.02);
        g.gain.setValueAtTime(0.13, t + 0.45);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.62);
        o.connect(g);
        g.connect(bp);
        o.start(t);
        finish(o, t + 0.66, g);
        last = o;
      }
    }
    last.addEventListener('ended', () => {
      try {
        bp.disconnect();
      } catch {
        // already gone
      }
    });
  },
  laser(t, out) {
    osc('square', 2200, t, 0.26, out, 0.22, 0.002, 140, 0.26);
    osc('sawtooth', 1500, t, 0.2, out, 0.1, 0.002, 90, 0.2);
  },
  boing(t, out) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    const lfo = ac.createOscillator();
    const depth = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(170, t);
    o.frequency.exponentialRampToValueAtTime(330, t + 0.45);
    lfo.frequency.value = 13;
    depth.gain.setValueAtTime(110, t);
    depth.gain.exponentialRampToValueAtTime(4, t + 0.5);
    lfo.connect(depth);
    depth.connect(o.frequency);
    env(g, t, 0.6, 0.004, 0.55);
    o.connect(g);
    g.connect(out);
    o.start(t);
    lfo.start(t);
    finish(o, t + 0.62, g);
    finish(lfo, t + 0.62, depth);
  },
  scratch(t, out) {
    const { f, g } = hiss(t, 0.32, out, 0.7, 'bandpass', 500, 3, 0.01);
    const p = f.frequency;
    p.setValueAtTime(400, t);
    p.exponentialRampToValueAtTime(2600, t + 0.08);
    p.exponentialRampToValueAtTime(350, t + 0.17);
    p.exponentialRampToValueAtTime(2200, t + 0.26);
    g.gain.setValueAtTime(0.7, t + 0.15);
    g.gain.setValueAtTime(0.05, t + 0.165);
    g.gain.setValueAtTime(0.7, t + 0.18);
    osc('sawtooth', 110, t, 0.3, out, 0.12, 0.01, 330, 0.08);
  },
  robot(t, out, notes) {
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(midiHz(notes[0]) / 2, t);
    o.frequency.setValueAtTime(midiHz(notes[1]) / 2, t + 0.13);
    const f1 = ac.createBiquadFilter();
    f1.type = 'bandpass';
    f1.Q.value = 6;
    f1.frequency.setValueAtTime(850, t);
    f1.frequency.setValueAtTime(380, t + 0.13);
    const f2 = ac.createBiquadFilter();
    f2.type = 'bandpass';
    f2.Q.value = 7;
    f2.frequency.setValueAtTime(2300, t);
    f2.frequency.setValueAtTime(900, t + 0.13);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1.6, t + 0.01);
    g.gain.setValueAtTime(1.6, t + 0.24);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    // a fast wobble on the level makes it sound like a robot
    const am = ac.createGain();
    am.gain.value = 0.6;
    const lfo = ac.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 32;
    const lfoDepth = ac.createGain();
    lfoDepth.gain.value = 0.4;
    lfo.connect(lfoDepth);
    lfoDepth.connect(am.gain);
    o.connect(f1);
    o.connect(f2);
    f1.connect(g);
    f2.connect(g);
    g.connect(am);
    am.connect(out);
    o.start(t);
    lfo.start(t);
    finish(o, t + 0.36, f1, f2, g, am);
    finish(lfo, t + 0.36, lfoDepth);
  },
  whistle(t, out) {
    for (const [s, d] of [[0, 0.11], [0.16, 0.2]]) {
      const o = ac.createOscillator();
      const g = ac.createGain();
      const lfo = ac.createOscillator();
      const depth = ac.createGain();
      o.type = 'sine';
      o.frequency.value = 2640;
      lfo.frequency.value = 26;
      depth.gain.value = 140;
      lfo.connect(depth);
      depth.connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t + s);
      g.gain.exponentialRampToValueAtTime(0.22, t + s + 0.01);
      g.gain.setValueAtTime(0.22, t + s + d - 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + s + d);
      o.connect(g);
      g.connect(out);
      o.start(t + s);
      lfo.start(t + s);
      finish(o, t + s + d + 0.03, g);
      finish(lfo, t + s + d + 0.03, depth);
    }
  },
};

// A pad, now or at an exact audio time.
export function playPad(pad, variant = 0, when = 0) {
  if (!running()) return false;
  try {
    const p = PADS[pad];
    if (!p) return false;
    VOICES[p.id](at(when), nodes.pads, padNotes(pad, variant));
    return true;
  } catch {
    return false;
  }
}

// One step of the beat grid: the rows that are on, at an exact audio time.
export function playStep(rows, step, when) {
  if (!running()) return false;
  try {
    const t = at(when);
    for (const r of rows) {
      const id = ROWS[r];
      if (id === 'bass') VOICES.bass(t, nodes.loop, [bassNote(step)]);
      else VOICES[id](t, nodes.loop, null);
    }
    return true;
  } catch {
    return false;
  }
}

// Echo held (on) or let go; the delay follows the tempo (a dotted eighth).
export function setEcho(on, when = 0, bpm = 104) {
  if (!running()) return;
  try {
    const t = at(when);
    nodes.delay.delayTime.setTargetAtTime(Math.min(1.5, (60 / bpm) * 0.75), t, 0.02);
    nodes.send.gain.setTargetAtTime(on ? 0.6 : 0, t, on ? 0.02 : 0.08);
  } catch {
    // ignore
  }
}

// The filter: 1 is wide open, 0 is deep underwater.
export const filterHz = (v) => 160 * 2 ** (Math.max(0, Math.min(1, v)) * 7);
export function setFilter(v, when = 0) {
  if (!running()) return;
  try {
    const t = at(when);
    nodes.filter.frequency.setTargetAtTime(Math.min(20000, filterHz(v)), t, 0.03);
    nodes.filter.Q.setTargetAtTime(v > 0.97 ? 1 : 6, t, 0.05);
  } catch {
    // ignore
  }
}

// A hand on the record: the scratch voice starts, and the beat dips under it.
export function scratchOn(when = 0) {
  if (!running() || scratch) return;
  try {
    const t = at(when);
    const s = ac.createBufferSource();
    s.buffer = noise;
    s.loop = true;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2.5;
    bp.frequency.value = 800;
    const g = ac.createGain();
    g.gain.value = 0;
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 120;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const og = ac.createGain();
    og.gain.value = 0;
    s.connect(bp);
    bp.connect(g);
    g.connect(nodes.pads);
    o.connect(lp);
    lp.connect(og);
    og.connect(nodes.pads);
    s.start(t);
    o.start(t);
    nodes.loop.gain.setTargetAtTime(0.45, t, 0.03);
    scratch = { s, bp, g, o, lp, og };
  } catch {
    scratch = null;
  }
}

// How fast the record is being pushed: 1 is normal speed, negative is backwards.
export function scratchSpeed(v, when = 0) {
  if (!running() || !scratch) return;
  try {
    const t = at(when);
    const r = Math.min(4, Math.abs(v));
    const loud = r < 0.12 ? 0 : Math.min(0.9, 0.25 + r * 0.3);
    const dir = v < 0 ? 0.72 : 1;
    scratch.bp.frequency.setTargetAtTime((350 + 900 * r) * dir, t, 0.015);
    scratch.g.gain.setTargetAtTime(loud, t, 0.015);
    scratch.o.frequency.setTargetAtTime((70 + 120 * r) * dir, t, 0.015);
    scratch.og.gain.setTargetAtTime(loud * 0.35, t, 0.015);
  } catch {
    // ignore
  }
}

export function scratchOff(when = 0) {
  if (!ac || !scratch) return;
  const s = scratch;
  scratch = null;
  try {
    const t = Math.max(ac.currentTime, when || 0);
    s.g.gain.setTargetAtTime(0, t, 0.02);
    s.og.gain.setTargetAtTime(0, t, 0.02);
    nodes.loop.gain.setTargetAtTime(1, t, 0.05);
    s.s.stop(t + 0.2);
    s.o.stop(t + 0.2);
    s.o.onended = () => {
      try {
        [s.s, s.bp, s.g, s.o, s.lp, s.og].forEach((n) => n.disconnect());
      } catch {
        // already gone
      }
    };
  } catch {
    // ignore
  }
}
