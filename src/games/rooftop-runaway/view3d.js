// Rooftop Runaway's 3D view, drawn with three.js. No game rules: it only reads the run.
// Sim x is scene x, sim y (north) is scene -z, and heights are scene y. The camera looks north
// and down at the crowd and never turns, so "up the screen" is always north.
//
// The city is merged into a few static meshes; people, robbers, shadows and particles are
// instanced and updated each frame, so nothing is allocated while playing.
import * as THREE from 'three';
import { STREET, linkPos, linkStart, linkEnd, zipLineHeight, ZIP_TOP, ZIP_END } from './world.js';
import { inCrowd } from './sim.js';

const PASTELS = ['#ff9ec7', '#8ff0ea', '#ffe28a', '#c9b3ff', '#ffbf94', '#a8eea0'];
const TRIM = '#fff6ea';
const GLASS = '#3d8fc4';
const NEON = ['#ff3d9a', '#29f0ff', '#ffe14d', '#b46bff'];
const SHIRTS = ['#ff3d9a', '#ffe14d', '#19c3d6', '#ff8a4c', '#59d86b', '#b46bff', '#ffffff', '#ff5a5a', '#3a7bff'];
const SKINS = ['#f2c9a0', '#d9a273', '#a86f44', '#7a4a2b', '#f7dcc0'];
const HAIR = ['#3b2414', '#160b33', '#d9a04a', '#7a3a1a', '#f2d06b', '#c04a2a'];
const SHORTS = ['#2b3a8c', '#3a2a5a', '#1f7a8c', '#7a2a5a'];
const WORDS = ['HOTEL', 'CAFE', 'MIAMI', 'TACOS', 'SURF', 'DISCO', 'GELATO', 'PIZZA'];
const MAX_FADE = 32;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const TAU = Math.PI * 2;

function canvasTexture(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---- a geometry builder: shapes are baked into one non-indexed geometry with vertex colours
// and a "tag" (the building they belong to, for fading; -1 for none) ----
function makeBuilder() {
  const pos = [];
  const nor = [];
  const col = [];
  const tag = [];
  const uv = [];
  const c = new THREE.Color();
  function add(geo, colour, t = -1) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const p = g.attributes.position.array;
    const n = g.attributes.normal.array;
    const u = g.attributes.uv ? g.attributes.uv.array : null;
    c.set(colour);
    for (let i = 0, k = 0; i < p.length; i += 3, k += 2) {
      pos.push(p[i], p[i + 1], p[i + 2]);
      nor.push(n[i], n[i + 1], n[i + 2]);
      col.push(c.r, c.g, c.b);
      tag.push(t);
      uv.push(u ? u[k] : 0, u ? u[k + 1] : 0);
    }
    if (g !== geo) g.dispose();
    geo.dispose();
  }
  const api = {
    add,
    box(sx, sy, sz, x, y, z, colour, t, ry = 0, rx = 0, rz = 0) {
      const g = new THREE.BoxGeometry(sx, sy, sz);
      if (rx || ry || rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')));
      g.translate(x, y, z);
      add(g, colour, t);
    },
    cyl(r0, r1, h, x, y, z, colour, t, seg = 8, rx = 0, rz = 0) {
      const g = new THREE.CylinderGeometry(r0, r1, h, seg);
      if (rx || rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, 0, rz)));
      g.translate(x, y, z);
      add(g, colour, t);
    },
    ball(r, x, y, z, colour, t, sy = 1) {
      const g = new THREE.IcosahedronGeometry(r, 1);
      g.scale(1, sy, 1);
      g.translate(x, y, z);
      add(g, colour, t);
    },
    // a thin box from point a to point b (scene coordinates)
    beam(a, b, thick, colour, t, flat = 0) {
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const dz = b[2] - a[2];
      const len = Math.hypot(dx, dy, dz);
      if (len < 1e-4) return;
      const g = new THREE.BoxGeometry(flat || thick, thick, len);
      const m = new THREE.Matrix4().lookAt(new THREE.Vector3(0, 0, 0), new THREE.Vector3(dx, dy, dz), new THREE.Vector3(0, 1, 0));
      g.applyMatrix4(m);
      g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      add(g, colour, t);
    },
    empty: () => pos.length === 0,
    build() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setAttribute('aTag', new THREE.Float32BufferAttribute(tag, 1));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      return g;
    },
  };
  return api;
}

const shade = (hex, k) => {
  const c = new THREE.Color(hex);
  if (k < 1) c.multiplyScalar(k);
  else c.lerp(new THREE.Color('#ffffff'), k - 1);
  return `#${c.getHexString()}`;
};

// The robbers' shirt: black and white bands.
const stripes = () => canvasTexture(8, 32, (g, w, h) => {
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? '#ffffff' : '#1a1426';
    g.fillRect(0, (i * h) / 8, w, h / 8);
  }
});

// A sheet of neon words, one per row, for the signs on the buildings.
const neonSheet = () => canvasTexture(256, 32 * WORDS.length, (g, w) => {
  WORDS.forEach((word, i) => {
    const y = i * 32 + 16;
    g.font = '900 24px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = 'rgba(22,11,51,0.85)';
    g.fillRect(8, i * 32 + 2, w - 16, 28);
    const c = NEON[i % NEON.length];
    g.shadowColor = c;
    g.shadowBlur = 8;
    g.fillStyle = c;
    g.fillText(word, w / 2, y + 1);
    g.shadowBlur = 0;
    g.fillStyle = '#ffffff';
    g.globalAlpha = 0.55;
    g.fillText(word, w / 2, y + 1);
    g.globalAlpha = 1;
  });
});

