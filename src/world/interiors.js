import * as THREE from 'three';
import { Location } from '../engine/location.js';
import { Bag, addMesh, box, cyl, merge, std } from './kit.js';
import { chalkboard, chalkLabel, clockFace, diploma, fogPuff, landscape, mirrorGlass, portrait, rng, sheetMusic, stockList, signTexture, softDisc, wallpaper, wood } from './textures.js';

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
    this.glassBag = new Bag();
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

  clock(x, y, z, facing, radius = 0.24, hour = 9, minute = 40, audible = true) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.03, radius + 0.03, 0.06, 20), std({ color: 0x3a2412, roughness: 0.5 }));
    body.rotation.x = Math.PI / 2;
    g.add(body);
    const face = new THREE.Mesh(new THREE.CircleGeometry(radius, 20), new THREE.MeshStandardMaterial({ map: clockFace(hour, minute), roughness: 0.4, emissive: 0x302a20 }));
    face.position.z = 0.032;
    g.add(face);
    if (audible) g.userData.ticks = { kind: 'wall', size: radius };
    g.position.set(x, y, z);
    g.rotation.y = facing;
    this.scene.add(g);
  }

  // Wanduhr mit schwingendem Pendel.
  regulator(x, y, z, facing, seed = 0, audible = true) {
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
    // Das Ticken (core/ticking.js) folgt derselben Pendelfrequenz.
    if (audible) g.userData.ticks = { kind: 'pendulum', seed };
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
    if (this.glassBag.parts.length) {
      const glass = addMesh(this.scene, this.glassBag.build(), std({ vertexColors: true, roughness: 0.08, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }));
      glass.renderOrder = 1;
    }
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

  // Uhrenwand im Westen: drei Regulatoren, dazwischen, darunter und darüber runde
  // Wanduhren, so gesetzt, dass sich keine zwei Gehäuse berühren.
  const wallClocks = [
    ['reg', -2.3, 2.15], ['reg', -0.3, 2.15], ['reg', 1.7, 2.15],
    ['clk', -1.3, 2.55, 0.24], ['clk', 0.7, 2.55, 0.24],
    ['clk', -1.3, 1.75, 0.18], ['clk', 0.7, 1.75, 0.18],
    ['clk', -2.3, 1.05, 0.2], ['clk', -1.3, 1.05, 0.17], ['clk', -0.3, 1.05, 0.2], ['clk', 0.7, 1.05, 0.17], ['clk', 1.7, 1.05, 0.2],
    ['clk', -2.3, 3.07, 0.15], ['clk', -0.3, 3.07, 0.15], ['clk', 1.7, 3.07, 0.15],
  ];
  wallClocks.forEach(([kind, z, y, rad], n) => {
    if (kind === 'reg') room.regulator(-W + 0.09, y, z, Math.PI / 2, n * 1.7);
    else room.clock(-W + 0.05, y, z, Math.PI / 2, rad, 9, 38 + (n % 4));
  });
  loc.anchor('clocks', -W + 0.2, 1.8, 0);
  room.woodBag.box(0x3a2010, 0.4, 2.15, 0.5, -3.3, 1.08, -3.1);
  room.clock(-3.3, 1.72, -2.84, 0, 0.17, 9, 40, false);
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
function wingChair(room, x, z, facing, { cloth = 0x5c2420, dark = 0x3e1714, padColor = 0x6a2a24, plaid = true } = {}) {
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
    ambient: 0.5,
  });
  const { loc, scene } = room;
  const r = rng(377);
  // Tabakdunst schluckt die Ecken.
  scene.fog = new THREE.FogExp2(0x241a12, 0.042);

  // Vertäfelung, Deckenbalken, Tür zum Hinterzimmer
  wainscot(room, 'south', -5.5, -0.7);
  wainscot(room, 'south', 0.7, 5.5);
  wainscot(room, 'north', 0.45, 5.5);
  wainscot(room, 'west', -2.6, 4);
  wainscot(room, 'east', -4, 4);
  for (const z of [-2.7, -0.2, 2.3]) room.woodBag.box(0x2a1a0e, 11, 0.2, 0.22, 0, 3.1, z);
  room.woodBag.box(0x241509, 0.05, 2.25, 1.1, -5.48, 1.12, -3.2);
  room.woodBag.box(0x3a2416, 0.05, 2.1, 0.9, -5.45, 1.05, -3.2);
  room.metalBag.box(0xb09050, 0.06, 0.06, 0.06, -5.4, 1.0, -2.88);

  // Theke mit Füllungen zur Gaststube und Messingstange für die Füße
  const TX = -2.4;
  const TZ = -2.3;
  const TW = 5.2;
  room.woodBag.box(0x4a2c18, TW, 1.08, 0.7, TX, 0.54, TZ);
  room.woodBag.box(0x7a5430, TW + 0.1, 0.06, 0.85, TX, 1.1, TZ);
  for (let i = 0; i < 6; i++) room.woodBag.box(0x5a3a22, TW / 6 - 0.14, 0.62, 0.02, TX - TW / 2 + TW / 12 + (i * TW) / 6, 0.62, TZ + 0.36);
  room.woodBag.box(0x2a180c, TW, 0.12, 0.03, TX, 0.06, TZ + 0.36);
  room.metalBag.box(0xa58a4a, TW, 0.03, 0.03, TX, 0.2, -1.88);
  for (const k of [-2.3, -0.8, 0.8, 2.3]) room.metalBag.box(0xa58a4a, 0.02, 0.02, 0.06, TX + k, 0.2, -1.92);
  room.solid(TX, TZ, TW, 0.7);
  // Halbe Pendeltür versperrt den Gang hinter die Theke.
  room.woodBag.box(0x4a2c18, 0.06, 1.0, 1.05, 0.27, 0.55, -3.2);
  room.woodBag.box(0x2a180c, 0.08, 0.05, 1.1, 0.27, 1.07, -3.2);
  loc.collide(0.15, 0.45, -4, -2.6);
  // Podest hinter der Theke, damit die Wirtin über den Zapfhahn sieht
  room.woodBag.box(0x3a2414, 5.2, 0.16, 1.08, TX, 0.08, -3.2);
  counterGoods(room, 1.13);

  // Flaschenregal
  room.woodBag.box(0x2a1a0e, 5.4, 2.0, 0.22, -2.4, 1.9, -3.86);
  room.woodBag.box(0x1e1208, 5.6, 0.1, 0.32, -2.4, 2.95, -3.82);
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

  // Bierfass auf einem Bock am Thekenende, Hahn zur Gaststube
  room.woodBag.box(0x2a180c, 0.62, 0.08, 0.1, -4.6, 1.17, -2.62);
  room.woodBag.box(0x2a180c, 0.62, 0.08, 0.1, -4.6, 1.17, -2.08);
  addCask(room.woodBag, -4.6, 1.53, -2.35, 0.34, 0.8, 'z');
  const tap = cyl(0.016, 0.016, 0.1, 0, 0, 0, 8);
  tap.rotateX(Math.PI / 2);
  tap.translate(-4.6, 1.42, -1.92);
  room.metalBag.add(tap, 0xc0a050);
  room.metalBag.add(cyl(0.01, 0.013, 0.07, -4.6, 1.37, -1.88, 8), 0xc0a050);
  schnapsRack(room, -1.55, 0.15);

  // Preistafel und Uhr an der Rückwand
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.86),
    new THREE.MeshStandardMaterial({
      map: chalkboard('Heute', [
        ['Molle', '10 Pf'], ['Weiße mit Schuß', '20 Pf'], ['Korn', '5 Pf'], ['Kümmel', '10 Pf'],
        ['Bulette', '15 Pf'], ['Soleier', '10 Pf'], ['Schrippe', '3 Pf'],
      ], [['Herr Leutnant', '14 M. 60']]),
      roughness: 0.92,
    }),
  );
  board.position.set(1.35, 1.75, -3.955);
  scene.add(board);
  for (const s of [-1, 1]) {
    room.woodBag.box(0x3a2010, 1.22, 0.06, 0.04, 1.35, 1.75 + s * 0.46, -3.97);
    room.woodBag.box(0x3a2010, 0.06, 0.98, 0.04, 1.35 + s * 0.58, 1.75, -3.97);
  }
  room.clock(1.35, 2.62, -3.96, 0, 0.2);

  // Tische: Stammtisch, Brandts Tisch, Kartentisch
  const tables = [[3, -1.8], [3.3, 1.7], [-1.8, 1.4]];
  for (const [x, z] of tables) {
    room.woodBag.add(cyl(0.48, 0.48, 0.05, x, 0.8, z, 20), 0x5a3a22);
    room.woodBag.add(cyl(0.06, 0.08, 0.78, x, 0.39, z, 8), 0x3a2412);
    room.woodBag.add(cyl(0.25, 0.3, 0.03, x, 0.02, z, 12), 0x3a2412);
    room.solid(x, z, 0.8, 0.8);
  }
  const top = 0.825;
  // Brandt: leere Gläser und ein Bierdeckel voller Striche
  for (const [dx, dz] of [[-0.2, -0.12], [-0.05, -0.28], [0.12, -0.18]]) molle(room, 3 + dx, top, -1.8 + dz, 0);
  beerMat(room, 2.82, top, -1.62, 9);
  // Stammtisch mit Schild, Korn und Aschenbecher
  stammtischSign(room, -1.8, top, 1.4);
  bottle(room.plainBag, -1.62, top, 1.2, 0x20402a);
  for (const [dx, dz] of [[-0.3, 0.05], [-0.1, 0.3]]) schnapsGlass(room, -1.8 + dx, top, 1.4 + dz);
  ashtray(room, -1.5, top, 1.55, true);
  // Skat mit Rathen: drei Blätter, ein Stich, Geld nur auf einer Seite
  cardTable(room, 3.3, top, 1.7, r);

  room.chair(4, 1.7, -Math.PI / 2);
  room.chair(3.3, 2.6, Math.PI);
  room.chair(-1.8, 2.3, Math.PI);
  room.chair(-2.8, 1.4, Math.PI / 2);
  room.chair(3.0, -0.95, Math.PI);
  // Die Mütze des dritten Mannes, der gerade draußen ist
  room.plainBag.add(new THREE.SphereGeometry(0.095, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.05, 0.45, 1.1).translate(3.3, 0.488, 2.64), 0x1a1816);
  const peak = box(0.15, 0.008, 0.07, 0, 0, 0);
  peak.rotateX(0.15);
  peak.translate(3.3, 0.494, 2.52);
  room.plainBag.add(peak, 0x121010);

  // Ofen
  room.metalBag.add(cyl(0.35, 0.38, 1.6, 4.9, 0.8, -3.2, 14), 0x1a1a1c);
  room.solid(4.9, -3.2, 0.74, 0.74);
  const ember = new THREE.PointLight(0xff5a1a, 1.8, 5, 2);
  ember.position.set(4.7, 0.5, -2.9);
  scene.add(ember);
  loc.onUpdate((dt, t) => { ember.intensity = 1.5 + Math.sin(t * 5) * Math.sin(t * 2.3) * 0.5; });

  // Garderobe und Spucknapf
  room.woodBag.add(cyl(0.025, 0.03, 1.8, 1.5, 0.9, 3.6, 8), 0x2a180c);
  for (const a of [0, Math.PI / 2]) {
    const foot = box(0.5, 0.04, 0.05, 0, 0, 0);
    foot.rotateY(a + 0.4);
    foot.translate(1.5, 0.02, 3.6);
    room.woodBag.add(foot, 0x2a180c);
  }
  room.plainBag.add(new THREE.SphereGeometry(0.09, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.85, 1.1).translate(1.62, 1.66, 3.6), 0x1e1c1a);
  room.plainBag.add(cyl(0.14, 0.14, 0.008, 1.62, 1.66, 3.6, 14), 0x1e1c1a);
  room.plainBag.box(0x5a2a22, 0.08, 0.6, 0.02, 1.42, 1.42, 3.62);
  room.solid(1.5, 3.6, 0.4, 0.4);
  room.metalBag.add(cyl(0.1, 0.12, 0.12, -0.7, 0.06, -1.62, 14), 0xa58a4a);
  room.metalBag.add(new THREE.TorusGeometry(0.1, 0.012, 6, 16).rotateX(Math.PI / 2).translate(-0.7, 0.12, -1.62), 0xa58a4a);

  // Fenster, warmes Lampenlicht, Qualm unter der Decke
  room.window('east', 0.2, 1.8, 1.5, 1.5);
  room.lamp(-2.4, 2.45, -1.6, { intensity: 7 });
  room.lamp(3, 2.45, -1.5, { intensity: 5 });
  room.lamp(3.3, 2.05, 1.7, { intensity: 3.8, glow: 0.6 });
  room.lamp(-1.8, 2.25, 1.4, { intensity: 3.6, glow: 0.6 });
  tobaccoSmoke(room, 391);

  loc.anchor('kluge', -3.2, 0.16, -3.05, 0);
  loc.anchor('brandt', 2.4, 0, -2.4, 0.5);
  loc.anchor('rathen', 2.5, 0, 1.6, Math.PI / 2);
  // Sitzende: Hüfte auf der Sitzfläche, deshalb liegt der Ursprung unter dem Boden.
  loc.anchor('gast1', -2.85, -0.37, 1.4, Math.PI / 2);
  loc.anchor('gast2', -1.8, -0.37, 2.35, Math.PI);
  loc.anchor('gast3', 4.05, -0.37, 1.7, -Math.PI / 2);
  loc.anchor('tafel', 1.35, 1.75, -3.9);
  loc.anchor('karten', 3.3, 0.9, 1.7);
  return room.finish();
}

