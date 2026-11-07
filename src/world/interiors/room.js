import * as THREE from 'three';
import { Location } from '../../engine/location.js';
import { SHADOW_ONLY } from '../holmes.js';
import { Bag, addMesh, box, cyl, merge, std } from '../kit.js';
import { WINDOW_VIEW, clockFace, rainOnGlass, softDisc, windowView, wood } from '../textures.js';

// Abstand der Häuser gegenüber hinter den Fenstern, in Metern (Straßenbreite).
const VIEW_DEPTH = 12;

// Gebogener Rundstab durch die Punkte [x, y, z].
export function rod(points, r) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  return new THREE.TubeGeometry(curve, points.length * 6, r, 6, false);
}

// Gedrechseltes Tischbein der Länge h, Fuß bei y = 0: Wulst, Hals, Vase, Ring.
const LEG = [[0.018, 0], [0.023, 0.02], [0.016, 0.05], [0.019, 0.25], [0.027, 0.45], [0.029, 0.58], [0.024, 0.7], [0.018, 0.78], [0.025, 0.88], [0.028, 1]];
export function turnedLeg(h) {
  return new THREE.LatheGeometry(LEG.map(([r, t]) => new THREE.Vector2(r, t * h)), 10);
}

// Stuben entstehen nach demselben Muster: Raum um den Ursprung, Tür in der Südwand (+Z).
export class Room {
  constructor({ id, name, w, d, h = 3.5, wall, floor, ceiling = 0x4a4438, surface = 'wood', ambience = 'interior', ambient = 0.5 }) {
    const loc = (this.loc = new Location(id, name, { ambience, surface }));
    this.w = w;
    this.d = d;
    this.h = h;
    this.woodBag = new Bag();
    this.plainBag = new Bag();
    this.metalBag = new Bag();
    this.glassBag = new Bag();
    // Selbstleuchtendes ohne Licht (Lampenglas, Schirminnenseiten).
    this.glowBag = new Bag();
    const scene = (this.scene = loc.scene);
    scene.background = new THREE.Color(0x050403);
    scene.add(new THREE.HemisphereLight(0xcdb596, 0x4a3828, ambient * 3));

    const wallMat = std({ ...wall, roughness: 0.95 });
    const wallBag = [
      box(w, h, 0.2, 0, h / 2, -d / 2 - 0.1, 0.5),
      box(w, h, 0.2, 0, h / 2, d / 2 + 0.1, 0.5),
      box(0.2, h, d, -w / 2 - 0.1, h / 2, 0, 0.5),
      box(0.2, h, d, w / 2 + 0.1, h / 2, 0, 0.5),
    ];
    addMesh(scene, merge(wallBag), wallMat);

    const floorMat = std({ ...floor, roughness: 0.6 });
    addMesh(scene, box(w, 0.1, d, 0, -0.05, 0, 0.5), floorMat);
    addMesh(scene, box(w, 0.1, d, 0, h + 0.05, 0), std({ color: ceiling, roughness: 1 }));

    // Fußleiste und Wandfries
    this.woodBag.box(0x4a3020, w, 0.22, 0.04, 0, 0.11, -d / 2 + 0.02);
    this.woodBag.box(0x4a3020, w, 0.22, 0.04, 0, 0.11, d / 2 - 0.02);
    this.woodBag.box(0x4a3020, 0.04, 0.22, d, -w / 2 + 0.02, 0.11, 0);
    this.woodBag.box(0x4a3020, 0.04, 0.22, d, w / 2 - 0.02, 0.11, 0);

    loc.collide(-w / 2 - 1, w / 2 + 1, -d / 2 - 1, -d / 2);
    loc.collide(-w / 2 - 1, w / 2 + 1, d / 2, d / 2 + 1);
    loc.collide(-w / 2 - 1, -w / 2, -d / 2, d / 2);
    loc.collide(w / 2, w / 2 + 1, -d / 2, d / 2);

    // Tür hinaus
    this.woodBag.box(0x3a2416, 1.1, 2.3, 0.08, 0, 1.15, d / 2 - 0.05);
    this.woodBag.box(0x241509, 1.3, 2.45, 0.05, 0, 1.2, d / 2 - 0.02);
    this.metalBag.box(0xb09050, 0.08, 0.08, 0.08, 0.42, 1.05, d / 2 - 0.12);
    loc.addHotspot({ id: 'exit', pos: [0, 1.3, d / 2 - 0.1], radius: 0.8, range: 2.6, label: 'Hinaus auf die Straße', action: { exit: true } });

    loc.spawn = { pos: [0, 0, d / 2 - 1], yaw: 0 };
  }

