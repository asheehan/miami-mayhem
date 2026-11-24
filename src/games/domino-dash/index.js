// Domino Dash as a launcher game: menu, level picker, free play, play and win screens, drawing
// trails with a finger, the eraser and undo, the camera and saved stars. Rules live in sim.js,
// levels in levels.js, drawing in draw.js.
import { LEVELS, FREE } from './levels.js';
import {
  createLevel, step, go, standUp, beginStroke, strokeTo, endStroke, beginErase, eraseAt, endErase,
  clearAll, undo, dropGoal, left, used, twoStar, settled, parseProgress, serializeProgress, unlocked,
  SNAP, ERASE_R, GOAL_KINDS,
} from './sim.js';
import { layRoute, drawLine } from './bot.js';
import {
  C, KY, THEMES, font, roundRect, outlined, drawStar, drawButton, drawIconButton, drawFinger, drawLock,
  createRenderer, drawTile, drawTeachIcon, drawGoal, drawDomino, glyph,
} from './draw.js';
import { unlockAudio, play } from './sound.js';

const SAVE_KEY = 'domino-dash-progress';
const WIN_BUTTON_DELAY = 1.8; // seconds after the last goal before Next shows
const PAD = 20; // world units of paving shown round the table

export function loadProgress() {
  try {
    return parseProgress(localStorage.getItem(SAVE_KEY) || '{}', LEVELS.length);
  } catch {
    return parseProgress(null, LEVELS.length);
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(SAVE_KEY, serializeProgress(progress));
  } catch {
    // not kept if storage is unavailable
  }
}

export const dominoDash = {
  id: 'domino-dash',
  title: 'Domino Dash',
  drawTile,
  create,
};

const hit = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// The menu's little demo table: a curving trail to a bell that falls over and over.
const DEMO = {
  w: 380, h: 250, start: { x: 50, y: 200, a: -60 }, supply: 40, par: 40,
  goals: [{ kind: 'bell', x: 330, y: 70 }],
  obstacles: [{ kind: 'cup', x: 300, y: 190, r: 26 }],
  route: [[[50, 200], [80, 150], [140, 110], [210, 130], [270, 100], [330, 70]]],
};