// --- Ausstattung der Destille ----------------------------------------------------

// Holzverkleidung bis Brusthöhe mit Leisten.
function wainscot(room, side, from, to, H = 1.0) {
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

// Bauchiges Fass mit Eisenreifen; axis gibt die Fassachse an.
function addCask(bag, x, y, z, r, len, axis, wood = 0x5a3a1e) {
  const prof = (t) => r * (0.86 + 0.14 * Math.sin(Math.PI * t));
  const pts = [new THREE.Vector2(0, -len / 2)];
  for (let i = 0; i <= 10; i++) pts.push(new THREE.Vector2(prof(i / 10), (i / 10 - 0.5) * len));
  pts.push(new THREE.Vector2(0, len / 2));
  const parts = [[new THREE.LatheGeometry(pts, 18), wood]];
  for (const t of [0.08, 0.3, 0.7, 0.92]) parts.push([cyl(prof(t) + 0.006, prof(t) + 0.006, 0.025, 0, (t - 0.5) * len, 0, 18), 0x24201c]);
  for (const [g, c] of parts) {
    if (axis === 'x') g.rotateZ(-Math.PI / 2);
    else if (axis === 'z') g.rotateX(Math.PI / 2);
    g.translate(x, y, z);
    bag.add(g, c);
  }
}

// Volles Glas: Bier mit Schaumkrone. Leeres Glas: durchsichtig, mit Schaumrand.
function molle(room, x, y, z, full = 1) {
  if (full > 0) {
    room.plainBag.add(cyl(0.042, 0.034, 0.15, x, y + 0.075, z, 10), 0xc0902e);
    room.plainBag.add(cyl(0.043, 0.043, 0.025, x, y + 0.14, z, 10), 0xe8dcc0);
    return;
  }
  room.glassBag.add(new THREE.CylinderGeometry(0.042, 0.034, 0.15, 14, 1, true).translate(x, y + 0.075, z), 0xc8d4d0);
  room.glassBag.add(cyl(0.034, 0.034, 0.012, x, y + 0.006, z, 14), 0xc8d4d0);
  if (full === 0) room.plainBag.add(cyl(0.03, 0.03, 0.006, x, y + 0.015, z, 10), 0x8a7a50);
}

function schnapsGlass(room, x, y, z) {
  room.glassBag.add(new THREE.CylinderGeometry(0.019, 0.014, 0.055, 12, 1, true).translate(x, y + 0.0275, z), 0xd0d8d4);
  room.plainBag.add(cyl(0.014, 0.012, 0.02, x, y + 0.012, z, 8), 0xb89a5a);
}

function bottle(bag, x, y, z, color) {
  bag.add(cyl(0.04, 0.045, 0.2, x, y + 0.1, z, 10), color);
  bag.add(cyl(0.014, 0.03, 0.09, x, y + 0.245, z, 8), color);
  bag.add(cyl(0.016, 0.016, 0.02, x, y + 0.295, z, 8), 0xc8b890);
}

// Bierdeckel mit Bleistiftstrichen: so rechnet die Wirtin.
function beerMat(room, x, y, z, strokes) {
  room.plainBag.add(cyl(0.05, 0.05, 0.003, x, y + 0.0015, z, 16), 0xd8ccb0);
  // Je vier Striche, der fünfte quer darüber.
  for (let i = 0; i < strokes; i++) {
    const g = Math.floor(i / 5);
    const j = i % 5;
    const s = box(0.003, 0.0006, j === 4 ? 0.036 : 0.03, 0, 0, 0);
    s.rotateY(j === 4 ? 1.0 : 0.08);
    s.translate(x - 0.03 + g * 0.036 + (j === 4 ? 0.009 : j * 0.006), y + 0.0033 + (j === 4 ? 0.0002 : 0), z);
    room.plainBag.add(s, 0x2a2622);
  }
}

// Aschenbecher mit glimmendem Stumpen; der Rauch steigt langsam auf.
function ashtray(room, x, y, z, smoking) {
  room.metalBag.add(cyl(0.06, 0.05, 0.02, x, y + 0.01, z, 14), 0x6a5a3a);
  const cigar = cyl(0.008, 0.008, 0.09, 0, 0, 0, 8);
  cigar.rotateZ(Math.PI / 2 - 0.12);
  cigar.rotateY(0.6);
  cigar.translate(x + 0.02, y + 0.03, z);
  room.plainBag.add(cigar, 0x4a2a14);
  if (!smoking) return;
  // Glut am angehobenen Ende
  const tip = new THREE.Vector3(0, 0.046, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2 - 0.12).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.6);
  tip.add(new THREE.Vector3(x + 0.02, y + 0.03, z));
  addMesh(room.scene, new THREE.SphereGeometry(0.0085, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.7, 0.2) }), tip.x, tip.y, tip.z);
  smokeWisp(room, tip.x, tip.y + 0.02, tip.z, Math.round(Math.abs(x * 100 + z * 10)) + 1);
}

