// Coconut Shuffle rules. Pure: no DOM, no drawing. A critter hides under one of a row (or a
// ring) of shells; the shells lift to show it, drop and shuffle; the player taps the shell it
// is under. Everything a round does comes from a seed, and every shell's position at every
// moment comes from the same steps that track the critter, so what is drawn is the truth.
//
// The table is a flat field seen at an angle: x runs left to right, z runs from the back of
// the table (negative) to the front (positive). project() turns a field point into screen px.

// ---------- tuning ----------

export const SHELL_RX = 36; // a shell's footprint on the table: half width ...
export const SHELL_RZ = 24; // ... and half depth (an ellipse)
export const SPACING = { 3: 120, 4: 100, 5: 84 }; // gap between shells in a row
export const RING_RX = 150; // the ring the shells sit on in spin levels
export const RING_RZ = 72;
export const ARC_NEAR = 1.6; // how far (in SHELL_RZ) a swap of neighbours bows out front and back
export const ARC_FAR = 2.7; // ... and a longer swap, so it clears the shells it passes
export const ARC_RING = 1.5;
export const FAKE_ANGLE = 0.36 * Math.PI; // how far a fake-out swap gets before it goes back

export const PERSP = 0.0024; // a shell at z grows by 1 + z * PERSP
export const Z_SQUASH = 0.62; // the table is seen at an angle: depth shows at this much
export const LIFT_H = 64; // field units a fully lifted shell rises

export const ROUNDS = 5; // rounds in a level

// round timeline, seconds
export const SHOW_LIFT = 0.4; // shells rise to show the critter
export const DROP = 0.4; // ... and drop back over it
export const PRE = 0.45; // a breath before the first move
export const POST = 0.3; // and after the last, before taps count
export const DRUM = 0.5; // the tapped shell jiggles (drum roll) ...
export const REVEAL_LIFT = 0.35; // ... then lifts
export const RIGHT_HOLD = 1.7; // the critter dances
export const WRONG_SECOND = 1.0; // after a wrong tap, the right shell lifts this long after the first
export const WRONG_HOLD = 1.9; // and both stay up this long
export const END_DROP = 0.4; // then everything drops for the next round
export const LEAF_IN = 0.45; // the palm leaf swings in this long before its swap ...
export const LEAF_OUT = 0.45; // ... and away after
export const PEEK_TIME = 1.6; // the peek hint wobbles the right shell this long

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const ease = (u) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(u, 0, 1));
const bump = (u, a, b) => (u <= a || u >= b ? 0 : Math.sin((Math.PI * (u - a)) / (b - a)));

// ---------- seeded random ----------

export function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const int = (r, n) => Math.floor(r() * n);
const pick = (r, list) => list[int(r, list.length)];

// ---------- table layout ----------

// Where each slot sits, left to right for a row; for a ring slot 0 is at the front and the
// rest go round anticlockwise as seen from above.
export function slotPositions(n, ring = false) {
  if (ring) {
    return Array.from({ length: n }, (_, j) => {
      const a = ringAngle(n, j);
      return { x: Math.cos(a) * RING_RX, z: Math.sin(a) * RING_RZ };
    });
  }
  const g = SPACING[n] || 340 / (n - 1);
  return Array.from({ length: n }, (_, j) => ({ x: (j - (n - 1) / 2) * g, z: 0 }));
}
export const ringAngle = (n, j) => Math.PI / 2 + (j * TAU) / n;

// Two shells changing places: the one starting at pa goes round one side of an oval, the
// other round the opposite side, always opposite each other through the middle so they can
// never meet. `front` says whether the pa shell takes the front (toward the player) side.
// theta runs 0 -> PI. Returns [pos of the pa shell, pos of the pb shell].
export function pairPos(pa, pb, front, depth, theta) {
  const mx = (pa.x + pb.x) / 2;
  const mz = (pa.z + pb.z) / 2;
  const hx = pa.x - mx;
  const hz = pa.z - mz;
  const len = Math.hypot(hx, hz) || 1;
  let fx = (-hz / len) * depth;
  let fz = (hx / len) * depth;
  if (fz < 0 || (fz === 0 && fx < 0)) {
    fx = -fx;
    fz = -fz;
  }
  if (!front) {
    fx = -fx;
    fz = -fz;
  }
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [
    { x: mx + hx * c + fx * s, z: mz + hz * c + fz * s },
    { x: mx - hx * c - fx * s, z: mz - hz * c - fz * s },
  ];
}

