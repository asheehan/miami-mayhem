// Pelican Dash as a launcher game: menu, flying, game over and the saved best score.
// Rules live in sim.js and drawing in draw.js; this file wires them to the screen.
import { createGame, step, flap, nextObstacle, catchFish, START_Y, HEARTS, NEST_EVERY } from './sim.js';
import { createRenderer, drawTile, outlined, roundRect, heartPath, font, C } from './draw.js';

const SAVE_KEY = 'pelican-dash-progress';
const OVER_DELAY = 1.1; // seconds before the game over buttons respond, so a late flap can't press one

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    return { best: Number.isFinite(v.best) && v.best > 0 ? Math.floor(v.best) : 0 };
  } catch {
    return { best: 0 };
  }
}

function save(progress) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
  } catch {
    // not kept if storage is unavailable
  }
}

function drawButton(ctx, b, fill = C.sun) {
  ctx.fillStyle = fill;
  roundRect(ctx, b.x, b.y, b.w, b.h, b.h * 0.3);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.font = font(b.h * 0.42);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
}

function drawExit(ctx, b) {
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  roundRect(ctx, b.x, b.y, b.w, b.h, b.w * 0.22);
  ctx.fill();
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const s = b.w * 0.32;
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.moveTo(cx - s, cy - s * 0.05);
  ctx.lineTo(cx, cy - s);
  ctx.lineTo(cx + s, cy - s * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(cx - s * 0.7, cy - s * 0.1, s * 1.4, s * 0.95);
}

// A small fish icon for the score, in screen pixels.
function fishIcon(ctx, x, y, r) {
  ctx.fillStyle = '#ffb347';
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = Math.max(2, r * 0.18);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.7, y);
  ctx.lineTo(x - r * 1.4, y - r * 0.55);
  ctx.lineTo(x - r * 1.4, y + r * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(x + r * 0.5, y - r * 0.12, r * 0.13, 0, Math.PI * 2);
  ctx.fill();
}

export const pelicanDash = {
  id: 'pelican-dash',
  title: 'Pelican Dash',
  drawTile,
  create,
};

function create(host) {
  const params = new URLSearchParams(location.search);
  const fixedSeed = Number(params.get('seed'));
  const renderer = createRenderer();
  let size = { w: 1, h: 1 };
  let progress = load();
  let screen = 'menu'; // 'menu' | 'play'
  let game = null;
  let buttons = [];
  let time = 0;
  let lastDt = 0;
  let recorded = false;
  let newBest = false;
  let autopilot = false;
  // text that only changes when the numbers do
  const text = { fish: -1, fishStr: '0', best: -1, bestStr: '', over: '' };

  function layoutButtons() {
    const { w, h } = size;
    const bw = Math.min(w * 0.8, 420);
    const bh = Math.max(64, Math.min(96, h * 0.085));
    const x = (w - bw) / 2;
    const e = Math.max(44, Math.min(64, w * 0.11));
    if (screen === 'menu') {
      buttons = [
        { id: 'exit', x: 12, y: 12, w: e, h: e },
        { id: 'play', label: 'Play', x, y: h * 0.66, w: bw, h: bh * 1.15 },
      ];
    } else if (game && game.status === 'over' && game.time - game.overTime >= OVER_DELAY) {
      buttons = [
        { id: 'retry', label: 'Try again', x, y: h * 0.58, w: bw, h: bh },
        { id: 'menu', label: 'Menu', x, y: h * 0.58 + bh * 1.3, w: bw, h: bh },
      ];
    } else buttons = [];
  }

  function start() {
    const seed = Number.isInteger(fixedSeed) && fixedSeed > 0 ? fixedSeed : (Math.random() * 2 ** 31) | 0;
    game = createGame(seed);
    screen = 'play';
    recorded = false;
    newBest = false;
    layoutButtons();
  }

  function toMenu() {
    game = null;
    screen = 'menu';
    layoutButtons();
  }

  function record() {
    recorded = true;
    newBest = game.fish > progress.best;
    if (newBest) {
      progress = { best: game.fish };
      save(progress);
    }
  }

  function drawMenu(ctx) {
    const { w, h } = size;
    renderer.drawAttract(ctx, time);
    const px = Math.min(h * 0.08, w / 6.2);
    ctx.save();
    ctx.translate(w / 2, h * 0.17);
    ctx.rotate(-0.04 + Math.sin(time * 1.3) * 0.01);
    outlined(ctx, 'PELICAN', 0, -px * 0.6, px, C.foam);
    outlined(ctx, 'DASH', 0, px * 0.6, px * 1.25, C.sun);
    ctx.restore();
    const small = Math.min(h * 0.032, w / 15);
    outlined(ctx, 'Tap to flap. Catch fish!', w / 2, h * 0.565, small, C.white);
    if (progress.best > 0) {
      if (text.best !== progress.best) {
        text.best = progress.best;
        text.bestStr = `Best: ${progress.best}`;
      }
      outlined(ctx, text.bestStr, w / 2, h * 0.565 + small * 1.5, small, C.sun);
    }
    for (const b of buttons) {
      if (b.id === 'exit') drawExit(ctx, b);
      else drawButton(ctx, b);
    }
  }

  function drawHud(ctx) {
    const { w, h } = size;
    const s = game;
    const top = Math.max(16, h * 0.04);
    const hr = Math.max(14, Math.min(26, w * 0.04));
    // hearts, the newest loss shaking
    const shake = s.time - s.hitTime < 0.5 ? Math.sin(s.time * 60) * 3 : 0;
    for (let i = 0; i < HEARTS; i++) {
      const cx = 16 + hr * 1.3 + i * hr * 2.6 + (i === s.hearts ? shake : 0);
      const cy = top + hr;
      heartPath(ctx, cx, cy, hr);
      ctx.fillStyle = i < s.hearts ? C.pink : 'rgba(22,11,51,0.45)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = i < s.hearts ? C.ink : 'rgba(255,255,255,0.6)';
      ctx.stroke();
    }
    // fish caught
    if (text.fish !== s.fish) {
      text.fish = s.fish;
      text.fishStr = String(s.fish);
    }
    const px = Math.max(30, Math.min(56, h * 0.05));
    const pop = s.time - s.catchTime < 0.25 ? 1.2 - (s.time - s.catchTime) * 0.8 : 1;
    ctx.font = font(px);
    const tw = ctx.measureText(text.fishStr).width;
    const right = w - 18;
    outlined(ctx, text.fishStr, right - tw / 2, top + hr, px * pop, C.white);
    fishIcon(ctx, right - tw - px * 0.75, top + hr, px * 0.42);
    // pouch: ten pips toward the next nest
    const pip = Math.max(6.5, Math.min(10, w * 0.013));
    const filled = Math.min(s.pouch, NEST_EVERY);
    for (let i = 0; i < NEST_EVERY; i++) {
      const cx = right - (NEST_EVERY - 1 - i) * pip * 2.4 - pip;
      ctx.beginPath();
      ctx.arc(cx, top + hr * 2 + pip * 2, pip, 0, Math.PI * 2);
      ctx.fillStyle = i < filled ? C.sun : 'rgba(22,11,51,0.45)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
    }

    const big = Math.min(h * 0.06, w / 9);
    if (s.status === 'ready') {
      outlined(ctx, 'Tap to fly!', w / 2, h * 0.2, big, C.sun);
      // a tapping finger
      const f = Math.abs(Math.sin(time * 4));
      ctx.fillStyle = C.white;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 3;
      const fx = w * 0.62;
      const fy = h * 0.62 + f * 10;
      roundRect(ctx, fx - big * 0.22, fy - big * 0.9, big * 0.44, big * 1.3, big * 0.22);
      ctx.fill();
      ctx.stroke();
      roundRect(ctx, fx - big * 0.45, fy, big * 0.9, big * 0.8, big * 0.3);
      ctx.fill();
      ctx.stroke();
    }

    const since = s.time - s.nestTime;
    if (s.status === 'play' && since < 2) {
      const y = h * 0.16;
      outlined(ctx, 'Chicks fed!', w / 2, y, big * (1 + Math.sin(since * 14) * 0.04), C.sun);
      if (s.healed) {
        const hy = y + big * 1.15;
        outlined(ctx, '+1', w / 2 - big * 0.45, hy, big * 0.8, C.white);
        heartPath(ctx, w / 2 + big * 0.45, hy, big * 0.38);
        ctx.fillStyle = C.pink;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = C.ink;
        ctx.stroke();
      }
    }

    if (s.status === 'over') {
      const k = Math.min(1, (s.time - s.overTime) / 0.6);
      ctx.globalAlpha = 0.55 * k;
      ctx.fillStyle = C.ink;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      if (k >= 1) {
        const tpx = Math.min(h * 0.09, w / 5.5);
        outlined(ctx, 'Splash!', w / 2, h * 0.22, tpx, C.pink);
        if (!text.over || text.overFor !== s) {
          text.overFor = s;
          text.over = `${s.fish} fish`;
          text.overBest = `Best: ${progress.best}`;
        }
        const mid = Math.min(h * 0.06, w / 8);
        ctx.font = font(mid);
        const ow = ctx.measureText(text.over).width;
        const icon = mid * 0.45;
        const rowW = ow + icon * 3;
        const x0 = (w - rowW) / 2;
        fishIcon(ctx, x0 + icon * 1.4, h * 0.34, icon);
        outlined(ctx, text.over, x0 + icon * 3 + ow / 2, h * 0.34, mid, C.white);
        outlined(ctx, newBest ? 'New best!' : text.overBest, w / 2, h * 0.34 + mid * 1.4, mid * 0.7, C.sun);
      }
    }
    for (const b of buttons) drawButton(ctx, b, b.id === 'menu' ? C.white : C.sun);
  }

  if (params.has('debug')) {
    window.__pelican = {
      state: () => game,
      screen: () => screen,
      buttons: () => buttons,
      view: () => renderer.view,
      toScreen: (x, y) => (game ? renderer.toScreen(game, x, y) : null),
      autopilot(on = true) {
        autopilot = on;
      },
      // add fish straight to the pouch, to call a nest quickly
      giveFish(n) {
        if (game) catchFish(game, n);
      },
    };
  }

  return {
    resize(w, h) {
      size = { w, h };
      renderer.resize(w, h, window.devicePixelRatio || 1);
      layoutButtons();
    },

    update(dt) {
      time += dt;
      lastDt = dt;
      if (screen !== 'play' || !game) return;
      if (autopilot && game.status === 'play') {
        const o = nextObstacle(game);
        if (game.y > (o ? o.centre : START_Y)) flap(game);
      }
      step(game, dt);
      if (game.status === 'over') {
        if (!recorded) record();
        if (!buttons.length && game.time - game.overTime >= OVER_DELAY) layoutButtons();
      }
    },

    draw(ctx) {
      if (screen === 'menu' || !game) {
        drawMenu(ctx);
        return;
      }
      renderer.drawWorld(ctx, game, time, lastDt);
      drawHud(ctx);
    },

    // Flaps happen as the finger goes down, so they feel instant.
    onPickUp() {
      if (screen === 'play' && game && game.status !== 'over') flap(game);
      return false;
    },
    onDrag() {},
    onDrop() {},
    onTap(x, y) {
      const b = buttons.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
      if (!b) return;
      if (b.id === 'exit') host.exit();
      else if (b.id === 'play' || b.id === 'retry') start();
      else if (b.id === 'menu') toMenu();
    },
  };
}
