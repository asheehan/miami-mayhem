import { describe, it, expect } from 'vitest';
import {
  createGame, step, toggle, canToggle, occupant, starsFor, goalMet, buildLanes, LEVELS, TYPES, GAP, HEARTS,
  BRIDGE_TIME, TOGGLE_DEBOUNCE, QUEUE_PATIENCE_RATE,
} from '../src/games/bridge-boss/sim.js';
import { botStep } from '../src/games/bridge-boss/bot.js';

const DT = 1 / 60;
const yieldNow = () => new Promise((r) => setImmediate(r));
const run = (s, secs, each) => {
  for (let t = 0; t < secs - 1e-9; t += DT) {
    if (each) each(s);
    step(s, DT);
  }
};
// Step until a condition holds (or give up after `limit` seconds).
const until = (s, cond, limit = 120, each) => {
  for (let t = 0; t < limit && !cond(s); t += DT) {
    if (each) each(s);
    step(s, DT);
  }
  return cond(s);
};
const play = (s, limit = 400) => until(s, (g) => g.status !== 'play', limit, botStep);
const road = (s) => s.lanes.find((l) => l.kind === 'road');
const water = (s) => s.lanes.find((l) => l.kind === 'water');

function checkQueues(s) {
  for (const lane of s.lanes) {
    for (let i = 1; i < lane.vehicles.length; i++) {
      const a = lane.vehicles[i - 1];
      const v = lane.vehicles[i];
      expect(a.s - a.len - v.s).toBeGreaterThanOrEqual(GAP - 1e-6);
    }
    for (const v of lane.vehicles) {
      for (const c of lane.crossings) {
        const br = s.bridges[c.bridge];
        const open = lane.kind === 'road' ? br.state === 'down' : br.state === 'up';
        // anyone past a stop line that is shut got there while it was open and is still crossing
        if (!open && v.s > c.stopAt && v.s - v.len < c.zoneEnd) expect(br.state === 'down' || br.state === 'up').toBe(true);
      }
    }
  }
}

describe('lanes', () => {
  it('every level has car lanes and boat lanes, each crossing every bridge in order', () => {
    for (const L of LEVELS) {
      const lanes = buildLanes(L);
      expect(lanes.filter((l) => l.kind === 'road').length).toBe(L.carDirs.length * L.roads);
      expect(lanes.filter((l) => l.kind === 'water').length).toBe(L.boatDirs.length);
      for (const l of lanes) {
        expect(l.crossings.length).toBe(l.kind === 'road' ? 1 : L.roads);
        for (const c of l.crossings) {
          expect(c.stopAt).toBeLessThan(c.zoneStart);
          expect(c.zoneEnd).toBeGreaterThan(c.zoneStart);
          expect(c.stopAt).toBeGreaterThan(20); // vehicles appear well before the stop line
          expect(c.zoneEnd).toBeLessThan(l.length - 20);
        }
        for (let i = 1; i < l.crossings.length; i++) {
          // room between two bridges for the longest boat to wait clear of the first one
          expect(l.crossings[i].stopAt - l.crossings[i - 1].zoneEnd).toBeGreaterThan(TYPES.cruise.len + GAP);
        }
      }
    }
  });
});

