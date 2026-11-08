import * as THREE from 'three';
import { Bag, merge, std } from '../kit.js';
import { makeFigure, makeHorse } from '../figures.js';
import { signTexture, softDisc } from '../textures.js';
import { lightPool } from './lamps.js';
import { rod, strap } from './traffic.js';
import { GAUGE } from './tramway.js';

// Pferdebahnwagen der „Grünen Linie“ Hackescher Markt – Pankow (Große Berliner Pferde-Eisenbahn).
// Belegt: Die Linie fuhr seit 1882 vom Schönhauser Tor über Alte und Neue Schönhauser Straße bis an
// den Hackeschen Markt; auf ihr liefen Einspänner (ein Pferd, einstöckig, 20 bis 22 Personen, gut 6 m
// lang). Innen brannten Petroleumlampen, außen zeigte eine farbige Signallaterne die Linienfarbe
// (bis 1902, dann Nummern). Der Anstrich ist nicht überliefert: hier rotbraun mit elfenbeinfarbenem
// Fensterfeld und Goldschrift, das Laufschild auf dem Dach grün wie die Linie.
//
// Wagenkoordinaten: Mitte des Kastens im Ursprung auf Schienenhöhe; der Wagen ist vorn und hinten
// gleich, gezogen wird er an dem Ende, an dem gerade das Pferd hängt (Fahrt und Umspannen in
// tramline.js). Pferd mit Ortscheit und Strängen, Kutscher und Schaffner sind eigene Teile.

const LB = 3.9; // Länge des Wagenkastens
const WB = 2.0; // Breite
const ZB = LB / 2;
export const ZP = ZB + 1.15; // Spritzwand am Ende der Plattform
const FLOOR = 0.78; // Fußboden im Kasten
export const PFLOOR = 0.72; // Plattform
const PANEL0 = 0.62; // Unterkante der Seitenwand
const WIN0 = 1.46; // Fensterbrüstung
const WIN1 = 2.3; // Fenstersturz
const EAVE = 2.72; // Traufe
const WHEEL_R = 0.38;
// Lampen des Wagens, die echtes Licht bekommen können (tramline.js meldet sie in lamps.js an):
// o längs des Wagens, y Höhe. Die beiden Innenlampen unter der Decke als ein Licht in der Mitte,
// das vor allem seitlich durch die Fenster fällt; dazu die grünen Signallaternen an beiden Enden.
export const CAR_LIGHTS = [
  { o: 0, y: 2.42, color: 0xffa35a, intensity: 6, weight: 1.5 },
  ...[-1, 1].map((e) => ({ o: e * (ZP + 0.14), y: EAVE - 0.16, color: 0x58ff98, intensity: 3, weight: 2.5 })),
];
const AXLES = [-0.85, 0.85];
// Vom Pferd (Mitte) bis zum Ortscheit sind es wie bei der Droschke 1,82 m; das Ortscheit hängt
// 0,62 m vor der Spritzwand an einer Zugstange.
export const SWINGLE = ZP + 0.62;
export const TRACE = 1.82;
export const HORSE_Z = SWINGLE + TRACE;
// Vom Kastenmittelpunkt bis zur Spritzwand und bis zum Maul des Pferdes.
export const CAR_HALF = ZP;
export const CAR_NOSE = HORSE_Z + 1.25;

const PANEL = 0x4a1d14;
const CREAM = 0xd8c8a2;
const GOLD = 0xb08a3a;
const ROOF = 0x34322e;
const WOOD = 0x2a1c12;
const IRON = 0x161616;
const BRASS = 0x9a7c3c;
const LEATHER = 0x15110e;

// Innen, vom Petroleumlicht beschienen (unbeleuchtetes Material, die Farben sind schon das Licht).
const LIT_WALL = new THREE.Color(0.62, 0.36, 0.15);
const LIT_CEIL = new THREE.Color(0.8, 0.5, 0.22);
const LIT_SEAT = new THREE.Color(0.34, 0.1, 0.05);
const LIT_FLOOR = new THREE.Color(0.14, 0.08, 0.035);
const LIT_POST = new THREE.Color(0.7, 0.48, 0.24);

