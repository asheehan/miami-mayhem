// Hurricane Riley rules. Pure: no DOM, no Math.random (a seeded generator lives in the state).
// The player is the wind: gust(state, x0, y0, x1, y1, seconds) turns a swipe into a push on
// every loose thing inside a cone that starts at the swipe and points along it.
// Everything is in a fixed 400 x 640 portrait field; the screen scales it to fit.

// ---------------------------------------------------------------------------------------------
// Tuning. These are the numbers to change by feel on the iPad.
// ---------------------------------------------------------------------------------------------

export const FIELD_W = 400;
export const FIELD_H = 640;

// Swipe -> gust
export const GUST_MIN_LEN = 10; // a swipe shorter than this (field units) is a tap, not a gust
export const GUST_FULL_LEN = 220; // swipe length for a full-power gust (about half the field's width)
export const GUST_MIN_POWER = 0.08; // the smallest puff still nudges things a little
export const GUST_SLOW_SPEED = 250; // swipe speed (units/s) at or below which power is scaled by GUST_SLOW_FACTOR
export const GUST_FAST_SPEED = 1100; // swipe speed at or above which power is scaled by GUST_FAST_FACTOR
export const GUST_SLOW_FACTOR = 0.85; // a slow, careful drag is a little gentler
export const GUST_FAST_FACTOR = 1.3; // a quick flick is a little stronger
export const GUST_SPEED = 560; // speed given to a windiness-1 thing in the middle of a full-power gust
export const MAX_SPEED = 720; // nothing ever moves faster than this

// Gust shape: a cone that starts a little behind where the finger went down
export const GUST_BACK = 30; // the cone reaches this far behind the swipe's start
export const GUST_REACH_MIN = 130; // how far the weakest gust reaches along its direction
export const GUST_REACH_MAX = 380; // how far a full-power gust reaches
export const GUST_WIDTH = 36; // half-width of the cone at the swipe's start
export const GUST_SPREAD = 0.32; // the half-width grows by this much per unit along the cone
export const GUST_FADE = 0.55; // push at the far end of the cone is (1 - GUST_FADE) of the push at its start

// Things sliding, gliding and settling. Speed decays by e^(-drag * t), so a thing given speed v
// glides about v / drag units and is nearly still after 1.5 s at drag 2.2.
export const DRAG_SAND = 2.3; // beach balls and ducks on sand
export const DRAG_WATER = 1.7; // the sailboat glides further
export const DRAG_POOL = 5.5; // things in the pool or pond stop quickly
export const STOP_SPEED = 5; // below this, a thing with nothing pushing it stops dead
export const SETTLE_SPEED = 22; // herded things count as "in" once slower than this
export const WIND = { boat: 0.95, ball: 1, duck: 0.9, gull: 1.4 }; // how much each kind catches the wind
export const RADIUS = { boat: 14, ball: 13, duck: 12, gull: 11 };
export const BALL_BOUNCE = 0.8; // herded things bumping each other

// Picnic gulls
export const GULL_STEER = 2.2; // how quickly a gull turns back toward the picnic after a push
export const GULL_SCARE = 70; // a push bigger than this (units/s) scares a gull off for good
export const GULL_FLEE_SPEED = 190; // a scared gull flies away at least this fast
export const MAYHEM_POWER = 0.8; // on windy-snack levels, a gust this strong over the blanket blows a snack away
export const MAYHEM_COOLDOWN = 2; // seconds between blown-away snacks

// Scenery reacting (springs, so they wobble and settle)
export const LEAN_KICK = 1.6; // how hard a gust bends a palm or wobbles an umbrella
export const LEAN_SPRING = 38; // how fast they spring back
export const LEAN_DAMP = 5; // how quickly the wobble dies away
export const UMBRELLA_TOPPLE = 0.75; // gust power (after falloff) that knocks an umbrella over
export const UMBRELLA_DOWN = 3; // seconds before a knocked-over umbrella pops back up

export const SHELL_R = 12; // how close a moving thing must come to a shell to pick it up
export const STEP = 1 / 120; // fixed physics step
const GUST_KEEP = 2; // seconds a gust stays in state.gusts, for drawing its wind

