// The battle screen (picking moves, the timing and tap-fast moments, hits, telegraphed foe
// moves), the results (coins, xp, level ups, or a gentle rest after a loss) and befriending a
// beaten monster with snacks. Game rules are in battle.js and progress.js.
import {
  createBattle, current, fighterAt, heroMove, foeMove, canUse, preview, bestTarget, forceEnd, CHARGE,
} from './battle.js';
import { edge } from './parts.js';
import { teamMons, recordBattle, befriend, snackWorks, findMon } from './progress.js';
import { xpNeed } from './monster.js';
import { ZONES, encounter, bossBattle } from './world.js';
import { battleLayout, panelLayout, befriendLayout } from './layout.js';
import { drawMonster, drawMonsterStill, drawStarShape, headroom } from './draw-monster.js';
import { drawZoneScene } from './scenes.js';
import {
  C, TAU, font, roundRect, outlined, panel, cornerIcon, drawIcon, drawHeart, drawCoin, drawElement,
  drawElementRing, hpBar, confetti, bigButton, hit, SNACKS, drawSnack,
} from './ui.js';
import { play } from './sound.js';

const LUNGE = 0.45; // seconds of an attacker's lunge
const IMPACT = 0.28; // when in the lunge the hit lands
const MOVE_DUR = { bonk: 0.95, blast: 1.05, bubble: 0.95, special: 1.4 };
const FOE_WAIT = 0.75; // a foe's pause before it acts, so its move can be seen coming
const AIM_TIME = 4; // the timing marker stops by itself after this
const MASH_TIME = 2.2;
const MASH_FULL = 10; // taps for a perfect special

const MOVE_ICON = (move, el) => (move === 'bonk' ? 'fist' : move === 'blast' ? el : move);

// ---------------------------------------------------------------------------------------------
// The battle
// ---------------------------------------------------------------------------------------------

