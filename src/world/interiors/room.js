import * as THREE from 'three';
import { Location } from '../../engine/location.js';
import { Bag, addMesh, box, cyl, merge, std } from '../kit.js';
import { WINDOW_VIEW, clockFace, rainOnGlass, softDisc, windowView, wood } from '../textures.js';

// Abstand der Häuser gegenüber hinter den Fenstern, in Metern (Straßenbreite).
const VIEW_DEPTH = 12;

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

  table(x, z, w, d, h = 0.78, color = 0x5a3a22, collide = true) {
    this.woodBag.box(color, w, 0.06, d, x, h, z);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        this.woodBag.box(color, 0.07, h, 0.07, x + (sx * (w - 0.14)) / 2, h / 2, z + (sz * (d - 0.14)) / 2);
      }
    }
    if (collide) this.solid(x, z, w, d);
  }

  chair(x, z, facing = 0, color = 0x4a2e1c) {
    const s = Math.sin(facing);
    const c = Math.cos(facing);
    const back = [x - s * 0.21, z - c * 0.21];
    this.woodBag.box(color, 0.44, 0.05, 0.44, x, 0.46, z);
    for (const a of [-0.19, 0.19]) {
      for (const b of [-0.19, 0.19]) this.woodBag.box(color, 0.05, 0.46, 0.05, x + a, 0.23, z + b);
    }
    this.woodBag.box(color, Math.abs(c) * 0.44 + 0.05, 0.55, Math.abs(s) * 0.44 + 0.05, back[0], 0.76, back[1]);
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

  // visible: false ergibt reines Fülllicht ohne sichtbare Lampe.
  lamp(x, y, z, { intensity = 9, color = 0xffb06a, range = 14, glow = 1.0, hang = true, visible = true } = {}) {
    const power = intensity * 2.6;
    const l = new THREE.PointLight(color, power, range, 1.8);
    l.position.set(x, y, z);
    this.scene.add(l);
    if (visible) {
      addMesh(this.scene, new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.5, 0.7) }), x, y, z);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('glow'), color: 0xffb060, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.position.set(x, y, z);
      s.scale.setScalar(glow);
      this.scene.add(s);
    }
    if (hang) {
      this.metalBag.box(0x1a1610, 0.015, this.h - y, 0.015, x, (this.h + y) / 2, z);
      this.metalBag.add(cyl(0.16, 0.3, 0.13, x, y + 0.12, z, 12), 0x25301f);
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
  viewMaterial(wall) {
    this.viewMats ??= {};
    if (this.viewMats[wall]) return this.viewMats[wall];
    // Nach außen und längs der Wand, je Wand des Raums (Tür im Süden, +z).
    const dirs = { east: [[1, 0, 0], [0, 0, -1]], west: [[-1, 0, 0], [0, 0, 1]], south: [[0, 0, 1], [1, 0, 0]], north: [[0, 0, -1], [-1, 0, 0]] };
    const [out, side] = dirs[wall].map((v) => new THREE.Vector3(...v));
    // Jeder Raum und jede Wand blickt auf ein anderes Stück der Straße.
    let shift = { east: 0.13, west: 0.61, south: 0.37, north: 0.84 }[wall];
    for (const ch of this.loc.id) shift += ch.charCodeAt(0) * 0.0173;
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

  window(wall, along, y, w, h) {
    const off = wall === 'east' ? this.w / 2 - 0.05 : -this.w / 2 + 0.05;
    const pane = new THREE.PlaneGeometry(w, h).rotateY(wall === 'east' ? -Math.PI / 2 : Math.PI / 2).translate(off, y, along);
    addMesh(this.scene, pane, this.viewMaterial(wall));
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

  finish() {
    const woodTex = wood([190, 150, 110], 62);
    if (this.woodBag.parts.length) addMesh(this.scene, this.woodBag.build(), std({ ...woodTex, vertexColors: true, roughness: 0.62 }));
    if (this.plainBag.parts.length) addMesh(this.scene, this.plainBag.build(), std({ vertexColors: true, roughness: 0.8 }));
    if (this.metalBag.parts.length) addMesh(this.scene, this.metalBag.build(), std({ vertexColors: true, roughness: 0.4, metalness: 0.7 }));
    if (this.glassBag.parts.length) {
      const glass = addMesh(this.scene, this.glassBag.build(), std({ vertexColors: true, roughness: 0.08, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }));
      glass.renderOrder = 1;
    }
    return this.loc;
  }
}
