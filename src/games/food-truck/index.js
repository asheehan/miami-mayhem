// Food Truck Chef as a launcher game: menu, day picker, the truck window with customers, the
// cooking stations, the free kitchen with the hungry gator, the shop and the day-complete
// screen. Rules live in sim.js and stations.js, data in recipes.js and days.js, layout in
// layout.js, drawing in draw*.js.
import { DAYS } from './days.js';
import {
  createDay, createFreeKitchen, step, tapOrder, closeStation, serve, binDish, openStation, feed, atWindow,
  parseProgress, serializeProgress, unlocked, recordDay, buy, useAwning, SHOP, AWNINGS, priceOf,
  WALK_TIME, LEAVE_TIME,
} from './sim.js';
import { add, grabTool, rub, setHold, moveTo, pullOut, restart, stationHint, feedable, ready, RUB_TOOLS } from './stations.js';
import { driveStation } from './bot.js';
import { windowLayout, bubbleCells, stationLayout, inRect, inCircle, SNAP } from './layout.js';
import { INK, TAU, roundRect, drawDish, drawIng, recipeStrip, drawStrip, drawNo } from './draw-food.js';
import { drawCustomer, drawHappyBits, drawGatorChef, heart } from './draw-folks.js';
import {
  C, font, outlined, drawStar, drawCoin, drawButton, drawIconButton, drawLock, drawFinger, drawBeach, drawTruck,
  drawWindowFrame, drawCounter, drawBin, drawAppliance, drawBubble, drawOrderCard, drawTile, drawAwning, drawLights,
  drawDisco, drawParrot, SAMPLE,
} from './draw.js';
import { drawKitchen, drawBinBowl, drawStationScene, drawCarried } from './draw-stations.js';
import { unlockAudio, play, setLoop } from './sound.js';

const SAVE_KEY = 'food-truck-progress';
const LIFT = 34; // a carried thing is drawn this far above the finger
const WIN_BUTTON_DELAY = 1.8;
const HINT_DELAY = 5; // seconds idle before the next step glows
const ALL_DISHES = ['smoothie', 'icecream', 'taco', 'sandwich', 'fried', 'pizza'];

export function loadProgress() {
  try {
    return parseProgress(localStorage.getItem(SAVE_KEY) || '{}');
  } catch {
    return parseProgress(null);
  }
}

function saveProgress(p) {
  try {
    localStorage.setItem(SAVE_KEY, serializeProgress(p));
  } catch {
    // not kept if storage is unavailable
  }
}

export const foodTruck = {
  id: 'food-truck',
  title: 'Food Truck Chef',
  drawTile,
  create,
};

const hit = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

