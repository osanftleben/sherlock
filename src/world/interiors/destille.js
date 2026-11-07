import * as THREE from 'three';
import { addMesh, box, cyl, merge, std } from '../kit.js';
import { chalkboard, chalkLabel, fogPuff, landscape, portrait, rng, signTexture, wallpaper, wood } from '../textures.js';
import { Room, rod } from './room.js';
import { wainscot } from './fittings.js';

export function buildDestille() {
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
  // Wulst an der Vorderkante, darunter ein abgesetztes Profil
  room.woodBag.add(new THREE.CylinderGeometry(0.034, 0.034, TW + 0.1, 10).rotateZ(Math.PI / 2).translate(TX, 1.1, TZ + 0.41), 0x7a5430);
  room.woodBag.box(0x5a3a22, TW, 0.035, 0.03, TX, 1.045, TZ + 0.36);
  for (let i = 0; i <= 6; i++) room.woodBag.box(0x3e2412, 0.07, 0.86, 0.03, TX - TW / 2 + (i * TW) / 6, 0.58, TZ + 0.36);
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
  // Runde Platte mit gerundeter Kante und Zarge, gedrechselte Säule auf vier geschweiften Füßen.
  const column = new THREE.LatheGeometry(
    [[0.075, 0.07], [0.05, 0.13], [0.034, 0.22], [0.046, 0.36], [0.052, 0.43], [0.034, 0.52], [0.03, 0.66], [0.046, 0.72], [0.062, 0.76]].map(([cr, y]) => new THREE.Vector2(cr, y)),
    12,
  );
  for (const [x, z] of tables) {
    room.woodBag.add(cyl(0.48, 0.48, 0.05, x, 0.8, z, 28), 0x5a3a22);
    room.woodBag.add(new THREE.TorusGeometry(0.478, 0.025, 6, 40).rotateX(Math.PI / 2).translate(x, 0.8, z), 0x5a3a22);
    room.woodBag.add(cyl(0.4, 0.4, 0.06, x, 0.745, z, 24), 0x3a2412);
    room.woodBag.add(column.clone().translate(x, 0, z), 0x3a2412);
    for (let k = 0; k < 4; k++) {
      const foot = rod([[0.05, 0.1, 0], [0.17, 0.07, 0], [0.28, 0.025, 0], [0.31, 0.02, 0]], 0.022);
      room.woodBag.add(foot.rotateY(Math.PI / 4 + (k * Math.PI) / 2).translate(x, 0, z), 0x3a2412);
    }
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

  // Ofen in der Ecke, die Feuertür zum Stammtisch
  const ember = ironStove(room, 4.9, -3.2, -0.9);
  room.solid(4.9, -3.2, 0.74, 0.74);
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

  furnish(room);

  // Fenster, warmes Lampenlicht, Qualm unter der Decke
  // Ausschnitt mit erleuchtetem Fenster und Laterne gegenüber.
  room.window('east', 0.2, 1.8, 1.5, 1.5, 0.4);
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

// Gusseiserner Kanonenofen bei (x, z), die Feuertür in Richtung yaw: auf vier geschweiften Füßen,
// unten der Aschkasten mit Zugschlitzen, darüber der bauchige Feuerraum mit Nickelringen und der
// Feuertür, deren Glimmerfenster glüht. Das Rohr steigt auf und knickt in die Nordwand. Davor das
// Ofenblech, daneben Kohleneimer und Schürhaken. Gibt das flackernde Glutlicht zurück.
function ironStove(room, x, z, yaw) {
  const iron = 0x1c1c1e;
  const nickel = 0x8e8a80;
  const place = (g) => g.rotateY(yaw).translate(x, 0, z);
  const turn = (pts, seg = 28) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  const fire = new THREE.Color(2.2, 0.85, 0.22);
  const slit = new THREE.Color(1.3, 0.38, 0.08);

  const BODY = [
    [0, 0.17], [0.2, 0.17], [0.235, 0.18], [0.24, 0.2], [0.24, 0.36], [0.27, 0.37], [0.275, 0.395], [0.255, 0.41],
    [0.262, 0.5], [0.278, 0.62], [0.288, 0.75], [0.288, 0.88], [0.278, 1.0], [0.262, 1.1], [0.25, 1.17],
    [0.275, 1.18], [0.28, 1.21], [0.26, 1.225], [0.205, 1.25], [0.19, 1.3], [0.2, 1.34], [0.205, 1.37],
    [0.17, 1.4], [0.11, 1.43], [0.08, 1.45], [0.075, 1.5],
  ];
  room.metalBag.add(place(turn(BODY)), iron);
  for (const [r, y, t] of [[0.267, 0.54, 0.007], [0.283, 0.96, 0.007], [0.281, 1.195, 0.01]]) {
    room.metalBag.add(place(new THREE.TorusGeometry(r, t, 5, 36).rotateX(Math.PI / 2).translate(0, y, 0)), nickel);
  }
  room.metalBag.add(place(cyl(0.078, 0.078, 0.05, 0, 1.5, 0, 14)), iron);

  // Füße zwischen den Türen, damit beide frei bleiben
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const leg = rod([[0.2, 0.18, 0], [0.26, 0.09, 0], [0.3, 0.025, 0]], 0.027);
    const ball = new THREE.SphereGeometry(0.03, 8, 6).scale(1, 0.6, 1).translate(0.3, 0.018, 0);
    for (const g of [leg, ball]) room.metalBag.add(place(g.rotateY(a)), iron);
  }

  // Feuertür mit Glimmerfenster, Gitter, Scharnieren und Riegelknopf
  room.metalBag.add(place(box(0.26, 0.29, 0.07, 0, 0.74, 0.255)), iron);
  room.metalBag.add(place(box(0.22, 0.25, 0.02, 0, 0.74, 0.3)), iron);
  room.glowBag.add(place(box(0.13, 0.12, 0.004, 0, 0.75, 0.312)), fire);
  for (const [w, h, bx, by] of [[0.17, 0.02, 0, 0.82], [0.17, 0.02, 0, 0.68], [0.02, 0.16, -0.075, 0.75], [0.02, 0.16, 0.075, 0.75]]) {
    room.metalBag.add(place(box(w, h, 0.012, bx, by, 0.316)), iron);
  }
  for (const bx of [-0.022, 0.022]) room.metalBag.add(place(box(0.008, 0.12, 0.008, bx, 0.75, 0.316)), iron);
  for (const by of [0.67, 0.81]) room.metalBag.add(place(cyl(0.012, 0.012, 0.04, -0.112, by, 0.3, 8)), iron);
  room.metalBag.add(place(cyl(0.007, 0.007, 0.05, 0, 0, 0, 6).rotateX(Math.PI / 2).translate(0.08, 0.74, 0.335)), nickel);
  room.metalBag.add(place(new THREE.SphereGeometry(0.016, 8, 6).translate(0.08, 0.74, 0.36)), nickel);

  // Aschkasten: Tür mit drei glimmenden Zugschlitzen
  room.metalBag.add(place(box(0.2, 0.14, 0.06, 0, 0.27, 0.22)), iron);
  room.metalBag.add(place(box(0.17, 0.11, 0.02, 0, 0.27, 0.26)), iron);
  for (const bx of [-0.04, 0, 0.04]) room.glowBag.add(place(box(0.022, 0.05, 0.004, bx, 0.27, 0.272)), slit);
  room.metalBag.add(place(new THREE.SphereGeometry(0.012, 8, 6).translate(0.065, 0.27, 0.28)), nickel);

  // Ofenblech, vorn länger gegen herausfallende Glut
  room.metalBag.add(place(box(0.9, 0.006, 1.05, 0, 0.003, 0.12)), 0x5a564e);

  // Kohleneimer mit Henkel und einem Haufen Briketts und Kohle
  const pail = (g) => place(g.translate(0.42, 0, -0.05));
  room.metalBag.add(pail(turn([[0, 0], [0.11, 0], [0.12, 0.02], [0.135, 0.26], [0.142, 0.275]], 18)), 0x2a2826);
  room.metalBag.add(pail(turn([[0.136, 0.275], [0.129, 0.26], [0.114, 0.03], [0, 0.03]], 18)), 0x1e1c1a);
  room.metalBag.add(pail(new THREE.TorusGeometry(0.142, 0.006, 5, 16, Math.PI).translate(0, 0.275, 0)), 0x2a2826);
  const r = rng(91);
  for (let i = 0; i < 14; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.1;
    const g = new THREE.DodecahedronGeometry(0.022 + r() * 0.016, 0);
    g.rotateX(r() * 3).rotateY(r() * 3).scale(1, 0.7, 1).translate(Math.cos(a) * d, 0.24 + (0.1 - d) * 0.35, Math.sin(a) * d);
    room.plainBag.add(pail(g), 0x101012);
  }

  // Schürhaken an die Ofenflanke gelehnt
  room.metalBag.add(place(rod([[-0.42, 0.01, 0.1], [-0.34, 0.55, 0.06], [-0.3, 0.86, 0.04]], 0.007)), 0x2a2a2c);
  room.metalBag.add(place(new THREE.TorusGeometry(0.025, 0.006, 5, 12).translate(-0.29, 0.9, 0.04)), 0x2a2a2c);

  // Rohr: senkrecht hoch, im Bogen nach Norden, durch eine Rosette in die Wand
  const pipe = 0x262422;
  const wallZ = -room.d / 2;
  room.metalBag.add(cyl(0.065, 0.065, 0.83, x, 1.885, z, 14), pipe);
  room.metalBag.add(new THREE.TorusGeometry(0.15, 0.065, 12, 10, Math.PI / 2).rotateY(-Math.PI / 2).translate(x, 2.3, z - 0.15), pipe);
  const run = z - 0.15 - wallZ;
  room.metalBag.add(cyl(0.065, 0.065, run, 0, 0, 0, 14).rotateX(Math.PI / 2).translate(x, 2.45, wallZ + run / 2), pipe);
  for (const y of [1.75, 2.08]) room.metalBag.add(new THREE.TorusGeometry(0.067, 0.006, 5, 18).rotateX(Math.PI / 2).translate(x, y, z), pipe);
  room.metalBag.add(cyl(0.13, 0.13, 0.012, 0, 0, 0, 20).rotateX(Math.PI / 2).translate(x, 2.45, wallZ + 0.006), pipe);
  // Drosselklappe: Griff seitlich am Rohr
  room.metalBag.add(cyl(0.006, 0.006, 0.08, 0, 0, 0, 6).rotateZ(Math.PI / 2).translate(x + 0.1, 1.95, z), 0x2a2a2c);
  room.metalBag.add(box(0.05, 0.012, 0.025, x + 0.15, 1.95, z), 0x2a2a2c);

  // Glutlicht vor der Feuertür
  const ember = new THREE.PointLight(0xff5a1a, 1.8, 5, 2);
  ember.position.set(x + Math.sin(yaw) * 0.55, 0.55, z + Math.cos(yaw) * 0.55);
  room.scene.add(ember);
  return ember;
}

// Was eine Kneipe bewohnt aussehen lässt: Hakenleiste mit Mänteln, Hüten und Zeitung neben der
// Tür, ein Mantel am Ständer, Geweih und Bilder an den Wänden, Bierkästen, Besen und ein Stehfass.
function furnish(room) {
  const r = rng(911);
  const brass = 0xa58a4a;
  const S = room.d / 2 - 0.03;

  // Hakenleiste mit Hutablage an der Südwand, westlich der Tür.
  const x0 = -3.9;
  const x1 = -1.3;
  room.woodBag.box(0x3a2414, x1 - x0, 0.1, 0.03, (x0 + x1) / 2, 1.8, S - 0.015);
  room.woodBag.box(0x3a2414, x1 - x0, 0.025, 0.26, (x0 + x1) / 2, 2.08, S - 0.13);
  for (const x of [x0 + 0.15, (x0 + x1) / 2, x1 - 0.15]) room.woodBag.add(rod([[x, 1.9, S], [x, 2.0, S - 0.02], [x, 2.06, S - 0.2]], 0.014), 0x2a180c);
  const hooks = [-3.65, -3.15, -2.6, -2.1, -1.55];
  for (const x of hooks) {
    room.metalBag.add(rod([[x, 1.8, S - 0.03], [x, 1.8, S - 0.08], [x, 1.86, S - 0.1]], 0.007), brass);
    room.metalBag.add(new THREE.SphereGeometry(0.01, 6, 4).translate(x, 1.86, S - 0.1), brass);
  }
  hangingCoat(room.plainBag, hooks[0], 1.8, S - 0.03, Math.PI, 0x2a2826, r);
  hangingCoat(room.plainBag, hooks[1], 1.8, S - 0.03, Math.PI, 0x3a2e22, r);
  hangingCoat(room.plainBag, hooks[3], 1.8, S - 0.03, Math.PI, 0x1c1e22, r, 0.85);
  // Schirm unter dem letzten Haken an die Wand gelehnt.
  umbrella(room, hooks[4], S - 0.1, 0.92, 0.1);
  // Hüte auf der Ablage: Melone, Schiebermütze, Zylinder.
  bowler(room.plainBag, -3.5, 2.093, S - 0.14, 0x141414);
  cap(room.plainBag, -2.85, 2.093, S - 0.15, 0x2a2622, 0.4);
  room.plainBag.add(cyl(0.075, 0.08, 0.15, -1.75, 2.093 + 0.085, S - 0.14, 16), 0x101012);
  room.plainBag.add(cyl(0.13, 0.13, 0.008, -1.75, 2.097, S - 0.14, 18), 0x101012);
  room.plainBag.add(cyl(0.081, 0.081, 0.025, -1.75, 2.12, S - 0.14, 16), 0x2a2224);
  // Zeitungshalter am Haken neben der Tür: Holzstab, darüber gehängt die Zeitung.
  newspaper(room, -1.05, 1.62, S - 0.03);

  // Mantel und Schirm am Garderobenständer.
  hangingCoat(room.plainBag, 1.5, 1.72, 3.53, Math.PI, 0x3a3226, r, 0.9);
  umbrella(room, 1.72, 3.75, 1.0, -0.18);

  // Hirschgeweih auf einem Brett über dem Schnapsgestell.
  antlers(room, -room.w / 2 + 0.03, 2.25, -0.7);

  // Bilder an der Ostwand, beidseits des Fensters.
  framed(room, room.w / 2 - 0.02, 1.85, -2.35, -Math.PI / 2, 0.7, 0.5, landscape(17));
  framed(room, room.w / 2 - 0.02, 1.8, 2.55, -Math.PI / 2, 0.42, 0.56, portrait());

  // Bierkästen mit leeren Flaschen in der Ecke, daneben ein Besen.
  const crates = [[4.85, 0, 3.5, 0.05], [4.85, 0.32, 3.5, -0.04], [4.75, 0, 2.9, 0.2]];
  for (const [x, y, z, rot] of crates) crate(room, x, y, z, rot, r);
  room.solid(4.82, 3.2, 0.7, 1.1);
  const broom = rod([[5.42, 0.04, 2.3], [5.44, 1.3, 2.2]], 0.014);
  room.woodBag.add(broom, 0x6a4a2a);
  const bristle = cyl(0.05, 0.11, 0.28, 0, 0, 0, 10);
  bristle.scale(1, 1, 0.45);
  bristle.translate(5.42, 0.14, 2.31);
  room.plainBag.add(bristle, 0x8a7448);

  // Stehfass mit Gläsern in der Südwestecke.
  addCask(room.woodBag, -4.4, 0.47, 2.9, 0.3, 0.94, 'y', 0x4e321a);
  for (const [dx, dz] of [[-0.08, 0.05], [0.1, -0.06]]) molle(room, -4.4 + dx, 0.94, 2.9 + dz, -1);
  schnapsGlass(room, -4.32, 0.94, 3.04);
  room.solid(-4.4, 2.9, 0.62, 0.62);
}

// Hängender Mantel: Kragen am Haken, breite Schultern, Ärmel an den Seiten, unten weit und in
// Falten. Mit dem Rücken zur Wand (facing: Richtung in den Raum).
function hangingCoat(bag, x, y, z, facing, color, r, len = 1) {
  const L = 1.05 * len;
  const prof = [[0.03, 0], [0.07, -0.04], [0.17, -0.11], [0.2, -0.19], [0.185, -0.4], [0.2, -0.6 * len], [0.225, -0.85 * len], [0.24, -L], [0, -L - 0.005]];
  // Profil von unten nach oben, sonst zeigen die Flächen nach innen.
  const g = new THREE.LatheGeometry(prof.reverse().map(([pr, py]) => new THREE.Vector2(pr, py)), 28, Math.PI, Math.PI * 2);
  const pos = g.attributes.position;
  const seed = r() * 6;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const pz = pos.getZ(i);
    const t = Math.max(0, -pos.getY(i) - 0.25) / L;
    const f = 1 + 0.07 * t * Math.sin(7 * Math.atan2(px, pz) + seed);
    pos.setX(i, px * f);
    pos.setZ(i, pz * f * 0.38);
  }
  g.computeVertexNormals();
  const parts = [[g, color]];
  for (const s of [-1, 1]) parts.push([rod([[s * 0.15, -0.14, 0.03], [s * 0.165, -0.38, 0.05], [s * 0.15, -0.62, 0.055]], 0.036), shade(color, 0.9)]);
  parts.push([new THREE.TorusGeometry(0.055, 0.022, 6, 14, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI).translate(0, -0.03, 0.01), shade(color, 0.8)]);
  const tilt = (r() - 0.5) * 0.12;
  for (const [p, c] of parts) {
    p.rotateZ(tilt);
    p.rotateY(facing);
    p.translate(x + Math.sin(facing) * 0.09, y, z + Math.cos(facing) * 0.09);
    bag.add(p, c);
  }
}

