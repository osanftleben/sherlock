import * as THREE from 'three';
import { Bag, addMesh, std } from '../kit.js';

// Quai und Spree.
export function buildRiver(loc, FOG) {
  const { scene } = loc;
  // Quai und Spree
  const QUAY = 44;
  loc.collide(-300, 300, QUAY, QUAY + 40);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(720, 80),
    new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        deep: { value: new THREE.Color(0x05090f) },
        sheen: { value: new THREE.Color(0x4c6288) },
        warm: { value: new THREE.Color(1.1, 0.72, 0.28) },
        fogColor: { value: new THREE.Color(FOG) },
      },
      vertexShader: `
        varying vec3 vW; varying float vD;
        void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz;
          vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `
        uniform float time; uniform vec3 deep; uniform vec3 sheen; uniform vec3 warm; uniform vec3 fogColor;
        varying vec3 vW; varying float vD;
        float n(vec2 p){ return sin(p.x)*sin(p.y); }
        void main(){
          vec2 p = vW.xz;
          float w = n(p*vec2(0.7,2.4)+vec2(time*0.5,time*0.2)) + 0.5*n(p*vec2(1.7,5.1)-vec2(time*0.7,0.0)) + 0.25*n(p*vec2(3.9,9.0)+time);
          float glint = smoothstep(0.55,1.3,w);
          float lamp = 0.0;
          float lane = mod(vW.x+10.0, 20.0)-10.0;
          float fall = exp(-(vW.z-44.0)*0.1);
          lamp = exp(-pow((lane + w*1.5)*1.1, 2.0)) * fall * (0.65 + 0.35*w);
          vec3 c = deep + sheen*glint*0.2 + warm*lamp*0.75;
          float f = 1.0 - exp(-pow(vD*0.0125, 2.0));
          gl_FragColor = vec4(mix(c, fogColor, f), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -1.1, QUAY + 40);
  scene.add(water);
  loc.onUpdate((dt, t) => { water.material.uniforms.time.value = t; });
  // Quaimauer und Ufergeländer
  const quay = new Bag();
  quay.box(0x3a3a3c, 720, 1.6, 1.0, 0, -0.8, QUAY + 0.5);
  quay.box(0x505054, 720, 0.1, 1.2, 0, 0.05, QUAY + 0.2);
  for (let x = -210; x < 210; x += 2.4) {
    quay.box(0x101312, 0.06, 1.0, 0.06, x, 0.55, QUAY + 0.1);
  }
  quay.box(0x101312, 420, 0.07, 0.09, 0, 1.05, QUAY + 0.1);
  quay.box(0x101312, 420, 0.05, 0.05, 0, 0.45, QUAY + 0.1);
  addMesh(scene, quay.build(), std({ vertexColors: true, roughness: 0.6 }));
}
