// The 3D view of a run, drawn with three.js. No game rules: it only reads the run.
// One grid square is one unit. Columns run along +x; rows run forward, which is -z in the scene.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COLS, KINDS, isSafe, moverX } from './level.js';
import { HOP_TIME, BONK_TIME } from './sim.js';

const MID = (COLS - 1) / 2;
const SIDE = 8; // squares of scenery past each edge of the map
const GROUND_W = COLS + SIDE * 2;
const WATER_Y = -0.24;
const BEHIND = 6; // grass rows drawn behind the start
const BEYOND = 34; // swamp rows drawn past the finish
const TINTS = ['#ff3d9a', '#1fc8d8', '#ffd23f', '#9b5cff', '#ff8a4c', '#59d86b'];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const wx = (col) => col - MID;

function canvasTexture(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  return t;
}

// ---- low-poly models: boxes (and a few other shapes) merged into one geometry with colours ----
// A part is { s: [w, h, d], p: [x, y, z], c: colour, r?: [rx, ry, rz], shape?: 'box' | 'cone' | 'ball' | 'cyl' | 'tri' }.
const tmpColor = new THREE.Color();
function model(parts) {
  if (!parts.length) return null;
  const geos = parts.map(({ s, p, c, r, shape = 'box' }) => {
    let g;
    if (shape === 'cone') g = new THREE.ConeGeometry(s[0] / 2, s[1], 8);
    else if (shape === 'ball') g = new THREE.IcosahedronGeometry(s[0] / 2, 1);
    else if (shape === 'cyl') g = new THREE.CylinderGeometry(s[0] / 2, s[0] / 2, s[1], 10);
    else if (shape === 'tri') g = new THREE.CylinderGeometry(s[0] / 2, s[0] / 2, s[1], 3);
    else g = new THREE.BoxGeometry(s[0], s[1], s[2]);
    if (shape !== 'box' && s[2] && shape !== 'ball') g.scale(1, 1, s[2] / s[0]);
    if (r) g.rotateX(r[0]).rotateY(r[1]).rotateZ(r[2]);
    g.translate(p[0], p[1], p[2]);
    const flat = g.index ? g.toNonIndexed() : g;
    if (flat !== g) g.dispose();
    tmpColor.set(c);
    const n = flat.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      col[i * 3] = tmpColor.r;
      col[i * 3 + 1] = tmpColor.g;
      col[i * 3 + 2] = tmpColor.b;
    }
    flat.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return flat;
  });
  const merged = mergeGeometries(geos);
  for (const g of geos) g.dispose();
  return merged;
}

const box = (s, p, c, r) => ({ s, p, c, r });
const wheels = (len, w, r = 0.36) => [
  box([r, r, 0.12], [len * 0.32, r / 2, w / 2], '#1c1528'),
  box([r, r, 0.12], [len * 0.32, r / 2, -w / 2], '#1c1528'),
  box([r, r, 0.12], [-len * 0.32, r / 2, w / 2], '#1c1528'),
  box([r, r, 0.12], [-len * 0.32, r / 2, -w / 2], '#1c1528'),
];
const rider = (x, y, shirt = '#ffffff', skin = '#d9a273') => [
  box([0.22, 0.3, 0.26], [x, y + 0.15, 0], shirt),
  box([0.2, 0.2, 0.2], [x + 0.02, y + 0.42, 0], skin),
];