const shade = (c, k) => new THREE.Color(c).multiplyScalar(k);

function bowler(bag, x, y, z, color) {
  bag.add(new THREE.SphereGeometry(0.085, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.9, 1.12).translate(x, y + 0.02, z), color);
  bag.add(cyl(0.085, 0.085, 0.02, x, y + 0.01, z, 16), color);
  bag.add(new THREE.TorusGeometry(0.105, 0.012, 5, 20).rotateX(Math.PI / 2).scale(1, 1, 1.12).translate(x, y + 0.008, z), color);
}

function cap(bag, x, y, z, color, rot) {
  const top = new THREE.SphereGeometry(0.1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.05, 0.38, 1.1);
  const peak = box(0.15, 0.008, 0.07, 0, 0, 0.12);
  for (const [g, c] of [[top, color], [peak, shade(color, 0.7)]]) {
    g.rotateY(rot);
    g.translate(x, y + 0.004, z);
    bag.add(g, c);
  }
}

// Zugeklappter Schirm, schräg angelehnt: Griff oben bei (x, top, z), Spitze am Boden.
function umbrella(room, x, z, top, lean) {
  const dir = new THREE.Vector3(Math.sin(lean) * 0.3, -top, -0.06);
  const foot = new THREE.Vector3(x, top, z).add(dir);
  room.woodBag.add(rod([[x, top, z], [foot.x, 0.01, foot.z]], 0.008), 0x1a1410);
  const canopy = new THREE.ConeGeometry(0.045, top * 0.62, 10, 1, true);
  canopy.rotateX(Math.PI);
  const mid = new THREE.Vector3(x, top, z).lerp(foot, 0.55);
  canopy.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate().normalize()));
  canopy.translate(mid.x, mid.y, mid.z);
  room.plainBag.add(canopy, 0x18161a);
  room.woodBag.add(rod([[x, top, z], [x, top + 0.06, z + 0.03], [x, top + 0.04, z + 0.08]], 0.011), 0x3a2414);
}

