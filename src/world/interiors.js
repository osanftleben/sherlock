import * as THREE from 'three';
import { Location } from '../engine/location.js';
import { Bag, addMesh, box, cyl, merge, std } from './kit.js';
import { clockFace, rng, signTexture, softDisc, wallpaper, wood } from './textures.js';

// Stuben entstehen nach demselben Muster: Raum um den Ursprung, Tür in der Südwand (+Z).
class Room {
  constructor({ id, name, w, d, h = 3.5, wall, floor, ceiling = 0x4a4438, surface = 'wood', ambience = 'interior', ambient = 0.5 }) {
    const loc = (this.loc = new Location(id, name, { ambience, surface }));
    this.w = w;
    this.d = d;
    this.h = h;
    this.woodBag = new Bag();
    this.plainBag = new Bag();
    this.metalBag = new Bag();
    const scene = (this.scene = loc.scene);
    scene.background = new THREE.Color(0x050403);
    scene.add(new THREE.HemisphereLight(0xcdb596, 0x4a3828, ambient * 3));

    const wallMat = std({ ...wall, roughness: 0.95 });
    const wallBag = [
      box(w, h, 0.2, 0, h / 2, -d / 2 - 0.1, 0.5),
      box(w, h, 0.2, 0, h / 2, d / 2 + 0.1, 0.5),
      box(0.2, h, d, -w / 2 - 0.1, h / 2, 0, 0.5),
      box(0.2, h, d, w / 2 + 0.1, h / 2, 0, 0.5),
    ];
    addMesh(scene, merge(wallBag), wallMat);

    const floorMat = std({ ...floor, roughness: 0.6 });
    addMesh(scene, box(w, 0.1, d, 0, -0.05, 0, 0.5), floorMat);
    addMesh(scene, box(w, 0.1, d, 0, h + 0.05, 0), std({ color: ceiling, roughness: 1 }));

    // Fußleiste und Wandfries
    this.woodBag.box(0x4a3020, w, 0.22, 0.04, 0, 0.11, -d / 2 + 0.02);
    this.woodBag.box(0x4a3020, w, 0.22, 0.04, 0, 0.11, d / 2 - 0.02);
    this.woodBag.box(0x4a3020, 0.04, 0.22, d, -w / 2 + 0.02, 0.11, 0);
    this.woodBag.box(0x4a3020, 0.04, 0.22, d, w / 2 - 0.02, 0.11, 0);

    loc.collide(-w / 2 - 1, w / 2 + 1, -d / 2 - 1, -d / 2);
    loc.collide(-w / 2 - 1, w / 2 + 1, d / 2, d / 2 + 1);
    loc.collide(-w / 2 - 1, -w / 2, -d / 2, d / 2);
    loc.collide(w / 2, w / 2 + 1, -d / 2, d / 2);

    // Tür hinaus
    this.woodBag.box(0x3a2416, 1.1, 2.3, 0.08, 0, 1.15, d / 2 - 0.05);
    this.woodBag.box(0x241509, 1.3, 2.45, 0.05, 0, 1.2, d / 2 - 0.02);
    this.metalBag.box(0xb09050, 0.08, 0.08, 0.08, 0.42, 1.05, d / 2 - 0.12);
    loc.addHotspot({ id: 'exit', pos: [0, 1.3, d / 2 - 0.1], radius: 0.8, range: 2.6, label: 'Hinaus auf die Straße', action: { exit: true } });

    loc.spawn = { pos: [0, 0, d / 2 - 1], yaw: 0 };
  }

