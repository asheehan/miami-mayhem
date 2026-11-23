// Cargo Captain rules. Pure: no DOM, no Math.random, no clocks of its own.
// A ship at PortMiami is a balance scale: crates on the LEFT deck and the RIGHT deck, the
// heavier side sinks. The player drags loose crates between the dock and the decks until both
// sides weigh the same; then the ship levels, toots and sails off and the next puzzle arrives.
// Everything is in a fixed 400 x 760 portrait field (y down); the screen scales it to fit.
//
// Actions the UI (and the bot) use: pickAt(s, x, y), moveHeld(s, x, y), dropHeld(s, x, y),
// answer(s, value), and step(s, dt) every frame.

// ---------------------------------------------------------------------------------------------
// Tuning. These are the numbers to change by feel on the iPad.
// ---------------------------------------------------------------------------------------------

export const FIELD_W = 400;
export const FIELD_H = 760;

// Where things are
export const PIVOT_X = 200; // the ship's middle: the point it tilts about
export const DECK_Y = 392; // the deck surface when level
export const WATER_Y = 440; // the sea surface
export const DECK_INNER = 24; // half-width of the bridge tower that splits the two decks
export const COL_W = 80; // each deck has two columns of crates this wide
export const ROW_GAP = 2; // gap between stacked rows of crates
export const DECK_MAX = 6; // a deck holds this many crates (three rows of two); more go back to the dock
export const SHIP_TRAVEL = 560; // how far the ship sails in from the left / off to the right

// Crates
export const CRATE_BASE = 62; // a crate's size (field units) is CRATE_BASE + CRATE_GROW * its number,
export const CRATE_GROW = 1.6; //   so a 1 is 64 and a 10 is 78: bigger numbers look a bit heavier
export const MYSTERY_SIZE_N = 7; // the mystery crate is always drawn as big as a 7, so its size gives nothing away

// Dragging
export const GRAB_PAD = 16; // a finger this far outside a crate still grabs it
export const HOLD_LIFT = 58; // a held crate is drawn this far above the finger (so the finger doesn't hide it)
export const SIDE_DROP_Y = 545; // a held crate (where it is drawn) above this line lands on the deck on that side;
//                                 below it, it goes back to its spot on the dock
export const DOCK_ROW_Y = [700]; // bottom of the dock row when there are up to 5 loose crates
export const DOCK_ROWS_Y = [668, 750]; // bottoms of the two dock rows for 6 or more

// Tilt: the ship springs toward a target angle set by the difference (right minus left).
// Positive angle = right side down.
export const TILT_MIN = 0.07; // radians for a difference of 1 (about 4 degrees, so even 1 shows)
export const TILT_PER_UNIT = 0.028; // extra radians for each further unit of difference
export const MAX_TILT = 0.24; // about 14 degrees: reached at a difference of 7
export const SPRING = 30; // how hard the ship swings toward its target angle
export const DAMP = 4.4; // how quickly the swinging dies away (low = bouncy, about two wobbles)
export const REST_ANGLE = 0.004; // the ship is "at rest" within this of its target...
export const REST_SPEED = 0.02; // ...and turning slower than this (rad/s)
export const CRATE_SLIDE = 26; // deck crates slide this many units per radian of tilt toward the low side
export const PLOP_DIFF = 7; // if the ship comes to rest this lopsided, the crate just dropped on the
//                             low side slides off, plops into the sea and turns up back on the dock

// Puzzle timeline (seconds)
export const ARRIVE_TIME = 1.1; // the ship sailing in
export const LEVEL_TIME = 1.7; // level, green light, horn toots
export const SAIL_TIME = 1.8; // sailing off to the right

// Hints (seconds since the player last touched a crate)
export const HINT_COUNT_DELAY = 12; // the dots count themselves and the difference shows as ghost dots
export const HINT_GLOW_DELAY = 24; // the crate to move glows and a finger shows where it goes
export const HINT_FIRST_DELAY = 4; // on the first two puzzles of the first voyage, show the finger this early

// Stars for a voyage, from its "wrong settles": the ship came to rest unbalanced, with nothing
// held, and compared with the last time it rested the heavy side either swapped or got heavier.
// (Adding to the light side or taking off the heavy side without going past is never wrong.)
// On mystery puzzles trying crates is the point, so only a wrong number tap counts there.
export const STAR3_MAX_WRONG = 2; // 0-2 wrong settles in the voyage: 3 stars
export const STAR2_MAX_WRONG = 5; // 3-5: 2 stars; more: 1 star