function newspaper(room, x, y, z) {
  room.metalBag.add(rod([[x, y + 0.08, z], [x, y + 0.08, z - 0.05]], 0.006), 0xa58a4a);
  room.woodBag.add(rod([[x - 0.24, y + 0.04, z - 0.05], [x + 0.24, y + 0.04, z - 0.05]], 0.012), 0x5a3a20);
  // Die Zeitung hängt über dem Stab, vorn etwas länger, und bauscht sich.
  const sheet = new THREE.PlaneGeometry(0.42, 0.56, 6, 8);
  const pos = sheet.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = 0.5 - (pos.getY(i) / 0.56);
    pos.setZ(i, 0.004 * Math.sin(pos.getX(i) * 15) * t);
  }
  sheet.translate(0, -0.24, 0).rotateY(Math.PI).translate(x, y + 0.04, z - 0.062);
  sheet.computeVertexNormals();
  room.plainBag.add(sheet, 0xcfc6ac);
  // Kopf und Spalten
  room.plainBag.add(box(0.3, 0.035, 0.002, x, y - 0.03, z - 0.066), 0x2a2622);
  for (let c = 0; c < 3; c++) for (let l = 0; l < 7; l++) room.plainBag.add(box(0.11, 0.006, 0.002, x - 0.13 + c * 0.13, y - 0.09 - l * 0.045, z - 0.066), 0x6a645a);
}