  solid(x, z, w, d) {
    this.loc.collide(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
  }

  table(x, z, w, d, h = 0.78, color = 0x5a3a22, collide = true) {
    this.woodBag.box(color, w, 0.06, d, x, h, z);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        this.woodBag.box(color, 0.07, h, 0.07, x + (sx * (w - 0.14)) / 2, h / 2, z + (sz * (d - 0.14)) / 2);
      }
    }
    if (collide) this.solid(x, z, w, d);
  }

  chair(x, z, facing = 0, color = 0x4a2e1c) {
    const s = Math.sin(facing);
    const c = Math.cos(facing);
    const back = [x - s * 0.21, z - c * 0.21];
    this.woodBag.box(color, 0.44, 0.05, 0.44, x, 0.46, z);
    for (const a of [-0.19, 0.19]) {
      for (const b of [-0.19, 0.19]) this.woodBag.box(color, 0.05, 0.46, 0.05, x + a, 0.23, z + b);
    }
    this.woodBag.box(color, Math.abs(c) * 0.44 + 0.05, 0.55, Math.abs(s) * 0.44 + 0.05, back[0], 0.76, back[1]);
    this.solid(x, z, 0.5, 0.5);
  }

  armchair(x, z, facing = 0, color = 0x5c2420) {
    const g = new THREE.Group();
    const bag = new Bag();
    bag.box(color, 0.84, 0.42, 0.8, 0, 0.26, 0);
    bag.box(color, 0.84, 0.82, 0.18, 0, 0.82, -0.32);
    bag.box(color, 0.15, 0.58, 0.8, -0.38, 0.52, 0);
    bag.box(color, 0.15, 0.58, 0.8, 0.38, 0.52, 0);
    g.add(new THREE.Mesh(bag.build(), std({ vertexColors: true, roughness: 0.85 })));
    g.position.set(x, 0, z);
    g.rotation.y = facing;
    this.scene.add(g);
    this.solid(x, z, 0.85, 0.85);
  }

  // visible: false ergibt reines Fülllicht ohne sichtbare Lampe.
  lamp(x, y, z, { intensity = 9, color = 0xffb06a, range = 14, glow = 1.0, hang = true, visible = true } = {}) {
    const power = intensity * 2.6;
    const l = new THREE.PointLight(color, power, range, 1.8);
    l.position.set(x, y, z);
    this.scene.add(l);
    if (visible) {
      addMesh(this.scene, new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.5, 0.7) }), x, y, z);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('glow'), color: 0xffb060, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.position.set(x, y, z);
      s.scale.setScalar(glow);
      this.scene.add(s);
    }
    if (hang) {
      this.metalBag.box(0x1a1610, 0.015, this.h - y, 0.015, x, (this.h + y) / 2, z);
      this.metalBag.add(cyl(0.16, 0.3, 0.13, x, y + 0.12, z, 12), 0x25301f);
    }
    const seed = x * 3.1 + z;
    this.loc.onUpdate((dt, t) => {
      l.intensity = power * (0.95 + 0.05 * Math.sin(t * 8 + seed) * Math.sin(t * 3.1 + seed));
    });
    return l;
  }

  window(wall, along, y, w, h) {
    // Fenster bei Nacht: dunkles Glas mit einem Hauch von Laternenlicht.
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.018, 0.028, 0.05) });
    const off = wall === 'east' ? this.w / 2 - 0.05 : -this.w / 2 + 0.05;
    addMesh(this.scene, box(0.02, h, w, off, y, along), mat);
    const bx = wall === 'east' ? off - 0.03 : off + 0.03;
    this.woodBag.box(0x2a1a10, 0.05, h + 0.14, 0.09, bx, y, along - w / 2);
    this.woodBag.box(0x2a1a10, 0.05, h + 0.14, 0.09, bx, y, along + w / 2);
    this.woodBag.box(0x2a1a10, 0.05, 0.08, w, bx, y + h / 2, along);
    this.woodBag.box(0x2a1a10, 0.05, 0.08, w, bx, y - h / 2, along);
    this.woodBag.box(0x2a1a10, 0.05, 0.05, w, bx, y, along);
    this.woodBag.box(0x2a1a10, 0.05, h, 0.05, bx, y, along);
    return { off: bx };
  }

  clock(x, y, z, facing, radius = 0.24, hour = 9, minute = 40) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.03, radius + 0.03, 0.06, 20), std({ color: 0x3a2412, roughness: 0.5 }));
    body.rotation.x = Math.PI / 2;
    g.add(body);
    const face = new THREE.Mesh(new THREE.CircleGeometry(radius, 20), new THREE.MeshStandardMaterial({ map: clockFace(hour, minute), roughness: 0.4, emissive: 0x302a20 }));
    face.position.z = 0.032;
    g.add(face);
    g.position.set(x, y, z);
    g.rotation.y = facing;
    this.scene.add(g);
  }

  // Wanduhr mit schwingendem Pendel.
  regulator(x, y, z, facing, seed = 0) {
    const g = new THREE.Group();
    const bag = new Bag();
    bag.box(0x3a2010, 0.42, 1.2, 0.14, 0, 0, 0);
    bag.box(0x2a1608, 0.5, 0.08, 0.17, 0, 0.62, 0);
    bag.box(0x2a1608, 0.5, 0.08, 0.17, 0, -0.62, 0);
    g.add(new THREE.Mesh(bag.build(), std({ vertexColors: true, roughness: 0.4 })));
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.18, 20), new THREE.MeshStandardMaterial({ map: clockFace(9, 40), emissive: 0x302a20 }));
    face.position.set(0, 0.34, 0.075);
    g.add(face);
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.12, 0.08);
    const brass = std({ color: 0xb59a55, metalness: 0.8, roughness: 0.35 });
    pivot.add(new THREE.Mesh(box(0.012, 0.56, 0.008, 0, -0.28, 0), brass));
    const bob = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16), brass);
    bob.rotation.x = Math.PI / 2;
    bob.position.y = -0.56;
    pivot.add(bob);
    g.add(pivot);
    g.position.set(x, y, z);
    g.rotation.y = facing;
    this.scene.add(g);
    this.loc.onUpdate((dt, t) => {
      pivot.rotation.z = Math.sin(t * 3.14 + seed) * 0.14;
    });
  }

  finish() {
    const woodTex = wood([190, 150, 110], 62);
    if (this.woodBag.parts.length) addMesh(this.scene, this.woodBag.build(), std({ ...woodTex, vertexColors: true, roughness: 0.62 }));
    if (this.plainBag.parts.length) addMesh(this.scene, this.plainBag.build(), std({ vertexColors: true, roughness: 0.8 }));
    if (this.metalBag.parts.length) addMesh(this.scene, this.metalBag.build(), std({ vertexColors: true, roughness: 0.4, metalness: 0.7 }));
    return this.loc;
  }
}