const STEP = 1 / 120; // fixed physics step
const EVENTS_KEEP = 24;

// ---------------------------------------------------------------------------------------------

export const crateSize = (n) => CRATE_BASE + CRATE_GROW * n;
const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);

// The angle the ship settles at for a difference d (right minus left).
export function targetTilt(d) {
  if (d === 0) return 0;
  return sign(d) * Math.min(MAX_TILT, TILT_MIN + (Math.abs(d) - 1) * TILT_PER_UNIT);
}

// ---------- weights and the brute-force solver (work on plain crate lists) ----------

export function totalsOf(crates) {
  let left = 0;
  let right = 0;
  for (const c of crates) {
    if (c.place === 'left') left += c.n;
    else if (c.place === 'right') right += c.n;
  }
  return { left, right };
}

// '<' when the right is heavier, '>' when the left is, '=' when level (reads left to right).
export const compare = (left, right) => (left === right ? '=' : left > right ? '>' : '<');

// Every way to put the loose crates on left / right / dock that balances the ship, cheapest
// first (fewest crates moved from where they are). Fixed and mystery crates never move.
// Returns the moves of the cheapest one as [{ id, to }], or null if there is none.
export function solveCrates(crates, { limit = DECK_MAX } = {}) {
  const pool = crates.filter((c) => !c.fixed);
  const base = { left: 0, right: 0, nl: 0, nr: 0 };
  for (const c of crates) {
    if (!c.fixed) continue;
    if (c.place === 'left') (base.left += c.n), base.nl++;
    else if (c.place === 'right') (base.right += c.n), base.nr++;
  }
  const places = ['left', 'right', 'dock'];
  let best = null;
  let bestCost = Infinity;
  const pick = new Array(pool.length);
  const walk = (i, left, right, nl, nr, cost) => {
    if (cost >= bestCost || nl > limit || nr > limit) return;
    if (i === pool.length) {
      if (left === right) {
        bestCost = cost;
        best = pick.slice();
      }
      return;
    }
    const c = pool[i];
    const from = c.place;
    // try the crate's own place first so cheap answers are found early
    const order = [from, ...places.filter((p) => p !== from)];
    for (const p of order) {
      pick[i] = p;
      walk(i + 1, left + (p === 'left' ? c.n : 0), right + (p === 'right' ? c.n : 0),
        nl + (p === 'left'), nr + (p === 'right'), cost + (p === from ? 0 : 1));
    }
  };
  walk(0, base.left, base.right, base.nl, base.nr, 0);
  if (!best) return null;
  const moves = [];
  pool.forEach((c, i) => {
    if (best[i] !== c.place) moves.push({ id: c.id, to: best[i], n: c.n, from: c.place });
  });
  // Moves that make the light side heavier or the heavy side lighter first, biggest first,
  // so carrying them out in order never swings the ship past level.
  const t = totalsOf(crates);
  const d = t.right - t.left;
  const gain = (m) => {
    const delta = (m.to === 'right' ? m.n : 0) - (m.to === 'left' ? m.n : 0)
      - (m.from === 'right' ? m.n : 0) + (m.from === 'left' ? m.n : 0);
    return -sign(d) * delta;
  };
  moves.sort((a, b) => gain(b) - gain(a));
  return moves.map(({ id, to }) => ({ id, to }));
}

// ---------- stars and progress ----------

export function starsFor(wrongs) {
  if (wrongs <= STAR3_MAX_WRONG) return 3;
  if (wrongs <= STAR2_MAX_WRONG) return 2;
  return 1;
}

// Saved progress is { stars: [one 0-3 number per voyage] }. Anything odd reads as 0.
export function parseProgress(raw, count) {
  let v = null;
  try {
    v = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    v = null;
  }
  const list = v && typeof v === 'object' && Array.isArray(v.stars) ? v.stars : [];
  const stars = [];
  for (let i = 0; i < count; i++) {
    const n = list[i];
    stars.push(typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 3 ? n : 0);
  }
  return { stars };
}

export const serializeProgress = (p) => JSON.stringify({ stars: p.stars.slice() });

// A voyage is open once the one before it (or the voyage itself) has a star.
export const unlocked = (progress, i) => i === 0 || progress.stars[i - 1] > 0 || progress.stars[i] > 0;

