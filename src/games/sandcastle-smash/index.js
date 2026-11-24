// Sandcastle Smash as a launcher game: menu, level picker, play, win and try-again screens,
// the pull-back slingshot with its dotted flight preview, the camera, and saved stars.
// Rules live in sim.js (physics in physics.js), levels in levels.js, drawing in draw.js.
import { LEVELS, CHAPTERS } from './levels.js';
import {
  DT, SLING, MIN_POWER, ANGLE_MIN, ANGLE_MAX, NUTS, createLevel, step, fire, activate, canFire, crabs, nuts,
  flightPath,
} from './sim.js';
import { aabb } from './physics.js';
import { planShot } from './bot.js';
import {
  C, font, roundRect, outlined, drawStar, drawButton, drawIconButton, drawFinger, createRenderer, drawTile,
  drawCoconut, drawCrab, drawTeachIcon, drawArc, drawSky, drawSea,
} from './draw.js';

const SAVE_KEY = 'sandcastle-smash-progress';
const WIN_BUTTON_DELAY = 1.2; // seconds after the win before Next shows, so a last pull can't press it
const LOST_BUTTON_DELAY = 0.8;
const MAX_VIEW_W = 20; // never show less than this much beach across (metres) before panning
const MIN_VIEW_H = 11; // always show at least this much sky over the sand
const IDLE_HINT = 8; // seconds sitting with a loaded coconut before the ghost finger shows
const INTRO_HOLD = 0.9; // a wide level first shows the castle, then pans back to the slingshot
const PREVIEW_STEPS = 300; // the dotted arc shows up to five seconds of flight

const TEACH = {
  wood: 'Driftwood is tough!',
  ball: 'Beach balls bounce!',
  ice: 'Cooler ice is slippy!',
  split: 'Tap while it flies: it splits in three!',
  pier: 'Crabs on the pier!',
  bucket: 'Buckets don\'t break!',
  heavy: 'The bowling coconut is HEAVY!',
  pineapple: 'Pineapple goes POP! Tap or hit.',
  far: 'Far away! Pull hard.',
};

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

export const sandcastleSmash = {
  id: 'sandcastle-smash',
  title: 'Sandcastle Smash',
  drawTile,
  create,
};

