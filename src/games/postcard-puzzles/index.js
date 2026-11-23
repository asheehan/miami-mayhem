// Postcard Puzzles as a launcher game: the postcard album, the size chooser, play, the
// finished postcard, touch input and saved progress. Rules live in puzzle.js, pictures in
// scenes/, drawing in draw.js.
import { SCENES } from './scenes/index.js';
import {
  SIZES, sizeOf, createPuzzle, relayout, pickUp, dragTo, drop, tick, hintPiece, autosolve, solveStep,
  toScreen, homeOf, liftUp, pieceScale, pieceAt, loadProgress, saveProgress, recordDone, LIFT_SCALE, PIC_W, PIC_H,
} from './puzzle.js';
import {
  C, font, outlined, roundRect, drawButton, drawIconButton, drawGridIcon, drawBackdrop, drawConfetti,
  drawPostcard, drawAlbumCard, picture, createRenderer, drawTile, cardRect,
} from './draw.js';

const SCENE_IDS = SCENES.map((s) => s.id);
const FINISH_FLASH = 0.5; // s: the picture flashes whole
const FINISH_MORPH = 0.8; // s: the board turns into a postcard
const FINISH_BUTTONS = 1.8; // s after finishing before Next / Again / Album show
const HOLD_EASE = 22; // per second: how quickly the held piece catches up with the finger

const storage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};
const memoryStore = { getItem: () => null, setItem() {} };

export const postcardPuzzles = {
  id: 'postcard-puzzles',
  title: 'Postcard Puzzles',
  drawTile,
  create,
};

const hit = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

