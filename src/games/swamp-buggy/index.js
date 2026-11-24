// Swamp Buggy as a launcher game: menu, level picker, garage, driving and the finish card.
// One finger: hold the right half for gas, the left half for brake and reverse (in the air
// they tip the buggy back and forward). Rules live in sim.js, courses in tracks.js, buggies in
// buggies.js, drawing in draw.js, saving in progress.js and sounds in sound.js.
import { LEVELS } from './tracks.js';
import { BUGGIES } from './buggies.js';
import {
  createRun, step, setInput, starTargets, progressOf, placeAt, groundY, speedOf, startRighting,
} from './sim.js';
import { botPedal } from './bot.js';
import {
  C, LOOK, font, roundRect, outlined, drawStar, drawButton, drawIconButton, drawLock, drawCoinIcon, drawOrange,
  drawBuggy, createRenderer, drawTile,
} from './draw.js';
import {
  loadProgress, saveProgress, recordRun, unlocked, firstOpen, totalStars, garageState, chooseBuggy,
} from './progress.js';
import { unlockAudio, play, setEngine } from './sound.js';

const FINISH_SHOW = 1.0; // seconds after the flag before the finish card appears
const BUTTON_DELAY = 1.8; // and before its buttons respond, so a held pedal can't press one
const HINT_LEVELS = 2; // the "hold here" hint shows on the first levels until the first press

const hit = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
const storage = () => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export const swampBuggy = {
  id: 'swamp-buggy',
  title: 'Swamp Buggy',
  drawTile,
  create,
};

