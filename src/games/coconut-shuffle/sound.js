// Tiny synthesised sounds (no audio files): a swish for each slide, a drum roll before the
// reveal, a ta-da, a soft "nope" and a pop. Silent wherever Web Audio is missing or not yet
// unlocked by a touch.

let ac = null;
let master = null;
let noise = null;

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
      noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
  } catch {
    ac = null;
  }
}

const ready = () => ac && ac.state === 'running';

function tone(type, f0, f1, dur, vol = 1, delay = 0) {
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
}

// filtered noise: a swish when the filter sweeps, a drum tap when short and low
function hiss(f0, f1, dur, vol, delay = 0, q = 1.2) {
  const t = ac.currentTime + delay;
  const src = ac.createBufferSource();
  src.buffer = noise;
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

export function play(name, arg = 0) {
  if (!ready()) return;
  try {
    if (name === 'swish') hiss(500, 2400, Math.max(0.18, Math.min(0.5, arg || 0.35)), 0.5);
    else if (name === 'drum') {
      for (let i = 0; i < 9; i++) hiss(180, 120, 0.06, 0.7 + i * 0.05, i * 0.05, 3);
    } else if (name === 'tada') {
      tone('triangle', 523, 523, 0.14, 0.6);
      tone('triangle', 659, 659, 0.14, 0.6, 0.1);
      [523, 659, 784, 1047].forEach((f) => tone('triangle', f, f, 0.55, 0.32, 0.22));
    } else if (name === 'nope') {
      tone('sine', 330, 300, 0.16, 0.5);
      tone('sine', 262, 230, 0.26, 0.5, 0.17);
    } else if (name === 'pop') tone('sine', 300, 900, 0.09, 0.5);
    else if (name === 'thud') tone('sine', 160, 70, 0.14, 0.6);
    else if (name === 'tick') tone('square', 880, 880, 0.04, 0.15);
    else if (name === 'finish') [523, 659, 784, 1047, 1319].forEach((f, i) => tone('triangle', f, f, 0.25, 0.5, i * 0.11));
  } catch {
    // sound is a nice-to-have
  }
}
