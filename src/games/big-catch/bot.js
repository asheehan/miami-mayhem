// Big Catch bots, for tests and the debug autopilot. Pure: they read a trip and pick where to
// steer. The careful bot dodges on the way down and chases the best fish on the way up; the
// clumsy bot wanders about at random, like a very small child.
import {
  FIELD_W, TURN_MARGIN, HOOK_MIN_X, STEER_MAX, STEER_GAIN, SINK_SPEED,
  DODGE_SCALE, CATCH_PAD, HAZARD_SCALE, SPECIES_BY_ID, UPGRADES,
  createTrip, step, steer, touches, isFull, zapSafe, reelSpeed, priceOf, canBuy, buy, settle, tripOptions, rand,
} from './sim.js';

const LO = -TURN_MARGIN;
const HI = FIELD_W + TURN_MARGIN;

// Where a swimming creature will be after `t` seconds (bouncing off the turn points).
export function predictX(c, t) {
  const span = HI - LO;
  let p = c.x - LO + c.dir * c.speed * t;
  p = ((p % (2 * span)) + 2 * span) % (2 * span);
  return LO + (p <= span ? p : 2 * span - p);
}

// The hook's x after `t` seconds heading for `target`, roughly as moveHook does it.
function hookXAt(hx, target, t) {
  const d = target - hx;
  // exponential approach capped by the top speed
  const capT = Math.abs(d) * STEER_GAIN > STEER_MAX ? (Math.abs(d) - STEER_MAX / STEER_GAIN) / STEER_MAX : 0;
  if (t <= capT) return hx + Math.sign(d) * STEER_MAX * t;
  const left = d - Math.sign(d) * STEER_MAX * capT;
  return target - left * Math.exp(-STEER_GAIN * (t - capT));
}

const CANDIDATES = [];
for (let x = HOOK_MIN_X; x <= FIELD_W - HOOK_MIN_X + 1e-9; x += 1.5) CANDIDATES.push(x);

// How soon heading for `target` runs into one of `things` (Infinity if never within `horizon`).
function firstHit(s, things, target, vy, horizon, scale, pad) {
  const h = s.hook;
  for (let t = 0.05; t <= horizon; t += 0.05) {
    const x = hookXAt(h.x, target, t);
    const y = h.y + vy * t;
    for (const c of things) {
      if (Math.abs(c.y - y) > c.ry + 3) continue;
      const ghost = { x: predictX(c, t), y: c.y, rx: c.rx, ry: c.ry };
      if (touches(ghost, x, y, scale, pad)) return t;
    }
  }
  return Infinity;
}

// Steer to the spot that stays clear of everything below for longest, staying put if it can.
export function dodgeTarget(s) {
  const h = s.hook;
  const horizon = 2.4;
  const things = s.creatures.filter((c) => c.state === 'swim' && c.y > h.y - 4 && c.y < h.y + SINK_SPEED * horizon + 6);
  if (!things.length) return h.x;
  let best = h.x;
  let bestScore = -Infinity;
  for (const x of [h.x, ...CANDIDATES]) {
    const hit = firstHit(s, things, x, SINK_SPEED, horizon, DODGE_SCALE, 0.8);
    const score = Math.min(hit, horizon + 1) * 100 - Math.abs(x - h.x) * 0.5 - Math.abs(x - FIELD_W / 2) * 0.15;
    if (score > bestScore) {
      bestScore = score;
      best = x;
    }
  }
  return best;
}

// Chase the most valuable reachable fish above, without steering into a stinger.
export function catchTarget(s) {
  const h = s.hook;
  const vy = -reelSpeed(s);
  let goal = null;
  let goalScore = 0;
  if (!isFull(s)) {
    for (const c of s.creatures) {
      if (c.state !== 'swim' || c.kind !== 'fish' || c.y > h.y + 1 || c.y < h.y - 50 || s.t < c.fleeUntil) continue;
      const t = (h.y - c.y) / -vy;
      const px = predictX(c, t);
      if (px < HOOK_MIN_X - 3 || px > FIELD_W - HOOK_MIN_X + 3) continue;
      if (Math.abs(px - h.x) > STEER_MAX * t * 0.7 + c.rx + CATCH_PAD) continue;
      const score = SPECIES_BY_ID[c.sp].value / (1 + t * 0.6);
      if (score > goalScore) {
        goalScore = score;
        goal = Math.max(HOOK_MIN_X, Math.min(FIELD_W - HOOK_MIN_X, px));
      }
    }
  }
  const target = goal ?? h.x;
  // keep clear of stingers, blockers and (unless empty-handed) junk
  const nasties = s.creatures.filter((c) => c.state === 'swim' && c.kind !== 'fish' && c.y < h.y + 4 && c.y > h.y - 40
    && !(c.kind === 'zap' && zapSafe(s)));
  if (!nasties.length) return target;
  const horizon = 1.4;
  if (firstHit(s, nasties, target, vy, horizon, HAZARD_SCALE, 0.6) === Infinity) return target;
  let best = target;
  let bestScore = -Infinity;
  for (const x of CANDIDATES) {
    const hit = firstHit(s, nasties, x, vy, horizon, HAZARD_SCALE, 0.6);
    const score = Math.min(hit, horizon + 1) * 100 - Math.abs(x - target) * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = x;
    }
  }
  return best;
}

// The careful bot: one decision per call.
export function carefulTarget(s) {
  if (s.phase === 'drop' || s.phase === 'cast') return dodgeTarget(s);
  if (s.phase === 'reel' || s.phase === 'turn') return catchTarget(s);
  return s.hook.x;
}

// The clumsy bot keeps its own little random state so it doesn't disturb the trip's.
export function clumsyBot(seed) {
  const r = { rng: seed | 0 };
  let next = 0;
  let target = FIELD_W / 2;
  return (s) => {
    if (s.t >= next) {
      target = HOOK_MIN_X + rand(r) * (FIELD_W - 2 * HOOK_MIN_X);
      next = s.t + 0.5 + rand(r) * 1.2;
    }
    return target;
  };
}

// Plays a whole trip with a bot (a function from trip state to a target x), deciding every
// `think` seconds. Returns the finished trip.
export function playTrip(opts, bot = carefulTarget, dt = 1 / 30, think = 0.1) {
  const s = createTrip(opts);
  let wait = 0;
  for (let i = 0; i < 20000 && s.phase !== 'haul' && s.phase !== 'done'; i++) {
    wait -= dt;
    if (wait <= 0) {
      steer(s, bot(s));
      wait = think;
    }
    step(s, dt);
  }
  return s;
}

// Buys the cheapest affordable upgrade until nothing is affordable.
export function shopCheapest(p) {
  for (;;) {
    const options = UPGRADES.filter((k) => canBuy(p, k)).sort((a, b) => priceOf(p, a) - priceOf(p, b));
    if (!options.length) return p;
    p = buy(p, options[0]);
  }
}