export function arcDepth(a, b, n, ring) {
  if (ring) return ARC_RING * SHELL_RZ;
  return (Math.abs(a - b) === 1 ? ARC_NEAR : ARC_FAR) * SHELL_RZ;
}

// ---------- the shuffle ----------

// spec: { shells, swaps, time, gap?, show?, reach?, doubles?, fakes?, decoy?, ring?, spins?,
//         leaf?, two? }
// swaps counts every shuffling step (single swaps, double swaps and ring spins); fake-outs
// and decoy hops come on top. Returns { n, ring, target, second, ask, steps, orders, decoy }:
// orders[i] is which shell sits in each slot before step i (orders[steps.length] is the end),
// decoys[i] the shell the decoy is under before step i (null before it arrives).
export function generateShuffle(spec, seed) {
  const r = rng(seed);
  const n = spec.shells;
  const ring = !!spec.ring;
  const reach = ring ? 1 : spec.reach ?? (spec.adjacent ? 1 : n - 1);
  const target = int(r, n);
  let second = null;
  let ask = 'main';
  if (spec.two) {
    second = (target + 1 + int(r, n - 1)) % n;
    ask = r() < 0.5 ? 'main' : 'second';
  }

  // the kinds of steps, in order
  const kinds = Array.from({ length: spec.swaps }, () => 'swap');
  const spread = (count, from, filter) => {
    // `count` indices spread through the list, each a little random within its share
    const out = [];
    const len = kinds.length - from;
    for (let k = 0; k < count; k++) {
      const lo = from + Math.floor((k * len) / count);
      const hi = from + Math.floor(((k + 1) * len) / count);
      for (let tries = 0; tries < 20; tries++) {
        const i = lo + int(r, Math.max(1, hi - lo));
        if (filter(i) && !out.includes(i)) {
          out.push(i);
          break;
        }
      }
    }
    return out;
  };
  if (spec.doubles && n >= 4 && !ring) for (const i of spread(spec.doubles, 1, (i) => kinds[i] === 'swap')) kinds[i] = 'double';
  if (ring && spec.spins) for (const i of spread(spec.spins, 0, (i) => kinds[i] === 'swap')) kinds[i] = 'spin';
  let leafAt = -1;
  if (spec.leaf) {
    const mid = Math.floor(kinds.length / 2);
    for (let d = 0; d < kinds.length; d++) {
      const i = mid + (d % 2 ? -(d + 1) / 2 : d / 2);
      if (i >= 1 && i < kinds.length && kinds[i] === 'swap') {
        leafAt = i;
        break;
      }
    }
  }
  const plan = kinds.map((kind, i) => ({ kind, leaf: i === leafAt }));
  // fake-outs go between real steps (never first: the first move is always real)
  for (let k = 0; k < (spec.fakes || 0); k++) {
    const at = 1 + int(r, plan.length - 1);
    plan.splice(at, 0, { kind: 'fake' });
  }
  // the decoy runs in about a third of the way through, and hops on later
  if (spec.decoy) {
    const hops = spec.decoy;
    for (let k = 0; k < hops; k++) {
      const real = plan.filter((p) => p.kind !== 'hop').length;
      let at = Math.round(((k + 1) * real) / (hops + 1));
      // count real steps to find where to put it
      let seen = 0;
      let idx = plan.length;
      for (let i = 0; i < plan.length; i++) {
        if (plan[i].kind === 'hop') continue;
        if (seen === at) {
          idx = i;
          break;
        }
        seen++;
      }
      plan.splice(idx, 0, { kind: 'hop' });
    }
  }

  // now fill in each step, tracking which shell is where
  let order = Array.from({ length: n }, (_, j) => j);
  let decoy = null;
  const orders = [order.slice()];
  const decoys = [decoy];
  const steps = [];
  let lastKey = '';
  const tracked = () => [target, second].filter((s) => s !== null).map((s) => order.indexOf(s));
  const pairsWithin = (filter) => {
    const out = [];
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        const near = ring ? b - a === 1 || (a === 0 && b === n - 1) : b - a <= reach;
        if (near && filter(a, b)) out.push([a, b]);
      }
    }
    return out;
  };
  const choosePair = (must) => {
    let all = pairsWithin((a, b) => (must == null || a === must || b === must) && `${a},${b}` !== lastKey);
    if (!all.length) all = pairsWithin(() => true);
    // most swaps move a shell with something under it, like a real hustler's would
    const hot = tracked();
    const busy = all.filter(([a, b]) => hot.includes(a) || hot.includes(b));
    const list = busy.length && r() < 0.65 ? busy : all;
    return pick(r, list);
  };

  for (const p of plan) {
    let s;
    if (p.kind === 'swap') {
      const [a, b] = choosePair(p.leaf ? Math.floor(n / 2) : null);
      s = { kind: 'swap', pairs: [[a, b, r() < 0.5 ? a : b]] };
      if (p.leaf) s.leaf = true;
      lastKey = `${a},${b}`;
    } else if (p.kind === 'double') {
      const combos = [];
      const ps = pairsWithin(() => true);
      for (const [a, b] of ps) for (const [c, d] of ps) if (b < c) combos.push([[a, b], [c, d]]);
      const hot = tracked();
      const busy = combos.filter((cb) => cb.some(([a, b]) => hot.includes(a) || hot.includes(b)));
      const cb = pick(r, busy.length && r() < 0.75 ? busy : combos);
      s = { kind: 'double', pairs: cb.map(([a, b]) => [a, b, r() < 0.5 ? a : b]) };
      lastKey = '';
    } else if (p.kind === 'spin') {
      s = { kind: 'spin', k: r() < 0.5 ? 1 : -1 };
      lastKey = '';
    } else if (p.kind === 'fake') {
      const [a, b] = choosePair(null);
      s = { kind: 'fake', pairs: [[a, b, r() < 0.5 ? a : b]] };
    } else {
      // decoy hop: from where it is (or in from the side) to a shell with nothing under it
      const from = decoy === null ? -1 : order.indexOf(decoy);
      const busy = new Set(tracked());
      const free = [];
      for (let j = 0; j < n; j++) if (!busy.has(j) && j !== from) free.push(j);
      const to = pick(r, free);
      s = { kind: 'hop', from, to, side: from === -1 ? (r() < 0.5 ? -1 : 1) : 0 };
    }
    order = applyStep(order, s);
    if (s.kind === 'hop') decoy = order[s.to];
    steps.push(s);
    orders.push(order.slice());
    decoys.push(decoy);
  }
  return { n, ring, target, second, ask, steps, orders, decoys };
}

