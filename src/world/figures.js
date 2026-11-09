import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Bag, box, cyl, merge, tint } from './kit.js';

const SKIN = 0xc9a07f;
const shared = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 });
// Uhrkette, Zwicker, Horn und Schlüssel sollen im Laternenlicht aufblitzen.
const metal = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.75, roughness: 0.3 });
const GOLD = 0xd9b45a;
const BRASS = 0xb08a3e;
const IRON = 0x6a655c;
const LEATHER = 0x2a1d12;

// Der Kopf ist ein Ellipsoid um den Ursprung. Nach vorn zeigt +Z, zur linken Seite der Figur +X.
const HEAD = new THREE.Vector3(0.115 * 0.92, 0.115 * 1.1, 0.115 * 0.98);
const UP = new THREE.Vector3(0, 1, 0);
const FRONT = new THREE.Vector3(0, 0, 1);

function ball(r, x, y, z, sx = 1, sy = 1, sz = 1) {
  const g = new THREE.SphereGeometry(r, 12, 9);
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  return g;
}

// Stab von a nach b, Radius ra am Anfang und rb am Ende.
function rod(ra, a, b, rb = ra, seg = 6) {
  const from = new THREE.Vector3(...a);
  const dir = new THREE.Vector3(...b).sub(from);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(rb, ra, len, seg);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()));
  g.translate(from.x, from.y, from.z);
  return g;
}

function polyline(r, points) {
  return points.slice(1).map((p, i) => rod(r, points[i], p));
}

// Ring, dessen Öffnung in Richtung `normal` zeigt.
function ring(radius, tube, at, normal) {
  const g = new THREE.TorusGeometry(radius, tube, 5, 18);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(FRONT, new THREE.Vector3(...normal).normalize()));
  g.translate(...at);
  return g;
}

// Unterhalb der Nase tritt das Gesicht bis zum Kinn nach vorn. Ein reines Ellipsoid kippt dort so
// stark nach unten, dass die untere Gesichtshälfte im Licht von oben dunkel wird und wie ein Bart wirkt.
function jaw(y) {
  const t = THREE.MathUtils.clamp((-0.025 - y) / 0.085, 0, 1);
  return 0.03 * t * t * (3 - 2 * t);
}

// Wie weit vorn ein Punkt in Höhe y liegt: 1 auf der Mittellinie des Gesichts, 0 an der Seite.
function frontness(y, z) {
  return z / (HEAD.z * Math.sqrt(Math.max(1e-6, 1 - (y / HEAD.y) ** 2)));
}

// Punkt auf der Gesichtsoberfläche über (x, y), um `lift` nach vorn versetzt.
function onFace(x, y, lift = 0) {
  const z = HEAD.z * Math.sqrt(Math.max(0, 1 - (x / HEAD.x) ** 2 - (y / HEAD.y) ** 2));
  return [x, y, z + jaw(y) * frontness(y, z) ** 2 + lift];
}

function faceNormal([x, y, z]) {
  return [x / HEAD.x ** 2, y / HEAD.y ** 2, z / HEAD.z ** 2];
}

// Radius des Männerrumpfs in Höhe y: Brust und Hüfte.
const chest = (y) => 0.2 + ((1.5 - y) / 0.7) * 0.05;
const hips = (y) => 0.25 + ((0.89 - y) / 0.34) * 0.05;

function onBody(x, y, r, lift = 0) {
  return [x, y, Math.sqrt(Math.max(0, r * r - x * x)) + lift];
}

// Schädel mit Kinnpartie und eigenen Vertexfarben: Schatten unter dem Kinn leicht aufgehellt,
// auf Wunsch graue Stoppeln.
function skull(skin, stubble) {
  // Feineres Gitter als bei den übrigen Kugeln, damit die Stoppelkante nicht verschwimmt.
  let g = new THREE.SphereGeometry(0.115, 28, 20);
  g.scale(0.92, 1.1, 0.98);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (z > 0) pos.setZ(i, z + jaw(y) * frontness(y, z) ** 2);
  }
  g.computeVertexNormals();
  const nor = g.attributes.normal;
  const data = new Float32Array(pos.count * 3);
  const base = new THREE.Color(skin);
  // Entsättigt und mit klarer Kante: Im warmen Laternenlicht liest sich bloßes Abdunkeln als Schatten,
  // erst der Farbwechsel weg vom Hautton als Bartschatten.
  let dark = null;
  if (stubble !== null) {
    const h = new THREE.Color(stubble);
    const l = 0.3 * h.r + 0.59 * h.g + 0.11 * h.b;
    dark = new THREE.Color(l * 0.9, l * 0.95, l * 1.05);
  }
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const fill = THREE.MathUtils.clamp(-nor.getY(i), 0, 1) * THREE.MathUtils.clamp(nor.getZ(i) + 0.3, 0, 1);
    c.copy(base).multiplyScalar(1 + 0.6 * fill);
    if (dark) {
      const low = THREE.MathUtils.clamp((-0.016 - pos.getY(i)) / 0.016, 0, 1);
      const front = THREE.MathUtils.clamp((pos.getZ(i) + 0.05) / 0.07, 0, 1);
      c.lerp(dark, low * front * 0.8);
    }
    data.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(data, 3));
  return g;
}

