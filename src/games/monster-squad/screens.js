// The screens around the battles: the monster maker, hatching, the map, a zone, the squad
// (roster and team), upgrading a monster, evolving, and the monster book.
import { PART_KEYS, PART_LISTS, STATS, MAX_PIP } from './parts.js';
import {
  randomParts, makeName, pipsOf, statsOf, xpNeed, canEvolve, nextEvolveLevel, MAX_TRAIN, MAX_MOVE, MAX_STAGE, MOVES,
} from './monster.js';
import { ZONES, SPECIES, speciesIn, BOSS_WINS } from './world.js';
import {
  makeMonster, zoneOpen, bossReady, teamMons, findMon, setTeamSlot, inTeam, trainPrice, movePrice, evolvePrice,
  buyTrain, buyMove, buyEvolve, buyToken, tokenPrice, caughtCount, canAffordAny,
} from './progress.js';
import {
  makerLayout, mapLayout, zoneLayout, squadLayout, upgradeLayout, bookLayout, panelLayout,
} from './layout.js';
import { drawMonster, drawMonsterStill, drawStarShape } from './draw-monster.js';
import { drawZoneScene, drawMapScene, drawZoneIcon } from './scenes.js';
import {
  C, TAU, font, roundRect, outlined, panel, cornerIcon, drawIcon, drawCoin, drawElement, drawElementRing,
  drawPips, STAT_COLOUR, coinPill, confetti, bigButton, hit,
} from './ui.js';
import { play } from './sound.js';

const rand = () => (Math.random() * 2 ** 31) | 0;

function backdrop(ctx, w, h, top = '#7a3fd1', bottom = '#ff7ab8') {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  const s = Math.max(40, Math.min(w, h) * 0.08);
  for (let y = 0, r = 0; y < h + s; y += s, r++) {
    for (let x = (r % 2) * s * 0.5; x < w + s; x += s) {
      ctx.beginPath();
      ctx.arc(x, y, s * 0.18, 0, TAU);
      ctx.fill();
    }
  }
}

// Stat bars: four rows (or a 2 x 2 grid) of icon + pips.
function drawStats(ctx, area, pips) {
  const cols = area.cols || 4;
  const rows = Math.ceil(4 / cols);
  const cw = area.w / cols;
  const rh = area.h / rows;
  STATS.forEach((s, i) => {
    const x = area.x + (i % cols) * cw;
    const y = area.y + Math.floor(i / cols) * rh;
    const is = Math.min(rh * 0.34, 18);
    drawIcon(ctx, s, x + is * 1.4, y + rh / 2, is);
    const px = x + is * 2.8;
    drawPips(ctx, px, y + rh / 2 - rh * 0.16, cw - is * 3.2 - 6, rh * 0.32, pips[s], MAX_PIP, STAT_COLOUR[s]);
  });
}

// ---------------------------------------------------------------------------------------------
// The maker
// ---------------------------------------------------------------------------------------------

