import * as THREE from 'three';
import { rng } from '../textures.js';

// Verschattung und Schmutzfahnen der Fensterachsen, beim Laden je Achsentyp gerechnet.
// Die Wandgeometrie einer Achse wird von vorn in eine Höhenkarte gerastert (wie weit jede Stelle
// vor die Putzebene springt), dazu die Gesimse, die über und unter der Achse am Haus sitzen.
// Daraus ergibt sich, wie viel Himmel eine Stelle sieht: unter Sohlbänken, Verdachungen und
// Gesimsen und in den Laibungen wird es dunkler. Unter den Vorsprüngen laufen außerdem
// Schmutzfahnen herab, wo das Regenwasser abtropft. Das Ergebnis dunkelt die Grundfarbe ab
// (nicht als aoMap, die in three.js nur das indirekte Licht trifft), damit es auch unter den
// Gaslaternen wirkt.

// Auflösung je Achse; die Achse wird in u und v auf 0..1 gestreckt.
const NX = 112;
const NY = 144;
// Schrittweite und Reichweite der Horizontsuche in Metern.
const STEP = 0.04;
const STEPS = 11;
// Wie weit eine Seitenfläche ihre Probe aus der Fläche heraus nimmt (Laibung → Fensteröffnung,
// Unterseite der Sohlbank → Wand darunter).
const OUTSET = 0.04;
// Stärke von Verschattung und Schmutz.
const AO_K = 1;
const AO_POW = 1.5;
const DIRT_K = 0.55;
// Wo nichts gebaut ist (Fensteröffnung ohne Rückwand, Torweg, um die Gaube): so tief hinten.
const EMPTY = -0.4;

// Richtungen in der Fassadenebene, nach oben stärker gewichtet, weil der Himmel oben ist.
const DIRS = Array.from({ length: 8 }, (_, k) => {
  const a = (k * Math.PI) / 4;
  return { dx: Math.cos(a), dy: Math.sin(a), w: 1 + 0.6 * Math.sin(a) };
});
const W_SUM = DIRS.reduce((s, d) => s + d.w, 0);

// Höhenkarte der Vorderansicht: für jede Zelle die vorderste Fläche (größtes z).
function heightMap(geo, W, H, P, sx, sy, context, padWall) {
  const rows = NY + 2 * P;
  const hm = new Float32Array(NX * rows);
  for (let j = 0; j < rows; j++) {
    const inside = j >= P && j < P + NY;
    hm.fill(inside || !padWall ? EMPTY : 0, j * NX, (j + 1) * NX);
  }
  const pos = geo.attributes.position.array;
  for (let t = 0; t < pos.length; t += 9) {
    const ax = pos[t], ay = pos[t + 1], az = pos[t + 2];
    const bx = pos[t + 3], by = pos[t + 4], bz = pos[t + 5];
    const cx = pos[t + 6], cy = pos[t + 7], cz = pos[t + 8];
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    // Nur Flächen, die nach vorn zeigen; Seiten, Ober- und Unterseiten sind von vorn Linien.
    if (area <= 1e-7) continue;
    const i0 = Math.max(0, Math.floor(Math.min(ax, bx, cx) / sx - 0.5));
    const i1 = Math.min(NX - 1, Math.ceil(Math.max(ax, bx, cx) / sx - 0.5));
    const j0 = Math.max(0, Math.floor(Math.min(ay, by, cy) / sy - 0.5) + P);
    const j1 = Math.min(rows - 1, Math.ceil(Math.max(ay, by, cy) / sy - 0.5) + P);
    for (let j = j0; j <= j1; j++) {
      const py = (j - P + 0.5) * sy;
      for (let i = i0; i <= i1; i++) {
        const px = (i + 0.5) * sx;
        const l1 = ((bx - px) * (cy - py) - (by - py) * (cx - px)) / area;
        const l2 = ((cx - px) * (ay - py) - (cy - py) * (ax - px)) / area;
        const l3 = 1 - l1 - l2;
        if (l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) continue;
        const z = l1 * az + l2 * bz + l3 * cz;
        const k = j * NX + i;
        if (z > hm[k]) hm[k] = z;
      }
    }
  }
  // Gesimse des Hauses über und unter der Achse, über die ganze Breite.
  for (const { y0, y1, z } of context) {
    const j0 = Math.max(0, Math.round(y0 / sy) + P);
    const j1 = Math.min(rows - 1, Math.round(y1 / sy) + P - 1);
    for (let j = j0; j <= j1; j++) for (let i = 0; i < NX; i++) hm[j * NX + i] = Math.max(hm[j * NX + i], z);
  }
  return hm;
}

