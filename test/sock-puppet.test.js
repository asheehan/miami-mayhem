import { describe, it, expect } from 'vitest';
import { DRAWERS, PARTS, partDef } from '../src/games/sock-puppet/parts.js';
import {
  SHAPES, SHAPE_IDS, PATTERNS, createPuppet, addPart, movePart, scalePart, rotatePart, removePart, toggleLayer,
  raisePart, recolour, setSock, setName, undo, canUndo, beginEdit, snapPart, hitTest, handlePos, handleTransform,
  insideSock, halfWidthAt, bodyOutline, drawOrder, onTopJaw, randomPuppet, encodePuppet, decodePuppet, clonePuppet,
  nameFromLetters, cleanName, spotFor, NAMES, MAX_PARTS, HISTORY_MAX, SCALE_MIN, SCALE_MAX, BOUNDS, SNAP, NAME_MAX,
} from '../src/games/sock-puppet/puppet.js';
import {
  BEATS, CARDS_PER_BEAT, PAGE_MAX, BOOKS_MAX, VARIANTS, article, withA, possessive, tidy, dealCards, validPick,
  makeStory, spokenText, bookFromPicks, picksOf, addBook, decodeBook,
} from '../src/games/sock-puppet/story.js';
import { PLACES, FRIENDS, THINGS, PROBLEMS, FIXES, ENDINGS, POSES, EXTRA_SCENES, STAGE_PROPS, STAGE_BACKDROPS } from '../src/games/sock-puppet/world.js';
import {
  SHOW_MAX, EVENTS_MAX, SHOW_BUDGET, startRecording, recordMove, recordTap, tickRecording, finishRecording, positionsAt,
  tapsBetween, decodeShow, showSize, createBody, stepBody,
} from '../src/games/sock-puppet/show.js';
import {
  SAVE_KEY, SHELF_SLOTS, createProgress, putOnShelf, removeFromShelf, firstEmptySlot, findPuppet, booksFor, keepShow,
  serializeProgress, parseProgress, loadProgress, saveProgress,
} from '../src/games/sock-puppet/save.js';
import { createSpeech } from '../src/games/sock-puppet/speech.js';
import { makeRng } from '../src/games/sock-puppet/rng.js';

const memStore = () => {
  const data = {};
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
};

const fresh = () => createPuppet({ uid: 'abc123', name: 'Noodle' });

describe('the parts library', () => {
  it('has eight drawers with at least ten parts each, all with unique ids', () => {
    expect(DRAWERS.map((d) => d.id)).toEqual(['eyes', 'noses', 'mouths', 'hair', 'ears', 'hats', 'arms', 'extras']);
    for (const d of DRAWERS) expect(d.parts.length, d.id).toBeGreaterThanOrEqual(10);
    const ids = PARTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes the asked-for favourites', () => {
    for (const id of ['googly', 'button-eye', 'sleepy', 'lashes', 'cyclops', 'star-eye', 'glasses', 'pompom', 'button-nose', 'carrot',
      'pig', 'clown', 'tongue', 'buck-teeth', 'fangs', 'moustache', 'lipstick', 'mop', 'pigtail', 'mohawk', 'curly', 'antennae',
      'sunhat', 'cap', 'crown', 'pirate-hat', 'chef-hat', 'party-hat', 'floatie', 'noodle-arm', 'mitten', 'claw', 'wing',
      'bow-tie', 'necklace', 'cape', 'scarf', 'sunglasses', 'patch', 'big-button', 'sticker-star']) {
      expect(partDef(id), id).toBeTruthy();
    }
  });

  it('gives every part a sensible box, default spot and colour', () => {
    for (const p of PARTS) {
      expect(p.w, p.id).toBeGreaterThan(20);
      expect(p.h, p.id).toBeGreaterThan(20);
      expect(p.at[0]).toBeGreaterThanOrEqual(BOUNDS.x0);
      expect(p.at[1]).toBeGreaterThanOrEqual(BOUNDS.y0);
      if (p.pair) expect(p.at[0], `${p.id} sits on the right`).toBeGreaterThan(0);
      if (p.tint !== null) expect(p.tint).toBeGreaterThanOrEqual(0);
    }
    // wings and capes start behind the sock
    for (const id of ['wing', 'cape', 'long-hair', 'fairy-wing']) expect(partDef(id).back).toBe(true);
  });
});

describe('the sock', () => {
  it('has three shapes and seven patterns', () => {
    expect(SHAPE_IDS).toEqual(['long', 'stubby', 'chunky']);
    expect(PATTERNS).toEqual(['plain', 'stripes', 'dots', 'argyle', 'zigzag', 'rainbow', 'patches']);
  });

  it('is a closed symmetric outline with the mouth on the head', () => {
    for (const id of SHAPE_IDS) {
      const sh = SHAPES[id];
      const pts = bodyOutline(id);
      expect(pts.length % 2).toBe(0);
      expect(insideSock(id, 0, 0)).toBe(true);
      expect(insideSock(id, 0, sh.mouthY)).toBe(true);
      expect(halfWidthAt(id, 20)).toBeCloseTo(halfWidthAt(id, 20));
      expect(insideSock(id, 400, 0)).toBe(false);
      expect(insideSock(id, 0, sh.half[0][1] - 5)).toBe(false);
      expect(sh.cuffTop).toBeLessThan(sh.cuffBottom);
    }
    // the chunky sock is the widest, the long one the tallest
    expect(halfWidthAt('chunky', 0)).toBeGreaterThan(halfWidthAt('long', 0));
    expect(SHAPES.long.cuffBottom).toBeGreaterThan(SHAPES.stubby.cuffBottom);
  });
});

