import * as THREE from 'three';
import { Bag, addMesh, box, matte, merge, std } from '../kit.js';
import { quayStone } from '../textures.js';

// Wasserspiegel der Spree unter der Quaikante (y = 0). Berliner Quais liegen zwei bis drei Meter
// über dem Mittelwasser; die Mauer reicht noch einen guten Meter darunter.
export const WATER_Y = -2.7;
const WALL_FOOT = -4;

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
  water.position.set(0, WATER_Y, QUAY + 40);
  scene.add(water);
  loc.onUpdate((dt, t) => { water.material.uniforms.time.value = t; });

  // Quaimauer aus Granitquadern bis unter das Wasser. Die UVs laufen in Metern / 4, die Kachel ist
  // 4 m hoch und beginnt an der Quaikante, damit der nasse Streifen auf der Wasserlinie liegt.
  const stone = [box(720, -WALL_FOOT, 1.0, 0, WALL_FOOT / 2, QUAY + 0.5, 0.25)];
  // Deckplatte und Ufergeländer
  const quay = new Bag();
  quay.box(0x505054, 720, 0.12, 1.5, 0, 0.04, QUAY + 0.35);
  for (let x = -210; x < 210; x += 2.4) {
    quay.box(0x101312, 0.06, 1.0, 0.06, x, 0.55, QUAY + 0.1);
  }
  buildLandingStairs(stone, quay, QUAY);
  addMesh(scene, merge(stone), matte(quayStone(-WATER_Y)));
  addMesh(scene, quay.build(), std({ vertexColors: true, roughness: 0.6 }));
}

// Treppe zum Wasser, außen an der Mauer: oben ein Absatz hinter einer Lücke im Geländer (mit
// Kette davor), dann die Stufen ostwärts hinab zu einem Podest knapp über dem Wasser. Die
// Stirnseite des Podests zeigt die Mauer mit dem nassen Streifen.
const GAP = [8.4, 10.8];
function buildLandingStairs(stone, quay, QUAY) {
  const z0 = QUAY + 1.1;
  const depth = 1.4;
  const zc = z0 + depth / 2;
  const block = (x0, x1, top) => stone.push(box(x1 - x0, top - WALL_FOOT, depth, (x0 + x1) / 2, (top + WALL_FOOT) / 2, zc, 0.25));
  const landing = WATER_Y + 0.35;
  const steps = 15;
  const rise = -landing / steps;
  const tread = 0.3;
  block(GAP[0], GAP[1], 0);
  let x = GAP[1];
  for (let i = 1; i <= steps; i++, x += tread) block(x, x + tread, -rise * i);
  const end = x + 2.2;
  block(x - tread, end, landing);

  // Geländer des Quais mit der Lücke; die Holme laufen beiderseits bis an die Pfosten.
  const iron = 0x101312;
  for (const [a, b] of [[-210, GAP[0]], [GAP[1], 210]]) {
    quay.box(iron, b - a, 0.07, 0.09, (a + b) / 2, 1.05, QUAY + 0.1);
    quay.box(iron, b - a, 0.05, 0.05, (a + b) / 2, 0.45, QUAY + 0.1);
  }
  // Kette quer über die Lücke, leicht durchhängend.
  const n = 8;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const sag = 0.18 * 4 * t * (1 - t);
    quay.box(0x1a1b1c, (GAP[1] - GAP[0]) / n + 0.02, 0.035, 0.035, GAP[0] + t * (GAP[1] - GAP[0]), 0.85 - sag, QUAY + 0.1);
  }
  // Außengeländer der Treppe: Pfosten auf den Stufen, der Handlauf folgt der Neigung.
  const zr = z0 + depth - 0.08;
  const posts = [GAP[0], GAP[1]];
  for (let px = GAP[1] + 1.2; px < x - tread; px += 1.2) posts.push(px);
  posts.push(x - tread / 2, end - 0.1);
  const topAt = (px) => {
    if (px <= GAP[1]) return 0;
    const i = Math.min(steps, Math.floor((px - GAP[1]) / tread) + 1);
    return px >= x - tread ? landing : -rise * i;
  };
  for (const px of posts) quay.box(iron, 0.05, 1.0, 0.05, px, topAt(px) + 0.5, zr);
  const rail = (x0, y0, x1, y1) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const g = new THREE.BoxGeometry(len, 0.06, 0.07);
    g.rotateZ(Math.atan2(y1 - y0, x1 - x0));
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, zr);
    quay.add(g, iron);
  };
  rail(GAP[0], 1.0, GAP[1], 1.0);
  rail(GAP[1], 1.0, x - tread / 2, landing + 1.0);
  rail(x - tread / 2, landing + 1.0, end - 0.1, landing + 1.0);
}
