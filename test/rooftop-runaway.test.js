import { describe, it, expect } from 'vitest';
import { LEVELS } from '../src/games/rooftop-runaway/levels.js';
import { buildLevel, linkPos, insideRect, PAD, STREET } from '../src/games/rooftop-runaway/world.js';
import {
  createRun, step, setInput, starsFor, starTargets, crowdCount, leaderOf, inCrowd,
  GRAB_TIME, DIZZY_TIME, LEADER_SPEED,
} from '../src/games/rooftop-runaway/sim.js';
import { reachability, playBot } from '../src/games/rooftop-runaway/bot.js';

const DT = 1 / 30;
const run = (r, secs) => {
  for (let t = 0; t < secs - 1e-9; t += DT) step(r, DT);
};
// keep steering one way until a condition holds (or give up after `secs`)
const until = (r, cond, secs = 30, steer) => {
  for (let t = 0; t < secs && !cond(r); t += DT) {
    if (steer) steer(r);
    step(r, DT);
  }
  return cond(r);
};

// A small test map: an open street 20 wide and 60 long, with whatever a test adds.
function map(extra = {}) {
  return {
    name: 'test', W: 20, L: 60, start: [10, 4], crowd: 4,
    goal: { kind: 'truck', x: 7, y: 54, w: 6, d: 4 },
    buildings: [], friends: [], robbers: [], hideouts: [[0.6, 0.6]],
    robberSpeed: 2, sight: 9,
    ...extra,
  };
}
// a building with a ladder on its south wall at x = 10, y = 20
const ladderMap = (extra = {}) => map({
  buildings: [[6, 20, 8, 8, 3.5]],
  climbs: [{ b: 0, side: 's', at: 0.5 }],
  ...extra,
});

describe('running and friends', () => {
  it('the leader runs where the finger points and the crowd keeps up', () => {
    const r = createRun(map());
    setInput(r, 0, 1);
    run(r, 2);
    const L = leaderOf(r);
    expect(L.y - 4).toBeCloseTo(LEADER_SPEED * 2, 0);
    run(r, 1);
    for (const p of r.people) expect(Math.hypot(p.x - L.x, p.y - L.y)).toBeLessThan(3.5);
  });

  it('a friend standing by the road joins when the crowd runs past, and then follows', () => {
    const r = createRun(map({ friends: [[11, 14]] }));
    const friend = r.people.find((p) => p.state === 'wait');
    expect(crowdCount(r)).toBe(4);
    setInput(r, 0, 1);
    expect(until(r, (q) => friend.state === 'crowd', 6)).toBe(true);
    expect(crowdCount(r)).toBe(5);
    expect(r.joined).toBe(1);
    expect(r.events.some((e) => e.type === 'join')).toBe(true);
    run(r, 3);
    const L = leaderOf(r);
    expect(Math.hypot(friend.x - L.x, friend.y - L.y)).toBeLessThan(3.5);
  });

  it('crowd members never overlap and never stand inside a building', () => {
    const r = createRun(map({ crowd: 12, buildings: [[8, 12, 4, 4, 3]] }));
    setInput(r, 0, 1);
    run(r, 6);
    const ps = r.people.filter((p) => p.state === 'crowd');
    for (const p of ps) expect(insideRect(r.level.buildings[0], p.x, p.y, PAD - 0.01)).toBe(false);
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) expect(Math.hypot(ps[i].x - ps[j].x, ps[i].y - ps[j].y)).toBeGreaterThan(0.3);
  });
});

