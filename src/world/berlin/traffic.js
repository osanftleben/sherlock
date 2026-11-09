import * as THREE from 'three';
import { Bag, merge, std } from '../kit.js';
import { idleFigure, makeFigure, makeHorse, trotHorse, walkFigure } from '../figures.js';
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
  // Fahrwerk: Achsen, Langbaum, Drehkranz, Druckfedern. Deichseln und Geschirr siehe harness().
  body.add(new THREE.CylinderGeometry(0.03, 0.03, 1.56, 6).rotateZ(Math.PI / 2).translate(0, 0.62, -1.3), IRON);
  body.add(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6).rotateZ(Math.PI / 2).translate(0, 0.42, 0.5), IRON);
  body.box(0x1e1a14, 0.07, 0.07, 1.9, 0, 0.55, -0.4);
  body.add(new THREE.TorusGeometry(0.3, 0.02, 4, 20).rotateX(Math.PI / 2).translate(0, 0.52, 0.5), IRON);
  for (const s of [-1, 1]) {
    body.add(new THREE.TorusGeometry(0.26, 0.022, 4, 18).scale(1, 0.22, 1).rotateY(Math.PI / 2).translate(s * 0.5, 0.69, -1.3), IRON);
    body.add(new THREE.TorusGeometry(0.22, 0.02, 4, 16).scale(1, 0.18, 1).rotateY(Math.PI / 2).translate(s * 0.42, 0.49, 0.5), IRON);
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
  // Mitte der beiden Laternen in Wagenkoordinaten, für ihr Licht (cabLamps).
  g.userData.lanterns = [-1, 1].map((s) => new THREE.Vector3(s * 0.76, 1.49, -0.3));
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
  g.add(new THREE.Mesh(harness(withDriver), cabMats.body));
  return g;
}

// Stab von a nach b, Querschnitt r.
// Die beiden Laternen einer Droschke als Lichter (loc.extraLamps): klein und schwach wie die
// Signallaternen der Pferdebahn. Sie stehen außerhalb der Schattenzylinder des Wagens
// (groundshade.js), so hält der Kasten das Licht der einen Laterne von der anderen Seite ab.
// Zurück kommt place(), das die Lichter der Lage des Wagens nachführt; wer fährt (moving), ruft es
// nach jeder Bewegung auf, wer steht, bekommt beim Laden eine vorab gerechnete Schattenschicht.
export function cabLamps(loc, cab, moving = false) {
  const lamps = cab.userData.lanterns.map((v) => ({ v, x: 0, y: 0, z: 0, intensity: 3, moving }));
  const place = () => {
    const { x, y, z } = cab.position;
    const sin = Math.sin(cab.rotation.y);
    const cos = Math.cos(cab.rotation.y);
    for (const l of lamps) {
      l.x = x + cos * l.v.x + sin * l.v.z;
      l.y = y + l.v.y;
      l.z = z - sin * l.v.x + cos * l.v.z;
    }
  };
  place();
  (loc.extraLamps ??= []).push(...lamps);
  return place;
}

export function rod(a, b, r, sides = 6) {
  const d = new THREE.Vector3().subVectors(b, a);
  const geo = new THREE.CylinderGeometry(r, r, d.length(), sides);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  return geo.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
}

// Durchhängender Riemen von a nach b, in n Stücken.
export function strap(bag, a, b, sag, r, color, n = 4) {
  let prev = a;
  for (let i = 1; i <= n; i++) {
    const k = i / n;
    const p = new THREE.Vector3().lerpVectors(a, b, k);
    p.y -= sag * 4 * k * (1 - k);
    bag.add(rod(prev, p, r, 4), color);
    prev = p;
  }
}