// ---------- the playing state ----------

// puzzles: the five puzzles of the voyage (from levels.js generateVoyage).
export function createVoyage(voyage, puzzles) {
  const s = {
    voyage,
    puzzles,
    index: 0,
    wrongs: 0,
    stars: 0,
    time: 0,
    acc: 0,
    status: 'arrive', // 'arrive' | 'play' | 'choose' | 'level' | 'sail' | 'done'
    statusT: 0,
    crates: [],
    held: null,
    tilt: 0,
    tiltV: 0,
    idle: 0,
    events: [],
    eventSeq: 0,
  };
  loadPuzzle(s, 0);
  return s;
}

export function loadPuzzle(s, i) {
  const p = s.puzzles[i];
  s.index = i;
  s.puzzle = p;
  s.status = 'arrive';
  s.statusT = 0;
  s.held = null;
  s.idle = 0;
  s.orderSeq = 0;
  s.puzzleWrongs = 0;
  s.lastDropped = null;
  s.dirty = false;
  s.revealed = false;
  s.crates = p.crates.map((c, k) => ({
    id: k + 1,
    n: c.n,
    place: c.place,
    fixed: !!c.fixed || !!c.mystery,
    mystery: !!c.mystery,
    order: k,
    slot: -1,
    byPlayer: false,
  }));
  const loose = s.crates.filter((c) => !c.fixed);
  loose.forEach((c, k) => (c.slot = k));
  s.slots = loose.length;
  s.orderSeq = s.crates.length;
  const d = diffOf(s);
  s.lastRestDiff = d;
  s.tilt = targetTilt(d);
  s.tiltV = 0;
}

export function totals(s) {
  return totalsOf(s.crates);
}

export function diffOf(s) {
  const t = totals(s);
  return t.right - t.left;
}

export const isBalanced = (s) => diffOf(s) === 0;

export function rested(s) {
  return Math.abs(s.tilt - targetTilt(diffOf(s))) < REST_ANGLE && Math.abs(s.tiltV) < REST_SPEED;
}

function emit(s, type, extra = {}) {
  s.events.push({ type, t: s.time, seq: ++s.eventSeq, ...extra });
  if (s.events.length > EVENTS_KEEP) s.events.shift();
}

// ---------- where everything is (field units) ----------

// The ship's pose: where its pivot is and how far it is tilted.
export function shipPose(s) {
  let x = PIVOT_X;
  if (s.status === 'arrive') {
    const k = Math.min(1, s.statusT / ARRIVE_TIME);
    x -= (1 - k) * (1 - k) * (1 - k) * SHIP_TRAVEL;
  } else if (s.status === 'sail' || s.status === 'done') {
    const k = s.status === 'done' ? 1 : Math.min(1, s.statusT / SAIL_TIME);
    x += k * k * SHIP_TRAVEL;
  }
  const y = DECK_Y + Math.sin(s.time * 1.7) * 1.5;
  return { x, y, angle: s.tilt };
}

// Where a crate on a deck sits, before the tilt: relative to the pivot, y up is negative.
function deckSpots(s, side) {
  const dir = side === 'left' ? -1 : 1;
  const list = s.crates
    .filter((c) => c.place === side)
    .sort((a, b) => (a.fixed !== b.fixed ? (a.fixed ? -1 : 1) : a.order - b.order));
  const out = [];
  let base = 0;
  for (let r = 0; r * 2 < list.length; r++) {
    const row = list.slice(r * 2, r * 2 + 2);
    const sizes = row.map(sizeOf);
    const rowH = Math.max(...sizes);
    row.forEach((c, k) => {
      const col = row.length === 1 ? DECK_INNER + COL_W : DECK_INNER + COL_W / 2 + k * COL_W;
      out.push({ c, lx: dir * col, ly: -(base + sizes[k] / 2) });
    });
    base += rowH + ROW_GAP;
  }
  return out;
}

export const sizeOf = (c) => crateSize(c.mystery ? MYSTERY_SIZE_N : c.n);

