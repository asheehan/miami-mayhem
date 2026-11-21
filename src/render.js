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

// Pure. Picks the picker column count from [3, 5, 9] that gives the largest cell size.
export function computeLayout(width, height, level) {
  const W = level.rows[0].length;
  const H = level.rows.length;
  const nSlots = level.slots ?? 3;
  const nPicker = level.pickerSize ?? 9;
  const slotGap = SLOT_Y + 0.5; // picture bottom edge to slot centre
  let best = null;
  for (const cols of COLUMN_CHOICES) {
    const c = Math.min(cols, nPicker);
    const { rows, height: ph } = pickerShape(c, nPicker);
    const needW = Math.max(W + 2, c * (BLOCK + PICKER_GAP) + 1.5);
    const needH = MARGIN + H + slotGap + BLOCK / 2 + 1 + ph + MARGIN;
    const cell = Math.min(width / needW, height / needH);
    if (!best || cell > best.cell + 1e-9) best = { cols: c, rows, cell, needH };
  }
  const { cols, cell, needH } = best;
  // Cell (x, y) is centred at toScreen(x, y); the picture spans -0.5 .. W - 0.5.
  const originX = (width - W * cell) / 2;
  const originY = (height - needH * cell) / 2 + MARGIN * cell;
  const toScreen = (gx, gy) => ({ x: originX + (gx + 0.5) * cell, y: originY + (gy + 0.5) * cell });
  const size = BLOCK * cell;

  const slotRects = [];
  for (let i = 0; i < nSlots; i++) {
    const c = toScreen(((i + 0.5) * W) / nSlots - 0.5, H + SLOT_Y);
    slotRects.push({ x: c.x - size / 2, y: c.y - size / 2, w: size, h: size });
  }

  const pickerRects = [];
  const pickerTop = slotRects[0].y + size + cell;
  for (let i = 0; i < nPicker; i++) {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, nPicker - row * cols);
    const col = i - row * cols;
    const rowW = inRow * size + (inRow - 1) * PICKER_GAP * cell;
    pickerRects.push({
      x: width / 2 - rowW / 2 + col * (size + PICKER_GAP * cell),
      y: pickerTop + row * (size + PICKER_GAP * cell),
      w: size,
      h: size,
    });
  }

  const hb = Math.max(44, 2 * cell);
  const homeBtn = { x: 8, y: 8, w: hb, h: hb };

  return { width, height, W, H, cell, originX, originY, toScreen, slotRects, pickerRects, homeBtn, blockSize: BLOCK };
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

function drawPicture(ctx, layout, grid, palette) {
  const { cell } = layout;
  const tl = layout.toScreen(-0.5, -0.5);
  ctx.fillStyle = COLOURS.tunnel;
  ctx.fillRect(tl.x, tl.y, grid[0].length * cell, grid.length * cell);
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const c = grid[y][x];
      if (c === null) continue;
      ctx.fillStyle = palette[c];
      ctx.fillRect(tl.x + x * cell, tl.y + y * cell, cell + 0.5, cell + 0.5);
    }
  }
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
  drawAntAt(ctx, p.x, p.y, angle, layout.cell, time * 24 + ant.target.x + ant.target.y, carry);
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
  const { cell } = layout;
  const palette = state.level.palette;

  // soil band from the picture down to below the slots
  const top = layout.toScreen(-0.5, state.h - 0.5).y;
  const bottom = layout.slotRects[0].y + layout.slotRects[0].h + cell * 0.5;
  ctx.fillStyle = COLOURS.soil;
  ctx.fillRect(0, top, layout.width, bottom - top);

  drawPicture(ctx, layout, state.grid, palette);

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

// Pure. Level thumbnail buttons in a 2-column grid below the title.
// Each rect covers the picture and its name label.
export function homeButtons(width, height, levels) {
  const cols = 2;
  const rows = Math.ceil(levels.length / cols);
  const top = height * 0.2;
  const bottom = height - Math.max(16, height * 0.03);
  const gap = Math.max(16, width * 0.05);
  const labelH = Math.max(28, height * 0.04);
  // Picture aspect 3:4 plus a label strip.
  const maxW = (width - gap * (cols + 1)) / cols;
  const maxH = (bottom - top - gap * (rows - 1)) / rows;
  const picW = Math.min(maxW, ((maxH - labelH) * 3) / 4);
  const w = picW;
  const h = (picW * 4) / 3 + labelH;
  const totalW = cols * w + (cols - 1) * gap;
  const totalH = rows * h + (rows - 1) * gap;
  const x0 = (width - totalW) / 2;
  const y0 = top + (bottom - top - totalH) / 2;
  return levels.map((level, i) => ({
    id: 'level',
    index: i,
    x: x0 + (i % cols) * (w + gap),
    y: y0 + Math.floor(i / cols) * (h + gap),
    w,
    h,
    labelH,
  }));
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
  const titlePx = Math.min(height * 0.08, width / 6.5);
  ctx.font = font(titlePx);
  ctx.fillText('Pixel Ants', width / 2, height * 0.09);
  // a little ant marching under the title
  const span = Math.min(width * 0.6, titlePx * 6);
  const ax = width / 2 - span / 2 + ((t * 60) % span);
  drawAntAt(ctx, ax, height * 0.09 + titlePx * 0.75, 0, titlePx * 0.45, t * 20, null, '#ffd93b');

  for (const b of view.buttons) {
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
    if (view.progress.includes(level.name)) {
      const r = Math.max(18, b.w * 0.14);
      drawTick(ctx, b.x + b.w - r * 0.6, b.y + r * 0.6, r);
    }
  }
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
  if (view.screen === 'home') {
    drawHome(ctx, layout, view);
    return;
  }
  if (!view.state) return;
  drawPlay(ctx, layout, view);
  if (view.overlay === 'won') drawWin(ctx, layout, view);
  else if (view.overlay === 'stuck') drawStuck(ctx, layout, view);
}
