// Sunset Drive sprite art: every roadside thing, traffic car and pickup, painted once with canvas
// paths into its own offscreen canvas and then drawn scaled. No game rules here.
//
// Each entry: h = height in world units (the road is 2000 wide), aspect = width / height,
// res = canvas pixels tall, paint(ctx, w) draws into a box `w` wide and 100 tall (y down,
// the ground at y = 100). Sprites stand with their bottom centre on the ground.

export const INK = '#160b33';
const TAU = Math.PI * 2;

function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
}

function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fillInk(ctx, fill, lw = 1.6) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
}

// ---------- plants ----------

function palm(ctx, w, { trunk = '#a8703e', trunkDark = '#7a4a26', leaf = '#2fae4a', leafDark = '#1d7a33', nut = '#6b3f1d', bend = 0.12 } = {}) {
  const bx = w / 2;
  const tx = bx + w * bend;
  const ty = 30;
  // trunk: a gently curved tapering band
  const steps = 10;
  for (let i = steps - 1; i >= 0; i--) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    const p = (t) => {
      const u = 1 - t;
      return [bx * u * u + (bx - w * 0.02) * 2 * u * t + tx * t * t, 100 * u * u + 62 * 2 * u * t + ty * t * t];
    };
    const [x0, y0] = p(t0);
    const [x1, y1] = p(t1);
    const r0 = 4.2 - t0 * 1.8;
    const r1 = 4.2 - t1 * 1.8;
    poly(ctx, [x0 - r0, y0, x0 + r0, y0, x1 + r1, y1 + 0.6, x1 - r1, y1 + 0.6]);
    fillInk(ctx, i % 2 ? trunk : trunkDark, 1.2);
  }
  // fronds
  const fronds = [
    [-2.7, 30], [-2.2, 34], [-1.5, 27], [-0.9, 30], [-0.25, 32], [0.35, 27], [0.75, 30],
  ];
  for (const [a0, len] of fronds) {
    const a = a0 + bend * 1.2;
    const droop = 0.55;
    const ex = tx + Math.cos(a) * len;
    const ey = ty + Math.sin(a) * len * 0.55 + len * droop * 0.45;
    const mx = tx + Math.cos(a) * len * 0.55;
    const my = ty + Math.sin(a) * len * 0.5 - 6;
    const nx = -Math.sin(a) * 5;
    const ny = Math.cos(a) * 3.5;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(mx + nx, my + ny - 2, ex, ey);
    ctx.quadraticCurveTo(mx - nx, my - ny + 3, tx, ty);
    ctx.closePath();
    fillInk(ctx, a0 > -1.2 && a0 < 0 ? leaf : leafDark, 1.3);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  for (const [dx, dy] of [[-2.2, 2.5], [1.8, 3], [0, 4.4]]) {
    ellipse(ctx, tx + dx, ty + dy, 2.2, 2.2);
    fillInk(ctx, nut, 1);
  }
}

function shrub(ctx, w) {
  const blobs = [[0.25, 70, 18], [0.5, 60, 22], [0.75, 70, 18], [0.4, 80, 16], [0.62, 82, 16]];
  for (const [fx, y, r] of blobs) {
    ellipse(ctx, w * fx, y, r * 1.2, r);
    fillInk(ctx, '#2f9e4a', 1.4);
  }
  for (const [fx, y] of [[0.3, 64], [0.55, 52], [0.7, 70], [0.45, 76], [0.2, 78], [0.82, 78]]) {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU;
      ellipse(ctx, w * fx + Math.cos(a) * 3, y + Math.sin(a) * 3, 2.6, 2.6);
      ctx.fillStyle = '#ff3d6e';
      ctx.fill();
    }
    ellipse(ctx, w * fx, y, 1.5, 1.5);
    ctx.fillStyle = '#ffe14d';
    ctx.fill();
  }
}

function mangrove(ctx, w) {
  ctx.strokeStyle = '#5a3a22';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const x0 = w * (0.15 + i * 0.12);
    ctx.beginPath();
    ctx.moveTo(x0, 100);
    ctx.quadraticCurveTo(x0 + (i % 2 ? 6 : -6), 70, w * 0.5 + (i - 3) * 4, 58);
    ctx.stroke();
  }
  const blobs = [[0.2, 48, 16], [0.42, 36, 20], [0.66, 40, 19], [0.84, 52, 14], [0.52, 52, 18], [0.3, 30, 13]];
  for (const [fx, y, r] of blobs) {
    ellipse(ctx, w * fx, y, r * 1.15, r);
    fillInk(ctx, '#2d6b3a', 1.4);
  }
  for (const [fx, y, r] of [[0.4, 30, 8], [0.64, 34, 7], [0.22, 44, 6]]) {
    ellipse(ctx, w * fx, y, r * 1.2, r);
    ctx.fillStyle = '#4a9a4e';
    ctx.fill();
  }
}

function sawgrass(ctx, w) {
  ctx.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    const x0 = w * (0.12 + (i / 15) * 0.76);
    const lean = (i - 7.5) * 1.6 + Math.sin(i * 2.3) * 4;
    const h = 52 + ((i * 37) % 40);
    ctx.strokeStyle = i % 3 === 0 ? '#c9b24a' : i % 3 === 1 ? '#8aa83a' : '#6d9230';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0, 100);
    ctx.quadraticCurveTo(x0 + lean * 0.3, 100 - h * 0.6, x0 + lean, 100 - h);
    ctx.stroke();
  }
  // a few cattail heads
  for (const [fx, h] of [[0.35, 70], [0.6, 78]]) {
    rrect(ctx, w * fx - 2, 100 - h, 4, 12, 2);
    fillInk(ctx, '#7a4a26', 1);
  }
}

// ---------- buildings and signs ----------