describe('queueing', () => {
  it('cars and boats stop politely behind each other, with no overlaps, on every level', async () => {
    let maxQueue = 0;
    for (let i = 0; i < LEVELS.length; i++) {
      const s = createGame(i, 11);
      // flip the bridge now and then so both kinds queue and move off again
      for (let t = 0; t < 90 && s.status === 'play'; t += DT) {
        if (Math.floor(t / 13) % 2 === 1 && s.bridges[0].state === 'down') toggle(s, 0);
        if (Math.floor(t / 13) % 2 === 0 && s.bridges[0].state === 'up') toggle(s, 0);
        step(s, DT);
        checkQueues(s);
        for (const lane of s.lanes) maxQueue = Math.max(maxQueue, lane.vehicles.filter((v) => v.waiting).length);
      }
      await yieldNow();
    }
    expect(maxQueue).toBeGreaterThanOrEqual(3);
  });

  it('cars wait at the stop line while the bridge is up and boats while it is down', () => {
    const s = createGame(0, 3);
    const boats = water(s);
    expect(until(s, (g) => boats.vehicles.some((v) => v.front))).toBe(true);
    const boat = boats.vehicles.find((v) => v.front);
    expect(boat.s).toBeCloseTo(boats.crossings[0].stopAt, 5);
    run(s, 2);
    expect(boat.s).toBeCloseTo(boats.crossings[0].stopAt, 5);
    expect(toggle(s, 0) || until(s, (g) => toggle(g, 0), 20)).toBe(true);
    run(s, BRIDGE_TIME + 0.05);
    expect(s.bridges[0].state).toBe('up');
    const cars = road(s);
    expect(until(s, (g) => cars.vehicles.some((v) => v.front))).toBe(true);
    const car = cars.vehicles.find((v) => v.front);
    expect(car.s).toBeCloseTo(cars.crossings[0].stopAt, 5);
    expect(boat.s).toBeGreaterThan(boats.crossings[0].stopAt);
  });

  it('a vehicle does not follow a slower one onto the bridge, so the span clears', () => {
    const s = createGame(2, 1);
    const lane = road(s);
    // a bus with a car right behind it, both waiting at a raised bridge
    toggle(s, 0);
    run(s, 1);
    lane.vehicles.length = 0;
    lane.next = lane.schedule.length;
    const mk = (type, at) => ({
      id: 900 + at, type, kind: 'road', lane: lane.id, look: 0, len: TYPES[type].len, width: TYPES[type].width,
      speed: s.level.carSpeed * TYPES[type].speed, accel: TYPES[type].accel, patienceTime: 20,
      s: at, v: 0, patience: 0, waiting: true, front: false, waitTime: 0, delivered: false, born: 0,
    });
    const stop = lane.crossings[0].stopAt;
    lane.vehicles.push(mk('bus', stop), mk('car', stop - TYPES.bus.len - GAP));
    toggle(s, 0);
    run(s, BRIDGE_TIME + 0.05);
    const [bus, car] = lane.vehicles;
    until(s, () => bus.s - bus.len > lane.crossings[0].zoneEnd + 1, 30);
    // the car waited at the line while the bus crossed
    expect(car.s).toBeLessThanOrEqual(stop + 1e-6);
    expect(occupant(s, 0)).toBe(null);
    expect(canToggle(s, 0)).toBe(true);
  });
});

