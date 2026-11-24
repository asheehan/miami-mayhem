// Food Truck Chef station close-ups: the blender, the sandwich press, the taco stand, the ice
// cream cart, the fryer and the pizza oven, each drawn from the station state and its layout.
// Drawing only. `hide` names a thing the finger is carrying (so it isn't also drawn in place).
import { INK, TAU, hash, roundRect, mix, drawIng, drawIngSmall, drawSmoothieCup, drawSandwich, drawTaco, drawCone, drawFriedBoat, drawPizza, friedPiece, blendColour } from './draw-food.js';
import { GOOD_LO, GOOD_HI, FRY_GOLD, FRY_BURN, BAKE_GOLD, BAKE_BURN, rubProgress, ready } from './stations.js';

function fs(ctx, fill, lw = 3) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

// ---------- the kitchen behind every station ----------

export function drawKitchen(ctx, FW, FH, L) {
  ctx.fillStyle = '#fff6e6';
  ctx.fillRect(0, 0, FW, FH);
  ctx.strokeStyle = 'rgba(31,198,198,0.22)';
  ctx.lineWidth = 2;
  for (let y = 0; y < FH; y += 36) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(FW, y);
    ctx.stroke();
  }
  for (let x = 0; x < FW; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, FH);
    ctx.stroke();
  }
  // worktop the food sits on, and the shelf of bins
  const y = L.work.y1 - 4;
  const g = ctx.createLinearGradient(0, y, 0, y + 30);
  g.addColorStop(0, '#eef3f8');
  g.addColorStop(1, '#b8c4d2');
  ctx.fillStyle = g;
  ctx.fillRect(0, y, FW, FH - y);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(FW, y);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(0, y + 4, FW, 3);
}

// A bin: a big bowl with the ingredient in it. state: { glow, wrongAt, empty }
export function drawBinBowl(ctx, b, t, o = {}) {
  const shake = o.wrongAt !== undefined && t - o.wrongAt < 0.45 ? Math.sin((t - o.wrongAt) * 60) * 5 : 0;
  ctx.save();
  ctx.translate(shake, 0);
  if (o.glow) {
    ctx.save();
    ctx.shadowColor = '#ffe14d';
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r + 4 + Math.sin(t * 8) * 3, 0, TAU);
    ctx.fillStyle = '#ffe14d';
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(b.x, b.y + 3, b.r, 0, TAU);
  ctx.fillStyle = 'rgba(34,17,58,0.25)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, TAU);
  ctx.fillStyle = o.tool ? '#e8f4ff' : '#ffffff';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r * 0.84, 0, TAU);
  ctx.strokeStyle = o.tool ? '#7ab8ff' : '#ffb7d2';
  ctx.lineWidth = 3;
  ctx.stroke();
  if (!o.empty) drawIng(ctx, b.id, b.x, b.y, b.r * 0.74);
  if (o.dim) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, TAU);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
  }
  ctx.restore();
}