describe('the puppet model', () => {
  it('adds parts at a point or at their default spot, and a second of a pair on the other side', () => {
    const p = fresh();
    const a = addPart(p, 'googly');
    expect(a).toBe(0);
    expect(p.parts[0].x).toBeGreaterThan(0);
    const b = addPart(p, 'googly');
    expect(p.parts[b].x).toBe(-p.parts[a].x);
    expect(p.parts[b].y).toBe(p.parts[a].y);
    const c = addPart(p, 'pompom', 30, 40);
    expect(p.parts[c]).toMatchObject({ id: 'pompom', x: 30, y: 40, s: 1, r: 0, back: false });
    expect(addPart(p, 'no-such-part', 0, 0)).toBe(-1);
    expect(p.parts.length).toBe(3);
  });

  it('starts tinted parts in their colour and fixed ones without', () => {
    const p = fresh();
    expect(p.parts[addPart(p, 'party-hat')].c).toBe(partDef('party-hat').tint);
    expect(p.parts[addPart(p, 'googly')].c).toBe(-1);
  });

  it('puts behind-the-sock parts behind and draws them first', () => {
    const p = fresh();
    addPart(p, 'pompom');
    addPart(p, 'cape');
    addPart(p, 'googly');
    const { back, front } = drawOrder(p);
    expect(back).toEqual([1]);
    expect(front).toEqual([0, 2]);
  });

  it('moves, scales and turns parts within limits', () => {
    const p = fresh();
    const i = addPart(p, 'pompom', 0, 0);
    movePart(p, i, 50.26, -70.44);
    expect(p.parts[i]).toMatchObject({ x: 50.3, y: -70.4 });
    movePart(p, i, 9999, -9999);
    expect(p.parts[i].x).toBe(BOUNDS.x1);
    expect(p.parts[i].y).toBe(BOUNDS.y0);
    scalePart(p, i, 1.5);
    expect(p.parts[i].s).toBe(1.5);
    scalePart(p, i, 100);
    expect(p.parts[i].s).toBe(SCALE_MAX);
    scalePart(p, i, 0.01);
    expect(p.parts[i].s).toBe(SCALE_MIN);
    rotatePart(p, i, 0.5);
    expect(p.parts[i].r).toBeCloseTo(0.5);
    rotatePart(p, i, Math.PI * 2 + 0.25);
    expect(p.parts[i].r).toBeCloseTo(0.25);
    rotatePart(p, i, -Math.PI * 1.5);
    expect(p.parts[i].r).toBeCloseTo(Math.PI / 2);
  });

  it('removes parts, toggles layers (to the top of the new layer) and raises parts', () => {
    const p = fresh();
    addPart(p, 'pompom');
    addPart(p, 'googly');
    addPart(p, 'mop');
    const j = toggleLayer(p, 0);
    expect(j).toBe(2);
    expect(p.parts[2]).toMatchObject({ id: 'pompom', back: true });
    expect(toggleLayer(p, 2)).toBe(2);
    expect(p.parts[2].back).toBe(false);
    expect(raisePart(p, 0)).toBe(2);
    expect(p.parts.map((q) => q.id)).toEqual(['mop', 'pompom', 'googly']);
    expect(removePart(p, 1)).toBe(true);
    expect(p.parts.map((q) => q.id)).toEqual(['mop', 'googly']);
    expect(removePart(p, 7)).toBe(false);
  });

  it('recolours tinted parts round the felt colours, and not fixed ones', () => {
    const p = fresh();
    const i = addPart(p, 'bow-tie');
    const c0 = p.parts[i].c;
    expect(recolour(p, i)).toBe(true);
    expect(p.parts[i].c).toBe(c0 + 1);
    const g = addPart(p, 'googly');
    expect(recolour(p, g)).toBe(false);
  });

  it('changes the sock only to known values', () => {
    const p = fresh();
    expect(setSock(p, 'shape', 'chunky')).toBe(true);
    expect(setSock(p, 'shape', 'boot')).toBe(false);
    expect(setSock(p, 'pattern', 'argyle')).toBe(true);
    expect(setSock(p, 'colour', 3)).toBe(true);
    expect(setSock(p, 'colour', 99)).toBe(false);
    expect(setSock(p, 'pcolour', 0)).toBe(true);
    expect(p.sock).toEqual({ shape: 'chunky', colour: 3, pattern: 'argyle', pcolour: 0 });
  });

  it('undoes every kind of change, one step at a time', () => {
    const p = fresh();
    expect(canUndo(p)).toBe(false);
    addPart(p, 'googly');
    addPart(p, 'googly');
    setSock(p, 'pattern', 'dots');
    const i = toggleLayer(p, 0);
    recolour(p, addPart(p, 'party-hat'));
    // a drag is one step
    beginEdit(p);
    movePart(p, i, 10, 10);
    movePart(p, i, 20, 20);
    scalePart(p, i, 2);
    setName(p, 'Pickle');
    removePart(p, 0);
    const steps = p.history.length;
    expect(steps).toBe(9);
    expect(undo(p)).toBe(true); // remove
    expect(p.parts.length).toBe(3);
    expect(undo(p)).toBe(true); // name
    expect(p.name).toBe('Noodle');
    expect(undo(p)).toBe(true); // the drag
    expect(p.parts[i]).toMatchObject({ s: 1 });
    undo(p); // recolour
    undo(p); // hat
    expect(p.parts.length).toBe(2);
    undo(p); // layer
    expect(p.parts.every((q) => !q.back)).toBe(true);
    undo(p); // pattern
    expect(p.sock.pattern).toBe('plain');
    undo(p);
    undo(p);
    expect(p.parts).toEqual([]);
    expect(undo(p)).toBe(false);
  });

  it('keeps a limited history and a limited number of parts', () => {
    const p = fresh();
    for (let k = 0; k < MAX_PARTS + 5; k++) addPart(p, 'big-button', (k % 10) * 20 - 100, Math.floor(k / 10) * 40);
    expect(p.parts.length).toBe(MAX_PARTS);
    expect(addPart(p, 'googly')).toBe(-1);
    for (let k = 0; k < HISTORY_MAX + 20; k++) setSock(p, 'colour', k % 2);
    expect(p.history.length).toBe(HISTORY_MAX);
  });
});