describe('the bridge', () => {
  it('takes BRIDGE_TIME to open and to close', () => {
    const s = createGame(0, 1);
    expect(s.bridges[0].state).toBe('down');
    expect(toggle(s, 0)).toBe(true);
    expect(s.bridges[0].state).toBe('raising');
    run(s, BRIDGE_TIME / 2);
    expect(s.bridges[0].k).toBeCloseTo(0.5, 1);
    expect(s.bridges[0].state).toBe('raising');
    run(s, BRIDGE_TIME / 2 + 0.02);
    expect(s.bridges[0].state).toBe('up');
    expect(s.bridges[0].k).toBe(1);
    expect(toggle(s, 0)).toBe(true);
    run(s, BRIDGE_TIME + 0.02);
    expect(s.bridges[0].state).toBe('down');
    expect(s.bridges[0].k).toBe(0);
  });

  it('ignores a second tap right after the first, and turns round on a later one', () => {
    const s = createGame(0, 1);
    toggle(s, 0);
    run(s, TOGGLE_DEBOUNCE / 2);
    expect(toggle(s, 0)).toBe(false);
    expect(s.bridges[0].state).toBe('raising');
    run(s, TOGGLE_DEBOUNCE);
    expect(toggle(s, 0)).toBe(true);
    expect(s.bridges[0].state).toBe('lowering');
    run(s, BRIDGE_TIME);
    expect(s.bridges[0].state).toBe('down');
  });

  it('refuses to open with a car on the span, with a shake to show it', () => {
    const s = createGame(0, 1);
    expect(until(s, (g) => occupant(g, 0)?.kind === 'road')).toBe(true);
    const car = occupant(s, 0);
    expect(canToggle(s, 0)).toBe(false);
    expect(toggle(s, 0)).toBe(false);
    expect(s.bridges[0].state).toBe('down');
    expect(s.bridges[0].refusedBy).toBe(car.id);
    expect(s.bridges[0].refusedTime).toBe(s.time);
    // once the car is across it opens
    until(s, (g) => !occupant(g, 0));
    expect(toggle(s, 0)).toBe(true);
  });

  it('refuses to close with a boat under it', () => {
    const s = createGame(0, 1);
    toggle(s, 0);
    expect(until(s, (g) => occupant(g, 0)?.kind === 'water', 60)).toBe(true);
    expect(toggle(s, 0)).toBe(false);
    expect(s.bridges[0].state).toBe('up');
    until(s, (g) => !occupant(g, 0));
    expect(toggle(s, 0)).toBe(true);
  });

  it('on two-bridge levels each bridge moves on its own', () => {
    const s = createGame(6, 1);
    expect(s.bridges.length).toBe(2);
    toggle(s, 1);
    run(s, BRIDGE_TIME + 0.05);
    expect(s.bridges.map((b) => b.state)).toEqual(['down', 'up']);
  });
});

describe('patience and hearts', () => {
  it('a vehicle waiting at the front fills its patience, then poofs and costs a heart', () => {
    const s = createGame(0, 2);
    const boats = water(s);
    until(s, (g) => boats.vehicles.some((v) => v.front));
    const boat = boats.vehicles.find((v) => v.front);
    run(s, 2);
    expect(boat.patience).toBeCloseTo(2 / boat.patienceTime, 1);
    expect(boat.patienceTime).toBe(LEVELS[0].boatPatience);
    expect(until(s, (g) => g.hearts < HEARTS, 60)).toBe(true);
    expect(s.hearts).toBe(HEARTS - 1);
    expect(boats.vehicles.includes(boat)).toBe(false);
    expect(s.effects.length).toBe(1);
    expect(s.effects[0].type).toBe('boat');
  });

  it('vehicles behind the front get impatient more slowly', () => {
    const s = createGame(1, 4);
    const lane = road(s);
    toggle(s, 0);
    until(s, (g) => lane.vehicles.filter((v) => v.waiting).length >= 2, 120);
    const [front, second] = lane.vehicles.filter((v) => v.waiting);
    const p0 = [front.patience, second.patience];
    run(s, 1);
    expect(front.patience - p0[0]).toBeCloseTo(1 / front.patienceTime, 2);
    expect(second.patience - p0[1]).toBeCloseTo(QUEUE_PATIENCE_RATE / second.patienceTime, 2);
  });

  it('ambulances and speedboats are impatient', () => {
    expect(TYPES.ambulance.patienceSeconds).toBeLessThan(LEVELS[3].carPatience / 2);
    expect(TYPES.speedboat.patienceSeconds).toBeLessThan(LEVELS[5].boatPatience / 2);
    expect(TYPES.cruise.len).toBeGreaterThan(TYPES.boat.len * 2);
    expect(TYPES.cruise.speed).toBeLessThan(1);
    expect(TYPES.bus.speed).toBeLessThan(1);
    expect(TYPES.speedboat.speed).toBeGreaterThan(1.5);
  });
});

