import * as THREE from 'three';
import { addMesh, box, cyl, merge, std } from '../kit.js';
import { diploma, landscape, mirrorGlass, rng, sheetMusic, softDisc, wallpaper, wood } from '../textures.js';
import { Room } from './room.js';
import { gasolier, rug, streetGlow, wainscot, wingChair } from './fittings.js';

export function buildPension() {
  const room = new Room({
    id: 'pension',
    name: 'Pension Puhlmann',
    w: 8,
    d: 6.5,
    h: 3.3,
    wall: wallpaper('#4a2c2a', 'rgba(200,160,100,0.17)', 76),
    floor: wood([92, 60, 36], 67),
    ceiling: 0x5a5244,
    ambient: 0.42,
  });
  const { loc } = room;
  const r = rng(610);

  // Vertäfelung und Stuckleiste
  wainscot(room, 'south', -4, -0.7, 0.9);
  wainscot(room, 'south', 0.7, 4, 0.9);
  wainscot(room, 'north', -4, 0.1, 0.9);
  wainscot(room, 'north', 2.3, 4, 0.9);
  wainscot(room, 'west', -3.25, 3.25, 0.9);
  wainscot(room, 'east', -3.25, 3.25, 0.9);
  for (const s of [-1, 1]) {
    room.plainBag.box(0xa89c84, 8, 0.12, 0.12, 0, 3.24, s * 3.19);
    room.plainBag.box(0xa89c84, 0.12, 0.12, 6.5, s * 3.94, 3.24, 0);
  }

  // Kamin: Marmorsims, Spiegel, offenes Feuer im Korbrost
  const fx = 1.2;
  fireplace(room, fx);
  loc.anchor('pantoffel', fx + 0.55, 1.68, -2.92);
  loc.anchor('briefe', fx + 0.05, 1.45, -2.6);

  // Zwei Ohrensessel zum Feuer gedreht, ein Rauchtisch, Zeitungsstapel
  wingChair(room, -0.2, -1.5, 1.85, { cloth: 0x3a2a20, dark: 0x22180f, padColor: 0x4a3626, plaid: false });
  wingChair(room, 2.8, -1.5, -1.85, { cloth: 0x253a2c, dark: 0x18261c, padColor: 0x2e4636, plaid: false });
  smokingTable(room, -0.95, -2.45);
  newspapers(room, r);
  loc.anchor('zeitungen', -1.65, 0.4, -2.7);
  rug(room, 1.2, -0.9, 3.5, 2.6, 0x4a1c18, 0x8a6a3a);
  room.plainBag.box(0x6a2a20, 1.3, 0.01, 0.8, 1.2, 0.005, -0.9);

  // Laborecke
  room.table(-3.3, -1.4, 0.9, 2.4, 0.82);
  laboratory(room, -3.3, 0.85, -1.4, r);
  loc.anchor('labor', -3.3, 1.1, -1.4);
  loc.anchor('diplom', -3.93, 2.25, -1.4);
  doctorsBag(room, -2.65, 0.3);

  // Violine, Bogen und Notenpult
  room.table(3.2, 1.4, 0.8, 0.8, 0.72);
  violin(room, 3.18, 0.755, 1.5, 0.5);
  musicStand(room, 2.5, 2.05, -Math.PI / 2 - 0.3);
  loc.anchor('violine', 3.2, 0.82, 1.4);

  // Bücherregal, Vertiko mit Teeservice, Chaiselongue
  bookcase(room, -2.6, r);
  loc.anchor('buecher', -2.6, 1.3, 2.6);
  vertiko(room, -3.75, 1.2);
  chaise(room, 2.3, 2.78);

  // Bilder: Abendlandschaft über der Chaiselongue, kleineres Bild neben dem Kamin
  painting(room, 2.3, 1.85, 3.23, Math.PI, 0.95, 0.68, 1);
  painting(room, -1.9, 1.95, -3.23, 0, 0.7, 0.5, 2);

  // Fenster mit Vorhängen, Palme in der Ecke
  room.window('east', -0.8, 1.9, 1.2, 1.6);
  curtains(room, -0.8, 1.2);
  palm(room, 3.45, -2.8);

  // Gaskrone, Fülllicht über dem Labor, bläuliches Laternenlicht von draußen
  gasolier(room, 0.4, 0.2);
  room.lamp(-2.4, 2.6, -1.4, { intensity: 2.0, visible: false, hang: false });
  oilLamp(room, -3.71, 1.3, 0.6);
  oilLamp(room, 3.48, 0.75, 1.12);
  streetGlow(room, [4.4, 2.6, -0.8], [1.5, 0, -0.4]);

  loc.anchor('voss', -1.9, 0, -0.4, 1.2);
  loc.anchor('martha', 1.1, 0, -0.4, 0);
  loc.spawn = { pos: [0, 0, 1.9], yaw: 0 };
  return room.finish();
}

// --- Ausstattung der Pension ------------------------------------------------------

