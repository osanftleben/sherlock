import * as THREE from 'three';
import { Bag, addMesh, cyl, merge, std } from '../kit.js';
import { clockFace, posterWall, signTexture, softDisc } from '../textures.js';
import { idleFigure, makeFigure } from '../figures.js';
import { makeDroschke } from './traffic.js';

// Brunnen in der Mitte des Platzes, in der Wendeschleife der Droschke (traffic.js):
// Die Fahrspur bleibt rundum gut 6 m von seiner Mitte weg. Die beiden Laternen daneben
// stehen in index.js.
export const FOUNTAIN = { x: 0, z: -5, r: 2.5 };

// Seitenteil eines regelmäßigen Achtecks mit Umkreisradius R, Mitte in Richtung a.
function octagonSide(R, a, h, thick, y, x, z) {
  const apothem = R * Math.cos(Math.PI / 8);
  const len = 2 * R * Math.sin(Math.PI / 8) + thick * 0.85;
  const g = new THREE.BoxGeometry(len, h, thick);
  g.translate(0, y, apothem - thick / 2);
  g.rotateY(a);
  g.translate(x, 0, z);
  return g;
}

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
  // Die zweite wartet ohne Kutscher, der steht mit dem Kollegen am Kohlebecken.
  const cab2 = makeDroschke({ driver: false });
  cab2.position.set(24, 0, -12);
  cab2.rotation.y = Math.PI;
  scene.add(cab2);
  loc.collide(22.8, 25.2, -17.2, -9.6);
  buildCabRank(loc, ironMat);
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

  buildFountain(loc);
  buildKiosk(loc);
}

// Achteckiges Granitbecken, in der Mitte ein gusseiserner Schalenbrunnen. Im November
// abgestellt: Im Becken steht still das Regenwasser.
function buildFountain(loc) {
  const { scene } = loc;
  const { x, z, r: R } = FOUNTAIN;
  const granite = 0x6a6a66;
  const iron = 0x1f2a24;
  const b = new Bag();
  b.add(cyl(R - 0.2, R - 0.2, 0.3, 0, 0.15, 0, 8).rotateY(Math.PI / 8).translate(x, 0, z), 0x3a3a38);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.add(octagonSide(R, a, 0.55, 0.3, 0.275, x, z), granite);
    b.add(octagonSide(R + 0.05, a, 0.08, 0.42, 0.59, x, z), 0x76766f);
  }
  // Sockel, Säule, große Schale, kleine Schale, Knauf.
  b.add(cyl(0.5, 0.62, 0.8, x, 0.7, z, 8), granite);
  b.add(cyl(0.13, 0.2, 1.5, x, 1.85, z, 12), iron);
  b.add(cyl(1.0, 0.28, 0.3, x, 2.15, z, 20), iron);
  b.add(cyl(1.04, 1.04, 0.05, x, 2.32, z, 20), iron);
  b.add(cyl(0.08, 0.12, 0.7, x, 2.65, z, 10), iron);
  b.add(cyl(0.48, 0.14, 0.2, x, 3.05, z, 16), iron);
  b.add(cyl(0.03, 0.08, 0.45, x, 3.35, z, 8), iron);
  addMesh(scene, b.build(), std({ vertexColors: true, roughness: 0.6, metalness: 0.25 }));
  // Stehendes Wasser: dunkel und glatt, damit es die Laternen spiegelt.
  const water = cyl(R - 0.28, R - 0.28, 0.02, 0, 0.46, 0, 8).rotateY(Math.PI / 8).translate(x, 0, z);
  addMesh(scene, water, std({ color: 0x0a0e14, roughness: 0.06, metalness: 0.6, envMapIntensity: 1.4 }));
  const w = R * Math.cos(Math.PI / 8);
  loc.collide(x - w, x + w, z - w, z + w);
  loc.addHotspot({
    pos: [x, 1.4, z],
    radius: R,
    range: 3.6,
    label: 'Brunnen',
    action: { say: 'Granit und Gusseisen. Im November dreht die Stadt das Wasser ab, damit der Frost die Schalen nicht sprengt; im Becken steht nur, was der Regen bringt. Die Droschken wenden um ihn herum wie Planeten um eine Sonne, die ausgegangen ist.' },
  });
}

