import * as THREE from 'three';

// Bodenschatten: Unter Leuten, Pferden und Wagen wird das Pflaster dunkler.
//
// Draußen gibt es keine Schattenkarten (view.js), und der bedeckte Novemberhimmel wirft auch keine
// harten Schatten. Was man unter einem Passanten, einem Pferd oder einer Droschke erwartet, ist die
// weiche Abdunklung dort, wo der Körper den Himmel und das Licht ringsum verdeckt. Fehlt sie,
// scheinen alle ein wenig über dem nassen Pflaster zu schweben.
//
// Je Körper ein weicher Fleck, als Instanz einer flachen Scheibe, die das Bild darunter abdunkelt
// (multiplikativ wie die Lichtflecken der Laternen, nur umgekehrt). Wer einen Fleck bekommt, wird
// aus der Szene gesammelt, und neu, sobald dort etwas dazukommt oder wegfällt (Figuren eines Falls):
// Leute (userData.figure, ohne Sitzende und ohne alle, die erhöht stehen, wie Kutscher und Schaffner
// auf der Plattform), Pferde (userData.head mit Beinen) und Wagen (userData.wheels: die Droschke mit
// Pferd, der Pferdebahnwagen ohne). Dazu Holmes selbst; seinen Fleck sieht man, wenn er nach unten
// schaut.

// Maße in Körperkoordinaten (Blick entlang +z): Breite w (x), Länge l (z), Mitte z, Stärke k in der
// Mitte (0..1), Form p (2 = Ellipse, größer = eckiger) und Kern (bis dahin volle Stärke, als Teil
// des Halbmessers).
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
        if (!u.figure.sitting && o.layers.isEnabled(0)) bodies.push({ o, s: SHAPES.figure, person: true });
      } else if (u.head && u.legs) bodies.push({ o, s: SHAPES.horse });
      else if (u.wheels) bodies.push({ o, s: u.horse ? SHAPES.cab : SHAPES.tram });
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

  loc.onUpdate((dt, t, { camera, player }) => {
    rescan -= dt;
    if (scene.children.length !== seen && rescan <= 0) {
      collect();
      rescan = 1;
    }
    const cam = camera.position;
    n = 0;
    for (const { o, s, person } of bodies) {
      const vis = shown(o);
      if (vis < 0) seen = -1;
      if (vis <= 0) continue;
      o.updateWorldMatrix(true, false);
      const e = o.matrixWorld.elements;
      if (person && e[13] - loc.heightAt(e[12], e[14]) > RAISED) continue;
      put(e[12], e[14], Math.atan2(e[8], e[10]), s, cam);
    }
    if (player) put(player.pos.x, player.pos.z, player.yaw, SHAPES.holmes, cam);
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    shade.needsUpdate = true;
  });
}
