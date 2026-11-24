// Frame pacing helpers for the shell. No DOM here.

const RATES = [120, 90, 60, 30];

// The display's frame time in ms, judged from the typical gap between frames. Anything not
// close to a usual refresh rate (a game struggling at 45 a second, say) keeps the old value.
export function refreshPeriod(typical, current = 1000 / 60) {
  for (const hz of RATES) {
    const p = 1000 / hz;
    if (Math.abs(typical - p) < p * 0.12) return p;
  }
  return current;
}

// The screen shows frames evenly, but the clock reports each one a little early or late.
// Games that step in fixed slices then run 0 or 2 slices now and then, which shows as a
// stutter. A gap that is nearly a whole number of frames is treated as exactly that.
export function steadyGap(gap, period) {
  const n = Math.round(gap / period);
  if (n >= 1 && n <= 3 && Math.abs(gap - n * period) < period * 0.25) return n * period;
  return gap;
}

// Decides the canvas scale from the typical frame gap, a step at a time. `state` is
// { scale, tried, settled }; returns the scale to use next.
//   - well under 50 frames a second: go a step coarser and note what the gap was
//   - if the coarser step did not help (the device is capped, as iOS is in low power
//     mode), go back and stop watching
export const SLOW_MS = 21;
export function nextScale(state, typical) {
  if (state.settled) return state.scale;
  if (state.tried) {
    const helped = typical <= state.tried.gap * 0.9;
    const back = state.tried.from;
    state.tried = null;
    if (!helped) {
      state.settled = true;
      state.scale = back;
    }
    return state.scale;
  }
  if (typical > SLOW_MS && state.scale > 1) {
    state.tried = { from: state.scale, gap: typical };
    state.scale = Math.max(1, state.scale - 0.5);
  }
  return state.scale;
}
