import * as THREE from 'three';
import { hearing } from './traffic.js';

// Tropfwasser im Viaduktdurchgang: Der Regen auf der Bahn sickert durch die Fugen des Gewölbes.
// An einigen Stellen löst sich in festem Takt ein Tropfen und schlägt nach gut einer Sekunde
// freien Falls in eine Pfütze. Pfützen und Ringe zeichnet das Pflaster selbst (wetStreet in
// index.js mit DRIP_GLSL); hier fallen die Tropfen, und man hört sie aufschlagen.

export const DRIP_COUNT = 5;

// Je Tropfstelle x, z, Takt in s und Zeitpunkt des Aufschlags im Takt, gemessen in rainTime.
// dripBox umschließt alle Pfützen, damit das Pflaster nur dort rechnet.
export const dripUniforms = {
  drips: { value: Array.from({ length: DRIP_COUNT }, () => new THREE.Vector4(0, 0, 1, 0)) },
  dripBox: { value: new THREE.Vector4(0, -1, 0, -1) },
};

// Für den Fragment-Shader des Pflasters, nach RIPPLES (braucht dessen rainTime).
export const DRIP_GLSL = `
uniform vec4 drips[${DRIP_COUNT}];
uniform vec4 dripBox;
bool nearDrips(vec2 xz) { return xz.x > dripBox.x && xz.x < dripBox.y && xz.y > dripBox.z && xz.y < dripBox.w; }
// Pfütze unter jeder Tropfstelle, gelappt statt kreisrund: 1 in der Mitte, 0 außerhalb.
float dripWet(vec2 xz) {
  float w = 0.0;
  for (int i = 0; i < ${DRIP_COUNT}; i++) {
    vec2 d = xz - drips[i].xy;
    float a = atan(d.y, d.x);
    float r = length(d) * (1.0 + 0.22 * sin(a * 3.0 + float(i) * 2.1) + 0.12 * sin(a * 5.0 + float(i) * 4.3));
    w = max(w, 1.0 - smoothstep(0.15, 0.7, r));
  }
  return w;
}
// Ein Wellenzug je Aufschlag: drei, vier feine Ringe, die mit gut 20 cm in der Sekunde nach außen
// laufen, nach außen flacher werden und binnen einer Sekunde verebben. Gibt wie ripple() die
// Neigung der Wasserfläche in x und z zurück.
vec2 dripRings(vec2 xz) {
  vec2 tilt = vec2(0.0);
  for (int i = 0; i < ${DRIP_COUNT}; i++) {
    vec4 q = drips[i];
    float age = mod(rainTime - q.w, q.z);
    vec2 d = xz - q.xy;
    float r = length(d);
    float x = r - 0.01 - age * 0.22;
    float amp = exp(-age * 2.6) / (1.0 + r * 6.0);
    tilt += amp * sin(x * 170.0) * exp(-x * x * 500.0) * d / max(r, 0.001);
  }
  return tilt;
}`;

// Tropfstellen: x neben der Mitte des Gewölbes, Anteil der Tiefe des Durchgangs, Takt in s.
const SPOTS = [
  [-1.7, 0.4, 1.9],
  [0.6, 0.64, 2.7],
  [-2.9, 0.76, 2.3],
  [1.9, 0.17, 3.1],
  [-0.4, 0.9, 1.7],
];
const G = 9.81;

// vault: Mitte (cx) und Kämpferhöhe (spring) des halbrunden Gewölbes, sein Halbmesser, die
// Tiefe des Durchgangs (z0 bis z1) und die Laterne darin. Die Tropfen sind kurze Striche wie der
// Regen in weather.js, ohne eigenes Licht; nahe der Laterne heller, weil man sie dort sähe.
export function buildDrips(loc, { cx, spring, radius, z0, z1, lamp }) {
  const pos = new Float32Array(DRIP_COUNT * 6);
  const col = new Float32Array(DRIP_COUNT * 6);
  const box = dripUniforms.dripBox.value.set(Infinity, -Infinity, Infinity, -Infinity);
  const spots = SPOTS.map(([dx, f, period], i) => {
    const x = cx + dx;
    const z = z0 + f * (z1 - z0);
    const top = spring + Math.sqrt(radius * radius - dx * dx) - 0.03;
    const fall = Math.sqrt((2 * top) / G);
    const offset = i * 0.73;
    dripUniforms.drips.value[i].set(x, z, period, offset + fall);
    box.set(Math.min(box.x, x - 1), Math.max(box.y, x + 1), Math.min(box.z, z - 1), Math.max(box.w, z + 1));
    const light = 0.35 + 0.65 * Math.max(0, 1 - Math.hypot(x - lamp.x, z - lamp.z) / 6);
    for (let k = 0; k < 2; k++) col.set([0.65 * light, 0.72 * light, 0.85 * light], i * 6 + k * 3);
    return { x, z, top, fall, period, offset, u: 0 };
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false }));
  lines.frustumCulled = false;
  loc.scene.add(lines);

  loc.onUpdate((dt, t, { camera }) => {
    // Dieselbe Zeit wie rainTime (index.js), daran hängen die Ringe im Pflaster.
    const time = t % 1000;
    for (const [i, s] of spots.entries()) {
      const u = (((time - s.offset) % s.period) + s.period) % s.period;
      let y = -10;
      let len = 0;
      if (u < s.fall) {
        y = s.top - 0.5 * G * u * u;
        // Strich so lang, wie der Tropfen in einem Bild fällt.
        len = Math.min(0.24, 0.03 + G * u * 0.018);
      }
      pos.set([s.x, y + len, s.z, s.x, y, s.z], i * 6);
      if (s.u < s.fall && u >= s.fall) (loc.sounds ??= []).push({ type: 'vaultDrip', ...hearing(camera, s.x, s.z, 14) });
      s.u = u;
    }
    geo.attributes.position.needsUpdate = true;
  });
}
