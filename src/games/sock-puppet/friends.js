// The story's stock friends (felt-toy critters in every pose), the things the puppet finds
// and the stage props, plus their picture cards. Drawing only.
//
// A friend stands with the middle of its feet at (0, 0), about FRIEND_H units tall, turned a
// little towards -x (where the puppet stands). Its -x arm is the one that waves.
import { C, TAU, font, shade, roundRect, ellipse, circle, fillInk, smoothPath, shine, star, heart } from './art.js';

export const FRIEND_H = 300;

const LW = 6; // outline width in friend units

// ---------------------------------------------------------------------------------------------
// Poses
// ---------------------------------------------------------------------------------------------

// How a pose moves the body, limbs and face at time t. Arm angles: 0 hangs down, PI/2 sticks
// straight out, PI points up; 'chin' reaches for the chin.
function poseOf(o) {
  const t = o.t || 0;
  const pose = o.pose || 'wave';
  const p = {
    t, pose, dx: 0, dy: 0, rot: 0, sy: 1 + Math.sin(t * 2.2) * 0.012, aL: 0.4, aR: 0.4,
    eyes: 'open', mouth: 'smile', brows: null, sweat: false, zzz: false, thought: false, look: [-0.45, 0.15], jaw: 0,
  };
  if (pose === 'wave') {
    p.aL = 2.55 + Math.sin(t * 9) * 0.42;
    p.rot = Math.sin(t * 2) * 0.02;
  } else if (pose === 'surprised') {
    p.dy = -Math.max(0, Math.sin(t * 5)) * 14;
    p.aL = p.aR = 2.05 + Math.sin(t * 5) * 0.12;
    p.eyes = 'wide';
    p.mouth = 'o';
    p.brows = 'raised';
    p.look = [0, 0];
    p.jaw = 0.3;
  } else if (pose === 'laugh') {
    p.dx = Math.sin(t * 31) * 3;
    p.rot = Math.sin(t * 6) * 0.05;
    p.dy = -Math.abs(Math.sin(t * 12)) * 4;
    p.aL = p.aR = 0.75 + Math.sin(t * 12) * 0.2;
    p.eyes = 'happy';
    p.mouth = 'laugh';
    p.jaw = 0.25 + Math.abs(Math.sin(t * 12)) * 0.15;
  } else if (pose === 'worried') {
    p.dx = Math.sin(t * 15) * 1.6;
    p.aL = p.aR = 0.15;
    p.mouth = 'wobble';
    p.brows = 'up';
    p.sweat = true;
    p.look = [-0.2, 0.35];
  } else if (pose === 'cheer') {
    p.dy = -Math.abs(Math.sin(t * 4.5)) * 26;
    p.aL = p.aR = 2.8 + Math.sin(t * 9) * 0.14;
    p.eyes = 'happy';
    p.mouth = 'laugh';
    p.jaw = 0.35;
  } else if (pose === 'sleep') {
    p.rot = -0.07;
    p.sy = 0.95 + Math.sin(t * 1.6) * 0.025;
    p.aL = p.aR = 0.08;
    p.eyes = 'closed';
    p.mouth = 'sleep';
    p.zzz = true;
  } else if (pose === 'dance') {
    const s = Math.sin(t * 7);
    p.rot = Math.sin(t * 3.5) * 0.13;
    p.dy = -Math.abs(Math.sin(t * 7)) * 9;
    p.aL = 1.7 + s * 0.75;
    p.aR = 1.7 - s * 0.75;
    p.eyes = 'happy';
    p.mouth = 'grin';
  } else if (pose === 'think') {
    p.aL = 'chin';
    p.aR = 0.3;
    p.look = [-0.25, -0.95];
    p.mouth = 'smirk';
    p.brows = 'think';
    p.thought = true;
    p.rot = Math.sin(t * 1.5) * 0.015;
  }
  if ((o.blink || 0) > 0.5 && (p.eyes === 'open' || p.eyes === 'wide')) p.eyes = 'closed';
  return p;
}

// ---------------------------------------------------------------------------------------------
// Face and limb helpers
// ---------------------------------------------------------------------------------------------