function smokeWisp(room, x, y, z, seed) {
  const r = rng(seed);
  const items = [];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.SpriteMaterial({ map: fogPuff(), color: 0xb4a894, transparent: true, opacity: 0, depthWrite: false });
    const s = new THREE.Sprite(m);
    room.scene.add(s);
    items.push({ s, m, off: i / 10, sway: r() * 6.28 });
  }
  room.loc.onUpdate((dt, t) => {
    for (const p of items) {
      const k = (t * 0.11 + p.off) % 1;
      p.s.position.set(x + Math.sin(t * 0.7 + p.sway + k * 4) * 0.14 * k, y + k * 1.6, z + Math.cos(t * 0.5 + p.sway) * 0.1 * k);
      p.s.scale.setScalar(0.06 + k * 0.7);
      p.m.opacity = 0.2 * Math.sin(Math.PI * k) * (1 - k * 0.5);
      p.m.rotation = p.sway + k * 2;
    }
  });
}

// Flache Schwaden unter der Decke, die kaum merklich ziehen.
function tobaccoSmoke(room, seed) {
  const { scene, loc, w, d, h } = room;
  const mat = new THREE.SpriteMaterial({ map: fogPuff(), color: 0x8a7a64, transparent: true, opacity: 0.14, depthWrite: false });
  const r = rng(seed);
  const puffs = [];
  for (let i = 0; i < 24; i++) {
    const s = new THREE.Sprite(mat);
    s.scale.set(2.6 + r() * 2.4, 1.0 + r() * 0.8, 1);
    scene.add(s);
    puffs.push({ s, x: (r() - 0.5) * (w - 1.6), z: (r() - 0.5) * (d - 1.6), y: h - 0.35 - r() * 0.65, a: r() * 6.28, v: 0.5 + r() * 0.8 });
  }
  loc.onUpdate((dt, t) => {
    for (const p of puffs) {
      p.s.position.set(p.x + Math.sin(t * 0.05 * p.v + p.a) * 0.7, p.y + Math.sin(t * 0.08 + p.a) * 0.05, p.z + Math.cos(t * 0.04 * p.v + p.a) * 0.5);
    }
  });
}

