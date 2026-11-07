import * as THREE from 'three';
import { Bag, merge, std } from '../kit.js';
import { makeFigure, makeHorse, trotHorse, walkFigure } from '../figures.js';
import { rng, signTexture } from '../textures.js';

const toSource = new THREE.Vector3();
const earRight = new THREE.Vector3();

// Lautstärke (0..1, quadratisch abfallend bis range Meter) und Stereoseite (-1 links bis 1
// rechts) einer Geräuschquelle bei (x, z), vom Kamerastandpunkt aus.
export function hearing(camera, x, z, range) {
  toSource.set(x - camera.position.x, 0, z - camera.position.z);
  const d = toSource.length();
  earRight.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
  return { vol: Math.max(0, 1 - d / range) ** 2, pan: d > 0.01 ? toSource.divideScalar(d).dot(earRight) : 0 };
}

const WHEEL = 0x5e2216;
const IRON = 0x161616;
const BRASS = 0x9a7c3c;
const LEATHER = 0x15110e;
let cabMats = null;

// Rad mit Achse in x, Mitte im Ursprung: Holzfelge mit Eisenreifen, Speichen, Nabe mit Messingkappe.
function wheelPair(r, spokes, x) {
  const bag = new Bag();
  for (const s of [-1, 1]) {
    bag.add(new THREE.TorusGeometry(r - 0.04, 0.03, 5, 28).rotateY(Math.PI / 2).translate(s * x, 0, 0), WHEEL);
    bag.add(new THREE.TorusGeometry(r - 0.01, 0.018, 4, 28).rotateY(Math.PI / 2).translate(s * x, 0, 0), IRON);
    bag.add(new THREE.CylinderGeometry(0.07, 0.085, 0.18, 10).rotateZ(Math.PI / 2).translate(s * x, 0, 0), WHEEL);
    bag.add(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 10).rotateZ(Math.PI / 2).translate(s * (x + 0.1), 0, 0), BRASS);
    for (let k = 0; k < spokes; k++) {
      const len = r - 0.11;
      bag.add(new THREE.BoxGeometry(0.022, len, 0.03).translate(0, 0.075 + len / 2, 0).rotateX((k / spokes) * Math.PI * 2).translate(s * x, 0, 0), WHEEL);
    }
  }
  return bag.build();
}

