// Rooftop Runaway: one run of a level. Pure: no DOM, no three.js.
//
// The player steers the leader; everyone else in the crowd follows the leader's trail (so they
// climb the same ladders and take the same slides, one after another). Friends waiting around
// the map join when the crowd runs past. Robbers chase whoever is on the street, pop one into
// their sack and run off with them to a hideout; the leader can bump a robber carrying someone
// to set them free. Robbers can't climb, so going up a building shakes them off.
import {
  STREET, CELL, buildLevel, heightOf, linkPos, losClear, confine, collideStreet, segDist, insideRect,
  bfsField, fieldAt, descend, FIELD_INF,
} from './world.js';

export const LEADER_SPEED = 3.6;
export const FOLLOW_SPEED = 4.6;
export const JOIN_DIST = 1.7;
export const CATCH_DIST = 0.7;
export const RESCUE_DIST = 1.1;
export const SPACING = 0.62; // people in the crowd keep about this far apart
export const TRAIL_STEP = 0.4;
export const GRAB_TIME = 0.5; // the robber stops for the bonk before running off
export const DROP_TIME = 1.2;
export const DIZZY_TIME = 2.6;
export const CONFUSED_TIME = 1.4;
export const CARRY_SLOW = 0.8; // a robber with a full sack is slower
export const FIELD_EVERY = 0.15;
export const WIN_DELAY = 1.6; // seconds of cheering before the win screen
export const LOSE_DELAY = 1.2;
export const LOW = 0.7; // someone on a ladder lower than this can still be grabbed

export const inCrowd = (p) => p.state === 'crowd' || p.state === 'link';

// Stars for how many were saved out of the level's total: one for getting anyone out,
// two for three in five, three for nearly everyone (85%).
export function starsFor(saved, total) {
  if (saved <= 0) return 0;
  return 1 + (saved >= Math.ceil(total * 0.6) ? 1 : 0) + (saved >= Math.ceil(total * 0.85) ? 1 : 0);
}
export const starTargets = (total) => [1, Math.ceil(total * 0.6), Math.ceil(total * 0.85)];

export function createRun(levelOrDef, index = 0) {
  const level = levelOrDef.links ? levelOrDef : buildLevel(levelOrDef, index);
  const people = [];
  // the starting crowd in a little bunch round the start
  for (let i = 0; i < level.crowd; i++) {
    const a = i * 2.4;
    const r = i === 0 ? 0 : 0.45 * Math.sqrt(i);
    const p = person(people.length, level.start.x + Math.cos(a) * r, level.start.y - Math.abs(Math.sin(a)) * r, STREET, 'crowd');
    confine(level, p);
    people.push(p);
  }
  for (const f of level.friends) people.push(person(people.length, f.x, f.y, f.layer, 'wait', heightOf(level, f.layer)));
  const robbers = level.robbers.map((r, i) => ({
    id: i, x: r.x, y: r.y, home: { x: r.x, y: r.y }, state: r.wait ? 'wait' : 'chase', t: 0, captive: -1,
    face: Math.PI, speed: 0, sight: r.wait ? level.sight : Math.max(level.sight, 60),
  }));
  return {
    level,
    time: 0,
    status: 'play', // 'play' | 'won' | 'lost'
    endTime: 0,
    people,
    leader: 0,
    trail: [{ x: people[0].x, y: people[0].y, layer: STREET }],
    linkPoints: [], // trail indices where the leader took a link
    linkLast: new Float64Array(level.links.length).fill(-99),
    robbers,
    input: { x: 0, y: 0 },
    field: new Int32Array(level.cols * level.rows).fill(FIELD_INF),
    fieldT: 0,
    events: [],
    saved: 0,
    stars: 0,
    joined: 0,
    caught: 0,
    rescued: 0,
    lost: 0,
    moved: false, // has the player steered yet
  };
}

function person(id, x, y, layer, state, h = 0) {
  return { id, x, y, layer, h, state, cursor: 0, link: null, speed: 0, face: 0, robber: -1, t: 0 };
}