function buildWerkstatt() {
  const room = new Room({
    id: 'werkstatt',
    name: 'Werkstatt Kessler',
    w: 9,
    d: 7,
    h: 3.5,
    wall: wallpaper('#3b3a2c', 'rgba(170,160,110,0.16)', 72),
    floor: wood([96, 62, 38], 63),
    ambience: 'workshop',
    ambient: 0.75,
  });
  const { loc, scene } = room;
  const W = 4.5;

  // Werkbank unter den verkitteten Fenstern
  room.woodBag.box(0x6a4628, 1.0, 0.09, 5.6, W - 0.55, 0.92, 0);
  room.woodBag.box(0x4a2e18, 0.9, 0.86, 0.1, W - 0.55, 0.45, -2.7);
  room.woodBag.box(0x4a2e18, 0.9, 0.86, 0.1, W - 0.55, 0.45, 2.7);
  room.woodBag.box(0x4a2e18, 0.08, 0.5, 5.4, W - 0.1, 0.65, 0);
  room.solid(W - 0.55, 0, 1.0, 5.6);
  for (const z of [-1.5, 1.5]) {
    room.window('east', z, 2.1, 1.3, 1.6);
    // Papierstreifen in den Fensterfugen, gegen den Winter
    for (const dz of [-0.65, 0.65]) room.plainBag.box(0xd4c9a4, 0.01, 1.6, 0.05, W - 0.09, 2.1, z + dz);
    for (const dy of [-0.8, 0.8]) room.plainBag.box(0xd4c9a4, 0.01, 0.05, 1.3, W - 0.09, 2.1 + dy, z);
  }
  // Kleinkram auf der Werkbank
  const r = rng(144);
  for (let i = 0; i < 14; i++) {
    const x = W - 0.9 + r() * 0.7;
    const z = -2.5 + r() * 5;
    if (Math.abs(z + 1.6) < 0.4 || Math.abs(z - 0.2) < 0.4) continue;
    const g = new THREE.CylinderGeometry(0.025, 0.025, 0.012, 12);
    g.translate(x, 0.975, z);
    room.metalBag.add(g, r() > 0.5 ? 0xb59a55 : 0x8a8a8a);
  }
  room.metalBag.add(cyl(0.012, 0.016, 0.3, W - 0.3, 1.1, 1.1, 8), 0x1a1a1a);

  // Reparaturbuch und Löschblatt
  room.plainBag.box(0x20140c, 0.42, 0.05, 0.3, W - 0.55, 0.99, -1.6);
  room.plainBag.box(0xd9cfb4, 0.4, 0.012, 0.28, W - 0.55, 1.02, -1.6);
  room.plainBag.box(0x25282e, 0.3, 0.05, 0.2, W - 0.55, 0.985, 0.2);
  room.plainBag.box(0xcab7a9, 0.28, 0.008, 0.18, W - 0.55, 1.012, 0.2);
  loc.anchor('ledger', W - 0.55, 1.03, -1.6);
  loc.anchor('blotter', W - 0.55, 1.03, 0.2);

  // Blendlaterne der Polizei gibt das Licht: Das Gas ist abgestellt.
  room.lamp(W - 1.15, 1.08, 1.9, { intensity: 5.5, range: 11, glow: 0.7, hang: false });
  room.metalBag.add(cyl(0.1, 0.12, 0.2, W - 1.15, 1.02, 1.9, 10), 0x1a1a1a);
  room.lamp(-1.2, 2.6, -0.6, { intensity: 4.5, range: 12, hang: false, visible: false, color: 0xffc080 });

  // Sessel des Toten, Besucherstuhl, Beistelltisch
  room.armchair(-0.6, -1.3, 0.6);
  room.chair(1.3, -0.55, -1.8);
  room.table(0.45, -1.75, 0.6, 0.6, 0.62);
  room.plainBag.add(cyl(0.05, 0.035, 0.07, 0.45, 0.69, -1.75, 12), 0xe4dcc8);
  room.plainBag.add(cyl(0.08, 0.08, 0.012, 0.45, 0.655, -1.75, 14), 0xe4dcc8);
  loc.anchor('cup', 0.45, 0.72, -1.75);

  // Asche am Boden neben dem Besucherstuhl
  for (let i = 0; i < 12; i++) {
    const a = r() * 6.28;
    const d = r() * 0.07;
    room.plainBag.box(0xcfcfca, 0.018 + r() * 0.02, 0.006, 0.018 + r() * 0.02, 1.5 + Math.cos(a) * d, 0.006, -0.2 + Math.sin(a) * d);
  }
  loc.anchor('ash', 1.5, 0.15, -0.2);

  // Gaswandarm über dem Sessel
  const bracket = new Bag();
  bracket.box(0xa58a4a, 0.08, 0.18, 0.05, -2.0, 2.15, -3.47);
  bracket.box(0xa58a4a, 0.04, 0.04, 0.42, -2.0, 2.15, -3.25);
  bracket.add(cyl(0.012, 0.02, 0.12, -2.0, 2.22, -3.03, 8), 0xa58a4a);
  bracket.box(0xc4a858, 0.1, 0.022, 0.022, -2.0, 2.15, -3.2);
  addMesh(scene, bracket.build(), std({ vertexColors: true, metalness: 0.8, roughness: 0.35 }));
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 0.16, 14, 1, true), std({ color: 0xd0cbb8, roughness: 0.3, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
  shade.position.set(-2.0, 2.34, -3.03);
  scene.add(shade);
  loc.anchor('gas', -2.0, 2.15, -3.15);

  // Hakenbrett mit Reparaturzetteln, Nr. 17 fehlt.
  const bx = 1.4;
  const by = 1.85;
  const bz = -3.46;
  room.woodBag.box(0x3a2412, 2.5, 1.5, 0.05, bx, by, bz);
  const cols = 6;
  const rows = 4;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const num = row * cols + col + 1;
      const x = bx - 1.0 + col * 0.4;
      const y = by + 0.5 - row * 0.36;
      room.metalBag.box(0xb59a55, 0.015, 0.05, 0.04, x, y, bz + 0.04);
      if (num === 17) continue;
      if (r() < 0.72) {
        room.plainBag.box(0xcfc6a6, 0.08, 0.1, 0.006, x, y - 0.08, bz + 0.065);
        const w = new THREE.CylinderGeometry(0.035, 0.035, 0.012, 14);
        w.rotateX(Math.PI / 2);
        w.translate(x + 0.1, y - 0.08, bz + 0.065);
        room.metalBag.add(w, r() > 0.6 ? 0xb59a55 : 0x9a9a9a);
      }
    }
  }
  loc.anchor('hooks', bx, by, bz + 0.1);
  const emptyHook = new THREE.Mesh(
    new THREE.PlaneGeometry(0.1, 0.1),
    new THREE.MeshBasicMaterial({ map: signTexture('17', { width: 128, height: 128, bg: '#3a2412', fg: '#d8c98a', border: false, font: '"EB Garamond", serif', size: 90 }) }),
  );
  emptyHook.position.set(bx - 1.0 + 4 * 0.4, by + 0.5 - 2 * 0.36 + 0.08, bz + 0.03);
  scene.add(emptyHook);

  // Uhrenwand im Westen
  let n = 0;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      const z = -2.6 + col * 1.3 + (row % 2) * 0.35;
      const y = 1.25 + row * 0.8;
      if (z > 2.9) continue;
      if ((row + col) % 3 === 0) room.regulator(-W + 0.09, y, z, Math.PI / 2, n);
      else room.clock(-W + 0.05, y, z, Math.PI / 2, 0.17 + (n % 3) * 0.05, 9, 39 + (n % 3));
      n++;
    }
  }
  loc.anchor('clocks', -W + 0.2, 1.8, 0);
  room.woodBag.box(0x3a2010, 0.4, 2.15, 0.5, -3.3, 1.08, -3.1);
  room.clock(-3.3, 1.72, -2.84, 0, 0.17);
  room.solid(-3.3, -3.1, 0.4, 0.5);

  // Geschirrbord an der Südwand: eine Tasse blitzt sauber.
  const sx = 3.2;
  const sy = 1.55;
  const sz = 3.3;
  room.woodBag.box(0x4a2e1a, 1.5, 0.05, 0.28, sx, sy, sz);
  room.woodBag.box(0x4a2e1a, 1.5, 0.05, 0.28, sx, sy + 0.5, sz);
  for (const x of [-0.55, -0.3, 0.05, 0.4]) {
    room.plainBag.add(cyl(0.05, 0.035, 0.07, sx + x, sy + 0.06, sz, 12), x === 0.05 ? 0xf8f4e6 : 0x8c8674);
  }
  room.plainBag.box(0x7a7464, 0.3, 0.1, 0.2, sx, sy + 0.58, sz);
  loc.anchor('shelf', sx + 0.05, sy + 0.08, sz);

  // Eiserner Ofen
  room.metalBag.add(cyl(0.3, 0.33, 1.4, -3.7, 0.7, 2.7, 16), 0x1a1a1c);
  room.metalBag.add(cyl(0.08, 0.08, 2.1, -3.7, 2.45, 2.7, 10), 0x1a1a1c);
  room.solid(-3.7, 2.7, 0.66, 0.66);

  // Ladentresen, teilt den Raum nicht ganz.
  room.woodBag.box(0x5a3a22, 2.8, 1.0, 0.6, -2.3, 0.5, 1.3);
  room.solid(-2.3, 1.3, 2.8, 0.6);
  room.plainBag.box(0x1a1208, 0.5, 0.02, 0.4, -2.0, 1.01, 1.3);

  loc.anchor('window', W - 0.15, 2.1, 1.5);
  return room.finish();
}