describe('climbing', () => {
  it('running into a ladder takes the leader up onto the roof, and the crowd climbs after, one at a time', () => {
    const r = createRun(ladderMap({ crowd: 6 }));
    const L = leaderOf(r);
    const starts = new Map();
    let most = 0;
    let leaderUp = false;
    for (let t = 0; t < 14; t += DT) {
      setInput(r, 0, L.layer === 1 ? 0.2 : 1);
      step(r, DT);
      if (L.state === 'link') expect(r.level.links[L.link.id].type).toBe('ladder');
      if (L.layer === 1) leaderUp = true;
      for (const p of r.people) if (p.state === 'link' && !starts.has(p.id)) starts.set(p.id, r.time);
      most = Math.max(most, r.people.filter((p) => p.state === 'link').length);
    }
    expect(leaderUp).toBe(true);
    expect(starts.size).toBe(6);
    expect(starts.get(L.id)).toBe(Math.min(...starts.values())); // the leader went first
    const times = [...starts.values()].sort((a, b) => a - b);
    for (let i = 1; i < times.length; i++) expect(times[i] - times[i - 1]).toBeGreaterThanOrEqual(r.level.links[0].gap - 1e-9);
    expect(most).toBeGreaterThan(1); // several on the ladder at once
    for (const p of r.people) {
      expect(p.layer).toBe(1);
      expect(p.h).toBe(3.5);
    }
  });

  it('a climber is on the wall, rising, part way up', () => {
    const lv = buildLevel(ladderMap());
    const link = lv.links.find((l) => l.type === 'ladder' && !l.down);
    const lo = linkPos(link, 0.5, 0.3);
    const hi = linkPos(link, 0.5, 0.7);
    expect(hi.h).toBeGreaterThan(lo.h);
    expect(lo.h).toBeGreaterThan(0);
    expect(Math.abs(lo.y - 20)).toBeLessThan(0.5);
    expect(linkPos(link, 0.5, 1).h).toBeCloseTo(3.5);
  });

  it('walking along the wall past a ladder does not climb it', () => {
    const r = createRun(ladderMap({ start: [5, 19.4] }));
    setInput(r, 1, 0);
    run(r, 3);
    expect(r.people.every((p) => p.layer === STREET)).toBe(true);
  });

  it('hops across a gap to the next roof and slides back down to the street', () => {
    const r = createRun(map({
      crowd: 3,
      buildings: [[6, 20, 8, 6, 3.5], [6, 27.2, 8, 6, 4]],
      climbs: [{ b: 0, side: 's' }],
      slides: [{ b: 1, side: 'n' }],
    }));
    const L = leaderOf(r);
    setInput(r, 0, 1);
    expect(until(r, () => L.layer === 2, 12)).toBe(true);
    expect(r.trail.some((t) => t.link !== undefined && r.level.links[t.link].type === 'hop')).toBe(true);
    expect(until(r, () => L.layer === STREET && L.y > 33, 6)).toBe(true);
    // and everyone came the same way
    expect(until(r, (q) => q.people.every((p) => p.layer === STREET && p.state === 'crowd' && p.y > 33), 12, (q) => setInput(q, 0, 0.3))).toBe(true);
  });
});

