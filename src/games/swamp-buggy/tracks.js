// The twelve Swamp Buggy courses, as data. Each course is built once at load by a little
// builder that lays ground control points left to right (metres, y up), and notes where the
// coins, oranges, mud, water, log bridges, gators, turtles, crates and beach balls go.
//
// A course: { name, look, pts: [[x, y]...], coins: [{ x, y, kind }], water: [{ x0, x1, y }],
//   mud: [{ x0, x1 }], logs: [{ x0, x1, y, bed }], bridges: [{ x0, x1, amp, period, bed }],
//   critters: [{ kind, x, y }], props: [{ kind, x }], startX, finishX }
// Looks: 'swamp' (sawgrass), 'mangrove' (tunnel with log bridges), 'beach' (dunes),
// 'causeway' (sunset bridge with big ramps).

const LAUNCH = 11.5; // m/s a buggy usually leaves a ramp at; used to lay orange arcs
const G = 14; // matches GRAVITY in sim.js
const r2 = (v) => Math.round(v * 100) / 100;

class Course {
  constructor(name, look) {
    this.c = { name, look, pts: [], coins: [], water: [], mud: [], logs: [], bridges: [], critters: [], props: [], ramps: [] };
    this.x = -40;
    this.y = 0;
    this.pts = this.c.pts;
    this.pts.push([this.x, this.y]);
    this.pending = []; // coins waiting for their ground to exist: { x, lift, kind }
    this.flat(40);
    this.c.startX = 2;
    this.flat(14);
  }

  to(x, y) {
    this.x = r2(x);
    this.y = r2(y);
    const last = this.pts[this.pts.length - 1];
    if (this.x - last[0] < 0.05) throw new Error(`${this.c.name}: points must move right (at ${this.x})`);
    this.pts.push([this.x, this.y]);
    return this;
  }

  flat(len) {
    return this.to(this.x + len, this.y);
  }

  line(len, dy) {
    return this.to(this.x + len, this.y + dy);
  }

  // a smooth piece: y = base + f(u) for u in 0..1, sampled every `res` metres
  shape(len, f, res = 1) {
    const x0 = this.x;
    const y0 = this.y;
    const n = Math.max(2, Math.ceil(len / res));
    for (let i = 1; i <= n; i++) this.to(x0 + (len * i) / n, y0 + f(i / n));
    return this;
  }

  // up and back down: a smooth hump `h` tall
  hill(len, h) {
    return this.shape(len, (u) => (h * (1 - Math.cos(Math.PI * 2 * u))) / 2);
  }

  // `count` little bumps `amp` tall
  bumps(len, amp, count) {
    return this.shape(len, (u) => (amp * (1 - Math.cos(Math.PI * 2 * count * u))) / 2, len / (count * 8));
  }

  // an S-curve up (or down) by dy
  rise(len, dy) {
    return this.shape(len, (u) => (dy * (1 - Math.cos(Math.PI * u))) / 2);
  }

  // a step up (or down) that's nearly a wall
  step(h) {
    return this.line(0.15, h);
  }

  coins(n, { gap = 2.2, lift = 1.1, at = 2, kind = 'coin' } = {}) {
    for (let i = 0; i < n; i++) this.pending.push({ x: this.x + at + i * gap, lift, kind });
    return this;
  }

  coinAt(dx, y, kind = 'orange') {
    this.c.coins.push({ x: r2(this.x + dx), y: r2(y), kind });
    return this;
  }