// One eye. opts: { sclera, pupil, lid } (lid: colour of a heavy top lid, for the gator).
function eye(ctx, x, y, r, P, opts = {}) {
  const sclera = opts.sclera || '#ffffff';
  const pupil = opts.pupil || C.ink;
  const mode = P.eyes;
  ctx.lineCap = 'round';
  if (mode === 'closed') {
    ctx.beginPath();
    ctx.arc(x, y - r * 0.2, r * 0.75, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.lineWidth = LW;
    ctx.strokeStyle = opts.closedInk || C.ink;
    ctx.stroke();
    return;
  }
  if (mode === 'happy') {
    ctx.beginPath();
    ctx.arc(x, y + r * 0.35, r * 0.75, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.lineWidth = LW * 1.1;
    ctx.strokeStyle = opts.closedInk || C.ink;
    ctx.stroke();
    return;
  }
  const rr = mode === 'wide' ? r * 1.22 : r;
  circle(ctx, x, y, rr);
  fillInk(ctx, sclera, LW * 0.8);
  const pr = mode === 'wide' ? rr * 0.32 : rr * 0.52;
  const [lx, ly] = P.look;
  circle(ctx, x + lx * rr * 0.38, y + ly * rr * 0.38, pr);
  ctx.fillStyle = pupil;
  ctx.fill();
  circle(ctx, x + lx * rr * 0.38 - pr * 0.35, y + ly * rr * 0.38 - pr * 0.4, pr * 0.32);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  if (opts.lid && mode === 'open') {
    ctx.save();
    circle(ctx, x, y, rr);
    ctx.clip();
    ctx.fillStyle = opts.lid;
    ctx.fillRect(x - rr, y - rr, rr * 2, rr * 0.85);
    ctx.beginPath();
    ctx.moveTo(x - rr, y - rr * 0.15);
    ctx.lineTo(x + rr, y - rr * 0.15);
    ctx.lineWidth = LW * 0.8;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.restore();
    circle(ctx, x, y, rr);
    ctx.lineWidth = LW * 0.8;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  }
}

function brows(ctx, x1, x2, y, r, P, grumpyByDefault = false) {
  let kind = P.brows;
  if (!kind && grumpyByDefault && P.eyes !== 'happy' && P.eyes !== 'closed') kind = 'grumpy';
  if (!kind) return;
  ctx.lineWidth = LW * 1.1;
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink;
  const lift = r * 1.45;
  for (const [x, s] of [[x1, -1], [x2, 1]]) {
    ctx.beginPath();
    if (kind === 'raised') {
      ctx.arc(x, y - lift * 1.05, r * 0.8, 1.2 * Math.PI, 1.8 * Math.PI);
    } else if (kind === 'up') {
      // inner ends up: worried
      ctx.moveTo(x + s * r * 0.8, y - lift + r * 0.25);
      ctx.lineTo(x - s * r * 0.6, y - lift - r * 0.25);
    } else if (kind === 'grumpy') {
      // inner ends down: cross
      ctx.moveTo(x + s * r * 0.9, y - lift * 0.95);
      ctx.lineTo(x - s * r * 0.7, y - lift * 0.62);
    } else if (kind === 'think') {
      // one brow raised high, the other flat
      if (s < 0) ctx.arc(x, y - lift * 1.1, r * 0.75, 1.2 * Math.PI, 1.8 * Math.PI);
      else {
        ctx.moveTo(x - r * 0.7, y - lift * 0.9);
        ctx.lineTo(x + r * 0.7, y - lift * 0.9);
      }
    }
    ctx.stroke();
  }
}

function mouth(ctx, x, y, w, P, opts = {}) {
  const inside = opts.inside || C.mouth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = opts.ink || C.ink;
  ctx.lineWidth = LW;
  const m = P.mouth;
  if (m === 'smile' || m === 'grin') {
    ctx.beginPath();
    if (m === 'grin') {
      ctx.moveTo(x - w * 0.5, y - w * 0.08);
      ctx.quadraticCurveTo(x, y + w * 0.55, x + w * 0.5, y - w * 0.08);
      ctx.closePath();
      ctx.fillStyle = inside;
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - w * 0.42, y - w * 0.02);
      ctx.lineTo(x + w * 0.42, y - w * 0.02);
      ctx.lineTo(x + w * 0.3, y + w * 0.1);
      ctx.lineTo(x - w * 0.3, y + w * 0.1);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    } else {
      ctx.moveTo(x - w * 0.5, y - w * 0.05);
      ctx.quadraticCurveTo(x, y + w * 0.4, x + w * 0.5, y - w * 0.05);
      ctx.stroke();
    }
  } else if (m === 'o') {
    ellipse(ctx, x, y + w * 0.1, w * 0.2, w * 0.26);
    fillInk(ctx, inside, LW, opts.ink);
  } else if (m === 'laugh') {
    ctx.beginPath();
    ctx.moveTo(x - w * 0.5, y - w * 0.1);
    ctx.lineTo(x + w * 0.5, y - w * 0.1);
    ctx.quadraticCurveTo(x + w * 0.45, y + w * 0.6, x, y + w * 0.6);
    ctx.quadraticCurveTo(x - w * 0.45, y + w * 0.6, x - w * 0.5, y - w * 0.1);
    ctx.closePath();
    ctx.fillStyle = inside;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ellipse(ctx, x, y + w * 0.6, w * 0.3, w * 0.2);
    ctx.fillStyle = C.tongue;
    ctx.fill();
    ctx.restore();
    ctx.stroke();
  } else if (m === 'wobble') {
    ctx.beginPath();
    const n = 4;
    for (let i = 0; i <= n * 2; i++) {
      const px = x - w * 0.42 + (w * 0.84 * i) / (n * 2);
      const py = y + w * 0.12 + (i % 2 ? -1 : 1) * w * 0.06 + Math.sin(P.t * 14 + i) * 1.2;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.stroke();
  } else if (m === 'sleep') {
    ellipse(ctx, x, y + w * 0.08, w * 0.12, w * (0.08 + Math.sin(P.t * 1.6) * 0.03));
    fillInk(ctx, inside, LW * 0.8, opts.ink);
  } else if (m === 'smirk') {
    ctx.beginPath();
    ctx.moveTo(x - w * 0.35, y + w * 0.12);
    ctx.quadraticCurveTo(x + w * 0.1, y + w * 0.2, x + w * 0.4, y - w * 0.05);
    ctx.stroke();
  } else if (m === 'frown') {
    ctx.beginPath();
    ctx.moveTo(x - w * 0.4, y + w * 0.2);
    ctx.quadraticCurveTo(x, y - w * 0.12, x + w * 0.4, y + w * 0.2);
    ctx.stroke();
  }
}

function cheeks(ctx, x1, x2, y, r) {
  ctx.fillStyle = 'rgba(255,90,130,0.38)';
  ellipse(ctx, x1, y, r, r * 0.62);
  ctx.fill();
  ellipse(ctx, x2, y, r, r * 0.62);
  ctx.fill();
}

// Extras over the head: a sweat drop, sleepy Zs, thinking bubbles.
function extras(ctx, P, hx, hy) {
  const t = P.t;
  if (P.sweat) {
    const k = (t * 0.8) % 1;
    const x = hx + 44;
    const y = hy - 20 + k * 30;
    ctx.globalAlpha = 1 - k * 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y - 16);
    ctx.quadraticCurveTo(x + 11, y, x, y + 7);
    ctx.quadraticCurveTo(x - 11, y, x, y - 16);
    fillInk(ctx, '#8fdcff', 3.5);
    ctx.globalAlpha = 1;
  }
  if (P.zzz) {
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.45 + i / 3) % 1;
      ctx.save();
      ctx.globalAlpha = Math.min(1, (1 - k) * 2);
      ctx.font = font(22 + k * 26);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 6;
      ctx.strokeStyle = C.ink;
      ctx.lineJoin = 'round';
      const x = hx + 30 + k * 50;
      const y = hy - 40 - k * 80;
      ctx.strokeText('z', x, y);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('z', x, y);
      ctx.restore();
    }
  }
  if (P.thought) {
    for (let i = 0; i < 3; i++) {
      const r = 6 + i * 5;
      const bob = Math.sin(t * 3 + i) * 3;
      circle(ctx, hx + 30 + i * 22, hy - 30 - i * 26 + bob, r);
      fillInk(ctx, '#ffffff', 3.5);
    }
  }
}

// A limb from (x, y) on the given side (-1 = the -x side). Returns the hand position.
function limb(ctx, P, side, x, y, len, w, col, opts = {}) {
  let a = side < 0 ? P.aL : P.aR;
  let L = len;
  if (a === 'chin') {
    const [cx, cy] = opts.chin || [x + side * 10, y - len];
    const dx = cx - x;
    const dy = cy - y;
    a = Math.atan2(dx * side, dy);
    L = Math.min(len * 1.15, Math.hypot(dx, dy));
  }
  const ex = x + Math.sin(a) * side * L;
  const ey = y + Math.cos(a) * L;
  // a little elbow bend, out and away from the body
  const bend = (opts.bend ?? 0.18) * L;
  const mx = (x + ex) / 2 + Math.cos(a) * side * bend * 0.6;
  const my = (y + ey) / 2 - Math.sin(a) * bend * 0.6 * (a > Math.PI / 2 ? -1 : 1);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(mx, my, ex, ey);
  ctx.lineWidth = w + LW * 2;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.lineWidth = w;
  ctx.strokeStyle = col;
  ctx.stroke();
  if (opts.hand) opts.hand(ex, ey, Math.atan2(ey - my, ex - mx));
  return [ex, ey];
}

const mitt = (ctx, col, r) => (x, y) => {
  circle(ctx, x, y, r);
  fillInk(ctx, col, LW);
};

function legStroke(ctx, pts, w, col) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  if (pts.length === 6) ctx.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]);
  else ctx.lineTo(pts[2], pts[3]);
  ctx.lineWidth = w + LW * 2;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.lineWidth = w;
  ctx.strokeStyle = col;
  ctx.stroke();
}

// ---------------------------------------------------------------------------------------------
// The friends
// ---------------------------------------------------------------------------------------------

function crab(ctx, P) {
  const red = '#ff5b45';
  const dark = shade(red, -0.25);
  // legs, three a side
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const kick = P.pose === 'dance' ? Math.sin(P.t * 14 + i * 2 + s) * 8 : 0;
      legStroke(ctx, [s * (30 + i * 25), -84, s * (88 + i * 30), -76 + i * 16 + kick, s * (62 + i * 38), -4], 11, shade(red, -0.08));
    }
  }
  // claws
  const claw = (x, y, ang) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const open = 0.28 + (P.pose === 'wave' || P.pose === 'cheer' || P.pose === 'dance' ? Math.abs(Math.sin(P.t * 9)) * 0.3 : 0);
    // lower pincer
    ctx.save();
    ctx.rotate(open);
    ellipse(ctx, 26, 6, 26, 12);
    fillInk(ctx, red, LW);
    ctx.restore();
    // upper pincer
    ctx.save();
    ctx.rotate(-open);
    ellipse(ctx, 28, -8, 32, 17);
    fillInk(ctx, red, LW);
    ctx.restore();
    circle(ctx, 0, 0, 20);
    fillInk(ctx, red, LW);
    ctx.restore();
  };
  limb(ctx, P, 1, 96, -120, 62, 14, red, { hand: (x, y, a) => claw(x, y, a), chin: [-30, -110] });
  // eye stalks
  const bob = Math.sin(P.t * 3) * 3;
  legStroke(ctx, [-34, -170, -42, -228 + bob], 9, red);
  legStroke(ctx, [26, -172, 32, -232 - bob], 9, red);
  // body
  ellipse(ctx, 0, -128, 118, 74);
  fillInk(ctx, red, LW);
  ellipse(ctx, -8, -100, 78, 36);
  ctx.fillStyle = '#ff8f6b';
  ctx.fill();
  shine(ctx, -60, -165, 20, 0.5);
  for (const [x, y] of [[50, -165], [72, -140], [36, -150]]) {
    circle(ctx, x, y, 6);
    ctx.fillStyle = dark;
    ctx.fill();
  }
  eye(ctx, -42, -238 + bob, 25, P);
  eye(ctx, 32, -242 - bob, 25, P);
  brows(ctx, -42, 32, -238, 22, P);
  cheeks(ctx, -64, 40, -112, 15);
  mouth(ctx, -12, -125, 56, P);
  limb(ctx, P, -1, -96, -120, 62, 14, red, { hand: (x, y, a) => claw(x, y, a), chin: [-30, -110] });
  extras(ctx, P, 30, -280);
}

