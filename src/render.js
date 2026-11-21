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
  const { cell } = layout;
  const p = layout.toScreen(ant.pos.x, ant.pos.y);
  const prev = headings.get(ant);
  let angle = prev ? prev.angle : -Math.PI / 2;
  if (prev) {
    const dx = ant.pos.x - prev.x;
    const dy = ant.pos.y - prev.y;
    if (dx * dx + dy * dy > 1e-6) angle = Math.atan2(dy, dx);
  }
  headings.set(ant, { x: ant.pos.x, y: ant.pos.y, angle });

  const s = cell * 1.0;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  // legs
  ctx.strokeStyle = COLOURS.ant;
  ctx.lineWidth = Math.max(1, s * 0.07);
  const wig = Math.sin(time * 24 + (ant.target.x + ant.target.y)) * s * 0.12;
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
  ctx.fillStyle = COLOURS.ant;
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

// view = { screen: 'home'|'play', state, drag: { pickerIndex, x, y }|null,
//          overlay: null|'won'|'stuck', buttons: [], time, progress }
export function draw(ctx, layout, view) {
  ctx.fillStyle = COLOURS.bg;
  ctx.fillRect(0, 0, layout.width, layout.height);
  if (view.screen === 'play' && view.state) drawPlay(ctx, layout, view);
}