// The slot order after one step.
export function applyStep(order, s) {
  const n = order.length;
  if (s.kind === 'swap' || s.kind === 'double') {
    const o = order.slice();
    for (const [a, b] of s.pairs) [o[a], o[b]] = [o[b], o[a]];
    return o;
  }
  if (s.kind === 'spin') {
    const o = new Array(n);
    for (let j = 0; j < n; j++) o[(((j + s.k) % n) + n) % n] = order[j];
    return o;
  }
  return order.slice(); // fakes and hops leave the shells where they are
}

// Which slot a shell ends in, worked out step by step (the same rules as above).
export function finalSlot(sh, shell) {
  return sh.orders[sh.orders.length - 1].indexOf(shell);
}

// The shell the player should find.
export const answerShell = (sh) => (sh.ask === 'second' ? sh.second : sh.target);

// ---------- timing ----------

export function stepDuration(s, spec) {
  const T = spec.time;
  if (s.kind === 'double') return T * 1.15;
  if (s.kind === 'spin') return T * 1.5 * Math.abs(s.k);
  if (s.kind === 'fake') return T * 0.75;
  if (s.kind === 'hop') return Math.max(0.8, T * 1.4);
  return T;
}

// Start and end of every step (seconds from the start of the shuffle phase) and the length.
export function timeline(sh, spec) {
  const gap = spec.gap ?? spec.time * 0.35;
  const out = [];
  let t = PRE;
  sh.steps.forEach((s, i) => {
    if (s.leaf) t += LEAF_IN;
    const d = stepDuration(s, spec);
    out.push({ i, t0: t, t1: t + d });
    t += d + (s.leaf ? LEAF_OUT : 0);
    if (i < sh.steps.length - 1) t += gap;
  });
  return { steps: out, total: t + POST };
}

