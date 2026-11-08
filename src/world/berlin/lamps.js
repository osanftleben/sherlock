import * as THREE from 'three';
import { reportError } from '../../core/errors.js';
import { Bag, cyl, glowSprites, merge, std } from '../kit.js';
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
// Die ersten Plätze nimmt die Pferdebahn (addShadeCaster), den Rest teilen sich Leute, Pferde und
// Droschken nahe der Kamera (shadeSlots, groundshade.js). Was nie seinen Platz verlässt (Kiosk,
// Säulen, Brunnen), meldet sich mit addStillCaster an und wird beim Laden je Laterne in eine Textur
// gerechnet (bakeStillShade): Das kostete in jedem Bild 0,7–1,2 ms, eine Texturprobe fast nichts.
export const SHADE_MAX = 15;
// So viele Laternen leuchten wirklich, als Punktlichter (die nächsten an der Kamera); die übrigen
// haben nur Schein und Lichtfleck.
const LIT_LAMPS = 6;
// Ein Werfer zählt für eine Laterne, wenn er ihr so nahe steht, und ein Punkt wird nur bis SHADE_FAR
// von ihr geprüft (ab SHADE_FAR0 blasst der Schatten aus). Weiter weg ist ihr Licht so schwach, dass
// man keinen Schatten mehr sähe; das spart den größten Teil der Rechnung.
const SHADE_REACH = 10;
const SHADE_FAR0 = 11;
const SHADE_FAR = 14;
// Höhe der Flamme über dem Boden und halbe Breite dessen, was in der Laterne leuchtet (Flamme und
// das von ihr erhellte Glas); daraus folgt, wie weich die Schattenränder werden.
const FLAME = 3.7;
const FLAME_R = 0.2;
// Rund um jede leuchtende Laterne so viele Richtungen (Tortenstücke): Ein Werfer kann nur dorthin
// Schatten werfen, wo er von der Laterne aus steht. Ein Punkt prüft deshalb nur die Werfer seines
// Stücks statt aller bei der Laterne. Im Gedränge am Platz waren das sonst bis zu zwölf Werfer je
// Laterne und Bildpunkt, 2,2 ms GPU-Zeit allein auf dem Pflaster.
const SECTORS = 16;
// Uniforms der Schattenwerfer eines Ortes; alle Shader mit lampShade teilen sie sich.
export function shadeUniforms(loc) {
  return (loc.shadeUniforms ??= {
    shadeCasters: { value: Array.from({ length: SHADE_MAX }, () => new THREE.Vector4()) },
    // Unterkante (0: steht auf dem Boden) und Stärke (1: hält das Licht ganz ab).
    shadeParams: { value: Array.from({ length: SHADE_MAX }, () => new THREE.Vector2(0, 1)) },
    // So viele Plätze sind belegt; dahinter rechnet lampShade nicht weiter.
    shadeCount: { value: 0 },
    // Bitmaske der festen Werfer, dazu je leuchtender Laterne x, z und die Bitmaske der Werfer in
    // ihrer Nähe (shadeSlots().use). Nur diese prüft lampShade; das spart die meiste Arbeit.
    // w: Schicht der Laterne in lampStill plus 1 (0: keine).
    shadeFixed: { value: 0 },
    shadeLamps: { value: Array.from({ length: LIT_LAMPS }, () => new THREE.Vector4(1e6, 1e6, 0, 0)) },
    // Je leuchtender Laterne und Richtung die Bitmaske der Werfer, deren Schatten dorthin fallen kann
    // (SECTORS Masken je Laterne, vier je ivec4).
    shadeSectors: { value: new Int32Array(LIT_LAMPS * SECTORS) },
    // Schatten der festen Werfer je Laterne auf dem Boden (bakeStillShade), STILL_TILE Meter im Quadrat
    // um die Laterne. Bis zum Backen eine helle Schicht.
    lampStill: { value: stillTexture(new Uint8Array([255]), 1, 1) },
  });
}

function stillTexture(data, size, layers) {
  const t = new THREE.DataArrayTexture(data, size, size, layers);
  t.format = THREE.RedFormat;
  t.type = THREE.UnsignedByteType;
  t.minFilter = size > 1 ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = size > 1;
  t.needsUpdate = true;
  return t;
}