  solid(x, z, w, d) {
    this.loc.collide(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
  }

  // Tisch mit abgesetzter Platte, Zarge und gedrechselten Beinen unter einem Vierkantklotz.
  table(x, z, w, d, h = 0.78, color = 0x5a3a22, collide = true) {
    const dark = new THREE.Color(color).multiplyScalar(0.78);
    const bag = this.woodBag;
    bag.box(color, w, 0.035, d, x, h + 0.0125, z);
    bag.box(color, w - 0.03, 0.02, d - 0.03, x, h - 0.015, z);
    this.roundEdge(color, x, h + 0.012, z, w, d, 0.018);
    for (const s of [-1, 1]) {
      bag.box(dark, w - 0.16, 0.09, 0.022, x, h - 0.07, z + s * (d / 2 - 0.08));
      bag.box(dark, 0.022, 0.09, d - 0.16, x + s * (w / 2 - 0.08), h - 0.07, z);
    }
    const leg = turnedLeg(h - 0.125);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const lx = x + sx * (w / 2 - 0.08);
        const lz = z + sz * (d / 2 - 0.08);
        bag.box(color, 0.055, 0.1, 0.055, lx, h - 0.075, lz);
        bag.add(leg.clone().translate(lx, 0, lz), color);
      }
    }
    if (collide) this.solid(x, z, w, d);
  }

  // Gerundete Kante um eine rechteckige Platte: vier liegende Rundstäbe.
  roundEdge(color, x, y, z, w, d, r) {
    for (const s of [-1, 1]) {
      this.woodBag.add(new THREE.CylinderGeometry(r, r, w, 8).rotateZ(Math.PI / 2).translate(x, y, z + s * (d / 2 - r * 0.4)), color);
      this.woodBag.add(new THREE.CylinderGeometry(r, r, d, 8).rotateX(Math.PI / 2).translate(x + s * (w / 2 - r * 0.4), y, z), color);
    }
  }

  // Bugholzstuhl: runder Sitz mit Wiener Geflecht, gespreizte Beine mit Fußreif; die
  // Hinterbeine laufen in einem Bogen als Lehne durch, darin ein zweiter, kleinerer Bogen.
  chair(x, z, facing = 0, color = 0x4a2e1c) {
    const parts = [
      [cyl(0.205, 0.2, 0.03, 0, 0.455, 0, 20), color],
      [cyl(0.19, 0.19, 0.004, 0, 0.471, 0, 20), 0x9a7a48],
      [new THREE.TorusGeometry(0.205, 0.012, 6, 24).rotateX(Math.PI / 2).translate(0, 0.465, 0), color],
      [rod([[-0.17, 0, -0.2], [-0.15, 0.45, -0.16], [-0.155, 0.72, -0.2], [-0.125, 0.88, -0.23], [0, 0.93, -0.245], [0.125, 0.88, -0.23], [0.155, 0.72, -0.2], [0.15, 0.45, -0.16], [0.17, 0, -0.2]], 0.015), color],
      [rod([[-0.11, 0.47, -0.17], [-0.115, 0.66, -0.195], [0, 0.78, -0.215], [0.115, 0.66, -0.195], [0.11, 0.47, -0.17]], 0.011), color],
      [new THREE.TorusGeometry(0.2, 0.008, 5, 24).rotateX(Math.PI / 2).scale(1, 1, 1.05).translate(0, 0.2, -0.01), color],
    ];
    for (const s of [-1, 1]) parts.push([rod([[s * 0.13, 0.45, 0.12], [s * 0.155, 0.22, 0.15], [s * 0.18, 0, 0.18]], 0.014), color]);
    for (const [g, c] of parts) this.woodBag.add(g.rotateY(facing).translate(x, 0, z), c);
    this.solid(x, z, 0.5, 0.5);
  }

  armchair(x, z, facing = 0, color = 0x5c2420) {
    const g = new THREE.Group();
    const bag = new Bag();
    bag.box(color, 0.84, 0.42, 0.8, 0, 0.26, 0);
    bag.box(color, 0.84, 0.82, 0.18, 0, 0.82, -0.32);
    bag.box(color, 0.15, 0.58, 0.8, -0.38, 0.52, 0);
    bag.box(color, 0.15, 0.58, 0.8, 0.38, 0.52, 0);
    g.add(new THREE.Mesh(bag.build(), std({ vertexColors: true, roughness: 0.85 })));
    g.position.set(x, 0, z);
    g.rotation.y = facing;
    this.scene.add(g);
    this.solid(x, z, 0.85, 0.85);
  }

  // Petroleum-Hängelampe: Das Licht sitzt im mattierten Glaszylinder, darüber ein weiter Blechschirm
  // (außen emailliert, innen hell), darunter der Ölbehälter aus Messing. Schirm und Behälter
  // verdecken die Flamme aus den meisten Blickwinkeln; der Zylinder leuchtet warm, ohne zu blenden.
  // visible: false ergibt reines Fülllicht ohne sichtbare Lampe.
  lamp(x, y, z, { intensity = 9, color = 0xffb06a, range = 14, glow = 1.0, hang = true, visible = true, shade = 0x2a3a26 } = {}) {
    const power = intensity * 2.6;
    const l = new THREE.PointLight(color, power, range, 1.8);
    l.position.set(x, y, z);
    this.scene.add(l);
    const at = (g) => g.translate(x, y, z);
    const turned = (pts, seg = 20) => new THREE.LatheGeometry(pts.map(([r, py]) => new THREE.Vector2(r, py)), seg);
    if (visible) {
      const brass = 0xa58a4a;
      const SHADE = [[0.29, 0], [0.255, 0.035], [0.17, 0.11], [0.085, 0.18], [0.06, 0.205]];
      this.plainBag.add(at(turned(SHADE, 28)), shade);
      // Innenseite: eigene Fläche mit Normalen nach innen, ungerührt vom Licht gleichmäßig hell.
      this.glowBag.add(at(turned(SHADE.map(([r, py]) => [r * 0.965, py - 0.004]).reverse(), 28)), new THREE.Color(0.62, 0.48, 0.32));
      this.metalBag.add(at(new THREE.TorusGeometry(0.29, 0.007, 5, 32).rotateX(Math.PI / 2)), brass);
      this.glowBag.add(at(turned([[0.026, -0.005], [0.043, 0.035], [0.048, 0.08], [0.038, 0.125], [0.027, 0.16], [0.024, 0.24]], 14)), new THREE.Color(1.25, 0.82, 0.42));
      this.metalBag.add(at(cyl(0.032, 0.03, 0.025, 0, -0.012, 0, 14)), brass);
      this.metalBag.add(at(turned([[0, -0.155], [0.035, -0.152], [0.07, -0.12], [0.078, -0.085], [0.058, -0.045], [0.03, -0.028], [0.03, -0.02]], 18)), brass);
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2;
        this.metalBag.add(at(rod([[Math.cos(a) * 0.27, 0, Math.sin(a) * 0.27], [Math.cos(a) * 0.075, -0.09, Math.sin(a) * 0.075]], 0.004)), brass);
      }
      // Rauchglocke über dem Zylinder.
      this.metalBag.add(at(cyl(0.02, 0.055, 0.04, 0, 0.29, 0, 12)), brass);
      // Schwacher Schein im Tabakdunst unter dem Schirm.
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('glow'), color: 0xffb060, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.position.set(x, y - 0.03, z);
      s.scale.setScalar(glow * 0.8);
      this.scene.add(s);
    }
    if (hang) {
      const top = visible ? y + 0.31 : y;
      this.metalBag.box(0x1a1610, 0.015, this.h - top, 0.015, x, (this.h + top) / 2, z);
    }
    const seed = x * 3.1 + z;
    this.loc.onUpdate((dt, t) => {
      l.intensity = power * (0.95 + 0.05 * Math.sin(t * 8 + seed) * Math.sin(t * 3.1 + seed));
    });
    return l;
  }

  // Blick hinaus auf die Häuser gegenüber (windowView), mit Regen auf der Scheibe. Die Wand hat
  // kein Loch: Der Shader verlängert jeden Sehstrahl von der Scheibe bis zur gemalten Häuserzeile
  // VIEW_DEPTH Meter dahinter. So verschiebt sich der Ausblick, wenn man sich bewegt, und
  // mehrere Fenster derselben Wand zeigen dieselbe Straße.
  // chosen legt den Ausschnitt fest (0 bis 1 über die Straßenbreite), wenn der aus der
  // Raumkennung abgeleitete nur Fassade zeigt.
  viewMaterial(wall, chosen = null) {
    this.viewMats ??= {};
    if (this.viewMats[wall]) return this.viewMats[wall];
    // Nach außen und längs der Wand, je Wand des Raums (Tür im Süden, +z).
    const dirs = { east: [[1, 0, 0], [0, 0, -1]], west: [[-1, 0, 0], [0, 0, 1]], south: [[0, 0, 1], [1, 0, 0]], north: [[0, 0, -1], [-1, 0, 0]] };
    const [out, side] = dirs[wall].map((v) => new THREE.Vector3(...v));
    // Jeder Raum und jede Wand blickt auf ein anderes Stück der Straße.
    let shift = { east: 0.13, west: 0.61, south: 0.37, north: 0.84 }[wall];
    for (const ch of this.loc.id) shift += ch.charCodeAt(0) * 0.0173;
    if (chosen !== null) shift = chosen;
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uView: { value: windowView() },
        uDrops: { value: rainOnGlass() },
        uTime: { value: 0 },
        uOut: { value: out },
        uSide: { value: side },
        uShift: { value: shift % 1 },
      },
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform sampler2D uView;
        uniform sampler2D uDrops;
        uniform float uTime;
        uniform vec3 uOut;
        uniform vec3 uSide;
        uniform float uShift;
        varying vec3 vWorld;
        void main() {
          vec3 d = normalize(vWorld - cameraPosition);
          vec3 q = vWorld + d * (${VIEW_DEPTH.toFixed(1)} / max(dot(d, uOut), 0.08));
          vec2 uv = vec2(dot(q, uSide) / ${WINDOW_VIEW.w.toFixed(1)} + uShift, (q.y - (${WINDOW_VIEW.y0.toFixed(1)})) / ${WINDOW_VIEW.h.toFixed(1)});
          vec2 g = vec2(dot(vWorld, uSide), vWorld.y) / 0.45;
          float bead = texture2D(uDrops, g).r;
          float run = texture2D(uDrops, vec2(g.x * 0.5 + 0.37, g.y * 0.3 + uTime * 0.04)).g;
          float drop = max(bead, run * 0.6);
          vec3 col = texture2D(uView, uv + vec2(0.0, drop * 0.006)).rgb * 0.9;
          col = mix(col, col * 1.7 + vec3(0.010, 0.012, 0.016), drop);
          col += vec3(0.003, 0.004, 0.006);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.loc.onUpdate((dt, t) => {
      mat.uniforms.uTime.value = t;
    });
    this.viewMats[wall] = mat;
    return mat;
  }

  window(wall, along, y, w, h, shift = null) {
    const off = wall === 'east' ? this.w / 2 - 0.05 : -this.w / 2 + 0.05;
    const pane = new THREE.PlaneGeometry(w, h).rotateY(wall === 'east' ? -Math.PI / 2 : Math.PI / 2).translate(off, y, along);
    addMesh(this.scene, pane, this.viewMaterial(wall, shift));
    const bx = wall === 'east' ? off - 0.03 : off + 0.03;
    this.woodBag.box(0x2a1a10, 0.05, h + 0.14, 0.09, bx, y, along - w / 2);
    this.woodBag.box(0x2a1a10, 0.05, h + 0.14, 0.09, bx, y, along + w / 2);
    this.woodBag.box(0x2a1a10, 0.05, 0.08, w, bx, y + h / 2, along);
    this.woodBag.box(0x2a1a10, 0.05, 0.08, w, bx, y - h / 2, along);
    this.woodBag.box(0x2a1a10, 0.05, 0.05, w, bx, y, along);
    this.woodBag.box(0x2a1a10, 0.05, h, 0.05, bx, y, along);
    return { off: bx };
  }

  clock(x, y, z, facing, radius = 0.24, hour = 9, minute = 40, audible = true) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.03, radius + 0.03, 0.06, 20), std({ color: 0x3a2412, roughness: 0.5 }));
    body.rotation.x = Math.PI / 2;
    g.add(body);
    const face = new THREE.Mesh(new THREE.CircleGeometry(radius, 20), new THREE.MeshStandardMaterial({ map: clockFace(hour, minute), roughness: 0.4, emissive: 0x302a20 }));
    face.position.z = 0.032;
    g.add(face);
    if (audible) g.userData.ticks = { kind: 'wall', size: radius };
    g.position.set(x, y, z);
    g.rotation.y = facing;
    this.scene.add(g);
  }

  // Wanduhr mit schwingendem Pendel.
  regulator(x, y, z, facing, seed = 0, audible = true) {
    const g = new THREE.Group();
    const bag = new Bag();
    bag.box(0x3a2010, 0.42, 1.2, 0.14, 0, 0, 0);
    bag.box(0x2a1608, 0.5, 0.08, 0.17, 0, 0.62, 0);
    bag.box(0x2a1608, 0.5, 0.08, 0.17, 0, -0.62, 0);
    g.add(new THREE.Mesh(bag.build(), std({ vertexColors: true, roughness: 0.4 })));
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.18, 20), new THREE.MeshStandardMaterial({ map: clockFace(9, 40), emissive: 0x302a20 }));
    face.position.set(0, 0.34, 0.075);
    g.add(face);
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.12, 0.08);
    const brass = std({ color: 0xb59a55, metalness: 0.8, roughness: 0.35 });
    pivot.add(new THREE.Mesh(box(0.012, 0.56, 0.008, 0, -0.28, 0), brass));
    const bob = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16), brass);
    bob.rotation.x = Math.PI / 2;
    bob.position.y = -0.56;
    pivot.add(bob);
    g.add(pivot);
    // Das Ticken (core/ticking.js) folgt derselben Pendelfrequenz.
    if (audible) g.userData.ticks = { kind: 'pendulum', seed };
    g.position.set(x, y, z);
    g.rotation.y = facing;
    this.scene.add(g);
    this.loc.onUpdate((dt, t) => {
      pivot.rotation.z = Math.sin(t * 3.14 + seed) * 0.14;
    });
  }

  // Dieses Licht wirft Schatten (View.castShadows erfasst beim Betreten alle Körper). near
  // blendet die Teile der Leuchte selbst aus, sonst legt ihr Messingknauf einen Fleck auf den Boden.
  shadows(light, { size = 1024, near = 0.3 } = {}) {
    light.castShadow = true;
    light.shadow.mapSize.set(size, size);
    // Die Projektion muss neu gerechnet werden, sonst vergleicht der Shader mit dem neuen near,
    // die Karte entsteht aber mit dem alten, und es fällt gar kein Schatten.
    light.shadow.camera.near = near;
    light.shadow.camera.updateProjectionMatrix();
    // Auch Holmes' Körper wirft Schatten, den nur die Schattenkamera sieht.
    light.shadow.camera.layers.enable(SHADOW_ONLY);
    light.shadow.bias = -0.002;
    light.shadow.normalBias = 0.02;
    light.shadow.radius = 3;
    this.scene.userData.shadows = true;
  }

  finish() {
    const woodTex = wood([190, 150, 110], 62);
    if (this.woodBag.parts.length) addMesh(this.scene, this.woodBag.build(), std({ ...woodTex, vertexColors: true, roughness: 0.62 }));
    if (this.plainBag.parts.length) addMesh(this.scene, this.plainBag.build(), std({ vertexColors: true, roughness: 0.8 }));
    if (this.metalBag.parts.length) addMesh(this.scene, this.metalBag.build(), std({ vertexColors: true, roughness: 0.4, metalness: 0.7 }));
    if (this.glowBag.parts.length) addMesh(this.scene, this.glowBag.build(), new THREE.MeshBasicMaterial({ vertexColors: true }));
    if (this.glassBag.parts.length) {
      const glass = addMesh(this.scene, this.glassBag.build(), std({ vertexColors: true, roughness: 0.08, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }));
      glass.renderOrder = 1;
    }
    return this.loc;
  }
}
