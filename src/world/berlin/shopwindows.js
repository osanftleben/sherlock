import * as THREE from 'three';
import { Bag, addMesh, box, cyl, merge, std } from '../kit.js';
import { clockFace, glassLettering, laceCurtain, softDisc, velvetDrape } from '../textures.js';

// Schaufenster und Fenster der fünf Schauplätze von Fall 1.
//
// Hinter einem Schaufenster (Achsentyp 'display') weicht der Hauskörper im Erdgeschoss
// um DISPLAY_RECESS zurück. Dort steht ein geschlossener Schaukasten mit der Auslage.
// Die Auslagen haben kein echtes Licht: Die Beleuchtung durch eine Lampe ist beim Bauen
// in die Vertexfarben gerechnet (MeshBasicMaterial). Das kostet nichts beim Zeichnen.
//
// Lokale Lage je Fensterachse (frame(bay) des Hauses): x quer, 0 = Mitte der Achse,
// y nach oben, z zur Straße hin, 0 = Fassadenebene.

export const DISPLAY_RECESS = 1.3;
const OPEN_W = 2.7; // Öffnung des Schaufensters
const OPEN_Y0 = 0.7;
const OPEN_Y1 = 3.45;
const GLASS_Z = -0.29;
const BACK_Z = -1.6;
// Fensterscheibe einer gewöhnlichen Erdgeschossachse ('ground')
const WIN = { w: 1.54, h: 2.24, y: 2.45 };

// Sammelt die Teile einer Auslage und rechnet beim Bauen das Licht einer Lampe hinein.
class Display {
  constructor({ lamp = [0, 3.2, -0.45], strength = 1, warm = [1, 0.84, 0.62], ambient = 0.14 } = {}) {
    this.parts = [];
    this.lamp = new THREE.Vector3(...lamp);
    this.strength = strength;
    this.warm = warm;
    this.ambient = ambient;
  }

  add(geo, color) {
    this.parts.push({ geo, color: new THREE.Color(color) });
    return geo;
  }

  box(color, w, h, d, x, y, z) {
    return this.add(box(w, h, d, x, y, z), color);
  }

  // Leerer Schaukasten hinter der Scheibe: Rückwand, Seiten, Decke, Boden.
  shell({ back, sides = back, ceiling = 0x1a120a, floor, floorY = 0.78 }) {
    const d = GLASS_Z - BACK_Z;
    const zc = (GLASS_Z + BACK_Z) / 2 - 0.01;
    const hw = OPEN_W / 2 + 0.02;
    this.box(back, OPEN_W + 0.1, OPEN_Y1 - OPEN_Y0 + 0.1, 0.04, 0, (OPEN_Y0 + OPEN_Y1) / 2, BACK_Z);
    for (const s of [-1, 1]) this.box(sides, 0.04, OPEN_Y1 - OPEN_Y0 + 0.1, d + 0.04, s * hw, (OPEN_Y0 + OPEN_Y1) / 2, zc);
    this.box(ceiling, OPEN_W + 0.1, 0.04, d + 0.04, 0, OPEN_Y1 + 0.02, zc);
    this.box(floor, OPEN_W + 0.1, floorY - OPEN_Y0 + 0.04, d + 0.04, 0, (OPEN_Y0 + floorY) / 2, zc);
  }

  bake(matrix, out) {
    const p = new THREE.Vector3();
    const n = new THREE.Vector3();
    const l = new THREE.Vector3();
    for (const { geo, color } of this.parts) {
      const g = geo.index ? geo.toNonIndexed() : geo;
      const pos = g.attributes.position;
      const nor = g.attributes.normal;
      const cols = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i);
        n.fromBufferAttribute(nor, i);
        l.subVectors(this.lamp, p);
        const d = l.length();
        const ndl = Math.max(0, n.dot(l) / d);
        const k = this.ambient + (1.6 * ndl * this.strength) / (1 + 0.3 * d * d);
        cols[i * 3] = color.r * k * this.warm[0];
        cols[i * 3 + 1] = color.g * k * this.warm[1];
        cols[i * 3 + 2] = color.b * k * this.warm[2];
      }
      g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2));
      g.applyMatrix4(matrix);
      out.push(g);
    }
  }
}

