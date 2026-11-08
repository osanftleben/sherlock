import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { box, cyl, merge, tint } from './kit.js';

// Figuren in Zeitkostüm, ohne Skelett: Gruppen für Kopf, Oberarm, Unterarm, Oberschenkel
// und Unterschenkel, jeweils ein Mesh mit Vertexfarben. Nach vorn zeigt +Z, die Grundgröße
// ist 1,76 m; kleinere und größere Figuren werden gleichmäßig skaliert.

const SKIN = 0xc9a07f;
const GOLD = 0xb8963f;
const STEEL = 0x9a9ca2;
const LINEN = 0xe6e0d2;
const SHOE = 0x0d0c0b;
const TAU = Math.PI * 2;

// Beidseitig, weil Rockschöße und Mäntel vorn offen sind und man hineinsieht.
const cloth = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide });
// Neigung des Schirmstocks nach hinten, zum Kopf hin.
const UMBRELLA_TILT = -0.15;
// Seitliche Neigung der Oberarme in Ruhe: die Hände hängen am Rocksaum, nicht davor.
const ARM_Z = 0.06;
const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.9, 0.8) });

const color = (c) => (c instanceof THREE.Color ? c.clone() : new THREE.Color(c));
const shade = (c, k) => color(c).multiplyScalar(k);

class Parts {
  constructor() {
    this.list = [];
  }

  add(geo, c) {
    tint(geo, color(c));
    // Faltentäler (drape) sind dunkler: Ihre Stärke steht je Vertex in ao.
    const ao = geo.attributes.ao;
    if (ao) {
      const col = geo.attributes.color;
      for (let i = 0; i < ao.count; i++) col.setXYZ(i, col.getX(i) * ao.getX(i), col.getY(i) * ao.getX(i), col.getZ(i) * ao.getX(i));
      geo.deleteAttribute('ao');
    }
    this.list.push(geo);
    return this;
  }

  mesh(material = cloth) {
    return this.list.length ? new THREE.Mesh(merge(this.list), material) : null;
  }
}

function ball(r, x, y, z, sx = 1, sy = 1, sz = 1, ws = 12, hs = 9) {
  const g = new THREE.SphereGeometry(r, ws, hs);
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  return g;
}

// Drehkörper aus einem Profil [[radius, y], ...] mit aufsteigendem y.
// phiStart 0 zeigt nach vorn (+Z); ein Spalt vorn ergibt offene Mäntel.
function lathe(points, { seg = 18, sx = 1, sz = 1, phiStart = 0, phiLength = TAU } = {}) {
  const g = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg, phiStart, phiLength);
  g.scale(sx, 1, sz);
  return g;
}

const scaleProfile = (points, k) => points.map(([r, y]) => [r * k, y]);

function radiusAt(points, y) {
  for (let i = 1; i < points.length; i++) {
    const [r0, y0] = points[i - 1];
    const [r1, y1] = points[i];
    if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / Math.max(1e-6, y1 - y0);
  }
  return points[points.length - 1][0];
}

function tube(points, r) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 10, r, 5, false);
}

function halfDisc(r, back = false) {
  return new THREE.CylinderGeometry(r, r, 0.008, 14, 1, false, back ? Math.PI / 2 : -Math.PI / 2, Math.PI);
}

// Rumpfprofile (Radius, Höhe). Querschnitt wird in der Tiefe gestaucht.
const TORSO_M = [[0, 0.95], [0.158, 0.96], [0.152, 1.04], [0.16, 1.12], [0.172, 1.22], [0.178, 1.32], [0.176, 1.4], [0.15, 1.46], [0.09, 1.5], [0.05, 1.52], [0, 1.525]];
// Mieder mit schmaler Taille; der Rock liegt an der Hüfte glatt an und weitet sich glockig zum Saum.
const TORSO_F = [[0, 0.98], [0.14, 0.99], [0.116, 1.06], [0.148, 1.17], [0.17, 1.27], [0.165, 1.37], [0.146, 1.45], [0.085, 1.5], [0, 1.51]];
const SKIRT = [[0, 0.012], [0.37, 0.015], [0.362, 0.07], [0.33, 0.24], [0.285, 0.42], [0.24, 0.6], [0.19, 0.82], [0.152, 0.98], [0.122, 1.07]];
const SKIRT_SZ = 0.86;
const SKIRT_SEG = 96;
const DEPTH = 0.66;
const DEPTH_F = 0.7;

// Schnitte der Männerröcke: Profil des Schoßes und Breite des Spalts vorn.
const COATS = {
  frock: { pts: [[0.215, 0.5], [0.2, 0.7], [0.178, 0.9], [0.165, 1.04]], gap: 0.42, sz: 0.74, drop: 0.07 },
  overcoat: { pts: [[0.26, 0.3], [0.23, 0.6], [0.19, 0.9], [0.168, 1.04]], gap: 0.12, sz: 0.8, drop: 0.04 },
  labcoat: { pts: [[0.215, 0.52], [0.195, 0.78], [0.17, 1.04]], gap: 0.1, sz: 0.76, drop: 0.04 },
  jacket: { pts: [[0.182, 0.8], [0.176, 0.9], [0.164, 1.04]], gap: 0, sz: 0.72, drop: 0.025 },
  tunic: { pts: [[0.178, 0.8], [0.172, 0.88], [0.164, 1.04]], gap: 0, sz: 0.7, drop: 0.02 },
};

// Alte und neue Schreibweise der Looks auf einen vollständigen Satz bringen.
function normalize(look) {
  const female = look.outfit === 'dress' || look.skirt === true;
  const coat = look.coat ?? 0x24262b;
  const outfit = female ? 'dress' : look.outfit || 'jacket';
  return {
    female,
    outfit,
    coat,
    trousers: look.trousers ?? 0x1a1a1e,
    vest: look.vest ?? shade(coat, 0.75),
    shirt: look.shirt ?? LINEN,
    neck: look.neck ?? (female ? 'collar' : outfit === 'tunic' ? 'none' : 'tie'),
    tie: look.tie ?? 0x141416,
    collar: look.collar ?? (female ? 0xe0dacb : LINEN),
    cuffs: look.cuffs ?? null,
    skin: look.skin ?? SKIN,
    hair: look.hair ?? 0x2a1f18,
    hairStyle: look.hairStyle ?? (female ? 'bun' : 'short'),
    beard: look.beard === true ? 'full' : look.beard || null,
    moustache: look.moustache === true ? 'brush' : look.moustache || null,
    eyewear: look.eyewear || null,
    hat: look.hat ?? 'none',
    hatColor: look.hatColor ?? 0x121214,
    apron: look.apron ?? null,
    shawl: look.shawl ?? null,
    cape: look.cape ?? false,
    cane: look.cane ?? false,
    lantern: look.lantern ?? false,
    umbrella: look.umbrella ?? null,
    glass: look.glass ?? false,
    punch: look.punch ?? false,
    habit: look.habit ?? null,
    sabre: look.sabre ?? false,
    chain: look.chain ?? false,
    piping: look.piping ?? null,
    buttons: look.buttons ?? null,
    build: look.build ?? 'normal',
    height: look.height ?? (female ? 1.64 : 1.76),
    pose: look.pose ?? 'stand',
  };
}

// --- Kopf ----------------------------------------------------------------------
// Alle Maße relativ zur Schädelmitte; das fertige Mesh sitzt 0.105 über dem Hals.
const SKULL_Y = 0.105;

function hairCap(tilt, thetaLength = 0.56 * Math.PI, thetaStart = 0) {
  const g = new THREE.SphereGeometry(0.106, 16, 8, 0, TAU, thetaStart, thetaLength);
  g.scale(0.84, 1.08, 1.0);
  g.rotateX(tilt);
  g.translate(0, 0.01, -0.006);
  return g;
}

// Glockenkurve um (cx, cy) in Einheitskoordinaten der Kopfkugel.
const bump = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2) - ((y - cy) / sy) ** 2);
const pair = (x, y, cx, cy, sx, sy) => bump(Math.abs(x), y, cx, cy, sx, sy);

// Schädel und Kiefer aus einer einzigen verformten Kugel: Zwei sich durchdringende
// Kugeln hinterlassen quer über den Wangen eine harte Schnittkante, die wie eine Narbe
// aussieht. Nach unten wird die Kugel schmaler, länger und am Kinn etwas vorgezogen.
// Darauf modelliert: Augenhöhlen, Brauenbogen, Nasenwurzel, Wangenknochen, Mundpartie und
// Kinn, bei Frauen weicher. Die Haut ist pro Vertex gefärbt: Augenhöhlen etwas dunkler, Wangen
// wärmer, Bartstoppeln gehen weich in die Hautfarbe über, statt als zweite Schale aufzuliegen
// (die schneidet sonst wieder Kanten ins Gesicht).
function headShape(female, skin, stubble = null) {
  let g = new THREE.SphereGeometry(0.1, 32, 24);
  const pos = g.attributes.position;
  const unit = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  const taper = female ? 0.26 : 0.18;
  const k = female ? 0.65 : 1;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).divideScalar(0.1);
    v.toArray(unit, i * 3);
    const t = Math.max(0, -v.y);
    let x = v.x * 0.082 * (1 - taper * t ** 1.5);
    const y = v.y * 0.11 * (1 + 0.08 * t);
    let z = v.z * 0.097 + 0.01 * t * Math.max(0, v.z);
    const front = THREE.MathUtils.smoothstep(v.z, 0.15, 0.7);
    const side = THREE.MathUtils.smoothstep(Math.abs(v.x), 0.45, 0.85) * THREE.MathUtils.smoothstep(v.z, -0.5, 0.1);
    z += front * (
      -0.0075 * pair(v.x, v.y, 0.4, 0.15, 0.19, 0.13)
      + 0.0042 * k * pair(v.x, v.y, 0.38, 0.39, 0.3, 0.08)
      + 0.003 * bump(v.x, v.y, 0, 0.17, 0.11, 0.16)
      + 0.0035 * k * pair(v.x, v.y, 0.56, -0.12, 0.17, 0.13)
      - 0.0025 * k * pair(v.x, v.y, 0.52, -0.42, 0.17, 0.14)
      + 0.0045 * bump(v.x, v.y, 0, -0.45, 0.3, 0.2)
      - 0.0022 * bump(v.x, v.y, 0, -0.66, 0.2, 0.05)
      + 0.0045 * k * bump(v.x, v.y, 0, -0.86, 0.22, 0.11)
    );
    // Schläfen etwas eingezogen, Kieferwinkel und Jochbögen zur Seite.
    const sx = Math.sign(v.x) * side * (
      -0.0035 * bump(0, v.y, 0, 0.32, 1, 0.16)
      + 0.0025 * k * bump(0, v.y, 0, -0.12, 1, 0.12)
      + 0.003 * k * bump(0, v.y, 0, -0.62, 1, 0.14)
    );
    x += sx;
    pos.setXYZ(i, x, y, z);
  }
  g.setAttribute('unit', new THREE.BufferAttribute(unit, 3));
  // Nahtstelle der Kugel verschmelzen, sonst zeigen die neu berechneten Normalen eine Kante.
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  g.computeVertexNormals();

  const u = g.attributes.unit;
  const base = color(skin);
  const warm = color(skin).lerp(color(0xc0503c), 0.35);
  const beard = stubble ? color(stubble) : null;
  const out = new Float32Array(u.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < u.count; i++) {
    const ux = u.getX(i);
    const uy = u.getY(i);
    const uz = u.getZ(i);
    const front = THREE.MathUtils.smoothstep(uz, 0.15, 0.7);
    c.copy(base).lerp(warm, front * 0.5 * pair(ux, uy, 0.5, -0.25, 0.2, 0.18));
    c.multiplyScalar(1 - front * 0.2 * pair(ux, uy, 0.4, 0.15, 0.17, 0.12));
    if (beard) {
      // Bartlinie: vorn knapp unter der Nase, zu den Ohren hin ansteigend, hinten keine.
      const line = -0.3 + 0.38 * (1 - Math.max(0, uz));
      const m = (1 - THREE.MathUtils.smoothstep(uy, line - 0.06, line + 0.1)) * THREE.MathUtils.smoothstep(uz, -0.35, 0.05);
      c.lerp(beard, m);
    }
    c.toArray(out, i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(out, 3));
  g.deleteAttribute('unit');
  return g;
}

