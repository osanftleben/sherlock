import * as THREE from 'three';
import { Bag, addMesh, box, cyl, std } from '../kit.js';
import { rng, signTexture, softDisc, wallpaper, wood } from '../textures.js';
import { Room } from './room.js';
import { rug, streetGlow, wingChair } from './fittings.js';

export function buildWerkstatt() {
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
  room.woodBag.box(0x4a2e18, 0.08, 0.5, 5.4, W - 0.1, 0.65, 0);
  benchBody(room, W);
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
  // Die Blendlaterne wirft Schatten: Der Sessel zeichnet sich hart auf Boden und Wand ab.
  room.shadows(policeLantern(room, [W - 0.75, 0.965, 2.05], [-0.6, 0.55, -1.3]));
  room.lamp(-1.2, 2.6, -0.6, { intensity: 3.2, range: 12, hang: false, visible: false, color: 0xffc080 });
  streetGlow(room, [W + 0.4, 2.9, 1.5], [2.2, 0, 0.6]);
  // Durch das nördliche Fenster fällt das Laternenlicht schräg auf die Werkbank, gerade hell
  // genug, um Reparaturbuch, Werkzeug und Uhrwerke zu erkennen.
  streetGlow(room, [W + 0.6, 3.0, -1.7], [W - 0.75, 0.95, -0.7]);

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
  // Gegenstände ohne Hinweis, zu denen Holmes trotzdem etwas sagt.
  loc.anchor('chair', -0.6, 0.95, -1.3);
  loc.anchor('lantern', W - 0.75, 1.1, 2.05);
  loc.anchor('lathe', W - 0.45, 1.07, 1.05);
  loc.anchor('domes', W - 0.7, 1.08, -0.55);
  loc.anchor('watchbox', W - 0.75, 1.0, -2.0);
  loc.anchor('kettle', -3.62, 1.55, 2.66);
  loc.anchor('vitrine', -2.3, 1.06, 1.3);
  return room.finish();
}

// --- Ausstattung der Werkstatt ---------------------------------------------------