// Fester Werfer (Zylinder wie bei addShadeCaster), der nie seinen Platz verlässt.
export function addStillCaster(loc, x, z, r, h, floor = 0) {
  (loc.stillCasters ??= []).push({ x, z, r, h, floor });
}

// Wie viel Licht einer Laterne (lx, ly, lz) am Punkt (px, py, pz) an einem Zylinder c vorbeikommt;
// dieselbe Rechnung wie lampShadeMasked im Shader, für einen Werfer der Stärke 1.
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
function stillLit(px, py, pz, lx, ly, lz, c) {
  const dx = lx - px;
  const dz = lz - pz;
  const inv = 1 / Math.sqrt(Math.max(dx * dx + dz * dz, 1e-4));
  const inv2 = inv * inv;
  const t = ((c.x - px) * dx + (c.z - pz) * dz) * inv2;
  if (t <= 0 || t >= 1) return 1;
  const w = FLAME_R * t + 0.01;
  const ox = px + dx * t - c.x;
  const oz = pz + dz * t - c.z;
  const dd = ox * ox + oz * oz;
  if (dd >= (c.r + w) * (c.r + w)) return 1;
  const span = Math.sqrt(Math.max(c.r * c.r - dd, 0)) * inv;
  const tIn = Math.max(0, t - span);
  const tOut = Math.min(1, t + span);
  const yIn = py + (ly - py) * tIn;
  const yOut = py + (ly - py) * tOut;
  const wIn = FLAME_R * tIn + 0.01;
  const wOut = FLAME_R * tOut + 0.01;
  const hit = (1 - smooth(c.r - w, c.r + w, Math.sqrt(dd)))
    * (1 - smooth(c.h - wIn, c.h + wIn, yIn))
    * (c.floor <= 0 ? 1 : smooth(c.floor - wOut, c.floor + wOut, yOut));
  return 1 - hit;
}

// Seitenlänge (m) und Auflösung einer Schicht von lampStill: so weit, wie lampShade prüft, und gut
// 5 cm je Texel, damit der harte Schattenrand am Fuß eines Werfers nicht verschwimmt.
const STILL_TILE = 2 * SHADE_FAR;
const STILL_RES = 512;