function buildApotheke() {
  const room = new Room({
    id: 'apotheke',
    name: 'Apotheke zum Schwarzen Adler',
    w: 7,
    d: 5.6,
    wall: wallpaper('#26352c', 'rgba(150,180,130,0.12)', 73),
    floor: wood([70, 48, 32], 64),
    ambient: 0.6,
  });
  const { loc, scene } = room;
  const r = rng(233);
  // Offizin-Regal mit Standgefäßen
  room.woodBag.box(0x3a2412, 6.8, 3.0, 0.3, 0, 1.5, -2.65);
  const jarGeo = cyl(0.07, 0.08, 0.2, 0, 0, 0, 10);
  const jars = new THREE.InstancedMesh(jarGeo, std({ roughness: 0.25 }), 120);
  const lids = new THREE.InstancedMesh(cyl(0.04, 0.06, 0.05, 0, 0.12, 0, 10), std({ color: 0x1a1a1c, roughness: 0.3 }), 120);
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  const palette = [0xdcd5c0, 0xdcd5c0, 0x38503a, 0x6a2820, 0x20304a, 0x8a6a30];
  for (let row = 0; row < 5; row++) {
    room.woodBag.box(0x2a1608, 6.6, 0.04, 0.3, 0, 0.62 + row * 0.5, -2.42);
    for (let col = 0; col < 24; col++) {
      const i = row * 24 + col;
      m.makeTranslation(-3.1 + col * 0.27, 0.74 + row * 0.5, -2.42);
      jars.setMatrixAt(i, m);
      lids.setMatrixAt(i, m);
      jars.setColorAt(i, c.set(palette[Math.floor(r() * palette.length)]));
    }
  }
  scene.add(jars, lids);
  // Rezeptur-Tresen
  room.woodBag.box(0x4a2e18, 5, 1.0, 0.7, -0.4, 0.5, -0.8);
  room.woodBag.box(0x6a4628, 5.1, 0.05, 0.8, -0.4, 1.02, -0.8);
  room.solid(-0.4, -0.8, 5, 0.7);
  loc.collide(2.1, 3.5, -2.6, -1.1);
  room.plainBag.box(0x20140c, 0.4, 0.05, 0.3, 0.8, 1.07, -0.8);
  room.plainBag.box(0xd9cfb4, 0.38, 0.012, 0.28, 0.8, 1.1, -0.8);
  loc.anchor('rezeptbuch', 0.8, 1.15, -0.8);
  // Waage
  room.metalBag.box(0xb59a55, 0.02, 0.4, 0.02, -1.3, 1.24, -0.8);
  room.metalBag.box(0xb59a55, 0.5, 0.015, 0.015, -1.3, 1.44, -0.8);
  room.metalBag.add(cyl(0.07, 0.07, 0.01, -1.55, 1.25, -0.8, 12), 0xb59a55);
  room.metalBag.add(cyl(0.07, 0.07, 0.01, -1.05, 1.25, -0.8, 12), 0xb59a55);
  // Farbkugeln, das Zeichen der Apotheke
  for (const [x, col] of [[-2.2, new THREE.Color(0.1, 1.3, 0.3)], [2.2, new THREE.Color(1.4, 0.15, 0.1)]]) {
    addMesh(scene, new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshBasicMaterial({ color: col }), x, 1.3, -0.8);
    const p = new THREE.PointLight(col, 1.2, 4, 2);
    p.position.set(x, 1.5, -0.6);
    scene.add(p);
  }
  room.lamp(0, 2.6, 0.5, { intensity: 10, glow: 1 });
  loc.anchor('seidel', -0.6, 0, -1.55, 0);
  loc.anchor('jars', 0, 1.7, -2.3);
  room.chair(-2.7, 1.7, Math.PI / 2);
  return room.finish();
}