// ---------------------------------------------------------------------------------------------

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hypot = Math.hypot;

function rand(s) {
  s.rng = (s.rng + 0x6d2b79f5) | 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Build the playing state for a level (level data from levels.js).
export function createLevel(level, seed = 1) {
  const s = {
    level,
    job: level.job,
    rng: seed | 0 || 1,
    time: 0, // playing time (stops at a win or a fail)
    now: 0, // always ticking, for drawing
    acc: 0,
    status: 'play', // 'play' | 'won' | 'fail'
    statusT: 0,
    movers: [],
    gulls: [],
    decor: [],
    shells: (level.shells || []).map((p, i) => ({ id: i, x: p[0], y: p[1], got: false, gotT: 0 })),
    gusts: [],
    gustCount: 0,
    nextId: 1,
    events: [], // { type, t, x, y } for drawing: 'shell', 'steal', 'blown', 'bump', 'topple', 'docked', 'in', 'out'
    stars: 0,
  };
  for (const m of level.movers || []) {
    const kind = m[0];
    s.movers.push({
      id: s.nextId++, kind, x: m[1], y: m[2], vx: 0, vy: 0, r: RADIUS[kind], wind: WIND[kind],
      heading: -Math.PI / 2, inPool: false, spin: 0,
    });
  }
  const decorKinds = new Set(['palm', 'umbrella', 'mangrove']);
  const addDecor = (d, solid) => s.decor.push({ kind: d.kind, x: d.x, y: d.y, r: d.r || 20, solid, lx: 0, ly: 0, lvx: 0, lvy: 0, down: 0, downX: 0, downY: 1 });
  for (const c of level.circles || []) if (decorKinds.has(c.kind)) addDecor(c, true);
  for (const d of level.decor || []) addDecor(d, false);
  if (level.job === 'shoo') {
    const sh = level.shoo;
    s.snacks = sh.snacks;
    s.refills = 0;
    s.lastBlow = -99;
    s.schedule = makeSchedule(s, sh);
    s.nextSpawn = 0;
    s.clock = 0; // the picnic clock; starts over if the basket is refilled
  }
  return s;
}

// When and where each gull arrives: evenly spread through the level with a little jitter.
function makeSchedule(s, sh) {
  const out = [];
  const span = Math.max(1, sh.duration - (sh.quietEnd ?? 5) - sh.firstAt);
  for (let i = 0; i < sh.gulls; i++) {
    const t = sh.firstAt + (span * i) / Math.max(1, sh.gulls - 1) + (rand(s) - 0.5) * (span / sh.gulls) * 0.6;
    const side = sh.sides[Math.floor(rand(s) * sh.sides.length)];
    const k = 0.15 + rand(s) * 0.7;
    const fly = rand(s) < (sh.flyers || 0);
    let x;
    let y;
    if (side === 'top') [x, y] = [k * FIELD_W, -16];
    else if (side === 'bottom') [x, y] = [k * FIELD_W, FIELD_H + 16];
    else if (side === 'left') [x, y] = [-16, 80 + k * (FIELD_H - 160)];
    else [x, y] = [FIELD_W + 16, 80 + k * (FIELD_H - 160)];
    out.push({ t: Math.max(0, t), x, y, fly });
  }
  return out.sort((a, b) => a.t - b.t);
}

// ---------------------------------------------------------------------------------------------
// Gusts
// ---------------------------------------------------------------------------------------------

// Turn a swipe into gust numbers. seconds is how long the swipe took (optional).
export function gustShape(x0, y0, x1, y1, seconds) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = hypot(dx, dy);
  if (len < GUST_MIN_LEN) return null;
  let factor = 1;
  if (seconds > 0) {
    const k = clamp((len / seconds - GUST_SLOW_SPEED) / (GUST_FAST_SPEED - GUST_SLOW_SPEED), 0, 1);
    factor = GUST_SLOW_FACTOR + (GUST_FAST_FACTOR - GUST_SLOW_FACTOR) * k;
  }
  const power = clamp((len / GUST_FULL_LEN) * factor, GUST_MIN_POWER, 1);
  return {
    x: x0, y: y0, dx: dx / len, dy: dy / len, len, power,
    reach: GUST_REACH_MIN + (GUST_REACH_MAX - GUST_REACH_MIN) * power,
  };
}