function buildHead(L) {
  const H = new Parts();
  const skin = L.skin;
  const lip = color(skin).lerp(color(L.female ? 0x9a3a36 : 0x7a3a30), L.female ? 0.55 : 0.45);
  const hair = L.hair;

  const stubble = L.beard === 'stubble' ? color(skin).lerp(color(hair), 0.42) : null;
  H.list.push(headShape(L.female, skin, stubble));
  // Nase aus Rücken und Spitze; ein Kegel wirkt im Streiflicht wie eine Möhre.
  const nk = L.female ? 0.85 : 1;
  H.add(ball(0.012 * nk, 0, 0.006, 0.093, 0.8, 1.9, 0.9, 8, 6), skin);
  H.add(ball(0.016 * nk, 0, -0.014, 0.097, 0.9, 0.95, 1, 8, 6), skin);
  for (const s of [-1, 1]) {
    for (const [g, c] of ear(s, L.female ? 0.88 : 1)) H.add(g, c === 'dark' ? shade(skin, 0.78) : skin);
    // Brauen liegen auf dem Brauenbogen und fallen nach außen leicht ab.
    const brow = ball(0.019, 0, 0, 0, 1, L.female ? 0.17 : 0.3, 0.38, 10, 6).rotateZ(-s * 0.09);
    H.add(brow.translate(s * 0.035, 0.046, 0.0815), shade(hair, L.female ? 0.95 : 0.8));
  }
  // Lippen als zwei flache Wülste; ein dünner dunkler Strich liest sich als Narbe.
  const lk = L.female ? 0.9 : 1;
  H.add(ball(0.0135 * lk, 0, -0.0505, 0.089, 1.2, 0.36, 0.5, 10, 6), lip);
  H.add(ball(0.0125 * lk, 0, -0.057, 0.088, 1.1, 0.42, 0.55, 10, 6), color(lip).lerp(color(skin), 0.25));

  // Haar
  if (L.hairStyle === 'receding') H.add(hairCap(-0.85), hair);
  else if (L.hairStyle === 'bald') H.add(hairCap(-0.3, 0.2 * Math.PI, 0.38 * Math.PI), hair);
  else if (L.hairStyle === 'bun') H.add(hairCap(-0.62), hair);
  else if (L.hairStyle !== 'none') H.add(hairCap(-0.42), hair);
  if (L.hairStyle === 'bun') {
    // Hochgestecktes Haar um 1890: Volumen über Stirn und Schläfen, Knoten am Hinterkopf.
    H.add(ball(0.058, 0, 0.09, 0.018, 1.2, 0.45, 1.1), hair);
    for (const s of [-1, 1]) H.add(ball(0.04, s * 0.06, 0.06, 0.025, 0.8, 1, 1.25, 8, 6), hair);
    H.add(ball(0.04, 0, 0.085, -0.075, 1.1, 0.9, 0.9), hair);
  }
  if (L.hairStyle === 'parted') {
    for (const s of [-1, 1]) H.add(box(0.012, 0.05, 0.03, s * 0.079, -0.01, 0.012), hair);
  }

  // Bart
  if (L.beard === 'full') {
    H.add(ball(0.074, 0, -0.07, 0.03, 1, 1.05, 0.85), hair);
    for (const s of [-1, 1]) H.add(ball(0.03, s * 0.068, -0.02, 0.01, 0.6, 1.6, 1), hair);
  } else if (L.beard === 'mutton') {
    for (const s of [-1, 1]) H.add(ball(0.032, s * 0.068, -0.035, 0.03, 0.55, 1.5, 1), hair);
  } else if (L.beard === 'goatee') {
    H.add(ball(0.025, 0, -0.105, 0.07, 1, 1.4, 0.8), hair);
  }
  if (L.moustache === 'kaiser') {
    for (const s of [-1, 1]) {
      H.add(tube([[s * 0.004, -0.03, 0.1], [s * 0.03, -0.035, 0.098], [s * 0.05, -0.028, 0.088], [s * 0.06, -0.01, 0.076]], 0.0075), hair);
    }
  } else if (L.moustache === 'walrus') {
    H.add(ball(0.03, 0, -0.035, 0.094, 1.75, 0.6, 0.6), hair);
  } else if (L.moustache === 'brush') {
    H.add(ball(0.022, 0, -0.033, 0.097, 1.6, 0.5, 0.55), hair);
  }

  // Augengläser
  const rim = (x, c) => {
    const t = new THREE.TorusGeometry(0.015, 0.0018, 4, 14);
    t.translate(x, 0.018, 0.097);
    H.add(t, c);
  };
  if (L.eyewear === 'monocle') {
    rim(-0.032, GOLD);
  } else if (L.eyewear === 'pincenez' || L.eyewear === 'spectacles') {
    rim(-0.032, STEEL);
    rim(0.032, STEEL);
    H.add(box(0.034, 0.003, 0.003, 0, 0.022, 0.099), STEEL);
    if (L.eyewear === 'spectacles') for (const s of [-1, 1]) H.add(box(0.003, 0.003, 0.09, s * 0.075, 0.02, 0.05), STEEL);
  }

  addHat(H, L);

  const geo = merge(H.list);
  geo.translate(0, SKULL_Y, 0);
  const head = new THREE.Group();
  head.add(new THREE.Mesh(geo, cloth));

  // Augen als eigenes Mesh in den Augenhöhlen: Lidschlag durch Stauchen in der Höhe. Die
  // Pupillen hängen daran und wandern dem Kopf beim Hinsehen voraus (idleFigure).
  const E = new Parts();
  const P = new Parts();
  for (const s of [-1, 1]) {
    E.add(ball(0.0118, s * 0.032, 0, 0.0795, 1.1, 1, 0.62, 10, 8), 0xe2ddd2);
    P.add(ball(0.0062, s * 0.032, -0.0005, 0.0857, 1, 1, 0.5, 8, 6), 0x1a1410);
    // Oberlid: nimmt den starren Blick.
    E.add(ball(0.013, s * 0.032, 0.0098, 0.0805, 1.1, 0.6, 0.65, 10, 6), shade(skin, 0.86));
  }
  const eyes = E.mesh();
  eyes.position.y = SKULL_Y + 0.018;
  const pupils = P.mesh();
  eyes.add(pupils);
  head.add(eyes);
  return { head, eyes, pupils };
}

// Ohr auf Seite s, zwischen Brauen- und Nasenhöhe hinter dem Kieferwinkel: flache Muschel, darin
// eine dunklere Mulde, am Rand die eingerollte Krempe, unten das Läppchen. Etwas nach hinten
// geneigt, die Hinterkante steht vom Kopf ab. Gebaut für jede Seite einzeln statt gespiegelt,
// damit die Flächen richtig herum liegen.
function ear(s, k = 1) {
  const parts = [
    [ball(0.03, 0, 0, 0, 0.3, 1, 0.6, 10, 8), 'skin'],
    [ball(0.014, s * 0.0062, -0.002, 0.002, 0.3, 1.1, 0.8, 8, 6), 'dark'],
    [tube([[s * 0.004, -0.02, -0.013], [s * 0.0055, 0.0, -0.0195], [s * 0.0055, 0.021, -0.0145], [s * 0.0045, 0.0285, 0.0], [s * 0.003, 0.021, 0.0125]], 0.0045), 'skin'],
    [ball(0.009, s * 0.001, -0.026, -0.002, 0.7, 1, 1, 8, 6), 'skin'],
  ];
  for (const [g] of parts) {
    g.scale(k, k, k);
    g.rotateX(-0.22);
    g.rotateY(-s * 0.38);
    g.translate(s * 0.083 * (k === 1 ? 1 : 0.97), 0.004, -0.016);
  }
  return parts;
}

function addHat(H, L) {
  const c = L.hatColor;
  const band = shade(c, 0.55);
  if (L.hat === 'top') {
    H.add(cyl(0.155, 0.155, 0.012, 0, 0.06, 0, 20).scale(0.95, 1, 1.08), c);
    H.add(cyl(0.098, 0.092, 0.17, 0, 0.15, 0, 18), c);
    H.add(cyl(0.095, 0.094, 0.026, 0, 0.08, 0, 18), band);
  } else if (L.hat === 'bowler') {
    H.add(cyl(0.14, 0.14, 0.01, 0, 0.058, 0, 20), c);
    const curl = new THREE.TorusGeometry(0.14, 0.008, 5, 24);
    curl.rotateX(Math.PI / 2);
    curl.translate(0, 0.062, 0);
    H.add(curl, c);
    const crown = new THREE.SphereGeometry(0.1, 16, 8, 0, TAU, 0, Math.PI / 2);
    crown.scale(1, 1.05, 1.1);
    crown.translate(0, 0.058, 0);
    H.add(crown, c);
    H.add(cyl(0.101, 0.101, 0.02, 0, 0.068, 0, 18).scale(1, 1, 1.1), band);
  } else if (L.hat === 'cap') {
    H.add(ball(0.112, 0, 0.085, 0.012, 1.02, 0.36, 1.12, 14, 8), c);
    H.add(halfDisc(0.075).scale(1.25, 1, 1).translate(0, 0.065, 0.085), shade(c, 0.8));
  } else if (L.hat === 'peaked') {
    H.add(cyl(0.093, 0.093, 0.05, 0, 0.075, 0, 16), c);
    H.add(cyl(0.106, 0.098, 0.036, 0, 0.115, 0, 16), c);
    H.add(cyl(0.094, 0.094, 0.016, 0, 0.058, 0, 16), band);
    H.add(halfDisc(0.075).scale(1.25, 1, 1).translate(0, 0.055, 0.06), 0x0b0b0c);
    H.add(ball(0.012, 0, 0.08, 0.093, 1, 1, 0.4, 6, 4), GOLD);
  } else if (L.hat === 'pickelhaube') {
    const leather = 0x0d0d10;
    const dome = new THREE.SphereGeometry(0.112, 16, 8, 0, TAU, 0, Math.PI / 2);
    dome.scale(0.9, 1.15, 1.05);
    dome.translate(0, 0.045, 0);
    H.add(dome, leather);
    H.add(halfDisc(0.15).scale(0.72, 1, 1).translate(0, 0.047, 0), leather);
    H.add(halfDisc(0.15, true).scale(0.72, 1, 1).translate(0, 0.04, 0), leather);
    H.add(cyl(0.032, 0.038, 0.02, 0, 0.174, 0, 10), GOLD);
    const spike = new THREE.ConeGeometry(0.013, 0.08, 8);
    spike.translate(0, 0.224, 0);
    H.add(spike, GOLD);
    H.add(ball(0.042, 0, 0.1, 0.1, 1, 1.15, 0.25, 10, 8), GOLD);
  } else if (L.hat === 'bonnet') {
    H.add(ball(0.118, 0, 0.03, -0.03, 0.95, 1, 1.05, 14, 10), c);
    const rimGeo = new THREE.TorusGeometry(0.098, 0.02, 6, 16, Math.PI);
    rimGeo.scale(1, 1.15, 1);
    rimGeo.translate(0, 0, 0.05);
    H.add(rimGeo, c);
    H.add(ball(0.02, -0.07, -0.06, 0.04, 1, 1.4, 1, 6, 5), band);
  } else if (L.hat === 'bandage') {
    H.add(cyl(0.122, 0.122, 0.05, 0, 0.05, 0, 16).scale(0.86, 1, 1.0), c);
  }
}