function robot(ctx, P) {
  const steel = '#9ed6ea';
  const dark = '#5c9ab8';
  const screen = '#16384a';
  const glow = '#7ffcff';
  // legs and feet
  for (const s of [-1, 1]) {
    roundRect(ctx, s * 34 - 13, -64, 26, 56, 8);
    fillInk(ctx, dark, LW);
    roundRect(ctx, s * 38 - 30, -18, 58, 22, 10);
    fillInk(ctx, '#ff8a3d', LW);
  }
  const hand = (x, y, a) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.arc(8, 0, 17, 0.55, TAU - 0.55);
    ctx.lineWidth = 12 + LW * 2;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#c9d2dc';
    ctx.stroke();
    ctx.restore();
  };
  limb(ctx, P, 1, 70, -150, 72, 14, '#c9d2dc', { hand, chin: [-20, -195] });
  // body
  roundRect(ctx, -72, -178, 144, 120, 22);
  fillInk(ctx, steel, LW);
  roundRect(ctx, -44, -152, 88, 66, 12);
  fillInk(ctx, '#d9f1fa', LW * 0.8);
  const lights = ['#ff4f6d', '#ffd23f', '#3ccf4e'];
  lights.forEach((c, i) => {
    const on = Math.floor(P.t * 3 + i) % 3 !== 0;
    circle(ctx, -24 + i * 24, -132, 9);
    fillInk(ctx, on ? c : shade(c, -0.5), 3.5);
  });
  heart(ctx, 0, -102, 12);
  fillInk(ctx, '#ff6fb1', 3.5);
  // neck and head
  roundRect(ctx, -16, -196, 32, 24, 6);
  fillInk(ctx, dark, LW);
  // antenna
  const sway = Math.sin(P.t * 3) * 6;
  legStroke(ctx, [0, -300, sway, -338], 4, '#c9d2dc');
  circle(ctx, sway, -344, 13);
  fillInk(ctx, Math.floor(P.t * 2) % 2 ? '#ff4f6d' : '#ffd23f', LW * 0.8);
  // ear bolts
  for (const s of [-1, 1]) {
    roundRect(ctx, s * 82 - 12, -268, 24, 40, 8);
    fillInk(ctx, '#ff8a3d', LW);
  }
  roundRect(ctx, -80, -306, 160, 116, 28);
  fillInk(ctx, steel, LW);
  shine(ctx, -56, -290, 14, 0.6);
  roundRect(ctx, -62, -290, 124, 84, 18);
  fillInk(ctx, screen, LW * 0.8);
  eye(ctx, -30, -256, 18, P, { sclera: glow, pupil: screen, closedInk: glow });
  eye(ctx, 22, -257, 18, P, { sclera: glow, pupil: screen, closedInk: glow });
  ctx.save();
  if (P.brows) {
    ctx.strokeStyle = glow;
  }
  ctx.restore();
  mouth(ctx, -4, -228, 42, P, { ink: glow, inside: '#0b2230' });
  limb(ctx, P, -1, -70, -150, 72, 14, '#c9d2dc', { hand, chin: [-20, -210] });
  extras(ctx, P, 40, -320);
}

function gator(ctx, P) {
  const green = '#5cbf4a';
  const dark = '#3a8f34';
  const belly = '#f1f5b8';
  // tail
  const wag = Math.sin(P.t * (P.pose === 'dance' ? 7 : 2.5)) * 10;
  smoothPath(ctx, [30, -40, 110, -50, 175, -20 + wag, 190, -6 + wag, 150, -2, 70, -6, 20, -14], true);
  fillInk(ctx, green, LW);
  for (let i = 0; i < 4; i++) {
    const x = 70 + i * 28;
    ctx.beginPath();
    ctx.moveTo(x - 10, -44 + i * 6 + wag * (i / 4));
    ctx.lineTo(x, -60 + i * 8 + wag * (i / 4));
    ctx.lineTo(x + 10, -42 + i * 6 + wag * (i / 4));
    fillInk(ctx, dark, 4);
  }
  // legs
  for (const s of [-1, 1]) {
    roundRect(ctx, s * 36 - 22, -64, 44, 62, 18);
    fillInk(ctx, green, LW);
    for (let k = -1; k <= 1; k++) {
      circle(ctx, s * 36 + k * 14, -4, 8);
      fillInk(ctx, green, 4);
    }
  }
  const hand = (x, y) => {
    circle(ctx, x, y, 14);
    fillInk(ctx, green, LW);
  };
  limb(ctx, P, 1, 58, -150, 56, 20, green, { hand, chin: [-60, -210] });
  // body
  ellipse(ctx, 0, -118, 76, 92);
  fillInk(ctx, green, LW);
  ellipse(ctx, -6, -108, 48, 70);
  ctx.fillStyle = belly;
  ctx.fill();
  ctx.strokeStyle = '#c9cf86';
  ctx.lineWidth = 4;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-44, -150 + i * 26);
    ctx.quadraticCurveTo(-6, -142 + i * 26, 34, -150 + i * 26);
    ctx.stroke();
  }
  // head: skull with a long snout to -x
  const jaw = P.jaw;
  ctx.save();
  ctx.translate(18, -212);
  ctx.rotate(-jaw * 0.9);
  roundRect(ctx, -146, -6, 150, 30, 14);
  fillInk(ctx, green, LW);
  ctx.restore();
  if (jaw > 0.02) {
    // inside of the open mouth
    ctx.beginPath();
    ctx.moveTo(18, -212);
    ctx.lineTo(-128, -214);
    ctx.lineTo(18 - Math.cos(jaw * 0.9) * 136, -206 + Math.sin(jaw * 0.9) * 136);
    ctx.closePath();
    ctx.fillStyle = C.mouth;
    ctx.fill();
  }
  ellipse(ctx, 12, -252, 64, 52);
  fillInk(ctx, green, LW);
  roundRect(ctx, -138, -252, 160, 46, 22);
  fillInk(ctx, green, LW);
  ellipse(ctx, 12, -252, 60, 48);
  ctx.fillStyle = green;
  ctx.fill();
  // teeth along the upper jaw
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const x = -124 + i * 22;
    ctx.beginPath();
    ctx.moveTo(x, -207);
    ctx.lineTo(x + 7, -194);
    ctx.lineTo(x + 14, -207);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // nostrils
  for (const x of [-126, -108]) {
    ellipse(ctx, x, -246, 5, 4);
    ctx.fillStyle = C.ink;
    ctx.fill();
  }
  // grumpy mouth corner, unless laughing or gasping
  if (jaw < 0.02) {
    ctx.beginPath();
    ctx.moveTo(-10, -212);
    ctx.quadraticCurveTo(4, -222, 18, -206);
    ctx.lineWidth = LW;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  }
  // eye bumps
  for (const [x, y] of [[-26, -292], [26, -296]]) {
    ellipse(ctx, x, y, 28, 24);
    fillInk(ctx, green, LW);
  }
  eye(ctx, -26, -292, 18, P, { lid: green });
  eye(ctx, 26, -296, 18, P, { lid: green });
  brows(ctx, -26, 26, -286, 16, P, true);
  if (P.pose === 'worried' || P.pose === 'think') {
    // a grumpy line between the eyes
    ctx.beginPath();
    ctx.moveTo(0, -272);
    ctx.lineTo(0, -262);
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  limb(ctx, P, -1, -58, -150, 56, 20, green, { hand, chin: [-40, -205] });
  extras(ctx, P, 50, -320);
}

