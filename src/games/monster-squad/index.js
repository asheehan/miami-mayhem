// Monster Squad as a launcher game: build monsters, battle wild ones around Miami, befriend
// them, upgrade and evolve the squad. Rules live in the pure modules (parts, monster, world,
// battle, progress, layout, bot); drawing in draw-monster.js, ui.js and scenes.js; the
// screens in screens.js and fight.js. This file owns the current screen, saving and the
// window.__monsters debug handle.
import { loadProgress, saveProgress, newProgress, makeMonster, teamMons, SAVE_KEY } from './progress.js';
import { randomParts, makeName, powerOf } from './monster.js';
import { makeRng } from './rng.js';
import { drawTile } from './scenes.js';
import {
  createMaker, createCelebrate, createMap, createZone, createSquad, createUpgrade, createBook,
} from './screens.js';
import { createBattleScreen, createResultScreen, createBefriendScreen } from './fight.js';
import { wake } from './sound.js';

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const monsterSquad = {
  id: 'monster-squad',
  title: 'Monster Squad',
  drawTile,
  create,
};

function create(host) {
  const store = storage();
  const G = {
    size: { w: 1, h: 1 },
    time: 0,
    progress: store ? loadProgress(store) : newProgress(),
    saved: true,
    save() {
      G.saved = store ? saveProgress(store, G.progress) : false;
      return G.saved;
    },
    exit() {
      G.save();
      if (typeof window !== 'undefined' && window.__monsters && window.__monsters.owner === G) delete window.__monsters;
      host.exit();
    },
    go,
  };

  const screens = {
    maker: createMaker(G),
    hatch: createCelebrate(G),
    evolve: createCelebrate(G),
    map: createMap(G),
    zone: createZone(G),
    battle: createBattleScreen(G),
    result: createResultScreen(G),
    befriend: createBefriendScreen(G),
    squad: createSquad(G),
    upgrade: createUpgrade(G),
    book: createBook(G),
  };
  let screen = 'map';

  function go(name, arg) {
    if (!screens[name]) return;
    screen = name;
    const s = screens[name];
    if (name === 'battle') s.start(arg.zone, !!arg.boss, arg.seed);
    else s.start(arg);
  }

  // first time: make a monster before anything else
  if (!G.progress.roster.length) go('maker', { first: true });
  else go('map');

  // ---------- debug handle ----------

  const api = {
    owner: G,
    screen: () => screen,
    state: () => {
      const p = G.progress;
      const b = screens.battle.debug.battle();
      return {
        screen,
        coins: p.coins,
        tokens: p.tokens,
        roster: p.roster.length,
        team: teamMons(p).map((m) => ({ uid: m.uid, name: m.name, lv: m.lv, stage: m.stage, power: powerOf(m) })),
        zones: p.zones.map((z) => ({ ...z })),
        caught: Object.keys(p.caught).length,
        battle: screen === 'battle' && b ? {
          phase: screens.battle.debug.phase(),
          over: b.over,
          round: b.round,
          heroes: b.heroes.map((f) => ({ hp: f.hp, max: f.max, el: f.el, charge: f.charge })),
          foes: b.foes.map((f) => ({ hp: f.hp, max: f.max, el: f.el, sp: f.mon.sp })),
          intents: b.intents,
        } : null,
        befriend: screen === 'befriend' ? screens.befriend.debug.state() : null,
        saved: G.saved,
      };
    },
    buttons: () => screens[screen].buttons().map((b) => ({ ...b })),
    progress: () => JSON.parse(store ? store.getItem(SAVE_KEY) || 'null' : 'null'),
    makeRandom(seed = (Math.random() * 1e9) | 0) {
      const rng = makeRng(seed);
      if (G.progress.tokens < 1) G.progress.tokens = 1;
      const mon = makeMonster(G.progress, randomParts(rng), makeName(seed), seed);
      G.save();
      return mon && mon.uid;
    },
    battle(zone = 0, boss = false, seed) {
      go('battle', { zone, boss, seed });
      return true;
    },
    pick: (move, target = null, quality = 0.7) => screens.battle.debug.pick(move, target, quality),
    win: () => screens.battle.debug.end('win'),
    lose: () => screens.battle.debug.end('lose'),
    addCoins(n = 100) {
      G.progress.coins += n;
      G.save();
      return G.progress.coins;
    },
    // sets a monster's level (for trying evolution without playing up to it)
    setLevel(uid, lv) {
      const m = G.progress.roster.find((q) => q.uid === uid);
      if (!m) return false;
      m.lv = Math.max(1, Math.min(30, lv | 0));
      m.xp = 0;
      G.save();
      return true;
    },
    roster: () => G.progress.roster.map((m) => ({ uid: m.uid, name: m.name, sp: m.sp, lv: m.lv, stage: m.stage, el: m.parts.element })),
    go: (name, arg) => go(name, arg),
    maker: screens.maker.debug,
  };
  if (typeof window !== 'undefined') window.__monsters = api;

  return {
    resize(w, h) {
      G.size = { w, h };
      screens[screen].layout();
    },
    update(dt) {
      G.time += dt;
      screens[screen].update(dt);
    },
    draw(ctx) {
      screens[screen].draw(ctx);
    },
    onPickUp: () => false,
    onDrag() {},
    onDrop() {},
    onTap(x, y) {
      wake();
      screens[screen].tap(x, y);
    },
  };
}
