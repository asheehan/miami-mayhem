// A chef for tests and the ?debug autoplay. Pure. It cooks with the same actions the touch
// screen uses (add, grabTool + rub, setHold, moveTo, pullOut, tapOrder, serve), one per frame.
// A tidy chef does the right thing each time; a sloppy one tries a wrong ingredient before each
// right one, pulls things out too early, holds the press until it smokes and leaves fried
// things in until they are dark, and offers dishes to the wrong customer first.
import { add, grabTool, rub, setHold, moveTo, pullOut, stationHint, binsFor, needs, FRY_BURN, BAKE_BURN, RUB_TOOLS } from './stations.js';
import { tapOrder, serve, step, atWindow, binDish } from './sim.js';
import { sameDish } from './recipes.js';

export const RUB_STEP = 45; // field units a finger rubs per frame

// Do one thing at a station. mem carries the sloppy chef's memory between frames.
export function driveStation(st, { sloppy = false, mem = {} } = {}) {
  const h = stationHint(st);
  if (!h) return false;
  if (sloppy && (h.do === 'add' || h.do === 'rub')) {
    const key = `${st.phase}|${needs(st).join()}`;
    if (mem.tried !== key) {
      mem.tried = key;
      const want = h.ing || h.tool;
      const wrong = binsFor(st).find((i) => !needs(st).includes(i) && i !== want);
      if (wrong) {
        if (RUB_TOOLS.includes(wrong)) grabTool(st, wrong);
        else add(st, wrong);
        return true;
      }
    }
  }
  switch (h.do) {
    case 'add':
      return add(st, h.ing) === 'ok';
    case 'rub':
      if (!grabTool(st, h.tool)) return false;
      rub(st, h.tool, RUB_STEP, 0.3 + ((st.time * 7) % 0.4), 0.3 + ((st.time * 3) % 0.4));
      return true;
    case 'hold':
      return setHold(st, true);
    case 'release':
      if (sloppy) return false; // hangs on until it smokes
      return setHold(st, false);
    case 'move':
      return moveTo(st, h.to);
    case 'pull':
      if (sloppy) {
        const t = h.id === 'oven' ? st.oven : st.pieces.find((p) => p.id === h.id).t;
        if (t <= (h.id === 'oven' ? BAKE_BURN : FRY_BURN) + 0.05) return false;
      }
      return pullOut(st, h.id) === 'ok';
    default:
      return false;
  }
}

// Play a whole day (or until maxSeconds). Returns the state.
export function playDay(s, { sloppy = false, dt = 1 / 30, maxSeconds = 1200 } = {}) {
  const mem = {};
  const offered = new Set();
  for (let t = 0; t < maxSeconds && s.status !== 'done'; t += dt) {
    if (s.station) driveStation(s.station, { sloppy, mem });
    else if (s.counter.length) {
      const k = s.counter[0];
      const waiting = atWindow(s).filter((c) => c.state === 'wait');
      const right = waiting.find((c) => c.items.some((o, i) => !c.filled[i] && sameDish(o, k.dish)));
      const wrong = waiting.find((c) => c !== right && !c.items.some((o, i) => !c.filled[i] && sameDish(o, k.dish)));
      if (sloppy && wrong && !offered.has(k.id)) {
        offered.add(k.id);
        serve(s, k.id, wrong.id);
      } else if (right) serve(s, k.id, right.id);
      else if (!s.customers.some((c) => c.state === 'walk')) binDish(s, k.id); // its customer gave up
    } else {
      for (const c of atWindow(s)) {
        if (c.state !== 'wait') continue;
        const i = c.filled.findIndex((f) => !f);
        if (i >= 0 && tapOrder(s, c.id, i)) break;
      }
    }
    step(s, dt);
  }
  return s;
}
