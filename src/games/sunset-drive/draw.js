// Sunset Drive drawing: sky layers, the projected road, roadside sprites, traffic, the car and
// its effects, plus the shared button and text helpers and the launcher tile. Reads the race and
// never changes rules; the only state here is cosmetic (camera lag, particles, cached pictures).
import {
  SEG_LEN, ROAD_HALF, CAMERA_HEIGHT, DRAW_DISTANCE, CURVE_GAIN, CAR_W, MAX_SPEED, SPIN_TIME,
  project, cameraFor, segmentAt, progressOf, START_LINE, COUNTDOWN,
} from './sim.js';
import { SPRITES, paintSprite, paintCoins, INK } from './sprites.js';
import { STAGES } from './tracks.js';

export const C = {
  ink: INK,
  white: '#ffffff',
  sun: '#ffe14d',
  pink: '#ff3d9a',
  orange: '#ff8a4c',
  teal: '#19c3d6',
  red: '#ff4b4b',
  green: '#3fe07a',
  coin: '#ffb627',
};

export const font = (px, weight = 900) => `${weight} ${Math.round(px)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function outlined(ctx, text, x, y, px, fill, maxW) {
  ctx.font = font(px);
  if (maxW) {
    const tw = ctx.measureText(text).width;
    if (tw > maxW) {
      px = (px * maxW) / tw;
      ctx.font = font(px);
    }
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = px * 0.22;
  ctx.strokeStyle = C.ink;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

export function drawStar(ctx, x, y, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.48 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? C.sun : 'rgba(22,11,51,0.3)';
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, r * 0.16);
  ctx.strokeStyle = filled ? C.ink : 'rgba(255,255,255,0.6)';
  ctx.stroke();
}

function glyph(ctx, kind, cx, cy, s, colour) {
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
    const g = s * 0.55;
    for (let i = -1; i <= 1; i += 2) for (let j = -1; j <= 1; j += 2) ctx.fillRect(cx + i * g * 0.9 - g * 0.4, cy + j * g * 0.9 - g * 0.4, g * 0.8, g * 0.8);
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
  const room = b.w * (hasIcon ? 0.66 : 0.86);
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
  ctx.fillStyle = 'rgba(22,11,51,0.35)';
  roundRect(ctx, b.x, b.y, b.w, b.h, b.w * 0.24);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.stroke();
  glyph(ctx, b.icon, b.x + b.w / 2, b.y + b.h / 2, b.w * 0.3, C.white);
}

export function drawLock(ctx, x, y, r) {
  ctx.lineWidth = r * 0.3;
  ctx.strokeStyle = C.white;
  ctx.beginPath();
  ctx.arc(x, y - r * 0.4, r * 0.55, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = C.white;
  roundRect(ctx, x - r * 0.85, y - r * 0.4, r * 1.7, r * 1.3, r * 0.25);
  ctx.fill();
}

export function drawCoinIcon(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = C.coin;
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.16);
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.7, 0, TAU);
  ctx.fillStyle = C.sun;
  ctx.fill();
  ctx.beginPath();
  for (let j = 0; j < 10; j++) {
    const a = -Math.PI / 2 + (j * Math.PI) / 5;
    const rr = j % 2 ? r * 0.22 : r * 0.5;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = '#ff9a1f';
  ctx.fill();
}

// ---------- colour helpers ----------

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixHex(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `#${((1 << 24) | (c[0] << 16) | (c[1] << 8) | c[2]).toString(16).slice(1)}`;
}

const FOG_LEVELS = 8;
const FOG_START = 0.3; // fraction of the draw distance before haze starts
const FOG_MAX = 0.9;
const GROUND_KEYS = {
  grass: ['grass', 'grass2'], sand: ['sand', 'sand2'], water: ['water', 'water2'],
  city: ['city', 'city2'], marsh: ['marsh', 'marsh2'],
};
const DEFAULT_COLOURS = {
  grass: '#3fbf6a', grass2: '#37b060', sand: '#f6d892', sand2: '#eecb7c', water: '#2aa6d8', water2: '#259bcc',
  city: '#3a3654', city2: '#35314d', marsh: '#7fbf4a', marsh2: '#74b342', rail: '#ece6f4', railTop: '#ffffff',
  railShade: '#b8b0cc', pad: '#30e0ff', pad2: '#ff3df0', check: '#ffffff', checkInk: INK, startLine: '#ffffff',
};

function stagePalette(stage) {
  const cols = { ...DEFAULT_COLOURS, ...stage.colours };
  const fog = cols.fog;
  const pal = {};
  for (const [k, v] of Object.entries(cols)) {
    if (typeof v !== 'string' || v[0] !== '#' || v.length !== 7) continue;
    pal[k] = [];
    for (let i = 0; i < FOG_LEVELS; i++) pal[k].push(mixHex(v, fog, (i / (FOG_LEVELS - 1)) * FOG_MAX));
  }
  return pal;
}

// ---------- sprite caches ----------

const FLIPPABLE = new Set([
  'palm', 'palmNight', 'palmBent', 'shrub', 'mangrove', 'sawgrass', 'lifeguard', 'umbrella', 'flamingo', 'heron',
  'gator', 'airboat', 'sailboat', 'island', 'pelicanPost', 'lamp', 'lampNight',
]);

function flipped(cv) {
  const out = document.createElement('canvas');
  out.width = cv.width;
  out.height = cv.height;
  const c = out.getContext('2d');
  c.translate(cv.width, 0);
  c.scale(-1, 1);
  c.drawImage(cv, 0, 0);
  return out;
}

// ---------- the renderer ----------

