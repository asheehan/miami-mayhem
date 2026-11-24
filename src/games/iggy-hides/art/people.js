// Little people for the crowds. person(ctx, o, t) draws one with their feet at (0, 0), about
// 120 units tall (kids about 85), facing the viewer. Variations come from o:
//   skin, hair, hairStyle ('short' | 'long' | 'bun' | 'curly' | 'bald' | 'pony' | 'spiky')
//   top, bottom, outfit ('tee' | 'swim' | 'dress' | 'suit' | 'tank'), hat ('cap' | 'sun' |
//   'straw' | 'visor' | 'bucket' | 'party' | 'chef' | 'band' | 'cowboy' | 'flower'),
//   hatColour, shades, kid, flip, pose ('stand' | 'wave' | 'cheer' | 'walk' | 'sit' | 'point'
//   | 'hold' | 'swim' | 'lie'), item ('icecream' | 'balloon' | 'drink' | 'phone' | 'camera' |
//   'fries' | 'flag' | 'binoculars' | 'hotdog' | 'trumpet' | 'drum' | 'maracas' | 'basket' |
//   'net' | 'rod'), itemColour, phase (animation offset), mood ('smile' | 'wow' | 'grr' | 'sleep').
import { TAU, INK, rng, pick, circle, ellipse, poly, rect, rrect, limb, fs, line, shadow, star } from './kit.js';
import { drawHeld } from './held.js';

export const SKINS = ['#ffd9b8', '#f5c49c', '#e0a878', '#c68a5a', '#9a6440', '#6e4428'];
export const HAIRS = ['#2a1a10', '#4a2c18', '#7a4a22', '#c98f4f', '#f2d27a', '#e8e0d0', '#b23a1e', '#16101e'];
export const TOPS = ['#ff3d5a', '#ff8a2a', '#ffd23a', '#3fae4a', '#2fb5e8', '#3a6bff', '#a64dff', '#ff5ab8', '#ffffff', '#21c7a8', '#ff7a6a', '#7cd34a'];
export const BOTTOMS = ['#2a4a8a', '#3a3f55', '#c98f4f', '#ffffff', '#2fb5e8', '#ff8a2a', '#5a2a7a', '#1f7a6a'];
const STYLES = ['short', 'long', 'bun', 'curly', 'bald', 'pony', 'spiky', 'short', 'long'];

// A random-looking person from a seed, with overrides.
export function randomPerson(seed, o = {}) {
  const r = rng(seed * 7919 + 17);
  const kid = o.kid ?? r() < 0.22;
  return {
    skin: pick(r, SKINS),
    hair: pick(r, HAIRS),
    hairStyle: pick(r, STYLES),
    top: pick(r, TOPS),
    bottom: pick(r, BOTTOMS),
    outfit: r() < 0.15 ? 'dress' : r() < 0.2 ? 'tank' : 'tee',
    hat: r() < 0.35 ? pick(r, ['cap', 'sun', 'straw', 'visor', 'bucket']) : null,
    hatColour: pick(r, TOPS),
    shades: r() < 0.25,
    kid,
    phase: r() * 10,
    ...o,
  };
}

const blinking = (t, phase) => ((t + phase) % 4.1) < 0.13;

