import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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
const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.9, 0.8) });

const color = (c) => (c instanceof THREE.Color ? c.clone() : new THREE.Color(c));
const shade = (c, k) => color(c).multiplyScalar(k);

class Parts {
  constructor() {
    this.list = [];
  }

  add(geo, c) {
    this.list.push(tint(geo, color(c)));
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
const TORSO_F = [[0, 0.98], [0.14, 0.99], [0.124, 1.06], [0.148, 1.17], [0.168, 1.27], [0.164, 1.37], [0.146, 1.45], [0.085, 1.5], [0, 1.51]];
const SKIRT = [[0, 0.012], [0.36, 0.015], [0.35, 0.12], [0.31, 0.35], [0.26, 0.6], [0.2, 0.85], [0.15, 1.0], [0.128, 1.07]];
const APRON = [[0.37, 0.1], [0.32, 0.35], [0.27, 0.6], [0.21, 0.85], [0.16, 1.0], [0.135, 1.07]];
const DEPTH = 0.66;

// Schnitte der Männerröcke: Profil des Schoßes und Breite des Spalts vorn.
const COATS = {
  frock: { pts: [[0.215, 0.5], [0.2, 0.7], [0.178, 0.9], [0.165, 1.04]], gap: 0.42, sz: 0.74 },
  overcoat: { pts: [[0.26, 0.3], [0.23, 0.6], [0.19, 0.9], [0.168, 1.04]], gap: 0.12, sz: 0.8 },
  labcoat: { pts: [[0.215, 0.52], [0.195, 0.78], [0.17, 1.04]], gap: 0.1, sz: 0.76 },
  jacket: { pts: [[0.182, 0.8], [0.176, 0.9], [0.164, 1.04]], gap: 0, sz: 0.72 },
  tunic: { pts: [[0.178, 0.8], [0.172, 0.88], [0.164, 1.04]], gap: 0, sz: 0.7 },
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

// Schädel und Kiefer aus einer einzigen verformten Kugel: Zwei sich durchdringende
// Kugeln hinterlassen quer über den Wangen eine harte Schnittkante, die wie eine Narbe
// aussieht. Nach unten wird die Kugel schmaler, länger und am Kinn etwas vorgezogen.
// Die Haut ist pro Vertex gefärbt: Bartstoppeln gehen weich in die Hautfarbe über,
// statt als zweite Schale aufzuliegen (die schneidet sonst wieder Kanten ins Gesicht).
function headShape(female, skin, stubble = null) {
  let g = new THREE.SphereGeometry(0.1, 24, 18);
  const pos = g.attributes.position;
  const unit = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  const taper = female ? 0.26 : 0.18;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).divideScalar(0.1);
    v.toArray(unit, i * 3);
    const t = Math.max(0, -v.y);
    const x = v.x * 0.082 * (1 - taper * t ** 1.5);
    const y = v.y * 0.11 * (1 + 0.08 * t);
    const z = v.z * 0.097 + 0.01 * t * Math.max(0, v.z);
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
  const beard = stubble ? color(stubble) : null;
  const out = new Float32Array(u.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < u.count; i++) {
    c.copy(base);
    if (beard) {
      const uy = u.getY(i);
      const uz = u.getZ(i);
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
    H.add(ball(0.026, s * 0.08, 0.005, -0.005, 0.35, 1, 0.65, 8, 6), skin);
    if (L.female) H.add(box(0.03, 0.004, 0.012, s * 0.034, 0.05, 0.081), shade(hair, 0.95));
    else H.add(box(0.034, 0.009, 0.012, s * 0.034, 0.045, 0.083), shade(hair, 0.8));
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

  // Augen als eigenes Mesh: Lidschlag durch Stauchen in der Höhe.
  const E = new Parts();
  for (const s of [-1, 1]) {
    E.add(ball(0.0112, s * 0.032, 0, 0.084, 1.1, 1, 0.6, 8, 6), 0xe2ddd2);
    E.add(ball(0.0062, s * 0.032, -0.0005, 0.0902, 1, 1, 0.5, 8, 6), 0x1a1410);
    // Oberlid: nimmt den starren Blick.
    E.add(ball(0.0125, s * 0.032, 0.0085, 0.0848, 1.1, 0.6, 0.65, 8, 6), shade(skin, 0.9));
  }
  const eyes = E.mesh();
  eyes.position.y = SKULL_Y + 0.018;
  head.add(eyes);
  return { head, eyes };
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

// Hemd, Weste und Krawatte als V im Ausschnitt des Rocks.
function addVee(T, L, w) {
  const zTop = frontZ(TORSO_M, 1.47, w, DEPTH);
  const tilt = -0.07;
  const vee = (width, height, c, dz) => {
    const s = new THREE.Shape();
    s.moveTo(-width / 2, 0);
    s.lineTo(width / 2, 0);
    s.lineTo(0, -height);
    s.closePath();
    const g = new THREE.ShapeGeometry(s);
    g.rotateX(tilt);
    g.translate(0, 1.47, zTop + 0.004 + dz);
    T.add(g, c);
  };
  vee(0.15, 0.27, L.vest, 0);
  vee(0.085, 0.15, L.shirt, 0.002);
  const tieZ = zTop + 0.008;
  if (L.neck === 'tie') {
    T.add(box(0.022, 0.11, 0.006, 0, 1.4, tieZ).rotateX(tilt), L.tie);
    T.add(box(0.03, 0.022, 0.01, 0, 1.462, tieZ), L.tie);
  } else if (L.neck === 'cravat') {
    T.add(ball(0.03, 0, 1.43, tieZ, 1.2, 1.5, 0.5, 8, 6), L.tie);
  }
  // Revers entlang der Kanten des V
  for (const s of [-1, 1]) {
    const lapel = box(0.032, 0.22, 0.008, 0, 0, 0);
    lapel.rotateZ(s * 0.28);
    lapel.rotateX(tilt);
    lapel.translate(s * 0.05, 1.37, zTop + 0.008);
    T.add(lapel, shade(L.coat, 0.85));
  }
}

function buttonsDown(T, x, ys, profile, w, depth, c, r = 0.009) {
  for (const y of ys) T.add(ball(r, x, y, frontZ(profile, y, w, depth) + 0.003, 1, 1, 0.5, 6, 5), c);
}

function buildTorso(L, w) {
  const T = new Parts();
  if (L.female) {
    const torso = scaleProfile(TORSO_F, w);
    T.add(lathe(torso, { sz: 0.7 }), L.coat);
    T.add(lathe(scaleProfile(SKIRT, w), { sz: 0.86, seg: 22 }), L.coat);
    T.add(lathe([[0.364 * w, 0.02], [0.357 * w, 0.09]], { sz: 0.86, seg: 22 }), shade(L.coat, 0.7));
    T.add(ball(0.14, 0, 0.98, -0.12 * w, w, 0.7, 0.8), L.coat);
    for (const s of [-1, 1]) T.add(ball(0.062, s * 0.158 * w, 1.43, 0, 1, 0.85, 0.85), L.coat);
    if (L.apron) {
      T.add(lathe(scaleProfile(APRON, w), { sz: 0.86, phiStart: -0.75, phiLength: 1.5 }), L.apron);
      T.add(box(0.16, 0.2, 0.01, 0, 1.24, frontZ(TORSO_F, 1.24, w, 0.7) + 0.006), L.apron);
    }
    if (L.shawl) {
      T.add(lathe(scaleProfile([[0.205, 1.18], [0.19, 1.33], [0.155, 1.45], [0.075, 1.51]], w), { sz: 0.74, phiStart: 0.32, phiLength: TAU - 0.64 }), L.shawl);
    }
    T.add(cyl(0.048, 0.05, 0.07, 0, 1.53, 0, 12), L.collar);
    T.add(ball(0.012, 0, 1.505, 0.05, 1, 1.2, 0.5, 8, 6), GOLD);
    buttonsDown(T, 0, [1.12, 1.2, 1.28, 1.36], TORSO_F, w, 0.7, shade(L.coat, 0.5), 0.007);
    if (L.chain) T.add(new THREE.TorusGeometry(0.04, 0.003, 4, 12, Math.PI).rotateZ(Math.PI).translate(0.04, 1.12, frontZ(TORSO_F, 1.12, w, 0.7) + 0.004), GOLD);
    T.add(cyl(0.041, 0.045, 0.11, 0, 1.555, 0, 10), L.skin);
    return T.mesh();
  }

  const torso = scaleProfile(TORSO_M, w);
  T.add(lathe(scaleProfile([[0, 0.84], [0.15, 0.86], [0.165, 0.92], [0.16, 1.0]], w), { sz: 0.72 }), L.trousers);
  T.add(lathe(torso, { sz: DEPTH }), L.coat);
  const coat = COATS[L.outfit] || COATS.jacket;
  T.add(lathe(scaleProfile(coat.pts, w), { sz: coat.sz, phiStart: coat.gap, phiLength: TAU - coat.gap * 2 }), L.coat);
  if (L.build === 'stout') T.add(ball(0.16, 0, 1.08, 0.03, 1, 1, 0.75), L.coat);
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
  return T.mesh();
}

// --- Glieder ---------------------------------------------------------------------
function buildArm(L, w, s) {
  const upperGroup = new THREE.Group();
  upperGroup.position.set(s * (L.female ? 0.155 * w + 0.015 : 0.17 * w + 0.02), 1.43, 0);
  upperGroup.rotation.z = s * 0.1;
  const sleeve = L.coat;
  const U = new Parts();
  U.add(cyl(0.052, 0.046, 0.3, 0, -0.15, 0, 10), sleeve);
  U.add(ball(0.046, 0, -0.3, 0, 1, 1, 1, 8, 6), sleeve);
  upperGroup.add(U.mesh());

  const fore = new THREE.Group();
  fore.position.y = -0.3;
  const F = new Parts();
  F.add(cyl(0.045, 0.037, 0.26, 0, -0.13, 0, 10), sleeve);
  const cuff = L.cuffs ?? (L.outfit === 'tunic' ? L.piping ?? sleeve : L.female ? L.collar : L.shirt);
  F.add(cyl(0.037, 0.037, 0.024, 0, -0.256, 0, 10), cuff);
  F.add(ball(0.04, 0, -0.31, 0.005, 0.62, 1.15, 0.95, 8, 7), L.skin);
  F.add(ball(0.017, -s * 0.015, -0.29, 0.03, 1, 1.3, 1, 6, 5), L.skin);

  let rest = -0.15;
  let gesture = true;
  if (s > 0 && L.cane) {
    F.add(cyl(0.011, 0.011, 0.86, 0, -0.71, 0.05, 6), 0x2a1a10);
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

// --- Figur -----------------------------------------------------------------------
// look: outfit (frock, overcoat, labcoat, jacket, tunic, dress), coat, trousers, vest, shirt,
// neck (tie, cravat, scarf, none), tie, collar, skin, hair, hairStyle (short, parted,
// receding, bald, bun), beard (full, mutton, goatee, stubble), moustache (kaiser, walrus,
// brush), eyewear (monocle, pincenez, spectacles), hat (top, bowler, cap, peaked,
// pickelhaube, bonnet, bandage), hatColor, apron, shawl, cape, cane, lantern, umbrella (Farbe), glass, sabre,
// chain, piping, buttons, build (slim, normal, stout), height, pose (stand, sit).
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

  const { head, eyes } = buildHead(L);
  head.position.y = 1.555;
  body.add(head);

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
    armL: armL.group,
    armR: armR.group,
    foreL: armL.fore,
    foreR: armR.fore,
    umbrella: armR.fore.userData.hold ?? null,
    restL: armL.rest,
    restR: armR.rest,
    gesture: gestureArm === armR ? 'R' : gestureArm === armL ? 'L' : null,
    legL: legL?.thigh ?? null,
    legR: legR?.thigh ?? null,
    shinL: legL?.shin ?? null,
    shinR: legR?.shin ?? null,
    female: L.female,
    sitting: L.pose === 'sit',
    talkUntil: 0,
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

// Atmen, Gewicht verlagern, blinzeln und zum Spieler hinsehen.
// Die Kopfdrehung bleibt unter 60 Grad, sonst wirkt sie unheimlich.
export function idleFigure(figure, time, lookAt) {
  const f = figure.userData.figure;
  const phase = figure.id * 0.73;
  const breath = Math.sin(time * 1.4 + phase);
  f.torso.scale.set(1 + breath * 0.008, 1, 1 + breath * 0.012);
  f.body.position.y = breath * 0.003;
  f.body.rotation.z = Math.sin(time * 0.31 + phase) * 0.012;
  f.body.position.x = Math.sin(time * 0.31 + phase) * 0.01;

  const cycle = (time + phase * 3.1) % 3.7;
  f.eyes.scale.y = cycle < 0.12 ? 0.12 : 1;

  const talking = f.talkUntil > time;
  let yaw = Math.sin(time * 0.23 + phase) * 0.25;
  if (lookAt) {
    const dx = lookAt.x - figure.position.x;
    const dz = lookAt.z - figure.position.z;
    if (dx * dx + dz * dz < 30) {
      yaw = Math.atan2(dx, dz) - figure.rotation.y;
      while (yaw > Math.PI) yaw -= Math.PI * 2;
      while (yaw < -Math.PI) yaw += Math.PI * 2;
      yaw = THREE.MathUtils.clamp(yaw, -1, 1);
    }
  }
  approach(f.head.rotation, 'y', yaw, 0.06);
  approach(f.head.rotation, 'x', talking ? Math.sin(time * 6.5) * 0.04 - 0.02 : Math.sin(time * 0.5 + phase) * 0.02, 0.15);
  approach(f.head.rotation, 'z', talking ? Math.sin(time * 1.7) * 0.03 : 0, 0.05);

  const sway = (t) => Math.sin(time * t + phase) * 0.025;
  let armRx = f.umbrella ? 0.1 : sway(1.1);
  let foreR = f.restR;
  let armLx = sway(0.9);
  let foreL = f.restL;
  if (talking && f.gesture === 'R') {
    armRx = -0.18 - Math.sin(time * 2.3) * 0.08;
    foreR = f.restR - 0.75 - Math.sin(time * 2.3 + 0.6) * 0.25;
  } else if (talking && f.gesture === 'L') {
    armLx = -0.18 - Math.sin(time * 2.3) * 0.08;
    foreL = f.restL - 0.75 - Math.sin(time * 2.3 + 0.6) * 0.25;
  }
  approach(f.armR.rotation, 'x', armRx, 0.08);
  approach(f.armL.rotation, 'x', armLx, 0.08);
  approach(f.foreR.rotation, 'x', foreR, 0.08);
  approach(f.foreL.rotation, 'x', foreL, 0.08);
  // Wer eben noch ging, kommt in den Stand.
  if (!f.sitting) {
    for (const leg of [f.legL, f.legR]) if (leg) approach(leg.rotation, 'x', 0, 0.12);
    for (const shin of [f.shinL, f.shinR]) if (shin) approach(shin.rotation, 'x', 0, 0.12);
  }
  approach(f.body.rotation, 'y', 0, 0.1);
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
// Rumpf aus Brust, Bauch und Kruppe; Hals und Kopf hängen an einem Gelenk am Widerrist, damit
// sie nicken können; der Schweif pendelt. Beine mit Knie, Sprunggelenk, Fessel und Huf.
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
function horseLeg(color, hind) {
  const key = `${color}-${hind}`;
  if (!horseLegs.has(key)) {
    const hoof = 0x141110;
    const z = hind ? -0.12 : 0.02;
    const parts = [
      tint(hind ? strut(V3(0, 0.04, 0.03), V3(0, -0.42, z), 0.12, 0.06, 8, 0.7) : strut(V3(0, 0.05, 0), V3(0, -0.43, z), 0.09, 0.055, 8, 0.8), color),
      tint(ell(0.05, 0.065, hind ? 0.07 : 0.055, 0, -0.45, z), color),
      tint(strut(V3(0, -0.45, z), V3(0, -0.85, hind ? -0.05 : 0), 0.042, 0.036, 6), color),
      tint(ell(0.046, 0.05, 0.05, 0, -0.87, hind ? -0.045 : 0.005, 8, 6), color),
      tint(strut(V3(0, -0.87, hind ? -0.045 : 0.005), V3(0, -0.95, hind ? -0.01 : 0.04), 0.036, 0.042, 6), color),
      tint(strut(V3(0, -1.02, hind ? 0 : 0.05), V3(0, -0.94, hind ? -0.01 : 0.04), 0.062, 0.046, 8), hoof),
    ];
    horseLegs.set(key, merge(parts));
  }
  return horseLegs.get(key);
}

let horseMat = null;

export function makeHorse(color = 0x2e2018, { blanket = false, nosebag = false } = {}) {
  horseMat ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 });
  const mane = 0x14100c;
  const root = new THREE.Group();
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
  root.add(new THREE.Mesh(merge(body), horseMat));

  // Hals und Kopf am Widerrist.
  const head = new THREE.Group();
  head.position.set(0, 1.45, 0.62);
  const h = [
    tint(strut(V3(0, -0.05, 0), V3(0, 0.3, 0.2), 0.25, 0.18, 12, 0.62), color),
    tint(strut(V3(0, 0.3, 0.2), V3(0, 0.5, 0.4), 0.18, 0.13, 12, 0.62), color),
    tint(strut(V3(0, 0.2, -0.1), V3(0, 0.62, 0.36), 0.05, 0.035, 4, 0.45), mane),
    tint(strut(V3(0, 0.64, 0.38), V3(0, 0.55, 0.56), 0.04, 0.02, 4, 0.5), mane),
    tint(ell(0.1, 0.13, 0.15, 0, 0.42, 0.47), color),
    tint(strut(V3(0, 0.5, 0.45), V3(0, 0.02, 0.75), 0.11, 0.075, 10, 0.75), color),
    tint(ell(0.075, 0.08, 0.09, 0, 0.02, 0.77), color),
  ];
  const headDir = V3(0, -0.48, 0.3).normalize();
  for (const s of [-1, 1]) {
    h.push(tint(strut(V3(s * 0.05, 0.6, 0.42), V3(s * 0.07, 0.75, 0.4), 0.03, 0.006, 5), color));
    h.push(tint(new THREE.BoxGeometry(0.02, 0.09, 0.11).translate(s * 0.11, 0.42, 0.55), LEATHER));
    h.push(tint(strut(V3(s * 0.09, 0.52, 0.46), V3(s * 0.075, 0.08, 0.71), 0.011, 0.011, 4), LEATHER));
    h.push(tint(strut(V3(s * 0.08, 0.06, 0.71), V3(s * 0.1, 0.11, -0.5), 0.008, 0.008, 3), LEATHER));
  }
  h.push(tint(new THREE.TorusGeometry(0.088, 0.013, 4, 14).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), headDir)).translate(0, 0.16, 0.67), LEATHER));
  h.push(tint(new THREE.TorusGeometry(0.115, 0.012, 4, 14).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), headDir)).translate(0, 0.5, 0.47), LEATHER));
  if (nosebag) {
    h.push(tint(strut(V3(0, 0.15, 0.68), V3(0, -0.12, 0.85), 0.11, 0.1, 10), 0x6e6048));
    for (const s of [-1, 1]) h.push(tint(strut(V3(s * 0.1, 0.12, 0.69), V3(s * 0.085, 0.58, 0.42), 0.009, 0.009, 3), 0x6e6048));
  }
  head.add(new THREE.Mesh(merge(h), horseMat));
  root.add(head);

