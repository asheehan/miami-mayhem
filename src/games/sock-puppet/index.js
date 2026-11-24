// Sock Puppet Show as a launcher game: the puppet shelf, each puppet's own page (make,
// story, stage, bin), the workshop, the story maker and the stage, saving, and the launcher
// tile. Rules live in puppet.js, story.js and show.js, saving in save.js, drawing in
// draw-puppet.js, parts-*.js, scenes.js, friends.js and ui.js.
import { C, roundRect, outlined, makeCanvas, star } from './art.js';
import { SHAPES, createPuppet, randomPuppet, newUid, encodePuppet, decodePuppet, NAMES } from './puppet.js';
import { drawPuppet } from './draw-puppet.js';
import { createLive, stepLive, liveAnim, talk, poke, applyWobble } from './live.js';
import { drawButton, glyph, hit } from './ui.js';
import { unlockAudio, play, babble } from './sound.js';
import { createSpeech } from './speech.js';
import { createWorkshop } from './workshop.js';
import { createStorybook } from './storybook.js';
import { createStage } from './stage.js';
import {
  SAVE_KEY, SHELF_SLOTS, loadProgress, saveProgress, putOnShelf, removeFromShelf, slotOf, booksFor,
} from './save.js';
import { hashString } from './rng.js';

const SAVE_DELAY = 0.6;
const DPR_MAX = 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const dprNow = () => Math.min(DPR_MAX, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
const storage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};
const memoryStore = () => {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); } };
};

export const sockPuppet = {
  id: 'sock-puppet',
  title: 'Sock Puppet Show',
  drawTile,
  create,
};

