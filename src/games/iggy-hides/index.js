// Where's Iggy? as a launcher game: the menu, the scene picker, the sticker album, play
// (pan by dragging, tap to find, the hint glass), the finish party and saved stars. Rules live
// in logic.js, scenes in scenes/, pictures in art/, drawing in draw.js.
import { SCENES, SCENE_IDS } from './scenes/index.js';
import {
  computeLayout, camBounds, clampCam, dragCam, stepCamera, centerOn, toWorld, toScreen,
  startGesture, moveGesture, endGesture, createRound, tapTarget, markFound, useHint, hintReady, hintCharge,
  idleNudge, nearestUnfound, starsFor, loadProgress, saveProgress, recordStars,
} from './logic.js';
import {
  C, font, roundRect, outlined, drawButton, drawIconButton, drawStar, drawMagnifier, drawBackdrop, drawConfetti,
  drawSparkle, drawIcon, drawIggyIcon, drawSticker, drawLive, buildStatic, thumb, hasThumb, overview, drawTile, dprNow,
} from './draw.js';
import { drawIggy } from './art/iggy.js';

const FLY_TIME = 0.75; // s for a found thing to fly to the tray
const RING_TIME = 2.6; // s the hint ring shows
const TWEEN_TIME = 0.9; // s for the hint's camera glide
const FINISH_DELAY = 0.9; // s after the last find before the party
const FINISH_BUTTONS = 2.4; // s into the party before its buttons show

const storage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};
const memoryStore = { getItem: () => null, setItem() {} };
const hit = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
const ease = (k) => k * k * (3 - 2 * k);

export const iggyHides = {
  id: 'iggy-hides',
  title: "Where's Iggy?",
  drawTile,
  create,
};

