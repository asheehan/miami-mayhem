// Iggy the iguana: small, green and cheeky, in his pink striped swim ring with his sunglasses
// pushed up on his head. Drawn in world units, facing right (flip for left).
//
// Poses (origin in brackets):
//   'stand' up on his back legs waving, ring round his middle (feet)
//   'peek'  head and two hands over an edge (the edge, at y = 0)
//   'lie'   flat on his tummy sunbathing, tail out behind (tummy on the ground)
//   'float' head, arms and ring above a waterline at y = 0 (the waterline)
//   'cling' hugging a pole or trunk, side on (middle of his body)
import { TAU, INK, circle, ellipse, poly, limb, fs } from './kit.js';

export const IGGY = {
  body: '#5fc93c',
  dark: '#2f8a2a',
  belly: '#bdf07a',
  crest: '#d6f55a',
  ring: '#ff4f9a',
  stripe: '#ffffff',
  frame: '#ff8a1f',
  lens: '#28d7ff',
  dewlap: '#ffcf4a',
};

// Boxes, as [centre x, centre y, half w, half h] around each pose's origin.
export const IGGY_BOX = {
  stand: [0, -42, 30, 44],
  peek: [2, -16, 30, 22],
  lie: [0, -14, 52, 18],
  float: [0, -22, 30, 26],
  cling: [0, -4, 22, 40],
};

const blinkAt = (t, phase = 0) => ((t + phase) % 3.7) < 0.14;

// The head, centred on its cranium, facing right.
function head(ctx, t, { blink = false, grin = 1 } = {}) {
  // crest spikes along the top and back
  for (let i = 0; i < 5; i++) {
    const a = -2.5 + i * 0.32;
    const x = Math.cos(a) * 16;
    const y = Math.sin(a) * 14;
    poly(ctx, [[x - 4, y + 2], [x + Math.cos(a) * 9 - 1, y + Math.sin(a) * 9], [x + 4, y + 3]], IGGY.crest, 2);
  }
  // dewlap under the chin
  ctx.beginPath();
  ctx.moveTo(-2, 9);
  ctx.quadraticCurveTo(2, 26, 14, 11);
  fs(ctx, IGGY.dewlap, 2.5);
  // cranium and snout as one shape
  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 15, 0, 0, TAU);
  ctx.moveTo(32, 4);
  ctx.ellipse(18, 4, 14, 10, 0.1, 0, TAU);
  ctx.fillStyle = IGGY.body;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fill();
  // cheek scale
  circle(ctx, -6, 6, 5, IGGY.crest, 2);
  // nostril and the cheeky grin with one tooth
  circle(ctx, 28, 0, 1.6, INK, 0);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(6, 8);
  ctx.quadraticCurveTo(18, 14 + grin * 3, 30, 7);
  ctx.stroke();
  poly(ctx, [[21, 11.5], [24, 11], [22.5, 15]], '#ffffff', 1.2);
  // eye: big and white, pupil looking forward, a raised brow
  if (blink) {
    ctx.beginPath();
    ctx.arc(5, -3, 7, 0.2, Math.PI - 0.2);
    ctx.stroke();
  } else {
    circle(ctx, 5, -3, 7.5, '#ffffff', 2.5);
    circle(ctx, 8, -2.5, 3.8, INK, 0);
    circle(ctx, 9.3, -3.8, 1.3, '#ffffff', 0);
  }
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-2, -13);
  ctx.quadraticCurveTo(5, -17, 12, -11);
  ctx.stroke();
  // sunglasses pushed up on top of his head
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ellipse(ctx, -4, -15, 6.5, 4.5, IGGY.lens, 2.5, INK, -0.2);
  ellipse(ctx, 9, -16.5, 6.5, 4.5, IGGY.lens, 2.5, INK, 0.1);
  ctx.strokeStyle = IGGY.frame;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(-4, -15, 6.5, 4.5, -0.2, 0, TAU);
  ctx.moveTo(15.5, -16.5);
  ctx.ellipse(9, -16.5, 6.5, 4.5, 0.1, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(-7, -17, 2.5, 2);
  ctx.fillRect(6, -18.5, 2.5, 2);
}