describe('winning and losing', () => {
  it('getting the goal through wins, with a star per heart left', () => {
    const s = createGame(0, 1);
    s.hearts = 2;
    s.delivered.cars = LEVELS[0].goal.cars;
    step(s, DT);
    expect(s.status).toBe('play'); // boats still to go
    s.delivered.boats = LEVELS[0].goal.boats;
    step(s, DT);
    expect(goalMet(s)).toBe(true);
    expect(s.status).toBe('won');
    expect(starsFor(s)).toBe(2);
    expect(toggle(s, 0)).toBe(false);
  });

  it('running out of hearts loses, with no stars, and nothing more counts', () => {
    const s = createGame(3, 1);
    until(s, (g) => g.status !== 'play', 400);
    expect(s.status).toBe('lost');
    expect(s.hearts).toBe(0);
    expect(starsFor(s)).toBe(0);
    const d = { ...s.delivered };
    run(s, 20);
    expect(s.delivered).toEqual(d);
    expect(s.hearts).toBe(0);
    expect(s.status).toBe('lost');
  });

  it('only vehicles that get all the way across count', () => {
    const s = createGame(0, 1);
    until(s, (g) => g.delivered.cars === 1, 60);
    expect(s.delivered).toEqual({ cars: 1, boats: 0 });
    expect(s.passed).toEqual(['car']);
  });
});

describe('seeds', () => {
  it('the same level and seed always bring the same traffic and the same result', () => {
    const a = createGame(5, 42);
    const b = createGame(5, 42);
    const c = createGame(5, 43);
    const sched = (s) => s.lanes.map((l) => l.schedule.slice(0, 20).map((x) => `${x.type}@${x.t.toFixed(3)}`));
    expect(sched(a)).toEqual(sched(b));
    expect(sched(a)).not.toEqual(sched(c));
    play(a);
    play(b);
    expect(a.time).toBe(b.time);
    expect(a.hearts).toBe(b.hearts);
    expect(a.delivered).toEqual(b.delivered);
  });

  it('each new special shows up early on the level that brings it in', () => {
    for (const L of LEVELS) {
      if (!L.intro) continue;
      const s = createGame(LEVELS.indexOf(L), 9);
      const lane = s.lanes.find((l) => l.kind === L.intro.kind);
      expect(lane.schedule[L.intro.nth].type).toBe(L.intro.type);
      expect(lane.schedule.slice(0, L.intro.nth).every((x) => x.type === (L.intro.kind === 'road' ? 'car' : 'boat'))).toBe(true);
    }
  });
});

describe('every level is winnable, and needs the bridge', () => {
  LEVELS.forEach((L, i) => {
    it(`level ${i + 1}: a simple bot wins; leaving the bridge alone does not`, async () => {
      for (const seed of [2, 3, 4, 5, 6]) {
        const s = createGame(i, seed);
        play(s);
        expect(s.status).toBe('won');
        expect(s.hearts).toBeGreaterThanOrEqual(i < 3 ? 3 : 1);
        await yieldNow();
      }
      // across many more seeds it nearly always wins
      let wins = 0;
      for (let seed = 100; seed < 116; seed++) {
        const s = createGame(i, seed);
        play(s);
        if (s.status === 'won') wins++;
      }
      expect(wins).toBeGreaterThanOrEqual(14);
      await yieldNow();
      for (const seed of [2, 3]) {
        const idle = createGame(i, seed);
        until(idle, (g) => g.status !== 'play', 400);
        expect(idle.status).toBe('lost');
        expect(idle.delivered.boats).toBe(0);
      }
    });
  });

  it('gets harder: patience shrinks and goals grow from level 1 to level 9', () => {
    const first = LEVELS[0];
    const last = LEVELS[LEVELS.length - 1];
    expect(last.carPatience).toBeLessThan(first.carPatience);
    expect(last.boatPatience).toBeLessThan(first.boatPatience);
    expect(last.goal.cars + last.goal.boats).toBeGreaterThan(first.goal.cars + first.goal.boats);
    expect(LEVELS.length).toBeGreaterThanOrEqual(9);
    expect(LEVELS.slice(-3).every((l) => l.roads === 2)).toBe(true);
    expect(LEVELS.slice(0, -3).every((l) => l.roads === 1)).toBe(true);
  });
});