// Weste unter dem offenen Rock, mit Knopfleiste.
function addVest(bag, color) {
  const v = new THREE.CylinderGeometry(chest(1.31) + 0.007, chest(1.03) + 0.007, 0.28, 14, 1, true, -0.62, 1.24);
  v.translate(0, 1.17, 0);
  bag.add(v, color);
  for (const y of [1.06, 1.11, 1.16, 1.21]) bag.add(ball(0.0075, ...onBody(0, y, chest(y) + 0.007, 0.002)), 0x121216);
}

// Die Kette läuft straff vom Westenknopf in die linke Tasche: Dort zieht eine Uhr nach unten.
function addWatchChain(bag, trim, fabric, lift) {
  const at = (x, y, out) => onBody(x, y, chest(y) + lift, out);
  const links = [0, 1, 2, 3, 4].map((i) => at(0.012 + (i / 4) * 0.11, 1.163 - (i / 4) * 0.07, 0.0045));
  for (const g of polyline(0.0068, links)) trim.add(g, GOLD);
  trim.add(rod(0.0034, at(-0.018, 1.168, 0.005), at(0.018, 1.162, 0.005)), GOLD);
  const slit = new THREE.Color(fabric).multiplyScalar(0.45);
  for (const g of polyline(0.0035, [at(0.098, 1.093, 0.001), at(0.128, 1.093, 0.001), at(0.158, 1.093, 0.001)])) bag.add(g, slit);
  // Die Uhr bleibt in der Tasche, nur ihr Umriss drückt sich durch den Stoff.
  const [x, y, z] = at(0.13, 1.052, -0.004);
  const watch = new THREE.SphereGeometry(0.031, 14, 10);
  watch.scale(1, 1.05, 0.34);
  watch.rotateY(Math.atan2(x, z));
  watch.translate(x, y, z);
  bag.add(watch, fabric);
}

// Koppel mit Horn und Schlüsselbund, wie ihn ein Nachtwächter trägt.
function addBelt(bag, trim, { horn, keys }) {
  const y = 0.865;
  bag.add(cyl(0.259, 0.259, 0.052, 0, y, 0, 18), LEATHER);
  trim.add(box(0.05, 0.042, 0.012, 0, y, 0.262), BRASS);
  if (horn) {
    // Rechts vorn: Mundstück oben am Koppel, der Trichter zeigt nach hinten.
    const path = [[-0.07, 0.84], [-0.14, 0.8], [-0.2, 0.755], [-0.245, 0.73]].map(([x, h], i) => onBody(x, h, hips(h), 0.025 + i * 0.005));
    const radii = [0.0065, 0.011, 0.017, 0.026];
    for (let i = 0; i < 3; i++) trim.add(rod(radii[i], path[i], path[i + 1], radii[i + 1], 10), BRASS);
    const mouth = new THREE.Vector3(...path[3]).sub(new THREE.Vector3(...path[2]));
    trim.add(ring(0.027, 0.0045, path[3], mouth.toArray()), BRASS);
    bag.add(rod(0.004, onBody(-0.11, y - 0.02, 0.259, 0.002), path[1]), LEATHER);
  }
  if (keys) {
    // Links vorn ein Schlüsselbund, groß wie ein Kohlkopf.
    const R = 0.042;
    const center = new THREE.Vector3(...onBody(0.15, 0.76, hips(0.76), 0.03));
    const out = new THREE.Vector3(center.x, 0, center.z).normalize();
    const side = new THREE.Vector3(out.z, 0, -out.x);
    trim.add(ring(R, 0.0055, center.toArray(), out.toArray()), IRON);
    bag.add(rod(0.004, onBody(0.14, y - 0.02, 0.259, 0.002), [center.x, center.y + R, center.z]), LEATHER);
    for (let i = 0; i < 8; i++) {
      const phi = Math.PI * (1.1 + i * 0.1);
      const radial = side.clone().multiplyScalar(Math.cos(phi)).addScaledVector(UP, Math.sin(phi));
      const from = center.clone().addScaledVector(radial, R);
      const dir = radial.clone().add(new THREE.Vector3(0, -0.9, 0)).addScaledVector(out, 0.25).normalize();
      const to = from.clone().addScaledVector(dir, 0.055 + (i % 3) * 0.014);
      const color = i % 3 === 1 ? BRASS : IRON;
      trim.add(rod(0.0042, from.toArray(), to.toArray()), color);
      trim.add(ball(0.0095, to.x, to.y, to.z, 1, 1.25, 0.5), color);
    }
  }
}

