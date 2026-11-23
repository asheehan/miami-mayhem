// Tiny synthesised sounds (no audio files): a boing for bumps, a blip for coins, start beeps
// and a finish jingle. Silent wherever Web Audio is missing or not yet unlocked by a touch.

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
      master.gain.value = 0.22;
      master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
  } catch {
    ac = null;
  }
}

function tone(type, f0, f1, dur, vol = 1, delay = 0) {
  if (!ac || ac.state !== 'running') return;
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
    if (name === 'coin') {
      tone('square', 990, 990, 0.06, 0.25);
      tone('square', 1320, 1320, 0.12, 0.25, 0.06);
    } else if (name === 'bump') {
      // a springy boing: a falling note with a fast wobble
      const o = tone('sine', 520, 150, 0.45, 0.9);
      if (o) {
        const lfo = ac.createOscillator();
        const depth = ac.createGain();
        lfo.frequency.value = 22;
        depth.gain.value = 60;
        lfo.connect(depth);
        depth.connect(o.frequency);
        lfo.start();
        lfo.stop(ac.currentTime + 0.5);
      }
    } else if (name === 'boost') {
      tone('sawtooth', 200, 900, 0.35, 0.3);
    } else if (name === 'beep') {
      tone('square', 440, 440, 0.15, 0.3);
    } else if (name === 'go') {
      tone('square', 880, 880, 0.35, 0.35);
    } else if (name === 'finish') {
      [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.22, 0.6, i * 0.12));
    }
  } catch {
    // sound is a nice-to-have
  }
}
