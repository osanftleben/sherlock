import * as THREE from 'three';
import { makeFigure, walkFigure } from './figures.js';

// Ebene, die nur Schattenkameras sehen (Room.shadows schaltet sie dort zu). Die Hauptkamera
// bleibt auf Ebene 0, Holmes' Körper kostet im Bild also nichts und verdeckt nie die Sicht.
export const SHADOW_ONLY = 1;

// Nach so vielen Sekunden Stillstand steckt Holmes sich die Pfeife an; beim ersten Schritt
// verschwindet sie wieder. Bei Doyle raucht er zum Nachdenken, nicht im Gehen.
const PIPE_AFTER = 6;

// Holmes als Schattenwerfer: hochgewachsen und hager, Inverness-Mantel mit Pelerine, im Haus
// den Zylinder in der linken Hand. Er steht dort, wo die Kamera ist, und schreitet mit, wenn der
// Spieler geht.
export class ShadowSelf {
  constructor() {
    this.figure = makeFigure({ outfit: 'overcoat', cape: true, coat: 0x2c2a26, height: 1.86, build: 'slim', hat: 'none', hair: 0x1c1712, pipe: true });
    this.f = this.figure.userData.figure;
    this.f.foreL.add(heldHat());
    this.pipe = this.f.pipe;
    this.pipeGroup = this.pipe.ember.parent;
    this.pipeGroup.visible = false;
    this.figure.traverse((o) => o.layers.set(SHADOW_ONLY));
    this.still = 0;
    this.last = { x: NaN, z: NaN, yaw: NaN, phase: NaN, pipe: false };
    this.scene = null;
  }

  // Nur in Orten mit Schattenlicht; auf der Straße gäbe es nichts, worauf er fiele.
  attach(scene) {
    if (this.scene) this.scene.remove(this.figure);
    this.scene = scene.userData.shadows ? scene : null;
    if (this.scene) this.scene.add(this.figure);
    this.still = 0;
  }

  // Gibt true zurück, wenn sich der Schatten verändert hat und die Karte neu muss.
  update(player, moving, dt) {
    if (!this.scene) return false;
    const fig = this.figure;
    fig.position.set(player.pos.x, player.groundY, player.pos.z);
    // Figuren blicken entlang +z, die Kamera bei yaw 0 entlang -z.
    fig.rotation.y = player.yaw + Math.PI;
    const phase = moving ? player.bob * 0.5 : 0;
    if (moving) walkFigure(fig, phase);
    else this.stand();
    this.still = moving ? 0 : this.still + dt;
    const pipe = this.still > PIPE_AFTER;
    this.pipeGroup.visible = pipe;
    const l = this.last;
    const changed = l.x !== fig.position.x || l.z !== fig.position.z || l.yaw !== fig.rotation.y || l.phase !== phase || l.pipe !== pipe;
    Object.assign(l, { x: fig.position.x, z: fig.position.z, yaw: fig.rotation.y, phase, pipe });
    return changed;
  }

  stand() {
    const f = this.f;
    for (const leg of [f.legL, f.legR]) if (leg) leg.rotation.x = 0;
    for (const shin of [f.shinL, f.shinR]) if (shin) shin.rotation.x = 0.04;
    f.armL.rotation.x = 0;
    f.armR.rotation.x = 0;
    f.foreL.rotation.x = f.restL;
    f.foreR.rotation.x = f.restR;
    f.body.position.y = 0;
    f.body.rotation.y = 0;
  }
}

// Zylinder, an der Krempe gehalten, der Kopf zeigt seitlich vom Bein weg. Die Hand sitzt am
// Ende des linken Unterarms (y = -0,3), die Krempe hängt darunter.
function heldHat() {
  const mat = new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.5 });
  const hat = new THREE.Group();
  hat.add(new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.012, 20).scale(0.95, 1, 1.08), mat));
  hat.add(new THREE.Mesh(new THREE.CylinderGeometry(0.098, 0.092, 0.17, 18).translate(0, 0.09, 0), mat));
  hat.rotation.z = Math.PI / 2;
  hat.position.set(-0.01, -0.3 - 0.14, 0.02);
  return hat;
}