function buildDestille() {
  const room = new Room({
    id: 'destille',
    name: 'Destille „Zur Goldenen Schrippe“',
    w: 11,
    d: 8,
    h: 3.2,
    wall: wallpaper('#3c2a1e', 'rgba(120,80,50,0.12)', 74),
    floor: wood([60, 42, 28], 65),
    ceiling: 0x282018,
    ambient: 0.55,
  });
  const { loc, scene } = room;
  const r = rng(377);
  // Theke
  room.woodBag.box(0x4a2c18, 5.2, 1.08, 0.7, -2.4, 0.54, -2.3);
  room.woodBag.box(0x7a5430, 5.3, 0.06, 0.85, -2.4, 1.1, -2.3);
  room.metalBag.box(0xa58a4a, 5.2, 0.03, 0.03, -2.4, 0.2, -1.92);
  room.solid(-2.4, -2.3, 5.2, 0.7);
  loc.collide(0.2, 0.9, -4, -2.6);
  // Flaschenregal
  room.woodBag.box(0x2a1a0e, 5.4, 2.0, 0.22, -2.4, 1.9, -3.86);
  const bottleGeo = merge([cyl(0.04, 0.045, 0.2, 0, 0, 0, 8), cyl(0.014, 0.03, 0.09, 0, 0.14, 0, 8)]);
  const bottles = new THREE.InstancedMesh(bottleGeo, std({ roughness: 0.15 }), 60);
  const m = new THREE.Matrix4();
  const col = new THREE.Color();
  const tones = [0x20402a, 0x4a2a10, 0x6a4a1a, 0x7a2a20, 0xc0b88a];
  for (let i = 0; i < 60; i++) {
    m.makeTranslation(-4.9 + (i % 20) * 0.26, 1.2 + Math.floor(i / 20) * 0.6, -3.72);
    bottles.setMatrixAt(i, m);
    bottles.setColorAt(i, col.set(tones[Math.floor(r() * tones.length)]));
  }
  scene.add(bottles);
  for (let s = 0; s < 3; s++) room.woodBag.box(0x4a2c18, 5.4, 0.03, 0.2, -2.4, 1.09 + s * 0.6, -3.72);
  // Fass und Bierhahn
  const barrel = cyl(0.42, 0.42, 1.0, 0, 0, 0, 16);
  barrel.rotateX(Math.PI / 2);
  barrel.translate(-4.6, 1.55, -2.45);
  room.woodBag.add(barrel, 0x5a3a1e);
  // Tische
  const tables = [[3, -1.8], [3.3, 1.7], [-1.8, 1.4]];
  for (const [x, z] of tables) {
    room.woodBag.add(cyl(0.48, 0.48, 0.05, x, 0.8, z, 16), 0x5a3a22);
    room.woodBag.add(cyl(0.06, 0.08, 0.78, x, 0.39, z, 8), 0x3a2412);
    room.woodBag.add(cyl(0.25, 0.3, 0.03, x, 0.02, z, 12), 0x3a2412);
    room.solid(x, z, 0.8, 0.8);
    for (let i = 0; i < 2; i++) {
      room.plainBag.add(cyl(0.035, 0.03, 0.13, x + (r() - 0.5) * 0.4, 0.89, z + (r() - 0.5) * 0.4, 8), 0xc29a4a);
    }
  }
  // Spielkarten auf Rathens Tisch
  for (let i = 0; i < 7; i++) {
    room.plainBag.box(i % 2 ? 0xe6dfcc : 0x7a1f1c, 0.06, 0.003, 0.09, 3.3 + (r() - 0.5) * 0.45, 0.83, 1.7 + (r() - 0.5) * 0.4);
  }
  room.chair(4, 1.7, -Math.PI / 2);
  room.chair(3.3, 2.6, Math.PI);
  room.chair(-1.8, 2.3, Math.PI);
  room.chair(-2.8, 1.4, Math.PI / 2);
  // Ofen
  room.metalBag.add(cyl(0.35, 0.38, 1.6, 4.9, 0.8, -3.2, 14), 0x1a1a1c);
  room.solid(4.9, -3.2, 0.74, 0.74);
  const ember = new THREE.PointLight(0xff5a1a, 1.8, 5, 2);
  ember.position.set(4.7, 0.5, -2.9);
  scene.add(ember);
  loc.onUpdate((dt, t) => { ember.intensity = 1.5 + Math.sin(t * 5) * Math.sin(t * 2.3) * 0.5; });
  // Fenster und Lampen
  room.window('east', 0.2, 1.8, 1.5, 1.5);
  room.lamp(-2.4, 2.45, -1.6, { intensity: 7 });
  room.lamp(3, 2.45, -0.4, { intensity: 6 });
  loc.anchor('kluge', -3.2, 0, -3.05, 0);
  loc.anchor('brandt', 2.4, 0, -2.4, 0.5);
  loc.anchor('rathen', 2.5, 0, 1.6, Math.PI / 2);
  loc.anchor('gast1', -2.6, 0, 0.9, 0.6);
  loc.anchor('gast2', -1.0, 0, 1.0, -0.8);
  return room.finish();
}

