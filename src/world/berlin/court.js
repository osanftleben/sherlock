import * as THREE from 'three';
import { Bag, addMesh, box, cyl, std } from '../kit.js';
import { softDisc } from '../textures.js';
import { BAY_W } from './facades.js';

// Hinterhof hinter der Tordurchfahrt neben Kesslers Werkstatt (Rosenthaler Straße, Ostseite).
// Der Hof reicht von der Rückseite der Straßenhäuser (x = 23) bis zum Quergebäude und von
// der Brandmauer der Häuser an der Sophienstraße (z = -81) bis zum Seitenflügel.
// Muss vor facades.finish() gebaut werden, weil die Hofwände Fensterachsen der Häuserzeilen sind.
export const COURT = { x0: 23.34, x1: 23.34 + 3 * BAY_W, z0: -81, z1: -81.4 + 3 * BAY_W };

export function buildCourt(loc, facades, { brickMat, ironMat }) {
  const { scene } = loc;
  const { x0, x1, z0, z1 } = COURT;

  // Rückseiten der Straßenhäuser; die unterste Achse ganz im Norden ist die Hofseite des Tors.
  facades.courtWall({ x: x0, z: z1, face: 'east', bays: 3, ground: ['ground', 'ground', null], color: 0x8a8070, lit: 0.12 });
  // Quergebäude mit Hauseingang, Seitenflügel.
  const quer = facades.courtWall({ x: x1, z: -81.4, face: 'west', bays: 3, ground: ['ground', 'door', 'ground'], color: 0x847a6a, lit: 0.3 });
  facades.courtWall({ x: x1, z: z1, face: 'north', bays: 3, color: 0x8e8472, lit: 0.25 });

  // Brandmauer: nackter Ziegel, so hoch wie die Hofwände.
  const H = quer.H + 0.3;
  addMesh(scene, box(x1 - x0, H, 0.06, (x0 + x1) / 2, H / 2, z0 + 0.03), brickMat);
  loc.collide(x0 - 0.34, x1 + 0.34, -81.4, z0 + 0.06);

  const b = new Bag();
  const iron = 0x1c2620;
  // Schwengelpumpe auf einer Steinplatte mit Trog.
  const px = x0 + 6.2;
  const pz = -76.8;
  b.box(0x67655f, 1.1, 0.12, 1.1, px, 0.06, pz);
  b.box(0x5e5c56, 0.5, 0.28, 0.75, px - 0.55, 0.2, pz);
  b.box(0x2a3036, 0.4, 0.04, 0.65, px - 0.55, 0.32, pz);
  b.add(cyl(0.11, 0.14, 1.35, px, 0.8, pz, 10), iron);
  b.add(cyl(0.15, 0.12, 0.12, px, 1.52, pz, 10), iron);
  b.add(cyl(0.05, 0.05, 0.34, px, 1.68, pz, 8), iron);
  b.add(new THREE.CylinderGeometry(0.035, 0.035, 0.38, 6).rotateZ(Math.PI / 2).translate(px - 0.26, 1.05, pz), iron);
  b.add(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 6).rotateZ(-1.05).translate(px + 0.5, 1.95, pz), iron);
  loc.collide(px - 0.85, px + 0.3, pz - 0.4, pz + 0.4);

  // Teppichklopfstange vor dem Seitenflügel.
  const tx = x0 + 2.4;
  const tz = z1 - 2.6;
  for (const s of [-1, 1]) b.add(cyl(0.035, 0.04, 1.85, tx + s * 1.1, 0.925, tz, 6), iron);
  b.add(new THREE.CylinderGeometry(0.03, 0.03, 2.3, 6).rotateZ(Math.PI / 2).translate(tx, 1.8, tz), iron);
  for (const s of [-1, 1]) loc.collide(tx + s * 1.1 - 0.05, tx + s * 1.1 + 0.05, tz - 0.05, tz + 0.05);

  // Aschkästen aus Zinkblech an der Ecke beim Quergebäude.
  for (const [ax, az] of [[x1 - 0.65, z1 - 0.6], [x1 - 1.6, z1 - 0.6]]) {
    b.box(0x4a4c4c, 0.85, 0.85, 0.65, ax, 0.425, az);
    b.box(0x3c3e3e, 0.9, 0.05, 0.7, ax, 0.88, az);
  }
  loc.collide(x1 - 2.1, x1, z1 - 1, z1);

  // Handwagen vor der Brandmauer, die Deichsel auf dem Pflaster.
  const hx = x1 - 2.4;
  const hz = z0 + 1;
  b.box(0x4a3826, 1.5, 0.08, 0.9, hx, 0.62, hz);
  for (const s of [-1, 1]) b.box(0x3f3020, 1.5, 0.3, 0.05, hx, 0.81, hz + s * 0.43);
  for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 14).rotateX(Math.PI / 2).translate(hx + 0.15, 0.4, hz + s * 0.5), 0x2e2418);
  b.add(new THREE.BoxGeometry(1.4, 0.05, 0.05).rotateZ(0.4).translate(hx - 1.38, 0.33, hz), 0x3f3020);
  loc.collide(hx - 2, hx + 0.8, z0, hz + 0.6);

  addMesh(scene, b.build(), std({ vertexColors: true, roughness: 0.8, metalness: 0.15 }));

  // Laterne neben dem Eingang zum Quergebäude: ein warmer Fleck im Hof, ohne eigenes Licht.
  const at = (lx, y, lz) => new THREE.Vector3(lx, y, lz).applyMatrix4(quer.base);
  const door = at(1.5 * BAY_W + 1.2, 2.75, 0.34);
  const arm = at(1.5 * BAY_W + 1.2, 2.95, 0.17);
  addMesh(scene, box(0.14, 0.22, 0.14, door.x, door.y, door.z), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.6, 0.7) }));
  addMesh(scene, box(0.34, 0.04, 0.04, arm.x, arm.y, arm.z), ironMat);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('glow'), color: 0xffa050, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.position.copy(door);
  glow.scale.setScalar(1.6);
  scene.add(glow);

  loc.addHotspot({
    pos: [px, 1.2, pz],
    radius: 0.5,
    range: 3,
    label: 'Schwengelpumpe',
    action: { say: 'Hobrechts Leitungen reichen bis in die Küchen der Vorderhäuser. Im Hof pumpt man trotzdem noch, für die Wäsche, für die Pferde und für alle, die hinten wohnen und kein Geld für den Wasserzins haben.' },
  });
}
