import * as THREE from 'three';
import { Bag, addMesh, box, cyl, std } from '../kit.js';
import { softDisc } from '../textures.js';

// Ausstattung, die in mehreren Räumen vorkommt.

export function rug(room, x, z, w, d, base, border) {
  room.plainBag.box(base, w, 0.008, d, x, 0.004, z);
  const b = 0.1;
  room.plainBag.box(border, w, 0.009, b, x, 0.0045, z - d / 2 + b);
  room.plainBag.box(border, w, 0.009, b, x, 0.0045, z + d / 2 - b);
  room.plainBag.box(border, b, 0.009, d - 2 * b, x - w / 2 + b, 0.0045, z);
  room.plainBag.box(border, b, 0.009, d - 2 * b, x + w / 2 - b, 0.0045, z);
}

// Ohrensessel: gepolstert, gerollte Armlehnen, geknöpfte Lehne; eine Decke ist halb
// heruntergerutscht. Blickrichtung +Z vor der Drehung.
export function wingChair(room, x, z, facing, { cloth = 0x5c2420, dark = 0x3e1714, padColor = 0x6a2a24, plaid = true } = {}) {
  const legWood = 0x2a1608;
  const bag = new Bag();
  for (const sx of [-0.33, 0.33]) for (const sz of [-0.3, 0.3]) bag.add(cyl(0.028, 0.02, 0.12, sx, 0.06, sz, 8), legWood);
  bag.box(cloth, 0.8, 0.26, 0.76, 0, 0.25, 0);
  bag.box(padColor, 0.6, 0.12, 0.62, 0, 0.43, 0.05);
  const roll = cyl(0.06, 0.06, 0.6, 0, 0, 0, 12);
  roll.rotateZ(Math.PI / 2);
  roll.translate(0, 0.43, 0.36);
  bag.add(roll, padColor);
  const back = box(0.78, 0.82, 0.16, 0, 0, 0);
  back.rotateX(-0.12);
  back.translate(0, 0.86, -0.31);
  bag.add(back, cloth);
  const pad = box(0.58, 0.56, 0.07, 0, 0, 0);
  pad.rotateX(-0.12);
  pad.translate(0, 0.83, -0.21);
  bag.add(pad, padColor);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const y = 0.66 + i * 0.17;
      const btn = new THREE.SphereGeometry(0.013, 6, 4);
      btn.translate(-0.18 + j * 0.18, y, -0.17 - (y - 0.83) * 0.12 + 0.004);
      bag.add(btn, dark);
    }
  }
  for (const s of [-1, 1]) {
    bag.box(cloth, 0.12, 0.26, 0.66, s * 0.37, 0.5, 0.03);
    const arm = cyl(0.08, 0.08, 0.68, 0, 0, 0, 12);
    arm.rotateX(Math.PI / 2);
    arm.translate(s * 0.37, 0.64, 0.04);
    bag.add(arm, cloth);
    const wing = box(0.1, 0.52, 0.36, 0, 0, 0);
    wing.rotateY(s * -0.18);
    wing.translate(s * 0.35, 1.05, -0.16);
    bag.add(wing, cloth);
  }
  // Wolldecke: ein Zipfel auf der Sitzfläche, der Rest am Boden.
  if (plaid) {
    const wool = 0x3e4a32;
    const top = box(0.5, 0.014, 0.4, 0, 0, 0);
    top.rotateX(0.18);
    top.translate(0.06, 0.5, 0.12);
    bag.add(top, wool);
    const fall = box(0.52, 0.42, 0.014, 0, 0, 0);
    fall.rotateX(-0.25);
    fall.translate(0.08, 0.27, 0.44);
    bag.add(fall, wool);
    const floorPart = box(0.62, 0.014, 0.42, 0, 0, 0);
    floorPart.rotateY(0.3);
    floorPart.translate(0.16, 0.018, 0.72);
    bag.add(floorPart, wool);
    for (const dz of [-0.12, 0, 0.12]) bag.box(0x6a3a24, 0.62, 0.016, 0.02, 0.16, 0.026, 0.72 + dz);
  }

  const mesh = new THREE.Mesh(bag.build(), std({ vertexColors: true, roughness: 0.88 }));
  mesh.position.set(x, 0, z);
  mesh.rotation.y = facing;
  room.scene.add(mesh);
  room.solid(x, z, 0.85, 0.85);
}

// Fahles Licht der Straßenlaterne, durch das Fenster
export function streetGlow(room, [x, y, z], [tx, ty, tz]) {
  const spot = new THREE.SpotLight(0x8ea4cc, 9, 9, 0.5, 0.8, 1.5);
  spot.position.set(x, y, z);
  spot.target.position.set(tx, ty, tz);
  room.scene.add(spot, spot.target);
}

// Holzverkleidung bis Brusthöhe mit Leisten.
export function wainscot(room, side, from, to, H = 1.0) {
  const W = room.w / 2;
  const D = room.d / 2;
  const put = (along, inset, y, l, h, t, color) => {
    if (side === 'south') room.woodBag.box(color, l, h, t, along, y, D - inset);
    if (side === 'north') room.woodBag.box(color, l, h, t, along, y, -D + inset);
    if (side === 'west') room.woodBag.box(color, t, h, l, -W + inset, y, along);
    if (side === 'east') room.woodBag.box(color, t, h, l, W - inset, y, along);
  };
  put((from + to) / 2, 0.03, H / 2, to - from, H, 0.04, 0x3a2414);
  put((from + to) / 2, 0.045, H, to - from, 0.05, 0.07, 0x2a180c);
  for (let a = from + 0.05; a <= to - 0.04; a += 0.75) put(a, 0.055, H / 2, 0.06, H - 0.05, 0.02, 0x2a180c);
}

// Dreiarmige Gaskrone mit Tulpenschirmen.
export function gasolier(room, x, z) {
  const brass = 0xb08a3a;
  const h = room.h;
  room.metalBag.add(cyl(0.012, 0.012, 0.6, x, h - 0.3, z, 6), brass);
  room.metalBag.add(cyl(0.08, 0.04, 0.05, x, h - 0.025, z, 12), brass);
  room.metalBag.add(new THREE.SphereGeometry(0.07, 12, 8).scale(1, 1.2, 1).translate(x, h - 0.64, z), brass);
  const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.6, 0.8) });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.3;
    const ax = x + Math.sin(a) * 0.34;
    const az = z + Math.cos(a) * 0.34;
    const arm = cyl(0.01, 0.01, 0.34, 0, 0.17, 0, 6);
    arm.rotateX(Math.PI / 2);
    arm.rotateY(a);
    arm.translate(x, h - 0.66, z);
    room.metalBag.add(arm, brass);
    room.metalBag.add(cyl(0.012, 0.02, 0.08, ax, h - 0.62, az, 8), brass);
    room.glassBag.add(new THREE.CylinderGeometry(0.065, 0.03, 0.11, 14, 1, true).translate(ax, h - 0.52, az), 0xfff0d8);
    addMesh(room.scene, new THREE.SphereGeometry(0.022, 8, 6).scale(1, 1.4, 1), glowMat, ax, h - 0.55, az);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('glow'), color: 0xffb060, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.set(ax, h - 0.54, az);
    s.scale.setScalar(0.5);
    room.scene.add(s);
  }
  room.lamp(x, h - 0.55, z, { intensity: 6.5, visible: false, hang: false });
}
