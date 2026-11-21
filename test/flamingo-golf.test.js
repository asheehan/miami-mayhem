import { describe, it, expect } from 'vitest';
import { HOLES } from '../src/games/flamingo-golf/holes.js';
import {
  createHoleState, shoot, step, simulateShot, wait, starsFor, insidePolygon, inRegion, gatorOpen, flamingoPose,
  STEP, CUP_R, COURSE_W, COURSE_H, SINK_SPEED, SPLASH_TIME, canShoot,
} from '../src/games/flamingo-golf/physics.js';
import { distanceField, planShot } from '../src/games/flamingo-golf/bot.js';

const base = (extra = {}) => ({
  name: 'test',
  par: 3,
  tee: [200, 500],
  cup: [200, 100],
  outline: [[50, 40], [350, 40], [350, 600], [50, 600]],
  walls: [],
  bumpers: [],
  sand: [],
  water: [],
  flamingos: [],
  gator: null,
  ...extra,
});
const UP = -Math.PI / 2;
const settle = (s, max = 30) => {
  for (let i = 0; i < max / STEP && (s.status === 'rolling' || s.status === 'splash'); i++) step(s, STEP);
  return s;
};

describe('hole data', () => {
  it('has nine holes, each fitting the portrait space with tee and cup on the felt', () => {
    expect(HOLES.length).toBe(9);
    for (const h of HOLES) {
      for (const [x, y] of h.outline) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(COURSE_W);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(COURSE_H);
      }
      expect(insidePolygon(h.outline, ...h.tee)).toBe(true);
      expect(insidePolygon(h.outline, ...h.cup)).toBe(true);
      expect(h.water.some((r) => inRegion(r, ...h.tee))).toBe(false);
      expect(h.par).toBeGreaterThanOrEqual(2);
      expect(h.par).toBeLessThanOrEqual(5);
    }
  });

  it('ramps gently: hole 1 is plain, and each element shows up alone before it is combined', () => {
    const kinds = (h) =>
      [h.walls.length || h.outline.length > 4 ? 'walls' : null, h.bumpers.length ? 'bumpers' : null, h.sand.length ? 'sand' : null,
        h.water.length ? 'water' : null, h.flamingos.length ? 'flamingos' : null, h.gator ? 'gator' : null].filter(Boolean);
    expect(kinds(HOLES[0])).toEqual([]);
    const seen = new Set();
    for (const h of HOLES) {
      const fresh = kinds(h).filter((k) => !seen.has(k));
      expect(fresh.length).toBeLessThanOrEqual(1);
      if (fresh.length) expect(kinds(h).filter((k) => k !== 'walls').length).toBeLessThanOrEqual(1);
      for (const k of kinds(h)) seen.add(k);
    }
    expect([...seen].sort()).toEqual(['bumpers', 'flamingos', 'gator', 'sand', 'walls', 'water']);
  });
});

describe('stars', () => {
  it('gives 3 at or under par, 2 for one or two over, 1 otherwise', () => {
    expect(starsFor(1, 3)).toBe(3);
    expect(starsFor(3, 3)).toBe(3);
    expect(starsFor(4, 3)).toBe(2);
    expect(starsFor(5, 3)).toBe(2);
    expect(starsFor(6, 3)).toBe(1);
    expect(starsFor(14, 2)).toBe(1);
  });
});

