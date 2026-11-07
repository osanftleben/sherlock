import * as THREE from 'three';
import { addMesh, box, cyl, std } from '../kit.js';
import { marble, portrait, rng, softDisc, stockList, signTexture, wallpaper, wood } from '../textures.js';
import { Room } from './room.js';
import { gasolier, rug, streetGlow, wainscot } from './fittings.js';

export function buildBank() {
  const room = new Room({
    id: 'bank',
    name: 'Bankhaus Lindner & Sohn',
    w: 9,
    d: 7,
    h: 3.8,
    // Helle, warm-graue Tapete über der dunklen Eichenvertäfelung, Stuckdecke: ein Kontor,
    // das Vertrauen erwecken soll, kein Hinterzimmer.
    wall: wallpaper('#8a7c62', 'rgba(235,215,165,0.16)', 75, 0.035),
    floor: wood([86, 50, 30], 66),
    ceiling: 0xa0967f,
    ambient: 0.5,
  });
  const { loc } = room;
  const r = rng(1414);

  // Hohe Vertäfelung, Stuckleiste, Läufer von der Tür zum Schreibtisch
  wainscot(room, 'north', -4.5, 4.5, 1.3);
  wainscot(room, 'west', -3.5, 3.5, 1.3);
  wainscot(room, 'east', -3.5, 3.5, 1.3);
  wainscot(room, 'south', -4.5, -0.7, 1.3);
  wainscot(room, 'south', 0.7, 4.5, 1.3);
  stuccoCeiling(room, 0, 0.9);
  rug(room, 0, 1.6, 1.4, 3.4, 0x3a1a18, 0x6a5a3a);

  // Wendts Schreibtisch: Doppelpult mit Schubladen zur Besucherseite, grünes Leder
  room.woodBag.box(0x4a2a16, 2.6, 0.82, 1.1, 0, 0.41, -1.3);
  room.woodBag.box(0x6a3e20, 2.7, 0.05, 1.2, 0, 0.84, -1.3);
  room.roundEdge(0x6a3e20, 0, 0.84, -1.3, 2.7, 1.2, 0.026);
  room.woodBag.box(0x2e1a0c, 2.64, 0.08, 1.14, 0, 0.04, -1.3);
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
  // Mitten auf der grünen Schreibunterlage, eine Armlänge vor Wendt: Dort legt er im Fall 1 seine
  // Uhr hin. Die XII zeigt zum Besucher, gelesen wird sie von Wendts Seite.
  loc.anchor('savonnette', 0.05, 0.869, -1.36, Math.PI - 0.4);
  loc.anchor('wendtsUhr', 0.05, 0.89, -1.36);

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
  greenLamp(room, 2.36, 0.81, -2.46, 0.9);
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
  // Die Gaskrone wirft Schatten: Vor der hellen Tapete schwebten Möbel und Figuren sonst im Licht.
  room.shadows(gasolier(room, 0, 0.9, 0.6));
  streetGlow(room, [5.0, 2.8, 0.8], [2.0, 0, 0.2]);
  streetGlow(room, [-5.0, 2.8, 0.8], [-3.0, 0.8, 1.0]);

  loc.anchor('wendt', 0.2, 0, -2.0, 0);
  loc.anchor('kassierer', -3.95, 0, 1.0, Math.PI / 2);
  // Neben der Tür, den Blick in den Raum: Wer hereinkommt, geht an ihm vorbei.
  loc.anchor('portier', 1.45, 0, 2.75, -Math.PI / 2 - 0.5);
  return room.finish();
}

// --- Ausstattung des Bankhauses --------------------------------------------------

