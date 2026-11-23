// Later, Gator as a launcher game: menu, HUD, overlays, input and saved progress.
// The 3D view (and three.js) is loaded only when a level starts.
import { generateLevel, isSafe } from './level.js';
import { createRun, step, hop, progress as runProgress, WIN_TIME, HEARTS } from './sim.js';

const SAVE_KEY = 'later-gator-progress';
const PICK_COLS = 3; // the level picker shows this many tiles across
const PICK_ROWS = 4; // and this many down, per page
const C = { pink: '#ff3d9a', sun: '#ffe14d', foam: '#9ff7f2', ink: '#160b33', white: '#ffffff', green: '#3fae4a', dark: '#2a7f37', belly: '#c8f08a', red: '#ff2d46', sea: '#0bb5c4' };

export function loadProgress(storage = globalThis.localStorage) {
  try {
    const v = JSON.parse(storage.getItem(SAVE_KEY) || '{}');
    const level = Number.isInteger(v.level) && v.level >= 1 ? v.level : 1;
    const stars = v.stars && typeof v.stars === 'object' ? v.stars : {};
    return { level, stars };
  } catch {
    return { level: 1, stars: {} };
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
  } catch {
    // not kept if storage is unavailable
  }
}

const font = (px, weight = 900) => `${weight} ${Math.round(px)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function outlined(ctx, text, x, y, px, fill) {
  ctx.font = font(px);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = px * 0.2;
  ctx.strokeStyle = C.ink;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function drawButton(ctx, b, fill = C.sun) {
  ctx.fillStyle = fill;
  roundRect(ctx, b.x, b.y, b.w, b.h, b.h * 0.3);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.font = font(b.h * 0.42);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
}

function drawHomeIcon(ctx, b, bg = 'rgba(22,11,51,0.45)') {
  ctx.fillStyle = bg;
  roundRect(ctx, b.x, b.y, b.w, b.h, b.w * 0.22);
  ctx.fill();
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const s = b.w * 0.3;
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.moveTo(cx - s, cy - s * 0.05);
  ctx.lineTo(cx, cy - s);
  ctx.lineTo(cx + s, cy - s * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(cx - s * 0.7, cy - s * 0.1, s * 1.4, s * 0.95);
}

function heart(ctx, cx, cy, s, full) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.42);
  ctx.bezierCurveTo(cx - s * 0.75, cy - 0.05 * s, cx - s * 0.45, cy - s * 0.6, cx, cy - s * 0.22);
  ctx.bezierCurveTo(cx + s * 0.45, cy - s * 0.6, cx + s * 0.75, cy - 0.05 * s, cx, cy + s * 0.42);
  ctx.closePath();
  ctx.fillStyle = full ? C.red : 'rgba(22,11,51,0.45)';
  ctx.fill();
  ctx.lineWidth = Math.max(2, s * 0.08);
  ctx.strokeStyle = full ? C.white : 'rgba(255,255,255,0.5)';
  ctx.stroke();
}

function star(ctx, cx, cy, r, full) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = full ? C.sun : 'rgba(22,11,51,0.5)';
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.1);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = full ? C.ink : 'rgba(255,255,255,0.6)';
  ctx.stroke();
}

// A little snack picture for the HUD: hot dog, ice cream or pizza; grey until eaten.
function snackIcon(ctx, kind, cx, cy, s, got) {
  ctx.save();
  ctx.globalAlpha = got ? 1 : 0.45;
  ctx.lineWidth = Math.max(1.5, s * 0.06);
  ctx.strokeStyle = C.ink;
  if (kind === 'hotdog') {
    ctx.fillStyle = '#e8a95b';
    roundRect(ctx, cx - s * 0.45, cy - s * 0.12, s * 0.9, s * 0.34, s * 0.15);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c4432b';
    roundRect(ctx, cx - s * 0.5, cy - s * 0.2, s, s * 0.2, s * 0.1);
    ctx.fill();
    ctx.stroke();
  } else if (kind === 'icecream') {
    ctx.fillStyle = '#e0a050';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.22, cy - s * 0.05);
    ctx.lineTo(cx + s * 0.22, cy - s * 0.05);
    ctx.lineTo(cx, cy + s * 0.48);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff9ec7';
    ctx.beginPath();
    ctx.arc(cx, cy - s * 0.17, s * 0.27, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = '#ffcf5a';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.42, cy - s * 0.32);
    ctx.lineTo(cx + s * 0.42, cy - s * 0.32);
    ctx.lineTo(cx, cy + s * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#d63a2a';
    for (const [dx, dy] of [[-0.15, -0.15], [0.13, -0.12], [0, 0.12]]) {
      ctx.beginPath();
      ctx.arc(cx + dx * s, cy + dy * s, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// The gator from the side, facing right, standing on y. `hopT` 0..1 lifts him in an arc.
export function drawGator2D(ctx, x, y, s, time, hopT = 0) {
  const lift = Math.sin(hopT * Math.PI) * s * 0.6;
  const by = y - lift;
  const wag = Math.sin(time * 6) * 0.25 + (hopT ? Math.sin(hopT * Math.PI * 2) * 0.4 : 0);
  const blk = (c, bx, byy, w, h) => {
    ctx.fillStyle = c;
    ctx.fillRect(x + bx * s, by + byy * s, w * s, h * s);
  };
  // tail, wagging
  ctx.save();
  ctx.translate(x - 0.55 * s, by - 0.32 * s);
  ctx.rotate(wag);
  ctx.fillStyle = C.green;
  ctx.fillRect(-0.55 * s, -0.12 * s, 0.6 * s, 0.24 * s);
  ctx.fillRect(-0.95 * s, -0.08 * s, 0.45 * s, 0.15 * s);
  ctx.fillStyle = C.dark;
  ctx.fillRect(-0.8 * s, -0.14 * s, 0.25 * s, 0.07 * s);
  ctx.restore();
  // legs
  const step = hopT ? Math.sin(hopT * Math.PI) * 0.1 : 0;
  blk(C.dark, -0.45, -0.18 - step, 0.2, 0.18);
  blk(C.dark, 0.25, -0.18 + step, 0.2, 0.18);
  // body and belly
  blk(C.green, -0.6, -0.58, 1.2, 0.44);
  blk(C.belly, -0.5, -0.22, 1.0, 0.1);
  for (let i = 0; i < 3; i++) blk(C.dark, -0.4 + i * 0.3, -0.68, 0.18, 0.1);
  // head and snout
  blk(C.green, 0.45, -0.72, 0.5, 0.5);
  blk(C.green, 0.9, -0.5, 0.55, 0.3);
  blk(C.belly, 0.9, -0.26, 0.55, 0.06);
  blk(C.dark, 1.32, -0.5, 0.07, 0.06);
  blk(C.white, 1.0, -0.24, 0.07, 0.07);
  blk(C.white, 1.2, -0.24, 0.07, 0.07);
  blk(C.pink, 0.95, -0.3, 0.38, 0.04);
  // big eye
  blk(C.white, 0.55, -0.95, 0.32, 0.32);
  blk(C.ink, 0.7, -0.88, 0.14, 0.18);
  blk(C.white, 0.72, -0.86, 0.05, 0.05);
}

function drawTile(ctx, x, y, w, h, time) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, y, 0, y + h * 0.3);
  sky.addColorStop(0, '#2b1055');
  sky.addColorStop(0.6, '#ff3d9a');
  sky.addColorStop(1, '#ff8a4c');
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h * 0.3);
  ctx.fillStyle = C.sun;
  ctx.beginPath();
  ctx.arc(x + w * 0.7, y + h * 0.3, w * 0.14, Math.PI, 0);
  ctx.fill();
  // lanes, top to bottom: swamp, road, canal, grass
  const lane = (c, top, hh) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y + h * top, w, h * hh);
  };
  lane('#2f8a6a', 0.3, 0.12);
  lane('#4a3f63', 0.42, 0.18);
  ctx.fillStyle = C.sun;
  for (let i = 0; i < 5; i++) ctx.fillRect(x + ((i * w) / 4 + time * 10) % (w * 1.25) - w * 0.1, y + h * 0.508, w * 0.1, h * 0.012);
  lane('#16b8d6', 0.6, 0.14);
  ctx.fillStyle = '#e8ffff';
  for (let i = 0; i < 4; i++) ctx.fillRect(x + ((i * w) / 3 - time * 14) % (w * 1.2) + w * 0.05, y + h * (0.63 + (i % 2) * 0.06), w * 0.12, h * 0.01);
  lane('#4fc96a', 0.74, 0.26);
  // a car going by
  const cx = x + ((time * 0.25) % 1) * w * 1.4 - w * 0.3;
  ctx.fillStyle = C.pink;
  ctx.fillRect(cx, y + h * 0.445, w * 0.28, h * 0.06);
  ctx.fillStyle = '#bff8ff';
  ctx.fillRect(cx + w * 0.17, y + h * 0.43, w * 0.03, h * 0.03);
  ctx.fillStyle = C.ink;
  ctx.fillRect(cx + w * 0.03, y + h * 0.5, w * 0.06, h * 0.03);
  ctx.fillRect(cx + w * 0.19, y + h * 0.5, w * 0.06, h * 0.03);
  // the gator, hopping on the grass
  const hopT = (time * 1.4) % 1 < 0.35 ? ((time * 1.4) % 1) / 0.35 : 0;
  drawGator2D(ctx, x + w * 0.42, y + h * 0.9, w * 0.2, time, hopT);
  ctx.restore();
}

export const laterGator = {
  id: 'later-gator',
  title: 'Later, Gator',
  drawTile,
  create,
};

function create(host) {
  let size = { w: 1, h: 1 };
  let progress = loadProgress();
  let screen = 'menu'; // 'menu' | 'levels' | 'play'
  let page = 0; // which page of the level picker is showing
  let levelNum = progress.level;
  let run = null;
  let view = null;
  let viewModule = null;
  let loading = false;
  let buttons = [];
  let time = 0;
  let recorded = false;
  let closed = false;
  let touch = null; // where the current swipe started
  let phase = null; // the run's phase when the buttons were last laid out

  // ?level=N plays that level, for testing.
  const params = new URLSearchParams(location.search);
  const forced = Number(params.get('level'));
  if (Number.isInteger(forced) && forced > 0) progress.level = forced;
  levelNum = progress.level;

  const hudSize = () => Math.max(44, Math.min(64, size.w * 0.11));

  function layoutButtons() {
    const { w, h } = size;
    const bw = Math.min(w * 0.8, 420);
    const bh = Math.max(64, Math.min(96, h * 0.085));
    const x = (w - bw) / 2;
    const s = hudSize();
    const corner = { x: 12, y: 12, w: s, h: s };
    if (screen === 'menu') {
      const lh = bh * 0.8;
      buttons = [
        { id: 'exit', ...corner },
        { id: 'play', label: `Play level ${progress.level}`, x, y: h * 0.78, w: bw, h: bh },
        { id: 'levels', label: 'Levels', x: x + bw * 0.15, y: h * 0.78 + bh * 1.15, w: bw * 0.7, h: lh },
      ];
    } else if (screen === 'levels') {
      // a page of PICK_COLS x PICK_ROWS level tiles, with arrows to turn the page
      const top = h * 0.2;
      const arrowH = Math.max(56, Math.min(84, h * 0.075));
      const bottom = h - arrowH - 36;
      const gap = Math.max(10, w * 0.025);
      const tile = Math.min((Math.min(w, 620) - gap * (PICK_COLS + 1)) / PICK_COLS, (bottom - top - gap * (PICK_ROWS - 1)) / PICK_ROWS);
      const gx = (w - (tile * PICK_COLS + gap * (PICK_COLS - 1))) / 2;
      buttons = [{ id: 'back', ...corner }];
      for (let i = 0; i < PICK_COLS * PICK_ROWS; i++) {
        const n = page * PICK_COLS * PICK_ROWS + i + 1;
        buttons.push({
          id: n <= progress.level ? 'pick' : 'locked', n,
          x: gx + (i % PICK_COLS) * (tile + gap), y: top + Math.floor(i / PICK_COLS) * (tile + gap), w: tile, h: tile,
        });
      }
      const ay = h - arrowH - 18;
      if (page > 0) buttons.push({ id: 'prev', label: '◀', x: gx, y: ay, w: arrowH * 1.5, h: arrowH });
      if (page < pages() - 1) buttons.push({ id: 'next-page', label: '▶', x: w - gx - arrowH * 1.5, y: ay, w: arrowH * 1.5, h: arrowH });
    } else if (run && run.status === 'lost') {
      buttons = [
        { id: 'retry', label: 'Try again', x, y: h * 0.56, w: bw, h: bh },
        { id: 'menu', label: 'Menu', x, y: h * 0.56 + bh * 1.3, w: bw, h: bh },
      ];
    } else if (run && run.status === 'won' && run.endTime >= WIN_TIME) {
      buttons = [
        { id: 'next', label: 'Next', x, y: h * 0.6, w: bw, h: bh },
        { id: 'menu', label: 'Menu', x, y: h * 0.6 + bh * 1.3, w: bw, h: bh },
      ];
    } else if (run) {
      buttons = [{ id: 'home', ...corner }];
    } else buttons = [];
  }

  function dropView() {
    if (view) view.dispose();
    view = null;
  }

  async function startLevel(n) {
    if (loading) return;
    loading = true;
    try {
      viewModule ??= await import('./view3d.js');
    } finally {
      loading = false;
    }
    if (closed) return;
    dropView();
    levelNum = n;
    const level = generateLevel(n);
    run = createRun(level);
    view = viewModule.createView(level);
    host.canvas.before(view.el);
    view.resize(size.w, size.h);
    screen = 'play';
    recorded = false;
    touch = null;
    phase = run.status;
    layoutButtons();
  }

  function toMenu() {
    dropView();
    run = null;
    screen = 'menu';
    layoutButtons();
  }

  function record() {
    recorded = true;
    const key = String(levelNum);
    progress = {
      level: Math.max(progress.level, levelNum + 1),
      stars: { ...progress.stars, [key]: Math.max(progress.stars[key] || 0, run.gotCount) },
    };
    saveProgress(progress);
  }

  const pages = () => Math.max(1, Math.ceil(progress.level / (PICK_COLS * PICK_ROWS)));

  const totalStars = () => Object.values(progress.stars).reduce((s, n) => s + (Number(n) || 0), 0);

  function drawBackdrop(ctx) {
    const { w, h } = size;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#2b1055');
    sky.addColorStop(0.4, '#7a1fa2');
    sky.addColorStop(0.62, '#ff3d9a');
    sky.addColorStop(0.63, '#4a3f63');
    sky.addColorStop(0.75, '#4a3f63');
    sky.addColorStop(0.751, '#16b8d6');
    sky.addColorStop(0.86, '#16b8d6');
    sky.addColorStop(0.861, '#4fc96a');
    sky.addColorStop(1, '#45b95f');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = C.sun;
    ctx.beginPath();
    ctx.arc(w * 0.72, h * 0.62, Math.min(w, h) * 0.16, Math.PI, 0);
    ctx.fill();
  }

  function drawLevels(ctx) {
    const { w, h } = size;
    drawBackdrop(ctx);
    ctx.fillStyle = 'rgba(22,11,51,0.45)';
    ctx.fillRect(0, 0, w, h);
    outlined(ctx, 'Levels', w / 2, h * 0.11, Math.min(h * 0.06, w / 8), C.sun);
    for (const b of buttons) {
      if (b.id === 'back') drawHomeIcon(ctx, b, 'rgba(255,255,255,0.22)');
      else if (b.id === 'pick' || b.id === 'locked') {
        const open = b.id === 'pick';
        ctx.fillStyle = open ? (b.n === progress.level ? C.sun : C.foam) : 'rgba(255,255,255,0.18)';
        roundRect(ctx, b.x, b.y, b.w, b.h, b.w * 0.2);
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = open ? C.ink : 'rgba(255,255,255,0.35)';
        ctx.stroke();
        ctx.fillStyle = open ? C.ink : 'rgba(255,255,255,0.55)';
        ctx.font = font(b.w * 0.4);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(b.n), b.x + b.w / 2, b.y + b.h * 0.4);
        if (open) {
          const got = progress.stars[String(b.n)] || 0;
          for (let i = 0; i < 3; i++) star(ctx, b.x + b.w / 2 + (i - 1) * b.w * 0.26, b.y + b.h * 0.78, b.w * 0.11, i < got);
        }
      } else drawButton(ctx, b);
    }
    if (loading) outlined(ctx, 'Getting ready…', w / 2, h * 0.16, Math.min(h * 0.03, w / 16), C.white);
  }

  function drawMenu(ctx) {
    const { w, h } = size;
    drawBackdrop(ctx);
    const px = Math.min(h * 0.08, w / 6.5);
    outlined(ctx, 'LATER,', w / 2, h * 0.15, px, C.foam);
    outlined(ctx, 'GATOR!', w / 2, h * 0.15 + px * 1.15, px * 1.2, C.sun);
    ctx.fillStyle = C.white;
    ctx.font = font(Math.min(h * 0.028, w / 18), 800);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Hop him home to the swamp!', w / 2, h * 0.36);
    const stars = totalStars();
    if (stars > 0) {
      const sy = h * 0.41;
      star(ctx, w / 2 - px * 0.55, sy, px * 0.28, true);
      ctx.fillStyle = C.white;
      ctx.font = font(px * 0.42);
      ctx.textAlign = 'left';
      ctx.fillText(String(stars), w / 2 - px * 0.15, sy + 2);
    }
    const hopT = (time * 1.2) % 1 < 0.4 ? ((time * 1.2) % 1) / 0.4 : 0;
    const gs = Math.min(w * 0.14, h * 0.08);
    drawGator2D(ctx, w * 0.42, h * 0.735, gs, time, hopT);
    for (const b of buttons) {
      if (b.id === 'exit') drawHomeIcon(ctx, b, 'rgba(255,255,255,0.22)');
      else drawButton(ctx, b, b.id === 'levels' ? C.foam : C.sun);
    }
    if (loading) outlined(ctx, 'Getting ready…', w / 2, h * 0.47, px * 0.45, C.white);
  }

  function drawHud(ctx) {
    const { w, h } = size;
    ctx.clearRect(0, 0, w, h);
    const s = hudSize();
    const playing = run.status === 'play' || run.status === 'bonk';
    // hearts, next to the home button
    const hs = s * 0.62;
    for (let i = 0; i < HEARTS; i++) heart(ctx, 12 + s + 14 + hs * 0.6 + i * hs * 1.12, 12 + s / 2, hs, i < run.hearts);
    // snacks, top right
    const ss = s * 0.62;
    run.level.snacks.forEach((sn, i) => {
      const cx = w - 12 - ss * 0.6 - (run.level.snacks.length - 1 - i) * ss * 1.15;
      ctx.fillStyle = 'rgba(22,11,51,0.4)';
      ctx.beginPath();
      ctx.arc(cx, 12 + s / 2, ss * 0.58, 0, Math.PI * 2);
      ctx.fill();
      snackIcon(ctx, sn.kind, cx, 12 + s / 2, ss * 0.8, run.got[i]);
    });
    // a slim progress bar with a little gator on it
    const by = 12 + s + 10;
    const bx = 12;
    const bw = w - 24;
    ctx.fillStyle = 'rgba(22,11,51,0.5)';
    roundRect(ctx, bx, by, bw, 8, 4);
    ctx.fill();
    const p = runProgress(run);
    ctx.fillStyle = C.sun;
    roundRect(ctx, bx, by, Math.max(8, bw * p), 8, 4);
    ctx.fill();
    ctx.fillStyle = C.green;
    ctx.beginPath();
    ctx.arc(bx + Math.max(4, bw * p), by + 4, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = C.white;
    ctx.stroke();
    if (w > 560) {
      ctx.fillStyle = C.white;
      ctx.font = font(s * 0.36, 800);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Level ${levelNum}`, w / 2, 12 + s / 2);
    }
    if (playing && run.hops === 0 && run.time < 6) {
      const px = Math.min(h * 0.04, w / 11);
      outlined(ctx, 'Tap to hop!', w / 2, h - px * 2.6, px, C.white);
      outlined(ctx, 'Swipe to turn', w / 2, h - px * 1.3, px * 0.7, C.foam);
    }

    if (run.status === 'lost') {
      ctx.fillStyle = 'rgba(22,11,51,0.6)';
      ctx.fillRect(0, 0, w, h);
      const px = Math.min(h * 0.07, w / 7);
      outlined(ctx, 'Oh no!', w / 2, h * 0.3, px * 1.3, C.pink);
      outlined(ctx, 'Out of hearts', w / 2, h * 0.3 + px * 1.4, px * 0.6, C.white);
    } else if (run.status === 'won' && run.endTime >= WIN_TIME) {
      ctx.fillStyle = 'rgba(22,11,51,0.45)';
      ctx.fillRect(0, 0, w, h);
      const px = Math.min(h * 0.07, w / 7.5);
      outlined(ctx, 'Home sweet', w / 2, h * 0.2, px, C.foam);
      outlined(ctx, 'swamp!', w / 2, h * 0.2 + px * 1.1, px * 1.2, C.sun);
      const r = Math.min(w * 0.11, h * 0.06);
      const pop = Math.min(1, (run.endTime - WIN_TIME) * 3);
      for (let i = 0; i < 3; i++) {
        const k = Math.max(0, Math.min(1, pop * 3 - i));
        star(ctx, w / 2 + (i - 1) * r * 2.5, h * 0.43 - (i === 1 ? r * 0.35 : 0), r * (0.6 + 0.4 * k), i < run.gotCount);
      }
      ctx.fillStyle = C.white;
      ctx.font = font(px * 0.42, 800);
      ctx.textAlign = 'center';
      ctx.fillText(`${run.gotCount} of 3 snacks`, w / 2, h * 0.43 + r * 1.6);
    }
    for (const b of buttons) {
      if (b.id === 'home') drawHomeIcon(ctx, b);
      else drawButton(ctx, b, b.id === 'menu' ? C.white : C.sun);
    }
  }

  const hit = (x, y) => buttons.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);

  // Test hook for automated browser checks.
  if (params.has('debug')) {
    window.__gator = {
      run: () => run,
      screen: () => screen,
      buttons: () => buttons,
      progress: () => progress,
      hop: (dir) => (run ? hop(run, dir) : false),
      anchor: () => (view && run ? view.anchor(run) : null),
      // put him on a row (a safe strip is best), to reach later parts of a level quickly
      warp(row, col = 4) {
        if (!run) return false;
        run.hop = null;
        run.queued = null;
        run.row = row;
        run.x = col;
        run.best = Math.max(run.best, row);
        if (isSafe(run.level.rows[row].type)) run.checkpoint = { row, col };
        return true;
      },
    };
  }

  return {
    resize(w, h) {
      size = { w, h };
      if (view) view.resize(w, h);
      layoutButtons();
    },

    update(dt) {
      time += dt;
      if (screen !== 'play' || !run || !view) return;
      step(run, dt);
      if (!recorded && run.status === 'won') record();
      // the buttons change only when the run moves to a new phase
      const now = run.status === 'won' && run.endTime >= WIN_TIME ? 'done' : run.status;
      if (now !== phase) {
        phase = now;
        layoutButtons();
        if (now !== 'play' && now !== 'bonk') touch = null;
      }
      view.render(run, dt);
    },

    draw(ctx) {
      if (screen === 'levels') drawLevels(ctx);
      else if (screen === 'menu' || !run || !view) drawMenu(ctx);
      else drawHud(ctx);
    },

    onPickUp(x, y) {
      if (screen !== 'play' || !run || hit(x, y)) return false;
      if (run.status !== 'play' && run.status !== 'bonk') return false;
      touch = { x0: x, y0: y };
      return true;
    },
    onDrag() {},
    onDrop(x, y) {
      if (!touch || !run) return;
      const dx = x - touch.x0;
      const dy = y - touch.y0;
      touch = null;
      const min = Math.max(24, Math.min(size.w, size.h) * 0.05);
      let dir = 'up';
      if (Math.hypot(dx, dy) >= min) {
        if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? 'right' : 'left';
        else dir = dy > 0 ? 'down' : 'up';
      }
      hop(run, dir);
    },
    onTap(x, y) {
      const b = hit(x, y);
      if (!b || loading) return;
      if (b.id === 'exit') {
        closed = true;
        dropView();
        host.exit();
      } else if (b.id === 'play') startLevel(progress.level);
      else if (b.id === 'levels') {
        screen = 'levels';
        page = pages() - 1;
        layoutButtons();
      } else if (b.id === 'back') toMenu();
      else if (b.id === 'pick') startLevel(b.n);
      else if (b.id === 'prev' || b.id === 'next-page') {
        page += b.id === 'prev' ? -1 : 1;
        layoutButtons();
      }
      else if (b.id === 'retry') startLevel(levelNum);
      else if (b.id === 'next') startLevel(levelNum + 1);
      else if (b.id === 'menu' || b.id === 'home') toMenu();
    },
  };
}