// --- Rumpf -----------------------------------------------------------------------
function frontZ(profile, y, w, depth) {
  return radiusAt(profile, y) * w * depth;
}

// Legt eine flach gebaute Form (z um 0) auf die Brust: Jeder Punkt rückt auf die Oberfläche
// des Rumpfprofils an seiner Stelle, plus off. So liegen Weste, Hemd und Revers an, statt
// in der Brust zu verschwinden oder vor ihr zu schweben.
function conform(g, w, off, profile = TORSO_M, depth = DEPTH) {
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const r = Math.max(0.02, radiusAt(profile, y) * w);
    const front = r * depth * Math.sqrt(Math.max(0, 1 - (x / r) ** 2));
    pos.setZ(i, front + off + pos.getZ(i));
  }
  g.computeVertexNormals();
  return g;
}

// Mieder der Frauen: wie conform, nur auf dem Frauenprofil.
const conformF = (g, w, off) => conform(g, w, off, TORSO_F, DEPTH_F);

function flat(points) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.ShapeGeometry(shape);
}

// Trapez aus vielen kleinen Flächen (unten halbe Breite b0, oben b1), damit es sich beim
// Anlegen an den Rumpf rundet, statt als Brett vor der Brust zu stehen.
function panel(b0, b1, y0, y1, nx = 8, ny = 8) {
  const g = new THREE.PlaneGeometry(1, 1, nx, ny);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const v = pos.getY(i) + 0.5;
    pos.setXYZ(i, pos.getX(i) * 2 * (b0 + (b1 - b0) * v), y0 + (y1 - y0) * v, 0);
  }
  return g;
}

// Faltenwurf eines Drehkörpers: Der Radius schwingt um die Achse (n Falten, unregelmäßig
// verteilt) mit der Stärke weight(y); hinten fällt der Stoff um back weiter. Faltentäler
// werden dunkler (ao, siehe Parts.add). Die Naht der Drehung wird verschmolzen, sonst zeigen
// die neuen Normalen eine Kante.
function drape(g, { n, amp, weight, back = 0, hump = null, ao = 0.22 }) {
  const pos = g.attributes.position;
  const shadeAo = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const t = weight(pos.getY(i));
    const phi = Math.atan2(x, z);
    const wave = Math.sin(n * phi + 0.8 * Math.sin(2 * phi + 1) + 0.4 * Math.sin(5 * phi));
    const b = (1 - Math.cos(phi)) / 2;
    const f = 1 + amp * t * wave + back * t * b + (hump ? hump(pos.getY(i)) * b * b : 0);
    pos.setX(i, x * f);
    pos.setZ(i, z * f);
    shadeAo[i] = 1 - ao * t * (0.5 - 0.5 * wave);
  }
  g.setAttribute('ao', new THREE.BufferAttribute(shadeAo, 1));
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  const merged = mergeVertices(g, 1e-5);
  merged.computeVertexNormals();
  return merged;
}

// Gewicht der Rockfalten: an der Hüfte glatt, zum Saum hin voll.
const skirtFall = (y) => Math.min(1, Math.max(0, (1.0 - y) / 0.95)) ** 1.3;
// Hinten unter der Taille etwas Fülle (Tournürenrest), weich in den Rock geformt.
const SKIRT_DRAPE = { n: 13, amp: 0.055, weight: skirtFall, back: 0.07, hump: (y) => 0.24 * Math.exp(-(((y - 0.9) / 0.13) ** 2)) };

// Hemd, Weste und Krawatte als V im Ausschnitt des Rocks; darüber die Revers mit Kerbe und
// der Kragen des Rocks im Nacken.
function addVee(T, L, w) {
  const top = 1.47;
  const bottom = 1.2;
  T.add(conform(flat([[-0.078, top], [0.078, top], [0, bottom]]), w, 0.002), L.vest);
  T.add(conform(flat([[-0.045, top + 0.01], [0.045, top + 0.01], [0, 1.33]]), w, 0.0035), L.shirt);
  if (L.neck === 'tie') {
    T.add(conform(flat([[-0.01, 1.455], [0.01, 1.455], [0.013, 1.37], [0, 1.345], [-0.013, 1.37]]), w, 0.005), L.tie);
    T.add(conform(box(0.026, 0.02, 0.008, 0, 1.463, 0), w, 0.006), L.tie);
  } else if (L.neck === 'cravat') {
    // Plastron: Knoten unter dem Kragen, darunter fällt der Stoff gebauscht in die Weste.
    T.add(conform(ball(0.011, 0, 1.462, 0, 1.2, 0.9, 0.6, 8, 6), w, 0.006), L.tie);
    T.add(conform(flat([[-0.008, 1.45], [0.008, 1.45], [0.016, 1.395], [0.007, 1.35], [-0.007, 1.35], [-0.016, 1.395]]), w, 0.005), L.tie);
    T.add(ball(0.004, 0, 1.4, 0, 1, 1, 1, 6, 4).translate(0, 0, frontZ(TORSO_M, 1.4, w, DEPTH) + 0.008), GOLD);
  }
  // Stehkragen des Hemds mit umgelegten Ecken.
  if (L.neck !== 'scarf' && L.neck !== 'none') {
    for (const s of [-1, 1]) T.add(ball(0.016, s * 0.016, 1.497, 0.05, 1, 0.55, 0.35, 6, 5).rotateZ(s * 0.5), L.collar);
  }
  const lapelColor = shade(L.coat, 0.88);
  for (const s of [-1, 1]) {
    const pts = [[0.004, bottom], [0.058, 1.405], [0.073, 1.396], [0.1, 1.418], [0.096, 1.36], [0.034, bottom]];
    const lapel = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(s * x, y))), { depth: 0.005, bevelEnabled: false });
    T.add(conform(lapel, w, 0.004), lapelColor);
  }
  // Rockkragen im Nacken, vorn offen.
  T.add(lathe([[0.082 * w, 1.45], [0.074 * w, 1.5], [0.062 * w, 1.535]], { sz: 0.82, phiStart: 0.75, phiLength: TAU - 1.5 }), lapelColor);
}

function buttonsDown(T, x, ys, profile, w, depth, c, r = 0.009) {
  for (const y of ys) T.add(ball(r, x, y, frontZ(profile, y, w, depth) + 0.003, 1, 1, 0.5, 6, 5), c);
}

