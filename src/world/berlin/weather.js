import * as THREE from 'three';
import { fogPuff } from '../textures.js';
import { merge } from '../kit.js';

// Überdachte Stellen (loc.dry: Rechtecke, etwa Tordurchfahrten oder der Viaduktbogen) als
// x0, x1, z0, z1 für Shader: Dort fällt kein Regen, und in den Pfützen gibt es keine Regenringe
// (wetStreet in index.js). Feste Anzahl, damit sich die Shader nicht ändern, wenn ein Viertel
// mehr oder weniger hat; freie Plätze sind leere Rechtecke.
export const DRY = 4;
export function dryRects(loc) {
  return Array.from({ length: DRY }, (_, i) => {
    const d = loc.dry?.[i];
    return d ? new THREE.Vector4(d.minX, d.maxX, d.minZ, d.maxZ) : new THREE.Vector4(0, -1, 0, -1);
  });
}

export function buildWeather(loc, r) {
  const { scene } = loc;
  // Bodennebel, der dem Spieler folgt. Jede Schwade blendet nah an der Kamera und am Rand ihres
  // Kastens aus: Sonst verschwände sie schlagartig, sobald ihr Mittelpunkt hinter die Kamera
  // treibt oder sie auf die andere Seite springt, und in dunklen Durchfahrten sähe das aus wie
  // Licht, das über die Wände wandert. Unter Dach (loc.dry) gibt es keinen Bodennebel.
  const FOG_OPACITY = 0.11;
  const fogMat = new THREE.SpriteMaterial({ map: fogPuff(), color: 0x75716e, transparent: true, opacity: FOG_OPACITY, depthWrite: false, fog: false });
  const puffs = [];
  for (let i = 0; i < 26; i++) {
    const s = new THREE.Sprite(fogMat.clone());
    const size = 16 + r() * 18;
    s.scale.set(size, size * 0.45, 1);
    s.position.set((r() - 0.5) * 110, 1.3 + r() * 2.5, (r() - 0.5) * 110);
    scene.add(s);
    puffs.push({ s, vx: 0.2 + r() * 0.3 });
  }

  // Nieselregen als kurze Linien in einem Kasten um die Kamera.
  const N = 450;
  const pos = new Float32Array(N * 6);
  const tail = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    const x = r() * 40;
    const y = r() * 20;
    const z = r() * 40;
    pos.set([x, y, z, x, y, z], i * 6);
    tail[i * 2 + 1] = 1;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('tail', new THREE.BufferAttribute(tail, 1));
  // Überdachte Stellen (loc.dry), dort fällt bis zur Höhe `top` (sonst 4,5 m) kein Regen.
  if ((loc.dry?.length ?? 0) > DRY) console.warn(`weather.js: nur ${DRY} trockene Stellen, ${loc.dry.length} eingetragen`);
  const dry = dryRects(loc);
  const dryTop = Array.from({ length: DRY }, (_, i) => loc.dry?.[i]?.top ?? 4.5);
  const rain = new THREE.LineSegments(g, new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { time: { value: 0 }, origin: { value: new THREE.Vector3() }, dry: { value: dry }, dryTop: { value: dryTop } },
    vertexShader: `
      attribute float tail;
      uniform float time; uniform vec3 origin; uniform vec4 dry[${DRY}]; uniform float dryTop[${DRY}]; varying float vA;
      void main(){
        vec3 p = position;
        p.y = mod(p.y - time * 9.0, 20.0);
        p.x = mod(p.x - origin.x + time * 0.6, 40.0) - 20.0 + origin.x;
        p.z = mod(p.z - origin.z, 40.0) - 20.0 + origin.z;
        // Beide Enden erst nach dem Umbruch trennen, sonst entstehen meterlange Striche.
        p.y -= tail * 0.16;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        float dist = length(mv.xyz);
        vA = clamp(1.0 - dist / 20.0, 0.0, 1.0) * smoothstep(1.5, 5.0, dist);
        for (int i = 0; i < ${DRY}; i++) {
          vec4 d = dry[i];
          if (p.y < dryTop[i] && p.x > d.x && p.x < d.y && p.z > d.z && p.z < d.w) vA = 0.0;
        }
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `varying float vA; void main(){ gl_FragColor = vec4(0.65, 0.72, 0.85, vA * 0.15); }`,
  }));
  rain.frustumCulled = false;
  scene.add(rain);

  // Spritzer: wo ein Tropfen aufschlägt, sprüht für einen Augenblick ein Hauch feiner Tröpfchen
  // hoch. Sie sind beleuchtet, man sieht sie also vor allem im Schein der Laternen und Fenster.
  const SPLASHES = 90;
  const splashGeo = merge([
    new THREE.PlaneGeometry(0.14, 0.1).translate(0, 0.05, 0),
    new THREE.PlaneGeometry(0.14, 0.1).translate(0, 0.05, 0).rotateY(Math.PI / 2),
  ]);
  const splashes = new THREE.InstancedMesh(splashGeo, new THREE.MeshLambertMaterial({
    color: 0xffffff, emissive: 0x15181b, alphaMap: splashMask(), transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }), SPLASHES);
  splashes.frustumCulled = false;
  splashes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(splashes);
  const drops = Array.from({ length: SPLASHES }, () => ({ x: 0, y: 0, z: 0, age: Math.random() * 0.2, life: 0.2, rot: 0 }));
  const sm = new THREE.Matrix4();
  const sq = new THREE.Quaternion();
  const sScale = new THREE.Vector3();
  const sPos = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const dryAt = (x, z) => (loc.dry ?? []).some((d) => x > d.minX && x < d.maxX && z > d.minZ && z < d.maxZ);

  const ahead = new THREE.Vector3();
  const rel = new THREE.Vector3();
  let cover = 1;
  loc.onUpdate((dt, t, { camera }) => {
    rain.material.uniforms.time.value = t;
    rain.material.uniforms.origin.value.copy(camera.position);
    const c = camera.position;
    const roofed = (loc.dry ?? []).some((d) => c.x > d.minX && c.x < d.maxX && c.z > d.minZ && c.z < d.maxZ && c.y < (d.top ?? 4.5));
    cover += ((roofed ? 0 : 1) - cover) * (1 - Math.exp(-dt * 3));
    camera.getWorldDirection(ahead);
    // Spritzer: neu gesetzt in einem Kasten von 24 m um die Kamera, eher vor ihr als dahinter.
    for (let i = 0; i < SPLASHES; i++) {
      const d = drops[i];
      d.age += dt;
      if (d.age > d.life) {
        d.age = 0;
        d.life = 0.12 + Math.random() * 0.1;
        d.x = c.x + ahead.x * 6 + (Math.random() - 0.5) * 24;
        d.z = c.z + ahead.z * 6 + (Math.random() - 0.5) * 24;
        d.y = loc.heightAt(d.x, d.z) + 0.002;
        d.rot = Math.random() * Math.PI;
        if (dryAt(d.x, d.z)) d.y = -10;
      }
      const k = d.age / d.life;
      const size = (0.5 + k) * (1 - k * k) * 1.4;
      sPos.set(d.x, d.y, d.z);
      sq.setFromAxisAngle(yAxis, d.rot);
      sScale.set(size, size * (1.2 - 0.6 * k), size);
      splashes.setMatrixAt(i, sm.compose(sPos, sq, sScale));
    }
    splashes.instanceMatrix.needsUpdate = true;
    for (const p of puffs) {
      p.s.position.x += p.vx * dt;
      const dx = p.s.position.x - c.x;
      const dz = p.s.position.z - c.z;
      if (dx > 55) p.s.position.x -= 110;
      if (dx < -55) p.s.position.x += 110;
      if (dz > 55) p.s.position.z -= 110;
      if (dz < -55) p.s.position.z += 110;
      // Tiefe vor der Kamera: unter 2 m unsichtbar, ab 12 m voll. Am Kastenrand (55 m) ebenso aus.
      const depth = rel.subVectors(p.s.position, c).dot(ahead);
      const edge = Math.max(Math.abs(p.s.position.x - c.x), Math.abs(p.s.position.z - c.z));
      const fade = THREE.MathUtils.smoothstep(depth, 2, 12) * (1 - THREE.MathUtils.smoothstep(edge, 40, 54));
      p.s.material.opacity = FOG_OPACITY * fade * cover;
      p.s.visible = p.s.material.opacity > 0.002;
    }
  });
}

// Sprühhauch eines Aufschlags, von der Seite gesehen: weich, breiter als hoch, unten am dichtesten,
// darin ein paar hellere Tröpfchen. Einzelne Tropfen wären aus Gehhöhe kleiner als ein Pixel.
function splashMask() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 48;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, 64, 48);
  g.save();
  g.scale(1.4, 1);
  const glow = g.createRadialGradient(23, 47, 0, 23, 47, 20);
  glow.addColorStop(0, 'rgba(255,255,255,0.85)');
  glow.addColorStop(0.45, 'rgba(255,255,255,0.3)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, 64, 48);
  g.restore();
  g.fillStyle = '#fff';
  for (let i = 0; i < 7; i++) {
    const a = (i / 6) * Math.PI;
    g.beginPath();
    g.arc(32 - Math.cos(a) * (12 + (i % 3) * 6), 46 - Math.sin(a) * (12 + (i % 2) * 12), 3, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}
