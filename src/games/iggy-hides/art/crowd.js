// Helpers for packing a scene: scatter points over a region while keeping clear of hiding
// spots and of each other, and draw a list of things back to front by their feet.

// Up to n points in region { x0, y0, x1, y1 }, each at least gap from the others and from
// `taken` points, and outside every keep-out box { x, y, hw, hh }.
export function scatter(r, n, region, keepOut = [], gap = 60, taken = []) {
  const pts = [];
  const all = taken.slice();
  for (let tries = 0; pts.length < n && tries < n * 40; tries++) {
    const x = region.x0 + r() * (region.x1 - region.x0);
    const y = region.y0 + r() * (region.y1 - region.y0);
    if (keepOut.some((b) => Math.abs(x - b.x) < b.hw && Math.abs(y - b.y) < b.hh)) continue;
    if (all.some((p) => Math.abs(p.x - x) < gap * 1.4 && Math.abs(p.y - y) < gap * 0.6)) continue;
    const p = { x, y };
    pts.push(p);
    all.push(p);
  }
  return pts;
}

// Keep-out boxes around raw hiding spots, so crowds never sit on top of hidden things.
// The box reaches further down than up: someone standing just below a spot would cover it
// with their body, while things above it are behind.
export function keepOutOf(spots, hw = 75, up = 55, down = 150) {
  return spots.map((s) => ({ x: s.x, y: s.y + (down - up) / 2, hw, hh: (up + down) / 2 }));
}

// Collects things to draw and draws them sorted by y (things further down are in front).
export function depth() {
  const list = [];
  return {
    add(y, fn) {
      list.push([y, fn]);
    },
    draw() {
      list.sort((a, b) => a[0] - b[0]);
      for (const [, fn] of list) fn();
    },
  };
}
