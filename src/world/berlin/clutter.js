import * as THREE from 'three';
import { Bag, addMesh, box, cyl, std } from '../kit.js';
import { rng } from '../textures.js';

// Kram vor den Läden: Lattenkisten, Fässer, Säcke und hier und da ein Handkarren. Um zwanzig
// vor zehn ist die Ware hereingeholt, draußen steht, was der Händler morgen früh wieder braucht.
// Was davor steht, hängt von der Ladensorte ab: beim Kolonialwarenhändler Fässer, Säcke und
// Kartoffelkisten, beim Bäcker Brotkisten, beim Fleischer das Pökelfass; feine Läden bleiben fast
// immer frei.
//
// Alles steht dicht an der Fassade (bis 0,95 m davor), die Passanten gehen 1,4 m davor
// (traffic.js). Eigener Zufall, damit Häuser, Verkehr und Wetter bleiben, wie sie sind.

const SIDEWALK = 0.13;
const WOOD = [0x6a5440, 0x5e4a36, 0x76604a, 0x544232];
const IRON = 0x1e1c1a;
// Wer davor zu tun hat, braucht Platz: Türen, Fundstellen, Figuren.
const KEEP_CLEAR = 5;

// Was je Ladensorte davor stehen kann, mit Gewicht. null: nichts.
const BY_KIND = {
  kolonial: [['barrels', 3], ['sacks', 3], ['crates', 3], [null, 2]],
  baecker: [['breadCrates', 4], ['crates', 1], [null, 3]],
  fleischer: [['brine', 3], ['crates', 1], [null, 3]],
  zigarren: [['crates', 1], [null, 4]],
  tuche: [['crates', 1], [null, 6]],
  hut: [[null, 1]],
  buch: [['crates', 1], [null, 6]],
};