// Was auf der Theke steht: Zapfhahn, Gläser, Buletten, Schrippen, Soleier.
function counterGoods(room, y) {
  const brass = 0xc0a050;
  const z = -2.42;
  const x = -1.9;
  // Zapfsäule mit zwei Hähnen über dem Tropfblech
  room.metalBag.box(0x8a8c90, 0.46, 0.02, 0.2, x, y + 0.01, z);
  room.metalBag.add(cyl(0.04, 0.05, 0.36, x, y + 0.18, z, 14), brass);
  room.metalBag.add(new THREE.SphereGeometry(0.055, 14, 10).translate(x, y + 0.39, z), brass);
  const bar = cyl(0.016, 0.016, 0.34, 0, 0, 0, 10);
  bar.rotateZ(Math.PI / 2);
  bar.translate(x, y + 0.3, z);
  room.metalBag.add(bar, brass);
  for (const s of [-1, 1]) {
    const px = x + s * 0.16;
    room.metalBag.add(cyl(0.024, 0.024, 0.05, px, y + 0.3, z, 10), brass);
    room.metalBag.add(cyl(0.01, 0.014, 0.08, px, y + 0.24, z, 8), brass);
    const lever = cyl(0.009, 0.012, 0.17, 0, 0.085, 0, 8);
    lever.rotateX(-0.25);
    lever.translate(px, y + 0.32, z);
    room.metalBag.add(lever, 0x1a1410);
    room.plainBag.add(new THREE.SphereGeometry(0.02, 10, 8).scale(1, 1.4, 1).translate(px, y + 0.32 + 0.17 * Math.cos(0.25), z - 0.17 * Math.sin(0.25)), 0x8a7e6a);
  }
  molle(room, x - 0.16, y + 0.02, z, 1);
  // Gespülte Gläser
  for (let i = 0; i < 4; i++) molle(room, -1.3 + i * 0.1, y, -2.12, -1);
  // Schrippenkorb
  const r = rng(733);
  room.woodBag.add(cyl(0.16, 0.12, 0.08, -0.55, y + 0.04, -2.25, 14), 0x6a4a26);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + r();
    const rx = -0.55 + Math.cos(a) * 0.07;
    const rz = -2.25 + Math.sin(a) * 0.07;
    room.plainBag.add(new THREE.SphereGeometry(0.05, 10, 8).scale(1.3, 0.65, 0.9).rotateY(a).translate(rx, y + 0.09 + r() * 0.02, rz), 0xc08a48);
  }
  // Soleier im Glas
  for (let i = 0; i < 7; i++) {
    room.plainBag.add(new THREE.SphereGeometry(0.03, 8, 6).scale(1, 1.3, 1).translate(-0.08 + (r() - 0.5) * 0.09, y + 0.05 + i * 0.022, -2.25 + (r() - 0.5) * 0.09), 0xd8c8a0);
  }
  room.glassBag.add(cyl(0.095, 0.095, 0.2, -0.08, y + 0.1, -2.25, 18), 0x9a8a40);
  room.glassBag.add(new THREE.CylinderGeometry(0.1, 0.1, 0.26, 18, 1, true).translate(-0.08, y + 0.13, -2.25), 0xc8d4d0);
  room.metalBag.add(cyl(0.105, 0.105, 0.02, -0.08, y + 0.27, -2.25, 18), 0x6a6a68);
  // Buletten neben der Wirtin
  room.plainBag.add(cyl(0.15, 0.12, 0.015, -3.7, y + 0.008, -2.15, 18), 0xe0d8c8);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    room.plainBag.add(new THREE.SphereGeometry(0.04, 10, 6).scale(1, 0.55, 1).translate(-3.7 + Math.cos(a) * 0.07, y + 0.03, -2.15 + Math.sin(a) * 0.07), 0x6a3a1c);
  }
}

// Schnapsfässchen auf einem Gestell an der Westwand, jedes mit Kreideschild und Hahn.
function schnapsRack(room, z0, z1) {
  const x = -room.w / 2 + 0.3;
  const mid = (z0 + z1) / 2;
  for (const y of [0.2, 0.68, 1.16]) room.woodBag.box(0x3a2414, 0.56, 0.04, z1 - z0, x, y, mid);
  for (const z of [z0 + 0.03, z1 - 0.03]) for (const dx of [-0.24, 0.24]) room.woodBag.box(0x2a180c, 0.05, 1.18, 0.05, x + dx, 0.59, z);
  const names = ['Korn', 'Kümmel', 'Doppelkorn', 'Bittrer', 'Nordhäuser', 'Pfeffi'];
  const step = (z1 - z0) / 3;
  const woods = [0x5a3a1e, 0x6a4424, 0x4e321a];
  names.forEach((name, i) => {
    const z = z0 + step * ((i % 3) + 0.5);
    const y = (i < 3 ? 0.22 : 0.7) + 0.2;
    addCask(room.woodBag, x, y, z, 0.2, 0.46, 'x', woods[i % 3]);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.08), new THREE.MeshStandardMaterial({ map: chalkLabel(name), roughness: 0.9 }));
    label.rotation.y = Math.PI / 2;
    label.position.set(x + 0.233, y + 0.065, z);
    room.scene.add(label);
    const tap = cyl(0.011, 0.011, 0.06, 0, 0, 0, 8);
    tap.rotateZ(Math.PI / 2);
    tap.translate(x + 0.26, y - 0.07, z);
    room.metalBag.add(tap, 0xc0a050);
    room.metalBag.add(cyl(0.008, 0.01, 0.05, x + 0.285, y - 0.095, z, 8), 0xc0a050);
  });
  for (let i = 0; i < 3; i++) bottle(room.plainBag, x + 0.05, 1.18, z0 + 0.35 + i * 0.5, [0x20402a, 0x4a2a10, 0xc0b88a][i]);
  room.solid(x + 0.05, mid, 0.62, z1 - z0);
}

