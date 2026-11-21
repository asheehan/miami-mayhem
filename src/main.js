import { createGame, placeBlock, tick } from './game.js';
import { dealLevel } from './deal.js';
import { computeLayout, draw } from './render.js';
import { attachInput } from './input.js';
import { levels } from './levels/index.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const FAST = new URLSearchParams(location.search).has('fast');
const gameOptions = FAST ? { antSpeed: 48, spawnInterval: 0.06 } : {};

const view = { screen: 'play', state: null, drag: null, overlay: null, buttons: [], time: 0, progress: [] };
let layout = null;
let levelIndex = 0;

function startLevel(i) {
  levelIndex = i;
  const level = levels[i];
  const deal = dealLevel(level, (Date.now() >>> 0) || 1);
  view.state = createGame(level, deal, gameOptions);
  view.drag = null;
  view.overlay = null;
  view.screen = 'play';
  resize();
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  layout = computeLayout(w, h, levels[levelIndex]);
}

const hit = (r, x, y, pad = 0) => x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;

attachInput(canvas, {
  onPickUp(x, y) {
    const state = view.state;
    if (view.screen !== 'play' || !state || state.status !== 'playing') return false;
    const i = layout.pickerRects.findIndex((r) => hit(r, x, y));
    if (i === -1 || !state.picker[i]) return false;
    view.drag = { pickerIndex: i, x, y };
    return true;
  },
  onDrag(x, y) {
    if (view.drag) Object.assign(view.drag, { x, y });
  },
  onDrop(x, y) {
    const drag = view.drag;
    view.drag = null;
    if (!drag) return;
    const state = view.state;
    // Nearest empty slot whose rect, grown by half a block, contains the drop point.
    let best = -1;
    let bestD = Infinity;
    layout.slotRects.forEach((r, i) => {
      if (state.slots[i] || !hit(r, x, y, r.w / 2)) return;
      const d = Math.hypot(x - (r.x + r.w / 2), y - (r.y + r.h / 2));
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (best !== -1) placeBlock(state, drag.pickerIndex, best);
  },
  onTap() {},
});

window.addEventListener('resize', resize);

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  view.time += dt;
  if (view.state) tick(view.state, dt);
  draw(ctx, layout, view);
  requestAnimationFrame(frame);
}

startLevel(0);
requestAnimationFrame(frame);
