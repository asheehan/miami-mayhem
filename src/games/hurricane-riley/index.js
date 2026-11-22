// Hurricane Riley as a launcher game: menu, level picker, play, win and try-again screens,
// swipe input and saved stars. Rules live in sim.js, levels in levels.js, drawing in draw.js.
import { LEVELS } from './levels.js';
import { FIELD_W, FIELD_H, GUST_FULL_LEN, GUST_MIN_LEN, createLevel, step, gust, settled } from './sim.js';
import { planGust, shooGust, routeTo } from './bot.js';
import {
  C, font, roundRect, outlined, drawStar, drawButton, drawIconButton, createRenderer, drawTile, drawJobIcon,
  drawBall, drawDuck, drawSnack, drawShell, drawGull,
} from './draw.js';

const SAVE_KEY = 'hurricane-riley-progress';
const WIN_BUTTON_DELAY = 1.2; // seconds after a win before Next shows, so a last swipe can't press it
const FAIL_BUTTON_DELAY = 1.0;
const DEFEND_SHOW = 2; // seconds the "DEFEND!" banner stays up at the start of a picnic level
const HINT_IDLE = 7; // seconds without a gust before the hint comes back
const TRAIL_KEEP = 0.35; // seconds a finger trail stays on screen

export function loadProgress() {
  try {
    const v = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    const stars = LEVELS.map((_, i) => {
      const n = Array.isArray(v.stars) ? Number(v.stars[i]) : 0;
      return Number.isInteger(n) && n >= 0 && n <= 3 ? n : 0;
    });
    return { stars };
  } catch {
    return { stars: LEVELS.map(() => 0) };
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
  } catch {
    // not kept if storage is unavailable
  }
}

// A level is open once the one before it (or the level itself) has been finished.
export const unlocked = (progress, i) => i === 0 || progress.stars[i - 1] > 0 || progress.stars[i] > 0;