function buildTorso(L, w) {
  const T = new Parts();
  if (L.female) {
    const torso = scaleProfile(TORSO_F, w);
    T.add(lathe(torso, { sz: DEPTH_F, seg: 24 }), L.coat);
    // Rock mit Falten, die an der Hüfte glatt beginnen und zum Saum hin tiefer fallen; darauf
    // eine dunklere Saumborte, die denselben Faltenwurf mitmacht.
    T.add(drape(lathe(scaleProfile(SKIRT, w), { sz: SKIRT_SZ, seg: SKIRT_SEG }), SKIRT_DRAPE), L.coat);
    T.add(drape(lathe([[0.373 * w, 0.016], [0.366 * w, 0.075]], { sz: SKIRT_SZ, seg: SKIRT_SEG }), SKIRT_DRAPE), shade(L.coat, 0.7));
    for (const s of [-1, 1]) T.add(ball(0.06, s * 0.156 * w, 1.43, 0, 1, 0.85, 0.85), L.coat);
    // Mieder: Knopfleiste, zwei Abnäher von der Brust zur Taille, Gürtel mit Schließe.
    const seam = shade(L.coat, 0.82);
    T.add(conformF(panel(0.013, 0.013, 1.07, 1.49, 1, 12), w, 0.0015), seam);
    for (const s of [-1, 1]) T.add(conformF(panel(0.003, 0.002, 1.07, 1.24, 1, 6).translate(s * 0.058, 0, 0), w, 0.0012), shade(L.coat, 0.7));
    if (!L.apron) {
      T.add(lathe([[0.128 * w, 1.055], [0.127 * w, 1.077], [0.13 * w, 1.1]], { sz: SKIRT_SZ, seg: 28 }), shade(L.coat, 0.6));
      T.add(box(0.03, 0.03, 0.008, 0, 1.077, 0.128 * w * SKIRT_SZ + 0.004), shade(GOLD, 0.7));
    }
    if (L.apron) {
      // Schürze: Rockteil liegt auf den Falten des Rocks, Latz und Träger auf dem Mieder,
      // das Band läuft um die Taille und ist hinten zur Schleife gebunden.
      const apron = SKIRT.filter(([, y]) => y > 0.2 && y < 1.06).map(([r, y]) => [r * w + 0.008, y]);
      apron.unshift([radiusAt(SKIRT, 0.17) * w + 0.008, 0.17]);
      apron.push([radiusAt(SKIRT, 1.06) * w + 0.008, 1.06]);
      // Auf dem Raster des Rocks, damit die Falten Kante auf Kante liegen.
      const step = TAU / SKIRT_SEG;
      T.add(drape(lathe(apron, { sz: SKIRT_SZ, phiStart: -13 * step, phiLength: 26 * step, seg: 26 }), SKIRT_DRAPE), L.apron);
      T.add(conformF(panel(0.07, 0.078, 1.06, 1.35, 8, 8), w, 0.003), L.apron);
      for (const s of [-1, 1]) {
        const strap = panel(0.011, 0.011, 1.33, 1.47, 1, 6);
        const p = strap.attributes.position;
        for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + s * (0.066 + (p.getY(i) - 1.33) * 0.32));
        T.add(conformF(strap, w, 0.0035), L.apron);
      }
      const band = shade(L.apron, 0.92);
      T.add(lathe([[0.131 * w, 1.05], [0.133 * w, 1.09]], { sz: SKIRT_SZ, seg: 28 }), band);
      const bz = -(0.132 * w * SKIRT_SZ) - 0.008;
      for (const s of [-1, 1]) T.add(ball(0.028, s * 0.026, 1.072, bz, 1, 0.55, 0.35, 8, 6).rotateZ(s * 0.25), band);
      T.add(ball(0.011, 0, 1.07, bz - 0.004, 1, 1, 0.6, 6, 5), band);
    }
    if (L.shawl) {
      // Umschlagtuch über den Schultern, vorn offen; die Spitze hängt hinten über den Rücken.
      T.add(drape(lathe(scaleProfile([[0.21, 1.17], [0.198, 1.28], [0.175, 1.39], [0.14, 1.46], [0.075, 1.515]], w), { sz: 0.76, phiStart: 0.36, phiLength: TAU - 0.72, seg: 40 }), { n: 9, amp: 0.035, weight: (y) => Math.min(1, Math.max(0, (1.4 - y) / 0.23)), ao: 0.15 }), L.shawl);
      T.add(flat([[-0.16 * w, 1.19], [0.16 * w, 1.19], [0, 1.07]]).translate(0, 0, -0.209 * w * 0.76 - 0.004), L.shawl);
    }
    T.add(cyl(0.048, 0.05, 0.07, 0, 1.53, 0, 12), L.collar);
    T.add(ball(0.012, 0, 1.505, 0.05, 1, 1.2, 0.5, 8, 6), GOLD);
    // Unter dem Schürzenlatz bleiben die Knöpfe verborgen.
    buttonsDown(T, 0, L.apron ? [1.44] : [1.12, 1.2, 1.28, 1.36, 1.44], TORSO_F, w, DEPTH_F, shade(L.coat, 0.5), 0.0065);
    if (L.chain) T.add(new THREE.TorusGeometry(0.04, 0.003, 4, 12, Math.PI).rotateZ(Math.PI).translate(0.04, 1.12, frontZ(TORSO_F, 1.12, w, DEPTH_F) + 0.004), GOLD);
    T.add(cyl(0.041, 0.045, 0.11, 0, 1.555, 0, 10), L.skin);
    return T.mesh();
  }

  const torso = scaleProfile(TORSO_M, w);
  T.add(lathe(scaleProfile([[0, 0.84], [0.15, 0.86], [0.165, 0.92], [0.16, 1.0]], w), { sz: 0.72 }), L.trousers);
  T.add(lathe(torso, { sz: DEPTH }), L.coat);
  const coat = COATS[L.outfit] || COATS.jacket;
  T.add(hemDrop(lathe(scaleProfile(coat.pts, w), { sz: coat.sz, phiStart: coat.gap, phiLength: TAU - coat.gap * 2, seg: 24 }), coat.drop), L.coat);
  for (const s of [-1, 1]) T.add(ball(0.064, s * 0.158 * w, 1.425, 0, 1, 0.72, 0.8), L.coat);

  if (L.outfit === 'tunic') {
    // Waffenrock: Knopfleiste, Koppel, Stehkragen mit Vorstoß
    buttonsDown(T, 0, [0.92, 1.0, 1.14, 1.22, 1.3, 1.38, 1.45], TORSO_M, w, DEPTH, L.buttons ?? GOLD);
    T.add(lathe([[0.168 * w, 1.03], [0.17 * w, 1.08]], { sz: 0.7 }), 0x0b0b0c);
    T.add(box(0.05, 0.045, 0.012, 0, 1.055, frontZ(TORSO_M, 1.055, w, 0.7) + 0.006), GOLD);
    T.add(cyl(0.056, 0.058, 0.06, 0, 1.53, 0, 12), L.coat);
    if (L.piping) T.add(cyl(0.058, 0.058, 0.01, 0, 1.56, 0, 12), L.piping);
    for (const s of [-1, 1]) T.add(box(0.05, 0.012, 0.11, s * 0.13 * w, 1.47, 0), L.piping ?? shade(L.coat, 0.7));
  } else {
    addVee(T, L, w);
    if (L.neck !== 'none' && L.neck !== 'scarf') T.add(cyl(0.049, 0.052, 0.036, 0, 1.522, 0, 12), L.collar);
    if (L.neck === 'scarf') {
      T.add(cyl(0.055, 0.06, 0.04, 0, 1.515, 0, 12), L.tie);
      T.add(ball(0.02, 0.012, 1.48, frontZ(TORSO_M, 1.48, w, DEPTH) + 0.008, 1.4, 0.9, 0.5, 8, 6), L.tie);
    }
    const btn = L.buttons ?? shade(L.coat, 0.55);
    if (L.outfit === 'overcoat') {
      for (const s of [-1, 1]) buttonsDown(T, s * 0.045, [1.0, 1.1, 1.2], TORSO_M, w, DEPTH, btn, 0.01);
    } else if (L.outfit === 'labcoat') {
      buttonsDown(T, 0, [0.8, 0.95, 1.1, 1.18], TORSO_M, w, DEPTH, btn, 0.008);
    } else {
      buttonsDown(T, 0, [1.08, 1.16], TORSO_M, w, DEPTH, btn);
    }
  }
  if (L.apron) T.add(box(0.32, 0.62, 0.012, 0, 0.75, 0.2 * w), L.apron);
  if (L.cape) {
    T.add(lathe(scaleProfile([[0.235, 1.2], [0.225, 1.3], [0.195, 1.42], [0.12, 1.49], [0.06, 1.525]], w), { sz: 0.8 }), L.coat);
  }
  if (L.chain) {
    const y = 1.14;
    T.add(new THREE.TorusGeometry(0.045, 0.0035, 4, 14, Math.PI).rotateZ(Math.PI).translate(0.03, y, frontZ(TORSO_M, y, w, DEPTH) + 0.012), GOLD);
  }
  if (L.sabre) {
    const scabbard = cyl(0.017, 0.012, 0.8, 0, 0, 0, 8);
    scabbard.rotateX(0.35);
    scabbard.translate(-0.205 * w, 0.6, -0.04);
    T.add(scabbard, 0x16181a);
    T.add(ball(0.022, -0.205 * w, 0.98, 0.1, 1, 1.4, 1, 8, 6), GOLD);
    T.add(box(0.012, 0.012, 0.09, -0.205 * w, 0.95, 0.09), GOLD);
  }
  T.add(cyl(0.043, 0.047, 0.11, 0, 1.555, 0, 10), L.skin);
  const mesh = T.mesh();
  if (L.build === 'stout') paunch(mesh.geometry);
  return mesh;
}

// Der Schoß fällt hinten tiefer als vorn: Die Saumkante sinkt zum Rücken hin um drop und
// zieht den unteren Teil des Stoffs mit.
function hemDrop(g, drop) {
  const pos = g.attributes.position;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    y0 = Math.min(y0, pos.getY(i));
    y1 = Math.max(y1, pos.getY(i));
  }
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const back = (1 - z / Math.max(1e-6, Math.hypot(x, z))) / 2;
    const low = 1 - (pos.getY(i) - y0) / (y1 - y0);
    pos.setY(i, pos.getY(i) - drop * back * back * low);
  }
  g.computeVertexNormals();
  return g;
}

// Bauch der Kräftigen: vorn in den fertigen Rumpf geformt, samt Knöpfen und Uhrkette.
function paunch(g) {
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const f = Math.exp(-(((y - 1.1) / 0.14) ** 2)) * THREE.MathUtils.smoothstep(z, -0.04, 0.09);
    pos.setXYZ(i, pos.getX(i) * (1 + 0.05 * f), y, z + 0.035 * f);
  }
}

