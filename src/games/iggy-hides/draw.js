// Where's Iggy? drawing. Reads state, never changes rules. A scene's still picture (plus the
// things not hidden this round and every cover) is rendered once into offscreen canvases,
// tiled to stay inside iOS canvas limits; each frame draws only the hidden things still to
// find, their covers, the animated actors on screen, effects, the tray and buttons.
import { rng } from './logic.js';
import { drawProp, propBox } from './art/props.js';
import { drawIggy } from './art/iggy.js';
import { INK, TAU, circle, ellipse, poly, lin, rad, star as kitStar, cloud, palm, bush, sun } from './art/kit.js';
import { sandcastle } from './art/scenery.js';
import { person } from './art/people.js';

export const C = {
  night: '#2b1055',
  dusk: '#7a1fa2',
  pink: '#ff3d9a',
  orange: '#ff8a4c',
  sun: '#ffe14d',
  sea: '#0bb5c4',
  foam: '#9ff7f2',
  ink: INK,
  white: '#ffffff',
  green: '#5fc93c',
  tray: '#fff6e0',
  gold: '#ffc93a',
};

export const MAX_DPR = 2;
const MAX_SIDE = 4000; // device px per canvas side (iOS allows 4096)
const MAX_PIXELS = 15e6; // device px per canvas (iOS allows about 16.7M)

