import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Bag, addMesh, cyl, std } from '../kit.js';
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

// Polster: Quader mit gerundeten Kanten (Radius r), dicht unterteilt, damit er sich biegen und
// wölben lässt. puff wölbt die Oberseite (y) oder die Vorderseite (z) nach außen; tufts sind
// eingezogene Knopfmulden [x, y] auf der Vorderseite. Gibt auch die Lage der Vorderseite an
// einer Stelle zurück, damit Knöpfe genau in den Mulden sitzen.
function pillow(w, h, d, r, { puffY = 0, puffZ = 0, tufts = [], n = 12 } = {}) {
  const g = new THREE.BoxGeometry(1, 1, 1, n, n, Math.max(4, n >> 1));
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  const half = [w / 2, h / 2, d / 2];
  // Gitter zu den Kanten hin verdichten, sonst werden die Rundungen eckig.
  const edge = (u) => Math.sign(u) * 0.5 * (1 - (1 - 2 * Math.abs(u)) ** 1.7);
  const front = (x, y) => {
    const fall = Math.max(0, 1 - (x / half[0]) ** 2) * Math.max(0, 1 - (y / half[1]) ** 2);
    let dz = puffZ * fall;
    for (const [tx, ty] of tufts) dz -= 0.016 * fall * Math.exp(-((x - tx) ** 2 + (y - ty) ** 2) / 0.0028);
    return half[2] + dz;
  };
  const pos = g.attributes.position;
  const p = new THREE.Vector3();
  const q = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.set(edge(pos.getX(i)) * w, edge(pos.getY(i)) * h, edge(pos.getZ(i)) * d);
    q.set(
      THREE.MathUtils.clamp(p.x, -half[0] + r, half[0] - r),
      THREE.MathUtils.clamp(p.y, -half[1] + r, half[1] - r),
      THREE.MathUtils.clamp(p.z, -half[2] + r, half[2] - r),
    );
    const off = p.clone().sub(q);
    if (off.lengthSq() > 1e-12) p.copy(q).add(off.setLength(r));
    const top = THREE.MathUtils.smoothstep(p.y, half[1] - r, half[1]);
    p.y += puffY * top * Math.max(0, 1 - (p.x / half[0]) ** 2) * Math.max(0, 1 - (p.z / half[2]) ** 2);
    const face = THREE.MathUtils.smoothstep(p.z, half[2] - r, half[2]);
    p.z += face * (front(p.x, p.y) - half[2]);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  const out = mergeVertices(g, 1e-5);
  out.computeVertexNormals();
  return { geo: out, front };
}

// Biegt ein Teil der Lehne um den Sitzenden (die Seiten kommen um bend * x² nach vorn) und
// hebt die Oberkante zur Mitte hin um arch an (Buckel der Lehne). y0/h: Unterkante und Höhe.
function curveBack(g, { bend, arch, w, y0, h }) {
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const lift = arch * Math.max(0, 1 - (2 * x / w) ** 2) * THREE.MathUtils.clamp((y - y0) / h, 0, 1);
    pos.setXYZ(i, x, y + lift, pos.getZ(i) + bend * x * x);
  }
  g.computeVertexNormals();
  return g;
}

// Gedrechselter Sesselfuß, Boden bei y = 0.
const CHAIR_FOOT = [[0, 0], [0.019, 0], [0.024, 0.012], [0.02, 0.026], [0.029, 0.055], [0.031, 0.08], [0.022, 0.1], [0.028, 0.115], [0.03, 0.14], [0, 0.14]];