// Where every shell is at time t into the shuffle phase, plus the decoy and the leaf.
// shells[id] = { x, z, lift, moving }.
export function shufflePoses(sh, tl, t) {
  const n = sh.n;
  const slots = slotPositions(n, sh.ring);
  let i = -1;
  for (let k = 0; k < tl.steps.length; k++) if (tl.steps[k].t0 <= t) i = k;
  const shells = new Array(n);
  let decoyPose = null;
  let leaf = 0;
  for (const e of tl.steps) {
    const s = sh.steps[e.i];
    if (!s.leaf) continue;
    if (t >= e.t0 - LEAF_IN && t <= e.t1 + LEAF_OUT) {
      leaf = t < e.t0 ? ease((t - (e.t0 - LEAF_IN)) / LEAF_IN) : t > e.t1 ? 1 - ease((t - e.t1) / LEAF_OUT) : 1;
    }
  }
  const rest = (order) => order.forEach((id, j) => (shells[id] = { x: slots[j].x, z: slots[j].z, lift: 0, moving: false }));
  if (i === -1) {
    rest(sh.orders[0]);
    return { shells, decoy: null, leaf };
  }
  const e = tl.steps[i];
  const s = sh.steps[i];
  const decoyShell = t >= e.t1 ? sh.decoys[i + 1] : sh.decoys[i];
  if (t >= e.t1) {
    rest(sh.orders[i + 1]);
  } else {
    const u = (t - e.t0) / (e.t1 - e.t0);
    const order = sh.orders[i];
    rest(order);
    if (s.kind === 'swap' || s.kind === 'double' || s.kind === 'fake') {
      const theta = s.kind === 'fake' ? FAKE_ANGLE * Math.sin(Math.PI * clamp(u, 0, 1)) : Math.PI * ease(u);
      for (const [a, b, front] of s.pairs) {
        const [pa, pb] = pairPos(slots[a], slots[b], front === a, arcDepth(a, b, n, sh.ring), theta);
        shells[order[a]] = { ...pa, lift: 0, moving: true };
        shells[order[b]] = { ...pb, lift: 0, moving: true };
      }
    } else if (s.kind === 'spin') {
      const k = ease(u) * s.k;
      order.forEach((id, j) => {
        const a = ringAngle(n, j + k);
        shells[id] = { x: Math.cos(a) * RING_RX, z: Math.sin(a) * RING_RZ, lift: 0, moving: true };
      });
    } else if (s.kind === 'hop') {
      // the shell it leaves tips up to let it out, the one it goes to tips up to let it in
      if (s.from >= 0) shells[order[s.from]].lift = 0.35 * bump(u, 0, 0.3);
      shells[order[s.to]].lift = 0.35 * bump(u, 0.68, 1);
      const p0 = s.from >= 0 ? slots[s.from] : { x: s.side * 270, z: 40 };
      const p1 = slots[s.to];
      const k = clamp((u - 0.12) / 0.76, 0, 1);
      decoyPose = {
        x: p0.x + (p1.x - p0.x) * ease(k),
        // it scuttles round the front of the shells, never through them
        z: p0.z + (p1.z - p0.z) * ease(k) + Math.sin(Math.PI * k) * (SHELL_RZ * 2.4),
        hop: Math.abs(Math.sin(u * Math.PI * 6)),
        u,
      };
    }
  }
  return { shells, decoy: decoyPose, decoyShell, leaf };
}