export const font = (px, weight = 900) => `${weight} ${Math.round(px)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
export const dprNow = () => Math.min(MAX_DPR, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);

export function roundRect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function outlined(ctx, text, x, y, px, fill, maxW, align = 'center') {
  ctx.font = font(px);
  if (maxW) {
    const tw = ctx.measureText(text).width;
    if (tw > maxW) {
      px = (px * maxW) / tw;
      ctx.font = font(px);
    }
  }
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = px * 0.22;
  ctx.strokeStyle = C.ink;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

// ---------------------------------------------------------------------------------------------
// Scene pieces
// ---------------------------------------------------------------------------------------------

// A findable thing at its spot.
export function drawThing(ctx, scene, prop, o, spot, t, k = 1) {
  ctx.save();
  ctx.translate(spot.px, spot.py);
  if (spot.rot) ctx.rotate(spot.rot);
  const s = (spot.s || 1) * k;
  ctx.scale(s, s);
  drawProp(ctx, prop, { ...o, flip: spot.flip, phase: spot.px * 0.01 }, t, scene.props);
  ctx.restore();
}

const iggyProp = (spot) => `iggy-${spot.pose || 'stand'}`;

// Which spots are in play this round (their things and covers are drawn each frame).
export function activeSpots(round) {
  return new Set(round ? round.instances.map((it) => it.spot) : []);
}

// Everything still: the picture, things not hidden this round at their usual spots, and the
// covers of every spot not in play. Drawn in world units.
export function drawStill(ctx, scene, round) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  scene.back(ctx, rng(scene.id.length * 977 + 13));
  const active = activeSpots(round);
  const picked = new Set(round ? round.targets.map((tg) => tg.id) : []);
  const list = [];
  for (const sp of scene.iggy) if (!active.has(sp) && sp.cover) list.push({ z: sp.z, cover: sp.cover });
  for (const it of scene.items) {
    it.spots.forEach((sp, k) => {
      if (active.has(sp)) return;
      const shown = !picked.has(it.id) && k < it.count;
      if (shown || sp.cover) list.push({ z: sp.z, thing: shown ? it : null, sp, cover: sp.cover });
    });
  }
  list.sort((a, b) => a.z - b.z);
  for (const e of list) {
    if (e.thing) drawThing(ctx, scene, e.thing.prop, e.thing.o || {}, e.sp, 0);
    if (e.cover) e.cover(ctx, 0);
  }
  ctx.restore();
}

// Splits a w x h device-pixel picture into tiles that each fit the canvas limits.
export function tileGrid(w, h) {
  let cols = Math.ceil(w / MAX_SIDE);
  let rows = Math.ceil(h / MAX_SIDE);
  while ((w / cols) * (h / rows) > MAX_PIXELS) {
    if (w / cols >= h / rows) cols++;
    else rows++;
  }
  return { cols, rows };
}

export function buildStatic(scene, round, s, dpr) {
  let R = s * dpr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const pw = scene.W * R;
      const ph = scene.H * R;
      const { cols, rows } = tileGrid(pw, ph);
      const tiles = [];
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x0 = Math.floor((pw * i) / cols);
          const x1 = Math.ceil((pw * (i + 1)) / cols);
          const y0 = Math.floor((ph * j) / rows);
          const y1 = Math.ceil((ph * (j + 1)) / rows);
          // a pixel of overlap hides seams
          const c = makeCanvas(x1 - x0 + (i < cols - 1 ? 1 : 0), y1 - y0 + (j < rows - 1 ? 1 : 0));
          const g = c.getContext('2d');
          if (!g) throw new Error('no canvas');
          g.setTransform(R, 0, 0, R, -x0, -y0);
          drawStill(g, scene, round);
          tiles.push({ c, wx: x0 / R, wy: y0 / R, ww: c.width / R, wh: c.height / R });
        }
      }
      return { tiles, R, s, dpr };
    } catch {
      R *= 0.7; // out of canvas memory: try smaller
    }
  }
  return { tiles: [], R, s, dpr };
}

// A small picture of the whole scene (picker, minimap). No round: nothing hidden.
const thumbs = new Map();
export function thumb(scene, width) {
  width = Math.max(16, Math.round(width));
  const key = `${scene.id}|${width}`;
  if (thumbs.has(key)) return thumbs.get(key);
  const c = makeCanvas(width, (width * scene.H) / scene.W);
  const g = c.getContext('2d');
  g.scale(width / scene.W, width / scene.W);
  drawStill(g, scene, null);
  thumbs.set(key, c);
  return c;
}
export const hasThumb = (scene, width) => thumbs.has(`${scene.id}|${Math.max(16, Math.round(width))}`);

// The whole scene with this round's hidden things in place, scaled to `width` (for checking
// scenes by eye). With boxes, every hit box is outlined: red for this round, blue otherwise.
export function overview(scene, round, width, t = 0, boxes = false) {
  const c = makeCanvas(width, (width * scene.H) / scene.W);
  const g = c.getContext('2d');
  const k = width / scene.W;
  g.scale(k, k);
  drawStill(g, scene, round);
  if (round) drawLive(g, scene, round, t, null, null);
  if (boxes) {
    const active = activeSpots(round);
    const all = [...scene.iggy, ...scene.items.flatMap((it) => it.spots)];
    for (const sp of all) {
      g.strokeStyle = active.has(sp) ? '#ff0040' : 'rgba(0,80,255,0.6)';
      g.lineWidth = 3 / k;
      g.strokeRect(sp.x - sp.hw, sp.y - sp.hh, sp.hw * 2, sp.hh * 2);
    }
  }
  return c;
}

// The live layer, in world units: hidden things not yet found, all covers of spots in play,
// then actors. view (world rect) culls; pops = { [instance index]: 0..1 } for the found pop.
export function drawLive(ctx, scene, round, t, view, pops) {
  const vis = (x, y, hw, hh) => !view || (x + hw > view.x0 && x - hw < view.x1 && y + hh > view.y0 && y - hh < view.y1);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  round.instances.forEach((it, i) => {
    const sp = it.spot;
    const pop = pops && pops[i] !== undefined ? pops[i] : null;
    if (!it.found || pop !== null) {
      if (vis(sp.x, sp.y, sp.hw + 40, sp.hh + 40)) {
        const tg = round.targets[it.target];
        const k = pop === null ? 1 : 1 + Math.sin(Math.min(1, pop) * Math.PI) * 0.35;
        if (pop === null || pop < 0.5) {
          ctx.save();
          if (pop !== null) ctx.globalAlpha = 1 - pop * 1.6;
          drawThing(ctx, scene, tg.iggy ? iggyProp(sp) : tg.prop, tg.o, sp, t, k);
          ctx.restore();
        }
      }
    }
    if (sp.cover && vis(sp.x, sp.y, sp.hw + 80, sp.hh + 80)) sp.cover(ctx, t);
  });
  for (const a of scene.actors) {
    if (vis(a.x, a.y, a.hw, a.hh)) a.draw(ctx, t, view);
  }
}

// ---------------------------------------------------------------------------------------------
// Buttons and bits
// ---------------------------------------------------------------------------------------------

export function drawStar(ctx, x, y, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const k = i % 2 ? r * 0.48 : r;
    ctx.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? C.sun : 'rgba(22,11,51,0.3)';
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, r * 0.16);
  ctx.strokeStyle = filled ? C.ink : 'rgba(255,255,255,0.6)';
  ctx.stroke();
}

// A magnifying glass, lens centred at (x, y), radius r.
export function drawMagnifier(ctx, x, y, r, colour = C.ink) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = colour;
  ctx.lineWidth = r * 0.5;
  ctx.beginPath();
  ctx.moveTo(x + r * 0.75, y + r * 0.75);
  ctx.lineTo(x + r * 1.55, y + r * 1.55);
  ctx.stroke();
  ctx.fillStyle = rad(ctx, x - r * 0.3, y - r * 0.3, r * 0.1, r, [[0, '#ffffff'], [1, '#9fe6ff']]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.lineWidth = r * 0.28;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = r * 0.14;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.6, Math.PI * 1.1, Math.PI * 1.45);
  ctx.stroke();
  ctx.restore();
}

export function glyph(ctx, kind, cx, cy, s, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (kind === 'home') {
    ctx.beginPath();
    ctx.moveTo(cx - s * 1.05, cy - s * 0.05);
    ctx.lineTo(cx, cy - s);
    ctx.lineTo(cx + s * 1.05, cy - s * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx - s * 0.7, cy - s * 0.1, s * 1.4, s * 0.95);
  } else if (kind === 'back') {
    ctx.lineWidth = s * 0.42;
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.35, cy - s * 0.8);
    ctx.lineTo(cx - s * 0.45, cy);
    ctx.lineTo(cx + s * 0.35, cy + s * 0.8);
    ctx.stroke();
  } else if (kind === 'next' || kind === 'play') {
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.6, cy - s * 0.9);
    ctx.lineTo(cx + s * 0.85, cy);
    ctx.lineTo(cx - s * 0.6, cy + s * 0.9);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'restart') {
    ctx.lineWidth = s * 0.36;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.8, -Math.PI * 0.35, Math.PI * 1.25);
    ctx.stroke();
    const a = -Math.PI * 0.35;
    const ax = cx + Math.cos(a) * s * 0.8;
    const ay = cy + Math.sin(a) * s * 0.8;
    ctx.beginPath();
    ctx.moveTo(ax + s * 0.5, ay - s * 0.05);
    ctx.lineTo(ax - s * 0.2, ay - s * 0.55);
    ctx.lineTo(ax - s * 0.12, ay + s * 0.4);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'grid') {
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        roundRect(ctx, cx - s * 0.9 + i * s, cy - s * 0.9 + j * s, s * 0.8, s * 0.8, s * 0.18);
        ctx.fill();
      }
    }
  } else if (kind === 'sticker') {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const k = i % 2 ? s * 0.48 : s;
      ctx.lineTo(cx + Math.cos(a) * k, cy + Math.sin(a) * k);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function drawButton(ctx, b, fill = C.sun) {
  ctx.fillStyle = 'rgba(22,11,51,0.35)';
  roundRect(ctx, b.x, b.y + 5, b.w, b.h, b.h * 0.3);
  ctx.fill();
  ctx.fillStyle = fill;
  roundRect(ctx, b.x, b.y, b.w, b.h, b.h * 0.3);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  const hasIcon = !!b.glyph;
  const px = b.h * 0.42;
  ctx.font = font(px);
  let tw = ctx.measureText(b.label).width;
  const room = b.w * (hasIcon ? 0.62 : 0.86);
  if (tw > room) {
    ctx.font = font((px * room) / tw);
    tw = room;
  }
  const gw = hasIcon ? b.h * 0.5 : 0;
  const cx = b.x + b.w / 2 + gw / 2;
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.label, cx, b.y + b.h / 2 + 1);
  if (hasIcon) glyph(ctx, b.glyph, cx - tw / 2 - gw * 0.75, b.y + b.h / 2, b.h * 0.2, C.ink);
}

export function drawIconButton(ctx, b) {
  ctx.fillStyle = 'rgba(22,11,51,0.45)';
  roundRect(ctx, b.x, b.y, b.w, b.h, b.w * 0.24);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.stroke();
  glyph(ctx, b.icon, b.x + b.w / 2, b.y + b.h / 2, b.w * 0.3, C.white);
}

export function drawBackdrop(ctx, w, h, time = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#2fa8ff');
  g.addColorStop(0.55, '#8fe0ff');
  g.addColorStop(0.551, '#2fc6e2');
  g.addColorStop(0.7, '#6fe6dc');
  g.addColorStop(0.701, '#f7da94');
  g.addColorStop(1, '#f2c46a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 4; i++) {
    const x = (((i * 0.31 + time * 0.012 * (1 + (i % 2))) % 1.3) - 0.15) * w;
    cloud(ctx, x, h * (0.1 + (i % 3) * 0.12), Math.min(w, h) * (0.05 + (i % 2) * 0.02));
  }
}

export function drawConfetti(ctx, w, h, t) {
  const colours = [C.pink, C.sun, C.foam, C.white, C.orange, '#3a7bff', '#7cff6b'];
  for (let i = 0; i < 80; i++) {
    const speed = 90 + ((i * 53) % 90);
    const x = ((i * 0.137) % 1) * w + Math.sin(t * 2 + i) * 20;
    const y = ((t * speed + i * 41) % (h + 40)) - 20;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 3 + i);
    ctx.fillStyle = colours[i % colours.length];
    ctx.fillRect(-6, -3.5, 12, 7);
    ctx.restore();
  }
}

export function drawSparkle(ctx, x, y, r, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

// A prop fitted into a square of side `size` centred on (x, y).
export function drawIcon(ctx, scene, prop, o, x, y, size, t = 0) {
  const [cx, cy, hw, hh] = propBox(prop, scene && scene.props);
  const k = (size * 0.5) / Math.max(hw, hh);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.translate(-cx, -cy);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  drawProp(ctx, prop, { ...o, still: true }, t, scene && scene.props);
  ctx.restore();
}

// Iggy's face for the tray and buttons: the standing pose, framed on his head and ring.
export function drawIggyIcon(ctx, x, y, size, t = 0, wave = false) {
  const k = size / 92;
  ctx.save();
  ctx.translate(x, y + size * 0.42);
  ctx.scale(k, k);
  drawIggy(ctx, 'stand', wave ? t : 0, { still: !wave });
  ctx.restore();
}

// A round sticker: scalloped white edge and the scene's picture.
export function drawSticker(ctx, scene, x, y, r, t = 0, got = true) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(22,11,51,0.3)';
  ctx.beginPath();
  ctx.arc(r * 0.05, r * 0.08, r * 1.08, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  const n = 18;
  for (let i = 0; i <= n * 2; i++) {
    const a = (i / (n * 2)) * TAU;
    const k = i % 2 ? r * 1.08 : r * 1.14;
    ctx.lineTo(Math.cos(a) * k, Math.sin(a) * k);
  }
  ctx.closePath();
  ctx.fillStyle = got ? '#ffffff' : 'rgba(255,255,255,0.35)';
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.03);
  ctx.strokeStyle = got ? C.ink : 'rgba(22,11,51,0.3)';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.save();
  ctx.clip();
  if (got) {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    scene.sticker(ctx, r, t);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.5, r * 0.6, r * 0.22, -0.5, 0, TAU);
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(22,11,51,0.35)';
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.font = font(r * 0.9);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 0, r * 0.05);
  }
  ctx.restore();
  ctx.lineWidth = Math.max(2, r * 0.04);
  ctx.strokeStyle = got ? C.ink : 'rgba(255,255,255,0.4)';
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// The launcher tile: a sandcastle on a sunny beach; Iggy pops up from behind it and a
// magnifying glass sweeps across to find him.
// ---------------------------------------------------------------------------------------------

let tileCache = null;
export function drawTile(ctx, x, y, w, h, time) {
  const dpr = dprNow();
  const key = `${Math.round(w * dpr)}|${Math.round(h * dpr)}`;
  const U = 300; // tile picture units
  if (!tileCache || tileCache.key !== key) {
    const c = makeCanvas(w * dpr, h * dpr);
    const g = c.getContext('2d');
    const k = (Math.max(w, h) * dpr) / U; // uniform, cropped to the tile
    g.translate(((w - (U * k) / dpr) * dpr) / 2, ((h - (U * k) / dpr) * dpr) / 2);
    g.scale(k, k);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.fillStyle = lin(g, 0, 0, 0, 150, [[0, '#4aa8ff'], [1, '#bfeaff']]);
    g.fillRect(0, 0, U, 150);
    sun(g, 250, 45, 22);
    cloud(g, 70, 50, 24);
    g.fillStyle = lin(g, 0, 150, 0, 200, [[0, '#2fc6e2'], [1, '#6fe6dc']]);
    g.fillRect(0, 140, U, 60);
    g.fillStyle = lin(g, 0, 200, 0, 300, [[0, '#f7da94'], [1, '#f2c46a']]);
    g.fillRect(0, 196, U, 104);
    palm(g, 30, 230, 170, 0.15, { size: 0.6 });
    bush(g, 270, 250, 80, 40, { seed: 3, flowers: '#ff5ab8' });
    tileCache = { key, c };
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(tileCache.c, x, y, w, h);
  const k0 = Math.max(w, h) / U;
  ctx.translate(x + (w - U * k0) / 2, y + (h - U * k0) / 2);
  ctx.scale(k0, k0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // Iggy rises behind the castle, ducks down, rises again
  const k = time % 4;
  const up = k < 0.4 ? k / 0.4 : k < 2.6 ? 1 : k < 3 ? 1 - (k - 2.6) / 0.4 : 0;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, U, 214);
  ctx.clip();
  ctx.translate(180, 222 - up * 46);
  ctx.scale(1.25, 1.25);
  drawIggy(ctx, 'peek', time, {});
  ctx.restore();
  sandcastle(ctx, 150, 270, 0.85, '#ff3d5a');
  // the magnifying glass glides over and stops on him
  const gx = k < 0.6 ? 60 + (k / 0.6) * 60 : k < 1.4 ? 120 + ((k - 0.6) / 0.8) * 62 : 182;
  const gy = 150 + Math.sin(time * 2) * 3;
  drawMagnifier(ctx, gx, gy, 32);
  if (k > 1.4 && k < 2.6) {
    for (let i = 0; i < 4; i++) {
      const a = time * 3 + (i * TAU) / 4;
      drawSparkle(ctx, 182 + Math.cos(a) * 52, 150 + Math.sin(a) * 52, 9, i % 2 ? C.sun : C.white);
    }
  }
  ctx.restore();
}

export { person, ellipse, circle, poly, kitStar };