function fireplace(room, fx) {
  const { scene, loc } = room;
  const marble = 0x5e5850;
  room.plainBag.box(0x3a3632, 2.1, 1.5, 0.5, fx, 0.75, -3.0);
  for (const s of [-1, 1]) room.plainBag.box(marble, 0.24, 1.42, 0.12, fx + s * 0.86, 0.71, -2.71);
  room.plainBag.box(marble, 2.4, 0.1, 0.62, fx, 1.53, -2.95);
  room.plainBag.box(marble, 1.48, 0.2, 0.08, fx, 1.36, -2.71);
  room.plainBag.box(0x0a0806, 1.1, 0.95, 0.04, fx, 0.48, -2.73);
  room.plainBag.box(0x4a4640, 2.3, 0.04, 0.5, fx, 0.02, -2.45);
  room.solid(fx, -2.9, 2.4, 0.7);

  // Korbrost mit Scheiten und Glut
  room.metalBag.box(0x1a1a1a, 0.7, 0.03, 0.3, fx, 0.08, -2.58);
  for (let i = 0; i < 5; i++) room.metalBag.box(0x1a1a1a, 0.02, 0.22, 0.02, fx - 0.3 + i * 0.15, 0.18, -2.44);
  room.metalBag.box(0x1a1a1a, 0.7, 0.02, 0.02, fx, 0.28, -2.44);
  for (const [dz, a] of [[-0.64, 0.15], [-0.54, -0.2]]) {
    const log = cyl(0.05, 0.055, 0.6, 0, 0, 0, 10);
    log.rotateZ(Math.PI / 2);
    log.rotateY(a);
    log.translate(fx, 0.15, dz);
    room.woodBag.add(log, 0x2a1a10);
  }
  const embers = [];
  const er = rng(91);
  for (let i = 0; i < 14; i++) embers.push(new THREE.SphereGeometry(0.03 + er() * 0.02, 6, 4).translate(fx - 0.28 + er() * 0.56, 0.11 + er() * 0.03, -2.65 + er() * 0.16));
  addMesh(scene, merge(embers), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 0.5, 0.12) }));
  const fire = new THREE.PointLight(0xff7a2c, 6, 8, 1.8);
  fire.position.set(fx, 0.55, -2.3);
  scene.add(fire);
  const flames = [];
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('glow'), color: i % 2 ? 0xff9a3a : 0xff6a1a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    f.position.set(fx - 0.2 + i * 0.1, 0.3, -2.58);
    scene.add(f);
    flames.push(f);
  }
  loc.onUpdate((dt, t) => {
    fire.intensity = 5.5 + 1.6 * Math.sin(t * 7.1) * Math.sin(t * 3.3) + 0.8 * Math.sin(t * 13);
    flames.forEach((f, i) => {
      const k = Math.sin(t * (6 + i) + i * 1.7) * 0.5 + 0.5;
      f.scale.set(0.16 + 0.06 * k, 0.32 + 0.16 * k, 1);
      f.position.y = 0.3 + 0.05 * k;
    });
  });

  // Messingvorsetzer, Kaminbesteck, Kohleneimer mit Zigarren
  room.metalBag.box(0xb08a3a, 1.6, 0.05, 0.02, fx, 0.05, -2.18);
  for (const s of [-1, 1]) room.metalBag.box(0xb08a3a, 0.02, 0.05, 0.3, fx + s * 0.8, 0.05, -2.33);
  const ix = fx + 1.0;
  room.metalBag.add(cyl(0.07, 0.08, 0.02, ix, 0.01, -2.5, 10), 0x1e1e1e);
  room.metalBag.add(cyl(0.008, 0.008, 0.7, ix, 0.36, -2.5, 6), 0x1e1e1e);
  for (const [dx, dz] of [[0.04, 0.01], [-0.03, 0.03], [0.0, -0.04]]) {
    room.metalBag.add(cyl(0.006, 0.006, 0.62, ix + dx, 0.36, -2.5 + dz, 6), 0x2a2a2a);
    room.metalBag.add(new THREE.SphereGeometry(0.014, 6, 4).translate(ix + dx, 0.68, -2.5 + dz), 0xb08a3a);
  }
  const cx = fx - 1.0;
  room.metalBag.add(cyl(0.13, 0.11, 0.3, cx, 0.15, -2.45, 14), 0x1a1a1a);
  for (let i = 0; i < 6; i++) {
    const c = cyl(0.009, 0.009, 0.14, 0, 0, 0, 6);
    c.rotateZ((i - 2.5) * 0.12);
    c.translate(cx - 0.06 + i * 0.024, 0.32, -2.45 + (i % 2) * 0.03);
    room.plainBag.add(c, 0x5a3418);
  }

  // Spiegel im Goldrahmen
  room.metalBag.box(0xb08a3a, 1.32, 0.97, 0.04, fx, 2.32, -3.23);
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 0.83), new THREE.MeshStandardMaterial({ map: mirrorGlass(), emissive: 0xffffff, emissiveMap: mirrorGlass(), emissiveIntensity: 0.55, roughness: 0.08 }));
  mirror.position.set(fx, 2.32, -3.205);
  scene.add(mirror);

  // Auf dem Sims: Uhr, Leuchter, der persische Pantoffel
  room.clock(fx - 0.72, 1.74, -2.95, 0, 0.14);
  for (const s of [-1, 1]) {
    const lx = fx + s * 1.05;
    room.metalBag.add(cyl(0.04, 0.05, 0.02, lx, 1.59, -2.95, 10), 0xb08a3a);
    room.metalBag.add(cyl(0.012, 0.016, 0.16, lx, 1.68, -2.95, 8), 0xb08a3a);
    room.plainBag.add(cyl(0.012, 0.012, 0.12, lx, 1.82, -2.95, 8), 0xe8e0c8);
    addMesh(scene, new THREE.SphereGeometry(0.009, 6, 4).scale(1, 1.8, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.4, 0.5) }), lx, 1.895, -2.95);
  }
  const sx = fx + 0.55;
  const sy = 1.58;
  const sz = -2.92;
  room.plainBag.box(0x4a1a14, 0.24, 0.015, 0.1, sx, sy + 0.0075, sz);
  room.plainBag.add(new THREE.SphereGeometry(0.06, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.9, 0.9, 0.85).translate(sx + 0.01, sy + 0.012, sz), 0x7a2a24);
  room.plainBag.add(new THREE.TorusGeometry(0.03, 0.01, 6, 10, Math.PI).rotateZ(-Math.PI / 2).translate(sx + 0.12, sy + 0.04, sz), 0x7a2a24);
  room.metalBag.box(0xc8a040, 0.2, 0.006, 0.006, sx, sy + 0.064, sz + 0.03);
  room.plainBag.add(new THREE.SphereGeometry(0.03, 8, 6).scale(1.3, 0.5, 1).translate(sx - 0.07, sy + 0.05, sz), 0x4a2e18);

  // Unbeantwortete Post, mit dem Taschenmesser in den Sims gestoßen
  for (let i = 0; i < 3; i++) {
    const l = box(0.11, 0.15, 0.003, 0, -0.075, 0);
    l.rotateZ((i - 1) * 0.18);
    l.translate(fx + 0.05 + (i - 1) * 0.03, 1.535, -2.632 + i * 0.002);
    room.plainBag.add(l, [0xe4dcc8, 0xd8ccb0, 0xece4d4][i]);
  }
  const handle = cyl(0.009, 0.011, 0.085, 0, 0, 0, 8);
  handle.rotateX(Math.PI / 2 + 0.2);
  handle.translate(fx + 0.05, 1.53, -2.585);
  room.plainBag.add(handle, 0x3a2a1a);
}

