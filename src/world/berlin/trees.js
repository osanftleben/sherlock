import * as THREE from 'three';
import { addMesh, matte, merge, std } from '../kit.js';
import { bark, rng, twigs } from '../textures.js';

// Kahle Linden im November, wie sie um 1890 an Berliner Plätzen standen: ein kräftiger Stamm
// mit Wurzelanlauf, vier bis sechs aufsteigende Leitäste, darunter Gabeln und Seitenäste,
// an den Spitzen feines Reisig als gekreuzte Karten. Am Fuß ein gusseiserner Baumrost und
// ein Schutzgitter gegen Droschkenräder und Pferdebisse.

const UP = new THREE.Vector3(0, 1, 0);
const SIDE = new THREE.Vector3(1, 0, 0);

// Ast als Kegelstumpf von start in Richtung dir. Die Rinde wird nach Umfang und Länge gekachelt,
// damit dünne Zweige feinere Risse tragen als der Stamm.
function limb(start, dir, len, rb, rt) {
  const seg = rb > 0.1 ? 9 : rb > 0.035 ? 5 : 3;
  const g = new THREE.CylinderGeometry(rt, rb, len, seg, 1, rb < 0.06);
  const uv = g.attributes.uv;
  const ru = Math.max(1, Math.round((2 * Math.PI * rb) / 0.4));
  for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * ru, (uv.getY(k) * len) / 0.9);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir));
  g.translate(start.x, start.y, start.z);
  return g;
}

// dir um angle gekippt, in einer zufälligen Ebene durch dir.
function turn(dir, angle, r) {
  const axis = new THREE.Vector3().crossVectors(dir, Math.abs(dir.y) > 0.95 ? SIDE : UP).normalize();
  axis.applyAxisAngle(dir, r() * Math.PI * 2);
  return dir.clone().applyAxisAngle(axis, angle);
}

// Linden streben nach oben; ganz außen hängen die Zweige nur wenig.
function rise(v) {
  v.y = Math.max(-0.2, v.y * 0.85 + 0.14);
  return v.normalize();
}

function grow(out, s, dir, len, rad, depth, r) {
  const bent = rise(turn(dir, 0.12 + r() * 0.18, r));
  const mid = s.clone().addScaledVector(dir, len * 0.5);
  const end = mid.clone().addScaledVector(bent, len * 0.5);
  const thin = Math.max(0.012, rad * 0.7);
  out.wood.push(limb(s, dir, len * 0.5, rad, (rad + thin) / 2));
  out.wood.push(limb(mid, bent, len * 0.5, (rad + thin) / 2, thin));
  if (depth === 0) {
    out.tips.push([s.clone().addScaledVector(dir, len * 0.3), bent, len]);
    return;
  }
  // Gabel am Ende, dazu zwei Seitenäste unterwegs.
  for (let i = 0; i < 2; i++) grow(out, end, rise(turn(bent, 0.32 + r() * 0.28, r)), len * (0.64 + r() * 0.12), rad * 0.64, depth - 1, r);
  grow(out, s.clone().addScaledVector(dir, len * 0.36), rise(turn(dir, 0.75 + r() * 0.35, r)), len * (0.5 + r() * 0.15), rad * 0.5, depth - 1, r);
  grow(out, mid.clone().addScaledVector(bent, len * 0.22), rise(turn(bent, 0.75 + r() * 0.35, r)), len * (0.5 + r() * 0.15), rad * 0.5, depth - 1, r);
}

// Umriss des Reisigs in der Textur als Achteck (u, v), das alle gemalten Bildpunkte mit etwas Rand
// umschließt. Die Karten bestehen nur aus dieser Fläche: Das Reisig füllt kaum 14 % des Quadrats,
// und jeder leere Bildpunkt kostete trotzdem die ganze Lichtrechnung. Rund 1 100 Karten je Baum
// überdecken sich vielfach; mit vollen Quadraten kosteten die sechs Linden am Markt 7 ms GPU-Zeit.
function twigOutline(texture) {
  const img = texture.image;
  const S = img.width;
  const data = img.getContext('2d').getImageData(0, 0, S, S).data;
  const dirs = Array.from({ length: 8 }, (_, k) => [Math.cos((k * Math.PI) / 4), Math.sin((k * Math.PI) / 4)]);
  const reach = dirs.map(() => -Infinity);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (data[(y * S + x) * 4 + 3] === 0) continue;
      // Bildpunktmitte in u, v; die Leinwand steht auf dem Kopf (flipY).
      const u = (x + 0.5) / S;
      const v = 1 - (y + 0.5) / S;
      dirs.forEach(([dx, dy], k) => (reach[k] = Math.max(reach[k], dx * u + dy * v)));
    }
  }
  // Rand: drei Bildpunkte, weil die gröberen Mipmap-Stufen den Strich etwas verbreitern.
  const d = reach.map((v) => v + 3 / S);
  const out = [];
  for (let k = 0; k < 8; k++) {
    const [ax, ay] = dirs[k];
    const [bx, by] = dirs[(k + 1) % 8];
    const da = d[k];
    const db = d[(k + 1) % 8];
    const det = ax * by - ay * bx;
    const u = (da * by - ay * db) / det;
    const v = (ax * db - da * bx) / det;
    out.push([Math.min(1, Math.max(0, u)), Math.min(1, Math.max(0, v))]);
  }
  return out;
}