function hotel(ctx, w, body, trim, accent, glass = '#5fd8e8') {
  const l = w * 0.06;
  const r = w * 0.94;
  // body with a rounded corner on the left
  ctx.beginPath();
  ctx.moveTo(l + 12, 22);
  ctx.lineTo(r, 22);
  ctx.lineTo(r, 100);
  ctx.lineTo(l, 100);
  ctx.lineTo(l, 34);
  ctx.quadraticCurveTo(l, 22, l + 12, 22);
  ctx.closePath();
  fillInk(ctx, body, 1.8);
  // stepped tower fin with a sign
  const fx = w * 0.5;
  poly(ctx, [fx - 7, 22, fx - 7, 10, fx - 5, 10, fx - 5, 5, fx - 2.5, 5, fx - 2.5, 0.8, fx + 2.5, 0.8, fx + 2.5, 5, fx + 5, 5, fx + 5, 10, fx + 7, 10, fx + 7, 22]);
  fillInk(ctx, trim, 1.6);
  ctx.fillStyle = accent;
  ctx.font = '900 6px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  'HOTEL'.split('').forEach((ch, i) => ctx.fillText(ch, fx, 26 + i * 6.5));
  // eyebrow ledges over each row of windows
  for (let row = 0; row < 4; row++) {
    const y = 30 + row * 15;
    for (const [x0, x1] of [[l + 3, fx - 9], [fx + 9, r - 3]]) {
      ctx.fillStyle = 'rgba(22,11,51,0.18)';
      ctx.fillRect(x0, y + 2, x1 - x0, 2.2);
      ctx.fillStyle = trim;
      ctx.fillRect(x0 - 1.5, y, x1 - x0 + 3, 2.2);
      const n = Math.max(2, Math.round((x1 - x0) / 9));
      const ww = (x1 - x0) / n;
      for (let k = 0; k < n; k++) {
        rrect(ctx, x0 + k * ww + 1.4, y + 4, ww - 2.8, 7, 1.2);
        fillInk(ctx, glass, 0.9);
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillRect(x0 + k * ww + 2.2, y + 4.8, 1.6, 5);
      }
    }
  }
  // porch with a neon trim and a striped awning
  ctx.fillStyle = accent;
  ctx.fillRect(l, 88, r - l, 1.6);
  poly(ctx, [fx - 10, 86, fx + 10, 86, fx + 12, 91, fx - 12, 91]);
  fillInk(ctx, accent, 1.2);
  rrect(ctx, fx - 5, 91, 10, 9, 1);
  fillInk(ctx, '#2a1a4a', 1.2);
  // portholes on the corner
  for (const y of [40, 55, 70]) {
    ellipse(ctx, l + 5, y, 2.4, 2.4);
    fillInk(ctx, glass, 0.9);
  }
}

function neon(ctx, w, kind, night) {
  // pole
  ctx.fillStyle = '#4a4560';
  ctx.fillRect(w / 2 - 2, 50, 4, 50);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.strokeRect(w / 2 - 2, 50, 4, 50);
  rrect(ctx, 4, 4, w - 8, 50, 6);
  fillInk(ctx, '#20133e', 2);
  const glow = (colour, draw) => {
    ctx.save();
    ctx.strokeStyle = colour;
    ctx.fillStyle = colour;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = colour;
    ctx.shadowBlur = night ? 8 : 5;
    ctx.lineWidth = 2.6;
    draw();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 0.9;
    draw();
    ctx.restore();
  };
  const cx = w / 2;
  if (kind === 'flamingo') {
    glow('#ff4fb0', () => {
      ctx.beginPath();
      ctx.ellipse(cx - 2, 30, 9, 6, -0.2, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 5, 27);
      ctx.bezierCurveTo(cx + 12, 22, cx + 2, 14, cx + 8, 10);
      ctx.lineTo(cx + 13, 12);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 2, 36);
      ctx.lineTo(cx - 2, 48);
      ctx.moveTo(cx - 2, 42);
      ctx.lineTo(cx + 3, 39);
      ctx.stroke();
    });
  } else if (kind === 'palm') {
    glow('#3dff9a', () => {
      ctx.beginPath();
      ctx.moveTo(cx, 48);
      ctx.quadraticCurveTo(cx - 3, 30, cx + 2, 18);
      ctx.stroke();
      for (const a of [-2.6, -2, -1.2, -0.4, 0.3]) {
        ctx.beginPath();
        ctx.moveTo(cx + 2, 18);
        ctx.quadraticCurveTo(cx + 2 + Math.cos(a) * 8, 14 + Math.sin(a) * 6 - 3, cx + 2 + Math.cos(a) * 15, 18 + Math.sin(a) * 6 + 5);
        ctx.stroke();
      }
    });
    glow('#ffe14d', () => {
      ctx.beginPath();
      ctx.arc(cx - 10, 40, 5, Math.PI, 0);
      ctx.stroke();
    });
  } else {
    glow('#3de0ff', () => {
      ctx.font = '900 17px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 1.6;
      ctx.strokeText('EAT', cx, 22);
    });
    glow('#ff4fb0', () => {
      ctx.beginPath();
      ctx.moveTo(cx - 16, 40);
      ctx.lineTo(cx + 12, 40);
      ctx.moveTo(cx + 6, 35);
      ctx.lineTo(cx + 13, 40);
      ctx.lineTo(cx + 6, 45);
      ctx.stroke();
    });
  }
}

