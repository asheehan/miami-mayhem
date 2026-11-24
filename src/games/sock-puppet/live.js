// Keeping a puppet alive on screen: blinking, breathing, talking (the mouth flapping), a
// wobble when it's poked or a part lands, eyes that follow the finger and googly pupils that
// swing. Cosmetic state only; never saved.
import { stepGoogly } from './draw-puppet.js';
import { partDef } from './parts.js';

export function createLive(seed = 1) {
  return {
    t: (seed % 97) * 0.37,
    blink: 0,
    nextBlink: 1.5 + (seed % 5) * 0.4,
    talk: 0, // seconds of talking left
    talkT: 0,
    mouthHold: 0, // a wide-open mouth (surprise), held for this long
    mouth: 0,
    sway: 0,
    swayV: 0,
    bob: 0,
    bobV: 0,
    look: null, // a puppet point, or null
    lookFor: 0,
    googly: new Map(), // part index -> pendulum
    seen: new Map(), // part index -> last { x, y }
  };
}

// Starts the mouth flapping for `secs` seconds.
export function talk(L, secs = 0.9) {
  L.talk = Math.max(L.talk, secs);
}

// A wobble (direction -1..1, strength 0..1).
export function poke(L, dir = 1, strength = 1) {
  L.swayV += dir * 3.2 * strength;
  L.bobV -= 160 * strength;
}

export function lookAt(L, x, y, secs = 2.5) {
  L.look = { x, y };
  L.lookFor = secs;
}

// Moves time on. p is the puppet (for googly eyes); motion { ax, ay } is how hard the whole
// puppet is being flung (screen-ish units/s^2), so googly pupils swing with it.
export function stepLive(L, dt, p, motion = null) {
  L.t += dt;
  // blinks
  L.nextBlink -= dt;
  if (L.nextBlink <= 0) {
    L.blink = 0.16;
    L.nextBlink = 2.2 + ((L.t * 7.3) % 3.1);
  }
  if (L.blink > 0) L.blink = Math.max(0, L.blink - dt);
  // talking: the mouth flaps in syllables
  if (L.talk > 0) {
    L.talk -= dt;
    L.talkT += dt;
    const syl = Math.abs(Math.sin(L.talkT * 13)) * (0.55 + 0.35 * Math.abs(Math.sin(L.talkT * 3.1)));
    L.mouth += (syl - L.mouth) * Math.min(1, dt * 30);
  } else if (L.mouthHold > 0) {
    L.mouthHold -= dt;
    L.mouth += (1 - L.mouth) * Math.min(1, dt * 18);
  } else {
    L.talkT = 0;
    L.mouth += (0 - L.mouth) * Math.min(1, dt * 14);
  }
  // wobble springs
  L.swayV += (-L.sway * 60 - L.swayV * 5) * dt;
  L.sway += L.swayV * dt;
  L.bobV += (-L.bob * 220 - L.bobV * 12) * dt;
  L.bob += L.bobV * dt;
  if (L.lookFor > 0) {
    L.lookFor -= dt;
    if (L.lookFor <= 0) L.look = null;
  }
  // googly pupils
  if (p) {
    const ax0 = (motion?.ax || 0) + L.swayV * 40;
    const ay0 = (motion?.ay || 0) + L.bobV * 2;
    p.parts.forEach((q, i) => {
      if (q.id !== 'googly' && q.id !== 'googly-big') return;
      let st = L.googly.get(i);
      if (!st) {
        st = { x: 0, y: 0.6, vx: 0, vy: 0 };
        L.googly.set(i, st);
      }
      const last = L.seen.get(i);
      let ax = ax0;
      let ay = ay0;
      if (last && dt > 0) {
        const vx = (q.x - last.x) / dt;
        const vy = (q.y - last.y) / dt;
        ax += (vx - (last.vx || 0)) / Math.max(dt, 1 / 60) * 0.02;
        ay += (vy - (last.vy || 0)) / Math.max(dt, 1 / 60) * 0.02;
        L.seen.set(i, { x: q.x, y: q.y, vx, vy });
      } else L.seen.set(i, { x: q.x, y: q.y, vx: 0, vy: 0 });
      // in the part's own frame
      const c = Math.cos(-q.r);
      const s = Math.sin(-q.r);
      const mirror = partDef(q.id)?.pair && q.x < 0 ? -1 : 1;
      stepGoogly(st, Math.min(dt, 1 / 30), ((ax * c - ay * s) * mirror) / 60, (ax * s + ay * c) / 60);
    });
  }
}

