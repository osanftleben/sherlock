import * as THREE from 'three';
import { addMesh, box, merge, std } from '../kit.js';
import { hearing } from './traffic.js';

// Fallrohre aus Zinkblech: an jedem Haus eines, vom Kasten unter dem Kranzgesims bis kurz über
// den Gehweg, dort ein Knie nach vorn. Aus dem Auslauf rinnt ein dünner Strahl, und eine nasse
// Spur zieht sich über die Platten bis zur Bordkante. Das Plätschern des nächsten Auslaufs
// hört man (loc.gutter, audio.js).
// pipes: [{ base (Matrix4 des Hauses), x (lokal längs der Fassade), H (Traufhöhe), walk (Gehwegtiefe oder 0) }]
const R = 0.055;
const Z = 0.14;

const up = new THREE.Vector3(0, 1, 0);
function rod(a, b, r, seg = 8) {
  const d = new THREE.Vector3().subVectors(b, a);
  const g = new THREE.CylinderGeometry(r, r, d.length(), seg, 1, true);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

// Alphamaske der nassen Spur: ein mäandernder, an den Rändern weicher Streifen.
function rivuletMask() {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, 32, 256);
  g.filter = 'blur(2px)';
  g.strokeStyle = '#fff';
  g.lineCap = 'round';
  for (const [w, a] of [[20, 0.45], [11, 1]]) {
    g.globalAlpha = a;
    g.lineWidth = w;
    g.beginPath();
    for (let y = 0; y <= 256; y += 8) {
      const x = 16 + Math.sin(y * 0.045) * 3 + Math.sin(y * 0.13 + 1) * 1.5;
      if (y === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

export function buildDownpipes(loc, pipes) {
  const { scene } = loc;
  const metal = [];
  const wet = [];
  const pours = [];
  const outlets = [];
  for (const { base, x, H, walk } of pipes) {
    const y0 = walk ? 0.13 : 0;
    const local = [];
    // Kasten unter der Rinne, das Rohr, Schellen alle 1,8 m, unten das Knie.
    local.push(box(0.2, 0.24, 0.16, x, H - 0.66, Z));
    const top = new THREE.Vector3(x, H - 0.78, Z);
    const knee = new THREE.Vector3(x, y0 + 0.42, Z);
    const spout = new THREE.Vector3(x, y0 + 0.2, Z + 0.24);
    local.push(rod(top, knee, R));
    local.push(rod(knee, spout, R));
    local.push(new THREE.SphereGeometry(R, 8, 6).translate(knee.x, knee.y, knee.z));
    for (let y = y0 + 1.2; y < H - 1; y += 1.8) local.push(box(0.15, 0.035, 0.13, x, y, Z - 0.06), box(0.04, 0.05, 0.08, x, y, Z - 0.1));
    for (const g of local) metal.push(g.applyMatrix4(base));
    if (!walk) continue;
    // Strahl: zwei gekreuzte schmale Flächen vom Auslauf bis auf die Platten.
    const h = spout.y - y0;
    for (const rot of [0, Math.PI / 2]) {
      const p = new THREE.PlaneGeometry(0.035, h).rotateY(rot).translate(spout.x, y0 + h / 2, spout.z + 0.02);
      pours.push(p.applyMatrix4(base));
    }
    // Nasse Spur bis zur Bordkante.
    const len = walk - 0.45;
    const s = new THREE.PlaneGeometry(0.34, len).rotateX(-Math.PI / 2).translate(x, y0 + 0.004, Z + 0.3 + len / 2);
    wet.push(s.applyMatrix4(base));
    outlets.push(spout.clone().applyMatrix4(base));
  }
  if (!metal.length) return;
  addMesh(scene, merge(metal), std({ color: 0x3e4144, roughness: 0.42, metalness: 0.55 }));
  if (wet.length) {
    const m = addMesh(scene, merge(wet), std({
      color: 0x141312, roughness: 0.05, metalness: 0, alphaMap: rivuletMask(), transparent: true, opacity: 0.75,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }));
    m.renderOrder = 1;
  }
  // Fließendes Wasser: helle Streifen laufen nach unten, aus der Ferne ausgeblendet.
  const pourMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { time: { value: 0 } },
    vertexShader: `
      varying vec2 vUv; varying float vNear;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNear = 1.0 - smoothstep(8.0, 25.0, length(mv.xyz));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float time; varying vec2 vUv; varying float vNear;
      void main() {
        float across = 1.0 - abs(vUv.x - 0.5) * 2.0;
        float streak = 0.55 + 0.45 * sin(vUv.y * 40.0 + time * 26.0 + sin(vUv.x * 9.0) * 2.0);
        gl_FragColor = vec4(vec3(0.62, 0.66, 0.7), across * streak * 0.4 * vNear);
      }`,
  });
  if (pours.length) addMesh(scene, merge(pours), pourMat);

  loc.gutter = { vol: 0, pan: 0 };
  loc.onUpdate((dt, t, { camera }) => {
    pourMat.uniforms.time.value = t % 100;
    let best = null;
    let bd = Infinity;
    for (const o of outlets) {
      const d = (o.x - camera.position.x) ** 2 + (o.z - camera.position.z) ** 2;
      if (d < bd) {
        bd = d;
        best = o;
      }
    }
    Object.assign(loc.gutter, best ? hearing(camera, best.x, best.z, 12) : { vol: 0, pan: 0 });
  });
}