// Unterbau der Uhrmacherbank: an beiden Enden ein Kasten mit fünf Schubladen, dazwischen unter
// der Platte eine Reihe flacher Schubladen für Federn, Steine und Zeiger. Kniefreiheit in der Mitte.
function benchBody(room, W) {
  const bx = W - 0.55;
  const front = bx - 0.45;
  const brass = 0xb59a55;
  const drawer = (y, z, h, w) => {
    room.woodBag.box(0x5a3a22, 0.016, h - 0.02, w - 0.03, front - 0.008, y, z);
    room.metalBag.add(new THREE.SphereGeometry(0.009, 6, 4).translate(front - 0.02, y, z), brass);
  };
  for (const s of [-1, 1]) {
    const z = s * 2.45;
    room.woodBag.box(0x4a2e18, 0.9, 0.86, 0.6, bx, 0.43, z);
    for (let i = 0; i < 5; i++) drawer(0.12 + i * 0.155, z, 0.155, 0.6);
  }
  room.woodBag.box(0x4a2e18, 0.9, 0.1, 3.3, bx, 0.82, 0);
  for (let i = 0; i < 5; i++) drawer(0.82, -1.32 + i * 0.66, 0.1, 0.66);
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

  // Sichtbarer Lichtkegel: additiv, zum Ende hin ausgeblendet. Wo man flach auf seinen Mantel
  // schaut, also an den Rändern, läuft er weich aus; sonst zöge er harte, gerade Kanten als
  // hellen Keil quer über Wand und Decke.
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
  const beam = new THREE.Mesh(cone, new THREE.ShaderMaterial({
    uniforms: { opacity: { value: 0.1 } },
    vertexShader: `
      attribute vec3 color;
      varying vec3 vColor;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vColor = color;
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float opacity;
      varying vec3 vColor;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float face = abs(dot(normalize(vNormal), normalize(vView)));
        gl_FragColor = vec4(vColor, opacity * face * face);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
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
  return spot;
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

  // Arbeitslampe: Petroleum, kalt. Kessler hat sie gelöscht, bevor er sich in den Sessel setzte.
  const ax = W - 0.25;
  const az = -1.08;
  const turn = (pts, seg = 16) => new THREE.LatheGeometry(pts.map(([pr, py]) => new THREE.Vector2(pr, py)), seg);
  room.metalBag.add(turn([[0, 0], [0.075, 0], [0.075, 0.012], [0.05, 0.03], [0.018, 0.05], [0.013, 0.3], [0.02, 0.31], [0, 0.315]]).translate(ax, top, az), brass);
  room.glassBag.add(new THREE.SphereGeometry(0.055, 14, 10).scale(1, 0.75, 1).translate(ax, top + 0.35, az), 0xd8c89a);
  room.metalBag.add(cyl(0.028, 0.032, 0.035, ax, top + 0.405, az, 12), brass);
  room.glassBag.add(cyl(0.022, 0.024, 0.16, ax, top + 0.5, az, 12), 0xe8e4dc);
  // Grüner Glasschirm, außen glänzend, innen weiß
  const SHADE = [[0.13, 0], [0.11, 0.025], [0.07, 0.07], [0.045, 0.1]];
  room.plainBag.add(turn(SHADE, 24).translate(ax, top + 0.42, az), 0x1e4a2c);
  room.plainBag.add(turn(SHADE.map(([pr, py]) => [pr * 0.96, py - 0.003]).reverse(), 24).translate(ax, top + 0.42, az), 0xd8d4c4);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    room.metalBag.add(cyl(0.003, 0.003, 0.08, ax + Math.cos(a) * 0.06, top + 0.44, az + Math.sin(a) * 0.06, 4), brass);
  }

  // Lederunterlage vor dem Drehstuhl, darauf ein offenes Taschenuhrwerk im Werkhalter,
  // Gehäuse und Deckel daneben.
  room.plainBag.box(0x2a3a2a, 0.36, 0.004, 0.5, bx - 0.15, top + 0.002, 0.7);
  const mx = bx - 0.1;
  const mz = 0.82;
  room.metalBag.add(new THREE.TorusGeometry(0.03, 0.006, 6, 18).rotateX(Math.PI / 2).translate(mx, top + 0.02, mz), 0x2a2c2e);
  for (const s of [-1, 1]) room.metalBag.box(0x2a2c2e, 0.01, 0.014, 0.04, mx, top + 0.012, mz + s * 0.042);
  room.metalBag.add(cyl(0.024, 0.024, 0.006, mx, top + 0.026, mz, 18), brass);
  for (let k = 0; k < 4; k++) room.metalBag.add(cyl(0.004 + k * 0.002, 0.004 + k * 0.002, 0.003, mx - 0.01 + k * 0.006, top + 0.031, mz - 0.008 + (k % 2) * 0.012, 8), k % 2 ? brass : steel);
  room.metalBag.add(cyl(0.026, 0.026, 0.012, mx - 0.12, top + 0.012, mz + 0.05, 18), 0xb8b8b4);
  room.metalBag.add(new THREE.SphereGeometry(0.026, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.25, 1).translate(mx - 0.12, top + 0.018, mz + 0.05), 0xb8b8b4);
  room.metalBag.add(cyl(0.026, 0.026, 0.004, mx + 0.08, top + 0.006, mz + 0.08, 18), 0xb8b8b4);
  // Ölgeber
  room.glassBag.add(cyl(0.012, 0.015, 0.03, mx + 0.07, top + 0.015, mz - 0.1, 10), 0xc8b878);
  room.metalBag.add(cyl(0.002, 0.002, 0.06, mx + 0.07, top + 0.05, mz - 0.1, 4), steel);

  // Holzkasten mit Taschenuhren, die auf Abholung warten
  const tx = bx - 0.2;
  const tz = -2.0;
  room.woodBag.box(0x3a2010, 0.3, 0.03, 0.22, tx, top + 0.015, tz);
  for (const [w, d, ox, oz] of [[0.3, 0.012, 0, -0.105], [0.3, 0.012, 0, 0.105], [0.012, 0.22, -0.145, 0], [0.012, 0.22, 0.145, 0]]) room.woodBag.box(0x3a2010, w, 0.045, d, tx + ox, top + 0.03, tz + oz);
  room.plainBag.box(0x4a1c1a, 0.27, 0.004, 0.19, tx, top + 0.032, tz);
  for (let i = 0; i < 6; i++) {
    const wx = tx - 0.09 + (i % 3) * 0.09;
    const wz = tz - 0.045 + Math.floor(i / 3) * 0.09;
    room.metalBag.add(cyl(0.03, 0.03, 0.012, wx, top + 0.04, wz, 16), i % 3 === 1 ? 0xb8b8b4 : brass);
    room.metalBag.add(cyl(0.006, 0.006, 0.01, wx, top + 0.04, wz - 0.034, 6), brass);
  }

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