// --- Glieder ---------------------------------------------------------------------
function buildArm(L, w, s) {
  const upperGroup = new THREE.Group();
  upperGroup.position.set(s * (L.female ? 0.155 * w + 0.012 : 0.17 * w + 0.014), 1.43, 0);
  upperGroup.rotation.z = s * ARM_Z;
  const sleeve = L.coat;
  const U = new Parts();
  // Oberarm mit gerundeter Schulterkappe, oben kräftiger, zum Ellbogen schmaler.
  const k = L.female ? 0.9 : 1;
  if (L.female) {
    // Keulenärmel: an der Schulter gebauscht und in Falten gezogen, zum Ellbogen eng.
    const puff = [[0.044, -0.3], [0.046, -0.24], [0.052, -0.17], [0.064, -0.1], [0.071, -0.04], [0.068, 0.0], [0.056, 0.03], [0.034, 0.047], [0, 0.052]];
    const gather = (y) => THREE.MathUtils.smoothstep(y, -0.2, -0.08) * (1 - THREE.MathUtils.smoothstep(y, 0.02, 0.05));
    U.add(drape(lathe(puff.map(([r, y]) => [r * k, y]), { seg: 32, sz: 0.92 }), { n: 8, amp: 0.07, weight: gather, ao: 0.18 }), sleeve);
  } else {
    const upper = [[0.045, -0.3], [0.047, -0.22], [0.051, -0.11], [0.054, -0.035], [0.05, 0.005], [0.036, 0.026], [0, 0.034]];
    U.add(lathe(upper, { seg: 12, sz: 0.92 }), sleeve);
  }
  U.add(ball(0.046 * k, 0, -0.3, 0, 1, 1, 1, 8, 6), sleeve);
  upperGroup.add(U.mesh());

  const fore = new THREE.Group();
  fore.position.y = -0.3;
  const F = new Parts();
  // Ärmel: am Ellbogen etwas Stoff, zur Manschette hin leicht schmaler.
  F.add(lathe([[0.04, -0.26], [0.041, -0.2], [0.045, -0.09], [0.047, -0.02], [0.044, 0.01]], { seg: 10, sz: 0.95 }), sleeve);
  const cuff = L.cuffs ?? (L.outfit === 'tunic' ? L.piping ?? sleeve : L.female ? L.collar : L.shirt);
  F.add(cyl(0.037, 0.037, 0.024, 0, -0.256, 0, 10), cuff);
  const grip = s > 0 ? Boolean(L.cane || L.glass || L.punch || L.umbrella) : L.lantern;
  for (const g of hand(s, grip, L.female ? 0.88 : 1)) F.add(g, L.skin);

  let rest = -0.15;
  let gesture = true;
  if (s > 0 && L.cane) {
    // Etwas länger als bis zum Boden: Neigt sich der Arm beim Aufstützen, hebt die Spitze nicht ab.
    F.add(cyl(0.011, 0.011, 0.92, 0, -0.74, 0.05, 6), 0x2a1a10);
    F.add(ball(0.022, 0, -0.27, 0.05, 1, 1, 1, 8, 6), L.cane === 'silver' ? STEEL : GOLD);
    gesture = false;
  }
  if (s > 0 && L.glass) {
    rest = -1.15;
    const glassGeo = cyl(0.032, 0.028, 0.13, 0, 0, 0, 10);
    const foam = cyl(0.033, 0.033, 0.02, 0, 0.07, 0, 10);
    for (const g of [glassGeo, foam]) {
      g.rotateX(-rest);
      g.translate(0, -0.31, 0.045);
    }
    F.add(glassGeo, 0x9a6a20);
    F.add(foam, 0xe8e2cc);
    gesture = false;
  }
  if (s > 0 && L.punch && !L.cane && !L.glass) {
    // Knipszange des Schaffners: zwei Griffe in der Faust, darüber das Maul mit dem Lochstempel,
    // aufrecht gehalten wie das Glas.
    rest = -1.0;
    const parts = [];
    for (const k of [-1, 1]) parts.push(box(0.009, 0.12, 0.007, k * 0.008, -0.02, 0).rotateZ(k * 0.1));
    parts.push(box(0.026, 0.03, 0.022, 0, 0.055, 0.004));
    parts.push(box(0.012, 0.014, 0.034, 0, 0.074, 0.02));
    for (const g of parts) {
      g.rotateX(-rest);
      g.translate(0, -0.31, 0.03);
      F.add(g, STEEL);
    }
    gesture = false;
  }
  fore.add(F.mesh());
  if (s > 0 && L.umbrella && !L.cane) {
    // Aufgespannter Schirm in der rechten Hand, vor der Brust gehalten. Das Gelenk hold hält den
    // Stock, wie der Arm auch steht, leicht nach hinten geneigt, damit das Dach über dem Kopf
    // sitzt (walkFigure, idleFigure).
    rest = -1.25;
    const U = new Parts();
    U.add(cyl(0.008, 0.008, 1.05, 0, 0.52, 0, 6), 0x1a1410);
    U.add(cyl(0.013, 0.011, 0.12, 0, 0.0, 0, 6), 0x2a1a10);
    U.add(new THREE.ConeGeometry(0.55, 0.24, 8, 1, true).translate(0, 1.05 - 0.12 + 0.02, 0), L.umbrella);
    U.add(cyl(0.006, 0.003, 0.08, 0, 1.11, 0, 5), 0x1a1410);
    const hold = new THREE.Group();
    hold.position.set(0, -0.3, 0.02);
    hold.add(U.mesh());
    fore.add(hold);
    fore.userData.hold = hold;
    gesture = false;
  }
  if (s < 0 && L.lantern) {
    rest = -0.35;
    // Die Laterne hängt am Henkel in der Hand; das Gelenk gleicht die Armbeugung aus,
    // damit sie lotrecht hängt.
    const iron = 0x111211;
    const lamp = new Parts();
    lamp.add(new THREE.TorusGeometry(0.025, 0.004, 4, 10).translate(0, -0.01, 0), iron);
    lamp.add(box(0.1, 0.022, 0.1, 0, -0.05, 0), iron);
    lamp.add(box(0.1, 0.022, 0.1, 0, -0.21, 0), iron);
    for (const [x, z] of [[-0.045, -0.045], [0.045, -0.045], [-0.045, 0.045], [0.045, 0.045]]) lamp.add(box(0.008, 0.16, 0.008, x, -0.13, z), iron);
    const hang = new THREE.Group();
    hang.position.set(0, -0.32, 0.01);
    hang.rotation.x = -rest;
    hang.add(lamp.mesh(), new THREE.Mesh(box(0.08, 0.13, 0.08, 0, -0.13, 0), glow));
    fore.add(hang);
    fore.userData.hang = hang;
    gesture = false;
  }
  fore.rotation.x = rest;
  upperGroup.add(fore);
  return { group: upperGroup, fore, rest, gesture };
}

// Hand am Ende des Unterarms, die Innenfläche zum Körper (-s). Locker hängend mit leicht
// gekrümmten Fingern und abgespreiztem Daumen; wer etwas trägt, schließt die Faust darum.
function hand(s, grip, k) {
  const parts = [ball(0.04, 0, -0.298, 0.004, 0.45, 1.05, 0.95, 10, 8)];
  const thumb = grip
    ? [V3(-s * 0.012, -0.288, 0.03), V3(-s * 0.02, -0.312, 0.038), V3(-s * 0.017, -0.33, 0.04)]
    : [V3(-s * 0.012, -0.285, 0.03), V3(-s * 0.02, -0.315, 0.042), V3(-s * 0.022, -0.338, 0.044)];
  const joint = (pts, r0, r1, r2) => {
    parts.push(strut(pts[0], pts[1], r0, r1, 6), ball(r1, pts[1].x, pts[1].y, pts[1].z, 1, 1, 1, 6, 5));
    parts.push(strut(pts[1], pts[2], r1, r2, 6), ball(r2, pts[2].x, pts[2].y, pts[2].z, 1, 1, 1, 6, 5));
  };
  joint(thumb, 0.0095, 0.0088, 0.008);
  if (grip) {
    // Eingerollte Finger als Walze quer zur Hand, darauf die Knöchel.
    parts.push(new THREE.CylinderGeometry(0.019, 0.019, 0.068, 10).rotateX(Math.PI / 2).translate(-s * 0.006, -0.336, 0.002));
    for (let i = 0; i < 4; i++) parts.push(ball(0.0095, s * 0.006, -0.326, 0.025 - i * 0.016, 1, 1, 1, 6, 5));
  } else {
    const len = [0.95, 1, 0.97, 0.82];
    for (let i = 0; i < 4; i++) {
      const z = 0.024 - i * 0.016;
      const l = len[i];
      const r = 0.0085 - i * 0.0004;
      const mid = V3(-s * 0.006, -0.335 - 0.042 * l, z + 0.002);
      joint([V3(0, -0.33, z), mid, V3(-s * 0.017, mid.y - 0.028 * l, z + 0.002)], r, r * 0.92, r * 0.8);
    }
  }
  if (k !== 1) for (const g of parts) g.translate(0, 0.3, 0).scale(k, k, k).translate(0, -0.3, 0);
  return parts;
}

function buildLeg(L, w, s) {
  const thigh = new THREE.Group();
  thigh.position.set(s * 0.092 * w, 0.9, 0);
  const T = new Parts();
  T.add(ball(0.07, 0, 0, 0, 1, 1, 1, 8, 6), L.trousers);
  T.add(cyl(0.07, 0.056, 0.44, 0, -0.22, 0, 10), L.trousers);
  T.add(ball(0.055, 0, -0.44, 0, 1, 1, 1, 8, 6), L.trousers);
  thigh.add(T.mesh());
  const shin = new THREE.Group();
  shin.position.y = -0.44;
  const S = new Parts();
  S.add(cyl(0.054, 0.044, 0.4, 0, -0.2, 0, 10), L.trousers);
  S.add(ball(0.048, 0, -0.425, 0.045, 0.95, 0.6, 2.3, 10, 6), SHOE);
  S.add(box(0.07, 0.03, 0.07, 0, -0.44, -0.035), SHOE);
  shin.add(S.mesh());
  thigh.add(shin);
  return { thigh, shin };
}

// Gebogene Tabakspfeife im rechten Mundwinkel, der Kopf hängt vorn unter dem Kinn. Die Glut ist
// ein eigenes Material je Pfeife, damit sie beim Ziehen aufleuchten kann (smoke.js); bowl ist
// die Öffnung des Kopfes in Kopfkoordinaten, dort steigt der Rauch auf.
let pipeMat = null;
function buildPipe() {
  pipeMat ??= new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.45 });
  const group = new THREE.Group();
  const stem = strut(V3(0.014, 0.058, 0.082), V3(0.026, 0.024, 0.16), 0.0045, 0.004, 6);
  const elbow = strut(V3(0.026, 0.024, 0.16), V3(0.028, 0.012, 0.172), 0.005, 0.006, 6);
  const head = new THREE.CylinderGeometry(0.014, 0.011, 0.042, 10).translate(0.03, 0.031, 0.182);
  group.add(new THREE.Mesh(merge([stem, elbow, head]), pipeMat));
  const ember = new THREE.Mesh(
    // Flache Kuppel, die knapp über den Rand ragt: so sieht man die Glut auch von der Seite.
    new THREE.SphereGeometry(0.0115, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1).translate(0.03, 0.05, 0.182),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 0.3, 0.06) }),
  );
  group.add(ember);
  return { group, ember, bowl: V3(0.03, 0.055, 0.182) };
}

// --- Figur -----------------------------------------------------------------------
// look: outfit (frock, overcoat, labcoat, jacket, tunic, dress), coat, trousers, vest, shirt,
// neck (tie, cravat, scarf, none), tie, collar, skin, hair, hairStyle (short, parted,
// receding, bald, bun), beard (full, mutton, goatee, stubble), moustache (kaiser, walrus,
// brush), eyewear (monocle, pincenez, spectacles), hat (top, bowler, cap, peaked,
// pickelhaube, bonnet, bandage), hatColor, apron, shawl, cape, cane, lantern, umbrella (Farbe), pipe, glass, punch, sabre,
// chain, piping, buttons, build (slim, normal, stout), height, pose (stand, sit),
// habit (tidy, lean, punch: kleine Eigenheit im Stand, siehe idleFigure).
// Ältere Angaben wie skirt: true oder beard: true werden weiter verstanden.
export function makeFigure(look = {}) {
  const L = normalize(look);
  const w = L.build === 'stout' ? 1.16 : L.build === 'slim' ? 0.93 : 1;

  const root = new THREE.Group();
  const body = new THREE.Group();
  body.scale.setScalar(L.height / 1.76);
  root.add(body);

  const torso = buildTorso(L, w);
  body.add(torso);

  const { head, eyes, pupils } = buildHead(L);
  head.position.y = 1.555;
  body.add(head);
  const pipe = look.pipe ? buildPipe() : null;
  if (pipe) head.add(pipe.group);

  const armL = buildArm(L, w, -1);
  const armR = buildArm(L, w, 1);
  body.add(armL.group, armR.group);

  let legL = null;
  let legR = null;
  if (!L.female) {
    legL = buildLeg(L, w, -1);
    legR = buildLeg(L, w, 1);
    body.add(legL.thigh, legR.thigh);
    if (L.pose === 'sit') {
      for (const leg of [legL, legR]) {
        leg.thigh.rotation.x = -1.45;
        leg.shin.rotation.x = 1.45;
      }
    }
  }

  const gestureArm = armR.gesture ? armR : armL.gesture ? armL : null;
  root.userData.figure = {
    body,
    torso,
    head,
    eyes,
    pupils,
    armL: armL.group,
    armR: armR.group,
    foreL: armL.fore,
    foreR: armR.fore,
    umbrella: armR.fore.userData.hold ?? null,
    pipe: pipe && { ember: pipe.ember, bowl: pipe.bowl },
    restL: armL.rest,
    restR: armR.rest,
    gesture: gestureArm === armR ? 'R' : gestureArm === armL ? 'L' : null,
    legL: legL?.thigh ?? null,
    legR: legR?.thigh ?? null,
    shinL: legL?.shin ?? null,
    shinR: legR?.shin ?? null,
    female: L.female,
    sitting: L.pose === 'sit',
    habit: L.habit,
    talkUntil: 0,
    attending: false,
  };
  return root;
}