// Berliner Droschke zweiter Klasse: geschlossener Kasten für vier Fahrgäste mit Tür- und
// Seitenfenstern, davor der Bock mit Fußbrett und Spritzleder, Laternen an den vorderen Ecken,
// Gepäckgeländer auf dem Dach, die Wagennummer hinten. Fahrwerk mit Langbaum, Drehkranz und
// Druckfedern. Die Räder drehen sich, wenn die Droschke fährt (userData.wheels).
// waiting: Das Pferd steht mit Decke und Futtersack am Halteplatz.
export function makeDroschke({ driver: withDriver = true, horse: horseColor = 0x30221a, waiting = false, color = 0x14181e, number = '1307' } = {}) {
  cabMats ??= {
    body: std({ vertexColors: true, roughness: 0.3, metalness: 0.15 }),
    glass: std({ color: 0x0e1520, roughness: 0.08, metalness: 0.75 }),
    lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(3.6, 2.3, 0.95) }),
  };
  const g = new THREE.Group();
  const body = new Bag();
  const glass = [];
  const lamps = [];
  // Kasten aus dem Seitenriss: unten geschwungen, Ecken oben gerundet.
  const side = new THREE.Shape();
  side.moveTo(-0.25, 0.95);
  side.lineTo(-0.22, 1.82);
  side.quadraticCurveTo(-0.23, 1.9, -0.34, 1.9);
  side.lineTo(-1.86, 1.9);
  side.quadraticCurveTo(-1.97, 1.9, -1.98, 1.82);
  side.lineTo(-1.95, 0.98);
  side.quadraticCurveTo(-1.9, 0.76, -1.6, 0.76);
  side.lineTo(-0.6, 0.76);
  side.quadraticCurveTo(-0.3, 0.76, -0.25, 0.95);
  const W = 1.3;
  body.add(new THREE.ExtrudeGeometry(side, { depth: W - 0.04, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1, curveSegments: 6 }).rotateY(-Math.PI / 2).translate(W / 2 - 0.02, 0, 0), color);
  const hw = W / 2 + 0.006;
  for (const s of [-1, 1]) {
    // Fenster: vorderes Seitenfenster, Türfenster, hinteres Seitenfenster, mit Goldlinie gerahmt.
    for (const [z0, z1] of [[-0.74, -0.42], [-1.4, -0.86], [-1.82, -1.52]]) {
      glass.push(new THREE.BoxGeometry(0.01, 0.42, z1 - z0).translate(s * hw, 1.5, (z0 + z1) / 2));
      for (const y of [1.28, 1.72]) body.add(new THREE.BoxGeometry(0.012, 0.018, z1 - z0 + 0.04).translate(s * (hw + 0.002), y, (z0 + z1) / 2), BRASS);
      for (const z of [z0, z1]) body.add(new THREE.BoxGeometry(0.012, 0.46, 0.018).translate(s * (hw + 0.002), 1.5, z), BRASS);
    }
    // Tür mit Fugen und Griff, rote Zierlinie in Gürtelhöhe, Tritt darunter.
    for (const z of [-1.47, -0.79]) body.add(new THREE.BoxGeometry(0.012, 1.0, 0.014).translate(s * (hw + 0.001), 1.29, z), 0x060708);
    body.add(new THREE.BoxGeometry(0.012, 0.016, 1.62).translate(s * (hw + 0.002), 1.2, -1.1), 0x7a1c14);
    body.add(new THREE.BoxGeometry(0.012, 0.016, 1.5).translate(s * (hw + 0.002), 0.9, -1.1), 0x7a1c14);
    body.add(new THREE.BoxGeometry(0.04, 0.03, 0.1).translate(s * (hw + 0.02), 1.22, -0.88), BRASS);
    body.add(new THREE.BoxGeometry(0.2, 0.025, 0.2).translate(s * 0.76, 0.5, -1.12), IRON);
    body.add(new THREE.BoxGeometry(0.02, 0.28, 0.02).rotateZ(s * 0.5).translate(s * 0.69, 0.63, -1.12), IRON);
    // Laterne an der vorderen Ecke: Gehäuse, Glas nach vorn und zur Seite, Haube mit Schornstein.
    const lx = s * 0.76;
    body.add(new THREE.BoxGeometry(0.12, 0.03, 0.03).translate(s * 0.69, 1.45, -0.3), IRON);
    body.add(new THREE.BoxGeometry(0.14, 0.2, 0.14).translate(lx, 1.48, -0.3), IRON);
    body.add(new THREE.ConeGeometry(0.11, 0.1, 4).rotateY(Math.PI / 4).translate(lx, 1.63, -0.3), IRON);
    body.add(new THREE.CylinderGeometry(0.02, 0.025, 0.08, 6).translate(lx, 1.71, -0.3), IRON);
    body.add(new THREE.BoxGeometry(0.16, 0.025, 0.16).translate(lx, 1.37, -0.3), BRASS);
    lamps.push(new THREE.BoxGeometry(0.1, 0.14, 0.01).translate(lx, 1.49, -0.225));
    lamps.push(new THREE.BoxGeometry(0.01, 0.14, 0.1).translate(lx + s * 0.072, 1.49, -0.3));
  }
  // Stirnfenster zum Kutscher hin.
  glass.push(new THREE.BoxGeometry(0.9, 0.38, 0.01).translate(0, 1.5, -0.205));
  // Gepäckgeländer auf dem Dach.
  for (const x of [-0.58, 0.58]) {
    body.add(new THREE.CylinderGeometry(0.012, 0.012, 1.5, 4).rotateX(Math.PI / 2).translate(x, 2.02, -1.1), IRON);
    for (const z of [-1.8, -1.1, -0.4]) body.add(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 4).translate(x, 1.96, z), IRON);
  }
  for (const z of [-1.85, -0.35]) body.add(new THREE.CylinderGeometry(0.012, 0.012, 1.16, 4).rotateZ(Math.PI / 2).translate(0, 2.02, z), IRON);

  // Bock: Sitzkasten mit Lederkissen und Seitenlehnen, Fußbrett, Spritzleder.
  body.box(color, 1.1, 0.24, 0.6, 0, 0.86, 0.05);
  body.box(LEATHER, 1.0, 0.08, 0.5, 0, 1.02, 0.08);
  for (const s of [-1, 1]) body.add(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 4).rotateX(Math.PI / 2).translate(s * 0.53, 1.18, 0.05), IRON);
  for (const s of [-1, 1]) for (const z of [-0.15, 0.25]) body.add(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 4).translate(s * 0.53, 1.08, z), IRON);
  body.box(0x1e1a14, 1.0, 0.04, 0.55, 0, 0.56, 0.62);
  for (const s of [-1, 1]) body.add(new THREE.BoxGeometry(0.03, 0.03, 0.45).rotateX(0.5).translate(s * 0.45, 0.66, 0.4), IRON);
  body.add(new THREE.BoxGeometry(1.0, 0.6, 0.02).rotateX(0.2).translate(0, 0.85, 0.92), LEATHER);
  body.add(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 4).rotateZ(Math.PI / 2).translate(0, 1.14, 0.98), IRON);
  // Fahrwerk: Achsen, Langbaum, Drehkranz, Druckfedern. Deichseln steigen zur Sellette an.
  body.add(new THREE.CylinderGeometry(0.03, 0.03, 1.56, 6).rotateZ(Math.PI / 2).translate(0, 0.62, -1.3), IRON);
  body.add(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6).rotateZ(Math.PI / 2).translate(0, 0.42, 0.5), IRON);
  body.box(0x1e1a14, 0.07, 0.07, 1.9, 0, 0.55, -0.4);
  body.add(new THREE.TorusGeometry(0.3, 0.02, 4, 20).rotateX(Math.PI / 2).translate(0, 0.52, 0.5), IRON);
  for (const s of [-1, 1]) {
    body.add(new THREE.TorusGeometry(0.26, 0.022, 4, 18).scale(1, 0.22, 1).rotateY(Math.PI / 2).translate(s * 0.5, 0.69, -1.3), IRON);
    body.add(new THREE.TorusGeometry(0.22, 0.02, 4, 16).scale(1, 0.18, 1).rotateY(Math.PI / 2).translate(s * 0.42, 0.49, 0.5), IRON);
    body.add(new THREE.BoxGeometry(0.06, 0.06, 2.7).rotateX(-0.11).translate(s * 0.45, 0.95, 1.75), 0x1e1a14);
  }
  g.add(new THREE.Mesh(body.build(), cabMats.body));
  g.add(new THREE.Mesh(merge(glass), cabMats.glass));
  g.add(new THREE.Mesh(merge(lamps), cabMats.lamp));
  // Wagennummer hinten.
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.16),
    new THREE.MeshStandardMaterial({ map: signTexture([`№ ${number}`], { width: 256, height: 128, bg: '#e6dfc8', fg: '#16140e', font: '"EB Garamond", serif', size: 78 }), roughness: 0.5 }),
  );
  plate.position.set(0, 1.35, -2.005);
  plate.rotation.y = Math.PI;
  g.add(plate);
  const wheels = [];
  for (const [r, z, spokes, x] of [[0.62, -1.3, 14, 0.78], [0.42, 0.5, 10, 0.72]]) {
    const pivot = new THREE.Group();
    pivot.position.set(0, r, z);
    pivot.add(new THREE.Mesh(wheelPair(r, spokes, x), cabMats.body));
    g.add(pivot);
    wheels.push({ pivot, r });
  }
  g.userData.wheels = wheels;
  // Kutscher sitzt auf dem Bock (Oberkante 1.07).
  if (withDriver) {
    const driver = makeFigure({ outfit: 'overcoat', cape: true, coat: 0x24201a, hat: 'top', hatColor: 0x18140f, moustache: 'walrus', pose: 'sit' });
    driver.position.set(0, 0.2, 0.15);
    g.add(driver);
  }
  const horse = makeHorse(horseColor, { blanket: waiting, nosebag: waiting });
  horse.position.set(0, 0, 3.0);
  g.add(horse);
  g.userData.horse = horse;
  return g;
}