function smokingTable(room, x, z) {
  room.woodBag.add(cyl(0.24, 0.24, 0.03, x, 0.58, z, 16), 0x3a2010);
  room.woodBag.add(cyl(0.025, 0.03, 0.56, x, 0.29, z, 8), 0x2a160a);
  room.woodBag.add(cyl(0.16, 0.2, 0.03, x, 0.015, z, 12), 0x2a160a);
  const y = 0.595;
  room.metalBag.add(cyl(0.06, 0.05, 0.02, x + 0.08, y + 0.01, z + 0.05, 14), 0x6a5a3a);
  // Pfeife: Kopf und Stiel
  room.woodBag.add(cyl(0.02, 0.017, 0.045, x - 0.08, y + 0.023, z - 0.02, 10), 0x4a2614);
  const stem = cyl(0.005, 0.006, 0.14, 0, 0, 0, 6);
  stem.rotateZ(Math.PI / 2 - 0.15);
  stem.translate(x - 0.01, y + 0.02, z - 0.02);
  room.plainBag.add(stem, 0x141010);
  // Tabaksdose und Streichhölzer
  room.metalBag.add(cyl(0.04, 0.04, 0.05, x + 0.02, y + 0.025, z - 0.12, 12), 0x5a6a5a);
  room.plainBag.box(0xb89a5a, 0.05, 0.015, 0.035, x - 0.1, y + 0.0075, z + 0.11);
  room.solid(x, z, 0.48, 0.48);
}

function newspapers(room, r) {
  const sheet = (x, y, z, rot, light) => {
    const s = box(0.42, 0.006, 0.3, 0, 0, 0);
    s.rotateY(rot);
    s.translate(x, y, z);
    room.plainBag.add(s, light ? 0xd8d0bc : 0xc8c0a8);
    for (let k = 0; k < 3; k++) {
      const c = box(0.11, 0.0008, 0.24, -0.13 + k * 0.13, 0, 0.01);
      c.rotateY(rot);
      c.translate(x, y + 0.0034, z);
      room.plainBag.add(c, 0x9a9282);
    }
    const head = box(0.36, 0.0009, 0.035, 0, 0, -0.12);
    head.rotateY(rot);
    head.translate(x, y + 0.0035, z);
    room.plainBag.add(head, 0x3a3630);
  };
  // Stapel neben dem Sessel, ein paar Blätter auf Teppich und Dielen
  for (let i = 0; i < 14; i++) sheet(-1.65 + (r() - 0.5) * 0.04, 0.003 + i * 0.0075, -2.7 + (r() - 0.5) * 0.04, (r() - 0.5) * 0.25, i === 13);
  sheet(-0.6, 0.012, -0.75, 0.5, true);
  sheet(0.3, 0.012, -2.1, -0.3, true);
  sheet(-1.1, 0.004, -1.95, 1.2, false);
  room.solid(-1.65, -2.7, 0.45, 0.35);
}

