// The 3D view of a run, drawn with three.js. No game rules: it only reads the run.
// Sim z runs forward; in the scene that is -z, so the camera looks down the boardwalk.
import * as THREE from 'three';
import { TRACK_HALF, STAGE, gateLabel, isGood, sawX, hammerCycle } from './track.js';
import { finaleState, slotOffset, TOWER_LAYERS, CANNON_FAR } from './sim.js';

const SHIRTS = ['#ff3d9a', '#ffe14d', '#0bb5c4', '#ff8a4c', '#9ff7f2', '#b46bff', '#59d86b', '#ffffff'];
const SKINS = ['#f2c9a0', '#d9a273', '#a86f44', '#7a4a2b', '#f7dcc0'];
const TOWER_H = 26;
const POOL = 190; // people drawn at once, including ones tumbling away
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function canvasTexture(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function labelTexture(text, good) {
  return canvasTexture(256, 160, (g, w, h) => {
    g.fillStyle = good ? 'rgba(20,150,255,0.62)' : 'rgba(255,45,70,0.62)';
    g.fillRect(0, 0, w, h);
    g.lineWidth = 12;
    g.strokeStyle = good ? '#bfe6ff' : '#ffc2c9';
    g.strokeRect(6, 6, w - 12, h - 12);
    g.font = '900 104px ui-rounded, system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 14;
    g.strokeStyle = 'rgba(0,0,0,0.55)';
    g.strokeText(text, w / 2, h / 2 + 6);
    g.fillStyle = '#ffffff';
    g.fillText(text, w / 2, h / 2 + 6);
  });
}

export function createView(track, finaleKind = 'striker') {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.__renderScale || 2, 1.5));
  const el = renderer.domElement;
  Object.assign(el.style, { position: 'fixed', left: '0', top: '0', width: '100vw', height: '100dvh', zIndex: '0' });

  const scene = new THREE.Scene();
  scene.background = canvasTexture(16, 256, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#2b1055');
    sky.addColorStop(0.4, '#7a1fa2');
    sky.addColorStop(0.62, '#ff3d9a');
    sky.addColorStop(0.75, '#ff8a4c');
    sky.addColorStop(1, '#ffb36b');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
  });
  scene.fog = new THREE.Fog('#ff7a8a', 45, 150);
  scene.add(new THREE.HemisphereLight('#ffe9f4', '#5a3a7a', 1.5));
  const sunLight = new THREE.DirectionalLight('#fff1d6', 1.6);
  sunLight.position.set(4, 10, 6);
  scene.add(sunLight);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
  const disposables = [];
  const keep = (x) => {
    disposables.push(x);
    return x;
  };
  const mat = (color, extra = {}) => keep(new THREE.MeshLambertMaterial({ color, ...extra }));
  const basic = (extra) => keep(new THREE.MeshBasicMaterial(extra));

  // ---- boardwalk, sea, sun, palms ----
  const len = track.length + 80;
  const planks = canvasTexture(64, 64, (g) => {
    g.fillStyle = '#d9a066';
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#b97f48';
    for (let y = 0; y < 64; y += 16) g.fillRect(0, y, 64, 2);
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.fillRect(0, 4, 64, 5);
  });
  planks.wrapS = planks.wrapT = THREE.RepeatWrapping;
  planks.repeat.set(2, len / 5);
  const deck = new THREE.Mesh(keep(new THREE.PlaneGeometry(TRACK_HALF * 2, len)), keep(new THREE.MeshLambertMaterial({ map: keep(planks) })));
  deck.rotation.x = -Math.PI / 2;
  deck.position.set(0, 0, -len / 2 + 30);
  scene.add(deck);
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(keep(new THREE.BoxGeometry(0.3, 0.5, len)), mat('#ff3d9a'));
    rail.position.set(side * (TRACK_HALF + 0.15), 0.25, -len / 2 + 30);
    scene.add(rail);
  }
  const sea = new THREE.Mesh(keep(new THREE.PlaneGeometry(600, len + 400)), mat('#0bb5c4'));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -1.2, -len / 2);
  scene.add(sea);
  const sun = new THREE.Mesh(keep(new THREE.CircleGeometry(38, 40)), basic({ color: '#ffe14d', fog: false }));
  scene.add(sun);

  const palmCount = Math.floor(len / 16) * 2;
  const trunks = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.22, 0.34, 6, 6)), mat('#7a4a2b'), palmCount);
  const fronds = new THREE.InstancedMesh(keep(new THREE.ConeGeometry(2.6, 1.6, 7)), mat('#1f9d55'), palmCount);
  const d = new THREE.Object3D();
  for (let i = 0; i < palmCount; i++) {
    const side = i % 2 ? 1 : -1;
    const z = 20 - Math.floor(i / 2) * 16 - (side > 0 ? 8 : 0);
    d.position.set(side * (TRACK_HALF + 2.4), 2.4, z);
    d.rotation.set(0, 0, side * -0.12);
    d.scale.set(1, 1, 1);
    d.updateMatrix();
    trunks.setMatrixAt(i, d.matrix);
    d.position.set(side * (TRACK_HALF + 2.0), 5.8, z);
    d.rotation.set(0, i, 0);
    d.updateMatrix();
    fronds.setMatrixAt(i, d.matrix);
  }
  scene.add(trunks, fronds);

  // ---- gates ----
  const panelGeo = keep(new THREE.PlaneGeometry(TRACK_HALF - 0.3, 3.4));
  const postGeo = keep(new THREE.CylinderGeometry(0.14, 0.14, 3.8, 8));
  const postMat = mat('#ffffff');
  const gateMeshes = track.gates.map((gate) => {
    const group = new THREE.Group();
    const panels = {};
    for (const side of ['left', 'right']) {
      const tex = keep(labelTexture(gateLabel(gate[side]), isGood(gate[side])));
      const panel = new THREE.Mesh(panelGeo, basic({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
      panel.position.set((side === 'left' ? -1 : 1) * (TRACK_HALF / 2), 1.9, 0);
      group.add(panel);
      panels[side] = panel;
    }
    for (const x of [-TRACK_HALF, 0, TRACK_HALF]) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(x, 1.9, 0);
      group.add(post);
    }
    group.position.z = -gate.z;
    scene.add(group);
    return panels;
  });

  // ---- obstacles ----
  const pitMat = basic({ color: '#120822' });
  const sawGeo = keep(new THREE.CylinderGeometry(1, 1, 0.14, 14));
  const sawMat = keep(new THREE.MeshLambertMaterial({ color: '#dfe6ee', flatShading: true }));
  const hubGeo = keep(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12));
  const obstacleMeshes = track.obstacles.map((ob) => {
    if (ob.type === 'pit') {
      for (const [a, b] of ob.holes) {
        const hole = new THREE.Mesh(keep(new THREE.PlaneGeometry(b - a, ob.z1 - ob.z0)), pitMat);
        hole.rotation.x = -Math.PI / 2;
        hole.position.set((a + b) / 2, 0.02, -(ob.z0 + ob.z1) / 2);
        scene.add(hole);
        const lip = new THREE.Mesh(keep(new THREE.PlaneGeometry(b - a, 0.25)), basic({ color: '#ffe14d' }));
        lip.rotation.x = -Math.PI / 2;
        lip.position.set((a + b) / 2, 0.03, -ob.z0 + 0.12);
        scene.add(lip);
      }
      return null;
    }
    if (ob.type === 'saw') {
      const group = new THREE.Group();
      const blade = new THREE.Mesh(sawGeo, sawMat);
      blade.rotation.x = Math.PI / 2;
      blade.scale.set(ob.r, 1, ob.r);
      const hub = new THREE.Mesh(hubGeo, mat('#ff2d46'));
      hub.rotation.x = Math.PI / 2;
      group.add(blade, hub);
      group.position.set(0, ob.r * 0.75, -ob.z);
      const slot = new THREE.Mesh(keep(new THREE.PlaneGeometry(ob.amp * 2 + ob.r * 2, 0.2)), basic({ color: '#3a2a4a' }));
      slot.rotation.x = -Math.PI / 2;
      slot.position.set(ob.cx, 0.02, -ob.z);
      scene.add(group, slot);
      return { group, blade };
    }
    const head = new THREE.Mesh(keep(new THREE.BoxGeometry(ob.w, 1.3, ob.d)), mat('#ff2d46'));
    const handle = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.22, 0.22, 9, 8)), mat('#7a4a2b'));
    handle.position.y = 5;
    const group = new THREE.Group();
    group.add(head, handle);
    group.position.set(ob.x, 5, -ob.z);
    const warn = new THREE.Mesh(keep(new THREE.PlaneGeometry(ob.w, ob.d)), basic({ color: '#ff2d46', transparent: true, opacity: 0.3, depthWrite: false }));
    warn.rotation.x = -Math.PI / 2;
    warn.position.set(ob.x, 0.03, -ob.z);
    scene.add(group, warn);
    return { group, warn };
  });

  // ---- finish line and the high striker ----
  const finish = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(TRACK_HALF * 2, 1.6)),
    basic({
      map: keep(canvasTexture(128, 16, (g) => {
        for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) {
          g.fillStyle = (i + j) % 2 ? '#ffffff' : '#160b33';
          g.fillRect(i * 8, j * 8, 8, 8);
        }
      })),
    }),
  );
  finish.rotation.x = -Math.PI / 2;
  finish.position.set(0, 0.03, -track.finishZ);
  scene.add(finish);

  const stageZ = -(track.finishZ + STAGE);
  const STAGE_COLOURS = { striker: '#ff2d46', tower: '#0bb5c4', cannon: '#b46bff' };
  const button = new THREE.Mesh(keep(new THREE.CylinderGeometry(4.2, 4.4, 0.5, 28)), mat(STAGE_COLOURS[finaleKind]));
  button.position.set(0, 0.25, stageZ);
  scene.add(button);
  const towerZ = stageZ - 7;

  // the high striker: tower, bell and puck
  let bell = null;
  let puck = null;
  if (finaleKind === 'striker') {
    const tower = new THREE.Mesh(
      keep(new THREE.BoxGeometry(2.4, TOWER_H, 0.6)),
      keep(new THREE.MeshLambertMaterial({
        map: keep(canvasTexture(32, 256, (g, w, h) => {
          for (let i = 0; i < 13; i++) {
            g.fillStyle = i % 2 ? '#ffe14d' : '#ff3d9a';
            g.fillRect(0, (i * h) / 13, w, h / 13 + 1);
          }
          g.fillStyle = '#160b33';
          g.fillRect(w / 2 - 3, 0, 6, h);
        })),
      })),
    );
    tower.position.set(0, TOWER_H / 2, towerZ);
    bell = new THREE.Mesh(keep(new THREE.SphereGeometry(1.5, 16, 12)), mat('#ffe14d'));
    bell.position.set(0, TOWER_H + 1.4, towerZ);
    puck = new THREE.Mesh(keep(new THREE.BoxGeometry(2.8, 0.8, 1)), mat('#0bb5c4'));
    puck.position.set(0, 0.6, towerZ + 0.7);
    scene.add(tower, bell, puck);
  }

  // confetti for the tower's star and the cannon's target, thrown from one point
  const CONFETTI = 120;
  const confetti = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(0.4, 0.26)), basic({ color: '#ffffff', side: THREE.DoubleSide }), CONFETTI);
  confetti.frustumCulled = false;
  confetti.count = 0;
  const confettiVel = [];
  for (let i = 0; i < CONFETTI; i++) {
    const a = Math.random() * Math.PI * 2;
    const up = Math.random();
    const sp = 6 + Math.random() * 10;
    confettiVel.push([Math.cos(a) * sp * (1 - up * 0.5), sp * (0.3 + up), Math.sin(a) * sp * (1 - up * 0.5), 3 + Math.random() * 8]);
    confetti.setColorAt(i, new THREE.Color(SHIRTS[i % SHIRTS.length]));
  }
  scene.add(confetti);
  function drawConfetti(ox, oy, oz, age) {
    if (age <= 0 || age > 4) {
      confetti.count = 0;
      return;
    }
    const spread = (1 - Math.exp(-2 * age)) / 2; // air slows them down
    for (let i = 0; i < CONFETTI; i++) {
      const [vx, vy, vz, spin] = confettiVel[i];
      d.position.set(ox + vx * spread, oy + vy * spread - 2.2 * age, oz + vz * spread);
      d.rotation.set(age * spin, age * spin * 0.7, i);
      d.scale.setScalar(Math.max(0.01, Math.min(1, (4 - age) * 1.5)));
      d.updateMatrix();
      confetti.setMatrixAt(i, d.matrix);
    }
    confetti.count = CONFETTI;
    confetti.instanceMatrix.needsUpdate = true;
  }

  // the human tower: a star up in the clouds
  const LAYER_H = 0.95; // each layer stands on the shoulders of the one below
  const starY = 0.5 + (TOWER_LAYERS - 1) * LAYER_H + 2.45;
  let star = null;
  let starMat = null;
  let clouds = null;
  if (finaleKind === 'tower') {
    const shape = new THREE.Shape();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 ? 0.75 : 1.7;
      const a = (k / 10) * Math.PI * 2 + Math.PI / 2;
      if (k === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    starMat = keep(new THREE.MeshLambertMaterial({ color: '#ffe14d', emissive: '#ff9d00', emissiveIntensity: 0.3 }));
    star = new THREE.Mesh(keep(new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false }).translate(0, 0, -0.25)), starMat);
    star.position.set(0, starY, stageZ);
    scene.add(star);
    // puffy clouds around the top, three or four balls each
    const puffs = [];
    const cloudAt = [[-7, 13, -4], [8, 16, -8], [-9, 20, -10], [6, 23, -3], [-4, 25, -14], [10, 9, -14], [3, 18.5, -16]];
    for (const [cx, cy, cz] of cloudAt) {
      for (let k = 0; k < 4; k++) puffs.push([cx + (k - 1.5) * 1.3, cy + (k % 2) * 0.5, cz, 1.1 + (k % 3) * 0.35]);
    }
    clouds = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(1, 12, 8)), mat('#ffffff', { emissive: '#ffd6ec', emissiveIntensity: 0.4 }), puffs.length);
    puffs.forEach(([x, y, z, r], i) => {
      d.position.set(x, y, stageZ + z);
      d.rotation.set(0, 0, 0);
      d.scale.set(r * 1.3, r * 0.8, r);
      d.updateMatrix();
      clouds.setMatrixAt(i, d.matrix);
    });
    scene.add(clouds);
  }

  // the cannon, its runway and the target at the far end
  const ELEVATION = 0.6;
  const pivot = new THREE.Vector3(0, 2.4, stageZ - 7.5);
  const muzzle = new THREE.Vector3(0, pivot.y + Math.sin(ELEVATION) * 5, pivot.z - Math.cos(ELEVATION) * 5);
  const targetZ = muzzle.z - CANNON_FAR;
  const TARGET_Y = 5;
  const TARGET_R = 4;
  let barrel = null;
  let smoke = null;
  let target = null;
  if (finaleKind === 'cannon') {
    barrel = new THREE.Group();
    const barrelGeo = keep(new THREE.CylinderGeometry(1.25, 1.6, 7, 20).rotateX(-Math.PI / 2).translate(0, 0, -1.5));
    const barrelMat = keep(new THREE.MeshLambertMaterial({
      map: keep(canvasTexture(16, 64, (g, w, h) => {
        g.fillStyle = '#ff3d9a';
        g.fillRect(0, 0, w, h);
        g.fillStyle = '#ffe14d';
        for (const y of [4, 30, 56]) g.fillRect(0, y, w, 5);
      })),
    }));
    const tube = new THREE.Mesh(barrelGeo, barrelMat);
    const ring = new THREE.Mesh(keep(new THREE.TorusGeometry(1.3, 0.28, 8, 24)), mat('#ffe14d'));
    ring.position.z = -5;
    const mouth = new THREE.Mesh(keep(new THREE.CircleGeometry(1.15, 20)), basic({ color: '#160b33', side: THREE.DoubleSide }));
    mouth.position.z = -5.05;
    barrel.add(tube, ring, mouth);
    barrel.position.copy(pivot);
    barrel.rotation.x = ELEVATION;
    const carriage = new THREE.Mesh(keep(new THREE.BoxGeometry(2.4, 1.4, 3.8)), mat('#7a4a2b'));
    carriage.position.set(0, 0.95, pivot.z + 0.6);
    const wheelGeo = keep(new THREE.CylinderGeometry(1.35, 1.35, 0.45, 18).rotateZ(Math.PI / 2));
    const wheelMat = mat('#ffe14d');
    for (const x of [-1.5, 1.5]) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(x, 1.35, pivot.z + 0.4);
      scene.add(wheel);
    }
    smoke = new THREE.Mesh(keep(new THREE.SphereGeometry(1, 14, 10)), basic({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
    smoke.position.copy(muzzle);
    smoke.visible = false;
    scene.add(barrel, carriage, smoke);

    // a striped runway marked every 10 m, out over the sea
    const runLen = CANNON_FAR + 12;
    const stripes = canvasTexture(32, 64, (g, w, h) => {
      g.fillStyle = '#2b3a8c';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffe14d';
      g.fillRect(0, 0, w, 5);
    });
    stripes.wrapS = stripes.wrapT = THREE.RepeatWrapping;
    stripes.repeat.set(1, runLen / 10);
    const runway = new THREE.Mesh(keep(new THREE.PlaneGeometry(TRACK_HALF * 2, runLen)), basic({ map: keep(stripes) }));
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(0, 0.04, muzzle.z - runLen / 2 + 2);
    stripes.offset.y = 0.8; // a stripe at every 10 m from the muzzle
    const legs = new THREE.Mesh(keep(new THREE.BoxGeometry(TRACK_HALF * 2, 1.3, runLen)), mat('#7a4a2b'));
    legs.position.set(0, -0.62, runway.position.z);
    scene.add(runway, legs);
    const markGeo = keep(new THREE.PlaneGeometry(3, 1.5));
    for (let m = 10; m < CANNON_FAR; m += 10) {
      const tex = keep(canvasTexture(128, 64, (g, w, h) => {
        g.font = '900 46px ui-rounded, system-ui, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = '#ffffff';
        g.fillText(`${m} m`, w / 2, h / 2 + 3);
      }));
      const mark = new THREE.Mesh(markGeo, basic({ map: tex, transparent: true, depthWrite: false }));
      mark.rotation.x = -Math.PI / 2;
      mark.position.set(TRACK_HALF - 1.8, 0.06, muzzle.z - m);
      scene.add(mark);
    }

    // the target: a bullseye standing at the far end
    const face = keep(new THREE.MeshLambertMaterial({
      map: keep(canvasTexture(256, 256, (g, w) => {
        const rings = ['#ff2d46', '#ffffff', '#ff2d46', '#ffffff', '#ffe14d'];
        rings.forEach((c, i) => {
          g.fillStyle = c;
          g.beginPath();
          g.arc(w / 2, w / 2, (w / 2) * (1 - i / rings.length), 0, Math.PI * 2);
          g.fill();
        });
      })),
    }));
    target = new THREE.Group();
    const board = new THREE.Mesh(keep(new THREE.CylinderGeometry(TARGET_R, TARGET_R, 0.5, 40).rotateX(Math.PI / 2)), [mat('#160b33'), face, face]);
    target.add(board);
    const postGeo2 = keep(new THREE.BoxGeometry(0.5, TARGET_Y, 0.5));
    for (const x of [-2.6, 2.6]) {
      const post = new THREE.Mesh(postGeo2, mat('#7a4a2b'));
      post.position.set(x, -TARGET_Y / 2, -0.4);
      target.add(post);
    }
    target.position.set(0, TARGET_Y, targetZ);
    scene.add(target);
  }

  // ---- people ----
  const personMat = () => keep(new THREE.MeshLambertMaterial({ color: '#ffffff' }));
  const part = (geo) => {
    const m = new THREE.InstancedMesh(keep(geo), personMat(), POOL);
    m.frustumCulled = false;
    m.count = 0;
    scene.add(m);
    return m;
  };
  const body = part(new THREE.CapsuleGeometry(0.17, 0.26, 3, 8));
  const head = part(new THREE.SphereGeometry(0.15, 10, 8));
  const limbGeo = (h) => new THREE.BoxGeometry(0.1, h, 0.1).translate(0, -h / 2, 0);
  const legL = part(limbGeo(0.36));
  const legR = part(limbGeo(0.36));
  const armL = part(limbGeo(0.3));
  const armR = part(limbGeo(0.3));
  const parts = [body, head, legL, legR, armL, armR];
  const shirt = SHIRTS.map((c) => new THREE.Color(c));
  const skin = SKINS.map((c) => new THREE.Color(c));
  const shorts = new THREE.Color('#2b3a8c');

  function place(mesh, i, x, y, z, rx, rz, s) {
    d.position.set(x, y, z);
    d.rotation.set(rx, 0, rz);
    d.scale.set(s, s, s);
    d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
  }

  // One person: feet at (x, y, z), `swing` drives the run cycle, `tilt` tips them over,
  // `reach` 0..1 raises the arms.
  function person(i, id, x, y, z, swing, tilt, s, reach = 0) {
    const bob = Math.abs(Math.sin(swing)) * 0.06;
    const a = Math.sin(swing) * 0.9;
    place(body, i, x, y + (0.56 + bob) * s, z, tilt, 0, s);
    place(head, i, x, y + (0.95 + bob) * s, z - Math.sin(tilt) * 0.3 * s, tilt, 0, s);
    place(legL, i, x - 0.09 * s, y + (0.38 + bob) * s, z, a + tilt, 0, s);
    place(legR, i, x + 0.09 * s, y + (0.38 + bob) * s, z, -a + tilt, 0, s);
    place(armL, i, x - 0.24 * s, y + (0.78 + bob) * s, z, -a * (1 - reach) + tilt, 0.15 - reach * 2.9, s);
    place(armR, i, x + 0.24 * s, y + (0.78 + bob) * s, z, a * (1 - reach) + tilt, -0.15 + reach * 2.9, s);
    const c = shirt[id % shirt.length];
    body.setColorAt(i, c);
    armL.setColorAt(i, c);
    armR.setColorAt(i, c);
    head.setColorAt(i, skin[id % skin.length]);
    legL.setColorAt(i, shorts);
    legR.setColorAt(i, shorts);
  }

  // Where each person goes in the human tower: a cone of layers with one person on top.
  // Laid out once per run; anyone left over cheers from the stage.
  let towerKey = '';
  const towerSlots = []; // per person index: { k (layer), x, z } or null
  function layoutTower(v, layers) {
    const key = `${v}/${layers}`;
    if (key === towerKey) return;
    towerKey = key;
    const base = clamp(Math.round((2 * v) / layers - 1), 1, 7);
    const widths = [];
    for (let k = 0; k < layers; k++) widths.push(Math.max(1, Math.round(base - ((base - 1) * k) / Math.max(1, layers - 1))));
    let sum = widths.reduce((a, b) => a + b, 0);
    for (let changed = true; sum > v && changed; ) {
      changed = false;
      for (let k = layers - 1; k >= 0 && sum > v; k--) {
        if (widths[k] > 1 && (k === layers - 1 || widths[k] > widths[k + 1])) {
          widths[k]--;
          sum--;
          changed = true;
        }
      }
    }
    towerSlots.length = 0;
    widths.forEach((w, k) => {
      const r = w === 1 ? 0 : w === 2 ? 0.2 : Math.max(0.26, (w * 0.42) / (2 * Math.PI));
      for (let j = 0; j < w; j++) {
        const a = (j / w) * Math.PI * 2 + k * 0.7;
        towerSlots.push({ k, x: Math.cos(a) * r, z: Math.sin(a) * r });
      }
    });
    while (towerSlots.length < v) towerSlots.push(null);
  }

  // Each flyer's place in the ball of people shot from the cannon.
  const flyOff = [];
  for (let i = 0; i < POOL; i++) {
    const u = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const r = 0.45 * Math.cbrt(i + 1);
    const q = Math.sqrt(1 - u * u);
    flyOff.push([q * Math.cos(a) * r, u * r, q * Math.sin(a) * r]);
  }

  const cam = { x: 0, y: 8.5, z: 10.5, lx: 0, ly: 1, lz: -7 };
  const projected = new THREE.Vector3();
  let width = 1;
  let height = 1;
  let ahead = 7; // how far past the crowd the camera looks

  return {
    el,

    resize(w, h) {
      width = w;
      height = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // keep the whole width of the boardwalk in view on a tall, narrow screen
      const v = (2 * Math.atan(Math.tan((27 * Math.PI) / 180) / camera.aspect) * 180) / Math.PI;
      camera.fov = Math.max(50, Math.min(95, v));
      // a tall screen sees a lot of deck behind the crowd, so look further up the boardwalk
      ahead = 7 + (camera.fov - 60) * 0.25;
      camera.updateProjectionMatrix();
    },

    // Screen position (CSS pixels) of a point above the crowd, for the count bubble.
    crowdAnchor(run) {
      projected.set(run.x, 2.4, -run.z).project(camera);
      return { x: (projected.x * 0.5 + 0.5) * width, y: (-projected.y * 0.5 + 0.5) * height };
    },

    render(run, dt) {
      const t = run.time;
      const fin = run.status === 'finale' ? finaleState(run) : null;
      const kind = fin ? finaleKind : null;
      track.gates.forEach((gate, i) => {
        const side = run.taken[i];
        if (side) gateMeshes[i][side].visible = false;
      });
      track.obstacles.forEach((ob, i) => {
        const m = obstacleMeshes[i];
        if (!m) return;
        if (ob.type === 'saw') {
          m.group.position.x = sawX(ob, t);
          m.blade.rotation.y = t * 14;
        } else {
          const c = hammerCycle(ob, t);
          // hangs up, drops from 0.5, slams at 0.72, lifts again after the cycle wraps
          const up = c < 0.12 ? c / 0.12 : c < 0.5 ? 1 : c < 0.72 ? 1 - ((c - 0.5) / 0.22) ** 2 : 0;
          m.group.position.y = 0.7 + up * 4.6;
          m.warn.material.opacity = c >= 0.5 ? 0.6 : 0.25;
        }
      });

      const lift = fin ? 0.5 * Math.min(1, run.endTime * 0.8) : 0; // up onto the stage
      const jump = kind === 'striker' ? fin.jump * 1.6 : 0;
      const v = Math.min(run.people.length, POOL);
      if (kind === 'tower') layoutTower(v, fin.layers);
      // the ball of people flying from the cannon
      let cy = 0;
      let cz = 0;
      if (kind === 'cannon') {
        const f = fin.flight;
        const endY = fin.hit ? TARGET_Y : 0.6;
        const endZ = fin.hit ? targetZ + 1 : muzzle.z - fin.reach;
        const apex = 3 + fin.reach * 0.15;
        cz = muzzle.z + (endZ - muzzle.z) * f;
        cy = muzzle.y + (endY - muzzle.y) * f + 4 * apex * f * (1 - f);
      }
      let n = 0;
      for (let i = 0; i < v; i++) {
        const p = run.people[i];
        const px = p.x;
        const pz = -(run.z + p.rz);
        const swing = t * 15 + p.id * 1.7;
        if (kind === 'tower') {
          const slot = towerSlots[i];
          if (!slot) {
            // too many for the tower: cheer from the stage
            const hop = fin.counting ? Math.abs(Math.sin(t * 7 + p.id)) * 0.4 : 0;
            person(n++, p.id, px, lift + hop, pz, swing, 0, 1, fin.counting ? 1 : 0);
            continue;
          }
          // each layer climbs over two layer-times, starting in turn from the bottom
          const start = (slot.k * (fin.layers - 2)) / fin.layers;
          const c = clamp((fin.built - start) / 2, 0, 1);
          if (c <= 0) {
            person(n++, p.id, px, lift, pz, Math.sin(t * 4 + p.id) * 0.4, 0, 1);
            continue;
          }
          const e = c * c * (3 - 2 * c);
          const tx = slot.x + Math.sin(t * 1.6) * 0.015 * slot.k;
          const ty = lift + slot.k * LAYER_H;
          const tz = stageZ + slot.z;
          const top = slot.k === fin.layers - 1;
          const arms = c < 1 ? 0 : top ? 1 : 0.4;
          person(n++, p.id, px + (tx - px) * e, lift + (ty - lift) * e + Math.sin(c * Math.PI) * 1.4, pz + (tz - pz) * e, c < 1 ? t * 18 + p.id : 0.3, 0, 1, arms);
        } else if (kind === 'cannon') {
          if (!fin.fired) {
            // hop up and drop into the muzzle, one after another
            const c = clamp((fin.load - (i / v) * 0.8) / 0.2, 0, 1);
            if (c >= 1) continue;
            if (c <= 0) {
              person(n++, p.id, px, lift, pz, swing, 0, 1);
              continue;
            }
            const sc = c > 0.75 ? Math.max(0.01, (1 - c) / 0.25) : 1;
            const y = lift + (muzzle.y - 0.5 - lift) * c + Math.sin(c * Math.PI) * 3.5;
            person(n++, p.id, px + (muzzle.x - px) * c, y, pz + (muzzle.z - pz) * c, t * 20, c * 4, sc);
            continue;
          }
          const [ox, oy, oz] = flyOff[i];
          const spread = 0.5 + fin.flight;
          const fx = ox * spread;
          const fy = cy + oy * spread - 0.5;
          const fz = cz + oz * spread;
          if (!fin.landed) {
            const sc = Math.min(1, 0.3 + fin.sinceFire * 4);
            person(n++, p.id, fx, fy, fz, t * 20 + i, t * 7 + i, sc, 1);
          } else if (fin.hit) {
            // stuck all over the target
            const sp = slotOffset(i);
            const k = Math.min(1, 3.1 / (0.42 * Math.sqrt(v) + 0.3));
            const b = Math.min(1, fin.since / 0.25);
            const hx = sp.x * k;
            const hy = TARGET_Y - 0.55 + sp.z * k;
            const hz = targetZ + 0.35;
            person(n++, p.id, fx + (hx - fx) * b, fy + (hy - fy) * b, fz + (hz - fz) * b, Math.sin(t * 9 + p.id) * 0.5, 0, 1, 1);
          } else {
            // land on the runway, bounce, and cheer
            const sp = slotOffset(i);
            const b = Math.min(1, fin.since / 0.35);
            const gx = clamp(sp.x * 0.8, -TRACK_HALF + 0.4, TRACK_HALF - 0.4);
            const gz = cz + sp.z * 0.8;
            const hop = b < 1 ? Math.sin(b * Math.PI) * 0.8 : Math.abs(Math.sin(t * 7 + p.id)) * 0.45;
            const tilt = (1 - b) * ((t * 7 + i) % (Math.PI * 2));
            person(n++, p.id, fx + (gx - fx) * b, fy * (1 - b) + 0.04 + hop, fz + (gz - fz) * b, swing, tilt, 1, b >= 1 ? 1 : 0);
          }
        } else {
          const cheer = run.status === 'finished' ? Math.abs(Math.sin(t * 7 + p.id)) * 0.5 : 0;
          person(n++, p.id, px, lift + jump + cheer, pz, swing, 0, 1);
        }
      }
      for (const f of run.fallen) {
        if (n >= POOL) break;
        const a = f.age;
        if (f.kind === 'pit') {
          person(n++, f.id, f.x, -a * a * 14, -(f.z + a * 3), a * 20, a * 3, Math.max(0.01, 1 - a * 0.6));
        } else {
          const dir = f.id % 2 ? 1 : -1;
          person(n++, f.id, f.x + dir * a * 4, a * 9 - a * a * 14, -(f.z - a * 4), a * 25, a * 9, Math.max(0.01, 1 - a * 0.7));
        }
      }
      for (const m of parts) {
        m.count = n;
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }

      let want = null;
      let follow = 2.5;
      if (kind === 'striker') {
        button.scale.y = fin.jump === 0 && run.endTime > 2.4 ? 0.5 : 1;
        const puckY = 0.6 + fin.puck * (TOWER_H - 0.4);
        puck.position.y = puckY;
        bell.rotation.z = fin.bell ? Math.sin(t * 30) * 0.35 : 0;
        bell.scale.setScalar(fin.bell ? 1.25 : 1);
        // look above the puck so it sits low on screen, clear of the score at the top
        if (run.endTime > 1.4) want = { x: 9, y: 5 + puckY * 0.6, z: stageZ + 17, lx: 0, ly: 6.5 + puckY, lz: towerZ };
      }
      if (star) {
        const got = kind === 'tower' && fin.star;
        star.rotation.y = got ? t * 5 : Math.sin(t) * 0.4;
        star.scale.setScalar(got ? 1.35 + Math.sin(t * 10) * 0.08 : 1);
        starMat.emissiveIntensity = got ? 0.9 : 0.3;
        drawConfetti(0, starY, stageZ, got ? fin.since : 0);
      }
      if (kind === 'tower' && run.endTime > 1.4) {
        // pull back as the tower grows: its top about 45% down the screen (below the score,
        // with room for the star above it) and its base about 85% down, behind the buttons at the end
        const topY = lift + 1.2 + Math.max(0, fin.built - 1) * LAYER_H;
        const tanHalf = Math.tan((camera.fov * Math.PI) / 360);
        const span = Math.max(4, topY);
        const dist = Math.max(9, span / (0.8 * tanHalf));
        const ly = span * (0.7 / 0.8);
        want = { x: 3.5, y: ly + 1.5, z: stageZ + dist, lx: 0, ly, lz: stageZ };
      }
      if (barrel) {
        const recoil = kind === 'cannon' && fin.fired ? Math.max(0, 1 - fin.sinceFire / 0.5) : 0;
        const shake = kind === 'cannon' && fin.load >= 1 && !fin.fired ? Math.sin(t * 60) * 0.03 : 0;
        barrel.position.z = pivot.z + recoil * recoil * 1.2;
        barrel.rotation.x = ELEVATION + shake + recoil * 0.08;
        const puff = kind === 'cannon' && fin.fired ? fin.sinceFire : 99;
        smoke.visible = puff < 0.9;
        if (smoke.visible) {
          smoke.scale.setScalar(1 + puff * 4);
          smoke.material.opacity = 0.85 * (1 - puff / 0.9);
          smoke.position.set(muzzle.x, muzzle.y + puff * 2, muzzle.z - puff * 3);
        }
        const hit = kind === 'cannon' && fin.hit;
        target.rotation.x = hit ? -Math.sin(fin.since * 14) * 0.1 * Math.exp(-fin.since * 2) : 0;
        drawConfetti(0, TARGET_Y + 1, targetZ + 1, hit ? fin.since : 0);
      }
      if (kind === 'cannon' && run.endTime > 1.4) {
        if (!fin.fired) want = { x: 3.5, y: 7.5, z: stageZ + 10, lx: 0, ly: 3.5, lz: stageZ - 5 };
        else {
          // on a hit, stand back so the whole target sits between the score and the buttons
          const back = fin.hit ? Math.min(1, fin.since * 2) : 0;
          want = { x: 3, y: cy * 0.5 + 5 + back, z: cz + 15 + back * 5, lx: 0, ly: cy * 0.85 + 3 - back * 1.6, lz: cz - 6 + back * 2 };
          follow = 6;
        }
      }

      // camera: behind the crowd while running; swings round to watch the finale.
      // Finale cameras stay inside the line of palms so no tree blocks the view.
      if (!want) {
        const wz = -run.z;
        want = { x: run.x * 0.45, y: 8.5, z: wz + 10.5, lx: run.x * 0.45, ly: 1, lz: wz - ahead };
      }
      const k = Math.min(1, (fin ? follow : 10) * dt);
      for (const key of Object.keys(cam)) cam[key] += (want[key] - cam[key]) * k;
      camera.position.set(cam.x, cam.y, cam.z);
      camera.lookAt(cam.lx, cam.ly, cam.lz);
      sun.position.set(0, 14, camera.position.z - 330);

      renderer.render(scene, camera);
    },

    dispose() {
      el.remove();
      for (const x of disposables) x.dispose();
      for (const m of parts) m.dispose();
      confetti.dispose();
      if (clouds) clouds.dispose();
      trunks.dispose();
      fronds.dispose();
      renderer.dispose();
    },
  };
}
