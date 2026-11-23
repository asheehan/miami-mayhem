// The launcher: a Miami sunset with one tile per game. No game rules here.
//
// A game is { id, title, drawTile(ctx, x, y, w, h, time), create(host) }.

export const APP_NAME = "Riley's Miami Mayhem";

const C = {
  night: '#2b1055',
  dusk: '#7a1fa2',
  pink: '#ff3d9a',
  orange: '#ff8a4c',
  sun: '#ffe14d',
  sea: '#0bb5c4',
  deep: '#0a3d6b',
  foam: '#9ff7f2',
  palm: '#160b33',
  card: '#1c1140',
  white: '#ffffff',
};

function font(px, weight = 900) {
  return `${weight} ${Math.round(px)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Pure. One tile per game in a grid under the title (two columns, three once there are
// more than four games), plus a "more soon" tile when that leaves a gap. Each rect covers
// the picture and its name label.
// More than PAGE_SIZE games are split into pages: every page uses the full 3 x 3 layout,
// with a row of arrows and dots underneath ('prev', 'next' and 'dots' rects).
export const PAGE_SIZE = 9;
export const pageCount = (games) => Math.max(1, Math.ceil(games.length / PAGE_SIZE));

export function launcherButtons(width, height, allGames, page = 0) {
  const paged = allGames.length > PAGE_SIZE;
  const pages = pageCount(allGames);
  const first = paged ? Math.min(Math.max(0, page), pages - 1) * PAGE_SIZE : 0;
  const games = paged ? allGames.slice(first, first + PAGE_SIZE) : allGames;
  const cols = allGames.length > 4 ? 3 : 2;
  const count = paged ? PAGE_SIZE : games.length + (games.length % cols ? 1 : 0);
  const rows = Math.ceil(count / cols);
  const edge = paged ? Math.max(12, height * 0.02) : Math.max(16, height * 0.03);
  const navH = paged ? Math.max(40, height * 0.045) : 0;
  const top = height * (paged ? 0.3 : rows > 2 ? 0.32 : 0.36);
  const bottom = height - edge - navH - (paged ? 10 : 0); // clear of the cards' borders
  const gap = Math.max(16, width * (cols > 2 ? 0.04 : 0.05));
  const labelH = paged ? Math.max(30, height * 0.04) : Math.max(32, height * 0.045);
  const maxW = (width - gap * (cols + 1)) / cols;
  const maxH = (bottom - top - gap * (rows - 1)) / rows;
  const w = Math.min(maxW, ((maxH - labelH) * 3) / 4, 300);
  const h = (w * 4) / 3 + labelH;
  const x0 = (width - (cols * w + (cols - 1) * gap)) / 2;
  const y0 = top + Math.max(0, (bottom - top - (rows * h + (rows - 1) * gap)) / 2) * 0.35;
  const rect = (i) => ({
    x: x0 + (i % cols) * (w + gap),
    y: y0 + Math.floor(i / cols) * (h + gap),
    w,
    h,
    labelH,
  });
  const buttons = games.map((game, i) => ({ id: 'game', index: first + i, ...rect(i) }));
  if (count > games.length) buttons.push({ id: 'soon', ...rect(games.length) });
  if (paged) {
    const cur = first / PAGE_SIZE;
    const ny = height - edge * 0.6 - navH;
    const aw = navH * 1.6;
    const dotsW = Math.max(navH * 1.2, pages * navH * 0.6);
    const nx = (width - dotsW) / 2;
    buttons.push({ id: 'dots', x: nx, y: ny, w: dotsW, h: navH, page: cur, pages });
    if (cur > 0) buttons.push({ id: 'prev', x: nx - aw - 12, y: ny, w: aw, h: navH });
    if (cur < pages - 1) buttons.push({ id: 'next', x: nx + dotsW + 12, y: ny, w: aw, h: navH });
  }
  return buttons;
}

// The sunset is painted once per screen size and reused every frame.
let backdrop = null;

function paintBackdrop(width, height, dpr) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const horizon = height * 0.3;

  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, C.night);
  sky.addColorStop(0.45, C.dusk);
  sky.addColorStop(0.8, C.pink);
  sky.addColorStop(1, C.orange);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, horizon);

  // striped retro sun sitting on the horizon
  const r = Math.min(width * 0.26, horizon * 0.62);
  const sun = ctx.createLinearGradient(0, horizon - r * 1.6, 0, horizon);
  sun.addColorStop(0, C.sun);
  sun.addColorStop(1, C.pink);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, horizon);
  ctx.clip();
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(width / 2, horizon - r * 0.25, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const sea = ctx.createLinearGradient(0, horizon, 0, height);
  sea.addColorStop(0, C.sea);
  sea.addColorStop(0.35, C.deep);
  sea.addColorStop(1, C.night);
  ctx.fillStyle = sea;
  ctx.fillRect(0, horizon, width, height - horizon);

  // palm trees leaning in from both sides
  for (const side of [-1, 1]) {
    const baseX = side < 0 ? width * 0.06 : width * 0.94;
    const topX = baseX + side * -width * 0.09;
    const topY = horizon * 0.42;
    ctx.strokeStyle = C.palm;
    ctx.fillStyle = C.palm;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(6, width * 0.02);
    ctx.beginPath();
    ctx.moveTo(baseX, horizon + height * 0.03);
    ctx.quadraticCurveTo(baseX, horizon * 0.7, topX, topY);
    ctx.stroke();
    const len = Math.min(width * 0.2, horizon * 0.55);
    for (const a of [-2.9, -2.3, -1.6, -0.9, -0.25, 0.35]) {
      const ex = topX + Math.cos(a) * len;
      const ey = topY + Math.sin(a) * len * 0.75 + len * 0.28;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(topX + Math.cos(a) * len * 0.6, topY + Math.sin(a) * len * 0.9 - len * 0.1, ex, ey);
      ctx.quadraticCurveTo(topX + Math.cos(a) * len * 0.5, topY + Math.sin(a) * len * 0.5 + len * 0.08, topX, topY);
      ctx.fill();
    }
  }
  return canvas;
}

function drawTitle(ctx, width, height, time) {
  const big = Math.min(height * 0.085, width / 5.6);
  const cy = height * 0.115;
  ctx.save();
  ctx.translate(width / 2, cy);
  ctx.rotate(-0.045 + Math.sin(time * 1.3) * 0.008);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const line = (text, y, px, fill) => {
    ctx.font = font(px);
    ctx.lineWidth = px * 0.22;
    ctx.strokeStyle = C.palm;
    ctx.strokeText(text, 0, y);
    ctx.fillStyle = C.palm;
    ctx.fillText(text, px * 0.05, y + px * 0.07);
    ctx.fillStyle = fill;
    ctx.fillText(text, 0, y);
  };
  line("RILEY'S", -big * 1.02, big * 0.5, C.foam);
  line('MIAMI', -big * 0.2, big, C.pink);
  line('MAYHEM', big * 0.78, big, C.sun);
  ctx.restore();
}

// view = { games, buttons, time }
export function drawLauncher(ctx, width, height, view) {
  const dpr = window.devicePixelRatio || 1;
  if (!backdrop || backdrop.width !== Math.round(width * dpr) || backdrop.height !== Math.round(height * dpr)) {
    backdrop = paintBackdrop(width, height, dpr);
  }
  ctx.drawImage(backdrop, 0, 0, width, height);
  const { time } = view;

  // glints drifting across the water
  const horizon = height * 0.3;
  ctx.fillStyle = 'rgba(159,247,242,0.35)';
  for (let i = 0; i < 14; i++) {
    const y = horizon + ((i + 0.5) / 14) ** 1.6 * (height - horizon);
    const w = width * (0.06 + ((i * 37) % 10) / 100);
    const x = ((i * 0.31 + time * (0.015 + (i % 3) * 0.006)) % 1.2) * width - w;
    ctx.fillRect(x, y, w, Math.max(2, height * 0.004));
  }

  drawTitle(ctx, width, height, time);

  for (const b of view.buttons) {
    if (b.id === 'dots') {
      for (let i = 0; i < b.pages; i++) {
        ctx.fillStyle = i === b.page ? C.white : 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(b.x + ((i + 0.5) / b.pages) * b.w, b.y + b.h / 2, b.h * (i === b.page ? 0.2 : 0.14), 0, Math.PI * 2);
        ctx.fill();
      }
      continue;
    }
    if (b.id === 'prev' || b.id === 'next') {
      const nudge = Math.sin(time * 4) * 3 * (b.id === 'next' ? 1 : -1);
      ctx.fillStyle = '#ffe14d';
      roundRect(ctx, b.x + nudge, b.y, b.w, b.h, b.h * 0.4);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = C.palm;
      ctx.stroke();
      const cx = b.x + nudge + b.w / 2;
      const cy = b.y + b.h / 2;
      const r = b.h * 0.26 * (b.id === 'next' ? 1 : -1);
      ctx.fillStyle = C.palm;
      ctx.beginPath();
      ctx.moveTo(cx + r, cy);
      ctx.lineTo(cx - r * 0.8, cy - Math.abs(r));
      ctx.lineTo(cx - r * 0.8, cy + Math.abs(r));
      ctx.closePath();
      ctx.fill();
      continue;
    }
    const picH = b.h - b.labelH;
    const pad = Math.max(6, b.w * 0.035);
    const bob = Math.sin(time * 2 + b.x * 0.01) * 3;
    ctx.save();
    ctx.translate(0, bob);
    if (b.id === 'soon') {
      ctx.lineWidth = 4;
      ctx.setLineDash([14, 10]);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      roundRect(ctx, b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2, 20);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = font(b.w * 0.42);
      ctx.fillText('?', b.x + b.w / 2, b.y + picH * 0.45);
      ctx.font = font(Math.min(b.labelH * 0.5, b.w * 0.15), 800);
      ctx.fillText('More games', b.x + b.w / 2, b.y + picH * 0.8);
      ctx.fillText('soon!', b.x + b.w / 2, b.y + picH * 0.8 + b.labelH * 0.62);
      ctx.restore();
      continue;
    }
    const game = view.games[b.index];
    ctx.fillStyle = C.card;
    roundRect(ctx, b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2, 20);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.pink;
    ctx.stroke();
    game.drawTile(ctx, b.x, b.y, b.w, picH, time);
    ctx.fillStyle = C.white;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // shrink long names to fit the tile
    const px = b.labelH * 0.7;
    ctx.font = font(px, 800);
    const tw = ctx.measureText(game.title).width;
    if (tw > b.w * 0.96) ctx.font = font((px * b.w * 0.96) / tw, 800);
    ctx.fillText(game.title, b.x + b.w / 2, b.y + picH + b.labelH * 0.55);
    ctx.restore();
  }
}
