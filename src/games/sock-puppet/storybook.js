// The story maker on screen: a puppet's bookshelf, picking a picture card for each beat, and
// reading the finished storybook (big arrows or a swipe, read aloud where the browser can).
import { C, font, roundRect, outlined, wrap, makeCanvas, star, circle } from './art.js';
import { BEATS, dealCards, makeStory, bookFromPicks, picksOf, addBook, spokenText, isPuppetFriend } from './story.js';
import { drawPlaceStatic, drawPlaceLive, drawEffect, drawCardArt, FLOOR } from './scenes.js';
import { drawFriend, drawThing, drawFriendCard, drawThingCard, FRIEND_H } from './friends.js';
import { drawPuppet } from './draw-puppet.js';
import { SHAPES } from './puppet.js';
import { createLive, stepLive, liveAnim, talk, poseMotion } from './live.js';
import { drawButton, hit } from './ui.js';
import { play, babble } from './sound.js';
import { booksFor, findPuppet } from './save.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const SWIPE = 60;
const BEAT_COLOUR = { place: '#5cb8ff', friend: '#ff8a3d', thing: '#ffd23f', problem: '#ff5f7a', fix: '#8fd14f', ending: '#b388ff' };

export function createStorybook(G) {
  let p = null; // the hero
  let mode = 'books'; // 'books' | 'pick' | 'read'
  let buttons = [];
  let books = [];
  let pickState = null; // { beat, picks, seed, cards, chosen, t }
  let book = null; // { book, story, page, turn }
  let L = createLive(5);
  let pal = null; // a friend puppet's live state
  let gesture = null;
  let auto = true;
  let pageT = 0;
  let sceneCache = { key: '', canvas: null };
  let cardFx = []; // little pops when a card is chosen

  const friendPuppet = (id) => (isPuppetFriend(id) ? findPuppet(G.progress, id.slice(2)) : null);

  // ---------- layout ----------

  function bar() {
    const { w, h } = G.size;
    const pad = clamp(w * 0.02, 8, 16);
    const b = clamp(h * 0.07, 56, 84);
    return { pad, b, icon: b - pad * 0.5 };
  }

  function layout() {
    const { w, h } = G.size;
    const { pad, icon } = bar();
    buttons = [{ id: 'back', icon: 'back', x: pad, y: pad * 0.5, w: icon, h: icon }];
    if (mode === 'books') {
      books = booksFor(G.progress, p.uid);
      const phone = w < 600;
      const cols = phone ? 2 : 3;
      const top = icon + pad * 3 + clamp(h * 0.05, 30, 60);
      const cw = (w - pad * 2) / cols;
      const ch = Math.min(cw * 0.95, (h - top - pad) / Math.ceil((books.length + 1) / cols));
      const items = [{ id: 'new' }, ...books.map((bk) => ({ id: 'book', book: bk }))];
      items.forEach((it, k) => {
        buttons.push({ ...it, x: pad + (k % cols) * cw + 6, y: top + Math.floor(k / cols) * Math.max(ch, cw * 0.8) + 6, w: cw - 12, h: Math.max(ch, cw * 0.8) - 12 });
      });
    } else if (mode === 'pick') {
      const top = icon + pad * 2 + clamp(h * 0.06, 40, 70);
      const bottom = h - pad - clamp(h * 0.09, 64, 100);
      const gw = w - pad * 2;
      const gh = bottom - top;
      const cell = Math.min(gw / 2, gh / 2);
      const x0 = (w - cell * 2) / 2;
      const y0 = top + (gh - cell * 2) / 2;
      pickState.cards.forEach((id, k) => {
        buttons.push({ id: 'card', card: id, x: x0 + (k % 2) * cell + 8, y: y0 + Math.floor(k / 2) * cell + 8, w: cell - 16, h: cell - 16 });
      });
      const ds = clamp(h * 0.08, 60, 90);
      buttons.push({ id: 'redeal', icon: 'dice', x: w / 2 - ds / 2, y: bottom + (h - bottom - ds) / 2, w: ds, h: ds });
    } else {
      const R = readerLayout();
      const as = R.arrow;
      buttons.push({ id: 'prev', icon: 'left', x: pad, y: R.arrowY, w: as, h: as });
      buttons.push({ id: 'next', icon: 'right', x: w - pad - as, y: R.arrowY, w: as, h: as });
      if (G.speech.available) {
        buttons.push({ id: 'speak', icon: 'speaker', x: w - pad - icon, y: pad * 0.5, w: icon, h: icon });
        buttons.push({ id: 'auto', icon: auto ? 'speaker-auto' : 'speaker-off', x: w - pad * 2 - icon * 2, y: pad * 0.5, w: icon, h: icon, on: auto });
      }
      if (book.page === book.story.pages.length - 1) {
        buttons.push({ id: 'again', icon: 'again', x: w / 2 - as * 1.1, y: R.arrowY, w: as, h: as, fill: C.sun });
        buttons.push({ id: 'shelf', icon: 'book', x: w / 2 + as * 0.1, y: R.arrowY, w: as, h: as });
      }
    }
  }

  // The page picture on top, the words under it, arrows along the bottom.
  function readerLayout() {
    const { w, h } = G.size;
    const { pad, b } = bar();
    const arrow = clamp(h * 0.085, 60, 96);
    const arrowY = h - pad - arrow;
    const textH = clamp(h * 0.2, 120, 230);
    const textY = arrowY - pad - textH;
    const picY = b + pad * 0.5;
    const picH = textY - pad - picY;
    return { pic: { x: pad, y: picY, w: w - pad * 2, h: picH }, text: { x: pad, y: textY, w: w - pad * 2, h: textH }, arrow, arrowY };
  }

  // ---------- flow ----------

  function startPicking() {
    const seed = (Math.random() * 1e9) >>> 0;
    pickState = { beat: 0, picks: {}, seed, cards: [], chosen: null, t: 0 };
    deal();
    mode = 'pick';
    layout();
  }

  function deal() {
    const beat = BEATS[pickState.beat];
    const pals = G.progress.shelf.filter((q) => q && q.uid !== p.uid).map((q) => q.uid);
    pickState.cards = dealCards(beat, pickState.seed + pickState.beat * 31 + (pickState.redeals || 0) * 977, pals);
    pickState.chosen = null;
  }

  function choose(id, b) {
    if (pickState.chosen) return;
    pickState.chosen = { id, t: 0, b };
    play('pop');
    talk(L, 0.6);
    cardFx.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, t: 0 });
  }

  function afterChoose() {
    const beat = BEATS[pickState.beat];
    pickState.picks[beat] = pickState.chosen.id;
    pickState.beat++;
    pickState.redeals = 0;
    if (pickState.beat >= BEATS.length) {
      finishStory();
      return;
    }
    deal();
    layout();
  }

  function finishStory() {
    const pal0 = friendPuppet(pickState.picks.friend);
    const bk = bookFromPicks(pickState.picks, pickState.seed, {
      id: `b${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`, uid: p.uid, friendName: pal0 ? pal0.name : '', time: Date.now(),
    });
    G.progress.books = addBook(G.progress.books, bk);
    G.saveSoon();
    play('tada');
    openBook(bk);
  }

  function openBook(bk) {
    const pal0 = friendPuppet(bk.k[1]);
    const story = makeStory(picksOf(bk), bk.s, { name: p.name, friendName: pal0 ? pal0.name : bk.f || 'Sock Pal' });
    book = { book: bk, story, page: 0, turn: 0, dir: 1 };
    pal = pal0 ? createLive(9) : null;
    mode = 'read';
    pageT = 0;
    layout();
    readAloudIfAuto();
  }

  function turn(by) {
    const n = book.story.pages.length;
    const next = book.page + by;
    if (next < 0 || next >= n) {
      play('tap');
      return;
    }
    G.speech.cancel();
    book.page = next;
    book.turn = 0.35;
    book.dir = by;
    pageT = 0;
    play('page');
    layout();
    readAloudIfAuto();
  }

  function readAloud() {
    const pg = book.story.pages[book.page];
    const text = spokenText(pg);
    const ok = G.speech.speak(text, { rate: 0.88, pitch: 1.15 });
    if (ok) talk(L, Math.min(6, text.length * 0.055));
  }

  function readAloudIfAuto() {
    if (auto && G.speech.available) readAloud();
  }

  // ---------- drawing a page ----------

  function sceneImage(id, w, h) {
    const dpr = G.dpr();
    const key = `${id}|${Math.round(w)}|${Math.round(h)}|${dpr}`;
    if (sceneCache.key !== key) {
      const c = makeCanvas(w * dpr, h * dpr);
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      drawPlaceStatic(g, id, w, h);
      sceneCache = { key, canvas: c };
    }
    return sceneCache.canvas;
  }

  // The puppet standing at (x, floor) with its head `size` px wide, in a story pose.
  function drawHero(ctx, puppet, live, x, floorY, size, pose, t, facing = 1) {
    const sh = SHAPES[puppet.sock.shape];
    const s = size / 300;
    const mo = poseMotion(pose, t);
    ctx.save();
    // the cuff sits on the floor line; the arm carries on down out of the picture
    ctx.translate(x, floorY + mo.bob * s);
    ctx.scale(s * facing, s);
    ctx.rotate(mo.lean);
    ctx.translate(0, -sh.cuffBottom + 20);
    const look = mo.look || { x: 260 * facing, y: -40 };
    drawPuppet(ctx, puppet, liveAnim(live, s * G.dpr(), { mood: mo.mood, wave: mo.wave, mouth: mo.mouth, look, armTo: sh.cuffBottom + 600 }));
    ctx.restore();
  }

  function drawPage(ctx, P, pg, t) {
    ctx.save();
    roundRect(ctx, P.x, P.y, P.w, P.h, 22);
    ctx.clip();
    ctx.translate(P.x, P.y);
    const { w, h } = P;
    ctx.drawImage(sceneImage(pg.scene, w, h), 0, 0, w, h);
    drawPlaceLive(ctx, pg.scene, w, h, t);
    const floor = h * FLOOR;
    const layered = pg.effect === 'hot-air-balloon' || pg.effect === 'boat';
    const thingDraw = (g, size) => drawThing(g, pg.thing, size, t);
    if (layered) drawEffect(ctx, pg.effect, w, h, t, { layer: 'back', drawThing: thingDraw });
    const unit = Math.min(w, h * 1.1);
    // puppets are sized so a tall hat still fits under the top of the page
    const ps = (k) => Math.min(unit * k, h * 0.29);
    // the friend on the right
    if (pg.showFriend) {
      const fp = friendPuppet(pg.friend);
      if (fp) drawHero(ctx, fp, pal || L, w * 0.73, floor, ps(0.28), pg.friendPose, t + 0.7, 1);
      else if (!isPuppetFriend(pg.friend)) {
        const fs = (unit * 0.42) / FRIEND_H;
        ctx.save();
        ctx.translate(w * 0.73, floor);
        ctx.scale(fs, fs);
        drawFriend(ctx, pg.friend, { t: t + 0.7, pose: pg.friendPose, blink: L.blink > 0 ? 1 : 0 });
        ctx.restore();
      } else {
        // a puppet friend who's gone from the shelf: a plain sock stands in
        drawHero(ctx, G.standIn(), L, w * 0.73, floor, ps(0.28), pg.friendPose, t + 0.7, 1);
      }
    }
    // the thing in the middle
    if (pg.showThing && pg.effect !== 'runaway' && pg.effect !== 'sparkles') {
      ctx.save();
      ctx.translate(w * 0.5, floor - unit * 0.1 + Math.sin(t * 2) * 4);
      drawThing(ctx, pg.thing, unit * 0.22, t);
      ctx.restore();
    }
    // the hero on the left (in the middle on the title page)
    const hx = pg.beat === 'title' || (pg.beat === 'place') ? w * 0.36 : w * 0.28;
    drawHero(ctx, p, L, hx, floor, pg.beat === 'title' ? Math.min(unit * 0.3, h * 0.22) : ps(0.3), pg.pose, t, 1);
    if (pg.effect) drawEffect(ctx, pg.effect, w, h, t, { layer: layered ? 'front' : undefined, drawThing: thingDraw });
    if (pg.beat === 'title') {
      // the title across the top
      ctx.fillStyle = 'rgba(30,10,60,0.35)';
      roundRect(ctx, w * 0.05, h * 0.05, w * 0.9, h * 0.2, 18);
      ctx.fill();
      const lines = splitTitle(ctx, book.story.title, w * 0.82, h * 0.085);
      lines.forEach((ln, k) => outlined(ctx, ln, w / 2, h * 0.15 + (k - (lines.length - 1) / 2) * h * 0.085, h * 0.075, C.sun, w * 0.84));
    }
    if (pg.ending) {
      const k = clamp(t / 0.6, 0, 1);
      ctx.save();
      ctx.translate(w / 2, h * 0.16);
      ctx.scale(0.4 + k * 0.6, 0.4 + k * 0.6);
      ctx.rotate(Math.sin(t * 2) * 0.04);
      ctx.fillStyle = '#ff4f7a';
      roundRect(ctx, -w * 0.25, -h * 0.07, w * 0.5, h * 0.14, h * 0.07);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      outlined(ctx, 'The End', 0, 2, h * 0.08, '#ffffff', w * 0.45);
      for (const sx of [-1, 1]) {
        star(ctx, sx * w * 0.29, 0, h * 0.045);
        ctx.fillStyle = C.sun;
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
    roundRect(ctx, P.x, P.y, P.w, P.h, 22);
    ctx.lineWidth = 5;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  }

  function splitTitle(ctx, title, maxW, px) {
    ctx.font = font(px);
    if (ctx.measureText(title).width <= maxW) return [title];
    return wrap(ctx, title, maxW).slice(0, 2);
  }

  function drawWords(ctx, T, text) {
    ctx.fillStyle = '#fffaf0';
    roundRect(ctx, T.x, T.y, T.w, T.h, 22);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    // the biggest size that fits
    let px = clamp(T.h * 0.24, 20, 40);
    let lines;
    for (;;) {
      ctx.font = font(px, 800);
      lines = wrap(ctx, text, T.w - 36);
      if (lines.length * px * 1.25 <= T.h - 20 || px <= 14) break;
      px -= 1;
    }
    ctx.fillStyle = C.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const y0 = T.y + T.h / 2 - ((lines.length - 1) * px * 1.25) / 2;
    lines.forEach((ln, k) => ctx.fillText(ln, T.x + T.w / 2, y0 + k * px * 1.25));
  }

  // ---------- the other screens ----------

  function drawBooks(ctx) {
    const { w, h } = G.size;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3a1a6a');
    g.addColorStop(1, '#7a2fa2');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const { pad, icon } = bar();
    // the hero, peeking over the top right
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, icon + pad * 2.5 + clamp(h * 0.05, 30, 60));
    ctx.clip();
    const s = (icon * 2.2) / 300;
    ctx.translate(w - icon * 1.4 - pad, icon * 1.2 + pad);
    ctx.scale(s, s);
    drawPuppet(ctx, p, liveAnim(L, s * G.dpr(), { mood: 'happy', wave: 0.6, armTo: 700 }));
    ctx.restore();
    outlined(ctx, `${p.name}'s Stories`.replace(/s's /, "s' "), w / 2 - icon * 0.6, icon / 2 + pad * 0.5, Math.min(icon * 0.55, w / 14), C.sun, w - icon * 4.5);
    for (const b of buttons) {
      if (b.id === 'new') drawNewBook(ctx, b);
      else if (b.id === 'book') drawBookCover(ctx, b);
      else drawButton(ctx, b, G.time);
    }
  }

  function drawNewBook(ctx, b) {
    const bob = Math.sin(G.time * 3) * 3;
    ctx.fillStyle = 'rgba(20,8,40,0.35)';
    roundRect(ctx, b.x, b.y + 6, b.w, b.h, 18);
    ctx.fill();
    ctx.fillStyle = C.sun;
    roundRect(ctx, b.x, b.y + bob, b.w, b.h, 18);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    const s = Math.min(b.w, b.h);
    drawButton(ctx, { x: b.x + b.w / 2 - s * 0.28, y: b.y + b.h / 2 - s * 0.3 + bob, w: s * 0.56, h: s * 0.56, icon: 'book', fill: '#ffffff' }, G.time);
    drawButton(ctx, { x: b.x + b.w / 2 + s * 0.12, y: b.y + b.h / 2 + s * 0.06 + bob, w: s * 0.3, h: s * 0.3, icon: 'plus', fill: '#2fbf5b', round: true }, G.time);
  }

  const covers = new Map(); // book id -> canvas

  function drawBookCover(ctx, b) {
    const bk = b.book;
    const key = `${bk.id}|${Math.round(b.w)}|${Math.round(b.h)}`;
    let c = covers.get(key);
    if (!c) {
      // a still picture of the place with the hero and the friend
      const dpr = G.dpr();
      c = makeCanvas(b.w * dpr, b.h * dpr);
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      drawPlaceStatic(g, bk.k[0], b.w, b.h);
      drawPlaceLive(g, bk.k[0], b.w, b.h, 1);
      const floor = b.h * FLOOR;
      const unit = Math.min(b.w, b.h * 1.1);
      if (!isPuppetFriend(bk.k[1])) {
        const fs = (unit * 0.4) / FRIEND_H;
        g.save();
        g.translate(b.w * 0.72, floor);
        g.scale(fs, fs);
        drawFriend(g, bk.k[1], { t: 0.5, pose: 'wave' });
        g.restore();
      } else {
        const fp = friendPuppet(bk.k[1]) || G.standIn();
        drawHero(g, fp, createLive(2), b.w * 0.72, floor, Math.min(unit * 0.26, b.h * 0.27), 'wave', 0.3, 1);
      }
      drawHero(g, p, createLive(1), b.w * 0.3, floor, Math.min(unit * 0.28, b.h * 0.28), 'wave', 0.2, 1);
      covers.set(key, c);
    }
    ctx.fillStyle = 'rgba(20,8,40,0.35)';
    roundRect(ctx, b.x, b.y + 6, b.w, b.h, 18);
    ctx.fill();
    ctx.save();
    roundRect(ctx, b.x, b.y, b.w, b.h, 18);
    ctx.clip();
    ctx.drawImage(c, b.x, b.y, b.w, b.h);
    // a book's spine down the left
    ctx.fillStyle = BEAT_COLOUR[BEATS[(bk.s % 6)]];
    ctx.fillRect(b.x, b.y, b.w * 0.07, b.h);
    ctx.restore();
    roundRect(ctx, b.x, b.y, b.w, b.h, 18);
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  }

  function drawPick(ctx) {
    const { w, h } = G.size;
    const beat = BEATS[pickState.beat] || 'ending';
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2b1055');
    g.addColorStop(1, BEAT_COLOUR[beat]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const { pad, icon } = bar();
    // the beats so far: a row of dots, the picked ones filled with their picture
    const n = BEATS.length;
    const ds = Math.min(icon * 0.9, (w - icon * 2 - pad * 4) / n - 8);
    const x0 = w / 2 - (n * (ds + 8)) / 2 + 4;
    BEATS.forEach((bt, k) => {
      const x = x0 + k * (ds + 8);
      const y = pad * 0.5 + (icon - ds) / 2;
      ctx.save();
      roundRect(ctx, x, y, ds, ds, ds * 0.25);
      ctx.fillStyle = k === pickState.beat ? '#ffffff' : 'rgba(255,255,255,0.25)';
      ctx.fill();
      const id = pickState.picks[bt];
      if (id) {
        ctx.clip();
        ctx.translate(x, y);
        drawCard(ctx, bt, id, ds, ds, G.time, true);
      }
      ctx.restore();
      roundRect(ctx, x, y, ds, ds, ds * 0.25);
      ctx.lineWidth = k === pickState.beat ? 4 : 2.5;
      ctx.strokeStyle = k === pickState.beat ? C.sun : C.ink;
      ctx.stroke();
    });
    // the hero, small, cheering the picks on
    ctx.save();
    const s = (icon * 1.6) / 300;
    ctx.beginPath();
    ctx.rect(0, h - icon * 1.9, w, icon * 1.9);
    ctx.clip();
    ctx.translate(pad + icon * 0.9, h - icon * 0.95);
    ctx.scale(s, s);
    drawPuppet(ctx, p, liveAnim(L, s * G.dpr(), { mood: 'happy', wave: pickState.chosen ? 1 : 0.3, armTo: 800 }));
    ctx.restore();
    for (const b of buttons) {
      if (b.id !== 'card') {
        drawButton(ctx, b, G.time);
        continue;
      }
      const ch = pickState.chosen;
      let k = 1;
      let dy = Math.sin(G.time * 2 + b.x * 0.01) * 3;
      let alpha = 1;
      if (ch) {
        if (ch.id === b.card) {
          k = 1 + Math.sin(Math.min(1, ch.t / 0.5) * Math.PI) * 0.12;
          dy = 0;
        } else alpha = Math.max(0.15, 1 - ch.t * 3);
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(b.x + b.w / 2, b.y + b.h / 2 + dy);
      ctx.scale(k, k);
      ctx.translate(-b.w / 2, -b.h / 2);
      ctx.fillStyle = 'rgba(20,8,40,0.4)';
      roundRect(ctx, 0, 7, b.w, b.h, 20);
      ctx.fill();
      ctx.save();
      roundRect(ctx, 0, 0, b.w, b.h, 20);
      ctx.clip();
      drawCard(ctx, beat, b.card, b.w, b.h, G.time, false);
      ctx.restore();
      roundRect(ctx, 0, 0, b.w, b.h, 20);
      ctx.lineWidth = 6;
      ctx.strokeStyle = ch && ch.id === b.card ? C.sun : '#ffffff';
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = C.ink;
      roundRect(ctx, -3, -3, b.w + 6, b.h + 6, 22);
      ctx.stroke();
      ctx.restore();
    }
    for (const f of cardFx) {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const r = 30 + f.t * 260;
        star(ctx, f.x + Math.cos(a) * r, f.y + Math.sin(a) * r, 12 * (1 - f.t));
        ctx.fillStyle = C.sun;
        ctx.fill();
      }
    }
  }

  // The picture on a card (small = the little one in the beats row).
  function drawCard(ctx, beat, id, w, h, t, small) {
    if (beat === 'friend') {
      const fp = friendPuppet(id);
      if (fp || isPuppetFriend(id)) {
        ctx.fillStyle = '#ffe1f0';
        ctx.fillRect(0, 0, w, h);
        for (let k = 0; k < 8; k++) {
          ctx.fillStyle = k % 2 ? '#ffc8e2' : '#ffe1f0';
          ctx.beginPath();
          ctx.moveTo(w / 2, h * 0.6);
          ctx.arc(w / 2, h * 0.6, w * 1.2, (k / 8) * Math.PI * 2 + t * 0.2, ((k + 1) / 8) * Math.PI * 2 + t * 0.2);
          ctx.fill();
        }
        const q = fp || G.standIn();
        drawHero(ctx, q, small ? L : (pal || (pal = createLive(9))), w / 2, h * 1.02, Math.min(w, h) * 0.36, 'wave', t, 1);
      } else drawFriendCard(ctx, id, w, h, t);
    } else if (beat === 'thing') drawThingCard(ctx, id, w, h, t);
    else drawCardArt(ctx, beat, id, w, h, t);
  }

  function drawRead(ctx) {
    const { w, h } = G.size;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3a1a6a');
    g.addColorStop(1, '#a8366f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const R = readerLayout();
    const pg = book.story.pages[book.page];
    ctx.save();
    if (book.turn > 0) {
      // the new page slides in
      const u = book.turn / 0.35;
      ctx.translate(book.dir * u * u * w * 0.6, 0);
      ctx.globalAlpha = 1 - u * 0.6;
    }
    if (gesture && gesture.kind === 'swipe') ctx.translate((gesture.x - gesture.x0) * 0.5, 0);
    drawPage(ctx, R.pic, pg, pageT);
    ctx.restore();
    drawWords(ctx, R.text, pg.text);
    // page dots
    const n = book.story.pages.length;
    const dot = 10;
    const dx = w / 2 - ((n - 1) * dot * 2.4) / 2;
    if (book.page < n - 1) {
      for (let k = 0; k < n; k++) {
        circle(ctx, dx + k * dot * 2.4, R.arrowY + R.arrow / 2, k === book.page ? dot : dot * 0.6);
        ctx.fillStyle = k === book.page ? C.sun : 'rgba(255,255,255,0.5)';
        ctx.fill();
      }
    }
    for (const b of buttons) {
      if (b.id === 'prev' && book.page === 0) continue;
      if (b.id === 'next' && book.page === n - 1) continue;
      if (b.id === 'speak') drawButton(ctx, { ...b, on: G.speech.speaking }, G.time);
      else drawButton(ctx, b, G.time);
    }
  }

  return {
    enter(puppet, opts = {}) {
      p = puppet;
      L = createLive(puppet.uid.length * 3);
      covers.clear();
      mode = 'books';
      book = null;
      pickState = null;
      if (opts.book) {
        const bk = G.progress.books.find((b) => b.id === opts.book);
        if (bk) openBook(bk);
      } else if (opts.newStory) startPicking();
      layout();
    },
    leave() {
      G.speech.cancel();
      gesture = null;
    },
    layout,
    update(dt) {
      stepLive(L, dt, p);
      if (pal) stepLive(pal, dt, friendPuppet(book?.book.k[1] || '') || null);
      pageT += dt;
      if (book && book.turn > 0) book.turn = Math.max(0, book.turn - dt);
      cardFx = cardFx.filter((f) => (f.t += dt * 1.6) < 1);
      if (mode === 'pick' && pickState.chosen) {
        pickState.chosen.t += dt;
        if (pickState.chosen.t > 0.7) afterChoose();
      }
    },
    draw(ctx) {
      if (mode === 'books') drawBooks(ctx);
      else if (mode === 'pick') drawPick(ctx);
      else drawRead(ctx);
    },
    pickUp(x, y) {
      if (mode !== 'read') return false;
      if (buttons.some((b) => hit(b, x, y, 6))) return false;
      const R = readerLayout();
      if (!hit(R.pic, x, y) && !hit(R.text, x, y)) return false;
      gesture = { kind: 'swipe', x0: x, y0: y, x, y };
      return true;
    },
    drag(x, y) {
      if (gesture) {
        gesture.x = x;
        gesture.y = y;
      }
    },
    drop(x, y) {
      if (!gesture) return;
      const dx = x - gesture.x0;
      const dy = y - gesture.y0;
      gesture = null;
      if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy)) turn(dx < 0 ? 1 : -1);
      else if (Math.hypot(dx, dy) < 14) {
        // a tap on the picture: the puppet chatters
        talk(L, 0.8);
        babble(G.voiceOf(p), 4);
      }
    },
    tap(x, y) {
      const b = buttons.find((r) => hit(r, x, y, 6));
      if (!b) return;
      if (b.id === 'back') {
        G.speech.cancel();
        if (mode === 'books') G.go('card', p);
        else {
          mode = 'books';
          book = null;
          pickState = null;
          layout();
        }
      } else if (b.id === 'new') startPicking();
      else if (b.id === 'book') openBook(b.book);
      else if (b.id === 'card') choose(b.card, b);
      else if (b.id === 'redeal') {
        pickState.redeals = (pickState.redeals || 0) + 1;
        deal();
        play('dice');
        layout();
      } else if (b.id === 'prev') turn(-1);
      else if (b.id === 'next') turn(1);
      else if (b.id === 'speak') readAloud();
      else if (b.id === 'auto') {
        auto = !auto;
        G.setAutoRead(auto);
        if (!auto) G.speech.cancel();
        layout();
      } else if (b.id === 'again') {
        G.speech.cancel();
        book.page = 0;
        pageT = 0;
        book.turn = 0.35;
        book.dir = -1;
        layout();
        readAloudIfAuto();
      } else if (b.id === 'shelf') {
        G.speech.cancel();
        mode = 'books';
        book = null;
        layout();
      }
    },
    setAuto(v) {
      auto = v;
    },
    debug: {
      mode: () => mode,
      buttons: () => buttons.map((b) => ({ ...b, book: b.book ? b.book.id : undefined })),
      pick: () => pickState && { beat: BEATS[pickState.beat], picks: { ...pickState.picks }, cards: pickState.cards.slice() },
      choose(id) {
        const b = buttons.find((r) => r.id === 'card' && r.card === id) || { x: 0, y: 0, w: 1, h: 1 };
        choose(id, b);
        pickState.chosen.t = 1;
        afterChoose();
      },
      book: () => book && { id: book.book.id, page: book.page, pages: book.story.pages.map((q) => ({ ...q })), title: book.story.title },
      page: (n) => {
        if (book) {
          book.page = clamp(n, 0, book.story.pages.length - 1);
          book.turn = 0;
          pageT = 0;
          layout();
        }
      },
      open: (picks, seed) => {
        const pal0 = friendPuppet(picks.friend);
        const bk = bookFromPicks(picks, seed, { id: `dbg${seed}`, uid: p.uid, friendName: pal0 ? pal0.name : '', time: Date.now() });
        openBook(bk);
      },
      reader: () => readerLayout(),
      seek: (t) => {
        pageT = t;
      },
    },
  };
}

