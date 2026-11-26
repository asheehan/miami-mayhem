// Where everything goes on screen, for any size and either orientation. Pure: rectangles
// in CSS pixels, { id, x, y, w, h } plus extra fields. Every touchable thing is listed in
// `controls` so tests can check it is on screen, big enough and not overlapping.
import { PADS, ROWS, STEPS, STYLES } from './music.js';
import { MAX_SONGS } from './song.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rect = (id, x, y, w, h, extra = {}) => ({ id, x, y, w, h, ...extra });

// The home button sits where the other games put theirs.
export function homeBox(w) {
  const icon = Math.max(48, Math.min(68, w * 0.12));
  const pad = Math.max(10, w * 0.025);
  return { pad, icon };
}

function topBar(w, h, rightId) {
  const { pad, icon } = homeBox(w);
  const home = rect('home', pad, pad, icon, icon);
  const recS = Math.round(icon * 1.25);
  const cy = pad + icon / 2;
  const rec = rect('rec', w / 2 - recS / 2, Math.max(2, cy - recS / 2), recS, recS);
  const right = rect(rightId, w - pad - icon, pad, icon, icon);
  const topH = Math.max(pad + icon, rec.y + rec.h) + Math.min(pad, 12);
  // the dance floors either side of the record button
  const m = 8;
  const dancers = [
    { x: home.x + home.w + m, y: 2, w: rec.x - (home.x + home.w) - m * 2, h: topH - 4 },
    { x: rec.x + rec.w + m, y: 2, w: right.x - (rec.x + rec.w) - m * 2, h: topH - 4 },
  ];
  return { pad, icon, topH, home, rec, right, dancers };
}

// The turntable and the two effect pads inside the stage rectangle.
function stageLayout(S) {
  const m = 8;
  let deck;
  let echo;
  let filter;
  if (S.w >= S.h) {
    const f = clamp(Math.min(S.h * 0.42, S.w * 0.2), 48, 120);
    const stacked = S.h >= 2 * f + 3 * m;
    const fxW = stacked ? f : 2 * f + m;
    const r = clamp(Math.min((S.h - 2 * m) / 2, (S.w - fxW - 3 * m) / 2), 22, 260);
    const gap = clamp((S.w - fxW - 2 * r) * 0.3, m, 70);
    const groupW = 2 * r + gap + fxW;
    const x0 = S.x + (S.w - groupW) / 2;
    const cy = S.y + S.h / 2;
    deck = { cx: x0 + r, cy, r };
    const fx = x0 + 2 * r + gap;
    if (stacked) {
      const g = Math.min(m * 2, (S.h - 2 * f) / 3);
      echo = rect('echo', fx, cy - f - g / 2, f, f);
      filter = rect('filter', fx, cy + g / 2, f, f);
    } else {
      echo = rect('echo', fx, cy - f / 2, f, f);
      filter = rect('filter', fx + f + m, cy - f / 2, f, f);
    }
  } else {
    const f = clamp(S.w * 0.3, 48, 130);
    const r = clamp(Math.min((S.w - 2 * m) / 2, (S.h - f - 4 * m) / 2), 22, 260);
    const gap = clamp((S.h - 2 * r - f) * 0.15, m, 50);
    const top = S.y + clamp((S.h - 2 * r - gap - f) * 0.3, m, 80);
    deck = { cx: S.x + S.w / 2, cy: top + r, r };
    const fy = top + 2 * r + gap;
    const g = clamp(S.w * 0.08, m * 2, 40);
    echo = rect('echo', S.x + S.w / 2 - g / 2 - f, fy, f, f);
    filter = rect('filter', S.x + S.w / 2 + g / 2, fy, f, f);
  }
  const deckRect = rect('deck', deck.cx - deck.r, deck.cy - deck.r, deck.r * 2, deck.r * 2, { cx: deck.cx, cy: deck.cy, r: deck.r });
  return { rect: S, deck: deckRect, echo, filter };
}

// Does the 16-step grid have to fold into two lines of 8 to keep squares big?
export function foldGrid(panelW) {
  const labelW = 56;
  return (panelW - labelW) / STEPS < 50;
}

