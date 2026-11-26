// Where every button and picture sits on each screen, for any screen size (portrait or
// landscape, phone or tablet). Shared by the drawing and the touch hit-testing. Pure.
//
// Every function returns { buttons: [{ id, x, y, w, h, ...}], ...areas }. Buttons are what a
// finger can press; areas are where things are drawn.
import { PART_KEYS, PART_LISTS } from './parts.js';
import { ZONES } from './world.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const R = (id, x, y, w, h, extra = {}) => ({ id, x, y, w, h, ...extra });

export function metrics(w, h) {
  const pad = clamp(w * 0.025, 10, 20);
  const icon = clamp(w * 0.12, 48, 68);
  return { pad, icon, portrait: h >= w * 0.95, phone: Math.min(w, h) < 600 };
}

// The home or back button: top left, the same place as in the other games.
export const cornerButton = (w, h, id = 'back') => {
  const { pad, icon } = metrics(w, h);
  return R(id, pad, pad, icon, icon);
};

// ---------- the maker ----------

export const MAX_OPTIONS = Math.max(...PART_KEYS.map((k) => PART_LISTS[k].length));

export function makerLayout(w, h, { tab = 'body', first = false } = {}) {
  const { pad, icon, portrait } = metrics(w, h);
  const n = PART_LISTS[tab].length;
  const buttons = [cornerButton(w, h, first ? 'home' : 'back')];
  const done = R('done', w - pad - icon * 1.7, pad, icon * 1.7, icon);
  const dice = R('dice', done.x - pad - icon, pad, icon, icon);
  buttons.push(dice, done);
  const top = pad * 2 + icon;
  let preview;
  let nameRow;
  let stats;
  const gap = 6;
  if (portrait) {
    const cols = w < 600 ? 5 : 8;
    const rows = Math.ceil(MAX_OPTIONS / cols);
    const cell = Math.min((w - pad * 2) / cols, 100);
    const gridY = h - pad * 1.5 - rows * cell;
    const gx = (w - cols * cell) / 2;
    for (let i = 0; i < n; i++) {
      buttons.push(R('opt', gx + (i % cols) * cell + gap / 2, gridY + Math.floor(i / cols) * cell + gap / 2, cell - gap, cell - gap, { index: i }));
    }
    const perRow = w < 600 ? 5 : 10;
    const tabRows = Math.ceil(PART_KEYS.length / perRow);
    const tabW = Math.min((w - pad * 2) / perRow, 90);
    const tabH = clamp(tabW * 0.8, 48, 70);
    const tabsY = gridY - pad * 0.8 - tabRows * tabH;
    const tx = (w - perRow * tabW) / 2;
    PART_KEYS.forEach((key, i) => {
      buttons.push(R('tab', tx + (i % perRow) * tabW + 3, tabsY + Math.floor(i / perRow) * tabH + 3, tabW - 6, tabH - 6, { key }));
    });
    const narrow = w < 600;
    const statsH = narrow ? clamp(h * 0.085, 60, 76) : clamp(h * 0.07, 50, 70);
    const nameH = 52;
    const statsY = tabsY - pad * 0.6 - statsH;
    const nameY = statsY - pad * 0.4 - nameH;
    preview = { x: 0, y: top, w, h: nameY - top - pad * 0.3 };
    nameRow = { cx: w / 2, y: nameY, h: nameH, w: Math.min(w * 0.6, 320) };
    stats = { x: pad, y: statsY, w: w - pad * 2, h: statsH, cols: narrow ? 2 : 4 };
  } else {
    const leftW = w * 0.46;
    const rx = leftW + pad;
    const rw = w - rx - pad;
    const perRow = 5;
    const tabW = Math.min(rw / perRow, 100);
    const tabH = clamp(tabW * 0.7, 48, 72);
    const tx = rx + (rw - perRow * tabW) / 2;
    PART_KEYS.forEach((key, i) => {
      buttons.push(R('tab', tx + (i % perRow) * tabW + 3, top + Math.floor(i / perRow) * tabH + 3, tabW - 6, tabH - 6, { key }));
    });
    const gridTop = top + tabH * 2 + pad;
    const cols = 5;
    const rows = Math.ceil(MAX_OPTIONS / cols);
    const cell = Math.min(rw / cols, (h - gridTop - pad) / rows, 120);
    const gx = rx + (rw - cols * cell) / 2;
    for (let i = 0; i < n; i++) {
      buttons.push(R('opt', gx + (i % cols) * cell + gap / 2, gridTop + Math.floor(i / cols) * cell + gap / 2, cell - gap, cell - gap, { index: i }));
    }
    const statsH = clamp(h * 0.1, 56, 90);
    const statsY = h - pad - statsH;
    const nameH = 52;
    const nameY = statsY - pad * 0.5 - nameH;
    preview = { x: 0, y: top, w: leftW, h: nameY - top - pad * 0.3 };
    nameRow = { cx: leftW / 2, y: nameY, h: nameH, w: Math.min(leftW * 0.62, 320) };
    stats = { x: pad, y: statsY, w: leftW - pad, h: statsH, cols: 2 };
  }
  buttons.push(R('name', nameRow.cx + nameRow.w / 2 + 8, nameRow.y, nameRow.h, nameRow.h));
  return { buttons, preview, nameRow, stats };
}