// Karierte Wolldecke als ein Tuch: liegt auf dem gewölbten Sitzkissen, rundet sich über die
// Vorderkante, fällt in Falten zu Boden und läuft dort schräg aus. Die Karos stehen in den
// Vertexfarben.
function plaidCloth() {
  const path = new THREE.CatmullRomCurve3(
    [[-0.06, 0.53], [0.18, 0.53], [0.33, 0.515], [0.395, 0.47], [0.41, 0.39], [0.425, 0.22], [0.44, 0.07], [0.5, 0.016], [0.66, 0.012], [0.86, 0.012]].map(([z, y]) => new THREE.Vector3(0, y, z)),
  );
  const width = 0.44;
  const cx = 0.04;
  const g = new THREE.PlaneGeometry(width, 1, 40, 90);
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const wool = new THREE.Color(0x3e4a32);
  const stripe = new THREE.Color(0x6a3a24);
  const thin = new THREE.Color(0x8a7a50);
  const c = new THREE.Color();
  const pt = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i);
    const s = 0.5 - pos.getY(i);
    path.getPointAt(s, pt);
    let x = cx + u;
    let y = pt.y;
    let z = pt.z;
    // Auf dem Kissen der Wölbung folgen (pillow mit puffY, Mitte bei z = 0.04).
    const onSeat = 1 - THREE.MathUtils.smoothstep(z, 0.3, 0.37);
    const seatY = 0.512 + 0.022 * Math.max(0, 1 - (x / 0.3) ** 2) * Math.max(0, 1 - ((z - 0.04) / 0.33) ** 2) + 0.006;
    y += onSeat * (seatY - y) * (y > 0.45 ? 1 : 0);
    // Faltenwurf im Fall, flache Wellen am Boden.
    const fall = THREE.MathUtils.smoothstep(s, 0.3, 0.42) * (1 - THREE.MathUtils.smoothstep(s, 0.62, 0.7));
    z += fall * 0.018 * Math.sin(u * 30 + 0.6) * (0.4 + s);
    const floor = THREE.MathUtils.smoothstep(s, 0.66, 0.75);
    y += floor * 0.006 * Math.max(0, Math.sin(u * 24 + s * 9));
    // Der Teil am Boden ist zur Seite weggerutscht.
    const turn = 0.35 * floor * (s - 0.66) / 0.34;
    const dz = z - 0.5;
    if (dz > 0) {
      const dx = x - cx;
      x = cx + dx * Math.cos(turn) + dz * Math.sin(turn);
      z = 0.5 - dx * Math.sin(turn) + dz * Math.cos(turn);
    }
    pos.setXYZ(i, x, y, z);
    // Karo: breite rostbraune Streifen in beiden Richtungen, dazwischen feine helle.
    const a = (u / width + 0.5) * 5;
    const b = s * 11;
    const band = (t, k) => Math.abs((t % 1) - 0.5) < k;
    c.copy(wool);
    if (band(a, 0.11) || band(b, 0.11)) c.lerp(stripe, band(a, 0.11) && band(b, 0.11) ? 1 : 0.7);
    else if (band(a + 0.5, 0.05) || band(b + 0.5, 0.05)) c.lerp(thin, 0.6);
    c.toArray(col, i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

// Ohrensessel: gepolstert, gewölbte Lehne mit Knopfmulden, geschwungene Ohren, gerollte
// Armlehnen auf gedrechselten Füßen; eine Decke ist halb heruntergerutscht. Blickrichtung +Z
// vor der Drehung.
export function wingChair(room, x, z, facing, { cloth = 0x5c2420, dark = 0x3e1714, padColor = 0x6a2a24, plaid = true } = {}) {
  const legWood = 0x2a1608;
  const bag = new Bag();
  for (const sx of [-0.33, 0.33]) {
    for (const sz of [-0.3, 0.3]) {
      const foot = new THREE.LatheGeometry(CHAIR_FOOT.map(([r, y]) => new THREE.Vector2(r, y)), 10);
      // Hintere Füße stehen etwas nach hinten ab.
      if (sz < 0) foot.translate(0, -0.14, 0).rotateX(-0.12).translate(0, 0.14, 0);
      bag.add(foot.translate(sx, 0, sz), legWood);
    }
  }
  // Sitzkasten und gewölbtes Sitzkissen.
  bag.add(pillow(0.8, 0.27, 0.76, 0.045).geo.translate(0, 0.255, 0), cloth);
  bag.add(pillow(0.6, 0.13, 0.66, 0.05, { puffY: 0.022 }).geo.translate(0, 0.44, 0.04), padColor);
  // Lehne: Rahmen und Polster mit drei mal drei Knopfmulden, beide gleich gebogen und geneigt.
  const BACK = { bend: 0.38, w: 0.78 };
  const lean = (g, y, zc) => g.rotateX(-0.12).translate(0, y, zc);
  const frame = pillow(0.78, 0.82, 0.16, 0.05).geo;
  bag.add(lean(curveBack(frame, { ...BACK, arch: 0.11, y0: -0.41, h: 0.82 }), 0.86, -0.31), cloth);
  const tufts = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) tufts.push([-0.17 + j * 0.17, -0.16 + i * 0.17]);
  const pad = pillow(0.6, 0.58, 0.08, 0.035, { puffZ: 0.03, tufts, n: 16 });
  const padArch = { ...BACK, arch: 0.07, y0: -0.29, h: 0.58 };
  bag.add(lean(curveBack(pad.geo, padArch), 0.84, -0.2), padColor);
  for (const [tx, ty] of tufts) {
    const btn = new THREE.SphereGeometry(0.012, 8, 6).scale(1, 1, 0.6).translate(tx, ty, pad.front(tx, ty) + 0.003);
    bag.add(lean(curveBack(btn, padArch), 0.84, -0.2), dark);
  }
  for (const s of [-1, 1]) {
    // Armlehne: Seitenpolster, darauf eine Rolle, die vorn in einer Schnecke endet.
    bag.add(pillow(0.12, 0.3, 0.68, 0.035).geo.translate(s * 0.37, 0.5, 0.03), cloth);
    const roll = cyl(0.075, 0.075, 0.64, 0, 0, 0, 16);
    roll.rotateX(Math.PI / 2);
    roll.translate(s * 0.38, 0.655, 0.03);
    bag.add(roll, cloth);
    bag.add(new THREE.SphereGeometry(0.075, 16, 8).scale(1, 1, 0.35).translate(s * 0.38, 0.655, 0.35), cloth);
    bag.add(new THREE.SphereGeometry(0.075, 16, 8).scale(1, 1, 0.35).translate(s * 0.38, 0.655, -0.29), cloth);
    bag.add(new THREE.TorusGeometry(0.045, 0.008, 6, 18).translate(s * 0.38, 0.655, 0.375), dark);
    bag.add(new THREE.SphereGeometry(0.014, 8, 6).scale(1, 1, 0.5).translate(s * 0.38, 0.655, 0.376), dark);
    // Ohr: hinten hoch, vorn in einem Bogen zur Armlehne abfallend, oben leicht ausgestellt.
    const wing = pillow(0.1, 0.62, 0.38, 0.04, { n: 14 }).geo;
    const wp = wing.attributes.position;
    for (let i = 0; i < wp.count; i++) {
      const t = (wp.getY(i) + 0.31) / 0.62;
      const f = (wp.getZ(i) + 0.19) / 0.38;
      const y = -0.31 + t * 0.62 * (1 - 0.62 * THREE.MathUtils.smoothstep(f, 0.15, 1) ** 1.5);
      wp.setXYZ(i, wp.getX(i) + s * 0.05 * Math.max(0, (y + 0.31) / 0.62) ** 2, y, wp.getZ(i));
    }
    wing.computeVertexNormals();
    wing.rotateY(s * -0.12);
    bag.add(wing.translate(s * 0.355, 0.93, -0.15), cloth);
  }
  // Wolldecke: ein Zipfel liegt auf dem Kissen, der Rest fällt über die Kante zu Boden.
  if (plaid) bag.parts.push(plaidCloth());

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
