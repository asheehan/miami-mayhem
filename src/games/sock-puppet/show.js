// Puppet stage shows. Pure: no DOM. A recording is what the fingers did on the stage (where
// each puppet and prop was dragged, and when a puppet was tapped to talk), never sound. It
// can be played back as a show, and it is small enough to keep the last one per puppet.
//
// Stage units: the stage is STAGE_W x STAGE_H; positions are whole units. Times are in
// hundredths of a second when saved.

export const STAGE_W = 1000;
export const STAGE_H = 700;
export const SHOW_MAX = 30; // seconds
export const EVENTS_MAX = 1800;
export const SAMPLE_GAP = 0.05; // s between kept positions of one thing while it's dragged
export const SHOW_BUDGET = 9000; // characters of JSON a kept show may use

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ix = (x) => Math.round(clamp(x, -200, STAGE_W + 200));
const iy = (y) => Math.round(clamp(y, -200, STAGE_H + 200));

// actors: where every puppet and prop starts, [{ x, y }, ...] (puppets first).
// setup: anything else needed to replay it (backdrop, which props, which puppets).
export function startRecording(actors, setup = {}) {
  return { start: actors.map((a) => [ix(a.x), iy(a.y)]), setup, events: [], last: actors.map(() => -1), t: 0, full: false };
}

// The recorder's clock. Returns false once the show is full (time or events).
export function tickRecording(rec, t) {
  rec.t = Math.max(rec.t, t);
  if (rec.t >= SHOW_MAX || rec.events.length >= EVENTS_MAX) rec.full = true;
  return !rec.full;
}

// Thing `who` is at (x, y) at time t. Kept if it's been SAMPLE_GAP since the last kept one
// (or force, for the end of a drag). Returns true if kept.
export function recordMove(rec, t, who, x, y, force = false) {
  if (!tickRecording(rec, t)) return false;
  if (!force && rec.last[who] >= 0 && t - rec.last[who] < SAMPLE_GAP) return false;
  rec.events.push([Math.round(t * 100), who, ix(x), iy(y)]);
  rec.last[who] = t;
  return true;
}

// Puppet `who` was tapped (talks) at time t.
export function recordTap(rec, t, who) {
  if (!tickRecording(rec, t)) return false;
  rec.events.push([Math.round(t * 100), who]);
  return true;
}

// The finished show: { d: length in hundredths, a: starts, e: events, s: setup }.
export function finishRecording(rec) {
  const d = Math.round(Math.min(SHOW_MAX, Math.max(rec.t, rec.events.length ? rec.events[rec.events.length - 1][0] / 100 : 0)) * 100);
  return { d, a: rec.start.map((p) => p.slice()), e: rec.events.map((e) => e.slice()), s: rec.setup };
}

// Where everything is at time t (seconds) in a show: [{ x, y }, ...]. Between two kept
// positions of a drag it glides; after a gap longer than a drag step it jumps.
export function positionsAt(show, t) {
  const tc = Math.round(t * 1e8) / 1e6;
  const pos = show.a.map(([x, y]) => ({ x, y }));
  const prev = show.a.map(() => null);
  const settled = show.a.map(() => false);
  for (const e of show.e) {
    if (e.length < 4) continue;
    const [et, who, x, y] = e;
    if (!pos[who] || settled[who]) continue;
    if (et <= tc) {
      pos[who] = { x, y };
      prev[who] = e;
      continue;
    }
    // the first kept position after t: glide to it if it's the same drag
    const p = prev[who];
    if (p && et - p[0] <= SAMPLE_GAP * 100 * 3) {
      const u = (tc - p[0]) / (et - p[0]);
      pos[who] = { x: p[2] + (x - p[2]) * u, y: p[3] + (y - p[3]) * u };
    }
    settled[who] = true;
  }
  return pos;
}

// Which puppets were tapped after t0 and up to t1 (seconds).
export function tapsBetween(show, t0, t1) {
  const a = t0 * 100;
  const b = t1 * 100;
  return show.e.filter((e) => e.length === 2 && e[0] > a && e[0] <= b).map((e) => e[1]);
}

// Who is being dragged at time t (has a kept position within a drag step of t).
export function movingAt(show, t) {
  const tc = t * 100;
  const out = new Set();
  for (const e of show.e) if (e.length >= 4 && Math.abs(e[0] - tc) <= SAMPLE_GAP * 100 * 2) out.add(e[1]);
  return out;
}

export const showSize = (show) => JSON.stringify(show).length;

// A show from saved data, or null.
export function decodeShow(raw, actorsMax = 12) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.a) || !Array.isArray(raw.e)) return null;
  if (!Number.isFinite(raw.d) || raw.d < 0 || raw.d > SHOW_MAX * 100 + 50) return null;
  if (raw.a.length < 1 || raw.a.length > actorsMax) return null;
  const okXY = (v) => Number.isFinite(v) && Math.abs(v) < 5000;
  if (!raw.a.every((p) => Array.isArray(p) && okXY(p[0]) && okXY(p[1]))) return null;
  const e = [];
  let lastT = -1;
  for (const ev of raw.e.slice(0, EVENTS_MAX)) {
    if (!Array.isArray(ev) || !Number.isInteger(ev[0]) || ev[0] < lastT || !Number.isInteger(ev[1]) || ev[1] < 0 || ev[1] >= raw.a.length) continue;
    if (ev.length === 2) e.push([ev[0], ev[1]]);
    else if (ev.length >= 4 && okXY(ev[2]) && okXY(ev[3])) e.push([ev[0], ev[1], Math.round(ev[2]), Math.round(ev[3])]);
    else continue;
    lastT = ev[0];
  }
  return { d: Math.round(raw.d), a: raw.a.map((p) => [Math.round(p[0]), Math.round(p[1])]), e, s: raw.s && typeof raw.s === 'object' ? raw.s : {} };
}

// ---------------------------------------------------------------------------------------------
// How a puppet on the stage moves: it leans into the way it's dragged and squashes when it
// stops (cosmetic, but pure so replays look the same).
// ---------------------------------------------------------------------------------------------

export function createBody(x, y) {
  return { x, y, vx: 0, vy: 0, lean: 0, leanV: 0, squash: 0, squashV: 0 };
}

// Moves a body towards (tx, ty) (where the finger or the replay says it is).
export function stepBody(b, tx, ty, dt) {
  if (dt <= 0) return b;
  const nvx = (tx - b.x) / dt;
  const nvy = (ty - b.y) / dt;
  const ax = (nvx - b.vx) / Math.max(dt, 1 / 120);
  b.vx = nvx;
  b.vy = nvy;
  b.x = tx;
  b.y = ty;
  // lean towards the motion; springs back
  const want = clamp(b.vx * 0.0011, -0.45, 0.45);
  b.leanV += ((want - b.lean) * 90 - b.leanV * 9) * dt;
  b.lean = clamp(b.lean + b.leanV * dt, -0.6, 0.6);
  // squash on sudden stops and drops, stretch when flung up
  const kick = clamp(-ax * 0.00002, -0.08, 0.08) + clamp(b.vy * 0.00025, -0.12, 0.12);
  b.squashV += ((kick - b.squash) * 160 - b.squashV * 11) * dt;
  b.squash = clamp(b.squash + b.squashV * dt, -0.25, 0.25);
  return b;
}