// Rechnet für jede Laterne, in deren Reichweite feste Werfer stehen, deren Schatten auf den Boden
// (Höhe 0, der Platz ist eben) in eine Schicht von lampStill. Nach buildLamps und allen
// addStillCaster aufrufen. Gerechnet wird je Werfer nur das Rechteck, in das sein Schatten fallen
// kann: der Werfer selbst und der Keil hinter ihm, von der Laterne aus gesehen, bis SHADE_FAR.
export function bakeStillShade(loc) {
  const casters = loc.stillCasters ?? [];
  // Straßenlaternen und die Laternen anderer Bauteile (loc.extraLamps), die echtes Licht bekommen können.
  const spots = [...(loc.lampSpots ?? []), ...(loc.extraLamps ?? []).map((e) => ({ x: e.x, y: e.y, z: e.z, pool: -1 }))];
  const tiles = [];
  for (const s of spots) {
    // Ein Werfer, in dem die Lampe selbst steht (die Uhrensäule mit ihren Reflektoren), zählt nicht.
    const near = casters.filter((c) => {
      const d = Math.hypot(c.x - s.x, c.z - s.z);
      return d - c.r < SHADE_REACH && d > c.r;
    });
    if (near.length) tiles.push({ s, near });
  }
  if (!tiles.length) return;
  const N = STILL_RES;
  const cell = STILL_TILE / N;
  const data = new Uint8Array(N * N * tiles.length);
  const lit = new Float32Array(N * N);
  tiles.forEach(({ s, near }, layer) => {
    s.layer = layer + 1;
    lit.fill(1);
    const x0 = s.x - STILL_TILE / 2;
    const z0 = s.z - STILL_TILE / 2;
    for (const c of near) {
      const pad = c.r + 2 * FLAME_R + 0.05;
      const dist = Math.hypot(c.x - s.x, c.z - s.z);
      let minX = c.x - pad;
      let maxX = c.x + pad;
      let minZ = c.z - pad;
      let maxZ = c.z + pad;
      if (dist <= pad) {
        minX = minZ = -Infinity;
        maxX = maxZ = Infinity;
      } else {
        const a = Math.atan2(c.z - s.z, c.x - s.x);
        const h = Math.asin(pad / dist);
        for (const b of [a - h, a, a + h]) {
          const fx = s.x + Math.cos(b) * SHADE_FAR * 1.05;
          const fz = s.z + Math.sin(b) * SHADE_FAR * 1.05;
          minX = Math.min(minX, fx);
          maxX = Math.max(maxX, fx);
          minZ = Math.min(minZ, fz);
          maxZ = Math.max(maxZ, fz);
        }
      }
      const i0 = Math.max(0, Math.floor((minX - x0) / cell));
      const i1 = Math.min(N - 1, Math.ceil((maxX - x0) / cell));
      const j0 = Math.max(0, Math.floor((minZ - z0) / cell));
      const j1 = Math.min(N - 1, Math.ceil((maxZ - z0) / cell));
      for (let j = j0; j <= j1; j++) {
        const pz = z0 + (j + 0.5) * cell;
        for (let i = i0; i <= i1; i++) {
          const k = j * N + i;
          if (lit[k] > 0) lit[k] *= stillLit(x0 + (i + 0.5) * cell, 0, pz, s.x, s.y, s.z, c);
        }
      }
    }
    const base = layer * N * N;
    for (let k = 0; k < N * N; k++) data[base + k] = Math.round(lit[k] * 255);
  });
  const u = shadeUniforms(loc);
  u.lampStill.value.dispose();
  u.lampStill.value = stillTexture(data, N, tiles.length);
  // Lichtflecken: Schicht je Laterne über ein Attribut (Laternen anderer Bauteile haben keinen).
  const attr = loc.lampPoolLayers;
  if (attr) {
    spots.forEach((s) => s.pool >= 0 && attr.setX(s.pool, s.layer ?? 0));
    attr.needsUpdate = true;
  }
  loc.lampLayer = new Map(spots.filter((s) => s.layer).map((s) => [`${s.x},${s.z}`, s.layer]));
}
// Ein Zylinder als Vector4 (x, z, Radius, Oberkante), dazu seine Unterkante: Liegt sie über 0,
// schwebt er wie die Schale des Brunnens. Wer sich bewegt, setzt den Vector4 selbst neu; Radius 0
// heißt: gerade nicht da.
export function addShadeCaster(loc, x = 0, z = 0, r = 0, h = 0, floor = 0) {
  const u = shadeUniforms(loc);
  const i = loc.shadeCount ?? 0;
  if (i >= SHADE_MAX) throw new Error(`Mehr als ${SHADE_MAX} Schattenwerfer`);
  loc.shadeCount = u.shadeCount.value = i + 1;
  u.shadeFixed.value |= 1 << i;
  u.shadeParams.value[i].set(floor, 1);
  return u.shadeCasters.value[i].set(x, z, r, h);
}
// Alle noch freien Plätze für Werfer, die in jedem Bild andere sein können: set(j, ...) beschreibt
// den j-ten, use(n) sagt, wie viele davon gerade gelten, und ordnet alle Werfer den leuchtenden
// Laternen zu. Aufrufen, nachdem alle Werfer dieses Bildes stehen; danach nimmt addShadeCaster keine
// mehr an.
export function shadeSlots(loc) {
  const u = shadeUniforms(loc);
  const first = loc.shadeCount ?? 0;
  loc.shadeCount = SHADE_MAX;
  const casters = u.shadeCasters.value;
  return {
    size: SHADE_MAX - first,
    set(j, x, z, r, top, floor, strength) {
      casters[first + j].set(x, z, r, top);
      u.shadeParams.value[first + j].set(floor, strength);
    },
    use(n) {
      const count = (u.shadeCount.value = first + n);
      const lights = loc.lampLights ?? [];
      const sectors = u.shadeSectors.value;
      sectors.fill(0);
      for (let i = 0; i < lights.length; i++) {
        const { x, z } = lights[i].position;
        let mask = 0;
        for (let k = 0; k < count; k++) {
          const c = casters[k];
          const dist = Math.hypot(c.x - x, c.y - z);
          if (c.z <= 0 || dist - c.z >= SHADE_REACH) continue;
          mask |= 1 << k;
          // Der Schatten liegt im Keil hinter dem Werfer, so breit wie er selbst samt Halbschatten.
          // Steht er dicht an der Laterne, kann er in alle Richtungen fallen.
          const pad = c.z + FLAME_R + 0.06;
          const base = i * SECTORS;
          if (dist <= pad) {
            for (let s = 0; s < SECTORS; s++) sectors[base + s] |= 1 << k;
            continue;
          }
          const a = (Math.atan2(c.y - z, c.x - x) * SECTORS) / (2 * Math.PI) + SECTORS / 2;
          const h = (Math.asin(pad / dist) * SECTORS) / (2 * Math.PI);
          for (let s = Math.floor(a - h); s <= Math.floor(a + h); s++) sectors[base + (((s % SECTORS) + SECTORS) % SECTORS)] |= 1 << k;
        }
        u.shadeLamps.value[i].set(x, z, mask, loc.lampLayer?.get(`${x},${z}`) ?? 0);
      }
    },
  };
}
// GLSL: lampShade(p, lamp) sagt, wie viel vom Licht der Laterne bei lamp am Punkt p ankommt (beides
// in Weltkoordinaten); lampWorld holt die Lage eines Punktlichts aus der Kamerasicht zurück.
export const SHADE_GLSL = `
uniform vec4 shadeCasters[${SHADE_MAX}];
uniform vec2 shadeParams[${SHADE_MAX}];
uniform int shadeCount;
uniform int shadeFixed;
uniform vec4 shadeLamps[${LIT_LAMPS}];
uniform ivec4 shadeSectors[${(LIT_LAMPS * SECTORS) / 4}];
uniform highp sampler2DArray lampStill;
vec3 lampWorld(vec3 viewPos) {
  return transpose(mat3(viewMatrix)) * (viewPos - viewMatrix[3].xyz);
}
// Geprüft werden nur die Werfer, deren Bit in mask gesetzt ist. Die Schleife läuft nur so oft, wie
// Bits gesetzt sind: Sie löst jedes Mal das niedrigste heraus und holt seine Nummer über log2. Ein
// Durchlauf je Werfer mit Sprung über die ungesetzten wäre kürzer zu schreiben, aber der Übersetzer
// unter Windows (ANGLE) glättet solche Sprünge, und dann rechnet doch jeder Durchlauf alles.
// layer: Schicht der Laterne in lampStill plus 1, 0 wenn keine festen Werfer bei ihr stehen.
// slot: Platz der Laterne in shadeLamps, dann gelten nur die Werfer in der Richtung des Punktes
// (shadeSectors); −1 für alle in mask.
float lampShadeMasked(vec3 p, vec3 lamp, int mask, float layer, int slot) {
  vec2 d = lamp.xz - p.xz;
  float dist2 = dot(d, d);
  mask &= (1 << shadeCount) - 1;
  if (slot >= 0 && mask != 0) {
    int s = int(floor(atan(-d.y, -d.x) * ${(SECTORS / (2 * Math.PI)).toFixed(6)} + ${(SECTORS / 2).toFixed(1)})) & ${SECTORS - 1};
    mask &= shadeSectors[slot * ${SECTORS / 4} + (s >> 2)][s & 3];
  }
  if ((mask == 0 && layer < 0.5) || dist2 > ${(SHADE_FAR * SHADE_FAR).toFixed(1)}) return 1.0;
  float inv = inversesqrt(max(dist2, 1e-4));
  float inv2 = inv * inv;
  float lit = 1.0;
  if (layer > 0.5) lit = texture(lampStill, vec3(-d / ${STILL_TILE.toFixed(1)} + 0.5, layer - 1.0)).r;
  for (int n = 0; n < ${SHADE_MAX}; n++) {
    if (mask == 0) break;
    int bit = mask & -mask;
    mask ^= bit;
    int k = int(log2(float(bit)) + 0.5);
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
    vec2 q = shadeParams[k];
    float under = q.x;
    float hit = (1.0 - smoothstep(c.z - w, c.z + w, sqrt(dd)))
      * (1.0 - smoothstep(c.w - wIn, c.w + wIn, yIn))
      * max(step(under, 0.0), smoothstep(under - wOut, under + wOut, yOut));
    lit *= 1.0 - q.y * hit;
  }
  return mix(lit, 1.0, smoothstep(${SHADE_FAR0.toFixed(1)}, ${SHADE_FAR.toFixed(1)}, dist2 * inv));
}
// Punktlicht mit seinem Eintrag in shadeLamps (gleicher Index wie in loc.lampLights). Passt die Lage
// nicht, etwa weil ein anderes Punktlicht dazwischengekommen ist, werden alle Werfer geprüft.
float lampShadeLit(vec3 p, vec3 lamp, int i) {
  vec4 e = shadeLamps[i];
  bool known = abs(e.x - lamp.x) + abs(e.y - lamp.z) < 0.1;
  return known ? lampShadeMasked(p, lamp, int(e.z), e.w, i) : lampShadeMasked(p, lamp, -1, 0.0, -1);
}
// Beliebige Laterne (Lichtflecken) mit ihrer Schicht in lampStill: Maske über die Lage suchen.
// Laternen ohne Punktlicht prüfen nur die Pferdebahn; die übrigen beweglichen Werfer stehen ohnehin
// bei den leuchtenden.
float lampShade(vec3 p, vec3 lamp, float layer) {
  int mask = shadeFixed;
  int slot = -1;
  for (int i = 0; i < ${LIT_LAMPS}; i++) {
    vec4 e = shadeLamps[i];
    if (abs(e.x - lamp.x) + abs(e.y - lamp.z) < 0.1) {
      mask = int(e.z);
      slot = i;
    }
  }
  return lampShadeMasked(p, lamp, mask, layer, slot);
}`;