function dragon(ctx, P) {
  const body = '#38c29a';
  const dark = '#23876a';
  const belly = '#ffcf7a';
  const spike = '#ff6fb1';
  // tail with a spade tip
  const wag = Math.sin(P.t * 3) * 8;
  smoothPath(ctx, [40, -60, 110, -40, 150, -60 + wag, 150, -48 + wag, 110, -24, 40, -24], true);
  fillInk(ctx, body, LW);
  ctx.beginPath();
  ctx.moveTo(146, -54 + wag);
  ctx.lineTo(182, -84 + wag);
  ctx.lineTo(176, -46 + wag);
  ctx.closePath();
  fillInk(ctx, spike, LW * 0.8);
  // wings
  const flap = Math.sin(P.t * (P.pose === 'cheer' || P.pose === 'dance' ? 10 : 3)) * 0.18;
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(s * 40, -170);
    ctx.rotate(s * (0.25 + flap));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(s * 50, -90, s * 108, -82);
    ctx.quadraticCurveTo(s * 96, -50, s * 104, -26);
    ctx.quadraticCurveTo(s * 80, -30, s * 74, -6);
    ctx.quadraticCurveTo(s * 50, -18, s * 40, 10);
    ctx.closePath();
    fillInk(ctx, '#9ff0c9', LW);
    ctx.restore();
  }
  for (const s of [-1, 1]) {
    roundRect(ctx, s * 34 - 20, -52, 40, 50, 16);
    fillInk(ctx, body, LW);
  }
  const hand = mitt(ctx, body, 13);
  limb(ctx, P, 1, 54, -128, 52, 18, body, { hand, chin: [-50, -195] });
  ellipse(ctx, 0, -108, 72, 80);
  fillInk(ctx, body, LW);
  ellipse(ctx, -8, -98, 46, 60);
  ctx.fillStyle = belly;
  ctx.fill();
  ctx.strokeStyle = '#e0a957';
  ctx.lineWidth = 4;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-44, -130 + i * 22);
    ctx.lineTo(28, -130 + i * 22);
    ctx.stroke();
  }
  // head
  for (let i = 0; i < 4; i++) {
    const a = -2.2 + i * 0.42;
    const x = 6 + Math.cos(a) * 64;
    const y = -228 + Math.sin(a) * 58;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(-12, 6);
    ctx.lineTo(0, -20);
    ctx.lineTo(12, 6);
    ctx.closePath();
    fillInk(ctx, spike, LW * 0.8);
    ctx.restore();
  }
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(6 + s * 26, -280);
    ctx.quadraticCurveTo(6 + s * 40, -318, 6 + s * 52, -320);
    ctx.quadraticCurveTo(6 + s * 46, -296, 6 + s * 44, -272);
    ctx.closePath();
    fillInk(ctx, '#fff3dc', LW * 0.8);
  }
  ellipse(ctx, 6, -228, 70, 60);
  fillInk(ctx, body, LW);
  ellipse(ctx, -50, -206, 44, 32);
  fillInk(ctx, body, LW);
  ellipse(ctx, -46, -210, 40, 28);
  ctx.fillStyle = body;
  ctx.fill();
  for (const x of [-74, -56]) {
    ellipse(ctx, x, -220, 4.5, 6);
    ctx.fillStyle = dark;
    ctx.fill();
  }
  if (P.pose === 'laugh' || P.pose === 'cheer') {
    // happy smoke puffs
    for (let i = 0; i < 3; i++) {
      const k = (P.t * 0.9 + i / 3) % 1;
      circle(ctx, -86 - k * 40, -236 - k * 50, 8 + k * 12);
      ctx.globalAlpha = 1 - k;
      fillInk(ctx, '#e9e4f0', 3);
      ctx.globalAlpha = 1;
    }
  }
  eye(ctx, -24, -250, 22, P);
  eye(ctx, 28, -252, 22, P);
  brows(ctx, -24, 28, -250, 18, P);
  cheeks(ctx, -14, 52, -218, 12);
  mouth(ctx, -40, -196, 50, P);
  limb(ctx, P, -1, -54, -128, 52, 18, body, { hand, chin: [-50, -195] });
  extras(ctx, P, 50, -300);
}

function flamingo(ctx, P) {
  const pink = '#ff7eb6';
  const deep = '#ff4f9a';
  const leg = '#ff9cc6';
  // standing leg and the tucked one
  legStroke(ctx, [6, -140, 10, -70, 4, -8], 8, leg);
  ellipse(ctx, -6, -4, 20, 7);
  fillInk(ctx, leg, LW * 0.7);
  const tuck = P.pose === 'dance' ? Math.sin(P.t * 7) * 14 : 0;
  legStroke(ctx, [24, -140, 52 + tuck, -96, 12, -110], 8, leg);
  // tail feathers
  ctx.beginPath();
  ctx.moveTo(70, -186);
  ctx.lineTo(118, -202);
  ctx.lineTo(108, -178);
  ctx.lineTo(124, -168);
  ctx.lineTo(74, -154);
  ctx.closePath();
  fillInk(ctx, deep, LW);
  ellipse(ctx, 10, -172, 78, 50, -0.08);
  fillInk(ctx, pink, LW);
  // neck
  const sway = Math.sin(P.t * 2.4) * 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-40, -194);
  ctx.bezierCurveTo(-80, -230, 10, -250, -22 + sway, -290);
  ctx.lineWidth = 22 + LW * 2;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.lineWidth = 22;
  ctx.strokeStyle = pink;
  ctx.stroke();
  // head and beak
  const hx = -24 + sway;
  const hy = -298;
  ctx.beginPath();
  ctx.moveTo(hx - 22, hy + 2);
  ctx.quadraticCurveTo(hx - 66, hy - 4, hx - 70, hy + 30);
  ctx.quadraticCurveTo(hx - 52, hy + 16, hx - 24, hy + 20);
  ctx.closePath();
  fillInk(ctx, '#fff3dc', LW * 0.8);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = C.ink;
  ctx.fillRect(hx - 80, hy + 8, 22, 40);
  ctx.restore();
  circle(ctx, hx, hy, 32);
  fillInk(ctx, pink, LW);
  eye(ctx, hx - 14, hy - 8, 13, P);
  eye(ctx, hx + 12, hy - 9, 13, P);
  brows(ctx, hx - 14, hx + 12, hy - 4, 11, P);
  cheeks(ctx, hx - 18, hx + 18, hy + 12, 8);
  if (P.mouth === 'o' || P.mouth === 'laugh') {
    ellipse(ctx, hx - 40, hy + 24, 8, 6);
    fillInk(ctx, C.mouth, 3);
  }
  // wings as arms
  const wing = (side) => {
    let a = side < 0 ? P.aL : P.aR;
    if (a === 'chin') a = 2.4;
    ctx.save();
    ctx.translate(side * 20 + 10, -186);
    ctx.rotate(-side * (a - 0.4) * 0.7);
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.quadraticCurveTo(side * 60, -10, side * 70, 40);
    ctx.lineTo(side * 52, 32);
    ctx.lineTo(side * 48, 52);
    ctx.lineTo(side * 30, 40);
    ctx.quadraticCurveTo(side * 6, 30, 0, 10);
    ctx.closePath();
    fillInk(ctx, deep, LW);
    ctx.restore();
  };
  wing(1);
  wing(-1);
  extras(ctx, P, hx + 10, hy - 20);
}