function face(ctx, hx, hy, R, o, t) {
  const blink = o.mood === 'sleep' || blinking(t, o.phase || 0);
  const ex = R * 0.38;
  const ey = hy - R * 0.05;
  if (o.shades) {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(hx - ex, ey, R * 0.32, R * 0.24, 0, 0, TAU);
    ctx.ellipse(hx + ex, ey, R * 0.32, R * 0.24, 0, 0, TAU);
    ctx.fill();
    line(ctx, hx - ex, ey, hx + ex, ey, INK, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(hx - ex - R * 0.15, ey - R * 0.12, R * 0.12, R * 0.08);
  } else if (blink) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx - ex - R * 0.15, ey);
    ctx.lineTo(hx - ex + R * 0.15, ey);
    ctx.moveTo(hx + ex - R * 0.15, ey);
    ctx.lineTo(hx + ex + R * 0.15, ey);
    ctx.stroke();
  } else {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(hx - ex, ey, R * 0.13, 0, TAU);
    ctx.arc(hx + ex, ey, R * 0.13, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,110,120,0.35)';
  ctx.beginPath();
  ctx.arc(hx - R * 0.6, hy + R * 0.3, R * 0.16, 0, TAU);
  ctx.arc(hx + R * 0.6, hy + R * 0.3, R * 0.16, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (o.mood === 'wow') {
    ctx.fillStyle = '#7a1a2a';
    ctx.ellipse(hx, hy + R * 0.42, R * 0.17, R * 0.22, 0, 0, TAU);
    ctx.fill();
  } else if (o.mood === 'grr') {
    ctx.moveTo(hx - R * 0.3, hy + R * 0.5);
    ctx.quadraticCurveTo(hx, hy + R * 0.3, hx + R * 0.3, hy + R * 0.5);
    ctx.stroke();
  } else {
    ctx.arc(hx, hy + R * 0.2, R * 0.34, 0.25, Math.PI - 0.25);
    ctx.stroke();
  }
}

function hairBack(ctx, hx, hy, R, o) {
  const c = o.hair;
  if (o.hairStyle === 'long') {
    rrect(ctx, hx - R * 1.05, hy - R * 0.4, R * 2.1, R * 1.9, R * 0.6, c, 2.5);
  } else if (o.hairStyle === 'pony') {
    ellipse(ctx, hx + R * 1.0, hy + R * 0.3, R * 0.35, R * 0.8, c, 2.5, INK, -0.4);
  } else if (o.hairStyle === 'bun') {
    circle(ctx, hx, hy - R * 1.05, R * 0.45, c, 2.5);
  } else if (o.hairStyle === 'curly') {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * 0.85 + (i / 8) * Math.PI * 1.3;
      circle(ctx, hx + Math.cos(a) * R * 0.95, hy + Math.sin(a) * R * 0.9, R * 0.38, c, 2);
    }
  }
}

function hairFront(ctx, hx, hy, R, o) {
  const c = o.hair;
  if (o.hairStyle === 'bald') return;
  ctx.beginPath();
  if (o.hairStyle === 'spiky') {
    for (let i = 0; i <= 6; i++) {
      const a = Math.PI + (i / 6) * Math.PI;
      const k = i % 2 ? 1.45 : 1.0;
      ctx.lineTo(hx + Math.cos(a) * R * k, hy - R * 0.15 + Math.sin(a) * R * k);
    }
    ctx.closePath();
    fs(ctx, c, 2.5);
    return;
  }
  ctx.arc(hx, hy, R * 1.04, Math.PI * 1.02, Math.PI * 1.98);
  ctx.quadraticCurveTo(hx + R * 0.3, hy - R * 0.25, hx - R * 0.1, hy - R * 0.55);
  ctx.quadraticCurveTo(hx - R * 0.6, hy - R * 0.2, hx - R * 1.03, hy - R * 0.05);
  ctx.closePath();
  fs(ctx, c, 2.5);
}

function hat(ctx, hx, hy, R, o) {
  const c = o.hatColour || '#ff3d5a';
  switch (o.hat) {
    case 'cap':
      ctx.beginPath();
      ctx.arc(hx, hy - R * 0.25, R * 1.02, Math.PI, 0);
      ctx.closePath();
      fs(ctx, c, 2.5);
      ellipse(ctx, hx + R * 0.7, hy - R * 0.28, R * 0.75, R * 0.2, c, 2.5);
      circle(ctx, hx, hy - R * 1.25, R * 0.12, '#ffffff', 1.5);
      break;
    case 'sun':
    case 'straw':
      ellipse(ctx, hx, hy - R * 0.55, R * 1.9, R * 0.38, o.hat === 'straw' ? '#f2d27a' : c, 2.5);
      ctx.beginPath();
      ctx.arc(hx, hy - R * 0.6, R * 0.95, Math.PI, 0);
      ctx.closePath();
      fs(ctx, o.hat === 'straw' ? '#f2d27a' : c, 2.5);
      rect(ctx, hx - R * 0.95, hy - R * 0.92, R * 1.9, R * 0.28, o.hat === 'straw' ? c : '#ffffff', 1.5);
      break;
    case 'visor':
      rect(ctx, hx - R, hy - R * 0.7, R * 2, R * 0.3, c, 2);
      ellipse(ctx, hx + R * 0.4, hy - R * 0.5, R * 1.0, R * 0.22, c, 2);
      break;
    case 'bucket':
      poly(ctx, [[hx - R * 0.85, hy - R * 1.25], [hx + R * 0.85, hy - R * 1.25], [hx + R * 1.05, hy - R * 0.45], [hx - R * 1.05, hy - R * 0.45]], c, 2.5);
      ellipse(ctx, hx, hy - R * 0.42, R * 1.4, R * 0.28, c, 2.5);
      break;
    case 'party':
      poly(ctx, [[hx - R * 0.6, hy - R * 0.75], [hx + R * 0.6, hy - R * 0.75], [hx + R * 0.1, hy - R * 2.4]], c, 2.5);
      circle(ctx, hx + R * 0.1, hy - R * 2.45, R * 0.25, '#ffe14d', 1.5);
      break;
    case 'chef':
      circle(ctx, hx - R * 0.5, hy - R * 1.35, R * 0.55, '#ffffff', 2.5);
      circle(ctx, hx + R * 0.5, hy - R * 1.35, R * 0.55, '#ffffff', 2.5);
      circle(ctx, hx, hy - R * 1.6, R * 0.6, '#ffffff', 2.5);
      rect(ctx, hx - R * 0.85, hy - R * 1.1, R * 1.7, R * 0.5, '#ffffff', 2.5);
      break;
    case 'band':
      rect(ctx, hx - R * 0.85, hy - R * 1.9, R * 1.7, R * 1.25, c, 2.5);
      rect(ctx, hx - R * 0.85, hy - R * 0.85, R * 1.7, R * 0.22, '#ffd23a', 2);
      poly(ctx, [[hx, hy - R * 1.9], [hx - R * 0.25, hy - R * 2.6], [hx + R * 0.25, hy - R * 2.6]], '#ffffff', 2);
      break;
    case 'cowboy':
      ellipse(ctx, hx, hy - R * 0.6, R * 1.8, R * 0.35, c, 2.5);
      rrect(ctx, hx - R * 0.8, hy - R * 1.5, R * 1.6, R * 0.95, R * 0.3, c, 2.5);
      break;
    case 'flower':
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU;
        circle(ctx, hx + R * 0.7 + Math.cos(a) * R * 0.28, hy - R * 0.7 + Math.sin(a) * R * 0.28, R * 0.22, c, 1.5);
      }
      circle(ctx, hx + R * 0.7, hy - R * 0.7, R * 0.15, '#ffe14d', 1);
      break;
    default:
  }
}

