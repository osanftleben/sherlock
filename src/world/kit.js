import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Bausatz: Quader mit weltbezogenen UVs und Vertexfarben, die zu einem Mesh verschmelzen.
const WHITE = new THREE.Color(1, 1, 1);

export function worldUV(geo, scale = 1) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    if (ny >= nx && ny >= nz) uv.setXY(i, pos.getX(i) * scale, pos.getZ(i) * scale);
    else if (nx >= nz) uv.setXY(i, pos.getZ(i) * scale, pos.getY(i) * scale);
    else uv.setXY(i, pos.getX(i) * scale, pos.getY(i) * scale);
  }
  return geo;
}

export function tint(geo, color = WHITE) {
  const c = color instanceof THREE.Color ? color : new THREE.Color(color);
  const count = geo.attributes.position.count;
  const data = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) data.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(data, 3));
  return geo;
}

export function box(w, h, d, x = 0, y = 0, z = 0, uvScale = 0.5) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return worldUV(g, uvScale);
}

export function cyl(rt, rb, h, x = 0, y = 0, z = 0, seg = 12) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}

export function merge(list) {
  const flat = list.map((g) => (g.index ? g.toNonIndexed() : g));
  const hasColor = flat.some((g) => g.attributes.color);
  for (const g of flat) {
    if (hasColor && !g.attributes.color) tint(g);
    if (!g.attributes.uv) {
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    }
    for (const name of Object.keys(g.attributes)) {
      if (!['position', 'normal', 'uv', 'color'].includes(name)) g.deleteAttribute(name);
    }
  }
  return mergeGeometries(flat, false);
}

// Sammelt Teile mit eigenem Farbton, Ergebnis ist ein einziges Geometrieobjekt.
export class Bag {
  constructor() {
    this.parts = [];
  }

  add(geo, color) {
    this.parts.push(tint(geo, color));
    return this;
  }

  box(color, w, h, d, x, y, z, uvScale) {
    return this.add(box(w, h, d, x, y, z, uvScale), color);
  }

  build() {
    return merge(this.parts);
  }
}

export function std(options) {
  return new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...options });
}

export function addMesh(parent, geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// Dreiecksgiebel über Fenstern, Spitze nach oben, Tiefe nach außen.
export function pediment(w, h, d, x, y, z) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  g.translate(x, y, z - d / 2);
  return worldUV(g, 0.5);
}

// Dachprisma: Grundfläche w × d (Ursprung Mitte), Höhe h.
export function roofPrism(w, h, d, x, y, z) {
  const s = new THREE.Shape();
  s.moveTo(-d / 2, 0);
  s.lineTo(d / 2, 0);
  s.lineTo(d / 2 - h * 0.45, h * 0.7);
  s.lineTo(-d / 2 + h * 0.45, h * 0.7);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
  g.rotateY(Math.PI / 2);
  g.translate(x - w / 2, y, z);
  return worldUV(g, 0.4);
}
