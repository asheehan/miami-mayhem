// Tiny synthesised sounds (no audio files): a clack per domino that climbs in pitch along the
// chain, a pop for goals, a whirr for gadgets, a sad little "oops" and a win jingle. Silent
// wherever Web Audio is missing or not yet unlocked by a touch.

let ac = null;
let master = null;
let noise = null;
let lastClack = 0;

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
      // a short burst of noise, reused for every clack
      noise = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.05), ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3;
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
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// One domino knocking the next: a woody click, a little higher each step along the chain.
function clack(gen) {
  const now = ac.currentTime;
  if (now - lastClack < 0.025) return; // a branching chain can clack twice at once
  lastClack = now;
  const f = Math.min(2400, 900 * 1.025 ** Math.min(gen, 60));
  const src = ac.createBufferSource();
  src.buffer = noise;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = f * 1.6;
  bp.Q.value = 4;
  const g = ac.createGain();
  g.gain.value = 0.9;
  src.connect(bp);
  bp.connect(g);
  g.connect(master);
  src.start(now);
  tone('triangle', f, f * 0.7, 0.05, 0.35);
}

export function play(name, arg) {
  if (!ready()) return;
  try {
    if (name === 'clack') clack(arg || 0);
    else if (name === 'lay') tone('sine', 1300, 1100, 0.03, 0.12);
    else if (name === 'goal') {
      tone('square', 520, 1040, 0.12, 0.3);
      [784, 988, 1175].forEach((f, i) => tone('triangle', f, f, 0.18, 0.4, 0.08 + i * 0.07));
    } else if (name === 'gadget') tone('sawtooth', 180, 520, 0.4, 0.18);
    else if (name === 'oops') {
      tone('triangle', 520, 360, 0.18, 0.4);
      tone('triangle', 400, 260, 0.3, 0.4, 0.18);
    } else if (name === 'win') {
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.2, 0.5, i * 0.11));
    } else if (name === 'tap') tone('sine', 700, 900, 0.05, 0.2);
  } catch {
    // sound is a nice-to-have
  }
}