export const crowdCount = (run) => {
  let n = 0;
  for (const p of run.people) if (inCrowd(p)) n++;
  return n;
};
export const leaderOf = (run) => (run.leader >= 0 ? run.people[run.leader] : null);

// The player's steer: a direction (x east, y north) of length 0..1.
export function setInput(run, x, y) {
  const m = Math.hypot(x, y);
  if (m > 1) {
    x /= m;
    y /= m;
  }
  run.input.x = x;
  run.input.y = y;
  if (m > 0.1) run.moved = true;
}

function event(run, type, x, y, h = 0, extra) {
  run.events.push({ type, x, y, h, t: run.time, ...extra });
}

export function step(run, dt) {
  run.time += dt;
  if (run.events.length && run.time - run.events[0].t > 3) run.events = run.events.filter((e) => run.time - e.t <= 3);
  if (run.status !== 'play') {
    run.endTime += dt;
    if (run.status === 'won') outro(run, dt);
    return;
  }
  moveLeader(run, dt);
  for (const p of run.people) {
    if (p.id === run.leader) continue;
    if (p.state === 'link') advanceLink(run, p, dt);
    else if (p.state === 'crowd') follow(run, p, dt);
    else if (p.state === 'wait') p.t += dt;
  }
  separate(run);
  join(run);
  run.fieldT -= dt;
  if (run.fieldT <= 0) {
    chaseField(run);
    run.fieldT = FIELD_EVERY;
  }
  for (const r of run.robbers) robberStep(run, r, dt);
  catches(run);
  rescues(run);
  checkEnd(run);
}

// ---------------------------------------------------------------- the leader and the trail

function pushTrail(run, p, force = false) {
  const last = run.trail[run.trail.length - 1];
  if (force || last.layer !== p.layer || Math.hypot(p.x - last.x, p.y - last.y) >= TRAIL_STEP) {
    run.trail.push({ x: p.x, y: p.y, layer: p.layer });
  }
}

function moveLeader(run, dt) {
  const L = leaderOf(run);
  if (!L) return;
  if (L.state === 'link') {
    advanceLink(run, L, dt);
    return;
  }
  const { x: ix, y: iy } = run.input;
  const m = Math.hypot(ix, iy);
  if (m < 0.1) {
    L.speed = 0;
    return;
  }
  const ux = ix / m;
  const uy = iy / m;
  // walking into a ladder, a trampoline, a slide or a roof edge with a hop takes it
  for (const link of run.level.links) {
    if (link.from !== L.layer) continue;
    if (ux * link.n[0] + uy * link.n[1] < 0.35) continue;
    const { d, t } = segDist(L.x, L.y, link.a0, link.a1);
    if (d <= link.reach) {
      startLink(run, L, link, t, true);
      return;
    }
  }
  const sp = LEADER_SPEED * Math.min(1, m);
  const ox = L.x;
  const oy = L.y;
  L.x += ux * sp * dt;
  L.y += uy * sp * dt;
  confine(run.level, L);
  L.speed = Math.hypot(L.x - ox, L.y - oy) / dt;
  L.face = Math.atan2(uy, ux);
  pushTrail(run, L);
}

function startLink(run, p, link, t, isLeader, ti) {
  p.state = 'link';
  if (isLeader) {
    run.trail.push({ x: p.x, y: p.y, layer: p.layer, link: link.id, t });
    ti = run.trail.length - 1;
    run.linkPoints.push(ti);
    event(run, link.type, p.x, p.y, p.h, { link: link.id });
  }
  p.link = { id: link.id, t, p: 0, ti };
  run.linkLast[link.id] = run.time;
  const q = linkPos(link, t, 0);
  p.x = q.x;
  p.y = q.y;
  p.h = q.h;
}

