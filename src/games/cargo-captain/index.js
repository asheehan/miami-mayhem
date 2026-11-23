// Cargo Captain as a launcher game: menu, voyage picker, play, voyage-complete screen,
// drag-and-drop input and saved stars. Rules live in sim.js, puzzles in levels.js, drawing in
// draw.js.
import { VOYAGES, generateVoyage } from './levels.js';
import {
  FIELD_W, FIELD_H, createVoyage, step, layout, pickAt, moveHeld, dropHeld, answer, parseProgress, serializeProgress, unlocked,
} from './sim.js';
import { nextMove, doMove, playVoyage } from './bot.js';
import {
  C, font, roundRect, outlined, drawStar, drawButton, drawIconButton, drawLock, createRenderer, drawTile,
  drawToyShip, drawHarbour, drawFrontWater, drawCrate,
} from './draw.js';

const SAVE_KEY = 'cargo-captain-progress';
const WIN_BUTTON_DELAY = 1.6; // seconds after the voyage ends before Next shows
const CHOICE_Y = 668; // field y of the number choices on a mystery puzzle
const CHOICE_R = 46;

export function loadProgress() {
  try {
    return parseProgress(localStorage.getItem(SAVE_KEY) || '{}', VOYAGES.length);
  } catch {
    return parseProgress(null, VOYAGES.length);
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(SAVE_KEY, serializeProgress(progress));
  } catch {
    // not kept if storage is unavailable
  }
}

export const cargoCaptain = {
  id: 'cargo-captain',
  title: 'Cargo Captain',
  drawTile,
  create,
};

const hit = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

