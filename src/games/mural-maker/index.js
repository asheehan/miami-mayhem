// Mural Maker as a launcher game: the street of walls, the painting screen (fill, spray,
// stamps, undo, clear), the celebration when a mural is finished, touch input and saved
// walls. Rules live in mural.js, line art in murals/ and stamps.js, drawing in draw.js.
import { WALL_DEFS } from './murals/index.js';
import { STAMPS } from './stamps.js';
import {
  WALL_W, WALL_H, SWATCHES, STAMP_SIZE, BRUSHES, compileMural, regionAt, regionPoint, createWall, fillRegion,
  startStroke, extendStroke, endStroke, addStamp, resizeStamp, undo, clearWall, isComplete, isBlank, dripsFor, checkSpray, blankRegions,
  loadProgress, saveProgress, paintFor,
} from './mural.js';
import {
  C, font, roundRect, outlined, makeCanvas, renderFills, renderLines, renderPaint, drawStroke, drawDrip, drawStamp,
  drawTwinkles, drawHint, drawWink, drawFx, drawConfetti, renderWallImage, drawStar, drawTool, glyph, drawSwatch,
  drawStampIcon, paintColour, tracePath, applyXf,
} from './draw.js';

const WALLS = WALL_DEFS.map(compileMural);
const byId = new Map(WALLS.map((m) => [m.id, m]));

const WIPE_TIME = 0.42; // s for a fill to spray in
const ALIVE_TIME = 4.4; // s the mural comes alive for
const CONFETTI_TIME = 3.2;
const DRIP_SPEED = 120; // wall units per second
const SAVE_DELAY = 0.6; // s after the last change before saving
const DPR_MAX = 2;

const storage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};
const memoryStore = { getItem: () => null, setItem() {} };
const hit = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const dprNow = () => Math.min(DPR_MAX, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);

export const muralMaker = {
  id: 'mural-maker',
  title: 'Mural Maker',
  drawTile,
  create,
};