function laboratory(room, x, y, z, r) {
  const brass = 0xb59a55;
  // Säureflecken auf der Platte
  for (let i = 0; i < 9; i++) room.plainBag.add(cyl(0.02 + r() * 0.05, 0.02, 0.002, x - 0.3 + r() * 0.6, y + 0.001, z - 1.1 + r() * 2.2, 10), 0x1a120a);
  // Bunsenbrenner, Stativ mit Kolben über der Flamme
  const bx = x + 0.15;
  const bz = z + 0.9;
  room.metalBag.add(cyl(0.04, 0.05, 0.015, bx, y + 0.008, bz, 12), 0x3a3a3a);
  room.metalBag.add(cyl(0.012, 0.012, 0.13, bx, y + 0.08, bz, 8), brass);
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('glow'), color: 0x5a9aff, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
  flame.position.set(bx, y + 0.19, bz);
  flame.scale.set(0.06, 0.13, 1);
  room.scene.add(flame);
  room.loc.onUpdate((dt, t) => { flame.scale.y = 0.12 + 0.02 * Math.sin(t * 23); });
  room.metalBag.box(0x2a2a2a, 0.12, 0.01, 0.18, x - 0.15, y + 0.005, bz);
  room.metalBag.add(cyl(0.006, 0.006, 0.5, x - 0.15, y + 0.25, bz, 6), 0x5a5a5a);
  room.metalBag.add(new THREE.TorusGeometry(0.05, 0.004, 4, 16).rotateX(Math.PI / 2).translate(bx, y + 0.27, bz), 0x5a5a5a);
  room.metalBag.box(0x5a5a5a, 0.3, 0.006, 0.006, x, y + 0.27, bz);
  room.glassBag.add(new THREE.SphereGeometry(0.065, 14, 10).translate(bx, y + 0.33, bz), 0xc8d8d0);
  room.glassBag.add(new THREE.CylinderGeometry(0.016, 0.018, 0.12, 10, 1, true).translate(bx, y + 0.44, bz), 0xc8d8d0);
  room.plainBag.add(new THREE.SphereGeometry(0.05, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(bx, y + 0.33, bz), 0x4a8a5a);
  // Retorte
  const rx = x + 0.1;
  const rz = z + 0.2;
  room.glassBag.add(new THREE.SphereGeometry(0.075, 14, 10).translate(rx, y + 0.08, rz), 0xc8d8d0);
  room.plainBag.add(new THREE.SphereGeometry(0.06, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(rx, y + 0.08, rz), 0x8a4a1a);
  const neck = new THREE.CylinderGeometry(0.008, 0.022, 0.32, 10, 1, true);
  neck.translate(0, 0.16, 0);
  neck.rotateX(1.9);
  neck.translate(rx, y + 0.14, rz + 0.02);
  room.glassBag.add(neck, 0xc8d8d0);
  // Reagenzglasgestell
  const tz = z - 0.35;
  room.woodBag.box(0x6a4a2a, 0.08, 0.02, 0.36, x + 0.1, y + 0.01, tz);
  room.woodBag.box(0x6a4a2a, 0.08, 0.02, 0.36, x + 0.1, y + 0.11, tz);
  for (const dz of [-0.17, 0.17]) room.woodBag.box(0x6a4a2a, 0.08, 0.12, 0.02, x + 0.1, y + 0.06, tz + dz);
  const liquids = [0x7a1a1a, 0x2a5a8a, 0xc8b040, 0x3a7a3a, 0x8a5a9a, 0xd8d0c0];
  liquids.forEach((c, i) => {
    const pz = tz - 0.125 + i * 0.05;
    room.glassBag.add(new THREE.CylinderGeometry(0.011, 0.011, 0.15, 8, 1, true).translate(x + 0.1, y + 0.1, pz), 0xd0dcd8);
    room.plainBag.add(cyl(0.009, 0.009, 0.05 + (i % 3) * 0.02, x + 0.1, y + 0.055 + (i % 3) * 0.01, pz, 8), c);
  });
  // Reagenzienflaschen mit Schildchen an der Wandseite
  for (let i = 0; i < 7; i++) {
    const pz = z - 1.05 + i * 0.13;
    const col = i % 3 ? 0x4a2a10 : 0x8a9a90;
    room.plainBag.add(cyl(0.035, 0.035, 0.13, x - 0.33, y + 0.065, pz, 10), col);
    room.plainBag.add(cyl(0.012, 0.014, 0.04, x - 0.33, y + 0.15, pz, 8), col);
    room.plainBag.add(cyl(0.016, 0.012, 0.02, x - 0.33, y + 0.18, pz, 8), 0x2a2420);
    room.plainBag.box(0xe8e0c8, 0.004, 0.045, 0.04, x - 0.296, y + 0.07, pz);
  }
  // Mikroskop von Dr. Voss
  const mx = x + 0.12;
  const mz = z - 0.85;
  room.metalBag.box(0x1a1a1a, 0.12, 0.02, 0.16, mx, y + 0.01, mz);
  room.metalBag.add(cyl(0.012, 0.014, 0.16, mx - 0.04, y + 0.1, mz, 8), brass);
  room.metalBag.box(0x1a1a1a, 0.09, 0.008, 0.09, mx, y + 0.1, mz);
  const tube = cyl(0.018, 0.016, 0.17, 0, 0, 0, 12);
  tube.rotateZ(0.25);
  tube.translate(mx - 0.005, y + 0.21, mz);
  room.metalBag.add(tube, brass);
  const eye = cyl(0.012, 0.012, 0.04, 0, 0, 0, 8);
  eye.rotateZ(0.25);
  eye.translate(mx - 0.03, y + 0.31, mz);
  room.metalBag.add(eye, 0x1a1a1a);
  // Mörser mit Pistill, Notizbuch
  room.plainBag.add(cyl(0.05, 0.035, 0.06, x + 0.25, y + 0.03, z - 0.2, 12), 0xd8d0c0);
  const pestle = cyl(0.008, 0.013, 0.12, 0, 0, 0, 8);
  pestle.rotateZ(0.5);
  pestle.translate(x + 0.27, y + 0.08, z - 0.2);
  room.plainBag.add(pestle, 0xd8d0c0);
  room.plainBag.box(0xe8e0c8, 0.16, 0.012, 0.22, x + 0.22, y + 0.006, z + 0.5);
  room.plainBag.box(0x2a1a10, 0.005, 0.014, 0.22, x + 0.22, y + 0.007, z + 0.5);

  // Wandbord mit weiteren Flaschen, darüber das Diplom
  const wx = -room.w / 2 + 0.12;
  room.woodBag.box(0x3a2010, 0.22, 0.03, 1.8, wx, 1.55, z);
  for (const dz of [-0.75, 0.75]) room.woodBag.box(0x2a160a, 0.02, 0.14, 0.03, wx - 0.1, 1.48, z + dz);
  for (let i = 0; i < 9; i++) {
    const pz = z - 0.8 + i * 0.2;
    const col = [0x4a2a10, 0x20402a, 0x8a9a90, 0x1a2a4a][i % 4];
    const h = 0.12 + (i % 3) * 0.04;
    room.plainBag.add(cyl(0.035, 0.038, h, wx, 1.565 + h / 2, pz, 10), col);
    room.plainBag.add(cyl(0.012, 0.016, 0.04, wx, 1.585 + h, pz, 8), col);
  }
  const certificate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.39),
    new THREE.MeshStandardMaterial({ map: diploma(), roughness: 0.8 }),
  );
  certificate.rotation.y = Math.PI / 2;
  certificate.position.set(-room.w / 2 + 0.035, 2.25, z);
  room.scene.add(certificate);
  room.metalBag.box(0xb08a3a, 0.03, 0.47, 0.58, -room.w / 2 + 0.015, 2.25, z);
}