function advanceLink(run, p, dt) {
  const link = run.level.links[p.link.id];
  p.link.p += dt / link.time;
  const ox = p.x;
  const oy = p.y;
  if (p.link.p >= 1) {
    const q = linkPos(link, p.link.t, 1);
    p.x = q.x;
    p.y = q.y;
    p.layer = link.to;
    p.h = heightOf(run.level, link.to);
    p.state = 'crowd';
    const ti = p.link.ti;
    p.link = null;
    confine(run.level, p);
    if (p.id === run.leader) pushTrail(run, p, true);
    else p.cursor = ti + 1;
  } else {
    const q = linkPos(link, p.link.t, p.link.p);
    p.x = q.x;
    p.y = q.y;
    p.h = q.h;
  }
  const mx = p.x - ox;
  const my = p.y - oy;
  if (mx * mx + my * my > 1e-6) p.face = Math.atan2(my, mx);
  p.speed = 3;
}

// ---------------------------------------------------------------- followers

const visible = (run, p, q) => p.layer === q.layer && (q.layer !== STREET || losClear(run.level, p.x, p.y, q.x, q.y));

function nextLinkPoint(run, c) {
  for (const i of run.linkPoints) if (i >= c) return i;
  return -1;
}

// How far from the leader the crowd stops: a bigger crowd needs a bigger huddle.
const huddle = (run) => 0.5 + 0.2 * Math.sqrt(crowdCount(run));

function follow(run, p, dt) {
  const trail = run.trail;
  const head = trail.length - 1;
  if (p.cursor > head) {
    // came off a link before the trail went on from it: wait
    p.speed = 0;
    return;
  }
  let c = p.cursor;
  const lp = nextLinkPoint(run, c);
  const end = lp >= 0 ? lp : head;
  // aim at the furthest trail point in sight, never past the next link
  let tgt = -1;
  for (const k0 of [end, c + 12, c + 6, c + 3, c + 1, c]) {
    const k = Math.min(k0, end);
    if (k < c) continue;
    if (visible(run, p, trail[k])) {
      tgt = k;
      break;
    }
  }
  if (tgt < 0) {
    // pushed out of sight of the trail: look back along it for a way on
    for (let k = c - 1; k >= Math.max(0, c - 40); k--) {
      if (visible(run, p, trail[k])) {
        tgt = k;
        break;
      }
    }
    if (tgt < 0) {
      for (let k = head; k >= 0; k--) {
        if (visible(run, p, trail[k])) {
          tgt = k;
          p.cursor = c = k;
          break;
        }
      }
    }
    if (tgt < 0) {
      p.speed = 0;
      return;
    }
  } else if (tgt > c + 1) {
    p.cursor = c = tgt - 1;
  }
  const T = trail[tgt];
  const isLink = T.link !== undefined && tgt === lp;
  let tx = T.x;
  let ty = T.y;
  let stopAt = 0;
  const L = leaderOf(run);
  if (tgt === head && !isLink && L && L.state === 'crowd' && L.layer === p.layer && visible(run, p, L)) {
    tx = L.x;
    ty = L.y;
    stopAt = huddle(run);
  }
  const dx = tx - p.x;
  const dy = ty - p.y;
  const d = Math.hypot(dx, dy);
  if (isLink && d < 0.55) {
    const link = run.level.links[T.link];
    if (run.time - run.linkLast[link.id] >= link.gap) {
      p.x = T.x;
      p.y = T.y;
      startLink(run, p, link, T.t, false, tgt);
    } else p.speed = 0; // waiting a turn at the bottom of the ladder
    return;
  }
  if (!isLink && tgt < head && d < 0.45) p.cursor = Math.max(p.cursor, tgt + 1);
  let sp = FOLLOW_SPEED;
  if (L && Math.hypot(L.x - p.x, L.y - p.y) > 6) sp *= 1.15;
  if (stopAt) sp = Math.min(sp, Math.max(0, (d - stopAt) * 3));
  if (d < 1e-6 || sp <= 0) {
    p.speed = 0;
    return;
  }
  const move = Math.min(sp * dt, d);
  const ox = p.x;
  const oy = p.y;
  p.x += (dx / d) * move;
  p.y += (dy / d) * move;
  confine(run.level, p);
  p.speed = Math.hypot(p.x - ox, p.y - oy) / dt;
  if (p.speed > 0.3) p.face = Math.atan2(dy, dx);
}