// Holzschnitt-Figuren in Zeitkostüm: Rumpf und Glieder, ohne Skelett.
// Was Holmes an einer Figur bemerkt, soll man an ihr auch sehen können.
// look: { coat, trousers, hat, skirt, hair, beard, moustache, skin, cane, apron, hatColor, height,
//         vest, watchChain, mourningBand, sleeves, pincenez, scar, cigar, tired, loupe, horn, keys, idle }
//   beard: true oder 'stubble' · moustache: true oder 'kaiser' · sleeves: 'rolled'
//   tired: Schatten unter den Augen · loupe: Abdruck der Uhrmacherlupe am rechten Auge
//   scar: Schmiss auf der linken Wange · cigar: kalter Stumpen im Mundwinkel
//   idle: 'shift' (Gewicht auf den Stock verlagern) oder 'tremble' (zittrige Hände)
export function makeFigure(look = {}) {
  const {
    coat = 0x24262b,
    trousers = 0x1a1a1e,
    skin = SKIN,
    hat = 'none',
    hatColor = 0x121214,
    hair = 0x2a1f18,
    skirt = false,
    beard = false,
    moustache = false,
    apron = null,
    cane = false,
    height = 1.76,
    vest = null,
    watchChain = false,
    mourningBand = false,
    sleeves = null,
    pincenez = false,
    scar = false,
    cigar = false,
    tired = false,
    loupe = false,
    horn = false,
    keys = false,
    idle = null,
  } = look;

  const root = new THREE.Group();
  const scale = height / 1.76;
  const body = new THREE.Group();
  body.scale.setScalar(scale);
  root.add(body);

  const torso = new Bag();
  const trim = new Bag();
  if (skirt) {
    torso.add(cyl(0.2, 0.42, 0.92, 0, 0.47, 0, 16), coat);
    torso.add(cyl(0.16, 0.21, 0.6, 0, 1.2, 0, 14), coat);
  } else {
    torso.add(cyl(0.2, 0.25, 0.7, 0, 1.15, 0, 14), coat);
    torso.add(cyl(0.25, 0.3, 0.34, 0, 0.72, 0, 14), coat);
  }
  torso.add(cyl(0.05, 0.06, 0.1, 0, 1.53, 0, 8), skin);
  torso.add(cyl(0.2, 0.17, 0.05, 0, 1.49, 0, 12), coat);
  if (apron && skirt) {
    // Die Schürze folgt dem Rock als offenes Kegelstück auf der Vorderseite.
    const front = new THREE.CylinderGeometry(0.21, 0.43, 0.92, 12, 1, true, -0.85, 1.7);
    front.translate(0, 0.47, 0);
    torso.add(front, apron);
  } else if (apron) {
    torso.add(box(0.36, 0.86, 0.04, 0, 0.82, 0.22), apron);
  }
  if (!skirt) {
    torso.add(box(0.11, 0.28, 0.02, 0, 1.34, 0.2), 0xd8d4c8);
    torso.add(box(0.03, 0.2, 0.025, 0, 1.33, 0.205), 0x18181c);
    if (vest) addVest(torso, vest);
    if (watchChain) addWatchChain(torso, trim, vest ?? coat, vest ? 0.007 : 0);
    if (horn || keys) addBelt(torso, trim, { horn, keys });
  }

  // Kopf mit Gesicht
  const headBag = new Bag();
  const headTrim = new Bag();
  headBag.parts.push(skull(skin, beard === 'stubble' ? hair : null));
  headBag.add(ball(0.02, 0, -0.01, 0.112, 0.8, 1.1, 1.1), skin);
  const brow = new THREE.Color(hair).multiplyScalar(0.8);
  for (const s of [-1, 1]) {
    headBag.add(ball(0.012, s * 0.04, 0.02, 0.098), 0x181010);
    headBag.add(ball(0.02, ...onFace(s * 0.041, 0.047, -0.003), 1.4, skirt ? 0.22 : 0.32, 0.5), brow);
    if (!skirt) headBag.add(ball(0.024, s * 0.104, -0.008, -0.004, 0.42, 1, 0.72), skin);
  }
  const mouthY = moustache ? -0.079 : -0.064;
  headBag.add(ball(0.019, ...onFace(0, mouthY, beard === true ? 0.004 : -0.004), skirt ? 1.15 : 1.35, 0.27, 0.5), skirt ? 0x8e4c44 : 0x6e3a32);
  headBag.add(ball(0.118, 0, 0.035, -0.02, 0.96, 0.98, 0.95), hair);
  if (skirt) headBag.add(ball(0.06, 0, 0.09, -0.1), hair);
  if (beard === true) headBag.add(ball(0.08, 0, -0.1, 0.065, 0.9, 1.05, 0.7), hair);
  if (moustache === 'kaiser') {
    // Wie beim Kaiser: dicht, die Spitzen steil nach oben gezwirbelt.
    for (const s of [-1, 1]) {
      headBag.add(ball(0.03, s * 0.034, -0.054, 0.1, 1.45, 0.5, 0.62), hair);
      headBag.add(rod(0.0075, [s * 0.066, -0.053, 0.084], [s * 0.09, -0.018, 0.066], 0.0025), hair);
    }
  } else if (moustache) {
    headBag.add(ball(0.03, -0.035, -0.055, 0.1, 1.5, 0.45, 0.6), hair);
    headBag.add(ball(0.03, 0.035, -0.055, 0.1, 1.5, 0.45, 0.6), hair);
  }
  if (tired) {
    const shadow = new THREE.Color(skin).multiply(new THREE.Color(0.74, 0.62, 0.66));
    for (const s of [-1, 1]) headBag.add(ball(0.017, ...onFace(s * 0.04, 0.001, -0.002), 1.3, 0.45, 0.45), shadow);
  }
  if (loupe) {
    const p = onFace(-0.04, 0.02, 0.002);
    headBag.add(ring(0.021, 0.0028, p, faceNormal(p)), 0xa45a4e);
  }
  if (scar) {
    const line = [onFace(0.054, -0.002, 0.0005), onFace(0.064, -0.02, 0.0005), onFace(0.074, -0.038, 0.0005)];
    for (const g of polyline(0.0032, line)) headBag.add(g, 0xb0524a);
  }
  if (cigar) {
    // Ein Stumpen, der längst aus ist: keine Glut, nur graue Asche an der Spitze.
    const from = new THREE.Vector3(...onFace(-0.018, mouthY, -0.006));
    const dir = new THREE.Vector3(-0.022, -0.014, 0.05);
    const tip = from.clone().add(dir);
    headBag.add(rod(0.0078, from.toArray(), tip.toArray(), 0.007, 8), 0x4a3020);
    headBag.add(rod(0.007, tip.toArray(), tip.clone().addScaledVector(dir.normalize(), 0.008).toArray(), 0.0068, 8), 0x77736c);
  }
  if (pincenez) {
    for (const s of [-1, 1]) headTrim.add(ring(0.0175, 0.0022, onFace(s * 0.04, 0.02, 0.008), [s * 0.22, 0.05, 1]), 0xcbb37a);
    headTrim.add(rod(0.0018, onFace(-0.022, 0.022, 0.012), onFace(0.022, 0.022, 0.012)), 0xcbb37a);
  }
  if (hat === 'top') {
    headBag.add(cyl(0.2, 0.2, 0.015, 0, 0.1, 0, 16), hatColor);
    headBag.add(cyl(0.12, 0.11, 0.2, 0, 0.2, 0, 16), hatColor);
  } else if (hat === 'bowler') {
    headBag.add(cyl(0.18, 0.18, 0.012, 0, 0.09, 0, 16), hatColor);
    headBag.add(ball(0.112, 0, 0.1, 0), hatColor);
  } else if (hat === 'cap') {
    headBag.add(cyl(0.13, 0.12, 0.06, 0, 0.1, 0, 14), hatColor);
    headBag.add(box(0.15, 0.015, 0.09, 0, 0.075, 0.13), 0x101012);
  } else if (hat === 'pickelhaube') {
    headBag.add(ball(0.125, 0, 0.055, 0, 1, 0.95, 1.05), 0x0d0d10);
    headBag.add(cyl(0.012, 0.03, 0.1, 0, 0.21, 0, 8), 0xb59a55);
    headBag.add(box(0.1, 0.09, 0.02, 0, 0.09, 0.122), 0xb59a55);
    headBag.add(box(0.16, 0.012, 0.09, 0, 0.018, 0.12), 0x0d0d10);
  } else if (hat === 'bonnet') {
    headBag.add(ball(0.13, 0, 0.05, -0.01, 1, 0.9, 1.05), hatColor);
    headBag.add(cyl(0.15, 0.17, 0.02, 0, 0.05, 0.03, 16), hatColor);
  } else if (hat === 'bandage') {
    headBag.add(cyl(0.122, 0.122, 0.05, 0, 0.05, 0, 16), hatColor);
  }
  const head = new THREE.Mesh(headBag.build(), shared);
  if (headTrim.parts.length) head.add(new THREE.Mesh(headTrim.build(), metal));
  head.position.y = 1.67;
  // Erst drehen, dann nicken: So hebt ein Kopf, der über die Schulter blickt, den Blick und kippt nicht zur Seite.
  head.rotation.order = 'YXZ';

  body.add(new THREE.Mesh(torso.build(), shared), head);
  if (trim.parts.length) body.add(new THREE.Mesh(trim.build(), metal));

  // Arme an den Schultern, side = +1 ist der linke Arm der Figur. Der Unterarm hängt an einem
  // Ellbogengelenk (userData.fore), damit Gesten nicht wie mit steifem Arm aussehen.
  const elbow = 0.28;
  const arm = (side) => {
    const r = 0.055;
    const upper = [];
    const lower = [];
    if (sleeves === 'rolled') {
      // Bis über den Ellbogen hochgekrempelt, die Unterarme kräftig wie bei einem Droschkenkutscher.
      // So hoch, dass man sie auch über einem Tresen noch sieht; der Umschlag zeigt die hellere Innenseite.
      upper.push(tint(cyl(r, r * 0.96, 0.2, 0, -0.1, 0, 8), coat));
      upper.push(tint(cyl(r * 1.2, r * 1.2, 0.055, 0, -0.2, 0, 10), new THREE.Color(coat).multiplyScalar(1.35)));
      upper.push(tint(cyl(r * 1.04, r, 0.08, 0, -0.24, 0, 8), skin));
      upper.push(tint(ball(r, 0, -elbow, 0), skin));
      lower.push(tint(cyl(r, r * 0.86, 0.28, 0, -0.14, 0, 8), skin));
    } else {
      upper.push(tint(cyl(r, r * 0.9, elbow, 0, -elbow / 2, 0, 8), coat));
      upper.push(tint(ball(r * 0.9, 0, -elbow, 0), coat));
      lower.push(tint(cyl(r * 0.9, r * 0.8, 0.28, 0, -0.14, 0, 8), coat));
    }
    lower.push(tint(ball(r * 0.95, 0, -0.3, 0), skin));
    if (mourningBand && side > 0) {
      // Trauerflor am linken Oberarm, hastig angeheftet und ein wenig schief.
      const band = cyl(r * 1.14, r * 1.12, 0.075, 0, 0, 0, 12);
      band.rotateZ(0.16);
      band.translate(0, -0.15, 0);
      upper.push(tint(band, 0x0a0a0c));
    }
    const g = new THREE.Group();
    g.add(new THREE.Mesh(merge(upper), shared));
    const fore = new THREE.Group();
    fore.position.y = -elbow;
    // Erst beugen (x), dann den gebeugten Unterarm vor den Körper schwenken (y).
    fore.rotation.order = 'YXZ';
    fore.add(new THREE.Mesh(merge(lower), shared));
    g.add(fore);
    g.position.set(side * 0.225, 1.44, 0);
    g.rotation.z = side * 0.08;
    g.userData.fore = fore;
    g.userData.restZ = g.rotation.z;
    return g;
  };
  const armL = arm(-1);
  const armR = arm(1);
  body.add(armL, armR);

  let legL = null;
  let legR = null;
  if (!skirt) {
    const leg = (side) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(tint(cyl(0.075, 0.06, 0.72, 0, -0.36, 0, 8), trousers), shared));
      g.add(new THREE.Mesh(tint(box(0.1, 0.06, 0.24, 0, -0.73, 0.05), 0x0c0c0c), shared));
      g.position.set(side * 0.11, 0.74, 0);
      return g;
    };
    legL = leg(-1);
    legR = leg(1);
    body.add(legL, legR);
  }

  if (cane) {
    const stick = new THREE.Mesh(
      merge([tint(cyl(0.012, 0.012, 0.9, 0.34, 0.46, 0.1, 6), 0x2a1a10), tint(ball(0.03, 0.34, 0.92, 0.1), 0xb59a55)]),
      shared,
    );
    body.add(stick);
  }

  root.userData.figure = {
    head,
    armL,
    armR,
    foreL: armL.userData.fore,
    foreR: armR.userData.fore,
    legL,
    legR,
    body,
    idle,
    look: 0,
    gesture: null,
  };
  return root;
}