// Anspannung zwischen Wagen und Pferd (Pferd bei z = 3, siehe makeDroschke), in Wagenkoordinaten.
// Die Deichseln steigen vom Drehkranz an den Flanken entlang bis vor die Schulter und hängen am
// Sattel in Trageösen; das Hinterzeug greift an ihnen an. Die Zugstränge laufen vom Kummet zum
// Ortscheit vorn am Wagen. Die Leinen gehen vom Sattel zu den Händen des Kutschers, beim
// wartenden Wagen hängen sie lose über dem Spritzleder.
function harness(withDriver) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const wood = 0x1e1a14;
  const b = new Bag();
  for (const s of [-1, 1]) {
    // Deichsel in drei Stücken, vorn leicht nach innen gebogen, mit Messingkappe.
    const pts = [V(s * 0.45, 0.8, 0.45), V(s * 0.53, 0.98, 2.2), V(s * 0.53, 1.08, 3.1), V(s * 0.47, 1.15, 3.62)];
    for (let i = 1; i < pts.length; i++) b.add(rod(pts[i - 1], pts[i], 0.032), wood);
    b.add(new THREE.SphereGeometry(0.036, 8, 6).translate(pts[3].x, pts[3].y, pts[3].z), BRASS);
    // Trageöse am Sattel, Riemen hinauf zum Sattelkissen.
    b.add(new THREE.TorusGeometry(0.05, 0.014, 4, 12).translate(s * 0.53, 1.08, 3.12), LEATHER);
    b.add(rod(V(s * 0.18, 1.55, 3.12), V(s * 0.53, 1.13, 3.12), 0.014, 4), LEATHER);
    // Hinterzeug an die Deichsel.
    b.add(rod(V(s * 0.4, 1.13, 2.5), V(s * 0.53, 1.0, 2.35), 0.014, 4), LEATHER);
    // Zugstrang vom Ende am Pferd (Hüfte) zum Ortscheit.
    strap(b, V(s * 0.36, 1.06, 2.38), V(s * 0.4, 0.8, 1.18), 0.06, 0.014, LEATHER);
    // Leinen.
    if (withDriver) strap(b, V(s * 0.1, 1.64, 3.12), V(s * 0.16, 1.2, 0.48), 0.12, 0.007, LEATHER, 6);
    else strap(b, V(s * 0.1, 1.64, 3.12), V(s * 0.22, 1.16, 0.98), 0.3, 0.007, LEATHER, 6);
  }
  // Ortscheit quer vor dem Wagen, an einer Stange zum Langbaum.
  b.add(rod(V(-0.44, 0.8, 1.18), V(0.44, 0.8, 1.18), 0.03), wood);
  b.add(rod(V(0, 0.55, 0.55), V(0, 0.8, 1.18), 0.03), IRON);
  for (const s of [-1, 1]) b.add(new THREE.SphereGeometry(0.03, 6, 5).translate(s * 0.44, 0.8, 1.18), IRON);
  return b.build();
}

