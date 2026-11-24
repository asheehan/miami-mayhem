// Coconut Shuffle as a launcher game: menu, level picker, the shell closet, play, the
// level-complete screen, the endless streak and saved progress. Rules live in sim.js, levels in
// levels.js, drawing in draw.js, sounds in sound.js.
import { LEVELS } from './levels.js';
import {
  createGame, step, tapShell, peek, canPeek, poses, project, shellAt, answerShell, parseProgress, serializeProgress,
  unlocked, streakUnlocked, record, totalStars, isOpen, SKINS, CRITTERS, STREAK_AFTER, ROUNDS, SHELL_RX, LIFT_H, DRUM, RING_RX, RING_RZ,
} from './sim.js';
import {
  C, font, roundRect, outlined, drawStar, drawButton, drawIconButton, drawLock, drawTile, drawBeach, drawTowel,
  drawLeaf, drawTable, drawShell, drawCritter, colourFor, drawHand, drawWatchEye, drawDemo, glyph,
} from './draw.js';
import { unlockAudio, play } from './sound.js';

const SAVE_KEY = 'coconut-shuffle-progress';
const DONE_BUTTON_DELAY = 1.3; // seconds after the last round before the buttons show

export function loadProgress() {
  try {
    return parseProgress(localStorage.getItem(SAVE_KEY) || '{}', LEVELS.length);
  } catch {
    return parseProgress(null, LEVELS.length);
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(SAVE_KEY, serializeProgress(progress));
  } catch {
    // not kept if storage is unavailable
  }
}

export const coconutShuffle = {
  id: 'coconut-shuffle',
  title: 'Coconut Shuffle',
  drawTile,
  create,
};

const hit = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const TAU = Math.PI * 2;