  const tail = new THREE.Group();
  tail.position.set(0, 1.47, -0.88);
  tail.add(new THREE.Mesh(merge([tint(strut(V3(0, 0, 0), V3(0, -0.28, -0.12), 0.05, 0.06, 6), mane), tint(strut(V3(0, -0.26, -0.11), V3(0, -0.72, -0.16), 0.065, 0.1, 6, 0.7), mane)]), horseMat));
  root.add(tail);

  const legs = [];
  for (const [x, z, hind] of [[-0.17, 0.55, false], [0.17, 0.55, false], [-0.17, -0.6, true], [0.17, -0.6, true]]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.02, z);
    pivot.add(new THREE.Mesh(horseLeg(color, hind), horseMat));
    root.add(pivot);
    legs.push(pivot);
  }
  // Mit Futtersack hängt der Kopf tiefer.
  const tilt = nosebag ? 0.35 : 0;
  head.rotation.x = tilt;
  root.userData = { legs, head, tail, tilt };
  return root;
}

export function trotHorse(horse, phase) {
  const { legs, head, tail, tilt } = horse.userData;
  legs.forEach((leg, i) => {
    leg.rotation.x = Math.sin(phase + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.45;
  });
  head.rotation.x = tilt + Math.sin(phase * 2) * 0.05;
  tail.rotation.x = 0.15 + Math.sin(phase * 2 + 1) * 0.04;
}

// Stehendes Pferd: Kopf und Schweif bewegen sich ein wenig, ab und zu stampft ein Huf.
export function idleHorse(horse, t) {
  const { legs, head, tail, tilt } = horse.userData;
  head.rotation.x = tilt + Math.sin(t * 0.6) * 0.03 + Math.max(0, Math.sin(t * 2.3)) * 0.02;
  head.rotation.y = Math.sin(t * 0.23) * 0.08;
  tail.rotation.z = Math.sin(t * 1.1) * Math.max(0, Math.sin(t * 0.17)) * 0.25;
  legs[0].rotation.x = Math.max(0, Math.sin(t * 0.5) - 0.97) * 8;
}
