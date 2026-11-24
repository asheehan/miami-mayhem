// The parts library: everything that can be stuck on a sock. Pure data, no drawing (the
// pictures are in parts-face.js and parts-wear.js, keyed by the same ids).
//
// Puppet units: (0, 0) is the middle of the face, +y is down. A long sock's head is about
// 236 units wide with its top at y = -210 and the mouth crease at y = 60.
//
// A part: { id, drawer, w, h, at, pair, back, tint, hang, eye }
//   w, h   its box at scale 1 (what the picture fills and what a finger can grab)
//   at     where a tapped (not dragged) part lands: the puppet's right side for pairs
//   pair   one of a pair (eyes, ears, arms...): snaps to mirror another part of its drawer
//          and is drawn mirrored on the puppet's left (x < 0)
//   back   starts behind the sock (wings, capes, long hair)
//   tint   starts in this felt colour (index into FELT) and can be recoloured; null = fixed
//   hang   hangs from its top edge (teeth, moustaches), so it moves with the top jaw while
//          its top is above the mouth
//   eye    has pupils that look at the finger, blink and react to the story's mood

const P = (id, w, h, at, opts = {}) => ({ id, w, h, at, pair: false, back: false, tint: null, hang: false, eye: false, ...opts });

export const DRAWERS = [
  { id: 'eyes', parts: [
    P('googly', 72, 72, [50, -62], { pair: true, eye: true }),
    P('googly-big', 96, 96, [56, -70], { pair: true, eye: true }),
    P('button-eye', 56, 56, [48, -60], { pair: true, tint: 13 }),
    P('sleepy', 70, 52, [50, -60], { pair: true, eye: true }),
    P('lashes', 72, 66, [50, -62], { pair: true, eye: true }),
    P('cyclops', 120, 112, [0, -70], { eye: true }),
    P('star-eye', 70, 70, [50, -62], { pair: true, eye: true }),
    P('glasses', 200, 84, [0, -62], { eye: true }),
    P('heart-eye', 64, 60, [50, -62], { pair: true, eye: true }),
    P('dizzy', 64, 64, [50, -62], { pair: true }),
    P('angry-eye', 70, 62, [50, -62], { pair: true, eye: true }),
    P('stalk-eye', 64, 140, [46, -170], { pair: true, eye: true, tint: 3 }),
  ] },
  { id: 'noses', parts: [
    P('pompom', 58, 58, [0, -2], { tint: 0 }),
    P('button-nose', 50, 50, [0, 0], { tint: 1 }),
    P('carrot', 104, 46, [36, 0]),
    P('pig', 70, 54, [0, 0]),
    P('clown', 64, 64, [0, 0]),
    P('potato', 82, 66, [0, 0], { tint: 12 }),
    P('triangle', 60, 56, [0, 0], { tint: 2 }),
    P('beak', 84, 60, [0, 4]),
    P('trunk', 64, 150, [0, 40], { tint: 11 }),
    P('cherry', 54, 74, [0, -6]),
    P('dog-nose', 66, 50, [0, 0]),
    P('heart-nose', 56, 52, [0, 0], { tint: 9 }),
  ] },
  { id: 'mouths', parts: [
    P('tongue', 64, 84, [0, 100]),
    P('buck-teeth', 64, 52, [0, 84], { hang: true }),
    P('fangs', 100, 46, [0, 80], { hang: true }),
    P('moustache', 150, 56, [0, 40], { hang: true, tint: 12 }),
    P('curly-tache', 160, 56, [0, 40], { hang: true, tint: 13 }),
    P('lipstick', 116, 60, [0, 62]),
    P('grin', 140, 64, [0, 72]),
    P('beard', 190, 140, [0, 140], { tint: 12 }),
    P('goatee', 60, 80, [0, 118], { tint: 12 }),
    P('bubblegum', 96, 96, [0, 86]),
    P('one-tooth', 34, 44, [-24, 80], { hang: true }),
    P('whiskers', 200, 70, [0, 26]),
    P('zipper', 130, 40, [0, 64]),
  ] },
  { id: 'hair', parts: [
    P('mop', 250, 130, [0, -200], { tint: 2 }),
    P('pigtail', 130, 170, [134, -120], { pair: true, tint: 1 }),
    P('mohawk', 70, 150, [0, -250], { tint: 9 }),
    P('curly', 240, 110, [0, -205], { tint: 12 }),
    P('antennae', 170, 170, [0, -270], { tint: 3 }),
    P('spiky', 220, 100, [0, -215], { tint: 13 }),
    P('bun', 110, 100, [0, -222], { tint: 12 }),
    P('long-hair', 380, 380, [0, -30], { back: true, tint: 2 }),
    P('afro', 360, 240, [0, -175], { back: true, tint: 13 }),
    P('bangs', 220, 76, [0, -175], { tint: 1 }),
    P('feather', 70, 160, [40, -270], { tint: 6 }),
    P('sprout', 90, 110, [0, -255]),
  ] },
  { id: 'ears', parts: [
    P('bear-ear', 78, 78, [96, -188], { pair: true, tint: 12 }),
    P('bunny-ear', 66, 180, [56, -280], { pair: true, back: true, tint: 10 }),
    P('cat-ear', 80, 86, [86, -200], { pair: true, tint: 13 }),
    P('floppy-ear', 74, 150, [130, -110], { pair: true, back: true, tint: 12 }),
    P('elephant-ear', 140, 160, [150, -80], { pair: true, back: true, tint: 11 }),
    P('devil-horn', 46, 76, [64, -225], { pair: true }),
    P('magic-horn', 54, 120, [0, -260]),
    P('antler', 120, 140, [96, -250], { pair: true }),
    P('mouse-ear', 100, 100, [104, -196], { pair: true, tint: 11 }),
    P('elf-ear', 84, 66, [130, -60], { pair: true, back: true }),
    P('bull-horn', 100, 66, [118, -170], { pair: true }),
  ] },
  { id: 'hats', parts: [
    P('sunhat', 320, 130, [0, -205], { tint: 2 }),
    P('cap', 250, 120, [10, -205], { tint: 0 }),
    P('crown', 180, 120, [0, -255]),
    P('pirate-hat', 290, 140, [0, -230]),
    P('chef-hat', 200, 190, [0, -280]),
    P('party-hat', 110, 160, [0, -270], { tint: 9 }),
    P('floatie', 300, 170, [0, -230]),
    P('top-hat', 170, 180, [0, -270], { tint: 13 }),
    P('wizard-hat', 180, 220, [0, -290], { tint: 7 }),
    P('cowboy-hat', 320, 130, [0, -225], { tint: 12 }),
    P('beanie', 220, 140, [0, -215], { tint: 5 }),
    P('propeller', 220, 150, [0, -235]),
    P('viking', 270, 160, [0, -225]),
  ] },
  { id: 'arms', parts: [
    P('noodle-arm', 204, 156, [170, 170], { pair: true, tint: 9 }),
    P('mitten', 115, 132, [160, 190], { pair: true, tint: 0 }),
    P('claw', 144, 120, [165, 170], { pair: true }),
    P('wing', 240, 204, [150, 120], { pair: true, back: true }),
    P('bat-wing', 252, 180, [150, 110], { pair: true, back: true }),
    P('robot-arm', 192, 132, [170, 180], { pair: true }),
    P('glove', 132, 144, [170, 160], { pair: true }),
    P('tentacle', 168, 204, [160, 200], { pair: true, tint: 8 }),
    P('fairy-wing', 228, 240, [140, 100], { pair: true, back: true }),
    P('boxing-glove', 144, 132, [170, 180], { pair: true }),
    P('leaf-hand', 180, 132, [165, 170], { pair: true }),
  ] },
  { id: 'extras', parts: [
    P('bow-tie', 130, 64, [0, 215], { tint: 0 }),
    P('necklace', 210, 100, [0, 200]),
    P('cape', 340, 380, [0, 170], { back: true, tint: 0 }),
    P('scarf', 260, 150, [0, 215], { tint: 5 }),
    P('sunglasses', 210, 70, [0, -62]),
    P('eye-patch', 90, 84, [50, -62], { pair: true }),
    P('patch', 80, 80, [60, 170], { tint: 2 }),
    P('big-button', 56, 56, [0, 160], { tint: 6 }),
    P('sticker-star', 70, 70, [-60, 150]),
    P('sticker-heart', 66, 62, [64, 140]),
    P('sticker-bolt', 54, 80, [-62, 210]),
    P('medal', 70, 120, [-56, 210]),
    P('freckles', 70, 46, [76, 20], { pair: true }),
    P('cheeks', 64, 44, [84, 28], { pair: true }),
    P('bandage', 90, 40, [-60, -140]),
    P('necktie', 70, 170, [0, 250], { tint: 7 }),
  ] },
];

export const PARTS = DRAWERS.flatMap((d) => d.parts.map((p) => ({ ...p, drawer: d.id })));
export const PART_BY_ID = new Map(PARTS.map((p) => [p.id, p]));
export const partDef = (id) => PART_BY_ID.get(id) || null;
