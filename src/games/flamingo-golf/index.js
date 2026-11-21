// Flamingo Golf as a launcher game: menu, hole picker, play, celebration, course summary
// and saved stars. Rules live in physics.js and holes.js; drawing in render.js.
import { HOLES } from './holes.js';
import { COURSE_W, COURSE_H, SKIP_AFTER, createHoleState, shoot, step, canShoot, starsFor } from './physics.js';
import {
  C, font, roundRect, outlined, drawStar, drawButton, drawIconButton, drawBackdrop, drawStaticHole, drawHoleLive,
  drawFlamingo, drawConfetti, drawTile,
} from './render.js';

const SAVE_KEY = 'flamingo-golf-progress';
const CELEBRATE_BUTTON_DELAY = 1.1; // seconds after sinking before Next shows

export function loadProgress() {
  try {
    const v = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    const stars = HOLES.map((_, i) => {
      const n = Array.isArray(v.stars) ? Number(v.stars[i]) : 0;
      return Number.isInteger(n) && n >= 0 && n <= 3 ? n : 0;
    });
    return { stars };
  } catch {
    return { stars: HOLES.map(() => 0) };
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
  } catch {
    // not kept if storage is unavailable
  }
}

export const flamingoGolf = {
  id: 'flamingo-golf',
  title: 'Flamingo Golf',
  drawTile,
  create,
};

const hit = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

