import * as THREE from 'three';
import { reportError } from '../../core/errors.js';
import { Bag, cyl, merge, std } from '../kit.js';
import { softDisc } from '../textures.js';
import { MIRROR_LAYER } from './ripples.js';

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

// --- Schatten der Laternen -----------------------------------------------------------------
// Draußen gibt es keine Schattenkarten (view.js), das Licht der Laternen ginge durch alles hindurch:
// Hinter dem Kiosk glänzte das nasse Pflaster, als stünde er nicht da. Hohe Dinge bei Laternen
// melden sich deshalb als senkrechte Zylinder an, und das Pflaster (wetStreet in index.js) und die
// Lichtflecken prüfen für jede Laterne, ob der Weg zu ihr hindurchführt.
export const SHADE_MAX = 10;
// Höhe der Flamme über dem Boden und halbe Breite dessen, was in der Laterne leuchtet (Flamme und
// das von ihr erhellte Glas); daraus folgt, wie weich die Schattenränder werden.
const FLAME = 3.7;
const FLAME_R = 0.2;
// Uniforms der Schattenwerfer eines Ortes; alle Shader mit lampShade teilen sie sich.
export function shadeUniforms(loc) {
  return (loc.shadeUniforms ??= {
    shadeCasters: { value: Array.from({ length: SHADE_MAX }, () => new THREE.Vector4()) },
    shadeFloors: { value: new Array(SHADE_MAX).fill(0) },
  });
}
// Ein Zylinder als Vector4 (x, z, Radius, Oberkante), dazu seine Unterkante: Liegt sie über 0,
// schwebt er wie die Schale des Brunnens. Wer sich bewegt, setzt den Vector4 selbst neu; Radius 0
// heißt: gerade nicht da.
export function addShadeCaster(loc, x = 0, z = 0, r = 0, h = 0, floor = 0) {
  const { shadeCasters, shadeFloors } = shadeUniforms(loc);
  const i = loc.shadeCount ?? 0;
  if (i >= SHADE_MAX) throw new Error(`Mehr als ${SHADE_MAX} Schattenwerfer`);
  loc.shadeCount = i + 1;
  shadeFloors.value[i] = floor;
  return shadeCasters.value[i].set(x, z, r, h);
}
// GLSL: lampShade(p, lamp) sagt, wie viel vom Licht der Laterne bei lamp am Punkt p ankommt (beides
// in Weltkoordinaten); lampWorld holt die Lage eines Punktlichts aus der Kamerasicht zurück.
export const SHADE_GLSL = `
uniform vec4 shadeCasters[${SHADE_MAX}];
uniform float shadeFloors[${SHADE_MAX}];
vec3 lampWorld(vec3 viewPos) {
  return transpose(mat3(viewMatrix)) * (viewPos - viewMatrix[3].xyz);
}
float lampShade(vec3 p, vec3 lamp) {
  vec2 d = lamp.xz - p.xz;
  float inv = inversesqrt(max(dot(d, d), 1e-4));
  float inv2 = inv * inv;
  float lit = 1.0;
  for (int k = 0; k < ${SHADE_MAX}; k++) {
    vec4 c = shadeCasters[k];
    if (c.z <= 0.0) continue;
    // Wo der Weg zur Laterne der Achse am nächsten kommt: 0 am Punkt, 1 an der Laterne. Steht der
    // Zylinder hinter dem Punkt (der Punkt liegt auf seiner beleuchteten Seite) oder hinter der
    // Laterne, ist der Weg frei.
    float t = dot(c.xy - p.xz, d) * inv2;
    if (t <= 0.0 || t >= 1.0) continue;
    // Halbschatten: Was in der Laterne leuchtet, hat eine Breite. Durch einen Rand nahe am Punkt
    // sieht man davon wenig (harter Schatten), durch einen nahe der Laterne viel (weicher).
    float w = ${FLAME_R.toFixed(2)} * t + 0.01;
    vec2 off = p.xz + d * t - c.xy;
    float dd = dot(off, off);
    if (dd >= (c.z + w) * (c.z + w)) continue;
    // Zur Laterne hin steigt der Weg an: Er tritt am tiefsten Punkt in den Zylinder ein und am
    // höchsten wieder aus. Verdeckt ist das Licht, wenn er unter der Oberkante eintritt und über
    // der Unterkante austritt.
    float span = sqrt(max(c.z * c.z - dd, 0.0)) * inv;
    float tIn = max(0.0, t - span);
    float tOut = min(1.0, t + span);
    float yIn = mix(p.y, lamp.y, tIn);
    float yOut = mix(p.y, lamp.y, tOut);
    float wIn = ${FLAME_R.toFixed(2)} * tIn + 0.01;
    float wOut = ${FLAME_R.toFixed(2)} * tOut + 0.01;
    float under = shadeFloors[k];
    float hit = (1.0 - smoothstep(c.z - w, c.z + w, sqrt(dd)))
      * (1.0 - smoothstep(c.w - wIn, c.w + wIn, yIn))
      * max(step(under, 0.0), smoothstep(under - wOut, under + wOut, yOut));
    lit *= 1.0 - hit;
  }
  return lit;
}`;