function octopus(ctx, P) {
  const body = '#b36ee8';
  const light = '#d7a8ff';
  // six legs curling on the floor
  const n = 6;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1) - 0.5;
    const wig = Math.sin(P.t * 4 + i) * 6 + (P.pose === 'dance' ? Math.sin(P.t * 8 + i) * 10 : 0);
    const x0 = u * 120;
    const x1 = u * 250;
    const curl = u < 0 ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(x0, -100);
    ctx.bezierCurveTo(x0 + u * 40, -40, x1 - curl * 10 + wig, -10, x1 + curl * 16 + wig, -24);
    ctx.lineCap = 'round';
    ctx.lineWidth = 30 + LW * 2;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.lineWidth = 30;
    ctx.strokeStyle = body;
    ctx.stroke();
    circle(ctx, x1 - curl * 4 + wig, -12, 4.5);
    ctx.fillStyle = light;
    ctx.fill();
  }
  const hand = (x, y) => {
    circle(ctx, x, y, 12);
    fillInk(ctx, body, LW);
  };
  limb(ctx, P, 1, 70, -120, 80, 24, body, { hand, chin: [-20, -150], bend: 0.35 });
  // head
  ellipse(ctx, 0, -192, 96, 108);
  fillInk(ctx, body, LW);
  for (const [x, y, r] of [[44, -258, 13], [64, -224, 9], [-50, -262, 10], [20, -282, 8]]) {
    circle(ctx, x, y, r);
    ctx.fillStyle = light;
    ctx.fill();
  }
  shine(ctx, -46, -272, 18, 0.45);
  eye(ctx, -34, -178, 27, P);
  eye(ctx, 30, -180, 27, P);
  brows(ctx, -34, 30, -178, 24, P);
  cheeks(ctx, -62, 58, -140, 15);
  mouth(ctx, -4, -136, 50, P);
  limb(ctx, P, -1, -70, -120, 80, 24, body, { hand, chin: [-20, -150], bend: 0.35 });
  extras(ctx, P, 40, -300);
}

function alien(ctx, P) {
  const skin = '#8fe05a';
  const dark = '#5aa83a';
  const suit = '#c9d4ea';
  for (const s of [-1, 1]) {
    legStroke(ctx, [s * 22, -70, s * 26, -14], 14, skin);
    ellipse(ctx, s * 30, -8, 24, 11);
    fillInk(ctx, '#ff6fb1', LW);
  }
  const hand = (x, y) => {
    for (let k = -1; k <= 1; k++) {
      circle(ctx, x + k * 7, y + 6 - Math.abs(k) * 3, 7);
      fillInk(ctx, skin, 3.5);
    }
  };
  limb(ctx, P, 1, 42, -128, 62, 12, skin, { hand, chin: [-20, -178] });
  // suit
  ctx.beginPath();
  ctx.moveTo(-44, -150);
  ctx.quadraticCurveTo(-58, -60, -40, -58);
  ctx.lineTo(40, -58);
  ctx.quadraticCurveTo(58, -60, 44, -150);
  ctx.quadraticCurveTo(0, -164, -44, -150);
  ctx.closePath();
  fillInk(ctx, suit, LW);
  star(ctx, 0, -112, 18);
  fillInk(ctx, '#ffd23f', 3.5);
  ctx.fillStyle = '#8a4fd8';
  ctx.fillRect(-48, -72, 96, 10);
  // antennae
  const bob = Math.sin(P.t * 4) * 6;
  legStroke(ctx, [-34, -270, -60, -312, -62 + bob, -330], 5, dark);
  legStroke(ctx, [34, -270, 60, -312, 64 - bob, -332], 5, dark);
  circle(ctx, -62 + bob, -334, 12);
  fillInk(ctx, '#ff6fb1', LW * 0.8);
  circle(ctx, 64 - bob, -336, 12);
  fillInk(ctx, '#ffd23f', LW * 0.8);
  // head
  ctx.beginPath();
  ctx.moveTo(0, -298);
  ctx.bezierCurveTo(92, -298, 104, -210, 36, -168);
  ctx.quadraticCurveTo(0, -150, -36, -168);
  ctx.bezierCurveTo(-104, -210, -92, -298, 0, -298);
  ctx.closePath();
  fillInk(ctx, skin, LW);
  shine(ctx, -44, -270, 16, 0.45);
  eye(ctx, -36, -226, 26, P);
  eye(ctx, 32, -228, 26, P);
  eye(ctx, -2, -270, 15, P);
  brows(ctx, -36, 32, -228, 22, P);
  mouth(ctx, -4, -188, 36, P);
  limb(ctx, P, -1, -42, -128, 62, 12, skin, { hand, chin: [-20, -178] });
  extras(ctx, P, 50, -320);
}

function penguin(ctx, P) {
  const black = '#2c3552';
  const orange = '#ff9a2e';
  for (const s of [-1, 1]) {
    ellipse(ctx, s * 32, -6, 30, 12);
    fillInk(ctx, orange, LW);
  }
  const flip = () => null;
  limb(ctx, P, 1, 70, -170, 76, 26, black, { hand: flip(1), chin: [-30, -200], bend: 0.1 });
  ellipse(ctx, 0, -140, 88, 136);
  fillInk(ctx, black, LW);
  ellipse(ctx, -8, -112, 62, 98);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  // face patch
  ctx.beginPath();
  ctx.moveTo(-8, -170);
  ctx.bezierCurveTo(-70, -170, -66, -250, -32, -248);
  ctx.quadraticCurveTo(-10, -246, -6, -232);
  ctx.quadraticCurveTo(0, -246, 22, -248);
  ctx.bezierCurveTo(56, -250, 56, -170, -8, -170);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  shine(ctx, 40, -240, 14, 0.25);
  // scarf
  ctx.beginPath();
  ctx.moveTo(-70, -176);
  ctx.quadraticCurveTo(-4, -150, 68, -176);
  ctx.lineTo(70, -156);
  ctx.quadraticCurveTo(-4, -128, -72, -156);
  ctx.closePath();
  fillInk(ctx, '#e8384f', LW);
  roundRect(ctx, 26, -160, 24, 58, 8);
  fillInk(ctx, '#e8384f', LW);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(30, -118);
  ctx.lineTo(46, -118);
  ctx.moveTo(30, -132);
  ctx.lineTo(46, -132);
  ctx.stroke();
  eye(ctx, -30, -214, 16, P);
  eye(ctx, 14, -216, 16, P);
  brows(ctx, -30, 14, -214, 14, P);
  cheeks(ctx, -46, 30, -186, 10);
  // beak (opens for laughs and gasps)
  const open = P.mouth === 'o' || P.mouth === 'laugh' ? 8 : 0;
  ctx.beginPath();
  ctx.moveTo(-24, -198);
  ctx.lineTo(4, -198);
  ctx.lineTo(-12, -182 + open * 0.4);
  ctx.closePath();
  fillInk(ctx, orange, LW * 0.8);
  if (open) {
    ctx.beginPath();
    ctx.moveTo(-22, -190 + open);
    ctx.lineTo(2, -190 + open);
    ctx.lineTo(-10, -178 + open);
    ctx.closePath();
    fillInk(ctx, orange, LW * 0.8);
  }
  if (P.mouth === 'wobble' || P.mouth === 'smirk') {
    ctx.beginPath();
    ctx.moveTo(-28, -176);
    ctx.lineTo(8, -178);
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  }
  limb(ctx, P, -1, -70, -170, 76, 26, black, { hand: flip(-1), chin: [-34, -178], bend: 0.1 });
  extras(ctx, P, 40, -290);
}

function monkey(ctx, P) {
  const fur = '#9a6038';
  const face = '#f6cfa6';
  // tail
  const sw = Math.sin(P.t * 2.5) * 8;
  ctx.beginPath();
  ctx.moveTo(40, -60);
  ctx.bezierCurveTo(130, -50, 140, -170, 100 + sw, -180);
  ctx.bezierCurveTo(70 + sw, -186, 70 + sw, -150, 96, -150);
  ctx.lineCap = 'round';
  ctx.lineWidth = 12 + LW * 2;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.lineWidth = 12;
  ctx.strokeStyle = fur;
  ctx.stroke();
  for (const s of [-1, 1]) {
    legStroke(ctx, [s * 28, -70, s * 34, -20], 22, fur);
    ellipse(ctx, s * 38, -8, 24, 12);
    fillInk(ctx, face, LW);
  }
  const hand = mitt(ctx, face, 14);
  limb(ctx, P, 1, 50, -140, 90, 16, fur, { hand, chin: [-30, -196] });
  ellipse(ctx, 0, -110, 62, 74);
  fillInk(ctx, fur, LW);
  ellipse(ctx, -6, -100, 40, 52);
  ctx.fillStyle = face;
  ctx.fill();
  // head
  for (const s of [-1, 1]) {
    circle(ctx, s * 72 - 4, -234, 28);
    fillInk(ctx, fur, LW);
    circle(ctx, s * 72 - 4, -234, 15);
    ctx.fillStyle = face;
    ctx.fill();
  }
  circle(ctx, -4, -236, 70);
  fillInk(ctx, fur, LW);
  // tuft
  ctx.beginPath();
  ctx.moveTo(-20, -302);
  ctx.quadraticCurveTo(-10, -330, 4, -318);
  ctx.quadraticCurveTo(10, -336, 18, -304);
  fillInk(ctx, fur, LW);
  // face mask
  ctx.beginPath();
  ctx.arc(-28, -244, 26, 0, TAU);
  ctx.arc(16, -246, 26, 0, TAU);
  ctx.fillStyle = face;
  ctx.fill();
  ellipse(ctx, -8, -204, 46, 32);
  ctx.fillStyle = face;
  ctx.fill();
  eye(ctx, -28, -244, 16, P);
  eye(ctx, 16, -246, 16, P);
  brows(ctx, -28, 16, -244, 14, P);
  for (const x of [-14, -2]) {
    ellipse(ctx, x, -216, 3.5, 2.5);
    ctx.fillStyle = C.ink;
    ctx.fill();
  }
  mouth(ctx, -8, -200, 48, P);
  limb(ctx, P, -1, -50, -140, 90, 16, fur, { hand, chin: [-30, -196] });
  extras(ctx, P, 50, -310);
}

