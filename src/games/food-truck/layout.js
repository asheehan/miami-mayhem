// Where everything sits, in field units (the play area is FW wide and FH tall, both at least
// 400 x 640; the screen scales it to fit). Shared by the drawing and the touch hit-testing.
// Pure.
import { binsFor } from './stations.js';

export const BIN_MAX = 84;
export const SNAP = 46; // a dropped thing this far outside its target still lands

// ---------- the window: customers, bubbles, counter, kitchen ----------

export function windowLayout(FW, FH, queue = 1) {
  const counterY = Math.round(FH * 0.6);
  const two = queue > 1;
  const k = Math.max(0.8, Math.min(1.1, counterY / 430)) * (two ? 0.88 : 1);
  const footY = counterY + 22;
  const headTop = footY - 245 * k;
  const spots = two
    ? [0.27, 0.73].map((fx) => {
      const x = FW * fx;
      const bw = Math.min(FW / 2 - 14, 220);
      const bh = Math.max(120, Math.min(190, headTop - 66));
      return { x, y: footY, k, bubble: { x: x - bw / 2, y: headTop - bh - 14, w: bw, h: bh, tail: { x: x + 10, y: headTop + 6 } } };
    })
    : [(() => {
      const x = FW * 0.29;
      const bx = FW * 0.5;
      const bw = Math.min(FW - bx - 12, 260);
      const bh = Math.min(210, Math.max(150, counterY - 250 * k));
      return { x, y: footY, k, bubble: { x: bx, y: Math.max(64, headTop - 40), w: bw, h: bh, tail: { x: x + 46 * k, y: headTop + 40 } } };
    })()];
  const counterH = 58;
  const dishS = Math.min(104, FW * 0.24);
  const counter = [0.16, 0.4, 0.64].map((fx) => ({ x: FW * fx, y: counterY + 6 - dishS * 0.22, s: dishS }));
  const bin = { x: FW - 46, y: counterY + counterH / 2 + 2, r: 30 };
  // the kitchen below: six appliances in two rows of three
  const top = counterY + counterH + 16;
  const gap = 12;
  const aw = (FW - gap * 4) / 3;
  const ah = Math.min(130, (FH - top - gap * 2) / 2);
  const kinds = ['smoothie', 'icecream', 'taco', 'sandwich', 'fried', 'pizza'];
  const appliances = kinds.map((kind, i) => ({
    kind, x: gap + (i % 3) * (aw + gap), y: top + Math.floor(i / 3) * (ah + gap), w: aw, h: ah,
  }));
  return { counterY, counterH, spots, counter, bin, appliances, k };
}

// The tappable pictures inside a customer's bubble: one cell per dish.
export function bubbleCells(b, n) {
  const pad = 10;
  const cw = (b.w - pad * 2) / n;
  return Array.from({ length: n }, (_, i) => ({ x: b.x + pad + i * cw, y: b.y + pad, w: cw, h: b.h - pad * 2 }));
}

// ---------- a station close-up ----------

export function binGrid(n, FW, FH) {
  const perRow = Math.min(n, FW < 450 ? 5 : 6);
  const rows = Math.ceil(n / perRow);
  const size = Math.min(BIN_MAX, (FW - 16) / perRow - 8);
  const out = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow);
    const inRow = row === rows - 1 ? n - row * perRow : perRow;
    const col = i - row * perRow;
    const pitch = Math.min(size + 10, (FW - 16) / inRow);
    const x0 = FW / 2 - ((inRow - 1) * pitch) / 2;
    const cy = FH - 12 - size / 2 - (rows - 1 - row) * (size + 10);
    out.push({ x: x0 + col * pitch, y: cy, r: size / 2 });
  }
  const top = n ? FH - 12 - rows * (size + 10) + 10 : FH;
  return { bins: out, top };
}