function create(host) {
  const params = new URLSearchParams(location.search);
  const debug = params.has('debug');
  const renderer = createRenderer();
  let size = { w: 1, h: 1 };
  let progress = loadProgress();
  let screen = 'menu'; // 'menu' | 'picker' | 'play'
  let game = null;
  let index = 0;
  let view = { s: 1, ox: 0, oy: 0, hudH: 60, w: 1, h: 1 };
  let buttons = [];
  let time = 0;
  let lastDt = 0;
  let recorded = false;
  let dragging = false;
  let autopilot = false;
  let autoWait = 0;
  let wrongTaps = {}; // choice value -> time it was tapped wrong (this puzzle)
  let choicesFor = null;

  const totalStars = () => progress.stars.reduce((a, b) => a + b, 0);
  const firstOpen = () => {
    for (let i = 0; i < VOYAGES.length; i++) if (unlocked(progress, i) && progress.stars[i] === 0) return i;
    return 0;
  };
  const toField = (x, y) => ({ x: (x - view.ox) / view.s, y: (y - view.oy) / view.s });
  const toScreen = (x, y) => ({ x: view.ox + x * view.s, y: view.oy + y * view.s });

  function layoutView() {
    const { w, h } = size;
    const hudH = Math.max(60, Math.min(96, h * 0.075));
    const s = Math.min((w - 8) / FIELD_W, (h - hudH) / FIELD_H);
    // the dock sits on the bottom edge; any spare height goes to the sky
    view = { s, ox: (w - FIELD_W * s) / 2, oy: Math.max(hudH, h - FIELD_H * s), hudH, w, h };
  }

  function layoutButtons() {
    const { w, h } = size;
    const bw = Math.min(w * 0.8, 420);
    const bh = Math.max(64, Math.min(96, h * 0.085));
    const x = (w - bw) / 2;
    const icon = Math.max(48, Math.min(68, w * 0.12));
    const pad = Math.max(10, w * 0.025);
    if (screen === 'menu') {
      const n = firstOpen();
      buttons = [
        { id: 'exit', icon: 'home', x: pad, y: pad, w: icon, h: icon },
        { id: 'play', label: `Play ${n + 1}`, glyph: 'play', x, y: h * 0.74, w: bw, h: bh },
        { id: 'picker', label: '1 2 3', glyph: 'grid', x, y: h * 0.74 + bh * 1.3, w: bw, h: bh, fill: C.white },
      ];
    } else if (screen === 'picker') {
      buttons = [{ id: 'menu', icon: 'back', x: pad, y: pad, w: icon, h: icon }];
      const cols = w > h * 1.1 ? 3 : 2;
      const rows = Math.ceil(VOYAGES.length / cols);
      const top = Math.max(icon + pad * 2, h * 0.14);
      const gap = Math.max(14, w * 0.04);
      const tw = Math.min((w - gap * (cols + 1)) / cols, 260);
      const th = Math.min(tw * 0.95, (h - top - gap * (rows + 1)) / rows);
      const gx = (w - (tw * cols + gap * (cols - 1))) / 2;
      VOYAGES.forEach((_, i) => {
        buttons.push({ id: 'level', index: i, x: gx + (i % cols) * (tw + gap), y: top + Math.floor(i / cols) * (th + gap), w: tw, h: th });
      });
    } else if (screen === 'play') {
      const ih = Math.max(44, Math.min(60, view.hudH * 0.74));
      const iy = (view.hudH - ih) / 2;
      buttons = [
        { id: 'menu', icon: 'home', x: pad, y: iy, w: ih, h: ih },
        { id: 'restart', icon: 'restart', x: w - pad - ih, y: iy, w: ih, h: ih },
      ];
      if (game && game.status === 'done' && game.statusT > WIN_BUTTON_DELAY) {
        const last = index === VOYAGES.length - 1;
        const by = h - bh * 2.6 - Math.max(20, h * 0.04);
        buttons.push({ id: 'next', label: last ? '1 2 3' : 'Next', glyph: last ? 'grid' : 'next', x, y: by, w: bw, h: bh * 1.1 });
        buttons.push({ id: 'again', label: 'Again', glyph: 'restart', x: x + bw * 0.15, y: by + bh * 1.35, w: bw * 0.7, h: bh * 0.85, fill: C.white });
      }
    }
  }

  // The number choices on a mystery puzzle, in field units.
  function choices() {
    if (!game || game.status !== 'choose') return null;
    if (choicesFor !== game.puzzle) {
      choicesFor = game.puzzle;
      wrongTaps = {};
    }
    return game.puzzle.choices.map((value, i) => ({ value, x: 80 + i * 120, y: CHOICE_Y, r: CHOICE_R, wrongAt: wrongTaps[value] }));
  }

  function startVoyage(i) {
    index = Math.max(0, Math.min(VOYAGES.length - 1, i));
    game = createVoyage(index, generateVoyage(index));
    screen = 'play';
    recorded = false;
    dragging = false;
    autoWait = 0.6;
    renderer.reset();
    layoutButtons();
  }

  function goto(next) {
    screen = next;
    dragging = false;
    if (next !== 'play') game = null;
    layoutButtons();
  }

  function record() {
    recorded = true;
    progress.stars[index] = Math.max(progress.stars[index], game.stars);
    saveProgress(progress);
  }

  // ---------- drawing ----------

  function drawMenu(ctx) {
    const { w, h } = size;
    const hb = drawHarbour(ctx, w, h, time);
    const k = Math.min(w / 520, h / 900);
    drawToyShip(ctx, w / 2, hb.toY(392) + Math.sin(time * 1.7) * 3 * k, k * 1.05, time, [[3, 'left'], [2, 'left'], [5, 'right']]);
    drawFrontWater(ctx, w, h, time);
    const px = Math.min(h * 0.08, w / 6.4);
    ctx.save();
    ctx.translate(w / 2 + Math.sin(time * 2) * 3, h * 0.14);
    ctx.rotate(-0.04 + Math.sin(time * 1.5) * 0.025);
    outlined(ctx, 'CARGO', 0, 0, px, C.white, w * 0.9);
    outlined(ctx, 'CAPTAIN', 0, px * 1.1, px * 1.15, C.sun, w * 0.92);
    ctx.restore();
    const total = totalStars();
    if (total > 0) {
      const ty2 = h * 0.7;
      const r = Math.min(h * 0.022, w * 0.045);
      ctx.font = font(r * 1.8);
      const label = `${total} / ${VOYAGES.length * 3}`;
      const tw = ctx.measureText(label).width;
      drawStar(ctx, w / 2 - tw / 2 - r * 0.8, ty2, r, true);
      outlined(ctx, label, w / 2 + r * 0.8, ty2, r * 1.8, C.white);
    }
    for (const b of buttons) b.icon ? drawIconButton(ctx, b) : drawButton(ctx, b, b.fill);
  }

  const TILE_COLS = ['#19c3d6', '#ffb347', '#ff7eb6', '#8fd16a', '#7aa8ff', '#b98cff'];
  const TILE_SAMPLE = [[[4, 'left'], [4, 'right']], [[5, 'left'], [2, 'right'], [3, 'right']], [[7, 'left'], [3, 'right'], [4, 'right']],
    [[4, 'left'], [4, 'right']], [[5, 'left'], [2, 'left'], [7, 'right']], [[6, 'left'], [6, 'right']]];

  function drawPicker(ctx) {
    const { w, h } = size;
    drawHarbour(ctx, w, h, time);
    ctx.fillStyle = 'rgba(22,11,51,0.25)';
    ctx.fillRect(0, 0, w, h);
    for (const b of buttons) {
      if (b.icon) {
        drawIconButton(ctx, b);
        continue;
      }
      const open = unlocked(progress, b.index);
      const stars = progress.stars[b.index];
      ctx.fillStyle = 'rgba(22,11,51,0.35)';
      roundRect(ctx, b.x, b.y + 6, b.w, b.h, 22);
      ctx.fill();
      ctx.fillStyle = TILE_COLS[b.index % TILE_COLS.length];
      roundRect(ctx, b.x, b.y, b.w, b.h, 22);
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = open ? C.white : 'rgba(255,255,255,0.4)';
      ctx.stroke();
      ctx.save();
      roundRect(ctx, b.x, b.y, b.w, b.h, 22);
      ctx.clip();
      drawToyShip(ctx, b.x + b.w * 0.5, b.y + b.h * 0.6, b.w / 620, open ? time + b.index : 0, TILE_SAMPLE[b.index]);
      ctx.restore();
      outlined(ctx, String(b.index + 1), b.x + b.w * 0.18, b.y + b.h * 0.18, b.h * 0.24, C.white);
      const sr = Math.min(b.w * 0.1, b.h * 0.09);
      for (let k = 0; k < 3; k++) drawStar(ctx, b.x + b.w / 2 + (k - 1) * sr * 2.3, b.y + b.h * 0.83, sr, k < stars);
      if (!open) {
        ctx.fillStyle = 'rgba(22,11,51,0.55)';
        roundRect(ctx, b.x, b.y, b.w, b.h, 22);
        ctx.fill();
        drawLock(ctx, b.x + b.w / 2, b.y + b.h * 0.45, Math.min(b.w, b.h) * 0.16);
      }
    }
  }

  // Top bar: five little crates for the five puzzles of the voyage, ticked off as they sail.
  function drawHud(ctx) {
    const { w } = size;
    const { hudH } = view;
    const left = buttons.find((b) => b.id === 'menu');
    const room = w - (left.x + left.w + 12) * 2;
    const cy = hudH / 2;
    const n = game.puzzles.length;
    const r = Math.min(hudH * 0.28, room / (n * 2.6));
    for (let i = 0; i < n; i++) {
      const x = w / 2 + (i - (n - 1) / 2) * r * 2.5;
      const done = i < game.index || (i === game.index && (game.status === 'sail' || game.status === 'done'));
      const now = i === game.index && !done;
      const bob = now ? Math.sin(time * 4) * r * 0.12 : 0;
      ctx.save();
      ctx.globalAlpha = done || now ? 1 : 0.35;
      drawCrate(ctx, x, cy + bob, r * 1.7, 0, { n: i + 1, id: i, fixed: !done && !now }, {});
      ctx.restore();
      if (done) {
        ctx.strokeStyle = C.green;
        ctx.lineWidth = r * 0.35;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x - r * 0.5, cy + r * 0.1);
        ctx.lineTo(x - r * 0.1, cy + r * 0.5);
        ctx.lineTo(x + r * 0.6, cy - r * 0.5);
        ctx.stroke();
      }
    }
  }

  function drawConfetti(ctx, t) {
    const { w, h } = size;
    const colours = [C.pink, C.sun, C.foam, C.white, C.orange, '#3a7bff', C.green];
    for (let i = 0; i < 80; i++) {
      const speed = 90 + ((i * 53) % 80);
      const x = ((i * 0.137) % 1) * w + Math.sin(t * 2 + i) * 20;
      const y = ((t * speed + i * 41) % (h + 40)) - 20;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 3 + i);
      ctx.fillStyle = colours[i % colours.length];
      ctx.fillRect(-5, -3, 10, 6);
      ctx.restore();
    }
  }

  function drawDone(ctx) {
    const { w, h } = size;
    const t = game.statusT;
    const k = Math.min(1, t / 0.6);
    ctx.fillStyle = `rgba(22,11,51,${0.3 * k})`;
    ctx.fillRect(0, 0, w, h);
    drawConfetti(ctx, t);
    const px = Math.min(h * 0.08, w / 6);
    const pop = 1 + Math.max(0, 0.9 - t) * 1.2 + Math.sin(time * 6) * 0.04;
    const ty = view.hudH + px * 1.1;
    outlined(ctx, game.stars === 3 ? 'WOW!' : 'Hooray!', w / 2, ty, px * pop, C.sun, w * 0.9);
    const r = Math.min(w * 0.11, h * 0.06);
    const starY = ty + px * 0.9 + r * 1.4;
    for (let i = 0; i < 3; i++) {
      const at = 0.8 + i * 0.25;
      const sk = t < at ? 0 : Math.min(1, (t - at) / 0.15);
      const grow = sk * (1 + Math.max(0, 0.3 - (t - at)) * 0.8);
      if (grow <= 0) continue;
      drawStar(ctx, w / 2 + (i - 1) * r * 2.4, starY - (i === 1 ? r * 0.3 : 0), r * grow, i < game.stars);
    }
  }

  function drawPlay(ctx) {
    const { w } = size;
    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.s, view.s);
    renderer.drawField(ctx, game, view, time, lastDt, { choices: choices() });
    ctx.restore();
    // the top bar sits over the sky
    ctx.fillStyle = 'rgba(22,11,51,0.35)';
    ctx.fillRect(0, 0, w, view.hudH);
    drawHud(ctx);
    if (game.status === 'done') drawDone(ctx);
    for (const b of buttons) b.icon ? drawIconButton(ctx, b) : drawButton(ctx, b, b.fill);
  }

  // ---------- debug hook ----------

  if (debug) {
    window.__cargo = {
      state: () => game,
      screen: () => screen,
      buttons: () => buttons.map((b) => ({ ...b })),
      view: () => ({ ...view }),
      progress: () => JSON.parse(JSON.stringify(progress)),
      toScreen,
      toField,
      voyage: (n) => startVoyage(n - 1),
      goto: (name) => goto(name),
      // play the voyage out with animated moves (on = true), or finish it at once (instant)
      autosolve(on = true) {
        autopilot = on;
      },
      finish() {
        if (game) playVoyage(game);
      },
      // one move of the solution, as a finger would make it
      solveStep() {
        return !!game && doMove(game, nextMove(game));
      },
      nextMove: () => (game ? nextMove(game) : null),
      // where a crate is drawn, in screen px
      crateAt(id) {
        const p = game && layout(game).get(id);
        return p ? toScreen(p.x, p.y) : null;
      },
      // time travel for screenshots: run the game forward without drawing
      advance(seconds) {
        if (game) for (let t = 0; t < seconds; t += 1 / 60) step(game, 1 / 60);
      },
    };
  }

  const api = {
    resize(w, h) {
      size = { w, h };
      layoutView();
      layoutButtons();
    },

    update(dt) {
      time += dt;
      lastDt = dt;
      if (screen !== 'play' || !game) return;
      if (autopilot && (game.status === 'play' || game.status === 'choose') && !game.held) {
        autoWait -= dt;
        if (autoWait <= 0) {
          const m = nextMove(game);
          if (m) doMove(game, m);
          autoWait = 0.7;
        }
      }
      const before = `${game.status}|${game.statusT > WIN_BUTTON_DELAY}`;
      step(game, dt);
      if (game.status === 'done' && !recorded) record();
      const after = `${game.status}|${game.statusT > WIN_BUTTON_DELAY}`;
      if (before !== after) layoutButtons();
    },

    draw(ctx) {
      if (screen === 'menu') drawMenu(ctx);
      else if (screen === 'picker') drawPicker(ctx);
      else if (game) drawPlay(ctx);
    },

    // A press on a loose crate picks it up; the shell then sends the drag and the drop.
    onPickUp(x, y) {
      if (screen !== 'play' || !game || buttons.some((b) => hit(b, x, y))) return false;
      const f = toField(x, y);
      const id = pickAt(game, f.x, f.y);
      dragging = id !== null;
      return dragging;
    },
    onDrag(x, y) {
      if (!dragging || !game) return;
      const f = toField(x, y);
      moveHeld(game, f.x, f.y);
    },
    onDrop(x, y) {
      if (!dragging || !game) return;
      dragging = false;
      const f = toField(x, y);
      moveHeld(game, f.x, f.y);
      dropHeld(game, f.x, f.y);
    },
    onTap(x, y) {
      const b = buttons.find((r) => hit(r, x, y));
      if (!b) {
        const cs = choices();
        if (!cs) return;
        const f = toField(x, y);
        const c = cs.find((k) => Math.hypot(f.x - k.x, f.y - k.y) <= k.r + 12);
        if (c && !answer(game, c.value)) wrongTaps[c.value] = time;
        return;
      }
      if (b.id === 'exit') host.exit();
      else if (b.id === 'play') startVoyage(firstOpen());
      else if (b.id === 'picker') goto('picker');
      else if (b.id === 'menu') goto('menu');
      else if (b.id === 'level') {
        if (unlocked(progress, b.index)) startVoyage(b.index);
      } else if (b.id === 'restart' || b.id === 'again') startVoyage(index);
      else if (b.id === 'next') {
        if (index >= VOYAGES.length - 1) goto('picker');
        else startVoyage(index + 1);
      }
    },
  };

  const forced = Number(params.get('level'));
  if (Number.isInteger(forced) && forced >= 1 && forced <= VOYAGES.length) startVoyage(forced - 1);
  return api;
}
