// Tiny synthesised sounds (no audio files): an engine hum that follows the buggy, a boing,
// a coin blip, a splash, a thud and a little fanfare. Silent wherever Web Audio is missing or
// not yet unlocked by a touch.

let ac = null;
let master = null;
let engine = null; // { osc, sub, filter, gain }

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
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
  return o;
}

// a short burst of filtered noise
function noise(dur, freq, vol) {
  if (!ready()) return;
  const n = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  const g = ac.createGain();
  g.gain.value = vol;
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start();
}

export function play(name) {
  try {
    if (name === 'coin') {
      tone('square', 1046, 1046, 0.05, 0.2);
      tone('square', 1568, 1568, 0.1, 0.2, 0.05);
    } else if (name === 'orange') {
      tone('triangle', 784, 1568, 0.14, 0.4);
    } else if (name === 'boing' || name === 'chomp') {
      const o = tone('sine', name === 'chomp' ? 300 : 520, 140, 0.45, 0.8);
      if (o) {
        const lfo = ac.createOscillator();
        const depth = ac.createGain();
        lfo.frequency.value = 18;
        depth.gain.value = 70;
        lfo.connect(depth);
        depth.connect(o.frequency);
        lfo.start();
        lfo.stop(ac.currentTime + 0.5);
      }
    } else if (name === 'splash') {
      noise(0.35, 1800, 0.6);
    } else if (name === 'thud' || name === 'land') {
      tone('sine', 140, 50, 0.18, 0.7);
    } else if (name === 'bonk') {
      tone('square', 330, 200, 0.08, 0.25);
    } else if (name === 'flip' || name === 'bigair') {
      [659, 784, 988, 1318].forEach((f, i) => tone('square', f, f, 0.09, 0.25, i * 0.07));
    } else if (name === 'finish') {
      [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.22, 0.6, i * 0.12));
    } else if (name === 'buy') {
      [784, 1047, 1318].forEach((f, i) => tone('triangle', f, f, 0.15, 0.5, i * 0.08));
    }
  } catch {
    // sound is a nice-to-have
  }
}

// The engine: a low buzz whose pitch follows speed and rises with the gas. level 0 = silent.
export function setEngine(level, speed = 0, gas = false) {
  try {
    if (!ready()) return;
    if (!engine) {
      const osc = ac.createOscillator();
      const sub = ac.createOscillator();
      const filter = ac.createBiquadFilter();
      const gain = ac.createGain();
      osc.type = 'sawtooth';
      sub.type = 'square';
      filter.type = 'lowpass';
      filter.frequency.value = 500;
      gain.gain.value = 0;
      osc.connect(filter);
      sub.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      osc.start();
      sub.start();
      engine = { osc, sub, filter, gain };
    }
    const t = ac.currentTime;
    const f = 48 + Math.min(30, speed) * 5 + (gas ? 18 : 0);
    engine.osc.frequency.setTargetAtTime(f, t, 0.08);
    engine.sub.frequency.setTargetAtTime(f / 2, t, 0.08);
    engine.filter.frequency.setTargetAtTime(gas ? 900 : 450, t, 0.1);
    engine.gain.gain.setTargetAtTime(level * (gas ? 0.16 : 0.08), t, 0.08);
  } catch {
    // sound is a nice-to-have
  }
}