export function createBattleScreen(G) {
  let b = null;
  let info = null; // { zone, boss, foes }
  let L = null;
  let phase = 'intro'; // intro | pick | aim | mash | anim | foe | end
  let phaseT = 0;
  let target = 0;
  let anim = null; // { ev, t, dur, impacted }
  let floats = []; // floating numbers and bursts
  let view = null; // what the screen shows: { hero: [{hp, shield, dizzy}], foe: [...] }
  let aim = null; // { move, t, stopped, q }
  let shake = 0;
  let pressT = {};

  function layout() {
    if (!b) return;
    L = battleLayout(G.size.w, G.size.h, b.heroes.length, b.foes.length);
  }

  function start(zone, boss = false, seed = (Math.random() * 2 ** 31) | 0) {
    const p = G.progress;
    const foes = boss ? bossBattle(zone, seed) : encounter(zone, seed, p.zones[zone].wins);
    info = { zone, boss, foes };
    b = createBattle({ heroes: teamMons(p), foes, seed: seed + 1 });
    view = {
      hero: b.heroes.map((f) => ({ hp: f.hp, shown: f.hp, shield: false, dizzy: false })),
      foe: b.foes.map((f) => ({ hp: f.hp, shown: f.hp, shield: false, dizzy: false })),
    };
    floats = [];
    anim = null;
    aim = null;
    phase = 'intro';
    phaseT = 0;
    for (const f of foes) if (f.sp) G.progress.seen[f.sp] = 1;
    layout();
  }

  const posOf = (ref) => (ref.side === 'hero' ? L.heroes[ref.idx] : L.foes[ref.idx]);

  function nextTurn() {
    if (b.over) {
      phase = 'end';
      phaseT = 0;
      play(b.over === 'win' ? 'win' : 'lose');
      return;
    }
    const cur = current(b);
    if (cur.side === 'hero') {
      phase = 'pick';
      const t = b.foes[target];
      if (!t || t.dizzy) target = bestTarget(b, fighterAt(b, cur));
    } else phase = 'foe';
    phaseT = 0;
  }

  function begin(ev) {
    anim = { ev, t: 0, dur: MOVE_DUR[ev.move] || 1, impacted: false };
    phase = 'anim';
    phaseT = 0;
    play(ev.move === 'bonk' ? 'bonk' : ev.move === 'bubble' ? 'bubble' : ev.move === 'special' ? 'special' : 'blast');
  }

  function choose(move) {
    const cur = current(b);
    if (!cur || cur.side !== 'hero') return;
    const f = fighterAt(b, cur);
    if (!canUse(f, move)) {
      play('nope');
      pressT[move] = -G.time;
      return;
    }
    play('tap');
    aim = { move, t: 0, stopped: false, q: 0, taps: 0 };
    phase = move === 'special' ? 'mash' : 'aim';
    phaseT = 0;
  }

  // The timing marker: 0..1 across the bar, swinging.
  const markerAt = (t) => 0.5 - 0.5 * Math.cos(t * 3.4);
  const qualityAt = (m) => {
    const d = Math.abs(m - 0.5);
    return d < 0.1 ? 1 : d < 0.24 ? 0.6 : 0.2;
  };

  function release() {
    const ev = heroMove(b, aim.move, target, aim.q);
    aim = null;
    if (ev) begin(ev);
    else nextTurn();
  }

  function impact(ev) {
    anim.impacted = true;
    const side = (s) => (s === 'hero' ? view.hero : view.foe);
    if (ev.heal) {
      const v = side(ev.heal.side)[ev.heal.idx];
      v.hp += ev.heal.amount;
      const p = posOf(ev.heal);
      floats.push({ x: p.x, y: p.y - L.size * 0.9, text: `+${ev.heal.amount}`, colour: C.green, t: 0, big: false, heart: true });
    }
    for (const s of ev.shields) side(s.side)[s.idx].shield = true;
    for (const h of ev.hits) {
      const v = side(h.side)[h.idx];
      v.hp = Math.max(0, v.hp - h.dmg);
      if (h.shielded) v.shield = false;
      if (h.dizzy) {
        v.dizzy = true;
        v.shield = false;
        setTimeout(() => play('dizzy'), 250);
      }
      const p = posOf(h);
      floats.push({
        x: p.x + (Math.random() - 0.5) * 20, y: p.y - L.size * 0.75, text: `${h.dmg}`, t: 0,
        colour: h.edge === 'up' ? C.sun : h.edge === 'down' ? '#c9c3d9' : C.white, big: h.edge === 'up', edge: h.edge, shielded: h.shielded,
      });
      if (h.edge === 'up') play('super');
    }
    if (ev.hits.length) shake = ev.move === 'special' ? 0.4 : 0.22;
  }

  function update(dt) {
    if (!b) return;
    phaseT += dt;
    shake = Math.max(0, shake - dt);
    for (const v of [...view.hero, ...view.foe]) v.shown += (v.hp - v.shown) * Math.min(1, dt * 8);
    floats = floats.filter((f) => (f.t += dt) < 1.3);
    if (phase === 'intro' && phaseT > 0.9) nextTurn();
    else if (phase === 'aim') {
      if (!aim.stopped) {
        aim.t += dt;
        if (aim.t > AIM_TIME) stopAim();
      } else if (phaseT > 0.45) release();
    } else if (phase === 'mash') {
      aim.t += dt;
      if (!aim.stopped && aim.t > MASH_TIME) {
        aim.stopped = true;
        aim.q = Math.min(1, aim.taps / MASH_FULL);
        phaseT = 0;
      } else if (aim.stopped && phaseT > 0.35) release();
    } else if (phase === 'foe' && phaseT > FOE_WAIT) {
      const ev = foeMove(b);
      if (ev) begin(ev);
      else nextTurn();
    } else if (phase === 'anim') {
      anim.t += dt;
      if (!anim.impacted && anim.t >= IMPACT) impact(anim.ev);
      if (anim.t >= anim.dur) {
        anim = null;
        nextTurn();
      }
    } else if (phase === 'end' && phaseT > 1.4) {
      G.go('result', { ...info, won: b.over === 'win', battle: b });
    }
  }

  function stopAim() {
    aim.stopped = true;
    aim.q = qualityAt(markerAt(aim.t));
    phaseT = 0;
    play(aim.q >= 1 ? 'super' : 'tap');
  }

  // ---------- drawing ----------

  function fighterPose(ref, v) {
    if (anim) {
      const ev = anim.ev;
      if (ev.who.side === ref.side && ev.who.idx === ref.idx && anim.t < LUNGE) return { pose: 'attack', p: anim.t / LUNGE };
      const h = ev.hits.find((x) => x.side === ref.side && x.idx === ref.idx);
      if (h && anim.impacted && anim.t < IMPACT + 0.45) return { pose: 'hit', p: (anim.t - IMPACT) / 0.45 };
    }
    if (v.dizzy) return { pose: 'dizzy', p: 1 };
    if (b.over === 'win' && ref.side === 'hero') return { pose: 'happy', p: 1 };
    return { pose: 'idle', p: 0 };
  }

  function drawFighter(ctx, f, v, pos, active) {
    const ref = { side: f.side, idx: f.idx };
    const { pose, p } = fighterPose(ref, v);
    let x = pos.x;
    let y = pos.y;
    // slide in at the start
    if (phase === 'intro') {
      const k = Math.min(1, phaseT / 0.7);
      x += (f.side === 'hero' ? -1 : 1) * (1 - k) * (1 - k) * G.size.w * 0.6;
    }
    // an attacker moves part of the way toward its target
    if (pose === 'attack' && anim) {
      const ev = anim.ev;
      const tgt = ev.hits[0] ? posOf(ev.hits[0]) : null;
      if (tgt) {
        const k = Math.sin(Math.min(1, p) * Math.PI) * 0.4;
        x += (tgt.x - pos.x) * k;
        y += (tgt.y - pos.y) * k * 0.6;
      }
    }
    const size = L.size;
    if (active) {
      ctx.save();
      ctx.fillStyle = `rgba(255,225,77,${0.45 + Math.sin(G.time * 6) * 0.15})`;
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, size * 0.5, size * 0.11, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    drawMonster(ctx, f.mon, x, y, size, { t: G.time + f.idx * 0.7 + (f.side === 'foe' ? 3 : 0), face: f.side === 'hero' ? 1 : -1, pose, p });
    if (v.shield) {
      ctx.save();
      const r = size * 0.62;
      const cy = y - size * 0.5;
      const gr = ctx.createRadialGradient(x - r * 0.3, cy - r * 0.3, r * 0.1, x, cy, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.35)');
      gr.addColorStop(0.8, 'rgba(140,220,255,0.18)');
      gr.addColorStop(1, 'rgba(140,220,255,0.5)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(x, cy, r + Math.sin(G.time * 4) * 2, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
  }

  function barTop(f, pos) {
    const hr = Math.min((headroom(f.mon.parts, f.mon.stage) / 140) * L.size, L.size * 1.5);
    return Math.max(L.arena.y + 4, pos.y - hr - L.size * 0.2);
  }

  function drawInfo(ctx, f, v, pos) {
    const bw = Math.max(70, L.size * 0.85);
    const bh = Math.max(18, Math.min(26, L.size * 0.15));
    const y = barTop(f, pos);
    const x = pos.x - bw / 2;
    ctx.globalAlpha = v.dizzy ? 0.6 : 1;
    hpBar(ctx, x, y, bw, bh, v.hp, f.max, v.shown);
    drawElement(ctx, f.el, x - bh * 0.55, y + bh / 2, bh * 0.62);
    // level
    ctx.fillStyle = C.night;
    ctx.beginPath();
    ctx.arc(x + bw + bh * 0.55, y + bh / 2, bh * 0.6, 0, TAU);
    ctx.fill();
    outlined(ctx, String(f.mon.lv), x + bw + bh * 0.55, y + bh / 2 + 1, bh * 0.62, C.sun);
    // special charge: three little stars
    if (f.side === 'hero' && f.moves.special) {
      for (let i = 0; i < CHARGE; i++) {
        drawStarShape(ctx, pos.x + (i - 1) * bh * 0.9, y + bh * 1.55, bh * 0.38, i < f.charge ? C.sun : 'rgba(255,255,255,0.35)', 1.5);
      }
    }
    ctx.globalAlpha = 1;
  }

  // Each awake foe shows what it will do next, and an arrow points at who it will do it to.
  function drawIntents(ctx) {
    if (phase === 'intro' || phase === 'end') return;
    const marks = new Map();
    b.foes.forEach((f, i) => {
      const it = b.intents[i];
      if (!it || f.dizzy) return;
      const pos = L.foes[i];
      const top = barTop(f, pos);
      const s = Math.max(14, L.size * 0.13);
      const bx = pos.x;
      const by = top - s * 1.45;
      const pulse = 1 + (phase === 'foe' && current(b)?.idx === i && current(b)?.side === 'foe' ? Math.sin(G.time * 14) * 0.12 : 0);
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = it.move === 'special' ? '#ffcfe0' : C.white;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.15, 0, TAU);
      ctx.fill();
      ctx.stroke();
      drawIcon(ctx, MOVE_ICON(it.move, f.el), 0, 0, s * 0.62, C.ink, G.time);
      ctx.restore();
      if (it.move === 'bubble') return;
      const targets = it.move === 'special' ? b.heroes.filter((h) => !h.dizzy).map((h) => h.idx) : [it.target];
      for (const ti of targets) {
        if (ti == null || !b.heroes[ti] || b.heroes[ti].dizzy) continue;
        marks.set(ti, [...(marks.get(ti) || []), { el: f.el, move: it.move }]);
      }
    });
    for (const [ti, list] of marks) {
      const h = b.heroes[ti];
      const pos = L.heroes[ti];
      const s = Math.max(12, L.size * 0.11);
      const y = barTop(h, pos) - s * 1.6 + Math.sin(G.time * 5) * 3;
      list.forEach((m, k) => {
        const x = pos.x + (k - (list.length - 1) / 2) * s * 2.3;
        ctx.save();
        ctx.fillStyle = m.move === 'special' ? C.pink : C.red;
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x - s, y - s * 0.8);
        ctx.lineTo(x + s, y - s * 0.8);
        ctx.lineTo(x, y + s * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        // the element of the foe aiming here, and whether it is strong against this hero
        const e = edge(m.el, h.el);
        if (e === 'up' && m.move !== 'bonk') drawIcon(ctx, 'up', x + s * 1.1, y - s * 0.6, s * 0.5);
      });
    }
  }

  function drawOrder(ctx) {
    const order = b.order;
    const s = Math.max(30, Math.min(44, G.size.w * 0.06));
    const gap = 6;
    const total = order.length * (s + gap) - gap;
    let x = (G.size.w - total) / 2;
    const y = L.arena.y - s - 4 > 4 ? Math.max(8, (L.buttons[0].y + L.buttons[0].h / 2) - s / 2) : 8;
    if (x < L.buttons[0].x + L.buttons[0].w + 8) x = L.buttons[0].x + L.buttons[0].w + 8;
    order.forEach((ref, i) => {
      const f = fighterAt(b, ref);
      const now = i === b.turn && !b.over;
      const sz = now ? s * 1.15 : s;
      const cx = x + s / 2;
      const cy = y + s / 2;
      ctx.save();
      ctx.globalAlpha = f.dizzy || i < b.turn ? 0.4 : 1;
      ctx.fillStyle = ref.side === 'hero' ? '#bfe9ff' : '#ffd0d6';
      ctx.strokeStyle = now ? C.sun : C.ink;
      ctx.lineWidth = now ? 5 : 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, sz / 2, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, sz / 2 - 2, 0, TAU);
      ctx.clip();
      drawMonsterStill(ctx, f.mon, cx, cy + sz * 0.62, sz * 0.95, { face: ref.side === 'hero' ? 1 : -1 });
      ctx.restore();
      x += s + gap;
    });
  }

  function drawMoves(ctx) {
    const cur = current(b);
    const heroTurn = cur && cur.side === 'hero' && phase === 'pick';
    const f = heroTurn ? fighterAt(b, cur) : null;
    const tgt = b.foes[target];
    for (const m of L.moves) {
      const key = m.key;
      const learnt = f ? f.moves[key] > 0 : true;
      const usable = f && canUse(f, key);
      const fills = { bonk: '#ffb07a', blast: '#bfe9ff', bubble: '#c8ffd8', special: '#ffe98a' };
      const shakeX = pressT[key] < 0 && G.time + pressT[key] < 0.3 ? Math.sin(G.time * 60) * 4 : 0;
      ctx.save();
      ctx.translate(shakeX, 0);
      const dim = !heroTurn || !usable;
      ctx.globalAlpha = heroTurn ? 1 : 0.5;
      panel(ctx, m.x, m.y, m.w, m.h, dim ? '#d8d2e6' : fills[key], { r: Math.min(22, m.h * 0.28) });
      const s = Math.min(m.w, m.h) * 0.22;
      const ix = m.x + m.w * (m.w > m.h * 1.4 ? 0.3 : 0.5);
      const iy = m.y + m.h * (m.w > m.h * 1.4 ? 0.5 : 0.36);
      const nx = m.x + m.w * (m.w > m.h * 1.4 ? 0.68 : 0.5);
      const ny = m.y + m.h * (m.w > m.h * 1.4 ? 0.5 : 0.76);
      const px = Math.min(m.h * 0.3, m.w * 0.22);
      if (!learnt) {
        drawIcon(ctx, 'lock', m.x + m.w / 2, m.y + m.h / 2, s, 'rgba(42,22,54,0.5)');
      } else if (key === 'special') {
        drawIcon(ctx, 'special', ix, iy, s * (usable ? 1 + Math.sin(G.time * 6) * 0.08 : 0.85), C.ink, G.time);
        for (let i = 0; i < CHARGE; i++) drawStarShape(ctx, nx + (i - 1) * px * 0.95, ny, px * 0.38, f && i < f.charge ? C.sun : 'rgba(42,22,54,0.2)', 1.5);
      } else {
        const el = f ? f.el : 'sun';
        drawIcon(ctx, key === 'blast' ? el : key === 'bonk' ? 'fist' : 'bubble', ix, iy, s, C.ink, G.time);
        if (f) {
          const n = preview(b, f, key, tgt);
          outlined(ctx, key === 'bubble' ? `+${n}` : String(n), nx, ny, px, key === 'bubble' ? C.green : C.white);
          if (key === 'blast' && tgt) {
            const e = edge(f.el, tgt.el);
            if (e) drawIcon(ctx, e, m.x + m.w - s * 0.75, m.y + s * 0.8, s * 0.6);
          }
        }
      }
      ctx.restore();
    }
  }

  function drawAim(ctx) {
    const r = L.bar;
    panel(ctx, r.x, r.y, r.w, r.h, 'rgba(255,246,224,0.96)', { r: 20 });
    if (phase === 'mash') {
      const k = Math.min(1, aim.taps / MASH_FULL);
      const s = r.h * (0.28 + k * 0.14) * (1 + Math.sin(G.time * 20) * 0.03);
      drawIcon(ctx, 'special', r.x + r.w / 2, r.y + r.h / 2, s, C.ink, G.time);
      // the time left, as a shrinking bar
      const left = Math.max(0, 1 - aim.t / MASH_TIME);
      ctx.fillStyle = C.pink;
      roundRect(ctx, r.x + 16, r.y + r.h - 16, (r.w - 32) * left, 8, 4);
      ctx.fill();
      for (let i = 0; i < MASH_FULL; i++) {
        drawStarShape(ctx, r.x + 30 + (i * (r.w * 0.3 - 30)) / (MASH_FULL - 1), r.y + r.h * 0.35, r.h * 0.08, i < aim.taps ? C.sun : 'rgba(42,22,54,0.15)', 1.2);
      }
      drawFingerTap(ctx, r.x + r.w * 0.82, r.y + r.h * 0.3, r.h / 110, G.time * 8);
      return;
    }
    const bx = r.x + r.w * 0.08;
    const bw = r.w * 0.84;
    const by = r.y + r.h * 0.34;
    const bh = r.h * 0.34;
    const zones = [[0, 0.26, C.red], [0.26, 0.4, '#ffc93d'], [0.4, 0.6, C.green], [0.6, 0.74, '#ffc93d'], [0.74, 1, C.red]];
    ctx.save();
    roundRect(ctx, bx, by, bw, bh, bh / 2);
    ctx.clip();
    for (const [a, z, c] of zones) {
      ctx.fillStyle = c;
      ctx.fillRect(bx + a * bw, by, (z - a) * bw + 1, bh);
    }
    ctx.restore();
    roundRect(ctx, bx, by, bw, bh, bh / 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    drawStarShape(ctx, bx + bw / 2, by + bh / 2, bh * 0.32, C.sun, 2);
    const m = markerAt(aim.t);
    const mx = bx + m * bw;
    ctx.fillStyle = C.white;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(mx, by + bh * 0.2);
    ctx.lineTo(mx - bh * 0.45, by - bh * 0.55);
    ctx.lineTo(mx + bh * 0.45, by - bh * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    roundRect(ctx, mx - 4, by - 2, 8, bh + 4, 4);
    ctx.fill();
    ctx.stroke();
    if (aim.stopped) {
      const n = aim.q >= 1 ? 3 : aim.q >= 0.6 ? 2 : 1;
      for (let i = 0; i < 3; i++) drawStarShape(ctx, mx + (i - 1) * bh * 0.9, by + bh * 1.6, bh * 0.38 * (1 + Math.max(0, 0.3 - phaseT)), i < n ? C.sun : 'rgba(42,22,54,0.2)', 2);
    } else {
      drawFingerTap(ctx, r.x + r.w * 0.94, r.y + r.h * 0.35, r.h / 130, G.time * 4);
    }
  }

  function drawFloats(ctx) {
    for (const f of floats) {
      const k = f.t / 1.3;
      const y = f.y - k * L.size * 0.5;
      ctx.globalAlpha = Math.min(1, (1 - k) * 2);
      if (f.edge === 'up') {
        // a starburst behind a super hit
        const r = L.size * (0.3 + Math.min(0.2, f.t));
        ctx.save();
        ctx.translate(f.x, y);
        ctx.rotate(f.t * 2);
        drawStarShape(ctx, 0, 0, r, '#ff9a3d', 3);
        ctx.restore();
        drawIcon(ctx, 'up', f.x + r * 0.9, y - r * 0.5, r * 0.35);
      }
      if (f.shielded) drawIcon(ctx, 'bubble', f.x - L.size * 0.28, y, L.size * 0.09);
      if (f.heart) drawHeart(ctx, f.x - L.size * 0.25, y, L.size * 0.08);
      if (f.edge === 'down') drawIcon(ctx, 'down', f.x + L.size * 0.25, y, L.size * 0.08);
      outlined(ctx, f.text, f.x, y, L.size * (f.big ? 0.32 : 0.24), f.colour);
      ctx.globalAlpha = 1;
    }
  }

  function draw(ctx) {
    if (!b) return;
    const { w, h } = G.size;
    ctx.save();
    if (shake > 0) ctx.translate(Math.sin(G.time * 70) * shake * 18, Math.cos(G.time * 55) * shake * 10);
    const hz = Math.min(L.foes[0].y - L.size * 0.25, h * 0.5);
    drawZoneScene(ctx, ZONES[info.zone].id, w, h, hz);
    const cur = current(b);
    // the target ring under the chosen foe
    if (phase === 'pick' || phase === 'aim' || phase === 'mash') {
      const t = L.foes[target];
      if (t && !b.foes[target].dizzy) {
        ctx.save();
        ctx.strokeStyle = C.red;
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 8]);
        ctx.lineDashOffset = -G.time * 30;
        ctx.beginPath();
        ctx.ellipse(t.x, t.y, L.size * 0.5, L.size * 0.12, 0, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    }
    // far row first
    const all = [
      ...b.foes.map((f, i) => ({ f, v: view.foe[i], pos: L.foes[i], active: false })),
      ...b.heroes.map((f, i) => ({ f, v: view.hero[i], pos: L.heroes[i], active: !!(cur && cur.side === 'hero' && cur.idx === i) })),
    ].sort((p, q) => p.pos.y - q.pos.y);
    for (const a of all) drawFighter(ctx, a.f, a.v, a.pos, a.active);
    if (phase !== 'intro') {
      b.foes.forEach((f, i) => drawInfo(ctx, f, view.foe[i], L.foes[i]));
      b.heroes.forEach((f, i) => drawInfo(ctx, f, view.hero[i], L.heroes[i]));
    }
    drawIntents(ctx);
    // a bouncing arrow over the hero whose turn it is
    if (cur && cur.side === 'hero' && phase === 'pick') {
      const p = L.heroes[cur.idx];
      const f = b.heroes[cur.idx];
      const y = barTop(f, p) - 14 - Math.abs(Math.sin(G.time * 5)) * 10;
      ctx.fillStyle = C.sun;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x - 14, y - 16);
      ctx.lineTo(p.x + 14, y - 16);
      ctx.lineTo(p.x, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    if (anim && anim.ev.move === 'special' && anim.t > IMPACT && anim.t < IMPACT + 0.4) {
      ctx.fillStyle = `rgba(255,240,180,${0.5 * (1 - (anim.t - IMPACT) / 0.4)})`;
      ctx.fillRect(0, 0, w, h);
    }
    drawFloats(ctx);
    ctx.restore();
    // fixed UI
    cornerIcon(ctx, L.buttons[0], 'back');
    drawOrder(ctx);
    const rr = Math.max(18, Math.min(30, w * 0.035));
    drawElementRing(ctx, w - rr * 1.8, L.buttons[0].y + rr * 1.6, rr);
    if (phase === 'aim' || phase === 'mash') drawAim(ctx);
    else drawMoves(ctx);
    if (phase === 'end') {
      const k = Math.min(1, phaseT / 0.5);
      ctx.fillStyle = `rgba(22,11,51,${k * 0.35})`;
      ctx.fillRect(0, 0, w, h);
      if (b.over === 'win') {
        for (let i = 0; i < 3; i++) drawStarShape(ctx, w / 2 + (i - 1) * 90 * k, h * 0.35 - (i === 1 ? 30 : 0), 40 * k, C.sun, 4);
      } else drawIcon(ctx, 'zzz', w / 2, h * 0.35, 40 * k, C.white);
    }
  }

  function tap(x, y) {
    if (!b) return;
    if (hit(L.buttons[0], x, y)) {
      G.go('zone', info.zone);
      return;
    }
    if (phase === 'aim' && !aim.stopped) {
      stopAim();
      return;
    }
    if (phase === 'mash' && !aim.stopped) {
      aim.taps += 1;
      play('tap');
      return;
    }
    if (phase === 'intro') return;
    // tap a foe to aim at it
    for (const r of L.buttons) {
      if (r.id === 'foe' && hit(r, x, y) && !b.foes[r.index].dizzy) {
        target = r.index;
        play('tap');
        return;
      }
    }
    if (phase !== 'pick') return;
    const m = L.moves.find((r) => hit(r, x, y));
    if (m) choose(m.key);
  }

  return {
    start,
    layout,
    update,
    draw,
    tap,
    buttons: () => (L ? L.buttons : []),
    debug: {
      battle: () => b,
      phase: () => phase,
      target: () => target,
      // Riley's move with a given timing, skipping the timing moment
      pick(move, tgt = null, q = 0.7) {
        if (!b || phase !== 'pick') return false;
        if (tgt != null) target = tgt;
        const ev = heroMove(b, move, target, q);
        if (!ev) return false;
        begin(ev);
        return true;
      },
      end(result) {
        if (!b) return;
        forceEnd(b, result);
        for (const v of result === 'win' ? view.foe : view.hero) {
          v.hp = 0;
          v.dizzy = true;
        }
        anim = null;
        aim = null;
        nextTurn();
      },
    },
  };
}

function drawFingerTap(ctx, x, y, sc, t) {
  const press = (Math.sin(t) + 1) / 2;
  ctx.save();
  ctx.translate(x, y + press * 6);
  ctx.scale(sc, sc);
  ctx.rotate(-0.25);
  ctx.fillStyle = C.white;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2.5;
  roundRect(ctx, -6, 0, 12, 30, 6);
  ctx.fill();
  ctx.stroke();
  roundRect(ctx, -13, 22, 28, 26, 10);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = `rgba(255,255,255,${1 - press})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y - 4, 10 + press * 12, 0, TAU);
  ctx.stroke();
}

// ---------------------------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------------------------

export function createResultScreen(G) {
  let r = null; // { won, zone, boss, foes, reward, before: [{uid, lv, xp}] }
  let L = null;
  let t = 0;

  function start(info) {
    const p = G.progress;
    const before = teamMons(p).map((m) => ({ uid: m.uid, lv: m.lv, xp: m.xp }));
    const reward = recordBattle(p, { zone: info.zone, foes: info.foes, boss: info.boss, won: info.won });
    G.save();
    r = { ...info, reward, before };
    t = 0;
    layout();
    if (info.won) setTimeout(() => play('coin'), 400);
    if (reward.ups.length) setTimeout(() => play('level'), 1100);
  }

  function layout() {
    L = panelLayout(G.size.w, G.size.h, 'ok');
  }

  function draw(ctx) {
    const { w, h } = G.size;
    drawZoneScene(ctx, ZONES[r.zone].id, w, h, h * 0.45);
    ctx.fillStyle = 'rgba(22,11,51,0.45)';
    ctx.fillRect(0, 0, w, h);
    if (r.won) confetti(ctx, w, h, t, 40);
    const P = L.panel;
    panel(ctx, P.x, P.y, P.w, P.h, r.won ? C.card : '#e6e0f5', { r: 30 });
    // stars or sleepy z's
    const top = P.y + P.h * 0.1;
    if (r.won) {
      for (let i = 0; i < 3; i++) {
        const k = Math.min(1, Math.max(0, (t - i * 0.2) * 3));
        drawStarShape(ctx, P.x + P.w / 2 + (i - 1) * P.w * 0.2, top - (i === 1 ? 12 : 0), P.w * 0.07 * k, C.sun, 4);
      }
    } else drawIcon(ctx, 'zzz', P.x + P.w / 2, top, P.w * 0.06, C.purple);
    if (r.boss && r.reward.bossFirst) drawIcon(ctx, 'crown', P.x + P.w * 0.12, top, P.w * 0.06);
    // coins
    const cy = P.y + P.h * 0.24;
    const px = Math.min(P.w * 0.1, 48);
    const coinsShown = Math.round(r.reward.coins * Math.min(1, t / 0.8));
    drawCoin(ctx, P.x + P.w / 2 - px * 1.1, cy, px * 0.55);
    outlined(ctx, `+${coinsShown}`, P.x + P.w / 2 + px * 0.5, cy, px, C.sun);
    if (r.reward.token) {
      drawIcon(ctx, 'egg', P.x + P.w * 0.82, cy, px * 0.5);
      outlined(ctx, '+1', P.x + P.w * 0.82 + px * 0.9, cy, px * 0.6, C.white);
    }
    // the team, with xp bars filling and level ups
    const mons = r.before.map((bf) => ({ bf, m: findMon(G.progress, bf.uid) })).filter((x) => x.m);
    const n = mons.length;
    const cw = (P.w - 40) / Math.max(1, n);
    const my = P.y + P.h * 0.6;
    const size = Math.min(cw * 0.75, P.h * 0.28);
    const k = Math.min(1, Math.max(0, (t - 0.6) / 1));
    mons.forEach(({ bf, m }, i) => {
      const x = P.x + 20 + cw * (i + 0.5);
      const up = r.reward.ups.find((u) => u.uid === m.uid);
      const pose = r.won ? 'happy' : t < 1.2 ? 'dizzy' : 'idle';
      drawMonster(ctx, m, x, my, size, { t: G.time + i, pose });
      const bw = cw * 0.8;
      const by = my + 10;
      // xp: from where it was to where it is now
      const from = bf.xp / xpNeed(bf.lv);
      const to = up ? 1 : m.xp / xpNeed(m.lv);
      const fill = from + (to - from) * k;
      ctx.fillStyle = 'rgba(22,11,51,0.25)';
      roundRect(ctx, x - bw / 2, by, bw, 14, 7);
      ctx.fill();
      ctx.fillStyle = C.sky;
      roundRect(ctx, x - bw / 2, by, Math.max(14, bw * Math.min(1, fill)), 14, 7);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = C.ink;
      roundRect(ctx, x - bw / 2, by, bw, 14, 7);
      ctx.stroke();
      const lvShown = up && k >= 1 ? up.to : bf.lv;
      outlined(ctx, String(lvShown), x, by + 34, 24, up && k >= 1 ? C.sun : C.white);
      if (up && k >= 1) drawIcon(ctx, 'up', x + 30, by + 34, 12);
    });
    for (const b of L.buttons) {
      if (t < 1) ctx.globalAlpha = 0.4;
      bigButton(ctx, b, { fill: r.won ? C.green : '#7fd0ff', icon: r.won ? 'check' : 'heart', t: G.time });
      ctx.globalAlpha = 1;
    }
  }

  function next() {
    if (r.won) G.go('befriend', r);
    else G.go('zone', r.zone);
  }

  return {
    start,
    layout,
    update(dt) { t += dt; },
    draw,
    tap(x, y) {
      if (t < 1) return;
      if (hit(L.buttons[0], x, y)) {
        play('tap');
        next();
      }
    },
    buttons: () => (L ? L.buttons : []),
    debug: { result: () => r, next },
  };
}

// ---------------------------------------------------------------------------------------------
// Befriending
// ---------------------------------------------------------------------------------------------

export function createBefriendScreen(G) {
  let r = null;
  let choices = [];
  let chosen = null;
  let tries = 0;
  let state = 'pick'; // pick | offer | fly | munch | joined | more
  let st = 0;
  let snack = 0;
  let L = null;
  let joined = null;

  function start(res) {
    r = res;
    choices = res.foes;
    chosen = choices.length === 1 ? choices[0] : null;
    state = chosen ? 'offer' : 'pick';
    tries = 0;
    st = 0;
    joined = null;
    layout();
  }

  function layout() {
    L = befriendLayout(G.size.w, G.size.h, choices.length, state === 'pick');
    if (state === 'joined') {
      // the OK button sits where the snacks were, under the new friend
      const snacks = L.buttons.filter((q) => q.id === 'snack');
      const ok = panelLayout(G.size.w, G.size.h, 'ok').buttons[0];
      if (snacks.length) ok.y = snacks[0].y + (snacks[0].h - ok.h) / 2;
      L.buttons = [ok];
    }
  }

  function leave() {
    if (r.boss && r.reward && r.reward.bossFirst) G.go('map');
    else G.go('zone', r.zone);
  }

  function update(dt) {
    st += dt;
    if (state === 'fly' && st > 0.55) {
      state = 'munch';
      st = 0;
      play('munch');
    } else if (state === 'munch' && st > 0.7) {
      if (snackWorks(chosen, tries, Math.random())) {
        const mon = befriend(G.progress, chosen);
        if (!mon) G.progress.coins += 10;
        joined = mon;
        G.save();
        state = 'joined';
        play('join');
      } else {
        tries += 1;
        state = 'more';
      }
      st = 0;
      layout();
    }
  }

  function draw(ctx) {
    const { w, h } = G.size;
    drawZoneScene(ctx, ZONES[r.zone].id, w, h, h * 0.55);
    if (state === 'pick') {
      for (const b of L.buttons) {
        if (b.id === 'pick') {
          panel(ctx, b.x, b.y, b.w, b.h, 'rgba(255,246,224,0.92)', { r: 24 });
          ctx.save();
          roundRect(ctx, b.x + 3, b.y + 3, b.w - 6, b.h - 6, 21);
          ctx.clip();
          drawMonster(ctx, choices[b.index], b.x + b.w / 2, b.y + b.h * 0.85, Math.min(b.w * 0.55, b.h * 0.55), { t: G.time + b.index, face: -1, pose: 'idle' });
          ctx.restore();
          drawHeart(ctx, b.x + b.w * 0.85, b.y + b.h * 0.12, Math.min(b.w, b.h) * 0.08);
        }
      }
      drawHeart(ctx, w / 2, L.stage.y + L.stage.h * 0.5, Math.min(w, h) * 0.06);
      cornerIcon(ctx, L.buttons[0], 'cross');
      return;
    }
    const S = L.stage;
    const size = Math.min(S.w * 0.5, S.h * 0.6);
    const mx = w / 2;
    const my = S.y + S.h * 0.82;
    let pose = 'dizzy';
    if (state === 'munch') pose = 'attack';
    else if (state === 'joined') pose = 'happy';
    else if (state === 'more' || state === 'offer') pose = tries > 0 ? 'happy' : st < 1.2 ? 'dizzy' : 'idle';
    drawMonster(ctx, chosen, mx, my, size, { t: G.time, face: -1, pose, p: state === 'munch' ? Math.min(1, st / 0.35) * 0.5 : 1 });
    // the friendship hearts: one more fills with every snack
    const full = state === 'joined' ? 3 : Math.min(2, tries);
    const hs = Math.min(w, h) * 0.04;
    for (let i = 0; i < 3; i++) {
      drawHeart(ctx, mx + (i - 1) * hs * 2.6, S.y + hs * 1.6, hs * (i < full ? 1 + Math.sin(G.time * 6 + i) * 0.06 : 0.85), i < full ? C.heart : 'rgba(255,255,255,0.5)');
    }
    if (state === 'more' || state === 'offer') {
      // the monster wants a snack: a thought bubble with a snack in it
      const bx = mx + size * 0.45;
      const by = my - size * 1.05;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(bx, by, size * 0.16, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bx - size * 0.16, by + size * 0.18, size * 0.04, 0, TAU);
      ctx.fill();
      ctx.stroke();
      drawSnack(ctx, SNACKS[Math.floor(G.time) % 3], bx, by, size * 0.09);
    }
    if (state === 'fly') {
      const b = L.buttons.find((q) => q.id === 'snack' && q.index === snack);
      const k = Math.min(1, st / 0.55);
      const sx = b.x + b.w / 2;
      const sy = b.y + b.h / 2;
      const tx = mx - size * 0.04;
      const ty = my - size * 0.42;
      const x = sx + (tx - sx) * k;
      const y = sy + (ty - sy) * k - Math.sin(k * Math.PI) * size * 0.5;
      drawSnack(ctx, SNACKS[snack], x, y, b.w * 0.3 * (1 - k * 0.4));
    }
    if (state === 'munch') {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + st * 4;
        ctx.fillStyle = ['#ffb02e', '#f2c46b', '#fff6e0'][snack];
        ctx.beginPath();
        ctx.arc(mx + Math.cos(a) * size * 0.3 * st * 2, my - size * 0.4 + Math.sin(a) * size * 0.2 * st * 2, 4, 0, TAU);
        ctx.fill();
      }
    }
    if (state === 'joined') {
      confetti(ctx, w, h, st, 60);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + G.time;
        drawHeart(ctx, mx + Math.cos(a) * size * 0.6, my - size * 0.5 + Math.sin(a) * size * 0.3, size * 0.05);
      }
      for (const b of L.buttons) bigButton(ctx, b, { fill: C.green, icon: 'check', t: G.time, pulse: 1 });
      return;
    }
    for (const b of L.buttons) {
      if (b.id === 'snack') {
        const busy = state === 'fly' || state === 'munch';
        panel(ctx, b.x, b.y, b.w, b.h, busy ? '#e6e0f5' : '#fff6e0', { r: 24 });
        drawSnack(ctx, SNACKS[b.index], b.x + b.w / 2, b.y + b.h / 2 + Math.sin(G.time * 4 + b.index) * 3, b.w * 0.3);
      }
    }
    cornerIcon(ctx, L.buttons[0], 'cross');
  }

  function tap(x, y) {
    const b = L.buttons.find((q) => hit(q, x, y));
    if (!b) return;
    if (b.id === 'skip') {
      play('tap');
      leave();
    } else if (b.id === 'pick') {
      chosen = choices[b.index];
      state = 'offer';
      st = 0;
      play('tap');
      layout();
    } else if (b.id === 'snack' && (state === 'offer' || state === 'more')) {
      snack = b.index;
      state = 'fly';
      st = 0;
      play('tap');
    } else if (b.id === 'ok' && state === 'joined') {
      play('tap');
      leave();
    }
  }

  return {
    start,
    layout,
    update,
    draw,
    tap,
    buttons: () => (L ? L.buttons : []),
    debug: { state: () => state, joined: () => joined, tries: () => tries },
  };
}