function create(host) {
  const params = new URLSearchParams(location.search);
  const debug = params.has('debug');
  let size = { w: 1, h: 1 };
  let progress = loadProgress();
  let screen = 'menu'; // 'menu' | 'picker' | 'closet' | 'play'
  let game = null;
  let index = 0;
  let view = { cx: 0, cy: 0, s: 1, hudH: 60, pillY: 0, horizon: 0 };
  let buttons = [];
  let time = 0;
  let recorded = null; // what record() said for this game
  let fx = []; // sand puffs, sparkles
  let shake = {}; // closet item id -> time it was tapped while locked

  const firstOpen = () => {
    for (let i = 0; i < LEVELS.length; i++) if (unlocked(progress, i) && progress.stars[i] === 0) return i;
    return 0;
  };

  function layoutView() {
    const { w, h } = size;
    const hudH = Math.max(64, Math.min(104, h * 0.085));
    const s = Math.min((w - 16) / 460, (h - hudH - 40) / 560);
    const cy = hudH + (h - hudH) * 0.46;
    const pillY = Math.min(h - Math.max(48, h * 0.07), cy + 165 * s + 40);
    view = { cx: w / 2, cy, s, hudH, pillY, horizon: Math.max(hudH + 30, cy - 230 * s) };
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
      const y0 = h * 0.7;
      const gap = Math.max(10, bw * 0.04);
      const sw = (bw - gap * 2) / 3;
      const sy = y0 + bh * 1.25;
      buttons = [
        { id: 'exit', icon: 'home', x: pad, y: pad, w: icon, h: icon },
        { id: 'play', label: `Play ${n + 1}`, glyph: 'play', x, y: y0, w: bw, h: bh },
        { id: 'picker', glyph: 'grid', x, y: sy, w: sw, h: bh, fill: C.white },
        { id: 'streak', glyph: 'flame', x: x + sw + gap, y: sy, w: sw, h: bh, fill: streakUnlocked(progress) ? '#ffd9a0' : '#c9b9a0' },
        { id: 'closet', glyph: 'closet', x: x + (sw + gap) * 2, y: sy, w: sw, h: bh, fill: '#9fe8ff' },
      ];
    } else if (screen === 'picker') {
      buttons = [{ id: 'menu', icon: 'back', x: pad, y: pad, w: icon, h: icon }];
      const cols = 3;
      const rows = Math.ceil(LEVELS.length / cols);
      const top = Math.max(icon + pad * 2, h * 0.12);
      const gap = Math.max(10, w * 0.03);
      const tw = Math.min((w - gap * (cols + 1)) / cols, 210);
      const th = Math.min(tw * 0.9, (h - top - gap * (rows + 1)) / rows);
      const gx = (w - (tw * cols + gap * (cols - 1))) / 2;
      LEVELS.forEach((_, i) => {
        buttons.push({ id: 'level', index: i, x: gx + (i % cols) * (tw + gap), y: top + Math.floor(i / cols) * (th + gap), w: tw, h: th });
      });
    } else if (screen === 'closet') {
      buttons = [{ id: 'menu', icon: 'back', x: pad, y: pad, w: icon, h: icon }];
      const top = Math.max(icon + pad * 2, h * 0.1);
      const gap = Math.max(12, w * 0.03);
      const wide = w > 560;
      // skins: one row of four (two rows of two on a phone), then the critters in a row of three
      const skinCols = wide ? 4 : 2;
      const sw = Math.min((w - gap * (skinCols + 1)) / skinCols, 190);
      const sh = sw * 1.1;
      const cw = Math.min((w - gap * 4) / 3, 190);
      const chh = cw * 1.15;
      const skinRows = wide ? 1 : 2;
      const total = skinRows * sh + (skinRows - 1) * gap + gap * 3 + chh;
      let y = top + Math.max(0, (h - top - total) / 2);
      SKINS.forEach((it, i) => {
        const col = i % skinCols;
        const row = Math.floor(i / skinCols);
        const gx = (w - (sw * skinCols + gap * (skinCols - 1))) / 2;
        buttons.push({ id: 'skin', item: it.id, need: it.need, x: gx + col * (sw + gap), y: y + row * (sh + gap), w: sw, h: sh });
      });
      y += skinRows * sh + (skinRows - 1) * gap + gap * 3;
      const gx = (w - (cw * 3 + gap * 2)) / 2;
      CRITTERS.forEach((it, i) => buttons.push({ id: 'critter', item: it.id, need: it.need, x: gx + i * (cw + gap), y, w: cw, h: chh }));
    } else if (screen === 'play') {
      const ih = Math.max(44, Math.min(60, view.hudH * 0.72));
      const iy = (view.hudH - ih) / 2;
      buttons = [
        { id: 'menu', icon: 'home', x: pad, y: iy, w: ih, h: ih },
        { id: 'restart', icon: 'restart', x: w - pad - ih, y: iy, w: ih, h: ih },
      ];
      const pr = Math.max(34, Math.min(52, w * 0.065));
      if (game && game.status === 'play') {
        buttons.push({ id: 'peek', x: w - pad - pr * 2.2, y: view.pillY - pr, w: pr * 2.2, h: pr * 2 });
      }
      if (game && game.status === 'done' && game.statusT > DONE_BUTTON_DELAY) {
        const by = h - bh * 2.6 - Math.max(20, h * 0.04);
        if (game.mode === 'streak') {
          buttons.push({ id: 'again', label: 'Again', glyph: 'restart', x, y: by, w: bw, h: bh * 1.1 });
          buttons.push({ id: 'menu', label: 'Menu', glyph: 'home', x: x + bw * 0.15, y: by + bh * 1.35, w: bw * 0.7, h: bh * 0.85, fill: C.white });
        } else if (game.stars > 0) {
          const last = index === LEVELS.length - 1;
          buttons.push({ id: 'next', label: last ? 'Levels' : 'Next', glyph: last ? 'grid' : 'next', x, y: by, w: bw, h: bh * 1.1 });
          buttons.push({ id: 'again', label: 'Again', glyph: 'restart', x: x + bw * 0.15, y: by + bh * 1.35, w: bw * 0.7, h: bh * 0.85, fill: C.white });
        } else {
          buttons.push({ id: 'again', label: 'Again', glyph: 'restart', x, y: by, w: bw, h: bh * 1.1 });
          buttons.push({ id: 'picker', label: 'Levels', glyph: 'grid', x: x + bw * 0.15, y: by + bh * 1.35, w: bw * 0.7, h: bh * 0.85, fill: C.white });
        }
      }
    }
  }

  function startLevel(i, seed) {
    index = clamp(i, 0, LEVELS.length - 1);
    game = createGame({ mode: 'level', spec: LEVELS[index], seed: seed ?? 1 + index * 7919 + Math.floor(Math.random() * 100000) });
    begin();
  }

  function startStreak(seed) {
    game = createGame({ mode: 'streak', seed: seed ?? Math.floor(Math.random() * 1e9) });
    begin();
  }

  function begin() {
    screen = 'play';
    recorded = null;
    fx = [];
    layoutView();
    layoutButtons();
  }

  function goto(next) {
    screen = next;
    if (next !== 'play') game = null;
    layoutButtons();
  }

  // ---------- effects ----------

  function puff(x, y, k) {
    fx.push({ kind: 'puff', x, y, vx: (Math.random() - 0.5) * 60 * k, vy: -Math.random() * 25 * k, r: (4 + Math.random() * 5) * k, t: 0, life: 0.5 + Math.random() * 0.3 });
  }
  function sparkle(x, y, k, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + Math.random() * 0.3;
      const sp = (90 + Math.random() * 120) * k;
      fx.push({ kind: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60 * k, r: (4 + Math.random() * 3) * k, t: 0, life: 0.8, c: [C.sun, C.pink, C.white, C.sea][i % 4] });
    }
  }

  function updateFx(dt) {
    for (const p of fx) {
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'spark') p.vy += 260 * dt;
      else p.vy *= 0.9;
    }
    fx = fx.filter((p) => p.t < p.life);
  }

  function drawFx(ctx, kind) {
    for (const p of fx) {
      if (p.kind !== kind) continue;
      const a = 1 - p.t / p.life;
      if (p.kind === 'puff') {
        ctx.fillStyle = `rgba(255,244,215,${0.5 * a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1 + p.t * 2), 0, TAU);
        ctx.fill();
      } else {
        ctx.globalAlpha = a;
        drawStar(ctx, p.x, p.y, p.r, true);
        ctx.globalAlpha = 1;
      }
    }
  }

  // sand puffs kick up under shells that are sliding
  let lastPos = null;
  function kickSand(dt) {
    if (!game || game.status !== 'play' || game.round.phase !== 'shuffle') {
      lastPos = null;
      return;
    }
    const ps = poses(game);
    ps.shells.forEach((s) => {
      const q = project(view, s.x, s.z);
      const prev = lastPos && lastPos[s.id];
      if (prev && s.moving) {
        const speed = Math.hypot(q.X - prev.X, q.Y - prev.Y) / Math.max(dt, 1e-3);
        if (speed > 60 * view.s && Math.random() < dt * 22) {
          const r = SHELL_RX * q.k;
          puff(q.X + (Math.random() - 0.5) * r * 1.6, q.Y + r * 0.15, view.s);
        }
      }
    });
    lastPos = ps.shells.map((s) => project(view, s.x, s.z));
  }

  function handleEvents() {
    for (const e of game.events) {
      if (e.type === 'move') play('swish', game.round.spec.time * 0.8);
      else if (e.type === 'drum') play('drum');
      else if (e.type === 'right') {
        play('tada');
        const s = poses(game).shells[game.round.choice];
        const q = project(view, s.x, s.z);
        sparkle(q.X, q.Y - SHELL_RX * q.k, view.s);
      } else if (e.type === 'nope') play('nope');
      else if (e.type === 'there') play('pop');
      else if (e.type === 'go') play('thud');
      else if (e.type === 'choose') play('tick');
      else if (e.type === 'done') {
        recorded = record(progress, game, index);
        saveProgress(progress);
        if (game.mode === 'level' && game.stars > 0) play('finish');
      }
    }
    game.events.length = 0;
  }

  // ---------- drawing ----------

  function drawMenu(ctx) {
    const { w, h } = size;
    const horizon = h * 0.34;
    drawBeach(ctx, w, h, time, horizon);
    const px = Math.min(h * 0.075, w / 7.5);
    ctx.save();
    ctx.translate(w / 2 + Math.sin(time * 2) * 3, h * 0.13);
    ctx.rotate(-0.04 + Math.sin(time * 1.4) * 0.025);
    outlined(ctx, 'COCONUT', 0, 0, px, '#ffe2b0', w * 0.9);
    outlined(ctx, 'SHUFFLE', 0, px * 1.15, px * 1.2, C.sun, w * 0.9);
    ctx.restore();
    const s = Math.min((w * 0.9) / 440, (h * 0.32) / 260);
    drawDemo(ctx, { cx: w / 2, cy: h * 0.54, s }, time, progress.skin, progress.critter);
    const total = totalStars(progress);
    if (total > 0) {
      const ty2 = h * 0.655;
      const r = Math.min(h * 0.022, w * 0.045);
      ctx.font = font(r * 1.8);
      const label = `${total} / ${LEVELS.length * 3}`;
      const tw = ctx.measureText(label).width;
      drawStar(ctx, w / 2 - tw / 2 - r * 0.8, ty2, r, true);
      outlined(ctx, label, w / 2 + r * 0.8, ty2, r * 1.8, C.white);
    }
    for (const b of buttons) {
      if (b.icon) drawIconButton(ctx, b);
      else if (b.id === 'closet') {
        drawButton(ctx, { ...b, glyph: null, label: '' }, b.fill);
        const r = Math.min(b.w, b.h) * 0.3;
        drawShell(ctx, progress.skin, b.x + b.w * 0.5, b.y + b.h * 0.72, r, {});
      } else drawButton(ctx, b, b.fill);
      if (b.id === 'streak') {
        if (!streakUnlocked(progress)) {
          ctx.fillStyle = 'rgba(22,11,51,0.35)';
          roundRect(ctx, b.x, b.y, b.w, b.h, b.h * 0.3);
          ctx.fill();
          drawLock(ctx, b.x + b.w * 0.5, b.y + b.h * 0.5, Math.min(b.w, b.h) * 0.2);
        } else if (progress.best > 0) {
          outlined(ctx, String(progress.best), b.x + b.w * 0.82, b.y + b.h * 0.22, b.h * 0.32, C.white);
        }
      }
    }
  }

  // A little badge that says what a level brings in.
  function drawTeach(ctx, kind, x, y, r) {
    ctx.save();
    if (kind === 'fast') {
      ctx.fillStyle = C.sun;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + r * 0.2, y - r);
      ctx.lineTo(x - r * 0.5, y + r * 0.1);
      ctx.lineTo(x, y + r * 0.1);
      ctx.lineTo(x - r * 0.2, y + r);
      ctx.lineTo(x + r * 0.5, y - r * 0.1);
      ctx.lineTo(x, y - r * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (kind === 'double' || kind === 'ring' || kind === 'fake') {
      ctx.strokeStyle = C.white;
      ctx.lineWidth = Math.max(2.5, r * 0.22);
      ctx.lineCap = 'round';
      if (kind === 'ring') {
        ctx.beginPath();
        ctx.arc(x, y, r * 0.75, 0.3, TAU - 0.5);
        ctx.stroke();
        ctx.fillStyle = C.white;
        ctx.beginPath();
        ctx.moveTo(x + r * 0.95, y - r * 0.1);
        ctx.lineTo(x + r * 0.45, y - r * 0.1);
        ctx.lineTo(x + r * 0.72, y + r * 0.35);
        ctx.fill();
      } else if (kind === 'double') {
        for (const dy of [-0.4, 0.4]) {
          ctx.beginPath();
          ctx.moveTo(x - r * 0.8, y + dy * r);
          ctx.quadraticCurveTo(x, y + dy * r - r * 0.5, x + r * 0.8, y + dy * r);
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        for (let i = 0; i <= 12; i++) ctx.lineTo(x - r + (i / 12) * 2 * r, y + Math.sin(i * 1.6) * r * 0.35);
        ctx.stroke();
      }
    } else if (kind === 'decoy') {
      drawCritter(ctx, 'crab', x, y + r * 0.6, r * 1.1, colourFor('crab', 'decoy'), { t: 0, mood: 'peek' });
    } else if (kind === 'two') {
      drawCritter(ctx, 'crab', x, y + r * 0.6, r * 1.1, colourFor('crab', 'second'), { t: 0, mood: 'peek' });
    } else if (kind === 'leaf') {
      ctx.fillStyle = C.leaf;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.42, -0.6, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - r * 0.8, y + r * 0.55);
      ctx.lineTo(x + r * 0.8, y - r * 0.55);
      ctx.stroke();
    } else if (kind === 'master') {
      ctx.fillStyle = C.sun;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - r, y + r * 0.6);
      ctx.lineTo(x - r, y - r * 0.4);
      ctx.lineTo(x - r * 0.5, y + r * 0.05);
      ctx.lineTo(x, y - r * 0.7);
      ctx.lineTo(x + r * 0.5, y + r * 0.05);
      ctx.lineTo(x + r, y - r * 0.4);
      ctx.lineTo(x + r, y + r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPicker(ctx) {
    const { w, h } = size;
    drawBeach(ctx, w, h, time, h * 0.16);
    const icon = buttons[0];
    outlined(ctx, 'Levels', w / 2, icon.y + icon.h / 2, Math.min(h * 0.05, w / 9), C.sun, w - (icon.w + icon.x) * 2 - 10);
    for (const b of buttons) {
      if (b.icon) {
        drawIconButton(ctx, b);
        continue;
      }
      const L = LEVELS[b.index];
      const open = unlocked(progress, b.index);
      const stars = progress.stars[b.index];
      ctx.fillStyle = 'rgba(22,11,51,0.3)';
      roundRect(ctx, b.x, b.y + 5, b.w, b.h, 18);
      ctx.fill();
      const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
      g.addColorStop(0, '#29c9d9');
      g.addColorStop(0.45, '#19a8c4');
      g.addColorStop(0.45, '#f9e1a6');
      g.addColorStop(1, '#e8bd6a');
      ctx.fillStyle = g;
      roundRect(ctx, b.x, b.y, b.w, b.h, 18);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = open ? C.white : 'rgba(255,255,255,0.4)';
      ctx.stroke();
      outlined(ctx, String(b.index + 1), b.x + b.w * 0.3, b.y + b.h * 0.25, b.h * 0.28, C.white, b.w * 0.4);
      if (L.teach && !['shells', 'more'].includes(L.teach)) drawTeach(ctx, L.teach, b.x + b.w * 0.72, b.y + b.h * 0.25, Math.min(b.w, b.h) * 0.12);
      // a row of tiny shells: how many there are
      const sr = Math.min(b.w / (L.shells * 2.6), b.h * 0.09);
      for (let k = 0; k < L.shells; k++) {
        drawShell(ctx, progress.skin, b.x + b.w / 2 + (k - (L.shells - 1) / 2) * sr * 2.4, b.y + b.h * 0.6, sr, {});
      }
      const st = Math.min(b.w * 0.1, b.h * 0.1);
      for (let k = 0; k < 3; k++) drawStar(ctx, b.x + b.w / 2 + (k - 1) * st * 2.3, b.y + b.h * 0.82, st, k < stars);
      if (!open) {
        ctx.fillStyle = 'rgba(22,11,51,0.5)';
        roundRect(ctx, b.x, b.y, b.w, b.h, 18);
        ctx.fill();
        drawLock(ctx, b.x + b.w / 2, b.y + b.h * 0.45, Math.min(b.w, b.h) * 0.16);
      }
    }
  }

  function drawCloset(ctx) {
    const { w, h } = size;
    drawBeach(ctx, w, h, time, h * 0.16);
    const total = totalStars(progress);
    const icon = buttons[0];
    const r0 = Math.min(h * 0.022, w * 0.045);
    ctx.font = font(r0 * 1.8);
    const label = String(total);
    const tw = ctx.measureText(label).width;
    drawStar(ctx, w / 2 - tw / 2 - r0 * 0.9, icon.y + icon.h / 2, r0 * 1.2, true);
    outlined(ctx, label, w / 2 + r0 * 0.8, icon.y + icon.h / 2, r0 * 2, C.white);
    for (const b of buttons) {
      if (b.icon) {
        drawIconButton(ctx, b);
        continue;
      }
      const list = b.id === 'skin' ? SKINS : CRITTERS;
      const open = isOpen(list, b.item, progress);
      const chosen = (b.id === 'skin' ? progress.skin : progress.critter) === b.item;
      const wig = shake[b.item] !== undefined && time - shake[b.item] < 0.4 ? Math.sin((time - shake[b.item]) * 50) * 6 : 0;
      ctx.save();
      ctx.translate(wig, 0);
      ctx.fillStyle = 'rgba(22,11,51,0.3)';
      roundRect(ctx, b.x, b.y + 5, b.w, b.h, 20);
      ctx.fill();
      ctx.fillStyle = chosen ? '#fff6c2' : 'rgba(255,255,255,0.85)';
      roundRect(ctx, b.x, b.y, b.w, b.h, 20);
      ctx.fill();
      ctx.lineWidth = chosen ? 7 : 3;
      ctx.strokeStyle = chosen ? C.sun : C.ink;
      ctx.stroke();
      const r = Math.min(b.w, b.h) * 0.3;
      if (b.id === 'skin') drawShell(ctx, b.item, b.x + b.w / 2, b.y + b.h * 0.68, r, {});
      else drawCritter(ctx, b.item, b.x + b.w / 2, b.y + b.h * 0.74, r * 1.1, colourFor(b.item, 'main'), { t: open ? time : 0, mood: chosen ? 'dance' : 'peek' });
      if (!open) {
        ctx.fillStyle = 'rgba(22,11,51,0.55)';
        roundRect(ctx, b.x, b.y, b.w, b.h, 20);
        ctx.fill();
        drawLock(ctx, b.x + b.w / 2, b.y + b.h * 0.4, r * 0.45);
        const sr = r * 0.3;
        drawStar(ctx, b.x + b.w / 2 - sr * 1.4, b.y + b.h * 0.75, sr, true);
        outlined(ctx, String(b.need), b.x + b.w / 2 + sr * 1.2, b.y + b.h * 0.75, sr * 2.2, C.white);
      } else if (chosen) {
        // a tick in the corner
        ctx.strokeStyle = C.green;
        ctx.lineWidth = Math.max(4, r * 0.14);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(b.x + b.w * 0.74, b.y + b.h * 0.16);
        ctx.lineTo(b.x + b.w * 0.8, b.y + b.h * 0.23);
        ctx.lineTo(b.x + b.w * 0.9, b.y + b.h * 0.09);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawHud(ctx) {
    const { w } = size;
    const { hudH } = view;
    const cy = hudH / 2;
    const left = buttons.find((b) => b.id === 'menu');
    const room = w - (left.x + left.w + 12) * 2;
    if (game.mode === 'streak') {
      const r = Math.min(hudH * 0.3, room / 6);
      ctx.fillStyle = 'rgba(22,11,51,0.3)';
      roundRect(ctx, w / 2 - r * 2.6, hudH * 0.14, r * 5.2, hudH * 0.72, hudH * 0.3);
      ctx.fill();
      glyph(ctx, 'flame', w / 2 - r * 1.1, cy, r * 0.9, '#ff9a4c');
      outlined(ctx, String(game.streak), w / 2 + r * 0.9, cy, r * 1.7, C.white);
      return;
    }
    // one dot per round: a critter face for a right answer, a grey dot for a miss
    const r = Math.min(hudH * 0.22, room / (ROUNDS * 2.8));
    ctx.fillStyle = 'rgba(22,11,51,0.3)';
    roundRect(ctx, w / 2 - r * ROUNDS * 1.4, hudH * 0.16, r * ROUNDS * 2.8, hudH * 0.68, hudH * 0.3);
    ctx.fill();
    for (let i = 0; i < ROUNDS; i++) {
      const x = w / 2 + (i - (ROUNDS - 1) / 2) * r * 2.6;
      const R = game.round;
      const shown = i < game.results.length - 1 || (i === game.results.length - 1 && (R.phase !== 'reveal' || R.t > DRUM) && game.results.length > 0) || game.status === 'done';
      const res = shown ? game.results[i] : undefined;
      ctx.fillStyle = i === game.roundNo && game.status === 'play' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.arc(x, cy, r, 0, TAU);
      ctx.fill();
      if (res === true) drawStar(ctx, x, cy, r * 0.95, true);
      else if (res === false) {
        ctx.fillStyle = 'rgba(22,11,51,0.45)';
        ctx.beginPath();
        ctx.arc(x, cy, r * 0.55, 0, TAU);
        ctx.fill();
      }
    }
  }

  // The watch / tap sign under the table: an eye while the shells move, a finger when it's
  // time to tap. It shakes if a tap comes too early.
  function drawPill(ctx) {
    const { w } = size;
    const R = game.round;
    const watching = R.phase === 'show' || R.phase === 'shuffle';
    const tapping = R.phase === 'choose';
    if (!watching && !tapping) return;
    const r = Math.max(26, Math.min(46, w * 0.055));
    const since = game.time - game.ignoredAt;
    const sh = since < 0.5 ? Math.sin(since * 45) * 10 * (1 - since / 0.5) : 0;
    const x = w / 2 + sh;
    const y = view.pillY;
    const pw = r * 3.4;
    ctx.fillStyle = 'rgba(22,11,51,0.35)';
    roundRect(ctx, x - pw / 2, y - r + 4, pw, r * 2, r);
    ctx.fill();
    ctx.fillStyle = tapping ? C.sun : C.white;
    roundRect(ctx, x - pw / 2, y - r, pw, r * 2, r);
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.stroke();
    if (watching) {
      drawWatchEye(ctx, x, y, r * 0.62, time, (time % 2.7) < 0.1);
    } else {
      const bob = Math.abs(Math.sin(time * 5)) * r * 0.18;
      drawHand(ctx, x, y - r * 0.78 - bob + r * 0.1, r * 0.85);
      // little tap rings
      const k = (time * 1.6) % 1;
      ctx.strokeStyle = `rgba(22,11,51,${0.6 * (1 - k)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y - r * 0.85, r * (0.25 + k * 0.5), Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  }

  function drawPeekButton(ctx) {
    const b = buttons.find((q) => q.id === 'peek');
    if (!b) return;
    const on = canPeek(game);
    const unused = !game.peekUsed;
    if (!unused && game.round.peekAt === null) return; // spent: hide it
    ctx.save();
    ctx.globalAlpha = on ? 1 : 0.4;
    const pulse = on ? 1 + Math.sin(time * 5) * 0.04 : 1;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = 'rgba(22,11,51,0.35)';
    roundRect(ctx, -b.w / 2, -b.h / 2 + 4, b.w, b.h, b.h * 0.45);
    ctx.fill();
    ctx.fillStyle = '#b6f0ff';
    roundRect(ctx, -b.w / 2, -b.h / 2, b.w, b.h, b.h * 0.45);
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.stroke();
    // a magnifying glass over a tiny shell
    const r = b.h * 0.26;
    drawShell(ctx, progress.skin, -r * 0.35, r * 1.05, r * 0.85, {});
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = Math.max(3, r * 0.28);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 0.55, r * 0.1);
    ctx.lineTo(r * 1.25, r * 0.8);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = Math.max(2.5, r * 0.18);
    ctx.beginPath();
    ctx.arc(0, -r * 0.35, r * 0.75, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Two critters: which one to find, as a picture in a bubble over the table.
  function drawAsk(ctx) {
    const R = game.round;
    if (R.sh.second === null || (R.phase !== 'choose' && R.phase !== 'reveal')) return;
    const r = Math.max(34, Math.min(58, size.w * 0.07));
    const x = size.w / 2;
    const y = Math.max(view.hudH + r * 1.3, view.cy - 205 * view.s);
    const pop = R.phase === 'choose' ? 1 + Math.max(0, 0.3 - R.t) * 1.5 + Math.sin(time * 4) * 0.03 : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pop, pop);
    ctx.fillStyle = 'rgba(22,11,51,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 5, r * 1.6, r * 1.05, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = C.white;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.6, r * 1.05, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.25, r * 0.98);
    ctx.lineTo(0, r * 1.5);
    ctx.lineTo(r * 0.25, r * 0.98);
    ctx.fill();
    drawCritter(ctx, progress.critter, -r * 0.35, r * 0.62, r * 0.95, colourFor(progress.critter, R.sh.ask), { t: time, mood: 'wave' });
    outlined(ctx, '?', r * 0.85, 0, r * 1.1, C.sun);
    ctx.restore();
  }

  function drawPlay(ctx) {
    const { w, h } = size;
    const R = game.round;
    drawBeach(ctx, w, h, time, view.horizon);
    drawTowel(ctx, view, R.sh.ring, R.sh.n);
    if (R.sh.ring) {
      // the track the ring turns on
      ctx.save();
      ctx.strokeStyle = 'rgba(22,11,51,0.35)';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 10]);
      ctx.lineDashOffset = -time * 20;
      ctx.beginPath();
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * TAU;
        const q = project(view, Math.cos(a) * RING_RX, Math.sin(a) * RING_RZ);
        ctx.lineTo(q.X, q.Y);
      }
      ctx.stroke();
      ctx.restore();
    }
    const ps = poses(game);
    // soft rings on the sand: these are the shells to tap
    if (R.phase === 'choose') {
      const k = 0.5 + 0.5 * Math.sin(time * 4);
      for (const s of ps.shells) {
        const q = project(view, s.x, s.z);
        const r = SHELL_RX * q.k;
        ctx.strokeStyle = `rgba(255,225,77,${0.45 + 0.4 * k})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(q.X, q.Y, r * (1.2 + k * 0.08), r * (0.42 + k * 0.03), 0, 0, TAU);
        ctx.stroke();
      }
    }
    drawFx(ctx, 'puff');
    drawTable(ctx, view, ps, { skin: progress.skin, critter: progress.critter, t: time });
    drawLeaf(ctx, view, ps.leaf, w, time);
    drawFx(ctx, 'spark');
    // the soft top band so the HUD reads over the sky
    ctx.fillStyle = 'rgba(22,11,51,0.18)';
    ctx.fillRect(0, 0, w, view.hudH);
    drawHud(ctx);
    if (game.status === 'play') {
      drawAsk(ctx);
      drawPill(ctx);
      drawPeekButton(ctx);
      drawRoundWord(ctx, ps);
    }
    if (game.status === 'done') drawDone(ctx);
    for (const b of buttons) {
      if (b.id === 'peek') continue;
      if (b.icon) drawIconButton(ctx, b);
      else drawButton(ctx, b, b.fill);
    }
  }

  // A pop of "Yes!" over a right shell; a little "nope" head-shake mark over a wrong one.
  function drawRoundWord(ctx, ps) {
    const R = game.round;
    if (R.phase !== 'reveal' || R.t < DRUM) return;
    const s = ps.shells[R.choice];
    const q = project(view, s.x, s.z);
    const lift = s.lift * LIFT_H * q.k;
    const y = q.Y - lift - SHELL_RX * q.k * 1.9;
    const k = Math.min(1, (R.t - DRUM) / 0.25);
    const px = Math.max(26, Math.min(56, size.w * 0.06)) * (0.6 + 0.4 * k);
    if (R.correct) outlined(ctx, 'Yes!', q.X, y, px, C.sun);
    else {
      ctx.save();
      ctx.translate(q.X + Math.sin((R.t - DRUM) * 18) * 4 * (1 - k * 0.5), y);
      ctx.strokeStyle = C.white;
      ctx.lineWidth = px * 0.2;
      ctx.lineCap = 'round';
      const a = px * 0.32;
      ctx.beginPath();
      ctx.arc(0, 0, a * 1.4, 0, TAU);
      ctx.moveTo(-a, -a);
      ctx.lineTo(a, a);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawConfetti(ctx, t) {
    const { w, h } = size;
    const colours = [C.pink, C.sun, C.foam, C.white, C.orange, '#3a7bff'];
    for (let i = 0; i < 70; i++) {
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
    const k = Math.min(1, t / 0.4);
    ctx.fillStyle = `rgba(22,11,51,${0.7 * k})`;
    ctx.fillRect(0, 0, w, h);
    const bh = Math.max(64, Math.min(96, h * 0.085));
    const buttonsTop = h - bh * 2.6 - Math.max(20, h * 0.04);
    const perfect = game.mode === 'level' && game.stars === 3;
    if (perfect) drawConfetti(ctx, t);
    const px = Math.min(h * 0.075, w / 6);
    const pop = 1 + Math.max(0, 0.6 - t) * 1.2 + Math.sin(time * 6) * 0.03;
    const ty = view.hudH + px * 1.2;
    const sc = Math.min(w, h) / 9;
    if (game.mode === 'streak') {
      outlined(ctx, 'Wow!', w / 2, ty, px * pop, C.sun, w * 0.9);
      // the run, and the best ever, as flames with numbers
      const r = Math.min(w * 0.08, h * 0.045);
      const y1 = ty + px * 1.3;
      glyph(ctx, 'flame', w / 2 - r * 1.4, y1, r, '#ff9a4c');
      outlined(ctx, String(game.streak), w / 2 + r * 0.9, y1, r * 2, C.white);
      const y2 = y1 + r * 2.6;
      drawTrophy(ctx, w / 2 - r * 1.4, y2, r * 0.9);
      outlined(ctx, String(progress.best), w / 2 + r * 0.9, y2, r * 1.6, recorded?.newBest ? C.sun : C.white);
      if (recorded?.newBest) outlined(ctx, 'NEW!', w / 2 + r * 3.2, y2 - r * 0.6, r * 0.8, C.pink);
      drawCritter(ctx, progress.critter, w / 2, (y2 + r + buttonsTop) / 2 + sc * 0.7, sc, colourFor(progress.critter, 'main'), { t: time, mood: 'dance' });
    } else {
      const word = game.stars === 3 ? 'WOW!' : game.stars > 0 ? 'Hooray!' : 'So close!';
      outlined(ctx, word, w / 2, ty, px * pop, game.stars > 0 ? C.sun : C.white, w * 0.9);
      const r = Math.min(w * 0.11, h * 0.06);
      const starY = ty + px * 0.9 + r * 1.4;
      for (let i = 0; i < 3; i++) {
        const at = 0.4 + i * 0.25;
        const sk = t < at ? 0 : Math.min(1, (t - at) / 0.15);
        const grow = sk * (1 + Math.max(0, 0.3 - (t - at)) * 0.8);
        if (grow <= 0) continue;
        drawStar(ctx, w / 2 + (i - 1) * r * 2.4, starY - (i === 1 ? r * 0.3 : 0), r * grow, i < game.stars);
      }
      drawCritter(ctx, progress.critter, w / 2, (starY + r * 1.2 + buttonsTop) / 2 + sc * 0.7, sc, colourFor(progress.critter, 'main'), {
        t: time, mood: game.stars > 0 ? 'dance' : 'wave',
      });
    }
    // anything new from the stars
    const news = recorded?.unlocks || [];
    if (news.length && t > 1) {
      const id = news[0];
      const r = Math.min(w * 0.08, h * 0.05);
      const x = w - r * 2.2;
      const y = view.hudH + r * 3.2;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(time * 3) * 0.08);
      ctx.fillStyle = C.white;
      ctx.strokeStyle = C.sun;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.5, 0, TAU);
      ctx.fill();
      ctx.stroke();
      if (SKINS.some((s) => s.id === id)) drawShell(ctx, id, 0, r * 0.7, r * 0.9, {});
      else drawCritter(ctx, id, 0, r * 0.8, r, colourFor(id, 'main'), { t: time, mood: 'dance' });
      outlined(ctx, 'NEW!', 0, -r * 1.5, r * 0.7, C.pink);
      ctx.restore();
    }
  }

  function drawTrophy(ctx, x, y, r) {
    ctx.save();
    ctx.fillStyle = C.sun;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = Math.max(2, r * 0.12);
    ctx.beginPath();
    ctx.moveTo(x - r * 0.8, y - r);
    ctx.lineTo(x + r * 0.8, y - r);
    ctx.quadraticCurveTo(x + r * 0.8, y + r * 0.2, x, y + r * 0.3);
    ctx.quadraticCurveTo(x - r * 0.8, y + r * 0.2, x - r * 0.8, y - r);
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(x - r * 0.15, y + r * 0.3, r * 0.3, r * 0.4);
    ctx.fillRect(x - r * 0.5, y + r * 0.7, r, r * 0.25);
    ctx.strokeRect(x - r * 0.5, y + r * 0.7, r, r * 0.25);
    ctx.beginPath();
    ctx.arc(x - r * 0.85, y - r * 0.55, r * 0.35, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(x + r * 0.85, y - r * 0.55, r * 0.35, Math.PI * 1.5, Math.PI * 0.5);
    ctx.stroke();
    ctx.restore();
  }

  // ---------- debug hook ----------

  const shellPoint = (id) => {
    if (!game) return null;
    const s = poses(game).shells[id];
    const q = project(view, s.x, s.z);
    return { x: q.X, y: q.Y - SHELL_RX * q.k * 0.5 - s.lift * LIFT_H * q.k };
  };

  if (debug) {
    window.__shuffle = {
      state: () => game,
      screen: () => screen,
      buttons: () => buttons.map((b) => ({ ...b })),
      view: () => ({ ...view }),
      progress: () => JSON.parse(JSON.stringify(progress)),
      poses: () => (game ? poses(game) : null),
      phase: () => (game ? (game.status === 'done' ? 'done' : game.round.phase) : null),
      answer: () => (game ? answerShell(game.round.sh) : null),
      shellPoint,
      rightPoint: () => (game ? shellPoint(answerShell(game.round.sh)) : null),
      wrongPoint: () => (game ? shellPoint((answerShell(game.round.sh) + 1) % game.round.sh.n) : null),
      level: (n, seed) => startLevel(n - 1, seed),
      streak: (seed) => startStreak(seed),
      goto: (name) => goto(name),
      // run the game ahead without drawing
      advance(seconds) {
        for (let t = 0; game && t < seconds; t += 1 / 60) api.update(1 / 60);
      },
      toPhase(p, max = 60) {
        for (let t = 0; game && t < max; t += 1 / 60) {
          if ((game.status === 'done' ? 'done' : game.round.phase) === p) return true;
          api.update(1 / 60);
        }
        return false;
      },
      setProgress(p) {
        progress = parseProgress(p, LEVELS.length);
        saveProgress(progress);
        layoutButtons();
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
      updateFx(dt);
      if (screen !== 'play' || !game) return;
      const before = `${game.status}|${game.statusT > DONE_BUTTON_DELAY}|${game.peekUsed}`;
      step(game, dt);
      kickSand(dt);
      handleEvents();
      const after = `${game.status}|${game.statusT > DONE_BUTTON_DELAY}|${game.peekUsed}`;
      if (before !== after) layoutButtons();
    },

    draw(ctx) {
      if (screen === 'menu') drawMenu(ctx);
      else if (screen === 'picker') drawPicker(ctx);
      else if (screen === 'closet') drawCloset(ctx);
      else if (game) drawPlay(ctx);
    },

    // Everything here is a tap; nothing is dragged.
    onPickUp() {
      unlockAudio();
      return false;
    },
    onDrag() {},
    onDrop() {},
    onTap(x, y) {
      unlockAudio();
      const b = buttons.find((r) => hit(r, x, y));
      if (!b) {
        if (screen === 'play' && game && game.status === 'play') tapShell(game, shellAt(game, view, x, y));
        return;
      }
      if (b.id === 'exit') host.exit();
      else if (b.id === 'play') startLevel(firstOpen());
      else if (b.id === 'picker') goto('picker');
      else if (b.id === 'closet') goto('closet');
      else if (b.id === 'menu') goto('menu');
      else if (b.id === 'streak') {
        if (streakUnlocked(progress)) startStreak();
        else play('nope');
      } else if (b.id === 'level') {
        if (unlocked(progress, b.index)) startLevel(b.index);
      } else if (b.id === 'skin' || b.id === 'critter') {
        if (isOpen(b.id === 'skin' ? SKINS : CRITTERS, b.item, progress)) {
          progress[b.id] = b.item;
          saveProgress(progress);
          play('pop');
        } else shake[b.item] = time;
      } else if (b.id === 'peek') {
        if (game) peek(game);
      } else if (b.id === 'restart' || b.id === 'again') {
        if (game && game.mode === 'streak') startStreak();
        else startLevel(index);
      } else if (b.id === 'next') {
        if (index >= LEVELS.length - 1) goto('picker');
        else startLevel(index + 1);
      }
    },
  };

  const forced = Number(params.get('level'));
  if (Number.isInteger(forced) && forced >= 1 && forced <= LEVELS.length) startLevel(forced - 1);
  return api;
}