function bake(geo, W, H, context, padWall, seed, out) {
  const sx = W / NX;
  const sy = H / NY;
  const P = Math.ceil((STEP * STEPS) / sy) + 1;
  const rows = NY + 2 * P;
  const hm = heightMap(geo, W, H, P, sx, sy, context, padWall);

  // Schmutzfahnen: je Spalte von oben nach unten. Unter einer Kante, die vorspringt, beginnt
  // eine Fahne, deren Stärke und Länge von Spalte zu Spalte wechselt; in der Fensteröffnung endet sie.
  const r = rng(seed);
  const amp = new Float32Array(NX);
  const len = new Float32Array(NX);
  {
    const raw = Array.from({ length: NX }, () => r());
    const slow = Array.from({ length: Math.ceil(NX / 12) + 2 }, () => r());
    for (let i = 0; i < NX; i++) {
      const n = (raw[(i + NX - 1) % NX] + 2 * raw[i] + raw[(i + 1) % NX]) / 4;
      const f = i / 12;
      const k = Math.floor(f);
      const s = slow[k] + (slow[k + 1] - slow[k]) * (f - k);
      amp[i] = Math.min(1, Math.pow(n, 1.3) * (0.5 + 1.0 * s));
      len[i] = 0.25 + 0.75 * s * (0.5 + n);
    }
  }
  const dirt = new Float32Array(NX * NY);
  for (let i = 0; i < NX; i++) {
    const decay = Math.exp(-sy / len[i]);
    let s = 0;
    for (let j = rows - 2; j >= 0; j--) {
      const h = hm[j * NX + i];
      const step = hm[(j + 1) * NX + i] - h;
      s *= decay;
      if (h < -0.05) s = 0;
      else if (step > 0.03) s = Math.max(s, amp[i] * Math.min(1, step / 0.12));
      if (j >= P && j < P + NY) dirt[(j - P) * NX + i] = s;
    }
  }

  // Horizontsuche: Höhenkarte seitlich um Q Spalten (rundum fortgesetzt) verbreitert, damit die
  // Versätze je Richtung und Schritt feste Indexabstände sind.
  const Q = Math.ceil((STEP * STEPS) / sx) + 1;
  const WP = NX + 2 * Q;
  const hp = new Float32Array(WP * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < WP; i++) hp[j * WP + i] = hm[j * NX + (((i - Q) % NX) + NX) % NX];
  const off = new Int32Array(DIRS.length * STEPS);
  const inv = new Float32Array(STEPS);
  DIRS.forEach((d, k) => {
    for (let s = 0; s < STEPS; s++) {
      const t = (s + 1) * STEP;
      off[k * STEPS + s] = Math.round((d.dy * t) / sy) * WP + Math.round((d.dx * t) / sx);
      inv[s] = 1 / t;
    }
  });
  const weight = DIRS.map((d) => d.w / W_SUM);
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      const c = (j + P) * WP + i + Q;
      const h0 = hp[c];
      let occ = 0;
      for (let k = 0; k < DIRS.length; k++) {
        let best = 0;
        for (let s = 0; s < STEPS; s++) {
          const e = (hp[c + off[k * STEPS + s]] - h0) * inv[s];
          if (e > best) best = e;
        }
        occ += weight[k] * (best / Math.sqrt(1 + best * best));
      }
      const v = (1 - AO_K + AO_K * Math.pow(1 - occ, AO_POW)) * (1 - DIRT_K * dirt[j * NX + i]);
      out[j * NX + i] = Math.round(255 * Math.min(1, Math.max(0, v)));
    }
  }
}

// entries: [{ geo, H, context: [{ y0, y1, z }], padWall }] mit der Achsbreite W.
// Gibt die Textur zurück und schreibt jeder Geometrie das Attribut aBay (u, v, Ebene).
// Die Achsen sehen an jedem Ort gleich aus, darum wird die Karte nur einmal gerechnet.
let cached = null;
export function bakeBayShade(entries, W) {
  const data = cached ? null : new Uint8Array(NX * NY * entries.length);
  entries.forEach((e, layer) => {
    if (data) bake(e.geo, W, e.H, e.context, e.padWall, 9173 + layer * 31, data.subarray(layer * NX * NY, (layer + 1) * NX * NY));
    const p = e.geo.attributes.position;
    const n = e.geo.attributes.normal;
    const a = new Float32Array(p.count * 3);
    for (let v = 0; v < p.count; v++) {
      // Seiten-, Ober- und Unterseiten nehmen ihre Probe ein Stück vor sich.
      const side = Math.abs(n.getZ(v)) < 0.7;
      a[v * 3] = (p.getX(v) + (side ? n.getX(v) * OUTSET : 0)) / W;
      a[v * 3 + 1] = (p.getY(v) + (side ? n.getY(v) * OUTSET : 0)) / e.H;
      a[v * 3 + 2] = layer;
    }
    e.geo.setAttribute('aBay', new THREE.BufferAttribute(a, 3));
  });
  if (cached) return cached;
  const tex = new THREE.DataArrayTexture(data, NX, NY, entries.length);
  tex.format = THREE.RedFormat;
  tex.type = THREE.UnsignedByteType;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  cached = tex;
  return tex;
}

// Legt die Karte über ein (schon grimy gemachtes) Wandmaterial der Achsen. Jede zweite Achse
// (nach ihrer Lage gewürfelt) bekommt die Karte gespiegelt, damit die Fahnen nicht in jeder
// Achse gleich laufen.
export function bayShaded(material, tex) {
  if (material.userData.bayShade) return material;
  material.userData.bayShade = tex;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer);
    shader.uniforms.bayShade = { value: tex };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aBay;\nvarying vec3 vBay;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vBay = aBay;
        #ifdef USE_INSTANCING
          if (fract(sin(dot(instanceMatrix[3].xyz, vec3(12.9898, 78.233, 37.719))) * 43758.5453) > 0.5) vBay.x = 1.0 - vBay.x;
        #endif`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform highp sampler2DArray bayShade;\nvarying vec3 vBay;')
      .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb *= texture(bayShade, vBay).r;');
  };
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}-bay`;
  return material;
}