// Home spot on the dock for loose crate slot k: { x, y } of the crate's centre.
export function dockSpot(s, k, size) {
  const n = s.slots;
  if (n <= 5) {
    const pitch = FIELD_W / Math.max(n, 1);
    return { x: pitch * (k + 0.5), y: DOCK_ROW_Y[0] - size / 2 };
  }
  const back = Math.ceil(n / 2);
  const row = k < back ? 0 : 1;
  const inRow = row === 0 ? back : n - back;
  const kk = row === 0 ? k : k - back;
  const pitch = FIELD_W / inRow;
  return { x: pitch * (kk + 0.5), y: DOCK_ROWS_Y[row] - size / 2 };
}

// Every crate's centre, size and angle in field units. The held crate is where it is drawn
// (above the finger).
export function layout(s) {
  const pose = shipPose(s);
  const cos = Math.cos(pose.angle);
  const sin = Math.sin(pose.angle);
  const slide = pose.angle * CRATE_SLIDE;
  const out = new Map();
  for (const side of ['left', 'right']) {
    for (const { c, lx, ly } of deckSpots(s, side)) {
      const x = lx + slide;
      out.set(c.id, { x: pose.x + x * cos - ly * sin, y: pose.y + x * sin + ly * cos, size: sizeOf(c), angle: pose.angle, place: side });
    }
  }
  for (const c of s.crates) {
    if (c.place === 'dock') {
      const size = sizeOf(c);
      out.set(c.id, { ...dockSpot(s, c.slot, size), size, angle: 0, place: 'dock' });
    } else if (c.place === 'held' && s.held) {
      out.set(c.id, { x: s.held.x, y: s.held.y - HOLD_LIFT, size: sizeOf(c), angle: 0, place: 'held' });
    }
  }
  return out;
}

// Where a crate drawn at (x, y) lands if let go.
export function dropZone(x, y) {
  if (y >= SIDE_DROP_Y) return 'dock';
  return x < PIVOT_X ? 'left' : 'right';
}

// ---------- actions ----------

// A finger went down at (x, y). Picks up the loose crate under it (the nearest one if the
// grab areas overlap) and returns its id, or null. Bolted crates just jiggle.
export function pickAt(s, x, y) {
  if (s.status !== 'play' || s.held) return null;
  const pos = layout(s);
  let best = null;
  let bestD = Infinity;
  let bolted = null;
  for (const c of s.crates) {
    const p = pos.get(c.id);
    if (!p) continue;
    const reach = p.size / 2 + GRAB_PAD;
    if (Math.abs(x - p.x) > reach || Math.abs(y - p.y) > reach) continue;
    const d = Math.hypot(x - p.x, y - p.y);
    if (c.fixed) {
      if (Math.abs(x - p.x) <= p.size / 2 && Math.abs(y - p.y) <= p.size / 2) bolted = c;
      continue;
    }
    if (d < bestD) [bestD, best] = [d, c];
  }
  if (!best) {
    if (bolted) emit(s, 'bolted', { id: bolted.id });
    return null;
  }
  s.held = { id: best.id, from: best.place, x, y };
  best.place = 'held';
  s.idle = 0;
  emit(s, 'lift', { id: best.id, from: s.held.from });
  return best.id;
}

export function moveHeld(s, x, y) {
  if (!s.held) return;
  s.held.x = x;
  s.held.y = y;
}

// The finger let go at (x, y). Returns where the crate went: 'left', 'right' or 'dock'.
export function dropHeld(s, x, y) {
  if (!s.held) return null;
  const c = s.crates.find((k) => k.id === s.held.id);
  let zone = dropZone(x, y - HOLD_LIFT);
  if (zone !== 'dock' && s.crates.filter((k) => k.place === zone).length >= DECK_MAX) zone = 'dock';
  c.place = zone;
  if (zone !== 'dock') {
    c.order = ++s.orderSeq;
    c.byPlayer = true;
    s.lastDropped = c.id;
  }
  const from = s.held.from;
  s.held = null;
  s.idle = 0;
  if (zone !== from) s.dirty = true;
  emit(s, 'drop', { id: c.id, zone, from });
  if (diffOf(s) === 0) {
    s.dirty = false;
    s.status = s.puzzle.mystery ? 'choose' : 'level';
    s.statusT = 0;
    emit(s, s.status === 'choose' ? 'choose' : 'level');
  }
  return zone;
}