// ---------- the map ----------

export function mapLayout(w, h) {
  const { pad, icon, portrait } = metrics(w, h);
  const buttons = [cornerButton(w, h, 'home')];
  const bh = clamp(h * 0.1, 64, 96);
  const bw = Math.min((w - pad * 4) / 3, 240);
  const by = h - pad * 1.5 - bh;
  const bx = (w - (bw * 3 + pad * 2)) / 2;
  ['squad', 'book', 'maker'].forEach((id, i) => buttons.push(R(id, bx + i * (bw + pad), by, bw, bh)));
  const area = { x: pad, y: pad * 2 + icon, w: w - pad * 2, h: by - pad * 3 - icon };
  const r = clamp(Math.min(area.w * (portrait ? 0.13 : 0.075), area.h * (portrait ? 0.075 : 0.09)), 34, 64);
  ZONES.forEach((z, i) => {
    // portrait: the road climbs up the screen; landscape: it runs left to right
    const fx = portrait ? z.map[0] : 1 - z.map[1];
    const fy = portrait ? z.map[1] : 0.1 + z.map[0] * 0.8;
    const cx = area.x + r + fx * (area.w - r * 2);
    const cy = area.y + r + fy * (area.h - r * 2.6);
    buttons.push(R('zone', cx - r, cy - r, r * 2, r * 2, { index: i, cx, cy, r }));
  });
  return { buttons, area, coins: { x: w - pad, y: pad, h: Math.min(icon, 56) } };
}

// ---------- a zone ----------

export function zoneLayout(w, h) {
  const { pad, icon, portrait } = metrics(w, h);
  const buttons = [cornerButton(w, h, 'back')];
  const bh = clamp(h * 0.11, 70, 110);
  const by = h - pad * 1.5 - bh;
  const fw = Math.min((w - pad * 3) * 0.6, 380);
  const bw = Math.min((w - pad * 3) * 0.4, 250);
  const x0 = (w - fw - bw - pad) / 2;
  buttons.push(R('fight', x0, by, fw, bh), R('boss', x0 + fw + pad, by, bw, bh));
  // the team, tappable to change it
  const th = clamp(h * (portrait ? 0.16 : 0.2), 90, 170);
  const tw = Math.min(w - pad * 2, th * 3.4);
  const team = R('team', (w - tw) / 2, by - pad - th, tw, th);
  buttons.push(team);
  const top = pad * 2 + icon;
  const species = { x: pad, y: top, w: w - pad * 2, h: team.y - pad - top, cols: portrait && w < 600 ? 4 : 7 };
  return { buttons, species, team };
}

// ---------- a battle ----------