function headAt(ctx, hx, hy, R, o, t) {
  hairBack(ctx, hx, hy, R, o);
  circle(ctx, hx, hy, R, o.skin, 2.5);
  hairFront(ctx, hx, hy, R, o);
  face(ctx, hx, hy, R, o, t);
  hat(ctx, hx, hy, R, o);
}

// Torso + legs for the standing family of poses. Returns joint positions.
function body(ctx, o, t, P) {
  const { S } = P;
  const walk = o.pose === 'walk' ? Math.sin(t * 7 + (o.phase || 0)) : 0;
  const hipY = -48 * S;
  const shY = -88 * S;
  const legC = o.outfit === 'swim' || o.outfit === 'dress' ? o.skin : o.bottom;
  // legs
  const lx = 7 * S;
  limb(ctx, [[-lx, hipY + 4], [-lx - walk * 8 * S, -3]], legC, 9 * S);
  limb(ctx, [[lx, hipY + 4], [lx + walk * 8 * S, -3]], legC, 9 * S);
  if (o.outfit === 'tee' || o.outfit === 'tank' || o.outfit === 'suit') {
    // shorts end at the knee; skin below for shorts wearers
    if (o.shorts !== false && o.outfit !== 'suit') {
      limb(ctx, [[-lx - walk * 4 * S, -24 * S], [-lx - walk * 8 * S, -3]], o.skin, 8 * S, 2);
      limb(ctx, [[lx + walk * 4 * S, -24 * S], [lx + walk * 8 * S, -3]], o.skin, 8 * S, 2);
    }
  }
  // shoes
  ellipse(ctx, -lx - walk * 8 * S - 2, -2, 7 * S, 4 * S, o.shoes || '#3a3f55', 2);
  ellipse(ctx, lx + walk * 8 * S + 2, -2, 7 * S, 4 * S, o.shoes || '#3a3f55', 2);
  // hips / skirt / trunks
  if (o.outfit === 'dress') {
    poly(ctx, [[-13 * S, shY + 20 * S], [13 * S, shY + 20 * S], [21 * S, hipY + 18 * S], [-21 * S, hipY + 18 * S]], o.top, 2.5);
  } else if (o.outfit === 'swim') {
    rrect(ctx, -14 * S, hipY - 4 * S, 28 * S, 15 * S, 4, o.bottom, 2.5);
  } else {
    rrect(ctx, -14 * S, hipY - 6 * S, 28 * S, 26 * S, 5, o.bottom, 2.5);
  }
  // torso
  const torsoC = o.outfit === 'swim' ? (o.swimTop ? o.top : o.skin) : o.top;
  ctx.beginPath();
  ctx.moveTo(-15 * S, shY);
  ctx.lineTo(15 * S, shY);
  ctx.lineTo(13 * S, hipY);
  ctx.lineTo(-13 * S, hipY);
  ctx.closePath();
  fs(ctx, torsoC, 2.5);
  if (o.outfit === 'swim' && o.swimTop) {
    // a one-piece: skin shoulders
    rect(ctx, -15 * S, shY, 30 * S, 8 * S, o.skin, 0);
  }
  if (o.stripes) {
    ctx.strokeStyle = o.stripes;
    ctx.lineWidth = 3 * S;
    for (let k = 1; k < 4; k++) line(ctx, -14 * S, shY + k * 10 * S, 14 * S, shY + k * 10 * S, o.stripes, 3 * S);
  }
  if (o.outfit === 'suit') {
    poly(ctx, [[-4 * S, shY], [4 * S, shY], [0, shY + 18 * S]], '#ffffff', 1.5);
    poly(ctx, [[-2 * S, shY + 4 * S], [2 * S, shY + 4 * S], [0, shY + 16 * S]], o.tie || '#ff3d5a', 1);
  }
  if (o.logo) circle(ctx, 0, shY + 16 * S, 5 * S, o.logo, 1.5);
  return { hipY, shY, walk };
}