function create(host) {
  const params = new URLSearchParams(location.search);
  const debug = params.has('debug');
  let size = { w: 1, h: 1 };
  let view = { s: 1, ox: 0, oy: 60, hudH: 60, FW: 400, FH: 700 };
  let progress = loadProgress();
  let screen = 'menu'; // 'menu' | 'picker' | 'shop' | 'play' | 'free' | 'gallery'
  let game = null;
  let dayIndex = 0;
  let buttons = [];
  let time = 0;
  let recorded = false;
  let drag = null;
  let flyers = []; // ingredients flying back to a bin or into the food
  let fx = []; // particles in field units
  let coinsFly = []; // coins flying up to the counter, in screen px
  let binWrong = {}; // bin id -> time it was refused
  let cardWrongAt = -1;
  let idle = 0;
  let seen = { game: 0, station: 0, stationRef: null };
  let autoplay = false;
  let autoMem = {};
  let shopPop = {}; // item -> time bought / refused
  let shownCoins = 0;
  let lastView = null;

  const toField = (x, y) => ({ x: (x - view.ox) / view.s, y: (y - view.oy) / view.s });
  const toScreen = (x, y) => ({ x: view.ox + x * view.s, y: view.oy + y * view.s });
  const firstOpen = () => {
    for (let i = 0; i < DAYS.length; i++) if (unlocked(progress, i) && progress.stars[i] === 0) return i;
    return 0;
  };
  const queueOf = () => (game && game.mode === 'day' ? game.def.queue : 1);
  const WL = () => windowLayout(view.FW, view.FH, queueOf());
  const SL = () => (game && game.station ? stationLayout(game.station, view.FW, view.FH) : null);

  function layoutView() {
    const { w, h } = size;
    const hudH = Math.max(56, Math.min(84, h * 0.07));
    const s = Math.min(w / 400, (h - hudH) / 680);
    view = { s, ox: 0, oy: hudH, hudH, FW: w / s, FH: (h - hudH) / s };
  }

  function layoutButtons() {
    const { w, h } = size;
    const bw = Math.min(w * 0.8, 420);
    const bh = Math.max(62, Math.min(92, h * 0.08));
    const x = (w - bw) / 2;
    const icon = Math.max(48, Math.min(66, w * 0.12));
    const pad = Math.max(10, w * 0.025);
    if (screen === 'menu') {
      const n = firstOpen();
      const y0 = h * 0.6;
      const gap = bh * 1.22;
      buttons = [
        { id: 'exit', icon: 'home', x: pad, y: pad, w: icon, h: icon },
        { id: 'play', label: `Day ${n + 1}`, glyph: 'play', x, y: y0, w: bw, h: bh },
        { id: 'free', label: 'Kitchen', glyph: 'gator', x, y: y0 + gap, w: bw, h: bh, fill: '#8fe06a' },
        { id: 'picker', label: '1 2 3', glyph: 'grid', x, y: y0 + gap * 2, w: bw * 0.48, h: bh, fill: C.white },
        { id: 'shop', label: 'Shop', glyph: 'coin', x: x + bw * 0.52, y: y0 + gap * 2, w: bw * 0.48, h: bh, fill: '#ff9ec7' },
      ];
    } else if (screen === 'picker') {
      buttons = [{ id: 'menu', icon: 'back', x: pad, y: pad, w: icon, h: icon }];
      const cols = 3;
      const rows = Math.ceil(DAYS.length / cols);
      const top = icon + pad * 2;
      const gap = Math.max(10, w * 0.03);
      const tw = Math.min((w - gap * (cols + 1)) / cols, 230);
      const th = Math.min(tw * 1.4, (h - top - gap * (rows + 1)) / rows);
      const gx = (w - (tw * cols + gap * (cols - 1))) / 2;
      DAYS.forEach((_, i) => buttons.push({ id: 'day', index: i, x: gx + (i % cols) * (tw + gap), y: top + Math.floor(i / cols) * (th + gap), w: tw, h: th }));
    } else if (screen === 'shop') {
      buttons = [{ id: 'menu', icon: 'back', x: pad, y: pad, w: icon, h: icon }];
      const cols = w > 600 ? 4 : 3;
      const rows = Math.ceil(SHOP.length / cols);
      const top = h * 0.36;
      const gap = Math.max(8, w * 0.025);
      const tw = Math.min((w - gap * (cols + 1)) / cols, 190);
      const th = Math.min(tw * 1.12, (h - top - gap * (rows + 1)) / rows);
      const gx = (w - (tw * cols + gap * (cols - 1))) / 2;
      SHOP.forEach((it, i) => buttons.push({ id: 'item', item: it.id, x: gx + (i % cols) * (tw + gap), y: top + Math.floor(i / cols) * (th + gap), w: tw, h: th }));
      // the pink awning is free and always yours
      buttons.push({ id: 'item', item: 'awning-pink', x: w - pad - icon * 1.3, y: pad, w: icon * 1.3, h: icon });
    } else if (screen === 'play' || screen === 'free') {
      const ih = Math.max(44, Math.min(60, view.hudH * 0.76));
      const iy = (view.hudH - ih) / 2;
      const inStation = !!(game && game.station);
      buttons = [{ id: inStation ? 'back' : 'menu', icon: inStation ? 'back' : 'home', x: pad, y: iy, w: ih, h: ih }];
      if (screen === 'play' && game && game.status === 'done' && game.statusT > WIN_BUTTON_DELAY) {
        const last = dayIndex === DAYS.length - 1;
        const by = h - bh * 2.7 - Math.max(20, h * 0.04);
        buttons.push({ id: 'next', label: last ? '1 2 3' : 'Next', glyph: last ? 'grid' : 'next', x, y: by, w: bw, h: bh * 1.1 });
        buttons.push({ id: 'again', label: 'Again', glyph: 'restart', x: x + bw * 0.15, y: by + bh * 1.35, w: bw * 0.7, h: bh * 0.85, fill: C.white });
      }
    } else if (screen === 'gallery') {
      buttons = [{ id: 'menu', icon: 'back', x: pad, y: pad, w: icon, h: icon }];
    }
  }

  function startDay(i) {
    dayIndex = Math.max(0, Math.min(DAYS.length - 1, i));
    game = createDay(dayIndex, 1 + (progress.stars[dayIndex] > 0 ? Math.floor(time * 1000) % 97 : 0));
    screen = 'play';
    resetPlay();
  }

  function startFree() {
    game = createFreeKitchen();
    screen = 'free';
    resetPlay();
  }

  function resetPlay() {
    recorded = false;
    drag = null;
    flyers = [];
    fx = [];
    coinsFly = [];
    binWrong = {};
    idle = 0;
    seen = { game: 0, station: 0, stationRef: null };
    autoMem = {};
    lastView = null;
    setLoop(null);
    layoutButtons();
  }

  function goto(next) {
    screen = next;
    drag = null;
    setLoop(null);
    if (next !== 'play' && next !== 'free') game = null;
    layoutButtons();
  }

  function record() {
    recorded = true;
    recordDay(progress, dayIndex, game.stars, game.coins);
    saveProgress(progress);
  }

  // ---------- juice ----------

  function burst(x, y, n, cols, { speed = 160, life = 0.6, kind = 'dot', r = 5, up = 0 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const v = speed * (0.4 + Math.random() * 0.8);
      fx.push({ kind, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - up, life, max: life, col: cols[i % cols.length], r: r * (0.6 + Math.random() * 0.8) });
    }
  }
  function puff(x, y, n, col = '#ffffff', grow = 26) {
    for (let i = 0; i < n; i++) fx.push({ kind: 'puff', x: x + (Math.random() - 0.5) * 30, y, vx: (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 40, life: 1.1, max: 1.1, col, r: 8 + Math.random() * 8, grow });
  }

  function stationFocus(st, L) {
    if (!L) return { x: view.FW / 2, y: view.FH / 2 };
    if (st.kind === 'smoothie') return st.phase === 'top' || st.phase === 'done' ? { x: L.cup.x, y: L.cup.bottom - L.cup.h } : { x: L.blender.x, y: L.blender.jar.y + L.blender.jar.h * 0.5 };
    if (st.kind === 'sandwich') return st.phase === 'press' || st.phase === 'done' ? { x: L.press.x, y: L.press.y + L.press.h * 0.5 } : { x: L.board.x, y: L.board.bottom - 60 };
    if (st.kind === 'pizza') return st.phase === 'bake' ? { x: L.oven.x, y: L.oven.y + L.oven.h * 0.6 } : { x: L.pizza.x, y: L.pizza.y };
    if (st.kind === 'fried') return st.phase === 'fry' ? { x: L.fryer.x, y: L.oil.y } : { x: L.boat.x, y: L.boat.bottom - 50 };
    if (st.kind === 'icecream') return { x: L.cone.x, y: L.cone.tip - L.cone.s * 1.5 };
    return { x: L.taco.x, y: L.taco.bottom - L.taco.w * 0.5 };
  }

  function stationEvents() {
    const st = game.station;
    if (!st) return;
    if (seen.stationRef !== st) {
      seen.stationRef = st;
      seen.station = st.seq;
      return;
    }
    const L = SL();
    for (const e of st.events) {
      if (e.seq <= seen.station) continue;
      seen.station = e.seq;
      const f = stationFocus(st, L);
      if (e.type === 'add') {
        play('pop');
        burst(f.x, f.y, 8, ['#ffffff', '#ffe14d', '#ff9ec7'], { speed: 140, life: 0.45, kind: 'star', r: 5 });
      } else if (e.type === 'wrong') {
        play('boing');
        binWrong[e.ing] = time;
        cardWrongAt = time;
      } else if (e.type === 'green') play('sparkle');
      else if (e.type === 'perfect') {
        play('ding');
        burst(f.x, f.y, 16, ['#ffe14d', '#ffffff', '#3fe07a'], { speed: 220, life: 0.8, kind: 'star', r: 7 });
      } else if (e.type === 'overdone' || e.type === 'smoke' || e.type === 'burnt') {
        play('puff');
        puff(f.x, f.y - 20, 8, '#5a5060', 40);
      } else if (e.type === 'ding') {
        play('ding');
      } else if (e.type === 'notyet') play('boing');
      else if (e.type === 'rubbed') {
        play('sparkle');
        burst(f.x, f.y, 12, ['#ffffff', '#ffe14d'], { speed: 180, life: 0.6, kind: 'star', r: 6 });
      } else if (e.type === 'pour') play('splash');
      else if (e.type === 'done') {
        play('tada');
        burst(f.x, f.y, 26, ['#ff5fa2', '#ffe14d', '#3fe07a', '#3ab8ff', '#ffffff'], { speed: 300, life: 1, kind: 'star', r: 8 });
      } else if (e.type === 'restart') play('puff');
    }
  }

  function gameEvents() {
    for (const e of game.events) {
      if (e.seq <= seen.game) continue;
      seen.game = e.seq;
      if (e.type === 'order') play('pop');
      else if (e.type === 'serve') play('mmm');
      else if (e.type === 'wrongServe') play('boing');
      else if (e.type === 'shrug') play('sad');
      else if (e.type === 'pay') {
        const c = game.customers.find((k) => k.id === e.cust);
        const L = WL();
        const sp = L.spots[c.spot] || L.spots[0];
        const from = toScreen(sp.x, sp.y - 160 * sp.k);
        for (let i = 0; i < e.coins; i++) coinsFly.push({ x0: from.x + (i - e.coins / 2) * 14, y0: from.y, t: -i * 0.12, dur: 0.9 });
      } else if (e.type === 'dayDone') play('tada');
      else if (e.type === 'feed') {
        const k = e.reaction;
        play(k === 'fire' ? 'fire' : k === 'freeze' ? 'brr' : k === 'burp' ? 'burp' : k === 'yuck' ? 'yuck' : k === 'smoke' ? 'puff' : 'mmm');
      } else if (e.type === 'ready') play('ding');
    }
  }

  // ---------- drawing ----------

  function drawMenu(ctx) {
    const { w, h } = size;
    drawBeach(ctx, 0, 0, w, h, time, 0.3);
    const k = Math.min(w / 470, h / 900);
    drawTruck(ctx, w * 0.5, h * 0.56, k, progress, time);
    const px = Math.min(h * 0.075, w / 7);
    ctx.save();
    ctx.translate(w / 2 + Math.sin(time * 2) * 3, h * 0.08 + px * 0.2);
    ctx.rotate(-0.04 + Math.sin(time * 1.5) * 0.025);
    outlined(ctx, 'FOOD TRUCK', 0, 0, px, C.white, w * 0.86);
    outlined(ctx, 'CHEF', 0, px * 1.08, px * 1.25, C.sun, w * 0.6);
    ctx.restore();
    drawTotals(ctx, w - 12, 16, true);
    for (const b of buttons) b.icon ? drawIconButton(ctx, b) : drawButton(ctx, b, b.fill);
  }

  // Coins (and stars) in a pill at the top right; right edge at x.
  function drawTotals(ctx, x, y, withStars) {
    const r = Math.max(12, Math.min(18, size.w * 0.035));
    ctx.font = font(r * 1.6);
    const coins = String(Math.round(shownCoins));
    const stars = String(progress.stars.reduce((a, b) => a + b, 0));
    const cw = ctx.measureText(coins).width;
    const sw = withStars ? ctx.measureText(stars).width + r * 3 : 0;
    const pw = cw + r * 3 + sw;
    roundRect(ctx, x - pw, y, pw, r * 2.6, r * 1.3);
    ctx.fillStyle = 'rgba(34,17,58,0.45)';
    ctx.fill();
    drawCoin(ctx, x - pw + r * 1.4, y + r * 1.3, r, time * 2);
    ctx.fillStyle = C.white;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(coins, x - pw + r * 2.6, y + r * 1.35);
    if (withStars) {
      drawStar(ctx, x - sw + r * 0.6, y + r * 1.3, r, true);
      ctx.fillStyle = C.white;
      ctx.fillText(stars, x - sw + r * 1.8, y + r * 1.35);
    }
  }

  // A picture of what a day brings that is new.
  function drawFresh(ctx, fresh, x, y, s) {
    if (SAMPLE[fresh]) return drawDish(ctx, SAMPLE[fresh], x, y, s, time);
    if (fresh === 'bigger') return drawDish(ctx, { kind: 'icecream', scoops: ['mint', 'berry', 'chocolate'], sprinkles: true, cherry: true }, x, y, s, time);
    if (fresh === 'special') {
      drawDish(ctx, { kind: 'sandwich', layers: ['bread', 'ham', 'pork', 'cheese'] }, x - s * 0.1, y, s * 0.85, time);
      ctx.save();
      drawIng(ctx, 'pickles', x + s * 0.3, y + s * 0.2, s * 0.2);
      ctx.restore();
      return drawNo(ctx, x + s * 0.3, y + s * 0.2, s * 0.2);
    }
    if (fresh === 'patience') {
      for (let i = 0; i < 3; i++) heart(ctx, x + (i - 1) * s * 0.36, y, s * 0.17, i < 2 ? '#ff3d7a' : '#e8dde8');
      return;
    }
    if (fresh === 'two') {
      drawDish(ctx, SAMPLE.smoothie, x - s * 0.22, y, s * 0.6, time);
      return drawDish(ctx, SAMPLE.taco, x + s * 0.22, y, s * 0.6, time);
    }
    if (fresh === 'rush') {
      drawCustomer(ctx, 'pelican', x - s * 0.22, y + s * 0.4, s * 0.0034, 'wait', time);
      return drawCustomer(ctx, 'flamingo', x + s * 0.22, y + s * 0.4, s * 0.0034, 'wait', time + 1);
    }
    if (fresh === 'party') return drawDisco(ctx, x, y, s * 0.22, time);
  }

  const DAY_COLS = ['#ff9ec7', '#9ee8ff', '#ffd27a', '#b8f08a', '#c8b0ff', '#ffb27a'];

  function drawPicker(ctx) {
    const { w, h } = size;
    drawBeach(ctx, 0, 0, w, h, time, 0.3);
    ctx.fillStyle = 'rgba(34,17,58,0.2)';
    ctx.fillRect(0, 0, w, h);
    for (const b of buttons) {
      if (b.icon) {
        drawIconButton(ctx, b);
        continue;
      }
      const open = unlocked(progress, b.index);
      ctx.fillStyle = 'rgba(34,17,58,0.35)';
      roundRect(ctx, b.x, b.y + 5, b.w, b.h, 20);
      ctx.fill();
      ctx.fillStyle = DAY_COLS[b.index % DAY_COLS.length];
      roundRect(ctx, b.x, b.y, b.w, b.h, 20);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = open ? C.white : 'rgba(255,255,255,0.4)';
      ctx.stroke();
      ctx.save();
      roundRect(ctx, b.x, b.y, b.w, b.h, 20);
      ctx.clip();
      drawFresh(ctx, DAYS[b.index].fresh, b.x + b.w * 0.55, b.y + b.h * 0.48, Math.min(b.w, b.h) * 0.62);
      ctx.restore();
      outlined(ctx, String(b.index + 1), b.x + b.w * 0.16, b.y + b.h * 0.16, b.h * 0.2, C.white);
      const sr = Math.min(b.w * 0.1, b.h * 0.085);
      for (let k = 0; k < 3; k++) drawStar(ctx, b.x + b.w / 2 + (k - 1) * sr * 2.3, b.y + b.h * 0.86, sr, k < progress.stars[b.index]);
      if (!open) {
        ctx.fillStyle = 'rgba(34,17,58,0.55)';
        roundRect(ctx, b.x, b.y, b.w, b.h, 20);
        ctx.fill();
        drawLock(ctx, b.x + b.w / 2, b.y + b.h * 0.45, Math.min(b.w, b.h) * 0.15);
      }
    }
  }

  function drawShopItem(ctx, id, x, y, s) {
    ctx.save();
    if (id.startsWith('awning')) {
      drawAwning(ctx, x - s * 0.45, x + s * 0.45, y - s * 0.2, s * 0.4, id, time);
    } else if (id === 'lights') drawLights(ctx, x - s * 0.45, x + s * 0.45, y - s * 0.15, s * 0.12, time);
    else if (id === 'disco') drawDisco(ctx, x, y + s * 0.05, s * 0.26, time);
    else if (id === 'parrot') drawParrot(ctx, x, y, s * 0.012, time);
    else {
      if (id === 'flowers') {
        for (let i = 0; i < 3; i++) {
          const fx2 = x + (i - 1) * s * 0.25;
          for (let p = 0; p < 5; p++) {
            const a = (p / 5) * TAU + time;
            ctx.fillStyle = ['#ff4f9a', '#ffe14d', '#b07aff'][i];
            ctx.beginPath();
            ctx.arc(fx2 + Math.cos(a) * s * 0.06, y - s * 0.08 + Math.sin(a) * s * 0.06, s * 0.05, 0, TAU);
            ctx.fill();
          }
        }
        roundRect(ctx, x - s * 0.4, y + s * 0.02, s * 0.8, s * 0.16, 6);
        ctx.fillStyle = '#b06a3a';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = INK;
        ctx.stroke();
      } else if (id === 'sign') {
        roundRect(ctx, x - s * 0.42, y - s * 0.26, s * 0.84, s * 0.5, 12);
        ctx.fillStyle = '#2b1055';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = INK;
        ctx.stroke();
        ctx.shadowColor = '#ff5fa2';
        ctx.shadowBlur = 10;
        roundRect(ctx, x - s * 0.36, y - s * 0.2, s * 0.72, s * 0.38, 10);
        ctx.strokeStyle = '#ff5fa2';
        ctx.stroke();
        ctx.shadowBlur = 0;
        drawDish(ctx, SAMPLE.smoothie, x - s * 0.15, y, s * 0.3, time);
        drawDish(ctx, SAMPLE.taco, x + s * 0.17, y, s * 0.32, time);
      } else if (id === 'surfboard') {
        ctx.translate(x, y);
        ctx.rotate(-0.5);
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.42, s * 0.1, 0, 0, TAU);
        ctx.fillStyle = '#ffe14d';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = INK;
        ctx.stroke();
        ctx.fillStyle = '#ff5fa2';
        ctx.fillRect(-s * 0.38, -s * 0.015, s * 0.76, s * 0.03);
      }
    }
    ctx.restore();
  }

  function drawShop(ctx) {
    const { w, h } = size;
    drawBeach(ctx, 0, 0, w, h, time, 0.22);
    const k = Math.min(w / 520, (h * 0.3) / 380);
    drawTruck(ctx, w * 0.5, h * 0.33, k, progress, time);
    for (const b of buttons) {
      if (b.icon) {
        drawIconButton(ctx, b);
        continue;
      }
      const owned = b.item === 'awning-pink' || progress.owned.includes(b.item);
      const price = priceOf(b.item) || 0;
      const afford = progress.coins >= price;
      const on = AWNINGS.includes(b.item) && progress.awning === b.item;
      const popT = shopPop[b.item] ? time - shopPop[b.item].t : 9;
      const shake = shopPop[b.item]?.kind === 'poor' && popT < 0.5 ? Math.sin(popT * 50) * 6 : 0;
      const grow = shopPop[b.item]?.kind === 'ok' && popT < 0.5 ? 1 + Math.sin((popT / 0.5) * Math.PI) * 0.12 : 1;
      ctx.save();
      ctx.translate(b.x + b.w / 2 + shake, b.y + b.h / 2);
      ctx.scale(grow, grow);
      ctx.translate(-(b.x + b.w / 2), -(b.y + b.h / 2));
      ctx.fillStyle = 'rgba(34,17,58,0.3)';
      roundRect(ctx, b.x, b.y + 5, b.w, b.h, 18);
      ctx.fill();
      ctx.fillStyle = owned ? '#e6fff0' : '#ffffff';
      roundRect(ctx, b.x, b.y, b.w, b.h, 18);
      ctx.fill();
      ctx.lineWidth = on ? 6 : 3;
      ctx.strokeStyle = on ? '#3fe07a' : INK;
      ctx.stroke();
      const small = b.item === 'awning-pink';
      drawShopItem(ctx, b.item, b.x + b.w / 2, b.y + b.h * (small ? 0.5 : 0.42), Math.min(b.w, b.h) * (small ? 0.9 : 0.7));
      if (!small) {
        if (owned) {
          // a green tick
          const tx = b.x + b.w / 2;
          const ty = b.y + b.h * 0.85;
          ctx.beginPath();
          ctx.arc(tx, ty, b.h * 0.1, 0, TAU);
          ctx.fillStyle = '#3fe07a';
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = INK;
          ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(tx - b.h * 0.05, ty);
          ctx.lineTo(tx - b.h * 0.01, ty + b.h * 0.04);
          ctx.lineTo(tx + b.h * 0.055, ty - b.h * 0.045);
          ctx.stroke();
        } else {
          const r = b.h * 0.075;
          ctx.font = font(r * 2);
          const label = String(price);
          const tw = ctx.measureText(label).width;
          const cx = b.x + b.w / 2;
          const cy = b.y + b.h * 0.85;
          drawCoin(ctx, cx - tw / 2 - r * 0.4, cy, r);
          ctx.fillStyle = afford ? INK : '#b05a6a';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, cx - tw / 2 + r * 0.9, cy + 1);
        }
      }
      ctx.restore();
    }
    drawTotals(ctx, size.w - 12 - (buttons.find((b) => b.item === 'awning-pink')?.w || 0) - 10, 16, false);
  }

  // ---------- the window ----------

  function customerPose(c, sp) {
    const FW = view.FW;
    let x = sp.x;
    if (c.state === 'walk') {
      const k = Math.min(1, c.t / WALK_TIME);
      const e = 1 - (1 - k) * (1 - k);
      x = -140 + (sp.x + 140) * e;
    } else if (c.state === 'leave') {
      const k = Math.min(1, c.t / LEAVE_TIME);
      x = sp.x + (FW + 160 - sp.x) * k * k;
    }
    const walking = c.state === 'walk' || c.state === 'leave';
    const hop = walking ? Math.abs(Math.sin(c.t * (c.who === 'skater' ? 4 : 9))) * 8 : 0;
    let mood = c.mood;
    if (walking) mood = c.state === 'leave' && c.mood !== 'shrug' ? 'yum' : 'wait';
    if (c.state === 'eat' && c.t < 1.1) mood = 'munch';
    return { x, y: sp.y - hop, mood };
  }

  function itemStates(c) {
    return c.items.map((_, i) => {
      if (c.filled[i]) return 'done';
      if (game.counter.some((k) => k.cust === c.id && k.item === i)) return 'ready';
      if ((game.stationFor && game.stationFor.cust === c.id && game.stationFor.item === i) || (game.parked && game.parked.for.cust === c.id && game.parked.for.item === i)) return 'cooking';
      return 'todo';
    });
  }

  // What the finger should do next at the window (for the hint): { kind: 'bubble', cust, item } or { kind: 'serve', dish, cust }.
  function windowHint() {
    if (game.mode !== 'day' || game.status !== 'open') return null;
    const waiting = atWindow(game).filter((c) => c.state === 'wait');
    for (const k of game.counter) {
      const c = waiting.find((q) => q.items.some((o, i) => !q.filled[i]) && itemStates(q).some((s2) => s2 === 'ready') && q.id === k.cust) || waiting.find((q) => q.id === k.cust);
      if (c) return { kind: 'serve', dish: k.id, cust: c.id };
    }
    for (const c of waiting) {
      const states = itemStates(c);
      const i = states.findIndex((s2) => s2 === 'todo' || s2 === 'cooking');
      if (i >= 0) return { kind: 'bubble', cust: c.id, item: i };
    }
    return null;
  }

  function drawWindowView(ctx) {
    const { FW, FH } = view;
    const L = WL();
    drawBeach(ctx, 0, 0, FW, L.counterY, time, 0.5);
    if (game.mode === 'free') {
      const r = game.gator.reaction;
      drawGatorChef(ctx, FW * 0.42, L.counterY + 26, L.k * 1.1, r, game.gator.t, time);
    } else {
      for (const c of game.customers) {
        if (c.state === 'queued' || c.state === 'gone') continue;
        const sp = L.spots[c.spot] || L.spots[0];
        const p = customerPose(c, sp);
        drawCustomer(ctx, c.who, p.x, p.y, sp.k, p.mood, c.t + c.id);
        if (c.state === 'eat' || c.state === 'shrug' || c.mood === 'munch') drawHappyBits(ctx, p.x, p.y, sp.k, p.mood, c.t);
      }
    }
    drawCounter(ctx, FW, FH, L, progress, time);
    drawWindowFrame(ctx, FW, L, progress, time);
    // dishes on the counter
    if (game.mode === 'day') {
      game.counter.forEach((k, i) => {
        if (drag && drag.type === 'counter' && drag.id === k.id) return;
        const slot = L.counter[i % L.counter.length];
        drawDish(ctx, k.dish, slot.x, slot.y, slot.s, time);
      });
      drawBin(ctx, L.bin, drag && drag.type === 'counter' ? 1 : 0);
    }
    // the kitchen row
    const met = new Set(game.mode === 'day' ? DAYS.slice(0, dayIndex + 1).flatMap((d) => d.menu) : ALL_DISHES);
    const want = new Set();
    if (game.mode === 'day') {
      for (const c of atWindow(game)) if (c.state === 'wait') c.items.forEach((o, i) => !c.filled[i] && want.add(o.kind));
    }
    for (const a of L.appliances) drawAppliance(ctx, a, time + a.x * 0.01, { locked: !met.has(a.kind), glow: want.has(a.kind) && idle > HINT_DELAY * 0.6 ? 1 : 0 });
    // bubbles over everything
    if (game.mode === 'day') {
      for (const c of game.customers) {
        if (c.state !== 'wait') continue;
        const sp = L.spots[c.spot] || L.spots[0];
        const pop = Math.min(1, 0.3 + c.t * 4) * (1 + Math.max(0, 0.25 - c.t) * 0.8);
        const pat = game.def.patience > 0 ? c.patience / c.patienceMax : null;
        drawBubble(ctx, sp.bubble, c.items, itemStates(c), time, { pop, patience: pat });
      }
    }
    if (drag && drag.type === 'counter') {
      const k = game.counter.find((d) => d.id === drag.id);
      if (k) drawDish(ctx, k.dish, drag.x, drag.y - LIFT, L.counter[0].s * 1.1, time);
    }
    // hint finger
    const h = idle > (dayIndex === 0 ? 2.5 : HINT_DELAY) && !drag ? windowHint() : null;
    if (h && h.kind === 'bubble') {
      const c = game.customers.find((q) => q.id === h.cust);
      const sp = L.spots[c.spot] || L.spots[0];
      const cell = bubbleCells(sp.bubble, c.items.length)[h.item];
      drawFinger(ctx, cell.x + cell.w * 0.55, cell.y + cell.h * 0.55 + Math.abs(Math.sin(time * 4)) * 12, 1.3);
    } else if (h && h.kind === 'serve') {
      const i = game.counter.findIndex((d) => d.id === h.dish);
      const slot = L.counter[i % L.counter.length];
      const c = game.customers.find((q) => q.id === h.cust);
      const sp = L.spots[c.spot] || L.spots[0];
      const k = (time * 0.6) % 1;
      drawFinger(ctx, slot.x + (sp.x - slot.x) * k, slot.y + (sp.y - 120 * sp.k - slot.y) * k + 10, 1.3);
    }
  }

  // ---------- a station ----------

  function hintNow() {
    if (!game.station || game.station.free) return null;
    const delay = dayIndex === 0 ? 2.5 : HINT_DELAY;
    if (idle < delay) return null;
    return stationHint(game.station);
  }

  function drawStationView(ctx) {
    const st = game.station;
    const L = SL();
    const { FW, FH } = view;
    drawKitchen(ctx, FW, FH, L);
    const hide = drag && drag.type === 'thing' ? (typeof drag.what === 'string' ? drag.what : null) : null;
    const held = drag && drag.type === 'thing' && typeof drag.what === 'object' ? drag.what.piece.id : hide;
    drawStationScene(ctx, st, L, time, { hide, held });
    // bins
    const h = hintNow();
    const flying = new Set(flyers.map((f) => f.bin));
    for (const b of L.bins) {
      const tool = RUB_TOOLS.includes(b.id);
      const glow = h && ((h.do === 'add' && h.ing === b.id) || (h.do === 'rub' && h.tool === b.id));
      const empty = (drag && drag.type !== 'thing' && drag.bin === b.id && drag.type !== 'hold') || flying.has(b.id);
      drawBinBowl(ctx, b, time, { glow, wrongAt: binWrong[b.id], tool, empty });
    }
    // the order card (or the gator, hungry for whatever you make)
    if (st.free) drawGatorCard(ctx, L.card, drag && drag.type === 'thing');
    else drawOrderCard(ctx, L.card, st.order, time, cardWrongAt);
    drawBin(ctx, L.trash, 0);
    // particles and flyers
    drawFx(ctx);
    for (const f of flyers) {
      const k = Math.min(1, f.t / f.dur);
      const e = f.back ? 1 - (1 - k) * (1 - k) : k * k;
      const x = f.x0 + (f.x1 - f.x0) * e;
      const y = f.y0 + (f.y1 - f.y0) * e - (f.back ? Math.sin(k * Math.PI) * 50 : 0);
      const r = f.r * (f.back ? 1 : 1 - k * 0.6);
      drawIng(ctx, f.ing, x, y, r);
    }
    // the carried thing
    if (drag && drag.type === 'ing') drawIng(ctx, drag.id, drag.x, drag.y - LIFT, drag.r * 1.1);
    if (drag && drag.type === 'tool') {
      ctx.save();
      ctx.translate(drag.x, drag.y - LIFT);
      ctx.rotate(Math.sin(time * 20) * 0.3 + 2.6);
      drawIng(ctx, drag.id, 0, 0, drag.r * 1.1);
      ctx.restore();
    }
    if (drag && drag.type === 'thing') drawCarried(ctx, st, L, drag.what, drag.x, drag.y - LIFT, time);
    if (h) drawStationHint(ctx, st, L, h);
  }

  function drawGatorCard(ctx, card, wanting) {
    ctx.save();
    roundRect(ctx, card.x, card.y, card.w, card.h, 20);
    ctx.fillStyle = wanting ? '#fff6a8' : '#e6fff0';
    ctx.fill();
    ctx.lineWidth = wanting ? 6 : 4;
    ctx.strokeStyle = wanting ? '#ff7a1a' : INK;
    ctx.stroke();
    ctx.beginPath();
    roundRect(ctx, card.x, card.y, card.w, card.h, 20);
    ctx.clip();
    drawGatorChef(ctx, card.x + card.w * 0.42, card.y + card.h + 18, card.w / 300, wanting ? { kind: 'yum', power: 1 } : null, time, time);
    ctx.restore();
    if (feedable(game.station) && !wanting) {
      drawFinger(ctx, card.x + card.w * 0.6, card.y + card.h * 0.7 + Math.abs(Math.sin(time * 3)) * 6, 0.9);
    }
  }

  function thingSpot(st, L) {
    if (st.kind === 'smoothie') return st.phase === 'top' || st.phase === 'done' ? { what: 'cup', x: L.cup.x, y: L.cup.bottom - L.cup.h * 0.5 } : { what: 'jar', x: L.blender.x, y: L.blender.jar.y + L.blender.jar.h * 0.5 };
    if (st.kind === 'sandwich') return st.phase === 'build' ? { what: 'sandwich', x: L.board.x, y: L.board.bottom - 50 } : { what: 'pressed', x: L.press.x, y: L.press.y + L.press.h * 0.6 };
    if (st.kind === 'taco') return { what: 'taco', x: L.taco.x, y: L.taco.bottom - L.taco.w * 0.4 };
    if (st.kind === 'icecream') return { what: 'cone', x: L.cone.x, y: L.cone.tip - L.cone.s };
    if (st.kind === 'fried') return { what: 'boat', x: L.boat.x, y: L.boat.bottom - L.boat.w * 0.2 };
    if (st.kind === 'pizza') return st.phase === 'bake' ? { what: 'ovenpizza', x: L.oven.x, y: L.oven.y + L.oven.h * 0.7 } : { what: 'pizza', x: L.pizza.x, y: L.pizza.y };
    return null;
  }

  function drawStationHint(ctx, st, L, h) {
    const bob = Math.abs(Math.sin(time * 4)) * 10;
    if (h.do === 'hold' || h.do === 'release') {
      const p = st.kind === 'smoothie' ? { x: L.button.x, y: L.button.y } : { x: L.press.x + L.press.w * 0.2, y: L.press.y + L.press.h * 0.4 };
      if (h.do === 'hold') drawFinger(ctx, p.x, p.y + bob, 1.3);
    } else if (h.do === 'move') {
      const from = thingSpot(st, L);
      const to = h.to === 'cup' ? { x: L.cup.x, y: L.cup.bottom - L.cup.h } : h.to === 'press' ? { x: L.press.x, y: L.press.y + L.press.h * 0.5 } : { x: L.oven.x, y: L.oven.y + L.oven.h * 0.6 };
      const k = (time * 0.6) % 1;
      drawFinger(ctx, from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k, 1.3);
    } else if (h.do === 'pull') {
      let from;
      if (h.id === 'oven') from = { x: L.oven.x, y: L.oven.y + L.oven.h * 0.7 };
      else {
        const i = st.pieces.filter((p) => !p.out).findIndex((p) => p.id === h.id);
        from = L.slots[Math.max(0, i) % 4];
      }
      const to = st.kind === 'fried' ? { x: L.boat.x, y: L.boat.bottom - 40 } : { x: L.pizza.x, y: L.pizza.y };
      const k = (time * 0.6) % 1;
      drawFinger(ctx, from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k, 1.3);
    } else if (h.do === 'add' || h.do === 'rub') {
      const b = L.bins.find((q) => q.id === (h.ing || h.tool));
      if (!b) return;
      const f = stationFocus(st, L);
      const k = (time * 0.6) % 1;
      if (h.do === 'rub' && k > 0.5) drawFinger(ctx, f.x + Math.sin(time * 12) * 30, f.y, 1.3);
      else drawFinger(ctx, b.x + (f.x - b.x) * k, b.y + (f.y - b.y) * k, 1.3);
    }
  }

  function drawFx(ctx) {
    for (const p of fx) {
      const k = p.life / p.max;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.5));
      if (p.kind === 'puff') {
        ctx.fillStyle = p.col;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + (1 - k) * p.grow, 0, TAU);
        ctx.fill();
      } else if (p.kind === 'star') {
        ctx.fillStyle = p.col;
        ctx.translate(p.x, p.y);
        ctx.rotate(time * 4);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU;
          const rr = i % 2 ? p.r * 0.4 : p.r;
          ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.fill();
      } else {
        ctx.fillStyle = p.col;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawHud(ctx) {
    const { w } = size;
    const hh = view.hudH;
    const g = ctx.createLinearGradient(0, 0, 0, hh);
    g.addColorStop(0, '#2b9fd8');
    g.addColorStop(1, '#1f7ab8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, hh);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(0, hh - 4, w, 4);
    if (screen === 'play' && game) {
      // a face per customer: grey to come, a bright dot when served, a dash when they left
      const n = game.customers.length;
      const left = buttons[0].x + buttons[0].w + 12;
      const start = left + hh * 0.75;
      const end = w - Math.max(110, w * 0.2);
      const r = Math.min(hh * 0.2, (end - start) / (n * 2.6));
      game.customers.forEach((c, i) => {
        const x = (start + end) / 2 + (i - (n - 1) / 2) * r * 2.6;
        const y = hh / 2;
        const done = c.state === 'eat' || ((c.state === 'leave' || c.state === 'gone') && c.filled.every(Boolean));
        const gone = (c.state === 'leave' || c.state === 'gone' || c.state === 'shrug') && !c.filled.every(Boolean);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fillStyle = done ? '#ffe14d' : gone ? 'rgba(255,255,255,0.25)' : c.state === 'wait' || c.state === 'walk' ? '#ffffff' : 'rgba(255,255,255,0.45)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = INK;
        ctx.stroke();
        if (done) {
          ctx.strokeStyle = INK;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y + r * 0.1, r * 0.5, 0.2, Math.PI - 0.2);
          ctx.stroke();
        }
      });
      outlined(ctx, String(dayIndex + 1), left + hh * 0.3, hh / 2, hh * 0.42, C.sun);
    }
    shownCoins += ((screen === 'play' && game ? progress.coins + game.coins - (recorded ? game.coins : 0) : progress.coins) - shownCoins) * 0.12;
    drawTotals(ctx, w - 10, (hh - Math.max(12, Math.min(18, w * 0.035)) * 2.6) / 2, false);
    for (const b of buttons) if (b.icon) drawIconButton(ctx, b);
  }

  function drawCoinsFly(ctx) {
    const target = { x: size.w - 40, y: view.hudH / 2 };
    for (const c of coinsFly) {
      if (c.t < 0) continue;
      const k = Math.min(1, c.t / c.dur);
      const e = k * k;
      const x = c.x0 + (target.x - c.x0) * e;
      const y = c.y0 + (target.y - c.y0) * e - Math.sin(k * Math.PI) * 60;
      drawCoin(ctx, x, y, 13, time * 8 + c.x0);
    }
  }

  function drawConfetti(ctx, t) {
    const { w, h } = size;
    const colours = [C.pink, C.sun, '#9ee8ff', C.white, C.orange, '#3fe07a'];
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
    const k = Math.min(1, t / 0.6);
    ctx.fillStyle = `rgba(34,17,58,${0.45 * k})`;
    ctx.fillRect(0, 0, w, h);
    drawConfetti(ctx, t);
    const tk = Math.min(w / 560, h / 1250) * Math.min(1, t * 2);
    drawTruck(ctx, w / 2, h * 0.6, tk, progress, time);
    const px = Math.min(h * 0.08, w / 6);
    const pop = 1 + Math.max(0, 0.9 - t) * 1.2 + Math.sin(time * 6) * 0.04;
    const ty = view.hudH + px * 1.0;
    outlined(ctx, game.stars === 3 ? 'WOW!' : 'Hooray!', w / 2, ty, px * pop, C.sun, w * 0.9);
    const r = Math.min(w * 0.1, h * 0.055);
    const starY = ty + px * 0.85 + r * 1.3;
    for (let i = 0; i < 3; i++) {
      const at = 0.8 + i * 0.25;
      const sk = t < at ? 0 : Math.min(1, (t - at) / 0.15);
      const grow = sk * (1 + Math.max(0, 0.3 - (t - at)) * 0.8);
      if (grow <= 0) continue;
      drawStar(ctx, w / 2 + (i - 1) * r * 2.4, starY - (i === 1 ? r * 0.3 : 0), r * grow, i < game.stars);
    }
    // coins earned
    const cy = h * 0.645;
    const n = Math.min(game.coins, Math.floor(Math.max(0, t - 1.4) * 12));
    const cr = Math.min(18, w * 0.04);
    ctx.font = font(cr * 2.2);
    const label = `+${n}`;
    const tw = ctx.measureText(label).width;
    drawCoin(ctx, w / 2 - tw / 2 - cr * 0.6, cy, cr * 1.2, time * 3);
    outlined(ctx, label, w / 2 + cr * 0.8, cy, cr * 2.2, C.sun);
  }

  function drawPlay(ctx) {
    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.s, view.s);
    if (game.station) drawStationView(ctx);
    else {
      drawWindowView(ctx);
      drawFx(ctx);
    }
    ctx.restore();
    drawHud(ctx);
    drawCoinsFly(ctx);
    if (game.mode === 'day' && game.status === 'done') drawDone(ctx);
    for (const b of buttons) if (!b.icon) drawButton(ctx, b, b.fill);
  }

  // A sheet of every ingredient and dish, for checking the food art (?debug only).
  function drawGallery(ctx) {
    const { w, h } = size;
    ctx.fillStyle = '#fff6e6';
    ctx.fillRect(0, 0, w, h);
    const ids = ['mango', 'strawberry', 'banana', 'pineapple', 'straw', 'umbrella', 'bread', 'ham', 'pork', 'cheese', 'pickles', 'tortilla', 'beef', 'chicken',
      'lettuce', 'tomato', 'avocado', 'hotsauce', 'vanilla', 'chocolate', 'berry', 'mint', 'sprinkles', 'cherry', 'churro', 'tostone', 'empanada', 'sugar',
      'salt', 'sauce', 'mozzarella', 'pepperoni', 'mushroom', 'pepper', 'olive'];
    const cols = 7;
    const cell = w / cols;
    const r = cell * 0.4;
    ids.forEach((id, i) => drawIng(ctx, id, (i % cols + 0.5) * cell, 80 + Math.floor(i / cols) * cell + cell / 2, r));
    const y0 = 80 + Math.ceil(ids.length / cols) * cell + 10;
    const dishes = [SAMPLE.smoothie, SAMPLE.icecream, SAMPLE.taco, SAMPLE.sandwich, SAMPLE.fried, SAMPLE.pizza,
      { kind: 'sandwich', layers: LAYERS_NO, cook: 'over' }, { kind: 'fried', pieces: ['tostone', 'tostone'], shake: 'salt', cooks: ['good', 'over'] },
      { kind: 'fried', pieces: ['empanada', 'empanada', 'empanada'], shake: null }, { kind: 'pizza', toppings: ['olive', 'pepper', 'pepper', 'pineapple'], cheese: true, cook: 'over' },
      { kind: 'icecream', scoops: ['vanilla', 'chocolate', 'mint', 'berry', 'vanilla', 'chocolate'], sprinkles: true, cherry: true }, { kind: 'taco', fillings: ['chicken', 'avocado', 'tomato', 'hotsauce'] }];
    const dc = 4;
    const ds = Math.min(w / dc, (h - y0) / 3);
    dishes.forEach((d, i) => {
      const x = (i % dc + 0.5) * (w / dc);
      const y = y0 + Math.floor(i / dc) * ds + ds / 2;
      drawDish(ctx, d, x, y - ds * 0.08, ds * 0.8, time);
      drawStrip(ctx, recipeStrip(d), x, y + ds * 0.4, ds * 0.06, w / dc - 6);
    });
    for (const b of buttons) drawIconButton(ctx, b);
  }
  const LAYERS_NO = ['bread', 'ham', 'pork', 'cheese'];

  // ---------- input helpers ----------

  function nearestBin(L, f) {
    return L.bins.find((b) => inCircle(b, f.x, f.y, 8));
  }

  // Where an ingredient must be dropped at this station.
  function targetFor(st, L, id) {
    if (st.kind === 'smoothie') return id === 'straw' || id === 'umbrella' ? L.cupBox : L.blender.jar;
    if (st.kind === 'fried' && ['churro', 'tostone', 'empanada'].includes(id)) return { x: L.fryer.x - L.fryer.w / 2, y: L.fryer.y, w: L.fryer.w, h: L.fryer.h };
    return L.target;
  }

  function flyBack(id, from, bin) {
    flyers.push({ ing: id, bin: bin.id, x0: from.x, y0: from.y, x1: bin.x, y1: bin.y, r: bin.r * 0.74, t: 0, dur: 0.4, back: true });
  }

  function onStationPickUp(f) {
    const st = game.station;
    const L = SL();
    // the bins
    const b = nearestBin(L, f);
    if (b) {
      if (RUB_TOOLS.includes(b.id)) {
        if (!grabTool(st, b.id)) {
          if (!binWrong[b.id] || time - binWrong[b.id] > 0.5) binWrong[b.id] = time;
          play('boing');
          return false;
        }
        drag = { type: 'tool', id: b.id, bin: b.id, x: f.x, y: f.y, r: b.r * 0.74, last: { x: f.x, y: f.y } };
        return true;
      }
      drag = { type: 'ing', id: b.id, bin: b.id, x: f.x, y: f.y, r: b.r * 0.74, x0: f.x, y0: f.y };
      return true;
    }
    // hold the blend button or the press
    if (st.kind === 'smoothie' && inCircle(L.button, f.x, f.y, 18)) {
      if (setHold(st, true)) {
        drag = { type: 'hold' };
        setLoop('whirr');
        return true;
      }
      return false;
    }
    if (st.kind === 'sandwich' && st.phase === 'press' && inRect({ x: L.press.x - L.press.w / 2 - 20, y: L.press.y - 40, w: L.press.w + 80, h: L.press.h + 60 }, f.x, f.y)) {
      if (setHold(st, true)) {
        drag = { type: 'hold' };
        setLoop('sizzle');
        return true;
      }
    }
    // a fried piece out of the oil
    if (st.kind === 'fried' && st.phase !== 'done') {
      const inOil = st.pieces.filter((p) => !p.out);
      let best = null;
      inOil.forEach((p, i) => {
        const s = L.slots[i % 4];
        const d = Math.hypot(f.x - s.x, f.y - s.y);
        if (d < L.oil.h * 0.6 && (!best || d < best.d)) best = { p, d };
      });
      if (best) {
        drag = { type: 'thing', what: { piece: best.p }, x: f.x, y: f.y };
        return true;
      }
    }
    // the food itself
    const spot = thingSpot(st, L);
    if (!spot) return false;
    const can = canCarry(st, spot.what);
    if (!can) return false;
    const reach = spot.what === 'pressed' || spot.what === 'ovenpizza' ? 90 : 110;
    if (Math.hypot(f.x - spot.x, f.y - spot.y) < reach || (spot.what === 'jar' && inRect(L.blender.jar, f.x, f.y, 20))) {
      drag = { type: 'thing', what: spot.what, x: f.x, y: f.y };
      return true;
    }
    return false;
  }

  function canCarry(st, what) {
    if (st.free) {
      if (what === 'jar') return st.phase !== 'blend' || !st.holding;
      if (what === 'ovenpizza') return true;
      if (what === 'pressed') return st.phase === 'done';
      return feedable(st) || (what === 'pizza' && ready(st));
    }
    if (what === 'jar') return st.phase === 'pour';
    if (what === 'sandwich') return ready(st);
    if (what === 'pizza') return ready(st);
    if (what === 'ovenpizza') return st.phase === 'bake';
    return false;
  }

  function overGator(L, x, y) {
    return game.station.free && inRect(L.card, x, y, SNAP);
  }

  function onStationDrop(f) {
    const st = game.station;
    const L = SL();
    const d = drag;
    drag = null;
    const fx2 = f.x;
    const fy2 = f.y - LIFT;
    if (d.type === 'hold') {
      setHold(st, false);
      setLoop(null);
      return;
    }
    if (d.type === 'tool') {
      const b = L.bins.find((q) => q.id === d.id);
      flyBack(d.id, { x: fx2, y: fy2 }, b);
      return;
    }
    if (d.type === 'ing') {
      const b = L.bins.find((q) => q.id === d.id);
      // a tap on an ice cream tub scoops straight onto the cone
      const tapped = Math.hypot(f.x - d.x0, f.y - d.y0) < 14;
      const tub = st.kind === 'icecream' && ['vanilla', 'chocolate', 'berry', 'mint'].includes(d.id);
      if (tapped && !tub) return;
      const target = targetFor(st, L, d.id);
      if ((tapped && tub) || inRect(target, fx2, fy2, SNAP)) {
        const r = add(st, d.id);
        if (r === 'ok') {
          const to = tapped ? stationFocus(st, L) : { x: fx2, y: fy2 };
          flyers.push({ ing: d.id, bin: null, x0: tapped ? b.x : fx2, y0: tapped ? b.y : fy2, x1: to.x, y1: to.y + 20, r: b.r * 0.74, t: 0, dur: tapped ? 0.3 : 0.18, back: false });
          return;
        }
        if (r === 'full' || r === 'no') play('boing');
      }
      flyBack(d.id, { x: fx2, y: fy2 }, b);
      return;
    }
    if (d.type === 'thing') {
      const w = d.what;
      if (typeof w === 'object') {
        // a fried piece: anywhere out of the oil lifts it out (if it's ready)
        if (!inRect(L.oil, fx2, fy2, 10)) {
          const r = pullOut(st, w.piece.id);
          if (r === 'ok') {
            burst(L.boat.x, L.boat.bottom - 40, 10, ['#ffe14d', '#ffffff'], { speed: 160, life: 0.5, kind: 'dot', r: 4 });
          }
        }
        return;
      }
      if (overGator(L, fx2, fy2) && w !== 'ovenpizza') {
        feed(game);
        return;
      }
      if (w === 'jar' && inRect(L.cupBox, fx2, fy2, SNAP)) moveTo(st, 'cup');
      else if (w === 'sandwich' && inRect({ x: L.press.x - L.press.w / 2, y: L.press.y, w: L.press.w, h: L.press.h }, fx2, fy2, SNAP)) {
        if (moveTo(st, 'press')) play('pop');
      } else if (w === 'pizza' && inRect({ x: L.oven.x - L.oven.w / 2, y: L.oven.y, w: L.oven.w, h: L.oven.h }, fx2, fy2, SNAP)) {
        if (moveTo(st, 'oven')) play('pop');
      } else if (w === 'ovenpizza' && !inRect({ x: L.oven.x - L.oven.w / 2, y: L.oven.y, w: L.oven.w, h: L.oven.h }, fx2, fy2, 0)) {
        pullOut(st, 'oven');
      }
    }
  }

  function onStationDrag(f) {
    const st = game.station;
    const L = SL();
    if (!drag) return;
    if (drag.type === 'tool') {
      const fx2 = f.x;
      const fy2 = f.y - LIFT;
      const dist = Math.hypot(fx2 - drag.last.x, fy2 - drag.last.y);
      drag.last = { x: fx2, y: fy2 };
      const area = st.kind === 'icecream' ? L.target : st.kind === 'fried' ? L.target : L.target;
      if (inRect(area, fx2, fy2, 10)) {
        const u = (fx2 - area.x) / area.w;
        const v = (fy2 - area.y) / area.h;
        rub(st, drag.id, dist, u, v);
        // a sprinkle of whatever it is
        if (Math.random() < 0.5) {
          const cols = drag.id === 'sauce' ? ['#e5352b'] : drag.id === 'mozzarella' ? ['#fff2c4', '#ffe38a'] : drag.id === 'sprinkles' ? ['#ff4f9a', '#3ad1e8', '#ffe14d', '#7be04a'] : drag.id === 'salt' ? ['#ffffff'] : ['#ffffff', '#c27a3a'];
          fx.push({ kind: 'dot', x: fx2, y: fy2 + 14, vx: (Math.random() - 0.5) * 60, vy: 120, life: 0.35, max: 0.35, col: cols[Math.floor(Math.random() * cols.length)], r: 3 });
        }
      }
    }
    drag.x = f.x;
    drag.y = f.y;
  }

  function onWindowPickUp(f) {
    if (game.mode !== 'day') return false;
    const L = WL();
    for (let i = 0; i < game.counter.length; i++) {
      const slot = L.counter[i % L.counter.length];
      if (Math.hypot(f.x - slot.x, f.y - slot.y) < slot.s * 0.6) {
        drag = { type: 'counter', id: game.counter[i].id, x: f.x, y: f.y };
        return true;
      }
    }
    return false;
  }

  function onWindowDrop(f) {
    const d = drag;
    drag = null;
    if (!d || d.type !== 'counter') return;
    const L = WL();
    const y = f.y - LIFT;
    if (inCircle(L.bin, f.x, y, SNAP)) {
      binDish(game, d.id);
      play('puff');
      return;
    }
    for (const c of atWindow(game)) {
      if (c.state !== 'wait') continue;
      const sp = L.spots[c.spot] || L.spots[0];
      const box = { x: sp.x - 110 * sp.k, y: sp.y - 270 * sp.k, w: 220 * sp.k, h: 270 * sp.k };
      if (inRect(box, f.x, y, SNAP * 0.6) || inRect(sp.bubble, f.x, y, 0)) {
        serve(game, d.id, c.id);
        return;
      }
    }
  }

  function onWindowTap(f) {
    const L = WL();
    if (game.mode === 'free') {
      if (game.gator.reaction && game.gator.t < 0.6) return;
      const a = L.appliances.find((q) => hit(q, f.x, f.y));
      if (a) {
        openStation(game, a.kind);
        play('pop');
      }
      return;
    }
    for (const c of atWindow(game)) {
      if (c.state !== 'wait') continue;
      const sp = L.spots[c.spot] || L.spots[0];
      const cells = bubbleCells(sp.bubble, c.items.length);
      const i = cells.findIndex((cell) => hit(cell, f.x, f.y));
      if (i >= 0 && !c.filled[i]) {
        if (tapOrder(game, c.id, i)) play('pop');
        return;
      }
    }
    // a tap on the kitchen row opens the dish someone is waiting for
    const a = L.appliances.find((q) => hit(q, f.x, f.y));
    if (a) {
      for (const c of atWindow(game)) {
        if (c.state !== 'wait') continue;
        const i = c.items.findIndex((o, k) => o.kind === a.kind && !c.filled[k] && !game.counter.some((q) => q.cust === c.id && q.item === k));
        if (i >= 0 && tapOrder(game, c.id, i)) {
          play('pop');
          return;
        }
      }
    }
  }

  // ---------- debug hook ----------

  if (debug) {
    window.__chef = {
      state: () => game,
      screen: () => screen,
      buttons: () => buttons.map((b) => ({ ...b })),
      view: () => ({ ...view }),
      progress: () => JSON.parse(JSON.stringify(progress)),
      toScreen,
      toField,
      day: (n) => startDay(n - 1),
      free: () => startFree(),
      goto: (name) => goto(name),
      coins(n) {
        progress.coins = n;
        saveProgress(progress);
      },
      autoplay(on = true) {
        autoplay = on;
      },
      hint: () => (game && game.station ? stationHint(game.station) : null),
      advance(seconds) {
        if (game) for (let t = 0; t < seconds; t += 1 / 30) step(game, 1 / 30);
      },
      // where things are on screen, for driving real touches
      where(name) {
        if (!game) {
          const b = buttons.find((q) => q.id === name || q.item === name || (q.id === 'day' && `day${q.index + 1}` === name));
          return b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : null;
        }
        const [kind, a, b2] = String(name).split(':');
        if (kind === 'button') {
          const b = buttons.find((q) => q.id === a);
          return b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : null;
        }
        if (game.station) {
          const L = SL();
          const st = game.station;
          let p = null;
          if (kind === 'bin') p = L.bins.find((q) => q.id === a);
          else if (kind === 'target') p = { x: L.target.x + L.target.w / 2, y: L.target.y + L.target.h / 2 };
          else if (kind === 'button' || kind === 'blend') p = L.button;
          else if (kind === 'jar') p = { x: L.blender.x, y: L.blender.jar.y + L.blender.jar.h * 0.5 };
          else if (kind === 'cup') p = { x: L.cup.x, y: L.cup.bottom - L.cup.h * 0.5 };
          else if (kind === 'press') p = { x: L.press.x, y: L.press.y + L.press.h * 0.5 };
          else if (kind === 'oven') p = { x: L.oven.x, y: L.oven.y + L.oven.h * 0.6 };
          else if (kind === 'fryer') p = { x: L.fryer.x, y: L.fryer.y + L.fryer.h * 0.5 };
          else if (kind === 'boat') p = { x: L.boat.x, y: L.boat.bottom - 40 };
          else if (kind === 'slot') {
            const i = st.pieces.filter((q) => !q.out).findIndex((q) => q.id === Number(a));
            p = i >= 0 ? L.slots[i] : null;
          } else if (kind === 'thing') p = thingSpot(st, L);
          else if (kind === 'card') p = { x: L.card.x + L.card.w / 2, y: L.card.y + L.card.h / 2 };
          else if (kind === 'trash') p = L.trash;
          if (!p) return null;
          // drops are aimed so the carried thing (drawn LIFT above) lands on it
          return toScreen(p.x, p.y + (b2 === 'drop' ? LIFT : 0));
        }
        const L = WL();
        if (kind === 'bubble') {
          const c = game.customers.find((q) => q.id === Number(a));
          const sp = L.spots[c.spot] || L.spots[0];
          const cell = bubbleCells(sp.bubble, c.items.length)[Number(b2) || 0];
          return toScreen(cell.x + cell.w / 2, cell.y + cell.h / 2);
        }
        if (kind === 'counter') {
          const s2 = L.counter[Number(a) || 0];
          return toScreen(s2.x, s2.y);
        }
        if (kind === 'customer') {
          const c = game.customers.find((q) => q.id === Number(a));
          const sp = L.spots[c.spot] || L.spots[0];
          return toScreen(sp.x, sp.y - 130 * sp.k + LIFT);
        }
        if (kind === 'appliance') {
          const ap = L.appliances.find((q) => q.kind === a);
          return toScreen(ap.x + ap.w / 2, ap.y + ap.h / 2);
        }
        return null;
      },
    };
  }

  // ---------- the game object ----------

  const api = {
    resize(w, h) {
      size = { w, h };
      layoutView();
      layoutButtons();
    },

    update(dt) {
      time += dt;
      idle += dt;
      for (const p of fx) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.kind === 'dot' || p.kind === 'star') p.vy += 500 * dt;
      }
      fx = fx.filter((p) => p.life > 0);
      for (const f of flyers) f.t += dt;
      flyers = flyers.filter((f) => f.t < f.dur);
      for (const c of coinsFly) {
        const before = c.t;
        c.t += dt;
        if (before < c.dur && c.t >= c.dur) play('coin');
      }
      coinsFly = coinsFly.filter((c) => c.t < c.dur);
      if ((screen !== 'play' && screen !== 'free') || !game) return;
      if (autoplay && game.station && !drag) {
        driveStation(game.station, { mem: autoMem });
      } else if (autoplay && !game.station && game.mode === 'day' && game.status === 'open' && !drag) {
        const h = windowHint();
        if (h && h.kind === 'serve') serve(game, h.dish, h.cust);
        else if (h && h.kind === 'bubble' && time % 1 < dt * 2) tapOrder(game, h.cust, h.item);
      }
      const beforeView = !!game.station;
      const before = `${game.status}|${game.statusT > WIN_BUTTON_DELAY}|${beforeView}`;
      step(game, dt);
      // steam and sizzle while things cook
      const st = game.station;
      if (st) {
        const L = SL();
        if (st.kind === 'sandwich' && st.holding && Math.random() < 0.25) puff(L.press.x + (Math.random() - 0.5) * L.press.w * 0.7, L.press.y + L.press.h * 0.3, 1, st.meter > 0.86 ? '#6a6070' : 'rgba(255,255,255,0.8)', 14);
        if (st.kind === 'smoothie' && st.holding && Math.random() < 0.3) burst(L.blender.x, L.blender.jar.y + 10, 1, ['#ffffff'], { speed: 80, life: 0.4, r: 4 });
        if (st.kind === 'fried' && st.pieces.some((p) => !p.out) && Math.random() < 0.1) puff(L.oil.x + Math.random() * L.oil.w, L.oil.y, 1, '#ffffff', 18);
        const sizzling = st.kind === 'fried' && st.pieces.some((p) => !p.out);
        if (!drag || drag.type !== 'hold') setLoop(sizzling ? 'sizzle' : null);
      } else if (!drag || drag.type !== 'hold') setLoop(null);
      if (game.mode === 'day') {
        gameEvents();
        stationEvents();
        if (game.status === 'done' && !recorded) record();
      } else {
        gameEvents();
        stationEvents();
      }
      const nowView = !!game.station;
      if (nowView !== beforeView) {
        drag = null;
        fx = [];
        flyers = [];
        idle = 0;
      }
      const after = `${game.status}|${game.statusT > WIN_BUTTON_DELAY}|${nowView}`;
      if (before !== after || lastView !== nowView) {
        lastView = nowView;
        layoutButtons();
      }
    },

    draw(ctx) {
      if (screen === 'menu') drawMenu(ctx);
      else if (screen === 'picker') drawPicker(ctx);
      else if (screen === 'shop') drawShop(ctx);
      else if (screen === 'gallery') drawGallery(ctx);
      else if (game) drawPlay(ctx);
    },

    onPickUp(x, y) {
      unlockAudio();
      idle = 0;
      if ((screen !== 'play' && screen !== 'free') || !game || buttons.some((b) => hit(b, x, y))) return false;
      if (game.mode === 'day' && game.status !== 'open') return false;
      const f = toField(x, y);
      if (game.station) return onStationPickUp(f);
      return onWindowPickUp(f);
    },
    onDrag(x, y) {
      if (!drag || !game) return;
      const f = toField(x, y);
      if (game.station) onStationDrag(f);
      else {
        drag.x = f.x;
        drag.y = f.y;
      }
    },
    onDrop(x, y) {
      if (!drag || !game) {
        drag = null;
        return;
      }
      const f = toField(x, y);
      if (game.station) {
        drag.x = f.x;
        drag.y = f.y;
        onStationDrop(f);
      } else onWindowDrop(f);
      idle = 0;
    },
    onTap(x, y) {
      unlockAudio();
      idle = 0;
      const b = buttons.find((r) => hit(r, x, y));
      if (b) {
        if (b.id === 'exit') host.exit();
        else if (b.id === 'play') startDay(firstOpen());
        else if (b.id === 'free') startFree();
        else if (b.id === 'picker') goto('picker');
        else if (b.id === 'shop') goto('shop');
        else if (b.id === 'menu') goto('menu');
        else if (b.id === 'back') {
          if (game && game.station) {
            if (game.mode === 'day') closeStation(game);
            else game.station = null;
            layoutButtons();
          }
        } else if (b.id === 'day') {
          if (unlocked(progress, b.index)) startDay(b.index);
          else play('boing');
        } else if (b.id === 'again') startDay(dayIndex);
        else if (b.id === 'next') {
          if (dayIndex >= DAYS.length - 1) goto('picker');
          else startDay(dayIndex + 1);
        } else if (b.id === 'item') {
          const r = b.item === 'awning-pink' ? (useAwning(progress, b.item), 'ok') : progress.owned.includes(b.item) ? (useAwning(progress, b.item) ? 'ok' : 'owned') : buy(progress, b.item);
          shopPop[b.item] = { t: time, kind: r === 'poor' ? 'poor' : 'ok' };
          if (r === 'ok') play(progress.owned.includes(b.item) && !AWNINGS.includes(b.item) ? 'sparkle' : 'coin');
          else if (r === 'poor') play('boing');
          saveProgress(progress);
        }
        return;
      }
      if ((screen !== 'play' && screen !== 'free') || !game) return;
      const f = toField(x, y);
      if (game.station) {
        const L = SL();
        if (inCircle(L.trash, f.x, f.y, 10)) restart(game.station);
        return;
      }
      if (game.mode === 'day' && game.status !== 'open') return;
      onWindowTap(f);
    },
  };

  const forced = Number(params.get('level'));
  if (Number.isInteger(forced) && forced >= 1 && forced <= DAYS.length) startDay(forced - 1);
  if (debug && params.has('gallery')) goto('gallery');
  shownCoins = progress.coins;
  return api;
}