// Während eines Gesprächs nickt die Figur und unterstreicht mit einer Hand.
export function talkFigure(figure, until) {
  figure.userData.figure.talkUntil = until;
}

const approach = (obj, key, target, k) => {
  obj[key] += (target - obj[key]) * k;
};

// Pseudozufall je Zeitfenster: wann jemand das Standbein wechselt, wegsieht oder etwas tut.
const hash = (n) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const ease = (x) => THREE.MathUtils.smoothstep(x, 0, 1);
// 0 → 1 → 0 über ein Fenster der Länge len mit weichen Rampen.
const pulse = (t, len, ramp) => Math.max(0, Math.min(ease(t / ramp), ease((len - t) / ramp)));
const wrap = (a) => a - Math.round(a / (Math.PI * 2)) * Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;

// Atmen, Gewicht verlagern, blinzeln und zum Spieler hinsehen.
// Wer Holmes vor sich bemerkt, dreht erst den Kopf und dann den Oberkörper mit; im Gespräch
// bleibt der Blick bei ihm, sonst sieht man zwischendurch auch einmal weg. Der Kopf allein
// dreht nie mehr als gut 50 Grad, das wirkt sonst unheimlich.
export function idleFigure(figure, time, lookAt) {
  const f = figure.userData.figure;
  const phase = figure.id * 0.73;
  const seed = figure.id * 17.3;
  const talking = f.talkUntil > time;

  // Einatmen etwas schneller als Ausatmen; Brust weitet sich, die Schultern heben sich.
  const bx = time * 1.35 + phase;
  const breath = Math.sin(bx + 0.35 * Math.sin(bx));
  f.torso.scale.set(1 + breath * 0.012, 1 + breath * 0.004, 1 + breath * 0.022);
  f.armL.position.y = f.armR.position.y = 1.43 + breath * 0.004;
  f.head.position.y = 1.555 + breath * 0.0025;

  // Standbein: Alle paar Sekunden wandert die Hüfte über das andere Bein, das freie Knie
  // gibt nach. Wer sich auf einen Stock stützt, bleibt auf der Stockseite.
  let side = 0;
  if (!f.sitting) {
    const span = 7 + hash(seed) * 6;
    const k = Math.floor((time + phase * 4) / span);
    const local = (time + phase * 4) / span - k;
    const pick = (n) => (f.habit === 'lean' ? 0.75 + hash(seed + n) * 0.25 : hash(seed + n) < 0.5 ? -1 : 1);
    side = lerp(pick(k - 1), pick(k), ease((local * span) / 1.6));
  }
  approach(f.body.rotation, 'z', -side * 0.022, 0.1);
  const free = (s) => Math.max(0, -s * side);
  const legs = [[f.legL, f.shinL, -1], [f.legR, f.shinR, 1]];
  for (const [thigh, shin, s] of legs) {
    if (!thigh || f.sitting) continue;
    approach(thigh.rotation, 'x', -0.07 * free(s), 0.12);
    approach(shin.rotation, 'x', 0.16 * free(s), 0.12);
  }

  const cycle = (time + phase * 3.1) % 3.7;
  f.eyes.scale.y = cycle < 0.12 ? 0.12 : 1;

  // Blick: ohne Anlass wandert er langsam, sonst geht er zum Ziel.
  let turn = Math.sin(time * 0.23 + phase) * 0.25;
  let pitch = Math.sin(time * 0.5 + phase) * 0.02;
  if (lookAt) {
    const e = f.head.matrixWorld.elements;
    const dx = lookAt.x - e[12];
    const dz = lookAt.z - e[14];
    const dist2 = dx * dx + dz * dz;
    const rel = wrap(Math.atan2(dx, dz) - figure.rotation.y);
    // Bemerkt wird nur, wer im Blickfeld auftaucht; wen man schon im Auge hat, verfolgt man weiter.
    const near = dist2 < (f.attending ? 42 : 20);
    const seen = Math.abs(rel) < (f.attending ? 2.4 : 1.7);
    f.attending = talking || (near && seen);
    if (f.attending) {
      turn = clamp(rel, -2.1, 2.1);
      const eyeY = lookAt.y < 0.8 ? lookAt.y + 1.5 : lookAt.y;
      pitch = clamp(-Math.atan2(eyeY - e[13], Math.sqrt(dist2)), -0.35, 0.3);
      // Wer nicht spricht, sieht ab und zu kurz zur Seite.
      const k = Math.floor((time + phase * 5) / 8);
      const away = talking ? 0 : hash(seed + k * 3.1) < 0.4 ? pulse(((time + phase * 5) / 8 - k) * 8, 1.8, 0.4) : 0;
      turn = lerp(turn, turn + (hash(seed + k) < 0.5 ? -0.7 : 0.7), away);
      pitch = lerp(pitch, 0.12, away);
    }
  } else {
    f.attending = false;
  }

  // Eigenheit, solange niemand mit der Figur spricht.
  const habit = f.habit;
  let busy = 0;
  if (habit && !talking) {
    const span = habit === 'tidy' ? 11 : 9;
    const k = Math.floor((time + phase) / span);
    const local = time + phase - k * span;
    busy = habit === 'punch' ? 1 : pulse(local, habit === 'tidy' ? 5.5 : 1.1, habit === 'tidy' ? 0.9 : 0.35);
    if (habit === 'lean' && hash(seed + k) < 0.3) busy = 0;
  }
  // Seidel räumt am Tresen und sieht dabei auf seine Hände, solange Holmes nicht vor ihm steht.
  if (habit === 'tidy' && !f.attending) pitch = lerp(pitch, 0.4, busy);

  const bodyTurn = clamp(turn * 0.45, f.sitting ? -0.12 : -0.6, f.sitting ? 0.12 : 0.6);
  approach(f.body.rotation, 'y', bodyTurn, 0.05);
  approach(f.body.rotation, 'x', habit === 'tidy' ? busy * 0.07 : 0, 0.06);
  const headYaw = clamp(turn - f.body.rotation.y, -0.95, 0.95);
  // Die Augen sind schneller als der Kopf: Sie springen zum Ziel und gleichen aus, was Kopf
  // und Oberkörper noch nicht geschafft haben. Ohne Ziel wandern sie in kleinen Sprüngen.
  const k2 = Math.floor((time + phase) / (f.attending ? 2.2 : 1.3));
  const jitter = f.attending ? 0.0007 : 0.003;
  const ex = clamp((turn - f.body.rotation.y - f.head.rotation.y) * 0.006, -0.0035, 0.0035) + (hash(seed + k2 * 1.7) - 0.5) * jitter;
  const ey = clamp((f.head.rotation.x - pitch) * 0.006, -0.0025, 0.002) + (hash(seed + k2 * 2.3) - 0.5) * jitter * 0.5;
  approach(f.pupils.position, 'x', ex, 0.4);
  approach(f.pupils.position, 'y', ey, 0.4);
  approach(f.head.rotation, 'y', headYaw, 0.08);
  approach(f.head.rotation, 'x', talking ? pitch + Math.sin(time * 6.5) * 0.04 - 0.02 : pitch, 0.1);
  approach(f.head.rotation, 'z', (talking ? Math.sin(time * 1.7) * 0.03 : 0) + side * 0.028, 0.05);

  const sway = (t) => Math.sin(time * t + phase) * 0.025;
  let armRx = f.umbrella ? 0.1 : sway(1.1);
  let foreR = f.restR;
  let armLx = sway(0.9);
  let foreL = f.restL;
  let armRz = ARM_Z;
  let armLz = -ARM_Z;
  if (habit === 'tidy') {
    // Beide Hände auf dem Tresen, sie schieben und rücken etwas zurecht.
    armRx = lerp(armRx, -0.6 + Math.sin(time * 2.1) * 0.06, busy);
    armLx = lerp(armLx, -0.6 + Math.sin(time * 1.6 + 1) * 0.05, busy);
    foreR = lerp(foreR, -0.75 + Math.sin(time * 3.1) * 0.1, busy);
    foreL = lerp(foreL, -0.75 + Math.cos(time * 2.3) * 0.07, busy);
    armRz = lerp(armRz, -0.05 + Math.sin(time * 1.3) * 0.06, busy);
    armLz = lerp(armLz, 0.05, busy);
  } else if (habit === 'lean') {
    // Die Hand liegt schwer auf dem Knauf, der Stock steht etwas seitlich vor dem Fuß;
    // zwischendurch hebt er ihn kurz an und setzt ihn neu auf.
    armRx = -0.06 - busy * 0.12;
    armRz = ARM_Z + 0.06;
    foreR = f.restR - busy * 0.22;
  } else if (habit === 'punch') {
    // Die Knipszange wippt in der Hand, ab und zu klappt sie zweimal ins Leere.
    const k = Math.floor((time + phase) / 6.5);
    const local = time + phase - k * 6.5;
    const click = local < 0.5 && hash(seed + k) < 0.6 ? Math.sin(local * 25) * 0.09 : 0;
    foreR = lerp(f.restR, f.restR + Math.sin(time * 2.4 + phase) * 0.07 + click, busy);
  }
  if (talking && f.gesture === 'R') {
    armRx = -0.18 - Math.sin(time * 2.3) * 0.08;
    foreR = f.restR - 0.75 - Math.sin(time * 2.3 + 0.6) * 0.25;
  } else if (talking && f.gesture === 'L') {
    armLx = -0.18 - Math.sin(time * 2.3) * 0.08;
    foreL = f.restL - 0.75 - Math.sin(time * 2.3 + 0.6) * 0.25;
  }
  approach(f.armR.rotation, 'x', armRx, 0.08);
  approach(f.armL.rotation, 'x', armLx, 0.08);
  approach(f.armR.rotation, 'z', armRz, 0.08);
  approach(f.armL.rotation, 'z', armLz, 0.08);
  approach(f.foreR.rotation, 'x', foreR, 0.08);
  approach(f.foreL.rotation, 'x', foreL, 0.08);
  if (f.umbrella) f.umbrella.rotation.x = UMBRELLA_TILT - (f.armR.rotation.x + f.foreR.rotation.x);
}

