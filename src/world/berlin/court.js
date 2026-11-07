import * as THREE from 'three';
import { Bag, addMesh, box, cyl, merge, std } from '../kit.js';
import { softDisc } from '../textures.js';
import { BAY_W } from './facades.js';
import { LANTERN_GLASS, lampWash, lightPool, wallLantern } from './lamps.js';

// Hinterhof hinter der Tordurchfahrt neben Kesslers Werkstatt (Rosenthaler Straße, Ostseite).
// Der Hof reicht von der Rückseite der Straßenhäuser (x = 23) bis zum Quergebäude und von
// der Brandmauer der Häuser an der Sophienstraße (z = -81) bis zum Seitenflügel.
// Muss vor facades.finish() gebaut werden, weil die Hofwände Fensterachsen der Häuserzeilen sind.
export const COURT = { x0: 23.34, x1: 23.34 + 3 * BAY_W, z0: -81, z1: -81.4 + 3 * BAY_W };

export function buildCourt(loc, facades, { brickMat, ironMat }) {
  const { scene } = loc;
  const { x0, x1, z0, z1 } = COURT;

  // Rückseiten der Straßenhäuser; die unterste Achse ganz im Norden ist die Hofseite des Tors.
  facades.courtWall({ x: x0, z: z1, face: 'east', bays: 3, ground: ['ground', 'ground', null], color: 0x8a8070, lit: 0.12, glow: [1] });
  // Quergebäude mit Hauseingang, Seitenflügel.
  const quer = facades.courtWall({ x: x1, z: -81.4, face: 'west', bays: 3, ground: ['ground', 'door', 'ground'], color: 0x847a6a, lit: 0.3, glow: [0] });
  facades.courtWall({ x: x1, z: z1, face: 'north', bays: 3, color: 0x8e8472, lit: 0.25, glow: [2] });

  // Brandmauer: nackter Ziegel, so hoch wie die Hofwände.
  const H = quer.H + 0.3;
  addMesh(scene, box(x1 - x0, H, 0.06, (x0 + x1) / 2, H / 2, z0 + 0.03), brickMat);
  loc.collide(x0 - 0.34, x1 + 0.34, -81.4, z0 + 0.06);

  const { px, pz } = courtProps(loc);

  // Laterne neben dem Eingang zum Quergebäude: ein warmer Fleck im Hof, ohne eigenes Licht.
  // Ihr Schein liegt auf dem Pflaster bis zur Pumpe; die Erdgeschossfenster (glow) hellen die
  // Ecken bei Teppichstange und Handwagen auf, damit beide sich gegen die Steine abzeichnen.
  const at = (lx, y, lz) => new THREE.Vector3(lx, y, lz).applyMatrix4(quer.base);
  const wall = at(1.5 * BAY_W + 1.2, 3.07, 0);
  const lanternIron = new Bag();
  const glass = [];
  const wash = [];
  const door = wallLantern(lanternIron, glass, wall, at(1.5 * BAY_W + 1.2, 3.07, 1).sub(wall), 0.4, wash);
  addMesh(scene, lanternIron.build(), std({ vertexColors: true, roughness: 0.5, metalness: 0.5 }));
  addMesh(scene, merge(glass), new THREE.MeshBasicMaterial({ color: LANTERN_GLASS }));
  addMesh(scene, merge(wash), lampWash());
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('lampGlow'), color: 0xffa858, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.position.copy(door);
  glow.scale.setScalar(1.5);
  scene.add(glow);
  const out = at(1.5 * BAY_W + 1.2, 0, 1).sub(at(1.5 * BAY_W + 1.2, 0, 0));
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), lightPool(0xc77b38, 0.42));
  pool.position.set(door.x + out.x * 1.6, 0.03, door.z + out.z * 1.6);
  pool.scale.set(9, 1, 9);
  scene.add(pool);

  loc.addHotspot({
    pos: [px, 1.2, pz],
    radius: 0.5,
    range: 3,
    label: 'Schwengelpumpe',
    action: { say: 'Hobrechts Leitungen reichen bis in die Küchen der Vorderhäuser. Im Hof pumpt man trotzdem noch, für die Wäsche, für die Pferde und für alle, die hinten wohnen und kein Geld für den Wasserzins haben.' },
  });
}

// Glatter Schlauch durch die Punkte, für gebogene Eisenteile.
function tube(pts, r, seg = 12) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z))), seg, r, 6);
}

