import * as THREE from 'three';
import { Bag, addMesh, box, cyl, merge, std } from '../kit.js';
import { eagleSign, jarLabels, rng, signTexture, tileFloor, wallpaper } from '../textures.js';
import { Room } from './room.js';
import { gasolier, streetGlow, wainscot } from './fittings.js';

export function buildApotheke() {
  const room = new Room({
    id: 'apotheke',
    name: 'Apotheke zum Schwarzen Adler',
    w: 7,
    d: 5.6,
    h: 4.0,
    wall: wallpaper('#34463a', 'rgba(200,220,180,0.1)', 73),
    floor: tileFloor(),
    ceiling: 0x6a6656,
    ambient: 0.6,
  });
  const { loc, scene } = room;
  const r = rng(233);
  // Glasierte Gefäße glänzen, ihre Etiketten kommen aus einem Atlas.
  const glaze = new Bag();
  const labels = [];

  // Vertäfelung im Kundenraum, Stuckleiste rundum
  wainscot(room, 'west', -0.2, 2.8, 1.0);
  wainscot(room, 'east', -0.2, 2.8, 1.0);
  wainscot(room, 'south', -3.5, -0.7, 1.0);
  wainscot(room, 'south', 0.7, 3.5, 1.0);
  for (const s of [-1, 1]) {
    room.plainBag.box(0xa8a290, 7, 0.14, 0.12, 0, 3.93, s * 2.74);
    room.plainBag.box(0xa8a290, 0.12, 0.14, 5.6, s * 3.44, 3.93, 0);
  }

  // Repositorium: Schubladen unten, Standgefäße oben, Adlerschild als Krone
  repositorium(room, glaze, labels, r);
  loc.anchor('jars', 0, 2.0, -2.6);

  // Handverkaufstisch quer durch den Raum, mit Klappe zum Giftschrank hin
  salesCounter(room, glaze, r);
  loc.anchor('rezeptbuch', 0.55, 1.03, -0.56);
  loc.anchor('waage', -1.6, 1.2, -0.62);

  // Hinter dem Tisch: Giftschrank in der Nordostecke, Kräuterschrank an der Westwand
  poisonCabinet(room, glaze, labels, 3.12);
  loc.anchor('giftschrank', 3.12, 1.5, -2.45);
  // Garderobe mit Seidels Gehrock und Zylinder für den Heimweg nach dem Nachtdienst
  room.woodBag.add(cyl(0.02, 0.025, 1.85, 3.15, 0.925, -1.45, 8), 0x2a180c);
  room.woodBag.add(cyl(0.18, 0.2, 0.03, 3.15, 0.015, -1.45, 12), 0x2a180c);
  room.plainBag.add(cyl(0.11, 0.21, 0.95, 3.17, 1.25, -1.45, 10), 0x1a1a1e);
  room.plainBag.add(cyl(0.085, 0.08, 0.16, 3.15, 1.96, -1.45, 14), 0x101012);
  room.plainBag.add(cyl(0.15, 0.15, 0.01, 3.15, 1.885, -1.45, 16), 0x101012);
  room.solid(3.15, -1.45, 0.42, 0.42);
  herbCabinet(room, -1.65, r);

  // Schaufenster mit den Schaugefäßen, rot und grün
  shopWindow(room, -2.2, 0xb01a10, new THREE.Color(1.0, 0.12, 0.06));
  shopWindow(room, 2.2, 0x1a8a2a, new THREE.Color(0.1, 0.9, 0.2));
  loc.anchor('globus_rot', -2.2, 1.38, 2.45);
  loc.anchor('globus_gruen', 2.2, 1.38, 2.45);

  // Kesslers Wanduhr über den Wartestühlen, Vitrine gegenüber, Ladenglocke
  room.regulator(-3.42, 2.25, 1.0, Math.PI / 2, 2);
  loc.anchor('wanduhr', -3.38, 2.35, 1.0);
  room.chair(-3.1, 0.55, Math.PI / 2, 0x3a2414);
  room.chair(-3.1, 1.45, Math.PI / 2, 0x3a2414);
  vitrine(room, glaze, 1.2, r);
  doorBell(room);

  // Helleres, saubereres Licht als im Bankhaus: Gaskrone, zwei Lampen über dem Tisch
  gasolier(room, 0, 1.2);
  room.lamp(-1.6, 2.8, -0.62, { intensity: 3.0, color: 0xffcf98, range: 8, glow: 0.45 });
  room.lamp(1.6, 2.8, -0.62, { intensity: 3.0, color: 0xffcf98, range: 8, glow: 0.45 });
  streetGlow(room, [-2.2, 2.6, 3.9], [-1.4, 0, 0.6]);
  streetGlow(room, [2.2, 2.6, 3.9], [1.4, 0, 0.6]);

  addMesh(scene, glaze.build(), std({ vertexColors: true, roughness: 0.22 }));
  addMesh(scene, merge(labels), new THREE.MeshStandardMaterial({ map: jarLabels(), roughness: 0.55 }));

  loc.anchor('seidel', -0.4, 0, -1.45, 0);
  return room.finish();
}

