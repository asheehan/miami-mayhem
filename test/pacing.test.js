import { describe, it, expect } from 'vitest';
import { refreshPeriod, steadyGap, nextScale } from '../src/pacing.js';

describe('pacing', () => {
  it('recognises the usual refresh rates and ignores in-between ones', () => {
    expect(refreshPeriod(16.9)).toBeCloseTo(1000 / 60);
    expect(refreshPeriod(8.2)).toBeCloseTo(1000 / 120);
    expect(refreshPeriod(33.9)).toBeCloseTo(1000 / 30);
    expect(refreshPeriod(22, 1000 / 60)).toBeCloseTo(1000 / 60);
  });

  it('evens out gaps that are nearly a whole number of frames', () => {
    const p = 1000 / 60;
    expect(steadyGap(15.1, p)).toBeCloseTo(p);
    expect(steadyGap(18.4, p)).toBeCloseTo(p);
    expect(steadyGap(34.5, p)).toBeCloseTo(2 * p);
    expect(steadyGap(25, p)).toBe(25); // half way: left alone
    expect(steadyGap(120, p)).toBe(120); // a long pause: left alone
    expect(steadyGap(2, p)).toBe(2);
  });

  it('jittery 60 Hz gaps always give exactly one 60th', () => {
    const p = 1000 / 60;
    for (const gap of [13, 14.9, 16, 16.7, 17.3, 19, 20.5]) expect(steadyGap(gap, p)).toBeCloseTo(p);
  });

  it('goes a step coarser when slow, and keeps it if that helped', () => {
    const s = { scale: 2, tried: null, settled: false };
    expect(nextScale(s, 16.7)).toBe(2);
    expect(nextScale(s, 28)).toBe(1.5);
    expect(nextScale(s, 17)).toBe(1.5); // helped
    expect(s.settled).toBe(false);
    expect(nextScale(s, 26)).toBe(1); // still slow later: another step
    expect(nextScale(s, 17)).toBe(1);
    expect(nextScale(s, 30)).toBe(1); // nothing lower than 1
  });

  it('undoes the step and stops when the device is simply capped', () => {
    const s = { scale: 2, tried: null, settled: false };
    expect(nextScale(s, 33.3)).toBe(1.5);
    expect(nextScale(s, 33.3)).toBe(2); // no better: back to sharp
    expect(s.settled).toBe(true);
    expect(nextScale(s, 33.3)).toBe(2);
  });
});
