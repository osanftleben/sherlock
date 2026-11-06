import * as THREE from 'three';
import { Bag, addMesh, box, cyl, matte, merge } from '../kit.js';

// Was man von fern sieht: Häuser jenseits der Spree, Dom, Neue Synagoge.
export function buildHorizon(loc, r) {
  const { scene } = loc;
  // Häuserzeile jenseits der Spree als Silhouette
  const far = new Bag();
  for (let x = -220; x < 220; x += 16 + r() * 8) {
    const h = 14 + r() * 8;
    far.box(0x1a1f2a, 18, h, 10, x, h / 2, 118);
  }
  const silhouette = matte({ vertexColors: true });
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
}