function doctorsBag(room, x, z) {
  room.plainBag.box(0x161412, 0.38, 0.18, 0.2, x, 0.09, z);
  const top = cyl(0.1, 0.1, 0.38, 0, 0, 0, 12);
  top.rotateZ(Math.PI / 2);
  top.scale(1, 0.55, 1);
  top.translate(x, 0.18, z);
  room.plainBag.add(top, 0x161412);
  room.plainBag.add(new THREE.TorusGeometry(0.06, 0.01, 6, 12, Math.PI).translate(x, 0.23, z), 0x221c18);
  room.metalBag.box(0xb08a3a, 0.05, 0.03, 0.01, x, 0.2, z + 0.1);
}

// Geige flach auf dem Tisch: geschwungener Korpus, Griffbrett, Schnecke; daneben der Bogen.
function violin(room, x, y, z, rot) {
  const L = 0.355;
  const half = (t) => {
    const lower = 0.103 * Math.sqrt(Math.max(0, 1 - ((t - 0.28) / 0.29) ** 2));
    const upper = 0.083 * Math.sqrt(Math.max(0, 1 - ((t - 0.76) / 0.24) ** 2));
    const waist = t > 0.4 && t < 0.64 ? 0.056 : 0;
    return Math.max(lower, upper, waist, 0.004);
  };
  const shape = new THREE.Shape();
  const N = 40;
  shape.moveTo(half(0), 0);
  for (let i = 1; i <= N; i++) shape.lineTo(half(i / N), (i / N) * L);
  for (let i = N; i >= 0; i--) shape.lineTo(-half(i / N), (i / N) * L);
  // Lokal: Länge entlang y, Höhe entlang z; danach flach auf den Tisch gelegt.
  const place = (g) => {
    g.translate(0, -L / 2, 0);
    g.rotateX(-Math.PI / 2);
    g.rotateY(rot);
    g.translate(x, y + 0.008, z);
    return g;
  };
  const body = new THREE.ExtrudeGeometry(shape, { depth: 0.032, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.004, bevelSegments: 2, curveSegments: 4 });
  room.woodBag.add(place(body), 0x7a3010);
  room.woodBag.add(place(box(0.026, 0.13, 0.02, 0, L + 0.065, 0.035)), 0x7a3010);
  room.woodBag.add(place(box(0.03, 0.07, 0.03, 0, L + 0.165, 0.035)), 0x6a2a0c);
  room.woodBag.add(place(cyl(0.018, 0.018, 0.03, 0, 0, 0, 10).rotateZ(Math.PI / 2).translate(0, L + 0.215, 0.04)), 0x6a2a0c);
  for (const s of [-1, 1]) room.plainBag.add(place(cyl(0.004, 0.004, 0.05, 0, 0, 0, 6).rotateZ(Math.PI / 2).translate(s * 0.025, L + 0.165, 0.04)), 0x101010);
  room.plainBag.add(place(box(0.04, 0.27, 0.008, 0, L - 0.05, 0.046)), 0x101010);
  room.plainBag.add(place(box(0.04, 0.09, 0.008, 0, 0.065, 0.042)), 0x101010);
  room.woodBag.add(place(box(0.05, 0.004, 0.018, 0, 0.135, 0.048)), 0xc8a878);
  for (let i = 0; i < 4; i++) room.plainBag.add(place(box(0.0012, 0.36, 0.0012, -0.009 + i * 0.006, 0.2, 0.056)), 0xc8c0a8);
  // Bogen
  const bow = (g) => {
    g.rotateX(Math.PI / 2);
    g.rotateY(rot + 0.08);
    g.translate(x - 0.15, y + 0.012, z + 0.12);
    return g;
  };
  room.woodBag.add(bow(cyl(0.004, 0.005, 0.74, 0, 0, 0, 6)), 0x5a2a10);
  room.plainBag.add(bow(box(0.004, 0.68, 0.002, 0.012, 0, 0)), 0xe8e0cc);
  room.plainBag.add(bow(box(0.012, 0.05, 0.02, 0.006, -0.33, 0)), 0x101010);
}

