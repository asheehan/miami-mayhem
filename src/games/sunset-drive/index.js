// Sunset Drive as a launcher game: menu, stage picker, the countdown, driving, the finish
// screen, one-finger steering and saved stars. Rules live in sim.js, stages in tracks.js,
// drawing in draw.js and sprites.js.
import { STAGES } from './tracks.js';
import {
  createRace, step, setSteer, starTargets, progressOf, cruiseTime, MAX_SPEED, BOOST_SPEED, SEG_LEN, COUNTDOWN,
} from './sim.js';
import { botSteer } from './bot.js';
import {
  C, font, roundRect, outlined, drawStar, drawButton, drawIconButton, drawLock, drawCoinIcon, createRenderer, drawTile,
} from './draw.js';
import { loadProgress, saveProgress, recordStars, unlocked, firstOpen } from './progress.js';
import { unlockAudio, play } from './sound.js';

const FINISH_SHOW = 0.9; // seconds after the line before the finish card appears
const BUTTON_DELAY = 1.8; // and before its buttons respond, so a steering finger can't press one
const GO_SHOW = 0.8; // seconds "GO!" stays up
const STEER_SPAN = 0.17; // finger this far (fraction of screen width) from the car = full steer
const STEER_DEAD = 0.015; // and closer than this = straight on
const HINT_TIME = 5; // seconds the steering hint stays up on the first stages

const hit = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
const storage = () => (typeof localStorage !== 'undefined' ? localStorage : null);

export const sunsetDrive = {
  id: 'sunset-drive',
  title: 'Sunset Drive',
  drawTile,
  create,
};