// Reisigkarten: zwei gekreuzte Flächen, unten am Zweig, nach außen gerichtet, im Umriss outline.
function tipCards(tips, outline, r) {
  const n = outline.length;
  const count = tips.length * 2;
  const pos = new Float32Array(count * n * 3);
  const nrm = new Float32Array(count * n * 3);
  const uvs = new Float32Array(count * n * 2);
  const index = [];
  const m = new THREE.Matrix4();
  const rot = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const nn = new THREE.Vector3();
  let c = 0;
  for (const [base, dir, len] of tips) {
    const size = 0.9 + len * 0.55 + r() * 0.3;
    const roll = r() * Math.PI;
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
    for (const a of [roll, roll + Math.PI / 2]) {
      // Wie früher PlaneGeometry(size, size), um 0,48 size hochgeschoben, um a gedreht, nach dir gekippt.
      m.makeRotationFromQuaternion(q).multiply(rot.makeRotationY(a)).setPosition(base);
      nn.set(0, 0, 1).transformDirection(m);
      const first = c * n;
      outline.forEach(([u, v], i) => {
        p.set((u - 0.5) * size, (v - 0.02) * size, 0).applyMatrix4(m);
        p.toArray(pos, (first + i) * 3);
        nn.toArray(nrm, (first + i) * 3);
        uvs[(first + i) * 2] = u;
        uvs[(first + i) * 2 + 1] = v;
      });
      for (let i = 1; i < n - 1; i++) index.push(first, first + i, first + i + 1);
      c++;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  g.setIndex(index);
  return g;
}

// Baumrost und Schutzgitter aus Gusseisen.
function guard(x, z) {
  const parts = [];
  for (const [w, d, ox, oz] of [[1.6, 0.07, 0, 0.765], [1.6, 0.07, 0, -0.765], [0.07, 1.6, 0.765, 0], [0.07, 1.6, -0.765, 0]]) {
    parts.push(new THREE.BoxGeometry(w, 0.04, d).translate(x + ox, 0.02, z + oz));
  }
  for (const rr of [0.42, 0.56, 0.7]) parts.push(new THREE.TorusGeometry(rr, 0.022, 4, 28).rotateX(Math.PI / 2).translate(x, 0.025, z));
  for (let k = 0; k < 8; k++) parts.push(new THREE.BoxGeometry(0.03, 0.03, 0.5).translate(0, 0.025, 0.52).rotateY((k * Math.PI) / 4).translate(x, 0, z));
  // Gitterkorb: zwölf Stäbe, oben leicht ausgestellt, drei Ringe, Spitzen oben.
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const p0 = new THREE.Vector3(x + Math.sin(a) * 0.38, 0.03, z + Math.cos(a) * 0.38);
    const p1 = new THREE.Vector3(x + Math.sin(a) * 0.44, 1.72, z + Math.cos(a) * 0.44);
    const d = p1.clone().sub(p0);
    const len = d.length();
    parts.push(limb(p0, d.normalize(), len, 0.013, 0.013));
    parts.push(new THREE.ConeGeometry(0.03, 0.09, 4).translate(p1.x, p1.y + 0.04, p1.z));
  }
  for (const [y, rr] of [[0.32, 0.385], [1.05, 0.412], [1.66, 0.437]]) parts.push(new THREE.TorusGeometry(rr, 0.016, 4, 32).rotateX(Math.PI / 2).translate(x, y, z));
  return merge(parts);
}

export function buildTrees(loc, spots, ironMat) {
  const { scene } = loc;
  const barkTex = bark();
  const woodMat = std({ map: barkTex, color: 0x9c9890, roughness: 0.8 });
  // Das Reisig wird ausgestanzt statt überblendet: Es schreibt die Tiefe, sodass verdeckte Karten
  // gar nicht erst gerechnet werden, und die Kanten glättet Alpha-to-Coverage im 4×-MSAA-Puffer.
  // Lambert statt PBR, denn nasses Reisig glänzt bei Rauheit 0,9 ohnehin nicht. Zusammen mit den
  // zugeschnittenen Karten (twigOutline) halbiert das die Kosten der Linden ungefähr.
  const twigTex = twigs();
  const outline = twigOutline(twigTex);
  const twigMat = matte({ map: twigTex, color: 0x4a3f36, alphaTest: 0.25, alphaToCoverage: true, side: THREE.DoubleSide });
  const irons = [];
  spots.forEach(([x, z], i) => {
    const r = rng(4100 + i * 17);
    const out = { wood: [], tips: [] };
    const base = new THREE.Vector3(x, 0, z);
    const H = 3.3 + r() * 0.7;
    const lean = new THREE.Vector3((r() - 0.5) * 0.1, 1, (r() - 0.5) * 0.1).normalize();
    out.wood.push(limb(base, UP, 0.55, 0.42, 0.25));
    out.wood.push(limb(base, lean, H + 0.3, 0.26, 0.19));
    // Leitäste gestaffelt am oberen Stammende, dazu der Mitteltrieb.
    const n = 5 + Math.floor(r() * 2);
    const az0 = r() * Math.PI * 2;
    for (let k = 0; k < n; k++) {
      const az = az0 + (k / n) * Math.PI * 2 + (r() - 0.5) * 0.5;
      const elev = 0.5 + r() * 0.3;
      const dir = new THREE.Vector3(Math.sin(elev) * Math.sin(az), Math.cos(elev), Math.sin(elev) * Math.cos(az));
      const start = base.clone().addScaledVector(lean, H * (0.78 + (0.22 * k) / n));
      grow(out, start, dir, 3.0 + r() * 0.8, 0.14, 3, r);
    }
    grow(out, base.clone().addScaledVector(lean, H), lean, 3.2, 0.15, 3, r);
    addMesh(scene, merge(out.wood), woodMat);
    // Ein Mesh je Baum, damit Bäume außer Sicht gar nicht erst gezeichnet werden.
    addMesh(scene, tipCards(out.tips, outline, r), twigMat);
    irons.push(guard(x, z));
    loc.collide(x - 0.5, x + 0.5, z - 0.5, z + 0.5);
  });
  addMesh(scene, merge(irons), ironMat);
}
