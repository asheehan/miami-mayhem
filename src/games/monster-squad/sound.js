// Little synthesised sounds (Web Audio). The audio context is made on the first touch, and
// nothing happens (and nothing throws) where Web Audio is missing.
let ac = null;

export function wake() {
  if (ac) {
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return;
  }
  try {
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (AC) ac = new AC();
  } catch {
    ac = null;
  }
}

function tone(freq, dur, { type = 'sine', vol = 0.18, slide = 0, delay = 0 } = {}) {
  if (!ac) return;
  try {
    const t0 = ac.currentTime + delay;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g);
    g.connect(ac.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  } catch {
    // sound is optional
  }
}

const SOUNDS = {
  tap: () => tone(660, 0.07, { type: 'triangle', vol: 0.12 }),
  bonk: () => { tone(180, 0.18, { type: 'square', vol: 0.12, slide: 0.5 }); tone(90, 0.12, { vol: 0.2, slide: 0.6 }); },
  blast: () => tone(520, 0.3, { type: 'sawtooth', vol: 0.08, slide: 0.3 }),
  super: () => { tone(700, 0.12, { type: 'square', vol: 0.08 }); tone(1050, 0.18, { type: 'square', vol: 0.08, delay: 0.1 }); },
  bubble: () => { tone(500, 0.15, { slide: 2 }); tone(700, 0.15, { slide: 2, delay: 0.1 }); },
  special: () => { for (let i = 0; i < 5; i++) tone(400 + i * 120, 0.12, { type: 'triangle', vol: 0.12, delay: i * 0.06 }); },
  dizzy: () => tone(800, 0.5, { type: 'sine', vol: 0.12, slide: 0.3 }),
  coin: () => { tone(988, 0.08, { type: 'square', vol: 0.07 }); tone(1319, 0.2, { type: 'square', vol: 0.07, delay: 0.08 }); },
  munch: () => { tone(140, 0.06, { type: 'square', vol: 0.1 }); tone(120, 0.06, { type: 'square', vol: 0.1, delay: 0.1 }); },
  join: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.12, delay: i * 0.1 })),
  win: () => [523, 659, 784, 659, 1047].forEach((f, i) => tone(f, 0.16, { type: 'triangle', vol: 0.12, delay: i * 0.11 })),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.1, delay: i * 0.16 })),
  level: () => [660, 880, 1320].forEach((f, i) => tone(f, 0.14, { type: 'square', vol: 0.07, delay: i * 0.08 })),
  nope: () => tone(160, 0.15, { type: 'square', vol: 0.08 }),
};

export function play(name) {
  if (!ac || !SOUNDS[name]) return;
  SOUNDS[name]();
}
