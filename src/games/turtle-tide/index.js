// Turtle Tide as a launcher game: menu, level picker, play and win screens, the tide control
// (drag up and down anywhere) and saved stars. Rules live in sim.js, levels in levels.js,
// drawing in draw.js.
import { LEVELS } from './levels.js';
import { WORLD_H, VIEW_W, createLevel, step, setTide, navTarget } from './sim.js';
import { hintMove } from './bot.js';
import {
  C, font, roundRect, outlined, drawStar, drawButton, drawIconButton, drawFinger, createRenderer, drawTile,
  drawTurtle, drawStarfish, drawTeachIcon,
} from './draw.js';

const SAVE_KEY = 'turtle-tide-progress';
const WIN_BUTTON_DELAY = 1.4; // seconds after the win before Next shows, so a last drag can't press it
const BLOCK_HINT = 5; // seconds stuck before the ghost finger comes back (any level)
const EARLY_BLOCK_HINT = 0.4; // on the first levels it shows almost straight away
const MISHAP_HINT = 5; // seconds the finger shows after a crab or jelly sends the turtle back
const CAMERA_LEAD = 0.36; // the turtle sits this far across the screen; the rest shows what's coming

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

export const turtleTide = {
  id: 'turtle-tide',
  title: 'Turtle Tide',
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
  let view = { s: 1, by: 0, camX: 0, vw: VIEW_W, hudH: 60, bottomH: 50, w: 1, h: 1 };
  let buttons = [];
  let time = 0;
  let lastDt = 0;
  let recorded = false;
  let dragging = false;
  let autopilot = false;
  let mishapsSeen = 0;
  let mishapHintUntil = 0;

  const totalStars = () => progress.stars.reduce((a, b) => a + b, 0);
  const firstOpen = () => {
    for (let i = 0; i < LEVELS.length; i++) if (unlocked(progress, i) && progress.stars[i] === 0) return i;
    return 0;
  };
  // world (x, height) <-> screen px
  const toScreen = (x, hgt) => ({ x: (x - view.camX) * view.s, y: view.by - hgt * view.s });
  const toWorld = (x, y) => ({ x: x / view.s + view.camX, h: (view.by - y) / view.s });

  function layoutView() {
    const { w, h } = size;
    const hudH = Math.max(64, Math.min(104, h * 0.085));
    const bottomH = Math.max(48, Math.min(84, h * 0.065));
    const availH = h - hudH - bottomH;
    const s = Math.min(availH / WORLD_H, w / VIEW_W);
    view = { ...view, s, by: h - bottomH, vw: w / s, hudH, bottomH, w, h };
    if (game) view.camX = cameraTarget();
  }

  function cameraTarget() {
    const L = game.level;
    return clamp(game.turtle.x - view.vw * CAMERA_LEAD, 0, Math.max(0, L.width - view.vw));
  }

  // The tide control on the right edge: a track over the level's tide range and a handle.
  function tideTrack() {
    const { w } = size;
    const r = Math.max(20, Math.min(34, w * 0.05));
    const x = w - r - Math.max(8, w * 0.015);
    const L = game.level;
    return { x, r, top: view.by - L.tide.max * view.s, bottom: view.by - L.tide.min * view.s };
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
      const top = Math.max(icon + pad * 2, h * 0.13);
      const gap = Math.max(12, w * 0.035);
      const tw = Math.min((w - gap * (cols + 1)) / cols, 200);
      const th = Math.min(tw * 1.05, (h - top - gap * (rows + 1)) / rows);
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
      }
    }
  }

  function startLevel(i) {
    index = clamp(i, 0, LEVELS.length - 1);
    game = createLevel(LEVELS[index], 1 + index * 7919 + Math.floor(Math.random() * 1000));
    screen = 'play';
    recorded = false;
    dragging = false;
    mishapsSeen = 0;
    mishapHintUntil = 0;
    renderer.reset();
    layoutView();
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

  function fingerTide(y) {
    if (!game) return;
    setTide(game, toWorld(0, y).h);
  }

  // ---------- drawing ----------

  function drawBackdrop(ctx) {
    const { w, h } = size;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, C.night);
    g.addColorStop(0.3, C.dusk);
    g.addColorStop(0.52, C.pink);
    g.addColorStop(0.62, C.orange);
    g.addColorStop(0.62, '#29c9d9');
    g.addColorStop(1, '#0b6fa0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function waveLine(ctx, y, amp, len, speed, colour, lw) {
    const { w } = size;
    ctx.strokeStyle = colour;
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (let x = 0; x <= w + 8; x += 8) ctx.lineTo(x, y + Math.sin(x / len + time * speed) * amp);
    ctx.stroke();
  }

  function drawMenu(ctx) {
    const { w, h } = size;
    drawBackdrop(ctx);
    // sun on the horizon
    const hy = h * 0.62;
    const sr = Math.min(w * 0.22, h * 0.12);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, hy);
    ctx.clip();
    ctx.fillStyle = C.sun;
    ctx.beginPath();
    ctx.arc(w * 0.5, hy + sr * 0.2, sr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.pink;
    for (let i = 0; i < 4; i++) ctx.fillRect(w * 0.5 - sr, hy - sr * 0.1 - i * sr * 0.2, sr * 2, Math.max(2, sr * 0.05 * (4 - i)));
    ctx.restore();
    const px = Math.min(h * 0.085, w / 6);
    ctx.save();
    ctx.translate(w / 2 + Math.sin(time * 2) * 3, h * 0.16);
    ctx.rotate(-0.04 + Math.sin(time * 1.4) * 0.025);
    outlined(ctx, 'TURTLE', 0, 0, px, C.white, w * 0.9);
    outlined(ctx, 'TIDE', 0, px * 1.15, px * 1.3, C.sun, w * 0.9);
    ctx.restore();
    // the tide rising and falling with the turtle riding it
    const sea = hy + Math.sin(time * 0.9) * h * 0.035;
    const sc = Math.min(w, h * 0.6) / 190;
    ctx.save();
    ctx.translate(w / 2, sea + 7 * sc + Math.sin(time * 2.4) * 2);
    ctx.scale(sc, sc);
    drawTurtle(ctx, 3, 0, { t: time, phase: time * 4, swim: true, blink: (time % 3.4) < 0.12, tilt: Math.sin(time * 2.4) * 0.06 });
    ctx.restore();
    ctx.fillStyle = 'rgba(40,215,230,0.55)';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 8; x += 8) ctx.lineTo(x, sea + Math.sin(x / 40 + time * 2) * 4);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    waveLine(ctx, sea, 4, 40, 2, C.white, 4);
    waveLine(ctx, sea + 30, 3, 55, -1.4, 'rgba(255,255,255,0.35)', 3);
    drawStarfish(ctx, w * 0.18, h * 0.9, Math.min(w, h) * 0.045, time);
    drawStarfish(ctx, w * 0.85, h * 0.93, Math.min(w, h) * 0.035, time + 2);
    const total = totalStars();
    if (total > 0) {
      const ty2 = h * 0.66;
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
    const { w } = size;
    drawBackdrop(ctx);
    waveLine(ctx, size.h * 0.62, 4, 40, 2, 'rgba(255,255,255,0.6)', 3);
    const icon = buttons[0];
    outlined(ctx, 'Levels', w / 2, icon.y + icon.h / 2, Math.min(size.h * 0.05, w / 9), C.sun, w - (icon.w + icon.x) * 2 - 10);
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
      const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
      g.addColorStop(0, '#ffb36b');
      g.addColorStop(0.5, '#ffb36b');
      g.addColorStop(0.5, C.water);
      g.addColorStop(1, '#0b8fb0');
      ctx.fillStyle = g;
      roundRect(ctx, b.x, b.y, b.w, b.h, 20);
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = open ? C.white : 'rgba(255,255,255,0.4)';
      ctx.stroke();
      const r = Math.min(b.w * 0.2, b.h * 0.2);
      drawTeachIcon(ctx, L.teach || 'turtle', b.x + b.w * 0.3, b.y + b.h * 0.32, r, open ? time : 0);
      outlined(ctx, String(b.index + 1), b.x + b.w * 0.72, b.y + b.h * 0.32, b.h * 0.34, C.white, b.w * 0.36);
      const sr = Math.min(b.w * 0.12, b.h * 0.11);
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
    const r = Math.min(hudH * 0.26, room / 9);
    ctx.fillStyle = 'rgba(22,11,51,0.3)';
    roundRect(ctx, w / 2 - r * 4.2, hudH * 0.14, r * 8.4, hudH * 0.72, hudH * 0.3);
    ctx.fill();
    game.starfish.forEach((f, i) => {
      const x = w / 2 + (i - 1) * r * 2.6;
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.arc(x, cy, r * 1.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = f.got ? 1 : 0.3;
      drawStarfish(ctx, x, cy, r * (0.85 + (f.got ? Math.max(0, 0.4 - (game.now - f.gotT)) : 0)), f.got ? time : 0, f.got);
      ctx.globalAlpha = 1;
    });
    // bottom strip: the journey from the nest to the sea
    const by = h - bottomH / 2;
    const L = game.level;
    const bw = Math.min(w * 0.72, 520);
    const bx = (w - bw) / 2;
    const th = Math.max(8, bottomH * 0.2);
    ctx.fillStyle = 'rgba(22,11,51,0.35)';
    roundRect(ctx, bx - th, by - th, bw + th * 2, th * 2, th);
    ctx.fill();
    const span = L.goal - L.start;
    const frac = (x) => bx + clamp((x - L.start) / span, 0, 1) * bw;
    ctx.fillStyle = 'rgba(25,195,214,0.85)';
    roundRect(ctx, bx, by - th * 0.4, frac(game.turtle.x) - bx, th * 0.8, th * 0.4);
    ctx.fill();
    for (const cp of game.checkpoints) {
      ctx.fillStyle = cp.reached ? C.pink : 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(frac(cp.x), by, th * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    // the sea at the end
    ctx.fillStyle = C.water;
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bx + bw + th * 0.2, by, th * 1.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const ts = (bottomH * 0.5) / 22;
    ctx.save();
    ctx.translate(frac(game.turtle.x), by + th * 0.6);
    ctx.scale(ts, ts);
    drawTurtle(ctx, 0, 0, { t: time, phase: game.turtle.walked * 0.4 });
    ctx.restore();
  }

  function drawTideControl(ctx, hint) {
    const tr = tideTrack();
    const { x, r, top, bottom } = tr;
    const L = game.level;
    ctx.save();
    // track
    ctx.fillStyle = 'rgba(22,11,51,0.28)';
    roundRect(ctx, x - r * 0.42, top - r * 0.42, r * 0.84, bottom - top + r * 0.84, r * 0.42);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // ticks
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2;
    for (let hgt = Math.ceil(L.tide.min / 20) * 20; hgt <= L.tide.max; hgt += 20) {
      const y = view.by - hgt * view.s;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.2, y);
      ctx.lineTo(x + r * 0.2, y);
      ctx.stroke();
    }
    // where the finger wants the water
    const ty = view.by - game.target * view.s;
    if (Math.abs(game.target - game.base) > 1.5) {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(x, ty, r * 0.75, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // the handle rides the water
    const hy = clamp(view.by - game.water * view.s, top - r, bottom + r);
    const glow = dragging ? 1 : hint ? 0.5 + 0.5 * Math.sin(time * 8) : 0;
    if (glow > 0) {
      ctx.fillStyle = `rgba(255,225,77,${0.45 * glow})`;
      ctx.beginPath();
      ctx.arc(x, hy, r * 1.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(22,11,51,0.35)';
    ctx.beginPath();
    ctx.arc(x, hy + 4, r, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createLinearGradient(0, hy - r, 0, hy + r);
    g.addColorStop(0, '#5ef0ff');
    g.addColorStop(1, '#0b8fb0');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, hy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 4;
    ctx.stroke();
    // up and down chevrons with a little wave between
    ctx.strokeStyle = C.white;
    ctx.lineWidth = Math.max(2.5, r * 0.13);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.32, hy - r * 0.35);
    ctx.lineTo(x, hy - r * 0.62);
    ctx.lineTo(x + r * 0.32, hy - r * 0.35);
    ctx.moveTo(x - r * 0.32, hy + r * 0.35);
    ctx.lineTo(x, hy + r * 0.62);
    ctx.lineTo(x + r * 0.32, hy + r * 0.35);
    ctx.stroke();
    ctx.beginPath();
    for (let i = -4; i <= 4; i++) ctx.lineTo(x + (i * r * 0.5) / 4, hy + Math.sin(i * 1.4 + time * 4) * r * 0.08);
    ctx.stroke();
    ctx.restore();
  }

  // Should the ghost finger show, and which way?
  function hintFor() {
    if (!game || game.status !== 'play' || dragging || autopilot) return null;
    const t = game.turtle;
    if (game.mishaps !== mishapsSeen) {
      mishapsSeen = game.mishaps;
      mishapHintUntil = time + MISHAP_HINT + 1.8;
    }
    const wait = game.level.hint ? EARLY_BLOCK_HINT : BLOCK_HINT;
    const stuck = t.blocked && t.blockedT > wait;
    const afterMishap = time < mishapHintUntil && t.mode !== 'eep' && t.mode !== 'return';
    if (!stuck && !afterMishap) return null;
    return hintMove(game);
  }

  function drawHintFinger(ctx, hint) {
    const tr = tideTrack();
    const from = clamp(view.by - game.water * view.s, tr.top, tr.bottom);
    const to = clamp(view.by - hint.to * view.s, tr.top, tr.bottom);
    const fx = tr.x - tr.r * 2.6;
    const k = (time * 0.7) % 1;
    const e = k < 0.15 ? 0 : k > 0.8 ? 1 : (k - 0.15) / 0.65;
    const ease = e * e * (3 - 2 * e);
    const y = from + (to - from) * ease;
    const alpha = k > 0.88 ? (1 - k) / 0.12 : Math.min(1, k / 0.08);
    ctx.save();
    ctx.globalAlpha = 0.85 * alpha;
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = -time * 30;
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(fx, from);
    ctx.lineTo(fx, to);
    ctx.stroke();
    ctx.setLineDash([]);
    // arrow head at the far end
    const d = Math.sign(to - from) || 1;
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.moveTo(fx, to + d * 14);
    ctx.lineTo(fx - 11, to - d * 4);
    ctx.lineTo(fx + 11, to - d * 4);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = alpha;
    drawFinger(ctx, fx, y, Math.max(1.1, size.w / 380));
    ctx.restore();
  }

  function drawPlay(ctx) {
    const { w } = size;
    // follow the turtle, gently
    const target = cameraTarget();
    view.camX += (target - view.camX) * Math.min(1, lastDt * 3.5);
    renderer.drawWorld(ctx, game, view, time, lastDt);
    const hint = hintFor();
    drawTideControl(ctx, hint);
    if (hint) drawHintFinger(ctx, hint);
    // a soft top band so the HUD reads over the sky
    ctx.fillStyle = 'rgba(22,11,51,0.18)';
    ctx.fillRect(0, 0, w, view.hudH);
    drawHud(ctx);
    if (game.status === 'won') drawWin(ctx);
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
    if (t < 0.6) return; // let the splash happen first
    const k = Math.min(1, (t - 0.6) / 0.4);
    ctx.fillStyle = `rgba(22,11,51,${0.5 * k})`;
    ctx.fillRect(0, 0, w, h);
    drawConfetti(ctx, t);
    const px = Math.min(h * 0.08, w / 6);
    const pop = 1 + Math.max(0, 1.0 - t) * 1.2 + Math.sin(time * 6) * 0.04;
    const ty = view.hudH + px * 1.3;
    outlined(ctx, game.stars === 3 ? 'WOW!' : 'Hooray!', w / 2, ty, px * pop, C.sun, w * 0.9);
    const r = Math.min(w * 0.11, h * 0.06);
    const starY = ty + px * 0.9 + r * 1.4;
    for (let i = 0; i < 3; i++) {
      const at = 0.9 + i * 0.25;
      const sk = t < at ? 0 : Math.min(1, (t - at) / 0.15);
      const grow = sk * (1 + Math.max(0, 0.3 - (t - at)) * 0.8);
      if (grow <= 0) continue;
      drawStar(ctx, w / 2 + (i - 1) * r * 2.4, starY - (i === 1 ? r * 0.3 : 0), r * grow, i < game.stars);
    }
    // the starfish that earned them
    const iy = starY + r * 1.9;
    const ir = Math.min(r * 0.5, w / 22);
    game.starfish.forEach((f, i) => {
      ctx.globalAlpha = f.got ? 1 : 0.3;
      drawStarfish(ctx, w / 2 + (i - 1) * ir * 2.8, iy, ir, f.got ? time : 0, f.got);
    });
    ctx.globalAlpha = 1;
    // a happy turtle doing a little dance
    const sc = Math.min(w, h) / 160;
    ctx.save();
    ctx.translate(w / 2, iy + ir * 2 + 26 * sc + Math.abs(Math.sin(time * 4)) * -8);
    ctx.scale(sc, sc);
    drawTurtle(ctx, 3, 0, { t: time, phase: time * 8, swim: true, tilt: Math.sin(time * 4) * 0.15 });
    ctx.restore();
  }

  // ---------- debug hook ----------

  if (debug) {
    window.__turtle = {
      state: () => game,
      screen: () => screen,
      buttons: () => buttons.map((b) => ({ ...b })),
      view: () => ({ ...view }),
      progress: () => JSON.parse(JSON.stringify(progress)),
      toScreen,
      toWorld,
      tideHandle: () => (game ? { ...tideTrack(), y: view.by - game.water * view.s } : null),
      tide: (hgt) => game && setTide(game, hgt),
      // run the game ahead quickly (the autopilot keeps steering if it is on)
      fastForward(seconds) {
        for (let t = 0; game && t < seconds; t += 1 / 30) api.update(1 / 30);
        if (game) view.camX = cameraTarget();
      },
      level: (n) => startLevel(n - 1),
      goto: (name) => goto(name),
      // drives the tide along the level's starfish route (or the plain route with all = false)
      autopilot(on = true, all = true) {
        autopilot = on ? (all ? 'all' : 'nav') : false;
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
        const want = navTarget(autopilot === 'all' ? game.level.navAll : game.level.nav, game.turtle.x);
        if (want != null) setTide(game, want);
      }
      const before = `${game.status}|${game.statusT > WIN_BUTTON_DELAY}`;
      step(game, dt);
      if (game.status === 'won' && !recorded) record();
      const after = `${game.status}|${game.statusT > WIN_BUTTON_DELAY}`;
      if (before !== after) layoutButtons();
    },

    draw(ctx) {
      if (screen === 'menu') drawMenu(ctx);
      else if (screen === 'picker') drawPicker(ctx);
      else if (game) drawPlay(ctx);
    },

    // The tide: a press anywhere off the buttons grabs the water; it follows the finger's height.
    onPickUp(x, y) {
      if (screen !== 'play' || !game || game.status !== 'play' || buttons.some((b) => hit(b, x, y))) return false;
      dragging = true;
      fingerTide(y);
      return true;
    },
    onDrag(x, y) {
      if (!dragging) return;
      fingerTide(y);
    },
    onDrop(x, y) {
      if (!dragging) return;
      fingerTide(y);
      dragging = false;
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