function stammtischSign(room, x, y, z) {
  room.metalBag.add(cyl(0.05, 0.06, 0.02, x, y + 0.01, z, 12), 0x2a2622);
  room.metalBag.add(cyl(0.006, 0.006, 0.3, x, y + 0.16, z, 6), 0x2a2622);
  const tex = signTexture('Stammtisch', { width: 384, height: 128, size: 66, bg: '#2a1a10', fg: '#d8b56a' });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, side: THREE.DoubleSide }));
  plate.position.set(x, y + 0.36, z);
  plate.rotation.y = 0.35;
  room.scene.add(plate);
}

// Skattisch: grünes Tuch, drei Blätter, ein offener Stich, Geld beim Gegner,
// ein Schuldschein auf Rathens Seite.
function cardTable(room, x, y, z, r) {
  const bag = room.plainBag;
  bag.add(cyl(0.45, 0.45, 0.008, x, y + 0.004, z, 28), 0x1e4630);
  const base = y + 0.008;
  const card = (cx, cz, rot, up, lift = 0) => {
    const b = box(0.058, 0.0025, 0.09, 0, 0, 0);
    b.rotateY(rot);
    b.translate(cx, base + 0.00125 + lift, cz);
    bag.add(b, 0xe8e2d0);
    const t = box(up ? 0.016 : 0.048, 0.001, up ? 0.022 : 0.08, 0, 0, 0);
    t.rotateY(rot);
    t.translate(cx, base + 0.003 + lift, cz);
    bag.add(t, up ? (r() > 0.5 ? 0xa01c18 : 0x141414) : 0x7a1f1c);
  };
  const fan = (cx, cz, face, n) => {
    for (let i = 0; i < n; i++) {
      const a = face + (i - (n - 1) / 2) * 0.18;
      card(cx + Math.sin(a) * 0.03, cz + Math.cos(a) * 0.03, a, false, i * 0.0036);
    }
  };
  fan(x - 0.3, z + 0.02, -Math.PI / 2 + 0.2, 7);
  fan(x + 0.3, z, Math.PI / 2, 7);
  fan(x + 0.02, z + 0.3, 0.1, 7);
  [[0.3, -0.02, 0.01], [1.6, 0.03, 0.02], [2.7, 0.01, -0.03]].forEach(([rot, dx, dz], i) => card(x + dx, z + dz, rot, true, i * 0.0036));
  // Talon
  const deck = box(0.058, 0.01, 0.09, 0, 0, 0);
  deck.rotateY(0.15);
  deck.translate(x + 0.12, base + 0.005, z - 0.26);
  bag.add(deck, 0xe8e2d0);
  card(x + 0.12, z - 0.26, 0.15, false, 0.0085);
  // Geld beim Gegner: ein Stapel Silber, zwei Goldstücke
  for (let i = 0; i < 6; i++) room.metalBag.add(cyl(0.0125, 0.0125, 0.0022, x + 0.24, base + 0.0011 + i * 0.0023, z - 0.2, 14), 0xc8c8cc);
  for (const [dx, dz, c] of [[0.31, -0.12, 0xc8a040], [0.2, -0.28, 0xc8a040], [0.34, -0.25, 0xc8c8cc], [0.1, -0.1, 0xc8c8cc]]) {
    room.metalBag.add(cyl(0.0125, 0.0125, 0.0022, x + dx, base + 0.0011, z + dz, 14), c);
  }
  // Skatblock mit Bleistift
  const pad = box(0.1, 0.003, 0.14, 0, 0, 0);
  pad.rotateY(0.25);
  pad.translate(x - 0.12, base + 0.0015, z - 0.28);
  bag.add(pad, 0xe8e0c8);
  for (let i = 0; i < 6; i++) {
    const l = box(0.07, 0.0006, 0.003, 0, 0, 0);
    l.translate(0, 0, -0.05 + i * 0.018);
    l.rotateY(0.25);
    l.translate(x - 0.12, base + 0.0033, z - 0.28);
    bag.add(l, 0x5a5650);
  }
  const pencil = cyl(0.004, 0.004, 0.12, 0, 0, 0, 6);
  pencil.rotateZ(Math.PI / 2);
  pencil.rotateY(-0.5);
  pencil.translate(x - 0.02, base + 0.004, z - 0.34);
  bag.add(pencil, 0x7a5a2a);
  // Schuldschein auf Rathens Seite
  const note = box(0.13, 0.002, 0.085, 0, 0, 0);
  note.rotateY(-0.35);
  note.translate(x - 0.22, base + 0.001, z - 0.1);
  bag.add(note, 0xe4d8b8);
  for (let i = 0; i < 3; i++) {
    const l = box(0.09 - i * 0.02, 0.0006, 0.003, 0, 0, 0);
    l.translate(-0.01, 0, -0.02 + i * 0.02);
    l.rotateY(-0.35);
    l.translate(x - 0.22, base + 0.0023, z - 0.1);
    bag.add(l, 0x2a2440);
  }
  // Getränke und Stumpen
  molle(room, x + 0.33, base, z + 0.2, 1);
  schnapsGlass(room, x - 0.36, base, z - 0.12);
  ashtray(room, x + 0.22, base, z + 0.32, true);
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
    ambient: 0.5,
  });
  const { loc, scene } = room;
  const r = rng(1414);

  // Hohe Vertäfelung, Stuckleiste, Läufer von der Tür zum Schreibtisch
  wainscot(room, 'north', -4.5, 4.5, 1.3);
  wainscot(room, 'west', -3.5, 3.5, 1.3);
  wainscot(room, 'east', -3.5, 3.5, 1.3);
  wainscot(room, 'south', -4.5, -0.7, 1.3);
  wainscot(room, 'south', 0.7, 4.5, 1.3);
  for (const s of [-1, 1]) {
    room.plainBag.box(0x8a8270, 9, 0.16, 0.14, 0, 3.72, s * 3.43);
    room.plainBag.box(0x8a8270, 0.14, 0.16, 7, s * 4.43, 3.72, 0);
  }
  rug(room, 0, 1.6, 1.4, 3.4, 0x3a1a18, 0x6a5a3a);

  // Wendts Schreibtisch: Doppelpult mit Schubladen zur Besucherseite, grünes Leder
  room.woodBag.box(0x4a2a16, 2.6, 0.82, 1.1, 0, 0.41, -1.3);
  room.woodBag.box(0x6a3e20, 2.7, 0.05, 1.2, 0, 0.84, -1.3);
  room.plainBag.box(0x1e3a28, 2.3, 0.004, 0.9, 0, 0.867, -1.3);
  room.plainBag.box(0x140c06, 0.9, 0.62, 0.02, 0, 0.36, -0.74);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const y = 0.18 + i * 0.22;
      room.woodBag.box(0x5a3420, 0.72, 0.18, 0.02, s * 0.85, y, -0.74);
      room.metalBag.box(0xb59a55, 0.12, 0.018, 0.02, s * 0.85, y, -0.725);
    }
  }
  room.solid(0, -1.3, 2.7, 1.2);
  room.chair(0, -2.5, 0, 0x3a1a14);
  room.chair(-0.6, 0.0, Math.PI);
  room.chair(0.6, 0.0, Math.PI);
  deskSet(room, 0.87);
  loc.anchor('zigarren', 0.8, 0.98, -1.2);
  loc.anchor('kurse', -0.95, 0.9, -0.95);

  // Tresor mit Rad und Messingbeschlägen
  room.metalBag.box(0x1c2024, 1.3, 2.1, 0.9, 3.5, 1.05, -2.9);
  room.metalBag.box(0x2a2f34, 1.15, 1.95, 0.05, 3.5, 1.05, -2.43);
  const wheel = new THREE.TorusGeometry(0.17, 0.018, 8, 20);
  wheel.translate(3.5, 1.2, -2.37);
  room.metalBag.add(wheel, 0xb59a55);
  for (let i = 0; i < 4; i++) {
    const spoke = box(0.34, 0.016, 0.016, 0, 0, 0);
    spoke.rotateZ((i * Math.PI) / 4);
    spoke.translate(3.5, 1.2, -2.37);
    room.metalBag.add(spoke, 0xb59a55);
  }
  room.metalBag.add(cyl(0.05, 0.05, 0.05, 0, 0, 0, 14).rotateX(Math.PI / 2).translate(3.5, 1.2, -2.37), 0xb59a55);
  room.metalBag.add(cyl(0.04, 0.04, 0.02, 0, 0, 0, 14).rotateX(Math.PI / 2).translate(3.5, 1.62, -2.39), 0xc8c0a0);
  for (const dy of [-0.8, 0.8]) for (const dx of [-0.5, 0.5]) room.metalBag.add(new THREE.SphereGeometry(0.02, 6, 4).translate(3.5 + dx, 1.05 + dy, -2.4), 0xb59a55);
  room.solid(3.5, -2.9, 1.3, 0.9);
  loc.anchor('tresor', 3.5, 1.3, -2.4);

  // Aktenregal mit beschrifteten Ordnern
  binders(room, -2.9, r);

  // Hauptbücher für die Revision auf dem Beistelltisch
  room.table(1.9, -2.7, 1.1, 0.8, 0.78, 0x4a2a16);
  revisionLedgers(room, 1.9, 0.81, -2.7, r);
  greenLamp(room, 2.36, 0.81, -2.46, 1.2);
  loc.anchor('buecher', 1.9, 0.95, -2.7);

  // Kassenschalter mit Messinggitter, dahinter der Kassierer am Stehpult
  tellerCounter(room, -2.9, -0.6, 2.6);
  standingDesk(room, -3.45, 1.0);

  // Wanduhr, Gründerportrait, Wandtelephon, Wartebank
  room.regulator(0, 2.4, -3.42, 0, 1);
  loc.anchor('wanduhr', 0, 2.4, -3.3);
  painting2(room, 1.65, 2.35, -3.43, 0.62, 0.78);
  wallTelephone(room, 4.42, -1.0);
  bench(room, 4.18, 0.8);
  room.window('east', 0.8, 2.1, 1.3, 1.9);
  room.window('west', 0.8, 2.1, 1.3, 1.9);

  // Strenges Licht: Gaskrone, grüne Pultlampen, kaltes Laternenlicht
  gasolier(room, 0, 0.9);
  streetGlow(room, [5.0, 2.8, 0.8], [2.0, 0, 0.2]);
  streetGlow(room, [-5.0, 2.8, 0.8], [-3.0, 0.8, 1.0]);

  loc.anchor('wendt', 0.2, 0, -2.0, 0);
  loc.anchor('kassierer', -3.95, 0, 1.0, Math.PI / 2);
  return room.finish();
}

