// The shell: owns the canvas, the animation loop and pointer input, shows the launcher,
// and hands everything to whichever game is open.
import { attachInput } from './input.js';
import { games } from './games/index.js';
import { drawLauncher, launcherButtons, pageCount } from './launcher.js';
import { nextScale, refreshPeriod, steadyGap } from './pacing.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let size = { w: 0, h: 0 };
let active = null; // the open game, or null while the launcher is showing
const launcher = { games, buttons: [], time: 0 };
let page = 0; // which page of the launcher is showing
let swipe = null; // where a touch on the launcher began

// How many canvas pixels per CSS pixel. Never more than 2 (phones report 3, which is a lot
// of pixels to fill for no visible gain), and lowered a step when frames come too slowly.
const MAX_SCALE = 2;
let scale = Math.min(window.devicePixelRatio || 1, MAX_SCALE);
window.__renderScale = scale; // the 3D games read this for their own canvases
const perf = { fps: 60, work: 0, scale, show: new URLSearchParams(location.search).has('fps') };
window.__perf = perf;

function resize() {
  size = { w: canvas.clientWidth, h: canvas.clientHeight };
  canvas.width = Math.round(size.w * scale);
  canvas.height = Math.round(size.h * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
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

// Frame pacing: see pacing.js. Every couple of seconds the typical gap between frames is
// looked at, to learn the display's rate and to make the canvas coarser if a game is slow.
const gaps = [];
const pacing = { scale, tried: null, settled: false };
let period = 1000 / 60;

function pace(gap) {
  if (gap > 250) return; // a pause, not a slow frame
  gaps.push(gap);
  if (gaps.length < 120) return;
  gaps.sort((a, b) => a - b);
  const typical = gaps[gaps.length >> 1];
  gaps.length = 0;
  perf.fps = Math.round(1000 / typical);
  period = refreshPeriod(typical, period);
  if (!active) return;
  const next = nextScale(pacing, typical);
  if (next === scale) return;
  scale = next;
  perf.scale = scale;
  window.__renderScale = scale;
  resize();
}

function drawPerf() {
  const text = `${perf.fps} fps  ${perf.work.toFixed(1)} ms  x${perf.scale}`;
  ctx.save();
  ctx.font = '700 14px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(size.w / 2 - 80, size.h - 22, 160, 20);
  ctx.fillStyle = '#fff';
  ctx.fillText(text, size.w / 2 - 74, size.h - 19);
  ctx.restore();
}

let last = performance.now();
function frame(now) {
  const gap = now - last;
  const dt = Math.min(steadyGap(gap, period) / 1000, 0.05);
  last = now;
  const t0 = performance.now();
  if (active) {
    active.update(dt);
    active.draw(ctx);
  } else {
    launcher.time += dt;
    drawLauncher(ctx, size.w, size.h, launcher);
  }
  perf.work += (performance.now() - t0 - perf.work) * 0.05;
  pace(gap);
  if (perf.show) drawPerf();
  requestAnimationFrame(frame);
}

resize();
// ?game=<id> opens a game directly, for testing.
const direct = games.find((g) => g.id === new URLSearchParams(location.search).get('game'));
if (direct) open(direct);
requestAnimationFrame(frame);
