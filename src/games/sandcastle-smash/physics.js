// A small 2D rigid-body engine for Sandcastle Smash: boxes and circles, gravity, friction,
// a bit of bounce. Sequential impulses with warm starting (carrying each contact's impulse
// over from the last step) so stacks rest quietly. Fixed timestep, no randomness and plain
// data only, so the same inputs always give the same world and a world can be copied with
// structuredClone. World units are metres, y up.

export const GRAVITY = -12;
export const DT = 1 / 60;
const ITERATIONS = 16; // fewer and a tower of eight starts to sway
const ALLOWED_PEN = 0.01; // overlap allowed before position correction pushes back
const BIAS = 0.2; // how much of the overlap is corrected per step
const MARGIN = 0.02; // broad phase slack
const BOUNCE_MIN = 1; // closing speeds below this never bounce
const ROLL_DRAG = 1.2; // a rolling ball slows by this fraction per second while touching something
const ROLL_STOP = 0.05; // and a touching ball slower than this (m/s) comes to a stop, so balls rest

export function createWorld() {
  return { bodies: [], arbiters: new Map(), nextId: 1 };
}

// o: { shape: 'box', width, height } or { shape: 'circle', r }, plus x, y, a, density (0 = static),
// friction, bounce, and anything else the game wants kept on the body.
export function addBody(world, o) {
  // `w` on a body is its spin rate; a box keeps its size as half extents hw and hh
  const b = {
    vx: 0, vy: 0, a: 0, friction: 0.6, bounce: 0, ...o,
    w: 0, id: world.nextId++, contacts: 0,
  };
  if (b.shape === 'box') {
    b.hw = o.width / 2;
    b.hh = o.height / 2;
  }
  if (!o.density) {
    b.m = 0;
    b.im = 0;
    b.iI = 0;
  } else if (b.shape === 'box') {
    b.m = o.density * b.hw * 2 * b.hh * 2;
    b.im = 1 / b.m;
    const I = (b.m * (4 * b.hw * b.hw + 4 * b.hh * b.hh)) / 12;
    b.iI = 1 / I;
  } else {
    b.m = o.density * Math.PI * b.r * b.r;
    b.im = 1 / b.m;
    b.iI = 1 / ((b.m * b.r * b.r) / 2);
  }
  world.bodies.push(b);
  return b;
}

export function removeBody(world, b) {
  const i = world.bodies.indexOf(b);
  if (i >= 0) world.bodies.splice(i, 1);
  b.dead = true;
}

export function aabb(b) {
  if (b.shape === 'circle') return [b.x - b.r, b.y - b.r, b.x + b.r, b.y + b.r];
  const c = Math.abs(Math.cos(b.a));
  const s = Math.abs(Math.sin(b.a));
  const ex = c * b.hw + s * b.hh;
  const ey = s * b.hw + c * b.hh;
  return [b.x - ex, b.y - ey, b.x + ex, b.y + ey];
}

// ---------- narrow phase ----------
// Each returns contacts { x, y, nx, ny, sep, key } with the normal pointing from a to b.

const NO_EDGE = 0;
const EDGE1 = 1;
const EDGE2 = 2;
const EDGE3 = 3;
const EDGE4 = 4;

const cv = (x, y, in1 = 0, out1 = 0, in2 = 0, out2 = 0) => ({ x, y, in1, out1, in2, out2 });

function clipSegment(vIn, nx, ny, offset, clipEdge) {
  const out = [];
  const d0 = nx * vIn[0].x + ny * vIn[0].y - offset;
  const d1 = nx * vIn[1].x + ny * vIn[1].y - offset;
  if (d0 <= 0) out.push(vIn[0]);
  if (d1 <= 0) out.push(vIn[1]);
  if (d0 * d1 < 0) {
    const t = d0 / (d0 - d1);
    const v = cv(vIn[0].x + t * (vIn[1].x - vIn[0].x), vIn[0].y + t * (vIn[1].y - vIn[0].y));
    if (d0 > 0) {
      Object.assign(v, { in1: clipEdge, out1: vIn[0].out1, in2: NO_EDGE, out2: vIn[0].out2 });
    } else {
      Object.assign(v, { in1: vIn[1].in1, out1: clipEdge, in2: vIn[1].in2, out2: NO_EDGE });
    }
    out.push(v);
  }
  return out;
}

