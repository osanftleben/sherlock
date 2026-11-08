import * as THREE from 'three';
import { shadeSlots } from './lamps.js';

// Schatten von Leuten, Pferden und Wagen.
//
// Draußen gibt es keine Schattenkarten (view.js). Ohne sie fehlt zweierlei: die weiche Abdunklung
// unter jedem Körper, wo er den Himmel und das Licht ringsum verdeckt (sonst scheinen alle ein wenig
// über dem nassen Pflaster zu schweben), und der lange Schatten, den er im Licht einer Laterne von
// ihr weg wirft.
//
// Bodenschatten: je Körper ein weicher Fleck, als Instanz einer flachen Scheibe, die das Bild darunter
// abdunkelt (multiplikativ wie die Lichtflecken der Laternen, nur umgekehrt).
//
// Laternenschatten: Die Körper nächst der Kamera, die im Licht einer der leuchtenden Laternen stehen,
// bekommen die freien Plätze der Schattenrechnung in lamps.js, als senkrechte Zylinder. Pflaster,
// Gehwege und Lichtflecken prüfen dort für jede Laterne, ob der Weg zu ihr durch einen Zylinder führt:
// Richtung und Länge stimmen für jede Laterne, und abgehalten wird nur ihr Licht.
//
// Wer einen Schatten bekommt, wird aus der Szene gesammelt, und neu, sobald dort etwas dazukommt oder
// wegfällt (Figuren eines Falls): Leute (userData.figure, ohne Sitzende und ohne alle, die erhöht
// stehen, wie Kutscher und Schaffner auf der Plattform), Pferde (userData.head mit Beinen) und Wagen
// (userData.wheels: die Droschke mit Pferd, der Pferdebahnwagen ohne). Dazu Holmes selbst: Seinen
// Fleck sieht man, wenn er nach unten schaut, seinen Schatten, wenn er von einer Laterne weggeht.

// Bodenschatten in Körperkoordinaten (Blick entlang +z): Breite w (x), Länge l (z), Mitte z, Stärke k
// in der Mitte (0..1), Form p (2 = Ellipse, größer = eckiger) und Kern (bis dahin volle Stärke, als
// Teil des Halbmessers).
const SHAPES = {
  // Größer als der Körper: Die Glockenröcke von 1892 sind am Saum gut 0,7 m breit und decken einen
  // kleineren Fleck ganz zu; sichtbar ist nur, was über den Saum hinausreicht.
  figure: { w: 0.95, l: 0.8, z: 0, k: 0.5, p: 2, core: 0.15 },
  holmes: { w: 0.85, l: 0.7, z: 0, k: 0.5, p: 2, core: 0.15 },
  // Mitte des Pferdes im Ursprung; Kopf und Hals stehen hoch über dem Boden, der Fleck reicht vom
  // Hinterteil bis unter die Brust.
  horse: { w: 0.85, l: 2.3, z: 0.05, k: 0.42, p: 2.4, core: 0.25 },
  // Droschkenkasten von z -2 bis zum Spritzleder bei 0,95, Räder bei x ±0,8 (traffic.js).
  cab: { w: 1.8, l: 3.2, z: -0.55, k: 0.48, p: 4, core: 0.35 },
  // Pferdebahnwagen samt Plattformen 6,2 m lang und 2 m breit (horsecar.js).
  tram: { w: 2.2, l: 6.4, z: 0, k: 0.5, p: 5, core: 0.4 },
};
const MAX = 64;
// Ab FADE0 m blassen die Flecken aus, ab FADE1 m sind sie weg.
const FADE0 = 30;
const FADE1 = 45;
// Abstand über dem Boden; dazu schiebt polygonOffset die Scheibe nach vorn, damit sie nicht flimmert.
const LIFT = 0.012;
// Wer höher als das über dem Boden steht, wirft hier keinen Fleck (Plattform, Bock).
const RAISED = 0.3;

