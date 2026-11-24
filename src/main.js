// The shell: owns the canvas, the animation loop and pointer input, shows the launcher,
// and hands everything to whichever game is open.
import { attachInput } from './input.js';
import { games } from './games/index.js';
import { drawLauncher, launcherButtons, pageCount } from './launcher.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let size = { w: 0, h: 0 };
let active = null; // the open game, or null while the launcher is showing
const launcher = { games, buttons: [], time: 0 };
let page = 0; // which page of the launcher is showing
let swipe = null; // where a touch on the launcher began

function resize() {
  const dpr = window.devicePixelRatio || 1;
  size = { w: canvas.clientWidth, h: canvas.clientHeight };
  canvas.width = Math.round(size.w * dpr);
  canvas.height = Math.round(size.h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  launcher.buttons = launcherButtons(size.w, size.h, games, page);
  if (active) active.resize(size.w, size.h);
}

function open(game) {
  active = game.create({
    canvas,
    exit() {
      active = null;
    },
  });
  active.resize(size.w, size.h);
}

function turnPage(by) {
  const next = Math.min(pageCount(games) - 1, Math.max(0, page + by));
  if (next === page) return;
  page = next;
  launcher.buttons = launcherButtons(size.w, size.h, games, page);
}

// A touch on the launcher: a sideways swipe turns the page, anything else is a tap.
function launcherTouch(x0, y0, x, y) {
  const dx = x - x0;
  if (Math.abs(dx) > Math.max(40, size.w * 0.1) && Math.abs(dx) > Math.abs(y - y0) * 1.5) {
    turnPage(dx < 0 ? 1 : -1);
    return;
  }
  const pad = 16; // the arrows are small, so they take near misses too
  const b = launcher.buttons.find((r) => {
    const p = r.id === 'prev' || r.id === 'next' ? pad : 0;
    return x >= r.x - p && x <= r.x + r.w + p && y >= r.y - p && y <= r.y + r.h + p;
  });
  if (!b) {
    // anywhere along the arrows' row counts: left of the dots goes back, right goes on
    const dots = launcher.buttons.find((r) => r.id === 'dots');
    if (dots && y >= dots.y - pad) turnPage(x < dots.x + dots.w / 2 ? -1 : 1);
    return;
  }
  if (b.id === 'dots') return turnPage(x < b.x + b.w / 2 ? -1 : 1);
  if (b.id === 'game') open(games[b.index]);
  else if (b.id === 'prev') turnPage(-1);
  else if (b.id === 'next') turnPage(1);
}

attachInput(canvas, {
  onPickUp(x, y) {
    if (active) return active.onPickUp(x, y);
    swipe = { x, y };
    return true;
  },
  onDrag: (x, y) => active?.onDrag(x, y),
  onDrop(x, y) {
    if (swipe) {
      const s = swipe;
      swipe = null;
      if (!active) launcherTouch(s.x, s.y, x, y);
      return;
    }
    active?.onDrop(x, y);
  },
  onTap: (x, y) => active?.onTap(x, y),
});

window.addEventListener('resize', resize);

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (active) {
    active.update(dt);
    active.draw(ctx);
  } else {
    launcher.time += dt;
    drawLauncher(ctx, size.w, size.h, launcher);
  }
  requestAnimationFrame(frame);
}

resize();
// ?game=<id> opens a game directly, for testing.
const direct = games.find((g) => g.id === new URLSearchParams(location.search).get('game'));
if (direct) open(direct);
requestAnimationFrame(frame);