// The animation for drawPuppet. extra: { mood, wave, mouth (added), look }
export function liveAnim(L, k, extra = {}) {
  const pupils = new Map();
  for (const [i, st] of L.googly) pupils.set(i, { x: st.x, y: st.y });
  return {
    t: L.t,
    k,
    mouth: Math.min(1.1, L.mouth + (extra.mouth || 0)),
    look: extra.look !== undefined ? extra.look : L.look,
    blink: extra.mood === 'sleep' ? 1 : L.blink > 0 ? Math.sin((L.blink / 0.16) * Math.PI) : 0,
    mood: extra.mood || 'normal',
    wave: extra.wave || 0,
    googly: pupils,
    armTo: extra.armTo,
    skip: extra.skip,
  };
}

// The whole-puppet wobble as a transform about the wrist (where the arm leaves the picture).
export function applyWobble(ctx, L, pivotY, extra = {}) {
  const breathe = Math.sin(L.t * 2.1) * 0.012;
  ctx.translate(0, pivotY);
  ctx.rotate(L.sway * 0.08 + (extra.lean || 0));
  ctx.scale(1 - breathe * 0.5 + (extra.squash || 0) * -0.5, 1 + breathe + (extra.squash || 0));
  ctx.translate(0, -pivotY + L.bob * 0.4 + (extra.bob || 0));
}

// How a story pose moves the puppet at time t: { mouth, mood, wave, lean, bob, look }
export function poseMotion(pose, t) {
  const s = Math.sin;
  switch (pose) {
    case 'wave':
      return { mouth: Math.max(0, s(t * 9)) * 0.35 * (s(t * 1.3) > 0 ? 1 : 0), mood: 'happy', wave: 1, lean: s(t * 2) * 0.05, bob: 0 };
    case 'surprised':
      return { mouth: 0.95, mood: 'surprised', wave: 0, lean: -0.04, bob: -Math.abs(s(t * 4)) * 18 };
    case 'laugh':
      return { mouth: Math.abs(s(t * 11)) * 0.8, mood: 'happy', wave: 0.3, lean: s(t * 16) * 0.035, bob: -Math.abs(s(t * 11)) * 6 };
    case 'worried':
      return { mouth: 0.12 + Math.abs(s(t * 2)) * 0.1, mood: 'worried', wave: 0, lean: s(t * 1.6) * 0.07, bob: 0 };
    case 'cheer':
      return { mouth: 0.7 + s(t * 7) * 0.2, mood: 'happy', wave: 1, lean: s(t * 3) * 0.05, bob: -Math.abs(s(t * 5)) * 30 };
    case 'sleep':
      return { mouth: 0, mood: 'sleep', wave: 0, lean: 0.12 + s(t * 1.2) * 0.02, bob: s(t * 1.2) * 4 };
    case 'dance':
      return { mouth: Math.abs(s(t * 6)) * 0.4, mood: 'happy', wave: 0.7, lean: s(t * 5) * 0.2, bob: -Math.abs(s(t * 10)) * 12 };
    case 'think':
      return { mouth: 0.05, mood: 'normal', wave: 0, lean: 0.08, bob: 0, look: { x: 80, y: -400 } };
    default:
      return { mouth: 0, mood: 'normal', wave: 0, lean: 0, bob: 0 };
  }
}