// The swim ring, seen from the front at a slight tilt: a fat pink band with white stripes.
function ring(ctx, x, y, rx, ry, back) {
  ctx.save();
  ctx.beginPath();
  if (back) ctx.rect(x - rx - 8, y - ry - 12, rx * 2 + 16, ry + 12);
  else ctx.rect(x - rx - 8, y, rx * 2 + 16, ry + 14);
  ctx.clip();
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.lineWidth = ry * 1.5 + 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = ry * 1.5;
  ctx.strokeStyle = IGGY.ring;
  ctx.stroke();
  ctx.lineWidth = ry * 1.5;
  ctx.strokeStyle = IGGY.stripe;
  ctx.setLineDash([7, 13]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function hand(ctx, x, y, a = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  for (const k of [-1, 0, 1]) ellipse(ctx, k * 4, -2, 2.6, 5, IGGY.body, 2, INK, k * 0.35);
  ellipse(ctx, 0, 1, 6.5, 4.5, IGGY.body, 2.2);
  ctx.restore();
}

function tail(ctx, pts, w = 10) {
  limb(ctx, pts, IGGY.body, w, 2.5);
  // stripes
  ctx.strokeStyle = IGGY.dark;
  ctx.lineWidth = w * 0.7;
  ctx.setLineDash([4, 7]);
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.setLineDash([]);
}

function standBody(ctx, t, o, inWater = false) {
  const wave = Math.sin(t * 6 + (o.phase || 0));
  if (!inWater) {
    tail(ctx, [[-6, -14], [-24, -6], [-36, -14], [-40, -30], [-32, -38]], 9);
    // feet
    ellipse(ctx, -9, -3, 8, 4.5, IGGY.body, 2.5);
    ellipse(ctx, 10, -3, 8, 4.5, IGGY.body, 2.5);
    limb(ctx, [[-7, -20], [-9, -5]], IGGY.body, 8);
    limb(ctx, [[7, -20], [10, -5]], IGGY.body, 8);
  }
  ring(ctx, 0, -30, 24, 8, true);
  // body
  ellipse(ctx, 0, -32, 15, 21, IGGY.body, 3);
  ellipse(ctx, 3, -29, 8, 14, IGGY.belly, 0);
  for (let k = 0; k < 3; k++) {
    ctx.strokeStyle = 'rgba(47,138,42,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-3, -38 + k * 7);
    ctx.lineTo(9, -38 + k * 7);
    ctx.stroke();
  }
  ring(ctx, 0, -30, 24, 8, false);
  // arms: one resting on the ring, one waving
  limb(ctx, [[-10, -44], [-20, -34], [-22, -26]], IGGY.body, 7);
  hand(ctx, -22, -24, 0.2);
  const ax = 14 + wave * 3;
  limb(ctx, [[9, -45], [20, -54], [ax + 10, -68]], IGGY.body, 7);
  hand(ctx, ax + 10, -72, 0.2 + wave * 0.3);
  ctx.save();
  ctx.translate(4, -66);
  head(ctx, t, { blink: blinkAt(t, o.phase || 0) });
  ctx.restore();
}

export function drawIggy(ctx, pose = 'stand', t = 0, o = {}) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (o.flip) ctx.scale(-1, 1);
  const bob = o.still ? 0 : Math.sin(t * 2.2 + (o.phase || 0)) * 1.2;
  if (pose === 'peek') {
    ctx.translate(0, bob * 0.5);
    ctx.save();
    ctx.translate(0, -20);
    ctx.rotate(-0.08);
    head(ctx, t, { blink: blinkAt(t, o.phase || 0) });
    ctx.restore();
    hand(ctx, -16, 0, -0.15);
    hand(ctx, 18, 1, 0.15);
  } else if (pose === 'float') {
    ctx.translate(0, 28 + bob);
    standBody(ctx, t, o, true);
  } else if (pose === 'lie') {
    tail(ctx, [[-20, -8], [-40, -4], [-58, -8], [-70, -4]], 9);
    ellipse(ctx, -14, -2, 8, 4, IGGY.body, 2.5);
    ellipse(ctx, 18, -2, 8, 4, IGGY.body, 2.5);
    ellipse(ctx, 0, -10, 28, 11, IGGY.body, 3);
    for (let k = 0; k < 6; k++) poly(ctx, [[-20 + k * 7, -19], [-17 + k * 7, -26], [-13 + k * 7, -19]], IGGY.crest, 1.8);
    ring(ctx, 0, -10, 13, 12, true);
    ring(ctx, 0, -10, 13, 12, false);
    hand(ctx, 26, -2, 1.2);
    ctx.save();
    ctx.translate(36, -18 + bob * 0.5);
    ctx.scale(0.95, 0.95);
    head(ctx, t, { blink: true, grin: 1.5 });
    ctx.restore();
  } else if (pose === 'cling') {
    // side on, hugging something upright to his right; tail hangs down
    tail(ctx, [[-6, 18], [-10, 34], [-4, 44], [4, 40]], 8);
    ellipse(ctx, -2, 2, 13, 22, IGGY.body, 3);
    ellipse(ctx, 2, 4, 6, 14, IGGY.belly, 0);
    ring(ctx, -2, 4, 20, 7, true);
    ring(ctx, -2, 4, 20, 7, false);
    limb(ctx, [[6, -10], [16, -8]], IGGY.body, 7);
    hand(ctx, 18, -8, 1.5);
    limb(ctx, [[6, 18], [16, 20]], IGGY.body, 7);
    hand(ctx, 18, 20, 1.5);
    ctx.save();
    ctx.translate(2, -28 + bob * 0.4);
    head(ctx, t, { blink: blinkAt(t, o.phase || 0) });
    ctx.restore();
  } else {
    ctx.translate(0, bob * 0.3);
    standBody(ctx, t, o, false);
  }
  ctx.restore();
}