// --- Ausstattung des Bankhauses --------------------------------------------------

function greenLamp(room, x, y, z, intensity) {
  room.metalBag.add(cyl(0.06, 0.09, 0.02, x, y + 0.01, z, 12), 0xb59a55);
  room.metalBag.add(cyl(0.012, 0.012, 0.32, x, y + 0.16, z, 8), 0xb59a55);
  const shade = cyl(0.05, 0.13, 0.12, 0, 0, 0, 14);
  shade.translate(x, y + 0.35, z);
  addMesh(room.scene, shade, new THREE.MeshStandardMaterial({ color: 0x1a5a32, emissive: 0x0e3a1c, roughness: 0.3, side: THREE.DoubleSide }));
  addMesh(room.scene, new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.7, 1.0) }), x, y + 0.3, z);
  const l = new THREE.PointLight(0xffd090, intensity, 6, 2);
  l.position.set(x, y + 0.25, z);
  room.scene.add(l);
}

function deskSet(room, y) {
  // Akten, Löscher, Schreibzeug, Zigarrenkiste, Aschenbecher, Kalender, Kurszettel
  room.plainBag.box(0xd9cfb4, 0.4, 0.012, 0.3, -0.5, y + 0.006, -1.25);
  room.plainBag.box(0xcfc4a4, 0.3, 0.02, 0.22, -0.8, y + 0.01, -1.5);
  const blotter = cyl(0.04, 0.04, 0.16, 0, 0, 0, 10, 1);
  blotter.rotateZ(Math.PI / 2);
  blotter.translate(-0.3, y + 0.05, -1.62);
  room.woodBag.add(blotter, 0x3a2010);
  room.metalBag.box(0xb59a55, 0.36, 0.015, 0.16, 0.2, y + 0.008, -1.62);
  for (const dx of [0.1, 0.3]) {
    room.glassBag.add(cyl(0.03, 0.035, 0.06, 0.2 + dx - 0.2, y + 0.045, -1.62, 10), 0xc8d8d0);
    room.plainBag.add(cyl(0.025, 0.03, 0.03, 0.2 + dx - 0.2, y + 0.03, -1.62, 10), 0x101014);
    room.metalBag.add(cyl(0.018, 0.018, 0.012, 0.2 + dx - 0.2, y + 0.08, -1.62, 10), 0xb59a55);
  }
  const pen = cyl(0.004, 0.005, 0.17, 0, 0, 0, 6);
  pen.rotateZ(1.2);
  pen.translate(0.22, y + 0.06, -1.55);
  room.plainBag.add(pen, 0x101010);
  room.woodBag.box(0x7a4a22, 0.34, 0.09, 0.22, 0.8, y + 0.045, -1.2);
  room.plainBag.box(0xc9a24a, 0.28, 0.005, 0.16, 0.8, y + 0.092, -1.2);
  for (let i = 0; i < 5; i++) {
    const c = cyl(0.009, 0.009, 0.14, 0, 0, 0, 6);
    c.rotateZ(Math.PI / 2);
    c.translate(0.8, y + 0.1, -1.27 + i * 0.03);
    room.plainBag.add(c, 0x5a3418);
  }
  room.plainBag.add(cyl(0.09, 0.07, 0.03, 0.4, y + 0.015, -1.0, 14), 0x6a6a6a);
  room.plainBag.add(cyl(0.05, 0.05, 0.015, 0.4, y + 0.03, -1.0, 12), 0xd8d8d2);
  // Kalender: Sonnabend, 12. November
  const cal = new THREE.Mesh(
    new THREE.PlaneGeometry(0.1, 0.12),
    new THREE.MeshStandardMaterial({ map: signTexture(['12', 'November 1892'], { width: 128, height: 160, bg: '#e8e2d0', fg: '#2a2018', size: 70, border: false }), roughness: 0.8 }),
  );
  cal.position.set(1.1, y + 0.07, -1.55);
  cal.rotation.set(-0.25, -0.3, 0, 'YXZ');
  room.scene.add(cal);
  room.woodBag.box(0x3a2010, 0.11, 0.02, 0.06, 1.1, y + 0.01, -1.57);
  // Kurszettel, bekritzelt, auf der Besucherseite
  const list = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.28), new THREE.MeshStandardMaterial({ map: stockList(), roughness: 0.85 }));
  list.rotation.set(-Math.PI / 2, 0, 0.35);
  list.position.set(-0.95, y + 0.004, -0.95);
  room.scene.add(list);
  greenLamp(room, -0.1, y, -1.7, 6);
}

