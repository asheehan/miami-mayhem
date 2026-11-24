// The puppet stage: a little theatre with curtains, a backdrop, props to drag about, the puppet
// (and a friend from the shelf) to drag and tap so they talk, and recording a show of up to
// 30 seconds to play back. Only finger movements are recorded, never sound.
import { C, roundRect, makeCanvas, circle } from './art.js';
import { STAGE_BACKDROPS, STAGE_PROPS } from './world.js';
import { drawPlaceStatic, drawPlaceLive } from './scenes.js';
import { drawThing } from './friends.js';
import { drawPuppet } from './draw-puppet.js';
import { SHAPES, hitTest } from './puppet.js';
import { createLive, stepLive, liveAnim, talk, poke } from './live.js';
import {
  STAGE_W, STAGE_H, SHOW_MAX, startRecording, recordMove, recordTap, tickRecording, finishRecording, positionsAt,
  tapsBetween, createBody, stepBody,
} from './show.js';
import { drawButton, hit } from './ui.js';
import { play, babble } from './sound.js';
import { keepShow, findPuppet } from './save.js';

const PS = 0.6; // stage units per puppet unit
const PROP_SIZE = 150;
const LEDGE_Y = 590; // the front of the stage hides everything below this
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const TAP_MOVE = 12;

export function createStage(G) {
  let p = null;
  let actors = []; // { kind: 'puppet', puppet, live, body, tx, ty } | { kind: 'prop', id, x, y }
  let setup = { backdrop: 'beach', pal: null, props: [] };
  let buttons = [];
  let box = { x: 0, y: 0, w: 1, h: 1, s: 1 };
  let drag = null;
  let rec = null; // recording
  let recT = 0;
  let show = null; // { show, t, ended }
  let curtain = 0; // 0 shut .. 1 open
  let curtainTo = 1;
  let picker = null; // choosing a friend: { buttons }
  let order = []; // draw order of puppets (last on top)
  let sceneCache = { key: '', canvas: null };
  const memShows = new Map(); // uid -> show that didn't fit the save

  const toStage = (x, y) => ({ x: (x - box.x) / box.s, y: (y - box.y) / box.s });
  const puppetsOf = () => actors.filter((a) => a.kind === 'puppet');

  // ---------- setting up ----------

  function makeActors(su, positions = null) {
    setup = { backdrop: su.backdrop, pal: su.pal, props: su.props.slice() };
    const list = [];
    const main = { kind: 'puppet', puppet: p, live: createLive(4), voice: G.voiceOf(p) };
    list.push(main);
    const palP = setup.pal ? findPuppet(G.progress, setup.pal) : null;
    if (setup.pal && !palP) setup.pal = null;
    if (palP) list.push({ kind: 'puppet', puppet: palP, live: createLive(11), voice: G.voiceOf(palP) });
    setup.props.forEach((id) => list.push({ kind: 'prop', id }));
    // where things start
    list.forEach((a, i) => {
      const pos = positions?.[i];
      if (a.kind === 'puppet') {
        const x = pos ? pos.x : i === 0 ? (palP ? 300 : 500) : 700;
        const y = pos ? pos.y : 330;
        a.body = createBody(x, y);
        a.tx = x;
        a.ty = y;
      } else {
        const k = i - (palP ? 2 : 1);
        a.x = pos ? pos.x : [150, 860, 500, 330][k % 4];
        a.y = pos ? pos.y : [480, 470, 200, 160][k % 4];
      }
    });
    actors = list;
    order = puppetsOf();
  }

  function positions() {
    return actors.map((a) => (a.kind === 'puppet' ? { x: a.tx, y: a.ty } : { x: a.x, y: a.y }));
  }

  // ---------- layout ----------

  function layout() {
    const { w, h } = G.size;
    const pad = clamp(w * 0.02, 8, 16);
    const bar = clamp(h * 0.07, 56, 84);
    const icon = bar - pad * 0.5;
    const top = bar + pad;
    const bottomBar = clamp(h * 0.1, 70, 110);
    const aw = w - pad * 2;
    const ah = h - top - bottomBar - pad;
    const s = Math.min(aw / STAGE_W, ah / STAGE_H);
    // the stage and its show buttons sit together in the middle
    const groupH = STAGE_H * s + pad * 2 + bottomBar;
    const gy = top + Math.max(0, (h - top - groupH) / 2);
    box = { s, w: STAGE_W * s, h: STAGE_H * s, x: (w - STAGE_W * s) / 2, y: gy };
    buttons = [
      { id: 'back', icon: 'back', x: pad, y: pad * 0.5, w: icon, h: icon },
      { id: 'backdrop', icon: 'backdrop', x: w - pad - icon * 3 - pad * 2, y: pad * 0.5, w: icon, h: icon },
      { id: 'prop', icon: 'plus', x: w - pad - icon * 2 - pad, y: pad * 0.5, w: icon, h: icon, fill: '#ffd23f' },
      { id: 'pal', icon: 'sock', x: w - pad - icon, y: pad * 0.5, w: icon, h: icon, colour: setup.pal ? '#ff6fb1' : '#8fd14f' },
    ];
    // the show controls, big, under the stage
    const bs = Math.min(bottomBar - pad, 96);
    const by = Math.min(h - pad - bs, box.y + box.h + pad * 2 + 14);
    const recording = !!rec;
    const playing = !!show;
    const have = !!currentShow();
    if (playing) buttons.push({ id: 'stop-show', icon: 'stop', x: w / 2 - bs / 2, y: by, w: bs, h: bs, round: true });
    else if (recording) buttons.push({ id: 'stop-rec', icon: 'stop', x: w / 2 - bs / 2, y: by, w: bs, h: bs, round: true, fill: '#ffb3bd' });
    else {
      buttons.push({ id: 'record', icon: 'record', x: w / 2 - bs - pad, y: by, w: bs, h: bs, round: true });
      buttons.push({ id: 'play', icon: 'play', x: w / 2 + pad, y: by, w: bs, h: bs, round: true, fill: have ? '#ffffff' : '#c9c0d6' });
    }
    if (picker) layoutPicker();
  }

  function layoutPicker() {
    const { w, h } = G.size;
    const pals = G.progress.shelf.filter((q) => q && q.uid !== p.uid);
    const cols = 3;
    const cell = Math.min((w * 0.86) / cols, 180);
    const rows = Math.ceil((pals.length + 1) / cols);
    const x0 = w / 2 - (cols * cell) / 2;
    const y0 = h / 2 - (rows * cell) / 2;
    const items = [{ id: 'pick-none' }, ...pals.map((q) => ({ id: 'pick-pal', uid: q.uid }))];
    picker.buttons = items.map((it, k) => ({ ...it, x: x0 + (k % cols) * cell + 6, y: y0 + Math.floor(k / cols) * cell + 6, w: cell - 12, h: cell - 12 }));
  }

  function currentShow() {
    return memShows.get(p.uid) || G.progress.shows[p.uid] || null;
  }

  // ---------- recording and shows ----------

  function startRec() {
    rec = startRecording(positions(), { ...setup, props: setup.props.slice() });
    recT = 0;
    play('tap');
    layout();
  }

  function stopRec() {
    if (!rec) return;
    const s = finishRecording(rec);
    rec = null;
    if (s.e.length) {
      memShows.set(p.uid, s);
      if (keepShow(G.progress, p.uid, s)) {
        memShows.delete(p.uid);
        G.saveSoon();
      }
    }
    play('tada');
    layout();
  }

  function startShow() {
    const s = currentShow();
    if (!s) {
      play('unpop');
      return;
    }
    const su = s.s && s.s.backdrop ? s.s : setup;
    makeActors({ backdrop: STAGE_BACKDROPS.includes(su.backdrop) ? su.backdrop : 'beach', pal: su.pal || null, props: (su.props || []).filter((id) => STAGE_PROPS.includes(id)) }, s.a.map(([x, y]) => ({ x, y })));
    // a show is only replayable as recorded if its cast still fits
    if (actors.length !== s.a.length) makeActors({ backdrop: setup.backdrop, pal: null, props: [] }, null);
    show = { show: s, t: -0.9, last: -1 };
    curtain = 0;
    curtainTo = 0;
    play('curtain');
    layout();
  }

  function stopShow() {
    show = null;
    curtainTo = 1;
    layout();
  }

  // ---------- drawing ----------

  function scene(w, h) {
    const dpr = G.dpr();
    const key = `${setup.backdrop}|${Math.round(w)}|${Math.round(h)}|${dpr}`;
    if (sceneCache.key !== key) {
      const c = makeCanvas(w * dpr, h * dpr);
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      drawPlaceStatic(g, setup.backdrop, w, h);
      sceneCache = { key, canvas: c };
    }
    return sceneCache.canvas;
  }

  function drawStageBox(ctx) {
    const { x, y, w, h, s } = box;
    // the theatre frame
    ctx.fillStyle = '#5a2a1a';
    roundRect(ctx, x - 14, y - 14, w + 28, h + 28, 20);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(scene(w, h * (LEDGE_Y / STAGE_H) + 30), x, y, w, h * (LEDGE_Y / STAGE_H) + 30);
    ctx.save();
    ctx.translate(x, y);
    drawPlaceLive(ctx, setup.backdrop, w, h * (LEDGE_Y / STAGE_H) + 30, G.time);
    ctx.restore();
    ctx.translate(x, y);
    ctx.scale(s, s);
    // props, then puppets
    for (const a of actors) {
      if (a.kind !== 'prop') continue;
      ctx.save();
      ctx.translate(a.x, a.y);
      drawThing(ctx, a.id, PROP_SIZE, G.time);
      ctx.restore();
    }
    for (const a of order) {
      const sh = SHAPES[a.puppet.sock.shape];
      const b = a.body;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.scale(PS, PS);
      // lean and squash about the wrist
      ctx.translate(0, sh.cuffBottom);
      ctx.rotate(b.lean + a.live.sway * 0.08);
      ctx.scale(1 - b.squash * 0.6, 1 + b.squash);
      ctx.translate(0, -sh.cuffBottom + a.live.bob * 0.4);
      const facing = order.length > 1 ? (a === order[0] ? { x: 400, y: -30 } : { x: -400, y: -30 }) : null;
      drawPuppet(ctx, a.puppet, liveAnim(a.live, s * PS * G.dpr(), { mood: 'happy', armTo: (STAGE_H + 60 - b.y) / PS, look: a.live.look || facing }));
      ctx.restore();
    }
    // the front of the stage
    ctx.fillStyle = '#a0522d';
    ctx.fillRect(0, LEDGE_Y, STAGE_W, STAGE_H - LEDGE_Y);
    ctx.fillStyle = '#c8763d';
    ctx.fillRect(0, LEDGE_Y, STAGE_W, 22);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, LEDGE_Y);
    ctx.lineTo(STAGE_W, LEDGE_Y);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(40,10,0,0.35)';
    for (let k = 1; k < 6; k++) {
      ctx.beginPath();
      ctx.moveTo((k * STAGE_W) / 6, LEDGE_Y + 22);
      ctx.lineTo((k * STAGE_W) / 6, STAGE_H);
      ctx.stroke();
    }
    // gold stars along the front
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = C.sun;
      circle(ctx, 100 + k * 200, LEDGE_Y + 60, 12);
      ctx.fill();
    }
    drawCurtains(ctx);
    ctx.restore();
    ctx.lineWidth = 5;
    ctx.strokeStyle = C.ink;
    roundRect(ctx, x - 14, y - 14, w + 28, h + 28, 20);
    ctx.stroke();
  }

  // In stage units: the side curtains (gathered back by `curtain`) and the scalloped top.
  function drawCurtains(ctx) {
    const open = curtain;
    const half = STAGE_W / 2;
    const width = 90 + (half - 90) * (1 - open);
    for (const side of [-1, 1]) {
      ctx.save();
      if (side > 0) {
        ctx.translate(STAGE_W, 0);
        ctx.scale(-1, 1);
      }
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width + 20, 0);
      ctx.quadraticCurveTo(width * (open > 0.5 ? 0.55 : 0.95), STAGE_H * 0.55, width * (open > 0.5 ? 0.8 : 1), STAGE_H);
      ctx.lineTo(0, STAGE_H);
      ctx.closePath();
      ctx.fillStyle = C.curtain;
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = C.curtainDark;
      ctx.lineWidth = 10;
      for (let k = 1; k < 5; k++) {
        ctx.beginPath();
        ctx.moveTo((width * k) / 5, 0);
        ctx.quadraticCurveTo((width * k) / 5.6, STAGE_H * 0.55, (width * k) / 5 * 0.9, STAGE_H);
        ctx.stroke();
      }
      ctx.restore();
      ctx.lineWidth = 5;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      // the tie-back
      if (open > 0.5) {
        ctx.fillStyle = C.gold;
        roundRect(ctx, 0, STAGE_H * 0.55, width * 0.75, 18, 9);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(STAGE_W, 0);
    ctx.lineTo(STAGE_W, 60);
    const n = 8;
    for (let k = n; k > 0; k--) ctx.quadraticCurveTo(((k - 0.5) * STAGE_W) / n, 120, ((k - 1) * STAGE_W) / n, 60);
    ctx.closePath();
    ctx.fillStyle = C.curtainDark;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.fillStyle = C.gold;
    for (let k = 0; k < n; k++) {
      circle(ctx, ((k + 0.5) * STAGE_W) / n, 92, 9);
      ctx.fill();
    }
  }

  function drawPicker(ctx) {
    const { w, h } = G.size;
    ctx.fillStyle = 'rgba(30,10,60,0.8)';
    ctx.fillRect(0, 0, w, h);
    for (const b of picker.buttons) {
      ctx.fillStyle = b.uid && b.uid === setup.pal ? C.sun : '#fff2d6';
      roundRect(ctx, b.x, b.y, b.w, b.h, 18);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      if (b.id === 'pick-none') drawButton(ctx, { x: b.x + b.w * 0.2, y: b.y + b.h * 0.2, w: b.w * 0.6, h: b.h * 0.6, icon: 'cross', fill: '#ff4d6d', round: true }, G.time);
      else {
        const q = findPuppet(G.progress, b.uid);
        if (q) ctx.drawImage(G.thumb(q, b.w), b.x, b.y, b.w, b.h);
      }
    }
  }

  // ---------- input helpers ----------

  function actorAt(sx, sy) {
    const pt = toStage(sx, sy);
    for (let k = order.length - 1; k >= 0; k--) {
      const a = order[k];
      const lx = (pt.x - a.body.x) / PS;
      const ly = (pt.y - a.body.y) / PS;
      if (hitTest(a.puppet, lx, ly) && ly < SHAPES[a.puppet.sock.shape].cuffBottom + 40) return a;
    }
    for (let k = actors.length - 1; k >= 0; k--) {
      const a = actors[k];
      if (a.kind === 'prop' && Math.abs(pt.x - a.x) < PROP_SIZE * 0.55 && Math.abs(pt.y - a.y) < PROP_SIZE * 0.55) return a;
    }
    return null;
  }

  function sayHello(a) {
    talk(a.live, 0.9);
    poke(a.live, 1, 0.4);
    babble(a.voice, 4 + Math.floor(Math.random() * 3));
  }

  return {
    enter(puppet) {
      p = puppet;
      const s = currentShow();
      const su = s && s.s && s.s.backdrop ? s.s : { backdrop: 'beach', pal: null, props: ['treasure-chest', 'palm'] };
      makeActors({ backdrop: su.backdrop, pal: su.pal, props: (su.props || []).filter((id) => STAGE_PROPS.includes(id)) });
      rec = null;
      show = null;
      picker = null;
      curtain = 0;
      curtainTo = 1;
      play('curtain');
      layout();
    },
    leave() {
      if (rec) stopRec();
      show = null;
      drag = null;
    },
    layout,
    update(dt) {
      curtain += (curtainTo - curtain) * Math.min(1, dt * 3.5);
      if (rec) {
        recT += dt;
        if (drag && drag.a.kind === 'puppet') recordMove(rec, recT, actors.indexOf(drag.a), drag.a.tx, drag.a.ty);
        else if (drag) recordMove(rec, recT, actors.indexOf(drag.a), drag.a.x, drag.a.y);
        if (!tickRecording(rec, recT)) stopRec();
      }
      if (show) {
        show.t += dt;
        if (show.t >= 0 && curtainTo === 0) {
          curtainTo = 1;
          play('curtain');
        }
        const t = Math.max(0, show.t);
        const pos = positionsAt(show.show, t);
        actors.forEach((a, i) => {
          if (!pos[i]) return;
          if (a.kind === 'puppet') {
            a.tx = pos[i].x;
            a.ty = pos[i].y;
          } else {
            a.x = pos[i].x;
            a.y = pos[i].y;
          }
        });
        if (show.t > 0) {
          for (const i of tapsBetween(show.show, Math.max(0, show.last), t)) if (actors[i] && actors[i].kind === 'puppet') sayHello(actors[i]);
          show.last = t;
        }
        if (show.t > show.show.d / 100 + 1.2) {
          // the end: curtains close and open again
          curtainTo = 0;
          if (show.t > show.show.d / 100 + 2.2) stopShow();
        }
      }
      for (const a of actors) {
        if (a.kind !== 'puppet') continue;
        stepBody(a.body, a.body.x + (a.tx - a.body.x) * Math.min(1, dt * 18), a.body.y + (a.ty - a.body.y) * Math.min(1, dt * 18), dt);
        stepLive(a.live, dt, a.puppet, { ax: a.body.vx * 0.5, ay: 0 });
      }
    },
    draw(ctx) {
      const { w, h } = G.size;
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#2b1055');
      g.addColorStop(1, '#5a1a4a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      drawStageBox(ctx);
      for (const b of buttons) {
        if (b.id === 'pal' && !G.progress.shelf.some((q) => q && q.uid !== p.uid)) drawButton(ctx, { ...b, fill: '#c9c0d6' }, G.time);
        else drawButton(ctx, b, G.time);
      }
      // recording: a blinking red dot and a ring running out
      if (rec) {
        const b = buttons.find((r) => r.id === 'stop-rec');
        const u = recT / SHOW_MAX;
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#ff3047';
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 + 9, -Math.PI / 2, -Math.PI / 2 + (1 - u) * Math.PI * 2);
        ctx.stroke();
        if (Math.sin(G.time * 6) > 0) {
          circle(ctx, box.x + 30, box.y + 30, 14);
          ctx.fillStyle = '#ff3047';
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
        }
      }
      if (show && show.t > 0) {
        const b = buttons.find((r) => r.id === 'stop-show');
        const u = Math.min(1, show.t / Math.max(0.1, show.show.d / 100));
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#2fbf5b';
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 + 9, -Math.PI / 2, -Math.PI / 2 + u * Math.PI * 2);
        ctx.stroke();
      }
      if (picker) drawPicker(ctx);
    },
    pickUp(x, y) {
      if (picker || show) return false;
      if (buttons.some((b) => hit(b, x, y, 4))) return false;
      const a = actorAt(x, y);
      if (!a) return false;
      const pt = toStage(x, y);
      const ax = a.kind === 'puppet' ? a.tx : a.x;
      const ay = a.kind === 'puppet' ? a.ty : a.y;
      drag = { a, dx: ax - pt.x, dy: ay - pt.y, x0: x, y0: y, t0: G.time, moved: false };
      if (a.kind === 'puppet') {
        order = [...order.filter((o) => o !== a), a];
        a.live.look = null;
      }
      return true;
    },
    drag(x, y) {
      if (!drag) return;
      if (Math.hypot(x - drag.x0, y - drag.y0) > TAP_MOVE) drag.moved = true;
      if (!drag.moved) return;
      const pt = toStage(x, y);
      const nx = clamp(pt.x + drag.dx, 60, STAGE_W - 60);
      if (drag.a.kind === 'puppet') {
        drag.a.tx = nx;
        drag.a.ty = clamp(pt.y + drag.dy, 170, 520);
      } else {
        drag.a.x = nx;
        drag.a.y = clamp(pt.y + drag.dy, 80, LEDGE_Y);
      }
    },
    drop(x, y) {
      if (!drag) return;
      this.drag(x, y);
      const d = drag;
      drag = null;
      const i = actors.indexOf(d.a);
      if (!d.moved) {
        if (d.a.kind === 'puppet') {
          sayHello(d.a);
          if (rec) recordTap(rec, recT, i);
        } else play('boing');
        return;
      }
      if (rec) recordMove(rec, recT, i, d.a.kind === 'puppet' ? d.a.tx : d.a.x, d.a.kind === 'puppet' ? d.a.ty : d.a.y, true);
      if (d.a.kind === 'puppet') poke(d.a.live, d.a.body.vx > 0 ? 1 : -1, 0.6);
    },
    tap(x, y) {
      if (picker) {
        const b = picker.buttons.find((r) => hit(r, x, y));
        picker = null;
        if (b) {
          const pos = positions();
          const mainPos = pos[0];
          makeActors({ backdrop: setup.backdrop, pal: b.id === 'pick-pal' ? b.uid : null, props: setup.props });
          actors[0].tx = actors[0].body.x = mainPos.x;
          actors[0].ty = actors[0].body.y = mainPos.y;
          if (b.id === 'pick-pal') {
            const pal = actors[1];
            pal.tx = pal.body.x = mainPos.x < 500 ? 720 : 280;
            sayHello(pal);
          }
          play('pop');
        }
        layout();
        return;
      }
      const b = buttons.find((r) => hit(r, x, y, 4));
      if (!b) {
        if (show) stopShow();
        return;
      }
      if (b.id === 'back') {
        if (rec) stopRec();
        G.go('card', p);
      } else if (b.id === 'stop-show') stopShow();
      else if (show) return;
      else if (b.id === 'record') startRec();
      else if (b.id === 'stop-rec') stopRec();
      else if (b.id === 'play') startShow();
      else if (rec) return; // the cast can't change mid-recording
      else if (b.id === 'backdrop') {
        const i = STAGE_BACKDROPS.indexOf(setup.backdrop);
        setup.backdrop = STAGE_BACKDROPS[(i + 1) % STAGE_BACKDROPS.length];
        curtain = 0.4;
        play('curtain');
      } else if (b.id === 'prop') {
        const used = setup.props;
        const next = STAGE_PROPS.find((id) => !used.includes(id)) || STAGE_PROPS[0];
        const props = used.length >= 4 ? [...used.slice(1), next] : [...used, next];
        const pos = positions();
        const puppets = actors.filter((a) => a.kind === 'puppet').length;
        makeActors({ backdrop: setup.backdrop, pal: setup.pal, props }, pos.slice(0, puppets));
        const a = actors[actors.length - 1];
        a.x = 200 + Math.random() * 600;
        a.y = 140 + Math.random() * 120;
        play('pop');
      } else if (b.id === 'pal') {
        if (!G.progress.shelf.some((q) => q && q.uid !== p.uid)) {
          play('unpop');
          return;
        }
        picker = {};
        layout();
      }
    },
    debug: {
      box: () => ({ ...box }),
      actors: () => actors.map((a, i) => (a.kind === 'puppet'
        ? { i, kind: a.kind, uid: a.puppet.uid, x: a.body.x, y: a.body.y, tx: a.tx, ty: a.ty, lean: a.body.lean, mouth: a.live.mouth }
        : { i, kind: a.kind, id: a.id, x: a.x, y: a.y })),
      toScreen: (x, y) => ({ x: box.x + x * box.s, y: box.y + y * box.s }),
      buttons: () => (picker ? picker.buttons : buttons).map((r) => ({ ...r })),
      recording: () => (rec ? { t: recT, events: rec.events.length } : null),
      show: () => (show ? { t: show.t, d: show.show.d } : null),
      saved: () => currentShow(),
      setup: () => ({ ...setup }),
    },
  };
}