// ---------- a game: a level of rounds, or the endless streak ----------

export function starsFor(right, total = ROUNDS) {
  const missed = total - right;
  return missed <= 0 ? 3 : missed === 1 ? 2 : missed === 2 ? 1 : 0;
}

// The endless streak: each right answer turns it up a notch.
export function streakSpec(k) {
  return {
    shells: k < 4 ? 3 : k < 9 ? 4 : 5,
    swaps: Math.min(12, 3 + Math.floor(k * 0.7)),
    time: Math.max(0.34, 1.0 * Math.pow(0.93, k)),
    show: k < 2 ? 1.4 : 1.1,
    doubles: k >= 10 ? 1 + Math.floor((k - 10) / 4) : 0,
    fakes: k >= 14 ? 1 : 0,
  };
}

// opts: { mode: 'level' | 'streak', spec (levels), seed }
export function createGame(opts) {
  const g = {
    mode: opts.mode || 'level',
    spec: opts.spec || null,
    seed: opts.seed >>> 0,
    roundNo: 0,
    total: opts.mode === 'streak' ? Infinity : ROUNDS,
    right: 0,
    results: [],
    streak: 0,
    status: 'play', // 'play' | 'done'
    statusT: 0,
    stars: 0,
    peekUsed: false,
    ignoredAt: -99,
    time: 0,
    events: [],
    round: null,
  };
  startRound(g);
  return g;
}

export function roundSpec(g) {
  return g.mode === 'streak' ? streakSpec(g.streak) : g.spec;
}

function startRound(g) {
  const spec = roundSpec(g);
  const seed = (Math.imul(g.seed ^ 0x9e3779b9, 31) + g.roundNo * 104729 + 7) >>> 0;
  const sh = generateShuffle(spec, seed);
  g.round = {
    spec,
    seed,
    sh,
    tl: timeline(sh, spec),
    phase: 'show', // 'show' | 'shuffle' | 'choose' | 'reveal'
    t: 0,
    showFor: SHOW_LIFT + (spec.show ?? 1.2) + (sh.second !== null ? 0.6 : 0) + DROP,
    choice: null,
    correct: null,
    peekAt: null,
  };
  g.events.push({ type: 'show' });
}

export const revealLength = (correct) => DRUM + (correct ? REVEAL_LIFT + RIGHT_HOLD : WRONG_SECOND + WRONG_HOLD) + END_DROP;

export function step(g, dt) {
  g.time += dt;
  if (g.status === 'done') {
    g.statusT += dt;
    return;
  }
  const R = g.round;
  const before = R.t;
  R.t += dt;
  if (R.phase === 'show' && R.t >= R.showFor) {
    R.phase = 'shuffle';
    R.t -= R.showFor;
    g.events.push({ type: 'go' });
  } else if (R.phase === 'shuffle') {
    for (const e of R.tl.steps) if (before < e.t0 && R.t >= e.t0) g.events.push({ type: 'move', kind: R.sh.steps[e.i].kind });
    if (R.t >= R.tl.total) {
      R.phase = 'choose';
      R.t = 0;
      g.events.push({ type: 'choose' });
    }
  } else if (R.phase === 'reveal') {
    if (before < DRUM && R.t >= DRUM) g.events.push({ type: R.correct ? 'right' : 'nope' });
    if (!R.correct && before < DRUM + WRONG_SECOND && R.t >= DRUM + WRONG_SECOND) g.events.push({ type: 'there' });
    if (R.t >= revealLength(R.correct)) endRound(g);
  }
}

function endRound(g) {
  const R = g.round;
  g.roundNo++;
  if (g.mode === 'streak') {
    if (!R.correct) return finish(g);
    g.streak++;
    return startRound(g);
  }
  if (g.roundNo >= g.total) return finish(g);
  startRound(g);
}