function musicStand(room, x, z, facing) {
  const c = 0x1e1e1e;
  for (let i = 0; i < 3; i++) {
    const leg = cyl(0.006, 0.006, 0.36, 0, 0, 0, 6);
    leg.translate(0, -0.18, 0);
    leg.rotateX(0.6);
    leg.rotateY((i / 3) * Math.PI * 2);
    leg.translate(x, 0.3, z);
    room.metalBag.add(leg, c);
  }
  room.metalBag.add(cyl(0.008, 0.008, 0.85, x, 0.72, z, 6), c);
  const g = new THREE.Group();
  const deskMat = std({ color: c, metalness: 0.5, roughness: 0.5 });
  g.add(new THREE.Mesh(box(0.48, 0.32, 0.01, 0, 0, 0), deskMat));
  g.add(new THREE.Mesh(box(0.48, 0.015, 0.04, 0, -0.165, 0.02), deskMat));
  const sheetMat = new THREE.MeshStandardMaterial({ map: sheetMusic(), roughness: 0.9 });
  for (const [sx, ry] of [[-0.11, 0.04], [0.12, -0.05]]) {
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.32), sheetMat);
    sheet.position.set(sx, 0.03, 0.008);
    sheet.rotation.y = ry;
    g.add(sheet);
  }
  g.rotation.order = 'YXZ';
  g.rotation.y = facing;
  g.rotation.x = -0.35;
  g.position.set(x, 1.28, z);
  room.scene.add(g);
  room.solid(x, z, 0.35, 0.35);
}