function create(host) {
  const params = new URLSearchParams(location.search);
  const debug = params.has('debug');
  const renderer = createRenderer();
  let size = { w: 1, h: 1 };
  let progress = storage() ? loadProgress(storage()) : loadProgress({ getItem: () => null });
  let screen = 'menu'; // 'menu' | 'picker' | 'play'
  let game = null;
  let demo = null;
  let index = 0;
  let buttons = [];
  let time = 0;
  let recorded = false;
  let finger = null; // { x, y } while a finger is steering
  let touched = false; // has the player steered yet this stage
  let autopilot = false;
  let forcedSteer = null;
  let lastCount = 0;
  const pickerArt = new Map();
  const text = { coins: -1, coinsStr: '0' };

  const totalStars = () => progress.stars.reduce((a, b) => a + b, 0);

  function layoutButtons() {
    const { w, h } = size;
    const bw = Math.min(w * 0.8, 420);
    const bh = Math.max(64, Math.min(96, h * 0.085));
    const x = (w - bw) / 2;
    const icon = Math.max(48, Math.min(68, w * 0.12));
    const pad = Math.max(10, w * 0.025);
    if (screen === 'menu') {
      const n = firstOpen(progress);
      buttons = [
        { id: 'exit', icon: 'home', x: pad, y: pad, w: icon, h: icon },
        { id: 'play', label: `Drive ${n + 1}`, glyph: 'play', x, y: h * 0.7, w: bw, h: bh },
        { id: 'picker', label: 'Stages', glyph: 'grid', x, y: h * 0.7 + bh * 1.3, w: bw, h: bh, fill: C.white },
      ];
    } else if (screen === 'picker') {
      buttons = [{ id: 'menu', icon: 'back', x: pad, y: pad, w: icon, h: icon }];
      const cols = w > h * 0.9 ? 3 : 2;
      const rows = Math.ceil(STAGES.length / cols);
      const top = Math.max(icon + pad * 2, h * 0.12);
      const gap = Math.max(12, w * 0.035);
      const tw = Math.min((w - gap * (cols + 1)) / cols, 300);
      const th = Math.min(tw * 1.2, (h - top - gap * (rows + 1)) / rows);
      const gx = (w - (tw * cols + gap * (cols - 1))) / 2;
      STAGES.forEach((_, i) => {
        buttons.push({ id: 'level', index: i, x: gx + (i % cols) * (tw + gap), y: top + Math.floor(i / cols) * (th + gap), w: tw, h: th });
      });
    } else if (screen === 'play') {
      const ih = Math.max(44, Math.min(60, w * 0.1));
      buttons = [
        { id: 'menu', icon: 'home', x: pad, y: pad, w: ih, h: ih },
        { id: 'restart', icon: 'restart', x: w - pad - ih, y: pad, w: ih, h: ih },
      ];
      if (game && game.status === 'done' && game.time - game.doneTime > BUTTON_DELAY) {
        const last = index === STAGES.length - 1;
        const by = h - bh * 2.6 - Math.max(20, h * 0.04);
        buttons.push({ id: 'next', label: last ? 'All done!' : 'Next stage', glyph: last ? null : 'next', x, y: by, w: bw, h: bh * 1.1 });
        buttons.push({ id: 'again', label: 'Again', glyph: 'restart', x: x + bw * 0.15, y: by + bh * 1.35, w: bw * 0.7, h: bh * 0.85, fill: C.white });
      }
    }
  }

  function newDemo() {
    demo = createRace(0, 1 + Math.floor(Math.random() * 1000));
    demo.status = 'race';
    demo.countT = 0;
    demo.speed = MAX_SPEED * 0.8;
    renderer.prepare(demo);
  }

  function startStage(i) {
    index = Math.max(0, Math.min(STAGES.length - 1, i));
    game = createRace(index, 1 + index * 7919 + Math.floor(Math.random() * 100000));
    renderer.prepare(game);
    screen = 'play';
    recorded = false;
    finger = null;
    touched = false;
    lastCount = COUNTDOWN + 1;
    layoutButtons();
  }

  function goto(next) {
    screen = next;
    finger = null;
    if (next !== 'play') game = null;
    if (next === 'menu') newDemo();
    layoutButtons();
  }

  function record() {
    recorded = true;
    progress = recordStars(progress, index, game.stars);
    if (storage()) saveProgress(storage(), progress);
  }

  // ---------- menu and picker ----------

  function drawMenu(ctx) {
    const { w, h } = size;
    if (!demo) newDemo();
    renderer.drawRace(ctx, demo, time, lastDt);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(22,11,51,0.5)');
    g.addColorStop(0.35, 'rgba(22,11,51,0)');
    g.addColorStop(0.62, 'rgba(22,11,51,0)');
    g.addColorStop(1, 'rgba(22,11,51,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const px = Math.min(h * 0.085, w / 5.6);
    ctx.save();
    ctx.translate(w / 2, h * 0.15);
    ctx.rotate(-0.05 + Math.sin(time * 1.4) * 0.015);
    outlined(ctx, 'SUNSET', 0, 0, px, C.sun, w * 0.9);
    outlined(ctx, 'DRIVE', 0, px * 1.05, px * 1.2, C.pink, w * 0.9);
    ctx.restore();
    const total = totalStars();
    if (total > 0) {
      const ty = h * 0.66;
      const r = Math.min(h * 0.022, w * 0.045);
      ctx.font = font(r * 1.8);
      const label = `${total} / ${STAGES.length * 3}`;
      const tw = ctx.measureText(label).width;
      drawStar(ctx, w / 2 - tw / 2 - r * 0.8, ty, r, true);
      outlined(ctx, label, w / 2 + r * 0.8, ty, r * 1.8, C.white);
    }
    for (const b of buttons) b.icon ? drawIconButton(ctx, b) : drawButton(ctx, b, b.fill);
  }

  // A little postcard of each stage: its sky, sun and road.
  function stageArt(i, bw, bh) {
    const dpr = window.devicePixelRatio || 1;
    const key = `${i}|${Math.round(bw)}x${Math.round(bh)}@${dpr}`;
    if (pickerArt.has(key)) return pickerArt.get(key);
    const st = STAGES[i];
    const cv = document.createElement('canvas');
    cv.width = Math.round(bw * dpr);
    cv.height = Math.round(bh * dpr);
    const c = cv.getContext('2d');
    c.scale(dpr, dpr);
    const hz = bh * 0.55;
    const g = c.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, st.sky.top);
    g.addColorStop(0.6, st.sky.mid);
    g.addColorStop(1, st.sky.low);
    c.fillStyle = g;
    c.fillRect(0, 0, bw, hz);
    if (!st.sky.hideSun) {
      c.fillStyle = st.sky.sun;
      c.beginPath();
      c.arc(bw * 0.68, hz - bh * 0.06, bh * (st.sky.moon ? 0.09 : 0.16), 0, Math.PI * 2);
      c.fill();
    } else {
      c.strokeStyle = '#fff6a0';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(bw * 0.7, bh * 0.08);
      c.lineTo(bw * 0.64, bh * 0.25);
      c.lineTo(bw * 0.72, bh * 0.25);
      c.lineTo(bw * 0.66, bh * 0.44);
      c.stroke();
    }
    const col = st.colours;
    const gl = st.groundL || st.ground || 'grass';
    const gr = st.groundR || st.ground || 'grass';
    const gcol = (t) => col[t] || col.grass || '#3fbf6a';
    c.fillStyle = gcol(gl);
    c.fillRect(0, hz, bw / 2, bh - hz);
    c.fillStyle = gcol(gr);
    c.fillRect(bw / 2, hz, bw / 2, bh - hz);
    c.fillStyle = col.rumble2;
    c.beginPath();
    c.moveTo(bw / 2 - 3, hz);
    c.lineTo(bw / 2 + 3, hz);
    c.lineTo(bw * 0.95, bh);
    c.lineTo(bw * 0.05, bh);
    c.fill();
    c.fillStyle = col.road;
    c.beginPath();
    c.moveTo(bw / 2 - 2, hz);
    c.lineTo(bw / 2 + 2, hz);
    c.lineTo(bw * 0.88, bh);
    c.lineTo(bw * 0.12, bh);
    c.fill();
    c.fillStyle = col.lane;
    c.fillRect(bw / 2 - 1.5, hz + (bh - hz) * 0.3, 3, (bh - hz) * 0.15);
    c.fillRect(bw / 2 - 2.5, hz + (bh - hz) * 0.65, 5, (bh - hz) * 0.25);
    pickerArt.set(key, cv);
    return cv;
  }

  function drawPicker(ctx) {
    const { w, h } = size;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3b1d6e');
    g.addColorStop(0.6, '#c8407a');
    g.addColorStop(1, '#ff9a5c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const icon = buttons[0];
    outlined(ctx, 'Stages', w / 2, icon.y + icon.h / 2, Math.min(h * 0.05, w / 9), C.sun, w - (icon.w + icon.x) * 2 - 10);
    for (const b of buttons) {
      if (b.icon) {
        drawIconButton(ctx, b);
        continue;
      }
      const open = unlocked(progress, b.index);
      const stars = progress.stars[b.index];
      const art = stageArt(b.index, b.w, b.h * 0.62);
      ctx.fillStyle = 'rgba(22,11,51,0.35)';
      roundRect(ctx, b.x, b.y + 5, b.w, b.h, 18);
      ctx.fill();
      ctx.save();
      roundRect(ctx, b.x, b.y, b.w, b.h, 18);
      ctx.clip();
      ctx.fillStyle = '#2b1055';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.drawImage(art, b.x, b.y, b.w, b.h * 0.62);
      ctx.restore();
      roundRect(ctx, b.x, b.y, b.w, b.h, 18);
      ctx.lineWidth = 5;
      ctx.strokeStyle = open ? C.white : 'rgba(255,255,255,0.4)';
      ctx.stroke();
      const nr = Math.min(b.w, b.h) * 0.14;
      ctx.beginPath();
      ctx.arc(b.x + nr * 1.25, b.y + nr * 1.25, nr, 0, Math.PI * 2);
      ctx.fillStyle = C.sun;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      ctx.fillStyle = C.ink;
      ctx.font = font(nr * 1.3);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(b.index + 1), b.x + nr * 1.25, b.y + nr * 1.3);
      outlined(ctx, STAGES[b.index].name, b.x + b.w / 2, b.y + b.h * 0.72, b.h * 0.1, C.white, b.w * 0.9);
      const sr = Math.min(b.w * 0.09, b.h * 0.08);
      for (let k = 0; k < 3; k++) drawStar(ctx, b.x + b.w / 2 + (k - 1) * sr * 2.4, b.y + b.h * 0.88, sr, k < stars);
      if (!open) {
        ctx.fillStyle = 'rgba(22,11,51,0.55)';
        roundRect(ctx, b.x, b.y, b.w, b.h, 18);
        ctx.fill();
        drawLock(ctx, b.x + b.w / 2, b.y + b.h * 0.42, Math.min(b.w, b.h) * 0.15);
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
    ctx.fillStyle = 'rgba(22,11,51,0.45)';
    roundRect(ctx, bx, top, bw, bh, bh * 0.3);
    ctx.fill();
    // coin count
    const r = bh * 0.26;
    const pop = s.time - s.lastCoinT < 0.2 ? 1.25 - (s.time - s.lastCoinT) * 1.25 : 1;
    drawCoinIcon(ctx, bx + r * 1.5, top + bh * 0.5, r * pop);
    if (text.coins !== s.coins) {
      text.coins = s.coins;
      text.coinsStr = String(s.coins);
    }
    const npx = bh * 0.46;
    ctx.font = font(npx);
    const tw = Math.max(ctx.measureText('000').width, ctx.measureText(text.coinsStr).width);
    outlined(ctx, text.coinsStr, bx + r * 2.8 + tw / 2, top + bh * 0.52, npx * pop, C.white);
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
    // road progress: a little car heading for the flag
    const py = top + bh + bh * 0.32;
    const p0 = bx + bh * 0.3;
    const p1 = bx + bw - bh * 0.3;
    ctx.fillStyle = 'rgba(22,11,51,0.4)';
    roundRect(ctx, p0, py - 3, p1 - p0, 6, 3);
    ctx.fill();
    const pr = progressOf(s);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    roundRect(ctx, p0, py - 3, Math.max(6, (p1 - p0) * pr), 6, 3);
    ctx.fill();
    // flag
    const fs = bh * 0.2;
    ctx.fillStyle = C.white;
    ctx.fillRect(p1 - 1, py - fs * 1.6, 2, fs * 1.6);
    for (let a = 0; a < 2; a++) for (let b2 = 0; b2 < 3; b2++) {
      ctx.fillStyle = (a + b2) % 2 ? C.white : C.ink;
      ctx.fillRect(p1 + 1 + b2 * fs * 0.4, py - fs * 1.6 + a * fs * 0.4, fs * 0.4, fs * 0.4);
    }
    const cx = p0 + (p1 - p0) * pr;
    ctx.fillStyle = '#ff5a3c';
    roundRect(ctx, cx - fs * 0.9, py - fs * 0.55, fs * 1.8, fs * 1.1, fs * 0.35);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  }

  function drawSpeedo(ctx) {
    const { w, h } = size;
    const s = game;
    const r = Math.max(34, Math.min(70, Math.min(w, h) * 0.09));
    const cx = Math.max(12, w * 0.03) + r;
    const cy = h - Math.max(14, h * 0.02) - r * 0.35;
    const a0 = Math.PI * 0.85;
    const a1 = Math.PI * 2.15;
    ctx.fillStyle = 'rgba(22,11,51,0.5)';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.08, Math.PI * 0.85, Math.PI * 2.15);
    ctx.lineTo(cx, cy + r * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.lineCap = 'round';
    ctx.lineWidth = r * 0.2;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.8, a0, a1);
    ctx.stroke();
    const k = Math.min(1, s.speed / BOOST_SPEED);
    const boosting = s.boostT > 0;
    if (k > 0.01) {
      ctx.strokeStyle = boosting ? C.pink : s.offroad ? C.orange : C.teal;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.8, a0, a0 + (a1 - a0) * k);
      ctx.stroke();
    }
    // the cruise mark
    const ac = a0 + (a1 - a0) * (MAX_SPEED / BOOST_SPEED);
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ac) * r * 0.62, cy + Math.sin(ac) * r * 0.62);
    ctx.lineTo(cx + Math.cos(ac) * r * 0.98, cy + Math.sin(ac) * r * 0.98);
    ctx.stroke();
    // needle
    const an = a0 + (a1 - a0) * k + (boosting ? Math.sin(time * 40) * 0.03 : 0);
    ctx.strokeStyle = C.sun;
    ctx.lineWidth = Math.max(3, r * 0.08);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(an) * r * 0.78, cy + Math.sin(an) * r * 0.78);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = C.sun;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  function drawCountdown(ctx) {
    const { w, h } = size;
    const s = game;
    const big = Math.min(h * 0.12, w / 4);
    const lightW = Math.min(w * 0.5, 260);
    const lh = lightW * 0.36;
    const lx = (w - lightW) / 2;
    const ly = h * 0.19;
    const goT = s.time - COUNTDOWN;
    if (s.status === 'count' || goT < GO_SHOW) {
      const lit = s.status === 'count' ? Math.min(3, Math.floor(COUNTDOWN - s.countT + 1)) : 3;
      const go = s.status !== 'count';
      ctx.fillStyle = 'rgba(22,11,51,0.4)';
      roundRect(ctx, lx, ly + 6, lightW, lh, lh * 0.3);
      ctx.fill();
      ctx.fillStyle = '#2a2440';
      roundRect(ctx, lx, ly, lightW, lh, lh * 0.3);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const cx = lx + lightW * (0.2 + i * 0.3);
        const on = go || i < lit;
        ctx.beginPath();
        ctx.arc(cx, ly + lh / 2, lh * 0.32, 0, Math.PI * 2);
        ctx.fillStyle = on ? (go ? C.green : i === 2 ? C.sun : C.red) : '#4a4460';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = C.ink;
        ctx.stroke();
        if (on) {
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.beginPath();
          ctx.arc(cx - lh * 0.1, ly + lh * 0.4, lh * 0.08, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (s.status === 'count') {
        const n = Math.ceil(s.countT);
        const f = n - s.countT;
        outlined(ctx, String(n), w / 2, ly + lh + big * 0.85, big * (1.3 - f * 0.3), C.white);
      } else {
        outlined(ctx, 'GO!', w / 2, ly + lh + big * 0.85, big * (1.2 + Math.max(0, 0.2 - goT)), C.green);
      }
    }
  }

  function drawHint(ctx) {
    const s = game;
    if (touched || index > 1 || s.time > COUNTDOWN + HINT_TIME) return;
    const { w, h } = size;
    const { x, y, W } = renderer.playerPose(s);
    const sway = Math.sin(time * 2.6);
    const fx = x + sway * W * 0.8;
    const fy = Math.min(h - W * 0.2, y + W * 0.05);
    const f = W * 0.035; // finger units
    ctx.save();
    ctx.globalAlpha = 0.95;
    // arrows either side of the car
    for (const side of [-1, 1]) {
      const ax = x + side * W * 0.72;
      const ay = y - W * 0.35;
      ctx.fillStyle = C.sun;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ax + side * W * 0.2, ay);
      ctx.lineTo(ax, ay - W * 0.12);
      ctx.lineTo(ax, ay + W * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // a pointing finger sliding left and right
    ctx.translate(fx, fy);
    ctx.fillStyle = C.white;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    roundRect(ctx, -2.2 * f, -9 * f, 4.4 * f, 12 * f, 2.2 * f);
    ctx.fill();
    ctx.stroke();
    roundRect(ctx, -4.5 * f, 0, 9 * f, 8 * f, 3 * f);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    outlined(ctx, 'Slide to steer!', w / 2, y - W * 1.05, Math.min(h * 0.04, w / 11), C.sun, w * 0.9);
  }

  function drawConfetti(ctx, t) {
    const { w, h } = size;
    const colours = [C.pink, C.sun, C.teal, C.white, C.orange, '#3a7bff'];
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
    if (t < 0.2) return;
    if (t < FINISH_SHOW + 0.2) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (FINISH_SHOW + 0.2 - t) / 0.2);
      outlined(ctx, 'FINISH!', w / 2, h * 0.32, Math.min(h * 0.09, w / 5) * (1 + Math.max(0, 0.5 - t) * 0.8), C.sun, w * 0.92);
      ctx.restore();
    }
    if (t < FINISH_SHOW) return;
    const k = Math.min(1, (t - FINISH_SHOW) / 0.4);
    ctx.fillStyle = `rgba(22,11,51,${0.5 * k})`;
    ctx.fillRect(0, 0, w, h);
    drawConfetti(ctx, t);
    const px = Math.min(h * 0.08, w / 6);
    const ty = h * 0.17;
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
    // coins collected out of all of them
    const cy = sy + r * 2.1;
    const cr = Math.min(r * 0.5, w / 18);
    const label = `${s.coins} / ${s.total}`;
    ctx.font = font(cr * 1.9);
    const tw = ctx.measureText(label).width;
    drawCoinIcon(ctx, w / 2 - tw / 2 - cr * 0.6, cy, cr);
    outlined(ctx, label, w / 2 + cr * 0.8, cy, cr * 1.9, C.white);
    if (s.stars < 3) {
      const need = starTargets(s.total)[s.stars - 1];
      outlined(ctx, `Get ${need} coins for the next star!`, w / 2, cy + cr * 2.4, cr * 1.05, C.white, w * 0.9);
    }
  }

  function drawPlay(ctx) {
    renderer.drawRace(ctx, game, time, lastDt);
    drawCoinBar(ctx);
    drawSpeedo(ctx);
    drawCountdown(ctx);
    drawHint(ctx);
    if (game.status === 'done') drawFinish(ctx);
    for (const b of buttons) b.icon ? drawIconButton(ctx, b) : drawButton(ctx, b, b.fill);
  }

  // ---------- steering ----------

  function steerFromFinger() {
    if (!finger || !game) return 0;
    const { x } = renderer.playerPose(game);
    const d = (finger.x - x) / size.w;
    if (Math.abs(d) < STEER_DEAD) return 0;
    return Math.max(-1, Math.min(1, (d - Math.sign(d) * STEER_DEAD) / STEER_SPAN));
  }

  // ---------- debug hook ----------

  // Handy places in the current stage: a straight, the middle of the tightest bend, a hill top.
  function spots() {
    if (!game) return null;
    const { segs, finishSeg, sectionStarts, stage } = game.track;
    const secs = [{ len: 0 }, ...stage.sections];
    let curve = null;
    let straight = null;
    let crest = null;
    let best = 0;
    secs.forEach((sec, si) => {
      const mid = sectionStarts[si] + Math.floor(sec.len / 2);
      if (si === 0 || mid > finishSeg - 20) return;
      if (Math.abs(sec.curve) > best) [best, curve] = [Math.abs(sec.curve), mid];
      if (!sec.curve && !sec.hill && sec.len >= 90 && !straight && si > 2) straight = mid;
      if (sec.hill > 0 && !crest) crest = sectionStarts[si] + sec.len - 3;
    });
    const z = (i) => (i == null ? null : i * SEG_LEN);
    return { straight: z(straight), curve: z(curve), crest: z(crest), finish: z(finishSeg) };
  }

  let lastDt = 0;
  if (debug) {
    window.__drive = {
      state: () => game,
      demo: () => demo,
      screen: () => screen,
      buttons: () => buttons.map((b) => ({ ...b })),
      view: () => ({ ...renderer.view }),
      progress: () => JSON.parse(JSON.stringify(progress)),
      pose: () => (game ? renderer.playerPose(game) : null),
      level: (n) => startStage(n - 1),
      goto: (name) => goto(name),
      autopilot(on = true) {
        autopilot = on;
      },
      steer(v) {
        forcedSteer = v;
      },
      skipCount() {
        if (game && game.status === 'count') {
          game.time += game.countT;
          game.countT = 0.0001;
          step(game, 0.001);
        }
      },
      // jump the car to world position z; traffic moves on as if time had passed
      seek(z) {
        if (!game) return;
        const dz = z - game.z;
        for (const c of game.traffic) c.z += dz * (c.speed / MAX_SPEED);
        game.z = z;
        game.speed = MAX_SPEED;
      },
      spots,
      cruiseTime: () => (game ? cruiseTime(game.track) : 0),
      stats: () => ({ ...renderer.stats, avg: renderer.stats.ms / Math.max(1, renderer.stats.frames) }),
      resetStats() {
        renderer.stats.frames = 0;
        renderer.stats.ms = 0;
      },
      // draw `n` frames back to back (advancing the race 1/60 s each) and time them
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
        setSteer(demo, botSteer(demo));
        step(demo, dt);
        demo.events.length = 0;
        if (demo.status === 'done' && demo.time - demo.doneTime > 3) newDemo();
        return;
      }
      if (screen !== 'play' || !game) return;
      let steer = steerFromFinger();
      if (autopilot) steer = botSteer(game);
      if (forcedSteer != null) steer = forcedSteer;
      setSteer(game, steer);
      const before = `${game.status}|${game.status === 'done' && game.time - game.doneTime > BUTTON_DELAY}`;
      step(game, dt);
      if (game.status === 'count') {
        const n = Math.ceil(game.countT);
        if (n < lastCount) {
          lastCount = n;
          play('beep');
        }
      }
      for (const e of game.events) play(e === 'go' ? 'go' : e);
      game.events.length = 0;
      if (game.status === 'done' && !recorded) record();
      const after = `${game.status}|${game.status === 'done' && game.time - game.doneTime > BUTTON_DELAY}`;
      if (before !== after) layoutButtons();
    },

    draw(ctx) {
      if (screen === 'menu') drawMenu(ctx);
      else if (screen === 'picker') drawPicker(ctx);
      else if (game) drawPlay(ctx);
    },

    // A finger down anywhere off the buttons steers; buttons work as taps.
    onPickUp(x, y) {
      unlockAudio();
      if (buttons.some((b) => hit(b, x, y))) return false;
      if (screen !== 'play' || !game || game.status === 'done') return false;
      finger = { x, y };
      touched = true;
      return true;
    },
    onDrag(x, y) {
      if (finger) finger = { x, y };
    },
    onDrop() {
      finger = null;
    },
    onTap(x, y) {
      const b = buttons.find((r) => hit(r, x, y));
      if (!b) return;
      if (b.id === 'exit') host.exit();
      else if (b.id === 'play') startStage(firstOpen(progress));
      else if (b.id === 'picker') goto('picker');
      else if (b.id === 'menu') goto('menu');
      else if (b.id === 'level') {
        if (unlocked(progress, b.index)) startStage(b.index);
      } else if (b.id === 'restart' || b.id === 'again') startStage(index);
      else if (b.id === 'next') {
        if (index >= STAGES.length - 1) goto('picker');
        else startStage(index + 1);
      }
    },
  };

  const forced = Number(params.get('level'));
  if (Number.isInteger(forced) && forced >= 1 && forced <= STAGES.length) startStage(forced - 1);
  else newDemo();
  return api;
}