function create(host) {
  const params = new URLSearchParams(location.search);
  const debug = params.has('debug');
  const renderer = createRenderer();
  const demoRenderer = createRenderer();
  let size = { w: 1, h: 1 };
  let progress = loadProgress();
  let screen = 'menu'; // 'menu' | 'picker' | 'play'
  let game = null;
  let index = 0; // level index, or -1 for free play
  let view = { sc: 1, s0: 1, ax: 0, ay: 0, cx: 0, cy: 0, zoom: 1, hudH: 60, barH: 70 };
  let buttons = [];
  let time = 0;
  let lastDt = 0;
  let recorded = false;
  let drag = null; // { kind: 'lay' | 'erase' | 'carry', x, y }
  let eraser = false;
  let trayKind = 0;
  let heard = 0;
  let demo = null;
  let demoWait = 0;

  const totalStars = () => progress.stars.reduce((a, b) => a + b, 0);
  const firstOpen = () => {
    for (let i = 0; i < LEVELS.length; i++) if (unlocked(progress, i) && progress.stars[i] === 0) return i;
    return 0;
  };
  const themeOpen = (i) => totalStars() >= THEMES[i].stars;
  const theme = () => THEMES[themeOpen(progress.theme) ? progress.theme : 0] || THEMES[0];

  // world (x, y on the table) <-> screen px
  const toScreen = (x, y, z = 0) => ({ x: view.ax + (x - view.cx) * view.sc, y: view.ay + ((y - view.cy) * KY - z * 0.6) * view.sc });
  const toWorld = (sx, sy) => ({ x: (sx - view.ax) / view.sc + view.cx, y: (sy - view.ay) / view.sc / KY + view.cy });

  function layoutView() {
    const { w, h } = size;
    const hudH = Math.max(64, Math.min(100, h * 0.075));
    const barH = Math.max(80, Math.min(124, h * 0.1));
    view.hudH = hudH;
    view.barH = barH;
    if (!game) return;
    const areaH = h - hudH - barH;
    const tw = game.w + PAD * 2;
    const th = (game.h + PAD * 2) * KY + 14;
    view.s0 = Math.min((w - 8) / tw, (areaH - 6) / th);
    view.ax = w / 2;
    view.ay = hudH + areaH / 2;
    if (!view.cx) resetCamera();
    view.sc = view.s0 * view.zoom;
  }

  function resetCamera() {
    view.zoom = 1;
    view.cx = game.w / 2;
    view.cy = game.h / 2 + 8;
    view.sc = view.s0;
  }

  // Where the camera wants to be: on the falling front of the chain for big tables.
  function cameraTarget() {
    const z = game.def.zoom || 1;
    const running = game.status === 'run' || (game.status === 'won' && game.statusT < 1.2);
    if (z <= 1 || !running) return { zoom: 1, x: game.w / 2, y: game.h / 2 + 8 };
    let n = 0;
    let fx = 0;
    let fy = 0;
    for (const d of game.dominoes) {
      if (d.state === 'fall') {
        fx += d.x;
        fy += d.y;
        n++;
      }
    }
    for (const g of game.gadgets) {
      if (g.state === 'go' && g.path) {
        fx += g.x;
        fy += g.y;
        n++;
      }
    }
    if (!n) return { zoom: z, x: view.cx, y: view.cy };
    const tx = fx / n;
    const ty = fy / n;
    // keep the view on the table
    const sc = view.s0 * z;
    const hw = size.w / 2 / sc;
    const hh = (size.h - view.hudH - view.barH) / 2 / sc / KY;
    const cx = hw * 2 >= game.w + PAD * 2 ? game.w / 2 : clamp(tx, hw - PAD, game.w + PAD - hw);
    const cy = hh * 2 >= game.h + PAD * 2 ? game.h / 2 : clamp(ty, hh - PAD, game.h + PAD - hh);
    return { zoom: z, x: cx, y: cy };
  }

  function updateCamera(dt) {
    const t = cameraTarget();
    const k = Math.min(1, dt * 2.6);
    view.zoom += (t.zoom - view.zoom) * k;
    view.cx += (t.x - view.cx) * k;
    view.cy += (t.y - view.cy) * k;
    view.sc = view.s0 * view.zoom;
  }

  function layoutButtons() {
    const { w, h } = size;
    const bw = Math.min(w * 0.8, 420);
    const bh = Math.max(64, Math.min(96, h * 0.08));
    const x = (w - bw) / 2;
    const icon = Math.max(48, Math.min(68, w * 0.12));
    const pad = Math.max(10, w * 0.025);
    if (screen === 'menu') {
      const n = firstOpen();
      const y0 = h * 0.66;
      buttons = [
        { id: 'exit', icon: 'home', x: pad, y: pad, w: icon, h: icon },
        { id: 'play', label: `Play ${n + 1}`, glyph: 'play', x, y: y0, w: bw, h: bh },
        { id: 'picker', label: 'Levels', glyph: 'grid', x, y: y0 + bh * 1.25, w: bw * 0.48, h: bh, fill: C.white },
        { id: 'free', label: 'Free', glyph: 'domino', x: x + bw * 0.52, y: y0 + bh * 1.25, w: bw * 0.48, h: bh, fill: '#7ff0c0' },
        { id: 'theme', x: w - pad - icon, y: pad, w: icon, h: icon },
      ];
    } else if (screen === 'picker') {
      buttons = [{ id: 'menu', icon: 'back', x: pad, y: pad, w: icon, h: icon }];
      const cols = 3;
      const rows = Math.ceil(LEVELS.length / cols);
      const top = Math.max(icon + pad * 2, h * 0.12);
      const gap = Math.max(12, w * 0.03);
      const tw = Math.min((w - gap * (cols + 1)) / cols, 220);
      const th = Math.min(tw * 0.9, (h - top - gap * (rows + 1)) / rows);
      const gx = (w - (tw * cols + gap * (cols - 1))) / 2;
      LEVELS.forEach((_, i) => {
        buttons.push({ id: 'level', index: i, x: gx + (i % cols) * (tw + gap), y: top + Math.floor(i / cols) * (th + gap), w: tw, h: th });
      });
    } else if (screen === 'play') {
      const ih = Math.max(46, Math.min(62, view.hudH * 0.74));
      const iy = (view.hudH - ih) / 2;
      buttons = [
        { id: 'menu', icon: 'home', x: pad, y: iy, w: ih, h: ih },
        { id: 'restart', icon: 'restart', x: w - pad - ih, y: iy, w: ih, h: ih },
      ];
      if (!game) return;
      const won = game.status === 'won';
      if (won) {
        if (game.statusT > WIN_BUTTON_DELAY) {
          const last = index === LEVELS.length - 1;
          const by = h - bh * 2.6 - Math.max(20, h * 0.04);
          buttons.push({ id: 'next', label: last ? 'Levels' : 'Next', glyph: last ? 'grid' : 'next', x, y: by, w: bw, h: bh * 1.1 });
          buttons.push({ id: 'again', label: 'Again', glyph: 'restart', x: x + bw * 0.15, y: by + bh * 1.35, w: bw * 0.7, h: bh * 0.85, fill: C.white });
        }
        return;
      }
      // the bottom bar: tools on the left, GO on the right
      const bh2 = Math.min(view.barH * 0.72, 84);
      const by = h - view.barH + (view.barH - bh2) / 2;
      const tool = Math.min(bh2, (w - pad * 2) / 6.2);
      const gap = Math.max(8, w * 0.02);
      const busy = game.status === 'run';
      let tx = pad;
      const add = (b) => {
        buttons.push({ ...b, x: tx, y: by + (bh2 - tool) / 2, w: tool, h: tool, dim: busy });
        tx += tool + gap;
      };
      add({ id: 'undo', icon: 'undo', dim: busy || !game.history.length });
      add({ id: 'eraser', icon: 'eraser', on: eraser });
      add({ id: 'clear', icon: 'trash' });
      if (game.free) add({ id: 'tray', tray: true });
      const gw = Math.min(w - tx - pad, Math.max(tool * 2.2, w * 0.3));
      const stopped = game.status === 'stopped';
      buttons.push({ id: 'go', label: stopped ? 'Again' : 'GO', glyph: stopped ? 'restart' : 'play', x: w - pad - gw, y: by, w: gw, h: bh2, fill: busy ? '#9fb8a8' : C.green, busy });
    }
  }

  function startLevel(i) {
    index = i;
    const def = i < 0 ? FREE : LEVELS[clamp(i, 0, LEVELS.length - 1)];
    if (i >= 0) index = clamp(i, 0, LEVELS.length - 1);
    game = createLevel(def);
    screen = 'play';
    recorded = false;
    drag = null;
    eraser = false;
    heard = 0;
    renderer.reset();
    view.cx = 0;
    layoutView();
    resetCamera();
    layoutButtons();
  }

  function goto(next) {
    screen = next;
    drag = null;
    if (next !== 'play') game = null;
    layoutButtons();
  }

  function record() {
    recorded = true;
    if (index < 0) return;
    progress.stars[index] = Math.max(progress.stars[index], game.stars);
    saveProgress(progress);
  }

  function snapWorld() {
    return Math.max(SNAP, 46 / view.sc);
  }

  // ---------- the menu's demo table ----------

  function demoReset() {
    demo = createLevel(DEMO);
    drawLine(demo, DEMO.route[0]);
    demoRenderer.reset();
    demoRenderer.sync(demo);
    demoWait = 1.2;
  }

  function demoStep(dt) {
    if (!demo) demoReset();
    step(demo, dt);
    if (demo.status === 'build') {
      demoWait -= dt;
      if (demoWait <= 0) go(demo);
    } else if (settled(demo)) {
      if (demo.status === 'won' && demo.statusT > 2.2) {
        standUp(demo);
        demoWait = 1.4;
      }
    }
  }

  function demoDraw(ctx, x, y, w, h) {
    const s = Math.min(w / (DEMO.w + 40), h / ((DEMO.h + 40) * KY + 10));
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(s, s);
    ctx.translate(-DEMO.w / 2, (-DEMO.h / 2) * KY - 4);
    demoRenderer.drawWorld(ctx, demo, time, { theme: theme(), dt: lastDt, view: { x0: -DEMO.w, y0: -DEMO.h, x1: DEMO.w * 2, y1: DEMO.h * 2 } });
    ctx.restore();
  }

  // ---------- drawing ----------

  function drawBackdrop(ctx) {
    const { w, h } = size;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2b1055');
    g.addColorStop(0.45, '#7a1fa2');
    g.addColorStop(1, '#ff6f61');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function drawMenu(ctx) {
    const { w, h } = size;
    drawBackdrop(ctx);
    // palm silhouettes either side
    ctx.fillStyle = 'rgba(22,11,51,0.45)';
    for (const [px, flip] of [[w * 0.06, 1], [w * 0.94, -1]]) {
      ctx.fillRect(px - 5, h * 0.18, 10, h * 0.5);
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.45 + Math.sin(time * 0.8 + i) * 0.03;
        ctx.beginPath();
        ctx.ellipse(px + Math.cos(a) * 55 * flip, h * 0.18 + Math.sin(a) * 30 + 30, 60, 11, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    demoDraw(ctx, w * 0.03, h * 0.24, w * 0.94, h * 0.38);
    const px = Math.min(h * 0.075, w / 6.4);
    ctx.save();
    ctx.translate(w / 2 + Math.sin(time * 2) * 3, h * 0.1);
    ctx.rotate(-0.04 + Math.sin(time * 1.5) * 0.025);
    outlined(ctx, 'DOMINO', 0, 0, px, C.white, w * 0.86);
    outlined(ctx, 'DASH', 0, px * 1.08, px * 1.25, C.sun, w * 0.86);
    ctx.restore();
    const total = totalStars();
    if (total > 0) {
      const ty2 = h * 0.635;
      const r = Math.min(h * 0.02, w * 0.04);
      ctx.font = font(r * 1.8);
      const label = `${total} / ${LEVELS.length * 3}`;
      const tw = ctx.measureText(label).width;
      drawStar(ctx, w / 2 - tw / 2 - r * 0.8, ty2, r, true);
      outlined(ctx, label, w / 2 + r * 0.8, ty2, r * 1.8, C.white);
    }
    for (const b of buttons) {
      if (b.id === 'theme') drawThemeButton(ctx, b);
      else if (b.icon) drawIconButton(ctx, b);
      else drawButton(ctx, b, b.fill);
    }
  }

  // The colour swatch: a domino in the current colours; tap to try the next unlocked set.
  function drawThemeButton(ctx, b) {
    ctx.fillStyle = 'rgba(22,11,51,0.35)';
    roundRect(ctx, b.x, b.y, b.w, b.h, b.w * 0.24);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.stroke();
    ctx.save();
    ctx.translate(b.x + b.w / 2, b.y + b.h * 0.78);
    const k = b.h / 46;
    ctx.scale(k, k);
    drawDomino(ctx, 0, 0, -Math.PI / 2 - 0.5, 0, { theme: theme(), pips: [5, 3], id: progress.theme });
    ctx.restore();
    const open = THEMES.filter((_, i) => themeOpen(i)).length;
    if (open > 1) {
      ctx.fillStyle = C.sun;
      ctx.beginPath();
      ctx.arc(b.x + b.w - 6, b.y + 6, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.ink;
      ctx.font = font(12);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(open), b.x + b.w - 6, b.y + 7);
    }
  }

  function drawPicker(ctx) {
    const { w } = size;
    drawBackdrop(ctx);
    const icon = buttons[0];
    outlined(ctx, 'Levels', w / 2, icon.y + icon.h / 2, Math.min(size.h * 0.05, w / 9), C.sun, w - (icon.w + icon.x) * 2 - 10);
    for (const b of buttons) {
      if (b.icon) {
        drawIconButton(ctx, b);
        continue;
      }
      const L = LEVELS[b.index];
      const open = unlocked(progress, b.index);
      const stars = progress.stars[b.index];
      ctx.fillStyle = 'rgba(22,11,51,0.35)';
      roundRect(ctx, b.x, b.y + 5, b.w, b.h, 18);
      ctx.fill();
      ctx.fillStyle = C.wood;
      roundRect(ctx, b.x, b.y, b.w, b.h, 18);
      ctx.fill();
      ctx.fillStyle = C.felt;
      roundRect(ctx, b.x + 6, b.y + 6, b.w - 12, b.h - 12, 13);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = open ? C.white : 'rgba(255,255,255,0.4)';
      roundRect(ctx, b.x, b.y, b.w, b.h, 18);
      ctx.stroke();
      const r = Math.min(b.w * 0.2, b.h * 0.22);
      ctx.save();
      roundRect(ctx, b.x + 6, b.y + 6, b.w - 12, b.h - 12, 13);
      ctx.clip();
      drawTeachIcon(ctx, L.teach, b.x + b.w * 0.66, b.y + b.h * 0.4, r, open ? time + b.index : 0);
      ctx.restore();
      outlined(ctx, String(b.index + 1), b.x + b.w * 0.25, b.y + b.h * 0.36, b.h * 0.3, C.white, b.w * 0.36);
      const sr = Math.min(b.w * 0.1, b.h * 0.1);
      for (let k = 0; k < 3; k++) drawStar(ctx, b.x + b.w / 2 + (k - 1) * sr * 2.3, b.y + b.h * 0.8, sr, k < stars);
      if (!open) {
        ctx.fillStyle = 'rgba(22,11,51,0.55)';
        roundRect(ctx, b.x, b.y, b.w, b.h, 18);
        ctx.fill();
        drawLock(ctx, b.x + b.w / 2, b.y + b.h * 0.45, Math.min(b.w, b.h) * 0.16);
      }
    }
  }

  // Top bar: how many dominoes are left, and the stars still in reach.
  function drawHud(ctx) {
    const { w } = size;
    const { hudH } = view;
    const cy = hudH / 2;
    const n = left(game);
    const r = Math.min(hudH * 0.3, w * 0.05);
    const label = `${n}`;
    ctx.font = font(r * 1.7);
    const tw = Math.max(ctx.measureText(label).width, r * 1.7);
    const stars = game.free ? 0 : 3;
    const boxW = r * 2.2 + tw + (stars ? r * 7.2 : 0) + r * 1.2;
    const bx = w / 2 - boxW / 2;
    ctx.fillStyle = 'rgba(22,11,51,0.35)';
    roundRect(ctx, bx, cy - r * 1.3, boxW, r * 2.6, r * 1.3);
    ctx.fill();
    const flash = game.stroke && game.stroke.empty ? 0.5 + 0.5 * Math.sin(time * 14) : 0;
    glyph(ctx, 'domino', bx + r * 1.4, cy, r * 0.75, C.ink);
    outlined(ctx, label, bx + r * 2.3 + tw / 2, cy, r * 1.7, flash > 0.5 ? C.red : n === 0 ? C.orange : C.white);
    if (stars) {
      // what a win right now would be worth
      const u = used(game);
      const worth = u <= game.def.par ? 3 : u <= twoStar(game.def) ? 2 : 1;
      for (let k = 0; k < 3; k++) drawStar(ctx, bx + r * 4 + tw + k * r * 2.05, cy, r * 0.8, k < worth);
    }
  }

  function drawTrayButton(ctx, b) {
    ctx.fillStyle = 'rgba(22,11,51,0.35)';
    roundRect(ctx, b.x, b.y, b.w, b.h, b.w * 0.24);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.rect(b.x, b.y, b.w, b.h);
    ctx.clip();
    ctx.translate(b.x + b.w / 2, b.y + b.h * 0.78);
    const k = b.h / 64;
    ctx.scale(k, k);
    ctx.globalAlpha = b.dim ? 0.4 : 1;
    drawGoal(ctx, GOAL_KINDS[trayKind], -1, time);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawBar(ctx) {
    const { w, h } = size;
    ctx.fillStyle = 'rgba(22,11,51,0.45)';
    ctx.fillRect(0, h - view.barH, w, view.barH);
  }

  // Level 1: a ghost finger draws the trail from the start domino to the goal until the first drag.
  function drawGhost(ctx) {
    const line = game.def.route[0];
    const pts = line.map(([x, y]) => toScreen(x, y));
    let total = 0;
    const seg = [];
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      seg.push(l);
      total += l;
    }
    const k = (time * 0.45) % 1;
    const e = k < 0.12 ? 0 : k > 0.85 ? 1 : (k - 0.12) / 0.73;
    let d = e * total;
    let fx = pts[0].x;
    let fy = pts[0].y;
    ctx.save();
    ctx.globalAlpha = 0.9 * (k > 0.92 ? (1 - k) / 0.08 : Math.min(1, k / 0.06));
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.setLineDash([2, 12]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      if (d <= seg[i - 1]) {
        const t = d / seg[i - 1];
        fx = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t;
        fy = pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t;
        ctx.lineTo(fx, fy);
        break;
      }
      d -= seg[i - 1];
      fx = pts[i].x;
      fy = pts[i].y;
      ctx.lineTo(fx, fy);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    drawFinger(ctx, fx, fy, Math.max(1.2, size.w / 360));
    ctx.restore();
  }

  function drawPlay(ctx) {
    const { w, h } = size;
    updateCamera(lastDt);
    ctx.save();
    ctx.translate(view.ax, view.ay);
    ctx.scale(view.sc, view.sc);
    ctx.translate(-view.cx, -view.cy * KY);
    const tl = toWorld(0, 0);
    const br = toWorld(w, h);
    const building = game.status === 'build' && !eraser;
    renderer.drawWorld(ctx, game, time, {
      theme: theme(), dt: lastDt, view: { x0: tl.x, y0: tl.y, x1: br.x, y1: br.y },
      ends: building && !drag, stroke: drag && drag.kind === 'lay' ? toWorld(drag.x, drag.y) : null,
    });
    ctx.restore();
    if (eraser && drag && drag.kind === 'erase') {
      ctx.strokeStyle = 'rgba(255,140,192,0.9)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(drag.x, drag.y, ERASE_R * view.sc, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (drag && drag.kind === 'carry') {
      const p = toWorld(drag.x, drag.y);
      const s = toScreen(p.x, p.y);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.scale(view.sc, view.sc);
      ctx.globalAlpha = 0.85;
      drawGoal(ctx, GOAL_KINDS[trayKind], -1, time);
      ctx.restore();
    }
    if (game.def.hint && game.drags === 0 && game.status === 'build' && !drag) drawGhost(ctx);
    ctx.fillStyle = 'rgba(22,11,51,0.3)';
    ctx.fillRect(0, 0, w, view.hudH);
    if (game.status !== 'won') {
      drawBar(ctx);
      drawHud(ctx);
    }
    if (game.status === 'won') drawWin(ctx);
    for (const b of buttons) {
      if (b.tray) drawTrayButton(ctx, b);
      else if (b.icon) drawIconButton(ctx, b);
      else {
        ctx.globalAlpha = b.busy ? 0.55 : 1;
        drawButton(ctx, b, b.fill);
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawConfetti(ctx, t) {
    const { w, h } = size;
    const colours = [C.pink, C.sun, C.foam, C.white, C.orange, '#3a7bff', C.green];
    for (let i = 0; i < 80; i++) {
      const speed = 90 + ((i * 53) % 80);
      const x = ((i * 0.137) % 1) * w + Math.sin(t * 2 + i) * 20;
      const y = ((t * speed + i * 41) % (h + 40)) - 20;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 3 + i);
      ctx.fillStyle = colours[i % colours.length];
      ctx.fillRect(-5, -3, 10, 6);
      ctx.restore();
    }
  }

  function drawWin(ctx) {
    const { w, h } = size;
    const t = game.statusT - 0.9; // let the goal go off first
    if (t < 0) return;
    const k = Math.min(1, t / 0.5);
    ctx.fillStyle = `rgba(22,11,51,${0.45 * k})`;
    ctx.fillRect(0, 0, w, h);
    drawConfetti(ctx, t);
    const px = Math.min(h * 0.08, w / 6);
    const pop = 1 + Math.max(0, 0.9 - t) * 1.2 + Math.sin(time * 6) * 0.04;
    const ty = view.hudH + px * 1.2;
    outlined(ctx, game.stars === 3 ? 'WOW!' : 'Hooray!', w / 2, ty, px * pop, C.sun, w * 0.9);
    const r = Math.min(w * 0.11, h * 0.06);
    const starY = ty + px * 0.9 + r * 1.4;
    for (let i = 0; i < 3; i++) {
      const at = 0.6 + i * 0.25;
      const sk = t < at ? 0 : Math.min(1, (t - at) / 0.15);
      const grow = sk * (1 + Math.max(0, 0.3 - (t - at)) * 0.8);
      if (grow <= 0) continue;
      drawStar(ctx, w / 2 + (i - 1) * r * 2.4, starY - (i === 1 ? r * 0.3 : 0), r * grow, i < game.stars);
    }
    // a happy domino doing a little hop
    const sc = Math.min(w, h) / 150;
    ctx.save();
    ctx.translate(w / 2, starY + r * 2.6 + sc * 14 - Math.abs(Math.sin(time * 5)) * sc * 6);
    ctx.scale(sc, sc);
    drawDomino(ctx, 0, 0, -Math.PI / 2 + Math.sin(time * 5) * 0.4, 0, { theme: theme(), pips: [6, 6], id: 3 });
    ctx.restore();
  }

  // ---------- sounds for what just happened ----------

  function listen() {
    for (const e of game.events) {
      if (e.n <= heard) continue;
      heard = e.n;
      if (e.type === 'clack') play('clack', e.gen);
      else if (e.type === 'lay') play('lay');
      else if (e.type === 'goal') play('goal');
      else if (e.type === 'gadget') play('gadget');
      else if (e.type === 'stop') play('oops');
      else if (e.type === 'win') play('win');
    }
  }

  // ---------- debug hook ----------

  if (debug) {
    window.__domino = {
      state: () => game,
      screen: () => screen,
      buttons: () => buttons.map((b) => ({ ...b })),
      view: () => ({ ...view }),
      progress: () => JSON.parse(JSON.stringify(progress)),
      toScreen,
      toWorld,
      level: (n) => startLevel(n - 1),
      free: () => startLevel(-1),
      goto: (name) => goto(name),
      // lay the level's route as the bot would (or one line of it)
      solve() {
        if (game && game.def.route) layRoute(game, game.def.route);
        heard = game ? game.eventN : 0;
        layoutButtons();
      },
      line: (pts) => game && drawLine(game, pts),
      go() {
        if (game) go(game);
        layoutButtons();
      },
      // time travel for screenshots: run the game forward without drawing
      advance(seconds) {
        for (let t = 0; game && t < seconds; t += 1 / 60) api.update(1 / 60);
      },
    };
  }

  const api = {
    resize(w, h) {
      size = { w, h };
      layoutView();
      layoutButtons();
    },

    update(dt) {
      time += dt;
      lastDt = dt;
      if (screen === 'menu') demoStep(dt);
      if (screen !== 'play' || !game) return;
      const before = `${game.status}|${game.statusT > WIN_BUTTON_DELAY}|${game.history.length}`;
      step(game, dt);
      listen();
      if (game.status === 'won' && !recorded) record();
      const after = `${game.status}|${game.statusT > WIN_BUTTON_DELAY}|${game.history.length}`;
      if (before !== after) layoutButtons();
    },

    draw(ctx) {
      if (screen === 'menu') drawMenu(ctx);
      else if (screen === 'picker') drawPicker(ctx);
      else if (game) drawPlay(ctx);
    },

    // A press near the start domino or the end of a trail starts laying; with the eraser on it
    // rubs dominoes out; on the free-play tray it picks up a goal to drop in.
    onPickUp(x, y) {
      unlockAudio();
      if (screen !== 'play' || !game || game.status === 'won' || game.status === 'run') return false;
      const b = buttons.find((r) => hit(r, x, y));
      if (b) {
        if (b.tray) {
          drag = { kind: 'carry', x, y, moved: false, x0: x, y0: y };
          return true;
        }
        return false;
      }
      if (y < view.hudH || y > size.h - view.barH) return false;
      const p = toWorld(x, y);
      if (eraser) {
        if (!beginErase(game)) return false;
        eraseAt(game, p.x, p.y, Math.max(ERASE_R, 22 / view.sc));
        drag = { kind: 'erase', x, y };
        return true;
      }
      if (!beginStroke(game, p.x, p.y, snapWorld())) return false;
      strokeTo(game, p.x, p.y);
      drag = { kind: 'lay', x, y };
      layoutButtons();
      return true;
    },
    onDrag(x, y) {
      if (!drag || !game) return;
      drag.x = x;
      drag.y = y;
      const p = toWorld(x, y);
      if (drag.kind === 'lay') strokeTo(game, p.x, p.y);
      else if (drag.kind === 'erase') eraseAt(game, p.x, p.y, Math.max(ERASE_R, 22 / view.sc));
      else if (Math.hypot(x - drag.x0, y - drag.y0) > 12) drag.moved = true;
    },
    onDrop(x, y) {
      if (!drag || !game) return;
      const d = drag;
      drag = null;
      const p = toWorld(x, y);
      if (d.kind === 'lay') {
        strokeTo(game, p.x, p.y);
        endStroke(game);
      } else if (d.kind === 'erase') endErase(game);
      else if (d.moved) {
        if (dropGoal(game, GOAL_KINDS[trayKind], p.x, p.y)) play('tap');
      } else trayKind = (trayKind + 1) % GOAL_KINDS.length; // a tap on the tray picks the next goal
      layoutButtons();
    },
    onTap(x, y) {
      unlockAudio();
      const b = buttons.find((r) => hit(r, x, y));
      if (!b) {
        // flicking the start domino is the same as GO
        if (screen === 'play' && game && (game.status === 'build' || game.status === 'stopped')) {
          const p = toWorld(x, y);
          if (Math.hypot(p.x - game.start.x, p.y - game.start.y) < Math.max(22, 30 / view.sc)) {
            eraser = false;
            go(game);
            layoutButtons();
          }
        }
        return;
      }
      if (b.id === 'exit') host.exit();
      else if (b.id === 'play') startLevel(firstOpen());
      else if (b.id === 'picker') goto('picker');
      else if (b.id === 'free') startLevel(-1);
      else if (b.id === 'menu') goto('menu');
      else if (b.id === 'theme') {
        for (let k = 1; k <= THEMES.length; k++) {
          const i = (progress.theme + k) % THEMES.length;
          if (themeOpen(i)) {
            progress.theme = i;
            saveProgress(progress);
            break;
          }
        }
      } else if (b.id === 'level') {
        if (unlocked(progress, b.index)) startLevel(b.index);
      } else if (b.id === 'restart' || b.id === 'again') startLevel(index);
      else if (b.id === 'next') {
        if (index >= LEVELS.length - 1) goto('picker');
        else startLevel(index + 1);
      } else if (!game || game.status === 'run') {
        // tools wait while the chain is falling
      } else if (b.id === 'undo') undo(game);
      else if (b.id === 'eraser') eraser = !eraser;
      else if (b.id === 'clear') clearAll(game);
      else if (b.id === 'go') {
        eraser = false;
        if (game.status === 'stopped') standUp(game);
        else go(game);
      }
      if (screen === 'play') layoutButtons();
    },
  };

  const lv = params.get('level');
  if (lv === 'free') startLevel(-1);
  else {
    const forced = Number(lv);
    if (Number.isInteger(forced) && forced >= 1 && forced <= LEVELS.length) startLevel(forced - 1);
  }
  return api;
}