// 0..1: how much of a gust reaches point (px, py). 0 outside the cone.
export function gustFactor(g, px, py) {
  const rx = px - g.x;
  const ry = py - g.y;
  const along = rx * g.dx + ry * g.dy;
  if (along < -GUST_BACK || along > g.reach) return 0;
  const lat = Math.abs(rx * g.dy - ry * g.dx);
  const hw = GUST_WIDTH + Math.max(0, along) * GUST_SPREAD;
  if (lat >= hw) return 0;
  const side = 1 - (lat / hw) ** 2;
  const far = 1 - (GUST_FADE * Math.max(0, along)) / g.reach;
  return side * far;
}

// Blow! Returns the gust (or null for a too-short swipe). Works in any status so the scene
// still reacts after a win; only pushes things while playing.
export function gust(s, x0, y0, x1, y1, seconds) {
  const g = gustShape(x0, y0, x1, y1, seconds);
  if (!g) return null;
  g.t = s.now;
  g.id = ++s.gustCount;
  s.gusts.push(g);
  const playing = s.status === 'play';
  const push = (o, wind) => {
    const k = gustFactor(g, o.x, o.y);
    if (k <= 0) return 0;
    const dv = GUST_SPEED * g.power * k * wind;
    o.vx += g.dx * dv;
    o.vy += g.dy * dv;
    const sp = hypot(o.vx, o.vy);
    if (sp > MAX_SPEED) {
      o.vx *= MAX_SPEED / sp;
      o.vy *= MAX_SPEED / sp;
    }
    return dv;
  };
  if (playing) {
    for (const m of s.movers) if (!m.docked) push(m, m.wind);
    for (const gl of s.gulls) {
      if (gl.state === 'flee') continue;
      const dv = push(gl, WIND.gull);
      if (dv > GULL_SCARE) scare(gl, g.dx, g.dy, dv);
    }
    if (s.job === 'shoo' && s.level.shoo.windySnacks) {
      const p = s.level.shoo.picnic;
      const k = gustFactor(g, p.x, p.y) * g.power;
      if (k > MAYHEM_POWER && s.snacks > 1 && s.time - s.lastBlow > MAYHEM_COOLDOWN) {
        s.snacks--;
        s.lastBlow = s.time;
        s.events.push({ type: 'blown', t: s.time, x: p.x, y: p.y, dx: g.dx, dy: g.dy });
      }
    }
  }
  for (const d of s.decor) {
    const k = gustFactor(g, d.x, d.y);
    if (k <= 0) continue;
    const kick = LEAN_KICK * g.power * k * (d.kind === 'mangrove' ? 0.5 : 1);
    d.lvx += g.dx * kick * 6;
    d.lvy += g.dy * kick * 6;
    if (d.kind === 'umbrella' && g.power * k > UMBRELLA_TOPPLE && d.down <= 0) {
      d.down = UMBRELLA_DOWN;
      d.downX = g.dx;
      d.downY = g.dy;
      s.events.push({ type: 'topple', t: s.time, x: d.x, y: d.y });
    }
  }
  return g;
}

function scare(gl, dx, dy, dv) {
  gl.state = 'flee';
  const sp = Math.max(GULL_FLEE_SPEED, dv);
  gl.vx = dx * sp;
  gl.vy = dy * sp;
}

// ---------------------------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------------------------

export function step(s, dt) {
  s.acc += Math.min(dt, 0.25);
  while (s.acc >= STEP) {
    s.acc -= STEP;
    tick(s, STEP);
  }
}

