// Rooftop Runaway as a launcher game: menu, level picker, HUD, the floating joystick, win and
// lose screens and saved stars. Rules live in sim.js (with the map in world.js and levels in
// levels.js); the 3D view (and three.js) is loaded only when a level starts.
import { LEVELS } from './levels.js';
import { buildLevel, linkStart, heightOf, STREET } from './world.js';
import {
  createRun, step, setInput, crowdCount, leaderOf, starTargets, WIN_DELAY, LOSE_DELAY,
} from './sim.js';
import { createBot, botInput } from './bot.js';
import {
  C, font, roundRect, outlined, drawStar, drawButton, drawIconButton, drawFinger, drawScene, drawTile,
  drawTeachIcon, drawBuddy, drawRobber2D, drawPerson2D,
} from './draw2d.js';

const SAVE_KEY = 'rooftop-runaway-progress';
const BUTTON_DELAY = 0.6; // after the win screen shows, before its buttons do

export function loadProgress(storage = globalThis.localStorage) {
  try {
    const v = JSON.parse(storage.getItem(SAVE_KEY) || '{}');
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

// Open: the first level, any level finished, and the one after the furthest finished.
export const unlocked = (progress, i) => i === 0 || progress.stars[i - 1] > 0 || progress.stars[i] > 0;

export const rooftopRunaway = {
  id: 'rooftop-runaway',
  title: 'Rooftop Runaway',
  drawTile,
  create,
};

const WORDS = {
  ladder: ['CLIMB!', C.sun], stairs: ['CLIMB!', C.sun], crates: ['CLIMB!', C.sun], palm: ['CLIMB!', C.sun],
  bounce: ['BOING!', C.foam], hop: ['HOP!', C.sun], slide: ['WHEE!', C.foam], zip: ['ZOOM!', C.foam],
  bonk: ['BONK!', C.pink], join: ['+1', C.sun], rescue: ['YAY!', C.green],
};
const HINT_WORD = { ladder: 'CLIMB!', stairs: 'CLIMB!', crates: 'CLIMB!', palm: 'CLIMB!', bounce: 'BOING!', zip: 'ZOOM!', slide: 'WHEE!', hop: 'HOP!' };

const hit = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function create(host) {
  const params = new URLSearchParams(location.search);
  let size = { w: 1, h: 1 };
  let progress = loadProgress();
  let screen = 'menu'; // 'menu' | 'picker' | 'play'
  let index = 0;
  let run = null;
  let view = null;
  let viewModule = null;
  let loading = false;
  let closed = false;
  let buttons = [];
  let time = 0;
  let recorded = false;
  let phase = null;
  let stick = null; // { x0, y0, x, y } while a finger is down
  let autopilot = null;
  let words = []; // floating words over the scene
  let lastEvent = -1;
  let moveT = 0; // seconds since the level began without the player steering

  const totalStars = () => progress.stars.reduce((a, b) => a + b, 0);
  const firstOpen = () => {
    for (let i = 0; i < LEVELS.length; i++) if (unlocked(progress, i) && progress.stars[i] === 0) return i;
    return 0;
  };
  const iconSize = () => Math.max(48, Math.min(68, size.w * 0.12));
  const pad = () => Math.max(10, size.w * 0.025);
  const stickR = () => clamp(Math.min(size.w, size.h) * 0.12, 50, 90);

  // what the end of a run looks like: 'play', 'cheer', 'won', 'oops', 'lost'
  function runPhase() {
    if (!run) return null;
    if (run.status === 'won') return run.endTime >= WIN_DELAY + BUTTON_DELAY ? 'won' : 'cheer';
    if (run.status === 'lost') return run.endTime >= LOSE_DELAY ? 'lost' : 'oops';
    return 'play';
  }

  function layoutButtons() {
    const { w, h } = size;
    const bw = Math.min(w * 0.8, 420);
    const bh = Math.max(64, Math.min(96, h * 0.085));
    const x = (w - bw) / 2;
    const icon = iconSize();
    const p = pad();
    if (screen === 'menu') {
      const n = firstOpen();
      buttons = [
        { id: 'exit', icon: 'home', x: p, y: p, w: icon, h: icon },
        { id: 'play', label: `Play ${n + 1}`, glyph: 'play', x, y: h * 0.7, w: bw, h: bh },
        { id: 'picker', label: 'Levels', glyph: 'grid', x, y: h * 0.7 + bh * 1.3, w: bw, h: bh, fill: C.white },
      ];
    } else if (screen === 'picker') {
      buttons = [{ id: 'menu', icon: 'back', x: p, y: p, w: icon, h: icon }];
      const cols = 3;
      const rows = Math.ceil(LEVELS.length / cols);
      const top = Math.max(icon + p * 2, h * 0.14);
      const gap = Math.max(12, w * 0.035);
      const tw = Math.min((w - gap * (cols + 1)) / cols, 200);
      const th = Math.min(tw * 1.1, (h - top - gap * (rows + 1)) / rows);
      const gx = (w - (tw * cols + gap * (cols - 1))) / 2;
      LEVELS.forEach((_, i) => {
        buttons.push({ id: 'level', index: i, x: gx + (i % cols) * (tw + gap), y: top + Math.floor(i / cols) * (th + gap), w: tw, h: th });
      });
    } else if (screen === 'play') {
      buttons = [{ id: 'menu', icon: 'home', x: p, y: p, w: icon * 0.9, h: icon * 0.9 }];
      const ph = runPhase();
      if (ph === 'won') {
        const last = index === LEVELS.length - 1;
        const by = h - bh * 2.6 - Math.max(20, h * 0.04);
        buttons.push({ id: 'next', label: last ? 'All done!' : 'Next', glyph: last ? null : 'next', x, y: by, w: bw, h: bh * 1.1 });
        buttons.push({ id: 'again', label: 'Again', glyph: 'restart', x: x + bw * 0.15, y: by + bh * 1.4, w: bw * 0.7, h: bh * 0.85, fill: C.white });
      } else if (ph === 'lost') {
        const by = h * 0.55;
        buttons.push({ id: 'again', label: 'Try again', glyph: 'restart', x, y: by, w: bw, h: bh * 1.1 });
        buttons.push({ id: 'goto-menu', label: 'Menu', x: x + bw * 0.15, y: by + bh * 1.45, w: bw * 0.7, h: bh * 0.85, fill: C.white });
      }
    }
  }

  function dropView() {
    if (view) view.dispose();
    view = null;
  }

  async function startLevel(i) {
    if (loading) return;
    loading = true;
    try {
      viewModule ??= await import('./view3d.js');
    } finally {
      loading = false;
    }
    if (closed) return;
    dropView();
    index = clamp(i, 0, LEVELS.length - 1);
    const level = buildLevel(LEVELS[index], index);
    run = createRun(level);
    view = viewModule.createView(level);
    host.canvas.before(view.el);
    view.resize(size.w, size.h);
    screen = 'play';
    recorded = false;
    stick = null;
    words = [];
    lastEvent = -1;
    moveT = 0;
    if (autopilot) autopilot.bot = createBot(run, autopilot.mode);
    phase = runPhase();
    layoutButtons();
  }

  function goto(next) {
    dropView();
    run = null;
    screen = next;
    stick = null;
    layoutButtons();
  }

  function record() {
    recorded = true;
    progress.stars[index] = Math.max(progress.stars[index], run.stars);
    saveProgress(progress);
  }

  // ---------- drawing ----------

  function drawMenu(ctx) {
    const { w, h } = size;
    drawScene(ctx, 0, 0, w, h, time, { ground: 0.66, crowd: 8, scale: 0.9, roofs: [[-0.05, 0.3, 0.42], [0.37, 0.64, 0.5], [0.71, 1.05, 0.4]] });
    ctx.fillStyle = '#6b5a8e';
    ctx.fillRect(0, h * 0.66, w, h * 0.34);
    const px = Math.min(h * 0.08, w / 6.2);
    ctx.save();
    ctx.translate(w / 2 + Math.sin(time * 2) * 3, h * 0.13);
    ctx.rotate(-0.04 + Math.sin(time * 1.4) * 0.02);
    outlined(ctx, 'ROOFTOP', 0, 0, px, C.foam, w * 0.9);
    outlined(ctx, 'RUNAWAY!', 0, px * 1.15, px * 1.2, C.sun, w * 0.92);
    ctx.restore();
    const total = totalStars();
    if (total > 0) {
      const ty = h * 0.66 - px * 0.6;
      const r = Math.min(h * 0.022, w * 0.045);
      ctx.font = font(r * 1.8);
      const label = `${total} / ${LEVELS.length * 3}`;
      const tw = ctx.measureText(label).width;
      drawStar(ctx, w / 2 - tw / 2 - r * 0.8, ty, r, true);
      outlined(ctx, label, w / 2 + r * 0.8, ty, r * 1.8, C.white);
    }
    for (const b of buttons) b.icon ? drawIconButton(ctx, b) : drawButton(ctx, b, b.fill);
    if (loading) outlined(ctx, '…', w / 2, h * 0.66, px * 0.6, C.white);
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

  function drawPicker(ctx) {
    const { w, h } = size;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, C.night);
    g.addColorStop(0.5, C.dusk);
    g.addColorStop(1, C.pink);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
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
      const tg = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
      tg.addColorStop(0, '#ffb36b');
      tg.addColorStop(0.62, '#ff8ac0');
      tg.addColorStop(0.62, '#6b5a8e');
      tg.addColorStop(1, '#4a3d6a');
      ctx.fillStyle = tg;
      roundRect(ctx, b.x, b.y, b.w, b.h, 20);
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = open ? C.white : 'rgba(255,255,255,0.4)';
      ctx.stroke();
      const r = Math.min(b.w * 0.2, b.h * 0.2);
      drawTeachIcon(ctx, L.teach, b.x + b.w * 0.3, b.y + b.h * 0.34, r, open ? time : 0);
      outlined(ctx, String(b.index + 1), b.x + b.w * 0.72, b.y + b.h * 0.34, b.h * 0.34, C.white, b.w * 0.36);
      const sr = Math.min(b.w * 0.12, b.h * 0.11);
      for (let k = 0; k < 3; k++) drawStar(ctx, b.x + b.w / 2 + (k - 1) * sr * 2.3, b.y + b.h * 0.8, sr, k < stars);
      if (!open) {
        ctx.fillStyle = 'rgba(22,11,51,0.55)';
        roundRect(ctx, b.x, b.y, b.w, b.h, 20);
        ctx.fill();
        drawLock(ctx, b.x + b.w / 2, b.y + b.h * 0.45, Math.min(b.w, b.h) * 0.16);
      }
    }
    if (loading) outlined(ctx, '…', w / 2, h - 40, 40, C.white);
  }

  // The crowd's size, with three stars lighting up as it reaches each star's number.
  function drawCount(ctx) {
    const { w } = size;
    const n = crowdCount(run);
    const total = run.level.total;
    const targets = starTargets(total);
    const icon = buttons[0];
    const ph = icon.h;
    const cy = icon.y + ph / 2;
    const px = ph * 0.62;
    ctx.font = font(px);
    const numW = ctx.measureText(String(n)).width;
    ctx.font = font(px * 0.5, 800);
    const totW = ctx.measureText(`/${total}`).width;
    const sr = ph * 0.22;
    const pw = ph * 0.8 + numW + totW + sr * 7.5 + ph * 0.5;
    const x0 = Math.max(icon.x + icon.w + 10, w / 2 - pw / 2);
    ctx.fillStyle = 'rgba(22,11,51,0.5)';
    roundRect(ctx, x0, icon.y, pw, ph, ph / 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.stroke();
    drawBuddy(ctx, x0 + ph * 0.5, cy - ph * 0.02, ph * 0.5, C.sun, true);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = font(px);
    ctx.lineWidth = px * 0.16;
    ctx.strokeStyle = C.ink;
    const nx = x0 + ph * 0.85;
    ctx.strokeText(String(n), nx, cy + 1);
    ctx.fillStyle = C.white;
    ctx.fillText(String(n), nx, cy + 1);
    ctx.font = font(px * 0.5, 800);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(`/${total}`, nx + numW + 2, cy + px * 0.18);
    for (let k = 0; k < 3; k++) {
      const on = n >= targets[k];
      drawStar(ctx, nx + numW + totW + sr * 2.0 + k * sr * 2.3, cy, sr * (on ? 1.05 : 0.85), on);
    }
  }

  function addWords() {
    for (const e of run.events) {
      if (e.t <= lastEvent) continue;
      const wd = WORDS[e.type];
      if (!wd) continue;
      // link words only for the leader (the event is made only when the leader takes one)
      words.push({ text: wd[0], colour: wd[1], x: e.x, y: e.y, h: e.h + 1.4, born: time });
    }
    if (run.events.length) lastEvent = Math.max(lastEvent, run.events[run.events.length - 1].t);
    words = words.filter((wd) => time - wd.born < 1.1);
  }

  function drawWords(ctx) {
    const px = Math.min(size.h * 0.045, size.w / 10);
    for (const wd of words) {
      const k = (time - wd.born) / 1.1;
      const p = view.project(wd.x, wd.y, wd.h);
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      outlined(ctx, wd.text, p.x, p.y - k * px * 1.4, px * (1 + Math.max(0, 0.15 - k) * 3), wd.colour);
      ctx.globalAlpha = 1;
    }
  }

  // Robbers who have lost the crowd scratch their heads.
  function drawPuzzled(ctx) {
    const px = Math.min(size.h * 0.04, size.w / 12);
    for (const r of run.robbers) {
      if (r.state !== 'confused' && r.state !== 'return') continue;
      const p = view.project(r.x, r.y, 2.0);
      const bob = Math.sin(time * 4 + r.id) * 3;
      ctx.globalAlpha = r.state === 'return' ? 0.6 : 1;
      outlined(ctx, '?', p.x, p.y + bob, r.state === 'return' ? px * 0.7 : px, C.white);
      ctx.globalAlpha = 1;
    }
  }

  // Big words at ladders that teach something, while the leader is near and hasn't used them.
  function drawHints(ctx) {
    const L = leaderOf(run);
    if (!L || L.state !== 'crowd') return;
    const px = Math.min(size.h * 0.04, size.w / 11);
    for (const link of run.level.links) {
      if (!link.hint || run.linkLast[link.id] > -99 || link.from !== L.layer) continue;
      const c = linkStart(link, 0.5);
      if (Math.hypot(c[0] - L.x, c[1] - L.y) > 9) continue;
      const p = view.project(c[0], c[1], heightOf(run.level, link.from) + 4.6);
      const pop = 1 + Math.sin(time * 6) * 0.08;
      outlined(ctx, HINT_WORD[link.type] || 'GO!', p.x, p.y, px * pop, C.sun);
    }
  }

  // When the getaway is off the screen, a bouncing arrow at the edge points the way.
  function drawGoalPointer(ctx) {
    const { w, h } = size;
    const G = run.level.goal;
    const p = view.project(G.x + G.w / 2, G.y + G.d / 2, 1);
    const top = buttons[0].y + buttons[0].h + 12;
    if (p.x > 0 && p.x < w && p.y > top && p.y < h && !p.behind) return;
    const cx = w / 2;
    const cy = (top + h) / 2;
    let dx = p.x - cx;
    let dy = p.y - cy;
    if (p.behind) {
      dx = -dx;
      dy = -dy;
    }
    const a = Math.atan2(dy, dx);
    const r = Math.min(size.w, size.h) * 0.045;
    const m = r * 1.6;
    // where the line from the middle leaves the screen
    const kx = Math.abs(dx) > 1e-6 ? (w / 2 - m) / Math.abs(dx) : Infinity;
    const ky = dy < 0 ? (cy - top - m) / -dy : dy > 0 ? (h - cy - m) / dy : Infinity;
    const k = Math.min(kx, ky);
    const bob = Math.sin(time * 6) * r * 0.25;
    const x = cx + dx * k + Math.cos(a) * bob;
    const y = cy + dy * k + Math.sin(a) * bob;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = C.green;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 1.1, 0);
    ctx.lineTo(-r * 0.5, -r * 0.9);
    ctx.lineTo(-r * 0.2, 0);
    ctx.lineTo(-r * 0.5, r * 0.9);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }

  function drawStick(ctx) {
    if (!stick) return;
    const R = stickR();
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = 'rgba(22,11,51,0.35)';
    ctx.beginPath();
    ctx.arc(stick.x0, stick.y0, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.white;
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    let dx = stick.x - stick.x0;
    let dy = stick.y - stick.y0;
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx *= R / d;
      dy *= R / d;
    }
    ctx.fillStyle = C.sun;
    ctx.beginPath();
    ctx.arc(stick.x0 + dx, stick.y0 + dy, R * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.restore();
  }

  // At the start: RUN! and a finger showing the drag, until the player steers.
  function drawStartHint(ctx) {
    const { w, h } = size;
    if (run.moved || run.status !== 'play') return;
    const px = Math.min(h * 0.09, w / 5);
    outlined(ctx, 'RUN!', w / 2, h * 0.3, px * (1 + Math.sin(time * 5) * 0.06), C.sun);
    if (moveT > 1.2) {
      const k = (time * 0.8) % 1;
      const e = k < 0.15 ? 0 : k > 0.8 ? 1 : (k - 0.15) / 0.65;
      const ease = e * e * (3 - 2 * e);
      const x0 = w / 2;
      const y0 = h * 0.78;
      const len = Math.min(h * 0.12, 120);
      ctx.save();
      ctx.globalAlpha = k > 0.88 ? (1 - k) / 0.12 : 1;
      ctx.fillStyle = 'rgba(22,11,51,0.3)';
      ctx.beginPath();
      ctx.arc(x0, y0, stickR(), 0, Math.PI * 2);
      ctx.fill();
      drawFinger(ctx, x0, y0 - len * ease, Math.max(1.2, w / 360));
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

  function drawWin(ctx) {
    const { w, h } = size;
    const t = run.endTime - WIN_DELAY;
    if (t < 0) return;
    const k = Math.min(1, t / 0.4);
    ctx.fillStyle = `rgba(22,11,51,${0.55 * k})`;
    ctx.fillRect(0, 0, w, h);
    drawConfetti(ctx, t);
    const px = Math.min(h * 0.08, w / 6);
    const pop = 1 + Math.max(0, 0.6 - t) * 1.2 + Math.sin(time * 6) * 0.04;
    const ty = h * 0.17;
    outlined(ctx, run.stars === 3 ? 'WOW!' : 'HOORAY!', w / 2, ty, px * pop, C.sun, w * 0.9);
    const r = Math.min(w * 0.11, h * 0.06);
    const starY = ty + px * 0.9 + r * 1.3;
    for (let i = 0; i < 3; i++) {
      const at = 0.3 + i * 0.25;
      const sk = t < at ? 0 : Math.min(1, (t - at) / 0.15);
      const grow = sk * (1 + Math.max(0, 0.3 - (t - at)) * 0.8);
      if (grow <= 0) continue;
      drawStar(ctx, w / 2 + (i - 1) * r * 2.4, starY - (i === 1 ? r * 0.3 : 0), r * grow, i < run.stars);
    }
    // everyone who got away, in rows
    const n = run.saved;
    const total = run.level.total;
    const s = Math.min(w / 14, h * 0.045);
    const perRow = Math.min(10, Math.max(5, Math.ceil(total / 3)));
    const y0 = starY + r * 1.6;
    for (let i = 0; i < total; i++) {
      const row = Math.floor(i / perRow);
      const inRow = Math.min(perRow, total - row * perRow);
      const x = w / 2 + (i % perRow - (inRow - 1) / 2) * s * 1.15;
      const y = y0 + row * s * 1.3 + (i < n ? -Math.abs(Math.sin(time * 6 + i)) * s * 0.15 : 0);
      ctx.globalAlpha = i < n ? 1 : 0.25;
      drawBuddy(ctx, x, y, s * 0.9, i < n ? ['#ffe14d', '#19c3d6', '#ff8a4c', '#59d86b', '#b46bff', '#ffffff'][i % 6] : '#ffffff', i === 0 && n > 0);
    }
    ctx.globalAlpha = 1;
    const rows = Math.ceil(total / perRow);
    outlined(ctx, `${n} safe!`, w / 2, y0 + rows * s * 1.3 + px * 0.35, px * 0.6, C.white);
  }

  function drawLose(ctx) {
    const { w, h } = size;
    const t = run.endTime;
    const k = Math.min(1, t / 0.6);
    ctx.fillStyle = `rgba(22,11,51,${0.6 * k})`;
    ctx.fillRect(0, 0, w, h);
    if (t < 0.4) return;
    const px = Math.min(h * 0.08, w / 6);
    outlined(ctx, 'Oh no!', w / 2, h * 0.22, px * 1.2, C.pink);
    // a robber tiptoeing off with a full sack
    const s = Math.min(w, h) * 0.16;
    const x = w * 0.3 + ((t * 40) % (w * 0.4));
    drawRobber2D(ctx, x, h * 0.46, s, time * 8, { full: true });
    drawPerson2D(ctx, w * 0.72, h * 0.46, s * 0.75, 0, C.sun, { cap: true, arms: true });
  }

  function drawHud(ctx) {
    const { w, h } = size;
    ctx.clearRect(0, 0, w, h);
    addWords();
    drawPuzzled(ctx);
    drawHints(ctx);
    drawWords(ctx);
    if (run.status === 'play') {
      drawGoalPointer(ctx);
      drawStick(ctx);
      drawStartHint(ctx);
      drawCount(ctx);
    } else if (run.status === 'won') {
      if (run.endTime < WIN_DELAY) drawCount(ctx);
      drawWin(ctx);
    } else drawLose(ctx);
    for (const b of buttons) b.icon ? drawIconButton(ctx, b) : drawButton(ctx, b, b.fill);
  }

  // ---------- input: a floating joystick ----------

  function steerFromStick() {
    if (!run) return;
    if (!stick) {
      setInput(run, 0, 0);
      return;
    }
    const R = stickR();
    const dx = stick.x - stick.x0;
    const dy = stick.y - stick.y0;
    const d = Math.hypot(dx, dy);
    const dead = R * 0.12;
    if (d < dead) {
      setInput(run, 0, 0);
      return;
    }
    // full speed well before the edge of the ring: little fingers don't drag far
    const m = Math.min(1, (d - dead) / (R * 0.45));
    setInput(run, (dx / d) * m, (-dy / d) * m);
  }

  // ---------- debug hook ----------

  if (params.has('debug')) {
    window.__rooftop = {
      run: () => run,
      screen: () => screen,
      buttons: () => buttons.map((b) => ({ ...b })),
      progress: () => JSON.parse(JSON.stringify(progress)),
      start: (n) => startLevel(n - 1),
      goto: (name) => goto(name),
      input: (x, y) => run && setInput(run, x, y),
      // steer with the bot ('all' friends first, or 'goal'), or false to stop
      autopilot(mode = 'all') {
        autopilot = mode ? { mode, bot: run ? createBot(run, mode) : null } : null;
      },
      fastForward(seconds) {
        for (let t = 0; run && t < seconds; t += 1 / 30) api.update(1 / 30);
      },
      project: (x, y, h = 0) => (view ? view.project(x, y, h) : null),
      leaderScreen() {
        const L = run && leaderOf(run);
        return L && view ? view.project(L.x, L.y, L.h + 0.5) : null;
      },
      overview: (on = true) => view && view.setOverview(on),
      // put the leader somewhere (the crowd follows as best it can), to reach parts of a level fast
      warp(x, y, layer = STREET) {
        const L = run && leaderOf(run);
        if (!L) return false;
        for (const p of run.people) {
          if (p.state !== 'crowd') continue;
          p.x = x + (p.id % 5) * 0.3 - 0.6;
          p.y = y - Math.floor(p.id / 5) * 0.4;
          p.layer = layer;
          p.h = heightOf(run.level, layer);
          p.cursor = run.trail.length;
        }
        run.trail.push({ x, y, layer });
        for (const p of run.people) if (p.state === 'crowd') p.cursor = run.trail.length - 1;
        return true;
      },
    };
  }

  const api = {
    resize(w, h) {
      size = { w, h };
      if (view) view.resize(w, h);
      layoutButtons();
    },

    update(dt) {
      time += dt;
      if (screen !== 'play' || !run || !view) return;
      if (autopilot && run.status === 'play') {
        autopilot.bot ??= createBot(run, autopilot.mode);
        const v = botInput(run, autopilot.bot, dt);
        setInput(run, v.x, v.y);
      } else steerFromStick();
      if (!run.moved) moveT += dt;
      step(run, dt);
      if (run.status === 'won' && !recorded) record();
      const now = runPhase();
      if (now !== phase) {
        phase = now;
        if (now !== 'play') stick = null;
        layoutButtons();
      }
      view.render(run, dt);
    },

    draw(ctx) {
      if (screen === 'menu') drawMenu(ctx);
      else if (screen === 'picker') drawPicker(ctx);
      else if (run && view) drawHud(ctx);
      else drawMenu(ctx);
    },

    // A press anywhere off the buttons is the joystick's middle; dragging steers.
    onPickUp(x, y) {
      if (screen !== 'play' || !run || run.status !== 'play' || buttons.some((b) => hit(b, x, y))) return false;
      stick = { x0: x, y0: y, x, y };
      return true;
    },
    onDrag(x, y) {
      if (!stick) return;
      stick.x = x;
      stick.y = y;
      // the ring follows a finger that runs past its edge, so turning round is quick
      const R = stickR();
      const dx = x - stick.x0;
      const dy = y - stick.y0;
      const d = Math.hypot(dx, dy);
      if (d > R) {
        stick.x0 = x - (dx / d) * R;
        stick.y0 = y - (dy / d) * R;
      }
    },
    onDrop() {
      stick = null;
    },
    onTap(x, y) {
      const b = buttons.find((r) => hit(r, x, y));
      if (!b || loading) return;
      if (b.id === 'exit') {
        closed = true;
        dropView();
        host.exit();
      } else if (b.id === 'play') startLevel(firstOpen());
      else if (b.id === 'picker') goto('picker');
      else if (b.id === 'menu') goto('menu');
      else if (b.id === 'goto-menu') goto('menu');
      else if (b.id === 'level') {
        if (unlocked(progress, b.index)) startLevel(b.index);
      } else if (b.id === 'again') startLevel(index);
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