// Beleuchtungsteil von three.js mit Schatten für die Punktlichter: Die Farbe jedes Lichts wird
// gleich nach getPointLightInfo mit lampShade verrechnet. p: GLSL-Ausdruck für den Punkt (Welt).
const POINT_HOOK = 'getPointLightInfo( pointLight, geometryPosition, directLight );';
export function shadedLightsChunk(p) {
  const chunk = THREE.ShaderChunk.lights_fragment_begin;
  if (!chunk.includes(POINT_HOOK)) reportError('Laternenschatten', new Error('Beleuchtungsteil von three.js hat sich geändert, die Laternen werfen keine Schatten'));
  return chunk.replace(POINT_HOOK, `${POINT_HOOK}\n\t\tif ( directLight.visible ) directLight.color *= lampShade( ${p}, lampWorld( pointLight.position ) );`);
}

// Lichtfleck der Laternen mit Schatten: Wo der Weg zur Flamme durch einen Schattenwerfer führt,
// hellt der Fleck nichts auf.
function shadedPool(material, loc) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shadeUniforms(loc));
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPoolW;\nvarying vec3 vLampW;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vPoolW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        vLampW = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz + vec3(0.0, ${(FLAME - 0.03).toFixed(2)}, 0.0);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vPoolW;\nvarying vec3 vLampW;\n${SHADE_GLSL}`)
      .replace('#include <premultiplied_alpha_fragment>', 'gl_FragColor.rgb *= lampShade(vPoolW, vLampW);\n#include <premultiplied_alpha_fragment>');
  };
  material.customProgramCacheKey = () => 'shadedLampPool';
  return material;
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
  const poolMat = shadedPool(lightPool(0xc77b38, 0.33), loc);
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
    s.layers.enable(MIRROR_LAYER);
    scene.add(s);
    glows.push({ s, x, z, y, seed: i * 1.7 });
  });
  postMesh.frustumCulled = glassMesh.frustumCulled = pools.frustumCulled = false;
  postMesh.layers.enable(MIRROR_LAYER);
  glassMesh.layers.enable(MIRROR_LAYER);
  scene.add(postMesh, glassMesh, pools);

  // Nur die nächsten Laternen werfen echtes Licht. Die Anzahl bleibt fest, damit nichts neu kompiliert.
  const lights = [];
  for (let i = 0; i < 6; i++) {
    const l = new THREE.PointLight(0xffa35a, 0, 22, 1.7);
    scene.add(l);
    lights.push(l);
  }
  // Dazu Laternen anderer Bauteile (loc.extraLamps: x, y, z der Flamme, intensity, weight). weight < 1
  // rückt eine Laterne in der Rangliste vor, etwa die im Durchgang unter dem Viadukt, die man von
  // weiter weg sieht als ihre Entfernung vermuten lässt.
  const ranked = [
    ...glows.map((g) => ({ x: g.x, z: g.z, ly: g.y + FLAME, seed: g.seed, intensity: 32, weight: 1, d: 0 })),
    ...(loc.extraLamps ?? []).map((e, i) => ({ x: e.x, z: e.z, ly: e.y, seed: 50 + i * 1.3, intensity: e.intensity, weight: e.weight, d: 0 })),
  ];
  let timer = 0;
  loc.onUpdate((dt, t, { camera }) => {
    timer -= dt;
    if (timer < 0) {
      timer = 0.25;
      for (const e of ranked) {
        const dx = e.x - camera.position.x;
        const dz = e.z - camera.position.z;
        e.d = (dx * dx + dz * dz) * e.weight;
      }
      ranked.sort((a, b) => a.d - b.d);
    }
    lights.forEach((l, i) => {
      const e = ranked[i];
      l.position.set(e.x, e.ly, e.z);
      const flicker = 0.93 + 0.07 * Math.sin(t * 9 + e.seed) * Math.sin(t * 3.7 + e.seed * 2);
      // Die letzte Lampe der Rangliste blendet aus, damit das Umspringen nicht auffällt.
      const fade = i < 4 ? 1 : 0.6;
      l.intensity = e.intensity * flicker * fade;
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

// Wandlaterne an einem eisernen Arm mit Strebe: Gehäuse mit vier Scheiben, Eckstreben, Boden
// und spitzem Dach. base ist der Punkt an der Wand in Höhe des Arms, out die waagrechte
// Richtung von der Wand weg, reach der Abstand der Laterne von der Wand. Das Eisen kommt in die
// Bag iron, das Glas als Geometrie in die Liste glass (Material setzt der Aufrufer, siehe
// LANTERN_GLASS). Wer eine Liste wash mitgibt, bekommt dort den Lichtschein auf der Wand hinter
// der Laterne (Material: lampWash). Zurück kommt die Mitte des Glases, etwa für Lichthof und
// Lichtfleck.
export const LANTERN_GLASS = new THREE.Color(1.5, 0.85, 0.35);
export const LANTERN_IRON = 0x161616;
export function wallLantern(iron, glass, base, out, reach = 0.52, wash = null) {
  const m = new THREE.Matrix4().makeRotationY(Math.atan2(out.x, out.z)).setPosition(base);
  const put = (geo) => geo.applyMatrix4(m);
  const part = (w, h, d, x, y, z) => iron.add(put(new THREE.BoxGeometry(w, h, d).translate(x, y, z)), LANTERN_IRON);
  // Lokal: z von der Wand weg, y = 0 in Höhe des Arms.
  part(0.035, 0.035, reach + 0.04, 0, 0, reach / 2);
  const brace = new THREE.BoxGeometry(0.025, 0.025, 0.5).rotateX(-Math.atan2(0.32, 0.36)).translate(0, -0.16, 0.2);
  iron.add(put(brace), LANTERN_IRON);
  part(0.012, 0.08, 0.012, 0, -0.06, reach);
  for (const dx of [-0.09, 0.09]) {
    for (const dz of [-0.09, 0.09]) part(0.022, 0.3, 0.022, dx, -0.32, reach + dz);
  }
  part(0.22, 0.035, 0.22, 0, -0.48, reach);
  part(0.08, 0.05, 0.08, 0, -0.52, reach);
  iron.add(put(new THREE.CylinderGeometry(0.02, 0.17, 0.12, 4).rotateY(Math.PI / 4).translate(0, -0.11, reach)), LANTERN_IRON);
  iron.add(put(new THREE.SphereGeometry(0.025, 6, 4).translate(0, -0.03, reach)), LANTERN_IRON);
  glass.push(put(new THREE.BoxGeometry(0.17, 0.28, 0.17).translate(0, -0.32, reach)));
  if (wash) wash.push(put(new THREE.PlaneGeometry(3.4, 3.4).translate(0, -0.36, 0.03)));
  return new THREE.Vector3(0, -0.32, reach).applyMatrix4(m);
}

// Lichtschein einer Wandlaterne auf der Mauer dahinter: wie lightPool, nur schwächer, weil die
// Wand schräg vom Licht getroffen wird und Putz und Ziegel ohnehin etwas Himmelslicht abbekommen.
export function lampWash() {
  // Steiler als der Fleck am Boden: hell gleich hinter der Laterne, nach außen rasch schwächer,
  // damit kein gleichmäßiger Kreis auf der Mauer steht.
  const mat = lightPool(0xd09050, 0.3);
  mat.map = softDisc('lampWash', 'rgba(255,255,255,1)', 'rgba(255,255,255,0.12)');
  return mat;
}
