// Big Catch as a launcher game: the shop (menu), the fish album, a fishing trip with its haul,
// the treasure celebration, drag-to-steer input and saved progress. Rules live in sim.js
// (tuning in tuning.js), bots in bot.js and drawing in draw.js / creatures.js.
import {
  ALBUM, SPECIES_BY_ID, UPGRADES, LINE, BUCKET, LURE,
  createTrip, step, steer, haulProgress, finishHaul, newProgress, sanitize, priceOf, canBuy, maxed, buy,
  albumCount, tripOptions, settle, shallowestOf, zoneAt,
} from './sim.js';
import { carefulTarget, shopCheapest } from './bot.js';
import {
  C, font, roundRect, outlined, drawButton, drawIconButton, drawSandDollar, drawStar, drawFinger,
  drawUpgradeIcon, drawDepthMeter, createRenderer, drawTile,
} from './draw.js';
import { drawCreature, drawChest } from './creatures.js';

const SAVE_KEY = 'big-catch-progress';
const DONE_DELAY = 0.6; // seconds after the haul ends before the buttons respond
const WIN_DELAY = 1.4;
const HINT_TRIPS = 3; // the slide hint shows on this many first trips
const IDLE_HINT = 5; // and again after this many seconds without touching
const LEVELS = { line: LINE, bucket: BUCKET, lure: LURE };

export function loadProgress() {
  try {
    return sanitize(JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'));
  } catch {
    return newProgress();
  }
}

function saveProgress(p) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(p));
  } catch {
    // not kept if storage is unavailable
  }
}

export const bigCatch = {
  id: 'big-catch',
  title: 'Big Catch',
  drawTile,
  create,
};

const hit = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