// Gesten: kurze Abläufe aus Schlüsselposen, ausgelöst von einem Dialogknoten (`gesture`).
// Eine Pose nennt nur, was sich bewegt, als Abweichung von der Ruhehaltung; dazwischen wird weich
// übergeblendet. Die Seiten heißen, wie die Figur sie empfindet (rechts ist -X, im Code armL).
//   rArm, lArm:   [vor (-) / zurück, zur Körpermitte]
//   rFore, lFore: [Ellbogen beugen (-), Unterarm vor den Körper schwenken]
//   head:         [drehen (- = nach rechts), nicken (- = hoch)]
//   body:         [drehen (- = nach rechts), vorbeugen (+ = nach vorn)]
export const GESTURES = {
  // Gefragt nach der Uhrzeit: Die rechte Hand zuckt zur Westentasche, hält auf halbem Weg inne und
  // greift nach dem Federhalter. Dann der Blick über die Schulter hinauf zur Wanduhr.
  westentasche: [
    [0, {}],
    [0.3, { rArm: [-0.7, 0.2], rFore: [-0.8, 1.4] }],
    [0.9, { rArm: [-0.7, 0.2], rFore: [-0.8, 1.4] }],
    [1.6, { rArm: [-0.5, 0.15], rFore: [-0.2, 1.0], body: [0, 0.06] }],
    [2.3, { rArm: [-0.5, 0.15], rFore: [-0.2, 1.0], head: [-1.45, -0.4], body: [-0.12, 0.06] }],
    [3.7, { rArm: [-0.5, 0.15], rFore: [-0.2, 1.0], head: [-1.45, -0.4], body: [-0.12, 0.06] }],
    [4.4, { rArm: [-0.5, 0.15], rFore: [-0.2, 1.0], body: [0, 0.06] }],
    [5.3, {}],
  ],
};