export const hurricaneRiley = {
  id: 'hurricane-riley',
  title: 'Hurricane Riley',
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
  let view = { s: 1, ox: 0, oy: 0, hudH: 60, bottomH: 50 };
  let buttons = [];
  let time = 0;
  let lastDt = 0;
  let recorded = false;
  let drag = null; // { sx, sy, st } segment start in screen px and ms
  let trail = []; // { x, y, t } screen px, for the finger trail
  let lastGustAt = 0;
  let autopilot = false;
  let autoWait = 0;

  const totalStars = () => progress.stars.reduce((a, b) => a + b, 0);
  const firstOpen = () => {
    for (let i = 0; i < LEVELS.length; i++) if (unlocked(progress, i) && progress.stars[i] === 0) return i;
    return 0;
  };
  const toField = (x, y) => ({ x: (x - view.ox) / view.s, y: (y - view.oy) / view.s });
  const toScreen = (x, y) => ({ x: view.ox + x * view.s, y: view.oy + y * view.s });

  function layoutView() {
    const { w, h } = size;
    const hudH = Math.max(64, Math.min(104, h * 0.085));
    const bottomH = Math.max(48, Math.min(84, h * 0.065));
    const side = 8;
    const availW = w - side * 2;
    const availH = h - hudH - bottomH;
    const s = Math.min(availW / FIELD_W, availH / FIELD_H);
    view = { s, ox: (w - FIELD_W * s) / 2, oy: hudH + (availH - FIELD_H * s) / 2, hudH, bottomH };
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
        { id: 'play', label: `Play ${n + 1}`, glyph: 'play', x, y: h * 0.68, w: bw, h: bh },
        { id: 'picker', label: 'Levels', glyph: 'grid', x, y: h * 0.68 + bh * 1.3, w: bw, h: bh, fill: C.white },
      ];
    } else if (screen === 'picker') {
      buttons = [{ id: 'menu', icon: 'back', x: pad, y: pad, w: icon, h: icon }];
      const cols = 3;
      const top = Math.max(icon + pad * 2, h * 0.15);
      const gap = Math.max(12, w * 0.035);
      const tw = Math.min((w - gap * (cols + 1)) / cols, 200);
      const th = Math.min(tw * 1.15, (h - top - gap * 4) / 3);
      const gx = (w - (tw * cols + gap * (cols - 1))) / 2;
      LEVELS.forEach((_, i) => {
        buttons.push({ id: 'level', index: i, x: gx + (i % cols) * (tw + gap), y: top + Math.floor(i / cols) * (th + gap), w: tw, h: th });
      });
    } else if (screen === 'play') {
      const ih = Math.max(44, Math.min(60, view.hudH * 0.72));
      const iy = (view.hudH - ih) / 2;
      buttons = [
        { id: 'menu', icon: 'home', x: pad, y: iy, w: ih, h: ih },
        { id: 'restart', icon: 'restart', x: w - pad - ih, y: iy, w: ih, h: ih },
      ];
      if (game && game.status === 'won' && game.statusT > WIN_BUTTON_DELAY) {
        const last = index === LEVELS.length - 1;
        const by = h - bh * 2.5 - Math.max(20, h * 0.04);
        buttons.push({ id: 'next', label: last ? 'All done!' : 'Next', glyph: last ? null : 'next', x, y: by, w: bw, h: bh * 1.1 });
        buttons.push({ id: 'again', label: 'Again', glyph: 'restart', x: x + bw * 0.15, y: by + bh * 1.35, w: bw * 0.7, h: bh * 0.85, fill: C.white });
      } else if (game && game.status === 'fail' && game.statusT > FAIL_BUTTON_DELAY) {
        const by = h - bh * 2.5 - Math.max(20, h * 0.04);
        buttons.push({ id: 'again', label: 'Try again', glyph: 'restart', x, y: by, w: bw, h: bh * 1.1 });
        buttons.push({ id: 'picker', label: 'Levels', glyph: 'grid', x: x + bw * 0.15, y: by + bh * 1.35, w: bw * 0.7, h: bh * 0.85, fill: C.white });
      }
    }
  }

  function startLevel(i) {
    index = Math.max(0, Math.min(LEVELS.length - 1, i));
    game = createLevel(LEVELS[index], 1 + index * 7919 + Math.floor(Math.random() * 1000));
    screen = 'play';
    recorded = false;
    drag = null;
    trail = [];
    lastGustAt = 0;
    autoWait = 0.6;
    renderer.reset();
    layoutButtons();
  }

  function goto(next) {
    screen = next;
    drag = null;
    if (next !== 'play') game = null;
    layoutButtons();
  }

  function record() {
    recorded = true;
    progress.stars[index] = Math.max(progress.stars[index], game.stars);
    saveProgress(progress);
  }

  // A swipe segment from (x0, y0) to (x1, y1) in screen px that took `ms` milliseconds.
  function blow(x0, y0, x1, y1, ms) {
    if (!game) return null;
    const a = toField(x0, y0);
    const b = toField(x1, y1);
    const g = gust(game, a.x, a.y, b.x, b.y, ms > 0 ? ms / 1000 : undefined);
    if (g) lastGustAt = time;
    return g;
  }

  // ---------- drawing ----------

  function drawBackdrop(ctx, job) {
    const { w, h } = size;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    if (job === 'sail') {
      g.addColorStop(0, '#0a5f8a');
      g.addColorStop(1, '#0b8fb0');
    } else if (job) {
      g.addColorStop(0, '#d9a85a');
      g.addColorStop(1, '#c79245');
    } else {
      g.addColorStop(0, '#2f9bff');
      g.addColorStop(0.55, C.sky);
      g.addColorStop(0.55, '#29c9d9');
      g.addColorStop(0.74, '#7ff0e8');
      g.addColorStop(0.74, C.sand);
      g.addColorStop(1, '#efc877');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // Wind swirls drifting across the screen (menu and picker).
  function drawSwirls(ctx, count, alpha) {
    const { w, h } = size;
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineCap = 'round';
    for (let i = 0; i < count; i++) {
      const sp = 0.06 + (i % 3) * 0.025;
      const k = (time * sp + i * 0.37) % 1;
      const x = -w * 0.2 + k * w * 1.4;
      const y = h * (0.08 + ((i * 0.19) % 0.5));
      const r = Math.min(w, h) * (0.03 + (i % 2) * 0.015);
      ctx.lineWidth = Math.max(3, r * 0.22);
      ctx.beginPath();
      ctx.moveTo(x - r * 5, y + r);
      ctx.quadraticCurveTo(x - r * 2, y + r * 1.3, x, y + r * 0.2);
      ctx.arc(x - r * 0.1, y - r * 0.4, r * 0.65, Math.PI * 0.45, Math.PI * 1.9, true);
      ctx.stroke();
    }
  }

  function drawMenu(ctx) {
    const { w, h } = size;
    drawBackdrop(ctx, null);
    drawSwirls(ctx, 7, 0.7);
    const px = Math.min(h * 0.075, w / 7.2);
    ctx.save();
    ctx.translate(w / 2 + Math.sin(time * 2.2) * 3, h * 0.16);
    ctx.rotate(-0.05 + Math.sin(time * 1.6) * 0.03);
    outlined(ctx, 'HURRICANE', 0, 0, px, C.white, w * 0.9);
    outlined(ctx, 'RILEY', 0, px * 1.1, px * 1.3, C.sun, w * 0.9);
    ctx.restore();
    // a palm whipping about and a ball tumbling past on the sand
    const sc = Math.min(w, h * 0.62) / 400;
    const baseY = h * 0.6;
    const bend = 0.55 + Math.sin(time * 2.6) * 0.3 + Math.sin(time * 7.1) * 0.06;
    const bx = w / 2 - 70 * sc;
    const tx = bx + 90 * sc * bend;
    const ty = baseY - 170 * sc;
    ctx.strokeStyle = '#8a5a3c';
    ctx.lineCap = 'round';
    ctx.lineWidth = 14 * sc;
    ctx.beginPath();
    ctx.moveTo(bx, baseY);
    ctx.quadraticCurveTo(bx - 6 * sc, baseY - 100 * sc, tx, ty);
    ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const a = -0.9 + i * 0.32 + bend * 0.6;
      const len = (85 + (i % 3) * 14) * sc;
      ctx.strokeStyle = i % 2 ? '#2fae4a' : '#1d7a33';
      ctx.lineWidth = 12 * sc;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(tx + Math.cos(a) * len * 0.6, ty + Math.sin(a) * len * 0.3 - len * 0.25, tx + Math.cos(a) * len, ty + Math.sin(a) * len * 0.7 + len * 0.1);
      ctx.stroke();
    }
    const k = (time * 0.3) % 1;
    drawBall(ctx, -30 * sc + k * (w + 60 * sc), baseY + 40 * sc - Math.abs(Math.sin(k * Math.PI * 4)) * 60 * sc, 20 * sc, time * 5);
    // total stars
    const total = totalStars();
    if (total > 0) {
      const ty2 = h * 0.64;
      const r = Math.min(h * 0.022, w * 0.045);
      ctx.font = font(r * 1.8);
      const label = `${total} / ${LEVELS.length * 3}`;
      const tw = ctx.measureText(label).width;
      drawStar(ctx, w / 2 - tw / 2 - r * 0.8, ty2, r, true);
      outlined(ctx, label, w / 2 + r * 0.8, ty2, r * 1.8, C.white);
    }
    for (const b of buttons) b.icon ? drawIconButton(ctx, b) : drawButton(ctx, b, b.fill);
  }

  function drawPicker(ctx) {
    const { w, h } = size;
    drawBackdrop(ctx, null);
    drawSwirls(ctx, 4, 0.45);
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
      roundRect(ctx, b.x, b.y + 5, b.w, b.h, 20);
      ctx.fill();
      ctx.fillStyle = L.job === 'sail' ? '#19c3d6' : L.job === 'herd' ? '#f6d892' : '#ff9e9e';
      roundRect(ctx, b.x, b.y, b.w, b.h, 20);
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = open ? C.white : 'rgba(255,255,255,0.4)';
      ctx.stroke();
      const r = Math.min(b.w * 0.2, b.h * 0.17);
      drawJobIcon(ctx, L.job, b.x + b.w * 0.28, b.y + b.h * 0.3, r, open ? time : 0);
      outlined(ctx, String(b.index + 1), b.x + b.w * 0.68, b.y + b.h * 0.32, b.h * 0.34, C.white);
      const sr = Math.min(b.w * 0.12, b.h * 0.1);
      for (let k = 0; k < 3; k++) drawStar(ctx, b.x + b.w / 2 + (k - 1) * sr * 2.3, b.y + b.h * 0.76, sr, k < stars);
      if (!open) {
        ctx.fillStyle = 'rgba(22,11,51,0.5)';
        roundRect(ctx, b.x, b.y, b.w, b.h, 20);
        ctx.fill();
        drawLock(ctx, b.x + b.w / 2, b.y + b.h * 0.45, Math.min(b.w, b.h) * 0.16);
      }
    }
  }

  function drawLock(ctx, x, y, r) {
    ctx.lineWidth = r * 0.3;
    ctx.strokeStyle = C.white;
    ctx.beginPath();
    ctx.arc(x, y - r * 0.4, r * 0.55, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = C.white;
    roundRect(ctx, x - r * 0.85, y - r * 0.4, r * 1.7, r * 1.3, r * 0.25);
    ctx.fill();
  }

  function drawHud(ctx) {
    const { w, h } = size;
    const { hudH, bottomH } = view;
    const left = buttons.find((b) => b.id === 'menu');
    const room = w - (left.x + left.w + 12) * 2;
    const cy = hudH / 2;
    const r = Math.min(hudH * 0.24, room / 14);
    ctx.fillStyle = 'rgba(22,11,51,0.25)';
    roundRect(ctx, left.x + left.w + 10, hudH * 0.14, room - 0, hudH * 0.72, hudH * 0.3);
    ctx.fill();
    if (game.job === 'sail') {
      // boat -> dock, with a tick when docked
      const done = game.movers[0].docked;
      drawJobIcon(ctx, 'sail', w / 2 - r * 2.6, cy, r * 1.1, time);
      ctx.fillStyle = C.sun;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w / 2 - r * 0.9, cy - r * 0.3);
      ctx.lineTo(w / 2 + r * 0.3, cy - r * 0.3);
      ctx.lineTo(w / 2 + r * 0.3, cy - r * 0.7);
      ctx.lineTo(w / 2 + r * 1.1, cy);
      ctx.lineTo(w / 2 + r * 0.3, cy + r * 0.7);
      ctx.lineTo(w / 2 + r * 0.3, cy + r * 0.3);
      ctx.lineTo(w / 2 - r * 0.9, cy + r * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      drawDockIcon(ctx, w / 2 + r * 2.6, cy, r, done);
    } else if (game.job === 'herd') {
      const n = game.movers.length;
      const gap = r * 2.5;
      for (let i = 0; i < n; i++) {
        const m = game.movers[i];
        const x = w / 2 + (i - (n - 1) / 2) * gap;
        ctx.fillStyle = m.inPool ? 'rgba(63,210,240,0.9)' : 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.arc(x, cy, r * 1.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = m.inPool ? 1 : 0.45;
        if (m.kind === 'duck') drawDuck(ctx, x, cy, r * 0.7, -Math.PI / 2);
        else drawBall(ctx, x, cy, r * 0.75, 0);
        ctx.globalAlpha = 1;
      }
    } else {
      const n = game.level.shoo.snacks;
      const gap = r * 2.4;
      for (let i = 0; i < n; i++) {
        const x = w / 2 + (i - (n - 1) / 2) * gap;
        ctx.globalAlpha = i < game.snacks ? 1 : 0.25;
        drawSnack(ctx, i, x, cy, r * 0.85);
        ctx.globalAlpha = 1;
      }
    }
    // bottom strip: shells to find and the hurry-up star, or the picnic clock
    const by = h - bottomH / 2;
    const br = Math.min(bottomH * 0.26, w / 22);
    if (game.job === 'shoo') {
      const sh = game.level.shoo;
      const k = Math.min(1, game.clock / sh.duration);
      const bw = Math.min(w * 0.7, 460);
      const bx = (w - bw) / 2;
      ctx.fillStyle = 'rgba(22,11,51,0.35)';
      roundRect(ctx, bx, by - br * 0.6, bw, br * 1.2, br * 0.6);
      ctx.fill();
      ctx.fillStyle = C.sun;
      roundRect(ctx, bx, by - br * 0.6, Math.max(br * 1.2, bw * k), br * 1.2, br * 0.6);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = C.ink;
      roundRect(ctx, bx, by - br * 0.6, bw, br * 1.2, br * 0.6);
      ctx.stroke();
      drawStar(ctx, bx + bw + br * 1.3, by, br, k >= 1);
    } else {
      const shells = game.shells;
      const gap = br * 2.6;
      const total = shells.length + 1;
      const x0 = w / 2 - ((total - 1) * gap) / 2;
      shells.forEach((sh, i) => {
        ctx.globalAlpha = sh.got ? 1 : 0.35;
        drawShell(ctx, x0 + i * gap, by, br * 0.9, sh.got ? time : 0);
        ctx.globalAlpha = 1;
      });
      // the speed star: its ring runs down until par
      const sx = x0 + shells.length * gap + br * 0.3;
      const left2 = Math.max(0, 1 - game.time / game.level.par);
      drawStar(ctx, sx, by, br * 0.9, left2 > 0);
      if (left2 > 0 && game.status === 'play') {
        ctx.strokeStyle = C.sun;
        ctx.lineWidth = Math.max(2, br * 0.2);
        ctx.beginPath();
        ctx.arc(sx, by, br * 1.25, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left2);
        ctx.stroke();
      }
    }
  }

  function drawDockIcon(ctx, x, y, r, done) {
    ctx.fillStyle = '#b07a4a';
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.fillRect(x - r, y - r * 0.9, r * 2, r * 0.45);
    ctx.strokeRect(x - r, y - r * 0.9, r * 2, r * 0.45);
    ctx.fillRect(x - r, y - r * 0.9, r * 0.35, r * 1.8);
    ctx.strokeRect(x - r, y - r * 0.9, r * 0.35, r * 1.8);
    ctx.fillRect(x + r * 0.65, y - r * 0.9, r * 0.35, r * 1.8);
    ctx.strokeRect(x + r * 0.65, y - r * 0.9, r * 0.35, r * 1.8);
    if (done) {
      ctx.strokeStyle = '#3fe07a';
      ctx.lineWidth = r * 0.35;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - r * 0.4, y + r * 0.1);
      ctx.lineTo(x - r * 0.05, y + r * 0.5);
      ctx.lineTo(x + r * 0.55, y - r * 0.3);
      ctx.stroke();
    }
  }

  function hintFor() {
    if (game.status !== 'play') return null;
    const idle = time - lastGustAt;
    const early = game.gustCount === 0;
    const alpha = early ? Math.min(1, game.time * 2) : Math.min(1, (idle - HINT_IDLE) * 1.5);
    if (alpha <= 0) return null;
    if (game.job === 'shoo') {
      const p = game.level.shoo.picnic;
      let g = null;
      let d = Infinity;
      for (const gl of game.gulls) {
        if (gl.state === 'flee' || gl.x < 0 || gl.x > FIELD_W || gl.y < 0 || gl.y > FIELD_H) continue;
        const dd = Math.hypot(gl.x - p.x, gl.y - p.y);
        if (dd < d) [d, g] = [dd, gl];
      }
      if (!g) return null;
      const dx = (g.x - p.x) / d;
      const dy = (g.y - p.y) / d;
      const sx = g.x - dx * 45;
      const sy = g.y - dy * 45;
      return { alpha, finger: index < 3 || !early ? [sx, sy, sx + dx * 80, sy + dy * 80] : null };
    }
    const m = game.movers.find((mm) => !mm.docked && !mm.inPool);
    if (!m) return null;
    const { to } = routeTo(game.level, m.x, m.y, m.r);
    const d = Math.hypot(to[0] - m.x, to[1] - m.y) || 1;
    const dx = (to[0] - m.x) / d;
    const dy = (to[1] - m.y) / d;
    const reach = Math.min(d, 140);
    return {
      alpha,
      arrow: [m.x, m.y, m.x + dx * reach, m.y + dy * reach],
      finger: index < 3 || !early ? [m.x - dx * 45, m.y - dy * 45, m.x + dx * 40, m.y + dy * 40] : null,
    };
  }

  function drawPlay(ctx) {
    drawBackdrop(ctx, game.job);
    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.s, view.s);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, FIELD_W, FIELD_H);
    ctx.clip();
    renderer.drawField(ctx, game, view, time, lastDt, { hint: hintFor() });
    ctx.restore();
    ctx.lineWidth = 4 / view.s;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.strokeRect(0, 0, FIELD_W, FIELD_H);
    ctx.restore();
    // the finger's trail
    const now = time;
    trail = trail.filter((p) => now - p.t < TRAIL_KEEP);
    if (trail.length > 1) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 1; i < trail.length; i++) {
        const a = 1 - (now - trail[i].t) / TRAIL_KEEP;
        ctx.strokeStyle = `rgba(255,255,255,${0.5 * a})`;
        ctx.lineWidth = 4 + 10 * a;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
      }
    }
    drawHud(ctx);
    if (game.job === 'shoo' && game.status === 'play' && game.time < DEFEND_SHOW) {
      // a big call to action as a picnic level starts
      const t = game.time;
      const px = Math.min(size.h * 0.09, size.w / 5);
      const pop = 1 + Math.max(0, 0.3 - t) * 2 + Math.sin(time * 8) * 0.03;
      ctx.save();
      ctx.globalAlpha = Math.min(1, (DEFEND_SHOW - t) / 0.4);
      outlined(ctx, 'DEFEND!', size.w / 2, view.oy + FIELD_H * view.s * 0.24, px * pop, C.sun, size.w * 0.92);
      ctx.restore();
    }
    if (game.status === 'won') drawWin(ctx);
    else if (game.status === 'fail') drawFail(ctx);
    for (const b of buttons) b.icon ? drawIconButton(ctx, b) : drawButton(ctx, b, b.fill);
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

  function drawWin(ctx) {
    const { w, h } = size;
    const t = game.statusT;
    if (t < 0.5) return; // let the boat glide in / the last ball settle first
    const k = Math.min(1, (t - 0.5) / 0.4);
    ctx.fillStyle = `rgba(22,11,51,${0.5 * k})`;
    ctx.fillRect(0, 0, w, h);
    drawConfetti(ctx, t);
    const px = Math.min(h * 0.08, w / 6);
    const pop = 1 + Math.max(0, 0.9 - t) * 1.2 + Math.sin(time * 6) * 0.04;
    const ty = view.hudH + px * 1.2;
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
    // what earned the stars, in pictures: shells, the speed star, or snacks kept
    const iy = starY + r * 1.9;
    const ir = Math.min(r * 0.45, w / 24);
    if (game.job === 'shoo') {
      const n = game.level.shoo.snacks;
      for (let i = 0; i < n; i++) {
        ctx.globalAlpha = i < game.snacks ? 1 : 0.3;
        drawSnack(ctx, i, w / 2 + (i - (n - 1) / 2) * ir * 2.6, iy, ir);
      }
      ctx.globalAlpha = 1;
    } else {
      const n = game.shells.length;
      for (let i = 0; i < n; i++) {
        ctx.globalAlpha = game.shells[i].got ? 1 : 0.3;
        drawShell(ctx, w / 2 + (i - n / 2) * ir * 2.6, iy, ir, 0);
      }
      ctx.globalAlpha = game.time <= game.level.par ? 1 : 0.3;
      drawStar(ctx, w / 2 + (n / 2) * ir * 2.6, iy, ir, true);
      ctx.globalAlpha = 1;
    }
  }

  function drawFail(ctx) {
    const { w, h } = size;
    const t = game.statusT;
    const k = Math.min(1, t / 0.5);
    ctx.fillStyle = `rgba(22,11,51,${0.55 * k})`;
    ctx.fillRect(0, 0, w, h);
    const px = Math.min(h * 0.075, w / 6.5);
    const ty = view.hudH + px * 1.4;
    outlined(ctx, 'Oh no!', w / 2, ty, px, C.white, w * 0.9);
    // a cheeky gull with a snack, bobbing
    const gx = w / 2;
    const sc = Math.min(w, h) / 260;
    const gy = ty + px * 0.8 + 40 * sc + Math.sin(time * 5) * 6;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.scale(sc, sc);
    ctx.rotate(-Math.PI / 2 + Math.sin(time * 3) * 0.2);
    drawGull(ctx, { id: 3, x: 0, y: 0, vx: 1, vy: 0, state: 'flee', snack: true }, time);
    ctx.restore();
  }

  // ---------- debug hook ----------

  if (debug) {
    window.__hurricane = {
      state: () => game,
      screen: () => screen,
      buttons: () => buttons.map((b) => ({ ...b })),
      view: () => ({ ...view }),
      progress: () => JSON.parse(JSON.stringify(progress)),
      toScreen,
      toField,
      // a gust in field units, as if swiped
      gust: (x0, y0, x1, y1, seconds) => !!game && !!gust(game, x0, y0, x1, y1, seconds),
      level: (n) => startLevel(n - 1),
      goto: (name) => goto(name),
      autopilot(on = true) {
        autopilot = on;
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
      if (autopilot && game.status === 'play') {
        autoWait -= dt;
        if (autoWait <= 0) {
          if (game.job === 'shoo') {
            const sw = shooGust(game);
            if (sw) gust(game, ...sw);
            autoWait = 0.2;
          } else if (settled(game)) {
            const sw = planGust(game);
            if (sw) gust(game, ...sw);
            autoWait = 0.4;
          }
        }
      }
      const before = `${game.status}|${game.statusT > WIN_BUTTON_DELAY}|${game.statusT > FAIL_BUTTON_DELAY}`;
      step(game, dt);
      if (game.status === 'won' && !recorded) record();
      const after = `${game.status}|${game.statusT > WIN_BUTTON_DELAY}|${game.statusT > FAIL_BUTTON_DELAY}`;
      if (before !== after) layoutButtons();
    },

    draw(ctx) {
      if (screen === 'menu') drawMenu(ctx);
      else if (screen === 'picker') drawPicker(ctx);
      else if (game) drawPlay(ctx);
    },

    // Swipes: a press anywhere off the buttons starts one.
    onPickUp(x, y) {
      if (screen !== 'play' || !game || buttons.some((b) => hit(b, x, y))) return false;
      drag = { sx: x, sy: y, st: performance.now() };
      trail = [{ x, y, t: time }];
      return true;
    },
    onDrag(x, y) {
      if (!drag) return;
      trail.push({ x, y, t: time });
      // a long sweeping drag blows as it goes, one full gust at a time
      const len = Math.hypot(x - drag.sx, y - drag.sy) / view.s;
      if (len >= GUST_FULL_LEN) {
        const now = performance.now();
        blow(drag.sx, drag.sy, x, y, now - drag.st);
        drag = { sx: x, sy: y, st: now };
      }
    },
    onDrop(x, y) {
      if (!drag) return;
      trail.push({ x, y, t: time });
      const len = Math.hypot(x - drag.sx, y - drag.sy) / view.s;
      if (len >= GUST_MIN_LEN) blow(drag.sx, drag.sy, x, y, performance.now() - drag.st);
      drag = null;
    },
    onTap(x, y) {
      const b = buttons.find((r) => hit(r, x, y));
      if (!b) return;
      if (b.id === 'exit') host.exit();
      else if (b.id === 'play') startLevel(firstOpen());
      else if (b.id === 'picker') goto('picker');
      else if (b.id === 'menu') goto('menu');
      else if (b.id === 'level') {
        if (unlocked(progress, b.index)) startLevel(b.index);
      } else if (b.id === 'restart' || b.id === 'again') startLevel(index);
      else if (b.id === 'next') {
        if (index >= LEVELS.length - 1) goto('picker');
        else startLevel(index + 1);
      }
    },
  };

  const forced = Number(params.get('level'));
  if (Number.isInteger(forced) && forced >= 1 && forced <= LEVELS.length) startLevel(forced - 1);
  return api;
}
