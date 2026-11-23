// Wynwood Walls: a brick wall covered in a giant, happy mural (a grinning sun, bubble
// letters, a flamingo, waves and drips) with a ladder and paint cans in front.
import { begin, end, sky, cloud, rect, poly, circle, ellipse, rr, fs, lin, line, star, rng, INK, TAU } from './kit.js';

const TOP = 120;
const BOTTOM = 640;

function bricks(ctx) {
  ctx.fillStyle = '#c8644a';
  ctx.fillRect(0, TOP, 600, BOTTOM - TOP);
  ctx.strokeStyle = 'rgba(80,20,10,0.35)';
  ctx.lineWidth = 2;
  for (let y = TOP; y < BOTTOM; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(600, y);
    ctx.stroke();
    for (let x = ((y - TOP) / 20) % 2 ? 0 : 20; x < 600; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 20);
      ctx.stroke();
    }
  }
}

function sunFace(ctx, x, y, R) {
  const rays = 16;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * TAU;
    poly(ctx, [
      [x + Math.cos(a - 0.15) * R * 0.95, y + Math.sin(a - 0.15) * R * 0.95],
      [x + Math.cos(a) * R * 1.55, y + Math.sin(a) * R * 1.55],
      [x + Math.cos(a + 0.15) * R * 0.95, y + Math.sin(a + 0.15) * R * 0.95],
    ], i % 2 ? '#ff8a2a' : '#ff3d9a', 3);
  }
  circle(ctx, x, y, R, '#ffe14d', 4);
  circle(ctx, x, y, R * 0.8, 'rgba(255,255,255,0.25)', 0);
  // sunglasses and a big grin
  rr(ctx, x - R * 0.7, y - R * 0.3, R * 0.62, R * 0.38, R * 0.15);
  fs(ctx, '#2b1055', 3);
  rr(ctx, x + R * 0.08, y - R * 0.3, R * 0.62, R * 0.38, R * 0.15);
  fs(ctx, '#2b1055', 3);
  line(ctx, x - R * 0.1, y - R * 0.18, x + R * 0.1, y - R * 0.18, INK, 4);
  circle(ctx, x - R * 0.52, y - R * 0.2, R * 0.07, '#2ff3ff', 0);
  circle(ctx, x + R * 0.26, y - R * 0.2, R * 0.07, '#2ff3ff', 0);
  ctx.beginPath();
  ctx.arc(x, y + R * 0.2, R * 0.42, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.closePath();
  fs(ctx, '#ffffff', 3);
  circle(ctx, x - R * 0.62, y + R * 0.28, R * 0.12, 'rgba(255,61,154,0.5)', 0);
  circle(ctx, x + R * 0.62, y + R * 0.28, R * 0.12, 'rgba(255,61,154,0.5)', 0);
}

