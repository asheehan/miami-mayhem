// Boardwalk Stampede as a launcher game: menu, run, overlays and saved progress.
// The 3D view (and three.js) is loaded only when the game is opened.
import { generateTrack } from './track.js';
import { createRun, step, steer, count, strikerState, FINALE_MIN } from './sim.js';

const SAVE_KEY = 'stampede-progress';
const C = { pink: '#ff3d9a', sun: '#ffe14d', foam: '#9ff7f2', ink: '#160b33', white: '#ffffff', blue: '#1496ff', red: '#ff2d46' };

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    return { level: Number.isInteger(v.level) && v.level >= 0 ? v.level : 0, best: Number(v.best) || 0 };
  } catch {
    return { level: 0, best: 0 };
  }
}

function save(progress) {
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

// Launcher tile: the boardwalk running to the sunset, a gate, and a little crowd.
function drawTile(ctx, x, y, w, h, time) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, y, 0, y + h * 0.5);
  sky.addColorStop(0, '#2b1055');
  sky.addColorStop(0.6, '#ff3d9a');
  sky.addColorStop(1, '#ff8a4c');
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h * 0.5);
  ctx.fillStyle = C.sun;
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h * 0.5, w * 0.2, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#0bb5c4';
  ctx.fillRect(x, y + h * 0.5, w, h * 0.5);
  ctx.fillStyle = '#d9a066';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.44, y + h * 0.5);
  ctx.lineTo(x + w * 0.56, y + h * 0.5);
  ctx.lineTo(x + w * 1.02, y + h);
  ctx.lineTo(x - w * 0.02, y + h);
  ctx.closePath();
  ctx.fill();
  // a pair of gates
  const gy = y + h * 0.56;
  const gh = h * 0.13;
  ctx.fillStyle = 'rgba(20,150,255,0.8)';
  ctx.fillRect(x + w * 0.3, gy, w * 0.2, gh);
  ctx.fillStyle = 'rgba(255,45,70,0.8)';
  ctx.fillRect(x + w * 0.5, gy, w * 0.2, gh);
  ctx.fillStyle = C.white;
  ctx.font = font(gh * 0.7);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+20', x + w * 0.4, gy + gh * 0.55);
  ctx.fillText('−5', x + w * 0.6, gy + gh * 0.55);
  // the crowd, bobbing
  const colours = [C.pink, C.sun, C.foam, C.white, '#ff8a4c', '#b46bff'];
  for (let i = 0; i < 14; i++) {
    const r = Math.sqrt(i) * w * 0.045;
    const a = i * 2.4;
    const px = x + w * 0.5 + Math.cos(a) * r * 1.5;
    const py = y + h * 0.84 + Math.sin(a) * r * 0.7 - Math.abs(Math.sin(time * 9 + i)) * h * 0.012;
    const s = w * 0.035;
    ctx.fillStyle = colours[i % colours.length];
    ctx.fillRect(px - s / 2, py - s, s, s * 1.3);
    ctx.fillStyle = '#f2c9a0';
    ctx.beginPath();
    ctx.arc(px, py - s * 1.35, s * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export const stampede = {
  id: 'stampede',
  title: 'Boardwalk Stampede',
  drawTile,
  create,
};

function create(host) {
  let size = { w: 1, h: 1 };
  let progress = load();
  let screen = 'menu'; // 'menu' | 'play'
  let run = null;
  let view = null;
  let viewModule = null;
  let loading = false;
  let buttons = [];
  let lastX = 0;
  let time = 0;
  let recorded = false;
  let closed = false;

  // ?level=N starts from that level, for testing.
  const forced = Number(new URLSearchParams(location.search).get('level'));
  if (Number.isInteger(forced) && forced > 0) progress.level = forced;

  function layoutButtons() {
    const { w, h } = size;
    const bw = Math.min(w * 0.8, 420);
    const bh = Math.max(64, Math.min(96, h * 0.085));
    const x = (w - bw) / 2;
    const exit = { id: 'exit', x: 12, y: 12, w: Math.max(44, Math.min(64, w * 0.11)), h: Math.max(44, Math.min(64, w * 0.11)) };
    if (screen === 'menu') {
      buttons = [exit, { id: 'play', label: `Play level ${progress.level + 1}`, x, y: h * 0.6, w: bw, h: bh }];
    } else if (run && run.status === 'lost') {
      buttons = [
        { id: 'retry', label: 'Try again', x, y: h * 0.56, w: bw, h: bh },
        { id: 'menu', label: 'Home', x, y: h * 0.56 + bh * 1.3, w: bw, h: bh },
      ];
    } else if (run && ended() ) {
      buttons = [
        { id: 'next', label: 'Next level', x, y: h - Math.max(24, h * 0.05) - bh * 2.3, w: bw, h: bh },
        { id: 'menu', label: 'Home', x, y: h - Math.max(24, h * 0.05) - bh, w: bw, h: bh },
      ];
    } else buttons = [];
  }

  // True once the end-of-run sequence has played out and buttons should show.
  function ended() {
    if (!run) return false;
    if (run.status === 'finished') return run.endTime > 1.6;
    if (run.status === 'finale') return strikerState(run).done;
    return false;
  }

  function dropView() {
    if (view) view.dispose();
    view = null;
  }

  async function startLevel() {
    if (loading) return;
    loading = true;
    try {
      viewModule ??= await import('./view3d.js');
    } finally {
      loading = false;
    }
    if (closed) return;
    dropView();
    const track = generateTrack(progress.level);
    run = createRun(track);
    view = viewModule.createView(track);
    host.canvas.before(view.el);
    view.resize(size.w, size.h);
    screen = 'play';
    recorded = false;
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
    const score = run.status === 'finale' ? run.finalCount * 10 : run.finalCount;
    progress = { level: progress.level + 1, best: Math.max(progress.best, score) };
    save(progress);
  }

  function drawMenu(ctx) {
    const { w, h } = size;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#2b1055');
    sky.addColorStop(0.45, '#7a1fa2');
    sky.addColorStop(0.75, '#ff3d9a');
    sky.addColorStop(1, '#ff8a4c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    const px = Math.min(h * 0.075, w / 7);
    outlined(ctx, 'BOARDWALK', w / 2, h * 0.2, px, C.foam);
    outlined(ctx, 'STAMPEDE', w / 2, h * 0.2 + px * 1.15, px * 1.15, C.sun);
    ctx.fillStyle = C.white;
    ctx.font = font(Math.min(h * 0.028, w / 20), 800);
    ctx.textAlign = 'center';
    ctx.fillText('Run through the blue gates. Dodge the rest!', w / 2, h * 0.47);
    if (progress.best > 0) ctx.fillText(`Best score: ${progress.best}`, w / 2, h * 0.52);
    for (const b of buttons) {
      if (b.id === 'exit') drawExit(ctx, b);
      else drawButton(ctx, b);
    }
    if (loading) outlined(ctx, 'Getting ready…', w / 2, h * 0.8, px * 0.5, C.white);
  }

  function drawExit(ctx, b) {
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    roundRect(ctx, b.x, b.y, b.w, b.h, b.w * 0.22);
    ctx.fill();
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const s = b.w * 0.32;
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.moveTo(cx - s, cy - s * 0.05);
    ctx.lineTo(cx, cy - s);
    ctx.lineTo(cx + s, cy - s * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx - s * 0.7, cy - s * 0.1, s * 1.4, s * 0.95);
  }

  function drawHud(ctx) {
    const { w, h } = size;
    ctx.clearRect(0, 0, w, h);
    const n = count(run);
    const px = Math.min(h * 0.05, w / 9);

    if (run.status === 'running') {
      // progress bar along the top
      const bw = w * 0.6;
      const bx = (w - bw) / 2;
      const by = Math.max(18, h * 0.03);
      ctx.fillStyle = 'rgba(22,11,51,0.55)';
      roundRect(ctx, bx, by, bw, 14, 7);
      ctx.fill();
      ctx.fillStyle = C.sun;
      roundRect(ctx, bx, by, Math.max(14, bw * Math.min(1, run.z / run.track.finishZ)), 14, 7);
      ctx.fill();
      ctx.fillStyle = C.white;
      ctx.font = font(px * 0.42, 800);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Level ${run.track.level + 1}`, w / 2, by + 34);
    }

    if (run.status === 'running' || (run.status !== 'lost' && !ended() && run.endTime < 2)) {
      // the crowd's size, floating above it
      const a = view.crowdAnchor(run);
      const text = String(n);
      ctx.font = font(px * 0.8);
      const tw = ctx.measureText(text).width + px * 0.7;
      ctx.fillStyle = n > FINALE_MIN ? C.blue : C.ink;
      roundRect(ctx, a.x - tw / 2, a.y - px * 0.6, tw, px * 1.2, px * 0.5);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = C.white;
      ctx.stroke();
      ctx.fillStyle = C.white;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, a.x, a.y + 2);
    }

    if (run.status === 'lost') {
      ctx.fillStyle = 'rgba(22,11,51,0.6)';
      ctx.fillRect(0, 0, w, h);
      outlined(ctx, 'Oh no!', w / 2, h * 0.3, px * 1.8, C.pink);
      outlined(ctx, 'Everyone is gone', w / 2, h * 0.3 + px * 1.9, px * 0.7, C.white);
    } else if (run.status === 'finished') {
      outlined(ctx, 'You made it!', w / 2, h * 0.2, px * 1.4, C.sun);
      outlined(ctx, `${run.finalCount} ${run.finalCount === 1 ? 'runner' : 'runners'}`, w / 2, h * 0.2 + px * 1.7, px, C.white);
      if (ended()) outlined(ctx, `Bring more than ${FINALE_MIN} for the big finish`, w / 2, h * 0.2 + px * 3, px * 0.5, C.foam);
    } else if (run.status === 'finale') {
      const s = strikerState(run);
      if (run.endTime > 2) {
        const pop = 1 + (s.score < s.total ? Math.sin(time * 40) * 0.04 : 0);
        outlined(ctx, String(s.score), w / 2, h * 0.16, px * 2.4 * pop, C.sun);
        outlined(ctx, 'POINTS', w / 2, h * 0.16 + px * 1.9, px * 0.7, C.white);
      } else {
        outlined(ctx, 'Everybody jump!', w / 2, h * 0.16, px * 1.1, C.sun);
      }
      if (s.bell) outlined(ctx, 'DING! DING!', w / 2, h * 0.34, px * 1.2 * (1 + Math.sin(time * 18) * 0.08), C.pink);
    }
    for (const b of buttons) drawButton(ctx, b, b.id === 'menu' ? C.white : C.sun);
  }

  // Test hook for automated browser checks.
  if (new URLSearchParams(location.search).has('debug')) window.__stampede = { run: () => run, buttons: () => buttons };

  return {
    resize(w, h) {
      size = { w, h };
      if (view) view.resize(w, h);
      layoutButtons();
    },

    update(dt) {
      time += dt;
      if (screen !== 'play' || !run) return;
      const before = buttons.length;
      step(run, dt);
      if (!recorded && (run.status === 'finished' || run.status === 'finale')) record();
      if (run.status === 'lost' || ended()) {
        if (!before) layoutButtons();
      }
      view.render(run, dt);
    },

    draw(ctx) {
      if (screen === 'menu' || !run || !view) drawMenu(ctx);
      else drawHud(ctx);
    },

    onPickUp(x) {
      if (screen !== 'play' || !run || run.status !== 'running') return false;
      lastX = x;
      return true;
    },
    onDrag(x) {
      if (!run) return;
      // a swipe across the whole screen moves the crowd a bit more than the boardwalk's width
      steer(run, ((x - lastX) / size.w) * 13);
      lastX = x;
    },
    onDrop() {},
    onTap(x, y) {
      const b = buttons.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
      if (!b || loading) return;
      if (b.id === 'exit') {
        closed = true;
        dropView();
        host.exit();
      } else if (b.id === 'play' || b.id === 'retry' || b.id === 'next') startLevel();
      else if (b.id === 'menu') toMenu();
    },
  };
}