function create(host) {
  const params = new URLSearchParams(location.search);
  const debug = params.has('debug');
  const store = storage() || memoryStore;
  let progress = loadProgress(store, SCENE_IDS);
  let size = { w: 1, h: 1 };
  let screen = 'menu'; // 'menu' | 'picker' | 'stickers' | 'play'
  let buttons = [];
  let time = 0;
  let wiggleSticker = null;

  // play state
  let index = 0;
  let scene = null;
  let round = null;
  let L = null;
  let cam = { x: 0, y: 0 };
  let vel = { x: 0, y: 0 };
  let bounds = null;
  let layer = null;
  let gesture = null;
  let dragStart = null;
  let tween = null;
  let ring = null;
  let pops = {};
  let flyers = [];
  let sparkles = [];
  let puffs = [];
  let bumps = {}; // slot index -> time it last got something
  let finish = null; // { t, stars, newSticker }
  let hintShake = 0;
  let seedNext = Number(params.get('seed')) || 0;

  const now = () => time;
  const totalStars = () => SCENE_IDS.reduce((a, id) => a + progress.stars[id], 0);
  const stickers = () => SCENE_IDS.filter((id) => progress.stars[id] > 0).length;
  const firstUnplayed = () => {
    const i = SCENE_IDS.findIndex((id) => progress.stars[id] === 0);
    return i < 0 ? 0 : i;
  };

  // ---------- layout ----------

  function layoutButtons() {
    const { w, h } = size;
    const icon = Math.max(48, Math.min(64, w * 0.12));
    const pad = Math.max(10, w * 0.025);
    buttons = [];
    if (screen === 'menu') {
      const bw = Math.min(w * 0.8, 420);
      const bh = Math.max(64, Math.min(96, h * 0.085));
      const x = (w - bw) / 2;
      const y0 = h * 0.64;
      buttons.push({ id: 'exit', icon: 'home', x: pad, y: pad, w: icon, h: icon });
      buttons.push({ id: 'play', label: 'Play', glyph: 'play', x, y: y0, w: bw, h: bh });
      const half = (bw - 14) / 2;
      buttons.push({ id: 'picker', label: 'Scenes', glyph: 'grid', x, y: y0 + bh * 1.3, w: half, h: bh * 0.9, fill: C.white });
      buttons.push({ id: 'stickers', label: 'Stickers', glyph: 'sticker', x: x + half + 14, y: y0 + bh * 1.3, w: half, h: bh * 0.9, fill: C.white });
    } else if (screen === 'picker' || screen === 'stickers') {
      buttons.push({ id: 'menu', icon: 'back', x: pad, y: pad, w: icon, h: icon });
      const cols = w > 600 ? 3 : 2;
      const rows = Math.ceil(SCENES.length / cols);
      const top = icon + pad * 2;
      const gap = Math.max(12, w * 0.03);
      if (screen === 'picker') {
        const cardW = (w - gap * (cols + 1)) / cols;
        const starH = Math.max(28, cardW * 0.16);
        const cellH = Math.min((h - top - gap * rows) / rows, cardW * 0.7 + starH);
        const picW = Math.min(cardW, ((cellH - starH) * SCENES[0].W) / SCENES[0].H);
        const cw = picW;
        const gx = (w - (cols * cw + (cols - 1) * gap)) / 2;
        SCENES.forEach((sc, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const inRow = r === rows - 1 ? SCENES.length - cols * (rows - 1) : cols;
          const rx = (w - (inRow * cw + (inRow - 1) * gap)) / 2;
          buttons.push({ id: 'scene', index: i, x: (inRow < cols ? rx : gx) + c * (cw + gap), y: top + r * (cellH + gap), w: cw, h: cellH, picH: (cw * sc.H) / sc.W });
        });
      } else {
        const cell = Math.min((w - gap * (cols + 1)) / cols, (h - top - gap * (rows + 1)) / rows);
        const gx = (w - (cols * cell + (cols - 1) * gap)) / 2;
        SCENES.forEach((_, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const inRow = r === rows - 1 ? SCENES.length - cols * (rows - 1) : cols;
          const rx = (w - (inRow * cell + (inRow - 1) * gap)) / 2;
          buttons.push({ id: 'sticker', index: i, x: (inRow < cols ? rx : gx) + c * (cell + gap), y: top + gap * 0.5 + r * (cell + gap), w: cell, h: cell });
        });
      }
    } else if (screen === 'play' && L) {
      buttons.push({ id: 'picker', icon: 'back', ...L.home });
      const hb = L.hint;
      buttons.push({ id: 'hint', x: hb.x - hb.r, y: hb.y - hb.r, w: hb.r * 2, h: hb.r * 2 });
      buttons.push({ id: 'mini', ...L.mini });
      if (finish && finish.t > FINISH_BUTTONS) {
        const bw = Math.min(w * 0.8, 420);
        const bh = Math.max(60, Math.min(90, h * 0.075));
        const x = (w - bw) / 2;
        const by = h - bh * 2.35 - Math.max(18, h * 0.03);
        buttons.push({ id: 'next', label: 'Next', glyph: 'next', x, y: by, w: bw, h: bh });
        const half = (bw - 14) / 2;
        buttons.push({ id: 'again', label: 'Again', glyph: 'restart', x, y: by + bh * 1.25, w: half, h: bh * 0.9, fill: C.white });
        buttons.push({ id: 'picker2', label: 'Scenes', glyph: 'grid', x: x + half + 14, y: by + bh * 1.25, w: half, h: bh * 0.9, fill: C.white });
      }
    }
  }

  function goto(next) {
    screen = next;
    gesture = null;
    if (next !== 'play') {
      round = null;
      layer = null;
      finish = null;
    }
    layoutButtons();
  }

  // ---------- play ----------

  function relayout() {
    if (!scene) return;
    L = computeLayout(size.w, size.h, scene, round.targets.length);
    bounds = camBounds(L, scene);
    cam = clampCam(cam, bounds);
    const dpr = dprNow();
    if (!layer || Math.abs(layer.s - L.s) > 1e-6 || layer.dpr !== dpr) layer = buildStatic(scene, round, L.s, dpr);
    layoutButtons();
  }

  function startScene(i, seed) {
    index = ((i % SCENES.length) + SCENES.length) % SCENES.length;
    scene = SCENES[index];
    const s = seed || seedNext || Math.floor(Math.random() * 1e9) + 1;
    seedNext = 0;
    round = createRound(scene, s, now());
    screen = 'play';
    pops = {};
    flyers = [];
    sparkles = [];
    puffs = [];
    bumps = {};
    ring = null;
    tween = null;
    finish = null;
    gesture = null;
    vel = { x: 0, y: 0 };
    layer = null;
    L = null;
    relayout();
    // start in the middle of the bottom half, where the busiest bits usually are
    cam = centerOn(L, bounds, scene.W / 2, scene.H * 0.55);
  }

  const viewCentre = () => toWorld(L, cam, size.w / 2, L.viewH / 2);
  const slotOf = (target) => L.slots[target];

  function found(i) {
    const r = markFound(round, i, now());
    if (!r) return;
    const it = round.instances[i];
    const p = toScreen(L, cam, it.spot.x, it.spot.y);
    pops[i] = 0;
    flyers.push({ target: it.target, x: p.x, y: p.y, k: L.s * Math.max(it.spot.hw, it.spot.hh) * 1.3, t: 0 });
    const colours = [C.sun, C.white, C.pink, C.foam];
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * Math.PI * 2 + Math.random() * 0.3;
      const sp = 120 + Math.random() * 200;
      sparkles.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 7 + Math.random() * 8, t: 0, life: 0.6 + Math.random() * 0.3, c: colours[k % 4] });
    }
    if (ring && ring.inst === i) ring = null;
    if (r.roundDone) {
      const stars = starsFor(round.hintsUsed);
      const rec = recordStars(progress, scene.id, stars);
      saveProgress(store, progress);
      finish = { t: -FINISH_DELAY, stars, newSticker: rec.newSticker };
    }
  }

  function tapScene(x, y) {
    const wpt = toWorld(L, dragStart, x, y);
    const i = tapTarget(round, wpt.x, wpt.y);
    if (i >= 0) found(i);
    else puffs.push({ x, y, t: 0 });
  }

  function hint() {
    const c = viewCentre();
    const i = useHint(round, now(), c.x, c.y);
    if (i < 0) {
      hintShake = 0.4;
      return;
    }
    const sp = round.instances[i].spot;
    // the ring marks the area, not the exact spot
    const ox = (Math.random() - 0.5) * sp.hw * 0.8;
    const oy = (Math.random() - 0.5) * sp.hh * 0.8;
    ring = { inst: i, wx: sp.x + ox, wy: sp.y + oy, t: 0 };
    tween = { from: { ...cam }, to: centerOn(L, bounds, sp.x, sp.y), t: 0 };
    vel = { x: 0, y: 0 };
  }

  // ---------- drawing ----------

  function drawMenu(ctx) {
    const { w, h } = size;
    drawBackdrop(ctx, w, h, time);
    const px = Math.min(h * 0.075, w / 7);
    ctx.save();
    ctx.translate(w / 2 + Math.sin(time * 2) * 3, h * 0.15);
    ctx.rotate(-0.04 + Math.sin(time * 1.4) * 0.02);
    outlined(ctx, "WHERE'S", 0, 0, px, C.white, w * 0.9);
    outlined(ctx, 'IGGY?', 0, px * 1.15, px * 1.45, C.green, w * 0.9);
    ctx.restore();
    // Iggy peeking over a dune, and the magnifying glass finding him
    const sc = Math.min(w, h * 0.6) / 170;
    const dx = w * 0.5;
    const dy = h * 0.5;
    const k = time % 5;
    const up = k < 0.4 ? k / 0.4 : k < 3.8 ? 1 : k < 4.2 ? 1 - (k - 3.8) / 0.4 : 0;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, dy);
    ctx.clip();
    ctx.translate(dx + sc * 10, dy + (1 - up) * 70 * sc);
    ctx.scale(sc * 1.6, sc * 1.6);
    drawIggy(ctx, 'peek', time, {});
    ctx.restore();
    ctx.fillStyle = '#f2c46a';
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-10, dy + 30);
    ctx.quadraticCurveTo(w * 0.25, dy - 20, w * 0.5, dy);
    ctx.quadraticCurveTo(w * 0.75, dy + 20, w + 10, dy - 10);
    ctx.lineTo(w + 10, h * 0.62);
    ctx.lineTo(-10, h * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // the glass searches about, then settles beside him while he is up
    const gx = dx + w * 0.26 + Math.sin(time * 0.9) * w * 0.12 * (1 - up * 0.85);
    drawMagnifier(ctx, gx, dy - sc * 62 + Math.cos(time * 1.3) * 6, sc * 20);
    const total = totalStars();
    if (total > 0) {
      const r = Math.min(h * 0.02, w * 0.04);
      const label = `${total} / ${SCENES.length * 3}`;
      ctx.font = font(r * 1.8);
      const tw = ctx.measureText(label).width;
      drawStar(ctx, w / 2 - tw / 2 - r * 0.9, h * 0.6, r, true);
      outlined(ctx, label, w / 2 + r * 0.6, h * 0.6, r * 1.8, C.white);
    }
    for (const b of buttons) b.icon ? drawIconButton(ctx, b) : drawButton(ctx, b, b.fill);
  }

  function drawPicker(ctx) {
    const { w, h } = size;
    drawBackdrop(ctx, w, h, time);
    const icon = buttons[0];
    outlined(ctx, 'Scenes', w / 2, icon.y + icon.h / 2, Math.min(h * 0.045, w / 9), C.sun, w - (icon.w + icon.x) * 2 - 10);
    let rendered = false;
    const dpr = dprNow();
    for (const b of buttons) {
      if (b.icon) {
        drawIconButton(ctx, b);
        continue;
      }
      const sc = SCENES[b.index];
      const stars = progress.stars[sc.id];
      ctx.fillStyle = 'rgba(22,11,51,0.35)';
      roundRect(ctx, b.x, b.y + 5, b.w, b.picH, 14);
      ctx.fill();
      ctx.save();
      roundRect(ctx, b.x, b.y, b.w, b.picH, 14);
      ctx.clip();
      const tw = b.w * dpr;
      if (hasThumb(sc, tw) || !rendered) {
        if (!hasThumb(sc, tw)) rendered = true; // one new thumbnail per frame
        ctx.drawImage(thumb(sc, tw), b.x, b.y, b.w, b.picH);
      } else {
        ctx.fillStyle = sc.edge;
        ctx.fillRect(b.x, b.y, b.w, b.picH);
      }
      ctx.restore();
      roundRect(ctx, b.x, b.y, b.w, b.picH, 14);
      ctx.lineWidth = 4;
      ctx.strokeStyle = C.white;
      ctx.stroke();
      const sr = Math.min((b.h - b.picH) * 0.36, b.w * 0.08);
      for (let k = 0; k < 3; k++) drawStar(ctx, b.x + b.w / 2 + (k - 1) * sr * 2.4, b.y + b.picH + (b.h - b.picH) / 2 + 2, sr, k < stars);
      if (stars > 0) drawSticker(ctx, sc, b.x + b.w - sr * 1.2, b.y + sr * 1.2, sr * 1.3, time);
    }
  }

  function drawStickers(ctx) {
    const { w, h } = size;
    drawBackdrop(ctx, w, h, time);
    const icon = buttons[0];
    outlined(ctx, `Stickers ${stickers()} / ${SCENES.length}`, w / 2, icon.y + icon.h / 2, Math.min(h * 0.04, w / 11), C.sun, w - (icon.w + icon.x) * 2 - 10);
    for (const b of buttons) {
      if (b.icon) {
        drawIconButton(ctx, b);
        continue;
      }
      const sc = SCENES[b.index];
      const got = progress.stars[sc.id] > 0;
      const r = b.w * 0.4;
      ctx.save();
      ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
      const wig = wiggleSticker && wiggleSticker.i === b.index ? Math.sin((time - wiggleSticker.t) * 25) * Math.max(0, 0.5 - (time - wiggleSticker.t)) : 0;
      ctx.rotate(((b.index % 3) - 1) * 0.06 + wig);
      drawSticker(ctx, sc, 0, 0, r, got ? time : 0, got);
      ctx.restore();
    }
  }

  function drawTray(ctx) {
    const { w, h } = size;
    const y0 = L.viewH;
    ctx.fillStyle = 'rgba(22,11,51,0.35)';
    ctx.fillRect(0, y0 - 4, w, 4);
    const g = ctx.createLinearGradient(0, y0, 0, h);
    g.addColorStop(0, '#fff3d0');
    g.addColorStop(1, '#ffd98a');
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, w, h - y0);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(0, y0, w, 3);
    const nudge = idleNudge(round, now()) && !ring && !finish;
    const c = viewCentre();
    const nudgeTarget = nudge ? round.instances[nearestUnfound(round, c.x, c.y)]?.target : -1;
    round.targets.forEach((tg, i) => {
      const s = L.slots[i];
      const done = tg.found >= tg.count;
      const bump = bumps[i] !== undefined ? Math.max(0, 1 - (time - bumps[i]) / 0.5) : 0;
      const wig = i === nudgeTarget ? Math.sin(time * 18) * 0.18 * (0.6 + 0.4 * Math.sin(time * 2)) : 0;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(wig);
      ctx.scale(1 + bump * 0.3, 1 + bump * 0.3);
      const r = s.size / 2;
      ctx.fillStyle = 'rgba(22,11,51,0.18)';
      roundRect(ctx, -r, -r + 3, r * 2, r * 2, r * 0.3);
      ctx.fill();
      ctx.fillStyle = done ? '#c8f5a8' : tg.iggy ? '#fff6c0' : '#ffffff';
      roundRect(ctx, -r, -r, r * 2, r * 2, r * 0.3);
      ctx.fill();
      ctx.lineWidth = tg.iggy ? 4 : 2.5;
      ctx.strokeStyle = tg.iggy ? C.gold : 'rgba(22,11,51,0.5)';
      ctx.stroke();
      ctx.globalAlpha = done ? 0.55 : 1;
      if (tg.iggy) drawIggyIcon(ctx, 0, 0, s.size * 0.88, time, false);
      else drawIcon(ctx, scene, tg.prop, tg.o, 0, 0, s.size * 0.74, 0);
      ctx.globalAlpha = 1;
      if (done) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = r * 0.32;
        ctx.beginPath();
        ctx.moveTo(-r * 0.4, 0);
        ctx.lineTo(-r * 0.1, r * 0.35);
        ctx.lineTo(r * 0.5, -r * 0.4);
        ctx.stroke();
        ctx.strokeStyle = '#3fbf3a';
        ctx.lineWidth = r * 0.18;
        ctx.stroke();
      } else if (tg.count > 1) {
        const left = tg.count - tg.found;
        const br = r * 0.36;
        ctx.fillStyle = C.pink;
        ctx.beginPath();
        ctx.arc(r * 0.72, -r * 0.72, br, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = C.ink;
        ctx.stroke();
        outlined(ctx, String(left), r * 0.72, -r * 0.7, br * 1.3, C.white);
      }
      ctx.restore();
    });
    // the hint button: a big magnifying glass with a charge ring
    const hb = L.hint;
    const charge = hintCharge(round, now());
    const ready = hintReady(round, now());
    const pulse = ready && nudge ? 1 + Math.sin(time * 7) * 0.08 : 1;
    const shake = hintShake > 0 ? Math.sin(hintShake * 50) * 5 : 0;
    ctx.save();
    ctx.translate(hb.x + shake, hb.y);
    ctx.scale(pulse, pulse);
    if (ready && nudge) {
      ctx.fillStyle = 'rgba(255,225,77,0.5)';
      ctx.beginPath();
      ctx.arc(0, 0, hb.r * 1.25, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(22,11,51,0.3)';
    ctx.beginPath();
    ctx.arc(0, 4, hb.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ready ? C.sun : '#e8dcc0';
    ctx.beginPath();
    ctx.arc(0, 0, hb.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    if (!ready) {
      ctx.strokeStyle = '#3fbf3a';
      ctx.lineWidth = hb.r * 0.16;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, hb.r * 0.86, -Math.PI / 2, -Math.PI / 2 + charge * Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = ready ? 1 : 0.45;
    drawMagnifier(ctx, -hb.r * 0.18, -hb.r * 0.18, hb.r * 0.38);
    ctx.restore();
  }

  function drawMinimap(ctx) {
    const m = L.mini;
    const dpr = dprNow();
    ctx.save();
    ctx.fillStyle = 'rgba(22,11,51,0.45)';
    roundRect(ctx, m.x - 4, m.y - 4, m.w + 8, m.h + 8, 10);
    ctx.fill();
    ctx.drawImage(thumb(scene, m.w * dpr), m.x, m.y, m.w, m.h);
    const k = m.w / scene.W;
    const vx = m.x + Math.max(0, cam.x) * k;
    const vy = m.y + Math.max(0, cam.y) * k;
    const vw = Math.min(scene.W, size.w / L.s) * k;
    const vh = Math.min(scene.H, L.viewH / L.s) * k;
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.white;
    ctx.strokeRect(Math.min(vx, m.x + m.w - vw), Math.min(vy, m.y + m.h - vh), vw, vh);
    ctx.restore();
  }

  // soft chevrons on the edges where there is more scene to see
  function drawEdgeArrows(ctx) {
    const { w } = size;
    const vh = L.viewH;
    const a = 0.45 + 0.25 * Math.sin(time * 3);
    const r = Math.max(14, Math.min(22, w * 0.04));
    const nudge = Math.sin(time * 3) * 3;
    const arrows = [];
    if (cam.x > bounds.minX + 8) arrows.push([r * 1.1 - nudge, vh / 2, Math.PI]);
    if (cam.x < bounds.maxX - 8) arrows.push([w - r * 1.1 + nudge, vh / 2, 0]);
    if (cam.y > bounds.minY + 8) arrows.push([w / 2, L.mini.y + L.mini.h + r * 1.6 - nudge, -Math.PI / 2]);
    if (cam.y < bounds.maxY - 8) arrows.push([w / 2, vh - r * 1.1 + nudge, Math.PI / 2]);
    for (const [x, y, ang] of arrows) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(22,11,51,0.5)';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.white;
      ctx.lineWidth = r * 0.25;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 0.45);
      ctx.lineTo(r * 0.3, 0);
      ctx.lineTo(-r * 0.2, r * 0.45);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawPlay(ctx) {
    const { w } = size;
    const s = L.s;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, L.viewH);
    ctx.clip();
    ctx.fillStyle = scene.edge;
    ctx.fillRect(0, 0, w, L.viewH);
    ctx.save();
    ctx.translate(-cam.x * s, -cam.y * s);
    for (const tile of layer.tiles) ctx.drawImage(tile.c, tile.wx * s, tile.wy * s, tile.ww * s, tile.wh * s);
    ctx.scale(s, s);
    const view = { x0: cam.x, y0: cam.y, x1: cam.x + w / s, y1: cam.y + L.viewH / s };
    drawLive(ctx, scene, round, time, view, pops);
    ctx.restore();
    // hint ring: shrinks onto the area, twice
    if (ring) {
      const p = toScreen(L, cam, ring.wx, ring.wy);
      const k = (ring.t % (RING_TIME / 2)) / (RING_TIME / 2);
      const big = Math.max(w, L.viewH) * 0.5;
      const small = Math.max(60, s * 90);
      const rr = big + (small - big) * ease(Math.min(1, k * 1.3));
      ctx.globalAlpha = ring.t > RING_TIME - 0.4 ? (RING_TIME - ring.t) / 0.4 : 1;
      ctx.lineWidth = 10;
      ctx.strokeStyle = 'rgba(22,11,51,0.5)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 6;
      ctx.strokeStyle = C.sun;
      ctx.setLineDash([18, 12]);
      ctx.lineDashOffset = -time * 40;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    for (const pf of puffs) {
      const k = pf.t / 0.45;
      ctx.globalAlpha = Math.max(0, 1 - k);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(pf.x + Math.cos(a) * 18 * k, pf.y + Math.sin(a) * 18 * k, 5 * (1 - k) + 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (!gesture && !finish) drawEdgeArrows(ctx);
    ctx.restore();
    for (const sk of sparkles) {
      ctx.globalAlpha = Math.max(0, 1 - sk.t / sk.life);
      drawSparkle(ctx, sk.x, sk.y, sk.r, sk.c);
    }
    ctx.globalAlpha = 1;
    drawTray(ctx);
    // things flying to the tray
    for (const f of flyers) {
      const slot = slotOf(f.target);
      const k = ease(Math.min(1, f.t / FLY_TIME));
      const x = f.x + (slot.x - f.x) * k;
      const y = f.y + (slot.y - f.y) * k - Math.sin(k * Math.PI) * 90;
      const sz = f.k * 2 + (slot.size - f.k * 2) * k;
      const tg = round.targets[f.target];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(k * Math.PI) * 0.5);
      if (tg.iggy) drawIggyIcon(ctx, 0, 0, sz * 0.95, time, true);
      else drawIcon(ctx, scene, tg.prop, tg.o, 0, 0, sz * 0.8, time);
      ctx.restore();
    }
    drawMinimap(ctx);
    for (const b of buttons) if (b.icon) drawIconButton(ctx, b);
    if (finish && finish.t > 0) drawFinish(ctx);
  }

  function drawFinish(ctx) {
    const { w, h } = size;
    const t = finish.t;
    ctx.fillStyle = `rgba(22,11,51,${Math.min(0.72, t * 1.4)})`;
    ctx.fillRect(0, 0, w, h);
    drawConfetti(ctx, w, h, t);
    const px = Math.min(h * 0.06, w / 8);
    const pop = 1 + Math.max(0, 0.6 - t) * 1.2;
    outlined(ctx, finish.stars === 3 ? 'WOW!' : 'Hooray!', w / 2, h * 0.09, px * pop, C.sun, w * 0.9);
    // stars
    const sr = Math.min(w * 0.08, h * 0.04);
    for (let i = 0; i < 3; i++) {
      const at = 0.5 + i * 0.25;
      const sk = t < at ? 0 : Math.min(1, (t - at) / 0.15);
      const grow = sk * (1 + Math.max(0, 0.3 - (t - at)) * 0.8);
      if (grow > 0) drawStar(ctx, w / 2 + (i - 1) * sr * 2.5, h * 0.09 + px * 1.1 + (i === 1 ? -sr * 0.3 : 0), sr * grow, i < finish.stars);
    }
    // everything found dances round Iggy
    const cx = w / 2;
    const cy = h * 0.4;
    const R = Math.min(w * 0.36, h * 0.2);
    const others = round.targets.filter((tg) => !tg.iggy);
    const isz = Math.min(R * 0.55, w * 0.15);
    others.forEach((tg, i) => {
      const a = -Math.PI / 2 + (i / others.length) * Math.PI * 2 + time * 0.4;
      const x = cx + Math.cos(a) * R;
      const y = cy + Math.sin(a) * R * 0.85 - Math.abs(Math.sin(time * 5 + i)) * 12;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(time * 5 + i) * 0.25);
      drawIcon(ctx, scene, tg.prop, tg.o, 0, 0, isz, time);
      ctx.restore();
    });
    const isc = (R * 1.1) / 90;
    ctx.save();
    ctx.translate(cx, cy + R * 0.45 - Math.abs(Math.sin(time * 4)) * 14);
    ctx.rotate(Math.sin(time * 4) * 0.12);
    ctx.scale(isc, isc);
    drawIggy(ctx, 'stand', time * 1.5, {});
    ctx.restore();
    // the sticker slides in
    if (t > 1.4) {
      const k = Math.min(1, (t - 1.4) / 0.5);
      const sr2 = Math.min(w * 0.14, h * 0.07);
      const by = (buttons.find((b) => b.id === 'next')?.y ?? h * 0.78) - sr2 * 1.35;
      const sy = by + (1 - ease(k)) * h * 0.4;
      ctx.save();
      ctx.translate(w / 2, sy);
      ctx.rotate((1 - k) * 3 - 0.08);
      drawSticker(ctx, scene, 0, 0, sr2, time, true);
      ctx.restore();
      if (finish.newSticker && k >= 1) {
        ctx.save();
        ctx.translate(w / 2 + sr2 * 1.05, sy - sr2 * 0.8);
        ctx.rotate(0.25 + Math.sin(time * 4) * 0.05);
        ctx.fillStyle = C.pink;
        roundRect(ctx, -sr2 * 0.55, -sr2 * 0.22, sr2 * 1.1, sr2 * 0.44, sr2 * 0.2);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = C.ink;
        ctx.stroke();
        outlined(ctx, 'NEW!', 0, 1, sr2 * 0.3, C.white);
        ctx.restore();
      }
    }
    for (const b of buttons) if (!b.icon && b.label) drawButton(ctx, b, b.fill);
  }

  // ---------- debug hook ----------

  if (debug) {
    window.__iggy = {
      scenes: () => SCENES.map((s, i) => ({ i, id: s.id, name: s.name, W: s.W, H: s.H, iggySpots: s.iggy.length, items: s.items.length })),
      screen: () => screen,
      buttons: () => buttons.map((b) => ({ ...b })),
      progress: () => JSON.parse(JSON.stringify(progress)),
      layout: () => L && { ...L },
      cam: () => ({ ...cam }),
      round: () => round && {
        seed: round.seed, hintsUsed: round.hintsUsed, done: round.done,
        targets: round.targets.map((t) => ({ id: t.id, count: t.count, found: t.found })),
      },
      finish: () => finish && { ...finish },
      open: (i, seed) => startScene(typeof i === 'string' ? SCENE_IDS.indexOf(i) : i, seed),
      goto: (name) => goto(name),
      // unfound instances, with where they are on screen right now (null if off screen)
      targets() {
        return round.instances.map((it, i) => {
          const p = toScreen(L, cam, it.spot.x, it.spot.y);
          const on = p.x > 0 && p.x < size.w && p.y > 0 && p.y < L.viewH;
          return { i, id: round.targets[it.target].id, found: it.found, wx: it.spot.x, wy: it.spot.y, hw: it.spot.hw, hh: it.spot.hh, sx: on ? p.x : null, sy: on ? p.y : null };
        });
      },
      lookAt(wx, wy) {
        cam = centerOn(L, bounds, wx, wy);
        vel = { x: 0, y: 0 };
        tween = null;
      },
      setCam(x, y) {
        cam = { x, y };
        vel = { x: 0, y: 0 };
      },
      find: (i) => found(i),
      findAll() {
        round.instances.forEach((it, i) => !it.found && found(i));
      },
      idle(sec) {
        round.lastFoundAt = now() - sec;
        round.startedAt = now() - sec;
      },
      charge() {
        round.nextHintAt = now();
      },
      hint: () => hint(),
      fastForward(sec) {
        for (let k = 0; k < sec; k += 1 / 30) api.update(1 / 30);
      },
      // the whole scene scaled to fit `width`, with this round's hidden things (and boxes)
      overview(i, width = 1200, boxes = false, seed = null) {
        const sc = i == null ? scene : SCENES[typeof i === 'string' ? SCENE_IDS.indexOf(i) : i];
        const rd = sc === scene && round && seed == null ? round : createRound(sc, seed || 1, 0);
        return overview(sc, rd, width, time, boxes).toDataURL('image/png');
      },
      layerInfo: () => layer && { R: layer.R, tiles: layer.tiles.map((tl) => [tl.c.width, tl.c.height]) },
    };
  }

  // ---------- the game interface ----------

  const api = {
    resize(w, h) {
      size = { w, h };
      if (screen === 'play' && scene) relayout();
      else layoutButtons();
    },

    update(dt) {
      time += dt;
      if (screen !== 'play' || !round) return;
      hintShake = Math.max(0, hintShake - dt);
      if (tween) {
        tween.t += dt;
        const k = ease(Math.min(1, tween.t / TWEEN_TIME));
        cam = { x: tween.from.x + (tween.to.x - tween.from.x) * k, y: tween.from.y + (tween.to.y - tween.from.y) * k };
        if (tween.t >= TWEEN_TIME) tween = null;
      } else if (!gesture) stepCamera(cam, vel, dt, bounds);
      if (ring) {
        ring.t += dt;
        if (ring.t > RING_TIME) ring = null;
      }
      for (const k of Object.keys(pops)) {
        pops[k] += dt / 0.5;
        if (pops[k] >= 1) delete pops[k];
      }
      for (const f of flyers) {
        f.t += dt;
        if (f.t >= FLY_TIME && !f.landed) {
          f.landed = true;
          bumps[f.target] = time;
        }
      }
      flyers = flyers.filter((f) => f.t < FLY_TIME);
      for (const s of sparkles) {
        s.t += dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= 1 - 2.5 * dt;
        s.vy = s.vy * (1 - 2.5 * dt) + 140 * dt;
      }
      sparkles = sparkles.filter((s) => s.t < s.life);
      for (const p of puffs) p.t += dt;
      puffs = puffs.filter((p) => p.t < 0.45);
      if (finish) {
        const before = finish.t > FINISH_BUTTONS;
        finish.t += dt;
        if (!before && finish.t > FINISH_BUTTONS) layoutButtons();
      }
    },

    draw(ctx) {
      if (screen === 'menu') drawMenu(ctx);
      else if (screen === 'picker') drawPicker(ctx);
      else if (screen === 'stickers') drawStickers(ctx);
      else if (round && L) drawPlay(ctx);
    },

    onPickUp(x, y) {
      if (screen !== 'play' || !round || finish) return false;
      if (buttons.some((b) => hit(b, x, y))) return false;
      if (y >= L.viewH) return false;
      gesture = startGesture(x, y, performance.now() / 1000);
      dragStart = { ...cam };
      tween = null;
      vel = { x: 0, y: 0 };
      return true;
    },
    onDrag(x, y) {
      if (!gesture) return;
      moveGesture(gesture, x, y, performance.now() / 1000);
      cam = dragCam(dragStart, x - gesture.x0, y - gesture.y0, L.s, bounds);
    },
    onDrop(x, y) {
      if (!gesture) return;
      const g = endGesture(gesture, x, y, performance.now() / 1000);
      const x0 = gesture.x0;
      const y0 = gesture.y0;
      gesture = null;
      if (g.tap) {
        cam = { ...dragStart };
        tapScene(x0, y0);
      } else {
        vel = { x: -g.vx / L.s, y: -g.vy / L.s };
      }
    },
    onTap(x, y) {
      const b = buttons.find((r) => hit(r, x, y));
      if (!b) return;
      if (b.id === 'exit') host.exit();
      else if (b.id === 'play') startScene(firstUnplayed());
      else if (b.id === 'picker' || b.id === 'picker2') goto('picker');
      else if (b.id === 'stickers') goto('stickers');
      else if (b.id === 'menu') goto('menu');
      else if (b.id === 'scene') startScene(b.index);
      else if (b.id === 'sticker') wiggleSticker = { i: b.index, t: time };
      else if (b.id === 'hint') {
        if (!finish) hint();
      } else if (b.id === 'mini') {
        if (finish) return;
        const k = scene.W / L.mini.w;
        tween = { from: { ...cam }, to: centerOn(L, bounds, (x - L.mini.x) * k, (y - L.mini.y) * k), t: 0 };
        vel = { x: 0, y: 0 };
      } else if (b.id === 'again') startScene(index);
      else if (b.id === 'next') startScene(index + 1);
    },
  };

  const forced = Number(params.get('level'));
  if (Number.isInteger(forced) && forced >= 1 && forced <= SCENES.length) {
    size = { w: window.innerWidth || 820, h: window.innerHeight || 1180 };
    startScene(forced - 1);
  }
  layoutButtons();
  return api;
}
