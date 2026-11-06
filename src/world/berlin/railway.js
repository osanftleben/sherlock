import * as THREE from 'three';
import { Bag, addMesh, cyl, merge, std } from '../kit.js';
import { brick, fogPuff, signTexture } from '../textures.js';
import { addSign } from './facades.js';

// Stadtbahn: Viadukt mit Bögen, Bahnhof Börse, durchfahrender Zug mit Rauch.
export function buildRailway(loc, r, brickMat) {
  const { scene } = loc;
  // Stadtbahnviadukt: z = 18 bis 32, mit Bögen. Bogen bei x = 0 ist der Durchgang zur Spree.
  const VZ0 = 18;
  const VZ1 = 32;
  const VH = 8.5;
  const SEG = 11;
  // Umriss mit offenem Bogen statt Rechteck mit Loch: Ein Loch, das bis zum Boden
  // reicht, bekommt beim Extrudieren eine Bodenfläche auf Höhe 0, die mit dem
  // Pflaster flackert.
  const archShape = () => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(1.1, 0);
    s.lineTo(1.1, 4.1);
    s.absarc(SEG / 2, 4.1, SEG / 2 - 1.1, Math.PI, 0, true);
    s.lineTo(SEG - 1.1, 0);
    s.lineTo(SEG, 0);
    s.lineTo(SEG, VH);
    s.lineTo(0, VH);
    s.closePath();
    return s;
  };
  const archGeo = new THREE.ExtrudeGeometry(archShape(), { depth: VZ1 - VZ0, bevelEnabled: false, curveSegments: 12 });
  const viaductParts = [];
  const infill = new Bag();
  const archLights = new Bag();
  const stationArches = new Set([-3, -2, 2, 3]);
  for (let i = -24; i <= 24; i++) {
    const g = archGeo.clone();
    const ax = i * SEG - SEG / 2;
    g.translate(ax, 0, VZ0);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    const nor = g.attributes.normal;
    for (let k = 0; k < pos.count; k++) {
      if (Math.abs(nor.getZ(k)) > 0.5) uv.setXY(k, pos.getX(k) * 0.33, pos.getY(k) * 0.33);
      else uv.setXY(k, pos.getZ(k) * 0.33, (pos.getX(k) + pos.getY(k)) * 0.33);
    }
    viaductParts.push(g);
    if (i !== 0) {
      // Gefüllte Bögen: Lager und Kneipen unter der Bahn.
      const lit = r() < 0.28 || stationArches.has(i);
      infill.box(0xa88872, SEG - 2, 8, 0.3, i * SEG, 4, VZ0 + 1.3);
      infill.box(0x241a14, 1.5, 2.7, 0.1, i * SEG + 2.2, 1.35, VZ0 + 1.1);
      if (lit) archLights.box(0xffffff, 3, 1.6, 0.04, i * SEG - 1.8, 2.3, VZ0 + 1.13);
      infill.box(0xa88872, SEG - 2, 8, 0.3, i * SEG, 4, VZ1 - 1.3);
      loc.collide(ax, ax + SEG, VZ0, VZ1);
    } else {
      loc.collide(ax, ax + 1.1, VZ0, VZ1);
      loc.collide(ax + SEG - 1.1, ax + SEG, VZ0, VZ1);
    }
  }
  addMesh(scene, merge(viaductParts), brickMat);
  addMesh(scene, infill.build(), std({ vertexColors: true, ...brick(), roughness: 0.9 }));
  addMesh(scene, archLights.build(), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 0.31, 0.09), vertexColors: true }));
  const deck = new Bag();
  const deckW = 49 * SEG;
  deck.box(0x2c2622, deckW, 0.5, VZ1 - VZ0 + 0.8, 0, VH + 0.25, (VZ0 + VZ1) / 2);
  addMesh(scene, deck.build(), std({ vertexColors: true, roughness: 0.9 }));
  const rails = new Bag();
  for (const z of [VZ0 - 0.2, VZ1 + 0.2]) {
    rails.box(0x15181a, deckW, 0.07, 0.07, 0, VH + 1.45, z);
    for (let x = -deckW / 2; x < deckW / 2; x += 2.5) rails.box(0x15181a, 0.06, 1, 0.06, x, VH + 0.95, z);
  }
  for (const z of [22.2, 24, 26, 27.8]) rails.box(0x35363a, deckW, 0.14, 0.09, 0, VH + 0.6, z);
  addMesh(scene, rails.build(), std({ vertexColors: true, roughness: 0.5, metalness: 0.6 }));

  // Bahnhof Börse: Halle aus Eisen und Glas auf dem Viadukt.
  const hall = new THREE.Mesh(
    new THREE.CylinderGeometry(9.5, 9.5, 72, 24, 1, true, -Math.PI / 2, Math.PI),
    std({ color: 0x1b2430, roughness: 0.3, metalness: 0.4, side: THREE.DoubleSide }),
  );
  hall.rotation.z = Math.PI / 2;
  hall.position.set(0, VH + 3.4, 25);
  scene.add(hall);
  const ribs = new Bag();
  for (let x = -36; x <= 36; x += 4) {
    const rib = new THREE.TorusGeometry(9.55, 0.07, 6, 24, Math.PI);
    rib.rotateY(Math.PI / 2);
    rib.translate(x, VH + 3.4, 25);
    ribs.add(rib, 0x0c0e10);
  }
  ribs.box(0x3a2c24, 72, 3.2, 0.5, 0, VH + 1.9, VZ0 + 0.2);
  ribs.box(0x3a2c24, 72, 3.2, 0.5, 0, VH + 1.9, VZ1 - 0.2);
  addMesh(scene, ribs.build(), std({ vertexColors: true, roughness: 0.6 }));
  // Hallenfenster, durch die das Licht der Bahnsteige fällt.
  const hallWindows = new Bag();
  for (let x = -34; x <= 34; x += 4) {
    hallWindows.box(0xffffff, 2.6, 1.3, 0.08, x, VH + 2, VZ0 - 0.1);
    hallWindows.box(0xffffff, 2.6, 1.3, 0.08, x, VH + 2, VZ1 + 0.1);
  }
  addMesh(scene, hallWindows.build(), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 0.42, 0.15), vertexColors: true }));

  addSign(loc, new THREE.Vector3(0, 7.65, VZ0 - 0.1), 0, signTexture('Bahnhof Börse', { bg: '#20201c', fg: '#e0c98a' }), 9, 1.4);

  // Stadtbahnzug
  const train = buildTrain();
  scene.add(train.group);
  train.group.position.set(-400, VH + 0.65, 24);
  let trainX = -420;
  let trainWait = 12;
  const smoke = [];
  const smokeMat = new THREE.SpriteMaterial({ map: fogPuff(), color: 0x70757d, transparent: true, opacity: 0.5, depthWrite: false });
  for (let i = 0; i < 16; i++) {
    const s = new THREE.Sprite(smokeMat.clone());
    s.visible = false;
    scene.add(s);
    smoke.push({ s, life: 0 });
  }
  let smokeIdx = 0;
  let smokeTimer = 0;
  loc.trainDistance = Infinity;
  loc.onUpdate((dt, t, { camera }) => {
    if (trainWait > 0) {
      trainWait -= dt;
      loc.trainDistance = Infinity;
    } else {
      trainX += 13 * dt;
      if (trainX > 340) {
        trainX = -420;
        trainWait = 50 + r() * 40;
      }
      train.group.position.x = trainX;
      const carsLen = train.length;
      const nearest = Math.max(trainX - carsLen, Math.min(camera.position.x, trainX));
      loc.trainDistance = Math.hypot(nearest - camera.position.x, 24 - camera.position.z);
      smokeTimer -= dt;
      if (smokeTimer < 0) {
        smokeTimer = 0.32;
        const puff = smoke[smokeIdx++ % smoke.length];
        puff.life = 1;
        puff.s.visible = true;
        puff.s.position.set(trainX + 7.2, VH + 5.5, 24);
      }
    }
    for (const p of smoke) {
      if (p.life <= 0) continue;
      p.life -= dt * 0.22;
      if (p.life <= 0) p.s.visible = false;
      p.s.position.y += dt * 1.7;
      p.s.position.x -= dt * 1.5;
      const size = 3 + (1 - p.life) * 9;
      p.s.scale.set(size, size, 1);
      p.s.material.opacity = p.life * 0.5;
    }
  });
}

