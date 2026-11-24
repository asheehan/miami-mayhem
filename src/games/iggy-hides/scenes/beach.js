// South Beach on a busy Saturday: swimmers, floats and a jet ski in the sea, a rainbow
// lifeguard hut, umbrellas and towels packed across the sand, a sandcastle crew, beach
// volleyball, an ice cream cart, and the boardwalk along the bottom.
import { TAU, INK, rng, pick, lin, circle, ellipse, poly, rect, rrect, line, curve, fs, sky, sun, cloud, palm, water, speckle, label, shadow, limb, bush } from '../art/kit.js';
import { umbrella, towel, lounger, cooler, sandcastle, surfboard, bench, bin, crocFloat, ringFloat, flamingoFloat, wavesFoam } from '../art/scenery.js';
import { person, personAt, randomPerson, TOPS } from '../art/people.js';
import { dog, gull, pelican, parrot } from '../art/animals.js';
import { drawProp } from '../art/props.js';
import { scatter, keepOutOf, depth } from '../art/crowd.js';

const W = 1800;
const H = 1300;
const HORIZON = 250;
const SHORE = 610;
const WALK = 1190; // boardwalk top

const seaFill = (ctx) => lin(ctx, 0, HORIZON, 0, SHORE, [[0, '#1f9fd8'], [0.55, '#2fc6e2'], [1, '#6fe6dc']]);

// Covers a floating thing below the waterline at y with sea, plus a ripple.
function seaCover(x, y, w = 46) {
  return (ctx, t) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - w, y + 2);
    for (let k = -w; k <= w; k += 8) ctx.lineTo(x + k, y + Math.sin(k / 9 + t * 3) * 1.5);
    ctx.lineTo(x + w, y + 60);
    ctx.lineTo(x - w, y + 60);
    ctx.closePath();
    ctx.fillStyle = seaFill(ctx);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, w * 0.8, 5, 0, 0, Math.PI);
    ctx.stroke();
  };
}

const sp = (x, y, o = {}) => ({ x, y, ...o });

// --- set pieces -------------------------------------------------------------------------------

function lifeguardHut(ctx, x, y) {
  // legs from the platform (y - 100) down to the sand at y
  shadow(ctx, x + 10, y + 4, 90, 14, 0.2);
  for (const lx of [-60, -20, 20, 60]) rect(ctx, x + lx - 5, y - 100, 10, 100, '#e8e0d0', 2.5);
  line(ctx, x - 60, y - 60, x + 60, y - 30, '#e8e0d0', 6);
  // ramp
  poly(ctx, [[x + 70, y - 100], [x + 90, y - 100], [x + 190, y], [x + 160, y]], '#f2e6c8', 2.5);
  for (let k = 0; k < 6; k++) line(ctx, x + 92 + k * 16, y - 86 + k * 16, x + 80 + k * 16, y - 86 + k * 16, 'rgba(22,11,51,0.35)', 2);
  rect(ctx, x - 90, y - 112, 180, 14, '#ffffff', 2.5);
  // hut in rainbow stripes
  const cols = ['#ff3d5a', '#ff8a2a', '#ffd23a', '#3fae4a', '#2fb5e8', '#a64dff'];
  ctx.save();
  rr2(ctx, x - 70, y - 210, 140, 98);
  ctx.clip();
  cols.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(x - 70, y - 210 + i * 17, 140, 17);
  });
  ctx.restore();
  rr2(ctx, x - 70, y - 210, 140, 98);
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // window
  rect(ctx, x - 6, y - 196, 60, 40, '#9fe6ff', 2.5);
  line(ctx, x + 24, y - 196, x + 24, y - 156, INK, 2);
  rect(ctx, x - 10, y - 158, 68, 6, '#ffffff', 2);
  // roof
  poly(ctx, [[x - 86, y - 208], [x + 86, y - 208], [x + 60, y - 244], [x - 60, y - 244]], '#ffffff', 2.5);
  line(ctx, x, y - 244, x, y - 300, INK, 3);
  label(ctx, 'LIFEGUARD', x - 30, y - 132, 13, '#ffffff', { lw: 3 });
  // rail
  line(ctx, x - 90, y - 140, x - 90, y - 112, INK, 3);
  line(ctx, x - 90, y - 140, x - 70, y - 140, INK, 3);
}
function rr2(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.rect(x, y, w, h);
}

function iceCreamCart(ctx, x, y) {
  shadow(ctx, x, y + 4, 90, 12);
  circle(ctx, x - 50, y - 12, 14, '#3a3f55', 2.5);
  circle(ctx, x + 50, y - 12, 14, '#3a3f55', 2.5);
  rrect(ctx, x - 80, y - 100, 160, 80, 10, '#ffffff', 3);
  rect(ctx, x - 80, y - 72, 160, 14, '#ff7ab6', 2);
  label(ctx, 'ICE CREAM', x, y - 42, 18, '#ff3d9a', { lw: 4, stroke: '#ffffff' });
  line(ctx, x - 70, y - 100, x - 70, y - 190, INK, 4);
  line(ctx, x + 70, y - 100, x + 70, y - 190, INK, 4);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const sx = x - 90 + i * 30;
    ctx.beginPath();
    ctx.moveTo(sx, y - 200);
    ctx.lineTo(sx + 30, y - 200);
    ctx.lineTo(sx + 30, y - 180);
    ctx.arc(sx + 15, y - 180, 15, 0, Math.PI);
    ctx.closePath();
    fs(ctx, i % 2 ? '#ffffff' : '#ff7ab6', 2.5);
  }
  // a giant ice lolly on top
  rrect(ctx, x - 12, y - 246, 24, 40, 10, '#9ff7f2', 2.5);
  rect(ctx, x - 3, y - 208, 6, 10, '#e8b060', 1.5);
}