function incidentEdge(hx, hy, px, py, c, s, nx, ny) {
  // the reference normal in the incident box's frame, flipped
  const lx = -(c * nx + s * ny);
  const ly = -(-s * nx + c * ny);
  let v;
  if (Math.abs(lx) > Math.abs(ly)) {
    v = lx > 0
      ? [cv(hx, -hy, 0, 0, EDGE3, EDGE4), cv(hx, hy, 0, 0, EDGE4, EDGE1)]
      : [cv(-hx, hy, 0, 0, EDGE1, EDGE2), cv(-hx, -hy, 0, 0, EDGE2, EDGE3)];
  } else {
    v = ly > 0
      ? [cv(hx, hy, 0, 0, EDGE4, EDGE1), cv(-hx, hy, 0, 0, EDGE1, EDGE2)]
      : [cv(-hx, -hy, 0, 0, EDGE2, EDGE3), cv(hx, -hy, 0, 0, EDGE3, EDGE4)];
  }
  for (const p of v) {
    const x = p.x;
    p.x = px + c * x - s * p.y;
    p.y = py + s * x + c * p.y;
  }
  return v;
}

function collideBoxes(A, B) {
  const cA = Math.cos(A.a), sA = Math.sin(A.a);
  const cB = Math.cos(B.a), sB = Math.sin(B.a);
  const dpx = B.x - A.x, dpy = B.y - A.y;
  const dAx = cA * dpx + sA * dpy, dAy = -sA * dpx + cA * dpy;
  const dBx = cB * dpx + sB * dpy, dBy = -sB * dpx + cB * dpy;
  // the relative rotation, made absolute
  const d = B.a - A.a;
  const ac = Math.abs(Math.cos(d)), as = Math.abs(Math.sin(d));
  const faceAx = Math.abs(dAx) - A.hw - (ac * B.hw + as * B.hh);
  const faceAy = Math.abs(dAy) - A.hh - (as * B.hw + ac * B.hh);
  if (faceAx > 0 || faceAy > 0) return [];
  const faceBx = Math.abs(dBx) - (ac * A.hw + as * A.hh) - B.hw;
  const faceBy = Math.abs(dBy) - (as * A.hw + ac * A.hh) - B.hh;
  if (faceBx > 0 || faceBy > 0) return [];

  const relTol = 0.95, absTol = 0.01;
  let axis = 0;
  let sep = faceAx;
  let nx = dAx > 0 ? cA : -cA, ny = dAx > 0 ? sA : -sA;
  if (faceAy > relTol * sep + absTol * A.hh) {
    axis = 1; sep = faceAy;
    nx = dAy > 0 ? -sA : sA; ny = dAy > 0 ? cA : -cA;
  }
  if (faceBx > relTol * sep + absTol * B.hw) {
    axis = 2; sep = faceBx;
    nx = dBx > 0 ? cB : -cB; ny = dBx > 0 ? sB : -sB;
  }
  if (faceBy > relTol * sep + absTol * B.hh) {
    axis = 3; sep = faceBy;
    nx = dBy > 0 ? -sB : sB; ny = dBy > 0 ? cB : -cB;
  }

  let fnx, fny, front, snx, sny, negSide, posSide, negEdge, posEdge, inc;
  if (axis === 0) {
    fnx = nx; fny = ny; front = A.x * fnx + A.y * fny + A.hw;
    snx = -sA; sny = cA; const side = A.x * snx + A.y * sny;
    negSide = -side + A.hh; posSide = side + A.hh; negEdge = EDGE3; posEdge = EDGE1;
    inc = incidentEdge(B.hw, B.hh, B.x, B.y, cB, sB, fnx, fny);
  } else if (axis === 1) {
    fnx = nx; fny = ny; front = A.x * fnx + A.y * fny + A.hh;
    snx = cA; sny = sA; const side = A.x * snx + A.y * sny;
    negSide = -side + A.hw; posSide = side + A.hw; negEdge = EDGE2; posEdge = EDGE4;
    inc = incidentEdge(B.hw, B.hh, B.x, B.y, cB, sB, fnx, fny);
  } else if (axis === 2) {
    fnx = -nx; fny = -ny; front = B.x * fnx + B.y * fny + B.hw;
    snx = -sB; sny = cB; const side = B.x * snx + B.y * sny;
    negSide = -side + B.hh; posSide = side + B.hh; negEdge = EDGE3; posEdge = EDGE1;
    inc = incidentEdge(A.hw, A.hh, A.x, A.y, cA, sA, fnx, fny);
  } else {
    fnx = -nx; fny = -ny; front = B.x * fnx + B.y * fny + B.hh;
    snx = cB; sny = sB; const side = B.x * snx + B.y * sny;
    negSide = -side + B.hw; posSide = side + B.hw; negEdge = EDGE2; posEdge = EDGE4;
    inc = incidentEdge(A.hw, A.hh, A.x, A.y, cA, sA, fnx, fny);
  }

  const c1 = clipSegment(inc, -snx, -sny, negSide, negEdge);
  if (c1.length < 2) return [];
  const c2 = clipSegment(c1, snx, sny, posSide, posEdge);
  if (c2.length < 2) return [];

  const out = [];
  for (const p of c2) {
    const s = fnx * p.x + fny * p.y - front;
    if (s > 0) continue;
    let { in1, out1, in2, out2 } = p;
    if (axis >= 2) [in1, in2, out1, out2] = [in2, in1, out2, out1];
    out.push({ x: p.x - s * fnx, y: p.y - s * fny, nx, ny, sep: s, key: in1 | (out1 << 4) | (in2 << 8) | (out2 << 12) });
  }
  return out;
}

