// Canvas drawing and layout. No game rules: it only reads state.
import { SLOT_Y } from './constants.js';

const BLOCK = 4; // block size in cells
const PICKER_GAP = 0.5;
const MARGIN = 1.5;
const COLUMN_CHOICES = [3, 5, 9];

export const COLOURS = {
  bg: '#17152a',
  soil: '#2a2140',
  tunnel: '#6b5a80',
  slot: '#4a4170',
  ant: '#1a1014',
  text: '#ffffff',
  button: '#ffd93b',
  buttonText: '#17152a',
};

function pickerShape(cols, n) {
  const rows = Math.ceil(n / cols);
  return { rows, height: rows * BLOCK + (rows - 1) * PICKER_GAP };
}

// Pure. Picks the picker column count from [3, 5, 9] that gives the largest picture.
// Sizes are worked out in units of a standard cell (1/24 of the picture width); a level
// with `scale` 2 has cells half that size, so blocks and slots stay the same on screen.
export function computeLayout(width, height, level) {
  const k = level.scale ?? 1;
  const cols = level.rows[0].length;
  const rows = level.rows.length;
  const W = cols / k;
  const H = rows / k;
  const nSlots = level.slots ?? 3;
  const nPicker = level.pickerSize ?? 9;
  const slotGap = SLOT_Y + 0.5; // picture bottom edge to slot centre
  let best = null;
  for (const choice of COLUMN_CHOICES) {
    const c = Math.min(choice, nPicker);
    const { height: ph } = pickerShape(c, nPicker);
    const needW = Math.max(W + 2, c * (BLOCK + PICKER_GAP) + 1.5);
    const needH = MARGIN + H + slotGap + BLOCK / 2 + 1 + ph + MARGIN;
    const unit = Math.min(width / needW, height / needH);
    if (!best || unit > best.unit + 1e-9) best = { pickerCols: c, unit, needH };
  }
  const { pickerCols, unit, needH } = best;
  const cell = unit / k;
  // Cell (x, y) is centred at toScreen(x, y); the picture spans -0.5 .. cols - 0.5.
  const originX = (width - W * unit) / 2;
  const originY = (height - needH * unit) / 2 + MARGIN * unit;
  const toScreen = (gx, gy) => ({ x: originX + (gx + 0.5) * cell, y: originY + (gy + 0.5) * cell });
  const size = BLOCK * unit;

  const slotRects = [];
  for (let i = 0; i < nSlots; i++) {
    const c = toScreen(((i + 0.5) * cols) / nSlots - 0.5, rows + SLOT_Y * k + (k - 1) / 2);
    slotRects.push({ x: c.x - size / 2, y: c.y - size / 2, w: size, h: size });
  }

  const pickerRects = [];
  const pickerTop = slotRects[0].y + size + unit;
  for (let i = 0; i < nPicker; i++) {
    const row = Math.floor(i / pickerCols);
    const inRow = Math.min(pickerCols, nPicker - row * pickerCols);
    const col = i - row * pickerCols;
    const rowW = inRow * size + (inRow - 1) * PICKER_GAP * unit;
    pickerRects.push({
      x: width / 2 - rowW / 2 + col * (size + PICKER_GAP * unit),
      y: pickerTop + row * (size + PICKER_GAP * unit),
      w: size,
      h: size,
    });
  }

  const hb = Math.max(44, 2 * unit);
  const homeBtn = { x: 8, y: 8, w: hb, h: hb };
  // On a finer grid ants are drawn a little bigger than a cell so they stay visible.
  const antSize = k === 1 ? cell : cell * 1.5;

  return {
    width, height, W: cols, H: rows, cell, unit, antSize, originX, originY, toScreen,
    slotRects, pickerRects, homeBtn, blockSize: BLOCK * k,
  };
}

// ---------- helpers ----------

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function textOn(hex) {
  return luminance(hex) > 0.4 ? '#111111' : '#ffffff';
}