// Each mover faces +x. `paint` takes the lane's tint colour, `trim` keeps its own colours.
const MODELS = {
  convertible: {
    paint: [box([1.8, 0.34, 0.82], [0, 0.32, 0]), box([0.5, 0.12, 0.8], [0.62, 0.52, 0])],
    trim: [
      ...wheels(1.8, 0.82),
      box([0.06, 0.26, 0.74], [0.32, 0.64, 0], '#bff8ff'),
      box([0.34, 0.26, 0.66], [-0.1, 0.6, 0], '#6b2d1c'),
      box([0.34, 0.26, 0.66], [-0.55, 0.6, 0], '#6b2d1c'),
      box([0.05, 0.12, 0.2], [0.91, 0.36, 0.26], '#fff3a8'),
      box([0.05, 0.12, 0.2], [0.91, 0.36, -0.26], '#fff3a8'),
      box([0.05, 0.12, 0.2], [-0.91, 0.36, 0.26], '#ff2d46'),
      box([0.05, 0.12, 0.2], [-0.91, 0.36, -0.26], '#ff2d46'),
      ...rider(-0.1, 0.5, '#ffe14d'),
    ],
  },
  truck: {
    paint: [box([0.7, 0.7, 0.86], [0.86, 0.5, 0]), box([1.82, 0.16, 0.92], [-0.35, 0.42, 0])],
    trim: [
      ...wheels(2.4, 0.86, 0.4),
      box([1.8, 1.1, 0.88], [-0.35, 0.82, 0], '#fff6ea'),
      box([0.9, 0.38, 0.9], [-0.35, 0.95, 0], '#4fc9ff'),
      box([0.06, 0.3, 0.7], [1.22, 0.65, 0], '#bff8ff'),
      box([0.26, 0.4, 0.26], [-0.45, 1.55, 0], '#e0a050', [Math.PI, 0, 0]),
      { s: [0.5, 0.5], p: [-0.45, 1.88, 0], c: '#ff9ec7', shape: 'ball' },
      { s: [0.3, 0.3], p: [-0.38, 2.12, 0], c: '#ff3d9a', shape: 'ball' },
    ],
  },
  scooter: {
    paint: [box([0.64, 0.24, 0.3], [0, 0.32, 0]), box([0.12, 0.42, 0.2], [0.3, 0.55, 0])],
    trim: [
      box([0.26, 0.26, 0.1], [0.28, 0.13, 0], '#1c1528'),
      box([0.26, 0.26, 0.1], [-0.28, 0.13, 0], '#1c1528'),
      box([0.06, 0.06, 0.42], [0.32, 0.78, 0], '#cccccc'),
      ...rider(-0.06, 0.44, '#ffffff', '#a86f44'),
      box([0.24, 0.12, 0.24], [-0.04, 0.95, 0], '#ff3d9a'),
    ],
  },
  skater: {
    paint: [box([0.26, 0.34, 0.3], [0, 0.66, 0])],
    trim: [
      box([0.62, 0.06, 0.24], [0, 0.12, 0], '#2b1055'),
      box([0.1, 0.08, 0.08], [0.2, 0.05, 0.1], '#ffe14d'),
      box([0.1, 0.08, 0.08], [-0.2, 0.05, -0.1], '#ffe14d'),
      box([0.12, 0.34, 0.12], [0.06, 0.32, 0.07], '#2a6fdb'),
      box([0.12, 0.34, 0.12], [-0.06, 0.32, -0.07], '#2a6fdb'),
      box([0.22, 0.22, 0.22], [0.02, 0.94, 0], '#f2c9a0'),
      box([0.24, 0.08, 0.24], [0.02, 1.06, 0], '#ff8a4c'),
    ],
  },
  ball: { paint: [], trim: [] }, // built below, with stripes
  jetski: {
    paint: [box([0.9, 0.22, 0.42], [0, 0.12, 0]), box([0.3, 0.16, 0.3], [0.52, 0.12, 0], undefined, [0, 0, -0.3])],
    trim: [
      box([0.36, 0.1, 0.26], [-0.12, 0.28, 0], '#1c1528'),
      box([0.05, 0.05, 0.36], [0.24, 0.48, 0], '#cccccc'),
      ...rider(-0.08, 0.3, '#59d86b', '#7a4a2b'),
      box([0.5, 0.04, 0.5], [-0.62, 0.0, 0], '#ffffff'),
    ],
  },
  boat: {
    paint: [box([1.9, 0.36, 0.9], [-0.1, 0.12, 0]), box([0.5, 0.26, 0.62], [0.98, 0.14, 0], undefined, [0, 0, 0.25])],
    trim: [
      box([1.4, 0.08, 0.8], [-0.2, 0.33, 0], '#fff6ea'),
      box([0.08, 0.3, 0.7], [0.4, 0.5, 0], '#bff8ff'),
      ...rider(-0.1, 0.36, '#ff3d9a', '#f2c9a0'),
      box([0.6, 0.04, 0.9], [-1.25, 0.0, 0], '#ffffff'),
    ],
  },
};