function create(host) {
  const params = new URLSearchParams(location.search);
  const debug = params.has('debug');
  const renderer = createRenderer();
  const store = storage() || memoryStore;
  let progress = loadProgress(store, SCENE_IDS);
  let size = { w: 1, h: 1 };
  let screen = 'album'; // 'album' | 'size' | 'play'
  let sceneIndex = 0;
  let sizeN = 6;
  let state = null;
  let buttons = [];
  let time = 0;
  let ghost = true;
  let held = null; // { x, y, k } displayed position of the held piece
  let pops = [];
  let sparkles = [];
  let finishT = 0;
  let recorded = false;

  const doneFor = (i) => progress.done[SCENE_IDS[i]] || [];
  const iconSize = () => Math.max(46, Math.min(64, size.w * 0.12));
  const pad = () => Math.max(10, size.w * 0.025);

  // ---------- layout ----------

  function layoutButtons() {
    const { w, h } = size;
    const icon = iconSize();
    const p = pad();
    buttons = [];
    if (screen === 'album') {
      buttons.push({ id: 'exit', icon: 'home', x: p, y: p, w: icon, h: icon });
      const cols = w > 700 ? 4 : 3;
      const rows = Math.ceil(SCENES.length / cols);
      const top = icon + p * 2.2;
      const gap = Math.max(14, w * 0.035);
      const badgeH = Math.max(24, Math.min(40, h * 0.032));
      // each cell: a 3:4 postcard (with its border) plus a badge row
      const cellW = (w - gap * (cols + 1)) / cols;
      const cellH = (h - top - gap * rows) / rows;
      const pw = Math.min(cellW * 0.86, ((cellH - badgeH - gap * 0.4) * 0.86 * 3) / 4);
      const ph = (pw * 4) / 3;
      const bw = pw / 0.86;
      const bh = ph / 0.86 + badgeH;
      const gx = (w - (cols * bw + (cols - 1) * gap)) / 2;
      const gy = top + Math.max(0, (h - top - (rows * bh + (rows - 1) * gap)) / 2) * 0.5;
      SCENES.forEach((_, i) => {
        const x = gx + (i % cols) * (bw + gap);
        const y = gy + Math.floor(i / cols) * (bh + gap);
        buttons.push({ id: 'scene', index: i, x, y, w: bw, h: bh, badgeH, px: x + (bw - pw) / 2, py: y + (bh - badgeH - ph) / 2, pw, ph });
      });
    } else if (screen === 'size') {
      buttons.push({ id: 'album', icon: 'back', x: p, y: p, w: icon, h: icon });
      const bw = Math.min((w - p * 4) / 3, 210);
      const bh = Math.max(110, Math.min(bw * 1.15, h * 0.2));
      const gap = (w - bw * 3) / 4;
      const y = h - bh - Math.max(24, h * 0.05);
      SIZES.forEach((s, k) => buttons.push({ id: 'size', n: s.n, x: gap + k * (bw + gap), y, w: bw, h: bh }));
    } else if (screen === 'play') {
      const L = state.layout;
      const ih = Math.max(44, Math.min(60, L.hudH * 0.74));
      const iy = (L.hudH - ih) / 2;
      buttons.push({ id: 'size', icon: 'back', x: p, y: iy, w: ih, h: ih });
      if (state.status === 'play') buttons.push({ id: 'ghost', icon: ghost ? 'eye' : 'eye-off', x: w - p - ih, y: iy, w: ih, h: ih });
      if (state.status === 'done' && finishT > FINISH_BUTTONS) {
        const fr = finishRect();
        const cr = cardRect(fr.x, fr.y, fr.w, fr.h);
        const room = h - (cr.y + cr.h) - Math.max(16, h * 0.02);
        const bh = Math.max(56, Math.min(88, room * 0.4, h * 0.08));
        const bwide = Math.min(w * 0.8, 420);
        const x = (w - bwide) / 2;
        const by = cr.y + cr.h + Math.max(14, (room - bh * 2.2) / 2);
        buttons.push({ id: 'next', label: 'Next', glyph: 'next', x, y: by, w: bwide, h: bh });
        const small = (bwide - 14) / 2;
        buttons.push({ id: 'again', label: 'Again', glyph: 'restart', x, y: by + bh * 1.2, w: small, h: bh * 0.85, fill: C.white });
        buttons.push({ id: 'album', label: 'Album', glyph: 'album', x: x + small + 14, y: by + bh * 1.2, w: small, h: bh * 0.85, fill: C.white });
      }
    }
  }

  // Where the finished postcard's picture ends up.
  function finishRect() {
    const { w, h } = size;
    const top = state.layout.hudH;
    const maxH = h * 0.58;
    let pw = Math.min(w * 0.8, 560);
    let ph = (pw * PIC_H) / PIC_W;
    if (ph > maxH) {
      ph = maxH;
      pw = (ph * PIC_W) / PIC_H;
    }
    return { x: (w - pw) / 2, y: top + Math.max(8, h * 0.015), w: pw, h: ph };
  }

  // ---------- flow ----------

  function goto(next) {
    screen = next;
    held = null;
    if (next !== 'play') state = null;
    layoutButtons();
  }

  function startPuzzle(index, n) {
    sceneIndex = ((index % SCENES.length) + SCENES.length) % SCENES.length;
    sizeN = sizeOf(n).n;
    state = createPuzzle({ sceneId: SCENE_IDS[sceneIndex], size: sizeN, w: size.w, h: size.h });
    ghost = sizeN <= 12;
    held = null;
    pops = [];
    sparkles = [];
    finishT = 0;
    recorded = false;
    screen = 'play';
    renderer.reset();
    layoutButtons();
  }

  function landed(i) {
    pops.push({ i, t: 0 });
    const hp = homeOf(state.cut, i);
    const c = toScreen(state.layout, hp.x, hp.y);
    const colours = [C.sun, C.white, C.pink, C.foam];
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2 + Math.random() * 0.3;
      const sp = 90 + Math.random() * 160;
      sparkles.push({ x: c.x, y: c.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 7 + Math.random() * 7, t: 0, life: 0.55 + Math.random() * 0.3, c: colours[k % 4] });
    }
    if (state.status === 'done' && !recorded) {
      recorded = true;
      recordDone(progress, SCENE_IDS[sceneIndex], sizeN);
      saveProgress(store, progress);
      held = null;
      layoutButtons();
    }
  }

  // ---------- drawing ----------

  function drawAlbum(ctx) {
    const { w, h } = size;
    drawBackdrop(ctx, w, h, time);
    const icon = buttons[0];
    const doneCount = SCENES.filter((_, i) => doneFor(i).length > 0).length;
    outlined(ctx, 'Postcards', w / 2, icon.y + icon.h / 2, Math.min(h * 0.05, w / 8), C.sun, w - (icon.w + icon.x) * 2 - 90);
    // finished count, top right
    ctx.font = font(Math.min(22, w * 0.05));
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(`${doneCount} / ${SCENES.length}`, w - pad(), icon.y + icon.h / 2);
    for (const b of buttons) {
      if (b.icon) drawIconButton(ctx, b);
      else drawAlbumCard(ctx, b, b.index, doneFor(b.index), time);
    }
  }

  function drawSizeScreen(ctx) {
    const { w, h } = size;
    drawBackdrop(ctx, w, h, time);
    const icon = buttons[0];
    const scene = SCENES[sceneIndex];
    outlined(ctx, scene.place, w / 2, icon.y + icon.h / 2, Math.min(h * 0.045, w / 10), C.white, w - (icon.w + icon.x) * 2 - 16);
    // the postcard, big
    const sizeBtn = buttons[1];
    const top = icon.y + icon.h + Math.max(16, h * 0.025);
    const bottom = sizeBtn.y - Math.max(20, h * 0.03);
    const avail = bottom - top;
    let ph = avail / 1.2;
    let pw = (ph * 3) / 4;
    if (pw > w * 0.84) {
      pw = w * 0.84;
      ph = (pw * 4) / 3;
    }
    const dpr = window.devicePixelRatio || 1;
    const pic = picture(sceneIndex, pw * dpr);
    const py = top + (avail - ph * 1.2) / 2 + ph * 0.05;
    drawPostcard(ctx, sceneIndex, pic, (w - pw) / 2, py, pw, ph, 1, -0.02);
    // size buttons: a grid picture and the number of pieces
    const done = doneFor(sceneIndex);
    const suggest = done.length === 0 ? 6 : SIZES.find((s) => !done.includes(s.n))?.n;
    for (const b of buttons) {
      if (b.icon) {
        drawIconButton(ctx, b);
        continue;
      }
      const s = sizeOf(b.n);
      const bob = b.n === suggest ? Math.sin(time * 4) * 4 : 0;
      const y = b.y + bob;
      ctx.fillStyle = 'rgba(22,11,51,0.35)';
      roundRect(ctx, b.x, y + 6, b.w, b.h, 22);
      ctx.fill();
      ctx.fillStyle = b.n === 6 ? C.sun : b.n === 12 ? '#9ff7f2' : '#ff9ec8';
      roundRect(ctx, b.x, y, b.w, b.h, 22);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      drawGridIcon(ctx, b.x + b.w / 2, y + b.h * 0.38, b.h * 0.5, s, C.ink);
      ctx.font = font(b.h * 0.22);
      ctx.fillStyle = C.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(s.n), b.x + b.w / 2, y + b.h * 0.82);
      if (done.includes(s.n)) {
        const r = b.h * 0.14;
        const cx = b.x + b.w - r * 0.6;
        const cy = y + r * 0.6;
        ctx.fillStyle = C.gold;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = C.ink;
        ctx.stroke();
        ctx.lineWidth = r * 0.3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.45, cy);
        ctx.lineTo(cx - r * 0.1, cy + r * 0.38);
        ctx.lineTo(cx + r * 0.5, cy - r * 0.35);
        ctx.stroke();
      }
    }
  }

  function drawHud(ctx) {
    const L = state.layout;
    const cy = L.hudH / 2;
    const n = state.pieces.length;
    const placed = state.pieces.filter((p) => p.placed).length;
    const px = Math.min(L.hudH * 0.4, size.w / 12);
    // a little puzzle-piece pill with the count
    const label = `${placed} / ${n}`;
    ctx.font = font(px);
    const tw = ctx.measureText(label).width;
    const pw = tw + px * 1.6;
    ctx.fillStyle = 'rgba(22,11,51,0.3)';
    roundRect(ctx, size.w / 2 - pw / 2, cy - px * 0.8, pw, px * 1.6, px * 0.8);
    ctx.fill();
    outlined(ctx, label, size.w / 2, cy + 1, px, placed === n ? C.sun : C.white);
  }

  function drawPlay(ctx) {
    const { w, h } = size;
    drawBackdrop(ctx, w, h, time);
    const hint = hintPiece(state);
    if (state.status === 'done' && finishT > FINISH_FLASH) {
      drawFinish(ctx);
    } else {
      renderer.drawPlay(ctx, state, sceneIndex, { ghost, held, hint, pops, sparkles, time });
      if (state.status === 'done') {
        // flash
        const k = 1 - finishT / FINISH_FLASH;
        ctx.fillStyle = `rgba(255,255,255,${0.7 * Math.sin(k * Math.PI)})`;
        ctx.fillRect(0, 0, w, h);
      }
      drawHud(ctx);
    }
    for (const b of buttons) {
      if (b.icon) drawIconButton(ctx, b, b.id === 'ghost' && ghost);
      else drawButton(ctx, b, b.fill);
    }
  }

  function drawFinish(ctx) {
    const { w, h } = size;
    const L = state.layout;
    const t = finishT - FINISH_FLASH;
    const m = Math.min(1, t / FINISH_MORPH);
    const e = m * m * (3 - 2 * m);
    const fr = finishRect();
    const x = L.bx + (fr.x - L.bx) * e;
    const y = L.by + (fr.y - L.by) * e;
    const pw = L.bw + (fr.w - L.bw) * e;
    const ph = L.bh + (fr.h - L.bh) * e;
    drawConfetti(ctx, w, h, t);
    drawPostcard(ctx, sceneIndex, renderer.picture(), x, y, pw, ph, e, -0.035 * e + Math.sin(time * 1.5) * 0.006 * e);
    for (const s of sparkles) {
      ctx.globalAlpha = Math.max(0, 1 - s.t / s.life);
      ctx.fillStyle = s.c;
      ctx.fillRect(s.x - 2, s.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- debug hook ----------

  if (debug) {
    window.__postcard = {
      scenes: () => SCENES.map((s, i) => ({ i, id: s.id, place: s.place })),
      state: () => state,
      screen: () => screen,
      buttons: () => buttons.map((b) => ({ ...b })),
      progress: () => JSON.parse(JSON.stringify(progress)),
      layout: () => state && { ...state.layout },
      open: (i, n = 6) => startPuzzle(typeof i === 'string' ? SCENE_IDS.indexOf(i) : i, n),
      goto: (name, i) => {
        if (i !== undefined) sceneIndex = i;
        goto(name);
      },
      // where piece i is drawn now and where its home is, in screen px (finger targets)
      piece(i) {
        const p = state.pieces[i];
        const hp = homeOf(state.cut, i);
        const c = toScreen(state.layout, p.x, p.y);
        const home = toScreen(state.layout, hp.x, hp.y);
        return { x: c.x, y: c.y, homeX: home.x, homeY: home.y + liftUp(state), placed: p.placed, scale: pieceScale(state, p) };
      },
      solveStep() {
        const r = solveStep(state);
        if (r?.placed) landed(r.i);
        return r;
      },
      autosolve() {
        const before = state.pieces.filter((p) => p.placed).map((p) => p.i);
        autosolve(state);
        state.pieces.filter((p) => p.placed && !before.includes(p.i)).forEach((p) => landed(p.i));
        return state.status;
      },
      idle(sec) {
        state.idle = sec;
      },
      sceneImage(i, width = 600) {
        const c = document.createElement('canvas');
        c.width = width;
        c.height = Math.round((width * PIC_H) / PIC_W);
        SCENES[i].draw(c.getContext('2d'), c.width, c.height);
        return c.toDataURL('image/png');
      },
    };
  }

  const api = {
    resize(w, h) {
      size = { w, h };
      if (state) relayout(state, w, h);
      layoutButtons();
    },

    update(dt) {
      time += dt;
      if (screen !== 'play' || !state) return;
      tick(state, dt);
      for (const p of pops) p.t += dt;
      pops = pops.filter((p) => p.t < 0.5);
      for (const s of sparkles) {
        s.t += dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= 1 - 2.5 * dt;
        s.vy = s.vy * (1 - 2.5 * dt) + 120 * dt;
      }
      sparkles = sparkles.filter((s) => s.t < s.life);
      if (held && state.held !== null) {
        const p = state.pieces[state.held];
        const c = toScreen(state.layout, p.x, p.y);
        const a = Math.min(1, dt * HOLD_EASE);
        held.x += (c.x - held.x) * a;
        held.y += (c.y - held.y) * a;
        held.k += (LIFT_SCALE - held.k) * a;
      }
      if (state.status === 'done') {
        const before = finishT > FINISH_BUTTONS;
        finishT += dt;
        if (finishT > FINISH_FLASH + 0.3 && finishT - dt <= FINISH_FLASH + 0.3) {
          // a burst of sparkles round the postcard as it turns over
          const fr = finishRect();
          for (let k = 0; k < 30; k++) {
            const a = (k / 30) * Math.PI * 2;
            sparkles.push({ x: fr.x + fr.w / 2, y: fr.y + fr.h / 2, vx: Math.cos(a) * 320, vy: Math.sin(a) * 320, r: 8, t: 0, life: 0.8, c: [C.sun, C.white, C.pink][k % 3] });
          }
        }
        if (!before && finishT > FINISH_BUTTONS) layoutButtons();
      }
    },

    draw(ctx) {
      if (screen === 'album') drawAlbum(ctx);
      else if (screen === 'size') drawSizeScreen(ctx);
      else if (state) drawPlay(ctx);
    },

    onPickUp(x, y) {
      if (screen !== 'play' || !state || state.status !== 'play') return false;
      if (buttons.some((b) => hit(b, x, y))) return false;
      const j = pieceAt(state, x, y);
      if (j < 0) return false;
      // the lift starts from where the piece was drawn, at the size it was drawn
      const p = state.pieces[j];
      const c = toScreen(state.layout, p.x, p.y);
      const k = pieceScale(state, p);
      pickUp(state, x, y);
      held = { x: c.x, y: c.y, k };
      return true;
    },
    onDrag(x, y) {
      if (state && state.held !== null) dragTo(state, x, y);
    },
    onDrop(x, y) {
      if (!state || state.held === null) return;
      dragTo(state, x, y);
      const r = drop(state);
      held = null;
      if (r?.placed) landed(r.i);
    },
    onTap(x, y) {
      const b = buttons.find((r) => hit(r, x, y));
      if (!b) return;
      if (b.id === 'exit') host.exit();
      else if (b.id === 'scene') {
        sceneIndex = b.index;
        goto('size');
      } else if (b.id === 'size' && screen === 'size') startPuzzle(sceneIndex, b.n);
      else if (b.id === 'size') goto('size');
      else if (b.id === 'album') goto('album');
      else if (b.id === 'ghost') {
        ghost = !ghost;
        layoutButtons();
      } else if (b.id === 'again') startPuzzle(sceneIndex, sizeN);
      else if (b.id === 'next') startPuzzle(sceneIndex + 1, sizeN);
    },
  };

  const startScene = Number(params.get('scene'));
  if (Number.isInteger(startScene) && startScene >= 1 && startScene <= SCENES.length) {
    const n = Number(params.get('pieces'));
    sceneIndex = startScene - 1;
    if (SIZES.some((s) => s.n === n)) {
      size = { w: window.innerWidth || 820, h: window.innerHeight || 1180 };
      startPuzzle(sceneIndex, n);
    } else screen = 'size';
  }
  layoutButtons();
  return api;
}