function create(host) {
  const params = new URLSearchParams(location.search);
  const debug = params.has('debug');
  const store = storage() || memoryStore();
  const progress = loadProgress(store);
  const speech = createSpeech();
  let autoRead = true;
  try {
    autoRead = store.getItem('sock-puppet-autoread') !== '0';
  } catch {
    autoRead = true;
  }
  const versions = new Map(); // uid -> change count (for thumbnails)
  const thumbs = new Map(); // uid -> { key, canvas }
  let saveIn = -1;
  let lastSave = 0;
  let standIn = null;

  let size = { w: 1, h: 1 };
  let time = 0;
  let screen = 'shelf'; // 'shelf' | 'card' | 'workshop' | 'story' | 'stage'
  let buttons = [];
  let current = null; // the puppet whose page is open
  let cardLive = createLive(1);
  let confirm = false;
  const shelfLive = new Map(); // uid -> live

  const G = {
    get size() {
      return size;
    },
    get time() {
      return time;
    },
    progress,
    speech,
    dpr: dprNow,
    go,
    changed(p) {
      versions.set(p.uid, (versions.get(p.uid) || 0) + 1);
      saveIn = SAVE_DELAY;
    },
    saveSoon() {
      saveIn = SAVE_DELAY;
    },
    voiceOf(p) {
      const base = p.sock.shape === 'stubby' ? 0.8 : p.sock.shape === 'chunky' ? 0.2 : 0.5;
      return clamp(base + ((hashString(p.uid) % 100) / 100 - 0.5) * 0.3, 0, 1);
    },
    thumb: thumbFor,
    standIn() {
      if (!standIn) {
        standIn = createPuppet({ uid: 'standin', name: 'Sock Pal', colour: 10, pattern: 'stripes', pcolour: 0 });
        for (const [id, x, y] of [['googly', 48, -64], ['googly', -48, -64], ['button-nose', 0, 0]]) standIn.parts.push({ id, x, y, s: 1, r: 0, back: false, c: id === 'button-nose' ? 1 : -1 });
      }
      return standIn;
    },
    setAutoRead(v) {
      autoRead = v;
      try {
        store.setItem('sock-puppet-autoread', v ? '1' : '0');
      } catch {
        // not kept
      }
    },
  };

  const workshop = createWorkshop(G);
  const storybook = createStorybook(G);
  const stage = createStage(G);
  storybook.setAuto(autoRead && speech.available);
  const screens = { workshop, story: storybook, stage };

  function save() {
    saveIn = -1;
    lastSave = saveProgress(store, progress);
  }

  // ---------- moving between screens ----------

  function go(name, arg, opts = {}) {
    const from = screens[screen];
    if (from) from.leave();
    speech.cancel();
    if (saveIn >= 0 || name === 'shelf') save();
    screen = name;
    confirm = false;
    if (name === 'card') {
      current = arg;
      cardLive = createLive(hashString(current.uid) % 50);
      talk(cardLive, 0.6);
    }
    const to = screens[name];
    if (to) {
      current = arg;
      to.enter(arg, opts);
    }
    layout();
  }

  function newPuppet(slot) {
    const uid = newUid();
    const used = new Set(progress.shelf.filter(Boolean).map((q) => q.name));
    const name = NAMES.find((n) => !used.has(n)) || NAMES[slot % NAMES.length];
    const colours = [6, 9, 3, 1, 8, 5, 2, 0, 7];
    const p = createPuppet({ uid, name, colour: colours[slot % colours.length], pattern: slot % 3 === 1 ? 'stripes' : 'plain', pcolour: 10 });
    putOnShelf(progress, slot, p);
    G.changed(p);
    save();
    play('pop');
    go('workshop', p, { tab: 'eyes' });
  }

  // ---------- layout ----------

  function bar() {
    const pad = clamp(size.w * 0.02, 8, 16);
    const b = clamp(size.h * 0.07, 56, 84);
    return { pad, b, icon: b - pad * 0.5 };
  }

  function layout() {
    const { w, h } = size;
    const { pad, icon } = bar();
    if (screens[screen]) {
      screens[screen].layout();
      return;
    }
    if (screen === 'shelf') {
      buttons = [{ id: 'home', icon: 'home', x: pad, y: pad * 0.5, w: icon, h: icon }];
      const top = icon + pad * 2 + clamp(h * 0.04, 20, 50);
      const cols = 3;
      const rows = Math.ceil(SHELF_SLOTS / cols);
      const cw = (w - pad * 2) / cols;
      const ch = (h - top - pad) / rows;
      for (let i = 0; i < SHELF_SLOTS; i++) {
        buttons.push({ id: 'slot', slot: i, x: pad + (i % cols) * cw + 5, y: top + Math.floor(i / cols) * ch + 5, w: cw - 10, h: ch - 10 });
      }
    } else if (screen === 'card') {
      const big = clamp(Math.min(w * 0.27, h * 0.15), 84, 190);
      const gap = clamp(w * 0.04, 12, 30);
      const y = h - pad * 2 - big;
      const x0 = w / 2 - (big * 3 + gap * 2) / 2;
      buttons = [
        { id: 'back', icon: 'back', x: pad, y: pad * 0.5, w: icon, h: icon },
        { id: 'delete', icon: 'bin', x: w - pad - icon, y: pad * 0.5, w: icon, h: icon, fill: '#ffd6de' },
        { id: 'edit', icon: 'brush', x: x0, y, w: big, h: big, fill: '#ffd23f' },
        { id: 'story', icon: 'book', x: x0 + big + gap, y, w: big, h: big, fill: '#5cb8ff' },
        { id: 'stage', icon: 'stage', x: x0 + (big + gap) * 2, y, w: big, h: big, fill: '#ff8ac0' },
      ];
      if (confirm) {
        const bs = clamp(Math.min(w, h) * 0.2, 80, 150);
        const cy = h / 2 + bs * 0.55;
        buttons = [
          { id: 'no', icon: 'cross', x: w / 2 - bs * 1.15, y: cy, w: bs, h: bs, fill: '#ff4d6d' },
          { id: 'yes', icon: 'tick', x: w / 2 + bs * 0.15, y: cy, w: bs, h: bs, fill: '#2fbf5b' },
        ];
      }
    }
  }

  // ---------- thumbnails ----------

  function thumbFor(p, cssW) {
    const px = Math.max(16, Math.round(cssW * dprNow()));
    const ver = versions.get(p.uid) || 0;
    const key = `${ver}|${px}|${p.sock.shape}`;
    const hc = thumbs.get(p.uid);
    if (hc && hc.key === key) return hc.canvas;
    const c = makeCanvas(px, px);
    const g = c.getContext('2d');
    const sh = SHAPES[p.sock.shape];
    const s = px / 760;
    g.translate(px / 2, px * 0.5 - ((sh.cuffBottom - 330) / 2) * s + px * 0.02);
    g.scale(s, s);
    drawPuppet(g, p, { k: s * 1.2, armTo: sh.cuffBottom + 400, mood: 'happy' });
    thumbs.set(p.uid, { key, canvas: c });
    return c;
  }

  // ---------- drawing ----------

  function wallpaper(ctx, top = '#3a1466', bottom = '#a3307a') {
    const { w, h } = size;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // faint stars
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let k = 0; k < 30; k++) {
      star(ctx, ((k * 137) % 97) / 97 * w, ((k * 71) % 89) / 89 * h, 6 + (k % 4) * 3);
      ctx.fill();
    }
  }

  function drawShelf(ctx) {
    const { w, h } = size;
    wallpaper(ctx);
    const home = buttons[0];
    drawButton(ctx, home, time);
    outlined(ctx, 'Sock Puppet Show', w / 2 + home.w * 0.3, home.y + home.h / 2, Math.min(home.h * 0.62, w / 11), C.sun, w - home.w * 2.6 - 20);
    for (const b of buttons) {
      if (b.id !== 'slot') continue;
      // a wooden cubby
      ctx.fillStyle = '#6b3a1f';
      roundRect(ctx, b.x, b.y, b.w, b.h, 16);
      ctx.fill();
      ctx.fillStyle = '#3d1e0e';
      roundRect(ctx, b.x + 8, b.y + 8, b.w - 16, b.h - 22, 10);
      ctx.fill();
      ctx.fillStyle = '#9a5a2e';
      ctx.fillRect(b.x, b.y + b.h - 16, b.w, 16);
      ctx.lineWidth = 3;
      ctx.strokeStyle = C.ink;
      roundRect(ctx, b.x, b.y, b.w, b.h, 16);
      ctx.stroke();
      const p = progress.shelf[b.slot];
      if (p) {
        let L = shelfLive.get(p.uid);
        if (!L) {
          L = createLive(hashString(p.uid) % 60);
          shelfLive.set(p.uid, L);
        }
        ctx.save();
        roundRect(ctx, b.x + 8, b.y + 8, b.w - 16, b.h - 22, 10);
        ctx.clip();
        const sh = SHAPES[p.sock.shape];
        const s = Math.min((b.w - 16) / 420, (b.h - 22) / (sh.cuffBottom + 300));
        ctx.translate(b.x + b.w / 2, b.y + b.h - 16 - (sh.cuffBottom - 30) * s);
        ctx.scale(s, s);
        applyWobble(ctx, L, sh.cuffBottom);
        drawPuppet(ctx, p, liveAnim(L, s * dprNow(), { armTo: sh.cuffBottom + 80 }));
        ctx.restore();
        // its name on a little label
        const lh = Math.min(26, b.h * 0.12);
        ctx.fillStyle = '#fff2d6';
        roundRect(ctx, b.x + b.w * 0.12, b.y + b.h - lh - 4, b.w * 0.76, lh, lh * 0.4);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = C.ink;
        ctx.stroke();
        ctx.fillStyle = C.ink;
        ctx.font = `800 ${Math.round(lh * 0.62)}px ui-rounded, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let fs = lh * 0.62;
        const tw = ctx.measureText(p.name).width;
        if (tw > b.w * 0.7) {
          fs *= (b.w * 0.7) / tw;
          ctx.font = `800 ${Math.round(fs)}px ui-rounded, system-ui, sans-serif`;
        }
        ctx.fillText(p.name, b.x + b.w / 2, b.y + b.h - lh / 2 - 3);
      } else {
        // an empty cubby: a dashed sock with a plus
        const cx = b.x + b.w / 2;
        const cy = b.y + b.h / 2 - 4;
        const s = Math.min(b.w, b.h) * 0.3;
        ctx.save();
        ctx.globalAlpha = 0.55 + Math.sin(time * 2 + b.slot) * 0.15;
        glyph(ctx, 'sock', cx - s * 0.1, cy, s, time, { colour: 'rgba(255,255,255,0.25)' });
        ctx.restore();
        drawButton(ctx, { x: cx + s * 0.1, y: cy + s * 0.05, w: s * 0.9, h: s * 0.9, icon: 'plus', fill: '#2fbf5b', round: true }, time);
      }
    }
  }

  function cardView() {
    const { w, h } = size;
    const { icon, pad } = bar();
    const top = icon + pad * 2;
    const bottom = buttons.find((b) => b.id === 'edit')?.y ?? h * 0.75;
    const sh = SHAPES[current.sock.shape];
    const avail = bottom - top - pad * 2;
    const s = Math.min((w * 0.8) / 560, avail / (sh.cuffBottom + 360));
    return { s, cx: w / 2, cy: top + 350 * s, bottom: bottom - pad };
  }

  function drawCard(ctx) {
    const { w, h } = size;
    wallpaper(ctx, '#2b1055', '#c2368f');
    const { icon, pad } = bar();
    const V = cardView();
    // a spotlight
    const sg = ctx.createRadialGradient(V.cx, V.cy, 10, V.cx, V.cy, w * 0.5);
    sg.addColorStop(0, 'rgba(255,240,200,0.4)');
    sg.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, V.bottom);
    ctx.clip();
    ctx.translate(V.cx, V.cy);
    ctx.scale(V.s, V.s);
    const sh = SHAPES[current.sock.shape];
    applyWobble(ctx, cardLive, sh.cuffBottom + 200);
    drawPuppet(ctx, current, liveAnim(cardLive, V.s * dprNow(), { mood: 'happy', wave: 0.5, armTo: (V.bottom - V.cy) / V.s + 20 }));
    ctx.restore();
    outlined(ctx, current.name, w / 2, icon / 2 + pad * 0.5, clamp(h * 0.05, 30, 60), C.sun, w - icon * 2.8);
    for (const b of buttons) drawButton(ctx, b, time);
    if (confirm) {
      ctx.fillStyle = 'rgba(15,6,40,0.78)';
      ctx.fillRect(0, 0, w, h);
      const yes = buttons.find((b) => b.id === 'yes');
      const pw = Math.min(w * 0.42, 260);
      const img = thumbFor(current, pw);
      ctx.drawImage(img, w / 2 - pw / 2, yes.y - pw - yes.h * 0.3, pw, pw);
      glyph(ctx, 'bin-open', w / 2 + pw * 0.38, yes.y - yes.h * 0.3 - pw * 0.15, pw * 0.2, time);
      for (const b of buttons) drawButton(ctx, { ...b, y: b.y + (b.id === 'yes' ? Math.sin(time * 4) * 3 : 0) }, time);
    }
  }

  // ---------- debug ----------

  if (debug) {
    window.__puppet = {
      screen: () => screen,
      progress: () => JSON.parse(store.getItem(SAVE_KEY) || 'null'),
      savedChars: () => lastSave,
      save: () => save(),
      buttons: () => (screens[screen] ? screens[screen].debug.buttons() : buttons.map((b) => ({ ...b }))),
      shelf: () => progress.shelf.map((p) => (p ? { uid: p.uid, name: p.name, parts: p.parts.length } : null)),
      puppet: () => current && encodePuppet(current),
      parts: () => current && current.parts.map((q) => ({ ...q })),
      history: () => current && current.history.length,
      open: (slot, where = 'card', opts) => {
        const p = progress.shelf[slot];
        if (p) go(where, p, opts);
      },
      newPuppet: (slot) => newPuppet(slot),
      shelfRandom(slot, seed) {
        const p = randomPuppet(seed, { uid: newUid() });
        putOnShelf(progress, slot, p);
        G.changed(p);
        save();
        return p.uid;
      },
      go: (name) => go(name, current),
      speech: () => ({ available: speech.available }),
      workshop: workshop.debug,
      story: storybook.debug,
      stage: stage.debug,
      load: (json) => {
        const p = decodePuppet(json);
        return p && encodePuppet(p);
      },
    };
  }

  // ---------- the game ----------

  const api = {
    resize(w, h) {
      size = { w, h };
      layout();
    },
    update(dt) {
      time += dt;
      if (saveIn >= 0) {
        saveIn -= dt;
        if (saveIn < 0) save();
      }
      if (screens[screen]) screens[screen].update(dt);
      else if (screen === 'card') stepLive(cardLive, dt, current);
      else for (const [uid, L] of shelfLive) {
        const p = progress.shelf.find((q) => q && q.uid === uid);
        stepLive(L, dt, p || null);
      }
    },
    draw(ctx) {
      if (screens[screen]) screens[screen].draw(ctx);
      else if (screen === 'card') drawCard(ctx);
      else drawShelf(ctx);
    },
    onPickUp(x, y) {
      unlockAudio();
      if (screens[screen]) return screens[screen].pickUp(x, y);
      return false;
    },
    onDrag(x, y) {
      if (screens[screen]) screens[screen].drag(x, y);
    },
    onDrop(x, y) {
      if (screens[screen]) screens[screen].drop(x, y);
    },
    onTap(x, y) {
      unlockAudio();
      if (screens[screen]) {
        screens[screen].tap(x, y);
        return;
      }
      const b = buttons.find((r) => hit(r, x, y, 4));
      if (screen === 'shelf') {
        if (!b) return;
        if (b.id === 'home') {
          save();
          speech.cancel();
          host.exit();
        } else if (b.id === 'slot') {
          const p = progress.shelf[b.slot];
          if (p) go('card', p);
          else newPuppet(b.slot);
        }
        return;
      }
      // the puppet's own page
      if (confirm) {
        if (b && b.id === 'yes') {
          const slot = slotOf(progress, current.uid);
          removeFromShelf(progress, slot);
          thumbs.delete(current.uid);
          play('unpop');
          save();
          go('shelf');
          return;
        }
        if (b && b.id === 'no') {
          confirm = false;
          layout();
        }
        return;
      }
      if (!b) {
        // poke the puppet
        const V = cardView();
        if (y < V.bottom) {
          talk(cardLive, 0.9);
          poke(cardLive, x > V.cx ? 1 : -1, 0.6);
          babble(G.voiceOf(current), 4);
        }
        return;
      }
      if (b.id === 'back') go('shelf');
      else if (b.id === 'delete') {
        confirm = true;
        layout();
      } else if (b.id === 'edit') go('workshop', current);
      else if (b.id === 'story') go('story', current, { newStory: booksFor(progress, current.uid).length === 0 });
      else if (b.id === 'stage') go('stage', current);
    },
  };

  layout();
  // ?puppet=<slot>&to=<screen> opens a puppet directly (for testing)
  const slot = Number(params.get('puppet'));
  if (params.has('puppet') && progress.shelf[slot]) {
    size = { w: window.innerWidth || 820, h: window.innerHeight || 1180 };
    go(params.get('to') || 'card', progress.shelf[slot]);
  }
  return api;
}

// ---------------------------------------------------------------------------------------------
// Launcher tile: a sock puppet pops up between theatre curtains, chatters and blinks
// ---------------------------------------------------------------------------------------------

let tilePuppet = null;
let tileLive = null;
let tileLast = 0;

function tileSock() {
  const p = createPuppet({ uid: 'tile', name: 'Noodle', shape: 'long', colour: 5, pattern: 'stripes', pcolour: 2 });
  const put = (id, x, y, s = 1, r = 0, c = -1) => p.parts.push({ id, x, y, s, r, back: false, c });
  put('googly', 50, -66, 1.15);
  put('googly', -50, -66, 1.15);
  put('pompom', 0, -4, 1.1, 0, 0);
  put('party-hat', 18, -262, 1, 0.25, 9);
  put('bow-tie', 0, 215, 1, 0, 0);
  return p;
}

function drawTile(ctx, x, y, w, h, time) {
  if (!tilePuppet) {
    tilePuppet = tileSock();
    tileLive = createLive(7);
  }
  const dt = Math.max(0, Math.min(0.05, time - tileLast));
  tileLast = time;
  // chatter now and then
  if (time % 3.2 < dt + 0.0001) talk(tileLive, 1);
  stepLive(tileLive, dt, tilePuppet);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  // backdrop and a spotlight
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#4a1a7a');
  g.addColorStop(1, '#c2368f');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  const cx = x + w / 2;
  const sg = ctx.createRadialGradient(cx, y + h * 0.45, 4, cx, y + h * 0.45, w * 0.5);
  sg.addColorStop(0, 'rgba(255,240,190,0.5)');
  sg.addColorStop(1, 'rgba(255,240,190,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(x, y, w, h);
  // the puppet pops up from below the stage
  const cyc = time % 9;
  const up = cyc < 0.6 ? cyc / 0.6 : cyc > 8.4 ? (9 - cyc) / 0.6 : 1;
  const ease = 1 - Math.pow(1 - up, 3);
  const s = Math.min(w / 520, h / 640);
  const ledge = y + h * 0.84;
  ctx.save();
  ctx.translate(cx, ledge - 120 * s + (1 - ease) * h * 0.9);
  ctx.scale(s, s);
  ctx.rotate(Math.sin(time * 2.2) * 0.06);
  drawPuppet(ctx, tilePuppet, liveAnim(tileLive, s * dprNow(), { mood: 'normal', look: { x: Math.sin(time * 0.9) * 200, y: 40 }, armTo: 900 }));
  ctx.restore();
  // stage front and curtains
  ctx.fillStyle = '#a0522d';
  ctx.fillRect(x, ledge, w, h - (ledge - y));
  ctx.fillStyle = '#c8763d';
  ctx.fillRect(x, ledge, w, Math.max(3, h * 0.03));
  ctx.lineWidth = Math.max(1.5, w * 0.008);
  ctx.strokeStyle = C.ink;
  ctx.beginPath();
  ctx.moveTo(x, ledge);
  ctx.lineTo(x + w, ledge);
  ctx.stroke();
  for (const side of [0, 1]) {
    ctx.save();
    if (side) {
      ctx.translate(x * 2 + w, 0);
      ctx.scale(-1, 1);
    }
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w * 0.2, y);
    ctx.quadraticCurveTo(x + w * 0.1, y + h * 0.5, x + w * 0.16, ledge);
    ctx.lineTo(x, ledge);
    ctx.closePath();
    ctx.fillStyle = C.curtain;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = C.curtainDark;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h * 0.08);
  for (let k = 5; k > 0; k--) ctx.quadraticCurveTo(x + ((k - 0.5) * w) / 5, y + h * 0.15, x + ((k - 1) * w) / 5, y + h * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