export function createMaker(G) {
  let parts = null;
  let seed = 1;
  let name = '';
  let tab = 'body';
  let first = false;
  let L = null;
  let changedT = -9;
  let spinT = -9;

  function start(opts = {}) {
    first = !!opts.first;
    seed = rand() + 1;
    parts = randomParts(makeRngLite(seed));
    name = makeName(seed);
    tab = 'body';
    layout();
  }

  function layout() {
    L = makerLayout(G.size.w, G.size.h, { tab, first });
  }

  function tap(x, y) {
    const b = L.buttons.find((q) => hit(q, x, y));
    if (!b) {
      // poking the monster makes it hop
      if (hit(L.preview, x, y)) changedT = G.time;
      return;
    }
    play('tap');
    if (b.id === 'home') G.exit();
    else if (b.id === 'back') G.go('map');
    else if (b.id === 'tab') {
      tab = b.key;
      layout();
    } else if (b.id === 'opt') {
      parts = { ...parts, [tab]: PART_LISTS[tab][b.index].id };
      changedT = G.time;
    } else if (b.id === 'dice') {
      seed = rand() + 1;
      parts = randomParts(makeRngLite(seed));
      name = makeName(seed);
      spinT = G.time;
      changedT = G.time;
    } else if (b.id === 'name') {
      name = makeName(rand() + 1);
      changedT = G.time;
    } else if (b.id === 'done') {
      const mon = makeMonster(G.progress, parts, name, seed);
      if (!mon) {
        G.go('map');
        return;
      }
      G.save();
      G.go('hatch', { mon, first });
    }
  }

  function draw(ctx) {
    const { w, h } = G.size;
    backdrop(ctx, w, h, '#5b2fb8', '#ff8ac4');
    const P = L.preview;
    // a round stage under the monster
    const size = Math.min(P.w * 0.62, P.h * 0.72);
    const gx = P.x + P.w / 2;
    const gy = P.y + P.h * 0.9;
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(gx, gy, size * 0.6, size * 0.12, 0, 0, TAU);
    ctx.fill();
    const dt = G.time - changedT;
    const spin = G.time - spinT;
    ctx.save();
    if (spin < 0.4) {
      ctx.translate(gx, gy - size * 0.4);
      ctx.scale(Math.cos((spin / 0.4) * TAU), 1);
      ctx.translate(-gx, -(gy - size * 0.4));
    }
    drawMonster(ctx, { parts, seed }, gx, gy, size, { t: G.time, pose: dt < 0.9 ? 'happy' : 'idle' });
    ctx.restore();
    // the element ring, so the rule is always in view
    const rr = Math.max(16, Math.min(28, P.w * 0.04));
    drawElementRing(ctx, P.x + P.w - rr * 2.2, P.y + rr * 2, rr, parts.element);
    // name
    const N = L.nameRow;
    panel(ctx, N.cx - N.w / 2, N.y, N.w, N.h, C.white, { r: N.h / 2 });
    outlined(ctx, name, N.cx, N.y + N.h / 2 + 1, N.h * 0.5, C.sun, N.w * 0.85);
    drawStats(ctx, L.stats, pipsOf(parts));
    for (const b of L.buttons) {
      if (b.id === 'home' || b.id === 'back') cornerIcon(ctx, b, b.id);
      else if (b.id === 'dice') bigButton(ctx, b, { fill: C.white, icon: 'dice', t: G.time });
      else if (b.id === 'done') bigButton(ctx, b, { fill: C.green, icon: 'check', pulse: 1, t: G.time });
      else if (b.id === 'name') bigButton(ctx, b, { fill: C.sun, icon: 'reroll', t: G.time });
      else if (b.id === 'tab') {
        const on = b.key === tab;
        panel(ctx, b.x, b.y - (on ? 4 : 0), b.w, b.h, on ? C.sun : 'rgba(255,246,224,0.85)', { r: 14, lw: on ? 4 : 2.5 });
        drawIcon(ctx, `tab-${b.key}`, b.x + b.w / 2, b.y + b.h / 2 - (on ? 4 : 0), Math.min(b.w, b.h) * 0.3);
      } else if (b.id === 'opt') drawOption(ctx, b);
    }
  }

  function drawOption(ctx, b) {
    const id = PART_LISTS[tab][b.index].id;
    const on = parts[tab] === id;
    panel(ctx, b.x, b.y, b.w, b.h, on ? '#fff3a8' : 'rgba(255,255,255,0.88)', { r: 14, lw: on ? 5 : 2.5, shadow: on });
    if (tab === 'element') {
      drawElement(ctx, id, b.x + b.w / 2, b.y + b.h / 2, Math.min(b.w, b.h) * 0.33);
      return;
    }
    const look = { parts: { ...parts, [tab]: id } };
    const s = Math.min(b.w, b.h) * 0.62;
    ctx.save();
    roundRect(ctx, b.x + 2, b.y + 2, b.w - 4, b.h - 4, 12);
    ctx.clip();
    drawMonsterStill(ctx, look, b.x + b.w / 2, b.y + b.h * 0.9, s);
    ctx.restore();
  }

  return {
    start, layout, draw, tap, update() {},
    buttons: () => (L ? L.buttons : []),
    debug: { parts: () => ({ ...parts }), name: () => name, setParts: (p) => { parts = { ...parts, ...p }; } },
  };
}

// A tiny seeded generator for the maker's dice (same as rng.js but local to keep imports light).
function makeRngLite(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------------------------
// Hatching a new monster, and evolving one: the same celebration
// ---------------------------------------------------------------------------------------------

export function createCelebrate(G) {
  let info = null; // { mon, first, evolve: bool, from }
  let L = null;
  let t = 0;

  function start(i) {
    info = i;
    t = 0;
    layout();
    play(i.evolve ? 'special' : 'tap');
    setTimeout(() => play('join'), 1000);
  }
  function layout() {
    L = panelLayout(G.size.w, G.size.h, 'ok');
  }

  function draw(ctx) {
    const { w, h } = G.size;
    backdrop(ctx, w, h, info.evolve ? '#2a1a6b' : '#5b2fb8', info.evolve ? '#ff4fa3' : '#ffb36b');
    // light rays
    ctx.save();
    ctx.translate(w / 2, h * 0.45);
    ctx.rotate(G.time * 0.3);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let i = 0; i < 12; i++) {
      ctx.rotate(TAU / 12);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-40, -Math.max(w, h));
      ctx.lineTo(40, -Math.max(w, h));
      ctx.fill();
    }
    ctx.restore();
    const size = Math.min(w * 0.55, h * 0.36);
    const gx = w / 2;
    const gy = h * 0.62;
    const pop = 1.0;
    if (t < pop) {
      if (info.evolve) {
        // flashing between the old and the new look
        const fl = Math.floor(t * (4 + t * 14)) % 2;
        drawMonster(ctx, info.mon, gx, gy, size, { t: G.time, stage: fl ? info.mon.stage : info.from });
      } else {
        // the egg wobbles and cracks
        const wob = Math.sin(t * 30) * 0.12 * t;
        ctx.save();
        ctx.translate(gx, gy);
        ctx.rotate(wob);
        drawIcon(ctx, 'egg', 0, -size * 0.45, size * 0.45);
        ctx.restore();
      }
    } else {
      drawMonster(ctx, info.mon, gx, gy, size, { t: G.time, pose: t < pop + 1.5 ? 'happy' : 'idle' });
      confetti(ctx, w, h, t - pop, 70);
      const k = Math.min(1, (t - pop) * 3);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + t;
        drawStarShape(ctx, gx + Math.cos(a) * size * 0.75 * k, gy - size * 0.5 + Math.sin(a) * size * 0.5 * k, size * 0.05, C.sun, 2);
      }
      outlined(ctx, info.mon.name, w / 2, h * 0.14, Math.min(w * 0.1, 54), C.sun, w * 0.8);
      if (info.evolve) {
        for (let i = 0; i < info.mon.stage; i++) drawIcon(ctx, 'crown', w / 2 + (i - (info.mon.stage - 1) / 2) * 50, h * 0.22, 18);
      }
    }
    if (t > pop + 0.6) bigButton(ctx, L.buttons[0], { fill: C.green, icon: 'check', pulse: 1, t: G.time });
  }

  return {
    start, layout, draw,
    update(dt) { t += dt; },
    tap(x, y) {
      if (t < 1.6 || !hit(L.buttons[0], x, y)) return;
      play('tap');
      if (info.evolve) G.go('upgrade', info.mon.uid);
      else G.go(info.first ? 'zone' : 'squad', info.first ? 0 : undefined);
    },
    buttons: () => (L && t > 1.6 ? L.buttons : []),
  };
}