// Laternenschatten in Körperkoordinaten: [x, z, Halbmesser, Oberkante, Unterkante] über dem Boden;
// Unterkante 0 heißt: steht auf dem Boden. Pferd und Droschke schweben, unter Bauch und Wagenkasten
// kommt das Licht durch. Der Pferdebahnwagen hat eigene Plätze, die mitfahren (tramline.js).
const CASTS = {
  // Rumpf von z -0,9 bis 0,85 mit dem Bauch bei 0,82, vorn mit dem Halsansatz (makeHorse).
  horse: [
    [0, 0.45, 0.42, 1.8, 0.82],
    [0, -0.45, 0.42, 1.62, 0.82],
  ],
  // Wagenkasten (z -1,98 bis -0,25, Dach 2,02) und Bock mit Kutscher (traffic.js).
  cab: [
    [0, -1.1, 0.75, 2.02, 0.76],
    [0, 0.1, 0.55, 2.0, 0.56],
  ],
};
// Leute bekommen einen Zylinder nach ihrer Größe (Röcke sind unten weiter als Mantel und Hose), dazu
// Hut und Haar; ein aufgespannter Schirm einen eigenen, schwebenden.
const R_FEMALE = 0.26;
const R_MALE = 0.21;
const HAT = 0.1;
// Holmes, 1,86 m, draußen mit Zylinder, im Inverness-Mantel.
const HOLMES_R = 0.23;
const HOLMES_TOP = 2.0;
// Ab REACH0 m von der nächsten leuchtenden Laterne blasst der Schatten aus, ab REACH1 m ist er weg;
// ebenso mit dem Abstand zur Kamera zwischen CAST0 und CAST1 m.
const REACH0 = 7.5;
const REACH1 = 9.5;
const CAST0 = 26;
const CAST1 = 36;