let mats = null;
function materials() {
  return (mats ??= {
    // Glänzender Lack: Laternen spiegeln sich als klarer Fleck statt als breiter Schimmer.
    body: std({ vertexColors: true, roughness: 0.22, metalness: 0.12 }),
    glass: std({ color: 0x2a3a48, roughness: 0.04, metalness: 0.3, transparent: true, opacity: 0.16, depthWrite: false }),
    inside: new THREE.MeshBasicMaterial({ vertexColors: true }),
    lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(4.0, 2.5, 1.0) }),
    signal: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 2.6, 0.9) }),
    signalGlow: new THREE.SpriteMaterial({ map: softDisc('lampGlow'), color: 0x58ff98, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending }),
    lampGlow: new THREE.SpriteMaterial({ map: softDisc('lampGlow'), color: 0xffa858, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }),
    pool: lightPool(0xc77b38, 0.2),
  });
}

// Senkrechte Tafel zwischen zwei Punkten im Grundriss (Spritzwand).
function panel(bag, color, ax, az, bx, bz, y0, y1, t = 0.04) {
  const len = Math.hypot(bx - ax, bz - az);
  const g = new THREE.BoxGeometry(len, y1 - y0, t).rotateY(Math.atan2(-(bz - az), bx - ax));
  bag.add(g.translate((ax + bx) / 2, (y0 + y1) / 2, (az + bz) / 2), color);
}

// Schild als Fläche, die nach normal zeigt.
function sign(texture, w, h, x, y, z, yaw) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.45 }));
  m.position.set(x, y, z);
  m.rotation.y = yaw;
  return m;
}

// Radsatz: zwei Scheibenräder mit Spurkranz innen, Achse dazwischen. Achse in x, Mitte im Ursprung.
function wheelSet() {
  const b = new Bag();
  const tread = GAUGE / 2 + 0.03;
  for (const s of [-1, 1]) {
    b.add(new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.09, 24).rotateZ(Math.PI / 2).translate(s * tread, 0, 0), IRON);
    b.add(new THREE.CylinderGeometry(WHEEL_R + 0.025, WHEEL_R + 0.025, 0.02, 24).rotateZ(Math.PI / 2).translate(s * (tread - 0.055), 0, 0), IRON);
    // Speichen als Rippen auf der Außenseite, damit man das Drehen sieht.
    for (let k = 0; k < 6; k++) {
      b.add(new THREE.BoxGeometry(0.02, WHEEL_R * 1.7, 0.05).rotateX((k / 6) * Math.PI).translate(s * (tread + 0.05), 0, 0), 0x241f1a);
    }
    b.add(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 10).rotateZ(Math.PI / 2).translate(s * (tread + 0.06), 0, 0), 0x241f1a);
  }
  b.add(new THREE.CylinderGeometry(0.04, 0.04, 2 * tread, 8).rotateZ(Math.PI / 2), IRON);
  return b.build();
}