describe('robbers', () => {
  it('a robber that reaches someone pops them in the sack and runs off with them', () => {
    const r = createRun(map({ crowd: 2, robbers: [[10, 9]], hideouts: [[0.6, 50]] }));
    const rob = r.robbers[0];
    expect(until(r, () => rob.state === 'grab', 10)).toBe(true);
    expect(r.caught).toBe(1);
    expect(r.events.some((e) => e.type === 'bonk')).toBe(true);
    const victim = r.people[rob.captive];
    expect(victim.state).toBe('sacked');
    expect(crowdCount(r)).toBe(1);
    run(r, GRAB_TIME + 0.1);
    expect(rob.state).toBe('carry');
    expect(until(r, () => victim.state === 'gone', 40)).toBe(true);
    expect(r.lost).toBe(1);
  });

  it('losing the leader is not the end: someone else leads', () => {
    const r = createRun(map({ crowd: 3, robbers: [[10, 6]] }));
    expect(until(r, () => r.caught === 1, 10)).toBe(true);
    expect(r.status).toBe('play');
    const L = leaderOf(r);
    expect(L).not.toBeNull();
    expect(inCrowd(L)).toBe(true);
  });

  it('the leader bumping a robber with a full sack sets the friend free', () => {
    const r = createRun(map({ crowd: 3, robbers: [[10, 8.5]], hideouts: [[19.4, 59.4]] }));
    const rob = r.robbers[0];
    expect(until(r, () => rob.state === 'carry', 10)).toBe(true);
    const friend = rob.captive;
    expect(until(r, () => rob.state === 'dizzy', 10, (q) => {
      const L = leaderOf(q);
      setInput(q, rob.x - L.x, rob.y - L.y);
    })).toBe(true);
    expect(r.people[friend].state).toBe('crowd');
    expect(r.rescued).toBe(1);
    expect(crowdCount(r)).toBe(3);
    setInput(r, 0, 0);
    run(r, DIZZY_TIME - 0.2);
    expect(rob.state).toBe('dizzy'); // dizzy for a while, harmless
  });

  it('robbers cannot climb: the crowd on a roof is safe, and the robbers lose them', () => {
    const r = createRun(ladderMap({ crowd: 3, robbers: [[2, 2]] }));
    const rob = r.robbers[0];
    setInput(r, 0, 1);
    expect(until(r, (q) => q.people.every((p) => p.layer === 1 && p.state === 'crowd'), 15)).toBe(true);
    const caught = r.caught;
    setInput(r, 0, 0);
    let wasConfused = false;
    for (let t = 0; t < 20; t += DT) {
      step(r, DT);
      if (rob.state === 'confused') wasConfused = true;
      expect(insideRect(r.level.buildings[0], rob.x, rob.y)).toBe(false);
    }
    expect(r.caught).toBe(caught);
    expect(wasConfused).toBe(true);
    expect(crowdCount(r)).toBe(3);
  });

  it('a waiting robber stays put until someone comes near', () => {
    const r = createRun(map({ robbers: [[10, 40, 'wait']] }));
    run(r, 5);
    expect(r.robbers[0].state).toBe('wait');
    expect(r.robbers[0].y).toBe(40);
    setInput(r, 0, 1);
    expect(until(r, () => r.robbers[0].state === 'chase', 10)).toBe(true);
  });

  it('robbers go round buildings to reach the crowd', () => {
    // the robber is behind a long wall with a gap at the east end
    const r = createRun(map({ crowd: 1, start: [4, 4], buildings: [[0, 10, 16, 2, 3]], robbers: [[4, 16]] }));
    expect(until(r, () => r.caught === 1, 30)).toBe(true);
  });
});

describe('winning, losing and stars', () => {
  it('reaching the getaway wins and saves everyone in the crowd', () => {
    const r = createRun(map({ crowd: 5 }));
    setInput(r, 0, 1);
    expect(until(r, () => r.status === 'won', 30)).toBe(true);
    expect(r.saved).toBe(5);
    expect(r.stars).toBe(starsFor(5, 5));
    run(r, 2);
    expect(r.people.filter((p) => p.state === 'saved').length).toBeGreaterThan(0);
  });

  it('when everyone has been caught the level is lost', () => {
    const r = createRun(map({ crowd: 2, robbers: [[9, 7], [11, 7]] }));
    expect(until(r, () => r.status === 'lost', 20)).toBe(true);
    expect(crowdCount(r)).toBe(0);
  });

  it('one star for getting anyone out, two for three in five, three for 85%', () => {
    expect(starsFor(0, 20)).toBe(0);
    expect(starsFor(1, 20)).toBe(1);
    expect(starsFor(11, 20)).toBe(1);
    expect(starsFor(12, 20)).toBe(2);
    expect(starsFor(16, 20)).toBe(2);
    expect(starsFor(17, 20)).toBe(3);
    expect(starsFor(30, 30)).toBe(3);
    expect(starTargets(12)).toEqual([1, 8, 11]);
    // nobody starts a level already on two stars
    for (const d of LEVELS) expect(starsFor(d.crowd, buildLevel(d).total)).toBe(1);
  });
});

describe('determinism', () => {
  it('the same steering gives the same game', () => {
    const play = () => {
      const r = createRun(buildLevel(LEVELS[3], 3));
      const trace = [];
      for (let i = 0; i < 900; i++) {
        setInput(r, Math.sin(i / 40), 1);
        step(r, DT);
        if (i % 60 === 0) trace.push([...r.people.map((p) => p.x), ...r.robbers.map((q) => q.y)].map((v) => v.toFixed(4)).join());
      }
      return trace.join('|');
    };
    expect(play()).toBe(play());
  });
});

