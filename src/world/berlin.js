import * as THREE from 'three';
import { Location } from '../engine/location.js';
import { Bag, addMesh, box, cyl, merge, pediment, roofPrism, std, tint } from './kit.js';
import { makeFigure, makeHorse, trotHorse, walkFigure } from './figures.js';
import {
  brick,
  clockFace,
  cobble,
  fogPuff,
  pavement,
  plaster,
  posterWall,
  rng,
  signTexture,
  slate,
  softDisc,
} from './textures.js';

// Das erste Viertel: Hackescher Markt, Rosenthaler und Oranienburger Straße, Sophienstraße,
// die Stadtbahn am Bahnhof Börse und die Spree. Norden ist -Z.
const BAY_W = 3.4;
const FLOOR = { ground: 4.4, noble: 3.9, upper: 3.5, attic: 2.9 };
const FACADES = [0x9c8f79, 0xa89a80, 0x8c8474, 0xa08a70, 0x8f8b84, 0xb0a288, 0x8a7a68, 0x9a9488];

function bayParts(type) {
  const W = BAY_W;
  const H = FLOOR[type === 'shop' || type === 'door' ? 'ground' : type];
  const wall = new Bag();
  const glass = [];
  const trimC = new THREE.Color(1.22, 1.2, 1.15);
  const stone = new THREE.Color(0.8, 0.78, 0.74);
  const wood = new THREE.Color(0.09, 0.07, 0.06);
  const D = 0.34;
  const hole = (ww, wy, wh) => {
    const side = (W - ww) / 2;
    wall.box(0xffffff, side, H, D, side / 2, H / 2, -D / 2);
    wall.box(0xffffff, side, H, D, W - side / 2, H / 2, -D / 2);
    wall.box(0xffffff, ww, wy, D, W / 2, wy / 2, -D / 2);
    const top = H - wy - wh;
    wall.box(0xffffff, ww, top, D, W / 2, wy + wh + top / 2, -D / 2);
    wall.box(wood, ww, wh, 0.03, W / 2, wy + wh / 2, -D + 0.01);
  };
  const sash = (ww, wy, wh, rows = 2) => {
    const z = -D + 0.09;
    glass.push(box(ww - 0.06, wh - 0.06, 0.02, W / 2, wy + wh / 2, -D + 0.05));
    wall.box(wood, 0.06, wh, 0.05, W / 2, wy + wh / 2, z);
    for (let i = 1; i < rows; i++) wall.box(wood, ww, 0.05, 0.05, W / 2, wy + (wh * i) / rows, z);
    wall.box(wood, ww, 0.06, 0.05, W / 2, wy + 0.03, z);
    wall.box(wood, ww, 0.06, 0.05, W / 2, wy + wh - 0.03, z);
    wall.box(wood, 0.06, wh, 0.05, W / 2 - ww / 2 + 0.03, wy + wh / 2, z);
    wall.box(wood, 0.06, wh, 0.05, W / 2 + ww / 2 - 0.03, wy + wh / 2, z);
  };
  const frame = (ww, wy, wh) => {
    wall.box(trimC, 0.12, wh + 0.12, 0.06, W / 2 - ww / 2 - 0.06, wy + wh / 2, 0.03);
    wall.box(trimC, 0.12, wh + 0.12, 0.06, W / 2 + ww / 2 + 0.06, wy + wh / 2, 0.03);
  };
  const sill = (ww, wy) => {
    wall.box(trimC, ww + 0.4, 0.09, 0.2, W / 2, wy - 0.05, 0.1);
    wall.box(trimC, ww * 0.22, 0.14, 0.12, W / 2 - ww / 3, wy - 0.16, 0.06);
    wall.box(trimC, ww * 0.22, 0.14, 0.12, W / 2 + ww / 3, wy - 0.16, 0.06);
  };

  if (type === 'ground' || type === 'shop' || type === 'door') {
    // Sockel mit Quaderung.
    wall.box(stone, W, 0.5, 0.12, W / 2, 0.25, 0.06);
    for (let i = 0; i < 7; i++) {
      const y = 0.75 + i * 0.5;
      if (y < H) wall.box(trimC, 0.22, 0.42, 0.05, 0.11, y, 0.025);
      if (y < H) wall.box(trimC, 0.22, 0.42, 0.05, W - 0.11, y, 0.025);
    }
    if (type === 'ground') {
      const ww = 1.6;
      hole(ww, 1.3, 2.3);
      sash(ww, 1.3, 2.3);
      sill(ww, 1.3);
      wall.box(trimC, ww + 0.34, 0.14, 0.14, W / 2, 3.68, 0.07);
    } else if (type === 'shop') {
      const ww = 2.7;
      hole(ww, 0.7, 2.75);
      glass.push(box(ww - 0.06, 2.7, 0.02, W / 2, 0.7 + 1.37, -D + 0.05));
      wall.box(wood, ww + 0.1, 0.1, 0.07, W / 2, 0.72, -D + 0.1);
      wall.box(wood, ww + 0.1, 0.1, 0.07, W / 2, 3.42, -D + 0.1);
      wall.box(wood, 0.08, 2.75, 0.07, W / 2, 2.07, -D + 0.1);
      wall.box(wood, ww + 0.1, 0.5, 0.1, W / 2, 0.45, 0.04);
    } else {
      const ww = 1.7;
      const dh = 2.6;
      const side = (W - ww) / 2;
      wall.box(0xffffff, side, H, D, side / 2, H / 2, -D / 2);
      wall.box(0xffffff, side, H, D, W - side / 2, H / 2, -D / 2);
      const top = H - dh - 0.8;
      wall.box(0xffffff, ww, top, D, W / 2, dh + 0.8 + top / 2, -D / 2);
      const door = new THREE.Color(0.14, 0.09, 0.06);
      wall.box(door, ww / 2 - 0.02, dh, 0.06, W / 2 - ww / 4, dh / 2, -D + 0.05);
      wall.box(door, ww / 2 - 0.02, dh, 0.06, W / 2 + ww / 4, dh / 2, -D + 0.05);
      wall.box(wood, ww, 0.1, 0.08, W / 2, dh + 0.04, -D + 0.08);
      glass.push(box(ww - 0.1, 0.7, 0.02, W / 2, dh + 0.42, -D + 0.05));
      wall.box(trimC, ww + 0.34, 0.16, 0.2, W / 2, dh + 0.92, 0.1);
      frame(ww, 0, dh + 0.8);
    }
  } else if (type === 'noble') {
    const ww = 1.55;
    const wy = 0.75;
    const wh = 2.3;
    hole(ww, wy, wh);
    sash(ww, wy, wh);
    frame(ww, wy, wh);
    sill(ww, wy);
    wall.box(trimC, ww + 0.34, 0.1, 0.16, W / 2, wy + wh + 0.08, 0.08);
    wall.add(pediment(ww + 0.55, 0.42, 0.18, W / 2, wy + wh + 0.13, 0.09), trimC);
    wall.box(trimC, ww, 0.4, 0.04, W / 2, 0.32, 0.02);
  } else if (type === 'upper') {
    const ww = 1.45;
    const wy = 0.75;
    const wh = 2.05;
    hole(ww, wy, wh);
    sash(ww, wy, wh);
    frame(ww, wy, wh);
    sill(ww, wy);
    wall.box(trimC, ww + 0.4, 0.14, 0.16, W / 2, wy + wh + 0.13, 0.08);
  } else {
    const ww = 1.1;
    const wy = 0.7;
    const wh = 1.4;
    hole(ww, wy, wh);
    sash(ww, wy, wh, 2);
    frame(ww, wy, wh);
    wall.box(trimC, ww + 0.25, 0.08, 0.12, W / 2, wy - 0.04, 0.06);
  }
  return { wall: wall.build(), glass: merge(glass) };
}

class FacadeBatcher {
  constructor() {
    this.types = {};
    for (const t of ['ground', 'shop', 'door', 'noble', 'upper', 'attic']) {
      this.types[t] = { parts: bayParts(t), walls: [], lit: [], dark: [] };
    }
  }