// Der Wagen mit Fahrgästen. userData.wheels: Pivots der Radsätze mit Radius r.
export function makeHorseCar({ number = '117', passengers = 3 } = {}) {
  const M = materials();
  const g = new THREE.Group();
  const b = new Bag();
  const inside = new Bag();
  const glass = [];
  const lamps = [];
  const signals = [];
  const hw = WB / 2;

  // --- Seitenwände: unten die lackierte Füllung, darüber sechs Fenster zwischen Pfosten,
  // über den Fenstern das Schriftbrett, oben das Traufgesims.
  const windows = [];
  for (let i = 0; i < 6; i++) {
    const z0 = -ZB + 0.12 + i * 0.64;
    windows.push([z0, z0 + 0.46]);
  }
  const posts = [[-ZB, windows[0][0]], ...windows.slice(1).map((w, i) => [windows[i][1], w[0]]), [windows[5][1], ZB]];
  for (const s of [-1, 1]) {
    const x = s * (hw - 0.025);
    b.box(PANEL, 0.05, WIN0 - PANEL0, LB, x, (PANEL0 + WIN0) / 2, 0);
    // Goldene Zierlinie auf der Füllung und ein Fußleistenprofil.
    for (const y of [PANEL0 + 0.1, WIN0 - 0.12]) b.box(GOLD, 0.006, 0.014, LB - 0.3, s * (hw + 0.002), y, 0);
    for (const z of [-ZB + 0.15, ZB - 0.15]) b.box(GOLD, 0.006, WIN0 - PANEL0 - 0.22, 0.014, s * (hw + 0.002), (PANEL0 + WIN0) / 2 + 0.01, z);
    b.box(CREAM, 0.07, 0.05, LB + 0.02, s * (hw - 0.005), WIN0 - 0.015, 0);
    for (const [z0, z1] of posts) b.box(CREAM, 0.05, WIN1 - WIN0, z1 - z0, x, (WIN0 + WIN1) / 2, (z0 + z1) / 2);
    b.box(PANEL, 0.05, EAVE - WIN1, LB, x, (WIN1 + EAVE) / 2, 0);
    b.box(CREAM, 0.1, 0.06, LB + 0.04, s * hw, EAVE - 0.03, 0);
    for (const [z0, z1] of windows) {
      const zc = (z0 + z1) / 2;
      const w = z1 - z0;
      // Fensterrahmen mit Kämpfer: unten das Schiebefenster, oben ein festes Oberlicht.
      for (const y of [WIN0 + 0.02, 2.06, WIN1 - 0.02]) b.box(WOOD, 0.03, 0.035, w, s * (hw - 0.04), y, zc);
      for (const z of [z0 + 0.015, z1 - 0.015]) b.box(WOOD, 0.03, WIN1 - WIN0, 0.03, s * (hw - 0.04), (WIN0 + WIN1) / 2, z);
      glass.push(new THREE.BoxGeometry(0.006, WIN1 - WIN0, w).translate(s * (hw - 0.045), (WIN0 + WIN1) / 2, zc));
    }
    // Innen: Wandtäfelung unter den Fenstern, Pfosten und Fries darüber, alles im Lampenlicht.
    inside.box(LIT_WALL, 0.02, WIN0 - FLOOR, LB - 0.06, s * (hw - 0.06), (FLOOR + WIN0) / 2, 0);
    for (const [z0, z1] of posts) inside.box(LIT_POST, 0.02, WIN1 - WIN0, z1 - z0, s * (hw - 0.06), (WIN0 + WIN1) / 2, (z0 + z1) / 2);
    inside.box(LIT_WALL, 0.02, EAVE - WIN1, LB - 0.06, s * (hw - 0.06), (WIN1 + EAVE) / 2, 0);
    // Längsbank mit Polster und Rückenlehne.
    inside.box(LIT_SEAT, 0.42, 0.08, LB - 0.2, s * (hw - 0.27), FLOOR + 0.42, 0);
    inside.box(LIT_WALL, 0.38, 0.38, LB - 0.2, s * (hw - 0.27), FLOOR + 0.19, 0);
    inside.box(LIT_SEAT, 0.06, 0.34, LB - 0.2, s * (hw - 0.09), FLOOR + 0.62, 0);
  }

  // --- Stirnwände mit Schiebetür in der Mitte und je einem Fenster daneben.
  const endWin = [[-0.88, -0.48], [-0.34, 0.34], [0.48, 0.88]];
  const endPosts = [[-hw, -0.88], [-0.48, -0.34], [0.34, 0.48], [0.88, hw]];
  for (const e of [-1, 1]) {
    const z = e * (ZB - 0.025);
    b.box(PANEL, WB, WIN0 - PFLOOR, 0.05, 0, (PFLOOR + WIN0) / 2, z);
    b.box(CREAM, WB + 0.02, 0.05, 0.07, 0, WIN0 - 0.015, e * (ZB - 0.02));
    for (const [x0, x1] of endPosts) b.box(CREAM, x1 - x0, WIN1 - WIN0, 0.05, (x0 + x1) / 2, (WIN0 + WIN1) / 2, z);
    b.box(PANEL, WB, EAVE - WIN1, 0.05, 0, (WIN1 + EAVE) / 2, z);
    for (const [x0, x1] of endWin) {
      for (const y of [WIN0 + 0.02, WIN1 - 0.02]) b.box(WOOD, x1 - x0, 0.035, 0.03, (x0 + x1) / 2, y, e * (ZB - 0.04));
      glass.push(new THREE.BoxGeometry(x1 - x0, WIN1 - WIN0, 0.006).translate((x0 + x1) / 2, (WIN0 + WIN1) / 2, e * (ZB - 0.045)));
    }
    // Fugen der Schiebetür, Türgriff.
    for (const x of [-0.36, 0.36]) b.box(0x0c0a08, 0.012, WIN1 - PFLOOR, 0.006, x, (PFLOOR + WIN1) / 2, e * ZB + e * 0.002);
    b.box(BRASS, 0.03, 0.12, 0.03, 0.28, 1.3, e * (ZB + 0.01));
    // Innen: Stirnwand mit Lampe über der Tür.
    inside.box(LIT_WALL, WB - 0.06, WIN0 - FLOOR, 0.02, 0, (FLOOR + WIN0) / 2, e * (ZB - 0.06));
    for (const [x0, x1] of endPosts) inside.box(LIT_POST, x1 - x0, WIN1 - WIN0, 0.02, (x0 + x1) / 2, (WIN0 + WIN1) / 2, e * (ZB - 0.06));
    inside.box(LIT_WALL, WB - 0.06, EAVE - WIN1, 0.02, 0, (WIN1 + EAVE) / 2, e * (ZB - 0.06));
    b.box(BRASS, 0.12, 0.03, 0.12, 0, 2.42, e * (ZB - 0.13));
    lamps.push(new THREE.SphereGeometry(0.06, 10, 8).scale(1, 1.3, 1).translate(0, 2.52, e * (ZB - 0.13)));
    b.add(new THREE.CylinderGeometry(0.03, 0.05, 0.1, 8).translate(0, 2.65, e * (ZB - 0.13)), BRASS);
  }
  // Boden und Decke innen.
  inside.box(LIT_FLOOR, WB - 0.1, 0.01, LB - 0.1, 0, FLOOR + 0.005, 0);
  inside.box(LIT_CEIL, WB - 0.1, 0.01, LB - 0.1, 0, EAVE - 0.02, 0);
  b.box(WOOD, WB, 0.08, LB, 0, FLOOR - 0.04, 0);

  // --- Dach: flacher Bogen über Kasten und Plattformen, darauf der Laternenaufbau mit Oberlichtern.
  const arch = (w, rise, t) => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, -t);
    s.lineTo(-w / 2, 0);
    s.quadraticCurveTo(0, 2 * rise, w / 2, 0);
    s.lineTo(w / 2, -t);
    s.quadraticCurveTo(0, 2 * rise - t, -w / 2, -t);
    return s;
  };
  const roofLen = 2 * ZP + 0.12;
  b.add(new THREE.ExtrudeGeometry(arch(WB + 0.14, 0.2, 0.04), { depth: roofLen, bevelEnabled: false, curveSegments: 10 }).translate(0, EAVE + 0.02, -roofLen / 2), ROOF);
  b.box(CREAM, 1.12, 0.2, LB - 0.3, 0, EAVE + 0.27, 0);
  b.add(new THREE.ExtrudeGeometry(arch(1.3, 0.07, 0.03), { depth: LB - 0.2, bevelEnabled: false, curveSegments: 8 }).translate(0, EAVE + 0.39, -(LB - 0.2) / 2), ROOF);
  // Oberlichter im Laternenaufbau leuchten vom Licht innen.
  for (const s of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      const z = -ZB + 0.4 + i * ((LB - 0.8) / 7);
      inside.box(LIT_CEIL, 0.01, 0.11, 0.26, s * 0.565, EAVE + 0.27, z);
    }
  }
  // Laufschild auf dem Dach (grün wie die Linie), Schriftbrett über den Fenstern, Wagennummer.
  const route = signTexture(['Hackescher Markt – Pankow'], { width: 1024, height: 96, bg: '#1d4a2c', fg: '#efe6c8', font: '"EB Garamond", serif', size: 66 });
  const company = signTexture(['Große Berliner Pferde-Eisenbahn'], { width: 1024, height: 80, bg: '#4a1d14', fg: '#d8b56a', border: false, font: '"EB Garamond", serif', size: 54 });
  const num = signTexture([number], { width: 256, height: 160, bg: '#4a1d14', fg: '#d8b56a', border: false, font: '"EB Garamond", serif', size: 130 });
  for (const s of [-1, 1]) {
    b.box(IRON, 0.02, 0.06, 0.02, s * (hw - 0.04), EAVE + 0.12, -1.2);
    b.box(IRON, 0.02, 0.06, 0.02, s * (hw - 0.04), EAVE + 0.12, 1.2);
    g.add(sign(route, 3.0, 0.28, s * (hw - 0.03), EAVE + 0.3, 0, (s * Math.PI) / 2));
    g.add(sign(company, 3.3, 0.24, s * (hw + 0.004), (WIN1 + EAVE - 0.06) / 2, 0, (s * Math.PI) / 2));
    g.add(sign(num, 0.36, 0.22, s * (hw + 0.004), (PANEL0 + WIN0) / 2, 0, (s * Math.PI) / 2));
  }

  // --- Plattformen mit Spritzwand, Bremskurbel, Glocke, Tritten und Haltestangen.
  for (const e of [-1, 1]) {
    const zc = e * (ZB + ZP) / 2;
    b.box(WOOD, WB - 0.1, 0.06, ZP - ZB, 0, PFLOOR - 0.03, zc);
    // Spritzwand: Mittelstück und zwei schräge Flanken.
    const zf = e * ZP;
    const zs = e * (ZP - 0.28);
    panel(b, PANEL, -0.72, zf, 0.72, zf, PFLOOR, PFLOOR + 0.96);
    panel(b, PANEL, -0.72, zf, -0.94, zs, PFLOOR, PFLOOR + 0.96);
    panel(b, PANEL, 0.72, zf, 0.94, zs, PFLOOR, PFLOOR + 0.96);
    const rail = (ax, az, bx, bz) => b.add(rod(new THREE.Vector3(ax, PFLOOR + 0.98, az), new THREE.Vector3(bx, PFLOOR + 0.98, bz), 0.02), BRASS);
    rail(-0.72, zf + e * 0.01, 0.72, zf + e * 0.01);
    rail(-0.72, zf + e * 0.01, -0.94, zs);
    rail(0.72, zf + e * 0.01, 0.94, zs);
    g.add(sign(num, 0.42, 0.26, 0, PFLOOR + 0.55, zf + e * 0.024, e > 0 ? 0 : Math.PI));
    // Haltestangen an den Ecken, zugleich die Stützen des Dachs über der Plattform.
    for (const s of [-1, 1]) {
      b.add(rod(new THREE.Vector3(s * 0.94, PFLOOR + 0.96, zs), new THREE.Vector3(s * 0.94, EAVE, zs), 0.022), IRON);
      b.add(rod(new THREE.Vector3(s * (hw - 0.03), PFLOOR, e * (ZB + 0.05)), new THREE.Vector3(s * (hw - 0.03), EAVE, e * (ZB + 0.05)), 0.02), BRASS);
      // Tritt unter der Plattform.
      b.box(IRON, 0.26, 0.035, ZP - ZB - 0.35, s * (hw + 0.06), 0.4, zc);
      for (const z of [zc - e * 0.25, zc + e * 0.25]) b.add(rod(new THREE.Vector3(s * (hw - 0.05), PFLOOR - 0.06, z), new THREE.Vector3(s * (hw + 0.1), 0.4, z), 0.014, 4), IRON);
    }
    // Bremskurbel links vom Kutscher.
    const bx = -0.5 * e;
    b.add(rod(new THREE.Vector3(bx, PFLOOR - 0.3, e * (ZP - 0.16)), new THREE.Vector3(bx, PFLOOR + 0.9, e * (ZP - 0.16)), 0.018), IRON);
    b.add(new THREE.TorusGeometry(0.11, 0.012, 4, 14).rotateX(Math.PI / 2).translate(bx, PFLOOR + 0.9, e * (ZP - 0.16)), IRON);
    b.add(rod(new THREE.Vector3(bx + 0.11, PFLOOR + 0.9, e * (ZP - 0.16)), new THREE.Vector3(bx + 0.11, PFLOOR + 1.0, e * (ZP - 0.16)), 0.012, 4), WOOD);
    // Glocke unter dem Dach, Zugstange zum Bodenhebel.
    b.add(new THREE.SphereGeometry(0.07, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.2, 1).translate(0.4 * e, EAVE - 0.16, e * (ZP - 0.12)), BRASS);
    b.add(rod(new THREE.Vector3(0.4 * e, EAVE - 0.08, e * (ZP - 0.12)), new THREE.Vector3(0.4 * e, EAVE - 0.02, e * (ZP - 0.12)), 0.01, 4), IRON);
    // Signallaterne vorn unter der Dachkante: grünes Glas für die Grüne Linie.
    const lz = e * (ZP + 0.02);
    b.box(IRON, 0.18, 0.24, 0.16, 0, EAVE - 0.16, lz);
    signals.push(new THREE.BoxGeometry(0.13, 0.17, 0.01).translate(0, EAVE - 0.16, lz + e * 0.081));
    for (const s of [-1, 1]) signals.push(new THREE.BoxGeometry(0.01, 0.17, 0.11).translate(s * 0.091, EAVE - 0.16, lz));
    const glow = new THREE.Sprite(M.signalGlow);
    glow.position.set(0, EAVE - 0.16, lz + e * 0.12);
    glow.scale.setScalar(0.42);
    g.add(glow);
  }

  // --- Untergestell: Langträger, Achslager mit Blattfedern, Zugstange vorn und hinten.
  for (const s of [-1, 1]) {
    b.box(WOOD, 0.12, 0.14, 2 * ZP - 0.3, s * 0.55, 0.62, 0);
    for (const za of AXLES) {
      b.box(IRON, 0.14, 0.2, 0.22, s * 0.95, WHEEL_R, za);
      b.box(IRON, 0.07, 0.05, 0.74, s * 0.95, WHEEL_R + 0.17, za);
    }
  }
  for (const e of [-1, 1]) b.add(rod(new THREE.Vector3(0, 0.6, e * (ZP - 0.4)), new THREE.Vector3(0, 0.62, e * (ZP + 0.12)), 0.03), IRON);

  g.add(new THREE.Mesh(b.build(), M.body));
  g.add(new THREE.Mesh(inside.build(), M.inside));
  g.add(new THREE.Mesh(merge(glass), M.glass));
  g.add(new THREE.Mesh(merge(lamps), M.lamp));
  g.add(new THREE.Mesh(merge(signals), M.signal));
  for (const e of [-1, 1]) {
    const glow = new THREE.Sprite(M.lampGlow);
    // Klein genug, dass der Schein nicht über die Dachkante hinausreicht.
    glow.position.set(0, 2.42, e * (ZB - 0.2));
    glow.scale.setScalar(0.62);
    g.add(glow);
  }

  // Lichtschein der Fenster auf dem Pflaster links und rechts.
  for (const s of [-1, 1]) {
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 4.6).rotateX(-Math.PI / 2), M.pool);
    pool.position.set(s * 2.0, 0.035, 0);
    g.add(pool);
  }

  const wheels = AXLES.map((za) => {
    const pivot = new THREE.Group();
    pivot.position.set(0, WHEEL_R, za);
    pivot.add(new THREE.Mesh(wheelSet(), M.body));
    g.add(pivot);
    return { pivot, r: WHEEL_R };
  });

  // Fahrgäste auf den Längsbänken, als Schattenriss vor dem Lampenlicht.
  const looks = [
    { outfit: 'overcoat', coat: 0x26262a, hat: 'bowler', moustache: 'brush' },
    { outfit: 'frock', coat: 0x2a2420, hat: 'top', beard: 'full' },
    { coat: 0x30261e, hat: 'cap', neck: 'scarf' },
  ];
  const seats = [[1, -1.0], [-1, 0.2], [1, 1.2]];
  for (let i = 0; i < Math.min(passengers, seats.length); i++) {
    const [s, z] = seats[i];
    const p = makeFigure({ ...looks[i], pose: 'sit' });
    p.position.set(s * (hw - 0.37), FLOOR + 0.46 - 0.87, z);
    p.rotation.y = -s * Math.PI / 2;
    g.add(p);
  }

  g.userData = { wheels };
  return g;
}

