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
    ambient: 0.6,
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

  // Das Gas ist abgestellt. Licht geben die Blendlaterne der Polizei, die auf den Sessel
  // gerichtet ist, ein schwaches Fülllicht und die Straßenlaterne vor dem Fenster.
  policeLantern(room, [W - 0.75, 0.965, 2.05], [-0.6, 0.55, -1.3]);
  room.lamp(-1.2, 2.6, -0.6, { intensity: 3.2, range: 12, hang: false, visible: false, color: 0xffc080 });
  streetGlow(room, [W + 0.4, 2.9, 1.5], [2.2, 0, 0.6]);

  // Tatort: Ohrensessel des Toten auf dem Teppich, Besucherstuhl, Beistelltisch
  rug(room, -0.55, -1.3, 2.4, 1.8, 0x4a1c1a, 0x8a6a3a);
  wingChair(room, -0.6, -1.3, 0.6);
  room.chair(1.3, -0.55, -1.8);
  room.table(0.45, -1.75, 0.6, 0.6, 0.62);
  room.plainBag.add(cyl(0.05, 0.035, 0.07, 0.45, 0.69, -1.75, 12), 0xe4dcc8);
  room.plainBag.add(cyl(0.08, 0.08, 0.012, 0.45, 0.655, -1.75, 14), 0xe4dcc8);
  loc.anchor('cup', 0.45, 0.72, -1.75);
  // Kesslers Brille neben der Tasse, die Zeitung ist ihm vom Schoß gerutscht.
  for (const dx of [-0.032, 0.032]) {
    const lens = new THREE.TorusGeometry(0.024, 0.003, 4, 14);
    lens.rotateX(-Math.PI / 2);
    lens.translate(0.62 + dx, 0.655, -1.58);
    room.metalBag.add(lens, 0x9a9ca2);
  }
  room.metalBag.box(0x9a9ca2, 0.02, 0.004, 0.004, 0.62, 0.656, -1.58);
  for (const [x, z, a, c] of [[-1.15, -0.45, 0.4, 0xd8d0b8], [-1.0, -0.38, -0.25, 0xcfc6ac]]) {
    const sheet = box(0.44, 0.004, 0.31, 0, 0, 0);
    sheet.rotateY(a);
    sheet.translate(x, 0.014, z);
    room.plainBag.add(sheet, c);
  }

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

  // Eiserner Ofen mit Teekessel
  room.metalBag.add(cyl(0.3, 0.33, 1.4, -3.7, 0.7, 2.7, 16), 0x1a1a1c);
  room.metalBag.add(cyl(0.08, 0.08, 2.1, -3.7, 2.45, 2.7, 10), 0x1a1a1c);
  room.metalBag.add(cyl(0.32, 0.32, 0.04, -3.7, 1.42, 2.7, 16), 0x111112);
  kettle(room, -3.62, 1.44, 2.66);
  room.solid(-3.7, 2.7, 0.66, 0.66);

  // Gasleitung vom Wandarm hinauf und an der Decke entlang zum Flur
  room.metalBag.add(cyl(0.012, 0.012, 1.2, -2.0, 2.82, -3.47, 6), 0x7a6a40);
  const pipe = cyl(0.012, 0.012, 2.45, 0, 0, 0, 6);
  pipe.rotateZ(Math.PI / 2);
  pipe.translate(-3.22, 3.42, -3.47);
  room.metalBag.add(pipe, 0x7a6a40);

  // Ladentresen mit Vitrine, teilt den Raum nicht ganz.
  shopCounter(room, -2.3, 1.3);

  workbenchTools(room, W, r);

  loc.anchor('window', W - 0.15, 2.1, 1.5);
  return room.finish();
}

// --- Ausstattung der Werkstatt ---------------------------------------------------

function rug(room, x, z, w, d, base, border) {
  room.plainBag.box(base, w, 0.008, d, x, 0.004, z);
  const b = 0.1;
  room.plainBag.box(border, w, 0.009, b, x, 0.0045, z - d / 2 + b);
  room.plainBag.box(border, w, 0.009, b, x, 0.0045, z + d / 2 - b);
  room.plainBag.box(border, b, 0.009, d - 2 * b, x - w / 2 + b, 0.0045, z);
  room.plainBag.box(border, b, 0.009, d - 2 * b, x + w / 2 - b, 0.0045, z);
}