const CHANNELS = ['rArm', 'rFore', 'lArm', 'lFore', 'head', 'body'];
const STILL = [0, 0];
const REST = Object.fromEntries(CHANNELS.map((c) => [c, STILL]));

function samplePose(keys, t) {
  let i = 0;
  while (i < keys.length - 2 && t >= keys[i + 1][0]) i++;
  const [ta, a] = keys[i];
  const [tb, b] = keys[i + 1];
  const u = THREE.MathUtils.smoothstep(t, ta, tb);
  const pose = {};
  for (const c of CHANNELS) {
    const p = a[c] || STILL;
    const q = b[c] || STILL;
    pose[c] = [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];
  }
  return pose;
}

function poseArm(arm, fore, side, [swing, inward], [bend, across]) {
  arm.rotation.x += swing;
  arm.rotation.z = arm.userData.restZ - side * inward;
  fore.rotation.x = bend;
  fore.rotation.y = -side * across;
}

// Spielt eine Geste aus GESTURES ab; eine laufende wird ersetzt.
export function startGesture(figure, name) {
  const keys = GESTURES[name];
  if (keys) figure.userData.figure.gesture = { keys, start: null };
}

// Atmen und zum Spieler hinsehen. Die Kopfdrehung bleibt unter 60 Grad, sonst wirkt sie unheimlich.
// Eine laufende Geste legt sich darüber.
export function idleFigure(figure, time, lookAt) {
  const f = figure.userData.figure;
  const phase = figure.id * 0.73;
  f.body.position.y = Math.sin(time * 1.4 + phase) * 0.004;
  f.armL.rotation.x = Math.sin(time * 0.9 + phase) * 0.03;
  f.armR.rotation.x = Math.sin(time * 1.1 + phase) * 0.03;
  if (f.idle === 'shift') {
    // Das kranke Knie: Das Gewicht wandert immer wieder hinüber auf den Stock.
    const lean = 0.5 + 0.5 * Math.sin(time * 0.55 + phase);
    f.body.rotation.z = -0.05 * lean * lean;
  } else if (f.idle === 'tremble') {
    // Zittrige Hände, mal mehr, mal weniger.
    const shake = Math.sin(time * 38 + phase) * (0.012 + 0.01 * Math.sin(time * 0.7 + phase));
    f.armL.rotation.x += shake;
    f.armR.rotation.x -= shake * 0.8;
  }
  let target = 0;
  if (lookAt) {
    const dx = lookAt.x - figure.position.x;
    const dz = lookAt.z - figure.position.z;
    if (dx * dx + dz * dz < 30) {
      target = Math.atan2(dx, dz) - figure.rotation.y;
      while (target > Math.PI) target -= Math.PI * 2;
      while (target < -Math.PI) target += Math.PI * 2;
      target = THREE.MathUtils.clamp(target, -1, 1);
    }
  }
  f.look += (target - f.look) * 0.06;

  let pose = REST;
  if (f.gesture) {
    if (f.gesture.start === null) f.gesture.start = time;
    const t = time - f.gesture.start;
    const keys = f.gesture.keys;
    if (t >= keys[keys.length - 1][0]) f.gesture = null;
    else pose = samplePose(keys, t);
  }
  poseArm(f.armL, f.foreL, -1, pose.rArm, pose.rFore);
  poseArm(f.armR, f.foreR, 1, pose.lArm, pose.lFore);
  f.head.rotation.y = f.look + pose.head[0];
  f.head.rotation.x = pose.head[1];
  f.body.rotation.y = pose.body[0];
  f.body.rotation.x = pose.body[1];
}

