import * as THREE from 'three';
import { fogPuff } from '../textures.js';

export function buildWeather(loc, r) {
  const { scene } = loc;
  // Bodennebel, der dem Spieler folgt.
  const fogMat = new THREE.SpriteMaterial({ map: fogPuff(), color: 0x6c7a90, transparent: true, opacity: 0.11, depthWrite: false, fog: false });
  const puffs = [];
  for (let i = 0; i < 26; i++) {
    const s = new THREE.Sprite(fogMat);
    const size = 16 + r() * 18;
    s.scale.set(size, size * 0.45, 1);
    s.position.set((r() - 0.5) * 110, 1.3 + r() * 2.5, (r() - 0.5) * 110);
    scene.add(s);
    puffs.push({ s, vx: 0.2 + r() * 0.3 });
  }

  // Nieselregen als kurze Linien in einem Kasten um die Kamera.
  const N = 900;
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
  // Überdachte Stellen (loc.dry: Rechtecke, etwa Tordurchfahrten oder der Viaduktbogen), dort
  // fällt bis zur Höhe `top` (sonst 4,5 m) kein Regen. Feste Anzahl, damit sich der Shader nicht
  // ändert, wenn ein Viertel mehr oder weniger hat.
  const DRY = 4;
  if ((loc.dry?.length ?? 0) > DRY) console.warn(`weather.js: nur ${DRY} trockene Stellen, ${loc.dry.length} eingetragen`);
  const dry = Array.from({ length: DRY }, (_, i) => {
    const d = loc.dry?.[i];
    return d ? new THREE.Vector4(d.minX, d.maxX, d.minZ, d.maxZ) : new THREE.Vector4(0, -1, 0, -1);
  });
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
    fragmentShader: `varying float vA; void main(){ gl_FragColor = vec4(0.65, 0.72, 0.85, vA * 0.2); }`,
  }));
  rain.frustumCulled = false;
  scene.add(rain);

  loc.onUpdate((dt, t, { camera }) => {
    rain.material.uniforms.time.value = t;
    rain.material.uniforms.origin.value.copy(camera.position);
    for (const p of puffs) {
      p.s.position.x += p.vx * dt;
      const dx = p.s.position.x - camera.position.x;
      const dz = p.s.position.z - camera.position.z;
      if (dx > 55) p.s.position.x -= 110;
      if (dx < -55) p.s.position.x += 110;
      if (dz > 55) p.s.position.z -= 110;
      if (dz < -55) p.s.position.z += 110;
    }
  });
}