export function battleLayout(w, h, nHeroes = 3, nFoes = 1) {
  const { pad, icon, portrait } = metrics(w, h);
  const buttons = [cornerButton(w, h, 'flee')];
  const mh = clamp(h * 0.13, 76, 120);
  const mw = Math.min((w - pad * 2 - pad * 3) / 4, 230);
  const my = h - pad * 1.5 - mh;
  const mx = (w - (mw * 4 + pad * 3)) / 2;
  const moves = ['bonk', 'blast', 'bubble', 'special'].map((key, i) => R('move', mx + i * (mw + pad), my, mw, mh, { key }));
  const bar = { x: pad, y: my, w: w - pad * 2, h: mh };
  const top = pad * 2 + icon;
  const arena = { x: 0, y: top, w, h: my - pad - top };
  let size;
  let foeY;
  let heroY;
  let foeX;
  let heroX;
  if (portrait) {
    size = Math.min(w / 3.9, arena.h * 0.3);
    foeY = arena.y + arena.h * 0.43;
    heroY = arena.y + arena.h * 0.96;
    const spread = (n, i) => w * (n === 1 ? 0.5 : n === 2 ? 0.3 + i * 0.4 : 0.18 + i * 0.32);
    foeX = (i) => spread(nFoes, i) + (nFoes === 3 ? (i === 1 ? 0 : 0) : 0);
    heroX = (i) => spread(nHeroes, i);
  } else {
    size = Math.min(w / 7.5, arena.h * 0.36);
    foeY = arena.y + arena.h * 0.5;
    heroY = arena.y + arena.h * 0.97;
    const step = size * 1.25;
    foeX = (i) => w * 0.72 + (i - (nFoes - 1) / 2) * step;
    heroX = (i) => w * 0.3 + (i - (nHeroes - 1) / 2) * step;
  }
  // three in a row stand in a little arc in portrait (the middle one a step back) so their
  // health bars don't touch
  const back = (n, i) => (portrait && n === 3 && i === 1 ? size * 0.3 : 0);
  const heroes = Array.from({ length: nHeroes }, (_, i) => ({ x: heroX(i), y: heroY - back(nHeroes, i) }));
  const foes = Array.from({ length: nFoes }, (_, i) => ({ x: foeX(i), y: foeY - back(nFoes, i) }));
  const targets = foes.map((f, i) => R('foe', f.x - size * 0.48, f.y - size * 1.05, size * 0.96, size * 1.05, { index: i }));
  return { buttons: [...buttons, ...moves, ...targets], moves, bar, arena, size, heroes, foes };
}

// A panel in the middle with one big button under it (results, hatching, evolving).
export function panelLayout(w, h, id = 'ok') {
  const { pad } = metrics(w, h);
  const pw = Math.min(w - pad * 2, 560);
  const ph = Math.min(h * 0.72, 640);
  const px = (w - pw) / 2;
  const py = (h - ph) / 2;
  const bh = clamp(h * 0.09, 64, 90);
  const bw = Math.min(pw * 0.7, 320);
  const ok = R(id, (w - bw) / 2, py + ph - bh - pad, bw, bh);
  return { buttons: [ok], panel: { x: px, y: py, w: pw, h: ph } };
}

// ---------- befriending ----------

export function befriendLayout(w, h, nChoices = 1, picking = false) {
  const { pad, icon } = metrics(w, h);
  const buttons = [cornerButton(w, h, 'skip')];
  const top = pad * 2 + icon;
  if (picking) {
    const cw = Math.min((w - pad * (nChoices + 1)) / nChoices, 260);
    const ch = Math.min(cw * 1.3, h * 0.45);
    const x0 = (w - (cw * nChoices + pad * (nChoices - 1))) / 2;
    const y = (h - ch) / 2 + pad;
    for (let i = 0; i < nChoices; i++) buttons.push(R('pick', x0 + i * (cw + pad), y, cw, ch, { index: i }));
    return { buttons, stage: { x: 0, y: top, w, h: y - top } };
  }
  const sh = clamp(Math.min(w, h) * 0.16, 72, 130);
  const sy = h - pad * 1.5 - sh;
  const x0 = (w - (sh * 3 + pad * 2 * 2)) / 2;
  for (let i = 0; i < 3; i++) buttons.push(R('snack', x0 + i * (sh + pad * 2), sy, sh, sh, { index: i }));
  return { buttons, stage: { x: 0, y: top, w, h: sy - pad - top } };
}

// ---------- the squad (roster and team) ----------

export function squadLayout(w, h, rosterCount = 0, page = 0) {
  const { pad, icon, portrait } = metrics(w, h);
  const buttons = [cornerButton(w, h, 'back')];
  const top = pad * 2 + icon;
  const slotW = Math.min((w - pad * 4) / 3, portrait ? 220 : 200);
  const slotH = slotW * (portrait ? 1.0 : 0.82);
  const sx = (w - (slotW * 3 + pad * 2)) / 2;
  const upH = 52;
  for (let i = 0; i < 3; i++) {
    buttons.push(R('slot', sx + i * (slotW + pad), top, slotW, slotH, { index: i }));
    buttons.push(R('up', sx + i * (slotW + pad) + slotW * 0.12, top + slotH + 6, slotW * 0.76, upH, { index: i }));
  }
  const navH = 56;
  const gridTop = top + slotH + upH + pad * 1.6;
  const gridBottom = h - pad * 1.5 - navH - pad * 0.5;
  const target = portrait ? (w < 600 ? 86 : 110) : 104;
  const cols = Math.max(3, Math.floor((w - pad * 2) / target));
  const cell = (w - pad * 2) / cols;
  const rows = Math.max(1, Math.floor((gridBottom - gridTop) / cell));
  const per = cols * rows;
  const pages = Math.max(1, Math.ceil(rosterCount / per));
  const pg = clamp(page, 0, pages - 1);
  const gx = (w - cols * cell) / 2;
  for (let i = 0; i < per; i++) {
    const idx = pg * per + i;
    if (idx >= rosterCount) break;
    buttons.push(R('mon', gx + (i % cols) * cell + 4, gridTop + Math.floor(i / cols) * cell + 4, cell - 8, cell - 8, { index: idx }));
  }
  const navY = h - pad * 1.5 - navH;
  if (pg > 0) buttons.push(R('prev', pad, navY, navH * 1.6, navH));
  if (pg < pages - 1) buttons.push(R('next', w - pad - navH * 1.6, navY, navH * 1.6, navH));
  return { buttons, per, pages, page: pg, nav: { y: navY, h: navH }, grid: { y: gridTop } };
}

