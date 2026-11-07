import * as THREE from 'three';
import { Bag, cyl, merge, std } from '../kit.js';
import { softDisc } from '../textures.js';

// Lichtfleck einer Laterne auf dem Boden. Er wird nicht als helle Scheibe daraufgelegt, sondern
// verstärkt, was schon da ist (Ergebnis = Boden × (1 + Licht)): Die Steine leuchten auf, die
// Fugen und Pfützen bleiben dunkel, und im Dunst verblasst er mit dem Pflaster. POOL_GAIN gleicht
// aus, dass der Boden ohne Laterne nur vom schwachen Himmelslicht getroffen wird.
const POOL_GAIN = 36;
export function lightPool(color, opacity) {
  return new THREE.MeshBasicMaterial({
    map: softDisc('lampPool', 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0.33)'),
    // Etwas entsättigt: Das Licht multipliziert sich mit dem schon warmen Pflaster.
    color: new THREE.Color(color).lerp(new THREE.Color(1, 1, 1), 0.35).multiplyScalar(POOL_GAIN),
    transparent: true,
    opacity,
    depthWrite: false,
    premultipliedAlpha: true,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.DstColorFactor,
    blendDst: THREE.OneFactor,
  });
}

export function buildLamps(loc, positions, ironMat) {
  const { scene } = loc;
  const post = new Bag();
  post.add(cyl(0.13, 0.17, 0.5, 0, 0.25, 0, 10), 0x0d100f);
  post.add(cyl(0.06, 0.1, 3.1, 0, 1.95, 0, 10), 0x0d100f);
  post.add(cyl(0.1, 0.07, 0.1, 0, 2.6, 0, 10), 0x0d100f);
  post.box(0x0d100f, 0.65, 0.035, 0.035, 0, 3.15, 0);
  post.add(cyl(0.02, 0.2, 0.26, 0, 4.2, 0, 6), 0x0d100f);
  post.add(cyl(0.2, 0.13, 0.03, 0, 3.53, 0, 6), 0x0d100f);
  post.add(cyl(0.015, 0.015, 0.1, 0, 4.36, 0, 6), 0x0d100f);
  const glass = cyl(0.2, 0.13, 0.55, 0, 3.8, 0, 6);
  const postMesh = new THREE.InstancedMesh(post.build(), std({ vertexColors: true, roughness: 0.5, metalness: 0.5 }), positions.length);
  const glassMesh = new THREE.InstancedMesh(glass, new THREE.MeshBasicMaterial({ color: new THREE.Color(4.2, 2.6, 1.1) }), positions.length);
  const m = new THREE.Matrix4();
  const glowMat = new THREE.SpriteMaterial({ map: softDisc('lampGlow'), color: 0xffa858, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  const poolGeo = new THREE.PlaneGeometry(1, 1);
  poolGeo.rotateX(-Math.PI / 2);
  const poolMat = lightPool(0xc77b38, 0.33);
  const pools = new THREE.InstancedMesh(poolGeo, poolMat, positions.length);
  const glows = [];
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  positions.forEach(([x, z, broken], i) => {
    const y = loc.heightAt(x, z);
    m.makeTranslation(x, y, z);
    postMesh.setMatrixAt(i, m);
    loc.collide(x - 0.14, x + 0.14, z - 0.14, z + 0.14);
    if (broken) {
      // Kaputt: kein Licht, kein Schein, das Gehäuse dunkel, eine Scheibe eingeschlagen.
      glassMesh.setMatrixAt(i, zero);
      pools.setMatrixAt(i, zero);
      buildBrokenLamp(scene, x, y, z);
      return;
    }
    glassMesh.setMatrixAt(i, m);
    m.makeScale(13, 1, 13).setPosition(x, y + 0.03, z);
    pools.setMatrixAt(i, m);
    const s = new THREE.Sprite(glowMat.clone());
    s.position.set(x, y + 3.8, z);
    s.scale.setScalar(3.6);
    scene.add(s);
    glows.push({ s, x, z, y, seed: i * 1.7 });
  });
  postMesh.frustumCulled = glassMesh.frustumCulled = pools.frustumCulled = false;
  scene.add(postMesh, glassMesh, pools);

  // Nur die nächsten Laternen werfen echtes Licht. Die Anzahl bleibt fest, damit nichts neu kompiliert.
  const lights = [];
  for (let i = 0; i < 6; i++) {
    const l = new THREE.PointLight(0xffa35a, 0, 22, 1.7);
    scene.add(l);
    lights.push(l);
  }
  const ranked = glows.map((g) => ({ g, d: 0 }));
  let timer = 0;
  loc.onUpdate((dt, t, { camera }) => {
    timer -= dt;
    if (timer < 0) {
      timer = 0.25;
      for (const e of ranked) {
        const dx = e.g.x - camera.position.x;
        const dz = e.g.z - camera.position.z;
        e.d = dx * dx + dz * dz;
      }
      ranked.sort((a, b) => a.d - b.d);
    }
    lights.forEach((l, i) => {
      const { g } = ranked[i];
      l.position.set(g.x, g.y + 3.7, g.z);
      const flicker = 0.93 + 0.07 * Math.sin(t * 9 + g.seed) * Math.sin(t * 3.7 + g.seed * 2);
      // Die letzte Lampe der Rangliste blendet aus, damit das Umspringen nicht auffällt.
      const fade = i < 4 ? 1 : 0.6;
      l.intensity = 32 * flicker * fade;
    });
    for (const g of glows) {
      g.s.material.opacity = 0.5 + 0.06 * Math.sin(t * 6 + g.seed);
    }
  });
}

// Gehäuse einer kaputten Laterne: fünf blinde, verrußte Scheiben, die sechste fehlt.
// Ihre Scherben liegen noch auf dem Gehweg.
function buildBrokenLamp(scene, x, y, z) {
  const panes = [];
  const shards = [];
  for (let k = 0; k < 6; k++) {
    if (k === 2) continue;
    const a = (k + 0.5) * (Math.PI / 3);
    // Trapez zwischen den Ringen r = 0,2 oben und 0,13 unten, Höhe 0,55.
    const g = new THREE.CylinderGeometry(0.2, 0.13, 0.55, 1, 1, true, a - Math.PI / 6, Math.PI / 3);
    panes.push(g.translate(x, y + 3.8, z));
  }
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 9; k++) {
    const s = new THREE.Shape();
    const w = 0.03 + rand() * 0.05;
    s.moveTo(0, 0);
    s.lineTo(w, rand() * 0.02);
    s.lineTo(rand() * w, w * (0.8 + rand()));
    s.closePath();
    const g = new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2).rotateY(rand() * Math.PI * 2);
    const d = 0.15 + rand() * 0.55;
    const a = rand() * Math.PI * 2;
    shards.push(g.translate(x + Math.cos(a) * d, y + 0.005, z + Math.sin(a) * d));
  }
  const glass = std({ color: 0x1a1c1e, roughness: 0.15, metalness: 0.6, side: THREE.DoubleSide });
  scene.add(new THREE.Mesh(merge([...panes, ...shards]), glass));
}