function volleyNet(ctx, x, y) {
  line(ctx, x - 120, y, x - 120, y - 120, INK, 5);
  line(ctx, x + 120, y, x + 120, y - 120, INK, 5);
  rect(ctx, x - 120, y - 120, 240, 40, 'rgba(255,255,255,0.25)', 2.5);
  ctx.strokeStyle = 'rgba(22,11,51,0.5)';
  ctx.lineWidth = 1.2;
  for (let k = -120; k <= 120; k += 10) {
    ctx.beginPath();
    ctx.moveTo(x + k, y - 120);
    ctx.lineTo(x + k, y - 80);
    ctx.stroke();
  }
  for (let k = -110; k <= -80; k += 10) line(ctx, x - 120, y + k - 10, x + 120, y + k - 10, 'rgba(22,11,51,0.4)', 1.2);
  rect(ctx, x - 120, y - 124, 240, 6, '#ffffff', 2);
}

function beachBag(ctx, x, y, c = '#ff8a2a') {
  shadow(ctx, x, y, 34, 7);
  curve(ctx, x - 18, y - 46, x, y - 76, x + 18, y - 46, INK, 4);
  poly(ctx, [[x - 34, y - 48], [x + 34, y - 48], [x + 28, y], [x - 28, y]], c, 2.5);
  for (let k = -24; k <= 24; k += 12) line(ctx, x + k, y - 44, x + k * 0.85, y - 4, 'rgba(255,255,255,0.5)', 4);
  // a towel spilling out
  poly(ctx, [[x - 26, y - 48], [x - 10, y - 60], [x + 4, y - 48]], '#2fb5e8', 2);
}

function buriedGuy(ctx, x, y) {
  ellipse(ctx, x + 40, y, 70, 22, '#f2c46a', 2.5);
  ellipse(ctx, x + 30, y - 6, 20, 7, '#ffd07a', 0);
  // sand-castle belly
  rect(ctx, x + 50, y - 34, 26, 22, '#f2c46a', 2);
  for (let k = 0; k < 3; k++) rect(ctx, x + 50 + k * 9, y - 40, 6, 6, '#f2c46a', 1.5);
  for (const fx of [x + 104, x + 112]) ellipse(ctx, fx, y - 18, 5, 9, '#f5c49c', 2);
  ctx.save();
  ctx.translate(x - 30, y - 6);
  person(ctx, { pose: 'swim', skin: '#f5c49c', hair: '#c98f4f', hairStyle: 'spiky', mood: 'wow' }, 0);
  ctx.restore();
}

// --- the picture ------------------------------------------------------------------------------