export function walkFigure(figure, phase) {
  const f = figure.userData.figure;
  const swing = Math.sin(phase) * 0.5;
  if (f.legL) {
    f.legL.rotation.x = swing;
    f.legR.rotation.x = -swing;
  }
  f.armL.rotation.x = -swing * 0.7;
  f.armR.rotation.x = swing * 0.7;
  f.body.position.y = Math.abs(Math.cos(phase)) * 0.025;
}

// Pferd aus wenigen Formen. Es läuft in +Z.
export function makeHorse(color = 0x2e2018) {
  const root = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.72 });
  const bodyGeo = new THREE.CapsuleGeometry(0.34, 1.05, 6, 12);
  bodyGeo.rotateX(Math.PI / 2);
  bodyGeo.translate(0, 1.18, 0);
  const neck = cyl(0.13, 0.22, 0.8, 0, 1.58, 0.72, 10);
  neck.rotateX(0.55);
  neck.translate(0, 0.63, 0.56);
  const headGeo = box(0.17, 0.2, 0.5, 0, 1.94, 1.14);
  const ear1 = box(0.04, 0.12, 0.04, -0.06, 2.1, 0.96);
  const ear2 = box(0.04, 0.12, 0.04, 0.06, 2.1, 0.96);
  const mane = box(0.04, 0.5, 0.55, 0, 1.76, 0.75);
  const tail = cyl(0.03, 0.09, 0.8, 0, 0.98, -0.92, 8);
  root.add(new THREE.Mesh(merge([bodyGeo, neck, headGeo, ear1, ear2, mane, tail]), mat));
  const legs = [];
  for (const [x, z] of [[-0.2, 0.62], [0.2, 0.62], [-0.2, -0.62], [0.2, -0.62]]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.0, z);
    pivot.add(new THREE.Mesh(cyl(0.065, 0.045, 1.0, 0, -0.5, 0, 8), mat));
    root.add(pivot);
    legs.push(pivot);
  }
  root.userData.legs = legs;
  return root;
}

export function trotHorse(horse, phase) {
  horse.userData.legs.forEach((leg, i) => {
    leg.rotation.x = Math.sin(phase + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.45;
  });
}
