// The run itself: the crowd, gates, obstacles and the finale. Pure: no DOM, no three.js.
import { TRACK_HALF, SPEED, STAGE, applyOp, hits } from './track.js';

export const SPACING = 0.42; // metres between neighbours in the crowd
export const MAX_VISIBLE = 150; // people drawn; any more are counted in `reserve`
export const FINALE_MIN = 12; // finish with more than this for the big finale
export const STRIKER_FULL = 60; // crowd size that sends the puck to the bell
export const FINALE_FULL = 60; // crowd size that reaches the top in every finale
export const FINALES = ['striker', 'tower', 'cannon'];
export const TOWER_LAYERS = 22; // layers of people in the tallest human tower
export const CANNON_FAR = 60; // metres from the cannon to the target

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

// Pick a finale: `finale` forces one, otherwise `random` (0..1) chooses.
export function pickFinale(random = Math.random, finale) {
  if (FINALES.includes(finale)) return finale;
  return FINALES[Math.min(FINALES.length - 1, Math.floor(random() * FINALES.length))];
}

// The finale is chosen when the run starts, so its stage is in view as the crowd runs up to it.
export function createRun(track, start = 1, { random = Math.random, finale } = {}) {
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
    finaleKind: pickFinale(random, finale),
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
    celebrate: full >= 1 && rt >= 1,
    counting: t > gather,
    done: rt >= 1 && t > gather + jump + rise + 0.6,
  };
}

// The human tower: the crowd stacks itself up, layer by layer, toward a star in the clouds.
// `built` counts layers in place (0..layers); `height` is the tower's height, 0..1 of the tallest.
export function towerState(run) {
  const t = run.endTime;
  const full = Math.min(1, run.finalCount / FINALE_FULL);
  const total = run.finalCount * 10;
  const layers = 3 + Math.floor((TOWER_LAYERS - 3) * full);
  const gather = 1.8;
  const build = 2.4 + 0.15 * layers;
  const bt = clamp((t - gather) / build, 0, 1);
  const built = layers * bt;
  return {
    layers,
    built,
    height: built / TOWER_LAYERS,
    score: Math.round(total * bt),
    total,
    star: full >= 1 && bt >= 1,
    celebrate: full >= 1 && bt >= 1,
    since: Math.max(0, t - gather - build), // seconds since the top went on
    counting: t > gather,
    done: t > gather + build + 1.0,
  };
}

// The cannon: the crowd piles in, it fires, and they fly down the runway toward the target.
// `reach` is how far they will fly, `distance` how far they have flown, in metres.
export function cannonState(run) {
  const t = run.endTime;
  const full = Math.min(1, run.finalCount / FINALE_FULL);
  const total = run.finalCount * 10;
  const gather = 1.8;
  const load = 1.6;
  const aim = 0.6;
  const flight = 1.4 + 1.4 * full;
  const fireAt = gather + load + aim;
  const ft = clamp((t - fireAt) / flight, 0, 1);
  const reach = CANNON_FAR * (0.1 + 0.9 * full);
  return {
    load: clamp((t - gather) / load, 0, 1), // 0..1 of the crowd climbed in
    fired: t >= fireAt,
    sinceFire: Math.max(0, t - fireAt),
    flight: ft,
    reach,
    distance: reach * ft,
    landed: ft >= 1,
    since: Math.max(0, t - fireAt - flight), // seconds since landing
    score: Math.round(total * ft),
    total,
    hit: full >= 1 && ft >= 1,
    celebrate: full >= 1 && ft >= 1,
    counting: t >= fireAt,
    done: t > fireAt + flight + 1.2,
  };
}

const FINALE_STATES = { striker: strikerState, tower: towerState, cannon: cannonState };

// The state of whichever finale this run plays.
export function finaleState(run) {
  return FINALE_STATES[run.finaleKind](run);
}