// A bar that fills while you hold; the green part is just right.
export function drawMeter(ctx, m, value, vertical, t, holding) {
  ctx.save();
  roundRect(ctx, m.x - 3, m.y - 3, m.w + 6, m.h + 6, 10);
  ctx.fillStyle = INK;
  ctx.fill();
  roundRect(ctx, m.x, m.y, m.w, m.h, 8);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.save();
  roundRect(ctx, m.x, m.y, m.w, m.h, 8);
  ctx.clip();
  const seg = (a, b, col) => {
    ctx.fillStyle = col;
    if (vertical) ctx.fillRect(m.x, m.y + m.h * (1 - b), m.w, m.h * (b - a));
    else ctx.fillRect(m.x + m.w * a, m.y, m.w * (b - a), m.h);
  };
  seg(0, GOOD_LO, '#fff1c2');
  seg(GOOD_LO, GOOD_HI, '#5fe07a');
  seg(GOOD_HI, 1, '#ff7a6a');
  // the fill
  ctx.globalAlpha = 0.85;
  const col = value > GOOD_HI ? '#c0301a' : value >= GOOD_LO ? '#1f9c4c' : '#ffb627';
  if (vertical) seg(0, value, col);
  else seg(0, value, col);
  ctx.restore();
  // the marker
  const pulse = holding ? 1 + Math.sin(t * 20) * 0.15 : 1;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (vertical) {
    const y = m.y + m.h * (1 - value);
    ctx.moveTo(m.x + m.w + 4, y);
    ctx.lineTo(m.x + m.w + 18 * pulse, y - 9 * pulse);
    ctx.lineTo(m.x + m.w + 18 * pulse, y + 9 * pulse);
  } else {
    const x = m.x + m.w * value;
    ctx.moveTo(x, m.y + m.h + 4);
    ctx.lineTo(x - 9 * pulse, m.y + m.h + 18 * pulse);
    ctx.lineTo(x + 9 * pulse, m.y + m.h + 18 * pulse);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// ---------- smoothie ----------

function jarPath(ctx, j) {
  ctx.beginPath();
  ctx.moveTo(j.x, j.y);
  ctx.lineTo(j.x + j.w, j.y);
  ctx.lineTo(j.x + j.w * 0.86, j.y + j.h);
  ctx.lineTo(j.x + j.w * 0.14, j.y + j.h);
  ctx.closePath();
}

// The blender jar with whatever is in it, at its own place (or carried: ox, oy offsets, tilt).
export function drawJar(ctx, st, j, t, { tilt = 0, ox = 0, oy = 0, empty = false } = {}) {
  ctx.save();
  ctx.translate(j.x + j.w / 2 + ox, j.y + j.h + oy);
  ctx.rotate(tilt);
  ctx.translate(-(j.x + j.w / 2), -(j.y + j.h));
  const blending = st.phase === 'blend' || st.phase === 'pour';
  const items = [...st.dish.fruits, ...st.dish.extras];
  const col = blendColour(items);
  const jig = st.holding ? Math.sin(t * 60) * 1.5 : 0;
  ctx.translate(jig, 0);
  // handle
  ctx.beginPath();
  ctx.moveTo(j.x + j.w * 0.95, j.y + j.h * 0.15);
  ctx.quadraticCurveTo(j.x + j.w * 1.28, j.y + j.h * 0.2, j.x + j.w * 1.2, j.y + j.h * 0.55);
  ctx.quadraticCurveTo(j.x + j.w * 1.12, j.y + j.h * 0.78, j.x + j.w * 0.88, j.y + j.h * 0.75);
  ctx.lineWidth = 12;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#c9e8f4';
  ctx.stroke();
  jarPath(ctx, j);
  ctx.fillStyle = 'rgba(220,245,255,0.55)';
  ctx.fill();
  ctx.save();
  jarPath(ctx, j);
  ctx.clip();
  if (!empty && items.length) {
    if (blending) {
      const m = st.phase === 'pour' ? 1 : Math.min(1, st.meter / GOOD_LO);
      const level = j.y + j.h * (1 - Math.min(0.9, 0.3 + items.length * 0.1));
      // swirl from chunky to smooth
      ctx.fillStyle = mix(col, '#ffffff', 0.15);
      ctx.fillRect(j.x - 10, level, j.w + 20, j.h);
      if (m < 1) {
        items.forEach((f, i) => {
          const a = t * (st.holding ? 14 : 0) + i * 2.1;
          const rr = j.w * 0.22 * (1 - m);
          ctx.save();
          ctx.globalAlpha = 1 - m;
          drawIngSmall(ctx, f, j.x + j.w / 2 + Math.cos(a) * j.w * 0.22, level + j.h * 0.3 + Math.sin(a) * j.h * 0.15, Math.max(4, rr));
          ctx.restore();
        });
      }
      if (st.holding) {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 4;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.ellipse(j.x + j.w / 2, level + 12 + i * j.h * 0.18, j.w * (0.32 - i * 0.05), 7, 0, t * 20 + i, t * 20 + i + 3.5);
          ctx.stroke();
        }
      }
      ctx.fillStyle = mix(col, '#ffffff', 0.45);
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(j.x + j.w * (0.2 + i * 0.12), level + Math.sin(t * 9 + i) * (st.holding ? 4 : 1), 9, 0, TAU);
        ctx.fill();
      }
    } else {
      // whole fruit piled at the bottom
      items.forEach((f, i) => {
        const row = Math.floor(i / 3);
        const col3 = i % 3;
        const r = j.w * 0.17;
        drawIngSmall(ctx, f, j.x + j.w * (0.3 + col3 * 0.2) + (row % 2) * j.w * 0.08, j.y + j.h - r * 1.05 - row * r * 1.45, r);
      });
    }
  } else if (empty) {
    ctx.fillStyle = mix(col, '#ffffff', 0.3);
    ctx.globalAlpha = 0.5;
    ctx.fillRect(j.x, j.y + j.h - 10, j.w, 10);
  }
  ctx.restore();
  jarPath(ctx, j);
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // measuring marks and a shine
  ctx.strokeStyle = 'rgba(34,17,58,0.35)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(j.x + j.w * 0.18, j.y + j.h * (i / 4));
    ctx.lineTo(j.x + j.w * 0.3, j.y + j.h * (i / 4));
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(j.x + j.w * 0.78, j.y + j.h * 0.45, j.w * 0.04, j.h * 0.3, -0.12, 0, TAU);
  ctx.fill();
  // lid
  const pop = st.cook === 'over' && st.phase === 'pour' && st.phaseT < 0.8 ? Math.sin(st.phaseT * 8) * 10 : 0;
  roundRect(ctx, j.x - 6, j.y - 20 - Math.abs(pop), j.w + 12, 22, 8);
  fs(ctx, '#4a3a6a', 4);
  roundRect(ctx, j.x + j.w / 2 - 14, j.y - 32 - Math.abs(pop), 28, 14, 5);
  fs(ctx, '#4a3a6a', 3);
  if (st.cook === 'over' && (st.phase === 'pour' || st.phase === 'top')) {
    // smoothie splats over the lid and down the side
    ctx.fillStyle = col;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(j.x + j.w * (0.15 + i * 0.25), j.y - 14, 14, 9, 0, 0, TAU);
      ctx.fill();
      roundRect(ctx, j.x + j.w * (0.12 + i * 0.25), j.y - 14, 8, 26 + (i % 2) * 18, 4);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawSmoothieStation(ctx, st, L, t, hide) {
  const B = L.blender;
  const j = B.jar;
  drawMeter(ctx, L.meter, st.meter, true, t, st.holding);
  // base
  ctx.beginPath();
  ctx.moveTo(B.x - B.jw * 0.48, B.bottom - B.baseH);
  ctx.lineTo(B.x + B.jw * 0.48, B.bottom - B.baseH);
  ctx.lineTo(B.x + B.jw * 0.56, B.bottom);
  ctx.lineTo(B.x - B.jw * 0.56, B.bottom);
  ctx.closePath();
  fs(ctx, '#ff5fa2', 4);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(B.x - B.jw * 0.44, B.bottom - B.baseH + 6, B.jw * 0.88, 6);
  // the big button
  const btn = L.button;
  const live = st.phase === 'blend' || ready(st);
  const pressed = st.holding ? 4 : 0;
  if (live && !st.holding) {
    ctx.save();
    ctx.shadowColor = '#ffe14d';
    ctx.shadowBlur = 14 + Math.sin(t * 6) * 8;
    ctx.beginPath();
    ctx.arc(btn.x, btn.y, btn.r + 3, 0, TAU);
    ctx.fillStyle = '#ffe14d';
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(btn.x, btn.y + 4, btn.r, 0, TAU);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(btn.x, btn.y + pressed, btn.r, 0, TAU);
  fs(ctx, live ? '#3fe07a' : '#c9d3df', 4);
  // a swirl on the button
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const sp = st.holding ? t * 12 : 0;
  ctx.arc(btn.x, btn.y + pressed, btn.r * 0.5, sp, sp + 4.4);
  ctx.stroke();
  if (hide !== 'jar') drawJar(ctx, st, j, t, { empty: st.phase === 'top' || st.phase === 'done' });
  if (hide !== 'cup') {
    const fill = st.phase === 'top' || st.phase === 'done' ? Math.min(1, st.phase === 'top' ? st.phaseT * 1.4 : 1) : 0;
    drawSmoothieCup(ctx, fill > 0 ? st.dish : { toppers: [] }, L.cup.x, L.cup.bottom, L.cup.h, { fill, colour: blendColour([...st.dish.fruits, ...st.dish.extras]), noFoam: fill < 1 });
    if (st.phase === 'pour' && !hide) {
      // dashed hint: carry the jar to the cup
      ctx.save();
      ctx.setLineDash([8, 8]);
      ctx.lineDashOffset = -t * 30;
      ctx.strokeStyle = 'rgba(34,17,58,0.4)';
      ctx.lineWidth = 4;
      roundRect(ctx, L.cupBox.x, L.cupBox.y, L.cupBox.w, L.cupBox.h, 16);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ---------- sandwich ----------

function drawBoard(ctx, b) {
  roundRect(ctx, b.x - b.w / 2, b.bottom - 22, b.w, 26, 10);
  fs(ctx, '#d99a5a', 4);
  ctx.strokeStyle = 'rgba(120,60,20,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(b.x - b.w / 2 + 14, b.bottom - 16 + i * 6);
    ctx.lineTo(b.x + b.w / 2 - 14, b.bottom - 16 + i * 6);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(b.x + b.w / 2 - 18, b.bottom - 9, 5, 0, TAU);
  ctx.fillStyle = '#8a5a2a';
  ctx.fill();
}

// The press: hinged lid (0 open .. 1 shut), heat glow by meter.
function drawPress(ctx, P, st, t, carrying) {
  const shut = st.phase === 'press' ? (st.holding ? 1 : 0.15) : st.phase === 'done' ? 0.15 : 0;
  const baseY = P.y + P.h;
  const plateH = P.h * 0.22;
  // the bottom plate and its feet
  roundRect(ctx, P.x - P.w / 2, baseY - plateH, P.w, plateH, 8);
  fs(ctx, '#4a4a5a', 4);
  ctx.strokeStyle = '#2a2a36';
  ctx.lineWidth = 3;
  for (let i = 1; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(P.x - P.w / 2 + (i * P.w) / 8, baseY - plateH + 4);
    ctx.lineTo(P.x - P.w / 2 + (i * P.w) / 8, baseY - 4);
    ctx.stroke();
  }
  // the sandwich in the press
  let top = baseY - plateH;
  if ((st.phase === 'press' || st.phase === 'done') && carrying !== 'pressed') {
    const k = st.phase === 'done' ? 1 : Math.min(1, st.meter / GOOD_LO);
    top = drawSandwich(ctx, st.dish.layers, P.x, baseY - plateH + 2, P.w * 0.8, { lid: true, pressed: k, cook: st.phase === 'done' ? st.cook : st.meter > GOOD_HI ? 'over' : null, extras: st.dish.extras });
  }
  // the lid, hinged at the back (left)
  const ang = -0.6 * (1 - shut);
  const hx = P.x - P.w / 2;
  const hy = Math.min(baseY - plateH - 6, top + (shut > 0.5 ? 4 : -6));
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(ang);
  const heat = st.phase === 'press' ? st.meter : 0;
  roundRect(ctx, 0, -plateH * 1.2, P.w, plateH * 1.2, 10);
  fs(ctx, mix('#5a5a6a', '#ff5a2a', Math.min(1, heat * 0.6)), 4);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(8, -plateH * 1.1, P.w - 16, 5);
  // handle sticking out the front
  ctx.lineWidth = 10;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(P.w - 4, -plateH * 0.6);
  ctx.lineTo(P.w + 30, -plateH * 0.9);
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#ff5fa2';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(P.w + 34, -plateH * 0.95, 13, 0, TAU);
  fs(ctx, '#ff5fa2', 4);
  ctx.restore();
  // the hinge
  ctx.beginPath();
  ctx.arc(hx + 4, hy - 4, 9, 0, TAU);
  fs(ctx, '#8a8a9a', 3);
  if (st.phase === 'build' && ready(st) && carrying !== 'sandwich') {
    ctx.save();
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = -t * 30;
    ctx.strokeStyle = 'rgba(34,17,58,0.45)';
    ctx.lineWidth = 4;
    roundRect(ctx, P.x - P.w / 2 - 10, P.y - 10, P.w + 20, P.h + 20, 16);
    ctx.stroke();
    ctx.restore();
  }
}

function drawSandwichStation(ctx, st, L, t, hide) {
  drawBoard(ctx, L.board);
  drawPress(ctx, L.press, st, t, hide);
  if (st.phase === 'press' || st.phase === 'done') drawMeter(ctx, L.meter, st.phase === 'done' ? Math.max(st.meter, GOOD_LO) : st.meter, false, t, st.holding);
  if (st.phase === 'build' && hide !== 'sandwich') {
    if (!st.dish.layers.length && !st.dish.extras.length) {
      // a dashed loaf outline: bread goes here
      ctx.save();
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = 'rgba(34,17,58,0.35)';
      ctx.lineWidth = 4;
      roundRect(ctx, L.board.x - L.board.w * 0.42, L.board.bottom - 70, L.board.w * 0.84, 46, 22);
      ctx.stroke();
      ctx.restore();
    } else drawSandwich(ctx, st.dish.layers, L.board.x, L.board.bottom - 20, L.board.w * 0.84, { lid: ready(st) && !st.free, extras: st.dish.extras });
  }
}

// ---------- taco ----------

function drawTacoStation(ctx, st, L, t, hide) {
  const T = L.taco;
  // a wavy metal taco stand
  ctx.beginPath();
  ctx.moveTo(T.x - T.w * 0.62, T.bottom + 6);
  ctx.lineTo(T.x + T.w * 0.62, T.bottom + 6);
  ctx.lineTo(T.x + T.w * 0.55, T.bottom + 18);
  ctx.lineTo(T.x - T.w * 0.55, T.bottom + 18);
  ctx.closePath();
  fs(ctx, '#9aa8b8', 3);
  if (hide === 'taco') return;
  if (!st.dish.tortilla && !st.dish.fillings.length && !st.dish.extras.length) {
    ctx.save();
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = 'rgba(34,17,58,0.35)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(T.x, T.bottom - T.w * 0.47, T.w * 0.5, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
  } else drawTaco(ctx, st.dish, T.x, T.bottom, T.w);
  // the stand's front lip
  ctx.beginPath();
  ctx.moveTo(T.x - T.w * 0.3, T.bottom + 6);
  ctx.quadraticCurveTo(T.x, T.bottom - 18, T.x + T.w * 0.3, T.bottom + 6);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#9aa8b8';
  ctx.stroke();
}

// ---------- ice cream ----------

export function coneScale(n, L) {
  const avail = L.cone.tip - L.work.y0 - 20;
  const need = L.cone.s * (1.1 + 0.55 + n * (n > 4 ? Math.max(0.27, 0.58 - n * 0.025) : 0.52)) + (n ? 30 : 0);
  return Math.min(1, avail / need);
}

function drawIcecreamStation(ctx, st, L, t, hide) {
  const K = L.cone;
  // a cone holder on a stand
  roundRect(ctx, K.x - K.s * 0.5, K.tip - 4, K.s, 14, 6);
  fs(ctx, '#ff9ec7', 3);
  if (hide === 'cone') return;
  const n = st.dish.scoops.length;
  const k = coneScale(n, L);
  ctx.save();
  ctx.translate(K.x, K.tip);
  ctx.scale(k, k);
  drawCone(ctx, st.dish, 0, 0, K.s, { t, sprinkleMarks: Math.floor(rubProgress(st, 'sprinkles') * 26) });
  ctx.restore();
}

// ---------- fryer ----------

export function pieceDone(p) {
  if (p.t < FRY_GOLD) return p.t / FRY_GOLD;
  if (p.t <= FRY_BURN) return 1;
  return 1 + Math.min(1, (p.t - FRY_BURN) / 3);
}

function drawFryerStation(ctx, st, L, t, hide, held) {
  const F = L.fryer;
  // body
  roundRect(ctx, F.x - F.w / 2, F.y + F.h * 0.12, F.w, F.h * 0.88, 16);
  fs(ctx, '#c9d3df', 4);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(F.x - F.w / 2 + 10, F.y + F.h * 0.12 + 8, F.w - 20, 5);
  // a dial and a light
  ctx.beginPath();
  ctx.arc(F.x + F.w * 0.44, F.y + F.h * 0.88, 9, 0, TAU);
  fs(ctx, '#ff4b4b', 3);
  // the oil
  const O = L.oil;
  roundRect(ctx, O.x, O.y, O.w, O.h, 12);
  const g = ctx.createLinearGradient(0, O.y, 0, O.y + O.h);
  g.addColorStop(0, '#ffd23a');
  g.addColorStop(1, '#e89a1a');
  fs(ctx, g, 4);
  ctx.save();
  roundRect(ctx, O.x, O.y, O.w, O.h, 12);
  ctx.clip();
  // bubbles fizz harder with more in the oil
  const inOil = st.pieces.filter((p) => !p.out);
  ctx.fillStyle = 'rgba(255,255,220,0.8)';
  const nb = 8 + inOil.length * 8;
  for (let i = 0; i < nb; i++) {
    const tt = (t * (1.5 + hash(i) * 2) + hash(i + 9)) % 1;
    ctx.globalAlpha = 1 - tt;
    ctx.beginPath();
    ctx.arc(O.x + hash(i + 3) * O.w, O.y + O.h * (0.9 - tt * 0.8), 2 + hash(i + 5) * 4, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  // pieces in the oil, each in its slot
  inOil.forEach((p, i) => {
    if (held === p.id) return;
    const s = L.slots[i % L.slots.length];
    const d = pieceDone(p);
    const bob = Math.sin(t * 5 + p.id) * 2;
    friedPiece(ctx, p.food, s.x, s.y + bob, O.h * 0.36, d, p.food === 'churro' ? -0.6 : 0);
    // a ring that fills to gold, then turns red
    const ring = O.h * 0.44;
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(34,17,58,0.25)';
    ctx.beginPath();
    ctx.arc(s.x, s.y - O.h * 0.58, 11, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = d < 1 ? '#ffffff' : d <= 1 ? '#3fe07a' : '#ff4b4b';
    ctx.beginPath();
    ctx.arc(s.x, s.y - O.h * 0.58, 11, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, d < 1 ? d : (p.t - FRY_GOLD) / (FRY_BURN - FRY_GOLD)));
    ctx.stroke();
    if (d >= 1 && d <= 1.001) {
      // golden: a sparkle that says "now!"
      const sp = 1 + Math.sin(t * 10) * 0.25;
      ctx.save();
      ctx.translate(s.x + ring * 0.7, s.y - ring * 0.6);
      ctx.scale(sp, sp);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU;
        const rr = k % 2 ? 3 : 10;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.fill();
      ctx.restore();
    }
    if (d > 1.3) {
      // smoke from a dark one
      for (let k = 0; k < 3; k++) {
        const tt = (t * 0.8 + k / 3) % 1;
        ctx.globalAlpha = 0.5 * (1 - tt);
        ctx.fillStyle = '#5a5060';
        ctx.beginPath();
        ctx.arc(s.x + Math.sin(tt * 5 + k) * 8, s.y - O.h * 0.4 - tt * 60, 8 + tt * 14, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  });
  // the basket rim
  ctx.strokeStyle = '#8a96aa';
  ctx.lineWidth = 4;
  roundRect(ctx, O.x + 6, O.y + 6, O.w - 12, O.h - 12, 8);
  ctx.stroke();
  // the paper boat for what comes out
  if (hide !== 'boat') {
    drawFriedBoat(ctx, st.dish, L.boat.x, L.boat.bottom, L.boat.w, {
      shakeMarks: Math.floor(Math.max(rubProgress(st, 'sugar'), rubProgress(st, 'salt')) * 40),
      shakeTool: (st.rub.salt || 0) > (st.rub.sugar || 0) ? 'salt' : 'sugar',
    });
  }
}

// ---------- pizza ----------

function drawOven(ctx, O, st, t, held) {
  const x = O.x - O.w / 2;
  // brick dome
  ctx.beginPath();
  ctx.moveTo(x, O.y + O.h);
  ctx.lineTo(x, O.y + O.h * 0.45);
  ctx.quadraticCurveTo(x, O.y, O.x, O.y);
  ctx.quadraticCurveTo(x + O.w, O.y, x + O.w, O.y + O.h * 0.45);
  ctx.lineTo(x + O.w, O.y + O.h);
  ctx.closePath();
  fs(ctx, '#d9643a', 4);
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(120,40,20,0.45)';
  ctx.lineWidth = 2;
  for (let r = 0; r < 8; r++) {
    const yy = O.y + r * 18;
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + O.w, yy);
    ctx.stroke();
    for (let c = 0; c < 8; c++) {
      const xx = x + c * 30 + (r % 2) * 15;
      ctx.beginPath();
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx, yy + 18);
      ctx.stroke();
    }
  }
  ctx.restore();
  // the mouth with the fire glowing
  const mw = O.w * 0.62;
  const mh = O.h * 0.46;
  const mx = O.x - mw / 2;
  const my = O.y + O.h - mh - 8;
  ctx.beginPath();
  ctx.moveTo(mx, my + mh);
  ctx.lineTo(mx, my + mh * 0.45);
  ctx.quadraticCurveTo(mx, my, O.x, my);
  ctx.quadraticCurveTo(mx + mw, my, mx + mw, my + mh * 0.45);
  ctx.lineTo(mx + mw, my + mh);
  ctx.closePath();
  const g = ctx.createRadialGradient(O.x, my + mh, 4, O.x, my + mh, mw * 0.7);
  g.addColorStop(0, '#ffe14d');
  g.addColorStop(0.5, '#ff7a1a');
  g.addColorStop(1, '#5a1a0a');
  fs(ctx, g, 4);
  if (st.phase === 'bake' && held !== 'ovenpizza') {
    const bake = st.oven < BAKE_GOLD ? st.oven / BAKE_GOLD : st.oven <= BAKE_BURN ? 1 : 1 + Math.min(1, (st.oven - BAKE_BURN) / 3);
    ctx.save();
    ctx.translate(O.x, my + mh - 10);
    ctx.scale(1, 0.38);
    drawPizza(ctx, st.dish, 0, 0, mw * 0.4, { bake });
    ctx.restore();
    // timer ring over the oven
    const rx = O.x + O.w * 0.36;
    const ry = O.y + 18;
    ctx.beginPath();
    ctx.arc(rx, ry, 16, 0, TAU);
    fs(ctx, '#ffffff', 3);
    ctx.lineWidth = 6;
    ctx.strokeStyle = bake < 1 ? '#ffb627' : bake <= 1 ? '#3fe07a' : '#ff4b4b';
    ctx.beginPath();
    ctx.arc(rx, ry, 9, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, bake < 1 ? bake : (st.oven - BAKE_GOLD) / (BAKE_BURN - BAKE_GOLD)));
    ctx.stroke();
    if (bake > 1.3) {
      for (let k = 0; k < 3; k++) {
        const tt = (t * 0.8 + k / 3) % 1;
        ctx.globalAlpha = 0.55 * (1 - tt);
        ctx.fillStyle = '#4a4048';
        ctx.beginPath();
        ctx.arc(O.x + Math.sin(tt * 4 + k) * 10, O.y - tt * 60, 10 + tt * 16, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  } else {
    // flickering flames
    for (let i = 0; i < 4; i++) {
      const fx = mx + mw * (0.2 + i * 0.2);
      const fh = mh * (0.3 + 0.15 * Math.sin(t * 9 + i * 2));
      ctx.fillStyle = i % 2 ? '#ffb627' : '#ffe14d';
      ctx.beginPath();
      ctx.moveTo(fx - 8, my + mh);
      ctx.quadraticCurveTo(fx, my + mh - fh * 1.6, fx + 8, my + mh);
      ctx.fill();
    }
  }
  // chimney
  roundRect(ctx, O.x + O.w * 0.12, O.y - 24, 24, 30, 4);
  fs(ctx, '#8a3a1a', 3);
  if (ready(st) && st.phase !== 'bake' && held !== 'pizza' && (!st.free || st.phase === 'build')) {
    ctx.save();
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = -t * 30;
    ctx.strokeStyle = st.free ? 'rgba(34,17,58,0.2)' : 'rgba(34,17,58,0.45)';
    ctx.lineWidth = 4;
    roundRect(ctx, x - 8, O.y - 8, O.w + 16, O.h + 16, 18);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPizzaStation(ctx, st, L, t, hide) {
  const P = L.pizza;
  drawOven(ctx, L.oven, st, t, hide);
  // the wooden peel
  ctx.beginPath();
  ctx.arc(P.x, P.y, P.r + 14, 0, TAU);
  fs(ctx, '#d99a5a', 4);
  roundRect(ctx, P.x + P.r * 0.7, P.y + P.r * 0.6, P.r * 0.9, 24, 10);
  ctx.save();
  ctx.translate(0, 0);
  fs(ctx, '#c4844a', 4);
  ctx.restore();
  if (hide === 'pizza' || st.phase === 'bake') return;
  drawPizza(ctx, st.dish, P.x, P.y, P.r, {
    sauce: rubProgress(st, 'sauce'),
    cheese: rubProgress(st, 'mozzarella'),
    bake: st.phase === 'done' ? (st.cook === 'over' ? 2 : 1) : 0,
    marks: st.marks,
  });
}

// ---------- all of it ----------

export function drawStationScene(ctx, st, L, t, { hide = null, held = null } = {}) {
  if (st.kind === 'smoothie') drawSmoothieStation(ctx, st, L, t, hide);
  else if (st.kind === 'sandwich') drawSandwichStation(ctx, st, L, t, hide);
  else if (st.kind === 'taco') drawTacoStation(ctx, st, L, t, hide);
  else if (st.kind === 'icecream') drawIcecreamStation(ctx, st, L, t, hide);
  else if (st.kind === 'fried') drawFryerStation(ctx, st, L, t, hide, held);
  else if (st.kind === 'pizza') drawPizzaStation(ctx, st, L, t, hide);
}

// The thing the finger carries, drawn at (x, y).
export function drawCarried(ctx, st, L, what, x, y, t) {
  ctx.save();
  if (what === 'jar') {
    const j = L.blender.jar;
    const overCup = x > L.cupBox.x - 20;
    drawJar(ctx, st, j, t, { ox: x - (j.x + j.w / 2), oy: y - (j.y + j.h) + j.h * 0.5, tilt: overCup && st.phase === 'pour' ? 0.9 : 0.1 });
  } else if (what === 'cup') {
    drawSmoothieCup(ctx, st.dish, x, y + L.cup.h * 0.5, L.cup.h, {});
  } else if (what === 'sandwich' || what === 'pressed') {
    drawSandwich(ctx, st.dish.layers, x, y + 30, L.board.w * 0.7, { lid: true, pressed: what === 'pressed' ? 1 : 0, cook: what === 'pressed' ? st.cook : null, extras: st.dish.extras });
  } else if (what === 'taco') {
    drawTaco(ctx, st.dish, x, y + L.taco.w * 0.45, L.taco.w * 0.8);
  } else if (what === 'cone') {
    const k = coneScale(st.dish.scoops.length, L) * 0.85;
    ctx.translate(x, y + L.cone.s * 0.6 * k);
    ctx.scale(k, k);
    drawCone(ctx, st.dish, 0, 0, L.cone.s, { t });
  } else if (what === 'boat') {
    drawFriedBoat(ctx, st.dish, x, y + L.boat.w * 0.2, L.boat.w * 0.85);
  } else if (what === 'pizza' || what === 'ovenpizza') {
    const bake = what === 'ovenpizza' ? (st.oven < BAKE_GOLD ? st.oven / BAKE_GOLD : st.oven <= BAKE_BURN ? 1 : 2) : st.phase === 'done' ? (st.cook === 'over' ? 2 : 1) : 0;
    drawPizza(ctx, st.dish, x, y, L.pizza.r * 0.85, { bake, sauce: rubProgress(st, 'sauce'), cheese: rubProgress(st, 'mozzarella'), marks: st.marks });
  } else if (typeof what === 'object' && what.piece) {
    const p = what.piece;
    friedPiece(ctx, p.food, x, y, L.oil.h * 0.4, pieceDone(p), p.food === 'churro' ? -0.6 : 0);
  }
  ctx.restore();
}
