// The workshop: the puppet big in the middle, drawers of parts along the bottom, the sock and
// paint tabs, dragging parts on, moving, resizing and turning them with one finger, the bin,
// layers, recolouring, undo, surprise me, and the naming step.
import { C, FELT, felt, font, roundRect, outlined, circle } from './art.js';
import { DRAWERS, partDef } from './parts.js';
import {
  SHAPES, SHAPE_IDS, PATTERNS, NAMES, addPart, movePart, scalePart, rotatePart, toggleLayer, recolour, canRecolour,
  setSock, undo, canUndo, beginEdit, snapPart, hitTest, handlePos, handleTransform, randomPuppet, nameFromLetters,
  cleanName, widthOf, NAME_MAX, MAX_PARTS,
} from './puppet.js';
import { drawPuppet, drawPartIcon, bodyImage } from './draw-puppet.js';
import { createLive, stepLive, liveAnim, applyWobble, talk, poke, lookAt } from './live.js';
import { drawButton, glyph, hit, drawSwatch } from './ui.js';
import { play, babble } from './sound.js';

const TABS = ['sock', 'paint', ...DRAWERS.map((d) => d.id)];
const TAB_ICON = { eyes: 'googly', noses: 'pompom', mouths: 'tongue', hair: 'mop', ears: 'bunny-ear', hats: 'party-hat', arms: 'mitten', extras: 'bow-tie' };
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const TAP_MOVE = 14; // px: a press that moves less than this is a tap
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function createWorkshop(G) {
  let p = null; // the puppet being made
  let L = createLive(3);
  let tab = 'eyes';
  let sel = -1;
  let buttons = [];
  let tray = [];
  let tabs = [];
  let area = { x: 0, y: 0, w: 1, h: 1 };
  let view = { cx: 0, cy: 0, s: 1 };
  let bin = { x: 0, y: 0, w: 1, h: 1 };
  let g = null; // the gesture in progress
  let naming = null; // { letters, typed, buttons, before }
  let poof = 0; // surprise-me spin
  let lastLand = 0;

  const toPup = (x, y) => ({ x: (x - view.cx) / view.s, y: (y - view.cy) / view.s });
  const toScr = (x, y) => ({ x: view.cx + x * view.s, y: view.cy + y * view.s });
  const changed = () => G.changed(p);

  // ---------- layout ----------

  function layout() {
    const { w, h } = G.size;
    const pad = clamp(w * 0.02, 8, 16);
    const phone = w < 600;
    const bar = clamp(h * 0.07, 56, 84);
    const icon = bar - pad * 0.5;
    // tabs: one row on a tablet, two on a phone
    const tabRows = phone ? 2 : 1;
    const perRow = Math.ceil(TABS.length / tabRows);
    const tabW = (w - pad * 2) / perRow;
    const tabH = clamp(tabW * (phone ? 0.68 : 0.8), 44, 80);
    // tray: part tiles, 8 a row on a tablet, 6 on a phone
    const cols = phone ? 6 : 8;
    const cell = (w - pad * 2) / cols;
    const trayRows = phone ? 3 : 2;
    const trayH = cell * trayRows * (phone ? 0.92 : 0.9) + pad;
    const trayY = h - trayH - pad * 0.5;
    const tabsY = trayY - tabH * tabRows;
    area = { x: 0, y: bar + pad, w, h: tabsY - bar - pad * 1.5 };
    // the puppet: from above its hat to just under the cuff
    const sh = SHAPES[p.sock.shape];
    const top = -330;
    const bottom = sh.cuffBottom + 70;
    const s = Math.min((area.w * 0.94) / 600, area.h / (bottom - top));
    view = { s, cx: w / 2, cy: area.y + area.h - bottom * s };
    buttons = [
      { id: 'back', icon: 'back', x: pad, y: pad * 0.5, w: icon, h: icon },
      { id: 'undo', icon: 'undo', x: w - pad - icon * 3 - pad * 2, y: pad * 0.5, w: icon, h: icon },
      { id: 'dice', icon: 'dice', x: w - pad - icon * 2 - pad, y: pad * 0.5, w: icon, h: icon },
      { id: 'name', icon: 'tag', x: w - pad - icon, y: pad * 0.5, w: icon, h: icon },
    ];
    const bs = clamp(w * 0.1, 56, 80);
    bin = { id: 'bin', x: pad, y: area.y + area.h - bs - pad * 0.3, w: bs, h: bs };
    // tools for the selected part, down the right
    const q = p.parts[sel];
    if (q) {
      const tools = ['layer', ...(canRecolour(q) ? ['paint'] : []), 'delete'];
      tools.forEach((id, k) => buttons.push({ id, x: w - pad - bs, y: area.y + pad + k * (bs + pad), w: bs, h: bs }));
    }
    tabs = TABS.map((id, k) => ({
      id: 'tab', tab: id, x: pad + (k % perRow) * tabW, y: tabsY + Math.floor(k / perRow) * tabH, w: tabW, h: tabH,
    }));
    layoutTray({ x: pad, y: trayY, w: w - pad * 2, h: trayH, cols, cell, phone });
    if (naming) layoutNaming();
  }

  function layoutTray(T) {
    tray = [];
    tray.box = T;
    const inner = { x: T.x + 6, y: T.y + 6, w: T.w - 12, h: T.h - 12 };
    if (tab === 'sock') {
      const items = [...SHAPE_IDS.map((v) => ({ kind: 'shape', value: v })), ...PATTERNS.map((v) => ({ kind: 'pattern', value: v }))];
      const cols = T.phone ? 5 : 10;
      const rows = Math.ceil(items.length / cols);
      const cw = inner.w / cols;
      const ch = inner.h / rows;
      items.forEach((it, k) => tray.push({ ...it, x: inner.x + (k % cols) * cw, y: inner.y + Math.floor(k / cols) * ch, w: cw, h: ch }));
    } else if (tab === 'paint') {
      // two lots of colours: the sock, then its pattern
      const perRow = T.phone ? 7 : 14;
      const rows = (FELT.length / perRow) * 2;
      const lead = T.phone ? 0 : inner.w * 0.08;
      const cw = (inner.w - lead) / perRow;
      const ch = inner.h / rows;
      FELT.forEach((_, i) => {
        for (const kind of ['colour', 'pcolour']) {
          const row = (kind === 'colour' ? 0 : FELT.length / perRow) + Math.floor(i / perRow);
          tray.push({ kind, value: i, x: inner.x + lead + (i % perRow) * cw, y: inner.y + row * ch, w: cw, h: ch });
        }
      });
      if (lead) {
        tray.push({ kind: 'label', value: 'colour', x: inner.x, y: inner.y, w: lead, h: ch });
        tray.push({ kind: 'label', value: 'pcolour', x: inner.x, y: inner.y + ch, w: lead, h: ch });
      }
    } else {
      const parts = DRAWERS.find((d) => d.id === tab).parts;
      const cols = T.cols;
      const rows = Math.ceil(parts.length / cols);
      const cw = inner.w / cols;
      const ch = inner.h / Math.max(rows, T.phone ? 3 : 2);
      parts.forEach((d, k) => tray.push({ kind: 'part', id: d.id, x: inner.x + (k % cols) * cw, y: inner.y + Math.floor(k / cols) * ch, w: cw, h: ch }));
    }
  }

  function layoutNaming() {
    const { w, h } = G.size;
    const pad = clamp(w * 0.025, 10, 20);
    const phone = w < 600;
    const bar = clamp(h * 0.07, 56, 84);
    const icon = bar - pad * 0.5;
    const nb = [];
    nb.push({ id: 'name-done', icon: 'tick', x: w - pad - icon, y: pad * 0.5, w: icon, h: icon, fill: '#2fbf5b' });
    const bannerY = bar + pad;
    const bannerH = clamp(h * 0.1, 60, 110);
    naming.banner = { x: pad + bannerH * 1.3, y: bannerY, w: w - pad * 2 - bannerH * 1.3, h: bannerH };
    naming.mini = { x: pad, y: bannerY - 6, w: bannerH * 1.2, h: bannerH + 12 };
    // the name tiles
    const ncols = phone ? 2 : 3;
    const nrows = Math.ceil(NAMES.length / ncols);
    const tilesY = bannerY + bannerH + pad;
    const lettersH = clamp(h * 0.27, 170, 300);
    const tilesH = h - tilesY - lettersH - pad * 2;
    const tw = (w - pad * 2) / ncols;
    const th = Math.min(tilesH / nrows, 92);
    NAMES.forEach((n, k) => nb.push({ id: 'name-tile', name: n, x: pad + (k % ncols) * tw + 4, y: tilesY + Math.floor(k / ncols) * th + 4, w: tw - 8, h: th - 8 }));
    // the letters, then rub-out
    const lcols = phone ? 7 : 9;
    const keys = [...LETTERS, 'rub'];
    const lrows = Math.ceil(keys.length / lcols);
    const ly = h - pad - lettersH;
    const lw = (w - pad * 2) / lcols;
    const lh = lettersH / lrows;
    keys.forEach((ch, k) => {
      const span = ch === 'rub' ? lcols - (keys.length - 1) % lcols : 1;
      nb.push({ id: ch === 'rub' ? 'rub' : 'letter', ch, x: pad + (k % lcols) * lw + 3, y: ly + Math.floor(k / lcols) * lh + 3, w: lw * span - 6, h: lh - 6 });
    });
    naming.buttons = nb;
  }

  // ---------- doing things ----------

  function select(i) {
    if (sel === i) return;
    sel = i;
    layout();
  }

  function landed(i, sound = true) {
    const q = p.parts[i];
    if (q) poke(L, q.x > 0 ? 1 : -1, 0.6);
    if (sound && G.time - lastLand > 0.05) play('pop');
    lastLand = G.time;
  }

  function addFromTray(id, x, y) {
    if (p.parts.length >= MAX_PARTS) {
      play('unpop');
      poke(L, 1, 0.5);
      return;
    }
    const def = partDef(id);
    let i;
    if (x === undefined) i = addPart(p, id);
    else {
      const wide = widthOf(p.sock.shape);
      const s = def.drawer === 'hats' || (def.drawer === 'hair' && !def.pair) ? wide : 1;
      i = addPart(p, id, x, y, { s });
    }
    if (i < 0) return;
    sel = i;
    landed(i);
    changed();
    layout();
  }

  function doUndo() {
    if (!undo(p)) return;
    sel = -1;
    L.googly.clear();
    L.seen.clear();
    play('unpop');
    poke(L, -1, 0.4);
    changed();
    layout();
  }

  function surprise() {
    beginEdit(p);
    const r = randomPuppet((Math.random() * 1e9) >>> 0, { uid: p.uid, name: p.name });
    p.sock = r.sock;
    p.parts = r.parts;
    p.extra = [];
    sel = -1;
    L.googly.clear();
    L.seen.clear();
    poof = 0.5;
    play('dice');
    talk(L, 0.5);
    changed();
    layout();
  }

  function deleteSelected() {
    if (sel < 0) return;
    beginEdit(p);
    p.parts.splice(sel, 1);
    sel = -1;
    L.googly.clear();
    L.seen.clear();
    play('unpop');
    changed();
    layout();
  }

  function openNaming() {
    naming = { typed: false, before: { name: p.name, snap: { sock: { ...p.sock }, parts: p.parts.map((q) => ({ ...q })), name: p.name } } };
    sel = -1;
    layout();
  }

  function closeNaming() {
    if (!naming) return;
    if (p.name !== naming.before.name) {
      p.history.push(naming.before.snap);
      changed();
    }
    naming = null;
    G.speech.cancel();
    layout();
  }

  function sayName() {
    if (G.speech.available) G.speech.speak(p.name, { rate: 0.85, pitch: 1.3 });
    else babble(G.voiceOf(p), 3);
    talk(L, 0.6 + p.name.length * 0.06);
  }

  // ---------- drawing ----------

  function drawBackdrop(ctx) {
    const { w, h } = G.size;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#5a2a8a');
    grad.addColorStop(0.55, '#c2368f');
    grad.addColorStop(1, '#ff8a6a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // a soft spotlight behind the puppet
    const r = Math.min(area.w, area.h) * 0.6;
    const sg = ctx.createRadialGradient(view.cx, area.y + area.h * 0.45, 10, view.cx, area.y + area.h * 0.45, r);
    sg.addColorStop(0, 'rgba(255,240,200,0.35)');
    sg.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, area.y, w, area.h);
  }

  function drawTabsAndTray(ctx) {
    const T = tray.box;
    // the drawer
    ctx.fillStyle = '#7a4a2a';
    roundRect(ctx, T.x - 4, T.y - 4, T.w + 8, T.h + 8, 18);
    ctx.fill();
    ctx.fillStyle = '#fff2d6';
    roundRect(ctx, T.x, T.y, T.w, T.h, 14);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    for (const b of tabs) {
      const on = b.tab === tab;
      const x = b.x + 3;
      const w = b.w - 6;
      ctx.fillStyle = on ? '#fff2d6' : '#ffd9a8';
      roundRect(ctx, x, b.y + (on ? 2 : 8), w, b.h + 6, 14);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      const cx = x + w / 2;
      const cy = b.y + b.h / 2 + (on ? 2 : 6);
      const sz = Math.min(w, b.h) * (on ? 0.78 : 0.66);
      if (b.tab === 'sock') drawMiniSock(ctx, cx, cy, sz * 0.95, p.sock);
      else if (b.tab === 'paint') drawPalette(ctx, cx, cy, sz);
      else drawPartIcon(ctx, TAB_ICON[b.tab], cx, cy, sz, G.time);
    }
    // cover the tabs' bottom edges where they meet the drawer
    ctx.fillStyle = '#fff2d6';
    const on = tabs.find((b) => b.tab === tab);
    if (on.y + on.h >= T.y - 2) ctx.fillRect(on.x + 4.5, T.y - 4, on.w - 9, 9);
    for (const it of tray) drawTrayItem(ctx, it);
  }

  function drawTrayItem(ctx, it) {
    const cx = it.x + it.w / 2;
    const cy = it.y + it.h / 2;
    const sz = Math.min(it.w, it.h);
    if (it.kind === 'part') {
      const dragging = g && g.kind === 'new' && g.id === it.id;
      ctx.globalAlpha = dragging ? 0.35 : 1;
      drawPartIcon(ctx, it.id, cx, cy, sz * 0.82, G.time);
      ctx.globalAlpha = 1;
    } else if (it.kind === 'shape' || it.kind === 'pattern') {
      const on = it.kind === 'shape' ? p.sock.shape === it.value : p.sock.pattern === it.value;
      if (on) {
        ctx.fillStyle = 'rgba(255,200,60,0.55)';
        roundRect(ctx, it.x + 3, it.y + 3, it.w - 6, it.h - 6, 12);
        ctx.fill();
      }
      const sock = it.kind === 'shape' ? { ...p.sock, shape: it.value } : { ...p.sock, pattern: it.value };
      drawMiniSock(ctx, cx, cy + (on ? Math.sin(G.time * 5) * 2 : 0), sz * 0.86, sock);
    } else if (it.kind === 'colour' || it.kind === 'pcolour') {
      const on = p.sock[it.kind] === it.value;
      drawSwatch(ctx, cx, cy, Math.min(it.w, it.h) * 0.36, FELT[it.value], on, G.time, it.kind === 'pcolour' ? 'stripes' : 'plain');
    } else if (it.kind === 'label') {
      drawMiniSock(ctx, cx, cy, sz * 0.9, it.value === 'colour' ? { ...p.sock, pattern: 'plain' } : { ...p.sock, colour: 10, pattern: p.sock.pattern === 'plain' ? 'stripes' : p.sock.pattern });
    }
  }

  // A little sock picture (the body image, scaled down).
  function drawMiniSock(ctx, cx, cy, size, sock) {
    const sh = SHAPES[sock.shape];
    const k = (size / 440) * Math.min(2, G.dpr());
    const img = bodyImage(sock, Math.max(0.12, k));
    const sc = size / 470;
    ctx.save();
    ctx.translate(cx, cy - ((sh.cuffBottom + sh.half[0][1]) / 2) * sc);
    ctx.scale(sc, sc);
    ctx.drawImage(img.canvas, img.x0, img.y0, img.w, img.h);
    ctx.restore();
  }

  function drawPalette(ctx, cx, cy, size) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.46, size * 0.36, -0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#e8c48a';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    [0, 2, 4, 7, 9].forEach((c, k) => {
      const a = -2.6 + k * 0.95;
      circle(ctx, Math.cos(a) * size * 0.27, Math.sin(a) * size * 0.2, size * 0.08);
      ctx.fillStyle = FELT[c];
      ctx.fill();
    });
    ctx.restore();
  }

  function drawPuppetArea(ctx) {
    const sh = SHAPES[p.sock.shape];
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, area.y - 40, G.size.w, area.h + 40);
    ctx.clip();
    ctx.translate(view.cx, view.cy);
    ctx.scale(view.s, view.s);
    if (poof > 0) {
      const u = poof / 0.5;
      ctx.rotate(Math.sin(u * Math.PI * 2) * 0.15);
      ctx.scale(1 + Math.sin(u * Math.PI) * 0.12, 1 - Math.sin(u * Math.PI) * 0.1);
    }
    applyWobble(ctx, L, sh.cuffBottom + 200);
    const armTo = (area.y + area.h - view.cy) / view.s + 40;
    drawPuppet(ctx, p, liveAnim(L, view.s * G.dpr(), { armTo, mood: naming ? 'happy' : 'normal' }));
    ctx.restore();
    // the selected part: a dashed box and the handle
    const q = p.parts[sel];
    if (q && !(g && g.kind === 'move' && g.overBin)) {
      const def = partDef(q.id);
      ctx.save();
      ctx.translate(view.cx + q.x * view.s, view.cy + q.y * view.s);
      ctx.rotate(q.r);
      const bw = Math.max(def.w * q.s, 50 / view.s) * view.s + 14;
      const bh = Math.max(def.h * q.s, 50 / view.s) * view.s + 14;
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -G.time * 30;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 12);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      const hp = toScr(...Object.values(handlePos(q, handleMin(), handleBelow())));
      drawHandle(ctx, hp.x, hp.y);
    }
  }

  const handleMin = () => 64 / view.s;
  // the handle goes underneath when the top corner would be off the top of the puppet's area
  const handleBelow = () => {
    const q = p.parts[sel];
    if (!q) return false;
    const hp = handlePos(q, handleMin());
    return view.cy + hp.y * view.s < area.y + 20;
  };
  const hitOpts = () => ({ selected: sel, handleR: handleR(), handleMin: handleMin(), below: handleBelow() });
  const handleR = () => 34 / view.s;

  function drawHandle(ctx, x, y) {
    const r = 26;
    circle(ctx, x, y + 3, r);
    ctx.fillStyle = 'rgba(20,8,40,0.35)';
    ctx.fill();
    circle(ctx, x, y, r);
    ctx.fillStyle = C.sun;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    // round arrows: turn and stretch
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.52, -2.6, 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + r * 0.52 + 6, y - 2);
    ctx.lineTo(x + r * 0.52, y + 8);
    ctx.lineTo(x + r * 0.52 - 7, y - 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.52, 0.55, 2.6);
    ctx.stroke();
  }

  function drawNaming(ctx) {
    const { w, h } = G.size;
    ctx.fillStyle = 'rgba(30,10,60,0.86)';
    ctx.fillRect(0, 0, w, h);
    const B = naming.banner;
    ctx.fillStyle = C.sun;
    roundRect(ctx, B.x, B.y, B.w, B.h, B.h * 0.3);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.font = font(B.h * 0.5);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = p.name + (naming.typed && Math.sin(G.time * 6) > 0 ? '|' : '');
    let px = B.h * 0.5;
    const tw = ctx.measureText(text).width;
    if (tw > B.w - 20) px *= (B.w - 20) / tw;
    ctx.font = font(px);
    ctx.fillText(text, B.x + B.w / 2, B.y + B.h / 2 + 2);
    // the puppet's face, peeking in from the side
    const M = naming.mini;
    ctx.save();
    ctx.beginPath();
    ctx.rect(M.x - 10, M.y - 10, M.w + 20, M.h + 10);
    ctx.clip();
    const s = M.w / 330;
    ctx.translate(M.x + M.w / 2, M.y + M.h * 0.58);
    ctx.scale(s, s);
    drawPuppet(ctx, p, liveAnim(L, s * G.dpr() * 2, { mood: 'happy', armTo: 500 }));
    ctx.restore();
    for (const b of naming.buttons) {
      if (b.id === 'name-tile') {
        const on = b.name === p.name;
        ctx.fillStyle = on ? C.sun : '#ffffff';
        roundRect(ctx, b.x, b.y, b.w, b.h, b.h * 0.3);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = C.ink;
        ctx.stroke();
        ctx.fillStyle = C.ink;
        let fpx = Math.min(b.h * 0.42, 30);
        ctx.font = font(fpx);
        const mw = ctx.measureText(b.name).width;
        if (mw > b.w - 16) fpx *= (b.w - 16) / mw;
        ctx.font = font(fpx);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.name, b.x + b.w / 2, b.y + b.h / 2 + 1);
      } else if (b.id === 'letter') {
        ctx.fillStyle = '#9fe6ff';
        roundRect(ctx, b.x, b.y, b.w, b.h, 10);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = C.ink;
        ctx.stroke();
        ctx.fillStyle = C.ink;
        ctx.font = font(Math.min(b.h, b.w) * 0.58);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.ch, b.x + b.w / 2, b.y + b.h / 2 + 2);
      } else if (b.id === 'rub') {
        drawButton(ctx, { ...b, icon: 'back', fill: '#ffb3c7' }, G.time);
      } else drawButton(ctx, b, G.time);
    }
  }

  // ---------- the screen ----------

  return {
    enter(puppet, opts = {}) {
      p = puppet;
      L = createLive(p.uid.length * 7);
      sel = -1;
      g = null;
      naming = null;
      if (opts.tab) tab = opts.tab;
      layout();
      if (opts.naming) openNaming();
    },
    leave() {
      if (naming) closeNaming();
      g = null;
      G.speech.cancel();
    },
    layout,
    update(dt) {
      stepLive(L, dt, p);
      if (poof > 0) poof = Math.max(0, poof - dt);
      if (!L.look && !g) {
        // look about now and then
        const k = Math.floor(L.t / 3.2);
        if (k % 3 === 2) L.look = null;
      }
    },
    draw(ctx) {
      drawBackdrop(ctx);
      drawPuppetArea(ctx);
      // bin
      const over = g && g.kind === 'move' && g.overBin;
      drawButton(ctx, { ...bin, icon: over ? 'bin-open' : 'bin', fill: over ? '#ff8a8a' : '#ffffff' }, G.time);
      for (const b of buttons) {
        if (b.id === 'undo') drawButton(ctx, { ...b, fill: canUndo(p) ? '#ffffff' : '#c9c0d6' }, G.time);
        else if (b.id === 'layer') drawButton(ctx, { ...b, icon: p.parts[sel]?.back ? 'layer-front' : 'layer-back' }, G.time);
        else if (b.id === 'paint') drawButton(ctx, { ...b, icon: 'paint', colour: felt((p.parts[sel]?.c ?? 0) + 1) }, G.time);
        else if (b.id === 'delete') drawButton(ctx, { ...b, icon: 'bin', fill: '#ffb3c7' }, G.time);
        else drawButton(ctx, b, G.time);
      }
      drawTabsAndTray(ctx);
      // a part on its way from the drawer
      if (g && g.kind === 'new' && g.moved) {
        const def = partDef(g.id);
        const wide = def.drawer === 'hats' || (def.drawer === 'hair' && !def.pair) ? widthOf(p.sock.shape) : 1;
        const size = Math.max(def.w, def.h) * view.s * wide;
        ctx.save();
        ctx.globalAlpha = 0.92;
        const gp = ghostPos();
        drawPartIcon(ctx, g.id, gp.x, gp.y, size, G.time);
        ctx.restore();
      }
      if (naming) drawNaming(ctx);
    },

    pickUp(x, y) {
      if (naming) return false;
      for (const it of tray) {
        if (it.kind === 'part' && hit(it, x, y)) {
          g = { kind: 'new', id: it.id, x0: x, y0: y, x, y, moved: false };
          return true;
        }
      }
      if (buttons.some((b) => hit(b, x, y, 4)) || hit(bin, x, y) || tabs.some((b) => hit(b, x, y)) || hit(tray.box, x, y)) return false;
      if (y < area.y - 30 || y > area.y + area.h + 20) return false;
      const pt = toPup(x, y);
      lookAt(L, pt.x, pt.y);
      const h = hitTest(p, pt.x, pt.y, hitOpts());
      if (!h || h.kind === 'sock') return false;
      const before = JSON.stringify(p.parts);
      beginEdit(p);
      if (h.kind === 'handle') {
        g = { kind: 'handle', i: h.index, part0: { ...p.parts[h.index] }, from: pt, before, x0: x, y0: y };
        return true;
      }
      const q = p.parts[h.index];
      g = { kind: 'move', i: h.index, dx: q.x - pt.x, dy: q.y - pt.y, before, x0: x, y0: y, moved: false, wasSel: sel === h.index, overBin: false };
      select(h.index);
      return true;
    },

    onDrag: null,
    drag(x, y) {
      if (!g) return;
      if (Math.hypot(x - g.x0, y - g.y0) > TAP_MOVE) g.moved = true;
      const pt = toPup(x, y);
      lookAt(L, pt.x, pt.y);
      if (g.kind === 'new') {
        g.x = x;
        g.y = y;
      } else if (g.kind === 'move') {
        if (!g.moved) return;
        movePart(p, g.i, pt.x + g.dx, pt.y + g.dy);
        g.overBin = hit(bin, x, y, 10);
      } else if (g.kind === 'handle') {
        const tr = handleTransform(g.part0, g.from, pt);
        scalePart(p, g.i, tr.s);
        rotatePart(p, g.i, tr.r);
      }
    },

    drop(x, y) {
      if (!g) return;
      this.drag(x, y);
      const gg = g;
      g = null;
      if (gg.kind === 'new') {
        if (!gg.moved) addFromTray(gg.id);
        else {
          const gp = ghostPos(gg);
          if (gp.y < area.y + area.h && gp.y > area.y - 20) {
            const pt = toPup(gp.x, gp.y);
            addFromTray(gg.id, pt.x, pt.y);
          }
        }
        return;
      }
      if (gg.kind === 'move' && gg.overBin) {
        // into the bin (the history step from the pick-up brings it back)
        p.parts.splice(gg.i, 1);
        sel = -1;
        L.googly.clear();
        L.seen.clear();
        play('unpop');
        changed();
        layout();
        return;
      }
      if (gg.kind === 'move' && !gg.moved) {
        p.history.pop();
        // a tap on the puppet's part: a little wiggle
        poke(L, 1, 0.25);
        return;
      }
      snapPart(p, gg.i);
      if (JSON.stringify(p.parts) === gg.before) p.history.pop();
      else {
        landed(gg.i, gg.kind === 'move');
        changed();
      }
      layout();
    },

    tap(x, y) {
      if (naming) {
        const b = naming.buttons.find((r) => hit(r, x, y));
        if (!b) return;
        if (b.id === 'name-done') {
          if (!p.name.trim()) p.name = naming.before.name;
          closeNaming();
        }
        else if (b.id === 'name-tile') {
          p.name = b.name;
          naming.typed = false;
          sayName();
        } else if (b.id === 'letter') {
          const cur = naming.typed ? p.name : '';
          if (cur.length < NAME_MAX) p.name = cleanName(nameFromLetters(cur + b.ch)) || p.name;
          naming.typed = true;
          play('tap');
          talk(L, 0.15);
        } else if (b.id === 'rub') {
          // the first rub-out after picking a name tile starts afresh
          p.name = naming.typed ? nameFromLetters(p.name.slice(0, -1)) : '';
          naming.typed = true;
          play('tap');
        }
        return;
      }
      const b = buttons.find((r) => hit(r, x, y, 4));
      if (b) {
        if (b.id === 'back') G.go('card', p);
        else if (b.id === 'undo') doUndo();
        else if (b.id === 'dice') surprise();
        else if (b.id === 'name') openNaming();
        else if (b.id === 'layer') {
          sel = toggleLayer(p, sel);
          play('tap');
          changed();
          layout();
        } else if (b.id === 'paint') {
          recolour(p, sel);
          play('tap');
          changed();
        } else if (b.id === 'delete') deleteSelected();
        return;
      }
      const tb = tabs.find((r) => hit(r, x, y));
      if (tb) {
        tab = tb.tab;
        play('tap');
        layout();
        return;
      }
      const it = tray.find((r) => hit(r, x, y));
      if (it) {
        let ok = false;
        if (it.kind === 'shape') ok = setSock(p, 'shape', it.value);
        else if (it.kind === 'pattern') ok = setSock(p, 'pattern', it.value);
        else if (it.kind === 'colour' || it.kind === 'pcolour') ok = setSock(p, it.kind, it.value);
        if (ok) {
          play('pop');
          poke(L, 1, 0.5);
          changed();
          layout();
        }
        return;
      }
      if (y > area.y && y < area.y + area.h) {
        const pt = toPup(x, y);
        lookAt(L, pt.x, pt.y);
        const h = hitTest(p, pt.x, pt.y, hitOpts());
        if (h && h.kind === 'sock') {
          // poke the sock: it says something
          talk(L, 0.8);
          poke(L, pt.x > 0 ? 1 : -1, 0.5);
          babble(G.voiceOf(p), 4);
        }
        if (sel >= 0) select(-1);
      }
    },

    // for the debug handle
    debug: {
      view: () => ({ ...view }),
      area: () => ({ ...area }),
      bin: () => ({ ...bin }),
      sel: () => sel,
      tab: () => tab,
      setTab: (t) => {
        tab = t;
        layout();
      },
      tray: () => tray.map((r) => ({ ...r })),
      tabs: () => tabs.map((r) => ({ ...r })),
      buttons: () => (naming ? naming.buttons : buttons).map((r) => ({ ...r })),
      toScreen: (x, y) => toScr(x, y),
      handle: () => (p.parts[sel] ? toScr(...Object.values(handlePos(p.parts[sel], handleMin(), handleBelow()))) : null),
      naming: () => !!naming,
      select: (i) => select(i),
    },
  };

  function ghostPos(gg = g) {
    const def = partDef(gg.id);
    const lift = Math.min(70, def.h * view.s * 0.45 + 20);
    return { x: gg.x, y: gg.y - lift };
  }
}