function antlers(room, x, y, z) {
  // Brett, Schädel, zwei geschwungene Stangen mit Enden.
  const shield = cyl(0.17, 0.17, 0.03, 0, 0, 0, 20).scale(1, 1, 1.35).rotateZ(Math.PI / 2);
  room.woodBag.add(shield.translate(x + 0.015, y, z), 0x3a2010);
  room.plainBag.add(new THREE.SphereGeometry(0.07, 12, 8).scale(1, 0.9, 0.75).translate(x + 0.07, y + 0.02, z), 0xd8ceb4);
  const bone = 0xcab894;
  for (const s of [-1, 1]) {
    const pts = [[x + 0.08, y + 0.07, z + s * 0.04], [x + 0.14, y + 0.2, z + s * 0.14], [x + 0.18, y + 0.38, z + s * 0.24], [x + 0.17, y + 0.56, z + s * 0.27], [x + 0.13, y + 0.7, z + s * 0.22]];
    room.plainBag.add(rod(pts, 0.016), bone);
    for (const [k, len, up] of [[1, 0.13, 0.05], [2, 0.12, 0.1], [3, 0.1, 0.12]]) {
      const [px, py, pz] = pts[k];
      room.plainBag.add(rod([[px, py, pz], [px + len * 0.8, py + up, pz - s * len * 0.25]], 0.009), bone);
    }
  }
}

