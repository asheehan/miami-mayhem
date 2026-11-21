// The 3D view of a run, drawn with three.js. No game rules: it only reads the run.
// Sim z runs forward; in the scene that is -z, so the camera looks down the boardwalk.
import * as THREE from 'three';
import { TRACK_HALF, STAGE, gateLabel, isGood, sawX, hammerCycle } from './track.js';
import { strikerState } from './sim.js';

const SHIRTS = ['#ff3d9a', '#ffe14d', '#0bb5c4', '#ff8a4c', '#9ff7f2', '#b46bff', '#59d86b', '#ffffff'];
const SKINS = ['#f2c9a0', '#d9a273', '#a86f44', '#7a4a2b', '#f7dcc0'];
const TOWER_H = 26;
const POOL = 190; // people drawn at once, including ones tumbling away

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

export function createView(track) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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
  const button = new THREE.Mesh(keep(new THREE.CylinderGeometry(4.2, 4.4, 0.5, 28)), mat('#ff2d46'));
  button.position.set(0, 0.25, stageZ);
  const towerZ = stageZ - 7;
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
  const bell = new THREE.Mesh(keep(new THREE.SphereGeometry(1.5, 16, 12)), mat('#ffe14d'));
  bell.position.set(0, TOWER_H + 1.4, towerZ);
  const puck = new THREE.Mesh(keep(new THREE.BoxGeometry(2.8, 0.8, 1)), mat('#0bb5c4'));
  puck.position.set(0, 0.6, towerZ + 0.7);
  scene.add(button, tower, bell, puck);

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

  // One person: feet at (x, y, z), `swing` drives the run cycle, `tilt` tips them over.
  function person(i, id, x, y, z, swing, tilt, s) {
    const bob = Math.abs(Math.sin(swing)) * 0.06;
    const a = Math.sin(swing) * 0.9;
    place(body, i, x, y + (0.56 + bob) * s, z, tilt, 0, s);
    place(head, i, x, y + (0.95 + bob) * s, z - Math.sin(tilt) * 0.3 * s, tilt, 0, s);
    place(legL, i, x - 0.09 * s, y + (0.38 + bob) * s, z, a + tilt, 0, s);
    place(legR, i, x + 0.09 * s, y + (0.38 + bob) * s, z, -a + tilt, 0, s);
    place(armL, i, x - 0.24 * s, y + (0.78 + bob) * s, z, -a + tilt, 0.15, s);
    place(armR, i, x + 0.24 * s, y + (0.78 + bob) * s, z, a + tilt, -0.15, s);
    const c = shirt[id % shirt.length];
    body.setColorAt(i, c);
    armL.setColorAt(i, c);
    armR.setColorAt(i, c);
    head.setColorAt(i, skin[id % skin.length]);
    legL.setColorAt(i, shorts);
    legR.setColorAt(i, shorts);
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
      const ended = run.status === 'finale' || run.status === 'finished';
      const striker = run.status === 'finale' ? strikerState(run) : null;

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

      const jump = striker ? striker.jump * 1.6 : 0;
      let n = 0;
      for (const p of run.people) {
        if (n >= POOL) break;
        const cheer = run.status === 'finished' ? Math.abs(Math.sin(t * 7 + p.id)) * 0.5 : 0;
        person(n++, p.id, p.x, (ended ? 0.5 * Math.min(1, run.endTime * 0.8) : 0) * (run.status === 'finale' ? 1 : 0) + jump + cheer, -(run.z + p.rz), t * 15 + p.id * 1.7, 0, 1);
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

      button.scale.y = striker && striker.jump === 0 && run.endTime > 2.4 ? 0.5 : 1;
      const puckY = 0.6 + (striker ? striker.puck : 0) * (TOWER_H - 0.4);
      puck.position.y = puckY;
      bell.rotation.z = striker && striker.bell ? Math.sin(t * 30) * 0.35 : 0;
      bell.scale.setScalar(striker && striker.bell ? 1.25 : 1);

      // camera: behind the crowd while running; swings round to watch the tower in the finale
      let want;
      if (striker && run.endTime > 1.4) {
        // look above the puck so it sits low on screen, clear of the score at the top
        want = { x: 9, y: 5 + puckY * 0.6, z: stageZ + 17, lx: 0, ly: 6.5 + puckY, lz: towerZ };
      } else {
        const wz = -run.z;
        want = { x: run.x * 0.45, y: 8.5, z: wz + 10.5, lx: run.x * 0.45, ly: 1, lz: wz - ahead };
      }
      const k = Math.min(1, (striker ? 2.5 : 10) * dt);
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
      trunks.dispose();
      fronds.dispose();
      renderer.dispose();
    },
  };
}
