import * as THREE from 'three';
import { Bag, addMesh, box, merge, pediment, roofPrism, std } from '../kit.js';
import { pavement } from '../textures.js';

// Häuser: Fensterachsen als Instanzen, Hauskörper, Gesimse, Dächer, Gehwege.
export const BAY_W = 3.4;
export const FLOOR = { ground: 4.4, noble: 3.9, upper: 3.5, attic: 2.9 };
export const FACADES = [0x9c8f79, 0xa89a80, 0x8c8474, 0xa08a70, 0x8f8b84, 0xb0a288, 0x8a7a68, 0x9a9488];

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

export const FACING = { south: 0, north: Math.PI, east: Math.PI / 2, west: -Math.PI / 2 };

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

// Baukasten für Häuserzeilen. block() und row() setzen Häuser, finish() baut danach alles,
// was erst feststeht, wenn alle Häuser stehen: Hauskörper, Dächer, Gehwege.
export function createFacades(loc, r, { plasterTex, wallMat, darkGlass, litGlass, roofMat }) {
  const { scene } = loc;
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

  const finish = () => {
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

    // Dächer, Massen
    addMesh(scene, merge(roofs), roofMat);
    addMesh(scene, massing.build(), std({ vertexColors: true, ...plasterTex, roughness: 0.95 }));
  };

  return { block, row, finish };
}

export function addSign(loc, pos, rotY, texture, w, h) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: 0.32 }),
  );
  m.position.copy(pos);
  m.rotation.y = rotY;
  loc.scene.add(m);
}