// --- Ausstattung der Apotheke -----------------------------------------------------

// Gebogenes Etikett aus dem Atlas, nach +z gewendet.
function labelGeo(radius, h, idx) {
  const g = new THREE.CylinderGeometry(radius, radius, h, 6, 1, true, -0.85, 1.7);
  const uv = g.attributes.uv;
  const col = idx % 4;
  const row = Math.floor(idx / 4);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (col + uv.getX(i)) / 4, (7 - row + uv.getY(i)) / 8);
  return g;
}

// Porzellanenes Standgefäß mit Deckel und Goldrändern.
function standJar(glaze, labels, x, y, z, rad, h, idx) {
  const white = 0xece8dc;
  glaze.add(cyl(rad, rad * 0.94, h, x, y + h / 2, z, 14), white);
  glaze.add(cyl(rad * 0.78, rad, h * 0.1, x, y + h * 1.05, z, 14), white);
  glaze.add(cyl(rad * 0.82, rad * 0.82, h * 0.1, x, y + h * 1.15, z, 14), white);
  glaze.add(new THREE.SphereGeometry(rad * 0.28, 10, 6).translate(x, y + h * 1.23, z), white);
  glaze.add(cyl(rad + 0.002, rad + 0.002, 0.008, x, y + h * 0.86, z, 14), 0xb8963a);
  glaze.add(cyl(rad * 0.94 + 0.002, rad * 0.94 + 0.002, 0.008, x, y + h * 0.12, z, 14), 0xb8963a);
  labels.push(labelGeo(rad * 0.97 + 0.003, h * 0.36, idx).translate(x, y + h * 0.49, z));
}

// Tinkturflasche mit Glasstopfen.
function tinctureBottle(glaze, labels, x, y, z, rad, h, idx, color) {
  glaze.add(cyl(rad, rad, h, x, y + h / 2, z, 12), color);
  glaze.add(cyl(rad * 0.35, rad, h * 0.25, x, y + h * 1.125, z, 12), color);
  glaze.add(cyl(rad * 0.4, rad * 0.4, h * 0.12, x, y + h * 1.31, z, 10), color);
  glaze.add(new THREE.SphereGeometry(rad * 0.5, 10, 6).scale(1, 0.8, 1).translate(x, y + h * 1.42, z), color);
  labels.push(labelGeo(rad + 0.002, h * 0.42, idx).translate(x, y + h * 0.48, z));
}

// Dünner Stab zwischen zwei Punkten (Ketten, Federn, Stößel).
function rod(bag, a, b, rad, color) {
  const v = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const g = new THREE.CylinderGeometry(rad, rad, v.length(), 5);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()));
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  bag.add(g, color);
}