function font(px, weight = 900) {
  return `${weight} ${Math.round(px)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
}

// A colour block: rounded square with its count in the middle.
export function drawBlock(ctx, cx, cy, size, hex, count) {
  const x = cx - size / 2;
  const y = cy - size / 2;
  ctx.fillStyle = hex;
  roundRect(ctx, x, y, size, size, size * 0.18);
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, size * 0.03);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.stroke();
  ctx.fillStyle = textOn(hex);
  ctx.font = font(size * (count >= 10 ? 0.46 : 0.56));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(count), cx, cy + size * 0.03);
}

// The picture is kept on a small offscreen canvas, one canvas pixel per cell, and only
// repainted when a pixel has been taken. Each frame then draws it with a single scaled blit.
let pictureCache = null;

function pictureCanvas(state) {
  if (!pictureCache || pictureCache.state !== state) {
    const canvas = document.createElement('canvas');
    canvas.width = state.w;
    canvas.height = state.h;
    pictureCache = { state, remaining: -1, canvas, ctx: canvas.getContext('2d') };
  }
  if (pictureCache.remaining !== state.remaining) {
    const { ctx } = pictureCache;
    const palette = state.level.palette;
    ctx.fillStyle = COLOURS.tunnel;
    ctx.fillRect(0, 0, state.w, state.h);
    for (let y = 0; y < state.h; y++) {
      const row = state.grid[y];
      for (let x = 0; x < state.w; x++) {
        if (row[x] === null) continue;
        ctx.fillStyle = palette[row[x]];
        ctx.fillRect(x, y, 1, 1);
      }
    }
    pictureCache.remaining = state.remaining;
  }
  return pictureCache.canvas;
}

function drawPicture(ctx, layout, state) {
  const tl = layout.toScreen(-0.5, -0.5);
  const smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(pictureCanvas(state), tl.x, tl.y, state.w * layout.cell, state.h * layout.cell);
  ctx.imageSmoothingEnabled = smooth;
}

// Remembers each ant's last position to work out which way it faces.
const headings = new WeakMap();

function drawAnt(ctx, layout, ant, time, carry) {
  const p = layout.toScreen(ant.pos.x, ant.pos.y);
  const prev = headings.get(ant);
  let angle = prev ? prev.angle : -Math.PI / 2;
  if (prev) {
    const dx = ant.pos.x - prev.x;
    const dy = ant.pos.y - prev.y;
    if (dx * dx + dy * dy > 1e-6) angle = Math.atan2(dy, dx);
  }
  headings.set(ant, { x: ant.pos.x, y: ant.pos.y, angle });
  drawAntAt(ctx, p.x, p.y, angle, layout.antSize, time * 24 + ant.target.x + ant.target.y, carry);
}

// An ant centred at (x, y) facing `angle`, about `s` px long. `phase` drives the leg wiggle.
function drawAntAt(ctx, x, y, angle, s, phase, carry, colour = COLOURS.ant) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(1, s * 0.07);
  const wig = Math.sin(phase) * s * 0.12;
  for (const k of [-1, 0, 1]) {
    const lx = k * s * 0.18;
    const w = k === 0 ? -wig : wig;
    ctx.beginPath();
    ctx.moveTo(lx, 0);
    ctx.lineTo(lx + w, -s * 0.42);
    ctx.moveTo(lx, 0);
    ctx.lineTo(lx - w, s * 0.42);
    ctx.stroke();
  }
  // body: abdomen, thorax, head
  ctx.fillStyle = colour;
  for (const [ox, rx, ry] of [
    [-s * 0.32, s * 0.22, s * 0.17],
    [0, s * 0.13, s * 0.1],
    [s * 0.26, s * 0.14, s * 0.13],
  ]) {
    ctx.beginPath();
    ctx.ellipse(ox, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (carry) {
    const q = s * 0.42;
    ctx.fillStyle = carry;
    ctx.fillRect(-s * 0.1 - q / 2, -q / 2, q, q);
    ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeRect(-s * 0.1 - q / 2, -q / 2, q, q);
  }
  ctx.restore();
}

function drawHomeButton(ctx, r) {
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, r.x, r.y, r.w, r.h, r.w * 0.22);
  ctx.fill();
  // a little house
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const s = r.w * 0.32;
  ctx.fillStyle = COLOURS.text;
  ctx.beginPath();
  ctx.moveTo(cx - s, cy - s * 0.05);
  ctx.lineTo(cx, cy - s);
  ctx.lineTo(cx + s, cy - s * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(cx - s * 0.7, cy - s * 0.1, s * 1.4, s * 0.95);
}

function drawPlay(ctx, layout, view) {
  const { state, drag, time } = view;
  const cell = layout.unit;
  const palette = state.level.palette;

  // soil band from the picture down to below the slots
  const top = layout.toScreen(-0.5, state.h - 0.5).y;
  const bottom = layout.slotRects[0].y + layout.slotRects[0].h + cell * 0.5;
  ctx.fillStyle = COLOURS.soil;
  ctx.fillRect(0, top, layout.width, bottom - top);

  drawPicture(ctx, layout, state);

  // slots
  state.slots.forEach((slot, i) => {
    const r = layout.slotRects[i];
    ctx.lineWidth = Math.max(2, cell * 0.18);
    ctx.setLineDash([cell * 0.6, cell * 0.4]);
    ctx.strokeStyle = COLOURS.slot;
    roundRect(ctx, r.x, r.y, r.w, r.h, r.w * 0.18);
    ctx.stroke();
    ctx.setLineDash([]);
    if (slot) drawBlock(ctx, r.x + r.w / 2, r.y + r.h / 2, r.w, palette[slot.colour], slot.count);
  });

  // picker
  state.picker.forEach((b, i) => {
    if (!b || (drag && drag.pickerIndex === i)) return;
    const r = layout.pickerRects[i];
    drawBlock(ctx, r.x + r.w / 2, r.y + r.h / 2, r.w, palette[b.colour], b.count);
  });

  for (const ant of state.ants) drawAnt(ctx, layout, ant, time, ant.phase === 'back' ? palette[ant.colour] : null);

  drawHomeButton(ctx, layout.homeBtn);

  if (drag) {
    const b = state.picker[drag.pickerIndex];
    if (b) {
      const size = layout.pickerRects[0].w * 1.15;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = size * 0.2;
      ctx.shadowOffsetY = size * 0.08;
      drawBlock(ctx, drag.x, drag.y, size, palette[b.colour], b.count);
      ctx.restore();
    }
  }
}

// ---------- home screen ----------

export const PAGE_SIZE = 4;

// Pure. One page of level thumbnail buttons (2 x 2) below the title, plus 'prev' / 'next'
// page buttons along the bottom when there is more than one page.
// Level rects cover the picture and its name label; `index` is the index into `levels`.
export function homeButtons(width, height, levels, page = 0) {
  const pages = Math.ceil(levels.length / PAGE_SIZE);
  const cols = 2;
  const rows = 2;
  const edge = Math.max(16, height * 0.03);
  const navH = pages > 1 ? Math.max(56, Math.min(84, height * 0.075)) : 0;
  const top = height * 0.2;
  const bottom = height - edge - (navH ? navH + edge * 0.6 : 0);
  const gap = Math.max(16, width * 0.05);
  const labelH = Math.max(28, height * 0.04);
  // Picture aspect 3:4 plus a label strip.
  const maxW = (width - gap * (cols + 1)) / cols;
  const maxH = (bottom - top - gap * (rows - 1)) / rows;
  const w = Math.min(maxW, ((maxH - labelH) * 3) / 4);
  const h = (w * 4) / 3 + labelH;
  const totalW = cols * w + (cols - 1) * gap;
  const totalH = rows * h + (rows - 1) * gap;
  const x0 = (width - totalW) / 2;
  const y0 = top + (bottom - top - totalH) / 2;
  const buttons = levels.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((level, i) => ({
    id: 'level',
    index: page * PAGE_SIZE + i,
    x: x0 + (i % cols) * (w + gap),
    y: y0 + Math.floor(i / cols) * (h + gap),
    w,
    h,
    labelH,
  }));
  const gear = Math.max(44, Math.min(64, width * 0.11));
  buttons.push({ id: 'exit', x: 12, y: 12, w: gear, h: gear });
  buttons.push({ id: 'settings', x: width - gear - 12, y: 12, w: gear, h: gear });
  if (pages > 1) {
    const y = height - edge - navH;
    const off = Math.max(navH * 1.6, width * 0.22);
    if (page > 0) buttons.push({ id: 'prev', x: width / 2 - off - navH / 2, y, w: navH, h: navH });
    if (page < pages - 1) buttons.push({ id: 'next', x: width / 2 + off - navH / 2, y, w: navH, h: navH });
  }
  return buttons;
}

// Draws a level's full picture into a w x h box at (x, y).
function drawThumbnail(ctx, level, x, y, w, h) {
  const rows = level.rows;
  const cw = w / rows[0].length;
  const ch = h / rows.length;
  for (let gy = 0; gy < rows.length; gy++) {
    for (let gx = 0; gx < rows[gy].length; gx++) {
      ctx.fillStyle = level.palette[rows[gy][gx]];
      ctx.fillRect(x + gx * cw, y + gy * ch, cw + 0.5, ch + 0.5);
    }
  }
}

// Launcher tile art: a picture with a line of ants carrying pixels along the bottom.
export function drawGameTile(ctx, level, x, y, w, h, time) {
  drawThumbnail(ctx, level, x, y, w, h);
  const colours = Object.values(level.palette);
  const s = w * 0.16;
  const n = 4;
  for (let i = 0; i < n; i++) {
    const ax = x + ((time * w * 0.12 + (i * w) / n) % (w + s)) - s / 2;
    if (ax < x + s * 0.6 || ax > x + w - s * 0.6) continue;
    drawAntAt(ctx, ax, y + h - s * 0.7, 0, s, time * 18 + i * 2, colours[(i * 3 + 2) % colours.length]);
  }
}

function drawTick(ctx, cx, cy, r) {
  ctx.fillStyle = '#3fbf5f';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = r * 0.12;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.lineWidth = r * 0.28;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.45, cy + r * 0.02);
  ctx.lineTo(cx - r * 0.1, cy + r * 0.38);
  ctx.lineTo(cx + r * 0.5, cy - r * 0.35);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
}

function drawHome(ctx, layout, view) {
  const { width, height } = layout;
  const t = view.time;
  ctx.fillStyle = COLOURS.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const titlePx = Math.min(height * 0.08, width / 7);
  ctx.font = font(titlePx);
  ctx.fillText('Pixel Ants', width / 2, height * 0.1);
  // a little ant marching under the title
  const span = Math.min(width * 0.6, titlePx * 6);
  const ax = width / 2 - span / 2 + ((t * 60) % span);
  drawAntAt(ctx, ax, height * 0.1 + titlePx * 0.75, 0, titlePx * 0.45, t * 20, null, '#ffd93b');

  if (view.suffix) {
    ctx.fillStyle = COLOURS.button;
    ctx.font = font(titlePx * 0.32, 800);
    ctx.fillText('HARD', width / 2, height * 0.1 + titlePx * 1.35);
  }

  for (const b of view.buttons) {
    if (b.id === 'settings') {
      drawGear(ctx, b);
      continue;
    }
    if (b.id === 'exit') {
      drawHomeButton(ctx, b);
      continue;
    }
    if (b.id !== 'level') {
      // round page button with an arrow
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const dir = b.id === 'next' ? 1 : -1;
      ctx.fillStyle = COLOURS.button;
      ctx.beginPath();
      ctx.arc(cx, cy, b.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLOURS.buttonText;
      ctx.beginPath();
      ctx.moveTo(cx + dir * b.w * 0.2, cy);
      ctx.lineTo(cx - dir * b.w * 0.12, cy - b.w * 0.2);
      ctx.lineTo(cx - dir * b.w * 0.12, cy + b.w * 0.2);
      ctx.closePath();
      ctx.fill();
      continue;
    }
    const level = view.levels[b.index];
    const picH = b.h - b.labelH;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRect(ctx, b.x - 6, b.y - 6, b.w + 12, b.h + 12, 14);
    ctx.fill();
    drawThumbnail(ctx, level, b.x, b.y, b.w, picH);
    ctx.fillStyle = COLOURS.text;
    ctx.font = font(b.labelH * 0.75, 800);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(level.name, b.x + b.w / 2, b.y + picH + b.labelH * 0.55);
    if (view.progress.includes(level.name + view.suffix)) {
      const r = Math.max(18, b.w * 0.14);
      drawTick(ctx, b.x + b.w - r * 0.6, b.y + r * 0.6, r);
    }
  }
  // page dots between the arrows
  const pages = Math.ceil(view.levels.length / PAGE_SIZE);
  const nav = view.buttons.find((b) => b.id === 'prev' || b.id === 'next');
  if (pages > 1 && nav) {
    const r = nav.h * 0.11;
    for (let i = 0; i < pages; i++) {
      ctx.fillStyle = i === view.page ? COLOURS.text : 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(width / 2 + (i - (pages - 1) / 2) * r * 4, nav.y + nav.h / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ---------- settings ----------

function drawGear(ctx, b) {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const r = b.w * 0.3;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, b.x, b.y, b.w, b.h, b.w * 0.22);
  ctx.fill();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = COLOURS.text;
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-r * 0.22, -r * 1.3, r * 0.44, r * 0.6);
  }
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a4660';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Pure. Settings screen buttons: difficulty choices and a way back.
export function settingsButtons(width, height) {
  const bw = Math.min(width * 0.8, 420);
  const bh = Math.max(64, Math.min(96, height * 0.085));
  const x = (width - bw) / 2;
  const top = height * 0.3;
  return [
    { id: 'easy', label: 'Easy', x, y: top, w: bw, h: bh },
    { id: 'hard', label: 'Hard', x, y: top + bh * 1.3, w: bw, h: bh },
    { id: 'back', label: 'Done', x, y: height - Math.max(24, height * 0.05) - bh, w: bw, h: bh },
  ];
}

function drawSettings(ctx, layout, view) {
  const { width, height } = layout;
  ctx.fillStyle = COLOURS.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const titlePx = Math.min(height * 0.065, width / 8);
  ctx.font = font(titlePx);
  ctx.fillText('Settings', width / 2, height * 0.09);
  ctx.font = font(titlePx * 0.5, 800);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('How hard?', width / 2, height * 0.22);
  for (const b of view.buttons) {
    if (b.id === 'back') {
      drawButton(ctx, b, false);
      continue;
    }
    const on = view.difficulty === b.id;
    drawButton(ctx, b, on);
    if (!on) {
      ctx.fillStyle = 'rgba(23,21,42,0.55)';
      roundRect(ctx, b.x, b.y, b.w, b.h, b.h * 0.3);
      ctx.fill();
    }
  }
  const hard = view.buttons.find((b) => b.id === 'hard');
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = font(Math.min(titlePx * 0.36, width / 24), 700);
  const y = hard.y + hard.h * 1.45;
  const lh = Math.min(titlePx * 0.5, width / 17);
  ctx.fillText('Hard uses the same pictures with', width / 2, y);
  ctx.fillText('four times as many pixels.', width / 2, y + lh);
}

// ---------- overlays ----------

// Pure. Buttons for an overlay: 'won' -> next (if hasNext) + home; 'stuck' -> retry.
export function overlayButtons(width, height, overlay, hasNext) {
  const bw = Math.min(width * 0.8, 420);
  const bh = Math.max(64, Math.min(96, height * 0.08));
  const gap = bh * 0.3;
  const x = (width - bw) / 2;
  if (overlay === 'stuck') {
    return [{ id: 'retry', label: 'Try again', x, y: height * 0.55, w: bw, h: bh }];
  }
  const ids = hasNext ? ['next', 'home'] : ['home'];
  const labels = { next: 'Next picture', home: 'Home' };
  const bottom = height - Math.max(24, height * 0.04);
  return ids.map((id, i) => ({
    id,
    label: labels[id],
    x,
    y: bottom - (ids.length - i) * bh - (ids.length - i - 1) * gap,
    w: bw,
    h: bh,
  }));
}

function drawButton(ctx, b, primary) {
  ctx.fillStyle = primary ? COLOURS.button : 'rgba(255,255,255,0.9)';
  roundRect(ctx, b.x, b.y, b.w, b.h, b.h * 0.3);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.stroke();
  ctx.fillStyle = COLOURS.buttonText;
  ctx.font = font(b.h * 0.42, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
}

function drawStuck(ctx, layout, view) {
  const { width, height } = layout;
  ctx.fillStyle = 'rgba(10,8,20,0.72)';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = COLOURS.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const px = Math.min(height * 0.07, width / 7);
  ctx.font = font(px);
  ctx.fillText('The ants', width / 2, height * 0.33);
  ctx.fillText('are stuck!', width / 2, height * 0.33 + px * 1.15);
  for (const b of view.buttons) drawButton(ctx, b, true);
}

// Small deterministic hash -> [0, 1).
function rand(i, k) {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function drawWin(ctx, layout, view) {
  const { width, height } = layout;
  const level = view.state.level;
  const colours = Object.values(level.palette);
  const t = view.time - view.overlayTime;

  ctx.fillStyle = 'rgba(10,8,20,0.82)';
  ctx.fillRect(0, 0, width, height);

  // confetti, falling forever
  const n = 90;
  const size = Math.max(6, Math.min(width, height) * 0.018);
  for (let i = 0; i < n; i++) {
    const speed = height * (0.12 + rand(i, 1) * 0.18);
    const y = ((rand(i, 2) * (height + 40) + t * speed) % (height + 40)) - 20;
    const x = rand(i, 3) * width + Math.sin(t * (1 + rand(i, 4)) + i) * size * 1.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * (rand(i, 5) * 4 - 2) + i);
    ctx.fillStyle = colours[i % colours.length];
    ctx.fillRect(-size / 2, -size / 2, size, size * 0.7);
    ctx.restore();
  }

  // "YOU WIN!" on two lines, bouncing in then bobbing
  const px = Math.min(height * 0.2, width / 3.1);
  const cy = height * 0.3;
  const e = Math.min(1, t / 0.7);
  const bounce = e < 1 ? 1 - Math.cos(e * Math.PI * 2.5) * Math.exp(-e * 5) : 1;
  const bob = Math.sin(t * 3) * px * 0.03;
  ctx.save();
  ctx.translate(width / 2, cy + bob);
  ctx.scale(bounce, bounce);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font(px);
  ctx.lineWidth = px * 0.08;
  ctx.strokeStyle = '#17152a';
  ctx.lineJoin = 'round';
  ctx.fillStyle = COLOURS.button;
  for (const [text, dy] of [
    ['YOU', -px * 0.52],
    ['WIN!', px * 0.52],
  ]) {
    ctx.strokeText(text, 0, dy);
    ctx.fillText(text, 0, dy);
  }
  ctx.restore();

  // ants marching round the text on a rounded loop
  const rx = Math.min(width * 0.46, px * 1.75);
  const ry = px * 1.3;
  const ants = 14;
  const antSize = Math.max(16, px * 0.2);
  for (let i = 0; i < ants; i++) {
    const a = t * 0.6 + (i / ants) * Math.PI * 2;
    // superellipse loop so the ants stay clear of the letters
    const c = Math.cos(a);
    const s = Math.sin(a);
    const k = 0.6;
    const x = width / 2 + rx * Math.sign(c) * Math.abs(c) ** k;
    const y = cy + ry * Math.sign(s) * Math.abs(s) ** k;
    const a2 = a + 0.01;
    const c2 = Math.cos(a2);
    const s2 = Math.sin(a2);
    const x2 = width / 2 + rx * Math.sign(c2) * Math.abs(c2) ** k;
    const y2 = cy + ry * Math.sign(s2) * Math.abs(s2) ** k;
    drawAntAt(ctx, x, y, Math.atan2(y2 - y, x2 - x), antSize, t * 20 + i, colours[i % colours.length], '#f4ecff');
  }

  // the finished picture, small
  const top = cy + ry + antSize;
  const btnTop = Math.min(...view.buttons.map((b) => b.y));
  const avail = btnTop - top - 16;
  if (avail > 40) {
    const ph = Math.min(avail, height * 0.22);
    const pw = (ph * 3) / 4;
    const x = (width - pw) / 2;
    const y = top + (avail - ph) / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(x - 4, y - 4, pw + 8, ph + 8);
    drawThumbnail(ctx, level, x, y, pw, ph);
  }

  view.buttons.forEach((b, i) => drawButton(ctx, b, i === 0));
}

// view = { screen: 'home'|'play', state, drag: { pickerIndex, x, y }|null,
//          overlay: null|'won'|'stuck', overlayTime, buttons: [], time, progress, levels }
export function draw(ctx, layout, view) {
  ctx.fillStyle = COLOURS.bg;
  ctx.fillRect(0, 0, layout.width, layout.height);
  if (view.screen === 'home') drawHome(ctx, layout, view);
  else if (view.screen === 'settings') drawSettings(ctx, layout, view);
  else if (view.state) {
    drawPlay(ctx, layout, view);
    if (view.overlay === 'won') drawWin(ctx, layout, view);
    else if (view.overlay === 'stuck') drawStuck(ctx, layout, view);
  }
  if (view.loading) {
    // shown for a moment while a level is being dealt
    ctx.fillStyle = 'rgba(10,8,20,0.8)';
    ctx.fillRect(0, 0, layout.width, layout.height);
    ctx.fillStyle = COLOURS.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font(Math.min(layout.height * 0.045, layout.width / 13));
    ctx.fillText('Waking up the ants…', layout.width / 2, layout.height / 2);
  }
}
