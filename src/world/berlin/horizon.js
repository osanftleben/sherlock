import * as THREE from 'three';
import { Bag, addMesh, box, cyl, merge } from '../kit.js';
import { rng } from '../textures.js';
import { WATER_Y } from './river.js';

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

  // Häuserzeile jenseits der Spree: Vorderseite bei z = 113. Was dort steht, wird zugleich in
  // die Spiegelkarte für das Wasser eingetragen (siehe unten).
  const far = new Bag();
  const windows = new Bag();
  const mirror = new BankMirror();
  for (let x = -220; x < 220; x += 16 + r() * 8) {
    const h = 14 + r() * 8;
    far.box(0xffffff, 18, h, 10, x, h / 2, 118);
    mirror.fill(x - 9, x + 9, 0, h, 0);
    for (let c = 0; c < 2 + Math.floor(hr() * 3); c++) {
      const cx = x - 7 + hr() * 14;
      const ch = 1.4 + hr();
      far.box(0xffffff, 0.9, ch, 0.9, cx, h + 0.6, 116 + hr() * 4);
      mirror.fill(cx - 0.45, cx + 0.45, h, h + 0.6 + ch / 2, 0);
    }
    // Fenster in Achsen und Geschossen zu 3,6 m; die meisten sind dunkel.
    for (let fy = 3.2; fy < h - 2; fy += 3.6) {
      for (let ax = -7.2; ax <= 7.2; ax += 3.6) {
        if (hr() < 0.2) {
          windows.box(0xffffff, 1, 1.5, 0.05, x + ax, fy, 112.9);
          mirror.fill(x + ax - 0.5, x + ax + 0.5, fy - 0.75, fy + 0.75, 1);
        }
      }
    }
  }
  // Kaimauer am Gegenufer, vom Wasser bis knapp über das Pflaster vor den Häusern.
  far.box(0xffffff, 720, 0.6 - WATER_Y, 1, 0, (0.3 + WATER_Y) / 2 - 0.05, BANK_Z + 0.5);
  mirror.fill(-360, 360, WATER_Y, 0.4, 0);
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
  return mirror.build();
}

// Vorderkante des Gegenufers (Kaimauer), auf die das Wasser seine Spiegelung bezieht.
export const BANK_Z = 112;
const SILHOUETTE_LINEAR = new THREE.Color(SILHOUETTE);

// Spiegelkarte des Gegenufers: x von -360 bis 360 m, Höhe vom Wasserspiegel bis 32 m darüber.
// Rot = Baukörper, Grün = erleuchtetes Fenster. Der Wasser-Shader verfolgt den gespiegelten
// Sehstrahl bis zur Uferlinie und liest hier ab, ob er Haus, Fenster oder Himmel trifft.
class BankMirror {
  constructor() {
    this.w = 1024;
    this.h = 64;
    this.x0 = -360;
    this.span = 720;
    this.top = 32;
    this.data = new Uint8Array(this.w * this.h * 4);
  }

  // y0, y1 in Weltkoordinaten (Straße = 0); channel 0 = Baukörper, 1 = Fenster.
  fill(x0, x1, y0, y1, channel) {
    const { w, h } = this;
    const i0 = Math.max(0, Math.round(((x0 - this.x0) / this.span) * w));
    const i1 = Math.min(w, Math.round(((x1 - this.x0) / this.span) * w));
    const j0 = Math.max(0, Math.round(((y0 - WATER_Y) / this.top) * h));
    const j1 = Math.min(h - 1, Math.round(((y1 - WATER_Y) / this.top) * h));
    for (let j = j0; j < j1; j++) {
      for (let i = i0; i < i1; i++) this.data[(j * w + i) * 4 + channel] = 255;
    }
  }

  build() {
    const t = new THREE.DataTexture(this.data, this.w, this.h);
    t.magFilter = t.minFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    return {
      map: t,
      // x0, Breite, Höhe der Karte, z der Uferlinie
      frame: new THREE.Vector4(this.x0, this.span, this.top, BANK_Z),
      silhouette: SILHOUETTE_LINEAR,
      window: FAR_WINDOW,
    };
  }
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