// Zifferblatt als Scheibe, Blick zur Straße (+z), um tilt nach hinten gekippt.
function dial(list, r, x, y, z, tilt = 0) {
  const g = new THREE.CircleGeometry(r, 20);
  g.rotateX(-tilt);
  g.translate(x, y, z);
  list.push(g);
}

// --- Uhrmacher Kessler ----------------------------------------------------------
// Der Laden ist dunkel, der Uhrmacher ist tot. Man sieht die Auslage nur im Schein
// der Laterne über der Tür und der Straßenlaterne, kühler und schwächer.
const STREETLIT = { lamp: [-1.2, 3.8, 1.6], strength: 2.6, warm: [0.95, 0.8, 0.62], ambient: 0.2 };

function watchmakerWatches(faces) {
  const d = new Display(STREETLIT);
  const velvet = 0x6a1a1e;
  d.shell({ back: 0x2e1c10, floor: velvet });
  // Treppe mit Samt bezogen
  const tiers = [[0.78, -0.62], [1.02, -0.98], [1.28, -1.34]];
  tiers.forEach(([top, z], i) => {
    if (i) d.box(velvet, OPEN_W - 0.1, top - 0.78, 0.36, 0, (top + 0.78) / 2, z);
  });
  // Taschenuhren auf kleinen Ständern, Ketten davor
  tiers.forEach(([top, z], i) => {
    const n = 6 - i;
    for (let k = 0; k < n; k++) {
      const x = (k - (n - 1) / 2) * 0.38;
      const r = 0.042 + ((k + i) % 3) * 0.006;
      d.box(0x2a1a10, 0.02, 0.09, 0.02, x, top + 0.045, z - 0.02);
      const tilt = 0.32;
      const caseGeo = cyl(r + 0.006, r + 0.006, 0.014, 0, 0, 0, 20);
      caseGeo.rotateX(Math.PI / 2 - tilt);
      caseGeo.translate(x, top + 0.11, z + 0.02);
      d.add(caseGeo, (k + i) % 4 === 1 ? 0xb8b8b0 : 0xc8a050);
      d.add(cyl(0.008, 0.008, 0.016, x, top + 0.12 + r, z + 0.02 - Math.sin(tilt) * r, 8), 0xc8a050);
      dial(faces, r, x, top + 0.11 + Math.sin(tilt) * 0.008, z + 0.02 + Math.cos(tilt) * 0.008, tilt);
      d.box(0xb89040, 0.18, 0.006, 0.012, x + 0.02, top + 0.004, z + 0.13);
    }
  });
  // Regulator an der Rückwand, rechts
  d.box(0x3a2010, 0.42, 1.0, 0.12, 0.85, 2.55, BACK_Z + 0.07);
  d.box(0x2a1608, 0.5, 0.08, 0.15, 0.85, 3.08, BACK_Z + 0.08);
  d.box(0xb59a55, 0.012, 0.45, 0.01, 0.85, 2.25, BACK_Z + 0.14);
  const bob = cyl(0.05, 0.05, 0.02, 0, 0, 0, 16);
  bob.rotateX(Math.PI / 2);
  bob.translate(0.85, 2.04, BACK_Z + 0.14);
  d.add(bob, 0xb59a55);
  dial(faces, 0.15, 0.85, 2.82, BACK_Z + 0.135);
  // Zwei Kaminuhren oben auf der Treppe
  for (const x of [-0.85, -0.25]) {
    d.box(0x4a2a14, 0.32, 0.3, 0.14, x, 1.28 + 0.15, -1.36);
    d.box(0x3a2010, 0.36, 0.04, 0.17, x, 1.28 + 0.32, -1.36);
    d.add(cyl(0.035, 0.035, 0.02, x, 1.28 + 0.36, -1.36, 10), 0xb59a55);
    dial(faces, 0.09, x, 1.28 + 0.17, -1.285);
  }
  return d;
}