// Nobody stands inside anybody else.
function separate(run) {
  const ps = run.people;
  for (let i = 0; i < ps.length; i++) {
    const a = ps[i];
    if (a.state !== 'crowd') continue;
    for (let j = i + 1; j < ps.length; j++) {
      const b = ps[j];
      if (b.state !== 'crowd' || b.layer !== a.layer) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= SPACING * SPACING) continue;
      const d = Math.sqrt(d2) || 0.01;
      const push = SPACING - d;
      const nx = d2 > 1e-8 ? dx / d : Math.cos(i + j);
      const ny = d2 > 1e-8 ? dy / d : Math.sin(i + j);
      // the leader goes where the finger says; the others make room
      const ka = a.id === run.leader ? 0.1 : b.id === run.leader ? 0.9 : 0.5;
      a.x -= nx * push * ka;
      a.y -= ny * push * ka;
      b.x += nx * push * (1 - ka);
      b.y += ny * push * (1 - ka);
    }
  }
  for (const p of ps) if (p.state === 'crowd') confine(run.level, p);
}

function join(run) {
  const ps = run.people;
  for (const f of ps) {
    if (f.state !== 'wait') continue;
    for (const p of ps) {
      if (p.state !== 'crowd' || p.layer !== f.layer) continue;
      if ((p.x - f.x) ** 2 + (p.y - f.y) ** 2 > JOIN_DIST * JOIN_DIST) continue;
      f.state = 'crowd';
      f.cursor = p.id === run.leader ? run.trail.length - 1 : p.cursor;
      run.joined++;
      event(run, 'join', f.x, f.y, f.h, { id: f.id });
      break;
    }
  }
}

// ---------------------------------------------------------------- robbers

// Can a robber grab this person? Anyone in the crowd on the street, or low on a ladder.
function catchable(run, p) {
  if (p.state === 'crowd') return p.layer === STREET;
  if (p.state === 'link') {
    const link = run.level.links[p.link.id];
    return (link.from === STREET || link.to === STREET) && p.h < LOW;
  }
  return false;
}

function chaseField(run) {
  const sources = [];
  for (const p of run.people) if (catchable(run, p)) sources.push(p);
  run.chaseSources = sources.length;
  if (!sources.length) run.field.fill(FIELD_INF);
  else bfsField(run.level, sources, run.field);
}