function buildBank() {
  const room = new Room({
    id: 'bank',
    name: 'Bankhaus Lindner & Sohn',
    w: 9,
    d: 7,
    h: 3.8,
    wall: wallpaper('#2c2a26', 'rgba(170,150,100,0.1)', 75),
    floor: wood([86, 50, 30], 66),
    ceiling: 0x3a3428,
    ambient: 0.62,
  });
  const { loc, scene } = room;
  // Vertäfelung
  for (const [w, d, x, z] of [[9, 0.05, 0, -3.47], [0.05, 7, -4.47, 0], [0.05, 7, 4.47, 0]]) {
    room.woodBag.box(0x3a2010, w, 1.3, d, x, 0.65, z);
    room.woodBag.box(0x2a1608, w === 9 ? 9 : 0.08, 0.08, d === 7 ? 7 : 0.08, x, 1.33, z);
  }
  // Schreibtisch
  room.woodBag.box(0x4a2a16, 2.6, 0.82, 1.1, 0, 0.41, -1.3);
  room.woodBag.box(0x6a3e20, 2.7, 0.05, 1.2, 0, 0.84, -1.3);
  room.solid(0, -1.3, 2.7, 1.2);
  room.chair(0, -2.5, 0, 0x3a1a14);
  room.chair(-0.6, 0.0, Math.PI);
  // Papiere, Tintenfass, Zigarrenkiste, Aschenbecher
  room.plainBag.box(0xd9cfb4, 0.4, 0.012, 0.3, -0.5, 0.875, -1.25);
  room.plainBag.box(0xcfc4a4, 0.3, 0.02, 0.22, -0.8, 0.885, -1.5);
  room.plainBag.add(cyl(0.04, 0.05, 0.07, 0.36, 0.905, -1.58, 10), 0x101014);
  room.woodBag.box(0x7a4a22, 0.34, 0.09, 0.22, 0.8, 0.915, -1.2);
  room.plainBag.box(0xc9a24a, 0.28, 0.005, 0.16, 0.8, 0.962, -1.2);
  room.plainBag.add(cyl(0.09, 0.07, 0.03, 0.4, 0.88, -1.0, 14), 0x6a6a6a);
  room.plainBag.add(cyl(0.05, 0.05, 0.015, 0.4, 0.9, -1.0, 12), 0xd8d8d2);
  loc.anchor('zigarren', 0.8, 0.98, -1.2);
  // Grüne Bankerlampe. Ihr Licht fällt als Kegel auf die Platte: Ein Punktlicht strahlte ohne Schatten
  // auch Wendts Weste gleich daneben an und überstrahlte genau dort die Uhrkette. Sie steht so weit links,
  // dass Wendts Arm beim Griff zum Federhalter nicht dicht an der Glühbirne vorbeistreicht und ausbrennt.
  room.metalBag.add(cyl(0.06, 0.09, 0.02, -0.35, 0.875, -1.7, 12), 0xb59a55);
  room.metalBag.add(cyl(0.012, 0.012, 0.32, -0.35, 1.03, -1.7, 8), 0xb59a55);
  const shadeGeo = cyl(0.05, 0.13, 0.12, -0.35, 1.22, -1.7, 12);
  addMesh(scene, shadeGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.7, 0.3) }));
  const desk = new THREE.SpotLight(0xffd090, 6, 7, 0.95, 0.6, 2);
  desk.position.set(-0.35, 1.17, -1.7);
  desk.target.position.set(-0.15, 0.86, -1.55);
  scene.add(desk, desk.target);
  // Federhalter vor dem Tintenfass: Danach greift Wendt, statt seine Uhr hervorzuziehen. Er liegt so weit
  // vorn, wie Wendts Hand über die Tischkante reicht.
  const penRod = (r, a, b) => {
    const from = new THREE.Vector3(...a);
    const dir = new THREE.Vector3(...b).sub(from);
    const len = dir.length();
    const g = new THREE.CylinderGeometry(r, r, len, 6);
    g.translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
    g.translate(from.x, from.y, from.z);
    return g;
  };
  room.plainBag.add(penRod(0.0055, [0.05, 0.871, -1.665], [0.2, 0.871, -1.61]), 0x141012);
  room.metalBag.add(penRod(0.0035, [0.2, 0.871, -1.61], [0.2225, 0.871, -1.602]), 0xc9a24a);
  // Tresor
  room.metalBag.box(0x1c2024, 1.3, 2.1, 0.9, 3.5, 1.05, -2.9);
  room.metalBag.box(0x2a2f34, 1.15, 1.95, 0.05, 3.5, 1.05, -2.43);
  room.metalBag.add((() => {
    const g = new THREE.CylinderGeometry(0.15, 0.15, 0.06, 16);
    g.rotateX(Math.PI / 2);
    g.translate(3.5, 1.2, -2.39);
    return g;
  })(), 0xb59a55);
  room.solid(3.5, -2.9, 1.3, 0.9);
  loc.anchor('tresor', 3.5, 1.3, -2.4);
  // Akten
  room.woodBag.box(0x2a1608, 2.8, 2.5, 0.4, -2.9, 1.25, -3.25);
  room.solid(-2.9, -3.25, 2.8, 0.4);
  for (let s = 0; s < 4; s++) {
    for (let i = 0; i < 12; i++) {
      room.plainBag.box(i % 3 ? 0x3a2a1c : 0x4a1c18, 0.2, 0.4, 0.05 + 0.25, -4.15 + i * 0.22, 0.45 + s * 0.58, -3.04);
    }
  }
  // Die große Wanduhr, nach der Wendt die Zeit abliest.
  room.regulator(0, 2.4, -3.42, 0, 1);
  loc.anchor('wanduhr', 0, 2.4, -3.3);
  room.window('east', 0.8, 2.1, 1.3, 1.9);
  room.window('west', 0.8, 2.1, 1.3, 1.9);
  room.lamp(0, 3.0, 1.2, { intensity: 6, glow: 0.9 });
  loc.anchor('wendt', 0.2, 0, -2.0, 0);
  return room.finish();
}

