// The run itself: the crowd, gates, obstacles and the finale. Pure: no DOM, no three.js.
import { TRACK_HALF, SPEED, STAGE, applyOp, hits } from './track.js';

export const SPACING = 0.42; // metres between neighbours in the crowd
export const MAX_VISIBLE = 150; // people drawn; any more are counted in `reserve`
export const FINALE_MIN = 12; // finish with more than this for the big finale
export const STRIKER_FULL = 60; // crowd size that sends the puck to the bell

const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Where the i-th person stands relative to the middle of the crowd (a sunflower spiral).
export function slotOffset(i) {
  const r = SPACING * Math.sqrt(i);
  const a = i * GOLDEN;
  return { x: r * Math.cos(a), z: r * Math.sin(a) };
}

export const crowdRadius = (n) => SPACING * Math.sqrt(Math.max(0, n - 1)) + 0.25;

export const count = (run) => run.people.length + run.reserve;

export function createRun(track, start = 1) {
  const run = {
    track,
    z: 0,
    x: 0,
    aim: 0, // where the player is steering to; the crowd's middle gets as close as it fits
    time: 0,
    people: [], // { id, x, rz }: x across the track, rz ahead of the crowd's middle
    reserve: 0,
    fallen: [], // { id, x, z, kind, age } for the view to animate
    taken: [], // side chosen at each gate row
    gateIndex: 0,
    nextId: 0,
    status: 'running', // 'running' | 'lost' | 'finished' | 'finale'
    endTime: 0,
    finalCount: 0,
  };
  addPeople(run, start);
  return run;
}

function addPeople(run, n) {
  for (let k = 0; k < n; k++) {
    if (run.people.length >= MAX_VISIBLE) {
      run.reserve++;
      continue;
    }
    const off = slotOffset(run.people.length);
    run.people.push({ id: run.nextId++, x: run.x + off.x * 0.3, rz: off.z * 0.3 - 0.6 });
  }
}

function removePeople(run, n) {
  for (let k = 0; k < n && count(run) > 0; k++) {
    if (run.reserve > 0) run.reserve--;
    else run.people.pop();
  }
}

function setCount(run, target) {
  const now = count(run);
  if (target > now) addPeople(run, target - now);
  else removePeople(run, now - target);
}

function kill(run, i, kind) {
  const p = run.people[i];
  run.fallen.push({ id: p.id, x: p.x, z: run.z + p.rz, kind, age: 0 });
  run.people.splice(i, 1);
  if (run.reserve > 0) {
    run.reserve--;
    const off = slotOffset(run.people.length);
    run.people.push({ id: run.nextId++, x: run.x + off.x, rz: off.z });
  }
}

// Move the crowd sideways by dx metres (from a finger drag).
export function steer(run, dx) {
  run.aim = clamp(run.aim + dx, -TRACK_HALF, TRACK_HALF);
}

export function step(run, dt) {
  run.time += dt;
  for (const f of run.fallen) f.age += dt;
  if (run.fallen.length && run.fallen[0].age > 2) run.fallen = run.fallen.filter((f) => f.age <= 2);

  if (run.status === 'lost') return;
  const ended = run.status !== 'running';
  if (ended) {
    run.endTime += dt;
    // jog on to the finale button and stop there
    const stop = run.track.finishZ + STAGE;
    run.z = Math.min(stop, run.z + SPEED * dt * clamp((stop - run.z) / 4, 0.25, 1));
    run.aim = 0;
  } else {
    run.z += SPEED * dt;
  }

  const limit = Math.max(0.8, TRACK_HALF - crowdRadius(run.people.length));
  run.x += (clamp(run.aim, -limit, limit) - run.x) * Math.min(1, 14 * dt);

  if (!ended) {
    const { gates } = run.track;
    while (run.gateIndex < gates.length && gates[run.gateIndex].z <= run.z) {
      const side = run.x < 0 ? 'left' : 'right';
      run.taken[run.gateIndex] = side;
      setCount(run, applyOp(count(run), gates[run.gateIndex][side]));
      run.gateIndex++;
    }
  }

  // everyone drifts toward their place in the crowd; on the finale button they bunch up
  const k = Math.min(1, 9 * dt);
  const tight = run.status === 'finale' ? 0.62 : 1;
  const edge = TRACK_HALF - 0.2;
  for (let i = 0; i < run.people.length; i++) {
    const p = run.people[i];
    const off = slotOffset(i);
    p.x = clamp(p.x + (run.x + off.x * tight - p.x) * k, -edge, edge);
    p.rz += (off.z * tight - p.rz) * k;
  }

  if (!ended) {
    const reach = crowdRadius(run.people.length) + 2;
    for (const ob of run.track.obstacles) {
      if (ob.z1 < run.z - reach || ob.z0 > run.z + reach) continue;
      for (let i = run.people.length - 1; i >= 0; i--) {
        const p = run.people[i];
        if (hits(ob, p.x, run.z + p.rz, run.time)) kill(run, i, ob.type);
      }
    }
    if (count(run) === 0) run.status = 'lost';
    else if (run.z >= run.track.finishZ) {
      run.finalCount = count(run);
      run.status = run.finalCount > FINALE_MIN ? 'finale' : 'finished';
      run.endTime = 0;
    }
  }
}

// The high striker finale, as a function of time since the finish line:
// the crowd gathers on the button, jumps, and the puck shoots up the tower.
export function strikerState(run) {
  const t = run.endTime;
  const full = Math.min(1, run.finalCount / STRIKER_FULL);
  const score = run.finalCount * 10;
  const gather = 2.0;
  const jump = 0.7;
  const rise = 1.4 + 1.8 * full;
  const jt = clamp((t - gather) / jump, 0, 1);
  const rt = clamp((t - gather - jump) / rise, 0, 1);
  const eased = 1 - (1 - rt) ** 3;
  return {
    jump: Math.sin(jt * Math.PI), // 0..1..0 height of the group jump
    puck: eased * full, // 0..1 up the tower
    score: Math.round(score * eased),
    total: score,
    bell: full >= 1 && rt >= 1,
    done: rt >= 1 && t > gather + jump + rise + 0.6,
  };
}