function repositorium(room, glaze, labels, r) {
  const z0 = -room.d / 2;
  const W = 5.4;
  const dark = 0x2e1a0c;
  const mid = 0x4a2c16;
  const light = 0x5a3820;
  // Unterschrank: drei Reihen Schubladen mit Porzellanschildchen
  const lowD = 0.55;
  room.woodBag.box(dark, W, 0.95, lowD, 0, 0.475, z0 + lowD / 2);
  room.woodBag.box(light, W + 0.06, 0.04, lowD + 0.05, 0, 0.97, z0 + lowD / 2 + 0.01);
  room.solid(0, z0 + lowD / 2, W, lowD);
  const cols = 15;
  const dw = W / cols;
  for (let c = 0; c < cols; c++) {
    for (let row = 0; row < 3; row++) {
      const x = -W / 2 + dw * (c + 0.5);
      const y = 0.21 + row * 0.26;
      room.woodBag.box(mid, dw - 0.03, 0.23, 0.02, x, y, z0 + lowD + 0.005);
      room.plainBag.box(0xe8e2d2, 0.1, 0.045, 0.006, x, y + 0.05, z0 + lowD + 0.017);
      room.metalBag.add(new THREE.SphereGeometry(0.016, 8, 6).translate(x, y - 0.045, z0 + lowD + 0.025), 0xb59a55);
    }
  }
  // Oberschrank: Rückwand, Pilaster, Böden, Kranzgesims
  const upD = 0.34;
  const top = 3.25;
  room.woodBag.box(dark, W, top - 0.99, 0.04, 0, (top + 0.99) / 2, z0 + 0.02);
  const bays = 5;
  const bw = W / bays;
  for (let i = 0; i <= bays; i++) room.woodBag.box(light, 0.08, top - 0.99, upD, -W / 2 + i * bw, (top + 0.99) / 2, z0 + upD / 2);
  for (const y of [1.55, 2.1, 2.65]) room.woodBag.box(mid, W, 0.03, upD, 0, y, z0 + upD / 2);
  room.woodBag.box(dark, W + 0.2, 0.12, upD + 0.1, 0, top + 0.06, z0 + (upD + 0.1) / 2);
  room.woodBag.box(light, W + 0.26, 0.05, upD + 0.16, 0, top + 0.145, z0 + (upD + 0.16) / 2);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.36), new THREE.MeshStandardMaterial({ map: eagleSign(), roughness: 0.5, emissive: 0x2a2010 }));
  sign.position.set(0, 3.62, z0 + 0.36);
  room.scene.add(sign);
  room.woodBag.box(dark, 2.5, 0.42, 0.04, 0, 3.62, z0 + 0.335);
  for (const s of [-1, 1]) room.woodBag.box(light, 0.08, 0.5, 0.08, s * 1.27, 3.62, z0 + 0.34);

  // Gefäße: zwei Reihen Porzellan, eine Reihe Tinkturen, oben die großen Vorratsgefäße
  const jz = z0 + 0.19;
  const levels = [
    { y: 0.99, kind: 'jar', n: 5, rad: 0.072, h: 0.2 },
    { y: 1.565, kind: 'jar', n: 5, rad: 0.072, h: 0.2 },
    { y: 2.115, kind: 'bottle', n: 6, rad: 0.055, h: 0.17 },
    { y: 2.665, kind: 'jar', n: 4, rad: 0.09, h: 0.3 },
  ];
  const glass = [0x4a240a, 0x4a240a, 0x7a8a78, 0x1a2450];
  let k = 0;
  for (const lv of levels) {
    for (let b = 0; b < bays; b++) {
      const sp = (bw - 0.08) / lv.n;
      for (let i = 0; i < lv.n; i++) {
        k++;
        if (r() < 0.05) continue;
        const x = -W / 2 + b * bw + 0.04 + sp * (i + 0.5);
        const idx = k % 28;
        if (lv.kind === 'jar') standJar(glaze, labels, x, lv.y, jz, lv.rad, lv.h, idx);
        else tinctureBottle(glaze, labels, x, lv.y, jz, lv.rad, lv.h, idx, glass[Math.floor(r() * glass.length)]);
      }
    }
  }
}

