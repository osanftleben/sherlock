import * as THREE from 'three';
import { Bag, addMesh, box, cyl, merge } from '../kit.js';
import { rng } from '../textures.js';

// Was man von fern sieht: Häuser jenseits der Spree, Dom, Neue Synagoge.
// Die fernen Silhouetten tragen keinen Nebel und sind dunkler als der Himmel: Der Nebel würde sie
// sonst genau auf die Himmelsfarbe am Horizont ziehen, und sie verschwänden. Davor hebt sie die
// Lichtglocke der Gaslaternen am Himmel ab (Himmel in index.js).
const SILHOUETTE = 0x07090e;
// Erleuchtete Fenster in der Ferne, schon so gedämpft, wie sie durch den Dunst ankommen.
const FAR_WINDOW = new THREE.Color(0.55, 0.36, 0.15);

export function buildHorizon(loc, r) {
  const { scene } = loc;
  // Eigener Zufall für Fenster, Schornsteine und die Synagoge, damit alles, was nach dem
  // Horizont gebaut wird (Verkehr, Wetter), denselben gemeinsamen Zufall bekommt wie bisher.
  const hr = rng(1900);

  // Häuserzeile jenseits der Spree: Vorderseite bei z = 113.
  const far = new Bag();
  const windows = new Bag();
  for (let x = -220; x < 220; x += 16 + r() * 8) {
    const h = 14 + r() * 8;
    far.box(0xffffff, 18, h, 10, x, h / 2, 118);
    for (let c = 0; c < 2 + Math.floor(hr() * 3); c++) {
      const cx = x - 7 + hr() * 14;
      far.box(0xffffff, 0.9, 1.4 + hr(), 0.9, cx, h + 0.6, 116 + hr() * 4);
    }
    // Fenster in Achsen zu 3,4 m und Geschossen zu 3,6 m; die meisten sind dunkel.
    for (let fy = 3.2; fy < h - 2; fy += 3.6) {
      for (let ax = -7.2; ax <= 7.2; ax += 3.6) {
        if (hr() < 0.2) windows.box(0xffffff, 1, 1.5, 0.05, x + ax, fy, 112.9);
      }
    }
  }
  addMesh(scene, far.build(), new THREE.MeshBasicMaterial({ color: SILHOUETTE, fog: false }));
  addMesh(scene, windows.build(), new THREE.MeshBasicMaterial({ color: FAR_WINDOW, fog: false }));
  // Früher lagen hier 60 Lichtpunkte nach dem gemeinsamen Zufall; der wird weiter so gezogen.
  for (let i = 0; i < 120; i++) r();

  // Dom-Silhouette im Südwesten, ohne Nebel, damit sie als Orientierung taugt.
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
  addMesh(scene, merge(domeBag), new THREE.MeshBasicMaterial({ color: SILHOUETTE, fog: false }));

  buildSynagogue(scene, hr);
}

// Neue Synagoge am Ende der Oranienburger Straße, die Schauseite nach Osten (x = -190): ein
// Vorbau mit zwei Türmen und kleinen Kuppeln, dahinter der hohe Mittelbau mit Tambour und der
// großen goldenen Kuppel. Sie steht nah genug für Nebel; nur das Gold leuchtet ungedämpft.
function buildSynagogue(scene, hr) {
  const gold = new THREE.MeshStandardMaterial({ color: 0xc69c3a, metalness: 0.8, roughness: 0.35, fog: false, emissive: 0x56401a });
  const body = new Bag();
  // Gelber und roter Klinker, nachts ein dunkles Braun: wärmer und heller als der Himmel dahinter.
  const dark = 0x15110f;
  // Mittelbau unter der großen Kuppel; der Tambour sitzt auf seiner Oberkante (30 m).
  // Er steht hinter dem 20 m hohen Vorbau (Rückseite x = -194), damit die Türme frei davor stehen.
  body.box(dark, 18, 30, 14, -203, 15, -8);
  body.add(cyl(7, 7, 9.5, -205, 34.75, -8, 16), 0x17120f);
  // Hauptschiff dahinter.
  body.box(dark, 28, 22, 22, -225, 11, -8);
  // Vorbau an der Straße mit den beiden Türmen. Durch die Straßenschlucht (z -14 bis -2) sieht
  // man nur die Mitte der Schauseite; die Türme stehen deshalb eng am Portal.
  body.box(0x1d1713, 4, 20, 16, -192, 10, -8);
  const towers = [-11.2, -4.8];
  for (const tz of towers) {
    body.box(0x1b1512, 2.6, 26, 2.6, -191.3, 13, tz);
    body.add(cyl(1.2, 1.2, 2, -191.3, 27, tz, 12), 0x17120f);
  }
  addMesh(scene, body.build(), new THREE.MeshBasicMaterial({ vertexColors: true }));

  const domes = [];
  const big = new THREE.SphereGeometry(7.4, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  big.scale(1, 1.25, 1);
  big.translate(-205, 39.5, -8);
  domes.push(big, cyl(0.2, 0.6, 4, -205, 50, -8, 8));
  for (const tz of towers) {
    const small = new THREE.SphereGeometry(1.3, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    small.scale(1, 1.4, 1);
    small.translate(-191.3, 28, tz);
    domes.push(small, cyl(0.05, 0.16, 1.2, -191.3, 30.4, tz, 6));
  }
  addMesh(scene, merge(domes), gold);

  // Fenster der Schauseite: drei hohe Fenster über dem Portal, darüber eine Reihe kleiner, dazu
  // die Turmfenster. Zur Abendandacht ist ein Teil davon erleuchtet.
  const lit = new Bag();
  const front = -189.97;
  for (const z of [-9, -8, -7]) lit.box(0xffffff, 0.05, 3.6, 0.6, front, 10, z);
  for (const z of [-9.2, -8, -6.8]) if (hr() < 0.75) lit.box(0xffffff, 0.05, 1, 0.6, front, 15.5, z);
  for (const tz of towers) {
    for (const y of [5, 10, 15, 20, 24]) if (hr() < 0.55) lit.box(0xffffff, 0.05, 1.3, 0.5, front, y, tz);
  }
  addMesh(scene, lit.build(), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.95, 0.6, 0.26) }));
}