function create(host) {
  const params = new URLSearchParams(location.search);
  const debug = params.has('debug');
  const fixedSeed = Number(params.get('seed'));
  const renderer = createRenderer();
  let size = { w: 1, h: 1 };
  let progress = loadProgress();
  let screen = 'menu'; // 'menu' | 'album' | 'trip' | 'win'
  let trip = null;
  let result = null; // settle() result for the current trip
  let buttons = [];
  let time = 0;
  let lastDt = 0;
  let lastTouch = -99;
  let autopilot = false;
  let autoWait = 0;
  let buyFx = null; // { kind, t }
  let coinShown = progress.coins; // the menu's coin counter rolls toward the real number
  let winT = 0;

  const pad = () => Math.max(10, size.w * 0.025);
  const iconSize = () => Math.max(48, Math.min(68, size.w * 0.12));

  // ---------- layout ----------

  function layoutButtons() {
    const { w, h } = size;
    const bw = Math.min(w * 0.8, 440);
    const bh = Math.max(64, Math.min(96, h * 0.085));
    const x = (w - bw) / 2;
    const p = pad();
    const icon = iconSize();
    buttons = [];
    if (screen === 'menu') {
      buttons.push({ id: 'exit', icon: 'home', x: p, y: p, w: icon, h: icon });
      const gap = Math.max(12, w * 0.03);
      const cw = Math.min((w - gap * 4) / 3, 230);
      const ch = Math.min(cw * 1.3, h * 0.22);
      const cy = h * 0.45;
      const cx0 = (w - (cw * 3 + gap * 2)) / 2;
      UPGRADES.forEach((kind, i) => buttons.push({ id: 'buy', kind, x: cx0 + i * (cw + gap), y: cy, w: cw, h: ch }));
      const ay = cy + ch + Math.max(18, h * 0.025);
      buttons.push({ id: 'album', label: `${albumCount(progress)} / ${ALBUM.length}`, glyph: 'book', x: x + bw * 0.12, y: ay, w: bw * 0.76, h: bh * 0.85, fill: C.white });
      const gy = Math.max(ay + bh * 0.85 + Math.max(16, h * 0.022), h - bh * 1.25 - Math.max(18, h * 0.035));
      buttons.push({ id: 'go', label: 'Go fishing!', glyph: 'hook', x, y: Math.min(gy, h - bh * 1.15 - 8), w: bw, h: bh * 1.15 });
    } else if (screen === 'album') {
      buttons.push({ id: 'menu', icon: 'back', x: p, y: p, w: icon, h: icon });
    } else if (screen === 'trip') {
      const ih = Math.max(44, Math.min(60, w * 0.1));
      buttons.push({ id: 'menu', icon: 'home', x: p, y: p, w: ih, h: ih });
      if (trip && trip.phase === 'done' && trip.phaseT >= DONE_DELAY && !(result && result.firstChest)) {
        const by = h - bh * 2.6 - Math.max(20, h * 0.04);
        const shopFirst = UPGRADES.some((k) => canBuy(progress, k));
        buttons.push({ id: shopFirst ? 'shop' : 'again', label: shopFirst ? 'Shop' : 'Fish again', glyph: shopFirst ? 'next' : 'hook', x, y: by, w: bw, h: bh * 1.1 });
        buttons.push({ id: shopFirst ? 'again' : 'shop', label: shopFirst ? 'Fish again' : 'Shop', glyph: shopFirst ? 'hook' : 'next', x: x + bw * 0.15, y: by + bh * 1.35, w: bw * 0.7, h: bh * 0.85, fill: C.white });
      }
    } else if (screen === 'win') {
      if (winT >= WIN_DELAY) buttons.push({ id: 'shop', label: 'Yay!', glyph: 'next', x, y: h - bh * 1.6 - Math.max(20, h * 0.04), w: bw, h: bh * 1.1 });
    }
  }

  // ---------- flow ----------

  function startTrip() {
    const seed = Number.isInteger(fixedSeed) && fixedSeed > 0 ? fixedSeed + progress.trips : (Math.random() * 2 ** 31) | 0;
    trip = createTrip(tripOptions(progress, seed));
    result = null;
    screen = 'trip';
    lastTouch = -99;
    autoWait = 0;
    renderer.reset(trip);
    layoutButtons();
  }

  function goto(next) {
    screen = next;
    if (next !== 'trip') trip = null;
    if (next === 'win') winT = 0;
    layoutButtons();
  }

  function record() {
    result = settle(progress, trip);
    progress = result.progress;
    saveProgress(progress);
  }

  function purchase(kind) {
    const next = buy(progress, kind);
    if (!next) {
      buyFx = { kind, t: time, failed: true };
      return false;
    }
    progress = next;
    saveProgress(progress);
    buyFx = { kind, t: time, failed: false };
    layoutButtons();
    return true;
  }

  // ---------- drawing: menu / shop ----------

  function coinPill(ctx, x, y, hh, n, align = 'right') {
    const label = String(n);
    const px = hh * 0.6;
    ctx.font = font(px);
    const tw = ctx.measureText(label).width;
    const pw = tw + hh * 1.5;
    const px0 = align === 'right' ? x - pw : align === 'center' ? x - pw / 2 : x;
    ctx.fillStyle = 'rgba(22,11,51,0.45)';
    roundRect(ctx, px0, y, pw, hh, hh / 2);
    ctx.fill();
    drawSandDollar(ctx, px0 + hh * 0.52, y + hh / 2, hh * 0.38);
    outlined(ctx, label, px0 + hh * 0.98 + tw / 2, y + hh / 2 + 1, px, C.white);
  }

  function drawPips(ctx, cx, cy, n, filled, r) {
    const gap = r * 2.5;
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.arc(cx + (i - (n - 1) / 2) * gap, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = i < filled ? C.sun : 'rgba(22,11,51,0.35)';
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, r * 0.3);
      ctx.strokeStyle = C.ink;
      ctx.stroke();
    }
  }

  function drawCard(ctx, b) {
    const kind = b.kind;
    const max = maxed(progress, kind);
    const price = priceOf(progress, kind);
    const afford = canBuy(progress, kind);
    const fx = buyFx && buyFx.kind === kind ? time - buyFx.t : 9;
    const bounce = fx < 0.4 ? (buyFx.failed ? 0 : Math.sin((fx / 0.4) * Math.PI) * 0.08) : 0;
    const shake = fx < 0.4 && buyFx.failed ? Math.sin(fx * 60) * 5 : 0;
    ctx.save();
    ctx.translate(b.x + b.w / 2 + shake, b.y + b.h / 2);
    ctx.scale(1 + bounce, 1 + bounce);
    ctx.translate(-b.w / 2, -b.h / 2);
    const r = Math.min(22, b.w * 0.15);
    ctx.fillStyle = 'rgba(22,11,51,0.35)';
    roundRect(ctx, 0, 6, b.w, b.h, r);
    ctx.fill();
    ctx.fillStyle = afford ? '#fff6d6' : max ? '#ffe9a8' : '#c9d6e6';
    roundRect(ctx, 0, 0, b.w, b.h, r);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    if (afford) {
      // a bright pulsing rim: you can buy this
      ctx.lineWidth = 4 + Math.sin(time * 5) * 1.5;
      ctx.strokeStyle = C.sun;
      roundRect(ctx, -5, -5, b.w + 10, b.h + 10, r + 5);
      ctx.stroke();
    }
    ctx.globalAlpha = afford || max ? 1 : 0.55;
    const ir = Math.min(b.w * 0.33, b.h * 0.26);
    drawUpgradeIcon(ctx, kind, b.w / 2, b.h * 0.33, ir, afford ? time : 0);
    const n = LEVELS[kind].length - 1;
    const pr = Math.min(b.w / (n * 2.6 + 1), b.h * 0.035);
    drawPips(ctx, b.w / 2, b.h * 0.66, n, progress[kind], pr);
    if (max) {
      drawStar(ctx, b.w * 0.3, b.h * 0.84, b.h * 0.08);
      outlined(ctx, 'MAX', b.w * 0.62, b.h * 0.85, b.h * 0.13, C.sun, b.w * 0.5);
    } else {
      const px = Math.min(b.h * 0.14, b.w * 0.2);
      ctx.font = font(px);
      const label = String(price);
      const tw = ctx.measureText(label).width;
      const dr = px * 0.48;
      const total = dr * 2.4 + tw;
      const x0 = b.w / 2 - total / 2;
      drawSandDollar(ctx, x0 + dr, b.h * 0.85, dr);
      ctx.fillStyle = C.ink;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x0 + dr * 2.4, b.h * 0.855);
    }
    ctx.restore();
    if (fx < 0.8 && !buyFx.failed) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const d = b.w * (0.3 + fx * 0.6);
        drawStar(ctx, b.x + b.w / 2 + Math.cos(a) * d, b.y + b.h * 0.35 + Math.sin(a) * d * 0.7, b.w * 0.06 * (1 - fx));
      }
    }
  }

  function drawMenu(ctx) {
    const { w, h } = size;
    renderer.drawMenuScene(ctx, time, 0.36);
    const px = Math.min(h * 0.075, w / 6.2);
    ctx.save();
    ctx.translate(w / 2, h * 0.11);
    ctx.rotate(-0.04 + Math.sin(time * 1.3) * 0.015);
    outlined(ctx, 'BIG', 0, -px * 0.55, px * 0.85, C.foam);
    outlined(ctx, 'CATCH', 0, px * 0.5, px * 1.15, C.sun);
    ctx.restore();
    coinShown += (progress.coins - coinShown) * Math.min(1, lastDt * 8);
    if (Math.abs(coinShown - progress.coins) < 0.5) coinShown = progress.coins;
    const ih = iconSize();
    coinPill(ctx, w - pad(), pad() + ih * 0.1, ih * 0.8, Math.round(coinShown));
    for (const b of buttons) {
      if (b.id === 'buy') drawCard(ctx, b);
      else if (b.icon) drawIconButton(ctx, b);
      else drawButton(ctx, b, b.fill);
    }
    // a tiny fish on the album button and a chest if found
    const ab = buttons.find((b) => b.id === 'album');
    if (ab && progress.chest) drawChest(ctx, ab.x + ab.w - ab.h * 0.5, ab.y + ab.h * 0.55, ab.h * 0.07, 1, time);
  }

  // ---------- drawing: album ----------

  function drawAlbum(ctx) {
    const { w, h } = size;
    renderer.drawMenuScene(ctx, time, -0.2);
    ctx.fillStyle = 'rgba(10,6,30,0.35)';
    ctx.fillRect(0, 0, w, h);
    const back = buttons[0];
    const titleY = back.y + back.h / 2;
    const tpx = Math.min(h * 0.045, w / 10);
    outlined(ctx, `${albumCount(progress)} / ${ALBUM.length}`, w / 2, titleY, tpx, C.sun, w - (back.w + back.x) * 2 - 10);
    const cols = 4;
    const top = back.y + back.h + Math.max(14, h * 0.02);
    const bottom = h - Math.max(70, h * 0.09);
    const gap = Math.max(8, w * 0.02);
    const cw = Math.min((w - gap * (cols + 1)) / cols, 200);
    const rows = Math.ceil(ALBUM.length / cols);
    const ch = Math.min(cw * 1.1, (bottom - top - gap * (rows - 1)) / rows);
    const x0 = (w - (cw * cols + gap * (cols - 1))) / 2;
    const gridTop = top + Math.max(0, (bottom - top - (rows * ch + (rows - 1) * gap)) * 0.4);
    ALBUM.forEach((id, i) => {
      const sp = SPECIES_BY_ID[id];
      const n = progress.album[id] || 0;
      const x = x0 + (i % cols) * (cw + gap);
      const y = gridTop + Math.floor(i / cols) * (ch + gap);
      const zone = zoneAt(shallowestOf(sp));
      ctx.fillStyle = zone.colour;
      roundRect(ctx, x, y, cw, ch, cw * 0.14);
      ctx.fill();
      ctx.lineWidth = sp.legendary ? 5 : 3;
      ctx.strokeStyle = sp.legendary ? C.sun : n ? C.white : 'rgba(255,255,255,0.35)';
      ctx.stroke();
      const scale = Math.min((cw * 0.4) / (sp.rx * (id === 'swordfish' ? 1.9 : 1.45)), (ch * 0.3) / (sp.ry * 1.3));
      drawCreature(ctx, id, x + cw / 2 + (id === 'swordfish' ? -cw * 0.08 : 0), y + ch * 0.45, scale, 1, n ? time : 0, n ? { phase: i * 0.2, glow: zone.id === 'deep' } : { sil: 'rgba(8,10,40,0.8)' });
      if (n) outlined(ctx, `x${n}`, x + cw * 0.76, y + ch * 0.86, ch * 0.17, C.white, cw * 0.4);
      else outlined(ctx, '?', x + cw / 2, y + ch * 0.45, ch * 0.28, 'rgba(255,255,255,0.75)');
      if (sp.legendary) drawStar(ctx, x + cw * 0.15, y + ch * 0.15, cw * 0.09, n > 0);
    });
    // the treasure chest trophy
    const ty = bottom + (h - bottom) / 2;
    drawChest(ctx, w / 2, ty + 6, Math.min(10, h * 0.008), progress.chest ? 1 : 0, time);
    if (!progress.chest) outlined(ctx, '?', w / 2, ty, h * 0.03, 'rgba(255,255,255,0.8)');
    for (const b of buttons) if (b.icon) drawIconButton(ctx, b);
  }

  // ---------- drawing: trip HUD ----------

  function drawBucket(ctx) {
    const { w } = size;
    const home = buttons[0];
    const n = trip.bucketSize;
    const meterRoom = Math.max(30, w * 0.07);
    const room = w - (home.x + home.w + 10) - meterRoom - 14;
    const perRow = n > 6 && room / (n * 2.5) < 13 ? Math.ceil(n / 2) : n;
    const rows = Math.ceil(n / perRow);
    const r = Math.min(20, room / (perRow * 2.5));
    const cx = home.x + home.w + 10 + room / 2;
    const cy0 = home.y + home.h / 2 - (rows - 1) * r * 1.25;
    ctx.fillStyle = 'rgba(22,11,51,0.3)';
    roundRect(ctx, cx - (perRow * r * 2.5) / 2 - r * 0.3, cy0 - r * 1.3, perRow * r * 2.5 + r * 0.6, rows * r * 2.5 + r * 0.1, r * 1.2);
    ctx.fill();
    const lastCatch = trip.t - trip.catchTime;
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const inRow = Math.min(perRow, n - row * perRow);
      const x = cx + (col - (inRow - 1) / 2) * r * 2.5;
      const y = cy0 + row * r * 2.5;
      const c = trip.line[i];
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = c ? (c.kind === 'junk' ? '#8a8f9e' : 'rgba(255,255,255,0.9)') : 'rgba(255,255,255,0.18)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = c ? C.ink : 'rgba(255,255,255,0.55)';
      ctx.stroke();
      if (c) {
        const sp = SPECIES_BY_ID[c.sp];
        const pop = i === trip.line.length - 1 && lastCatch < 0.3 ? 1.35 - lastCatch : 1;
        drawCreature(ctx, c.sp, x, y, (r * 0.8 * pop) / Math.max(sp.rx * 1.3, sp.ry * 1.3), 1, time, { phase: i * 0.3 });
      }
    }
  }

  function drawHint(ctx) {
    const { w, h } = size;
    const ph = trip.phase;
    if (ph !== 'cast' && ph !== 'drop' && ph !== 'reel') return;
    const early = progress.trips < HINT_TRIPS && (ph === 'cast' || (ph === 'drop' && trip.phaseT < 2.5) || (ph === 'reel' && trip.phaseT < 2));
    const idle = time - lastTouch > IDLE_HINT && trip.t > IDLE_HINT;
    if (!early && !idle) return;
    if (autopilot) return;
    const k = Math.sin(time * 2.6);
    const y = h * 0.8;
    const x = w / 2 + k * w * 0.22;
    ctx.save();
    ctx.globalAlpha = 0.85;
    // a double-headed arrow
    ctx.strokeStyle = C.white;
    ctx.fillStyle = C.white;
    ctx.lineWidth = Math.max(5, w * 0.012);
    ctx.lineCap = 'round';
    const ax = w * 0.3;
    ctx.beginPath();
    ctx.moveTo(w / 2 - ax, y - h * 0.05);
    ctx.lineTo(w / 2 + ax, y - h * 0.05);
    ctx.stroke();
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(w / 2 + sgn * (ax + w * 0.04), y - h * 0.05);
      ctx.lineTo(w / 2 + sgn * (ax - w * 0.02), y - h * 0.05 - w * 0.035);
      ctx.lineTo(w / 2 + sgn * (ax - w * 0.02), y - h * 0.05 + w * 0.035);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    drawFinger(ctx, x, y - h * 0.04, Math.min(w, h) / 380);
    const word = ph === 'reel' ? 'Catch fish!' : 'Slide to dodge!';
    outlined(ctx, word, w / 2, y - h * 0.11, Math.min(h * 0.04, w / 12), C.white, w * 0.9);
  }

  function drawTripHud(ctx) {
    const { w, h } = size;
    const home = buttons[0];
    drawBucket(ctx);
    // depth meter
    const mw = Math.max(12, Math.min(20, w * 0.028));
    const mx = w - mw - Math.max(8, w * 0.015);
    const y0 = home.y + home.h + Math.max(24, h * 0.04);
    const y1 = h - Math.max(70, h * 0.1);
    const hd = trip.phase === 'haul' || trip.phase === 'done' ? 0 : trip.hook.y;
    drawDepthMeter(ctx, mx, y0, y1, mw, hd, trip.lineLen, progress.best, time);
    // phase call-outs
    const big = Math.min(h * 0.06, w / 8);
    if (trip.phase === 'drop' && trip.phaseT < 1.1 && progress.trips >= HINT_TRIPS) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (1.1 - trip.phaseT) * 3);
      outlined(ctx, 'Dodge!', w / 2, h * 0.88, big, C.white);
      ctx.restore();
    }
    if (trip.phase === 'turn') {
      const by = trip.dropEnd.reason === 'bump';
      const wd = trip.dropEnd.reason === 'bottom' ? 'TREASURE!' : by ? 'Bonk!' : 'All the way!';
      outlined(ctx, wd, w / 2, h * 0.88, big * (1 + Math.max(0, 0.2 - trip.phaseT) * 2), trip.dropEnd.reason === 'bottom' ? C.sun : C.white, w * 0.9);
    }
    if (trip.phase === 'reel' && trip.phaseT < 1.1 && progress.trips >= HINT_TRIPS) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (1.1 - trip.phaseT) * 3);
      outlined(ctx, 'Catch!', w / 2, h * 0.88, big, C.sun);
      ctx.restore();
    }
    if (trip.phase === 'haul' || trip.phase === 'done') drawHaulHud(ctx);
    drawHint(ctx);
  }

  function drawHaulHud(ctx) {
    const { w, h } = size;
    const { counted, landed } = haulProgress(trip);
    const n = trip.haul.items.length;
    const px = Math.min(h * 0.09, w / 5.5);
    const y = h * 0.13 + px * 0.2;
    const last = trip.haul.items[landed - 1];
    const since = last ? (trip.phase === 'done' ? 9 : trip.phaseT - last.land) : 9;
    const pop = since < 0.25 ? 1.25 - since : 1;
    ctx.font = font(px);
    const label = `+${counted}`;
    const tw = ctx.measureText(label).width;
    const dr = px * 0.42 * pop;
    drawSandDollar(ctx, w / 2 - tw / 2 - dr * 0.9, y, dr);
    outlined(ctx, label, w / 2 + dr * 0.6, y, px * pop, C.sun);
    if (trip.phase === 'done' && landed >= n) {
      const k = Math.min(1, trip.phaseT / 0.4);
      // what's new in the album
      if (result && result.newSpecies.length) {
        const ny = h * 0.56;
        const cell = Math.min(w * 0.2, 110);
        const count = result.newSpecies.length;
        const x0 = w / 2 - ((count - 1) * cell) / 2;
        ctx.save();
        ctx.globalAlpha = k;
        ctx.fillStyle = 'rgba(22,11,51,0.45)';
        roundRect(ctx, Math.max(8, x0 - cell * 0.6), ny - cell * 0.75, Math.min(w - 16, count * cell + cell * 0.2), cell * 1.35, cell * 0.25);
        ctx.fill();
        result.newSpecies.forEach((id, i) => {
          const sp = SPECIES_BY_ID[id];
          const sc = Math.min((cell * 0.4) / sp.rx, (cell * 0.35) / sp.ry);
          drawCreature(ctx, id, x0 + i * cell, ny, sc, 1, time, { mood: 'happy' });
        });
        outlined(ctx, 'NEW!', w / 2, ny - cell * 0.72, cell * 0.3, C.red);
        ctx.restore();
      }
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
    renderer.drawMenuScene(ctx, time, 0.62, 1);
    drawConfetti(ctx, winT);
    const px = Math.min(h * 0.085, w / 6.5);
    const pop = 1 + Math.max(0, 0.8 - winT) * 1.2 + Math.sin(time * 6) * 0.04;
    outlined(ctx, 'TREASURE!', w / 2, h * 0.1, px * pop, C.sun, w * 0.92);
    // the chest, open and glowing, held up in the sky
    const sc = Math.min(w, h * 0.7) / 42;
    drawChest(ctx, w / 2 + sc * 2, h * 0.32, sc, Math.min(1, winT / 0.8), time);
    const ry = h * 0.43;
    const dr = Math.min(w, h) * 0.045;
    const label = `+${result ? result.gained : 0}`;
    ctx.font = font(dr * 2.2);
    const tw = ctx.measureText(label).width;
    drawSandDollar(ctx, w / 2 - tw / 2 - dr * 0.4, ry, dr);
    outlined(ctx, label, w / 2 + dr * 0.8, ry, dr * 2.2, C.white);
    for (const b of buttons) drawButton(ctx, b, b.fill);
  }

  // ---------- debug ----------

  if (debug) {
    window.__catch = {
      state: () => trip,
      screen: () => screen,
      buttons: () => buttons.map((b) => ({ ...b })),
      view: () => ({ ...renderer.view }),
      progress: () => JSON.parse(JSON.stringify(progress)),
      setProgress(p) {
        progress = sanitize(p);
        coinShown = progress.coins;
        saveProgress(progress);
        layoutButtons();
      },
      toScreen: (x, y) => renderer.toScreen(x, y),
      steer: (x) => trip && steer(trip, x),
      start: () => startTrip(),
      goto: (name) => goto(name),
      // jump the hook to depth d during the drop (clearing anything it would land on)
      depth(d) {
        if (!trip) return;
        trip.phase = 'drop';
        trip.hook.y = Math.min(d, trip.lineLen - 1);
        trip.creatures = trip.creatures.filter((c) => Math.abs(c.y - trip.hook.y) > 6);
        renderer.reset(trip);
      },
      skipHaul: () => trip && finishHaul(trip),
      autopilot(on = true) {
        autopilot = on;
      },
      shop: () => {
        progress = shopCheapest(progress);
        saveProgress(progress);
        layoutButtons();
      },
    };
  }

  // ---------- the game object ----------

  return {
    resize(w, h) {
      size = { w, h };
      renderer.resize(w, h);
      layoutButtons();
    },

    update(dt) {
      time += dt;
      lastDt = dt;
      if (screen === 'win') {
        const was = winT >= WIN_DELAY;
        winT += dt;
        if (!was && winT >= WIN_DELAY) layoutButtons();
        return;
      }
      if (screen !== 'trip' || !trip) return;
      if (autopilot) {
        autoWait -= dt;
        if (autoWait <= 0) {
          steer(trip, carefulTarget(trip));
          autoWait = 0.1;
        }
      }
      const before = trip.phase;
      const ready = trip.phase === 'done' && trip.phaseT >= DONE_DELAY;
      step(trip, dt);
      if (trip.phase === 'haul' && before !== 'haul') record();
      if (before !== trip.phase || ready !== (trip.phase === 'done' && trip.phaseT >= DONE_DELAY)) {
        if (trip.phase === 'done' && trip.phaseT >= DONE_DELAY && result && result.firstChest) {
          goto('win');
          return;
        }
        layoutButtons();
      }
    },

    draw(ctx) {
      if (screen === 'menu') drawMenu(ctx);
      else if (screen === 'album') drawAlbum(ctx);
      else if (screen === 'win') drawWin(ctx);
      else if (trip) {
        renderer.drawTrip(ctx, trip, time, lastDt);
        drawTripHud(ctx);
        for (const b of buttons) b.icon ? drawIconButton(ctx, b) : drawButton(ctx, b, b.fill);
      }
    },

    // Steering: put a finger down anywhere (off the buttons) and slide it left and right.
    onPickUp(x, y) {
      if (screen !== 'trip' || !trip || buttons.some((b) => hit(b, x, y))) return false;
      if (trip.phase === 'haul' || trip.phase === 'done') return false;
      lastTouch = time;
      steer(trip, renderer.toWorldX(x));
      return true;
    },
    onDrag(x) {
      if (!trip || trip.phase === 'haul' || trip.phase === 'done') return;
      lastTouch = time;
      steer(trip, renderer.toWorldX(x));
    },
    onDrop() {
      lastTouch = time;
    },
    onTap(x, y) {
      const b = buttons.find((r) => hit(r, x, y));
      if (!b) {
        // a tap during the haul hurries it along
        if (screen === 'trip' && trip && trip.phase === 'haul' && trip.phaseT > 1) finishHaul(trip);
        return;
      }
      if (b.id === 'exit') host.exit();
      else if (b.id === 'go' || b.id === 'again') startTrip();
      else if (b.id === 'buy') purchase(b.kind);
      else if (b.id === 'album') goto('album');
      else if (b.id === 'menu' || b.id === 'shop') goto('menu');
    },
  };
}
