// Memory Beach as a launcher game: the menu, the level picker, the sticker album, the
// two-player board chooser, play (one or two players) and the win screens, touch input,
// sounds and saved progress. Rules live in logic.js, levels in levels.js, pictures in
// pictures.js (named in catalog.js), drawing in draw.js.
import { LEVELS, TWO_SIZES, twoPlayerLevel } from './levels.js';
import { ALBUM } from './catalog.js';
import {
  createGame, tapCard, tick, starsFor, winnerOf, playArea, gridLayout, cardRect, slotAt, hudHeight, bandHeight,
  loadProgress, saveProgress, recordStars, addToAlbum, seenAlbum, unlocked, groupCount, startGull, startWave,
} from './logic.js';
import { createBot, botStep } from './bot.js';
import { DRAW, drawPicture } from './pictures.js';
import {
  C, font, roundRect, outlined, drawStar, drawButton, drawIconButton, drawGridIcon, drawBeach, drawBoard,
  drawCardAt, drawConfetti, drawSticker, drawNewTag, drawModeIcon, drawTeach, drawTile, glyph,
  PILE_FLY, PILE_FLY_TIME,
} from './draw.js';
import { unlockAudio, play as sound } from './sound.js';

const WIN_SHOW = 0.9; // s after the last match before the win screen
const WIN_BUTTONS = 2.0; // s after the last match before Next / Again show

const storage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};
const memoryStore = { getItem: () => null, setItem() {} };

export const memoryBeach = {
  id: 'memory-beach',
  title: 'Memory Beach',
  drawTile,
  create,
};