export function createRenderer() {
  let w = 1;
  let h = 1;
  let dpr = 1;
  const view = { cx: 0, horizon: 0, k: 1, carY: 0 };
  let spriteScale = 1;
  const sprites = new Map(); // kind -> { img, flip }
  let coinFrames = null;
  let paletteFor = null;
  let pal = null;
  let skyCache = { key: '', sky: null, layers: null, sun: null };
  let camX = 0;
  let shakeT = -9;
  let lastStatus = '';
  const particles = [];
  const MAX_PARTICLES = 90;
  // per-frame scratch
  const N = DRAW_DISTANCE + 2;
  const xo = new Float64Array(N);
  const px = new Float64Array(N);
  const py = new Float64Array(N);
  const pw = new Float64Array(N);
  const ps = new Float64Array(N);
  const clipY = new Float64Array(N);
  const visible = new Uint8Array(N);
  const carsAt = Array.from({ length: N }, () => []);
  const pt = {};
  const cam = {};
  const batches = [new Map(), new Map(), new Map()];
  const stats = { frames: 0, ms: 0 };

  function sprite(kind, flip) {
    let e = sprites.get(kind);
    if (!e) {
      e = { img: paintSprite(kind, spriteScale), flip: null };
      sprites.set(kind, e);
    }
    if (flip && FLIPPABLE.has(kind)) {
      if (!e.flip) e.flip = flipped(e.img);
      return e.flip;
    }
    return e.img;
  }

  // Paint everything a stage needs up front so nothing is painted mid-race.
  function prepare(s) {
    const kinds = new Set(['startGantry', 'finishBanner']);
    for (const seg of s.track.segs) for (const sp of seg.sprites) kinds.add(sp.kind);
    for (const c of s.traffic) kinds.add(c.kind);
    for (const k of kinds) {
      sprite(k, false);
      if (FLIPPABLE.has(k)) sprite(k, true);
    }
    if (!coinFrames) coinFrames = paintCoins(Math.round(72 * spriteScale));
    if (paletteFor !== s.stage) {
      paletteFor = s.stage;
      pal = stagePalette(s.stage);
    }
    camX = s.x;
    particles.length = 0;
  }

  function resize(nw, nh, ndpr) {
    w = nw;
    h = nh;
    dpr = ndpr || 1;
    view.cx = w / 2;
    view.horizon = Math.round(h * 0.4);
    view.k = Math.min(h * 0.48, w * 1.15);
    view.carY = view.horizon + view.k;
    const ns = clamp((h * dpr) / 1500, 0.7, 1.7);
    if (Math.abs(ns - spriteScale) > 0.05) {
      spriteScale = ns;
      sprites.clear();
      coinFrames = null;
    }
    skyCache.key = '';
  }

  // ---------- sky ----------

  function makeCanvas(cw, ch) {
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(cw * dpr));
    cv.height = Math.max(1, Math.round(ch * dpr));
    const c = cv.getContext('2d');
    c.scale(dpr, dpr);
    return [cv, c];
  }

  function buildSky(stage) {
    const sk = stage.sky;
    const hz = view.horizon;
    const [skyCv, c] = makeCanvas(w, hz + 2);
    const g = c.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, sk.top);
    g.addColorStop(0.55, sk.mid);
    g.addColorStop(1, sk.low);
    c.fillStyle = g;
    c.fillRect(0, 0, w, hz + 2);
    if (sk.stars) {
      let r = 7;
      const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 90; i++) {
        c.fillStyle = `rgba(255,255,255,${0.35 + rnd() * 0.6})`;
        const sz = rnd() < 0.15 ? 2.2 : 1.2;
        c.fillRect(rnd() * w, rnd() * hz * 0.75, sz, sz);
      }
    }
    // the sun (or moon) on its own little canvas, with retro stripes across its lower half
    const sr = Math.min(w, hz) * (sk.moon ? 0.11 : 0.2);
    const [sunCv, sc] = makeCanvas(sr * 3.2, sr * 3.2);
    const m = sr * 1.6;
    const glow = sc.createRadialGradient(m, m, sr * 0.6, m, m, sr * 1.6);
    glow.addColorStop(0, sk.sunGlow);
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    sc.globalAlpha = 0.55;
    sc.fillStyle = glow;
    sc.fillRect(0, 0, sr * 3.2, sr * 3.2);
    sc.globalAlpha = 1;
    const body = sc.createLinearGradient(0, m - sr, 0, m + sr);
    body.addColorStop(0, sk.sun);
    body.addColorStop(1, sk.moon ? sk.sun : sk.sunGlow);
    sc.fillStyle = body;
    sc.beginPath();
    sc.arc(m, m, sr, 0, TAU);
    sc.fill();
    if (sk.moon) {
      sc.fillStyle = 'rgba(150,140,200,0.35)';
      for (const [dx, dy, rr] of [[-0.3, -0.2, 0.18], [0.25, 0.25, 0.14], [0.1, -0.4, 0.09]]) {
        sc.beginPath();
        sc.arc(m + dx * sr, m + dy * sr, rr * sr, 0, TAU);
        sc.fill();
      }
    } else {
      sc.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 5; i++) {
        const y = m + sr * (0.12 + i * 0.19);
        sc.fillRect(m - sr - 2, y, sr * 2 + 4, sr * (0.03 + i * 0.022));
      }
      sc.globalCompositeOperation = 'source-over';
    }
    skyCache.sky = skyCv;
    skyCache.sun = { cv: sunCv, r: sr };
    skyCache.layers = buildLayers(stage);
  }

  // Wide tiling strips behind the road: clouds high up and a far skyline on the horizon.
  function buildLayers(stage) {
    const sk = stage.sky;
    const hz = view.horizon;
    const L = Math.round(w * 2);
    const layers = [];
    let seed = 11 + STAGES.indexOf(stage) * 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const wrap = (c, x, fn) => {
      for (const o of [-L, 0, L]) fn(c, x + o);
    };
    // clouds
    {
      const ch = hz * 0.6;
      const [cv, c] = makeCanvas(L, ch);
      c.fillStyle = sk.cloud;
      c.globalAlpha = stage.storm ? 0.95 : 0.8;
      const n = stage.storm ? 14 : 7;
      for (let i = 0; i < n; i++) {
        const x = rnd() * L;
        const y = ch * (0.2 + rnd() * 0.6);
        const r = Math.min(w, hz) * (0.04 + rnd() * 0.05) * (stage.storm ? 1.8 : 1);
        wrap(c, x, (cc, xx) => {
          cc.beginPath();
          cc.ellipse(xx, y, r * 2.4, r * 0.55, 0, 0, TAU);
          cc.ellipse(xx - r * 0.8, y - r * 0.3, r * 0.9, r * 0.7, 0, 0, TAU);
          cc.ellipse(xx + r * 0.6, y - r * 0.45, r * 1.1, r * 0.85, 0, 0, TAU);
          cc.fill();
        });
      }
      layers.push({ cv, y: hz * 0.12, h: ch, speed: 0.35, w: L });
    }
    // far scenery
    const fh = hz * 0.5;
    const [cv, c] = makeCanvas(L, fh + hz * 0.3);
    const base = fh;
    const far = sk.far;
    const fogTint = (col, t) => mixHex(col, stage.colours.fog, t);
    if (far === 'ocean' || far === 'stormSea' || far === 'islands') {
      const sea = far === 'stormSea' ? '#3a4a6a' : far === 'islands' ? '#28c8d8' : '#2a8ad0';
      c.fillStyle = fogTint(sea, 0.25);
      c.fillRect(0, base, L, hz * 0.3);
      c.fillStyle = 'rgba(255,255,255,0.45)';
      for (let i = 0; i < 40; i++) {
        const x = rnd() * L;
        const y = base + 3 + rnd() * hz * 0.12;
        c.fillRect(x, y, 8 + rnd() * 22, 1.5);
      }
      if (far === 'ocean') {
        // a far-off cruise ship and a lighthouse point
        const x = L * 0.3;
        c.fillStyle = fogTint('#ffffff', 0.3);
        c.beginPath();
        c.moveTo(x, base - 2);
        c.lineTo(x + 70, base - 2);
        c.lineTo(x + 62, base - 14);
        c.lineTo(x + 6, base - 14);
        c.closePath();
        c.fill();
        c.fillRect(x + 14, base - 22, 40, 8);
        c.fillStyle = fogTint('#ff4fb0', 0.3);
        c.fillRect(x + 40, base - 30, 7, 8);
      }
      if (far === 'islands') {
        for (let i = 0; i < 6; i++) {
          const x = rnd() * L;
          const iw = 40 + rnd() * 90;
          wrap(c, x, (cc, xx) => {
            cc.fillStyle = fogTint('#3a9a5a', 0.45);
            cc.beginPath();
            cc.ellipse(xx, base, iw, 8 + rnd() * 6, 0, Math.PI, 0);
            cc.fill();
            cc.strokeStyle = fogTint('#2a6a3a', 0.45);
            cc.lineWidth = 2;
            cc.beginPath();
            cc.moveTo(xx - iw * 0.3, base - 6);
            cc.lineTo(xx - iw * 0.32, base - 24);
            cc.stroke();
          });
        }
      }
      if (far === 'stormSea') {
        c.fillStyle = 'rgba(255,255,255,0.5)';
        for (let i = 0; i < 30; i++) c.fillRect(rnd() * L, base + 4 + rnd() * hz * 0.2, 14, 2);
      }
    } else if (far === 'skyline' || far === 'city') {
      const night = far === 'city';
      const cols = night ? ['#2a2050', '#33285e', '#241a46'] : ['#c9a8d8', '#b8a0d0', '#d8b8e0'];
      c.fillStyle = night ? '#141030' : fogTint('#2aa6d8', 0.35);
      c.fillRect(0, base, L, hz * 0.3);
      for (let layer = 0; layer < 2; layer++) {
        let x = -20;
        while (x < L) {
          const bw = 20 + rnd() * 40;
          const bh = (night ? 40 : 25) + rnd() * fh * (night ? 0.75 : 0.55) * (layer ? 0.7 : 1);
          const col = layer ? cols[1] : cols[0];
          const xx0 = x;
          wrap(c, xx0, (cc, xx) => {
            cc.fillStyle = night ? col : fogTint(col, layer ? 0.35 : 0.2);
            cc.fillRect(xx, base - bh, bw, bh);
            if (night) {
              cc.fillStyle = 'rgba(255,233,160,0.75)';
              for (let wy = base - bh + 6; wy < base - 4; wy += 7) {
                for (let wx = xx + 4; wx < xx + bw - 4; wx += 7) if (((wx * 13 + wy * 7) | 0) % 5 < 2) cc.fillRect(wx, wy, 3, 3);
              }
            }
          });
          x += bw + rnd() * 10;
        }
      }
      if (night) {
        // a glowing neon top on a couple of towers
        c.fillStyle = '#ff3df0';
        for (let i = 0; i < 4; i++) c.fillRect(rnd() * L, base - fh * 0.6 - rnd() * 20, 26, 3);
      }
    } else if (far === 'trees') {
      c.fillStyle = fogTint('#5a9a4a', 0.35);
      c.fillRect(0, base, L, hz * 0.3);
      for (let i = 0; i < 70; i++) {
        const x = rnd() * L;
        const r = 8 + rnd() * 18;
        wrap(c, x, (cc, xx) => {
          cc.fillStyle = fogTint(i % 3 ? '#3a7a40' : '#2e6a36', 0.35);
          cc.beginPath();
          cc.ellipse(xx, base - r * 0.7, r * 1.3, r, 0, 0, TAU);
          cc.fill();
        });
      }
      // a few tall cypress spikes
      for (let i = 0; i < 12; i++) {
        const x = rnd() * L;
        const th = 30 + rnd() * 40;
        wrap(c, x, (cc, xx) => {
          cc.fillStyle = fogTint('#2a5a30', 0.3);
          cc.beginPath();
          cc.moveTo(xx - 6, base - 10);
          cc.lineTo(xx, base - th);
          cc.lineTo(xx + 6, base - 10);
          cc.fill();
        });
      }
    }
    layers.push({ cv, y: hz - base, h: fh + hz * 0.3, speed: 1, w: L });
    return layers;
  }

  function drawSky(ctx, s, time) {
    const stage = s.stage;
    const key = `${STAGES.indexOf(stage)}|${w}x${h}@${dpr}`;
    if (skyCache.key !== key) {
      skyCache.key = key;
      buildSky(stage);
    }
    const hz = view.horizon;
    ctx.drawImage(skyCache.sky, 0, 0, w, hz + 2);
    const prog = progressOf(s);
    const sk = stage.sky;
    // dusk deepens as the stage goes on
    if (sk.dusk) {
      ctx.globalAlpha = prog * (stage.night ? 0.25 : 0.45);
      ctx.fillStyle = sk.dusk;
      ctx.fillRect(0, 0, w, hz * 0.8);
      ctx.globalAlpha = 1;
    }
    if (!sk.hideSun) {
      const { cv, r } = skyCache.sun;
      const startY = hz - Math.min(hz * 0.6, r * 2.6);
      const sy = sk.moon ? hz * 0.35 - prog * hz * 0.1 : startY + (hz + r * 0.25 - startY) * prog;
      let sx = w * 0.62 - ((s.skyX * 0.25 * w) % (w * 2));
      sx = ((sx % (w * 1.6)) + w * 1.6) % (w * 1.6) - w * 0.3;
      ctx.drawImage(cv, sx - r * 1.6, sy - r * 1.6, r * 3.2, r * 3.2);
    }
    for (const L of skyCache.layers) {
      const off = ((((s.skyX * L.speed * w) % L.w) + L.w) % L.w);
      const x0 = -off;
      ctx.drawImage(L.cv, x0, L.y, L.w, L.h);
      if (x0 + L.w < w) ctx.drawImage(L.cv, x0 + L.w, L.y, L.w, L.h);
    }
    if (stage.storm) {
      // lightning now and then
      const t = time % 7.3;
      if (t < 0.12 || (t > 0.2 && t < 0.26)) {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(0, 0, w, hz);
      }
    }
  }

  // ---------- road ----------

  function quad(layer, colour, x1, y1, x2, y2, x3, y3, x4, y4) {
    const m = batches[layer];
    let a = m.get(colour);
    if (!a) {
      a = [];
      m.set(colour, a);
    }
    a.push(x1, y1, x2, y2, x3, y3, x4, y4);
  }

  function flush(ctx) {
    for (const m of batches) {
      for (const [colour, a] of m) {
        if (!a.length) continue;
        ctx.fillStyle = colour;
        ctx.beginPath();
        for (let i = 0; i < a.length; i += 8) {
          ctx.moveTo(a[i], a[i + 1]);
          ctx.lineTo(a[i + 2], a[i + 3]);
          ctx.lineTo(a[i + 4], a[i + 5]);
          ctx.lineTo(a[i + 6], a[i + 7]);
          ctx.closePath();
        }
        ctx.fill();
        a.length = 0;
      }
    }
  }

  function groundColour(type, band, fog) {
    const keys = GROUND_KEYS[type] || GROUND_KEYS.grass;
    return (pal[keys[band]] || pal[keys[0]])[fog];
  }

  // Projects the visible road and queues its polygons. Returns the index of the car's segment.
  function layRoad(s) {
    const { track } = s;
    const segs = track.segs;
    cameraFor(s, cam);
    cam.x = camX * ROAD_HALF;
    const base = Math.floor(cam.z / SEG_LEN);
    const basePct = cam.z / SEG_LEN - base;
    // curve offsets, then shifted so the road is straight under the car
    let dx = -segs[base].curve * basePct * CURVE_GAIN;
    xo[0] = 0;
    for (let k = 0; k < N - 1; k++) {
      xo[k + 1] = xo[k] + dx;
      dx += segs[Math.min(segs.length - 1, base + k)].curve * CURVE_GAIN;
    }
    const pk = s.z / SEG_LEN - base;
    const pi = Math.floor(pk);
    const xp = xo[pi] + (xo[pi + 1] - xo[pi]) * (pk - pi);
    for (let k = 0; k < N; k++) {
      const i = Math.min(segs.length - 1, base + k);
      const y = base + k < segs.length ? segs[i].y1 : segs[i].y2;
      project(xo[k] - xp, y, (base + k) * SEG_LEN, cam, view, pt);
      px[k] = pt.x;
      py[k] = pt.y;
      pw[k] = pt.w;
      ps[k] = pt.scale;
    }
    let maxy = h;
    const dd = N - 1;
    for (let k = 0; k < dd; k++) {
      visible[k] = 0;
      clipY[k] = maxy;
      if (ps[k] <= 0) continue;
      let x1 = px[k];
      let y1 = py[k];
      let w1 = pw[k];
      const x2 = px[k + 1];
      const y2 = py[k + 1];
      const w2 = pw[k + 1];
      if (y2 >= y1 || y2 >= maxy) continue;
      if (y1 > maxy) {
        const t = (y1 - maxy) / (y1 - y2);
        x1 += (x2 - x1) * t;
        w1 += (w2 - w1) * t;
        y1 = maxy;
      }
      visible[k] = 1;
      const seg = segs[Math.min(segs.length - 1, base + k)];
      const fog = Math.min(FOG_LEVELS - 1, Math.floor(Math.max(0, k / dd - FOG_START) / (1 - FOG_START) * FOG_LEVELS));
      const b = seg.band;
      // ground either side
      quad(0, groundColour(seg.groundL, b, fog), 0, y1, x1, y1, x2, y2, 0, y2);
      quad(0, groundColour(seg.groundR, b, fog), x1, y1, w, y1, w, y2, x2, y2);
      // rumble strips and road
      const r1 = w1 * 1.12;
      const r2 = w2 * 1.12;
      const rc = (b ? pal.rumble : pal.rumble2)[fog];
      quad(1, rc, x1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - r2, y2);
      quad(1, rc, x1 + w1, y1, x1 + r1, y1, x2 + r2, y2, x2 + w2, y2);
      quad(1, (b ? pal.road2 : pal.road)[fog], x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2);
      // lane dashes and edge lines
      const lane = pal.lane[fog];
      if (b === 0 && w1 > 6) {
        for (const lx of [-0.31, 0.31]) {
          const l1 = w1 * 0.028;
          const l2 = w2 * 0.028;
          quad(2, lane, x1 + lx * w1 - l1, y1, x1 + lx * w1 + l1, y1, x2 + lx * w2 + l2, y2, x2 + lx * w2 - l2, y2);
        }
      }
      if (w1 > 10) {
        const e1 = w1 * 0.02;
        const e2 = w2 * 0.02;
        quad(2, lane, x1 - w1 * 0.95 - e1, y1, x1 - w1 * 0.95 + e1, y1, x2 - w2 * 0.95 + e2, y2, x2 - w2 * 0.95 - e2, y2);
        quad(2, lane, x1 + w1 * 0.95 - e1, y1, x1 + w1 * 0.95 + e1, y1, x2 + w2 * 0.95 + e2, y2, x2 + w2 * 0.95 - e2, y2);
      }
      // start line and the chequered finish
      const gi = base + k;
      if (gi === START_LINE) quad(2, pal.startLine[fog], x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2);
      if (gi === track.finishSeg || gi === track.finishSeg + 1) {
        const cols = 10;
        for (let r = 0; r < 2; r++) {
          const ta = r / 2;
          const tb = (r + 1) / 2;
          const ya = y1 + (y2 - y1) * ta;
          const yb = y1 + (y2 - y1) * tb;
          const xa = x1 + (x2 - x1) * ta;
          const xb = x1 + (x2 - x1) * tb;
          const wa = w1 + (w2 - w1) * ta;
          const wb = w1 + (w2 - w1) * tb;
          for (let c = 0; c < cols; c++) {
            const col = (c + r + (gi - track.finishSeg) * 2) % 2 ? pal.check[fog] : pal.checkInk[fog];
            const u0 = -1 + (2 * c) / cols;
            const u1 = -1 + (2 * (c + 1)) / cols;
            quad(2, col, xa + u0 * wa, ya, xa + u1 * wa, ya, xb + u1 * wb, yb, xb + u0 * wb, yb);
          }
        }
      }
    }
    // far ground behind everything, up to the horizon
    return { base, playerK: pi };
  }

  // ---------- sprites, traffic, coins ----------

  function drawSpriteAt(ctx, img, x, yBottom, hpx, wpx, clip) {
    if (hpx < 1.2) return;
    if (!img || !img.width) return;
    const top = yBottom - hpx;
    if (top >= clip) return;
    if (x + wpx / 2 < 0 || x - wpx / 2 > w) return;
    if (yBottom <= clip) {
      ctx.drawImage(img, x - wpx / 2, top, wpx, hpx);
    } else {
      const frac = (clip - top) / hpx;
      ctx.drawImage(img, 0, 0, img.width, img.height * frac, x - wpx / 2, top, wpx, hpx * frac);
    }
  }

  function drawRail(ctx, k, seg, clip) {
    if (!visible[k] && py[k] > clip + 1) return;
    const H = 330;
    const fog = Math.min(FOG_LEVELS - 1, Math.floor(Math.max(0, k / (N - 1) - FOG_START) / (1 - FOG_START) * FOG_LEVELS));
    const y1 = Math.min(py[k], clip);
    const y2 = py[k + 1];
    if (y2 >= clip) return;
    for (const side of [-1, 1]) {
      const xa = px[k] + side * 1.16 * pw[k];
      const xb = px[k + 1] + side * 1.16 * pw[k + 1];
      const ha = (pw[k] * H) / ROAD_HALF;
      const hb = (pw[k + 1] * H) / ROAD_HALF;
      ctx.fillStyle = pal.rail[fog];
      ctx.beginPath();
      ctx.moveTo(xa, y1);
      ctx.lineTo(xb, y2);
      ctx.lineTo(xb, y2 - hb);
      ctx.lineTo(xa, py[k] - ha);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = pal.railShade[fog];
      ctx.beginPath();
      ctx.moveTo(xa, y1);
      ctx.lineTo(xb, y2);
      ctx.lineTo(xb, y2 - hb * 0.3);
      ctx.lineTo(xa, Math.min(y1, py[k] - ha * 0.3));
      ctx.closePath();
      ctx.fill();
      if (seg.i % 2 === 0 && ha > 2) {
        ctx.fillStyle = pal.railShade[fog];
        const pwid = Math.max(1, ha * 0.22);
        ctx.fillRect(xa - pwid / 2, py[k] - ha * 1.12, pwid, Math.min(ha * 1.12, clip - (py[k] - ha * 1.12)));
      }
    }
  }

  function drawPad(ctx, k, pad, time) {
    const y1 = py[k];
    const y2 = py[k + 2] ?? py[k + 1];
    if (y2 >= y1) return;
    const half = 0.3;
    const a1 = px[k] + (pad.x - half) * pw[k];
    const b1 = px[k] + (pad.x + half) * pw[k];
    const a2 = px[k + 2] + (pad.x - half) * pw[k + 2];
    const b2 = px[k + 2] + (pad.x + half) * pw[k + 2];
    const fog = Math.min(FOG_LEVELS - 1, Math.floor(Math.max(0, k / (N - 1) - FOG_START) / (1 - FOG_START) * FOG_LEVELS));
    ctx.fillStyle = pal.pad[fog];
    ctx.beginPath();
    ctx.moveTo(a1, y1);
    ctx.lineTo(b1, y1);
    ctx.lineTo(b2, y2);
    ctx.lineTo(a2, y2);
    ctx.closePath();
    ctx.fill();
    // chevrons rushing forward
    ctx.fillStyle = pal.pad2[fog];
    for (let c = 0; c < 3; c++) {
      const t0 = ((c / 3 + time * 1.6) % 1);
      const ta = t0;
      const tb = Math.min(1, t0 + 0.18);
      const ya = y1 + (y2 - y1) * ta;
      const yb = y1 + (y2 - y1) * tb;
      const ma = (a1 + b1) / 2 + ((a2 + b2) / 2 - (a1 + b1) / 2) * ta;
      const mb = (a1 + b1) / 2 + ((a2 + b2) / 2 - (a1 + b1) / 2) * tb;
      const wa = ((b1 - a1) + ((b2 - a2) - (b1 - a1)) * ta) * 0.42;
      const wb = ((b1 - a1) + ((b2 - a2) - (b1 - a1)) * tb) * 0.42;
      ctx.beginPath();
      ctx.moveTo(ma - wa, ya);
      ctx.lineTo(mb, yb);
      ctx.lineTo(ma + wa, ya);
      ctx.lineTo(ma + wa * 0.55, ya);
      ctx.lineTo(mb, yb + (ya - yb) * 0.45);
      ctx.lineTo(ma - wa * 0.55, ya);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawScene(ctx, s, time) {
    const { track } = s;
    const segs = track.segs;
    if (!coinFrames) coinFrames = paintCoins(Math.round(72 * spriteScale));
    const { base, playerK } = layRoad(s);
    // far ground under the horizon, then the road on top
    ctx.fillStyle = pal[(GROUND_KEYS[segs[Math.min(segs.length - 1, base + N - 2)].groundL] || GROUND_KEYS.grass)[0]][FOG_LEVELS - 1];
    ctx.fillRect(0, view.horizon, w, h - view.horizon);
    flush(ctx);
    // traffic by segment
    for (const a of carsAt) a.length = 0;
    for (const c of s.traffic) {
      const k = Math.floor(c.z / SEG_LEN) - base;
      if (k >= 1 && k < N - 1) carsAt[k].push(c);
    }
    let playerDrawn = false;
    const car = playerPose(s);
    for (let k = N - 2; k >= 1; k--) {
      if (ps[k] <= 0) continue;
      const gi = base + k;
      if (gi >= segs.length) continue;
      const seg = segs[gi];
      const clip = clipY[k];
      if (seg.rail) drawRail(ctx, k, seg, clip);
      if (seg.pad && visible[k] && k + 2 < N) drawPad(ctx, k, seg.pad, time);
      const unit = pw[k] / ROAD_HALF; // px per world unit at this depth
      for (const sp of seg.sprites) {
        const def = SPRITES[sp.kind];
        const img = sprite(sp.kind, sp.flip || (sp.kind.startsWith('lamp') && sp.x < 0));
        const hpx = def.h * unit;
        const wpx = hpx * def.aspect;
        // wide things stand with their inner edge at x, so they never lean over the road
        const sx = px[k] + sp.x * pw[k] + (def.edge ? Math.sign(sp.x) * wpx * 0.5 : 0);
        // scenery between the camera and the car is left out where it would hide the car
        if (k < playerK && sx - wpx / 2 < car.x + car.W * 0.65 && sx + wpx / 2 > car.x - car.W * 0.65 && py[k] - hpx < car.y) continue;
        drawSpriteAt(ctx, img, sx, py[k], hpx, wpx, clip);
        if (sp.kind === 'startGantry' && s.status === 'count') drawGantryLights(ctx, px[k], py[k] - hpx, hpx, s);
      }
      // coins float above the road and bob
      if (seg.coins.length) {
        const xm = (px[k] + px[k + 1]) / 2;
        const ym = (py[k] + py[k + 1]) / 2;
        const wm = (pw[k] + pw[k + 1]) / 2;
        const um = wm / ROAD_HALF;
        for (const coin of seg.coins) {
          if (s.got[coin.id]) continue;
          const size = 300 * um;
          if (size < 1.5) continue;
          const bob = Math.sin(time * 4 + coin.id) * 40 * um;
          const yb = ym - 160 * um - bob;
          if (yb - size > clip) continue;
          const frame = coinFrames[(Math.floor(Math.abs(time) * 10) + coin.id) % coinFrames.length];
          drawSpriteAt(ctx, frame, xm + coin.x * wm, yb, size, size, clip);
        }
      }
      for (const c of carsAt[k]) {
        const f = c.z / SEG_LEN - gi;
        const cx = px[k] + (px[k + 1] - px[k]) * f;
        const cy = py[k] + (py[k + 1] - py[k]) * f;
        const cw = pw[k] + (pw[k + 1] - pw[k]) * f;
        const def = SPRITES[c.kind];
        const hpx = (def.h * cw) / ROAD_HALF;
        const x = cx + c.x * cw;
        const wob = s.time - c.wobbleT;
        if (wob >= 0 && wob < 0.9) {
          ctx.save();
          ctx.translate(x, cy);
          ctx.rotate(Math.sin(wob * 18) * 0.12 * (1 - wob / 0.9));
          drawSpriteAt(ctx, sprite(c.kind), 0, 0, hpx, hpx * def.aspect, clip - cy);
          ctx.restore();
        } else {
          drawSpriteAt(ctx, sprite(c.kind), x, cy, hpx, hpx * def.aspect, clip);
        }
      }
      if (k === playerK) {
        drawPlayer(ctx, s, time);
        playerDrawn = true;
      }
    }
    if (!playerDrawn) drawPlayer(ctx, s, time);
  }

  function drawGantryLights(ctx, x, top, hpx, s) {
    const lit = Math.min(3, Math.floor(COUNTDOWN - s.countT + 1));
    const r = hpx * 0.05;
    for (let i = 0; i < 3; i++) {
      const lx = x + (i - 1) * hpx * 0.13 * (2900 / 1900) * 0.89;
      const ly = top + hpx * 0.11;
      ctx.beginPath();
      ctx.arc(lx, ly, r, 0, TAU);
      ctx.fillStyle = i < lit ? (i === 2 ? C.sun : C.red) : '#4a4460';
      ctx.fill();
    }
  }

  // ---------- the player's car ----------

  function carBody(ctx, W, s, time) {
    const u = W / 100;
    const boosting = s.boostT > 0;
    // tyres
    ctx.fillStyle = '#1e1a28';
    roundRect(ctx, -50 * u, -26 * u, 17 * u, 26 * u, 4 * u);
    ctx.fill();
    roundRect(ctx, 33 * u, -26 * u, 17 * u, 26 * u, 4 * u);
    ctx.fill();
    ctx.fillStyle = '#3a3448';
    const tread = (time * 40) % 1;
    for (const x of [-46, 37]) for (let i = 0; i < 3; i++) ctx.fillRect(x * u, (-23 + ((i + tread) % 3) * 8) * u, 9 * u, 2 * u);
    // windscreen (furthest away), then the driver, then the back of the car
    const lean = s.lean * 4 * u;
    ctx.beginPath();
    ctx.moveTo(-38 * u + lean, -54 * u);
    ctx.lineTo(38 * u + lean, -54 * u);
    ctx.lineTo(31 * u + lean * 1.4, -80 * u);
    ctx.lineTo(-31 * u + lean * 1.4, -80 * u);
    ctx.closePath();
    ctx.fillStyle = 'rgba(160,235,255,0.55)';
    ctx.fill();
    ctx.lineWidth = 3 * u;
    ctx.strokeStyle = '#e8e8f4';
    ctx.stroke();
    ctx.lineWidth = 1.2 * u;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    // passenger headrest and the driver
    ctx.fillStyle = '#ffe14d';
    roundRect(ctx, 8 * u + lean, -70 * u, 18 * u, 16 * u, 5 * u);
    ctx.fill();
    ctx.lineWidth = 1.6 * u;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    const hx = -16 * u + lean * 1.3;
    ctx.fillStyle = '#6b3f1d';
    ctx.beginPath();
    ctx.arc(hx, -70 * u, 11 * u, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#19c3d6';
    ctx.beginPath();
    ctx.arc(hx, -73 * u, 11.5 * u, Math.PI * 1.02, Math.PI * 1.98);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(hx - 5 * u, -64 * u, 10 * u, 3 * u);
    // body
    ctx.beginPath();
    ctx.moveTo(-46 * u, -50 * u);
    ctx.lineTo(46 * u, -50 * u);
    ctx.lineTo(40 * u, -60 * u);
    ctx.lineTo(-40 * u, -60 * u);
    ctx.closePath();
    ctx.fillStyle = '#ff9a6b';
    ctx.fill();
    ctx.lineWidth = 2 * u;
    ctx.stroke();
    roundRect(ctx, -51 * u, -52 * u, 102 * u, 38 * u, 11 * u);
    ctx.fillStyle = '#ff5a3c';
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(-44 * u, -48 * u, 88 * u, 3 * u);
    // racing stripes over the deck and down the back
    ctx.fillStyle = '#19c3d6';
    for (const sx of [-9, 4]) {
      ctx.beginPath();
      ctx.moveTo(sx * u, -60 * u);
      ctx.lineTo((sx + 5) * u, -60 * u);
      ctx.lineTo((sx + 5.6) * u, -14 * u);
      ctx.lineTo((sx - 0.6) * u, -14 * u);
      ctx.closePath();
      ctx.fill();
    }
    // tail lights, glowing brighter when boosting
    for (const tx of [-47, 29]) {
      roundRect(ctx, tx * u, -45 * u, 18 * u, 10 * u, 3 * u);
      ctx.fillStyle = boosting ? '#ff9ab0' : '#ff2a4a';
      ctx.fill();
      ctx.lineWidth = 1.4 * u;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect((tx + 3) * u, -43 * u, 5 * u, 2.5 * u);
    }
    // plate and bumper
    roundRect(ctx, -12 * u, -36 * u, 24 * u, 11 * u, 2 * u);
    ctx.fillStyle = '#fff6d6';
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.font = font(7.5 * u);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SUN 1', 0, -30.2 * u);
    roundRect(ctx, -50 * u, -18 * u, 100 * u, 8 * u, 3 * u);
    ctx.fillStyle = '#e8e8f4';
    ctx.fill();
    ctx.lineWidth = 1.6 * u;
    ctx.stroke();
    // exhausts, with flames on a boost
    for (const ex of [-30, 30]) {
      ctx.beginPath();
      ctx.arc(ex * u, -11 * u, 3.2 * u, 0, TAU);
      ctx.fillStyle = '#5a5468';
      ctx.fill();
      ctx.stroke();
      if (boosting) {
        const f = 1 + Math.sin(time * 50 + ex) * 0.3;
        ctx.beginPath();
        ctx.moveTo((ex - 4) * u, -11 * u);
        ctx.lineTo(ex * u, (-11 + 16 * f) * u);
        ctx.lineTo((ex + 4) * u, -11 * u);
        ctx.closePath();
        ctx.fillStyle = '#ffb627';
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo((ex - 2) * u, -11 * u);
        ctx.lineTo(ex * u, (-11 + 9 * f) * u);
        ctx.lineTo((ex + 2) * u, -11 * u);
        ctx.closePath();
        ctx.fillStyle = '#fff6c8';
        ctx.fill();
      }
    }
  }

  function playerPose(s) {
    const unit = view.k / CAMERA_HEIGHT; // px per world unit at the car
    const W = CAR_W * ROAD_HALF * unit * 1.25;
    const x = view.cx + (s.x - camX) * ROAD_HALF * unit;
    return { W, x, y: view.carY, unit };
  }

  function drawPlayer(ctx, s, time) {
    const { W, x, y } = playerPose(s);
    const pct = s.speed / MAX_SPEED;
    let bob = Math.sin(time * 31) * pct * W * 0.006;
    if (s.offroad) bob += Math.sin(time * 47) * W * 0.02 * Math.min(1, pct * 2);
    // shadow
    ctx.fillStyle = 'rgba(22,11,51,0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + W * 0.01, W * 0.55, W * 0.07, 0, 0, TAU);
    ctx.fill();
    let rot = s.lean * 0.05;
    if (s.spinT > 0) {
      const k = 1 - s.spinT / SPIN_TIME;
      rot += s.spinDir * Math.sin(k * Math.PI * 2.5) * (1 - k) * 0.75;
    }
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(rot);
    carBody(ctx, W, s, time);
    ctx.restore();
  }

  // ---------- particles and overlays ----------

  function emit(x, y, vx, vy, life, r, colour, grow = 1.6) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    particles.push({ x, y, vx, vy, life, max: life, r, colour, grow });
  }

  function effects(ctx, s, time, dt) {
    const { W, x, y } = playerPose(s);
    const pct = s.speed / MAX_SPEED;
    const seg = segmentAt(s.track, s.z);
    const racing = s.status !== 'count';
    if (racing && dt > 0) {
      const wheels = [x - W * 0.42, x + W * 0.42];
      if (s.offroad && pct > 0.15) {
        const ground = s.x < 0 ? seg.groundL : seg.groundR;
        const water = ground === 'water';
        for (const wx of wheels) {
          if (Math.random() < 0.7) {
            emit(wx + (Math.random() - 0.5) * W * 0.1, y - W * 0.05, (Math.random() - 0.5) * W * 0.8, -W * (0.5 + Math.random() * 0.6),
              0.55, W * 0.07, water ? 'rgba(220,250,255,0.85)' : ground === 'city' ? 'rgba(200,200,220,0.7)' : 'rgba(214,180,120,0.75)');
          }
        }
      }
      const skid = Math.abs(s.lean) > 0.55 && Math.abs(seg.curve) >= 2.5 && pct > 0.65;
      if ((skid || s.spinT > 0) && Math.random() < 0.8) {
        const wx = wheels[Math.random() < 0.5 ? 0 : 1];
        emit(wx, y - W * 0.03, (Math.random() - 0.5) * W * 0.4, -W * 0.3, 0.6, W * 0.06, 'rgba(240,240,250,0.7)');
      }
      if (s.scraping && Math.random() < 0.9) {
        const wx = s.x > 0 ? x + W * 0.5 : x - W * 0.5;
        emit(wx, y - W * 0.2, (s.x > 0 ? -1 : 1) * W * (0.5 + Math.random()), -W * Math.random() * 0.8, 0.3, W * 0.025, '#ffe14d', 0.2);
      }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += W * 0.4 * dt;
      const k = p.life / p.max;
      ctx.globalAlpha = k;
      ctx.fillStyle = p.colour;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (1 + (1 - k) * p.grow), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // a burst of stars and a BOING on a bump
    const since = s.time - s.lastBumpT;
    if (since < 0.9) {
      const k = since / 0.9;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + since * 3;
        const r = W * (0.3 + k * 0.6);
        drawStar(ctx, x + Math.cos(a) * r, y - W * 0.45 + Math.sin(a) * r * 0.5, W * 0.06 * (1 - k * 0.5), true);
      }
      ctx.save();
      ctx.globalAlpha = Math.min(1, (1 - k) * 2);
      outlined(ctx, 'BOING!', x, y - W * (0.95 + k * 0.4), W * 0.3 * (1 + Math.sin(since * 20) * 0.08), C.pink);
      ctx.restore();
    }
    // coin sparkle
    const cs = s.time - s.lastCoinT;
    if (cs < 0.35) {
      const k = cs / 0.35;
      ctx.strokeStyle = `rgba(255,225,77,${1 - k})`;
      ctx.lineWidth = W * 0.025;
      ctx.beginPath();
      ctx.arc(x, y - W * 0.55, W * (0.2 + k * 0.4), 0, TAU);
      ctx.stroke();
    }
  }

  function speedLines(ctx, s, time) {
    const k = Math.min(1, s.boostT * 2);
    if (k <= 0) return;
    ctx.save();
    ctx.globalAlpha = 0.7 * k;
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    const cx = w / 2;
    const cy = view.horizon + view.k * 0.2;
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU + Math.sin(i * 7.1) * 0.1;
      const ph = (time * 3.2 + i * 0.37) % 1;
      const R = Math.max(w, h) * 0.75;
      const r0 = R * (0.55 + ph * 0.5);
      const r1 = r0 + R * 0.18;
      ctx.lineWidth = 2 + (i % 3) * 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.9);
      ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.9);
      ctx.stroke();
    }
    ctx.restore();
  }

  function rain(ctx, time) {
    ctx.strokeStyle = 'rgba(210,225,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 70; i++) {
      const x = ((i * 97.3 + time * 90) % (w + 40)) - 20;
      const y = ((i * 53.7 + time * (900 + (i % 5) * 80)) % (h + 60)) - 30;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 6, y + 22);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(40,44,80,0.18)';
    ctx.fillRect(0, 0, w, h);
  }

  // The whole race view (no HUD).
  function drawRace(ctx, s, time, dt) {
    const t0 = performance.now();
    if (s.status !== lastStatus && s.status === 'count') camX = s.x;
    lastStatus = s.status;
    camX += (s.x - camX) * Math.min(1, dt * 5);
    ctx.save();
    const shake = s.time - s.lastBumpT;
    if (shake < 0.3) ctx.translate(Math.sin(shake * 70) * 6 * (1 - shake / 0.3), 0);
    drawSky(ctx, s, time);
    drawScene(ctx, s, time);
    effects(ctx, s, time, dt);
    speedLines(ctx, s, time);
    if (s.stage.storm) rain(ctx, time);
    ctx.restore();
    stats.frames++;
    stats.ms += performance.now() - t0;
  }

  return {
    view, stats, resize, prepare, drawRace, playerPose,
    reset() {
      particles.length = 0;
    },
  };
}