describe('levels', () => {
  it('there are nine, growing from 10 to 30 people, with more robbers and faster ones later', () => {
    expect(LEVELS.length).toBe(9);
    const built = LEVELS.map((d, i) => buildLevel(d, i));
    for (const lv of built) {
      expect(lv.total).toBeGreaterThanOrEqual(10);
      expect(lv.total).toBeLessThanOrEqual(30);
    }
    expect(built[8].total).toBe(30);
    for (let i = 1; i < built.length; i++) {
      expect(built[i].robberSpeed).toBeGreaterThanOrEqual(built[i - 1].robberSpeed);
      expect(built[i].robbers.length).toBeGreaterThanOrEqual(built[i - 1].robbers.length);
    }
    // level 1 is just running, with one robber; level 2 brings the first ladder, with a hint
    expect(built[0].links.length).toBe(0);
    expect(built[0].robbers.length).toBe(1);
    expect(built[1].links.some((l) => l.type === 'ladder' && l.hint)).toBe(true);
    expect(built[2].links.some((l) => l.type === 'hop')).toBe(true);
    expect(new Set(built.map((lv) => lv.goal.kind)).size).toBe(3);
  });

  for (let i = 0; i < LEVELS.length; i++) {
    const def = LEVELS[i];
    it(`${i + 1} ${def.name}: everything stands somewhere sensible and the getaway and every friend can be reached`, () => {
      const lv = buildLevel(def, i);
      const onStreet = (x, y) => x > PAD && x < lv.W - PAD && y > PAD && y < lv.L - PAD && lv.buildings.every((b) => !insideRect(b, x, y, PAD));
      expect(onStreet(lv.start.x, lv.start.y)).toBe(true);
      for (const r of lv.robbers) expect(onStreet(r.x, r.y), `robber ${r.x},${r.y}`).toBe(true);
      for (const h of lv.hideouts) expect(onStreet(h.x, h.y) || h.x <= 0.6 || h.x >= lv.W - 0.6, `hideout ${h.x},${h.y}`).toBe(true);
      for (const f of lv.friends) {
        if (f.layer === STREET) expect(onStreet(f.x, f.y), `friend ${f.x},${f.y}`).toBe(true);
        else expect(insideRect(lv.buildings[f.layer - 1], f.x, f.y, -PAD), `roof friend ${f.x},${f.y}`).toBe(true);
      }
      const g = lv.goal;
      for (const b of lv.buildings) expect(g.x + g.w <= b.x || g.x >= b.x + b.w || g.y + g.d <= b.y || g.y >= b.y + b.d).toBe(true);
      expect(g.y + g.d).toBeLessThanOrEqual(lv.L);
      // the street ends of ladders, trampolines, slides and zip lines are on the street
      for (const l of lv.links) {
        if (l.from === STREET) expect(onStreet((l.a0[0] + l.a1[0]) / 2, (l.a0[1] + l.a1[1]) / 2), `${l.type} ${l.id}`).toBe(true);
        if (l.to === STREET) expect(onStreet((l.b0[0] + l.b1[0]) / 2, (l.b0[1] + l.b1[1]) / 2), `${l.type} ${l.id}`).toBe(true);
      }
      const reach = reachability(lv);
      expect(reach.goal).toBe(true);
      reach.friends.forEach((ok, k) => expect(ok, `friend ${k}`).toBe(true));
    });

    it(`${i + 1} ${def.name}: the bot finishes with at least one star, collecting friends or going straight; doing nothing never wins`, async () => {
      const lv = buildLevel(def, i);
      for (const mode of ['all', 'goal']) {
        const r = createRun(lv);
        await playBot(r, mode, { maxSeconds: 240, yieldEvery: 30 });
        expect(r.status, mode).toBe('won');
        expect(r.stars, mode).toBeGreaterThanOrEqual(1);
        if (mode === 'all') expect(r.joined).toBe(lv.friends.length);
      }
      const idle = createRun(lv);
      for (let t = 0; t < 400 && idle.status === 'play'; t += DT) step(idle, DT);
      expect(idle.status).toBe('lost');
    });
  }
});