function back(ctx, r) {
  sky(ctx, W, 0, HORIZON, [[0, '#4aa8ff'], [0.7, '#9fdcff'], [1, '#d8f4ff']]);
  sun(ctx, 1560, 90, 46, { rays: 14 });
  // far city and a cruise ship on the horizon
  for (let i = 0; i < 14; i++) {
    const bx = 40 + i * 52 + (i % 3) * 6;
    const bh = 30 + ((i * 37) % 50);
    rect(ctx, bx, HORIZON - bh, 40, bh, i % 2 ? '#bcd8f0' : '#a8c8e8', 1.5, 'rgba(22,11,51,0.4)');
  }
  rrect(ctx, 1080, HORIZON - 34, 170, 26, 6, '#ffffff', 2);
  rect(ctx, 1110, HORIZON - 52, 110, 20, '#ffffff', 2);
  rect(ctx, 1150, HORIZON - 70, 26, 18, '#ff3d5a', 2);
  for (let k = 0; k < 8; k++) circle(ctx, 1100 + k * 18, HORIZON - 22, 3, '#2fb5e8', 0);
  // sea
  ctx.fillStyle = seaFill(ctx);
  ctx.fillRect(0, HORIZON, W, SHORE - HORIZON);
  water(ctx, 0, HORIZON + 6, W, SHORE - 20, 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', r, 'rgba(255,255,255,0.45)', 9);
  line(ctx, 0, HORIZON, W, HORIZON, 'rgba(22,11,51,0.5)', 2);
  // buoy line
  for (let k = 0; k < 16; k++) circle(ctx, 120 + k * 110, 345 + Math.sin(k) * 4, 7, k % 2 ? '#ff3d5a' : '#ffffff', 2);
  curve(ctx, 120, 345, 900, 360, 1770, 345, 'rgba(255,255,255,0.6)', 1.5);
  // floats and swimmers on the near water
  flamingoFloat(ctx, 300, 520, 1.1);
  personAt(ctx, 300, 500, { pose: 'sit', skin: '#e0a878', hair: '#2a1a10', hairStyle: 'long', top: '#ff5ab8', outfit: 'swim', swimTop: true, shades: true }, 0);
  crocFloat(ctx, 820, 548, 1.1);
  ringFloat(ctx, 1250, 566, 32, '#ff8a2a', '#ffffff');
  for (const [x, y, seed] of [[160, 430, 3], [470, 470, 4], [700, 430, 5], [1380, 470, 6], [1640, 520, 7], [1100, 470, 8], [560, 580, 9]]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(0.85, 0.85);
    person(ctx, randomPerson(seed, { pose: 'swim', outfit: 'swim', hat: null, kid: false }), 0);
    ctx.restore();
  }
  // a pool noodle and a tiny sailboat
  ctx.save();
  ctx.translate(1520, 600);
  ctx.rotate(-0.2);
  rrect(ctx, -60, -8, 120, 14, 7, '#7cff6b', 2.5);
  ctx.restore();
  // shore: wet sand then dry sand
  ctx.fillStyle = lin(ctx, 0, SHORE, 0, WALK, [[0, '#e8c27a'], [0.12, '#f7da94'], [1, '#f2c46a']]);
  ctx.fillRect(0, SHORE, W, WALK - SHORE);
  ctx.fillStyle = 'rgba(160,120,60,0.18)';
  ctx.fillRect(0, SHORE, W, 40);
  speckle(ctx, 0, SHORE + 40, W, WALK - SHORE - 40, 700, ['#d8a548', '#fff1c8', '#c9944a'], r, 2);
  // footprints
  for (let k = 0; k < 14; k++) {
    const fx = 980 + k * 34;
    const fy = 760 + k * 22 + (k % 2) * 10;
    ellipse(ctx, fx, fy, 6, 3.5, 'rgba(160,110,50,0.35)', 0);
  }
  // everything standing on the sand, drawn back to front
  const D = depth();
  const keep = keepOutOf([...iggy, ...items.flatMap((it) => it.spots)]);
  const place = (x, y, hw, hh, fn) => {
    keep.push({ x, y: y - hh / 2, hw, hh: hh / 2 + 20 });
    D.add(y, fn);
  };
  // palms at each end
  D.add(760, () => palm(ctx, 70, 760, 430, 0.16, { size: 1.1 }));
  D.add(770, () => palm(ctx, 1740, 770, 410, -0.15, { size: 1.05 }));
  D.add(800, () => palm(ctx, 1660, 800, 300, 0.08, { size: 0.9 }));
  place(120, 790, 90, 60, () => bush(ctx, 120, 790, 160, 60, { seed: 4, flowers: '#ff5ab8' }));
  place(1700, 815, 90, 60, () => bush(ctx, 1700, 815, 170, 60, { seed: 6, flowers: '#ffffff' }));
  // lifeguard hut, with a pelican on the rail post
  place(930, 790, 150, 300, () => {
    lifeguardHut(ctx, 900, 790);
    ctx.save();
    ctx.translate(810, 650);
    pelican(ctx, { flip: true }, 0);
    ctx.restore();
  });
  place(1520, 880, 200, 150, () => volleyNet(ctx, 1520, 880));
  // the sandcastle crew
  place(430, 960, 190, 200, () => {
    sandcastle(ctx, 430, 930, 1.2, '#ff3d5a');
    for (let k = 0; k < 6; k++) circle(ctx, 300 + k * 30, 960 + (k % 2) * 8, 5, '#ffffff', 1.5);
    ctx.strokeStyle = '#5fd0e0';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.ellipse(430, 950, 170, 26, 0, 0.1, Math.PI - 0.1);
    ctx.stroke();
  });
  keep.push({ x: 300, y: 960, hw: 40, hh: 70 }, { x: 560, y: 960, hw: 40, hh: 70 }); // the builders (actors)
  keep.push({ x: 180, y: 930, hw: 150, hh: 110 }); // ice cream cart (actor)
  keep.push({ x: 1230, y: 950, hw: 90, hh: 70 }); // the man with the fries (actor)
  keep.push({ x: 1100, y: 830, hw: 40, hh: 70 }); // kite kid (actor)
  keep.push({ x: 820, y: 1150, hw: 380, hh: 35 }); // the dog's racetrack (actor)
  keep.push({ x: 1520, y: 840, hw: 230, hh: 60 }); // volleyball players (actors)
  keep.push({ x: 845, y: 640, hw: 50, hh: 60 }); // lifeguard (actor)
  // set pieces with a joke each
  place(690, 1000, 45, 70, () => beachBag(ctx, 690, 1000, '#2fb5e8'));
  place(900, 1000, 40, 50, () => cooler(ctx, 900, 1000, '#ff3d5a'));
  place(720, 1080, 120, 50, () => buriedGuy(ctx, 690, 1080));
  place(1640, 960, 40, 130, () => {
    // a grandpa with his green parrot (a decoy)
    personAt(ctx, 1640, 960, { pose: 'stand', skin: '#e0a878', hair: '#e8e0d0', hairStyle: 'bald', top: '#ffffff', stripes: '#2fb5e8', bottom: '#3a3f55', hat: 'bucket', hatColour: '#3a3f55' }, 0);
    ctx.save();
    ctx.translate(1652, 870);
    parrot(ctx, { colour: '#4fc93a', wing: '#2f8a2a', tail: '#ffd23a' }, 0);
    ctx.restore();
  });
  place(300, 1170, 40, 50, () => cooler(ctx, 300, 1170, '#3fae4a'));
  place(1460, 1070, 80, 140, () => umbrella(ctx, 1460, 1070, 120, '#ff8a2a', '#ffffff', 0.04));
  // a dad asleep while his kid pours a bucket of sea water on him
  place(1060, 760, 80, 60, () => {
    towel(ctx, 1060, 760, 120, 40, '#a64dff', '#ffffff');
    personAt(ctx, 1070, 765, { pose: 'lie', skin: '#ffd9b8', hair: '#7a4a22', hairStyle: 'short', top: '#ff7a6a', outfit: 'swim', bottom: '#3a6bff', mood: 'sleep' }, 0);
    ctx.save();
    ctx.translate(1010, 740);
    person(ctx, { pose: 'hold', kid: true, skin: '#ffd9b8', hair: '#f2d27a', hairStyle: 'pony', top: '#ffd23a', outfit: 'swim', bottom: '#ffd23a', mood: 'smile' }, 0);
    ctx.restore();
    poly(ctx, [[1024, 712], [1044, 708], [1040, 730], [1028, 730]], '#2fb5e8', 2);
    for (let k = 0; k < 6; k++) circle(ctx, 1032 + k * 2, 734 + k * 5, 3, '#9fe6ff', 1);
  });
  // the crowd: towels, umbrellas, loungers, people and gulls packed in everywhere else
  const TOWEL = [['#ffd23a', '#ff3d5a'], ['#2fb5e8', '#ffffff'], ['#3fae4a', '#ffffff'], ['#ff8a2a', '#ffffff'], ['#a64dff', '#ffd23a'], ['#ff5ab8', '#ffffff'], ['#21c7a8', '#ffe14d']];
  const UMB = [['#ff3d5a', '#ffffff'], ['#2fb5e8', '#ffffff'], ['#ffd23a', '#ff8a2a'], ['#3fae4a', '#ffffff'], ['#a64dff', '#ffffff'], ['#ff5ab8', '#ffd23a']];
  const pts = scatter(r, 46, { x0: 60, y0: 680, x1: 1760, y1: 1150 }, keep, 62);
  pts.forEach((p, i) => {
    const kind = i % 8;
    const seed = 100 + i;
    const tw = TOWEL[i % TOWEL.length];
    if (kind === 0 || kind === 4) {
      D.add(p.y, () => {
        towel(ctx, p.x, p.y, 120, 40, tw[0], tw[1]);
        personAt(ctx, p.x + 6, p.y + 5, randomPerson(seed, { pose: 'lie', outfit: 'swim', kid: false, item: null }), 0);
      });
    } else if (kind === 1) {
      const u = UMB[i % UMB.length];
      D.add(p.y, () => {
        umbrella(ctx, p.x, p.y, 110 + (i % 3) * 8, u[0], u[1], (r() - 0.5) * 0.1);
        towel(ctx, p.x + 10, p.y + 16, 110, 38, tw[0], tw[1]);
        personAt(ctx, p.x + 30, p.y + 10, randomPerson(seed, { pose: 'sit', outfit: 'swim', item: i % 3 ? 'drink' : 'phone' }), 0);
      });
    } else if (kind === 2) {
      D.add(p.y, () => {
        personAt(ctx, p.x - 18, p.y, randomPerson(seed, { pose: 'stand', outfit: 'swim', item: null }), 0);
        personAt(ctx, p.x + 18, p.y + 4, randomPerson(seed + 50, { pose: i % 2 ? 'point' : 'stand', outfit: i % 4 ? 'swim' : 'tee', item: null, flip: true }), 0);
      });
    } else if (kind === 3) {
      D.add(p.y, () => {
        lounger(ctx, p.x, p.y, i % 2 ? '#ffffff' : '#2fb5e8', i % 4 === 1);
        personAt(ctx, p.x + (i % 4 === 1 ? 14 : -14), p.y - 12, randomPerson(seed, { pose: 'sit', outfit: 'swim', shades: true, item: null }), 0);
      });
    } else if (kind === 5) {
      D.add(p.y, () => {
        ctx.save();
        ctx.translate(p.x, p.y);
        gull(ctx, { pose: i % 2 ? 'peck' : 'stand', flip: i % 4 === 1 }, 0);
        ctx.restore();
        ctx.save();
        ctx.translate(p.x + 40, p.y + 8);
        gull(ctx, { flip: true }, 0);
        ctx.restore();
      });
    } else if (kind === 6) {
      D.add(p.y, () => {
        towel(ctx, p.x, p.y, 110, 38, tw[0], tw[1]);
        personAt(ctx, p.x - 16, p.y - 4, randomPerson(seed, { pose: 'sit', outfit: 'swim', kid: true, item: null }), 0);
        personAt(ctx, p.x + 22, p.y, randomPerson(seed + 7, { pose: 'sit', outfit: 'swim', item: i % 3 ? null : 'drink' }), 0);
      });
    } else {
      D.add(p.y, () => {
        personAt(ctx, p.x, p.y, randomPerson(seed, { pose: i % 3 ? 'walk' : 'wave', outfit: 'swim', kid: i % 2 === 0, item: i % 5 === 0 ? 'balloon' : null }), 0);
        if (i % 2 === 0) {
          ctx.save();
          ctx.translate(p.x + 34, p.y);
          dog(ctx, { pose: 'sit', colour: ['#c98f4f', '#3a3f55', '#f2d27a'][i % 3], flip: true }, 0);
          ctx.restore();
        }
      });
    }
  });
  D.draw();
  // little grey pebbles (not the pink findable shell)
  for (let k = 0; k < 18; k++) ellipse(ctx, r() * W, SHORE + 60 + r() * 500, 7, 4, '#e8e0d0', 1.5);
  // the boardwalk
  ctx.fillStyle = lin(ctx, 0, WALK, 0, H, [[0, '#c98f4f'], [1, '#a8743f']]);
  ctx.fillRect(0, WALK, W, H - WALK);
  line(ctx, 0, WALK, W, WALK, INK, 3);
  for (let y = WALK + 18; y < H; y += 18) line(ctx, 0, y, W, y, 'rgba(110,68,38,0.5)', 2);
  for (let x = 0; x < W; x += 120) line(ctx, x + ((x / 120) % 2) * 60, WALK, x + ((x / 120) % 2) * 60, H, 'rgba(110,68,38,0.35)', 2);
  bench(ctx, 420, 1280, 130, '#2fb5e8');
  personAt(ctx, 395, 1255, randomPerson(41, { pose: 'sit', hairStyle: 'bun', hair: '#e8e0d0', top: '#a64dff', kid: false }), 0);
  personAt(ctx, 450, 1255, randomPerson(42, { pose: 'sit', hairStyle: 'bald', top: '#ff8a2a', hat: 'straw', kid: false, item: 'hotdog' }), 0);
  bin(ctx, 1560, 1252, '#2f8a3e');
  // surfboard rental rack
  for (let k = 0; k < 5; k++) surfboard(ctx, 1150 + k * 30, 1230, 110, TOPS[k * 2], 0.05 * (k - 2));
  rrect(ctx, 1130, 1250, 150, 28, 6, '#ffffff', 2.5);
  label(ctx, 'SURF', 1205, 1264, 18, '#2fb5e8', { lw: 3 });
  // sea oats along the top of the walk
  for (let k = 0; k < 30; k++) {
    const gx = (k * 61) % W;
    curve(ctx, gx, WALK, gx + 4, WALK - 20, gx + 10, WALK - 32, '#8aa04a', 2.5);
  }
}

// --- moving things -----------------------------------------------------------------------------

const loop = (t, period) => (t % period) / period;

const actors = [
  // clouds drifting
  ...[[200, 90, 50, 0], [800, 60, 40, 0.3], [1300, 150, 34, 0.6]].map(([x, y, s, p]) => ({
    x: W / 2, y, hw: W / 2 + 120, hh: s, over: true,
    draw(ctx, t) {
      const cx = ((x + t * 8 + p * W) % (W + 240)) - 120;
      cloud(ctx, cx, y, s);
    },
  })),
  // a little plane pulling a banner
  {
    x: W / 2, y: 110, hw: W / 2 + 400, hh: 40, over: true,
    draw(ctx, t) {
      const k = loop(t, 34);
      const px = -300 + k * (W + 700);
      const py = 110 + Math.sin(t) * 6;
      curve(ctx, px - 30, py, px - 50, py + 4, px - 70, py, INK, 1.5);
      ctx.save();
      ctx.translate(px - 250, py - 18);
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) ctx.lineTo(i * 18, Math.sin(i * 0.8 + t * 6) * 3);
      for (let i = 10; i >= 0; i--) ctx.lineTo(i * 18, 34 + Math.sin(i * 0.8 + t * 6) * 3);
      ctx.closePath();
      fs(ctx, '#ffffff', 2);
      label(ctx, 'SURF\'S UP!', 90, 17, 20, '#ff3d5a', { lw: 0 });
      ctx.restore();
      ellipse(ctx, px, py, 34, 10, '#ffd23a', 2.5);
      poly(ctx, [[px - 30, py], [px - 42, py - 18], [px - 24, py - 4]], '#ff3d5a', 2);
      ellipse(ctx, px + 4, py - 2, 12, 32, '#ff3d5a', 2, INK, 0.2);
      ellipse(ctx, px + 14, py - 6, 8, 5, '#9fe6ff', 1.5);
      ellipse(ctx, px + 36, py, 2, 12 * Math.abs(Math.sin(t * 40)), INK, 0);
    },
  },
  // gulls wheeling
  ...[[500, 200, 0], [1250, 230, 2]].map(([x, y, p]) => ({
    x, y, hw: 140, hh: 60, over: true,
    draw(ctx, t) {
      ctx.save();
      ctx.translate(x + Math.cos(t * 0.6 + p) * 110, y + Math.sin(t * 1.2 + p) * 30);
      gull(ctx, { pose: 'fly', flip: Math.sin(t * 0.6 + p) > 0, phase: p }, t);
      ctx.restore();
    },
  })),
  // a dolphin jumping now and then
  {
    x: 1540, y: 330, hw: 90, hh: 80,
    draw(ctx, t) {
      const k = loop(t, 6);
      if (k > 0.25) return;
      const a = k / 0.25;
      ctx.save();
      ctx.translate(1470 + a * 140, 360 - Math.sin(a * Math.PI) * 90);
      ctx.rotate(-1 + a * 2);
      ctx.scale(0.9, 0.9);
      ctx.translate(0, 0);
      // dolphin drawn inline (scenes stay independent of animals' exact export list)
      ctx.beginPath();
      ctx.moveTo(-40, 6);
      ctx.quadraticCurveTo(-10, -26, 30, -8);
      ctx.quadraticCurveTo(44, -2, 48, 2);
      ctx.quadraticCurveTo(36, 4, 28, 6);
      ctx.quadraticCurveTo(0, 14, -40, 6);
      fs(ctx, '#6a9ad8', 2.5);
      poly(ctx, [[-6, -12], [2, -26], [8, -12]], '#6a9ad8', 2);
      poly(ctx, [[-40, 6], [-54, -6], [-50, 6], [-54, 16]], '#6a9ad8', 2);
      circle(ctx, 28, -6, 2, INK, 0);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 3;
      for (const sx of [1470, 1610]) {
        ctx.beginPath();
        ctx.ellipse(sx, 362, 18 * (1 - a * 0.5), 4, 0, 0, TAU);
        ctx.stroke();
      }
    },
  },
  // the jet ski zooming back and forth with a spray
  {
    x: 900, y: 390, hw: 900, hh: 50, over: true,
    draw(ctx, t) {
      const k = loop(t, 16);
      const dir = k < 0.5 ? 1 : -1;
      const e = k < 0.5 ? k * 2 : 2 - k * 2;
      const x = 150 + e * 1500;
      const y = 395 + Math.sin(t * 5) * 3;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 1; i < 7; i++) {
        ctx.beginPath();
        ctx.arc(x - dir * i * 18, y + 4 + Math.sin(i + t * 9) * 2, 9 - i, 0, TAU);
        ctx.fill();
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(dir, 1);
      poly(ctx, [[-40, 0], [40, 0], [52, -14], [-30, -16]], '#ff3d5a', 2.5);
      rrect(ctx, -20, -26, 34, 12, 5, '#3a3f55', 2);
      ctx.translate(-2, -20);
      ctx.scale(0.8, 0.8);
      person(ctx, { pose: 'cheer', skin: '#c68a5a', hair: '#16101e', hairStyle: 'short', top: '#ffd23a', outfit: 'tank', bottom: '#2a4a8a', shades: true, phase: 2 }, t);
      ctx.restore();
    },
  },
  // surfer riding a little wave
  {
    x: 560, y: 380, hw: 110, hh: 120,
    draw(ctx, t) {
      const x = 560 + Math.sin(t * 0.7) * 60;
      const y = 400 + Math.sin(t * 1.4) * 4;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.moveTo(x - 90, y + 14);
      ctx.quadraticCurveTo(x - 60, y - 30, x - 20, y - 10);
      ctx.quadraticCurveTo(x - 40, y + 6, x + 60, y + 14);
      ctx.closePath();
      ctx.fill();
      surfboard(ctx, x, y + 6, 110, '#ffd23a', 1.45, '#ff3d5a');
      ctx.save();
      ctx.translate(x, y + 2);
      ctx.rotate(Math.sin(t * 1.4) * 0.08);
      ctx.scale(0.85, 0.85);
      person(ctx, { pose: 'cheer', skin: '#9a6440', hair: '#16101e', hairStyle: 'curly', top: '#2fb5e8', outfit: 'swim', bottom: '#ff8a2a', phase: 1 }, t);
      ctx.restore();
    },
  },
  // banana boat with three riders bouncing along
  {
    x: 1160, y: 410, hw: 110, hh: 60,
    draw(ctx, t) {
      const x = 1160 + Math.sin(t * 0.5) * 30;
      const y = 420 + Math.sin(t * 3) * 3;
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.translate(x - 50 + i * 42, y - 12 + Math.sin(t * 6 + i) * 2);
        ctx.scale(0.7, 0.7);
        person(ctx, randomPerson(60 + i, { pose: 'cheer', outfit: 'swim', hat: null, kid: false, phase: i }), t);
        ctx.restore();
      }
      ctx.beginPath();
      ctx.moveTo(x - 90, y - 18);
      ctx.quadraticCurveTo(x - 80, y + 6, x, y + 6);
      ctx.quadraticCurveTo(x + 80, y + 6, x + 96, y - 22);
      ctx.quadraticCurveTo(x + 80, y - 6, x, y - 6);
      ctx.quadraticCurveTo(x - 70, y - 6, x - 90, y - 18);
      fs(ctx, '#ffe14d', 2.5);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(x, y + 8, 90, 6, 0, 0, Math.PI);
      ctx.stroke();
    },
  },
  // a few swimmers bobbing and splashing
  ...[[260, 380, 70], [960, 440, 71], [1500, 420, 72], [1760, 450, 73]].map(([x, y, seed]) => ({
    x, y: y - 30, hw: 40, hh: 50,
    draw(ctx, t) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(0.85, 0.85);
      person(ctx, randomPerson(seed, { pose: 'swim', outfit: 'swim', hat: null, kid: seed % 2 === 0 }), t);
      ctx.restore();
    },
  })),
  // the shoreline foam
  {
    x: W / 2, y: SHORE, hw: W / 2, hh: 20, over: true,
    draw(ctx, t, view) {
      const x0 = Math.max(0, view ? view.x0 - 20 : 0);
      const x1 = Math.min(W, view ? view.x1 + 20 : W);
      wavesFoam(ctx, x0, x1, SHORE - 6 + Math.sin(t * 0.8) * 5, t, 'rgba(255,255,255,0.85)');
    },
  },
  // the lifeguard scanning with binoculars
  {
    x: 845, y: 620, hw: 40, hh: 70,
    draw(ctx, t) {
      ctx.save();
      ctx.translate(845, 678);
      const look = Math.sin(t * 0.5) > 0;
      person(ctx, { pose: 'hold', flip: look, skin: '#c68a5a', hair: '#2a1a10', hairStyle: 'short', top: '#ff3d5a', outfit: 'tank', bottom: '#ff3d5a', hat: 'visor', hatColour: '#ffffff', item: 'binoculars', phase: 3 }, t);
      ctx.restore();
    },
  },
  // flags on the hut roof
  {
    x: 920, y: 470, hw: 40, hh: 30,
    draw(ctx, t) {
      const f = Math.sin(t * 5) * 4;
      ctx.beginPath();
      ctx.moveTo(900, 450);
      ctx.quadraticCurveTo(920, 452 + f, 944, 458);
      ctx.quadraticCurveTo(920, 466 - f, 900, 470);
      fs(ctx, '#ffd23a', 2);
    },
  },
  // beach volleyball: two players a side and a ball going over
  {
    x: 1520, y: 800, hw: 230, hh: 170,
    keep: [{ x: 1527, y: 820, hw: 150, hh: 60 }, { x: 1520, y: 690, hw: 130, hh: 110 }],
    draw(ctx, t) {
      const k = loop(t, 2.4);
      const side = Math.floor(t / 2.4) % 2;
      const bx = side ? 1640 - k * 240 : 1400 + k * 240;
      const by = 860 - Math.sin(k * Math.PI) * 220 - 60;
      const players = [[1390, 0, 81], [1450, 0.5, 82], [1600, 0.25, 83], [1665, 0.75, 84]];
      for (const [px, ph, seed] of players) {
        const jump = Math.max(0, Math.sin((t + ph * 2.4) * 2.6)) * 22;
        ctx.save();
        ctx.translate(px, 870 - jump);
        shadow(ctx, 0, jump, 18);
        person(ctx, randomPerson(seed, { pose: 'cheer', outfit: 'swim', hat: null, kid: false, flip: px > 1520 }), t);
        ctx.restore();
      }
      circle(ctx, bx, by, 13, '#ffffff', 2.5);
      curve(ctx, bx - 8, by - 6, bx, by, bx - 6, by + 8, '#2fb5e8', 2);
    },
  },
  // a dog chasing a ball along the sand
  {
    x: 720, y: 1140, hw: 360, hh: 60,
    keep: [{ x: 720, y: 1140, hw: 280, hh: 30 }],
    draw(ctx, t) {
      const k = loop(t, 7);
      const e = k < 0.5 ? k * 2 : 2 - k * 2;
      const dir = k < 0.5 ? 1 : -1;
      const x = 540 + e * 360;
      const ballX = x + dir * 80;
      const hop = Math.abs(Math.sin(t * 6)) * 26;
      shadow(ctx, ballX, 1160, 10, 3);
      circle(ctx, ballX, 1146 - hop, 9, '#7cff6b', 2);
      ctx.save();
      ctx.translate(x, 1160);
      shadow(ctx, 0, 0, 26);
      dog(ctx, { pose: 'run', flip: dir < 0, colour: '#ffffff', spot: '#3a3f55', ear: '#3a3f55', tongue: true, collar: '#ff3d5a' }, t);
      ctx.restore();
    },
  },
  // a gull swooping in to steal a man's fries
  {
    x: 1230, y: 930, hw: 520, hh: 260,
    keep: [{ x: 1230, y: 960, hw: 75, hh: 65 }],
    draw(ctx, t) {
      const k = loop(t, 9);
      const stolen = k > 0.42;
      const man = { pose: 'sit', skin: '#f5c49c', hair: '#7a4a22', hairStyle: 'short', top: '#2fb5e8', outfit: 'tee', bottom: '#ffd23a', mood: stolen && k < 0.8 ? 'wow' : 'smile', item: stolen ? null : 'fries', phase: 4 };
      towel(ctx, 1230, 1000, 100, 36, '#ff3d5a', '#ffffff');
      ctx.save();
      ctx.translate(1225, 975);
      person(ctx, man, t);
      ctx.restore();
      let gx;
      let gy;
      if (k < 0.42) {
        const a = k / 0.42;
        gx = 1460 - a * 220;
        gy = 820 + a * 110;
      } else {
        const a = (k - 0.42) / 0.58;
        gx = 1240 - a * 520;
        gy = 930 - a * 240 + Math.sin(a * 8) * 10;
      }
      ctx.save();
      ctx.translate(gx, gy);
      gull(ctx, { pose: 'fly', flip: true, item: stolen ? 'fries' : null }, t);
      ctx.restore();
    },
  },
  // kite flyer with a green lizard kite (not Iggy!)
  {
    x: 1040, y: 520, hw: 140, hh: 380,
    keep: [{ x: 1000, y: 250, hw: 70, hh: 110 }, { x: 1100, y: 840, hw: 40, hh: 60 }],
    draw(ctx, t) {
      const kx = 1000 + Math.sin(t * 0.8) * 40;
      const ky = 230 + Math.sin(t * 1.3) * 20;
      curve(ctx, 1095, 822, 1060, 560, kx, ky + 30, 'rgba(22,11,51,0.7)', 1.5);
      ctx.save();
      ctx.translate(kx, ky);
      ctx.rotate(Math.sin(t * 1.3) * 0.15);
      // lizard kite: a diamond body, four legs and a long wavy tail
      ctx.beginPath();
      ctx.moveTo(0, 50);
      for (let i = 0; i < 10; i++) ctx.lineTo(Math.sin(i * 0.9 + t * 4) * 8, 50 + i * 10);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.strokeStyle = '#3fae4a';
      ctx.lineWidth = 3;
      ctx.stroke();
      for (const [lx, ly] of [[-24, -6], [24, -6], [-20, 30], [20, 30]]) line(ctx, 0, ly * 0.6, lx, ly, INK, 4);
      poly(ctx, [[0, -40], [22, 8], [0, 54], [-22, 8]], '#4fc93a', 2.5);
      circle(ctx, -6, -18, 4, '#ffffff', 1.5);
      circle(ctx, 6, -18, 4, '#ffffff', 1.5);
      circle(ctx, -6, -18, 1.8, INK, 0);
      circle(ctx, 6, -18, 1.8, INK, 0);
      ctx.restore();
      ctx.save();
      ctx.translate(1100, 880);
      shadow(ctx, 0, 0, 16);
      person(ctx, { pose: 'cheer', kid: true, skin: '#e0a878', hair: '#2a1a10', hairStyle: 'pony', top: '#ff8a2a', outfit: 'tee', bottom: '#2a4a8a', phase: 5 }, t);
      ctx.restore();
    },
  },
  // ice cream seller and a kid waiting
  {
    x: 175, y: 900, hw: 120, hh: 140,
    keep: [{ x: 175, y: 930, hw: 120, hh: 100 }],
    draw(ctx, t) {
      iceCreamCart(ctx, 180, 1010);
      ctx.save();
      ctx.translate(250, 1000);
      person(ctx, { pose: 'wave', flip: true, skin: '#c68a5a', hair: '#2a1a10', hairStyle: 'short', top: '#ffffff', outfit: 'tee', bottom: '#ff7ab6', hat: 'chef', phase: 6 }, t);
      ctx.restore();
      ctx.save();
      ctx.translate(95, 1010);
      person(ctx, { pose: 'cheer', kid: true, skin: '#ffd9b8', hair: '#f2d27a', hairStyle: 'bun', top: '#a64dff', outfit: 'dress', phase: 7 }, t);
      ctx.restore();
    },
  },
  // the castle builders
  {
    x: 430, y: 990, hw: 140, hh: 70,
    keep: [{ x: 300, y: 965, hw: 30, hh: 55 }, { x: 560, y: 985, hw: 30, hh: 35 }],
    draw(ctx, t) {
      ctx.save();
      ctx.translate(300, 1010);
      person(ctx, { pose: 'wave', kid: true, skin: '#9a6440', hair: '#16101e', hairStyle: 'curly', top: '#ffd23a', outfit: 'swim', bottom: '#2fb5e8', phase: 8, item: null }, t);
      ctx.restore();
      ctx.save();
      ctx.translate(560, 1010);
      person(ctx, { pose: 'sit', kid: true, skin: '#f5c49c', hair: '#b23a1e', hairStyle: 'short', top: '#3fae4a', outfit: 'swim', bottom: '#ff3d5a', phase: 9 }, t);
      ctx.restore();
    },
  },
  // boardwalk traffic: a cyclist and a roller skater going opposite ways
  {
    x: W / 2, y: 1240, hw: W / 2 + 100, hh: 80, over: true,
    draw(ctx, t) {
      const cx = ((t * 70) % (W + 300)) - 150;
      ctx.save();
      ctx.translate(cx, 1262);
      for (const wx of [-30, 30]) {
        circle(ctx, wx, -16, 16, 'rgba(0,0,0,0)', 3);
        line(ctx, wx, -16, wx + Math.cos(t * 8) * 14, -16 + Math.sin(t * 8) * 14, INK, 1.5);
      }
      line(ctx, -30, -16, 0, -40, '#ff3d5a', 4);
      line(ctx, 0, -40, 30, -16, '#ff3d5a', 4);
      line(ctx, 0, -40, 24, -46, '#ff3d5a', 4);
      ctx.translate(-4, -30);
      ctx.scale(0.8, 0.8);
      person(ctx, { pose: 'sit', skin: '#e0a878', hair: '#16101e', hairStyle: 'pony', top: '#7cd34a', outfit: 'tank', bottom: '#3a3f55', hat: 'cap', hatColour: '#ff3d5a', phase: 1 }, t);
      ctx.restore();
      const sx = W - (((t * 50) + 600) % (W + 300)) + 150;
      ctx.save();
      ctx.translate(sx, 1290);
      ctx.rotate(Math.sin(t * 3) * 0.08);
      person(ctx, { pose: 'cheer', flip: true, skin: '#6e4428', hair: '#2a1a10', hairStyle: 'long', top: '#ff5ab8', outfit: 'tank', bottom: '#2fb5e8', shoes: '#ffffff', phase: 2 }, t);
      ctx.restore();
    },
  },
];