function salesCounter(room, glaze, r) {
  const z = -0.6;
  const D = 0.66;
  const x0 = -room.w / 2;
  const x1 = 2.55;
  const len = x1 - x0;
  const cx = (x0 + x1) / 2;
  const T = 0.995;
  room.woodBag.box(0x3a2212, len, 0.95, D, cx, 0.475, z);
  room.woodBag.box(0x6a4628, len + 0.04, 0.045, D + 0.08, cx, 0.972, z + 0.02);
  room.woodBag.box(0x24140a, len, 0.08, 0.02, cx, 0.04, z + D / 2 + 0.01);
  // Füllungen zur Kundenseite
  const n = 8;
  for (let i = 0; i < n; i++) {
    const px = x0 + (len / n) * (i + 0.5);
    room.woodBag.box(0x4a2c16, len / n - 0.12, 0.62, 0.02, px, 0.5, z + D / 2 + 0.01);
    room.woodBag.box(0x5a3820, len / n - 0.26, 0.46, 0.02, px, 0.5, z + D / 2 + 0.025);
  }
  // Klappe zum Raum hinter dem Tisch
  room.woodBag.box(0x3a2212, room.w / 2 - x1, 0.92, 0.05, (x1 + room.w / 2) / 2, 0.46, z);
  room.woodBag.box(0x6a4628, room.w / 2 - x1, 0.04, 0.12, (x1 + room.w / 2) / 2, 0.94, z);
  room.metalBag.box(0xb59a55, 0.02, 0.1, 0.06, x1 + 0.03, 0.75, z);
  room.metalBag.box(0xb59a55, 0.02, 0.1, 0.06, x1 + 0.03, 0.25, z);
  room.solid(0, z, room.w, D);

  // Tarierwaage: Säule, Balken, Schalen an je drei Ketten
  const wx = -1.6;
  const wz = -0.62;
  const brass = 0xb59a55;
  room.woodBag.box(0x2a180c, 0.34, 0.04, 0.16, wx, T + 0.02, wz);
  room.metalBag.add(cyl(0.012, 0.016, 0.42, wx, T + 0.25, wz, 8), brass);
  room.metalBag.box(brass, 0.46, 0.012, 0.012, wx, T + 0.45, wz);
  room.metalBag.box(brass, 0.006, 0.14, 0.006, wx, T + 0.38, wz + 0.01);
  for (const s of [-1, 1]) {
    const px = wx + s * 0.22;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      rod(room.metalBag, [px, T + 0.44, wz], [px + Math.cos(a) * 0.065, T + 0.13, wz + Math.sin(a) * 0.065], 0.0018, brass);
    }
    room.metalBag.add(cyl(0.075, 0.05, 0.016, px, T + 0.12, wz, 16), brass);
  }
  // Gewichtssatz im Holzblock
  room.woodBag.box(0x5a3418, 0.24, 0.05, 0.14, -2.2, T + 0.025, -0.6);
  [0.022, 0.018, 0.015, 0.012, 0.01, 0.008].forEach((rad, i) => {
    const gx = -2.29 + (i % 3) * 0.09;
    const gz = -0.63 + Math.floor(i / 3) * 0.06;
    room.metalBag.add(cyl(rad, rad, rad * 2.2, gx, T + 0.05 + rad * 1.1, gz, 10), brass);
    room.metalBag.add(new THREE.SphereGeometry(rad * 0.45, 6, 4).translate(gx, T + 0.05 + rad * 2.4, gz), brass);
  });
  // Pillenbrett mit Messingschneide und ein paar fertigen Pillen
  room.woodBag.box(0x7a5030, 0.32, 0.025, 0.17, -0.9, T + 0.012, -0.6);
  room.metalBag.box(0xc8a860, 0.13, 0.006, 0.13, -0.98, T + 0.028, -0.6);
  for (let i = 0; i < 9; i++) room.plainBag.add(new THREE.SphereGeometry(0.0065, 6, 4).translate(-0.84 + (i % 3) * 0.018, T + 0.032, -0.64 + Math.floor(i / 3) * 0.018), 0xd8ccb0);
  // Rezeptbuch, aufgeschlagen, mit Tintenfass
  const bx = 0.55;
  const bz = -0.56;
  room.plainBag.box(0x2a1a10, 0.46, 0.014, 0.32, bx, T + 0.007, bz);
  room.plainBag.box(0xe8e0ca, 0.21, 0.02, 0.3, bx - 0.11, T + 0.024, bz);
  room.plainBag.box(0xe8e0ca, 0.21, 0.02, 0.3, bx + 0.11, T + 0.024, bz);
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 0.11 : -0.11;
    room.plainBag.box(0x3a3430, 0.12 + r() * 0.05, 0.0006, 0.003, bx + side - 0.01, T + 0.0345, bz - 0.11 + Math.floor(i / 2) * 0.035);
  }
  room.glassBag.add(cyl(0.028, 0.032, 0.05, bx + 0.33, T + 0.025, bz - 0.06, 10), 0xc8d8d0);
  room.plainBag.add(cyl(0.024, 0.028, 0.03, bx + 0.33, T + 0.017, bz - 0.06, 10), 0x0e0e12);
  rod(room.plainBag, [bx + 0.33, T + 0.03, bz - 0.06], [bx + 0.29, T + 0.17, bz - 0.04], 0.004, 0x1a1410);
  // Abholfertige Arzneien: Fläschchen mit Papiertektur, Pulverbriefe
  for (let i = 0; i < 3; i++) {
    const fx = -0.05 + i * 0.08;
    glaze.add(cyl(0.022, 0.022, 0.08, fx, T + 0.04, -0.5, 10), 0x5a3010);
    glaze.add(cyl(0.008, 0.016, 0.025, fx, T + 0.092, -0.5, 8), 0x5a3010);
    room.plainBag.add(cyl(0.017, 0.014, 0.022, fx, T + 0.112, -0.5, 8), i === 1 ? 0xd8a8a0 : 0xe8e2d0);
    room.plainBag.box(0xece6d4, 0.002, 0.06, 0.035, fx, T + 0.035, -0.5 + 0.024);
  }
  for (let i = 0; i < 4; i++) room.plainBag.box(0xf0ead8, 0.06, 0.006, 0.04, 0.0 + i * 0.012, T + 0.003 + i * 0.006, -0.72 + i * 0.006);
  // Mörser: Porzellan mit Pistill, daneben ein schwerer Bronzemörser
  glaze.add(new THREE.CylinderGeometry(0.08, 0.055, 0.09, 16, 1, true).translate(1.35, T + 0.045, -0.6), 0xece8dc);
  glaze.add(cyl(0.055, 0.055, 0.01, 1.35, T + 0.005, -0.6, 16), 0xece8dc);
  glaze.add(cyl(0.07, 0.05, 0.004, 1.35, T + 0.03, -0.6, 16), 0xd8d0c0);
  rod(glaze, [1.35, T + 0.03, -0.6], [1.42, T + 0.2, -0.56], 0.012, 0xece8dc);
  glaze.add(new THREE.SphereGeometry(0.02, 8, 6).translate(1.35, T + 0.03, -0.6), 0xece8dc);
  room.metalBag.add(cyl(0.1, 0.08, 0.13, 1.8, T + 0.065, -0.62, 16), 0x7a5a2a);
  room.metalBag.add(cyl(0.105, 0.105, 0.015, 1.8, T + 0.125, -0.62, 16), 0x8a6a34);
  room.plainBag.add(cyl(0.085, 0.085, 0.005, 1.8, T + 0.131, -0.62, 16), 0x1a140c);
  rod(room.metalBag, [1.8, T + 0.1, -0.62], [1.74, T + 0.3, -0.66], 0.014, 0x7a5a2a);
  // Bonbonglas mit Malzbonbons
  room.glassBag.add(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 16, 1, true).translate(-2.9, T + 0.1, -0.55), 0xd8e0dc);
  room.glassBag.add(cyl(0.08, 0.08, 0.008, -2.9, T + 0.004, -0.55, 16), 0xd8e0dc);
  room.metalBag.add(cyl(0.085, 0.085, 0.02, -2.9, T + 0.21, -0.55, 16), 0xb59a55);
  room.metalBag.add(new THREE.SphereGeometry(0.02, 8, 6).translate(-2.9, T + 0.235, -0.55), 0xb59a55);
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.06;
    room.plainBag.add(new THREE.SphereGeometry(0.014, 6, 4).scale(1, 0.7, 1).translate(-2.9 + Math.cos(a) * d, T + 0.02 + Math.floor(i / 9) * 0.022, -0.55 + Math.sin(a) * d), [0x9a4a12, 0xb8701a, 0x6a2a0e][i % 3]);
  }
}

