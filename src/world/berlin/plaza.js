import * as THREE from 'three';
import { Bag, addMesh, cyl, merge, std } from '../kit.js';
import { clockFace, posterWall } from '../textures.js';
import { makeDroschke } from './traffic.js';

export function buildPlaza(loc, r, ironMat) {
  const { scene } = loc;
  // Bäume: kahle Linden im November, jeder Ast ein Zylinder.
  const branches = [];
  const addBranch = (start, dir, len, rad, depth) => {
    const end = start.clone().addScaledVector(dir, len);
    const g = new THREE.CylinderGeometry(rad * 0.7, rad, len, 5);
    g.translate(0, len / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    g.applyQuaternion(q);
    g.translate(start.x, start.y, start.z);
    branches.push(g);
    if (depth <= 0) return;
    const n = depth > 2 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const nd = dir.clone().add(new THREE.Vector3(r() - 0.5, (r() - 0.25) * 0.7, r() - 0.5).multiplyScalar(1.3)).normalize();
      addBranch(end, nd, len * (0.62 + r() * 0.2), rad * 0.62, depth - 1);
    }
  };
  const trees = [[-22, -14], [-22, 6], [22, -14], [22, 6], [-11, 8], [11, 8]];
  for (const [x, z] of trees) {
    addBranch(new THREE.Vector3(x, 0, z), new THREE.Vector3(0, 1, 0), 3.2, 0.2, 5);
    loc.collide(x - 0.22, x + 0.22, z - 0.22, z + 0.22);
  }
  addMesh(scene, merge(branches), std({ color: 0x14100d, roughness: 1 }));

  // Litfaßsäule
  const lx = -16;
  const lz = -3;
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 3.1, 24, 1, true), std({ map: posterWall(), roughness: 0.9, emissive: 0x332a1c, emissiveMap: posterWall() }));
  column.position.set(lx, 1.85, lz);
  scene.add(column);
  const capBag = new Bag();
  capBag.add(cyl(0.95, 0.98, 0.3, lx, 0.15, lz, 24), 0x1a2019);
  capBag.add(cyl(0.9, 0.9, 0.3, lx, 3.45, lz, 24), 0x1a2019);
  capBag.add(cyl(0.2, 1.0, 0.7, lx, 3.95, lz, 24), 0x1a2019);
  capBag.add(cyl(0.03, 0.09, 0.3, lx, 4.42, lz, 8), 0x1a2019);
  addMesh(scene, capBag.build(), std({ vertexColors: true, roughness: 0.5, metalness: 0.4 }));
  loc.collide(lx - 0.7, lx + 0.7, lz - 0.7, lz + 0.7);
  loc.anchor('litfass', lx, 1.7, lz);
  loc.addHotspot({
    id: 'litfass',
    pos: [lx, 1.7, lz],
    radius: 0.9,
    range: 3.2,
    label: 'Litfaßsäule',
    action: { say: 'Eine Erfindung des Berliner Druckers Ernst Litfaß: Die Stadt hat ihre Reklame gezähmt, indem sie ihr eine Säule gab. Wintergarten, Zirkus Renz, Lagerbier. Auch Extrablätter hängen hier.' },
  });

  // Urania-Säule: öffentliche Normaluhr, seit diesem Jahr neu in der Stadt.
  const ux = 14;
  const uz = -10;
  const urania = new Bag();
  urania.add(cyl(0.3, 0.42, 0.4, ux, 0.2, uz, 12), 0x223021);
  urania.add(cyl(0.16, 0.2, 3.2, ux, 2, uz, 12), 0x223021);
  urania.add(cyl(0.35, 0.35, 0.8, ux, 3.9, uz, 12), 0x223021);
  urania.add(cyl(0.04, 0.3, 0.45, ux, 4.5, uz, 12), 0x223021);
  addMesh(scene, urania.build(), std({ vertexColors: true, roughness: 0.4, metalness: 0.5 }));
  const face = clockFace(9, 40, 128);
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20), new THREE.MeshBasicMaterial({ map: face, color: new THREE.Color(1.2, 1.1, 0.85) }));
    const a = (i / 4) * Math.PI * 2;
    p.position.set(ux + Math.sin(a) * 0.36, 3.9, uz + Math.cos(a) * 0.36);
    p.rotation.y = a;
    scene.add(p);
  }
  loc.collide(ux - 0.4, ux + 0.4, uz - 0.4, uz + 0.4);
  loc.addHotspot({
    pos: [ux, 2.6, uz],
    radius: 1,
    range: 3.6,
    label: 'Urania-Säule',
    action: { say: 'Die neue Urania-Säule: Normaluhr, Wetterdaten, Sternkarte. Zwanzig Minuten vor zehn, 4 Grad, Luftdruck fallend. Berlin liebt es, wenn man ihm die genaue Zeit sagt.' },
  });

  // Café Achteck: die grüne Berliner Bedürfnisanstalt.
  const cx = -24;
  const cz = 12;
  const octo = new Bag();
  octo.add(cyl(1.4, 1.4, 2.1, cx, 1.05, cz, 8), 0x1f3a2a);
  octo.add(cyl(1.55, 1.5, 0.12, cx, 2.15, cz, 8), 0x162a1e);
  octo.add(cyl(0.3, 1.5, 0.6, cx, 2.5, cz, 8), 0x162a1e);
  addMesh(scene, octo.build(), std({ vertexColors: true, roughness: 0.5, metalness: 0.3 }));
  loc.collide(cx - 1.25, cx + 1.25, cz - 1.25, cz + 1.25);
  loc.addHotspot({
    pos: [cx, 1.5, cz],
    radius: 1.4,
    range: 3.2,
    label: 'Grünes Achteck',
    action: { say: 'Gusseisern, grün, achteckig. Die Berliner nennen es „Café Achteck“ – der einzige Ort der Stadt, an dem man ohne Konsumzwang nichts bestellt.' },
  });

  // Plumpe: die Straßenpumpe.
  const px = 6.4;
  const pz = -68;
  const pump = new Bag();
  const py = 0.13;
  pump.add(cyl(0.12, 0.2, 1.8, px, py + 0.9, pz, 10), 0x25342a);
  pump.add(cyl(0.2, 0.15, 0.3, px, py + 1.9, pz, 10), 0x25342a);
  pump.add(cyl(0.03, 0.05, 0.25, px, py + 2.15, pz, 8), 0x25342a);
  pump.box(0x25342a, 0.04, 0.06, 0.8, px, py + 1.5, pz + 0.3);
  pump.box(0x25342a, 0.12, 0.1, 0.3, px, py + 0.75, pz - 0.2);
  addMesh(scene, pump.build(), std({ vertexColors: true, roughness: 0.4, metalness: 0.5 }));
  loc.collide(px - 0.2, px + 0.2, pz - 0.2, pz + 0.2);
  loc.addHotspot({
    pos: [px, 1.4, pz],
    radius: 0.6,
    range: 2.5,
    label: 'Plumpe',
    action: { say: 'Eine Straßenpumpe, „Plumpe“ im hiesigen Idiom. Das Wasser ist eisig und schmeckt nach Eisen. Das Berlinische ist eine Sprache, die sich auch beim Trinken nicht schont.' },
  });

  // Droschkenplatz mit wartender Droschke
  const cab = makeDroschke();
  cab.position.set(24, 0, -2);
  cab.rotation.y = Math.PI;
  scene.add(cab);
  loc.collide(22.8, 25.2, -8, 2.2);
  loc.addHotspot({
    pos: [24, 1.5, -1],
    radius: 1.6,
    range: 3.4,
    label: 'Droschke',
    action: { say: '„Na, wohin, Herr Doktor? Keen Doktor? Sehn aber so aus.“ Der Kutscher mustert mich und wendet sich wieder seiner Stulle zu. Für diesen Fall bleibe ich zu Fuß – die Wege sind kurz, und zu Fuß sieht man mehr.' },
  });

  // Bänke
  const bench = new Bag();
  for (const [x, z] of [[-14, 6], [14, 6]]) {
    for (let i = 0; i < 4; i++) bench.box(0x3a2a1c, 1.8, 0.04, 0.12, x, 0.48, z - 0.2 + i * 0.14);
    bench.box(0x3a2a1c, 1.8, 0.4, 0.04, x, 0.72, z + 0.32);
    bench.box(0x0e1110, 0.08, 0.5, 0.5, x - 0.8, 0.25, z);
    bench.box(0x0e1110, 0.08, 0.5, 0.5, x + 0.8, 0.25, z);
    loc.collide(x - 0.9, x + 0.9, z - 0.3, z + 0.35);
  }
  addMesh(scene, bench.build(), std({ vertexColors: true, roughness: 0.8 }));
}
