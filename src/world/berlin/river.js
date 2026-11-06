import * as THREE from 'three';
import { Bag, addMesh, box, cyl, matte, merge, roofPrism, std } from '../kit.js';
import { quayStone, softDisc } from '../textures.js';

// Wasserspiegel der Spree unter der Quaikante (y = 0). Berliner Quais liegen zwei bis drei Meter
// über dem Mittelwasser; die Mauer reicht noch einen guten Meter darunter.
export const WATER_Y = -2.7;
const WALL_FOOT = -4;

// Kahn an der Treppe: Mitte, Länge, Laterne am Heck (relativ zur Mitte, Höhe über dem Wasser).
const BARGE = { x: 23, z: 48.7, length: 18, beam: 4 };
const BARGE_LANTERN = new THREE.Vector3(-8.3, 3.3, 0);

// Quai und Spree. `bank` ist die Spiegelkarte des Gegenufers aus horizon.js.
export function buildRiver(loc, FOG, bank) {
  const { scene } = loc;
  // Quai und Spree
  const QUAY = 44;
  loc.collide(-300, 300, QUAY, QUAY + 40);
  // Wasser: Grundton, Wellenglanz, Lichtbahnen der Quai-Laternen und der Kahnlaterne, dazu die
  // Spiegelung des Gegenufers. Für sie wird der Sehstrahl am Wasser gespiegelt und bis zur
  // Uferlinie verfolgt; die Wellen verschieben ihn, so werden aus Fenstern zitternde Lichtbahnen.
  // Die Lichtbahnen liegen in der senkrechten Ebene durch Auge und Licht, laufen also strahlenförmig
  // vom Betrachter weg. Steht er dicht an der Laternenreihe, wird er dafür ein Stück zurückgesetzt.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(720, 80),
    new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        deep: { value: new THREE.Color(0x05090f) },
        sheen: { value: new THREE.Color(0x4c6288) },
        warm: { value: new THREE.Color(1.1, 0.72, 0.28) },
        fogColor: { value: new THREE.Color(FOG) },
        waterY: { value: WATER_Y },
        bank: { value: bank.map },
        bankFrame: { value: bank.frame },
        bankDark: { value: bank.silhouette },
        bankWin: { value: bank.window },
        boat: { value: new THREE.Vector3(BARGE.x + BARGE_LANTERN.x, BARGE.z + BARGE_LANTERN.z, 1) },
      },
      vertexShader: `
        varying vec3 vW; varying float vD;
        void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz;
          vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `
        uniform float time; uniform vec3 deep; uniform vec3 sheen; uniform vec3 warm; uniform vec3 fogColor;
        uniform float waterY; uniform sampler2D bank; uniform vec4 bankFrame; uniform vec3 bankDark; uniform vec3 bankWin;
        uniform vec3 boat;
        varying vec3 vW; varying float vD;
        float n(vec2 p){ return sin(p.x)*sin(p.y); }
        float hash(vec2 c){ return fract(sin(dot(c, vec2(127.1, 311.7))) * 43758.5453); }
        // Regenring: ein Tropfen je Zelle (Kante size), an zufälliger Stelle, alle 1,6 bis 3 s.
        // Der Ring wächst in 0,9 s auf 0,3 der Zelle (bleibt also in ihr) und verblasst dabei.
        float ring(vec2 p, float size, float seed){
          vec2 c = floor(p / size);
          float h = hash(c + seed);
          float age = mod(time + h * 7.0, 1.6 + h * 1.4) / 0.9;
          vec2 ctr = (c + 0.3 + 0.4 * vec2(h, fract(h * 13.7))) * size;
          float r = length(p - ctr);
          float width = 0.035 + fwidth(r) * 1.5;
          float rad = age * 0.3 * size;
          float k = (1.0 - age) * step(age, 1.0) * 0.035 / width;
          // Außenring und ein schwächerer innerer, der ihm nachläuft.
          return k * (exp(-pow((r - rad) / width, 2.0)) + 0.5 * exp(-pow((r - rad * 0.55) / width, 2.0)));
        }
        // x des Lichts in Tiefe zl, das auf der Linie Auge–Wasserpunkt liegt.
        float along(float zl, float zv){ return cameraPosition.x + (vW.x - cameraPosition.x) * (zl - zv) / max(vW.z - zv, 0.5); }
        void main(){
          vec2 p = vW.xz;
          // Nieselregen: zwei versetzte Raster, nur in der Nähe (in der Ferne flimmerten sie nur).
          float rain = (ring(p, 1.5, 0.0) + ring(p + 0.75, 1.9, 17.0)) * (1.0 - smoothstep(8.0, 30.0, vD));
          float w = n(p*vec2(0.7,2.4)+vec2(time*0.5,time*0.2)) + 0.5*n(p*vec2(1.7,5.1)-vec2(time*0.7,0.0)) + 0.25*n(p*vec2(3.9,9.0)+time);
          w += rain * 1.4;
          float wx = n(p*vec2(2.3,0.9)+vec2(time*0.4,-time*0.3));
          float glint = smoothstep(0.55,1.3,w);
          float zv = min(cameraPosition.z, 36.0);

          // Quai-Laternen: x = 10 + 20 k bis ±210, Lichtbahn ab der Mauerkante.
          float xl = along(44.0, zv);
          float lane = mod(xl, 20.0) - 10.0;
          float fall = exp(-(vW.z-44.0)*0.1) * step(abs(xl), 215.0);
          float lamp = exp(-pow((lane + w*1.5)*1.1, 2.0)) * fall * (0.65 + 0.35*w);

          // Kahnlaterne: Lichtbahn jenseits des Kahns.
          float xb = along(boat.y, zv) - boat.x;
          float lantern = exp(-pow((xb + w*0.7)*1.6, 2.0)) * exp(-(vW.z-boat.y)*0.12) * step(boat.y, vW.z) * (0.6 + 0.4*w) * boat.z;

          // Gegenufer: gespiegelter Sehstrahl bis zur Uferlinie, Höhe darüber in Metern.
          float e = max(cameraPosition.y - waterY, 0.3);
          float dz = max(vW.z - cameraPosition.z, 0.5);
          float ratio = (bankFrame.w - cameraPosition.z) / dz;
          float reach = max(bankFrame.w - vW.z, 0.0);
          float hb = e * (ratio - 1.0) + w * 0.08 * reach;
          float xr = cameraPosition.x + (vW.x - cameraPosition.x) * ratio + wx * 0.02 * reach;
          vec2 m = texture2D(bank, vec2((xr - bankFrame.x) / bankFrame.y, clamp(hb / bankFrame.z, 0.0, 0.999))).rg;
          float cosv = e / sqrt(e*e + dz*dz);
          float F = 0.02 + 0.98 * pow(1.0 - cosv, 5.0);
          vec3 refl = mix(fogColor * 1.1, bankDark, m.r) + bankWin * m.g * 1.6;

          vec3 c = deep * (1.0 - F) + refl * F + sheen*(glint*0.12 + rain*0.5) + warm*(lamp*0.75 + lantern*0.6);
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
  const barge = buildBarge(scene);
  // Für den Klang: Abstand zur Quaimauer und zum Kahn, Seite (-1 links, 1 rechts) vom Hörer aus.
  loc.river = { distance: Infinity, barge: Infinity, pan: 0, bargePan: 0 };
  loc.onUpdate((dt, t, { camera, player }) => {
    const { x, z } = camera.position;
    const yaw = player.yaw;
    const side = (dx, dz) => (Math.cos(yaw) * dx - Math.sin(yaw) * dz) / Math.max(Math.hypot(dx, dz), 1e-3);
    loc.river.distance = Math.max(0, QUAY + 1 - z);
    loc.river.pan = side(0, 1);
    loc.river.barge = Math.hypot(BARGE.x - x, BARGE.z - z);
    loc.river.bargePan = side(BARGE.x - x, BARGE.z - z);
    water.material.uniforms.time.value = t;
    // Der Kahn hebt sich und rollt kaum merklich mit den Wellen.
    barge.position.y = WATER_Y + Math.sin(t * 0.9) * 0.03;
    barge.rotation.x = Math.sin(t * 0.7) * 0.008;
    barge.rotation.z = Math.sin(t * 0.53 + 1) * 0.004;
  });

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
  buildMooring(quay, QUAY);
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

// Seil zwischen zwei Punkten, in der Mitte um `sag` durchhängend.
function rope(bag, a, b, sag = 0.12) {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  mid.y -= sag;
  const up = new THREE.Vector3(0, 1, 0);
  for (const [p, q] of [[a, mid], [mid, b]]) {
    const d = new THREE.Vector3().subVectors(q, p);
    const g = new THREE.CylinderGeometry(0.022, 0.022, d.length(), 5);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d.normalize()));
    const c = p.clone().add(q).multiplyScalar(0.5);
    g.translate(c.x, c.y, c.z);
    bag.add(g, 0x2b261d);
  }
}