// normal from the box toward the circle
function collideBoxCircle(box, cir) {
  const c = Math.cos(box.a), s = Math.sin(box.a);
  const dx = cir.x - box.x, dy = cir.y - box.y;
  const lx = c * dx + s * dy, ly = -s * dx + c * dy;
  let nlx, nly, sep, px, py;
  if (Math.abs(lx) <= box.hw && Math.abs(ly) <= box.hh) {
    // centre inside the box: push out through the nearest face
    const ox = box.hw - Math.abs(lx), oy = box.hh - Math.abs(ly);
    if (ox < oy) {
      nlx = lx >= 0 ? 1 : -1; nly = 0; sep = -ox - cir.r; px = nlx * box.hw; py = ly;
    } else {
      nlx = 0; nly = ly >= 0 ? 1 : -1; sep = -oy - cir.r; px = lx; py = nly * box.hh;
    }
  } else {
    px = Math.max(-box.hw, Math.min(box.hw, lx));
    py = Math.max(-box.hh, Math.min(box.hh, ly));
    const ex = lx - px, ey = ly - py;
    const dist = Math.hypot(ex, ey);
    if (dist > cir.r) return [];
    nlx = ex / dist; nly = ey / dist; sep = dist - cir.r;
  }
  return [{
    x: box.x + c * px - s * py, y: box.y + s * px + c * py,
    nx: c * nlx - s * nly, ny: s * nlx + c * nly, sep, key: 1,
  }];
}

function collideCircles(A, B) {
  const dx = B.x - A.x, dy = B.y - A.y;
  const d = Math.hypot(dx, dy);
  if (d > A.r + B.r) return [];
  const nx = d > 1e-9 ? dx / d : 0, ny = d > 1e-9 ? dy / d : 1;
  return [{ x: A.x + nx * A.r, y: A.y + ny * A.r, nx, ny, sep: d - A.r - B.r, key: 1 }];
}

export function collide(A, B) {
  if (A.shape === 'box' && B.shape === 'box') return collideBoxes(A, B);
  if (A.shape === 'circle' && B.shape === 'circle') return collideCircles(A, B);
  if (A.shape === 'box') return collideBoxCircle(A, B);
  const cs = collideBoxCircle(B, A);
  for (const k of cs) {
    k.nx = -k.nx;
    k.ny = -k.ny;
  }
  return cs;
}

// Relative velocity of b against a at a contact, along its normal (negative = closing).
export function closingSpeed(arb, k) {
  const { a, b } = arb;
  const r1x = k.x - a.x, r1y = k.y - a.y, r2x = k.x - b.x, r2y = k.y - b.y;
  const dvx = b.vx - b.w * r2y - a.vx + a.w * r1y;
  const dvy = b.vy + b.w * r2x - a.vy - a.w * r1x;
  return dvx * k.nx + dvy * k.ny;
}

// ---------- the step ----------

// Find every touching pair, keeping last step's impulses for contacts that persist.
export function findContacts(world) {
  const bodies = world.bodies;
  const n = bodies.length;
  const boxes = bodies.map(aabb);
  const old = world.arbiters;
  const next = new Map();
  for (const b of bodies) b.contacts = 0;
  for (let i = 0; i < n; i++) {
    const A = bodies[i];
    const ba = boxes[i];
    for (let j = i + 1; j < n; j++) {
      const B = bodies[j];
      if (!A.im && !B.im) continue;
      const bb = boxes[j];
      if (ba[0] > bb[2] + MARGIN || bb[0] > ba[2] + MARGIN || ba[1] > bb[3] + MARGIN || bb[1] > ba[3] + MARGIN) continue;
      const cs = collide(A, B);
      if (!cs.length) continue;
      const key = `${A.id},${B.id}`;
      const prev = old.get(key);
      for (const k of cs) {
        const p = prev && prev.contacts.find((q) => q.key === k.key);
        k.Pn = p ? p.Pn : 0;
        k.Pt = p ? p.Pt : 0;
      }
      A.contacts++;
      B.contacts++;
      next.set(key, {
        key, a: A, b: B, contacts: cs,
        friction: Math.sqrt(A.friction * B.friction), bounce: Math.max(A.bounce, B.bounce),
      });
    }
  }
  world.arbiters = next;
  return next;
}

