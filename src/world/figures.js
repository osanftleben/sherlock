import * as THREE from 'three';
import { Bag, box, cyl, merge, tint } from './kit.js';

const SKIN = 0xc9a07f;
const shared = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 });

function ball(r, x, y, z, sx = 1, sy = 1, sz = 1) {
  const g = new THREE.SphereGeometry(r, 12, 9);
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  return g;
}

// Holzschnitt-Figuren in Zeitkostüm: Rumpf und Glieder, ohne Skelett.
// look: { coat, trousers, hat, skirt, hair, beard, moustache, skin, cane, apron, hatColor, height }
export function makeFigure(look = {}) {
  const {
    coat = 0x24262b,
    trousers = 0x1a1a1e,
    skin = SKIN,
    hat = 'none',
    hatColor = 0x121214,
    hair = 0x2a1f18,
    skirt = false,
    beard = false,
    moustache = false,
    apron = null,
    cane = false,
    height = 1.76,
  } = look;

  const root = new THREE.Group();
  const scale = height / 1.76;
  const body = new THREE.Group();
  body.scale.setScalar(scale);
  root.add(body);

  const torso = new Bag();
  if (skirt) {
    torso.add(cyl(0.2, 0.42, 0.92, 0, 0.47, 0, 16), coat);
    torso.add(cyl(0.16, 0.21, 0.6, 0, 1.2, 0, 14), coat);
  } else {
    torso.add(cyl(0.2, 0.25, 0.7, 0, 1.15, 0, 14), coat);
    torso.add(cyl(0.25, 0.3, 0.34, 0, 0.72, 0, 14), coat);
  }
  torso.add(cyl(0.05, 0.06, 0.1, 0, 1.53, 0, 8), skin);
  torso.add(cyl(0.2, 0.17, 0.05, 0, 1.49, 0, 12), coat);
  if (apron && skirt) {
    // Die Schürze folgt dem Rock als offenes Kegelstück auf der Vorderseite.
    const front = new THREE.CylinderGeometry(0.21, 0.43, 0.92, 12, 1, true, -0.85, 1.7);
    front.translate(0, 0.47, 0);
    torso.add(front, apron);
  } else if (apron) {
    torso.add(box(0.36, 0.86, 0.04, 0, 0.82, 0.22), apron);
  }
  if (!skirt) {
    torso.add(box(0.11, 0.28, 0.02, 0, 1.34, 0.2), 0xd8d4c8);
    torso.add(box(0.03, 0.2, 0.025, 0, 1.33, 0.205), 0x18181c);
  }

  // Kopf mit Gesicht: nach vorn zeigt +Z.
  const headBag = new Bag();
  headBag.add(ball(0.115, 0, 0, 0, 0.92, 1.1, 0.98), skin);
  headBag.add(ball(0.02, 0, -0.01, 0.112, 0.8, 1.1, 1.1), skin);
  headBag.add(ball(0.012, -0.04, 0.02, 0.098), 0x181010);
  headBag.add(ball(0.012, 0.04, 0.02, 0.098), 0x181010);
  headBag.add(ball(0.118, 0, 0.035, -0.02, 0.96, 0.98, 0.95), hair);
  if (skirt) headBag.add(ball(0.06, 0, 0.09, -0.1), hair);
  if (beard) headBag.add(ball(0.08, 0, -0.1, 0.05, 0.9, 1.05, 0.7), hair);
  if (moustache) {
    headBag.add(ball(0.03, -0.035, -0.055, 0.1, 1.5, 0.45, 0.6), hair);
    headBag.add(ball(0.03, 0.035, -0.055, 0.1, 1.5, 0.45, 0.6), hair);
  }
  if (hat === 'top') {
    headBag.add(cyl(0.2, 0.2, 0.015, 0, 0.1, 0, 16), hatColor);
    headBag.add(cyl(0.12, 0.11, 0.2, 0, 0.2, 0, 16), hatColor);
  } else if (hat === 'bowler') {
    headBag.add(cyl(0.18, 0.18, 0.012, 0, 0.09, 0, 16), hatColor);
    headBag.add(ball(0.112, 0, 0.1, 0), hatColor);
  } else if (hat === 'cap') {
    headBag.add(cyl(0.13, 0.12, 0.06, 0, 0.1, 0, 14), hatColor);
    headBag.add(box(0.15, 0.015, 0.09, 0, 0.075, 0.13), 0x101012);
  } else if (hat === 'pickelhaube') {
    headBag.add(ball(0.125, 0, 0.055, 0, 1, 0.95, 1.05), 0x0d0d10);
    headBag.add(cyl(0.012, 0.03, 0.1, 0, 0.21, 0, 8), 0xb59a55);
    headBag.add(box(0.1, 0.09, 0.02, 0, 0.09, 0.122), 0xb59a55);
    headBag.add(box(0.16, 0.012, 0.09, 0, 0.018, 0.12), 0x0d0d10);
  } else if (hat === 'bonnet') {
    headBag.add(ball(0.13, 0, 0.05, -0.01, 1, 0.9, 1.05), hatColor);
    headBag.add(cyl(0.15, 0.17, 0.02, 0, 0.05, 0.03, 16), hatColor);
  } else if (hat === 'bandage') {
    headBag.add(cyl(0.122, 0.122, 0.05, 0, 0.05, 0, 16), hatColor);
  }
  const head = new THREE.Mesh(headBag.build(), shared);
  head.position.y = 1.67;

  const torsoMesh = new THREE.Mesh(torso.build(), shared);
  body.add(torsoMesh, head);

  const limb = (color, len, r, handColor) => {
    const g = new THREE.Group();
    const parts = [tint(cyl(r, r * 0.8, len, 0, -len / 2, 0, 8), color)];
    if (handColor) parts.push(tint(ball(r * 0.95, 0, -len - 0.02, 0), handColor));
    g.add(new THREE.Mesh(merge(parts), shared));
    return g;
  };

  const armL = limb(coat, 0.56, 0.055, skin);
  const armR = limb(coat, 0.56, 0.055, skin);
  armL.position.set(-0.225, 1.44, 0);
  armR.position.set(0.225, 1.44, 0);
  armL.rotation.z = -0.08;
  armR.rotation.z = 0.08;
  body.add(armL, armR);

  let legL = null;
  let legR = null;
  if (!skirt) {
    legL = limb(trousers, 0.72, 0.075);
    legR = limb(trousers, 0.72, 0.075);
    const footL = new THREE.Mesh(tint(box(0.1, 0.06, 0.24, 0, -0.73, 0.05), 0x0c0c0c), shared);
    const footR = footL.clone();
    legL.add(footL);
    legR.add(footR);
    legL.position.set(-0.11, 0.74, 0);
    legR.position.set(0.11, 0.74, 0);
    body.add(legL, legR);
  }

  if (cane) {
    const stick = new THREE.Mesh(
      merge([tint(cyl(0.012, 0.012, 0.9, 0.34, 0.46, 0.1, 6), 0x2a1a10), tint(ball(0.03, 0.34, 0.92, 0.1), 0xb59a55)]),
      shared,
    );
    body.add(stick);
  }

  root.userData.figure = { head, armL, armR, legL, legR, body };
  return root;
}