function manatee(ctx, P) {
  const grey = '#93a9c4';
  const light = '#bccbe0';
  // tail paddle
  ellipse(ctx, 60, -12, 56, 22, -0.1 + Math.sin(P.t * 2) * 0.05);
  fillInk(ctx, grey, LW);
  const flipper = (x, y, a) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ellipse(ctx, 8, 0, 22, 14);
    fillInk(ctx, grey, LW);
    ctx.restore();
  };
  limb(ctx, P, 1, 84, -140, 58, 26, grey, { hand: flipper, chin: [-40, -180] });
  // body
  smoothPath(ctx, [0, -262, 74, -240, 104, -150, 100, -60, 60, -6, -60, -6, -100, -60, -104, -150, -74, -240], true);
  fillInk(ctx, grey, LW);
  ellipse(ctx, -6, -90, 66, 70);
  ctx.fillStyle = light;
  ctx.fill();
  ctx.strokeStyle = 'rgba(42,24,56,0.25)';
  ctx.lineWidth = 3;
  for (const [x, y] of [[40, -230], [70, -180], [56, -120]]) {
    ctx.beginPath();
    ctx.arc(x, y, 10, 0.2, 1.6);
    ctx.stroke();
  }
  // snout
  ellipse(ctx, -22, -184, 58, 40);
  fillInk(ctx, light, LW);
  ctx.fillStyle = 'rgba(42,24,56,0.5)';
  for (const [x, y] of [[-50, -176], [-38, -168], [-6, -170], [6, -176], [-44, -186], [0, -186]]) {
    circle(ctx, x, y, 2.6);
    ctx.fill();
  }
  ellipse(ctx, -36, -206, 6, 4);
  ctx.fillStyle = C.ink;
  ctx.fill();
  ellipse(ctx, -8, -206, 6, 4);
  ctx.fill();
  eye(ctx, -44, -232, 13, P);
  eye(ctx, 6, -234, 13, P);
  brows(ctx, -44, 6, -234, 11, P);
  cheeks(ctx, -72, 34, -200, 12);
  mouth(ctx, -22, -158, 40, P);
  // a hibiscus behind the ear
  ctx.save();
  ctx.translate(56, -238);
  ctx.rotate(P.t * 0.3);
  for (let i = 0; i < 5; i++) {
    ctx.rotate(TAU / 5);
    ellipse(ctx, 0, -14, 11, 15);
    fillInk(ctx, '#ff5a8a', 3.5);
  }
  circle(ctx, 0, 0, 6);
  fillInk(ctx, '#ffd23f', 3);
  ctx.restore();
  limb(ctx, P, -1, -84, -140, 58, 26, grey, { hand: flipper, chin: [-40, -180] });
  extras(ctx, P, 40, -290);
}

const FRIEND_DRAW = { crab, robot, gator, dragon, flamingo, octopus, alien, penguin, monkey, manatee };

// A stock friend standing with its feet at (0, 0). o: { t, pose, blink }.
export function drawFriend(ctx, id, o = {}) {
  const f = FRIEND_DRAW[id];
  if (!f) return;
  const P = poseOf(o);
  ctx.save();
  ctx.translate(P.dx, P.dy);
  // a soft shadow stays on the floor
  ctx.save();
  ctx.translate(-P.dx, -P.dy);
  ctx.fillStyle = 'rgba(30,10,50,0.18)';
  ellipse(ctx, 0, 2, 90 + P.dy * 0.6, 12);
  ctx.fill();
  ctx.restore();
  ctx.rotate(P.rot);
  ctx.scale(1, P.sy);
  f(ctx, P);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Things (and stage props), drawn in a 100 x 100 box then scaled
// ---------------------------------------------------------------------------------------------

const TLW = 3.2; // outline width in thing units

function chest(ctx, t) {
  const wood = '#b0773f';
  const gold = '#ffc93a';
  // treasure peeking out under the lid
  for (const [x, c] of [[-22, gold], [-6, '#ff4f9a'], [10, gold], [24, '#5cb8ff']]) {
    circle(ctx, x, -12, 8);
    fillInk(ctx, c, TLW * 0.7);
  }
  roundRect(ctx, -44, -10, 88, 48, 6);
  fillInk(ctx, wood, TLW);
  ctx.save();
  ctx.translate(-44, -12);
  ctx.rotate(-0.12);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -16);
  ctx.quadraticCurveTo(44, -44, 88, -16);
  ctx.lineTo(88, 0);
  ctx.closePath();
  ctx.fillStyle = '#c98a4c';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = gold;
  ctx.fillRect(14, -40, 10, 40);
  ctx.fillRect(64, -40, 10, 40);
  ctx.restore();
  fillInk(ctx, null, TLW);
  ctx.restore();
  for (const x of [-30, 20]) {
    ctx.fillStyle = gold;
    ctx.fillRect(x, -10, 10, 48);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, -10, 10, 48);
  }
  roundRect(ctx, -9, 2, 18, 20, 4);
  fillInk(ctx, gold, TLW * 0.8);
  circle(ctx, 0, 11, 3);
  ctx.fillStyle = C.ink;
  ctx.fill();
  const tw = 0.5 + 0.5 * Math.sin(t * 4);
  star(ctx, 30, -34, 6 + tw * 5, 4, 0.35);
  fillInk(ctx, '#ffffff', 1.5);
}

function wand(ctx, t) {
  ctx.save();
  ctx.rotate(0.5);
  roundRect(ctx, -5, -18, 10, 66, 4);
  fillInk(ctx, '#33283f', TLW);
  roundRect(ctx, -5, 32, 10, 16, 4);
  fillInk(ctx, '#ffffff', TLW);
  ctx.restore();
  ctx.save();
  ctx.translate(-12, -28);
  ctx.rotate(Math.sin(t * 2) * 0.2);
  star(ctx, 0, 0, 24);
  fillInk(ctx, '#ffd23f', TLW);
  shine(ctx, -6, -6, 6, 0.6);
  ctx.restore();
  for (let i = 0; i < 4; i++) {
    const a = t * 1.5 + i * 1.6;
    const r = 30 + Math.sin(t * 3 + i) * 6;
    star(ctx, -12 + Math.cos(a) * r, -28 + Math.sin(a) * r, 4 + (i % 2) * 2, 4, 0.35);
    ctx.fillStyle = ['#ff6fb1', '#7ffcff', '#ffffff', '#ffd23f'][i];
    ctx.fill();
  }
}