function framed(room, x, y, z, facing, w, h, map) {
  const g = new THREE.Group();
  const frame = merge([
    box(w + 0.1, 0.05, 0.035, 0, h / 2 + 0.025, 0),
    box(w + 0.1, 0.05, 0.035, 0, -h / 2 - 0.025, 0),
    box(0.05, h, 0.035, -w / 2 - 0.025, 0, 0),
    box(0.05, h, 0.035, w / 2 + 0.025, 0, 0),
  ]);
  g.add(new THREE.Mesh(frame, std({ color: 0x6a4a1e, roughness: 0.45, metalness: 0.4 })));
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.75 }));
  pic.position.z = 0.006;
  g.add(pic);
  g.position.set(x, y, z);
  g.rotation.y = facing;
  room.scene.add(g);
}

// Bierkasten aus Holz mit Griffloch, oben die Hälse leerer Flaschen.
function crate(room, x, y, z, rot, r) {
  const parts = [];
  parts.push([box(0.6, 0.3, 0.4, 0, 0.15, 0), 0x5a3e22]);
  parts.push([box(0.62, 0.03, 0.42, 0, 0.29, 0), 0x4a3018]);
  for (const s of [-1, 1]) parts.push([box(0.012, 0.04, 0.12, s * 0.305, 0.22, 0), 0x1a120a]);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      if (r() < 0.15) continue;
      const bx = -0.21 + i * 0.14;
      const bz = -0.12 + j * 0.12;
      parts.push([cyl(0.014, 0.024, 0.07, bx, 0.33, bz, 8), 0x2a4030]);
      parts.push([cyl(0.016, 0.016, 0.012, bx, 0.37, bz, 8), 0x8a8478]);
    }
  }
  for (const [g, c] of parts) {
    g.rotateY(rot);
    g.translate(x, y, z);
    (c === 0x2a4030 ? room.glassBag : c === 0x8a8478 ? room.metalBag : room.woodBag).add(g, c);
  }
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
