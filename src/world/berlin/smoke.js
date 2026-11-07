import * as THREE from 'three';
import { fogPuff } from '../textures.js';

// Rauch und Dampf als weiche, zur Kamera gedrehte Flecken in einem einzigen Aufruf: Kohlenrauch
// aus den Schornsteinen, Qualm über dem Kohlebecken, der Atem der Pferde und der Leute in der
// Novemberkälte. Die Flecken sind unbeleuchtet; ihre Helligkeit wird beim Ausstoßen aus der Nähe
// der Laternen geschätzt, so sieht man Atem vor allem im Licht.
const MAX = 1000;
// Wind wie Nebel und Regen (weather.js): leicht nach +x.
const WIND = 0.7;

export function buildSmoke(loc, { chimneys = [] } = {}) {
  const { scene } = loc;
  const quad = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = quad.index;
  geo.setAttribute('position', quad.attributes.position);
  geo.setAttribute('uv', quad.attributes.uv);
  const iPos = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const iLook = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const iColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('iPos', iPos);
  geo.setAttribute('iLook', iLook);
  geo.setAttribute('iColor', iColor);
  geo.instanceCount = 0;
  const fog = scene.fog;
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      map: { value: fogPuff() },
      fogColor: { value: fog?.color ?? new THREE.Color(0) },
      fogDensity: { value: fog?.density ?? 0 },
    },
    vertexShader: `
      attribute vec3 iPos; attribute vec4 iLook; attribute vec3 iColor;
      varying vec2 vUv; varying float vA; varying vec3 vC; varying float vFog;
      uniform float fogDensity;
      void main() {
        // iLook: Größe, Deckkraft, Drehung, frei.
        vec4 mv = viewMatrix * vec4(iPos, 1.0);
        float c = cos(iLook.z), s = sin(iLook.z);
        mv.xy += mat2(c, s, -s, c) * position.xy * iLook.x;
        vUv = uv;
        vC = iColor;
        // Dicht vor der Kamera ausblenden, sonst stünde man plötzlich in einer Wolke.
        vA = iLook.y * smoothstep(0.25, 0.9, -mv.z);
        float d = length(mv.xyz);
        vFog = 1.0 - exp(-fogDensity * fogDensity * d * d);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D map; uniform vec3 fogColor;
      varying vec2 vUv; varying float vA; varying vec3 vC; varying float vFog;
      void main() {
        vec4 t = texture2D(map, vUv);
        float a = t.a * vA;
        if (a < 0.002) discard;
        gl_FragColor = vec4(mix(vC, fogColor, vFog), a);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  scene.add(mesh);

  const parts = [];
  // Licht der Laternen (lamps.js) in der Nähe eines Punkts, grob: 0 im Dunkeln bis etwa 1.
  const lights = [];
  scene.traverse((o) => {
    if (o.isPointLight) lights.push(o);
  });
  const lightAt = (p) => {
    let k = 0;
    for (const l of lights) {
      if (l.intensity <= 0) continue;
      const d = l.position.distanceTo(p);
      k += (l.intensity / 32) * Math.max(0, 1 - d / 9) ** 2;
    }
    // Die Glut im Kohlebecken leuchtet die Gesichter darum herum an.
    for (const b of loc.braziers ?? []) k += 0.8 * Math.max(0, 1 - b.distanceTo(p) / 3.5) ** 2;
    return Math.min(1, k);
  };
  const emit = (p, v, { life, s0, s1, alpha, color, drag = 1, rise = 0 }) => {
    if (parts.length >= MAX) return;
    parts.push({
      x: p.x, y: p.y, z: p.z, vx: v.x, vy: v.y, vz: v.z, age: 0, life, s0, s1, alpha, drag, rise,
      r: color.r, g: color.g, b: color.b, rot: Math.random() * 6.28, spin: (Math.random() - 0.5) * 0.4,
    });
  };

  // Schornsteine: nicht jeder raucht. Fest nach der Lage gewählt, damit es bei jedem Besuch dieselben sind.
  const hash = (c) => {
    const h = Math.sin(c.x * 12.9898 + c.z * 78.233) * 43758.5453;
    return h - Math.floor(h);
  };
  const smoking = chimneys.filter((c) => hash(c) < 0.5).map((c) => ({ p: c, next: Math.random() * 0.5, d: 0 }));
  let near = [];
  let rank = 0;
  const SMOKE = new THREE.Color(0.115, 0.1, 0.09);
  const BRAZIER = new THREE.Color(0.42, 0.27, 0.16);
  const braziers = (loc.braziers ?? []).map((p) => ({ p, next: 0 }));

  // Wer atmet: Leute (userData.figure) und Pferde (userData.head mit Beinen), einmal gesammelt.
  let breathers = null;
  const v = new THREE.Vector3();
  const w = new THREE.Vector3();
  const at = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const tmpC = new THREE.Color();
  const MOUTH = new THREE.Vector3(0, 0.06, 0.11);
  const NOSE = new THREE.Vector3(0, 0.02, 0.84);
  const BAG = new THREE.Vector3(0, 0.2, 0.74);

  loc.onUpdate((dt, t, { camera }) => {
    const cam = camera.position;
    if (!breathers) {
      breathers = [];
      scene.traverse((o) => {
        if (o.userData.figure) {
          const pipe = o.userData.figure.pipe;
          breathers.push({ o, head: o.userData.figure.head, horse: false, next: Math.random() * 4, pipe, draw: pipe ? 2 + Math.random() * 8 : 0, glow: 0, wisp: 0, exhale: -1 });
        }
        else if (o.userData.head && o.userData.legs) breathers.push({ o, head: o.userData.head, horse: true, bag: o.userData.tilt > 0, next: Math.random() * 3 });
      });
    }

    // Die nächsten rauchenden Schornsteine, alle halbe Sekunde neu bestimmt.
    rank -= dt;
    if (rank < 0) {
      rank = 0.5;
      for (const c of smoking) c.d = (c.p.x - cam.x) ** 2 + (c.p.z - cam.z) ** 2;
      near = smoking.filter((c) => c.d < 110 * 110).sort((a, b) => a.d - b.d).slice(0, 22);
    }
    for (const c of near) {
      c.next -= dt;
      if (c.next > 0) continue;
      c.next = 0.35 + Math.random() * 0.25;
      emit(c.p, v.set((Math.random() - 0.5) * 0.2, 0.9 + Math.random() * 0.3, (Math.random() - 0.5) * 0.2),
        { life: 9 + Math.random() * 3, s0: 0.7, s1: 5.5, alpha: 0.55, color: SMOKE, drag: 0.35, rise: 0.06 });
    }
    for (const b of braziers) {
      if ((b.p.x - cam.x) ** 2 + (b.p.z - cam.z) ** 2 > 60 * 60) continue;
      b.next -= dt;
      if (b.next > 0) continue;
      b.next = 0.18 + Math.random() * 0.12;
      w.copy(b.p).add(v.set((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3));
      emit(w, v.set(0, 0.7 + Math.random() * 0.3, 0), { life: 3.5 + Math.random(), s0: 0.25, s1: 1.8, alpha: 0.3, color: BRAZIER, drag: 0.5, rise: 0.15 });
    }

    // Pfeifenraucher: aus dem Kopf der Pfeife kräuselt dauernd ein dünner Faden. Alle paar
    // Sekunden ein Zug: Die Glut leuchtet auf und verglimmt, kurz danach kommt eine Wolke aus dem Mund.
    for (const b of breathers) {
      if (!b.pipe || !b.o.visible) continue;
      b.draw -= dt;
      if (b.draw < 0) {
        b.draw = 7 + Math.random() * 8;
        b.exhale = 1.8;
        b.next = Math.max(b.next, 4);
      }
      const drawing = b.exhale > 0.6;
      b.glow += ((drawing ? 1 : 0) - b.glow) * Math.min(1, dt * (drawing ? 3 : 0.8));
      b.pipe.ember.material.color.setRGB(1.2 + 2.4 * b.glow, 0.3 + 0.55 * b.glow, 0.06 + 0.1 * b.glow);
      b.o.getWorldPosition(w);
      const close = (w.x - cam.x) ** 2 + (w.z - cam.z) ** 2 < 16 * 16;
      if (b.exhale > 0) {
        b.exhale -= dt;
        if (b.exhale <= 0 && close) {
          b.head.localToWorld(at.copy(MOUTH));
          dir.set(0, 0.35, 1).transformDirection(b.head.matrixWorld);
          const k = 0.5 + 0.5 * lightAt(at);
          for (let i = 0; i < 4; i++) {
            emit(at, w.copy(dir).multiplyScalar(0.5 * (1 - i * 0.2)), {
              life: 2.4, s0: 0.06, s1: 0.65, alpha: 0.26 * k, color: tmpC.setRGB(0.55 * k, 0.58 * k, 0.64 * k), drag: 1.6, rise: 0.12,
            });
          }
        }
      }
      b.wisp -= dt;
      if (b.wisp < 0 && close) {
        b.wisp = 0.35 + Math.random() * 0.2;
        b.head.localToWorld(at.copy(b.pipe.bowl));
        const k = 0.5 + 0.5 * lightAt(at);
        emit(at, v.set(0, 0.22, 0), { life: 2.4, s0: 0.025, s1: 0.32, alpha: (0.1 + 0.12 * b.glow) * k, color: tmpC.setRGB(0.5 * k, 0.53 * k, 0.6 * k), drag: 0.9, rise: 0.22 });
      }
    }

    // Atem: nur in der Nähe, im Takt der Atemzüge, Pferde kräftiger als Leute.
    for (const b of breathers) {
      if (!b.o.visible) continue;
      b.next -= dt;
      if (b.next > 0) continue;
      b.next = b.horse ? 2.6 + Math.random() * 1.6 : 3.2 + Math.random() * 1.8;
      b.o.getWorldPosition(w);
      if ((w.x - cam.x) ** 2 + (w.z - cam.z) ** 2 > (b.horse ? 30 * 30 : 16 * 16)) continue;
      b.head.localToWorld(at.copy(b.horse ? (b.bag ? BAG : NOSE) : MOUTH));
      const k = 0.4 + 0.6 * lightAt(at);
      // Richtung: aus dem Mund nach vorn, beim Pferd aus den Nüstern nach vorn unten, aus dem
      // Futtersack nach oben.
      if (b.bag) dir.set(0, 1, 0);
      else dir.set(0, b.horse ? -0.5 : 0, 1).transformDirection(b.head.matrixWorld);
      const n = b.horse ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const speed = (b.horse ? 0.8 : 0.4) * (1 - i * 0.25);
        emit(at, w.copy(dir).multiplyScalar(speed), {
          life: b.horse ? 1.8 : 1.3, s0: b.horse ? 0.1 : 0.05, s1: b.horse ? 0.75 : 0.38,
          alpha: (b.horse ? 0.32 : 0.2) * k, color: tmpC.setRGB(0.62 * k, 0.64 * k, 0.68 * k), drag: 2.2, rise: 0.08,
        });
      }
    }

    // Bewegen, altern, und die lebenden Flecken dicht in die Puffer schreiben.
    let n = 0;
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i];
      q.age += dt;
      if (q.age >= q.life) {
        parts[i] = parts[parts.length - 1];
        parts.pop();
        continue;
      }
      const f = Math.min(1, dt * q.drag);
      q.vx += (WIND - q.vx) * f;
      q.vz += (0 - q.vz) * f;
      q.vy += (q.rise - q.vy) * f;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.z += q.vz * dt;
      q.rot += q.spin * dt;
      const k = q.age / q.life;
      const size = q.s0 + (q.s1 - q.s0) * (1 - (1 - k) ** 2);
      const a = q.alpha * Math.min(1, k / 0.12) * (1 - k) ** 1.5;
      iPos.array.set([q.x, q.y, q.z], n * 3);
      iLook.array.set([size, a, q.rot, 0], n * 4);
      iColor.array.set([q.r, q.g, q.b], n * 3);
      n++;
    }
    geo.instanceCount = n;
    iPos.needsUpdate = iLook.needsUpdate = iColor.needsUpdate = true;
  });
}