function buildTrain() {
  const group = new THREE.Group();
  const bag = new Bag();
  const lit = new Bag();
  // Lokomotive voran in +X.
  bag.box(0x14181c, 8, 0.5, 2.6, 2, 1.1, 0);
  bag.add(cylX(0.95, 5, 2.8, 2.2, 0), 0x171b1f);
  bag.box(0x171b1f, 2.6, 2.3, 2.6, -1, 2.6, 0);
  bag.box(0x0c0e10, 2.9, 0.12, 2.9, -1, 3.8, 0);
  bag.add(cyl(0.3, 0.26, 1.3, 4.9, 3.5, 0, 10), 0x0c0e10);
  bag.add(cyl(0.45, 0.45, 0.6, 3, 3.1, 0, 10), 0x24201a);
  for (const x of [0.5, 2.3, 4.1]) {
    for (const z of [-1.2, 1.2]) bag.add(cylX2(0.7, x, 0.7, z), 0x0e1012);
  }
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 4, 1.8) }));
  lamp.position.set(6.1, 1.9, 0);
  group.add(lamp);
  // Wagen
  const CAR = 12.5;
  const COUNT = 6;
  for (let c = 0; c < COUNT; c++) {
    const x = -8.5 - c * (CAR + 0.6);
    bag.box(0x2a2a22, CAR, 2.5, 2.7, x, 2.2, 0);
    bag.box(0x12100e, CAR + 0.2, 0.15, 2.9, x, 3.55, 0);
    bag.box(0x0e0e0e, CAR, 0.4, 2.4, x, 0.85, 0);
    for (const wx of [-4, 4]) {
      for (const wz of [-1.1, 1.1]) bag.add(cylX2(0.42, x + wx, 0.42, wz), 0x0e1012);
    }
    for (let w = 0; w < 7; w++) {
      const wx = x - CAR / 2 + 1 + w * 1.77;
      lit.box(0xffffff, 0.9, 0.9, 2.74, wx, 2.5, 0);
    }
  }
  group.add(new THREE.Mesh(bag.build(), std({ vertexColors: true, roughness: 0.5, metalness: 0.3 })));
  group.add(new THREE.Mesh(lit.build(), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.25, 0.6), vertexColors: true })));
  return { group, length: COUNT * (CAR + 0.6) + 8 };
}

function cylX(r, len, y, x, z) {
  const g = new THREE.CylinderGeometry(r, r, len, 14);
  g.rotateZ(Math.PI / 2);
  g.translate(x + 2.1, y, z);
  return g;
}

function cylX2(r, x, y, z) {
  const g = new THREE.CylinderGeometry(r, r, 0.08, 14);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  return g;
}