// Stuck: getrepptes Kranzgesims mit Perlstab und Fries rundum, zwei Rahmenleisten als
// Deckenspiegel und eine Rosette über der Gaskrone (gx, gz).
function stuccoCeiling(room, gx, gz) {
  const { w, d, h } = room;
  const hw = w / 2;
  const hd = d / 2;
  const steps = [
    // [Ausladung, Höhe, Unterkante unter der Decke, Farbe]
    [0.22, 0.07, 0.07, 0xd6cdb6],
    [0.17, 0.05, 0.12, 0xcec5ae],
    [0.12, 0.05, 0.17, 0xd2c9b2],
    [0.08, 0.04, 0.21, 0xc8bfa8],
    [0.1, 0.03, 0.24, 0xdad1ba],
    [0.035, 0.18, 0.42, 0xcac1aa],
    [0.06, 0.025, 0.445, 0xd4cbb4],
  ];
  for (const [out, hh, under, color] of steps) {
    const y = h - under + hh / 2;
    for (const s of [-1, 1]) {
      room.plainBag.box(color, w, hh, out, 0, y, s * (hd - out / 2));
      room.plainBag.box(color, out, hh, d, s * (hw - out / 2), y, 0);
    }
  }
  // Deckenspiegel: äußere breite und innere schmale Leiste.
  for (const [inset, bw, bh] of [[0.75, 0.1, 0.04], [0.95, 0.05, 0.025]]) {
    const x = hw - inset;
    const z = hd - inset;
    for (const s of [-1, 1]) {
      room.plainBag.box(0xd8cfb8, 2 * x + bw, bh, bw, 0, h - bh / 2, s * z);
      room.plainBag.box(0xd8cfb8, bw, bh, 2 * z, s * x, h - bh / 2, 0);
    }
  }
  // Rosette: flache Kuppel mit Blattkranz, nach unten aufsteigende Punkte für Normalen nach außen.
  const prof = [[0, h - 0.06], [0.06, h - 0.058], [0.11, h - 0.045], [0.15, h - 0.05], [0.2, h - 0.035], [0.25, h - 0.04], [0.3, h - 0.022], [0.34, h - 0.012], [0.36, h]];
  room.plainBag.add(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 24).translate(gx, 0, gz), 0xdcd3bc);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const leaf = new THREE.SphereGeometry(1, 6, 4).scale(0.07, 0.02, 0.03).rotateY(-a).translate(gx + Math.cos(a) * 0.24, h - 0.045, gz + Math.sin(a) * 0.24);
    room.plainBag.add(leaf, 0xd2c9b2);
  }
  // Rußhof der Gasflammen um die Rosette, sonst überstrahlt die Decke über der Krone.
  const soot = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 2.4).rotateX(Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: softDisc('glow'), color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  soot.position.set(gx, h - 0.004, gz);
  room.scene.add(soot);
}

// Petroleum-Pultlampe, wie sie 1892 in einem Kontor stand (die elektrische grüne Bankerlampe
// kam erst 1909): Messingfuß, gläserner Ölbehälter, Brenner, Glaszylinder mit Flamme und
// eine Kappe aus grünem Glas, innen weiß. Das Licht sitzt in der Flamme an der Schirmkante.
const SHADE = [[0.13, 0], [0.11, 0.025], [0.07, 0.07], [0.045, 0.1]];
let shadeMat = null;
function greenLamp(room, x, y, z, intensity) {
  const brass = 0xb59a55;
  const turn = (pts, seg = 16) => new THREE.LatheGeometry(pts.map(([pr, py]) => new THREE.Vector2(pr, py)), seg).translate(x, y, z);
  room.metalBag.add(turn([[0, 0], [0.075, 0], [0.075, 0.012], [0.05, 0.03], [0.018, 0.05], [0.013, 0.2], [0.022, 0.21], [0, 0.215]]), brass);
  room.glassBag.add(new THREE.SphereGeometry(0.06, 14, 10).scale(1, 0.72, 1).translate(x, y + 0.255, z), 0xd8c89a);
  room.metalBag.add(cyl(0.028, 0.033, 0.035, x, y + 0.31, z, 12), brass);
  room.metalBag.add(new THREE.TorusGeometry(0.055, 0.004, 4, 16).rotateX(Math.PI / 2).translate(x, y + 0.355, z), brass);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    room.metalBag.add(cyl(0.003, 0.003, 0.03, x + Math.cos(a) * 0.04, y + 0.34, z + Math.sin(a) * 0.04, 4), brass);
  }
  // Zylinder und Flamme leuchten selbst, die Kappe sitzt knapp über dem Brenner.
  room.glowBag.add(cyl(0.022, 0.024, 0.16, x, y + 0.41, z, 12), new THREE.Color(0.75, 0.5, 0.26));
  room.glowBag.add(new THREE.SphereGeometry(0.011, 8, 6).scale(1, 2.2, 1).translate(x, y + 0.37, z), new THREE.Color(2.4, 1.5, 0.6));
  shadeMat ??= new THREE.MeshStandardMaterial({ color: 0x1a5a32, emissive: 0x0e3a1c, roughness: 0.25 });
  addMesh(room.scene, turn(SHADE, 24).translate(0, 0.36, 0), shadeMat);
  room.glowBag.add(turn(SHADE.map(([pr, py]) => [pr * 0.96, py - 0.003]).reverse(), 24).translate(0, 0.36, 0), new THREE.Color(0.62, 0.5, 0.34));
  const l = new THREE.PointLight(0xffc880, intensity, 6, 2);
  l.position.set(x, y + 0.37, z);
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
  greenLamp(room, -0.1, y, -1.7, 3.6);
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
  // Marmorplatte mit leicht vorstehender Kante, darunter ein Profil aus Eiche.
  addMesh(room.scene, box(0.74, 0.045, len + 0.08, x, top + 0.0225, mid), std({ ...marble(), roughness: 0.5 }));
  room.woodBag.box(0x2e1a0c, 0.66, 0.03, len + 0.02, x, top - 0.015, mid);
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
  greenLamp(room, x + 0.22, 1.215, z + 0.28, 1.4);
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