function egg(ctx, t) {
  ctx.save();
  ctx.translate(0, 44);
  ctx.rotate(Math.sin(t * 3.2) * 0.09);
  ctx.translate(0, -44);
  ctx.beginPath();
  ctx.moveTo(0, -46);
  ctx.bezierCurveTo(30, -46, 40, 0, 38, 14);
  ctx.bezierCurveTo(36, 40, 18, 46, 0, 46);
  ctx.bezierCurveTo(-18, 46, -36, 40, -38, 14);
  ctx.bezierCurveTo(-40, 0, -30, -46, 0, -46);
  ctx.closePath();
  fillInk(ctx, '#fff3dc', TLW);
  ctx.save();
  ctx.clip();
  for (const [x, y, r, c] of [[-16, -20, 8, '#8fd14f'], [14, -2, 10, '#5cb8ff'], [-10, 22, 7, '#ff6fb1'], [20, 28, 6, '#ffd23f'], [6, -32, 5, '#ff8a3d']]) {
    circle(ctx, x, y, r);
    ctx.fillStyle = c;
    ctx.fill();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-34, 4);
  ctx.lineTo(-20, -6);
  ctx.lineTo(-10, 6);
  ctx.lineTo(2, -8);
  ctx.lineTo(12, 4);
  ctx.lineWidth = TLW;
  ctx.strokeStyle = C.ink;
  ctx.lineJoin = 'round';
  ctx.stroke();
  shine(ctx, -16, -30, 8, 0.6);
  ctx.restore();
}

function balloons(ctx, t) {
  const list = [[-24, -26, '#e8384f'], [20, -32, '#5cb8ff'], [0, -10, '#ffd23f'], [-4, -44, '#8fd14f']];
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = C.ink;
  list.forEach(([x, y], i) => {
    const bx = x + Math.sin(t * 2 + i) * 3;
    const by = y + Math.sin(t * 2.6 + i * 1.7) * 3;
    ctx.beginPath();
    ctx.moveTo(0, 44);
    ctx.quadraticCurveTo((bx + 0) / 2 + 6, (by + 44) / 2, bx, by + 18);
    ctx.stroke();
  });
  list.forEach(([x, y, c], i) => {
    const bx = x + Math.sin(t * 2 + i) * 3;
    const by = y + Math.sin(t * 2.6 + i * 1.7) * 3;
    ellipse(ctx, bx, by, 15, 18);
    fillInk(ctx, c, TLW * 0.8);
    ctx.beginPath();
    ctx.moveTo(bx - 4, by + 21);
    ctx.lineTo(bx + 4, by + 21);
    ctx.lineTo(bx, by + 16);
    ctx.closePath();
    fillInk(ctx, c, 1.5);
    shine(ctx, bx - 5, by - 7, 4.5, 0.6);
  });
  ctx.beginPath();
  ctx.moveTo(0, 44);
  ctx.lineTo(-8, 38);
  ctx.lineTo(-8, 48);
  ctx.closePath();
  ctx.moveTo(0, 44);
  ctx.lineTo(8, 38);
  ctx.lineTo(8, 48);
  ctx.closePath();
  fillInk(ctx, '#ff6fb1', 1.8);
}

function map(ctx) {
  const paper = '#f6e2b0';
  ctx.beginPath();
  ctx.moveTo(-38, -30);
  ctx.quadraticCurveTo(0, -38, 38, -30);
  ctx.lineTo(38, 30);
  ctx.quadraticCurveTo(0, 22, -38, 30);
  ctx.closePath();
  fillInk(ctx, paper, TLW);
  // a dashed trail to the X
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = '#8d5a36';
  ctx.beginPath();
  ctx.moveTo(-26, 16);
  ctx.bezierCurveTo(-10, 0, -20, -16, 4, -12);
  ctx.quadraticCurveTo(16, -10, 16, 0);
  ctx.stroke();
  ctx.restore();
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#e8384f';
  ctx.beginPath();
  ctx.moveTo(10, -4);
  ctx.lineTo(24, 10);
  ctx.moveTo(24, -4);
  ctx.lineTo(10, 10);
  ctx.stroke();
  // a little island palm
  ctx.strokeStyle = '#3cbf55';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-24, -6);
  ctx.lineTo(-24, -18);
  ctx.moveTo(-24, -18);
  ctx.lineTo(-32, -14);
  ctx.moveTo(-24, -18);
  ctx.lineTo(-16, -14);
  ctx.stroke();
  for (const s of [-1, 1]) {
    roundRect(ctx, s * 40 - 7, -36, 14, 72, 7);
    fillInk(ctx, shade(paper, -0.12), TLW);
  }
}

function duck(ctx, t) {
  ctx.save();
  ctx.rotate(Math.sin(t * 2.5) * 0.06);
  ctx.beginPath();
  ctx.moveTo(-40, 6);
  ctx.quadraticCurveTo(-42, 38, 0, 38);
  ctx.quadraticCurveTo(40, 38, 42, 10);
  ctx.quadraticCurveTo(44, -6, 30, 2);
  ctx.quadraticCurveTo(10, 10, -40, 6);
  ctx.closePath();
  fillInk(ctx, '#ffd23f', TLW);
  ctx.beginPath();
  ctx.moveTo(-36, 8);
  ctx.quadraticCurveTo(-30, -2, -8, 4);
  fillInk(ctx, '#ffd23f', 0);
  circle(ctx, -14, -16, 22);
  fillInk(ctx, '#ffd23f', TLW);
  ctx.beginPath();
  ctx.moveTo(-32, -12);
  ctx.quadraticCurveTo(-50, -16, -48, -6);
  ctx.quadraticCurveTo(-46, 0, -30, -4);
  ctx.closePath();
  fillInk(ctx, '#ff8a3d', TLW);
  circle(ctx, -18, -22, 4.5);
  ctx.fillStyle = C.ink;
  ctx.fill();
  circle(ctx, -19.5, -23.5, 1.5);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(2, 14);
  ctx.quadraticCurveTo(16, 4, 26, 16);
  ctx.quadraticCurveTo(14, 24, 2, 14);
  fillInk(ctx, shade('#ffd23f', -0.12), TLW * 0.8);
  shine(ctx, -22, -28, 5, 0.7);
  ctx.restore();
}

function guitar(ctx) {
  ctx.save();
  ctx.rotate(-0.5);
  roundRect(ctx, -5, -50, 10, 56, 3);
  fillInk(ctx, '#6e4426', TLW);
  roundRect(ctx, -8, -56, 16, 14, 4);
  fillInk(ctx, '#33283f', TLW);
  ctx.beginPath();
  ctx.arc(0, 12, 18, Math.PI * 1.15, Math.PI * 1.85);
  ctx.arc(0, 30, 24, Math.PI * 1.7, Math.PI * 1.3);
  ctx.closePath();
  fillInk(ctx, '#ff8a3d', TLW);
  circle(ctx, 0, 18, 7);
  ctx.fillStyle = C.ink;
  ctx.fill();
  roundRect(ctx, -9, 36, 18, 5, 2);
  fillInk(ctx, '#6e4426', 1.5);
  ctx.strokeStyle = '#fff3dc';
  ctx.lineWidth = 0.9;
  for (const x of [-2.5, 0, 2.5]) {
    ctx.beginPath();
    ctx.moveTo(x, -46);
    ctx.lineTo(x, 38);
    ctx.stroke();
  }
  shine(ctx, -10, 26, 5, 0.4);
  ctx.restore();
}

function pizza(ctx) {
  circle(ctx, 0, 0, 44);
  fillInk(ctx, '#e0a050', TLW);
  circle(ctx, 0, 0, 36);
  ctx.fillStyle = '#e8384f';
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * TAU;
    const r = 33 + (i % 2 ? -3 : 2);
    if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffd96a';
  ctx.fill();
  for (const [x, y] of [[-16, -14], [12, -20], [18, 8], [-6, 16], [-22, 8], [4, -2], [22, -6]]) {
    circle(ctx, x, y, 5.5);
    fillInk(ctx, '#c4283f', 1.5);
  }
  ctx.strokeStyle = 'rgba(42,24,56,0.4)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI + 0.3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 36, Math.sin(a) * 36);
    ctx.lineTo(-Math.cos(a) * 36, -Math.sin(a) * 36);
    ctx.stroke();
  }
  for (const [x, y] of [[-8, -26], [26, 18], [-26, -4]]) {
    ellipse(ctx, x, y, 4, 2.2, x);
    ctx.fillStyle = '#3cbf55';
    ctx.fill();
  }
}