// ---------------------------------------------------------------------------------------------
// The map
// ---------------------------------------------------------------------------------------------

export function createMap(G) {
  let L = null;
  let nope = { id: null, t: -9 };
  function layout() {
    L = mapLayout(G.size.w, G.size.h);
  }
  function draw(ctx) {
    const { w, h } = G.size;
    const p = G.progress;
    drawMapScene(ctx, w, h, L.area, L.buttons);
    const next = p.zones.findIndex((z) => !z.boss);
    for (const b of L.buttons) {
      if (b.id === 'zone') {
        const i = b.index;
        const open = zoneOpen(p, i);
        const shakeX = nope.id === `zone${i}` && G.time - nope.t < 0.3 ? Math.sin(G.time * 60) * 5 : 0;
        const cx = b.cx + shakeX;
        if (i === next && open) {
          ctx.strokeStyle = `rgba(255,225,77,${0.6 + Math.sin(G.time * 5) * 0.4})`;
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.arc(cx, b.cy, b.r + 10 + Math.sin(G.time * 5) * 3, 0, TAU);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(22,11,51,0.35)';
        ctx.beginPath();
        ctx.arc(cx, b.cy + 6, b.r, 0, TAU);
        ctx.fill();
        drawZoneIcon(ctx, ZONES[i].id, cx, b.cy, b.r, G.time);
        if (!open) {
          ctx.fillStyle = 'rgba(40,30,70,0.7)';
          ctx.beginPath();
          ctx.arc(cx, b.cy, b.r, 0, TAU);
          ctx.fill();
          drawIcon(ctx, 'lock', cx, b.cy, b.r * 0.35, C.white);
        }
        ctx.lineWidth = 5;
        ctx.strokeStyle = C.ink;
        ctx.beginPath();
        ctx.arc(cx, b.cy, b.r, 0, TAU);
        ctx.stroke();
        if (p.zones[i].boss) drawIcon(ctx, 'crown', cx + b.r * 0.7, b.cy - b.r * 0.75, b.r * 0.3);
        // wins toward the boss, as dots under the zone
        if (open && !p.zones[i].boss) {
          const wins = Math.min(BOSS_WINS, p.zones[i].wins);
          for (let k = 0; k < BOSS_WINS; k++) {
            ctx.fillStyle = k < wins ? C.sun : 'rgba(255,255,255,0.5)';
            ctx.strokeStyle = C.ink;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx + (k - (BOSS_WINS - 1) / 2) * b.r * 0.38, b.cy + b.r + 12, b.r * 0.13, 0, TAU);
            ctx.fill();
            ctx.stroke();
          }
        }
      } else if (b.id === 'home') cornerIcon(ctx, b, 'home');
      else if (b.id === 'squad') {
        bigButton(ctx, b, { fill: '#bfe9ff', icon: 'squad', t: G.time });
      } else if (b.id === 'book') {
        bigButton(ctx, b, { fill: '#ffe98a', icon: 'book', number: `${caughtCount(p)}/${SPECIES.length}`, t: G.time });
      } else if (b.id === 'maker') {
        const shakeX = nope.id === 'maker' && G.time - nope.t < 0.3 ? Math.sin(G.time * 60) * 5 : 0;
        ctx.save();
        ctx.translate(shakeX, 0);
        if (p.tokens > 0) bigButton(ctx, b, { fill: '#ffc6e2', icon: 'egg', number: p.tokens, pulse: 1, t: G.time });
        else bigButton(ctx, b, { fill: '#ffc6e2', icon: 'egg', number: tokenPrice(p), coin: true, dim: p.coins < tokenPrice(p), t: G.time });
        ctx.restore();
      }
    }
    // a bouncing arrow over the zone to play next
    const nb = L.buttons.find((q) => q.id === 'zone' && q.index === next);
    if (nb && zoneOpen(p, next)) {
      const ay = nb.cy - nb.r - 10 - Math.abs(Math.sin(G.time * 4)) * 12;
      ctx.fillStyle = C.sun;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(nb.cx - 18, ay - 22);
      ctx.lineTo(nb.cx + 18, ay - 22);
      ctx.lineTo(nb.cx, ay);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // the team peeking from the squad button
    const sq = L.buttons.find((q) => q.id === 'squad');
    teamMons(p).forEach((m, i) => drawMonsterStill(ctx, m, sq.x + sq.w * (0.2 + i * 0.3), sq.y - 2, Math.min(sq.h * 0.6, 50)));
    coinPill(ctx, L.coins.x, L.coins.y, L.coins.h, p.coins);
  }
  function tap(x, y) {
    const b = L.buttons.find((q) => hit(q, x, y));
    if (!b) return;
    const p = G.progress;
    if (b.id === 'home') {
      play('tap');
      G.exit();
    } else if (b.id === 'zone') {
      if (zoneOpen(p, b.index)) {
        play('tap');
        G.go('zone', b.index);
      } else {
        play('nope');
        nope = { id: `zone${b.index}`, t: G.time };
      }
    } else if (b.id === 'squad') {
      play('tap');
      G.go('squad', { from: null });
    } else if (b.id === 'book') {
      play('tap');
      G.go('book');
    } else if (b.id === 'maker') {
      if (p.tokens > 0 || buyToken(p)) {
        play('tap');
        G.save();
        G.go('maker');
      } else {
        play('nope');
        nope = { id: 'maker', t: G.time };
      }
    }
  }
  return { start() { layout(); }, layout, draw, tap, update() {}, buttons: () => (L ? L.buttons : []) };
}

// ---------------------------------------------------------------------------------------------
// A zone: who lives here, the team, fight and boss
// ---------------------------------------------------------------------------------------------

export function createZone(G) {
  let L = null;
  let zi = 0;
  let nopeT = -9;
  function layout() {
    L = zoneLayout(G.size.w, G.size.h);
  }
  function draw(ctx) {
    const { w, h } = G.size;
    const p = G.progress;
    drawZoneScene(ctx, ZONES[zi].id, w, h, L.species.y + L.species.h * 0.62);
    // the species living here: in colour once befriended, a shadow until then
    const S = L.species;
    const list = speciesIn(zi);
    const cols = S.cols;
    const rows = Math.ceil(list.length / cols);
    const cw = S.w / cols;
    const ch = Math.min(S.h / rows, cw * 1.3);
    const y0 = S.y + (S.h - ch * rows) / 2;
    list.forEach((sp, i) => {
      const row = Math.floor(i / cols);
      const inRow = Math.min(cols, list.length - row * cols);
      const x = S.x + (S.w - inRow * cw) / 2 + (i - row * cols + 0.5) * cw;
      const y = y0 + (row + 1) * ch - ch * 0.12;
      const look = { parts: sp.parts, stage: sp.rarity === 'boss' ? 2 : sp.rarity === 'rare' ? 1 : 0 };
      const size = Math.min(cw * 0.75, ch * 0.62);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(x, y, size * 0.45, size * 0.1, 0, 0, TAU);
      ctx.fill();
      if (p.caught[sp.id]) drawMonsterStill(ctx, look, x, y, size);
      else drawMonsterStill(ctx, look, x, y, size, { silhouette: p.seen[sp.id] ? 'rgba(60,40,110,0.85)' : 'rgba(22,11,51,0.9)' });
      if (!p.caught[sp.id] && !p.seen[sp.id]) outlined(ctx, '?', x, y - size * 0.45, size * 0.35, C.white);
      if (sp.rarity === 'boss') drawIcon(ctx, 'crown', x + size * 0.4, y - size * 0.9, size * 0.13);
      if (sp.rarity === 'rare') drawStarShape(ctx, x + size * 0.4, y - size * 0.85, size * 0.11, '#7ef0ff', 2);
    });
    drawZoneIcon(ctx, ZONES[zi].id, w - 50, L.buttons[0].y + L.buttons[0].h / 2, Math.min(30, L.buttons[0].h * 0.5), G.time);
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.ink;
    ctx.beginPath();
    ctx.arc(w - 50, L.buttons[0].y + L.buttons[0].h / 2, Math.min(30, L.buttons[0].h * 0.5), 0, TAU);
    ctx.stroke();
    for (const b of L.buttons) {
      if (b.id === 'back') cornerIcon(ctx, b, 'back');
      else if (b.id === 'team') {
        panel(ctx, b.x, b.y, b.w, b.h, 'rgba(255,246,224,0.82)', { r: 22, lw: 3 });
        const team = teamMons(p);
        team.forEach((m, i) => {
          const x = b.x + b.w * (0.2 + i * 0.3);
          drawMonster(ctx, m, x, b.y + b.h * 0.9, b.h * 0.7, { t: G.time + i });
          drawElement(ctx, m.parts.element, x - b.h * 0.3, b.y + b.h * 0.18, b.h * 0.1);
          outlined(ctx, String(m.lv), x + b.h * 0.3, b.y + b.h * 0.18, b.h * 0.18, C.sun);
        });
      } else if (b.id === 'fight') {
        bigButton(ctx, b, { fill: C.green, icon: 'fist', pulse: 1, t: G.time, iconScale: 1.3 });
      } else if (b.id === 'boss') {
        const ready = bossReady(p, zi);
        const sx = G.time - nopeT < 0.3 ? Math.sin(G.time * 60) * 5 : 0;
        ctx.save();
        ctx.translate(sx, 0);
        bigButton(ctx, b, { fill: p.zones[zi].boss ? '#ffe98a' : '#ff9ccf', icon: 'crown', dim: !ready, pulse: ready && !p.zones[zi].boss ? 1 : 0, t: G.time });
        if (!ready) {
          drawIcon(ctx, 'lock', b.x + b.w * 0.82, b.y + b.h * 0.25, b.h * 0.12, C.ink);
          const wins = Math.min(BOSS_WINS, p.zones[zi].wins);
          for (let k = 0; k < BOSS_WINS; k++) {
            ctx.fillStyle = k < wins ? C.sun : 'rgba(255,255,255,0.7)';
            ctx.strokeStyle = C.ink;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(b.x + b.w / 2 + (k - (BOSS_WINS - 1) / 2) * b.h * 0.2, b.y + b.h * 0.85, b.h * 0.06, 0, TAU);
            ctx.fill();
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    }
  }
  function tap(x, y) {
    const b = L.buttons.find((q) => hit(q, x, y));
    if (!b) return;
    if (b.id === 'back') {
      play('tap');
      G.go('map');
    } else if (b.id === 'team') {
      play('tap');
      G.go('squad', { from: zi });
    } else if (b.id === 'fight') {
      play('tap');
      G.go('battle', { zone: zi, boss: false });
    } else if (b.id === 'boss') {
      if (bossReady(G.progress, zi)) {
        play('tap');
        G.go('battle', { zone: zi, boss: true });
      } else {
        play('nope');
        nopeT = G.time;
      }
    }
  }
  return {
    start(i) {
      if (Number.isInteger(i)) zi = i;
      layout();
    },
    layout, draw, tap, update() {},
    zone: () => zi,
    buttons: () => (L ? L.buttons : []),
  };
}

// ---------------------------------------------------------------------------------------------
// The squad: three team slots and the whole roster to pick from
// ---------------------------------------------------------------------------------------------

export function createSquad(G) {
  let L = null;
  let page = 0;
  let slot = 0;
  let from = null; // a zone to go back to
  let popT = { uid: null, t: -9 };
  const ordered = () => [...G.progress.roster].reverse(); // newest first

  function layout() {
    L = squadLayout(G.size.w, G.size.h, G.progress.roster.length, page);
    page = L.page;
  }
  function draw(ctx) {
    const { w, h } = G.size;
    const p = G.progress;
    backdrop(ctx, w, h, '#1f8fc9', '#6fe0c0');
    const list = ordered();
    for (const b of L.buttons) {
      if (b.id === 'back') cornerIcon(ctx, b, 'back');
      else if (b.id === 'slot') {
        const m = findMon(p, p.team[b.index]);
        const on = b.index === slot;
        panel(ctx, b.x, b.y, b.w, b.h, on ? '#fff3a8' : 'rgba(255,246,224,0.9)', { r: 24, lw: on ? 6 : 3 });
        if (m) {
          const pose = popT.uid === m.uid && G.time - popT.t < 0.8 ? 'happy' : 'idle';
          drawMonster(ctx, m, b.x + b.w / 2, b.y + b.h * 0.9, Math.min(b.w * 0.62, b.h * 0.66), { t: G.time + b.index, pose });
          drawElement(ctx, m.parts.element, b.x + 22, b.y + 22, 14);
          ctx.fillStyle = C.night;
          ctx.beginPath();
          ctx.arc(b.x + b.w - 24, b.y + 24, 17, 0, TAU);
          ctx.fill();
          outlined(ctx, String(m.lv), b.x + b.w - 24, b.y + 25, 18, C.sun);
        } else drawIcon(ctx, 'plus', b.x + b.w / 2, b.y + b.h / 2, b.w * 0.12, 'rgba(42,22,54,0.35)');
      } else if (b.id === 'up') {
        const m = findMon(p, p.team[b.index]);
        if (!m) continue;
        const can = canAffordAny(p, m);
        bigButton(ctx, b, { fill: can ? C.green : '#d8f7e0', icon: 'up', pulse: can ? 1 : 0, t: G.time });
        if (canEvolve(m) && evolvePrice(m) != null) drawStarShape(ctx, b.x + b.w - 8, b.y + 6, 12, C.sun, 2);
      } else if (b.id === 'mon') {
        const m = list[b.index];
        const on = inTeam(p, m.uid);
        panel(ctx, b.x, b.y, b.w, b.h, on ? '#fff3a8' : 'rgba(255,255,255,0.85)', { r: 14, lw: on ? 4 : 2, shadow: false });
        drawMonsterStill(ctx, m, b.x + b.w / 2, b.y + b.h * 0.92, Math.min(b.w, b.h) * 0.62);
        outlined(ctx, String(m.lv), b.x + b.w - 14, b.y + 14, 15, C.sun);
        drawElement(ctx, m.parts.element, b.x + 13, b.y + 13, 9);
        if (on) drawIcon(ctx, 'check', b.x + b.w - 14, b.y + b.h - 14, 8, C.greenDark);
      } else if (b.id === 'prev' || b.id === 'next') bigButton(ctx, b, { fill: C.white, icon: b.id === 'prev' ? 'back' : 'next' });
    }
    // page dots
    if (L.pages > 1) {
      const n = Math.min(L.pages, 12);
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = i === page ? C.sun : 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(w / 2 + (i - (n - 1) / 2) * 20, L.nav.y + L.nav.h / 2, 6, 0, TAU);
        ctx.fill();
      }
    }
    outlined(ctx, String(p.roster.length), w - 40, L.buttons[0].y + L.buttons[0].h / 2, 26, C.white);
    drawIcon(ctx, 'squad', w - 90, L.buttons[0].y + L.buttons[0].h / 2, 16);
  }
  function tap(x, y) {
    const b = L.buttons.find((q) => hit(q, x, y));
    if (!b) return;
    const p = G.progress;
    play('tap');
    if (b.id === 'back') G.go(from != null ? 'zone' : 'map', from != null ? from : undefined);
    else if (b.id === 'slot') {
      if (slot === b.index && p.team[b.index]) G.go('upgrade', p.team[b.index]);
      else slot = b.index;
    } else if (b.id === 'up') {
      if (p.team[b.index]) G.go('upgrade', p.team[b.index]);
    } else if (b.id === 'mon') {
      const m = ordered()[b.index];
      const s = Math.min(slot, p.team.length);
      if (setTeamSlot(p, s, m.uid)) {
        popT = { uid: m.uid, t: G.time };
        G.save();
        slot = Math.min(2, Math.min(p.team.length, s + 1) % 3);
      }
    } else if (b.id === 'prev') {
      page -= 1;
      layout();
    } else if (b.id === 'next') {
      page += 1;
      layout();
    }
  }
  return {
    // opts.from: a zone to go back to (null for the map); left out, it stays as it was
    start(opts) {
      if (opts && 'from' in opts) from = Number.isInteger(opts.from) ? opts.from : null;
      layout();
    },
    layout, draw, tap, update() {},
    buttons: () => (L ? L.buttons : []),
  };
}

// ---------------------------------------------------------------------------------------------
// Upgrading one monster: train stats, learn and power up moves, evolve
// ---------------------------------------------------------------------------------------------

export function createUpgrade(G) {
  let L = null;
  let uid = null;
  let fx = { key: null, t: -9, ok: true };
  function layout() {
    L = upgradeLayout(G.size.w, G.size.h);
  }
  const mon = () => findMon(G.progress, uid);

  function draw(ctx) {
    const { w, h } = G.size;
    const p = G.progress;
    const m = mon();
    backdrop(ctx, w, h, '#2f7ad1', '#9be3ff');
    if (!m) return;
    const P = L.preview;
    const size = Math.min(P.w * 0.55, P.h * 0.66);
    const happy = fx.ok && G.time - fx.t < 0.9;
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(P.x + P.w / 2, P.y + P.h * 0.84, size * 0.6, size * 0.12, 0, 0, TAU);
    ctx.fill();
    drawMonster(ctx, m, P.x + P.w / 2, P.y + P.h * 0.84, size, { t: G.time, pose: happy ? 'happy' : 'idle' });
    // level and xp
    const lx = P.x + P.w / 2;
    const ly = P.y + P.h - 26;
    const bw = Math.min(P.w * 0.5, 220);
    ctx.fillStyle = 'rgba(22,11,51,0.35)';
    roundRect(ctx, lx - bw / 2, ly, bw, 14, 7);
    ctx.fill();
    ctx.fillStyle = C.sky;
    roundRect(ctx, lx - bw / 2, ly, Math.max(14, (bw * m.xp) / xpNeed(m.lv)), 14, 7);
    ctx.fill();
    ctx.fillStyle = C.night;
    ctx.beginPath();
    ctx.arc(lx - bw / 2 - 24, ly + 7, 20, 0, TAU);
    ctx.fill();
    outlined(ctx, String(m.lv), lx - bw / 2 - 24, ly + 8, 20, C.sun);
    drawElement(ctx, m.parts.element, lx + bw / 2 + 24, ly + 7, 16);
    for (let i = 0; i < m.stage; i++) drawIcon(ctx, 'crown', P.x + 30 + i * 36, P.y + 20, 14);
    const st = statsOf(m);
    for (const r of L.rows) {
      panel(ctx, r.x, r.y, r.w, r.h, 'rgba(255,246,224,0.92)', { r: 16, lw: 2.5, shadow: false });
      const is = Math.min(r.h * 0.26, 20);
      const btn = L.buttons.find((q) => q.id === (r.kind === 'train' ? 'train' : 'learn') && q.key === r.key);
      const room = btn.x - 8 - (r.x + is * 3.2); // space between the icon and the button
      if (r.kind === 'train') {
        drawIcon(ctx, r.key, r.x + is * 1.5, r.y + r.h / 2, is);
        const nw = Math.min(room * 0.3, is * 2.4);
        outlined(ctx, String(st[r.key]), r.x + is * 3.2 + nw / 2, r.y + r.h / 2 + 1, is * 1.05, C.white);
        drawPips(ctx, r.x + is * 3.2 + nw + 6, r.y + r.h / 2 - r.h * 0.1, room - nw - 6, r.h * 0.2, m.train[r.key], MAX_TRAIN, STAT_COLOUR[r.key]);
      } else {
        const icon = r.key === 'bonk' ? 'fist' : r.key === 'blast' ? m.parts.element : r.key;
        drawIcon(ctx, icon, r.x + is * 1.6, r.y + r.h / 2, is);
        const lv = m.moves[r.key];
        const step = Math.min(is * 1.5, room / 3);
        for (let i = 0; i < MAX_MOVE; i++) drawStarShape(ctx, r.x + is * 3.2 + step * (i + 0.5), r.y + r.h / 2, Math.min(is * 0.6, step * 0.42), i < lv ? C.sun : 'rgba(42,22,54,0.18)', 1.5);
      }
    }
    for (const b of L.buttons) {
      const shake = fx.key === `${b.id}${b.key || ''}` && !fx.ok && G.time - fx.t < 0.3 ? Math.sin(G.time * 60) * 4 : 0;
      ctx.save();
      ctx.translate(shake, 0);
      if (b.id === 'back') cornerIcon(ctx, b, 'back');
      else if (b.id === 'train') priceButton(ctx, b, trainPrice(m, b.key), p.coins);
      else if (b.id === 'learn') priceButton(ctx, b, movePrice(m, b.key), p.coins, m.moves[b.key] === 0 ? 'plus' : 'up');
      else if (b.id === 'evolve') {
        if (m.stage >= MAX_STAGE) bigButton(ctx, b, { fill: '#ffe98a', icon: 'crown' });
        else if (canEvolve(m)) bigButton(ctx, b, { fill: '#ff9ccf', icon: 'special', number: evolvePrice(m), coin: true, pulse: p.coins >= evolvePrice(m) ? 1 : 0, dim: p.coins < evolvePrice(m), t: G.time });
        else {
          bigButton(ctx, b, { fill: '#ff9ccf', icon: 'lock', number: nextEvolveLevel(m), dim: true });
        }
      }
      ctx.restore();
      if (fx.ok && fx.key === `${b.id}${b.key || ''}` && G.time - fx.t < 0.7) {
        const k = (G.time - fx.t) / 0.7;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU;
          drawStarShape(ctx, b.x + b.w / 2 + Math.cos(a) * b.w * 0.6 * k, b.y + b.h / 2 + Math.sin(a) * b.h * 0.8 * k, 8 * (1 - k), C.sun, 1.5);
        }
      }
    }
    coinPill(ctx, L.coins.x, L.coins.y, L.coins.h, p.coins);
  }

  function priceButton(ctx, b, price, coins, icon = 'up') {
    if (price == null) {
      panel(ctx, b.x, b.y, b.w, b.h, '#ffe98a', { r: 14 });
      drawStarShape(ctx, b.x + b.w / 2, b.y + b.h / 2, b.h * 0.3, C.sun, 2);
      return;
    }
    const can = coins >= price;
    panel(ctx, b.x, b.y, b.w, b.h, can ? C.green : '#d8d2e6', { r: 14 });
    const px = Math.min(b.h * 0.42, b.w * 0.26);
    drawIcon(ctx, icon, b.x + b.w * 0.2, b.y + b.h / 2, px * 0.5);
    drawCoin(ctx, b.x + b.w * 0.45, b.y + b.h / 2, px * 0.38);
    outlined(ctx, String(price), b.x + b.w * 0.73, b.y + b.h / 2 + 1, px, can ? C.white : '#efeaf7', b.w * 0.42);
  }

  function tap(x, y) {
    const b = L.buttons.find((q) => hit(q, x, y));
    if (!b) return;
    const p = G.progress;
    const m = mon();
    if (b.id === 'back') {
      play('tap');
      G.go('squad');
      return;
    }
    if (!m) return;
    let ok = false;
    if (b.id === 'train') ok = buyTrain(p, m.uid, b.key);
    else if (b.id === 'learn') ok = buyMove(p, m.uid, b.key);
    else if (b.id === 'evolve') {
      const from = m.stage;
      if (buyEvolve(p, m.uid)) {
        G.save();
        G.go('evolve', { mon: m, evolve: true, from });
        return;
      }
    }
    fx = { key: `${b.id}${b.key || ''}`, t: G.time, ok };
    play(ok ? 'coin' : 'nope');
    if (ok) G.save();
  }

  return {
    start(u) {
      if (u != null) uid = u;
      layout();
    },
    layout, draw, tap, update() {},
    buttons: () => (L ? L.buttons : []),
    uid: () => uid,
  };
}

// ---------------------------------------------------------------------------------------------
// The monster book: every species, zone by zone
// ---------------------------------------------------------------------------------------------

export function createBook(G) {
  let L = null;
  let zi = 0;
  function layout() {
    L = bookLayout(G.size.w, G.size.h);
  }
  function draw(ctx) {
    const { w, h } = G.size;
    const p = G.progress;
    backdrop(ctx, w, h, '#b0662f', '#ffd08a');
    const list = speciesIn(zi);
    L.cards.forEach((c, i) => {
      const sp = list[i];
      if (!sp) return;
      const got = p.caught[sp.id];
      panel(ctx, c.x, c.y, c.w, c.h, got ? '#fff6e0' : '#e9dcc4', { r: 18, lw: 3 });
      const look = { parts: sp.parts, stage: sp.rarity === 'boss' ? 2 : sp.rarity === 'rare' ? 1 : 0 };
      const size = Math.min(c.w * 0.62, c.h * 0.6);
      ctx.save();
      roundRect(ctx, c.x + 2, c.y + 2, c.w - 4, c.h - 4, 16);
      ctx.clip();
      if (got) drawMonster(ctx, look, c.x + c.w / 2, c.y + c.h * 0.8, size, { t: G.time + i });
      else drawMonsterStill(ctx, look, c.x + c.w / 2, c.y + c.h * 0.8, size, { silhouette: p.seen[sp.id] ? 'rgba(60,40,110,0.8)' : 'rgba(22,11,51,0.85)' });
      ctx.restore();
      if (got) {
        outlined(ctx, sp.name, c.x + c.w / 2, c.y + c.h * 0.9, Math.min(c.h * 0.08, 18), C.white, c.w * 0.9);
        drawElement(ctx, sp.parts.element, c.x + 18, c.y + 18, 11);
        if (got > 1) outlined(ctx, `x${got}`, c.x + c.w - 22, c.y + 18, 16, C.sun);
      } else outlined(ctx, '?', c.x + c.w / 2, c.y + c.h * 0.45, c.h * 0.2, C.white);
      if (sp.rarity === 'boss') drawIcon(ctx, 'crown', c.x + c.w - 22, c.y + c.h - 22, 12);
      if (sp.rarity === 'rare') drawStarShape(ctx, c.x + c.w - 22, c.y + c.h - 22, 11, '#7ef0ff', 2);
    });
    for (const b of L.buttons) {
      if (b.id === 'back') cornerIcon(ctx, b, 'back');
      else if (b.id === 'ztab') {
        const on = b.index === zi;
        const r = Math.min(b.w, b.h) * 0.42;
        if (on) {
          ctx.fillStyle = C.sun;
          ctx.beginPath();
          ctx.arc(b.x + b.w / 2, b.y + b.h / 2, r + 6, 0, TAU);
          ctx.fill();
        }
        drawZoneIcon(ctx, ZONES[b.index].id, b.x + b.w / 2, b.y + b.h / 2, r, G.time);
        ctx.lineWidth = 3;
        ctx.strokeStyle = C.ink;
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, b.y + b.h / 2, r, 0, TAU);
        ctx.stroke();
        const n = speciesIn(b.index).filter((s) => p.caught[s.id]).length;
        if (n === 7) drawStarShape(ctx, b.x + b.w - 8, b.y + 8, 9, C.sun, 1.5);
      }
    }
    const bx = L.buttons[0];
    drawIcon(ctx, 'book', w - 150, bx.y + bx.h / 2, 18);
    outlined(ctx, `${caughtCount(p)} / ${SPECIES.length}`, w - 70, bx.y + bx.h / 2, 26, C.white);
  }
  function tap(x, y) {
    const b = L.buttons.find((q) => hit(q, x, y));
    if (!b) return;
    play('tap');
    if (b.id === 'back') G.go('map');
    else if (b.id === 'ztab') zi = b.index;
  }
  return { start() { layout(); }, layout, draw, tap, update() {}, buttons: () => (L ? L.buttons : []) };
}

export { MOVES, PART_KEYS, font };