const hit = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function create(host) {
  const params = new URLSearchParams(location.search);
  const debug = params.has('debug');
  const store = storage() || memoryStore;
  let progress = loadProgress(store);
  let size = { w: 1, h: 1 };
  let screen = 'menu'; // 'menu' | 'picker' | 'album' | 'two' | 'play'
  let game = null;
  let L = null; // the grid layout
  let index = 0; // level index (one player)
  let twoSize = 'small';
  let buttons = [];
  let time = 0;
  let sparkles = [];
  let floaters = []; // NEW! tags rising off a fresh sticker's cards
  let newThisGame = [];
  let recorded = false;
  let teachT = null; // seconds into the teaching demo, while it shows
  let bot = null;
  let cardDown = false;
  let albumWiggle = new Map();
  let turnAt = 0; // when the turn last changed (two players)

  const totalStars = () => progress.stars.reduce((a, b) => a + b, 0);
  const firstOpen = () => {
    for (let i = 0; i < LEVELS.length; i++) if (unlocked(progress, i) && progress.stars[i] === 0) return i;
    return 0;
  };
  const save = () => saveProgress(store, progress);
  const pad = () => Math.max(10, size.w * 0.025);
  const iconSize = () => Math.max(48, Math.min(66, size.w * 0.12));

  // ---------- layout ----------

  function layoutGame() {
    if (!game) return;
    L = gridLayout(playArea(size.w, size.h, game.players), game.cols, game.rows);
  }

  function layoutButtons() {
    const { w, h } = size;
    const p = pad();
    const icon = iconSize();
    const bw = Math.min(w * 0.8, 420);
    const bh = Math.max(62, Math.min(92, h * 0.08));
    const x = (w - bw) / 2;
    buttons = [];
    if (screen === 'menu') {
      const y0 = h * 0.6;
      buttons.push({ id: 'exit', icon: 'home', x: p, y: p, w: icon, h: icon });
      buttons.push({ id: 'play', label: `Play ${firstOpen() + 1}`, glyph: 'play', x, y: y0, w: bw, h: bh });
      const half = (bw - 14) / 2;
      buttons.push({ id: 'picker', label: 'Levels', glyph: 'grid', x, y: y0 + bh * 1.25, w: half, h: bh, fill: C.white });
      buttons.push({ id: 'album', label: '', glyph: null, x: x + half + 14, y: y0 + bh * 1.25, w: half, h: bh, fill: '#9ff7f2' });
      buttons.push({ id: 'two', label: '', glyph: 'two', x, y: y0 + bh * 2.5, w: bw, h: bh, fill: '#ff9ec8' });
    } else if (screen === 'picker') {
      buttons.push({ id: 'menu', icon: 'back', x: p, y: p, w: icon, h: icon });
      const cols = 3;
      const rows = Math.ceil(LEVELS.length / cols);
      const top = icon + p * 2;
      const gap = Math.max(10, w * 0.03);
      const tw = Math.min((w - gap * (cols + 1)) / cols, 220);
      const th = Math.min(tw * 0.95, (h - top - gap * (rows + 0.5)) / rows);
      const gx = (w - (tw * cols + gap * (cols - 1))) / 2;
      LEVELS.forEach((_, i) => {
        buttons.push({ id: 'level', index: i, x: gx + (i % cols) * (tw + gap), y: top + Math.floor(i / cols) * (th + gap), w: tw, h: th });
      });
    } else if (screen === 'album') {
      buttons.push({ id: 'menu', icon: 'back', x: p, y: p, w: icon, h: icon });
    } else if (screen === 'two') {
      buttons.push({ id: 'menu', icon: 'back', x: p, y: p, w: icon, h: icon });
      const n = TWO_SIZES.length;
      const gap = Math.max(14, w * 0.04);
      const sw = Math.min((w - gap * (n + 1)) / n, 220);
      const sh = Math.min(sw * 1.25, h * 0.26);
      const gx = (w - (sw * n + gap * (n - 1))) / 2;
      TWO_SIZES.forEach((s, k) => buttons.push({ id: 'twoSize', size: s.id, x: gx + k * (sw + gap), y: h * 0.58, w: sw, h: sh }));
    } else if (screen === 'play' && game) {
      if (game.players === 2) {
        const band = bandHeight(w, h);
        const ih = Math.max(44, Math.min(58, band * 0.6));
        buttons.push({ id: 'menu', icon: 'home', x: w - p - ih, y: (band - ih) / 2, w: ih, h: ih });
      } else {
        const hud = hudHeight(w, h);
        const ih = Math.max(44, Math.min(60, hud * 0.72));
        const iy = (hud - ih) / 2;
        buttons.push({ id: 'menu', icon: 'home', x: p, y: iy, w: ih, h: ih });
        buttons.push({ id: 'restart', icon: 'restart', x: w - p - ih, y: iy, w: ih, h: ih });
      }
      if (teachT !== null) {
        const tb = teachBox();
        buttons.push({ id: 'go', label: '', glyph: 'play', x: w / 2 - bh * 1.1, y: tb.y + tb.h - bh * 1.3, w: bh * 2.2, h: bh });
      }
      if (game.status === 'won' && game.wonT > WIN_BUTTONS) {
        const by = h - bh * 2.6 - Math.max(16, h * 0.03);
        if (game.players === 2) {
          buttons.push({ id: 'again', label: '', glyph: 'restart', x, y: by + bh * 0.6, w: bw, h: bh * 1.1 });
        } else {
          const last = index === LEVELS.length - 1;
          buttons.push({ id: 'next', label: last ? 'All done!' : 'Next', glyph: last ? null : 'next', x, y: by, w: bw, h: bh * 1.1 });
          buttons.push({ id: 'again', label: 'Again', glyph: 'restart', x: x + bw * 0.15, y: by + bh * 1.35, w: bw * 0.7, h: bh * 0.85, fill: C.white });
        }
      }
    }
  }

  function teachBox() {
    const { w, h } = size;
    const bw = Math.min(w * 0.88, 560);
    const bh = Math.min(h * 0.6, bw * 1.15);
    return { x: (w - bw) / 2, y: (h - bh) / 2, w: bw, h: bh };
  }

  // ---------- flow ----------

  function goto(next) {
    if (screen === 'album' && next !== 'album') {
      seenAlbum(progress);
      save();
    }
    screen = next;
    if (next !== 'play') {
      game = null;
      bot = null;
    }
    albumWiggle = new Map();
    layoutButtons();
  }

  function begin(level, players, seed) {
    game = createGame(level, seed ?? (1 + Math.floor(Math.random() * 1e9)), { players });
    screen = 'play';
    sparkles = [];
    floaters = [];
    newThisGame = [];
    recorded = false;
    bot = null;
    cardDown = false;
    layoutGame();
  }

  function startLevel(i, seed) {
    index = clamp(i, 0, LEVELS.length - 1);
    begin(LEVELS[index], 1, seed);
    teachT = LEVELS[index].teach && progress.stars[index] === 0 ? 0 : null;
    layoutButtons();
  }

  function startTwo(sizeId, seed) {
    twoSize = sizeId;
    begin(twoPlayerLevel(sizeId), 2, seed);
    teachT = null;
    turnAt = time;
    layoutButtons();
  }

  function centreOf(i) {
    const r = cardRect(L, i);
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  }

  function burst(x, y, n, colours, speed = 200) {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + Math.random() * 0.4;
      const sp = speed * (0.5 + Math.random() * 0.8);
      sparkles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 6 + Math.random() * 7, t: 0, life: 0.55 + Math.random() * 0.35, c: colours[k % colours.length] });
    }
  }

  function handleEvents() {
    if (!game) return;
    const events = game.events.splice(0);
    for (const e of events) {
      if (e.type === 'flip') sound('flip');
      else if (e.type === 'miss') sound('miss');
      else if (e.type === 'match') {
        sound('match');
        const colours = game.players === 2 ? [e.player === 0 ? C.p1 : C.p2, C.white, C.sun] : [C.sun, C.white, C.pink, C.foam];
        for (const i of e.slots) {
          const c = centreOf(i);
          burst(c.x, c.y, 14, colours, L.cw * 2.2);
          game.cards[i].pileIndex = game.scores[e.player] - 1;
        }
        const added = addToAlbum(progress, e.pics);
        if (added.length) {
          save();
          newThisGame.push(...added);
          const c = centreOf(e.slots[0]);
          floaters.push({ x: c.x, y: c.y - L.ch * 0.5, t: 0 });
          setTimeout(() => sound('new'), 250);
        }
      } else if (e.type === 'turn') turnAt = time;
      else if (e.type === 'swap') sound('gull');
      else if (e.type === 'wave') sound('wave');
      else if (e.type === 'won') {
        sound('win');
        if (game.players === 1 && !recorded) {
          recorded = true;
          recordStars(progress, index, starsFor(game));
          save();
        }
      }
    }
  }

  // Where a two-player card lands in its owner's pile: a row of pairs along the band.
  function pileOf(card) {
    const { w, h } = size;
    const band = bandHeight(w, h);
    const sc = (band * 0.62) / L.ch;
    const cw = L.cw * sc;
    const k = card.pileIndex ?? 0;
    const startX = pad() + Math.max(44, Math.min(58, band * 0.6)) + cw * 0.9 + 16;
    const room = w - startX - band * 2;
    const step = Math.min(cw * 0.55, room / Math.max(1, groupCount(game.level)));
    const x = startX + k * step + (card.pic && game.cards.indexOf(card) % 2 ? cw * 0.12 : 0);
    if (card.owner === 1) return { x: w - x, y: band / 2, scale: sc };
    return { x, y: h - band / 2, scale: sc };
  }

  // ---------- drawing ----------

  function drawMenu(ctx) {
    const { w, h } = size;
    drawBeach(ctx, w, h, time, h * 0.12);
    const px = Math.min(h * 0.075, w / 7);
    ctx.save();
    ctx.translate(w / 2 + Math.sin(time * 2) * 3, h * 0.14);
    ctx.rotate(-0.04 + Math.sin(time * 1.4) * 0.02);
    outlined(ctx, 'MEMORY', 0, 0, px, C.white, w * 0.9);
    outlined(ctx, 'BEACH', 0, px * 1.15, px * 1.3, C.sun, w * 0.9);
    ctx.restore();
    // a little game playing itself on the sand
    const cw = Math.min(w * 0.16, h * 0.075);
    const pics = [{ pic: 'flamingo' }, { pic: 'crab' }, { pic: 'pineapple' }, { pic: 'crab' }, { pic: 'pineapple' }, { pic: 'flamingo' }];
    const loop = time % 7;
    const order = [[1, 3, 0.3], [0, 4, 1.8], [2, 5, 3.3]];
    pics.forEach((c, i) => {
      const pair = order.find((o) => o[0] === i || o[1] === i);
      const start = pair[2] + (pair[1] === i ? 0.5 : 0);
      const k = Math.min(clamp((loop - start) / 0.3, 0, 1), clamp((6.6 - loop) / 0.3, 0, 1));
      const matched = loop > pair[2] + 0.9 && loop < 6.3;
      const wig = matched && loop < pair[2] + 1.6 ? Math.sin(time * 20) * 0.1 : 0;
      const cx = w / 2 + ((i % 3) - 1) * cw * 1.25;
      const cy = h * 0.41 + (Math.floor(i / 3) - 0.5) * cw * 1.4;
      drawCardAt(ctx, c, cx, cy, cw, cw * 1.22, k, { rot: wig + Math.sin(i * 7) * 0.05, glow: matched ? 'rgba(255,201,58,0.9)' : null });
    });
    const total = totalStars();
    if (total > 0) {
      const r = Math.min(h * 0.02, w * 0.04);
      ctx.font = font(r * 1.8);
      const label = `${total} / ${LEVELS.length * 3}`;
      const tw = ctx.measureText(label).width;
      const ty = h * 0.56;
      drawStar(ctx, w / 2 - tw / 2 - r * 0.8, ty, r, true);
      outlined(ctx, label, w / 2 + r * 0.8, ty, r * 1.8, C.white);
    }
    for (const b of buttons) {
      if (b.icon) drawIconButton(ctx, b);
      else drawButton(ctx, b, b.fill);
      if (b.id === 'album') {
        glyph(ctx, 'album', b.x + b.w * 0.32, b.y + b.h / 2, b.h * 0.24, C.ink);
        drawSticker(ctx, 'starfish', b.x + b.w * 0.72, b.y + b.h / 2, b.h * 0.62, true, Math.sin(time * 2) * 0.1);
        if (progress.fresh.length) drawNewTag(ctx, b.x + b.w - 8, b.y + 4, Math.min(20, b.h * 0.3), time);
      }
      if (b.id === 'two') {
        // a turtle and a flamingo face off
        drawPicture(ctx, 'turtle', b.x + b.w * 0.22, b.y + b.h / 2, b.h * 0.8);
        drawPicture(ctx, 'flamingo', b.x + b.w * 0.78, b.y + b.h / 2, b.h * 0.8);
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

  function drawPicker(ctx) {
    const { w, h } = size;
    drawBeach(ctx, w, h, time, 0);
    const icon = buttons[0];
    outlined(ctx, 'Levels', w / 2, icon.y + icon.h / 2, Math.min(h * 0.05, w / 9), C.sun, w - (icon.w + icon.x) * 2 - 10);
    for (const b of buttons) {
      if (b.icon) {
        drawIconButton(ctx, b);
        continue;
      }
      const lv = LEVELS[b.index];
      const open = unlocked(progress, b.index);
      const stars = progress.stars[b.index];
      ctx.fillStyle = 'rgba(90,60,20,0.3)';
      roundRect(ctx, b.x, b.y + 5, b.w, b.h, 18);
      ctx.fill();
      ctx.fillStyle = open ? '#fffaf0' : '#e8dcc4';
      roundRect(ctx, b.x, b.y, b.w, b.h, 18);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      const r = Math.min(b.w * 0.5, b.h * 0.62);
      drawModeIcon(ctx, lv, b.x + b.w * 0.55, b.y + b.h * 0.44, r, open ? time : 0);
      outlined(ctx, String(b.index + 1), b.x + b.w * 0.14, b.y + b.h * 0.2, b.h * 0.22, C.sun);
      // how big the board is, as a little grid
      drawGridIcon(ctx, b.x + b.w * 0.12, b.y + b.h * 0.58, b.h * 0.2, lv.cols, lv.rows, 'rgba(22,11,51,0.55)');
      const sr = Math.min(b.w * 0.09, b.h * 0.085);
      for (let k = 0; k < 3; k++) drawStar(ctx, b.x + b.w / 2 + (k - 1) * sr * 2.4, b.y + b.h * 0.86, sr, k < stars);
      if (!open) {
        ctx.fillStyle = 'rgba(22,11,51,0.45)';
        roundRect(ctx, b.x, b.y, b.w, b.h, 18);
        ctx.fill();
        drawLock(ctx, b.x + b.w * 0.86, b.y + b.h * 0.2, Math.min(b.w, b.h) * 0.11);
      }
    }
  }

  function albumGrid() {
    const { w, h } = size;
    const icon = buttons[0];
    const top = icon.y + icon.h + pad();
    const cols = 6;
    const rows = Math.ceil(ALBUM.length / cols);
    const cell = Math.min((w - pad() * 2) / cols, (h - top - pad()) / rows);
    const x0 = (w - cell * cols) / 2;
    return { cols, cell, x0, y0: top };
  }

  function drawAlbum(ctx) {
    const { w, h } = size;
    drawBeach(ctx, w, h, time, 0);
    const icon = buttons[0];
    outlined(ctx, 'Stickers', w / 2, icon.y + icon.h / 2, Math.min(h * 0.045, w / 10), C.sun, w - (icon.w + icon.x) * 2 - 70);
    ctx.font = font(Math.min(22, w * 0.05));
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = C.ink;
    ctx.fillText(`${progress.album.length} / ${ALBUM.length}`, w - pad(), icon.y + icon.h / 2);
    for (const b of buttons) drawIconButton(ctx, b);
    const g = albumGrid();
    ALBUM.forEach((id, i) => {
      const cx = g.x0 + (i % g.cols + 0.5) * g.cell;
      const cy = g.y0 + (Math.floor(i / g.cols) + 0.5) * g.cell;
      const known = progress.album.includes(id);
      const wt = albumWiggle.get(i);
      const wob = wt !== undefined ? Math.sin((time - wt) * 25) * 0.25 * Math.max(0, 1 - (time - wt) * 1.5) : 0;
      drawSticker(ctx, id, cx, cy, g.cell * 0.88, known, wob + (known ? Math.sin(i * 3.7) * 0.06 : 0));
      if (progress.fresh.includes(id)) drawNewTag(ctx, cx + g.cell * 0.3, cy - g.cell * 0.36, Math.min(18, g.cell * 0.22), time);
    });
  }

  function drawTwoChooser(ctx) {
    const { w, h } = size;
    drawBeach(ctx, w, h, time, h * 0.1);
    // the two players: a turtle (bottom) and a flamingo (top), facing off
    const s = Math.min(w * 0.32, h * 0.2);
    drawPicture(ctx, 'turtle', w * 0.28, h * 0.34 + Math.sin(time * 3) * 4, s);
    drawPicture(ctx, 'flamingo', w * 0.72, h * 0.34 + Math.sin(time * 3 + 1.5) * 4, s);
    outlined(ctx, 'VS', w / 2, h * 0.34, Math.min(h * 0.06, w / 9), C.sun);
    for (const b of buttons) {
      if (b.icon) {
        drawIconButton(ctx, b);
        continue;
      }
      const t = TWO_SIZES.find((q) => q.id === b.size);
      ctx.fillStyle = 'rgba(90,60,20,0.3)';
      roundRect(ctx, b.x, b.y + 6, b.w, b.h, 22);
      ctx.fill();
      ctx.fillStyle = b.size === 'small' ? C.sun : b.size === 'medium' ? '#9ff7f2' : '#ff9ec8';
      roundRect(ctx, b.x, b.y, b.w, b.h, 22);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      drawGridIcon(ctx, b.x + b.w / 2, b.y + b.h / 2, b.h * (0.35 + 0.1 * TWO_SIZES.indexOf(t)), t.cols, t.rows, C.ink);
    }
  }

  function drawHud(ctx) {
    const { w, h } = size;
    const hud = hudHeight(w, h);
    const left = buttons.find((b) => b.id === 'menu');
    // level number
    outlined(ctx, String(index + 1), left.x + left.w + hud * 0.45, hud / 2, hud * 0.42, C.sun);
    // one shell per group: filled as found
    const n = game.groups;
    const room = w - (left.x + left.w) * 2 - hud * 1.6;
    const r = Math.min(hud * 0.16, room / (n * 2.6));
    const x0 = w / 2 - ((n - 1) * r * 2.5) / 2;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * r * 2.5;
      const got = i < game.found;
      ctx.beginPath();
      ctx.arc(x, hud / 2, r, 0, Math.PI * 2);
      ctx.fillStyle = got ? C.sun : 'rgba(255,255,255,0.45)';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = got ? C.ink : 'rgba(22,11,51,0.3)';
      ctx.stroke();
      if (got) drawStar(ctx, x, hud / 2, r * 0.7, true);
    }
    // the preview: a sand timer bar running out
    if (game.status === 'preview' && game.preview > 0) {
      const k = clamp(game.previewT / game.preview, 0, 1);
      const bw = Math.min(w * 0.5, 300);
      const y = L.y0 - Math.max(6, L.gap);
      ctx.fillStyle = 'rgba(22,11,51,0.25)';
      roundRect(ctx, w / 2 - bw / 2, y - 5, bw, 10, 5);
      ctx.fill();
      ctx.fillStyle = C.p1;
      roundRect(ctx, w / 2 - bw / 2, y - 5, bw * k, 10, 5);
      ctx.fill();
      // an eye: look now!
      const ex = w / 2 - bw / 2 - 22;
      ctx.fillStyle = C.white;
      ctx.beginPath();
      ctx.ellipse(ex, y, 14, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ex, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = C.ink;
      ctx.fill();
    }
  }

  function drawBands(ctx) {
    const { w, h } = size;
    const band = bandHeight(w, h);
    const turn = game.status === 'won' ? -1 : game.current;
    for (const pl of [0, 1]) {
      const y = pl === 0 ? h - band : 0;
      const colour = pl === 0 ? C.p1 : C.p2;
      const active = turn === pl;
      ctx.save();
      ctx.globalAlpha = active ? 0.95 : 0.4;
      ctx.fillStyle = colour;
      ctx.fillRect(0, y, w, band);
      ctx.restore();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, pl === 0 ? y : band);
      ctx.lineTo(w, pl === 0 ? y : band);
      ctx.stroke();
      // the player's mascot at their end, bigger and bouncing on their turn
      const mx = pl === 0 ? w - band * 0.62 : band * 0.62;
      const bob = active ? Math.abs(Math.sin(time * 5)) * band * 0.08 : 0;
      ctx.save();
      ctx.translate(mx, y + band / 2 - bob);
      if (pl === 1) ctx.rotate(Math.PI);
      drawPicture(ctx, pl === 0 ? 'turtle' : 'flamingo', 0, 0, band * (active ? 0.92 : 0.7));
      ctx.restore();
      // score
      const sx = pl === 0 ? w - band * 1.45 : band * 1.45;
      ctx.save();
      ctx.translate(sx, y + band / 2);
      if (pl === 1) ctx.rotate(Math.PI);
      outlined(ctx, String(game.scores[pl]), 0, 0, band * 0.5, C.white);
      ctx.restore();
    }
    // the pairs already won, in each pile
    game.cards.forEach((c) => {
      if (!c.matched || c.owner < 0) return;
      if (game.time - c.matchT < PILE_FLY + PILE_FLY_TIME) return;
      const p = pileOf(c);
      drawCardAt(ctx, c, p.x, p.y, L.cw * p.scale, L.ch * p.scale, 1, { rot: c.owner === 1 ? Math.PI : 0 });
    });
    // whose turn: a big bouncing arrow toward them and a wash of their colour round the board
    if (turn >= 0) {
      const colour = turn === 0 ? C.p1 : C.p2;
      ctx.save();
      ctx.globalAlpha = 0.28 + 0.1 * Math.sin(time * 4);
      ctx.strokeStyle = colour;
      ctx.lineWidth = 10;
      const m = Math.max(4, Math.min(12, L.x0 - 5));
      roundRect(ctx, L.x0 - m, L.y0 - m, L.gw + m * 2, L.gh + m * 2, 22);
      ctx.stroke();
      ctx.restore();
      // a big arrow across the middle pointing at them, for a moment after each change
      const k = clamp(1 - (time - turnAt - 1.1) / 0.4, 0, 1);
      if (k > 0) {
        const dir = turn === 0 ? 1 : -1;
        const r = Math.min(w * 0.22, h * 0.14);
        const pop = Math.min(1, (time - turnAt) / 0.15);
        ctx.save();
        ctx.globalAlpha = 0.92 * k;
        ctx.translate(w / 2, h / 2 + dir * Math.sin(time * 8) * r * 0.08);
        ctx.scale(pop, pop);
        ctx.fillStyle = colour;
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-r * 0.4, -dir * r);
        ctx.lineTo(r * 0.4, -dir * r);
        ctx.lineTo(r * 0.4, 0);
        ctx.lineTo(r, 0);
        ctx.lineTo(0, dir * r);
        ctx.lineTo(-r, 0);
        ctx.lineTo(-r * 0.4, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawPlay(ctx) {
    const { w, h } = size;
    drawBeach(ctx, w, h, time, game.players === 2 ? 0 : hudHeight(w, h) * 0.85);
    drawBoard(ctx, game, L, { time, sparkles, pileOf: game.players === 2 ? pileOf : null });
    for (const f of floaters) {
      ctx.globalAlpha = clamp(2 - f.t * 1.3, 0, 1);
      drawNewTag(ctx, f.x, f.y - f.t * 40, Math.max(18, L.cw * 0.2), time);
      ctx.globalAlpha = 1;
    }
    if (game.players === 2) drawBands(ctx);
    else drawHud(ctx);
    if (teachT !== null) drawTeachPanel(ctx);
    if (game.status === 'won' && game.wonT > WIN_SHOW) {
      if (game.players === 2) drawTwoWin(ctx);
      else drawWin(ctx);
    }
    for (const b of buttons) {
      if (b.icon) drawIconButton(ctx, b);
      else drawButton(ctx, b, b.fill);
    }
  }

  function drawTeachPanel(ctx) {
    const { w, h } = size;
    ctx.fillStyle = 'rgba(22,11,51,0.45)';
    ctx.fillRect(0, 0, w, h);
    const b = teachBox();
    ctx.fillStyle = 'rgba(22,11,51,0.35)';
    roundRect(ctx, b.x, b.y + 8, b.w, b.h, 28);
    ctx.fill();
    ctx.fillStyle = '#fff3d6';
    roundRect(ctx, b.x, b.y, b.w, b.h, 28);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    const go = buttons.find((q) => q.id === 'go');
    const area = { x: b.x + 16, y: b.y + 16, w: b.w - 32, h: (go ? go.y : b.y + b.h) - b.y - 32 };
    drawTeach(ctx, LEVELS[index].teach, area.x, area.y, area.w, area.h, teachT);
  }

  function drawWin(ctx) {
    const { w, h } = size;
    const t = game.wonT - WIN_SHOW;
    const k = Math.min(1, t / 0.4);
    ctx.fillStyle = `rgba(22,11,51,${0.72 * k})`;
    ctx.fillRect(0, 0, w, h);
    drawConfetti(ctx, w, h, t);
    const stars = starsFor(game);
    const px = Math.min(h * 0.08, w / 6);
    const pop = 1 + Math.max(0, 0.5 - t) * 1.2 + Math.sin(time * 6) * 0.04;
    const ty = h * 0.16;
    outlined(ctx, stars === 3 ? 'WOW!' : 'Hooray!', w / 2, ty, px * pop, C.sun, w * 0.9);
    const r = Math.min(w * 0.11, h * 0.06);
    const starY = ty + px * 0.9 + r * 1.3;
    for (let i = 0; i < 3; i++) {
      const at = 0.3 + i * 0.25;
      const sk = t < at ? 0 : Math.min(1, (t - at) / 0.15);
      const grow = sk * (1 + Math.max(0, 0.3 - (t - at)) * 0.8);
      if (grow <= 0) continue;
      drawStar(ctx, w / 2 + (i - 1) * r * 2.4, starY - (i === 1 ? r * 0.3 : 0), r * grow, i < stars);
    }
    // the stickers this game added, with NEW! tags
    const shown = newThisGame.slice(0, 8);
    if (shown.length) {
      const d = Math.min(w / (shown.length + 1.5), h * 0.1, 110);
      const y = starY + r * 1.6 + d * 0.7;
      shown.forEach((id, i) => {
        const at = 1.1 + i * 0.15;
        const sk = clamp((t - at) / 0.25, 0, 1);
        if (sk <= 0) return;
        const x = w / 2 + (i - (shown.length - 1) / 2) * d * 1.1;
        drawSticker(ctx, id, x, y + (1 - sk) * 40, d * (0.6 + 0.4 * sk), true, Math.sin(time * 3 + i) * 0.1);
        drawNewTag(ctx, x + d * 0.3, y - d * 0.42, Math.min(18, d * 0.22), time + i);
      });
    } else {
      // a happy crab dance
      const s = Math.min(w, h) * 0.22;
      drawPicture(ctx, 'crab', w / 2 + Math.sin(time * 4) * s * 0.2, starY + r * 1.6 + s * 0.6 - Math.abs(Math.sin(time * 8)) * 10, s);
    }
  }

  function drawTwoWin(ctx) {
    const { w, h } = size;
    const t = game.wonT - WIN_SHOW;
    ctx.fillStyle = `rgba(22,11,51,${0.5 * Math.min(1, t / 0.4)})`;
    ctx.fillRect(0, 0, w, h);
    drawConfetti(ctx, w, h, t);
    const win = winnerOf(game);
    const s = Math.min(w * 0.45, h * 0.26);
    const who = win === -1 ? [0, 1] : [win];
    who.forEach((pl, i) => {
      const x = w / 2 + (who.length === 2 ? (i - 0.5) * s * 1.1 : 0);
      const y = h * 0.5 - Math.abs(Math.sin(time * 5 + i)) * 16;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(time * 4 + i) * 0.12);
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2);
      ctx.fillStyle = pl === 0 ? C.p1 : C.p2;
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      drawPicture(ctx, pl === 0 ? 'turtle' : 'flamingo', 0, 0, s * 0.95);
      // crown
      ctx.translate(0, -s * 0.62);
      ctx.beginPath();
      const cw = s * 0.36;
      ctx.moveTo(-cw, 0);
      ctx.lineTo(-cw, -cw * 0.8);
      ctx.lineTo(-cw * 0.5, -cw * 0.35);
      ctx.lineTo(0, -cw);
      ctx.lineTo(cw * 0.5, -cw * 0.35);
      ctx.lineTo(cw, -cw * 0.8);
      ctx.lineTo(cw, 0);
      ctx.closePath();
      ctx.fillStyle = C.gold;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    });
    outlined(ctx, win === -1 ? 'Tie!' : 'Hooray!', w / 2, h * 0.17, Math.min(h * 0.08, w / 6), C.sun, w * 0.9);
  }

  // ---------- debug hook ----------

  if (debug) {
    window.__memory = {
      state: () => game,
      screen: () => screen,
      buttons: () => buttons.map((b) => ({ ...b })),
      progress: () => JSON.parse(JSON.stringify(progress)),
      layout: () => L && { ...L },
      // screen centre of the card in slot i (finger target)
      card: (i) => centreOf(i),
      level: (n, seed) => startLevel(n - 1, seed),
      two: (sizeId = 'small', seed) => startTwo(sizeId, seed),
      goto: (name) => goto(name),
      teaching: () => teachT,
      // send the seagull or the wave now (between turns)
      gull: () => game && !game.anim && startGull(game),
      wave: () => game && !game.anim && startWave(game),
      skipTeach() {
        teachT = null;
        layoutButtons();
      },
      fastForward(seconds) {
        for (let t = 0; t < seconds; t += 1 / 60) api.update(1 / 60);
      },
      // the bot plays (memory: true / false)
      autoplay(on = true, opts = {}) {
        bot = on ? createBot({ memory: true, ...opts, drain: false }) : null;
      },
      setProgress(p) {
        progress = { ...progress, ...p };
        save();
        layoutButtons();
      },
      pictures: () => Object.keys(DRAW),
      // a contact sheet of pictures at `px` across, as a PNG data URL
      sheet(px = 120, ids = Object.keys(DRAW), cols = 8, card = true, colour = null) {
        const rows = Math.ceil(ids.length / cols);
        const cw = px;
        const ch = card ? px * 1.22 : px;
        const gap = Math.max(6, px * 0.12);
        const c = document.createElement('canvas');
        const dpr = 2;
        c.width = (cols * (cw + gap) + gap) * dpr;
        c.height = (rows * (ch + gap + 14) + gap) * dpr;
        const g = c.getContext('2d');
        g.scale(dpr, dpr);
        g.fillStyle = '#f2d48a';
        g.fillRect(0, 0, c.width, c.height);
        ids.forEach((id, i) => {
          const x = gap + (i % cols) * (cw + gap) + cw / 2;
          const y = gap + Math.floor(i / cols) * (ch + gap + 14) + ch / 2;
          if (card) drawCardAt(g, { pic: id, colour }, x, y, cw, ch, 1);
          else drawPicture(g, id, x, y, px, colour);
          g.fillStyle = '#160b33';
          g.font = '600 11px system-ui';
          g.textAlign = 'center';
          g.fillText(id, x, y + ch / 2 + 11);
        });
        return c.toDataURL('image/png');
      },
    };
  }

  const api = {
    resize(w, h) {
      size = { w, h };
      layoutGame();
      layoutButtons();
    },

    update(dt) {
      time += dt;
      for (const s of sparkles) {
        s.t += dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= 1 - 3 * dt;
        s.vy = s.vy * (1 - 3 * dt) + 160 * dt;
      }
      sparkles = sparkles.filter((s) => s.t < s.life);
      for (const f of floaters) f.t += dt;
      floaters = floaters.filter((f) => f.t < 1.6);
      if (screen !== 'play' || !game) return;
      if (teachT !== null) {
        teachT += dt;
        return;
      }
      const before = game.status === 'won' && game.wonT > WIN_BUTTONS;
      if (bot) botStep(bot, game, dt);
      else tick(game, dt);
      handleEvents();
      const after = game.status === 'won' && game.wonT > WIN_BUTTONS;
      if (before !== after) layoutButtons();
    },

    draw(ctx) {
      if (screen === 'menu') drawMenu(ctx);
      else if (screen === 'picker') drawPicker(ctx);
      else if (screen === 'album') drawAlbum(ctx);
      else if (screen === 'two') drawTwoChooser(ctx);
      else if (game) drawPlay(ctx);
    },

    // Cards turn over the moment a finger lands on them (it feels quicker than waiting for
    // the finger to lift); buttons work on the tap.
    onPickUp(x, y) {
      unlockAudio();
      cardDown = false;
      if (screen !== 'play' || !game || teachT !== null || bot) return false;
      if (buttons.some((b) => hit(b, x, y))) return false;
      const slot = slotAt(L, x, y);
      if (slot >= 0) {
        cardDown = true;
        tapCard(game, slot);
        handleEvents();
      }
      return false;
    },
    onDrag() {},
    onDrop() {},
    onTap(x, y) {
      unlockAudio();
      if (cardDown) {
        cardDown = false;
        return;
      }
      const b = buttons.find((r) => hit(r, x, y));
      if (screen === 'album' && !b) {
        const g = albumGrid();
        const col = Math.floor((x - g.x0) / g.cell);
        const row = Math.floor((y - g.y0) / g.cell);
        const i = row * g.cols + col;
        if (col >= 0 && col < g.cols && i >= 0 && i < ALBUM.length && progress.album.includes(ALBUM[i])) albumWiggle.set(i, time);
        return;
      }
      if (teachT !== null && !b && screen === 'play') {
        // anywhere on the demo starts the level too
        if (teachT > 0.6) {
          teachT = null;
          layoutButtons();
        }
        return;
      }
      if (!b) return;
      if (b.id === 'exit') host.exit();
      else if (b.id === 'play') startLevel(firstOpen());
      else if (b.id === 'picker') goto('picker');
      else if (b.id === 'album') goto('album');
      else if (b.id === 'two') goto('two');
      else if (b.id === 'twoSize') startTwo(b.size);
      else if (b.id === 'menu') goto(game && game.players === 2 ? 'two' : 'menu');
      else if (b.id === 'go') {
        teachT = null;
        layoutButtons();
      } else if (b.id === 'level') {
        if (unlocked(progress, b.index)) startLevel(b.index);
      } else if (b.id === 'restart' || b.id === 'again') {
        if (game && game.players === 2) startTwo(twoSize);
        else startLevel(index);
      } else if (b.id === 'next') {
        if (index >= LEVELS.length - 1) goto('picker');
        else startLevel(index + 1);
      }
    },
  };

  const forced = Number(params.get('level'));
  const seedParam = params.get('seed');
  const seed = seedParam !== null && Number.isFinite(Number(seedParam)) ? Number(seedParam) : undefined;
  if (Number.isInteger(forced) && forced >= 1 && forced <= LEVELS.length) startLevel(forced - 1, seed);
  else if (params.get('two')) startTwo(params.get('two'), seed);
  layoutButtons();
  return api;
}