export function buildGroundShades(loc) {
  const { scene } = loc;
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  // Je Fleck: Stärke (schon mit dem Ausblassen verrechnet), Form, Kern.
  const shade = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
  shade.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aShade', shade);
  const mat = new THREE.ShaderMaterial({
    vertexShader: `
      attribute vec3 aShade;
      varying vec2 vQ;
      varying vec3 vShade;
      void main() {
        vQ = uv * 2.0 - 1.0;
        vShade = aShade;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec2 vQ;
      varying vec3 vShade;
      void main() {
        vec2 q = abs(vQ);
        float r = pow(pow(q.x, vShade.y) + pow(q.y, vShade.y), 1.0 / vShade.y);
        float m = 1.0 - smoothstep(vShade.z, 1.0, r);
        gl_FragColor = vec4(vec3(1.0 - vShade.x * m), 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    // Ergebnis = Bild darunter × Farbe des Flecks
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.ZeroFactor,
    blendDst: THREE.SrcColorFactor,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -4,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, MAX);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.count = 0;
  // Die Flecken wandern; die Hülle aller Instanzen müsste sonst jedes Bild neu berechnet werden.
  mesh.frustumCulled = false;
  // Vor allem anderen Durchscheinenden, damit Rauch und Atem darüber nicht mit abgedunkelt werden.
  mesh.renderOrder = -1;
  scene.add(mesh);

  let bodies = [];
  let seen = -1;
  let rescan = 0;
  const collect = () => {
    bodies = [];
    scene.traverse((o) => {
      const u = o.userData;
      // Holmes' Schattenkörper für die Stuben liegt nur auf der Ebene der Schattenkameras.
      if (u.figure) {
        if (!u.figure.sitting && o.layers.isEnabled(0)) bodies.push({ o, kind: 'figure' });
      } else if (u.head && u.legs) bodies.push({ o, kind: 'horse' });
      else if (u.wheels) bodies.push({ o, kind: u.horse ? 'cab' : 'tram' });
    });
    seen = scene.children.length;
  };
  // 1 sichtbar, 0 verborgen, -1 nicht mehr in der Szene (Fallwechsel: useCase nimmt die alten
  // Figuren heraus und setzt neue ein, die Zahl der Kinder kann dabei gleich bleiben).
  const shown = (o) => {
    let vis = 1;
    for (let p = o; p; p = p.parent) {
      if (!p.visible) vis = 0;
      if (p === scene) return vis;
    }
    return -1;
  };

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const at = new THREE.Vector3();
  const size = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  let n = 0;
  const put = (x, z, yaw, s, cam) => {
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    const cx = x + sin * s.z;
    const cz = z + cos * s.z;
    const fade = 1 - THREE.MathUtils.smoothstep(Math.hypot(cx - cam.x, cz - cam.z), FADE0, FADE1);
    if (fade <= 0 || n >= MAX) return;
    m.compose(at.set(cx, loc.heightAt(cx, cz) + LIFT, cz), q.setFromAxisAngle(UP, yaw), size.set(s.w, 1, s.l));
    mesh.setMatrixAt(n, m);
    shade.setXYZ(n, s.k * fade, s.p, s.core);
    n++;
  };

  // Laternenschatten: Anwärter sammeln, nach Abstand zur Kamera ordnen (Holmes vorn), Plätze füllen.
  const slots = shadeSlots(loc);
  const lamps = loc.lampLights ?? [];
  const cands = [];
  const pool = [];
  const byScore = (a, b) => a.score - b.score;
  const tip = new THREE.Vector3();
  const { smoothstep } = THREE.MathUtils;
  const strength = (x, z, cam) => {
    let near = Infinity;
    for (const l of lamps) {
      if (l.intensity > 0) near = Math.min(near, Math.hypot(l.position.x - x, l.position.z - z));
    }
    return (1 - smoothstep(near, REACH0, REACH1)) * (1 - smoothstep(Math.hypot(x - cam.x, z - cam.z), CAST0, CAST1));
  };
  const candidate = (o, kind, x, y, z, score, k) => {
    const c = (pool[cands.length] ??= {});
    c.o = o;
    c.kind = kind;
    c.x = x;
    c.y = y;
    c.z = z;
    c.score = score;
    c.k = k;
    cands.push(c);
  };
  // Schreibt die Zylinder eines Körpers ab Platz used; zurück kommt, wie viele dann belegt sind.
  // Wer nicht mehr ganz hineinpasst, bekommt keinen.
  const cast = (c, used) => {
    if (c.kind === 'holmes') {
      if (used < slots.size) slots.set(used++, c.x, c.z, HOLMES_R, c.y + HOLMES_TOP, 0, c.k);
      return used;
    }
    const e = c.o.matrixWorld.elements;
    if (c.kind === 'figure') {
      if (used >= slots.size) return used;
      const f = c.o.userData.figure;
      const s = f.body.scale.y;
      slots.set(used++, c.x, c.z, f.female ? R_FEMALE : R_MALE, c.y + 1.76 * s + HAT, 0, c.k);
      // Das Dach des Schirms: Kegel mit 0,55 m Halbmesser, Mitte 0,95 über dem Griff (figures.js).
      if (f.umbrella && used < slots.size) {
        f.umbrella.updateWorldMatrix(true, false);
        tip.set(0, 0.95, 0).applyMatrix4(f.umbrella.matrixWorld);
        slots.set(used++, tip.x, tip.z, 0.5 * s, tip.y + 0.1, tip.y - 0.12, c.k);
      }
      return used;
    }
    const parts = CASTS[c.kind];
    if (used + parts.length > slots.size) return used;
    for (const [dx, dz, r, top, floor] of parts) {
      slots.set(used++, c.x + e[0] * dx + e[8] * dz, c.z + e[2] * dx + e[10] * dz, r, c.y + top, c.y + floor, c.k);
    }
    return used;
  };

  loc.onUpdate((dt, t, { camera, player }) => {
    rescan -= dt;
    if (scene.children.length !== seen && rescan <= 0) {
      collect();
      rescan = 1;
    }
    const cam = camera.position;
    n = 0;
    cands.length = 0;
    for (const { o, kind } of bodies) {
      const vis = shown(o);
      if (vis < 0) seen = -1;
      if (vis <= 0) continue;
      o.updateWorldMatrix(true, false);
      const e = o.matrixWorld.elements;
      if (kind === 'figure' && e[13] - loc.heightAt(e[12], e[14]) > RAISED) continue;
      put(e[12], e[14], Math.atan2(e[8], e[10]), SHAPES[kind], cam);
      if (kind === 'tram') continue;
      const k = strength(e[12], e[14], cam);
      if (k > 0.01) candidate(o, kind, e[12], e[13], e[14], Math.hypot(e[12] - cam.x, e[14] - cam.z), k);
    }
    if (player) {
      const { x, z } = player.pos;
      put(x, z, player.yaw, SHAPES.holmes, cam);
      const k = strength(x, z, cam);
      if (k > 0.01) candidate(null, 'holmes', x, loc.heightAt(x, z), z, -1, k);
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    shade.needsUpdate = true;

    cands.sort(byScore);
    let used = 0;
    for (const c of cands) used = cast(c, used);
    slots.use(used);
  });
}