// Giftschrank in der Nordostecke, zum Kunden gewendet: unten verschlossen, oben verglast, zwei Schlösser.
function poisonCabinet(room, glaze, labels, x) {
  const zb = -room.d / 2;
  const dpt = 0.45;
  const wid = 0.72;
  const zc = zb + dpt / 2;
  const zf = zb + dpt;
  const dark = 0x1e1208;
  const frame = 0x3a2212;
  room.woodBag.box(dark, wid, 1.05, dpt, x, 0.525, zc);
  room.woodBag.box(0x5a3820, wid - 0.06, 0.95, 0.03, x, 1.55, zb + 0.015);
  for (const s of [-1, 1]) room.woodBag.box(dark, 0.03, 1.0, dpt, x + s * (wid / 2 - 0.015), 1.55, zc);
  room.woodBag.box(dark, wid, 0.05, dpt, x, 2.075, zc);
  room.woodBag.box(0x2a180c, wid + 0.08, 0.08, dpt + 0.06, x, 2.14, zc + 0.02);
  room.woodBag.box(0x24160a, wid - 0.06, 0.02, dpt - 0.05, x, 1.55, zc - 0.01);
  // Untere Türen mit Füllungen, oben Rahmen um das Glas
  for (const s of [-1, 1]) {
    room.woodBag.box(frame, wid / 2 - 0.04, 0.86, 0.02, x + (s * wid) / 4, 0.55, zf + 0.01);
    room.woodBag.box(0x4a2c16, wid / 2 - 0.14, 0.66, 0.02, x + (s * wid) / 4, 0.55, zf + 0.022);
  }
  room.woodBag.box(frame, wid, 0.05, 0.025, x, 1.08, zf + 0.012);
  room.woodBag.box(frame, wid, 0.05, 0.025, x, 2.03, zf + 0.012);
  for (const dx of [-wid / 2 + 0.025, 0, wid / 2 - 0.025]) room.woodBag.box(frame, 0.05, 1.0, 0.025, x + dx, 1.555, zf + 0.012);
  room.glassBag.add(box(wid - 0.05, 0.9, 0.005, x, 1.555, zf + 0.005), 0x2a3432);
  // Zwei Schlösser, Messing
  for (const y of [0.95, 1.18]) {
    room.metalBag.box(0xb59a55, 0.045, 0.07, 0.01, x + 0.035, y, zf + 0.026);
    room.plainBag.box(0x0a0806, 0.008, 0.025, 0.004, x + 0.035, y - 0.005, zf + 0.032);
  }
  // Venena: dunkle Flaschen, weiß auf schwarz beschriftet
  [1.05, 1.565].forEach((y, row) => {
    for (let i = 0; i < 4; i++) tinctureBottle(glaze, labels, x - wid / 2 + 0.11 + i * 0.165, y, zc + 0.02, 0.042, 0.13, 28 + ((i + row) % 4), 0x1a120c);
  });
  const inner = new THREE.PointLight(0xffd8a0, 0.6, 1.4, 2);
  inner.position.set(x, 1.95, zc + 0.05);
  room.scene.add(inner);
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(0.44, 0.08),
    new THREE.MeshStandardMaterial({ map: signTexture('Venena', { width: 512, height: 92, size: 66, bg: '#141210', fg: '#ece6d6', font: '"EB Garamond", serif' }), roughness: 0.6 }),
  );
  plaque.position.set(x, 2.14, zf + 0.056);
  room.scene.add(plaque);
  room.solid(x, zc, wid, dpt);
}

