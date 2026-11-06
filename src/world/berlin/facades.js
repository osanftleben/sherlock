import * as THREE from 'three';
import { Bag, addMesh, box, matte, merge, pediment, roofPrism, std, worldUV } from '../kit.js';
import {
  SHOP_KINDS, SIGN_ATLAS, SIGN_NAMES, WINDOW_ATLAS, nightReflection, pavement, railing, rng, shopDisplay, shopShutter, shopSigns, windowAtlas,
} from '../textures.js';

// Häuser: Fensterachsen als Instanzen, Hauskörper, Gesimse, Dächer, Gehwege.
export const BAY_W = 3.4;
export const FLOOR = { ground: 4.4, noble: 3.9, upper: 3.5, attic: 2.9 };
// So weit springt ein Erker vor die Fassade.
const ERKER_OUT = 0.75;
// Höhe der Balkongitter unter dem Handlauf.
const RAIL_H = 0.92;
// Dunkle Fenster: wie hell die Gardine dahinter erscheint und wie stark das Glas spiegelt.
const SHADE_ALBEDO = 0.07;
const SHADE_REFLECT = 6;
// Schmiedeeisen: Handläufe, Ausleger
const IRON = 0x1a1c1b;
// Tordurchfahrt zum Hof: lichte Breite und Kämpferhöhe des Rundbogens.
export const GATE_W = 2.4;
const GATE_SPRING = 2.75;
// Kantenlänge der Zellen, in die die Fensterachsen für das Culling geteilt werden.
const CULL_CELL = 64;
export const FACADES = [0x9c8f79, 0xa89a80, 0x8c8474, 0xa08a70, 0x8f8b84, 0xb0a288, 0x8a7a68, 0x9a9488];