function binders(room, x, r) {
  const z = -3.25;
  room.woodBag.box(0x2a1608, 2.8, 2.5, 0.4, x, 1.25, z);
  room.woodBag.box(0x1e1006, 2.9, 0.08, 0.46, x, 2.54, z + 0.02);
  room.solid(x, z, 2.8, 0.4);
  const colors = [0x3a2a1c, 0x4a1c18, 0x2a2a30, 0x2a3a2a];
  for (let s = 0; s < 4; s++) {
    const base = 0.12 + s * 0.6;
    room.woodBag.box(0x1e1006, 2.7, 0.03, 0.36, x, base - 0.015, z + 0.02);
    for (let i = 0; i < 12; i++) {
      if (s === 3 && i > 8) break;
      const bx = x - 1.27 + i * 0.22 + (r() - 0.5) * 0.01;
      const hh = 0.38 + r() * 0.04;
      room.plainBag.box(colors[(i + s) % 4], 0.07, hh, 0.3, bx, base + hh / 2, z + 0.05);
      room.plainBag.box(0xd8d0bc, 0.05, 0.08, 0.004, bx, base + hh * 0.62, z + 0.202);
      room.metalBag.add(new THREE.TorusGeometry(0.012, 0.003, 4, 8).translate(bx, base + 0.08, z + 0.2), 0x8a8a8a);
    }
  }
  // Auf dem obersten Brett: ein paar herausgezogene Ordner, quer gelegt
  for (let i = 0; i < 3; i++) room.plainBag.box(colors[i], 0.36, 0.07, 0.3, x + 0.95, 1.95 + i * 0.07, z + 0.05);
}

function revisionLedgers(room, x, y, z, r) {
  const covers = [0x2a1a10, 0x3a2414, 0x1e2a1e, 0x2a1a10];
  for (let st = 0; st < 3; st++) {
    const sx = x - 0.32 + st * 0.32;
    let h = y;
    const n = 3 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const th = 0.05 + r() * 0.03;
      const b = box(0.26, th, 0.36, 0, 0, 0);
      b.rotateY((r() - 0.5) * 0.12);
      b.translate(sx, h + th / 2, z - 0.2);
      room.plainBag.add(b, covers[(i + st) % 4]);
      const pages = box(0.24, th - 0.012, 0.34, 0, 0, 0);
      pages.translate(sx + 0.012, h + th / 2, z - 0.2);
      room.plainBag.add(pages, 0xe0d6bc);
      // Papierstreifen als Lesezeichen
      if (r() < 0.6) room.plainBag.box(0xece4d0, 0.015, 0.003, 0.09, sx + 0.12, h + th * 0.6, z - 0.08 - r() * 0.24);
      h += th;
    }
  }
  // Ein aufgeschlagenes Hauptbuch mit Zahlenkolonnen
  const open = box(0.5, 0.025, 0.34, 0, 0, 0);
  open.translate(x + 0.1, y + 0.0125, z + 0.2);
  room.plainBag.add(open, 0xe4dcc6);
  for (let i = 0; i < 12; i++) room.plainBag.box(0x4a4440, 0.18, 0.0006, 0.004, x + (i % 2 ? 0.22 : -0.02), y + 0.0256, z + 0.09 + Math.floor(i / 2) * 0.04);
  room.plainBag.box(0x8a1a14, 0.03, 0.0008, 0.004, x + 0.3, y + 0.0258, z + 0.29);
}