  place(type, matrix, color, lit) {
    const t = this.types[type];
    t.walls.push({ matrix, color });
    (lit ? t.lit : t.dark).push(matrix);
  }

  build(scene, wallMat, darkGlass, litGlass) {
    const color = new THREE.Color();
    for (const t of Object.values(this.types)) {
      if (t.walls.length) {
        const mesh = new THREE.InstancedMesh(t.parts.wall, wallMat, t.walls.length);
        t.walls.forEach((w, i) => {
          mesh.setMatrixAt(i, w.matrix);
          mesh.setColorAt(i, color.set(w.color));
        });
        mesh.frustumCulled = false;
        scene.add(mesh);
      }
      for (const [list, mat] of [[t.dark, darkGlass], [t.lit, litGlass]]) {
        if (!list.length) continue;
        const mesh = new THREE.InstancedMesh(t.parts.glass, mat, list.length);
        list.forEach((m, i) => mesh.setMatrixAt(i, m));
        mesh.frustumCulled = false;
        scene.add(mesh);
      }
    }
  }
}

const FACING = { south: 0, north: Math.PI, east: Math.PI / 2, west: -Math.PI / 2 };

// Wo zwei Häuserzeilen an einer Ecke zusammenstoßen, ragt der Körper des einen Hauses
// in die Fassade des anderen: Er mauert dort die Fensternischen zu, und seine
// Stirnseite liegt in derselben Ebene wie die Fassade (Z-Fighting, Flackern).
// Jeder Körper wird deshalb an der Seite gekürzt, an der am wenigsten wegfällt.
function trimMasses(masses, slabs) {
  const EPS = 0.001;
  for (const m of masses) {
    for (const s of slabs) {
      if (s.id === m.id) continue;
      const ox = Math.min(m.maxX, s.maxX) - Math.max(m.minX, s.minX);
      const oz = Math.min(m.maxZ, s.maxZ) - Math.max(m.minZ, s.minZ);
      if (ox <= EPS || oz <= EPS) continue;
      const cuts = [
        { key: 'maxX', value: s.minX, loss: m.maxX - s.minX, ok: s.minX > m.minX },
        { key: 'minX', value: s.maxX, loss: s.maxX - m.minX, ok: s.maxX < m.maxX },
        { key: 'maxZ', value: s.minZ, loss: m.maxZ - s.minZ, ok: s.minZ > m.minZ },
        { key: 'minZ', value: s.maxZ, loss: s.maxZ - m.minZ, ok: s.maxZ < m.maxZ },
      ].filter((c) => c.ok);
      if (!cuts.length) continue;
      const best = cuts.reduce((a, b) => (b.loss < a.loss ? b : a));
      m[best.key] = best.value;
    }
  }
}