// --- hiding places ----------------------------------------------------------------------------

const iggy = [
  sp(514, 846, { pose: 'peek' }), // on a sandcastle tower
  sp(1010, 538, { pose: 'float', cover: seaCover(1010, 538) }), // floating between the swimmers
  sp(1450, 1150, { pose: 'lie' }), // sunbathing beside the umbrella
  sp(918, 632, { pose: 'peek' }), // in the lifeguard hut window
  sp(690, 952, { pose: 'peek' }), // in the beach bag
  sp(40, 600, { pose: 'cling', flip: true, s: 0.9 }), // up the palm trunk
  sp(1560, 1188, { pose: 'peek' }), // in the boardwalk bin
  sp(300, 1124, { pose: 'peek' }), // behind the green cooler
];

const items = [
  { id: 'crab', prop: 'crab', count: 3, spots: [sp(240, 690), sp(1180, 680), sp(190, 1175), sp(1690, 1080), sp(1010, 1110)] },
  { id: 'beachball', prop: 'beachball', spots: [sp(560, 780), sp(1520, 960), sp(260, 790)] },
  { id: 'bucket', prop: 'bucket', o: { colour: '#ff3d5a' }, spots: [sp(380, 860), sp(1000, 1050), sp(820, 1220)] },
  { id: 'starfish', prop: 'starfish', count: 2, spots: [sp(120, 650), sp(760, 650), sp(1260, 630), sp(1745, 655)] },
  { id: 'shell', prop: 'shell', count: 2, spots: [sp(480, 680), sp(1300, 690), sp(1060, 1050), sp(170, 1110)] },
  { id: 'flipflop', prop: 'flipflop', spots: [sp(860, 1080), sp(1440, 1000, { rot: 0.5 })] },
  { id: 'sunglasses', prop: 'sunglasses', spots: [sp(1250, 1100), sp(530, 1080)] },
  { id: 'cone', prop: 'cone', spots: [sp(1600, 1150), sp(560, 1240)] },
  { id: 'bottle', prop: 'bottle', spots: [sp(1340, 628), sp(400, 620)] },
  { id: 'duck', prop: 'duck', spots: [sp(640, 520), sp(1530, 540)] },
  { id: 'sunhat', prop: 'sunhat', spots: [sp(1000, 860), sp(470, 1220)] },
  { id: 'camera', prop: 'camera', spots: [sp(730, 860), sp(1720, 900)] },
  { id: 'melon', prop: 'melon', spots: [sp(1140, 1080), sp(900, 900)] },
  { id: 'spade', prop: 'spade', spots: [sp(330, 1060, { rot: 0.6 }), sp(1330, 945, { rot: -0.5 })] },
  { id: 'kite', prop: 'kite', o: { colour: '#ff3d9a' }, spots: [sp(1720, 330, { rot: 0.4 }), sp(620, 190)] },
  { id: 'teddy', prop: 'teddy', spots: [sp(1590, 1020), sp(40, 1090)] },
  { id: 'coconut', prop: 'coconut', spots: [sp(1440, 1250), sp(640, 860)] },
  { id: 'snorkel', prop: 'snorkel', spots: [sp(1270, 860), sp(110, 1240)] },
];

function sticker(ctx, r, t) {
  ctx.save();
  ctx.scale(r / 100, r / 100);
  ctx.fillStyle = lin(ctx, 0, -100, 0, 100, [[0, '#7fd8ff'], [0.55, '#2fc6e2'], [0.56, '#f7da94'], [1, '#f2c46a']]);
  ctx.beginPath();
  ctx.arc(0, 0, 100, 0, TAU);
  ctx.fill();
  sun(ctx, 50, -50, 18);
  umbrella(ctx, -20, 70, 90, '#ff3d5a', '#ffffff', -0.1);
  ctx.translate(40, 70);
  drawProp(ctx, 'iggy-stand', {}, t);
  ctx.restore();
}

export default {
  id: 'beach',
  name: 'South Beach',
  W, H,
  edge: '#f2c46a',
  back,
  actors,
  iggy,
  items,
  sticker,
};