function bookcase(room, x, r) {
  const z = 2.95;
  room.woodBag.box(0x3a2412, 2.0, 2.4, 0.4, x, 1.2, z);
  room.woodBag.box(0x2a180c, 2.14, 0.1, 0.56, x, 2.45, z - 0.06);
  for (const s of [-1, 1]) room.woodBag.box(0x2a180c, 0.05, 2.4, 0.32, x + s * 0.975, 1.2, z - 0.33);
  const colors = [0x5a1e1a, 0x24321e, 0x1a2a3e, 0x6a4a22, 0x3a2a1c, 0x4a1a2a, 0x2a2420];
  for (let s = 0; s < 5; s++) {
    const base = 0.14 + s * 0.46;
    room.woodBag.box(0x2a180c, 1.9, 0.03, 0.3, x, base - 0.015, z - 0.33);
    let bx = x - 0.92;
    while (bx < x + 0.88) {
      if (r() < 0.05) {
        bx += 0.09;
        continue;
      }
      const bw = 0.03 + r() * 0.05;
      const hh = 0.22 + r() * 0.16;
      if (bx + bw > x + 0.93) break;
      if (s === 4 && bx > x + 0.45) break;
      const col = colors[Math.floor(r() * colors.length)];
      room.plainBag.box(col, bw, hh, 0.22, bx + bw / 2, base + hh / 2, z - 0.31);
      if (r() < 0.5) room.metalBag.box(0xb09040, bw * 0.9, 0.008, 0.002, bx + bw / 2, base + hh * 0.8, z - 0.421);
      bx += bw + 0.003;
    }
  }
  // Ein Stapel liegender Bücher im obersten Fach
  for (let i = 0; i < 4; i++) room.plainBag.box(colors[i], 0.3 - i * 0.02, 0.04, 0.22, x + 0.68, 1.98 + i * 0.04, z - 0.31);
  room.solid(x, z - 0.1, 2.1, 0.8);
}

function vertiko(room, x, z) {
  const fx = x + 0.235;
  room.woodBag.box(0x3a2010, 0.45, 1.25, 1.4, x, 0.625, z);
  for (const dz of [-0.33, 0.33]) {
    room.woodBag.box(0x4a2a16, 0.02, 0.62, 0.58, fx, 0.42, z + dz);
    room.metalBag.add(new THREE.SphereGeometry(0.015, 6, 4).translate(fx + 0.02, 0.45, z + dz * 0.15), 0xb08a3a);
  }
  room.woodBag.box(0x4a2a16, 0.02, 0.16, 1.3, fx, 0.98, z);
  room.metalBag.box(0xb08a3a, 0.02, 0.02, 0.12, fx + 0.02, 0.98, z);
  room.woodBag.box(0x2a160a, 0.52, 0.05, 1.5, x, 1.275, z);
  room.woodBag.box(0x2a160a, 0.04, 0.24, 1.3, x - 0.2, 1.42, z);
  const y = 1.3;
  const porcelain = 0xe8e4da;
  // Teekanne mit Tülle, Henkel und Deckel
  room.plainBag.add(new THREE.SphereGeometry(0.075, 14, 10).scale(1, 0.85, 1).translate(x + 0.02, y + 0.065, z - 0.3), porcelain);
  room.plainBag.add(cyl(0.03, 0.035, 0.03, x + 0.02, y + 0.13, z - 0.3, 10), porcelain);
  room.plainBag.add(new THREE.SphereGeometry(0.012, 6, 4).translate(x + 0.02, y + 0.15, z - 0.3), 0x2a4a8a);
  const spout = cyl(0.008, 0.016, 0.09, 0, 0, 0, 8);
  spout.rotateX(0.9);
  spout.translate(x + 0.02, y + 0.08, z - 0.22);
  room.plainBag.add(spout, porcelain);
  room.plainBag.add(new THREE.TorusGeometry(0.035, 0.008, 5, 10, Math.PI).rotateZ(-Math.PI / 2).rotateY(Math.PI / 2).translate(x + 0.02, y + 0.07, z - 0.375), porcelain);
  // Tassen, Zuckerdose, gerahmte Photographien
  for (const dz of [-0.05, 0.12]) {
    room.plainBag.add(cyl(0.05, 0.045, 0.006, x + 0.06, y + 0.003, z + dz, 14), porcelain);
    room.plainBag.add(cyl(0.035, 0.026, 0.05, x + 0.06, y + 0.031, z + dz, 12), porcelain);
  }
  room.plainBag.add(cyl(0.04, 0.035, 0.06, x - 0.06, y + 0.03, z + 0.05, 12), porcelain);
  for (const [dz, h] of [[0.36, 0.18], [0.52, 0.14]]) {
    const frame = box(0.015, h, h * 0.75, 0, 0, 0);
    frame.rotateZ(-0.15);
    frame.translate(x - 0.08, y + h / 2, z + dz);
    room.metalBag.add(frame, 0xb08a3a);
    const pic = box(0.004, h - 0.03, h * 0.75 - 0.03, 0, 0, 0);
    pic.rotateZ(-0.15);
    pic.translate(x - 0.07, y + h / 2, z + dz);
    room.plainBag.add(pic, 0x6a5a48);
  }
  room.solid(x, z, 0.5, 1.45);
}