describe('mirror snapping', () => {
  it('snaps a pair part dropped near the mirror of its partner', () => {
    const p = fresh();
    addPart(p, 'googly', 60, -70);
    const i = addPart(p, 'googly', -60 + 12, -70 - 10);
    expect(p.parts[i]).toMatchObject({ x: -60, y: -70 });
  });

  it('matches size and tilt when the partner is the same part and close', () => {
    const p = fresh();
    addPart(p, 'bunny-ear', 70, -260, { s: 1.4, r: 0.3 });
    const i = addPart(p, 'bunny-ear', -75, -255, { s: 1.3, r: -0.2 });
    expect(p.parts[i]).toMatchObject({ x: -70, y: -260, s: 1.4 });
    expect(p.parts[i].r).toBeCloseTo(-0.3);
  });

  it('pairs any parts from the same drawer (one googly, one lashes) but not across drawers', () => {
    const p = fresh();
    addPart(p, 'googly', 50, -60);
    const i = addPart(p, 'lashes', -55, -62);
    expect(p.parts[i]).toMatchObject({ x: -50, y: -60 });
    const j = addPart(p, 'cat-ear', -52, -58);
    expect(p.parts[j]).toMatchObject({ x: -52, y: -58 });
  });

  it('leaves silly placements alone: far from any mirror, nothing moves', () => {
    const p = fresh();
    addPart(p, 'googly', 50, -60);
    addPart(p, 'googly', -50, -60);
    const third = addPart(p, 'googly', 10, 150); // an eye on the chin
    expect(p.parts[third]).toMatchObject({ x: 10, y: 150 });
    const far = addPart(p, 'googly', -50 - SNAP - 5, -60);
    expect(p.parts[far].x).toBe(-50 - SNAP - 5);
  });

  it('centres single parts dropped near the middle and levels nearly-level parts', () => {
    const p = fresh();
    const i = addPart(p, 'pompom', 9, 5, { r: 0.05 });
    expect(p.parts[i]).toMatchObject({ x: 0, y: 5, r: 0 });
    const j = addPart(p, 'pompom', 40, 5);
    expect(p.parts[j].x).toBe(40);
    expect(snapPart(p, 99)).toBe(false);
  });
});

describe('hit testing', () => {
  it('finds the top-most part under a point', () => {
    const p = fresh();
    addPart(p, 'pompom', 0, 0, { snap: false });
    addPart(p, 'big-button', 10, 0, { snap: false });
    expect(hitTest(p, 10, 0)).toEqual({ kind: 'part', index: 1 });
    expect(hitTest(p, -26, 0)).toEqual({ kind: 'part', index: 0 });
    raisePart(p, 0);
    expect(hitTest(p, 10, 0)).toEqual({ kind: 'part', index: 1 });
  });

  it('puts parts in front above the sock, and the sock above parts behind it', () => {
    const p = fresh();
    addPart(p, 'cape'); // behind, under the neck
    addPart(p, 'googly', 50, -60);
    expect(hitTest(p, 50, -60)).toEqual({ kind: 'part', index: 1 });
    expect(hitTest(p, 0, 170)).toEqual({ kind: 'sock' });
    // the cape's edge, beside the sock
    expect(hitTest(p, 150, 250)).toEqual({ kind: 'part', index: 0 });
    expect(hitTest(p, 280, -360)).toBe(null);
  });

  it('follows a part when it is turned and scaled', () => {
    const p = fresh();
    const i = addPart(p, 'trunk', 0, 0); // 64 x 150, tall
    expect(hitTest(p, 0, 70).index).toBe(i);
    expect(hitTest(p, 70, 0)).toEqual({ kind: 'sock' });
    rotatePart(p, i, Math.PI / 2);
    expect(hitTest(p, 70, 0).index).toBe(i);
    scalePart(p, i, 2);
    expect(hitTest(p, 140, 0).index).toBe(i);
  });

  it('gives tiny parts a finger-sized box', () => {
    const p = fresh();
    const i = addPart(p, 'one-tooth', 0, 0, { s: 0.5 });
    expect(hitTest(p, 30, 0).index).toBe(i);
  });

  it('puts the handle of the selected part first, out from small parts', () => {
    const p = fresh();
    const big = addPart(p, 'sunhat', 0, -200);
    const small = addPart(p, 'big-button', 120, -240, { snap: false });
    const hp = handlePos(p.parts[big], 70);
    expect(hp.x).toBeCloseTo(160);
    expect(hp.y).toBeCloseTo(-265);
    expect(hitTest(p, hp.x, hp.y, { selected: big, handleR: 30 })).toEqual({ kind: 'handle', index: big });
    // without the selection it's just whatever is there
    expect(hitTest(p, hp.x, hp.y)?.kind).not.toBe('handle');
    const hs = handlePos(p.parts[small], 70);
    expect(Math.hypot(hs.x - 120, hs.y + 240)).toBeCloseTo(70);
  });

  it('scales and turns about the middle when the handle is dragged', () => {
    const q = { id: 'pompom', x: 0, y: 0, s: 1, r: 0 };
    const t = handleTransform(q, { x: 50, y: 0 }, { x: 0, y: 100 });
    expect(t.s).toBeCloseTo(2);
    expect(t.r).toBeCloseTo(Math.PI / 2);
    const tiny = handleTransform(q, { x: 50, y: 0 }, { x: 1, y: 0 });
    expect(tiny.s).toBe(SCALE_MIN);
  });

  it('moves teeth and moustaches with the top jaw, beards with the bottom', () => {
    const p = fresh();
    const teeth = addPart(p, 'buck-teeth');
    const beard = addPart(p, 'beard');
    const eye = addPart(p, 'googly');
    expect(onTopJaw(p, p.parts[teeth])).toBe(true);
    expect(onTopJaw(p, p.parts[beard])).toBe(false);
    expect(onTopJaw(p, p.parts[eye])).toBe(true);
  });
});

describe('fitting parts to the sock', () => {
  it('puts tapped-in hats on top of each shape, sized to the head', () => {
    for (const shape of SHAPE_IDS) {
      const p = createPuppet({ shape });
      const spot = spotFor(p, partDef('cap'));
      expect(spot.y).toBeLessThan(SHAPES[shape].half[0][1] + 20);
      expect(spot.y).toBeGreaterThan(SHAPES[shape].half[0][1] - 40);
    }
    expect(spotFor(createPuppet({ shape: 'chunky' }), partDef('cap')).s).toBeGreaterThan(1.2);
  });
});