describe('shots', () => {
  it('counts a stroke, ignores shots while the ball is moving, and stops the ball by friction', () => {
    const s = createHoleState(0, [base({ cup: [300, 80] })]);
    expect(shoot(s, UP, 0.3)).toBe(true);
    expect(s.strokes).toBe(1);
    expect(canShoot(s)).toBe(false);
    expect(shoot(s, UP, 1)).toBe(false);
    expect(s.strokes).toBe(1);
    settle(s);
    expect(s.status).toBe('ready');
    expect(s.ball.y).toBeLessThan(500);
    expect(s.ball.vx).toBe(0);
  });

  it('more power rolls further', () => {
    const s = createHoleState(0, [base({ cup: [60, 60], tee: [200, 590], outline: [[50, -2000], [350, -2000], [350, 600], [50, 600]] })]);
    let lastY = 600;
    for (const p of [0.2, 0.4, 0.6, 0.8, 1]) {
      const r = simulateShot(s, UP, p);
      expect(r.ball.y).toBeLessThan(lastY);
      lastY = r.ball.y;
    }
  });

  it('a gentle putt over the cup drops in', () => {
    const s = createHoleState(0, [base({ tee: [200, 200] })]);
    const r = simulateShot(s, UP, 0.35);
    expect(r.status).toBe('sunk');
  });

  it('a fast ball skips over the cup', () => {
    // no back wall near, so a fast ball has to go past
    const s = createHoleState(0, [base({ tee: [200, 560], cup: [200, 420], outline: [[50, -3000], [350, -3000], [350, 600], [50, 600]] })]);
    shoot(s, UP, 1);
    let speedAtCup = 0;
    for (let i = 0; i < 2000 && s.status === 'rolling'; i++) {
      step(s, STEP);
      if (Math.abs(s.ball.y - 420) < CUP_R) speedAtCup = Math.max(speedAtCup, Math.hypot(s.ball.vx, s.ball.vy));
    }
    expect(speedAtCup).toBeGreaterThan(SINK_SPEED);
    expect(s.status).toBe('ready');
    expect(s.ball.y).toBeLessThan(300);
  });

  it('bounces off walls, including angled ones', () => {
    const s = createHoleState(0, [base({ walls: [[100, 300, 300, 300]] })]);
    const r = simulateShot(s, UP, 0.5);
    expect(r.ball.y).toBeGreaterThan(300);
    // a 45 degree wall turns a ball going up into one going sideways
    const a = createHoleState(0, [base({ tee: [200, 500], walls: [[150, 250, 250, 350]] })]);
    shoot(a, UP, 0.5);
    for (let i = 0; i < 200 && a.ball.y > 320; i++) step(a, STEP);
    for (let i = 0; i < 20; i++) step(a, STEP);
    expect(Math.abs(a.ball.vx)).toBeGreaterThan(Math.abs(a.ball.vy));
    expect(a.ball.vx).toBeLessThan(0);
  });

  it('a bumper kicks the ball back faster than a wall would', () => {
    const wall = createHoleState(0, [base({ walls: [[150, 300, 250, 300]] })]);
    const bump = createHoleState(0, [base({ bumpers: [[200, 290, 10]] })]);
    shoot(wall, UP, 0.4);
    shoot(bump, UP, 0.4);
    let wallBack = 0;
    let bumpBack = 0;
    for (let i = 0; i < 240; i++) {
      step(wall, STEP);
      step(bump, STEP);
      wallBack = Math.max(wallBack, wall.ball.vy);
      bumpBack = Math.max(bumpBack, bump.ball.vy);
    }
    expect(bumpBack).toBeGreaterThan(wallBack * 1.2);
  });
});