export function buildClutter(loc, shopFronts) {
  const r = rng(1894);
  const wood = new Bag();
  const iron = new Bag();
  const cloth = new Bag();
  const tone = () => new THREE.Color(WOOD[Math.floor(r() * WOOD.length)]).multiplyScalar(0.85 + r() * 0.3);

  const avoid = [
    ...Object.values(loc.anchors).map((a) => a.pos),
    ...Object.values(loc.doorMarks ?? {}),
    ...loc.hotspots.map((h) => h.pos),
  ];
  // Nur innerhalb der Sperren (index.js barrier), dahinter sieht es niemand aus der Nähe.
  const reachable = (p) => p.z > -186 && p.x < 125 && p.x > -166;

  // Lattenkiste w × h × d, Boden bei y = 0: Eckpfosten, je Seite drei Latten mit Fugen.
  const crate = (parts, w, h, d, fill = null) => {
    const c = tone();
    parts.push([box(w - 0.02, 0.02, d - 0.02, 0, 0.01, 0), c.clone().multiplyScalar(0.7)]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push([box(0.04, h, 0.04, sx * (w / 2 - 0.02), h / 2, sz * (d / 2 - 0.02)), c.clone().multiplyScalar(0.9)]);
    const n = 3;
    const sh = h / n - 0.025;
    for (let i = 0; i < n; i++) {
      const y = (i + 0.5) * (h / n);
      for (const s of [-1, 1]) {
        parts.push([box(w, sh, 0.016, 0, y, s * (d / 2 - 0.008)), c.clone().multiplyScalar(0.92 + r() * 0.16)]);
        parts.push([box(0.016, sh, d - 0.03, s * (w / 2 - 0.008), y, 0), c.clone().multiplyScalar(0.92 + r() * 0.16)]);
      }
    }
    if (fill) {
      // Rest im Kasten: ein flacher Haufen Kartoffeln oder Kohlköpfe.
      const [color, size, count] = fill;
      for (let i = 0; i < count; i++) {
        const g = new THREE.SphereGeometry(size * (0.8 + r() * 0.4), 6, 4).scale(1, 0.8, 1);
        g.translate((r() - 0.5) * (w - 0.12), h * 0.55 + r() * 0.05, (r() - 0.5) * (d - 0.12));
        parts.push([g, new THREE.Color(color).multiplyScalar(0.8 + r() * 0.35)]);
      }
    }
  };

  // Fass mit Bauch, Deckel und vier Eisenreifen.
  const barrel = (parts, h = 0.72, rad = 0.25) => {
    const prof = [[0, 0], [rad * 0.84, 0], [rad * 0.94, h * 0.18], [rad, h * 0.5], [rad * 0.94, h * 0.82], [rad * 0.84, h], [0, h]];
    parts.push([new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 16), tone()]);
    for (const k of [0.07, 0.24, 0.76, 0.93]) {
      const y = k * h;
      const t = Math.abs(y - h / 2) / (h / 2);
      parts.push([new THREE.TorusGeometry(rad * (1 - 0.16 * t * t) + 0.004, 0.008, 4, 18).rotateX(Math.PI / 2).translate(0, y, 0), 'iron']);
    }
  };

  // Gefüllter Sack, oben zugebunden, etwas zusammengesackt.
  const sack = (parts) => {
    const g = new THREE.SphereGeometry(1, 10, 8);
    const p = g.attributes.position;
    const seed = r() * 10;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const k = 1 + 0.08 * Math.sin(p.getX(i) * 7 + seed) * Math.sin(p.getZ(i) * 5 + y * 3);
      // Unten breit und flach auf dem Pflaster, oben schmaler.
      const spread = y < 0 ? 1.15 : 1 - 0.25 * y;
      p.setXYZ(i, p.getX(i) * k * spread, (y < -0.6 ? -0.6 : y) * k, p.getZ(i) * k * spread);
    }
    g.computeVertexNormals();
    g.scale(0.2, 0.28, 0.16).translate(0, 0.17, 0);
    const c = new THREE.Color(0x7a6a4c).multiplyScalar(0.8 + r() * 0.3);
    parts.push([g, ['cloth', c]]);
    parts.push([cyl(0.035, 0.05, 0.08, 0, 0.47, 0, 8), ['cloth', c.clone().multiplyScalar(0.9)]]);
    parts.push([new THREE.TorusGeometry(0.037, 0.008, 4, 10).rotateX(Math.PI / 2).translate(0, 0.45, 0), ['cloth', new THREE.Color(0x4a3e2c)]]);
  };

  // Zweirädriger Handkarren, längs zur Fassade, die Deichsel auf dem Pflaster.
  const cart = (parts) => {
    const c = tone();
    const bedY = 0.5;
    parts.push([box(1.1, 0.04, 0.62, 0, bedY, 0), c]);
    for (const s of [-1, 1]) parts.push([box(1.1, 0.16, 0.03, 0, bedY + 0.1, s * 0.3), c.clone().multiplyScalar(0.9)]);
    parts.push([box(0.03, 0.16, 0.62, 0.55, bedY + 0.1, 0), c.clone().multiplyScalar(0.9)]);
    // Achse, Räder mit eisernem Reif und Speichen
    parts.push([cyl(0.025, 0.025, 0.78, 0, 0, 0, 6).rotateX(Math.PI / 2).translate(0.1, 0.38, 0), 'iron']);
    for (const s of [-1, 1]) {
      const z = s * 0.37;
      parts.push([new THREE.TorusGeometry(0.36, 0.022, 5, 24).translate(0.1, 0.38, z), c.clone().multiplyScalar(0.8)]);
      parts.push([new THREE.TorusGeometry(0.38, 0.008, 4, 24).translate(0.1, 0.38, z), 'iron']);
      parts.push([cyl(0.05, 0.05, 0.08, 0, 0, 0, 8).rotateX(Math.PI / 2).translate(0.1, 0.38, z), c.clone().multiplyScalar(0.7)]);
      for (let k = 0; k < 10; k++) {
        const spoke = box(0.02, 0.34, 0.02, 0, 0.17, 0);
        spoke.rotateZ((k / 10) * Math.PI * 2);
        parts.push([spoke.translate(0.1, 0.38, z), c.clone().multiplyScalar(0.85)]);
      }
    }
    // Deichsel: zwei Holme vom Wagenkasten schräg aufs Pflaster, vorn ein Quergriff.
    for (const s of [-1, 1]) {
      const pole = box(1.0, 0.04, 0.04, 0, 0, 0);
      pole.rotateZ(0.47);
      parts.push([pole.translate(-1.0, 0.27, s * 0.24), c.clone().multiplyScalar(0.85)]);
    }
    parts.push([box(0.04, 0.04, 0.56, -1.44, 0.06, 0), c.clone().multiplyScalar(0.85)]);
    // Stütze unter dem hinteren Ende, damit der Kasten waagrecht steht.
    parts.push([box(0.04, bedY, 0.04, 0.5, bedY / 2, 0), c.clone().multiplyScalar(0.8)]);
    // Ladung: ein, zwei Säcke oder eine leere Kiste.
    const load = [];
    if (r() < 0.5) for (let i = 0, n = 1 + Math.floor(r() * 2); i < n; i++) {
      const sub = [];
      sack(sub);
      for (const [g, k] of sub) load.push([g.rotateZ(Math.PI / 2 - 0.2).translate(-0.15 + i * 0.4, bedY + 0.2, (r() - 0.5) * 0.1), k]);
    } else if (r() < 0.6) {
      crate(load, 0.6, 0.3, 0.42);
      for (const part of load) part[0].rotateY(0.2).translate(0.1, bedY + 0.02, 0);
    }
    parts.push(...load);
    // Von x -1,46 bis 0,57: mittig um den Ursprung legen.
    for (const [g] of parts) g.translate(0.45, 0, 0);
  };

  // Teile einer Gruppe (lokal um ihren Mittelpunkt) in die Welt setzen und die Grundfläche sperren.
  const place = (frame, lx, lz, rot, parts, half) => {
    const m = new THREE.Matrix4().multiplyMatrices(frame, new THREE.Matrix4().makeTranslation(lx, SIDEWALK, lz).multiply(new THREE.Matrix4().makeRotationY(rot)));
    for (const [g, c] of parts) {
      g.applyMatrix4(m);
      if (c === 'iron') iron.add(g, IRON);
      else if (Array.isArray(c) && c[0] === 'cloth') cloth.add(g, c[1]);
      else wood.add(g, c);
    }
    const pts = [[-half[0], -half[1]], [half[0], -half[1]], [-half[0], half[1]], [half[0], half[1]]].map(([x, z]) => new THREE.Vector3(x, 0, z).applyMatrix4(m));
    loc.collide(Math.min(...pts.map((p) => p.x)), Math.max(...pts.map((p) => p.x)), Math.min(...pts.map((p) => p.z)), Math.max(...pts.map((p) => p.z)));
  };

  // Eine Gruppe vor der Achse. side: Ende der Achse (0 links, 1 rechts), damit Karren und Kram
  // sich nicht ins Gehege kommen. Lokale Lage: x längs der Fassade (Achsmitte 0), z davor.
  const group = (frame, what, side) => {
    const lx = (side ? 1 : -1) * (0.85 + r() * 0.35);
    const jitter = () => (r() - 0.5) * 0.25;
    const parts = [];
    let half = [0.4, 0.3];
    let lz = 0.42;
    if (what === 'crates' || what === 'breadCrates') {
      const bread = what === 'breadCrates';
      const [w, h, d] = bread ? [0.7, 0.16, 0.45] : [0.6, 0.3, 0.42];
      const high = bread ? 2 + Math.floor(r() * 3) : 1 + Math.floor(r() * 2);
      const fill = !bread && r() < 0.5 ? (r() < 0.6 ? [0x8a6a42, 0.035, 14] : [0x5a7040, 0.07, 5]) : null;
      for (let i = 0; i < high; i++) {
        const sub = [];
        crate(sub, w, h, d, i === high - 1 ? fill : null);
        const a = jitter() * 0.4;
        for (const [g, c] of sub) parts.push([g.rotateY(a).translate(jitter() * 0.15, i * h, jitter() * 0.1), c]);
      }
      // Daneben manchmal eine zweite, einzelne Kiste
      if (!bread && r() < 0.5) {
        const sub = [];
        crate(sub, w, h, d);
        const a = 0.3 + jitter();
        for (const [g, c] of sub) parts.push([g.rotateY(a).translate(side ? -0.7 : 0.7, 0, 0.05), c]);
        half = [0.75, 0.32];
      }
    } else if (what === 'barrels' || what === 'brine') {
      const n = what === 'brine' ? 1 : 1 + Math.floor(r() * 2);
      for (let i = 0; i < n; i++) {
        const sub = [];
        barrel(sub, what === 'brine' ? 0.62 : 0.72, what === 'brine' ? 0.24 : 0.26);
        for (const [g, c] of sub) parts.push([g.translate((i - (n - 1) / 2) * 0.56, 0, jitter() * 0.1), c]);
      }
      if (what === 'brine') {
        // Holzdeckel mit Stein darauf
        parts.push([cyl(0.2, 0.2, 0.03, 0, 0.635, 0, 14), tone()]);
        parts.push([new THREE.DodecahedronGeometry(0.07, 0).scale(1.2, 0.7, 1).translate(0.02, 0.68, 0), new THREE.Color(0x5a5650)]);
      }
      half = [0.3 + (n - 1) * 0.28, 0.3];
      lz = 0.36;
    } else if (what === 'sacks') {
      const n = 2 + Math.floor(r() * 2);
      for (let i = 0; i < n; i++) {
        const sub = [];
        sack(sub);
        const a = r() * Math.PI;
        for (const [g, c] of sub) parts.push([g.rotateY(a).rotateX(-0.15).translate((i - (n - 1) / 2) * 0.36, 0, jitter() * 0.1), c]);
      }
      half = [0.2 + n * 0.18, 0.24];
      lz = 0.3;
    }
    // In der eigenen Achse bleiben: Nebenan kann eine Haustür sein.
    const x = Math.sign(lx) * Math.min(Math.abs(lx), 1.6 - half[0]);
    if (parts.length) place(frame, x, lz, jitter() * 0.15, parts, half);
  };

  let carts = 0;
  for (const shop of shopFronts) {
    const frame = new THREE.Matrix4().multiplyMatrices(shop.matrix, new THREE.Matrix4().makeTranslation(1.7, 0, 0));
    const centre = new THREE.Vector3().setFromMatrixPosition(frame);
    if (!reachable(centre) || avoid.some((p) => Math.hypot(p.x - centre.x, p.z - centre.z) < KEEP_CLEAR)) continue;
    const options = BY_KIND[shop.kind] ?? [[null, 1]];
    let pick = r() * options.reduce((s, [, w]) => s + w, 0);
    const [what] = options.find(([, w]) => (pick -= w) < 0) ?? [null];
    // Ab und zu steht stattdessen ein Handkarren davor, egal vor welchem Laden.
    if (r() < 0.07) {
      const parts = [];
      cart(parts);
      place(frame, 0, 0.55, (r() < 0.5 ? 0 : Math.PI) + (r() - 0.5) * 0.08, parts, [1.02, 0.42]);
      carts++;
    } else if (what) {
      group(frame, what, r() < 0.5 ? 0 : 1);
    }
  }

  const { scene } = loc;
  if (wood.parts.length) addMesh(scene, wood.build(), std({ vertexColors: true, roughness: 0.85 }));
  if (cloth.parts.length) addMesh(scene, cloth.build(), std({ vertexColors: true, roughness: 1 }));
  if (iron.parts.length) addMesh(scene, iron.build(), std({ vertexColors: true, roughness: 0.6, metalness: 0.5 }));
  return carts;
}