// Schritt mit Kniebeugung im Schwungbein; die Arme pendeln gegengleich.
export function walkFigure(figure, phase) {
  const f = figure.userData.figure;
  const legs = [[f.legL, f.shinL, phase], [f.legR, f.shinR, phase + Math.PI]];
  for (const [thigh, shin, p] of legs) {
    if (!thigh) continue;
    thigh.rotation.x = -Math.sin(p) * 0.42;
    shin.rotation.x = 0.08 + Math.max(0, Math.cos(p)) * 0.6;
  }
  f.armL.rotation.x = Math.sin(phase) * 0.35;
  f.armR.rotation.x = -Math.sin(phase) * 0.35;
  f.foreL.rotation.x = f.restL - 0.15 - Math.max(0, -Math.sin(phase)) * 0.3;
  f.foreR.rotation.x = f.restR - 0.15 - Math.max(0, Math.sin(phase)) * 0.3;
  if (f.umbrella) {
    // Der Schirmarm schwingt nicht mit, der Schirm wippt nur mit dem Schritt.
    f.armR.rotation.x = 0.1;
    f.foreR.rotation.x = f.restR;
    f.umbrella.rotation.x = UMBRELLA_TILT - (f.armR.rotation.x + f.foreR.rotation.x) + Math.sin(phase * 2) * 0.02;
  }
  f.body.position.y = Math.abs(Math.cos(phase)) * 0.025;
  f.body.rotation.y = Math.sin(phase) * 0.04;
  if (f.female) f.body.rotation.z = Math.sin(phase) * 0.015;
}

// Droschkenpferd mit Geschirr. Es läuft in +Z, die Hufe stehen auf y = 0.
// Ein Mesh mit Skelett: Rumpf aus Brust, Bauch und Kruppe; Hals und Kopf hängen an einem Knochen
// am Widerrist, damit sie nicken können; der Schweif pendelt. Die Beine beugen sich an Knie bzw.
// Sprunggelenk und Fesselkopf.
const HORSE_UP = new THREE.Vector3(0, 1, 0);
const LEATHER = 0x17120e;
const BRASS = 0x9a7c3c;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// Kegelstumpf von a nach b, seitlich um sx gestaucht. Alle Teile liegen in Ebenen x = const,
// die Drehung geht also um die x-Achse und sx bleibt die Breite.
function strut(a, b, r0, r1, seg = 8, sx = 1) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, seg).scale(sx, 1, 1).translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(HORSE_UP, d.normalize()));
  return g.translate(a.x, a.y, a.z);
}

function ell(rx, ry, rz, x, y, z, w = 14, h = 9) {
  return new THREE.SphereGeometry(1, w, h).scale(rx, ry, rz).translate(x, y, z);
}

const horseLegs = new Map();
// Ein Bein in drei Teilen, jeweils um sein eigenes Gelenk gelegt: Oberbein (Unterarm bzw.
// Unterschenkel) ab dem Rumpf, Röhre ab Knie bzw. Sprunggelenk, Fessel mit Huf ab dem Fesselkopf.
function horseLeg(color, hind) {
  const key = `${color}-${hind}`;
  if (!horseLegs.has(key)) {
    const hoof = 0x141110;
    const kz = hind ? -0.12 : 0.02;
    const fz = hind ? -0.045 : 0.005;
    const upper = [
      tint(hind ? strut(V3(0, 0.04, 0.03), V3(0, -0.42, kz), 0.12, 0.06, 8, 0.7) : strut(V3(0, 0.05, 0), V3(0, -0.43, kz), 0.09, 0.055, 8, 0.8), color),
      tint(ell(0.05, 0.065, hind ? 0.07 : 0.055, 0, -0.45, kz), color),
    ];
    // Fersenhöcker hinten am Sprunggelenk.
    if (hind) upper.push(tint(ell(0.032, 0.06, 0.04, 0, -0.4, kz - 0.06, 8, 6), color));
    const cannon = [
      tint(strut(V3(0, -0.45, kz), V3(0, -0.85, hind ? -0.05 : 0), 0.042, 0.036, 6), color),
      tint(ell(0.046, 0.05, 0.05, 0, -0.87, fz, 8, 6), color),
    ].map((g) => g.translate(0, 0.45, -kz));
    const pastern = [
      tint(strut(V3(0, -0.87, fz), V3(0, -0.95, hind ? -0.01 : 0.04), 0.036, 0.042, 6), color),
      tint(strut(V3(0, -1.02, hind ? 0 : 0.05), V3(0, -0.94, hind ? -0.01 : 0.04), 0.062, 0.046, 8), hoof),
    ].map((g) => g.translate(0, 0.87, -fz));
    horseLegs.set(key, { upper: merge(upper), cannon: merge(cannon), pastern: merge(pastern), knee: V3(0, -0.45, kz), fetlock: V3(0, -0.42, fz - kz) });
  }
  return horseLegs.get(key);
}

// Mähne als Haarband, das vom Widerrist bis zum Genick über den Kamm und an der rechten Halsseite
// herabfällt, mit ausgefranstem Saum. Im Raum des Kopfknochens: Die Halsachse läuft von
// (y −0,05 | z 0) nach (0,5 | 0,4), Radius 0,25 bis 0,13, seitlich auf 0,62 gestaucht; oben trägt
// sie den Kamm (Achse (0,06 | −0,1) nach (0,54 | 0,33), Radius 0,13 bis 0,07). Für jeden Schnitt quer
// zum Hals wird gesucht, wie hoch der Kamm über die Achse ragt, und das Band auf eine Ellipse
// durch Kammhöhe und Halsbreite gelegt, knapp über der Haut.
function maneSheet(rand) {
  const cols = 22;
  const rows = [1.75, 1.25, 0.8, 0.45];
  const dir = V3(0, 0.55, 0.4).normalize();
  const dorsal = V3(0, dir.z, -dir.y);
  const ridgeN = V3(0, 0.43, -0.48).normalize();
  const cAxis = V3(0, 0.48, 0.43);
  const pos = [];
  for (let i = 0; i <= cols; i++) {
    const t = 0.06 + (i / cols) * 0.86;
    const c = V3(0, -0.05 + 0.55 * t, 0.4 * t);
    const r = 0.25 - 0.12 * t;
    // Kammpunkt im selben Querschnitt: (Q(s) + n·rc(s) − c) · dir = 0, linear in s.
    const q0 = V3(0, 0.06, -0.1).addScaledVector(ridgeN, 0.13).sub(c);
    const q1 = cAxis.clone().addScaledVector(ridgeN, -0.06);
    const s = Math.min(1, Math.max(0, -q0.dot(dir) / q1.dot(dir)));
    const height = Math.max(r, q0.addScaledVector(q1, s).dot(dorsal));
    // Zackiger Saum: jeder zweite Schnitt endet höher, dazu etwas Zufall.
    const fray = (i % 2) * 0.3 + 0.1 * rand();
    rows.forEach((a, j) => {
      const ang = j === rows.length - 1 ? a - fray : a;
      // Unten dünner Saum, oben dicker Schopf über dem Kamm.
      const lift = 0.025 - j * 0.005;
      const x = Math.cos(ang) * (0.62 * r + lift);
      const p = c.clone().addScaledVector(dorsal, Math.sin(ang) * (height + lift));
      pos.push(x, p.y, p.z + (j === rows.length - 1 ? 0.02 : 0));
    });
  }
  // Vorder- und Rückseite mit eigenen Punkten, damit jede ihre eigene Normale bekommt.
  const n = rows.length;
  const back = pos.length / 3;
  const index = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < n - 1; j++) {
      const a = i * n + j;
      const b = a + n;
      index.push(a, b, a + 1, b, b + 1, a + 1);
      index.push(back + a, back + a + 1, back + b, back + b, back + a + 1, back + b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...pos, ...pos], 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

// Teile verschiedener Knochen zu einem Mesh: Jeder Eintrag [Geometrie, Knochen] hängt ganz an
// seinem Knochen. Die Geometrie liegt in der Ruhelage im Raum des Pferdes.
function skinnedParts(entries) {
  return mergeGeometries(
    entries.map(([geo, bone]) => {
      const n = geo.attributes.position.count;
      const index = new Uint16Array(n * 4);
      const weight = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) {
        index[i * 4] = bone;
        weight[i * 4] = 1;
      }
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(index, 4));
      geo.setAttribute('skinWeight', new THREE.BufferAttribute(weight, 4));
      return geo;
    }),
    false,
  );
}

let horseMat = null;