function nearestCatchable(run, r) {
  let best = null;
  let bestD = Infinity;
  for (const p of run.people) {
    if (!catchable(run, p)) continue;
    const d = (p.x - r.x) ** 2 + (p.y - r.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best ? { p: best, d: Math.sqrt(bestD) } : null;
}

function sees(run, r) {
  const n = nearestCatchable(run, r);
  if (!n || n.d > r.sight) return false;
  return fieldAt(run.level, run.field, r.x, r.y) * CELL < r.sight * 2.2;
}

function setState(r, s) {
  r.state = s;
  r.t = 0;
}

function nearestHideout(run, r) {
  let best = null;
  let bestD = Infinity;
  for (const h of run.level.hideouts) {
    const d = Math.hypot(h.x - r.x, h.y - r.y);
    if (d < bestD) {
      bestD = d;
      best = h;
    }
  }
  return best ? { h: best, d: bestD } : null;
}

// Walk a robber toward `target` (straight if it is near and in sight, otherwise downhill
// on `field`).
function moveRobber(run, r, target, field, sp, dt) {
  const level = run.level;
  let tx;
  let ty;
  const near = target && Math.hypot(target.x - r.x, target.y - r.y) < 6 && losClear(level, r.x, r.y, target.x, target.y);
  if (near) {
    tx = target.x;
    ty = target.y;
  } else {
    const n = field ? descend(level, field, r.x, r.y) : null;
    if (n) {
      tx = n.x;
      ty = n.y;
    } else if (target) {
      tx = target.x;
      ty = target.y;
    } else {
      r.speed = 0;
      return;
    }
  }
  const dx = tx - r.x;
  const dy = ty - r.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) {
    r.speed = 0;
    return;
  }
  const move = Math.min(sp * dt, d);
  const ox = r.x;
  const oy = r.y;
  r.x += (dx / d) * move;
  r.y += (dy / d) * move;
  collideStreet(level, r);
  r.speed = Math.hypot(r.x - ox, r.y - oy) / dt;
  if (r.speed > 0.2) r.face = Math.atan2(dy, dx);
}

function robberStep(run, r, dt) {
  r.t += dt;
  const level = run.level;
  const sp = level.robberSpeed;
  switch (r.state) {
    case 'wait':
      r.speed = 0;
      if (sees(run, r)) setState(r, 'chase');
      break;
    case 'chase': {
      const n = nearestCatchable(run, r);
      const far = fieldAt(level, run.field, r.x, r.y) * CELL;
      if (!n || far > r.sight * 2.2) {
        // everyone's gone up on the roofs (or far away): "where did they go?"
        setState(r, 'confused');
        r.speed = 0;
        event(run, 'confused', r.x, r.y, 0, { robber: r.id });
        break;
      }
      moveRobber(run, r, n.p, run.field, sp, dt);
      break;
    }
    case 'confused':
      r.speed = 0;
      if (r.t > 0.6 && sees(run, r)) setState(r, 'chase');
      else if (r.t > CONFUSED_TIME) setState(r, 'return');
      break;
    case 'return': {
      if (sees(run, r)) {
        setState(r, 'chase');
        break;
      }
      if (Math.hypot(r.home.x - r.x, r.home.y - r.y) < 0.4) {
        setState(r, 'wait');
        r.sight = level.sight; // from now on they only chase what they can see
        break;
      }
      moveRobber(run, r, r.home, level.homeFields[r.id], sp * 0.7, dt);
      break;
    }
    case 'grab':
      r.speed = 0;
      if (r.t >= GRAB_TIME) setState(r, 'carry');
      break;
    case 'carry': {
      const h = nearestHideout(run, r);
      if (!h || h.d < 0.7) {
        const c = run.people[r.captive];
        c.state = 'gone';
        r.captive = -1;
        run.lost++;
        event(run, 'gone', r.x, r.y, 0, { id: c.id, robber: r.id });
        setState(r, 'drop');
        r.speed = 0;
        break;
      }
      moveRobber(run, r, h.h, level.hideoutField, sp * CARRY_SLOW, dt);
      break;
    }
    case 'drop':
    case 'dizzy':
      r.speed = 0;
      if (r.t >= (r.state === 'drop' ? DROP_TIME : DIZZY_TIME)) setState(r, 'return');
      break;
    default:
      break;
  }
  if (r.captive >= 0) {
    const c = run.people[r.captive];
    c.x = r.x;
    c.y = r.y;
  }
}

function catches(run) {
  for (const r of run.robbers) {
    if (r.state !== 'chase' && r.state !== 'wait' && r.state !== 'return' && r.state !== 'confused') continue;
    for (const p of run.people) {
      if (!catchable(run, p)) continue;
      if ((p.x - r.x) ** 2 + (p.y - r.y) ** 2 > CATCH_DIST * CATCH_DIST) continue;
      p.state = 'sacked';
      p.link = null;
      p.layer = STREET;
      p.h = 0;
      p.robber = r.id;
      r.captive = p.id;
      setState(r, 'grab');
      run.caught++;
      event(run, 'bonk', p.x, p.y, 0, { id: p.id, robber: r.id });
      if (p.id === run.leader) promote(run, p);
      break;
    }
  }
}

// The leader, running (not standing still), bumps a robber with a full sack: out pops the friend.
function rescues(run) {
  const L = leaderOf(run);
  if (!L || L.state !== 'crowd' || L.layer !== STREET) return;
  if (Math.hypot(run.input.x, run.input.y) < 0.2) return;
  for (const r of run.robbers) {
    if ((r.state !== 'carry' && r.state !== 'grab') || r.captive < 0) continue;
    if (Math.hypot(r.x - L.x, r.y - L.y) > RESCUE_DIST) continue;
    const c = run.people[r.captive];
    c.state = 'crowd';
    c.layer = STREET;
    c.robber = -1;
    c.x = r.x + (L.x - r.x) * 0.4;
    c.y = r.y + (L.y - r.y) * 0.4;
    collideStreet(run.level, c);
    c.cursor = run.trail.length - 1;
    r.captive = -1;
    setState(r, 'dizzy');
    run.rescued++;
    event(run, 'rescue', c.x, c.y, 0, { id: c.id, robber: r.id });
  }
}

// The leader was grabbed: whoever is furthest along the trail takes over.
function promote(run, old) {
  let best = null;
  let bestKey = null;
  for (const p of run.people) {
    if (!inCrowd(p)) continue;
    const key = [p.state === 'link' ? p.link.ti : p.cursor, p.state === 'link' ? 1 + p.link.p : 0, -Math.hypot(p.x - old.x, p.y - old.y)];
    if (!best || key[0] > bestKey[0] || (key[0] === bestKey[0] && (key[1] > bestKey[1] || (key[1] === bestKey[1] && key[2] > bestKey[2])))) {
      best = p;
      bestKey = key;
    }
  }
  if (!best) {
    run.leader = -1;
    return;
  }
  run.leader = best.id;
  if (best.state === 'link') run.trail.length = best.link.ti + 1;
  else {
    run.trail.length = Math.max(1, Math.min(run.trail.length, best.cursor));
    run.trail.push({ x: best.x, y: best.y, layer: best.layer });
  }
  run.linkPoints = run.linkPoints.filter((i) => i < run.trail.length);
  const head = run.trail.length - 1;
  for (const p of run.people) if (p.state === 'crowd' && p.cursor > head) p.cursor = head;
  event(run, 'leader', best.x, best.y, best.h, { id: best.id });
}

// ---------------------------------------------------------------- the end

export const inGoal = (level, x, y) => insideRect(level.goal, x, y);

function checkEnd(run) {
  const n = crowdCount(run);
  if (n === 0) {
    run.status = 'lost';
    run.endTime = 0;
    run.leader = -1;
    return;
  }
  const L = leaderOf(run);
  if (L && L.state === 'crowd' && L.layer === STREET && inGoal(run.level, L.x, L.y)) {
    run.status = 'won';
    run.endTime = 0;
    run.saved = n;
    run.stars = starsFor(n, run.level.total);
    for (const r of run.robbers) {
      if (r.state === 'chase' || r.state === 'return' || r.state === 'wait') setState(r, 'confused');
      r.t = -1e6; // puzzled for good
    }
    event(run, 'win', L.x, L.y);
  }
}

// After the win everyone near the getaway hops aboard.
function outro(run, dt) {
  const g = run.level.goal;
  const gx = g.x + g.w / 2;
  const gy = g.y + g.d / 2;
  for (const p of run.people) {
    if (p.state === 'link') {
      advanceLink(run, p, dt);
      continue;
    }
    if (p.state !== 'crowd' || p.layer !== STREET) continue;
    const dx = gx - p.x;
    const dy = gy - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.9) {
      p.state = 'saved';
      event(run, 'aboard', p.x, p.y, 0, { id: p.id });
      continue;
    }
    const move = Math.min(FOLLOW_SPEED * dt, d);
    p.x += (dx / d) * move;
    p.y += (dy / d) * move;
    collideStreet(run.level, p);
    p.speed = FOLLOW_SPEED;
    p.face = Math.atan2(dy, dx);
  }
}

// For checks: the chase field's distance (in units) from a point to the nearest catchable person.
export const chaseDistance = (run, x, y) => fieldAt(run.level, run.field, x, y) * CELL;