// Ohrensessel: gepolstert, gerollte Armlehnen, geknöpfte Lehne; eine Decke ist halb
// heruntergerutscht. Blickrichtung +Z vor der Drehung.
function wingChair(room, x, z, facing) {
  const cloth = 0x5c2420;
  const dark = 0x3e1714;
  const legWood = 0x2a1608;
  const bag = new Bag();
  for (const sx of [-0.33, 0.33]) for (const sz of [-0.3, 0.3]) bag.add(cyl(0.028, 0.02, 0.12, sx, 0.06, sz, 8), legWood);
  bag.box(cloth, 0.8, 0.26, 0.76, 0, 0.25, 0);
  bag.box(0x6a2a24, 0.6, 0.12, 0.62, 0, 0.43, 0.05);
  const roll = cyl(0.06, 0.06, 0.6, 0, 0, 0, 12);
  roll.rotateZ(Math.PI / 2);
  roll.translate(0, 0.43, 0.36);
  bag.add(roll, 0x6a2a24);
  const back = box(0.78, 0.82, 0.16, 0, 0, 0);
  back.rotateX(-0.12);
  back.translate(0, 0.86, -0.31);
  bag.add(back, cloth);
  const pad = box(0.58, 0.56, 0.07, 0, 0, 0);
  pad.rotateX(-0.12);
  pad.translate(0, 0.83, -0.21);
  bag.add(pad, 0x6a2a24);
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
  const plaid = 0x3e4a32;
  const top = box(0.5, 0.014, 0.4, 0, 0, 0);
  top.rotateX(0.18);
  top.translate(0.06, 0.5, 0.12);
  bag.add(top, plaid);
  const fall = box(0.52, 0.42, 0.014, 0, 0, 0);
  fall.rotateX(-0.25);
  fall.translate(0.08, 0.27, 0.44);
  bag.add(fall, plaid);
  const floorPart = box(0.62, 0.014, 0.42, 0, 0, 0);
  floorPart.rotateY(0.3);
  floorPart.translate(0.16, 0.018, 0.72);
  bag.add(floorPart, plaid);
  for (const dz of [-0.12, 0, 0.12]) bag.box(0x6a3a24, 0.62, 0.016, 0.02, 0.16, 0.026, 0.72 + dz);

  const mesh = new THREE.Mesh(bag.build(), std({ vertexColors: true, roughness: 0.88 }));
  mesh.position.set(x, 0, z);
  mesh.rotation.y = facing;
  room.scene.add(mesh);
  room.solid(x, z, 0.85, 0.85);
}