function create(host) {
  const params = new URLSearchParams(location.search);
  const debug = params.has('debug');
  const renderer = createRenderer();
  let size = { w: 1, h: 1 };
  let progress = loadProgress(storage() || { getItem: () => null });
  let screen = 'menu'; // 'menu' | 'picker' | 'garage' | 'play'
  let game = null;
  let demo = null;
  let index = 0;
  let buttons = [];
  let time = 0;
  let lastDt = 0;
  let recorded = false;
  let pedal = null; // 'gas' | 'brake' while a finger is down in play
  let pressed = false; // has the player pressed a pedal yet this level
  let autopilot = false;
  let forced = undefined; // a pedal forced from the debug handle
  let wiggle = { id: null, t: -9 }; // a garage card shaking "not yet"
  let bought = { id: null, t: -9 };
  const pickerArt = new Map();

  const save = () => {
    const st = storage();
    if (st) saveProgress(st, progress);
  };

  // ---------- layout ----------

  function pedalRects() {
    const { w, h } = size;
    const pw = Math.min(w * 0.3, 190);
    const ph = pw * 1.15;
    const pad = Math.max(12, w * 0.03);
    return {
      brake: { x: pad, y: h - ph - pad, w: pw, h: ph },
      gas: { x: w - pw - pad, y: h - ph - pad, w: pw, h: ph },
    };
  }

  function layoutButtons() {
    const { w, h } = size;
    const bw = Math.min(w * 0.8, 420);
    const bh = Math.max(64, Math.min(96, h * 0.085));
    const x = (w - bw) / 2;
    const icon = Math.max(48, Math.min(68, w * 0.12));
    const pad = Math.max(10, w * 0.025);
    if (screen === 'menu') {
      const n = firstOpen(progress);
      const top = h * 0.62;
      buttons = [
        { id: 'exit', icon: 'home', x: pad, y: pad, w: icon, h: icon },
        { id: 'play', label: `Drive ${n + 1}`, glyph: 'play', x, y: top, w: bw, h: bh },
        { id: 'picker', label: 'Levels', glyph: 'grid', x, y: top + bh * 1.25, w: bw, h: bh, fill: C.white },
        { id: 'garage', label: 'Garage', glyph: 'wrench', x, y: top + bh * 2.5, w: bw, h: bh, fill: '#9ff0c0' },
      ];
    } else if (screen === 'picker') {
      buttons = [{ id: 'menu', icon: 'back', x: pad, y: pad, w: icon, h: icon }];
      const cols = w > h * 0.9 ? 4 : 3;
      const rows = Math.ceil(LEVELS.length / cols);
      const top = Math.max(icon + pad * 2, h * 0.1);
      const gap = Math.max(10, w * 0.03);
      const tw = Math.min((w - gap * (cols + 1)) / cols, 260);
      const th = Math.min(tw * 1.25, (h - top - gap * (rows + 1)) / rows);
      const gx = (w - (tw * cols + gap * (cols - 1))) / 2;
      LEVELS.forEach((_, i) => {
        buttons.push({ id: 'level', index: i, x: gx + (i % cols) * (tw + gap), y: top + Math.floor(i / cols) * (th + gap), w: tw, h: th });
      });
    } else if (screen === 'garage') {
      buttons = [{ id: 'menu', icon: 'back', x: pad, y: pad, w: icon, h: icon }];
      const top = Math.max(icon + pad * 2.5, h * 0.13);
      const gap = Math.max(10, h * 0.015);
      const cw = Math.min(w - pad * 2, 560);
      const ch = Math.min((h - top - gap * (BUGGIES.length + 1)) / BUGGIES.length, 190);
      BUGGIES.forEach((bg, i) => {
        buttons.push({ id: 'buggy', buggy: bg.id, x: (w - cw) / 2, y: top + i * (ch + gap), w: cw, h: ch });
      });
    } else if (screen === 'play') {
      const ih = Math.max(44, Math.min(60, w * 0.1));
      buttons = [
        { id: 'menu', icon: 'home', x: pad, y: pad, w: ih, h: ih },
        { id: 'restart', icon: 'restart', x: w - pad - ih, y: pad, w: ih, h: ih },
      ];
      if (game && game.status === 'done' && game.time - game.doneTime > BUTTON_DELAY) {
        const last = index === LEVELS.length - 1;
        const by = h - bh * 2.6 - Math.max(20, h * 0.04);
        buttons.push({ id: 'next', label: last ? 'All done!' : 'Next level', glyph: last ? null : 'next', x, y: by, w: bw, h: bh * 1.1 });
        buttons.push({ id: 'again', label: 'Again', glyph: 'restart', x: x + bw * 0.15, y: by + bh * 1.35, w: bw * 0.7, h: bh * 0.85, fill: C.white });
      }
    }
  }

  // ---------- flow ----------

  function newDemo() {
    const i = Math.floor(Math.random() * LEVELS.length);
    demo = createRun(LEVELS[i], BUGGIES[Math.floor(Math.random() * 3)].id);
    renderer.reset(demo);
  }

  function startLevel(i) {
    index = clamp(i, 0, LEVELS.length - 1);
    game = createRun(LEVELS[index], progress.buggy);
    renderer.reset(game);
    screen = 'play';
    recorded = false;
    pedal = null;
    pressed = false;
    layoutButtons();
  }

  function goto(next) {
    screen = next;
    pedal = null;
    if (next !== 'play') {
      game = null;
      setEngine(0);
    }
    if (next === 'menu') newDemo();
    layoutButtons();
  }

  function record() {
    recorded = true;
    progress = recordRun(progress, index, game.stars, game.coins + game.bonus);
    save();
  }

  // ---------- menu ----------

  function drawMenu(ctx) {
    const { w, h } = size;
    if (!demo) newDemo();
    renderer.anchorY = 0.5;
    renderer.drawWorld(ctx, demo, time, lastDt);
    renderer.anchorY = undefined;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(29,23,48,0.35)');
    g.addColorStop(0.3, 'rgba(29,23,48,0)');
    g.addColorStop(0.55, 'rgba(29,23,48,0)');
    g.addColorStop(1, 'rgba(29,23,48,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const px = Math.min(h * 0.085, w / 5.4);
    ctx.save();
    ctx.translate(w / 2, h * 0.14);
    ctx.rotate(-0.05 + Math.sin(time * 1.4) * 0.015);
    outlined(ctx, 'SWAMP', 0, 0, px, '#9ff05a', w * 0.9);
    ctx.translate(0, px * 1.05);
    ctx.rotate(0.06 + Math.sin(time * 1.7) * 0.02);
    outlined(ctx, 'BUGGY', 0, Math.abs(Math.sin(time * 3)) * -px * 0.08, px * 1.2, C.sun, w * 0.9);
    ctx.restore();
    // stars and coins so far
    const ty = h * 0.14 + px * 2.25;
    const r = Math.min(h * 0.022, w * 0.045);
    ctx.font = font(r * 1.8);
    const label = `${totalStars(progress)} / ${LEVELS.length * 3}`;
    const coins = String(progress.coins);
    const tw = ctx.measureText(label).width;
    const cw = ctx.measureText(coins).width;
    const gap = r * 3;
    const total = r * 2 + tw + gap + r * 2 + cw;
    let cx = w / 2 - total / 2;
    drawStar(ctx, cx + r, ty, r, true);
    outlined(ctx, label, cx + r * 2.4 + tw / 2, ty, r * 1.8, C.white);
    cx += r * 2 + tw + gap;
    drawCoinIcon(ctx, cx + r, ty, r);
    outlined(ctx, coins, cx + r * 2.4 + cw / 2, ty, r * 1.8, C.white);
    for (const b of buttons) b.icon ? drawIconButton(ctx, b) : drawButton(ctx, b, b.fill);
  }

  // ---------- level picker ----------

  // A little postcard of each level: its sky and the shape of its ground.
  function levelArt(i, bw, bh) {
    const dpr = window.devicePixelRatio || 1;
    const key = `${i}|${Math.round(bw)}x${Math.round(bh)}@${dpr}`;
    if (pickerArt.has(key)) return pickerArt.get(key);
    const lv = LEVELS[i];
    const lk = LOOK[lv.look];
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(bw * dpr));
    cv.height = Math.max(1, Math.round(bh * dpr));
    const c = cv.getContext('2d');
    c.scale(dpr, dpr);
    const g = c.createLinearGradient(0, 0, 0, bh);
    g.addColorStop(0, lk.sky[0]);
    g.addColorStop(0.6, lk.sky[1]);
    g.addColorStop(1, lk.sky[2]);
    c.fillStyle = g;
    c.fillRect(0, 0, bw, bh);
    if (lv.look === 'causeway') {
      c.fillStyle = '#ffe27a';
      c.beginPath();
      c.arc(bw * 0.7, bh * 0.55, bh * 0.22, Math.PI, 0);
      c.fill();
    }
    // the course profile, squashed to fit
    const xs = lv.pts.map((p) => p[0]);
    const ys = lv.pts.map((p) => p[1]);
    const x0 = lv.startX - 5;
    const x1 = lv.finishX + 5;
    const ymin = Math.min(...ys);
    const ymax = Math.max(...ys);
    const sx = (x) => ((x - x0) / (x1 - x0)) * bw;
    const sy = (y) => bh * 0.88 - ((y - ymin) / Math.max(6, ymax - ymin)) * bh * 0.45;
    c.beginPath();
    c.moveTo(0, bh);
    for (let k = 0; k < xs.length; k++) if (xs[k] >= x0 && xs[k] <= x1) c.lineTo(sx(xs[k]), sy(ys[k]));
    c.lineTo(bw, bh);
    c.closePath();
    c.fillStyle = lk.soil;
    c.fill();
    c.strokeStyle = lk.top;
    c.lineWidth = 3;
    c.stroke();
    for (const wv of lv.water) {
      c.fillStyle = lk.water;
      c.fillRect(sx(wv.x0), sy(wv.y), Math.max(2, sx(wv.x1) - sx(wv.x0)), 4);
    }
    pickerArt.set(key, cv);
    return cv;
  }

  function drawBackdrop(ctx, top, bottom) {
    const { w, h } = size;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // a few sawgrass tufts along the bottom
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 24; i++) {
      const x = (i / 24) * w + 8;
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x - 6 + Math.sin(time + i) * 3, h - 30 - (i % 3) * 12);
      ctx.moveTo(x, h);
      ctx.lineTo(x + 8, h - 22 - (i % 4) * 8);
      ctx.stroke();
    }
  }

  function drawPicker(ctx) {
    const { w, h } = size;
    drawBackdrop(ctx, '#1f6b57', '#2c3e6e');
    const icon = buttons[0];
    outlined(ctx, 'Levels', w / 2, icon.y + icon.h / 2, Math.min(h * 0.05, w / 9), C.sun, w - (icon.w + icon.x) * 2 - 10);
    for (const b of buttons) {
      if (b.icon) {
        drawIconButton(ctx, b);
        continue;
      }
      const open = unlocked(progress, b.index);
      const stars = progress.stars[b.index];
      const art = levelArt(b.index, b.w, b.h * 0.6);
      ctx.fillStyle = 'rgba(29,23,48,0.35)';
      roundRect(ctx, b.x, b.y + 5, b.w, b.h, 16);
      ctx.fill();
      ctx.save();
      roundRect(ctx, b.x, b.y, b.w, b.h, 16);
      ctx.clip();
      ctx.fillStyle = '#23304f';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.drawImage(art, b.x, b.y, b.w, b.h * 0.6);
      ctx.restore();
      roundRect(ctx, b.x, b.y, b.w, b.h, 16);
      ctx.lineWidth = 4;
      ctx.strokeStyle = open ? C.white : 'rgba(255,255,255,0.4)';
      ctx.stroke();
      const nr = Math.min(b.w, b.h) * 0.15;
      ctx.beginPath();
      ctx.arc(b.x + nr * 1.2, b.y + nr * 1.2, nr, 0, Math.PI * 2);
      ctx.fillStyle = C.sun;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      ctx.fillStyle = C.ink;
      ctx.font = font(nr * 1.3);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(b.index + 1), b.x + nr * 1.2, b.y + nr * 1.25);
      outlined(ctx, LEVELS[b.index].name, b.x + b.w / 2, b.y + b.h * 0.7, b.h * 0.09, C.white, b.w * 0.9);
      const sr = Math.min(b.w * 0.1, b.h * 0.08);
      for (let k = 0; k < 3; k++) drawStar(ctx, b.x + b.w / 2 + (k - 1) * sr * 2.4, b.y + b.h * 0.87, sr, k < stars);
      if (!open) {
        ctx.fillStyle = 'rgba(29,23,48,0.55)';
        roundRect(ctx, b.x, b.y, b.w, b.h, 16);
        ctx.fill();
        drawLock(ctx, b.x + b.w / 2, b.y + b.h * 0.4, Math.min(b.w, b.h) * 0.15);
      }
    }
  }

  // ---------- garage ----------

  function drawGarage(ctx) {
    const { w, h } = size;
    drawBackdrop(ctx, '#3b2a6e', '#1f4f5a');
    const icon = buttons[0];
    const px = Math.min(h * 0.045, w / 10);
    outlined(ctx, 'Garage', w / 2, icon.y + icon.h / 2, px, C.sun, w - (icon.w + icon.x) * 2 - 10);
    // the coin jar and stars
    const jy = icon.y + icon.h + px * 0.75;
    const r = px * 0.42;
    ctx.font = font(px * 0.8);
    const coins = String(progress.coins);
    const stars = String(totalStars(progress));
    const cw = ctx.measureText(coins).width;
    const sw = ctx.measureText(stars).width;
    const total = r * 2.6 + cw + r * 3 + r * 2.6 + sw;
    let cx = w / 2 - total / 2;
    drawCoinIcon(ctx, cx + r, jy, r);
    outlined(ctx, coins, cx + r * 2.6 + cw / 2, jy, px * 0.8, C.white);
    cx += r * 2.6 + cw + r * 3;
    drawStar(ctx, cx + r, jy, r * 1.1, true);
    outlined(ctx, stars, cx + r * 2.6 + sw / 2, jy, px * 0.8, C.white);

    for (const b of buttons) {
      if (b.icon) {
        drawIconButton(ctx, b);
        continue;
      }
      const bg = BUGGIES.find((q) => q.id === b.buggy);
      const state = garageState(progress, bg);
      let ox = 0;
      if (wiggle.id === bg.id && time - wiggle.t < 0.5) ox = Math.sin((time - wiggle.t) * 40) * 8 * (1 - (time - wiggle.t) / 0.5);
      const x = b.x + ox;
      ctx.fillStyle = 'rgba(29,23,48,0.35)';
      roundRect(ctx, x, b.y + 5, b.w, b.h, 18);
      ctx.fill();
      const lit = state === 'driving';
      ctx.fillStyle = lit ? '#fff4c2' : state === 'owned' || state === 'buy' ? '#f2f6ff' : '#b9b4cc';
      roundRect(ctx, x, b.y, b.w, b.h, 18);
      ctx.fill();
      ctx.lineWidth = lit ? 6 : 4;
      ctx.strokeStyle = lit ? '#ff9a1f' : C.ink;
      ctx.stroke();
      // the buggy, bouncing gently
      const scale = Math.min(b.h * 0.24, b.w * 0.1);
      const pxl = x + b.h * 0.2 + scale * 1.9;
      const gy = b.y + b.h * 0.83;
      const bounce = lit || (bought.id === bg.id && time - bought.t < 1.5) ? Math.abs(Math.sin(time * 5)) * 0.25 : 0;
      ctx.save();
      ctx.translate(pxl, gy);
      ctx.scale(scale, -scale);
      const rr = bg.wheelR;
      const rest = bg.restLen - 0.16;
      const wy = rr;
      const by = wy + rest + 0.2 + bounce;
      drawBuggy(ctx, bg.look, { x: 0, y: by, a: 0 }, [{ x: -1.1, y: wy, spin: lit ? time * 3 : 0 }, { x: 1.15, y: wy, spin: lit ? time * 3 : 0 }], {
        r: rr, t: time, face: state === 'stars' || state === 'short' ? 'oh' : 'grin', fanSpin: time * 8,
      });
      ctx.restore();
      if (state === 'stars' || state === 'short') {
        ctx.fillStyle = 'rgba(80,70,110,0.35)';
        roundRect(ctx, x, b.y, b.w, b.h, 18);
        ctx.fill();
      }
      // name and what it costs
      const tx = x + b.w * 0.68;
      const nameY = b.y + b.h * 0.34;
      outlined(ctx, bg.name, tx, nameY, Math.min(b.h * 0.2, b.w * 0.065), lit ? '#ff9a1f' : C.white, b.w * 0.56);
      const ly = b.y + b.h * 0.7;
      const lr = Math.min(b.h * 0.13, 26);
      if (state === 'driving') {
        // a big tick
        ctx.strokeStyle = '#2fbf5a';
        ctx.lineWidth = lr * 0.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tx - lr * 1.2, ly);
        ctx.lineTo(tx - lr * 0.3, ly + lr * 0.8);
        ctx.lineTo(tx + lr * 1.3, ly - lr * 0.9);
        ctx.stroke();
      } else if (state === 'owned') {
        drawButton(ctx, { x: tx - lr * 2.6, y: ly - lr * 1.05, w: lr * 5.2, h: lr * 2.1, label: 'Drive', glyph: 'play' }, C.green);
      } else if (state === 'stars') {
        drawLock(ctx, tx - lr * 2.2, ly, lr * 0.9);
        drawStar(ctx, tx - lr * 0.2, ly, lr, true);
        outlined(ctx, String(bg.stars), tx + lr * 1.9, ly, lr * 1.5, C.white);
      } else {
        const can = state === 'buy';
        const pulse = can ? 1 + Math.sin(time * 6) * 0.06 : 1;
        drawCoinIcon(ctx, tx - lr * 1.4, ly, lr * pulse);
        outlined(ctx, String(bg.price), tx + lr * 1.0, ly, lr * 1.5 * pulse, can ? C.sun : 'rgba(255,255,255,0.8)');
      }
    }
  }

  // ---------- the HUD ----------

  function drawCoinBar(ctx) {
    const { w } = size;
    const s = game;
    const left = buttons.find((b) => b.id === 'menu');
    const top = left.y;
    const room = w - (left.x + left.w) * 2 - 24;
    const bw = Math.min(room, 420);
    const bx = (w - bw) / 2;
    const bh = left.h;
    ctx.fillStyle = 'rgba(29,23,48,0.45)';
    roundRect(ctx, bx, top, bw, bh, bh * 0.3);
    ctx.fill();
    const r = bh * 0.26;
    drawCoinIcon(ctx, bx + r * 1.5, top + bh * 0.5, r);
    const npx = bh * 0.46;
    ctx.font = font(npx);
    const label = String(s.coins);
    const tw = Math.max(ctx.measureText('00').width, ctx.measureText(label).width);
    outlined(ctx, label, bx + r * 2.8 + tw / 2, top + bh * 0.52, npx, C.white);
    // the bar: full means three stars
    const [t2, t3] = starTargets(s.total);
    const x0 = bx + r * 3.3 + tw;
    const x1 = bx + bw - bh * 0.42;
    const by = top + bh * 0.5;
    const th = bh * 0.26;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(ctx, x0, by - th / 2, x1 - x0, th, th / 2);
    ctx.fill();
    const k = Math.min(1, s.coins / t3);
    if (k > 0) {
      ctx.fillStyle = C.sun;
      roundRect(ctx, x0, by - th / 2, Math.max(th, (x1 - x0) * k), th, th / 2);
      ctx.fill();
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = C.ink;
    roundRect(ctx, x0, by - th / 2, x1 - x0, th, th / 2);
    ctx.stroke();
    const sr = bh * 0.27;
    drawStar(ctx, x0 + (x1 - x0) * (t2 / t3), by, sr, s.coins >= t2);
    drawStar(ctx, x1, by, sr * 1.15, s.coins >= t3);
    // progress: a little buggy heading for the flag
    const py = top + bh + bh * 0.32;
    const p0 = bx + bh * 0.3;
    const p1 = bx + bw - bh * 0.3;
    ctx.fillStyle = 'rgba(29,23,48,0.4)';
    roundRect(ctx, p0, py - 3, p1 - p0, 6, 3);
    ctx.fill();
    const pr = progressOf(s);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    roundRect(ctx, p0, py - 3, Math.max(6, (p1 - p0) * pr), 6, 3);
    ctx.fill();
    const fs = bh * 0.2;
    ctx.fillStyle = C.white;
    ctx.fillRect(p1 - 1, py - fs * 1.6, 2, fs * 1.6);
    for (let a = 0; a < 2; a++) for (let b2 = 0; b2 < 3; b2++) {
      ctx.fillStyle = (a + b2) % 2 ? C.white : C.ink;
      ctx.fillRect(p1 + 1 + b2 * fs * 0.4, py - fs * 1.6 + a * fs * 0.4, fs * 0.4, fs * 0.4);
    }
    const cx = p0 + (p1 - p0) * pr;
    ctx.fillStyle = s.spec.look.body;
    roundRect(ctx, cx - fs * 0.9, py - fs * 0.6, fs * 1.8, fs * 0.9, fs * 0.3);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.fillStyle = '#2b2633';
    for (const wx of [-0.55, 0.55]) {
      ctx.beginPath();
      ctx.arc(cx + wx * fs, py + fs * 0.3, fs * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Big see-through pedal pictures in the bottom corners: an arrow each way.
  function drawPedals(ctx) {
    const pr = pedalRects();
    const live = game.status === 'play';
    for (const side of ['brake', 'gas']) {
      const b = pr[side];
      const on = live && pedal === side;
      const hintOn = live && !pressed && index < HINT_LEVELS && side === 'gas';
      const pulse = hintOn ? 1 + Math.sin(time * 6) * 0.05 : 1;
      ctx.save();
      ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
      ctx.scale(pulse * (on ? 0.94 : 1), pulse * (on ? 0.94 : 1));
      ctx.globalAlpha = on ? 0.9 : hintOn ? 0.75 : 0.42;
      const colour = side === 'gas' ? '#3fe07a' : '#ff6b5a';
      roundRect(ctx, -b.w / 2, -b.h / 2, b.w, b.h, b.w * 0.2);
      ctx.fillStyle = colour;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      // tread lines on the pedal
      ctx.strokeStyle = 'rgba(29,23,48,0.25)';
      ctx.lineWidth = 5;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(-b.w * 0.3, i * b.h * 0.15 + b.h * 0.05);
        ctx.lineTo(b.w * 0.3, i * b.h * 0.15 + b.h * 0.05);
        ctx.stroke();
      }
      // the arrow
      const s = b.w * 0.28;
      const dir = side === 'gas' ? 1 : -1;
      ctx.fillStyle = C.white;
      ctx.beginPath();
      ctx.moveTo(dir * s * 1.1, -b.h * 0.12);
      ctx.lineTo(-dir * s * 0.5, -b.h * 0.12 - s * 0.95);
      ctx.lineTo(-dir * s * 0.5, -b.h * 0.12 + s * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // the first-level hint: a finger pressing the gas
    if (live && !pressed && index < HINT_LEVELS && game.time > 0.6) {
      const b = pr.gas;
      const press = (Math.sin(time * 5) + 1) / 2;
      const fx = b.x + b.w * 0.55;
      const fy = b.y + b.h * 0.35 + press * 10;
      const f = b.w * 0.07;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(-0.3);
      ctx.fillStyle = C.white;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 3;
      roundRect(ctx, -f, -f * 4.5, f * 2, f * 5, f);
      ctx.fill();
      ctx.stroke();
      roundRect(ctx, -f * 2, 0, f * 4, f * 3.5, f * 1.3);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      outlined(ctx, 'Hold to go!', size.w / 2, b.y - b.h * 0.25, Math.min(size.h * 0.045, size.w / 10), C.sun, size.w * 0.9);
    }
  }

  function drawConfetti(ctx, t) {
    const { w, h } = size;
    const colours = [C.pink, C.sun, C.teal, C.white, C.orange, '#3fe07a'];
    for (let i = 0; i < 60; i++) {
      const sp = 90 + ((i * 53) % 80);
      const x = ((i * 0.137) % 1) * w + Math.sin(t * 2 + i) * 20;
      const y = ((t * sp + i * 41) % (h + 40)) - 20;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 3 + i);
      ctx.fillStyle = colours[i % colours.length];
      ctx.fillRect(-5, -3, 10, 6);
      ctx.restore();
    }
  }

  function drawFinish(ctx) {
    const { w, h } = size;
    const s = game;
    const t = s.time - s.doneTime;
    if (t < 0.1) return;
    if (t < FINISH_SHOW + 0.2) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (FINISH_SHOW + 0.2 - t) / 0.2);
      outlined(ctx, 'FINISH!', w / 2, h * 0.3, Math.min(h * 0.09, w / 5) * (1 + Math.max(0, 0.5 - t) * 0.8), C.sun, w * 0.92);
      ctx.restore();
    }
    if (t < FINISH_SHOW) return;
    const k = Math.min(1, (t - FINISH_SHOW) / 0.4);
    ctx.fillStyle = `rgba(29,23,48,${0.55 * k})`;
    ctx.fillRect(0, 0, w, h);
    drawConfetti(ctx, t);
    const px = Math.min(h * 0.08, w / 6);
    const ty = h * 0.15;
    outlined(ctx, s.stars === 3 ? 'WOW!' : 'Hooray!', w / 2, ty, px * (1 + Math.sin(time * 6) * 0.04), C.sun, w * 0.9);
    const r = Math.min(w * 0.11, h * 0.06);
    const sy = ty + px * 0.9 + r * 1.4;
    for (let i = 0; i < 3; i++) {
      const at = FINISH_SHOW + 0.3 + i * 0.25;
      const sk = t < at ? 0 : Math.min(1, (t - at) / 0.15);
      const grow = sk * (1 + Math.max(0, 0.3 - (t - at)) * 0.8);
      if (grow <= 0) continue;
      drawStar(ctx, w / 2 + (i - 1) * r * 2.4, sy - (i === 1 ? r * 0.3 : 0), r * grow, i < s.stars);
    }
    // what was collected: coins and oranges, then the trick bonus
    const cy = sy + r * 2.1;
    const cr = Math.min(r * 0.5, w / 18);
    const label = `${s.coins} / ${s.total}`;
    ctx.font = font(cr * 1.9);
    const tw = ctx.measureText(label).width;
    drawCoinIcon(ctx, w / 2 - tw / 2 - cr * 2.2, cy, cr);
    drawOrange(ctx, w / 2 - tw / 2 - cr * 0.6, cy, cr * 0.9);
    outlined(ctx, label, w / 2 + cr * 0.8, cy, cr * 1.9, C.white);
    let line = cy + cr * 2.3;
    if (s.flips || s.bigAirs) {
      const parts = [];
      if (s.flips) parts.push(`${s.flips} flip${s.flips > 1 ? 's' : ''}`);
      if (s.bigAirs) parts.push(`${s.bigAirs} big air`);
      outlined(ctx, `${parts.join(' + ')}  +${s.bonus}`, w / 2, line, cr * 1.2, C.pink, w * 0.9);
      line += cr * 2;
    }
    if (s.stars < 3) {
      const need = starTargets(s.total)[s.stars - 1];
      outlined(ctx, `Get ${need} for the next star!`, w / 2, line, cr * 1.05, C.white, w * 0.9);
    }
  }

  function drawPlay(ctx) {
    renderer.drawWorld(ctx, game, time, lastDt);
    drawCoinBar(ctx);
    if (game.status === 'play') drawPedals(ctx);
    if (game.status === 'done') drawFinish(ctx);
    for (const b of buttons) b.icon ? drawIconButton(ctx, b) : drawButton(ctx, b, b.fill);
  }

  // ---------- events into sound ----------

  function sounds(events) {
    for (const e of events) {
      if (e.type === 'coin') play(e.kind === 'orange' ? 'orange' : 'coin');
      else if (e.type === 'land' && e.speed > 6) play('land');
      else if (['boing', 'chomp', 'splash', 'thud', 'bonk', 'flip', 'bigair', 'finish'].includes(e.type)) play(e.type);
    }
  }

  // ---------- debug hook ----------

  if (debug) {
    window.__buggy = {
      state: () => game,
      demo: () => demo,
      screen: () => screen,
      buttons: () => buttons.map((b) => ({ ...b })),
      pedals: () => pedalRects(),
      view: () => ({ ...renderer.cam, w: size.w, h: size.h }),
      toScreen: (x, y) => renderer.toScreen(x, y),
      progress: () => JSON.parse(JSON.stringify(progress)),
      setProgress(p) {
        progress = loadProgress({ getItem: () => JSON.stringify(p) });
        save();
        layoutButtons();
      },
      level: (n) => startLevel(n - 1),
      goto: (name) => goto(name),
      autopilot(on = true) {
        autopilot = on;
      },
      pedal(v) {
        forced = v === undefined ? undefined : v;
      },
      // put the buggy at x, at rest (or upside down on its roof)
      seek(x, { roof = false } = {}) {
        if (!game) return;
        placeAt(game, x);
        if (roof) {
          game.buggy.a = Math.PI;
          game.buggy.y = groundY(game.track, x) + 0.6;
        }
        renderer.reset(game);
      },
      flipNow: () => game && startRighting(game),
      fastForward(sec) {
        if (!game) return;
        for (let t = 0; t < sec; t += 1 / 60) {
          setInput(game, autopilot ? botPedal(game) : forced !== undefined ? forced : pedal);
          step(game, 1 / 60);
          renderer.feed(game, game.events);
          game.events.length = 0;
        }
        if (game.status === 'done' && !recorded) record();
        renderer.reset(game);
        layoutButtons();
      },
      stats: () => ({ ...renderer.stats, avg: renderer.stats.ms / Math.max(1, renderer.stats.frames) }),
      resetStats() {
        renderer.stats.frames = 0;
        renderer.stats.ms = 0;
      },
      bench(n = 300) {
        const ctx = host.canvas.getContext('2d');
        const t0 = performance.now();
        for (let i = 0; i < n; i++) {
          api.update(1 / 60);
          api.draw(ctx);
        }
        return (performance.now() - t0) / n;
      },
    };
  }

  const api = {
    resize(w, h) {
      size = { w, h };
      renderer.resize(w, h, window.devicePixelRatio || 1);
      pickerArt.clear();
      layoutButtons();
    },

    update(dt) {
      dt = Math.max(0, dt);
      time += dt;
      lastDt = dt;
      if (screen === 'menu' && demo) {
        setInput(demo, botPedal(demo));
        step(demo, dt);
        renderer.feed(demo, demo.events);
        demo.events.length = 0;
        if ((demo.status === 'done' && demo.time - demo.doneTime > 2) || demo.time > 90) newDemo();
        return;
      }
      if (screen !== 'play' || !game) return;
      let p = pedal;
      if (autopilot) p = botPedal(game);
      if (forced !== undefined) p = forced;
      setInput(game, p);
      const before = `${game.status}|${game.status === 'done' && game.time - game.doneTime > BUTTON_DELAY}`;
      step(game, dt);
      renderer.feed(game, game.events);
      sounds(game.events);
      game.events.length = 0;
      setEngine(game.status === 'play' ? 1 : 0.4, speedOf(game), game.input === 'gas');
      if (game.status === 'done' && !recorded) record();
      const after = `${game.status}|${game.status === 'done' && game.time - game.doneTime > BUTTON_DELAY}`;
      if (before !== after) layoutButtons();
    },

    draw(ctx) {
      if (screen === 'menu') drawMenu(ctx);
      else if (screen === 'picker') drawPicker(ctx);
      else if (screen === 'garage') drawGarage(ctx);
      else if (game) drawPlay(ctx);
    },

    // A finger down anywhere off the buttons is a pedal: right half gas, left half brake.
    onPickUp(x, y) {
      unlockAudio();
      if (buttons.some((b) => hit(b, x, y))) return false;
      if (screen !== 'play' || !game || game.status === 'done') return false;
      pedal = x >= size.w / 2 ? 'gas' : 'brake';
      pressed = true;
      return true;
    },
    onDrag(x) {
      if (pedal) pedal = x >= size.w / 2 ? 'gas' : 'brake';
    },
    onDrop() {
      pedal = null;
    },
    onTap(x, y) {
      unlockAudio();
      const b = buttons.find((r) => hit(r, x, y));
      if (!b) return;
      if (b.id === 'exit') {
        setEngine(0);
        host.exit();
      } else if (b.id === 'play') startLevel(firstOpen(progress));
      else if (b.id === 'picker') goto('picker');
      else if (b.id === 'garage') goto('garage');
      else if (b.id === 'menu') goto('menu');
      else if (b.id === 'level') {
        if (unlocked(progress, b.index)) startLevel(b.index);
      } else if (b.id === 'buggy') {
        const out = chooseBuggy(progress, b.buggy);
        progress = out.progress;
        if (out.result === 'no') wiggle = { id: b.buggy, t: time };
        else {
          if (out.result === 'bought') {
            bought = { id: b.buggy, t: time };
            play('buy');
          } else play('coin');
          save();
        }
      } else if (b.id === 'restart' || b.id === 'again') startLevel(index);
      else if (b.id === 'next') {
        if (index >= LEVELS.length - 1) goto('picker');
        else startLevel(index + 1);
      }
    },
  };

  const lv = Number(params.get('level'));
  if (Number.isInteger(lv) && lv >= 1 && lv <= LEVELS.length) startLevel(lv - 1);
  else newDemo();
  return api;
}