function create(host) {
  const params = new URLSearchParams(location.search);
  const debug = params.has('debug');
  const store = storage() || memoryStore;
  const progress = loadProgress(store, WALLS);
  const versions = Object.fromEntries(WALLS.map((m) => [m.id, 0]));
  const thumbs = new Map(); // id -> { ver, w, canvas }
  const lineCache = new Map();

  let size = { w: 1, h: 1 };
  let screen = 'street'; // 'street' | 'paint'
  let buttons = [];
  let time = 0;
  let m = null; // the compiled mural being painted
  let wall = null;
  let tool = 'fill'; // 'fill' | 'spray' | 'stamp'
  let swatch = '8';
  let base = 8; // last plain colour picked (stripes and dots use it)
  let brush = 1;
  let drip = false;
  let stampKind = 'star';
  let confirm = false;
  let saveIn = -1;
  let lastSave = 0;

  // the wall on screen and its layers
  let view = { x: 0, y: 0, w: 1, h: 1, s: 1 };
  let layers = null; // { k, fills, paint, lines, staticPaint }
  let wipe = null; // { i, prev, paint, x, y, t, rMax }
  let drips = []; // growing drips: { mark, d, cur }
  let popping = []; // stamps popping on: { mark, t, held }
  let gesture = null; // { kind: 'spray', marks } | { kind: 'stamp', mark, x0, y0 }
  let alive = null; // { t, confetti }
  let sticker = null; // { t } the star flying onto a finished wall

  const paint = () => paintFor(swatch, base);
  const touched = () => {
    versions[wall.id]++;
    saveIn = SAVE_DELAY;
  };

  function save() {
    saveIn = -1;
    lastSave = saveProgress(store, progress);
  }

  // ---------- layout ----------

  function toolIds() {
    return m && m.free ? ['street', 'fill', 'spray', 'size', 'drip', 'undo', 'clear'] : ['street', 'fill', 'spray', 'size', 'undo', 'clear'];
  }

  // Tries tools down the side and along the top, and a few palette shapes, and keeps
  // whichever gives the biggest wall (with the biggest swatches among near ties).
  function layoutPaint() {
    const { w, h } = size;
    const pad = clamp(w * 0.02, 8, 16);
    const tools = toolIds();
    const free = m.free;
    let best = null;
    for (const side of [true, false]) {
      for (const cols of [16, 8, 6]) {
        const rows = Math.ceil(SWATCHES.length / cols);
        const cell = Math.min((w - pad * 2) / cols, 104);
        if (cell < 40) continue;
        const stampCell = free ? Math.min((w - pad * 2) / STAMPS.length, cell * 1.05, 100) : 0;
        const tool = side
          ? clamp(w * 0.105, 54, 92)
          : clamp(Math.min((w - pad * 2) / tools.length - 6, h * 0.075), 44, 84);
        const bx = side ? pad + tool + pad : pad;
        const by = side ? pad : pad + tool + pad;
        const bw = w - bx - pad;
        const bh = h - by - pad - rows * cell - stampCell - pad * 0.5;
        if (side && tools.length * (tool + 8) > bh) continue;
        const s = Math.min(bw / WALL_W, bh / WALL_H);
        if (s <= 0) continue;
        // big swatches first (small fingers), then the biggest wall
        const score = (cell >= 60 ? 10 : 0) + s;
        if (!best || score > best.score) best = { side, cols, rows, cell, stampCell, tool, bx, by, bw, bh, s, pad, score };
      }
    }
    const L = best;
    const ww = WALL_W * L.s;
    const wh = WALL_H * L.s;
    view = { x: L.bx + (L.bw - ww) / 2, y: L.by + (L.bh - wh) / 2, w: ww, h: wh, s: L.s };
    buttons = [];
    // tools
    const n = tools.length;
    if (L.side) {
      const gap = Math.min(18, (L.bh - n * L.tool) / (n - 1));
      tools.forEach((id, k) => {
        // undo and clear sit at the bottom, away from the rest
        const fromEnd = n - 1 - k;
        const y = id === 'undo' || id === 'clear' ? L.by + L.bh - (fromEnd + 1) * L.tool - fromEnd * gap : L.by + k * (L.tool + gap);
        buttons.push({ id, x: L.pad, y, w: L.tool, h: L.tool });
      });
    } else {
      const gap = (size.w - L.pad * 2 - n * L.tool) / (n - 1);
      tools.forEach((id, k) => buttons.push({ id, x: L.pad + k * (L.tool + gap), y: L.pad, w: L.tool, h: L.tool }));
    }
    // palette along the bottom
    const palTop = h - L.pad * 0.5 - L.rows * L.cell;
    const palW = L.cols * L.cell;
    const px = (w - palW) / 2;
    SWATCHES.forEach((sw, k) => {
      const col = k % L.cols;
      const row = Math.floor(k / L.cols);
      buttons.push({ id: 'swatch', sw, x: px + col * L.cell, y: palTop + row * L.cell, w: L.cell, h: L.cell });
    });
    if (free) {
      const sw = STAMPS.length * L.stampCell;
      const sx = (w - sw) / 2;
      STAMPS.forEach((st, k) => buttons.push({ id: 'stamp', kind: st.id, x: sx + k * L.stampCell, y: palTop - L.stampCell, w: L.stampCell, h: L.stampCell }));
    }
    if (confirm) {
      const bs = clamp(Math.min(w, h) * 0.2, 80, 150);
      const cy = h / 2 + bs * 0.55;
      buttons = [
        { id: 'no', x: w / 2 - bs * 1.15, y: cy, w: bs, h: bs, fill: '#ff4d6d' },
        { id: 'yes', x: w / 2 + bs * 0.15, y: cy, w: bs, h: bs, fill: '#2fbf5b' },
      ];
    }
  }

  // The street: rows of warehouses, each with one wall.
  function layoutStreet() {
    const { w, h } = size;
    const pad = clamp(w * 0.025, 10, 20);
    const icon = clamp(w * 0.12, 48, 68);
    buttons = [{ id: 'home', x: pad, y: pad, w: icon, h: icon }];
    const cols = 4;
    const rows = Math.ceil(WALLS.length / cols);
    const top = icon + pad * 2;
    const rowH = (h - top - pad) / rows;
    const cellW = (w - pad * 2) / cols;
    let ph = rowH * 0.74;
    let pw = (ph * WALL_W) / WALL_H;
    if (pw > cellW * 0.84) {
      pw = cellW * 0.84;
      ph = (pw * WALL_H) / WALL_W;
    }
    WALLS.forEach((wm, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = pad + cellW * (col + 0.5);
      const ground = top + rowH * (row + 1) - rowH * 0.07;
      buttons.push({ id: 'wall', index: i, x: cx - pw / 2, y: ground - ph - rowH * 0.05, w: pw, h: ph, row, col, cellW, rowH, ground });
    });
  }

  function layout() {
    if (screen === 'street') layoutStreet();
    else layoutPaint();
  }

  // ---------- the wall's layers ----------

  function buildLayers() {
    const dpr = dprNow();
    const k = view.s * dpr;
    const cw = Math.round(WALL_W * k);
    const ch = Math.round(WALL_H * k);
    if (!layers || layers.fills.width !== cw || layers.fills.height !== ch) {
      layers = { k, fills: makeCanvas(cw, ch), paint: makeCanvas(cw, ch), lines: makeCanvas(cw, ch), staticPaint: null };
    }
    layers.k = k;
    redrawAll();
  }

  const redrawFills = (opts) => renderFills(layers.fills.getContext('2d'), m, wall.fills, layers.k, opts);
  const redrawLines = (opts) => renderLines(layers.lines.getContext('2d'), m, layers.k, opts);
  const redrawPaint = () => renderPaint(layers.paint.getContext('2d'), wall.marks, layers.k);
  function redrawAll() {
    redrawFills();
    redrawPaint();
    redrawLines();
  }
  function paintCtx() {
    const g = layers.paint.getContext('2d');
    g.setTransform(layers.k, 0, 0, layers.k, 0, 0);
    return g;
  }

  const toWall = (x, y) => ({ x: (x - view.x) / view.s, y: (y - view.y) / view.s });
  const onWall = (x, y) => x >= view.x && x <= view.x + view.w && y >= view.y && y <= view.y + view.h;

  // ---------- flow ----------

  function openWall(index) {
    m = WALLS[index];
    wall = progress.walls[m.id] || (progress.walls[m.id] = createWall(m));
    screen = 'paint';
    tool = 'fill';
    confirm = false;
    wipe = null;
    drips = [];
    popping = [];
    gesture = null;
    alive = null;
    sticker = null;
    layout();
    buildLayers();
    // a finished mural says hello when it's opened again
    // a picture that was coloured in before spray counted gets its star now
    if (checkSpray(m, wall)) {
      startAlive(true);
      sticker = { t: 0 };
      touched();
    } else if (wall.done && isComplete(wall) && m.alive) startAlive(false);
  }

  function toStreet() {
    settle();
    save();
    screen = 'street';
    m = null;
    wall = null;
    layers = null;
    alive = null;
    confirm = false;
    layout();
  }

  // Finishes anything animating so the layers match the wall.
  function settle() {
    if (!wall) return;
    if (wipe) {
      wipe = null;
      redrawFills();
    }
    if (alive) endAlive();
    if (drips.length) {
      const g = paintCtx();
      for (const d of drips) drawDrip(g, d.mark, d.d, d.cur, d.d.len);
      drips = [];
    }
    if (popping.length) {
      const g = paintCtx();
      for (const p of popping) drawStamp(g, p.mark);
      popping = [];
    }
  }

  // ---------- the celebration ----------

  function partShapes(part) {
    return m.regions.filter((r) => r.part === part).flatMap((r) => r.shapes);
  }

  function startAlive(confetti) {
    alive = { t: 0, confetti, parts: m.alive ? Object.keys(m.alive.parts || {}) : [] };
    // paint that stays put: everything not on a moving part
    if (alive.parts.length) {
      const sp = makeCanvas(layers.paint.width, layers.paint.height);
      const g = sp.getContext('2d');
      g.drawImage(layers.paint, 0, 0);
      g.setTransform(layers.k, 0, 0, layers.k, 0, 0);
      g.globalCompositeOperation = 'destination-out';
      for (const part of alive.parts) {
        g.beginPath();
        tracePath(g, partShapes(part));
        g.fill();
      }
      layers.staticPaint = sp;
    }
  }

  function endAlive() {
    alive = null;
    if (layers) {
      layers.staticPaint = null;
      redrawFills();
      redrawLines();
    }
  }

  const xformAt = (t) => (part) => {
    const f = m.alive?.parts?.[part];
    return f ? f(t) : null;
  };

  // ---------- painting ----------

  function fillAt(x, y) {
    const p = toWall(x, y);
    const i = regionAt(m, p.x, p.y);
    if (i < 0) return;
    if (wipe) {
      wipe = null;
      redrawFills();
    }
    const prev = wall.fills[i];
    const r = fillRegion(wall, i, paint());
    if (!r.changed) return;
    const b = m.regions[i].box;
    const rMax = Math.max(...[[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]].map(([cx, cy]) => Math.hypot(cx - p.x, cy - p.y)));
    wipe = { i, prev, paint: wall.fills[i], x: p.x, y: p.y, t: 0, rMax };
    touched();
    if (r.completed) {
      startAlive(true);
      sticker = { t: 0 };
    }
  }

  function doUndo() {
    settle();
    const what = undo(wall);
    if (!what) return;
    if (what === 'fills' || what === 'all') redrawFills();
    if (what === 'marks' || what === 'all') redrawPaint();
    checkSpray(m, wall);
    touched();
  }

  function doClear() {
    settle();
    if (clearWall(wall)) {
      redrawFills();
      redrawPaint();
      checkSpray(m, wall);
      touched();
    }
  }

  // ---------- drawing ----------

  function backdrop(ctx) {
    const { w, h } = size;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, C.night);
    g.addColorStop(0.6, C.dusk);
    g.addColorStop(1, '#c2368f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function drawPaintScreen(ctx) {
    const { w, h } = size;
    backdrop(ctx);
    // faint bricks on the building around the wall
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = 0, row = 0; y < h; y += 34, row++) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      for (let x = row % 2 ? 36 : 0; x < w; x += 72) {
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 34);
      }
    }
    ctx.stroke();

    const t = alive ? alive.t : 0;
    if (alive && alive.parts.length) {
      const xform = xformAt(t);
      redrawFills({ xform });
      redrawLines({ xform });
    } else if (wipe) {
      const k = Math.min(1, wipe.t / WIPE_TIME);
      const e = 1 - (1 - k) * (1 - k);
      redrawFills({ wipe: { ...wipe, r: 6 + e * wipe.rMax } });
    }

    // the wall, with a shadow
    ctx.fillStyle = 'rgba(10,4,30,0.45)';
    ctx.fillRect(view.x + 6, view.y + 8, view.w, view.h);
    ctx.drawImage(layers.fills, view.x, view.y, view.w, view.h);
    if (alive && layers.staticPaint) {
      ctx.drawImage(layers.staticPaint, view.x, view.y, view.w, view.h);
      const xform = xformAt(t);
      for (const part of alive.parts) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(view.x, view.y, view.w, view.h);
        ctx.clip();
        ctx.translate(view.x, view.y);
        ctx.scale(view.s, view.s);
        const f = xform(part);
        if (f) applyXf(ctx, f);
        ctx.beginPath();
        tracePath(ctx, partShapes(part));
        ctx.clip();
        ctx.drawImage(layers.paint, 0, 0, WALL_W, WALL_H);
        ctx.restore();
      }
    } else ctx.drawImage(layers.paint, view.x, view.y, view.w, view.h);

    // live things in wall units
    ctx.save();
    ctx.beginPath();
    ctx.rect(view.x, view.y, view.w, view.h);
    ctx.clip();
    ctx.translate(view.x, view.y);
    ctx.scale(view.s, view.s);
    for (const p of popping) {
      const u = Math.min(1, p.t / 0.28);
      const pop = p.held ? 1 : u < 1 ? 1 + Math.sin(u * Math.PI) * 0.25 : 1;
      drawStamp(ctx, p.mark, u < 1 && !p.held ? Math.max(0.2, u) * pop : pop);
    }
    ctx.restore();
    ctx.drawImage(layers.lines, view.x, view.y, view.w, view.h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(view.x, view.y, view.w, view.h);
    ctx.clip();
    ctx.translate(view.x, view.y);
    ctx.scale(view.s, view.s);
    drawTwinkles(ctx, m, wall.fills, time);
    // nearly done: a sparkle shows each spot still waiting for colour
    if (!m.free && !alive) {
      const left = blankRegions(wall);
      if (left.length && left.length <= Math.max(3, m.regions.length / 3)) {
        for (const i of left) {
          const p = regionPoint(m, i);
          if (Number.isFinite(p.x)) drawHint(ctx, p.x, p.y, time + i * 0.7);
        }
      }
    }
    if (alive && m.alive) {
      const xform = xformAt(t);
      const wk = m.alive.wink;
      if (wk) {
        let amount = 0;
        for (const a of wk.at) if (t > a && t < a + 0.45) amount = Math.sin(((t - a) / 0.45) * Math.PI);
        if (amount > 0) {
          ctx.save();
          const f = wk.part && xform(wk.part);
          if (f) applyXf(ctx, f);
          drawWink(ctx, wk, amount, wall.fills[regionAt(m, wk.x, wk.y + wk.r * 2.2)]);
          ctx.restore();
        }
      }
      for (const fx of m.alive.fx || []) {
        ctx.save();
        const f = fx.part && xform(fx.part);
        if (f) applyXf(ctx, f);
        drawFx(ctx, fx, t);
        ctx.restore();
      }
    }
    ctx.restore();
    // the frame
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.ink;
    ctx.strokeRect(view.x, view.y, view.w, view.h);

    // sticker for a finished mural
    if (wall.done) {
      const r = Math.max(18, view.w * 0.06);
      let sx = view.x + view.w - r * 0.6;
      let sy = view.y + r * 0.6;
      let k = 1;
      if (sticker && sticker.t < 1.2) {
        const u = Math.min(1, sticker.t / 1.2);
        const e = 1 - Math.pow(1 - u, 3);
        sx = w / 2 + (sx - w / 2) * e;
        sy = h / 2 + (sy - h / 2) * e;
        k = 1 + (1 - e) * 2.5;
      }
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(0.2 + Math.sin(time * 2) * 0.06);
      drawStar(ctx, 0, 0, r * k, C.gold);
      ctx.restore();
    }

    drawUi(ctx);
    if (alive && alive.confetti && alive.t < CONFETTI_TIME + 1.5) drawConfetti(ctx, w, h, alive.t);
    if (confirm) drawConfirm(ctx);
  }

  function drawUi(ctx) {
    const col = paintColour(paint());
    for (const b of buttons) {
      if (b.id === 'swatch') {
        const on = b.sw === swatch;
        const shown = b.sw === 's' || b.sw === 'd' ? paintFor(b.sw, base) : b.sw;
        drawSwatch(ctx, b.x + b.w / 2, b.y + b.h / 2, b.w * 0.4, shown, on, time);
      } else if (b.id === 'stamp') {
        const on = tool === 'stamp' && b.kind === stampKind;
        if (on) {
          ctx.fillStyle = 'rgba(255,225,77,0.9)';
          roundRect(ctx, b.x + 2, b.y + 2, b.w - 4, b.h - 4, b.w * 0.24);
          ctx.fill();
        }
        drawStampIcon(ctx, b.kind, b.x + b.w / 2, b.y + b.h / 2 + (on ? Math.sin(time * 5) * 2 : 0), b.w * (on ? 0.82 : 0.7), paint());
      } else if (b.id === 'yes' || b.id === 'no') {
        // drawn by drawConfirm
      } else {
        const on = b.id === tool || (b.id === 'drip' && drip);
        drawTool(ctx, b, on);
        const s = b.w * 0.74;
        const cx = b.x + b.w / 2;
        const cy = b.y + b.h / 2;
        if (b.id === 'street') glyph(ctx, 'street', cx, cy, s);
        else if (b.id === 'fill') glyph(ctx, 'bucket', cx, cy, s, { colour: col });
        else if (b.id === 'spray') glyph(ctx, 'spray', cx, cy, s, { colour: col });
        else if (b.id === 'size') glyph(ctx, 'size', cx, cy, s, { size: brush, colour: col });
        else if (b.id === 'drip') glyph(ctx, 'drip', cx, cy, s, { colour: col });
        else if (b.id === 'undo') glyph(ctx, 'undo', cx, cy, s);
        else if (b.id === 'clear') glyph(ctx, 'trash', cx, cy, s);
      }
    }
  }

  function drawConfirm(ctx) {
    const { w, h } = size;
    ctx.fillStyle = 'rgba(15,6,40,0.72)';
    ctx.fillRect(0, 0, w, h);
    const yes = buttons.find((b) => b.id === 'yes');
    const no = buttons.find((b) => b.id === 'no');
    // a little picture: the wall being wiped clean
    const pw = Math.min(w * 0.36, 220);
    const ph = (pw * WALL_H) / WALL_W;
    const px = w / 2 - pw / 2;
    const py = yes.y - ph - yes.h * 0.4;
    const th = thumbFor(m, wall, pw);
    ctx.drawImage(th, px, py, pw, ph);
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.white;
    ctx.strokeRect(px, py, pw, ph);
    ctx.save();
    ctx.translate(px + pw, py + ph);
    glyph(ctx, 'trash', 0, 0, pw * 0.55);
    ctx.restore();
    for (const b of [no, yes]) {
      const bob = b.id === 'no' ? 0 : Math.sin(time * 4) * 3;
      drawTool(ctx, { ...b, y: b.y + bob }, false);
      glyph(ctx, b.id === 'yes' ? 'tick' : 'cross', b.x + b.w / 2, b.y + bob + b.h / 2, b.w * 0.8);
    }
  }

  function thumbFor(wm, wl, cssW) {
    const pw = Math.max(16, Math.round(cssW * dprNow()));
    const ver = versions[wm.id];
    const hitc = thumbs.get(wm.id);
    if (hitc && hitc.ver === ver && hitc.w === pw) return hitc.canvas;
    const canvas = renderWallImage(wm, wl, pw, lineCache);
    thumbs.set(wm.id, { ver, w: pw, canvas });
    return canvas;
  }

  const BUILDINGS = ['#ff8a65', '#4dd0c8', '#ffd54f', '#b388ff', '#ff6fae', '#7cc4ff', '#9ccc65', '#ffab40'];

  function drawStreet(ctx) {
    const { w, h } = size;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#ff9a5a');
    g.addColorStop(0.35, '#ff5f8f');
    g.addColorStop(1, '#7a1fa2');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const home = buttons[0];
    drawTool(ctx, home);
    glyph(ctx, 'home', home.x + home.w / 2, home.y + home.h / 2, home.w * 0.72);
    outlined(ctx, 'Mural Maker', w / 2, home.y + home.h / 2, Math.min(home.h * 0.62, w / 10), C.sun, w - (home.x + home.w) * 2 - 20);
    const walls = buttons.filter((b) => b.id === 'wall');
    // one sidewalk per row, behind the buildings' feet
    const rows = new Map();
    for (const b of walls) rows.set(b.row, b);
    for (const b of rows.values()) {
      ctx.fillStyle = '#5b3a8c';
      ctx.fillRect(0, b.ground, w, b.rowH * 0.07);
      ctx.fillStyle = '#d9cfe8';
      ctx.fillRect(0, b.ground - 2, w, b.rowH * 0.035);
    }
    for (const b of walls) {
      const wm = WALLS[b.index];
      const wl = progress.walls[wm.id];
      // the warehouse
      const bx = b.x - b.w * 0.09;
      const bw = b.w * 1.18;
      const top = b.y - b.rowH * 0.1 - ((b.index * 7) % 3) * b.rowH * 0.03;
      ctx.fillStyle = BUILDINGS[b.index % BUILDINGS.length];
      ctx.fillRect(bx, top, bw, b.ground - top);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(bx, top, bw, Math.max(4, b.rowH * 0.025));
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = C.ink;
      ctx.strokeRect(bx, top, bw, b.ground - top);
      // the mural
      const th = thumbFor(wm, wl, b.w);
      ctx.drawImage(th, b.x, b.y, b.w, b.h);
      if (wm.free && isBlank(wl)) {
        ctx.globalAlpha = 0.5;
        glyph(ctx, 'spray', b.x + b.w / 2, b.y + b.h / 2, b.w * 0.6);
        ctx.globalAlpha = 1;
      }
      ctx.lineWidth = 3;
      ctx.strokeStyle = C.ink;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      if (wl.done) {
        ctx.save();
        ctx.translate(b.x + b.w - 4, b.y + 4);
        ctx.rotate(0.25 + Math.sin(time * 2 + b.index) * 0.08);
        drawStar(ctx, 0, 0, Math.max(12, b.w * 0.2));
        ctx.restore();
      }
    }
  }

  // ---------- debug hook ----------

  if (debug) {
    window.__mural = {
      walls: () => WALLS.map((wm, i) => ({ i, id: wm.id, regions: wm.regions.length, free: wm.free })),
      screen: () => screen,
      open: (id) => openWall(typeof id === 'string' ? WALLS.findIndex((wm) => wm.id === id) : id),
      street: () => toStreet(),
      wall: () => wall && JSON.parse(JSON.stringify({ ...wall, history: wall.history.length })),
      progress: () => JSON.parse(store.getItem('mural-maker-progress') || 'null'),
      savedChars: () => lastSave,
      save: () => save(),
      view: () => ({ ...view }),
      buttons: () => buttons.map((b) => ({ ...b })),
      tool: () => ({ tool, swatch, base, brush, drip, stampKind, paint: paint() }),
      alive: () => alive && { t: alive.t },
      // a screen point inside region i of the open wall (finger target)
      regionPoint(i) {
        const p = regionPoint(m, i);
        return { x: view.x + p.x * view.s, y: view.y + p.y * view.s };
      },
      toScreen: (x, y) => ({ x: view.x + x * view.s, y: view.y + y * view.s }),
      // fills every empty region (as if tapped) with a run of colours
      fillAll(paints = ['0', '1', '2', '3', '4', '5', '6', '7', '8', 'r', 'g', 's4', 'd7']) {
        m.regions.forEach((r, i) => {
          if (!wall.fills[i]) {
            const res = fillRegion(wall, i, paints[i % paints.length]);
            if (res.completed) {
              startAlive(true);
              sticker = { t: 0 };
            }
          }
        });
        redrawFills();
        touched();
      },
      // the blank line art of a wall as a PNG
      muralImage(id, width = 600) {
        const wm = byId.get(id);
        return renderWallImage(wm, createWall(wm), width).toDataURL('image/png');
      },
    };
  }

  const api = {
    resize(w, h) {
      size = { w, h };
      layout();
      if (screen === 'paint') {
        settle();
        buildLayers();
      }
    },

    update(dt) {
      time += dt;
      if (saveIn >= 0) {
        saveIn -= dt;
        if (saveIn < 0) save();
      }
      if (screen !== 'paint') return;
      if (wipe) {
        wipe.t += dt;
        if (wipe.t >= WIPE_TIME) {
          wipe = null;
          redrawFills();
        }
      }
      if (drips.length) {
        const g = paintCtx();
        for (const d of drips) {
          const next = Math.min(d.d.len, d.cur + DRIP_SPEED * dt * (1 - (d.cur / d.d.len) * 0.6));
          drawDrip(g, d.mark, d.d, d.cur, next, next >= d.d.len);
          d.cur = next;
        }
        drips = drips.filter((d) => d.cur < d.d.len);
      }
      if (popping.length) {
        for (const p of popping) if (!p.held) p.t += dt;
        const done = popping.filter((p) => !p.held && p.t >= 0.3);
        if (done.length) {
          const g = paintCtx();
          for (const p of done) drawStamp(g, p.mark);
          popping = popping.filter((p) => !done.includes(p));
        }
      }
      if (sticker) {
        sticker.t += dt;
        if (sticker.t > 1.5) sticker = null;
      }
      if (alive) {
        alive.t += dt;
        if (alive.t > Math.max(alive.parts.length ? ALIVE_TIME : 0, alive.confetti ? CONFETTI_TIME + 1.5 : 0)) endAlive();
      }
    },

    draw(ctx) {
      if (screen === 'street') drawStreet(ctx);
      else drawPaintScreen(ctx);
    },

    onPickUp(x, y) {
      if (screen !== 'paint' || confirm) return false;
      if (buttons.some((b) => hit(b, x, y))) return false;
      if (!onWall(x, y) || tool === 'fill') return false;
      if (alive) endAlive();
      const p = toWall(x, y);
      if (tool === 'spray') {
        const seed = 1 + Math.floor(Math.random() * 99999);
        const mark = startStroke(wall, { paint: paint(), size: brush, x: p.x, y: p.y, seed, drip: m.free && drip });
        drawStroke(paintCtx(), mark, 0);
        gesture = { kind: 'spray', marks: [mark] };
        return true;
      }
      // stamp
      for (const pp of popping) pp.held = false;
      const mark = addStamp(wall, { kind: stampKind, x: p.x, y: p.y, size: STAMP_SIZE, paint: paint(), seed: 1 + Math.floor(Math.random() * 99999) });
      popping.push({ mark, t: 0, held: false });
      gesture = { kind: 'stamp', mark, x0: p.x, y0: p.y, entry: popping[popping.length - 1] };
      return true;
    },

    onDrag(x, y) {
      if (!gesture) return;
      const p = toWall(x, y);
      if (gesture.kind === 'spray') {
        const r = extendStroke(wall, p.x, p.y);
        if (!r) return;
        if (r.mark !== gesture.marks[gesture.marks.length - 1]) gesture.marks.push(r.mark);
        drawStroke(paintCtx(), r.mark, r.from);
      } else {
        const d = Math.hypot(p.x - gesture.x0, p.y - gesture.y0);
        if (d > 14) {
          gesture.entry.held = true;
          gesture.entry.t = 1;
          resizeStamp(gesture.mark, d * 2.1);
        }
      }
    },

    onDrop(x, y) {
      if (!gesture) return;
      api.onDrag(x, y);
      if (gesture.kind === 'spray') {
        endStroke(wall);
        for (const mk of gesture.marks) for (const d of dripsFor(mk)) drips.push({ mark: mk, d, cur: 0 });
        if (checkSpray(m, wall)) {
          startAlive(true);
          sticker = { t: 0 };
        }
      } else if (gesture.entry.held) {
        gesture.entry.held = false;
        gesture.entry.t = 0.3;
      }
      gesture = null;
      touched();
    },

    onTap(x, y) {
      if (screen === 'street') {
        const b = buttons.find((r) => hit(r, x, y));
        if (!b) return;
        if (b.id === 'home') {
          save();
          host.exit();
        } else if (b.id === 'wall') openWall(b.index);
        return;
      }
      const b = buttons.find((r) => hit(r, x, y));
      if (confirm) {
        if (b && b.id === 'yes') doClear();
        if (b && (b.id === 'yes' || b.id === 'no')) {
          confirm = false;
          layout();
        }
        return;
      }
      if (!b) {
        if (onWall(x, y) && tool === 'fill') {
          if (alive && alive.t > 0.3) endAlive();
          fillAt(x, y);
        }
        return;
      }
      if (b.id === 'street') toStreet();
      else if (b.id === 'fill' || b.id === 'spray') tool = b.id;
      else if (b.id === 'size') {
        brush = (brush + 1) % BRUSHES.length;
        tool = 'spray';
      } else if (b.id === 'drip') drip = !drip;
      else if (b.id === 'undo') doUndo();
      else if (b.id === 'clear') {
        settle();
        confirm = true;
        layout();
      } else if (b.id === 'swatch') {
        swatch = b.sw;
        if (/^\d+$/.test(b.sw)) base = Number(b.sw);
      } else if (b.id === 'stamp') {
        stampKind = b.kind;
        tool = 'stamp';
      }
    },
  };

  const start = params.get('mural');
  layout();
  if (start && byId.has(start)) {
    size = { w: window.innerWidth || 820, h: window.innerHeight || 1180 };
    openWall(WALLS.findIndex((wm) => wm.id === start));
  }
  return api;
}

