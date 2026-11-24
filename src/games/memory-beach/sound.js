// Tiny synthesised sounds (no audio files): a flip, a match chime, a soft miss, a gull's
// squawk, a wave's whoosh and a win jingle. Silent wherever Web Audio is missing or not yet
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
      master.gain.value = 0.2;
      master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
  } catch {
    ac = null;
  }
}

function tone(type, f0, f1, dur, vol = 1, delay = 0) {
  if (!ac || ac.state !== 'running') return null;
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

export function play(name) {
  try {
    if (name === 'flip') {
      tone('triangle', 700, 1100, 0.07, 0.35);
    } else if (name === 'match') {
      [784, 988, 1319].forEach((f, i) => tone('triangle', f, f, 0.18, 0.5, i * 0.07));
    } else if (name === 'miss') {
      tone('sine', 330, 260, 0.22, 0.3);
    } else if (name === 'gull') {
      tone('sawtooth', 1300, 700, 0.16, 0.18);
      tone('sawtooth', 1250, 650, 0.2, 0.18, 0.2);
    } else if (name === 'wave') {
      tone('sine', 120, 260, 0.6, 0.35);
    } else if (name === 'new') {
      tone('square', 1320, 1320, 0.08, 0.2);
      tone('square', 1760, 1760, 0.14, 0.2, 0.08);
    } else if (name === 'win') {
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.22, 0.55, i * 0.12));
    }
  } catch {
    // sound is a nice-to-have
  }
}