// Kräuterschrank: viele kleine Schubladen für Drogen, an der Westwand.
function herbCabinet(room, z, r) {
  const xb = -room.w / 2;
  const dpt = 0.4;
  const wid = 1.0;
  const xf = xb + dpt;
  room.woodBag.box(0x2e1a0c, dpt, 2.3, wid, xb + dpt / 2, 1.15, z);
  room.woodBag.box(0x24140a, dpt + 0.06, 0.08, wid + 0.08, xb + dpt / 2 + 0.02, 2.34, z);
  for (let row = 0; row < 8; row++) {
    for (let c = 0; c < 5; c++) {
      const y = 0.2 + row * 0.27;
      const dz = z - wid / 2 + 0.1 + c * 0.2;
      room.woodBag.box(r() < 0.5 ? 0x4a2c16 : 0x4f3018, 0.02, 0.24, 0.18, xf + 0.005, y, dz);
      room.plainBag.box(0xe8e2d2, 0.006, 0.035, 0.08, xf + 0.018, y + 0.05, dz);
      room.metalBag.add(new THREE.SphereGeometry(0.013, 6, 4).translate(xf + 0.028, y - 0.045, dz), 0xb59a55);
    }
  }
  room.solid(xb + dpt / 2, z, dpt, wid);
}