// Tapping a number on a mystery puzzle once it balances. Returns true if it was right.
export function answer(s, value) {
  if (s.status !== 'choose') return false;
  if (value === s.puzzle.answer) {
    s.revealed = true;
    s.status = 'level';
    s.statusT = 0;
    emit(s, 'reveal', { value });
    emit(s, 'level');
    return true;
  }
  s.wrongs++;
  s.puzzleWrongs++;
  emit(s, 'wrongChoice', { value });
  return false;
}

// ---------- time ----------

// The ship has come to rest after something moved: was that a wrong settle, and is it so
// lopsided that the last crate dropped on the low side slides off?
function settle(s) {
  s.dirty = false;
  const d = diffOf(s);
  if (d === 0) return;
  const prev = s.lastRestDiff;
  const flipped = prev !== 0 && sign(d) !== sign(prev);
  const heavier = Math.abs(d) > Math.abs(prev);
  if (!s.puzzle.mystery && (flipped || heavier)) {
    s.wrongs++;
    s.puzzleWrongs++;
    emit(s, 'wobble', { diff: d });
  }
  const low = d > 0 ? 'right' : 'left';
  const c = s.crates.find((k) => k.id === s.lastDropped);
  if (Math.abs(d) >= PLOP_DIFF && c && c.place === low && !c.fixed) {
    const pos = layout(s).get(c.id);
    c.place = 'dock';
    s.lastDropped = null;
    emit(s, 'plop', { id: c.id, side: low, x: pos.x, y: pos.y, size: pos.size, angle: pos.angle });
    s.lastRestDiff = diffOf(s);
    return;
  }
  s.lastRestDiff = d;
}

function tick(s, dt) {
  s.time += dt;
  s.statusT += dt;
  const target = s.status === 'sail' || s.status === 'level' || s.status === 'choose' || s.status === 'done' ? 0 : targetTilt(diffOf(s));
  s.tiltV += (SPRING * (target - s.tilt) - DAMP * s.tiltV) * dt;
  s.tilt += s.tiltV * dt;
  if (s.status === 'arrive') {
    if (s.statusT >= ARRIVE_TIME) {
      s.status = 'play';
      s.statusT = 0;
      s.idle = 0;
    }
  } else if (s.status === 'play') {
    if (!s.held) {
      s.idle += dt;
      if (s.dirty && rested(s)) settle(s);
    }
  } else if (s.status === 'level') {
    if (s.statusT >= LEVEL_TIME) {
      s.status = 'sail';
      s.statusT = 0;
      emit(s, 'sail');
    }
  } else if (s.status === 'sail') {
    if (s.statusT >= SAIL_TIME) {
      if (s.index >= s.puzzles.length - 1) {
        s.status = 'done';
        s.statusT = 0;
        s.stars = starsFor(s.wrongs);
        emit(s, 'done');
      } else {
        loadPuzzle(s, s.index + 1);
      }
    }
  }
}

export function step(s, dt) {
  s.acc += Math.min(dt, 0.1);
  while (s.acc >= STEP) {
    s.acc -= STEP;
    tick(s, STEP);
  }
}

// ---------- hints ----------

const solveCache = new WeakMap();
export function solve(s) {
  const key = s.crates.map((c) => c.place).join(',') + (s.held ? `|${s.held.from}` : '');
  const hit = solveCache.get(s);
  if (hit && hit.key === key && hit.puzzle === s.puzzle) return hit.moves;
  // a crate in the hand counts as still being where it was picked up from
  const crates = s.crates.map((c) => (c.place === 'held' ? { ...c, place: s.held.from } : c));
  const moves = solveCrates(crates);
  solveCache.set(s, { key, puzzle: s.puzzle, moves });
  return moves;
}

// What help to show right now: null, or { stage: 1 | 2, diff, light, move }.
// Stage 1: count the dots and show the difference as ghost dots on the light side.
// Stage 2: also make the crate to move glow, with a finger showing where it goes.
export function hint(s) {
  if (s.status !== 'play' || s.held) return null;
  const early = s.voyage === 0 && s.index < 2;
  let stage = 0;
  if (s.idle >= HINT_GLOW_DELAY || (early && s.idle >= HINT_FIRST_DELAY)) stage = 2;
  else if (s.idle >= HINT_COUNT_DELAY) stage = 1;
  if (!stage) return null;
  const d = diffOf(s);
  if (d === 0) return null;
  const moves = solve(s);
  return { stage, diff: Math.abs(d), light: d > 0 ? 'left' : 'right', move: moves && moves.length ? moves[0] : null };
}