// Schalter entlang der Westseite: Theke, Messinggitter mit Kassenfenster, Schranken an beiden Enden.
function tellerCounter(room, x, z0, z1) {
  const len = z1 - z0;
  const mid = (z0 + z1) / 2;
  const top = 1.05;
  room.woodBag.box(0x3a2010, 0.6, top, len, x, top / 2, mid);
  room.plainBag.box(0x5a5650, 0.7, 0.04, len + 0.06, x, top + 0.02, mid);
  for (let i = 0; i < 4; i++) room.woodBag.box(0x4a2a16, 0.02, 0.7, len / 4 - 0.14, x + 0.31, 0.5, z0 + len / 8 + (i * len) / 4);
  room.solid(x, mid, 0.6, len);
  // Gitter
  const brass = 0xb59a55;
  const gx = x - 0.12;
  const win = mid;
  room.metalBag.box(brass, 0.04, 0.04, len, gx, 1.97, mid);
  room.metalBag.box(brass, 0.03, 0.03, len, gx, 1.1, mid);
  for (let zz = z0 + 0.04; zz < z1; zz += 0.08) {
    const dz = Math.abs(zz - win);
    const y0 = dz < 0.24 ? 1.45 + Math.sqrt(0.24 * 0.24 - dz * dz) : 1.1;
    room.metalBag.add(cyl(0.006, 0.006, 1.97 - y0, gx, (1.97 + y0) / 2, zz, 6), brass);
  }
  const arch = new THREE.TorusGeometry(0.24, 0.012, 6, 16, Math.PI);
  arch.rotateY(Math.PI / 2);
  arch.translate(gx, 1.45, win);
  room.metalBag.add(arch, brass);
  room.plainBag.box(0x6a6660, 0.36, 0.015, 0.5, x + 0.02, top + 0.05, win);
  // Schild über dem Fenster
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.12), new THREE.MeshStandardMaterial({ map: signTexture('Kasse', { width: 512, height: 102, size: 70, bg: '#1a1612', fg: '#c8a860' }), roughness: 0.6 }));
  sign.rotation.y = Math.PI / 2;
  sign.position.set(gx + 0.03, 2.1, win);
  room.scene.add(sign);
  // Schranken: zur Südwand und zur Westwand
  room.woodBag.box(0x3a2010, 0.06, 1.05, 3.5 - z1, x, 0.525, (z1 + 3.5) / 2);
  room.solid(x, (z1 + 3.5) / 2, 0.12, 3.5 - z1);
  const wx = -room.w / 2;
  room.woodBag.box(0x3a2010, x - 0.3 - wx, 1.05, 0.06, (wx + x - 0.3) / 2, 0.525, z0);
  room.solid((wx + x - 0.3) / 2, z0, x - 0.3 - wx, 0.12);
}

// Stehpult des Kassierers: schräge Platte, aufgeschlagenes Kassenbuch, grüne Lampe.
function standingDesk(room, x, z) {
  for (const dx of [-0.2, 0.2]) for (const dz of [-0.32, 0.32]) room.woodBag.box(0x3a2010, 0.04, 1.05, 0.04, x + dx, 0.525, z + dz);
  room.woodBag.box(0x3a2010, 0.44, 0.03, 0.7, x, 0.3, z);
  const topBoard = box(0.5, 0.04, 0.76, 0, 0, 0);
  topBoard.rotateZ(0.3);
  topBoard.translate(x, 1.12, z);
  room.woodBag.add(topBoard, 0x4a2a16);
  const book = box(0.32, 0.02, 0.46, 0, 0, 0);
  book.rotateZ(0.3);
  book.translate(x - 0.01, 1.15, z);
  room.plainBag.add(book, 0xe4dcc6);
  room.woodBag.box(0x3a2010, 0.12, 0.03, 0.76, x + 0.22, 1.2, z);
  greenLamp(room, x + 0.22, 1.215, z + 0.28, 2.2);
  room.solid(x, z, 0.5, 0.76);
}

function painting2(room, x, y, z, w, h) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(box(w + 0.12, h + 0.12, 0.05, 0, 0, 0), std({ color: 0xb08a3a, metalness: 0.7, roughness: 0.4 })));
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: portrait(), roughness: 0.7 }));
  pic.position.z = 0.027;
  g.add(pic);
  g.position.set(x, y, z);
  room.scene.add(g);
}

// Wandtelephon: Holzkasten mit zwei Glocken, Kurbel und eingehängtem Hörer.
function wallTelephone(room, x, z) {
  const fx = x - 0.08;
  room.woodBag.box(0x4a2a16, 0.12, 0.42, 0.26, x - 0.06, 1.6, z);
  for (const dz of [-0.06, 0.06]) room.metalBag.add(new THREE.SphereGeometry(0.045, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(Math.PI / 2).translate(fx - 0.06, 1.72, z + dz), 0xb59a55);
  const mouth = cyl(0.03, 0.015, 0.08, 0, 0, 0, 10);
  mouth.rotateZ(Math.PI / 2);
  mouth.translate(fx - 0.1, 1.55, z);
  room.plainBag.add(mouth, 0x141210);
  const crank = cyl(0.006, 0.006, 0.09, 0, 0, 0, 6);
  crank.rotateX(Math.PI / 2);
  crank.translate(fx - 0.01, 1.6, z + 0.17);
  room.metalBag.add(crank, 0x2a2a2a);
  room.plainBag.add(cyl(0.012, 0.012, 0.04, fx - 0.04, 1.6, z + 0.21, 6).rotateZ(Math.PI / 2), 0x141210);
  room.plainBag.add(cyl(0.022, 0.02, 0.14, fx - 0.02, 1.52, z - 0.17, 10), 0x141210);
  room.woodBag.box(0x3a2010, 0.08, 0.16, 0.22, x - 0.04, 1.32, z);
}

function bench(room, x, z) {
  const len = 1.6;
  for (const dz of [-0.7, 0.7]) room.woodBag.box(0x3a2010, 0.42, 0.45, 0.05, x, 0.225, z + dz);
  room.woodBag.box(0x4a2a16, 0.44, 0.05, len, x, 0.47, z);
  room.plainBag.box(0x2a3a2c, 0.4, 0.04, len - 0.1, x, 0.51, z);
  room.woodBag.box(0x4a2a16, 0.05, 0.5, len, x + 0.2, 0.78, z);
  room.solid(x, z, 0.46, len);
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

// Dreiarmige Gaskrone mit Tulpenschirmen.
function gasolier(room, x, z) {
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

export function buildInteriors() {
  return [buildPension(), buildWerkstatt(), buildApotheke(), buildDestille(), buildBank()];
}