function tick(s, dt) {
  const L = s.level;
  s.now += dt;
  if (s.status === 'play') {
    s.time += dt;
    if (s.job === 'shoo') s.clock += dt;
  } else s.statusT += dt;
  const playing = s.status === 'play';

  // scenery springs
  for (const d of s.decor) {
    d.lvx += (-d.lx * LEAN_SPRING - d.lvx * LEAN_DAMP) * dt;
    d.lvy += (-d.ly * LEAN_SPRING - d.lvy * LEAN_DAMP) * dt;
    d.lx = clamp(d.lx + d.lvx * dt, -1, 1);
    d.ly = clamp(d.ly + d.lvy * dt, -1, 1);
    if (d.down > 0) d.down = Math.max(0, d.down - dt);
  }

  // movers
  for (const m of s.movers) {
    if (m.docked) {
      const z = L.dock;
      m.x += (z.x + z.w / 2 - m.x) * Math.min(1, dt * 3);
      m.y += (z.y + z.h / 2 - m.y) * Math.min(1, dt * 3);
      m.heading += (-Math.PI / 2 - m.heading) * Math.min(1, dt * 3);
      continue;
    }
    let pushed = false;
    for (const c of L.currents || []) {
      if (m.x >= c.x && m.x <= c.x + c.w && m.y >= c.y && m.y <= c.y + c.h) {
        const drag = m.kind === 'boat' ? DRAG_WATER : DRAG_SAND;
        m.vx += c.vx * drag * dt;
        m.vy += c.vy * drag * dt;
        pushed = true;
      }
    }
    const drag = m.inPool ? DRAG_POOL : m.kind === 'boat' ? DRAG_WATER : DRAG_SAND;
    const f = Math.exp(-drag * dt);
    m.vx *= f;
    m.vy *= f;
    const sp = hypot(m.vx, m.vy);
    if (!pushed && sp < STOP_SPEED) {
      m.vx = 0;
      m.vy = 0;
    }
    moveAndCollide(s, m, dt);
    if (sp > 20 && m.kind === 'boat') {
      const want = Math.atan2(m.vy, m.vx);
      let d = want - m.heading;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      m.heading += d * Math.min(1, dt * 6);
    }
    m.spin += (sp * dt) / m.r;
  }
  if (s.job === 'herd') {
    collideMovers(s);
    poolRim(s);
  }

  // shells
  if (playing) {
    for (const sh of s.shells) {
      if (sh.got) continue;
      for (const m of s.movers) {
        if (hypot(m.x - sh.x, m.y - sh.y) < m.r + SHELL_R) {
          sh.got = true;
          sh.gotT = s.time;
          s.events.push({ type: 'shell', t: s.time, x: sh.x, y: sh.y });
          break;
        }
      }
    }
  }

  if (s.job === 'shoo') tickGulls(s, dt);

  if (playing) checkJob(s);

  // forget old gusts and events
  if (s.gusts.length && (s.now - s.gusts[0].t > GUST_KEEP || s.gusts.length > 24)) s.gusts.shift();
  if (s.events.length > 40) s.events.shift();
}

// Move one thing for dt in small slices so it can't pass through walls.
function moveAndCollide(s, m, dt) {
  const L = s.level;
  const dist = hypot(m.vx, m.vy) * dt;
  const n = Math.max(1, Math.ceil(dist / 3));
  for (let i = 0; i < n; i++) {
    m.x += (m.vx * dt) / n;
    m.y += (m.vy * dt) / n;
    for (const c of L.circles || []) {
      const dx = m.x - c.x;
      const dy = m.y - c.y;
      const d = hypot(dx, dy);
      const min = c.r + m.r;
      if (d < min && d > 1e-6) {
        const nx = dx / d;
        const ny = dy / d;
        m.x = c.x + nx * min;
        m.y = c.y + ny * min;
        bounce(s, m, nx, ny, c);
      }
    }
    for (const w of L.walls || []) {
      const cx = clamp(m.x, w.x, w.x + w.w);
      const cy = clamp(m.y, w.y, w.y + w.h);
      let dx = m.x - cx;
      let dy = m.y - cy;
      let d = hypot(dx, dy);
      if (d >= m.r) continue;
      if (d < 1e-6) {
        // centre inside the wall: push out the nearest side
        const opts = [[m.x - w.x, -1, 0], [w.x + w.w - m.x, 1, 0], [m.y - w.y, 0, -1], [w.y + w.h - m.y, 0, 1]];
        opts.sort((a, b) => a[0] - b[0]);
        dx = opts[0][1];
        dy = opts[0][2];
        d = 1;
        m.x += dx * (opts[0][0] + m.r);
        m.y += dy * (opts[0][0] + m.r);
      } else {
        m.x = cx + (dx / d) * m.r;
        m.y = cy + (dy / d) * m.r;
      }
      bounce(s, m, dx / d, dy / d, w);
    }
    // field edges
    if (m.x < m.r) { m.x = m.r; if (m.vx < 0) m.vx = -m.vx * 0.5; }
    if (m.x > FIELD_W - m.r) { m.x = FIELD_W - m.r; if (m.vx > 0) m.vx = -m.vx * 0.5; }
    if (m.y < m.r) { m.y = m.r; if (m.vy < 0) m.vy = -m.vy * 0.5; }
    if (m.y > FIELD_H - m.r) { m.y = FIELD_H - m.r; if (m.vy > 0) m.vy = -m.vy * 0.5; }
  }
}