  // A kicker ramp `up` long and `h` tall with a sharp lip, a pit (water or dirt), a crest
  // `gap` past the lip and then a long downhill landing that ends `drop` below the kicker's
  // foot. `dip` first runs downhill into the kicker for speed. A slow buggy drops in the pit
  // and drives out up the far side. `arc` oranges follow the flight of a buggy leaving the
  // lip at `speed` m/s.
  jump({
    dip = 0, run = 14, up = 6, h = 1.6, gap = 8, depth = 0.9, land = 12, drop = 0,
    water = true, arc = 4, speed = LAUNCH, crest = 0.5,
  } = {}) {
    if (dip) this.rise(run, -dip);
    const y0 = this.y;
    this.shape(up, (u) => h * u ** 2, 0.6);
    const lipX = this.x;
    const lipY = this.y;
    const angle = Math.atan((2 * h) / up);
    this.c.ramps.push({ x: lipX, y: lipY, angle: r2(angle), speed });
    const crestH = h * crest;
    const climb = (crestH + depth) / 0.42;
    this.line(0.2, -(h + depth));
    const floorX = this.x;
    this.flat(Math.max(1, gap - 0.2 - climb));
    const climbX = this.x;
    this.line(climb, crestH + depth);
    if (water) {
      this.c.water.push({ x0: floorX, x1: r2(climbX + (climb * depth * 0.7) / (crestH + depth)), y: r2(y0 - depth * 0.3) });
    }
    this.rise(land, -(crestH + drop));
    return this.arc(lipX, lipY, angle, speed, arc);
  }

  // A big kicker at the top of a long downhill: the ground falls away under the flight for
  // lots of air. Nothing to fall into, so a slow buggy just rolls down the slope.
  skiJump({ dip = 0, run = 16, up = 8, h = 3, fall = 8, land = 26, arc = 6, speed = LAUNCH } = {}) {
    if (dip) this.rise(run, -dip);
    this.shape(up, (u) => h * u ** 2, 0.6);
    const lipX = this.x;
    const lipY = this.y;
    const angle = Math.atan((2 * h) / up);
    this.c.ramps.push({ x: lipX, y: lipY, angle: r2(angle), speed, ski: true });
    this.line(0.4, -h * 0.6);
    this.shape(land, (u) => -fall * (1 - Math.cos(Math.PI * u)) / 2, 0.8);
    return this.arc(lipX, lipY, angle, speed, arc);
  }

  // `n` oranges along the flight of a buggy leaving a lip at `speed`, until it comes down
  arc(lipX, lipY, angle, speed, n) {
    const vx = speed * Math.cos(angle);
    const vy = speed * Math.sin(angle);
    const lift = 1.3;
    let t = 0;
    while (t < 4) {
      t += 0.01;
      const x = lipX + vx * t;
      if (x > this.x || lipY + lift + vy * t - (G * t * t) / 2 < groundAt(this.pts, x) + lift) break;
    }
    for (let i = 1; i <= n; i++) {
      const ti = t * (0.1 + (0.75 * (i - 1)) / Math.max(1, n - 1));
      this.c.coins.push({ x: r2(lipX + vx * ti), y: r2(lipY + lift + vy * ti - (G * ti * ti) / 2), kind: 'orange' });
    }
    return this;
  }

  // a shallow puddle the buggy splashes through
  puddle(len, depth = 0.5) {
    const x0 = this.x;
    const y0 = this.y;
    this.rise(2.5, -depth).flat(len).rise(2.5, depth);
    this.c.water.push({ x0: r2(x0 + 0.4), x1: r2(this.x - 0.4), y: r2(y0 - 0.08) });
    return this;
  }

  mud(len) {
    const x0 = this.x;
    this.rise(1.5, -0.15).flat(len).rise(1.5, 0.15);
    this.c.mud.push({ x0: r2(x0 + 0.5), x1: r2(this.x - 0.5) });
    return this;
  }

  // a flat deck of logs over a creek
  logs(len, below = 1.6) {
    const x0 = this.x;
    this.flat(len);
    this.c.logs.push({ x0, x1: this.x, y: this.y, bed: r2(this.y - below) });
    return this;
  }

