// Bridge Boss as a launcher game: menu, level picker, play, win and try-again screens, and
// saved stars. Rules live in sim.js (tuning in levels.js); drawing in draw.js.
import { LEVELS, HEARTS, createGame, step, toggle, starsFor } from './sim.js';
import { botStep } from './bot.js';
import {
  C, createRenderer, drawTile, outlined, roundRect, heartPath, drawStar, drawButton, drawIconButton,
  drawConfetti, drawLock, drawVehicleIcon, font,
} from './draw.js';

const SAVE_KEY = 'bridge-boss-progress';
const END_BUTTON_DELAY = 1.1; // seconds after a win or loss before the buttons respond

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

export const bridgeBoss = {
  id: 'bridge-boss',
  title: 'Bridge Boss',
  drawTile,
  create,
};

const hit = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
const newSeed = () => (Math.random() * 2 ** 31) | 0;

// What a level brings in, for its tile in the picker.
function levelIcon(i) {
  const L = LEVELS[i];
  if (L.roads === 2) return 'two';
  return L.intro ? L.intro.type : i === 0 ? 'car' : 'boat';
}

function create(host) {
  const params = new URLSearchParams(location.search);
  const debug = params.has('debug');
  const fixedSeed = Number(params.get('seed'));
  const renderer = createRenderer();
  let size = { w: 1, h: 1 };
  let hudH = 60;
  let bottomH = 80;
  let progress = loadProgress();
  let screen = 'menu'; // 'menu' | 'picker' | 'play'
  let game = null;
  let demo = createGame(0, 3);
  let buttons = [];
  let time = 0;
  let recorded = false;
  let earned = 0;
  let autopilot = false;
  let buttonsFor = ''; // the game state the buttons were laid out for
  let taps = [];
  let goalPop = { cars: -9, boats: -9, seen: { cars: 0, boats: 0 } };

  const unlocked = (i) => i === 0 || progress.stars[i - 1] > 0;
  const firstOpen = () => {
    for (let i = 0; i < LEVELS.length; i++) if (progress.stars[i] === 0 && unlocked(i)) return i;
    return 0;
  };
  const ended = () => game && game.status !== 'play';
  const endAge = () => (game ? game.time - game.endTime : 0);

  function layout() {
    const { w, h } = size;
    hudH = Math.max(56, Math.min(90, h * 0.075));
    bottomH = Math.max(64, Math.min(116, h * 0.095));
    renderer.layout(w, h, hudH, bottomH);
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
        { id: 'play', label: `Play level ${firstOpen() + 1}`, x, y: h * 0.62, w: bw, h: bh * 1.1 },
        { id: 'picker', label: 'Pick a level', x, y: h * 0.62 + bh * 1.45, w: bw, h: bh, fill: C.white },
      ];
    } else if (screen === 'picker') {
      buttons = [{ id: 'menu', icon: 'back', x: pad, y: pad, w: icon, h: icon }];
      const cols = 3;
      const top = Math.max(icon + pad * 2, h * 0.16);
      const gap = Math.max(12, w * 0.035);
      const tw = Math.min((w - gap * (cols + 1)) / cols, 200);
      const th = Math.min(tw * 1.15, (h - top - gap * 4) / 3);
      const gx = (w - (tw * cols + gap * (cols - 1))) / 2;
      LEVELS.forEach((_, i) => {
        buttons.push({ id: 'level', index: i, x: gx + (i % cols) * (tw + gap), y: top + Math.floor(i / cols) * (th + gap), w: tw, h: th });
      });
    } else if (screen === 'play') {
      buttonsFor = game ? `${game.status}|${ended() && endAge() >= END_BUTTON_DELAY}` : '';
      const ih = Math.max(44, Math.min(60, hudH * 0.78));
      const iy = (hudH - ih) / 2;
      buttons = [
        { id: 'menu', icon: 'home', x: pad, y: iy, w: ih, h: ih },
        { id: 'restart', icon: 'restart', x: w - pad - ih, y: iy, w: ih, h: ih },
      ];
      if (ended() && endAge() >= END_BUTTON_DELAY) {
        const by = h - bh * 2.6 - Math.max(20, h * 0.04);
        if (game.status === 'won') {
          const last = game.index === LEVELS.length - 1;
          buttons = [
            { id: 'next', label: last ? 'All done!' : 'Next level', x, y: by, w: bw, h: bh * 1.1 },
            { id: 'again', label: 'Play again', x, y: by + bh * 1.45, w: bw, h: bh, fill: C.white },
          ];
        } else {
          buttons = [
            { id: 'again', label: 'Try again', x, y: by, w: bw, h: bh * 1.1 },
            { id: 'picker', label: 'Levels', x, y: by + bh * 1.45, w: bw, h: bh, fill: C.white },
          ];
        }
      }
    }
  }

  function startLevel(i) {
    const index = Math.max(0, Math.min(LEVELS.length - 1, i));
    const seed = Number.isInteger(fixedSeed) && fixedSeed > 0 ? fixedSeed : newSeed();
    game = createGame(index, seed);
    screen = 'play';
    recorded = false;
    earned = 0;
    taps = [];
    goalPop = { cars: -9, boats: -9, seen: { cars: 0, boats: 0 } };
    layoutButtons();
  }

  function goto(next) {
    screen = next;
    if (next !== 'play') game = null;
    layoutButtons();
  }

  function record() {
    recorded = true;
    earned = starsFor(game);
    if (earned > 0) {
      progress.stars[game.index] = Math.max(progress.stars[game.index], earned);
      saveProgress(progress);
    }
  }

  // The bridge a tap is for: on two-bridge levels, whichever road is nearer the finger.
  function bridgeAt(y) {
    if (!game || game.bridges.length === 1) return 0;
    const wy = renderer.toWorld(0, y).y;
    let best = 0;
    for (const br of game.bridges) if (Math.abs(br.y - wy) < Math.abs(game.bridges[best].y - wy)) best = br.id;
    return best;
  }

  // ---------- drawing ----------

  function drawTitle(ctx, y) {
    const { w, h } = size;
    const px = Math.min(h * 0.085, w / 6);
    ctx.save();
    ctx.translate(w / 2, y);
    ctx.rotate(-0.04 + Math.sin(time * 1.3) * 0.01);
    outlined(ctx, 'BRIDGE', 0, 0, px, C.foam);
    outlined(ctx, 'BOSS', 0, px * 1.05, px * 1.25, C.sun);
    ctx.restore();
  }

  function drawMenu(ctx) {
    const { w, h } = size;
    renderer.drawWorld(ctx, demo, time);
    ctx.fillStyle = 'rgba(43,16,85,0.45)';
    ctx.fillRect(0, 0, w, h);
    drawTitle(ctx, h * 0.17);
    const total = progress.stars.reduce((a, b) => a + b, 0);
    if (total > 0) {
      const ty = h * 0.62 - Math.min(h * 0.05, 50);
      const r = Math.min(h * 0.022, w * 0.045);
      ctx.font = font(Math.round(r * 1.8));
      const label = `${total} / ${LEVELS.length * 3}`;
      const tw = ctx.measureText(label).width;
      drawStar(ctx, w / 2 - tw / 2 - r * 0.8, ty, r, true);
      outlined(ctx, label, w / 2 + r * 0.8, ty, r * 1.8, C.white);
    }
    for (const b of buttons) b.icon ? drawIconButton(ctx, b) : drawButton(ctx, b, b.fill);
  }

  function drawTwoBridges(ctx, x, y, s) {
    ctx.fillStyle = C.sea;
    ctx.fillRect(x - s * 0.25, y - s * 0.55, s * 0.5, s * 1.1);
    ctx.fillStyle = C.road;
    ctx.fillRect(x - s * 0.55, y - s * 0.38, s * 1.1, s * 0.2);
    ctx.fillRect(x - s * 0.55, y + s * 0.18, s * 1.1, s * 0.2);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - s * 0.55, y - s * 0.55, s * 1.1, s * 1.1);
  }

  function drawPicker(ctx) {
    const { w, h } = size;
    renderer.drawWorld(ctx, demo, time);
    ctx.fillStyle = 'rgba(43,16,85,0.6)';
    ctx.fillRect(0, 0, w, h);
    const back = buttons[0];
    outlined(ctx, 'Pick a level', w / 2, back.y + back.h / 2, Math.min(h * 0.05, w / 9), C.sun, w - (back.w + back.x) * 2 - 10);
    for (const b of buttons) {
      if (b.icon) {
        drawIconButton(ctx, b);
        continue;
      }
      const open = unlocked(b.index);
      const stars = progress.stars[b.index];
      ctx.fillStyle = 'rgba(22,11,51,0.35)';
      roundRect(ctx, b.x, b.y + 5, b.w, b.h, 20);
      ctx.fill();
      ctx.fillStyle = open ? '#2a6f97' : '#4a3d6b';
      roundRect(ctx, b.x, b.y, b.w, b.h, 20);
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = open ? C.hotPink : 'rgba(255,255,255,0.3)';
      ctx.stroke();
      outlined(ctx, String(b.index + 1), b.x + b.w * 0.3, b.y + b.h * 0.3, b.h * 0.3, open ? C.white : '#9a8fbf');
      const ic = Math.min(b.w, b.h) * 0.34;
      const kind = levelIcon(b.index);
      if (!open) drawLock(ctx, b.x + b.w * 0.7, b.y + b.h * 0.32, ic * 0.4);
      else if (kind === 'two') drawTwoBridges(ctx, b.x + b.w * 0.7, b.y + b.h * 0.3, ic);
      else drawVehicleIcon(ctx, kind, b.x + b.w * 0.7, b.y + b.h * 0.3, ic * (kind === 'cruise' ? 1.5 : 1.15), kind === 'boat' || kind === 'speedboat' || kind === 'cruise' ? -Math.PI / 2 : 0);
      const r = Math.min(b.w * 0.12, b.h * 0.11);
      for (let k = 0; k < 3; k++) drawStar(ctx, b.x + b.w / 2 + (k - 1) * r * 2.3, b.y + b.h * 0.76, r, k < stars);
    }
  }

  function drawHearts(ctx, cx, cy, r) {
    const s = game;
    const shake = s.time - s.heartTime < 0.6 ? Math.sin(s.time * 50) * r * 0.2 : 0;
    for (let i = 0; i < HEARTS; i++) {
      const x = cx + (i - 1) * r * 2.7 + (i === s.hearts ? shake : 0);
      heartPath(ctx, x, cy, r);
      ctx.fillStyle = i < s.hearts ? C.pink : 'rgba(22,11,51,0.5)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = i < s.hearts ? C.ink : 'rgba(255,255,255,0.6)';
      ctx.stroke();
    }
  }

  function drawHud(ctx) {
    const { w, h } = size;
    const s = game;
    ctx.fillStyle = 'rgba(43,16,85,0.72)';
    ctx.fillRect(0, 0, w, hudH);
    const hr = Math.min(hudH * 0.24, w * 0.045);
    drawHearts(ctx, w / 2, hudH / 2 + hr * 0.1, hr);
    // the level number, small, beside the hearts
    const menu = buttons.find((b) => b.id === 'menu' && b.icon);
    if (menu) {
      const lx = menu.x + menu.w + Math.max(12, w * 0.03);
      const lpx = Math.min(hudH * 0.36, w / 16);
      ctx.font = font(Math.round(lpx));
      const label = String(s.index + 1);
      const tw = ctx.measureText(label).width;
      if (lx + tw + 8 < w / 2 - hr * 4.2) {
        ctx.fillStyle = C.sun;
        roundRect(ctx, lx, hudH / 2 - lpx * 0.75, tw + lpx * 0.9, lpx * 1.5, lpx * 0.4);
        ctx.fill();
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = C.ink;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, lx + (tw + lpx * 0.9) / 2, hudH / 2 + 1);
      }
    }
    // goal bar: a row of pips for cars and one for boats, filling as they get through
    const top = h - bottomH;
    ctx.fillStyle = 'rgba(43,16,85,0.72)';
    ctx.fillRect(0, top, w, bottomH);
    const rowH = bottomH / 2;
    const rows = [
      { key: 'cars', icon: 'car', angle: 0, goal: s.level.goal.cars, got: s.delivered.cars, colour: C.hotPink },
      { key: 'boats', icon: 'boat', angle: -Math.PI / 2, goal: s.level.goal.boats, got: s.delivered.boats, colour: C.foam },
    ];
    const maxPips = Math.max(rows[0].goal, rows[1].goal);
    const iconW = rowH * 1.2;
    const left = Math.max(12, w * 0.04);
    const room = w - left * 2 - iconW - 10;
    const pr = Math.min(rowH * 0.3, room / (maxPips * 2.45));
    rows.forEach((row, ri) => {
      const cy = top + rowH * (ri + 0.5);
      const iconSize = row.icon === 'car' ? rowH * 0.95 : rowH * 0.85;
      drawVehicleIcon(ctx, row.icon, left + iconW / 2, cy, iconSize, row.angle);
      if (row.got > goalPop.seen[row.key]) {
        goalPop.seen[row.key] = row.got;
        goalPop[row.key] = time;
      }
      const popAge = time - goalPop[row.key];
      const x0 = left + iconW + 10 + pr;
      for (let i = 0; i < row.goal; i++) {
        const filled = i < row.got;
        const fresh = filled && i === Math.min(row.got, row.goal) - 1 && popAge < 0.35;
        const rr = pr * (fresh ? 1.35 - popAge : 1);
        ctx.beginPath();
        ctx.arc(x0 + i * pr * 2.45, cy, rr, 0, Math.PI * 2);
        ctx.fillStyle = filled ? row.colour : 'rgba(22,11,51,0.55)';
        ctx.fill();
        ctx.lineWidth = Math.max(2, pr * 0.2);
        ctx.strokeStyle = filled ? C.ink : 'rgba(255,255,255,0.45)';
        ctx.stroke();
        if (filled) {
          // a tick
          ctx.strokeStyle = C.ink;
          ctx.lineWidth = Math.max(2, pr * 0.26);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x0 + i * pr * 2.45 - rr * 0.45, cy);
          ctx.lineTo(x0 + i * pr * 2.45 - rr * 0.1, cy + rr * 0.38);
          ctx.lineTo(x0 + i * pr * 2.45 + rr * 0.48, cy - rr * 0.4);
          ctx.stroke();
        }
      }
    });
  }

  function drawWin(ctx) {
    const { w, h } = size;
    const t = endAge();
    const k = Math.min(1, t / 0.4);
    ctx.fillStyle = `rgba(22,11,51,${0.6 * k})`;
    ctx.fillRect(0, 0, w, h);
    drawConfetti(ctx, w, h, t + 3);
    const px = Math.min(h * 0.075, w / 6.5);
    const pop = 1 + Math.max(0, 0.3 - t) * 1.5 + Math.sin(time * 6) * 0.03;
    const ty = hudH + px * 1.4;
    ctx.save();
    ctx.translate(w / 2, ty);
    ctx.rotate(Math.sin(time * 3) * 0.03);
    outlined(ctx, 'BRIDGE BOSS!', 0, 0, px * pop, C.sun, w * 0.92);
    ctx.restore();
    const r = Math.min(w * 0.11, h * 0.055);
    const starY = ty + px + r * 1.5;
    for (let i = 0; i < 3; i++) {
      const at = 0.35 + i * 0.25;
      const g = t < at ? 0 : Math.min(1, (t - at) / 0.15);
      const grow = g * (1 + Math.max(0, 0.3 - (t - at)) * 0.8);
      if (grow <= 0) continue;
      drawStar(ctx, w / 2 + (i - 1) * r * 2.4, starY - (i === 1 ? r * 0.3 : 0), r * grow, i < earned);
    }
    // a happy parade: a car and a boat bouncing under the stars
    const iy = starY + r * 2.4;
    const is = Math.min(w * 0.2, h * 0.09);
    drawVehicleIcon(ctx, 'car', w / 2 - is * 0.75, iy + Math.abs(Math.sin(time * 5)) * -is * 0.15, is);
    drawVehicleIcon(ctx, 'boat', w / 2 + is * 0.75, iy + Math.abs(Math.sin(time * 5 + 1.5)) * -is * 0.15, is * 1.2);
  }

  function drawLost(ctx) {
    const { w, h } = size;
    const t = endAge();
    const k = Math.min(1, t / 0.5);
    ctx.fillStyle = `rgba(22,11,51,${0.6 * k})`;
    ctx.fillRect(0, 0, w, h);
    if (t < 0.5) return;
    const px = Math.min(h * 0.075, w / 6.5);
    outlined(ctx, 'Oops!', w / 2, hudH + px * 1.4, px * (1 + Math.sin(time * 3) * 0.03), C.pink, w * 0.9);
    // a grumpy car and boat, then three empty hearts
    const is = Math.min(w * 0.2, h * 0.09);
    const iy = hudH + px * 2.4 + is * 0.6;
    drawVehicleIcon(ctx, 'car', w / 2 - is * 0.75, iy, is, 0, 1);
    drawVehicleIcon(ctx, 'boat', w / 2 + is * 0.75, iy, is * 1.2, 0, 1);
  }

  function drawPlay(ctx) {
    renderer.drawWorld(ctx, game, time, taps);
    drawHud(ctx);
    if (game.status === 'won') drawWin(ctx);
    else if (game.status === 'lost') drawLost(ctx);
    for (const b of buttons) b.icon ? drawIconButton(ctx, b) : drawButton(ctx, b, b.fill);
  }

  // ---------- test hook ----------

  if (debug) {
    window.__bridge = {
      state: () => game,
      screen: () => screen,
      buttons: () => buttons.map((b) => ({ ...b })),
      view: () => ({ ...renderer.view, hudH, bottomH }),
      progress: () => JSON.parse(JSON.stringify(progress)),
      toScreen: (x, y) => renderer.toScreen(x, y),
      toggle: (b = 0) => !!game && toggle(game, b),
      level: (n) => startLevel(n - 1),
      goto: (name) => goto(name),
      autopilot(on = true) {
        autopilot = on;
      },
      // finish the level at once, for checking the win screen
      win() {
        if (!game) return;
        game.delivered.cars = game.level.goal.cars;
        game.delivered.boats = game.level.goal.boats;
      },
      // run the simulation forward quickly
      skip(seconds) {
        if (!game) return;
        for (let t = 0; t < seconds; t += 1 / 60) {
          if (autopilot) botStep(game);
          step(game, 1 / 60);
        }
      },
    };
  }

  const api = {
    resize(w, h) {
      size = { w, h };
      layout();
      layoutButtons();
    },

    update(dt) {
      time += dt;
      taps = taps.filter((t) => time - t.time < 0.5);
      if (screen !== 'play' || !game) {
        botStep(demo);
        step(demo, dt);
        if (demo.status !== 'play' && demo.time - demo.endTime > 3) demo = createGame(0, newSeed());
        return;
      }
      if (autopilot) botStep(game);
      step(game, dt);
      if (ended() && !recorded) record();
      const key = `${game.status}|${ended() && endAge() >= END_BUTTON_DELAY}`;
      if (key !== buttonsFor) layoutButtons();
    },

    draw(ctx) {
      if (screen === 'menu') drawMenu(ctx);
      else if (screen === 'picker') drawPicker(ctx);
      else if (game) drawPlay(ctx);
    },

    // The bridge moves as the finger goes down; a small slide still counts.
    onPickUp(x, y) {
      if (screen !== 'play' || !game || game.status !== 'play') return false;
      if (buttons.some((b) => hit(b, x, y))) return false;
      if (y < hudH || y > size.h - bottomH) return false;
      taps.push({ x, y, time });
      toggle(game, bridgeAt(y));
      return false;
    },
    onDrag() {},
    onDrop() {},
    onTap(x, y) {
      const b = buttons.find((r) => hit(r, x, y));
      if (!b) return;
      if (b.id === 'exit') host.exit();
      else if (b.id === 'play') startLevel(firstOpen());
      else if (b.id === 'picker') goto('picker');
      else if (b.id === 'menu') goto('menu');
      else if (b.id === 'level') {
        if (unlocked(b.index)) startLevel(b.index);
      } else if (b.id === 'restart' || b.id === 'again') startLevel(game.index);
      else if (b.id === 'next') {
        if (game.index >= LEVELS.length - 1) goto('picker');
        else startLevel(game.index + 1);
      }
    },
  };

  const forced = Number(params.get('level'));
  if (Number.isInteger(forced) && forced >= 1 && forced <= LEVELS.length) startLevel(forced - 1);
  return api;
}