function bounce(s, m, nx, ny, o) {
  const vn = m.vx * nx + m.vy * ny;
  if (vn >= 0) return;
  const e = o.bounce ?? 0.5;
  m.vx -= (1 + e) * vn * nx;
  m.vy -= (1 + e) * vn * ny;
  if (o.kick) {
    m.vx += nx * o.kick;
    m.vy += ny * o.kick;
  }
  if (-vn > 60) s.events.push({ type: 'bump', t: s.time, x: m.x - nx * m.r, y: m.y - ny * m.r, kind: o.kind });
}

function collideMovers(s) {
  const ms = s.movers;
  for (let i = 0; i < ms.length; i++) {
    for (let j = i + 1; j < ms.length; j++) {
      const a = ms[i];
      const b = ms[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = hypot(dx, dy);
      const min = a.r + b.r;
      if (d >= min || d < 1e-6) continue;
      const nx = dx / d;
      const ny = dy / d;
      const push = (min - d) / 2;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;
      const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rel >= 0) continue;
      const j2 = (-(1 + BALL_BOUNCE) * rel) / 2;
      a.vx -= j2 * nx;
      a.vy -= j2 * ny;
      b.vx += j2 * nx;
      b.vy += j2 * ny;
    }
  }
}

// The pool's rim keeps slow things in; a hard enough push carries them back out.
function poolRim(s) {
  const p = s.level.pool;
  for (const m of s.movers) {
    const dx = m.x - p.x;
    const dy = m.y - p.y;
    const d = hypot(dx, dy);
    const inner = p.r - m.r;
    if (!m.inPool) {
      if (d < inner) {
        m.inPool = true;
        s.events.push({ type: 'in', t: s.time, x: m.x, y: m.y });
      }
      continue;
    }
    if (d <= inner) continue;
    const nx = dx / d;
    const ny = dy / d;
    const vn = m.vx * nx + m.vy * ny;
    const sp = hypot(m.vx, m.vy);
    if (sp > p.escape && vn > 0) {
      m.inPool = false;
      s.events.push({ type: 'out', t: s.time, x: m.x, y: m.y });
      continue;
    }
    m.x = p.x + nx * inner;
    m.y = p.y + ny * inner;
    if (vn > 0) {
      m.vx -= 1.4 * vn * nx;
      m.vy -= 1.4 * vn * ny;
    }
  }
}

