// Tiny synthesised sounds (no audio files): puppet babble, a pop when a part sticks on, a
// rattle for the dice, page turns and a ta-da. Silent wherever Web Audio is missing or not yet
// unlocked by a touch.

let ac = null;
let master = null;

// Call from a touch handler: iOS only lets audio start inside a user gesture.
export function unlockAudio() {
  try {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.25;
      master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
  } catch {
    ac = null;
  }
}

const ready = () => ac && ac.state === 'running';

function tone(type, f0, f1, dur, vol = 1, delay = 0) {
  if (!ready()) return null;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
  return o;
}

// A burst of puppet gibberish: a few blips that wander up and down like talking, through a
// little 'mouth' filter. voice: 0 (deep, chunky socks) .. 1 (squeaky).
export function babble(voice = 0.5, syllables = 4) {
  try {
    if (!ready()) return;
    const base = 170 + voice * 260;
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2.5;
    filter.connect(master);
    let at = 0;
    for (let i = 0; i < syllables; i++) {
      const dur = 0.07 + Math.random() * 0.09;
      const f = base * (0.8 + Math.random() * 0.6);
      const t = ac.currentTime + at;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = i % 2 ? 'square' : 'sawtooth';
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * (Math.random() < 0.5 ? 1.35 : 0.75), t + dur);
      filter.frequency.setValueAtTime(700 + Math.random() * 900, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.55, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(filter);
      o.start(t);
      o.stop(t + dur + 0.02);
      at += dur + 0.02 + Math.random() * 0.04;
    }
  } catch {
    // sound is a nice-to-have
  }
}

export function play(name) {
  try {
    if (name === 'pop') {
      tone('sine', 380, 900, 0.09, 0.7);
    } else if (name === 'unpop') {
      tone('sine', 700, 200, 0.16, 0.6);
    } else if (name === 'boing') {
      tone('triangle', 300, 600, 0.18, 0.6);
      tone('triangle', 600, 260, 0.2, 0.4, 0.15);
    } else if (name === 'dice') {
      for (let i = 0; i < 6; i++) tone('square', 900 + Math.random() * 700, 600, 0.03, 0.18, i * 0.05);
    } else if (name === 'page') {
      tone('triangle', 900, 300, 0.12, 0.25);
    } else if (name === 'tap') {
      tone('sine', 660, 660, 0.05, 0.3);
    } else if (name === 'tada') {
      [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.24, 0.55, i * 0.1));
    } else if (name === 'curtain') {
      tone('sawtooth', 120, 60, 0.5, 0.15);
    }
  } catch {
    // sound is a nice-to-have
  }
}