// Pferd mit Ortscheit und Zugsträngen, in Pferdekoordinaten (Mitte im Ursprung, Blick nach +z).
// Beim Umspannen bleibt das Ortscheit an den Strängen und wird am anderen Wagenende wieder
// an die Zugstange gehängt.
export function makeTeam(color = 0x3b2618) {
  const team = new THREE.Group();
  const horse = makeHorse(color);
  team.add(horse);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const b = new Bag();
  b.add(rod(V(-0.45, 0.8, -TRACE), V(0.45, 0.8, -TRACE), 0.03), WOOD);
  for (const s of [-1, 1]) {
    b.add(new THREE.SphereGeometry(0.03, 6, 5).translate(s * 0.45, 0.8, -TRACE), IRON);
    strap(b, V(s * 0.36, 1.06, -0.62), V(s * 0.45, 0.8, -TRACE), 0.05, 0.014, LEATHER);
  }
  team.add(new THREE.Mesh(b.build(), materials().body));
  team.userData = { horse };
  return team;
}

// Kutscher und Schaffner in dunkelblauer Dienstkleidung mit Mütze.
export function makeCrew() {
  const uniform = { outfit: 'overcoat', coat: 0x1b2130, trousers: 0x161a24, hat: 'cap', hatColor: 0x12151d, buttons: 0x9a7c3c };
  return {
    driver: makeFigure({ ...uniform, cape: true, moustache: 'walrus', height: 1.74 }),
    conductor: makeFigure({ ...uniform, moustache: 'kaiser', height: 1.72 }),
  };
}

