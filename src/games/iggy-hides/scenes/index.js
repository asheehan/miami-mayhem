// The scenes, in picker order, resolved for play: every hiding spot gets a hit box (centre and
// half sizes, world units) from its prop's box, scale, flip and rotation, never smaller than
// MIN_HALF. A spot keeps where its thing is drawn as px, py.
//
// A scene module exports:
//   { id, name, W, H, edge (colour past the scene's edges),
//     back(ctx, r)      the static picture, drawn once per render with a fresh seeded r
//     actors            [{ x, y, hw, hh, draw(ctx, t, view), keep, over }]: animated bits,
//                       drawn each frame when their box (centre x, y, half sizes) is on
//                       screen. keep: the boxes an actor really covers, if tighter than its
//                       box (hiding spots stay clear of them); over: true for small things
//                       that only pass by (birds, a bike), which may cross spots
//     props             optional scene-only findables, { name: { box, draw } } like art/props.js
//     iggy              [{ x, y, pose, s, flip, rot, cover, hit, hx, hy, z }] Iggy's hiding spots
//     items             [{ id, prop, o, count, spots: [same as iggy spots] }] things to find
//     sticker(ctx, r, t) the album sticker's picture, centred, radius r }
// A spot's cover(ctx, t) draws whatever sits in front of the hidden thing, in world units.
// hit: [hw, hh] overrides the half sizes; hx, hy move the hit box centre from (x, y).
import { propBox } from '../art/props.js';
import { MIN_HALF } from '../logic.js';
import beach from './beach.js';
import pool from './pool.js';
import deco from './deco.js';
import marina from './marina.js';
import market from './market.js';
import zoo from './zoo.js';
import aquarium from './aquarium.js';
import golf from './golf.js';
import carnival from './carnival.js';
import swamp from './swamp.js';

export function resolveSpot(raw, prop, extra) {
  const [cx, cy, bw, bh] = propBox(prop, extra);
  const s = raw.s || 1;
  const f = raw.flip ? -1 : 1;
  const rot = raw.rot || 0;
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  // the box centre, turned and scaled like the drawing
  const ox = cx * s * f;
  const oy = cy * s;
  const rx = ox * c - oy * sn;
  const ry = ox * sn + oy * c;
  const w = bw * s;
  const h = bh * s;
  const aw = Math.abs(w * c) + Math.abs(h * sn);
  const ah = Math.abs(w * sn) + Math.abs(h * c);
  const hw = Math.max(MIN_HALF, raw.hit ? raw.hit[0] : aw * 1.12);
  const hh = Math.max(MIN_HALF, raw.hit ? raw.hit[1] : ah * 1.12);
  return {
    ...raw,
    prop,
    px: raw.x,
    py: raw.y,
    x: raw.x + (raw.hx ?? rx),
    y: raw.y + (raw.hy ?? ry),
    hw,
    hh,
    z: raw.z ?? raw.y,
  };
}

export function resolveScene(scene) {
  const extra = scene.props || null;
  return {
    ...scene,
    iggy: scene.iggy.map((sp) => resolveSpot(sp, `iggy-${sp.pose || 'stand'}`, extra)),
    items: scene.items.map((it) => ({ ...it, count: it.count || 1, spots: it.spots.map((sp) => resolveSpot(sp, it.prop, extra)) })),
  };
}

export const SCENES = [beach, pool, deco, marina, market, zoo, aquarium, golf, carnival, swamp].map(resolveScene);
export const SCENE_IDS = SCENES.map((s) => s.id);