// ---------- upgrading one monster ----------

export function upgradeLayout(w, h) {
  const { pad, icon, portrait } = metrics(w, h);
  const buttons = [cornerButton(w, h, 'back')];
  const top = pad * 2 + icon;
  const narrow = w < 600;
  let preview;
  let panel;
  if (portrait) {
    preview = { x: 0, y: top, w, h: narrow ? Math.max(150, h * 0.22) : Math.max(160, h * 0.3) };
    panel = { x: pad, y: preview.y + preview.h + 70, w: w - pad * 2, h: 0 };
    panel.h = h - pad * 1.5 - panel.y;
  } else {
    preview = { x: 0, y: top, w: w * 0.42, h: h - top - 100 };
    panel = { x: w * 0.42 + pad, y: top, w: w * 0.58 - pad * 2, h: h - top - pad * 1.5 };
  }
  const eh = 60;
  const ew = Math.min(preview.w * 0.75, 300);
  const evolve = R('evolve', preview.x + (preview.w - ew) / 2, preview.y + preview.h + 6, ew, eh);
  buttons.push(evolve);
  // training and moves: two columns of four rows, or one column of eight on a phone
  const cols = narrow ? 1 : 2;
  const perCol = 8 / cols;
  const colW = (panel.w - pad * (cols - 1)) / cols;
  const rowH = Math.min(panel.h / perCol, 110);
  const bw = clamp(colW * (narrow ? 0.32 : 0.42), 64, 130);
  const bh = clamp(rowH * 0.72, 46, 64);
  const rows = [];
  const items = [...['hp', 'bonk', 'guard', 'zoom'].map((k) => ['train', k]), ...['bonk', 'blast', 'bubble', 'special'].map((k) => ['learn', k])];
  items.forEach(([id, key], i) => {
    const col = Math.floor(i / perCol);
    const x = panel.x + col * (colW + pad);
    const y = panel.y + (i % perCol) * rowH;
    const gap = narrow ? 4 : 8;
    rows.push({ kind: id === 'train' ? 'train' : 'move', key, x, y, w: colW, h: rowH - gap });
    buttons.push(R(id, x + colW - bw - 6, y + (rowH - gap - bh) / 2, bw, bh, { key }));
  });
  return { buttons, preview, panel, rows, coins: { x: w - pad, y: pad, h: Math.min(icon, 56) } };
}

// ---------- the monster book ----------

export function bookLayout(w, h) {
  const { pad, icon, portrait } = metrics(w, h);
  const buttons = [cornerButton(w, h, 'back')];
  const top = pad * 2 + icon;
  const n = ZONES.length;
  const tw = Math.min((w - pad) / n, 100);
  const th = clamp(tw * 0.8, 50, 72);
  const tx = (w - tw * n) / 2;
  for (let i = 0; i < n; i++) buttons.push(R('ztab', tx + i * tw + 2, top + 2, tw - 4, th - 4, { index: i }));
  const gy = top + th + pad;
  const cols = portrait ? (w < 600 ? 2 : 3) : 4;
  const rows = Math.ceil(7 / cols);
  const cw = (w - pad * 2) / cols;
  const ch = Math.min((h - gy - pad) / rows, cw * 1.15);
  const gx = (w - cw * cols) / 2;
  const cards = Array.from({ length: 7 }, (_, i) => ({ x: gx + (i % cols) * cw + 5, y: gy + Math.floor(i / cols) * ch + 5, w: cw - 10, h: ch - 10 }));
  return { buttons, cards };
}