// Beide Hände des Kutschers vorn über der Spritzwand an den Leinen.
export function holdReins(driver) {
  const f = driver.userData.figure;
  f.armL.rotation.x = f.armR.rotation.x = -0.3;
  f.foreL.rotation.x = f.restL - 1.1;
  f.foreR.rotation.x = f.restR - 1.1;
}

// Wo auf der Plattform am Ende e (+1 / -1) der Kutscher steht, wo der Schaffner, wo die Hände an
// den Leinen sind und wo das Ortscheit an der Zugstange hängt (Wagenkoordinaten).
export const SPOTS = {
  driver: (e, out) => out.set(0, PFLOOR, e * (ZP - 0.5)),
  conductor: (e, out) => out.set(-0.45, PFLOOR, e * (ZP - 0.5)),
  hand: (e, side, out) => out.set(side * 0.17, PFLOOR + 1.06, e * (ZP - 0.14)),
  hook: (e, out) => out.set(0, 0.62, e * (ZP + 0.12)),
};

// Gerader Stab zwischen zwei bewegten Punkten: das kurze Eisen von der Zugstange zum Ortscheit.
const UP = new THREE.Vector3(0, 1, 0);
const span = new THREE.Vector3();
export function makeLink() {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 6).translate(0, 0.5, 0), std({ color: IRON, roughness: 0.5, metalness: 0.4 }));
  mesh.frustumCulled = false;
  mesh.userData.set = (a, b) => {
    span.subVectors(b, a);
    const len = span.length();
    mesh.position.copy(a);
    mesh.quaternion.setFromUnitVectors(UP, span.divideScalar(Math.max(len, 1e-4)));
    mesh.scale.set(1, len, 1);
  };
  return mesh;
}