// Achteckiger Zeitungskiosk an der Nordwestecke. Eine Seite zeigt zum Platz und zur
// Pension hin, dort liegt die erleuchtete Auslage.
function buildKiosk(loc) {
  const { scene } = loc;
  const x = -10;
  const z = -14;
  const R = 1.15;
  // Blickrichtung der Auslage: zur Platzmitte und zum Viadukt.
  const a = Math.atan2(0 - x, 8 - z);
  const green = 0x1c2a22;
  const b = new Bag();
  b.add(cyl(R + 0.08, R + 0.12, 0.25, 0, 0.125, 0, 8).rotateY(a - Math.PI / 8).translate(x, 0, z), 0x2a2a28);
  const body = new THREE.CylinderGeometry(R, R, 2.2, 8);
  body.rotateY(a - Math.PI / 8);
  body.translate(x, 1.35, z);
  b.add(body, green);
  const eave = new THREE.CylinderGeometry(R + 0.4, R + 0.4, 0.1, 8);
  eave.rotateY(a - Math.PI / 8);
  eave.translate(x, 2.5, z);
  b.add(eave, 0x141c18);
  const roof = new THREE.CylinderGeometry(0.12, R + 0.38, 0.8, 8);
  roof.rotateY(a - Math.PI / 8);
  roof.translate(x, 2.95, z);
  b.add(roof, 0x141c18);
  b.add(cyl(0.03, 0.07, 0.5, x, 3.55, z, 8), 0x141c18);
  // Ablage unter der Auslage.
  const ledge = new THREE.BoxGeometry(1.0, 0.06, 0.35);
  ledge.translate(0, 0.95, R * Math.cos(Math.PI / 8) + 0.12);
  ledge.rotateY(a);
  ledge.translate(x, 0, z);
  b.add(ledge, 0x3a2a1c);
  addMesh(scene, b.build(), std({ vertexColors: true, roughness: 0.55, metalness: 0.3 }));

  const front = R * Math.cos(Math.PI / 8);
  // Auslage: ein Ausschnitt der Anschläge von der Litfaßsäule, ausgehängte Blätter und Plakate.
  const papers = posterWall().clone();
  papers.repeat.set(0.3, 0.8);
  papers.offset.set(0.55, 0.1);
  papers.needsUpdate = true;
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.7), new THREE.MeshBasicMaterial({ map: papers, color: new THREE.Color(1.1, 0.9, 0.65) }));
  pane.position.set(x + Math.sin(a) * (front + 0.01), 1.4, z + Math.cos(a) * (front + 0.01));
  pane.rotation.y = a;
  scene.add(pane);
  const signTex = signTexture('Zeitungen', { size: 120 });
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.22),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.32 }),
  );
  sign.position.set(x + Math.sin(a) * (front + 0.02), 2.12, z + Math.cos(a) * (front + 0.02));
  sign.rotation.y = a;
  scene.add(sign);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('glow'), color: 0xffb060, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.position.set(x + Math.sin(a) * (front + 0.3), 1.4, z + Math.cos(a) * (front + 0.3));
  glow.material.opacity = 0.3;
  glow.scale.setScalar(1.3);
  scene.add(glow);
  addPool(scene, x + Math.sin(a) * (front + 1.2), z + Math.cos(a) * (front + 1.2), 4.5, 0xc77b38, 0.28);

  loc.collide(x - R, x + R, z - R, z + R);
  loc.addHotspot({
    pos: [x, 1.5, z],
    radius: R + 0.2,
    range: 3.2,
    label: 'Zeitungskiosk',
    action: { say: 'Vossische, Börsen-Courier, Kladderadatsch und ein Dutzend Blätter, deren Namen ich nie gehört habe. Der Händler schläft hinter seiner Auslage im Sitzen, eine Fertigkeit, die man sonst nur bei Droschkenpferden findet. Berlin liest so gierig, wie es baut.' },
  });
}