// Schaufenster in der Südwand, davor ein Sockel mit großem gefärbtem Schaugefäß.
function shopWindow(room, x, color, light) {
  const zw = room.d / 2;
  const w = 1.5;
  const h = 1.8;
  const y = 1.98;
  addMesh(room.scene, new THREE.PlaneGeometry(w, h).rotateY(Math.PI).translate(x, y, zw - 0.02), room.viewMaterial('south'));
  const fr = 0x2a1a10;
  room.woodBag.box(fr, w + 0.14, 0.08, 0.09, x, y + h / 2, zw - 0.04);
  room.woodBag.box(fr, w + 0.14, 0.06, 0.26, x, y - h / 2 - 0.02, zw - 0.12);
  for (const s of [-1, 1]) room.woodBag.box(fr, 0.08, h + 0.14, 0.09, x + (s * w) / 2, y, zw - 0.04);
  room.woodBag.box(fr, w, 0.05, 0.05, x, y + h * 0.22, zw - 0.04);
  room.woodBag.box(fr, 0.05, h, 0.05, x, y, zw - 0.04);
  // Sockel
  const pz = zw - 0.36;
  room.woodBag.box(0x3a2212, 0.4, 0.95, 0.4, x, 0.475, pz);
  room.woodBag.box(0x5a3820, 0.46, 0.04, 0.46, x, 0.97, pz);
  room.solid(x, pz, 0.46, 0.46);
  room.metalBag.add(cyl(0.09, 0.11, 0.04, x, 1.01, pz, 16), 0xb59a55);
  // Schaugefäß: bauchiger Kolben mit langem Hals und Glasstopfen
  const pts = [[0, 0], [0.07, 0], [0.13, 0.04], [0.17, 0.14], [0.16, 0.25], [0.11, 0.32], [0.045, 0.36], [0.038, 0.5], [0.055, 0.52], [0.0, 0.52]].map(([a, b]) => new THREE.Vector2(a, b));
  const globe = new THREE.Mesh(
    new THREE.LatheGeometry(pts, 24),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.08, transparent: true, opacity: 0.82 }),
  );
  globe.position.set(x, 1.03, pz);
  room.scene.add(globe);
  const stopper = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), globe.material);
  stopper.position.set(x, 1.03 + 0.57, pz);
  room.scene.add(stopper);
  const l = new THREE.PointLight(light, 1.6, 4.5, 2);
  l.position.set(x, 1.3, pz - 0.3);
  room.scene.add(l);
}