function finish(g) {
  g.status = 'done';
  g.statusT = 0;
  g.stars = g.mode === 'level' ? starsFor(g.right, g.total) : 0;
  g.events.push({ type: 'done', stars: g.stars, streak: g.streak });
}

// A tap on a shell. Only counts while choosing; returns true if it was taken.
export function tapShell(g, shell) {
  const R = g.round;
  if (g.status !== 'play' || R.phase !== 'choose' || shell == null || shell < 0 || shell >= R.sh.n) {
    if (g.status === 'play' && (R.phase === 'shuffle' || R.phase === 'show')) {
      g.ignoredAt = g.time;
      g.events.push({ type: 'ignored' });
    }
    return false;
  }
  R.choice = shell;
  R.correct = shell === answerShell(R.sh);
  if (R.correct) g.right++;
  g.results.push(R.correct);
  R.phase = 'reveal';
  R.t = 0;
  g.events.push({ type: 'drum' });
  return true;
}

// The peek hint: once a level, while choosing, the right shell wobbles.
export function peek(g) {
  const R = g.round;
  if (g.status !== 'play' || R.phase !== 'choose' || g.peekUsed) return false;
  g.peekUsed = true;
  R.peekAt = R.t;
  g.events.push({ type: 'peek' });
  return true;
}
export const canPeek = (g) => g.status === 'play' && g.round.phase === 'choose' && !g.peekUsed;

// Every shell and critter right now: what the drawing needs and the hit test uses.
// shells[id] = { id, x, z, lift, wobble, moving }
// critters: [{ who: 'main' | 'second' | 'decoy', x, z, shell, out (0..1 how far out), mood }]
export function poses(g) {
  const R = g.round;
  const sh = R.sh;
  const n = sh.n;
  const slots = slotPositions(n, sh.ring);
  let shells;
  let decoy = null;
  let decoyShell = null;
  let leaf = 0;
  const lifted = (L) => sh.orders[0].map((id, j) => ({ x: slots[j].x, z: slots[j].z, lift: L, moving: false }));
  if (R.phase === 'show') {
    const up = ease(R.t / SHOW_LIFT);
    const down = ease((R.t - (R.showFor - DROP)) / DROP);
    shells = lifted(Math.min(up, 1 - down));
  } else if (R.phase === 'shuffle') {
    const p = shufflePoses(sh, R.tl, R.t);
    shells = p.shells;
    decoy = p.decoy;
    decoyShell = p.decoyShell ?? null;
    leaf = p.leaf;
  } else {
    const end = sh.orders[sh.orders.length - 1];
    shells = new Array(n);
    end.forEach((id, j) => (shells[id] = { x: slots[j].x, z: slots[j].z, lift: 0, moving: false }));
    decoyShell = sh.decoys[sh.decoys.length - 1];
    if (R.phase === 'reveal') {
      const ans = answerShell(sh);
      const t = R.t;
      const close = 1 - ease((t - (revealLength(R.correct) - END_DROP)) / END_DROP);
      const upAt = (t0) => Math.min(ease((t - t0) / REVEAL_LIFT), close);
      shells[R.choice].lift = upAt(DRUM);
      if (!R.correct) shells[ans].lift = upAt(DRUM + WRONG_SECOND);
    }
  }
  shells.forEach((s, id) => {
    s.id = id;
    s.wobble = 0;
  });
  if (R.phase === 'choose' && R.peekAt !== null) {
    const a = R.t - R.peekAt;
    if (a < PEEK_TIME) shells[answerShell(sh)].wobble = Math.sin(a * 22) * (1 - a / PEEK_TIME);
  }
  if (R.phase === 'reveal' && R.t < DRUM) shells[R.choice].wobble = Math.sin(R.t * 40) * 0.5 * (R.t / DRUM);

  const critters = [];
  const mood = (who) => {
    if (R.phase === 'reveal' && R.correct && answerShell(sh) === (who === 'second' ? sh.second : sh.target)) return 'dance';
    if (R.phase === 'show') return 'wave';
    return 'peek';
  };
  const under = (who, id) => {
    const s = shells[id];
    critters.push({ who, x: s.x, z: s.z, shell: id, out: clamp(s.lift * 2.2, 0, 1), mood: mood(who) });
  };
  under('main', sh.target);
  if (sh.second !== null) under('second', sh.second);
  if (decoy) critters.push({ who: 'decoy', x: decoy.x, z: decoy.z, shell: null, out: 1, mood: 'run', hop: decoy.hop });
  else if (decoyShell !== null && decoyShell !== undefined) under('decoy', decoyShell);
  return { shells, critters, leaf };
}