// Atmen und zum Spieler hinsehen. Die Kopfdrehung bleibt unter 60 Grad, sonst wirkt sie unheimlich.
export function idleFigure(figure, time, lookAt) {
  const f = figure.userData.figure;
  const phase = figure.id * 0.73;
  f.body.position.y = Math.sin(time * 1.4 + phase) * 0.004;
  f.armL.rotation.x = Math.sin(time * 0.9 + phase) * 0.03;
  f.armR.rotation.x = Math.sin(time * 1.1 + phase) * 0.03;
  let target = 0;
  if (lookAt) {
    const dx = lookAt.x - figure.position.x;
    const dz = lookAt.z - figure.position.z;
    if (dx * dx + dz * dz < 30) {
      target = Math.atan2(dx, dz) - figure.rotation.y;
      while (target > Math.PI) target -= Math.PI * 2;
      while (target < -Math.PI) target += Math.PI * 2;
      target = THREE.MathUtils.clamp(target, -1, 1);
    }
  }
  f.head.rotation.y += (target - f.head.rotation.y) * 0.06;
}

export function walkFigure(figure, phase) {
  const f = figure.userData.figure;
  const swing = Math.sin(phase) * 0.5;
  if (f.legL) {
    f.legL.rotation.x = swing;
    f.legR.rotation.x = -swing;
  }
  f.armL.rotation.x = -swing * 0.7;
  f.armR.rotation.x = swing * 0.7;
  f.body.position.y = Math.abs(Math.cos(phase)) * 0.025;
}

// Pferd aus wenigen Formen. Es läuft in +Z.
export function makeHorse(color = 0x2e2018) {
  const root = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.72 });
  const bodyGeo = new THREE.CapsuleGeometry(0.34, 1.05, 6, 12);
  bodyGeo.rotateX(Math.PI / 2);
  bodyGeo.translate(0, 1.18, 0);
  const neck = cyl(0.13, 0.22, 0.8, 0, 1.58, 0.72, 10);
  neck.rotateX(0.55);
  neck.translate(0, 0.63, 0.56);
  const headGeo = box(0.17, 0.2, 0.5, 0, 1.94, 1.14);
  const ear1 = box(0.04, 0.12, 0.04, -0.06, 2.1, 0.96);
  const ear2 = box(0.04, 0.12, 0.04, 0.06, 2.1, 0.96);
  const mane = box(0.04, 0.5, 0.55, 0, 1.76, 0.75);
  const tail = cyl(0.03, 0.09, 0.8, 0, 0.98, -0.92, 8);
  root.add(new THREE.Mesh(merge([bodyGeo, neck, headGeo, ear1, ear2, mane, tail]), mat));
  const legs = [];
  for (const [x, z] of [[-0.2, 0.62], [0.2, 0.62], [-0.2, -0.62], [0.2, -0.62]]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.0, z);
    pivot.add(new THREE.Mesh(cyl(0.065, 0.045, 1.0, 0, -0.5, 0, 8), mat));
    root.add(pivot);
    legs.push(pivot);
  }
  root.userData.legs = legs;
  return root;
}

export function trotHorse(horse, phase) {
  horse.userData.legs.forEach((leg, i) => {
    leg.rotation.x = Math.sin(phase + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.45;
  });
}