// Bewegliche Riemen (die Leinen vom Sattel zur Hand des Kutschers): dünne Vierkantschläuche durch
// durchhängende Punktfolgen, alle in einer Geometrie, die jedes Bild neu gesetzt wird.
const T = new THREE.Vector3();
const S = new THREE.Vector3();
const U = new THREE.Vector3();
export class Cords {
  constructor(count, n, r, color) {
    this.n = n;
    this.r = r;
    const ring = (n + 1) * 4;
    this.pos = new Float32Array(count * ring * 3);
    this.nor = new Float32Array(count * ring * 3);
    const idx = [];
    for (let c = 0; c < count; c++) {
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < 4; k++) {
          const a = c * ring + i * 4 + k;
          const b = c * ring + i * 4 + ((k + 1) % 4);
          idx.push(a, a + 4, b, b, a + 4, b + 4);
        }
      }
    }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('normal', new THREE.BufferAttribute(this.nor, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setIndex(idx);
    this.mesh = new THREE.Mesh(this.geo, std({ color, roughness: 0.6 }));
    this.mesh.frustumCulled = false;
    this.pts = Array.from({ length: n + 1 }, () => new THREE.Vector3());
  }

  // Riemen c von a nach b, in der Mitte um sag durchhängend.
  set(c, a, b, sag) {
    const { n, r, pts, pos, nor } = this;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      pts[i].lerpVectors(a, b, k);
      pts[i].y -= sag * 4 * k * (1 - k);
    }
    const base = c * (n + 1) * 4;
    for (let i = 0; i <= n; i++) {
      T.subVectors(pts[Math.min(n, i + 1)], pts[Math.max(0, i - 1)]).normalize();
      S.crossVectors(T, UP);
      if (S.lengthSq() < 1e-8) S.set(1, 0, 0);
      S.normalize();
      U.crossVectors(S, T);
      for (let k = 0; k < 4; k++) {
        const d = k % 2 === 0 ? S : U;
        const sg = k < 2 ? 1 : -1;
        const o = (base + i * 4 + k) * 3;
        pos[o] = pts[i].x + d.x * r * sg;
        pos[o + 1] = pts[i].y + d.y * r * sg;
        pos[o + 2] = pts[i].z + d.z * r * sg;
        nor[o] = d.x * sg;
        nor[o + 1] = d.y * sg;
        nor[o + 2] = d.z * sg;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.normal.needsUpdate = true;
  }
}