function tickGulls(s, dt) {
  const sh = s.level.shoo;
  const p = sh.picnic;
  const playing = s.status === 'play';
  while (playing && s.nextSpawn < s.schedule.length && s.schedule[s.nextSpawn].t <= s.clock) {
    const e = s.schedule[s.nextSpawn++];
    s.gulls.push({ id: s.nextId++, x: e.x, y: e.y, vx: 0, vy: 0, fly: e.fly, state: e.fly ? 'fly' : 'walk', snack: false, age: 0 });
  }
  for (const g of s.gulls) {
    g.age += dt;
    if (g.state === 'flee') {
      const sp = hypot(g.vx, g.vy) || 1;
      const grow = Math.min(420, sp * (1 + 1.2 * dt) + 60 * dt) / sp;
      g.vx *= grow;
      g.vy *= grow;
    } else {
      const dx = p.x - g.x;
      const dy = p.y - g.y;
      const d = hypot(dx, dy) || 1;
      const speed = g.fly ? sh.flySpeed : sh.walkSpeed;
      const k = Math.min(1, GULL_STEER * dt);
      g.vx += ((dx / d) * speed - g.vx) * k;
      g.vy += ((dy / d) * speed - g.vy) * k;
      if (playing && d < p.r + 2) {
        // snatch!
        s.snacks--;
        s.events.push({ type: 'steal', t: s.time, x: p.x, y: p.y });
        g.snack = true;
        scare(g, -dx / d, -dy / d, GULL_FLEE_SPEED);
        if (s.snacks <= 0) {
          if (s.level.noFail) {
            // nobody loses on the easy levels: the basket is refilled and the clock starts over
            s.snacks = sh.snacks;
            s.refills++;
            s.clock = 0;
            s.nextSpawn = 0;
            s.events.push({ type: 'refill', t: s.time, x: p.x, y: p.y });
          } else {
            s.status = 'fail';
            s.statusT = 0;
          }
        }
      }
    }
    g.x += g.vx * dt;
    g.y += g.vy * dt;
  }
  s.gulls = s.gulls.filter((g) => g.state !== 'flee' || (g.x > -60 && g.x < FIELD_W + 60 && g.y > -60 && g.y < FIELD_H + 60));
}

function checkJob(s) {
  const L = s.level;
  if (s.job === 'sail') {
    const z = L.dock;
    const b = s.movers[0];
    if (b.x >= z.x && b.x <= z.x + z.w && b.y >= z.y && b.y <= z.y + z.h && hypot(b.vx, b.vy) <= (z.maxSpeed ?? Infinity)) {
      b.docked = true;
      b.vx = 0;
      b.vy = 0;
      win(s);
    }
  } else if (s.job === 'herd') {
    if (s.movers.every((m) => m.inPool && hypot(m.vx, m.vy) < SETTLE_SPEED)) win(s);
  } else if (s.job === 'shoo') {
    if (s.clock >= L.shoo.duration && s.snacks > 0) {
      for (const g of s.gulls) if (g.state !== 'flee') scare(g, Math.sign(g.x - L.shoo.picnic.x) || 1, 0, GULL_FLEE_SPEED);
      win(s);
    }
  }
}

function win(s) {
  s.status = 'won';
  s.statusT = 0;
  s.stars = starsFor(s);
  s.events.push({ type: 'won', t: s.time, x: 0, y: 0 });
}

// ---------------------------------------------------------------------------------------------
// Stars and progress helpers
// ---------------------------------------------------------------------------------------------

// Sail and herd: 1 for finishing, +1 for every shell, +1 for beating the level's par time.
// Shoo: 3 for keeping every snack, 2 for keeping at least half, else 1 (1 after a refill).
export function starsFor(s) {
  const L = s.level;
  if (s.job === 'shoo') {
    if (s.refills > 0) return 1;
    if (s.snacks >= L.shoo.snacks) return 3;
    if (s.snacks * 2 >= L.shoo.snacks) return 2;
    return 1;
  }
  const allShells = s.shells.every((x) => x.got);
  return 1 + (allShells ? 1 : 0) + (s.time <= L.par ? 1 : 0);
}

// How many things are home (for the HUD): boat docked, things in the pool, snacks left.
export function progressOf(s) {
  if (s.job === 'sail') return { done: s.movers[0].docked ? 1 : 0, total: 1 };
  if (s.job === 'herd') return { done: s.movers.filter((m) => m.inPool).length, total: s.movers.length };
  return { done: s.snacks, total: s.level.shoo.snacks, time: s.clock, duration: s.level.shoo.duration };
}

// True when nothing is still sliding (the bot waits for this between gusts).
export function settled(s) {
  return s.movers.every((m) => m.docked || hypot(m.vx, m.vy) < STOP_SPEED + 1);
}
