// Pixel Ants as a launcher game: its screens, input handling and saved progress.
// The shell (src/main.js) owns the canvas, the animation loop and pointer input.
import { createGame, placeBlock, tick } from './game.js';
import { dealLevel } from './deal.js';
import { computeLayout, draw, drawGameTile, homeButtons, overlayButtons, settingsButtons, PAGE_SIZE } from './render.js';
import { levels, doubled } from './levels/index.js';
import { HARD } from './constants.js';

// ?fast speeds ants up so a level can be checked quickly.
// ?nearest switches ants back to taking the closest pixel instead of clearing row by row.
const params = new URLSearchParams(location.search);
const FAST = params.has('fast');
const dealOptions = params.has('nearest') ? { targeting: 'nearest' } : {};
const gameOptions = { ...dealOptions, ...(FAST ? { antSpeed: 60, spawnInterval: 0.05 } : {}) };

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

const SETTINGS_KEY = 'pixel-ants-settings';

function loadDifficulty() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}').difficulty === 'hard' ? 'hard' : 'easy';
  } catch {
    return 'easy';
  }
}

function saveDifficulty(difficulty) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ difficulty }));
  } catch {
    // not kept if storage is unavailable
  }
}

// Completed pictures are remembered separately for each difficulty.
const suffixFor = (difficulty) => (difficulty === 'hard' ? ' (hard)' : '');

export const pixelAnts = {
  id: 'pixel-ants',
  title: 'Pixel Ants',
  // Picture for the launcher tile.
  drawTile: (ctx, x, y, w, h, time) => drawGameTile(ctx, levels[0], x, y, w, h, time),
  // host = { exit() } returns to the launcher.
  create,
};

function create(host) {
  const view = {
    screen: 'home',
    state: null,
    drag: null,
    overlay: null,
    overlayTime: 0,
    buttons: [],
    time: 0,
    progress: loadProgress(),
    page: 0,
    difficulty: loadDifficulty(),
    suffix: '',
    loading: false,
    levels,
  };
  view.suffix = suffixFor(view.difficulty);
  let playLevel = levels[0]; // the level being played, at the chosen difficulty
  let layout = null;
  let levelIndex = 0;
  let size = { w: 0, h: 0 };

  function relayout() {
    const { w, h } = size;
    if (view.screen === 'home') {
      layout = { width: w, height: h };
      view.buttons = homeButtons(w, h, levels, view.page);
    } else if (view.screen === 'settings') {
      layout = { width: w, height: h };
      view.buttons = settingsButtons(w, h);
    } else {
      layout = computeLayout(w, h, playLevel);
      view.buttons = view.overlay ? overlayButtons(w, h, view.overlay, levelIndex < levels.length - 1) : [];
    }
  }

  function resize(w, h) {
    size = { w, h };
    relayout();
  }

  function showHome() {
    view.screen = 'home';
    view.page = Math.floor(levelIndex / PAGE_SIZE);
    view.state = null;
    view.drag = null;
    view.overlay = null;
    relayout();
  }

  // Dealing a level can take a moment (it test-plays shuffles until one is winnable), so
  // show a message first and deal on the next turn of the event loop.
  function startLevel(i) {
    if (view.loading) return;
    view.loading = true;
    view.drag = null;
    setTimeout(() => {
      levelIndex = i;
      playLevel = view.difficulty === 'hard' ? doubled(levels[i], HARD) : levels[i];
      const deal = dealLevel(playLevel, Date.now() >>> 0 || 1, dealOptions);
      view.state = createGame(playLevel, deal, gameOptions);
      view.screen = 'play';
      view.overlay = null;
      view.loading = false;
      relayout();
    }, 40);
  }

  function showOverlay(kind) {
    view.overlay = kind;
    view.overlayTime = view.time;
    view.drag = null;
    if (kind === 'won') {
      const name = levels[levelIndex].name + view.suffix;
      if (!view.progress.includes(name)) {
        view.progress = [...view.progress, name];
        saveProgress(view.progress);
      }
    }
    relayout();
  }

  const hit = (r, x, y, pad = 0) =>
    x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;

  const handlers = {
    onPickUp(x, y) {
      const state = view.state;
      if (view.loading || view.screen !== 'play' || view.overlay || !state || state.status !== 'playing') return false;
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
      if (view.loading) return;
      const b = view.buttons.find((r) => hit(r, x, y));
      if (view.screen === 'settings') {
        if (!b) return;
        if (b.id === 'back') showHome();
        else {
          view.difficulty = b.id;
          view.suffix = suffixFor(b.id);
          saveDifficulty(b.id);
        }
        return;
      }
      if (view.screen === 'home') {
        if (!b) return;
        if (b.id === 'level') startLevel(b.index);
        else if (b.id === 'exit') host.exit();
        else if (b.id === 'settings') {
          view.screen = 'settings';
          relayout();
        } else {
          view.page += b.id === 'next' ? 1 : -1;
          relayout();
        }
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
  };

  function update(dt) {
    view.time += dt;
    const state = view.state;
    if (view.screen === 'play' && state) {
      tick(state, dt);
      if (!view.overlay && state.status !== 'playing') showOverlay(state.status);
    }
  }

  // Test hook for automated browser checks; harmless in normal play.
  if (FAST) window.__pixelAnts = { view, levels };

  return { resize, update, draw: (ctx) => draw(ctx, layout, view), ...handlers };
}
