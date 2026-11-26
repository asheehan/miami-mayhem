// The game clock: the audio clock when sound is running (so the beat and the pictures agree
// with what is heard), the page clock otherwise (no sound yet, or none at all). It never
// jumps or runs backwards when it switches between the two. Pure.

export function createClock() {
  return { t: 0, src: null, off: 0, lastPerf: 0 };
}

// audio: the audio clock in seconds, or null when sound is not running; perf: page seconds.
export function readClock(c, audio, perf) {
  if (audio !== null && audio !== undefined && Number.isFinite(audio)) {
    if (c.src !== 'audio') {
      c.off = c.t - audio;
      c.src = 'audio';
    }
    c.t = Math.max(c.t, audio + c.off);
  } else {
    if (c.src !== 'perf') {
      c.src = 'perf';
      c.lastPerf = perf;
    }
    // a long gap (the page was asleep) only moves the clock a little
    c.t += Math.max(0, Math.min(0.25, perf - c.lastPerf));
    c.lastPerf = perf;
  }
  return c.t;
}

// A game time as an audio-clock time, for scheduling sounds.
export const toAudio = (c, t) => t - c.off;