// ---------- the launcher tile ----------

let tileKey = '';
let tileBg = null;

function paintTile(w, h, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  const c = cv.getContext('2d');
  c.scale(dpr, dpr);
  const hz = h * 0.48;
  const g = c.createLinearGradient(0, 0, 0, hz);
  g.addColorStop(0, '#3b1d6e');
  g.addColorStop(0.55, '#e8507a');
  g.addColorStop(1, '#ffb35c');
  c.fillStyle = g;
  c.fillRect(0, 0, w, hz);
  const r = w * 0.22;
  c.fillStyle = '#ffe27a';
  c.beginPath();
  c.arc(w / 2, hz - r * 0.15, r, Math.PI, 0);
  c.fill();
  c.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 3; i++) c.fillRect(w / 2 - r, hz - r * (0.55 - i * 0.18), r * 2, r * (0.05 + i * 0.03));
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = '#3fbf6a';
  c.fillRect(0, hz, w, h - hz);
  c.fillStyle = '#2a8ad0';
  c.fillRect(0, hz, w, h * 0.03);
  return cv;
}

export function drawTile(ctx, x, y, w, h, time) {
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const key = `${Math.round(w)}x${Math.round(h)}@${dpr}`;
  if (key !== tileKey) {
    tileKey = key;
    tileBg = paintTile(w, h, dpr);
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(tileBg, x, y, w, h);
  const hz = y + h * 0.48 + h * 0.03;
  const bend = Math.sin(time * 0.7) * w * 0.12;
  const cx = x + w / 2;
  // road, built of bands rushing toward the viewer
  const bands = 14;
  const scroll = (time * 2.2) % 1;
  for (let i = bands; i >= 0; i--) {
    const t0 = (i + scroll) / bands;
    const t1 = (i + 1 + scroll) / bands;
    const d0 = t0 * t0;
    const d1 = t1 * t1;
    const ya = hz + (y + h - hz) * Math.min(1, d0);
    const yb = hz + (y + h - hz) * Math.min(1, d1);
    const wa = w * 0.03 + w * 0.5 * d0;
    const wb = w * 0.03 + w * 0.5 * d1;
    const xa = cx + bend * (1 - t0) * (1 - t0);
    const xb = cx + bend * (1 - t1) * (1 - t1);
    ctx.fillStyle = i % 2 ? '#ffffff' : '#ff4f8b';
    ctx.beginPath();
    ctx.moveTo(xa - wa * 1.15, ya);
    ctx.lineTo(xa + wa * 1.15, ya);
    ctx.lineTo(xb + wb * 1.15, yb);
    ctx.lineTo(xb - wb * 1.15, yb);
    ctx.fill();
    ctx.fillStyle = i % 2 ? '#5a4a6e' : '#56466a';
    ctx.beginPath();
    ctx.moveTo(xa - wa, ya);
    ctx.lineTo(xa + wa, ya);
    ctx.lineTo(xb + wb, yb);
    ctx.lineTo(xb - wb, yb);
    ctx.fill();
    if (i % 2) {
      ctx.fillStyle = '#fff6d6';
      ctx.beginPath();
      ctx.moveTo(xa - wa * 0.03, ya);
      ctx.lineTo(xa + wa * 0.03, ya);
      ctx.lineTo(xb + wb * 0.03, yb);
      ctx.lineTo(xb - wb * 0.03, yb);
      ctx.fill();
    }
  }
  // palms sweeping past both sides
  for (let i = 0; i < 3; i++) {
    const t = ((time * 0.45 + i / 3) % 1);
    const d = t * t;
    const s = 0.15 + d * 1.1;
    for (const side of [-1, 1]) {
      const px = cx + bend * (1 - t) * (1 - t) + side * (w * 0.06 + w * 0.75 * d);
      const py = hz + (y + h - hz) * d;
      const ph = h * 0.5 * s;
      ctx.strokeStyle = '#a8703e';
      ctx.lineWidth = Math.max(1.5, ph * 0.06);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(px - side * ph * 0.05, py - ph * 0.5, px + side * ph * 0.08, py - ph);
      ctx.stroke();
      ctx.strokeStyle = '#2fae4a';
      ctx.lineWidth = Math.max(1.5, ph * 0.07);
      for (const a of [-2.6, -1.9, -1.2, -0.5]) {
        ctx.beginPath();
        ctx.moveTo(px + side * ph * 0.08, py - ph);
        ctx.quadraticCurveTo(px + side * ph * 0.08 + Math.cos(a) * ph * 0.25, py - ph + Math.sin(a) * ph * 0.2 - ph * 0.05,
          px + side * ph * 0.08 + Math.cos(a) * ph * 0.42, py - ph + ph * 0.12);
        ctx.stroke();
      }
    }
  }
  // the car from behind, bobbing a little
  const cw = w * 0.36;
  const by = y + h * 0.93 + Math.sin(time * 9) * h * 0.006;
  const u = cw / 100;
  const lean = Math.sin(time * 0.7) * 3 * u;
  ctx.save();
  ctx.translate(cx, by);
  ctx.rotate(Math.sin(time * 0.7) * 0.04);
  ctx.fillStyle = 'rgba(22,11,51,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 0, cw * 0.55, cw * 0.07, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#1e1a28';
  roundRect(ctx, -50 * u, -24 * u, 17 * u, 24 * u, 4 * u);
  ctx.fill();
  roundRect(ctx, 33 * u, -24 * u, 17 * u, 24 * u, 4 * u);
  ctx.fill();
  ctx.fillStyle = 'rgba(160,235,255,0.7)';
  ctx.beginPath();
  ctx.moveTo(-36 * u + lean, -52 * u);
  ctx.lineTo(36 * u + lean, -52 * u);
  ctx.lineTo(30 * u + lean, -76 * u);
  ctx.lineTo(-30 * u + lean, -76 * u);
  ctx.fill();
  ctx.fillStyle = '#6b3f1d';
  ctx.beginPath();
  ctx.arc(-15 * u + lean, -66 * u, 10 * u, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#19c3d6';
  ctx.beginPath();
  ctx.arc(-15 * u + lean, -69 * u, 10.5 * u, Math.PI, 0);
  ctx.fill();
  roundRect(ctx, -51 * u, -52 * u, 102 * u, 38 * u, 11 * u);
  ctx.fillStyle = '#ff5a3c';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.fillStyle = '#19c3d6';
  ctx.fillRect(-9 * u, -52 * u, 5 * u, 38 * u);
  ctx.fillRect(4 * u, -52 * u, 5 * u, 38 * u);
  ctx.fillStyle = '#ff2a4a';
  roundRect(ctx, -47 * u, -45 * u, 18 * u, 10 * u, 3 * u);
  ctx.fill();
  roundRect(ctx, 29 * u, -45 * u, 18 * u, 10 * u, 3 * u);
  ctx.fill();
  ctx.fillStyle = '#e8e8f4';
  roundRect(ctx, -50 * u, -18 * u, 100 * u, 8 * u, 3 * u);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}