  // a rope-and-plank bridge that bobs up and down by `amp` in the middle
  bridge(len, amp = 0.9, period = 3.2, below = 2) {
    const x0 = this.x;
    for (let i = 0; i < Math.ceil(len / 0.5); i++) this.flat(len / Math.ceil(len / 0.5));
    this.c.bridges.push({ x0, x1: this.x, amp, period, bed: r2(this.y - below) });
    return this;
  }

  gator() {
    const x0 = this.x;
    const y0 = this.y;
    this.shape(2.8, (u) => 0.45 * Math.sin(Math.PI * u) ** 0.8, 0.35);
    this.c.critters.push({ kind: 'gator', x: r2(x0 + 1.4), y: y0 });
    return this;
  }

  turtle() {
    const x0 = this.x;
    const y0 = this.y;
    this.shape(1.2, (u) => 0.32 * Math.sin(Math.PI * u), 0.2);
    this.c.critters.push({ kind: 'turtle', x: r2(x0 + 0.6), y: y0 });
    return this;
  }

  prop(kind, dx = 2) {
    this.c.props.push({ kind, x: r2(this.x + dx) });
    return this;
  }

  done(run = 45) {
    this.flat(8);
    this.c.finishX = this.x;
    this.flat(run);
    const c = this.c;
    for (const p of this.pending) {
      if (p.x > c.finishX - 1) continue;
      c.coins.push({ x: r2(p.x), y: r2(groundAt(c.pts, p.x) + p.lift), kind: p.kind });
    }
    c.coins.sort((a, b) => a.x - b.x);
    return c;
  }
}

export function groundAt(pts, x) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if (x >= x0 && x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
}

const course = (name, look) => new Course(name, look);