// Speichenrad in der xy-Ebene: Felge aus Holz, eiserner Reif, Nabe, zehn Speichen.
function wheel(bag, wood, x, y, z, R) {
  const c = new THREE.Color(wood);
  bag.add(new THREE.TorusGeometry(R - 0.02, 0.022, 5, 24).translate(x, y, z), c);
  bag.add(new THREE.TorusGeometry(R, 0.009, 4, 24).translate(x, y, z), 0x24221f);
  bag.add(cyl(0.055, 0.055, 0.12, 0, 0, 0, 8).rotateX(Math.PI / 2).translate(x, y, z), c.clone().multiplyScalar(0.7));
  for (let k = 0; k < 10; k++) {
    bag.add(box(0.022, R - 0.06, 0.022, 0, (R - 0.06) / 2 + 0.03, 0).rotateZ((k / 10) * Math.PI * 2 + 0.2).translate(x, y, z), c.clone().multiplyScalar(0.88));
  }
}

// Schwengelpumpe, Aschkästen, Leiterwagen und Teppichstange. Gibt die Lage der Pumpe zurück.
function courtProps(loc) {
  const { scene } = loc;
  const { x0, x1, z0, z1 } = COURT;
  const paint = new Bag(); // gestrichenes Gusseisen
  const stone = new Bag(); // Granit, Holz, Asche: alles Matte
  const zinc = new Bag();
  const green = 0x2c3e30;
  const dark = 0x1c241e;

  // Schwengelpumpe: Granitplatte, Steintrog im Westen, gusseiserne Säule mit Ringen und Haube,
  // gebogenes Ausflussrohr über dem Trog, Schwengel nach Süden mit Griffknauf.
  const px = x0 + 6.2;
  const pz = -76.8;
  stone.box(0x6c6a64, 1.2, 0.1, 1.2, px, 0.05, pz);
  stone.box(0x5f5d58, 1.24, 0.03, 1.24, px, 0.015, pz);
  const tx = px - 0.62;
  const tw = 0.56;
  const tl = 0.9;
  const th = 0.42;
  stone.box(0x5a5853, tw, 0.08, tl, tx, 0.14, pz);
  for (const s of [-1, 1]) {
    stone.box(0x605e58, 0.08, th, tl, tx + s * (tw / 2 - 0.04), 0.1 + th / 2, pz);
    stone.box(0x5c5a55, tw - 0.16, th, 0.08, tx, 0.1 + th / 2, pz + s * (tl / 2 - 0.04));
    // Abgegriffene Oberkante etwas heller.
    stone.box(0x76736c, 0.09, 0.02, tl + 0.01, tx + s * (tw / 2 - 0.04), 0.1 + th, pz);
  }
  const water = new THREE.Mesh(new THREE.PlaneGeometry(tw - 0.16, tl - 0.16).rotateX(-Math.PI / 2), std({ color: 0x0c1214, roughness: 0.06, metalness: 0.2 }));
  water.position.set(tx, 0.1 + th - 0.07, pz);
  scene.add(water);

  const prof = [
    [0, 0.1], [0.17, 0.1], [0.17, 0.19], [0.145, 0.22], [0.145, 0.3], [0.12, 0.34],
    [0.105, 0.38], [0.092, 1.25], [0.12, 1.28], [0.12, 1.33], [0.1, 1.36],
    [0.135, 1.4], [0.135, 1.6], [0.16, 1.63], [0.16, 1.67], [0.125, 1.71],
    [0.08, 1.78], [0.035, 1.82], [0.045, 1.86], [0.03, 1.9], [0, 1.92],
  ];
  paint.add(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 16).translate(px, 0, pz), green);
  // Kanneluren am Schaft.
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    paint.add(box(0.022, 0.84, 0.022, px + Math.cos(a) * 0.092, 0.8, pz + Math.sin(a) * 0.092), green);
  }
  // Ausfluss nach Westen, vorn nach unten gebogen, mit Mundstück.
  paint.add(tube([[px - 0.08, 1.06, pz], [px - 0.3, 1.06, pz], [px - 0.44, 1.0, pz], [px - 0.5, 0.86, pz]], 0.032), green);
  paint.add(cyl(0.04, 0.045, 0.06, px - 0.5, 0.85, pz, 8), green);
  // Lagerbock oben auf der Südseite, Schwengel mit Knauf, Kolbenstange in die Haube.
  for (const s of [-1, 1]) paint.box(green, 0.025, 0.14, 0.12, px + s * 0.04, 1.72, pz - 0.12);
  paint.add(cyl(0.018, 0.018, 0.12, 0, 0, 0, 6).rotateZ(Math.PI / 2).translate(px, 1.75, pz - 0.15), dark);
  paint.add(tube([[px, 1.78, pz + 0.06], [px, 1.75, pz - 0.15], [px, 1.66, pz - 0.5], [px, 1.44, pz - 0.84], [px, 1.25, pz - 1.0]], 0.022, 16), green);
  paint.add(new THREE.SphereGeometry(0.04, 8, 6).scale(1, 1.3, 1).translate(px, 1.22, pz - 1.02), green);
  paint.add(cyl(0.015, 0.015, 0.12, px, 1.74, pz + 0.04, 6), dark);
  loc.collide(px - 0.92, px + 0.3, pz - 0.45, pz + 0.45);
  loc.collide(px - 0.1, px + 0.1, pz - 1.08, pz - 0.45);

  // Aschkästen aus Zinkblech an der Seitenflügelwand: Sickenringe, Fußrand, Tragegriffe.
  // Der rechte ist zu, beim linken lehnt der Deckel offen an der Mauer, darin Asche und Papier.
  for (const [i, ax] of [[0, x1 - 0.65], [1, x1 - 1.6]]) {
    const az = z1 - 0.6;
    zinc.box(0x7c807c, 0.85, 0.82, 0.65, ax, 0.43, az);
    zinc.box(0x6e726f, 0.88, 0.05, 0.68, ax, 0.025, az);
    for (const y of [0.24, 0.5, 0.74]) zinc.box(0x858985, 0.87, 0.025, 0.67, ax, y, az);
    for (const s of [-1, 1]) {
      zinc.add(new THREE.TorusGeometry(0.07, 0.01, 4, 8, Math.PI).rotateY(Math.PI / 2).translate(ax + s * 0.44, 0.66, az), 0x5a5e5b);
    }
    // Delle: dunklerer Fleck auf der Front.
    zinc.box(0x666a67, 0.2, 0.15, 0.005, ax - 0.18 + i * 0.3, 0.38, az - 0.326);
    const open = i === 1;
    const parts = [
      [box(0.9, 0.035, 0.7, 0, 0, -0.35), 0x777b77],
      [box(0.9, 0.02, 0.05, 0, 0.027, -0.35), 0x6e726f],
      [new THREE.TorusGeometry(0.06, 0.009, 4, 8, Math.PI).translate(0, 0.02, -0.5), 0x5a5e5b],
    ];
    for (const [g, c] of parts) {
      if (open) g.rotateX(1.78);
      zinc.add(g.translate(ax, 0.86, az + 0.33), c);
    }
    if (open) {
      stone.add(new THREE.SphereGeometry(0.36, 10, 6).scale(1.05, 0.22, 0.8).translate(ax, 0.8, az), 0x3e3c3a);
      stone.add(new THREE.SphereGeometry(0.1, 6, 4).scale(1.2, 0.5, 0.9).translate(ax + 0.14, 0.86, az - 0.06), 0x2a2826);
      stone.add(new THREE.PlaneGeometry(0.18, 0.13).rotateX(-1.3).rotateY(0.5).translate(ax - 0.15, 0.87, az + 0.05), 0xa8a290);
      stone.add(new THREE.PlaneGeometry(0.14, 0.2).rotateX(-1.1).rotateY(-0.8).translate(ax + 0.05, 0.86, az - 0.12), 0x8c8676);
      zinc.add(cyl(0.035, 0.035, 0.22, 0, 0, 0, 8).rotateZ(1.2).translate(ax - 0.05, 0.86, az - 0.02), 0x2e4a32);
    }
  }
  // Reisigbesen an der Mauer neben den Kästen.
  {
    const bx = x1 - 2.3;
    const bz = z1 - 0.18;
    stone.add(cyl(0.016, 0.016, 1.3, 0, 0.65, 0, 6).rotateX(-0.22).translate(bx, 0.27, bz), 0x6a5238);
    stone.add(cyl(0.035, 0.11, 0.42, 0, -0.21, 0, 8).rotateX(-0.22).translate(bx, 0.27, bz), 0x5a4a30);
  }
  loc.collide(x1 - 2.4, x1, z1 - 1, z1);

  // Leiterwagen vor der Brandmauer: Bretterboden, schräge Leitern, vier Speichenräder,
  // vorn der Drehschemel, die Deichsel liegt auf dem Pflaster.
  const hx = x1 - 2.4;
  const hz = z0 + 1;
  const wd = new THREE.Color(0x5e4a36);
  const w = (k) => wd.clone().multiplyScalar(k);
  const bedY = 0.52;
  for (let k = 0; k < 4; k++) stone.box(w(0.85 + (k % 2) * 0.2), 1.5, 0.035, 0.16, hx, bedY, hz - 0.255 + k * 0.17);
  for (const s of [-1, 1]) {
    stone.box(w(0.75), 1.6, 0.07, 0.07, hx, bedY - 0.055, hz + s * 0.2);
    stone.box(w(0.9), 1.55, 0.045, 0.045, hx, bedY + 0.03, hz + s * 0.33);
    stone.box(w(1.05), 1.6, 0.045, 0.045, hx, bedY + 0.36, hz + s * 0.44);
    for (let k = 0; k < 9; k++) {
      stone.add(cyl(0.013, 0.013, 0.34, 0, 0.17, 0, 6).rotateX(s * 0.32).translate(hx - 0.72 + k * 0.18, bedY + 0.03, hz + s * 0.33), w(0.95));
    }
  }
  // Hinterachse, Drehschemel und Vorderachse.
  stone.add(cyl(0.03, 0.03, 0.92, 0, 0, 0, 6).rotateX(Math.PI / 2).translate(hx + 0.45, 0.3, hz), 0x24221f);
  stone.box(w(0.7), 0.12, 0.14, 0.7, hx + 0.45, 0.38, hz);
  stone.add(cyl(0.03, 0.03, 0.92, 0, 0, 0, 6).rotateX(Math.PI / 2).translate(hx - 0.5, 0.25, hz), 0x24221f);
  stone.box(w(0.7), 0.14, 0.2, 0.7, hx - 0.5, 0.38, hz);
  for (const s of [-1, 1]) {
    wheel(stone, wd, hx + 0.45, 0.3, hz + s * 0.45, 0.3);
    wheel(stone, wd, hx - 0.5, 0.25, hz + s * 0.45, 0.25);
  }
  // Deichsel: aus dem Drehschemel schräg nach vorn aufs Pflaster, am Ende ein Quergriff.
  stone.add(box(1.2, 0.05, 0.05, 0, 0, 0).rotateZ(0.2).translate(hx - 1.1, 0.14, hz + 0.08), w(0.8));
  stone.add(cyl(0.02, 0.02, 0.4, 0, 0, 0, 6).rotateX(Math.PI / 2).translate(hx - 1.7, 0.03, hz + 0.08), w(0.8));
  // Darauf eine zusammengeworfene Plane.
  {
    const g = new THREE.SphereGeometry(1, 12, 8);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const k = 1 + 0.12 * Math.sin(x * 9 + z * 4) * Math.cos(z * 7 - y * 3);
      p.setXYZ(i, x * k, Math.max(y, -0.3) * k, z * k);
    }
    g.computeVertexNormals();
    stone.add(g.scale(0.45, 0.14, 0.3).translate(hx + 0.2, bedY + 0.08, hz - 0.05), 0x4c4a3a);
  }
  loc.collide(hx - 1.85, hx + 0.8, z0, hz + 0.6);

  // Teppichklopfstange vor dem Seitenflügel: Pfosten in Steinmanschetten, Kugelköpfe,
  // ein Teppichklopfer aus Rohr hängt am Haken.
  const kx = x0 + 2.4;
  const kz = z1 - 2.6;
  for (const s of [-1, 1]) {
    paint.add(cyl(0.035, 0.04, 1.85, kx + s * 1.1, 0.925, kz, 8), green);
    stone.add(cyl(0.09, 0.1, 0.08, kx + s * 1.1, 0.04, kz, 8), 0x5e5c56);
    paint.add(new THREE.SphereGeometry(0.05, 8, 6).translate(kx + s * 1.1, 1.87, kz), green);
  }
  paint.add(new THREE.CylinderGeometry(0.028, 0.028, 2.2, 6).rotateZ(Math.PI / 2).translate(kx, 1.8, kz), green);
  {
    const bx = kx + 0.55;
    stone.add(new THREE.TorusGeometry(0.035, 0.006, 4, 8).translate(bx, 1.77, kz), 0x24221f);
    stone.add(cyl(0.014, 0.016, 0.36, bx, 1.55, kz, 6), 0x9a8058);
    for (const [dx, r, dy] of [[-0.055, 0.075, 0], [0.055, 0.075, 0], [0, 0.095, -0.06]]) {
      stone.add(new THREE.TorusGeometry(r, 0.008, 4, 14).scale(1, 1.25, 1).translate(bx + dx, 1.3 + dy, kz), 0xa68a60);
    }
  }
  for (const s of [-1, 1]) loc.collide(kx + s * 1.1 - 0.1, kx + s * 1.1 + 0.1, kz - 0.1, kz + 0.1);

  addMesh(scene, paint.build(), std({ vertexColors: true, roughness: 0.45, metalness: 0.25 }));
  addMesh(scene, stone.build(), std({ vertexColors: true, roughness: 0.85 }));
  addMesh(scene, zinc.build(), std({ vertexColors: true, roughness: 0.42, metalness: 0.45 }));
  return { px, pz };
}