// Halteplatz: Schild am Pfahl, zwei Kutscher wärmen sich an einem Kohlebecken.
function buildCabRank(loc, ironMat) {
  const { scene } = loc;
  const sx = 21.4;
  const sz = -7.4;
  addMesh(scene, cyl(0.04, 0.05, 2.6, sx, 1.3, sz, 8), ironMat);
  loc.collide(sx - 0.08, sx + 0.08, sz - 0.08, sz + 0.08);
  const tex = signTexture(['Droschken', 'Halteplatz'], { width: 768, size: 110 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.24), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25, side: THREE.DoubleSide }));
  sign.position.set(sx, 2.45, sz);
  sign.rotation.y = -Math.PI / 2;
  scene.add(sign);

  // Kohlebecken: Eisenkorb auf drei Beinen, die Glut leuchtet.
  const bx = 19.4;
  const bz = -3.4;
  const b = new Bag();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.BoxGeometry(0.035, 0.75, 0.035);
    leg.rotateX(0.18);
    leg.translate(0, 0.37, 0.24);
    leg.rotateY(a);
    leg.translate(bx, 0, bz);
    b.add(leg, 0x141614);
  }
  b.add(new THREE.CylinderGeometry(0.34, 0.24, 0.32, 12, 1, true).translate(bx, 0.86, bz), 0x1a1c1a);
  b.add(cyl(0.24, 0.24, 0.03, bx, 0.71, bz, 12), 0x1a1c1a);
  addMesh(scene, b.build(), std({ vertexColors: true, roughness: 0.7, metalness: 0.4, side: THREE.DoubleSide }));
  const coalMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.0, 0.22) });
  addMesh(scene, cyl(0.31, 0.31, 0.05, bx, 0.96, bz, 12), coalMat);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('glow'), color: 0xff7a30, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.position.set(bx, 1.15, bz);
  glow.scale.setScalar(2.2);
  scene.add(glow);
  const pool = addPool(scene, bx, bz, 5, 0xd0602a, 0.32);
  loc.collide(bx - 0.36, bx + 0.36, bz - 0.36, bz + 0.36);

  // Zwei Kutscher in Pelerinen und lackierten Hüten, wie der auf dem Bock.
  const looks = [
    { outfit: 'overcoat', cape: true, coat: 0x2a241c, hat: 'top', hatColor: 0x15120e, beard: 'full', hair: 0x6a6258, build: 'stout' },
    { outfit: 'overcoat', cape: true, coat: 0x1e2226, hat: 'top', hatColor: 0x121418, moustache: 'walrus', neck: 'scarf', tie: 0x5a2a20, height: 1.74 },
  ];
  // Auf der Seite zu den Häusern hin, damit man vom Platz aus die Glut und die Gesichter sieht.
  const men = [[bx + 0.8, bz - 0.35], [bx + 0.15, bz - 0.85]].map(([fx, fz], i) => {
    const fig = makeFigure(looks[i]);
    fig.position.set(fx, 0, fz);
    fig.rotation.y = Math.atan2(bx - fx, bz - fz);
    scene.add(fig);
    loc.collide(fx - 0.25, fx + 0.25, fz - 0.25, fz + 0.25);
    return fig;
  });
  loc.addHotspot({
    pos: [bx, 1.3, bz],
    radius: 1.3,
    range: 3.2,
    label: 'Kutscher am Kohlebecken',
    action: { say: '„N’Abend, Herr. Wärmen Se sich ruhig mit, kost’ nischt.“ Die beiden reden über Hafer und den Kaiser, in dieser Reihenfolge, und finden beides zu teuer.' },
  });

  loc.onUpdate((dt, t, { camera }) => {
    const f = 0.85 + 0.1 * Math.sin(t * 7.3) * Math.sin(t * 2.9 + 1.3) + 0.05 * Math.sin(t * 17);
    glow.material.opacity = 0.6 * f;
    pool.material.opacity = 0.32 * f;
    for (const m of men) idleFigure(m, t, camera.position);
  });
}

// Weicher Lichtfleck auf dem Pflaster, wie unter den Laternen (lamps.js).
function addPool(scene, x, z, size, color, opacity) {
  const geo = new THREE.PlaneGeometry(size, size);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ map: softDisc('lampPool', 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0.33)'), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
  return addMesh(scene, geo, mat, x, 0.03, z);
}