function arm(ctx, x0, y0, x1, y1, o, S, sleeve) {
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  limb(ctx, [[x0, y0], [x1, y1]], o.skin, 7 * S, 2);
  if (sleeve) limb(ctx, [[x0, y0], [x0 + (mx - x0) * 0.6, y0 + (my - y0) * 0.6]], sleeve, 9 * S, 2);
  circle(ctx, x1, y1, 4.5 * S, o.skin, 2);
}

export function person(ctx, o = {}, t = 0) {
  o = { skin: SKINS[1], hair: HAIRS[0], hairStyle: 'short', top: TOPS[0], bottom: BOTTOMS[0], outfit: 'tee', pose: 'stand', ...o };
  const S = o.kid ? 0.7 : o.size || 1;
  const R = (o.kid ? 15.5 : 14) * (o.kid ? 1 : S);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (o.flip) ctx.scale(-1, 1);
  const sleeve = o.outfit === 'tee' || o.outfit === 'suit' ? o.top : null;
  const wave = Math.sin(t * 6 + (o.phase || 0));
  if (o.pose === 'swim') {
    // head and shoulders above the water at y = 0, arms splashing
    const bob = Math.sin(t * 2 + (o.phase || 0)) * 2;
    ctx.translate(0, bob);
    arm(ctx, -12 * S, -10 * S, -24 * S, -26 * S + wave * 4, o, S, null);
    arm(ctx, 12 * S, -10 * S, 24 * S, -26 * S - wave * 4, o, S, null);
    ctx.beginPath();
    ctx.ellipse(0, 0, 16 * S, 12 * S, 0, Math.PI, 0);
    fs(ctx, o.swimTop ? o.top : o.skin, 2.5);
    headAt(ctx, 0, -16 * S - R * 0.6, R, o, t);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 1, 26 * S, 5 * S, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (o.pose === 'lie') {
    // lying flat on a towel, head to the left, toes up
    const legC = o.outfit === 'swim' ? o.skin : o.bottom;
    limb(ctx, [[10, -8], [58, -8]], legC, 10);
    limb(ctx, [[10, -4], [56, -2]], legC, 10);
    ellipse(ctx, 62, -14, 4, 8, o.skin, 2);
    ellipse(ctx, 60, -6, 4, 7, o.skin, 2);
    rrect(ctx, -32, -18, 44, 20, 8, o.outfit === 'swim' && !o.swimTop ? o.skin : o.top, 2.5);
    rrect(ctx, 0, -17, 16, 18, 5, o.bottom, 2.5);
    limb(ctx, [[-20, -12], [-50, -24]], o.skin, 7, 2);
    circle(ctx, -51, -25, 4, o.skin, 2);
    ctx.save();
    ctx.translate(-44, -10);
    ctx.rotate(-0.15);
    headAt(ctx, 0, -2, R, { ...o, mood: o.mood || (o.shades ? 'smile' : 'sleep'), hat: o.hat === 'sun' || o.hat === 'straw' ? null : o.hat }, t);
    ctx.restore();
    if (o.hat === 'sun' || o.hat === 'straw') ellipse(ctx, -8, -24, 16, 7, o.hat === 'straw' ? '#f2d27a' : o.hatColour || '#ff3d5a', 2.5, INK, 0.2);
    ctx.restore();
    return;
  }
  if (o.pose === 'sit') {
    // sitting on something at y = 0, legs dangling forward
    const hipY = -6 * S;
    const shY = -46 * S;
    const legC = o.outfit === 'swim' || o.outfit === 'dress' ? o.skin : o.bottom;
    const swing = Math.sin(t * 3 + (o.phase || 0)) * 3;
    limb(ctx, [[-7 * S, hipY], [-9 * S, 34 * S + swing]], legC, 9 * S);
    limb(ctx, [[7 * S, hipY], [9 * S, 34 * S - swing]], legC, 9 * S);
    ellipse(ctx, -10 * S, 37 * S + swing, 7 * S, 4 * S, o.shoes || '#3a3f55', 2);
    ellipse(ctx, 10 * S, 37 * S - swing, 7 * S, 4 * S, o.shoes || '#3a3f55', 2);
    rrect(ctx, -15 * S, hipY - 8 * S, 30 * S, 16 * S, 5, o.outfit === 'dress' ? o.top : o.bottom, 2.5);
    poly(ctx, [[-15 * S, shY], [15 * S, shY], [13 * S, hipY - 2], [-13 * S, hipY - 2]], o.outfit === 'swim' && !o.swimTop ? o.skin : o.top, 2.5);
    const shoulderL = [-13 * S, shY + 4 * S];
    const shoulderR = [13 * S, shY + 4 * S];
    if (o.item) {
      arm(ctx, ...shoulderL, -20 * S, shY + 32 * S, o, S, sleeve);
      arm(ctx, ...shoulderR, 20 * S, shY + 20 * S, o, S, sleeve);
      drawHeld(ctx, o.item, 22 * S, shY + 16 * S, S, o, t);
    } else if (o.wave) {
      arm(ctx, ...shoulderL, -20 * S, shY + 32 * S, o, S, sleeve);
      arm(ctx, ...shoulderR, 26 * S + wave * 4, shY - 22 * S, o, S, sleeve);
    } else {
      arm(ctx, ...shoulderL, -18 * S, shY + 36 * S, o, S, sleeve);
      arm(ctx, ...shoulderR, 18 * S, shY + 36 * S, o, S, sleeve);
    }
    headAt(ctx, 0, shY - R * 0.95, R, o, t);
    ctx.restore();
    return;
  }
  const bounce = o.pose === 'cheer' || o.pose === 'walk' ? Math.abs(Math.sin(t * 7 + (o.phase || 0))) * -3 : 0;
  ctx.translate(0, bounce);
  const J = body(ctx, o, t, { S });
  const shL = [-13 * S, J.shY + 5 * S];
  const shR = [13 * S, J.shY + 5 * S];
  const hipish = J.hipY + 4 * S;
  switch (o.pose) {
    case 'wave':
      arm(ctx, ...shL, -18 * S, hipish, o, S, sleeve);
      arm(ctx, ...shR, 30 * S + wave * 5, J.shY - 26 * S, o, S, sleeve);
      break;
    case 'cheer':
      arm(ctx, ...shL, -28 * S - wave * 2, J.shY - 30 * S, o, S, sleeve);
      arm(ctx, ...shR, 28 * S + wave * 2, J.shY - 30 * S, o, S, sleeve);
      break;
    case 'point':
      arm(ctx, ...shL, -18 * S, hipish, o, S, sleeve);
      arm(ctx, ...shR, 40 * S, J.shY - 6 * S, o, S, sleeve);
      break;
    case 'hold': {
      arm(ctx, ...shL, -18 * S, hipish, o, S, sleeve);
      arm(ctx, ...shR, 24 * S, J.shY + 22 * S, o, S, sleeve);
      break;
    }
    default: {
      const sw = o.pose === 'walk' ? J.walk * 6 * S : 0;
      arm(ctx, ...shL, -18 * S + sw, hipish, o, S, sleeve);
      arm(ctx, ...shR, 18 * S - sw, hipish, o, S, sleeve);
    }
  }
  headAt(ctx, 0, J.shY - R * 0.95, R, o, t);
  if (o.item) {
    const hx = o.pose === 'wave' ? -18 * S : 24 * S;
    const hy = o.pose === 'wave' ? hipish : J.shY + 20 * S;
    drawHeld(ctx, o.item, hx, hy, S, o, t);
  }
  ctx.restore();
}

// A shadowed person, ready to drop into a scene.
export function personAt(ctx, x, y, o, t = 0) {
  if (o.pose !== 'swim' && o.pose !== 'lie') shadow(ctx, x, y, o.kid ? 16 : 22);
  ctx.save();
  ctx.translate(x, y);
  person(ctx, o, t);
  ctx.restore();
}

export { star };