function chaise(room, x, z) {
  const velvet = 0x5a2a24;
  for (const dx of [-0.82, 0.82]) for (const dz of [-0.28, 0.28]) room.woodBag.add(cyl(0.025, 0.018, 0.16, x + dx, 0.08, z + dz, 8), 0x2a160a);
  room.plainBag.box(velvet, 1.8, 0.24, 0.68, x, 0.28, z);
  room.plainBag.box(0x6a3028, 1.7, 0.1, 0.6, x, 0.45, z - 0.02);
  room.plainBag.box(velvet, 1.2, 0.42, 0.14, x - 0.2, 0.62, z + 0.28);
  const head = box(0.18, 0.55, 0.64, 0, 0, 0);
  head.rotateZ(-0.25);
  head.translate(x + 0.84, 0.62, z);
  room.plainBag.add(head, velvet);
  const bolster = cyl(0.08, 0.08, 0.56, 0, 0, 0, 12);
  bolster.rotateX(Math.PI / 2);
  bolster.translate(x + 0.7, 0.57, z - 0.02);
  room.plainBag.add(bolster, 0x7a3a30);
  room.plainBag.box(0x3e4a32, 0.36, 0.05, 0.5, x - 0.6, 0.525, z - 0.02);
  room.solid(x, z, 1.9, 0.75);
}

function painting(room, x, y, z, facing, w, h, seed) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(box(w + 0.1, h + 0.1, 0.04, 0, 0, 0), std({ color: 0xb08a3a, metalness: 0.7, roughness: 0.4 })));
  const canvasMesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: landscape(seed), roughness: 0.7 }));
  canvasMesh.position.z = 0.022;
  g.add(canvasMesh);
  g.position.set(x, y, z);
  g.rotation.y = facing;
  room.scene.add(g);
}

function curtains(room, along, w) {
  const x = room.w / 2 - 0.1;
  const red = 0x5a1a1a;
  for (const s of [-1, 1]) {
    const c = along + s * (w / 2 + 0.16);
    for (let i = 0; i < 5; i++) room.plainBag.add(cyl(0.045, 0.05, 2.8, x - (i % 2) * 0.03, 1.55, c - 0.14 + i * 0.07, 8), red);
  }
  room.plainBag.box(0x4a1414, 0.12, 0.28, w + 0.8, x + 0.02, 2.98, along);
  room.metalBag.add(cyl(0.015, 0.015, w + 0.9, 0, 0, 0, 6).rotateX(Math.PI / 2).translate(x - 0.06, 2.86, along), 0xb08a3a);
  // Store: durchscheinender Tüll vor der Scheibe
  room.glassBag.box(0x6a6862, 0.01, 1.5, w - 0.04, room.w / 2 - 0.09, 1.9, along);
}

// Zimmerpalme: jeder Wedel steigt erst an und hängt dann über.
function palm(room, x, z) {
  room.plainBag.add(cyl(0.18, 0.14, 0.32, x, 0.16, z, 14), 0x8a4a2a);
  room.plainBag.add(cyl(0.17, 0.17, 0.01, x, 0.3, z, 14), 0x2a1a10);
  room.woodBag.add(cyl(0.02, 0.03, 0.62, x, 0.6, z, 6), 0x4a3a1e);
  const pr = rng(19);
  const L = 0.34;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + pr() * 0.4;
    const rise = -(0.3 + pr() * 0.6);
    const droop = 0.5 + pr() * 0.4;
    const end = new THREE.Vector3(0, -Math.sin(rise) * L, Math.cos(rise) * L);
    for (const [ang, off, w, col] of [[rise, new THREE.Vector3(), 0.09, 0x2a4a22], [droop, end, 0.06, 0x2e5226]]) {
      const seg = box(w, 0.006, L, 0, 0, L / 2);
      seg.rotateX(ang);
      seg.translate(off.x, off.y, off.z);
      seg.rotateY(a);
      seg.translate(x, 0.9, z);
      room.plainBag.add(seg, col);
    }
  }
  room.solid(x, z, 0.4, 0.4);
}

// Petroleumlampe: Messingfuß, Glasbehälter, Zylinder, kleine warme Flamme.
function oilLamp(room, x, y, z) {
  room.metalBag.add(cyl(0.05, 0.065, 0.03, x, y + 0.015, z, 12), 0xb08a3a);
  room.metalBag.add(cyl(0.015, 0.03, 0.12, x, y + 0.09, z, 8), 0xb08a3a);
  room.glassBag.add(new THREE.SphereGeometry(0.06, 12, 8).scale(1, 0.8, 1).translate(x, y + 0.19, z), 0xb89a5a);
  room.metalBag.add(cyl(0.03, 0.035, 0.03, x, y + 0.245, z, 10), 0xb08a3a);
  room.glassBag.add(new THREE.CylinderGeometry(0.022, 0.03, 0.2, 12, 1, true).translate(x, y + 0.36, z), 0xa89e88);
  addMesh(room.scene, new THREE.SphereGeometry(0.012, 6, 4).scale(1, 2, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.5, 0.6) }), x, y + 0.29, z);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('glow'), color: 0xffb060, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.position.set(x, y + 0.3, z);
  s.scale.setScalar(0.35);
  room.scene.add(s);
  room.lamp(x, y + 0.32, z, { intensity: 1.6, range: 6, visible: false, hang: false });
}
