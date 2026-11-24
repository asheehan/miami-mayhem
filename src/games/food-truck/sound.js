// Tiny synthesised kitchen sounds (no audio files): plops, a boing for wrong things, a blender
// whirr and press sizzle while held, dings, coins, "mmm" blips and the gator's noises. Silent
// wherever Web Audio is missing or not yet unlocked by a touch.

let ac = null;
let master = null;
let noiseBuf = null;
let loop = null; // { name, src, gain }

// Call from a touch handler: iOS only lets audio start inside a user gesture.
export function unlockAudio() {
  try {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.22;
      master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
  } catch {
    ac = null;
  }
}

const live = () => ac && ac.state === 'running';

function tone(type, f0, f1, dur, vol = 1, delay = 0) {
  if (!live()) return null;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
  return o;
}

function noise(dur, vol, freq = 2000, q = 0.8, delay = 0) {
  if (!live()) return;
  const t = ac.currentTime + delay;
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

export function play(name) {
  try {
    if (!live()) return;
    if (name === 'pop') tone('sine', 320, 760, 0.1, 0.6);
    else if (name === 'boing') tone('sine', 420, 140, 0.35, 0.7);
    else if (name === 'ding') {
      tone('triangle', 1568, 1568, 0.5, 0.45);
      tone('sine', 2093, 2093, 0.4, 0.2, 0.02);
    } else if (name === 'coin') {
      tone('square', 990, 990, 0.06, 0.22);
      tone('square', 1320, 1320, 0.12, 0.22, 0.06);
    } else if (name === 'mmm') {
      [392, 440, 523].forEach((f, i) => tone('sine', f, f * 1.02, 0.16, 0.45, i * 0.1));
    } else if (name === 'sad') {
      [392, 370, 330].forEach((f, i) => tone('triangle', f, f * 0.97, 0.28, 0.35, i * 0.22));
    } else if (name === 'puff') noise(0.5, 0.6, 500, 0.6);
    else if (name === 'splash') noise(0.25, 0.5, 1600, 1.2);
    else if (name === 'fire') {
      noise(1.0, 0.7, 700, 0.5);
      tone('sawtooth', 200, 80, 0.8, 0.2);
    } else if (name === 'brr') {
      for (let i = 0; i < 6; i++) tone('square', 300 + (i % 2) * 40, 300, 0.07, 0.15, i * 0.08);
    } else if (name === 'burp') tone('sawtooth', 120, 60, 0.6, 0.6);
    else if (name === 'yuck') tone('sawtooth', 300, 120, 0.4, 0.35);
    else if (name === 'tada') [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.22, 0.5, i * 0.11));
    else if (name === 'sparkle') [1319, 1568, 2093].forEach((f, i) => tone('sine', f, f, 0.12, 0.25, i * 0.05));
  } catch {
    // sound is a nice-to-have
  }
}

// A sound that runs while something is held: 'whirr' (blender) or 'sizzle' (press, fryer).
export function setLoop(name) {
  try {
    if ((loop && loop.name === name) || (!loop && !name)) return;
    if (loop) {
      const l = loop;
      loop = null;
      l.gain.gain.setTargetAtTime(0.0001, ac.currentTime, 0.05);
      setTimeout(() => {
        try {
          l.src.stop();
        } catch {
          // already stopped
        }
      }, 300);
    }
    if (!name || !live()) return;
    const g = ac.createGain();
    g.gain.value = 0.0001;
    g.gain.setTargetAtTime(name === 'whirr' ? 0.25 : 0.18, ac.currentTime, 0.05);
    let src;
    if (name === 'whirr') {
      src = ac.createOscillator();
      src.type = 'sawtooth';
      src.frequency.value = 95;
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 900;
      src.connect(f);
      f.connect(g);
    } else {
      src = ac.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      const f = ac.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 3000;
      src.connect(f);
      f.connect(g);
    }
    g.connect(master);
    src.start();
    loop = { name, src, gain: g };
  } catch {
    loop = null;
  }
}