function bubbleLetters(ctx, text, x, y, px, colours) {
  ctx.font = `900 ${px}px ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const step = px * 0.72;
  const x0 = x - ((text.length - 1) * step) / 2;
  text.split('').forEach((ch, i) => {
    const cx = x0 + i * step;
    const cy = y + (i % 2 ? -8 : 8);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((i % 2 ? 1 : -1) * 0.08);
    ctx.lineWidth = px * 0.3;
    ctx.strokeStyle = INK;
    ctx.strokeText(ch, 6, 8);
    ctx.strokeText(ch, 0, 0);
    ctx.lineWidth = px * 0.12;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(ch, 0, 0);
    ctx.fillStyle = colours[i % colours.length];
    ctx.fillText(ch, 0, 0);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(-px * 0.12, -px * 0.2, px * 0.07, px * 0.12, 0.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  });
}

function flamingo(ctx, x, y) {
  line(ctx, x - 4, y + 40, x - 4, y + 150, INK, 9);
  line(ctx, x - 4, y + 40, x - 4, y + 150, '#ff7aa8', 5);
  ctx.beginPath();
  ctx.moveTo(x - 4, y + 90);
  ctx.lineTo(x + 26, y + 70);
  ctx.lineTo(x + 6, y + 60);
  ctx.lineWidth = 8;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ff7aa8';
  ctx.stroke();
  ellipse(ctx, x, y + 10, 54, 36, '#ff7aa8', 4);
  ellipse(ctx, x + 10, y + 4, 34, 20, '#ff4f8b', 3, INK, 0.3);
  ctx.beginPath();
  ctx.moveTo(x - 40, y);
  ctx.bezierCurveTo(x - 80, y - 40, x - 20, y - 80, x - 50, y - 120);
  ctx.lineWidth = 20;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 13;
  ctx.strokeStyle = '#ff7aa8';
  ctx.stroke();
  circle(ctx, x - 50, y - 126, 18, '#ff7aa8', 4);
  poly(ctx, [[x - 66, y - 132], [x - 96, y - 116], [x - 92, y - 104], [x - 64, y - 118]], '#ffffff', 3);
  poly(ctx, [[x - 96, y - 116], [x - 92, y - 104], [x - 84, y - 110]], INK, 2);
  circle(ctx, x - 48, y - 130, 4, INK, 0);
}

function drips(ctx, x0, x1, y, colour, r) {
  ctx.fillStyle = colour;
  for (let x = x0; x < x1; x += 18 + r() * 20) {
    const len = 10 + r() * 34;
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 2);
    ctx.lineTo(x - 5, y + len);
    ctx.arc(x, y + len, 5, Math.PI, 0, true);
    ctx.lineTo(x + 5, y - 2);
    ctx.fill();
  }
}

function paintCan(ctx, x, y, colour, lid = true) {
  rect(ctx, x - 24, y - 40, 48, 40, '#c9d0de', 3);
  rect(ctx, x - 24, y - 32, 48, 18, colour, 0);
  ctx.beginPath();
  ctx.ellipse(x, y - 40, 24, 7, 0, 0, TAU);
  fs(ctx, lid ? '#9aa3b5' : colour, 2.5);
  ctx.beginPath();
  ctx.arc(x, y - 40, 22, Math.PI, 0);
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

export default {
  id: 'mural',
  place: 'Wynwood Walls',
  draw(ctx, w, h) {
    const r = rng(88);
    begin(ctx, w, h);
    sky(ctx, [[0, '#4aa3ff'], [1, '#a8e0ff']], 0, TOP);
    cloud(ctx, 110, 70, 34);
    cloud(ctx, 430, 60, 40);
    bricks(ctx);
    // painted background panels
    ctx.save();
    ctx.beginPath();
    ctx.rect(16, TOP + 16, 568, BOTTOM - TOP - 60);
    ctx.clip();
    ctx.fillStyle = lin(ctx, 0, TOP, 0, BOTTOM, [[0, '#7a1fa2'], [0.5, '#ff3d9a'], [1, '#ff8a4c']]);
    ctx.fillRect(0, 0, 600, 800);
    // rays from behind the sun
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.12)' : 'rgba(255,225,77,0.18)';
      ctx.beginPath();
      ctx.moveTo(150, 240);
      ctx.lineTo(150 + Math.cos(a) * 700, 240 + Math.sin(a) * 700);
      ctx.lineTo(150 + Math.cos(a + 0.26) * 700, 240 + Math.sin(a + 0.26) * 700);
      ctx.fill();
    }
    // polka dots and triangles
    for (let i = 0; i < 26; i++) circle(ctx, 300 + r() * 300, TOP + 20 + r() * 220, 5 + r() * 7, ['#ffe14d', '#2ff3ff', '#ffffff'][i % 3], 2);
    for (let i = 0; i < 6; i++) {
      const tx = 30 + i * 100;
      poly(ctx, [[tx, 520], [tx + 30, 480], [tx + 60, 520]], ['#2ff3ff', '#ffe14d', '#7cff6b'][i % 3], 3);
    }
    // waves along the bottom of the mural
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(0, 600);
      for (let x = 0; x <= 600; x += 50) ctx.quadraticCurveTo(x + 25, 520 + k * 22 - 26, x + 50, 520 + k * 22);
      ctx.lineTo(600, 600);
      ctx.closePath();
      fs(ctx, ['#2f7fd6', '#19c3d6', '#9ff7f2'][k], 3);
    }
    ctx.restore();
    ctx.beginPath();
    ctx.rect(16, TOP + 16, 568, BOTTOM - TOP - 60);
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.stroke();
    drips(ctx, 24, 580, BOTTOM - 44, '#9ff7f2', r);
    sunFace(ctx, 150, 240, 72);
    flamingo(ctx, 470, 300);
    bubbleLetters(ctx, 'MIAMI', 280, 430, 96, ['#ffe14d', '#2ff3ff', '#7cff6b', '#ff8a4c', '#ffffff']);
    star(ctx, 545, 170, 22, '#ffe14d', 5, 0.45, 3);
    star(ctx, 330, 175, 15, '#2ff3ff', 5, 0.45, 3);
    // a heart
    ctx.beginPath();
    ctx.moveTo(60, 400);
    ctx.bezierCurveTo(20, 370, 40, 340, 60, 360);
    ctx.bezierCurveTo(80, 340, 100, 370, 60, 400);
    fs(ctx, '#ff3d9a', 3);
    // sidewalk
    rect(ctx, -5, BOTTOM, 610, 165, lin(ctx, 0, BOTTOM, 0, 800, [[0, '#d6d0c4'], [1, '#b8b0a2']]), 3);
    for (let x = 0; x < 600; x += 75) line(ctx, x, BOTTOM, x - 30, 800, 'rgba(22,11,51,0.25)', 2);
    line(ctx, 0, 700, 600, 700, 'rgba(22,11,51,0.25)', 2);
    // paint splats on the ground
    for (const [x, y, c] of [[120, 760, '#2ff3ff'], [330, 720, '#ffe14d'], [520, 780, '#ff3d9a']]) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.ellipse(x, y, 36, 10, 0, 0, TAU);
      ctx.fill();
      for (let k = 0; k < 5; k++) circle(ctx, x + (r() - 0.5) * 100, y + (r() - 0.5) * 24, 3 + r() * 4, c, 0);
    }
    // ladder leaning on the wall
    ctx.lineWidth = 9;
    ctx.strokeStyle = INK;
    for (const [a, b] of [[[492, 785], [520, 400]], [[552, 785], [574, 400]]]) {
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...b);
      ctx.stroke();
    }
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ffd23a';
    for (const [a, b] of [[[492, 785], [520, 400]], [[552, 785], [574, 400]]]) {
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...b);
      ctx.stroke();
    }
    for (let k = 1; k < 9; k++) {
      const t = k / 9;
      line(ctx, 492 + 28 * t, 785 - 385 * t, 552 + 22 * t, 785 - 385 * t, INK, 7);
      line(ctx, 492 + 28 * t, 785 - 385 * t, 552 + 22 * t, 785 - 385 * t, '#ffd23a', 3);
    }
    paintCan(ctx, 200, 760, '#ff3d9a');
    paintCan(ctx, 258, 780, '#2ff3ff', false);
    // spray cans
    for (const [x, c] of [[90, '#7cff6b'], [120, '#ffe14d']]) {
      rr(ctx, x - 11, 700, 22, 52, 8);
      fs(ctx, c, 3);
      rect(ctx, x - 5, 692, 10, 9, '#ffffff', 2);
    }
    // brush with wet paint
    line(ctx, 370, 760, 450, 730, '#8a5a3c', 8);
    poly(ctx, [[360, 752], [380, 746], [386, 768], [366, 774]], '#ffe14d', 2.5);
    end(ctx);
  },
};