export function buildBerlin() {
  const loc = new Location('berlin', 'Hackescher Markt', { ambience: 'street', surface: 'stone' });
  const { scene } = loc;
  const r = rng(1892);

  const FOG = 0x151c28;
  scene.fog = new THREE.FogExp2(FOG, 0.0125);
  scene.background = new THREE.Color(FOG);
  loc.exposure = 1;

  // Nachtlicht: kaum Mond, dafür die Laternen.
  scene.add(new THREE.HemisphereLight(0x5a6e94, 0x1e1a15, 2.1));
  const moon = new THREE.DirectionalLight(0x8aa4cc, 1.1);
  moon.position.set(-60, 120, -40);
  scene.add(moon);

  // Himmel
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(600, 24, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
      uniforms: { low: { value: new THREE.Color(FOG) }, high: { value: new THREE.Color(0x070a12) } },
      vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 low; uniform vec3 high; varying vec3 vP;
        void main(){
          float t = smoothstep(0.0, 0.5, vP.y);
          vec3 c = mix(low, high, t);
          vec3 m = normalize(vec3(-0.45, 0.62, -0.64));
          float d = max(dot(normalize(vP), m), 0.0);
          c += vec3(0.42,0.5,0.62) * pow(d, 900.0) * 1.6 + vec3(0.1,0.13,0.2) * pow(d, 40.0);
          gl_FragColor = vec4(c, 1.0);
        }`,
    }),
  );
  sky.renderOrder = -10;
  scene.add(sky);
  loc.onUpdate((dt, t, { camera }) => sky.position.copy(camera.position));

  // Materialien
  const plasterTex = plaster();
  const wallMat = std({ ...plasterTex, vertexColors: true, roughness: 0.92, normalScale: new THREE.Vector2(0.5, 0.5) });
  const darkGlass = std({ color: 0x0b0f16, roughness: 0.18, metalness: 0.5 });
  const litGlass = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 0.31, 0.09) });
  const roofMat = std({ ...slate(), roughness: 0.65 });
  const brickMat = std({ ...brick(), roughness: 0.88 });
  const ironMat = std({ color: 0x0f1211, roughness: 0.55, metalness: 0.5 });
  const batcher = new FacadeBatcher();
  const massing = new Bag();
  const masses = [];
  const slabs = [];
  const roofs = [];
  const curbs = [];

  const block = ({ x, z, face, floors = 4, color, depth = 14, ground = [], lit = 0.22, sidewalk = 3 }, bays) => {
    const rot = FACING[face];
    const R = new THREE.Matrix4().makeRotationY(rot);
    const T = new THREE.Matrix4().makeTranslation(x, 0, z);
    const base = new THREE.Matrix4().multiplyMatrices(T, R);
    const W = bays * BAY_W;
    const col = color ?? FACADES[Math.floor(r() * FACADES.length)];
    const types = floors === 3 ? ['noble', 'upper', 'attic'] : ['noble', 'upper', 'upper', 'attic'];
    for (let i = 0; i < bays; i++) {
      const tGround = ground[i] || (r() < 0.32 ? 'shop' : 'ground');
      const gx = new THREE.Matrix4().multiplyMatrices(base, new THREE.Matrix4().makeTranslation(i * BAY_W, 0, 0));
      batcher.place(tGround, gx, col, tGround === 'shop' ? r() < 0.8 : r() < 0.2);
      let y = FLOOR.ground;
      for (const type of types) {
        const m = new THREE.Matrix4().multiplyMatrices(base, new THREE.Matrix4().makeTranslation(i * BAY_W, y, 0));
        batcher.place(type, m, col, r() < lit);
        y += FLOOR[type];
      }
    }

    const H = FLOOR.ground + types.reduce((sum, t) => sum + FLOOR[t], 0);
    const local = new Bag();
    const cTrim = new THREE.Color(col).multiplyScalar(1.15);
    const cDark = new THREE.Color(col).multiplyScalar(0.72);
    // Hauskörper und Fassadenzone als Rechtecke in Weltkoordinaten. Gebaut wird der
    // Körper erst, wenn alle Häuser stehen (trimMasses), damit er an Ecken nicht in
    // die Fassade des Nachbarn ragt.
    const rect = (x0, x1, z0, z1) => {
      const pts = [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].map(([lx, lz]) => new THREE.Vector3(lx, 0, lz).applyMatrix4(base));
      const xs = pts.map((p) => p.x);
      const zs = pts.map((p) => p.z);
      return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
    };
    const id = masses.length;
    masses.push({ id, ...rect(0, W, -depth, -0.34), H, color: cDark });
    slabs.push({ id, ...rect(0, W, -0.6, 0.3) });
    // Gesimse genau so breit wie das Haus: breiter überlappen sie den Nachbarn in
    // derselben Ebene und flackern.
    local.box(cTrim, W, 0.3, 0.36, W / 2, FLOOR.ground + 0.02, 0.1);
    let y = FLOOR.ground;
    for (const t of types) {
      y += FLOOR[t];
      if (t !== 'attic') local.box(cTrim, W, 0.1, 0.1, W / 2, y, 0.05);
    }
    local.box(cTrim, W, 0.5, 0.62, W / 2, H - 0.05, 0.2);
    local.box(cTrim, W, 0.14, 0.34, W / 2, H - 0.42, 0.12);
    for (let i = 0; i < W / 0.6 - 1; i++) local.box(cTrim, 0.16, 0.2, 0.16, 0.5 + i * 0.6, H - 0.4, 0.26);
    const geo = local.build();
    geo.applyMatrix4(base);
    massing.parts.push(geo);

    const rGeo = roofPrism(W, 3.4, depth, W / 2, H + 0.2, -depth / 2);
    rGeo.applyMatrix4(base);
    roofs.push(rGeo);

    for (let i = 0; i < Math.max(2, bays / 3); i++) {
      const ch = new Bag();
      ch.box(0x4a3a30, 0.7, 2.2, 0.5, 1 + r() * (W - 2), H + 2.6, -2 - r() * (depth - 4));
      const g = ch.build();
      g.applyMatrix4(base);
      massing.parts.push(g);
    }

    // Grundriss als Kollision: Ecken des Rechtecks in die Welt übertragen.
    const corners = [[0, 0], [W, 0], [0, -depth], [W, -depth]].map(([lx, lz]) =>
      new THREE.Vector3(lx, 0, lz).applyMatrix4(base));
    const xs = corners.map((c) => c.x);
    const zs = corners.map((c) => c.z);
    loc.collide(Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs));

    // Gehweg vor dem Haus samt Bordkante.
    if (sidewalk) {
      const walk = [[0, 0], [W, 0], [0, sidewalk], [W, sidewalk]].map(([lx, lz]) =>
        new THREE.Vector3(lx, 0, lz).applyMatrix4(base));
      const wx = walk.map((c) => c.x);
      const wz = walk.map((c) => c.z);
      const rect = { minX: Math.min(...wx), maxX: Math.max(...wx), minZ: Math.min(...wz), maxZ: Math.max(...wz), h: 0.13 };
      loc.raised.push(rect);
      curbs.push(rect);
    }

    const at = (bay, height, out = 0.25) =>
      new THREE.Vector3((bay + 0.5) * BAY_W, height, out).applyMatrix4(base);
    return { at, rot, W, H, face };
  };

  // Reihe zusammenhängender Häuser mit wechselnder Breite und Höhe.
  const row = ({ x, z, face, bays }) => {
    const rot = FACING[face];
    const dx = Math.cos(rot);
    const dz = -Math.sin(rot);
    let done = 0;
    while (done < bays) {
      const n = Math.min(bays - done, 5 + Math.floor(r() * 4));
      block({ x: x + dx * done * BAY_W, z: z + dz * done * BAY_W, face, floors: r() < 0.3 ? 3 : 4 }, n);
      done += n;
    }
  };

  // --- Rosenthaler Straße ---------------------------------------------------
  row({ x: -9, z: -24, face: 'east', bays: 20 }); // bis z = -92
  const apotheke = block({ x: -9, z: -92, face: 'east', color: 0xa8957c, ground: ['shop', 'door', 'shop', 'ground', 'ground'] }, 5);
  row({ x: -9, z: -109, face: 'east', bays: 24 }); // bis z = -190

  row({ x: 9, z: -190, face: 'west', bays: 25 });
  row({ x: 9, z: -95, face: 'west', bays: 5 }); // z -95 bis -78
  const kessler = block({ x: 9, z: -78, face: 'west', color: 0x8a8070, ground: ['ground', 'door', 'shop', 'shop', 'ground', 'ground'] }, 6);
  row({ x: 9, z: -57.6, face: 'west', bays: 10 });

  // --- Sophienstraße ---------------------------------------------------------
  row({ x: 9, z: -105, face: 'south', bays: 10 });
  const destille = block({ x: 43, z: -105, face: 'south', color: 0x786c5c, floors: 3, ground: ['shop', 'door', 'shop', 'ground', 'ground'] }, 5);
  row({ x: 60, z: -105, face: 'south', bays: 21 });
  row({ x: 130, z: -95, face: 'north', bays: 36 });

  // --- Hackescher Markt -------------------------------------------------------
  row({ x: -32, z: -24, face: 'south', bays: 7 });
  row({ x: 9, z: -24, face: 'south', bays: 7 });
  row({ x: 32, z: -24, face: 'west', bays: 13 });
  row({ x: -32, z: -14, face: 'east', bays: 3 });
  const bank = block({ x: -32, z: 18, face: 'east', color: 0x77706a, floors: 3, lit: 0.1, ground: ['ground', 'ground', 'door', 'ground', 'ground', 'ground'] }, 6);

  // --- Oranienburger Straße ---------------------------------------------------
  row({ x: -170, z: -14, face: 'south', bays: 25 });
  const pension = block({ x: -85, z: -14, face: 'south', color: 0x9a8a74, ground: ['ground', 'ground', 'door', 'ground', 'ground', 'ground'] }, 6);
  row({ x: -64.6, z: -14, face: 'south', bays: 10 });
  row({ x: -32, z: -2, face: 'north', bays: 41 });

  batcher.build(scene, wallMat, darkGlass, litGlass);
  trimMasses(masses, slabs);
  for (const m of masses) {
    const w = m.maxX - m.minX;
    const d = m.maxZ - m.minZ;
    if (w > 0.05 && d > 0.05) massing.box(m.color, w, m.H, d, (m.minX + m.maxX) / 2, m.H / 2, (m.minZ + m.maxZ) / 2);
  }

  // Gehwege, Bordkanten
  const pave = pavement();
  const walkMat = std({ ...pave, roughness: 0.62, normalScale: new THREE.Vector2(0.6, 0.6) });
  pave.map.repeat.set(1, 1);
  const walkBag = [];
  const curbBag = [];
  for (const c of curbs) {
    const w = c.maxX - c.minX;
    const d = c.maxZ - c.minZ;
    walkBag.push(box(w, 0.13, d, (c.minX + c.maxX) / 2, 0.065, (c.minZ + c.maxZ) / 2, 0.42));
    if (w > d) curbBag.push(box(w, 0.14, 0.14, (c.minX + c.maxX) / 2, 0.07, c.minZ), box(w, 0.14, 0.14, (c.minX + c.maxX) / 2, 0.07, c.maxZ));
    else curbBag.push(box(0.14, 0.14, d, c.minX, 0.07, (c.minZ + c.maxZ) / 2), box(0.14, 0.14, d, c.maxX, 0.07, (c.minZ + c.maxZ) / 2));
  }
  addMesh(scene, merge(walkBag), walkMat);
  addMesh(scene, merge(curbBag), std({ color: 0x46464a, roughness: 0.7 }));

  // Fahrbahn: von z = -430 bis unter die Quaikante (44.6), damit sie nicht über der Spree liegt.
  const cob = cobble();
  const STREET_Z0 = -430;
  const STREET_Z1 = 44.6;
  const streetDepth = STREET_Z1 - STREET_Z0;
  const street = new THREE.Mesh(
    new THREE.PlaneGeometry(720, streetDepth),
    std({ ...cob, roughness: 1, metalness: 0.05, normalScale: new THREE.Vector2(0.9, 0.9), envMapIntensity: 1.6 }),
  );
  // Pflastergröße wie bisher: 8 m pro Kachel.
  for (const t of Object.values(cob)) t.repeat.set(90, streetDepth / 8);
  street.rotation.x = -Math.PI / 2;
  street.position.set(0, 0, (STREET_Z0 + STREET_Z1) / 2);
  scene.add(street);

  // Stadtbahnviadukt: z = 18 bis 32, mit Bögen. Bogen bei x = 0 ist der Durchgang zur Spree.
  const VZ0 = 18;
  const VZ1 = 32;
  const VH = 8.5;
  const SEG = 11;
  // Umriss mit offenem Bogen statt Rechteck mit Loch: Ein Loch, das bis zum Boden
  // reicht, bekommt beim Extrudieren eine Bodenfläche auf Höhe 0, die mit dem
  // Pflaster flackert.
  const archShape = () => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(1.1, 0);
    s.lineTo(1.1, 4.1);
    s.absarc(SEG / 2, 4.1, SEG / 2 - 1.1, Math.PI, 0, true);
    s.lineTo(SEG - 1.1, 0);
    s.lineTo(SEG, 0);
    s.lineTo(SEG, VH);
    s.lineTo(0, VH);
    s.closePath();
    return s;
  };
  const archGeo = new THREE.ExtrudeGeometry(archShape(), { depth: VZ1 - VZ0, bevelEnabled: false, curveSegments: 12 });
  const viaductParts = [];
  const infill = new Bag();
  const archLights = new Bag();
  const stationArches = new Set([-3, -2, 2, 3]);
  for (let i = -24; i <= 24; i++) {
    const g = archGeo.clone();
    const ax = i * SEG - SEG / 2;
    g.translate(ax, 0, VZ0);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    const nor = g.attributes.normal;
    for (let k = 0; k < pos.count; k++) {
      if (Math.abs(nor.getZ(k)) > 0.5) uv.setXY(k, pos.getX(k) * 0.33, pos.getY(k) * 0.33);
      else uv.setXY(k, pos.getZ(k) * 0.33, (pos.getX(k) + pos.getY(k)) * 0.33);
    }
    viaductParts.push(g);
    if (i !== 0) {
      // Gefüllte Bögen: Lager und Kneipen unter der Bahn.
      const lit = r() < 0.28 || stationArches.has(i);
      infill.box(0xa88872, SEG - 2, 8, 0.3, i * SEG, 4, VZ0 + 1.3);
      infill.box(0x241a14, 1.5, 2.7, 0.1, i * SEG + 2.2, 1.35, VZ0 + 1.1);
      if (lit) archLights.box(0xffffff, 3, 1.6, 0.04, i * SEG - 1.8, 2.3, VZ0 + 1.13);
      infill.box(0xa88872, SEG - 2, 8, 0.3, i * SEG, 4, VZ1 - 1.3);
      loc.collide(ax, ax + SEG, VZ0, VZ1);
    } else {
      loc.collide(ax, ax + 1.1, VZ0, VZ1);
      loc.collide(ax + SEG - 1.1, ax + SEG, VZ0, VZ1);
    }
  }
  addMesh(scene, merge(viaductParts), brickMat);
  addMesh(scene, infill.build(), std({ vertexColors: true, ...brick(), roughness: 0.9 }));
  addMesh(scene, archLights.build(), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 0.31, 0.09), vertexColors: true }));
  const deck = new Bag();
  const deckW = 49 * SEG;
  deck.box(0x2c2622, deckW, 0.5, VZ1 - VZ0 + 0.8, 0, VH + 0.25, (VZ0 + VZ1) / 2);
  addMesh(scene, deck.build(), std({ vertexColors: true, roughness: 0.9 }));
  const rails = new Bag();
  for (const z of [VZ0 - 0.2, VZ1 + 0.2]) {
    rails.box(0x15181a, deckW, 0.07, 0.07, 0, VH + 1.45, z);
    for (let x = -deckW / 2; x < deckW / 2; x += 2.5) rails.box(0x15181a, 0.06, 1, 0.06, x, VH + 0.95, z);
  }
  for (const z of [22.2, 24, 26, 27.8]) rails.box(0x35363a, deckW, 0.14, 0.09, 0, VH + 0.6, z);
  addMesh(scene, rails.build(), std({ vertexColors: true, roughness: 0.5, metalness: 0.6 }));

  // Bahnhof Börse: Halle aus Eisen und Glas auf dem Viadukt.
  const hall = new THREE.Mesh(
    new THREE.CylinderGeometry(9.5, 9.5, 72, 24, 1, true, -Math.PI / 2, Math.PI),
    std({ color: 0x1b2430, roughness: 0.3, metalness: 0.4, side: THREE.DoubleSide }),
  );
  hall.rotation.z = Math.PI / 2;
  hall.position.set(0, VH + 3.4, 25);
  scene.add(hall);
  const ribs = new Bag();
  for (let x = -36; x <= 36; x += 4) {
    const rib = new THREE.TorusGeometry(9.55, 0.07, 6, 24, Math.PI);
    rib.rotateY(Math.PI / 2);
    rib.translate(x, VH + 3.4, 25);
    ribs.add(rib, 0x0c0e10);
  }
  ribs.box(0x3a2c24, 72, 3.2, 0.5, 0, VH + 1.9, VZ0 + 0.2);
  ribs.box(0x3a2c24, 72, 3.2, 0.5, 0, VH + 1.9, VZ1 - 0.2);
  addMesh(scene, ribs.build(), std({ vertexColors: true, roughness: 0.6 }));
  // Hallenfenster, durch die das Licht der Bahnsteige fällt.
  const hallWindows = new Bag();
  for (let x = -34; x <= 34; x += 4) {
    hallWindows.box(0xffffff, 2.6, 1.3, 0.08, x, VH + 2, VZ0 - 0.1);
    hallWindows.box(0xffffff, 2.6, 1.3, 0.08, x, VH + 2, VZ1 + 0.1);
  }
  addMesh(scene, hallWindows.build(), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 0.42, 0.15), vertexColors: true }));

  addSign(loc, new THREE.Vector3(0, 7.65, VZ0 - 0.1), 0, signTexture('Bahnhof Börse', { bg: '#20201c', fg: '#e0c98a' }), 9, 1.4);

  // Stadtbahnzug
  const train = buildTrain();
  scene.add(train.group);
  train.group.position.set(-400, VH + 0.65, 24);
  let trainX = -420;
  let trainWait = 12;
  const smoke = [];
  const smokeMat = new THREE.SpriteMaterial({ map: fogPuff(), color: 0x70757d, transparent: true, opacity: 0.5, depthWrite: false });
  for (let i = 0; i < 16; i++) {
    const s = new THREE.Sprite(smokeMat.clone());
    s.visible = false;
    scene.add(s);
    smoke.push({ s, life: 0 });
  }
  let smokeIdx = 0;
  let smokeTimer = 0;
  loc.trainDistance = Infinity;
  loc.onUpdate((dt, t, { camera }) => {
    if (trainWait > 0) {
      trainWait -= dt;
      loc.trainDistance = Infinity;
    } else {
      trainX += 13 * dt;
      if (trainX > 340) {
        trainX = -420;
        trainWait = 50 + r() * 40;
      }
      train.group.position.x = trainX;
      const carsLen = train.length;
      const nearest = Math.max(trainX - carsLen, Math.min(camera.position.x, trainX));
      loc.trainDistance = Math.hypot(nearest - camera.position.x, 24 - camera.position.z);
      smokeTimer -= dt;
      if (smokeTimer < 0) {
        smokeTimer = 0.32;
        const puff = smoke[smokeIdx++ % smoke.length];
        puff.life = 1;
        puff.s.visible = true;
        puff.s.position.set(trainX + 7.2, VH + 5.5, 24);
      }
    }
    for (const p of smoke) {
      if (p.life <= 0) continue;
      p.life -= dt * 0.22;
      if (p.life <= 0) p.s.visible = false;
      p.s.position.y += dt * 1.7;
      p.s.position.x -= dt * 1.5;
      const size = 3 + (1 - p.life) * 9;
      p.s.scale.set(size, size, 1);
      p.s.material.opacity = p.life * 0.5;
    }
  });

  // Häuserzeile jenseits der Spree als Silhouette
  const far = new Bag();
  for (let x = -220; x < 220; x += 16 + r() * 8) {
    const h = 14 + r() * 8;
    far.box(0x1a1f2a, 18, h, 10, x, h / 2, 118);
  }
  const silhouette = std({ vertexColors: true, roughness: 1 });
  addMesh(scene, far.build(), silhouette);
  const farLights = new Bag();
  for (let i = 0; i < 60; i++) {
    farLights.box(0xffffff, 0.8, 1.2, 0.05, -210 + r() * 420, 4 + r() * 12, 112.9);
  }
  addMesh(scene, farLights.build(), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.1, 0.5), vertexColors: true }));

  // Dom-Silhouette im Südwesten, ohne Nebel, damit sie als Orientierung taugt.
  const domeMat = new THREE.MeshBasicMaterial({ color: 0x1b2230, fog: false });
  const domeBag = [
    box(36, 22, 28, -110, 11, 170),
    cyl(10, 11, 12, -110, 28, 170, 20),
    (() => {
      const g = new THREE.SphereGeometry(10, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
      g.translate(-110, 34, 170);
      return g;
    })(),
    cyl(0.5, 1.5, 7, -110, 47, 170, 8),
  ];
  addMesh(scene, merge(domeBag), domeMat);

  // Neue Synagoge: goldene Kuppel über der Oranienburger Straße.
  const synagogueGold = new THREE.MeshStandardMaterial({ color: 0xc69c3a, metalness: 0.8, roughness: 0.35, fog: false, emissive: 0x3c2c10 });
  const domeBase = cyl(7, 7, 7, -205, 36, -8, 16);
  const domeTop = new THREE.SphereGeometry(7.4, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  domeTop.scale(1, 1.25, 1);
  domeTop.translate(-205, 39.5, -8);
  addMesh(scene, merge([domeTop, cyl(0.2, 0.6, 4, -205, 50, -8, 8)]), synagogueGold);
  addMesh(scene, domeBase, new THREE.MeshBasicMaterial({ color: 0x2a2228, fog: false }));
  addMesh(scene, box(30, 30, 20, -205, 15, -8), new THREE.MeshBasicMaterial({ color: 0x1c1b22, fog: false }));

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

  // Dächer, Massen
  addMesh(scene, merge(roofs), roofMat);
  addMesh(scene, massing.build(), std({ vertexColors: true, ...plasterTex, roughness: 0.95 }));

  // Laternen
  const lampPositions = [];
  const lampAt = (x, z) => lampPositions.push([x, z]);
  for (let z = -40; z > -185; z -= 24) {
    lampAt(6.6, z);
    lampAt(-6.6, z - 12);
  }
  for (let x = 22; x < 128; x += 22) {
    lampAt(x, -97.4);
    lampAt(x + 11, -102.6);
  }
  for (let x = -44; x > -168; x -= 22) {
    lampAt(x, -11.6);
    lampAt(x - 11, -4.4);
  }
  // Am Platz und unter dem Viadukt
  for (const [x, z] of [[-29.4, -21.6], [29.4, -21.6], [-29.4, 14], [29.4, 14], [-14, -21.6], [14, -21.6], [-8, 15], [8, 15], [29.4, -4]]) lampAt(x, z);
  for (let x = -130; x <= 130; x += 20) lampAt(x, 43);
  buildLamps(loc, lampPositions, ironMat);

  // Straßenmöblierung und Bäume
  buildPlaza(loc, r, ironMat);

  // Baustellen an den Rändern der begehbaren Welt.
  // Wird das nächste Viertel gebaut, verschwinden diese Sperren einfach.
  const barrier = (cx, cz, along, width) => {
    const b = new Bag();
    const w = width;
    const add = (ox, oz, sx, sy, sz, y, c) => (along === 'x'
      ? b.box(c, sx, sy, sz, cx + ox, y, cz + oz)
      : b.box(c, sz, sy, sx, cx + oz, y, cz + ox));
    add(0, 0, w, 0.16, 0.08, 1.05, 0xa8362c);
    add(0, 0, w, 0.16, 0.08, 0.55, 0xd6cfba);
    for (let o = -w / 2; o <= w / 2; o += 3) add(o, 0, 0.1, 1.2, 0.1, 0.6, 0x2c2015);
    // Erdhaufen und Bretter
    for (let i = 0; i < 6; i++) add((i / 5 - 0.5) * w * 0.8, -2 - r() * 2, 2.2, 1.1 + r() * 0.7, 2.2, 0.5, 0x2b241c);
    addMesh(scene, b.build(), std({ vertexColors: true, roughness: 1 }));
    if (along === 'x') loc.collide(cx - w / 2, cx + w / 2, cz - 0.4, cz + 0.4);
    else loc.collide(cx - 0.4, cx + 0.4, cz - w / 2, cz + w / 2);
    loc.addHotspot({
      pos: [cx, 1.2, cz],
      radius: 1.4,
      range: 4,
      label: 'Kanalbau',
      action: { say: 'Hobrechts Kanalisation frisst sich durch Berlin. Hier ist die Straße aufgerissen und für heute kein Durchkommen. Weiter draußen wartet der Rest der Stadt – ein andermal.' },
    });
    const warn = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('warn'), color: 0xff5a2c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    warn.position.set(cx, 1.5, cz);
    warn.scale.setScalar(1.3);
    scene.add(warn);
  };
  barrier(0, -188, 'x', 20);
  barrier(127, -100, 'z', 12);
  barrier(-168, -8, 'z', 14);
  barrier(-145, 38, 'z', 14);
  barrier(145, 38, 'z', 14);

  // Eingänge
  const doorSpot = (id, at, label, to, height = 1.5) => {
    const out = at.clone();
    loc.addHotspot({ id: `door_${id}`, pos: [out.x, height, out.z], radius: 1.2, range: 3.4, label, action: { door: id, to } });
    loc.doorMarks = loc.doorMarks || {};
    loc.doorMarks[id] = out;
  };
  const shopSign = (bld, bay, text, width = 6.5) => {
    const p = bld.at(bay, 3.95, 0.32);
    addSign(loc, p, bld.rot, signTexture(text), width, width * 0.17);
  };
  const lanternOver = (bld, bay) => {
    const p = bld.at(bay, 3.6, 0.5);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('glow'), color: 0xffb060, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.copy(p);
    glow.scale.setScalar(1.8);
    scene.add(glow);
    addMesh(scene, box(0.16, 0.26, 0.16, p.x, p.y, p.z), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.9, 0.8) }));
  };

  shopSign(kessler, 2.5, 'Uhrmacher E. Kessler');
  doorSpot('werkstatt', kessler.at(1, 1.5, 0.2), 'Werkstatt Kessler', 'werkstatt');
  lanternOver(kessler, 1);
  shopSign(apotheke, 1, 'Apotheke zum Schwarzen Adler', 7.5);
  doorSpot('apotheke', apotheke.at(1, 1.5, 0.2), 'Apotheke zum Schwarzen Adler', 'apotheke');
  lanternOver(apotheke, 1);
  shopSign(destille, 1, 'Destille Zur Goldenen Schrippe', 8);
  doorSpot('destille', destille.at(1, 1.5, 0.2), 'Destille „Zur Goldenen Schrippe“', 'destille');
  lanternOver(destille, 1);
  shopSign(bank, 2, 'Bankhaus Lindner & Sohn', 8);
  doorSpot('bank', bank.at(2, 1.5, 0.2), 'Bankhaus Lindner & Sohn', 'bank');
  lanternOver(bank, 2);
  shopSign(pension, 2, 'Pension Puhlmann', 6);
  doorSpot('pension', pension.at(2, 1.5, 0.2), 'Pension Puhlmann', 'pension');
  lanternOver(pension, 2);

  // Rückwege aus den Häusern: ein Schritt vor der Tür, mit Blick auf die Straße.
  const out = (bld, bay, yaw) => {
    const p = bld.at(bay, 0, 1.4);
    return { pos: [p.x, 0, p.z], yaw };
  };
  loc.exits = {
    werkstatt: out(kessler, 1, -Math.PI / 2 + Math.PI),
    apotheke: out(apotheke, 1, -Math.PI / 2),
    destille: out(destille, 1, Math.PI),
    bank: out(bank, 2, -Math.PI / 2),
    pension: out(pension, 2, Math.PI),
  };

  // Anker, an die Fälle ihre Figuren hängen können.
  const k = kessler.at(0, 0, 1.3);
  loc.anchor('vorWerkstatt', k.x, 0.13, k.z, -Math.PI / 2);
  loc.anchor('sophienEcke', 12.5, 0.13, -96.7, -Math.PI * 0.6);
  loc.anchor('platz', 9, 0, -7, Math.PI);

  // Stadtplan für das Notizbuch.
  loc.map = {
    bounds: { minX: -175, maxX: 135, minZ: -195, maxZ: 72 },
    streets: [
      { x0: -32, x1: 32, z0: -24, z1: 18, name: 'Hackescher Markt', tx: 4, tz: -15 },
      { x0: -9, x1: 9, z0: -190, z1: -24, name: 'Rosenthaler Straße', tx: 0, tz: -150, vertical: true },
      { x0: 9, x1: 130, z0: -105, z1: -95, name: 'Sophienstraße', tx: 74, tz: -100 },
      { x0: -170, x1: -32, z0: -14, z1: -2, name: 'Oranienburger Straße', tx: -100, tz: -8 },
      { x0: -5, x1: 5, z0: 18, z1: 32, name: '' },
      { x0: -150, x1: 150, z0: 32, z1: 44, name: 'Burgstraße', tx: -80, tz: 38 },
    ],
    water: { x0: -175, x1: 135, z0: 44, z1: 72, name: 'Spree', tx: 40, tz: 60 },
    rail: { x0: -175, x1: 135, z0: 18, z1: 32, name: 'Stadtbahn · Bhf. Börse', tx: 90, tz: 25 },
    places: [
      { name: 'Pension Puhlmann', at: pension.at(2, 0) },
      { name: 'Werkstatt Kessler', at: kessler.at(1, 0) },
      { name: 'Apotheke', at: apotheke.at(1, 0) },
      { name: 'Goldene Schrippe', at: destille.at(1, 0) },
      { name: 'Bankhaus Lindner', at: bank.at(2, 0) },
    ],
  };

  buildTraffic(loc, r);
  buildWeather(loc, r);

  return loc;
}

function addSign(loc, pos, rotY, texture, w, h) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: 0.32 }),
  );
  m.position.copy(pos);
  m.rotation.y = rotY;
  loc.scene.add(m);
}

function buildLamps(loc, positions, ironMat) {
  const { scene } = loc;
  const post = new Bag();
  post.add(cyl(0.13, 0.17, 0.5, 0, 0.25, 0, 10), 0x0d100f);
  post.add(cyl(0.06, 0.1, 3.1, 0, 1.95, 0, 10), 0x0d100f);
  post.add(cyl(0.1, 0.07, 0.1, 0, 2.6, 0, 10), 0x0d100f);
  post.box(0x0d100f, 0.65, 0.035, 0.035, 0, 3.15, 0);
  post.add(cyl(0.02, 0.2, 0.26, 0, 4.2, 0, 6), 0x0d100f);
  post.add(cyl(0.2, 0.13, 0.03, 0, 3.53, 0, 6), 0x0d100f);
  post.add(cyl(0.015, 0.015, 0.1, 0, 4.36, 0, 6), 0x0d100f);
  const glass = cyl(0.2, 0.13, 0.55, 0, 3.8, 0, 6);
  const postMesh = new THREE.InstancedMesh(post.build(), std({ vertexColors: true, roughness: 0.5, metalness: 0.5 }), positions.length);
  const glassMesh = new THREE.InstancedMesh(glass, new THREE.MeshBasicMaterial({ color: new THREE.Color(4.2, 2.6, 1.1) }), positions.length);
  const m = new THREE.Matrix4();
  const glowMat = new THREE.SpriteMaterial({ map: softDisc('lampGlow'), color: 0xffa858, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  const poolGeo = new THREE.PlaneGeometry(1, 1);
  poolGeo.rotateX(-Math.PI / 2);
  const poolMat = new THREE.MeshBasicMaterial({ map: softDisc('lampPool', 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0.33)'), color: 0xc77b38, transparent: true, opacity: 0.33, depthWrite: false, blending: THREE.AdditiveBlending });
  const pools = new THREE.InstancedMesh(poolGeo, poolMat, positions.length);
  const glows = [];
  positions.forEach(([x, z], i) => {
    const y = loc.heightAt(x, z);
    m.makeTranslation(x, y, z);
    postMesh.setMatrixAt(i, m);
    glassMesh.setMatrixAt(i, m);
    m.makeScale(13, 1, 13).setPosition(x, y + 0.03, z);
    pools.setMatrixAt(i, m);
    const s = new THREE.Sprite(glowMat.clone());
    s.position.set(x, y + 3.8, z);
    s.scale.setScalar(3.6);
    scene.add(s);
    glows.push({ s, x, z, y, seed: i * 1.7 });
    loc.collide(x - 0.14, x + 0.14, z - 0.14, z + 0.14);
  });
  postMesh.frustumCulled = glassMesh.frustumCulled = pools.frustumCulled = false;
  scene.add(postMesh, glassMesh, pools);

  // Nur die nächsten Laternen werfen echtes Licht. Die Anzahl bleibt fest, damit nichts neu kompiliert.
  const lights = [];
  for (let i = 0; i < 6; i++) {
    const l = new THREE.PointLight(0xffa35a, 0, 22, 1.7);
    scene.add(l);
    lights.push(l);
  }
  const ranked = glows.map((g) => ({ g, d: 0 }));
  let timer = 0;
  loc.onUpdate((dt, t, { camera }) => {
    timer -= dt;
    if (timer < 0) {
      timer = 0.25;
      for (const e of ranked) {
        const dx = e.g.x - camera.position.x;
        const dz = e.g.z - camera.position.z;
        e.d = dx * dx + dz * dz;
      }
      ranked.sort((a, b) => a.d - b.d);
    }
    lights.forEach((l, i) => {
      const { g } = ranked[i];
      l.position.set(g.x, g.y + 3.7, g.z);
      const flicker = 0.93 + 0.07 * Math.sin(t * 9 + g.seed) * Math.sin(t * 3.7 + g.seed * 2);
      // Die letzte Lampe der Rangliste blendet aus, damit das Umspringen nicht auffällt.
      const fade = i < 4 ? 1 : 0.6;
      l.intensity = 32 * flicker * fade;
    });
    for (const g of glows) {
      g.s.material.opacity = 0.5 + 0.06 * Math.sin(t * 6 + g.seed);
    }
  });
}

function buildPlaza(loc, r, ironMat) {
  const { scene } = loc;
  // Bäume: kahle Linden im November, jeder Ast ein Zylinder.
  const branches = [];
  const addBranch = (start, dir, len, rad, depth) => {
    const end = start.clone().addScaledVector(dir, len);
    const g = new THREE.CylinderGeometry(rad * 0.7, rad, len, 5);
    g.translate(0, len / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    g.applyQuaternion(q);
    g.translate(start.x, start.y, start.z);
    branches.push(g);
    if (depth <= 0) return;
    const n = depth > 2 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const nd = dir.clone().add(new THREE.Vector3(r() - 0.5, (r() - 0.25) * 0.7, r() - 0.5).multiplyScalar(1.3)).normalize();
      addBranch(end, nd, len * (0.62 + r() * 0.2), rad * 0.62, depth - 1);
    }
  };
  const trees = [[-22, -14], [-22, 6], [22, -14], [22, 6], [-11, 8], [11, 8]];
  for (const [x, z] of trees) {
    addBranch(new THREE.Vector3(x, 0, z), new THREE.Vector3(0, 1, 0), 3.2, 0.2, 5);
    loc.collide(x - 0.22, x + 0.22, z - 0.22, z + 0.22);
  }
  addMesh(scene, merge(branches), std({ color: 0x14100d, roughness: 1 }));

  // Litfaßsäule
  const lx = -16;
  const lz = -3;
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 3.1, 24, 1, true), std({ map: posterWall(), roughness: 0.9, emissive: 0x332a1c, emissiveMap: posterWall() }));
  column.position.set(lx, 1.85, lz);
  scene.add(column);
  const capBag = new Bag();
  capBag.add(cyl(0.95, 0.98, 0.3, lx, 0.15, lz, 24), 0x1a2019);
  capBag.add(cyl(0.9, 0.9, 0.3, lx, 3.45, lz, 24), 0x1a2019);
  capBag.add(cyl(0.2, 1.0, 0.7, lx, 3.95, lz, 24), 0x1a2019);
  capBag.add(cyl(0.03, 0.09, 0.3, lx, 4.42, lz, 8), 0x1a2019);
  addMesh(scene, capBag.build(), std({ vertexColors: true, roughness: 0.5, metalness: 0.4 }));
  loc.collide(lx - 0.7, lx + 0.7, lz - 0.7, lz + 0.7);
  loc.anchor('litfass', lx, 1.7, lz);
  loc.addHotspot({
    id: 'litfass',
    pos: [lx, 1.7, lz],
    radius: 0.9,
    range: 3.2,
    label: 'Litfaßsäule',
    action: { say: 'Eine Erfindung des Berliner Druckers Ernst Litfaß: Die Stadt hat ihre Reklame gezähmt, indem sie ihr eine Säule gab. Wintergarten, Zirkus Renz, Lagerbier. Auch Extrablätter hängen hier.' },
  });

  // Urania-Säule: öffentliche Normaluhr, seit diesem Jahr neu in der Stadt.
  const ux = 14;
  const uz = -10;
  const urania = new Bag();
  urania.add(cyl(0.3, 0.42, 0.4, ux, 0.2, uz, 12), 0x223021);
  urania.add(cyl(0.16, 0.2, 3.2, ux, 2, uz, 12), 0x223021);
  urania.add(cyl(0.35, 0.35, 0.8, ux, 3.9, uz, 12), 0x223021);
  urania.add(cyl(0.04, 0.3, 0.45, ux, 4.5, uz, 12), 0x223021);
  addMesh(scene, urania.build(), std({ vertexColors: true, roughness: 0.4, metalness: 0.5 }));
  const face = clockFace(9, 40, 128);
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20), new THREE.MeshBasicMaterial({ map: face, color: new THREE.Color(1.2, 1.1, 0.85) }));
    const a = (i / 4) * Math.PI * 2;
    p.position.set(ux + Math.sin(a) * 0.36, 3.9, uz + Math.cos(a) * 0.36);
    p.rotation.y = a;
    scene.add(p);
  }
  loc.collide(ux - 0.4, ux + 0.4, uz - 0.4, uz + 0.4);
  loc.addHotspot({
    pos: [ux, 2.6, uz],
    radius: 1,
    range: 3.6,
    label: 'Urania-Säule',
    action: { say: 'Die neue Urania-Säule: Normaluhr, Wetterdaten, Sternkarte. Zwanzig Minuten vor zehn, 4 Grad, Luftdruck fallend. Berlin liebt es, wenn man ihm die genaue Zeit sagt.' },
  });

  // Café Achteck: die grüne Berliner Bedürfnisanstalt.
  const cx = -24;
  const cz = 12;
  const octo = new Bag();
  octo.add(cyl(1.4, 1.4, 2.1, cx, 1.05, cz, 8), 0x1f3a2a);
  octo.add(cyl(1.55, 1.5, 0.12, cx, 2.15, cz, 8), 0x162a1e);
  octo.add(cyl(0.3, 1.5, 0.6, cx, 2.5, cz, 8), 0x162a1e);
  addMesh(scene, octo.build(), std({ vertexColors: true, roughness: 0.5, metalness: 0.3 }));
  loc.collide(cx - 1.25, cx + 1.25, cz - 1.25, cz + 1.25);
  loc.addHotspot({
    pos: [cx, 1.5, cz],
    radius: 1.4,
    range: 3.2,
    label: 'Grünes Achteck',
    action: { say: 'Gusseisern, grün, achteckig. Die Berliner nennen es „Café Achteck“ – der einzige Ort der Stadt, an dem man ohne Konsumzwang nichts bestellt.' },
  });

  // Plumpe: die Straßenpumpe.
  const px = 6.4;
  const pz = -68;
  const pump = new Bag();
  const py = 0.13;
  pump.add(cyl(0.12, 0.2, 1.8, px, py + 0.9, pz, 10), 0x25342a);
  pump.add(cyl(0.2, 0.15, 0.3, px, py + 1.9, pz, 10), 0x25342a);
  pump.add(cyl(0.03, 0.05, 0.25, px, py + 2.15, pz, 8), 0x25342a);
  pump.box(0x25342a, 0.04, 0.06, 0.8, px, py + 1.5, pz + 0.3);
  pump.box(0x25342a, 0.12, 0.1, 0.3, px, py + 0.75, pz - 0.2);
  addMesh(scene, pump.build(), std({ vertexColors: true, roughness: 0.4, metalness: 0.5 }));
  loc.collide(px - 0.2, px + 0.2, pz - 0.2, pz + 0.2);
  loc.addHotspot({
    pos: [px, 1.4, pz],
    radius: 0.6,
    range: 2.5,
    label: 'Plumpe',
    action: { say: 'Eine Straßenpumpe, „Plumpe“ im hiesigen Idiom. Das Wasser ist eisig und schmeckt nach Eisen. Das Berlinische ist eine Sprache, die sich auch beim Trinken nicht schont.' },
  });

  // Droschkenplatz mit wartender Droschke
  const cab = makeDroschke();
  cab.position.set(24, 0, -2);
  cab.rotation.y = Math.PI;
  scene.add(cab);
  loc.collide(22.8, 25.2, -8, 2.2);
  loc.addHotspot({
    pos: [24, 1.5, -1],
    radius: 1.6,
    range: 3.4,
    label: 'Droschke',
    action: { say: '„Na, wohin, Herr Doktor? Keen Doktor? Sehn aber so aus.“ Der Kutscher mustert mich und wendet sich wieder seiner Stulle zu. Für diesen Fall bleibe ich zu Fuß – die Wege sind kurz, und zu Fuß sieht man mehr.' },
  });

  // Bänke
  const bench = new Bag();
  for (const [x, z] of [[-14, 6], [14, 6]]) {
    for (let i = 0; i < 4; i++) bench.box(0x3a2a1c, 1.8, 0.04, 0.12, x, 0.48, z - 0.2 + i * 0.14);
    bench.box(0x3a2a1c, 1.8, 0.4, 0.04, x, 0.72, z + 0.32);
    bench.box(0x0e1110, 0.08, 0.5, 0.5, x - 0.8, 0.25, z);
    bench.box(0x0e1110, 0.08, 0.5, 0.5, x + 0.8, 0.25, z);
    loc.collide(x - 0.9, x + 0.9, z - 0.3, z + 0.35);
  }
  addMesh(scene, bench.build(), std({ vertexColors: true, roughness: 0.8 }));
}

function makeDroschke() {
  const g = new THREE.Group();
  const mat = std({ vertexColors: true, roughness: 0.4, metalness: 0.2 });
  const body = new Bag();
  body.box(0x101418, 1.4, 1.15, 1.7, 0, 1.15, -1.0);
  body.box(0x0b0d10, 1.5, 0.08, 1.9, 0, 1.76, -1.0);
  body.box(0x1a1208, 1.4, 0.5, 0.9, 0, 0.82, 0.3);
  body.box(0x101418, 1.0, 0.1, 0.5, 0, 1.45, 0.25);
  body.box(0x1a1208, 0.06, 0.06, 2.6, -0.45, 0.72, 1.7);
  body.box(0x1a1208, 0.06, 0.06, 2.6, 0.45, 0.72, 1.7);
  const wheel = (x, z, r) => {
    const w = new THREE.TorusGeometry(r, 0.03, 6, 22);
    w.rotateY(Math.PI / 2);
    w.translate(x, r, z);
    body.add(w, 0x1a1208);
    for (let i = 0; i < 5; i++) {
      const s = new THREE.BoxGeometry(0.02, r * 2, 0.03);
      s.rotateX((i / 5) * Math.PI);
      s.translate(x, r, z);
      body.add(s, 0x1a1208);
    }
  };
  wheel(-0.78, -1.3, 0.62);
  wheel(0.78, -1.3, 0.62);
  wheel(-0.78, 0.5, 0.42);
  wheel(0.78, 0.5, 0.42);
  g.add(new THREE.Mesh(body.build(), mat));
  const win = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.45, 0.8), new THREE.MeshStandardMaterial({ color: 0x0e1520, roughness: 0.1, metalness: 0.7 }));
  win.position.set(0, 1.4, -1.0);
  g.add(win);
  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.12), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.5, 1) }));
  lantern.position.set(0.82, 1.5, 0.15);
  g.add(lantern);
  const driver = makeFigure({ coat: 0x24201a, hat: 'top', hatColor: 0x18140f, moustache: true });
  driver.scale.setScalar(0.9);
  driver.position.set(0, 1.0, 0.2);
  g.add(driver);
  const horse = makeHorse(0x30221a);
  horse.position.set(0, 0, 3.0);
  g.add(horse);
  g.userData.horse = horse;
  return g;
}

function buildTraffic(loc, r) {
  const { scene } = loc;
  // Droschke fährt die Rosenthaler rauf und runter, Wende im Platz.
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(3.6, 0, -180),
    new THREE.Vector3(3.6, 0, -90),
    new THREE.Vector3(3.6, 0, -30),
    new THREE.Vector3(6, 0, -4),
    new THREE.Vector3(0, 0, 8),
    new THREE.Vector3(-6, 0, -4),
    new THREE.Vector3(-3.6, 0, -30),
    new THREE.Vector3(-3.6, 0, -90),
    new THREE.Vector3(-3.6, 0, -180),
    new THREE.Vector3(0, 0, -184),
  ], true);
  const cab = makeDroschke();
  scene.add(cab);
  const light = new THREE.Vector3();
  const pathLen = curve.getLength();
  let u = 0.1;
  let phase = 0;
  const ahead = new THREE.Vector3();
  loc.onUpdate((dt, t, { camera }) => {
    const p = curve.getPointAt(u);
    curve.getPointAt((u + 0.002) % 1, ahead);
    const dist = Math.hypot(p.x - camera.position.x, p.z - camera.position.z);
    const blocked = dist < 7 && (camera.position.x - p.x) * (ahead.x - p.x) + (camera.position.z - p.z) * (ahead.z - p.z) > 0;
    const speed = blocked ? 0 : 4.2;
    u = (u + (speed * dt) / pathLen) % 1;
    cab.position.set(p.x, 0, p.z);
    cab.rotation.y = Math.atan2(ahead.x - p.x, ahead.z - p.z);
    if (speed > 0) {
      phase += dt * 9;
      trotHorse(cab.userData.horse, phase);
    }
    light.copy(p);
  });

  // Passanten auf den Gehwegen
  const looks = [
    { coat: 0x1f2228, hat: 'top', moustache: true },
    { coat: 0x2a2620, hat: 'bowler', beard: true, hair: 0x4a4038 },
    { coat: 0x30261e, hat: 'cap', trousers: 0x24201a },
    { coat: 0x262a2e, hat: 'cap', moustache: true },
    { coat: 0x38242a, skirt: true, hat: 'bonnet', hatColor: 0x22161a, height: 1.62 },
    { coat: 0x2a2c38, skirt: true, hat: 'bonnet', hatColor: 0x1c1c26, height: 1.6 },
    { coat: 0x1c1f24, hat: 'bowler', cane: true },
    { coat: 0x322a22, hat: 'cap', apron: 0x8a8272 },
  ];
  const routes = [
    [[-7.5, -28], [-7.5, -180]],
    [[7.5, -176], [7.5, -30]],
    [[-7.5, -130], [-7.5, -40]],
    [[7.5, -80], [7.5, -170]],
    [[14, -96.4], [120, -96.4]],
    [[118, -103.5], [14, -103.5]],
    [[-42, -12.6], [-160, -12.6]],
    [[-150, -3.4], [-38, -3.4]],
    [[-24, -18], [24, -18]],
    [[20, 12], [-20, 12]],
    [[-90, 40], [80, 40]],
    [[-3, 35], [-3, -20]],
  ];
  const walkers = routes.map((route, i) => {
    const fig = makeFigure(looks[i % looks.length]);
    const from = new THREE.Vector2(route[0][0], route[0][1]);
    const to = new THREE.Vector2(route[1][0], route[1][1]);
    const len = from.distanceTo(to);
    const w = { fig, from, to, len, s: r() * len, dir: 1, phase: r() * 6, speed: 1.05 + r() * 0.4 };
    scene.add(fig);
    return w;
  });
  loc.onUpdate((dt, t, { camera }) => {
    for (const w of walkers) {
      const a = w.from;
      const b = w.to;
      const k = w.s / w.len;
      const x = a.x + (b.x - a.x) * k;
      const z = a.y + (b.y - a.y) * k;
      const dx = camera.position.x - x;
      const dz = camera.position.z - z;
      const near = dx * dx + dz * dz < 1.3;
      if (!near) {
        w.s += w.dir * w.speed * dt;
        w.phase += dt * w.speed * 5.2;
        if (w.s > w.len) w.dir = -1;
        if (w.s < 0) w.dir = 1;
        walkFigure(w.fig, w.phase);
      }
      w.fig.position.set(x, loc.heightAt(x, z), z);
      w.fig.rotation.y = Math.atan2((b.x - a.x) * w.dir, (b.y - a.y) * w.dir);
    }
  });
}

function buildWeather(loc, r) {
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
  const rain = new THREE.LineSegments(g, new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { time: { value: 0 }, origin: { value: new THREE.Vector3() } },
    vertexShader: `
      attribute float tail;
      uniform float time; uniform vec3 origin; varying float vA;
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

function buildTrain() {
  const group = new THREE.Group();
  const bag = new Bag();
  const lit = new Bag();
  // Lokomotive voran in +X.
  bag.box(0x14181c, 8, 0.5, 2.6, 2, 1.1, 0);
  bag.add(cylX(0.95, 5, 2.8, 2.2, 0), 0x171b1f);
  bag.box(0x171b1f, 2.6, 2.3, 2.6, -1, 2.6, 0);
  bag.box(0x0c0e10, 2.9, 0.12, 2.9, -1, 3.8, 0);
  bag.add(cyl(0.3, 0.26, 1.3, 4.9, 3.5, 0, 10), 0x0c0e10);
  bag.add(cyl(0.45, 0.45, 0.6, 3, 3.1, 0, 10), 0x24201a);
  for (const x of [0.5, 2.3, 4.1]) {
    for (const z of [-1.2, 1.2]) bag.add(cylX2(0.7, x, 0.7, z), 0x0e1012);
  }
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 4, 1.8) }));
  lamp.position.set(6.1, 1.9, 0);
  group.add(lamp);
  // Wagen
  const CAR = 12.5;
  const COUNT = 6;
  for (let c = 0; c < COUNT; c++) {
    const x = -8.5 - c * (CAR + 0.6);
    bag.box(0x2a2a22, CAR, 2.5, 2.7, x, 2.2, 0);
    bag.box(0x12100e, CAR + 0.2, 0.15, 2.9, x, 3.55, 0);
    bag.box(0x0e0e0e, CAR, 0.4, 2.4, x, 0.85, 0);
    for (const wx of [-4, 4]) {
      for (const wz of [-1.1, 1.1]) bag.add(cylX2(0.42, x + wx, 0.42, wz), 0x0e1012);
    }
    for (let w = 0; w < 7; w++) {
      const wx = x - CAR / 2 + 1 + w * 1.77;
      lit.box(0xffffff, 0.9, 0.9, 2.74, wx, 2.5, 0);
    }
  }
  group.add(new THREE.Mesh(bag.build(), std({ vertexColors: true, roughness: 0.5, metalness: 0.3 })));
  group.add(new THREE.Mesh(lit.build(), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.25, 0.6), vertexColors: true })));
  return { group, length: COUNT * (CAR + 0.6) + 8 };
}

function cylX(r, len, y, x, z) {
  const g = new THREE.CylinderGeometry(r, r, len, 14);
  g.rotateZ(Math.PI / 2);
  g.translate(x + 2.1, y, z);
  return g;
}

function cylX2(r, x, y, z) {
  const g = new THREE.CylinderGeometry(r, r, 0.08, 14);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  return g;
}