function watchmakerClocks(faces) {
  const d = new Display(STREETLIT);
  d.shell({ back: 0x2e1c10, floor: 0x3a2414 });
  // Standuhr links
  const x = -0.75;
  const z = -1.3;
  const walnut = 0x4a2a14;
  d.box(walnut, 0.5, 0.42, 0.34, x, 0.99, z);
  d.box(walnut, 0.38, 1.08, 0.26, x, 1.74, z);
  d.box(0x3a1e0c, 0.3, 0.9, 0.01, x, 1.74, z + 0.135);
  d.box(walnut, 0.5, 0.6, 0.34, x, 2.58, z);
  d.box(0x3a1e0c, 0.56, 0.08, 0.38, x, 2.92, z);
  d.box(0x3a1e0c, 0.3, 0.12, 0.2, x, 3.02, z);
  const bob = cyl(0.07, 0.07, 0.015, 0, 0, 0, 16);
  bob.rotateX(Math.PI / 2);
  bob.translate(x, 1.5, z + 0.145);
  d.add(bob, 0xc8a050);
  d.box(0xb59a55, 0.012, 0.5, 0.008, x, 1.78, z + 0.142);
  dial(faces, 0.18, x, 2.6, z + 0.175);
  // Wanduhren an der Rückwand
  for (const [wx, wy, r] of [[0.1, 2.75, 0.16], [0.68, 2.25, 0.13], [0.95, 2.95, 0.12], [0.45, 3.12, 0.09]]) {
    const body = cyl(r + 0.035, r + 0.035, 0.07, 0, 0, 0, 20);
    body.rotateX(Math.PI / 2);
    body.translate(wx, wy, BACK_Z + 0.06);
    d.add(body, 0x3a2412);
    dial(faces, r, wx, wy, BACK_Z + 0.1);
  }
  // Tischchen mit Weckern
  d.box(0x3a2010, 0.8, 0.05, 0.42, 0.5, 1.28, -0.75);
  for (const sx of [-1, 1]) d.box(0x3a2010, 0.04, 0.5, 0.04, 0.5 + sx * 0.36, 1.03, -0.75);
  for (const [wx, s] of [[0.28, 1], [0.52, 0.85], [0.74, 1.1]]) {
    const r = 0.065 * s;
    const body = cyl(r, r, 0.045, 0, 0, 0, 16);
    body.rotateX(Math.PI / 2);
    body.translate(wx, 1.31 + r, -0.72);
    d.add(body, 0xb08a3a);
    for (const bx of [-0.6, 0.6]) {
      d.add(new THREE.SphereGeometry(r * 0.38, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(wx + bx * r, 1.31 + r * 1.85, -0.72), 0xc8a050);
    }
    dial(faces, r * 0.86, wx, 1.31 + r, -0.695);
  }
  return d;
}

// --- Apotheke zum Schwarzen Adler -----------------------------------------------
// Ein großes gefärbtes Schaugefäß je Fenster, rot und grün, dazu Standgefäße.
function apothecary(scene, matrix, color, out) {
  const d = new Display({ lamp: [0, 3.25, -0.5], strength: 1.1 });
  d.shell({ back: 0xd8ccb0, sides: 0xc8bca0, ceiling: 0x6a5a48, floor: 0x3a2414 });
  // Sockel
  d.box(0x3a2212, 0.5, 0.62, 0.5, 0, 1.09, -1.0);
  d.box(0x5a3820, 0.56, 0.04, 0.56, 0, 1.42, -1.0);
  d.add(cyl(0.12, 0.14, 0.05, 0, 1.465, -1.0, 16), 0xb59a55);
  // Borde mit Standgefäßen links und rechts
  for (const s of [-1, 1]) {
    for (const [y, z] of [[1.15, -1.3], [1.75, -1.42]]) {
      d.box(0x5a3820, 0.72, 0.03, 0.26, s * 0.88, y, z);
      d.box(0x3a2212, 0.03, y - 0.78, 0.03, s * 0.88 + s * 0.33, (y + 0.78) / 2, z);
      for (let k = 0; k < 3; k++) {
        const jx = s * 0.88 + (k - 1) * 0.22;
        const h = 0.2 + ((k + (s > 0 ? 1 : 0)) % 2) * 0.05;
        d.add(cyl(0.065, 0.07, h, jx, y + 0.015 + h / 2, z, 14), 0xeae6dc);
        d.add(cyl(0.072, 0.072, 0.06, jx, y + 0.015 + h * 0.55, z, 14), 0x1a1612);
        d.add(cyl(0.05, 0.068, 0.03, jx, y + 0.03 + h, z, 14), 0x2a2a2a);
      }
    }
  }
  // Mörser und Pistill vorn
  d.add(cyl(0.11, 0.08, 0.13, -0.45, 0.845, -0.55, 16), 0x8a6a3a);
  const pestle = cyl(0.018, 0.024, 0.28, 0, 0.14, 0, 8);
  pestle.rotateZ(0.5);
  pestle.translate(-0.42, 0.86, -0.55);
  d.add(pestle, 0x9a7a4a);
  d.bake(matrix, out);

  // Schaugefäß: bauchiger Kolben mit langem Hals, von hinten durchleuchtet.
  const pts = [[0, 0], [0.07, 0], [0.13, 0.04], [0.17, 0.14], [0.16, 0.25], [0.11, 0.32], [0.045, 0.36], [0.038, 0.5], [0.055, 0.52], [0.0, 0.52]]
    .map(([a, b]) => new THREE.Vector2(a * 1.9, b * 1.9));
  const globeGeo = new THREE.LatheGeometry(pts, 28);
  globeGeo.translate(0, 1.49, -1.0);
  const stopper = new THREE.SphereGeometry(0.11, 14, 10).translate(0, 1.49 + 1.06, -1.0);
  const geo = merge([globeGeo, stopper]);
  geo.applyMatrix4(matrix);
  const glow = new THREE.Color(color).multiplyScalar(1.6);
  addMesh(scene, geo, new THREE.MeshBasicMaterial({ color: glow }));
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('glow'), color, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.position.set(0, 1.8, -0.9).applyMatrix4(matrix);
  s.scale.setScalar(2.2);
  scene.add(s);
}

// --- Destille „Zur Goldenen Schrippe“ --------------------------------------------
// Blick in die Gaststube: unten eine Scheibengardine, darüber Flaschenborde im Lampenlicht.
function destille() {
  const d = new Display({ lamp: [0, 3.0, -0.9], strength: 1.2, warm: [1, 0.78, 0.5] });
  d.shell({ back: 0x5a3a24, sides: 0x4a2e1c, ceiling: 0x3a2818, floor: 0x2a1a10 });
  d.box(0x3a2414, OPEN_W, 0.9, 0.03, 0, 1.25, BACK_Z + 0.03); // Holzvertäfelung
  const glass = [0x2a5a2a, 0x5a3010, 0x8a9a88, 0x3a4a20, 0x6a2a10];
  [2.25, 2.85].forEach((y, row) => {
    d.box(0x4a2e18, OPEN_W - 0.2, 0.03, 0.22, 0, y, BACK_Z + 0.13);
    for (let k = 0; k < 9; k++) {
      const x = -1.05 + k * 0.26;
      const c = glass[(k * 3 + row) % glass.length];
      const h = 0.24 + ((k + row) % 3) * 0.03;
      d.add(cyl(0.04, 0.042, h, x, y + 0.015 + h / 2, BACK_Z + 0.13, 10), c);
      d.add(cyl(0.014, 0.03, 0.09, x, y + 0.06 + h, BACK_Z + 0.13, 8), c);
    }
  });
  // Hängelampe
  d.box(0x1a1610, 0.015, 0.35, 0.015, 0, 3.27, -0.9);
  d.add(cyl(0.1, 0.22, 0.12, 0, 3.05, -0.9, 14), 0x2a3020);
  // Scheibengardine an einer Messingstange
  d.box(0xb08a3a, OPEN_W - 0.1, 0.025, 0.025, 0, 1.92, -0.36);
  for (let k = 0; k < 18; k++) {
    const x = -1.28 + k * 0.15;
    d.box(0xe0d4b4, 0.15, 1.14, 0.01, x + 0.075, 1.34, -0.37 + (k % 2) * 0.03);
  }
  return d;
}

export function buildShopWindows(loc, { kessler, apotheke, destille: schrippe, bank, pension }) {
  const { scene } = loc;
  const baked = [];
  const faces = [];

  const placeFaces = (list, matrix) => {
    for (const g of list) faces.push(g.applyMatrix4(matrix));
  };
  const watchFaces = [];
  watchmakerWatches(watchFaces).bake(kessler.frame(2), baked);
  placeFaces(watchFaces, kessler.frame(2));
  const clockFaces = [];
  watchmakerClocks(clockFaces).bake(kessler.frame(3), baked);
  placeFaces(clockFaces, kessler.frame(3));
  apothecary(scene, apotheke.frame(0), 0xd01810, baked);
  apothecary(scene, apotheke.frame(2), 0x18b030, baked);
  for (const bay of [0, 2]) destille().bake(schrippe.frame(bay), baked);

  addMesh(scene, merge(baked), new THREE.MeshBasicMaterial({ vertexColors: true }));
  // Zifferblätter aller Uhren in Kesslers Fenster. Er zog sie freitags um acht alle auf,
  // sie gehen gleich (siehe Hinweis „Frisch aufgezogen“).
  addMesh(scene, merge(faces), new THREE.MeshBasicMaterial({ map: clockFace(9, 40), color: new THREE.Color(0.5, 0.44, 0.36) }));

  // Scheiben vor den Auslagen
  const panes = [];
  const pane = (bld, bay) => {
    const g = new THREE.PlaneGeometry(OPEN_W, OPEN_Y1 - OPEN_Y0);
    g.translate(0, (OPEN_Y0 + OPEN_Y1) / 2, GLASS_Z);
    g.applyMatrix4(bld.frame(bay));
    panes.push(g);
  };
  for (const bay of [2, 3]) pane(kessler, bay);
  for (const bay of [0, 2]) pane(apotheke, bay);
  for (const bay of [0, 2]) pane(schrippe, bay);
  const glassMesh = addMesh(scene, merge(panes), std({ color: 0x10161e, roughness: 0.05, metalness: 0.8, transparent: true, opacity: 0.2, depthWrite: false }));
  glassMesh.renderOrder = 1;

  // Goldschrift auf den Scheiben der Destille
  const letter = (bay, lines) => {
    const g = new THREE.PlaneGeometry(2.5, 1.25);
    g.translate(0, 2.62, GLASS_Z + 0.005);
    g.applyMatrix4(schrippe.frame(bay));
    const m = addMesh(scene, g, new THREE.MeshBasicMaterial({ map: glassLettering(lines), color: new THREE.Color(0.85, 0.75, 0.55), transparent: true, depthWrite: false }));
    m.renderOrder = 2;
  };
  letter(0, ['Destillation', 'Liqueure · Korn', 'Berliner Weiße']);
  letter(2, ['Frühstücksstube', 'Mittagstisch', 'Kaffee · Bouillon']);

  // Pension Puhlmann: Spitzengardinen, drei Fenster erleuchtet.
  const curtain = (bld, bay) => {
    const g = new THREE.PlaneGeometry(WIN.w, WIN.h);
    g.translate(0, WIN.y, GLASS_Z + 0.002);
    g.applyMatrix4(bld.frame(bay));
    return g;
  };
  addMesh(scene, merge([0, 1, 3].map((b) => curtain(pension, b))), new THREE.MeshBasicMaterial({ map: laceCurtain(), color: new THREE.Color(1.15, 1.0, 0.85) }));
  addMesh(scene, merge([4, 5].map((b) => curtain(pension, b))), new THREE.MeshBasicMaterial({ map: laceCurtain(), color: new THREE.Color(0.12, 0.1, 0.09) }));

  // Bankhaus Lindner & Sohn: zugezogene Samtvorhänge hinter eisernen Gittern.
  const bankBays = [0, 1, 3, 4, 5];
  addMesh(scene, merge(bankBays.map((b) => curtain(bank, b))), std({ map: velvetDrape(), roughness: 0.9 }));
  const bars = new Bag();
  for (const b of bankBays) {
    const local = new Bag();
    for (let k = 0; k < 9; k++) local.box(0x15181a, 0.028, WIN.h + 0.06, 0.028, -0.72 + k * 0.18, WIN.y, -0.06);
    for (const y of [WIN.y - WIN.h / 2 + 0.25, WIN.y + WIN.h / 2 - 0.25]) local.box(0x15181a, WIN.w + 0.06, 0.05, 0.012, 0, y, -0.04);
    const g = local.build();
    g.applyMatrix4(bank.frame(b));
    bars.parts.push(g);
  }
  addMesh(scene, bars.build(), std({ vertexColors: true, roughness: 0.5, metalness: 0.6 }));
}
