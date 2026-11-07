import * as THREE from 'three';
import { watchDial } from './textures.js';

// Requisiten, die ein Fall je nach Spielstand in einen Ort legt (Liste `props` in cases/*.js).
// Jede Fabrik liefert ein Object3D, dessen Ursprung auf der Auflagefläche liegt. Bewegtes setzt
// userData.update(dt, t); main.js ruft es auf, solange das Requisit zu sehen ist.
export const PROPS = { savonnette };

export function makeProp(kind) {
  const make = PROPS[kind];
  if (!make) throw new Error(`Requisit ${kind} gibt es nicht`);
  return make();
}

// Wendts goldene Repetieruhr, eine Savonnette von 52 mm, flach hingelegt und aufgeklappt.
// Lokal: Zifferblatt nach oben, XII nach -z, Krone bei der III (+x), Scharnier des Sprungdeckels
// bei der IX (-x). Der Repetierschieber sitzt links am Gehäuserand, die kleine Sekunde läuft.
function savonnette() {
  const R = 0.026;
  const DIAL_Y = 0.0097;
  const group = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9ac55, metalness: 1, roughness: 0.26 });
  const add = (geo, mat = gold) => {
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);
    return mesh;
  };

  // Gehäuse: gewölbter Boden, gerades Band, oben ein schmaler Rand um das Zifferblatt.
  const body = [
    [0, 0],
    [0.014, 0.0006],
    [0.021, 0.0016],
    [0.0248, 0.0032],
    [R, 0.0055],
    [R, 0.0098],
    [0.0252, 0.0108],
    [0.0238, 0.0108],
    [0.0236, DIAL_Y],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  add(new THREE.LatheGeometry(body, 40));
  const dial = new THREE.CircleGeometry(0.0237, 40);
  dial.rotateX(-Math.PI / 2);
  dial.translate(0, DIAL_Y, 0);
  // Email gedämpft: Unter Wendts Pultlampe überstrahlte das reine Weiß die Ziffern.
  add(dial, new THREE.MeshStandardMaterial({ map: watchDial(), color: 0x9c968a, roughness: 0.4 }));

  // Sprungdeckel, um gut hundert Grad aufgeklappt, außen leicht gewölbt. Wie beim Gehäuse läuft
  // das Profil von der Mitte unten nach außen, sonst zeigen die Normalen der Drehfläche nach innen.
  const lidProfile = [
    [0, -0.0004],
    [0.0254, -0.0006],
    [R, 0],
    [0.0255, 0.0005],
    [0.02, 0.0018],
    [0.012, 0.0028],
    [0, 0.0032],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const lid = new THREE.Mesh(new THREE.LatheGeometry(lidProfile, 40), gold);
  lid.position.x = R;
  const hinge = new THREE.Group();
  hinge.position.set(-R, 0.0108, 0);
  hinge.rotation.z = THREE.MathUtils.degToRad(104);
  hinge.add(lid);
  group.add(hinge);
  add(new THREE.CylinderGeometry(0.0016, 0.0016, 0.009, 10).rotateX(Math.PI / 2).translate(-R - 0.0004, 0.0106, 0));

  // Pendant, Krone und der flach umgelegte Bügel bei der III.
  add(new THREE.CylinderGeometry(0.0032, 0.0037, 0.0065, 12).rotateZ(Math.PI / 2).translate(R + 0.003, 0.0062, 0));
  add(new THREE.CylinderGeometry(0.0048, 0.0048, 0.0042, 18).rotateZ(Math.PI / 2).translate(R + 0.0083, 0.0062, 0));
  const bow = new THREE.TorusGeometry(0.0085, 0.0011, 6, 28);
  bow.rotateX(Math.PI / 2);
  bow.scale(1, 1, 0.82);
  bow.rotateZ(-0.22);
  bow.translate(R + 0.0115, 0.0042, 0);
  add(bow);

  // Repetierschieber: eine Leiste am Rand zwischen der VII und der VIII, mit Knopf.
  const a = THREE.MathUtils.degToRad(228);
  const slide = new THREE.BoxGeometry(0.011, 0.0017, 0.0016);
  slide.rotateY(-a);
  slide.translate(Math.sin(a) * (R + 0.0007), 0.0077, -Math.cos(a) * (R + 0.0007));
  add(slide);
  add(new THREE.SphereGeometry(0.0012, 8, 6).translate(Math.sin(a + 0.22) * (R + 0.0012), 0.0077, -Math.cos(a + 0.22) * (R + 0.0012)));

  // Kleine Sekunde: Der Zeiger springt fünfmal in der Sekunde (18 000 Halbschwingungen je Stunde).
  const seconds = new THREE.Group();
  seconds.position.set(0, DIAL_Y + 0.0003, 0.5 * 0.0237);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.0006, 0.0002, 0.0058).translate(0, 0, -0.0019), new THREE.MeshStandardMaterial({ color: 0x1c2848, roughness: 0.3, metalness: 0.4 }));
  seconds.add(hand);
  group.add(seconds);
  group.userData.update = (dt, t) => {
    const s = Math.floor(t * 5) / 5;
    seconds.rotation.y = -(s / 60) * Math.PI * 2;
  };
  return group;
}