// Blendlaterne der Polizei auf der Werkbank, ihr Kegel fällt auf den Sessel.
// Im Kegel tanzt Staub.
function policeLantern(room, [lx, ly, lz], [tx, ty, tz]) {
  const { scene, loc } = room;
  const from = new THREE.Vector3(lx, ly + 0.13, lz);
  const to = new THREE.Vector3(tx, ty, tz);
  const dir = to.clone().sub(from).normalize();
  const yaw = Math.atan2(dir.x, dir.z);

  const body = new Bag();
  body.add(cyl(0.075, 0.08, 0.22, 0, 0.11, 0, 14), 0x16181a);
  body.add(cyl(0.03, 0.04, 0.08, 0, 0.26, 0, 8), 0x16181a);
  body.add(cyl(0.05, 0.05, 0.02, 0, 0.31, 0, 8), 0x16181a);
  const hood = cyl(0.055, 0.06, 0.06, 0, 0, 0, 14);
  hood.rotateX(Math.PI / 2);
  hood.translate(0, 0.13, 0.085);
  body.add(hood, 0x16181a);
  const lantern = new THREE.Mesh(body.build(), std({ vertexColors: true, metalness: 0.6, roughness: 0.45 }));
  lantern.position.set(lx, ly, lz);
  lantern.rotation.y = yaw;
  scene.add(lantern);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.048, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.3, 1.6) }));
  lens.position.set(0, 0.13, 0.116);
  lantern.add(lens);

  const spot = new THREE.SpotLight(0xffc488, 38, 14, 0.3, 0.55, 1.4);
  spot.position.copy(from).addScaledVector(dir, 0.12);
  spot.target.position.copy(to);
  scene.add(spot, spot.target);
  // Etwas Streulicht um die Laterne selbst
  const fill = new THREE.PointLight(0xffb070, 2.5, 3.5, 1.8);
  fill.position.copy(from).addScaledVector(dir, 0.2);
  scene.add(fill);

  // Sichtbarer Lichtkegel: additive, zum Ende hin ausgeblendet.
  const len = from.distanceTo(to) + 0.6;
  const radius = Math.tan(0.3) * len;
  const cone = new THREE.ConeGeometry(radius, len, 28, 6, true);
  const pos = cone.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const k = (pos.getY(i) + len / 2) / len;
    const v = 0.05 + 0.95 * k ** 2;
    colors.set([v * 1.0, v * 0.78, v * 0.52], i * 3);
  }
  cone.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const beam = new THREE.Mesh(cone, new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.035, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  }));
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  beam.position.copy(from).addScaledVector(dir, len / 2 + 0.1);
  scene.add(beam);

  // Staub im Kegel
  const count = 160;
  const motes = new Float32Array(count * 3);
  const seeds = [];
  const r = rng(817);
  const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(side, dir).normalize();
  for (let i = 0; i < count; i++) seeds.push({ t: 0.08 + r() * 0.9, a: r() * Math.PI * 2, d: Math.sqrt(r()), s: 0.2 + r() * 0.6 });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(motes, 3));
  const dust = new THREE.Points(geo, new THREE.PointsMaterial({
    map: softDisc('mote'), color: 0xffd8a0, size: 0.018, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  dust.frustumCulled = false;
  scene.add(dust);
  const p = new THREE.Vector3();
  loc.onUpdate((dt, time) => {
    for (let i = 0; i < count; i++) {
      const m = seeds[i];
      const along = (m.t + time * 0.004 * m.s) % 1;
      const rad = Math.tan(0.27) * along * (len - 0.6) * m.d;
      const a = m.a + time * 0.15 * m.s;
      p.copy(from).addScaledVector(dir, 0.15 + along * (len - 0.6));
      p.addScaledVector(side, Math.cos(a) * rad).addScaledVector(up, Math.sin(a) * rad + Math.sin(time * 0.3 + m.a) * 0.03);
      p.toArray(motes, i * 3);
    }
    geo.attributes.position.needsUpdate = true;
  });
}

// Fahles Licht der Straßenlaterne, durch das Fenster
function streetGlow(room, [x, y, z], [tx, ty, tz]) {
  const spot = new THREE.SpotLight(0x8ea4cc, 9, 9, 0.5, 0.8, 1.5);
  spot.position.set(x, y, z);
  spot.target.position.set(tx, ty, tz);
  room.scene.add(spot, spot.target);
}

function kettle(room, x, y, z) {
  const c = 0x3a3c3e;
  room.metalBag.add(new THREE.SphereGeometry(0.12, 14, 10).scale(1, 0.72, 1).translate(x, y + 0.085, z), c);
  room.metalBag.add(cyl(0.045, 0.05, 0.03, x, y + 0.17, z, 10), c);
  room.metalBag.add(new THREE.SphereGeometry(0.014, 6, 4).translate(x, y + 0.195, z), 0x1a1a1a);
  const spout = cyl(0.012, 0.022, 0.16, 0, 0, 0, 8);
  spout.rotateZ(-0.9);
  spout.translate(x + 0.15, y + 0.12, z);
  room.metalBag.add(spout, c);
  const handle = new THREE.TorusGeometry(0.08, 0.008, 5, 14, Math.PI);
  handle.translate(x, y + 0.17, z);
  room.metalBag.add(handle, 0x1a1a1a);
}

// Ladentresen mit Vitrine: Taschenuhren auf grünem Samt.
function shopCounter(room, x, z) {
  const w = 2.8;
  const d = 0.6;
  room.woodBag.box(0x4a2e1a, w, 0.88, d, x, 0.44, z);
  // Füllungen auf der Kundenseite, zur Ladentür (+Z)
  for (let i = 0; i < 4; i++) room.woodBag.box(0x5a3a22, w / 4 - 0.12, 0.6, 0.02, x - w / 2 + w / 8 + (i * w) / 4, 0.46, z + d / 2 + 0.01);
  room.woodBag.box(0x5a3a22, w + 0.1, 0.05, d + 0.08, x, 0.905, z);
  room.solid(x, z, w, d);

  const caseW = 2.3;
  const caseD = 0.42;
  const cy = 0.93;
  room.plainBag.box(0x1e3a2a, caseW - 0.04, 0.02, caseD - 0.04, x, cy + 0.01, z);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) room.woodBag.box(0x3a2412, 0.03, 0.26, 0.03, x + sx * (caseW / 2 - 0.015), cy + 0.13, z + sz * (caseD / 2 - 0.015));
  room.woodBag.box(0x3a2412, caseW, 0.03, caseD, x, cy + 0.275, z);
  const glass = new THREE.Mesh(
    box(caseW - 0.04, 0.24, caseD - 0.04, x, cy + 0.14, z),
    new THREE.MeshStandardMaterial({ color: 0x9ab0b8, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.16, depthWrite: false }),
  );
  room.scene.add(glass);
  const r = rng(305);
  for (let i = 0; i < 9; i++) {
    const wx = x - caseW / 2 + 0.2 + i * 0.24 + (r() - 0.5) * 0.05;
    const wz = z + (r() - 0.5) * 0.18;
    const watch = cyl(0.032, 0.032, 0.012, wx, cy + 0.028, wz, 16);
    room.metalBag.add(watch, r() > 0.35 ? 0xc4a050 : 0xb0b2b6);
    room.plainBag.add(cyl(0.026, 0.026, 0.003, wx, cy + 0.035, wz, 16), 0xece4d0);
    room.metalBag.add(new THREE.TorusGeometry(0.008, 0.002, 4, 8).rotateX(Math.PI / 2).translate(wx, cy + 0.028, wz - 0.04), 0xc4a050);
  }
}

// Werkbank des Uhrmachers: Drehstuhl, Glasglocken, Schubladenkasten, Werkzeugleiste.
// Die Hinweise (Reparaturbuch bei z -1.6, Löschblatt bei z 0.2) bleiben frei.
function workbenchTools(room, W, r) {
  const top = 0.965;
  const bx = W - 0.55;
  const steel = 0x8a8c90;
  const brass = 0xb59a55;

  // Drehstuhl (Uhrmacherdrehbank)
  const lz = 1.05;
  const bed = cyl(0.014, 0.014, 0.42, 0, 0, 0, 8);
  bed.rotateX(Math.PI / 2);
  bed.translate(bx + 0.1, top + 0.05, lz);
  room.metalBag.add(bed, steel);
  room.metalBag.box(0x2a2c2e, 0.08, 0.1, 0.07, bx + 0.1, top + 0.05, lz - 0.18);
  room.metalBag.box(0x2a2c2e, 0.06, 0.07, 0.05, bx + 0.1, top + 0.04, lz + 0.14);
  const pulley = cyl(0.045, 0.045, 0.03, 0, 0, 0, 16);
  pulley.rotateX(Math.PI / 2);
  pulley.translate(bx + 0.1, top + 0.1, lz - 0.24);
  room.metalBag.add(pulley, brass);
  room.metalBag.box(0x2a2c2e, 0.12, 0.02, 0.5, bx + 0.1, top + 0.01, lz);

  // Glasglocken über offenen Uhrwerken
  const domeMat = new THREE.MeshStandardMaterial({ color: 0xc8d8e0, roughness: 0.05, transparent: true, opacity: 0.2, depthWrite: false });
  for (const [gx, gz] of [[bx - 0.15, -0.55], [bx + 0.05, -2.4]]) {
    room.woodBag.add(cyl(0.085, 0.09, 0.025, gx, top + 0.012, gz, 16), 0x3a2010);
    room.metalBag.add(cyl(0.045, 0.045, 0.012, gx, top + 0.035, gz, 16), brass);
    for (let k = 0; k < 3; k++) room.metalBag.add(cyl(0.012 + k * 0.006, 0.012 + k * 0.006, 0.004, gx - 0.02 + k * 0.018, top + 0.044, gz + 0.01 - k * 0.012, 10), k === 1 ? steel : brass);
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.14, 18, 1, true).translate(gx, top + 0.095, gz), domeMat);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(gx, top + 0.165, gz), domeMat);
    room.scene.add(dome, cap);
  }

  // Schubladenkasten an der Rückkante
  const cx = W - 0.2;
  const cz = -0.5;
  room.woodBag.box(0x3a2010, 0.22, 0.3, 0.5, cx, top + 0.15, cz);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      const y = top + 0.045 + row * 0.07;
      const z = cz - 0.16 + col * 0.16;
      room.woodBag.box(0x5a3a22, 0.01, 0.055, 0.14, cx - 0.11, y, z);
      room.metalBag.add(new THREE.SphereGeometry(0.006, 6, 4).translate(cx - 0.12, y, z), brass);
    }
  }

  // Lupe, Pinzetten, Schraubenzieher
  room.metalBag.add(cyl(0.018, 0.014, 0.03, bx - 0.25, top + 0.015, 0.75, 10), 0x111111);
  for (let i = 0; i < 4; i++) {
    const t = cyl(0.003, 0.003, 0.11, 0, 0, 0, 5);
    t.rotateZ(Math.PI / 2);
    t.rotateY(-0.3 + r() * 0.6);
    t.translate(bx - 0.2 + r() * 0.15, top + 0.004, 0.55 + i * 0.05);
    room.metalBag.add(t, steel);
  }

  // Schraubstock am Ende der Bank
  room.metalBag.box(0x2a2c2e, 0.16, 0.08, 0.1, bx - 0.3, top + 0.04, 2.45);
  room.metalBag.box(0x2a2c2e, 0.04, 0.1, 0.12, bx - 0.36, top + 0.1, 2.45);
  room.metalBag.box(0x2a2c2e, 0.04, 0.1, 0.12, bx - 0.24, top + 0.1, 2.45);
  const spindle = cyl(0.008, 0.008, 0.24, 0, 0, 0, 6);
  spindle.rotateZ(Math.PI / 2);
  spindle.translate(bx - 0.38, top + 0.07, 2.45);
  room.metalBag.add(spindle, steel);

  // Werkzeugleiste zwischen den Fenstern
  const wx = W - 0.04;
  room.woodBag.box(0x3a2010, 0.03, 0.32, 1.3, wx, 1.6, 0);
  for (let i = 0; i < 11; i++) {
    const z = -0.55 + i * 0.11;
    const len = 0.14 + r() * 0.08;
    room.metalBag.add(cyl(0.004, 0.004, len, wx - 0.03, 1.6 - len / 2 + 0.05, z, 5), steel);
    room.woodBag.add(cyl(0.011, 0.011, 0.06, wx - 0.03, 1.66, z, 6), i % 3 ? 0x6a4a2a : 0x2a1a10);
  }
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
  room.plainBag.add(cyl(0.04, 0.05, 0.07, 0.15, 0.905, -1.6, 10), 0x101014);
  room.woodBag.box(0x7a4a22, 0.34, 0.09, 0.22, 0.8, 0.915, -1.2);
  room.plainBag.box(0xc9a24a, 0.28, 0.005, 0.16, 0.8, 0.962, -1.2);
  room.plainBag.add(cyl(0.09, 0.07, 0.03, 0.4, 0.88, -1.0, 14), 0x6a6a6a);
  room.plainBag.add(cyl(0.05, 0.05, 0.015, 0.4, 0.9, -1.0, 12), 0xd8d8d2);
  loc.anchor('zigarren', 0.8, 0.98, -1.2);
  // Grüne Bankerlampe
  room.metalBag.add(cyl(0.06, 0.09, 0.02, -0.1, 0.875, -1.7, 12), 0xb59a55);
  room.metalBag.add(cyl(0.012, 0.012, 0.32, -0.1, 1.03, -1.7, 8), 0xb59a55);
  const shadeGeo = cyl(0.05, 0.13, 0.12, -0.1, 1.22, -1.7, 12);
  addMesh(scene, shadeGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.7, 0.3) }));
  const desk = new THREE.PointLight(0xffd090, 6, 7, 2);
  desk.position.set(-0.1, 1.15, -1.5);
  scene.add(desk);
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