function beachBall() {
  const g = new THREE.IcosahedronGeometry(0.34, 1);
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const stripes = ['#ff2d46', '#ffffff', '#ffd23f', '#ffffff', '#1496ff', '#ffffff'].map((c) => new THREE.Color(c));
  for (let i = 0; i < pos.count; i += 3) {
    // colour each triangle by its angle round the ball's rolling axis (z)
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const k = Math.floor(((Math.atan2(cy, cx) + Math.PI) / (Math.PI * 2)) * 6) % 6;
    for (let j = 0; j < 3; j++) col.set([stripes[k].r, stripes[k].g, stripes[k].b], (i + j) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

const PALM = [
  box([0.24, 0.6, 0.24], [0, 0.3, 0], '#8a5a34'),
  box([0.22, 0.6, 0.22], [0.05, 0.85, 0], '#7a4a2b'),
  box([0.2, 0.6, 0.2], [0.12, 1.4, 0], '#8a5a34'),
  ...[0, 1, 2, 3, 4].map((k) => {
    const a = (k / 5) * Math.PI * 2;
    return box([0.95, 0.07, 0.28], [0.12 + Math.cos(a) * 0.42, 1.68, Math.sin(a) * 0.42], '#2bb35a', [0, -a, -0.35]);
  }),
  box([0.14, 0.14, 0.14], [0.2, 1.6, 0.08], '#5a3a1a'),
  box([0.14, 0.14, 0.14], [0.06, 1.6, -0.1], '#5a3a1a'),
];
const PALM_TOP = [{ s: [0.5, 0.3], p: [0.12, 1.75, 0], c: '#1f9d55', shape: 'cone' }];
const UMBRELLA_TRIM = [
  box([0.06, 1.15, 0.06], [0, 0.58, 0], '#ffffff'),
  box([0.46, 0.03, 0.78], [0.18, 0.02, 0.05], '#ffe14d'),
  box([0.46, 0.035, 0.18], [0.18, 0.025, 0.05], '#ff3d9a'),
];
const UMBRELLA_PAINT = [{ s: [1.1, 0.34], p: [0, 1.2, 0], c: '#ffffff', shape: 'cone' }];
const BUILDING_PAINT = [box([2.2, 1, 1.1], [0, 0.5, 0])];
const BUILDING_TRIM = [
  box([2.3, 0.1, 1.2], [0, 1.02, 0], '#fff6ea'),
  box([1.8, 0.12, 1.14], [0, 0.72, 0], '#9ff7f2'),
  box([1.8, 0.12, 1.14], [0, 0.42, 0], '#9ff7f2'),
  box([0.4, 0.3, 1.14], [0, 1.12, 0], '#fff6ea'),
];

// The snacks: a hot dog, an ice cream cone and a slice of pizza.
const SNACK_PARTS = {
  hotdog: [
    box([0.62, 0.16, 0.28], [0, 0, 0], '#e8a95b'),
    box([0.74, 0.13, 0.14], [0, 0.08, 0], '#c4432b'),
    box([0.5, 0.03, 0.05], [0, 0.16, 0], '#ffd23f'),
  ],
  icecream: [
    { s: [0.32, 0.5], p: [0, -0.05, 0], c: '#e0a050', shape: 'cone', r: [Math.PI, 0, 0] },
    { s: [0.38, 0.38], p: [0, 0.3, 0], c: '#ff9ec7', shape: 'ball' },
    { s: [0.12, 0.12], p: [0.02, 0.5, 0], c: '#ff2d46', shape: 'ball' },
  ],
  pizza: [
    { s: [0.8, 0.08], p: [0, 0, 0], c: '#ffcf5a', shape: 'tri' },
    box([0.12, 0.03, 0.12], [0.12, 0.05, 0.05], '#d63a2a'),
    box([0.12, 0.03, 0.12], [-0.1, 0.05, 0.1], '#d63a2a'),
    box([0.12, 0.03, 0.12], [-0.05, 0.05, -0.14], '#d63a2a'),
  ],
};

export function createView(level) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const el = renderer.domElement;
  Object.assign(el.style, { position: 'fixed', left: '0', top: '0', width: '100vw', height: '100dvh', zIndex: '0' });

  const disposables = [];
  const keep = (x) => {
    disposables.push(x);
    return x;
  };
  const lambert = (extra) => keep(new THREE.MeshLambertMaterial(extra));
  const vcol = lambert({ vertexColors: true });

  const scene = new THREE.Scene();
  scene.background = keep(canvasTexture(16, 256, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#2b1055');
    sky.addColorStop(0.45, '#7a1fa2');
    sky.addColorStop(0.75, '#ff3d9a');
    sky.addColorStop(1, '#ff8a4c');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
  }));
  scene.fog = new THREE.Fog('#ff7f8f', 24, 46);
  scene.add(new THREE.HemisphereLight('#fff0f6', '#6a4a8a', 1.7));
  const sunLight = new THREE.DirectionalLight('#fff1d6', 1.5);
  sunLight.position.set(-3, 10, 4);
  scene.add(sunLight);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 120);

  const rows = level.rows;
  const last = rows.length - 1;

  // ---- ground: one instanced slab per lane type, checkered so the squares are easy to see ----
  const checker = (a, b, extra) => (g, w, h) => {
    for (let i = 0; i < 2; i++) {
      g.fillStyle = i ? b : a;
      g.fillRect((i * w) / 2, 0, w / 2, h);
    }
    if (extra) extra(g, w, h);
  };
  const GROUND = {
    grass: { y: 0, tex: checker('#4fc96a', '#45b95f', (g, w, h) => {
      g.fillStyle = '#62d97a';
      for (let i = 0; i < 6; i++) g.fillRect((i * 37) % w, (i * 23) % h, 2, 3);
    }) },
    sand: { y: 0, tex: checker('#f6d79b', '#eecb8a', (g, w, h) => {
      g.fillStyle = '#d9b06e';
      for (let i = 0; i < 10; i++) g.fillRect((i * 29) % w, (i * 17) % h, 2, 2);
    }) },
    road: { y: -0.04, tex: (g, w, h) => {
      g.fillStyle = '#4a3f63';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffe14d';
      g.fillRect(4, 0, w / 2 - 8, 3);
      g.fillStyle = 'rgba(255,255,255,0.05)';
      g.fillRect(0, h / 2, w, 2);
    } },
    boardwalk: { y: 0.02, tex: (g, w, h) => {
      g.fillStyle = '#d99a5b';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#b5743b';
      for (let x = 0; x < w; x += w / 6) g.fillRect(x, 0, 2, h);
      g.fillStyle = 'rgba(255,255,255,0.1)';
      g.fillRect(0, 2, w, 3);
      g.fillStyle = '#ff3d9a';
      g.fillRect(0, h - 4, w, 4);
      g.fillRect(0, 0, w, 3);
    } },
    canal: { y: WATER_Y, tex: (g, w, h) => {
      g.fillStyle = '#16b8d6';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#3fd3ea';
      g.fillRect(0, h * 0.3, w, 2);
      g.fillRect(w * 0.3, h * 0.7, w * 0.4, 2);
    } },
    swamp: { y: WATER_Y, tex: (g, w, h) => {
      g.fillStyle = '#2f8a6a';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#3aa37c';
      g.fillRect(w * 0.1, h * 0.4, w * 0.3, 2);
      g.fillRect(w * 0.6, h * 0.75, w * 0.25, 2);
    } },
  };
  const groundType = (t) => (t === 'start' ? 'grass' : t);
  const groundRows = {};
  for (const k of Object.keys(GROUND)) groundRows[k] = [];
  for (let r = -BEHIND; r < 0; r++) groundRows.grass.push(r);
  rows.forEach((row, r) => groundRows[groundType(row.type)].push(r));
  for (let r = rows.length; r < rows.length + BEYOND; r++) groundRows.swamp.push(r);
  const slabGeo = keep(new THREE.BoxGeometry(GROUND_W, 1, 1));
  const d = new THREE.Object3D();
  const shade = new THREE.Color();
  const grounds = [];
  for (const [k, list] of Object.entries(groundRows)) {
    if (!list.length) continue;
    const tex = keep(canvasTexture(64, 32, GROUND[k].tex));
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(GROUND_W / 2, 1);
    const top = lambert({ map: tex });
    const sideMat = lambert({ color: k === 'canal' || k === 'swamp' ? '#0d6f86' : '#8a6a4a' });
    // only the top face is textured; the slab's sides are the canal banks
    const mesh = new THREE.InstancedMesh(slabGeo, [sideMat, sideMat, top, sideMat, sideMat, sideMat], list.length);
    list.forEach((r, i) => {
      d.position.set(0, GROUND[k].y - 0.5, -r);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
      shade.setScalar(r % 2 ? 0.94 : 1);
      mesh.setColorAt(i, shade);
    });
    scene.add(mesh);
    grounds.push(mesh);
  }

  // the edges of the map: everything past them is shaded
  const edgeMat = keep(new THREE.MeshBasicMaterial({ color: '#1a0b33', transparent: true, opacity: 0.32, depthWrite: false }));
  const edgeLen = rows.length + BEHIND + BEYOND;
  const edgeGeo = keep(new THREE.PlaneGeometry(SIDE, edgeLen));
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(edgeGeo, edgeMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(s * (COLS / 2 + SIDE / 2), 0.04, -(edgeLen / 2 - BEHIND - 0.5));
    scene.add(m);
  }

  // ---- blockers and scenery ----
  const instanced = (parts, list, paintList) => {
    const geo = model(parts);
    if (!geo || !list.length) {
      if (geo) geo.dispose();
      return null;
    }
    keep(geo);
    const mesh = new THREE.InstancedMesh(geo, vcol, list.length);
    list.forEach((m, i) => {
      mesh.setMatrixAt(i, m);
      if (paintList) mesh.setColorAt(i, tmpColor.set(paintList[i]));
    });
    scene.add(mesh);
    return mesh;
  };
  const at = (x, y, z, ry = 0, s = 1) => {
    d.position.set(x, y, z);
    d.rotation.set(0, ry, 0);
    d.scale.setScalar(s);
    d.updateMatrix();
    return d.matrix.clone();
  };
  const palms = [];
  const umbrellas = [];
  const umbrellaTints = [];
  const buildings = [];
  const buildingTints = [];
  rows.forEach((row, r) => {
    if (row.blockers) {
      for (const c of row.blockers) {
        if (row.type === 'sand') {
          umbrellas.push(at(wx(c), 0, -r, r * 1.3, 0.78));
          umbrellaTints.push(TINTS[(r + c) % TINTS.length]);
        } else palms.push(at(wx(c), 0, -r, r * 2.1, 0.6));
      }
    }
    if (isSafe(row.type)) {
      // a palm or umbrella and a pastel building on each side, just off the map
      for (const s of [-1, 1]) {
        const x = s * (MID + 1.6 + ((r * 7) % 3) * 0.3);
        if (row.type === 'sand') {
          umbrellas.push(at(x, 0, -r, r, 0.78));
          umbrellaTints.push(TINTS[(r + 3) % TINTS.length]);
        } else palms.push(at(x, 0, -r, r * 3, 0.6));
        buildings.push(at(s * (MID + 4.6), 0, -r, 0, 1 + ((r * 5 + (s > 0 ? 2 : 0)) % 3) * 0.35));
        buildingTints.push(['#ffb3d1', '#9ff7f2', '#ffe9a8', '#c9b3ff'][(r + (s > 0 ? 1 : 0)) % 4]);
      }
    }
  });
  for (let r = -BEHIND; r < 0; r++) for (const s of [-1, 1]) palms.push(at(s * (MID + 1.4 + (r % 2) * 1.6), 0, -r, r, 0.6));
  const meshes = [];
  const add = (m) => m && meshes.push(m);
  add(instanced(PALM, palms));
  add(instanced(PALM_TOP, palms));
  add(instanced(UMBRELLA_TRIM, umbrellas));
  add(instanced(UMBRELLA_PAINT, umbrellas, umbrellaTints));
  add(instanced(BUILDING_PAINT, buildings, buildingTints));
  add(instanced(BUILDING_TRIM, buildings));

  // the swamp: lily pads and reeds
  const lilies = [];
  const reeds = [];
  for (let r = last; r < last + BEYOND; r++) {
    for (let k = 0; k < 5; k++) {
      const x = ((r * 13 + k * 29) % (GROUND_W - 2)) - GROUND_W / 2 + 1;
      lilies.push(at(x, WATER_Y + 0.02, -r - ((k * 0.37) % 1) + 0.5, k + r));
      if ((k + r) % 2 === 0) reeds.push(at(x + 0.7, WATER_Y, -r + 0.3, k));
    }
  }
  add(instanced([{ s: [0.6, 0.04], p: [0, 0, 0], c: '#4fd36b', shape: 'cyl' }, box([0.12, 0.08, 0.12], [0.1, 0.05, 0.05], '#ff9ec7')], lilies));
  add(instanced([
    box([0.06, 1.0, 0.06], [0, 0.5, 0], '#3a8a3a'),
    box([0.06, 0.8, 0.06], [0.14, 0.4, 0.06], '#3a8a3a'),
    box([0.1, 0.26, 0.1], [0, 1.0, 0], '#6b3d1c'),
    box([0.1, 0.22, 0.1], [0.14, 0.82, 0.06], '#6b3d1c'),
  ], reeds));

  // ---- movers: two instanced meshes per kind, one tinted per lane and one with fixed colours ----
  const counts = {};
  for (const row of rows) for (const m of row.movers || []) counts[m.kind] = (counts[m.kind] || 0) + 1;
  const moverMeshes = {};
  for (const kind of Object.keys(KINDS)) {
    if (!counts[kind]) continue;
    const parts = [];
    if (kind === 'ball') {
      const geo = keep(beachBall());
      parts.push(new THREE.InstancedMesh(geo, vcol, counts[kind]));
    } else {
      const def = MODELS[kind];
      const paint = keep(model(def.paint.map((p) => ({ ...p, c: '#ffffff' }))));
      const trim = keep(model(def.trim));
      parts.push(new THREE.InstancedMesh(paint, vcol, counts[kind]));
      parts.push(new THREE.InstancedMesh(trim, vcol, counts[kind]));
    }
    for (const p of parts) {
      p.frustumCulled = false;
      p.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(p);
    }
    moverMeshes[kind] = { parts, n: 0 };
  }
  // fixed slot and tint per mover
  const slots = [];
  rows.forEach((row, r) => {
    for (const m of row.movers || []) {
      const mm = moverMeshes[m.kind];
      const i = mm.n++;
      slots.push({ r, row, m, mesh: mm, i });
      if (m.kind !== 'ball') mm.parts[0].setColorAt(i, tmpColor.set(TINTS[(m.tint + r) % TINTS.length]));
    }
  });
  const moverParts = Object.values(moverMeshes).flatMap((mm) => mm.parts);
  for (const p of moverParts) if (p.instanceColor) p.instanceColor.needsUpdate = true;

  // the current, as streaks of foam drifting along each canal
  const canalRows = [];
  rows.forEach((row, r) => row.type === 'canal' && canalRows.push(r));
  const FOAM_PER = 7;
  const foam = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(0.55, 0.02, 0.06)), keep(new THREE.MeshBasicMaterial({ color: '#e8ffff', transparent: true, opacity: 0.75 })), Math.max(1, canalRows.length * FOAM_PER));
  foam.frustumCulled = false;
  foam.count = canalRows.length * FOAM_PER;
  scene.add(foam);

  // ---- snacks ----
  const snackMeshes = level.snacks.map((s) => {
    const geo = keep(model(SNACK_PARTS[s.kind]));
    const m = new THREE.Mesh(geo, vcol);
    m.position.set(wx(s.col), 0.6, -s.row);
    scene.add(m);
    return m;
  });
  const glowGeo = keep(new THREE.CircleGeometry(0.42, 20));
  const glowMat = keep(new THREE.MeshBasicMaterial({ color: '#ffe14d', transparent: true, opacity: 0.45, depthWrite: false }));
  const glows = level.snacks.map((s) => {
    const g = new THREE.Mesh(glowGeo, glowMat);
    g.rotation.x = -Math.PI / 2;
    g.position.set(wx(s.col), (rows[s.row].type === 'road' ? -0.04 : 0.02) + 0.03, -s.row);
    scene.add(g);
    return g;
  });

  // ---- the gator ----
  const G = {
    skin: lambert({ color: '#3fae4a' }),
    dark: lambert({ color: '#2a7f37' }),
    belly: lambert({ color: '#c8f08a' }),
    white: lambert({ color: '#ffffff' }),
    black: lambert({ color: '#160b33' }),
    pink: lambert({ color: '#ff3d9a' }),
  };
  const cube = keep(new THREE.BoxGeometry(1, 1, 1));
  const part = (parent, mat, s, p) => {
    const m = new THREE.Mesh(cube, mat);
    m.scale.set(...s);
    m.position.set(...p);
    parent.add(m);
    return m;
  };
  const gator = new THREE.Group(); // at his feet; turns to face where he hops
  const body = new THREE.Group(); // squashes and spins
  gator.add(body);
  part(body, G.skin, [0.56, 0.3, 0.7], [0, 0.27, 0.02]);
  part(body, G.belly, [0.46, 0.1, 0.62], [0, 0.13, 0.02]);
  for (let k = 0; k < 3; k++) part(body, G.dark, [0.3 - k * 0.04, 0.08, 0.12], [0, 0.45, 0.22 - k * 0.2]);
  const head = new THREE.Group();
  head.position.set(0, 0.3, -0.33);
  body.add(head);
  part(head, G.skin, [0.5, 0.28, 0.32], [0, 0.02, -0.08]);
  part(head, G.skin, [0.4, 0.15, 0.36], [0, -0.04, -0.4]);
  part(head, G.belly, [0.36, 0.06, 0.34], [0, -0.12, -0.38]);
  part(head, G.dark, [0.06, 0.05, 0.05], [0.09, 0.05, -0.55]);
  part(head, G.dark, [0.06, 0.05, 0.05], [-0.09, 0.05, -0.55]);
  for (const s of [-1, 1]) {
    part(head, G.white, [0.16, 0.18, 0.16], [s * 0.15, 0.2, -0.04]);
    part(head, G.black, [0.08, 0.1, 0.04], [s * 0.15, 0.21, -0.13]);
    part(head, G.white, [0.04, 0.04, 0.02], [s * 0.13, 0.24, -0.15]);
    part(head, G.white, [0.05, 0.06, 0.04], [s * 0.1, -0.08, -0.56]); // little teeth
  }
  part(head, G.pink, [0.34, 0.03, 0.03], [0, -0.07, -0.25]); // a grin
  const legs = [];
  for (const [x, z] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.25], [0.3, 0.25]]) legs.push(part(body, G.dark, [0.16, 0.18, 0.18], [x, 0.09, z]));
  const tail = new THREE.Group();
  tail.position.set(0, 0.24, 0.36);
  body.add(tail);
  part(tail, G.skin, [0.34, 0.2, 0.34], [0, 0, 0.16]);
  const tailTip = new THREE.Group();
  tailTip.position.set(0, -0.02, 0.32);
  tail.add(tailTip);
  part(tailTip, G.skin, [0.2, 0.13, 0.32], [0, 0, 0.14]);
  part(tailTip, G.dark, [0.08, 0.06, 0.2], [0, 0.08, 0.1]);
  scene.add(gator);

  const shadow = new THREE.Mesh(keep(new THREE.CircleGeometry(0.42, 16)), keep(new THREE.MeshBasicMaterial({ color: '#160b33', transparent: true, opacity: 0.3, depthWrite: false })));
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);
  const ring = new THREE.Mesh(keep(new THREE.RingGeometry(0.4, 0.5, 20)), keep(new THREE.MeshBasicMaterial({ color: '#e8ffff', transparent: true, opacity: 0.7, depthWrite: false })));
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);

  // dizzy stars over his head when bonked
  const starGeo = keep(new THREE.OctahedronGeometry(0.09, 0));
  const starMat = keep(new THREE.MeshBasicMaterial({ color: '#ffe14d' }));
  const dizzy = new THREE.Group();
  const dizzyStars = [];
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(starGeo, starMat);
    dizzy.add(s);
    dizzyStars.push(s);
  }
  scene.add(dizzy);

  // ---- splashes and sparkles ----
  const PARTS = 80;
  const drops = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(0.1, 0.1, 0.1)), keep(new THREE.MeshBasicMaterial({ color: '#ffffff' })), PARTS);
  drops.frustumCulled = false;
  drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(drops);
  const P = { x: new Float32Array(PARTS), y: new Float32Array(PARTS), z: new Float32Array(PARTS), vx: new Float32Array(PARTS), vy: new Float32Array(PARTS), vz: new Float32Array(PARTS), life: new Float32Array(PARTS) };
  for (let i = 0; i < PARTS; i++) drops.setColorAt(i, tmpColor.set('#ffffff'));
  let nextDrop = 0;
  function emit(x, y, z, n, speed, colour) {
    tmpColor.set(colour);
    for (let k = 0; k < n; k++) {
      const i = nextDrop;
      nextDrop = (nextDrop + 1) % PARTS;
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random() * 0.6);
      P.x[i] = x;
      P.y[i] = y;
      P.z[i] = z;
      P.vx[i] = Math.cos(a) * sp;
      P.vz[i] = Math.sin(a) * sp;
      P.vy[i] = speed * (1 + Math.random());
      P.life[i] = 0.7 + Math.random() * 0.4;
      drops.setColorAt(i, tmpColor);
    }
    drops.instanceColor.needsUpdate = true;
  }

  // ---- per-frame state (the view's own, for animation only) ----
  let width = 1;
  let height = 1;
  let t = 0;
  let facing = 0;
  let wasHop = false;
  let wasStatus = 'play';
  let wasGot = 0;
  let splashed = false;
  const cam = { x: 0, z: 0, ready: false };
  const projected = new THREE.Vector3();
  const FACE = { up: 0, down: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 };
  // The camera looks down at PITCH from `dist` away, at a point LOOK_AHEAD rows in front of him,
  // so he sits in the lower part of the screen with the lanes ahead in view.
  const FOV = 46;
  const PITCH = (60 * Math.PI) / 180;
  let dist = 18;
  let lookAhead = 4;
  let halfW = COLS / 2;

  // Where the gator is drawn: x, z in the scene, and how high he is in his hop.
  const pose = { x: 0, z: 0, lift: 0, p: 1 };
  function gatorPose(run) {
    const h = run.hop;
    pose.x = wx(run.x);
    if (h) {
      const p = Math.min(1, h.t / HOP_TIME);
      pose.z = -(h.row0 + (h.row1 - h.row0) * p);
      pose.lift = Math.sin(p * Math.PI) * 0.42;
      pose.p = p;
    } else {
      pose.z = -run.row;
      pose.lift = 0;
      pose.p = 1;
    }
    return pose;
  }

  return {
    el,

    resize(w, h) {
      width = w;
      height = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // How many squares across are in view: on a phone a little less than the whole map
      // (the camera slides to show the edges as he gets near them), so he isn't tiny.
      const aspect = w / h;
      halfW = clamp(3.9 + (aspect - 0.46) * 8, 3.9, COLS / 2 + 1.2);
      camera.fov = FOV;
      const tanH = Math.tan((FOV * Math.PI) / 360) * aspect;
      dist = halfW / tanH;
      // put him about 72% of the way down the screen
      lookAhead = (Math.tan((FOV * Math.PI) / 360) * dist * 0.5) / Math.sin(PITCH);
      scene.fog.near = dist + 4;
      scene.fog.far = dist + 20;
      camera.far = dist + 40;
      camera.updateProjectionMatrix();
    },

    // Screen position (CSS pixels) of the gator, for checks.
    anchor(run) {
      gatorPose(run);
      projected.set(pose.x, 0.3, pose.z).project(camera);
      return { x: (projected.x * 0.5 + 0.5) * width, y: (-projected.y * 0.5 + 0.5) * height };
    },

    render(run, dt) {
      t += dt;
      const time = run.time;
      const lowRow = (run.hop ? Math.min(run.hop.row0, run.row) : run.row) - 8;
      const highRow = run.row + 30;

      // movers
      for (let k = 0; k < slots.length; k++) {
        const s = slots[k];
        const show = s.r >= lowRow && s.r <= highRow;
        const x = show ? moverX(s.row, s.m, time) : -999;
        const water = s.row.type === 'canal';
        let y = water ? WATER_Y + Math.sin(time * 5 + k) * 0.03 : 0;
        if (s.m.kind === 'ball') y = 0.36 + Math.abs(Math.sin(time * 4 + k)) * 0.12;
        if (s.m.kind === 'skater') y = Math.abs(Math.sin(time * 3 + k)) * 0.05;
        d.position.set(show ? wx(x) : 0, show ? y : -50, -s.r);
        d.rotation.set(0, s.row.dir > 0 ? 0 : Math.PI, s.m.kind === 'ball' ? -(s.row.dir * x) / 0.34 : 0);
        d.scale.setScalar(1);
        d.updateMatrix();
        const parts = s.mesh.parts;
        for (let j = 0; j < parts.length; j++) parts[j].setMatrixAt(s.i, d.matrix);
      }
      for (let i = 0; i < moverParts.length; i++) moverParts[i].instanceMatrix.needsUpdate = true;

      // foam streaks drifting with each canal's current
      const span = GROUND_W;
      for (let c = 0; c < canalRows.length; c++) {
        const r = canalRows[c];
        const drift = rows[r].drift;
        for (let k = 0; k < FOAM_PER; k++) {
          const raw = (k / FOAM_PER) * span + ((r * 3.7) % span) + drift * time * 1.6;
          const x = (((raw % span) + span) % span) - span / 2;
          d.position.set(x, WATER_Y + 0.01, -r + (((k * 37) % 7) / 7 - 0.5) * 0.7);
          d.rotation.set(0, 0, 0);
          d.scale.set(1 + (k % 3) * 0.4, 1, 1);
          d.updateMatrix();
          foam.setMatrixAt(c * FOAM_PER + k, d.matrix);
        }
      }
      foam.instanceMatrix.needsUpdate = true;

      // snacks bob and spin until eaten; a sparkle when one is
      for (let i = 0; i < snackMeshes.length; i++) {
        const m = snackMeshes[i];
        m.visible = !run.got[i];
        glows[i].visible = m.visible;
        m.rotation.y = t * 1.8 + i;
        m.position.y = 0.6 + Math.sin(t * 3 + i) * 0.1;
      }
      if (run.gotCount > wasGot) {
        for (let i = 0; i < level.snacks.length; i++) {
          if (run.got[i] && snackMeshes[i].userData.gone !== true) {
            snackMeshes[i].userData.gone = true;
            emit(wx(level.snacks[i].col), 0.6, -level.snacks[i].row, 16, 2.2, '#ffe14d');
          }
        }
      }
      wasGot = run.gotCount;

      // the gator
      const g = gatorPose(run);
      const lane = rows[run.row];
      const swimming = lane.type === 'canal' && !run.hop;
      const want = FACE[run.face] ?? 0;
      let diff = want - facing;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      facing += diff * Math.min(1, dt * 22);
      let y = g.lift;
      let squash = 1;
      if (run.hop) squash = 1 + Math.sin(g.p * Math.PI) * 0.12;
      if (swimming) y = WATER_Y - 0.12 + Math.sin(t * 4) * 0.03;
      else if (lane.type === 'road' && !run.hop) y = -0.04;
      let bx = 0;
      let bz = 0;
      if (run.bump && time - run.bump.t < 0.22) {
        // a refused hop: a little lean that way and back
        const k = Math.sin(((time - run.bump.t) / 0.22) * Math.PI) * 0.18;
        const a = FACE[run.bump.dir];
        bx = -Math.sin(a) * k;
        bz = -Math.cos(a) * k;
      }
      gator.position.set(g.x + bx, y, g.z + bz);
      gator.rotation.y = facing;
      body.rotation.set(0, 0, 0);
      body.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
      body.position.y = 0;
      // tail wags as he hops, and gently while he waits
      const wag = run.hop ? Math.sin(g.p * Math.PI * 2) * 0.7 : Math.sin(t * 3) * 0.18;
      tail.rotation.y = wag;
      tailTip.rotation.y = wag * 1.3;
      const legLift = run.hop ? Math.sin(g.p * Math.PI) * 0.08 : 0;
      legs[0].position.y = legs[3].position.y = 0.09 + legLift;
      legs[1].position.y = legs[2].position.y = 0.09 - legLift * 0.5;
      head.rotation.x = run.hop ? -Math.sin(g.p * Math.PI) * 0.15 : 0;
      gator.visible = !(run.invuln > 0 && run.status === 'play' && Math.floor(run.invuln * 10) % 2 === 1);

      // bonk: flattened, spinning, stars round his head
      dizzy.visible = run.status === 'bonk';
      if (run.status === 'bonk') {
        const k = run.bonkT / BONK_TIME;
        body.rotation.y = k * Math.PI * 4;
        body.scale.set(1.25, 0.55 + 0.45 * k * k, 1.25);
        dizzy.position.set(gator.position.x, gator.position.y + 0.85, gator.position.z);
        for (let i = 0; i < dizzyStars.length; i++) {
          const a = t * 6 + (i / dizzyStars.length) * Math.PI * 2;
          dizzyStars[i].position.set(Math.cos(a) * 0.45, Math.sin(a * 2) * 0.05, Math.sin(a) * 0.45);
          dizzyStars[i].rotation.y = a * 2;
        }
      }

      // the swamp: a big belly flop
      if (run.status === 'won') {
        const e = run.endTime;
        if (e < 0.55) {
          const k = e / 0.55;
          gator.position.y = Math.sin(k * Math.PI) * 1.4 + WATER_Y * k;
          body.rotation.x = -k * 0.9;
        } else {
          gator.position.y = WATER_Y - 0.1 + Math.sin(t * 3) * 0.04;
          body.rotation.x = 0;
          body.scale.set(1.15, 0.85, 1.15);
          tail.rotation.y = Math.sin(t * 8) * 0.6;
          if (!splashed) {
            splashed = true;
            emit(gator.position.x, WATER_Y, gator.position.z, 60, 3.2, '#bff8ff');
          }
        }
      } else splashed = false;

      // a splash when he lands in a canal
      if (wasHop && !run.hop && lane.type === 'canal' && run.status === 'play') emit(g.x, WATER_Y, g.z, 10, 1.4, '#e8ffff');
      if (run.status === 'bonk' && wasStatus !== 'bonk') emit(g.x, 0.5, g.z, 12, 1.8, '#ffe14d');
      wasHop = !!run.hop;
      wasStatus = run.status;

      shadow.visible = !swimming && run.status !== 'won' && gator.visible;
      shadow.position.set(g.x, (lane.type === 'road' ? -0.04 : 0) + 0.03, g.z);
      shadow.scale.setScalar(1 - g.lift * 0.6);
      ring.visible = swimming || (run.status === 'won' && run.endTime > 0.55);
      ring.position.set(g.x, WATER_Y + 0.02, g.z);
      ring.scale.setScalar(1 + (t * 0.8) % 0.6);

      // particles
      for (let i = 0; i < PARTS; i++) {
        if (P.life[i] > 0) {
          P.life[i] -= dt;
          P.vy[i] -= 9 * dt;
          P.x[i] += P.vx[i] * dt;
          P.y[i] += P.vy[i] * dt;
          P.z[i] += P.vz[i] * dt;
          d.position.set(P.x[i], P.y[i], P.z[i]);
          d.scale.setScalar(P.life[i] > 0 ? 1 : 0);
        } else {
          d.position.set(0, -50, 0);
          d.scale.setScalar(0);
        }
        d.rotation.set(0, 0, 0);
        d.updateMatrix();
        drops.setMatrixAt(i, d.matrix);
      }
      drops.instanceMatrix.needsUpdate = true;

      // camera: above and behind, following smoothly; the map stays mostly centred
      const slack = Math.max(0, COLS / 2 + 1 - halfW);
      const tx = clamp(g.x * 0.75, -slack, slack);
      const tz = g.z;
      if (!cam.ready) {
        cam.x = tx;
        cam.z = tz;
        cam.ready = true;
      }
      const k = Math.min(1, dt * 5);
      cam.x += (tx - cam.x) * k;
      cam.z += (tz - cam.z) * k;
      const lz = cam.z - lookAhead;
      camera.position.set(cam.x, Math.sin(PITCH) * dist, lz + Math.cos(PITCH) * dist);
      camera.lookAt(cam.x, 0, lz);

      renderer.render(scene, camera);
    },

    dispose() {
      el.remove();
      for (const x of disposables) x.dispose();
      for (const m of grounds) m.dispose();
      for (const m of meshes) m.dispose();
      for (const p of moverParts) p.dispose();
      foam.dispose();
      drops.dispose();
      renderer.dispose();
    },
  };
}