export function buildTraffic(loc, r) {
  const { scene } = loc;
  // Droschke fährt die Rosenthaler rauf und runter, Wende im Platz.
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(3.6, 0, -180),
    new THREE.Vector3(3.6, 0, -90),
    new THREE.Vector3(3.6, 0, -30),
    new THREE.Vector3(6, 0, -4),
    new THREE.Vector3(0, 0, 8),
    new THREE.Vector3(-6, 0, -4),
    new THREE.Vector3(-3.6, 0, -30),
    new THREE.Vector3(-3.6, 0, -90),
    new THREE.Vector3(-3.6, 0, -180),
    new THREE.Vector3(0, 0, -184),
  ], true);
  const cab = makeDroschke({ color: 0x24121a, horse: 0x4a2c1a, number: '2215' });
  scene.add(cab);
  const light = new THREE.Vector3();
  const pathLen = curve.getLength();
  let u = 0.1;
  let phase = 0;
  let lastBeat = 0;
  const ahead = new THREE.Vector3();
  loc.onUpdate((dt, t, { camera }) => {
    const p = curve.getPointAt(u);
    curve.getPointAt((u + 0.002) % 1, ahead);
    const dist = Math.hypot(p.x - camera.position.x, p.z - camera.position.z);
    const blocked = dist < 7 && (camera.position.x - p.x) * (ahead.x - p.x) + (camera.position.z - p.z) * (ahead.z - p.z) > 0;
    const speed = blocked ? 0 : 4.2;
    u = (u + (speed * dt) / pathLen) % 1;
    cab.position.set(p.x, 0, p.z);
    cab.rotation.y = Math.atan2(ahead.x - p.x, ahead.z - p.z);
    // Rattern der Räder (audio.js) und je halbem Schritt ein Hufpaar, so wie die Beine schwingen.
    const ear = hearing(camera, p.x, p.z, 45);
    loc.cab = { vol: ear.vol, pan: ear.pan, moving: speed > 0 };
    if (speed > 0) {
      phase += dt * 9;
      trotHorse(cab.userData.horse, phase);
      for (const w of cab.userData.wheels) w.pivot.rotation.x += (speed * dt) / w.r;
      const beat = Math.floor(phase / Math.PI);
      if (beat !== lastBeat) {
        lastBeat = beat;
        (loc.sounds ??= []).push({ type: 'hoof', vol: ear.vol, pan: ear.pan });
      }
    }
    light.copy(p);
  });

  // Passanten auf den Gehwegen
  const looks = [
    { outfit: 'overcoat', coat: 0x1f2228, hat: 'top', moustache: 'kaiser', cane: true, height: 1.8 },
    { outfit: 'frock', coat: 0x2a2620, vest: 0x3a3226, hat: 'bowler', beard: 'full', hair: 0x4a4038, chain: true, build: 'stout' },
    { coat: 0x30261e, neck: 'scarf', tie: 0x5a3020, hat: 'cap', trousers: 0x24201a, beard: 'stubble' },
    { outfit: 'overcoat', coat: 0x262a2e, hat: 'cap', moustache: 'walrus', hair: 0x6a6258 },
    { outfit: 'dress', coat: 0x38242a, hat: 'bonnet', hatColor: 0x22161a, shawl: 0x4a3a30, height: 1.62 },
    { outfit: 'dress', coat: 0x2a2c38, hat: 'bonnet', hatColor: 0x1c1c26, collar: 0xe0dacb, build: 'slim', height: 1.6 },
    { outfit: 'frock', coat: 0x1c1f24, hat: 'bowler', cane: true, beard: 'mutton', eyewear: 'spectacles' },
    { coat: 0x322a22, neck: 'none', hat: 'cap', apron: 0x8a8272, moustache: 'brush', build: 'stout' },
  ];
  const routes = [
    [[-7.5, -28], [-7.5, -180]],
    [[7.5, -176], [7.5, -30]],
    [[-7.5, -130], [-7.5, -40]],
    [[7.5, -80], [7.5, -170]],
    [[14, -96.4], [120, -96.4]],
    [[118, -103.5], [14, -103.5]],
    [[-42, -12.6], [-160, -12.6]],
    [[-150, -3.4], [-38, -3.4]],
    [[-24, -18], [24, -18]],
    [[20, 12], [-20, 12]],
    [[-90, 40], [80, 40]],
    // Durch den Viaduktbogen bis vor den Brunnen (plaza.js).
    [[-3, 35], [-3, 0]],
    // Quer über den Platz, am Brunnen vorbei, und an der Urania-Säule entlang.
    [[-20, -9], [20, -12]],
    [[10, -20], [10, 4]],
  ];
  // Die Passanten nach den ersten zwölf ziehen aus eigenem Zufall, damit r für das Wetter
  // danach bleibt, wie es war.
  const rw = rng(1894);
  const walkers = routes.map((route, i) => {
    const fig = makeFigure(looks[i % looks.length]);
    const from = new THREE.Vector2(route[0][0], route[0][1]);
    const to = new THREE.Vector2(route[1][0], route[1][1]);
    const len = from.distanceTo(to);
    const rr = i < 12 ? r : rw;
    const w = { fig, from, to, len, s: rr() * len, dir: 1, phase: rr() * 6, speed: 1.05 + rr() * 0.4 };
    scene.add(fig);
    return w;
  });
  loc.onUpdate((dt, t, { camera }) => {
    for (const w of walkers) {
      const a = w.from;
      const b = w.to;
      const k = w.s / w.len;
      const x = a.x + (b.x - a.x) * k;
      const z = a.y + (b.y - a.y) * k;
      const dx = camera.position.x - x;
      const dz = camera.position.z - z;
      const near = dx * dx + dz * dz < 1.3;
      if (!near) {
        w.s += w.dir * w.speed * dt;
        w.phase += dt * w.speed * 5.2;
        if (w.s > w.len) w.dir = -1;
        if (w.s < 0) w.dir = 1;
        walkFigure(w.fig, w.phase);
      }
      w.fig.position.set(x, loc.heightAt(x, z), z);
      w.fig.rotation.y = Math.atan2((b.x - a.x) * w.dir, (b.y - a.y) * w.dir);
    }
  });
}