describe('surprise me', () => {
  it('makes valid, varied puppets every time', () => {
    const looks = new Set();
    for (let seed = 1; seed <= 300; seed++) {
      const p = randomPuppet(seed, { uid: 'r1' });
      looks.add(JSON.stringify(encodePuppet(p).k));
      expect(SHAPE_IDS).toContain(p.sock.shape);
      expect(PATTERNS).toContain(p.sock.pattern);
      expect(p.sock.pcolour).not.toBe(p.sock.colour);
      expect(p.parts.length).toBeGreaterThan(0);
      expect(p.parts.length).toBeLessThanOrEqual(MAX_PARTS);
      expect(NAMES).toContain(p.name);
      expect(p.history.length).toBe(0);
      expect(p.parts.some((q) => partDef(q.id).drawer === 'eyes'), `seed ${seed} has eyes`).toBe(true);
      for (const q of p.parts) {
        expect(partDef(q.id)).toBeTruthy();
        expect(q.x).toBeGreaterThanOrEqual(BOUNDS.x0);
        expect(q.x).toBeLessThanOrEqual(BOUNDS.x1);
        expect(q.s).toBeGreaterThanOrEqual(SCALE_MIN);
        expect(q.s).toBeLessThanOrEqual(SCALE_MAX);
        expect(Number.isFinite(q.r)).toBe(true);
      }
      // it survives a save
      expect(encodePuppet(decodePuppet(encodePuppet(p)))).toEqual(encodePuppet(p));
    }
    expect(looks.size).toBeGreaterThan(100);
  });

  it('is the same puppet for the same seed', () => {
    expect(encodePuppet(randomPuppet(42))).toEqual(encodePuppet(randomPuppet(42)));
    expect(encodePuppet(randomPuppet(42))).not.toEqual(encodePuppet(randomPuppet(43)));
  });
});

describe('names', () => {
  it('has the default names and turns typed letters into a name', () => {
    expect(NAMES).toContain('Sir Socks-a-lot');
    expect(NAMES).toContain('Noodle');
    expect(NAMES).toContain('Captain Toes');
    expect(nameFromLetters('RILEY')).toBe('Riley');
    expect(nameFromLetters('MR SOCK')).toBe('Mr Sock');
  });

  it('cleans names: trims, drops odd characters, caps the length', () => {
    expect(cleanName('  Riley  ')).toBe('Riley');
    expect(cleanName('<b>Hi</b>{x}')).toBe('bHibx');
    expect(cleanName('A'.repeat(40)).length).toBe(NAME_MAX);
    expect(cleanName(42)).toBe('');
    const p = fresh();
    expect(setName(p, '   ')).toBe(false);
    expect(setName(p, 'Pickle')).toBe(true);
    expect(p.name).toBe('Pickle');
  });
});

describe('saved puppets', () => {
  it('round-trips a puppet exactly (to the saved precision)', () => {
    const p = fresh();
    setSock(p, 'shape', 'stubby');
    setSock(p, 'pattern', 'zigzag');
    addPart(p, 'googly', 50, -60);
    const i = addPart(p, 'party-hat', 20, -240, { s: 1.37, r: 0.3 });
    toggleLayer(p, i);
    const q = decodePuppet(JSON.parse(JSON.stringify(encodePuppet(p))));
    expect(q.uid).toBe(p.uid);
    expect(q.name).toBe('Noodle');
    expect(q.sock).toEqual(p.sock);
    expect(q.parts.length).toBe(2);
    expect(q.parts[1]).toMatchObject({ id: 'party-hat', x: 20, y: -240, s: 1.37, back: true });
    expect(q.parts[1].r).toBeCloseTo(0.3, 1);
    expect(encodePuppet(q)).toEqual(encodePuppet(p));
  });

  it('is small', () => {
    const p = randomPuppet(7, { uid: 'x' });
    while (p.parts.length < MAX_PARTS) addPart(p, 'sticker-star', 10, 10, { history: false, snap: false });
    expect(JSON.stringify(encodePuppet(p)).length).toBeLessThan(1800);
  });

  it('keeps parts from a newer version untouched but neither draws nor hits them', () => {
    const raw = { u: 'abc', n: 'Zed', k: [0, 1, 2, 3], p: [['googly', 50, -60, 100, 0, 0, -1], ['laser-eyes', 0, 0, 100, 0, 0, 2, 'extra']] };
    const p = decodePuppet(raw);
    expect(p.parts.map((q) => q.id)).toEqual(['googly']);
    expect(p.extra).toEqual([['laser-eyes', 0, 0, 100, 0, 0, 2, 'extra']]);
    expect(hitTest(p, 0, 0)).toEqual({ kind: 'sock' });
    expect(encodePuppet(p).p).toContainEqual(['laser-eyes', 0, 0, 100, 0, 0, 2, 'extra']);
    expect(clonePuppet(p).extra.length).toBe(1);
  });

  it('rejects junk and repairs bad fields', () => {
    for (const bad of [null, 5, 'x', [], {}, { u: '' }, { u: 'bad uid!' }]) expect(decodePuppet(bad)).toBe(null);
    const p = decodePuppet({ u: 'ok', n: 7, k: [9, 99, -1, 'x'], p: [null, ['googly'], ['googly', 'a', 0], ['googly', 1e9, -1e9, 1e6, 7200, 'yes', 3], 'nope'] });
    expect(p.name).toBe(NAMES[1]);
    expect(p.sock).toEqual({ shape: 'long', colour: 6, pattern: 'plain', pcolour: 10 });
    expect(p.parts.length).toBe(1);
    expect(p.parts[0]).toMatchObject({ x: BOUNDS.x1, y: BOUNDS.y0, s: SCALE_MAX, back: false, c: -1 });
    expect(p.parts[0].r).toBeCloseTo(0);
    const many = decodePuppet({ u: 'm', p: Array.from({ length: 100 }, () => ['pompom', 0, 0]) });
    expect(many.parts.length).toBe(MAX_PARTS);
  });
});