// Glasvitrine an der Ostwand: Seifen, Duftwässer, Dosen mit Zahnpulver.
function vitrine(room, glaze, z, r) {
  const xb = room.w / 2;
  const dpt = 0.5;
  const len = 1.6;
  const xc = xb - dpt / 2;
  const xf = xb - dpt;
  room.woodBag.box(0x3a2212, dpt, 0.8, len, xc, 0.4, z);
  room.woodBag.box(0x5a3820, dpt + 0.03, 0.03, len + 0.03, xc, 0.815, z);
  for (const dz of [-len / 2 + 0.02, len / 2 - 0.02]) room.woodBag.box(0x3a2212, 0.04, 1.1, 0.04, xf + 0.02, 1.38, z + dz);
  room.woodBag.box(0x3a2212, dpt, 0.05, len, xc, 1.95, z);
  room.glassBag.add(box(0.006, 1.1, len - 0.04, xf + 0.01, 1.38, z), 0x2a3432);
  for (const s of [-1, 1]) room.glassBag.add(box(dpt - 0.04, 1.1, 0.006, xc, 1.38, z + s * (len / 2 - 0.01)), 0x2a3432);
  for (const y of [1.17, 1.52]) room.glassBag.add(box(dpt - 0.06, 0.008, len - 0.06, xc, y, z), 0x4a5452);
  // Waren
  const shelves = [0.83, 1.175, 1.525];
  shelves.forEach((y, s) => {
    for (let i = 0; i < 6; i++) {
      const iz = z - len / 2 + 0.16 + i * 0.255;
      const ix = xc + (r() - 0.5) * 0.12;
      const kind = (i + s) % 3;
      if (kind === 0) {
        // Duftwasser
        glaze.add(cyl(0.028, 0.032, 0.1, ix, y + 0.05, iz, 10), [0xc8a040, 0x8a3a6a, 0x3a6a8a][i % 3]);
        glaze.add(new THREE.SphereGeometry(0.022, 8, 6).translate(ix, y + 0.125, iz), 0xd8d0c0);
      } else if (kind === 1) {
        // Seifen im Papier
        for (let k = 0; k < 2; k++) room.plainBag.box([0xd8b8c0, 0xc8d8b8, 0xe8dcc0][(i + k) % 3], 0.09, 0.03, 0.06, ix, y + 0.015 + k * 0.03, iz);
      } else {
        // Blechdosen
        room.metalBag.add(cyl(0.035, 0.035, 0.05, ix, y + 0.025, iz, 14), [0x8a2a1a, 0x2a4a6a, 0xb59a55][i % 3]);
        room.plainBag.add(cyl(0.036, 0.036, 0.004, ix, y + 0.052, iz, 14), 0xe8e0c8);
      }
    }
  });
  room.solid(xc, z, dpt, len);
}

// Ladenglocke an der Feder über der Tür.
function doorBell(room) {
  const z = room.d / 2 - 0.08;
  room.metalBag.box(0x2a2620, 0.04, 0.08, 0.04, 0.36, 2.62, z);
  rod(room.metalBag, [0.36, 2.62, z - 0.02], [0.36, 2.52, z - 0.18], 0.004, 0x2a2620);
  room.metalBag.add(new THREE.SphereGeometry(0.05, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0.36, 2.44, z - 0.18), 0xc8a860);
  room.metalBag.add(cyl(0.004, 0.004, 0.08, 0.36, 2.48, z - 0.18, 5), 0x2a2620);
}