export function buildTraffic(loc, r) {
  const { scene } = loc;
  // Droschke fährt die Rosenthaler rauf und runter, Wende im Platz. Die Spuren liegen weit genug
  // außen, dass sie neben dem Pferdebahnwagen Platz hat, auch wo der über den Gleiswechsel schwenkt.
  // Vor der Baustelle wendet sie über die Gleise: Fährt dort gerade die Bahn (loc.tramZone,
  // tramline.js), wartet sie davor, und solange sie wendet (loc.cab.turning), wartet die Bahn.
  const LANE = 4.3;
  // Genug Stützpunkte auf den Geraden, sonst baucht die Kurve vor den Wenden bis an den Bordstein aus.
  const curve = new THREE.CatmullRomCurve3([
    [LANE, -176], [LANE, -150], [LANE, -110], [LANE, -70], [LANE, -36],
    [6, -4], [0, 8], [-6, -4],
    [-LANE, -36], [-LANE, -70], [-LANE, -110], [-LANE, -150], [-LANE, -176],
    [0, -184],
  ].map(([x, z]) => new THREE.Vector3(x, 0, z)), true);
  const cab = makeDroschke({ color: 0x24121a, horse: 0x4a2c1a, number: '2215' });
  scene.add(cab);
  const placeLamps = cabLamps(loc, cab, true);
  const light = new THREE.Vector3();
  const pathLen = curve.getLength();
  let u = 0.1;
  let phase = 0;
  let lastBeat = 0;
  const ahead = new THREE.Vector3();
  // Steht Holmes auf ihrem Weg (die nächsten Meter ihrer Bahn, so breit wie Kasten und Pferd), hält
  // die Droschke an; wer daneben oder auf dem Gehweg steht, an dem fährt sie vorbei. So bleibt sie
  // auch nicht mitten in der Wende über den Gleisen stehen, wenn er nur in der Nähe wartet.
  const look = new THREE.Vector3();
  // Für Messungen angehalten (loc.trafficStage unten).
  let held = false;
  const inPath = (cam) => {
    for (let k = 0; k <= 10; k++) {
      curve.getPointAt((u + (k * 0.75) / pathLen) % 1, look);
      if ((look.x - cam.x) ** 2 + (look.z - cam.z) ** 2 < 1.25 * 1.25) return true;
    }
    return false;
  };
  loc.onUpdate((dt, t, { camera }) => {
    const p = curve.getPointAt(u);
    curve.getPointAt((u + 0.002) % 1, ahead);
    const dist = Math.hypot(p.x - camera.position.x, p.z - camera.position.z);
    const turning = p.z < -174;
    const enteringTurn = !turning && p.z < -166 && ahead.z < p.z;
    const blocked = (dist < 9 && inPath(camera.position)) || (enteringTurn && loc.tramZone);
    const speed = held || blocked ? 0 : 4.2;
    u = (u + (speed * dt) / pathLen) % 1;
    cab.position.set(p.x, 0, p.z);
    cab.rotation.y = Math.atan2(ahead.x - p.x, ahead.z - p.z);
    placeLamps();
    // Rattern der Räder (audio.js) und je halbem Schritt ein Hufpaar, so wie die Beine schwingen.
    const ear = hearing(camera, p.x, p.z, 45);
    loc.cab = { vol: ear.vol, pan: ear.pan, moving: speed > 0, turning };
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

  // Passanten auf den Gehwegen. Es nieselt: Wer keinen Zylinder und keinen Stock trägt, hat
  // oft einen Schirm aufgespannt.
  const looks = [
    { outfit: 'overcoat', coat: 0x1f2228, hat: 'top', moustache: 'kaiser', cane: true, height: 1.8 },
    { outfit: 'frock', coat: 0x2a2620, vest: 0x3a3226, hat: 'bowler', beard: 'full', hair: 0x4a4038, chain: true, build: 'stout', umbrella: 0x121214 },
    { coat: 0x30261e, neck: 'scarf', tie: 0x5a3020, hat: 'cap', trousers: 0x24201a, beard: 'stubble' },
    { outfit: 'overcoat', coat: 0x262a2e, hat: 'cap', moustache: 'walrus', hair: 0x6a6258 },
    { outfit: 'dress', coat: 0x38242a, hat: 'bonnet', hatColor: 0x22161a, shawl: 0x4a3a30, height: 1.62, umbrella: 0x2a161c },
    { outfit: 'dress', coat: 0x2a2c38, hat: 'bonnet', hatColor: 0x1c1c26, collar: 0xe0dacb, build: 'slim', height: 1.6, umbrella: 0x16181e },
    { outfit: 'frock', coat: 0x1c1f24, hat: 'bowler', cane: true, beard: 'mutton', eyewear: 'spectacles' },
    { coat: 0x322a22, neck: 'none', hat: 'cap', apron: 0x8a8272, moustache: 'brush', build: 'stout', pipe: true },
    { outfit: 'overcoat', coat: 0x2c2a26, hat: 'bowler', moustache: 'brush', neck: 'scarf', tie: 0x3a2a24, build: 'slim', umbrella: 0x141416 },
    { outfit: 'dress', coat: 0x2c2420, hat: 'bonnet', hatColor: 0x1a1612, shawl: 0x5a4a3a, build: 'stout', height: 1.58 },
    { coat: 0x26221e, hat: 'cap', trousers: 0x1e1c1a, neck: 'scarf', tie: 0x2a3a4a, beard: 'stubble', height: 1.72 },
    { outfit: 'dress', coat: 0x1e1a22, hat: 'bonnet', hatColor: 0x2a1a24, collar: 0xd8d2c4, height: 1.66, umbrella: 0x22121a },
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
    // Später dazugekommen (aus rw): mehr Leben auf dem Platz und in den Straßen.
    [[-27.5, -20], [-27.5, 12]],
    [[27.5, 12], [27.5, -20]],
    [[-18, -21], [4, 12]],
    [[7.5, -36], [7.5, -120]],
    [[-7.5, -160], [-7.5, -60]],
    [[60, -96.4], [16, -96.4]],
    [[-60, -3.4], [-120, -3.4]],
  ];
  // Die Passanten nach den ersten zwölf ziehen aus eigenem Zufall, damit r für das Wetter
  // danach bleibt, wie es war.
  const rw = rng(1894);
  const walkers = routes.map((route, i) => {
    const look = looks[i % looks.length];
    const fig = makeFigure(look);
    const from = new THREE.Vector2(route[0][0], route[0][1]);
    const to = new THREE.Vector2(route[1][0], route[1][1]);
    const len = from.distanceTo(to);
    const rr = i < 12 ? r : rw;
    const w = { fig, from, to, len, s: rr() * len, dir: 1, phase: rr() * 6, speed: 1.05 + rr() * 0.4 };
    // Schuhwerk für die Schritte: Damenabsätze, Arbeiterstiefel (Mütze oder Schürze), sonst Herrenschuhe.
    w.kind = look.outfit === 'dress' ? 'heel' : look.hat === 'cap' || look.apron ? 'boot' : 'shoe';
    w.cane = !!look.cane;
    scene.add(fig);
    return w;
  });
  loc.walkers = walkers;
  // Vor dem Pferdebahnwagen (loc.tramBlockers, tramline.js) und vor Holmes bleibt man stehen;
  // dauert es, kehrt man um, sonst stünde man womöglich ewig im Gleis und die Bahn davor. Wer nur
  // neben einem steht, an dem geht man vorbei.
  const blockedAhead = (w, x, z, cam) => {
    const k = (0.6 * w.dir) / w.len;
    const nx = x + (w.to.x - w.from.x) * k;
    const nz = z + (w.to.y - w.from.y) * k;
    if ((nx - cam.x) ** 2 + (nz - cam.z) ** 2 < 0.85 * 0.85) return true;
    for (const b of loc.tramBlockers ?? []) if ((nx - b.x) ** 2 + (nz - b.z) ** 2 < b.r * b.r) return true;
    return false;
  };
  // Wer am Ende seines Wegs ankommt, biegt dort ab oder geht ins Haus, wenn man es nicht sieht:
  // Er verschwindet und kommt nach einer Weile an einem Ende wieder, das ebenfalls nicht im Blick
  // liegt. Sieht man das Ende, bleibt er stehen, sieht sich um und kehrt um. Unterwegs bleibt
  // ab und zu jemand kurz stehen.
  const frustum = new THREE.Frustum();
  const viewProj = new THREE.Matrix4();
  const probe = new THREE.Sphere(new THREE.Vector3(), 1.2);
  let cam = null;
  const seen = (x, z) => {
    const dx = x - cam.position.x;
    const dz = z - cam.position.z;
    if (dx * dx + dz * dz > 70 * 70) return false;
    probe.center.set(x, 1, z);
    return frustum.intersectsSphere(probe);
  };
  const at = (w, s) => [w.from.x + (w.to.x - w.from.x) * (s / w.len), w.from.y + (w.to.y - w.from.y) * (s / w.len)];
  const heading = (w) => Math.atan2((w.to.x - w.from.x) * w.dir, (w.to.y - w.from.y) * w.dir);
  for (const w of walkers) {
    w.state = 'walk';
    w.timer = 0;
    w.yaw = heading(w);
    w.untilStop = 30 + Math.random() * 80;
  }
  loc.onUpdate((dt, t, { camera }) => {
    cam = camera;
    viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(viewProj);
    for (const w of walkers) {
      if (held) continue;
      if (w.state === 'gone') {
        w.timer -= dt;
        if (w.timer > 0) continue;
        // Wiederkommen an einem Ende, das man gerade nicht sieht.
        const start = Math.random() < 0.5 ? 0 : w.len;
        const [sx, sz] = at(w, start);
        if (seen(sx, sz)) {
          w.timer = 1;
          continue;
        }
        w.s = start;
        w.dir = start === 0 ? 1 : -1;
        w.yaw = heading(w);
        w.state = 'walk';
        w.fig.visible = true;
      }
      let [x, z] = at(w, w.s);
      if (w.state === 'walk' && blockedAhead(w, x, z, camera.position)) {
        idleFigure(w.fig, t, camera.position);
        w.waited = (w.waited ?? 0) + dt;
        if (w.waited > 3) {
          w.waited = 0;
          w.state = 'turn';
          w.timer = 1.6 + Math.random() * 1.6;
          w.dir = -w.dir;
        }
      } else if (w.state === 'walk') {
        w.waited = 0;
        w.s += w.dir * w.speed * dt;
        const step = Math.floor(w.phase / Math.PI);
        w.phase += dt * w.speed * 5.2;
        w.untilStop -= w.speed * dt;
        walkFigure(w.fig, w.phase);
        if (Math.floor(w.phase / Math.PI) !== step) {
          const ear = hearing(camera, x, z, 25);
          if (ear.vol > 0.01) {
            // Der Stock setzt nur bei jedem zweiten Schritt auf.
            (loc.sounds ??= []).push({ type: 'footstep', vol: ear.vol * 0.9, pan: ear.pan, kind: w.kind, cane: w.cane && step % 2 === 0 });
          }
        }
        // Selten hustet jemand im Vorbeigehen.
        if (Math.random() < dt / 240) {
          (loc.sounds ??= []).push({ type: 'cough', ...hearing(camera, x, z, 30) });
        }
        if (w.s >= w.len || w.s <= 0) {
          w.s = THREE.MathUtils.clamp(w.s, 0, w.len);
          [x, z] = at(w, w.s);
          if (!seen(x, z)) {
            w.state = 'gone';
            w.fig.visible = false;
            w.timer = 3 + Math.random() * 12;
            continue;
          }
          w.state = 'turn';
          w.timer = 1.6 + Math.random() * 2.4;
          w.dir = -w.dir;
        } else if (w.untilStop < 0) {
          w.state = 'stop';
          w.timer = 1.5 + Math.random() * 3.5;
          w.untilStop = 30 + Math.random() * 80;
        }
      } else {
        // Stehen: Beine zurück in den Stand, umsehen; beim Umkehren in der zweiten Hälfte drehen.
        idleFigure(w.fig, t, camera.position);
        w.timer -= dt;
        if (w.state === 'turn' && w.timer < 1) {
          let d = heading(w) - w.yaw;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          w.yaw += d * Math.min(1, dt * 4);
        }
        if (w.timer < 0) {
          w.state = 'walk';
          w.yaw = heading(w);
        }
      }
      if (w.state === 'walk') w.yaw = heading(w);
      w.fig.position.set(x, loc.heightAt(x, z), z);
      w.fig.rotation.y = w.yaw;
    }
  });

  // Für Messungen (src/dev/measure.js), damit jede Messung dieselben Passanten und dieselbe
  // Droschke sieht: 'start' stellt alle dorthin, wo sie beim Laden standen, und hält sie dort;
  // 'free' lässt sie von da an weiterlaufen.
  const initial = walkers.map((w) => ({ s: w.s, phase: w.phase }));
  loc.trafficStage = (where) => {
    held = where !== 'free';
    if (!held) return;
    u = 0.1;
    phase = 0;
    trotHorse(cab.userData.horse, phase);
    walkers.forEach((w, i) => {
      Object.assign(w, initial[i], { dir: 1, state: 'walk', timer: 0, waited: 0 });
      w.yaw = heading(w);
      walkFigure(w.fig, w.phase);
      const [x, z] = at(w, w.s);
      w.fig.position.set(x, loc.heightAt(x, z), z);
      w.fig.rotation.y = w.yaw;
      w.fig.visible = true;
    });
  };
}