// ---------- screen geometry ----------

// view: { cx, cy, s } — the table centre on screen and px per field unit.
export function project(view, x, z) {
  const p = 1 + z * PERSP;
  return { X: view.cx + x * view.s * p, Y: view.cy + z * view.s * Z_SQUASH, k: view.s * p };
}

// The shell under a screen point (the front-most if two are), or null. Generous: the whole
// dome and a margin round it count.
export function shellAt(g, view, px, py) {
  const { shells } = poses(g);
  let best = null;
  for (const s of shells) {
    const q = project(view, s.x, s.z);
    const r = SHELL_RX * q.k;
    const top = q.Y - s.lift * LIFT_H * q.k - r * 1.35;
    const inside = px >= q.X - r * 1.2 && px <= q.X + r * 1.2 && py >= top && py <= q.Y + r * 0.55;
    if (inside && (!best || s.z > best.z)) best = s;
  }
  return best ? best.id : null;
}

// ---------- saved progress ----------

export const SKINS = [
  { id: 'coconut', need: 0 },
  { id: 'bucket', need: 6 },
  { id: 'sunhat', need: 15 },
  { id: 'conch', need: 27 },
];
export const CRITTERS = [
  { id: 'crab', need: 0 },
  { id: 'turtle', need: 10 },
  { id: 'starfish', need: 20 },
];

export function parseProgress(raw, count) {
  let v = null;
  try {
    v = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    v = null;
  }
  if (!v || typeof v !== 'object') v = {};
  const list = Array.isArray(v.stars) ? v.stars : [];
  const stars = [];
  for (let i = 0; i < count; i++) {
    const n = list[i];
    stars.push(typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 3 ? n : 0);
  }
  const best = typeof v.best === 'number' && Number.isInteger(v.best) && v.best >= 0 ? v.best : 0;
  const p = { stars, best, skin: 'coconut', critter: 'crab' };
  const total = stars.reduce((a, b) => a + b, 0);
  if (SKINS.some((s) => s.id === v.skin && s.need <= total)) p.skin = v.skin;
  if (CRITTERS.some((c) => c.id === v.critter && c.need <= total)) p.critter = v.critter;
  return p;
}

export const serializeProgress = (p) => JSON.stringify({ stars: p.stars.slice(), best: p.best, skin: p.skin, critter: p.critter });

export const totalStars = (p) => p.stars.reduce((a, b) => a + b, 0);
// A level is open once the one before it (or the level itself) has a star.
export const unlocked = (p, i) => i === 0 || p.stars[i - 1] > 0 || p.stars[i] > 0;
export const STREAK_AFTER = 3; // the streak opens once level 3 is passed
export const streakUnlocked = (p) => p.stars[STREAK_AFTER - 1] > 0 || p.best > 0;
export const isOpen = (list, id, p) => list.some((s) => s.id === id && s.need <= totalStars(p));

// Record a finished game into progress; returns what changed ({ newBest, unlocks }).
export function record(p, g, index) {
  const beforeTotal = totalStars(p);
  const out = { newBest: false, unlocks: [] };
  if (g.mode === 'level') p.stars[index] = Math.max(p.stars[index], g.stars);
  else if (g.streak > p.best) {
    p.best = g.streak;
    out.newBest = true;
  }
  const after = totalStars(p);
  for (const s of [...SKINS, ...CRITTERS]) if (s.need > beforeTotal && s.need <= after) out.unlocks.push(s.id);
  return out;
}