export function applyGravity(world, dt = DT) {
  for (const b of world.bodies) {
    if (!b.im) continue;
    b.vy += GRAVITY * dt;
  }
}

// Solve the contacts and move everything one step.
export function solve(world, dt = DT) {
  const invDt = 1 / dt;
  const arbs = [...world.arbiters.values()];
  for (const arb of arbs) {
    const { a, b } = arb;
    for (const k of arb.contacts) {
      const r1x = k.x - a.x, r1y = k.y - a.y, r2x = k.x - b.x, r2y = k.y - b.y;
      const rn1 = r1x * k.nx + r1y * k.ny, rn2 = r2x * k.nx + r2y * k.ny;
      const kN = a.im + b.im + a.iI * (r1x * r1x + r1y * r1y - rn1 * rn1) + b.iI * (r2x * r2x + r2y * r2y - rn2 * rn2);
      k.mN = 1 / kN;
      const tx = k.ny, ty = -k.nx;
      const rt1 = r1x * tx + r1y * ty, rt2 = r2x * tx + r2y * ty;
      const kT = a.im + b.im + a.iI * (r1x * r1x + r1y * r1y - rt1 * rt1) + b.iI * (r2x * r2x + r2y * r2y - rt2 * rt2);
      k.mT = 1 / kT;
      k.bias = -BIAS * invDt * Math.min(0, k.sep + ALLOWED_PEN);
      if (arb.bounce > 0) {
        const vn = closingSpeed(arb, k);
        if (vn < -BOUNCE_MIN) k.bias = Math.max(k.bias, -arb.bounce * vn);
      }
      // warm start
      const Px = k.Pn * k.nx + k.Pt * tx, Py = k.Pn * k.ny + k.Pt * ty;
      a.vx -= a.im * Px; a.vy -= a.im * Py; a.w -= a.iI * (r1x * Py - r1y * Px);
      b.vx += b.im * Px; b.vy += b.im * Py; b.w += b.iI * (r2x * Py - r2y * Px);
    }
  }
  for (let it = 0; it < ITERATIONS; it++) {
    for (const arb of arbs) {
      const { a, b } = arb;
      for (const k of arb.contacts) {
        const r1x = k.x - a.x, r1y = k.y - a.y, r2x = k.x - b.x, r2y = k.y - b.y;
        let dvx = b.vx - b.w * r2y - a.vx + a.w * r1y;
        let dvy = b.vy + b.w * r2x - a.vy - a.w * r1x;
        const vn = dvx * k.nx + dvy * k.ny;
        let dPn = k.mN * (-vn + k.bias);
        const Pn0 = k.Pn;
        k.Pn = Math.max(Pn0 + dPn, 0);
        dPn = k.Pn - Pn0;
        let Px = dPn * k.nx, Py = dPn * k.ny;
        a.vx -= a.im * Px; a.vy -= a.im * Py; a.w -= a.iI * (r1x * Py - r1y * Px);
        b.vx += b.im * Px; b.vy += b.im * Py; b.w += b.iI * (r2x * Py - r2y * Px);

        dvx = b.vx - b.w * r2y - a.vx + a.w * r1y;
        dvy = b.vy + b.w * r2x - a.vy - a.w * r1x;
        const tx = k.ny, ty = -k.nx;
        const vt = dvx * tx + dvy * ty;
        let dPt = k.mT * -vt;
        const maxPt = arb.friction * k.Pn;
        const Pt0 = k.Pt;
        k.Pt = Math.max(-maxPt, Math.min(maxPt, Pt0 + dPt));
        dPt = k.Pt - Pt0;
        Px = dPt * tx; Py = dPt * ty;
        a.vx -= a.im * Px; a.vy -= a.im * Py; a.w -= a.iI * (r1x * Py - r1y * Px);
        b.vx += b.im * Px; b.vy += b.im * Py; b.w += b.iI * (r2x * Py - r2y * Px);
      }
    }
  }
  for (const b of world.bodies) {
    if (!b.im) continue;
    if (b.shape === 'circle' && b.contacts > 0) {
      const k = 1 / (1 + ROLL_DRAG * dt);
      b.w *= k;
      b.vx *= 1 / (1 + ROLL_DRAG * 0.25 * dt);
      if (Math.hypot(b.vx, b.vy) < ROLL_STOP && Math.abs(b.w * b.r) < ROLL_STOP) {
        b.vx *= 0.5;
        b.w *= 0.5;
      }
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.a += b.w * dt;
  }
}