// Beleuchtungsteil von three.js mit Schatten für die Punktlichter: Die Farbe jedes Lichts wird
// gleich nach getPointLightInfo mit lampShade verrechnet. p: GLSL-Ausdruck für den Punkt (Welt).
// three.js rollt die Schleife über die Punktlichter aus und setzt dabei für [ i ] und
// UNROLLED_LOOP_INDEX die Nummer ein;
// die Punktlichter liegen in der Reihenfolge von loc.lampLights vor (die einzigen der Szene).
const POINT_HOOK = 'getPointLightInfo( pointLight, geometryPosition, directLight );';
export function shadedLightsChunk(p) {
  const chunk = THREE.ShaderChunk.lights_fragment_begin;
  if (!chunk.includes(POINT_HOOK)) reportError('Laternenschatten', new Error('Beleuchtungsteil von three.js hat sich geändert, die Laternen werfen keine Schatten'));
  return chunk.replace(POINT_HOOK, `${POINT_HOOK}\n\t\tif ( directLight.visible ) directLight.color *= lampShadeLit( ${p}, lampWorld( pointLight.position ), UNROLLED_LOOP_INDEX );`);
}

// Dasselbe für ein gewöhnliches Material ohne eigene Weltlage, etwa die Gehwege (facades.js): Auch
// dort sollen die Schatten der Passanten im Licht der Laternen liegen.
export function shadedByLamps(material, loc) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shadeUniforms(loc));
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vShadeW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvShadeW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vShadeW;\n${SHADE_GLSL}`)
      .replace('#include <lights_fragment_begin>', shadedLightsChunk('vShadeW'));
  };
  material.customProgramCacheKey = () => 'shadedByLamps';
  return material;
}

// Lichtfleck der Laternen mit Schatten: Wo der Weg zur Flamme durch einen Schattenwerfer führt,
// hellt der Fleck nichts auf.
function shadedPool(material, loc) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shadeUniforms(loc));
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aStill;\nvarying vec3 vPoolW;\nvarying vec3 vLampW;\nvarying float vStill;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vStill = aStill;
        vPoolW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        vLampW = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz + vec3(0.0, ${(FLAME - 0.03).toFixed(2)}, 0.0);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vPoolW;\nvarying vec3 vLampW;\nvarying float vStill;\n${SHADE_GLSL}`)
      .replace('#include <premultiplied_alpha_fragment>', 'gl_FragColor.rgb *= lampShade(vPoolW, vLampW, vStill);\n#include <premultiplied_alpha_fragment>');
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
  const poolGeo = new THREE.PlaneGeometry(1, 1);
  poolGeo.rotateX(-Math.PI / 2);
  // Schicht jedes Lichtflecks in lampStill (bakeStillShade füllt sie).
  poolGeo.setAttribute('aStill', (loc.lampPoolLayers = new THREE.InstancedBufferAttribute(new Float32Array(positions.length), 1)));
  // Alle Flammen für bakeStillShade: pool ist der Index des Lichtflecks (loc.extraLamps nimmt
  // bakeStillShade selbst dazu, mit pool -1).
  const spots = (loc.lampSpots = []);
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
    spots.push({ x, y: y + FLAME, z, pool: i });
    m.makeScale(13, 1, 13).setPosition(x, y + 0.03, z);
    pools.setMatrixAt(i, m);
    glows.push({ x, y: y + 3.8, z, size: 3.6, opacity: 0.55, ground: y, seed: i * 1.7 });
  });
  // Alle Scheine in einem Aufruf (glowSprites), die Deckkraft flackert je Laterne.
  const glowMesh = glowSprites(glows, softDisc('lampGlow'), 0xffa858);
  glowMesh.layers.enable(MIRROR_LAYER);
  postMesh.frustumCulled = glassMesh.frustumCulled = pools.frustumCulled = false;
  postMesh.layers.enable(MIRROR_LAYER);
  glassMesh.layers.enable(MIRROR_LAYER);
  scene.add(postMesh, glassMesh, pools, glowMesh);

  // Nur die nächsten Laternen werfen echtes Licht. Die Anzahl bleibt fest, damit nichts neu kompiliert.
  const lights = [];
  for (let i = 0; i < LIT_LAMPS; i++) {
    const l = new THREE.PointLight(0xffa35a, 0, 22, 1.7);
    scene.add(l);
    lights.push(l);
  }
  // Wer Schatten wirft, fragt hier, welche Laternen gerade leuchten (groundshade.js).
  loc.lampLights = lights;
  // Dazu Laternen anderer Bauteile (loc.extraLamps: x, y, z der Flamme, intensity, weight). weight < 1
  // rückt eine Laterne in der Rangliste vor, etwa die im Durchgang unter dem Viadukt, die man von
  // weiter weg sieht als ihre Entfernung vermuten lässt; weight > 1 lässt den Straßenlaternen den
  // Vortritt. Die Liste entsteht erst im ersten Bild, damit auch Laternen zählen, die nach
  // buildLamps gebaut werden (etwa die über den Ladentüren).
  let ranked = null;
  let timer = 0;
  loc.onUpdate((dt, t, { camera }) => {
    ranked ??= [
      ...glows.map((g) => ({ x: g.x, z: g.z, ly: g.ground + FLAME, seed: g.seed, intensity: 32, weight: 1, d: 0 })),
      ...(loc.extraLamps ?? []).map((e, i) => ({ x: e.x, z: e.z, ly: e.y, seed: 50 + i * 1.3, intensity: e.intensity, weight: e.weight, d: 0 })),
    ];
    timer -= dt;
    if (timer <= 0) {
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
    glows.forEach((g, i) => glowMesh.setOpacity(i, 0.5 + 0.06 * Math.sin(t * 6 + g.seed)));
    glowMesh.instanceColor.needsUpdate = true;
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

// Eintrag für loc.extraLamps zu einer Wandlaterne: p die Mitte des Glases (wallLantern), (ox, oz) die
// waagrechte Richtung von der Wand weg. Gehört sie zu den nächsten Laternen, bekommt sie echtes Licht,
// und wer davor steht, wirft Schatten. Das Licht sitzt ein Stück vor dem Glas, sonst stünde dicht
// dahinter ein greller Fleck auf der Wand (den Schein dort malt schon lampWash). Schwächer als eine
// Straßenlaterne, und die haben Vortritt (weight > 1).
const WALL_LAMP_OUT = 0.5;
export function wallLamp(p, ox, oz, intensity = 9, weight = 1.5) {
  const n = Math.hypot(ox, oz) || 1;
  return { x: p.x + (ox / n) * WALL_LAMP_OUT, y: p.y, z: p.z + (oz / n) * WALL_LAMP_OUT, intensity, weight };
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