function billboard(ctx, w, kind) {
  for (const fx of [0.25, 0.75]) {
    ctx.fillStyle = '#6e6a80';
    ctx.fillRect(w * fx - 2, 50, 4, 50);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(w * fx - 2, 50, 4, 50);
  }
  rrect(ctx, 3, 4, w - 6, 52, 3);
  fillInk(ctx, '#ffffff', 2.4);
  ctx.save();
  rrect(ctx, 6, 7, w - 12, 46, 2);
  ctx.clip();
  const L = 6;
  const R = w - 6;
  const text = (t, x, y, px, fill) => {
    ctx.font = `900 ${px}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = px * 0.25;
    ctx.strokeStyle = INK;
    ctx.strokeText(t, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(t, x, y);
  };
  if (kind === 'sun') {
    const g = ctx.createLinearGradient(0, 7, 0, 53);
    g.addColorStop(0, '#ff5fa2');
    g.addColorStop(1, '#ffb347');
    ctx.fillStyle = g;
    ctx.fillRect(L, 7, R - L, 46);
    ellipse(ctx, w * 0.3, 42, 13, 13);
    ctx.fillStyle = '#ffe14d';
    ctx.fill();
    ctx.fillStyle = '#19c3d6';
    ctx.fillRect(L, 42, R - L, 11);
    text('SUNSET', w * 0.62, 20, 10, '#ffffff');
    text('DRIVE', w * 0.62, 32, 10, '#ffe14d');
  } else if (kind === 'ice') {
    ctx.fillStyle = '#8ff0e0';
    ctx.fillRect(L, 7, R - L, 46);
    poly(ctx, [w * 0.2, 30, w * 0.34, 30, w * 0.27, 50]);
    fillInk(ctx, '#e0a050', 1.2);
    ellipse(ctx, w * 0.27, 26, 8, 7);
    fillInk(ctx, '#ff8fc0', 1.2);
    ellipse(ctx, w * 0.27, 18, 6, 5.5);
    fillInk(ctx, '#fff6d6', 1.2);
    ellipse(ctx, w * 0.29, 13, 1.8, 1.8);
    ctx.fillStyle = '#ff3d3d';
    ctx.fill();
    text('ICE', w * 0.64, 20, 12, '#ff4fb0');
    text('CREAM!', w * 0.64, 36, 9.5, '#ffffff');
  } else if (kind === 'keys') {
    ctx.fillStyle = '#2ec8d8';
    ctx.fillRect(L, 7, R - L, 46);
    ellipse(ctx, w * 0.28, 32, 12, 7);
    fillInk(ctx, '#ffb347', 1.4);
    poly(ctx, [w * 0.28 - 11, 32, w * 0.28 - 19, 25, w * 0.28 - 19, 39]);
    fillInk(ctx, '#ffb347', 1.4);
    ellipse(ctx, w * 0.28 + 6, 30, 1.6, 1.6);
    ctx.fillStyle = INK;
    ctx.fill();
    text('THE', w * 0.66, 17, 8, '#ffffff');
    text('KEYS', w * 0.66, 29, 11, '#ffe14d');
    poly(ctx, [w * 0.52, 41, w * 0.74, 41, w * 0.74, 37.5, w * 0.82, 43, w * 0.74, 48.5, w * 0.74, 45, w * 0.52, 45]);
    fillInk(ctx, '#ffffff', 1.1);
  } else {
    ctx.fillStyle = '#b7e35a';
    ctx.fillRect(L, 7, R - L, 46);
    // a grinning gator head
    rrect(ctx, w * 0.1, 26, w * 0.4, 12, 5);
    fillInk(ctx, '#3f9a3a', 1.4);
    rrect(ctx, w * 0.1, 36, w * 0.38, 8, 4);
    fillInk(ctx, '#3f9a3a', 1.4);
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 6; k++) poly(ctx, [w * 0.14 + k * 4.5, 37.5, w * 0.16 + k * 4.5, 40, w * 0.18 + k * 4.5, 37.5]), ctx.fill();
    ellipse(ctx, w * 0.42, 24, 4.5, 4);
    fillInk(ctx, '#ffffff', 1.2);
    ellipse(ctx, w * 0.43, 24, 1.8, 2.2);
    ctx.fillStyle = INK;
    ctx.fill();
    text('GATOR', w * 0.72, 20, 9, '#ffffff');
    text('PARK', w * 0.72, 33, 10, '#ffe14d');
  }
  ctx.restore();
}

function tower(ctx, w, body, band, lit) {
  rrect(ctx, 6, 8, w - 12, 92, 2);
  fillInk(ctx, body, 1.8);
  ctx.fillStyle = band;
  ctx.fillRect(6, 8, w - 12, 3.5);
  // antenna
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(w / 2, 8);
  ctx.lineTo(w / 2, 0.5);
  ctx.stroke();
  ellipse(ctx, w / 2, 1.2, 1.2, 1.2);
  ctx.fillStyle = '#ff3d3d';
  ctx.fill();
  const cols = 4;
  const cw = (w - 18) / cols;
  for (let row = 0; row < 22; row++) {
    for (let c = 0; c < cols; c++) {
      const on = ((row * 7 + c * 13) % 9) < 5;
      ctx.fillStyle = on ? lit[(row + c) % lit.length] : 'rgba(0,0,0,0.25)';
      ctx.fillRect(9 + c * cw + 0.6, 15 + row * 3.8, cw - 1.6, 2.2);
    }
  }
  ctx.fillStyle = band;
  ctx.fillRect(6, 96, w - 12, 4);
}

function lifeguard(ctx, w) {
  // stilts and ramp
  ctx.strokeStyle = '#7a4a26';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (const fx of [0.3, 0.7]) {
    ctx.beginPath();
    ctx.moveTo(w * fx, 62);
    ctx.lineTo(w * fx + (fx < 0.5 ? -3 : 3), 100);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(w * 0.3, 80);
  ctx.lineTo(w * 0.7, 66);
  ctx.moveTo(w * 0.3, 66);
  ctx.lineTo(w * 0.7, 80);
  ctx.stroke();
  poly(ctx, [w * 0.62, 64, w * 0.95, 100, w * 0.86, 100, w * 0.55, 66]);
  fillInk(ctx, '#c9a06a', 1.2);
  // deck and hut
  rrect(ctx, w * 0.14, 58, w * 0.72, 6, 1.5);
  fillInk(ctx, '#ffe14d', 1.4);
  rrect(ctx, w * 0.2, 30, w * 0.6, 28, 3);
  fillInk(ctx, '#3fd2f0', 1.6);
  ctx.fillStyle = '#ff4fb0';
  ctx.fillRect(w * 0.2, 44, w * 0.6, 5);
  rrect(ctx, w * 0.3, 34, w * 0.4, 9, 2);
  fillInk(ctx, '#2a1a4a', 1.2);
  // roof
  poly(ctx, [w * 0.12, 31, w * 0.5, 16, w * 0.88, 31]);
  fillInk(ctx, '#ff8a4c', 1.6);
  // flag
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, 16);
  ctx.lineTo(w * 0.5, 2);
  ctx.stroke();
  poly(ctx, [w * 0.5, 2, w * 0.68, 5.5, w * 0.5, 9]);
  fillInk(ctx, '#ff3d3d', 1);
}

function umbrella(ctx, w) {
  ctx.strokeStyle = '#e8e0d0';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(w / 2, 30);
  ctx.lineTo(w / 2 + 2, 100);
  ctx.stroke();
  const cols = ['#ff4fb0', '#ffffff', '#ffe14d', '#ffffff', '#3fd2f0', '#ffffff'];
  const cx = w / 2;
  const cy = 34;
  const R = w * 0.46;
  for (let i = 0; i < 6; i++) {
    const a0 = Math.PI + (i / 6) * Math.PI;
    const a1 = Math.PI + ((i + 1) / 6) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 18);
    ctx.lineTo(cx + Math.cos(a0) * R, cy + 2);
    ctx.quadraticCurveTo(cx + Math.cos((a0 + a1) / 2) * R * 0.9, cy + 6, cx + Math.cos(a1) * R, cy + 2);
    ctx.closePath();
    fillInk(ctx, cols[i], 1.2);
  }
  // a towel and a ball under it
  poly(ctx, [w * 0.12, 98, w * 0.42, 92, w * 0.62, 96, w * 0.3, 100]);
  fillInk(ctx, '#ffe14d', 1);
  ellipse(ctx, w * 0.78, 94, 5, 5);
  fillInk(ctx, '#ff4b4b', 1.1);
}

function flamingo(ctx, w) {
  ctx.strokeStyle = '#e8508a';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(w * 0.5, 60);
  ctx.lineTo(w * 0.5, 100);
  ctx.moveTo(w * 0.5, 76);
  ctx.lineTo(w * 0.62, 70);
  ctx.lineTo(w * 0.52, 66);
  ctx.stroke();
  ellipse(ctx, w * 0.5, 54, w * 0.3, 10, -0.15);
  fillInk(ctx, '#ff7eb6', 1.6);
  ctx.beginPath();
  ctx.moveTo(w * 0.28, 52);
  ctx.quadraticCurveTo(w * 0.4, 58, w * 0.58, 50);
  ctx.strokeStyle = '#e8508a';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // neck and head
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(w * 0.72, 50);
  ctx.bezierCurveTo(w * 0.95, 36, w * 0.55, 26, w * 0.72, 12);
  ctx.stroke();
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = '#ff7eb6';
  ctx.stroke();
  ellipse(ctx, w * 0.74, 11, 5, 4.4);
  fillInk(ctx, '#ff7eb6', 1.3);
  poly(ctx, [w * 0.82, 9, w * 0.97, 14, w * 0.9, 19, w * 0.8, 14]);
  fillInk(ctx, '#fff6d6', 1.1);
  poly(ctx, [w * 0.9, 14.5, w * 0.97, 14, w * 0.9, 19]);
  ctx.fillStyle = INK;
  ctx.fill();
  ellipse(ctx, w * 0.75, 9.5, 1.1, 1.1);
  ctx.fill();
}

function heron(ctx, w) {
  ctx.strokeStyle = '#d9c27a';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(w * 0.45, 64);
  ctx.lineTo(w * 0.42, 100);
  ctx.moveTo(w * 0.55, 64);
  ctx.lineTo(w * 0.58, 100);
  ctx.stroke();
  ellipse(ctx, w * 0.48, 54, w * 0.3, 11, -0.4);
  fillInk(ctx, '#ffffff', 1.5);
  ctx.lineWidth = 4.2;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(w * 0.62, 46);
  ctx.bezierCurveTo(w * 0.8, 34, w * 0.5, 24, w * 0.62, 12);
  ctx.stroke();
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ellipse(ctx, w * 0.64, 11, 4, 3.4);
  fillInk(ctx, '#ffffff', 1.2);
  poly(ctx, [w * 0.7, 10, w * 0.98, 13, w * 0.7, 13.5]);
  fillInk(ctx, '#ffc23a', 1);
  ellipse(ctx, w * 0.65, 10, 0.9, 0.9);
  ctx.fillStyle = INK;
  ctx.fill();
}

function gator(ctx, w) {
  // a patch of mud
  ellipse(ctx, w / 2, 94, w * 0.48, 6);
  ctx.fillStyle = '#8a6a3a';
  ctx.fill();
  // tail, body, head
  ctx.beginPath();
  ctx.moveTo(w * 0.04, 90);
  ctx.quadraticCurveTo(w * 0.2, 70, w * 0.38, 70);
  ctx.lineTo(w * 0.38, 92);
  ctx.closePath();
  fillInk(ctx, '#3f8a3a', 1.6);
  rrect(ctx, w * 0.3, 62, w * 0.42, 30, 14);
  fillInk(ctx, '#4aa044', 1.8);
  ctx.beginPath();
  ctx.moveTo(w * 0.66, 68);
  ctx.lineTo(w * 0.97, 76);
  ctx.quadraticCurveTo(w * 0.99, 84, w * 0.95, 88);
  ctx.lineTo(w * 0.66, 90);
  ctx.closePath();
  fillInk(ctx, '#4aa044', 1.8);
  // belly line and teeth
  ctx.fillStyle = '#c8e07a';
  ctx.fillRect(w * 0.32, 86, w * 0.4, 4);
  ctx.fillStyle = '#ffffff';
  for (let k = 0; k < 6; k++) poly(ctx, [w * (0.72 + k * 0.035), 84, w * (0.735 + k * 0.035), 87.5, w * (0.75 + k * 0.035), 84]), ctx.fill();
  // bumps on the back
  for (let k = 0; k < 6; k++) {
    ellipse(ctx, w * (0.34 + k * 0.065), 63, 3.2, 2.6);
    fillInk(ctx, '#2f7a30', 1);
  }
  // eye
  ellipse(ctx, w * 0.75, 66, 5, 4.4);
  fillInk(ctx, '#ffe14d', 1.2);
  ellipse(ctx, w * 0.76, 66, 1.4, 3);
  ctx.fillStyle = INK;
  ctx.fill();
  // legs
  for (const fx of [0.36, 0.62]) {
    rrect(ctx, w * fx, 86, 7, 10, 3);
    fillInk(ctx, '#3f8a3a', 1.2);
  }
}

function airboat(ctx, w) {
  ellipse(ctx, w / 2, 96, w * 0.46, 4);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fill();
  poly(ctx, [w * 0.06, 84, w * 0.94, 84, w * 0.86, 96, w * 0.12, 96]);
  fillInk(ctx, '#e8e8f0', 1.6);
  ctx.fillStyle = '#ff4b4b';
  ctx.fillRect(w * 0.1, 88, w * 0.8, 2.5);
  // fan cage
  ellipse(ctx, w * 0.3, 54, w * 0.22, 26);
  fillInk(ctx, 'rgba(200,210,230,0.35)', 1.8);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.8;
  for (let k = -3; k <= 3; k++) {
    ctx.beginPath();
    ctx.moveTo(w * 0.3 + k * w * 0.055, 30);
    ctx.lineTo(w * 0.3 + k * w * 0.055, 78);
    ctx.stroke();
  }
  ctx.fillStyle = '#5a5a6a';
  ctx.fillRect(w * 0.29, 54, w * 0.03, 30);
  // seat and driver
  ctx.fillRect(w * 0.6, 62, w * 0.04, 22);
  rrect(ctx, w * 0.54, 58, w * 0.2, 5, 1.5);
  fillInk(ctx, '#3a7bff', 1.1);
  rrect(ctx, w * 0.58, 40, w * 0.12, 18, 4);
  fillInk(ctx, '#ffe14d', 1.2);
  ellipse(ctx, w * 0.64, 34, 5, 5);
  fillInk(ctx, '#f0b48a', 1.1);
  poly(ctx, [w * 0.56, 32, w * 0.72, 32, w * 0.64, 26]);
  fillInk(ctx, '#3fd2f0', 1);
}

function sailboat(ctx, w) {
  ellipse(ctx, w / 2, 97, w * 0.48, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();
  poly(ctx, [w * 0.08, 84, w * 0.92, 84, w * 0.8, 95, w * 0.2, 95]);
  fillInk(ctx, '#ffffff', 1.6);
  ctx.fillStyle = '#3a7bff';
  ctx.fillRect(w * 0.14, 87, w * 0.72, 2.6);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, 84);
  ctx.lineTo(w * 0.5, 4);
  ctx.stroke();
  poly(ctx, [w * 0.53, 6, w * 0.53, 80, w * 0.92, 80]);
  fillInk(ctx, '#fffaf0', 1.4);
  poly(ctx, [w * 0.47, 14, w * 0.47, 80, w * 0.12, 80]);
  fillInk(ctx, '#ffe9f2', 1.4);
  ctx.fillStyle = '#ff4fb0';
  poly(ctx, [w * 0.53, 54, w * 0.53, 62, w * 0.75, 62]);
  ctx.fill();
  poly(ctx, [w * 0.47, 56, w * 0.47, 64, w * 0.3, 64]);
  ctx.fill();
}

function island(ctx, w) {
  ctx.beginPath();
  ctx.moveTo(0, 100);
  ctx.quadraticCurveTo(w * 0.5, 62, w, 100);
  ctx.closePath();
  fillInk(ctx, '#f6d892', 1.6);
  ctx.beginPath();
  ctx.moveTo(w * 0.15, 100);
  ctx.quadraticCurveTo(w * 0.5, 74, w * 0.85, 100);
  ctx.closePath();
  ctx.fillStyle = '#5ac46a';
  ctx.fill();
  for (const [fx, s] of [[0.38, 1], [0.58, 0.85]]) {
    ctx.save();
    ctx.translate(w * fx - 25 * s, 82 - 100 * s * 0.6);
    ctx.scale(s * 0.6, s * 0.6);
    palm(ctx, 80, { bend: fx < 0.5 ? -0.12 : 0.14 });
    ctx.restore();
  }
}

function pelicanPost(ctx, w) {
  rrect(ctx, w * 0.32, 46, w * 0.36, 54, 2);
  fillInk(ctx, '#8a5a3c', 1.6);
  ctx.strokeStyle = 'rgba(22,11,51,0.35)';
  ctx.lineWidth = 1;
  for (const y of [60, 74, 88]) {
    ctx.beginPath();
    ctx.moveTo(w * 0.32, y);
    ctx.lineTo(w * 0.68, y);
    ctx.stroke();
  }
  ellipse(ctx, w * 0.5, 46, w * 0.18, 2.4);
  fillInk(ctx, '#a8744a', 1.2);
  // pelican
  ellipse(ctx, w * 0.46, 36, w * 0.3, 9, 0.15);
  fillInk(ctx, '#c9c0b0', 1.5);
  ellipse(ctx, w * 0.62, 22, w * 0.14, 6);
  fillInk(ctx, '#f4f0e6', 1.3);
  poly(ctx, [w * 0.7, 20, w * 1.0, 26, w * 0.72, 28]);
  fillInk(ctx, '#ffb347', 1.2);
  ellipse(ctx, w * 0.66, 20, 1.2, 1.2);
  ctx.fillStyle = INK;
  ctx.fill();
}

function lighthouse(ctx, w) {
  poly(ctx, [w * 0.28, 100, w * 0.72, 100, w * 0.62, 18, w * 0.38, 18]);
  fillInk(ctx, '#ffffff', 1.8);
  ctx.save();
  poly(ctx, [w * 0.28, 100, w * 0.72, 100, w * 0.62, 18, w * 0.38, 18]);
  ctx.clip();
  ctx.fillStyle = '#ff4b4b';
  for (const y of [28, 52, 76]) ctx.fillRect(0, y, w, 11);
  ctx.restore();
  rrect(ctx, w * 0.34, 8, w * 0.32, 11, 2);
  fillInk(ctx, '#ffe14d', 1.4);
  poly(ctx, [w * 0.3, 9, w * 0.5, 0.5, w * 0.7, 9]);
  fillInk(ctx, '#2a1a4a', 1.4);
}

function lamp(ctx, w, night) {
  // stands on the right of the road, arm reaching left over it
  const px = w * 0.86;
  ctx.fillStyle = '#7a8096';
  ctx.fillRect(px - 1.6, 8, 3.2, 92);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.strokeRect(px - 1.6, 8, 3.2, 92);
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(px, 10);
  ctx.quadraticCurveTo(px, 3, px - 10, 3);
  ctx.lineTo(w * 0.2, 3);
  ctx.stroke();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = '#7a8096';
  ctx.stroke();
  rrect(ctx, w * 0.1, 2, w * 0.2, 4, 2);
  fillInk(ctx, '#5a6078', 1);
  if (night) {
    ctx.save();
    ctx.shadowColor = '#ffe9a0';
    ctx.shadowBlur = 8;
    ellipse(ctx, w * 0.2, 6.5, w * 0.08, 1.8);
    ctx.fillStyle = '#fff6c8';
    ctx.fill();
    ctx.restore();
  } else {
    ellipse(ctx, w * 0.2, 6.5, w * 0.07, 1.4);
    ctx.fillStyle = '#fff6d6';
    ctx.fill();
  }
}

function warningSign(ctx, w) {
  ctx.fillStyle = '#9aa0b0';
  ctx.fillRect(w / 2 - 1.5, 40, 3, 60);
  poly(ctx, [w / 2, 4, w - 3, 24, w / 2, 44, 3, 24]);
  fillInk(ctx, '#ffcc33', 2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(w / 2 - 6, 34);
  ctx.bezierCurveTo(w / 2 - 6, 24, w / 2 + 6, 24, w / 2 + 6, 14);
  ctx.stroke();
  // little rain drops
  ctx.fillStyle = '#3a7bff';
  for (const [dx, dy] of [[-7, 14], [7, 30]]) {
    ellipse(ctx, w / 2 + dx, dy, 1.4, 2);
    ctx.fill();
  }
}

// The start gantry: the lamps are drawn on top while counting down (see draw.js).
function gantry(ctx, w, finish) {
  const postL = w * 0.03;
  const postR = w * 0.97;
  for (const x of [postL, postR]) {
    rrect(ctx, x - 1.6, 18, 3.2, 82, 1);
    fillInk(ctx, '#e8e8f0', 1.2);
  }
  if (finish) {
    rrect(ctx, postL, 10, postR - postL, 22, 2);
    fillInk(ctx, '#ffffff', 2);
    ctx.save();
    rrect(ctx, postL, 10, postR - postL, 22, 2);
    ctx.clip();
    const sq = 5.5;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c * sq < postR - postL; c++) {
        if ((r + c) % 2) continue;
        ctx.fillStyle = INK;
        ctx.fillRect(postL + c * sq, 10 + r * sq, sq, sq);
      }
    }
    ctx.restore();
    rrect(ctx, w * 0.32, 13, w * 0.36, 16, 3);
    fillInk(ctx, '#ffe14d', 1.6);
    ctx.font = '900 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    ctx.fillText('FINISH', w / 2, 21.5);
  } else {
    rrect(ctx, postL, 14, postR - postL, 7, 2);
    fillInk(ctx, '#ff4fb0', 1.6);
    rrect(ctx, w / 2 - 22, 2, 44, 18, 4);
    fillInk(ctx, '#2a2440', 1.8);
    for (let k = 0; k < 3; k++) {
      ellipse(ctx, w / 2 - 13 + k * 13, 11, 5, 5);
      fillInk(ctx, '#4a4460', 1.2);
    }
  }
}

// ---------- traffic, from behind ----------

function car(ctx, w, body, roof) {
  ellipse(ctx, w / 2, 97, w * 0.47, 3.5);
  ctx.fillStyle = 'rgba(22,11,51,0.3)';
  ctx.fill();
  for (const x of [w * 0.07, w * 0.79]) {
    rrect(ctx, x, 78, w * 0.14, 20, 3);
    fillInk(ctx, '#2a2433', 1.4);
  }
  // cabin
  poly(ctx, [w * 0.2, 42, w * 0.8, 42, w * 0.72, 10, w * 0.28, 10]);
  fillInk(ctx, roof, 1.8);
  poly(ctx, [w * 0.25, 40, w * 0.75, 40, w * 0.69, 15, w * 0.31, 15]);
  fillInk(ctx, '#7fd8ef', 1.2);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  poly(ctx, [w * 0.33, 38, w * 0.42, 38, w * 0.5, 17, w * 0.42, 17]);
  ctx.fill();
  // body
  rrect(ctx, w * 0.04, 40, w * 0.92, 46, 10);
  fillInk(ctx, body, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(w * 0.1, 44, w * 0.8, 3);
  for (const x of [w * 0.08, w * 0.76]) {
    rrect(ctx, x, 52, w * 0.16, 10, 3);
    fillInk(ctx, '#ff3d4a', 1.2);
    ctx.fillStyle = '#ffd0d0';
    ctx.fillRect(x + 2, 54, w * 0.05, 3);
  }
  rrect(ctx, w * 0.36, 60, w * 0.28, 11, 2);
  fillInk(ctx, '#fff6d6', 1.2);
  ctx.fillStyle = INK;
  for (let k = 0; k < 4; k++) ctx.fillRect(w * 0.4 + k * w * 0.055, 63, w * 0.03, 5);
  rrect(ctx, w * 0.06, 76, w * 0.88, 8, 3);
  fillInk(ctx, '#d8d8e8', 1.4);
}

function iceCream(ctx, w) {
  ellipse(ctx, w / 2, 97, w * 0.47, 3.5);
  ctx.fillStyle = 'rgba(22,11,51,0.3)';
  ctx.fill();
  for (const x of [w * 0.07, w * 0.79]) {
    rrect(ctx, x, 82, w * 0.14, 16, 3);
    fillInk(ctx, '#2a2433', 1.4);
  }
  rrect(ctx, w * 0.05, 24, w * 0.9, 64, 6);
  fillInk(ctx, '#fff6f0', 2);
  ctx.fillStyle = '#ff8fc0';
  ctx.fillRect(w * 0.05, 66, w * 0.9, 7);
  ctx.fillStyle = '#7fd8ef';
  ctx.fillRect(w * 0.05, 73, w * 0.9, 4);
  // rear doors
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(w / 2, 30);
  ctx.lineTo(w / 2, 84);
  ctx.stroke();
  // a cone painted on the doors
  poly(ctx, [w * 0.4, 46, w * 0.6, 46, w * 0.5, 62]);
  fillInk(ctx, '#e0a050', 1.1);
  ellipse(ctx, w * 0.5, 42, 8, 6);
  fillInk(ctx, '#ff8fc0', 1.1);
  for (const x of [w * 0.08, w * 0.8]) {
    rrect(ctx, x, 78, w * 0.12, 6, 2);
    fillInk(ctx, '#ff3d4a', 1);
  }
  // giant cone on the roof
  poly(ctx, [w * 0.4, 12, w * 0.6, 12, w * 0.5, 25]);
  fillInk(ctx, '#e0a050', 1.4);
  ellipse(ctx, w * 0.5, 9, 10, 7);
  fillInk(ctx, '#fff6d6', 1.4);
  ellipse(ctx, w * 0.5, 3.5, 3, 3);
  fillInk(ctx, '#ff3d3d', 1.1);
}

function bus(ctx, w) {
  ellipse(ctx, w / 2, 97.5, w * 0.48, 3);
  ctx.fillStyle = 'rgba(22,11,51,0.3)';
  ctx.fill();
  for (const x of [w * 0.06, w * 0.8]) {
    rrect(ctx, x, 86, w * 0.14, 12, 3);
    fillInk(ctx, '#2a2433', 1.4);
  }
  rrect(ctx, w * 0.03, 4, w * 0.94, 86, 7);
  fillInk(ctx, '#ffb627', 2.2);
  rrect(ctx, w * 0.1, 10, w * 0.8, 30, 4);
  fillInk(ctx, '#7fd8ef', 1.4);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  poly(ctx, [w * 0.18, 38, w * 0.3, 38, w * 0.42, 12, w * 0.3, 12]);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(w * 0.03, 48, w * 0.94, 6);
  ctx.fillStyle = '#ff4fb0';
  ctx.fillRect(w * 0.03, 54, w * 0.94, 4);
  ctx.font = '900 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  ctx.fillText('BUS', w / 2, 67);
  for (const x of [w * 0.07, w * 0.8]) {
    rrect(ctx, x, 72, w * 0.13, 8, 2);
    fillInk(ctx, '#ff3d4a', 1.1);
  }
  rrect(ctx, w * 0.05, 82, w * 0.9, 6, 2);
  fillInk(ctx, '#9a9ab0', 1.2);
}

function scooter(ctx, w) {
  ellipse(ctx, w / 2, 97, w * 0.4, 3);
  ctx.fillStyle = 'rgba(22,11,51,0.3)';
  ctx.fill();
  rrect(ctx, w * 0.4, 78, w * 0.2, 20, 4);
  fillInk(ctx, '#2a2433', 1.3);
  rrect(ctx, w * 0.22, 62, w * 0.56, 20, 7);
  fillInk(ctx, '#3fd2f0', 1.6);
  rrect(ctx, w * 0.4, 68, w * 0.2, 6, 2);
  fillInk(ctx, '#ff3d4a', 1);
  // rider
  rrect(ctx, w * 0.24, 30, w * 0.52, 36, 10);
  fillInk(ctx, '#ff8a4c', 1.6);
  for (const s of [-1, 1]) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(w * (0.5 + s * 0.22), 38);
    ctx.lineTo(w * (0.5 + s * 0.4), 52);
    ctx.stroke();
    ctx.strokeStyle = '#ff8a4c';
    ctx.lineWidth = 2.6;
    ctx.stroke();
  }
  ellipse(ctx, w / 2, 20, w * 0.2, 13);
  fillInk(ctx, '#ffe14d', 1.6);
  ctx.fillStyle = '#ff4fb0';
  ctx.fillRect(w * 0.46, 7.5, w * 0.08, 25);
}

// ---------- registry ----------

const hotelArgs = {
  hotelPink: ['#ffb3c8', '#ffffff', '#ff4fb0'],
  hotelMint: ['#a8f0d8', '#ffffff', '#19a3a0'],
  hotelLemon: ['#fff0a0', '#ffffff', '#ff8a4c'],
  hotelLilac: ['#d8c0ff', '#ffffff', '#7a4ad8'],
};

export const SPRITES = {
  palm: { h: 3000, aspect: 0.9, res: 300, paint: (c, w) => palm(c, w) },
  palmNight: { h: 3000, aspect: 0.9, res: 300, paint: (c, w) => palm(c, w, { trunk: '#3a2a4a', trunkDark: '#2a1e3a', leaf: '#1e4a4a', leafDark: '#123232', nut: '#2a1e3a', bend: -0.1 }) },
  palmBent: { h: 2800, aspect: 1.1, res: 300, paint: (c, w) => palm(c, w, { leaf: '#2f8a4a', leafDark: '#1d6033', bend: 0.3 }) },
  shrub: { h: 700, aspect: 1.4, res: 120, paint: shrub },
  mangrove: { h: 1500, aspect: 1.3, res: 180, paint: mangrove },
  sawgrass: { h: 800, aspect: 1.2, res: 140, paint: sawgrass },
  hotelPink: { edge: true, h: 5600, aspect: 0.95, res: 380, paint: (c, w) => hotel(c, w, ...hotelArgs.hotelPink) },
  hotelMint: { edge: true, h: 5200, aspect: 1.0, res: 380, paint: (c, w) => hotel(c, w, ...hotelArgs.hotelMint) },
  hotelLemon: { edge: true, h: 5000, aspect: 1.05, res: 380, paint: (c, w) => hotel(c, w, ...hotelArgs.hotelLemon) },
  hotelLilac: { edge: true, h: 5800, aspect: 0.9, res: 380, paint: (c, w) => hotel(c, w, ...hotelArgs.hotelLilac) },
  neonFlamingo: { edge: true, h: 1700, aspect: 0.8, res: 200, paint: (c, w) => neon(c, w, 'flamingo', false) },
  neonPalm: { edge: true, h: 1700, aspect: 0.8, res: 200, paint: (c, w) => neon(c, w, 'palm', false) },
  neonDiner: { edge: true, h: 1700, aspect: 0.8, res: 200, paint: (c, w) => neon(c, w, 'diner', false) },
  billboardSun: { edge: true, h: 2000, aspect: 1.5, res: 220, paint: (c, w) => billboard(c, w, 'sun') },
  billboardIce: { edge: true, h: 2000, aspect: 1.5, res: 220, paint: (c, w) => billboard(c, w, 'ice') },
  billboardKeys: { edge: true, h: 2000, aspect: 1.5, res: 220, paint: (c, w) => billboard(c, w, 'keys') },
  billboardGator: { edge: true, h: 2000, aspect: 1.5, res: 220, paint: (c, w) => billboard(c, w, 'gator') },
  tower: { edge: true, h: 7000, aspect: 0.42, res: 420, paint: (c, w) => tower(c, w, '#2a2a5a', '#ff3df0', ['#ffe9a0', '#9af0ff', '#ffe9a0']) },
  towerBlue: { edge: true, h: 6000, aspect: 0.48, res: 420, paint: (c, w) => tower(c, w, '#1e3a6a', '#30e0ff', ['#ffe9a0', '#ffd0f0']) },
  lifeguard: { edge: true, h: 1700, aspect: 1, res: 200, paint: lifeguard },
  umbrella: { h: 1000, aspect: 1.1, res: 140, paint: umbrella },
  flamingo: { h: 750, aspect: 0.6, res: 140, paint: flamingo },
  heron: { h: 800, aspect: 0.6, res: 140, paint: heron },
  gator: { h: 420, aspect: 2.6, res: 100, paint: gator },
  airboat: { h: 1100, aspect: 1.2, res: 160, paint: airboat },
  sailboat: { h: 2200, aspect: 0.75, res: 220, paint: sailboat },
  island: { edge: true, h: 1600, aspect: 2.4, res: 160, paint: island },
  pelicanPost: { h: 1200, aspect: 0.55, res: 160, paint: pelicanPost },
  lighthouse: { edge: true, h: 5000, aspect: 0.32, res: 300, paint: lighthouse },
  lamp: { h: 2600, aspect: 0.5, res: 260, paint: (c, w) => lamp(c, w, false) },
  lampNight: { h: 2600, aspect: 0.5, res: 260, paint: (c, w) => lamp(c, w, true) },
  sign: { h: 1100, aspect: 0.5, res: 160, paint: warningSign },
  startGantry: { h: 1900, aspect: 2900 / 1900, res: 300, paint: (c, w) => gantry(c, w, false) },
  finishBanner: { h: 1900, aspect: 2900 / 1900, res: 300, paint: (c, w) => gantry(c, w, true) },
  // traffic (h is world height; width comes from the aspect)
  carPink: { h: 340, aspect: 1.3, res: 140, paint: (c, w) => car(c, w, '#ff9ec4', '#ffc4dc') },
  carMint: { h: 340, aspect: 1.3, res: 140, paint: (c, w) => car(c, w, '#8ff0c8', '#c0ffe4') },
  carLemon: { h: 340, aspect: 1.3, res: 140, paint: (c, w) => car(c, w, '#ffe57a', '#fff2b8') },
  carSky: { h: 340, aspect: 1.3, res: 140, paint: (c, w) => car(c, w, '#9cc8ff', '#cfe4ff') },
  iceCream: { h: 560, aspect: 0.9, res: 180, paint: iceCream },
  bus: { h: 780, aspect: 0.72, res: 200, paint: bus },
  scooter: { h: 440, aspect: 0.5, res: 140, paint: scooter },
};

// Paints one sprite into a fresh canvas `scale` times its base resolution.
export function paintSprite(kind, scale = 1) {
  const def = SPRITES[kind];
  const H = Math.max(8, Math.round(def.res * scale));
  const W = Math.max(4, Math.round(H * def.aspect));
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.scale(H / 100, H / 100);
  def.paint(ctx, 100 * def.aspect);
  return cv;
}

// A spinning coin, `frames` pictures from face-on to edge-on and back.
export function paintCoins(px, frames = 8) {
  const out = [];
  for (let i = 0; i < frames; i++) {
    const k = Math.max(0.12, Math.abs(Math.cos((i / frames) * Math.PI)));
    const cv = document.createElement('canvas');
    cv.width = px;
    cv.height = px;
    const ctx = cv.getContext('2d');
    const r = px * 0.44;
    ctx.translate(px / 2, px / 2);
    ctx.scale(k, 1);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fillStyle = '#ffb627';
    ctx.fill();
    ctx.lineWidth = px * 0.06;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.74, 0, TAU);
    ctx.fillStyle = '#ffe14d';
    ctx.fill();
    ctx.beginPath();
    for (let j = 0; j < 10; j++) {
      const a = -Math.PI / 2 + (j * Math.PI) / 5;
      const rr = j % 2 ? r * 0.24 : r * 0.52;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = '#ff9a1f';
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.4, r * 0.14, r * 0.26, 0.6, 0, TAU);
    ctx.fill();
    out.push(cv);
  }
  return out;
}