export function makeHorse(color = 0x2e2018, { blanket = false, nosebag = false } = {}) {
  horseMat ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62 });
  const mane = 0x14100c;
  let seed = (color % 9973) + (blanket ? 7 : 1);
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // Knochen: Rumpf, Kopf (am Widerrist, mit dem Hals), Schweif, je Bein Oberbein, Röhre, Fessel.
  const bones = [];
  const bone = (parent, x, y, z) => {
    const b = new THREE.Bone();
    b.position.set(x, y, z);
    parent?.add(b);
    bones.push(b);
    return b;
  };
  const rootBone = bone(null, 0, 0, 0);
  const head = bone(rootBone, 0, 1.45, 0.62);
  const tail = bone(rootBone, 0, 1.47, -0.88);
  const parts = [];
  const add = (b, geo) => parts.push([geo, bones.indexOf(b)]);

  const body = [
    tint(ell(0.33, 0.36, 0.72, 0, 1.17, -0.02), color),
    tint(ell(0.3, 0.38, 0.34, 0, 1.2, 0.5), color),
    tint(ell(0.33, 0.35, 0.38, 0, 1.25, -0.52), color),
    tint(ell(0.14, 0.18, 0.3, 0, 1.4, 0.38), color),
    tint(ell(0.06, 0.06, 0.1, 0, 1.47, -0.86), color),
  ];
  for (const s of [-1, 1]) {
    body.push(tint(ell(0.1, 0.3, 0.2, s * 0.2, 1.14, 0.56), color));
    body.push(tint(ell(0.12, 0.32, 0.26, s * 0.19, 1.1, -0.6), color));
  }
  // Geschirr: Kummet um den Halsansatz, Sellette mit Bauchgurt, Hinterzeug und Stränge.
  body.push(tint(new THREE.TorusGeometry(0.27, 0.065, 6, 18).scale(0.78, 1.15, 1).rotateX(-0.6).translate(0, 1.5, 0.68), LEATHER));
  for (const s of [-1, 1]) {
    body.push(tint(ell(0.035, 0.035, 0.035, s * 0.12, 1.84, 0.5, 8, 6), BRASS));
    body.push(tint(strut(V3(s * 0.27, 1.3, 0.62), V3(s * 0.36, 1.06, -0.62), 0.016, 0.016, 4), LEATHER));
    body.push(tint(new THREE.TorusGeometry(0.035, 0.008, 4, 10).translate(s * 0.1, 1.64, 0.12), BRASS));
  }
  body.push(tint(new THREE.BoxGeometry(0.36, 0.08, 0.26).translate(0, 1.56, 0.12), LEATHER));
  body.push(tint(new THREE.TorusGeometry(0.37, 0.025, 4, 22).scale(0.95, 1.02, 1).translate(0, 1.17, 0.12), LEATHER));
  body.push(tint(new THREE.TorusGeometry(0.4, 0.028, 4, 16, Math.PI).rotateX(-Math.PI / 2).translate(0, 1.13, -0.5), LEATHER));
  body.push(tint(strut(V3(0, 1.58, 0.0), V3(0, 1.58, -0.72), 0.018, 0.018, 4), LEATHER));
  if (blanket) {
    // Decke für die Wartezeit am Halteplatz, mit hellen Borten.
    // Die Seiten fallen senkrecht und leicht gewellt bis unter den Bauch, die Borte sitzt am Saum.
    const cloth = new THREE.CylinderGeometry(0.42, 0.42, 1.3, 24, 8, true, Math.PI - 1.75, 3.5).rotateX(Math.PI / 2);
    const p = cloth.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k);
      const y = p.getY(k);
      const z = p.getZ(k);
      if (y < 0.05) {
        const drop = (0.05 - y) * 2.5;
        p.setXYZ(k, Math.sign(x) * (Math.abs(x) + drop * 0.25 + Math.sin(z * 14) * 0.012 * drop * 4), y - drop, z);
      }
    }
    cloth.computeVertexNormals();
    body.push(tint(cloth.translate(0, 1.22, -0.08), 0x4a2622));
    for (const s of [-1, 1]) body.push(tint(new THREE.BoxGeometry(0.02, 0.06, 1.3).translate(s * 0.49, 0.85, -0.08), 0x9a7a48));
  }
  add(rootBone, merge(body));

  // Hals und Kopf, im Raum des Kopfknochens gebaut und dann an seine Stelle gerückt.
  const h = [
    tint(strut(V3(0, -0.05, 0), V3(0, 0.3, 0.2), 0.25, 0.18, 12, 0.62), color),
    tint(strut(V3(0, 0.3, 0.2), V3(0, 0.5, 0.4), 0.18, 0.13, 12, 0.62), color),
    // Mähnenkamm: Der Hals ist oben kräftiger als an der Kehle.
    tint(strut(V3(0, 0.06, -0.1), V3(0, 0.54, 0.33), 0.13, 0.07, 10, 0.52), color),
    tint(ell(0.1, 0.13, 0.15, 0, 0.42, 0.47), color),
    tint(strut(V3(0, 0.5, 0.45), V3(0, 0.02, 0.75), 0.11, 0.075, 10, 0.75), color),
    tint(ell(0.062, 0.075, 0.085, 0, 0.02, 0.77), color),
    // Stirn über den Augen und Kinngrube unter dem Maul.
    tint(ell(0.085, 0.07, 0.06, 0, 0.43, 0.56, 10, 7), color),
    tint(ell(0.045, 0.035, 0.05, 0, -0.04, 0.72, 8, 6), color),
    // Schopf über die Stirn.
    tint(strut(V3(0, 0.62, 0.41), V3(0, 0.48, 0.56), 0.045, 0.02, 4, 0.7), mane),
  ];
  for (const s of [-1, 1]) {
    // Ganaschen: die runden Backen hinten am Unterkiefer.
    h.push(tint(ell(0.045, 0.1, 0.085, s * 0.055, 0.33, 0.46, 10, 7), color));
    // Nüstern: dunkle Öffnungen vorn am Maul.
    h.push(tint(ell(0.018, 0.028, 0.012, s * 0.035, 0.03, 0.855, 6, 4), 0x0a0807));
    h.push(tint(strut(V3(s * 0.05, 0.6, 0.42), V3(s * 0.07, 0.75, 0.4), 0.03, 0.006, 5), color));
    h.push(tint(new THREE.BoxGeometry(0.02, 0.09, 0.11).translate(s * 0.11, 0.42, 0.55), LEATHER));
    h.push(tint(strut(V3(s * 0.09, 0.52, 0.46), V3(s * 0.075, 0.08, 0.71), 0.011, 0.011, 4), LEATHER));
    h.push(tint(strut(V3(s * 0.08, 0.06, 0.71), V3(s * 0.1, 0.11, -0.5), 0.008, 0.008, 3), LEATHER));
  }
  h.push(tint(maneSheet(rand), mane));
  const headDir = V3(0, -0.48, 0.3).normalize();
  h.push(tint(new THREE.TorusGeometry(0.088, 0.013, 4, 14).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), headDir)).translate(0, 0.16, 0.67), LEATHER));
  h.push(tint(new THREE.TorusGeometry(0.115, 0.012, 4, 14).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), headDir)).translate(0, 0.5, 0.47), LEATHER));
  if (nosebag) {
    h.push(tint(strut(V3(0, 0.15, 0.68), V3(0, -0.12, 0.85), 0.11, 0.1, 10), 0x6e6048));
    for (const s of [-1, 1]) h.push(tint(strut(V3(s * 0.1, 0.12, 0.69), V3(s * 0.085, 0.58, 0.42), 0.009, 0.009, 3), 0x6e6048));
  }
  add(head, merge(h).translate(0, 1.45, 0.62));

  // Schweif: kurze Rübe, darunter ein Bündel langer Haare, das sich nach unten auffächert.
  const tl = [tint(strut(V3(0, 0, 0), V3(0, -0.28, -0.12), 0.05, 0.06, 6), mane)];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const end = V3(Math.cos(a) * 0.07, -0.82 - rand() * 0.12, -0.17 + Math.sin(a) * 0.05);
    tl.push(tint(strut(V3(Math.cos(a) * 0.025, -0.2, -0.1 + Math.sin(a) * 0.02), end, 0.045, 0.016, 5), mane));
  }
  add(tail, merge(tl).translate(0, 1.47, -0.88));

  const legs = [];
  for (const [x, z, hind] of [[-0.17, 0.55, false], [0.17, 0.55, false], [-0.17, -0.6, true], [0.17, -0.6, true]]) {
    const leg = horseLeg(color, hind);
    const upper = bone(rootBone, x, 1.02, z);
    const lower = bone(upper, leg.knee.x, leg.knee.y, leg.knee.z);
    const foot = bone(lower, leg.fetlock.x, leg.fetlock.y, leg.fetlock.z);
    rootBone.updateMatrixWorld(true);
    add(upper, leg.upper.clone().applyMatrix4(upper.matrixWorld));
    add(lower, leg.cannon.clone().applyMatrix4(lower.matrixWorld));
    add(foot, leg.pastern.clone().applyMatrix4(foot.matrixWorld));
    legs.push({ upper, lower, foot, hind });
  }

  const mesh = new THREE.SkinnedMesh(skinnedParts(parts), horseMat);
  mesh.add(rootBone);
  rootBone.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  const root = new THREE.Group();
  root.add(mesh);
  // Mit Futtersack hängt der Kopf tiefer.
  const tilt = nosebag ? 0.35 : 0;
  head.rotation.x = tilt;
  root.userData = { legs, head, tail, tilt };
  return root;
}

// Ein Bein stellen: swing schwingt das ganze Bein (positiv: Huf nach hinten), flex beugt es
// (0 gestreckt, 1 voll gebeugt). Vorn klappt die Röhre am Knie nach hinten; hinten bleibt das
// Sprunggelenk fast in Höhe, und die Röhre schwingt nach hinten hoch. In beiden Fällen kippt der Huf.
function poseLeg(leg, swing, flex) {
  if (leg.hind) {
    leg.upper.rotation.x = swing - 0.2 * flex;
    leg.lower.rotation.x = 1.1 * flex;
    leg.foot.rotation.x = 0.5 * flex;
  } else {
    leg.upper.rotation.x = swing - 0.25 * flex;
    leg.lower.rotation.x = 1.0 * flex;
    leg.foot.rotation.x = 0.6 * flex;
  }
}

// Trab: diagonale Beinpaare (links vorn mit rechts hinten) wechseln sich ab. Ein Bein stützt,
// solange es nach hinten schwingt, und wird beim Vorschwingen gebeugt angehoben. Es löst sich
// schon kurz vor dem hintersten Punkt vom Boden, so dass beide Paare einen Augenblick schweben.
export function trotHorse(horse, phase) {
  const { legs, head, tail, tilt } = horse.userData;
  legs.forEach((leg, i) => {
    const q = phase + (i === 0 || i === 3 ? 0 : Math.PI);
    const flex = Math.max(0, -Math.cos(q + 0.15));
    poseLeg(leg, Math.sin(q) * 0.42, flex * flex * (3 - 2 * flex));
  });
  head.rotation.x = tilt + Math.sin(phase * 2) * 0.03;
  head.rotation.y = 0;
  tail.rotation.x = 0.15 + Math.sin(phase * 2 + 1) * 0.04;
  tail.rotation.z = 0;
}

// Schritt: Viertakt, die Hufe setzen nacheinander auf, links hinten, links vorn, rechts hinten,
// rechts vorn (legs: rechts vorn, links vorn, rechts hinten, links hinten). Jedes Bein trägt gut
// sechs Zehntel der Zeit und wird beim Vorschwingen nur flach angehoben; der Kopf nickt bei jedem
// Vorderhuf. phase wächst um 2π je Doppelschritt, beim Rückwärtsrichten fällt sie.
const WALK_LAND = [0.75, 0.25, 0.5, 0];
const WALK_DUTY = 0.62;
export function walkHorse(horse, phase) {
  const { legs, head, tail, tilt } = horse.userData;
  const cycle = phase / (Math.PI * 2);
  legs.forEach((leg, i) => {
    const u = cycle - WALK_LAND[i];
    const f = u - Math.floor(u);
    if (f < WALK_DUTY) {
      poseLeg(leg, (-1 + (2 * f) / WALK_DUTY) * 0.3, 0);
    } else {
      const k = (f - WALK_DUTY) / (1 - WALK_DUTY);
      poseLeg(leg, (1 - 2 * k * k * (3 - 2 * k)) * 0.3, Math.sin(Math.PI * k) * 0.55);
    }
  });
  head.rotation.x = tilt + 0.02 + Math.sin(phase * 2) * 0.045;
  head.rotation.y = 0;
  tail.rotation.x = 0.1;
  tail.rotation.z = Math.sin(phase) * 0.05;
}

// Stehendes Pferd: Kopf und Schweif bewegen sich ein wenig, ab und zu stampft ein Huf
// (plaza.js hört ihn aufsetzen, wenn sin(t / 2) wieder unter 0,97 fällt).
export function idleHorse(horse, t) {
  const { legs, head, tail, tilt } = horse.userData;
  head.rotation.x = tilt + Math.sin(t * 0.6) * 0.03 + Math.max(0, Math.sin(t * 2.3)) * 0.02;
  head.rotation.y = Math.sin(t * 0.23) * 0.08;
  tail.rotation.x = 0;
  tail.rotation.z = Math.sin(t * 1.1) * Math.max(0, Math.sin(t * 0.17)) * 0.25;
  const lift = Math.min(1, Math.max(0, Math.sin(t * 0.5) - 0.97) / 0.02);
  // Wer eben noch gelaufen ist, steht jetzt auf allen vieren.
  poseLeg(legs[1], 0, 0);
  poseLeg(legs[2], 0, 0);
  poseLeg(legs[0], -0.05 * lift, 0.8 * lift);
  // Ein Hinterbein ruht: Die Röhre steht etwas vor, der Huf nur auf der Spitze.
  const rest = legs[3];
  rest.upper.rotation.x = 0.05;
  rest.lower.rotation.x = -0.12;
  rest.foot.rotation.x = 0.5;
}