export const LEVELS = [
  // ----- sawgrass swamp: gentle -----
  course('Sawgrass Start', 'swamp')
    .coins(6).flat(16)
    .coins(6, { lift: 1.3 }).bumps(16, 0.25, 4)
    .flat(10).coins(5).hill(24, 1.2)
    .flat(8).turtle().flat(10)
    .coins(6).bumps(18, 0.3, 4)
    .flat(10).jump({ up: 5, h: 0.9, gap: 5, depth: 0.5, water: false, arc: 3 })
    .coins(6).flat(16).hill(26, 1.6)
    .coins(6, { lift: 1.3 }).bumps(16, 0.3, 4)
    .flat(12).turtle().flat(8)
    .coins(5).hill(22, 1.2).flat(10)
    .jump({ up: 5, h: 1, gap: 5, depth: 0.5, arc: 3 })
    .coins(6).bumps(20, 0.3, 4).flat(10)
    .coins(5).hill(24, 1.4).flat(8)
    .turtle().flat(10).coins(5).flat(14)
    .done(),

  course('Bumpy Bayou', 'swamp')
    .coins(5).flat(12)
    .coins(6, { lift: 1.3 }).bumps(18, 0.4, 4)
    .flat(8).coins(4, { gap: 2.5 }).mud(10)
    .flat(10).coins(5).hill(24, 2)
    .flat(8).jump({ up: 5, h: 1.1, gap: 6, arc: 3 })
    .coins(5).flat(8).puddle(8)
    .flat(10).gator().flat(12)
    .coins(6).bumps(20, 0.45, 4)
    .flat(8).jump({ dip: 1, up: 5.5, h: 1.4, gap: 7, arc: 4 })
    .coins(5).hill(26, 2.2).flat(10)
    .coins(5).mud(12).flat(8)
    .coins(6, { lift: 1.3 }).bumps(18, 0.4, 4).flat(8)
    .gator().flat(10).coins(5).puddle(10, 0.5)
    .flat(8).jump({ dip: 1, up: 5.5, h: 1.4, gap: 7, arc: 4 })
    .coins(5).flat(14)
    .done(),

  course('Gator Hop', 'swamp')
    .coins(5).flat(12)
    .gator().flat(10).gator().flat(12)
    .coins(6).hill(26, 2.5)
    .flat(8).coins(4).puddle(10, 0.6)
    .flat(6).jump({ dip: 1.5, up: 6, h: 1.6, gap: 8, arc: 4, drop: 0.5 })
    .coins(5, { lift: 1.3 }).bumps(16, 0.45, 3)
    .flat(8).gator().flat(6).gator().flat(6).gator().flat(10)
    .coins(4).mud(12)
    .flat(6).jump({ dip: 1.5, up: 6, h: 1.8, gap: 9, arc: 4, drop: 0.5 })
    .coins(6).hill(30, 3).flat(8)
    .coins(5).bumps(16, 0.4, 3).flat(10)
    .gator().flat(8).coins(6).hill(24, 2).flat(8)
    .coins(4).puddle(10, 0.6).flat(8)
    .gator().flat(6).gator().flat(10)
    .coins(5).flat(14)
    .done(),

  // ----- mangrove tunnel: log bridges, steps, crates -----
  course('Log Bridge', 'mangrove')
    .coins(5).flat(12)
    .coins(5).logs(14)
    .flat(6).coins(5, { lift: 1.3 }).bumps(14, 0.45, 3)
    .flat(6).step(0.3).flat(10).step(0.3).flat(10)
    .coins(5).logs(16)
    .flat(6).jump({ dip: 1.5, up: 6, h: 1.6, gap: 8, arc: 4, drop: 0.5 })
    .coins(6).hill(26, 2.4)
    .flat(8).coins(6).logs(18)
    .flat(8).coins(5, { lift: 1.3 }).bumps(18, 0.5, 4)
    .flat(10).turtle().flat(10)
    .coins(5).step(0.3).flat(8).step(0.3).flat(8)
    .jump({ dip: 1.2, up: 6, h: 1.7, gap: 8, arc: 4, drop: 0.6 })
    .coins(6).logs(20).flat(8)
    .coins(5).hill(24, 2).flat(10)
    .coins(5).logs(14).flat(12)
    .done(),

  course('Mangrove Tunnel', 'mangrove')
    .coins(5).flat(12)
    .coins(5).hill(24, 2.5).flat(6)
    .prop('crate', 4).prop('crate', 5.2).flat(14)
    .coins(4).mud(12).flat(8)
    .step(0.35).flat(8).step(0.35).flat(8).step(-0.7).flat(10)
    .coins(6).logs(16)
    .flat(6).jump({ dip: 2, up: 6.5, h: 2, gap: 9, arc: 5, drop: 0.5 })
    .coins(5, { lift: 1.3 }).bumps(16, 0.55, 3)
    .flat(6).prop('crate', 4).prop('crate', 5.2).prop('crate', 6.4).flat(14)
    .coins(6).hill(30, 3.2)
    .flat(8).coins(4).puddle(10, 0.6).flat(10)
    .coins(6).logs(18).flat(6)
    .jump({ dip: 2, up: 6.5, h: 2, gap: 9, arc: 5, drop: 0.5 })
    .coins(5).step(0.4).flat(10).step(0.4).flat(10)
    .coins(5).mud(10).flat(8)
    .prop('crate', 4).prop('crate', 5.2).flat(14)
    .done(),

  course('Root Rumble', 'mangrove')
    .coins(5).flat(12)
    .coins(6, { lift: 1.4 }).bumps(20, 0.6, 4)
    .flat(8).coins(5).logs(14)
    .flat(6).gator().flat(10)
    .jump({ dip: 2, up: 6.5, h: 2.1, gap: 9, arc: 5, drop: 0.8 })
    .coins(5).hill(26, 3)
    .flat(8).coins(6).bridge(18, 0.6, 3.4)
    .flat(8).step(0.4).flat(8).step(0.4).flat(10)
    .coins(5, { lift: 1.4 }).bumps(18, 0.6, 4)
    .flat(8).coins(4).mud(12)
    .flat(6).jump({ dip: 2.5, up: 7, h: 2.3, gap: 10, arc: 5, drop: 1 })
    .coins(5).flat(10)
    .coins(6).logs(16).flat(6).gator().flat(10)
    .coins(5).hill(28, 3).flat(8)
    .rise(66, 5.5).flat(4).skiJump({ dip: 2.5, up: 7, h: 2.2, fall: 6, land: 24, arc: 5 })
    .coins(5).flat(14)
    .done(),

  // ----- beach dunes: big hills, balls, the first big air -----
  course('Dune Jumps', 'beach')
    .coins(5).flat(12)
    .coins(5).hill(26, 3)
    .flat(6).prop('ball', 4).flat(12)
    .jump({ dip: 2.5, up: 7, h: 2.3, gap: 10, arc: 5, drop: 1 })
    .coins(5).hill(28, 3.5)
    .flat(8).turtle().flat(8)
    .jump({ dip: 2.5, up: 7, h: 2.5, gap: 10, arc: 5, drop: 1 })
    .coins(6, { lift: 1.4 }).bumps(20, 0.6, 4)
    .flat(6).prop('ball', 4).prop('ball', 6).flat(12)
    .coins(5).hill(30, 4)
    .flat(8).rise(78, 6.5).flat(4).skiJump({ dip: 2.5, up: 7.5, h: 2.6, fall: 8, land: 26, arc: 6 })
    .coins(5).flat(14)
    .coins(6).hill(26, 3).flat(8).turtle().flat(10)
    .coins(5).bumps(18, 0.5, 3).flat(14)
    .done(),

  course('Beach Ball Bash', 'beach')
    .coins(5).flat(10)
    .prop('ball', 4).prop('ball', 6).prop('ball', 8).flat(16)
    .coins(5).hill(26, 3)
    .flat(8).coins(4).puddle(10, 0.6)
    .flat(6).jump({ dip: 2.5, up: 7, h: 2.4, gap: 10, arc: 5, drop: 1 })
    .coins(5).prop('ball', 6).prop('ball', 9).flat(16)
    .coins(6, { lift: 1.4 }).bumps(20, 0.7, 4)
    .flat(6).coins(4).puddle(12, 0.7)
    .flat(8).prop('crate', 4).prop('crate', 5.2).flat(12)
    .jump({ dip: 3, up: 7.5, h: 2.8, gap: 11, arc: 6, drop: 1.5 })
    .coins(5).hill(30, 4)
    .flat(8).prop('ball', 4).prop('ball', 5.5).prop('ball', 7).flat(14)
    .rise(78, 6.5).flat(4).skiJump({ dip: 2.5, up: 7.5, h: 2.6, fall: 8, land: 26, arc: 6 })
    .coins(6).bumps(20, 0.6, 4).flat(8)
    .coins(5).hill(26, 3).flat(8)
    .prop('ball', 4).prop('ball', 6).flat(14)
    .done(),

  course('Lighthouse Leap', 'beach')
    .coins(5).flat(12)
    .coins(5).hill(28, 4)
    .flat(6).step(0.4).flat(8).step(0.4).flat(8).rise(12, -0.8).flat(6)
    .jump({ dip: 2.5, up: 7.5, h: 2.6, gap: 11, arc: 5, drop: 1 })
    .coins(6, { lift: 1.5 }).bumps(22, 0.8, 4)
    .flat(8).turtle().flat(6).turtle().flat(10)
    .coins(5).hill(32, 4.5)
    .flat(6).prop('ball', 4).flat(10)
    .rise(90, 7.5).flat(4).skiJump({ dip: 2.5, up: 8, h: 3, fall: 10, land: 30, arc: 6 })
    .coins(5).flat(10)
    .coins(4).puddle(10, 0.7).flat(12)
    .coins(5).step(0.45).flat(8).step(0.45).flat(10)
    .coins(6).hill(28, 3.5).flat(10)
    .jump({ dip: 3, up: 7.5, h: 2.8, gap: 11, arc: 6, drop: 1.5 })
    .coins(5).flat(14)
    .done(),

  // ----- sunset causeway: fast, big ramps, the bobbing bridge -----
  course('Causeway Cruise', 'causeway')
    .coins(6).flat(16)
    .coins(5).hill(30, 3)
    .flat(10).jump({ dip: 3, run: 18, up: 8, h: 2.8, gap: 12, arc: 6, drop: 1.5 })
    .coins(6).flat(18)
    .coins(5, { lift: 1.5 }).bumps(20, 0.7, 4)
    .flat(10).jump({ dip: 3, run: 18, up: 8, h: 3, gap: 12, arc: 6, drop: 1.5 })
    .coins(5).hill(32, 3.5)
    .flat(8).prop('crate', 4).prop('crate', 5.2).prop('crate', 6.4).flat(14)
    .rise(102, 8.5).flat(4).skiJump({ dip: 5, run: 26, up: 5, h: 2.5, fall: 15, land: 34, arc: 7 })
    .coins(6).flat(16)
    .coins(5).hill(30, 3).flat(12)
    .coins(6, { lift: 1.5 }).bumps(20, 0.7, 4).flat(10)
    .jump({ dip: 3.5, run: 18, up: 8.5, h: 3.2, gap: 13, arc: 6, drop: 2 })
    .coins(5).flat(14)
    .done(),

  course('Drawbridge Dash', 'causeway')
    .coins(5).flat(14)
    .coins(6).bridge(20, 0.8, 3.2)
    .flat(10).coins(5).hill(28, 3)
    .flat(8).jump({ dip: 3, run: 18, up: 8, h: 2.8, gap: 12, arc: 6, drop: 1.5 })
    .coins(6).bridge(24, 1, 3.6)
    .flat(10).coins(5, { lift: 1.5 }).bumps(20, 0.7, 4)
    .flat(8).step(0.4).flat(8).step(0.45).flat(8).rise(10, -0.85).flat(6)
    .jump({ dip: 3.5, run: 18, up: 8.5, h: 3.2, gap: 13, arc: 6, drop: 2 })
    .coins(6).bridge(22, 1.1, 3)
    .flat(10).coins(5).hill(30, 3.5)
    .flat(8).rise(102, 8.5).flat(4).skiJump({ dip: 5, run: 26, up: 5, h: 2.5, fall: 15, land: 34, arc: 7 })
    .coins(5).flat(10)
    .coins(6).bridge(18, 0.9, 2.8).flat(10)
    .coins(5).hill(26, 3).flat(14)
    .done(),

  course('Sunset Super Jump', 'causeway')
    .coins(5).flat(14)
    .coins(5).hill(30, 3.5)
    .flat(8).jump({ dip: 3, run: 18, up: 8, h: 3, gap: 12, arc: 6, drop: 1.5 })
    .coins(6).bridge(22, 1, 3.2)
    .flat(8).coins(5, { lift: 1.5 }).bumps(22, 0.8, 4)
    .flat(8).gator().flat(8).gator().flat(10)
    .rise(102, 8.5).flat(4).skiJump({ dip: 2.5, up: 8, h: 3, fall: 10, land: 30, arc: 7 })
    .coins(6).flat(14)
    .coins(5).hill(30, 3.5)
    .flat(6).prop('ball', 4).prop('crate', 6).prop('ball', 8).flat(14)
    .jump({ dip: 3.5, run: 18, up: 8.5, h: 3.2, gap: 13, arc: 6, drop: 2 })
    .coins(6).bridge(20, 1, 3).flat(10)
    .coins(5, { lift: 1.3 }).rise(150, 12).flat(4).skiJump({ dip: 6, run: 30, up: 5, h: 2.5, fall: 18, land: 36, arc: 8 })
    .coins(6).flat(16)
    .done(),
];

export const LOOKS = ['swamp', 'mangrove', 'beach', 'causeway'];