function padsPanel(P) {
  const cols = 4;
  const rows = Math.ceil(PADS.length / cols);
  const gap = clamp(Math.min(P.w, P.h) * 0.025, 6, 16);
  let cw = (P.w - gap * (cols - 1)) / cols;
  let ch = (P.h - gap * (rows - 1)) / rows;
  cw = Math.min(cw, ch * 1.35, 220);
  ch = Math.min(ch, cw * 1.2, 220);
  const gw = cw * cols + gap * (cols - 1);
  const gh = ch * rows + gap * (rows - 1);
  const x0 = P.x + (P.w - gw) / 2;
  const y0 = P.y + (P.h - gh) / 2;
  return PADS.map((p, i) => rect('pad', x0 + (i % cols) * (cw + gap), y0 + Math.floor(i / cols) * (ch + gap), cw, ch, { index: i }));
}

function beatsPanel(P, ctrlH) {
  const gap = clamp(P.h * 0.015, 6, 12);
  const out = { cells: [], labels: [], styles: [] };
  // top row: play/stop, the styles, clear
  const n = STYLES.length + 2;
  const bw = Math.min((P.w - gap * (n - 1)) / n, 130);
  const rowW = bw * n + gap * (n - 1);
  let x = P.x + (P.w - rowW) / 2;
  out.play = rect('play', x, P.y, bw, ctrlH);
  x += bw + gap;
  STYLES.forEach((s, i) => {
    out.styles.push(rect('style', x, P.y, bw, ctrlH, { index: i }));
    x += bw + gap;
  });
  out.clear = rect('clear', x, P.y, bw, ctrlH);
  // bottom row: turtle, tempo track, rabbit
  const by = P.y + P.h - ctrlH;
  const tw = Math.min(P.w, 560);
  const tx = P.x + (P.w - tw) / 2;
  const animal = Math.min(ctrlH * 1.25, tw * 0.22);
  out.slower = rect('slower', tx, by, animal, ctrlH);
  out.faster = rect('faster', tx + tw - animal, by, animal, ctrlH);
  out.tempo = rect('tempo', tx + animal + gap, by, tw - 2 * animal - 2 * gap, ctrlH);
  // the grid between them: one line of 16 or two lines of 8, whichever gives bigger squares;
  // the row pictures go down the left when there is room (the squares show them anyway)
  const gy = P.y + ctrlH + gap * 1.5;
  const gh = by - gap * 1.5 - gy;
  const plan = (fold) => {
    const cols = fold ? STEPS / 2 : STEPS;
    const lines = fold ? 2 : 1;
    const split = fold ? gap * 1.5 : 0;
    const cellH = Math.min((gh - split) / (ROWS.length * lines), 90);
    let labelW = clamp(cellH * 1.15, 48, 80);
    if ((P.w - labelW - 4) / cols < 46) labelW = 0;
    const cellW = Math.min((P.w - labelW - (labelW ? 4 : 0)) / cols, cellH * 1.8);
    return { fold, cols, lines, split, cellH, labelW, cellW, score: Math.min(cellW, cellH * 1.1) };
  };
  const a = plan(false);
  const b = plan(true);
  const { fold, cols, lines, split, cellH, labelW, cellW } = a.score >= b.score ? a : b;
  const gridW = labelW + (labelW ? 4 : 0) + cellW * cols;
  const gx = P.x + (P.w - gridW) / 2;
  const cx0 = gx + labelW + (labelW ? 4 : 0);
  const totalH = cellH * ROWS.length * lines + split;
  const gy0 = gy + (gh - totalH) / 2;
  out.fold = fold;
  out.cellW = cellW;
  out.cellH = cellH;
  for (let line = 0; line < lines; line++) {
    const ly = gy0 + line * (cellH * ROWS.length + split);
    for (let r = 0; r < ROWS.length; r++) {
      const y = ly + r * cellH;
      if (labelW) out.labels.push(rect('label', gx, y, labelW, cellH, { row: r, line }));
      for (let c = 0; c < cols; c++) {
        out.cells.push(rect('cell', cx0 + c * cellW, y, cellW, cellH, { row: r, step: line * cols + c }));
      }
    }
  }
  return out;
}