function buildPension() {
  const room = new Room({
    id: 'pension',
    name: 'Pension Puhlmann',
    w: 8,
    d: 6.5,
    h: 3.3,
    wall: wallpaper('#4a2c2a', 'rgba(200,160,100,0.17)', 76),
    floor: wood([92, 60, 36], 67),
    ceiling: 0x5a5244,
    ambient: 0.5,
  });
  const { loc, scene } = room;
  // Kamin an der Nordwand mit Feuerschein
  const fx = 1.2;
  room.plainBag.box(0x3a3632, 2.1, 1.5, 0.5, fx, 0.75, -3.0);
  room.plainBag.box(0x0a0806, 1.0, 0.9, 0.1, fx, 0.5, -2.74);
  room.plainBag.box(0x4a4640, 2.4, 0.1, 0.65, fx, 1.53, -2.98);
  room.solid(fx, -3.0, 2.1, 0.5);
  const fire = new THREE.PointLight(0xff7a2c, 6, 8, 1.8);
  fire.position.set(fx, 0.55, -2.4);
  scene.add(fire);
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('glow'), color: 0xff8a30, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  flame.position.set(fx, 0.45, -2.3);
  scene.add(flame);
  loc.onUpdate((dt, t) => {
    fire.intensity = 5.5 + 1.6 * Math.sin(t * 7.1) * Math.sin(t * 3.3) + 0.8 * Math.sin(t * 13);
    flame.scale.setScalar(0.6 + 0.08 * Math.sin(t * 9));
  });
  // Auf dem Sims: Kaminuhr und der persische Pantoffel
  room.clock(fx - 0.7, 1.74, -2.95, 0, 0.14);
  room.plainBag.box(0x7a2a24, 0.26, 0.09, 0.1, fx + 0.5, 1.63, -2.9);
  room.plainBag.box(0x7a2a24, 0.1, 0.13, 0.1, fx + 0.6, 1.65, -2.9);
  loc.anchor('pantoffel', fx + 0.5, 1.7, -2.9);
  // Sessel am Kamin
  room.armchair(-0.2, -1.5, 0.9);
  room.armchair(2.8, -1.5, -0.9, 0x253a2c);
  // Teppich
  addMesh(scene, box(3.5, 0.01, 2.6, 1.2, 0.006, -0.9), std({ color: 0x4a1c18, roughness: 1 }));
  // Experimentiertisch mit Kolben im Westen
  room.table(-3.3, -1.4, 0.9, 2.4, 0.82);
  const glass = std({ color: 0x9fc2b4, roughness: 0.1, transparent: true, opacity: 0.55 });
  for (const [z, s] of [[-2.2, 0.8], [-1.6, 1.1], [-0.9, 0.7]]) {
    addMesh(scene, new THREE.SphereGeometry(0.1 * s, 12, 10), glass, -3.3, 0.96, z);
    addMesh(scene, cyl(0.025, 0.03, 0.2, -3.3, 1.12, z, 8), glass);
  }
  room.metalBag.add(cyl(0.05, 0.05, 0.12, -3.2, 0.91, -0.4, 10), 0x8a8a8a);
  const burner = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('glow'), color: 0x5a9aff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  burner.position.set(-3.2, 1.03, -0.4);
  burner.scale.set(0.08, 0.16, 1);
  scene.add(burner);
  loc.anchor('labor', -3.3, 1.1, -1.4);
  // Violine auf dem kleinen Tisch
  room.table(3.2, 1.4, 0.8, 0.8, 0.72);
  const violinBody = new THREE.SphereGeometry(0.11, 12, 8);
  violinBody.scale(1, 0.25, 1.7);
  violinBody.translate(3.2, 0.78, 1.45);
  room.woodBag.add(violinBody, 0x8a4a1c);
  room.plainBag.box(0x101010, 0.05, 0.02, 0.32, 3.2, 0.785, 1.12);
  room.woodBag.box(0x4a2810, 0.015, 0.012, 0.65, 3.05, 0.775, 1.5);
  loc.anchor('violine', 3.2, 0.82, 1.4);
  // Bücher
  room.woodBag.box(0x3a2412, 2.0, 2.4, 0.4, -2.6, 1.2, 2.95);
  room.solid(-2.6, 2.95, 2.0, 0.4);
  const r = rng(610);
  for (let s = 0; s < 5; s++) {
    for (let i = 0; i < 14; i++) {
      room.plainBag.box([0x5a1e1a, 0x24321e, 0x1a2a3e, 0x6a4a22, 0x3a2a1c][Math.floor(r() * 5)], 0.11, 0.3 + r() * 0.1, 0.25, -3.4 + i * 0.125, 0.33 + s * 0.46, 2.72);
    }
  }
  loc.anchor('buecher', -2.6, 1.3, 2.75);
  room.window('east', -0.8, 1.9, 1.2, 1.6);
  room.lamp(0.4, 2.85, 0.2, { intensity: 6 });
  loc.anchor('voss', -1.9, 0, -0.4, 1.2);
  loc.anchor('martha', 1.1, 0, -0.4, 0);
  loc.spawn = { pos: [0, 0, 1.9], yaw: 0 };
  return room.finish();
}

export function buildInteriors() {
  return [buildPension(), buildWerkstatt(), buildApotheke(), buildDestille(), buildBank()];
}