// Poller auf dem Podest und auf dem Mauersims, Leinen zu Heck und Bug.
function buildMooring(quay, QUAY) {
  const landing = WATER_Y + 0.35;
  const bollard = (x, y, z) => {
    quay.add(cyl(0.13, 0.16, 0.42, x, y + 0.21, z, 8), 0x141615);
    quay.add(cyl(0.19, 0.19, 0.06, x, y + 0.45, z, 8), 0x141615);
    return new THREE.Vector3(x, y + 0.36, z);
  };
  const deck = WATER_Y + 0.62;
  rope(quay, bollard(17, landing, QUAY + 2.1), new THREE.Vector3(BARGE.x - 7.2, deck, BARGE.z - BARGE.beam / 2 + 0.1));
  rope(quay, bollard(31.4, 0.1, QUAY + 0.7), new THREE.Vector3(BARGE.x + 7.6, deck, BARGE.z - 1.5), 0.35);
}

// Beladener Spreekahn mit Plane über der Fracht, Wohnkajüte und Laterne am Heck. Der Kahn ist
// eine Gruppe, die mit den Wellen schaukelt; Wasserlinie bei y = 0 der Gruppe.
function buildBarge(scene) {
  const { length, beam } = BARGE;
  const a = length / 2;
  const b = beam / 2;
  const hullShape = (s = 1) => {
    const sh = new THREE.Shape();
    sh.moveTo(-(a - 1) * s, -b * s);
    sh.lineTo((a - 3) * s, -b * s);
    sh.quadraticCurveTo(a * s, -b * s, a * s, 0);
    sh.quadraticCurveTo(a * s, b * s, (a - 3) * s, b * s);
    sh.lineTo(-(a - 1) * s, b * s);
    sh.quadraticCurveTo(-a * s, b * s, -a * s, 0);
    sh.quadraticCurveTo(-a * s, -b * s, -(a - 1) * s, -b * s);
    return sh;
  };
  const hull = (s, depth, y) => {
    const g = new THREE.ExtrudeGeometry(hullShape(s), { depth, bevelEnabled: false, curveSegments: 6 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, y, 0);
    return g;
  };
  const bag = new Bag();
  // Rumpf von 1 m unter bis 0,6 m über Wasser, mit Scheuerleiste.
  bag.add(hull(1, 1.6, -1), 0x2a2219);
  bag.add(hull(1.015, 0.12, 0.42), 0x4a3c2a);
  // Fracht unter der Plane, mit Leinen quer darüber.
  bag.add(roofPrism(11, 1.3, beam - 0.5, 0.5, 0.6, 0), 0x4a5040);
  for (let x = -4.5; x <= 5.5; x += 2) bag.box(0x1d1a14, 0.05, 0.06, beam - 0.3, x, 1.25, 0);
  // Wohnkajüte am Heck mit Dach und Ofenrohr.
  bag.box(0x5a4530, 2.2, 1.5, 3, -6.6, 1.35, 0);
  bag.box(0x2a231c, 2.5, 0.08, 3.3, -6.6, 2.14, 0);
  bag.add(cyl(0.06, 0.06, 0.8, -6.0, 2.55, 0.8, 6), 0x101010);
  // Ruder und Laternenstange am Heck.
  bag.box(0x17130f, 0.12, 1.8, 0.9, -a - 0.1, 0.1, 0);
  bag.add(cyl(0.04, 0.05, 2.6, BARGE_LANTERN.x, 1.9, BARGE_LANTERN.z, 6), 0x101010);
  bag.box(0x101010, 0.24, 0.04, 0.24, BARGE_LANTERN.x, BARGE_LANTERN.y + 0.16, BARGE_LANTERN.z);

  const group = new THREE.Group();
  group.position.set(BARGE.x, WATER_Y, BARGE.z);
  addMesh(group, bag.build(), matte({ vertexColors: true }));
  // Laternenglas und das Fenster der Kajüte zur Uferseite.
  const lit = new THREE.MeshBasicMaterial({ color: new THREE.Color(4.2, 2.6, 1.1) });
  addMesh(group, box(0.18, 0.28, 0.18, BARGE_LANTERN.x, BARGE_LANTERN.y, BARGE_LANTERN.z), lit);
  addMesh(group, box(0.55, 0.4, 0.03, -6.6, 1.5, -1.51), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 0.68, 0.28) }));
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('lampGlow'), color: 0xffa858, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.position.copy(BARGE_LANTERN);
  glow.scale.setScalar(1.6);
  group.add(glow);
  scene.add(group);
  return group;
}