function kite(ctx, t) {
  const flut = Math.sin(t * 5) * 0.06;
  ctx.save();
  ctx.translate(-6, -14);
  ctx.rotate(-0.2 + flut);
  const pts = [[0, -34], [24, -6], [0, 32], [-24, -6]];
  const cols = ['#e8384f', '#ffd23f', '#5cb8ff', '#8fd14f'];
  for (let i = 0; i < 4; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % 4];
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.closePath();
    ctx.fillStyle = cols[i];
    ctx.fill();
  }
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  fillInk(ctx, null, TLW);
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.lineTo(0, 32);
  ctx.moveTo(-24, -6);
  ctx.lineTo(24, -6);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // the tail with bows
  ctx.beginPath();
  ctx.moveTo(0, 32);
  for (let k = 1; k <= 4; k++) ctx.lineTo(Math.sin(t * 6 + k) * 6 + k * 3, 32 + k * 10);
  ctx.lineWidth = 1.8;
  ctx.stroke();
  for (let k = 1; k <= 3; k++) {
    const x = Math.sin(t * 6 + k) * 6 + k * 3;
    const y = 32 + k * 10;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 6, y - 4);
    ctx.lineTo(x - 6, y + 4);
    ctx.closePath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 6, y - 4);
    ctx.lineTo(x + 6, y + 4);
    ctx.closePath();
    fillInk(ctx, cols[k], 1.2);
  }
  ctx.restore();
}

function key(ctx, t) {
  const gold = '#ffc93a';
  ctx.save();
  ctx.rotate(-0.6);
  ctx.beginPath();
  ctx.arc(0, -26, 18, 0, TAU);
  ctx.arc(0, -26, 8, 0, TAU, true);
  fillInk(ctx, gold, TLW);
  roundRect(ctx, -5, -10, 10, 54, 3);
  fillInk(ctx, gold, TLW);
  roundRect(ctx, 3, 22, 14, 8, 2);
  fillInk(ctx, gold, TLW * 0.8);
  roundRect(ctx, 3, 34, 10, 8, 2);
  fillInk(ctx, gold, TLW * 0.8);
  shine(ctx, -8, -34, 4, 0.7);
  ctx.restore();
  const tw = 0.5 + 0.5 * Math.sin(t * 3.5);
  star(ctx, 26, -30, 5 + tw * 5, 4, 0.35);
  fillInk(ctx, '#ffffff', 1.4);
}

function palm(ctx, t) {
  ellipse(ctx, 0, 40, 42, 12);
  fillInk(ctx, '#f6d892', TLW);
  ctx.beginPath();
  ctx.moveTo(-4, 38);
  ctx.quadraticCurveTo(-8, 0, 6, -30);
  ctx.lineTo(14, -28);
  ctx.quadraticCurveTo(2, 0, 6, 38);
  ctx.closePath();
  fillInk(ctx, '#b0773f', TLW);
  ctx.strokeStyle = '#6e4426';
  ctx.lineWidth = 1.5;
  for (let y = 26; y > -24; y -= 9) {
    ctx.beginPath();
    ctx.moveTo(-3 + (26 - y) * 0.15, y);
    ctx.lineTo(7 + (26 - y) * 0.15, y - 2);
    ctx.stroke();
  }
  const sw = Math.sin(t * 1.8) * 0.06;
  for (const a of [-2.7, -2.1, -1.5, -0.9, -0.35]) {
    ctx.save();
    ctx.translate(10, -30);
    ctx.rotate(a + sw);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(20, -14, 40, 6);
    ctx.quadraticCurveTo(22, 4, 0, 0);
    fillInk(ctx, '#3cbf55', TLW * 0.8);
    ctx.restore();
  }
  for (const [x, y] of [[4, -26], [14, -24]]) {
    circle(ctx, x, y, 5);
    fillInk(ctx, '#8d5a36', 2);
  }
}

function rock(ctx, t) {
  smoothPath(ctx, [-42, 36, -46, 4, -30, -24, 0, -34, 30, -26, 46, 2, 44, 36], true);
  fillInk(ctx, '#a39bb8', TLW);
  ctx.fillStyle = '#8a82a2';
  ellipse(ctx, 24, 18, 12, 7);
  ctx.fill();
  ellipse(ctx, -28, -8, 7, 4);
  ctx.fill();
  shine(ctx, -18, -20, 8, 0.4);
  // a sleepy friendly face
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  const blink = (t % 4) < 0.15;
  for (const x of [-12, 10]) {
    ctx.beginPath();
    if (blink) {
      ctx.moveTo(x - 4, 2);
      ctx.lineTo(x + 4, 2);
    } else ctx.arc(x, 0, 4, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(-1, 10, 6, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  // moss and a flower
  ctx.beginPath();
  ctx.moveTo(-28, -24);
  ctx.quadraticCurveTo(-8, -40, 14, -32);
  ctx.quadraticCurveTo(-6, -26, -28, -24);
  fillInk(ctx, '#8fd14f', 2);
  for (let i = 0; i < 5; i++) {
    ellipse(ctx, 22 + Math.cos(i * 1.26) * 5, -32 + Math.sin(i * 1.26) * 5, 3.6, 3.6);
    ctx.fillStyle = '#ff6fb1';
    ctx.fill();
  }
  circle(ctx, 22, -32, 2.5);
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
}

const THING_DRAW = {
  'treasure-chest': chest, 'magic-wand': wand, 'giant-egg': egg, balloons, map, 'rubber-duck': duck,
  guitar, pizza, kite, 'golden-key': key, palm, rock,
};

// A thing centred on (0, 0) fitting a size x size box.
export function drawThing(ctx, id, size, t = 0) {
  const f = THING_DRAW[id];
  if (!f) return;
  ctx.save();
  ctx.scale(size / 100, size / 100);
  f(ctx, t);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Picture cards
// ---------------------------------------------------------------------------------------------

const FRIEND_BG = {
  crab: '#ffe0a8', robot: '#d7ecff', gator: '#dff6c8', dragon: '#ffe0f0', flamingo: '#d6fbf4',
  octopus: '#d9f2ff', alien: '#e7dcff', penguin: '#d7f3ff', monkey: '#e6f8c9', manatee: '#fff0c4',
};
const THING_BG = {
  'treasure-chest': '#d4f1ff', 'magic-wand': '#ecdcff', 'giant-egg': '#dcf6d0', balloons: '#d7efff', map: '#d8f6f0',
  'rubber-duck': '#cfeeff', guitar: '#ffe8cf', pizza: '#fff0c4', kite: '#d4f0ff', 'golden-key': '#f0e0ff',
  palm: '#d4f1ff', rock: '#e2f6d6',
};

function cardBack(ctx, w, h, bg, t) {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  // soft rays turning slowly behind
  ctx.save();
  ctx.translate(w / 2, h * 0.5);
  ctx.rotate(t * 0.15);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  const R = Math.hypot(w, h);
  for (let i = 0; i < 12; i++) {
    ctx.rotate(TAU / 12);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(R, -R * 0.13);
    ctx.lineTo(R, R * 0.13);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  circle(ctx, w / 2, h * 0.5, Math.min(w, h) * 0.36);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fill();
}

export function drawFriendCard(ctx, id, w, h, t = 0) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  cardBack(ctx, w, h, FRIEND_BG[id] || '#eee', t);
  ctx.fillStyle = 'rgba(42,24,56,0.12)';
  ctx.fillRect(0, h * 0.88, w, h * 0.12);
  const s = Math.min((h * 0.78) / 345, (w * 0.86) / 330);
  ctx.translate(w / 2, h * 0.92);
  ctx.scale(s, s);
  drawFriend(ctx, id, { t, pose: 'wave', blink: (t % 3.3) < 0.12 ? 1 : 0 });
  ctx.restore();
}

export function drawThingCard(ctx, id, w, h, t = 0) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  cardBack(ctx, w, h, THING_BG[id] || '#eee', t);
  ctx.translate(w / 2, h / 2);
  drawThing(ctx, id, Math.min(w, h) * 0.78, t);
  ctx.restore();
}