const hit = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function create(host) {
  const params = new URLSearchParams(location.search);
  const debug = params.has('debug');
  const renderer = createRenderer();
  let size = { w: 1, h: 1 };
  let progress = loadProgress();
  let screen = 'menu'; // 'menu' | 'picker' | 'play'
  let game = null;
  let index = 0;
  let crabTotal = 0;
  let view = { s: 40, camX: 0, groundY: 600, hudH: 64, w: 1, h: 1 };
  let buttons = [];
  let time = 0;
  let acc = 0;
  let lastDt = 0;
  let recorded = false;
  let aim = null; // { x0, y0, x, y, anchor: 'pouch' | 'free' } in screen px while pulling
  let readyT = 0; // seconds the current coconut has sat in the slingshot
  let levelT = 0;
  let hintShot = null;

  const totalStars = () => progress.stars.reduce((a, b) => a + b, 0);
  const firstOpen = () => {
    for (let i = 0; i < LEVELS.length; i++) if (unlocked(progress, i) && progress.stars[i] === 0) return i;
    return 0;
  };
  const toScreen = (x, y) => ({ x: (x - view.camX) * view.s, y: view.groundY - y * view.s });
  const toWorld = (x, y) => ({ x: x / view.s + view.camX, y: (view.groundY - y) / view.s });
  const maxPull = () => clamp(Math.min(size.w, size.h) * 0.3, 110, 240);
  const camMax = () => (game ? Math.max(0, game.level.width - size.w / view.s) : 0);
  const restCam = () => {
    if (!game) return 0;
    const vw = size.w / view.s;
    return vw > game.level.width ? (game.level.width - vw) / 2 : 0;
  };

  function layoutView() {
    const { w, h } = size;
    const hudH = Math.max(64, Math.min(104, h * 0.085));
    const groundY = h - Math.max(40, (h - hudH) * 0.3);
    const L = game ? game.level : LEVELS[0];
    const s = Math.min(w / Math.min(L.width, MAX_VIEW_W), (groundY - hudH) / MIN_VIEW_H);
    view = { ...view, s, groundY, hudH, w, h };
    if (game) view.camX = clamp(view.camX, Math.min(0, restCam()), camMax());
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
        { id: 'play', label: `Play ${n + 1}`, glyph: 'play', x, y: h * 0.7, w: bw, h: bh },
        { id: 'picker', label: 'Levels', glyph: 'grid', x, y: h * 0.7 + bh * 1.3, w: bw, h: bh, fill: C.white },
      ];
    } else if (screen === 'picker') {
      buttons = [{ id: 'menu', icon: 'back', x: pad, y: pad, w: icon, h: icon }];
      const cols = 3;
      const rows = Math.ceil(LEVELS.length / cols);
      const top = Math.max(icon + pad * 2, h * 0.11);
      const gap = Math.max(10, w * 0.03);
      const tw = Math.min((w - gap * (cols + 1)) / cols, 200);
      const th = Math.min(tw * 0.95, (h - top - gap * (rows + 1)) / rows);
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
      } else if (game && game.status === 'lost' && game.statusT > LOST_BUTTON_DELAY) {
        const by = h - bh * 2.5 - Math.max(20, h * 0.04);
        buttons.push({ id: 'again', label: 'Try again', glyph: 'restart', x, y: by, w: bw, h: bh * 1.1 });
        buttons.push({ id: 'picker', label: 'Levels', glyph: 'grid', x: x + bw * 0.15, y: by + bh * 1.35, w: bw * 0.7, h: bh * 0.85, fill: C.white });
      }
    }
  }

  function startLevel(i) {
    index = clamp(i, 0, LEVELS.length - 1);
    game = createLevel(LEVELS[index]);
    crabTotal = crabs(game).length;
    screen = 'play';
    recorded = false;
    aim = null;
    acc = 0;
    readyT = 0;
    levelT = 0;
    hintShot = null;
    renderer.reset();
    layoutView();
    view.camX = camMax() > 0 ? camMax() : restCam();
    layoutButtons();
  }

  function goto(next) {
    screen = next;
    aim = null;
    if (next !== 'play') game = null;
    layoutButtons();
  }

  function record() {
    recorded = true;
    progress.stars[index] = Math.max(progress.stars[index], game.stars);
    saveProgress(progress);
  }

  // ---------- aiming ----------

  const pouch = () => toScreen(SLING.x, SLING.y);

  // The shot the finger is asking for, or null for a pull too short to count.
  function aimShot(a = aim) {
    if (!a) return null;
    const from = a.anchor === 'pouch' ? pouch() : { x: a.x0, y: a.y0 };
    const dx = from.x - a.x;
    const dy = from.y - a.y;
    const len = Math.hypot(dx, dy);
    const power = Math.min(1, len / maxPull());
    const angle = clamp(Math.atan2(-dy, dx), ANGLE_MIN, ANGLE_MAX);
    return { angle, power, ok: power >= MIN_POWER };
  }

  // The dotted preview: stops where it would first touch something.
  function previewPath(shot) {
    const boxes = [];
    for (const b of game.world.bodies) {
      if (b.kind === 'ground' || b.kind === 'nut') continue;
      boxes.push(aabb(b));
    }
    const r = NUTS[game.loaded || 'coco'].r;
    let stopped = false;
    const stop = (x, y) => {
      for (const q of boxes) {
        if (x > q[0] - r && x < q[2] + r && y > q[1] - r && y < q[3] + r) {
          stopped = true;
          return true;
        }
      }
      return x > game.level.width + 6;
    };
    const pts = flightPath(shot.angle, shot.power, { steps: PREVIEW_STEPS, every: 3, stop });
    return { pts, stopped };
  }

  // ---------- drawing ----------

  function drawMenu(ctx) {
    const { w, h } = size;
    const horizon = h * 0.6;
    drawSky(ctx, w, h, 'morning', horizon, time);
    drawSea(ctx, w, horizon, h * 0.66, 'morning', time);
    ctx.fillStyle = C.sand;
    ctx.fillRect(0, h * 0.66, w, h * 0.34);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.66);
    ctx.lineTo(w, h * 0.66);
    ctx.stroke();
    const px = Math.min(h * 0.075, w / 7.5);
    ctx.save();
    ctx.translate(w / 2 + Math.sin(time * 2) * 3, h * 0.15);
    ctx.rotate(-0.04 + Math.sin(time * 1.4) * 0.02);
    outlined(ctx, 'SANDCASTLE', 0, 0, px, C.sun, w * 0.92);
    outlined(ctx, 'SMASH!', 0, px * 1.15, px * 1.35, C.pink, w * 0.9);
    ctx.restore();
    // a little castle with a crab, and a coconut bouncing by
    const s = Math.min(w / 9, h * 0.06);
    const gy = h * 0.66;
    const cx = w * 0.6;
    ctx.save();
    for (const [bx, by] of [[-0.5, 0], [0.5, 0], [-0.5, 1], [0.5, 1], [0, 2]]) {
      ctx.save();
      ctx.translate(cx + bx * s, gy - by * s - s / 2);
      ctx.scale(s, s);
      ctx.fillStyle = C.sand;
      roundRect(ctx, -0.5, -0.5, 1, 1, 0.08);
      ctx.fill();
      ctx.lineWidth = 0.05;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      ctx.fillStyle = C.sandMid;
      ctx.fillRect(-0.1, -0.33, 0.2, 0.28);
      ctx.restore();
    }
    ctx.translate(cx, gy - 3.3 * s + Math.abs(Math.sin(time * 5)) * -s * 0.08);
    ctx.scale(s * 1.3, s * 1.3);
    drawCrab(ctx, { t: time, lw: 0.05, mood: (time % 5) < 1 ? 'laugh' : 'grumpy' });
    ctx.restore();
    const k = (time % 3) / 3;
    ctx.save();
    ctx.translate(w * 0.12 + k * w * 0.3, gy - s * 0.45 - Math.abs(Math.sin(k * Math.PI * 3)) * s * 2);
    ctx.scale(s, s);
    drawCoconut(ctx, 'coco', 0.45, k * 12, 0.05);
    ctx.restore();
    const total = totalStars();
    if (total > 0) {
      const ty = h * 0.635;
      const r = Math.min(h * 0.022, w * 0.045);
      ctx.font = font(r * 1.8);
      const label = `${total} / ${LEVELS.length * 3}`;
      const tw = ctx.measureText(label).width;
      drawStar(ctx, w / 2 - tw / 2 - r * 0.8, ty, r, true);
      outlined(ctx, label, w / 2 + r * 0.8, ty, r * 1.8, C.white);
    }
    for (const b of buttons) b.icon ? drawIconButton(ctx, b) : drawButton(ctx, b, b.fill);
  }

  const TILE = {
    morning: ['#9fe0ff', '#fff1c4'],
    noon: ['#4aa8ff', '#bfeeff'],
    sunset: [C.dusk, C.orange],
  };

  function drawPicker(ctx) {
    const { w, h } = size;
    drawSky(ctx, w, h, 'noon', h, time);
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
      const [top, bottom] = TILE[CHAPTERS[L.chapter].sky];
      ctx.fillStyle = 'rgba(22,11,51,0.3)';
      roundRect(ctx, b.x, b.y + 5, b.w, b.h, 18);
      ctx.fill();
      const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
      g.addColorStop(0, top);
      g.addColorStop(0.62, bottom);
      g.addColorStop(0.62, C.sand);
      g.addColorStop(1, C.sandMid);
      ctx.fillStyle = g;
      roundRect(ctx, b.x, b.y, b.w, b.h, 18);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = open ? C.white : 'rgba(255,255,255,0.4)';
      ctx.stroke();
      const r = Math.min(b.w * 0.18, b.h * 0.2);
      if (open) {
        drawTeachIcon(ctx, L.teach, b.x + b.w * 0.3, b.y + b.h * 0.36, r, time);
        outlined(ctx, String(b.index + 1), b.x + b.w * 0.72, b.y + b.h * 0.34, b.h * 0.32, C.white, b.w * 0.36);
      }
      const sr = Math.min(b.w * 0.11, b.h * 0.1);
      for (let k = 0; k < 3; k++) drawStar(ctx, b.x + b.w / 2 + (k - 1) * sr * 2.3, b.y + b.h * 0.8, sr, k < stars);
      if (!open) {
        ctx.fillStyle = 'rgba(22,11,51,0.45)';
        roundRect(ctx, b.x, b.y, b.w, b.h, 18);
        ctx.fill();
        drawLock(ctx, b.x + b.w * 0.36, b.y + b.h * 0.4, Math.min(b.w, b.h) * 0.13);
        outlined(ctx, String(b.index + 1), b.x + b.w * 0.7, b.y + b.h * 0.36, b.h * 0.28, 'rgba(255,255,255,0.75)', b.w * 0.36);
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

  // Top bar: coconuts still to throw, and the crabs (popped ones fade).
  function drawHud(ctx) {
    const { w } = size;
    const { hudH } = view;
    const left = buttons.find((b) => b.id === 'menu');
    const room = w - (left.x + left.w + 12) * 2;
    const ammo = [];
    if (game.loaded) ammo.push(game.loaded);
    ammo.push(...game.ammo);
    const r = Math.min(hudH * 0.17, room / (Math.max(ammo.length, crabTotal, 3) * 2.5));
    ctx.fillStyle = 'rgba(22,11,51,0.28)';
    const pw = Math.min(room, r * 2.5 * Math.max(ammo.length, crabTotal, 2) + r * 1.5);
    roundRect(ctx, w / 2 - pw / 2, hudH * 0.08, pw, hudH * 0.84, hudH * 0.25);
    ctx.fill();
    const row = (n, i) => w / 2 + (i - (n - 1) / 2) * r * 2.5;
    ammo.forEach((type, i) => {
      ctx.save();
      ctx.translate(row(ammo.length, i), hudH * 0.3);
      const big = i === 0 && game.loaded ? 1.15 : 0.9;
      ctx.scale(r * big, r * big);
      drawCoconut(ctx, type, type === 'pineapple' ? 0.8 : 0.95, 0, 0.12);
      ctx.restore();
    });
    const left2 = crabs(game).length;
    for (let i = 0; i < crabTotal; i++) {
      ctx.save();
      ctx.globalAlpha = i < left2 ? 1 : 0.25;
      ctx.translate(row(crabTotal, i), hudH * 0.72);
      ctx.scale(r * 1.9, r * 1.9);
      drawCrab(ctx, { t: i < left2 ? time + i : 0, lw: 0.07 });
      ctx.restore();
    }
  }

  function drawHintFinger(ctx) {
    const p = pouch();
    const shot = hintShot || { angle: 0.6, power: 0.8 };
    const len = shot.power * maxPull();
    const to = { x: p.x - Math.cos(shot.angle) * len, y: p.y + Math.sin(shot.angle) * len };
    const k = (time * 0.55) % 1;
    const e = k < 0.15 ? 0 : k > 0.75 ? 1 : (k - 0.15) / 0.6;
    const ease = e * e * (3 - 2 * e);
    const x = p.x + (to.x - p.x) * ease;
    const y = p.y + (to.y - p.y) * ease;
    const alpha = k > 0.9 ? (1 - k) / 0.1 : Math.min(1, k / 0.08);
    ctx.save();
    ctx.globalAlpha = 0.85 * alpha;
    if (ease > 0.6) {
      const { pts } = previewPath(shot);
      ctx.globalAlpha = 0.5 * alpha;
      drawArc(ctx, pts.map((q) => ({ ...toScreen(q.x, q.y), r: Math.max(3, view.s * 0.11) })), time);
    }
    ctx.globalAlpha = alpha;
    drawFinger(ctx, x, y, Math.max(1.1, size.w / 380));
    ctx.restore();
  }

  function drawTapPrompt(ctx) {
    const b = nuts(game).find((q) => q.shot === game.shots && !q.landed && NUTS[q.nut].tap);
    if (!b || game.tapped) return;
    const p = toScreen(b.x, b.y);
    const pulse = 1 + Math.sin(time * 14) * 0.12;
    const px = Math.max(22, Math.min(44, size.w * 0.05)) * pulse;
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, (NUTS[b.nut].r * view.s + 10) * pulse, 0, Math.PI * 2);
    ctx.stroke();
    outlined(ctx, 'TAP!', p.x, Math.max(view.hudH + px, p.y - NUTS[b.nut].r * view.s - px * 0.9), px, C.sun);
  }

  function drawPlay(ctx) {
    const { w, h } = size;
    const shake = renderer.shakeOffset(time);
    ctx.save();
    ctx.translate(shake.x, shake.y);
    const shot = aim && canFire(game) ? aimShot() : null;
    renderer.drawWorld(ctx, game, view, time, lastDt, shot && shot.ok ? { pull: shot.power, angle: shot.angle } : null);
    if (shot && shot.ok) {
      const { pts, stopped } = previewPath(shot);
      const dots = pts.map((q) => ({ ...toScreen(q.x, q.y), r: Math.max(3, view.s * 0.11) }));
      const end = stopped && dots.length ? { ...dots[dots.length - 1], r: Math.max(14, view.s * 0.55) } : null;
      drawArc(ctx, dots, time, end);
    }
    if (game.status === 'flying') drawTapPrompt(ctx);
    renderer.drawOffscreen(ctx, game, view, view.hudH);
    ctx.restore();
    if (showHint()) drawHintFinger(ctx);
    // a soft top band so the HUD reads over the sky
    ctx.fillStyle = 'rgba(22,11,51,0.16)';
    ctx.fillRect(0, 0, w, view.hudH);
    drawHud(ctx);
    // what's new on this level, for a grown-up to read out
    const tip = TEACH[game.level.teach];
    if (tip && levelT < 4.5 && game.shots === 0) {
      ctx.globalAlpha = Math.min(1, (4.5 - levelT) * 2);
      outlined(ctx, tip, w / 2, view.hudH + Math.min(h * 0.05, 48), Math.min(h * 0.032, w / 18), C.white, w * 0.9);
      ctx.globalAlpha = 1;
    }
    if (levelT < 2.2) {
      ctx.globalAlpha = Math.min(1, (2.2 - levelT) * 2);
      outlined(ctx, `${index + 1}. ${game.level.name}`, w / 2, view.hudH + Math.min(h * 0.12, 110), Math.min(h * 0.05, w / 11), C.sun, w * 0.9);
      ctx.globalAlpha = 1;
    }
    if (game.status === 'won') drawWin(ctx);
    if (game.status === 'lost') drawLost(ctx);
    for (const b of buttons) b.icon ? drawIconButton(ctx, b) : drawButton(ctx, b, b.fill);
  }

  function showHint() {
    if (!game || !canFire(game) || aim || game.status !== 'ready') return false;
    const early = index <= 1 && game.shots === 0 && readyT > 1.2;
    return early || readyT > IDLE_HINT;
  }

  function drawConfetti(ctx, t) {
    const { w, h } = size;
    const colours = [C.pink, C.sun, C.foam, C.white, C.orange, '#3a7bff', C.hat];
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

  function drawWin(ctx) {
    const { w, h } = size;
    const t = game.statusT;
    const k = Math.min(1, t / 0.4);
    ctx.fillStyle = `rgba(22,11,51,${0.5 * k})`;
    ctx.fillRect(0, 0, w, h);
    drawConfetti(ctx, t);
    const px = Math.min(h * 0.08, w / 6);
    const pop = 1 + Math.max(0, 0.5 - t) * 1.5 + Math.sin(time * 6) * 0.04;
    const ty = view.hudH + px * 1.3;
    outlined(ctx, game.stars === 3 ? 'WOW!' : 'Hooray!', w / 2, ty, px * pop, C.sun, w * 0.9);
    const r = Math.min(w * 0.11, h * 0.06);
    const starY = ty + px * 0.9 + r * 1.4;
    for (let i = 0; i < 3; i++) {
      const at = 0.3 + i * 0.25;
      const sk = t < at ? 0 : Math.min(1, (t - at) / 0.15);
      const grow = sk * (1 + Math.max(0, 0.3 - (t - at)) * 0.8);
      if (grow <= 0) continue;
      drawStar(ctx, w / 2 + (i - 1) * r * 2.4, starY - (i === 1 ? r * 0.3 : 0), r * grow, i < game.stars);
    }
    outlined(ctx, `${game.score} points`, w / 2, starY + r * 1.7, Math.min(h * 0.035, w / 14), C.white, w * 0.9);
    // coconuts saved, bouncing for joy
    const cy = starY + r * 3;
    const cr = Math.min(r * 0.4, w / 24);
    const shown = Math.min(game.stars - 1, 2);
    for (let i = 0; i < shown; i++) {
      ctx.save();
      ctx.translate(w / 2 + (i - (shown - 1) / 2) * cr * 3, cy - Math.abs(Math.sin(time * 5 + i)) * cr);
      ctx.scale(cr, cr);
      drawCoconut(ctx, 'coco', 1, Math.sin(time * 5 + i) * 0.4, 0.1);
      ctx.restore();
    }
  }

  function drawLost(ctx) {
    const { w, h } = size;
    const t = game.statusT;
    const k = Math.min(1, t / 0.5);
    ctx.fillStyle = `rgba(22,11,51,${0.45 * k})`;
    ctx.fillRect(0, 0, w, h);
    if (t < 0.3) return;
    const px = Math.min(h * 0.075, w / 6.5);
    const ty = view.hudH + px * 1.4;
    outlined(ctx, 'So close!', w / 2, ty, px * (1 + Math.sin(time * 4) * 0.03), C.sun, w * 0.9);
    outlined(ctx, 'Let\'s try again!', w / 2, ty + px * 1.05, px * 0.55, C.white, w * 0.9);
    // a crab cheekily dancing
    const sc = Math.min(w, h) * 0.22;
    ctx.save();
    ctx.translate(w / 2, ty + px * 1.6 + sc * 0.6 - Math.abs(Math.sin(time * 6)) * sc * 0.08);
    ctx.rotate(Math.sin(time * 6) * 0.12);
    ctx.scale(sc, sc);
    drawCrab(ctx, { t: time, lw: 0.04, mood: 'laugh' });
    ctx.restore();
  }

  // ---------- debug hook ----------

  if (debug) {
    window.__smash = {
      state: () => game,
      screen: () => screen,
      buttons: () => buttons.map((b) => ({ ...b })),
      view: () => ({ ...view }),
      progress: () => JSON.parse(JSON.stringify(progress)),
      toScreen,
      toWorld,
      pouch: () => pouch(),
      maxPull: () => maxPull(),
      aim: () => (aim ? aimShot() : null),
      fire: (angle, power) => !!game && fire(game, angle, power),
      tap: () => !!game && activate(game),
      // the bot's pick for the coconut in the slingshot
      plan: () => (game ? planShot(game) : null),
      // let the bot take one shot
      botShot() {
        const s = game && planShot(game);
        if (s) fire(game, s.angle, s.power);
        return s;
      },
      fastForward(seconds) {
        for (let t = 0; game && t < seconds; t += 1 / 30) api.update(1 / 30);
      },
      level: (n) => startLevel(n - 1),
      goto: (name) => goto(name),
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
      levelT += dt;
      const before = `${game.status}|${game.statusT > WIN_BUTTON_DELAY}|${game.statusT > LOST_BUTTON_DELAY}`;
      acc = Math.min(acc + dt, DT * 6);
      while (acc >= DT) {
        step(game);
        acc -= DT;
      }
      renderer.take(game.events.splice(0), time);
      readyT = canFire(game) && !aim ? readyT + dt : 0;
      if (game.status === 'won' && !recorded) record();
      const after = `${game.status}|${game.statusT > WIN_BUTTON_DELAY}|${game.statusT > LOST_BUTTON_DELAY}`;
      if (before !== after) layoutButtons();
      // the camera: show a far castle first, follow the coconut, then come back
      let target = view.camX;
      const lead = nuts(game).filter((b) => b.shot === game.shots).sort((a, b) => b.x - a.x)[0];
      if (camMax() <= 0) target = restCam();
      else if (levelT < INTRO_HOLD && game.shots === 0) target = camMax();
      else if (game.status === 'flying' && lead) target = clamp(lead.x - (size.w / view.s) * 0.4, 0, camMax());
      else if (game.status === 'ready') target = 0;
      view.camX += (target - view.camX) * Math.min(1, dt * (game.status === 'flying' ? 4 : 2.2));
      // the first levels show the ghost finger a good shot
      if (!hintShot && showHint() && index <= 2) hintShot = planShot(game);
    },

    draw(ctx) {
      if (screen === 'menu') drawMenu(ctx);
      else if (screen === 'picker') drawPicker(ctx);
      else if (game) drawPlay(ctx);
    },

    // Pull back from the coconut (or from anywhere) to aim; a press while a special coconut
    // flies sets it off.
    onPickUp(x, y) {
      if (screen !== 'play' || !game || buttons.some((b) => hit(b, x, y))) return false;
      if (game.status === 'flying') {
        activate(game);
        return false;
      }
      if (!canFire(game)) return false;
      const p = pouch();
      const near = Math.hypot(x - p.x, y - p.y) < Math.max(80, view.s * 1.6);
      aim = { x0: x, y0: y, x, y, anchor: near ? 'pouch' : 'free' };
      return true;
    },
    onDrag(x, y) {
      if (!aim) return;
      aim.x = x;
      aim.y = y;
    },
    onDrop(x, y) {
      if (!aim) return;
      aim.x = x;
      aim.y = y;
      const shot = aimShot();
      aim = null;
      if (shot && shot.ok && game && canFire(game)) fire(game, shot.angle, shot.power);
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