function bayParts(type) {
  const W = BAY_W;
  const H = FLOOR[type === 'shop' || type === 'door' || type === 'display' || type === 'gate' ? 'ground' : type];
  const wall = new Bag();
  const glass = [];
  const trimC = new THREE.Color(1.22, 1.2, 1.15);
  const stone = new THREE.Color(0.8, 0.78, 0.74);
  const wood = new THREE.Color(0.09, 0.07, 0.06);
  const D = 0.34;
  const hole = (ww, wy, wh, backing = true) => {
    const side = (W - ww) / 2;
    wall.box(0xffffff, side, H, D, side / 2, H / 2, -D / 2);
    wall.box(0xffffff, side, H, D, W - side / 2, H / 2, -D / 2);
    wall.box(0xffffff, ww, wy, D, W / 2, wy / 2, -D / 2);
    const top = H - wy - wh;
    wall.box(0xffffff, ww, top, D, W / 2, wy + wh + top / 2, -D / 2);
    if (backing) wall.box(wood, ww, wh, 0.03, W / 2, wy + wh / 2, -D + 0.01);
  };
  const sash = (ww, wy, wh, rows = 2, d = D) => {
    const z = -d + 0.09;
    // UV 0..1 über die ganze Scheibe für das gemalte Fensterbild (windowAtlas).
    glass.push(new THREE.BoxGeometry(ww - 0.06, wh - 0.06, 0.02).translate(W / 2, wy + wh / 2, -d + 0.05));
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

  if (type === 'gate') {
    // Tordurchfahrt: Wand mit Rundbogen bis zum Boden, Bogenrahmen, Kämpfer, Schlussstein.
    const r = GATE_W / 2;
    const cx = W / 2;
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(cx - r, 0);
    s.lineTo(cx - r, GATE_SPRING);
    s.absarc(cx, GATE_SPRING, r, Math.PI, 0, true);
    s.lineTo(cx + r, 0);
    s.lineTo(W, 0);
    s.lineTo(W, H);
    s.lineTo(0, H);
    s.closePath();
    const front = new THREE.ExtrudeGeometry(s, { depth: D, bevelEnabled: false, curveSegments: 14 });
    wall.add(worldUV(front.translate(0, 0, -D), 0.5), 0xffffff);
    const ring = new THREE.Shape();
    ring.moveTo(cx + r + 0.22, GATE_SPRING);
    ring.absarc(cx, GATE_SPRING, r + 0.22, 0, Math.PI, false);
    ring.lineTo(cx - r, GATE_SPRING);
    ring.absarc(cx, GATE_SPRING, r, Math.PI, 0, true);
    ring.closePath();
    wall.add(worldUV(new THREE.ExtrudeGeometry(ring, { depth: 0.06, bevelEnabled: false, curveSegments: 14 }), 0.5), trimC);
    for (const sx of [-1, 1]) {
      // Pfeiler mit Quaderung, darauf der Kämpfer.
      for (let y = 0.25; y < GATE_SPRING - 0.2; y += 0.5) wall.box(trimC, 0.26, 0.42, 0.05, cx + sx * (r + 0.13), y + 0.21, 0.025);
      wall.box(trimC, 0.36, 0.16, 0.1, cx + sx * (r + 0.13), GATE_SPRING - 0.08, 0.05);
      wall.box(stone, cx - r, 0.5, 0.12, sx < 0 ? (cx - r) / 2 : W - (cx - r) / 2, 0.25, 0.06);
    }
    wall.box(trimC, 0.34, 0.42, 0.12, cx, GATE_SPRING + r + 0.12, 0.06);
    return { wall: wall.build(), glass: null };
  }

  if (type === 'ground' || type === 'shop' || type === 'door' || type === 'display') {
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
    } else if (type === 'shop' || type === 'display') {
      // Große Spiegelscheibe ohne Mittelpfosten, damit die Goldschrift frei steht.
      // display: Schaufenster ohne Rückwand, dahinter baut der Aufrufer eine Auslage.
      const ww = 2.7;
      hole(ww, 0.7, 2.75, type === 'shop');
      // Scheibe mit UV 0..1, damit die gemalte Auslage (shopDisplay) die ganze Fläche füllt.
      glass.push(new THREE.BoxGeometry(ww - 0.06, 2.7, 0.02).translate(W / 2, 0.7 + 1.37, -D + 0.05));
      wall.box(wood, ww + 0.1, 0.1, 0.07, W / 2, 0.72, -D + 0.1);
      wall.box(wood, ww + 0.1, 0.1, 0.07, W / 2, 3.42, -D + 0.1);
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
  } else if (type === 'dormer') {
    // Dachgaube: Stirnwand mit Fenster, Wangen und Satteldach reichen nach hinten ins Dach.
    const fw = 1.5;
    const fh = 1.55;
    const ww = 0.9;
    const wy = 0.35;
    const wh = 0.95;
    const t = 0.14;
    const side = (fw - ww) / 2;
    const zinc = new THREE.Color(0.42, 0.44, 0.46);
    wall.box(0xffffff, side, fh, t, W / 2 - fw / 2 + side / 2, fh / 2, -t / 2);
    wall.box(0xffffff, side, fh, t, W / 2 + fw / 2 - side / 2, fh / 2, -t / 2);
    wall.box(0xffffff, ww, wy, t, W / 2, wy / 2, -t / 2);
    wall.box(0xffffff, ww, fh - wy - wh, t, W / 2, (wy + wh + fh) / 2, -t / 2);
    wall.box(wood, ww, wh, 0.03, W / 2, wy + wh / 2, -t + 0.01);
    sash(ww, wy, wh, 2, t);
    wall.box(trimC, ww + 0.2, 0.06, 0.12, W / 2, wy - 0.03, 0.06);
    // Wangen erst hinter der Stirnwand, sonst flackern die Stirnflächen gegeneinander.
    for (const s of [-1, 1]) wall.box(zinc, 0.08, fh, 1.26, W / 2 + s * (fw / 2 - 0.04), fh / 2, -t - 0.63);
    wall.box(trimC, fw + 0.2, 0.08, 0.16, W / 2, fh, 0.04);
    wall.add(pediment(fw + 0.2, 0.45, 1.5, W / 2, fh + 0.04, -0.65), zinc);
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
    for (const t of ['ground', 'shop', 'display', 'door', 'gate', 'noble', 'upper', 'attic', 'dormer']) {
      this.types[t] = { parts: bayParts(t), walls: [], lit: [], dark: [], kinds: {}, rooms: [], shades: [] };
    }
  }

  // glass: false lässt die Scheibe weg, wenn der Aufrufer sie selbst baut (Schaufenster).
  // kind: Ladensorte eines erleuchteten Schaufensters, bestimmt die gemalte Auslage.
  // room: { cell, bright } eines Wohnungsfensters, Bild aus dem windowAtlas. Erleuchtet
  // zeigt es Gardine oder Zimmer, dunkel nur einen Schimmer davon hinter spiegelndem Glas.
  place(type, matrix, color, lit, glass = true, kind = null, room = null) {
    const t = this.types[type];
    t.walls.push({ matrix, color });
    if (!glass) return;
    if (lit && kind) (t.kinds[kind] ??= []).push(matrix);
    else if (room) (lit ? t.rooms : t.shades).push({ matrix, ...room });
    else (lit ? t.lit : t.dark).push(matrix);
  }

  // Die Wände der Achsen (über 200 Dreiecke je Achse) werden nach Zellen des Stadtgrundrisses
  // (CULL_CELL) in eigene Instanz-Meshes geteilt. Jedes kennt seine Hüllkugel, so zeichnet three.js
  // nur die Zellen im Blickfeld statt aller Achsen des Viertels, auch der hinter der Kamera.
  // Die Scheiben (12 Dreiecke) bleiben je Art ein Mesh: Mehr Zeichenaufrufe kosten dort mehr,
  // als das Culling spart.
  build(scene, wallMat, darkGlass, litGlass) {
    const color = new THREE.Color();
    // Geschlossene Läden haben Klappläden, erleuchtete zeigen ihre Auslage.
    const shutter = std({ map: shopShutter(), roughness: 0.85 });
    const displayTint = new THREE.Color(0.95, 0.85, 0.7);
    const chunks = (list) => {
      const cells = new Map();
      for (const e of list) {
        const m = (e.matrix ?? e).elements;
        const key = `${Math.floor(m[12] / CULL_CELL)},${Math.floor(m[14] / CULL_CELL)}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(e);
      }
      return cells.values();
    };
    const add = (list, geo, mat, fill, split = false) => {
      if (!list.length) return;
      for (const part of split ? chunks(list) : [list]) {
        const mesh = new THREE.InstancedMesh(geo(part), mat, part.length);
        part.forEach((e, i) => fill(mesh, e, i));
        mesh.computeBoundingSphere();
        scene.add(mesh);
      }
    };
    for (const [name, t] of Object.entries(this.types)) {
      add(t.walls, () => t.parts.wall, wallMat, (mesh, w, i) => {
        mesh.setMatrixAt(i, w.matrix);
        mesh.setColorAt(i, color.set(w.color));
      }, true);
      const lists = [[t.dark, name === 'shop' ? shutter : darkGlass], [t.lit, litGlass]];
      for (const [kind, list] of Object.entries(t.kinds)) lists.push([list, new THREE.MeshBasicMaterial({ map: shopDisplay(kind), color: displayTint })]);
      for (const [list, mat] of lists) add(list, () => t.parts.glass, mat, (mesh, m, i) => mesh.setMatrixAt(i, m));
      for (const [list, mat] of [[t.rooms, roomMaterial(litGlass)], [t.shades, shadeMaterial()]]) {
        // Eigene Kopie der Scheibe je Zelle, weil nur diese Instanzen eine Atlaszelle tragen.
        const geo = (part) => t.parts.glass.clone().setAttribute('aCell', new THREE.InstancedBufferAttribute(new Float32Array(part.map((w) => w.cell)), 1));
        add(list, geo, mat, (mesh, w, i) => {
          mesh.setMatrixAt(i, w.matrix);
          mesh.setColorAt(i, color.setScalar(w.bright));
        });
      }
    }
  }
}

// Lässt jede Instanz über das Attribut aCell ihre Zelle aus dem windowAtlas lesen.
function readAtlasCell(material, key) {
  const { cols, rows } = WINDOW_ATLAS;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aCell;')
      .replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
        vec2 cellXY = vec2(mod(aCell, ${cols}.0), ${rows - 1}.0 - floor(aCell / ${cols}.0));
        vMapUv = (cellXY + 0.01 + 0.98 * vMapUv) / vec2(${cols}.0, ${rows}.0);`,
      );
  };
  material.customProgramCacheKey = () => key;
  return material;
}

// Ein Material für alle erleuchteten Wohnungsfenster. Die Grundfarbe gleicht den Atlas so
// aus, dass er im Mittel so hell ist wie die bisherige einfarbige Scheibe: Aus der Ferne
// (kleinste Mipmap) sieht das Fenster aus wie vorher, aus der Nähe zeigt es Gardine oder Zimmer.
let roomMat = null;
function roomMaterial(litGlass) {
  if (roomMat) return roomMat;
  const { map, avg } = windowAtlas();
  const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  roomMat = readAtlasCell(new THREE.MeshBasicMaterial({ map, color: new THREE.Color().setScalar(lum(litGlass.color) / lum(avg)) }), 'windowAtlas');
  return roomMat;
}

// Dunkle Wohnungsfenster: Glas, das die Nachtstraße spiegelt (nightReflection), am stärksten
// im flachen Blick die Straße entlang. Dahinter ahnt man die Gardine desselben Stockwerks,
// nur so hell, wie Laternen und Himmel sie treffen.
let shadeMat = null;
function shadeMaterial() {
  if (shadeMat) return shadeMat;
  const { map } = windowAtlas();
  shadeMat = readAtlasCell(std({
    map,
    color: new THREE.Color().setScalar(SHADE_ALBEDO),
    roughness: 0.08,
    metalness: 0,
    envMap: nightReflection(),
    envMapIntensity: SHADE_REFLECT,
  }), 'windowAtlasDark');
  return shadeMat;
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
// shopMix(x, z): Liste der Ladensorten an dieser Stelle (mehrfach genannt = häufiger).
export function createFacades(loc, r, { plasterTex, wallMat, darkGlass, litGlass, roofMat, shopMix = null }) {
  const { scene } = loc;
  const batcher = new FacadeBatcher();
  const kindRand = rng(1894);
  const winRand = rng(1895);
  const shadeRand = rng(1897);
  const massing = new Bag();
  const reliefRand = rng(1896);
  const reliefBag = new Bag();
  const ironBag = new Bag();
  const signRand = rng(1898);
  const signs = { boards: [], litBoards: [], emblems: [] };
  const masses = [];
  const slabs = [];
  const roofs = [];
  const curbs = [];

  // Erker, Balkone und Gauben eines Hauses, aus eigenem Zufall (reliefRand), damit Häuser,
  // Fenster und Läden bleiben, wie sie sind. Erker und Balkone halten eine Achse Abstand
  // zu den Hausenden, damit sie an Ecken nicht in die Nachbarzeile ragen.
  const planRelief = (bays, types, lit) => {
    let erker = null;
    if (bays >= 4 && reliefRand() < 0.4) {
      const n = bays >= 6 && reliefRand() < 0.5 ? 2 : 1;
      erker = { start: 1 + Math.floor(reliefRand() * (bays - 1 - n)), n };
    }
    const balconies = [];
    if (bays >= 3 && reliefRand() < 0.35) {
      const b = 1 + Math.floor(reliefRand() * (bays - 2));
      for (const i of new Set([b, bays - 1 - b])) {
        if (!erker || i < erker.start || i >= erker.start + erker.n) balconies.push(i);
      }
    }
    const dormers = [];
    if (reliefRand() < 0.6) {
      for (let i = 1; i < bays - 1; i += 2) {
        const on = reliefRand() < lit * 0.8;
        const cell = Math.floor(reliefRand() * WINDOW_ATLAS.rows * WINDOW_ATLAS.cols);
        dormers.push({ bay: i, on, room: { cell, bright: 0.8 + reliefRand() * 0.35 } });
      }
    }
    return { erker, balconies, dormers };
  };

  // Baut den Plan in Hauskoordinaten: x längs der Fassade, z aus ihr heraus.
  const buildRelief = ({ erker, balconies, dormers }, { base, types, col, cTrim, H }) => {
    const wall = new Bag();
    const iron = new Bag();
    // Schmiedeeisernes Gitter entlang einer achsparallelen Strecke, Unterkante y: eine Fläche
    // mit ausgestanztem Gitterbild (railing), darauf ein echter Handlauf.
    const rail = (xa, za, xb, zb, y) => {
      const len = Math.hypot(xb - xa, zb - za);
      const alongX = Math.abs(xb - xa) > Math.abs(zb - za);
      const g = new THREE.PlaneGeometry(len, RAIL_H);
      // Ganze Kacheln zu 0,5 m, damit an beiden Enden ein Stab steht.
      const tiles = Math.max(1, Math.round(len / 0.5));
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * tiles);
      if (!alongX) g.rotateY(Math.PI / 2);
      g.translate((xa + xb) / 2, y + RAIL_H / 2, (za + zb) / 2);
      iron.add(g, 0xffffff);
      wall.box(IRON, alongX ? len + 0.04 : 0.06, 0.05, alongX ? 0.06 : len + 0.04, (xa + xb) / 2, y + RAIL_H + 0.025, (za + zb) / 2);
    };

    if (erker) {
      // Die Fensterachsen selbst sind schon vorgerückt (ERKER_OUT); hier kommen Seitenwände,
      // Boden auf Konsolen, Gurtgesimse und oben eine Platte mit Gitter vor dem Dachgeschoss.
      const E = ERKER_OUT;
      const x0 = erker.start * BAY_W;
      const x1 = (erker.start + erker.n) * BAY_W;
      const mid = (x0 + x1) / 2;
      const w = x1 - x0;
      const bands = [];
      let top = FLOOR.ground;
      for (const t of types.slice(0, -1)) bands.push((top += FLOOR[t]));
      const side = E - 0.34;
      for (const sx of [x0 + 0.125, x1 - 0.125]) wall.box(col, 0.25, top - FLOOR.ground, side, sx, (FLOOR.ground + top) / 2, side / 2);
      wall.box(cTrim, w + 0.1, 0.32, E + 0.12, mid, FLOOR.ground - 0.04, (E + 0.12) / 2);
      for (const cx of erker.n === 2 ? [x0 + 0.45, mid, x1 - 0.45] : [x0 + 0.45, x1 - 0.45]) {
        wall.box(cTrim, 0.3, 0.36, E, cx, FLOOR.ground - 0.38, E / 2);
        wall.box(cTrim, 0.26, 0.3, E * 0.5, cx, FLOOR.ground - 0.71, E / 4);
      }
      for (const by of bands.slice(0, -1)) wall.box(cTrim, w + 0.02, 0.1, 0.1, mid, by, E + 0.04);
      wall.box(cTrim, w + 0.16, 0.24, E + 0.2, mid, top + 0.06, (E + 0.2) / 2);
      const ry = top + 0.18;
      rail(x0 + 0.05, E + 0.12, x1 - 0.05, E + 0.12, ry);
      rail(x0 + 0.05, 0.05, x0 + 0.05, E + 0.12, ry);
      rail(x1 - 0.05, 0.05, x1 - 0.05, E + 0.12, ry);
    }

    // Balkon vor dem Fenster der Beletage: Steinplatte auf zwei Konsolen, Eisengitter.
    for (const b of balconies) {
      const cx = (b + 0.5) * BAY_W;
      const y = FLOOR.ground + 0.3;
      const w = 2.3;
      const d = 0.85;
      wall.box(cTrim, w, 0.16, d, cx, y - 0.08, d / 2);
      for (const s of [-1, 1]) wall.box(cTrim, 0.22, 0.34, d - 0.1, cx + s * (w / 2 - 0.25), y - 0.33, (d - 0.1) / 2);
      rail(cx - w / 2 + 0.05, d - 0.05, cx + w / 2 - 0.05, d - 0.05, y);
      rail(cx - w / 2 + 0.05, 0.05, cx - w / 2 + 0.05, d - 0.05, y);
      rail(cx + w / 2 - 0.05, 0.05, cx + w / 2 - 0.05, d - 0.05, y);
    }

    // Gauben auf der steilen Vorderseite des Dachs; ihr Fuß steckt im Dach.
    for (const d of dormers) {
      const m = new THREE.Matrix4().multiplyMatrices(base, new THREE.Matrix4().makeTranslation(d.bay * BAY_W, H + 0.6, -0.45));
      batcher.place('dormer', m, col, d.on, true, null, d.room);
    }

    for (const [bag, into] of [[wall, reliefBag], [iron, ironBag]]) {
      if (!bag.parts.length) continue;
      const g = bag.build();
      g.applyMatrix4(base);
      into.parts.push(g);
    }
  };

  // Schmuckgiebel über den Achsen start .. start + n - 1 eines Hauses, auf dem Hauptgesims.
  // style 'curved': geschweifter Giebel mit Ochsenauge und Vasen, wie über einem Mittelrisalit.
  // style 'pediment': flacher Dreiecksgiebel, für das Bankhaus.
  const buildGable = ({ start, n, style = 'curved' }, { base, H, col, cTrim }) => {
    const wall = new Bag();
    const w = n * BAY_W;
    const cx = (start + n / 2) * BAY_W;
    const y0 = H + 0.2;
    if (style === 'pediment') {
      const h = Math.min(3.2, w * 0.2);
      wall.box(cTrim, w + 0.3, 0.3, 0.7, cx, y0 + 0.15, 0.1);
      wall.add(pediment(w + 0.3, h, 0.7, cx, y0 + 0.3, 0.1), cTrim);
      wall.add(pediment(w - 0.6, h - 0.45, 0.6, cx, y0 + 0.42, 0.05), col);
      // Akroterien an Spitze und Ecken.
      wall.add(new THREE.CylinderGeometry(0.12, 0.2, 0.55, 8).translate(cx, y0 + 0.3 + h + 0.2, 0.1), cTrim);
      for (const s of [-1, 1]) wall.add(new THREE.CylinderGeometry(0.1, 0.18, 0.5, 8).translate(cx + s * (w / 2 - 0.05), y0 + 0.55, 0.1), cTrim);
    } else {
      const hw = w / 2 - 0.1;
      const s = new THREE.Shape();
      s.moveTo(-hw, 0);
      s.lineTo(-hw, 0.6);
      s.quadraticCurveTo(-hw * 0.45, 0.6, -hw * 0.42, 1.9);
      s.lineTo(-hw * 0.42, 2.7);
      s.quadraticCurveTo(0, 4.2, hw * 0.42, 2.7);
      s.lineTo(hw * 0.42, 1.9);
      s.quadraticCurveTo(hw * 0.45, 0.6, hw, 0.6);
      s.lineTo(hw, 0);
      s.closePath();
      const eye = new THREE.Path();
      eye.absarc(0, 1.85, 0.55, 0, Math.PI * 2, true);
      s.holes.push(eye);
      const body = new THREE.ExtrudeGeometry(s, { depth: 0.45, bevelEnabled: false, curveSegments: 10 });
      wall.add(worldUV(body.translate(cx, y0, -0.25), 0.5), col);
      // Gesimsstück über dem Mittelteil, Rahmen ums Ochsenauge, Vasen und Knauf.
      wall.box(cTrim, hw * 0.84 + 0.3, 0.16, 0.6, cx, y0 + 2.7, 0);
      wall.add(new THREE.TorusGeometry(0.6, 0.08, 6, 20).translate(cx, y0 + 1.85, 0.22), cTrim);
      for (const sx of [-1, 1]) {
        wall.add(new THREE.CylinderGeometry(0.13, 0.19, 0.45, 8).translate(cx + sx * hw, y0 + 0.83, -0.02), cTrim);
        wall.add(new THREE.SphereGeometry(0.13, 8, 6).translate(cx + sx * hw, y0 + 1.15, -0.02), cTrim);
      }
      wall.add(new THREE.CylinderGeometry(0.05, 0.14, 0.6, 8).translate(cx, y0 + 3.75, -0.02), cTrim);
      const pane = new THREE.CircleGeometry(0.56, 20).translate(cx, y0 + 1.85, -0.05);
      pane.applyMatrix4(base);
      towerDark.push(pane);
    }
    const g = wall.build();
    g.applyMatrix4(base);
    reliefBag.parts.push(g);
  };

  // Eckturm über einer Häuserecke: Achteck auf einer Konsole über dem Erdgeschoss, oben eine
  // geschweifte Haube mit Laterne. Er ändert vor allem die Silhouette gegen den Himmel, und die
  // ist das, was man nachts von den Häusern sieht. corner: Hausecke, out: Richtung zur Straße.
  const towerRand = rng(1899);
  const cornerTower = ({ corner: [x, z], out: [ox, oz], color = 0xa89a80, top = 19.1 }) => {
    const R = 1.7;
    const len = Math.hypot(ox, oz);
    const dx = ox / len;
    const dz = oz / len;
    // 0,85 m je Achse vor die Ecke: So bleiben die Fenster der Eckachsen frei.
    const c = { x: x + Math.sign(ox) * 0.85, z: z + Math.sign(oz) * 0.85 };
    const ao = Math.atan2(dx, dz);
    const col = new THREE.Color(color);
    const cTrim = col.clone().multiplyScalar(1.15);
    const wall = new Bag();
    const oct = (rt, rb, h, y) => new THREE.CylinderGeometry(rt, rb, h, 8).rotateY(ao - Math.PI / 8).translate(c.x, y, c.z);
    const apothem = R * Math.cos(Math.PI / 8);
    wall.add(oct(R, 0.45, 1.2, FLOOR.ground - 0.6), cTrim);
    wall.add(worldUV(oct(R, R, top - FLOOR.ground, (FLOOR.ground + top) / 2), 0.5), col);
    // Gurtgesimse in Höhe der Gesimse der Nachbarhäuser, oben ein kräftiges Kranzgesims.
    const floors = [['noble', FLOOR.ground], ['upper', FLOOR.ground + FLOOR.noble], ['upper', FLOOR.ground + FLOOR.noble + FLOOR.upper], ['attic', FLOOR.ground + FLOOR.noble + 2 * FLOOR.upper]];
    for (const [, fy] of floors) wall.add(oct(R + 0.07, R + 0.07, 0.14, fy), cTrim);
    wall.add(oct(R + 0.3, R + 0.12, 0.45, top), cTrim);
    // Tambour, Haube, Laterne, Spitze.
    wall.add(worldUV(oct(R * 0.82, R * 0.82, 1.0, top + 0.7), 0.5), col);
    wall.add(oct(R * 0.82 + 0.12, R * 0.82 + 0.12, 0.18, top + 1.2), cTrim);
    const copper = new Bag();
    const hb = top + 1.29;
    const profile = [[R * 0.9, 0], [R * 0.95, 0.25], [R * 0.86, 0.75], [R * 0.6, 1.45], [R * 0.3, 2.0], [R * 0.24, 2.25], [0.0, 2.25]].map(([px, py]) => new THREE.Vector2(px, py));
    copper.add(new THREE.LatheGeometry(profile, 16).translate(c.x, hb, c.z), 0xffffff);
    copper.add(oct(0.28, 0.3, 0.8, hb + 2.65), 0xffffff);
    copper.add(new THREE.ConeGeometry(0.42, 0.55, 8).rotateY(ao - Math.PI / 8).translate(c.x, hb + 3.32, c.z), 0xffffff);
    copper.add(new THREE.CylinderGeometry(0.015, 0.06, 1.3, 6).translate(c.x, hb + 4.2, c.z), 0xffffff);
    copper.add(new THREE.SphereGeometry(0.09, 8, 6).translate(c.x, hb + 3.75, c.z), 0xffffff);
    towerCopper.push(copper.build());

    // Fenster auf den fünf Seiten, die zu Platz und Straßen zeigen.
    const sizes = { noble: [0.78, 2.1], upper: [0.74, 1.9], attic: [0.6, 1.2] };
    for (const [type, fy] of floors) {
      const [ww, wh] = sizes[type];
      const lit = towerRand() < 0.4;
      for (let k = -2; k <= 2; k++) {
        const a = ao + (k * Math.PI) / 4;
        const nx = Math.sin(a);
        const nz = Math.cos(a);
        const wy = fy + 0.75 + wh / 2;
        const pane = new THREE.PlaneGeometry(ww, wh).rotateY(a).translate(c.x + nx * (apothem + 0.01), wy, c.z + nz * (apothem + 0.01));
        (lit && towerRand() < 0.8 ? towerLit : towerDark).push(pane);
        const sill = new THREE.BoxGeometry(ww + 0.2, 0.08, 0.16).translate(0, fy + 0.71, apothem + 0.06).rotateY(a).translate(c.x, 0, c.z);
        const lintel = new THREE.BoxGeometry(ww + 0.24, 0.12, 0.12).translate(0, fy + 0.75 + wh + 0.08, apothem + 0.04).rotateY(a).translate(c.x, 0, c.z);
        wall.add(sill, cTrim).add(lintel, cTrim);
      }
    }
    reliefBag.parts.push(wall.build());
  };
  const towerLit = [];
  const towerDark = [];
  const towerCopper = [];

  // Innenleben einer Tordurchfahrt in Hauskoordinaten: x0..x1 lichte Weite, z0 (Straßenseite)
  // bis z1 (Hofseite). Wände, Tonnengewölbe, Granitspuren im Pflaster, offene Torflügel,
  // Prellsteine an den Ecken. Kein eigenes Licht: Die Durchfahrt ist nachts dunkel.
  const buildPassage = ({ base, x0, x1, z0, z1, col }) => {
    const b = new Bag();
    const r = (x1 - x0) / 2;
    const cx = (x0 + x1) / 2;
    const len = z0 - z1;
    const cz = (z0 + z1) / 2;
    const sooty = new THREE.Color(col).multiplyScalar(0.55);
    for (const sx of [x0 - 0.1, x1 + 0.1]) b.box(sooty, 0.2, GATE_SPRING + 0.02, len, sx, (GATE_SPRING + 0.02) / 2, cz);
    // Granitsockel gegen die Radnaben.
    for (const sx of [x0 + 0.04, x1 - 0.04]) b.box(0x55534e, 0.08, 0.55, len, sx, 0.275, cz);
    const vault = new THREE.CylinderGeometry(r, r, len, 16, 1, true, Math.PI / 2, Math.PI);
    vault.rotateX(Math.PI / 2).translate(cx, GATE_SPRING, cz);
    b.add(inward(worldUV(vault, 0.5)), sooty);
    // Fahrspuren aus Granitplatten, vom Tor bis ein Stück in den Hof.
    const tz0 = z0 + 0.34;
    const tz1 = z1 - 0.34 - 1.6;
    for (const sx of [-0.62, 0.62]) b.box(0x77756f, 0.46, 0.03, tz0 - tz1, cx + sx, 0.015, (tz0 + tz1) / 2);
    // Torflügel, nach innen an die Wände geklappt, mit Füllungen zur Durchfahrt hin.
    const wood = 0x2a2219;
    for (const s of [-1, 1]) {
      const wx = s < 0 ? x0 + 0.12 : x1 - 0.12;
      const lz = z0 - 0.06 - r / 2;
      b.box(wood, 0.07, 2.95, r, wx, 1.475, lz);
      for (const py of [0.85, 2.15]) b.box(0x342a1e, 0.03, 1.05, r - 0.3, wx - s * 0.05, py, lz);
    }
    // Prellsteine an den vier Ecken, auf der Straßenseite auf dem Gehweg.
    for (const [px, pz, py] of [[x0 - 0.06, 0.2, 0.13], [x1 + 0.06, 0.2, 0.13], [x0 - 0.06, z1 - 0.54, 0], [x1 + 0.06, z1 - 0.54, 0]]) {
      b.add(new THREE.CylinderGeometry(0.06, 0.17, 0.6, 8).translate(px, py + 0.3, pz), 0x6a6862);
    }
    const g = b.build();
    g.applyMatrix4(base);
    reliefBag.parts.push(g);
  };

  // Hofwand: Fensterachsen ohne Hauskörper, Dach und Gehweg, für Hinterhöfe. Eigener Zufall
  // (courtRand), damit die Häuser an den Straßen bleiben, wie sie sind. ground[i] = null lässt
  // das Erdgeschoss frei, etwa für die Hofseite einer Tordurchfahrt. Gibt die Lage der Wand zurück.
  const courtRand = rng(1899);
  const courtWall = ({ x, z, face, bays, ground = [], color = 0x8c8474, lit = 0.2, floors = 3 }) => {
    const base = new THREE.Matrix4().multiplyMatrices(new THREE.Matrix4().makeTranslation(x, 0, z), new THREE.Matrix4().makeRotationY(FACING[face]));
    const W = bays * BAY_W;
    const cell = (on) => ({
      cell: Math.floor(courtRand() * WINDOW_ATLAS.rows) * WINDOW_ATLAS.cols + Math.floor(courtRand() * WINDOW_ATLAS.cols),
      bright: on ? 0.75 + courtRand() * 0.3 : 0.25 + courtRand(),
    });
    const toWorld = (lx0, lx1, lz0, lz1) => {
      const pts = [[lx0, lz0], [lx1, lz1]].map(([lx, lz]) => new THREE.Vector3(lx, 0, lz).applyMatrix4(base));
      return [Math.min(pts[0].x, pts[1].x), Math.max(pts[0].x, pts[1].x), Math.min(pts[0].z, pts[1].z), Math.max(pts[0].z, pts[1].z)];
    };
    for (let i = 0; i < bays; i++) {
      const tg = ground[i] === undefined ? 'ground' : ground[i];
      const gx = new THREE.Matrix4().multiplyMatrices(base, new THREE.Matrix4().makeTranslation(i * BAY_W, 0, 0));
      if (tg) {
        const on = courtRand() < lit;
        batcher.place(tg, gx, color, on, true, null, tg === 'ground' ? cell(on) : null);
        loc.collide(...toWorld(i * BAY_W, (i + 1) * BAY_W, -0.34, 0.05));
      }
      for (let f = 0; f < floors; f++) {
        const m = new THREE.Matrix4().multiplyMatrices(base, new THREE.Matrix4().makeTranslation(i * BAY_W, FLOOR.ground + f * FLOOR.upper, 0));
        const on = courtRand() < lit;
        batcher.place('upper', m, color, on, true, null, cell(on));
      }
    }
    const H = FLOOR.ground + floors * FLOOR.upper;
    const cTrim = new THREE.Color(color).multiplyScalar(1.12);
    const local = new Bag();
    local.box(cTrim, W, 0.22, 0.2, W / 2, FLOOR.ground + 0.02, 0.08);
    local.box(cTrim, W, 0.34, 0.36, W / 2, H + 0.15, 0.1);
    const geo = local.build();
    geo.applyMatrix4(base);
    massing.parts.push(geo);
    return { H, W, base };
  };

  // Schreibt die Texturkoordinaten einer Geometrie auf eine Zelle eines Atlas um.
  const atlasUV = (g, cell, { cols, rows }) => {
    const uv = g.attributes.uv;
    const cx = cell % cols;
    const cy = rows - 1 - Math.floor(cell / cols);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (cx + 0.01 + 0.98 * uv.getX(i)) / cols, (cy + 0.01 + 0.98 * uv.getY(i)) / rows);
    return g;
  };

  // Ladenschild über einem gewöhnlichen Laden (Achse gx), an manchen zusätzlich ein Ausleger
  // mit Zunftzeichen; hanging: false an den Hausenden, damit er nicht in die Nachbarzeile ragt.
  // Das Brett sitzt zwischen Schaufenster und Gesims, der Ausleger auf dem Quaderstreifen am
  // Rand der Achse, 3,4 m über dem Gehweg. Eigener Zufall (signRand).
  const shopSign = (gx, kind, lit, hanging) => {
    const k = SHOP_KINDS.indexOf(kind);
    const board = atlasUV(new THREE.BoxGeometry(2.9, 0.5, 0.05), k * SIGN_NAMES + Math.floor(signRand() * SIGN_NAMES), SIGN_ATLAS.boards);
    board.translate(BAY_W / 2, 3.87, 0.055).applyMatrix4(gx);
    (lit ? signs.litBoards : signs.boards).push(board);
    if (!hanging || signRand() > 0.45) return;
    const x = 0.12;
    const iron = new Bag();
    iron.box(IRON, 0.08, 0.6, 0.08, x, 4.0, 0.04);
    iron.box(IRON, 0.04, 0.04, 1.15, x, 4.25, 0.575);
    const strut = Math.hypot(0.71, 0.45);
    iron.add(new THREE.BoxGeometry(0.03, 0.03, strut).rotateX(-Math.atan2(0.45, 0.71)).translate(x, (3.78 + 4.23) / 2, (0.04 + 0.75) / 2), IRON);
    for (const z of [0.47, 0.97]) iron.box(IRON, 0.015, 0.16, 0.015, x, 4.15, z);
    reliefBag.parts.push(iron.build().applyMatrix4(gx));
    signs.emblems.push(atlasUV(new THREE.PlaneGeometry(0.7, 0.7), k, SIGN_ATLAS.emblems).rotateY(Math.PI / 2).translate(x, 3.72, 0.72).applyMatrix4(gx));
  };

  // rand: eigener Zufall, z. B. für Kulissen, damit der gemeinsame Zufall r des Viertels
  // unberührt bleibt und alle übrigen Häuser so aussehen wie bisher.
  // ownGlass: Achsen im Erdgeschoss, deren Scheibe der Aufrufer selbst baut.
  // recess: Tiefe, um die der Hauskörper im Erdgeschoss zurückweicht, damit hinter den
  // Schaufenstern Platz für eine Auslage ist. Hinter den übrigen Achsen deckt deren
  // Scheibe oder Tür die Lücke ab.
  // relief: Erker, Balkone und Dachgauben (nur Häuser aus row(), nicht die Schauplätze).
  // gate: Achse im Erdgeschoss, durch die eine Tordurchfahrt in den Hof führt.
  const block = ({ x, z, face, floors = 4, color, depth = 14, ground = [], lit = 0.22, sidewalk = 3, rand = r, ownGlass = [], recess = 0, relief = false, gate = null, gable = null }, bays) => {
    const rot = FACING[face];
    const R = new THREE.Matrix4().makeRotationY(rot);
    const T = new THREE.Matrix4().makeTranslation(x, 0, z);
    const base = new THREE.Matrix4().multiplyMatrices(T, R);
    const W = bays * BAY_W;
    const col = color ?? FACADES[Math.floor(rand() * FACADES.length)];
    const types = floors === 3 ? ['noble', 'upper', 'attic'] : ['noble', 'upper', 'upper', 'attic'];
    // Fensterbilder aus eigenem Zufall: je Stockwerk eines Hauses eine Art, je Fenster
    // eine Variante und eine leicht andere Helligkeit.
    const styles = [-1, ...types].map(() => Math.floor(winRand() * WINDOW_ATLAS.rows));
    const room = (floor) => ({
      cell: styles[floor] * WINDOW_ATLAS.cols + Math.floor(winRand() * WINDOW_ATLAS.cols),
      bright: 0.8 + winRand() * 0.35,
    });
    // Dunkle Fenster zeigen die Art ihres Stockwerks, gewählt mit eigenem Zufall (shadeRand),
    // damit die Bilder der erleuchteten Fenster bleiben, wie sie sind. Manche Gardine ist
    // kaum zu sehen, manche deutlicher.
    const shade = (floor) => ({
      cell: styles[floor] * WINDOW_ATLAS.cols + Math.floor(shadeRand() * WINDOW_ATLAS.cols),
      bright: 0.25 + shadeRand(),
    });
    const plan = relief ? planRelief(bays, types, lit) : { erker: null, balconies: [], dormers: [] };
    // Unter einem Schmuckgiebel keine Gauben. Gefiltert erst nach dem Planen, damit der Zufall bleibt.
    if (gable) plan.dormers = plan.dormers.filter((d) => d.bay < gable.start || d.bay >= gable.start + gable.n);
    const inErker = (i, f) => plan.erker && i >= plan.erker.start && i < plan.erker.start + plan.erker.n && f < types.length - 1;
    for (let i = 0; i < bays; i++) {
      const tGround = ground[i] || (rand() < 0.32 ? 'shop' : 'ground');
      const gx = new THREE.Matrix4().multiplyMatrices(base, new THREE.Matrix4().makeTranslation(i * BAY_W, 0, 0));
      const lit = tGround === 'shop' ? rand() < 0.8 : rand() < 0.2;
      let kind = null;
      if (tGround === 'shop' && lit && shopMix) {
        // Ladensorte aus eigenem Zufall, damit rand unverändert bleibt.
        const p = new THREE.Vector3().setFromMatrixPosition(gx);
        const mix = shopMix(p.x, p.z);
        kind = mix[Math.floor(kindRand() * mix.length)];
      }
      if (i === gate) {
        // Tordurchfahrt. Der Zufall wird gezogen wie für die Achse, die vorher hier stand,
        // damit alle übrigen Häuser, Fenster und Schilder bleiben, wie sie sind.
        if (tGround === 'ground') (lit ? room : shade)(0);
        if (tGround === 'shop' && shopMix) {
          if (!kind) signRand();
          if (!inErker(i, 0)) {
            signRand();
            if (i > 0 && i < bays - 1) signRand();
          }
        }
        batcher.place('gate', gx, col, false, false);
        // Hofseite: dieselbe Achse, um 180° gedreht an der Rückwand des Hauses.
        const back = new THREE.Matrix4().multiplyMatrices(base, new THREE.Matrix4().makeTranslation((i + 1) * BAY_W, 0, -depth - 0.34).multiply(new THREE.Matrix4().makeRotationY(Math.PI)));
        batcher.place('gate', back, col, false, false);
      } else {
        batcher.place(tGround, gx, col, lit, !ownGlass.includes(i), kind, tGround === 'ground' ? (lit ? room(0) : shade(0)) : null);
      }
      if (tGround === 'shop' && shopMix && i !== gate) {
        // Dunkle Läden haben noch keine Sorte: aus eigenem Zufall, damit kindRand bleibt.
        const p = new THREE.Vector3().setFromMatrixPosition(gx);
        const mix = shopMix(p.x, p.z);
        const sort = kind ?? mix[Math.floor(signRand() * mix.length)];
        // Unter einem Erker sitzen dessen Konsolen, dort kein Schild.
        if (!inErker(i, 0)) shopSign(gx, sort, lit, i > 0 && i < bays - 1);
      }
      let y = FLOOR.ground;
      types.forEach((type, f) => {
        // Achsen im Erker rücken mit ihm vor die Fassade.
        const out = inErker(i, f) ? ERKER_OUT : 0;
        const m = new THREE.Matrix4().multiplyMatrices(base, new THREE.Matrix4().makeTranslation(i * BAY_W, y, out));
        const on = rand() < lit;
        batcher.place(type, m, col, on, true, null, on ? room(f + 1) : shade(f + 1));
        y += FLOOR[type];
      });
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
    // Lichte Weite der Durchfahrt in Hauskoordinaten.
    const g0 = gate === null ? 0 : (gate + 0.5) * BAY_W - GATE_W / 2;
    const g1 = g0 + GATE_W;
    if (recess) {
      masses.push({ id, ...rect(0, W, -depth, -0.34 - recess), H: FLOOR.ground, color: cDark });
      masses.push({ id, ...rect(0, W, -depth, -0.34), y0: FLOOR.ground, H, color: cDark });
    } else if (gate !== null) {
      // Das Erdgeschoss links und rechts der Achse, darüber das ganze Haus.
      masses.push({ id, ...rect(0, gate * BAY_W, -depth, -0.34), H: FLOOR.ground, color: cDark });
      masses.push({ id, ...rect((gate + 1) * BAY_W, W, -depth, -0.34), H: FLOOR.ground, color: cDark });
      masses.push({ id, ...rect(0, W, -depth, -0.34), y0: FLOOR.ground, H, color: cDark });
      buildPassage({ base, x0: g0, x1: g1, z0: -0.34, z1: -depth, col });
      // Unter dem Gewölbe regnet es nicht (weather.js).
      (loc.dry ??= []).push(rect(g0, g1, -depth - 0.34, -0.2));
    } else {
      masses.push({ id, ...rect(0, W, -depth, -0.34), H, color: cDark });
    }
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
      ch.box(0x4a3a30, 0.7, 2.2, 0.5, 1 + rand() * (W - 2), H + 2.6, -2 - rand() * (depth - 4));
      const g = ch.build();
      g.applyMatrix4(base);
      massing.parts.push(g);
    }

    if (relief) buildRelief(plan, { base, types, col, cTrim, H });
    if (gable) buildGable(gable, { base, H, col, cTrim });

    // Grundriss als Kollision: Ecken des Rechtecks in die Welt übertragen.
    const corners = [[0, 0], [W, 0], [0, -depth], [W, -depth]].map(([lx, lz]) =>
      new THREE.Vector3(lx, 0, lz).applyMatrix4(base));
    const xs = corners.map((c) => c.x);
    const zs = corners.map((c) => c.z);
    if (gate === null) loc.collide(Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs));
    else {
      // Links und rechts der Durchfahrt, bis hinter die Hofseite des Tors.
      const a = rect(0, g0, -depth - 0.34, 0);
      const b = rect(g1, W, -depth - 0.34, 0);
      loc.collide(a.minX, a.maxX, a.minZ, a.maxZ);
      loc.collide(b.minX, b.maxX, b.minZ, b.maxZ);
    }

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
    // frame(bay): Lage der Achse in der Welt; lokal x quer zur Achse (0 = Mitte),
    // y nach oben, z aus der Fassade heraus zur Straße (0 = Fassadenebene).
    const frame = (bay) => new THREE.Matrix4().multiplyMatrices(base, new THREE.Matrix4().makeTranslation((bay + 0.5) * BAY_W, 0, 0));
    return { at, rot, W, H, face, frame };
  };

  // Reihe zusammenhängender Häuser mit wechselnder Breite und Höhe.
  // gate: Achse der ganzen Reihe mit einer Tordurchfahrt.
  // gable(index, bays): Schmuckgiebel für das index-te Haus der Reihe, das bays Achsen hat
  // ({ start, n, style } in Achsen dieses Hauses), oder null.
  const row = ({ x, z, face, bays, rand = r, gate = null, gable = null }) => {
    const rot = FACING[face];
    const dx = Math.cos(rot);
    const dz = -Math.sin(rot);
    let done = 0;
    const houses = [];
    while (done < bays) {
      const n = Math.min(bays - done, 5 + Math.floor(rand() * 4));
      const g = gate !== null && gate >= done && gate < done + n ? gate - done : null;
      const floors = rand() < 0.3 ? 3 : 4;
      houses.push(block({ x: x + dx * done * BAY_W, z: z + dz * done * BAY_W, face, floors, rand, relief: true, gate: g, gable: gable?.(houses.length, n) ?? null }, n));
      done += n;
    }
    return houses;
  };

  const finish = () => {
    batcher.build(scene, wallMat, darkGlass, litGlass);
    trimMasses(masses, slabs);
    for (const m of masses) {
      const w = m.maxX - m.minX;
      const d = m.maxZ - m.minZ;
      const y0 = m.y0 || 0;
      if (w > 0.05 && d > 0.05) massing.box(m.color, w, m.H - y0, d, (m.minX + m.maxX) / 2, (y0 + m.H) / 2, (m.minZ + m.maxZ) / 2);
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
    // Ecktürme: Hauben aus Kupfer mit Patina, Fenster schlicht erleuchtet oder dunkel.
    if (towerCopper.length) addMesh(scene, merge(towerCopper), std({ color: 0x5a8070, roughness: 0.55, metalness: 0.35 }));
    if (towerLit.length) addMesh(scene, merge(towerLit), litGlass);
    if (towerDark.length) addMesh(scene, merge(towerDark), darkGlass);
    const massMat = matte({ vertexColors: true, ...plasterTex });
    addMesh(scene, massing.build(), massMat);
    // Erker und Balkone in eigenen Meshes, damit die übrigen Häuser unverändert bleiben.
    if (reliefBag.parts.length) addMesh(scene, reliefBag.build(), massMat);
    // Gitter: Alpha bestimmt die Abdeckung der Multisampling-Proben (alphaToCoverage). Aus der
    // Ferne wird das Gitter so zu einem halb durchscheinenden dunklen Band, statt zu verschwinden.
    if (ironBag.parts.length) {
      addMesh(scene, ironBag.build(), std({ map: railing(), vertexColors: true, roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide, alphaToCoverage: true }));
    }

    // Ladenschilder. Bretter über erleuchteten Läden fangen etwas vom Licht der Auslage.
    const { boards, emblems } = shopSigns();
    if (signs.boards.length) addMesh(scene, merge(signs.boards), std({ map: boards, roughness: 0.55 }));
    if (signs.litBoards.length) {
      addMesh(scene, merge(signs.litBoards), std({ map: boards, roughness: 0.55, emissive: 0xffffff, emissiveMap: boards, emissiveIntensity: 0.25 }));
    }
    if (signs.emblems.length) {
      addMesh(scene, merge(signs.emblems), std({ map: emblems, roughness: 0.45, metalness: 0.3, side: THREE.DoubleSide, alphaToCoverage: true }));
    }
  };

  return { block, row, courtWall, cornerTower, finish };
}

// Kehrt Dreiecke und Normalen um, damit man eine Fläche von innen sieht (Gewölbe).
function inward(geo) {
  const idx = geo.index.array;
  for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
  const n = geo.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return geo;
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
