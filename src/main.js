// The shell: owns the canvas, the animation loop and pointer input, shows the launcher,
// and hands everything to whichever game is open.
import { attachInput } from './input.js';
import { games } from './games/index.js';
import { drawLauncher, launcherButtons } from './launcher.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let size = { w: 0, h: 0 };
let active = null; // the open game, or null while the launcher is showing
const launcher = { games, buttons: [], time: 0 };

function resize() {
  const dpr = window.devicePixelRatio || 1;
  size = { w: canvas.clientWidth, h: canvas.clientHeight };
  canvas.width = Math.round(size.w * dpr);
  canvas.height = Math.round(size.h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  launcher.buttons = launcherButtons(size.w, size.h, games);
  if (active) active.resize(size.w, size.h);
}

function open(game) {
  active = game.create({
    exit() {
      active = null;
    },
  });
  active.resize(size.w, size.h);
}

attachInput(canvas, {
  onPickUp: (x, y) => (active ? active.onPickUp(x, y) : false),
  onDrag: (x, y) => active?.onDrag(x, y),
  onDrop: (x, y) => active?.onDrop(x, y),
  onTap(x, y) {
    if (active) {
      active.onTap(x, y);
      return;
    }
    const b = launcher.buttons.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    if (b && b.id === 'game') open(games[b.index]);
  },
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