export function createView(level) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.__renderScale || 2, 1.5));
  const el = renderer.domElement;
  Object.assign(el.style, { position: 'fixed', left: '0', top: '0', width: '100vw', height: '100dvh', zIndex: '0' });

  const disposables = [];
  const keep = (x) => {
    disposables.push(x);
    return x;
  };
  const { W, L } = level;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#ff9a8a');
  scene.fog = new THREE.Fog('#ff9a8a', 30, 60);
  scene.add(new THREE.HemisphereLight('#fff0f6', '#7a5a9a', 1.7));
  const sunLight = new THREE.DirectionalLight('#ffd9b0', 1.5);
  sunLight.position.set(-6, 9, 5); // low in the west: a sunset glow on the west walls
  scene.add(sunLight);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);

  // ---- materials ----
  const fadeValues = new Float32Array(MAX_FADE);
  const fadeUniform = { value: fadeValues };
  const cityMat = keep(new THREE.MeshLambertMaterial({ vertexColors: true }));
  // Buildings between the camera and the crowd are drawn with every other pixel missing,
  // so the crowd always shows through.
  cityMat.onBeforeCompile = (shader) => {
    shader.uniforms.uFade = fadeUniform;
    shader.vertexShader = `attribute float aTag;\nuniform float uFade[${MAX_FADE}];\nvarying float vFade;\n${shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n  vFade = aTag >= 0.0 ? uFade[int(aTag + 0.5)] : 0.0;',
    )}`;
    shader.fragmentShader = `varying float vFade;\n${shader.fragmentShader.replace(
      '#include <clipping_planes_fragment>',
      '#include <clipping_planes_fragment>\n  if (vFade > 0.02) {\n    vec2 q = mod(floor(gl_FragCoord.xy), 2.0);\n    float th = q.x < 0.5 ? (q.y < 0.5 ? 0.0 : 0.5) : (q.y < 0.5 ? 0.75 : 0.25);\n    if (th < vFade * 0.8) discard;\n  }',
    )}`;
  };
  const vcol = keep(new THREE.MeshLambertMaterial({ vertexColors: true }));
  const glow = keep(new THREE.MeshBasicMaterial({ vertexColors: true }));
  const meshes = [];
  const addMesh = (m) => {
    scene.add(m);
    meshes.push(m);
    return m;
  };

  // ---- the ground: a painted map of the streets ----
  const PX = 16;
  const groundTex = keep(canvasTexture(Math.round(W * PX), Math.round(L * PX), (g, w, h) => {
    const X = (x) => x * PX;
    const Y = (y) => h - y * PX;
    g.fillStyle = '#6b5a8e';
    g.fillRect(0, 0, w, h);
    // little speckles in the road
    g.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < (w * h) / 300; i++) g.fillRect((i * 97) % w, (i * 53 + Math.floor(i / 7) * 31) % h, 2, 2);
    // sidewalks along the edges and round every building
    const walk = (x, y, ww, dd) => {
      g.fillStyle = '#f6d3c4';
      g.fillRect(X(x), Y(y + dd), ww * PX, dd * PX);
      g.strokeStyle = 'rgba(160,110,120,0.35)';
      g.lineWidth = 1;
      for (let gx = Math.ceil(x); gx < x + ww; gx++) {
        g.beginPath();
        g.moveTo(X(gx) + 0.5, Y(y + dd));
        g.lineTo(X(gx) + 0.5, Y(y));
        g.stroke();
      }
      for (let gy = Math.ceil(y); gy < y + dd; gy++) {
        g.beginPath();
        g.moveTo(X(x), Y(gy) + 0.5);
        g.lineTo(X(x + ww), Y(gy) + 0.5);
        g.stroke();
      }
      g.fillStyle = '#e8b8a8';
      g.fillRect(X(x), Y(y + dd), ww * PX, 2);
      g.fillRect(X(x), Y(y) - 2, ww * PX, 2);
      g.fillRect(X(x), Y(y + dd), 2, dd * PX);
      g.fillRect(X(x + ww) - 2, Y(y + dd), 2, dd * PX);
    };
    walk(0, 0, 1.2, L);
    walk(W - 1.2, 0, 1.2, L);
    for (const b of level.buildings) walk(b.x - 1, b.y - 1, b.w + 2, b.d + 2);
    // a dashed yellow line up the middle, where no building stands
    g.fillStyle = '#ffd84d';
    const mid = W / 2;
    for (let y = 1; y < L - 1; y += 2.4) {
      if (level.buildings.some((b) => mid > b.x - 1.3 && mid < b.x + b.w + 1.3 && y + 1.2 > b.y - 1.3 && y < b.y + b.d + 1.3)) continue;
      g.fillRect(X(mid - 0.08), Y(y + 1.2), 0.16 * PX, 1.2 * PX);
    }
    // zebra crossings
    for (const cy of [level.start.y + 4.5, level.goal.y - 2.5]) {
      if (cy < 1 || cy > L - 1) continue;
      g.fillStyle = 'rgba(255,255,255,0.85)';
      for (let x = 1.6; x < W - 1.6; x += 0.9) {
        if (level.buildings.some((b) => x > b.x - 1 && x < b.x + b.w + 1 && cy + 0.8 > b.y - 1 && cy - 0.8 < b.y + b.d + 1)) continue;
        g.fillRect(X(x), Y(cy + 0.8), 0.45 * PX, 1.6 * PX);
      }
    }
    // the getaway's pad: a bright checked square
    const G = level.goal;
    for (let i = 0; i < G.w * 2; i++) {
      for (let j = 0; j < G.d * 2; j++) {
        g.fillStyle = (i + j) % 2 ? '#fff6ea' : '#ffe14d';
        g.fillRect(X(G.x + i / 2), Y(G.y + (j + 1) / 2), PX / 2, PX / 2);
      }
    }
    g.strokeStyle = '#ff3d9a';
    g.lineWidth = 4;
    g.strokeRect(X(G.x), Y(G.y + G.d), G.w * PX, G.d * PX);
    if (G.kind === 'ferry') {
      // the dock: planks out to the water
      g.fillStyle = '#c98a55';
      g.fillRect(X(G.x - 1), Y(L), (G.w + 2) * PX, (L - G.y - G.d) * PX);
      g.fillStyle = '#a86f44';
      for (let y = G.y + G.d; y < L; y += 0.5) g.fillRect(X(G.x - 1), Y(y), (G.w + 2) * PX, 1);
    }
    // hideouts: open manholes
    for (const ho of level.hideouts) {
      g.fillStyle = '#1a1426';
      g.beginPath();
      g.ellipse(X(ho.x), Y(ho.y), 0.55 * PX, 0.55 * PX, 0, 0, TAU);
      g.fill();
      g.strokeStyle = '#9a8ab0';
      g.lineWidth = 2;
      g.stroke();
    }
  }));
  groundTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const ground = addMesh(new THREE.Mesh(keep(new THREE.PlaneGeometry(W, L)), keep(new THREE.MeshLambertMaterial({ map: groundTex }))));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(W / 2, 0, -L / 2);
  const beach = !!level.theme.beach;
  const ferry = level.goal.kind === 'ferry';
  // everything round the edges: pavement, and the beach and sea where there are some
  const outer = addMesh(new THREE.Mesh(keep(new THREE.PlaneGeometry(W + 120, L + 120)), keep(new THREE.MeshLambertMaterial({ color: '#efc9b8' }))));
  outer.rotation.x = -Math.PI / 2;
  outer.position.set(W / 2, -0.02, -L / 2);
  const seaMat = keep(new THREE.MeshLambertMaterial({ color: '#19c3d6' }));
  const sandMat = keep(new THREE.MeshLambertMaterial({ color: '#f6d892' }));
  const flat = (mat, x0, y0, x1, y1, hgt) => {
    const m = addMesh(new THREE.Mesh(keep(new THREE.PlaneGeometry(x1 - x0, y1 - y0)), mat));
    m.rotation.x = -Math.PI / 2;
    m.position.set((x0 + x1) / 2, hgt, -(y0 + y1) / 2);
    return m;
  };
  if (beach) {
    flat(sandMat, W, -60, W + 7, L + 60, -0.01);
    flat(seaMat, W + 7, -60, W + 80, L + 60, -0.12);
  }
  if (ferry) flat(seaMat, -60, L, W + 60, L + 60, -0.12);

  // ---- the city: buildings in the level (fade-able) and round the edges (not) ----
  const city = makeBuilder();
  const props = makeBuilder(); // ladders, slides and the like
  const neon = makeBuilder(); // glowing strips
  const signs = makeBuilder(); // neon words (textured)

  function building(b, tag, signWord) {
    const { x, y, w, d, h } = b;
    const cx = x + w / 2;
    const cz = -(y + d / 2);
    const body = PASTELS[b.tint % PASTELS.length];
    city.box(w, h, d, cx, h / 2, cz, body, tag);
    city.box(w + 0.1, 0.35, d + 0.1, cx, 0.175, cz, shade(body, 0.78), tag);
    // ribbon windows round every floor, with a white ledge above each
    const floors = Math.max(1, Math.round((h - 0.5) / 1.25));
    const fh = (h - 0.6) / floors;
    for (let f = 0; f < floors; f++) {
      const ym = 0.45 + fh * f + fh * 0.45;
      const hh = fh * 0.42;
      if (w > 1.2) {
        city.box(w - 0.7, hh, 0.06, cx, ym, -y + 0.02, GLASS, tag);
        city.box(w - 0.7, hh, 0.06, cx, ym, -(y + d) - 0.02, GLASS, tag);
      }
      if (d > 1.2) {
        city.box(0.06, hh, d - 0.7, x - 0.02, ym, cz, GLASS, tag);
        city.box(0.06, hh, d - 0.7, x + w + 0.02, ym, cz, GLASS, tag);
      }
      city.box(w + 0.16, 0.08, d + 0.16, cx, ym + hh / 2 + 0.07, cz, TRIM, tag);
    }
    // the roof: a light deck with a low wall round it
    city.box(w - 0.02, 0.04, d - 0.02, cx, h - 0.01, cz, shade(body, 1.55), tag);
    const pw = 0.12;
    const ph = 0.24;
    city.box(w, ph, pw, cx, h + ph / 2, -y - pw / 2, TRIM, tag);
    city.box(w, ph, pw, cx, h + ph / 2, -(y + d) + pw / 2, TRIM, tag);
    city.box(pw, ph, d, x + pw / 2, h + ph / 2, cz, TRIM, tag);
    city.box(pw, ph, d, x + w - pw / 2, h + ph / 2, cz, TRIM, tag);
    // a door
    city.box(0.8, 1.1, 0.06, x + w * 0.25, 0.55, -y + 0.04, '#5a3a5a', tag);
    // a deco fin on the front, edged in neon
    if (w > 2.5) {
      neon.box(0.1, h - 0.9, 0.08, x + w * 0.7, (h - 0.9) / 2 + 0.5, -y + 0.05, NEON[(b.tint + 1) % NEON.length], -1);
      city.box(0.3, 0.55, 0.14, x + w * 0.7, h + 0.27, -y - 0.07, TRIM, tag);
    }
    if (signWord >= 0 && w > 2.8 && h > 2.6) {
      // a neon word over the door: a quad using one row of the sheet
      const sw = Math.min(2.4, w - 1.2);
      const sh = 0.5;
      const g = new THREE.PlaneGeometry(sw, sh);
      const uvs = g.attributes.uv;
      const row = signWord % WORDS.length;
      for (let i = 0; i < uvs.count; i++) uvs.setY(i, 1 - (row + 1 - uvs.getY(i)) / WORDS.length);
      g.translate(x + w * 0.32, Math.min(h - 0.5, 1.75), -y + 0.07);
      signs.add(g, '#ffffff', -1);
    }
  }
  level.buildings.forEach((b, i) => building(b, i, i));

  // the street walls of the city past the map's sides (and behind the start)
  const scenery = [];
  for (const side of [-1, 1]) {
    if (side > 0 && beach) continue;
    let y = -14;
    let k = side > 0 ? 3 : 0;
    while (y < L + (ferry ? 0 : 14)) {
      const d = 4 + ((k * 7) % 4);
      const w = 5 + ((k * 3) % 3);
      const h = 3.5 + ((k * 5) % 4) * 0.9;
      const x = side < 0 ? -1.2 - w : W + 1.2;
      scenery.push({ x, y, w, d, h, tint: k });
      y += d + 0.4;
      k++;
    }
  }
  for (let x = -6; x < W + 6; x += 7) scenery.push({ x, y: -9, w: 6.2, d: 6, h: 4 + (Math.abs(x) % 3), tint: Math.abs(Math.round(x)) });
  if (!ferry) for (let x = -6; x < W + 6; x += 7) scenery.push({ x, y: L + 3, w: 6.2, d: 6, h: 4 + (Math.abs(x) % 2) * 1.5, tint: Math.abs(Math.round(x)) + 2 });
  scenery.forEach((b, i) => building(b, -1, i % 3 === 0 ? i + 3 : -1));

  // palm trees along the pavements, and on the sand
  const palmSpots = [];
  for (let y = 3; y < L; y += 7) {
    palmSpots.push([-0.6, y]);
    palmSpots.push(beach ? [W + 2.5, y + 2] : [W + 0.6, y + 3.5]);
    if (beach) palmSpots.push([W + 5, y + 5]);
  }
  for (const [x, y] of palmSpots) palm(city, x, y, 3.6, -1, (x * 7 + y) % 1);

  function palm(B, x, y, hgt, tag, lean = 0) {
    const z = -y;
    const segs = 6;
    for (let i = 0; i < segs; i++) {
      const k0 = i / segs;
      const k1 = (i + 1) / segs;
      const bend = (k) => k * k * 0.5 * (lean > 0.5 ? 1 : -1);
      B.beam([x + bend(k0), hgt * k0, z], [x + bend(k1), hgt * k1, z], 0.26 - i * 0.02, i % 2 ? '#8a5a34' : '#7a4a2b', tag);
    }
    const tx = x + 0.5 * (lean > 0.5 ? 1 : -1);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU;
      B.box(1.5, 0.08, 0.42, tx + Math.cos(a) * 0.62, hgt - 0.12, z + Math.sin(a) * 0.62, k % 2 ? '#2bb35a' : '#1f9d55', tag, -a, 0, -0.32);
    }
    B.ball(0.14, tx + 0.12, hgt - 0.2, z + 0.1, '#5a3a1a', tag);
    B.ball(0.14, tx - 0.1, hgt - 0.22, z - 0.08, '#5a3a1a', tag);
  }

  // ---- links: ladders, fire escapes, crates, palms, trampolines, slides, zip lines, hops ----
  const S = (x, y, h) => [x, h, -y]; // sim point to scene
  const drawn = new Set();
  for (const link of level.links) {
    const key = `${link.type}:${link.P ? link.P.join() : ''}:${link.b ?? ''}`;
    if (link.kind === 'climb' || link.kind === 'bounce') {
      if (drawn.has(key)) continue; // up and down share one ladder
      drawn.add(key);
    }
    const { P, o, tg, H } = link;
    if (link.type === 'ladder') {
      const out = 0.14;
      for (const s of [-0.3, 0.3]) {
        const bx = P[0] + o[0] * out + tg[0] * s;
        const by = P[1] + o[1] * out + tg[1] * s;
        props.beam(S(bx, by, 0), S(bx, by, H + 0.7), 0.08, '#ffd23f', -1);
      }
      for (let hh = 0.35; hh < H + 0.5; hh += 0.38) {
        const a = [P[0] + o[0] * out - tg[0] * 0.3, P[1] + o[1] * out - tg[1] * 0.3];
        const b = [P[0] + o[0] * out + tg[0] * 0.3, P[1] + o[1] * out + tg[1] * 0.3];
        props.beam(S(a[0], a[1], hh), S(b[0], b[1], hh), 0.06, '#ff9f1c', -1);
      }
    } else if (link.type === 'stairs') {
      // a fire escape: landings with railings and zig-zag flights between them
      const flights = 3;
      const out = 0.6;
      const iron = '#3a2f4a';
      for (let f = 0; f <= flights; f++) {
        const hh = (H * f) / flights;
        const c = [P[0] + o[0] * out, P[1] + o[1] * out];
        if (f > 0) {
          props.box(Math.abs(tg[0]) * 1.8 + Math.abs(o[0]) * 0.9, 0.06, Math.abs(tg[1]) * 1.8 + Math.abs(o[1]) * 0.9, c[0], hh, -c[1], iron, -1);
          const r0 = [c[0] + o[0] * 0.45 - tg[0] * 0.9, c[1] + o[1] * 0.45 - tg[1] * 0.9];
          const r1 = [c[0] + o[0] * 0.45 + tg[0] * 0.9, c[1] + o[1] * 0.45 + tg[1] * 0.9];
          props.beam(S(r0[0], r0[1], hh + 0.45), S(r1[0], r1[1], hh + 0.45), 0.05, iron, -1);
        }
        if (f < flights) {
          const side = f % 2 ? 1 : -1;
          const a = [c[0] - tg[0] * 0.65 * side, c[1] - tg[1] * 0.65 * side];
          const b = [c[0] + tg[0] * 0.65 * side, c[1] + tg[1] * 0.65 * side];
          props.beam(S(a[0], a[1], hh), S(b[0], b[1], (H * (f + 1)) / flights), 0.08, iron, -1, 0.55);
        }
      }
      for (const s of [-0.9, 0.9]) {
        const bx = P[0] + o[0] * 1.02 + tg[0] * s;
        const by = P[1] + o[1] * 1.02 + tg[1] * s;
        props.beam(S(bx, by, 0), S(bx, by, H + 0.5), 0.06, iron, -1);
      }
    } else if (link.type === 'crates') {
      const cols = [[1.55, 1], [0.95, 2], [0.38, 3]];
      for (const [d, n] of cols) {
        for (let k = 0; k < n; k++) {
          const ch = H / 3;
          const cx = P[0] + o[0] * d;
          const cy = P[1] + o[1] * d;
          const sx = Math.abs(tg[0]) * 1.25 + Math.abs(o[0]) * 0.58;
          const sz = Math.abs(tg[1]) * 1.25 + Math.abs(o[1]) * 0.58;
          props.box(sx, ch - 0.04, sz, cx, ch * k + ch / 2, -cy, (k + n) % 2 ? '#c98a55' : '#b07a4a', -1);
          props.box(sx + 0.02, 0.07, sz + 0.02, cx, ch * k + ch * 0.8, -cy, '#8a5a34', -1);
        }
      }
    } else if (link.type === 'palm') {
      const px = P[0] + o[0] * 0.42;
      const py = P[1] + o[1] * 0.42;
      palm(props, px, py, H + 1.1, -1, 0.2);
    } else if (link.type === 'bounce') {
      // a striped awning over a trampoline
      const c = [P[0] + o[0] * 0.9, P[1] + o[1] * 0.9];
      props.cyl(0.75, 0.75, 0.14, c[0], 0.32, -c[1], '#29b6f6', -1, 16);
      props.cyl(0.66, 0.66, 0.16, c[0], 0.34, -c[1], '#1a1426', -1, 16);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * TAU + 0.4;
        props.box(0.08, 0.3, 0.08, c[0] + Math.cos(a) * 0.65, 0.12, -(c[1] + Math.sin(a) * 0.65), '#29b6f6', -1);
      }
      for (let k = 0; k < 6; k++) {
        const s = (k / 5 - 0.5) * 1.6;
        const a = [P[0] + o[0] * 0.05 + tg[0] * s, P[1] + o[1] * 0.05 + tg[1] * s];
        const b = [P[0] + o[0] * 1.1 + tg[0] * s, P[1] + o[1] * 1.1 + tg[1] * s];
        props.beam(S(a[0], a[1], 2.4), S(b[0], b[1], 1.95), 0.05, k % 2 ? '#ffffff' : '#ff3d9a', -1, 0.34);
      }
    } else if (link.type === 'slide') {
      // a chute that follows the slide's own path
      const n = 14;
      let prev = null;
      for (let i = 0; i <= n; i++) {
        const q = linkPos(link, 0.5, i / n);
        const pt = S(q.x, q.y, q.h + 0.02);
        if (prev) {
          props.beam(prev, pt, 0.08, '#29f0ff', -1, 0.9);
          for (const s of [-0.45, 0.45]) {
            const a = [prev[0] + tg[0] * s, prev[1] + 0.12, prev[2] - tg[1] * s];
            const b = [pt[0] + tg[0] * s, pt[1] + 0.12, pt[2] - tg[1] * s];
            props.beam(a, b, 0.1, '#ff3d9a', -1);
          }
        }
        prev = pt;
      }
      const end = linkEnd(link, 0.5);
      for (let i = 1; i < 4; i++) {
        const q = linkPos(link, 0.5, i / 4);
        if (q.h > 0.4) props.beam(S(q.x, q.y, 0), S(q.x, q.y, q.h - 0.05), 0.1, '#fff6ea', -1);
      }
      props.cyl(0.5, 0.5, 0.06, end[0], 0.03, -end[1], '#29f0ff', -1, 12);
    } else if (link.type === 'zip') {
      const a = linkStart(link, 0.5);
      const b = linkEnd(link, 0.5);
      props.beam(S(a[0], a[1], link.hA), S(a[0], a[1], link.hA + ZIP_TOP + 0.1), 0.12, '#3a2f4a', -1);
      props.beam(S(b[0], b[1], 0), S(b[0], b[1], ZIP_END + 0.1), 0.14, '#3a2f4a', -1);
      props.box(0.3, 0.3, 0.3, b[0], ZIP_END + 0.2, -b[1], '#ff3d9a', -1);
      let prev = null;
      for (let i = 0; i <= 16; i++) {
        const k = i / 16;
        const pt = S(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, zipLineHeight(link, k));
        if (prev) props.beam(prev, pt, 0.04, '#1a1426', -1);
        prev = pt;
      }
    } else if (link.type === 'hop') {
      // yellow arrows at the roof edge, pointing over the gap
      const c = [(link.a0[0] + link.a1[0]) / 2, (link.a0[1] + link.a1[1]) / 2];
      const n = link.n;
      for (const s of [-0.7, 0, 0.7]) {
        const t = [-n[1], n[0]];
        const bx = c[0] + t[0] * s + n[0] * 0.1;
        const by = c[1] + t[1] * s + n[1] * 0.1;
        const g = new THREE.CylinderGeometry(0.28, 0.28, 0.03, 3);
        g.rotateY(-Math.atan2(n[1], n[0]));
        g.translate(bx, link.hA + 0.03, -by);
        props.add(g, '#ffd23f', -1);
      }
    }
  }

  // ---- the getaway ----
  const G = level.goal;
  const gx = G.x + G.w / 2;
  const gy = G.y + G.d / 2;
  if (G.kind === 'truck') {
    const tx = gx;
    const ty = G.y + G.d + 1.4;
    const z = -ty;
    city.box(3.6, 1.6, 1.8, tx - 0.4, 1.2, z, '#fff6ea', -1);
    city.box(3.62, 0.3, 1.82, tx - 0.4, 0.75, z, '#ff3d9a', -1);
    city.box(1.1, 1.1, 1.7, tx + 1.9, 0.95, z, '#ff9ec7', -1);
    city.box(0.06, 0.5, 1.4, tx + 2.46, 1.25, z, '#bff8ff', -1);
    city.box(1.6, 0.7, 0.06, tx - 0.4, 1.4, z + 0.92, '#4fc9ff', -1);
    for (const [wx, wz] of [[-1.5, 0.9], [-1.5, -0.9], [1.6, 0.9], [1.6, -0.9]]) city.cyl(0.34, 0.34, 0.22, tx + wx, 0.34, z + wz, '#1c1528', -1, 12, Math.PI / 2);
    city.cyl(0.36, 0.06, 0.9, tx - 0.4, 2.35, z, '#e0a050', -1, 10, Math.PI);
    city.ball(0.5, tx - 0.4, 3.0, z, '#ff9ec7', -1);
    city.ball(0.3, tx - 0.3, 3.45, z, '#ff3d9a', -1);
  } else if (G.kind === 'police') {
    const z = -(G.y + G.d + 2.4);
    city.box(G.w + 1, 3.2, 3.6, gx, 1.6, z, '#e8f0ff', -1);
    city.box(G.w + 1.2, 0.4, 3.8, gx, 3.3, z, '#2a5bd7', -1);
    city.box(G.w + 1.04, 0.3, 3.64, gx, 0.9, z, '#2a5bd7', -1);
    city.box(1.4, 1.8, 0.08, gx, 0.9, z + 1.82, '#4a6a9a', -1);
    neon.box(0.5, 0.35, 0.5, gx - 1, 3.75, z, '#3a7bff', -1);
    neon.box(0.5, 0.35, 0.5, gx + 1, 3.75, z, '#ff2d46', -1);
    for (const s of [-1, 1]) city.box(0.4, 3.0, 0.4, gx + s * 1.1, 1.5, z + 1.9, '#ffffff', -1);
  } else {
    // a little ferry boat at the end of the dock
    const z = -(L + 2.6);
    city.box(G.w + 2, 1.0, 3.6, gx, 0.1, z, '#ffffff', -1);
    city.box(G.w + 2.1, 0.25, 3.7, gx, 0.55, z, '#19c3d6', -1);
    city.box(G.w - 0.4, 1.1, 2.6, gx, 1.2, z, '#fff6ea', -1);
    city.box(G.w - 0.3, 0.3, 2.7, gx, 1.85, z, '#ff3d9a', -1);
    city.box(1.2, 0.9, 1.2, gx + 1, 2.4, z, '#ffffff', -1);
    city.cyl(0.25, 0.25, 1.0, gx - 1.2, 2.5, z, '#ffd23f', -1);
    for (let i = 0; i < 4; i++) city.box(0.5, 0.45, 0.05, gx - 2 + i * 1.3, 1.25, z + 1.32, '#4fc9ff', -1);
  }

  const build = (B, mat) => {
    if (B.empty()) return null;
    const geo = keep(B.build());
    return addMesh(new THREE.Mesh(geo, mat));
  };
  build(city, cityMat);
  build(props, vcol);
  build(neon, glow);
  const signTex = keep(neonSheet());
  build(signs, keep(new THREE.MeshBasicMaterial({ map: signTex, transparent: true })));

  // ---- big bobbing arrows: over the getaway, and over each ladder that teaches something ----
  const arrowGeo = (() => {
    const head = new THREE.ConeGeometry(0.75, 1.0, 4);
    head.rotateX(Math.PI);
    head.rotateY(Math.PI / 4);
    const shaft = new THREE.BoxGeometry(0.5, 0.9, 0.5);
    shaft.translate(0, 0.9, 0);
    const B = makeBuilder();
    B.add(head, '#ffe14d');
    B.add(shaft, '#ffe14d');
    return keep(B.build());
  })();
  const arrowMat = keep(new THREE.MeshBasicMaterial({ color: '#ffe14d' }));
  const arrows = [];
  const goalArrow = new THREE.Mesh(arrowGeo, keep(new THREE.MeshBasicMaterial({ color: '#7dff6a' })));
  goalArrow.userData = { x: gx, y: gy, h: 3.6 };
  scene.add(goalArrow);
  arrows.push(goalArrow);
  const hintArrows = [];
  for (const link of level.links) {
    if (!link.hint) continue;
    const c = linkStart(link, 0.5);
    const m = new THREE.Mesh(arrowGeo, arrowMat);
    m.userData = { x: c[0], y: c[1], h: heightOfLayer(link.from) + 2.6, link: link.id };
    scene.add(m);
    arrows.push(m);
    hintArrows.push(m);
  }
  function heightOfLayer(layer) {
    return layer === STREET ? 0 : level.buildings[layer - 1].h;
  }
  const ringGeo = keep(new THREE.RingGeometry(0.42, 0.56, 24).rotateX(-Math.PI / 2));
  const padRing = new THREE.Mesh(keep(new THREE.RingGeometry(Math.min(G.w, G.d) * 0.3, Math.min(G.w, G.d) * 0.4, 32)), keep(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, depthWrite: false })));
  padRing.rotation.x = -Math.PI / 2;
  padRing.position.set(gx, 0.03, -gy);
  scene.add(padRing);

  // ---- people ----
  const POOL = level.total;
  const personMat = () => keep(new THREE.MeshLambertMaterial({ color: '#ffffff' }));
  const inst = (geo, mat, count) => {
    const m = new THREE.InstancedMesh(keep(geo), mat, Math.max(1, count));
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.count = 0;
    scene.add(m);
    return m;
  };
  const limb = (h, w = 0.1) => new THREE.BoxGeometry(w, h, w).translate(0, -h / 2, 0);
  const P = {
    body: inst(new THREE.CapsuleGeometry(0.17, 0.24, 3, 8), personMat(), POOL),
    head: inst(new THREE.SphereGeometry(0.17, 10, 8), personMat(), POOL),
    hair: inst(new THREE.SphereGeometry(0.18, 10, 6, 0, TAU, 0, Math.PI * 0.5), personMat(), POOL),
    legL: inst(limb(0.34, 0.11), personMat(), POOL),
    legR: inst(limb(0.34, 0.11), personMat(), POOL),
    armL: inst(limb(0.3, 0.09), personMat(), POOL),
    armR: inst(limb(0.3, 0.09), personMat(), POOL),
  };
  const pParts = Object.values(P);
  const col = (list) => list.map((c) => new THREE.Color(c));
  const shirtC = col(SHIRTS);
  const skinC = col(SKINS);
  const hairC = col(HAIR);
  const shortsC = col(SHORTS);
  // the leader's cap and ring
  const cap = new THREE.Group();
  const capMat = keep(new THREE.MeshLambertMaterial({ color: '#ff2d46' }));
  const capTop = new THREE.Mesh(keep(new THREE.SphereGeometry(0.19, 12, 6, 0, TAU, 0, Math.PI * 0.5)), capMat);
  const brim = new THREE.Mesh(keep(new THREE.BoxGeometry(0.26, 0.03, 0.22)), capMat);
  brim.position.set(0, 0.0, -0.22);
  const pom = new THREE.Mesh(keep(new THREE.SphereGeometry(0.05, 6, 4)), keep(new THREE.MeshLambertMaterial({ color: '#ffffff' })));
  pom.position.y = 0.19;
  cap.add(capTop, brim, pom);
  scene.add(cap);
  const leaderRing = new THREE.Mesh(keep(new THREE.RingGeometry(0.5, 0.68, 28)), keep(new THREE.MeshBasicMaterial({ color: '#ffe14d', transparent: true, opacity: 0.95, depthWrite: false })));
  leaderRing.rotation.x = -Math.PI / 2;
  scene.add(leaderRing);
  // rings under friends waiting to be picked up
  const waitRings = inst(ringGeo, keep(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false })), POOL);

  // ---- robbers ----
  const RN = Math.max(1, level.robbers.length);
  const stripeTex = keep(stripes());
  const stripeMat = keep(new THREE.MeshLambertMaterial({ map: stripeTex }));
  const darkMat = keep(new THREE.MeshLambertMaterial({ color: '#1a1426' }));
  const faceGeo = (() => {
    const B = makeBuilder();
    B.cyl(0.205, 0.205, 0.1, 0, 0.02, 0, '#1a1426', -1, 14); // the mask
    B.ball(0.045, -0.075, 0.025, -0.18, '#ffffff', -1);
    B.ball(0.045, 0.075, 0.025, -0.18, '#ffffff', -1);
    B.ball(0.022, -0.075, 0.025, -0.215, '#1a1426', -1);
    B.ball(0.022, 0.075, 0.025, -0.215, '#1a1426', -1);
    const beanie = new THREE.SphereGeometry(0.2, 12, 6, 0, TAU, 0, Math.PI * 0.5);
    beanie.translate(0, 0.07, 0);
    B.add(beanie, '#1a1426');
    B.cyl(0.21, 0.21, 0.07, 0, 0.08, 0, '#2a2236', -1, 14);
    B.ball(0.05, 0.0, 0.29, 0.0, '#ff3d9a', -1);
    B.box(0.12, 0.03, 0.04, 0, -0.1, -0.17, '#c45a5a', -1); // a grin
    return B.build();
  })();
  const sackGeo = (() => {
    const B = makeBuilder();
    B.ball(0.3, 0, 0, 0, '#d9b98a', -1, 1.1);
    B.cyl(0.08, 0.14, 0.14, 0, 0.32, 0, '#c4a070', -1, 8);
    B.cyl(0.1, 0.1, 0.05, 0, 0.27, 0, '#8a5a34', -1, 8);
    B.box(0.12, 0.12, 0.02, 0, 0.0, 0.3, '#c4a070', -1); // a patch
    return B.build();
  })();
  const R = {
    body: inst(new THREE.CapsuleGeometry(0.19, 0.26, 3, 10), stripeMat, RN),
    head: inst(new THREE.SphereGeometry(0.18, 10, 8), keep(new THREE.MeshLambertMaterial({ color: '#f2c9a0' })), RN),
    face: inst(faceGeo, vcol, RN),
    legL: inst(limb(0.36, 0.12), darkMat, RN),
    legR: inst(limb(0.36, 0.12), darkMat, RN),
    armL: inst(limb(0.32, 0.1), stripeMat, RN),
    armR: inst(limb(0.32, 0.1), stripeMat, RN),
    sack: inst(sackGeo, vcol, RN),
    peek: inst(new THREE.SphereGeometry(0.15, 10, 8), personMat(), RN),
  };
  const rParts = Object.values(R);
  const peekHair = inst(new THREE.SphereGeometry(0.16, 10, 6, 0, TAU, 0, Math.PI * 0.5), personMat(), RN);

  // dizzy stars round a bumped robber's head
  const STARS = 5;
  const dizzy = inst(new THREE.OctahedronGeometry(0.09, 0), keep(new THREE.MeshBasicMaterial({ color: '#ffe14d' })), RN * STARS);

  // blob shadows
  const shadows = inst(new THREE.CircleGeometry(0.34, 14).rotateX(-Math.PI / 2), keep(new THREE.MeshBasicMaterial({ color: '#160b33', transparent: true, opacity: 0.28, depthWrite: false })), POOL + RN);

  // ---- particles: puffs, sparkles ----
  const PARTS = 120;
  const parts = inst(new THREE.IcosahedronGeometry(0.12, 0), keep(new THREE.MeshBasicMaterial({ color: '#ffffff' })), PARTS);
  parts.count = PARTS;
  const Pp = { x: new Float32Array(PARTS), y: new Float32Array(PARTS), z: new Float32Array(PARTS), vx: new Float32Array(PARTS), vy: new Float32Array(PARTS), vz: new Float32Array(PARTS), life: new Float32Array(PARTS), size: new Float32Array(PARTS), g: new Float32Array(PARTS) };
  const tmpC = new THREE.Color();
  for (let i = 0; i < PARTS; i++) parts.setColorAt(i, tmpC.set('#ffffff'));
  let nextPart = 0;
  let seed = 1;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  function emit(x, y, h, n, speed, colour, size = 1, grav = 9) {
    tmpC.set(colour);
    for (let k = 0; k < n; k++) {
      const i = nextPart;
      nextPart = (nextPart + 1) % PARTS;
      const a = rnd() * TAU;
      const sp = speed * (0.4 + rnd() * 0.6);
      Pp.x[i] = x;
      Pp.y[i] = h;
      Pp.z[i] = -y;
      Pp.vx[i] = Math.cos(a) * sp;
      Pp.vz[i] = Math.sin(a) * sp;
      Pp.vy[i] = speed * (0.6 + rnd());
      Pp.life[i] = 0.6 + rnd() * 0.4;
      Pp.size[i] = size * (0.7 + rnd() * 0.6);
      Pp.g[i] = grav;
      parts.setColorAt(i, tmpC);
    }
    parts.instanceColor.needsUpdate = true;
  }

  // ---- per-frame helpers ----
  const d = new THREE.Object3D();
  d.rotation.order = 'YXZ';
  const yawOf = (face) => Math.atan2(-Math.cos(face), Math.sin(face));
  // place a part at a point `l` (local, in the body's own frame) from the feet at (bx, by, bz)
  function put(mesh, i, bx, by, bz, yaw, lx, ly, lz, rx = 0, rz = 0, s = 1, sx = 1, sy = 1, sz = 1) {
    const c = Math.cos(yaw);
    const sn = Math.sin(yaw);
    const wx = lx * c + lz * sn;
    const wz = -lx * sn + lz * c;
    d.position.set(bx + wx * s, by + ly * s, bz + wz * s);
    d.rotation.set(rx, yaw, rz);
    d.scale.set(s * sx, s * sy, s * sz);
    d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
  }
  function flatAt(mesh, i, x, y, h, s = 1) {
    d.position.set(x, h, -y);
    d.rotation.set(0, 0, 0);
    d.scale.set(s, s, s);
    d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
  }

  // one little person, feet at (x, h, -y)
  function drawPerson(i, x, y, h, yaw, o) {
    const s = o.s ?? 1;
    const swing = o.swing ?? 0;
    const bob = Math.abs(Math.sin(swing)) * 0.07 + (o.hop ?? 0);
    const a = Math.sin(swing) * (o.run ?? 0.9);
    const bz = -y;
    const lean = o.lean ?? 0;
    put(P.body, i, x, h, bz, yaw, 0, 0.55 + bob, 0, lean, 0, s);
    put(P.head, i, x, h, bz, yaw, 0, 0.93 + bob, -lean * 0.3, 0, 0, s);
    put(P.hair, i, x, h, bz, yaw, 0, 0.95 + bob, 0.02 - lean * 0.3, -0.25 + lean, 0, s);
    put(P.legL, i, x, h, bz, yaw, -0.08, 0.36 + bob, 0, a, 0, s);
    put(P.legR, i, x, h, bz, yaw, 0.08, 0.36 + bob, 0, -a, 0, s);
    const up = o.reach ?? 0; // 0 arms down, 1 arms up
    const waveL = o.wave ? Math.sin(o.wave) * 0.5 : 0;
    const waveR = o.wave ? Math.sin(o.wave + 1.5) * 0.5 : 0;
    put(P.armL, i, x, h, bz, yaw, -0.23, 0.76 + bob, 0, -a * (1 - up), 0.15 + up * 2.7 + waveL, s);
    put(P.armR, i, x, h, bz, yaw, 0.23, 0.76 + bob, 0, a * (1 - up), -0.15 - up * 2.7 - waveR, s);
  }

  function drawRobber(i, r, run, t, captive) {
    const s = 1.12;
    const moving = r.speed > 0.2;
    const swing = r.phase;
    const bob = moving ? Math.abs(Math.sin(swing)) * 0.08 : 0;
    const a = moving ? Math.sin(swing) * 0.9 : 0;
    const x = r.x;
    const bz = -r.y;
    let yaw = yawOf(r.face);
    let tilt = 0;
    let squash = 1;
    if (r.state === 'dizzy') {
      yaw += Math.sin(t * 7) * 0.4;
      tilt = Math.sin(t * 5) * 0.15;
    } else if (r.state === 'confused') {
      yaw += Math.sin(t * 2.2 + r.id) * 0.9; // looking round for the crowd
    } else if (r.state === 'grab') {
      squash = 1 + Math.sin(Math.min(1, r.t / 0.3) * Math.PI) * 0.15;
    } else if (r.state === 'wait') {
      yaw = yawOf(-Math.PI / 2) + Math.sin(t * 0.8 + r.id) * 0.6;
    }
    put(R.body, i, x, 0, bz, yaw, 0, 0.6 + bob, 0, tilt, 0, s, 1, squash, 1);
    put(R.head, i, x, 0, bz, yaw, 0, 1.02 + bob, 0, tilt, 0, s);
    put(R.face, i, x, 0, bz, yaw, 0, 1.02 + bob, 0, tilt, 0, s);
    put(R.legL, i, x, 0, bz, yaw, -0.09, 0.4 + bob, 0, a, 0, s);
    put(R.legR, i, x, 0, bz, yaw, 0.09, 0.4 + bob, 0, -a, 0, s);
    // one arm holds the sack over his shoulder
    const carry = captive >= 0;
    put(R.armL, i, x, 0, bz, yaw, -0.25, 0.84 + bob, 0, -a, 0.2 + (r.state === 'grab' ? 2.2 : 0), s);
    put(R.armR, i, x, 0, bz, yaw, 0.25, 0.84 + bob, 0, carry ? -0.4 : a, carry ? -2.6 : -0.2, s);
    const full = carry ? 1 : 0;
    const wig = carry ? Math.sin(t * 14 + r.id) * 0.12 : 0;
    const sk = 0.55 + full * 0.55;
    put(R.sack, i, x, 0, bz, yaw, 0.2, 1.0 + bob + full * 0.2, 0.32, wig, wig, s, sk, sk * (1 + wig * 0.3), sk);
    if (carry) {
      put(R.peek, i, x, 0, bz, yaw, 0.2, 1.48 + bob + Math.abs(wig) * 0.6, 0.32, 0, 0, s);
      put(peekHair, i, x, 0, bz, yaw, 0.2, 1.5 + bob + Math.abs(wig) * 0.6, 0.34, -0.25, 0, s);
      R.peek.setColorAt(i, skinC[(captive * 3) % skinC.length]);
      peekHair.setColorAt(i, hairC[(captive * 7 + 1) % hairC.length]);
    } else {
      put(R.peek, i, x, -50, bz, yaw, 0, 0, 0, 0, 0, 0.001);
      put(peekHair, i, x, -50, bz, yaw, 0, 0, 0, 0, 0, 0.001);
    }
  }

  // ---- camera ----
  const PITCH = (56 * Math.PI) / 180;
  const FOV = 45;
  let width = 1;
  let height = 1;
  let halfW = 7;
  let dist = 20;
  const cam = { x: level.start.x, y: level.start.y, h: 0, spread: 0, ready: false };
  let overview = false;
  const projected = new THREE.Vector3();
  const phases = new Float32Array(POOL);
  const robberPhase = new Float32Array(RN);
  const fades = new Float32Array(level.buildings.length);
  let lastEventT = -1;
  let t = 0;

  function fitCamera(extra) {
    const aspect = width / height;
    // a phone shows a narrower slice of the street (the camera slides sideways), so people
    // stay a good size; an iPad shows most of the width
    const base = aspect < 0.6 ? 4.4 : 6.2;
    const want = clamp(base + extra, base, base + 4);
    halfW = want;
    const tanH = Math.tan((FOV * Math.PI) / 360);
    // wide enough for halfW either side, and never less than 13 units tall
    dist = Math.max(halfW / (tanH * aspect), (aspect < 0.6 ? 5.5 : 6.5) / tanH) * 0.98;
  }

  return {
    el,

    resize(w, h) {
      width = w;
      height = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = FOV;
      fitCamera(cam.spread);
      camera.updateProjectionMatrix();
    },

    // Screen position (CSS pixels) of a sim point.
    project(x, y, h = 0) {
      projected.set(x, h, -y).project(camera);
      return { x: (projected.x * 0.5 + 0.5) * width, y: (-projected.y * 0.5 + 0.5) * height, behind: projected.z > 1 };
    },

    setOverview(on) {
      overview = on;
    },

    render(run, dt) {
      t += dt;
      const time = run.time;

      // new events: puffs and sparkles
      if (run.events.length) {
        for (const e of run.events) {
          if (e.t <= lastEventT) continue;
          if (e.type === 'bonk') {
            emit(e.x, e.y, 0.7, 14, 2.2, '#ffffff', 1.6, 3);
            emit(e.x, e.y, 1.1, 6, 2.4, '#ffe14d', 0.8);
          } else if (e.type === 'join') emit(e.x, e.y, e.h + 0.8, 10, 2.0, '#ff9ec7', 0.8);
          else if (e.type === 'rescue') emit(e.x, e.y, 1.0, 16, 2.6, '#ffe14d', 0.9);
          else if (e.type === 'gone') emit(e.x, e.y, 0.4, 12, 1.8, '#3a2f4a', 1.3, 2);
          else if (e.type === 'aboard') emit(e.x, e.y, 0.8, 6, 2, '#7dff6a', 0.7);
          else if (e.type === 'win') emit(e.x, e.y, 1, 30, 4, '#ffe14d', 1);
        }
        lastEventT = run.events[run.events.length - 1].t;
      }

      // people
      let n = 0;
      let nw = 0;
      let ns = 0;
      const leader = run.leader >= 0 ? run.people[run.leader] : null;
      for (const p of run.people) {
        const i = p.id;
        if (p.state === 'sacked' || p.state === 'gone' || p.state === 'saved') continue;
        phases[i] += dt * (p.speed > 0.2 ? 2.6 + p.speed * 2.2 : 0);
        const yaw = yawOf(p.face);
        if (p.state === 'wait') {
          // waving, with a little hop now and then
          const hop = Math.max(0, Math.sin(t * 5 + i * 1.7)) * 0.12;
          drawPerson(n, p.x, p.y, p.h, yawOf(-Math.PI / 2) + Math.sin(t + i) * 0.3, { reach: 1, wave: t * 9 + i, hop, swing: 0 });
          flatAt(waitRings, nw++, p.x, p.y, p.h + 0.04, 1 + ((t * 0.9 + i * 0.3) % 1) * 0.6);
        } else if (p.state === 'link') {
          const link = level.links[p.link.id];
          let o;
          if (link.kind === 'climb') o = { reach: 1, swing: p.link.p * 26, run: 0.6, lean: 0 };
          else if (link.kind === 'zip') o = { reach: 1, swing: 0, run: 0.3 };
          else if (link.kind === 'slide') o = { reach: 0.6, swing: 0, run: 0, lean: -0.5 };
          else o = { reach: 0.8, swing: 1.2, run: 0.8 };
          let yy = yaw;
          if (link.kind === 'climb') yy = yawOf(Math.atan2(-link.o[1], -link.o[0])); // facing the wall
          drawPerson(n, p.x, p.y, p.h, yy, o);
        } else {
          const cheer = run.status === 'won' ? Math.abs(Math.sin(t * 8 + i)) * 0.3 : 0;
          drawPerson(n, p.x, p.y, p.h, yaw, { swing: phases[i], hop: cheer, reach: run.status === 'won' ? 1 : 0 });
          flatAt(shadows, ns++, p.x, p.y, p.h + 0.025);
        }
        n++;
        if (p === leader) {
          const s = 1;
          const bob = Math.abs(Math.sin(phases[i])) * 0.07;
          cap.position.set(p.x, p.h + (1.0 + bob) * s, -p.y);
          cap.rotation.set(0, p.state === 'link' && level.links[p.link.id].kind === 'climb' ? yawOf(Math.atan2(-level.links[p.link.id].o[1], -level.links[p.link.id].o[0])) : yaw, 0);
        }
      }
      // hide what's in the pool but unused
      for (const m of pParts) {
        m.count = n;
        m.instanceMatrix.needsUpdate = true;
      }
      // the people pool is indexed by draw order, so colours follow the person
      {
        let k = 0;
        for (const p of run.people) {
          if (p.state === 'sacked' || p.state === 'gone' || p.state === 'saved') continue;
          const c = shirtC[(p.id * 5 + 2) % shirtC.length];
          P.body.setColorAt(k, c);
          P.armL.setColorAt(k, c);
          P.armR.setColorAt(k, c);
          P.head.setColorAt(k, skinC[(p.id * 3) % skinC.length]);
          P.hair.setColorAt(k, hairC[(p.id * 7 + 1) % hairC.length]);
          P.legL.setColorAt(k, shortsC[p.id % shortsC.length]);
          P.legR.setColorAt(k, shortsC[p.id % shortsC.length]);
          k++;
        }
        for (const m of pParts) m.instanceColor.needsUpdate = true;
      }
      waitRings.count = nw;
      waitRings.instanceMatrix.needsUpdate = true;
      cap.visible = !!leader && inCrowd(leader);
      leaderRing.visible = cap.visible && leader.state === 'crowd';
      if (leaderRing.visible) {
        leaderRing.position.set(leader.x, leader.h + 0.035, -leader.y);
        leaderRing.scale.setScalar(1 + Math.sin(t * 6) * 0.08);
      }

      // robbers
      let nr = 0;
      let nd = 0;
      for (const r of run.robbers) {
        robberPhase[r.id] += dt * (r.speed > 0.2 ? 2.6 + r.speed * 2.2 : 0);
        r.phase = robberPhase[r.id];
        drawRobber(nr, r, run, t + r.id, r.captive);
        flatAt(shadows, ns++, r.x, r.y, 0.025, 1.15);
        if (r.state === 'dizzy') {
          for (let k = 0; k < STARS; k++) {
            const a = t * 6 + (k / STARS) * TAU;
            d.position.set(r.x + Math.cos(a) * 0.4, 1.55 + Math.sin(a * 2) * 0.05, -r.y + Math.sin(a) * 0.4);
            d.rotation.set(0, a * 2, 0);
            d.scale.setScalar(1);
            d.updateMatrix();
            dizzy.setMatrixAt(nd++, d.matrix);
          }
        }
        nr++;
      }
      for (const m of rParts) {
        m.count = nr;
        m.instanceMatrix.needsUpdate = true;
      }
      R.peek.instanceColor && (R.peek.instanceColor.needsUpdate = true);
      peekHair.count = nr;
      peekHair.instanceMatrix.needsUpdate = true;
      if (peekHair.instanceColor) peekHair.instanceColor.needsUpdate = true;
      dizzy.count = nd;
      dizzy.instanceMatrix.needsUpdate = true;
      shadows.count = ns;
      shadows.instanceMatrix.needsUpdate = true;

      // particles
      for (let i = 0; i < PARTS; i++) {
        if (Pp.life[i] > 0) {
          Pp.life[i] -= dt;
          Pp.vy[i] -= Pp.g[i] * dt;
          Pp.x[i] += Pp.vx[i] * dt;
          Pp.y[i] += Pp.vy[i] * dt;
          Pp.z[i] += Pp.vz[i] * dt;
          d.position.set(Pp.x[i], Pp.y[i], Pp.z[i]);
          d.scale.setScalar(Math.max(0.001, Pp.size[i] * Math.min(1, Pp.life[i] * 2.5)));
        } else {
          d.position.set(0, -50, 0);
          d.scale.setScalar(0.001);
        }
        d.rotation.set(0, 0, 0);
        d.updateMatrix();
        parts.setMatrixAt(i, d.matrix);
      }
      parts.instanceMatrix.needsUpdate = true;

      // arrows bob; a hint arrow goes once its link has been used
      for (const m of arrows) {
        const u = m.userData;
        m.position.set(u.x, u.h + Math.abs(Math.sin(t * 3.2)) * 0.6, -u.y);
        m.rotation.y = t * 1.5;
      }
      for (const m of hintArrows) {
        const used = run.linkLast[m.userData.link] > -99;
        m.visible = !used;
      }
      padRing.scale.setScalar(1 + ((t * 0.8) % 1) * 0.5);
      padRing.material.opacity = 0.8 * (1 - ((t * 0.8) % 1));

      // ---- camera: follow the crowd, with the leader a little below the middle ----
      let fx = level.start.x;
      let fy = level.start.y;
      let fh = 0;
      let crowdN = 0;
      let cxs = 0;
      let cys = 0;
      for (const p of run.people) {
        if (!inCrowd(p)) continue;
        crowdN++;
        cxs += p.x;
        cys += p.y;
      }
      if (leader && inCrowd(leader)) {
        fx = leader.x;
        fy = leader.y;
        fh = leader.state === 'link' ? leader.h : level.buildings[leader.layer - 1]?.h ?? 0;
        if (crowdN > 1) {
          fx = fx * 0.65 + (cxs / crowdN) * 0.35;
          fy = fy * 0.65 + (cys / crowdN) * 0.35;
        }
      } else if (crowdN) {
        fx = cxs / crowdN;
        fy = cys / crowdN;
      } else if (cam.ready) {
        fx = cam.x;
        fy = cam.y;
      }
      if (run.status === 'won') {
        fx = gx;
        fy = gy - 1;
        fh = 0;
      }
      // zoom out a little to keep chasing robbers and a stretched-out crowd in view
      let spread = 0;
      for (const p of run.people) if (inCrowd(p)) spread = Math.max(spread, Math.abs(p.y - fy) * 0.5, Math.abs(p.x - fx) * 0.6);
      for (const r of run.robbers) {
        if (r.state !== 'chase' && r.state !== 'carry' && r.state !== 'grab') continue;
        const dd = Math.hypot(r.x - fx, r.y - fy);
        if (dd < 11) spread = Math.max(spread, Math.abs(r.x - fx) * 0.75, Math.abs(r.y - fy) * 0.55);
      }
      spread = clamp(spread - 3, 0, 4);
      if (!cam.ready) {
        cam.x = fx;
        cam.y = fy;
        cam.h = fh;
        cam.spread = spread;
        cam.ready = true;
      }
      const k = Math.min(1, dt * 4);
      cam.x += (fx - cam.x) * k;
      cam.y += (fy - cam.y) * k;
      cam.h += (fh - cam.h) * Math.min(1, dt * 3);
      cam.spread += (spread - cam.spread) * Math.min(1, dt * 1.5);
      fitCamera(cam.spread);
      const slack = Math.max(0, W / 2 - halfW + 2.5);
      const lx = clamp(cam.x, W / 2 - slack, W / 2 + slack);
      // look a little north of the crowd, so more of the way ahead shows
      const ahead = 1.8;
      const ly = cam.y + ahead;
      const lh = cam.h * 0.85;
      if (overview) {
        camera.position.set(W / 2, Math.max(W, L) * 1.05, -L / 2 + L * 0.35);
        camera.lookAt(W / 2, 0, -L / 2);
      } else {
        camera.position.set(lx, lh + Math.sin(PITCH) * dist, -ly + Math.cos(PITCH) * dist);
        camera.lookAt(lx, lh, -ly);
      }
      scene.fog.near = overview ? 500 : dist + 6;
      scene.fog.far = overview ? 600 : dist + 30;
      camera.far = overview ? 600 : dist + 60;
      camera.updateProjectionMatrix();

      // fade buildings standing between the camera and the crowd
      const focus = leader && inCrowd(leader) ? leader : null;
      const tanP = Math.tan(PITCH);
      for (const b of level.buildings) {
        let want = 0;
        if (focus && !overview) {
          // never the building the leader is on, or climbing on or off
          const link = focus.state === 'link' ? level.links[focus.link.id] : null;
          const onIt = focus.layer === b.layer || (link && (link.from === b.layer || link.to === b.layer));
          const ph = focus.h;
          if (!onIt && b.h > ph + 0.3 && focus.x > b.x - 1.2 && focus.x < b.x + b.w + 1.2) {
            const gap = focus.y - (b.y + b.d); // how far north of the building's far wall
            if (focus.y > b.y - 0.5 && gap < (b.h - ph) / tanP + 1.2) want = 1;
          }
        }
        fades[b.i] += (want - fades[b.i]) * Math.min(1, dt * 6);
        fadeValues[b.i] = fades[b.i];
      }

      renderer.render(scene, camera);
    },

    dispose() {
      el.remove();
      for (const m of meshes) if (m.isInstancedMesh) m.dispose();
      for (const m of [...pParts, ...rParts, peekHair, dizzy, shadows, parts, waitRings]) m.dispose();
      for (const x of disposables) x.dispose();
      renderer.dispose();
    },
  };
}