describe('hazards', () => {
  it('sand slows the ball a lot', () => {
    const clear = createHoleState(0, [base({ cup: [60, 60] })]);
    const sandy = createHoleState(0, [base({ cup: [60, 60], sand: [{ x: 50, y: 250, w: 300, h: 200 }] })]);
    const a = simulateShot(clear, UP, 0.6);
    const b = simulateShot(sandy, UP, 0.6);
    expect(500 - b.ball.y).toBeLessThan((500 - a.ball.y) * 0.6);
  });

  it('water puts the ball back where the shot started, plus a stroke', () => {
    const s = createHoleState(0, [base({ tee: [200, 520], water: [{ x: 50, y: 250, w: 300, h: 80 }] })]);
    shoot(s, UP, 0.7);
    for (let i = 0; i < 1000 && s.status === 'rolling'; i++) step(s, STEP);
    expect(s.status).toBe('splash');
    expect(s.strokes).toBe(2);
    expect(canShoot(s)).toBe(false);
    step(s, SPLASH_TIME + 0.05);
    expect(s.status).toBe('ready');
    expect(s.ball.x).toBeCloseTo(200);
    expect(s.ball.y).toBeCloseTo(520);
    // a second shot from somewhere else resets to that spot instead
    shoot(s, Math.PI, 0.15);
    settle(s);
    const from = { ...s.ball };
    shoot(s, UP, 0.7);
    settle(s);
    expect(s.ball.x).toBeCloseTo(from.x);
    expect(s.ball.y).toBeCloseTo(from.y);
    expect(s.strokes).toBe(5);
  });

  it('the gator opens and closes on a steady rhythm', () => {
    const g = { dir: Math.PI / 2, period: 3, open: 1.5, phase: 0 };
    expect(gatorOpen(g, 0.5)).toBe(true);
    expect(gatorOpen(g, 2)).toBe(false);
    expect(gatorOpen(g, 3.5)).toBe(true);
    expect(gatorOpen(g, 5)).toBe(false);
  });

  it('the gator blocks the cup while its mouth is closed, and lets a putt in while open', () => {
    const hole = base({ tee: [200, 320], cup: [200, 200], gator: { dir: Math.PI / 2, period: 4, open: 2, phase: 0 } });
    const open = createHoleState(0, [hole]);
    expect(simulateShot(open, UP, 0.45).status).toBe('sunk');
    for (const power of [0.3, 0.45, 0.6, 0.8]) {
      const closed = createHoleState(0, [hole]);
      wait(closed, 2.05); // mouth shuts at 2s and stays shut till 4s
      const r = simulateShot(closed, UP, power, 1.9);
      expect(r.status).not.toBe('sunk');
      expect(r.ball.y).toBeGreaterThan(200 + CUP_R);
    }
  });

  it('a walking flamingo moves back and forth and knocks the ball aside', () => {
    const f = { kind: 'walk', a: [120, 300], b: [280, 300], period: 4, phase: 0 };
    expect(flamingoPose(f, 0).x).toBeCloseTo(120);
    expect(flamingoPose(f, 2).x).toBeCloseTo(280);
    expect(flamingoPose(f, 4).x).toBeCloseTo(120);
    const s = createHoleState(0, [base({ tee: [120, 500], cup: [330, 60], flamingos: [f] })]);
    const r = simulateShot(s, UP, 0.5);
    expect(r.ball.y).toBeGreaterThan(300); // stopped by the legs at the start of its walk
  });

  it('a sweeping flamingo leg swings around its hip', () => {
    const f = { kind: 'sweep', pivot: [60, 300], len: 150, a0: 0, amp: 0.5, period: 4, phase: 0 };
    const p0 = flamingoPose(f, 0);
    const p1 = flamingoPose(f, 1);
    expect(p0.caps[1].x2).toBeCloseTo(210);
    expect(p1.caps[1].y2).toBeGreaterThan(300 + 60);
  });
});

describe('the course', () => {
  HOLES.forEach((hole, i) => {
    it(`hole ${i + 1}: the ball never leaves the felt at full power from any angle`, () => {
      for (const t0 of [0, 1.3]) {
        const s0 = createHoleState(i);
        wait(s0, t0);
        for (let a = 0; a < 72; a++) {
          const s = createHoleState(i);
          s.t = s0.t;
          shoot(s, (a / 72) * Math.PI * 2, 1);
          for (let k = 0; k < 25 / STEP && s.status === 'rolling'; k++) {
            step(s, STEP);
            const { x, y } = s.ball;
            expect(insidePolygon(hole.outline, x, y)).toBe(true);
          }
          expect(s.escapes).toBe(0);
          expect(s.status).not.toBe('rolling');
        }
      }
    });
  });

  // A steady but imperfect bot (see bot.js) plays every hole from the tee.
  const results = [];
  HOLES.forEach((hole, i) => {
    it(`hole ${i + 1} (${hole.name}, par ${hole.par}) can be finished by the bot`, () => {
      const s = createHoleState(i);
      const field = distanceField(hole);
      while (s.status !== 'sunk' && s.strokes < 12) {
        const plan = planShot(s, field);
        wait(s, plan.wait);
        expect(shoot(s, plan.angle, plan.power)).toBe(true);
        settle(s);
      }
      results[i] = s.strokes;
      expect(s.status).toBe('sunk');
      expect(s.strokes).toBeLessThanOrEqual(hole.par + 1);
      if (i === HOLES.length - 1) {
        console.log('bot strokes vs par:', HOLES.map((h, k) => `${k + 1}: ${results[k]}/${h.par}`).join('  '));
      }
    }, 60000);
  });
});