// Everything at a station: { card, bins: [{ id, x, y, r }], work: { x0, y0, x1, y1 }, trash, ...parts }.
export function stationLayout(st, FW, FH) {
  const ids = binsFor(st);
  const grid = binGrid(ids.length, FW, FH);
  const bins = grid.bins.map((b, i) => ({ ...b, id: ids[i] }));
  const card = { x: 10, y: 10, w: Math.min(150, FW * 0.34), h: Math.min(166, FW * 0.38) };
  const work = { x0: 0, y0: card.y + card.h + 8, x1: FW, y1: grid.top - 14 };
  const wh = work.y1 - work.y0;
  const trash = { x: FW - 40, y: card.y + 34, r: 28 };
  const L = { card, bins, work, trash };
  const bottom = work.y1;
  switch (st.kind) {
    case 'smoothie': {
      const H = Math.min(440, wh * 0.8, FW * 0.78);
      const jw = H * 0.6;
      const baseH = H * 0.24;
      const x = FW * 0.38;
      L.blender = { x, bottom, H, jw, baseH, jar: { x: x - jw / 2, y: bottom - H, w: jw, h: H - baseH } };
      L.button = { x, y: bottom - baseH * 0.48, r: Math.max(30, baseH * 0.36) };
      L.meter = { x: x - jw / 2 - 34, y: bottom - H + 10, w: 22, h: H - baseH - 10 };
      const cupH = Math.min(H * 0.62, 190);
      L.cup = { x: Math.min(FW - cupH * 0.42 - 10, x + jw / 2 + cupH * 0.5 + 20), bottom: bottom - 6, h: cupH };
      L.cupBox = { x: L.cup.x - cupH * 0.42, y: bottom - cupH - 30, w: cupH * 0.84, h: cupH + 30 };
      L.target = L.blender.jar;
      break;
    }
    case 'sandwich': {
      const bw = Math.min(280, FW * 0.62);
      const pw = Math.min(210, FW * 0.48);
      const ph = pw * 0.62;
      L.board = { x: FW * 0.36, bottom: bottom - 8, w: bw };
      L.target = { x: L.board.x - bw / 2, y: bottom - 170, w: bw, h: 170 };
      L.press = { x: Math.min(FW - pw / 2 - 12, FW * 0.7), y: work.y0 + Math.min(110, Math.max(30, wh * 0.14)), w: pw, h: ph };
      L.meter = { x: L.press.x - pw / 2, y: L.press.y + ph + 14, w: pw, h: 20 };
      break;
    }
    case 'taco': {
      const w = Math.min(300, FW * 0.66, wh * 0.95);
      L.taco = { x: FW / 2, bottom: bottom - 24, w };
      L.target = { x: FW / 2 - w * 0.62, y: bottom - w * 1.0, w: w * 1.24, h: w };
      break;
    }
    case 'icecream': {
      const s = Math.min(150, wh * 0.32);
      L.cone = { x: FW / 2, tip: bottom - 6, s };
      L.target = { x: FW / 2 - s * 1.1, y: work.y0, w: s * 2.2, h: bottom - work.y0 };
      break;
    }
    case 'fried': {
      const fw = Math.min(320, FW * 0.72);
      const fh = Math.min(150, wh * 0.36);
      L.fryer = { x: FW * 0.42, y: work.y0 + Math.min(90, Math.max(10, wh * 0.1)), w: fw, h: fh };
      L.oil = { x: L.fryer.x - fw * 0.42, y: L.fryer.y + fh * 0.22, w: fw * 0.84, h: fh * 0.62 };
      const bw = Math.min(230, FW * 0.52);
      L.boat = { x: Math.min(FW - bw * 0.55, FW * 0.66), bottom: bottom - 8, w: bw };
      L.target = { x: L.boat.x - bw * 0.6, y: bottom - bw * 0.75, w: bw * 1.2, h: bw * 0.75 };
      L.slots = [0, 1, 2, 3].map((i) => ({ x: L.oil.x + L.oil.w * (0.14 + i * 0.24), y: L.oil.y + L.oil.h * 0.52 }));
      break;
    }
    case 'pizza': {
      const r = Math.min(124, FW * 0.29, wh * 0.33);
      L.pizza = { x: FW * 0.37, y: bottom - r - 12, r };
      L.target = { x: L.pizza.x - r - 10, y: L.pizza.y - r - 10, w: r * 2 + 20, h: r * 2 + 20 };
      const ow = Math.min(200, FW * 0.44);
      L.oven = { x: Math.min(FW - ow / 2 - 10, FW * 0.73), y: work.y0 + 4, w: ow, h: ow * 0.8 };
      L.meterNo = true;
      break;
    }
    default:
  }
  return L;
}

export const inRect = (r, x, y, pad = 0) => x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;
export const inCircle = (c, x, y, pad = 0) => Math.hypot(x - c.x, y - c.y) <= c.r + pad;