// ---------------------------------------------------------------------------------------------
// Launcher tile: the flamingo mural colouring itself in, one region at a time
// ---------------------------------------------------------------------------------------------

const TILE_PAINTS = ['5', '2', '10', '4', '3', '8', '8', '8', '1', '8', '10', '11'];
const TILE_STEP = 0.45;
let tileCache = null;

function drawTile(ctx, x, y, w, h, time) {
  const tm = WALLS[0];
  const n = tm.regions.length;
  const cycle = n * TILE_STEP + 2.2;
  const t = time % cycle;
  const step = Math.min(n, Math.floor(t / TILE_STEP));
  // the wall: 3:4 inside the tile
  let ph = h * 0.9;
  let pw = (ph * WALL_W) / WALL_H;
  if (pw > w * 0.7) {
    pw = w * 0.7;
    ph = (pw * WALL_H) / WALL_W;
  }
  const px = x + (w - pw) / 2;
  const py = y + (h - ph) / 2;
  const dpr = dprNow();
  const key = `${Math.round(pw * dpr)}`;
  if (!tileCache || tileCache.key !== key) {
    const cw = Math.round(pw * dpr);
    const ch = Math.round(ph * dpr);
    const lines = makeCanvas(cw, ch);
    renderLines(lines.getContext('2d'), tm, cw / WALL_W);
    tileCache = { key, lines, fills: makeCanvas(cw, ch), step: -1 };
  }
  if (tileCache.step !== step) {
    const fills = tm.regions.map((_, i) => (i < step ? TILE_PAINTS[i] : null));
    renderFills(tileCache.fills.getContext('2d'), tm, fills, tileCache.fills.width / WALL_W);
    tileCache.step = step;
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  // a brick warehouse
  ctx.fillStyle = '#c4563f';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(60,20,20,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const bh = Math.max(8, h / 14);
  for (let row = 0, yy = y; yy < y + h; yy += bh, row++) {
    ctx.moveTo(x, yy);
    ctx.lineTo(x + w, yy);
    for (let xx = x + (row % 2 ? bh : 0); xx < x + w; xx += bh * 2) {
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx, yy + bh);
    }
  }
  ctx.stroke();
  ctx.drawImage(tileCache.fills, px, py, pw, ph);
  ctx.drawImage(tileCache.lines, px, py, pw, ph);
  ctx.lineWidth = 2;
  ctx.strokeStyle = C.ink;
  ctx.strokeRect(px, py, pw, ph);
  // the spray can, hovering over the region being painted
  if (step < n) {
    const p = regionPoint(tm, step);
    const cx = px + (p.x / WALL_W) * pw;
    const cy = py + (p.y / WALL_H) * ph;
    const u = (t % TILE_STEP) / TILE_STEP;
    ctx.fillStyle = paintColour(TILE_PAINTS[step]);
    for (let k = 0; k < 6; k++) {
      const a = k * 1.3 + time * 7;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * pw * 0.05 * u, cy + Math.sin(a) * pw * 0.05 * u, Math.max(1.5, pw * 0.014), 0, Math.PI * 2);
      ctx.fill();
    }
    glyph(ctx, 'spray', cx + pw * 0.1, cy - ph * 0.08, Math.max(20, pw * 0.34), { colour: paintColour(TILE_PAINTS[step]) });
  } else {
    // finished: a star pops on
    const u = Math.min(1, (t - n * TILE_STEP) / 0.4);
    drawStar(ctx, px + pw - 4, py + 4, Math.max(8, pw * 0.13) * (0.4 + u * 0.6));
  }
  ctx.restore();
}
