// Screens, animation loop and saved progress.
import { createGame, placeBlock, tick } from './game.js';
import { dealLevel } from './deal.js';
import { computeLayout, draw, homeButtons, overlayButtons } from './render.js';
import { attachInput } from './input.js';
import { levels } from './levels/index.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ?fast speeds ants up so a level can be checked quickly.
const FAST = new URLSearchParams(location.search).has('fast');
const gameOptions = FAST ? { antSpeed: 60, spawnInterval: 0.05 } : {};

const PROGRESS_KEY = 'pixel-ants-progress';

function loadProgress() {
  try {
    const v = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveProgress(names) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(names));
  } catch {
    // storage can be unavailable (private mode); progress just isn't kept
  }
}

const view = {
  screen: 'home',
  state: null,
  drag: null,
  overlay: null,
  overlayTime: 0,
  buttons: [],
  time: 0,
  progress: loadProgress(),
  levels,
};
let layout = null;
let levelIndex = 0;
let size = { w: 0, h: 0 };

function relayout() {
  const { w, h } = size;
  if (view.screen === 'home') {
    layout = { width: w, height: h };
    view.buttons = homeButtons(w, h, levels);
  } else {
    layout = computeLayout(w, h, levels[levelIndex]);
    view.buttons = view.overlay ? overlayButtons(w, h, view.overlay, levelIndex < levels.length - 1) : [];
  }
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  size = { w: canvas.clientWidth, h: canvas.clientHeight };
  canvas.width = Math.round(size.w * dpr);
  canvas.height = Math.round(size.h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  relayout();
}

function showHome() {
  view.screen = 'home';
  view.state = null;
  view.drag = null;
  view.overlay = null;
  relayout();
}

function startLevel(i) {
  levelIndex = i;
  const level = levels[i];
  const deal = dealLevel(level, Date.now() >>> 0 || 1);
  view.state = createGame(level, deal, gameOptions);
  view.screen = 'play';
  view.drag = null;
  view.overlay = null;
  relayout();
}

function showOverlay(kind) {
  view.overlay = kind;
  view.overlayTime = view.time;
  view.drag = null;
  if (kind === 'won') {
    const name = levels[levelIndex].name;
    if (!view.progress.includes(name)) {
      view.progress = [...view.progress, name];
      saveProgress(view.progress);
    }
  }
  relayout();
}

const hit = (r, x, y, pad = 0) =>
  x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;

attachInput(canvas, {
  onPickUp(x, y) {
    const state = view.state;
    if (view.screen !== 'play' || view.overlay || !state || state.status !== 'playing') return false;
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
    if (!drag || !view.state) return;
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
  onTap(x, y) {
    const b = view.buttons.find((r) => hit(r, x, y));
    if (view.screen === 'home') {
      if (b) startLevel(b.index);
      return;
    }
    if (view.overlay) {
      if (!b) return;
      if (b.id === 'next') startLevel(levelIndex + 1);
      else if (b.id === 'home') showHome();
      else if (b.id === 'retry') startLevel(levelIndex);
      return;
    }
    if (hit(layout.homeBtn, x, y)) showHome();
  },
});

window.addEventListener('resize', resize);

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  view.time += dt;
  const state = view.state;
  if (view.screen === 'play' && state) {
    tick(state, dt);
    if (!view.overlay && state.status !== 'playing') showOverlay(state.status);
  }
  draw(ctx, layout, view);
  requestAnimationFrame(frame);
}

resize();
requestAnimationFrame(frame);

// Test hook for automated browser checks; harmless in normal play.
if (FAST) window.__pixelAnts = { view, levels };