describe('the shelf and saving', () => {
  it('has at least eight slots and fills them in order', () => {
    expect(SHELF_SLOTS).toBeGreaterThanOrEqual(8);
    const pr = createProgress();
    expect(firstEmptySlot(pr)).toBe(0);
    putOnShelf(pr, 0, createPuppet({ uid: 'a' }));
    putOnShelf(pr, 2, createPuppet({ uid: 'c' }));
    expect(firstEmptySlot(pr)).toBe(1);
    expect(putOnShelf(pr, SHELF_SLOTS, createPuppet({ uid: 'z' }))).toBe(false);
    expect(findPuppet(pr, 'c').uid).toBe('c');
    for (let i = 0; i < SHELF_SLOTS; i++) putOnShelf(pr, i, createPuppet({ uid: `p${i}` }));
    expect(firstEmptySlot(pr)).toBe(-1);
  });

  it('round-trips the shelf, books and shows', () => {
    const pr = createProgress();
    const a = randomPuppet(3, { uid: 'aaa' });
    const b = randomPuppet(4, { uid: 'bbb' });
    putOnShelf(pr, 0, a);
    putOnShelf(pr, 4, b);
    const picks = { place: 'space', friend: 'p:bbb', thing: 'kite', problem: 'stinky', fix: 'bubble', ending: 'nap' };
    pr.books = addBook(pr.books, bookFromPicks(picks, 99, { id: 'b1', uid: 'aaa', friendName: b.name, time: 5 }));
    const rec = startRecording([{ x: 100, y: 300 }]);
    recordMove(rec, 0.1, 0, 120, 310);
    recordTap(rec, 0.5, 0);
    expect(keepShow(pr, 'aaa', finishRecording(rec))).toBe(true);
    const store = memStore();
    expect(saveProgress(store, pr)).toBeGreaterThan(0);
    const back = loadProgress(store);
    expect(back.shelf[0].uid).toBe('aaa');
    expect(back.shelf[1]).toBe(null);
    expect(encodePuppet(back.shelf[4])).toEqual(encodePuppet(b));
    expect(back.books).toEqual(pr.books);
    expect(back.shows.aaa.e).toEqual([[10, 0, 120, 310], [50, 0]]);
    expect(store.data[SAVE_KEY]).toBeTruthy();
  });

  it('deletes a puppet with its books and show', () => {
    const pr = createProgress();
    putOnShelf(pr, 0, createPuppet({ uid: 'aaa' }));
    putOnShelf(pr, 1, createPuppet({ uid: 'bbb' }));
    const picks = { place: 'beach', friend: 'crab', thing: 'kite', problem: 'stinky', fix: 'bubble', ending: 'nap' };
    pr.books = [bookFromPicks(picks, 1, { id: 'x', uid: 'aaa', time: 1 }), bookFromPicks(picks, 2, { id: 'y', uid: 'bbb', time: 2 })];
    pr.shows.aaa = { d: 10, a: [[0, 0]], e: [] };
    expect(removeFromShelf(pr, 0)).toBe(true);
    expect(pr.shelf[0]).toBe(null);
    expect(pr.books.map((b) => b.id)).toEqual(['y']);
    expect(pr.shows.aaa).toBeUndefined();
    expect(removeFromShelf(pr, 0)).toBe(false);
    expect(booksFor(pr, 'bbb').length).toBe(1);
  });

  it('survives junk, broken JSON, duplicates and storage that throws', () => {
    for (const text of [null, '', '{', '[]', '5', '{"shelf":7}', '{"shelf":[{"u":"a"},{"u":"a"},null,"x"],"books":[1,{"k":[]}],"shows":{"a":{"d":-5}}}']) {
      const pr = parseProgress(text);
      expect(pr.shelf.length).toBe(SHELF_SLOTS);
      expect(pr.shelf.filter(Boolean).length).toBeLessThanOrEqual(1);
      expect(pr.books).toEqual([]);
      expect(pr.shows).toEqual({});
    }
    const broken = { getItem() { throw new Error('no'); }, setItem() { throw new Error('full'); } };
    expect(loadProgress(broken).shelf.length).toBe(SHELF_SLOTS);
    const pr = createProgress();
    putOnShelf(pr, 0, randomPuppet(1, { uid: 'q' }));
    expect(saveProgress(broken, pr)).toBe(0);
  });

  it('leaves out shows, then books, when storage is nearly full', () => {
    const pr = createProgress();
    putOnShelf(pr, 0, randomPuppet(1, { uid: 'q' }));
    const picks = { place: 'beach', friend: 'crab', thing: 'kite', problem: 'stinky', fix: 'bubble', ending: 'nap' };
    for (let k = 0; k < 20; k++) pr.books = addBook(pr.books, bookFromPicks(picks, k, { id: `b${k}`, uid: 'q', time: k }));
    const rec = startRecording([{ x: 0, y: 0 }]);
    for (let k = 0; k < 200; k++) recordMove(rec, k * 0.06, 0, k, k);
    keepShow(pr, 'q', finishRecording(rec));
    const full = serializeProgress(pr).length;
    const noShows = serializeProgress(pr, { shows: false }).length;
    // storage that holds a bit less than everything
    const limited = (max) => {
      const s = memStore();
      return { ...s, setItem(k, v) { if (String(v).length > max) throw new Error('quota'); s.setItem(k, v); } };
    };
    const st = limited(full - 1);
    expect(saveProgress(st, pr)).toBe(noShows);
    const back = parseProgress(st.getItem(SAVE_KEY));
    expect(back.books.length).toBe(20);
    expect(back.shows).toEqual({});
    const tiny = limited(noShows - 1);
    const n = saveProgress(tiny, pr);
    expect(n).toBeGreaterThan(0);
    expect(parseProgress(tiny.getItem(SAVE_KEY)).books.length).toBe(8);
    expect(parseProgress(tiny.getItem(SAVE_KEY)).shelf[0].uid).toBe('q');
  });
});

// ---------------------------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------------------------