export function layoutBooth(w, h, tab = 'pads') {
  const bar = topBar(w, h, 'shelf');
  const { pad, topH } = bar;
  const m = 8;
  const bottom = h - Math.min(pad, 14);
  const side = Math.min(pad, 16);
  const landscape = w > h * 1.05;
  const tabH = clamp(h * 0.055, 46, 62);
  let S;
  let T; // where the tabs go
  let P; // the panel under the tabs
  if (landscape) {
    const stageW = clamp(w * 0.38, 220, 520);
    S = { x: side, y: topH, w: stageW, h: bottom - topH };
    const px = side + stageW + side;
    const pw = w - px - side;
    T = { x: px, y: topH, w: pw, h: tabH };
    P = { x: px, y: topH + tabH + m, w: pw, h: bottom - (topH + tabH + m) };
  } else {
    const avail = bottom - topH - tabH - 2 * m;
    let stageH;
    if (tab === 'beats') {
      const ctrlH = clamp(h * 0.06, 46, 66);
      const fold = foldGrid(w - side * 2);
      const want = ctrlH * 2 + 40 + ROWS.length * (fold ? 2 : 1) * 54 + (fold ? 16 : 0);
      stageH = clamp(avail - want, Math.min(110, avail * 0.17), avail * 0.4);
    } else {
      stageH = clamp(avail * 0.4, 150, 440);
    }
    S = { x: side, y: topH, w: w - side * 2, h: stageH };
    T = { x: side, y: topH + stageH + m, w: w - side * 2, h: tabH };
    P = { x: side, y: T.y + tabH + m, w: w - side * 2, h: bottom - (T.y + tabH + m) };
  }
  const stage = stageLayout(S);
  const tw = Math.min((T.w - m) / 2, 320);
  const tabs = [
    rect('tab', T.x, T.y, tw, T.h, { tab: 'pads' }),
    rect('tab', T.x + tw + m, T.y, tw, T.h, { tab: 'beats' }),
  ];
  const ctrlH = clamp(h * 0.06, 46, 66);
  const out = { w, h, tab, landscape, bar, stage, tabs, panel: P, pads: [], beats: null };
  const controls = [bar.home, bar.rec, bar.right, stage.deck, stage.echo, stage.filter, ...tabs];
  if (tab === 'beats') {
    out.beats = beatsPanel(P, ctrlH);
    const b = out.beats;
    controls.push(b.play, ...b.styles, b.clear, b.slower, b.tempo, b.faster, ...b.labels, ...b.cells);
  } else {
    out.pads = padsPanel(P);
    controls.push(...out.pads);
  }
  out.controls = controls;
  return out;
}

// The shelf of songs: a back button, a bin, and a slot for every song that can be kept.
export function layoutShelf(w, h) {
  const bar = topBar(w, h, 'bin');
  const side = Math.min(bar.pad, 16);
  const body = { x: side, y: bar.topH + 6, w: w - side * 2, h: h - bar.topH - 6 - Math.min(bar.pad, 14) };
  const gap = clamp(Math.min(w, h) * 0.02, 8, 18);
  let best = { s: 0, cols: 1, rows: MAX_SONGS };
  for (let cols = 2; cols <= 10; cols++) {
    const rows = Math.ceil(MAX_SONGS / cols);
    const s = Math.min((body.w - gap * (cols - 1)) / cols, (body.h - gap * (rows - 1)) / rows, 190);
    if (s > best.s) best = { s, cols, rows };
  }
  const { s, cols, rows } = best;
  const gw = s * cols + gap * (cols - 1);
  const gh = s * rows + gap * (rows - 1);
  const x0 = body.x + (body.w - gw) / 2;
  const y0 = body.y + Math.min((body.h - gh) / 2, gap);
  const slots = [];
  for (let i = 0; i < MAX_SONGS; i++) {
    slots.push(rect('slot', x0 + (i % cols) * (s + gap), y0 + Math.floor(i / cols) * (s + gap), s, s, { index: i }));
  }
  const back = { ...bar.home, id: 'back' };
  return { w, h, bar, back, bin: bar.right, slots, body, controls: [back, bar.rec, bar.right, ...slots] };
}

// "Really throw this one away?": the record big in the middle, a tick and a cross.
export function layoutConfirm(w, h) {
  const s = Math.min(w, h);
  const r = clamp(s * 0.22, 60, 170);
  const cy = h * 0.4;
  const bs = clamp(s * 0.2, 64, 140);
  const g = clamp(s * 0.08, 20, 60);
  const by = Math.min(h - bs - 20, cy + r + g);
  return {
    pic: { cx: w / 2, cy, r },
    yes: rect('yes', w / 2 - g / 2 - bs, by, bs, bs),
    no: rect('no', w / 2 + g / 2, by, bs, bs),
  };
}

export const hit = (b, x, y) => !!b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