function create(host) {
  let size = { w: 1, h: 1 };
  let progress = loadProgress();
  let screen = 'menu'; // 'menu' | 'picker' | 'play' | 'summary'
  let game = null;
  let view = { s: 1, ox: 0, oy: 0, hudH: 60, bottomH: 60 };
  let buttons = [];
  let aim = null; // { x0, y0, x, y } in screen pixels while dragging
  let time = 0;
  let recorded = false;
  let earned = 0; // stars for the hole just sunk

  const params = new URLSearchParams(location.search);
  const debug = params.has('debug');

  const totalStars = () => progress.stars.reduce((a, b) => a + b, 0);
  const firstOpen = () => {
    const i = progress.stars.findIndex((n) => n === 0);
    return i < 0 ? 0 : i;
  };

  function layoutView() {
    const { w, h } = size;
    const hudH = Math.max(64, Math.min(104, h * 0.085));
    const bottomH = Math.max(52, Math.min(96, h * 0.07));
    const side = 8;
    const availW = w - side * 2;
    const availH = h - hudH - bottomH;
    const s = Math.min(availW / COURSE_W, availH / COURSE_H);
    view = {
      s,
      ox: (w - COURSE_W * s) / 2,
      oy: hudH + (availH - COURSE_H * s) / 2,
      hudH,
      bottomH,
    };
  }

  // How far the finger must pull for a full-power shot, and the shortest pull that counts.
  const maxPull = () => Math.max(120, Math.min(260, Math.min(size.w, size.h) * 0.36));
  const minPull = () => Math.max(14, Math.min(size.w, size.h) * 0.035);

  function aimShot() {
    if (!aim) return null;
    const dx = aim.x0 - aim.x;
    const dy = aim.y0 - aim.y;
    const len = Math.hypot(dx, dy);
    if (len < minPull()) return null;
    return { angle: Math.atan2(dy, dx), power: Math.min(1, len / maxPull()) };
  }

  function layoutButtons() {
    const { w, h } = size;
    const bw = Math.min(w * 0.8, 420);
    const bh = Math.max(64, Math.min(96, h * 0.085));
    const x = (w - bw) / 2;
    const icon = Math.max(48, Math.min(68, w * 0.12));
    const pad = Math.max(10, w * 0.025);
    if (screen === 'menu') {
      buttons = [
        { id: 'exit', icon: 'home', x: pad, y: pad, w: icon, h: icon },
        { id: 'play', label: `Play hole ${firstOpen() + 1}`, x, y: h * 0.66, w: bw, h: bh },
        { id: 'picker', label: 'Pick a hole', x, y: h * 0.66 + bh * 1.3, w: bw, h: bh, fill: C.white },
      ];
    } else if (screen === 'picker') {
      buttons = [{ id: 'menu', icon: 'back', x: pad, y: pad, w: icon, h: icon }];
      const cols = 3;
      const top = Math.max(icon + pad * 2, h * 0.17);
      const gap = Math.max(12, w * 0.035);
      const tw = Math.min((w - gap * (cols + 1)) / cols, 200);
      const th = Math.min(tw * 1.1, (h - top - gap * 4) / 3);
      const gx = (w - (tw * cols + gap * (cols - 1))) / 2;
      HOLES.forEach((_, i) => {
        buttons.push({ id: 'hole', index: i, x: gx + (i % cols) * (tw + gap), y: top + Math.floor(i / cols) * (th + gap), w: tw, h: th });
      });
    } else if (screen === 'play') {
      const ih = Math.max(44, Math.min(60, view.hudH * 0.72));
      const iy = (view.hudH - ih) / 2;
      buttons = [
        { id: 'menu', icon: 'home', x: pad, y: iy, w: ih, h: ih },
        { id: 'restart', icon: 'restart', x: w - pad - ih, y: iy, w: ih, h: ih },
      ];
      if (game && game.status === 'sunk' && game.statusT > CELEBRATE_BUTTON_DELAY) {
        const last = game.index === HOLES.length - 1;
        buttons = [{ id: 'next', label: last ? 'All done!' : 'Next hole', x, y: h - bh - Math.max(24, h * 0.06), w: bw, h: bh * 1.1 }];
      } else if (game && game.strokes >= SKIP_AFTER && game.status !== 'sunk') {
        const sw = Math.min(w * 0.5, 240);
        const sh = Math.min(view.bottomH * 0.82, 64);
        buttons.push({ id: 'skip', label: 'Skip hole', x: (w - sw) / 2, y: h - view.bottomH + (view.bottomH - sh) / 2, w: sw, h: sh, fill: C.foam });
      }
    } else if (screen === 'summary') {
      buttons = [
        { id: 'again', label: 'Play again', x, y: h - bh * 2.5 - Math.max(20, h * 0.04), w: bw, h: bh },
        { id: 'menu', label: 'Home', x, y: h - bh - Math.max(20, h * 0.04), w: bw, h: bh, fill: C.white },
      ];
    }
  }

  function startHole(i) {
    game = createHoleState(Math.max(0, Math.min(HOLES.length - 1, i)));
    screen = 'play';
    aim = null;
    recorded = false;
    earned = 0;
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
    earned = starsFor(game.strokes, game.hole.par);
    progress.stars[game.index] = Math.max(progress.stars[game.index], earned);
    saveProgress(progress);
  }

  function next() {
    if (game.index >= HOLES.length - 1) goto('summary');
    else startHole(game.index + 1);
  }

  // ---------- drawing ----------

  function drawMenu(ctx) {
    const { w, h } = size;
    drawBackdrop(ctx, w, h);
    const px = Math.min(h * 0.085, w / 6.2);
    ctx.save();
    ctx.translate(w / 2, h * 0.17);
    ctx.rotate(-0.04 + Math.sin(time * 1.3) * 0.01);
    outlined(ctx, 'FLAMINGO', 0, 0, px, C.pink);
    outlined(ctx, 'GOLF', 0, px * 1.05, px * 1.2, C.sun);
    ctx.restore();
    // a little scene: flamingo, ball, flag
    const sy = h * 0.53;
    const sc = Math.min(w, h * 0.6) / 260;
    ctx.fillStyle = C.rim;
    ctx.beginPath();
    ctx.ellipse(w / 2, sy, 150 * sc, 46 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.felt;
    ctx.beginPath();
    ctx.ellipse(w / 2, sy, 140 * sc, 40 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0d2e18';
    ctx.beginPath();
    ctx.ellipse(w / 2 + 70 * sc, sy - 4 * sc, 12 * sc, 7 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 3 * sc;
    ctx.beginPath();
    ctx.moveTo(w / 2 + 72 * sc, sy - 4 * sc);
    ctx.lineTo(w / 2 + 72 * sc, sy - 80 * sc);
    ctx.stroke();
    ctx.fillStyle = C.pink;
    ctx.beginPath();
    ctx.moveTo(w / 2 + 73 * sc, sy - 80 * sc);
    ctx.lineTo(w / 2 + 110 * sc, sy - 70 * sc + Math.sin(time * 4) * 3 * sc);
    ctx.lineTo(w / 2 + 73 * sc, sy - 58 * sc);
    ctx.closePath();
    ctx.fill();
    const roll = (time % 4) / 4;
    ctx.fillStyle = C.white;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w / 2 - 20 * sc + roll * 80 * sc, sy + 8 * sc - roll * 10 * sc, 7 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // keep the flamingo clear of the title
    const titleBottom = h * 0.17 + px * 1.05 + px * 0.75;
    const fsc = Math.min(sc * 1.4, (sy + 14 * sc - titleBottom - 12) / 95);
    drawFlamingo(ctx, w / 2 - 60 * sc, sy + 14 * sc, fsc, time, { dance: true });
    // total stars
    const total = totalStars();
    if (total > 0) {
      const ty = h * 0.62;
      const r = Math.min(h * 0.022, w * 0.045);
      ctx.font = font(r * 1.8);
      const label = `${total} / ${HOLES.length * 3}`;
      const tw = ctx.measureText(label).width;
      drawStar(ctx, w / 2 - tw / 2 - r * 0.8, ty, r, true);
      outlined(ctx, label, w / 2 + r * 0.8, ty, r * 1.8, C.white);
    }
    for (const b of buttons) b.icon ? drawIconButton(ctx, b) : drawButton(ctx, b, b.fill);
  }

  function drawPicker(ctx) {
    const { w, h } = size;
    drawBackdrop(ctx, w, h);
    const icon = buttons[0];
    outlined(ctx, 'Pick a hole', w / 2, icon.y + icon.h / 2, Math.min(h * 0.05, w / 9), C.sun, w - (icon.w + icon.x) * 2 - 10);
    for (const b of buttons) {
      if (b.icon) {
        drawIconButton(ctx, b);
        continue;
      }
      const stars = progress.stars[b.index];
      ctx.fillStyle = 'rgba(22,11,51,0.35)';
      roundRect(ctx, b.x, b.y + 5, b.w, b.h, 20);
      ctx.fill();
      ctx.fillStyle = C.felt;
      roundRect(ctx, b.x, b.y, b.w, b.h, 20);
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = C.hotPink;
      ctx.stroke();
      outlined(ctx, String(b.index + 1), b.x + b.w / 2, b.y + b.h * 0.4, b.h * 0.42, C.white);
      const r = Math.min(b.w * 0.12, b.h * 0.11);
      for (let k = 0; k < 3; k++) drawStar(ctx, b.x + b.w / 2 + (k - 1) * r * 2.3, b.y + b.h * 0.79, r, k < stars);
    }
  }

  function drawHud(ctx) {
    const { w } = size;
    const { hudH } = view;
    const left = buttons.find((b) => b.id === 'menu');
    const room = left ? w - (left.x + left.w + 10) * 2 : w * 0.7;
    const px = Math.min(hudH * 0.36, w / 12);
    outlined(ctx, `Hole ${game.index + 1}`, w / 2, hudH * 0.33, px, C.sun, room);
    const shots = `Par ${game.hole.par}  ·  Shots ${game.strokes}`;
    outlined(ctx, shots, w / 2, hudH * 0.73, px * 0.72, C.white, room);
  }

  function drawPlay(ctx) {
    const { w, h } = size;
    drawStaticHole(ctx, game.hole, view, w, h);
    const shot = aim && canShoot(game) ? aimShot() : null;
    drawHoleLive(ctx, game, view, shot, time);
    if (aim) {
      // the pull itself, from where the finger went down to where it is now
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(aim.x0, aim.y0);
      ctx.lineTo(aim.x, aim.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(aim.x0, aim.y0, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    drawHud(ctx);
    // the hole's name along the bottom (or the Skip button there)
    if (!buttons.some((b) => b.id === 'skip') && game.status !== 'sunk') {
      ctx.font = font(Math.min(view.bottomH * 0.36, w / 16), 800);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(game.hole.name, w / 2, h - view.bottomH / 2);
    }
    if (game.status === 'splash' && game.statusT < 0.9) {
      outlined(ctx, 'Splash!', w / 2, view.oy + COURSE_H * view.s * 0.5, Math.min(h * 0.06, w / 7), C.foam);
    }
    if (game.status === 'sunk') drawCelebration(ctx);
    for (const b of buttons) b.icon ? drawIconButton(ctx, b) : drawButton(ctx, b, b.fill);
  }

  function drawCelebration(ctx) {
    const { w, h } = size;
    const k = Math.min(1, game.statusT / 0.4);
    ctx.fillStyle = `rgba(22,11,51,${0.72 * k})`;
    ctx.fillRect(0, 0, w, h);
    drawConfetti(ctx, w, h, game.statusT + 3);
    const px = Math.min(h * 0.07, w / 7);
    const words = game.strokes === 1 ? 'HOLE IN ONE!' : earned === 3 ? 'Super shot!' : 'In the hole!';
    const pop = 1 + Math.max(0, 0.3 - game.statusT) * 1.5 + Math.sin(time * 6) * 0.03;
    const ty = view.hudH + px * 0.9;
    outlined(ctx, words, w / 2, ty, px * pop, C.sun, w * 0.92);
    outlined(ctx, `${game.strokes} ${game.strokes === 1 ? 'shot' : 'shots'}  ·  Par ${game.hole.par}`, w / 2, ty + px * 1.1, px * 0.5, C.white, w * 0.9);
    // stars pop in one by one
    const r = Math.min(w * 0.11, h * 0.055);
    const starY = ty + px * 1.1 + px * 0.4 + r * 1.6;
    for (let i = 0; i < 3; i++) {
      const at = 0.35 + i * 0.25;
      const s = game.statusT < at ? 0 : Math.min(1, (game.statusT - at) / 0.15);
      const grow = s * (1 + Math.max(0, 0.3 - (game.statusT - at)) * 0.8);
      if (grow <= 0) continue;
      drawStar(ctx, w / 2 + (i - 1) * r * 2.4, starY - (i === 1 ? r * 0.3 : 0), r * grow, i < earned);
    }
    // the flamingo dances between the stars and the Next button
    const top = starY + r * 1.3;
    const bottom = h - Math.max(52, Math.min(96, h * 0.085)) * 1.1 - Math.max(24, h * 0.06) - 16;
    const fs = Math.max(0.5, Math.min(w / 160, (bottom - top) / 100));
    drawFlamingo(ctx, w / 2, bottom, fs, time, { dance: true });
  }

  function drawSummary(ctx) {
    const { w, h } = size;
    drawBackdrop(ctx, w, h);
    drawConfetti(ctx, w, h, time);
    const px = Math.min(h * 0.07, w / 7);
    outlined(ctx, 'Course done!', w / 2, h * 0.1, px, C.sun, w * 0.92);
    const total = totalStars();
    const r = Math.min(w * 0.07, h * 0.04);
    ctx.font = font(px);
    const label = `${total} / ${HOLES.length * 3}`;
    const tw = ctx.measureText(label).width;
    drawStar(ctx, w / 2 - tw / 2 - r * 0.9, h * 0.19, r * 1.2, true);
    outlined(ctx, label, w / 2 + r * 0.9, h * 0.19, px, C.white);
    // each hole's stars in a 3 x 3 grid
    const cols = 3;
    const cw = Math.min(w * 0.3, 190);
    const ch = Math.min(h * 0.075, cw * 0.55);
    const gx = (w - cw * cols) / 2;
    const gy = h * 0.27;
    const sr = Math.min(cw * 0.1, ch * 0.24);
    HOLES.forEach((_, i) => {
      const x = gx + (i % cols) * cw;
      const y = gy + Math.floor(i / cols) * ch;
      ctx.fillStyle = 'rgba(22,11,51,0.35)';
      roundRect(ctx, x + 4, y + 4, cw - 8, ch - 8, 12);
      ctx.fill();
      ctx.font = font(ch * 0.34, 800);
      ctx.fillStyle = C.white;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Hole ${i + 1}`, x + cw / 2, y + ch * 0.3);
      for (let k = 0; k < 3; k++) drawStar(ctx, x + cw / 2 + (k - 1) * sr * 2.3, y + ch * 0.66, sr, k < progress.stars[i]);
    });
    const space = buttons[0].y - (gy + ch * 3) - 24;
    const fs = Math.max(0.4, Math.min(w / 260, space / 100));
    const fy = buttons[0].y - 16;
    drawFlamingo(ctx, w / 2 - fs * 40, fy, fs, time, { dance: true });
    drawFlamingo(ctx, w / 2 + fs * 40, fy, fs, time + 0.3, { dance: true, flip: true });
    for (const b of buttons) drawButton(ctx, b, b.fill);
  }

  // ---------- test hook ----------

  if (debug) {
    window.__golf = {
      game: () => game,
      screen: () => screen,
      buttons: () => buttons.map((b) => ({ ...b })),
      view: () => ({ ...view }),
      progress: () => JSON.parse(JSON.stringify(progress)),
      // logical course point -> screen pixels
      toScreen: (x, y) => ({ x: view.ox + x * view.s, y: view.oy + y * view.s }),
      // fire a shot: angle in radians (0 = right, y down), power 0..1
      shoot: (angle, power) => !!game && shoot(game, angle, power),
      hole: (n) => startHole(n - 1),
      goto: (name) => goto(name),
    };
  }

  const forcedHole = Number(params.get('hole'));

  const api = {
    resize(w, h) {
      size = { w, h };
      layoutView();
      layoutButtons();
    },

    update(dt) {
      time += dt;
      if (screen !== 'play' || !game) return;
      const before = `${game.status}|${game.strokes >= SKIP_AFTER}|${game.statusT > CELEBRATE_BUTTON_DELAY}`;
      step(game, dt);
      if (game.status === 'sunk' && !recorded) {
        aim = null;
        record();
      }
      const after = `${game.status}|${game.strokes >= SKIP_AFTER}|${game.statusT > CELEBRATE_BUTTON_DELAY}`;
      if (before !== after) layoutButtons();
    },

    draw(ctx) {
      if (screen === 'menu') drawMenu(ctx);
      else if (screen === 'picker') drawPicker(ctx);
      else if (screen === 'summary') drawSummary(ctx);
      else if (game) drawPlay(ctx);
    },

    onPickUp(x, y) {
      // a press on a button stays a tap
      if (screen !== 'play' || !game || buttons.some((b) => hit(b, x, y))) return false;
      if (!canShoot(game)) return false;
      aim = { x0: x, y0: y, x, y };
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
      if (shot && game && canShoot(game)) shoot(game, shot.angle, shot.power);
    },
    onTap(x, y) {
      const b = buttons.find((r) => hit(r, x, y));
      if (!b) return;
      if (b.id === 'exit') host.exit();
      else if (b.id === 'play') startHole(firstOpen());
      else if (b.id === 'picker') goto('picker');
      else if (b.id === 'menu') goto('menu');
      else if (b.id === 'hole') startHole(b.index);
      else if (b.id === 'restart') startHole(game.index);
      else if (b.id === 'skip' || b.id === 'next') next();
      else if (b.id === 'again') startHole(0);
    },
  };

  if (Number.isInteger(forcedHole) && forcedHole >= 1 && forcedHole <= HOLES.length) startHole(forcedHole - 1);
  return api;
}