const POOL = { place: PLACES, friend: FRIENDS, thing: THINGS, problem: PROBLEMS, fix: FIXES, ending: ENDINGS };
const SCENE_IDS = new Set([...PLACES.map((p) => p.id), ...EXTRA_SCENES]);
const BAD = /[{}]|undefined|null|NaN|\[object|\s[,.!?]|\.\.(?!\.)|\s{2}/;
const A_AN = /\b(a)\s+([aeiou]\w*)|\b(an)\s+([^aeiou\s"]\w*)/i;

function checkStory(st, name, label) {
  expect(st.pages.length, label).toBe(BEATS.length + 1);
  expect(st.title.length, label).toBeGreaterThan(3);
  st.pages.forEach((pg, k) => {
    const where = `${label} page ${k}: ${pg.text}`;
    expect(pg.text.length, where).toBeGreaterThan(10);
    expect(pg.text.length, where).toBeLessThanOrEqual(PAGE_MAX);
    if (BAD.test(pg.text)) throw new Error(`odd text: ${where}`);
    const m = pg.text.match(A_AN);
    if (m && !/^(a|an) (one|uni|use|hour|honest)/i.test(m[0])) throw new Error(`a/an: "${m[0]}" in ${where}`);
    if (!pg.text.includes(name)) throw new Error(`no name in ${where}`);
    if (!/^[A-Z"]/.test(pg.text)) throw new Error(`no capital: ${where}`);
    if (k > 0 && !/[.!?"]$/.test(pg.text)) throw new Error(`no full stop: ${where}`);
    if (!SCENE_IDS.has(pg.scene)) throw new Error(`no scene ${pg.scene}: ${where}`);
    if (!POSES.includes(pg.pose) || !POSES.includes(pg.friendPose)) throw new Error(`no pose: ${where}`);
  });
}

describe('words', () => {
  it('picks a or an by sound', () => {
    expect(withA('crab')).toBe('a crab');
    expect(withA('octopus')).toBe('an octopus');
    expect(withA('alien')).toBe('an alien');
    expect(withA('enormous pizza')).toBe('an enormous pizza');
    expect(withA('unicorn')).toBe('a unicorn');
    expect(article('hour')).toBe('an');
    for (const x of [...FRIENDS, ...THINGS]) expect(withA(x.noun)).toMatch(/^(a [^aeiou]|an [aeiou])/);
  });

  it("makes possessives, and tidies sentences", () => {
    expect(possessive('Noodle')).toBe("Noodle's");
    expect(possessive('Captain Toes')).toBe("Captain Toes'");
    expect(tidy('  hello.  the crab!  ok ')).toBe('Hello. The crab! Ok');
  });
});

describe('dealing cards', () => {
  it('deals four different cards from each beat, the same for the same seed', () => {
    for (const beat of BEATS) {
      for (let seed = 0; seed < 30; seed++) {
        const cards = dealCards(beat, seed);
        expect(cards.length).toBe(CARDS_PER_BEAT);
        expect(new Set(cards).size).toBe(CARDS_PER_BEAT);
        for (const id of cards) expect(validPick(beat, id)).toBe(true);
        expect(dealCards(beat, seed)).toEqual(cards);
      }
      const seen = new Set();
      for (let seed = 0; seed < 60; seed++) for (const id of dealCards(beat, seed)) seen.add(id);
      expect(seen.size, `${beat} uses its whole pool`).toBe(POOL[beat].length);
    }
  });

  it('offers other shelf puppets as friends', () => {
    let pals = 0;
    for (let seed = 0; seed < 20; seed++) {
      const cards = dealCards('friend', seed, ['aaa', 'bbb', 'ccc']);
      expect(cards.length).toBe(CARDS_PER_BEAT);
      const p = cards.filter((c) => c.startsWith('p:'));
      expect(p.length).toBe(2);
      pals += p.length;
    }
    expect(pals).toBe(40);
    expect(dealCards('friend', 1, ['aaa']).filter((c) => c.startsWith('p:')).length).toBe(1);
  });
});

describe('the story generator', () => {
  it('has many ways to tell each beat', () => {
    expect(VARIANTS.place).toBeGreaterThanOrEqual(20);
    expect(VARIANTS.friend).toBeGreaterThanOrEqual(10);
    expect(VARIANTS.thing).toBeGreaterThanOrEqual(15);
    expect(VARIANTS.fix).toBeGreaterThanOrEqual(10);
  });

  it('is the same story for the same picks and seed, and varies with the seed', () => {
    const picks = { place: 'jungle', friend: 'gator', thing: 'guitar', problem: 'hiccups', fix: 'big-hug', ending: 'disco' };
    const a = makeStory(picks, 5, { name: 'Pickle' });
    expect(makeStory(picks, 5, { name: 'Pickle' })).toEqual(a);
    const texts = new Set();
    for (let s = 0; s < 40; s++) texts.add(makeStory(picks, s, { name: 'Pickle' }).pages.map((p) => p.text).join('|'));
    expect(texts.size).toBeGreaterThan(30);
  });

  it('reads well for every combination of picks (all of them)', () => {
    const names = ['Noodle', 'Captain Toes', 'Riley', 'Sir Socks-a-lot', 'Mr. Stinky'];
    let n = 0;
    for (const a of PLACES) for (const b of FRIENDS) for (const c of THINGS) for (const d of PROBLEMS) for (const e of FIXES) for (const f of ENDINGS) {
      const name = names[n % names.length];
      const st = makeStory({ place: a.id, friend: b.id, thing: c.id, problem: d.id, fix: e.id, ending: f.id }, n * 7919 + 1, { name });
      for (const pg of st.pages) {
        if (pg.text.length > PAGE_MAX || BAD.test(pg.text) || !pg.text.includes(name) || A_AN.test(pg.text) || !SCENE_IDS.has(pg.scene)) {
          checkStory(st, name, `${a.id}/${b.id}/${c.id}/${d.id}/${e.id}/${f.id}`);
        }
      }
      n++;
    }
    expect(n).toBe(10 ** 6);
  }, 180000);

  it('reads well in every sentence variant, with stock and puppet friends and long names', () => {
    const names = ['Noodle', 'Bob', 'Fuzzy McFuzz', 'Banana Pants', 'Abcdefghijklmnop'];
    for (const name of names) {
      for (const friend of [...FRIENDS.map((f) => f.id), 'p:zzz']) {
        for (const pr of PROBLEMS) {
          for (const fx of FIXES) {
            for (let s = 0; s < 6; s++) {
              const picks = { place: PLACES[s % 10].id, friend, thing: THINGS[(s * 3) % 10].id, problem: pr.id, fix: fx.id, ending: ENDINGS[(s * 7 + fx.id.length) % 10].id };
              const st = makeStory(picks, s * 101 + name.length, { name, friendName: 'Toe-bert' });
              checkStory(st, name, JSON.stringify(picks));
            }
          }
        }
      }
    }
  });

  it('names puppet friends by name, and tells two puppets with the same name apart', () => {
    const picks = { place: 'castle', friend: 'p:abc', thing: 'map', problem: 'lost-hat', fix: 'tickles', ending: 'party' };
    for (let s = 0; s < 30; s++) {
      const st = makeStory(picks, s, { name: 'Noodle', friendName: 'Pickle' });
      expect(st.pages.slice(1).map((p) => p.text).join(' ')).not.toMatch(/\bthe p:|undefined/);
      expect(st.pages[4].text + st.pages[5].text + st.pages[2].text).toMatch(/Pickle/);
    }
    const same = makeStory(picks, 3, { name: 'Noodle', friendName: 'Noodle' });
    expect(same.pages[2].text).toMatch(/Noodle Two/);
  });

  it('says which scene, poses, effects and things each page draws', () => {
    const st = makeStory({ place: 'beach', friend: 'robot', thing: 'kite', problem: 'giant-wave', fix: 'use-thing', ending: 'fly-away' }, 1, { name: 'Noodle' });
    expect(st.pages.map((p) => p.beat)).toEqual(['title', ...BEATS]);
    expect(st.pages[0].showFriend).toBe(false);
    expect(st.pages[1].showFriend).toBe(false);
    expect(st.pages[3].showThing).toBe(true);
    expect(st.pages[4].effect).toBe('giant-wave');
    expect(st.pages[5].effect).toBe('sparkles');
    expect(st.pages[5].showThing).toBe(true);
    expect(st.pages[6].scene).toBe('sky');
    expect(st.pages[6].effect).toBe('hot-air-balloon');
    expect(spokenText(st.pages[6])).toMatch(/The end!$/);
    expect(spokenText(st.pages[2])).toBe(st.pages[2].text);
    const allEffects = new Set([...PROBLEMS, ...FIXES, ...ENDINGS].map((x) => x.effect));
    for (const pg of st.pages) if (pg.effect) expect(allEffects.has(pg.effect)).toBe(true);
  });

  it('falls back safely on unknown picks', () => {
    const st = makeStory({ place: 'mars', friend: 'yeti', thing: 'x', problem: 'y', fix: 'z', ending: 'w' }, 1, { name: 'Noodle' });
    checkStory(st, 'Noodle', 'unknown picks');
  });
});

describe('the bookshelf', () => {
  const picks = { place: 'beach', friend: 'crab', thing: 'kite', problem: 'stinky', fix: 'bubble', ending: 'nap' };

  it('keeps only the picks and seed', () => {
    const b = bookFromPicks(picks, 12345, { id: 'b1', uid: 'u1', time: 9 });
    expect(b).toEqual({ id: 'b1', u: 'u1', k: ['beach', 'crab', 'kite', 'stinky', 'bubble', 'nap'], s: 12345, t: 9 });
    expect(picksOf(b)).toEqual(picks);
    expect(JSON.stringify(b).length).toBeLessThan(120);
    expect(decodeBook(JSON.parse(JSON.stringify(b)))).toEqual(b);
  });

  it('caps the shelf, dropping the oldest', () => {
    let books = [];
    for (let k = 0; k < BOOKS_MAX + 10; k++) books = addBook(books, bookFromPicks(picks, k, { id: `b${k}`, uid: 'u', time: 1000 + k }));
    expect(books.length).toBe(BOOKS_MAX);
    expect(books[0].id).toBe('b10');
    expect(books[books.length - 1].id).toBe(`b${BOOKS_MAX + 9}`);
    // the same book again replaces it
    books = addBook(books, { ...books[0], t: 99999 });
    expect(books.length).toBe(BOOKS_MAX);
    expect(books[books.length - 1].id).toBe('b10');
  });

  it('rejects books it can not tell', () => {
    const good = bookFromPicks(picks, 1, { id: 'b', uid: 'u', time: 1 });
    expect(decodeBook({ ...good, k: ['beach', 'crab', 'kite', 'stinky', 'bubble', 'moon-party'] })).toBe(null);
    expect(decodeBook({ ...good, k: good.k.slice(0, 5) })).toBe(null);
    expect(decodeBook({ ...good, id: 7 })).toBe(null);
    expect(decodeBook(null)).toBe(null);
    expect(decodeBook({ ...good, k: ['beach', 'p:abc', 'kite', 'stinky', 'bubble', 'nap'] })).not.toBe(null);
    expect(decodeBook({ ...good, s: 'x' }).s).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------
// Shows
// ---------------------------------------------------------------------------------------------

describe('recording a show', () => {
  // a puppet dragged in a circle, at 60 frames a second, with taps
  function perform(seconds, fps = 60) {
    const rec = startRecording([{ x: 300, y: 330 }, { x: 700, y: 330 }, { x: 150, y: 480 }], { backdrop: 'beach' });
    const truth = [];
    for (let f = 1; f <= seconds * fps; f++) {
      const t = f / fps;
      const x = 500 + Math.cos(t) * 200;
      const y = 330 + Math.sin(t * 2) * 80;
      if (!recordMove(rec, t, 0, x, y) && rec.full) break;
      truth.push({ t, x, y });
      if (f % 90 === 0) recordTap(rec, t, 1);
      tickRecording(rec, t);
    }
    return { rec, truth };
  }

  it('records drags compactly and taps exactly', () => {
    const { rec } = perform(5);
    const show = finishRecording(rec);
    expect(show.d).toBe(500);
    const moves = show.e.filter((e) => e.length === 4);
    expect(moves.length).toBeGreaterThan(60);
    expect(moves.length).toBeLessThan(110);
    expect(tapsBetween(show, 0, 5)).toEqual([1, 1, 1]);
    expect(tapsBetween(show, 1.4, 1.6)).toEqual([1]);
    expect(show.s).toEqual({ backdrop: 'beach' });
  });

  it('replays the recorded positions', () => {
    const { rec, truth } = perform(6);
    const show = JSON.parse(JSON.stringify(finishRecording(rec)));
    // at every kept sample it is exactly where it was
    for (const e of show.e.filter((x) => x.length === 4)) {
      const pos = positionsAt(show, e[0] / 100);
      expect(pos[0]).toEqual({ x: e[2], y: e[3] });
    }
    // in between, it glides close to the real path
    for (const s of truth.filter((_, k) => k % 7 === 3)) {
      const pos = positionsAt(show, s.t);
      expect(Math.hypot(pos[0].x - s.x, pos[0].y - s.y)).toBeLessThan(12);
    }
    // things that never moved stay where they started
    expect(positionsAt(show, 3)[1]).toEqual({ x: 700, y: 330 });
    expect(positionsAt(show, 0)[2]).toEqual({ x: 150, y: 480 });
  });

  it('jumps (not glides) across a gap between two drags', () => {
    const rec = startRecording([{ x: 0, y: 0 }]);
    recordMove(rec, 0.1, 0, 100, 100, true);
    recordMove(rec, 2.0, 0, 500, 500, true);
    const show = finishRecording(rec);
    expect(positionsAt(show, 1)[0]).toEqual({ x: 100, y: 100 });
    expect(positionsAt(show, 0.05)[0]).toEqual({ x: 0, y: 0 });
    expect(positionsAt(show, 2.5)[0]).toEqual({ x: 500, y: 500 });
  });

  it('stops at thirty seconds and stays under the save budget', () => {
    const { rec } = perform(45);
    expect(rec.full).toBe(true);
    const show = finishRecording(rec);
    expect(show.d).toBeLessThanOrEqual(SHOW_MAX * 100);
    expect(recordTap(rec, 31, 0)).toBe(false);
    expect(show.e.every((e) => e[0] <= SHOW_MAX * 100)).toBe(true);
    expect(showSize(show)).toBeLessThan(SHOW_BUDGET);
  });

  it('caps the number of events', () => {
    const rec = startRecording([{ x: 0, y: 0 }]);
    for (let k = 0; k < EVENTS_MAX + 500; k++) recordTap(rec, k * 0.001, 0);
    expect(rec.events.length).toBe(EVENTS_MAX);
  });

  it('only keeps shows that fit', () => {
    const pr = createProgress();
    expect(keepShow(pr, 'u', { d: 100, a: [[0, 0]], e: Array.from({ length: 2000 }, (_, k) => [k, 0, 100, 100]) })).toBe(false);
    expect(pr.shows).toEqual({});
  });

  it('validates saved shows', () => {
    expect(decodeShow(null)).toBe(null);
    expect(decodeShow({ d: 99999, a: [[0, 0]], e: [] })).toBe(null);
    expect(decodeShow({ d: 100, a: [], e: [] })).toBe(null);
    const s = decodeShow({ d: 100, a: [[1.4, 2]], e: [[1, 0, 5, 5], [0, 0], [2, 5, 1, 1], 'x', [3, 0], [4, 0, 'a', 1], [5, 0, 7.6, 8]] });
    expect(s.e).toEqual([[1, 0, 5, 5], [3, 0], [5, 0, 8, 8]]);
    expect(s.a).toEqual([[1, 2]]);
  });

  it('leans a dragged puppet into the move and settles it after', () => {
    const b = createBody(100, 300);
    for (let k = 0; k < 20; k++) stepBody(b, 100 + k * 10, 300, 1 / 60);
    expect(b.lean).toBeGreaterThan(0.05);
    for (let k = 0; k < 240; k++) stepBody(b, 290, 300, 1 / 60);
    expect(Math.abs(b.lean)).toBeLessThan(0.01);
    expect(Math.abs(b.squash)).toBeLessThan(0.01);
    expect(b.x).toBe(290);
  });
});

describe('reading aloud', () => {
  it('is a safe no-op without speechSynthesis', () => {
    const s = createSpeech({});
    expect(s.available).toBe(false);
    expect(s.speak('hello')).toBe(false);
    expect(() => s.cancel()).not.toThrow();
    expect(s.speaking).toBe(false);
    expect(createSpeech(undefined).available).toBe(false);
  });

  it('never throws when the browser speech does', () => {
    const angry = { speechSynthesis: { speak() { throw new Error('x'); }, cancel() { throw new Error('y'); }, getVoices() { throw new Error('z'); } }, SpeechSynthesisUtterance: function U() {} };
    const s = createSpeech(angry);
    expect(s.available).toBe(true);
    expect(s.speak('hi')).toBe(false);
    expect(() => s.cancel()).not.toThrow();
    const getter = {};
    Object.defineProperty(getter, 'speechSynthesis', { get() { throw new Error('blocked'); } });
    expect(createSpeech(getter).available).toBe(false);
  });

  it('speaks with a friendly voice, rate and pitch when it can', () => {
    const said = [];
    let cancelled = 0;
    function U(text) {
      this.text = text;
    }
    const env = {
      SpeechSynthesisUtterance: U,
      speechSynthesis: {
        speak: (u) => said.push(u),
        cancel: () => cancelled++,
        getVoices: () => [{ name: 'Fred', lang: 'en-US' }, { name: 'Samantha', lang: 'en-US' }, { name: 'Amelie', lang: 'fr-FR' }],
      },
    };
    const s = createSpeech(env);
    expect(s.speak('Noodle went to the beach.')).toBe(true);
    expect(said[0].text).toBe('Noodle went to the beach.');
    expect(said[0].voice.name).toBe('Samantha');
    expect(said[0].rate).toBeLessThan(1);
    expect(said[0].pitch).toBeGreaterThan(1);
    expect(cancelled).toBe(1); // anything already being said stops first
    s.cancel();
    expect(cancelled).toBe(2);
    expect(s.speak('')).toBe(false);
  });
});

describe('the world', () => {
  it('has a place, friend, thing, problem, fix and ending pool of ten each, with unique ids', () => {
    for (const list of [PLACES, FRIENDS, THINGS, PROBLEMS, FIXES, ENDINGS]) {
      expect(list.length).toBe(10);
      expect(new Set(list.map((x) => x.id)).size).toBe(10);
    }
    expect(STAGE_BACKDROPS.length).toBeGreaterThanOrEqual(6);
    expect(STAGE_PROPS.length).toBeGreaterThanOrEqual(4);
    expect(makeRng(1)()).toBe(makeRng(1)());
  });
});
